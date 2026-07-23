/**
 * FlowLifecycleManagerService — manages flow lifecycle transitions with audit trail.
 *
 * Allowed transitions:
 *   PENDING  → ACTIVE | FAILED
 *   ACTIVE   → DEPRECATED | FAILED
 *   DEPRECATED → (terminal)
 *   FAILED   → (terminal)
 *
 * Every transition writes an audit entry to xiigen-flow-lifecycle-audit BEFORE
 * updating the lifecycle record (DNA-8 outbox pattern).
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: audit write before status update.
 * Stage 2, S9.
 */
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { RETROSPECTIVE_SERVICE } from '../fabrics/graph/interfaces/planning-tokens';
import { ES_INDEX } from '../kernel/es-index-constants';

/** Minimal contract for retrospective service (avoids circular dependency on concrete class). */
interface IRetrospectiveRunner {
  runR1(flowId: string): Promise<{
    calibration: Record<string, number>;
    clearToProceed: boolean;
    promotionResults: Array<{ archetype: string; arbiter: string; result: string }>;
  }>;
}

export type LifecycleStatus = 'PENDING' | 'ACTIVE' | 'DEPRECATED' | 'FAILED';

export interface FlowLifecycleRecord {
  flowId: string;
  status: LifecycleStatus;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LifecycleAuditEntry {
  auditId: string;
  flowId: string;
  fromStatus: string;
  toStatus: string;
  transitionedBy: string;
  reason?: string;
  timestamp: string;
}

const LIFECYCLE_INDEX = ES_INDEX.FLOW_LIFECYCLE;
const AUDIT_INDEX = ES_INDEX.FLOW_LIFECYCLE_AUDIT;

export const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  PENDING: ['ACTIVE', 'FAILED'],
  ACTIVE: ['DEPRECATED', 'FAILED'],
  DEPRECATED: [],
  FAILED: [],
};

@Injectable()
export class FlowLifecycleManagerService {
  private readonly logger = new Logger(FlowLifecycleManagerService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional()
    @Inject(RETROSPECTIVE_SERVICE)
    private readonly retrospective?: IRetrospectiveRunner,
  ) {}

  // ─── getStatus ─────────────────────────────────────────────────────────────

  async getStatus(flowId: string): Promise<DataProcessResult<FlowLifecycleRecord | null>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const result = await this.db.getDocument(LIFECYCLE_INDEX, flowId);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success(null);
    }
    return DataProcessResult.success(result.data as unknown as FlowLifecycleRecord);
  }

  // ─── canTransition ─────────────────────────────────────────────────────────

  canTransition(from: LifecycleStatus, to: LifecycleStatus): boolean {
    return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
  }

  // ─── transitionStatus ──────────────────────────────────────────────────────

  async transitionStatus(
    flowId: string,
    toStatus: LifecycleStatus,
    options?: { transitionedBy?: string; reason?: string },
  ): Promise<DataProcessResult<FlowLifecycleRecord>> {
    if (!flowId || !toStatus) {
      return DataProcessResult.failure('MISSING_PARAMS', 'flowId and toStatus are required');
    }

    const now = new Date().toISOString();
    const by = options?.transitionedBy ?? 'system';

    // Load existing record or default to PENDING
    const existing = await this.db.getDocument(LIFECYCLE_INDEX, flowId);
    const currentRecord =
      existing.isSuccess && existing.data
        ? (existing.data as unknown as FlowLifecycleRecord)
        : null;
    const fromStatus: LifecycleStatus = currentRecord?.status ?? 'PENDING';

    // Validate transition
    if (!this.canTransition(fromStatus, toStatus)) {
      return DataProcessResult.failure(
        'INVALID_TRANSITION',
        `Cannot transition from ${fromStatus} to ${toStatus}`,
      );
    }

    // DNA-8: write audit entry BEFORE updating status
    const auditEntry: LifecycleAuditEntry = {
      auditId: `${flowId}::${now}`,
      flowId,
      fromStatus,
      toStatus,
      transitionedBy: by,
      reason: options?.reason,
      timestamp: now,
    };
    await this.db.storeDocument(
      AUDIT_INDEX,
      auditEntry as unknown as Record<string, unknown>,
      auditEntry.auditId,
    );

    // Update lifecycle record
    const updated: FlowLifecycleRecord = {
      flowId,
      status: toStatus,
      createdAt: currentRecord?.createdAt ?? now,
      updatedAt: now,
      updatedBy: by,
    };
    await this.db.storeDocument(
      LIFECYCLE_INDEX,
      updated as unknown as Record<string, unknown>,
      flowId,
    );

    this.logger.log(`Flow ${flowId}: ${fromStatus} → ${toStatus} by ${by}`);

    // RC-G (FLOW-03 GAP-SIM-F-G9): trigger retrospective on PENDING → ACTIVE transition.
    // Best-effort — failure does NOT block the lifecycle update (DNA-3).
    if (toStatus === 'ACTIVE' && this.retrospective) {
      try {
        const r1 = await this.retrospective.runR1(flowId);
        await this.db.storeDocument(
          ES_INDEX.FLOW_LIFECYCLE,
          {
            flowId,
            eventType: 'RETROSPECTIVE_R1',
            calibration: r1.calibration,
            clearToProceed: r1.clearToProceed,
            promotionResults: r1.promotionResults,
            recordedAt: now,
          } as Record<string, unknown>,
          `${flowId}::retrospective-r1::${now}`,
        );
        this.logger.log(
          `Flow ${flowId}: retrospective R1 stored (clearToProceed=${r1.clearToProceed})`,
        );
      } catch (err) {
        this.logger.warn(
          `Flow ${flowId}: retrospective R1 failed (non-blocking): ${(err as Error).message}`,
        );
      }
    }

    return DataProcessResult.success(updated);
  }

  // ─── getAuditTrail ─────────────────────────────────────────────────────────

  async getAuditTrail(flowId: string): Promise<DataProcessResult<LifecycleAuditEntry[]>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const result = await this.db.searchDocuments(AUDIT_INDEX, { flowId }, 100);
    if (!result.isSuccess) {
      return DataProcessResult.success([]);
    }
    const entries = ((result.data ?? []) as unknown as LifecycleAuditEntry[]).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    return DataProcessResult.success(entries);
  }
}
