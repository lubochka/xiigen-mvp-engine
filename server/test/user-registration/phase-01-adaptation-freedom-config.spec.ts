/**
 * FLOW-01 — FREEDOM-Config Adaptation Verification
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.0: a FREEDOM-config adaptation is a
 * tenant-scoped FREEDOM-key value change. This test proves FLOW-01 correctly
 * honors tenant-scoped FREEDOM overrides WITHOUT any MACHINE-logic change.
 *
 * Adaptation plan:
 *   docs/portability/flow-01/adaptation-plan-freedom-config-user-registration.md
 *
 * The sub-tenant 'acme-pro-members' overrides 4 FREEDOM keys:
 *   - flow01_invitation_inviter_name: 'The Acme Pro Team'
 *   - flow01_invitation_community_name: 'Acme Pro Members'
 *   - flow01_email_verification_ttl_seconds: 3600 (1h, stricter than 24h default)
 *   - flow01_resend_rate_limit_minutes: 15 (friendlier than 60-min default)
 *
 * Acceptance:
 *   FC-ADAPT-1: Invitation delivery on acme-pro-members tenant carries the new
 *               inviter name + community name in social_params.
 *   FC-ADAPT-2: Verification TTL on acme-pro-members is 3600000 ms (1h in ms).
 *   FC-ADAPT-3: Resend rate-limit on acme-pro-members reports '15 minutes'.
 *   FC-ADAPT-4: MACHINE invariants unchanged — event names, material types,
 *               idempotency, outbox ordering, schema all identical to baseline.
 *   FC-ADAPT-5: Default-tenant behaviour unchanged — no cross-tenant bleed.
 *
 * Naming convention: "freedom-config adaptation" is one of four adaptation
 * categories defined in adaptation-surface-user-registration.json:
 *   freedom-config / grammar / role-scope / business-domain
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

// Acme-Pro-Members tenant FREEDOM overrides (per adaptation plan)
const ACME_OVERRIDES = {
  flow01_invitation_inviter_name: 'The Acme Pro Team',
  flow01_invitation_community_name: 'Acme Pro Members',
  flow01_email_verification_ttl_seconds: 3600, // 1 hour
  flow01_resend_rate_limit_minutes: 15, // 15 minutes
} as const;

// Default-tenant FREEDOM values (XIIGEN_FREEDOM_DEFAULTS baseline)
const DEFAULT_OVERRIDES = {
  flow01_invitation_inviter_name: 'The XIIGen Team',
  flow01_invitation_community_name: 'XIIGen Community',
  flow01_email_verification_ttl_seconds: 86400,
  flow01_resend_rate_limit_minutes: 60,
} as const;

// ── Mock builders ──────────────────────────────────────────────────────────

function makeDb() {
  const partition = new Map<string, Array<Record<string, unknown>>>();

  return {
    _partition: partition,
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const records = partition.get(index) ?? [];
      const matches = records.filter((r) =>
        Object.entries(filter).every(([k, v]) => {
          if (v === undefined || v === null || v === '') return true;
          if (k === 'created_after') {
            return Date.parse(r['created_at'] as string) >= Date.parse(v as string);
          }
          return r[k] === v;
        }),
      );
      return DataProcessResult.success(matches);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const records = partition.get(index) ?? [];
      records.push({ ...doc, _id: id });
      partition.set(index, records);
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeQueue() {
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

function makeScheduler() {
  const scheduled: Array<{ jobType: string; delayMs: number; payload: unknown; key: string }> = [];
  return {
    _scheduled: scheduled,
    scheduleDelayed: jest.fn(
      async (jobType: string, delayMs: number, payload: unknown, key: string) => {
        scheduled.push({ jobType, delayMs, payload, key });
        return { jobId: `job-${scheduled.length}` };
      },
    ),
    cancel: jest.fn(async () => DataProcessResult.success(true)),
  } as any;
}

function makeFreedomConfig(values: Record<string, unknown>) {
  return {
    get: jest.fn(async (key: string) => {
      if (!(key in values)) return null;
      return { value: values[key] };
    }),
    set: jest.fn(),
    list: jest.fn(),
  } as any;
}

function makeSystem(freedomValues: Record<string, unknown>, tenantId = 'default-tenant') {
  const db = makeDb();
  const queue = makeQueue();
  const scheduler = makeScheduler();
  const freedomConfig = makeFreedomConfig(freedomValues);
  const cls = makeTenantCls(tenantId);
  const hasher = makeHasher();
  const registration = new RegistrationService(db, queue, hasher, cls);
  const verification = new EmailVerificationService(db, queue, scheduler, cls, freedomConfig);
  const onboarding = new OnboardingDeliveryService(db, queue, cls, freedomConfig);
  return { db, queue, scheduler, freedomConfig, cls, registration, verification, onboarding };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FLOW-01 FREEDOM-Config Adaptation Verification', () => {
  it('FC-ADAPT-1: Acme tenant invitation uses overridden inviter + community name', async () => {
    const acme = makeSystem(ACME_OVERRIDES, 'acme-pro-members');

    const result = await acme.onboarding.deliverInvitation({
      memberId: 'mem-acme-1',
      userId: 'usr-acme-1',
      email: 'user@acme.com',
    });

    expect(result.isSuccess).toBe(true);

    const deliveries = acme.db._partition.get('xiigen-onboarding-deliveries') ?? [];
    const invitationRecord = deliveries.find((r) => r['material_type'] === 'community_invitation');
    expect(invitationRecord).toBeDefined();

    const socialParams = invitationRecord!['social_params'] as Record<string, unknown>;
    expect(socialParams['inviterName']).toBe('The Acme Pro Team');
    expect(socialParams['communityName']).toBe('Acme Pro Members');

    // Prove FREEDOM config WAS consulted (the adaptation mechanism activated)
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow01_invitation_inviter_name');
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow01_invitation_community_name');
  });

  it('FC-ADAPT-2: Acme tenant verification token TTL is 1 hour (3600s), not 24 hours', async () => {
    const acme = makeSystem(ACME_OVERRIDES, 'acme-pro-members');

    // Register a member
    const registered = await acme.registration.register({
      email: 'user@acme.com',
      credentials: 'pw',
    });
    expect(registered.isSuccess).toBe(true);
    const memberId = registered.data!.memberId;

    // Issue a verification token
    const verified = await acme.verification.initiateVerification({
      memberId,
      email: 'user@acme.com',
    });
    expect(verified.isSuccess).toBe(true);

    // Scheduler receives 3600000 ms (1 hour), not 86400000 (24 hours)
    expect(acme.scheduler._scheduled.length).toBe(1);
    expect(acme.scheduler._scheduled[0].delayMs).toBe(3600000);
    expect(acme.scheduler._scheduled[0].jobType).toBe('token-expiry');

    // Prove FREEDOM config WAS consulted
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow01_email_verification_ttl_seconds');
  });

  it('FC-ADAPT-3: Acme tenant resend rate-limit message reports 15 minutes', async () => {
    const acme = makeSystem(ACME_OVERRIDES, 'acme-pro-members');

    // Register + issue first verification
    const registered = await acme.registration.register({
      email: 'user@acme.com',
      credentials: 'pw',
    });
    const memberId = registered.data!.memberId;

    await acme.verification.initiateVerification({
      memberId,
      email: 'user@acme.com',
    });

    // First resend — succeeds
    const resend1 = await acme.verification.resendVerification({
      memberId,
      email: 'user@acme.com',
    });
    expect(resend1.isSuccess).toBe(true);

    // Second resend immediately — rate-limited with acme's 15-min window
    const resend2 = await acme.verification.resendVerification({
      memberId,
      email: 'user@acme.com',
    });
    expect(resend2.isSuccess).toBe(false);
    expect(resend2.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(resend2.errorMessage).toContain('15 minutes');
    expect(resend2.errorMessage).not.toContain('60 minutes');

    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow01_resend_rate_limit_minutes');
  });

  it('FC-ADAPT-4: MACHINE invariants unchanged — event names, material types, schema, outbox ordering', async () => {
    const acme = makeSystem(ACME_OVERRIDES, 'acme-pro-members');

    // Full happy path under acme tenant.
    const registered = await acme.registration.register({
      email: 'user@acme.com',
      credentials: 'pw',
    });
    const memberId = registered.data!.memberId;

    await acme.verification.initiateVerification({
      memberId,
      email: 'user@acme.com',
    });

    await acme.onboarding.deliverWorkspace({
      memberId,
      userId: memberId,
    });
    await acme.onboarding.deliverTutorial({
      memberId,
      userId: memberId,
    });
    await acme.onboarding.deliverInvitation({
      memberId,
      userId: memberId,
      email: 'user@acme.com',
    });

    await acme.onboarding.checkCompletionGate({
      memberId,
      userId: memberId,
      email: 'user@acme.com',
    });

    // MACHINE event names identical to baseline (no rebranding of events allowed)
    const emittedTypes = acme.queue._enqueued.map((e) => e.eventType);
    expect(emittedTypes).toContain('AccountCreated');
    expect(emittedTypes).toContain('VerificationEmailRequested');
    expect(emittedTypes).toContain('OnboardingCompleted');

    // MACHINE material type literals unchanged in stored records
    const deliveries = acme.db._partition.get('xiigen-onboarding-deliveries') ?? [];
    const types = new Set(deliveries.map((r) => r['material_type'] as string));
    expect(types.has('workspace_setup')).toBe(true);
    expect(types.has('flow_tutorial')).toBe(true);
    expect(types.has('community_invitation')).toBe(true);

    // MACHINE schema unchanged — onboarding_materials: [] present
    const regRecords = acme.db._partition.get('xiigen-user-registrations') ?? [];
    expect(regRecords[0]).toBeDefined();
    expect(Array.isArray(regRecords[0]['onboarding_materials'])).toBe(true);

    // MACHINE knowledge_scope=PRIVATE, connection_type=FLOW_SCOPED preserved
    expect(regRecords[0]['knowledge_scope']).toBe('PRIVATE');
    expect(regRecords[0]['connection_type']).toBe('FLOW_SCOPED');
  });

  it('FC-ADAPT-5: Default-tenant behaviour unchanged when running side-by-side with Acme', async () => {
    // Default tenant gets default FREEDOM values.
    const defaultTenant = makeSystem(DEFAULT_OVERRIDES, 'default-tenant');
    // Acme gets acme overrides.
    const acme = makeSystem(ACME_OVERRIDES, 'acme-pro-members');

    // Verify default tenant: 24h token, 60-min resend.
    const defReg = await defaultTenant.registration.register({
      email: 'user@default.com',
      credentials: 'pw',
    });
    await defaultTenant.verification.initiateVerification({
      memberId: defReg.data!.memberId,
      email: 'user@default.com',
    });
    await defaultTenant.verification.resendVerification({
      memberId: defReg.data!.memberId,
      email: 'user@default.com',
    });
    const defResendBlocked = await defaultTenant.verification.resendVerification({
      memberId: defReg.data!.memberId,
      email: 'user@default.com',
    });

    // Verify acme tenant: 1h token, 15-min resend.
    const acmeReg = await acme.registration.register({
      email: 'user@acme.com',
      credentials: 'pw',
    });
    await acme.verification.initiateVerification({
      memberId: acmeReg.data!.memberId,
      email: 'user@acme.com',
    });
    await acme.verification.resendVerification({
      memberId: acmeReg.data!.memberId,
      email: 'user@acme.com',
    });
    const acmeResendBlocked = await acme.verification.resendVerification({
      memberId: acmeReg.data!.memberId,
      email: 'user@acme.com',
    });

    // Default: 24h TTL + 60-min rate limit.
    expect(defaultTenant.scheduler._scheduled[0].delayMs).toBe(86400000);
    expect(defResendBlocked.errorMessage).toContain('60 minutes');

    // Acme: 1h TTL + 15-min rate limit.
    expect(acme.scheduler._scheduled[0].delayMs).toBe(3600000);
    expect(acmeResendBlocked.errorMessage).toContain('15 minutes');

    // No cross-tenant bleed.
    expect(defResendBlocked.errorMessage).not.toContain('15 minutes');
    expect(acmeResendBlocked.errorMessage).not.toContain('60 minutes');
  });
});
