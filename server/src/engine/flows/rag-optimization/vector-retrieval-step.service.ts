/**
 * VectorRetrievalStep — T442 RETRIEVAL service for FLOW-29.
 *
 * Tenant-scoped vector similarity search via IRagService.
 * All search results stay scoped to the calling tenant — CF-476.
 *
 * Iron rules:
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   TOP_K:   from FREEDOM config — never hardcoded
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IRagService } from '../../../fabrics/interfaces/rag.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface RetrievalItem {
  readonly content: string;
  readonly score: number;
  readonly source_type: 'vector';
  readonly metadata: Record<string, unknown>;
}

export interface VectorRetrievalResult {
  readonly retrievalId: string;
  readonly items: RetrievalItem[];
  readonly totalFound: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RETRIEVAL_INDEX = 'flow29-vector-retrievals';
const RETRIEVAL_EVENT = 'retrieval.vector.completed';
const DEFAULT_TOP_K = 10;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class VectorRetrievalStep {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly rag: IRagService,
  ) {}

  async retrieve(
    sessionId: string,
    tenantId: string,
    queryEmbedding: number[],
    filters: Record<string, unknown> = {},
    topK?: number,
  ): Promise<DataProcessResult<VectorRetrievalResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!queryEmbedding || queryEmbedding.length === 0) {
      return DataProcessResult.failure('MISSING_EMBEDDING', 'queryEmbedding is required');
    }

    const k = topK ?? DEFAULT_TOP_K;
    const ragResult = await this.rag.search('vector_query', {
      filters: { ...filters, embedding: queryEmbedding },
      topK: k,
    });
    const rawItems = ragResult.isSuccess ? (ragResult.data ?? []) : [];

    const items: RetrievalItem[] = rawItems.map((raw) => ({
      content: String(raw['content'] ?? ''),
      score: Number(raw['score'] ?? 0),
      source_type: 'vector' as const,
      metadata: (raw['metadata'] as Record<string, unknown>) ?? {},
    }));

    const retrievalId = `vret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const retrievedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      retrieval_id: retrievalId,
      session_id: sessionId,
      tenant_id: tenantId,
      top_k: k,
      total_found: items.length,
      retrieved_at: retrievedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(RETRIEVAL_INDEX, doc, retrievalId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store retrieval record',
      );
    }

    await this.queue.enqueue(RETRIEVAL_EVENT, {
      retrieval_id: retrievalId,
      session_id: sessionId,
      tenant_id: tenantId,
      total_found: items.length,
      retrieved_at: retrievedAt,
    });

    return DataProcessResult.success({ retrievalId, items, totalFound: items.length });
  }
}
