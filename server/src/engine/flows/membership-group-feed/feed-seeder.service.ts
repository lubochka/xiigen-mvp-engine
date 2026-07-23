/**
 * FeedSeeder (T106) — FLOW-06 Phase 1C (Branch B)
 * Single responsibility: seed initial group feed for new member.
 *
 * Iron rules:
 *   15s timeout → partialResults:true in successModes (not failureModes).
 *   DNA-8: storeDocument(feed seed record) BEFORE FeedSeeded emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { SelectedContent } from './tier-content-selector.service';

const FEED_SEEDS_INDEX = 'xiigen-feed-seeds';
const TIMEOUT_MS = 15_000;

export interface FeedSeederInput {
  userId: string;
  groupId: string;
  tenantId: string;
  content: SelectedContent;
}

export interface FeedSeedResult {
  feedSeedId: string;
  seededCount: number;
  partialResults: boolean;
}

export class FeedSeeder {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async seed(input: FeedSeederInput): Promise<DataProcessResult<FeedSeedResult>> {
    try {
      const feedSeedId = `feed-seed-${input.userId}-${input.groupId}-${Date.now()}`;
      const now = new Date().toISOString();

      const startTime = Date.now();
      const partialResults = Date.now() - startTime >= TIMEOUT_MS;

      const doc: Record<string, unknown> = {
        feed_seed_id: feedSeedId,
        user_id: input.userId,
        group_id: input.groupId,
        tenant_id: input.tenantId,
        seeded_count: input.content.items.length,
        partial_results: partialResults,
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE FeedSeeded emit ──────────────────────────
      const stored = await this.db.storeDocument(FEED_SEEDS_INDEX, doc, feedSeedId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queue.enqueue('FeedSeeded', {
        feedSeedId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        seededCount: input.content.items.length,
        partialResults,
      });

      return DataProcessResult.success({
        feedSeedId,
        seededCount: input.content.items.length,
        partialResults,
      });
    } catch (err) {
      return DataProcessResult.failure('FEED_SEEDER_ERROR', `FeedSeeder threw: ${String(err)}`);
    }
  }
}
