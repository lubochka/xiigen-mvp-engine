/**
 * FLOW-04 Integration Tests
 *
 * Tests the full event attendance pipeline with a stateful shared DB mock,
 * verifying cross-service data flow and event ordering.
 *
 * IT-04-1: RSVP → check-in happy path — T63 data is read by T65
 * IT-04-2: Full capacity → RSVP waitlisted; cancellation frees slot → T64 promotes
 * IT-04-3: Cancellation window expired → cancellation blocked, waitlist unaffected
 * IT-04-4: WAITLISTED cancellation → RsvpCancelled emitted, WaitlistManager NOT called
 * IT-04-5: Duplicate RSVP (SETNX) → no double-write, no double-emit
 * IT-04-6: DNA-8 across services — storeDocument always precedes enqueue
 * IT-04-7: Check-in rejected for WAITLISTED attendee — NOT_CONFIRMED reason returned
 * IT-04-8: Feedback window opens after event ends; duplicate open returns idempotent result
 */

import 'reflect-metadata';
import {
  RsvpOrchestrator,
  RsvpInput,
} from '../../src/engine/flows/event-attendance/rsvp-orchestrator.service';
import { WaitlistManager } from '../../src/engine/flows/event-attendance/waitlist-manager.service';
import {
  CheckInProcessor,
  CheckInInput,
} from '../../src/engine/flows/event-attendance/check-in-processor.service';
import {
  FeedbackWindowController,
  OpenWindowInput,
} from '../../src/engine/flows/event-attendance/feedback-window.service';
import {
  CancellationProcessor,
  CancelRsvpInput,
} from '../../src/engine/flows/event-attendance/cancellation-processor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Stateful shared DB mock ────────────────────────────────────────────────────

function makeStatefulDb(seed: Record<string, Array<Record<string, unknown>>> = {}) {
  const store: Record<string, Record<string, Record<string, unknown>>> = {};
  const callOrder: string[] = [];
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];

  // Pre-seed provided index data
  for (const [index, docs] of Object.entries(seed)) {
    store[index] = {};
    for (const doc of docs) {
      const id = (doc['event_id'] ??
        doc['config_key'] ??
        doc['rsvp_id'] ??
        String(Date.now() + Math.random())) as string;
      store[index][id] = doc;
    }
  }

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
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

const FREEDOM_SEED = [
  {
    config_key: 'flow04_rsvp_cancellation_window_hours',
    config_value: '24',
    task_type: 'xiigen-engine',
  },
  { config_key: 'flow04_feedback_window_hours', config_value: '24', task_type: 'xiigen-engine' },
];

const OPEN_EVENT = { event_id: 'evt-001', capacity: 10, tenant_id: 'tenant-A' };
const LAST_SLOT_EVENT = { event_id: 'evt-002', capacity: 1, tenant_id: 'tenant-A' };

function makeServices(extraSeed: Record<string, Array<Record<string, unknown>>> = {}) {
  const db = makeStatefulDb({ freedom_configs: FREEDOM_SEED, ...extraSeed });
  const queue = makeSharedQueue(db._callOrder);

  const rsvpOrch = new RsvpOrchestrator(db, queue);
  const waitlistMgr = new WaitlistManager(db, queue, rsvpOrch);
  const checkIn = new CheckInProcessor(db, queue);
  const feedback = new FeedbackWindowController(db, queue);
  const cancel = new CancellationProcessor(db, queue, waitlistMgr);

  return { db, queue, rsvpOrch, waitlistMgr, checkIn, feedback, cancel };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-04 Integration', () => {
  it('IT-04-1: RSVP → check-in happy path — T63 record is read by T65', async () => {
    const { rsvpOrch, checkIn, db, queue } = makeServices({
      'xiigen-events': [OPEN_EVENT],
    });

    // T63: RSVP
    const rsvpResult = await rsvpOrch.rsvp({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });
    expect(rsvpResult.isSuccess).toBe(true);
    expect(rsvpResult.data!.status).toBe('CONFIRMED');

    // T65: check-in reads the CONFIRMED RSVP written by T63
    const checkInResult = await checkIn.checkIn({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });
    expect(checkInResult.isSuccess).toBe(true);
    expect(checkInResult.data!.checkedIn).toBe(true);

    // Both records in DB
    const rsvpWrites = db._stored.filter((s) => s.index === 'xiigen-event-rsvps');
    const checkinWrites = db._stored.filter((s) => s.index === 'xiigen-event-checkins');
    expect(rsvpWrites.length).toBe(1);
    expect(checkinWrites.length).toBe(1);

    // rsvp.confirmed then AttendeeCheckedIn in queue
    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('rsvp.confirmed');
    expect(eventTypes).toContain('AttendeeCheckedIn');
  });

  it('IT-04-2: Last slot taken → second RSVP waitlisted; cancellation frees slot → T64 promotes', async () => {
    const { rsvpOrch, cancel, db, queue } = makeServices({
      'xiigen-events': [LAST_SLOT_EVENT],
    });

    // att-001 takes the last slot
    const r1 = await rsvpOrch.rsvp({
      attendeeId: 'att-001',
      eventId: 'evt-002',
      tenantId: 'tenant-A',
    });
    expect(r1.data!.routed).toBe('CONFIRMED');

    // att-002 is waitlisted
    const r2 = await rsvpOrch.rsvp({
      attendeeId: 'att-002',
      eventId: 'evt-002',
      tenantId: 'tenant-A',
    });
    expect(r2.data!.routed).toBe('WAITLIST');

    // att-001 cancels — slot freed → T64 promotes att-002
    const cancelResult = await cancel.cancel({
      attendeeId: 'att-001',
      eventId: 'evt-002',
      tenantId: 'tenant-A',
    });
    expect(cancelResult.isSuccess).toBe(true);
    expect(cancelResult.data!.cancelled).toBe(true);

    // att-002 was promoted: RSVP updated to CONFIRMED in DB
    const att002Rsvp = db._stored.find(
      (s) =>
        s.index === 'xiigen-event-rsvps' &&
        s.doc['attendee_id'] === 'att-002' &&
        s.doc['status'] === 'CONFIRMED',
    );
    expect(att002Rsvp).toBeDefined();

    // WaitlistPromotionCompleted was emitted
    const eventTypes = queue._enqueued.map((e: { eventType: string }) => e.eventType);
    expect(eventTypes).toContain('WaitlistPromotionCompleted');
  });

  it('IT-04-3: Cancellation window expired → cancellation blocked, waitlist unaffected', async () => {
    const pastWindow = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const confirmedRsvp = {
      rsvp_id: 'rsvp-expired',
      attendee_id: 'att-001',
      event_id: 'evt-001',
      status: 'CONFIRMED',
      tenant_id: 'tenant-A',
      cancellable_until: pastWindow,
    };
    const { cancel, db, queue } = makeServices({
      'xiigen-events': [OPEN_EVENT],
      'xiigen-event-rsvps': [confirmedRsvp],
    });

    const result = await cancel.cancel({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });

    // IR-67-1: expired window → business state, not error
    expect(result.isSuccess).toBe(true);
    expect(result.data!.cancelled).toBe(false);
    expect(result.data!.reason).toBe('WINDOW_CLOSED');

    // No write, no emit, no promotion
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('IT-04-4: WAITLISTED cancellation → RsvpCancelled emitted, no slot freed, no promotion', async () => {
    const { rsvpOrch, cancel, queue } = makeServices({
      'xiigen-events': [OPEN_EVENT],
    });

    // att-001 fills 10 slots (full capacity)
    for (let i = 0; i < 10; i++) {
      await rsvpOrch.rsvp({
        attendeeId: `att-fill-${i}`,
        eventId: 'evt-001',
        tenantId: 'tenant-A',
      });
    }

    // att-001 is waitlisted
    const rsvpResult = await rsvpOrch.rsvp({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });
    expect(rsvpResult.data!.routed).toBe('WAITLIST');

    // Cancel the WAITLISTED rsvp
    const cancelResult = await cancel.cancel({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });
    expect(cancelResult.isSuccess).toBe(true);
    expect(cancelResult.data!.cancelled).toBe(true);

    // RsvpCancelled emitted, wasConfirmed=false
    const cancelledEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'RsvpCancelled',
    );
    expect(cancelledEvent).toBeDefined();
    expect(cancelledEvent!.data['wasConfirmed']).toBe(false);

    // WaitlistPromotionCompleted must NOT be in queue — no slot freed
    const promotionEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'WaitlistPromotionCompleted',
    );
    expect(promotionEvent).toBeUndefined();
  });

  it('IT-04-5: Duplicate RSVP (SETNX) → no double-write, no double-emit', async () => {
    const { rsvpOrch, db, queue } = makeServices({
      'xiigen-events': [OPEN_EVENT],
    });

    const input: RsvpInput = { attendeeId: 'att-001', eventId: 'evt-001', tenantId: 'tenant-A' };
    const r1 = await rsvpOrch.rsvp(input);
    const r2 = await rsvpOrch.rsvp(input); // duplicate

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
    expect(r2.data!.rsvpId).toBe(r1.data!.rsvpId);

    // Single write — SETNX
    const rsvpWrites = db._stored.filter((s) => s.index === 'xiigen-event-rsvps');
    expect(rsvpWrites.length).toBe(1);

    // Single rsvp.confirmed — no duplicate event
    const confirmEvents = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'rsvp.confirmed',
    );
    expect(confirmEvents.length).toBe(1);
  });

  it('IT-04-6: DNA-8 across services — storeDocument always precedes enqueue', async () => {
    const { rsvpOrch, checkIn, db } = makeServices({
      'xiigen-events': [OPEN_EVENT],
    });

    await rsvpOrch.rsvp({ attendeeId: 'att-001', eventId: 'evt-001', tenantId: 'tenant-A' });
    await checkIn.checkIn({ attendeeId: 'att-001', eventId: 'evt-001', tenantId: 'tenant-A' });

    const callOrder = db._callOrder;
    const enqueueIndices = callOrder
      .map((op, i) => (op === 'enqueue' ? i : -1))
      .filter((i) => i >= 0);

    // Every enqueue must be preceded by at least one storeDocument
    for (const eIdx of enqueueIndices) {
      const priorStore = callOrder.slice(0, eIdx).some((op) => op === 'storeDocument');
      expect(priorStore).toBe(true); // DNA-8: no enqueue without a preceding store
    }
  });

  it('IT-04-7: Check-in rejected for WAITLISTED attendee — NOT_CONFIRMED returned', async () => {
    const { rsvpOrch, checkIn } = makeServices({
      'xiigen-events': [{ event_id: 'evt-001', capacity: 0, tenant_id: 'tenant-A' }],
    });

    // att-001 is waitlisted (capacity=0)
    const rsvp = await rsvpOrch.rsvp({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });
    expect(rsvp.data!.status).toBe('WAITLISTED');

    // Attempt check-in for WAITLISTED attendee
    const result = await checkIn.checkIn({
      attendeeId: 'att-001',
      eventId: 'evt-001',
      tenantId: 'tenant-A',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.checkedIn).toBe(false);
    expect(result.data!.reason).toBe('NOT_CONFIRMED');
  });

  it('IT-04-8: Feedback window opens; duplicate open returns idempotent result', async () => {
    const { feedback, db, queue } = makeServices();

    const input: OpenWindowInput = { eventId: 'evt-001', tenantId: 'tenant-A' };

    const r1 = await feedback.openWindow(input);
    expect(r1.isSuccess).toBe(true);
    expect(r1.data!.idempotent).toBe(false);
    expect(r1.data!.windowId).toBeDefined();

    // Duplicate call — same event
    const r2 = await feedback.openWindow(input);
    expect(r2.isSuccess).toBe(true);
    expect(r2.data!.idempotent).toBe(true);
    expect(r2.data!.windowId).toBe(r1.data!.windowId);

    // Only one write, only one FeedbackWindowOpened
    const windowWrites = db._stored.filter((s) => s.index === 'xiigen-feedback-windows');
    expect(windowWrites.length).toBe(1);

    const windowEvents = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'FeedbackWindowOpened',
    );
    expect(windowEvents.length).toBe(1);
  });
});
