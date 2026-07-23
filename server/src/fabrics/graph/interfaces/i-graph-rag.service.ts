import { GraphEdge, GraphQueryResult } from './graph-types';

export const GRAPH_RAG_SERVICE = 'GRAPH_RAG_SERVICE';

export abstract class IGraphRagService {
  /**
   * Query edges from the decision graph.
   * Phase 1 (ES): single-hop — one fromEntity + relationship → toEntity lookups.
   * Phase 2 (LightRAG/Neo4j): multi-hop traversal available.
   *
   * Per D-GRAPH-001: migrate to LightRAG when depth > 2 is needed,
   * edge count exceeds 50k, or query time > 200ms.
   */
  abstract query(params: {
    fromEntity: string;
    relationship?: string;
    toEntity?: string;
    minConfidence?: number;
    limit?: number;
  }): Promise<GraphQueryResult>;

  /**
   * Insert or update an edge. Immutable edges (confidence: 1.0, immutable: true)
   * cannot be overwritten — attempted upsert is a no-op with a warning.
   */
  abstract upsertEdge(edge: {
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
  }): Promise<void>;

  /**
   * Increment observationCount and apply confidence_delta.
   * No-op if edge is immutable.
   */
  abstract updateEdgeWeight(params: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    delta: number;
    observationId: string;
  }): Promise<void>;

  /**
   * Vector similarity search — semantic retrieval alongside graph traversal.
   * Phase 1: uses ES dense_vector kNN.
   * Later phases: delegates to Pinecone / Azure AI Search / Neo4j vector index.
   * ALL providers call IEmbeddingService to embed queryText — never call embedding API directly.
   */
  abstract vectorSearch(params: {
    queryText: string;
    entityType?: string;
    topK?: number;
    minScore?: number;
  }): Promise<Array<{ edge: GraphEdge; score: number }>>;
}
