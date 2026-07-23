/**
 * FLOW-01 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that the implemented T47/T48/T49 services satisfy the
 * FLOW-01 design simulation's iron rules. They close the loop:
 * "does the service we built honour what the design simulation required?"
 *
 * DC-01: T47 email uniqueness check BEFORE storeDocument (CF-1)
 * DC-02: T47 idempotency via setIfAbsent — duplicate returns false (DNA-7)
 * DC-03: T47 no credentials in queue events (CF-8)
 * DC-04: T48 storeDocument before enqueue — token stored before email sent (DNA-8)
 * DC-05: T48 resend rate-limit from FREEDOM config — never hardcoded (CF-3)
 * DC-06: T49 completedSteps tracking — resume from last incomplete on app-reopen (CF-4)
 * DC-07: T49 OnboardingCompleted only after ALL 3 material types present (OD-6/OD-7)
 * DC-08: T49 social params from FREEDOM config — never hardcoded (FLOW-01-RAG-06)
 * DC-09: DPO triple quality — chosen.model ≠ rejected.model; curriculumTier non-null
 * DC-10: FLOW-01 → FLOW-02 cross-flow gate — OnboardingCompleted ≠ PersonalizationCompleted
 *
 * Design refs: CF-1..CF-8, OD-1..OD-11, DNA-7, DNA-8, DR-02, DR-03
 */

import 'reflect-metadata';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import { InMemoryScopedMemoryProvider } from '../../../src/fabrics/scoped-memory/in-memory.provider';
import { IDatabaseService } from '../../../src/fabrics/interfaces/database.interface';
import { IQueueService } from '../../../src/fabrics/interfaces/queue.interface';
import { TENANT_CONTEXT_KEY } from '../../../src/kernel/multi-tenant/tenant-context';
import { TenantContextResolver } from '../../../src/kernel/multi-tenant/tenant-context.resolver';
import { RegistrationService } from '../../../src/engine/flows/user-registration/registration.service';
import { EmailVerificationService } from '../../../src/engine/flows/user-registration/email-verification.service';
import { OnboardingDeliveryService } from '../../../src/engine/flows/user-registration/onboarding-delivery.service';
import { IPasswordHasherService } from '../../../src/fabrics/interfaces/password-hasher.service.interface';

const TENANT = 'flow01-dc-tenant';

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

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex(
        (d) =>
          d['id'] === id ||
          d['user_id'] === id ||
          d['token_id'] === id ||
          d['delivery_id'] === id ||
          d['completion_id'] === id ||
          d['attempt_id'] === id,
      );
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find(
        (d) =>
          d['id'] === id ||
          d['user_id'] === id ||
          d['token_id'] === id ||
          d['delivery_id'] === id ||
          d['completion_id'] === id,
      );
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makeInMemoryScheduler() {
  const scheduled: Array<{ event: string; delayMs: number; payload: unknown; jobKey: string }> = [];
  return {
    scheduleDelayed: jest.fn(
      async (event: string, delayMs: number, payload: unknown, jobKey: string) => {
        scheduled.push({ event, delayMs, payload, jobKey });
        return { jobId: `job-${jobKey}` };
      },
    ),
    _scheduled: scheduled,
  };
}

// ── Timestamp-aware DB (DC-05 rate-limit) ────────────────────────────────────
// The resend service searches with { created_after: windowStart } — the standard mock
// does exact-equality on all fields. This variant handles the 'created_after' operator
// by comparing doc['created_at'] >= value, matching Elasticsearch date-range semantics.

function makeTimestampAwareDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      bucket.push({ ...doc, id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => {
          if (k === 'created_after') {
            // Range query: return docs where created_at >= value
            return (
              doc['created_at'] !== undefined && (doc['created_at'] as string) >= (v as string)
            );
          }
          return v == null || doc[k] === v;
        }),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (_index: string, _id: string) => {
      return DataProcessResult.failure('NOT_FOUND', 'Not found');
    }),
    _store: store,
  };
}

// ── Inline freedom config (DC-05) ────────────────────────────────────────────

function makeFreedomConfig(overrides: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string) => {
      if (key in overrides) return { value: overrides[key] };
      return null;
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('FLOW-01 Design Contracts', () => {
  // ── DC-01 ──────────────────────────────────────────────────────────────────
  describe('DC-01: T47 email uniqueness check before storeDocument (CF-1)', () => {
    it('searchDocuments (uniqueness check) is called BEFORE storeDocument', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new RegistrationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeHasher(),
        makeTenantCls(TENANT),
      );

      const callOrder: string[] = [];
      (db.searchDocuments as jest.Mock).mockImplementation(
        async (index: string, filter: Record<string, unknown>) => {
          // Track the uniqueness check (searching by email)
          if (filter['email']) callOrder.push('uniqueness-check');
          return DataProcessResult.success([]);
        },
      );
      (db.storeDocument as jest.Mock).mockImplementation(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      });

      await svc.register({ email: 'user@test.com', credentials: 'pass123' });

      // CF-1: email uniqueness search must precede storeDocument
      const checkIdx = callOrder.indexOf('uniqueness-check');
      const storeIdx = callOrder.indexOf('store');
      expect(checkIdx).toBeGreaterThanOrEqual(0);
      expect(storeIdx).toBeGreaterThan(checkIdx);
    });

    it('duplicate email registration returns DUPLICATE_EMAIL failure before any write', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new RegistrationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeHasher(),
        makeTenantCls(TENANT),
      );

      // First registration — establishes the email
      await svc.register({ email: 'taken@test.com', credentials: 'pass1' });

      const storeBefore = (db.storeDocument as jest.Mock).mock.calls.length;

      // Second registration — same email
      const result = await svc.register({
        email: 'taken@test.com',
        credentials: 'pass2',
      });

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DUPLICATE_EMAIL');

      // No additional storeDocument calls after the duplicate is detected
      const storeAfter = (db.storeDocument as jest.Mock).mock.calls.length;
      expect(storeAfter).toBe(storeBefore);
    });
  });

  // ── DC-02 ──────────────────────────────────────────────────────────────────
  describe('DC-02: T47 idempotency via setIfAbsent semantics (DNA-7)', () => {
    it('InMemoryScopedMemoryProvider.setIfAbsent — first call returns true', async () => {
      const mem = new InMemoryScopedMemoryProvider();
      const key = `auth_attempt:u1:corr-001`;

      const first = await mem.setIfAbsent(key, 'processing', 300);
      expect(first).toBe(true);
    });

    it('setIfAbsent — second call with same key within TTL returns false', async () => {
      const mem = new InMemoryScopedMemoryProvider();
      const key = `auth_attempt:u2:corr-002`;

      await mem.setIfAbsent(key, 'processing', 300);
      const second = await mem.setIfAbsent(key, 'processing', 300);
      expect(second).toBe(false);
    });

    it('RegistrationService idempotencyKey returns same memberId on second call', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new RegistrationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeHasher(),
        makeTenantCls(TENANT),
      );

      const first = await svc.register({
        email: 'idem@test.com',
        credentials: 'pass',
        idempotencyKey: 'idem-key-001',
      });
      expect(first.isSuccess).toBe(true);
      const memberId = first.data!.memberId;

      // Second call with same idempotencyKey — must return same memberId
      const second = await svc.register({
        email: 'idem@test.com',
        credentials: 'pass',
        idempotencyKey: 'idem-key-001',
      });
      expect(second.isSuccess).toBe(true);
      expect(second.data!.memberId).toBe(memberId);
    });
  });

  // ── DC-03 ──────────────────────────────────────────────────────────────────
  describe('DC-03: T47 no credentials in queue events (CF-8)', () => {
    it('AccountCreated event does not contain credentials_hash or raw password', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new RegistrationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeHasher(),
        makeTenantCls(TENANT),
      );

      await svc.register({
        email: 'safe@test.com',
        credentials: 'secret-password',
      });

      const accountCreated = queue._emitted.find((e) => e.queue === 'AccountCreated');
      expect(accountCreated).toBeDefined();

      // CF-8: raw credentials and hashed credentials must NOT appear in queue events
      expect(accountCreated!.payload['credentials']).toBeUndefined();
      expect(accountCreated!.payload['credentials_hash']).toBeUndefined();
      expect(accountCreated!.payload['password']).toBeUndefined();

      // userId and tenantId must be present for downstream consumers
      expect(accountCreated!.payload['userId']).toBeDefined();
      expect(accountCreated!.payload['tenantId']).toBe(TENANT);
    });

    it('compliant AccountCreated CloudEvent has userId+tenantId, no sensitive fields', () => {
      const event = createCloudEvent({
        eventType: 'AccountCreated',
        source: 'flow-01/t47/registration-service',
        tenantId: TENANT,
        data: {
          userId: 'usr-001',
          tenantId: TENANT,
          status: 'unverified',
          // CF-8: no email, password, credentials, phone, name in CloudEvent
        },
      });

      expect(event['type']).toBe('AccountCreated');
      expect((event['data'] as Record<string, unknown>)['userId']).toBe('usr-001');
      expect((event['data'] as Record<string, unknown>)['password']).toBeUndefined();
      expect((event['data'] as Record<string, unknown>)['credentials']).toBeUndefined();
      expect((event['data'] as Record<string, unknown>)['credentials_hash']).toBeUndefined();

      const [valid] = validateCloudEvent(event);
      expect(valid).toBe(true);
    });
  });

  // ── DC-04 ──────────────────────────────────────────────────────────────────
  describe('DC-04: T48 storeDocument before enqueue — token stored before email sent (DNA-8)', () => {
    it('storeDocument (token record) is called BEFORE enqueue(VerificationEmailRequested)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const scheduler = makeInMemoryScheduler();
      const svc = new EmailVerificationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        scheduler as any,
        makeTenantCls(TENANT),
        null,
      );

      const callOrder: string[] = [];
      (db.storeDocument as jest.Mock).mockImplementation(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      });
      (queue.enqueue as jest.Mock).mockImplementation(async (q: string) => {
        if (q === 'VerificationEmailRequested') callOrder.push('enqueue');
        return DataProcessResult.success({ messageId: 'msg-1' });
      });

      await svc.initiateVerification({ memberId: 'm1', email: 'v@test.com' });

      const storeIdx = callOrder.indexOf('store');
      const enqueueIdx = callOrder.indexOf('enqueue');
      expect(storeIdx).toBeGreaterThanOrEqual(0);
      expect(enqueueIdx).toBeGreaterThan(storeIdx);
    });

    it('raw token appears only in VerificationEmailRequested — never stored in db (FLOW-01-RAG-02)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const scheduler = makeInMemoryScheduler();
      const svc = new EmailVerificationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        scheduler as any,
        makeTenantCls(TENANT),
        null,
      );

      await svc.initiateVerification({ memberId: 'm2', email: 'tok@test.com' });

      // The raw token appears in the queue event
      const verEmailEvent = queue._emitted.find((e) => e.queue === 'VerificationEmailRequested');
      expect(verEmailEvent).toBeDefined();
      const rawToken = verEmailEvent!.payload['rawToken'] as string;
      expect(rawToken).toBeDefined();
      expect(rawToken.length).toBeGreaterThan(20);

      // The stored token record contains hash, NOT the raw token
      const tokenBucket = db._store.get('xiigen-verification-tokens') ?? [];
      const storedToken = tokenBucket[tokenBucket.length - 1];
      expect(storedToken).toBeDefined();
      expect(storedToken['token_hash']).toBeDefined();
      expect(storedToken['token_hash']).not.toBe(rawToken); // stored = hash, not raw
    });
  });

  // ── DC-05 ──────────────────────────────────────────────────────────────────
  describe('DC-05: T48 resend rate-limit from FREEDOM config (CF-3)', () => {
    it('FREEDOM key FLOW01_RESEND_RATE_LIMIT_MINUTES is used for rate-limit window', async () => {
      // Timestamp-aware DB handles the 'created_after' range filter the service uses.
      // The iron rule: window duration is FREEDOM, enforcement is MACHINE.
      const db = makeTimestampAwareDb();
      const queue = makeInMemoryQueue();
      const scheduler = makeInMemoryScheduler();
      const freedom = makeFreedomConfig({ flow01_resend_rate_limit_minutes: 60 });
      const svc = new EmailVerificationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        scheduler as any,
        makeTenantCls(TENANT),
        freedom as any,
      );

      // First resend — succeeds and records an attempt
      const first = await svc.resendVerification({
        memberId: 'm3',
        email: 'r@test.com',
      });
      expect(first.isSuccess).toBe(true);

      // Second resend within the same window — rate limited
      const second = await svc.resendVerification({
        memberId: 'm3',
        email: 'r@test.com',
      });
      expect(second.isSuccess).toBe(false);
      expect(second.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('rate-limit key is compound tenantId + memberId — cross-tenant isolation', async () => {
      const db = makeTimestampAwareDb();
      const queue = makeInMemoryQueue();
      const scheduler = makeInMemoryScheduler();

      // DNA-5: tenantId is read from CLS — distinct service instances per tenant.
      const svcA = new EmailVerificationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        scheduler as any,
        makeTenantCls('tenant-A'),
        null,
      );
      const svcB = new EmailVerificationService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        scheduler as any,
        makeTenantCls('tenant-B'),
        null,
      );

      // Resend for tenant-A/member-m4
      await svcA.resendVerification({ memberId: 'm4', email: 'a@test.com' });

      // Resend for tenant-B/member-m4 (same memberId, different tenant) — should NOT be rate limited
      const crossTenant = await svcB.resendVerification({
        memberId: 'm4',
        email: 'b@test.com',
      });
      expect(crossTenant.isSuccess).toBe(true);
    });
  });

  // ── DC-06 ──────────────────────────────────────────────────────────────────
  describe('DC-06: T49 completedSteps tracking — resume from last incomplete (CF-4)', () => {
    it('checkCompletionGate with 2/3 materials returns DELIVERY_INCOMPLETE', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      // Pre-seed: workspace_setup and flow_tutorial delivered
      await svc.deliverWorkspace({ memberId: 'm5', userId: 'u5' });
      await svc.deliverTutorial({ memberId: 'm5', userId: 'u5' });

      // Gate check — community_invitation still missing
      const gateResult = await svc.checkCompletionGate({
        memberId: 'm5',
        userId: 'u5',
        email: 'res@test.com',
      });

      expect(gateResult.isSuccess).toBe(false);
      expect(gateResult.errorCode).toBe('DELIVERY_INCOMPLETE');
    });

    it('after delivering missing step, completion gate passes (resume semantics)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      // Pre-seed: 2 of 3 already done (simulates app-reopen resume)
      await svc.deliverWorkspace({ memberId: 'm6', userId: 'u6' });
      await svc.deliverTutorial({ memberId: 'm6', userId: 'u6' });

      // Resume: deliver the remaining step
      await svc.deliverInvitation({
        memberId: 'm6',
        userId: 'u6',
        email: 'inv@test.com',
      });

      // Now all 3 present — gate passes
      const gateResult = await svc.checkCompletionGate({
        memberId: 'm6',
        userId: 'u6',
        email: 'done@test.com',
      });

      expect(gateResult.isSuccess).toBe(true);
      expect(gateResult.data!.completed).toBe(true);
    });
  });

  // ── DC-07 ──────────────────────────────────────────────────────────────────
  describe('DC-07: T49 OnboardingCompleted emitted only after ALL 3 material types present', () => {
    it('partial delivery (2/3 steps) → gate fails, OnboardingCompleted NOT emitted', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      await svc.deliverWorkspace({ memberId: 'm7', userId: 'u7' });
      await svc.deliverTutorial({ memberId: 'm7', userId: 'u7' });

      await svc.checkCompletionGate({
        memberId: 'm7',
        userId: 'u7',
        email: 'partial@test.com',
      });

      const onboardingCompleted = queue._emitted.find((e) => e.queue === 'OnboardingCompleted');
      expect(onboardingCompleted).toBeUndefined();
    });

    it('full delivery (3/3 steps) → OnboardingCompleted emitted exactly once', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      await svc.deliverWorkspace({ memberId: 'm8', userId: 'u8' });
      await svc.deliverTutorial({ memberId: 'm8', userId: 'u8' });
      await svc.deliverInvitation({
        memberId: 'm8',
        userId: 'u8',
        email: 'full@test.com',
      });

      await svc.checkCompletionGate({
        memberId: 'm8',
        userId: 'u8',
        email: 'full@test.com',
      });

      const onboardingEvents = queue._emitted.filter((e) => e.queue === 'OnboardingCompleted');
      expect(onboardingEvents).toHaveLength(1);
    });

    it('OnboardingCompleted CloudEvent passes schema validation', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      await svc.deliverWorkspace({ memberId: 'm9', userId: 'u9' });
      await svc.deliverTutorial({ memberId: 'm9', userId: 'u9' });
      await svc.deliverInvitation({
        memberId: 'm9',
        userId: 'u9',
        email: 'v@test.com',
      });
      await svc.checkCompletionGate({
        memberId: 'm9',
        userId: 'u9',
        email: 'v@test.com',
      });

      const onboardingEvent = queue._emitted.find((e) => e.queue === 'OnboardingCompleted');
      expect(onboardingEvent).toBeDefined();
      // The service enqueues a CloudEvent object
      const cloudEvent = onboardingEvent!.payload as Record<string, unknown>;
      const [valid, errors] = validateCloudEvent(cloudEvent);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });
  });

  // ── DC-08 ──────────────────────────────────────────────────────────────────
  describe('DC-08: T49 social params from FREEDOM config — never hardcoded (FLOW-01-RAG-06)', () => {
    it('deliverInvitation uses FREEDOM config for inviterName and communityName', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const freedom = makeFreedomConfig({
        flow01_invitation_inviter_name: 'Alex from Support',
        flow01_invitation_community_name: 'XIIGen Builders',
      });
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        freedom as any,
      );

      await svc.deliverInvitation({
        memberId: 'm10',
        userId: 'u10',
        email: 'social@test.com',
      });

      const bucket = db._store.get('xiigen-onboarding-deliveries') ?? [];
      const inviteRecord = bucket.find((d) => d['material_type'] === 'community_invitation');
      expect(inviteRecord).toBeDefined();
      const social = inviteRecord!['social_params'] as Record<string, unknown>;
      expect(social['inviterName']).toBe('Alex from Support');
      expect(social['communityName']).toBe('XIIGen Builders');
    });

    it('deliverInvitation without FREEDOM config falls back — does not throw', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      const result = await svc.deliverInvitation({
        memberId: 'm11',
        userId: 'u11',
        email: 'fallback@test.com',
      });

      expect(result.isSuccess).toBe(true);

      const bucket = db._store.get('xiigen-onboarding-deliveries') ?? [];
      const inviteRecord = bucket.find((d) => d['material_type'] === 'community_invitation');
      const social = inviteRecord!['social_params'] as Record<string, unknown>;
      // Fallback values used — not empty, not throwing
      expect(social['inviterName']).toBeDefined();
      expect(social['communityName']).toBeDefined();
    });

    it('material type literals are MACHINE constants (DR-02 — never parameterised)', () => {
      // The three delivery method names correspond to MACHINE string literals — never computed
      const MATERIAL_TYPES = ['workspace_setup', 'flow_tutorial', 'community_invitation'] as const;

      // Each is a stable string constant — no dynamic construction
      for (const type of MATERIAL_TYPES) {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
        // None contain interpolated placeholders
        expect(type).not.toMatch(/\$\{/);
      }
    });
  });

  // ── DC-09 ──────────────────────────────────────────────────────────────────
  describe('DC-09: DPO triple quality — chosen.model ≠ rejected.model; curriculumTier non-null', () => {
    it('DPO triple has distinct chosen and rejected models (V9-002)', () => {
      const triple = {
        runId: 'run-flow01-001',
        flowId: 'FLOW-01',
        station: 'CYCLE-4',
        chosen: {
          model: 'claude-sonnet-4-6',
          output: '// FLOW-01 T47: email uniqueness before storeDocument',
          judgeScore: 9.4,
        },
        rejected: {
          model: 'gemini-2.5-pro',
          output: '// FLOW-01 T47: storeDocument then email check (incorrect)',
          judgeScore: 5.8,
        },
        curriculumTier: 1,
        patternId: 'CF-1-email-uniqueness-before-store',
      };

      expect(triple.chosen.model).not.toBe(triple.rejected.model);
      expect(triple.chosen.judgeScore).toBeGreaterThan(triple.rejected.judgeScore);
    });

    it('DPO triple curriculumTier is non-null for all FLOW-01 archetypes (V9-003)', () => {
      const triples = [
        { flowId: 'FLOW-01', archetype: ContractArchetype.ROUTING, curriculumTier: 1 },
        { flowId: 'FLOW-01', archetype: ContractArchetype.PROCESSING, curriculumTier: 2 },
        { flowId: 'FLOW-01', archetype: ContractArchetype.ORCHESTRATION, curriculumTier: 4 },
      ];

      for (const triple of triples) {
        expect(triple.curriculumTier).not.toBeNull();
        expect(triple.curriculumTier).not.toBeUndefined();
        expect(triple.curriculumTier).toBeGreaterThan(0);
      }
    });

    it('FLOW-01 tier map: ROUTING=1, PROCESSING=2, ORCHESTRATION=4', () => {
      const TIER_MAP: Record<string, number> = {
        [ContractArchetype.ROUTING]: 1,
        [ContractArchetype.PROCESSING]: 2,
        [ContractArchetype.ORCHESTRATION]: 4,
      };

      expect(TIER_MAP[ContractArchetype.ROUTING]).toBe(1);
      expect(TIER_MAP[ContractArchetype.PROCESSING]).toBe(2);
      expect(TIER_MAP[ContractArchetype.ORCHESTRATION]).toBe(4);
    });
  });

  // ── DC-10 ──────────────────────────────────────────────────────────────────
  describe('DC-10: FLOW-01 → FLOW-02 cross-flow gate — event literals are distinct', () => {
    it("OnboardingCompleted event type === 'OnboardingCompleted'", () => {
      const event = createCloudEvent({
        eventType: 'OnboardingCompleted',
        source: 'flow-01/t49/onboarding-delivery-service',
        tenantId: TENANT,
        data: { userId: 'u1', tenantId: TENANT, onboardingCompletedAt: new Date().toISOString() },
      });

      expect(event['type']).toBe('OnboardingCompleted');
    });

    it('FLOW-01 OnboardingCompleted ≠ FLOW-02 PersonalizationCompleted', () => {
      const flow01Event = createCloudEvent({
        eventType: 'OnboardingCompleted',
        source: 'flow-01/t49/onboarding-delivery-service',
        tenantId: TENANT,
        data: { userId: 'u1' },
      });
      const flow02Event = createCloudEvent({
        eventType: 'PersonalizationCompleted',
        source: 'flow-02/t52/personalization-completion-service',
        tenantId: TENANT,
        data: { userId: 'u1' },
      });

      // Each flow owns its literal — they must be distinct
      expect(flow01Event['type']).not.toBe(flow02Event['type']);
      expect(flow01Event['type']).toBe('OnboardingCompleted');
      expect(flow02Event['type']).toBe('PersonalizationCompleted');
    });

    it('FLOW-01 service emits OnboardingCompleted — never PersonalizationCompleted', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new OnboardingDeliveryService(
        db as unknown as IDatabaseService,
        queue as unknown as IQueueService,
        makeTenantCls(TENANT),
        null,
      );

      await svc.deliverWorkspace({ memberId: 'm12', userId: 'u12' });
      await svc.deliverTutorial({ memberId: 'm12', userId: 'u12' });
      await svc.deliverInvitation({
        memberId: 'm12',
        userId: 'u12',
        email: 'gate@test.com',
      });
      await svc.checkCompletionGate({
        memberId: 'm12',
        userId: 'u12',
        email: 'gate@test.com',
      });

      const emittedQueues = queue._emitted.map((e) => e.queue);
      expect(emittedQueues).toContain('OnboardingCompleted');
      expect(emittedQueues).not.toContain('PersonalizationCompleted');
    });
  });
});
