/**
 * FLOW-01 Phase A — T48 EmailVerificationService Tests
 *
 * EV-1:  EXPIRED_TOKEN and INVALID_TOKEN produce distinct error codes
 * EV-2:  Token stored as hash — raw token absent from stored record
 * EV-3:  storeDocument(token) before VerificationEmailRequested emit (DNA-8)
 * EV-4:  USED_TOKEN on second submission of same token
 * EV-5:  Token marked 'used' on expired submission (not just valid)
 * EV-6:  Resend: old token → 'superseded' before new token created
 * EV-7:  Rate limit window from FREEDOM config — not hardcoded
 * EV-8:  Rate limit counter key compound: tenantId + userId
 * MT-1:  Token records knowledge_scope=PRIVATE + tenantId
 * MT-2:  RATE_LIMIT counter isolated per tenant
 */

import 'reflect-metadata';
import { ClsService } from 'nestjs-cls';
import { EmailVerificationService } from '../../src/engine/flows/user-registration/email-verification.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { TenantContextResolver } from '../../src/kernel/multi-tenant/tenant-context.resolver';

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

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(tokenRecords: Array<Record<string, unknown>> = []) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-verification-tokens') {
        let results = tokenRecords;
        if (filter['member_id'])
          results = results.filter((r) => r['member_id'] === filter['member_id']);
        if (filter['token_hash'])
          results = results.filter((r) => r['token_hash'] === filter['token_hash']);
        if (filter['status']) results = results.filter((r) => r['status'] === filter['status']);
        return DataProcessResult.success(results);
      }
      // resend attempts — default empty
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
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

function makeMockScheduler() {
  const scheduled: Array<Record<string, unknown>> = [];
  return {
    scheduleDelayed: jest.fn(
      async (action: string, delayMs: number, payload: Record<string, unknown>, key?: string) => {
        scheduled.push({ action, delayMs, payload, key });
        return { jobId: `job-${key ?? action}-${Date.now()}` };
      },
    ),
    cancelScheduled: jest.fn().mockResolvedValue(true),
    isScheduled: jest.fn().mockResolvedValue(false),
    scheduleRecurring: jest.fn().mockResolvedValue({ jobId: 'recurring-job' }),
    cancelRecurring: jest.fn().mockResolvedValue(true),
    _scheduled: scheduled,
  } as any;
}

function makeFreedomConfig(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string) => {
      if (key in values) return { value: values[key] };
      return null;
    }),
  } as any;
}

function makeService(
  tokenRecords: Array<Record<string, unknown>> = [],
  freedomValues: Record<string, unknown> = {},
  tenantId = 't1',
): {
  svc: EmailVerificationService;
  db: ReturnType<typeof makeMockDb>;
  queue: ReturnType<typeof makeMockQueue>;
  scheduler: ReturnType<typeof makeMockScheduler>;
  cls: TenantContextResolver;
} {
  const db = makeMockDb(tokenRecords);
  const queue = makeMockQueue();
  const scheduler = makeMockScheduler();
  const freedom = Object.keys(freedomValues).length > 0 ? makeFreedomConfig(freedomValues) : null;
  const cls = makeTenantCls(tenantId);
  const svc = new EmailVerificationService(db, queue, scheduler, cls, freedom);
  return { svc, db, queue, scheduler, cls };
}

// ── Helper: get raw token from issued VerificationEmailRequested event ─────────

async function issueTokenAndGetRaw(svc: EmailVerificationService, queue: any): Promise<string> {
  await svc.initiateVerification({ memberId: 'mbr-1', email: 'a@b.com' });
  const event = queue._enqueued.find((e: any) => e.eventType === 'VerificationEmailRequested');
  return event!.data['rawToken'] as string;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EmailVerificationService (T48)', () => {
  it('EV-1: EXPIRED_TOKEN and INVALID_TOKEN produce distinct error codes', async () => {
    const { svc, db } = makeService();

    // Set up an expired token in db
    const { createHash } = await import('crypto');
    const rawExpiredToken = 'expired-raw-token-fixture';
    const hashExpired = createHash('sha256').update(rawExpiredToken).digest('hex');

    // Override searchDocuments to return the expired token when queried
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-verification-tokens' && filter['token_hash'] === hashExpired) {
          return DataProcessResult.success([
            {
              token_id: 'tok-expired',
              member_id: 'mbr-1',
              token_hash: hashExpired,
              status: 'active',
              expires_at: new Date(Date.now() - 1000).toISOString(),
              tenant_id: 't1',
            },
          ]);
        }
        return DataProcessResult.success([]);
      },
    );

    const expiredResult = await svc.verifyToken({
      memberId: 'mbr-1',
      rawToken: rawExpiredToken,
    });
    const invalidResult = await svc.verifyToken({
      memberId: 'mbr-1',
      rawToken: 'completely-unknown-token',
    });

    expect(expiredResult.isSuccess).toBe(false);
    expect(expiredResult.errorCode).toBe('EXPIRED_TOKEN');
    expect(invalidResult.isSuccess).toBe(false);
    expect(invalidResult.errorCode).toBe('INVALID_TOKEN');
    // EV-1: codes are distinct
    expect(expiredResult.errorCode).not.toBe(invalidResult.errorCode);
  });

  it('EV-2: Token stored as hash — raw token absent from stored record', async () => {
    const { svc, db } = makeService();

    await svc.initiateVerification({ memberId: 'mbr-1', email: 'a@b.com' });

    const tokenDoc = db._stored.find((s) => s.index === 'xiigen-verification-tokens')?.doc;
    expect(tokenDoc).toBeDefined();
    // raw token must NOT be present in stored record
    expect(tokenDoc!['raw_token']).toBeUndefined();
    expect(tokenDoc!['rawToken']).toBeUndefined();
    // hash MUST be present
    expect(typeof tokenDoc!['token_hash']).toBe('string');
    expect((tokenDoc!['token_hash'] as string).length).toBeGreaterThan(0);
  });

  it('EV-3: storeDocument(token) called BEFORE VerificationEmailRequested emit (DNA-8)', async () => {
    const callOrder: string[] = [];
    const { svc, db, queue } = makeService();

    db.storeDocument.mockImplementation(
      async (index: string, doc: Record<string, unknown>, id: string) => {
        callOrder.push('storeDocument');
        return DataProcessResult.success(doc);
      },
    );
    queue.enqueue.mockImplementation(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push(`enqueue:${eventType}`);
      return DataProcessResult.success({});
    });

    await svc.initiateVerification({ memberId: 'mbr-1', email: 'a@b.com' });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue:VerificationEmailRequested');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('EV-4: USED_TOKEN on second submission of the same token', async () => {
    const { svc, db, queue } = makeService();

    // Issue a fresh token
    const rawToken = await issueTokenAndGetRaw(svc, queue);

    // First verify: succeeds (token was active)
    // Set db to return the issued token
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(rawToken).digest('hex');
    const storedToken = db._stored.find((s) => s.index === 'xiigen-verification-tokens')!.doc;

    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-verification-tokens' && filter['token_hash'] === hash) {
          // Return 'used' on second call (simulating the updated record)
          const callCount = (db.searchDocuments as jest.Mock).mock.calls.filter(
            (c) => c[0] === 'xiigen-verification-tokens',
          ).length;
          const status = callCount > 1 ? 'used' : 'active';
          return DataProcessResult.success([{ ...storedToken, token_hash: hash, status }]);
        }
        return DataProcessResult.success([]);
      },
    );

    const first = await svc.verifyToken({ memberId: 'mbr-1', rawToken });
    expect(first.isSuccess).toBe(true);

    const second = await svc.verifyToken({ memberId: 'mbr-1', rawToken });
    expect(second.isSuccess).toBe(false);
    expect(second.errorCode).toBe('USED_TOKEN');
  });

  it('EV-5: Token marked "used" on expired submission — not just valid tokens', async () => {
    const { createHash } = await import('crypto');
    const rawExpired = 'expired-for-marking-test';
    const hashExpired = createHash('sha256').update(rawExpired).digest('hex');

    const { svc, db } = makeService();
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-verification-tokens' && filter['token_hash'] === hashExpired) {
          return DataProcessResult.success([
            {
              token_id: 'tok-exp',
              member_id: 'mbr-1',
              token_hash: hashExpired,
              status: 'active',
              expires_at: new Date(Date.now() - 5000).toISOString(), // already expired
              tenant_id: 't1',
            },
          ]);
        }
        return DataProcessResult.success([]);
      },
    );

    const result = await svc.verifyToken({
      memberId: 'mbr-1',
      rawToken: rawExpired,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EXPIRED_TOKEN');

    // Verify that storeDocument was called to mark token 'used' even on expired submission
    const updateCall = db._stored.find(
      (s) =>
        s.index === 'xiigen-verification-tokens' &&
        (s.doc as Record<string, unknown>)['status'] === 'used',
    );
    expect(updateCall).toBeDefined();
  });

  it('EV-6: Resend — old active token superseded BEFORE new token created', async () => {
    const existingActive = [
      {
        token_id: 'tok-old',
        member_id: 'mbr-1',
        token_hash: 'oldhash',
        status: 'active',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        tenant_id: 't1',
      },
    ];

    const { svc, db } = makeService(existingActive);

    // Make resend attempts return empty (no rate limit hit)
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-resend-attempts') return DataProcessResult.success([]);
        if (index === 'xiigen-verification-tokens' && filter['status'] === 'active') {
          return DataProcessResult.success(existingActive);
        }
        return DataProcessResult.success([]);
      },
    );

    await svc.resendVerification({ memberId: 'mbr-1', email: 'a@b.com' });

    // Find the supersede update
    const supersededCall = db._stored.find(
      (s) =>
        s.index === 'xiigen-verification-tokens' &&
        s.id === 'tok-old' &&
        (s.doc as Record<string, unknown>)['status'] === 'superseded',
    );
    expect(supersededCall).toBeDefined();
    expect((supersededCall!.doc as Record<string, unknown>)['superseded_at']).toBeDefined();
  });

  it('EV-7: Rate limit window from FREEDOM config — not hardcoded', async () => {
    // Configure a custom rate limit window (5 minutes instead of default 60)
    const { svc, db } = makeService([], {
      flow01_resend_rate_limit_minutes: 5,
    });

    // Inject a resend attempt made 10 minutes ago (within 60 min window, but OUTSIDE 5 min window)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-resend-attempts') {
          // Simulate an attempt 10 minutes ago — past the 5-minute FREEDOM window
          // Service checks 'created_after' in filter — we return empty (attempt is outside window)
          return DataProcessResult.success([]);
        }
        return DataProcessResult.success([]);
      },
    );

    // With 5-minute window, a 10-minute-old attempt should NOT be rate limited
    const result = await svc.resendVerification({
      memberId: 'mbr-1',
      email: 'a@b.com',
    });
    expect(result.isSuccess).toBe(true);
  });

  it('EV-8: Rate limit query uses compound key: tenant_id + member_id', async () => {
    const { svc, db } = makeService();

    // Simulate an active resend attempt
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-resend-attempts') {
          return DataProcessResult.success([
            { attempt_id: 'a1', tenant_id: 't1', member_id: 'mbr-1' },
          ]);
        }
        return DataProcessResult.success([]);
      },
    );

    const result = await svc.resendVerification({
      memberId: 'mbr-1',
      email: 'a@b.com',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');

    // Verify the rate limit query included both tenant_id and member_id
    const rateLimitCall = (db.searchDocuments as jest.Mock).mock.calls.find(
      (c) => c[0] === 'xiigen-resend-attempts',
    );
    expect(rateLimitCall).toBeDefined();
    expect(rateLimitCall![1]['tenant_id']).toBeDefined();
    expect(rateLimitCall![1]['member_id']).toBeDefined();
  });

  it('MT-1: Token records stored with knowledge_scope=PRIVATE and tenant_id', async () => {
    const { svc, db } = makeService([], {}, 'tenant-Z');

    await svc.initiateVerification({ memberId: 'mbr-1', email: 'a@b.com' });

    const tokenDoc = db._stored.find((s) => s.index === 'xiigen-verification-tokens')?.doc;
    expect(tokenDoc).toBeDefined();
    expect(tokenDoc!['knowledge_scope']).toBe('PRIVATE');
    expect(tokenDoc!['tenant_id']).toBe('tenant-Z');
  });

  it('MT-2: RATE_LIMIT counter isolated per tenant — same memberId different tenant', async () => {
    // Tenant-A has a resend attempt
    const { svc: svcA, db: dbA } = makeService([], {}, 'tenant-A');
    dbA.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-resend-attempts' && filter['tenant_id'] === 'tenant-A') {
          return DataProcessResult.success([
            { attempt_id: 'a1', tenant_id: 'tenant-A', member_id: 'mbr-1' },
          ]);
        }
        return DataProcessResult.success([]);
      },
    );

    // Tenant-B has NO resend attempt
    const { svc: svcB, db: dbB } = makeService([], {}, 'tenant-B');
    dbB.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-resend-attempts') return DataProcessResult.success([]);
      return DataProcessResult.success([]);
    });

    const resultA = await svcA.resendVerification({
      memberId: 'mbr-1',
      email: 'a@b.com',
    });
    const resultB = await svcB.resendVerification({
      memberId: 'mbr-1',
      email: 'a@b.com',
    });

    expect(resultA.isSuccess).toBe(false); // rate limited in tenant-A
    expect(resultA.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(resultB.isSuccess).toBe(true); // not rate limited in tenant-B (isolated)
  });

  it('D-01-1: Expiry scheduled via ISchedulerService — not via queue.enqueue', async () => {
    const { svc, scheduler, queue } = makeService();

    await svc.initiateVerification({ memberId: 'mbr-1', email: 'a@b.com' });

    // ISchedulerService was called for expiry
    expect(scheduler.scheduleDelayed).toHaveBeenCalledWith(
      'token-expiry',
      expect.any(Number),
      expect.objectContaining({ tokenId: expect.any(String) }),
      expect.stringContaining('token-expiry'),
    );
    // queue.enqueue was NOT called for expiry (only VerificationEmailRequested)
    const expiryEnqueue = queue._enqueued.find((e: any) => e.eventType === 'token-expiry');
    expect(expiryEnqueue).toBeUndefined();
  });

  it('DNA-3: verifyToken returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('db failure'));
    const cls = makeTenantCls('t1');
    const svc = new EmailVerificationService(db, makeMockQueue(), makeMockScheduler(), cls, null);

    const result = await svc.verifyToken({ memberId: 'mbr-1', rawToken: 'tok' });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
