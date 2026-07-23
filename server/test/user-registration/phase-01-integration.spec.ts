/**
 * FLOW-01 Phase 2 — Integration Tests
 *
 * INT-01: Full registration → verification → onboarding completion chain
 * INT-02: SSO path — existingOnboardingMaterialsCount >= 3 bypasses delivery + gate
 * INT-03: Rate limit on resend — second attempt within window is blocked
 * INT-04: Duplicate email rejected — no downstream events emitted
 * INT-05: Partial onboarding (2 of 3 materials) blocks completion gate
 * INT-06: All-failed deliveries still trigger OnboardingCompleted (presence gate)
 * INT-07: Cross-tenant isolation — Tenant A completion does not affect Tenant B
 */

import 'reflect-metadata';
import { ClsService } from 'nestjs-cls';
import { RegistrationService } from '../../src/engine/flows/user-registration/registration.service';
import { EmailVerificationService } from '../../src/engine/flows/user-registration/email-verification.service';
import { OnboardingDeliveryService } from '../../src/engine/flows/user-registration/onboarding-delivery.service';
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

// ── Stateful mock db ────────────────────────────────────────────────────────────

function makeStatefulDb() {
  const store = new Map<string, { index: string; doc: Record<string, unknown> }>();

  const searchDocuments = jest.fn(async (index: string, filter: Record<string, unknown>) => {
    const results = [...store.values()]
      .filter((entry) => entry.index === index)
      .map((entry) => entry.doc)
      .filter((doc) => {
        return Object.entries(filter).every(([k, v]) => {
          if (k === 'created_after') {
            const docDate = doc['created_at'] as string | undefined;
            return docDate !== undefined && docDate > (v as string);
          }
          return doc[k] === v;
        });
      });
    return DataProcessResult.success(results);
  });

  const storeDocument = jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
    store.set(id, { index, doc });
    return DataProcessResult.success(doc);
  });

  return {
    searchDocuments,
    storeDocument,
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _store: store,
  } as any;
}

// ── Stateful mock queue ─────────────────────────────────────────────────────────

function makeStatefulQueue() {
  const enqueued: Array<{ eventType: string; data: unknown }> = [];

  return {
    enqueue: jest.fn(async (eventType: string, data: unknown) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
    _clear(): void {
      enqueued.length = 0;
    },
  } as any;
}

// ── Mock scheduler ──────────────────────────────────────────────────────────────

function makeScheduler() {
  return {
    scheduleDelayed: jest.fn().mockResolvedValue({ jobId: 'mock-job-id' }),
    cancelJob: jest.fn().mockResolvedValue(undefined),
  } as any;
}

// ── Service factories ───────────────────────────────────────────────────────────

function makeServices(
  db?: ReturnType<typeof makeStatefulDb>,
  queue?: ReturnType<typeof makeStatefulQueue>,
  tenantId = 't1',
) {
  const _db = db ?? makeStatefulDb();
  const _queue = queue ?? makeStatefulQueue();
  const scheduler = makeScheduler();
  const cls = makeTenantCls(tenantId);
  const hasher = makeHasher();

  const regSvc = new RegistrationService(_db, _queue, hasher, cls);
  const evSvc = new EmailVerificationService(_db, _queue, scheduler, cls);
  const onbSvc = new OnboardingDeliveryService(_db, _queue, cls);

  return { db: _db, queue: _queue, scheduler, cls, regSvc, evSvc, onbSvc };
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('FLOW-01 Integration — T47/T48/T49 chain', () => {
  it('INT-01: Full registration → verification → onboarding completion chain', async () => {
    const { db, queue, regSvc, evSvc, onbSvc } = makeServices();

    // ── Step 1: Register ───────────────────────────────────────────────────────
    const reg = await regSvc.register({
      email: 'int01@example.com',
      credentials: 'password',
    });
    expect(reg.isSuccess).toBe(true);
    const memberId = reg.data!.memberId;

    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'AccountCreated'),
    ).toBe(true);

    // ── Step 2: Initiate verification ──────────────────────────────────────────
    const init = await evSvc.initiateVerification({
      memberId,
      email: 'int01@example.com',
    });
    expect(init.isSuccess).toBe(true);

    // Raw token is in VerificationEmailRequested — never persisted
    const verifyEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'VerificationEmailRequested',
    );
    expect(verifyEvent).toBeDefined();
    const rawToken = (verifyEvent!.data as Record<string, unknown>)['rawToken'] as string;
    expect(rawToken).toBeDefined();
    expect(typeof rawToken).toBe('string');
    expect(rawToken.length).toBeGreaterThan(0);

    // ── Step 3: Verify token ───────────────────────────────────────────────────
    const verify = await evSvc.verifyToken({ memberId, rawToken });
    expect(verify.isSuccess).toBe(true);
    expect(verify.data!.verified).toBe(true);

    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'VerificationCompleted'),
    ).toBe(true);

    // ── Step 4: Deliver all 3 materials ───────────────────────────────────────
    const ws = await onbSvc.deliverWorkspace({ memberId, userId: memberId });
    const tut = await onbSvc.deliverTutorial({ memberId, userId: memberId });
    const inv = await onbSvc.deliverInvitation({
      memberId,
      userId: memberId,
      email: 'int01@example.com',
    });
    expect(ws.isSuccess).toBe(true);
    expect(tut.isSuccess).toBe(true);
    expect(inv.isSuccess).toBe(true);

    // ── Step 5: Completion gate ────────────────────────────────────────────────
    const gate = await onbSvc.checkCompletionGate({
      memberId,
      userId: memberId,
      email: 'int01@example.com',
    });
    expect(gate.isSuccess).toBe(true);
    expect(gate.data!.completed).toBe(true);

    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(true);
  });

  it('INT-02: SSO path — existingOnboardingMaterialsCount >= 3 bypasses delivery and gate queries', async () => {
    const { db, queue, onbSvc } = makeServices();

    const gate = await onbSvc.checkCompletionGate({
      memberId: 'sso-member',
      userId: 'sso-user',
      email: 'sso@example.com',
      existingOnboardingMaterialsCount: 3,
    });

    expect(gate.isSuccess).toBe(true);
    expect(gate.data!.completed).toBe(true);

    // MT-3: SSO bypass — no db reads/writes, no events emitted
    expect(db.searchDocuments).not.toHaveBeenCalled();
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue._enqueued.length).toBe(0);
  });

  it('INT-03: Rate limit on resend — second attempt within window is blocked', async () => {
    const { evSvc } = makeServices();

    // First resend: no prior attempt records → succeeds
    const first = await evSvc.resendVerification({
      memberId: 'm-resend',
      email: 'resend@example.com',
    });
    expect(first.isSuccess).toBe(true);

    // Second resend: the first attempt was stored with created_at = now
    // windowStart = now - 60 min → first record is within window → rate limited
    const second = await evSvc.resendVerification({
      memberId: 'm-resend',
      email: 'resend@example.com',
    });
    expect(second.isSuccess).toBe(false);
    expect(second.errorCode).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('INT-04: Duplicate email rejected — no downstream events emitted', async () => {
    const { queue, regSvc } = makeServices();

    // First registration succeeds
    const first = await regSvc.register({
      email: 'dup@example.com',
      credentials: 'pass',
    });
    expect(first.isSuccess).toBe(true);

    // Clear queue so we can assert cleanly on the duplicate attempt
    queue._clear();

    // Second registration with same email
    const second = await regSvc.register({
      email: 'dup@example.com',
      credentials: 'pass2',
    });
    expect(second.isSuccess).toBe(false);
    expect(second.errorCode).toBe('DUPLICATE_EMAIL');

    // No events emitted for a rejected duplicate
    expect(queue._enqueued.length).toBe(0);
  });

  it('INT-05: Partial onboarding (2 of 3 materials) blocks completion gate', async () => {
    const { queue, onbSvc } = makeServices();

    const memberId = 'partial-member';

    await onbSvc.deliverWorkspace({ memberId, userId: memberId });
    await onbSvc.deliverTutorial({ memberId, userId: memberId });
    // community_invitation intentionally omitted

    const gate = await onbSvc.checkCompletionGate({
      memberId,
      userId: memberId,
      email: 'partial@example.com',
    });
    expect(gate.isSuccess).toBe(false);
    expect(gate.errorCode).toBe('DELIVERY_INCOMPLETE');

    // OnboardingCompleted must NOT be emitted for an incomplete gate
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(false);
  });

  it('INT-06: All-failed deliveries still satisfy presence gate — OnboardingCompleted emitted', async () => {
    const { queue, onbSvc, db } = makeServices();

    const memberId = 'failed-member';

    // Seed failed records for all 3 material types (presence-based gate: status irrelevant)
    const materialTypes = ['workspace_setup', 'flow_tutorial', 'community_invitation'];
    materialTypes.forEach((materialType, i) => {
      const deliveryId = `del-${materialType}-${memberId}-${i}`;
      db._store.set(deliveryId, {
        index: 'xiigen-onboarding-deliveries',
        doc: {
          delivery_id: deliveryId,
          member_id: memberId,
          material_type: materialType,
          status: 'failed',
          tenant_id: 't1',
          connection_type: 'FLOW_SCOPED',
          knowledge_scope: 'PRIVATE',
        },
      });
    });

    const gate = await onbSvc.checkCompletionGate({
      memberId,
      userId: memberId,
      email: 'failed@example.com',
    });

    // OD-6: failed records count — presence is all that's required
    expect(gate.isSuccess).toBe(true);
    expect(gate.data!.completed).toBe(true);
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(true);
  });

  it('INT-07: Cross-tenant isolation — Tenant A completion does not affect Tenant B gate', async () => {
    // Each tenant uses a separate db — simulates fabric-level tenant isolation
    const { onbSvc: onbSvcA } = makeServices(undefined, undefined, 'tenant-A');
    const { onbSvc: onbSvcB, queue: queueB } = makeServices(undefined, undefined, 'tenant-B');

    const memberA = 'member-a';
    const memberB = 'member-b';

    // Deliver all 3 materials for Tenant A
    await onbSvcA.deliverWorkspace({ memberId: memberA, userId: memberA });
    await onbSvcA.deliverTutorial({ memberId: memberA, userId: memberA });
    await onbSvcA.deliverInvitation({
      memberId: memberA,
      userId: memberA,
      email: 'a@tenant-a.com',
    });

    // Tenant A gate passes
    const gateA = await onbSvcA.checkCompletionGate({
      memberId: memberA,
      userId: memberA,
      email: 'a@tenant-a.com',
    });
    expect(gateA.isSuccess).toBe(true);
    expect(gateA.data!.completed).toBe(true);

    // Tenant B db has no delivery records — gate must fail
    const gateB = await onbSvcB.checkCompletionGate({
      memberId: memberB,
      userId: memberB,
      email: 'b@tenant-b.com',
    });
    expect(gateB.isSuccess).toBe(false);
    expect(gateB.errorCode).toBe('DELIVERY_INCOMPLETE');

    // Tenant B queue has no OnboardingCompleted
    expect(
      queueB._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(false);
  });
});
