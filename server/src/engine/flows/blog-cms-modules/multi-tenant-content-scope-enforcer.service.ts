/**
 * T440 MultiTenantContentScopeEnforcer [SCOPE_ISOLATION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentAccessRequested event (user/service attempts content access)
 *
 * Execution order is MACHINE (CF-28-18):
 *   ORDER 1: Extract tenantId from ALS context
 *   ORDER 2: Fetch content and validate tenant ownership
 *   ORDER 3: storeDocument(access-audit-log)
 *   ORDER 4: enqueue(AccessDeniedOrGranted) — return result with sanitized error
 *
 * Iron rules:
 *   IR-1: ALWAYS validate tenantId matches before returning ANY content
 *   IR-2: tenantId from ALS only (DNA-5)
 *   IR-3: storeDocument BEFORE enqueue (DNA-8)
 *   IR-4: Access denied returns 403 + generic error (no tenant hint leakage)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const ACCESS_AUDIT_LOG_INDEX = 'xiigen-access-audit-log';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class MultiTenantContentScopeEnforcerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T440',
        serviceName: 'MultiTenantContentScopeEnforcerService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Enforce multi-tenant scope isolation on content access.
   */
  async enforceScope(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const requestType = event['requestType'] as string;
    const requesterEmail = event['requesterEmail'] as string;

    if (!contentId || !requestType) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and requestType are required');
    }

    // ── ORDER 1: Extract tenantId from ALS ───────────────────────────────
    // Already extracted above

    // ── ORDER 2: Fetch content and validate tenant ownership ──────────────
    const contentSearchResult = await this.dbFabric.searchDocuments('xiigen-published-content', {
      contentId,
    });

    if (!contentSearchResult.isSuccess || (contentSearchResult.data ?? []).length === 0) {
      // ── ORDER 3: storeDocument(access-audit-log) ──────────────────────
      const auditLog: Record<string, unknown> = {
        contentId,
        tenantId,
        requestType,
        requesterEmail: requesterEmail ?? 'unknown',
        accessGranted: false,
        reason: 'CONTENT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      };

      await this.dbFabric.storeDocument(ACCESS_AUDIT_LOG_INDEX, auditLog, `${contentId}:access`);

      // ── ORDER 4: enqueue(AccessDenied) ──────────────────────────────
      await this.queueFabric.enqueue('AccessDenied', {
        contentId,
        tenantId,
        reason: 'NOT_FOUND',
        timestamp: new Date().toISOString(),
      });

      return DataProcessResult.failure('ACCESS_DENIED', 'Access denied');
    }

    const content = contentSearchResult.data![0] as Record<string, unknown>;
    const contentTenantId = content['tenantId'] as string;

    // Critical: Validate tenant match
    if (contentTenantId !== tenantId) {
      // ── ORDER 3: storeDocument(access-audit-log) ──────────────────────
      const auditLog: Record<string, unknown> = {
        contentId,
        tenantId,
        requestType,
        requesterEmail: requesterEmail ?? 'unknown',
        accessGranted: false,
        reason: 'TENANT_MISMATCH',
        timestamp: new Date().toISOString(),
      };

      await this.dbFabric.storeDocument(ACCESS_AUDIT_LOG_INDEX, auditLog, `${contentId}:access`);

      // ── ORDER 4: enqueue(AccessDenied) ──────────────────────────────
      await this.queueFabric.enqueue('AccessDenied', {
        contentId,
        tenantId,
        reason: 'SCOPE_VIOLATION',
        timestamp: new Date().toISOString(),
      });

      return DataProcessResult.failure('ACCESS_DENIED', 'Access denied');
    }

    // Access granted
    // ── ORDER 3: storeDocument(access-audit-log) ──────────────────────
    const auditLog: Record<string, unknown> = {
      contentId,
      tenantId,
      requestType,
      requesterEmail: requesterEmail ?? 'unknown',
      accessGranted: true,
      reason: 'SCOPE_VALID',
      timestamp: new Date().toISOString(),
    };

    await this.dbFabric.storeDocument(ACCESS_AUDIT_LOG_INDEX, auditLog, `${contentId}:access`);

    // ── ORDER 4: enqueue(AccessGranted) ─────────────────────────────────
    await this.queueFabric.enqueue('AccessGranted', {
      contentId,
      tenantId,
      reason: 'SCOPE_VALID',
      timestamp: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      tenantId,
      accessGranted: true,
      status: 'SCOPE_ENFORCED',
      timestamp: new Date().toISOString(),
    });
  }
}
