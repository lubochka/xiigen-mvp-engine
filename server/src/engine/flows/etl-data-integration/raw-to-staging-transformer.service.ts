/**
 * T217 RawToStagingTransformer [transform]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Promote records from raw zone to staging zone (CF-192 zone promotion order).
 * Normalize, validate schema, idempotent upsert to staging, emit StagingRecordWritten.
 * On any normalization error → quarantine record, emit RecordQuarantined.
 *
 * Iron rules:
 *   IR-1: Zone promotion raw→staging only (CF-192) — no zone skipping.
 *   IR-2: On any normalization error → quarantine record, emit RecordQuarantined.
 *   IR-3: Idempotent upsert via idempotencyKey (DNA-7).
 *   IR-4: Schema validation MUST run before staging write.
 *   IR-5: No UPDATE/DELETE on raw zone (read-only access from raw).
 *   IR-6: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: StagingRecordWritten, RecordQuarantined, SchemaDriftDetected
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const _RAW_RECORDS_INDEX = 'xiigen-raw-records';
const STAGING_RECORDS_INDEX = 'xiigen-staging-records';
const QUARANTINE_INDEX = 'xiigen-quarantine-records';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

/** Required fields that every normalized staging record must carry */
const REQUIRED_STAGING_FIELDS = ['connectorId', 'tenantId', 'landedAt'];

export interface TransformResult {
  transformedCount: number;
  quarantinedCount: number;
  skippedCount: number;
}

@Injectable()
export class RawToStagingTransformerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T217',
        serviceName: 'RawToStagingTransformerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async transform(event: Record<string, unknown>): Promise<DataProcessResult<TransformResult>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const jobId = event['jobId'] as string;
    const rawRecords = (event['rawRecords'] as Record<string, unknown>[]) ?? [];

    if (!connectorId || !jobId) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'connectorId and jobId are required');
    }

    let transformedCount = 0;
    let quarantinedCount = 0;
    let skippedCount = 0;

    for (const rawRecord of rawRecords) {
      // Null/non-object guard
      if (!rawRecord || typeof rawRecord !== 'object') {
        const qKey = `quarantine:${tenantId}:${connectorId}:${Date.now()}`;
        await this.dbFabric.storeDocument(
          QUARANTINE_INDEX,
          {
            connectorId,
            tenantId,
            knowledgeScope: 'PRIVATE',
            reason: 'NORMALIZATION_FAILED',
            rawRecord,
            quarantinedAt: new Date().toISOString(),
            zone: 'raw',
          },
          qKey,
        );
        await this.queueFabric.enqueue('RecordQuarantined', {
          connectorId,
          tenantId,
          reason: 'NORMALIZATION_FAILED',
        });
        quarantinedCount++;
        continue;
      }

      const recordId =
        (rawRecord['recordId'] as string) ?? `${jobId}-${Date.now()}-${Math.random()}`;
      const idempotencyKey = `staging:${tenantId}:${connectorId}:${recordId}`;

      // IR-3: Idempotency check (DNA-7) — before write
      const dupCheck = await this.dbFabric.searchDocuments(IDEMPOTENCY_INDEX, {
        idempotencyKey,
        tenantId,
      });
      if (dupCheck.isSuccess && Array.isArray(dupCheck.data) && dupCheck.data.length > 0) {
        skippedCount++;
        continue;
      }

      // IR-4: Normalize record
      const normalizeResult = this.normalizeRecord(rawRecord, connectorId, tenantId);
      if (!normalizeResult.valid) {
        const qKey = `quarantine:${tenantId}:${connectorId}:${recordId}`;
        await this.dbFabric.storeDocument(
          QUARANTINE_INDEX,
          {
            connectorId,
            tenantId,
            knowledgeScope: 'PRIVATE',
            reason: normalizeResult.reason ?? 'NORMALIZATION_FAILED',
            rawRecord,
            quarantinedAt: new Date().toISOString(),
            zone: 'raw',
          },
          qKey,
        );
        await this.queueFabric.enqueue('RecordQuarantined', {
          connectorId,
          tenantId,
          recordId,
          reason: normalizeResult.reason,
        });
        quarantinedCount++;
        continue;
      }

      // IR-4: Schema validation before staging write
      const schemaValid = this.validateStagingSchema(normalizeResult.record!);
      if (!schemaValid) {
        const qKey = `quarantine:${tenantId}:${connectorId}:${recordId}:schema`;
        await this.dbFabric.storeDocument(
          QUARANTINE_INDEX,
          {
            connectorId,
            tenantId,
            knowledgeScope: 'PRIVATE',
            reason: 'SCHEMA_VALIDATION_FAILED',
            rawRecord,
            quarantinedAt: new Date().toISOString(),
            zone: 'raw',
          },
          qKey,
        );
        await this.queueFabric.enqueue('RecordQuarantined', {
          connectorId,
          tenantId,
          recordId,
          reason: 'SCHEMA_VALIDATION_FAILED',
        });
        quarantinedCount++;
        continue;
      }

      // IR-1: Write to staging zone only (raw→staging, CF-192)
      // IR-6: storeDocument BEFORE enqueue (DNA-8)
      const stagingDoc: Record<string, unknown> = {
        ...normalizeResult.record,
        knowledgeScope: 'PRIVATE',
        promotedAt: new Date().toISOString(),
        zone: 'staging',
        jobId,
      };

      const storeResult = await this.dbFabric.storeDocument(
        STAGING_RECORDS_INDEX,
        stagingDoc,
        `staging:${idempotencyKey}`,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'STORE_FAILED',
          storeResult.errorMessage ?? 'Staging write failed',
        );
      }

      // Mark idempotency
      await this.dbFabric.storeDocument(
        IDEMPOTENCY_INDEX,
        {
          idempotencyKey,
          tenantId,
          usedAt: new Date().toISOString(),
        },
        idempotencyKey,
      );

      await this.queueFabric.enqueue('StagingRecordWritten', {
        connectorId,
        tenantId,
        recordId,
        jobId,
        writtenAt: new Date().toISOString(),
      });

      transformedCount++;
    }

    return DataProcessResult.success({ transformedCount, quarantinedCount, skippedCount });
  }

  /** Normalize a raw record — returns valid:false with reason on any failure */
  private normalizeRecord(
    raw: Record<string, unknown>,
    connectorId: string,
    tenantId: string,
  ): { valid: boolean; record?: Record<string, unknown>; reason?: string } {
    try {
      const normalized: Record<string, unknown> = { ...raw };

      // Ensure required fields
      normalized['connectorId'] = connectorId;
      normalized['tenantId'] = tenantId;
      if (!normalized['landedAt']) {
        normalized['landedAt'] = new Date().toISOString();
      }

      // Coerce date strings
      if (normalized['timestamp'] && typeof normalized['timestamp'] === 'string') {
        try {
          normalized['timestamp'] = new Date(normalized['timestamp'] as string).toISOString();
        } catch {
          return { valid: false, reason: 'INVALID_TIMESTAMP' };
        }
      }

      return { valid: true, record: normalized };
    } catch {
      return { valid: false, reason: 'NORMALIZATION_FAILED' };
    }
  }

  /** Validate that a normalized record has required staging schema fields */
  private validateStagingSchema(record: Record<string, unknown>): boolean {
    return REQUIRED_STAGING_FIELDS.every((field) => field in record && record[field] !== undefined);
  }
}
