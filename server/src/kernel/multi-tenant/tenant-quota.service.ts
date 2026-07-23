/**
 * TenantQuotaService — Rate limits per tenant.
 *
 * Tracks: API calls per minute, tokens per day, storage usage.
 * Returns DataProcessResult.failure('QUOTA_EXCEEDED', ...) when over.
 *
 * In-memory counters for Phase 1. Will switch to Redis-backed in Phase 3+.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';
import { DataProcessResult } from '../data-process-result';

interface QuotaCounter {
  count: number;
  windowStart: number; // epoch ms
}

@Injectable()
export class TenantQuotaService {
  /** Per-tenant, per-metric counters. Key = `${tenantId}:${metric}` */
  private readonly counters = new Map<string, QuotaCounter>();

  /** Window durations in ms. */
  private static readonly WINDOWS: Record<string, number> = {
    'api.calls': 60_000, // 1 minute
    'ai.tokens': 86_400_000, // 1 day
  };

  constructor(private readonly cls: ClsService) {}

  /**
   * Check if a quota allows the requested amount, and consume it if so.
   * Returns success if allowed, failure with QUOTA_EXCEEDED if not.
   */
  async checkAndConsume(
    metric: string,
    amount: number = 1,
    tenantId?: string,
  ): Promise<DataProcessResult<{ remaining: number; limit: number }>> {
    const tenant = tenantId
      ? undefined // explicit tenantId means we need to look up limits differently
      : this.getCurrentTenant();

    const effectiveTenantId = tenantId ?? tenant?.tenantId;
    if (!effectiveTenantId) {
      return DataProcessResult.failure(
        'TENANT_NOT_FOUND',
        'Cannot check quota without a tenant context',
      );
    }

    const limit = this.getLimit(metric, tenant);
    if (limit === undefined) {
      // No limit configured for this metric — always allow
      return DataProcessResult.success({ remaining: Infinity, limit: Infinity });
    }

    const key = `${effectiveTenantId}:${metric}`;
    const now = Date.now();
    const windowMs = TenantQuotaService.WINDOWS[metric] ?? 60_000;

    // Get or create counter
    let counter = this.counters.get(key);
    if (!counter || now - counter.windowStart >= windowMs) {
      // Window expired — reset
      counter = { count: 0, windowStart: now };
      this.counters.set(key, counter);
    }

    const remaining = limit - counter.count;
    if (counter.count + amount > limit) {
      return DataProcessResult.failure(
        'QUOTA_EXCEEDED',
        `Quota exceeded for '${metric}': ${counter.count + amount} > ${limit} ` +
          `(tenant: ${effectiveTenantId})`,
        { metric, current: counter.count, requested: amount, limit, remaining },
      );
    }

    // Consume
    counter.count += amount;
    return DataProcessResult.success({
      remaining: limit - counter.count,
      limit,
    });
  }

  /**
   * Check quota without consuming. Read-only peek.
   */
  async check(
    metric: string,
    tenantId?: string,
  ): Promise<DataProcessResult<{ current: number; limit: number; remaining: number }>> {
    const tenant = tenantId ? undefined : this.getCurrentTenant();
    const effectiveTenantId = tenantId ?? tenant?.tenantId;

    if (!effectiveTenantId) {
      return DataProcessResult.failure(
        'TENANT_NOT_FOUND',
        'Cannot check quota without a tenant context',
      );
    }

    const limit = this.getLimit(metric, tenant);
    if (limit === undefined) {
      return DataProcessResult.success({ current: 0, limit: Infinity, remaining: Infinity });
    }

    const key = `${effectiveTenantId}:${metric}`;
    const now = Date.now();
    const windowMs = TenantQuotaService.WINDOWS[metric] ?? 60_000;

    const counter = this.counters.get(key);
    if (!counter || now - counter.windowStart >= windowMs) {
      return DataProcessResult.success({ current: 0, limit, remaining: limit });
    }

    return DataProcessResult.success({
      current: counter.count,
      limit,
      remaining: Math.max(0, limit - counter.count),
    });
  }

  /**
   * Reset quota counters for a tenant (e.g., on plan upgrade).
   */
  reset(tenantId: string, metric?: string): void {
    if (metric) {
      this.counters.delete(`${tenantId}:${metric}`);
    } else {
      // Reset all metrics for this tenant
      for (const key of this.counters.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.counters.delete(key);
        }
      }
    }
  }

  /** Clear all counters — for testing only. */
  clearAll(): void {
    this.counters.clear();
  }

  private getLimit(metric: string, tenant?: TenantContext): number | undefined {
    if (!tenant) return undefined;

    switch (metric) {
      case 'api.calls':
        return tenant.plan.maxApiCallsPerMinute;
      case 'ai.tokens':
        return tenant.plan.maxTokensPerDay;
      default:
        return undefined;
    }
  }

  private getCurrentTenant(): TenantContext | undefined {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    } catch {
      return undefined;
    }
  }
}
