/**
 * ExpandConsumerHandler — processes 'cycle.chain.expand' queue events.
 *
 * @EventPattern('cycle.chain.expand')
 * Triggered by CycleChainService when an EXPAND verdict fires the async queue handoff.
 *
 * Responsibilities:
 *   1. Run child CycleChainService for each queued sub-flow
 *   2. Update SubFlowRef.status in xiigen-run-state (DNA-8: before child.completed emit)
 *   3. Emit 'cycle.chain.child.completed' with child traces for parent trace propagation
 *
 * Trace propagation: child cycle2Traces and cycle3Traces are tagged with
 *   subFlowRunId and parentNodeId so the visualization layer can reconstruct
 *   the full execution tree at any depth.
 *
 * DNA-3: never throws
 * DNA-8: storeDocument before every enqueue
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleChainService, SubFlowRef } from './cycle-chain.service';
// Track 0 Turn 11 (v22 Finding BB): @Optional() injection so existing tests
// continue to construct with 3 args. Publish is fire-and-forget.
import { TopologyPublisher } from './topology-publisher';

export interface ExpandPayload {
  parentRunId: string;
  subFlowRefId: string;
  subFlowIntent: string;
  subFlowName: string;
  flowId: string;
  domain?: string;
  constraints: string[];
  priorArtQuery?: string;
  depth: number;
  terminationDepth: number;
  tenantId: string;
  parentNode?: Record<string, unknown>;
  delegatedScope?: string;
}

@Injectable()
export class ExpandConsumerHandler {
  private readonly logger = new Logger(ExpandConsumerHandler.name);

  constructor(
    private readonly cycleChain: CycleChainService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    // Track 0 Turn 11 (v22 Finding BB): @Optional() publisher — fire-and-forget
    // subflow topology capture. Doesn't change the handler's completion behavior.
    @Optional() private readonly publisher?: TopologyPublisher,
  ) {}

  /**
   * Handle a single 'cycle.chain.expand' queue event.
   * Called by queue infrastructure when an EXPAND event is dequeued.
   * DNA-3: returns DataProcessResult, never throws.
   */
  async handleExpand(payload: ExpandPayload): Promise<DataProcessResult<void>> {
    try {
      const {
        parentRunId,
        subFlowRefId,
        subFlowIntent,
        subFlowName,
        flowId,
        domain,
        constraints,
        priorArtQuery,
        depth,
        terminationDepth,
        tenantId,
        parentNode,
        delegatedScope,
      } = payload;

      // Build deterministic child runId
      const childRunId = `${parentRunId}-d${depth}-${subFlowName.replace(/\s+/g, '-')}`;

      this.logger.log(
        `ExpandConsumerHandler: starting sub-flow "${subFlowName}" (depth=${depth}) → childRunId=${childRunId}`,
      );

      // Mark SubFlowRef as RUNNING (DNA-8: before actual run starts — prevents orphan on crash)
      await this.db.storeDocument(
        'xiigen-run-state',
        {
          id: subFlowRefId,
          status: 'RUNNING',
          childRunId,
          startedAt: new Date().toISOString(),
        } as Record<string, unknown>,
        subFlowRefId,
      );

      // Run child cycle-chain
      const childResult = await this.cycleChain.run({
        userIntent: subFlowIntent,
        domain,
        constraints,
        priorArtQuery,
        flowId,
        runId: childRunId,
        tenantId,
        currentDepth: depth,
        terminationDepth,
        parentNode,
        delegatedScope,
      });

      // Track 0 Turn 11 — subflow topology capture.
      //   Fire-and-forget publish of the child topology to TenantTopologyStore
      //   so tree-style visualization can reconstruct parent → child flow.
      //   Failure here does NOT affect subflow handling or parent trace propagation.
      const parentNodeIdForPublish = String(parentNode?.['nodeId'] ?? parentNode?.['id'] ?? '');
      if (this.publisher && childResult.isSuccess && childResult.data) {
        void this.publisher
          .publish(childResult.data, subFlowIntent, {
            parentRunId,
            parentNodeId: parentNodeIdForPublish,
          })
          .then((r) => {
            if (!r.isSuccess) {
              this.logger.warn(
                `Subflow topology publish skipped: ${r.errorCode} ${r.errorMessage ?? ''}`,
              );
            }
          })
          .catch((err) => this.logger.error('Subflow topology publish threw', err));
      }

      // Tag child traces with subFlowRunId + parentNodeId for tree reconstruction
      const parentNodeId = String(parentNode?.['nodeId'] ?? parentNode?.['id'] ?? '');
      const taggedCycle2 = (childResult.data?.cycles.cycle2 ?? []).map((t) => ({
        ...t,
        subFlowRunId: childRunId,
        parentNodeId,
      }));
      const taggedCycle3 = (childResult.data?.cycles.cycle3 ?? []).map((t) => ({
        ...t,
        subFlowRunId: childRunId,
      }));

      // Build updated SubFlowRef record (DNA-8: store before child.completed emit)
      const refUpdate: Omit<SubFlowRef, 'parentStepIndex' | 'createdAt'> & Record<string, unknown> =
        {
          id: subFlowRefId,
          status: childResult.isSuccess ? 'COMPLETE' : 'FAILED',
          childRunId,
          completedAt: new Date().toISOString(),
          parentRunId,
          parentNodeId,
          depth,
          subFlowIntent,
          subFlowName,
          connectionType: 'FLOW_SCOPED',
          tenantId,
          // Propagate child output for parent trace merging
          childLeafNodes: childResult.data?.leafNodes ?? [],
          childTopology: childResult.data?.topology ?? [],
          childCycle2Traces: taggedCycle2,
          childCycle3Traces: taggedCycle3,
          childPendingImpls: childResult.data?.pendingImplementations ?? [],
          childStatus: childResult.data?.status ?? (childResult.isSuccess ? 'COMPLETE' : 'FAILED'),
          childGrade: childResult.data?.grade ?? 0,
          childError: childResult.isSuccess ? undefined : childResult.errorMessage,
        };

      await this.db.storeDocument(
        'xiigen-run-state',
        refUpdate as Record<string, unknown>,
        subFlowRefId,
      );

      // Emit child.completed event — parent can use this to check if all siblings are done
      await this.queue.enqueue('cycle.chain.child.completed', {
        parentRunId,
        subFlowRefId,
        childRunId,
        subFlowName,
        success: childResult.isSuccess,
        childStatus: refUpdate['childStatus'],
        childGrade: refUpdate['childGrade'],
      } as Record<string, unknown>);

      this.logger.log(
        `ExpandConsumerHandler: "${subFlowName}" ${childResult.isSuccess ? 'COMPLETE' : 'FAILED'} — emitted cycle.chain.child.completed`,
      );
      return DataProcessResult.success(undefined);
    } catch (err) {
      return DataProcessResult.failure(
        'EXPAND_CONSUMER_ERROR',
        `ExpandConsumerHandler threw: ${String(err)}`,
      );
    }
  }
}
