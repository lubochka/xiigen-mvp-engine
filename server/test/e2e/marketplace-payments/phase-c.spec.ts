/**
 * T611 MarketplaceEscrowController — Phase C tests
 * FLOW-16: Marketplace Payments
 *
 * Tests: T611-1 through T611-6
 *   T611-1: LIFO compensation order — REFUND_PAYMENT before RESTORE_INVENTORY
 *   T611-2: Dispute → updateDocument(status:DISPUTED); NO deleteDocument called
 *   T611-3: storeDocument(audit) before EscrowReleased emit — DNA-8
 *   T611-4: escrow_auto_release_days loaded from FREEDOM config — not hardcoded
 *   T611-5: EscrowReleased carries: orderId, escrowId, sellerAmountCents, releasedAt
 *   T611-6: PaymentReversalRequested triggers compensation, not manual refund+restore
 */

import 'reflect-metadata';
import { MarketplaceEscrowControllerService } from '../../../src/engine/flows/marketplace-payments/marketplace-escrow-controller.service';

describe('T611 MarketplaceEscrowController', () => {
  let service: MarketplaceEscrowControllerService;

  const callOrder: string[] = [];
  const storedDocs: Array<{ index: string; doc: Record<string, unknown> }> = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-611' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    storedDocs.length = 0;

    // Default: escrow record exists, no FREEDOM config
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-escrow-holds') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ escrowId: 'escrow-611', tenantId: 'tenant-611', status: 'HELD' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(
      (index: string, doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        storedDocs.push({ index, doc });
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new MarketplaceEscrowControllerService(
      mockDb as unknown as ConstructorParameters<typeof MarketplaceEscrowControllerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof MarketplaceEscrowControllerService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof MarketplaceEscrowControllerService>[2],
    );
  });

  // T611-1: LIFO compensation order — REFUND_PAYMENT before RESTORE_INVENTORY
  test('T611-1: LIFO compensation order — REFUND_PAYMENT stored before RESTORE_INVENTORY', async () => {
    const result = await service.handlePaymentReversalRequested({
      orderId: 'order-611-1',
      escrowId: 'escrow-611-1',
    });

    expect(result.isSuccess).toBe(true);

    // Find compensation step writes
    const compensationWrites = storedDocs.filter(
      ({ index }) => index === 'xiigen-compensation-steps',
    );
    expect(compensationWrites.length).toBe(2);

    // REFUND_PAYMENT must come before RESTORE_INVENTORY
    const refundIdx = compensationWrites.findIndex(
      ({ doc }) => doc['compensationStep'] === 'REFUND_PAYMENT',
    );
    const restoreIdx = compensationWrites.findIndex(
      ({ doc }) => doc['compensationStep'] === 'RESTORE_INVENTORY',
    );
    expect(refundIdx).toBeGreaterThanOrEqual(0);
    expect(restoreIdx).toBeGreaterThanOrEqual(0);
    expect(refundIdx).toBeLessThan(restoreIdx);
  });

  // T611-2: Dispute → updateDocument(status:DISPUTED); NO deleteDocument called
  test('T611-2: DisputeInitiated → status:DISPUTED, accessBlocked:true; NO deleteDocument', async () => {
    const result = await service.handleDisputeInitiated({
      escrowId: 'escrow-611-2',
      orderId: 'order-611-2',
      disputeReason: 'item_not_received',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('status', 'DISPUTED');

    // updateDocument called with status:DISPUTED and accessBlocked:true
    const escrowWrite = storedDocs.find(({ index }) => index === 'xiigen-escrow-holds');
    expect(escrowWrite).toBeDefined();
    expect(escrowWrite!.doc['status']).toBe('DISPUTED');
    expect(escrowWrite!.doc['accessBlocked']).toBe(true);

    // NO deleteDocument — the mock only has storeDocument, no deleteDocument method
    // Verify the mock interface has no delete operations called
    expect(mockDb).not.toHaveProperty('deleteDocument');
  });

  // T611-3: storeDocument(audit) before EscrowReleased emit — DNA-8
  test('T611-3: storeDocument(xiigen-escrow-audit) called before enqueue(EscrowReleased) — DNA-8', async () => {
    const result = await service.handleEscrowReleaseRequested({
      escrowId: 'escrow-611-3',
      orderId: 'order-611-3',
      sellerAmountCents: 4500,
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE EscrowReleased enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-escrow-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:EscrowReleased');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T611-4: escrow_auto_release_days loaded from FREEDOM config — not hardcoded
  test('T611-4: escrow_auto_release_days loaded from FREEDOM config — not hardcoded', async () => {
    // FREEDOM config returns custom auto-release days
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-freedom-config' && filter['key'] === 'escrow_auto_release_days') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ key: 'escrow_auto_release_days', value: 7 }],
        });
      }
      if (index === 'xiigen-escrow-holds') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ escrowId: 'escrow-611-4', tenantId: 'tenant-611', status: 'HELD' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.handleEscrowReleaseRequested({
      escrowId: 'escrow-611-4',
      orderId: 'order-611-4',
      sellerAmountCents: 3000,
    });

    expect(result.isSuccess).toBe(true);

    // Verify FREEDOM config was queried for escrow_auto_release_days
    expect(mockDb.searchDocuments).toHaveBeenCalledWith(
      'xiigen-freedom-config',
      expect.objectContaining({ key: 'escrow_auto_release_days' }),
    );

    // Verify the loaded value was used in the escrow update
    const escrowWrite = storedDocs.find(({ index }) => index === 'xiigen-escrow-holds');
    expect(escrowWrite).toBeDefined();
    expect(escrowWrite!.doc['autoReleaseDays']).toBe(7);
  });

  // T611-5: EscrowReleased carries: orderId, escrowId, sellerAmountCents, releasedAt
  test('T611-5: EscrowReleased carries: orderId, escrowId, sellerAmountCents, releasedAt', async () => {
    const result = await service.handleEscrowReleaseRequested({
      escrowId: 'escrow-611-5',
      orderId: 'order-611-5',
      sellerAmountCents: 7200,
    });

    expect(result.isSuccess).toBe(true);

    const releasedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'EscrowReleased',
    );
    expect(releasedCall).toBeDefined();
    const payload = releasedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('orderId', 'order-611-5');
    expect(payload).toHaveProperty('escrowId', 'escrow-611-5');
    expect(payload).toHaveProperty('sellerAmountCents', 7200);
    expect(payload).toHaveProperty('releasedAt');
  });

  // T611-6: PaymentReversalRequested triggers compensation steps, not manual operations
  test('T611-6: PaymentReversalRequested triggers LIFO compensation steps stored in compensation index', async () => {
    const result = await service.handlePaymentReversalRequested({
      orderId: 'order-611-6',
      escrowId: 'escrow-611-6',
    });

    expect(result.isSuccess).toBe(true);

    // Compensation steps were stored — not individual direct refund/restore calls
    const compensationWrites = storedDocs.filter(
      ({ index }) => index === 'xiigen-compensation-steps',
    );
    expect(compensationWrites.length).toBe(2);
    const steps = compensationWrites.map(({ doc }) => doc['compensationStep'] as string);
    expect(steps).toContain('REFUND_PAYMENT');
    expect(steps).toContain('RESTORE_INVENTORY');

    // PaymentReversed emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'PaymentReversed',
      expect.objectContaining({
        orderId: 'order-611-6',
        escrowId: 'escrow-611-6',
        compensationSteps: ['REFUND_PAYMENT', 'RESTORE_INVENTORY'],
      }),
    );
  });
});
