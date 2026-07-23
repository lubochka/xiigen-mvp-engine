/**
 * ElasticsearchGraphRagProvider — IGraphRagService bootstrap implementation.
 *
 * Uses built-in fetch (Node 22+) for all ES HTTP operations — consistent with
 * spec-audit.service.ts and prerequisite-completion-gate.service.ts patterns.
 * No SDK imports — fabric-first.
 *
 * ES index: xiigen-decision-graph
 * Embedding: delegates to IEmbeddingService — never calls embedding API directly.
 *
 * Phase 1 bootstrap: single-hop queries, kNN vector search via ES dense_vector.
 * Phase 2+: multi-hop traversal delegated to LightRAG/Neo4j providers.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService } from '../interfaces/i-graph-rag.service';
import { IEmbeddingService, EMBEDDING_SERVICE } from '../interfaces/i-embedding.service';
import { FreedomConfigManager } from '../../../freedom/config-manager';
import { GraphEdge, GraphQueryResult } from '../interfaces/graph-types';

@Injectable()
export class ElasticsearchGraphRagProvider extends IGraphRagService {
  private readonly logger = new Logger(ElasticsearchGraphRagProvider.name);
  private readonly INDEX = 'xiigen-decision-graph';
  private readonly esUrl: string;

  constructor(
    @Inject(EMBEDDING_SERVICE) private readonly embedding: IEmbeddingService,
    @Optional() private readonly config?: FreedomConfigManager,
  ) {
    super();
    this.esUrl = process.env['ES_URL'] || 'http://localhost:9200';
  }

  async query(params: {
    fromEntity: string;
    relationship?: string;
    toEntity?: string;
    minConfidence?: number;
    limit?: number;
  }): Promise<GraphQueryResult> {
    const must: Record<string, unknown>[] = [{ term: { fromEntity: params.fromEntity } }];
    if (params.relationship) must.push({ term: { relationship: params.relationship } });
    if (params.toEntity) must.push({ term: { toEntity: params.toEntity } });
    if (params.minConfidence !== undefined) {
      must.push({ range: { confidence: { gte: params.minConfidence } } });
    }

    try {
      const res = await fetch(`${this.esUrl}/${this.INDEX}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          size: params.limit ?? 50,
          query: { bool: { must } },
          sort: [{ confidence: 'desc' }],
        }),
      });
      const body = (await res.json()) as Record<string, unknown>;
      const hits =
        ((body['hits'] as Record<string, unknown>)?.['hits'] as Record<string, unknown>[]) ?? [];

      const edges: GraphEdge[] = hits.map((hit) => {
        const src = hit['_source'] as Record<string, unknown>;
        return {
          fromEntity: src['fromEntity'] as string,
          fromType: src['fromType'] as string,
          relationship: src['relationship'] as string,
          toEntity: src['toEntity'] as string,
          toType: src['toType'] as string,
          confidence: (src['confidence'] as number) ?? 0.5,
          observationCount: (src['observationCount'] as number) ?? 0,
          immutable: (src['immutable'] as boolean) ?? false,
          source: src['source'] as string | undefined,
          reasoning: src['reasoning'] as string | undefined,
          metadata: src['metadata'] as Record<string, unknown> | undefined,
        };
      });

      return new GraphQueryResult(edges);
    } catch (err) {
      this.logger.error(`query failed for fromEntity=${params.fromEntity}: ${err}`);
      return new GraphQueryResult([]);
    }
  }

  async upsertEdge(edge: {
    fromEntity: string;
    fromType: string;
    relationship: string;
    toEntity: string;
    toType: string;
    confidence: number;
    source?: string;
    reasoning?: string;
    metadata?: Record<string, unknown>;
    immutable?: boolean;
  }): Promise<void> {
    // Check if edge exists and is immutable
    const existing = await this.query({
      fromEntity: edge.fromEntity,
      relationship: edge.relationship,
      toEntity: edge.toEntity,
    });

    if (existing.edges[0]?.immutable) {
      this.logger.warn(
        `Attempted upsert of immutable edge: ${edge.fromEntity} → ${edge.relationship} → ${edge.toEntity}. Skipping.`,
      );
      return;
    }

    // ⚠️ base64url encoding prevents delimiter collision when entity names contain special chars
    const docId = Buffer.from(`${edge.fromEntity}|${edge.relationship}|${edge.toEntity}`).toString(
      'base64url',
    );

    try {
      await fetch(`${this.esUrl}/${this.INDEX}/_doc/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...edge,
          observationCount: existing.edges[0]?.observationCount ?? 0,
          lastUpdated: new Date().toISOString(),
          immutable: edge.immutable ?? false,
        }),
      });
    } catch (err) {
      this.logger.error(`upsertEdge failed: ${err}`);
    }
  }

  async updateEdgeWeight(params: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    delta: number;
    observationId: string;
  }): Promise<void> {
    const existing = await this.query({
      fromEntity: params.fromEntity,
      relationship: params.relationship,
      toEntity: params.toEntity,
    });

    if (!existing.edges[0]) {
      this.logger.warn(
        `updateEdgeWeight: edge not found — ${params.fromEntity} → ${params.relationship} → ${params.toEntity}`,
      );
      return;
    }

    if (existing.edges[0].immutable) {
      this.logger.warn(`updateEdgeWeight: immutable edge — skipping`);
      return;
    }

    const current = existing.edges[0];
    const newConfidence = Math.max(0, Math.min(1, current.confidence + params.delta));
    const docId = Buffer.from(
      `${params.fromEntity}|${params.relationship}|${params.toEntity}`,
    ).toString('base64url');

    try {
      await fetch(`${this.esUrl}/${this.INDEX}/_update/${docId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc: {
            confidence: newConfidence,
            observationCount: current.observationCount + 1,
            lastUpdated: new Date().toISOString(),
          },
        }),
      });
    } catch (err) {
      this.logger.error(`updateEdgeWeight failed: ${err}`);
    }
  }

  async vectorSearch(params: {
    queryText: string;
    entityType?: string;
    topK?: number;
    minScore?: number;
  }): Promise<Array<{ edge: GraphEdge; score: number }>> {
    // Embed via IEmbeddingService — never call embedding API directly
    const vector = await this.embedding.embed(params.queryText);

    const knnQuery: Record<string, unknown> = {
      knn: {
        field: 'embedding',
        query_vector: vector,
        k: params.topK ?? 10,
        num_candidates: (params.topK ?? 10) * 5,
        ...(params.entityType ? { filter: { term: { fromType: params.entityType } } } : {}),
      },
    };

    try {
      const res = await fetch(`${this.esUrl}/${this.INDEX}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(knnQuery),
      });
      const body = (await res.json()) as Record<string, unknown>;
      const hits =
        ((body['hits'] as Record<string, unknown>)?.['hits'] as Record<string, unknown>[]) ?? [];
      const minScore = params.minScore ?? 0;

      return hits
        .filter((hit) => (hit['_score'] as number) >= minScore)
        .map((hit) => {
          const src = hit['_source'] as Record<string, unknown>;
          return {
            edge: {
              fromEntity: src['fromEntity'] as string,
              fromType: src['fromType'] as string,
              relationship: src['relationship'] as string,
              toEntity: src['toEntity'] as string,
              toType: src['toType'] as string,
              confidence: (src['confidence'] as number) ?? 0.5,
              observationCount: (src['observationCount'] as number) ?? 0,
              immutable: (src['immutable'] as boolean) ?? false,
            },
            score: hit['_score'] as number,
          };
        });
    } catch (err) {
      this.logger.error(`vectorSearch failed: ${err}`);
      return [];
    }
  }
}
