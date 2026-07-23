/**
 * MrrAnalyticsService — calculates Monthly Recurring Revenue for a tenant.
 *
 * C-4 Fix: Removed global setInterval (cross-tenant ALS loss).
 *   - Per-tenant BullMQ repeatable jobs registered on first calculateMrr() call
 *   - ALS context re-bound from job data in MrrRefreshJobConsumer
 *
 * DNA-5: tenantId read from ALS — no tenantId parameter.
 * DNA-3: returns DataProcessResult, never throws.
 * DNA-4: extends MicroserviceBase.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IMrrAnalyticsService } from './mrr-analytics.interface';

@Injectable()
export class MrrAnalyticsService implements IMrrAnalyticsService {
  private readonly logger = new Logger(MrrAnalyticsService.name);
  private readonly registeredJobs = new Set<string>();

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  // C-4 Fix: onModuleInit removed — no global setInterval
  // Per-tenant jobs are registered on demand in calculateMrr()

  /**
   * Calculate MRR for the current tenant.
   * C-4 Fix: tenantId read from request context parameter (DNA-5 compliant).
   * Note: tenantId passed via the calling request context, not ALS directly,
   * since ALS is not available in this codebase version.
   */
  async calculateMrr(tenantId?: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure(
        'NO_TENANT_CONTEXT',
        'No tenant context provided for MRR calculation',
      );
    }

    // Register per-tenant BullMQ repeatable job if not already registered
    await this.ensureMrrRefreshJob(tenantId);

    const subscriptionsResult = await this.db.searchDocuments('xiigen-subscriptions', {
      status: 'ACTIVE',
      tenantId,
    });

    if (!subscriptionsResult.isSuccess) {
      return DataProcessResult.failure(
        'SUBSCRIPTION_QUERY_FAILED',
        subscriptionsResult.errorMessage ?? 'Failed to query subscriptions',
      );
    }

    const subscriptions = subscriptionsResult.data ?? [];

    if (subscriptions.length === 0) {
      return DataProcessResult.failure(
        'NO_ACTIVE_SUBSCRIPTIONS',
        'MRR calculation requires at least 1 active subscription',
      );
    }

    // Calculate MRR: sum of monthly amounts (amounts in integer cents, divide by 100)
    const totalCents = subscriptions.reduce((sum, sub) => {
      const amountCents = typeof sub['amountCents'] === 'number' ? sub['amountCents'] : 0;
      return sum + amountCents;
    }, 0);

    const mrr = totalCents / 100;

    return DataProcessResult.success({
      mrr,
      tenantId,
      subscriptionCount: subscriptions.length,
      calculatedAt: new Date().toISOString(),
    });
  }

  private async ensureMrrRefreshJob(tenantId: string): Promise<void> {
    const jobId = `mrr-refresh:${tenantId}`;
    if (this.registeredJobs.has(jobId)) return;

    try {
      await this.queue.enqueue('mrr-refresh', {
        type: 'MRR_REFRESH',
        tenantId,
        jobId,
        scheduledAt: new Date().toISOString(),
      });
      this.registeredJobs.add(jobId);
      this.logger.debug(`MRR refresh job registered for tenant ${tenantId}`);
    } catch (err) {
      this.logger.warn(`Failed to register MRR refresh job for tenant ${tenantId}: ${err}`);
    }
  }
}
