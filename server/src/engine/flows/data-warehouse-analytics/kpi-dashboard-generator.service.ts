/**
 * T175 KPIDashboardGenerator [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Generates KPI snapshots for tenant dashboards, evaluating configured thresholds.
 *
 * Iron rules:
 *   IR-1: KPI values are tenant-scoped.
 *   IR-2: alertFired must be computed against FREEDOM config thresholds â€” never hardcoded. CF-13-1.
 *   IR-3: storeDocument(snapshot) BEFORE enqueue(KPISnapshotGenerated). DNA-8.
 *
 * Emits: warehouse.kpi.snapshot
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_METRICS_INDEX = 'xiigen-warehouse-metrics';
const KPI_SNAPSHOTS_INDEX = 'xiigen-kpi-snapshots';
const FREEDOM_INDEX = 'freedom_configs';

@Injectable()
export class KPIDashboardGeneratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T175',
        serviceName: 'KPIDashboardGeneratorService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Generate a KPI snapshot for the tenant dashboard.
   * IR-2: alertFired computed against FREEDOM config thresholds.
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async generateSnapshot(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const kpiType = event['kpiType'] as string;
    const snapshotPeriod = event['snapshotPeriod'] as string;

    // Fetch current metrics for this KPI â€” IR-1: tenant-scoped
    const metricsResult = await this.dbFabric.searchDocuments(WAREHOUSE_METRICS_INDEX, {
      tenantId,
      metricType: kpiType,
    });

    if (!metricsResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch metrics: ${metricsResult.errorMessage ?? 'unknown'}`,
      );
    }

    const metrics = (metricsResult.data ?? []) as Array<Record<string, unknown>>;
    const latestMetric = metrics[0] as Record<string, unknown> | undefined;
    const kpiValue = (latestMetric?.['aggregatedValue'] as number) ?? 0;

    // IR-2: Read alert thresholds from FREEDOM config â€” never hardcoded
    const thresholds = await this.getAlertThresholds(kpiType);
    const alertFired = this.evaluateThreshold(kpiValue, thresholds);

    const now = new Date().toISOString();
    const snapshotId = `kpi-${tenantId}-${kpiType}-${snapshotPeriod}`;

    const snapshot: Record<string, unknown> = {
      snapshotId,
      tenantId,
      kpiType,
      kpiValue,
      snapshotPeriod,
      alertFired,
      thresholds,
      generatedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(KPI_SNAPSHOTS_INDEX, snapshot, snapshotId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseKPISnapshotGenerated', {
      tenantId,
      snapshotId,
      kpiType,
      kpiValue,
      snapshotPeriod,
      alertFired,
      generatedAt: now,
    });

    return DataProcessResult.success({ snapshotId, kpiValue, alertFired });
  }

  /**
   * Read alert thresholds from FREEDOM config. IR-2.
   * Key format: "warehouse_kpi_thresholds_{kpiType}"
   */
  private async getAlertThresholds(kpiType: string): Promise<Record<string, unknown>> {
    const configKey = `warehouse_kpi_thresholds_${kpiType}`;
    const result = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      config_key: configKey,
      task_type: 'xiigen-engine',
    });
    if (result.isSuccess && (result.data ?? []).length > 0) {
      const val = (result.data![0] as Record<string, unknown>)['config_value'];
      if (val && typeof val === 'object') return val as Record<string, unknown>;
    }
    return {};
  }

  private evaluateThreshold(value: number, thresholds: Record<string, unknown>): boolean {
    const criticalMin = thresholds['criticalMin'] as number | undefined;
    const criticalMax = thresholds['criticalMax'] as number | undefined;
    if (criticalMin !== undefined && value < criticalMin) return true;
    if (criticalMax !== undefined && value > criticalMax) return true;
    return false;
  }
}
