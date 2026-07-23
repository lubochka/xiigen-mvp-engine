/**
 * T609 MarketplaceCheckoutGateway — Phase A tests
 * FLOW-16: Marketplace Payments
 *
 * Tests: T609-1 through T609-5
 *   T609-1: BOLA failure (cart.buyerTenantId !== ALS tenantId) → CheckoutRejected; no lock acquired
 *   T609-2: SETNX=false (cart already locked) → CheckoutRejected{reason:CART_LOCKED}; no inventory read
 *   T609-3: storeDocument(audit) called before enqueue(CheckoutReserved) — DNA-8 order
 *   T609-4: OCC inventory conflict → CheckoutRejected{reason:INVENTORY_CONFLICT}
 *   T609-5: CheckoutReserved carries: tenantId, cartId, itemIds, reservedAt
 */

import 'reflect-metadata';
import { MarketplaceCheckoutGatewayService } from '../../../src/engine/flows/marketplace-payments/marketplace-checkout-gateway.service';

describe('T609 MarketplaceCheckoutGateway', () => {
  let service: MarketplaceCheckoutGatewayService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-609' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: no cart lock, no freedom config (use default TTL)
    mockDb.searchDocuments.mockResolvedValue({ isSuccess: true, data: [] });

    // Default: all storeDocument calls succeed
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Default: storeDocumentWithOCC calls succeed (for inventory reservation)
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        return Promise.resolve({ isSuccess: true, data: { seqNo: 1, primaryTerm: 1 } });
      },
    );

    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new MarketplaceCheckoutGatewayService(
      mockDb as unknown as ConstructorParameters<typeof MarketplaceCheckoutGatewayService>[0],
      mockQueue as unknown as ConstructorParameters<typeof MarketplaceCheckoutGatewayService>[1],
      mockTenantContext as unknown as ConstructorParameters<typeof MarketplaceCheckoutGatewayService>[2],
    );
  });

  // T609-1: BOLA failure → CheckoutRejected; no lock acquired
  test('T609-1: BOLA failure (buyerTenantId !== ALS tenantId) → CheckoutRejected emitted; no lock storeDocument', async () => {
    const result = await service.handleCheckoutRequested({
      cartId: 'cart-001',
      buyerTenantId: 'attacker-tenant-id',
      itemIds: ['item-1', 'item-2'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOLA_VIOLATION');

    // CheckoutRejected emitted with BOLA_VIOLATION
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'CheckoutRejected',
      expect.objectContaining({
        tenantId: 'tenant-609',
        cartId: 'cart-001',
        reason: 'BOLA_VIOLATION',
      }),
    );

    // No lock acquired — no storeDocument for cart lock index
    const lockWrite = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-cart-locks',
    );
    expect(lockWrite).toBeUndefined();

    // No inventory access
    expect(mockDb.searchDocuments).not.toHaveBeenCalledWith('xiigen-inventory', expect.anything());
  });

  // T609-2: SETNX=false (cart already locked) → CheckoutRejected{reason:CART_LOCKED}; no inventory read
  test('T609-2: SETNX=false (cart already locked) → CheckoutRejected{reason:CART_LOCKED}; no inventory read', async () => {
    // First searchDocuments returns existing lock
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-cart-locks') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ cartId: 'cart-002', tenantId: 'tenant-609' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.handleCheckoutRequested({
      cartId: 'cart-002',
      buyerTenantId: 'tenant-609',
      itemIds: ['item-3'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CART_LOCKED');

    // CheckoutRejected emitted with CART_LOCKED
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'CheckoutRejected',
      expect.objectContaining({
        reason: 'CART_LOCKED',
        cartId: 'cart-002',
      }),
    );

    // No inventory read — searchDocuments for inventory never called
    const inventoryRead = mockDb.searchDocuments.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-inventory',
    );
    expect(inventoryRead).toBeUndefined();
  });

  // T609-3: storeDocument(audit) called before enqueue(CheckoutReserved) — DNA-8
  test('T609-3: storeDocument(xiigen-checkout-audit) called before enqueue(CheckoutReserved) — DNA-8 order', async () => {
    const result = await service.handleCheckoutRequested({
      cartId: 'cart-003',
      buyerTenantId: 'tenant-609',
      itemIds: ['item-4', 'item-5'],
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE CheckoutReserved enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-checkout-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:CheckoutReserved');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T609-4: OCC inventory conflict → CheckoutRejected{reason:INVENTORY_CONFLICT}
  test('T609-4: OCC inventory conflict → CheckoutRejected{reason:INVENTORY_CONFLICT}', async () => {
    // storeDocumentWithOCC returns OCC_CONFLICT for inventory reservation
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        if (index === 'xiigen-inventory') {
          return Promise.resolve({
            isSuccess: false,
            errorCode: 'OCC_CONFLICT',
            errorMessage: 'Version conflict on inventory',
          });
        }
        return Promise.resolve({ isSuccess: true, data: { seqNo: 1, primaryTerm: 1 } });
      },
    );

    const result = await service.handleCheckoutRequested({
      cartId: 'cart-004',
      buyerTenantId: 'tenant-609',
      itemIds: ['item-6'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVENTORY_CONFLICT');

    // CheckoutRejected emitted with INVENTORY_CONFLICT
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'CheckoutRejected',
      expect.objectContaining({
        reason: 'INVENTORY_CONFLICT',
        cartId: 'cart-004',
      }),
    );
  });

  // T609-5: CheckoutReserved carries: tenantId, cartId, itemIds, reservedAt
  test('T609-5: CheckoutReserved carries: tenantId, cartId, itemIds, reservedAt', async () => {
    const result = await service.handleCheckoutRequested({
      cartId: 'cart-005',
      buyerTenantId: 'tenant-609',
      itemIds: ['item-7', 'item-8'],
    });

    expect(result.isSuccess).toBe(true);

    const reservedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'CheckoutReserved',
    );
    expect(reservedCall).toBeDefined();
    const payload = reservedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId', 'tenant-609');
    expect(payload).toHaveProperty('cartId', 'cart-005');
    expect(payload).toHaveProperty('itemIds');
    expect(payload).toHaveProperty('reservedAt');
    expect(Array.isArray(payload['itemIds'])).toBe(true);
    expect((payload['itemIds'] as string[]).length).toBe(2);
  });
});
