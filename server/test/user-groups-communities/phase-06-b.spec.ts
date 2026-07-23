/**
 * FLOW-06 Phase B Unit Tests — T101 (AccessControlProvisioner) + T102 (MembershipRecorder)
 *                              + T103 (GroupMembershipCompleted)
 *
 * T101 — AccessControlProvisioner
 *   ACP-1: storeDocument before MembershipActivated emit (callOrder)
 *   ACP-2: knowledge_scope='PRIVATE' on stored access control record
 *   ACP-3: upsert — re-provision updates existing record (storeDocument called on both new and existing)
 *
 * T102 — MembershipRecorder
 *   MR-1: SETNX idempotency — second join returns existing record as success (not failure)
 *   MR-2: PUBLIC group → status='ACTIVE', membership.activated emitted
 *   MR-3: PRIVATE group → status='PENDING', membership.pending emitted (not membership.activated)
 *   MR-4: group.type from DB record — not from input
 *   MR-5: storeDocument before any event emit (callOrder)
 *
 * T103 — GroupMembershipCompleted
 *   GMC-1: event type exactly 'GroupMembershipCompleted' (not 'MemberJoined')
 *   GMC-2: Branch B/C events not in gate — only Branch A signals trigger it
 *   GMC-3: PENDING membership does NOT emit GroupMembershipCompleted
 *   DNA-3-ACP: provision() returns DataProcessResult
 *   DNA-3-MR: record() returns DataProcessResult
 */

import 'reflect-metadata';
import {
  AccessControlProvisioner,
  AccessControlProvisionerInput,
} from '../../src/engine/flows/membership-group-feed/access-control-provisioner.service';
import {
  MembershipRecorder,
  MembershipRecorderInput,
} from '../../src/engine/flows/membership-group-feed/membership-recorder.service';
import {
  GroupMembershipCompleted,
  GroupMembershipCompletedInput,
} from '../../src/engine/flows/membership-group-feed/group-membership-completed.service';
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

// ── T101 AccessControlProvisioner ─────────────────────────────────────────────

describe('T101 AccessControlProvisioner', () => {
  const baseInput: AccessControlProvisionerInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    assignedTier: 'PREMIUM',
    accessLevels: ['premium', 'standard', 'open_access'],
    tenantId: 'tenant-001',
  };

  it('ACP-1: storeDocument before MembershipActivated emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new AccessControlProvisioner(db as any, queue as any);

    await svc.provision(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:membership.activated'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('ACP-2: knowledge_scope=PRIVATE on stored access control record', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new AccessControlProvisioner(db as any, queue as any);

    await svc.provision(baseInput);

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string,
    ];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  it('ACP-3: upsert — storeDocument called on re-provisioning (updates existing record)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new AccessControlProvisioner(db as any, queue as any);

    await svc.provision(baseInput);
    await svc.provision({
      ...baseInput,
      assignedTier: 'STANDARD',
      accessLevels: ['standard', 'open_access'],
    });

    expect(db.storeDocument).toHaveBeenCalledTimes(2);
  });

  it('DNA-3-ACP: provision() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db error')),
    };
    const queue = makeQueue(callOrder);
    const svc = new AccessControlProvisioner(db as any, queue as any);

    const result = await svc.provision(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T102 MembershipRecorder ───────────────────────────────────────────────────

describe('T102 MembershipRecorder', () => {
  const baseInput: MembershipRecorderInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    assignedTier: 'FREE',
    tenantId: 'tenant-001',
  };

  it('MR-1: SETNX idempotency — second join returns existing record as success', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [
        {
          membership_id: 'membership-usr-001-grp-001',
          user_id: 'usr-001',
          group_id: 'grp-001',
          status: 'ACTIVE',
        },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.idempotent).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('MR-2: PUBLIC group → status=ACTIVE, membership.activated emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('ACTIVE');
    expect(queue._enqueued[0].eventType).toBe('membership.activated');
  });

  it('MR-3: PRIVATE group → status=PENDING, membership.pending emitted (not membership.activated)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PRIVATE' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('PENDING');
    expect(queue._enqueued[0].eventType).toBe('membership.pending');
    expect(queue._enqueued[0].eventType).not.toBe('membership.activated');
  });

  it('MR-4: group.type from DB record — not from input', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PRIVATE' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    await svc.record(baseInput);

    // Verify groups index was queried for group type
    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-groups', expect.any(Object));
  });

  it('MR-5: storeDocument before any event emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-memberships': [],
      'xiigen-groups': [{ group_id: 'grp-001', group_type: 'PUBLIC' }],
    });
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    await svc.record(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.startsWith('enqueue:'));
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DNA-3-MR: record() returns DataProcessResult — never throw', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn(),
    };
    const queue = makeQueue(callOrder);
    const svc = new MembershipRecorder(db as any, queue as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(typeof result.errorCode).toBe('string');
  });
});

// ── T103 GroupMembershipCompleted ─────────────────────────────────────────────

describe('T103 GroupMembershipCompleted', () => {
  const baseInput: GroupMembershipCompletedInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    membershipId: 'membership-usr-001-grp-001',
  };

  it('GMC-1: event type exactly GroupMembershipCompleted (not MemberJoined)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-access-controls': [
        { access_control_id: 'ac-usr-001-grp-001', user_id: 'usr-001', group_id: 'grp-001' },
      ],
      'xiigen-group-memberships': [
        { membership_id: 'membership-usr-001-grp-001', status: 'ACTIVE' },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupMembershipCompleted(db as any, queue as any);

    await svc.complete(baseInput);

    const emitted = queue._enqueued.find((e) => e.eventType === 'GroupMembershipCompleted');
    expect(emitted).toBeDefined();
    const wrongEvent = queue._enqueued.find((e) => e.eventType === 'MemberJoined');
    expect(wrongEvent).toBeUndefined();
  });

  it('GMC-2: no Branch B/C events triggered from gate — only GroupMembershipCompleted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-access-controls': [
        { access_control_id: 'ac-usr-001-grp-001', user_id: 'usr-001', group_id: 'grp-001' },
      ],
      'xiigen-group-memberships': [
        { membership_id: 'membership-usr-001-grp-001', status: 'ACTIVE' },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupMembershipCompleted(db as any, queue as any);

    await svc.complete(baseInput);

    expect(queue._enqueued).toHaveLength(1);
    expect(queue._enqueued[0].eventType).toBe('GroupMembershipCompleted');
  });

  it('GMC-3: PENDING membership does NOT emit GroupMembershipCompleted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-access-controls': [
        { access_control_id: 'ac-usr-001-grp-001', user_id: 'usr-001', group_id: 'grp-001' },
      ],
      'xiigen-group-memberships': [
        { membership_id: 'membership-usr-001-grp-001', status: 'PENDING' },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupMembershipCompleted(db as any, queue as any);

    const result = await svc.complete(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.emitted).toBe(false);
    expect(queue._enqueued).toHaveLength(0);
  });
});
