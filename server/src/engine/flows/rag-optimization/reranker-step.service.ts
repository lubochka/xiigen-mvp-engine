/**
 * RerankerStep — T458 RETRIEVAL service for FLOW-29.
 *
 * Reranks retrieval results by relevance using IAiProvider cross-encoder scoring.
 * CF-606: Input MUST accept items with { content, score, source_type } —
 *         the same shape as HybridRetrievalFusion output.
 *
 * Iron rules:
 *   CF-606:  Input shape { content, score, source_type } — same as HybridRetrievalFusion
 *   TOP_N:   top_n after reranking from FREEDOM config — never hardcoded
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   AI:      Cross-encoder via IAiProvider — never import model SDK
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IAiProvider } from '../../../fabrics/interfaces/ai-provider.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

/** CF-606: same input shape as HybridRetrievalFusion output items. */
export interface RerankerInput {
  readonly content: string;
  readonly score: number;
  readonly source_type: string;
}

export interface RerankedItem extends RerankerInput {
  readonly rerank_score: number;
  readonly original_rank: number;
}

export interface RerankerResult {
  readonly rerankId: string;
  readonly items: RerankedItem[];
  readonly totalReranked: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RERANK_INDEX = 'flow29-reranks';
const DEFAULT_TOP_N = 5;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RerankerStep {
  constructor(
    private readonly db: IDatabaseService,
    private readonly ai: IAiProvider,
  ) {}

  /**
   * Rerank items by cross-encoder relevance score.
   *
   * CF-606: accepts { content, score, source_type } from HybridRetrievalFusion.
   * Empty input returns empty result — not an error.
   */
  async rerank(
    tenantId: string,
    queryText: string,
    items: RerankerInput[],
    topN: number = DEFAULT_TOP_N,
  ): Promise<DataProcessResult<RerankerResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!queryText || queryText.trim() === '') {
      return DataProcessResult.failure('MISSING_QUERY_TEXT', 'queryText is required');
    }

    if (!items || items.length === 0) {
      const rerankId = `rerank-${Date.now()}-empty`;
      await this.db.storeDocument(
        RERANK_INDEX,
        {
          rerank_id: rerankId,
          tenant_id: tenantId,
          total_reranked: 0,
          reranked_at: new Date().toISOString(),
        },
        rerankId,
      );
      return DataProcessResult.success({ rerankId, items: [], totalReranked: 0 });
    }

    // Score each item via AI cross-encoder
    const scored: RerankedItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const crossEncoderPrompt = `CROSS_ENCODER_SCORE\nQuery: ${queryText}\nDocument: ${item.content}\nReturn JSON: {"score": <0.0-1.0>}`;
      const scoreResult = await this.ai.generate(crossEncoderPrompt, {
        systemPrompt: 'You are a cross-encoder relevance scorer. Return only valid JSON.',
      });

      const rerank_score = scoreResult.isSuccess
        ? Number(scoreResult.data?.['score'] ?? item.score)
        : item.score;

      scored.push({
        ...item,
        rerank_score,
        original_rank: i + 1,
      });
    }

    // Sort by rerank_score descending, take top_n
    scored.sort((a, b) => b.rerank_score - a.rerank_score);
    const topItems = scored.slice(0, topN);

    const rerankId = `rerank-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const stored = await this.db.storeDocument(
      RERANK_INDEX,
      {
        rerank_id: rerankId,
        tenant_id: tenantId,
        total_reranked: topItems.length,
        reranked_at: new Date().toISOString(),
      },
      rerankId,
    );
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store rerank record',
      );
    }

    return DataProcessResult.success({ rerankId, items: topItems, totalReranked: topItems.length });
  }
}
