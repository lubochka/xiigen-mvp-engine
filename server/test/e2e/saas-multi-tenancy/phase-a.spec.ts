/**
 * T605 TenantProvisioningOrchestrator — Phase A tests
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Tests: T605-1 through T605-5
 *   T605-1: SETNX duplicate → returns immediately; no storeDocument for tenant
 *   T605-2: bulkSeedFreedomConfig includes all MACHINE keys
 *   T605-3: storeDocument(audit) called before enqueue(TenantProvisioned) — DNA-8
 *   T605-4: step 3 (bulkSeed) fails → TenantProvisioningFailed with stepFailed:'3'
 *   T605-5: TenantProvisioned payload carries required fields
 */

import 'reflect-metadata';
import { MASTER_TENANT_ID } from '../../../src/bootstrap/bootstrap-seeder.service';
import { TenantProvisioningOrchestratorService } from '../../../src/engine/flows/saas-multi-tenancy/tenant-provisioning-orchestrator.service';

describe('T605 TenantProvisioningOrchestrator', () => {
  let service: TenantProvisioningOrchestratorService;

  // Track call order for DNA-8 verification
  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockTenantContext = {
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'test-tenant' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: SETNX returns no existing lock; tier-definitions returns valid tier
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-tier-definitions') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ tierId: 'pro', quotas: [{ type: 'api_calls', limit: 10000 }] }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });
    // Default: all storeDocument calls succeed
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );
    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new TenantProvisioningOrchestratorService(
      mockDb as unknown as Parameters<
        (typeof TenantProvisioningOrchestratorService)['prototype']['provisionTenant']
      > extends never[]
        ? never
        : ConstructorParameters<typeof TenantProvisioningOrchestratorService>[0],
      mockQueue as unknown as ConstructorParameters<
        typeof TenantProvisioningOrchestratorService
      >[1],
      mockTenantContext as unknown as ConstructorParameters<
        typeof TenantProvisioningOrchestratorService
      >[2],
    );
  });

  // T605-1: SETNX returns false (duplicate) → returns immediately; no tenant storeDocument
  test('T605-1: SETNX duplicate → returns immediately; no tenant storeDocument called', async () => {
    // SETNX lock already exists
    mockDb.searchDocuments.mockResolvedValueOnce({
      isSuccess: true,
      data: [{ setnxKey: 'existing-lock' }],
    });

    const result = await service.provisionTenant({
      operatorId: 'op-1',
      tenantSlug: 'acme-corp',
      subscriptionTier: 'pro',
      billingContact: 'billing@acme.com',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('alreadyProvisioning', true);
    // No tenant record created — storeDocument for xiigen-tenants never called
    const tenantStoreCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-tenants',
    );
    expect(tenantStoreCall).toBeUndefined();
    // No TenantProvisioned emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('TenantProvisioned', expect.anything());
  });

  // T605-2: bulkSeedFreedomConfig includes all MACHINE keys
  test('T605-2: bulkSeedFreedomConfig includes all MACHINE keys: tenantId, masterTenantId, provisionedAt, subscriptionTier', async () => {
    const result = await service.provisionTenant({
      operatorId: 'op-2',
      tenantSlug: 'beta-inc',
      subscriptionTier: 'enterprise',
      billingContact: 'billing@beta.com',
    });

    expect(result.isSuccess).toBe(true);

    // Check that FREEDOM config was seeded with all 4 machine keys
    const freedomCalls = mockDb.storeDocument.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-freedom-config',
    );
    expect(freedomCalls.length).toBe(4);
    const seededKeys = freedomCalls.map((c: unknown[]) => (c[1] as Record<string, unknown>)['key']);
    expect(seededKeys).toContain('tenantId');
    expect(seededKeys).toContain('masterTenantId');
    expect(seededKeys).toContain('provisionedAt');
    expect(seededKeys).toContain('subscriptionTier');
  });

  // T605-3: storeDocument(audit) called before enqueue(TenantProvisioned) — DNA-8
  test('T605-3: storeDocument(audit) called before enqueue(TenantProvisioned) — DNA-8 order verified', async () => {
    const result = await service.provisionTenant({
      operatorId: 'op-3',
      tenantSlug: 'gamma-llc',
      subscriptionTier: 'pro',
      billingContact: 'billing@gamma.com',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE TenantProvisioned enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-provision-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:TenantProvisioned');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T605-4: step 3 (bulkSeed) throws → TenantProvisioningFailed with stepFailed:'3'
  test('T605-4: step 3 (bulkSeed) fails → TenantProvisioningFailed emitted with stepFailed:3; no TenantProvisioned', async () => {
    // Make FREEDOM config storeDocument fail on second call (first call is the lock)
    let freedomCallCount = 0;
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        if (index === 'xiigen-freedom-config') {
          freedomCallCount++;
          if (freedomCallCount === 1) {
            return Promise.resolve({ isSuccess: false, errorMessage: 'seed_failed' });
          }
        }
        return Promise.resolve({ isSuccess: true });
      },
    );

    const result = await service.provisionTenant({
      operatorId: 'op-4',
      tenantSlug: 'delta-co',
      subscriptionTier: 'starter',
      billingContact: 'billing@delta.com',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROVISION_STEP_3_FAILED');

    // TenantProvisioningFailed emitted with stepFailed:'3'
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'TenantProvisioningFailed',
      expect.objectContaining({
        stepFailed: '3',
        operatorId: 'op-4',
        tenantSlug: 'delta-co',
      }),
    );

    // No TenantProvisioned emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith('TenantProvisioned', expect.anything());
  });

  // T605-5: TenantProvisioned carries required fields
  test('T605-5: TenantProvisioned carries: tenantId, tenantSlug, subscriptionTier, provisionedAt, masterTenantId', async () => {
    const result = await service.provisionTenant({
      operatorId: 'op-5',
      tenantSlug: 'epsilon-org',
      subscriptionTier: 'pro',
      billingContact: 'billing@epsilon.org',
    });

    expect(result.isSuccess).toBe(true);

    const provisionedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'TenantProvisioned',
    );
    expect(provisionedCall).toBeDefined();
    const payload = provisionedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId');
    expect(payload).toHaveProperty('tenantSlug', 'epsilon-org');
    expect(payload).toHaveProperty('subscriptionTier', 'pro');
    expect(payload).toHaveProperty('provisionedAt');
    expect(payload).toHaveProperty('masterTenantId');
    expect(payload['masterTenantId']).toBe(MASTER_TENANT_ID);
  });

  test('T605-7: masterTenantId can come from tier definition config with canonical default fallback', async () => {
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-tier-definitions') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              tierId: 'enterprise',
              masterTenantId: 'xiigen-master-configured-tenant',
              quotas: [{ type: 'api_calls', limit: 10000 }],
            },
          ],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.provisionTenant({
      operatorId: 'op-7',
      tenantSlug: 'configured-master',
      subscriptionTier: 'enterprise',
      billingContact: 'billing@configured.example',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['masterTenantId']).toBe('xiigen-master-configured-tenant');
    const freedomMasterCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) =>
        c[0] === 'xiigen-freedom-config' &&
        (c[1] as Record<string, unknown>)['key'] === 'masterTenantId',
    );
    expect((freedomMasterCall?.[1] as Record<string, unknown>)['value']).toBe(
      'xiigen-master-configured-tenant',
    );
  });

  // T605-6: Invalid subscriptionTier → UNKNOWN_TIER failure (H-2)
  test('T605-6: Invalid subscriptionTier not in tier-definitions → UNKNOWN_TIER failure', async () => {
    // Override searchDocuments to return empty for tier-definitions (invalid tier)
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-tier-definitions') {
        return Promise.resolve({ isSuccess: true, data: [] }); // Tier not found
      }
      return Promise.resolve({ isSuccess: true, data: [] }); // No SETNX lock
    });

    const result = await service.provisionTenant({
      operatorId: 'op-6',
      tenantSlug: 'invalid-tier-corp',
      subscriptionTier: 'nonexistent-tier',
      billingContact: 'billing@invalid.com',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNKNOWN_TIER');

    // No tenant record created
    const tenantStoreCall = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-tenants',
    );
    // Only the lock store should happen, not the tenant record
    expect(tenantStoreCall).toBeUndefined();
  });
});
