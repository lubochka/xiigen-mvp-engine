/**
 * T213 ConnectorRegistrationHandler [provisioning]
 * FLOW-14: ETL & Data Integration
 *
 * Iron rules:
 *   IR-1: IRateLimitGuardService (F430) at ORDER 1 — before health probe.
 *   IR-2: ICredentialVaultService (F427) stores credentials — opaque connectorId only in events.
 *   IR-3: Check existing connector (idempotency) — no duplicate records.
 *   IR-4: storeDocument(connector) BEFORE enqueue(ConnectorRegistered). DNA-8.
 *   IR-5: ConnectorRegistrationFailed emitted on any registration failure.
 *
 * Emits: ConnectorRegistered, ConnectorRegistrationFailed
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { CREDENTIAL_VAULT_SERVICE, RATE_LIMIT_GUARD_SERVICE } from './etl-platform-tokens';

interface ICredentialVaultService {
  storeCredential(connectorId: string, credential: Record<string, unknown>): Promise<void>;
}

interface IRateLimitGuardService {
  checkRateLimit(
    connectorId: string,
    operation: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }>;
}

const CONNECTORS_INDEX = 'xiigen-connectors';
const _IDEMPOTENCY_INDEX = 'xiigen-idempotency-keys';

export interface ConnectorRegistrationInput {
  connectorId: string;
  connectorType: string;
  credential: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface ConnectorRegistrationResult {
  connectorId: string;
  registered: boolean;
  alreadyExists: boolean;
}

@Injectable()
export class ConnectorRegistrationHandlerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RATE_LIMIT_GUARD_SERVICE) private readonly rateLimitGuard: IRateLimitGuardService,
    @Inject(CREDENTIAL_VAULT_SERVICE) private readonly credentialVault: ICredentialVaultService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T213',
        serviceName: 'ConnectorRegistrationHandlerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async register(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<ConnectorRegistrationResult>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const connectorType = event['connectorType'] as string;
    const credential = event['credential'] as Record<string, unknown>;

    if (!connectorId || !connectorType) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and connectorType are required',
      );
    }

    // ORDER 1: Rate limit check — IR-1
    const rateCheck = await this.rateLimitGuard.checkRateLimit(connectorId, 'register');
    if (!rateCheck.allowed) {
      await this.queueFabric.enqueue('ConnectorRegistrationFailed', {
        connectorId,
        tenantId,
        reason: 'RATE_LIMIT_EXCEEDED',
        retryAfterMs: rateCheck.retryAfterMs,
      });
      return DataProcessResult.failure(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded for connector registration',
      );
    }

    // ORDER 2: Idempotency check — IR-3
    const existing = await this.dbFabric.searchDocuments(CONNECTORS_INDEX, { connectorId, tenantId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      return DataProcessResult.success({ connectorId, registered: false, alreadyExists: true });
    }

    // ORDER 3: Vault credentials — IR-2 (raw credential never in events)
    try {
      await this.credentialVault.storeCredential(connectorId, credential ?? {});
    } catch (err) {
      await this.queueFabric.enqueue('ConnectorRegistrationFailed', {
        connectorId,
        tenantId,
        reason: 'VAULT_STORE_FAILED',
      });
      return DataProcessResult.failure(
        'VAULT_STORE_FAILED',
        `Failed to vault credentials: ${String(err)}`,
      );
    }

    // ORDER 4: Store connector record — IR-4 (storeDocument BEFORE enqueue)
    const connectorDoc: Record<string, unknown> = {
      connectorId,
      connectorType,
      tenantId,
      knowledgeScope: 'PRIVATE',
      status: 'ACTIVE',
      registeredAt: new Date().toISOString(),
    };
    const storeResult = await this.dbFabric.storeDocument(
      CONNECTORS_INDEX,
      connectorDoc,
      `${tenantId}:${connectorId}`,
    );
    if (!storeResult.isSuccess) {
      await this.queueFabric.enqueue('ConnectorRegistrationFailed', {
        connectorId,
        tenantId,
        reason: 'STORE_FAILED',
      });
      return DataProcessResult.failure('STORE_FAILED', storeResult.errorMessage ?? 'Store failed');
    }

    // ORDER 5: Emit ConnectorRegistered — only connectorId, no credentials
    await this.queueFabric.enqueue('ConnectorRegistered', {
      connectorId,
      connectorType,
      tenantId,
      registeredAt: connectorDoc['registeredAt'],
    });

    return DataProcessResult.success({ connectorId, registered: true, alreadyExists: false });
  }
}
