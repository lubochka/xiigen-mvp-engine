/**
 * FLOW-17 BFA Rules — Freelancer Marketplace (new services T613-T616)
 *
 * CF-17-1: T613 BOLA ORDER 1 + SETNX ORDER 2 + OCC ORDER 3 + storeDocument(audit) before GigAccepted
 * CF-17-2: T614 CONTRACT_IMMUTABLE_FIELDS compile-time constant + sum validation + OCC write
 * CF-17-3: T615 delivery gate before release + LIFO milestone compensation + no deleteDocument on dispute
 * CF-17-4: T616 single-direction review + duplicate direction check + append-only + comment excluded from PLATFORM_ONLY
 */

export const FREELANCER_MARKETPLACE_BFA_RULES = [
  {
    ruleId: 'CF-17-1',
    flowId: 'FLOW-17',
    description:
      'T613 GigAcceptanceLockGateway: three-guard acceptance gate is MACHINE-FIXED. ' +
      'BOLA check (gigPosting.clientTenantId === ALS.tenantId) at ORDER 1 before any lock. ' +
      'SETNX(gig-accept-lock:{gigId}) at ORDER 2 for exclusive acceptance. ' +
      'OCC bid status check (bid.status === OPEN) at ORDER 3 after lock acquired. ' +
      'storeDocument(audit) at ORDER 4 BEFORE enqueue(GigAccepted). DNA-8. ' +
      'GigAcceptanceFailed emitted on BOLA violation, duplicate lock, or stale bid. ' +
      'Extends CART-LOCK-SETNX-001 from FLOW-16 to gig acceptance domain. ' +
      'SF-CHECK-17-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-17-2',
    flowId: 'FLOW-17',
    description:
      'T614 MilestoneContractManager: CONTRACT_IMMUTABLE_FIELDS is a compile-time constant — ' +
      'never a database lookup, never stored in FREEDOM config. ' +
      "CONTRACT_IMMUTABLE_FIELDS = ['clientId', 'contractTotal', 'gigId', 'freelancerId']. " +
      'Immutable field write rejected at ORDER 1 — no sum validation, no OCC read, no write for immutable fields. ' +
      'ContractFieldImmutable emitted immediately on immutable field rejection. ' +
      'Sum validation at ORDER 2 — milestones.reduce(sum) must equal contractTotal exactly. ' +
      'MilestoneSumMismatch emitted when milestones sum differs from contractTotal. ' +
      'storeDocumentWithOCC — not plain storeDocument. ContractUpdateConflict on OCC_CONFLICT. ' +
      'SF-CHECK-17-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-17-3',
    flowId: 'FLOW-17',
    description:
      'T615 DeliveryGateEscrowController: delivery gate validation BEFORE any funds movement. ' +
      'delivery.status === SUBMITTED required before milestone release — funds cannot move without a deliverable. ' +
      'Release path: storeDocument(milestone, status:RELEASED) ONLY — never deleteDocument. ' +
      'Dispute path: updateDocument(status:DISPUTED) ONLY — no funds movement on dispute. ' +
      'LIFO compensation registered as [REFUND_MILESTONE, RESTORE_GIG_STATUS] forward order. ' +
      'Executor runs RESTORE_GIG_STATUS → REFUND_MILESTONE (LIFO) — gig status restored only after refund confirmed. ' +
      'Timer gate-opener reads milestone_auto_release_days from FREEDOM config — never hardcoded. ' +
      'storeDocument(audit) BEFORE every event emit. DNA-8 on both release and dispute paths. ' +
      'SF-CHECK-17-3 + SF-CHECK-17-4.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-953..CF-956) — edge-case coverage from docs/flow-coverage/freelancer-marketplace/P10-server-specs.md
  {
    ruleId: 'CF-953',
    flowId: 'FLOW-17',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/freelancer-marketplace — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-954',
    flowId: 'FLOW-17',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-955',
    flowId: 'FLOW-17',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-956',
    flowId: 'FLOW-17',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-17-4',
    flowId: 'FLOW-17',
    description:
      'T616 FreelancerReviewWriter: single-direction review with append-only audit. ' +
      'Direction check (CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT) at ORDER 1 — invalid direction rejected immediately. ' +
      'Duplicate direction check at ORDER 2 — one review per direction per engagement; DuplicateReviewRejected on duplicate. ' +
      'Write review at ORDER 3 — storeDocument only, never updateDocument. ' +
      'Review records are append-only — no modification after submission. ' +
      'storeDocument(audit) at ORDER 4 — comment field EXCLUDED from audit record. ' +
      'Comment text in PLATFORM_ONLY audit is a PII leak — operator audit exports must not contain free-text review content. ' +
      'FreelancerReviewSubmitted emitted at ORDER 5 after audit confirmed. DNA-8. ' +
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32). ' +
      'SF-CHECK-17-5.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
