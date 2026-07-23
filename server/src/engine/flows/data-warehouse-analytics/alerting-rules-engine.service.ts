/**
 * T183 AlertingRulesEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Evaluates alert rules against current metric values for a tenant.
 *
 * Iron rules:
 *   IR-1: Alert rules are FREEDOM config â€” tenant-configurable.
 *   IR-2: Alert evaluation is tenant-scoped.
 *   IR-3: Alert emission must include tenantId.
 *   IR-4: storeDocument(alertRecord) BEFORE enqueue (alert event). DNA-8.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_METRICS_INDEX = 'xiigen-warehouse-metrics';
const ALERT_RECORDS_INDEX = 'xiigen-alert-records';
const FREEDOM_INDEX = 'freedom_configs';

@Injectable()
export class AlertingRulesEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T183',
        serviceName: 'AlertingRulesEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Evaluate alert rules against current metric values.
   * IR-1: Rules from FREEDOM config. IR-2: tenant-scoped. IR-3: tenantId in emission.
   */
  async evaluate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const metricType = event['metricType'] as string;

    if (!metricType) {
      return DataProcessResult.failure('MISSING_FIELDS', 'metricType is required');
    }

    // IR-1: Rules from FREEDOM config â€” tenant-configurable
    const rules = await this.getAlertRules(tenantId, metricType);

    // IR-2: Fetch current metric â€” tenant-scoped
    const metricsResult = await this.dbFabric.searchDocuments(WAREHOUSE_METRICS_INDEX, {
      tenantId,
      metricType,
    });

    const metrics = metricsResult.isSuccess ? (metricsResult.data ?? []) : [];
    const currentValue =
      ((metrics[0] as Record<string, unknown>)?.['aggregatedValue'] as number) ?? 0;

    const firedAlerts: Record<string, unknown>[] = [];

    for (const rule of rules) {
      const r = rule as Record<string, unknown>;
      const threshold = r['threshold'] as number;
      const operator = r['operator'] as string;
      const alertName = r['alertName'] as string;

      let fired = false;
      if (operator === 'GT' && currentValue > threshold) fired = true;
      if (operator === 'LT' && currentValue < threshold) fired = true;
      if (operator === 'GTE' && currentValue >= threshold) fired = true;
      if (operator === 'LTE' && currentValue <= threshold) fired = true;

      if (fired) {
        firedAlerts.push({ alertName, threshold, operator, currentValue });
      }
    }

    if (firedAlerts.length === 0) {
      return DataProcessResult.success({ evaluated: true, alertsFired: 0 });
    }

    const now = new Date().toISOString();
    const alertId = `alert-${tenantId}-${metricType}-${Date.now()}`;

    const alertRecord: Record<string, unknown> = {
      alertId,
      tenantId, // IR-3: tenantId always present
      metricType,
      currentValue,
      firedAlerts,
      evaluatedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(ALERT_RECORDS_INDEX, alertRecord, alertId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseAlertFired', {
      tenantId, // IR-3
      alertId,
      metricType,
      currentValue,
      firedAlerts,
      evaluatedAt: now,
    });

    return DataProcessResult.success({ alertId, alertsFired: firedAlerts.length, firedAlerts });
  }

  /**
   * IR-1: Read alert rules from FREEDOM config.
   * Key: "warehouse_alert_rules_{metricType}"
   */
  private async getAlertRules(tenantId: string, metricType: string): Promise<unknown[]> {
    const configKey = `warehouse_alert_rules_${metricType}`;
    const result = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      config_key: configKey,
      tenantId,
    });
    if (result.isSuccess && (result.data ?? []).length > 0) {
      const val = (result.data![0] as Record<string, unknown>)['config_value'];
      if (Array.isArray(val)) return val;
    }
    return [];
  }
}
