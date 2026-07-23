/**
 * AI Engine Fabric — CostTracker: tracks token usage and cost per model/tenant.
 * In-memory storage (later: persist to ES via Database Fabric).
 */

import { Injectable } from '@nestjs/common';

interface UsageBucket {
  totalCost: number;
  totalTokensIn: number;
  totalTokensOut: number;
  callCount: number;
}

interface TenantUsage extends UsageBucket {
  byModel: Record<string, UsageBucket>;
}

@Injectable()
export class CostTracker {
  private readonly tenantUsage = new Map<string, TenantUsage>();
  private readonly modelUsage = new Map<string, UsageBucket>();

  /** Record a single API call. */
  record(
    tenantId: string,
    modelId: string,
    tokensIn: number,
    tokensOut: number,
    cost: number,
  ): void {
    // Tenant-level
    let tu = this.tenantUsage.get(tenantId);
    if (!tu) {
      tu = { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, callCount: 0, byModel: {} };
      this.tenantUsage.set(tenantId, tu);
    }
    tu.totalCost += cost;
    tu.totalTokensIn += tokensIn;
    tu.totalTokensOut += tokensOut;
    tu.callCount += 1;

    // Per-model within tenant
    if (!tu.byModel[modelId]) {
      tu.byModel[modelId] = { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, callCount: 0 };
    }
    const bm = tu.byModel[modelId];
    bm.totalCost += cost;
    bm.totalTokensIn += tokensIn;
    bm.totalTokensOut += tokensOut;
    bm.callCount += 1;

    // Global model-level
    let mu = this.modelUsage.get(modelId);
    if (!mu) {
      mu = { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, callCount: 0 };
      this.modelUsage.set(modelId, mu);
    }
    mu.totalCost += cost;
    mu.totalTokensIn += tokensIn;
    mu.totalTokensOut += tokensOut;
    mu.callCount += 1;
  }

  /** Get usage summary for a tenant. */
  getTenantUsage(tenantId: string): Record<string, unknown> {
    const tu = this.tenantUsage.get(tenantId);
    if (!tu) {
      return { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, callCount: 0, byModel: {} };
    }
    return {
      totalCost: tu.totalCost,
      totalTokensIn: tu.totalTokensIn,
      totalTokensOut: tu.totalTokensOut,
      callCount: tu.callCount,
      byModel: { ...tu.byModel },
    };
  }

  /** Get usage summary for a model (across all tenants). */
  getModelUsage(modelId: string): Record<string, unknown> {
    const mu = this.modelUsage.get(modelId);
    if (!mu) {
      return { totalCost: 0, totalTokensIn: 0, totalTokensOut: 0, callCount: 0 };
    }
    return { ...mu };
  }

  /** Get total cost for a tenant. */
  getTenantTotalCost(tenantId: string): number {
    return this.tenantUsage.get(tenantId)?.totalCost ?? 0;
  }

  /** Reset all tracked usage. */
  reset(): void {
    this.tenantUsage.clear();
    this.modelUsage.clear();
  }

  /** Number of tracked tenants. */
  get tenantCount(): number {
    return this.tenantUsage.size;
  }

  /** Number of tracked models. */
  get modelCount(): number {
    return this.modelUsage.size;
  }
}
