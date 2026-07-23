/**
 * FLOW-10: Reviews & Reputation
 * BFA rules: CF-10-1 through CF-10-4
 *
 * CF-10-1: ELIGIBILITY_BEFORE_AUDIT — T169 eligibility check (ORDER 1) MUST run BEFORE
 *          audit storeDocument (ORDER 4). This INVERTS FLOW-08 T79 audit-first pattern.
 *          Both are domain-correct. DPO triple annotation required: conflictsWith FLOW-08-T79.
 *
 * CF-10-2: THREE_PATH_MODERATION — T170 MUST have three moderation outcomes:
 *          PASS → ReviewPublished, REJECT → ReviewRejected, UNCERTAIN → ReviewFlaggedForHuman.
 *          UNCERTAIN must never auto-reject. This INVERTS FLOW-08 binary moderation.
 *
 * CF-10-3: RETRACTION_HANDLING — T171 subscribes to BOTH ReviewPublished AND ReviewRetracted.
 *          Score recalculated from all PUBLISHED reviews on both events.
 *          Score clamped Math.max(1.0, Math.min(5.0, rawScore)) before storeDocument.
 *          T172 revision_allowed:true for content_policy only; false for other rejections.
 *
 * CF-10-4: SCOPE_ISOLATION — scope_isolation arbiter present in all arbiterConfig blocks
 *          (FC-32 / SK-526). Review records (PRIVATE), reputation scores (PRIVATE),
 *          review responses (PRIVATE). Audit trails (F169, F175) are PLATFORM_ONLY.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const REVIEWS_REPUTATION_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-10-1',
    flowId: 'FLOW-10',
    type: 'ELIGIBILITY_BEFORE_AUDIT',
    description:
      'T169 eligibility check runs at ORDER 1, BEFORE any write. ' +
      'F169 audit storeDocument() at ORDER 4, AFTER eligibility + validation + SETNX. ' +
      'This INVERTS FLOW-08 T79 audit-first pattern — both are domain-correct. ' +
      'DPO triple annotation: conflictsWith FLOW-08-T79-audit-first-pattern.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-10-2',
    flowId: 'FLOW-10',
    type: 'THREE_PATH_MODERATION',
    description:
      'T170 moderation has THREE paths: PASS → ReviewPublished, ' +
      'REJECT → ReviewRejected, UNCERTAIN → ReviewFlaggedForHuman (PENDING). ' +
      'Binary moderation (UNCERTAIN → REJECT) scores 0. ' +
      'This INVERTS FLOW-08 binary moderation DPO prior. ' +
      'DPO triple annotation: conflictsWith FLOW-08-binary-moderation.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-10-3',
    flowId: 'FLOW-10',
    type: 'RETRACTION_HANDLING',
    description:
      'T171 subscribes to BOTH ReviewPublished AND ReviewRetracted. ' +
      'Score recalculated from all PUBLISHED reviews on both events. ' +
      'Score clamped Math.max(1.0, Math.min(5.0, rawScore)) before storeDocument. ' +
      'T172 revision_allowed:true for content_policy only; false for not_owner + already_responded.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-913..CF-918) — edge-case coverage from docs/flow-coverage/reviews-reputation/P10-server-specs.md
  {
    ruleId: 'CF-913',
    flowId: 'FLOW-10',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/reviews-reputation — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-914',
    flowId: 'FLOW-10',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-915',
    flowId: 'FLOW-10',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-916',
    flowId: 'FLOW-10',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-917',
    flowId: 'FLOW-10',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on secondary write path (review-response retraction) — winner 201, loser 409. Second concurrency surface beyond EC-5 (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-918',
    flowId: 'FLOW-10',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 Secondary idempotency surface (score-recompute path) — replay returns cached 200 with same review aggregate (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-10-4: always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-10-4',
    flowId: 'FLOW-10',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). ' +
      'All review records (PRIVATE), reputation scores (PRIVATE), and review responses (PRIVATE) ' +
      'must carry tenantId from ALS. F169/F175 audit trails are PLATFORM_ONLY. ' +
      'xiigen-freedom-config reads are intentionally GLOBAL.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
