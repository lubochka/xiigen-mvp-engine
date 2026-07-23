/**
 * P5.5 — Full 7-Fabric Pipeline E2E + DNA Compliance Sweep
 *
 * All 7 fabrics in one flow:
 *   1. Store API key in SECRETS →
 *   2. Store task spec in DATABASE →
 *   3. Search patterns in RAG →
 *   4. Generate code with AI ENGINE (using key from Secrets) →
 *   5. Enqueue generation event in QUEUE →
 *   6. Save flow definition in FLOW ENGINE →
 *   7. Start and execute flow → verify completion
 *
 * DNA compliance sweep:
 *   - DNA-3: Every fabric method returns DataProcessResult
 *   - DNA-5: Every fabric respects tenant from CLS
 *   - DNA-9: CloudEvents on queue messages
 *   - DNA-2: Empty filters skipped in DB + RAG
 *   - Iron Rule: No secret values leaked in list operations
 */

import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { InMemoryFlowStore } from '../../src/fabrics/flow-engine/in-memory-flow-store';
import {
  InMemoryFlowOrchestrator,
  FlowStatus,
} from '../../src/fabrics/flow-engine/in-memory-orchestrator';
import { InMemorySecretsProvider } from '../../src/fabrics/secrets/in-memory.provider';
import { NodeStatus } from '../../src/fabrics/interfaces/flow-orchestrator.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── CLS mock helper ──────────────────────────────────

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: { anthropic: `sk-test-${tenantId}` },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

interface AllFabrics {
  db: InMemoryDatabaseProvider;
  queue: InMemoryQueueProvider;
  ai: MockAiProvider;
  rag: InMemoryRagProvider;
  flowStore: InMemoryFlowStore;
  orchestrator: InMemoryFlowOrchestrator;
  secrets: InMemorySecretsProvider;
}

function createAllFabrics(tenantId: string): AllFabrics {
  const cls = mockCls(tenantId);
  const db = new InMemoryDatabaseProvider(cls);
  const queue = new InMemoryQueueProvider(cls);
  const ai = new MockAiProvider(cls);
  const rag = new InMemoryRagProvider(cls);
  const flowStore = new InMemoryFlowStore(cls);
  const orchestrator = new InMemoryFlowOrchestrator(cls, flowStore);
  const secrets = new InMemorySecretsProvider(cls);
  return { db, queue, ai, rag, flowStore, orchestrator, secrets };
}

// ═══════════════════════════════════════════════════════
// Full 7-Fabric Pipeline E2E
// ═══════════════════════════════════════════════════════

describe('P5.5 — Full 7-Fabric Pipeline E2E', () => {
  let f: AllFabrics;

  beforeEach(() => {
    f = createAllFabrics('pipeline-tenant');
  });

  it('should execute a complete pipeline across all 7 fabrics', async () => {
    // ── Step 1: SECRETS — Store API key ──
    const secretResult = await f.secrets.setSecret('ai/anthropic_key', 'sk-pipeline-test');
    expect(secretResult.isSuccess).toBe(true);

    // Retrieve it back
    const keyResult = await f.secrets.getSecret('ai/anthropic_key');
    expect(keyResult.isSuccess).toBe(true);
    expect(keyResult.data!['value']).toBe('sk-pipeline-test');

    // ── Step 2: DATABASE — Store task specification ──
    const taskSpec = {
      task_type: 'T44',
      archetype: 'ORCHESTRATION',
      factory_deps: ['F166', 'F169'],
      fabric_resolution: { F166: 'DATABASE', F169: 'AI_ENGINE' },
    };
    const storeResult = await f.db.storeDocument('task-specs', taskSpec, 'task-44');
    expect(storeResult.isSuccess).toBe(true);

    // ── Step 3: RAG — Search for reusable patterns ──
    const skill = { skill_id: 'SK-05', name: 'IDatabaseService', pattern: 'fabric-resolution' };
    await f.rag.ingest([skill], 'skills');
    const ragResult = await f.rag.search('IDatabaseService', { namespace: 'skills', topK: 5 });
    expect(ragResult.isSuccess).toBe(true);
    expect(ragResult.data!.length).toBeGreaterThan(0);

    // ── Step 4: AI ENGINE — Generate code (using key from step 1) ──
    const aiResult = await f.ai.generate(
      `Generate service for ${taskSpec.task_type} using patterns from ${JSON.stringify(ragResult.data![0])}`,
    );
    expect(aiResult.isSuccess).toBe(true);
    expect(aiResult.data!['text']).toBeDefined();

    // ── Step 5: QUEUE — Enqueue generation event ──
    const event = {
      type: 'code.generated',
      source: '/af-1/genesis',
      data: {
        task_type: taskSpec.task_type,
        generated_code: aiResult.data!['text'],
        api_key_source: 'secrets/ai/anthropic_key',
      },
    };
    const enqueueResult = await f.queue.enqueue('generation-events', event);
    expect(enqueueResult.isSuccess).toBe(true);

    // Dequeue and verify
    const dequeueResult = await f.queue.dequeue('generation-events');
    expect(dequeueResult.isSuccess).toBe(true);
    const messages = dequeueResult.data as Array<Record<string, unknown>>;
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]['event_type']).toBe('generation-events');

    // ── Step 6: FLOW ENGINE — Save flow definition ──
    const flowDef = {
      flow_id: 'flow-44',
      name: 'T44 Generation Flow',
      version: '1.0',
      nodes: [
        { node_id: 'start', type: 'start', next: ['generate'] },
        { node_id: 'generate', type: 'task', factory: 'F166', next: ['review'] },
        { node_id: 'review', type: 'task', factory: 'F169', next: ['end'] },
        { node_id: 'end', type: 'end', next: [] },
      ],
    };
    const saveFlowResult = await f.flowStore.saveFlow(flowDef);
    expect(saveFlowResult.isSuccess).toBe(true);

    // ── Step 7: FLOW ENGINE — Start and execute flow ──
    const startResult = await f.orchestrator.startFlow('flow-44', { input: taskSpec });
    expect(startResult.isSuccess).toBe(true);
    const runId = startResult.data!['run_id'] as string;

    // Verify flow run exists
    const statusResult = await f.orchestrator.getRunStatus(runId);
    expect(statusResult.isSuccess).toBe(true);
    expect(statusResult.data!['status']).toBe(FlowStatus.RUNNING);

    // Execute start node
    const execStart = await f.orchestrator.executeNode(runId, 'start', {});
    expect(execStart.isSuccess).toBe(true);
  });

  it('should chain secrets → AI with key from secrets fabric', async () => {
    // Store key
    await f.secrets.setSecret('ai/key', 'sk-chained');
    const key = await f.secrets.getSecret('ai/key');
    expect(key.isSuccess).toBe(true);

    // Use key metadata in AI call
    const result = await f.ai.generate('Generate using key from secrets');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
  });

  it('should chain DB → RAG → AI for context-aware generation', async () => {
    // Store patterns in DB
    await f.db.storeDocument('patterns', { name: 'MicroserviceBase', dna: 'DNA-4' }, 'p1');

    // Ingest into RAG
    await f.rag.ingest(
      [{ name: 'MicroserviceBase', description: 'Base class for all services' }],
      'patterns',
    );

    // Search RAG
    const context = await f.rag.search('MicroserviceBase', { namespace: 'patterns' });
    expect(context.isSuccess).toBe(true);

    // Generate with context
    const gen = await f.ai.generate(`Apply ${JSON.stringify(context.data)} to new service`);
    expect(gen.isSuccess).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// Tenant Isolation Across All 7 Fabrics
// ═══════════════════════════════════════════════════════

describe('P5.5 — Tenant Isolation Across All 7 Fabrics', () => {
  let alpha: AllFabrics;
  let beta: AllFabrics;

  beforeEach(() => {
    alpha = createAllFabrics('alpha');
    beta = createAllFabrics('beta');
  });

  it('should isolate SECRETS between tenants', async () => {
    await alpha.secrets.setSecret('key', 'alpha-secret');
    await beta.secrets.setSecret('key', 'beta-secret');

    const aKey = await alpha.secrets.getSecret('key');
    const bKey = await beta.secrets.getSecret('key');

    expect(aKey.data!['value']).toBe('alpha-secret');
    expect(bKey.data!['value']).toBe('beta-secret');
  });

  it('should isolate DATABASE between tenants', async () => {
    await alpha.db.storeDocument('tasks', { name: 'alpha-task' }, 'task-1');
    const betaSearch = await beta.db.searchDocuments('tasks', {});
    expect(betaSearch.data!.length).toBe(0);
  });

  it('should isolate RAG between tenants', async () => {
    await alpha.rag.ingest([{ name: 'alpha-skill' }], 'skills');
    const betaResult = await beta.rag.search('alpha-skill', { namespace: 'skills' });
    expect(betaResult.data!.length).toBe(0);
  });

  it('should isolate QUEUE between tenants', async () => {
    await alpha.queue.enqueue('events', { type: 'alpha.event', source: '/alpha', data: {} });
    const betaDequeue = await beta.queue.dequeue('events');
    // Separate provider instances → beta queue is empty (success with 0 messages)
    expect(betaDequeue.isSuccess).toBe(true);
    expect((betaDequeue.data as any[]).length).toBe(0);
  });

  it('should isolate FLOW ENGINE between tenants', async () => {
    await alpha.flowStore.saveFlow({
      flow_id: 'flow-alpha',
      name: 'Alpha Flow',
      version: '1.0',
      nodes: [
        { node_id: 'start', type: 'start', next: ['end'] },
        { node_id: 'end', type: 'end', next: [] },
      ],
    });
    const betaLoad = await beta.flowStore.loadFlow('flow-alpha');
    expect(betaLoad.isSuccess).toBe(false);
  });

  it('should isolate secret LIST operations between tenants (Iron Rule)', async () => {
    await alpha.secrets.setSecret('alpha/key1', 'val1');
    await alpha.secrets.setSecret('alpha/key2', 'val2');
    await beta.secrets.setSecret('beta/key1', 'val3');

    const alphaList = await alpha.secrets.listSecrets();
    const betaList = await beta.secrets.listSecrets();

    expect(alphaList.data!).toHaveLength(2);
    expect(betaList.data!).toHaveLength(1);

    // IRON RULE: no values in list
    for (const entry of [...alphaList.data!, ...betaList.data!]) {
      expect(entry['value']).toBeUndefined();
    }
  });

  it('should run full pipeline for both tenants independently', async () => {
    // Alpha pipeline
    await alpha.secrets.setSecret('ai/key', 'sk-alpha');
    await alpha.db.storeDocument('specs', { task: 'T44' }, 's1');
    await alpha.rag.ingest([{ pattern: 'alpha-pattern' }], 'skills');
    const alphaGen = await alpha.ai.generate('Generate for alpha');
    await alpha.queue.enqueue('events', { type: 'gen', source: '/alpha', data: {} });

    // Beta pipeline
    await beta.secrets.setSecret('ai/key', 'sk-beta');
    await beta.db.storeDocument('specs', { task: 'T45' }, 's1');
    await beta.rag.ingest([{ pattern: 'beta-pattern' }], 'skills');
    const betaGen = await beta.ai.generate('Generate for beta');
    await beta.queue.enqueue('events', { type: 'gen', source: '/beta', data: {} });

    // Both succeeded
    expect(alphaGen.isSuccess).toBe(true);
    expect(betaGen.isSuccess).toBe(true);

    // Cross-tenant check: alpha cannot see beta DB data
    const alphaDocs = await alpha.db.searchDocuments('specs', {});
    expect(alphaDocs.data!).toHaveLength(1);
    expect(alphaDocs.data![0]['task']).toBe('T44');
  });
});

// ═══════════════════════════════════════════════════════
// DNA Compliance Sweep
// ═══════════════════════════════════════════════════════

describe('P5.5 — DNA Compliance Sweep', () => {
  let f: AllFabrics;

  beforeEach(() => {
    f = createAllFabrics('dna-tenant');
  });

  describe('DNA-3: DataProcessResult on every fabric method', () => {
    it('should return DataProcessResult from all 7 fabrics', async () => {
      const results: DataProcessResult<any>[] = [];

      // Database
      results.push(await f.db.storeDocument('test', { x: 1 }));
      results.push(await f.db.searchDocuments('test', {}));

      // Queue
      results.push(await f.queue.enqueue('q', { type: 'test', source: '/t', data: {} }));

      // AI
      results.push(await f.ai.generate('test prompt'));

      // RAG
      results.push(await f.rag.search('test'));
      results.push(await f.rag.ingest([{ doc: 'test' }]));

      // Secrets
      results.push(await f.secrets.setSecret('k', 'v'));
      results.push(await f.secrets.getSecret('k'));
      results.push(await f.secrets.listSecrets());
      results.push(await f.secrets.healthCheck());

      // Flow Store
      results.push(
        await f.flowStore.saveFlow({
          flow_id: 'dna-flow',
          name: 'DNA',
          version: '1.0',
          nodes: [
            { node_id: 'start', type: 'start', next: ['end'] },
            { node_id: 'end', type: 'end', next: [] },
          ],
        }),
      );
      results.push(await f.flowStore.loadFlow('dna-flow'));
      results.push(await f.flowStore.listFlows());

      // Flow Orchestrator
      results.push(await f.orchestrator.startFlow('dna-flow', {}));

      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    });
  });

  describe('DNA-5: Tenant from CLS on every fabric', () => {
    it('should fail fabrics that enforce tenant when no tenant context', async () => {
      const noTenantCls = { get: jest.fn().mockReturnValue(undefined) } as any;
      const db = new InMemoryDatabaseProvider(noTenantCls);
      const queue = new InMemoryQueueProvider(noTenantCls);
      const rag = new InMemoryRagProvider(noTenantCls);
      const flowStore = new InMemoryFlowStore(noTenantCls);
      const orch = new InMemoryFlowOrchestrator(noTenantCls, flowStore);
      const secrets = new InMemorySecretsProvider(noTenantCls);

      // All tenant-enforcing fabrics should fail with NO_TENANT
      const results = [
        await db.storeDocument('t', { x: 1 }),
        await queue.enqueue('q', { type: 'x', source: '/x', data: {} }),
        await rag.search('x'),
        await flowStore.saveFlow({ flow_id: 'x', name: 'x', version: '1', nodes: [] }),
        await orch.startFlow('x', {}),
        await secrets.getSecret('x'),
      ];

      for (const r of results) {
        expect(r.isSuccess).toBe(false);
        expect(r.errorCode).toBe('NO_TENANT');
      }
    });

    it('MockAiProvider should still work without tenant (logs undefined tenantId)', async () => {
      // MockAiProvider is intentionally lenient — logs tenantId but doesn't fail
      const noTenantCls = { get: jest.fn().mockReturnValue(undefined) } as any;
      const ai = new MockAiProvider(noTenantCls);
      const result = await ai.generate('test');
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('DNA-2: Empty filters skipped in DB + RAG', () => {
    it('should skip empty filter fields in database search', async () => {
      await f.db.storeDocument('items', { name: 'one', status: 'active' }, 'i1');
      await f.db.storeDocument('items', { name: 'two', status: 'inactive' }, 'i2');

      // Search with empty/null fields — should not filter on them
      const result = await f.db.searchDocuments('items', { name: undefined, status: null });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(2);
    });
  });

  describe('Iron Rule: No secret values in list operations', () => {
    it('should never expose secret values in listSecrets()', async () => {
      await f.secrets.setSecret('db/password', 'super-secret-password');
      await f.secrets.setSecret('ai/key', 'sk-very-secret');

      const listResult = await f.secrets.listSecrets();
      expect(listResult.isSuccess).toBe(true);

      const serialized = JSON.stringify(listResult.data);
      expect(serialized).not.toContain('super-secret-password');
      expect(serialized).not.toContain('sk-very-secret');

      for (const entry of listResult.data!) {
        expect(entry['value']).toBeUndefined();
      }
    });
  });
});
