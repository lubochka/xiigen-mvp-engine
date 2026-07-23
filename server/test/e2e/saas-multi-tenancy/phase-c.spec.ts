/**
 * T607 TenantQuotaMaterializer — Phase C tests
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Tests: T607-1 through T607-5
 *   T607-1: Redis MULTI/EXEC used for quota counters — batch mode
 *   T607-2: Non-quota TenantConfigurationUpdated → returns immediately; no Redis write
 *   T607-3: EXEC failure → TenantQuotaMaterializationFailed emitted
 *   T607-4: Quota values loaded from tier definitions — not hardcoded
 *   T607-5: TenantQuotaMaterialized carries required fields
 */

import 'reflect-metadata';
import { TenantQuotaMaterializerService } from '../../../src/engine/flows/saas-multi-tenancy/tenant-quota-materializer.service';

describe('T607 TenantQuotaMaterializer', () => {
  let service: TenantQuotaMaterializerService;

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-607' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: tier definitions search returns a valid tier
    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [
        {
          tierId: 'pro',
          quotas: [
            { type: 'api_calls', limit: 10000 },
            { type: 'storage_gb', limit: 50 },
            { type: 'seats', limit: 25 },
          ],
        },
      ],
    });

    // Default: storeDocument (MULTI/EXEC batch) succeeds
    mockDb.storeDocument.mockResolvedValue({ isSuccess: true });
    mockQueue.enqueue.mockResolvedValue({ isSuccess: true });

    service = new TenantQuotaMaterializerService(
      mockDb as unknown as ConstructorParameters<typeof TenantQuotaMaterializerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TenantQuotaMaterializerService>[1],
      mockTenantContext as unknown as ConstructorParameters<
        typeof TenantQuotaMaterializerService
      >[2],
    );
  });

  // T607-1: Redis MULTI/EXEC used — batch mode with all quota types
  test('T607-1: Redis MULTI/EXEC used for quota counters — batch mode', async () => {
    const result = await service.materializeQuotas({
      subscriptionTier: 'pro',
      tenantId: 'tenant-607',
    });

    expect(result.isSuccess).toBe(true);

    // Verify storeDocument called with batchMode: 'MULTI_EXEC'
    const batchCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-quota-counters',
    );
    expect(batchCall).toBeDefined();
    const batchDoc = batchCall![1] as Record<string, unknown>;
    expect(batchDoc['batchMode']).toBe('MULTI_EXEC');
    // Verify all 3 quota types in a single batch
    const commands = batchDoc['commands'] as Record<string, unknown>[];
    expect(commands.length).toBe(3);
    expect(commands.map((c) => c['key'])).toEqual([
      'quota:tenant-607:api_calls',
      'quota:tenant-607:storage_gb',
      'quota:tenant-607:seats',
    ]);
  });

  // T607-2: Non-quota key → returns immediately; no Redis write
  test('T607-2: TenantConfigurationUpdated with non-quota key → returns immediately; no Redis write', async () => {
    const result = await service.handleConfigUpdate({
      key: 'feature_dark_mode',
      value: true,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('filtered', true);
    expect(result.data).toHaveProperty('reason', 'non_quota_key');

    // No Redis write — storeDocument not called for quota counters
    const quotaWrites = mockDb.storeDocument.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-quota-counters',
    );
    expect(quotaWrites.length).toBe(0);

    // No tier definitions lookup
    expect(mockDb.searchDocuments).not.toHaveBeenCalled();
  });

  // T607-3: EXEC failure → TenantQuotaMaterializationFailed emitted
  test('T607-3: EXEC failure → TenantQuotaMaterializationFailed emitted; no partial counters', async () => {
    // Make MULTI/EXEC batch fail
    mockDb.storeDocument.mockResolvedValue({
      isSuccess: false,
      errorMessage: 'EXEC failed: connection reset',
    });

    const result = await service.materializeQuotas({
      subscriptionTier: 'pro',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EXEC_FAILED');

    // TenantQuotaMaterializationFailed emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'TenantQuotaMaterializationFailed',
      expect.objectContaining({
        tenantId: 'tenant-607',
        subscriptionTier: 'pro',
        reason: 'EXEC_FAILED',
      }),
    );

    // No TenantQuotaMaterialized emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith(
      'TenantQuotaMaterialized',
      expect.anything(),
    );
  });

  // T607-4: Quota values from tier definitions — not hardcoded
  test('T607-4: Quota values loaded from tier definitions (not hardcoded)', async () => {
    // Custom tier definition with different values
    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [
        {
          tierId: 'starter',
          quotas: [
            { type: 'api_calls', limit: 1000 },
            { type: 'storage_gb', limit: 5 },
          ],
        },
      ],
    });

    const result = await service.materializeQuotas({
      subscriptionTier: 'starter',
    });

    expect(result.isSuccess).toBe(true);

    // Verify tier definitions were loaded from DB — not hardcoded
    expect(mockDb.searchDocuments).toHaveBeenCalledWith(
      'xiigen-tier-definitions',
      expect.objectContaining({ tierId: 'starter' }),
    );

    // Verify the loaded values were used
    const batchCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-quota-counters',
    );
    const commands = (batchCall![1] as Record<string, unknown>)['commands'] as Record<
      string,
      unknown
    >[];
    expect(commands.length).toBe(2);
    expect(commands[0]['value']).toBe('1000');
    expect(commands[1]['value']).toBe('5');
  });

  // T607-5: TenantQuotaMaterialized carries required fields
  test('T607-5: TenantQuotaMaterialized carries: tenantId, subscriptionTier, quotaTypesSet, materializedAt', async () => {
    const result = await service.materializeQuotas({
      subscriptionTier: 'pro',
    });

    expect(result.isSuccess).toBe(true);

    const materializedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'TenantQuotaMaterialized',
    );
    expect(materializedCall).toBeDefined();
    const payload = materializedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId', 'tenant-607');
    expect(payload).toHaveProperty('subscriptionTier', 'pro');
    expect(payload).toHaveProperty('quotaTypesSet', 3);
    expect(payload).toHaveProperty('materializedAt');
  });

  // T607-6: Tier change flushes old quota counters before MULTI/EXEC
  test('T607-6: handleConfigUpdate with quota_* key flushes old counters before re-materialization', async () => {
    const result = await service.handleConfigUpdate({
      key: 'quota_api_calls',
      subscriptionTier: 'starter',
    });

    expect(result.isSuccess).toBe(true);

    // Verify flush call happened — storeDocument with DEL_PREFIX batchMode
    const flushCall = mockDb.storeDocument.mock.calls.find((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return c[0] === 'xiigen-quota-counters' && doc['batchMode'] === 'DEL_PREFIX';
    });
    expect(flushCall).toBeDefined();
    expect((flushCall![1] as Record<string, unknown>)['prefix']).toMatch(/^quota:tenant-607:/);

    // Verify re-materialization also happened (MULTI_EXEC batch after flush)
    const materializeCall = mockDb.storeDocument.mock.calls.find((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return c[0] === 'xiigen-quota-counters' && doc['batchMode'] === 'MULTI_EXEC';
    });
    expect(materializeCall).toBeDefined();
  });
});
