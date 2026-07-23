/**
 * T612 SellerPayoutWriter — Phase D tests
 * FLOW-16: Marketplace Payments
 *
 * Tests: T612-1 through T612-5
 *   T612-1: SETNX duplicate → returns immediately; no payout storeDocument
 *   T612-2: payoutVaultRef present in payout record; bankAccountNumber/IBAN/routingNumber/sortCode absent
 *   T612-3: storeDocument(audit) before enqueue(PayoutCompleted) — DNA-8
 *   T612-4: PayoutCompleted carries: orderId, sellerId, payoutVaultRef, amountCents, paidAt
 *   T612-5: PII fields (bankAccountNumber, IBAN, sortCode, routingNumber) NOT in any storeDocument call
 */

import 'reflect-metadata';
import { SellerPayoutWriterService } from '../../../src/engine/flows/marketplace-payments/seller-payout-writer.service';

describe('T612 SellerPayoutWriter', () => {
  let service: SellerPayoutWriterService;

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
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-612' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    storedDocs.length = 0;

    // Default: no existing payout lock; seller vault returns payoutVaultRef
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-seller-vault-refs') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ sellerId: 'seller-612', payoutVaultRef: 'vault-ref-abc123' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    // Default: all storeDocument calls succeed; track docs
    mockDb.storeDocument.mockImplementation(
      (index: string, doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        storedDocs.push({ index, doc });
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new SellerPayoutWriterService(
      mockDb as unknown as ConstructorParameters<typeof SellerPayoutWriterService>[0],
      mockQueue as unknown as ConstructorParameters<typeof SellerPayoutWriterService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof SellerPayoutWriterService>[2],
    );
  });

  // T612-1: SETNX duplicate → returns immediately; no payout storeDocument
  test('T612-1: SETNX duplicate → returns immediately; no payout storeDocument called', async () => {
    // SETNX lock already exists
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-payout-locks') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ orderId: 'order-612-1', tenantId: 'tenant-612' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.handleEscrowReleased({
      orderId: 'order-612-1',
      escrowId: 'escrow-612-1',
      sellerAmountCents: 5000,
      sellerId: 'seller-612',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('alreadyProcessed', true);

    // No payout record storeDocument called
    const payoutWrite = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-payout-records',
    );
    expect(payoutWrite).toBeUndefined();

    // No PayoutCompleted emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('PayoutCompleted', expect.anything());
  });

  // T612-2: payoutVaultRef present; PII banking fields absent
  test('T612-2: payoutVaultRef present in payout record; bankAccountNumber/IBAN/routingNumber/sortCode absent', async () => {
    const result = await service.handleEscrowReleased({
      orderId: 'order-612-2',
      escrowId: 'escrow-612-2',
      sellerAmountCents: 3500,
      sellerId: 'seller-612',
    });

    expect(result.isSuccess).toBe(true);

    // Payout record stored
    const payoutWrite = storedDocs.find(({ index }) => index === 'xiigen-payout-records');
    expect(payoutWrite).toBeDefined();

    // payoutVaultRef present
    expect(payoutWrite!.doc).toHaveProperty('payoutVaultRef', 'vault-ref-abc123');

    // PII banking fields absent
    expect(payoutWrite!.doc).not.toHaveProperty('bankAccountNumber');
    expect(payoutWrite!.doc).not.toHaveProperty('IBAN');
    expect(payoutWrite!.doc).not.toHaveProperty('routingNumber');
    expect(payoutWrite!.doc).not.toHaveProperty('sortCode');
  });

  // T612-3: storeDocument(audit) before enqueue(PayoutCompleted) — DNA-8
  test('T612-3: storeDocument(xiigen-payout-audit) called before enqueue(PayoutCompleted) — DNA-8 order', async () => {
    const result = await service.handleEscrowReleased({
      orderId: 'order-612-3',
      escrowId: 'escrow-612-3',
      sellerAmountCents: 6000,
      sellerId: 'seller-612',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE PayoutCompleted enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-payout-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:PayoutCompleted');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T612-4: PayoutCompleted carries required fields
  test('T612-4: PayoutCompleted carries: orderId, sellerId, payoutVaultRef, amountCents, paidAt', async () => {
    const result = await service.handleEscrowReleased({
      orderId: 'order-612-4',
      escrowId: 'escrow-612-4',
      sellerAmountCents: 9500,
      sellerId: 'seller-612',
    });

    expect(result.isSuccess).toBe(true);

    const payoutCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'PayoutCompleted',
    );
    expect(payoutCall).toBeDefined();
    const payload = payoutCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('orderId', 'order-612-4');
    expect(payload).toHaveProperty('sellerId', 'seller-612');
    expect(payload).toHaveProperty('payoutVaultRef', 'vault-ref-abc123');
    expect(payload).toHaveProperty('amountCents', 9500);
    expect(payload).toHaveProperty('paidAt');
  });

  // T612-5: PII fields NOT in any storeDocument call
  test('T612-5: PII fields (bankAccountNumber, IBAN, sortCode, routingNumber) NOT in any storeDocument call', async () => {
    const result = await service.handleEscrowReleased({
      orderId: 'order-612-5',
      escrowId: 'escrow-612-5',
      sellerAmountCents: 4200,
      sellerId: 'seller-612',
      // simulate PII fields present in incoming event — must NOT be stored
      bankAccountNumber: 'GB29NWBK60161331926819',
      IBAN: 'DE89370400440532013000',
      sortCode: '60-16-13',
      routingNumber: '021000021',
    });

    expect(result.isSuccess).toBe(true);

    // Check ALL stored documents — none should contain PII banking fields
    for (const { doc } of storedDocs) {
      expect(doc).not.toHaveProperty('bankAccountNumber');
      expect(doc).not.toHaveProperty('IBAN');
      expect(doc).not.toHaveProperty('sortCode');
      expect(doc).not.toHaveProperty('routingNumber');
    }
  });
});
