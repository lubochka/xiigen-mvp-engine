/**
 * WarehouseProvisioningHandlerService (T224) — unit tests
 *
 * Coverage:
 *  1.  Happy path — all 4 zones provisioned, WarehouseTenantProvisioned emitted
 *  2.  IR-1/CF-192: zones provisioned in exact raw→staging→core→mart order
 *  3.  IR-2: zone skipping — only 4 specific zones provisioned (none skipped)
 *  4.  IR-3: RLS registerPolicy called for each zone (4 calls total)
 *  5.  IR-4: WarehouseTenantProvisioned includes zonesProvisioned + rlsPoliciesRegistered: true
 *  6.  IR-5: warehouseAudit.recordProvisioning called
 *  7.  IR-6: stored zone record has tenant-namespaced zoneIndex
 *  8.  IR-7/DNA-8: storeDocument warehouse record BEFORE enqueue WarehouseTenantProvisioned
 *  9.  Zone provision failure → ZONE_PROVISION_FAILED
 * 10.  Final store failure → STORE_FAILED
 * 11.  knowledgeScope PRIVATE in stored records
 * 12.  Validation: missing warehouseId → failure
 */

import { WarehouseProvisioningHandlerService } from './warehouse-provisioning-handler.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('WarehouseProvisioningHandlerService (T224)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRls: { registerPolicy: jest.Mock };
  let mockAudit: { recordProvisioning: jest.Mock };
  let service: WarehouseProvisioningHandlerService;
  let callOrder: string[];
  let zoneProvisionOrder: string[];

  const TENANT = 'tenant-t200';

  beforeEach(() => {
    callOrder = [];
    zoneProvisionOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest
        .fn()
        .mockImplementation(async (index: string, doc: Record<string, unknown>) => {
          callOrder.push(`storeDocument:${index}`);
          if (index === 'xiigen-warehouse-zones' && doc['zone']) {
            zoneProvisionOrder.push(doc['zone'] as string);
          }
          return DataProcessResult.success({});
        }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(TENANT)) };

    mockRls = {
      registerPolicy: jest.fn().mockImplementation(async (tenantId: string, zone: string) => ({
        policyId: `policy-${zone}`,
      })),
    };

    mockAudit = {
      recordProvisioning: jest.fn().mockResolvedValue(undefined),
    };

    service = new WarehouseProvisioningHandlerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRls as any,
      mockAudit as any,
    );
  });

  it('T224-1: happy path — all 4 zones provisioned, WarehouseTenantProvisioned emitted', async () => {
    const result = await service.provision({ warehouseId: 'wh-001' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['rlsPoliciesRegistered']).toBe(true);
    expect((result.data!['zonesProvisioned'] as string[]).length).toBe(4);
    const wantCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'WarehouseTenantProvisioned',
    );
    expect(wantCall).toBeDefined();
  });

  it('T224-2: IR-1/CF-192 — zones provisioned in raw→staging→core→mart order', async () => {
    await service.provision({ warehouseId: 'wh-002' });

    expect(zoneProvisionOrder).toEqual(['raw', 'staging', 'core', 'mart']);
  });

  it('T224-3: IR-2 — exactly 4 zones provisioned (no skipping)', async () => {
    await service.provision({ warehouseId: 'wh-003' });

    const zoneStoreCalls = mockDb.storeDocument.mock.calls.filter(
      (c) => c[0] === 'xiigen-warehouse-zones',
    );
    expect(zoneStoreCalls.length).toBe(4);
    const zones = zoneStoreCalls.map((c) => c[1]['zone']);
    expect(zones).toContain('raw');
    expect(zones).toContain('staging');
    expect(zones).toContain('core');
    expect(zones).toContain('mart');
  });

  it('T224-4: IR-3 — RLS registerPolicy called 4 times (once per zone)', async () => {
    await service.provision({ warehouseId: 'wh-004' });

    expect(mockRls.registerPolicy).toHaveBeenCalledTimes(4);
    const zones = mockRls.registerPolicy.mock.calls.map((c: unknown[]) => c[1]);
    expect(zones).toEqual(['raw', 'staging', 'core', 'mart']);
  });

  it('T224-5: IR-4 — WarehouseTenantProvisioned includes zonesProvisioned + rlsPoliciesRegistered: true', async () => {
    await service.provision({ warehouseId: 'wh-005' });

    const wantCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'WarehouseTenantProvisioned',
    );
    expect(wantCall).toBeDefined();
    expect(wantCall![1]).toHaveProperty('rlsPoliciesRegistered', true);
    expect(wantCall![1]).toHaveProperty('zonesProvisioned');
    expect((wantCall![1]['zonesProvisioned'] as string[]).length).toBe(4);
  });

  it('T224-6: IR-5 — warehouseAudit.recordProvisioning called', async () => {
    await service.provision({ warehouseId: 'wh-006' });

    expect(mockAudit.recordProvisioning).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        warehouseId: 'wh-006',
      }),
    );
  });

  it('T224-7: IR-6 — stored zone record has tenant-namespaced zoneIndex', async () => {
    await service.provision({ warehouseId: 'wh-007' });

    const rawZoneCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-warehouse-zones' && c[1]['zone'] === 'raw',
    );
    expect(rawZoneCall).toBeDefined();
    expect(rawZoneCall![1]['zoneIndex']).toContain(TENANT);
    expect(rawZoneCall![1]['zoneIndex']).toContain('raw');
  });

  it('T224-8: IR-7/DNA-8 — storeDocument warehouse record BEFORE enqueue WarehouseTenantProvisioned', async () => {
    await service.provision({ warehouseId: 'wh-008' });

    const storeIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-warehouse-tenants'),
    );
    const enqueueIdx = callOrder.indexOf('enqueue:WarehouseTenantProvisioned');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T224-9: zone provision failure → ZONE_PROVISION_FAILED', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      if (index === 'xiigen-warehouse-zones')
        return DataProcessResult.failure('DISK_FULL', 'no space');
      return DataProcessResult.success({});
    });

    const result = await service.provision({ warehouseId: 'wh-009' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ZONE_PROVISION_FAILED');
  });

  it('T224-10: final warehouse record store failure → STORE_FAILED', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      if (index === 'xiigen-warehouse-tenants')
        return DataProcessResult.failure('DISK_FULL', 'no space');
      return DataProcessResult.success({});
    });

    const result = await service.provision({ warehouseId: 'wh-010' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });

  it('T224-11: knowledgeScope PRIVATE in zone and warehouse records', async () => {
    await service.provision({ warehouseId: 'wh-011' });

    const zoneCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-warehouse-zones');
    expect(zoneCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });

    const warehouseCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-warehouse-tenants',
    );
    expect(warehouseCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T224-12: validation — missing warehouseId → failure', async () => {
    const result = await service.provision({});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
