/**
 * FLOW-03 Integration Tests
 *
 * Tests the full event management pipeline with a stateful shared DB mock,
 * verifying cross-service data flow and event ordering.
 *
 * IT-03-1: Create event → register attendee — data written by T59 is read by T60
 * IT-03-2: Full capacity — first registration CONFIRMED, second WAITLISTED
 * IT-03-3: Promote event → EventPromoted emitted after content safety pass
 * IT-03-4: Promote rejected by content safety → EventPromotionRejected, never EventPromoted
 * IT-03-5: Analytics best-effort — analytics DB failure never blocks event creation pipeline
 * IT-03-6: DNA-8 across services — store always precedes emit in shared call order
 * IT-03-7: Analytics threshold crossed → PromotionCampaignCompleted emitted
 * IT-03-8: Registration SETNX — duplicate registration returns existing, no double-write
 */

import 'reflect-metadata';
import {
  EventCreationOrchestrator,
  CreateEventInput,
} from '../../src/engine/flows/event-management/event-creation.service';
import {
  EventRegistrationManager,
  RegisterInput,
} from '../../src/engine/flows/event-management/event-registration.service';
import {
  EventPromotionEngine,
  PromoteEventInput,
} from '../../src/engine/flows/event-management/event-promotion.service';
import {
  EventAnalyticsTracker,
  TrackInput,
} from '../../src/engine/flows/event-management/event-analytics.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Stateful shared DB mock ────────────────────────────────────────────────────
// Documents written via storeDocument are immediately visible to searchDocuments.
// This makes cross-service reads testable without pre-seeding.

function makeStatefulDb(seed: Record<string, Array<Record<string, unknown>>> = {}) {
  // store: index → id → doc
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  const callOrder: string[] = [];
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  // Pre-seed freedom_configs and any provided index data
  for (const [index, docs] of Object.entries(seed)) {
    store[index] = {};
    for (const doc of docs) {
      const id = (doc['config_key'] ??
        doc['event_id'] ??
        doc['registration_id'] ??
        String(Date.now())) as string;
      store[index][id] = doc;
    }
  }

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      // Content policy index — controlled via contentPolicySeed flag
      if (index === 'xiigen-content-policy') {
        callOrder.push('contentSafetyCheck');
        return DataProcessResult.success([]); // default: no flags
      }

      const indexDocs = Object.values(store[index] ?? {});
      const matches = indexDocs.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(matches);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push('storeDocument');
      if (!store[index]) store[index] = {};
      store[index][id] = doc;
      stored.push({ index, doc, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _store: store,
    _stored: stored,
    _callOrder: callOrder,
  } as any;
}

function makeSharedQueue(callOrder: string[] = []) {
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

// Default FREEDOM config seeds
const FREEDOM_SEED = [
  { config_key: 'flow03_analytics_counter_ttl', config_value: '3600', task_type: 'xiigen-engine' },
  {
    config_key: 'flow03_campaign_engagement_threshold',
    config_value: '1000',
    task_type: 'xiigen-engine',
  },
  { config_key: 'flow03_max_events_per_organizer', config_value: '50', task_type: 'xiigen-engine' },
  {
    config_key: 'flow03_promotion_channels',
    config_value: JSON.stringify(['in-app', 'push']),
    task_type: 'xiigen-engine',
  },
];

function makeServices(extraSeed: Record<string, Array<Record<string, unknown>>> = {}) {
  const db = makeStatefulDb({ freedom_configs: FREEDOM_SEED, ...extraSeed });
  const queue = makeSharedQueue(db._callOrder);

  const creation = new EventCreationOrchestrator(db, queue);
  const registration = new EventRegistrationManager(db, queue);
  const promotion = new EventPromotionEngine(db, queue);
  const analytics = new EventAnalyticsTracker(db, queue);

  return { db, queue, creation, registration, promotion, analytics };
}

const BASE_CREATE: CreateEventInput = {
  title: 'Integration Test Event',
  organizerId: 'org-001',
  tenantId: 'tenant-A',
  startDate: '2026-06-01T18:00:00.000Z',
  capacity: 10,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-03 Integration', () => {
  it('IT-03-1: Create event → register attendee — T59 data is read by T60', async () => {
    const { creation, registration, db, queue } = makeServices();

    // T59: create event
    const createResult = await creation.createEvent(BASE_CREATE);
    expect(createResult.isSuccess).toBe(true);
    const eventId = createResult.data!.eventId;

    // Stateful DB: event is now visible to T60
    const regInput: RegisterInput = { attendeeId: 'att-001', eventId, tenantId: 'tenant-A' };
    const regResult = await registration.register(regInput);

    expect(regResult.isSuccess).toBe(true);
    expect(regResult.data!.status).toBe('CONFIRMED');
    expect(regResult.data!.routed).toBe('CONFIRMED');

    // Both records written to DB
    const eventWrites = db._stored.filter((s) => s.index === 'xiigen-events');
    const regWrites = db._stored.filter((s) => s.index === 'xiigen-event-registrations');
    expect(eventWrites.length).toBe(1);
    expect(regWrites.length).toBe(1);

    // EventCreated + AttendeeRegistered both in queue
    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('EventCreated');
    expect(eventTypes).toContain('AttendeeRegistered');
  });

  it('IT-03-2: Full capacity — first registration CONFIRMED, second WAITLISTED', async () => {
    const { creation, registration } = makeServices();

    // Create event with capacity=1
    const createResult = await creation.createEvent({ ...BASE_CREATE, capacity: 1 });
    const eventId = createResult.data!.eventId;

    const r1 = await registration.register({
      attendeeId: 'att-001',
      eventId,
      tenantId: 'tenant-A',
    });
    const r2 = await registration.register({
      attendeeId: 'att-002',
      eventId,
      tenantId: 'tenant-A',
    });

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
    expect(r1.data!.routed).toBe('CONFIRMED');
    expect(r2.data!.routed).toBe('WAITLIST');
  });

  it('IT-03-3: Promote event → safety pass → EventPromoted emitted', async () => {
    const { creation, promotion, queue } = makeServices();

    const createResult = await creation.createEvent(BASE_CREATE);
    const eventId = createResult.data!.eventId;

    const promoteInput: PromoteEventInput = {
      eventId,
      organizerId: 'org-001',
      tenantId: 'tenant-A',
    };
    const promoteResult = await promotion.promote(promoteInput);

    expect(promoteResult.isSuccess).toBe(true);
    expect(promoteResult.data!.promoted).toBe(true);

    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('EventPromoted');
    expect(eventTypes).not.toContain('EventPromotionRejected');
  });

  it('IT-03-4: Promotion rejected → EventPromotionRejected, never EventPromoted', async () => {
    // Override content policy to flag content
    const { promotion, queue, db } = makeServices();
    db.searchDocuments.mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-content-policy') {
          return DataProcessResult.success([
            { event_id: filter['event_id'], flagged: true, reason: 'PROHIBITED_CONTENT' },
          ]);
        }
        return (makeStatefulDb({ freedom_configs: FREEDOM_SEED }) as any).searchDocuments(
          index,
          filter,
        );
      },
    );

    const promoteInput: PromoteEventInput = {
      eventId: 'evt-flagged',
      organizerId: 'org-001',
      tenantId: 'tenant-A',
    };
    const result = await promotion.promote(promoteInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(false);
    expect(result.data!.reason).toBe('CONTENT_REJECTED');

    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('EventPromotionRejected');
    expect(eventTypes).not.toContain('EventPromoted');
  });

  it('IT-03-5: Analytics best-effort — DB failure never blocks event creation', async () => {
    const { creation, analytics, db } = makeServices();

    // Create event successfully first
    const createResult = await creation.createEvent(BASE_CREATE);
    expect(createResult.isSuccess).toBe(true);

    // Break the analytics DB for subsequent calls
    db.searchDocuments.mockRejectedValue(new Error('elasticsearch down'));

    // Analytics failure must not surface
    const trackResult = await analytics.track({
      eventId: createResult.data!.eventId,
      analyticsType: 'view',
      tenantId: 'tenant-A',
    });

    expect(trackResult.isSuccess).toBe(true); // IR-62-1: success even on DB error
    expect(trackResult.data!.tracked).toBe(false);
  });

  it('IT-03-6: DNA-8 across services — storeDocument always precedes enqueue', async () => {
    const { creation, registration, db } = makeServices();

    const createResult = await creation.createEvent(BASE_CREATE);
    const eventId = createResult.data!.eventId;
    await registration.register({ attendeeId: 'att-001', eventId, tenantId: 'tenant-A' });

    // For every enqueue call, there must be a storeDocument that precedes it
    const callOrder = db._callOrder;
    const enqueueIndices = callOrder
      .map((op, i) => (op === 'enqueue' ? i : -1))
      .filter((i) => i >= 0);

    for (const eIdx of enqueueIndices) {
      const priorStore = callOrder.slice(0, eIdx).some((op) => op === 'storeDocument');
      expect(priorStore).toBe(true); // DNA-8: no enqueue without a preceding store
    }
  });

  it('IT-03-7: Analytics threshold=1 → PromotionCampaignCompleted emitted on first track', async () => {
    // Seed threshold=1 so first campaign_engagement hit triggers emission
    const lowThresholdSeed = FREEDOM_SEED.map((c) =>
      c.config_key === 'flow03_campaign_engagement_threshold' ? { ...c, config_value: '1' } : c,
    );
    const { analytics, queue } = makeServices({ freedom_configs: lowThresholdSeed });

    const trackInput: TrackInput = {
      eventId: 'evt-001',
      analyticsType: 'campaign_engagement',
      tenantId: 'tenant-A',
    };
    const result = await analytics.track(trackInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.tracked).toBe(true);

    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('PromotionCampaignCompleted');
    expect(eventTypes).not.toContain('EventPromotionCompleted'); // IR-62-4 anti-test
  });

  it('IT-03-8: Registration SETNX — duplicate returns existing, single write only', async () => {
    const { creation, registration, db, queue } = makeServices();

    const createResult = await creation.createEvent(BASE_CREATE);
    const eventId = createResult.data!.eventId;
    const regInput: RegisterInput = { attendeeId: 'att-001', eventId, tenantId: 'tenant-A' };

    const r1 = await registration.register(regInput);
    const r2 = await registration.register(regInput); // duplicate

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
    expect(r2.data!.registrationId).toBe(r1.data!.registrationId);

    // Only one registration write — SETNX
    const regWrites = db._stored.filter((s) => s.index === 'xiigen-event-registrations');
    expect(regWrites.length).toBe(1);

    // Only one AttendeeRegistered — no duplicate event
    const confirmedEvents = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'AttendeeRegistered',
    );
    expect(confirmedEvents.length).toBe(1);
  });
});
