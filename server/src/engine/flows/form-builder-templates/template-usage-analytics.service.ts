/**
 * T640 TemplateUsageAnalytics [DATA_PIPELINE]
 * FLOW-23: Form Builder Templates
 *
 * Entry: FormInstantiated event (form created from template)
 *
 * Execution order is MACHINE (CF-23-4):
 *   ORDER 1: Append-only metrics storeDocument — never updateDocument
 *   ORDER 2: PII exclusion — filter user input values from metrics
 *   ORDER 3: Popularity scoring — rank by (instantiation + submission) / age_days
 *   ORDER 4: enqueue(UsageMetricsRecorded) — enable downstream analytics
 *
 * Iron rules:
 *   IR-1: Append-only metrics at ORDER 1 — only storeDocument, never updateDocument
 *   IR-2: PII exclusion at ORDER 2 — user form input values NOT stored
 *   IR-3: Popularity scoring at ORDER 3 — computed from usage frequency
 *   IR-4: All metrics PRIVATE knowledgeScope per tenant
 *   IR-5: UsageMetricsRecorded emitted to enable downstream analytics
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const USAGE_METRICS_INDEX = 'xiigen-template-usage-metrics';
const POPULARITY_INDEX = 'xiigen-template-popularity';
const PII_EXCLUDED_FIELDS = ['formData', 'userInput', 'values', 'responseData'] as const;

@Injectable()
export class TemplateUsageAnalyticsService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private excludePii(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...data };
    for (const field of PII_EXCLUDED_FIELDS) {
      delete cleaned[field];
    }
    return cleaned;
  }

  async recordMetrics(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const templateId = event['templateId'] as string;
    const instanceId = event['instanceId'] as string;
    const metricType = event['metricType'] as string | undefined;
    const metadata = event['metadata'] as Record<string, unknown> | undefined;

    if (!templateId || !instanceId) {
      return DataProcessResult.failure('INVALID_INPUT', 'templateId and instanceId are required');
    }

    const recordedAt = new Date().toISOString();

    // ── ORDER 1: Append-only metrics storeDocument ──────────────────────────────
    const excludedMetadata = this.excludePii(metadata ?? {});

    const metricsRecord = {
      metricsId: `${templateId}:${instanceId}:${Date.now()}`,
      templateId,
      instanceId,
      tenantId,
      metricType: metricType ?? 'INSTANTIATION',
      metadata: excludedMetadata,
      recordedAt,
      knowledgeScope: 'PRIVATE',
    };

    await this.db.storeDocument(USAGE_METRICS_INDEX, metricsRecord, metricsRecord['metricsId']);

    // ── ORDER 2: PII exclusion (already done in excludePii) ────────────────────

    // ── ORDER 3: Popularity scoring ────────────────────────────────────────────
    const metricsResult = await this.db.searchDocuments(USAGE_METRICS_INDEX, { templateId });
    const allMetrics = (metricsResult.data ?? []) as Record<string, unknown>[];

    const instantiationCount = allMetrics.filter((m) => m['metricType'] === 'INSTANTIATION').length;
    const submissionCount = allMetrics.filter((m) => m['metricType'] === 'SUBMISSION').length;

    let popularityScore = 0;
    if (allMetrics.length > 0) {
      const firstMetric = allMetrics[0] as Record<string, unknown>;
      const createdAt = new Date(firstMetric['recordedAt'] as string);
      const ageDays = Math.max(
        1,
        Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      );
      popularityScore = (instantiationCount + submissionCount) / ageDays;
    }

    const popularityRecord = {
      popularityId: `${templateId}:${recordedAt}`,
      templateId,
      tenantId,
      instantiationCount,
      submissionCount,
      popularityScore,
      computedAt: recordedAt,
      knowledgeScope: 'PRIVATE',
    };

    await this.db.storeDocument(
      POPULARITY_INDEX,
      popularityRecord,
      popularityRecord['popularityId'],
    );

    // ── ORDER 4: Emit UsageMetricsRecorded ─────────────────────────────────────
    await this.queue.enqueue('UsageMetricsRecorded', {
      templateId,
      instanceId,
      tenantId,
      metricType: metricType ?? 'INSTANTIATION',
      recordedAt,
      popularityScore,
    });

    return DataProcessResult.success({
      templateId,
      instanceId,
      tenantId,
      status: 'METRICS_RECORDED',
      recordedAt,
      popularityScore,
    });
  }
}
