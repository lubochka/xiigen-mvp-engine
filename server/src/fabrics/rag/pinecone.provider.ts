/**
 * PineconeProvider — IRagService implementation using Pinecone REST API.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Strategy: Dense vector search with tenant isolation via Pinecone namespaces.
 * Namespace pattern: `{tenantId}_{namespace}` (alphanumeric + underscore only).
 *
 * Embeddings: configurable EmbeddingFn injects the text→vector mapping.
 * Default: deterministic hash-based embedding (testing only).
 * Production: inject an actual embedding model (e.g. text-embedding-3-small).
 *
 * DNA compliance:
 * - DNA-1: All docs are Record<string, unknown>
 * - DNA-2: Filters skip empty/null values
 * - DNA-3: All methods return DataProcessResult
 * - DNA-5: Tenant from CLS, namespace isolation
 *
 * Phase 8: Cloud vector store integration.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

// ── Embedding function type ──────────────────────────

/** Maps text to a dense float vector of the given dimension. */
export type EmbeddingFn = (text: string, dimension: number) => Promise<number[]>;

/**
 * Default deterministic embedding: hash-based pseudo-random unit vector.
 * Same text → same vector (cosine similarity = 1.0 on exact match).
 * NOT semantically meaningful; use a real embedding model in production.
 */
export async function hashEmbedding(text: string, dimension: number): Promise<number[]> {
  const vec = new Array<number>(dimension).fill(0);
  const bytes = Buffer.from(text, 'utf8');
  for (let i = 0; i < bytes.length; i++) {
    const slot = i % dimension;
    vec[slot] = (vec[slot] + bytes[i] / 255) % 1.0;
  }
  // L2-normalise to unit sphere
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / mag);
}

// ── Config ───────────────────────────────────────────

export interface PineconeConfig {
  /** Pinecone API key. */
  apiKey: string;
  /** Index host (e.g., xiigen-test-a9sji3n.svc.aped-4627-b74a.pinecone.io). */
  indexHost: string;
  /** Vector dimension. Must match the index dimension. Default: 1536. */
  dimension?: number;
  /** Default top-K results. Default: 10. */
  defaultTopK?: number;
  /** Custom embedding function. Defaults to hashEmbedding. */
  embedFn?: EmbeddingFn;
}

// ── Provider ─────────────────────────────────────────

@Injectable()
export class PineconeProvider extends IRagService {
  private readonly apiKey: string;
  private readonly indexHost: string;
  private readonly dimension: number;
  private readonly defaultTopK: number;
  private readonly embedFn: EmbeddingFn;

  constructor(
    private readonly cls: ClsService,
    config: PineconeConfig,
  ) {
    super();
    this.apiKey = config.apiKey;
    this.indexHost = config.indexHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    this.dimension = config.dimension ?? 1536;
    this.defaultTopK = config.defaultTopK ?? 10;
    this.embedFn = config.embedFn ?? hashEmbedding;
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  /**
   * Pinecone namespace: `{tenantId}_{ns}`.
   * Pinecone namespaces allow [a-zA-Z0-9_-] — sanitise the tenantId.
   */
  private pineconeNamespace(tenantId: string, ns: string): string {
    const safe = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safe}_${ns}`;
  }

  private headers(): Record<string, string> {
    return {
      'Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private indexUrl(path: string): string {
    return `https://${this.indexHost}${path}`;
  }

  // ── ingest ───────────────────────────────────────────

  async ingest(
    documents: Array<Record<string, unknown>>,
    namespace?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!documents || documents.length === 0) {
      return DataProcessResult.failure('EMPTY_DOCUMENTS', 'No documents to ingest');
    }

    const ns = namespace ?? 'default';
    const pineconeNs = this.pineconeNamespace(tenantId, ns);

    // Build vectors
    const vectors: Array<Record<string, unknown>> = [];
    for (const doc of documents) {
      const text = (doc['content'] ?? doc['text'] ?? JSON.stringify(doc)) as string;
      const id = (doc['doc_id'] ?? randomUUID()) as string;
      try {
        const values = await this.embedFn(text, this.dimension);
        vectors.push({
          id,
          values,
          metadata: {
            ...doc,
            tenant_id: tenantId,
            namespace: ns,
            content: text,
          },
        });
      } catch {
        // skip failed embeddings
      }
    }

    if (vectors.length === 0) {
      return DataProcessResult.failure('EMBED_FAILED', 'All documents failed to embed');
    }

    try {
      const response = await fetch(this.indexUrl('/vectors/upsert'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ vectors, namespace: pineconeNs }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'UPSERT_FAILED',
          `Pinecone upsert failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const upsertedCount = (data['upsertedCount'] ?? vectors.length) as number;

      return DataProcessResult.success({
        ingested: upsertedCount,
        namespace: ns,
        pinecone_namespace: pineconeNs,
        total_in_namespace: upsertedCount,
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Pinecone ingest error: ${err}`);
    }
  }

  // ── search ───────────────────────────────────────────

  async search(
    query: string,
    options?: {
      namespace?: string;
      filters?: Record<string, unknown>;
      topK?: number;
    },
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!query || query.trim() === '') {
      return DataProcessResult.success([]);
    }

    const ns = options?.namespace ?? 'default';
    const pineconeNs = this.pineconeNamespace(tenantId, ns);
    const topK = options?.topK ?? this.defaultTopK;

    let queryVector: number[];
    try {
      queryVector = await this.embedFn(query, this.dimension);
    } catch (err) {
      return DataProcessResult.failure('EMBED_FAILED', `Failed to embed query: ${err}`);
    }

    // Build filter (DNA-2: skip null/empty)
    let pineconeFilter: Record<string, unknown> | undefined;
    if (options?.filters) {
      const activeFilters: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(options.filters)) {
        if (v !== null && v !== undefined && v !== '') {
          activeFilters[k] = v;
        }
      }
      if (Object.keys(activeFilters).length > 0) {
        pineconeFilter = activeFilters;
      }
    }

    try {
      const body: Record<string, unknown> = {
        vector: queryVector,
        topK,
        namespace: pineconeNs,
        includeMetadata: true,
        includeValues: false,
      };
      if (pineconeFilter) body['filter'] = pineconeFilter;

      const response = await fetch(this.indexUrl('/query'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'SEARCH_FAILED',
          `Pinecone query failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const matches = (data['matches'] ?? []) as Array<Record<string, unknown>>;

      const results = matches.map((m) => ({
        doc_id: m['id'],
        _score: m['score'],
        ...((m['metadata'] ?? {}) as Record<string, unknown>),
      }));

      return DataProcessResult.success(results);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Pinecone search error: ${err}`);
    }
  }

  // ── buildContextPack ─────────────────────────────────

  async buildContextPack(
    query: string,
    contextType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    const searchResult = await this.search(query, {
      namespace: contextType,
      filters,
      topK: this.defaultTopK,
    });

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Search failed',
      );
    }

    const documents = searchResult.data!;
    const contextParts: string[] = [];
    for (const doc of documents) {
      const text = (doc['content'] ?? doc['text'] ?? doc['description'] ?? '') as string;
      if (text) contextParts.push(text);
    }
    const contextText = contextParts.join('\n---\n');

    return DataProcessResult.success({
      context_type: contextType,
      query,
      document_count: documents.length,
      context_text: contextText,
      token_estimate: contextText.split(/\s+/).length,
      documents,
      provider: 'pinecone',
    });
  }

  // ── deleteByFilter ───────────────────────────────────

  async deleteByFilter(
    namespace: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!namespace) {
      return DataProcessResult.failure('MISSING_NAMESPACE', 'namespace required');
    }

    const pineconeNs = this.pineconeNamespace(tenantId, namespace);

    // Build active filters (DNA-2)
    const activeFilters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== null && v !== undefined && v !== '') {
        activeFilters[k] = v;
      }
    }

    if (Object.keys(activeFilters).length === 0) {
      return DataProcessResult.failure(
        'EMPTY_FILTER',
        'At least one filter value required for delete',
      );
    }

    try {
      const response = await fetch(this.indexUrl('/vectors/delete'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ filter: activeFilters, namespace: pineconeNs }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'DELETE_FAILED',
          `Pinecone delete failed: ${response.status} ${errText}`,
        );
      }

      // Pinecone delete returns {} — no count in response
      return DataProcessResult.success(0);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Pinecone delete error: ${err}`);
    }
  }

  // ── healthCheck ──────────────────────────────────────

  /** Describe index stats to verify connectivity. */
  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const response = await fetch(this.indexUrl('/describe_index_stats'), {
        method: 'GET',
        headers: this.headers(),
      });

      if (!response.ok) {
        return DataProcessResult.failure(
          'UNHEALTHY',
          `Pinecone unreachable: HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      return DataProcessResult.success({
        status: 'healthy',
        provider: 'pinecone',
        index_host: this.indexHost,
        ...data,
      });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `Pinecone health check failed: ${err}`);
    }
  }
}
