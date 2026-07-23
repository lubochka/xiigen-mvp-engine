/**
 * TierChangeProcessor (T116) — FLOW-06 Phase 1F (Tier Change Subflows)
 * Single responsibility: compute new access levels when subscription tier changes.
 *
 * Iron rules:
 *   Triggers on SubscriptionChanged event.
 *   Computes new accessLevels from newTier (same logic as T100).
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

const TIER_ACCESS_MAP: Record<string, string[]> = {
  PREMIUM: ['premium', 'standard', 'open_access'],
  STANDARD: ['standard', 'open_access'],
  FREE: ['open_access'],
};

export interface TierChangeProcessorInput {
  userId: string;
  groupId: string;
  newTier: string;
  oldTier: string;
  tenantId: string;
}

export interface TierChangeResult {
  newTier: string;
  oldTier: string;
  newAccessLevels: string[];
  oldAccessLevels: string[];
  isUpgrade: boolean;
}

function resolveAccessLevels(tier: string): string[] {
  return TIER_ACCESS_MAP[tier.toUpperCase()] ?? TIER_ACCESS_MAP['FREE'];
}

const TIER_RANK: Record<string, number> = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

export class TierChangeProcessor {
  async process(input: TierChangeProcessorInput): Promise<DataProcessResult<TierChangeResult>> {
    try {
      const newTier = input.newTier.toUpperCase();
      const oldTier = input.oldTier.toUpperCase();
      const newAccessLevels = resolveAccessLevels(newTier);
      const oldAccessLevels = resolveAccessLevels(oldTier);
      const isUpgrade = (TIER_RANK[newTier] ?? 0) > (TIER_RANK[oldTier] ?? 0);

      return DataProcessResult.success({
        newTier,
        oldTier,
        newAccessLevels,
        oldAccessLevels,
        isUpgrade,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'TIER_CHANGE_PROCESSOR_ERROR',
        `TierChangeProcessor threw: ${String(err)}`,
      );
    }
  }
}
