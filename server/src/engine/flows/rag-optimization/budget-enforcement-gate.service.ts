/**
 * BudgetEnforcementGate — T446 GUARD service for FLOW-29.
 *
 * Hard-stop on token/cost budget exceeded.
 * BUDGET_EXCEEDED is a hard stop — no override mechanism exists on this service.
 *
 * Iron rules:
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   LIMITS:  from FREEDOM config — never hardcoded per-tenant constants
 *   HARD_STOP: BUDGET_EXCEEDED — no bypass
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface BudgetCheckResult {
  readonly allowed: boolean;
  readonly remainingTokens: number;
  readonly remainingCost: number;
  readonly tenantId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BUDGET_INDEX = 'flow29-budget-checks';
const DEFAULT_TOKEN_LIMIT = 100_000;
const DEFAULT_COST_LIMIT = 10.0;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BudgetEnforcementGate {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Check if a request is within token and cost budgets.
   *
   * Returns BUDGET_EXCEEDED if either limit is breached — hard stop, no override.
   * Both limits are independently enforced.
   */
  async checkBudget(
    tenantId: string,
    requestedTokens: number,
    estimatedCost: number,
  ): Promise<DataProcessResult<BudgetCheckResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (typeof requestedTokens !== 'number' || requestedTokens < 0) {
      return DataProcessResult.failure(
        'INVALID_TOKEN_COUNT',
        'requestedTokens must be a non-negative number',
      );
    }
    if (typeof estimatedCost !== 'number' || estimatedCost < 0) {
      return DataProcessResult.failure(
        'INVALID_COST',
        'estimatedCost must be a non-negative number',
      );
    }

    // Read budget limits from FREEDOM config (DB-backed)
    const limitsResult = await this.db.searchDocuments('flow29-budget-config', {
      tenant_id: tenantId,
      active: true,
    });
    const config =
      limitsResult.isSuccess && (limitsResult.data ?? []).length > 0 ? limitsResult.data![0] : null;

    const tokenLimit = (config?.['token_limit'] as number | undefined) ?? DEFAULT_TOKEN_LIMIT;
    const costLimit = (config?.['cost_limit'] as number | undefined) ?? DEFAULT_COST_LIMIT;

    // Read current usage
    const usageResult = await this.db.searchDocuments('flow29-budget-usage', {
      tenant_id: tenantId,
      period: 'current',
    });
    const usage =
      usageResult.isSuccess && (usageResult.data ?? []).length > 0 ? usageResult.data![0] : null;

    const usedTokens = (usage?.['tokens_used'] as number | undefined) ?? 0;
    const usedCost = (usage?.['cost_used'] as number | undefined) ?? 0.0;

    const remainingTokens = Math.max(0, tokenLimit - usedTokens);
    const remainingCost = Math.max(0, costLimit - usedCost);

    if (requestedTokens > remainingTokens || estimatedCost > remainingCost) {
      await this.db.storeDocument(
        BUDGET_INDEX,
        {
          tenant_id: tenantId,
          event: 'BUDGET_EXCEEDED',
          requested_tokens: requestedTokens,
          estimated_cost: estimatedCost,
          remaining_tokens: remainingTokens,
          remaining_cost: remainingCost,
          recorded_at: new Date().toISOString(),
        },
        `bud-${Date.now()}`,
      );
      return DataProcessResult.failure(
        'BUDGET_EXCEEDED',
        `Budget exceeded: tokens_remaining=${remainingTokens}, cost_remaining=${remainingCost.toFixed(4)}`,
      );
    }

    return DataProcessResult.success({ allowed: true, remainingTokens, remainingCost, tenantId });
  }
}
