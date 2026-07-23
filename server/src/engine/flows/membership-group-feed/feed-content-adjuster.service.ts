/**
 * FeedContentAdjuster (T118) — FLOW-06 Phase 1F (Tier Change Subflows)
 * Single responsibility: adjust feed content on tier upgrade or downgrade.
 *
 * Iron rules:
 *   DOWNGRADE: remove items WHERE content_access_level NOT IN newAccessLevels[] — query layer.
 *   UPGRADE: cursor-bounded seeding for newly accessible tiers (50 max, same as T106).
 *   Partial removal failure: try/catch per entry, log and continue (not abort).
 *   DNA-8: storeDocument before FeedContentAdjusted emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const FEED_ENTRIES_INDEX = 'xiigen-feed-entries';
const CONTENT_INDEX = 'xiigen-group-content';
const FEED_ADJUST_INDEX = 'xiigen-feed-adjustments';
const MAX_UPGRADE_POSTS = 50;

export interface FeedContentAdjusterInput {
  userId: string;
  groupId: string;
  tenantId: string;
  newTier: string;
  oldTier: string;
  newAccessLevels: string[];
  oldAccessLevels: string[];
  isUpgrade: boolean;
}

export interface FeedAdjustResult {
  adjustmentId: string;
  removedCount: number;
  addedCount: number;
  partialFailures: number;
}

export class FeedContentAdjuster {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async adjust(input: FeedContentAdjusterInput): Promise<DataProcessResult<FeedAdjustResult>> {
    try {
      const adjustmentId = `fadj-${input.userId}-${input.groupId}-${Date.now()}`;
      const now = new Date().toISOString();
      let removedCount = 0;
      let addedCount = 0;
      let partialFailures = 0;

      if (!input.isUpgrade) {
        // ── DOWNGRADE: remove items not in newAccessLevels (query layer filter) ──
        const removeResult = await this.db.searchDocuments(FEED_ENTRIES_INDEX, {
          user_id: input.userId,
          group_id: input.groupId,
          content_access_level_not_in: input.newAccessLevels,
        });

        const toRemove = removeResult.isSuccess ? (removeResult.data ?? []) : [];
        for (const entry of toRemove) {
          try {
            const entryId = (entry as Record<string, unknown>)['feed_entry_id'] as string;
            const removedDoc: Record<string, unknown> = {
              ...(entry as Record<string, unknown>),
              status: 'REMOVED',
              removed_at: now,
            };
            await this.db.storeDocument(FEED_ENTRIES_INDEX, removedDoc, entryId);
            removedCount++;
          } catch (_entryErr) {
            // partial failure: log and continue
            partialFailures++;
          }
        }
      } else {
        // ── UPGRADE: seed newly accessible content (bounded at 50 max) ───────
        const newResult = await this.db.searchDocuments(
          CONTENT_INDEX,
          {
            group_id: input.groupId,
            content_access_level: input.newAccessLevels,
          },
          MAX_UPGRADE_POSTS,
        );

        const newContent = newResult.isSuccess
          ? (newResult.data ?? []).slice(0, MAX_UPGRADE_POSTS)
          : [];

        for (const content of newContent) {
          try {
            const contentId = (content as Record<string, unknown>)['content_id'] as string;
            const feedEntryId = `fe-${input.userId}-${contentId}`;
            const feedEntry: Record<string, unknown> = {
              feed_entry_id: feedEntryId,
              user_id: input.userId,
              group_id: input.groupId,
              content_id: contentId,
              tenant_id: input.tenantId,
              content_access_level: (content as Record<string, unknown>)['content_access_level'],
              status: 'ACTIVE',
              knowledge_scope: 'PRIVATE',
              connection_type: 'FLOW_SCOPED',
              added_at: now,
            };
            await this.db.storeDocument(FEED_ENTRIES_INDEX, feedEntry, feedEntryId);
            addedCount++;
          } catch (_entryErr) {
            partialFailures++;
          }
        }
      }

      // ── Record adjustment ────────────────────────────────────────────────
      const adjustDoc: Record<string, unknown> = {
        adjustment_id: adjustmentId,
        user_id: input.userId,
        group_id: input.groupId,
        tenant_id: input.tenantId,
        new_tier: input.newTier,
        old_tier: input.oldTier,
        removed_count: removedCount,
        added_count: addedCount,
        partial_failures: partialFailures,
        is_upgrade: input.isUpgrade,
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE FeedContentAdjusted emit ─────────────────
      const stored = await this.db.storeDocument(FEED_ADJUST_INDEX, adjustDoc, adjustmentId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queue.enqueue('FeedContentAdjusted', {
        adjustmentId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        newTier: input.newTier,
        oldTier: input.oldTier,
        removedCount,
        addedCount,
        isUpgrade: input.isUpgrade,
      });

      return DataProcessResult.success({
        adjustmentId,
        removedCount,
        addedCount,
        partialFailures,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'FEED_CONTENT_ADJUSTER_ERROR',
        `FeedContentAdjuster threw: ${String(err)}`,
      );
    }
  }
}
