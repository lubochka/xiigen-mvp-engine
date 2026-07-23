/**
 * T625 ConsentGateEnforcer [GUARD]
 * FLOW-20: Ads Platform
 *
 * Entry: AdDeliveryRequested event (ad system initiates user ad delivery)
 *
 * Execution order is MACHINE (CF-20-1):
 *   ORDER 1: Consent check — search consent-records for userId
 *   ORDER 2: Verify adsConsent=true and not expired
 *   ORDER 3: Emit ConsentGateFailed or AdDeliveryAuthorized
 *
 * Iron rules:
 *   IR-1: Consent check at ORDER 1 unconditionally before any ad processing (CF-20-1)
 *   IR-2: consentRecord absent OR adsConsent=false OR expiresAt < now() → emit ConsentGateFailed (CF-20-1)
 *   IR-3: Zero business exception paths for missing consent (CF-20-1)
 *   IR-4: tenantId from ALS only (DNA-5)
 *
 * Pattern reference: CONSENT-GATE-FIRST-001 RAG pattern from DR-20-A
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CONSENT_RECORDS_INDEX = 'xiigen-consent-records';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ConsentGateEnforcerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T625',
        serviceName: 'ConsentGateEnforcerService',
        flowId: 'FLOW-20',
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
   * Consent gate — unconditional ORDER 1 check.
   * DPO pattern: CONSENT-GATE-FIRST-001
   */
  async enforceConsentGate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const userId = event['userId'] as string;

    if (!userId) {
      return DataProcessResult.failure('INVALID_INPUT', 'userId is required');
    }

    // ── ORDER 1: Consent check — IR-1, CF-20-1 ──────────────────────────────
    // Search for consent record matching userId
    const consentResult = await this.dbFabric.searchDocuments(CONSENT_RECORDS_INDEX, { userId });

    if (!consentResult.isSuccess || (consentResult.data ?? []).length === 0) {
      // Consent record not found
      await this.queueFabric.enqueue('ConsentGateFailed', {
        userId,
        tenantId,
        reason: 'CONSENT_MISSING',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure(
        'CONSENT_MISSING',
        `Consent record not found for userId: ${userId}`,
      );
    }

    const consentRecord = consentResult.data![0] as Record<string, unknown>;
    const adsConsent = consentRecord['adsConsent'] as boolean | undefined;
    const expiresAt = consentRecord['expiresAt'] as string | undefined;

    // ── ORDER 2: Verify adsConsent=true and not expired ──────────────────────
    if (!adsConsent) {
      await this.queueFabric.enqueue('ConsentGateFailed', {
        userId,
        tenantId,
        reason: 'CONSENT_REVOKED',
        timestamp: new Date().toISOString(),
      });
      return DataProcessResult.failure('CONSENT_REVOKED', 'Ads consent has been revoked');
    }

    // Check expiration
    if (expiresAt) {
      const expiresAtDate = new Date(expiresAt);
      const now = new Date();
      if (expiresAtDate < now) {
        await this.queueFabric.enqueue('ConsentGateFailed', {
          userId,
          tenantId,
          reason: 'CONSENT_EXPIRED',
          timestamp: new Date().toISOString(),
        });
        return DataProcessResult.failure('CONSENT_EXPIRED', 'Ads consent has expired');
      }
    }

    // ── ORDER 3: Emit AdDeliveryAuthorized ───────────────────────────────────
    // Consent verified — proceed to ad delivery
    await this.queueFabric.enqueue('AdDeliveryAuthorized', {
      userId,
      tenantId,
      consentLevel: 'ADS_ALLOWED',
      timestamp: new Date().toISOString(),
    });

    return DataProcessResult.success({
      userId,
      tenantId,
      consentGatePassed: true,
      authorizedAt: new Date().toISOString(),
    });
  }
}
