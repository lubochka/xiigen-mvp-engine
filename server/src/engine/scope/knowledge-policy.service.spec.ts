import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  KnowledgePolicyService,
  KNOWLEDGE_POLICY_INDEX,
  PLATFORM_OWNER_ID,
  KnowledgePolicy,
} from './knowledge-policy.service';

function makeDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      bucket.push({ ...doc, _id: id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, _id: id });
    }),
    searchDocuments: jest.fn(async (index: string, filter?: Record<string, unknown>) => {
      const records = store.get(index) ?? [];
      if (!filter || Object.keys(filter).length === 0) {
        return DataProcessResult.success(records);
      }
      // Simple filter: match all provided keys
      const filtered = records.filter((r) =>
        Object.entries(filter).every(([k, v]) => v === undefined || r[k] === v),
      );
      return DataProcessResult.success(filtered);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = (store.get(index) ?? []).find((d) => d['_id'] === id);
      return doc ? DataProcessResult.success(doc) : DataProcessResult.failure('NOT_FOUND', '');
    }),
    _store: store,
  };
}

const makeCls = (tenantId = 'test-tenant') => ({ get: jest.fn().mockReturnValue({ tenantId }) });

beforeEach(() => jest.clearAllMocks());

describe('KnowledgePolicyService', () => {
  it('CF-POLICY-01: resolveScope returns PRIVATE when no policy found', async () => {
    const db = makeDb();
    const cls = makeCls();
    const svc = new KnowledgePolicyService(db as any, cls as any);
    const result = await svc.resolveScope('tenant-1', 'FLOW-01', 'PHASE-A');
    expect(result.scope).toBe('PRIVATE');
    expect(result.ownerId).toBe('tenant-1');
  });

  it('resolveScope: most specific policy wins (station+depth beats phase-only)', async () => {
    const db = makeDb();
    const cls = makeCls('tenant-x');
    const svc = new KnowledgePolicyService(db as any, cls as any);
    // Store a phase-level policy (MODULE) and a station+depth policy (GLOBAL)
    await svc.setPolicy({
      tenantId: 'tenant-x',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-x',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    await svc.setPolicy({
      tenantId: 'tenant-x',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: 'CYCLE-1',
      depth: 0,
      scope: 'GLOBAL',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-x',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    const result = await svc.resolveScope('tenant-x', 'FLOW-01', 'PHASE-A', 'CYCLE-1', 0);
    expect(result.scope).toBe('GLOBAL');
  });

  it('resolveScope: platform MODULE policy applies when no tenant override', async () => {
    const db = makeDb();
    const cls = makeCls('new-tenant');
    const svc = new KnowledgePolicyService(db as any, cls as any);
    // Bootstrap platform policy for FLOW-01
    await svc.setPolicy({
      tenantId: PLATFORM_OWNER_ID,
      flowId: 'FLOW-01',
      phase: '*',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: 'FREE',
      pricePerUse: null,
      ownerId: PLATFORM_OWNER_ID,
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    const result = await svc.resolveScope('new-tenant', 'FLOW-01', '*');
    expect(result.scope).toBe('MODULE');
  });

  it('resolveScope: tenant override beats platform policy at same specificity', async () => {
    const db = makeDb();
    const cls = makeCls('tenant-y');
    const svc = new KnowledgePolicyService(db as any, cls as any);
    // Platform = MODULE, tenant = PRIVATE (proprietary override)
    await svc.setPolicy({
      tenantId: PLATFORM_OWNER_ID,
      flowId: 'FLOW-02',
      phase: '*',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: 'FREE',
      pricePerUse: null,
      ownerId: PLATFORM_OWNER_ID,
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    await svc.setPolicy({
      tenantId: 'tenant-y',
      flowId: 'FLOW-02',
      phase: '*',
      station: null,
      depth: null,
      scope: 'PRIVATE',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-y',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    const result = await svc.resolveScope('tenant-y', 'FLOW-02', '*');
    expect(result.scope).toBe('PRIVATE');
  });

  it('setPolicy: stores to xiigen-knowledge-policy index', async () => {
    const db = makeDb();
    const cls = makeCls();
    const svc = new KnowledgePolicyService(db as any, cls as any);
    const result = await svc.setPolicy({
      tenantId: 'tenant-1',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-1',
      approvalState: 'PENDING',
      approvedAt: null,
      approvedBy: null,
    });
    expect(result.isSuccess).toBe(true);
    const stored = db._store.get(KNOWLEDGE_POLICY_INDEX) ?? [];
    expect(stored.length).toBe(1);
    expect(stored[0]!['scope']).toBe('MODULE');
  });

  it('bootstrapPlatformPolicies: creates MODULE entry for each flowId', async () => {
    const db = makeDb();
    const cls = makeCls();
    const svc = new KnowledgePolicyService(db as any, cls as any);
    const result = await svc.bootstrapPlatformPolicies(['FLOW-01', 'FLOW-02', 'FLOW-03']);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.registered).toBe(3);
    const stored = db._store.get(KNOWLEDGE_POLICY_INDEX) ?? [];
    expect(stored.every((r) => r['scope'] === 'MODULE')).toBe(true);
    expect(stored.every((r) => r['ownerId'] === PLATFORM_OWNER_ID)).toBe(true);
  });

  it('bootstrapPlatformPolicies: idempotent — does not duplicate existing entries', async () => {
    const db = makeDb();
    const cls = makeCls();
    const svc = new KnowledgePolicyService(db as any, cls as any);
    await svc.bootstrapPlatformPolicies(['FLOW-01']);
    const result = await svc.bootstrapPlatformPolicies(['FLOW-01']);
    expect(result.data!.registered).toBe(0);
    const stored = db._store.get(KNOWLEDGE_POLICY_INDEX) ?? [];
    expect(stored.length).toBe(1); // no duplicate
  });

  it('DNA-3: resolveScope returns PRIVATE on db failure — never throws', async () => {
    const db = makeDb();
    (db.searchDocuments as jest.Mock).mockResolvedValue(
      DataProcessResult.failure('DB_ERR', 'fail'),
    );
    const cls = makeCls('t1');
    const svc = new KnowledgePolicyService(db as any, cls as any);
    const result = await svc.resolveScope('t1', 'FLOW-01', 'PHASE-A');
    expect(result.scope).toBe('PRIVATE');
    expect(() => result).not.toThrow();
  });
});
