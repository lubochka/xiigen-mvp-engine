/**
 * GroupContentProfiler (T104) — FLOW-06 Phase 1C (Branch B)
 * Single responsibility: build content profile for feed seeding — no heavy content fetching.
 *
 * Iron rules:
 *   Triggers on MembershipActivated (event-driven) — NOT on MemberJoinRequested.
 *   Produces content profile: { contentTypes: string[]; dateRange: { from: string; to: string } }.
 *   No heavy content fetching — profile only.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

const GROUPS_INDEX = 'xiigen-groups';

export interface GroupContentProfilerInput {
  groupId: string;
  userId: string;
  tenantId: string;
}

export interface ContentProfile {
  contentTypes: string[];
  dateRange: { from: string; to: string };
}

export class GroupContentProfiler {
  constructor(private readonly db: IDatabaseService) {}

  async buildProfile(input: GroupContentProfilerInput): Promise<DataProcessResult<ContentProfile>> {
    try {
      // ── Fetch group metadata for content type hints ───────────────────────
      const groupResult = await this.db.searchDocuments(GROUPS_INDEX, {
        group_id: input.groupId,
      });

      const group =
        groupResult.isSuccess && (groupResult.data ?? []).length > 0
          ? (groupResult.data![0] as Record<string, unknown>)
          : ({} as Record<string, unknown>);

      const contentTypes: string[] = Array.isArray(group['content_types'])
        ? (group['content_types'] as string[])
        : ['post', 'article', 'discussion'];

      // ── Date range: last 30 days to now ──────────────────────────────────
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = now.toISOString();

      return DataProcessResult.success({
        contentTypes,
        dateRange: { from, to },
      });
    } catch (err) {
      return DataProcessResult.failure(
        'GROUP_CONTENT_PROFILER_ERROR',
        `GroupContentProfiler threw: ${String(err)}`,
      );
    }
  }
}
