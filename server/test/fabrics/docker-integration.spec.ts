/**
 * Docker Integration Tests — Real Fabric Providers
 *
 * GROUP A — Always runs (in-memory, zero docker):
 *   Same patterns as docker but with in-memory providers.
 *   Runs in every CI pass. Catches provider logic bugs.
 *
 * GROUP B — Docker only (registered when SKIP_DOCKER_TESTS=0):
 *   Tests against real Elasticsearch on port 19200.
 *   Requires: docker compose -f docker-compose.test.yml --profile infra up -d
 *   Run with: cd server && npm run test:docker
 *
 * Provider pattern: ALL providers use mockCls('tenantId') in constructor.
 * Matches every other test in server/test/fabrics/.
 *
 * Ports (from docker-compose.test.yml at project root):
 *   Elasticsearch: 19200
 *   Redis:         16379
 *   PostgreSQL:    15432
 *   LocalStack:    14566
 */

import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { IAsyncElasticsearchClient } from '../../src/fabrics/database/base';

// ── mockCls helper (same pattern as all other fabric tests) ──

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant-${tenantId}`,
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

// Register docker-dependent blocks only when SKIP_DOCKER_TESTS=0.
const RUN_DOCKER = process.env.SKIP_DOCKER_TESTS === '0';

// ══════════════════════════════════════════════════════
// GROUP A — In-Memory providers (always runs, zero docker)
// ══════════════════════════════════════════════════════

describe('DATABASE FABRIC — In-Memory (always runs)', () => {
  it('should store a document and stamp tenant_id', async () => {
    const { InMemoryDatabaseProvider } =
      await import('../../src/fabrics/database/in-memory.provider');
    const db = new InMemoryDatabaseProvider(mockCls('t1'));
    const result = await db.storeDocument('test-index', { name: 'Widget' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe('t1');
  });

  it('should isolate tenant-A from tenant-B documents (DNA-5)', async () => {
    const { InMemoryDatabaseProvider } =
      await import('../../src/fabrics/database/in-memory.provider');
    const dbA = new InMemoryDatabaseProvider(mockCls('ta'));
    const dbB = new InMemoryDatabaseProvider(mockCls('tb'));

    await dbA.storeDocument('shared', { secret: 'A-only' }, 'doc-a');
    await dbB.storeDocument('shared', { secret: 'B-only' }, 'doc-b');

    const fromA = await dbA.searchDocuments('shared', {});
    if (fromA.data && Array.isArray(fromA.data)) {
      for (const doc of fromA.data as Array<Record<string, unknown>>) {
        expect(doc['tenant_id']).toBe('ta');
      }
    }
  });

  it('should fail without tenant context (DNA-5)', async () => {
    const { InMemoryDatabaseProvider } =
      await import('../../src/fabrics/database/in-memory.provider');
    const db = new InMemoryDatabaseProvider(mockClsEmpty());
    const result = await db.storeDocument('idx', { val: 1 });
    expect(result.isSuccess).toBe(false);
  });

  it('should return DataProcessResult on all calls (DNA-3)', async () => {
    const { InMemoryDatabaseProvider } =
      await import('../../src/fabrics/database/in-memory.provider');
    const db = new InMemoryDatabaseProvider(mockCls('t1'));
    const r1 = await db.storeDocument('idx', { x: 1 });
    const r2 = await db.searchDocuments('idx', {});
    expect(r1).toHaveProperty('isSuccess');
    expect(r2).toHaveProperty('isSuccess');
  });
});

describe('QUEUE FABRIC — In-Memory (always runs)', () => {
  it('should enqueue and dequeue a message', async () => {
    const { InMemoryQueueProvider } = await import('../../src/fabrics/queue/in-memory.provider');
    const q = new InMemoryQueueProvider(mockCls('t1'));
    const enq = await q.enqueue('test.event', { payload: 42 });
    expect(enq.isSuccess).toBe(true);
    const deq = await q.dequeue('test.event', 1);
    expect(deq.isSuccess).toBe(true);
  });

  it('should isolate queue depth between tenants (DNA-5)', async () => {
    // WF-2: getQueueDepth(tenantId, queueName) — synchronous, 2 params, raw number return
    const { InMemoryQueueProvider } = await import('../../src/fabrics/queue/in-memory.provider');
    const qA = new InMemoryQueueProvider(mockCls('qa'));
    const qB = new InMemoryQueueProvider(mockCls('qb'));
    await qA.enqueue('stream', { from: 'A' });
    await qB.enqueue('stream', { from: 'B' });
    const dA = qA.getQueueDepth('qa', 'stream');
    const dB = qB.getQueueDepth('qb', 'stream');
    expect(dA).toBe(1);
    expect(dB).toBe(1);
  });
});

describe('RAG FABRIC — In-Memory (always runs)', () => {
  it('should ingest and find documents', async () => {
    const { InMemoryRagProvider } = await import('../../src/fabrics/rag/in-memory.provider');
    const rag = new InMemoryRagProvider(mockCls('t1'));
    await rag.ingest([{ content: 'MicroserviceBase DNA pattern', type: 'pattern' }]);
    const result = await rag.search('MicroserviceBase', { topK: 3 });
    expect(result.isSuccess).toBe(true);
    if (result.data && Array.isArray(result.data)) {
      expect(result.data.length).toBeGreaterThan(0);
    }
  });

  it('should isolate namespaces between tenants (DNA-5)', async () => {
    const { InMemoryRagProvider } = await import('../../src/fabrics/rag/in-memory.provider');
    const ragA = new InMemoryRagProvider(mockCls('rta'));
    const ragB = new InMemoryRagProvider(mockCls('rtb'));
    await ragA.ingest([{ content: 'TenantA private' }], 'ns');
    await ragB.ingest([{ content: 'TenantB private' }], 'ns');
    const searchB = await ragB.search('TenantA', { topK: 5, namespace: 'ns' });
    if (searchB.data && Array.isArray(searchB.data)) {
      for (const doc of searchB.data as Array<Record<string, unknown>>) {
        expect(String(doc['content'] ?? '')).not.toContain('TenantA private');
      }
    }
  });
});

describe('SECRETS FABRIC — In-Memory (always runs)', () => {
  it('should store and retrieve secret per-tenant (P2)', async () => {
    const { InMemorySecretsProvider } =
      await import('../../src/fabrics/secrets/in-memory.provider');
    const s = new InMemorySecretsProvider(mockCls('s1'));
    await s.setSecret('ai-key', 'sk-test-abc');
    const r = await s.getSecret('ai-key');
    expect(r.isSuccess).toBe(true);
    expect((r.data as any).value).toBe('sk-test-abc');
  });

  it('should isolate secrets between tenants (P1)', async () => {
    const { InMemorySecretsProvider } =
      await import('../../src/fabrics/secrets/in-memory.provider');
    const sA = new InMemorySecretsProvider(mockCls('sa'));
    const sB = new InMemorySecretsProvider(mockCls('sb'));
    await sA.setSecret('key', 'value-a');
    await sB.setSecret('key', 'value-b');
    expect(((await sA.getSecret('key')).data as any).value).toBe('value-a');
    expect(((await sB.getSecret('key')).data as any).value).toBe('value-b');
  });
});

// ══════════════════════════════════════════════════════
// GROUP B — Docker-dependent (registered when SKIP_DOCKER_TESTS=0)
// Run: docker compose -f docker-compose.test.yml --profile infra up -d
// Then: cd server && npm run test:docker
// ══════════════════════════════════════════════════════

// WF-3: ElasticsearchProvider(cls, IAsyncElasticsearchClient, config?)
// Second arg is NOT {url} — must be a real IAsyncElasticsearchClient implementation.
// Fetch-based wrapper below satisfies the interface using Node 22 built-in fetch.
// delete() returns Promise<Record<string, unknown>> — use r.json(), not hardcoded literal.

function createRealEsClient(baseUrl: string): IAsyncElasticsearchClient {
  return {
    index: async ({ index, document, id }) => {
      const url = id ? `${baseUrl}/${index}/_doc/${id}` : `${baseUrl}/${index}/_doc`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });
      const body = (await res.json()) as Record<string, unknown>;
      return {
        _id: (body._id as string) ?? id ?? '',
        _index: index,
        result: (body.result as string) ?? 'created',
      };
    },
    search: async ({ index, body: query }) => {
      const res = await fetch(`${baseUrl}/${index}/_search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      const body = (await res.json()) as Record<string, unknown>;
      const hits = body.hits as Record<string, unknown>;
      return {
        hits: {
          hits: (hits?.hits as any[]) ?? [],
          total: { value: (hits?.total as any)?.value ?? 0, relation: 'eq' },
        },
      };
    },
    delete: async ({ index, id }) => {
      const r = await fetch(`${baseUrl}/${index}/_doc/${id}`, { method: 'DELETE' });
      return (await r.json()) as Record<string, unknown>;
    },
    get: async ({ index, id }) => {
      const r = await fetch(`${baseUrl}/${index}/_doc/${id}`);
      const b = (await r.json()) as Record<string, unknown>;
      return {
        _id: b._id as string,
        _index: index,
        _source: (b._source as Record<string, unknown>) ?? {},
        found: b.found as boolean,
      };
    },
    bulk: async () => ({ errors: false, items: [] }),
    count: async ({ index }) => {
      const r = await fetch(`${baseUrl}/${index}/_count`);
      const b = (await r.json()) as Record<string, unknown>;
      return { count: (b.count as number) ?? 0 };
    },
    ping: async () => {
      const r = await fetch(baseUrl);
      return r.ok;
    },
    close: async () => {},
    indices: {
      create: async ({ index, body: mappings }) => {
        const r = await fetch(`${baseUrl}/${index}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappings ?? {}),
        });
        return (await r.json()) as Record<string, unknown>;
      },
    },
  } as IAsyncElasticsearchClient;
}

if (RUN_DOCKER) {
describe('DATABASE FABRIC — Elasticsearch real provider', () => {
  const TEST_ES_URL = process.env.TEST_ES_URL ?? 'http://localhost:19200';

  it('should store and retrieve from real Elasticsearch', async () => {
    const { ElasticsearchProvider } =
      await import('../../src/fabrics/database/elasticsearch.provider');
    const es = new ElasticsearchProvider(mockCls('es-t1'), createRealEsClient(TEST_ES_URL));

    const storeResult = await es.storeDocument(
      'xiigen_docker_test',
      { name: 'docker-test', run: Date.now() },
      'docker-doc-1',
    );
    expect(storeResult.isSuccess).toBe(true);

    await new Promise((r) => setTimeout(r, 1500)); // ES indexing delay

    const searchResult = await es.searchDocuments('xiigen_docker_test', { _id: 'docker-doc-1' });
    expect(searchResult.isSuccess).toBe(true);

    await es.deleteDocument('xiigen_docker_test', 'docker-doc-1');
  }, 20_000);

  it('should return DataProcessResult (not throw) for missing doc (DNA-3)', async () => {
    const { ElasticsearchProvider } =
      await import('../../src/fabrics/database/elasticsearch.provider');
    const es = new ElasticsearchProvider(mockCls('es-t2'), createRealEsClient(TEST_ES_URL));
    const result = await es.searchDocuments('xiigen_docker_test', { _id: 'nonexistent-xyz' });
    expect(result).toHaveProperty('isSuccess');
    expect(typeof result.isSuccess).toBe('boolean');
  }, 10_000);
});
} else {
  describe('DATABASE FABRIC — Elasticsearch docker configuration', () => {
    it('requires SKIP_DOCKER_TESTS=0 to run real Elasticsearch provider checks', () => {
      expect(RUN_DOCKER).toBe(false);
    });
  });
}
