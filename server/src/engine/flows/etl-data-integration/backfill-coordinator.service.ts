/**
 * T216 BackfillCoordinator [ingestion]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Gap-detecting backfill over historical ranges using EP-4 durable cycle.
 *
 * Iron rules:
 *   IR-1: Gap detection MUST scan for cursor discontinuities before slice dispatch.
 *   IR-2: EP-4 cycle per slice: rate_check → poll_page → land_raw → commit_cursor.
 *   IR-3: Blackout window MUST be honored (FREEDOM: flow14_backfill_blackout_cron).
 *   IR-4: BackfillFailed MUST include failedSlice for targeted replay.
 *   IR-5: Raw zone append-only — storeDocument only, no UPDATE (CF-192).
 *   IR-6: Rate check before each slice (F430).
 *   IR-7: Cursor monotonic validation on each slice commit (CF-193).
 *   IR-8: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: BackfillCompleted, BackfillFailed, RecordQuarantined
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
const BACKFILL_JOBS_INDEX = 'xiigen-backfill-jobs';

export interface BackfillSlice {
  sliceId: string;
  fromCursor: string;
  toCursor: string;
  records: Record<string, unknown>[];
}

export interface BackfillInput {
  jobId: string;
  connectorId: string;
  slices: BackfillSlice[];
  /** ISO timestamp — reject if current time is inside blackout window */
  blackoutUntil?: string;
}

@Injectable()
export class BackfillCoordinatorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RATE_LIMIT_GUARD_SERVICE) private readonly rateLimitGuard: IRateLimitGuardService,
    @Inject(CURSOR_CHECKPOINT_SERVICE) private readonly cursorCheckpoint: ICursorCheckpointService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T216',
        serviceName: 'BackfillCoordinatorService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async coordinate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const jobId = event['jobId'] as string;
    const connectorId = event['connectorId'] as string;
    const slices = (event['slices'] as BackfillSlice[]) ?? [];
    const blackoutUntil = event['blackoutUntil'] as string | undefined;

    if (!jobId || !connectorId) {
      return DataProcessResult.failure('VALIDATION_FAILED', 'jobId and connectorId are required');
    }

    // IR-3: Blackout window check
    if (blackoutUntil && new Date() < new Date(blackoutUntil)) {
      await this.queueFabric.enqueue('BackfillFailed', {
        jobId,
        connectorId,
        tenantId,
        reason: 'BLACKOUT_WINDOW',
        blackoutUntil,
        failedSlice: null,
      });
      return DataProcessResult.failure(
        'BLACKOUT_WINDOW',
        `Backfill suppressed during blackout until ${blackoutUntil}`,
      );
    }

    // IR-1: Gap detection — scan for cursor discontinuities (detect missing checkpoints)
    const gaps = await this.detectGaps(jobId, slices);

    let totalLanded = 0;
    const processedSlices: string[] = [];

    // IR-2: EP-4 cycle per slice
    for (const slice of slices) {
      // IR-6: Rate check ORDER 1 per slice
      const rateCheck = await this.rateLimitGuard.checkRateLimit(connectorId, 'backfill');
      if (!rateCheck.allowed) {
        await this.queueFabric.enqueue('BackfillFailed', {
          jobId,
          connectorId,
          tenantId,
          reason: 'RATE_LIMIT_EXCEEDED',
          retryAfterMs: rateCheck.retryAfterMs,
          failedSlice: slice.sliceId,
        });
        return DataProcessResult.failure(
          'RATE_LIMIT_EXCEEDED',
          'Rate limit exceeded during backfill',
        );
      }

      // IR-5: land_raw append-only
      let sliceLanded = 0;
      for (const record of slice.records ?? []) {
        // Null/invalid guard
        if (!record || typeof record !== 'object') {
          await this.dbFabric.storeDocument(
            QUARANTINE_INDEX,
            {
              connectorId,
              tenantId,
              knowledgeScope: 'PRIVATE',
              reason: 'NORMALIZATION_FAILED',
              rawRecord: record,
              quarantinedAt: new Date().toISOString(),
              sliceId: slice.sliceId,
            },
            `quarantine:${tenantId}:${connectorId}:${slice.sliceId}:${Date.now()}`,
          );
          await this.queueFabric.enqueue('RecordQuarantined', {
            connectorId,
            tenantId,
            sliceId: slice.sliceId,
          });
          continue;
        }

        const recordId =
          (record['recordId'] as string) ?? `${jobId}-${slice.sliceId}-${Date.now()}`;
        const idempotencyKey = `${tenantId}:${connectorId}:backfill:${recordId}`;

        const dupCheck = await this.dbFabric.searchDocuments(IDEMPOTENCY_INDEX, {
          idempotencyKey,
          tenantId,
        });
        if (dupCheck.isSuccess && Array.isArray(dupCheck.data) && dupCheck.data.length > 0) {
          continue; // Already backfilled — skip silently
        }

        // IR-8: storeDocument BEFORE enqueue
        const storeResult = await this.dbFabric.storeDocument(
          RAW_RECORDS_INDEX,
          {
            ...record,
            tenantId,
            connectorId,
            knowledgeScope: 'PRIVATE',
            landedAt: new Date().toISOString(),
            source: 'backfill',
            sliceId: slice.sliceId,
            jobId,
          },
          `raw:${idempotencyKey}`,
        );

        if (!storeResult.isSuccess) {
          await this.queueFabric.enqueue('BackfillFailed', {
            jobId,
            connectorId,
            tenantId,
            reason: 'STORE_FAILED',
            failedSlice: slice.sliceId,
          });
          return DataProcessResult.failure(
            'STORE_FAILED',
            storeResult.errorMessage ?? 'Store failed',
          );
        }

        await this.dbFabric.storeDocument(
          IDEMPOTENCY_INDEX,
          {
            idempotencyKey,
            tenantId,
            usedAt: new Date().toISOString(),
          },
          idempotencyKey,
        );

        sliceLanded++;
      }

      // IR-7: commit_cursor — monotonic validation per slice
      if (slice.toCursor) {
        const isMonotonic = await this.cursorCheckpoint.validateMonotonic(jobId, slice.toCursor);
        if (!isMonotonic) {
          await this.queueFabric.enqueue('BackfillFailed', {
            jobId,
            connectorId,
            tenantId,
            reason: 'CURSOR_NOT_MONOTONIC',
            failedSlice: slice.sliceId,
          });
          return DataProcessResult.failure(
            'CURSOR_NOT_MONOTONIC',
            `Cursor regression on slice ${slice.sliceId}`,
          );
        }
        await this.cursorCheckpoint.saveCheckpoint(jobId, slice.toCursor, {
          connectorId,
          tenantId,
          sliceId: slice.sliceId,
        });
      }

      processedSlices.push(slice.sliceId);
      totalLanded += sliceLanded;
    }

    // Store backfill job record before emitting (DNA-8)
    await this.dbFabric.storeDocument(
      BACKFILL_JOBS_INDEX,
      {
        jobId,
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        status: 'COMPLETED',
        totalLanded,
        processedSlices,
        gapsDetected: gaps.length,
        completedAt: new Date().toISOString(),
      },
      `backfill:${tenantId}:${jobId}`,
    );

    await this.queueFabric.enqueue('BackfillCompleted', {
      jobId,
      connectorId,
      tenantId,
      totalLanded,
      processedSlices,
      gapsDetected: gaps.length,
    });

    return DataProcessResult.success({
      jobId,
      totalLanded,
      processedSlices,
      gapsDetected: gaps.length,
    });
  }

  /** IR-1: Detect cursor discontinuities in the requested slice range */
  private async detectGaps(
    jobId: string,
    slices: BackfillSlice[],
  ): Promise<{ fromCursor: string; toCursor: string }[]> {
    const gaps: { fromCursor: string; toCursor: string }[] = [];
    const checkpoint = await this.cursorCheckpoint.loadCheckpoint(jobId);
    const lastKnown = checkpoint?.cursor;

    for (let i = 1; i < slices.length; i++) {
      const prev = slices[i - 1];
      const curr = slices[i];
      if (prev.toCursor !== curr.fromCursor) {
        gaps.push({ fromCursor: prev.toCursor, toCursor: curr.fromCursor });
      }
    }

    if (lastKnown && slices.length > 0 && slices[0].fromCursor > lastKnown) {
      gaps.push({ fromCursor: lastKnown, toCursor: slices[0].fromCursor });
    }

    return gaps;
  }
}
