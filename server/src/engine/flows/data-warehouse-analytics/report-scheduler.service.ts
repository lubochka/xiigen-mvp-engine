/**
 * T179 ReportScheduler [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Schedules warehouse report generation jobs at tenant-configured times.
 *
 * Iron rules:
 *   IR-1: scheduleAt must be in the future at time of scheduling.
 *   IR-2: Report configurations are FREEDOM config â€” tenant-editable.
 *   IR-3: storeDocument(scheduledReport) BEFORE enqueue(ReportScheduled). DNA-8.
 *
 * Emits: warehouse.report.scheduled
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SCHEDULED_REPORTS_INDEX = 'xiigen-scheduled-reports';

@Injectable()
export class ReportSchedulerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T179',
        serviceName: 'ReportSchedulerService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Schedule a warehouse report for future generation.
   * IR-1: scheduleAt must be in the future.
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async scheduleReport(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const reportType = event['reportType'] as string;
    const scheduleAt = event['scheduleAt'] as string;
    const reportConfig = (event['reportConfig'] as Record<string, unknown>) ?? {};

    if (!reportType || !scheduleAt) {
      return DataProcessResult.failure('MISSING_FIELDS', 'reportType and scheduleAt are required');
    }

    // IR-1: scheduleAt must be in the future
    const scheduleTime = new Date(scheduleAt).getTime();
    if (isNaN(scheduleTime) || scheduleTime <= Date.now()) {
      return DataProcessResult.failure(
        'INVALID_SCHEDULE',
        'scheduleAt must be a valid future timestamp',
      );
    }

    const now = new Date().toISOString();
    const reportId = `report-${tenantId}-${reportType}-${Date.now()}`;

    const scheduledReport: Record<string, unknown> = {
      reportId,
      tenantId,
      reportType,
      scheduleAt,
      reportConfig, // IR-2: tenant-editable via FREEDOM config
      status: 'SCHEDULED',
      scheduledAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(
      SCHEDULED_REPORTS_INDEX,
      scheduledReport,
      reportId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseReportScheduled', {
      tenantId,
      reportId,
      reportType,
      scheduleAt,
      scheduledAt: now,
    });

    return DataProcessResult.success({ reportId, reportType, scheduleAt });
  }
}
