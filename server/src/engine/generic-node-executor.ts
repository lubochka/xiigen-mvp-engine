/**
 * GenericNodeExecutor — executes a flow topology node-by-node.
 *
 * Capabilities implemented:
 *   E1: Basic topology execution + run trace write to xiigen-run-traces
 *   E2: Retry policy (score < threshold → increment retryCount, re-run score node)
 *   E7: Inline execution model (executionModel: 'inline' — no event consumer registration)
 *   E8: Pure function inline variant (pureFunction: true)
 *
 * BLOCKING-3 fix: PromotionLadder injected and evaluated after scoring.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: trace store before any emit
 */
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { NodeRegistry } from './node-handlers/node-registry';
import { TopologyStore, FlowTopology } from './topology-store';
import {
  NodeHandlerContext,
  NodeOutput,
  CollectNodeConfig,
  CollectResult,
  LoopNodeConfig,
  LoopResult,
} from './node-handlers/node-handler.types';
import { EngineContract } from '../engine-contracts/contract-schema';
import { createCloudEvent } from '../kernel/cloud-events';
import { randomUUID } from 'crypto';
import { FlowPoolWriterService } from './flow-pool/flow-pool-writer.service';
import {
  FlowPoolEntryInput,
  PoolPromptRecord,
  PoolJudgeRecord,
  PoolArbiterRecord,
} from './flow-pool/flow-pool-entry.types';
import { FlowRegistryService } from './flow-registry.service';

/** Injection token for PromotionLadder (BLOCKING-3). */
export const PROMOTION_LADDER = Symbol('IPromotionLadder');

/**
 * E3-2: PENDING_HUMAN_REVIEW lifecycle state constant.
 *
 * This state is written to review documents when an UNCERTAIN moderation verdict
 * is received and uncertaintyBehavior === 'HUMAN_QUEUE'. It is NOT a flow execution
 * status (PASS/FAIL/HELD) — it is a review document status within the review entity lifecycle.
 *
 * Review entity lifecycle transitions (FLOW-10):
 *   SUBMITTED          → PENDING_HUMAN_REVIEW  (UNCERTAIN moderation verdict)
 *   PENDING_HUMAN_REVIEW → PUBLISHED           (human reviewer approves)
 *   PENDING_HUMAN_REVIEW → REJECTED            (human reviewer rejects)
 *   SUBMITTED          → PUBLISHED             (PASS moderation verdict)
 *   SUBMITTED          → REJECTED              (REJECT moderation verdict)
 */
export const PENDING_HUMAN_REVIEW = 'PENDING_HUMAN_REVIEW' as const;

/** Valid review status values for FLOW-10 review entity lifecycle. */
export const REVIEW_LIFECYCLE_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['PENDING_HUMAN_REVIEW', 'PUBLISHED', 'REJECTED'],
  PENDING_HUMAN_REVIEW: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: ['RETRACTED'],
  REJECTED: [],
  RETRACTED: [],
};

/** PromotionLadder interface — evaluate + promote. */
export interface IPromotionLadder {
  evaluate(contract: EngineContract, score: number): Promise<{ promoted: boolean; level?: string }>;
}

/**
 * N2 (FLOW-34): Multi-arbiter voting gate configuration.
 * Reusable by any flow declaring arbiterConsensus in EngineContract.
 */
export interface VotingGateConfig {
  arbiters: string[]; // list of fixtureIds included in the vote
  threshold: number; // minimum number of arbiters that must pass
  taskTypeId: string; // task type ID that triggered this gate
}

/**
 * N2 (FLOW-34): Evaluate multi-arbiter voting gate.
 * A score > 0 counts as an arbiter passing.
 * Returns passed=true only when passedCount >= config.threshold.
 */
export function evaluateVotingGate(
  results: Map<string, number>,
  config: VotingGateConfig,
): {
  passed: boolean;
  score: number;
  failedArbiters: string[];
  passedArbiters: string[];
  passedCount: number;
  requiredCount: number;
} {
  const failedArbiters: string[] = [];
  const passedArbiters: string[] = [];

  for (const [fixtureId, score] of results.entries()) {
    if (score > 0) {
      passedArbiters.push(fixtureId);
    } else {
      failedArbiters.push(fixtureId);
    }
  }

  const passedCount = passedArbiters.length;
  const passed = passedCount >= config.threshold;
  const aggregateScore = config.arbiters.length > 0 ? passedCount / config.arbiters.length : 0;

  return {
    passed,
    score: aggregateScore,
    failedArbiters,
    passedArbiters,
    passedCount,
    requiredCount: config.threshold,
  };
}

/** Single node trace entry. */
export interface NodeTrace {
  nodeId: string;
  nodeType: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  score?: number;
  durationMs: number;
  errorCode?: string;
  output?: Record<string, unknown>;
}

/** Full run trace stored to xiigen-run-traces. */
export interface RunTrace {
  runId: string;
  flowId: string;
  taskTypeId: string;
  tenantId: string;
  status: 'RUNNING' | 'PASS' | 'FAIL' | 'HELD';
  score?: number;
  nodes: NodeTrace[];
  startedAt: string;
  completedAt?: string;
}

/** Result returned by the executor. */
export interface ExecutionResult {
  runId: string;
  status: 'PASS' | 'FAIL' | 'HELD';
  score?: number;
  trace: NodeTrace[];
  finalOutput?: Record<string, unknown>;
  promoted?: boolean;
  promotionLevel?: string;
}

@Injectable()
export class GenericNodeExecutor {
  private readonly logger = new Logger(GenericNodeExecutor.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly nodeRegistry: NodeRegistry,
    private readonly topologyStore: TopologyStore,
    @Optional() @Inject(PROMOTION_LADDER) private readonly ladder?: IPromotionLadder,
    @Optional() private readonly flowPoolWriter?: FlowPoolWriterService,
    @Optional() @Inject(QUEUE_SERVICE) private readonly queue: IQueueService | null = null,
    @Optional() private readonly flowRegistry?: FlowRegistryService,
  ) {}

  /**
   * Execute a flow run for a given task type.
   * Loads topology from TopologyStore, executes each node in order,
   * writes trace to xiigen-run-traces.
   */
  async execute(
    contract: EngineContract,
    inputs: Record<string, unknown>,
    options?: {
      tenantId?: string;
      flowId?: string;
      /** Z-1: Project ID for PROJECT_UNDERSTANDING lookup. */
      projectId?: string;
      /** Z-1: Explicit provider overrides for this run (values are provider names, not stack labels). */
      runtimeHints?: { [interfaceName: string]: string | undefined };
      /**
       * D-0c: Optional stack target — routes HybridGenesisPrompt to the matching
       * stackImplementations entry. Defaults to 'node-nestjs:server'.
       * Format: '{stackType}:{side}' — e.g. 'node-nestjs:server', 'php-wordpress:server'.
       */
      stackTarget?: string;
    },
  ): Promise<DataProcessResult<ExecutionResult>> {
    const runId = randomUUID();
    const taskTypeId = contract.taskTypeId;
    const flowId = options?.flowId ?? contract.flowId ?? 'UNKNOWN';
    const tenantId = options?.tenantId ?? 'default';

    this.logger.log(`Execute run=${runId} taskTypeId=${taskTypeId} flowId=${flowId}`);

    // Load topology
    const topologyResult = await this.topologyStore.getTopology(taskTypeId);
    if (!topologyResult.isSuccess) {
      return DataProcessResult.failure(
        'TOPOLOGY_LOAD_FAILED',
        topologyResult.errorMessage ?? 'topology load failed',
      );
    }

    const topology = topologyResult.data ?? null;
    // If no topology found, use a default 5-node pipeline
    const nodes = topology?.nodes ?? this.defaultNodes();

    // G1-1_F10: peerFlowMustBeActive enforcement — check before any pipeline execution.
    // For each crossFlowReadDependency with peerFlowMustBeActive: true, verify the peer
    // flow has at least one ACTIVE entry in the flow registry before allowing execution.
    if (contract.crossFlowReadDependencies && this.flowRegistry) {
      for (const dep of contract.crossFlowReadDependencies) {
        if (dep.peerFlowMustBeActive) {
          const flows = await this.flowRegistry.listFlows({ status: 'ACTIVE' });
          const peerActive =
            flows.isSuccess && (flows.data ?? []).some((f) => f.flowId === dep.flowId);
          if (!peerActive) {
            return DataProcessResult.failure(
              'PEER_FLOW_NOT_ACTIVE',
              `PEER_FLOW_NOT_ACTIVE: ${dep.flowId} must be ACTIVE before ${contract.taskTypeId} can run`,
            );
          }
        }
      }
    }

    // E4-1: Check for removeEvents retraction BEFORE normal pipeline execution.
    // If the incoming event type matches aggregation.removeEvents, handle retraction directly.
    const incomingEventType = String(inputs['type'] ?? inputs['eventType'] ?? '');
    if (
      contract.aggregation?.removeEvents?.includes(incomingEventType) &&
      incomingEventType !== ''
    ) {
      this.logger.log(
        `Execute run=${runId} taskTypeId=${taskTypeId}: removeEvents retraction for event=${incomingEventType}`,
      );
      const retractionResult = await this.handleRemoveEvent(contract, inputs, tenantId);

      const retractionStartedAt = new Date().toISOString();
      // DNA-8: trace write before return
      const retractionTrace: RunTrace = {
        runId,
        flowId,
        taskTypeId,
        tenantId,
        status: retractionResult.isSuccess ? 'PASS' : 'FAIL',
        nodes: [
          {
            nodeId: 'retraction',
            nodeType: 'retraction',
            status: retractionResult.isSuccess ? 'PASS' : 'FAIL',
            durationMs: 0,
            output: retractionResult.data ?? {},
          },
        ],
        startedAt: retractionStartedAt,
        completedAt: new Date().toISOString(),
      };
      await this.db.storeDocument(
        'xiigen-run-traces',
        retractionTrace as unknown as Record<string, unknown>,
        runId,
      );

      if (!retractionResult.isSuccess) {
        return DataProcessResult.failure(
          retractionResult.errorCode ?? 'RETRACTION_FAILED',
          retractionResult.errorMessage ?? 'removeEvents retraction failed',
        );
      }
      return DataProcessResult.success({
        runId,
        status: 'PASS',
        trace: retractionTrace.nodes,
        finalOutput: retractionResult.data,
        promoted: false,
      });
    }

    // Initialize run trace
    const trace: RunTrace = {
      runId,
      flowId,
      taskTypeId,
      tenantId,
      status: 'RUNNING',
      nodes: [],
      startedAt: new Date().toISOString(),
    };

    // DNA-8: write initial trace before execution (copy to avoid mutation tracking issues)
    await this.db.storeDocument(
      'xiigen-run-traces',
      { ...trace, nodes: [] } as unknown as Record<string, unknown>,
      runId,
    );

    const priorOutputs: NodeOutput[] = [];
    let finalScore: number | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    let executionStatus: 'PASS' | 'FAIL' | 'HELD' = 'PASS';
    let poolSequenceIndex = 0;

    // Sort nodes by topology order (simple linear execution for E1)
    const orderedNodes = this.resolveExecutionOrder(nodes, topology);

    for (const node of orderedNodes) {
      const nodeType = node.nodeType;

      // Skip event consumer registration for inline execution model (E7) — silently, no trace entry
      if (contract.executionModel === 'inline' || contract.executionModel === 'inline-pure') {
        if (nodeType === 'event-register') {
          this.logger.debug(`Skipping event-register for inline executionModel`);
          continue;
        }
      }

      // Build node execution context for all node types
      const currentSeqIndex = poolSequenceIndex++;
      const poolWriter = this.flowPoolWriter;
      const ctx: NodeHandlerContext = {
        contract,
        runId,
        flowId,
        taskTypeId,
        tenantId,
        inputs: { ...inputs, retryCount },
        priorOutputs: [...priorOutputs],
        nodeConfig: node.config,
        // D-0c: stack routing for HybridGenesisPrompt — defaults to priority NestJS stack
        stackTarget: options?.stackTarget ?? 'node-nestjs:server',
        // Z-1: runtime context — no stack-label strings
        projectId: options?.projectId,
        runtimeHints: options?.runtimeHints as NodeHandlerContext['runtimeHints'],
        // Z-1.5: resolvedProviders — populated from contract factories + current env vars.
        // Maps each fabric interface declared in the contract to the actual running provider name.
        resolvedProviders: this.resolveContractProviders(contract),
        // T581: pool write/query closures — non-blocking
        writeToPool: poolWriter
          ? async (input: FlowPoolEntryInput) => {
              const r = await poolWriter.writeEntry(input);
              if (!r.isSuccess) {
                this.logger.warn(`Pool write failed for node ${node.nodeId}: ${r.errorMessage}`);
              }
            }
          : undefined,
        queryPool: poolWriter
          ? async (opts?: { nodeType?: string; successOnly?: boolean }) => {
              const r = await poolWriter.queryEntries(runId, tenantId, opts);
              return r.isSuccess ? (r.data ?? []) : [];
            }
          : undefined,
      };
      // seqIndex captured in closure — suppress unused-variable lint
      void currentSeqIndex;

      // SESSION-P-2: collect node (fan-out/fan-in) — handled inline in executor
      // to avoid circular dependency between NodeRegistry and CollectHandler.
      // CF-810: non-blocking; CF-811: each branch gets its own ctx copy; CF-812: counts included.
      if (nodeType === 'collect') {
        const collectStart = Date.now();
        try {
          const collectConfig = (node.config ?? {}) as unknown as CollectNodeConfig;
          const collectInputs: unknown = ctx.inputs?.['inputArray'] ?? ctx.inputs;
          const collectResult = await this.executeCollectNode(
            node.nodeId,
            collectConfig,
            collectInputs,
            ctx,
          );
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: 'PASS',
            durationMs: Date.now() - collectStart,
            output: collectResult as unknown as Record<string, unknown>,
          });
          priorOutputs.push({
            nodeType,
            data: collectResult as unknown as Record<string, unknown>,
          });
        } catch (err) {
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: 'FAIL',
            durationMs: Date.now() - collectStart,
            errorCode: 'COLLECT_FAILED',
          });
          executionStatus = 'FAIL';
          this.logger.warn(`collect node ${node.nodeId} FAILED: ${String(err)}`);
        }
        continue;
      }

      // SESSION-P-3: loop node (iterative convergence) — handled inline in executor.
      // CF-813: maxIterations enforced; CF-814: context capped at 10; CF-815: no eval().
      if (nodeType === 'loop') {
        const loopStart = Date.now();
        try {
          const loopConfig = (node.config ?? {}) as unknown as LoopNodeConfig;
          const loopResult = await this.executeLoopNode(node.nodeId, loopConfig, ctx.inputs, ctx);
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: 'PASS',
            durationMs: Date.now() - loopStart,
            output: loopResult as unknown as Record<string, unknown>,
          });
          priorOutputs.push({ nodeType, data: loopResult as unknown as Record<string, unknown> });
        } catch (err) {
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: 'FAIL',
            durationMs: Date.now() - loopStart,
            errorCode: 'LOOP_FAILED',
          });
          executionStatus = 'FAIL';
          this.logger.warn(`loop node ${node.nodeId} FAILED: ${String(err)}`);
        }
        continue;
      }

      // ── E3-1: human-queue node (UNCERTAIN moderation routing) ────────────────
      // IR-2: UNCERTAIN moderation outcome must route to PENDING_HUMAN_REVIEW state.
      // This node is reached when contract.uncertaintyBehavior === 'HUMAN_QUEUE' and
      // the ai-generate output contains an UNCERTAIN moderation verdict.
      if (nodeType === 'human-queue') {
        const humanQueueStart = Date.now();
        try {
          const humanQueueResult = await this.executeHumanQueueNode(
            node.nodeId,
            (node.config ?? {}) as Record<string, unknown>,
            contract,
            inputs,
            priorOutputs,
            tenantId,
          );
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: humanQueueResult.isSuccess ? 'PASS' : 'FAIL',
            durationMs: Date.now() - humanQueueStart,
            output: humanQueueResult.data ?? {},
          });
          if (humanQueueResult.isSuccess) {
            priorOutputs.push({ nodeType, data: humanQueueResult.data ?? {} });
          } else {
            executionStatus = 'FAIL';
          }
        } catch (err) {
          trace.nodes.push({
            nodeId: node.nodeId,
            nodeType,
            status: 'FAIL',
            durationMs: Date.now() - humanQueueStart,
            errorCode: 'HUMAN_QUEUE_FAILED',
          });
          executionStatus = 'FAIL';
          this.logger.warn(`human-queue node ${node.nodeId} FAILED: ${String(err)}`);
        }
        continue;
      }

      const handler = this.nodeRegistry.resolve(nodeType);

      if (!handler) {
        this.logger.warn(`No handler for nodeType=${nodeType}, skipping`);
        trace.nodes.push({
          nodeId: node.nodeId,
          nodeType,
          status: 'SKIP',
          durationMs: 0,
        });
        continue;
      }

      const start = Date.now();
      const result = await handler.handle(ctx);
      const durationMs = Date.now() - start;

      if (!result.isSuccess) {
        const nodeTrace: NodeTrace = {
          nodeId: node.nodeId,
          nodeType,
          status: 'FAIL',
          durationMs,
          errorCode: result.errorCode,
        };
        trace.nodes.push(nodeTrace);
        executionStatus = 'FAIL';
        this.logger.warn(`Node ${nodeType} FAILED: ${result.errorCode} — ${result.errorMessage}`);

        // T581: write failed node to pool (aids gap detection in context-query.handler)
        if (this.flowPoolWriter) {
          this.flowPoolWriter
            .writeEntry({
              runId,
              flowId,
              tenantId,
              nodeId: node.nodeId,
              nodeType,
              taskTypeId,
              executionPhase: FlowPoolWriterService.resolvePhase(nodeType),
              sequenceIndex: currentSeqIndex,
              success: false,
              failureReason: `${result.errorCode ?? 'UNKNOWN'}: ${result.errorMessage ?? ''}`,
              inputs: ctx.inputs as Record<string, unknown>,
              outputs: {},
              promptsUsed: [],
              judgeDecisions: [],
              arbiterDecisions: [],
              contextGapsEmitted: [],
              contextBlocksReceived: [],
              durationMs,
            })
            .catch((e: unknown) => this.logger.warn(`Pool write (fail) error: ${String(e)}`));
        }

        // Stop pipeline on failure of critical nodes
        if (['rag-retrieve', 'ai-generate'].includes(nodeType)) {
          break;
        }
        continue;
      }

      const nodeData = result.data?.data ?? {};
      const nodeMeta = result.data?.meta ?? {};
      const nodeTrace: NodeTrace = {
        nodeId: node.nodeId,
        nodeType,
        status: 'PASS',
        durationMs,
        output: nodeData,
      };

      // T581: write successful node to pool
      if (this.flowPoolWriter) {
        this.flowPoolWriter
          .writeEntry({
            runId,
            flowId,
            tenantId,
            nodeId: node.nodeId,
            nodeType,
            taskTypeId,
            executionPhase: FlowPoolWriterService.resolvePhase(nodeType),
            sequenceIndex: currentSeqIndex,
            success: true,
            inputs: ctx.inputs as Record<string, unknown>,
            outputs: nodeData,
            promptsUsed: (nodeMeta['promptsUsed'] as PoolPromptRecord[] | undefined) ?? [],
            judgeDecisions: (nodeMeta['judgeDecisions'] as PoolJudgeRecord[] | undefined) ?? [],
            arbiterDecisions:
              (nodeMeta['arbiterDecisions'] as PoolArbiterRecord[] | undefined) ?? [],
            contextGapsEmitted: (nodeMeta['contextGapsEmitted'] as string[] | undefined) ?? [],
            contextBlocksReceived:
              (nodeMeta['contextBlocksReceived'] as string[] | undefined) ?? [],
            durationMs,
          })
          .catch((e: unknown) => this.logger.warn(`Pool write (pass) error: ${String(e)}`));
      }

      // Extract score from score handler output (E2: retry logic)
      if (nodeType === 'score') {
        finalScore = Number(nodeData['score'] ?? 0);
        nodeTrace.score = finalScore;
        const threshold = Number(node.config?.['scoreThreshold'] ?? 0.7);
        const scorePass = Boolean(nodeData['passed']);
        const maxRetriesReached = Boolean(nodeData['maxRetriesReached']);

        if (!scorePass && !maxRetriesReached && retryCount < maxRetries) {
          retryCount++;
          this.logger.warn(
            `Score ${finalScore.toFixed(3)} below threshold ${threshold}, retry ${retryCount}/${maxRetries}`,
          );
          // E2: re-run from ai-generate (restart pipeline from generate node)
          // For this base implementation: mark node FAIL and continue to feedback
          nodeTrace.status = 'FAIL';
        } else if (maxRetriesReached) {
          executionStatus = 'HELD';
        }
      }

      trace.nodes.push(nodeTrace);
      priorOutputs.push({ nodeType, data: nodeData });
    }

    // N2 (FLOW-34): Multi-arbiter voting gate — only when arbiterConsensus declared.
    // Collects arbiter scores from priorOutputs nodes of type 'arbitrate'/'validate'
    // and applies threshold check. Existing flows without arbiterConsensus are unaffected.
    if (contract.arbiterConsensus && executionStatus !== 'HELD') {
      const arbiterResultsMap = new Map<string, number>();
      for (const output of priorOutputs) {
        if (output.nodeType === 'arbitrate' || output.nodeType === 'validate') {
          const checkResults = (output.data as Record<string, unknown>)?.['checkResults'];
          if (Array.isArray(checkResults)) {
            for (const cr of checkResults as Array<Record<string, unknown>>) {
              const checkId = cr['checkId'] as string | undefined;
              const passed = Boolean(cr['passed']);
              if (checkId) arbiterResultsMap.set(checkId, passed ? 1.0 : 0.0);
            }
          }
        }
      }

      const voteResult = evaluateVotingGate(arbiterResultsMap, {
        arbiters: (contract.arbiters ?? []) as string[],
        threshold: contract.arbiterConsensus.required,
        taskTypeId: contract.taskTypeId,
      });

      if (!voteResult.passed) {
        return DataProcessResult.failure(
          'ARBITER_REJECTED',
          `Voting gate failed for ${contract.taskTypeId}: ` +
            `${voteResult.passedCount}/${voteResult.requiredCount} arbiters passed. ` +
            `Failed: [${voteResult.failedArbiters.join(', ')}]`,
        );
      }

      this.logger.log(
        `Voting gate passed for ${contract.taskTypeId}: ` +
          `${voteResult.passedCount}/${voteResult.requiredCount} arbiters`,
      );
    }

    // Determine final status
    if (executionStatus !== 'HELD') {
      const failedCritical = trace.nodes.some(
        (n) => n.status === 'FAIL' && ['ai-generate', 'rag-retrieve'].includes(n.nodeType),
      );
      executionStatus = failedCritical ? 'FAIL' : 'PASS';
    }

    // PromotionLadder evaluation (BLOCKING-3 fix)
    let promoted = false;
    let promotionLevel: string | undefined;
    if (this.ladder && finalScore !== undefined && executionStatus === 'PASS') {
      try {
        const promotionResult = await this.ladder.evaluate(contract, finalScore);
        promoted = promotionResult.promoted;
        promotionLevel = promotionResult.level;
        if (promoted) {
          this.logger.log(`Task ${taskTypeId} promoted to ${promotionLevel}`);
        }
      } catch (e) {
        this.logger.warn(`PromotionLadder.evaluate failed: ${String(e)}`);
      }
    }

    // Update trace with final status
    trace.status = executionStatus;
    trace.score = finalScore;
    trace.completedAt = new Date().toISOString();

    // DNA-8: final trace update
    await this.db.storeDocument(
      'xiigen-run-traces',
      trace as unknown as Record<string, unknown>,
      runId,
    );

    this.logger.log(
      `Run ${runId} completed: status=${executionStatus} score=${finalScore?.toFixed(3) ?? 'N/A'} nodes=${trace.nodes.length}`,
    );

    return DataProcessResult.success({
      runId,
      status: executionStatus,
      score: finalScore,
      trace: trace.nodes,
      finalOutput: priorOutputs[priorOutputs.length - 1]?.data,
      promoted,
      promotionLevel,
    });
  }

  /** Get a stored run trace by runId. */
  async getTrace(runId: string): Promise<DataProcessResult<RunTrace>> {
    const result = await this.db.getDocument('xiigen-run-traces', runId);
    if (!result.isSuccess) {
      return DataProcessResult.failure('TRACE_NOT_FOUND', `Run trace ${runId} not found`);
    }
    return DataProcessResult.success(result.data as unknown as RunTrace);
  }

  // ─── E4-1: Retractive aggregation (removeEvents handler) ────────────────

  /**
   * Handle a removeEvents retraction for aggregation contracts (E4-1).
   *
   * FLOW-10 T-[+2] ReputationScoreAggregator: ReviewRetracted events must remove the
   * review from the aggregate and trigger recalculation.
   *
   * DNA-8: storeDocument() BEFORE enqueue() (outbox pattern).
   * DNA-3: returns DataProcessResult, never throws.
   */
  async handleRemoveEvent(
    contract: EngineContract,
    inputs: Record<string, unknown>,
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const aggregateIndex = `${contract.taskTypeId}-aggregates`;
    const aggregateId = String(inputs['targetEntityId'] ?? '');

    if (!aggregateId) {
      return DataProcessResult.failure(
        'RETRACTION_NO_TARGET',
        'removeEvents: targetEntityId missing from payload',
      );
    }

    // Read current aggregate document
    const currentResult = await this.db.getDocument(aggregateIndex, aggregateId);

    if (!currentResult.isSuccess || !currentResult.data) {
      // No aggregate exists for this entity — retraction is a no-op
      this.logger.debug(
        `removeEvents: no aggregate found for entity ${aggregateId} — retraction skipped`,
      );
      return DataProcessResult.success({ status: 'RETRACTION_NOOP', aggregateId });
    }

    const aggregate = currentResult.data as Record<string, unknown>;
    const reviews = (aggregate['reviews'] as string[]) ?? [];
    const retractedReviewId = String(inputs['reviewId'] ?? '');

    // Remove the retracted review from the list
    const updatedReviews = reviews.filter((id: string) => id !== retractedReviewId);

    if (updatedReviews.length === reviews.length) {
      // Review was not in the aggregate — retraction is a no-op (idempotent)
      this.logger.debug(
        `removeEvents: review ${retractedReviewId} not found in aggregate — already removed or never added`,
      );
      return DataProcessResult.success({ status: 'RETRACTION_ALREADY_REMOVED', aggregateId });
    }

    let newScore: number | null = null;

    // Recalculate aggregate score if recalculateOnRemove is true
    if (contract.aggregation?.recalculateOnRemove) {
      newScore = await this.recalculateAggregateScore(updatedReviews, contract);
    }

    // Clamp score to declared scoreRange
    const scoreRange = contract.aggregation?.scoreRange ?? [0, 1];
    if (newScore !== null) {
      newScore = Math.min(scoreRange[1], Math.max(scoreRange[0], newScore));
    }

    // Outbox pattern: store document BEFORE emitting event (DNA-8)
    const updatedAggregate: Record<string, unknown> = {
      ...aggregate,
      reviews: updatedReviews,
      reviewCount: updatedReviews.length,
      score: newScore ?? aggregate['score'],
      lastUpdatedAt: new Date().toISOString(),
      version: ((aggregate['version'] as number) ?? 0) + 1,
      tenantId,
    };

    await this.db.storeDocument(aggregateIndex, updatedAggregate, aggregateId);

    // Emit after store (DNA-8 compliance)
    if (this.queue) {
      await this.queue.enqueue('reputation-events', {
        type: 'reputation.score.updated',
        data: {
          targetEntityId: aggregateId,
          tenantId,
          newScore: newScore ?? aggregate['score'],
          reviewCount: updatedReviews.length,
          trigger: 'RETRACTION',
        },
      });
    }

    return DataProcessResult.success({
      status: 'RETRACTED',
      aggregateId,
      removedReviewId: retractedReviewId,
      newScore: newScore ?? aggregate['score'],
      reviewCount: updatedReviews.length,
    });
  }

  /**
   * Recalculate aggregate score from remaining reviews (E4-1).
   * Applies filterCondition: only PUBLISHED reviews contribute.
   * Returns null if no reviews remain after filtering.
   */
  private async recalculateAggregateScore(
    reviewIds: string[],
    contract: EngineContract,
  ): Promise<number | null> {
    if (reviewIds.length === 0) {
      // Return min of scoreRange when aggregate is empty
      return contract.aggregation?.scoreRange?.[0] ?? 0;
    }

    const filterCondition = contract.aggregation?.filterCondition;
    let totalRating = 0;
    let count = 0;

    for (const reviewId of reviewIds) {
      const result = await this.db.getDocument(`${contract.taskTypeId}-reviews`, reviewId);
      if (result.isSuccess && result.data) {
        const review = result.data as Record<string, unknown>;
        // Apply filterCondition: only PUBLISHED reviews contribute
        if (!filterCondition || review['status'] === 'PUBLISHED') {
          totalRating += (review['rating'] as number) ?? 0;
          count++;
        }
      }
    }

    return count > 0 ? totalRating / count : null;
  }

  // ─── E3-1: UNCERTAIN moderation routing (human-queue node) ──────────────

  /**
   * Execute a human-queue node: route UNCERTAIN moderation verdicts to human review.
   *
   * IR-2: UNCERTAIN outcome must route to PENDING_HUMAN_REVIEW state, never auto-reject.
   *
   * Outbox pattern (DNA-8): storeDocument() BEFORE enqueue().
   * Fabric-first (Rule 1): uses this.db (IDatabaseService) and this.queue (IQueueService).
   */
  private async executeHumanQueueNode(
    nodeId: string,
    config: Record<string, unknown>,
    contract: EngineContract,
    inputs: Record<string, unknown>,
    priorOutputs: NodeOutput[],
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const behavior = contract.uncertaintyBehavior ?? 'AUTO_REJECT';

    // Check if the ai-generate output indicates UNCERTAIN
    const generateOutput = priorOutputs.find((o) => o.nodeType === 'ai-generate');
    const generatedOutcome = String(generateOutput?.data?.['outcome'] ?? '').toUpperCase();

    // Only route to human queue if outcome is UNCERTAIN and behavior is HUMAN_QUEUE
    if (generatedOutcome !== 'UNCERTAIN' || behavior !== 'HUMAN_QUEUE') {
      this.logger.debug(
        `human-queue node ${nodeId}: skipped — outcome=${generatedOutcome} behavior=${behavior}`,
      );
      return DataProcessResult.success({ status: 'HUMAN_QUEUE_SKIPPED', nodeId, behavior });
    }

    const payload = inputs as Record<string, unknown>;
    const reviewId = String(payload['reviewId'] ?? randomUUID());
    const queueName = String(config['queueName'] ?? 'human-review-queue');
    const reviewIndex = `${contract.taskTypeId}-reviews`;

    // DNA-8: Outbox pattern — store document BEFORE enqueue
    await this.db.storeDocument(
      reviewIndex,
      {
        ...payload,
        status: 'PENDING_HUMAN_REVIEW',
        flaggedAt: new Date().toISOString(),
        tenantId,
      },
      reviewId,
    );

    // Enqueue AFTER store (DNA-8 compliance)
    if (this.queue) {
      await this.queue.enqueue(
        queueName,
        createCloudEvent({
          eventType: 'review.flagged_for_human',
          source: 'xiigen/flow-10/moderation',
          tenantId,
          data: {
            reviewId,
            tenantId,
            reason: 'UNCERTAIN_MODERATION_VERDICT',
          },
        }),
      );
    } else {
      this.logger.warn(`human-queue node ${nodeId}: no IQueueService injected — event not emitted`);
    }

    this.logger.log(
      `human-queue node ${nodeId}: review=${reviewId} routed to PENDING_HUMAN_REVIEW, queue=${queueName}`,
    );

    return DataProcessResult.success({
      status: 'PENDING_HUMAN_REVIEW',
      routedTo: 'humanQueue',
      queueName,
      reviewId,
    });
  }

  // ─── SESSION-P-2: Fan-out / Fan-in (collect node) ────────────────────────

  /**
   * Execute a collect node: dispatch N parallel branches and collect all results.
   *
   * CF-810: Uses Promise.allSettled — never blocks the event loop.
   * CF-811: Each branch gets its own context copy (isolated inputs).
   * CF-812: Returns successCount + failureCount + failures list.
   *
   * Timeout covers ALL batches combined, not per-branch.
   * maxParallel controls concurrency: items processed in batches of maxParallel.
   */
  async executeCollectNode(
    nodeId: string,
    config: CollectNodeConfig,
    input: unknown,
    ctx: NodeHandlerContext,
  ): Promise<CollectResult> {
    const { fanOut, fanIn } = config;
    const timeout = fanIn.timeout ?? 30000;
    const maxParallel = fanOut.maxParallel ?? 5;
    const policy = fanIn.partialFailurePolicy ?? 'use_available';

    // Determine the array of items to fan-out across
    const items: unknown[] =
      fanOut.source === 'inputArray'
        ? Array.isArray(input)
          ? input
          : [input]
        : Array.isArray(fanOut.source)
          ? fanOut.source.map((nodeId) => {
              const prior = ctx.priorOutputs.find((o) => o.nodeType === nodeId);
              return prior?.data ?? null;
            })
          : [input];

    interface SettledItem {
      status: 'fulfilled' | 'rejected';
      index: number;
      value?: unknown;
      reason?: string;
    }

    const allResults: SettledItem[] = [];

    // Process in batches of maxParallel (CF-811: each branch is isolated)
    for (let i = 0; i < items.length; i += maxParallel) {
      const batch = items.slice(i, i + maxParallel);

      const batchPromises = batch.map((item, batchIdx) => {
        const branchIndex = i + batchIdx;
        return this.executeSingleBranch(fanOut.handler, item, ctx)
          .then((value) => ({ status: 'fulfilled' as const, index: branchIndex, value }))
          .catch((err) => ({
            status: 'rejected' as const,
            index: branchIndex,
            reason: String(err),
          }));
      });

      // CF-810: race all branches against timeout — non-blocking
      const timeoutId: { ref: ReturnType<typeof setTimeout> | null } = { ref: null };
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId.ref = setTimeout(() => reject(new Error('collect.handler timeout')), timeout);
      });

      let batchResults: SettledItem[];
      try {
        batchResults = await Promise.race([Promise.all(batchPromises), timeoutPromise]);
      } catch {
        // Timeout fired — emit timeout failure for remaining items in batch
        batchResults = batch.map((_, batchIdx) => ({
          status: 'rejected' as const,
          index: i + batchIdx,
          reason: 'timeout',
        }));
      } finally {
        if (timeoutId.ref !== null) clearTimeout(timeoutId.ref);
      }

      allResults.push(...batchResults);
    }

    const successes = allResults.filter((r) => r.status === 'fulfilled');
    const failures = allResults.filter((r) => r.status === 'rejected');

    // Apply failure policy
    if (policy === 'fail_all' && failures.length > 0) {
      throw new Error(
        `collect.handler: ${failures.length} of ${allResults.length} branches failed`,
      );
    }

    // Merge results per strategy
    const collected = this.mergeCollectResults(
      successes.map((r) => r.value),
      fanIn.merge,
    );

    return {
      collected,
      successCount: successes.length,
      failureCount: failures.length,
      failures: failures.map((f) => ({ index: f.index, reason: f.reason ?? 'unknown' })),
    };
  }

  /**
   * Execute a single branch by invoking the named handler via NodeRegistry.
   * Uses a copy of the parent context to isolate each branch's inputs.
   */
  async executeSingleBranch(
    handlerType: string,
    input: unknown,
    parentCtx: NodeHandlerContext,
  ): Promise<unknown> {
    const handler = this.nodeRegistry.resolve(handlerType);
    if (!handler) {
      throw new Error(`collect.handler: no handler registered for '${handlerType}'`);
    }

    // Isolated branch context — copy parent, override inputs
    const branchCtx: NodeHandlerContext = {
      ...parentCtx,
      inputs:
        typeof input === 'object' && input !== null
          ? (input as Record<string, unknown>)
          : { value: input },
    };

    const result = await handler.handle(branchCtx);
    if (!result.isSuccess) {
      throw new Error(result.errorMessage ?? `Handler '${handlerType}' failed`);
    }
    return result.data?.data ?? result.data;
  }

  // ─── SESSION-P-3: Iterative convergence (loop node) ──────────────────────

  /**
   * Execute a loop node: run body handlers repeatedly until convergence or maxIterations.
   *
   * CF-813: iteration count tracked and maxIterations strictly enforced.
   * CF-814: context accumulator capped at 10 prior outputs to prevent unbounded growth.
   * CF-815: condition evaluated via dot-path accessor — no eval().
   *
   * @param nodeId    — topology node ID (for logging)
   * @param config    — LoopNodeConfig from topology
   * @param input     — initial input for the first iteration
   * @param parentCtx — parent execution context (used for handler dispatch)
   */
  async executeLoopNode(
    nodeId: string,
    config: LoopNodeConfig,
    input: unknown,
    parentCtx: NodeHandlerContext,
  ): Promise<LoopResult> {
    const {
      body,
      condition,
      maxIterations = 5,
      contextAccumulator = 'append',
      onMaxReached = 'use_last',
    } = config;

    const CONTEXT_CAP = 10; // CF-814: cap accumulated context at 10 iterations
    let iterationContext: unknown = input;
    const iterationOutputs: unknown[] = [];
    let converged = false;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      this.logger.debug(`loop.handler ${nodeId}: iteration ${iteration + 1}/${maxIterations}`);

      // Execute all body handlers sequentially; each receives the output of the previous
      let nodeInput: unknown = iterationContext;
      for (const handlerType of body) {
        nodeInput = await this.executeSingleBranch(handlerType, nodeInput, parentCtx);
      }

      const lastOutput = nodeInput;
      iterationOutputs.push(lastOutput);

      // Accumulate context for next iteration (CF-814: cap at CONTEXT_CAP prior outputs)
      if (contextAccumulator === 'append') {
        const cappedPriorOutputs = iterationOutputs.slice(-CONTEXT_CAP);
        iterationContext = {
          ...(typeof input === 'object' && input !== null
            ? (input as Record<string, unknown>)
            : { original: input }),
          priorOutputs: cappedPriorOutputs,
          lastOutput,
          iteration: iteration + 1,
        };
      } else {
        // replace: only the latest output is passed as context
        iterationContext = lastOutput;
      }

      // Evaluate convergence condition (CF-815: no eval)
      converged = this.evaluateCondition(condition, lastOutput);
      if (converged) {
        this.logger.debug(`loop.handler ${nodeId}: converged at iteration ${iteration + 1}`);
        break;
      }
    }

    // Determine final output based on policy when condition was not met
    let finalOutput: unknown = iterationOutputs[iterationOutputs.length - 1] ?? null;

    if (!converged) {
      if (onMaxReached === 'fail') {
        throw new Error(
          `loop.handler: condition '${condition}' not met after ${maxIterations} iterations`,
        );
      }
      if (onMaxReached === 'use_best') {
        // Return iteration with highest 'score' field (CF-813)
        finalOutput = iterationOutputs.reduce((best, current) => {
          const bestScore = ((best as Record<string, unknown>)?.['score'] as number) ?? 0;
          const currentScore = ((current as Record<string, unknown>)?.['score'] as number) ?? 0;
          return currentScore > bestScore ? current : best;
        }, iterationOutputs[0] ?? null);
      }
      // use_last: finalOutput already contains the last iteration's output
    }

    return {
      result: finalOutput,
      iterations: iterationOutputs.length,
      converged,
      condition,
    };
  }

  /**
   * Safely evaluate a condition expression against an output object.
   * CF-815: no eval() — uses dot-path accessor + JSON.parse for RHS values.
   *
   * Supports:
   *   - Simple dot-path truthy check: "converged" → !!output.converged
   *   - Nested path:                  "result.quality" → !!output.result.quality
   *   - Comparison:                   "score >= 0.85" → output.score >= 0.85
   *   - Equality:                     "status === \"done\"" → output.status === "done"
   */
  evaluateCondition(expression: string, output: unknown): boolean {
    if (!expression || output === null || output === undefined || typeof output !== 'object') {
      return false;
    }

    const resolvePath = (path: string, obj: unknown): unknown =>
      path
        .split('.')
        .reduce<unknown>(
          (acc, key) =>
            acc !== null && acc !== undefined && typeof acc === 'object'
              ? (acc as Record<string, unknown>)[key]
              : undefined,
          obj,
        );

    // Simple dot-path truthy check: e.g. "converged" or "result.passed"
    if (/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expression)) {
      return !!resolvePath(expression, output);
    }

    // Comparison expression: "score >= 0.85" or "status === \"done\""
    const comparisonMatch = expression.match(
      /^([a-zA-Z_][a-zA-Z0-9_.]*)\s*(>=|<=|>|<|===|!==|==|!=)\s*(.+)$/,
    );
    if (comparisonMatch) {
      const [, path, operator, rhsRaw] = comparisonMatch;
      const lhsValue = resolvePath(path, output);

      let rhsValue: unknown;
      try {
        rhsValue = JSON.parse(rhsRaw.trim());
      } catch {
        this.logger.warn(
          `loop.handler: condition evaluator could not parse RHS '${rhsRaw.trim()}' ` +
            `in '${expression}'. Condition treated as false. ` +
            `Use numbers (0.85), booleans (true/false), or quoted strings ("value").`,
        );
        return false;
      }

      switch (operator) {
        case '>=':
          return (lhsValue as number) >= (rhsValue as number);
        case '<=':
          return (lhsValue as number) <= (rhsValue as number);
        case '>':
          return (lhsValue as number) > (rhsValue as number);
        case '<':
          return (lhsValue as number) < (rhsValue as number);
        case '===':
        case '==':
          return lhsValue === rhsValue;
        case '!==':
        case '!=':
          return lhsValue !== rhsValue;
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * Merge branch results into a single value per the merge strategy.
   */
  private mergeCollectResults(
    results: unknown[],
    strategy: 'array' | 'object' | 'custom',
  ): unknown {
    switch (strategy) {
      case 'array':
        return results;
      case 'object':
        return results.reduce<Record<string, unknown>>((acc, r) => {
          if (r && typeof r === 'object') Object.assign(acc, r);
          return acc;
        }, {});
      case 'custom':
        // Custom merge — return array and let caller handle it
        return results;
      default:
        return results;
    }
  }

  /**
   * Resolve actual provider names from the contract's factory declarations + current env.
   *
   * Z-1.5: Maps each fabric interface to the provider running in this execution.
   * Uses env vars (DATABASE_PROVIDER, AI_PROVIDER, etc.) as the source of truth —
   * these are set at server startup and reflect what is actually wired in FabricsModule.
   *
   * Result is written to ctx.resolvedProviders so feedback.handler can record it
   * in the DPO triple's runtimeContext.fabricProviders field (GAP-08 compliance).
   */
  private resolveContractProviders(contract: EngineContract): Record<string, string> {
    const providers: Record<string, string> = {};

    // fabric name → env var name → fallback provider name
    const FABRIC_ENV_MAP: Record<string, [string, string]> = {
      DATABASE: ['DATABASE_PROVIDER', 'in_memory'],
      QUEUE: ['QUEUE_PROVIDER', 'in_memory'],
      AI_ENGINE: ['AI_PROVIDER', 'mock'],
      RAG: ['RAG_PROVIDER', 'in_memory'],
      SECRETS: ['SECRETS_PROVIDER', 'in_memory'],
      SCOPED_MEMORY: ['SCOPED_MEMORY_PROVIDER', 'in_memory'],
      SCHEDULER: ['SCHEDULER_PROVIDER', 'in_memory'],
      CODE_REPO: ['CODE_REPO_PROVIDER', 'zip_archive'],
    };

    // Collect factory declarations from the ES contract document.
    // ES contracts use camelCase 'factories' or 'factoryDependencies' depending on seeder version.
    const contractDoc = contract as unknown as Record<string, unknown>;
    const factories =
      (contractDoc['factories'] as Array<Record<string, unknown>> | undefined) ??
      (contract.factoryDependencies as unknown as Array<Record<string, unknown>>) ??
      [];

    for (const factory of factories) {
      const fabricRaw = String(
        factory['fabric'] ?? factory['fabricType'] ?? factory['fabric_type'] ?? '',
      ).toUpperCase();
      const interfaceName = String(
        factory['interface'] ?? factory['interfaceName'] ?? factory['interface_name'] ?? '',
      );
      if (!fabricRaw || !interfaceName) continue;

      const [envKey, fallback] = FABRIC_ENV_MAP[fabricRaw] ?? [null, null];
      if (envKey) {
        providers[interfaceName] = process.env[envKey] ?? fallback;
      }
    }

    // Also capture the stackCoupling.fabricInterface if present (Z-2/Z-4 fabric declarations).
    const coupling = contractDoc['stackCoupling'] as Record<string, unknown> | undefined;
    if (coupling?.['fabricInterface']) {
      const iface = String(coupling['fabricInterface']);
      // Derive fabric from interface name prefix
      if (iface.startsWith('IScheduler')) {
        providers[iface] = process.env['SCHEDULER_PROVIDER'] ?? 'in_memory';
      } else if (iface.startsWith('IScopedMemory')) {
        providers[iface] = process.env['SCOPED_MEMORY_PROVIDER'] ?? 'in_memory';
      } else if (iface.startsWith('ICodeRepository')) {
        providers[iface] = process.env['CODE_REPO_PROVIDER'] ?? 'zip_archive';
      }
    }

    return providers;
  }

  /** Default 5-node pipeline when no topology is defined. */
  private defaultNodes() {
    return [
      { nodeId: 'n1', nodeType: 'rag-retrieve', config: {} },
      { nodeId: 'n2', nodeType: 'decompose', config: {} },
      { nodeId: 'n3', nodeType: 'ai-generate', config: {} },
      { nodeId: 'n4', nodeType: 'validate', config: {} },
      { nodeId: 'n5', nodeType: 'score', config: { scoreThreshold: 0.7, maxRetries: 3 } },
      { nodeId: 'n6', nodeType: 'feedback', config: {} },
    ];
  }

  /** Resolve execution order from topology (topological sort placeholder — linear for E1). */
  private resolveExecutionOrder(
    nodes: FlowTopology['nodes'],
    topology: FlowTopology | null,
  ): FlowTopology['nodes'] {
    if (!topology || !topology.edges || topology.edges.length === 0) {
      return nodes; // Linear order as-is
    }
    // Simple topological sort using edges
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      inDegree.set(node.nodeId, 0);
      adjacency.set(node.nodeId, []);
    }
    for (const edge of topology.edges) {
      adjacency.get(edge.from)?.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
    const queue = nodes.filter((n) => inDegree.get(n.nodeId) === 0);
    const ordered: FlowTopology['nodes'] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      ordered.push(node);
      for (const neighbor of adjacency.get(node.nodeId) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) {
          const neighborNode = nodes.find((n) => n.nodeId === neighbor);
          if (neighborNode) queue.push(neighborNode);
        }
      }
    }
    return ordered.length === nodes.length ? ordered : nodes;
  }
}
