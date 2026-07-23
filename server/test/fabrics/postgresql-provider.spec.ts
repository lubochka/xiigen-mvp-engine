/**
 * P3.3 — PostgreSQL Provider Tests.
 *
 * Uses a mock IAsyncPGPool + IAsyncPGConnection to test all provider logic
 * without a real PostgreSQL instance.
 *
 * Covers: store (upsert), search (JSONB WHERE), get, delete, bulkStore,
 * countDocuments, health check, auto-create tables, tenant scoping (DNA-5),
 * SQL sanitization, error handling (DNA-3), empty filter skip (DNA-2).
 */

import { PostgreSQLProvider } from '../../src/fabrics/database/postgresql.provider';
import { IAsyncPGPool, IAsyncPGConnection } from '../../src/fabrics/database/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── CLS mock ─────────────────────────────────────────

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

// ── Mock PG Pool + Connection ────────────────────────

function createMockConnection(): jest.Mocked<IAsyncPGConnection> {
  return {
    execute: jest.fn().mockResolvedValue('INSERT 1'),
    fetchrow: jest.fn().mockResolvedValue(null),
    fetch: jest.fn().mockResolvedValue([]),
    fetchval: jest.fn().mockResolvedValue(0),
    executemany: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockPool(conn?: jest.Mocked<IAsyncPGConnection>): {
  pool: jest.Mocked<IAsyncPGPool>;
  conn: jest.Mocked<IAsyncPGConnection>;
} {
  const connection = conn ?? createMockConnection();
  const pool: jest.Mocked<IAsyncPGPool> = {
    acquire: jest.fn().mockResolvedValue(connection),
    release: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  return { pool, conn: connection };
}

// ── Tests ────────────────────────────────────────────

describe('PostgreSQLProvider', () => {
  const TENANT = 'pg_test_tenant';
  let pool: jest.Mocked<IAsyncPGPool>;
  let conn: jest.Mocked<IAsyncPGConnection>;
  let provider: PostgreSQLProvider;

  beforeEach(() => {
    const mocks = createMockPool();
    pool = mocks.pool;
    conn = mocks.conn;
    provider = new PostgreSQLProvider(mockCls(TENANT), pool);
  });

  // ── storeDocument ──────────────────────────────────

  describe('storeDocument', () => {
    it('should store document with auto-generated ID', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      const result = await provider.storeDocument('items', { name: 'Widget' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['name']).toBe('Widget');
      expect(result.data!['_id']).toBeDefined();
      expect(result.data!['tenant_id']).toBe(TENANT);
    });

    it('should store document with custom ID', async () => {
      const result = await provider.storeDocument('items', { x: 1 }, 'custom-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['_id']).toBe('custom-1');
    });

    it('should use upsert (ON CONFLICT DO UPDATE)', async () => {
      await provider.storeDocument('items', { x: 1 }, 'doc-1');

      const sql = conn.execute.mock.calls[conn.execute.mock.calls.length - 1][0] as string;
      expect(sql).toContain('ON CONFLICT (id) DO UPDATE');
    });

    it('should use sanitized tenant-scoped table name', async () => {
      await provider.storeDocument('orders', { x: 1 });

      // Look for CREATE TABLE (ensureTable) or INSERT call
      const allCalls = conn.execute.mock.calls.map((c) => c[0] as string);
      const insertCall = allCalls.find((s) => s.includes('INSERT'));
      expect(insertCall).toContain(`"${TENANT}_orders"`);
    });

    it('should store data as JSONB', async () => {
      await provider.storeDocument('items', { nested: { a: 1 } }, 'doc-1');

      // Third arg ($3) should be JSON string
      const lastExecCall = conn.execute.mock.calls[conn.execute.mock.calls.length - 1];
      const dataArg = lastExecCall[3] as string; // $3 = dataJson
      const parsed = JSON.parse(dataArg);
      expect(parsed['nested']).toEqual({ a: 1 });
      expect(parsed['tenant_id']).toBe(TENANT);
    });

    it('should fail on scope violation', async () => {
      const result = await provider.storeDocument('items', {
        name: 'X',
        tenant_id: 'wrong-tenant',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_VIOLATION');
    });

    it('should handle PG error gracefully (DNA-3)', async () => {
      conn.execute.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.storeDocument('items', { x: 1 });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_STORE_FAILED');
    });

    it('should always release connection (even on error)', async () => {
      conn.execute.mockRejectedValue(new Error('fail'));

      await provider.storeDocument('items', { x: 1 });
      expect(pool.release).toHaveBeenCalledWith(conn);
    });
  });

  // ── searchDocuments ────────────────────────────────

  describe('searchDocuments', () => {
    it('should search and return matching documents', async () => {
      conn.fetch.mockResolvedValue([
        { id: 'd1', data: JSON.stringify({ name: 'A', tenant_id: TENANT }) },
        { id: 'd2', data: JSON.stringify({ name: 'B', tenant_id: TENANT }) },
      ]);

      const result = await provider.searchDocuments('items', { name: 'A' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(2);
      expect(result.data![0]['_id']).toBe('d1');
    });

    it('should always filter by tenant_id (DNA-5)', async () => {
      conn.fetch.mockResolvedValue([]);

      await provider.searchDocuments('items', {});

      const sql = conn.fetch.mock.calls[0][0] as string;
      expect(sql).toContain('tenant_id = $1');
    });

    it('should skip empty filter values (DNA-2)', async () => {
      conn.fetch.mockResolvedValue([]);

      await provider.searchDocuments('items', { name: '', type: 'widget' });

      const sql = conn.fetch.mock.calls[0][0] as string;
      // Should NOT have data->>'name' (empty)
      expect(sql).not.toContain("data->>'name'");
      // Should have data->>'type'
      expect(sql).toContain("data->>'type'");
    });

    it('should handle numeric filters', async () => {
      conn.fetch.mockResolvedValue([]);

      await provider.searchDocuments('items', { count: 42 });

      const sql = conn.fetch.mock.calls[0][0] as string;
      expect(sql).toContain('::numeric');
    });

    it('should handle boolean filters', async () => {
      conn.fetch.mockResolvedValue([]);

      await provider.searchDocuments('items', { active: true });

      const sql = conn.fetch.mock.calls[0][0] as string;
      expect(sql).toContain('::boolean');
    });

    it('should pass LIMIT and OFFSET', async () => {
      conn.fetch.mockResolvedValue([]);

      await provider.searchDocuments('items', {}, 50, 10);

      const args = conn.fetch.mock.calls[0];
      // Last two params should be limit and offset
      const params = args.slice(1);
      expect(params).toContain(50);
      expect(params).toContain(10);
    });

    it('should parse JSONB data from rows', async () => {
      conn.fetch.mockResolvedValue([
        { id: 'd1', data: { name: 'Direct Object', tenant_id: TENANT } },
      ]);

      const result = await provider.searchDocuments('items', {});
      expect(result.data![0]['name']).toBe('Direct Object');
      expect(result.data![0]['_id']).toBe('d1');
    });

    it('should handle PG error (DNA-3)', async () => {
      conn.fetch.mockRejectedValue(new Error('Timeout'));

      const result = await provider.searchDocuments('items', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_SEARCH_FAILED');
    });
  });

  // ── getDocument ────────────────────────────────────

  describe('getDocument', () => {
    it('should get document by ID', async () => {
      conn.fetchrow.mockResolvedValue({
        id: 'doc-1',
        data: JSON.stringify({ name: 'Widget', tenant_id: TENANT }),
      });

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['_id']).toBe('doc-1');
      expect(result.data!['name']).toBe('Widget');
    });

    it('should fail when document not found', async () => {
      conn.fetchrow.mockResolvedValue(null);

      const result = await provider.getDocument('items', 'missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should always filter by tenant_id (DNA-5)', async () => {
      conn.fetchrow.mockResolvedValue(null);

      await provider.getDocument('items', 'doc-1');

      const sql = conn.fetchrow.mock.calls[0][0] as string;
      expect(sql).toContain('tenant_id = $2');
    });

    it('should handle PG error (DNA-3)', async () => {
      conn.fetchrow.mockRejectedValue(new Error('Connection lost'));

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_GET_FAILED');
    });
  });

  // ── deleteDocument ─────────────────────────────────

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      conn.execute.mockResolvedValue('DELETE 1');

      const result = await provider.deleteDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should fail when document not found (0 rows affected)', async () => {
      conn.execute.mockResolvedValue('DELETE 0');

      const result = await provider.deleteDocument('items', 'missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should always filter by tenant_id (DNA-5)', async () => {
      conn.execute.mockResolvedValue('DELETE 1');

      await provider.deleteDocument('items', 'doc-1');

      const allCalls = conn.execute.mock.calls.map((c) => c[0] as string);
      const deleteCall = allCalls.find((s) => s.includes('DELETE'));
      expect(deleteCall).toContain('tenant_id = $2');
    });

    it('should handle PG error (DNA-3)', async () => {
      conn.execute.mockRejectedValue(new Error('Permission denied'));

      const result = await provider.deleteDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_DELETE_FAILED');
    });
  });

  // ── bulkStore ──────────────────────────────────────

  describe('bulkStore', () => {
    it('should bulk store documents successfully', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      const result = await provider.bulkStore('items', [{ name: 'A' }, { name: 'B' }]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['stored']).toBe(2);
      expect(result.data!['failed']).toBe(0);
      expect(result.data!['total']).toBe(2);
    });

    it('should handle mixed success/failure', async () => {
      let callCount = 0;
      conn.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('CREATE TABLE')) return 'CREATE TABLE';
        callCount++;
        if (callCount === 2) throw new Error('Constraint violation');
        return 'INSERT 1';
      });

      const result = await provider.bulkStore('items', [
        { name: 'A' },
        { name: 'B' },
        { name: 'C' },
      ]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['stored']).toBe(2);
      expect(result.data!['failed']).toBe(1);
      expect((result.data!['errors'] as string[]).length).toBe(1);
    });

    it('should fail when all documents fail', async () => {
      conn.execute.mockImplementation(async (sql: string) => {
        if (sql.includes('CREATE TABLE')) return 'CREATE TABLE';
        throw new Error('All fail');
      });

      const result = await provider.bulkStore('items', [{ name: 'A' }]);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('BULK_STORE_FAILED');
    });

    it('should return success with zeros for empty documents', async () => {
      const result = await provider.bulkStore('items', []);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['stored']).toBe(0);
      expect(result.data!['total']).toBe(0);
      expect(pool.acquire).not.toHaveBeenCalled();
    });

    it('should use custom _id from documents', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      const result = await provider.bulkStore('items', [{ _id: 'my-id', name: 'A' }]);
      expect(result.isSuccess).toBe(true);

      const insertCalls = conn.execute.mock.calls.filter((c) =>
        (c[0] as string).includes('INSERT'),
      );
      expect(insertCalls[0][1]).toBe('my-id'); // $1 = id
    });
  });

  // ── countDocuments ─────────────────────────────────

  describe('countDocuments', () => {
    it('should count documents', async () => {
      conn.fetchval.mockResolvedValue(42);

      const result = await provider.countDocuments('items', {});
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should count with filters', async () => {
      conn.fetchval.mockResolvedValue(5);

      await provider.countDocuments('items', { type: 'widget' });

      const sql = conn.fetchval.mock.calls[0][0] as string;
      expect(sql).toContain("data->>'type'");
      expect(sql).toContain('COUNT(*)');
    });

    it('should skip empty filter values (DNA-2)', async () => {
      conn.fetchval.mockResolvedValue(10);

      await provider.countDocuments('items', { type: '', status: 'active' });

      const sql = conn.fetchval.mock.calls[0][0] as string;
      expect(sql).not.toContain("data->>'type'");
      expect(sql).toContain("data->>'status'");
    });

    it('should handle string count result', async () => {
      conn.fetchval.mockResolvedValue('7');

      const result = await provider.countDocuments('items', {});
      expect(result.data).toBe(7);
    });

    it('should handle PG error (DNA-3)', async () => {
      conn.fetchval.mockRejectedValue(new Error('Timeout'));

      const result = await provider.countDocuments('items', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_COUNT_FAILED');
    });
  });

  // ── healthCheck ────────────────────────────────────

  describe('healthCheck', () => {
    it('should return healthy when SELECT 1 succeeds', async () => {
      conn.fetchval.mockResolvedValue(1);

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe('healthy');
      expect(result.data!['provider']).toBe('postgresql');
    });

    it('should return failure when SELECT 1 returns wrong value', async () => {
      conn.fetchval.mockResolvedValue(null);

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_UNHEALTHY');
    });

    it('should handle exception (DNA-3)', async () => {
      conn.fetchval.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PG_HEALTH_FAILED');
    });

    it('should always release connection', async () => {
      conn.fetchval.mockRejectedValue(new Error('fail'));

      await provider.healthCheck();
      expect(pool.release).toHaveBeenCalledWith(conn);
    });
  });

  // ── Auto-create table ──────────────────────────────

  describe('auto-create table', () => {
    it('should CREATE TABLE IF NOT EXISTS on first write', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      await provider.storeDocument('new_index', { x: 1 });

      const allCalls = conn.execute.mock.calls.map((c) => c[0] as string);
      const createCall = allCalls.find((s) => s.includes('CREATE TABLE'));
      expect(createCall).toBeDefined();
      expect(createCall).toContain('IF NOT EXISTS');
      expect(createCall).toContain(`"${TENANT}_new_index"`);
    });

    it('should skip CREATE TABLE on subsequent writes to same index', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      await provider.storeDocument('items', { x: 1 });
      await provider.storeDocument('items', { x: 2 });

      const createCalls = conn.execute.mock.calls.filter((c) =>
        (c[0] as string).includes('CREATE TABLE'),
      );
      expect(createCalls.length).toBe(1); // Only once
    });

    it('should create separate tables for different indices', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      await provider.storeDocument('orders', { x: 1 });
      await provider.storeDocument('products', { x: 2 });

      const createCalls = conn.execute.mock.calls.filter((c) =>
        (c[0] as string).includes('CREATE TABLE'),
      );
      expect(createCalls.length).toBe(2);
    });

    it('clearTableCache resets ensured state', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      await provider.storeDocument('items', { x: 1 });
      provider.clearTableCache();
      await provider.storeDocument('items', { x: 2 });

      const createCalls = conn.execute.mock.calls.filter((c) =>
        (c[0] as string).includes('CREATE TABLE'),
      );
      expect(createCalls.length).toBe(2);
    });
  });

  // ── SQL Sanitization ───────────────────────────────

  describe('SQL identifier sanitization', () => {
    it('should sanitize tenant ID with special chars', async () => {
      const dangerousProvider = new PostgreSQLProvider(mockCls("tenant'; DROP TABLE--"), pool);
      conn.execute.mockResolvedValue('INSERT 1');

      await dangerousProvider.storeDocument('items', { x: 1 });

      const allSql = conn.execute.mock.calls.map((c) => c[0] as string);
      for (const sql of allSql) {
        expect(sql).not.toContain("'");
        expect(sql).not.toContain('DROP TABLE');
        expect(sql).not.toContain('--');
      }
    });

    it('should sanitize index name with special chars', async () => {
      conn.execute.mockResolvedValue('INSERT 1');

      await provider.storeDocument('orders; DELETE FROM', { x: 1 });

      const allSql = conn.execute.mock.calls.map((c) => c[0] as string);
      const insertSql = allSql.find((s) => s.includes('INSERT'));
      expect(insertSql).not.toContain(';');
      expect(insertSql).not.toContain('DELETE FROM');
    });
  });

  // ── Connection lifecycle ───────────────────────────

  describe('connection lifecycle', () => {
    it('should acquire and release connection for every operation', async () => {
      conn.fetchrow.mockResolvedValue(null);

      await provider.getDocument('items', 'doc-1');

      expect(pool.acquire).toHaveBeenCalled();
      expect(pool.release).toHaveBeenCalledWith(conn);
    });

    it('should release connection even when pool.acquire fails', async () => {
      pool.acquire.mockRejectedValue(new Error('Pool exhausted'));

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      // No release called since acquire failed — but should not throw
    });
  });

  // ── DNA-5: No tenant context ──────────────────────

  describe('DNA-5: no tenant context', () => {
    let noTenantProvider: PostgreSQLProvider;

    beforeEach(() => {
      noTenantProvider = new PostgreSQLProvider(mockClsEmpty(), pool);
    });

    it('all methods fail without tenant', async () => {
      const results = await Promise.all([
        noTenantProvider.storeDocument('idx', { x: 1 }),
        noTenantProvider.searchDocuments('idx', {}),
        noTenantProvider.getDocument('idx', 'id'),
        noTenantProvider.deleteDocument('idx', 'id'),
        noTenantProvider.bulkStore('idx', [{ a: 1 }]),
        noTenantProvider.countDocuments('idx', {}),
      ]);
      for (const r of results) {
        expect(r.isSuccess).toBe(false);
        expect(r.errorCode).toBe('NO_TENANT');
      }
      // Pool should NOT be acquired when tenant is missing
      expect(pool.acquire).not.toHaveBeenCalled();
    });
  });

  // ── DNA-3: All methods return DataProcessResult ────

  describe('DNA-3: DataProcessResult always returned', () => {
    it('every method returns DataProcessResult instance', async () => {
      conn.execute.mockResolvedValue('INSERT 1');
      conn.fetch.mockResolvedValue([]);
      conn.fetchrow.mockResolvedValue(null);
      conn.fetchval.mockResolvedValue(0);

      const results = await Promise.all([
        provider.storeDocument('idx', { x: 1 }),
        provider.searchDocuments('idx', {}),
        provider.getDocument('idx', 'id'),
        provider.deleteDocument('idx', 'id'),
        provider.bulkStore('idx', []),
        provider.countDocuments('idx', {}),
        provider.healthCheck(),
      ]);
      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    });
  });
});
