/**
 * FLOW-02: Business Onboarding & Personalization
 * BFA rules: CF-02-1, CF-02-2, CF-02-3, CF-02-4
 *
 * CF-02-1: T50 dual-record-write: PRIVATE full profile + GLOBAL 4-field matching record — both required
 * CF-02-2: T51 30s timeout → partialResults:true in successModes — NEVER in failureModes
 * CF-02-3: T52 PersonalizationCompleted is a MACHINE string literal — never computed or read from config
 * CF-02-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32)
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_02_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-02-1',
    flowId: 'FLOW-02',
    type: 'DUAL_WRITE_CONSTRAINT',
    description:
      'T50 dual-record-write: PRIVATE full profile + GLOBAL 4-field matching record — both required. Missing GLOBAL write means users are invisible to FLOW-03 audience scoring.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-02-2',
    flowId: 'FLOW-02',
    type: 'MACHINE_CONSTANT',
    description:
      'T51 B1 matching timeout 30s → partialResults:true is a SUCCESS MODE — never in failureModes. Output produced = success. Placing in failureModes teaches models to treat designed degradation as errors.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-02-3',
    flowId: 'FLOW-02',
    type: 'EVENT_NAME_COLLISION',
    description:
      'T52 PersonalizationCompleted is a MACHINE string literal — never computed or read from config. FLOW-02 MUST NOT emit OnboardingCompleted (owned by FLOW-01). Collision causes FLOW-08 to create duplicate listing feeds.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-854..CF-857) — edge-case coverage from docs/flow-coverage/profile-enrichment/P10-server-specs.md
  {
    ruleId: 'CF-854',
    flowId: 'FLOW-02',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/profile-enrichment — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-855',
    flowId: 'FLOW-02',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-856',
    flowId: 'FLOW-02',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-857',
    flowId: 'FLOW-02',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-02-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-02-4',
    flowId: 'FLOW-02',
    type: 'SCOPE_ISOLATION',
    description: 'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
