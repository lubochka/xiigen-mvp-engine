/**
 * NanoGraphRagProvider — IRagService for nano-graphrag (lightweight GraphRAG).
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Connects to a nano-graphrag FastAPI wrapper server.
 * API endpoints:
 *   POST /insert          — ingest documents into knowledge graph
 *   POST /query           — GraphRAG search (modes: naive, local, global)
 *   DELETE /documents     — delete by filter
 *   GET  /health          — health check
 *
 * Tenant isolation: workspace parameter = `{tenantId}/{namespace}`.
 * Open-source MIT license. Self-hosted, Docker-ready. Cost = $0 (local LLM via Ollama).
 *
 * DNA compliance:
 * - DNA-1: Record<string, unknown> throughout
 * - DNA-3: DataProcessResult — never throws
 * - DNA-5: Tenant from CLS only
 *
 * Phase: open-source fabric integration for self-implementation.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

/** nano-graphrag query mode — maps to GraphRAG retrieval strategy. */
export type NanoGraphRagMode = 'naive' | 'local' | 'global';

export interface NanoGraphRagConfig {
  /** FastAPI server base URL. Default: http://localhost:19300 */
  baseUrl?: string;
  /** Default query mode. Default: 'local' */
  defaultMode?: NanoGraphRagMode;
  /** Default top-K results. Default: 10 */
  defaultTopK?: number;
}

@Injectable()
export class NanoGraphRagProvider extends IRagService {
  private readonly baseUrl: string;
  private readonly defaultMode: NanoGraphRagMode;
  private readonly defaultTopK: number;

  constructor(
    private readonly cls: ClsService,
    config?: NanoGraphRagConfig,
  ) {
    super();
    this.baseUrl = (config?.baseUrl ?? 'http://localhost:19300').replace(/\/$/, '');
    this.defaultMode = config?.defaultMode ?? 'local';
    this.defaultTopK = config?.defaultTopK ?? 10;
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

  /** Workspace key: `{tenantId}/{namespace}` — maps to server working directory. */
  private workspaceKey(tenantId: string, namespace: string): string {
    return `${tenantId}/${namespace}`;
  }

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
    const workspace = this.workspaceKey(tenantId, ns);

    const payload = documents.map((doc) => ({
      doc_id: (doc['doc_id'] ?? randomUUID()) as string,
      content: (doc['content'] ?? doc['text'] ?? JSON.stringify(doc)) as string,
      workspace,
      metadata: { ...doc, tenant_id: tenantId, namespace: ns },
    }));

    try {
      const response = await fetch(`${this.baseUrl}/insert`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documents: payload }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'INGEST_FAILED',
          `nano-graphrag insert failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      return DataProcessResult.success({
        ingested: (data['inserted'] ?? documents.length) as number,
        failed: 0,
        namespace: ns,
        workspace,
        tenant_id: tenantId,
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `nano-graphrag ingest error: ${err}`);
    }
  }

  async search(
    query: string,
    options?: { namespace?: string; filters?: Record<string, unknown>; topK?: number },
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!query || query.trim() === '') {
      return DataProcessResult.success([]);
    }

    const ns = options?.namespace ?? 'default';
    const workspace = this.workspaceKey(tenantId, ns);
    const topK = options?.topK ?? this.defaultTopK;

    // Build active filters (DNA-2: skip null/empty)
    const activeFilters: Record<string, unknown> = {};
    if (options?.filters) {
      for (const [k, v] of Object.entries(options.filters)) {
        if (v !== null && v !== undefined && v !== '') activeFilters[k] = v;
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query,
          mode: this.defaultMode,
          workspace,
          top_k: topK,
          ...(Object.keys(activeFilters).length > 0 && { filters: activeFilters }),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'SEARCH_FAILED',
          `nano-graphrag query failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const results = (data['results'] ?? []) as Array<Record<string, unknown>>;

      return DataProcessResult.success(results);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `nano-graphrag search error: ${err}`);
    }
  }

  async buildContextPack(
    query: string,
    contextType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    const searchResult = await this.search(query, { namespace: contextType, filters });
    if (!searchResult.isSuccess)
      return DataProcessResult.failure(
        'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Search failed',
      );

    const documents = searchResult.data!;
    const contextParts: string[] = [];
    for (const doc of documents) {
      const text = (doc['content'] ?? doc['answer'] ?? doc['text'] ?? '') as string;
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
      provider: 'nano-graphrag',
      mode: this.defaultMode,
    });
  }

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

    const workspace = this.workspaceKey(tenantId, namespace);

    // DNA-2: skip null/empty filter values
    const activeFilters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filters)) {
      if (v !== null && v !== undefined && v !== '') activeFilters[k] = v;
    }

    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace, filters: activeFilters }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'DELETE_FAILED',
          `nano-graphrag delete failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const deleted = (data['deleted'] ?? 0) as number;
      return DataProcessResult.success(deleted);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `nano-graphrag delete error: ${err}`);
    }
  }

  /** Check if nano-graphrag server is reachable. */
  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        return DataProcessResult.failure(
          'UNHEALTHY',
          `nano-graphrag unreachable: HTTP ${response.status}`,
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      return DataProcessResult.success({
        ...data,
        status: 'healthy',
        provider: 'nano-graphrag',
        base_url: this.baseUrl,
        mode: this.defaultMode,
      });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `nano-graphrag health check failed: ${err}`);
    }
  }
}
