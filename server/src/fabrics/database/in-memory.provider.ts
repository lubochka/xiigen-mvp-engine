/**
 * InMemory Database Provider — for testing and local development.
 * Implements IDatabaseService with plain Maps.
 *
 * DNA compliance:
 * - DNA-1: All docs are Record<string, unknown>
 * - DNA-2: buildSearchFilterFlat skips empty fields
 * - DNA-3: All methods return DataProcessResult
 * - DNA-5: Tenant from CLS, enforceScope on writes, scoped reads
 *
 * v4: No tenant_id parameter. Reads TenantContext from AsyncLocalStorage.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import {
  IDatabaseService,
  OccOptions,
  DocumentWithVersion,
} from '../interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { enforceScope } from '../../kernel/scope-isolation';
import { buildSearchFilterFlat } from '../../kernel/build-search-filter';

@Injectable()
export class InMemoryDatabaseProvider extends IDatabaseService {
  /**
   * Storage: Map<"tenantId_index", Map<docId, document>>
   * Each tenant+index combo is fully isolated.
   */
  private readonly store = new Map<string, Map<string, Record<string, unknown>>>();

  constructor(private readonly cls: ClsService) {
    super();
  }

  private getCollection(tenantId: string, index: string): Map<string, Record<string, unknown>> {
    const key = `${tenantId}_${index}`;
    if (!this.store.has(key)) {
      this.store.set(key, new Map());
    }
    return this.store.get(key)!;
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure(
          'NO_TENANT',
          'TenantContext not found in CLS — is TenantContextMiddleware configured?',
        );
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  async storeDocument(
    index: string,
    document: Record<string, unknown>,
    docId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    try {
      const scopeResult = enforceScope(document, tenantId);
      if (!scopeResult.isSuccess) {
        return DataProcessResult.failure(scopeResult.errorCode!, scopeResult.errorMessage!);
      }
      const scoped = scopeResult.data!;
      const id = docId ?? randomUUID();
      scoped['_id'] = id;

      const collection = this.getCollection(tenantId, index);
      collection.set(id, structuredClone(scoped));

      return DataProcessResult.success(structuredClone(scoped));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('STORE_FAILED', err.message, err);
    }
  }

  async searchDocuments(
    index: string,
    filters: Record<string, unknown>,
    size = 100,
    fromOffset = 0,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    try {
      const collection = this.getCollection(tenantId, index);
      const cleanFilters = buildSearchFilterFlat(filters);

      const results: Array<Record<string, unknown>> = [];
      for (const doc of collection.values()) {
        if (this.matchesFilters(doc, cleanFilters)) {
          results.push(structuredClone(doc));
        }
      }

      const paginated = results.slice(fromOffset, fromOffset + size);
      return DataProcessResult.success(paginated);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('SEARCH_FAILED', err.message, err);
    }
  }

  async getDocument(
    index: string,
    docId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    try {
      const collection = this.getCollection(tenantId, index);
      const doc = collection.get(docId);

      if (!doc) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }

      return DataProcessResult.success(structuredClone(doc));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('GET_FAILED', err.message, err);
    }
  }

  async deleteDocument(index: string, docId: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    try {
      const collection = this.getCollection(tenantId, index);

      if (!collection.has(docId)) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }

      collection.delete(docId);
      return DataProcessResult.success(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('DELETE_FAILED', err.message, err);
    }
  }

  async bulkStore(
    index: string,
    documents: Array<Record<string, unknown>>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    let stored = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const doc of documents) {
      const result = await this.storeDocument(index, doc);
      if (result.isSuccess) {
        stored++;
      } else {
        failed++;
        errors.push(result.errorMessage ?? 'unknown');
      }
    }

    const summary: Record<string, unknown> = { stored, failed, total: documents.length };
    if (errors.length > 0) summary['errors'] = errors;

    if (failed > 0 && stored === 0) {
      return DataProcessResult.failure('BULK_STORE_FAILED', `All ${failed} documents failed`);
    }

    return DataProcessResult.success(summary);
  }

  async countDocuments(
    index: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    try {
      const collection = this.getCollection(tenantId, index);
      const cleanFilters = buildSearchFilterFlat(filters);

      let count = 0;
      for (const doc of collection.values()) {
        if (this.matchesFilters(doc, cleanFilters)) {
          count++;
        }
      }

      return DataProcessResult.success(count);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('COUNT_FAILED', err.message, err);
    }
  }

  // ── J1-1: ensureIndex ─────────────────────────────

  /**
   * In-memory no-op: indices are created on-demand.
   * Idempotent — always succeeds.
   */
  async ensureIndex(_indexName: string, _mappings: Record<string, unknown>): Promise<void> {
    // No-op for in-memory provider — indices are lazily created on first storeDocument call.
  }

  // ── Filter matching ─────────────────────────────────

  private matchesFilters(doc: Record<string, unknown>, filters: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      const docValue = doc[key];
      if (Array.isArray(value)) {
        if (!value.includes(docValue)) return false;
      } else if (docValue !== value) {
        return false;
      }
    }
    return true;
  }

  // ── OCC methods ─────────────────────────────────────────────────────────────

  /**
   * In-memory OCC: uses a simple seq counter stored alongside each doc.
   * Not a true optimistic lock but provides the same interface for testing.
   */
  async getDocumentWithVersion(
    index: string,
    id: string,
  ): Promise<DataProcessResult<DocumentWithVersion>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const collection = this.getCollection(tenantResult.data!, index);
    const doc = collection.get(id);
    if (!doc) {
      return DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }
    const seqNo = (doc['__seqNo'] as number) ?? 0;
    return DataProcessResult.success({
      doc: { ...doc } as Record<string, unknown>,
      seqNo,
      primaryTerm: 1,
    });
  }

  async storeDocumentWithOCC(
    index: string,
    doc: Record<string, unknown>,
    id: string,
    occ: OccOptions,
  ): Promise<DataProcessResult<{ seqNo: number; primaryTerm: number }>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const collection = this.getCollection(tenantResult.data!, index);
    const existing = collection.get(id);
    const currentSeq = (existing?.['__seqNo'] as number) ?? 0;
    if (occ.ifSeqNo !== currentSeq) {
      return DataProcessResult.failure(
        'OCC_CONFLICT',
        `Optimistic concurrency conflict on document ${id} in ${index}. Retry with fresh read.`,
      );
    }
    const newSeq = currentSeq + 1;
    collection.set(id, { ...doc, __seqNo: newSeq });
    return DataProcessResult.success({ seqNo: newSeq, primaryTerm: 1 });
  }

  // ── Testing helpers ─────────────────────────────────

  /** Clear all stored data — for testing only. */
  clear(): void {
    this.store.clear();
  }

  /** Total documents across all tenants and indices. */
  get totalDocuments(): number {
    let total = 0;
    for (const collection of this.store.values()) {
      total += collection.size;
    }
    return total;
  }
}
