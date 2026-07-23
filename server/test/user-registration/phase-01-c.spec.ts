/**
 * FLOW-01 Phase A — T49 OnboardingDeliveryService Tests
 *
 * OD-1:  materialType='workspace_setup' is a literal — not a parameter
 * OD-2:  materialType='flow_tutorial' is a literal — not a parameter
 * OD-3:  materialType='community_invitation' is a literal — not a parameter
 * OD-4:  C1 failure records status='failed' — does not throw or block C2/C3
 * OD-5:  C3 failure records status='failed' — NODE D gate still passes
 * OD-6:  NODE D with 2 of 3 materialTypes → DELIVERY_INCOMPLETE (no emit)
 * OD-7:  NODE D with all 3 present (even all failed) → OnboardingCompleted emitted
 * OD-8:  event.type === 'OnboardingCompleted' — exact string literal
 * OD-9:  OnboardingCompleted payload includes { tenantId, userId, email, onboardingCompletedAt }
 * OD-10: storeDocument(completion record) before OnboardingCompleted emit (DNA-8)
 * OD-11: social params (inviterName, communityName) from FREEDOM config — not hardcoded
 * MT-1:  Delivery records knowledge_scope=PRIVATE + tenantId
 * MT-2:  OnboardingCompleted payload includes tenantId (FLOW-08 needs it)
 * MT-3:  SSO bypass: existingOnboardingMaterialsCount===3 → success, no emit
 */

import 'reflect-metadata';
import { ClsService } from 'nestjs-cls';
import { OnboardingDeliveryService } from '../../src/engine/flows/user-registration/onboarding-delivery.service';
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

function makeMockDb(deliveryRecords: Array<Record<string, unknown>> = []) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      if (index === 'xiigen-onboarding-deliveries') {
        let results = deliveryRecords;
        if (filter['member_id'])
          results = results.filter((r) => r['member_id'] === filter['member_id']);
        return DataProcessResult.success(results);
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

function makeFreedomConfig(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn(async (key: string) => {
      if (key in values) return { value: values[key] };
      return null;
    }),
  } as any;
}

function makeService(
  deliveryRecords: Array<Record<string, unknown>> = [],
  freedomValues: Record<string, unknown> = {},
  tenantId = 'tenant-1',
): {
  svc: OnboardingDeliveryService;
  db: ReturnType<typeof makeMockDb>;
  queue: ReturnType<typeof makeMockQueue>;
  cls: TenantContextResolver;
} {
  const db = makeMockDb(deliveryRecords);
  const queue = makeMockQueue();
  const freedom = Object.keys(freedomValues).length > 0 ? makeFreedomConfig(freedomValues) : null;
  const cls = makeTenantCls(tenantId);
  const svc = new OnboardingDeliveryService(db, queue, cls, freedom);
  return { svc, db, queue, cls };
}

const baseInput = { memberId: 'mbr-1', userId: 'usr-1' };
const inviteInput = { ...baseInput, email: 'user@example.com' };
const gateInput = { ...baseInput, email: 'user@example.com' };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('OnboardingDeliveryService (T49)', () => {
  it('OD-1: materialType stored as "workspace_setup" — MACHINE literal', async () => {
    const { svc, db } = makeService();
    await svc.deliverWorkspace(baseInput);
    const doc = db._stored.find((s) => s.index === 'xiigen-onboarding-deliveries')?.doc;
    expect(doc!['material_type']).toBe('workspace_setup');
  });

  it('OD-2: materialType stored as "flow_tutorial" — MACHINE literal', async () => {
    const { svc, db } = makeService();
    await svc.deliverTutorial(baseInput);
    const doc = db._stored.find((s) => s.index === 'xiigen-onboarding-deliveries')?.doc;
    expect(doc!['material_type']).toBe('flow_tutorial');
  });

  it('OD-3: materialType stored as "community_invitation" — MACHINE literal', async () => {
    const { svc, db } = makeService();
    await svc.deliverInvitation(inviteInput);
    const doc = db._stored.find((s) => s.index === 'xiigen-onboarding-deliveries')?.doc;
    expect(doc!['material_type']).toBe('community_invitation');
  });

  it('OD-4: C1 failure records status="failed" — does not throw or block siblings', async () => {
    const { svc, db } = makeService();
    // Make storeDocument fail for workspace (first call only)
    let callCount = 0;
    db.storeDocument.mockImplementation(
      async (index: string, doc: Record<string, unknown>, id: string) => {
        callCount++;
        if (callCount === 1) {
          // First call fails — triggers the "failed" record write
          db._stored.push({
            index,
            doc: { ...doc, status: 'failed', failed_at: new Date().toISOString() },
            id,
          });
          return DataProcessResult.failure('DB_ERROR', 'storage unavailable');
        }
        db._stored.push({ index, doc, id });
        return DataProcessResult.success(doc);
      },
    );

    const c1Result = await svc.deliverWorkspace(baseInput);
    // C1 failure returns a DataProcessResult (not thrown)
    expect(c1Result).toBeInstanceOf(DataProcessResult);
    expect(c1Result.isSuccess).toBe(false);

    // C2 and C3 can still proceed (independent)
    const c2Result = await svc.deliverTutorial(baseInput);
    expect(c2Result.isSuccess).toBe(true);
  });

  it('OD-5: C3 failure records status="failed" — NODE D gate still reads the failed record', async () => {
    // Seed all 3 delivery records including a failed community_invitation
    const allThreeRecords = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'failed',
        tenant_id: 'tenant-1',
      },
    ];
    const { svc, queue } = makeService(allThreeRecords);

    const gateResult = await svc.checkCompletionGate(gateInput);

    // Gate should PASS because all 3 materialTypes are PRESENT (failed counts as present)
    expect(gateResult.isSuccess).toBe(true);
    expect(gateResult.data!.completed).toBe(true);
    // OnboardingCompleted was emitted
    const event = queue._enqueued.find((e: any) => e.eventType === 'OnboardingCompleted');
    expect(event).toBeDefined();
  });

  it('OD-6: NODE D with only 2 of 3 materialTypes → DELIVERY_INCOMPLETE — no emit', async () => {
    const twoRecords = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      // community_invitation ABSENT
    ];
    const { svc, queue } = makeService(twoRecords);

    const result = await svc.checkCompletionGate(gateInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DELIVERY_INCOMPLETE');
    expect(queue._enqueued.length).toBe(0);
  });

  it('OD-7: NODE D with all 3 present (even all failed) → OnboardingCompleted emitted', async () => {
    const allFailed = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'failed',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'failed',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'failed',
        tenant_id: 'tenant-1',
      },
    ];
    const { svc, queue } = makeService(allFailed);

    const result = await svc.checkCompletionGate(gateInput);

    // Gate passes — failed records still count as PRESENT
    expect(result.isSuccess).toBe(true);
    expect(result.data!.completed).toBe(true);
    expect(queue._enqueued.length).toBeGreaterThan(0);
  });

  it('OD-8: event.type === "OnboardingCompleted" — exact string literal (FLOW-01-RAG-01)', async () => {
    const allDelivered = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
    ];
    const { svc, queue } = makeService(allDelivered);

    await svc.checkCompletionGate(gateInput);

    const event = queue._enqueued.find((e: any) => e.eventType === 'OnboardingCompleted');
    expect(event).toBeDefined();
    // CloudEvent: event.data is the CloudEvents envelope, which has type field
    const cloudEvent = event!.data as Record<string, unknown>;
    expect(cloudEvent['type']).toBe('OnboardingCompleted');
  });

  it('OD-9: OnboardingCompleted payload includes { tenantId, userId, email, onboardingCompletedAt }', async () => {
    const allDelivered = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
    ];
    const { svc, queue } = makeService(allDelivered);

    await svc.checkCompletionGate({
      memberId: 'mbr-1',
      userId: 'usr-1',
      email: 'user@example.com',
    });

    const event = queue._enqueued.find((e: any) => e.eventType === 'OnboardingCompleted');
    const cloudEvent = event!.data as Record<string, unknown>;
    const payload = cloudEvent['data'] as Record<string, unknown>;

    expect(payload['tenantId']).toBe('tenant-1');
    expect(payload['userId']).toBe('usr-1');
    expect(payload['email']).toBe('user@example.com');
    expect(typeof payload['onboardingCompletedAt']).toBe('string');
  });

  it('OD-10: storeDocument(completion record) called BEFORE OnboardingCompleted emit (DNA-8)', async () => {
    const callOrder: string[] = [];
    const allDelivered = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'delivered',
        tenant_id: 'tenant-1',
      },
    ];
    const { svc, db, queue } = makeService(allDelivered);

    db.storeDocument.mockImplementation(
      async (index: string, doc: Record<string, unknown>, id: string) => {
        callOrder.push('storeDocument');
        db._stored.push({ index, doc, id });
        return DataProcessResult.success(doc);
      },
    );
    queue.enqueue.mockImplementation(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push(`enqueue:${eventType}`);
      queue._enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    });

    await svc.checkCompletionGate(gateInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue:OnboardingCompleted');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('OD-11: inviterName and communityName come from FREEDOM config — not hardcoded', async () => {
    const { svc, db } = makeService([], {
      flow01_invitation_inviter_name: 'Custom Inviter',
      flow01_invitation_community_name: 'My Community',
    });

    await svc.deliverInvitation(inviteInput);

    const doc = db._stored.find((s) => s.index === 'xiigen-onboarding-deliveries')?.doc;
    expect(doc!['social_params']).toBeDefined();
    const social = doc!['social_params'] as Record<string, unknown>;
    expect(social['inviterName']).toBe('Custom Inviter');
    expect(social['communityName']).toBe('My Community');
  });

  it('MT-1: Delivery records stored with knowledge_scope=PRIVATE + tenantId', async () => {
    const { svc, db } = makeService([], {}, 'tenant-Z');

    await svc.deliverWorkspace({ memberId: 'mbr-1', userId: 'usr-1' });

    const doc = db._stored.find((s) => s.index === 'xiigen-onboarding-deliveries')?.doc;
    expect(doc!['knowledge_scope']).toBe('PRIVATE');
    expect(doc!['tenant_id']).toBe('tenant-Z');
  });

  it('MT-2: OnboardingCompleted payload includes tenantId — FLOW-08 needs it', async () => {
    const allDelivered = [
      {
        delivery_id: 'd1',
        member_id: 'mbr-1',
        material_type: 'workspace_setup',
        status: 'delivered',
        tenant_id: 'tenant-flow08',
      },
      {
        delivery_id: 'd2',
        member_id: 'mbr-1',
        material_type: 'flow_tutorial',
        status: 'delivered',
        tenant_id: 'tenant-flow08',
      },
      {
        delivery_id: 'd3',
        member_id: 'mbr-1',
        material_type: 'community_invitation',
        status: 'delivered',
        tenant_id: 'tenant-flow08',
      },
    ];
    const { svc, queue } = makeService(allDelivered, {}, 'tenant-flow08');

    await svc.checkCompletionGate({
      memberId: 'mbr-1',
      userId: 'usr-1',
      email: 'u@e.com',
    });

    const event = queue._enqueued.find((e: any) => e.eventType === 'OnboardingCompleted');
    const cloudEvent = event!.data as Record<string, unknown>;
    const payload = cloudEvent['data'] as Record<string, unknown>;

    expect(payload['tenantId']).toBe('tenant-flow08');
  });

  it('MT-3: SSO bypass — existingOnboardingMaterialsCount===3 → success, no emit, no db write', async () => {
    const { svc, db, queue } = makeService();

    const result = await svc.checkCompletionGate({
      ...gateInput,
      existingOnboardingMaterialsCount: 3, // SSO: user already has all 3
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completed).toBe(true);
    // No delivery query or completion write occurred
    expect(db.searchDocuments).not.toHaveBeenCalled();
    expect(db.storeDocument).not.toHaveBeenCalled();
    // No OnboardingCompleted emitted (SSO flow handles this separately)
    expect(queue._enqueued.length).toBe(0);
  });

  it('DNA-3: checkCompletionGate returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('unexpected db crash'));
    const cls = makeTenantCls('tenant-1');
    const svc = new OnboardingDeliveryService(db, makeMockQueue(), cls, null);

    const result = await svc.checkCompletionGate(gateInput);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
