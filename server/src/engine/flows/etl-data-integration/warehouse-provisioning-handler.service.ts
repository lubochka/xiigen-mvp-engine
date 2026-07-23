/**
 * T224 WarehouseProvisioningHandler [provisioning]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Provision tenant warehouse zones in raw→staging→core→mart order (CF-192).
 * Zone skipping is prohibited. RLS policies (F463) registered for all zones.
 * Audit via IWarehouseAuditService (F459). Emit WarehouseTenantProvisioned.
 *
 * Iron rules:
 *   IR-1: Zone provisioning MUST follow raw→staging→core→mart order (CF-192).
 *   IR-2: Skipping zones is prohibited.
 *   IR-3: RLS policies (F463) MUST be registered for ALL zones on provisioning.
 *   IR-4: WarehouseTenantProvisioned includes zonesProvisioned and rlsPoliciesRegistered: true.
 *   IR-5: IWarehouseAuditService (F459) records provisioning event.
 *   IR-6: Tenant isolation — separate index namespaces per tenant.
 *   IR-7: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: WarehouseTenantProvisioned
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { RLS_POLICY_SERVICE } from './etl-platform-tokens';

interface IRlsPolicyService {
  registerPolicy(tenantId: string, zone: string, policyType: string): Promise<{ policyId: string }>;
}

interface IWarehouseAuditService {
  recordProvisioning(tenantId: string, event: Record<string, unknown>): Promise<void>;
}

export const WAREHOUSE_AUDIT_SERVICE = Symbol('IWarehouseAuditService:F459');

/** CF-192 zone provisioning order — must NOT be reordered */
const ZONE_ORDER: readonly string[] = ['raw', 'staging', 'core', 'mart'] as const;

const WAREHOUSE_TENANTS_INDEX = 'xiigen-warehouse-tenants';
const WAREHOUSE_ZONES_INDEX = 'xiigen-warehouse-zones';

@Injectable()
export class WarehouseProvisioningHandlerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RLS_POLICY_SERVICE) private readonly rlsPolicy: IRlsPolicyService,
    @Inject(WAREHOUSE_AUDIT_SERVICE) private readonly warehouseAudit: IWarehouseAuditService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T224',
        serviceName: 'WarehouseProvisioningHandlerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async provision(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const warehouseId = event['warehouseId'] as string;

    if (!warehouseId) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'warehouseId is required');
    }

    // IR-1/IR-2: Provision zones in EXACT raw→staging→core→mart order (CF-192)
    const provisionedZones: string[] = [];
    const registeredPolicies: string[] = [];

    for (const zone of ZONE_ORDER) {
      // IR-6: Tenant-namespaced zone index
      const zoneIndex = `xiigen-warehouse-${tenantId}-${zone}`;

      const zoneStoreResult = await this.dbFabric.storeDocument(
        WAREHOUSE_ZONES_INDEX,
        {
          warehouseId,
          tenantId,
          zone,
          knowledgeScope: 'PRIVATE',
          zoneIndex,
          status: 'ACTIVE',
          provisionedAt: new Date().toISOString(),
        },
        `zone:${tenantId}:${warehouseId}:${zone}`,
      );

      if (!zoneStoreResult.isSuccess) {
        return DataProcessResult.failure(
          'ZONE_PROVISION_FAILED',
          `Failed to provision zone '${zone}': ${zoneStoreResult.errorMessage ?? 'unknown error'}`,
        );
      }

      provisionedZones.push(zone);

      // IR-3: Register RLS policy for this zone (F463)
      const policyResult = await this.rlsPolicy.registerPolicy(tenantId, zone, 'tenant_isolation');
      registeredPolicies.push(policyResult.policyId);
    }

    // IR-5: Record audit event (F459)
    await this.warehouseAudit.recordProvisioning(tenantId, {
      warehouseId,
      zonesProvisioned: provisionedZones,
      provisionedAt: new Date().toISOString(),
    });

    // IR-7: Store warehouse tenant record BEFORE enqueue (DNA-8)
    const warehouseStoreResult = await this.dbFabric.storeDocument(
      WAREHOUSE_TENANTS_INDEX,
      {
        warehouseId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        zonesProvisioned: provisionedZones,
        rlsPoliciesRegistered: true,
        policyIds: registeredPolicies,
        provisionedAt: new Date().toISOString(),
      },
      `warehouse:${tenantId}:${warehouseId}`,
    );

    if (!warehouseStoreResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        warehouseStoreResult.errorMessage ?? 'Warehouse record store failed',
      );
    }

    // IR-4: WarehouseTenantProvisioned includes zonesProvisioned and rlsPoliciesRegistered: true
    await this.queueFabric.enqueue('WarehouseTenantProvisioned', {
      warehouseId,
      tenantId,
      zonesProvisioned: provisionedZones,
      rlsPoliciesRegistered: true,
      provisionedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      warehouseId,
      tenantId,
      zonesProvisioned: provisionedZones,
      rlsPoliciesRegistered: true,
    });
  }
}
