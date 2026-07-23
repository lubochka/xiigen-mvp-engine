/**
 * FLOW-06 Phase D Unit Tests — T108-T111 Notifications + Analytics (Branch C)
 *
 * T108 — MemberWelcomeNotifier
 *   MWN-1: PENDING membership → different message template flag from ACTIVE
 *   MWN-2: message wording from FREEDOM config (not hardcoded)
 *   MWN-3: storeDocument called for notification record
 *
 * T109 — GroupAdminNotifier
 *   GAN-1: per-admin rate limit key matches pattern admin-notify:{tenantId}:{adminId}:{groupId}
 *   GAN-2: PRIVATE group notification includes action_links field
 *
 * T110 — ConnectionGroupNotifier
 *   CGN-1: DB error → DataProcessResult.success (best-effort)
 *   CGN-2: max 5 notifications enforced
 *
 * T111 — MembershipAnalyticsTracker
 *   MAT-1: DB error → DataProcessResult.success (OBSERVABILITY)
 *   MAT-2: null db mock → still returns success
 *   DNA-3: all notify() methods return DataProcessResult
 */

import 'reflect-metadata';
import {
  MemberWelcomeNotifier,
  MemberWelcomeNotifierInput,
} from '../../src/engine/flows/membership-group-feed/member-welcome-notifier.service';
import {
  GroupAdminNotifier,
  GroupAdminNotifierInput,
} from '../../src/engine/flows/membership-group-feed/group-admin-notifier.service';
import {
  ConnectionGroupNotifier,
  ConnectionGroupNotifierInput,
} from '../../src/engine/flows/membership-group-feed/connection-group-notifier.service';
import {
  MembershipAnalyticsTracker,
  MembershipAnalyticsTrackerInput,
} from '../../src/engine/flows/membership-group-feed/membership-analytics-tracker.service';
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

// ── T108 MemberWelcomeNotifier ────────────────────────────────────────────────

describe('T108 MemberWelcomeNotifier', () => {
  it('MWN-1: PENDING membership → different template key from ACTIVE', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      freedom_configs: [
        {
          config_key: 'flow06_welcome_message_template',
          config_value: { active: 'welcome_active', pending: 'welcome_pending' },
        },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new MemberWelcomeNotifier(db as any, queue as any);

    const activeResult = await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      status: 'ACTIVE',
    });
    const pendingResult = await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      status: 'PENDING',
    });

    expect(activeResult.data!.templateKey).not.toBe(pendingResult.data!.templateKey);
  });

  it('MWN-2: message wording from FREEDOM config (not hardcoded)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      freedom_configs: [
        {
          config_key: 'flow06_welcome_message_template',
          config_value: { active: 'custom_welcome_v2', pending: 'custom_pending_v2' },
        },
      ],
    });
    const queue = makeQueue(callOrder);
    const svc = new MemberWelcomeNotifier(db as any, queue as any);

    const result = await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      status: 'ACTIVE',
    });

    expect(result.data!.templateKey).toBe('custom_welcome_v2');
    // Verify FREEDOM config was queried
    expect(db.searchDocuments).toHaveBeenCalledWith('freedom_configs', expect.any(Object));
  });

  it('MWN-3: storeDocument called for notification record', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new MemberWelcomeNotifier(db as any, queue as any);

    await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      status: 'ACTIVE',
    });

    expect(db.storeDocument).toHaveBeenCalled();
  });
});

// ── T109 GroupAdminNotifier ───────────────────────────────────────────────────

describe('T109 GroupAdminNotifier', () => {
  it('GAN-1: per-admin rate limit key matches pattern admin-notify:{tenantId}:{adminId}:{groupId}', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-admins': [{ admin_id: 'admin-001' }],
      'xiigen-rate-limits': [],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupAdminNotifier(db as any, queue as any);

    await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      groupType: 'PUBLIC',
    });

    // Verify rate limit key format was used in search
    const rateLimitCall = db.searchDocuments.mock.calls.find(
      (call: [string, Record<string, unknown>]) => call[0] === 'xiigen-rate-limits',
    ) as [string, Record<string, unknown>] | undefined;
    expect(rateLimitCall).toBeDefined();
    const keyUsed = rateLimitCall![1]['rate_limit_key'] as string;
    expect(keyUsed).toMatch(/^admin-notify:tenant-001:admin-001:grp-001$/);
  });

  it('GAN-2: PRIVATE group notification includes action_links field', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-group-admins': [{ admin_id: 'admin-001' }],
      'xiigen-rate-limits': [],
    });
    const queue = makeQueue(callOrder);
    const svc = new GroupAdminNotifier(db as any, queue as any);

    await svc.notify({
      userId: 'usr-001',
      groupId: 'grp-001',
      tenantId: 'tenant-001',
      groupType: 'PRIVATE',
      membershipId: 'mem-001',
    });

    const storedDoc = db.storeDocument.mock.calls[0] as [string, Record<string, unknown>];
    expect(storedDoc[1]).toHaveProperty('action_links');
  });
});

// ── T110 ConnectionGroupNotifier ──────────────────────────────────────────────

describe('T110 ConnectionGroupNotifier', () => {
  const baseInput: ConnectionGroupNotifierInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
  };

  it('CGN-1: DB error → DataProcessResult.success (best-effort)', async () => {
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('store error')),
    };
    const queue = {
      enqueue: jest.fn().mockRejectedValue(new Error('queue error')),
    };
    const svc = new ConnectionGroupNotifier(db as any, queue as any);

    const result = await svc.notify(baseInput);

    expect(result.isSuccess).toBe(true);
  });

  it('CGN-2: max 5 notifications enforced', async () => {
    const callOrder: string[] = [];
    // Seed 10 connections
    const connections = Array.from({ length: 10 }, (_, i) => ({
      connection_id: `conn-${i}`,
      user_id: 'usr-001',
    }));
    const db = makeDb(callOrder, {
      'xiigen-connections': connections,
      freedom_configs: [],
    });
    const queue = makeQueue(callOrder);
    const svc = new ConnectionGroupNotifier(db as any, queue as any);

    const result = await svc.notify(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.notifiedCount).toBeLessThanOrEqual(5);
  });
});

// ── T111 MembershipAnalyticsTracker ──────────────────────────────────────────

describe('T111 MembershipAnalyticsTracker', () => {
  const baseInput: MembershipAnalyticsTrackerInput = {
    userId: 'usr-001',
    groupId: 'grp-001',
    tenantId: 'tenant-001',
    event: 'membership.created',
  };

  it('MAT-1: DB error → DataProcessResult.success (OBSERVABILITY)', async () => {
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db error')),
      storeDocument: jest.fn().mockRejectedValue(new Error('store error')),
    };
    const svc = new MembershipAnalyticsTracker(db as any);

    const result = await svc.track(baseInput);

    expect(result.isSuccess).toBe(true);
  });

  it('MAT-2: null db mock → still returns success', async () => {
    const svc = new MembershipAnalyticsTracker(null as any);

    const result = await svc.track(baseInput);

    expect(result.isSuccess).toBe(true);
  });

  it('DNA-3: track() returns DataProcessResult — never throw', async () => {
    const svc = new MembershipAnalyticsTracker(null as any);

    const result = await svc.track(baseInput);

    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
