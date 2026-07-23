/**
 * FLOW-01 — Third-Tenant Install Proof
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.0: the final step of the adaptation
 * cycle is demonstrating that the adapted artifact installs cleanly on a
 * DIFFERENT tenant with no per-tenant code change.
 *
 * Scenario:
 *   1. Tenant 'acme-pro-members' (second tenant) applies tenant-profile-acme-pro-members.json
 *      and proves 5 FC-ADAPT assertions pass (covered in
 *      phase-01-adaptation-freedom-config.spec.ts).
 *
 *   2. A DIFFERENT third tenant ('northwind-guild') applies the SAME profile —
 *      via the tenant-profile JSON. If the adaptation is truly portable,
 *      the third tenant exhibits identical adapted behavior with zero extra
 *      configuration and zero code change.
 *
 * Acceptance (mirrors adapted behavior for a new tenant ID):
 *   INSTALL-1: Third tenant invitation uses the same overridden inviter/community names.
 *   INSTALL-2: Third tenant verification TTL is 1 hour (same as acme).
 *   INSTALL-3: Third tenant resend rate-limit is 15 minutes (same as acme).
 *   INSTALL-4: Third tenant's stored records are scoped to its OWN tenantId,
 *              not acme's. (The profile is portable; the data is isolated.)
 *   INSTALL-5: Default tenant + acme + northwind-guild can run concurrently with
 *              each tenant's adapted or default behavior independently preserved.
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
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

// ── Profile loader — simulates tenant-profile-acme-pro-members.json being installed ─

interface TenantProfile {
  tenantId: string;
  overrides: Record<string, { value: unknown; rationale: string; stakeholder: string }>;
}

function loadAcmeProfile(): TenantProfile {
  const profilePath = path.resolve(
    __dirname,
    '../../../docs/portability/flow-01/tenant-profile-acme-pro-members.json',
  );
  const raw = fs.readFileSync(profilePath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    tenantId: string;
    overrides: Record<string, { value: unknown; rationale: string; stakeholder: string }>;
  };
  return { tenantId: parsed.tenantId, overrides: parsed.overrides };
}

function loadNorthwindProfile(): TenantProfile {
  const profilePath = path.resolve(
    __dirname,
    '../../../docs/portability/flow-01/tenant-profile-northwind-guild.json',
  );
  const raw = fs.readFileSync(profilePath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    tenantId: string;
    overrides: Record<string, { value: unknown; rationale: string; stakeholder: string }>;
  };
  return { tenantId: parsed.tenantId, overrides: parsed.overrides };
}

/** Install a profile under a DIFFERENT tenant ID — proving portability. */
function rebindProfileToTenant(profile: TenantProfile, newTenantId: string): TenantProfile {
  return { tenantId: newTenantId, overrides: profile.overrides };
}

/** Extract plain key→value map for the FreedomConfig mock. */
function extractFreedomValues(profile: TenantProfile): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, cfg] of Object.entries(profile.overrides)) {
    out[key] = cfg.value;
  }
  return out;
}

// ── Mock builders (same shape as adaptation-freedom-config spec) ────────────

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

describe('FLOW-01 Third-Tenant Install Proof', () => {
  // Load profile ONCE — proves we read the committed tenant-profile JSON
  // artifact, not an inline constant. This is the "install" step.
  const acmeProfile = loadAcmeProfile();
  const northwindAdaptedProfile = loadNorthwindProfile();

  it('INSTALL-0: Profile artifact loads with expected shape', () => {
    expect(acmeProfile.tenantId).toBe('acme-pro-members');
    expect(acmeProfile.overrides['flow01_invitation_inviter_name']).toBeDefined();
    expect(acmeProfile.overrides['flow01_invitation_community_name']).toBeDefined();
    expect(acmeProfile.overrides['flow01_email_verification_ttl_seconds']).toBeDefined();
    expect(acmeProfile.overrides['flow01_resend_rate_limit_minutes']).toBeDefined();
  });

  it('INSTALL-1: Third tenant (northwind-guild) gets identical invitation branding after installing acme profile', async () => {
    // Rebind acme's profile to a NEW tenant — proving portability.
    const northwindProfile = rebindProfileToTenant(acmeProfile, 'northwind-guild');
    const northwind = makeSystem(extractFreedomValues(northwindProfile), 'northwind-guild');

    const result = await northwind.onboarding.deliverInvitation({
      memberId: 'mem-nw-1',
      userId: 'usr-nw-1',
      email: 'user@northwind.example',
    });
    expect(result.isSuccess).toBe(true);

    const deliveries = northwind.db._partition.get('xiigen-onboarding-deliveries') ?? [];
    const invitationRecord = deliveries.find((r) => r['material_type'] === 'community_invitation');
    expect(invitationRecord).toBeDefined();

    const socialParams = invitationRecord!['social_params'] as Record<string, unknown>;
    // Same overridden names the acme test asserts — proves portability of the profile.
    expect(socialParams['inviterName']).toBe('The Acme Pro Team');
    expect(socialParams['communityName']).toBe('Acme Pro Members');
  });

  it('INSTALL-2: Third tenant verification TTL is 1 hour (same as acme)', async () => {
    const northwindProfile = rebindProfileToTenant(acmeProfile, 'northwind-guild');
    const northwind = makeSystem(extractFreedomValues(northwindProfile), 'northwind-guild');

    const reg = await northwind.registration.register({
      email: 'user@northwind.example',
      credentials: 'pw',
    });
    expect(reg.isSuccess).toBe(true);

    await northwind.verification.initiateVerification({
      memberId: reg.data!.memberId,
      email: 'user@northwind.example',
    });

    expect(northwind.scheduler._scheduled.length).toBe(1);
    expect(northwind.scheduler._scheduled[0].delayMs).toBe(3600000);
  });

  it('INSTALL-3: Third tenant resend rate-limit is 15 minutes (same as acme)', async () => {
    const northwindProfile = rebindProfileToTenant(acmeProfile, 'northwind-guild');
    const northwind = makeSystem(extractFreedomValues(northwindProfile), 'northwind-guild');

    const reg = await northwind.registration.register({
      email: 'user@northwind.example',
      credentials: 'pw',
    });
    await northwind.verification.initiateVerification({
      memberId: reg.data!.memberId,
      email: 'user@northwind.example',
    });
    await northwind.verification.resendVerification({
      memberId: reg.data!.memberId,
      email: 'user@northwind.example',
    });
    const blocked = await northwind.verification.resendVerification({
      memberId: reg.data!.memberId,
      email: 'user@northwind.example',
    });

    expect(blocked.isSuccess).toBe(false);
    expect(blocked.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.errorMessage).toContain('15 minutes');
  });

  it('INSTALL-4: Third tenant records are scoped to northwind-guild — profile portable, data isolated', async () => {
    const northwindProfile = rebindProfileToTenant(acmeProfile, 'northwind-guild');
    const northwind = makeSystem(extractFreedomValues(northwindProfile), 'northwind-guild');

    await northwind.registration.register({
      email: 'user@northwind.example',
      credentials: 'pw',
    });

    const regRecords = northwind.db._partition.get('xiigen-user-registrations') ?? [];
    expect(regRecords.length).toBe(1);
    // The profile is portable (same overrides) but the data is tenant-isolated.
    expect(regRecords[0]['tenant_id']).toBe('northwind-guild');
    expect(regRecords[0]['tenant_id']).not.toBe('acme-pro-members');
    expect(regRecords[0]['knowledge_scope']).toBe('PRIVATE');
  });

  it('INSTALL-5: Three tenants (default, acme, northwind-guild) run concurrently without bleed', async () => {
    // Default tenant — no overrides.
    const defaultValues = {
      flow01_invitation_inviter_name: 'The XIIGen Team',
      flow01_invitation_community_name: 'XIIGen Community',
      flow01_email_verification_ttl_seconds: 86400,
      flow01_resend_rate_limit_minutes: 60,
    };
    const defaultTenant = makeSystem(defaultValues, 'default-tenant');

    // Acme — installs the profile under its own ID.
    const acme = makeSystem(extractFreedomValues(acmeProfile), 'acme-pro-members');

    // Northwind — installs the SAME profile under a DIFFERENT ID.
    const northwind = makeSystem(
      extractFreedomValues(rebindProfileToTenant(acmeProfile, 'northwind-guild')),
      'northwind-guild',
    );

    // All 3 exercise deliverInvitation — tenantId is read from each system's CLS.
    for (const [sys, tenantId] of [
      [defaultTenant, 'default-tenant'] as const,
      [acme, 'acme-pro-members'] as const,
      [northwind, 'northwind-guild'] as const,
    ]) {
      await sys.onboarding.deliverInvitation({
        memberId: `mem-${tenantId}-1`,
        userId: `usr-${tenantId}-1`,
        email: `user@${tenantId}.example`,
      });
    }

    const getInviterName = (sys: ReturnType<typeof makeSystem>) => {
      const deliveries = sys.db._partition.get('xiigen-onboarding-deliveries') ?? [];
      const rec = deliveries.find((r) => r['material_type'] === 'community_invitation');
      const social = rec?.['social_params'] as Record<string, unknown>;
      return social?.['inviterName'];
    };

    // Default: default inviter name.
    expect(getInviterName(defaultTenant)).toBe('The XIIGen Team');
    // Acme: adapted inviter name.
    expect(getInviterName(acme)).toBe('The Acme Pro Team');
    // Northwind: same adapted inviter name (profile is portable).
    expect(getInviterName(northwind)).toBe('The Acme Pro Team');

    // Tenant IDs stamped correctly in each partition — no cross-tenant bleed.
    const defRec = defaultTenant.db._partition
      .get('xiigen-onboarding-deliveries')!
      .find((r) => r['material_type'] === 'community_invitation')!;
    const acmeRec = acme.db._partition
      .get('xiigen-onboarding-deliveries')!
      .find((r) => r['material_type'] === 'community_invitation')!;
    const nwRec = northwind.db._partition
      .get('xiigen-onboarding-deliveries')!
      .find((r) => r['material_type'] === 'community_invitation')!;

    expect(defRec['tenant_id']).toBe('default-tenant');
    expect(acmeRec['tenant_id']).toBe('acme-pro-members');
    expect(nwRec['tenant_id']).toBe('northwind-guild');
  });

  it('INSTALL-6: Northwind adaptation preserves Acme invitation values and tightens resend to five minutes', async () => {
    const northwind = makeSystem(
      extractFreedomValues(northwindAdaptedProfile),
      'northwind-guild',
    );

    const invitation = await northwind.onboarding.deliverInvitation({
      memberId: 'mem-northwind-adapted-1',
      userId: 'usr-northwind-adapted-1',
      email: 'adapted@northwind.example',
    });
    expect(invitation.isSuccess).toBe(true);

    const deliveries = northwind.db._partition.get('xiigen-onboarding-deliveries') ?? [];
    const invitationRecord = deliveries.find((r) => r['material_type'] === 'community_invitation');
    const socialParams = invitationRecord!['social_params'] as Record<string, unknown>;
    expect(socialParams['inviterName']).toBe('The Acme Pro Team');
    expect(socialParams['communityName']).toBe('Acme Pro Members');

    const registered = await northwind.registration.register({
      email: 'adapted@northwind.example',
      credentials: 'pw',
    });
    expect(registered.isSuccess).toBe(true);

    await northwind.verification.initiateVerification({
      memberId: registered.data!.memberId,
      email: 'adapted@northwind.example',
    });
    await northwind.verification.resendVerification({
      memberId: registered.data!.memberId,
      email: 'adapted@northwind.example',
    });
    const blocked = await northwind.verification.resendVerification({
      memberId: registered.data!.memberId,
      email: 'adapted@northwind.example',
    });

    expect(blocked.isSuccess).toBe(false);
    expect(blocked.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.errorMessage).toContain('5 minutes');
    expect(blocked.errorMessage).not.toContain('15 minutes');
  });
});
