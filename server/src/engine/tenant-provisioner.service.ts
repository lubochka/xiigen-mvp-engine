/**
 * TenantProvisionerService — orchestrates new tenant onboarding.
 *
 * Steps (in order, DNA-8 compliant):
 *   1. Create tenant registry entry  (xiigen-tenant-registry)
 *   2. Seed default FREEDOM config   (xiigen-freedom-config)
 *   3. Initialise per-flow lifecycle entries (xiigen-flow-lifecycle)
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: each storeDocument happens before any downstream action.
 * Stage 2, S8.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { ES_INDEX } from '../kernel/es-index-constants';

export interface TenantProvisionRequest {
  tenantId: string;
  name: string;
  plan?: string;
  seedFlows?: string[];
  metadata?: Record<string, unknown>;
}

export interface TenantProvisionResult {
  tenantId: string;
  registryEntryId: string;
  freedomConfigId: string;
  lifecycleEntries: number;
  provisionedAt: string;
}

const REGISTRY_INDEX = ES_INDEX.TENANT_REGISTRY;
const FREEDOM_INDEX = ES_INDEX.FREEDOM_CONFIG;
const LIFECYCLE_INDEX = ES_INDEX.FLOW_LIFECYCLE;

@Injectable()
export class TenantProvisionerService {
  private readonly logger = new Logger(TenantProvisionerService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  // ─── provisionTenant ───────────────────────────────────────────────────────

  async provisionTenant(
    req: TenantProvisionRequest,
  ): Promise<DataProcessResult<TenantProvisionResult>> {
    if (!req.tenantId || !req.name) {
      return DataProcessResult.failure('MISSING_PARAMS', 'tenantId and name are required');
    }

    const now = new Date().toISOString();

    // Step 1 — tenant registry entry (DNA-8: store before anything else)
    const tenantEntry: Record<string, unknown> = {
      tenantId: req.tenantId,
      name: req.name,
      plan: req.plan ?? 'STANDARD',
      status: 'ACTIVE',
      metadata: req.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    const registryResult = await this.db.storeDocument(REGISTRY_INDEX, tenantEntry, req.tenantId);
    if (!registryResult.isSuccess) {
      return DataProcessResult.failure(
        'REGISTRY_WRITE_FAILED',
        `Failed to create tenant registry entry: ${registryResult.errorMessage}`,
      );
    }

    // Step 2 — seed default FREEDOM config
    const freedomId = `freedom::${req.tenantId}`;
    const freedomConfig: Record<string, unknown> = {
      configId: freedomId,
      tenantId: req.tenantId,
      maxRetries: 3,
      scoringThreshold: 0.75,
      promotionEnabled: true,
      ragEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    const freedomResult = await this.db.storeDocument(FREEDOM_INDEX, freedomConfig, freedomId);
    if (!freedomResult.isSuccess) {
      return DataProcessResult.failure(
        'FREEDOM_CONFIG_WRITE_FAILED',
        `Failed to seed FREEDOM config: ${freedomResult.errorMessage}`,
      );
    }

    // Step 3 — initialise lifecycle entries for seeded flows
    let lifecycleEntries = 0;
    for (const flowId of req.seedFlows ?? []) {
      const entryId = `${flowId}::${req.tenantId}`;
      const lifecycleRecord: Record<string, unknown> = {
        flowId: entryId,
        tenantId: req.tenantId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
        createdBy: 'tenant-provisioner',
      };
      const lifecycleResult = await this.db.storeDocument(
        LIFECYCLE_INDEX,
        lifecycleRecord,
        entryId,
      );
      if (lifecycleResult.isSuccess) {
        lifecycleEntries++;
      }
    }

    this.logger.log(`Provisioned tenant: ${req.tenantId} (${lifecycleEntries} lifecycle entries)`);

    return DataProcessResult.success({
      tenantId: req.tenantId,
      registryEntryId: req.tenantId,
      freedomConfigId: freedomId,
      lifecycleEntries,
      provisionedAt: now,
    });
  }

  // ─── getTenantStatus ───────────────────────────────────────────────────────

  async getTenantStatus(
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown> | null>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT_ID', 'tenantId is required');
    }
    const result = await this.db.getDocument(REGISTRY_INDEX, tenantId);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success(null);
    }
    return DataProcessResult.success(result.data);
  }

  // ─── deprovisionTenant ─────────────────────────────────────────────────────

  async deprovisionTenant(tenantId: string): Promise<DataProcessResult<boolean>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT_ID', 'tenantId is required');
    }
    const existing = await this.db.getDocument(REGISTRY_INDEX, tenantId);
    if (!existing.isSuccess || !existing.data) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant ${tenantId} not found`);
    }
    const updated: Record<string, unknown> = {
      ...existing.data,
      status: 'DEPROVISIONED',
      updatedAt: new Date().toISOString(),
    };
    await this.db.storeDocument(REGISTRY_INDEX, updated, tenantId);
    this.logger.log(`Deprovisioned tenant: ${tenantId}`);
    return DataProcessResult.success(true);
  }
}
