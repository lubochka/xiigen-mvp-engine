/**
 * FLOW-36: Feature Registry
 * BFA rules: CF-808, CF-809, CF-813
 *
 * CF-808: portingCandidate=false → PROHIBITED. PortingCostEstimator must NOT run.
 * CF-809: PROHIBITED guard is synchronous and first in PortingDecisionGate body.
 * CF-813: portingCandidate is MACHINE — tenant config cannot override it.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FEATURE_REGISTRY_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-808',
    flowId: 'FLOW-36',
    type: 'PROHIBITED_GUARD',
    description: 'portingCandidate=false → PROHIBITED decision; PortingCostEstimator must not run',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-809',
    flowId: 'FLOW-36',
    type: 'ORDERING',
    description: 'PROHIBITED guard is synchronous and checked first in PortingDecisionGate body',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-1035..CF-1049) — edge-case coverage from docs/flow-coverage/feature-registry/P10-server-specs.md
  {
    ruleId: 'CF-1035',
    flowId: 'FLOW-36',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-4 Optimistic concurrency on POST /api/dynamic/feature-registry — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1036',
    flowId: 'FLOW-36',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-5 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1037',
    flowId: 'FLOW-36',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-7 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1038',
    flowId: 'FLOW-36',
    type: 'DNA8_ORDERING',
    description:
      'EC-8 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1039',
    flowId: 'FLOW-36',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-9 Optimistic concurrency on POST /api/dynamic/feature-registry — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1040',
    flowId: 'FLOW-36',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-10 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1041',
    flowId: 'FLOW-36',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-12 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1042',
    flowId: 'FLOW-36',
    type: 'DNA8_ORDERING',
    description:
      'EC-13 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1043',
    flowId: 'FLOW-36',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-14 Optimistic concurrency on POST /api/dynamic/feature-registry — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1044',
    flowId: 'FLOW-36',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-15 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1045',
    flowId: 'FLOW-36',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-17 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1046',
    flowId: 'FLOW-36',
    type: 'DNA8_ORDERING',
    description:
      'EC-18 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1047',
    flowId: 'FLOW-36',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-19 Optimistic concurrency on POST /api/dynamic/feature-registry — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1048',
    flowId: 'FLOW-36',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-20 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-1049',
    flowId: 'FLOW-36',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-22 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-813',
    flowId: 'FLOW-36',
    type: 'MACHINE_CONSTRAINT',
    description: 'portingCandidate is MACHINE — tenant config cannot override classification',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
