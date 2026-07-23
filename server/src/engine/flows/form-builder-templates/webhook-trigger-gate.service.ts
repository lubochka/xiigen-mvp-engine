/**
 * T649 WebhookTriggerGate [QUEUE_CONSUMER]
 * FLOW-23: Form Builder Templates
 *
 * Entry: WebhookTriggerRequested event (from queue, webhook dispatch)
 *
 * Execution order is MACHINE (CF-23-7):
 *   ORDER 1: idempotency check using idempotency key (DNA-7)
 *   ORDER 2: Validate webhook payload structure
 *   ORDER 3: storeDocument(webhook dispatch record) (DNA-8)
 *   ORDER 4: enqueue(WebhookDispatched)
 *
 * Iron rules:
 *   IR-1: idempotency check at ORDER 1 (DNA-7)
 *   IR-2: Validate webhook payload before storeDocument
 *   IR-3: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../kernel/multi-tenant/tenant-context';

const WEBHOOK_DISPATCH_INDEX = 'xiigen-webhook-dispatches';
const IDEMPOTENCY_INDEX = 'xiigen-webhook-idempotency';

@Injectable()
export class WebhookTriggerGateService {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly cls: ClsService,
  ) {}

  private getTenantId(): string {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY)?.tenantId ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async triggerWebhook(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const webhookId = event['webhookId'] as string;
    const idempotencyKey = event['idempotencyKey'] as string;
    const payload = event['payload'] as Record<string, unknown>;

    if (!webhookId || !idempotencyKey || !payload) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'webhookId, idempotencyKey, and payload are required',
      );
    }

    const triggeredAt = new Date().toISOString();

    // ── ORDER 1: Idempotency check (DNA-7) ──────────────────────────────────────
    const idempotencyResult = await this.db.searchDocuments(IDEMPOTENCY_INDEX, { idempotencyKey });
    if (idempotencyResult.isSuccess && (idempotencyResult.data ?? []).length > 0) {
      const existingRecord = (idempotencyResult.data ?? [])[0] as Record<string, unknown>;
      return DataProcessResult.success({
        webhookId,
        tenantId,
        idempotencyKey,
        status: 'ALREADY_DISPATCHED',
        dispatchId: existingRecord['dispatchId'],
      });
    }

    // ── ORDER 2: Validate webhook payload ────────────────────────────────────────
    const validationResult = this.validatePayload(payload);
    if (!validationResult) {
      await this.queue.enqueue('WebhookValidationFailed', {
        webhookId,
        tenantId,
        idempotencyKey,
        reason: 'Invalid webhook payload structure',
        triggeredAt,
      });

      return DataProcessResult.failure(
        'INVALID_WEBHOOK_PAYLOAD',
        'Webhook payload validation failed',
      );
    }

    // ── ORDER 3: Store webhook dispatch record (DNA-8) ──────────────────────────
    const dispatchId = `dispatch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await this.db.storeDocument(
      WEBHOOK_DISPATCH_INDEX,
      {
        dispatchId,
        webhookId,
        tenantId,
        payload,
        triggeredAt,
        status: 'PENDING',
        knowledgeScope: 'PRIVATE',
      },
      dispatchId,
    );

    // Store idempotency record
    await this.db.storeDocument(
      IDEMPOTENCY_INDEX,
      {
        idempotencyKey,
        webhookId,
        tenantId,
        dispatchId,
        processedAt: triggeredAt,
      },
      idempotencyKey,
    );

    // ── ORDER 4: Emit WebhookDispatched ──────────────────────────────────────────
    await this.queue.enqueue('WebhookDispatched', {
      dispatchId,
      webhookId,
      tenantId,
      idempotencyKey,
      triggeredAt,
    });

    return DataProcessResult.success({
      webhookId,
      tenantId,
      dispatchId,
      idempotencyKey,
      status: 'DISPATCHED',
      triggeredAt,
    });
  }

  private validatePayload(payload: Record<string, unknown>): boolean {
    // Validate webhook payload structure
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    // Must have at least one field
    if (Object.keys(payload).length === 0) {
      return false;
    }

    // All values must be serializable
    try {
      JSON.stringify(payload);
      return true;
    } catch {
      return false;
    }
  }
}
