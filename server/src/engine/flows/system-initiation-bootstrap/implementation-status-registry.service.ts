/**
 * ImplementationStatusRegistry — T538 [STATE_MACHINE].
 *
 * Per-family implementation status tracker with idempotency locks.
 * Composite idempotency key: (tenantId, flowId, familyId, runId) — SETNX pattern.
 *
 * States: PENDING → IN_PROGRESS → COMPLETED | FAILED | NEEDS_REVIEW
 *
 * CF-739: Sentinel state read before every state transition.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type {
  Flow33DocumentUpdater,
  Flow33Queue,
} from './flow33-shared-interfaces';

export type ImplementationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_REVIEW';

export interface ImplementationStatusRecord {
  runId: string;
  tenantId: string;
  flowId: string;
  familyId: string;
  status: ImplementationStatus;
  createdAt: string;
  updatedAt: string;
  transitionHistory: StatusTransition[];
}

export interface StatusTransition {
  fromStatus: ImplementationStatus;
  toStatus: ImplementationStatus;
  transitionedAt: string;
  reason?: string;
}

export interface ImplementationStatusResult {
  runId: string;
  currentStatus: ImplementationStatus;
  transitionHistory: StatusTransition[];
}

/** Valid state machine transitions (CF-739 enforced). */
const VALID_TRANSITIONS: Record<ImplementationStatus, ImplementationStatus[]> = {
  PENDING: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED', 'FAILED', 'NEEDS_REVIEW'],
  COMPLETED: [],
  FAILED: [],
  NEEDS_REVIEW: ['IN_PROGRESS'],
};

export class ImplementationStatusRegistry {
  constructor(
    private readonly db: Flow33DocumentUpdater,
    private readonly queue: Flow33Queue,
  ) {}

  /**
   * Composite idempotency key generator — SETNX pattern.
   */
  private compositeKey(tenantId: string, flowId: string, familyId: string, runId: string): string {
    return `${tenantId}::${flowId}::${familyId}::${runId}`;
  }

  /**
   * Register a new implementation run — PENDING state.
   * SETNX: returns failure if runId already registered for this composite key.
   */
  async registerRun(
    tenantId: string,
    flowId: string,
    familyId: string,
    runId: string,
  ): Promise<DataProcessResult<ImplementationStatusResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!familyId) return DataProcessResult.failure('MISSING_FAMILY_ID', 'familyId is required');
    if (!runId) return DataProcessResult.failure('MISSING_RUN_ID', 'runId is required');

    const compositeKey = this.compositeKey(tenantId, flowId, familyId, runId);

    // SETNX: check if already registered
    const existing = await this.db.searchDocuments('flow33-implementation-status', {
      compositeKey,
    });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data?.length) {
      return DataProcessResult.failure(
        'DUPLICATE_RUN_BLOCKED',
        `Run ${runId} already registered for family ${familyId} (SETNX composite key: ${compositeKey})`,
      );
    }

    const now = new Date().toISOString();
    const record: ImplementationStatusRecord = {
      runId,
      tenantId,
      flowId,
      familyId,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      transitionHistory: [],
    };

    // DNA-8: storeDocument BEFORE enqueue
    const stored = await this.db.storeDocument(
      'flow33-implementation-status',
      { ...record, compositeKey } as unknown as Record<string, unknown>,
      compositeKey,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('implementation.status.pending', {
      runId,
      tenantId,
      flowId,
      familyId,
      status: 'PENDING',
      createdAt: now,
    });

    return DataProcessResult.success({ runId, currentStatus: 'PENDING', transitionHistory: [] });
  }

  /**
   * Transition status — reads sentinel first (CF-739), validates transition, persists before emit (DNA-8).
   */
  async transition(
    tenantId: string,
    flowId: string,
    familyId: string,
    runId: string,
    toStatus: ImplementationStatus,
    reason?: string,
  ): Promise<DataProcessResult<ImplementationStatusResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const compositeKey = this.compositeKey(tenantId, flowId, familyId, runId);

    // CF-739: Read sentinel state BEFORE transition
    const existing = await this.db.searchDocuments('flow33-implementation-status', {
      compositeKey,
    });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (!existing.data?.length)
      return DataProcessResult.failure(
        'RUN_NOT_FOUND',
        `Run ${runId} not found for family ${familyId}`,
      );

    const current = existing.data[0] as unknown as ImplementationStatusRecord;
    const fromStatus = current.status;

    // Validate state machine transition
    if (!VALID_TRANSITIONS[fromStatus].includes(toStatus)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Cannot transition from ${fromStatus} to ${toStatus}. Valid targets: [${VALID_TRANSITIONS[fromStatus].join(', ')}]`,
      );
    }

    const now = new Date().toISOString();
    const newTransition: StatusTransition = { fromStatus, toStatus, transitionedAt: now, reason };
    const updatedHistory = [...current.transitionHistory, newTransition];

    // DNA-8: updateDocument BEFORE enqueue
    const updated = await this.db.updateDocument('flow33-implementation-status', compositeKey, {
      status: toStatus,
      updatedAt: now,
      transitionHistory: updatedHistory,
    });
    if (!updated.isSuccess)
      return DataProcessResult.failure(updated.errorCode!, updated.errorMessage!);

    const eventName = `implementation.status.${toStatus.toLowerCase()}`;
    await this.queue.enqueue(eventName, {
      runId,
      tenantId,
      flowId,
      familyId,
      fromStatus,
      toStatus,
      transitionedAt: now,
      reason,
    });

    return DataProcessResult.success({
      runId,
      currentStatus: toStatus,
      transitionHistory: updatedHistory,
    });
  }

  /**
   * Get current status for a run.
   */
  async getStatus(
    tenantId: string,
    flowId: string,
    familyId: string,
    runId: string,
  ): Promise<DataProcessResult<ImplementationStatusResult | null>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const compositeKey = this.compositeKey(tenantId, flowId, familyId, runId);
    const result = await this.db.searchDocuments('flow33-implementation-status', { compositeKey });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    if (!result.data?.length) return DataProcessResult.success(null);

    const record = result.data[0] as unknown as ImplementationStatusRecord;
    return DataProcessResult.success({
      runId,
      currentStatus: record.status,
      transitionHistory: record.transitionHistory,
    });
  }
}
