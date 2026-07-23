/**
 * T188 WarehouseHealthMonitor [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Read-only health monitoring for tenant warehouse infrastructure.
 * No mutations, no F425 audit required (read-only operations only).
 *
 * Iron rules:
 *   IR-1: Health monitoring is read-only â€” no mutations.
 *   IR-2: Health checks are tenant-scoped.
 *   IR-3: IWarehouseAuditService (F425) is NOT required for health check reads.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_HEALTH_INDEX = 'xiigen-warehouse-health';
const WAREHOUSE_METRICS_INDEX = 'xiigen-warehouse-metrics';

@Injectable()
export class WarehouseHealthMonitorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T188',
        serviceName: 'WarehouseHealthMonitorService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Run a health check on the tenant's warehouse.
   * IR-1: Read-only. IR-2: Tenant-scoped. IR-3: No F425 audit.
   */
  async checkWarehouseHealth(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const checkType = (event['checkType'] as string) ?? 'FULL';

    // IR-2: Always tenant-scoped
    const metricsResult = await this.dbFabric.searchDocuments(WAREHOUSE_METRICS_INDEX, {
      tenantId,
    });

    const metrics = metricsResult.isSuccess ? (metricsResult.data ?? []) : [];

    // Build health summary â€” read-only
    const metricCount = metrics.length;
    const latestMetric = (metrics[0] as Record<string, unknown>) ?? null;
    const lastActivityAt = (latestMetric?.['aggregatedAt'] as string) ?? null;

    const status = metricsResult.isSuccess ? 'HEALTHY' : 'DEGRADED';

    const healthSummary: Record<string, unknown> = {
      tenantId,
      checkType,
      status,
      metricCount,
      lastActivityAt,
      checkedAt: new Date().toISOString(),
    };

    // IR-1: No storeDocument, no enqueue â€” read-only result only
    // IR-3: No F425 audit for reads
    return DataProcessResult.success(healthSummary);
  }

  /**
   * Read historical health snapshots for the tenant.
   * IR-1: Read-only. IR-2: Tenant-scoped.
   */
  async getHealthHistory(
    _event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();

    // IR-2: tenant-scoped read
    const result = await this.dbFabric.searchDocuments(WAREHOUSE_HEALTH_INDEX, {
      tenantId,
    });

    if (!result.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        result.errorMessage ?? 'Failed to fetch health history',
      );
    }

    return DataProcessResult.success({
      tenantId,
      entries: result.data ?? [],
      entryCount: (result.data ?? []).length,
    });
  }
}
