/**
 * T632 SubmissionAnalyticsCollector [DATA_PIPELINE]
 * FLOW-21: Dynamic Forms & Workflows
 *
 * Entry: SubmissionProcessed event (submission available for metrics)
 *
 * Execution order is MACHINE (CF-21-4):
 *   ORDER 1: Extract analytics-safe fields; exclude PII
 *   ORDER 2: Determine aggregation window (TODAY, WEEK, MONTH)
 *   ORDER 3: Append analytics record (insert only, no update)
 *   ORDER 4: Fetch and update aggregate metrics
 *   ORDER 5: Store aggregate document
 *
 * Iron rules:
 *   IR-1: Append-only storage — never update (CF-21-4)
 *   IR-2: PII exclusion — email, phone, ssn, password never indexed (CF-21-4)
 *   IR-3: Tenant-scoped aggregation (DNA-5)
 *   IR-4: Aggregate metrics: count, avg, error rate % (CF-21-4)
 *   IR-5: Date partitioning for efficient time-series (CF-21-4)
 *
 * Pattern reference: ANALYTICS-APPEND-ONLY-001 RAG pattern from DR-21-D
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SUBMISSION_ANALYTICS_PREFIX = 'xiigen-submission-analytics';
const AGGREGATE_METRICS_INDEX = 'xiigen-aggregate-metrics';
const PII_FIELDS = new Set(['email', 'phone', 'ssn', 'password', 'creditCard', 'bankAccount']);

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class SubmissionAnalyticsCollectorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T632',
        serviceName: 'SubmissionAnalyticsCollectorService',
        flowId: 'FLOW-21',
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
   * Collect submission analytics with PII exclusion + aggregation.
   * DPO pattern: ANALYTICS-APPEND-ONLY-001
   */
  async collectAnalytics(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const submissionId = event['submissionId'] as string;
    const formId = event['formId'] as string;
    const valid = event['valid'] as boolean | undefined;
    const submissionData = event['data'] as Record<string, unknown> | undefined;
    const validationErrors = event['errors'] as Array<Record<string, unknown>> | undefined;

    if (!submissionId || !formId) {
      return DataProcessResult.failure('INVALID_INPUT', 'submissionId and formId are required');
    }

    // ── ORDER 1: Extract analytics-safe fields — IR-2, CF-21-4 ────────────
    const analyticsSafeFields: Record<string, unknown> = {};

    if (submissionData) {
      for (const [key, value] of Object.entries(submissionData)) {
        if (!PII_FIELDS.has(key)) {
          analyticsSafeFields[key] = value;
        }
      }
    }

    // ── ORDER 2: Determine aggregation window — IR-5, CF-21-4 ────────────
    const now = new Date();
    const dateWindow = this.getDateWindow(now); // 'TODAY', 'WEEK', 'MONTH'
    const datePartition = this.getDatePartition(now); // 'YYYY-MM-DD'
    const analyticsIndex = `${SUBMISSION_ANALYTICS_PREFIX}-${datePartition}`;

    // ── ORDER 3: Append analytics record — IR-1, CF-21-4 ────────────────
    const analyticsRecord: Record<string, unknown> = {
      recordId: `analytics-${submissionId}`,
      submissionId,
      formId,
      tenantId,
      valid,
      fieldCount: submissionData ? Object.keys(submissionData).length : 0,
      analyticsSafeFieldCount: Object.keys(analyticsSafeFields).length,
      validationErrorCount: validationErrors ? validationErrors.length : 0,
      recordedAt: now.toISOString(),
      dateWindow,
    };

    const storeResult = await this.dbFabric.storeDocument(
      analyticsIndex,
      analyticsRecord,
      `${tenantId}::${submissionId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'ANALYTICS_STORE_FAILED',
        `Failed to store analytics record: ${submissionId}`,
      );
    }

    // ── ORDER 4: Fetch and update aggregate metrics — IR-4 ──────────────
    const aggregateKey = `${tenantId}::${formId}::${dateWindow}`;
    const aggregateResult = await this.dbFabric.searchDocuments(AGGREGATE_METRICS_INDEX, {
      tenantId,
      formId,
      dateWindow,
    });

    let aggregateMetrics: Record<string, unknown>;

    if (aggregateResult.isSuccess && (aggregateResult.data ?? []).length > 0) {
      // Update existing aggregate
      aggregateMetrics = aggregateResult.data![0] as Record<string, unknown>;
      const submitCount = ((aggregateMetrics['submitCount'] as number | undefined) ?? 0) + 1;
      const avgFieldCount = (aggregateMetrics['avgFieldCount'] as number | undefined) ?? 0;
      const validCount =
        ((aggregateMetrics['validCount'] as number | undefined) ?? 0) + (valid ? 1 : 0);

      aggregateMetrics = {
        ...aggregateMetrics,
        submitCount,
        validCount,
        invalidCount: submitCount - validCount,
        avgFieldCount:
          submitCount > 0
            ? (avgFieldCount * (submitCount - 1) +
                (submissionData ? Object.keys(submissionData).length : 0)) /
              submitCount
            : 0,
        errorRate: submitCount > 0 ? ((submitCount - validCount) / submitCount) * 100 : 0,
        lastUpdateAt: now.toISOString(),
      };
    } else {
      // Create new aggregate
      aggregateMetrics = {
        aggregateId: aggregateKey,
        tenantId,
        formId,
        dateWindow,
        submitCount: 1,
        validCount: valid ? 1 : 0,
        invalidCount: valid ? 0 : 1,
        avgFieldCount: submissionData ? Object.keys(submissionData).length : 0,
        errorRate: valid ? 0 : 100,
        createdAt: now.toISOString(),
        lastUpdateAt: now.toISOString(),
      };
    }

    // ── ORDER 5: Store aggregate document — IR-1, IR-4 ──────────────────
    const aggregateStoreResult = await this.dbFabric.storeDocument(
      AGGREGATE_METRICS_INDEX,
      aggregateMetrics,
      aggregateKey,
    );

    if (!aggregateStoreResult.isSuccess) {
      return DataProcessResult.failure(
        'METRICS_UPDATE_FAILED',
        `Failed to update aggregate metrics for ${formId}`,
      );
    }

    return DataProcessResult.success({
      submissionId,
      formId,
      analyticsRecorded: true,
      aggregateUpdated: true,
      dateWindow,
      timestamp: now.toISOString(),
    });
  }

  /**
   * Get aggregation window based on current date.
   */
  private getDateWindow(_date: Date): string {
    // For now, always return 'TODAY'
    // Could expand to 'WEEK', 'MONTH' based on config
    return 'TODAY';
  }

  /**
   * Get date partition for index naming (YYYY-MM-DD).
   */
  private getDatePartition(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
