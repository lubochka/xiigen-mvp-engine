/**
 * FLOW-06 Phase E Unit Tests — T112-T115 SUBFLOW-06P Private Group Approval
 *
 * T112 — JoinRequestProcessor
 *   JRP-1: storeDocument before JoinRequestSubmitted emit (callOrder)
 *   JRP-2: expiresAt from FREEDOM config — not hardcoded
 *
 * T113 — ApprovalNotifier
 *   AN-1: approval notification includes action_links field (approve + reject)
 *
 * T114 — ApprovalResultHandler
 *   ARH-1: conditional update used — existing PENDING record updated (not SETNX)
 *   ARH-2: APPROVE: result.data.newStatus = 'ACTIVE', membership.activated emitted
 *   ARH-3: REJECT: result.data.newStatus = 'REJECTED', membership.rejected emitted (not membership.activated)
 *   ARH-4: second APPROVE on already-ACTIVE record → DataProcessResult.success (idempotent)
 *   ARH-5: storeDocument before any emit (callOrder)
 *
 * T115 — GroupMembershipCompletedApproval
 *   GMC-AP-1: GroupMembershipCompleted emitted on APPROVE path
 *   GMC-AP-2: GroupMembershipCompleted NOT emitted on REJECT path
 *   DNA-3-ARH: handleDecision() returns DataProcessResult
 *   DNA-3-JRP: process() returns DataProcessResult
 */

import 'reflect-metadata';
import {
  JoinRequestProcessor,
  JoinRequestProcessorInput,
} from '../../src/engine/flows/membership-group-feed/join-request-processor.service';
import {
  ApprovalNotifier,
  ApprovalNotifierInput,
} from '../../src/engine/flows/membership-group-feed/approval-notifier.service';
import {
  ApprovalResultHandler,
  ApprovalResultHandlerInput,
} from '../../src/engine/flows/membership-group-feed/approval-result-handler.service';
import {
  GroupMembershipCompletedApproval,
  GroupMembershipCompletedApprovalInput,
} from '../../src/engine/flows/membership-group-feed/group-membership-completed-approval.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ────────────────────────────────────────────────────────────

interface DbSeed {
  [index: string]: Array<Record<string, unknown>>;
}

function makeDb(callOrder: string[], seed: DbSeed = {}) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        const rows = seed[index] ?? [];
        return DataProcessResult.success(rows);
      }),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    }),
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

// ── T112 JoinRequestProcessor ─────────────────────────────────────────────────

describe('T112 JoinRequestProcessor', () => {
  const baseInput: JoinRequestProcessorInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    membershipId: 'mem-001',
    tenantId: 'tenant-001',
  };

  it('JRP-1: storeDocument before JoinRequestSubmitted emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new JoinRequestProcessor(db as any, queue as any);

    await svc.process(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:JoinRequestSubmitted'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('JRP-2: expiresAt from FREEDOM config — not hardcoded', async () => {
    const callOrder: string[] = [];
    const customHours = 48;
    const db = makeDb(callOrder, {
      freedom_configs: [
        {
          config_key: 'flow06_approval_window_hours',
          config_value: customHours,
        },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new JoinRequestProcessor(db as any, queue as any);

    const result = await svc.process(baseInput);

    expect(result.isSuccess).toBe(true);
    // Verify FREEDOM config was queried
    expect(db.searchDocuments).toHaveBeenCalledWith('freedom_configs', expect.any(Object));
    // expiresAt should be approximately 48 hours from now
    const expiresAt = new Date(result.data!.expiresAt);
    const expectedAt = new Date(Date.now() + customHours * 60 * 60 * 1000);
    const diffMs = Math.abs(expiresAt.getTime() - expectedAt.getTime());
    expect(diffMs).toBeLessThan(5000); // within 5 seconds
  });

  it('DNA-3-JRP: process() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db error')),
    };
    const queue = makeQueue(callOrder);
    const svc = new JoinRequestProcessor(db as any, queue as any);

    const result = await svc.process(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T113 ApprovalNotifier ─────────────────────────────────────────────────────

describe('T113 ApprovalNotifier', () => {
  it('AN-1: approval notification includes action_links field (approve + reject)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-admins': [{ admin_id: 'admin-001' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalNotifier(db as any, queue as any);

    const input: ApprovalNotifierInput = {
      joinRequestId: 'jr-001',
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(),
    };

    await svc.notify(input);

    const storedDoc = db.storeDocument.mock.calls[0] as [string, Record<string, unknown>];
    const actionLinks = storedDoc[1]['action_links'] as Record<string, string>;
    expect(actionLinks).toBeDefined();
    expect(actionLinks).toHaveProperty('approve');
    expect(actionLinks).toHaveProperty('reject');
  });
});

// ── T114 ApprovalResultHandler ────────────────────────────────────────────────

describe('T114 ApprovalResultHandler', () => {
  const pendingMembership = {
    membership_id: 'mem-001',
    user_id: 'usr-001',
    group_id: 'grp-001',
    status: 'PENDING',
    tenant_id: 'tenant-001',
  };

  it('ARH-1: conditional update used — existing PENDING record updated (not SETNX)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [pendingMembership],
    });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    const result = await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    // storeDocument was called with the existing membership ID (update, not new SETNX)
    const storeCall = db.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(storeCall[2]).toBe('mem-001');
  });

  it('ARH-2: APPROVE: newStatus = ACTIVE, membership.activated emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-group-memberships': [pendingMembership] });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    const result = await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.newStatus).toBe('ACTIVE');
    expect(queue._enqueued[0].eventType).toBe('membership.activated');
  });

  it('ARH-3: REJECT: newStatus = REJECTED, membership.rejected emitted (not membership.activated)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-group-memberships': [pendingMembership] });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    const result = await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'REJECT',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.newStatus).toBe('REJECTED');
    expect(queue._enqueued[0].eventType).toBe('membership.rejected');
    expect(queue._enqueued[0].eventType).not.toBe('membership.activated');
  });

  it('ARH-4: second APPROVE on already-ACTIVE record → DataProcessResult.success (idempotent)', async () => {
    const callOrder: string[] = [];
    const activeMembership = { ...pendingMembership, status: 'ACTIVE' };
    const db = makeDb(callOrder, { 'xiigen-group-memberships': [activeMembership] });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    const result = await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.idempotent).toBe(true);
    // No storeDocument or emit on idempotent path
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue._enqueued).toHaveLength(0);
  });

  it('ARH-5: storeDocument before any emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-group-memberships': [pendingMembership] });
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DNA-3-ARH: handleDecision() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new ApprovalResultHandler(db as any, queue as any);

    const result = await svc.handleDecision({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      decision: 'APPROVE',
      tenantId: 'tenant-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T115 GroupMembershipCompletedApproval ─────────────────────────────────────

describe('T115 GroupMembershipCompletedApproval', () => {
  it('GMC-AP-1: GroupMembershipCompleted emitted on APPROVE path', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [
        {
          membership_id: 'mem-001',
          status: 'ACTIVE',
        },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupMembershipCompletedApproval(db as any, queue as any);

    const input: GroupMembershipCompletedApprovalInput = {
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      decision: 'APPROVE',
    };

    const result = await svc.complete(input);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.emitted).toBe(true);
    expect(queue._enqueued[0].eventType).toBe('GroupMembershipCompleted');
  });

  it('GMC-AP-2: GroupMembershipCompleted NOT emitted on REJECT path', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new GroupMembershipCompletedApproval(db as any, queue as any);

    const result = await svc.complete({
      membershipId: 'mem-001',
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      decision: 'REJECT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.emitted).toBe(false);
    expect(queue._enqueued).toHaveLength(0);
  });
});
