/**
 * ContentCacheWarmer (T107) — FLOW-06 Phase 1C (Branch B)
 * Single responsibility: best-effort cache warming — degradable processing.
 *
 * Iron rules:
 *   Entire handler body in try/catch — returns DataProcessResult.success even on error.
 *   NOT OBSERVABILITY — degradable PROCESSING.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

const CACHE_INDEX = 'xiigen-content-cache';

export interface ContentCacheWarmerInput {
  userId: string;
  groupId: string;
  tenantId: string;
  contentIds: string[];
}

export interface CacheWarmResult {
  warmed: number;
  degraded: boolean;
  reason?: string;
}

export class ContentCacheWarmer {
  constructor(private readonly db: IDatabaseService) {}

  async warm(input: ContentCacheWarmerInput): Promise<DataProcessResult<CacheWarmResult>> {
    try {
      if (!input.contentIds || input.contentIds.length === 0) {
        return DataProcessResult.success({ warmed: 0, degraded: false });
      }

      let warmed = 0;
      let degraded = false;
      let reason: string | undefined;

      try {
        const now = new Date().toISOString();
        for (const contentId of input.contentIds) {
          const cacheDoc: Record<string, unknown> = {
            cache_key: `${input.userId}:${input.groupId}:${contentId}`,
            content_id: contentId,
            user_id: input.userId,
            group_id: input.groupId,
            tenant_id: input.tenantId,
            cached_at: now,
          };
          const result = await this.db.storeDocument(CACHE_INDEX, cacheDoc);
          if (result.isSuccess) {
            warmed++;
          }
        }
      } catch (innerErr) {
        degraded = true;
        reason = String(innerErr);
      }

      return DataProcessResult.success({ warmed, degraded, reason });
    } catch (_err) {
      // Best-effort: always return success even if outer wrapper fails
      return DataProcessResult.success({ warmed: 0, degraded: true, reason: String(_err) });
    }
  }
}
