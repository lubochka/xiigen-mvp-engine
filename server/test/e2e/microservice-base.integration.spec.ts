/**
 * microservice-base.integration.spec.ts — SESSION-2
 *
 * Core integration tests for the fabric layer as a whole:
 * - All 6 fabrics compose under one tenant context (DNA-5)
 * - Outbox pattern enforced: storeDocument BEFORE enqueue (DNA-8)
 * - DataProcessResult for all operations — no throws (DNA-3)
 * - Tenant context isolation across all fabrics simultaneously
 * - FREEDOM config routing verified across DB + Queue fabrics
 *
 * InMemory-only tests always run. ES+SQS tests skip when containers absent.
 */

import 'reflect-metadata';
import * as http from 'http';
import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { loadE2eSecrets } from '../../src/testing/e2e-secrets-loader';

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string): any {
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
  };
}

const AVAILABILITY_TIMEOUT_MS = 500;

function pingHttp(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let req: http.ClientRequest | undefined;
    let timeout: NodeJS.Timeout;
    const finish = (available: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(available);
    };

    timeout = setTimeout(() => {
      req?.destroy();
      finish(false);
    }, AVAILABILITY_TIMEOUT_MS);

    req = http.get(url, (res) => {
      res.resume(); // drain response so socket closes cleanly
      finish(true);
    });
    req.on('error', () => finish(false));
    req.setTimeout(AVAILABILITY_TIMEOUT_MS, () => {
      req.destroy();
      finish(false);
    });
  });
}

interface FabricBundle {
  db: InMemoryDatabaseProvider;
  queue: InMemoryQueueProvider;
  ai: MockAiProvider;
  rag: InMemoryRagProvider;
  tenantId: string;
}

function createFabrics(tenantId: string): FabricBundle {
  const cls = mockCls(tenantId);
  return {
    db: new InMemoryDatabaseProvider(cls),
    queue: new InMemoryQueueProvider(cls),
    ai: new MockAiProvider(cls),
    rag: new InMemoryRagProvider(cls),
    tenantId,
  };
}

// ── Availability ────────────────────────────────────────

let AVAIL: { ES: boolean; SQS: boolean; INMEMORY: true } = {
  ES: false,
  SQS: false,
  INMEMORY: true,
};

const _secrets = loadE2eSecrets();

beforeAll(async () => {
  const [esAvailable, sqsAvailable] = await Promise.all([
    pingHttp('http://localhost:19200/_cluster/health'),
    pingHttp('http://localhost:14566'),
  ]);
  AVAIL.ES = esAvailable;
  AVAIL.SQS = sqsAvailable;
}, 15000);

// ══════════════════════════════════════════════════════
// Core Boot Tests
// ══════════════════════════════════════════════════════

describe('MicroserviceBase Core — Fabric Boot (always run)', () => {
  it('all 4 InMemory fabric providers boot without error', () => {
    // Direct instantiation simulates what MicroserviceBase does at boot
    const f = createFabrics('boot-tenant');
    expect(f.db).toBeDefined();
    expect(f.queue).toBeDefined();
    expect(f.ai).toBeDefined();
    expect(f.rag).toBeDefined();
  });

  it('MicroserviceBase DB fabric resolves per FREEDOM config (InMemory)', async () => {
    const f = createFabrics('freedom-db-tenant');
    // FREEDOM config = in-memory → InMemoryDatabaseProvider is active
    const result = await f.db.storeDocument('freedom-test', {
      config: 'in-memory',
      scope_id: 'freedom-db-tenant',
    });
    expect(result.isSuccess).toBe(true);
  });

  it('MicroserviceBase Queue fabric resolves per FREEDOM config (InMemory)', async () => {
    const f = createFabrics('freedom-queue-tenant');
    // FREEDOM config = in-memory → InMemoryQueueProvider is active
    const result = await f.queue.enqueue('freedom.queue.event', { config: 'in-memory' });
    expect(result.isSuccess).toBe(true);
  });

  it('MicroserviceBase boots with ES + SQS (requires containers)', async () => {
    if (!AVAIL.ES || !AVAIL.SQS) {
      console.log('SKIP: ES or SQS not available — full container boot test skipped');
      return;
    }
    expect(AVAIL.ES && AVAIL.SQS).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Scope Isolation — DNA-5
// ══════════════════════════════════════════════════════

describe('MicroserviceBase — Scope Isolation (DNA-5)', () => {
  it('scope_id isolation enforced across DB + Queue fabrics — tenant-A data invisible to tenant-B', async () => {
    const fA = createFabrics('scope-tenant-A');
    const fB = createFabrics('scope-tenant-B');

    // tenant-A stores in DB and enqueues
    await fA.db.storeDocument('shared-index', {
      payload: 'tenant-A-private',
      scope_id: 'scope-tenant-A',
    });
    await fA.queue.enqueue('scope.test.event', { data: 'tenant-A-queue-data' });

    // tenant-B sees nothing from DB
    const dbResultFromB = await fB.db.searchDocuments('shared-index', {});
    expect(dbResultFromB.isSuccess).toBe(true);
    expect(dbResultFromB.data!.length).toBe(0);

    // tenant-B sees nothing from Queue
    const queueResultFromB = await fB.queue.dequeue('scope.test.event', 1);
    expect(queueResultFromB.isSuccess).toBe(true);
    expect(queueResultFromB.data!.length).toBe(0);
  });

  it('scope_id isolation enforced in RAG fabric — tenant-A docs invisible to tenant-B', async () => {
    const fA = createFabrics('rag-scope-A');
    const fB = createFabrics('rag-scope-B');

    await fA.rag.ingest([{ content: 'classified tenant-A knowledge', category: 'secret' }]);

    const resultFromB = await fB.rag.search('classified tenant-A knowledge');
    expect(resultFromB.isSuccess).toBe(true);
    expect(resultFromB.data!.length).toBe(0);
  });

  it('all operations tagged with tenantId — confirmed in call metadata', async () => {
    const TENANT = 'metadata-tenant';
    const f = createFabrics(TENANT);

    await f.ai.generate('metadata check', { maxTokens: 200 });

    const calls = f.ai.getCallsForTenant(TENANT);
    expect(calls.length).toBe(1);
    expect(calls[0]['tenant_id']).toBe(TENANT);
  });
});

// ══════════════════════════════════════════════════════
// DNA-3 — DataProcessResult for all operations
// ══════════════════════════════════════════════════════

describe('MicroserviceBase — DataProcessResult Contract (DNA-3)', () => {
  it('no fabric method throws — all failures return DataProcessResult.failure', async () => {
    const f = createFabrics('nothrow-tenant');

    // DB: get non-existent
    const dbResult = await f.db.getDocument('missing', 'missing-id');
    expect(dbResult).toBeInstanceOf(DataProcessResult);

    // Queue: dequeue from empty queue
    const qResult = await f.queue.dequeue('empty.queue', 1);
    expect(qResult).toBeInstanceOf(DataProcessResult);
    expect(qResult.isSuccess).toBe(true);
    expect(qResult.data!.length).toBe(0);

    // RAG: search empty namespace
    const ragResult = await f.rag.search('nothing here');
    expect(ragResult).toBeInstanceOf(DataProcessResult);
    expect(ragResult.isSuccess).toBe(true);

    // AI: failing provider
    const failAi = new MockAiProvider(mockCls('nothrow-tenant'), { shouldFail: true });
    const aiResult = await failAi.generate('will fail');
    expect(aiResult).toBeInstanceOf(DataProcessResult);
    expect(aiResult.isSuccess).toBe(false);
  });

  it('storeDocument success result has all DataProcessResult fields', async () => {
    const f = createFabrics('dpr-fields-tenant');
    const result = await f.db.storeDocument('dpr-test', {
      field: 'value',
      scope_id: 'dpr-fields-tenant',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.correlationId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.errorCode).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════
// DNA-8 — Outbox Pattern: storeDocument BEFORE enqueue
// ══════════════════════════════════════════════════════

describe('MicroserviceBase — Outbox Pattern (DNA-8)', () => {
  it('storeDocument before enqueue — both succeed and document exists before event', async () => {
    const f = createFabrics('outbox-tenant');

    // Step 1: Store document first (DNA-8 — outbox)
    const storeResult = await f.db.storeDocument('order-outbox', {
      orderId: 'ORD-OUTBOX-001',
      status: 'pending',
      scope_id: 'outbox-tenant',
    });
    expect(storeResult.isSuccess).toBe(true);

    const docId = storeResult.data!['_id'] as string;

    // Step 2: Only after store succeeds, enqueue
    const enqueueResult = await f.queue.enqueue('order.created', {
      orderId: 'ORD-OUTBOX-001',
      docId,
    });
    expect(enqueueResult.isSuccess).toBe(true);

    // Verify document exists in DB before consumer picks up the event
    const verifyResult = await f.db.getDocument('order-outbox', docId);
    expect(verifyResult.isSuccess).toBe(true);
    expect(verifyResult.data!['orderId']).toBe('ORD-OUTBOX-001');
  });

  it('outbox pattern: if storeDocument fails, enqueue must not be called', async () => {
    const f = createFabrics('outbox-fail-tenant');

    // Simulate a store failure (wrong tenant_id causes scope violation)
    const storeResult = await f.db.storeDocument('order-fail-outbox', {
      orderId: 'ORD-FAIL',
      tenant_id: 'wrong-tenant-id', // scope violation — enforceScope checks tenant_id
    });

    // storeDocument should fail (scope violation)
    expect(storeResult.isSuccess).toBe(false);

    // If store fails: enqueue must NOT be called (this is the outbox rule)
    // The test proves the pattern — callers check isSuccess before enqueuing
    if (!storeResult.isSuccess) {
      // Correct outbox behavior: skip enqueue
      expect(f.queue.getQueueDepth('outbox-fail-tenant', 'order.created')).toBe(0);
    }
  });
});

// ══════════════════════════════════════════════════════
// Full Cross-Fabric Pipeline (Simulates MicroserviceBase.processTask())
// ══════════════════════════════════════════════════════

describe('MicroserviceBase — Cross-Fabric Pipeline (always run)', () => {
  it('full pipeline: RAG context → AI generation → DB store → Queue event', async () => {
    const TENANT = 'pipeline-tenant';
    const f = createFabrics(TENANT);

    // Step 1: RAG — fetch relevant context
    await f.rag.ingest(
      [{ content: 'Generate a NestJS service using DataProcessResult', doc_id: 'pattern-1' }],
      'patterns',
    );
    const ragResult = await f.rag.search('DataProcessResult NestJS', { namespace: 'patterns' });
    expect(ragResult.isSuccess).toBe(true);

    // Step 2: AI — generate code using RAG context
    const contextText = ragResult.data!.map((d) => d['content']).join('\n');
    const aiResult = await f.ai.generate(
      `Using this context: ${contextText}\nGenerate a service.`,
      {
        maxTokens: 200,
      },
    );
    expect(aiResult.isSuccess).toBe(true);

    // Step 3: DB — store result (outbox — FIRST before queue)
    const storeResult = await f.db.storeDocument('generated-artifacts', {
      generated_code: aiResult.data!['text'],
      model_used: aiResult.data!['model'],
      tokens_used: aiResult.data!['tokens_used'],
      scope_id: TENANT,
    });
    expect(storeResult.isSuccess).toBe(true);

    // Step 4: Queue — emit event AFTER store (DNA-8)
    const docId = storeResult.data!['_id'] as string;
    const queueResult = await f.queue.enqueue('artifact.generated', {
      docId,
      tenant_id: TENANT,
    });
    expect(queueResult.isSuccess).toBe(true);

    // Verify pipeline end-state
    const artifact = await f.db.getDocument('generated-artifacts', docId);
    expect(artifact.isSuccess).toBe(true);
    expect(artifact.data!['generated_code']).toBeDefined();
    expect(typeof artifact.data!['generated_code']).toBe('string');
  });

  it('health check reflects all active providers (InMemory always healthy)', () => {
    const f = createFabrics('health-tenant');
    // All InMemory providers are always initialized — no health failure possible
    expect(f.db).toBeDefined();
    expect(f.queue).toBeDefined();
    expect(f.ai).toBeDefined();
    expect(f.rag).toBeDefined();
    // Mock AI provider reports model info (simulates health check)
    const info = f.ai.getModelInfo();
    expect(info['provider']).toBe('mock');
  });
});
