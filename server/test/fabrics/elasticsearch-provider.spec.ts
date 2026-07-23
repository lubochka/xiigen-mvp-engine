/**
 * P3.2 — Elasticsearch Provider Tests.
 *
 * Uses a mock IAsyncElasticsearchClient to test all provider logic
 * without a real Elasticsearch instance.
 *
 * Covers: store, search (DNA-2), get, delete, bulkStore, countDocuments,
 * health check, tenant scoping (DNA-5), error handling (DNA-3).
 */

import { ElasticsearchProvider } from '../../src/fabrics/database/elasticsearch.provider';
import {
  IAsyncElasticsearchClient,
  EsIndexResult,
  EsGetResult,
  EsSearchResult,
  EsBulkResult,
  EsCountResult,
} from '../../src/fabrics/database/base';
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

// ── Mock ES Client ───────────────────────────────────

function createMockEsClient(): jest.Mocked<IAsyncElasticsearchClient> {
  return {
    index: jest.fn(),
    get: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
    bulk: jest.fn(),
    count: jest.fn(),
    ping: jest.fn(),
    close: jest.fn(),
    indices: {
      create: jest.fn(),
    },
  };
}

// ── Tests ────────────────────────────────────────────

describe('ElasticsearchProvider', () => {
  const TENANT = 'es-test-tenant';
  let client: jest.Mocked<IAsyncElasticsearchClient>;
  let provider: ElasticsearchProvider;

  beforeEach(() => {
    client = createMockEsClient();
    provider = new ElasticsearchProvider(mockCls(TENANT), client);
  });

  // ── storeDocument ──────────────────────────────────

  describe('storeDocument', () => {
    it('should store document with auto-generated ID', async () => {
      client.index.mockResolvedValue({
        _id: 'gen-id',
        _index: `${TENANT}_items`,
        result: 'created',
      });

      const result = await provider.storeDocument('items', { name: 'Widget' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['name']).toBe('Widget');
      expect(result.data!['_id']).toBe('gen-id');
      expect(result.data!['tenant_id']).toBe(TENANT);

      // Verify ES client was called with correct scoped index
      expect(client.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${TENANT}_items`,
          document: expect.objectContaining({ name: 'Widget', tenant_id: TENANT }),
        }),
      );
    });

    it('should store document with custom ID', async () => {
      client.index.mockResolvedValue({
        _id: 'custom-1',
        _index: `${TENANT}_items`,
        result: 'created',
      });

      const result = await provider.storeDocument('items', { x: 1 }, 'custom-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['_id']).toBe('custom-1');
      expect(client.index).toHaveBeenCalledWith(expect.objectContaining({ id: 'custom-1' }));
    });

    it('should enforce tenant scope on document (DNA-5)', async () => {
      client.index.mockResolvedValue({ _id: 'id1', _index: '', result: 'created' });

      const result = await provider.storeDocument('items', { name: 'X' });
      expect(result.isSuccess).toBe(true);
      // enforceScope adds tenant_id
      const storedDoc = client.index.mock.calls[0][0].document;
      expect(storedDoc['tenant_id']).toBe(TENANT);
    });

    it('should fail on scope violation (wrong tenant_id in doc)', async () => {
      const result = await provider.storeDocument('items', {
        name: 'X',
        tenant_id: 'wrong-tenant',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_VIOLATION');
    });

    it('should handle ES error gracefully (DNA-3)', async () => {
      client.index.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.storeDocument('items', { name: 'X' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_STORE_FAILED');
      expect(result.errorMessage).toContain('Connection refused');
    });

    it('should use tenant-scoped index name', async () => {
      client.index.mockResolvedValue({ _id: 'id1', _index: '', result: 'created' });

      await provider.storeDocument('orders', { x: 1 });
      expect(client.index.mock.calls[0][0].index).toBe(`${TENANT}_orders`);
    });
  });

  // ── searchDocuments ────────────────────────────────

  describe('searchDocuments', () => {
    it('should search and return matching documents', async () => {
      const searchResult: EsSearchResult = {
        hits: {
          total: { value: 2, relation: 'eq' },
          hits: [
            { _id: 'd1', _index: '', _source: { name: 'A', tenant_id: TENANT } },
            { _id: 'd2', _index: '', _source: { name: 'B', tenant_id: TENANT } },
          ],
        },
      };
      client.search.mockResolvedValue(searchResult);

      const result = await provider.searchDocuments('items', { name: 'A' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(2);
      expect(result.data![0]['_id']).toBe('d1');
      expect(result.data![0]['name']).toBe('A');
    });

    it('should skip empty filter values (DNA-2)', async () => {
      client.search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });

      await provider.searchDocuments('items', { name: '', type: null as any, active: true });

      // Verify the ES query only has non-empty filters + tenant_id
      const body = client.search.mock.calls[0][0].body as any;
      const musts = body.query.bool.must as any[];
      // Must have tenant_id clause
      expect(musts.some((m: any) => m.term?.tenant_id === TENANT)).toBe(true);
      // Must have 'active' clause but NOT name or type (empty/null)
      expect(musts.some((m: any) => m.term?.active)).toBe(true);
      expect(musts.some((m: any) => m.term?.name !== undefined)).toBe(false);
    });

    it('should pass size and fromOffset', async () => {
      client.search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });

      await provider.searchDocuments('items', {}, 50, 10);

      const body = client.search.mock.calls[0][0].body as any;
      expect(body.size).toBe(50);
      expect(body.from).toBe(10);
    });

    it('should use tenant-scoped index', async () => {
      client.search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });

      await provider.searchDocuments('logs', {});
      expect(client.search.mock.calls[0][0].index).toBe(`${TENANT}_logs`);
    });

    it('should handle ES error (DNA-3)', async () => {
      client.search.mockRejectedValue(new Error('Index not found'));

      const result = await provider.searchDocuments('items', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_SEARCH_FAILED');
    });

    it('should return empty array for no hits', async () => {
      client.search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });

      const result = await provider.searchDocuments('items', { x: 'nope' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toEqual([]);
    });
  });

  // ── getDocument ────────────────────────────────────

  describe('getDocument', () => {
    it('should get document by ID', async () => {
      client.get.mockResolvedValue({
        _id: 'doc-1',
        _index: `${TENANT}_items`,
        found: true,
        _source: { name: 'Widget', tenant_id: TENANT },
      });

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['_id']).toBe('doc-1');
      expect(result.data!['name']).toBe('Widget');
    });

    it('should fail when document not found', async () => {
      client.get.mockResolvedValue({
        _id: 'missing',
        _index: '',
        found: false,
        _source: {},
      });

      const result = await provider.getDocument('items', 'missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should fail on tenant mismatch (DNA-5)', async () => {
      client.get.mockResolvedValue({
        _id: 'doc-1',
        _index: '',
        found: true,
        _source: { name: 'X', tenant_id: 'other-tenant' },
      });

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_VIOLATION');
    });

    it('should handle NotFoundError exception', async () => {
      const err = new Error('not_found');
      (err as any).statusCode = 404;
      client.get.mockRejectedValue(err);

      const result = await provider.getDocument('items', 'missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle generic ES error (DNA-3)', async () => {
      client.get.mockRejectedValue(new Error('Connection timeout'));

      const result = await provider.getDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_GET_FAILED');
    });
  });

  // ── deleteDocument ─────────────────────────────────

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      client.delete.mockResolvedValue({ result: 'deleted' });

      const result = await provider.deleteDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
      expect(client.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${TENANT}_items`,
          id: 'doc-1',
        }),
      );
    });

    it('should fail when document not found', async () => {
      const err = new Error('not_found');
      (err as any).statusCode = 404;
      client.delete.mockRejectedValue(err);

      const result = await provider.deleteDocument('items', 'missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle generic ES error (DNA-3)', async () => {
      client.delete.mockRejectedValue(new Error('Permission denied'));

      const result = await provider.deleteDocument('items', 'doc-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_DELETE_FAILED');
    });
  });

  // ── bulkStore ──────────────────────────────────────

  describe('bulkStore', () => {
    it('should bulk store documents successfully', async () => {
      client.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'd1', status: 201 } }, { index: { _id: 'd2', status: 201 } }],
      });

      const result = await provider.bulkStore('items', [{ name: 'A' }, { name: 'B' }]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['stored']).toBe(2);
      expect(result.data!['failed']).toBe(0);
      expect(result.data!['total']).toBe(2);
    });

    it('should handle mixed success/failure', async () => {
      client.bulk.mockResolvedValue({
        errors: true,
        items: [
          { index: { _id: 'd1', status: 201 } },
          { index: { _id: 'd2', status: 400, error: { reason: 'mapping error' } } },
          { index: { _id: 'd3', status: 201 } },
        ],
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
      client.bulk.mockResolvedValue({
        errors: true,
        items: [{ index: { _id: 'd1', status: 400, error: { reason: 'bad' } } }],
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
      expect(client.bulk).not.toHaveBeenCalled();
    });

    it('should use custom _id from documents', async () => {
      client.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'my-id', status: 201 } }],
      });

      await provider.bulkStore('items', [{ _id: 'my-id', name: 'A' }]);

      const ops = client.bulk.mock.calls[0][0].operations;
      expect((ops[0] as any).index._id).toBe('my-id');
    });

    it('should enforce tenant scope on each document (DNA-5)', async () => {
      client.bulk.mockResolvedValue({
        errors: false,
        items: [{ index: { _id: 'd1', status: 201 } }],
      });

      await provider.bulkStore('items', [{ name: 'A' }]);

      const docBody = client.bulk.mock.calls[0][0].operations[1] as any;
      expect(docBody['tenant_id']).toBe(TENANT);
    });

    it('should fail on scope violation in bulk', async () => {
      const result = await provider.bulkStore('items', [{ name: 'A', tenant_id: 'wrong-tenant' }]);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_VIOLATION');
    });
  });

  // ── countDocuments ─────────────────────────────────

  describe('countDocuments', () => {
    it('should count documents', async () => {
      client.count.mockResolvedValue({ count: 42 });

      const result = await provider.countDocuments('items', {});
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(42);
    });

    it('should count with filters', async () => {
      client.count.mockResolvedValue({ count: 5 });

      await provider.countDocuments('items', { type: 'widget' });

      const body = client.count.mock.calls[0][0].body as any;
      expect(body.query.bool.must.length).toBeGreaterThan(1);
    });

    it('should skip empty filter values (DNA-2)', async () => {
      client.count.mockResolvedValue({ count: 10 });

      await provider.countDocuments('items', { type: '', status: 'active' });

      const body = client.count.mock.calls[0][0].body as any;
      const musts = body.query.bool.must;
      // Should have tenant_id + status, but NOT type (empty)
      expect(musts.some((m: any) => m.term?.status)).toBe(true);
      expect(musts.some((m: any) => m.term?.type !== undefined)).toBe(false);
    });

    it('should use tenant-scoped index', async () => {
      client.count.mockResolvedValue({ count: 0 });

      await provider.countDocuments('metrics', {});
      expect(client.count.mock.calls[0][0].index).toBe(`${TENANT}_metrics`);
    });

    it('should handle ES error (DNA-3)', async () => {
      client.count.mockRejectedValue(new Error('Timeout'));

      const result = await provider.countDocuments('items', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_COUNT_FAILED');
    });
  });

  // ── healthCheck ────────────────────────────────────

  describe('healthCheck', () => {
    it('should return healthy when ping succeeds', async () => {
      client.ping.mockResolvedValue(true);

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe('healthy');
      expect(result.data!['provider']).toBe('elasticsearch');
    });

    it('should return failure when ping returns false', async () => {
      client.ping.mockResolvedValue(false);

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_UNHEALTHY');
    });

    it('should handle ping exception (DNA-3)', async () => {
      client.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ES_HEALTH_FAILED');
    });
  });

  // ── DNA-5: No tenant context ──────────────────────

  describe('DNA-5: no tenant context', () => {
    let noTenantProvider: ElasticsearchProvider;

    beforeEach(() => {
      noTenantProvider = new ElasticsearchProvider(mockClsEmpty(), client);
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
    });
  });

  // ── DNA-3: All methods return DataProcessResult ────

  describe('DNA-3: DataProcessResult always returned', () => {
    it('every method returns DataProcessResult instance', async () => {
      client.index.mockResolvedValue({ _id: 'id', _index: '', result: 'created' });
      client.search.mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } });
      client.get.mockResolvedValue({
        _id: 'id',
        _index: '',
        found: true,
        _source: { tenant_id: TENANT },
      });
      client.delete.mockResolvedValue({});
      client.bulk.mockResolvedValue({ errors: false, items: [] });
      client.count.mockResolvedValue({ count: 0 });
      client.ping.mockResolvedValue(true);

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

  // ── Config: refresh setting ────────────────────────

  describe('config: refresh setting', () => {
    it('should pass refresh setting to ES calls', async () => {
      const waitForProvider = new ElasticsearchProvider(mockCls(TENANT), client, {
        refresh: 'wait_for',
      });
      client.index.mockResolvedValue({ _id: 'id', _index: '', result: 'created' });

      await waitForProvider.storeDocument('items', { x: 1 });
      expect(client.index.mock.calls[0][0].refresh).toBe('wait_for');
    });

    it('should default refresh to false', async () => {
      client.index.mockResolvedValue({ _id: 'id', _index: '', result: 'created' });

      await provider.storeDocument('items', { x: 1 });
      expect(client.index.mock.calls[0][0].refresh).toBe('false');
    });
  });
});
