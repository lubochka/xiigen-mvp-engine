/**
 * DecisionAuditTrail — T385 GOVERNANCE service for FLOW-25.
 *
 * Insert-only audit log of every arbitration decision.
 * FORCE_PROCEED decisions get a dual log entry (standard + elevated-risk). (CF-498)
 *
 * Iron rules (enforced — not configurable):
 *   CF-498:  FORCE_PROCEED always creates two audit entries — standard + elevated-risk
 *   CF-476:  tenantId required on all operations — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   IMMUTABLE: NO update or delete methods exist on this service
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DecisionOption } from './impact-report-generator.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  readonly entryId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly decision: DecisionOption;
  readonly actorId: string;
  readonly elevatedRisk: boolean;
  readonly metadata: Record<string, unknown>;
  readonly recordedAt: string;
}

export interface AuditLogResult {
  readonly entries: AuditEntry[];
  /** Two entries when decision=FORCE_PROCEED (CF-498); one entry otherwise. */
  readonly entryCount: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const AUDIT_INDEX = 'bfa-decision-audit';
const AUDIT_EVENT = 'audit.entry.recorded';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DecisionAuditTrail extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T385',
        serviceName: 'DecisionAuditTrail',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Record an audit entry for the given arbitration decision.
   *
   * CF-498: FORCE_PROCEED → dual log (standard + elevated-risk entries).
   * DNA-8: storeDocument() BEFORE enqueue().
   * IMMUTABLE: this service has no update or delete methods.
   */
  async logEntry(
    sessionId: string,
    tenantId: string,
    decision: DecisionOption,
    actorId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<DataProcessResult<AuditLogResult>> {
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!actorId || actorId.trim() === '') {
      return DataProcessResult.failure('MISSING_ACTOR_ID', 'actorId is required');
    }

    const now = new Date().toISOString();
    const entries: AuditEntry[] = [];

    // Standard entry — always created
    const standardResult = await this.writeEntry(
      sessionId,
      tenantId,
      decision,
      actorId,
      false,
      metadata,
      now,
    );
    if (!standardResult.isSuccess) {
      return DataProcessResult.failure(
        standardResult.errorCode ?? 'STORAGE_FAILED',
        standardResult.errorMessage ?? 'Failed to write standard audit entry',
      );
    }
    entries.push(standardResult.data!);

    // CF-498: FORCE_PROCEED → second elevated-risk entry
    if (decision === DecisionOption.FORCE_PROCEED) {
      const elevatedResult = await this.writeEntry(
        sessionId,
        tenantId,
        decision,
        actorId,
        true,
        { ...metadata, elevated_reason: 'CF-498: FORCE_PROCEED governance override' },
        now,
      );
      if (!elevatedResult.isSuccess) {
        return DataProcessResult.failure(
          elevatedResult.errorCode ?? 'STORAGE_FAILED',
          elevatedResult.errorMessage ?? 'Failed to write elevated-risk audit entry',
        );
      }
      entries.push(elevatedResult.data!);
    }

    return DataProcessResult.success({ entries, entryCount: entries.length });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async writeEntry(
    sessionId: string,
    tenantId: string,
    decision: DecisionOption,
    actorId: string,
    elevatedRisk: boolean,
    metadata: Record<string, unknown>,
    recordedAt: string,
  ): Promise<DataProcessResult<AuditEntry>> {
    const entryId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${elevatedRisk ? 'elev' : 'std'}`;
    const doc: Record<string, unknown> = {
      entry_id: entryId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      actor_id: actorId,
      elevated_risk: elevatedRisk,
      metadata,
      recorded_at: recordedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(AUDIT_INDEX, doc, entryId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store audit entry',
      );
    }

    await this.queueService.enqueue(AUDIT_EVENT, {
      entry_id: entryId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      actor_id: actorId,
      elevated_risk: elevatedRisk,
      recorded_at: recordedAt,
    });

    return DataProcessResult.success({
      entryId,
      sessionId,
      tenantId,
      decision,
      actorId,
      elevatedRisk,
      metadata,
      recordedAt,
    });
  }
}
