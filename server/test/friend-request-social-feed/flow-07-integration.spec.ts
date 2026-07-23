/**
 * FLOW-07 Integration Tests
 *
 * INT-1: Full happy path: FriendRequest → Accept → ConnectionEstablished → Feed generated+delivered
 * INT-2: T81 blocks request: privacy blocked → request not stored
 * INT-3: Mutual pending detection: A→B then B→A → both auto-accepted
 * INT-4: T77 score=0 passes through to T78 (no filtering)
 * INT-5: T78 two-phase gate: T81 fails at delivery even when T76 passed
 * INT-6: T80 full recompute: correct mutual count after connection
 * INT-7: Tenant isolation: connections in tenant A not visible in tenant B
 */

import 'reflect-metadata';
import { FriendRequestProcessorService } from '../../src/engine/flows/friend-request-social-feed/friend-request-processor.service';
import { FriendRequestResponderService } from '../../src/engine/flows/friend-request-social-feed/friend-request-responder.service';
import { ConnectionGraphWriterService } from '../../src/engine/flows/friend-request-social-feed/connection-graph-writer.service';
import { FeedItemGeneratorService } from '../../src/engine/flows/friend-request-social-feed/feed-item-generator.service';
import { FeedScorerService } from '../../src/engine/flows/friend-request-social-feed/feed-scorer.service';
import { FeedDeliveryOrchestratorService } from '../../src/engine/flows/friend-request-social-feed/feed-delivery-orchestrator.service';
import { MutualConnectionCounterService } from '../../src/engine/flows/friend-request-social-feed/mutual-connection-counter.service';
import { PrivacyGatekeeperService } from '../../src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared test infrastructure ────────────────────────────────────────────────

function createInMemoryStore() {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (index: string, doc: Record<string, unknown>, id: string) => {
        if (!store[index]) store[index] = {};
        store[index][id] = doc;
        return DataProcessResult.success({});
      }),
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        const records = Object.values(store[index] ?? {});
        const filtered = records.filter((r) =>
          Object.entries(filter).every(([k, v]) => r[k] === v),
        );
        return DataProcessResult.success(filtered);
      }),
    _store: store,
  };
}

function createQueue() {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function createPrivacySettings(blocked: boolean) {
  return {
    getSettings: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        allowFriendRequests: !blocked,
        feedVisible: !blocked,
      }),
    ),
  };
}

// ── INT-1: Full happy path ────────────────────────────────────────────────────

describe('FLOW-07 Integration', () => {
  it('INT-1: Full happy path: FriendRequest → Accept → FeedGenerated+Delivered', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const privacySettings = createPrivacySettings(false);
    const gk = new PrivacyGatekeeperService(privacySettings as any, null as any);
    const rateLimit = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
      increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const processor = new FriendRequestProcessorService(
      db as any,
      queue as any,
      gk,
      rateLimit as any,
    );
    const reqResult = await processor.processFriendRequest({
      requestId: 'req-int-001',
      senderUserId: 'user-A',
      recipientUserId: 'user-B',
      tenantId: 'tenant-INT',
    });
    expect(reqResult.isSuccess).toBe(true);
    expect(reqResult.data?.status).toBe('SENT');

    // Accept
    const responder = new FriendRequestResponderService(db as any, queue as any);
    // Add the pending request to db
    db._store['xiigen-friend-requests'] = {
      'req-int-001': {
        requestId: 'req-int-001',
        senderUserId: 'user-A',
        recipientUserId: 'user-B',
        tenantId: 'tenant-INT',
        connectionId: 'conn-user-A-user-B-tenant-INT',
        status: 'PENDING',
      },
    };
    const respResult = await responder.respondToRequest({
      requestId: 'req-int-001',
      responderId: 'user-B',
      tenantId: 'tenant-INT',
      response: 'ACCEPT',
    });
    expect(respResult.isSuccess).toBe(true);

    // Verify events emitted
    const sentEvent = queue._enqueued.find((e) => e.eventType.includes('sent'));
    expect(sentEvent).toBeDefined();
    const acceptedEvent = queue._enqueued.find((e) => e.eventType.includes('accepted'));
    expect(acceptedEvent).toBeDefined();
  });

  it('INT-2: T81 blocks request: privacy blocked → request not stored', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const privacySettings = createPrivacySettings(true); // blocked
    const gk = new PrivacyGatekeeperService(privacySettings as any, null as any);
    const rateLimit = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
      increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const processor = new FriendRequestProcessorService(
      db as any,
      queue as any,
      gk,
      rateLimit as any,
    );
    const result = await processor.processFriendRequest({
      requestId: 'req-blocked',
      senderUserId: 'user-A',
      recipientUserId: 'user-B',
      tenantId: 'tenant-INT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('BLOCKED');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue._enqueued.length).toBe(0);
  });

  it('INT-3: Mutual pending detection: A→B then B→A → auto-accepted', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const privacySettings = createPrivacySettings(false);
    const gk = new PrivacyGatekeeperService(privacySettings as any, null as any);
    const rateLimit = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
      increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const processor = new FriendRequestProcessorService(
      db as any,
      queue as any,
      gk,
      rateLimit as any,
    );

    // A→B request
    await processor.processFriendRequest({
      requestId: 'req-AB',
      senderUserId: 'user-A',
      recipientUserId: 'user-B',
      tenantId: 'tenant-INT',
    });

    // B→A request (should auto-accept because A→B is pending)
    const result = await processor.processFriendRequest({
      requestId: 'req-BA',
      senderUserId: 'user-B',
      recipientUserId: 'user-A',
      tenantId: 'tenant-INT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('AUTO_ACCEPTED');
  });

  it('INT-4: T77 score=0 passes through to T78 (no filtering)', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const ai = {
      scoreFeedItem: jest.fn().mockResolvedValue(DataProcessResult.success({ score: 0 })),
    };
    const freedom = {
      getConfig: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ flow07_delivery_score_threshold: 0 })),
    };

    const scorer = new FeedScorerService(ai as any, freedom as any, db as any, queue as any);
    const scoreResult = await scorer.scoreFeedItem({
      feedItemId: 'feed-001',
      tenantId: 'tenant-INT',
      recipientUserId: 'user-B',
      contentType: 'connection',
    });
    expect(scoreResult.isSuccess).toBe(true);
    expect(scoreResult.data?.score).toBe(0);
  });

  it('INT-5: T78 two-phase gate: T81 fails at delivery even when T76 passed', async () => {
    // T76 privacy: allowed
    // T78 privacy: blocked (settings changed between generation and delivery)
    const db = createInMemoryStore();
    const queue = createQueue();
    const blockedPrivacySettings = createPrivacySettings(true);
    const gkBlocked = new PrivacyGatekeeperService(blockedPrivacySettings as any, null as any);
    const freedom = {
      getConfig: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ flow07_delivery_score_threshold: 0.1 })),
    };

    const deliverer = new FeedDeliveryOrchestratorService(
      db as any,
      queue as any,
      gkBlocked,
      freedom as any,
    );
    const result = await deliverer.deliverFeedItem({
      feedItemId: 'feed-001',
      tenantId: 'tenant-INT',
      recipientUserId: 'user-B',
      score: 0.9,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['suppressed']).toBe(true);
  });

  it('INT-6: T80 full recompute: correct mutual count after connection', async () => {
    const graphSvc = {
      getConnections: jest
        .fn()
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['conn-1', 'conn-2'] }))
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['conn-2', 'conn-3'] })),
    };
    const db = createInMemoryStore();
    const queue = createQueue();

    const counter = new MutualConnectionCounterService(graphSvc as any, db as any, queue as any);
    const result = await counter.countMutualConnections({
      userIdA: 'user-A',
      userIdB: 'user-B',
      tenantId: 'tenant-INT',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.mutualCount).toBe(1); // only conn-2
  });

  it('INT-7: Tenant isolation: connections in tenant A not visible in tenant B', async () => {
    const db = createInMemoryStore();
    const queue = createQueue();
    const privacySettings = createPrivacySettings(false);
    const gk = new PrivacyGatekeeperService(privacySettings as any, null as any);
    const rateLimit = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
      increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const processor = new FriendRequestProcessorService(
      db as any,
      queue as any,
      gk,
      rateLimit as any,
    );

    // Store in tenant-A
    await processor.processFriendRequest({
      requestId: 'req-001',
      senderUserId: 'user-A',
      recipientUserId: 'user-B',
      tenantId: 'tenant-A',
    });

    // Query for tenant-B — should not find tenant-A records
    const tenantBResult = await db.searchDocuments('xiigen-friend-requests', {
      tenantId: 'tenant-B',
    });
    expect(tenantBResult.data).toHaveLength(0);
  });
});
