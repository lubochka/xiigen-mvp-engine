/**
 * FLOW-03 Phase 1C — T61 EventPromotionEngine Tests
 *
 * T61-1: Content safety check runs BEFORE any storeDocument call
 * T61-2: Safety pass → EventPromoted emitted
 * T61-3: Safety fail → EventPromotionRejected emitted, DataProcessResult.success (not failure)
 * T61-4: Promotion targets from FREEDOM config — channels change when config changes
 * T61-5: storeDocument called BEFORE EventPromoted enqueued (DNA-8)
 * MT-1:  Promotion record stored with tenant_id, connection_type='FLOW_SCOPED', knowledge_scope='GLOBAL'
 */

import 'reflect-metadata';
import {
  EventPromotionEngine,
  PromoteEventInput,
} from '../../src/engine/flows/event-management/event-promotion.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  contentFlagged?: boolean; // true → safety check returns flagged doc
  promotionChannels?: string[] | null; // null → no FREEDOM config (use default)
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const contentFlagged = options.contentFlagged ?? false;
  const promotionChannels = options.promotionChannels;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-content-policy') {
        callOrder.push('contentSafetyCheck'); // explicitly tracked — enables T61-1 ordering assertion
        if (contentFlagged) {
          return DataProcessResult.success([
            { event_id: filter['event_id'], flagged: true, reason: 'PROHIBITED_CONTENT' },
          ]);
        }
        return DataProcessResult.success([]); // no flagged records → safe
      }
      if (index === 'freedom_configs') {
        callOrder.push('searchDocuments');
        if (promotionChannels !== null && promotionChannels !== undefined) {
          return DataProcessResult.success([
            {
              config_key: 'flow03_promotion_channels',
              config_value: JSON.stringify(promotionChannels),
            },
          ]);
        }
        return DataProcessResult.success([]);
      }
      callOrder.push('searchDocuments');
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
  const queue = makeMockQueue(db._callOrder); // shared callOrder — DNA-8 ordering verifiable
  const svc = new EventPromotionEngine(db, queue);
  return { svc, db, queue };
}

const BASE_INPUT: PromoteEventInput = {
  eventId: 'evt-001',
  organizerId: 'org-001',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EventPromotionEngine (T61)', () => {
  it('T61-1: Content safety check runs BEFORE any storeDocument call', async () => {
    const { svc, db } = makeService({ contentFlagged: false });

    await svc.promote(BASE_INPUT);

    const callOrder = db._callOrder;
    const safetyIdx = callOrder.indexOf('contentSafetyCheck');
    const storeIdx = callOrder.indexOf('storeDocument');

    expect(safetyIdx).toBeGreaterThanOrEqual(0); // safety check was called
    expect(storeIdx).toBeGreaterThan(safetyIdx); // IR-61-1: store AFTER safety check
  });

  it('T61-1b: Safety fail → storeDocument never called', async () => {
    const { svc, db } = makeService({ contentFlagged: true });

    await svc.promote(BASE_INPUT);

    expect(db._stored.length).toBe(0); // no promotion record written on rejection
  });

  it('T61-2: Safety pass → EventPromoted emitted', async () => {
    const { svc, queue } = makeService({ contentFlagged: false });

    const result = await svc.promote(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(true);
    expect(queue._enqueued.length).toBe(1);
    expect(queue._enqueued[0].eventType).toBe('EventPromoted');
  });

  it('T61-3: Safety fail → EventPromotionRejected emitted, DataProcessResult.success (not failure)', async () => {
    // IR-61-2: content rejection is a business outcome — not a system error.
    const { svc, queue } = makeService({ contentFlagged: true });

    const result = await svc.promote(BASE_INPUT);

    // Must be success (not failure) — the request was valid, content policy rejected it
    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(false);
    expect(result.data!.reason).toBe('CONTENT_REJECTED');
    // EventPromotionRejected emitted so downstream flows can record the rejection
    expect(queue._enqueued.length).toBe(1);
    expect(queue._enqueued[0].eventType).toBe('EventPromotionRejected');
    // EventPromoted must NOT be emitted on rejection
    const promotedEvents = queue._enqueued.filter(
      (e: { eventType: string }) => e.eventType === 'EventPromoted',
    );
    expect(promotedEvents.length).toBe(0);
  });

  it('T61-4: Promotion targets from FREEDOM config — channels change when config changes', async () => {
    const { svc: svcCustom, db: dbCustom } = makeService({
      promotionChannels: ['in-app', 'push', 'email', 'sms'],
    });
    const resultCustom = await svcCustom.promote(BASE_INPUT);
    expect(resultCustom.isSuccess).toBe(true);
    const storedCustom = dbCustom._stored[0]?.doc as Record<string, unknown>;
    expect(storedCustom['channels']).toEqual(['in-app', 'push', 'email', 'sms']);

    // Different config → different channels in stored record and emitted event
    const { svc: svcMinimal, db: dbMinimal } = makeService({
      promotionChannels: ['in-app'],
    });
    const resultMinimal = await svcMinimal.promote(BASE_INPUT);
    expect(resultMinimal.isSuccess).toBe(true);
    const storedMinimal = dbMinimal._stored[0]?.doc as Record<string, unknown>;
    expect(storedMinimal['channels']).toEqual(['in-app']);
  });

  it('T61-5: storeDocument called BEFORE EventPromoted enqueued (DNA-8)', async () => {
    const { svc, db } = makeService({ contentFlagged: false });

    await svc.promote(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0); // storeDocument was called
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: enqueue AFTER store
  });

  it('T61-5b: EventPromoted NOT emitted when storeDocument fails', async () => {
    const db = makeMockDb({ contentFlagged: false });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new EventPromotionEngine(db, queue);

    const result = await svc.promote(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('MT-1: Promotion record stored with tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=GLOBAL', async () => {
    const { svc, db } = makeService({ contentFlagged: false });

    await svc.promote({ ...BASE_INPUT, tenantId: 'tenant-X' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-X');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    // knowledge_scope=GLOBAL — promoted events are publicly discoverable (not PRIVATE)
    expect(stored['knowledge_scope']).toBe('GLOBAL');
  });

  it('DNA-3: promote() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new EventPromotionEngine(db, queue);

    const result = await svc.promote(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
