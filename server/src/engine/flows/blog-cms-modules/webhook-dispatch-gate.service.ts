/**
 * T434 WebhookDispatchGate [EXTERNAL_NOTIFICATION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: DispatchWebhooksRequested event (forward content events to external subscribers)
 *
 * Execution order is MACHINE (CF-28-12):
 *   ORDER 1: Query subscribed webhooks (external URLs registered by tenants)
 *   ORDER 2: Build CloudEvent envelope with content metadata
 *   ORDER 3: storeDocument(webhook-dispatch-audit)
 *   ORDER 4: enqueue(WebhooksDispatched) — HTTP delivery via async worker
 *
 * Iron rules:
 *   IR-1: CloudEvents format (RFC 7231) for all webhook payloads
 *   IR-2: Webhooks filtered by event type and tenant scope
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WEBHOOK_SUBSCRIPTION_INDEX = 'xiigen-webhook-subscriptions';
const WEBHOOK_DISPATCH_AUDIT_INDEX = 'xiigen-webhook-dispatch-audit';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class WebhookDispatchGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T434',
        serviceName: 'WebhookDispatchGateService',
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
   * Dispatch webhooks to external subscribers with CloudEvents envelope.
   */
  async dispatchWebhooks(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const eventType = event['eventType'] as string;
    const contentId = event['contentId'] as string;
    const contentData = event['contentData'] as Record<string, unknown>;

    if (!eventType || !contentId) {
      return DataProcessResult.failure('INVALID_INPUT', 'eventType and contentId are required');
    }

    // ── ORDER 1: Query subscribed webhooks ────────────────────────────────
    const subscriptionResult = await this.dbFabric.searchDocuments(WEBHOOK_SUBSCRIPTION_INDEX, {
      tenantId,
      eventType,
      active: true,
    });

    const subscriptions = (subscriptionResult.data ?? []) as Record<string, unknown>[];

    if (subscriptions.length === 0) {
      return DataProcessResult.success({
        contentId,
        webhooksDispatched: 0,
        status: 'NO_SUBSCRIPTIONS',
      });
    }

    // ── ORDER 2: Build CloudEvent envelope ───────────────────────────────
    const cloudEvent: Record<string, unknown> = {
      specversion: '1.0',
      type: `com.xiigen.blog.${eventType.toLowerCase()}`,
      source: `/tenants/${tenantId}/content/${contentId}`,
      id: `${contentId}-${Date.now()}`,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: contentData,
    };

    // ── ORDER 3: storeDocument(webhook-dispatch-audit) ───────────────────
    const auditRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      eventType,
      webhookCount: subscriptions.length,
      dispatchedAt: new Date().toISOString(),
      cloudEvent,
    };

    await this.dbFabric.storeDocument(
      WEBHOOK_DISPATCH_AUDIT_INDEX,
      auditRecord,
      `${contentId}:webhooks:${eventType}`,
    );

    // ── ORDER 4: enqueue(WebhooksDispatched) ────────────────────────────
    await this.queueFabric.enqueue('WebhooksDispatched', {
      contentId,
      tenantId,
      eventType,
      cloudEvent,
      subscriptions: subscriptions.map((s) => ({
        webhookId: s['webhookId'],
        url: s['url'],
      })),
      dispatchedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      eventType,
      webhooksDispatched: subscriptions.length,
      status: 'WEBHOOKS_QUEUED',
      dispatchedAt: new Date().toISOString(),
    });
  }
}
