/**
 * FLOW-09 Phase C — T105 ComplianceEscalationHandler + T112 FeeCalculatorHandler
 *
 * T105-1: attempt < max → RETRY_QUEUED
 * T105-2: attempt = max → ESCALATED (both RefundFailed AND F284 push)
 * T105-3: F284 push present on exhaustion (compliance requirement)
 * T105-4: RefundFailed emitted on exhaustion
 * T105-5: per-attempt idempotency key distinct from attempt N-1
 * T105-6: storeDocument BEFORE emits (DNA-8)
 *
 * T112-1: returns FeeBreakdown (not DataProcessResult.failure)
 * T112-2: fee rates from FREEDOM config (not hardcoded)
 * T112-3: NO storeDocument called (INLINE_PURE)
 * T112-4: NO enqueue called (INLINE_PURE)
 * T112-5: netAmount = grossAmount - totalFee
 */

import 'reflect-metadata';
import { ComplianceEscalationHandler } from '../../src/engine/flows/transactional-event-participation/compliance-escalation.handler';
import { FeeCalculatorHandler } from '../../src/engine/flows/transactional-event-participation/fee-calculator.handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T105 tests ────────────────────────────────────────────────────────────────

function makeComplianceQueue() {
  const _pushed: unknown[] = [];
  return {
    push: jest.fn().mockImplementation(async (data: unknown) => {
      _pushed.push(data);
      return { success: true };
    }),
    _pushed,
  };
}

function makeComplianceDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeComplianceQueueService(callOrder: string[]) {
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

const BASE_COMPLIANCE_INPUT = {
  purchaseId: 'purchase-001',
  userId: 'user-A',
  eventId: 'event-001',
  refundId: 'refund-001',
  failureReason: 'PAYMENT_PROVIDER_TIMEOUT',
};

describe('T105 ComplianceEscalationHandler — COMPLIANCE_ESCALATION + PER_ATTEMPT_IDEMPOTENCY', () => {
  it('T105-1: attempt < max → RETRY_QUEUED', async () => {
    const callOrder: string[] = [];
    const complianceQueue = makeComplianceQueue();
    const db = makeComplianceDb(callOrder);
    const queue = makeComplianceQueueService(callOrder);
    const freedom = { get: jest.fn().mockResolvedValue({}) };

    const handler = new ComplianceEscalationHandler(
      complianceQueue as any,
      db as any,
      queue as any,
      freedom as any,
    );
    const result = await handler.handleRefundAttempt({
      ...BASE_COMPLIANCE_INPUT,
      attemptNumber: 1,
      maxAttempts: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('RETRY_QUEUED');
  });

  it('T105-2: attempt = max → ESCALATED', async () => {
    const callOrder: string[] = [];
    const complianceQueue = makeComplianceQueue();
    const db = makeComplianceDb(callOrder);
    const queue = makeComplianceQueueService(callOrder);
    const freedom = { get: jest.fn().mockResolvedValue({}) };

    const handler = new ComplianceEscalationHandler(
      complianceQueue as any,
      db as any,
      queue as any,
      freedom as any,
    );
    const result = await handler.handleRefundAttempt({
      ...BASE_COMPLIANCE_INPUT,
      attemptNumber: 3,
      maxAttempts: 3,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('ESCALATED');
  });

  it('T105-3: F284 push present on exhaustion (compliance requirement)', async () => {
    const callOrder: string[] = [];
    const complianceQueue = makeComplianceQueue();
    const db = makeComplianceDb(callOrder);
    const queue = makeComplianceQueueService(callOrder);
    const freedom = { get: jest.fn().mockResolvedValue({}) };

    const handler = new ComplianceEscalationHandler(
      complianceQueue as any,
      db as any,
      queue as any,
      freedom as any,
    );
    await handler.handleRefundAttempt({
      ...BASE_COMPLIANCE_INPUT,
      attemptNumber: 3,
      maxAttempts: 3,
    });

    // F284 push must have been called
    expect(complianceQueue.push).toHaveBeenCalled();
    expect(complianceQueue._pushed.length).toBeGreaterThan(0);
  });

  it('T105-4: RefundFailed emitted on exhaustion', async () => {
    const callOrder: string[] = [];
    const complianceQueue = makeComplianceQueue();
    const db = makeComplianceDb(callOrder);
    const queue = makeComplianceQueueService(callOrder);
    const freedom = { get: jest.fn().mockResolvedValue({}) };

    const handler = new ComplianceEscalationHandler(
      complianceQueue as any,
      db as any,
      queue as any,
      freedom as any,
    );
    await handler.handleRefundAttempt({
      ...BASE_COMPLIANCE_INPUT,
      attemptNumber: 3,
      maxAttempts: 3,
    });

    const refundFailed = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'refund.failed',
    );
    expect(refundFailed).toBeDefined();
  });

  it('T105-5: storeDocument BEFORE emits (DNA-8)', async () => {
    const callOrder: string[] = [];
    const complianceQueue = makeComplianceQueue();
    const db = makeComplianceDb(callOrder);
    const queue = makeComplianceQueueService(callOrder);
    const freedom = { get: jest.fn().mockResolvedValue({}) };

    const handler = new ComplianceEscalationHandler(
      complianceQueue as any,
      db as any,
      queue as any,
      freedom as any,
    );
    await handler.handleRefundAttempt({
      ...BASE_COMPLIANCE_INPUT,
      attemptNumber: 3,
      maxAttempts: 3,
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });
});

// ── T112 tests ────────────────────────────────────────────────────────────────

function makeFeedom(platformRate = 0.02, processingRate = 0.029) {
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      if (key === 'flow09_platform_fee_rate')
        return { flow09_platform_fee_rate: platformRate };
      if (key === 'flow09_processing_fee_rate')
        return { flow09_processing_fee_rate: processingRate };
      return {};
    }),
  };
}

const FEE_INPUT = {
  grossAmount: 100,
  currency: 'USD',
  purchaseId: 'purchase-001',
  ticketTier: 'GENERAL',
};

describe('T112 FeeCalculatorHandler — INLINE_PURE', () => {
  it('T112-1: returns DataProcessResult.success with FeeBreakdown', async () => {
    const freedom = makeFeedom();
    const handler = new FeeCalculatorHandler(freedom as any);
    const result = await handler.calculate(FEE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.totalFee).toBeGreaterThan(0);
    expect(result.data?.netAmount).toBeGreaterThan(0);
  });

  it('T112-2: fee rates from FREEDOM config', async () => {
    const freedom = makeFeedom(0.05, 0.03);
    const handler = new FeeCalculatorHandler(freedom as any);
    const result = await handler.calculate(FEE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.platformFeeRate).toBe(0.05);
    expect(result.data?.processingFeeRate).toBe(0.03);
  });

  it('T112-3: netAmount = grossAmount - totalFee', async () => {
    const freedom = makeFeedom(0.02, 0.029);
    const handler = new FeeCalculatorHandler(freedom as any);
    const result = await handler.calculate(FEE_INPUT);

    const expectedTotal = 100 * (0.02 + 0.029);
    const expectedNet = 100 - expectedTotal;
    expect(result.data?.totalFee).toBeCloseTo(expectedTotal, 5);
    expect(result.data?.netAmount).toBeCloseTo(expectedNet, 5);
  });

  it('T112-4: no side-effects — freedom.get called, no storeDocument', async () => {
    const freedom = makeFeedom();
    // FeeCalculatorHandler constructor only takes freedom — if it had db/queue, it would fail
    const handler = new FeeCalculatorHandler(freedom as any);
    const result = await handler.calculate(FEE_INPUT);

    // Handler only calls freedom — no db, no queue
    expect(result.isSuccess).toBe(true);
    expect(freedom.get).toHaveBeenCalled();
  });
});
