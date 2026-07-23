/**
 * T625 ConsentGateEnforcer — Phase A tests
 * FLOW-20: Ads Platform
 *
 * Tests: T625-1 through T625-5
 *   T625-1: Consent record missing → ConsentGateFailed with CONSENT_MISSING
 *   T625-2: adsConsent=false → ConsentGateFailed with CONSENT_REVOKED
 *   T625-3: expiresAt < now → ConsentGateFailed with CONSENT_EXPIRED
 *   T625-4: Valid consent → AdDeliveryAuthorized emitted; consentGatePassed=true
 *   T625-5: ConsentGateFailed payload includes userId, reason, timestamp
 */

import 'reflect-metadata';
import { ConsentGateEnforcerService } from '../../../src/engine/flows/ads-platform/consent-gate-enforcer.service';

describe('T625 ConsentGateEnforcer', () => {
  let service: ConsentGateEnforcerService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: consent record exists with valid consent
    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-consent-records') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              userId: filter['userId'],
              adsConsent: true,
              expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24h from now
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    mockQueue.enqueue.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    service = new ConsentGateEnforcerService(
      mockDb as unknown as ConstructorParameters<typeof ConsentGateEnforcerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof ConsentGateEnforcerService>[1],
      mockCls as unknown as ConstructorParameters<typeof ConsentGateEnforcerService>[2],
    );
  });

  // T625-1: Consent record missing
  test('T625-1: Missing consent record → ConsentGateFailed with CONSENT_MISSING', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({ isSuccess: true, data: [] }),
    );

    const result = await service.enforceConsentGate({ userId: 'user-001' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_MISSING');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ConsentGateFailed',
      expect.objectContaining({
        userId: 'user-001',
        reason: 'CONSENT_MISSING',
      }),
    );
  });

  // T625-2: adsConsent=false (revoked)
  test('T625-2: adsConsent=false → ConsentGateFailed with CONSENT_REVOKED', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({
        isSuccess: true,
        data: [
          {
            userId: 'user-002',
            adsConsent: false,
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      }),
    );

    const result = await service.enforceConsentGate({ userId: 'user-002' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_REVOKED');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ConsentGateFailed',
      expect.objectContaining({
        userId: 'user-002',
        reason: 'CONSENT_REVOKED',
      }),
    );
  });

  // T625-3: Consent expired
  test('T625-3: expiresAt < now → ConsentGateFailed with CONSENT_EXPIRED', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({
        isSuccess: true,
        data: [
          {
            userId: 'user-003',
            adsConsent: true,
            expiresAt: new Date(Date.now() - 86400000).toISOString(), // 24h ago
          },
        ],
      }),
    );

    const result = await service.enforceConsentGate({ userId: 'user-003' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONSENT_EXPIRED');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ConsentGateFailed',
      expect.objectContaining({
        userId: 'user-003',
        reason: 'CONSENT_EXPIRED',
      }),
    );
  });

  // T625-4: Valid consent
  test('T625-4: Valid consent → AdDeliveryAuthorized emitted', async () => {
    const result = await service.enforceConsentGate({ userId: 'user-004' });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        userId: 'user-004',
        consentGatePassed: true,
      }),
    );
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'AdDeliveryAuthorized',
      expect.objectContaining({
        userId: 'user-004',
        consentLevel: 'ADS_ALLOWED',
      }),
    );
  });

  // T625-5: ConsentGateFailed payload
  test('T625-5: ConsentGateFailed payload includes userId, reason, timestamp', async () => {
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({ isSuccess: true, data: [] }),
    );

    await service.enforceConsentGate({ userId: 'user-005' });

    const enqueueCall = mockQueue.enqueue.mock.calls[0];
    expect(enqueueCall[0]).toBe('ConsentGateFailed');
    expect(enqueueCall[1]).toHaveProperty('userId', 'user-005');
    expect(enqueueCall[1]).toHaveProperty('reason');
    expect(enqueueCall[1]).toHaveProperty('timestamp');
  });
});
