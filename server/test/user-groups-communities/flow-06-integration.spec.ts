/**
 * FLOW-06 Integration Tests — 7 scenarios
 *
 * INT-06-01: Full public join: validate → tier → access control → membership → gate
 * INT-06-02: Access control before content: T101 storeDocument before membership.activated emit
 * INT-06-03: Tier filter at query layer: FREE member T105 search includes content_access_level filter
 * INT-06-04: Private group: T102 PENDING → T112 → T114 APPROVE → GroupMembershipCompleted
 * INT-06-05: Private group rejection: T114 REJECT → membership.rejected → no GroupMembershipCompleted
 * INT-06-06: Concurrent join (SETNX): two T102.record() calls → both success, one storeDocument
 * INT-06-07: Cross-tenant isolation: T102 record has tenantId from input, connection_type='FLOW_SCOPED'
 */

import 'reflect-metadata';
import { JoinRequestValidator } from '../../src/engine/flows/membership-group-feed/join-request-validator.service';
import { MembershipTierAssigner } from '../../src/engine/flows/membership-group-feed/membership-tier-assigner.service';
import { AccessControlProvisioner } from '../../src/engine/flows/membership-group-feed/access-control-provisioner.service';
import { MembershipRecorder } from '../../src/engine/flows/membership-group-feed/membership-recorder.service';
import { GroupMembershipCompleted } from '../../src/engine/flows/membership-group-feed/group-membership-completed.service';
import { TierContentSelector } from '../../src/engine/flows/membership-group-feed/tier-content-selector.service';
import { JoinRequestProcessor } from '../../src/engine/flows/membership-group-feed/join-request-processor.service';
import { ApprovalResultHandler } from '../../src/engine/flows/membership-group-feed/approval-result-handler.service';
import { GroupMembershipCompletedApproval } from '../../src/engine/flows/membership-group-feed/group-membership-completed-approval.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Stateful DB mock (simulates real persistence within a test) ───────────────

function makeStatefulDb(
  callOrder: string[],
  initialSeed: Record<string, Array<Record<string, unknown>>> = {},
) {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};

  // Initialize from seed
  for (const [index, docs] of Object.entries(initialSeed)) {
    store[index] = {};
    for (const doc of docs) {
      const id = (doc['_id'] ??
        doc['group_id'] ??
        doc['membership_id'] ??
        doc['access_control_id'] ??
        `seed-${Math.random()}`) as string;
      store[index][id] = doc;
    }
  }

  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filters: Record<string, unknown>) => {
        const indexDocs = Object.values(store[index] ?? {});
        const matched = indexDocs.filter((doc) => {
          for (const [key, val] of Object.entries(filters)) {
            if (val === undefined || val === null) continue;
            if (doc[key] !== val) return false;
          }
          return true;
        });
        return DataProcessResult.success(matched);
      }),
    storeDocument: jest
      .fn()
      .mockImplementation(async (index: string, doc: Record<string, unknown>, docId?: string) => {
        callOrder.push('storeDocument');
        const id = docId ?? (doc['_id'] as string) ?? `doc-${Date.now()}-${Math.random()}`;
        if (!store[index]) store[index] = {};
        store[index][id] = { ...doc, _id: id };
        return DataProcessResult.success(store[index][id]);
      }),
    _store: store,
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push(`enqueue:${eventType}`);
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

// ── INT-06-01: Full public join flow ──────────────────────────────────────────

describe('INT-06-01: Full public join flow', () => {
  it('validates → assigns tier → provisions access → records membership → gate emits GroupMembershipCompleted', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
      'xiigen-user-bans': [],
      'xiigen-group-memberships': [],
      'xiigen-subscriptions': [{ subscription_id: 'sub-001', user_id: 'usr-001', tier: 'PREMIUM' }],
      freedom_configs: [],
      'xiigen-access-controls': [],
    });
    const queue = makeQueue(callOrder);

    // T99: validate
    const validator = new JoinRequestValidator(db as any);
    const validResult = await validator.validate({
      groupId: 'grp-001',
      userId: 'usr-001',
      tenantId: 'tenant-001',
    });
    expect(validResult.isSuccess).toBe(true);

    // T100: assign tier
    const assigner = new MembershipTierAssigner(db as any);
    const tierResult = await assigner.assignTier({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
    });
    expect(tierResult.isSuccess).toBe(true);
    expect(tierResult.data!.assignedTier).toBe('PREMIUM');

    // T101: provision access control
    const provisioner = new AccessControlProvisioner(db as any, queue as any);
    const acResult = await provisioner.provision({
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: tierResult.data!.assignedTier,
      accessLevels: tierResult.data!.accessLevels,
      tenantId: 'tenant-001',
    });
    expect(acResult.isSuccess).toBe(true);

    // T102: record membership
    const recorder = new MembershipRecorder(db as any, queue as any);
    const memResult = await recorder.record({
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: tierResult.data!.assignedTier,
      tenantId: 'tenant-001',
    });
    expect(memResult.isSuccess).toBe(true);
    expect(memResult.data!.status).toBe('ACTIVE');

    // T103: gate
    const gate = new GroupMembershipCompleted(db as any, queue as any);
    const gateResult = await gate.complete({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      membershipId: memResult.data!.membershipId,
    });
    expect(gateResult.isSuccess).toBe(true);
    expect(gateResult.data!.emitted).toBe(true);

    // Verify GroupMembershipCompleted was emitted
    const completed = queue._enqueued.find((e) => e.eventType === 'GroupMembershipCompleted');
    expect(completed).toBeDefined();

    // Verify storeDocument happened before membership.activated
    const storeIdx = callOrder.indexOf('storeDocument');
    const activateIdx = callOrder.findIndex((c) => c === 'enqueue:membership.activated');
    expect(storeIdx).toBeLessThan(activateIdx);
  });
});

// ── INT-06-02: Access control stored before membership.activated ──────────────

describe('INT-06-02: Access control before content (DNA-8)', () => {
  it('T101 storeDocument comes before membership.activated emit in callOrder', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder);
    const queue = makeQueue(callOrder);

    const provisioner = new AccessControlProvisioner(db as any, queue as any);
    await provisioner.provision({
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: 'PREMIUM',
      accessLevels: ['premium', 'standard', 'open_access'],
      tenantId: 'tenant-001',
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const activateIdx = callOrder.findIndex((c) => c === 'enqueue:membership.activated');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(activateIdx).toBeGreaterThan(storeIdx);
  });
});

// ── INT-06-03: Tier filter at query layer ─────────────────────────────────────

describe('INT-06-03: Tier filter at query layer for FREE member', () => {
  it('T105 search includes content_access_level filter for FREE member', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder, { 'xiigen-group-content': [] });

    const selector = new TierContentSelector(db as any);
    await selector.select({
      groupId: 'grp-001',
      accessLevels: ['open_access'],
      profile: { contentTypes: ['post'], dateRange: { from: '2026-01-01', to: '2026-04-12' } },
      tenantId: 'tenant-001',
    });

    const searchCall = db.searchDocuments.mock.calls.find(
      (call: [string, Record<string, unknown>]) => call[0] === 'xiigen-group-content',
    ) as [string, Record<string, unknown>] | undefined;

    expect(searchCall).toBeDefined();
    const filter = searchCall![1] as Record<string, unknown>;
    expect(filter['content_access_level']).toBeDefined();
    expect(filter['content_access_level']).toEqual(['open_access']);
  });
});

// ── INT-06-04: Private group approval flow ────────────────────────────────────

describe('INT-06-04: Private group full approval flow', () => {
  it('T102 PENDING → T112 JoinRequestProcessor → T114 APPROVE → GroupMembershipCompleted emitted', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder, {
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PRIVATE' }],
      'xiigen-group-memberships': [],
      freedom_configs: [],
    });
    const queue = makeQueue(callOrder);

    // T102: record → PENDING
    const recorder = new MembershipRecorder(db as any, queue as any);
    const memResult = await recorder.record({
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: 'FREE',
      tenantId: 'tenant-001',
    });
    expect(memResult.data!.status).toBe('PENDING');
    expect(queue._enqueued.find((e) => e.eventType === 'membership.pending')).toBeDefined();

    // GroupMembershipCompleted NOT emitted yet
    expect(queue._enqueued.find((e) => e.eventType === 'GroupMembershipCompleted')).toBeUndefined();

    // T112: process join request
    const processor = new JoinRequestProcessor(db as any, queue as any);
    await processor.process({
      userId: 'usr-001',
      groupId: 'grp-001',
      membershipId: memResult.data!.membershipId,
      tenantId: 'tenant-001',
    });

    // T114: approve decision
    const handler = new ApprovalResultHandler(db as any, queue as any);
    const approveResult = await handler.handleDecision({
      membershipId: memResult.data!.membershipId,
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });
    expect(approveResult.data!.newStatus).toBe('ACTIVE');

    // T115: GroupMembershipCompleted approval path
    const approvalGate = new GroupMembershipCompletedApproval(db as any, queue as any);
    const gateResult = await approvalGate.complete({
      membershipId: memResult.data!.membershipId,
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      decision: 'APPROVE',
    });
    expect(gateResult.data!.emitted).toBe(true);
    expect(queue._enqueued.find((e) => e.eventType === 'GroupMembershipCompleted')).toBeDefined();
  });
});

// ── INT-06-05: Private group rejection ───────────────────────────────────────

describe('INT-06-05: Private group rejection flow', () => {
  it('T114 REJECT → membership.rejected emitted → GroupMembershipCompleted NOT emitted', async () => {
    const callOrder: string[] = [];
    const pendingMem = {
      membership_id: 'mem-reject-001',
      user_id: 'usr-001',
      group_id: 'grp-001',
      status: 'PENDING',
      tenant_id: 'tenant-001',
    };
    const db = makeStatefulDb(callOrder, { 'xiigen-group-memberships': [pendingMem] });
    const queue = makeQueue(callOrder);

    // T114: reject
    const handler = new ApprovalResultHandler(db as any, queue as any);
    const rejectResult = await handler.handleDecision({
      membershipId: 'mem-reject-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'REJECT',
      tenantId: 'tenant-001',
    });
    expect(rejectResult.data!.newStatus).toBe('REJECTED');
    expect(queue._enqueued.find((e) => e.eventType === 'membership.rejected')).toBeDefined();

    // T115: not emitted on REJECT
    const approvalGate = new GroupMembershipCompletedApproval(db as any, queue as any);
    const gateResult = await approvalGate.complete({
      membershipId: 'mem-reject-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      decision: 'REJECT',
    });
    expect(gateResult.data!.emitted).toBe(false);
    expect(queue._enqueued.find((e) => e.eventType === 'GroupMembershipCompleted')).toBeUndefined();
  });
});

// ── INT-06-06: SETNX idempotency ──────────────────────────────────────────────

describe('INT-06-06: Concurrent join SETNX idempotency', () => {
  it('two record() calls for same (userId, groupId) → both success, second is idempotent', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    const input = {
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: 'FREE',
      tenantId: 'tenant-001',
    };

    const result1 = await svc.record(input);
    const result2 = await svc.record(input);

    expect(result1.isSuccess).toBe(true);
    expect(result2.isSuccess).toBe(true);
    expect(result2.data!.idempotent).toBe(true);

    // Only one storeDocument (first call)
    const storeCount = callOrder.filter((c) => c === 'storeDocument').length;
    expect(storeCount).toBe(1);
  });
});

// ── INT-06-07: Cross-tenant isolation ────────────────────────────────────────

describe('INT-06-07: Cross-tenant isolation', () => {
  it('T102 record has tenantId and connection_type=FLOW_SCOPED from input', async () => {
    const callOrder: string[] = [];
    const db = makeStatefulDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    await svc.record({
      userId: 'usr-001',
      groupId: 'grp-001',
      assignedTier: 'FREE',
      tenantId: 'tenant-xyz',
    });

    const storedDoc = db.storeDocument.mock.calls[0] as [string, Record<string, unknown>];
    expect(storedDoc[1]['tenant_id']).toBe('tenant-xyz');
    expect(storedDoc[1]['connection_type']).toBe('FLOW_SCOPED');
  });
});
