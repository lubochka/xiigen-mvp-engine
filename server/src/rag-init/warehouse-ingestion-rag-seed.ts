/**
 * WarehouseIngestionRagSeed — RAG patterns for FLOW-13 warehouse ingestion domain.
 * Extends FlowRagSeedBase; provides backpressure + batchId time-window patterns.
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class WarehouseIngestionRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-13-warehouse-ingestion';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      {
        patternId: 'F13-WI-PAT-001',
        namespace: 'warehouse-ingestion',
        pattern: 'backpressure_queue_depth_threshold',
        description:
          'T169 INGESTOR must check queue depth against flow13_max_queue_depth FREEDOM config before enqueuing. ' +
          'If depth >= threshold, return DataProcessResult.failure with BACKPRESSURE code. Never enqueue unconditionally.',
        codeExample:
          "const depth = await this.queueService.getDepth('warehouse-ingest');\n" +
          "const maxDepth = await this.freedomConfig.get('flow13_max_queue_depth', 1000);\n" +
          'if (depth >= maxDepth) {\n' +
          "  return DataProcessResult.failure('BACKPRESSURE', 'Queue at capacity — batch rejected');\n" +
          '}\n' +
          "await this.queueService.enqueue('warehouse-ingest', event);",
        tags: ['backpressure', 'T169', 'ingestor', 'queue-depth', 'freedom-config'],
        flowId: 'FLOW-13',
      },
      {
        patternId: 'F13-WI-PAT-002',
        namespace: 'warehouse-ingestion',
        pattern: 'batchid_time_window_deduplication',
        description:
          'T169 batchId must encode a time window (eventWindowStart + eventWindowEnd) to scope deduplication. ' +
          'Idempotency keys must include batchId + tenantId to prevent cross-tenant collisions.',
        codeExample:
          'const batchId = `${tenantId}-${dateWindow}-${uuid}`;\n' +
          'const idempotencyKey = `warehouse-ingest:${batchId}`;\n' +
          "const existing = await this.db.searchDocuments('idempotency_keys', { key: idempotencyKey });\n" +
          'if (existing.isSuccess && existing.data.length > 0) {\n' +
          '  return DataProcessResult.success({ deduplicated: true, batchId });\n' +
          '}',
        tags: ['idempotency', 'batchId', 'time-window', 'T169', 'deduplication'],
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
        patternId: 'F13-WI-BFA-001',
        ruleId: 'CF-FLOW13-WI-1',
        rule: 'T169: IBatchQueueService.getDepth() MUST be called BEFORE IBatchQueueService.enqueue(). Queue depth gate is mandatory.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T169',
      },
      {
        patternId: 'F13-WI-BFA-002',
        ruleId: 'CF-FLOW13-WI-2',
        rule: 'T169: batchId MUST include eventWindowStart and eventWindowEnd in its hash. Missing time window = BUILD_FAILURE.',
        severity: 'ERROR',
        flowId: 'FLOW-13',
        taskType: 'T169',
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
        patternId: 'F13-WI-DR-001',
        title: 'ADR-F13-WI-001: Backpressure gate required before warehouse batch enqueue',
        status: 'ACCEPTED',
        flowId: 'FLOW-13',
        rationale:
          'Unbounded queue growth degrades warehouse write capacity. ' +
          'getDepth() check before enqueue() prevents overload.',
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
