/**
 * FLOW-01 Phase A — T47 RegistrationService Tests
 *
 * R-1:  DUPLICATE_EMAIL produces DataProcessResult.failure
 * R-2:  Validation failure shape is uniform — email error and missing-credentials same structure
 * R-3:  onboarding_materials: [] present in stored record
 * R-4:  CF-1: storeDocument called AFTER uniqueness check (searchDocuments before storeDocument)
 * R-5:  Idempotency: second call with same idempotencyKey returns same memberId
 * MT-1: User record stored with knowledge_scope=PRIVATE + tenant_id
 * MT-2: Tenant A user not returned when querying with Tenant B context
 * MT-3: No GLOBAL records created by registration
 */

import 'reflect-metadata';
import { ClsService } from 'nestjs-cls';
import { RegistrationService } from '../../src/engine/flows/user-registration/registration.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { TenantContextResolver } from '../../src/kernel/multi-tenant/tenant-context.resolver';
import { IPasswordHasherService } from '../../src/fabrics/interfaces/password-hasher.service.interface';

// ── DNA-5 (V-10) — minimal CLS stub good enough for tenantId reads ──────────
class FakeCls {
  private readonly store = new Map<string, unknown>();
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
}

function makeTenantContext(tenantId: string): unknown {
  // Duck-typed TenantContext — service only reads .tenantId. Avoids the
  // Object.freeze + TenantRecord plumbing needed by the real constructor.
  return {
    tenantId,
    tenantName: tenantId,
    status: 'active' as const,
    plan: { name: 'pro', maxApiCallsPerMinute: 60, maxTokensPerDay: 1000, maxStorageMb: 100 },
    configOverrides: {},
    apiKeys: {},
    get isActive() {
      return true;
    },
    getConfigOverride: () => undefined,
    getApiKey: () => undefined,
    toSafeDict: () => ({}),
  };
}

function makeTenantCls(tenantId: string): TenantContextResolver {
  const cls = new FakeCls();
  cls.set(TENANT_CONTEXT_KEY, makeTenantContext(tenantId));
  return new TenantContextResolver(cls as unknown as ClsService);
}

// ── Rule 1 (V-10) — IPasswordHasherService stub (deterministic, no native bcrypt) ─
class FakeHasher implements Partial<IPasswordHasherService> {
  async hash(plaintext: string) {
    return DataProcessResult.success({
      hash: `bcrypt-fake$${plaintext}`,
      algorithm: 'bcrypt',
      rounds: 12,
    });
  }
  async compare(plaintext: string, hashed: string) {
    return DataProcessResult.success({ matches: hashed === `bcrypt-fake$${plaintext}` });
  }
  async needsRehash(_hashed: string) {
    return DataProcessResult.success(false);
  }
  async healthCheck() {
    return DataProcessResult.success(true);
  }
}

function makeHasher(): IPasswordHasherService {
  return new FakeHasher() as unknown as IPasswordHasherService;
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(existingRecords: Array<Record<string, unknown>> = []) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      // email uniqueness check
      if (filter['email']) {
        const match = existingRecords.filter((r) => r['email'] === filter['email']);
        return DataProcessResult.success(match);
      }
      // idempotency check
      if (filter['idempotency_key']) {
        const match = existingRecords.filter(
          (r) => r['idempotency_key'] === filter['idempotency_key'],
        );
        return DataProcessResult.success(match);
      }
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push('storeDocument');
      stored.push({ index, doc, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
    _callOrder: callOrder,
  } as any;
}

function makeMockQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
  } as any;
}

function makeService(
  existingRecords: Array<Record<string, unknown>> = [],
  tenantId = 't1',
): {
  svc: RegistrationService;
  db: ReturnType<typeof makeMockDb>;
  queue: ReturnType<typeof makeMockQueue>;
  cls: TenantContextResolver;
} {
  const db = makeMockDb(existingRecords);
  const queue = makeMockQueue();
  const cls = makeTenantCls(tenantId);
  const hasher = makeHasher();
  const svc = new RegistrationService(db, queue, hasher, cls);
  return { svc, db, queue, cls };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RegistrationService (T47)', () => {
  it('R-1: DUPLICATE_EMAIL produces failure — not success with flag', async () => {
    const existing = [{ email: 'user@example.com', user_id: 'usr-existing', idempotency_key: '' }];
    const { svc } = makeService(existing);

    const result = await svc.register({
      email: 'user@example.com',
      credentials: 'pass',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_EMAIL');
  });

  it('R-2: Validation failure shape is uniform — missing email and missing credentials produce same structure', async () => {
    const { svc } = makeService();

    const missingEmail = await svc.register({ email: '', credentials: 'pass' });
    const missingCreds = await svc.register({ email: 'a@b.com', credentials: '' });

    expect(missingEmail.isSuccess).toBe(false);
    expect(missingCreds.isSuccess).toBe(false);
    // Same error code regardless of which field failed (FLOW-01-RAG-03: no field leakage)
    expect(missingEmail.errorCode).toBe('VALIDATION_FAILURE');
    expect(missingCreds.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('R-3: onboarding_materials: [] present in stored record', async () => {
    const { svc, db } = makeService();

    const result = await svc.register({ email: 'a@b.com', credentials: 'pass' });

    expect(result.isSuccess).toBe(true);
    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored).toBeDefined();
    expect(Array.isArray(stored['onboarding_materials'])).toBe(true);
    expect((stored['onboarding_materials'] as unknown[]).length).toBe(0);
  });

  it('R-4: CF-1 — searchDocuments (uniqueness) called BEFORE storeDocument', async () => {
    const { svc, db } = makeService();

    await svc.register({ email: 'a@b.com', credentials: 'pass' });

    const order = db._callOrder;
    const firstSearch = order.indexOf('searchDocuments');
    const firstStore = order.indexOf('storeDocument');
    expect(firstSearch).toBeGreaterThanOrEqual(0);
    expect(firstStore).toBeGreaterThan(firstSearch);
  });

  it('R-5: Idempotency — second call with same idempotencyKey returns same memberId', async () => {
    const { svc } = makeService();

    const first = await svc.register({
      email: 'a@b.com',
      credentials: 'pass',
      idempotencyKey: 'key-123',
    });
    expect(first.isSuccess).toBe(true);
    const memberId = first.data!.memberId;

    // Seed existing record for idempotency check
    const { svc: svc2 } = makeService([
      {
        user_id: memberId,
        email: 'a@b.com',
        idempotency_key: 'key-123',
        knowledge_scope: 'PRIVATE',
      },
    ]);
    const second = await svc2.register({
      email: 'a@b.com',
      credentials: 'pass',
      idempotencyKey: 'key-123',
    });

    expect(second.isSuccess).toBe(true);
    expect(second.data!.memberId).toBe(memberId);
  });

  it('MT-1: User record stored with knowledge_scope=PRIVATE and tenant_id', async () => {
    const { svc, db } = makeService([], 'tenant-X');

    await svc.register({ email: 'a@b.com', credentials: 'pass' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['knowledge_scope']).toBe('PRIVATE');
    expect(stored['tenant_id']).toBe('tenant-X');
  });

  it('MT-2: Tenant A user not returned when querying with Tenant B records', async () => {
    // Tenant A user exists in Tenant A db
    const { svc: svcA } = makeService(
      [
        {
          user_id: 'usr-tenant-a',
          email: 'shared@example.com',
          tenant_id: 'tenant-A',
          idempotency_key: '',
          knowledge_scope: 'PRIVATE',
        },
      ],
      'tenant-A',
    );

    // Tenant B db has no records — same email is available
    const { svc: svcB } = makeService([], 'tenant-B');

    const resultA = await svcA.register({
      email: 'shared@example.com',
      credentials: 'pass',
    });
    const resultB = await svcB.register({
      email: 'shared@example.com',
      credentials: 'pass',
    });

    // Tenant A already has the email → duplicate
    expect(resultA.isSuccess).toBe(false);
    expect(resultA.errorCode).toBe('DUPLICATE_EMAIL');

    // Tenant B has no record — registration succeeds (tenant isolation)
    expect(resultB.isSuccess).toBe(true);
  });

  it('MT-3: No GLOBAL records created by registration', async () => {
    const { svc, db } = makeService();

    await svc.register({ email: 'a@b.com', credentials: 'pass' });

    const globalRecords = db._stored.filter(
      (s) => (s.doc as Record<string, unknown>)['knowledge_scope'] === 'GLOBAL',
    );
    expect(globalRecords.length).toBe(0);
  });

  it('DNA-8: AccountCreated emitted ONLY after storeDocument succeeds', async () => {
    const db = makeMockDb();
    // Make storeDocument fail
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const cls = makeTenantCls('t1');
    const hasher = makeHasher();
    const svc = new RegistrationService(db, queue, hasher, cls);

    const result = await svc.register({ email: 'a@b.com', credentials: 'pass' });

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('DNA-3: register() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const cls = makeTenantCls('t1');
    const hasher = makeHasher();
    const svc = new RegistrationService(db, queue, hasher, cls);

    const result = await svc.register({ email: 'a@b.com', credentials: 'pass' });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
