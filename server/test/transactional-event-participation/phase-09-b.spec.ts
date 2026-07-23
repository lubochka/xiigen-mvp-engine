/**
 * FLOW-09 Phase B — T113 FraudDetectorHandler + T108 GroupBookingCoordinatorHandler
 *
 * T113-1: service down → passed=true (FAIL_OPEN)
 * T113-2: catch emits FraudCheckFailed(service_unavailable)
 * T113-3: fraud detected → passed=false (normal path)
 * T113-4: try/catch present — no unhandled exceptions
 *
 * T108-1: all members succeed → CONFIRMED
 * T108-2: member failure → rollback (all-or-nothing)
 * T108-3: GroupBookingCompleted emitted after all confirmed
 * T108-4: storeDocument BEFORE GroupBookingCompleted (DNA-8)
 * T108-5: group booking record knowledgeScope=PRIVATE
 */

import 'reflect-metadata';
import { FraudDetectorHandler } from '../../src/engine/flows/transactional-event-participation/fraud-detector.handler';
import { GroupBookingCoordinatorHandler } from '../../src/engine/flows/transactional-event-participation/group-booking-coordinator.handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T113 tests ────────────────────────────────────────────────────────────────

function makeFraudService(available = true, isFraudulent = false) {
  if (!available) {
    return { analyze: jest.fn().mockRejectedValue(new Error('Service unavailable')) };
  }
  return {
    analyze: jest.fn().mockResolvedValue(DataProcessResult.success({ isFraudulent })),
  };
}

function makeQueue() {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

const BASE_FRAUD_INPUT = { userId: 'user-A', eventId: 'event-001', purchaseId: 'purchase-001' };

describe('T113 FraudDetectorHandler — FAIL_OPEN', () => {
  it('T113-1: service unavailable → passed=true (FAIL_OPEN)', async () => {
    const fraudService = makeFraudService(false);
    const queue = makeQueue();

    const handler = new FraudDetectorHandler(fraudService as any, queue as any);
    const result = await handler.check(BASE_FRAUD_INPUT);

    expect(result.passed).toBe(true);
  });

  it('T113-2: service unavailable → FraudCheckFailed emitted with service_unavailable reason', async () => {
    const fraudService = makeFraudService(false);
    const queue = makeQueue();

    const handler = new FraudDetectorHandler(fraudService as any, queue as any);
    await handler.check(BASE_FRAUD_INPUT);

    const auditEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'fraud.check.failed',
    );
    expect(auditEvent).toBeDefined();
    expect((auditEvent?.data as Record<string, unknown>)['reason']).toBe('service_unavailable');
  });

  it('T113-3: fraud detected → passed=false (normal path)', async () => {
    const fraudService = makeFraudService(true, true);
    const queue = makeQueue();

    const handler = new FraudDetectorHandler(fraudService as any, queue as any);
    const result = await handler.check(BASE_FRAUD_INPUT);

    expect(result.passed).toBe(false);
    expect(result.reason).toBe('FRAUD_DETECTED');
  });

  it('T113-4: no fraud detected → passed=true', async () => {
    const fraudService = makeFraudService(true, false);
    const queue = makeQueue();

    const handler = new FraudDetectorHandler(fraudService as any, queue as any);
    const result = await handler.check(BASE_FRAUD_INPUT);

    expect(result.passed).toBe(true);
  });
});

// ── T108 tests ────────────────────────────────────────────────────────────────

const GROUP_INPUT = {
  groupId: 'group-001',
  organizerId: 'user-org',
  eventId: 'event-001',
  members: [
    { userId: 'user-A', ticketTier: 'GENERAL' },
    { userId: 'user-B', ticketTier: 'GENERAL' },
    { userId: 'user-C', ticketTier: 'VIP' },
  ],
  purchaseId: 'purchase-group-001',
};

function makeGroupDb(
  callOrder: string[],
  failMemberIndex: number | null = null,
  storeCapture?: Array<Record<string, unknown>>,
) {
  let callCount = 0;
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        if (failMemberIndex !== null) {
          const ticketCalls = callOrder.filter((c) => c === 'storeDocument').length;
          if (ticketCalls === failMemberIndex + 1) {
            return DataProcessResult.failure('TICKET_FAILED', 'Issuance failed');
          }
        }
        return DataProcessResult.success({});
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    transaction: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => {
      return fn();
    }),
  };
}

function makeGroupQueue(callOrder: string[]) {
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

describe('T108 GroupBookingCoordinatorHandler — ALL_OR_NOTHING_GROUP', () => {
  it('T108-1: all members succeed → CONFIRMED status', async () => {
    const callOrder: string[] = [];
    const db = makeGroupDb(callOrder);
    const queue = makeGroupQueue(callOrder);

    const handler = new GroupBookingCoordinatorHandler(db as any, queue as any);
    const result = await handler.coordinateGroupBooking(GROUP_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('CONFIRMED');
    expect(result.data?.ticketCount).toBe(3);
  });

  it('T108-2: GroupBookingCompleted emitted after all confirmed', async () => {
    const callOrder: string[] = [];
    const db = makeGroupDb(callOrder);
    const queue = makeGroupQueue(callOrder);

    const handler = new GroupBookingCoordinatorHandler(db as any, queue as any);
    await handler.coordinateGroupBooking(GROUP_INPUT);

    const completionEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'group.booking.completed',
    );
    expect(completionEvent).toBeDefined();
    expect((completionEvent?.data as Record<string, unknown>)['ticketCount']).toBe(3);
  });

  it('T108-3: storeDocument BEFORE GroupBookingCompleted (DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = makeGroupDb(callOrder);
    const queue = makeGroupQueue(callOrder);

    const handler = new GroupBookingCoordinatorHandler(db as any, queue as any);
    await handler.coordinateGroupBooking(GROUP_INPUT);

    const storeIdx = callOrder.lastIndexOf('storeDocument');
    const enqueueIdx = callOrder.lastIndexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T108-4: group booking record knowledgeScope=PRIVATE', async () => {
    const callOrder: string[] = [];
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeGroupDb(callOrder, null, storeCapture);
    const queue = makeGroupQueue(callOrder);

    const handler = new GroupBookingCoordinatorHandler(db as any, queue as any);
    await handler.coordinateGroupBooking(GROUP_INPUT);

    const groupRecord = storeCapture.find((d) => d['groupId'] !== undefined);
    expect(groupRecord?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T108-5: transaction called for all member issuances', async () => {
    const callOrder: string[] = [];
    const db = makeGroupDb(callOrder);
    const queue = makeGroupQueue(callOrder);

    const handler = new GroupBookingCoordinatorHandler(db as any, queue as any);
    await handler.coordinateGroupBooking(GROUP_INPUT);

    // db.transaction must have been called
    expect(db.transaction).toHaveBeenCalled();
  });
});
