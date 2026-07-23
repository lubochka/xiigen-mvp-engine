/**
 * TenantModuleRegistry — per-tenant registry of installed marketplace modules.
 *
 * Introduced by Turn 6 (MVP Plan v3, Goals 4b + 4c + 4d).
 *
 * Per DD-324 (FLOW-32, Linked install mode): installing a marketplace package
 * does NOT copy topology into the tenant's store. Instead, one registration
 * record is written here — `{ tenantId, flowId, packageId, version, installedAt,
 * linkedMode: true }`. At generation time, AF-4 RagContextStation queries this
 * registry to include the linked modules' FLOW_SCOPED knowledge in its RAG
 * retrieval scope without the tenant owning a copy of the module's topology.
 *
 * Iron rules:
 *   IR-MOD-1: Write is scoped to the caller's CLS tenantId. DNA-5 — no tenantId
 *             parameter overrides. registerInstall always stamps the ALS tenant.
 *   IR-MOD-2: Reads pass targetTenantId explicitly because RagContextStation
 *             needs to enrich search for a specific tenant's generation. CLS is
 *             NOT the authority for reads — the caller is (AF-4).
 *   IR-MOD-3: Index mappings define keyword fields for tenantId + flowId +
 *             packageId so exact-match queries return registered modules.
 */

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import { DATABASE_SERVICE, IDatabaseService } from '../fabrics/interfaces/database.interface';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';

export const TENANT_MODULE_REGISTRY_INDEX = 'xiigen-tenant-module-registry';

/**
 * Index mappings — bootstrapped via ensureIndex in onModuleInit. Keyword
 * fields on the three query dimensions keep term-level matches exact.
 */
const TENANT_MODULE_REGISTRY_MAPPINGS = {
  properties: {
    tenantId: { type: 'keyword' },
    flowId: { type: 'keyword' },
    packageId: { type: 'keyword' },
    version: { type: 'keyword' },
    installedAt: { type: 'date' },
    linkedMode: { type: 'boolean' },
  },
};

export interface ModuleRegistrationRecord {
  tenantId: string;
  flowId: string;
  packageId: string;
  version: string;
  installedAt: string;
  linkedMode: true;
}

@Injectable()
export class TenantModuleRegistry implements OnModuleInit {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
  ) {}

  /**
   * Bootstrap: create index with keyword mappings. Idempotent — ES silently
   * ignores a second create, and the in-memory provider's ensureIndex is a
   * no-op. Running at onModuleInit ensures the index exists before the first
   * install call.
   */
  async onModuleInit(): Promise<void> {
    await this.db.ensureIndex(TENANT_MODULE_REGISTRY_INDEX, TENANT_MODULE_REGISTRY_MAPPINGS);
  }

  /**
   * Write a registration record for the calling tenant. DNA-5: tenantId is
   * always from CLS, never accepted as a parameter.
   */
  async registerInstall(input: {
    packageId: string;
    flowId: string;
    version: string;
  }): Promise<DataProcessResult<ModuleRegistrationRecord>> {
    const tenantId = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId;
    if (!tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'Tenant context required');
    }
    if (!input.packageId || !input.flowId) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId and flowId required');
    }
    const record: ModuleRegistrationRecord = {
      tenantId,
      packageId: input.packageId,
      flowId: input.flowId,
      version: input.version ?? 'v1',
      installedAt: new Date().toISOString(),
      linkedMode: true,
    };
    const docId = `${tenantId}::${input.packageId}`;
    const result = await this.db.storeDocument(
      TENANT_MODULE_REGISTRY_INDEX,
      record as unknown as Record<string, unknown>,
      docId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'STORE_FAILED',
        result.errorMessage ?? 'registerInstall failed',
      );
    }
    return DataProcessResult.success(record);
  }

  /**
   * Read all registered modules for a specific tenant. Used by
   * RagContextStation (AF-4) to expand the RAG scope during generation —
   * the station already knows its caller tenantId (StationInput.tenantId),
   * so reads pass it explicitly rather than relying on CLS.
   *
   * Returns just the flowIds since that's the shape RagContextStation /
   * IRagService needs; callers wanting full records can use the index directly.
   */
  async listLinkedModules(targetTenantId: string): Promise<DataProcessResult<string[]>> {
    if (!targetTenantId) {
      return DataProcessResult.failure<string[]>('INVALID_TARGET', 'targetTenantId required');
    }
    const result = await this.db.searchDocuments(
      TENANT_MODULE_REGISTRY_INDEX,
      { tenantId: targetTenantId },
      200,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure<string[]>(
        result.errorCode ?? 'SEARCH_FAILED',
        result.errorMessage ?? 'listLinkedModules failed',
      );
    }
    const records = (result.data ?? []) as unknown as ModuleRegistrationRecord[];
    const flowIds = records.map((r) => r.flowId).filter((id): id is string => Boolean(id));
    return DataProcessResult.success(flowIds);
  }
}
