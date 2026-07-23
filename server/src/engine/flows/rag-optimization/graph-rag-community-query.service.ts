/**
 * GraphRAGCommunityQuery — T443 RETRIEVAL service for FLOW-29.
 *
 * Community-level graph RAG query via IRagService.
 * Expands query across related community summaries.
 * Empty results are valid success — no community overlap is normal.
 *
 * Iron rules:
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   DEPTH:   Query expansion depth from FREEDOM config
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IRagService } from '../../../fabrics/interfaces/rag.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface CommunityResult {
  readonly communityId: string;
  readonly relevanceScore: number;
  readonly summaryExcerpt: string;
  readonly source_type: 'graph';
}

export interface GraphCommunityQueryResult {
  readonly queryId: string;
  readonly communities: CommunityResult[];
  readonly totalFound: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const QUERY_INDEX = 'flow29-graph-community-queries';
const QUERY_EVENT = 'retrieval.graph.community.completed';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class GraphRAGCommunityQuery {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly rag: IRagService,
  ) {}

  async query(
    sessionId: string,
    tenantId: string,
    queryText: string,
    communityFilter: Record<string, unknown> = {},
  ): Promise<DataProcessResult<GraphCommunityQueryResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!queryText || queryText.trim() === '') {
      return DataProcessResult.failure('MISSING_QUERY_TEXT', 'queryText is required');
    }

    const ragResult = await this.rag.search(queryText, {
      filters: { ...communityFilter, level: 'community' },
    });
    const rawResults = ragResult.isSuccess ? (ragResult.data ?? []) : [];

    const communities: CommunityResult[] = rawResults.map((raw) => ({
      communityId: String(raw['community_id'] ?? raw['id'] ?? 'unknown'),
      relevanceScore: Number(raw['score'] ?? 0),
      summaryExcerpt: String(raw['summary'] ?? raw['content'] ?? ''),
      source_type: 'graph' as const,
    }));

    const queryId = `gcq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queriedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      query_id: queryId,
      session_id: sessionId,
      tenant_id: tenantId,
      total_found: communities.length,
      queried_at: queriedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(QUERY_INDEX, doc, queryId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store community query record',
      );
    }

    await this.queue.enqueue(QUERY_EVENT, {
      query_id: queryId,
      session_id: sessionId,
      tenant_id: tenantId,
      total_found: communities.length,
      queried_at: queriedAt,
    });

    return DataProcessResult.success({ queryId, communities, totalFound: communities.length });
  }
}
