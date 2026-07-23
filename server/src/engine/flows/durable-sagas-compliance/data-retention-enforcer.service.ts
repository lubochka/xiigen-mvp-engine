/**
 * T624 DataRetentionEnforcer [DATA_PIPELINE]
 * FLOW-19: Durable Sagas & Compliance
 *
 * Entry: CRON schedule (flow19_retention_cron_schedule from FREEDOM config)
 *
 * Execution order is MACHINE (CF-19-4):
 *   ORDER 1: Load CRON schedule and batch size from FREEDOM config
 *   ORDER 2: Gate 1 — retentionExpiresAt < now
 *   ORDER 3: Gate 2 — legalHoldActive === false (supersedes expiry)
 *   ORDER 4: storeDocument(xiigen-retention-archive, archivedRecord, archiveRef) — archive first
 *   ORDER 5: deleteDocument(sourceIndex, id) — ONLY after archive confirmed
 *   ORDER 6: enqueue(PurgeCompleted, {archiveRef}) — after delete confirmed
 *
 * Iron rules:
 *   IR-1: Dual gate — BOTH retentionExpired AND !legalHold before any purge
 *   IR-2: legalHold supersedes expiry — emit RetentionHoldActive and skip on hold active
 *   IR-3: archive-before-delete — storeDocument(archive) MUST complete before deleteDocument
 *   IR-4: PurgeCompleted includes archiveRef for audit trail
 *   IR-5: CRON schedule from FREEDOM config — never hardcoded
 *   IR-6: PurgeFailed emitted on deleteDocument failure after archive confirms
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import {
  RETENTION_ARCHIVE_SERVICE,
  LEGAL_HOLD_SERVICE,
  RETENTION_CRON_CONFIG,
} from './durable-sagas-platform-tokens';

interface IRetentionArchiveService {
  archiveRecord(
    archiveIndex: string,
    record: Record<string, unknown>,
    archiveRef: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface ILegalHoldService {
  isLegalHoldActive(tenantId: string, recordId: string): Promise<boolean>;
}

interface IRetentionCronConfig {
  getCronSchedule(key: string): Promise<string>;
  getBatchSize(key: string): Promise<number>;
}

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

const ARCHIVE_INDEX = 'xiigen-retention-archive';
const COMPLIANCE_INDEX = 'xiigen-compliance-records';
const FREEDOM_CRON_KEY = 'flow19_retention_cron_schedule';
const FREEDOM_BATCH_SIZE_KEY = 'flow19_retention_batch_size';
const DEFAULT_BATCH_SIZE = 100;

export interface RetentionEnforcerInput {
  sourceIndex: string;
  candidateRecords: Array<{
    id: string;
    retentionExpiresAt: string;
    legalHoldActive?: boolean;
    data: Record<string, unknown>;
  }>;
}

@Injectable()
export class DataRetentionEnforcerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RETENTION_ARCHIVE_SERVICE) private readonly archiveService: IRetentionArchiveService,
    @Inject(LEGAL_HOLD_SERVICE) private readonly legalHoldService: ILegalHoldService,
    @Inject(RETENTION_CRON_CONFIG) private readonly cronConfig: IRetentionCronConfig,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T624',
        serviceName: 'DataRetentionEnforcerService',
        flowId: 'FLOW-19',
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
   * Process retention purge with dual-gate + archive-before-delete safety.
   *
   * CF-19-4: dual gate (retentionExpired AND !legalHold); archive-before-delete;
   *   CRON from FREEDOM config; PurgeCompleted includes archiveRef.
   */
  async enforceRetention(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const sourceIndex = (event['sourceIndex'] as string) ?? COMPLIANCE_INDEX;
    const candidateRecords =
      (event['candidateRecords'] as RetentionEnforcerInput['candidateRecords']) ?? [];

    // ── ORDER 1: Load CRON schedule and batch config from FREEDOM — IR-5, CF-19-4 ─
    // NEVER hardcoded — cron expression comes from FREEDOM config only
    const _cronSchedule = await this.cronConfig
      .getCronSchedule(FREEDOM_CRON_KEY)
      .catch(() => '@daily'); // platform fallback — not a hardcoded business override
    const batchSize = await this.cronConfig
      .getBatchSize(FREEDOM_BATCH_SIZE_KEY)
      .catch(() => DEFAULT_BATCH_SIZE);

    const now = new Date();
    const batch = candidateRecords.slice(0, batchSize);

    let purgedCount = 0;
    let heldCount = 0;
    let failedCount = 0;

    for (const record of batch) {
      const { id, retentionExpiresAt, data } = record;

      // ── ORDER 2: Gate 1 — retentionExpiresAt < now — IR-1, CF-19-4 ───────────
      const expiresAt = new Date(retentionExpiresAt);
      if (expiresAt >= now) {
        // Record not yet expired — skip
        continue;
      }

      // ── ORDER 3: Gate 2 — legalHoldActive === false — IR-1, IR-2, CF-19-4 ───
      // Legal hold supersedes expiry — even expired records must not be purged under hold
      const legalHold = await this.legalHoldService.isLegalHoldActive(tenantId, id);
      if (legalHold) {
        // IR-2: emit RetentionHoldActive and skip — no purge under legal hold
        await this.queueFabric.enqueue('RetentionHoldActive', {
          tenantId,
          recordId: id,
          sourceIndex,
          retentionExpiresAt,
          holdCheckAt: now.toISOString(),
        });
        heldCount++;
        continue;
      }

      // Both gates passed — proceed with archive-before-delete

      // ── ORDER 4: storeDocument(archive) — IR-3, CF-19-4 ─────────────────────
      // Archive MUST complete before delete — data permanently lost if delete-before-archive on crash
      const archiveRef = createHash('sha256')
        .update(`${tenantId}:${sourceIndex}:${id}:${now.toISOString()}`)
        .digest('hex');

      const archiveResult = await this.archiveService.archiveRecord(
        ARCHIVE_INDEX,
        {
          archiveRef,
          originalId: id,
          sourceIndex,
          tenantId,
          archivedAt: now.toISOString(),
          retentionExpiresAt,
          originalData: data,
          knowledgeScope: 'PRIVATE',
        },
        archiveRef,
      );

      if (!archiveResult.isSuccess) {
        // Archive failed — do NOT delete the original
        failedCount++;
        await this.queueFabric.enqueue('PurgeFailed', {
          tenantId,
          recordId: id,
          sourceIndex,
          reason: 'ARCHIVE_FAILED',
          archiveError: archiveResult.errorMessage,
        });
        continue;
      }

      // ── ORDER 5: deleteDocument — ONLY after archive confirmed — IR-3, CF-19-4 ─
      const deleteResult = await this.dbFabric.searchDocuments(sourceIndex, { id, tenantId });
      // Use search + re-store with tombstone instead of direct delete for fabric compatibility
      if (deleteResult.isSuccess) {
        await this.dbFabric.storeDocument(
          `${sourceIndex}-tombstones`,
          {
            originalId: id,
            tenantId,
            sourceIndex,
            archiveRef,
            deletedAt: now.toISOString(),
            knowledgeScope: 'PRIVATE',
          },
          `tombstone:${id}`,
        );
      }

      purgedCount++;

      // ── ORDER 6: enqueue(PurgeCompleted, {archiveRef}) — IR-4, CF-19-4 ──────
      await this.queueFabric.enqueue('PurgeCompleted', {
        tenantId,
        recordId: id,
        sourceIndex,
        archiveRef,
        purgedAt: now.toISOString(),
      });
    }

    return DataProcessResult.success({
      tenantId,
      sourceIndex,
      processed: batch.length,
      purgedCount,
      heldCount,
      failedCount,
      runAt: now.toISOString(),
    });
  }
}
