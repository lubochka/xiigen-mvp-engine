/**
 * T606 TenantConfigurationManager [VALIDATION]
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Entry: TenantConfigUpdateRequested event (operator updates config key)
 *
 * Execution order is MACHINE (CF-15-2):
 *   ORDER 1: MACHINE_LOCKED_KEYS check — reject locked keys immediately
 *   ORDER 2: getDocumentWithVersion(config, tenantId) — OCC read
 *   ORDER 3: Value validation for known key prefixes
 *   ORDER 4: storeDocumentWithOCC(config, versionPin) — not plain storeDocument
 *   ORDER 5: storeDocument(audit) — DNA-8, before emit
 *   ORDER 6: enqueue(TenantConfigurationUpdated)
 *
 * Iron rules:
 *   IR-1: MACHINE_LOCKED_KEYS compile-time constant — never DB lookup (CF-15-2)
 *   IR-2: ORDER 1 rejection for locked keys — no OCC read, no storage (CF-15-2)
 *   IR-3: storeDocumentWithOCC — not plain storeDocument (CF-15-2)
 *   IR-4: storeDocument(audit) BEFORE TenantConfigurationUpdated emit (DNA-8)
 *   IR-5: tenantId from ALS — request body tenantId ignored (CF-15-4)
 *
 * Pattern reference: schema-registry-dag/schema-registration-gateway.service.ts (OCC pattern)
 * Pattern reference: data-warehouse-analytics/analytics-dashboard-query.service.ts (ORDER 1 gate)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const FREEDOM_INDEX = 'xiigen-freedom-config';
const CONFIG_AUDIT_INDEX = 'xiigen-config-audit';

/**
 * MACHINE: Compile-time constant — NEVER a database lookup, NEVER in FREEDOM config.
 * Runtime lookup is attackable: write to locked-key list first, then override tenantId.
 * CF-15-2.
 */
const MACHINE_LOCKED_KEYS = [
  'tenantId',
  'masterTenantId',
  'provisionedAt',
  'subscriptionTier',
] as const;

@Injectable()
export class TenantConfigurationManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T606',
        serviceName: 'TenantConfigurationManagerService',
        flowId: 'FLOW-15',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Update a single FREEDOM config key for the current tenant.
   * DPO pattern: IMMUTABLE-MACHINE-KEY-GUARD-001
   */
  async updateConfigKey(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // tenantId exclusively from ALS — request body tenantId ignored (IR-5, CF-15-4)
    const tenantId = this.getTenantId();
    const key = event['key'] as string;
    const value = event['value'];

    if (!key) {
      return DataProcessResult.failure('INVALID_INPUT', 'key is required');
    }

    // ── ORDER 1: MACHINE_LOCKED_KEYS check — IR-1, IR-2, CF-15-2 ────────────
    // Compile-time constant check. No OCC read, no value validation, no storage.
    if ((MACHINE_LOCKED_KEYS as readonly string[]).includes(key)) {
      await this.queueFabric.enqueue('ConfigKeyImmutable', {
        tenantId,
        key,
        reason: 'MACHINE_LOCKED',
      });
      return DataProcessResult.failure(
        'CONFIG_KEY_IMMUTABLE',
        `Key '${key}' is machine-locked and cannot be modified`,
      );
    }

    // ── ORDER 2: OCC read — IR-3 ────────────────────────────────────────────
    const docId = `${tenantId}:${key}`;
    const readResult = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      key,
    });

    let versionPin: string | undefined;
    let oldValue: unknown;
    if (readResult.isSuccess && (readResult.data ?? []).length > 0) {
      const existing = readResult.data![0] as Record<string, unknown>;
      versionPin = existing['_version'] as string | undefined;
      oldValue = existing['value'];
    }

    // ── ORDER 3: Value validation for known key prefixes ────────────────────
    if (key.startsWith('quota_') && typeof value === 'number') {
      if (!Number.isInteger(value) || value < 0) {
        return DataProcessResult.failure(
          'INVALID_VALUE',
          `quota_* keys require non-negative integers, got ${value}`,
        );
      }
    }

    // ── ORDER 4: OCC write — IR-3, CF-15-2 ──────────────────────────────────
    // storeDocumentWithOCC — not plain storeDocument
    const configRecord: Record<string, unknown> = {
      tenantId,
      key,
      value,
      updatedAt: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    };

    // storeDocumentWithOCC — IR-3, CF-15-2 (never plain storeDocument for config writes)
    const occOptions = versionPin
      ? {
          ifSeqNo: parseInt(versionPin.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(versionPin.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };
    const writeResult = await this.dbFabric.storeDocumentWithOCC(
      FREEDOM_INDEX,
      configRecord,
      docId,
      occOptions,
    );
    if (!writeResult.isSuccess) {
      // Check for OCC conflict
      if (
        writeResult.errorCode === 'OCC_CONFLICT' ||
        writeResult.errorMessage?.includes('conflict')
      ) {
        await this.queueFabric.enqueue('ConfigUpdateConflict', {
          tenantId,
          key,
          reason: 'concurrent_update',
        });
        return DataProcessResult.failure(
          'OCC_CONFLICT',
          `Concurrent update conflict on key '${key}'`,
        );
      }
      return DataProcessResult.failure(
        'CONFIG_WRITE_FAILED',
        `Failed to write config key '${key}': ${writeResult.errorMessage}`,
      );
    }

    // ── ORDER 5: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE TenantConfigurationUpdated emit
    await this.dbFabric.storeDocument(CONFIG_AUDIT_INDEX, {
      tenantId,
      key,
      oldValue,
      newValue: value,
      action: 'CONFIG_KEY_UPDATED',
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 6: Emit TenantConfigurationUpdated — IR-4 ─────────────────────
    await this.queueFabric.enqueue('TenantConfigurationUpdated', {
      tenantId,
      key,
      value,
      updatedAt: configRecord['updatedAt'],
    });

    return DataProcessResult.success({
      tenantId,
      key,
      value,
      updatedAt: configRecord['updatedAt'],
    });
  }
}
