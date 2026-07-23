/**
 * T426 ScheduledPublishTimerGate [SETNX_SCHEDULER]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: SchedulePublishRequested event (editor schedules content for future publication)
 *
 * Execution order is MACHINE (CF-28-4):
 *   ORDER 1: SETNX(scheduled-publish-lock:{contentId}) — prevent duplicate scheduling
 *   ORDER 2: Validate scheduled time is in future and within FREEDOM config window
 *   ORDER 3: storeDocument(scheduled-publish) — persist schedule with lock
 *   ORDER 4: enqueue(PublishScheduled) — notify scheduler to await trigger
 *
 * Iron rules:
 *   IR-1: SETNX lock prevents duplicate scheduler entries (CF-28-4)
 *   IR-2: Max schedule window configurable via FREEDOM (default 90 days)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SCHEDULED_PUBLISH_INDEX = 'xiigen-scheduled-publish';
const SCHEDULED_PUBLISH_LOCKS_INDEX = 'xiigen-scheduled-publish-locks';
const MAX_SCHEDULE_DAYS = 90; // FREEDOM config default

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ScheduledPublishTimerGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T426',
        serviceName: 'ScheduledPublishTimerGateService',
        flowId: 'FLOW-28',
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
   * Schedule content for future publication with SETNX lock and time validation.
   */
  async schedulePublish(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const scheduledTime = event['scheduledTime'] as string;
    const editor = event['editor'] as string;

    if (!contentId || !scheduledTime || !editor) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'contentId, scheduledTime, and editor are required',
      );
    }

    // ── ORDER 1: SETNX(scheduled-publish-lock:{contentId}) ─────────────────
    const lockKey = `scheduled-publish-lock:${contentId}`;
    const lockCheckResult = await this.dbFabric.searchDocuments(SCHEDULED_PUBLISH_LOCKS_INDEX, {
      lockKey,
    });

    if (lockCheckResult.isSuccess && (lockCheckResult.data ?? []).length > 0) {
      return DataProcessResult.failure(
        'ALREADY_SCHEDULED',
        'Content already has a scheduled publish date',
      );
    }

    // Acquire lock
    await this.dbFabric.storeDocument(
      SCHEDULED_PUBLISH_LOCKS_INDEX,
      {
        lockKey,
        contentId,
        lockedAt: new Date().toISOString(),
      },
      lockKey,
    );

    // ── ORDER 2: Validate scheduled time ─────────────────────────────────
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    const maxDate = new Date(now.getTime() + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1000);

    if (scheduledDate <= now) {
      return DataProcessResult.failure(
        'INVALID_SCHEDULED_TIME',
        'Scheduled time must be in the future',
      );
    }

    if (scheduledDate > maxDate) {
      return DataProcessResult.failure(
        'SCHEDULED_TIME_TOO_FAR',
        `Scheduled time cannot exceed ${MAX_SCHEDULE_DAYS} days in the future`,
      );
    }

    // ── ORDER 3: storeDocument(scheduled-publish) ────────────────────────
    const scheduleRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      scheduledTime: scheduledDate.toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: editor,
      status: 'PENDING',
    };

    await this.dbFabric.storeDocument(SCHEDULED_PUBLISH_INDEX, scheduleRecord, `${contentId}:schedule`);

    // ── ORDER 4: enqueue(PublishScheduled) ───────────────────────────────
    await this.queueFabric.enqueue('PublishScheduled', {
      contentId,
      tenantId,
      scheduledTime: scheduledDate.toISOString(),
      createdBy: editor,
    });

    return DataProcessResult.success({
      contentId,
      scheduledTime: scheduledDate.toISOString(),
      status: 'SCHEDULED',
    });
  }
}
