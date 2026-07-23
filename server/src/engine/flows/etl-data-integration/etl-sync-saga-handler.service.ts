/**
 * T214 EtlSyncSagaHandler [ingestion]
 * FLOW-14: ETL & Data Integration
 *
 * EP-4 durable sync saga: rate_check → poll_page → land_raw → commit_cursor.
 *
 * Iron rules:
 *   IR-1: F430 rate check at ORDER 1 before any external call (EP-4).
 *   IR-2: Raw zone append-only — storeDocument insert only, no UPDATE/DELETE (CF-192).
 *   IR-3: Cursor must be monotonically increasing — ICursorCheckpointService (CF-193).
 *   IR-4: commit_cursor at ORDER 4 — AFTER land_raw completes (not before). DNA-8.
 *   IR-5: Normalization error → quarantine, emit RecordQuarantined. Never silent drop.
 *   IR-6: SyncJobFailed includes lastCursorPosition for crash recovery.
 *
 * Emits: SyncJobCompleted, SyncJobFailed, RecordQuarantined, DuplicateIngestionDetected, RateLimitExhausted
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { RATE_LIMIT_GUARD_SERVICE, CURSOR_CHECKPOINT_SERVICE } from './etl-platform-tokens';

interface IRateLimitGuardService {
  checkRateLimit(
    connectorId: string,
    operation: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }>;
}

interface ICursorCheckpointService {
  loadCheckpoint(jobId: string): Promise<{ cursor: string } | null>;
  validateMonotonic(jobId: string, newCursor: string): Promise<boolean>;
  saveCheckpoint(jobId: string, cursor: string, metadata?: Record<string, unknown>): Promise<void>;
}

const RAW_RECORDS_INDEX = 'xiigen-raw-records';
const QUARANTINE_INDEX = 'xiigen-quarantine-records';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

export interface EtlSyncSagaInput {
  jobId: string;
  connectorId: string;
  pageData: Record<string, unknown>[];
  nextCursor: string;
}

@Injectable()
export class EtlSyncSagaHandlerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RATE_LIMIT_GUARD_SERVICE) private readonly rateLimitGuard: IRateLimitGuardService,
    @Inject(CURSOR_CHECKPOINT_SERVICE) private readonly cursorCheckpoint: ICursorCheckpointService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T214',
        serviceName: 'EtlSyncSagaHandlerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async runSagaCycle(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const jobId = event['jobId'] as string;
    const connectorId = event['connectorId'] as string;
    const pageData = (event['pageData'] as Record<string, unknown>[]) ?? [];
    const nextCursor = event['nextCursor'] as string;

    if (!jobId || !connectorId) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'jobId and connectorId are required');
    }

    let lastCursorPosition: string | undefined;

    // Load current checkpoint for crash recovery reference
    const checkpoint = await this.cursorCheckpoint.loadCheckpoint(jobId);
    lastCursorPosition = checkpoint?.cursor;

    // ORDER 1: Rate check — IR-1 (EP-4 step 1)
    const rateCheck = await this.rateLimitGuard.checkRateLimit(connectorId, 'poll');
    if (!rateCheck.allowed) {
      await this.queueFabric.enqueue('RateLimitExhausted', {
        jobId,
        connectorId,
        tenantId,
        retryAfterMs: rateCheck.retryAfterMs,
      });
      return DataProcessResult.failure('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
    }

    // ORDER 2: poll_page already provided as pageData (EP-4 step 2 — poll occurred upstream)

    // ORDER 3: land_raw — append-only (EP-4 step 3, CF-192, IR-2)
    let landedCount = 0;
    for (const record of pageData) {
      // Normalize check FIRST — IR-5 (must guard before property access)
      if (!record || typeof record !== 'object') {
        const quarantineKey = `${jobId}-${Date.now()}-${Math.random()}`;
        const idempotencyKey = `${tenantId}:${connectorId}:${quarantineKey}`;
        await this.dbFabric.storeDocument(
          QUARANTINE_INDEX,
          {
            connectorId,
            tenantId,
            knowledgeScope: 'PRIVATE',
            reason: 'NORMALIZATION_FAILED',
            rawRecord: record,
            quarantinedAt: new Date().toISOString(),
          },
          `quarantine:${idempotencyKey}`,
        );
        await this.queueFabric.enqueue('RecordQuarantined', { connectorId, tenantId });
        continue;
      }

      const recordId = (record['recordId'] as string) ?? `${jobId}-${Date.now()}-${Math.random()}`;
      const idempotencyKey = `${tenantId}:${connectorId}:${recordId}`;

      // Duplicate check
      const dupCheck = await this.dbFabric.searchDocuments(IDEMPOTENCY_INDEX, {
        idempotencyKey,
        tenantId,
      });
      if (dupCheck.isSuccess && Array.isArray(dupCheck.data) && dupCheck.data.length > 0) {
        await this.queueFabric.enqueue('DuplicateIngestionDetected', { recordId, connectorId, tenantId });
        continue;
      }

      // Append-only raw write — IR-2
      const storeResult = await this.dbFabric.storeDocument(
        RAW_RECORDS_INDEX,
        {
          ...record,
          tenantId,
          connectorId,
          knowledgeScope: 'PRIVATE',
          landedAt: new Date().toISOString(),
        },
        `raw:${idempotencyKey}`,
      );

      if (!storeResult.isSuccess) {
        await this.queueFabric.enqueue('SyncJobFailed', {
          jobId,
          connectorId,
          tenantId,
          reason: 'STORE_FAILED',
          lastCursorPosition,
        });
        return DataProcessResult.failure(
          'STORE_FAILED',
          storeResult.errorMessage ?? 'Store failed',
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

      landedCount++;
    }

    // ORDER 4: commit_cursor — AFTER land_raw (EP-4 step 4, CF-193, IR-3, IR-4)
    if (nextCursor) {
      const isMonotonic = await this.cursorCheckpoint.validateMonotonic(jobId, nextCursor);
      if (!isMonotonic) {
        await this.queueFabric.enqueue('SyncJobFailed', {
          jobId,
          connectorId,
          tenantId,
          reason: 'CURSOR_NOT_MONOTONIC',
          lastCursorPosition,
        });
        return DataProcessResult.failure(
          'CURSOR_NOT_MONOTONIC',
          'Cursor regression detected — CF-193 violation',
        );
      }
      await this.cursorCheckpoint.saveCheckpoint(jobId, nextCursor, { connectorId, tenantId });
      lastCursorPosition = nextCursor;
    }

    await this.queueFabric.enqueue('SyncJobCompleted', {
      jobId,
      connectorId,
      tenantId,
      landedCount,
      cursor: lastCursorPosition,
    });

    return DataProcessResult.success({ jobId, landedCount, cursor: lastCursorPosition });
  }
}
