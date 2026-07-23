/**
 * FLOW-07 Phase G — T80 MutualConnectionCounter + T81 PrivacyGatekeeper + T82 SocialGraphAnalytics
 *
 * T80-1: Full recompute returns correct count from adjacency intersection
 * T80-2: Same result on second call with same inputs (idempotency)
 * T80-3: Delta increment NOT present — reads adjacency lists, not stored count
 * T80-4: storeDocument BEFORE MutualCountUpdated (callOrder)
 * T80-5: Tenant-scoped: connections from different tenant not counted
 * T81-1: check() returns allowed=true for non-blocked user
 * T81-2: check() returns allowed=false for blocked user
 * T81-3: No @EventPattern on T81 class (verify class structure)
 * T82-1: Returns success even when analytics write fails (OBSERVABILITY)
 * T82-2: No per-user IDs in stored aggregate record
 * MT-7: T82 stored record knowledgeScope=GLOBAL (aggregate metrics)
 */

import 'reflect-metadata';
import { MutualConnectionCounterService } from '../../src/engine/flows/friend-request-social-feed/mutual-connection-counter.service';
import { PrivacyGatekeeperService } from '../../src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service';
import { SocialGraphAnalyticsService } from '../../src/engine/flows/friend-request-social-feed/social-graph-analytics.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T80 mocks ─────────────────────────────────────────────────────────────────

function makeConnectionGraphService(connectionsMap: Record<string, string[]>) {
  return {
    getConnections: jest
      .fn()
      .mockImplementation(async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
        const key = `${tenantId}:${userId}`;
        return DataProcessResult.success({ connectionIds: connectionsMap[key] ?? [] });
      }),
  };
}

function makeDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
  };
}

function makeDbFail() {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('STORE_FAILED', 'error')),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function makePrivacySettings(blocked: boolean) {
  return {
    getSettings: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({ allowFriendRequests: !blocked, feedVisible: !blocked }),
      ),
  };
}

// ── T80 Tests ─────────────────────────────────────────────────────────────────

describe('T80 MutualConnectionCounter', () => {
  const BASE_REQUEST = { userIdA: 'user-A', userIdB: 'user-B', tenantId: 'tenant-X' };

  it('T80-1: Full recompute returns correct count from adjacency intersection', async () => {
    const callOrder: string[] = [];
    const graphSvc = makeConnectionGraphService({
      'tenant-X:user-A': ['conn-1', 'conn-2', 'conn-3'],
      'tenant-X:user-B': ['conn-2', 'conn-3', 'conn-4'],
    });
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);

    const svc = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    const result = await svc.countMutualConnections(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.mutualCount).toBe(2); // conn-2 and conn-3
  });

  it('T80-2: Same result on second call with same inputs (idempotency)', async () => {
    const graphSvc = makeConnectionGraphService({
      'tenant-X:user-A': ['conn-1', 'conn-2'],
      'tenant-X:user-B': ['conn-2'],
    });
    const db = makeDb([]);
    const queue = makeQueue([]);

    const svc = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    const r1 = await svc.countMutualConnections(BASE_REQUEST);
    const r2 = await svc.countMutualConnections(BASE_REQUEST);

    expect(r1.data?.mutualCount).toBe(r2.data?.mutualCount);
  });

  it('T80-3: Delta increment NOT present — reads adjacency lists not stored count', async () => {
    const callOrder: string[] = [];
    const graphSvc = makeConnectionGraphService({
      'tenant-X:user-A': ['conn-1'],
      'tenant-X:user-B': ['conn-1'],
    });
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);

    const svc = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    await svc.countMutualConnections(BASE_REQUEST);

    // Verify reads come from getConnections (not from stored count)
    expect(graphSvc.getConnections).toHaveBeenCalledTimes(2);
  });

  it('T80-4: storeDocument BEFORE MutualCountUpdated (callOrder)', async () => {
    const callOrder: string[] = [];
    const graphSvc = makeConnectionGraphService({ 'tenant-X:user-A': [], 'tenant-X:user-B': [] });
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);

    const svc = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    await svc.countMutualConnections(BASE_REQUEST);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T80-5: Tenant-scoped: connections from different tenant not counted', async () => {
    const graphSvc = makeConnectionGraphService({
      'tenant-X:user-A': ['conn-shared'],
      'tenant-X:user-B': ['conn-other-tenant'],
      'tenant-Y:user-A': ['conn-shared'],
      'tenant-Y:user-B': ['conn-shared'],
    });
    const db = makeDb([]);
    const queue = makeQueue([]);

    const svc = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    const result = await svc.countMutualConnections(BASE_REQUEST); // tenant-X only

    expect(result.data?.mutualCount).toBe(0); // conn-other-tenant is not conn-shared
  });
});

// ── T81 Tests ─────────────────────────────────────────────────────────────────

describe('T81 PrivacyGatekeeper', () => {
  it('T81-1: check() returns allowed=true for non-blocked user', async () => {
    const privacySettings = makePrivacySettings(false);
    const svc = new PrivacyGatekeeperService(privacySettings as any, null as any);

    const result = await svc.check({
      userId: 'user-A',
      tenantId: 'tenant-X',
      action: 'friend_request',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(true);
  });

  it('T81-2: check() returns allowed=false for blocked user', async () => {
    const privacySettings = makePrivacySettings(true);
    const svc = new PrivacyGatekeeperService(privacySettings as any, null as any);

    const result = await svc.check({
      userId: 'user-A',
      tenantId: 'tenant-X',
      action: 'friend_request',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(false);
  });

  it('T81-3: No @EventPattern on T81 class (verify class structure)', () => {
    // Verifies PrivacyGatekeeperService is @Injectable() only, never @EventPattern
    const proto = Object.getOwnPropertyNames(PrivacyGatekeeperService.prototype);
    // Should not have event handler metadata
    const metadata = Reflect.getMetadataKeys(PrivacyGatekeeperService.prototype);
    const hasEventPattern = metadata.some((k) => String(k).includes('EVENT'));
    expect(hasEventPattern).toBe(false);
  });
});

// ── T82 Tests ─────────────────────────────────────────────────────────────────

describe('T82 SocialGraphAnalytics', () => {
  function makeAnalyticsGraphSvc() {
    return {
      getAggregateConnectionGrowth: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ totalNewConnections: 42 })),
      getAggregateFeedEngagement: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ totalEngagements: 10 })),
    };
  }

  const BASE_ANALYTICS_REQUEST = {
    tenantId: 'tenant-X',
    eventType: 'connection_growth' as const,
    aggregatePeriod: '2026-04',
  };

  it('T82-1: Returns success even when analytics write fails (OBSERVABILITY)', async () => {
    const graphSvc = makeAnalyticsGraphSvc();
    const dbFail = makeDbFail();
    const queue = makeQueue([]);

    const svc = new SocialGraphAnalyticsService(graphSvc as any, dbFail as any, queue as any);

    let threw = false;
    let result: DataProcessResult<unknown>;
    try {
      result = await svc.emitAnalytics(BASE_ANALYTICS_REQUEST);
    } catch {
      threw = true;
      result = DataProcessResult.failure('THREW', 'threw');
    }

    expect(threw).toBe(false);
    expect(result!.isSuccess).toBe(true);
  });

  it('T82-2: No per-user IDs in stored aggregate record', async () => {
    const graphSvc = makeAnalyticsGraphSvc();
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);

    const svc = new SocialGraphAnalyticsService(graphSvc as any, db as any, queue as any);
    await svc.emitAnalytics(BASE_ANALYTICS_REQUEST);

    const record = stored[0];
    expect(record).toBeDefined();
    expect(record?.['userId']).toBeUndefined();
    expect(record?.['userIds']).toBeUndefined();
    expect(record?.['userIdA']).toBeUndefined();
    expect(record?.['userIdB']).toBeUndefined();
  });

  it('MT-7: T82 stored record knowledgeScope=GLOBAL (aggregate metrics)', async () => {
    const graphSvc = makeAnalyticsGraphSvc();
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);

    const svc = new SocialGraphAnalyticsService(graphSvc as any, db as any, queue as any);
    await svc.emitAnalytics(BASE_ANALYTICS_REQUEST);

    expect(stored[0]?.['knowledgeScope']).toBe('GLOBAL');
  });
});
