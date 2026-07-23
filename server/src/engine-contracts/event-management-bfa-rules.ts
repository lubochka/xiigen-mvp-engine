/**
 * FLOW-03: Event Management Platform
 * BFA rules: CF-03-1, CF-03-2, CF-03-3, CF-03-4
 *
 * CF-03-1: EventCreated must be stored before emitted (DNA-8).
 *          storeDocument(event) → enqueue(EventCreated) ordering is MACHINE.
 * CF-03-2: capacity === null means unlimited — strict null check, not falsy.
 *          capacity === 0 is a closed event (no registrations). !capacity wrongly treats 0 as unlimited.
 * CF-03-3: Content safety check MUST complete and PASS before EventPromoted is emitted (IR-61-1).
 *          Safety fail → EventPromotionRejected, not DataProcessResult.failure.
 * CF-03-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32)
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_03_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-03-1',
    flowId: 'FLOW-03',
    type: 'DNA8_ORDERING',
    description:
      'EventCreated MUST be stored before emitted — storeDocument(event) before enqueue(EventCreated). Emitting before storage means the event record may not exist when downstream consumers attempt to read it.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-03-2',
    flowId: 'FLOW-03',
    type: 'MACHINE_CONSTANT',
    description:
      'capacity === null means unlimited registrations (strict null check). capacity === 0 means the event is closed. Using !capacity or == null conflates the two states — capacity=0 events incorrectly accept registrations.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-03-3',
    flowId: 'FLOW-03',
    type: 'ORDERING_CONSTRAINT',
    description:
      'Content safety check MUST complete and PASS before EventPromoted is emitted (IR-61-1). Safety failure → emit EventPromotionRejected (business rejection), not DataProcessResult.failure (system error). The promotion attempt was valid — it was rejected by content policy.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-858..CF-862) — edge-case coverage from docs/flow-coverage/event-management/P10-server-specs.md
  {
    ruleId: 'CF-858',
    flowId: 'FLOW-03',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/event-management — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-859',
    flowId: 'FLOW-03',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-860',
    flowId: 'FLOW-03',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-861',
    flowId: 'FLOW-03',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-862',
    flowId: 'FLOW-03',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on secondary write path (attendee capacity) — winner 201, loser 409. Second concurrency surface beyond EC-5 (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-03-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-03-4',
    flowId: 'FLOW-03',
    type: 'SCOPE_ISOLATION',
    description: 'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
