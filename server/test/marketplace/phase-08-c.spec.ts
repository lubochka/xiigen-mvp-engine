/**
 * FLOW-08 Phase C — T69 PurchaseHistoryRecorder + T70 PurchaseOverlapAnalyzer
 *
 * T69-1: storeDocument BEFORE PurchaseRecorded (callOrder)
 * T69-2: Schema includes eventCategory (queryable by FLOW-07 T76)
 * T69-3: knowledgeScope=PRIVATE
 * T69-4: Duplicate purchase (SETNX) returns existing as success
 * T70-1: Triggers on SocialConnectionEstablished (no queue dependency — called by connection event)
 * T70-2: Full recompute from intersection — reads both user histories, intersects
 * T70-3: Same result on second call with same inputs (idempotency via full recompute)
 * T70-4: userA has no purchases → success({ overlapCount: 0, partial: true }) (R2 null-read fallback)
 * T70-5: userB has no purchases → success({ overlapCount: 0, partial: true })
 * T70-6: Correct overlap count from intersection
 * T70-7: storeDocument BEFORE PurchaseOverlapComputed (callOrder)
 * T70-8: knowledgeScope=PRIVATE
 * MT-10: PurchaseOverlapComputed event CloudEvents format
 */

import 'reflect-metadata';
import { PurchaseHistoryRecorderService } from '../../src/engine/flows/event-participation/purchase-history-recorder.service';
import { PurchaseOverlapAnalyzerService } from '../../src/engine/flows/event-participation/purchase-overlap-analyzer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T69 Mocks ─────────────────────────────────────────────────────────────────

function makeDb(
  callOrder: string[],
  seed: Record<string, Array<Record<string, unknown>>> = {},
  storeCapture?: Array<Record<string, unknown>>,
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        callOrder.push(`search:${index}`);
        return DataProcessResult.success(seed[index] ?? []);
      }),
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
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

const PURCHASE_INPUT = {
  userId: 'user-A',
  eventId: 'event-001',
  tenantId: 'tenant-X',
  purchaseAmount: 99.99,
  eventCategory: 'music',
};

// ── T69 Tests ─────────────────────────────────────────────────────────────────

describe('T69 PurchaseHistoryRecorder', () => {
  it('T69-1: storeDocument BEFORE PurchaseRecorded (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);

    const svc = new PurchaseHistoryRecorderService(db as any, queue as any);
    await svc.recordPurchase(PURCHASE_INPUT);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T69-2: Schema includes eventCategory (queryable by FLOW-07 T76)', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], {}, stored);
    const queue = makeQueue([]);

    const svc = new PurchaseHistoryRecorderService(db as any, queue as any);
    await svc.recordPurchase(PURCHASE_INPUT);

    expect(stored[0]?.['eventCategory']).toBe('music');
    expect(stored[0]?.['userId']).toBe('user-A');
    expect(stored[0]?.['eventId']).toBe('event-001');
  });

  it('T69-3: knowledgeScope=PRIVATE', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], {}, stored);
    const queue = makeQueue([]);

    const svc = new PurchaseHistoryRecorderService(db as any, queue as any);
    await svc.recordPurchase(PURCHASE_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T69-4: Duplicate purchase (SETNX) returns existing as success', async () => {
    const purchaseId = `purchase-${PURCHASE_INPUT.userId}-${PURCHASE_INPUT.eventId}-${PURCHASE_INPUT.tenantId}`;
    const existingRecord = { purchaseId, ...PURCHASE_INPUT, status: 'RECORDED' };
    const db = makeDb([], { 'xiigen-purchase-history': [existingRecord] });
    const queue = makeQueue([]);

    const svc = new PurchaseHistoryRecorderService(db as any, queue as any);
    const result = await svc.recordPurchase(PURCHASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.idempotent).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });
});

// ── T70 Mocks ─────────────────────────────────────────────────────────────────

const OVERLAP_INPUT = {
  userIdA: 'user-A',
  userIdB: 'user-B',
  tenantId: 'tenant-X',
};

// ── T70 Tests ─────────────────────────────────────────────────────────────────

describe('T70 PurchaseOverlapAnalyzer', () => {
  it('T70-2: Full recompute from intersection — reads both user histories', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {
      'xiigen-purchase-history': [
        { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
        { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
      ],
    });
    const queue = makeQueue(callOrder);

    const svc = new PurchaseOverlapAnalyzerService(db as any, queue as any);
    await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    // Both user histories should be searched
    const searchCalls = (db.searchDocuments as jest.Mock).mock.calls;
    const searchIndexes = searchCalls.map((c: unknown[]) => c[0] as string);
    const purchaseHistorySearches = searchIndexes.filter((i) => i === 'xiigen-purchase-history');
    expect(purchaseHistorySearches.length).toBeGreaterThanOrEqual(2);
  });

  it('T70-3: Same result on second call with same inputs (idempotency)', async () => {
    const db = makeDb([], {
      'xiigen-purchase-history': [
        { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
        { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
      ],
    });
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(db as any, queue as any);
    const r1 = await svc.analyzePurchaseOverlap(OVERLAP_INPUT);
    const r2 = await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(r1.data?.overlapCount).toBe(r2.data?.overlapCount);
  });

  it('T70-4: userA has no purchases → success({ overlapCount: 0, partial: true })', async () => {
    const db = makeDb([], {
      'xiigen-purchase-history': [], // no records
    });
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(db as any, queue as any);
    const result = await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.overlapCount).toBe(0);
    expect(result.data?.partial).toBe(true);
  });

  it('T70-5: userB has no purchases → success({ overlapCount: 0, partial: true })', async () => {
    // userA has purchases but userB has none
    const dbWithAOnly = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        )
        .mockResolvedValueOnce(DataProcessResult.success([])), // userB empty
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(dbWithAOnly as any, queue as any);
    const result = await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.overlapCount).toBe(0);
    expect(result.data?.partial).toBe(true);
  });

  it('T70-6: Correct overlap count from intersection', async () => {
    const dbOverlap = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
            { userId: 'user-A', eventId: 'event-2', tenantId: 'tenant-X' },
          ]),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
            { userId: 'user-B', eventId: 'event-3', tenantId: 'tenant-X' },
          ]),
        ),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(dbOverlap as any, queue as any);
    const result = await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.overlapCount).toBe(1); // only event-1 overlaps
  });

  it('T70-7: storeDocument BEFORE PurchaseOverlapComputed (callOrder)', async () => {
    const callOrder: string[] = [];
    const dbFull = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        ),
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };
    const queue = makeQueue(callOrder);

    const svc = new PurchaseOverlapAnalyzerService(dbFull as any, queue as any);
    await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T70-8: knowledgeScope=PRIVATE', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const dbFull = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        ),
      storeDocument: jest
        .fn()
        .mockImplementation(async (_: string, doc: Record<string, unknown>) => {
          stored.push(doc);
          return DataProcessResult.success({});
        }),
    };
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(dbFull as any, queue as any);
    await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('MT-10: PurchaseOverlapComputed event CloudEvents format', async () => {
    const dbFull = {
      searchDocuments: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-A', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success([
            { userId: 'user-B', eventId: 'event-1', tenantId: 'tenant-X' },
          ]),
        ),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = makeQueue([]);

    const svc = new PurchaseOverlapAnalyzerService(dbFull as any, queue as any);
    await svc.analyzePurchaseOverlap(OVERLAP_INPUT);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('overlap');
    const data = event.data as Record<string, unknown>;
    expect(data['userIdA']).toBe(OVERLAP_INPUT.userIdA);
    expect(data['userIdB']).toBe(OVERLAP_INPUT.userIdB);
    expect(data['tenantId']).toBe(OVERLAP_INPUT.tenantId);
  });
});
