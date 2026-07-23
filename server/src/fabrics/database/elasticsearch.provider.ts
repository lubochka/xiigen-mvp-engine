/**
 * Elasticsearch Provider — IDatabaseService implementation for Elasticsearch 8.x.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * DNA Compliance:
 *   DNA-1: All documents are Record<string, unknown> — no typed models
 *   DNA-2: buildSearchFilterFlat + buildEsQuery — empty fields auto-skipped
 *   DNA-3: All methods return DataProcessResult — never throw
 *   DNA-5: Tenant from CLS, enforceScope on writes, tenant-scoped index naming
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
import { buildSearchFilterFlat, buildEsQuery } from '../../kernel/build-search-filter';
import { IAsyncElasticsearchClient } from './base';

@Injectable()
export class ElasticsearchProvider extends IDatabaseService {
  private readonly client: IAsyncElasticsearchClient;
  private readonly refresh: string;

  constructor(
    private readonly cls: ClsService,
    client: IAsyncElasticsearchClient,
    config?: Record<string, unknown>,
  ) {
    super();
    this.client = client;
    this.refresh = (config?.['refresh'] as string) ?? 'false';
  }

  // ── Tenant resolution ──────────────────────────────

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

  /** Tenant-scoped index name: {tenantId}_{index}. */
  private indexName(tenantId: string, index: string): string {
    return `${tenantId}_${index}`;
  }

  // ── IDatabaseService Implementation ────────────────

  async storeDocument(
    index: string,
    document: Record<string, unknown>,
    docId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const scopeResult = enforceScope(document, tenantId);
      if (!scopeResult.isSuccess) {
        return DataProcessResult.failure(scopeResult.errorCode!, scopeResult.errorMessage!);
      }
      const scopedDoc = scopeResult.data!;
      const id = docId ?? randomUUID();
      const esIndex = this.indexName(tenantId, index);

      const resp = await this.client.index({
        index: esIndex,
        document: scopedDoc,
        id,
        refresh: this.refresh,
      });

      const resultDoc: Record<string, unknown> = {
        ...scopedDoc,
        _id: resp._id ?? id,
      };
      return DataProcessResult.success(resultDoc);
    } catch (err) {
      return DataProcessResult.failure('ES_STORE_FAILED', `Elasticsearch store failed: ${err}`);
    }
  }

  async searchDocuments(
    index: string,
    filters: Record<string, unknown>,
    size?: number,
    fromOffset?: number,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const esIndex = this.indexName(tenantId, index);

      // DNA-2: clean filters (skip empties)
      const cleanFilters = buildSearchFilterFlat(filters);

      // Convert flat key:value to operator-style for buildEsQuery
      const operatorFilters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(cleanFilters)) {
        operatorFilters[key] = { value, operator: 'eq' };
      }

      const esQuery = buildEsQuery(operatorFilters, tenantId, {
        size: size ?? 100,
        fromOffset: fromOffset ?? 0,
      });

      const resp = await this.client.search({
        index: esIndex,
        body: esQuery,
      });

      const hits = resp.hits?.hits ?? [];
      const docs: Array<Record<string, unknown>> = hits.map((hit) => ({
        ...hit._source,
        _id: hit._id,
      }));

      return DataProcessResult.success(docs);
    } catch (err) {
      return DataProcessResult.failure('ES_SEARCH_FAILED', `Elasticsearch search failed: ${err}`);
    }
  }

  async getDocument(
    index: string,
    docId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const esIndex = this.indexName(tenantId, index);
      const resp = await this.client.get({ index: esIndex, id: docId });

      if (!resp.found) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }

      const doc: Record<string, unknown> = {
        ...resp._source,
        _id: resp._id ?? docId,
      };

      // DNA-5: defense-in-depth — verify tenant_id matches
      if (doc['tenant_id'] !== tenantId) {
        return DataProcessResult.failure(
          'SCOPE_VIOLATION',
          'Document tenant_id does not match request',
        );
      }

      return DataProcessResult.success(doc);
    } catch (err) {
      // Handle ES NotFoundError-like errors
      if (
        err instanceof Error &&
        (err.message.includes('not_found') ||
          err.message.includes('NotFoundError') ||
          (err as unknown as Record<string, unknown>)['statusCode'] === 404)
      ) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }
      return DataProcessResult.failure('ES_GET_FAILED', `Elasticsearch get failed: ${err}`);
    }
  }

  async deleteDocument(index: string, docId: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const esIndex = this.indexName(tenantId, index);
      await this.client.delete({
        index: esIndex,
        id: docId,
        refresh: this.refresh,
      });
      return DataProcessResult.success(true);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes('not_found') ||
          (err as unknown as Record<string, unknown>)['statusCode'] === 404)
      ) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }
      return DataProcessResult.failure('ES_DELETE_FAILED', `Elasticsearch delete failed: ${err}`);
    }
  }

  async bulkStore(
    index: string,
    documents: Array<Record<string, unknown>>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    if (!documents || documents.length === 0) {
      return DataProcessResult.success({
        stored: 0,
        failed: 0,
        total: 0,
      });
    }

    try {
      const esIndex = this.indexName(tenantId, index);
      const operations: Array<Record<string, unknown>> = [];

      for (const doc of documents) {
        const scopeResult = enforceScope(doc, tenantId);
        if (!scopeResult.isSuccess) {
          return DataProcessResult.failure(scopeResult.errorCode!, scopeResult.errorMessage!);
        }
        const scopedDoc = scopeResult.data!;
        const docId = (doc['_id'] as string) ?? randomUUID();
        // Remove _id from the source — ES stores it separately
        const source: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(scopedDoc)) {
          if (k !== '_id') source[k] = v;
        }
        operations.push({ index: { _index: esIndex, _id: docId } });
        operations.push(source);
      }

      const resp = await this.client.bulk({
        operations,
        refresh: this.refresh,
      });

      const items = resp.items ?? [];
      let stored = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const item of items) {
        const indexResult = item.index;
        if (indexResult) {
          const status = indexResult.status ?? 0;
          if (status === 200 || status === 201) {
            stored++;
          } else {
            failed++;
            const reason =
              indexResult.error?.['reason'] ?? indexResult.error?.['type'] ?? 'unknown';
            errors.push(String(reason));
          }
        }
      }

      const summary: Record<string, unknown> = {
        stored,
        failed,
        total: documents.length,
      };
      if (errors.length > 0) {
        summary['errors'] = errors;
      }

      if (stored === 0 && failed > 0) {
        return DataProcessResult.failure('BULK_STORE_FAILED', `All ${failed} documents failed`);
      }

      return DataProcessResult.success(summary);
    } catch (err) {
      return DataProcessResult.failure('ES_BULK_FAILED', `Elasticsearch bulk failed: ${err}`);
    }
  }

  async countDocuments(
    index: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const esIndex = this.indexName(tenantId, index);
      const cleanFilters = buildSearchFilterFlat(filters);
      const operatorFilters: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(cleanFilters)) {
        operatorFilters[key] = { value, operator: 'eq' };
      }
      const esQuery = buildEsQuery(operatorFilters, tenantId);
      const countBody = { query: esQuery['query'] };

      const resp = await this.client.count({
        index: esIndex,
        body: countBody,
      });

      return DataProcessResult.success(resp.count ?? 0);
    } catch (err) {
      return DataProcessResult.failure('ES_COUNT_FAILED', `Elasticsearch count failed: ${err}`);
    }
  }

  // ── J1-1: ensureIndex ─────────────────────────────

  /**
   * Creates an Elasticsearch index with the given mappings if it does not already exist.
   * Idempotent — calling when the index already exists is a no-op (400 = resource_already_exists_exception).
   *
   * Why 400 and not 409? Elasticsearch returns HTTP 400 with error type
   * resource_already_exists_exception (not 409 Conflict) for duplicate create. Intentional.
   */
  async ensureIndex(indexName: string, mappings: Record<string, unknown>): Promise<void> {
    // FLOW-47 Defect-5: tenant-aware index creation. Without this, ensureIndex
    // creates the un-scoped index name while storeDocument writes land on the
    // tenant-scoped index ({tenantId}_{indexName}) — fixture mappings never
    // reach the index where data actually lives, and ES infers `text` mapping
    // from first write (breaks term queries on flowId / ruleId / etc.).
    // Mirrors storeDocument's tenant-scoped naming. Falls back to the un-scoped
    // name when no CLS tenant is present (e.g. health-registry indices created
    // before any tenant context is established).
    const tenantResult = this.getTenantId();
    const esIndex = tenantResult.isSuccess
      ? this.indexName(tenantResult.data!, indexName)
      : indexName;
    try {
      await this.client.indices.create({
        index: esIndex,
        body: { mappings },
      });
    } catch (e: unknown) {
      const err = e as { meta?: { statusCode?: number } };
      // 400 = index already exists (resource_already_exists_exception) — idempotent, not an error
      if (err?.meta?.statusCode === 400) return;
      throw e;
    }
  }

  // ── Health Check ──────────────────────────────────

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const alive = await this.client.ping();
      if (alive) {
        return DataProcessResult.success({
          status: 'healthy',
          provider: 'elasticsearch',
        });
      }
      return DataProcessResult.failure('ES_UNHEALTHY', 'Elasticsearch ping returned false');
    } catch (err) {
      return DataProcessResult.failure(
        'ES_HEALTH_FAILED',
        `Elasticsearch health check failed: ${err}`,
      );
    }
  }

  // ── OCC (Optimistic Concurrency Control) ─────────────────────────────────────

  async getDocumentWithVersion(
    index: string,
    id: string,
  ): Promise<DataProcessResult<DocumentWithVersion>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const esIndex = this.indexName(tenantResult.data!, index);
    try {
      const response = await this.client.get({ index: esIndex, id });
      const raw = response as unknown as Record<string, unknown>;
      return DataProcessResult.success({
        doc: raw['_source'] as Record<string, unknown>,
        seqNo: raw['_seq_no'] as number,
        primaryTerm: raw['_primary_term'] as number,
      });
    } catch (err: unknown) {
      const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (status === 404) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
      }
      return DataProcessResult.failure('ES_ERROR', String((err as Error).message));
    }
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
    const esIndex = this.indexName(tenantResult.data!, index);
    try {
      const indexParams = {
        index: esIndex,
        id,
        document: doc,
        if_seq_no: occ.ifSeqNo,
        if_primary_term: occ.ifPrimaryTerm,
      } as Record<string, unknown>;
      const response = await (
        this.client.index as (p: Record<string, unknown>) => Promise<unknown>
      )(indexParams);
      const raw = response as Record<string, unknown>;
      return DataProcessResult.success({
        seqNo: raw['_seq_no'] as number,
        primaryTerm: raw['_primary_term'] as number,
      });
    } catch (err: unknown) {
      const status = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
      if (status === 409) {
        return DataProcessResult.failure(
          'OCC_CONFLICT',
          `Optimistic concurrency conflict on document ${id} in ${index}. Retry with fresh read.`,
        );
      }
      return DataProcessResult.failure('ES_ERROR', String((err as Error).message));
    }
  }
}
