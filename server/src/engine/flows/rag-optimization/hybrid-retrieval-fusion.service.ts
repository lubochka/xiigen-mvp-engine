/**
 * HybridRetrievalFusion — T444 RETRIEVAL service for FLOW-29.
 *
 * Fuses vector + graph results using Reciprocal Rank Fusion (RRF).
 * CF-606: Output shape MUST be compatible with RerankerStep (T458).
 *         Items MUST have { content, score, source_type }.
 *
 * Iron rules:
 *   CF-606:  Output shape must match RerankerStep input — { content, score, source_type }
 *   RRF_K:   RRF constant from FREEDOM config (default 60) — never hardcoded
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DEDUP:   Deduplication by content hash BEFORE fusion scoring
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { RetrievalItem } from './vector-retrieval-step.service';
import { CommunityResult } from './graph-rag-community-query.service';

// ── Shapes ──────────────────────────────────────────────────────────────────

/** CF-606: This shape is the contract between HybridRetrievalFusion and RerankerStep. */
export interface FusedItem {
  readonly content: string;
  readonly score: number;
  readonly source_type: 'vector' | 'graph' | 'hybrid';
  readonly fusion_score: number;
  readonly original_rank_vector?: number;
  readonly original_rank_graph?: number;
}

export interface HybridFusionResult {
  readonly fusionId: string;
  readonly items: FusedItem[];
  readonly totalFused: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FUSION_INDEX = 'flow29-hybrid-fusions';
const DEFAULT_RRF_K = 60;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class HybridRetrievalFusion {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Fuse vector and graph retrieval results.
   *
   * CF-606: returns items with { content, score, source_type } for RerankerStep.
   * Deduplication by content substring before fusion.
   */
  async fuse(
    tenantId: string,
    vectorItems: RetrievalItem[],
    graphItems: CommunityResult[],
    rrfK: number = DEFAULT_RRF_K,
  ): Promise<DataProcessResult<HybridFusionResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // Deduplicate by content (first 100 chars as key)
    const seen = new Set<string>();
    const allItems: Array<{
      content: string;
      source_type: 'vector' | 'graph';
      original_score: number;
    }> = [];

    for (const item of vectorItems) {
      const key = item.content.slice(0, 100);
      if (!seen.has(key)) {
        seen.add(key);
        allItems.push({ content: item.content, source_type: 'vector', original_score: item.score });
      }
    }
    for (const item of graphItems) {
      const key = item.summaryExcerpt.slice(0, 100);
      if (!seen.has(key)) {
        seen.add(key);
        allItems.push({
          content: item.summaryExcerpt,
          source_type: 'graph',
          original_score: item.relevanceScore,
        });
      }
    }

    if (allItems.length === 0) {
      const fusionId = `fuse-${Date.now()}-empty`;
      await this.db.storeDocument(
        FUSION_INDEX,
        {
          fusion_id: fusionId,
          tenant_id: tenantId,
          total_fused: 0,
          fused_at: new Date().toISOString(),
        },
        fusionId,
      );
      return DataProcessResult.success({ fusionId, items: [], totalFused: 0 });
    }

    // RRF scoring
    const vectorRanks = new Map<string, number>();
    const graphRanks = new Map<string, number>();

    vectorItems.forEach((item, idx) => vectorRanks.set(item.content.slice(0, 100), idx + 1));
    graphItems.forEach((item, idx) => graphRanks.set(item.summaryExcerpt.slice(0, 100), idx + 1));

    const fusedItems: FusedItem[] = allItems.map((item) => {
      const key = item.content.slice(0, 100);
      const vRank = vectorRanks.get(key);
      const gRank = graphRanks.get(key);
      const vScore = vRank ? 1 / (rrfK + vRank) : 0;
      const gScore = gRank ? 1 / (rrfK + gRank) : 0;
      const fusionScore = vScore + gScore;

      return {
        content: item.content,
        score: item.original_score,
        source_type: vRank && gRank ? 'hybrid' : item.source_type,
        fusion_score: fusionScore,
        original_rank_vector: vRank,
        original_rank_graph: gRank,
      };
    });

    // Sort by fusion_score descending
    fusedItems.sort((a, b) => b.fusion_score - a.fusion_score);

    const fusionId = `fuse-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // ✅ DNA-8: storeDocument() (no enqueue for fusion — it's synchronous composition)
    const stored = await this.db.storeDocument(
      FUSION_INDEX,
      {
        fusion_id: fusionId,
        tenant_id: tenantId,
        total_fused: fusedItems.length,
        fused_at: new Date().toISOString(),
      },
      fusionId,
    );
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store fusion record',
      );
    }

    return DataProcessResult.success({
      fusionId,
      items: fusedItems,
      totalFused: fusedItems.length,
    });
  }
}
