/**
 * AI Engine Fabric — TokenBudget: pre-flight budget enforcement.
 * Per-tenant cost limits (configurable) + per-request max_tokens cap.
 * Integrates with CostTracker to check current spend.
 *
 * DNA-3: checkBudget returns DataProcessResult<boolean>.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { CostTracker } from './cost-tracker';

@Injectable()
export class TokenBudget {
  private readonly tracker: CostTracker;
  private readonly defaultTenantLimit: number;
  private readonly perRequestMaxTokens: number;
  private readonly tenantLimits = new Map<string, number>();

  constructor(
    tracker: CostTracker,
    @Optional()
    config?: {
      defaultTenantLimit?: number;
      perRequestMaxTokens?: number;
      tenantLimits?: Record<string, number>;
    },
  ) {
    this.tracker = tracker;
    this.defaultTenantLimit = config?.defaultTenantLimit ?? 100.0;
    this.perRequestMaxTokens = config?.perRequestMaxTokens ?? 32000;
    if (config?.tenantLimits) {
      for (const [tid, limit] of Object.entries(config.tenantLimits)) {
        this.tenantLimits.set(tid, limit);
      }
    }
  }

  /**
   * Check if a request is within budget.
   * Returns success(true) if OK, failure if over-limit.
   */
  checkBudget(tenantId: string, estimatedTokens = 0): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required for budget check');
    }

    // Per-request cap
    if (estimatedTokens > this.perRequestMaxTokens) {
      return DataProcessResult.failure(
        'REQUEST_TOO_LARGE',
        `Estimated ${estimatedTokens} tokens exceeds per-request cap of ${this.perRequestMaxTokens}`,
      );
    }

    // Per-tenant cost limit
    const limit = this.tenantLimits.get(tenantId) ?? this.defaultTenantLimit;
    const currentCost = this.tracker.getTenantTotalCost(tenantId);
    if (currentCost >= limit) {
      return DataProcessResult.failure(
        'BUDGET_EXCEEDED',
        `Tenant '${tenantId}' cost ${currentCost.toFixed(4)} >= limit ${limit.toFixed(4)}`,
      );
    }

    return DataProcessResult.success(true);
  }

  /** Set a custom cost limit for a specific tenant. */
  setTenantLimit(tenantId: string, limit: number): void {
    this.tenantLimits.set(tenantId, limit);
  }

  /** Get the cost limit for a tenant (custom or default). */
  getTenantLimit(tenantId: string): number {
    return this.tenantLimits.get(tenantId) ?? this.defaultTenantLimit;
  }

  /** Get the per-request max tokens cap. */
  get maxTokensPerRequest(): number {
    return this.perRequestMaxTokens;
  }

  /** Get the default tenant limit. */
  get defaultLimit(): number {
    return this.defaultTenantLimit;
  }
}
