/**
 * PreflightCompletionOrchestrator — GAP-21-03
 *
 * CF-389: Payment gate (T317) MUST fire LAST — after all fan-out gates (T314/T315/T316).
 * This orchestrator tracks completion of T314, T315, T316 and emits
 * form.entry.preflight.complete only once all three have reported.
 *
 * Mechanism: Each gate calls recordGateCompletion() on finish.
 * When all three keys are present in scoped memory, preflight.complete is emitted.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-9: events use createCloudEvent
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import {
  IScopedMemoryService,
  SCOPED_MEMORY_SERVICE,
} from '../../fabrics/interfaces/scoped-memory.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { createCloudEvent } from '../../kernel/cloud-events';

const PREFLIGHT_TTL = 3600; // 1 hour

const PREFLIGHT_GATES = ['T314', 'T315', 'T316'] as const;
type PreflightGate = (typeof PREFLIGHT_GATES)[number];

@Injectable()
export class PreflightCompletionOrchestrator {
  private readonly logger = new Logger(PreflightCompletionOrchestrator.name);

  constructor(
    @Inject(SCOPED_MEMORY_SERVICE) private readonly memory: IScopedMemoryService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  /**
   * Called by T314, T315, T316 upon completion (success or definitive failure).
   * When all three have reported, emits form.entry.preflight.complete for T317.
   */
  async recordGateCompletion(
    entryId: string,
    tenantId: string,
    gateId: PreflightGate,
    status: 'completed' | 'failed',
  ): Promise<DataProcessResult<void>> {
    const cacheKey = `preflight:${entryId}:${gateId}`;
    await this.memory.set(cacheKey, status, PREFLIGHT_TTL);

    // Check if all required gates have reported
    const statuses = await Promise.all(
      PREFLIGHT_GATES.map((gate) => this.memory.get(`preflight:${entryId}:${gate}`)),
    );

    const allReported = statuses.every((s) => s !== null);
    if (allReported) {
      this.logger.log(
        `PreflightOrchestrator: all 3 gates reported for entry ${entryId} — emitting preflight.complete`,
      );
      return this.emitPreflightComplete(entryId, tenantId, {
        t314: statuses[0],
        t315: statuses[1],
        t316: statuses[2],
      });
    }

    const reported = statuses.filter((s) => s !== null).length;
    this.logger.debug(`PreflightOrchestrator: ${reported}/3 gates reported for entry ${entryId}`);
    return DataProcessResult.success(undefined);
  }

  private async emitPreflightComplete(
    entryId: string,
    tenantId: string,
    gateStatuses: Record<string, string | null>,
  ): Promise<DataProcessResult<void>> {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.entry.preflight.complete',
      source: 'dynamic-forms-workflows/preflight-completion-orchestrator',
      tenantId,
      subject: entryId,
      data: {
        entryId,
        t314Status: gateStatuses['t314'],
        t315Status: gateStatuses['t315'],
        t316Status: gateStatuses['t316'],
        allSucceeded: Object.values(gateStatuses).every((s) => s === 'completed'),
      },
    });
    const result = await this.queue.enqueue('form.entry.preflight.complete', event);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'ENQUEUE_FAILED',
        result.errorMessage ?? 'Failed to enqueue preflight.complete event',
      );
    }
    return DataProcessResult.success(undefined);
  }

  /**
   * Called by T312 for forms with NO T314/T315/T316 gates configured (payment-only forms).
   * Ensures payment-only forms still trigger T317 (CF-389).
   */
  async emitPreflightCompleteDirectly(
    entryId: string,
    tenantId: string,
  ): Promise<DataProcessResult<void>> {
    this.logger.log(
      `PreflightOrchestrator: direct preflight.complete for payment-only form entry ${entryId}`,
    );
    return this.emitPreflightComplete(entryId, tenantId, {
      t314: 'skipped',
      t315: 'skipped',
      t316: 'skipped',
    });
  }
}
