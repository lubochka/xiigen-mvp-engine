/**
 * P3.5 — Cross-Provider E2E Tests.
 *
 * Validates:
 *   - Provider switching via resolver config (InMemory → ES → PG, InMemory → SQS)
 *   - Index override routing (orders→PG, *→ES)
 *   - Fallback on health failure
 *   - Registry completeness (all providers registered)
 *   - Cross-provider pipeline (ES mock → SQS mock → PG mock)
 *   - Backward compatibility (existing tests unaffected)
 */

import { DatabaseProviderRegistry } from '../../src/fabrics/database/provider-registry';
import { DatabaseFabricResolver } from '../../src/fabrics/database/fabric-resolver';
import { DatabaseProviderType } from '../../src/fabrics/database/base';
import { QueueProviderRegistry } from '../../src/fabrics/queue/provider-registry';
import { QueueFabricResolver } from '../../src/fabrics/queue/fabric-resolver';
import { QueueProviderType } from '../../src/fabrics/queue/base';
import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { ElasticsearchProvider } from '../../src/fabrics/database/elasticsearch.provider';
import { PostgreSQLProvider } from '../../src/fabrics/database/postgresql.provider';
import { SqsProvider } from '../../src/fabrics/queue/sqs.provider';
import { QueueManager } from '../../src/fabrics/queue/queue-manager';
import { DlqHandler } from '../../src/fabrics/queue/dlq-handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── Helpers ──────────────────────────────────────────

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

function createMockEsClient() {
  return {
    index: jest.fn().mockResolvedValue({ _id: 'es-1', _index: '', result: 'created' }),
    get: jest
      .fn()
      .mockResolvedValue({
        _id: 'es-1',
        _index: '',
        found: true,
        _source: { tenant_id: 'cross-tenant', name: 'from-es' },
      }),
    search: jest
      .fn()
      .mockResolvedValue({ hits: { total: { value: 0, relation: 'eq' }, hits: [] } }),
    delete: jest.fn().mockResolvedValue({}),
    bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    count: jest.fn().mockResolvedValue({ count: 0 }),
    ping: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
  } as any;
}

function createMockPgPool() {
  const conn = {
    execute: jest.fn().mockResolvedValue('INSERT 1'),
    fetchrow: jest
      .fn()
      .mockResolvedValue({
        id: 'pg-1',
        data: JSON.stringify({ tenant_id: 'cross-tenant', name: 'from-pg' }),
      }),
    fetch: jest.fn().mockResolvedValue([]),
    fetchval: jest.fn().mockResolvedValue(1),
    executemany: jest.fn(),
  };
  return {
    pool: {
      acquire: jest.fn().mockResolvedValue(conn),
      release: jest.fn(),
      close: jest.fn(),
    } as any,
    conn,
  };
}

function createMockSqsClient() {
  return {
    sendMessage: jest.fn().mockResolvedValue({ MessageId: 'sqs-msg-1' }),
    receiveMessage: jest.fn().mockResolvedValue({ Messages: [] }),
    deleteMessage: jest.fn().mockResolvedValue({}),
    getQueueUrl: jest.fn().mockResolvedValue({ QueueUrl: 'https://sqs/q.fifo' }),
    getQueueAttributes: jest.fn().mockResolvedValue({ Attributes: { QueueArn: 'arn:sqs:q' } }),
    createQueue: jest
      .fn()
      .mockImplementation(async (p: any) => ({ QueueUrl: `https://sqs/${p.QueueName}` })),
    setQueueAttributes: jest.fn().mockResolvedValue({}),
  } as any;
}

// ── Tests ────────────────────────────────────────────

describe('P3.5 — Registry Completeness', () => {
  it('DatabaseProviderRegistry should register all 3 provider types', () => {
    const cls = mockCls('reg-test');
    const registry = new DatabaseProviderRegistry();

    registry.register(
      DatabaseProviderType.IN_MEMORY,
      async () => new InMemoryDatabaseProvider(cls),
    );
    registry.register(
      DatabaseProviderType.ELASTICSEARCH,
      async (c) => new ElasticsearchProvider(cls, c['client'] as any, c),
    );
    registry.register(
      DatabaseProviderType.POSTGRESQL,
      async (c) => new PostgreSQLProvider(cls, c['pool'] as any, c),
    );

    expect(registry.count).toBe(3);
    expect(registry.isRegistered(DatabaseProviderType.IN_MEMORY)).toBe(true);
    expect(registry.isRegistered(DatabaseProviderType.ELASTICSEARCH)).toBe(true);
    expect(registry.isRegistered(DatabaseProviderType.POSTGRESQL)).toBe(true);
    expect(registry.listProviders()).toHaveLength(3);
  });

  it('QueueProviderRegistry should register all 2 provider types', () => {
    const cls = mockCls('reg-test');
    const registry = new QueueProviderRegistry();

    registry.register(QueueProviderType.IN_MEMORY, async () => new InMemoryQueueProvider(cls));
    registry.register(
      QueueProviderType.SQS,
      async (c) => new SqsProvider(cls, c['client'] as any, c),
    );

    expect(registry.count).toBe(2);
    expect(registry.isRegistered(QueueProviderType.IN_MEMORY)).toBe(true);
    expect(registry.isRegistered(QueueProviderType.SQS)).toBe(true);
  });
});

describe('P3.5 — Provider Switching via Resolver', () => {
  const TENANT = 'switch-tenant';

  it('should resolve InMemory by default, then switch to ES after config change', async () => {
    const cls = mockCls(TENANT);
    const esClient = createMockEsClient();
    const registry = new DatabaseProviderRegistry();

    registry.register(
      DatabaseProviderType.IN_MEMORY,
      async () => new InMemoryDatabaseProvider(cls),
    );
    registry.register(
      DatabaseProviderType.ELASTICSEARCH,
      async () => new ElasticsearchProvider(cls, esClient),
    );

    const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

    // Default: InMemory
    const r1 = await resolver.resolve();
    expect(r1.isSuccess).toBe(true);
    expect(r1.data).toBeInstanceOf(InMemoryDatabaseProvider);

    // Switch to ES
    resolver.updateConfig({ defaultProvider: 'elasticsearch' });
    const r2 = await resolver.resolve();
    expect(r2.isSuccess).toBe(true);
    expect(r2.data).toBeInstanceOf(ElasticsearchProvider);
  });

  it('should resolve InMemory queue by default, then switch to SQS', async () => {
    const cls = mockCls(TENANT);
    const sqsClient = createMockSqsClient();
    const registry = new QueueProviderRegistry();

    registry.register(QueueProviderType.IN_MEMORY, async () => new InMemoryQueueProvider(cls));
    registry.register(QueueProviderType.SQS, async () => new SqsProvider(cls, sqsClient));

    const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

    const r1 = await resolver.resolve();
    expect(r1.isSuccess).toBe(true);
    expect(r1.data).toBeInstanceOf(InMemoryQueueProvider);

    resolver.updateConfig({ defaultProvider: 'sqs' });
    const r2 = await resolver.resolve();
    expect(r2.isSuccess).toBe(true);
    expect(r2.data).toBeInstanceOf(SqsProvider);
  });
});

describe('P3.5 — Index Override Routing', () => {
  it('orders → PostgreSQL, everything else → Elasticsearch', async () => {
    const cls = mockCls('override-tenant');
    const esClient = createMockEsClient();
    const { pool } = createMockPgPool();
    const registry = new DatabaseProviderRegistry();

    registry.register(
      DatabaseProviderType.ELASTICSEARCH,
      async () => new ElasticsearchProvider(cls, esClient),
    );
    registry.register(
      DatabaseProviderType.POSTGRESQL,
      async () => new PostgreSQLProvider(cls, pool),
    );

    const resolver = new DatabaseFabricResolver(
      {
        defaultProvider: 'elasticsearch',
        overrides: { orders: 'postgresql' },
      },
      registry,
    );

    const esResult = await resolver.resolve('logs');
    expect(esResult.isSuccess).toBe(true);
    expect(esResult.data).toBeInstanceOf(ElasticsearchProvider);

    const pgResult = await resolver.resolve('orders');
    expect(pgResult.isSuccess).toBe(true);
    expect(pgResult.data).toBeInstanceOf(PostgreSQLProvider);

    // Verify routing info
    expect(resolver.getProviderForIndex('orders')).toBe('postgresql');
    expect(resolver.getProviderForIndex('logs')).toBe('elasticsearch');
    expect(resolver.getProviderForIndex('anything')).toBe('elasticsearch');
  });
});

describe('P3.5 — Fallback on Health Failure', () => {
  it('ES unhealthy → fallback to InMemory', async () => {
    const cls = mockCls('fallback-tenant');
    const sickEsClient = createMockEsClient();
    sickEsClient.ping.mockResolvedValue(false); // unhealthy

    const registry = new DatabaseProviderRegistry();
    registry.register(DatabaseProviderType.ELASTICSEARCH, async () => {
      const p = new ElasticsearchProvider(cls, sickEsClient);
      return p;
    });
    registry.register(
      DatabaseProviderType.IN_MEMORY,
      async () => new InMemoryDatabaseProvider(cls),
    );

    const resolver = new DatabaseFabricResolver(
      {
        defaultProvider: 'elasticsearch',
        fallbackProvider: 'in_memory',
      },
      registry,
    );

    const result = await resolver.resolve();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeInstanceOf(InMemoryDatabaseProvider);
  });
});

describe('P3.5 — Cross-Provider Pipeline', () => {
  const TENANT = 'cross-tenant';

  it('store in ES → enqueue via SQS → read from PG', async () => {
    const cls = mockCls(TENANT);
    const esClient = createMockEsClient();
    const sqsClient = createMockSqsClient();
    const { pool, conn: pgConn } = createMockPgPool();

    // Create providers
    const esProvider = new ElasticsearchProvider(cls, esClient);
    const sqsProvider = new SqsProvider(cls, sqsClient, { queueUrlPrefix: 'https://sqs.local' });
    const pgProvider = new PostgreSQLProvider(cls, pool);

    // Step 1: Store a task spec in Elasticsearch
    const storeResult = await esProvider.storeDocument(
      'task-specs',
      { type: 'T44', name: 'MarketplaceService' },
      'T44',
    );
    expect(storeResult.isSuccess).toBe(true);
    expect(storeResult.data!['_id']).toBe('es-1');
    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({ index: `${TENANT}_task-specs` }),
    );

    // Step 2: Enqueue a processing event via SQS
    const enqueueResult = await sqsProvider.enqueue('task.process', { taskId: 'T44' });
    expect(enqueueResult.isSuccess).toBe(true);
    expect(enqueueResult.data).toBe('sqs-msg-1');
    expect(sqsClient.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        MessageGroupId: TENANT,
      }),
    );

    // Verify CloudEvents envelope in SQS body
    const sqsBody = sqsClient.sendMessage.mock.calls[0][0].MessageBody;
    const envelope = JSON.parse(sqsBody);
    expect(envelope['specversion']).toBe('1.0');
    expect(envelope['type']).toBe('task.process');
    expect(envelope['data']['taskId']).toBe('T44');

    // Step 3: Read generated result from PostgreSQL
    const getResult = await pgProvider.getDocument('generations', 'pg-1');
    expect(getResult.isSuccess).toBe(true);
    expect(getResult.data!['name']).toBe('from-pg');
    expect(pgConn.fetchrow).toHaveBeenCalledWith(
      expect.stringContaining('"crosstenant_generations"'),
      'pg-1',
      TENANT,
    );
  });
});

describe('P3.5 — QueueManager + DlqHandler Integration', () => {
  it('should create queue + DLQ + reprocess a message', async () => {
    const sqsClient = createMockSqsClient();
    const manager = new QueueManager(sqsClient, { maxReceiveCount: 3 });
    const dlqHandler = new DlqHandler(sqsClient);

    // Step 1: Create queue with DLQ
    const dlqResult = await manager.ensureDlq('orders');
    expect(dlqResult.isSuccess).toBe(true);
    expect(dlqResult.data!['mainUrl']).toContain('orders.fifo');
    expect(dlqResult.data!['dlqUrl']).toContain('orders-dlq.fifo');

    // Step 2: Read from DLQ (simulated dead letter)
    sqsClient.receiveMessage.mockResolvedValueOnce({
      Messages: [
        {
          MessageId: 'dead-1',
          ReceiptHandle: 'rh-dead',
          Body: '{"event":"failed_order"}',
          MessageAttributes: {
            dlq_reason: { DataType: 'String', StringValue: 'Timeout' },
            original_queue: { DataType: 'String', StringValue: 'orders' },
            tenant_id: { DataType: 'String', StringValue: 'tenant-X' },
          },
        },
      ],
    });

    const readResult = await dlqHandler.readDlq(dlqResult.data!['dlqUrl']);
    expect(readResult.isSuccess).toBe(true);
    expect(readResult.data!.length).toBe(1);
    expect(readResult.data![0]['dlq_reason']).toBe('Timeout');

    // Step 3: Reprocess the message
    sqsClient.sendMessage.mockResolvedValueOnce({ MessageId: 'reprocessed-1' });
    const reprocessResult = await dlqHandler.reprocess(
      dlqResult.data!['dlqUrl'],
      dlqResult.data!['mainUrl'],
      'rh-dead',
      '{"event":"failed_order"}',
      'tenant-X',
    );
    expect(reprocessResult.isSuccess).toBe(true);
    expect(reprocessResult.data).toBe('reprocessed-1');
  });
});

describe('P3.5 — All Providers Use DataProcessResult (DNA-3)', () => {
  const TENANT = 'dna3-tenant';

  it('ES provider never throws — always DataProcessResult', async () => {
    const esClient = createMockEsClient();
    esClient.index.mockRejectedValue(new Error('fail'));
    esClient.search.mockRejectedValue(new Error('fail'));
    esClient.get.mockRejectedValue(new Error('fail'));
    esClient.delete.mockRejectedValue(new Error('fail'));
    esClient.count.mockRejectedValue(new Error('fail'));
    esClient.ping.mockRejectedValue(new Error('fail'));

    const provider = new ElasticsearchProvider(mockCls(TENANT), esClient);

    const results = await Promise.all([
      provider.storeDocument('idx', { x: 1 }),
      provider.searchDocuments('idx', {}),
      provider.getDocument('idx', 'id'),
      provider.deleteDocument('idx', 'id'),
      provider.countDocuments('idx', {}),
      provider.healthCheck(),
    ]);

    for (const r of results) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    }
  });

  it('PG provider never throws — always DataProcessResult', async () => {
    const { pool, conn } = createMockPgPool();
    conn.execute.mockRejectedValue(new Error('fail'));
    conn.fetch.mockRejectedValue(new Error('fail'));
    conn.fetchrow.mockRejectedValue(new Error('fail'));
    conn.fetchval.mockRejectedValue(new Error('fail'));

    const provider = new PostgreSQLProvider(mockCls(TENANT), pool);

    const results = await Promise.all([
      provider.storeDocument('idx', { x: 1 }),
      provider.searchDocuments('idx', {}),
      provider.getDocument('idx', 'id'),
      provider.deleteDocument('idx', 'id'),
      provider.countDocuments('idx', {}),
      provider.healthCheck(),
    ]);

    for (const r of results) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    }
  });

  it('SQS provider never throws — always DataProcessResult', async () => {
    const sqsClient = createMockSqsClient();
    sqsClient.sendMessage.mockRejectedValue(new Error('fail'));
    sqsClient.receiveMessage.mockRejectedValue(new Error('fail'));
    sqsClient.deleteMessage.mockRejectedValue(new Error('fail'));

    const provider = new SqsProvider(mockCls(TENANT), sqsClient, { queueUrlPrefix: 'https://x' });

    const results = await Promise.all([
      provider.enqueue('evt', { x: 1 }),
      provider.dequeue('q', 1),
      provider.acknowledge('q', 'rh'),
      provider.sendToDlq('q', {}, 'reason'),
    ]);

    for (const r of results) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(false);
    }
  });
});

describe('P3.5 — Backward Compatibility Verification', () => {
  it('InMemoryDatabaseProvider still works standalone', async () => {
    const db = new InMemoryDatabaseProvider(mockCls('compat'));
    const stored = await db.storeDocument('items', { name: 'test' });
    expect(stored.isSuccess).toBe(true);

    const found = await db.searchDocuments('items', {});
    expect(found.isSuccess).toBe(true);
    expect(found.data!.length).toBe(1);
  });

  it('InMemoryQueueProvider still works standalone', async () => {
    const q = new InMemoryQueueProvider(mockCls('compat'));
    const enq = await q.enqueue('test.event', { x: 1 });
    expect(enq.isSuccess).toBe(true);

    const deq = await q.dequeue('test.event', 1);
    expect(deq.isSuccess).toBe(true);
    expect(deq.data!.length).toBe(1);
  });

  it('exports are backward compatible — all P2 types importable', () => {
    // These imports should compile — if they don't, the barrel is broken
    expect(InMemoryDatabaseProvider).toBeDefined();
    expect(InMemoryQueueProvider).toBeDefined();
    expect(ElasticsearchProvider).toBeDefined();
    expect(PostgreSQLProvider).toBeDefined();
    expect(SqsProvider).toBeDefined();
    expect(DatabaseProviderRegistry).toBeDefined();
    expect(QueueProviderRegistry).toBeDefined();
    expect(DatabaseFabricResolver).toBeDefined();
    expect(QueueFabricResolver).toBeDefined();
    expect(QueueManager).toBeDefined();
    expect(DlqHandler).toBeDefined();
  });
});
