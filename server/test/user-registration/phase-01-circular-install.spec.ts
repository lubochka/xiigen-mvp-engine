/**
 * FLOW-01 Phase C2 — Circular-install probe (V-12 gate)
 *
 * Protocol: FLOW-PORTABILITY-TEST-PROTOCOL-v2.0
 * Tier:     TIER-D
 * V-Gate:   V-12 (R2 + R4) — proves requiredCoInstalls=[] is behavioural, not just doc
 *
 * Proves the 3 FLOW-01 services (T47–T49) instantiate and run their golden paths
 * with NO downstream-flow service present in the runtime:
 *
 *   - NO FLOW-02 (profile-enrichment) PersonalizationCompletionService
 *   - NO FLOW-08 (marketplace) activation gate
 *   - NO FLOW-48 (i18n-translation) TranslationRequestRegistrar
 *   - NO email-infrastructure consumer for VerificationEmailRequested
 *
 * This locks P-5 (requiredCoInstalls=[]) at the behavioural level so the
 * package.json claim that FLOW-01 has no co-install dependency is backed by a
 * runtime test, not just a manifest entry.
 *
 * The test is intentionally minimal — one happy-path call per service. Rich
 * unit-level behaviour (DNA-7 idempotency, CF-1 ordering, OD-6 presence gate,
 * rate limits, cross-tenant isolation) is covered by phase-01-{a,b,c,
 * integration,tenant-isolation,third-tenant-install,adaptation-freedom-config,
 * auth-matrix}.spec.ts files.
 *
 * A fifth assertion reads the package.json at runtime and confirms the manifest
 * still declares no required co-installs and no upstream reads — the manifest
 * and the code agree.
 */

import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { TenantContextResolver } from '../../src/kernel/multi-tenant/tenant-context.resolver';

import { RegistrationService } from '../../src/engine/flows/user-registration/registration.service';
import { EmailVerificationService } from '../../src/engine/flows/user-registration/email-verification.service';
import { OnboardingDeliveryService } from '../../src/engine/flows/user-registration/onboarding-delivery.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { IPasswordHasherService } from '../../src/fabrics/interfaces/password-hasher.service.interface';

// ── DNA-5 (V-10) — minimal CLS stub good enough for tenantId reads ─────────

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

// ── Stateful in-memory mocks ───────────────────────────────────────────────

function makeStatefulDb() {
  const store = new Map<string, { index: string; doc: Record<string, unknown> }>();

  const searchDocuments = jest.fn(async (index: string, filter: Record<string, unknown>) => {
    const results = [...store.values()]
      .filter((entry) => entry.index === index)
      .map((entry) => entry.doc)
      .filter((doc) =>
        Object.entries(filter).every(([k, v]) => {
          if (k === 'created_after') {
            const docDate = doc['created_at'] as string | undefined;
            return docDate !== undefined && docDate > (v as string);
          }
          return v == null || doc[k] === v;
        }),
      );
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeScheduler() {
  return {
    scheduleDelayed: jest.fn().mockResolvedValue({ jobId: 'mock-job-id' }),
    cancelJob: jest.fn().mockResolvedValue(undefined),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const TENANT = 'acme-pro-members';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FLOW-01 circular-install probe — 3 services boot without any downstream consumer', () => {
  it('T47 RegistrationService: boots + register golden path without FLOW-02/FLOW-48 services', async () => {
    const db = makeStatefulDb();
    const queue = makeStatefulQueue();
    const hasher = makeHasher();
    const cls = makeTenantCls(TENANT);

    const svc = new RegistrationService(db, queue, hasher, cls);

    const result = await svc.register({
      email: 'circular-c2@example.com',
      credentials: 'p4ssw0rd',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.memberId).toBeDefined();
    expect(result.data?.accountStatus).toBe('PENDING_VERIFICATION');

    // AccountCreated emitted — downstream FLOW-02 / FLOW-48 are NOT subscribed in
    // this runtime, but the queue fabric accepts the emit. P-5 holds.
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'AccountCreated'),
    ).toBe(true);
  });

  it('T48 EmailVerificationService: boots + initiate/verify golden path without email-infra subscriber', async () => {
    const db = makeStatefulDb();
    const queue = makeStatefulQueue();
    const scheduler = makeScheduler();
    const cls = makeTenantCls(TENANT);

    const svc = new EmailVerificationService(db, queue, scheduler, cls);

    const memberId = 'member-c2-ev';
    const initiate = await svc.initiateVerification({
      memberId,
      email: 'verify-c2@example.com',
    });
    expect(initiate.isSuccess).toBe(true);

    // VerificationEmailRequested goes onto the queue with rawToken — no email-infra
    // consumer required for FLOW-01 to boot or progress.
    const verifyEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'VerificationEmailRequested',
    );
    expect(verifyEvent).toBeDefined();
    const rawToken = (verifyEvent!.data as Record<string, unknown>)['rawToken'] as string;
    expect(typeof rawToken).toBe('string');
    expect(rawToken.length).toBeGreaterThan(0);

    const verify = await svc.verifyToken({ memberId, rawToken });
    expect(verify.isSuccess).toBe(true);
    expect(verify.data?.verified).toBe(true);

    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'VerificationCompleted'),
    ).toBe(true);
  });

  it('T49 OnboardingDeliveryService: boots + 3 deliveries + completion gate without FLOW-08 consumer', async () => {
    const db = makeStatefulDb();
    const queue = makeStatefulQueue();
    const cls = makeTenantCls(TENANT);

    const svc = new OnboardingDeliveryService(db, queue, cls);

    const memberId = 'member-c2-onb';
    const userId = memberId;
    const email = 'onboard-c2@example.com';

    const ws = await svc.deliverWorkspace({ memberId, userId });
    const tut = await svc.deliverTutorial({ memberId, userId });
    const inv = await svc.deliverInvitation({ memberId, userId, email });
    expect(ws.isSuccess).toBe(true);
    expect(tut.isSuccess).toBe(true);
    expect(inv.isSuccess).toBe(true);

    const gate = await svc.checkCompletionGate({ memberId, userId, email });
    expect(gate.isSuccess).toBe(true);
    expect(gate.data?.completed).toBe(true);

    // OnboardingCompleted goes onto the queue — FLOW-08 marketplace activation
    // gate is NOT present, but FLOW-01 still completes its own journey.
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(true);
  });

  it('Triple boot together: T47 → T48 → T49 chain progresses with no downstream service in scope', async () => {
    // Single shared in-memory db + queue — simulates the FLOW-01 module booting
    // standalone with no other flow module loaded.
    const db = makeStatefulDb();
    const queue = makeStatefulQueue();
    const scheduler = makeScheduler();
    const hasher = makeHasher();
    const cls = makeTenantCls(TENANT);

    const reg = new RegistrationService(db, queue, hasher, cls);
    const ev = new EmailVerificationService(db, queue, scheduler, cls);
    const onb = new OnboardingDeliveryService(db, queue, cls);

    // 1. Register
    const r = await reg.register({ email: 'triple-c2@example.com', credentials: 'pw' });
    expect(r.isSuccess).toBe(true);
    const memberId = r.data!.memberId;

    // 2. Verify
    const init = await ev.initiateVerification({ memberId, email: 'triple-c2@example.com' });
    expect(init.isSuccess).toBe(true);
    const rawToken = (
      queue._enqueued.find(
        (e: { eventType: string }) => e.eventType === 'VerificationEmailRequested',
      )!.data as Record<string, unknown>
    )['rawToken'] as string;
    const v = await ev.verifyToken({ memberId, rawToken });
    expect(v.isSuccess).toBe(true);

    // 3. Onboard
    await onb.deliverWorkspace({ memberId, userId: memberId });
    await onb.deliverTutorial({ memberId, userId: memberId });
    await onb.deliverInvitation({ memberId, userId: memberId, email: 'triple-c2@example.com' });
    const gate = await onb.checkCompletionGate({
      memberId,
      userId: memberId,
      email: 'triple-c2@example.com',
    });
    expect(gate.isSuccess).toBe(true);
    expect(gate.data?.completed).toBe(true);

    // The full event sequence reached the queue fabric without any subscriber
    // service being instantiated — FLOW-01 truly is co-install-free.
    const types = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(types).toEqual(
      expect.arrayContaining([
        'AccountCreated',
        'VerificationEmailRequested',
        'VerificationCompleted',
        'OnboardingCompleted',
      ]),
    );
  });

  it('package.json manifest agrees: requiredCoInstalls=[] AND readsFromOtherFlows=[]', () => {
    const pkgPath = join(__dirname, '../../src/engine/flows/user-registration/package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
      name: string;
      flowId: string;
      flowSlug: string;
      requiredCoInstalls: string[];
      xiigenFlowMeta: {
        readsFromOtherFlows: string[];
        connectionType: string;
        portabilityTier: string;
      };
      protocol: string;
    };

    expect(pkg.name).toBe('@xiigen/user-registration');
    expect(pkg.flowId).toBe('FLOW-01');
    expect(pkg.flowSlug).toBe('user-registration');
    expect(Array.isArray(pkg.requiredCoInstalls)).toBe(true);
    expect(pkg.requiredCoInstalls.length).toBe(0);
    expect(pkg.xiigenFlowMeta.readsFromOtherFlows).toEqual([]);
    expect(pkg.xiigenFlowMeta.connectionType).toBe('FLOW_SCOPED');
    expect(pkg.xiigenFlowMeta.portabilityTier).toBe('TIER-D');
    expect(pkg.protocol).toBe('FLOW-PORTABILITY-TEST-PROTOCOL-v2.0');
  });
});
