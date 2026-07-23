/**
 * TenantProvisionerService — unit tests.
 * S8: New tenant onboarding orchestration.
 */
import { TenantProvisionerService } from './tenant-provisioner.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

describe('TenantProvisionerService', () => {
  let svc: TenantProvisionerService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new TenantProvisionerService(mockDb as any);
  });

  // ─── provisionTenant ─────────────────────────────────────────────────────

  describe('provisionTenant', () => {
    it('returns failure for missing tenantId or name', async () => {
      const result = await svc.provisionTenant({ tenantId: '', name: '' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('returns failure when registry write fails', async () => {
      mockDb.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'registry write failed'),
      );
      const result = await svc.provisionTenant({ tenantId: 'T1', name: 'Tenant One' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('REGISTRY_WRITE_FAILED');
    });

    it('returns failure when FREEDOM config write fails', async () => {
      mockDb.storeDocument
        .mockResolvedValueOnce(DataProcessResult.success({})) // registry OK
        .mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'freedom write failed'));
      const result = await svc.provisionTenant({ tenantId: 'T1', name: 'Tenant One' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FREEDOM_CONFIG_WRITE_FAILED');
    });

    it('provisions with zero lifecycle entries when no seedFlows', async () => {
      const result = await svc.provisionTenant({ tenantId: 'T1', name: 'Tenant One' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.tenantId).toBe('T1');
      expect(result.data?.lifecycleEntries).toBe(0);
      expect(result.data?.freedomConfigId).toBe('freedom::T1');
      // registry + freedom = 2 stores
      expect(mockDb.storeDocument).toHaveBeenCalledTimes(2);
    });

    it('provisions lifecycle entries for each seedFlow', async () => {
      const result = await svc.provisionTenant({
        tenantId: 'T2',
        name: 'Tenant Two',
        seedFlows: ['FLOW-01', 'FLOW-02', 'FLOW-03'],
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.lifecycleEntries).toBe(3);
      // registry + freedom + 3 lifecycle = 5 stores
      expect(mockDb.storeDocument).toHaveBeenCalledTimes(5);
    });

    it('writes tenant registry entry before FREEDOM config (DNA-8)', async () => {
      const calls: string[] = [];
      mockDb.storeDocument.mockImplementation((index: string) => {
        calls.push(index);
        return Promise.resolve(DataProcessResult.success({}));
      });
      await svc.provisionTenant({ tenantId: 'T3', name: 'T3' });
      expect(calls[0]).toBe('xiigen-tenant-registry');
      expect(calls[1]).toBe('xiigen-freedom-config');
    });

    it('uses STANDARD plan when plan not specified', async () => {
      await svc.provisionTenant({ tenantId: 'T4', name: 'T4' });
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-tenant-registry',
        expect.objectContaining({ plan: 'STANDARD' }),
        'T4',
      );
    });
  });

  // ─── getTenantStatus ─────────────────────────────────────────────────────

  describe('getTenantStatus', () => {
    it('returns failure for missing tenantId', async () => {
      const result = await svc.getTenantStatus('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT_ID');
    });

    it('returns null when tenant not found', async () => {
      const result = await svc.getTenantStatus('UNKNOWN');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns tenant record when found', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ tenantId: 'T1', status: 'ACTIVE' }),
      );
      const result = await svc.getTenantStatus('T1');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['status']).toBe('ACTIVE');
    });
  });

  // ─── deprovisionTenant ───────────────────────────────────────────────────

  describe('deprovisionTenant', () => {
    it('returns failure for missing tenantId', async () => {
      const result = await svc.deprovisionTenant('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT_ID');
    });

    it('returns failure when tenant not found', async () => {
      const result = await svc.deprovisionTenant('UNKNOWN');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });

    it('soft-deletes by setting status to DEPROVISIONED', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ tenantId: 'T1', status: 'ACTIVE', name: 'T1' }),
      );
      const result = await svc.deprovisionTenant('T1');
      expect(result.isSuccess).toBe(true);
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-tenant-registry',
        expect.objectContaining({ status: 'DEPROVISIONED' }),
        'T1',
      );
    });
  });
});
