/**
 * FLOW-11: Schema Registry & DAG
 * BFA rules: CF-11-1 through CF-11-4
 *
 * CF-11-1: TWO_COLOR_DFS — T191 DagCycleDetector MUST use three-state DFS (WHITE/GRAY/BLACK).
 *          GRAY node encounter during DFS = back edge = cycle detected.
 *          Single visited Set cannot detect back edges. SF-CHECK-2.
 *
 * CF-11-2: OCC_PUBLISH_GATE — T194 SchemaPublisher MUST use storeDocumentWithOCC(schema, expectedVersionPin).
 *          Plain storeDocument() permits silent concurrent overwrites. SF-CHECK-4.
 *
 * CF-11-3: BREAKING_APPROVAL_GATE — T189 SchemaRegistrationGateway: BREAKING changeType MUST route to
 *          SchemaApprovalRequired. BREAKING must never route to SchemaQueued directly. SF-CHECK-3.
 *
 * CF-11-4: SCOPE_ISOLATION — scope_isolation arbiter present in all arbiterConfig blocks (FC-32).
 *          Schema registry records: knowledgeScope=PRIVATE (NAMESPACE_ISOLATION model).
 *          Training corpus: knowledgeScope=GLOBAL.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const SCHEMA_REGISTRY_DAG_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-11-1',
    flowId: 'FLOW-11',
    type: 'TWO_COLOR_DFS',
    description:
      'T191 DagCycleDetector MUST use three-state DFS (WHITE/GRAY/BLACK). ' +
      'GRAY node encounter during DFS = back edge = cycle detected. ' +
      'Single visited Set cannot detect back edges. SF-CHECK-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-11-2',
    flowId: 'FLOW-11',
    type: 'OCC_PUBLISH_GATE',
    description:
      'T194 SchemaPublisher MUST use storeDocumentWithOCC(schema, expectedVersionPin). ' +
      'Plain storeDocument() permits silent concurrent overwrites. ' +
      'On OptimisticConcurrencyConflict: emit SchemaPublishConflict. SF-CHECK-4.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-11-3',
    flowId: 'FLOW-11',
    type: 'BREAKING_APPROVAL_GATE',
    description:
      'T189 SchemaRegistrationGateway: BREAKING changeType MUST route to ' +
      'SchemaApprovalRequired. BREAKING must never route to SchemaQueued directly. ' +
      'Classification runs before any write. SF-CHECK-3.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-919..CF-928) — edge-case coverage from docs/flow-coverage/schema-registry-dag/P10-server-specs.md
  {
    ruleId: 'CF-919',
    flowId: 'FLOW-11',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/schema-registry-dag — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-920',
    flowId: 'FLOW-11',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-921',
    flowId: 'FLOW-11',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-922',
    flowId: 'FLOW-11',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-923',
    flowId: 'FLOW-11',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on POST /api/dynamic/schema-registry-dag — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-924',
    flowId: 'FLOW-11',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-925',
    flowId: 'FLOW-11',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-13 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-926',
    flowId: 'FLOW-11',
    type: 'DNA8_ORDERING',
    description:
      'EC-14 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-927',
    flowId: 'FLOW-11',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-15 Optimistic concurrency on POST /api/dynamic/schema-registry-dag — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-928',
    flowId: 'FLOW-11',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-16 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-11-4: always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-11-4',
    flowId: 'FLOW-11',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
      'Schema registry records (PRIVATE), schema audit records (PRIVATE). ' +
      'Training corpus GLOBAL. tenantId from ALS — NEVER from payload. ' +
      'NAMESPACE_ISOLATION ownership model.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
