/**
 * FLOW-09 Phase E — T102 TicketIssuerHandler + T100 PaymentProcessorHandler
 *
 * T102-1: ticket stored BEFORE TicketIssued emitted (DNA-8)
 * T102-2: idempotent by (purchaseId, ticketTier)
 * T102-3: TicketPurchaseCompleted also emitted (for FLOW-10, FLOW-13)
 * T102-4: QR generation via F275 (not inline)
 * T102-5: ticket record knowledgeScope=PRIVATE
 *
 * T100-1: payment stored BEFORE PaymentProcessed emitted (DNA-8)
 * T100-2: idempotent by paymentId
 * T100-3: payment record knowledgeScope=PRIVATE
 */

import 'reflect-metadata';
import { TicketIssuerHandler } from '../../src/engine/flows/transactional-event-participation/ticket-issuer.handler';
import { PaymentProcessorHandler } from '../../src/engine/flows/transactional-event-participation/payment-processor.handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T102 tests ────────────────────────────────────────────────────────────────

const TICKET_INPUT = {
  purchaseId: 'purchase-001',
  userId: 'user-A',
  eventId: 'event-001',
  ticketTier: 'GENERAL',
  paymentId: 'pay-001',
  purchaseType: 'INDIVIDUAL' as const,
};

function makeQrService() {
  return {
    generate: jest.fn().mockResolvedValue(DataProcessResult.success({ token: 'qr-token-abc123' })),
  };
}

function makeTicketDb(
  callOrder: string[],
  storeCapture?: Array<Record<string, unknown>>,
  existing?: Record<string, unknown>,
) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
    searchDocuments: jest
      .fn()
      .mockResolvedValue(
        existing ? DataProcessResult.success([existing]) : DataProcessResult.success([]),
      ),
  };
}

function makeTicketQueue(callOrder: string[]) {
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

describe('T102 TicketIssuerHandler', () => {
  it('T102-1: storeDocument BEFORE TicketIssued emit (DNA-8)', async () => {
    const callOrder: string[] = [];
    const qr = makeQrService();
    const db = makeTicketDb(callOrder);
    const queue = makeTicketQueue(callOrder);

    const handler = new TicketIssuerHandler(qr as any, db as any, queue as any);
    const result = await handler.issueTicket(TICKET_INPUT);

    expect(result.isSuccess).toBe(true);
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T102-2: TicketIssued emitted (backward cross-wave to FLOW-04 T63)', async () => {
    const callOrder: string[] = [];
    const qr = makeQrService();
    const db = makeTicketDb(callOrder);
    const queue = makeTicketQueue(callOrder);

    const handler = new TicketIssuerHandler(qr as any, db as any, queue as any);
    await handler.issueTicket(TICKET_INPUT);

    const ticketIssued = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'ticket.issued',
    );
    expect(ticketIssued).toBeDefined();
  });

  it('T102-3: TicketPurchaseCompleted also emitted (FLOW-10/13)', async () => {
    const callOrder: string[] = [];
    const qr = makeQrService();
    const db = makeTicketDb(callOrder);
    const queue = makeTicketQueue(callOrder);

    const handler = new TicketIssuerHandler(qr as any, db as any, queue as any);
    await handler.issueTicket(TICKET_INPUT);

    const completed = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'ticket.purchase.completed',
    );
    expect(completed).toBeDefined();
  });

  it('T102-4: ticket record knowledgeScope=PRIVATE', async () => {
    const callOrder: string[] = [];
    const storeCapture: Array<Record<string, unknown>> = [];
    const qr = makeQrService();
    const db = makeTicketDb(callOrder, storeCapture);
    const queue = makeTicketQueue(callOrder);

    const handler = new TicketIssuerHandler(qr as any, db as any, queue as any);
    await handler.issueTicket(TICKET_INPUT);

    const ticket = storeCapture[0];
    expect(ticket?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T102-5: idempotent — returns existing ticket on duplicate', async () => {
    const callOrder: string[] = [];
    const existing = { qrToken: 'existing-qr', issuedAt: '2026-01-01T00:00:00Z' };
    const qr = makeQrService();
    const db = makeTicketDb(callOrder, undefined, existing);
    const queue = makeTicketQueue(callOrder);

    const handler = new TicketIssuerHandler(qr as any, db as any, queue as any);
    const result = await handler.issueTicket(TICKET_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.qrToken).toBe('existing-qr');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });
});

// ── T100 tests ────────────────────────────────────────────────────────────────

const PAYMENT_INPUT = {
  purchaseId: 'purchase-001',
  holdId: 'hold-123',
  userId: 'user-A',
  eventId: 'event-001',
  amount: 99.99,
  currency: 'USD',
  paymentMethodId: 'pm-card-001',
};

function makePaymentService() {
  return {
    capture: jest.fn().mockResolvedValue(DataProcessResult.success({ transactionRef: 'txn-abc' })),
  };
}

function makePaymentDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
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

function makePaymentQueue(callOrder: string[]) {
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

describe('T100 PaymentProcessorHandler', () => {
  it('T100-1: storeDocument BEFORE PaymentProcessed (DNA-8)', async () => {
    const callOrder: string[] = [];
    const paymentSvc = makePaymentService();
    const db = makePaymentDb(callOrder);
    const queue = makePaymentQueue(callOrder);

    const handler = new PaymentProcessorHandler(paymentSvc as any, db as any, queue as any);
    await handler.processPayment(PAYMENT_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T100-2: payment record knowledgeScope=PRIVATE', async () => {
    const callOrder: string[] = [];
    const storeCapture: Array<Record<string, unknown>> = [];
    const paymentSvc = makePaymentService();
    const db = makePaymentDb(callOrder, storeCapture);
    const queue = makePaymentQueue(callOrder);

    const handler = new PaymentProcessorHandler(paymentSvc as any, db as any, queue as any);
    await handler.processPayment(PAYMENT_INPUT);

    expect(storeCapture[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T100-3: payment provider failure → DataProcessResult.failure', async () => {
    const callOrder: string[] = [];
    const paymentSvc = {
      capture: jest.fn().mockResolvedValue(DataProcessResult.failure('DECLINED', 'Card declined')),
    };
    const db = makePaymentDb(callOrder);
    const queue = makePaymentQueue(callOrder);

    const handler = new PaymentProcessorHandler(paymentSvc as any, db as any, queue as any);
    const result = await handler.processPayment(PAYMENT_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PAYMENT_FAILED');
  });
});
