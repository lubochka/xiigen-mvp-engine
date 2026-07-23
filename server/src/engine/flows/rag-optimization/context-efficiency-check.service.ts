/**
 * ContextEfficiencyCheck — T457 GUARD service for FLOW-29.
 *
 * Hard-stop on context token over-allocation.
 * Suggestions are informational only — never auto-applied by this service.
 *
 * Iron rules:
 *   CF-476:     tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:      All methods return DataProcessResult<T> — never throw
 *   BUDGET:     from FREEDOM config — never hardcoded
 *   HARD_STOP:  CONTEXT_OVER_BUDGET — no bypass
 *   SUGGESTIONS: informational only — never applied
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface ContextCheckResult {
  readonly allowed: boolean;
  readonly totalAllocated: number;
  readonly budget: number;
  readonly remaining: number;
  readonly suggestions: Record<string, unknown>[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const CHECK_INDEX = 'flow29-context-checks';
const DEFAULT_CONTEXT_BUDGET = 128_000;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ContextEfficiencyCheck {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Check if context allocation plan is within budget.
   *
   * Returns CONTEXT_OVER_BUDGET if total exceeds budget — hard stop.
   * Returns optimization suggestions when within budget (informational only).
   */
  async checkAllocation(
    tenantId: string,
    allocationPlan: Record<string, number>,
  ): Promise<DataProcessResult<ContextCheckResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // Read budget from FREEDOM config
    const configResult = await this.db.searchDocuments('flow29-context-config', {
      tenant_id: tenantId,
      active: true,
    });
    const config =
      configResult.isSuccess && (configResult.data ?? []).length > 0 ? configResult.data![0] : null;

    const budget = (config?.['context_budget'] as number | undefined) ?? DEFAULT_CONTEXT_BUDGET;
    const totalAllocated = Object.values(allocationPlan).reduce((s, v) => s + (v ?? 0), 0);
    const remaining = budget - totalAllocated;

    if (totalAllocated > budget) {
      await this.db.storeDocument(
        CHECK_INDEX,
        {
          tenant_id: tenantId,
          event: 'CONTEXT_OVER_BUDGET',
          total_allocated: totalAllocated,
          budget,
          recorded_at: new Date().toISOString(),
        },
        `ctx-${Date.now()}`,
      );
      return DataProcessResult.failure(
        'CONTEXT_OVER_BUDGET',
        `Context over budget: allocated=${totalAllocated}, budget=${budget}`,
      );
    }

    // Generate suggestions for sections that are large (informational only)
    const suggestions: Record<string, unknown>[] = [];
    for (const [section, tokens] of Object.entries(allocationPlan)) {
      if (tokens > budget * 0.4) {
        suggestions.push({
          section,
          suggestion: `Consider reducing ${section} allocation (currently ${tokens} tokens, >40% of budget)`,
        });
      }
    }

    return DataProcessResult.success({
      allowed: true,
      totalAllocated,
      budget,
      remaining,
      suggestions,
    });
  }
}
