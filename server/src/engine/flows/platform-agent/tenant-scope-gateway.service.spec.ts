/**
 * T651 TenantScopeGateway — unit tests (8 per FLOW-46 R1 test matrix).
 */
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

describe('TenantScopeGateway (T651)', () => {
  let callOrder: string[];
  let mockDb: { storeDocument: jest.Mock };
  let cls: MockCls;
  let gateway: TenantScopeGateway;

  beforeEach(() => {
    callOrder = [];
    mockDb = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };
    cls = makeCls(masterContext());
    gateway = new TenantScopeGateway(mockDb as never, cls as never);
  });

  it('1. caller CLS !== MASTER_TENANT_ID → NOT_ADMIN', async () => {
    cls = makeCls(tenantContext('tenant-x'));
    gateway = new TenantScopeGateway(mockDb as never, cls as never);
    const result = await gateway.switch({
      targetTenantId: 'tenant-y',
      reason: 'r',
      sessionId: 's-1',
      inner: async () => 'ok',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_ADMIN');
  });

  it('2. empty targetTenantId → INVALID_TARGET', async () => {
    const result = await gateway.switch({
      targetTenantId: '',
      reason: 'r',
      sessionId: 's-1',
      inner: async () => 'ok',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_TARGET');
  });

  it('3. audit written BEFORE cls.run (CF-839, DNA-8)', async () => {
    cls.runWith.mockImplementationOnce(async (_overrides, fn: () => Promise<unknown>) => {
      callOrder.push('cls.runWith');
      return await fn();
    });
    const result = await gateway.switch({
      targetTenantId: 'tenant-x',
      reason: 'edit',
      sessionId: 's-3',
      inner: async () => {
        callOrder.push('inner');
        return 'inner-ok';
      },
    });
    expect(result.isSuccess).toBe(true);
    expect(callOrder).toEqual(['storeDocument', 'cls.runWith', 'inner']);
  });

  it('4. cls.runWith called with correct target context', async () => {
    await gateway.switch({
      targetTenantId: 'tenant-x',
      reason: 'r',
      sessionId: 's-4',
      inner: async () => 'ok',
    });
    const overrides = (cls.runWith.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>;
    const ctx = overrides['tenant'] as TenantContext;
    expect(ctx.tenantId).toBe('tenant-x');
  });

  it('5. inner callback receives target CLS context', async () => {
    let inside: string | undefined;
    await gateway.switch({
      targetTenantId: 'tenant-x',
      reason: 'r',
      sessionId: 's-5',
      inner: async () => {
        inside = (cls.get('tenant') as TenantContext).tenantId;
        return 'ok';
      },
    });
    expect(inside).toBe('tenant-x');
  });

  it('6. outer MASTER context restored after inner returns', async () => {
    await gateway.switch({
      targetTenantId: 'tenant-x',
      reason: 'r',
      sessionId: 's-6',
      inner: async () => 'ok',
    });
    expect((cls.get('tenant') as TenantContext).tenantId).toBe(MASTER_TENANT_ID);
  });

  it('7. outer MASTER context restored after inner throws', async () => {
    await expect(
      gateway.switch({
        targetTenantId: 'tenant-x',
        reason: 'r',
        sessionId: 's-7',
        inner: async () => {
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');
    expect((cls.get('tenant') as TenantContext).tenantId).toBe(MASTER_TENANT_ID);
  });

  it('8. audit record has tenantId=MASTER_TENANT_ID (survives the switch)', async () => {
    await gateway.switch({
      targetTenantId: 'tenant-x',
      reason: 'r',
      sessionId: 's-8',
      inner: async () => 'ok',
    });
    const auditDoc = mockDb.storeDocument.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(auditDoc['tenantId']).toBe(MASTER_TENANT_ID);
    expect(auditDoc['adminTenantId']).toBe(MASTER_TENANT_ID);
    expect(auditDoc['targetTenantId']).toBe('tenant-x');
  });
});
