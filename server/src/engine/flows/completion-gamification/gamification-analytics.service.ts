/**
 * GamificationAnalytics (T97) — FLOW-05 Phase 1E
 * Single responsibility: record gamification analytics event.
 *
 * Archetype: OBSERVABILITY — pure store, no emit.
 *
 * Iron rules:
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 *   No HTTP — pure queue consumer (Rule 11).
 *   knowledge_scope: 'PRIVATE' — per-learner record.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const ANALYTICS_INDEX = 'xiigen-gamification-analytics';

export interface GamificationAnalyticsInput {
  ledgerEntryId: string;
  completionId: string;
  userId: string;
  tenantId: string;
  effectiveTotal: number;
  pointBreakdown: Record<string, unknown>;
  streakSnapshot?: Record<string, unknown>;
  processedAt?: string;
}

export interface GamificationAnalyticsResult {
  analyticsRecordId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className GamificationAnalytics
 */
@Injectable()
export class GamificationAnalytics extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T97',
        serviceName: 'GamificationAnalytics',
        flowId: 'FLOW-05',
      }),
    });
  }

  async record(
    input: GamificationAnalyticsInput,
  ): Promise<DataProcessResult<GamificationAnalyticsResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.ledgerEntryId || !input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'GamificationAnalytics: ledgerEntryId, completionId, userId, and tenantId are required',
        );
      }

      const now = input.processedAt ?? new Date().toISOString();
      const analyticsRecordId = `ana-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        analytics_record_id: analyticsRecordId,
        ledger_entry_id: input.ledgerEntryId,
        completion_id: input.completionId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        effective_total: input.effectiveTotal,
        point_breakdown: input.pointBreakdown,
        streak_snapshot: input.streakSnapshot ?? null,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        recorded_at: now,
      };

      const stored = await this.dbFabric.storeDocument(ANALYTICS_INDEX, doc, analyticsRecordId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // T97 is OBSERVABILITY — no queue emit
      return DataProcessResult.success({ analyticsRecordId });
    } catch (err) {
      return DataProcessResult.failure(
        'GAMIFICATION_ANALYTICS_ERROR',
        `GamificationAnalytics threw: ${String(err)}`,
      );
    }
  }
}
