/**
 * FLOW-09: Transactional Event Participation
 * BFA rules: CF-09-1 through CF-09-7
 *
 * CF-09-1: SEAT_BEFORE_PAYMENT — T99 MUST reserve seat (TTL hold) BEFORE initiating
 *          payment capture. Natural order pay-then-seat creates a double-booking race:
 *          two users pay simultaneously for the last seat, both payments succeed,
 *          both seat claims succeed, capacity is -1. TTL hold prevents this.
 *
 * CF-09-2: FAIL_OPEN — T113 FraudDetectionGate MUST allow purchase to proceed when
 *          fraud service (F283) is unavailable. Three conditions required simultaneously:
 *          try/catch, allow-on-catch, AND emit FraudCheckFailed(service_unavailable).
 *
 * CF-09-3: COMPLIANCE_ESCALATION_ON_EXHAUSTION — T105 after max retries MUST
 *          SIMULTANEOUSLY emit RefundFailed AND push to F284 (manual review queue).
 *          Both actions required — neither alone is sufficient.
 *
 * CF-09-4: ALL_OR_NOTHING_GROUP — T108 GroupTicketCoordinator MUST wrap ALL group
 *          ticket issuances in a single database transaction. Any member failure
 *          triggers full rollback — no partial success.
 *
 * CF-09-5: INLINE_PURE — T112 FeeCalculator returns FeeBreakdown only. No storeDocument,
 *          no events. T112 is called inline by T110. If T112 stores records independently,
 *          a T110 crash leaves orphaned fee records with no corresponding revenue record.
 *
 * CF-09-6: PLATFORM_ONLY_QR — F275 QR token generation/validation is PLATFORM-ONLY.
 *          No tenant factory swap permitted. T102 and T103 use F275 exclusively.
 *          Security primitive: tenant-swappable QR generation enables token forgery.
 *
 * CF-09-7: SCOPE_ISOLATION — scope_isolation arbiter present in all arbiterConfig blocks
 *          (FC-32). Ticket purchase, payment, refund, and payout records are PRIVATE
 *          per-tenant. T112 inline-pure never writes records. T114 F284 is platform scope.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export interface BfaConflictRule {
  cfId: string;
  flowId: string;
  name: string;
  description: string;
  affectedTaskTypes: string[];
  detectionMethod: string;
  resolution: string;
}

export const CF_09_1_SEAT_BEFORE_PAYMENT: BfaConflictRule = {
  cfId: 'CF-09-1',
  flowId: 'FLOW-09',
  name: 'seat_before_payment',
  description:
    'T99 MUST reserve seat (TTL hold) BEFORE initiating payment capture. ' +
    'Natural order pay-then-seat creates a double-booking race: two users pay simultaneously ' +
    'for the last seat, both payments succeed, both seat claims succeed, capacity becomes -1. ' +
    'TTL hold on seat MUST occur before payment queue message is emitted. ' +
    'SILENT_FAILURE: code passes CI, race condition only visible under concurrent last-ticket production load.',
  affectedTaskTypes: ['T99'],
  detectionMethod:
    'Line index of reserveSeat() call MUST be less than line index of enqueuePayment() call. ' +
    'grep seat_before_payment in arbiterConfig for T99 node',
  resolution:
    'T99 must call reserveSeat(TTL) before enqueuePayment(). ' +
    'Any code path where payment is initiated before seat hold is a BUILD_FAILURE.',
};

export const CF_09_2_FAIL_OPEN: BfaConflictRule = {
  cfId: 'CF-09-2',
  flowId: 'FLOW-09',
  name: 'fail_open',
  description:
    'T113 FraudDetectionGate MUST fail open when fraud service (F283) is unavailable. ' +
    'Three conditions required simultaneously: (1) try/catch around F283 call, ' +
    '(2) on catch: allow purchase to proceed (not return false), ' +
    '(3) on catch: emit FraudCheckFailed(service_unavailable) audit event. ' +
    'Missing any one condition = SILENT_FAILURE: either all purchases block during outage ' +
    'or service_unavailable is indistinguishable from fraud detection.',
  affectedTaskTypes: ['T113'],
  detectionMethod:
    'grep fail_open in arbiterConfig for T113 node. ' +
    'Verify: catch block returns { passed: true } AND emits FraudCheckFailed',
  resolution:
    'T113 catch block must: (1) emit FraudCheckFailed({ reason: service_unavailable }), ' +
    '(2) return { passed: true }. Any catch returning false = BUILD_FAILURE.',
};

export const CF_09_3_COMPLIANCE_ESCALATION: BfaConflictRule = {
  cfId: 'CF-09-3',
  flowId: 'FLOW-09',
  name: 'compliance_escalation_on_exhaustion',
  description:
    'T105 RefundProcessor after max retries MUST simultaneously emit RefundFailed AND ' +
    'push to F284 (manual review queue). Both actions required — neither alone is sufficient. ' +
    'Emitting RefundFailed only: event may go unhandled, refund disappears. ' +
    'F284 push only: no event record for downstream consumers. ' +
    'PER_ATTEMPT_IDEMPOTENCY: idempotency key = hash(tenantId + purchaseId + refund-attempt-N). ' +
    'Attempt counter N in key allows each retry to proceed independently.',
  affectedTaskTypes: ['T105'],
  detectionMethod:
    'grep compliance_escalation in arbiterConfig for T105 node. ' +
    'Verify: both RefundFailed emit AND F284 push present on exhaustion path.',
  resolution:
    'On max retry exhaustion: emit RefundFailed AND push to F284. ' +
    'Per-attempt idempotency key includes attempt counter. Missing either action = BUILD_FAILURE.',
};

export const CF_09_4_ALL_OR_NOTHING_GROUP: BfaConflictRule = {
  cfId: 'CF-09-4',
  flowId: 'FLOW-09',
  name: 'all_or_nothing_group',
  description:
    'T108 GroupTicketCoordinator MUST wrap ALL group ticket issuances in a single database ' +
    'transaction. Any member failure triggers full rollback — no partial success. ' +
    'SILENT_FAILURE: loop outside transaction compiles and passes all unit tests. ' +
    'Partial success only visible when one member fails mid-loop in production.',
  affectedTaskTypes: ['T108'],
  detectionMethod:
    'grep all_or_nothing_group in arbiterConfig for T108 node. ' +
    'Verify: all ticket issuances are inside db.transaction() call.',
  resolution:
    'T108 must call db.transaction(() => [issue each member ticket]). ' +
    'Loop outside transaction = BUILD_FAILURE.',
};

export const CF_09_5_INLINE_PURE: BfaConflictRule = {
  cfId: 'CF-09-5',
  flowId: 'FLOW-09',
  name: 'inline_pure',
  description:
    'T112 FeeCalculator is INLINE_PURE — called inline by T110, returns FeeBreakdown only. ' +
    'T112 MUST NOT call storeDocument or emit events. ' +
    'If T112 stores fee records independently, a T110 crash after the inline call leaves ' +
    'an orphaned fee record with no corresponding revenue record. Fee/revenue records diverge. ' +
    'SILENT_FAILURE: adding storeDocument() compiles; divergence only visible on caller failure.',
  affectedTaskTypes: ['T112'],
  detectionMethod:
    'grep inline_pure in arbiterConfig for T112 node. ' +
    'Verify: no storeDocument call, no enqueue call in T112.',
  resolution:
    'T112 returns FeeBreakdown object only. Any storeDocument or enqueue in T112 = BUILD_FAILURE.',
};

export const CF_09_6_PLATFORM_ONLY_QR: BfaConflictRule = {
  cfId: 'CF-09-6',
  flowId: 'FLOW-09',
  name: 'platform_only_qr',
  description:
    'F275 QR token generation and validation is PLATFORM-ONLY. ' +
    'No tenant factory swap permitted for T102 (QR generation) or T103 (QR validation). ' +
    'QR token integrity is a security primitive: a tenant swapping F275 could generate ' +
    'tokens that bypass validation, enabling ticket fraud.',
  affectedTaskTypes: ['T102', 'T103'],
  detectionMethod:
    'grep platform_only_qr in arbiterConfig for T102 and T103 nodes. ' +
    'Verify: F275 not declared as INJECTABLE in any contract.',
  resolution:
    'F275 is PLATFORM-ONLY. Any tenant-configurable QR factory declaration = BUILD_FAILURE.',
};

export const CF_09_7_SCOPE_ISOLATION: BfaConflictRule = {
  cfId: 'CF-09-7',
  flowId: 'FLOW-09',
  name: 'scope_isolation',
  description:
    'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
    'Ticket purchase, payment, refund, and payout records are PRIVATE per-tenant. ' +
    'T112 inline-pure never writes records. T114 F284 is platform scope, not tenant. ' +
    'T110 reads GLOBAL event aggregate (intentional — published revenue data).',
  affectedTaskTypes: [
    'T99',
    'T100',
    'T101',
    'T102',
    'T103',
    'T104',
    'T105',
    'T106',
    'T107',
    'T108',
    'T109',
    'T110',
    'T111',
    'T113',
    'T114',
    'T115',
    'T116',
    'T117',
    'T118',
  ],
  detectionMethod: 'grep scope_isolation in arbiterConfig for all FLOW-09 nodes',
  resolution:
    'Add scope_isolation arbiter: { modelToken: AI_SCOPE_ARBITER, blind: true, blockSemanticsBehavior: ANY_BLOCK_CLASS_REJECTS }',
};

export const FLOW_09_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-09-1',
    flowId: 'FLOW-09',
    type: 'SEAT_BEFORE_PAYMENT',
    description: CF_09_1_SEAT_BEFORE_PAYMENT.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-09-2',
    flowId: 'FLOW-09',
    type: 'FAIL_OPEN',
    description: CF_09_2_FAIL_OPEN.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-09-3',
    flowId: 'FLOW-09',
    type: 'COMPLIANCE_ESCALATION_ON_EXHAUSTION',
    description: CF_09_3_COMPLIANCE_ESCALATION.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-09-4',
    flowId: 'FLOW-09',
    type: 'ALL_OR_NOTHING_GROUP',
    description: CF_09_4_ALL_OR_NOTHING_GROUP.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-09-5',
    flowId: 'FLOW-09',
    type: 'INLINE_PURE',
    description: CF_09_5_INLINE_PURE.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-09-6',
    flowId: 'FLOW-09',
    type: 'PLATFORM_ONLY_QR',
    description: CF_09_6_PLATFORM_ONLY_QR.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-903..CF-912) — edge-case coverage from docs/flow-coverage/transactional-event-participation/P10-server-specs.md
  {
    ruleId: 'CF-903',
    flowId: 'FLOW-09',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-8 Optimistic concurrency on POST /api/dynamic/transactional-event-participation — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-904',
    flowId: 'FLOW-09',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-9 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-905',
    flowId: 'FLOW-09',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-11 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-906',
    flowId: 'FLOW-09',
    type: 'DNA8_ORDERING',
    description:
      'EC-12 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-907',
    flowId: 'FLOW-09',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-13 Optimistic concurrency on POST /api/dynamic/transactional-event-participation — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-908',
    flowId: 'FLOW-09',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-14 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-909',
    flowId: 'FLOW-09',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-16 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-910',
    flowId: 'FLOW-09',
    type: 'DNA8_ORDERING',
    description:
      'EC-17 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-911',
    flowId: 'FLOW-09',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-18 Optimistic concurrency on POST /api/dynamic/transactional-event-participation — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-912',
    flowId: 'FLOW-09',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-19 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-09-7: always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-09-7',
    flowId: 'FLOW-09',
    type: 'SCOPE_ISOLATION',
    description: CF_09_7_SCOPE_ISOLATION.description,
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
