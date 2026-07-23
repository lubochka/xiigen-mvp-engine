/**
 * FLOW-04 Phase 2D — T66 FeedbackWindowController Tests
 *
 * T66-1: event.ended → feedback window stored with opens_at + closes_at fields
 * T66-2: closes_at reflects FREEDOM config window hours (not hardcoded)
 * T66-3: storeDocument called BEFORE FeedbackWindowOpened emitted (DNA-8)
 * T66-4: Duplicate openWindow → idempotent return, no new write, no new emit
 * T66-5: storeDocument failure → FeedbackWindowOpened NOT emitted
 * T66-6: Window record has tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=PRIVATE
 * DNA-3: openWindow() returns DataProcessResult — never throws
 */

import 'reflect-metadata';
import {
  FeedbackWindowController,
  OpenWindowInput,
} from '../../src/engine/flows/event-attendance/feedback-window.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  feedbackWindowHrs?: number | null;
  existingWindow?: Record<string, unknown> | null;
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const feedbackWindowHrs = options.feedbackWindowHrs;
  const existingWindow = options.existingWindow ?? null;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      if (index === 'xiigen-feedback-windows') {
        if (existingWindow && existingWindow['event_id'] === filter['event_id']) {
          return DataProcessResult.success([existingWindow]);
        }
        return DataProcessResult.success([]);
      }
      if (index === 'freedom_configs') {
        const key = filter['config_key'];
        if (
          key === 'flow04_feedback_window_hours' &&
          feedbackWindowHrs !== null &&
          feedbackWindowHrs !== undefined
        ) {
          return DataProcessResult.success([
            {
              config_key: key,
              config_value: String(feedbackWindowHrs),
            },
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
  const svc = new FeedbackWindowController(db, queue);
  return { svc, db, queue };
}

const BASE_INPUT: OpenWindowInput = {
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FeedbackWindowController (T66)', () => {
  it('T66-1: event.ended → feedback window stored with opens_at + closes_at', async () => {
    const { svc, db, queue } = makeService({ feedbackWindowHrs: 24 });

    const result = await svc.openWindow(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.windowId).toBeDefined();
    expect(result.data!.opensAt).toBeDefined();
    expect(result.data!.closesAt).toBeDefined();
    expect(result.data!.idempotent).toBe(false);
    // ONE write to feedback-windows index
    expect(db._stored.length).toBe(1);
    expect(db._stored[0].index).toBe('xiigen-feedback-windows');
    expect(db._stored[0].doc['opens_at']).toBeDefined();
    expect(db._stored[0].doc['closes_at']).toBeDefined();
    // FeedbackWindowOpened emitted
    expect(queue._enqueued.length).toBe(1);
    expect(queue._enqueued[0].eventType).toBe('FeedbackWindowOpened');
  });

  it('T66-2: closes_at reflects FREEDOM config window hours — different configs = different close times', async () => {
    // 2-hour window
    const { svc: svc2h, db: db2h } = makeService({ feedbackWindowHrs: 2 });
    const t0 = Date.now();
    await svc2h.openWindow(BASE_INPUT);
    const closes2h = new Date(db2h._stored[0].doc['closes_at'] as string).getTime();

    expect(closes2h).toBeGreaterThan(t0 + 2 * 3600 * 1000 - 5000);
    expect(closes2h).toBeLessThan(t0 + 2 * 3600 * 1000 + 5000);
    expect(db2h._stored[0].doc['window_hours']).toBe(2);

    // 48-hour window — closes_at must be later
    const { svc: svc48h, db: db48h } = makeService({ feedbackWindowHrs: 48 });
    await svc48h.openWindow(BASE_INPUT);
    const closes48h = new Date(db48h._stored[0].doc['closes_at'] as string).getTime();

    expect(closes48h).toBeGreaterThan(closes2h);
    expect(db48h._stored[0].doc['window_hours']).toBe(48);
  });

  it('T66-3: storeDocument called BEFORE FeedbackWindowOpened emitted (DNA-8)', async () => {
    const { svc, db } = makeService({ feedbackWindowHrs: 24 });

    await svc.openWindow(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: store before emit
  });

  it('T66-4: Duplicate openWindow → idempotent return, no new write, no new emit', async () => {
    const existingWindow = {
      window_id: 'wnd-existing-001',
      event_id: 'evt-001',
      opens_at: '2026-01-01T10:00:00.000Z',
      closes_at: '2026-01-02T10:00:00.000Z',
      tenant_id: 'tenant-A',
    };
    const { svc, db, queue } = makeService({ existingWindow });

    const result = await svc.openWindow(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.windowId).toBe('wnd-existing-001');
    expect(result.data!.idempotent).toBe(true);
    // No new write, no new event
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T66-5: storeDocument failure → FeedbackWindowOpened NOT emitted', async () => {
    const db = makeMockDb({ feedbackWindowHrs: 24 });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new FeedbackWindowController(db, queue);

    const result = await svc.openWindow(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T66-6: Window record has tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=PRIVATE', async () => {
    const { svc, db } = makeService({ feedbackWindowHrs: 24 });

    await svc.openWindow({ eventId: 'evt-001', tenantId: 'tenant-Z' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-Z');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    expect(stored['knowledge_scope']).toBe('PRIVATE');
  });

  it('DNA-3: openWindow() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new FeedbackWindowController(db, queue);

    const result = await svc.openWindow(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
