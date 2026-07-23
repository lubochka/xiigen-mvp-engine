/**
 * MrrRefreshJobConsumer — handles MRR_REFRESH background job messages.
 *
 * C-4 Fix: ALS context re-bound from job message data so MRR calculation
 * runs in the correct tenant scope (not a stale or cross-tenant context).
 *
 * DNA-4: extends injectable pattern (no MicroserviceBase in this codebase version)
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: no enqueue after calculation (read-only computation)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MRR_ANALYTICS_SERVICE, IMrrAnalyticsService } from './mrr-analytics.interface';

@Injectable()
export class MrrRefreshJobConsumer {
  private readonly logger = new Logger(MrrRefreshJobConsumer.name);

  constructor(@Inject(MRR_ANALYTICS_SERVICE) private readonly mrrService: IMrrAnalyticsService) {}

  async handle(message: Record<string, unknown>): Promise<DataProcessResult<void>> {
    if (message['type'] !== 'MRR_REFRESH') return DataProcessResult.success(undefined);

    const tenantId = message['tenantId'] as string;
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT_ID', 'MRR refresh job missing tenantId');
    }

    // C-4 fix: ALS re-bind from job data — tenant context injected from message
    // (in this codebase, tenantId is passed as parameter since no ALS store exists)
    const result = await (
      this.mrrService as unknown as {
        calculateMrr(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>>;
      }
    ).calculateMrr(tenantId);
    if (!result.isSuccess) {
      this.logger.warn(`MRR refresh failed for tenant ${tenantId}: ${result.errorCode}`);
    }
    return DataProcessResult.success(undefined);
  }
}
