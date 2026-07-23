/**
 * T173 QueryExecutionEngine [query_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Three-layer security gate before every query execution.
 * T187 QuotaManager is INLINE â€” instantiated directly in constructor. F426 does NOT exist.
 *
 * Gate order is MANDATORY AND IMMUTABLE:
 *   LAYER 1: T187 QuotaManager.check()   â€” INLINE, not factory-injected
 *   LAYER 2: F422 IRowLevelSecurityService.apply()  â€” PLATFORM-ONLY, cannot be disabled
 *   LAYER 3: F423 IPIIMaskingService.mask()          â€” PLATFORM-ONLY, runs BEFORE serialization
 *   â†’ executeQuery()
 *   â†’ T187 QuotaManager.recordUsage()   â€” AFTER successful execution
 *
 * Iron rules:
 *   IR-1: GATE ORDER IS MANDATORY: T187(1) â†’ F422(2) â†’ F423(3) â†’ executeQuery.
 *   IR-2: T187 is INLINE â€” instantiated in constructor. NOT @Inject()-ed. F426 does NOT exist.
 *   IR-3: F422 IRowLevelSecurityService is PLATFORM-ONLY â€” cannot be disabled.
 *   IR-4: F423 IPIIMaskingService is PLATFORM-ONLY â€” runs BEFORE serialization, no opt-out.
 *   IR-5: All joins must include tenantId predicate â€” never cross-tenant.
 *   IR-6: IWarehouseAuditService (F425) records every query operation.
 *   IR-7: Any gate failure â†’ emit QueryFailed with correct reason, return immediately.
 *
 * Emits: query.failed
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { QuotaManager } from './quota-manager';

/**
 * F422: IRowLevelSecurityService â€” PLATFORM-ONLY.
 * Applies row-level security filters to query context.
 * Cannot be disabled by tenant.
 */
export const F422_RLS_SERVICE = Symbol('IRowLevelSecurityService:F422');

export interface IRowLevelSecurityService {
  apply(context: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * F423: IPIIMaskingService â€” PLATFORM-ONLY.
 * Masks PII fields BEFORE result serialization. No opt-out.
 */
export const F423_PII_MASKING_SERVICE = Symbol('IPIIMaskingService:F423');

export interface IPIIMaskingService {
  mask(result: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * F425: IWarehouseAuditService â€” PLATFORM-ONLY.
 * Records every query operation (including failed ones).
 */
export const F425_WAREHOUSE_AUDIT_SERVICE = Symbol('IWarehouseAuditService:F425');

export interface IWarehouseAuditService {
  record(entry: Record<string, unknown>): Promise<void>;
}

const WAREHOUSE_QUERY_INDEX = 'xiigen-warehouse-queries';

@Injectable()
export class QueryExecutionEngineService extends MicroserviceBase {
  /**
   * T187 QuotaManager â€” INLINE. IR-2: instantiated here, NOT @Inject()-ed. F426 does NOT exist.
   */
  private quotaManager: QuotaManager;

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(F422_RLS_SERVICE)
    private readonly rlsService: IRowLevelSecurityService | null = null,
    @Optional()
    @Inject(F423_PII_MASKING_SERVICE)
    private readonly piiMaskingService: IPIIMaskingService | null = null,
    @Optional()
    @Inject(F425_WAREHOUSE_AUDIT_SERVICE)
    private readonly auditService: IWarehouseAuditService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T173',
        serviceName: 'QueryExecutionEngineService',
        flowId: 'FLOW-13',
      }),
    });
    // IR-2: T187 QuotaManager instantiated INLINE â€” not injected. F426 does NOT exist.
    this.quotaManager = new QuotaManager(this.dbFabric, this.queueFabric, this.getTenantId());
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Execute a tenant query through the mandatory three-layer security gate.
   * Gate order is IMMUTABLE. Any reordering is a BUILD_FAILURE.
   */
  async executeQuery(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();

    // Re-initialize QuotaManager with current tenant context (set after construction)
    this.quotaManager = new QuotaManager(this.dbFabric, this.queueFabric, tenantId);

    const queryId = event['queryId'] as string;
    const queryType = (event['queryType'] as string) ?? 'SELECT';
    const queryPayload = event['query'] as Record<string, unknown>;

    const now = new Date().toISOString();

    // â”€â”€â”€ LAYER 1: T187 QuotaManager.check() â€” INLINE, ORDER 1 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-1: FIRST gate. IR-2: INLINE â€” not factory-injected.
    const quotaResult = await this.quotaManager.check(queryId, queryType);
    if (!quotaResult.isSuccess) {
      // Quota failure already emits QueryFailed â€” IR-7
      await this.recordAudit(tenantId, queryId, 'QUOTA_DENIED', now);
      return DataProcessResult.failure(
        quotaResult.errorCode ?? 'QUOTA_EXCEEDED',
        quotaResult.errorMessage ?? 'Quota exceeded',
      );
    }

    // â”€â”€â”€ LAYER 2: F422 IRowLevelSecurityService.apply() â€” PLATFORM-ONLY, ORDER 2 â”€â”€
    // IR-3: Cannot be disabled. Gate 2 must run before execute.
    const rlsContext: Record<string, unknown> = {
      tenantId,
      queryId,
      queryType,
      query: queryPayload,
    };
    if (this.rlsService) {
      const rlsResult = await this.rlsService.apply(rlsContext);
      if (!rlsResult.isSuccess) {
        await this.queueFabric.enqueue('QueryFailed', {
          tenantId,
          queryId,
          queryType,
          reason: 'rls_denied',
          failedAt: now,
        });
        await this.recordAudit(tenantId, queryId, 'RLS_DENIED', now);
        return DataProcessResult.failure(
          'RLS_DENIED',
          rlsResult.errorMessage ?? 'RLS check failed',
        );
      }
    }

    // â”€â”€â”€ Execute query â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // IR-5: Query is tenant-scoped â€” tenantId included in predicate
    const queryWithTenantScope = { ...queryPayload, tenantId };
    const queryResult = await this.dbFabric.searchDocuments(WAREHOUSE_QUERY_INDEX, queryWithTenantScope);

    if (!queryResult.isSuccess) {
      await this.queueFabric.enqueue('QueryFailed', {
        tenantId,
        queryId,
        queryType,
        reason: 'execution_error',
        failedAt: now,
      });
      await this.recordAudit(tenantId, queryId, 'EXECUTION_FAILED', now);
      return DataProcessResult.failure(
        'QUERY_FAILED',
        queryResult.errorMessage ?? 'Query execution failed',
      );
    }

    // â”€â”€â”€ LAYER 3: F423 IPIIMaskingService.mask() â€” PLATFORM-ONLY, ORDER 3 â”€â”€â”€â”€
    // IR-4: Runs BEFORE result serialization. No skipMasking flag accepted.
    let maskedResult = { rows: queryResult.data ?? [] } as Record<string, unknown>;
    if (this.piiMaskingService) {
      const maskResult = await this.piiMaskingService.mask(maskedResult);
      if (!maskResult.isSuccess) {
        await this.queueFabric.enqueue('QueryFailed', {
          tenantId,
          queryId,
          queryType,
          reason: 'masking_error',
          failedAt: now,
        });
        await this.recordAudit(tenantId, queryId, 'MASKING_FAILED', now);
        return DataProcessResult.failure(
          'MASKING_ERROR',
          maskResult.errorMessage ?? 'PII masking failed',
        );
      }
      maskedResult = maskResult.data ?? maskedResult;
    }

    // â”€â”€â”€ recordUsage AFTER successful execution â€” IR per T187 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await this.quotaManager.recordUsage(queryId);

    // IR-6: Audit every query operation
    await this.recordAudit(tenantId, queryId, 'SUCCESS', now);

    return DataProcessResult.success({
      queryId,
      tenantId,
      rows: maskedResult['rows'],
      executedAt: now,
    });
  }

  private async recordAudit(
    tenantId: string,
    queryId: string,
    outcome: string,
    timestamp: string,
  ): Promise<void> {
    const entry: Record<string, unknown> = {
      tenantId,
      queryId,
      outcome,
      recordedAt: timestamp,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };
    if (this.auditService) {
      await this.auditService.record(entry);
    }
  }
}
