/**
 * AccessControlUpdater (T117) — FLOW-06 Phase 1F (Tier Change Subflows)
 * Single responsibility: atomic tier swap on access control record.
 *
 * Iron rules:
 *   Conditional update WHERE current_tier=oldTier — NOT SETNX (DR-06-E).
 *   Atomic swap — no window where both old and new access coexist.
 *   DNA-8: storeDocument BEFORE TierChanged emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const ACCESS_CONTROL_INDEX = 'xiigen-access-controls';

export interface AccessControlUpdaterInput {
  userId: string;
  groupId: string;
  newTier: string;
  oldTier: string;
  newAccessLevels: string[];
  tenantId: string;
}

export interface AccessControlUpdateResult {
  accessControlId: string;
  updated: boolean;
  skipped: boolean;
}

export class AccessControlUpdater {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async update(
    input: AccessControlUpdaterInput,
  ): Promise<DataProcessResult<AccessControlUpdateResult>> {
    try {
      const accessControlId = `ac-${input.userId}-${input.groupId}`;

      // ── Fetch existing record ─────────────────────────────────────────────
      const existing = await this.db.searchDocuments(ACCESS_CONTROL_INDEX, {
        access_control_id: accessControlId,
      });

      if (!existing.isSuccess || (existing.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'ACCESS_CONTROL_NOT_FOUND',
          `Access control record not found for user ${input.userId} in group ${input.groupId}`,
        );
      }

      const existingRec = existing.data![0] as Record<string, unknown>;
      const currentTier = existingRec['assigned_tier'] as string;

      // ── Conditional update: only proceed if current tier matches oldTier ──
      if (currentTier !== input.oldTier) {
        // Already updated — idempotent skip
        return DataProcessResult.success({
          accessControlId,
          updated: false,
          skipped: true,
        });
      }

      const now = new Date().toISOString();
      const updatedDoc: Record<string, unknown> = {
        ...existingRec,
        assigned_tier: input.newTier,
        access_levels: input.newAccessLevels,
        updated_at: now,
        previous_tier: input.oldTier,
      };

      // DNA-8: storeDocument BEFORE TierChanged emit ─────────────────────────
      const stored = await this.db.storeDocument(ACCESS_CONTROL_INDEX, updatedDoc, accessControlId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queue.enqueue('TierChanged', {
        accessControlId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        newTier: input.newTier,
        oldTier: input.oldTier,
        newAccessLevels: input.newAccessLevels,
      });

      return DataProcessResult.success({
        accessControlId,
        updated: true,
        skipped: false,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'ACCESS_CONTROL_UPDATER_ERROR',
        `AccessControlUpdater threw: ${String(err)}`,
      );
    }
  }
}
