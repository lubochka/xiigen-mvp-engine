/**
 * T610 MarketplacePaymentSplitter — Phase B tests
 * FLOW-16: Marketplace Payments
 *
 * Tests: T610-1 through T610-6
 *   T610-1: SETNX duplicate → returns immediately; no payment capture
 *   T610-2: platformFeeBps from FREEDOM config — not hardcoded
 *   T610-3: storeDocument(audit) before enqueue(MarketplaceOrderConfirmed) — DNA-8
 *   T610-4: PII fields (card.number, card.cvv, bankAccountNumber) NOT in any storeDocument call
 *   T610-5: MarketplaceOrderConfirmed carries: tenantId, cartId, totalAmountCents, platformFeeCents, sellerAmountCents, escrowId
 *   T610-6: nonRepudiationAudit write includes prevHash (hash chain)
 */

import 'reflect-metadata';
import { MarketplacePaymentSplitterService } from '../../../src/engine/flows/marketplace-payments/marketplace-payment-splitter.service';

describe('T610 MarketplacePaymentSplitter', () => {
  let service: MarketplacePaymentSplitterService;

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
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-610' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    storedDocs.length = 0;

    // Default: no existing payment lock, no FREEDOM platformFeeBps, no prevHash
    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });

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

    service = new MarketplacePaymentSplitterService(
      mockDb as unknown as ConstructorParameters<typeof MarketplacePaymentSplitterService>[0],
      mockQueue as unknown as ConstructorParameters<typeof MarketplacePaymentSplitterService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof MarketplacePaymentSplitterService>[2],
    );
  });

  // T610-1: SETNX duplicate → returns immediately; no payment capture
  test('T610-1: SETNX duplicate → returns immediately; no payment capture storeDocument', async () => {
    // SETNX lock already exists
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ setnxKey: 'existing-payment-lock' }],
    });

    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-1',
      totalAmountCents: 5000,
      itemIds: ['item-1'],
      sellerId: 'seller-1',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('alreadyProcessed', true);

    // No payment capture storeDocument
    const captureWrite = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-payment-captures',
    );
    expect(captureWrite).toBeUndefined();

    // No MarketplaceOrderConfirmed emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith(
      'MarketplaceOrderConfirmed',
      expect.anything(),
    );
  });

  // T610-2: platformFeeBps from FREEDOM config — not hardcoded
  test('T610-2: platformFeeBps loaded from FREEDOM config — fee calculated correctly', async () => {
    // FREEDOM config returns custom fee
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-freedom-config' && filter['key'] === 'platformFeeBps') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ key: 'platformFeeBps', value: 300 }], // 3%
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-2',
      totalAmountCents: 10000,
      itemIds: ['item-2'],
      sellerId: 'seller-2',
    });

    expect(result.isSuccess).toBe(true);

    // Verify FREEDOM config was queried for platformFeeBps
    expect(mockDb.searchDocuments).toHaveBeenCalledWith(
      'xiigen-freedom-config',
      expect.objectContaining({ key: 'platformFeeBps' }),
    );

    // Verify fee split: 10000 * 300 / 10000 = 300 platform fee; 9700 seller
    const confirmedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'MarketplaceOrderConfirmed',
    );
    expect(confirmedCall).toBeDefined();
    const payload = confirmedCall![1] as Record<string, unknown>;
    expect(payload['platformFeeCents']).toBe(300);
    expect(payload['sellerAmountCents']).toBe(9700);
  });

  // T610-3: storeDocument(audit) before enqueue(MarketplaceOrderConfirmed) — DNA-8
  test('T610-3: storeDocument(xiigen-payment-audit) called before enqueue(MarketplaceOrderConfirmed) — DNA-8', async () => {
    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-3',
      totalAmountCents: 2000,
      itemIds: ['item-3'],
      sellerId: 'seller-3',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE MarketplaceOrderConfirmed enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-payment-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:MarketplaceOrderConfirmed');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T610-4: PII fields NOT in any storeDocument call
  test('T610-4: PII fields (card.number, card.cvv, bankAccountNumber) NOT in any storeDocument call', async () => {
    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-4',
      totalAmountCents: 3000,
      itemIds: ['item-4'],
      sellerId: 'seller-4',
      // simulate PII fields present in incoming event — must NOT be stored
      cardNumber: '4111111111111111',
      cardCvv: '123',
      bankAccountNumber: 'GB29NWBK60161331926819',
    });

    expect(result.isSuccess).toBe(true);

    // Check ALL stored documents — none should contain PII fields
    for (const { doc } of storedDocs) {
      expect(doc).not.toHaveProperty('cardNumber');
      expect(doc).not.toHaveProperty('card.number');
      expect(doc).not.toHaveProperty('cardCvv');
      expect(doc).not.toHaveProperty('card.cvv');
      expect(doc).not.toHaveProperty('bankAccountNumber');
    }
  });

  // T610-5: MarketplaceOrderConfirmed carries required fields
  test('T610-5: MarketplaceOrderConfirmed carries: tenantId, cartId, totalAmountCents, platformFeeCents, sellerAmountCents, escrowId', async () => {
    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-5',
      totalAmountCents: 8000,
      itemIds: ['item-5'],
      sellerId: 'seller-5',
    });

    expect(result.isSuccess).toBe(true);

    const confirmedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'MarketplaceOrderConfirmed',
    );
    expect(confirmedCall).toBeDefined();
    const payload = confirmedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId', 'tenant-610');
    expect(payload).toHaveProperty('cartId', 'cart-610-5');
    expect(payload).toHaveProperty('totalAmountCents', 8000);
    expect(payload).toHaveProperty('platformFeeCents');
    expect(payload).toHaveProperty('sellerAmountCents');
    expect(payload).toHaveProperty('escrowId');

    // Fee arithmetic: platformFeeCents + sellerAmountCents === totalAmountCents
    const platformFee = payload['platformFeeCents'] as number;
    const sellerAmount = payload['sellerAmountCents'] as number;
    expect(platformFee + sellerAmount).toBe(8000);
  });

  // T610-6: nonRepudiationAudit write includes prevHash (hash chain)
  test('T610-6: nonRepudiationAudit write includes prevHash field (hash chain)', async () => {
    const result = await service.handleCheckoutReserved({
      cartId: 'cart-610-6',
      totalAmountCents: 1500,
      itemIds: ['item-6'],
      sellerId: 'seller-6',
    });

    expect(result.isSuccess).toBe(true);

    // Find nonRepudiationAudit storeDocument call
    const nraWrite = storedDocs.find(({ index }) => index === 'xiigen-non-repudiation-audit');
    expect(nraWrite).toBeDefined();
    expect(nraWrite!.doc).toHaveProperty('prevHash');
    expect(nraWrite!.doc).toHaveProperty('recordHash');
    // prevHash should be 64-char hex (SHA-256) or zeros for first record
    const prevHash = nraWrite!.doc['prevHash'] as string;
    expect(typeof prevHash).toBe('string');
    expect(prevHash.length).toBe(64);
  });
});
