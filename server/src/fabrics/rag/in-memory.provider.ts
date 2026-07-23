/**
 * InMemory RAG Provider — keyword-based search simulating vector similarity.
 * Implements IRagService with in-memory document storage.
 *
 * DNA compliance:
 * - DNA-1: All docs are Record<string, unknown>
 * - DNA-2: Filters skip empty/null values
 * - DNA-3: All methods return DataProcessResult
 * - DNA-5: Tenant from CLS, scoped namespaces
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

@Injectable()
export class InMemoryRagProvider extends IRagService {
  /** Storage: `${tenantId}:${namespace}` → documents[] */
  private readonly store = new Map<string, Array<Record<string, unknown>>>();
  private defaultTopK = 10;

  constructor(private readonly cls: ClsService) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private storeKey(tenantId: string, namespace: string): string {
    return `${tenantId}:${namespace}`;
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
    const key = this.storeKey(tenantId, ns);
    const docs = this.store.get(key) ?? [];

    // Apply filters (DNA-2: skip empty values)
    const filtered = this.applyFilters(docs, options?.filters);

    // Score by keyword overlap
    const scored = this.scoreDocuments(query, filtered);

    // Top-k
    const effectiveK = Math.min(options?.topK ?? this.defaultTopK, this.defaultTopK);
    return DataProcessResult.success(scored.slice(0, effectiveK));
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
    const key = this.storeKey(tenantId, ns);

    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    const collection = this.store.get(key)!;

    let ingested = 0;
    for (const doc of documents) {
      if (typeof doc !== 'object' || doc === null) continue;

      const entry: Record<string, unknown> = structuredClone(doc);
      if (!entry['doc_id']) entry['doc_id'] = randomUUID();
      entry['tenant_id'] = tenantId;
      entry['namespace'] = ns;
      collection.push(entry);
      ingested++;
    }

    return DataProcessResult.success({
      ingested,
      namespace: ns,
      total_in_namespace: collection.length,
    });
  }

  async buildContextPack(
    query: string,
    contextType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    // Search across the contextType namespace
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
    const contextText = this.assembleContext(documents);

    return DataProcessResult.success({
      context_type: contextType,
      query,
      document_count: documents.length,
      context_text: contextText,
      token_estimate: contextText.split(/\s+/).length,
      documents,
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

    const key = this.storeKey(tenantId, namespace);
    const docs = this.store.get(key);
    if (!docs || docs.length === 0) {
      return DataProcessResult.success(0);
    }

    const before = docs.length;
    const remaining = docs.filter((d) => !this.matchesFilter(d, filters));
    this.store.set(key, remaining);

    return DataProcessResult.success(before - remaining.length);
  }

  // ── Internal helpers ────────────────────────────────

  private applyFilters(
    docs: Array<Record<string, unknown>>,
    filters?: Record<string, unknown>,
  ): Array<Record<string, unknown>> {
    if (!filters) return docs;
    return docs.filter((doc) => {
      for (const [k, v] of Object.entries(filters)) {
        if (v === null || v === undefined || v === '') continue; // DNA-2
        if (doc[k] !== v) return false;
      }
      return true;
    });
  }

  private matchesFilter(doc: Record<string, unknown>, filters: Record<string, unknown>): boolean {
    for (const [k, v] of Object.entries(filters)) {
      if (v === null || v === undefined || v === '') continue;
      if (doc[k] !== v) return false;
    }
    return true;
  }

  private scoreDocuments(
    query: string,
    docs: Array<Record<string, unknown>>,
  ): Array<Record<string, unknown>> {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));

    const scored: Array<Record<string, unknown>> = [];
    for (const doc of docs) {
      const searchable = Object.values(doc)
        .filter((v) => typeof v === 'string')
        .join(' ')
        .toLowerCase();
      const docWords = new Set(searchable.split(/\s+/));

      let overlap = 0;
      for (const w of queryWords) {
        if (docWords.has(w)) overlap++;
      }

      if (overlap > 0 || queryWords.size === 0) {
        const entry = structuredClone(doc);
        entry['_score'] = Math.round((overlap / Math.max(queryWords.size, 1)) * 10000) / 10000;
        scored.push(entry);
      }
    }

    scored.sort((a, b) => (b['_score'] as number) - (a['_score'] as number));
    return scored;
  }

  private assembleContext(documents: Array<Record<string, unknown>>): string {
    const parts: string[] = [];
    for (const doc of documents) {
      const text = (doc['content'] ?? doc['text'] ?? doc['description'] ?? '') as string;
      if (text) parts.push(text);
    }
    return parts.join('\n---\n');
  }

  // ── Testing helpers ─────────────────────────────────

  get documentCount(): number {
    let total = 0;
    for (const docs of this.store.values()) {
      total += docs.length;
    }
    return total;
  }

  clear(): void {
    this.store.clear();
  }
}
