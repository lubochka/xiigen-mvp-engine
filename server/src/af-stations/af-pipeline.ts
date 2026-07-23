/**
 * AfPipeline — delegates execution to GenericNodeExecutor.
 *
 * Converts StationInput into an EngineContract + inputs Record and calls
 * GenericNodeExecutor.execute(). Maps the ExecutionResult back to PipelineResult.
 *
 * The old INVENTORY → SYNTHESIS → JUDGMENT chain (InventoryEngine, SynthesisEngine,
 * JudgmentEngine) has been retired. GenericNodeExecutor is the single execution path.
 *
 * DNA-3: returns DataProcessResult, never throws.
 * DNA-5: tenantId required.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { GenericNodeExecutor } from '../engine/generic-node-executor';
import { ContractArchetype } from '../engine-contracts/archetypes';
import { EngineContract } from '../engine-contracts/contract-schema';
import { StationInput } from './base';
import { PipelineConfig } from './pipeline-config';

/** Log entry for a single pipeline stage (node execution). */
export interface StageLog {
  stage: string;
  success: boolean;
  elapsedMs: number;
  cost_usd?: number;
  details?: Record<string, unknown>;
}

/** Full pipeline execution result. */
export interface PipelineResult {
  /** Did the pipeline pass? */
  passed: boolean;
  /** Numeric score from the last score-node stage (0–1). Absent when no score node ran.
   * GAP-ENG-1 (FLOW-04): Session B reads d.get('score') — was always 0 before this fix. */
  score?: number;
  /** Run ID from the executor. */
  artifactId: string;
  /** Promotion level after this run. */
  promotionLevel: string;
  /** Per-node execution logs. */
  stages: StageLog[];
  /** Total elapsed time. */
  totalElapsedMs: number;
  /** Total USD cost (tracked by executor when CostTracker is wired). */
  total_cost_usd: number;
  /** Cost broken down by model. */
  cost_by_model: Record<string, number>;
  /** Input that triggered the run. */
  enrichedInput: StationInput;
  /** Errors collected across all nodes. */
  errors: string[];
  /** Warnings collected across all nodes. */
  warnings: string[];
}

@Injectable()
export class AfPipeline {
  private readonly logger = new Logger(AfPipeline.name);
  private _runCount = 0;
  private _passCount = 0;

  constructor(private readonly executor: GenericNodeExecutor) {}

  /**
   * Execute the pipeline by delegating to GenericNodeExecutor.
   * @param input  StationInput — must have tenantId (DNA-5).
   * @param config PipelineConfig — currently reserved; topology governs node execution.
   */
  async execute(
    input: StationInput,
    _config?: PipelineConfig,
  ): Promise<DataProcessResult<PipelineResult>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const start = Date.now();

    // Build a minimal EngineContract from the StationInput taskType.
    const contract: EngineContract = {
      taskTypeId: input.taskType || 'unknown',
      taskTypeName: input.taskType || 'unknown',
      archetype: ContractArchetype.ORCHESTRATION,
      flowId: 'af-pipeline',
      flowName: 'AF Pipeline',
      purpose: 'AF pipeline execution via GenericNodeExecutor',
      entry: 'StationInput from AfPipeline',
      triggers: [],
      outputs: [],
      qualityGates: [],
      ironRules: [],
      distinctFrom: '',
      toDict() {
        return this as unknown as Record<string, unknown>;
      },
      validate() {
        return DataProcessResult.success(undefined);
      },
    } as unknown as EngineContract;

    const inputs: Record<string, unknown> = {
      taskType: input.taskType,
      spec: input.spec,
      prompts: input.prompts,
      ragContext: input.ragContext,
    };

    const result = await this.executor.execute(contract, inputs, {
      tenantId: input.tenantId,
      flowId: 'af-pipeline',
    });

    this._runCount++;

    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }

    const execResult = result.data!;
    const passed = execResult.status === 'PASS';

    if (passed) this._passCount++;

    const stages: StageLog[] = execResult.trace.map((n) => ({
      stage: n.nodeId,
      success: n.status === 'PASS',
      elapsedMs: n.durationMs,
      details: n.output,
    }));

    const errors = execResult.trace
      .filter((n) => n.status === 'FAIL')
      .map((n) => n.errorCode ?? 'NODE_FAILED');

    this.logger.debug(
      `AfPipeline run: runId=${execResult.runId} status=${execResult.status} nodes=${stages.length}`,
    );

    // GAP-ENG-1 fix: extract score from last score-node stage so Session B doesn't get 0
    const scoreStage = [...execResult.trace].reverse().find((n) => n.nodeType === 'score');
    const score = scoreStage
      ? Number((scoreStage as unknown as Record<string, unknown>)['score'] ?? 0)
      : undefined;

    return DataProcessResult.success({
      passed,
      score,
      artifactId: execResult.runId,
      promotionLevel: execResult.promotionLevel ?? execResult.status,
      stages,
      totalElapsedMs: Date.now() - start,
      total_cost_usd: 0,
      cost_by_model: {},
      enrichedInput: input,
      errors,
      warnings: [],
    });
  }

  /** Total number of pipeline executions. */
  get runCount(): number {
    return this._runCount;
  }

  /** Pass rate across all executions (0–1). */
  get passRate(): number {
    if (this._runCount === 0) return 0;
    return this._passCount / this._runCount;
  }
}
