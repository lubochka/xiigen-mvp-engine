/**
 * T215 WebhookIngestionHandler [ingestion]
 * FLOW-14: ETL & Data Integration
 *
 * Iron rules:
 *   IR-1: HMAC verification via crypto.timingSafeEqual() — never === (CF-211).
 *   IR-2: On invalid HMAC → return HTTP 200 { received: true }, NO event emitted.
 *         Never return 401/403 — gives replay oracle.
 *   IR-3: Idempotency check BEFORE raw zone write (DNA-7).
 *   IR-4: Raw zone append-only (CF-192).
 *   IR-5: ConnectorId only in events — no credentials (F427).
 *   IR-6: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: WebhookEventIngested, RecordQuarantined, DuplicateIngestionDetected
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { CREDENTIAL_VAULT_SERVICE } from './etl-platform-tokens';

interface ICredentialVaultService {
  retrieveCredential(connectorId: string): Promise<Record<string, unknown>>;
}

const RAW_RECORDS_INDEX = 'xiigen-raw-records';
const QUARANTINE_INDEX = 'xiigen-quarantine-records';
const IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

export interface WebhookIngestionResult {
  received: true;
  ingested: boolean;
  eventId?: string;
  reason?: string;
}

@Injectable()
export class WebhookIngestionHandlerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(CREDENTIAL_VAULT_SERVICE) private readonly credentialVault: ICredentialVaultService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T215',
        serviceName: 'WebhookIngestionHandlerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Process incoming webhook event.
   * Returns { received: true } regardless of HMAC validity — IR-2.
   */
  async ingest(event: Record<string, unknown>): Promise<DataProcessResult<WebhookIngestionResult>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const rawBody = event['rawBody'] as string;
    const signature = (event['signature'] as string) ?? '';
    const payload = event['payload'] as Record<string, unknown>;
    const idempotencyKey = event['idempotencyKey'] as string;

    if (!connectorId) {
      // Still return received:true to avoid oracle
      return DataProcessResult.success({
        received: true,
        ingested: false,
        reason: 'MISSING_CONNECTOR_ID',
      });
    }

    // ORDER 1: HMAC verification — IR-1, IR-2, CF-211
    const hmacValid = await this.verifyHmac(connectorId, rawBody ?? '', signature);
    if (!hmacValid) {
      // IR-2: HTTP 200, no event, no information leak
      return DataProcessResult.success({ received: true, ingested: false, reason: 'HMAC_INVALID' });
    }

    // ORDER 2: Idempotency check — IR-3, DNA-7
    if (idempotencyKey) {
      const idempKey = `${tenantId}:${connectorId}:${idempotencyKey}`;
      const dupCheck = await this.dbFabric.searchDocuments(IDEMPOTENCY_INDEX, {
        idempotencyKey: idempKey,
        tenantId,
      });
      if (dupCheck.isSuccess && Array.isArray(dupCheck.data) && dupCheck.data.length > 0) {
        await this.queueFabric.enqueue('DuplicateIngestionDetected', {
          connectorId,
          tenantId,
          idempotencyKey,
        });
        return DataProcessResult.success({ received: true, ingested: false, reason: 'DUPLICATE' });
      }
    }

    // Validate payload structure
    if (!payload || typeof payload !== 'object') {
      const eventId = `${connectorId}:${Date.now()}`;
      await this.dbFabric.storeDocument(
        QUARANTINE_INDEX,
        {
          connectorId,
          tenantId,
          knowledgeScope: 'PRIVATE',
          reason: 'INVALID_PAYLOAD',
          rawBody,
          quarantinedAt: new Date().toISOString(),
        },
        `quarantine:${eventId}`,
      );
      await this.queueFabric.enqueue('RecordQuarantined', {
        connectorId,
        tenantId,
        reason: 'INVALID_PAYLOAD',
      });
      return DataProcessResult.success({ received: true, ingested: false, reason: 'QUARANTINED' });
    }

    // ORDER 3: Append raw record — IR-4, CF-192 (storeDocument BEFORE enqueue, IR-6)
    const eventId = idempotencyKey
      ? `${tenantId}:${connectorId}:${idempotencyKey}`
      : `${connectorId}:${Date.now()}`;

    const storeResult = await this.dbFabric.storeDocument(
      RAW_RECORDS_INDEX,
      {
        ...payload,
        connectorId,
        tenantId,
        knowledgeScope: 'PRIVATE',
        landedAt: new Date().toISOString(),
        source: 'webhook',
      },
      `raw:${eventId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.success({ received: true, ingested: false, reason: 'STORE_FAILED' });
    }

    // Mark idempotency key
    if (idempotencyKey) {
      const idempKey = `${tenantId}:${connectorId}:${idempotencyKey}`;
      await this.dbFabric.storeDocument(
        IDEMPOTENCY_INDEX,
        {
          idempotencyKey: idempKey,
          tenantId,
          usedAt: new Date().toISOString(),
        },
        idempKey,
      );
    }

    // ORDER 4: Emit event — connectorId only, no credentials (IR-5)
    await this.queueFabric.enqueue('WebhookEventIngested', {
      connectorId,
      tenantId,
      eventId,
      ingestedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({ received: true, ingested: true, eventId });
  }

  /**
   * Constant-time HMAC verification. CF-211.
   * Returns false on any error (fail-closed).
   */
  private async verifyHmac(
    connectorId: string,
    rawBody: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const credential = await this.credentialVault.retrieveCredential(connectorId);
      const secret = credential['hmacSecret'] as string;
      if (!secret) return false;

      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      const actualPadded = signature.padEnd(expected.length, '\0');
      const expectedBuf = Buffer.from(expected, 'hex');
      const actualBuf = Buffer.from(actualPadded.slice(0, expected.length), 'hex');

      if (expectedBuf.length !== actualBuf.length) return false;

      // IR-1: timingSafeEqual — never ===
      return timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }
}
