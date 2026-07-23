/**
 * FLOW-07: Friend Request & Social Feed
 * BFA rules: CF-07-1, CF-07-2, CF-07-3, CF-07-4
 *
 * CF-07-1: INLINE_ONLY_SERVICE — T81 PrivacyGatekeeper MUST be @Injectable() only.
 *          No @EventPattern, no @MessagePattern. T73/T76/T78 inject T81 via constructor
 *          and call check() synchronously. Queue-driven privacy checks produce stale results.
 *
 * CF-07-2: BIDIRECTIONAL_ATOMIC_WRITE — T75 ConnectionGraphWriter MUST write BOTH
 *          A→B and B→A adjacency entries in ONE ORM transaction. Two separate
 *          storeDocument calls create a partial-write window that leaves the social
 *          graph asymmetric with no error surfaced.
 *
 * CF-07-3: SCORE_ZERO_PASSTHROUGH — T77 FeedScorer MUST pass all items through
 *          regardless of score value. score=0 is lowest relevance, not a suppress
 *          condition. T78 applies delivery thresholds from FREEDOM config.
 *
 * CF-07-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526).
 *          Connection, feed, and mutual-count records are PRIVATE per-tenant.
 *          T82 aggregate metrics are GLOBAL (no per-user IDs).
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_07_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-07-1',
    flowId: 'FLOW-07',
    type: 'INLINE_ONLY_SERVICE',
    description:
      'T81 PrivacyGatekeeper MUST be @Injectable() only — no @EventPattern, no @MessagePattern. ' +
      'Any generated implementation with a queue entry point is a BUILD_FAILURE (CF-812). ' +
      'T73/T76/T78 inject T81 via constructor and call check() synchronously.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-07-2',
    flowId: 'FLOW-07',
    type: 'BIDIRECTIONAL_ATOMIC_WRITE',
    description:
      'T75 ConnectionGraphWriter MUST write BOTH A→B and B→A adjacency entries in ONE ORM transaction (CF-806). ' +
      'Two separate storeDocument calls create a partial-write window. ' +
      'connectionId = hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-07-3',
    flowId: 'FLOW-07',
    type: 'SCORE_ZERO_PASSTHROUGH',
    description:
      'T77 FeedScorer MUST pass all items through regardless of score value (CF-807). ' +
      'score=0 is lowest relevance, not a suppress condition. ' +
      'Any code path that drops, filters, or skips items based on score = BUILD_FAILURE. ' +
      'Delivery thresholds belong in T78 from FREEDOM config.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-884..CF-894) — edge-case coverage from docs/flow-coverage/friend-request-social-feed/P10-server-specs.md
  {
    ruleId: 'CF-884',
    flowId: 'FLOW-07',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/friend-request-social-feed — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-885',
    flowId: 'FLOW-07',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-886',
    flowId: 'FLOW-07',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-887',
    flowId: 'FLOW-07',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-888',
    flowId: 'FLOW-07',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on POST /api/dynamic/friend-request-social-feed — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-889',
    flowId: 'FLOW-07',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-890',
    flowId: 'FLOW-07',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-13 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-891',
    flowId: 'FLOW-07',
    type: 'DNA8_ORDERING',
    description:
      'EC-14 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-892',
    flowId: 'FLOW-07',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-15 Optimistic concurrency on POST /api/dynamic/friend-request-social-feed — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-893',
    flowId: 'FLOW-07',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-16 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-894',
    flowId: 'FLOW-07',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-18 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-07-4: always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-07-4',
    flowId: 'FLOW-07',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). ' +
      'Connection records PRIVATE per-tenant. Feed records PRIVATE. ' +
      'Mutual-count records PRIVATE. T82 aggregate metrics are GLOBAL (no per-user IDs).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
