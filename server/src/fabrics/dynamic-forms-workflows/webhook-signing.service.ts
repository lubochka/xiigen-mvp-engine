/**
 * WebhookSigningService — GAP-21-06
 *
 * F864 IWebhookSigningService implementation.
 * CF-390: All webhook dispatches MUST include HMAC-SHA256 signature for authenticity verification.
 *
 * Signing algorithm:
 *   input  = "<timestamp>.<payload>"
 *   header = "X-Xiigen-Signature: sha256=<hex-hmac>"
 *
 * Replay protection: X-Xiigen-Timestamp header; 5-minute tolerance window.
 * Signing key: retrieved from ISecretsService (Rule 1 — no hardcoded keys).
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-1: no typed model classes — Record<string, unknown>
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISecretsService, SECRETS_SERVICE } from '../../fabrics/interfaces/secrets.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface WebhookSignature {
  signature: string; // "sha256={hex-hmac}"
  timestamp: number; // Unix timestamp (ms)
  webhookId: string;
}

export const WEBHOOK_SIGNING_SERVICE = 'WEBHOOK_SIGNING_SERVICE';

export interface IWebhookSigningService {
  signPayload(
    webhookId: string,
    payload: string,
    timestamp: number,
  ): Promise<DataProcessResult<WebhookSignature>>;
  verifySignature(
    webhookId: string,
    payload: string,
    timestamp: number,
    signature: string,
  ): Promise<DataProcessResult<boolean>>;
}

@Injectable()
export class WebhookSigningService implements IWebhookSigningService {
  private readonly logger = new Logger(WebhookSigningService.name);

  constructor(@Inject(SECRETS_SERVICE) private readonly secrets: ISecretsService) {}

  async signPayload(
    webhookId: string,
    payload: string,
    timestamp: number,
  ): Promise<DataProcessResult<WebhookSignature>> {
    // Retrieve signing key from FLOW-08 secrets fabric (Rule 1 — no hardcoded keys)
    const keyResult = await this.secrets.getSecret(`webhook-signing/${webhookId}`);
    if (!keyResult.isSuccess || !keyResult.data) {
      return DataProcessResult.failure(
        'SIGNING_KEY_NOT_FOUND',
        `No signing key for webhook ${webhookId}`,
      );
    }

    const signingKey = keyResult.data['value'] as string;
    if (!signingKey) {
      return DataProcessResult.failure(
        'SIGNING_KEY_INVALID',
        `Signing key for webhook ${webhookId} has no value`,
      );
    }

    // HMAC-SHA256: sign timestamp.payload to prevent replay attacks
    const signingInput = `${timestamp}.${payload}`;
    const signature = crypto.createHmac('sha256', signingKey).update(signingInput).digest('hex');

    return DataProcessResult.success({
      signature: `sha256=${signature}`,
      timestamp,
      webhookId,
    });
  }

  async verifySignature(
    webhookId: string,
    payload: string,
    timestamp: number,
    receivedSignature: string,
  ): Promise<DataProcessResult<boolean>> {
    // FREEDOM config: WEBHOOK_TIMESTAMP_TOLERANCE_MS — default 5 minutes
    const tolerance = 300000;
    if (Math.abs(Date.now() - timestamp) > tolerance) {
      return DataProcessResult.failure('WEBHOOK_REPLAY_DETECTED', 'Webhook timestamp too old');
    }

    const computedResult = await this.signPayload(webhookId, payload, timestamp);
    if (!computedResult.isSuccess) {
      return DataProcessResult.failure(
        computedResult.errorCode ?? 'VERIFY_FAILED',
        computedResult.errorMessage ?? 'Failed to compute expected signature',
      );
    }

    const expected = computedResult.data?.signature;
    const isValid = expected === receivedSignature;

    return DataProcessResult.success(isValid);
  }
}
