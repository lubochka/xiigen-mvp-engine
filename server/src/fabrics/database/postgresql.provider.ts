/**
 * PostgreSQL Provider — IDatabaseService implementation for PostgreSQL 16+.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Storage model: Each tenant+index = a table with columns:
 *   (id TEXT PK, tenant_id TEXT NOT NULL, data JSONB NOT NULL,
 *    created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
 *
 * DNA Compliance:
 *   DNA-1: Documents stored as JSONB (Record<string, unknown>) — no typed models / ORM
 *   DNA-2: buildSearchFilterFlat — empty fields auto-skipped before building WHERE clauses
 *   DNA-3: All methods return DataProcessResult — never throw
 *   DNA-5: Tenant from CLS, tenant_id column + WHERE on every query, table-per-tenant-index
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
import { IAsyncPGPool, IAsyncPGConnection, sanitizeIdentifier } from './base';

@Injectable()
export class PostgreSQLProvider extends IDatabaseService {
  private readonly pool: IAsyncPGPool;
  private readonly tablesEnsured = new Set<string>();

  constructor(
    private readonly cls: ClsService,
    pool: IAsyncPGPool,
    _config?: Record<string, unknown>,
  ) {
    super();
    this.pool = pool;
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

  /** Tenant-scoped table name. Sanitized to prevent SQL injection. */
  private tableName(tenantId: string, index: string): string {
    return `${sanitizeIdentifier(tenantId)}_${sanitizeIdentifier(index)}`;
  }

  /** Auto-create table if not yet ensured (idempotent). */
  private async ensureTable(conn: IAsyncPGConnection, table: string): Promise<void> {
    if (this.tablesEnsured.has(table)) return;
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS "${table}" (` +
        `id TEXT PRIMARY KEY, ` +
        `tenant_id TEXT NOT NULL, ` +
        `data JSONB NOT NULL, ` +
        `created_at TIMESTAMPTZ DEFAULT NOW(), ` +
        `updated_at TIMESTAMPTZ DEFAULT NOW()` +
        `)`,
    );
    this.tablesEnsured.add(table);
  }

  /** Parse a PG row {id, data} into a document dict. */
  private static parseRow(row: Record<string, unknown>): Record<string, unknown> {
    let data = row['data'] ?? {};
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }
    const doc = { ...(data as Record<string, unknown>) };
    doc['_id'] = row['id'] ?? '';
    return doc;
  }

  /** Parse asyncpg-style execute result "DELETE 1" → 1. */
  private static rowsAffected(result: string): number {
    try {
      const parts = result.split(/\s+/);
      return parseInt(parts[parts.length - 1], 10) || 0;
    } catch {
      return 0;
    }
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

    let conn: IAsyncPGConnection | undefined;
    try {
      const scopeResult = enforceScope(document, tenantId);
      if (!scopeResult.isSuccess) {
        return DataProcessResult.failure(scopeResult.errorCode!, scopeResult.errorMessage!);
      }
      const scopedDoc = scopeResult.data!;
      const id = docId ?? randomUUID();
      const table = this.tableName(tenantId, index);
      const now = new Date().toISOString();
      const dataJson = JSON.stringify(scopedDoc);

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);

      await conn.execute(
        `INSERT INTO "${table}" (id, tenant_id, data, created_at, updated_at) ` +
          `VALUES ($1, $2, $3::jsonb, $4, $5) ` +
          `ON CONFLICT (id) DO UPDATE SET data = $3::jsonb, updated_at = $5`,
        id,
        tenantId,
        dataJson,
        now,
        now,
      );

      return DataProcessResult.success({ ...scopedDoc, _id: id });
    } catch (err) {
      return DataProcessResult.failure('PG_STORE_FAILED', `PostgreSQL store failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
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

    let conn: IAsyncPGConnection | undefined;
    try {
      const table = this.tableName(tenantId, index);

      // DNA-2: clean filters (skip empties)
      const cleanFilters = buildSearchFilterFlat(filters);

      // Build WHERE clause: always tenant_id + optional JSONB filters
      const whereParts: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIdx = 2;

      for (const [key, value] of Object.entries(cleanFilters)) {
        const safeKey = sanitizeIdentifier(key);
        if (typeof value === 'number') {
          whereParts.push(`(data->>'${safeKey}')::numeric = $${paramIdx}`);
          params.push(value);
        } else if (typeof value === 'boolean') {
          whereParts.push(`(data->>'${safeKey}')::boolean = $${paramIdx}`);
          params.push(value);
        } else {
          whereParts.push(`data->>'${safeKey}' = $${paramIdx}`);
          params.push(String(value));
        }
        paramIdx++;
      }

      const whereClause = whereParts.join(' AND ');
      const limitVal = size ?? 100;
      const offsetVal = fromOffset ?? 0;
      const query =
        `SELECT id, data FROM "${table}" ` +
        `WHERE ${whereClause} ` +
        `ORDER BY created_at DESC ` +
        `LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      params.push(limitVal, offsetVal);

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);
      const rows = await conn.fetch(query, ...params);

      const docs = rows.map((row) => PostgreSQLProvider.parseRow(row));
      return DataProcessResult.success(docs);
    } catch (err) {
      return DataProcessResult.failure('PG_SEARCH_FAILED', `PostgreSQL search failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
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

    let conn: IAsyncPGConnection | undefined;
    try {
      const table = this.tableName(tenantId, index);

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);

      // DNA-5: always filter by tenant_id
      const row = await conn.fetchrow(
        `SELECT id, data FROM "${table}" WHERE id = $1 AND tenant_id = $2`,
        docId,
        tenantId,
      );

      if (!row) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }

      return DataProcessResult.success(PostgreSQLProvider.parseRow(row));
    } catch (err) {
      return DataProcessResult.failure('PG_GET_FAILED', `PostgreSQL get failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
    }
  }

  async deleteDocument(index: string, docId: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    let conn: IAsyncPGConnection | undefined;
    try {
      const table = this.tableName(tenantId, index);

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);

      // DNA-5: delete only within tenant scope
      const result = await conn.execute(
        `DELETE FROM "${table}" WHERE id = $1 AND tenant_id = $2`,
        docId,
        tenantId,
      );

      if (PostgreSQLProvider.rowsAffected(result) === 0) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${docId} not found in ${index}`);
      }

      return DataProcessResult.success(true);
    } catch (err) {
      return DataProcessResult.failure('PG_DELETE_FAILED', `PostgreSQL delete failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
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
      return DataProcessResult.success({ stored: 0, failed: 0, total: 0 });
    }

    let conn: IAsyncPGConnection | undefined;
    try {
      const table = this.tableName(tenantId, index);
      const now = new Date().toISOString();

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);

      let stored = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const doc of documents) {
        try {
          const scopeResult = enforceScope(doc, tenantId);
          if (!scopeResult.isSuccess) {
            failed++;
            errors.push(scopeResult.errorMessage ?? 'SCOPE_VIOLATION');
            continue;
          }
          const scopedDoc = scopeResult.data!;
          const id = (doc['_id'] as string) ?? randomUUID();
          const dataJson = JSON.stringify(scopedDoc);

          await conn.execute(
            `INSERT INTO "${table}" (id, tenant_id, data, created_at, updated_at) ` +
              `VALUES ($1, $2, $3::jsonb, $4, $5) ` +
              `ON CONFLICT (id) DO UPDATE SET data = $3::jsonb, updated_at = $5`,
            id,
            tenantId,
            dataJson,
            now,
            now,
          );
          stored++;
        } catch (e) {
          failed++;
          errors.push(String(e));
        }
      }

      const summary: Record<string, unknown> = { stored, failed, total: documents.length };
      if (errors.length > 0) summary['errors'] = errors;

      if (stored === 0 && failed > 0) {
        return DataProcessResult.failure('BULK_STORE_FAILED', `All ${failed} documents failed`);
      }

      return DataProcessResult.success(summary);
    } catch (err) {
      return DataProcessResult.failure('PG_BULK_FAILED', `PostgreSQL bulk failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
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

    let conn: IAsyncPGConnection | undefined;
    try {
      const table = this.tableName(tenantId, index);
      const cleanFilters = buildSearchFilterFlat(filters);

      const whereParts: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIdx = 2;

      for (const [key, value] of Object.entries(cleanFilters)) {
        const safeKey = sanitizeIdentifier(key);
        whereParts.push(`data->>'${safeKey}' = $${paramIdx}`);
        params.push(String(value));
        paramIdx++;
      }

      const whereClause = whereParts.join(' AND ');
      const query = `SELECT COUNT(*) FROM "${table}" WHERE ${whereClause}`;

      conn = await this.pool.acquire();
      await this.ensureTable(conn, table);
      const count = await conn.fetchval(query, ...params);

      return DataProcessResult.success(
        typeof count === 'number' ? count : parseInt(String(count), 10) || 0,
      );
    } catch (err) {
      return DataProcessResult.failure('PG_COUNT_FAILED', `PostgreSQL count failed: ${err}`);
    } finally {
      if (conn) await this.pool.release(conn);
    }
  }

  // ── J1-1: ensureIndex ─────────────────────────────

  /**
   * PostgreSQL no-op: table creation is handled lazily via ensureTable().
   * Idempotent — always succeeds.
   */
  async ensureIndex(_indexName: string, _mappings: Record<string, unknown>): Promise<void> {
    // No-op for PostgreSQL provider — tables are lazily created on first storeDocument call.
  }

  // ── Health Check ──────────────────────────────────

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    let conn: IAsyncPGConnection | undefined;
    try {
      conn = await this.pool.acquire();
      const result = await conn.fetchval('SELECT 1');
      if (result === 1 || result === '1') {
        return DataProcessResult.success({ status: 'healthy', provider: 'postgresql' });
      }
      return DataProcessResult.failure('PG_UNHEALTHY', 'PostgreSQL SELECT 1 did not return 1');
    } catch (err) {
      return DataProcessResult.failure(
        'PG_HEALTH_FAILED',
        `PostgreSQL health check failed: ${err}`,
      );
    } finally {
      if (conn) await this.pool.release(conn);
    }
  }

  // ── OCC (Optimistic Concurrency Control) ─────────────────────────────────────
  // PostgreSQL OCC is implemented via row version column (xmin system column).
  // For now, stubs are provided — full implementation uses SELECT FOR UPDATE.

  async getDocumentWithVersion(
    index: string,
    id: string,
  ): Promise<DataProcessResult<DocumentWithVersion>> {
    // Delegate to getDocument and return a synthetic version
    const result = await this.getDocument(index, id);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success({
      doc: result.data!,
      seqNo: 0, // PostgreSQL uses xmin — extended in production
      primaryTerm: 1,
    });
  }

  async storeDocumentWithOCC(
    index: string,
    doc: Record<string, unknown>,
    id: string,
    _occ: OccOptions,
  ): Promise<DataProcessResult<{ seqNo: number; primaryTerm: number }>> {
    // PostgreSQL OCC is implemented at application level — delegate to storeDocument for now
    const result = await this.storeDocument(index, doc, id);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success({ seqNo: 1, primaryTerm: 1 });
  }

  // ── Testing helpers ────────────────────────────────

  /** Clear the ensured-tables cache (for testing). */
  clearTableCache(): void {
    this.tablesEnsured.clear();
  }
}
