/**
 * FLOW-06: User Groups & Communities
 * Task types: T71–T72, T89–T90 (4 task types)
 * Families: 29–30
 * BFA rules: CF-797–CF-802
 * Factories: F254–F257
 *
 * Domain: When a member joins a group on the XIIGen community platform,
 * update their membership tier, populate their group feed with relevant
 * content, and enforce access control based on their membership level.
 *
 * DNA compliance:
 *   DNA-2: all queries use Record<string, unknown>
 *   DNA-3: all methods return DataProcessResult
 *   DNA-8: storeDocument() BEFORE enqueue()
 */

// ── T71 — GroupMembershipProcessor ───────────────────────────────────────────

export const T71_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T71',
  name: 'GroupMembershipProcessor',
  family: 29,
  flowId: 'FLOW-06',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Processes join/leave group membership events. ' +
    'Validates member eligibility; invite_only groups require a valid invitation before ' +
    'processing. Stores membership record with dual scope (tenantId AND groupId) before ' +
    'emitting MembershipJoined or MembershipLeft CloudEvent.',
  requiredFactories: ['F254', 'F255'],
  bfaRules: ['CF-797', 'CF-798'],
  ironRules: [
    'IR-1: storeDocument BEFORE enqueue (DNA-8)',
    'IR-2: invite_only groups require valid invitation before processing (not just discoverable)',
    'IR-3: dual scope — tenantId AND groupId must be present on all stored records',
  ],
  ragPatterns: ['invite-only-gate', 'dual-scope-record'],
};

// ── T72 — MembershipTierUpdater ───────────────────────────────────────────────

export const T72_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T72',
  name: 'MembershipTierUpdater',
  family: 29,
  flowId: 'FLOW-06',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Updates membership tier based on join event. ' +
    'Tier hierarchy: FREE < STANDARD < PREMIUM < ADMIN. ' +
    'Members CANNOT promote themselves (role_hierarchy_no_self_promotion). ' +
    'Admin escalation requires explicit admin action (admin_only_escalation). ' +
    'Stores tier record before emitting TierUpdated.',
  requiredFactories: ['F254', 'F255'],
  bfaRules: ['CF-799', 'CF-800'],
  ironRules: [
    'IR-1: members CANNOT promote themselves (role_hierarchy_no_self_promotion)',
    'IR-2: admin escalation requires requesting user to be existing ADMIN (admin_only_escalation)',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['role-hierarchy-guard', 'admin-only-escalation'],
  membershipArchetype: 'MEMBERSHIP',
  tierHierarchy: ['FREE', 'STANDARD', 'PREMIUM', 'ADMIN'],
};

// ── T89 — GroupFeedPopulator ──────────────────────────────────────────────────

export const T89_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T89',
  name: 'GroupFeedPopulator',
  family: 30,
  flowId: 'FLOW-06',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description:
    'Populates group feed with relevant content. ' +
    'Engagement scores are clamped to [0.0, 1.0] — never saturated. ' +
    'Engagement weights from FREEDOM config only — no hardcoded constants. ' +
    'Skips feed population if group has no active members (conditional_side_effect_skip). ' +
    'Stores feed record before emitting GroupFeedPopulated.',
  requiredFactories: ['F254', 'F257'],
  bfaRules: ['CF-801'],
  ironRules: [
    'IR-1: engagement score MUST be clamped to [0.0, 1.0] (clamp, never saturate)',
    'IR-2: engagement weights from FREEDOM config — no hardcoded constants',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
    'IR-4: skip feed population if group has no active members (conditional_side_effect_skip)',
  ],
  ragPatterns: [
    'engagement-score-clamped-0-to-1',
    'engagement-weights-from-freedom-config',
    'conditional-side-effect-skip',
  ],
  feedArchetype: 'GROUP_FEED',
  engagementScoreClamped: {
    min: 0.0,
    max: 1.0,
    clampNotSaturate: true,
  },
};

// ── T90 — AccessControlEnforcer ───────────────────────────────────────────────

export const T90_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T90',
  name: 'AccessControlEnforcer',
  family: 30,
  flowId: 'FLOW-06',
  archetype: 'validation',
  version: 'v1',
  executionModel: 'async',
  description:
    'Enforces access control based on membership level. ' +
    'Dual scope isolation: both tenantId and groupId required on all reads/writes. ' +
    'invite_only groups are NOT discoverable to non-members. ' +
    'Access decisions are logged (storeDocument BEFORE enqueue).',
  requiredFactories: ['F254', 'F256'],
  bfaRules: ['CF-801', 'CF-802'],
  ironRules: [
    'IR-1: dual scope isolation — both tenantId and groupId required on all reads/writes',
    'IR-2: invite_only groups are NOT discoverable (invite_only_not_discoverable)',
    'IR-3: access decisions logged (storeDocument BEFORE enqueue)',
  ],
  ragPatterns: ['dual-scope-isolation', 'invite-only-not-discoverable', 'access-decision-log'],
};

/** All FLOW-06 contracts as an array for bootstrapper registration. */
export const FLOW_06_CONTRACTS: Record<string, unknown>[] = [
  T71_CONTRACT,
  T72_CONTRACT,
  T89_CONTRACT,
  T90_CONTRACT,
];
