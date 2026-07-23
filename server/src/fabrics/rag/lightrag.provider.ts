/**
 * LightRAG Provider — IRagService implementation for LightRAG server.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Uses LightRAG REST API:
 *   POST /v1/documents  — ingest documents into knowledge graph
 *   POST /v1/query      — hybrid graph+vector search
 *
 * Tenant isolation: namespace parameter used as workspace prefix.
 * No API key required. Server runs locally in Docker.
 *
 * DNA: DataProcessResult (3), tenant from CLS (5), dict payloads (1).
 *
 * Phase 8: Open-source LLM integration — LightRAG knowledge store.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

/** LightRAG search mode. */
export type LightRagMode = 'naive' | 'local' | 'global' | 'hybrid';

export interface LightRagConfig {
  /** LightRAG server base URL. Default: http://localhost:19100 */
  baseUrl?: string;
  /** Default search mode. Default: 'hybrid' */
  defaultMode?: LightRagMode;
  /** Default top-K results. Default: 10 */
  defaultTopK?: number;
  /** Request timeout in milliseconds. Default: 30000. */
  requestTimeoutMs?: number;
}

@Injectable()
export class LightRagProvider extends IRagService {
  private readonly baseUrl: string;
  private readonly defaultMode: LightRagMode;
  private readonly defaultTopK: number;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly cls: ClsService,
    config?: LightRagConfig,
  ) {
    super();
    this.baseUrl = (config?.baseUrl ?? 'http://localhost:19100').replace(/\/$/, '');
    this.defaultMode = config?.defaultMode ?? 'hybrid';
    this.defaultTopK = config?.defaultTopK ?? 10;
    this.requestTimeoutMs = config?.requestTimeoutMs ?? 30_000;
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
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

  /** Workspace key: `{tenantId}/{namespace}` for full isolation. */
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

    let ingested = 0;
    let failed = 0;

    for (const doc of documents) {
      const content = (doc['content'] ?? doc['text'] ?? JSON.stringify(doc)) as string;
      const docId = (doc['doc_id'] ?? randomUUID()) as string;

      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/documents`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            content,
            doc_id: docId,
            workspace,
            metadata: { ...doc, tenant_id: tenantId, namespace: ns },
          }),
        });

        if (!response.ok) {
          failed++;
        } else {
          ingested++;
        }
      } catch {
        failed++;
      }
    }

    if (ingested === 0 && failed > 0) {
      return DataProcessResult.failure('INGEST_FAILED', `All ${failed} documents failed to ingest`);
    }

    return DataProcessResult.success({
      ingested,
      failed,
      namespace: ns,
      workspace,
    });
  }

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
    const workspace = this.workspaceKey(tenantId, ns);
    const topK = options?.topK ?? this.defaultTopK;

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query,
          mode: this.defaultMode,
          workspace,
          top_k: topK,
          ...(options?.filters && { filters: options.filters }),
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'SEARCH_FAILED',
          `LightRAG query failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const results = (data['results'] ?? data['data'] ?? []) as Array<Record<string, unknown>>;

      return DataProcessResult.success(results);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `LightRAG error: ${err}`);
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
      provider: 'lightrag',
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

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/v1/documents/filter`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace, filters }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return DataProcessResult.failure(
          'DELETE_FAILED',
          `LightRAG delete failed: ${response.status} ${errText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const deleted = (data['deleted'] ?? data['count'] ?? 0) as number;
      return DataProcessResult.success(deleted);
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `LightRAG delete error: ${err}`);
    }
  }

  /** Check if LightRAG server is reachable. */
  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);
      if (!response.ok) {
        return DataProcessResult.failure(
          'UNHEALTHY',
          `LightRAG unreachable: HTTP ${response.status}`,
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      return DataProcessResult.success({
        status: 'healthy',
        provider: 'lightrag',
        base_url: this.baseUrl,
        ...data,
      });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `LightRAG health check failed: ${err}`);
    }
  }
}
