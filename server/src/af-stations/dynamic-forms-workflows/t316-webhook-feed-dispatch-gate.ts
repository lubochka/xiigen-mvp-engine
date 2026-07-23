/**
 * T316WebhookFeedDispatchGate — GAP-21-06 fix
 *
 * CF-390: All webhook dispatches include HMAC-SHA256 signature.
 *
 * Before fix: webhooks dispatched without signatures — partners cannot verify authenticity.
 * After fix: every POST includes:
 *   X-Xiigen-Signature: sha256={hex-hmac}
 *   X-Xiigen-Timestamp: <unix-ms>
 *   X-Xiigen-Webhook-Id: <webhookId>
 *
 * Consumer topic: form.entry.persisted (fan-out gate — fires in parallel with T314, T315)
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-5: tenantId from AsyncLocalStorage
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  WEBHOOK_SIGNING_SERVICE,
  IWebhookSigningService,
} from '../../fabrics/dynamic-forms-workflows/webhook-signing.service';

/** Consumer topic for T316 */
export const T316_CONSUMER_TOPIC = 'form.entry.persisted';

/** Injection token for IWebhookDispatchService */
export const WEBHOOK_DISPATCH_SERVICE = 'WEBHOOK_DISPATCH_SERVICE';

export interface IWebhookDispatchService {
  post(
    endpoint: string,
    payload: string,
    options: {
      headers: Record<string, string>;
      timeoutMs: number;
      maxRetries: number;
    },
  ): Promise<DataProcessResult<void>>;
}

/** Injection token for IFormWebhookRegistryService */
export const WEBHOOK_REGISTRY_SERVICE = 'WEBHOOK_REGISTRY_SERVICE';

export interface IFormWebhookRegistryService {
  getActiveWebhooksForForm(
    formId: string,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
}

@Injectable()
export class T316WebhookFeedDispatchGate {
  private readonly logger = new Logger(T316WebhookFeedDispatchGate.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(WEBHOOK_DISPATCH_SERVICE) private readonly webhookDispatch: IWebhookDispatchService,
    @Inject(WEBHOOK_SIGNING_SERVICE) private readonly webhookSigner: IWebhookSigningService,
    @Inject(WEBHOOK_REGISTRY_SERVICE) private readonly webhookRegistry: IFormWebhookRegistryService,
  ) {}

  /**
   * Handle form.entry.persisted event.
   * Dispatches signed webhook to all registered endpoints for the form.
   * CF-390: every dispatch includes HMAC-SHA256 signature headers.
   */
  async dispatchWebhook(event: Record<string, unknown>): Promise<DataProcessResult<void>> {
    const entryId = event['subject'] as string;
    if (!entryId) {
      return DataProcessResult.failure(
        'MISSING_ENTRY_ID',
        'form.entry.persisted event missing subject (entryId)',
      );
    }

    const data = event['data'] as Record<string, unknown>;
    const formId = data?.['formId'] as string;

    // CF-390: verify registered endpoint exists
    const webhooks = await this.webhookRegistry.getActiveWebhooksForForm(formId);
    if (!webhooks.isSuccess || !webhooks.data || (webhooks.data as unknown[]).length === 0) {
      return DataProcessResult.success(undefined); // no webhooks registered — skip
    }

    for (const webhook of webhooks.data as Record<string, unknown>[]) {
      const result = await this.dispatchSingleWebhook(entryId, event, webhook);
      if (!result.isSuccess) {
        this.logger.warn(
          `T316: webhook dispatch failed for ${webhook['webhookId']}`,
          result.errorMessage,
        );
        // Continue dispatching other webhooks even if one fails
      }
    }

    return DataProcessResult.success(undefined);
  }

  private async dispatchSingleWebhook(
    entryId: string,
    event: Record<string, unknown>,
    webhook: Record<string, unknown>,
  ): Promise<DataProcessResult<void>> {
    const data = event['data'] as Record<string, unknown>;
    const payload = {
      event: 'form.entry.submitted',
      entryId,
      formId: data?.['formId'],
      data,
    };

    const payloadStr = JSON.stringify(payload);
    const timestamp = Date.now();

    // Sign the payload (GAP-21-06 fix — CF-390)
    const signResult = await this.webhookSigner.signPayload(
      webhook['webhookId'] as string,
      payloadStr,
      timestamp,
    );
    if (!signResult.isSuccess) {
      return DataProcessResult.failure(
        signResult.errorCode ?? 'SIGNING_FAILED',
        signResult.errorMessage ?? 'Webhook signing failed',
      );
    }

    // Dispatch with signature headers
    return this.webhookDispatch.post(webhook['endpoint'] as string, payloadStr, {
      headers: {
        'Content-Type': 'application/json',
        'X-Xiigen-Signature': signResult.data?.signature ?? '',
        'X-Xiigen-Timestamp': String(timestamp),
        'X-Xiigen-Webhook-Id': webhook['webhookId'] as string,
      },
      timeoutMs: 10000,
      maxRetries: 3,
    });
  }
}
