/**
 * FLOW-01: User Registration & Onboarding
 * BFA rules: CF-01-1, CF-01-2, CF-01-3, CF-01-4
 *
 * CF-01-1: Email uniqueness MUST be checked before user record created (CF-1)
 * CF-01-2: ResendVerificationRequested rate-limited — enforcement MACHINE, window FREEDOM (CF-3)
 * CF-01-3: T48 storeDocument BEFORE VerificationEmailRequested emit — outbox pattern (DNA-8)
 * CF-01-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32)
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_01_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-01-1',
    flowId: 'FLOW-01',
    type: 'ORDERING_CONSTRAINT',
    description:
      'Email uniqueness MUST be checked before user record created — CF-01-1 (duplicate user prevents corrupted state)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-01-2',
    flowId: 'FLOW-01',
    type: 'RATE_LIMIT_CONSTRAINT',
    description:
      'ResendVerificationRequested rate-limited — enforcement rule is MACHINE, window duration is FREEDOM (flow01_resend_rate_limit_minutes)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-01-3',
    flowId: 'FLOW-01',
    type: 'DNA8_ORDERING',
    description:
      'T48: storeDocument BEFORE VerificationEmailRequested emit — outbox pattern (DNA-8). Store before enqueue.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-850..CF-853) — edge-case coverage from docs/flow-coverage/user-registration/P10-server-specs.md
  {
    ruleId: 'CF-850',
    flowId: 'FLOW-01',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/user-registration — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-851',
    flowId: 'FLOW-01',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-852',
    flowId: 'FLOW-01',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-853',
    flowId: 'FLOW-01',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-01-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-01-4',
    flowId: 'FLOW-01',
    type: 'SCOPE_ISOLATION',
    description: 'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
