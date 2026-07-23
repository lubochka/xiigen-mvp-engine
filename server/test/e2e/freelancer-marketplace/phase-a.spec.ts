/**
 * T613 GigAcceptanceLockGateway — Phase A tests
 * FLOW-17: Freelancer Marketplace
 *
 * Tests: T613-1 through T613-5
 *   T613-1: BOLA violation → GigAcceptanceFailed with BOLA_VIOLATION; no lock acquired
 *   T613-2: SETNX duplicate (lock exists) → returns immediately; no GigAccepted emitted
 *   T613-3: OCC bid not OPEN → GigAcceptanceFailed with BID_NOT_OPEN; no GigAccepted
 *   T613-4: storeDocument(audit) called before enqueue(GigAccepted) — DNA-8
 *   T613-5: GigAccepted payload carries required fields
 */

import 'reflect-metadata';
import { GigAcceptanceLockGatewayService } from '../../../src/engine/flows/freelancer-marketplace/gig-acceptance-lock-gateway.service';

describe('T613 GigAcceptanceLockGateway', () => {
  let service: GigAcceptanceLockGatewayService;

  // Track call order for DNA-8 verification
  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-client-001' }),
    getCurrentTenantId: jest.fn().mockReturnValue({
      isSuccess: true,
      data: 'tenant-client-001',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: gig posting exists and belongs to the current tenant
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-gig-postings') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ gigId: filter['gigId'], clientTenantId: 'tenant-client-001', status: 'OPEN' }],
        });
      }
      if (index === 'xiigen-gig-accept-locks') {
        return Promise.resolve({ isSuccess: true, data: [] }); // no lock by default
      }
      if (index === 'xiigen-bids') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ bidId: filter['bidId'], status: 'OPEN', freelancerId: 'fl-001' }],
        });
      }
      if (index === 'xiigen-freedom-config') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ key: 'gig_acceptance_lock_ttl_ms', value: 300000 }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    // Default: all storeDocument calls succeed, tracking order
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Default: storeDocumentWithOCC calls succeed (for gig status update)
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

    service = new GigAcceptanceLockGatewayService(
      mockDb as unknown as ConstructorParameters<typeof GigAcceptanceLockGatewayService>[0],
      mockQueue as unknown as ConstructorParameters<typeof GigAcceptanceLockGatewayService>[1],
      mockCls as unknown as ConstructorParameters<typeof GigAcceptanceLockGatewayService>[2],
    );
  });

  // T613-1: BOLA violation — different client tenant → GigAcceptanceFailed
  test('T613-1: BOLA violation → GigAcceptanceFailed emitted; no lock acquired', async () => {
    // Gig posting belongs to a different tenant
    mockDb.searchDocuments.mockImplementationOnce(
      (_index: string, _filter: Record<string, unknown>) =>
        Promise.resolve({
          isSuccess: true,
          data: [{ gigId: 'gig-001', clientTenantId: 'tenant-other-999', status: 'OPEN' }],
        }),
    );

    const result = await service.acceptGig({
      gigId: 'gig-001',
      bidId: 'bid-001',
      freelancerId: 'fl-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOLA_VIOLATION');

    // GigAcceptanceFailed emitted with BOLA_VIOLATION
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'GigAcceptanceFailed',
      expect.objectContaining({
        reason: 'BOLA_VIOLATION',
        gigId: 'gig-001',
      }),
    );

    // No lock acquired — no storeDocument to gig-accept-locks
    const lockStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-gig-accept-locks',
    );
    expect(lockStore).toBeUndefined();

    // No GigAccepted emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('GigAccepted', expect.anything());
  });

  // T613-2: SETNX — lock already exists → returns immediately; no GigAccepted
  test('T613-2: SETNX duplicate lock exists → returns alreadyAccepted:true; no GigAccepted emitted', async () => {
    mockDb.searchDocuments.mockImplementation((index: string, _filter: Record<string, unknown>) => {
      if (index === 'xiigen-gig-postings') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ gigId: 'gig-002', clientTenantId: 'tenant-client-001', status: 'OPEN' }],
        });
      }
      if (index === 'xiigen-gig-accept-locks') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ lockKey: 'gig-accept-lock:gig-002' }], // lock exists
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.acceptGig({
      gigId: 'gig-002',
      bidId: 'bid-002',
      freelancerId: 'fl-002',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('alreadyAccepted', true);

    // No GigAccepted emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('GigAccepted', expect.anything());
  });

  // T613-3: OCC bid not OPEN → GigAcceptanceFailed with BID_NOT_OPEN
  test('T613-3: OCC bid status not OPEN → GigAcceptanceFailed with BID_NOT_OPEN; no GigAccepted', async () => {
    mockDb.searchDocuments.mockImplementation((index: string, _filter: Record<string, unknown>) => {
      if (index === 'xiigen-gig-postings') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ gigId: 'gig-003', clientTenantId: 'tenant-client-001', status: 'OPEN' }],
        });
      }
      if (index === 'xiigen-gig-accept-locks') {
        return Promise.resolve({ isSuccess: true, data: [] }); // no lock
      }
      if (index === 'xiigen-bids') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ bidId: 'bid-003', status: 'WITHDRAWN' }], // bid withdrawn
        });
      }
      if (index === 'xiigen-freedom-config') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ key: 'gig_acceptance_lock_ttl_ms', value: 300000 }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.acceptGig({
      gigId: 'gig-003',
      bidId: 'bid-003',
      freelancerId: 'fl-other', // must be different from tenantId to pass self-acceptance guard
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BID_NOT_OPEN');

    // GigAcceptanceFailed emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'GigAcceptanceFailed',
      expect.objectContaining({
        reason: 'BID_NOT_OPEN',
        bidId: 'bid-003',
      }),
    );

    // No GigAccepted emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('GigAccepted', expect.anything());
  });

  // T613-4: storeDocument(audit) called before enqueue(GigAccepted) — DNA-8
  test('T613-4: storeDocument(audit) called before enqueue(GigAccepted) — DNA-8 order verified', async () => {
    const result = await service.acceptGig({
      gigId: 'gig-004',
      bidId: 'bid-004',
      freelancerId: 'fl-004',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE GigAccepted enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-gig-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:GigAccepted');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T613-5: GigAccepted payload carries required fields
  test('T613-5: GigAccepted payload carries: gigId, bidId, freelancerId, clientTenantId, acceptedAt', async () => {
    const result = await service.acceptGig({
      gigId: 'gig-005',
      bidId: 'bid-005',
      freelancerId: 'fl-005',
    });

    expect(result.isSuccess).toBe(true);

    const acceptedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'GigAccepted',
    );
    expect(acceptedCall).toBeDefined();
    const payload = acceptedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('gigId', 'gig-005');
    expect(payload).toHaveProperty('bidId', 'bid-005');
    expect(payload).toHaveProperty('freelancerId', 'fl-005');
    expect(payload).toHaveProperty('clientTenantId', 'tenant-client-001');
    expect(payload).toHaveProperty('acceptedAt');
  });
});
