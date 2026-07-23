/**
 * T635 ContentScheduleDispatcher [ORCHESTRATION]
 * FLOW-22: CMS Publishing
 *
 * SETNX scheduled-publish lock per content item at ORDER 1.
 * Schedule window from FREEDOM config. Timer cancellable.
 * DNA-8: audit before emit.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SCHEDULE_LOCK_INDEX = 'xiigen-publish-schedule-locks';
const SCHEDULE_AUDIT_INDEX = 'xiigen-schedule-audit';
const FREEDOM_INDEX = 'xiigen-freedom-config';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentScheduleDispatcherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T635',
        serviceName: 'ContentScheduleDispatcherService',
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

  async schedulePublish(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const publishAt = event['publishAt'] as string;

    if (!contentId || !publishAt) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and publishAt required');
    }

    // Validate future time
    if (new Date(publishAt).getTime() <= Date.now()) {
      return DataProcessResult.failure('INVALID_SCHEDULE', 'publishAt must be in the future');
    }

    // ── ORDER 1: SETNX lock — CF-22-3 ──────────────────────────────────────
    const lockKey = `publish-schedule:${contentId}:${publishAt}`;
    const lockResult = await this.dbFabric.searchDocuments(SCHEDULE_LOCK_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      return DataProcessResult.success({ alreadyScheduled: true, contentId, publishAt });
    }

    // Read TTL from FREEDOM config
    const ttlResult = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      key: 'content_publish_schedule_window_ms',
    });
    const ttlMs =
      ttlResult.isSuccess && (ttlResult.data ?? []).length > 0
        ? ((ttlResult.data![0] as Record<string, unknown>)['value'] as number)
        : 86400000; // 24h default

    await this.dbFabric.storeDocument(
      SCHEDULE_LOCK_INDEX,
      {
        lockKey,
        contentId,
        publishAt,
        tenantId,
        expiresAt: new Date(Date.now() + ttlMs).toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      lockKey,
    );

    // ── ORDER 2: Audit — DNA-8 ─────────────────────────────────────────────
    await this.dbFabric.storeDocument(SCHEDULE_AUDIT_INDEX, {
      tenantId,
      contentId,
      publishAt,
      action: 'CONTENT_SCHEDULED',
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 3: Emit ───────────────────────────────────────────────────────
    await this.queueFabric.enqueue('ContentScheduled', { tenantId, contentId, publishAt });

    return DataProcessResult.success({ tenantId, contentId, publishAt, status: 'SCHEDULED' });
  }

  async cancelSchedule(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;

    if (!contentId) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId required');
    }

    await this.dbFabric.storeDocument(SCHEDULE_AUDIT_INDEX, {
      tenantId,
      contentId,
      action: 'CONTENT_PUBLISH_CANCELLED',
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    await this.queueFabric.enqueue('ContentPublishCancelled', { tenantId, contentId });

    return DataProcessResult.success({ tenantId, contentId, status: 'CANCELLED' });
  }
}
