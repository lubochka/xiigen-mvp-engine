/**
 * MembershipAnalyticsTracker (T111) — FLOW-06 Phase 1D (Branch C)
 * Single responsibility: OBSERVABILITY — track membership analytics best-effort.
 *
 * Iron rules:
 *   OBSERVABILITY — entire handler in try/catch, returns success on error.
 *   NOT in GroupMembershipCompleted gate.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

const ANALYTICS_INDEX = 'xiigen-membership-analytics';

export interface MembershipAnalyticsTrackerInput {
  userId: string;
  groupId: string;
  tenantId: string;
  event: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsTrackResult {
  tracked: boolean;
  degraded: boolean;
}

export class MembershipAnalyticsTracker {
  constructor(private readonly db: IDatabaseService) {}

  async track(
    input: MembershipAnalyticsTrackerInput,
  ): Promise<DataProcessResult<AnalyticsTrackResult>> {
    try {
      const analyticsId = `analytics-${input.userId}-${input.groupId}-${Date.now()}`;
      const now = new Date().toISOString();

      const doc: Record<string, unknown> = {
        analytics_id: analyticsId,
        user_id: input.userId,
        group_id: input.groupId,
        tenant_id: input.tenantId,
        event: input.event,
        metadata: input.metadata ?? {},
        tracked_at: now,
      };

      try {
        await this.db.storeDocument(ANALYTICS_INDEX, doc, analyticsId);
        return DataProcessResult.success({ tracked: true, degraded: false });
      } catch (_innerErr) {
        return DataProcessResult.success({ tracked: false, degraded: true });
      }
    } catch (_err) {
      // OBSERVABILITY: always return success
      return DataProcessResult.success({ tracked: false, degraded: true });
    }
  }
}
