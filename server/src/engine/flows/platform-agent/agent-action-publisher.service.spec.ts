/**
 * T654 AgentActionPublisher — unit tests (8 per FLOW-46 R1 test matrix).
 */
import { AgentActionPublisher } from './agent-action-publisher.service';
import { TenantScopeGateway } from './tenant-scope-gateway.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { TenantContext } from '../../../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

function masterContext(): TenantContext {
  return new TenantContext({
    id: MASTER_TENANT_ID,
    name: 'master',
    status: 'active',
    plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
    configOverrides: {},
    apiKeys: {},
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
  });
}

function tenantContext(id: string): TenantContext {
  return new TenantContext({
    id,
    name: id,
    status: 'active',
    plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
    configOverrides: {},
    apiKeys: {},
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
  });
}

interface MockCls {
  store: Map<string, unknown>;
  get: jest.Mock;
  runWith: jest.Mock;
}

function makeCls(initial: TenantContext | undefined): MockCls {
  const store = new Map<string, unknown>();
  if (initial) store.set('tenant', initial);
  const cls: MockCls = {
    store,
    get: jest.fn((key?: string) => (key ? store.get(key) : undefined)),
    runWith: jest.fn(async (overrides: Record<string, unknown>, fn: () => Promise<unknown>) => {
      const prior = new Map(store);
      for (const [k, v] of Object.entries(overrides)) store.set(k, v);
      try {
        return await fn();
      } finally {
        store.clear();
        for (const [k, v] of prior) store.set(k, v);
      }
    }),
  };
  return cls;
}

describe('AgentActionPublisher (T654)', () => {
  let callOrder: Array<{ op: string; index?: string; topic?: string }>;
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let cls: MockCls;
  let gateway: TenantScopeGateway;
  let publisher: AgentActionPublisher;

  beforeEach(() => {
    callOrder = [];
    mockDb = {
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push({ op: 'store', index });
        return DataProcessResult.success({});
      }),
    };
    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (topic: string) => {
        callOrder.push({ op: 'enqueue', topic });
        return DataProcessResult.success({});
      }),
    };
    cls = makeCls(masterContext());
    gateway = new TenantScopeGateway(mockDb as never, cls as never);
    publisher = new AgentActionPublisher(mockDb as never, mockQueue as never, gateway);
  });

  it('1. ADVISE → store under MASTER_TENANT_ID, knowledgeScope=PRIVATE', async () => {
    const result = await publisher.publish({
      actionId: 'a-1',
      sessionId: 's-1',
      actionType: 'ADVISE',
      adminTenantId: MASTER_TENANT_ID,
      payload: { advice: 'do X' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.tenantId).toBe(MASTER_TENANT_ID);
    expect(result.data!.knowledgeScope).toBe('PRIVATE');
  });

  it('2. PROPOSE_EDIT → cls.runWith called with target tenant context (forkToPrivate)', async () => {
    const result = await publisher.publish({
      actionId: 'a-2',
      sessionId: 's-2',
      actionType: 'PROPOSE_EDIT',
      adminTenantId: MASTER_TENANT_ID,
      targetTenantId: 'tenant-x',
      payload: { edit: '...' },
    });
    expect(result.isSuccess).toBe(true);
    expect(cls.runWith).toHaveBeenCalled();
    const overrides = cls.runWith.mock.calls[0]?.[0] as Record<string, unknown>;
    const ctx = overrides['tenant'] as TenantContext;
    expect(ctx.tenantId).toBe('tenant-x');
  });

  it('3. CREATE_FLOW → cls.runWith called + draft stored under target tenant', async () => {
    const result = await publisher.publish({
      actionId: 'a-3',
      sessionId: 's-3',
      actionType: 'CREATE_FLOW',
      adminTenantId: MASTER_TENANT_ID,
      targetTenantId: 'tenant-x',
      payload: { spec: '...' },
    });
    expect(result.isSuccess).toBe(true);
    expect(cls.runWith).toHaveBeenCalled();
    expect(result.data!.draftFlowId).toBeDefined();
  });

  it('4. APPLY_GLOBAL pre-check passes when CLS=MASTER_TENANT_ID', async () => {
    const result = await publisher.publish({
      actionId: 'a-4',
      sessionId: 's-4',
      actionType: 'APPLY_GLOBAL',
      adminTenantId: MASTER_TENANT_ID,
      payload: { template: 'global' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.knowledgeScope).toBe('GLOBAL');
  });

  it('5. APPLY_GLOBAL writes to xiigen-flow-templates', async () => {
    await publisher.publish({
      actionId: 'a-5',
      sessionId: 's-5',
      actionType: 'APPLY_GLOBAL',
      adminTenantId: MASTER_TENANT_ID,
      payload: { template: 'global' },
    });
    const templateWrite = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-flow-templates',
    );
    expect(templateWrite).toBeDefined();
  });

  it('6. DNA-8 — storeDocument BEFORE enqueue on every branch (ADVISE)', async () => {
    await publisher.publish({
      actionId: 'a-6',
      sessionId: 's-6',
      actionType: 'ADVISE',
      adminTenantId: MASTER_TENANT_ID,
      payload: {},
    });
    const storeIdx = callOrder.findIndex((c) => c.op === 'store');
    const enqueueIdx = callOrder.findIndex((c) => c.op === 'enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('7. APPLY_GLOBAL with non-MASTER caller → NOT_ADMIN', async () => {
    cls = makeCls(tenantContext('tenant-y'));
    gateway = new TenantScopeGateway(mockDb as never, cls as never);
    publisher = new AgentActionPublisher(mockDb as never, mockQueue as never, gateway);
    const result = await publisher.publish({
      actionId: 'a-7',
      sessionId: 's-7',
      actionType: 'APPLY_GLOBAL',
      adminTenantId: 'tenant-y',
      payload: {},
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_ADMIN');
  });

  it('8. PROPOSE_EDIT draft stored with tenantId=targetTenantId (not MASTER)', async () => {
    await publisher.publish({
      actionId: 'a-8',
      sessionId: 's-8',
      actionType: 'PROPOSE_EDIT',
      adminTenantId: MASTER_TENANT_ID,
      targetTenantId: 'tenant-x',
      payload: {},
    });
    const draftWrite = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-tenant-topologies',
    );
    expect(draftWrite).toBeDefined();
    const draftDoc = draftWrite![1] as Record<string, unknown>;
    expect(draftDoc['tenantId']).toBe('tenant-x');
  });

  it('9. PROPOSE_EDIT draft write failure returns DataProcessResult.failure', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      callOrder.push({ op: 'store', index });
      if (index === 'xiigen-tenant-topologies') {
        return DataProcessResult.failure('DB_ERROR', 'draft write failed');
      }
      return DataProcessResult.success({});
    });

    const result = await publisher.publish({
      actionId: 'a-9',
      sessionId: 's-9',
      actionType: 'PROPOSE_EDIT',
      adminTenantId: MASTER_TENANT_ID,
      targetTenantId: 'tenant-x',
      payload: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('10. CREATE_FLOW private write failure returns DataProcessResult.failure', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      callOrder.push({ op: 'store', index });
      if (index === 'xiigen-tenant-topologies') {
        return DataProcessResult.failure('DB_ERROR', 'private write failed');
      }
      return DataProcessResult.success({});
    });

    const result = await publisher.publish({
      actionId: 'a-10',
      sessionId: 's-10',
      actionType: 'CREATE_FLOW',
      adminTenantId: MASTER_TENANT_ID,
      targetTenantId: 'tenant-x',
      payload: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });
});
