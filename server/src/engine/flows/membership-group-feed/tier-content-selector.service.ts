/**
 * TierContentSelector (T105) — FLOW-06 Phase 1C (Branch B)
 * Single responsibility: select tier-appropriate content for feed seeding.
 *
 * Iron rules:
 *   content_access_level filter applied at query layer via BuildSearchFilter — NEVER post-filter.
 *   accessLevels[] is a REQUIRED input parameter.
 *   MACHINE ceiling: 50 posts max per seeding operation.
 *   Cursor-based pagination.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { ContentProfile } from './group-content-profiler.service';

const CONTENT_INDEX = 'xiigen-group-content';
const MAX_POSTS = 50;

export interface TierContentSelectorInput {
  groupId: string;
  accessLevels: string[];
  profile: ContentProfile;
  tenantId: string;
  cursor?: string;
}

export interface SelectedContent {
  items: Array<Record<string, unknown>>;
  nextCursor: string | null;
  total: number;
}

export class TierContentSelector {
  constructor(private readonly db: IDatabaseService) {}

  async select(input: TierContentSelectorInput): Promise<DataProcessResult<SelectedContent>> {
    try {
      // ── Filter applied at query layer (BuildSearchFilter) — no post-filter ──
      const contentResult = await this.db.searchDocuments(
        CONTENT_INDEX,
        {
          group_id: input.groupId,
          content_access_level: input.accessLevels,
          created_after: input.profile.dateRange.from,
          created_before: input.profile.dateRange.to,
          cursor: input.cursor ?? undefined,
        },
        MAX_POSTS,
      );

      if (!contentResult.isSuccess) {
        return DataProcessResult.failure(contentResult.errorCode!, contentResult.errorMessage!);
      }

      const items = (contentResult.data ?? []).slice(0, MAX_POSTS);
      const nextCursor =
        items.length === MAX_POSTS
          ? (((items[items.length - 1] as Record<string, unknown>)['content_id'] as string) ?? null)
          : null;

      return DataProcessResult.success({
        items,
        nextCursor,
        total: items.length,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'TIER_CONTENT_SELECTOR_ERROR',
        `TierContentSelector threw: ${String(err)}`,
      );
    }
  }
}
