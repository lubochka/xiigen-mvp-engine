/**
 * T212 SubscriptionAnalyticsAggregator [DATA_PIPELINE]
 * FLOW-12: Subscription & Recurring Billing
 *
 * Additive-subtractive MRR aggregation — first billing-domain instance (CF-10-3 established
 * the pattern for review scores; T212 extends it to revenue metrics).
 *
 * Iron rules:
 *   IR-1: Both onSubscriptionActivated (ADD) AND onSubscriptionCancelled (SUBTRACT) handlers
 *         required. Additive-only MRR = score-0. CF-12-3.
 *   IR-2: normalizeMrr() is MACHINE (not from FREEDOM config):
 *         MONTHLY=priceCents, ANNUAL=Math.floor(priceCents/12),
 *         CUSTOM=Math.floor(priceCents/(intervalDays??30)*30). CF-12-3.
 *   IR-3: SubscriptionMetricsUpdated output has NO subscriberId field — tenant-level only.
 *   IR-4: IProrationService (F211) is SHARED — not re-registered here.
 *   IR-5: storeDocument(mrrMetric) BEFORE enqueue(SubscriptionMetricsUpdated). DNA-8.
 *
 * Emits: SubscriptionMetricsUpdated
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const SUBSCRIPTIONS_INDEX = 'xiigen-subscriptions';
const MRR_METRICS_INDEX = 'xiigen-mrr-metrics';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

/**
 * Normalizes priceCents to a monthly equivalent.
 * MACHINE formula — not configurable. CF-12-3.
 *
 * MONTHLY: priceCents (already monthly)
 * ANNUAL:  Math.floor(priceCents / 12)
 * CUSTOM:  Math.floor(priceCents / (intervalDays ?? 30) * 30)
 */
export function normalizeMrr(
  priceCents: number,
  billingInterval: string,
  intervalDays?: number | null,
): number {
  switch (billingInterval) {
    case 'MONTHLY':
      return priceCents;
    case 'ANNUAL':
      return Math.floor(priceCents / 12);
    case 'CUSTOM':
      return Math.floor((priceCents / (intervalDays ?? 30)) * 30);
    default:
      return priceCents;
  }
}

@Injectable()
export class SubscriptionAnalyticsAggregatorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T212',
        serviceName: 'SubscriptionAnalyticsAggregatorService',
        flowId: 'FLOW-12',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    return this.tenantContext.get?.('tenant')?.tenantId ?? 'unknown';
  }

  /**
   * Handler for SubscriptionActivated events — ADD path.
   * IR-1: Both this AND onSubscriptionCancelled must exist. CF-12-3.
   */
  async onSubscriptionActivated(
    _event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.recalculate(this.getTenantId());
  }

  /**
   * Handler for SubscriptionCancelled events — SUBTRACT path.
   * IR-1: Additive-only (missing this handler) = score-0. CF-12-3.
   */
  async onSubscriptionCancelled(
    _event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.recalculate(this.getTenantId());
  }

  /**
   * Core MRR recalculation — called by both ADD and SUBTRACT paths.
   * Fetches all ACTIVE/TRIALING subscriptions, applies normalizeMrr, sums.
   * storeDocument(mrrMetric) BEFORE enqueue(SubscriptionMetricsUpdated). DNA-8.
   */
  async recalculate(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    // Fetch all active subscriptions for this tenant
    const subsResult = await this.dbService.searchDocuments(SUBSCRIPTIONS_INDEX, {
      tenantId,
      // Note: both ACTIVE and TRIALING subscriptions contribute to MRR
    });

    if (!subsResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        'Failed to fetch subscriptions for MRR recalculation',
      );
    }

    const subscriptions = (subsResult.data ?? []) as Array<Record<string, unknown>>;

    // Filter to revenue-contributing statuses
    const contributing = subscriptions.filter((s) => {
      const status = s['status'] as string;
      return status === 'ACTIVE' || status === 'TRIALING';
    });

    // Apply normalizeMrr — MACHINE formula (IR-2, CF-12-3)
    let totalMrrCents = 0;
    for (const sub of contributing) {
      const priceCents = sub['priceCents'] as number;
      const billingInterval = sub['billingInterval'] as string;
      const intervalDays = sub['intervalDays'] as number | null;
      totalMrrCents += normalizeMrr(priceCents, billingInterval, intervalDays);
    }

    const now = new Date().toISOString();
    const metricId = `mrr-${tenantId}`;

    // Build output — IR-3: NO subscriberId field
    const mrrMetric: Record<string, unknown> = {
      metricId,
      tenantId,
      mrrCents: totalMrrCents,
      activeSubscriptions: contributing.length,
      calculatedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
      // NOTE: subscriberId is intentionally ABSENT (IR-3)
    };

    // DNA-8: storeDocument BEFORE enqueue (IR-5)
    const storeResult = await this.dbService.storeDocument(MRR_METRICS_INDEX, mrrMetric, metricId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store MRR metric: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Emit SubscriptionMetricsUpdated — after store (DNA-8)
    await this.queueService.enqueue('SubscriptionMetricsUpdated', {
      tenantId,
      mrrCents: totalMrrCents,
      activeSubscriptions: contributing.length,
      calculatedAt: now,
      // NOTE: subscriberId intentionally absent (IR-3)
    });

    return DataProcessResult.success({
      mrrCents: totalMrrCents,
      activeSubscriptions: contributing.length,
    });
  }
}
