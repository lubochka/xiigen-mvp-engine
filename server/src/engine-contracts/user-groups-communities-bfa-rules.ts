/**
 * FLOW-06: Membership & Group Feed
 * BFA rules: CF-06-1, CF-06-2, CF-06-3
 *
 * CF-06-1: ACCESS_CONTROL_BEFORE_CONTENT — Branch B (T104 HistoricalContentSeeder)
 *          MUST trigger on MembershipActivated, not on GroupJoinRequested.
 *          Seeding content before membership is confirmed creates a data leakage window
 *          for private group join requests that are pending approval or later denied.
 *
 * CF-06-2: TIER_FROM_SUBSCRIPTION — T100 SubscriptionTierResolver MUST query
 *          xiigen-subscriptions by userId to resolve membershipTier. The join request
 *          payload has no tier field. Any T100 implementation that reads tier from
 *          input enables silent privilege escalation (FREE user claims PREMIUM).
 *
 * CF-06-3: MEMBERSHIP_SETNX_IDEMPOTENCY — T99 MembershipOrchestrator MUST use SETNX
 *          on (userId, groupId) composite key. Existing record returns
 *          DataProcessResult.success(existingRecord) — never failure('ALREADY_MEMBER').
 *          Returning failure on duplicate breaks client retry semantics.
 *
 * CF-06-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526).
 *          Membership, approval, feed, and tier change records are PRIVATE per-tenant.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_06_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-06-1',
    flowId: 'FLOW-06',
    type: 'ACCESS_CONTROL_BEFORE_CONTENT',
    description:
      "T104 HistoricalContentSeeder MUST use @EventPattern('MembershipActivated') — never @EventPattern('GroupJoinRequested'). Triggering content seeding on join request creates a data leakage window: private group members whose request is later denied will have already received content. Content retrieval begins only after ACTIVE membership is stored.",
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-06-2',
    flowId: 'FLOW-06',
    type: 'TIER_FROM_SUBSCRIPTION',
    description:
      "T100 SubscriptionTierResolver MUST read membershipTier from xiigen-subscriptions (server-side). The membershipTier field MUST NOT exist in T100's input shape. Any implementation that reads tier from the incoming join request payload enables silent privilege escalation: a FREE subscriber submitting tier='PREMIUM' would receive premium access.",
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-06-3',
    flowId: 'FLOW-06',
    type: 'MEMBERSHIP_SETNX_IDEMPOTENCY',
    description:
      "T99 MembershipOrchestrator MUST use SETNX semantics on (userId, groupId) composite key for new membership creation. If a record already exists, return DataProcessResult.success(existingRecord). Returning DataProcessResult.failure('ALREADY_MEMBER') on duplicate breaks idempotency: client retries after a network error would receive an error instead of their existing membership.",
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-878..CF-883) — edge-case coverage from docs/flow-coverage/user-groups-communities/P10-server-specs.md
  {
    ruleId: 'CF-878',
    flowId: 'FLOW-06',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/user-groups-communities — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-879',
    flowId: 'FLOW-06',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-880',
    flowId: 'FLOW-06',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-881',
    flowId: 'FLOW-06',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-882',
    flowId: 'FLOW-06',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on POST /api/dynamic/user-groups-communities — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-883',
    flowId: 'FLOW-06',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-06-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-06-4',
    flowId: 'FLOW-06',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). Membership, approval, feed, and tier change records are PRIVATE per-tenant.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
