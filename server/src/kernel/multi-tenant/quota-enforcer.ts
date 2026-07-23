/**
 * QuotaEnforcer — Guards against quota overruns per tenant.
 *
 * Delegates to ITenantRegistry.checkQuota() and maps the result
 * to DataProcessResult.failure('QUOTA_EXCEEDED', ...) when the limit
 * is breached. All methods return DataProcessResult — never throw.
 *
 * P26 FIX-5.
 */

import { DataProcessResult } from '../data-process-result';
import { ITenantRegistry } from './tenant-registry.interface';

export class QuotaEnforcer {
  constructor(private readonly registry: ITenantRegistry) {}

  /**
   * Guard against quota overrun for a resource.
   *
   * @param tenantId  — which tenant
   * @param resource  — resource name (e.g. 'api_calls', 'tokens', 'storage_mb')
   * @param amount    — units requested
   *
   * Returns success(undefined) if within quota.
   * Returns failure('QUOTA_EXCEEDED', ...) if limit is breached.
   */
  async guardQuota(
    tenantId: string,
    resource: string,
    amount: number,
  ): Promise<DataProcessResult<void>> {
    try {
      const result = await this.registry.checkQuota(tenantId, resource, amount);
      if (!result.isSuccess) {
        return result as unknown as DataProcessResult<void>;
      }
      if (!result.data?.ok) {
        return DataProcessResult.failure(
          'QUOTA_EXCEEDED',
          `Quota exceeded for ${resource}: ${result.data?.remaining ?? 0} remaining`,
        );
      }
      return DataProcessResult.success(undefined);
    } catch (e) {
      return DataProcessResult.failure(
        'QUOTA_CHECK_FAILED',
        `Quota check failed for ${resource}: ${String(e)}`,
      );
    }
  }
}
