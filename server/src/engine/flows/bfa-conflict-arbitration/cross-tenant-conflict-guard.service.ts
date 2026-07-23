/**
 * CrossTenantConflictGuard — T387 GOVERNANCE service for FLOW-25.
 *
 * Detects when a change in one tenant overlaps with another tenant's protected
 * resources. Returns AGGREGATED counts only — raw cross-tenant documents are
 * NEVER returned to callers (CF-501).
 *
 * Iron rules (enforced — not configurable):
 *   CF-501:  NEVER return raw cross-tenant documents — aggregated counts only
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   IR-387-1: Cross-tenant overlap found → CROSS_TENANT_OVERLAP failure
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface CrossTenantCheckResult {
  readonly tenantId: string;
  readonly changeId: string;
  readonly overlappingTenantCount: number;
  readonly overlappingResourceCount: number;
  readonly checkedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const PROTECTED_RESOURCES_INDEX = 'bfa-protected-resources';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CrossTenantConflictGuard extends MicroserviceBase {
  constructor(private readonly dbService: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T387',
        serviceName: 'CrossTenantConflictGuard',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Check if a change's affected resources overlap with another tenant's
   * protected resources.
   *
   * CF-501: Only counts are returned — never raw cross-tenant documents.
   * IR-387-1: Resource overlap produces CROSS_TENANT_OVERLAP failure.
   * CF-476: tenantId required.
   */
  async checkForCrossTenantOverlap(
    tenantId: string,
    changeId: string,
    affectedResources: string[],
  ): Promise<DataProcessResult<CrossTenantCheckResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!changeId || changeId.trim() === '') {
      return DataProcessResult.failure('MISSING_CHANGE_ID', 'changeId is required');
    }
    if (!affectedResources || affectedResources.length === 0) {
      return DataProcessResult.success({
        tenantId,
        changeId,
        overlappingTenantCount: 0,
        overlappingResourceCount: 0,
        checkedAt: new Date().toISOString(),
      });
    }

    // Fetch ALL protected-resource registrations for resources in the affected set,
    // excluding the requesting tenant's own registrations.
    const searchResult = await this.dbService.searchDocuments(PROTECTED_RESOURCES_INDEX, {
      resource_ids: affectedResources,
    });

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        searchResult.errorCode ?? 'DB_ERROR',
        searchResult.errorMessage ?? 'Failed to query protected resources',
      );
    }

    // CF-501: aggregate only — never surface raw docs to the caller
    const foreignDocs = (searchResult.data ?? []).filter((doc) => doc['tenant_id'] !== tenantId);

    const uniqueForeignTenants = new Set(foreignDocs.map((d) => d['tenant_id'] as string));
    const overlappingTenantCount = uniqueForeignTenants.size;
    const overlappingResourceCount = foreignDocs.length;

    if (overlappingTenantCount > 0) {
      return DataProcessResult.failure(
        'CROSS_TENANT_OVERLAP',
        `IR-387-1: Change '${changeId}' for tenant '${tenantId}' overlaps with ` +
          `${overlappingResourceCount} protected resource(s) across ${overlappingTenantCount} other tenant(s). ` +
          'Cross-tenant modification is not permitted.',
      );
    }

    return DataProcessResult.success({
      tenantId,
      changeId,
      overlappingTenantCount: 0,
      overlappingResourceCount: 0,
      checkedAt: new Date().toISOString(),
    });
  }

  /**
   * Register a tenant's protected resources so other tenants' changes
   * can be checked against them.
   *
   * CF-476: tenantId required.
   */
  async registerProtectedResources(
    tenantId: string,
    resourceIds: string[],
  ): Promise<DataProcessResult<{ registered: number }>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!resourceIds || resourceIds.length === 0) {
      return DataProcessResult.success({ registered: 0 });
    }

    let registered = 0;
    for (const resourceId of resourceIds) {
      const docId = `prot-${tenantId}-${resourceId}`;
      const stored = await this.dbService.storeDocument(
        PROTECTED_RESOURCES_INDEX,
        { tenant_id: tenantId, resource_id: resourceId, registered_at: new Date().toISOString() },
        docId,
      );
      if (stored.isSuccess) registered++;
    }

    return DataProcessResult.success({ registered });
  }
}
