/**
 * P2.5 — Cross-Fabric Integration Tests.
 *
 * Validates that all 6 fabric providers compose correctly under
 * a single tenant context. Simulates a realistic engine pipeline:
 *   DB → Queue → RAG → AI → FlowEngine → Secrets
 *
 * Every assertion uses DataProcessResult (DNA-3).
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
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── CLS mock helper ──────────────────────────────────

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

// ── All-fabric factory ───────────────────────────────

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

// ── Tests ────────────────────────────────────────────

describe('P2.5 — Cross-Fabric Integration', () => {
  let fabrics: AllFabrics;

  beforeEach(() => {
    fabrics = createAllFabrics('integration-tenant');
  });

  describe('full engine pipeline: DB → Queue → RAG → AI → FlowEngine → Secrets', () => {
    it('should execute a complete pipeline across all 6 fabrics', async () => {
      const { db, queue, ai, rag, flowStore, orchestrator, secrets } = fabrics;

      // ── Step 1: Store a task specification in DATABASE FABRIC ──
      const taskSpec = {
        task_type: 'T44',
        archetype: 'INTEGRATION',
        name: 'MarketplaceListingService',
        factory_deps: ['F166', 'F167'],
      };
      const storeResult = await db.storeDocument('task-specs', taskSpec, 'T44');
      expect(storeResult.isSuccess).toBe(true);
      expect(storeResult.data!['_id']).toBe('T44');

      // ── Step 2: Enqueue a "task.created" event in QUEUE FABRIC ──
      const enqueueResult = await queue.enqueue('task.created', {
        task_id: 'T44',
        action: 'generate_code',
      });
      expect(enqueueResult.isSuccess).toBe(true);
      const messageId = enqueueResult.data!;
      expect(typeof messageId).toBe('string');

      // ── Step 3: Dequeue the event ──
      const dequeueResult = await queue.dequeue('task.created', 1);
      expect(dequeueResult.isSuccess).toBe(true);
      expect(dequeueResult.data!.length).toBe(1);
      const event = dequeueResult.data![0];
      // Dequeue returns { message_id, receipt_handle, body: CloudEvents, attributes, ... }
      const body = event['body'] as Record<string, unknown>;
      // CloudEvents envelope (DNA-9) is inside body
      expect(body['specversion']).toBe('1.0');
      expect(body['type']).toBe('task.created');

      // Acknowledge the message
      const receiptHandle = event['receipt_handle'] as string;
      const ackResult = await queue.acknowledge('task.created', receiptHandle);
      expect(ackResult.isSuccess).toBe(true);

      // ── Step 4: Ingest and search patterns in RAG FABRIC ──
      const ragDocs = [
        {
          title: 'Factory pattern for DB services',
          content: 'CreateAsync resolves via DATABASE FABRIC',
          tags: ['factory', 'database'],
        },
        {
          title: 'Queue event pattern',
          content: 'All inter-service calls use CloudEvents',
          tags: ['queue', 'events'],
        },
        {
          title: 'AI provider wrapper',
          content: 'Never import openai directly',
          tags: ['ai', 'fabric'],
        },
      ];
      const ingestResult = await rag.ingest(ragDocs, 'skills');
      expect(ingestResult.isSuccess).toBe(true);

      const searchResult = await rag.search('factory database pattern', {
        namespace: 'skills',
        topK: 2,
      });
      expect(searchResult.isSuccess).toBe(true);
      expect(searchResult.data!.length).toBeGreaterThan(0);

      // ── Step 5: Generate code using AI ENGINE FABRIC ──
      const prompt = `Generate service code for task T44 using patterns: ${JSON.stringify(searchResult.data![0])}`;
      const aiResult = await ai.generate(prompt, {
        systemPrompt: 'You are a code generator following DNA patterns.',
      });
      expect(aiResult.isSuccess).toBe(true);
      expect(aiResult.data!['text']).toBeDefined();
      expect(aiResult.data!['model']).toBeDefined();
      expect(aiResult.data!['tokens_used']).toBeDefined();

      // ── Step 6: Store a flow definition and execute in FLOW ENGINE FABRIC ──
      const flowDef = {
        flow_id: 'codegen-flow-1',
        name: 'Code Generation Pipeline',
        version: '1.0.0',
        nodes: [
          { node_id: 'extract', type: 'start', handler: 'inventory_extract' },
          { node_id: 'synthesize', type: 'task', handler: 'synthesis_generate' },
          { node_id: 'judge', type: 'end', handler: 'judgment_validate' },
        ],
        edges: [
          { source: 'extract', target: 'synthesize' },
          { source: 'synthesize', target: 'judge' },
        ],
      };
      const saveFlowResult = await flowStore.saveFlow(flowDef);
      expect(saveFlowResult.isSuccess).toBe(true);

      const startResult = await orchestrator.startFlow('codegen-flow-1', { task: 'T44' });
      expect(startResult.isSuccess).toBe(true);
      const runId = startResult.data!['run_id'] as string;
      expect(startResult.data!['status']).toBe(FlowStatus.RUNNING);

      // Execute nodes in order
      const execExtract = await orchestrator.executeNode(runId, 'extract', { task: 'T44' });
      expect(execExtract.isSuccess).toBe(true);
      expect(execExtract.data!['next_nodes']).toEqual(['synthesize']);

      const execSynth = await orchestrator.executeNode(runId, 'synthesize', { code: 'generated' });
      expect(execSynth.isSuccess).toBe(true);
      expect(execSynth.data!['next_nodes']).toEqual(['judge']);

      const execJudge = await orchestrator.executeNode(runId, 'judge', { verdict: 'pass' });
      expect(execJudge.isSuccess).toBe(true);

      // Flow should be complete
      const statusResult = await orchestrator.getRunStatus(runId);
      expect(statusResult.isSuccess).toBe(true);
      expect(statusResult.data!['status']).toBe(FlowStatus.COMPLETED);

      // ── Step 7: Store and retrieve a secret in SECRETS FABRIC ──
      const setSecretResult = await secrets.setSecret('xiigen/ai/api_key', 'sk-test-123', {
        provider: 'anthropic',
      });
      expect(setSecretResult.isSuccess).toBe(true);

      const getSecretResult = await secrets.getSecret('xiigen/ai/api_key');
      expect(getSecretResult.isSuccess).toBe(true);
      expect(getSecretResult.data!['value']).toBe('sk-test-123');
    });
  });

  describe('cross-fabric data flow: DB stores result from AI + RAG', () => {
    it('should search RAG, generate with AI, then store in DB', async () => {
      const { db, ai, rag } = fabrics;

      // Ingest skill patterns
      await rag.ingest(
        [
          {
            title: 'MicroserviceBase pattern',
            content: 'All services extend MicroserviceBase with 19 components',
          },
        ],
        'patterns',
      );

      // Search for relevant patterns
      const patterns = await rag.search('MicroserviceBase', { namespace: 'patterns' });
      expect(patterns.isSuccess).toBe(true);

      // Use AI to generate code based on patterns
      const generated = await ai.generate(`Generate based on: ${JSON.stringify(patterns.data)}`);
      expect(generated.isSuccess).toBe(true);

      // Store generation result in DB
      const stored = await db.storeDocument('generations', {
        task_type: 'T44',
        generated_code: generated.data!['text'],
        model_used: generated.data!['model'],
        patterns_used: patterns.data!.length,
      });
      expect(stored.isSuccess).toBe(true);

      // Verify retrieval
      const retrieved = await db.getDocument('generations', stored.data!['_id'] as string);
      expect(retrieved.isSuccess).toBe(true);
      expect(retrieved.data!['task_type']).toBe('T44');
      expect(retrieved.data!['patterns_used']).toBe(1);
    });
  });

  describe('cross-fabric data flow: Queue triggers Flow execution', () => {
    it('should enqueue event, dequeue it, then start flow based on event', async () => {
      const { queue, flowStore, orchestrator } = fabrics;

      // Save a flow definition
      await flowStore.saveFlow({
        flow_id: 'event-driven-flow',
        name: 'Event-Driven Flow',
        nodes: [
          { node_id: 'process', type: 'start', handler: 'process_event' },
          { node_id: 'complete', type: 'end', handler: 'mark_complete' },
        ],
        edges: [{ source: 'process', target: 'complete' }],
      });

      // Enqueue event
      const enqResult = await queue.enqueue('flow.trigger', {
        flow_id: 'event-driven-flow',
        payload: { x: 1 },
      });
      expect(enqResult.isSuccess).toBe(true);

      // Dequeue
      const deqResult = await queue.dequeue('flow.trigger', 1);
      expect(deqResult.isSuccess).toBe(true);
      const body = deqResult.data![0]['body'] as Record<string, unknown>;
      const eventData = body['data'] as Record<string, unknown>;
      const flowId = eventData['flow_id'] as string;

      // Start flow based on dequeued event
      const startResult = await orchestrator.startFlow(flowId, eventData);
      expect(startResult.isSuccess).toBe(true);
      expect(startResult.data!['status']).toBe(FlowStatus.RUNNING);
    });
  });

  describe('cross-fabric data flow: Secrets used in AI generation', () => {
    it('should retrieve secret then use it contextually with AI', async () => {
      const { secrets, ai } = fabrics;

      // Store API key as secret
      await secrets.setSecret('tenant/ai/key', 'sk-prod-key-xyz');

      // Retrieve secret
      const secretResult = await secrets.getSecret('tenant/ai/key');
      expect(secretResult.isSuccess).toBe(true);

      // Use AI provider (in real code, the key would be injected by TenantKeyResolver)
      // Here we verify the fabric composition works
      const aiResult = await ai.generate('Generate a summary', {
        systemPrompt: 'Use tenant-specific configuration',
      });
      expect(aiResult.isSuccess).toBe(true);
      expect(aiResult.data!['text']).toBeDefined();
    });
  });

  describe('cross-fabric round-trip: DB → Queue → DB', () => {
    it('should store doc, enqueue reference, dequeue, and update doc', async () => {
      const { db, queue } = fabrics;

      // Store initial doc
      const stored = await db.storeDocument(
        'items',
        { name: 'Task-X', status: 'pending' },
        'task-x',
      );
      expect(stored.isSuccess).toBe(true);

      // Enqueue processing event
      await queue.enqueue('item.process', { item_id: 'task-x', action: 'generate' });

      // Dequeue
      const deq = await queue.dequeue('item.process', 1);
      expect(deq.isSuccess).toBe(true);
      const deqBody = deq.data![0]['body'] as Record<string, unknown>;
      const deqData = deqBody['data'] as Record<string, unknown>;
      const itemId = deqData['item_id'] as string;

      // Fetch from DB using dequeued reference
      const fetched = await db.getDocument('items', itemId);
      expect(fetched.isSuccess).toBe(true);
      expect(fetched.data!['name']).toBe('Task-X');

      // Update by re-storing with same ID
      const updated = await db.storeDocument(
        'items',
        {
          ...fetched.data!,
          status: 'completed',
        },
        itemId,
      );
      expect(updated.isSuccess).toBe(true);
      expect(updated.data!['status']).toBe('completed');
    });
  });

  describe('all fabrics return DataProcessResult (DNA-3)', () => {
    it('every fabric method should return DataProcessResult, never throw', async () => {
      const { db, queue, ai, rag, flowStore, orchestrator, secrets } = fabrics;

      // Each of these must be a DataProcessResult — check isSuccess property exists
      const results = await Promise.all([
        db.storeDocument('test', { a: 1 }),
        db.searchDocuments('test', {}),
        db.getDocument('test', 'nonexistent'),
        db.deleteDocument('test', 'nonexistent'),
        db.bulkStore('test', [{ b: 2 }]),
        db.countDocuments('test', {}),
        queue.enqueue('test.event', { x: 1 }),
        ai.generate('test prompt'),
        ai.generateStructured('test', { type: 'object' }),
        rag.search('test query'),
        rag.ingest([{ title: 'doc' }]),
        flowStore.listFlows(),
        secrets.setSecret('test/key', 'val'),
        secrets.getSecret('test/key'),
        secrets.listSecrets(),
        secrets.healthCheck(),
      ]);

      for (const r of results) {
        expect(r).toBeDefined();
        expect(typeof r.isSuccess).toBe('boolean');
        // DNA-3: DataProcessResult has isSuccess, data, errorCode, errorMessage
        expect('data' in r).toBe(true);
        expect('errorCode' in r).toBe(true);
        expect('errorMessage' in r).toBe(true);
      }
    });
  });
});
