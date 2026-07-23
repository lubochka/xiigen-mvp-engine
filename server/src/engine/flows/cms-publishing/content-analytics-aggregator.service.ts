/**
 * T636 ContentAnalyticsAggregator [DATA_PIPELINE]
 * FLOW-22: CMS Publishing
 *
 * Append-only content metrics. PII_EXCLUDED_FIELDS compile-time constant.
 * storeDocument only — no updateDocument, no deleteDocument.
 * DNA-8: storeDocument before enqueue.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const ANALYTICS_INDEX = 'xiigen-content-analytics';

/** MACHINE: PII fields excluded from analytics records — compile-time constant. */
const PII_EXCLUDED_FIELDS = ['authorEmail', 'authorIpAddress', 'editorNotes'] as const;

/** MACHINE: Valid metric types — compile-time constant. */
const VALID_METRIC_TYPES = ['VIEW', 'ENGAGEMENT', 'SHARE'] as const;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentAnalyticsAggregatorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T636',
        serviceName: 'ContentAnalyticsAggregatorService',
        flowId: 'FLOW-22',
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

  async recordMetric(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const metricType = event['metricType'] as string;

    if (!contentId || !metricType) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and metricType required');
    }

    if (!(VALID_METRIC_TYPES as readonly string[]).includes(metricType)) {
      return DataProcessResult.failure('INVALID_METRIC_TYPE', `Unknown type: ${metricType}`);
    }

    // Scrub PII fields from event before storing
    const sanitizedEvent: Record<string, unknown> = { ...event };
    for (const field of PII_EXCLUDED_FIELDS) {
      delete sanitizedEvent[field];
    }

    const recordedAt = new Date().toISOString();

    // ── Append-only storeDocument — no updateDocument, no deleteDocument ────
    await this.dbFabric.storeDocument(ANALYTICS_INDEX, {
      tenantId,
      contentId,
      metricType,
      recordedAt,
      metadata: sanitizedEvent,
      knowledgeScope: 'PRIVATE',
    });

    // ── DNA-8: storeDocument before enqueue ─────────────────────────────────
    await this.queueFabric.enqueue('AnalyticsRecorded', {
      tenantId,
      contentId,
      metricType,
      recordedAt,
    });

    return DataProcessResult.success({ tenantId, contentId, metricType, recordedAt });
  }
}
