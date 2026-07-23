/**
 * FLOW-05: Completion & Gamification
 * BFA rules: CF-05-1, CF-05-2, CF-05-3
 *
 * CF-05-1: SERVER_SIDE_CALCULATION — T84 PointsCalculator must never read earnedPoints
 *          from the incoming request payload. Points are derived server-side from the
 *          stored questionnaireResult.scorePercent via a FREEDOM formula.
 *          Client-submitted earnedPoints enable point farming: score-0 on any T84
 *          implementation that reads earnedPoints from input.
 *
 * CF-05-2: TIMEZONE_AWARE_STREAK — T96 StreakManager must receive userTimezoneOffset
 *          and compute localDate = utcNow + offset. Using UTC midnight as the streak
 *          boundary silently breaks streaks for learners in non-UTC timezones.
 *          score-0 on any T96 implementation using new Date().toISOString() without offset.
 *
 * CF-05-3: PRIVACY_GATE_BRANCH_ENTRY — T90 SocialShareGate is the sole entry to Branch C.
 *          T91 SocialShareDistributor MUST use @EventPattern('SocialShareApproved'), not
 *          @EventPattern('QuestionnaireAnswered'). Triggering T91 on QuestionnaireAnswered
 *          bypasses privacy consent and distributes content for private-mode users.
 *
 * CF-05-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526).
 *          Completion, achievement, gamification, and social records are PRIVATE.
 *          ML adaptation records are PRIVATE.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_05_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-05-1',
    flowId: 'FLOW-05',
    type: 'SERVER_SIDE_CALCULATION',
    description:
      "T84 PointsCalculator MUST derive points server-side from questionnaireResult.scorePercent (stored DB record). The earnedPoints field MUST NOT exist in T84's input shape. Any implementation that reads earnedPoints from the incoming request payload is a point farming vector and scores 0.",
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-05-2',
    flowId: 'FLOW-05',
    type: 'TIMEZONE_AWARE_STREAK',
    description:
      'T96 StreakManager MUST receive userTimezoneOffset (minutes) and compute localDate = utcNow + offsetMinutes. UTC-based streak date comparison (new Date().toISOString().slice(0,10)) silently breaks streaks for learners outside UTC. userTimezoneOffset is a required contract field — absence is a BUILD_FAILURE.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-05-3',
    flowId: 'FLOW-05',
    type: 'PRIVACY_GATE_BRANCH_ENTRY',
    description:
      "T91 SocialShareDistributor MUST use @EventPattern('SocialShareApproved') — never @EventPattern('QuestionnaireAnswered'). T90 SocialShareGate is the structural privacy gate for Branch C. Bypassing T90 by triggering T91 directly on QuestionnaireAnswered distributes content for private-mode users without consent.",
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-867..CF-877) — edge-case coverage from docs/flow-coverage/completion-gamification/P10-server-specs.md
  {
    ruleId: 'CF-867',
    flowId: 'FLOW-05',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/completion-gamification — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-868',
    flowId: 'FLOW-05',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-869',
    flowId: 'FLOW-05',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-870',
    flowId: 'FLOW-05',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-871',
    flowId: 'FLOW-05',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on POST /api/dynamic/completion-gamification — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-872',
    flowId: 'FLOW-05',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-873',
    flowId: 'FLOW-05',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-13 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-874',
    flowId: 'FLOW-05',
    type: 'DNA8_ORDERING',
    description:
      'EC-14 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-875',
    flowId: 'FLOW-05',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-15 Optimistic concurrency on POST /api/dynamic/completion-gamification — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-876',
    flowId: 'FLOW-05',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-16 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-877',
    flowId: 'FLOW-05',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-18 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-05-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-05-4',
    flowId: 'FLOW-05',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). Completion, achievement, gamification, and social records are PRIVATE. ML adaptation records are PRIVATE.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
