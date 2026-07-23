/**
 * FLOW-08 Phase D — T119 ParticipationAnalyticsTracker + T120 BootstrapGate
 *
 * T119-1: Returns success even when analytics write fails (OBSERVABILITY)
 * T119-2: No per-user IDs in stored aggregate record
 * T119-3: knowledgeScope=GLOBAL for aggregate metrics
 * T120-1: Gate counter stored in DATABASE (not in-memory map or SCOPED_MEMORY)
 * T120-2: ParticipationBootstrapCompleted emitted when all batches acked
 * T120-3: NOT emitted if only partial batches acked
 * T120-4: SETNX on gate key prevents double-completion
 * T120-5: storeDocument BEFORE ParticipationBootstrapCompleted (callOrder)
 * T120-6: Gate correctly tracks batchCount from T67 payload
 * MT-11: ParticipationBootstrapCompleted event CloudEvents format
 */

import 'reflect-metadata';
import { ParticipationAnalyticsTrackerService } from '../../src/engine/flows/event-participation/participation-analytics-tracker.service';
import { BootstrapGateService } from '../../src/engine/flows/event-participation/bootstrap-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T119 Mocks ────────────────────────────────────────────────────────────────

function makeDbFailing() {
  return {
    storeDocument: jest.fn().mockRejectedValue(new Error('DB error')),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeDb(
  callOrder: string[],
  seed: Record<string, Array<Record<string, unknown>>> = {},
  storeCapture?: Array<Record<string, unknown>>,
) {
  return {
    searchDocuments: jest.fn().mockImplementation(async (index: string) => {
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

const ANALYTICS_INPUT = {
  tenantId: 'tenant-X',
  eventType: 'participation_registered',
  aggregatePeriod: '2026-04',
};

const BASE_ACK = {
  eventId: 'event-001',
  tenantId: 'tenant-X',
  batchIndex: 0,
  totalBatches: 3,
};

// ── T119 Tests ────────────────────────────────────────────────────────────────

describe('T119 ParticipationAnalyticsTracker', () => {
  it('T119-1: Returns success even when analytics write fails (OBSERVABILITY)', async () => {
    const db = makeDbFailing();
    const queue = makeQueue([]);

    const svc = new ParticipationAnalyticsTrackerService(db as any, queue as any);

    let threw = false;
    let result: DataProcessResult<unknown>;
    try {
      result = await svc.trackAnalytics(ANALYTICS_INPUT);
    } catch {
      threw = true;
      result = DataProcessResult.failure('THREW', 'threw');
    }

    expect(threw).toBe(false);
    expect(result!.isSuccess).toBe(true);
    expect(result!.data?.['tracked']).toBe(false);
  });

  it('T119-2: No per-user IDs in stored aggregate record', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], {}, stored);
    const queue = makeQueue([]);

    const svc = new ParticipationAnalyticsTrackerService(db as any, queue as any);
    await svc.trackAnalytics(ANALYTICS_INPUT);

    const record = stored[0];
    expect(record?.['userId']).toBeUndefined();
    expect(record?.['userIds']).toBeUndefined();
  });

  it('T119-3: knowledgeScope=GLOBAL for aggregate metrics', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], {}, stored);
    const queue = makeQueue([]);

    const svc = new ParticipationAnalyticsTrackerService(db as any, queue as any);
    await svc.trackAnalytics(ANALYTICS_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('GLOBAL');
  });
});

// ── T120 Tests ────────────────────────────────────────────────────────────────

describe('T120 BootstrapGate', () => {
  it('T120-1: Gate counter stored in DATABASE (not in-memory map or SCOPED_MEMORY)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);

    const svc = new BootstrapGateService(db as any, queue as any);
    await svc.acknowledgeBatch(BASE_ACK);

    // Verifies searchDocuments and storeDocument are called (DATABASE FABRIC)
    expect(db.searchDocuments).toHaveBeenCalled();
    expect(db.storeDocument).toHaveBeenCalled();
  });

  it('T120-2: ParticipationBootstrapCompleted emitted when all batches acked', async () => {
    // Simulate: 2 batches already acked, this is the 3rd (last)
    const db = makeDb([], {
      'xiigen-bootstrap-gate-counters': [{ gateKey: 'x', ackedBatches: 2, totalBatches: 3 }],
    });
    const queue = makeQueue([]);

    const svc = new BootstrapGateService(db as any, queue as any);
    const result = await svc.acknowledgeBatch({ ...BASE_ACK, batchIndex: 2, totalBatches: 3 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.completed).toBe(true);
    const completionEvent = queue._enqueued.find((e: { eventType: string }) =>
      e.eventType.includes('completed'),
    );
    expect(completionEvent).toBeDefined();
  });

  it('T120-3: NOT emitted if only partial batches acked', async () => {
    const db = makeDb([]);
    const queue = makeQueue([]);

    const svc = new BootstrapGateService(db as any, queue as any);
    const result = await svc.acknowledgeBatch({ ...BASE_ACK, batchIndex: 0, totalBatches: 3 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.completed).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T120-4: SETNX on gate key prevents double-completion', async () => {
    // Gate already completed
    const db = makeDb([], {
      'xiigen-bootstrap-gate-completions': [
        { completionKey: 'bootstrap-gate-complete:event-001:tenant-X', tenantId: 'tenant-X' },
      ],
    });
    const queue = makeQueue([]);

    const svc = new BootstrapGateService(db as any, queue as any);
    const result = await svc.acknowledgeBatch({ ...BASE_ACK, totalBatches: 3 });

    expect(result.isSuccess).toBe(true);
    expect(queue._enqueued.length).toBe(0); // No double completion
  });

  it('T120-5: storeDocument BEFORE ParticipationBootstrapCompleted (callOrder)', async () => {
    const callOrder: string[] = [];
    // Pre-fill counter to trigger completion on this ack
    const db = makeDb(callOrder, {
      'xiigen-bootstrap-gate-counters': [{ gateKey: 'x', ackedBatches: 2, totalBatches: 3 }],
    });
    const queue = makeQueue(callOrder);

    const svc = new BootstrapGateService(db as any, queue as any);
    await svc.acknowledgeBatch({ ...BASE_ACK, totalBatches: 3 });

    const lastStore = callOrder.lastIndexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(lastStore).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(lastStore);
  });

  it('T120-6: Gate correctly tracks batchCount from T67 payload', async () => {
    const db = makeDb([]);
    const queue = makeQueue([]);

    const svc = new BootstrapGateService(db as any, queue as any);
    const result = await svc.acknowledgeBatch({ ...BASE_ACK, totalBatches: 5 });

    expect(result.data?.totalBatches).toBe(5);
  });

  it('MT-11: ParticipationBootstrapCompleted event CloudEvents format', async () => {
    const db = makeDb([], {
      'xiigen-bootstrap-gate-counters': [{ gateKey: 'x', ackedBatches: 2, totalBatches: 3 }],
    });
    const queue = makeQueue([]);

    const svc = new BootstrapGateService(db as any, queue as any);
    await svc.acknowledgeBatch({ ...BASE_ACK, totalBatches: 3 });

    const completionEvent = queue._enqueued.find((e: { eventType: string }) =>
      e.eventType.includes('completed'),
    );
    expect(completionEvent).toBeDefined();
    const data = completionEvent?.data as Record<string, unknown>;
    expect(data?.['eventId']).toBe(BASE_ACK.eventId);
    expect(data?.['tenantId']).toBe(BASE_ACK.tenantId);
    expect(data?.['totalBatches']).toBe(3);
  });
});
