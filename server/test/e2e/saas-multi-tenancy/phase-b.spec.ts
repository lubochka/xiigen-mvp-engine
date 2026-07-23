/**
 * T606 TenantConfigurationManager — Phase B tests
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Tests: T606-1 through T606-5
 *   T606-1: MACHINE_LOCKED_KEYS key → ConfigKeyImmutable; no storage access
 *   T606-2: storeDocumentWithOCC used — not plain storeDocument
 *   T606-3: storeDocument(audit) called before enqueue(TenantConfigurationUpdated) — DNA-8
 *   T606-4: OCC conflict → ConfigUpdateConflict emitted
 *   T606-5: TenantConfigurationUpdated carries tenantId, key, value, updatedAt
 */

import 'reflect-metadata';
import { TenantConfigurationManagerService } from '../../../src/engine/flows/saas-multi-tenancy/tenant-configuration-manager.service';

describe('T606 TenantConfigurationManager', () => {
  let service: TenantConfigurationManagerService;

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
    getCurrentTenantId: jest.fn().mockReturnValue({ isSuccess: true, data: 'tenant-606' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: OCC read returns existing record
    mockDb.searchDocuments.mockResolvedValue({
      isSuccess: true,
      data: [{ tenantId: 'tenant-606', key: 'feature_dark_mode', value: true, _version: 'v1' }],
    });

    // Default: all storeDocument calls succeed
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Default: storeDocumentWithOCC calls succeed
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        return Promise.resolve({ isSuccess: true, data: { seqNo: 1, primaryTerm: 1 } });
      },
    );

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new TenantConfigurationManagerService(
      mockDb as unknown as ConstructorParameters<typeof TenantConfigurationManagerService>[0],
      mockQueue as unknown as ConstructorParameters<typeof TenantConfigurationManagerService>[1],
      mockTenantContext as unknown as ConstructorParameters<
        typeof TenantConfigurationManagerService
      >[2],
    );
  });

  // T606-1: MACHINE_LOCKED_KEYS key request → ConfigKeyImmutable emitted; no storage access
  test('T606-1: MACHINE_LOCKED_KEYS key (tenantId) → ConfigKeyImmutable emitted; no storage access', async () => {
    const result = await service.updateConfigKey({
      key: 'tenantId',
      value: 'attacker-tenant-id',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONFIG_KEY_IMMUTABLE');

    // ConfigKeyImmutable emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ConfigKeyImmutable',
      expect.objectContaining({
        tenantId: 'tenant-606',
        key: 'tenantId',
        reason: 'MACHINE_LOCKED',
      }),
    );

    // No storage access — no searchDocuments, no storeDocument for config
    expect(mockDb.searchDocuments).not.toHaveBeenCalled();
    const configWrites = mockDb.storeDocument.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-freedom-config',
    );
    expect(configWrites.length).toBe(0);
  });

  // T606-2: storeDocumentWithOCC used — not plain storeDocument (IR-3, CF-15-2)
  test('T606-2: storeDocumentWithOCC used for config write — not plain storeDocument', async () => {
    const result = await service.updateConfigKey({
      key: 'feature_dark_mode',
      value: false,
    });

    expect(result.isSuccess).toBe(true);

    // Config write MUST use storeDocumentWithOCC — not plain storeDocument
    const occWrites = mockDb.storeDocumentWithOCC.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-freedom-config',
    );
    expect(occWrites.length).toBe(1);

    // Plain storeDocument must NOT be called for config writes (only for audit)
    const plainConfigWrites = mockDb.storeDocument.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-freedom-config',
    );
    expect(plainConfigWrites.length).toBe(0);

    // OCC options must be passed (4th argument)
    expect(occWrites[0][3]).toBeDefined();
    expect(occWrites[0][3]).toHaveProperty('ifSeqNo');
    expect(occWrites[0][3]).toHaveProperty('ifPrimaryTerm');
  });

  // T606-3: storeDocument(audit) called before enqueue(TenantConfigurationUpdated) — DNA-8
  test('T606-3: storeDocument(audit) called before enqueue(TenantConfigurationUpdated) — DNA-8 order', async () => {
    const result = await service.updateConfigKey({
      key: 'feature_dark_mode',
      value: true,
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE TenantConfigurationUpdated enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-config-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:TenantConfigurationUpdated');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T606-4: OCC conflict → ConfigUpdateConflict emitted
  test('T606-4: OCC conflict → ConfigUpdateConflict emitted', async () => {
    // storeDocumentWithOCC returns OCC_CONFLICT error
    mockDb.storeDocumentWithOCC.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocumentWithOCC:${index}`);
        if (index === 'xiigen-freedom-config') {
          return Promise.resolve({
            isSuccess: false,
            errorCode: 'OCC_CONFLICT',
            errorMessage: 'Version conflict',
          });
        }
        return Promise.resolve({ isSuccess: true });
      },
    );

    const result = await service.updateConfigKey({
      key: 'feature_dark_mode',
      value: true,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OCC_CONFLICT');

    // ConfigUpdateConflict emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ConfigUpdateConflict',
      expect.objectContaining({
        tenantId: 'tenant-606',
        key: 'feature_dark_mode',
        reason: 'concurrent_update',
      }),
    );
  });

  // T606-5: TenantConfigurationUpdated carries tenantId, key, value, updatedAt
  test('T606-5: TenantConfigurationUpdated carries tenantId, key, value, updatedAt', async () => {
    const result = await service.updateConfigKey({
      key: 'max_users',
      value: 50,
    });

    expect(result.isSuccess).toBe(true);

    const updateCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'TenantConfigurationUpdated',
    );
    expect(updateCall).toBeDefined();
    const payload = updateCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('tenantId', 'tenant-606');
    expect(payload).toHaveProperty('key', 'max_users');
    expect(payload).toHaveProperty('value', 50);
    expect(payload).toHaveProperty('updatedAt');
  });
});
