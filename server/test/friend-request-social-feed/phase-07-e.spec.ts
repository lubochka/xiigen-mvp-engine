/**
 * FLOW-07 Phase E — T77 FeedScorer + T78 FeedDeliveryOrchestrator
 *
 * T77-1: score=0 returns success (not filtered, not failure)
 * T77-2: score=1 returns success (normal path)
 * T77-3: storeDocument BEFORE FeedScored (callOrder)
 * T77-4: scoring weights from FREEDOM config (not hardcoded)
 * T78-1: T81 called unconditionally even when T76 check would pass
 * T78-2: T81 allowed=false → success({ suppressed: true }) not failure
 * T78-3: score below threshold → success({ delivered: false }) not failure
 * T78-4: storeDocument BEFORE FeedDelivered (callOrder)
 * T78-5: T78 does NOT read any privacyCheckPassed field from T76 output
 * MT-5: FeedDelivered event CloudEvents format
 * MT-6: Two-phase gate: separate T81 calls for T76 and T78 are independent
 */

import 'reflect-metadata';
import { FeedScorerService } from '../../src/engine/flows/friend-request-social-feed/feed-scorer.service';
import { FeedDeliveryOrchestratorService } from '../../src/engine/flows/friend-request-social-feed/feed-delivery-orchestrator.service';
import { PrivacyGatekeeperService } from '../../src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mocks ─────────────────────────────────────────────────────────────────────

function makeDb(callOrder: string[]) {
  return {
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
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function makeFreedom(weights: Record<string, unknown> = {}) {
  return {
    getConfig: jest.fn().mockResolvedValue(DataProcessResult.success(weights)),
  };
}

function makeAi(score = 1) {
  return {
    scoreFeedItem: jest.fn().mockResolvedValue(DataProcessResult.success({ score })),
  };
}

function makePrivacyGatekeeper(callOrder: string[], allowed: boolean) {
  return {
    check: jest.fn().mockImplementation(async () => {
      callOrder.push('privacyCheck');
      return DataProcessResult.success({ allowed });
    }),
  } as unknown as PrivacyGatekeeperService;
}

const SCORE_REQUEST = {
  feedItemId: 'feed-001',
  tenantId: 'tenant-X',
  recipientUserId: 'user-B',
  contentType: 'connection',
};

const DELIVERY_REQUEST = {
  feedItemId: 'feed-001',
  tenantId: 'tenant-X',
  recipientUserId: 'user-B',
  score: 0.8,
};

// ── T77 Tests ─────────────────────────────────────────────────────────────────

describe('T77 FeedScorer', () => {
  it('T77-1: score=0 returns success (not filtered, not failure)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom();
    const ai = makeAi(0);

    const svc = new FeedScorerService(ai as any, freedom as any, db as any, queue as any);
    const result = await svc.scoreFeedItem(SCORE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.score).toBe(0);
  });

  it('T77-2: score=1 returns success (normal path)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom();
    const ai = makeAi(1);

    const svc = new FeedScorerService(ai as any, freedom as any, db as any, queue as any);
    const result = await svc.scoreFeedItem(SCORE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.score).toBe(1);
  });

  it('T77-3: storeDocument BEFORE FeedScored (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom();
    const ai = makeAi(0.5);

    const svc = new FeedScorerService(ai as any, freedom as any, db as any, queue as any);
    await svc.scoreFeedItem(SCORE_REQUEST);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T77-4: scoring weights from FREEDOM config (not hardcoded)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom({ recencyWeight: 0.3, engagementWeight: 0.7 });
    const ai = makeAi();

    const svc = new FeedScorerService(ai as any, freedom as any, db as any, queue as any);
    await svc.scoreFeedItem(SCORE_REQUEST);

    expect(freedom.getConfig).toHaveBeenCalled();
  });
});

// ── T78 Tests ─────────────────────────────────────────────────────────────────

describe('T78 FeedDeliveryOrchestrator', () => {
  it('T78-1: T81 called unconditionally even when T76 check would pass', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeper(callOrder, true);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    await svc.deliverFeedItem(DELIVERY_REQUEST);

    expect(gk.check).toHaveBeenCalled();
  });

  it('T78-2: T81 allowed=false → success({ suppressed: true }) not failure', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeper(callOrder, false);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    const result = await svc.deliverFeedItem(DELIVERY_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['suppressed']).toBe(true);
  });

  it('T78-3: score below threshold → success({ delivered: false }) not failure', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeper(callOrder, true);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.9 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    const result = await svc.deliverFeedItem({ ...DELIVERY_REQUEST, score: 0.1 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['delivered']).toBe(false);
    expect(result.data?.['reason']).toBe('BELOW_THRESHOLD');
  });

  it('T78-4: storeDocument BEFORE FeedDelivered (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeper(callOrder, true);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    await svc.deliverFeedItem(DELIVERY_REQUEST);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T78-5: T78 does NOT read any privacyCheckPassed field from T76 output', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeper(callOrder, true);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    // No privacyCheckPassed field — T78 must call T81 independently
    const result = await svc.deliverFeedItem({ ...DELIVERY_REQUEST });

    expect(result.isSuccess).toBe(true);
    expect(gk.check).toHaveBeenCalledTimes(1); // T78 calls T81 once, independently
  });

  it('MT-5: FeedDelivered event CloudEvents format', async () => {
    const queue = makeQueue([]);
    const db = makeDb([]);
    const gk = makePrivacyGatekeeper([], true);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    await svc.deliverFeedItem(DELIVERY_REQUEST);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('delivered');
    const data = event.data as Record<string, unknown>;
    expect(data['feedItemId']).toBe(DELIVERY_REQUEST.feedItemId);
    expect(data['tenantId']).toBe(DELIVERY_REQUEST.tenantId);
  });

  it('MT-6: Two-phase gate: T78 calls T81 independently (not from T76 result)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    // T78 gatekeeper: blocked
    const gk = makePrivacyGatekeeper(callOrder, false);
    const freedom = makeFreedom({ flow07_delivery_score_threshold: 0.1 });

    const svc = new FeedDeliveryOrchestratorService(db as any, queue as any, gk, freedom as any);
    const result = await svc.deliverFeedItem(DELIVERY_REQUEST);

    // Even though score is fine, T81 at delivery blocks it
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['suppressed']).toBe(true);
    expect(queue._enqueued.length).toBe(0);
  });
});
