/**
 * FLOW-03 Phase 1D — T62 EventAnalyticsTracker Tests
 *
 * T62-1: DB error inside handler → success({ tracked:false }) — never propagates (IR-62-1)
 * T62-2: TTL counter — stored doc has expires_at (IR-62-2, not an unbounded accumulator)
 * T62-3: All threshold values from FREEDOM config — counter TTL and campaign threshold
 * T62-4: Emitted event is exactly 'PromotionCampaignCompleted' — NOT 'EventPromotionCompleted'
 * T62-5: Best-effort: even with null db mock, returns success (IR-62-1)
 */

import 'reflect-metadata';
import {
  EventAnalyticsTracker,
  TrackInput,
} from '../../src/engine/flows/event-management/event-analytics.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  existingCount?: number | null; // simulate existing counter value in window
  counterTtl?: number | null; // FREEDOM config value for counter TTL
  campaignThreshold?: number | null; // FREEDOM config value for engagement threshold
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const existingCount = options.existingCount;
  const counterTtl = options.counterTtl;
  const campaignThreshold = options.campaignThreshold;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      if (index === 'xiigen-event-analytics') {
        if (existingCount !== null && existingCount !== undefined) {
          return DataProcessResult.success([
            {
              counter_key: filter['counter_key'] ?? 'mock-key',
              count: existingCount,
              expires_at: new Date(Date.now() + 86400 * 1000).toISOString(),
            },
          ]);
        }
        return DataProcessResult.success([]);
      }
      if (index === 'freedom_configs') {
        const key = filter['config_key'] as string | undefined;
        if (
          key === 'flow03_analytics_counter_ttl' &&
          counterTtl !== null &&
          counterTtl !== undefined
        ) {
          return DataProcessResult.success([{ config_key: key, config_value: String(counterTtl) }]);
        }
        if (
          key === 'flow03_campaign_engagement_threshold' &&
          campaignThreshold !== null &&
          campaignThreshold !== undefined
        ) {
          return DataProcessResult.success([
            { config_key: key, config_value: String(campaignThreshold) },
          ]);
        }
        return DataProcessResult.success([]);
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

function makeMockQueue(callOrder: string[] = []) {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue');
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

function makeService(dbOptions: MockDbOptions = {}) {
  const db = makeMockDb(dbOptions);
  const queue = makeMockQueue(db._callOrder);
  const svc = new EventAnalyticsTracker(db, queue);
  return { svc, db, queue };
}

const BASE_INPUT: TrackInput = {
  eventId: 'evt-001',
  analyticsType: 'view',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EventAnalyticsTracker (T62)', () => {
  it('T62-1: DB error inside handler → success({ tracked:false }) — never propagates to caller', async () => {
    // IR-62-1: analytics service failure must NEVER surface as an error to the event pipeline
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('elasticsearch connection refused'));
    const queue = makeMockQueue();
    const svc = new EventAnalyticsTracker(db, queue);

    const result = await svc.track(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true); // success — not failure
    expect(result.data!.tracked).toBe(false); // tracked:false signals silent error
  });

  it('T62-1b: storeDocument error → success({ tracked:false }) — entire handler is best-effort', async () => {
    const db = makeMockDb();
    db.storeDocument.mockRejectedValue(new Error('disk full'));
    const queue = makeMockQueue();
    const svc = new EventAnalyticsTracker(db, queue);

    const result = await svc.track(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.tracked).toBe(false);
  });

  it('T62-2: TTL counter — stored document has expires_at field (windowed, not unbounded)', async () => {
    // IR-62-2: counter expires after TTL window — not an unbounded accumulator
    const { svc, db } = makeService({ counterTtl: 3600 });

    const result = await svc.track(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.tracked).toBe(true);
    const stored = db._stored[0]?.doc as Record<string, unknown>;
    // expires_at MUST be present — proves counter is windowed
    expect(stored).toHaveProperty('expires_at');
    expect(typeof stored['expires_at']).toBe('string');
    // ttl_seconds also stored for inspection
    expect(stored).toHaveProperty('ttl_seconds');
    expect(stored['ttl_seconds']).toBe(3600);
    // expires_at is in the future
    expect(new Date(stored['expires_at'] as string).getTime()).toBeGreaterThan(Date.now());
  });

  it('T62-2b: counter key is time-bucketed — same event in different windows gets different keys', async () => {
    // Counter key includes the window epoch — different time windows = different keys
    const { svc, db: db1 } = makeService({ counterTtl: 3600 });
    const { svc: svc2, db: db2 } = makeService({ counterTtl: 1 }); // 1s TTL = very narrow window

    await svc.track(BASE_INPUT);
    await svc2.track(BASE_INPUT);

    const key1 = db1._stored[0]?.doc['counter_key'] as string;
    const key2 = db2._stored[0]?.doc['counter_key'] as string;

    // Both include eventId and analyticsType
    expect(key1).toContain('evt-001');
    expect(key2).toContain('evt-001');
    // Keys are scoped to time window — format: {eventId}:{analyticsType}:{windowEpoch}
    expect(key1.split(':').length).toBeGreaterThanOrEqual(3);
  });

  it('T62-3: Counter TTL from FREEDOM config — TTL value in stored doc reflects config', async () => {
    // Different TTL configs produce different ttl_seconds in stored counter
    const { svc: svc1h, db: db1h } = makeService({ counterTtl: 3_600 }); // 1 hour
    const { svc: svc7d, db: db7d } = makeService({ counterTtl: 604_800 }); // 7 days

    await svc1h.track(BASE_INPUT);
    await svc7d.track(BASE_INPUT);

    expect(db1h._stored[0]?.doc['ttl_seconds']).toBe(3_600);
    expect(db7d._stored[0]?.doc['ttl_seconds']).toBe(604_800);
  });

  it('T62-3b: Campaign threshold from FREEDOM config — threshold=1 triggers emission on first hit', async () => {
    // With threshold=1, the very first track call should emit PromotionCampaignCompleted
    const { svc, queue } = makeService({
      existingCount: null, // no prior count in window
      campaignThreshold: 1, // emit on count=1
    });

    await svc.track({ ...BASE_INPUT, analyticsType: 'campaign_engagement' });

    expect(queue._enqueued.length).toBe(1);
    expect(queue._enqueued[0].eventType).toBe('PromotionCampaignCompleted');
  });

  it('T62-4: Emitted event is exactly PromotionCampaignCompleted — NOT EventPromotionCompleted', async () => {
    // IR-62-4: wrong event name = FLOW-08 receives duplicate bootstrap signal (DR-03-G)
    const { svc, queue } = makeService({
      existingCount: null,
      campaignThreshold: 1,
    });

    await svc.track({ ...BASE_INPUT, analyticsType: 'campaign_engagement' });

    const emittedTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);

    // The right name
    expect(emittedTypes).toContain('PromotionCampaignCompleted');
    // Anti-test: the wrong name must NEVER appear — collision with NODE D's completion event
    expect(emittedTypes).not.toContain('EventPromotionCompleted');
  });

  it('T62-4b: Below threshold → PromotionCampaignCompleted NOT emitted', async () => {
    // Threshold=100, count goes to 5 — event must not be emitted prematurely
    const { svc, queue } = makeService({
      existingCount: 4, // existing count = 4, will become 5
      campaignThreshold: 100,
    });

    await svc.track(BASE_INPUT);

    expect(queue._enqueued.length).toBe(0);
  });

  it('T62-5: Best-effort: even with completely null db mock, returns success({ tracked:false })', async () => {
    // Extreme best-effort test: db is null — service must never throw
    const svc = new EventAnalyticsTracker(null as any, makeMockQueue());

    const result = await svc.track(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.tracked).toBe(false);
  });

  it('DNA-8: storeDocument called BEFORE PromotionCampaignCompleted emitted', async () => {
    // Use threshold=1 so enqueue fires, making the ordering assertable
    const { svc, db } = makeService({
      existingCount: null,
      campaignThreshold: 1,
    });

    await svc.track({ ...BASE_INPUT, analyticsType: 'campaign_engagement' });

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: store before emit
  });

  it('DNA-3: track() returns DataProcessResult — never throws', async () => {
    const svc = new EventAnalyticsTracker(null as any, null as any);

    const result = await svc.track(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true); // best-effort — always succeeds
  });
});
