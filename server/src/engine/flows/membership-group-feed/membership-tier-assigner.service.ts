/**
 * MembershipTierAssigner (T100) — FLOW-06 Phase 1A
 * Single responsibility: determine assigned tier from subscription record + group floor.
 *
 * Iron rules:
 *   DR-06-A, CF-06-2: Tier from xiigen-subscriptions DB query — NOT from input.
 *   Output is structured object: { assignedTier, accessLevels[], subscriptionId }.
 *   Group floor tier from FREEDOM config key flow06_group_min_tier (default 'FREE').
 *   Access levels: PREMIUM → ['premium', 'standard', 'open_access'];
 *                  STANDARD → ['standard', 'open_access'];
 *                  FREE → ['open_access'].
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

const SUBSCRIPTIONS_INDEX = 'xiigen-subscriptions';
const FREEDOM_INDEX = 'freedom_configs';

export interface MembershipTierAssignerInput {
  userId: string;
  groupId: string;
  tenantId: string;
}

export interface AssignedTierResult {
  assignedTier: string;
  accessLevels: string[];
  subscriptionId: string;
}

const TIER_ACCESS_MAP: Record<string, string[]> = {
  PREMIUM: ['premium', 'standard', 'open_access'],
  STANDARD: ['standard', 'open_access'],
  FREE: ['open_access'],
};

const TIER_RANK: Record<string, number> = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

function resolveAccessLevels(tier: string): string[] {
  return TIER_ACCESS_MAP[tier] ?? TIER_ACCESS_MAP['FREE'];
}

function applyFloorTier(subscriptionTier: string, floorTier: string): string {
  const subRank = TIER_RANK[subscriptionTier] ?? 0;
  const floorRank = TIER_RANK[floorTier] ?? 0;
  return subRank >= floorRank ? subscriptionTier : floorTier;
}

export class MembershipTierAssigner {
  constructor(private readonly db: IDatabaseService) {}

  async assignTier(
    input: MembershipTierAssignerInput,
  ): Promise<DataProcessResult<AssignedTierResult>> {
    try {
      // ── Fetch subscription record (DR-06-A: tier from DB, not input) ──────
      const subResult = await this.db.searchDocuments(SUBSCRIPTIONS_INDEX, {
        user_id: input.userId,
      });
      if (!subResult.isSuccess || (subResult.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'SUBSCRIPTION_NOT_FOUND',
          `No subscription found for user ${input.userId}`,
        );
      }
      const subscription = subResult.data![0] as Record<string, unknown>;
      const subscriptionId = (subscription['subscription_id'] as string) ?? `sub-${Date.now()}`;
      const subscriptionTier = ((subscription['tier'] as string) ?? 'FREE').toUpperCase();

      // ── Fetch group floor tier from FREEDOM config ────────────────────────
      const configResult = await this.db.searchDocuments(FREEDOM_INDEX, {
        config_key: 'flow06_group_min_tier',
      });
      const floorTier =
        configResult.isSuccess && (configResult.data ?? []).length > 0
          ? (
              ((configResult.data![0] as Record<string, unknown>)['config_value'] as string) ??
              'FREE'
            ).toUpperCase()
          : 'FREE';

      // ── Apply floor tier ──────────────────────────────────────────────────
      const assignedTier = applyFloorTier(subscriptionTier, floorTier);
      const accessLevels = resolveAccessLevels(assignedTier);

      return DataProcessResult.success({ assignedTier, accessLevels, subscriptionId });
    } catch (err) {
      return DataProcessResult.failure(
        'MEMBERSHIP_TIER_ASSIGNER_ERROR',
        `MembershipTierAssigner threw: ${String(err)}`,
      );
    }
  }
}
