/**
 * AnalyticsRagSeed — RAG patterns for FLOW-13 analytics domain.
 * Extends FlowRagSeedBase; provides metric idempotency, KPI cooldown, cohort patterns.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class AnalyticsRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-13-analytics';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F13-AN-PAT-001',
        namespace: 'analytics',
        pattern: 'metric_idempotency_window',
        description:
          'T175 metric aggregation uses a TTL-windowed idempotency key to prevent duplicate metric counts ' +
          'within a time window. Window TTL is read from flow13_metric_window_ttl FREEDOM config (default 3600s).',
        codeExample:
          "const ttl = await this.freedomConfig.get('flow13_metric_window_ttl', 3600);\n" +
          'const windowKey = `metric:${metricName}:${tenantId}:${Math.floor(Date.now() / (ttl * 1000))}`;\n' +
          "const already = await this.db.searchDocuments('metric_windows', { windowKey });\n" +
          'if (already.isSuccess && already.data.length > 0) {\n' +
          '  return DataProcessResult.success({ deduplicated: true });\n' +
          '}\n' +
          "await this.db.storeDocument('metric_windows', { windowKey, value, recordedAt: new Date().toISOString() });",
        tags: ['metrics', 'idempotency', 'TTL', 'T175', 'freedom-config', 'aggregation'],
        flowId: 'FLOW-13',
      },
      {
        patternId: 'F13-AN-PAT-002',
        namespace: 'analytics',
        pattern: 'kpi_alert_cooldown',
        description:
          'T176 KPI alert firing is rate-limited by flow13_kpi_alert_cooldown (default 300s). ' +
          'Check last alert timestamp before firing. Store last-fired timestamp after each alert to enforce cooldown.',
        codeExample:
          "const cooldown = await this.freedomConfig.get('flow13_kpi_alert_cooldown', 300);\n" +
          "const lastFired = await this.db.searchDocuments('kpi_alert_log', { tenantId, kpiName });\n" +
          'if (lastFired.isSuccess && lastFired.data.length > 0) {\n' +
          '  const elapsed = (Date.now() - new Date(lastFired.data[0].firedAt).getTime()) / 1000;\n' +
          '  if (elapsed < cooldown) {\n' +
          '    return DataProcessResult.success({ suppressed: true, cooldownRemaining: cooldown - elapsed });\n' +
          '  }\n' +
          '}\n' +
          "await this.db.storeDocument('kpi_alert_log', { tenantId, kpiName, firedAt: new Date().toISOString() });\n" +
          "await this.queueService.enqueue('kpi-alerts', alertEvent);",
        tags: ['KPI', 'alert', 'cooldown', 'T176', 'rate-limit', 'freedom-config'],
        flowId: 'FLOW-13',
      },
      {
        patternId: 'F13-AN-PAT-003',
        namespace: 'analytics',
        pattern: 'cohort_analysis_tenant_scoped',
        description:
          'Cohort analysis queries must be scoped to tenant via AsyncLocalStorage — never pass tenantId as a ' +
          'parameter to fabric methods. Cohort segments are stored as Record<string, unknown> — no typed cohort model classes.',
        codeExample:
          '// tenantId flows through AsyncLocalStorage — fabric reads it automatically\n' +
          "const cohortData = await this.db.searchDocuments('cohort_segments', {\n" +
          '  segmentType: cohortRequest.segmentType,\n' +
          "  status: 'active',\n" +
          '});\n' +
          'return DataProcessResult.success(cohortData.data);',
        tags: ['cohort', 'analytics', 'tenant-scope', 'DNA-5', 'DNA-2'],
        flowId: 'FLOW-13',
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'F13-AN-BFA-001',
        ruleId: 'CF-FLOW13-AN-1',
        rule: 'All analytics task types (T174-T182): cross-flow data joins MUST include tenantId predicate. No cross-tenant correlation permitted.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T174-T182',
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'F13-AN-DR-001',
        title: 'ADR-F13-AN-001: Tenant-scoped analytics with TTL-windowed idempotency',
        status: 'ACCEPTED',
        flowId: 'FLOW-13',
        rationale:
          'Analytics aggregations require idempotency to prevent double-counting on replays. ' +
          'TTL-windowed keys ensure deduplication without unbounded key growth.',
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }
}
