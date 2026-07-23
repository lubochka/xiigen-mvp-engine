/**
 * FLOW-01 Phase A — Tenant Isolation Test (Layer 1 Step 4, mandatory)
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.0: every flow must prove cross-tenant
 * isolation at the unit-test layer before the Playwright / visual layers run.
 *
 * This test covers the full T47 → T48 → T49 chain under two concurrent tenants
 * and verifies:
 *
 *   TI-1: Same email registered independently by tenant-A and tenant-B —
 *         neither sees the other (DNA-5 scope isolation at fabric layer).
 *   TI-2: Idempotency key collision across tenants does NOT leak —
 *         key 'k1' in tenant-A does not match key 'k1' in tenant-B.
 *   TI-3: Verification token issued for tenant-A cannot be verified by tenant-B
 *         (cross-tenant token use is rejected).
 *   TI-4: FREEDOM config reads are tenant-scoped — tenant-A can have a 30-min
 *         resend limit while tenant-B has 120-min, concurrently.
 *   TI-5: OnboardingCompleted event payload carries the owning tenant's ID —
 *         events never leak another tenant's ID into a tenant's event stream.
 *   TI-6: Error messages do not disclose cross-tenant data — a tenant-B request
 *         that matches no local record returns a uniform failure, never one
 *         that references tenant-A's existence.
 *
 * Uses per-tenant mock fabrics that partition storage internally. This
 * simulates the real DNA-5 behaviour: each IDatabaseService.searchDocuments
 * call is automatically filtered by the tenantId read from AsyncLocalStorage.
 */

import 'reflect-metadata';
import { createHash, randomBytes } from 'crypto';
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

// ── Tenant-partitioned fabric mocks ────────────────────────────────────────

/**
 * Creates a mock IDatabaseService that automatically partitions storage by
 * tenantId — simulating DNA-5 fabric-level auto-scoping. Every searchDocuments
 * call is filtered to only the owning tenant's records; every storeDocument
 * writes to that tenant's partition.
 */
function makeTenantScopedDb(tenantId: string) {
  const partition = new Map<string, Array<Record<string, unknown>>>();

  return {
    _tenantId: tenantId,
    _partition: partition,

    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const records = partition.get(index) ?? [];
      // Only return records where every non-undefined filter field matches.
      const matches = records.filter((r) =>
        Object.entries(filter).every(([k, v]) => {
          if (v === undefined || v === null || v === '') return true;
          // Emulate the "created_after" range filter used by T48.
          if (k === 'created_after') {
            const recTs = Date.parse(r['created_at'] as string);
            const filterTs = Date.parse(v as string);
            return recTs >= filterTs;
          }
          return r[k] === v;
        }),
      );
      return DataProcessResult.success(matches);
    }),

    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const records = partition.get(index) ?? [];
      // Upsert on id
      const existingIdx = records.findIndex((r) => r['_id'] === id);
      const stamped = { ...doc, _id: id };
      if (existingIdx >= 0) {
        records[existingIdx] = stamped;
      } else {
        records.push(stamped);
      }
      partition.set(index, records);
      return DataProcessResult.success(stamped);
    }),

    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeTenantScopedQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    _enqueued: enqueued,
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeTenantScopedScheduler() {
  return {
    scheduleDelayed: jest.fn(async () => ({ jobId: `job-${Date.now()}` })),
    cancel: jest.fn(async () => DataProcessResult.success(true)),
  } as any;
}

/**
 * Per-tenant FREEDOM config mock. Simulates DNA-5: each tenant has an
 * independent keyspace. Querying the same key for two tenants returns
 * different values.
 */
function makeTenantScopedFreedomConfig(values: Record<string, unknown>) {
  return {
    get: jest.fn(async (key: string) => {
      if (!(key in values)) return null;
      return { value: values[key] };
    }),
    set: jest.fn(),
    list: jest.fn(),
  } as any;
}

// ── Per-tenant system builder ──────────────────────────────────────────────

interface TenantSystem {
  tenantId: string;
  db: ReturnType<typeof makeTenantScopedDb>;
  queue: ReturnType<typeof makeTenantScopedQueue>;
  scheduler: ReturnType<typeof makeTenantScopedScheduler>;
  freedomConfig: ReturnType<typeof makeTenantScopedFreedomConfig>;
  cls: TenantContextResolver;
  registration: RegistrationService;
  verification: EmailVerificationService;
  onboarding: OnboardingDeliveryService;
}

function makeTenantSystem(
  tenantId: string,
  freedomValues: Record<string, unknown> = {},
): TenantSystem {
  const db = makeTenantScopedDb(tenantId);
  const queue = makeTenantScopedQueue();
  const scheduler = makeTenantScopedScheduler();
  const freedomConfig = makeTenantScopedFreedomConfig(freedomValues);
  const cls = makeTenantCls(tenantId);
  const hasher = makeHasher();
  const registration = new RegistrationService(db, queue, hasher, cls);
  const verification = new EmailVerificationService(db, queue, scheduler, cls, freedomConfig);
  const onboarding = new OnboardingDeliveryService(db, queue, cls, freedomConfig);
  return {
    tenantId,
    db,
    queue,
    scheduler,
    freedomConfig,
    cls,
    registration,
    verification,
    onboarding,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FLOW-01 Tenant Isolation (Layer 1 Step 4)', () => {
  it('TI-1: Same email registered by tenant-A and tenant-B independently — neither sees the other', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    const resultA = await sysA.registration.register({
      email: 'shared@example.com',
      credentials: 'password-a',
    });
    const resultB = await sysB.registration.register({
      email: 'shared@example.com',
      credentials: 'password-b',
    });

    // Both succeed — each tenant has its own email namespace.
    expect(resultA.isSuccess).toBe(true);
    expect(resultB.isSuccess).toBe(true);
    expect(resultA.data!.memberId).not.toBe(resultB.data!.memberId);

    // Tenant-A's partition has exactly one record; tenant-B's has exactly one.
    const aRecords = sysA.db._partition.get('xiigen-user-registrations') ?? [];
    const bRecords = sysB.db._partition.get('xiigen-user-registrations') ?? [];
    expect(aRecords.length).toBe(1);
    expect(bRecords.length).toBe(1);
    expect(aRecords[0]['tenant_id']).toBe('tenant-A');
    expect(bRecords[0]['tenant_id']).toBe('tenant-B');

    // Verify: a second register on tenant-A with the same email is a duplicate,
    // but tenant-B's partition is unaffected.
    const duplicateA = await sysA.registration.register({
      email: 'shared@example.com',
      credentials: 'password-a',
    });
    expect(duplicateA.isSuccess).toBe(false);
    expect(duplicateA.errorCode).toBe('DUPLICATE_EMAIL');

    // Tenant-B still only has its one record; tenant-A's duplicate did not
    // leak any information into B's partition.
    expect(sysB.db._partition.get('xiigen-user-registrations')!.length).toBe(1);
  });

  it('TI-2: Idempotency key collision across tenants does NOT cross-match', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    // Both tenants use the SAME idempotency key 'shared-key-42'.
    const firstA = await sysA.registration.register({
      email: 'alice@example.com',
      credentials: 'pw',
      idempotencyKey: 'shared-key-42',
    });
    const firstB = await sysB.registration.register({
      email: 'bob@example.com',
      credentials: 'pw',
      idempotencyKey: 'shared-key-42',
    });

    expect(firstA.isSuccess).toBe(true);
    expect(firstB.isSuccess).toBe(true);

    // Different memberIds prove the idempotency lookups did not cross tenants.
    expect(firstA.data!.memberId).not.toBe(firstB.data!.memberId);

    // Replay on A returns A's original result, not B's.
    const replayA = await sysA.registration.register({
      email: 'alice@example.com',
      credentials: 'pw',
      idempotencyKey: 'shared-key-42',
    });
    expect(replayA.isSuccess).toBe(true);
    expect(replayA.data!.memberId).toBe(firstA.data!.memberId);
    expect(replayA.data!.memberId).not.toBe(firstB.data!.memberId);
  });

  it('TI-3: Verification token issued for tenant-A cannot be found by tenant-B', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    // Register on tenant-A.
    const registered = await sysA.registration.register({
      email: 'victim@example.com',
      credentials: 'pw',
    });
    expect(registered.isSuccess).toBe(true);
    const memberId = registered.data!.memberId;

    // Issue a verification token on tenant-A.
    const verifyInit = await sysA.verification.initiateVerification({
      memberId,
      email: 'victim@example.com',
    });
    expect(verifyInit.isSuccess).toBe(true);

    // The raw token leaves tenant-A via the enqueued VerificationEmailRequested
    // event. We extract it to simulate an attacker who captured it.
    const tokenEvent = sysA.queue._enqueued.find(
      (e) => e.eventType === 'VerificationEmailRequested',
    );
    expect(tokenEvent).toBeDefined();
    const rawToken = tokenEvent!.data['rawToken'] as string;
    expect(rawToken).toBeTruthy();

    // Attempt to verify the same token on tenant-B — should fail as INVALID_TOKEN
    // because tenant-B's partition has no record of it (DNA-5 isolation).
    const crossTenantAttempt = await sysB.verification.verifyToken({
      memberId,
      rawToken,
    });
    expect(crossTenantAttempt.isSuccess).toBe(false);
    expect(crossTenantAttempt.errorCode).toBe('INVALID_TOKEN');

    // Tenant-A can still legitimately verify its own token.
    const legitimate = await sysA.verification.verifyToken({
      memberId,
      rawToken,
    });
    expect(legitimate.isSuccess).toBe(true);
    expect(legitimate.data!.verified).toBe(true);
  });

  it('TI-4: FREEDOM config values are tenant-scoped — different resend limits concurrently', async () => {
    const sysA = makeTenantSystem('tenant-A', {
      flow01_resend_rate_limit_minutes: 30,
      flow01_email_verification_ttl_seconds: 3600, // 1 hour
    });
    const sysB = makeTenantSystem('tenant-B', {
      flow01_resend_rate_limit_minutes: 120,
      flow01_email_verification_ttl_seconds: 86400, // 24 hours
    });

    // Register both tenants.
    const regA = await sysA.registration.register({
      email: 'a@example.com',
      credentials: 'pw',
    });
    const regB = await sysB.registration.register({
      email: 'b@example.com',
      credentials: 'pw',
    });
    const memberA = regA.data!.memberId;
    const memberB = regB.data!.memberId;

    // Initial verification on each.
    await sysA.verification.initiateVerification({
      memberId: memberA,
      email: 'a@example.com',
    });
    await sysB.verification.initiateVerification({
      memberId: memberB,
      email: 'b@example.com',
    });

    // First resend on each — both should succeed (no prior resend recorded).
    const resendA1 = await sysA.verification.resendVerification({
      memberId: memberA,
      email: 'a@example.com',
    });
    const resendB1 = await sysB.verification.resendVerification({
      memberId: memberB,
      email: 'b@example.com',
    });
    expect(resendA1.isSuccess).toBe(true);
    expect(resendB1.isSuccess).toBe(true);

    // Second resend within the window — both should rate-limit with each
    // tenant's own window value. Error message contains each tenant's minutes.
    const resendA2 = await sysA.verification.resendVerification({
      memberId: memberA,
      email: 'a@example.com',
    });
    const resendB2 = await sysB.verification.resendVerification({
      memberId: memberB,
      email: 'b@example.com',
    });
    expect(resendA2.isSuccess).toBe(false);
    expect(resendA2.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(resendA2.errorMessage).toContain('30 minutes');

    expect(resendB2.isSuccess).toBe(false);
    expect(resendB2.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(resendB2.errorMessage).toContain('120 minutes');

    // Each tenant's FREEDOM config received calls independently.
    expect(sysA.freedomConfig.get).toHaveBeenCalledWith('flow01_resend_rate_limit_minutes');
    expect(sysB.freedomConfig.get).toHaveBeenCalledWith('flow01_resend_rate_limit_minutes');
  });

  it('TI-5: OnboardingCompleted event payload carries only the owning tenant ID', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    // Run the full onboarding delivery for each tenant.
    for (const sys of [sysA, sysB]) {
      const reg = await sys.registration.register({
        email: `user@${sys.tenantId}.com`,
        credentials: 'pw',
      });
      const memberId = reg.data!.memberId;

      await sys.onboarding.deliverWorkspace({ memberId, userId: memberId });
      await sys.onboarding.deliverTutorial({ memberId, userId: memberId });
      await sys.onboarding.deliverInvitation({
        memberId,
        userId: memberId,
        email: `user@${sys.tenantId}.com`,
      });

      const gated = await sys.onboarding.checkCompletionGate({
        memberId,
        userId: memberId,
        email: `user@${sys.tenantId}.com`,
      });
      expect(gated.isSuccess).toBe(true);
    }

    // Tenant-A's queue has only tenant-A's OnboardingCompleted event.
    // CloudEvents envelope (DNA-9): `tenantid` extension at root + `data.tenantId`
    // in the payload + `source` interpolated with tenantId.
    const onboardingA = sysA.queue._enqueued.filter((e) => e.eventType === 'OnboardingCompleted');
    expect(onboardingA.length).toBe(1);
    const eventA = onboardingA[0].data as Record<string, unknown>;
    const eventAData = eventA['data'] as Record<string, unknown>;
    expect(eventAData['tenantId']).toBe('tenant-A');
    expect(eventA['tenantid']).toBe('tenant-A'); // XIIGen extension per DNA-9
    expect(eventA['source']).toContain('tenant-A');

    // Tenant-B's queue has only tenant-B's OnboardingCompleted event.
    const onboardingB = sysB.queue._enqueued.filter((e) => e.eventType === 'OnboardingCompleted');
    expect(onboardingB.length).toBe(1);
    const eventB = onboardingB[0].data as Record<string, unknown>;
    const eventBData = eventB['data'] as Record<string, unknown>;
    expect(eventBData['tenantId']).toBe('tenant-B');
    expect(eventB['tenantid']).toBe('tenant-B'); // XIIGen extension per DNA-9
    expect(eventB['source']).toContain('tenant-B');

    // Neither queue contains the other tenant's events in any form.
    expect(
      sysA.queue._enqueued.some(
        (e) => (e.data as Record<string, unknown>)['tenantid'] === 'tenant-B',
      ),
    ).toBe(false);
    expect(
      sysB.queue._enqueued.some(
        (e) => (e.data as Record<string, unknown>)['tenantid'] === 'tenant-A',
      ),
    ).toBe(false);
  });

  it('TI-6: Error messages do not disclose cross-tenant record existence', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    // Tenant-A registers victim@example.com.
    await sysA.registration.register({
      email: 'victim@example.com',
      credentials: 'pw',
    });

    // Tenant-B registers the SAME email. Per DNA-5 isolation, this must succeed
    // and NOT return DUPLICATE_EMAIL (that would leak the fact that tenant-A
    // owns the email).
    const registerB = await sysB.registration.register({
      email: 'victim@example.com',
      credentials: 'pw',
    });
    expect(registerB.isSuccess).toBe(true);

    // Tenant-B tries to verify a token for a memberId that only exists in
    // tenant-A's partition (e.g. an attacker guessed a memberId). The error
    // must be the same shape as "unknown token" — not "other-tenant token".
    const cross = await sysB.verification.verifyToken({
      memberId: 'usr-tenant-a-victim',
      rawToken: createHash('sha256').update(randomBytes(32)).digest('hex'),
    });
    expect(cross.isSuccess).toBe(false);
    expect(cross.errorCode).toBe('INVALID_TOKEN');
    // Error message must not contain 'tenant-A' or any cross-tenant identifier.
    expect(cross.errorMessage).not.toContain('tenant-A');
    expect(cross.errorMessage).not.toContain('other-tenant');
  });

  it('TI-7: Concurrent registration on both tenants does not interleave state', async () => {
    const sysA = makeTenantSystem('tenant-A');
    const sysB = makeTenantSystem('tenant-B');

    // Fire 10 concurrent registrations per tenant.
    const aPromises = Array.from({ length: 10 }, (_, i) =>
      sysA.registration.register({
        email: `a-${i}@example.com`,
        credentials: 'pw',
      }),
    );
    const bPromises = Array.from({ length: 10 }, (_, i) =>
      sysB.registration.register({
        email: `b-${i}@example.com`,
        credentials: 'pw',
      }),
    );

    const [aResults, bResults] = await Promise.all([
      Promise.all(aPromises),
      Promise.all(bPromises),
    ]);

    // All succeed.
    expect(aResults.every((r) => r.isSuccess)).toBe(true);
    expect(bResults.every((r) => r.isSuccess)).toBe(true);

    // Tenant-A's partition has exactly 10 records, all tagged tenant-A.
    const aRecords = sysA.db._partition.get('xiigen-user-registrations') ?? [];
    expect(aRecords.length).toBe(10);
    expect(aRecords.every((r) => r['tenant_id'] === 'tenant-A')).toBe(true);

    // Tenant-B's partition has exactly 10 records, all tagged tenant-B.
    const bRecords = sysB.db._partition.get('xiigen-user-registrations') ?? [];
    expect(bRecords.length).toBe(10);
    expect(bRecords.every((r) => r['tenant_id'] === 'tenant-B')).toBe(true);

    // No cross-tenant memberId collisions.
    const aMemberIds = aResults.map((r) => r.data!.memberId);
    const bMemberIds = bResults.map((r) => r.data!.memberId);
    const intersection = aMemberIds.filter((id) => bMemberIds.includes(id));
    expect(intersection.length).toBe(0);
  });
});
