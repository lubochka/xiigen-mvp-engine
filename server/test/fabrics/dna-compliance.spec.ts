/**
 * P2.5 — DNA Compliance Tests for All Fabrics.
 *
 * Verifies that EVERY public method on EVERY fabric provider:
 *   DNA-1: Uses Record<string, unknown> (dict payloads), never typed models
 *   DNA-2: BuildSearchFilter skips empty fields
 *   DNA-3: Returns DataProcessResult, NEVER throws
 *   DNA-5: Returns failure when no tenant context (scope isolation)
 *   DNA-9: Queue messages wrapped in CloudEvents
 *
 * These tests intentionally pass bad/edge-case inputs to prove robustness.
 */

import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { InMemoryFlowStore } from '../../src/fabrics/flow-engine/in-memory-flow-store';
import { InMemoryFlowOrchestrator } from '../../src/fabrics/flow-engine/in-memory-orchestrator';
import { InMemorySecretsProvider } from '../../src/fabrics/secrets/in-memory.provider';
import {
  DataProcessResult,
  TenantContext,
  TENANT_CONTEXT_KEY,
  DEFAULT_PLAN,
} from '../../src/kernel';

// ── Helpers ──────────────────────────────────────────

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `T-${tenantId}`,
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

// ── DNA-3: Never throw, always DataProcessResult ─────

describe('P2.5 — DNA-3 Compliance: DataProcessResult, never throw', () => {
  describe('DATABASE FABRIC — all methods return DataProcessResult', () => {
    let db: InMemoryDatabaseProvider;
    beforeEach(() => {
      db = new InMemoryDatabaseProvider(mockCls('dna-t'));
    });

    it('storeDocument returns DataProcessResult', async () => {
      const r = await db.storeDocument('idx', { x: 1 });
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('searchDocuments returns DataProcessResult', async () => {
      const r = await db.searchDocuments('idx', { x: 'nonexistent' });
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('getDocument returns DataProcessResult on missing doc', async () => {
      const r = await db.getDocument('idx', 'does-not-exist');
      expect(r).toBeInstanceOf(DataProcessResult);
      // Should fail gracefully, not throw
    });

    it('deleteDocument returns DataProcessResult on missing doc', async () => {
      const r = await db.deleteDocument('idx', 'does-not-exist');
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('bulkStore returns DataProcessResult', async () => {
      const r = await db.bulkStore('idx', [{ a: 1 }, { b: 2 }]);
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('countDocuments returns DataProcessResult', async () => {
      const r = await db.countDocuments('idx', {});
      expect(r).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('QUEUE FABRIC — all methods return DataProcessResult', () => {
    let queue: InMemoryQueueProvider;
    beforeEach(() => {
      queue = new InMemoryQueueProvider(mockCls('dna-t'));
    });

    it('enqueue returns DataProcessResult', async () => {
      const r = await queue.enqueue('evt', { x: 1 });
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('dequeue returns DataProcessResult on empty queue', async () => {
      const r = await queue.dequeue('empty-queue', 1);
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
      expect(r.data).toEqual([]);
    });

    it('acknowledge returns DataProcessResult on bad handle', async () => {
      const r = await queue.acknowledge('q', 'bad-handle');
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('sendToDlq returns DataProcessResult', async () => {
      const r = await queue.sendToDlq('q', { msg: 'bad' }, 'processing error');
      expect(r).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('AI ENGINE FABRIC — all methods return DataProcessResult', () => {
    let ai: MockAiProvider;
    beforeEach(() => {
      ai = new MockAiProvider(mockCls('dna-t'));
    });

    it('generate returns DataProcessResult', async () => {
      const r = await ai.generate('test');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('generateStructured returns DataProcessResult', async () => {
      const r = await ai.generateStructured('test', { type: 'object' });
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('generate with failure mode returns DataProcessResult (not throw)', async () => {
      const failAi = new MockAiProvider(mockCls('dna-t'), { shouldFail: true });
      const r = await failAi.generate('test');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
      // Key: it did NOT throw
    });
  });

  describe('RAG FABRIC — all methods return DataProcessResult', () => {
    let rag: InMemoryRagProvider;
    beforeEach(() => {
      rag = new InMemoryRagProvider(mockCls('dna-t'));
    });

    it('search returns DataProcessResult on empty store', async () => {
      const r = await rag.search('anything');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });

    it('ingest returns DataProcessResult', async () => {
      const r = await rag.ingest([{ title: 'doc' }]);
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('buildContextPack returns DataProcessResult', async () => {
      const r = await rag.buildContextPack('query', 'code_patterns');
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('deleteByFilter returns DataProcessResult', async () => {
      const r = await rag.deleteByFilter('ns', { tag: 'old' });
      expect(r).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('FLOW ENGINE FABRIC — all methods return DataProcessResult', () => {
    let flowStore: InMemoryFlowStore;
    let orch: InMemoryFlowOrchestrator;
    beforeEach(() => {
      const cls = mockCls('dna-t');
      flowStore = new InMemoryFlowStore(cls);
      orch = new InMemoryFlowOrchestrator(cls, flowStore);
    });

    it('saveFlow returns DataProcessResult', async () => {
      const r = await flowStore.saveFlow({ flow_id: 'f1', nodes: [], edges: [] });
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('loadFlow returns DataProcessResult on missing flow', async () => {
      const r = await flowStore.loadFlow('nonexistent');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('listFlows returns DataProcessResult', async () => {
      const r = await flowStore.listFlows();
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('startFlow returns DataProcessResult on missing flow', async () => {
      const r = await orch.startFlow('nonexistent', {});
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('executeNode returns DataProcessResult on bad run', async () => {
      const r = await orch.executeNode('bad-run', 'node1', {});
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('getRunStatus returns DataProcessResult on bad run', async () => {
      const r = await orch.getRunStatus('bad-run');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('resumeFlow returns DataProcessResult on bad run', async () => {
      const r = await orch.resumeFlow('bad-run', 'node1', {});
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('cancelFlow returns DataProcessResult on bad run', async () => {
      const r = await orch.cancelFlow('bad-run', 'reason');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });
  });

  describe('SECRETS FABRIC — all methods return DataProcessResult', () => {
    let secrets: InMemorySecretsProvider;
    beforeEach(() => {
      secrets = new InMemorySecretsProvider(mockCls('dna-t'));
    });

    it('setSecret returns DataProcessResult', async () => {
      const r = await secrets.setSecret('p/k', 'val');
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('getSecret returns DataProcessResult on missing secret', async () => {
      const r = await secrets.getSecret('nonexistent/key');
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    });

    it('deleteSecret returns DataProcessResult', async () => {
      const r = await secrets.deleteSecret('nonexistent');
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('listSecrets returns DataProcessResult', async () => {
      const r = await secrets.listSecrets();
      expect(r).toBeInstanceOf(DataProcessResult);
    });

    it('healthCheck returns DataProcessResult', async () => {
      const r = await secrets.healthCheck();
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
    });
  });
});

// ── DNA-5: No tenant context → failure, never throw ──

describe('P2.5 — DNA-5 Compliance: No tenant = failure, not throw', () => {
  const noTenantCls = mockClsEmpty();

  it('DATABASE: all methods fail without tenant', async () => {
    const db = new InMemoryDatabaseProvider(noTenantCls);
    const results = await Promise.all([
      db.storeDocument('idx', { x: 1 }),
      db.searchDocuments('idx', {}),
      db.getDocument('idx', 'id'),
      db.deleteDocument('idx', 'id'),
      db.bulkStore('idx', [{ a: 1 }]),
      db.countDocuments('idx', {}),
    ]);
    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    }
  });

  it('QUEUE: all methods fail without tenant', async () => {
    const q = new InMemoryQueueProvider(noTenantCls);
    const results = await Promise.all([
      q.enqueue('evt', { x: 1 }),
      q.dequeue('q', 1),
      q.acknowledge('q', 'handle'),
      q.sendToDlq('q', { msg: 'bad' }, 'reason'),
    ]);
    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    }
  });

  it('RAG: all methods fail without tenant', async () => {
    const rag = new InMemoryRagProvider(noTenantCls);
    const results = await Promise.all([
      rag.search('q'),
      rag.ingest([{ title: 'doc' }]),
      rag.buildContextPack('q', 'type'),
      rag.deleteByFilter('ns', {}),
    ]);
    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    }
  });

  it('FLOW ENGINE: all methods fail without tenant', async () => {
    const cls = noTenantCls;
    const store = new InMemoryFlowStore(cls);
    const orch = new InMemoryFlowOrchestrator(cls, store);
    const results = await Promise.all([
      store.saveFlow({ flow_id: 'f1', nodes: [] }),
      store.loadFlow('f1'),
      store.listFlows(),
      orch.startFlow('f1', {}),
      orch.executeNode('r1', 'n1', {}),
      orch.getRunStatus('r1'),
      orch.resumeFlow('r1', 'n1', {}),
      orch.cancelFlow('r1', 'reason'),
    ]);
    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    }
  });

  it('SECRETS: all methods fail without tenant', async () => {
    const s = new InMemorySecretsProvider(noTenantCls);
    const results = await Promise.all([
      s.setSecret('p', 'v'),
      s.getSecret('p'),
      s.deleteSecret('p'),
      s.listSecrets(),
    ]);
    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    }
  });
});

// ── DNA-9: Queue wraps everything in CloudEvents ─────

describe('P2.5 — DNA-9 Compliance: CloudEvents envelope on queue messages', () => {
  let queue: InMemoryQueueProvider;

  beforeEach(() => {
    queue = new InMemoryQueueProvider(mockCls('ce-tenant'));
  });

  it('every dequeued message has CloudEvents fields', async () => {
    await queue.enqueue('order.placed', { orderId: '123', total: 99.99 });
    const deqResult = await queue.dequeue('order.placed', 1);
    expect(deqResult.isSuccess).toBe(true);

    const msg = deqResult.data![0];
    // Dequeue returns { message_id, receipt_handle, body: CloudEvents, ... }
    const body = msg['body'] as Record<string, unknown>;
    // CloudEvents v1.0 required fields inside body
    expect(body['specversion']).toBe('1.0');
    expect(body['type']).toBe('order.placed');
    expect(body['source']).toBeDefined();
    expect(body['id']).toBeDefined();
    expect(body['time']).toBeDefined();
    // Data preserved inside body
    expect(body['data']).toBeDefined();
    const data = body['data'] as Record<string, unknown>;
    expect(data['orderId']).toBe('123');
  });

  it('tenant_id is embedded in CloudEvents envelope', async () => {
    await queue.enqueue('test.event', { x: 1 });
    const deqResult = await queue.dequeue('test.event', 1);
    const msg = deqResult.data![0];
    const body = msg['body'] as Record<string, unknown>;
    // Tenant should be traceable in the envelope or message-level attributes
    const hasTenantInBody = body['tenantid'] || body['tenant_id'];
    const hasTenantInMsg = msg['tenant_id'];
    expect(hasTenantInBody || hasTenantInMsg).toBeDefined();
  });
});

// ── DNA-2: BuildSearchFilter skips empty fields ──────

describe('P2.5 — DNA-2 Compliance: Empty filter values skipped', () => {
  let db: InMemoryDatabaseProvider;

  beforeEach(async () => {
    db = new InMemoryDatabaseProvider(mockCls('dna2-t'));
    await db.storeDocument('items', { type: 'a', color: 'red' });
    await db.storeDocument('items', { type: 'b', color: 'blue' });
  });

  it('empty string filter is skipped (matches all)', async () => {
    const r = await db.searchDocuments('items', { type: '' });
    expect(r.data!.length).toBe(2);
  });

  it('null filter value is skipped', async () => {
    const r = await db.searchDocuments('items', { type: null as any });
    expect(r.data!.length).toBe(2);
  });

  it('undefined filter value is skipped', async () => {
    const r = await db.searchDocuments('items', { type: undefined as any });
    expect(r.data!.length).toBe(2);
  });

  it('mixed empty and real filters work correctly', async () => {
    const r = await db.searchDocuments('items', { type: 'a', color: '' });
    expect(r.data!.length).toBe(1);
    expect(r.data![0]['type']).toBe('a');
  });
});
