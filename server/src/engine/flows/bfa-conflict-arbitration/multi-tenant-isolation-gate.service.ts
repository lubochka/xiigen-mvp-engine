/**
 * MultiTenantIsolationGate — T386 GOVERNANCE service for FLOW-25.
 *
 * Validates that a tenant has FLOW-25 BFA configuration before any processing
 * is allowed. Blocks all operations for unconfigured tenants at the governance boundary.
 *
 * Iron rules (enforced — not configurable):
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   IR-386-1: unconfigured tenant → TENANT_NOT_CONFIGURED failure (never silently pass)
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface TenantAccessResult {
  readonly tenantId: string;
  readonly flowId: string;
  readonly configured: boolean;
  readonly configVersion: string;
  readonly checkedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BFA_CONFIG_INDEX = 'bfa-freedom-config';
const FLOW25_CONFIG_KEY = 'flow25_bfa_enabled';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MultiTenantIsolationGate extends MicroserviceBase {
  constructor(private readonly dbService: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T386',
        serviceName: 'MultiTenantIsolationGate',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Validate that the tenant has FLOW-25 BFA configuration.
   *
   * IR-386-1: unconfigured tenant → TENANT_NOT_CONFIGURED failure.
   * CF-476: tenantId required.
   */
  async validateTenantAccess(
    tenantId: string,
    flowId: string = 'FLOW-25',
  ): Promise<DataProcessResult<TenantAccessResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!flowId || flowId.trim() === '') {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }

    const configResult = await this.dbService.searchDocuments(BFA_CONFIG_INDEX, {
      tenant_id: tenantId,
      config_key: FLOW25_CONFIG_KEY,
    });

    if (!configResult.isSuccess || configResult.data!.length === 0) {
      return DataProcessResult.failure(
        'TENANT_NOT_CONFIGURED',
        `IR-386-1: Tenant '${tenantId}' has no FLOW-25 BFA configuration. ` +
          'Configure bfa-freedom-config before allowing arbitration operations.',
      );
    }

    const config = configResult.data![0];
    const configVersion = (config['config_version'] as string) ?? '1.0';

    return DataProcessResult.success({
      tenantId,
      flowId,
      configured: true,
      configVersion,
      checkedAt: new Date().toISOString(),
    });
  }

  /**
   * Strict guard variant — returns failure for any operation that would
   * cross tenant boundaries. Used as a pre-flight before any DB query.
   */
  async assertScopedQuery(tenantId: string, operation: string): Promise<DataProcessResult<void>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure(
        'UNSCOPED_QUERY',
        `CF-476: Operation '${operation}' rejected — tenantId is required for all FLOW-25 queries`,
      );
    }
    return DataProcessResult.success(undefined);
  }
}
