/**
 * FLOW-17 Engine Contracts — Freelancer Marketplace (new services T613-T616)
 *
 * T613  GigAcceptanceLockGateway       archetype: VALIDATION   (BOLA + SETNX + OCC bid)
 * T614  MilestoneContractManager       archetype: TRANSACTION  (CONTRACT_IMMUTABLE_FIELDS + sum + OCC)
 * T615  DeliveryGateEscrowController   archetype: ORCHESTRATION (delivery gate + LIFO milestone + timer)
 * T616  FreelancerReviewWriter         archetype: DATA_PIPELINE (single-direction + append-only + comment excluded)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * T-number note: Original design documents reference T229-T232, but those collide with
 *   FLOW-17 freelancer-marketplace-ip-contracts.ts (T227-T246). Remapped to T613-T616.
 * Factory note: Design documents reference F248-F257, but those collide with FLOW-07.
 *   Remapped to F1537-F1546 per CLAUDE.md boundary.
 *
 * CF-17-1: T613 BOLA ORDER 1, SETNX ORDER 2, OCC ORDER 3 — extends CART-LOCK-SETNX-001
 * CF-17-2: T614 CONTRACT_IMMUTABLE_FIELDS compile-time constant, sum validation, OCC write
 * CF-17-3: T615 delivery gate before release + LIFO at milestone granularity + timer gate-opener
 * CF-17-4: T616 single-direction review + append-only audit + comment excluded from PLATFORM_ONLY
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const FREELANCER_MARKETPLACE_NEW_TASK_TYPES = ['T613', 'T614', 'T615', 'T616'] as const;

// ── T613: GigAcceptanceLockGateway ───────────────────────────────────────────

export function createGigAcceptanceLockGatewayContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T613',
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace',
    name: 'GigAcceptanceLockGateway',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by GigAcceptanceRequested event (client accepts a freelancer bid)',
    purpose:
      'Three-guard acceptance gate. BOLA at ORDER 1 verifies the accepting client owns this gig posting. ' +
      'SETNX at ORDER 2 ensures only one bid is accepted per gig (gig-accept-lock). ' +
      'OCC at ORDER 3 validates bid status has not changed since lock acquired. ' +
      'Extends CART-LOCK-SETNX-001 from FLOW-16 to the gig acceptance domain. CF-17-1.',
    distinctFrom:
      'T614 MilestoneContractManager (T613 accepts the gig/bid; T614 manages contract milestones after acceptance)',

    ironRules: [
      'IR-1: BOLA check (gigPosting.clientTenantId === ALS.tenantId) at ORDER 1 — before any lock. ' +
        'Cross-tenant gig hijacking rejected immediately. CF-17-1.',
      'IR-2: SETNX(gig-accept-lock:{gigId}) at ORDER 2 — exclusive acceptance lock. ' +
        'Duplicate acceptance rejected idempotently. CF-17-1.',
      'IR-3: OCC bid status check (bid.status === OPEN) at ORDER 3 — after lock acquired. ' +
        'Withdrawn bids rejected with GigAcceptanceFailed. CF-17-1.',
      'IR-4: storeDocument(audit) at ORDER 4 BEFORE enqueue(GigAccepted). DNA-8. CF-17-1.',
      'IR-5: GigAccepted emitted at ORDER 5 only after all guards pass.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'BolaCheck',
          description: 'Validate gigPosting.clientTenantId === ALS.tenantId — BOLA guard',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'SetnxGigAcceptLock',
          description: 'SETNX(gig-accept-lock:{gigId}) — exclusive acceptance lock',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'OccBidStatus',
          description: 'OCC bid status check — validate bid.status === OPEN',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitGigAccepted',
          description: 'enqueue(GigAccepted) — only after all guards pass',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1537',
        interfaceName: 'IGigPostingService',
        fabricType: FabricType.DATABASE,
        description: 'Gig posting read for BOLA check + lock acquisition',
      },
      {
        factoryId: 'F1538',
        interfaceName: 'IBidStatusService',
        fabricType: FabricType.DATABASE,
        description: 'OCC bid status check — OPEN bids only',
      },
      {
        factoryId: 'F1539',
        interfaceName: 'IGigAcceptAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Gig acceptance audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'GigAccepted / GigAcceptanceFailed event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-17-01',
        description: 'BOLA at ORDER 1 before SETNX (IR-1)',
        severity: 'error',
        checkType: 'bola_before_lock',
      },
      {
        gateId: 'QG-17-02',
        description: 'SETNX at ORDER 2 before OCC (IR-2)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-17-03',
        description: 'storeDocument(audit) before enqueue(GigAccepted) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'GIG_ACCEPT_LOCK_PREFIX',
        value: 'gig-accept-lock',
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['gig_posting', 'bid', 'gig_accept_audit'],
      events: ['gig.accepted', 'gig.acceptance.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'BOLA check at ORDER 1 — gigPosting.clientTenantId === ALS.tenantId (CF-17-1)',
      'SETNX(gig-accept-lock:{gigId}) at ORDER 2 — exclusive acceptance lock (CF-17-1)',
      'OCC bid status check at ORDER 3 — bid.status === OPEN (CF-17-1)',
      'Outbox: storeDocument(audit) before GigAccepted enqueue (DNA-8)',
      'GigAcceptanceFailed emitted on BOLA violation, duplicate lock, or stale bid',
    ],

    freedomComponents: ['gig_accept_lock_ttl_ms — TTL for gig acceptance lock in milliseconds'],
  });
}

// ── T614: MilestoneContractManager ──────────────────────────────────────────

export function createMilestoneContractManagerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T614',
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace',
    name: 'MilestoneContractManager',
    archetype: ContractArchetype.BILLING,
    entry:
      'Triggered by ContractMilestoneUpdateRequested event (freelancer or client updates milestones)',
    purpose:
      'Milestone contract management with compile-time immutability guard. ' +
      'CONTRACT_IMMUTABLE_FIELDS validated at ORDER 1 — zero storage access for immutable fields. ' +
      'Sum validation at ORDER 2 — milestones sum must equal contractTotal. ' +
      'OCC write at ORDER 3 — not plain storeDocument. CF-17-2.',
    distinctFrom:
      'T613 GigAcceptanceLockGateway (T613 accepts the bid; T614 manages milestone schedule after activation)',

    ironRules: [
      'IR-1: CONTRACT_IMMUTABLE_FIELDS = [clientId, contractTotal, gigId, freelancerId] — ' +
        'compile-time constant. NEVER a database lookup. CF-17-2.',
      'IR-2: Immutable field write rejected at ORDER 1 with no storage attempt. ' +
        'ContractFieldImmutable emitted immediately. CF-17-2.',
      'IR-3: Sum validation at ORDER 2 — milestones.reduce(sum) === contractTotal. ' +
        'MilestoneSumMismatch emitted on validation failure. CF-17-2.',
      'IR-4: storeDocumentWithOCC(contract, versionPin) at ORDER 3 — NOT plain storeDocument. ' +
        'OCC_CONFLICT → emit ContractUpdateConflict. CF-17-2.',
      'IR-5: storeDocument(audit) at ORDER 4 BEFORE FreelancerContractActivated emit. DNA-8.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ImmutableFieldGuard',
          description:
            'CONTRACT_IMMUTABLE_FIELDS check — reject immutable field writes immediately',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'SumValidation',
          description: 'milestones.reduce(sum) === contractTotal — MilestoneSumMismatch on failure',
          ironRuleRef: 'IR-3',
        },
        {
          order: 3,
          name: 'OccWrite',
          description: 'storeDocumentWithOCC(contract, versionPin) — not plain storeDocument',
          ironRuleRef: 'IR-4',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-5',
        },
        {
          order: 5,
          name: 'EmitContractActivated',
          description: 'enqueue(FreelancerContractActivated)',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1540',
        interfaceName: 'IContractMilestoneService',
        fabricType: FabricType.DATABASE,
        description: 'Contract + milestone CRUD with OCC support',
      },
      {
        factoryId: 'F1541',
        interfaceName: 'IContractAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Contract audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'FreelancerContractActivated / ContractFieldImmutable / MilestoneSumMismatch / ContractUpdateConflict emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-17-04',
        description:
          'CONTRACT_IMMUTABLE_FIELDS at ORDER 1 — no storage for immutable fields (IR-1)',
        severity: 'error',
        checkType: 'immutable_field_guard',
      },
      {
        gateId: 'QG-17-05',
        description: 'Sum validation at ORDER 2 (IR-3)',
        severity: 'error',
        checkType: 'sum_validation',
      },
      {
        gateId: 'QG-17-06',
        description: 'storeDocumentWithOCC not plain storeDocument (IR-4)',
        severity: 'error',
        checkType: 'occ_write',
      },
    ],

    machineConstants: [
      {
        key: 'CONTRACT_IMMUTABLE_FIELDS',
        value: ['clientId', 'contractTotal', 'gigId', 'freelancerId'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['contract', 'milestone', 'contract_audit'],
      events: [
        'freelancer.contract.activated',
        'contract.field.immutable',
        'milestone.sum.mismatch',
        'contract.update.conflict',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      "CONTRACT_IMMUTABLE_FIELDS = ['clientId','contractTotal','gigId','freelancerId'] — compile-time (CF-17-2)",
      'Immutable field check at ORDER 1 — no storage for immutable fields (CF-17-2)',
      'Sum validation at ORDER 2 — milestones sum must equal contractTotal (CF-17-2)',
      'storeDocumentWithOCC — not plain storeDocument (CF-17-2)',
      'Outbox: storeDocument(audit) before FreelancerContractActivated enqueue (DNA-8)',
    ],

    freedomComponents: [
      'contract_max_milestones — maximum number of milestones per contract',
      'contract_min_milestone_amount_cents — minimum milestone amount in cents',
    ],
  });
}

// ── T615: DeliveryGateEscrowController ──────────────────────────────────────

export function createDeliveryGateEscrowControllerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T615',
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace',
    name: 'DeliveryGateEscrowController',
    archetype: ContractArchetype.ORCHESTRATION,
    entry:
      'Triggered by MilestoneReleaseRequested (client approves delivery) or MilestoneDisputeRaised (client disputes)',
    purpose:
      'Milestone escrow controller with delivery gate before any funds movement. ' +
      'Release path: validate delivery → release milestone funds → audit → emit MilestoneReleased. ' +
      'Dispute path: updateDocument(status:DISPUTED) → audit → emit MilestoneDisputed. ' +
      'LIFO compensation at milestone granularity: [REFUND_MILESTONE, RESTORE_GIG_STATUS]. ' +
      'Timer gate-opener via FREEDOM config (milestone_auto_release_days). CF-17-3.',
    distinctFrom:
      'T614 MilestoneContractManager (T614 manages milestone schedule; T615 controls escrow release/dispute)',

    ironRules: [
      'IR-1: Delivery gate validation BEFORE any funds movement. ' +
        'delivery.status === SUBMITTED required before release. CF-17-3.',
      'IR-2: Release path storeDocument(milestone, status:RELEASED) — never deleteDocument. CF-17-3.',
      'IR-3: Dispute path updateDocument(status:DISPUTED) ONLY — no funds movement on dispute. CF-17-3.',
      'IR-4: LIFO compensation registered as [REFUND_MILESTONE, RESTORE_GIG_STATUS] forward. ' +
        'Executor runs RESTORE_GIG_STATUS → REFUND_MILESTONE (LIFO). CF-17-3.',
      'IR-5: storeDocument(audit) BEFORE every event emit. DNA-8 on both paths.',
      'IR-6: Timer gate-opener reads milestone_auto_release_days from FREEDOM config. Never hardcoded.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ValidateDeliveryGate',
          description: 'Validate delivery.status === SUBMITTED — block if no deliverable',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ReleaseMilestoneFunds',
          description:
            'Release path: storeDocument(milestone, status:RELEASED). Dispute path: updateDocument(status:DISPUTED)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before event emit',
          ironRuleRef: 'IR-5',
        },
        {
          order: 4,
          name: 'EmitStateEvent',
          description: 'MilestoneReleased (release path) or MilestoneDisputed (dispute path)',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1542',
        interfaceName: 'IDeliveryGateService',
        fabricType: FabricType.DATABASE,
        description: 'Delivery validation + deliverable status lookup',
      },
      {
        factoryId: 'F1543',
        interfaceName: 'IEscrowMilestoneService',
        fabricType: FabricType.DATABASE,
        description: 'Milestone escrow state machine — release / dispute transitions',
      },
      {
        factoryId: 'F1544',
        interfaceName: 'IEscrowAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Escrow audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'MilestoneReleased / MilestoneDisputed / EscrowCompensationStarted emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-17-07',
        description: 'Delivery gate validation before funds release (IR-1)',
        severity: 'error',
        checkType: 'delivery_gate_before_release',
      },
      {
        gateId: 'QG-17-08',
        description: 'LIFO compensation [REFUND_MILESTONE, RESTORE_GIG_STATUS] (IR-4)',
        severity: 'error',
        checkType: 'lifo_compensation',
      },
      {
        gateId: 'QG-17-09',
        description: 'No deleteDocument on dispute path (IR-3)',
        severity: 'error',
        checkType: 'no_delete_on_dispute',
      },
    ],

    machineConstants: [
      {
        key: 'ESCROW_COMPENSATION_CHAIN',
        value: ['REFUND_MILESTONE', 'RESTORE_GIG_STATUS'],
        type: 'ordering',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['milestone', 'delivery', 'escrow_audit'],
      events: ['milestone.released', 'milestone.disputed', 'escrow.compensation.started'],
      apiRoutes: [],
    },

    machineComponents: [
      'Delivery gate validation at ORDER 1 — delivery.status === SUBMITTED required (CF-17-3)',
      'Release path: storeDocument(milestone, status:RELEASED) — no deleteDocument (CF-17-3)',
      'Dispute path: updateDocument(status:DISPUTED) ONLY — no funds movement (CF-17-3)',
      'LIFO compensation: [REFUND_MILESTONE, RESTORE_GIG_STATUS] forward, executed reversed (CF-17-3)',
      'Timer gate-opener from FREEDOM milestone_auto_release_days — never hardcoded',
      'Outbox: storeDocument(audit) before every event emit (DNA-8)',
    ],

    freedomComponents: [
      'milestone_auto_release_days — days to auto-release escrow after delivery if no dispute',
      'escrow_dispute_window_days — days client has to raise a dispute after delivery',
    ],
  });
}

// ── T616: FreelancerReviewWriter ─────────────────────────────────────────────

export function createFreelancerReviewWriterContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T616',
    flowId: 'FLOW-17',
    flowName: 'Freelancer Marketplace',
    name: 'FreelancerReviewWriter',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by FreelancerReviewSubmissionRequested event (party submits review)',
    purpose:
      'Single-direction review writer with append-only audit. ' +
      'Direction check at ORDER 1 (CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT). ' +
      'Duplicate direction check at ORDER 2 — one review per direction per engagement. ' +
      'Write review at ORDER 3. storeDocument(audit, comment excluded) at ORDER 4. ' +
      'Comment excluded from PLATFORM_ONLY audit to prevent PII leak. CF-17-4.',
    distinctFrom:
      'T245 ReputationSignalAggregateGate (T245 aggregates signals via journal; T616 writes the review itself)',

    ironRules: [
      'IR-1: Direction check (CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT) at ORDER 1. ' +
        'Invalid direction rejected immediately. CF-17-4.',
      'IR-2: Duplicate direction check at ORDER 2 — searchDocuments for existing review in same direction. ' +
        'DuplicateReviewRejected emitted on duplicate. CF-17-4.',
      'IR-3: Write review at ORDER 3 — storeDocument with knowledgeScope:PRIVATE. ' +
        'No updateDocument on review records ever (append-only). CF-17-4.',
      'IR-4: storeDocument(audit) at ORDER 4 — comment field EXCLUDED from audit record. ' +
        'PLATFORM_ONLY scope must not contain comment text. DNA-8. CF-17-4.',
      'IR-5: FreelancerReviewSubmitted emitted at ORDER 5 — only after audit confirmed.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'DirectionCheck',
          description: 'Validate direction is CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'DuplicateCheck',
          description: 'searchDocuments for existing review in same direction — reject duplicates',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'WriteReview',
          description: 'storeDocument(review, knowledgeScope:PRIVATE)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit, comment excluded) — DNA-8, PLATFORM_ONLY-safe',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitReviewSubmitted',
          description: 'enqueue(FreelancerReviewSubmitted)',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1545',
        interfaceName: 'IReviewStoreService',
        fabricType: FabricType.DATABASE,
        description: 'Review write + duplicate direction check (append-only, no update)',
      },
      {
        factoryId: 'F1546',
        interfaceName: 'IReviewAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Review audit trail — comment excluded, PLATFORM_ONLY-safe',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'FreelancerReviewSubmitted / DuplicateReviewRejected emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-17-10',
        description: 'Direction check at ORDER 1 (IR-1)',
        severity: 'error',
        checkType: 'direction_check',
      },
      {
        gateId: 'QG-17-11',
        description: 'Duplicate direction check at ORDER 2 (IR-2)',
        severity: 'error',
        checkType: 'duplicate_direction_check',
      },
      {
        gateId: 'QG-17-12',
        description: 'Comment excluded from audit (IR-4)',
        severity: 'error',
        checkType: 'comment_excluded_from_audit',
      },
    ],

    machineConstants: [
      {
        key: 'VALID_REVIEW_DIRECTIONS',
        value: ['CLIENT_TO_FREELANCER', 'FREELANCER_TO_CLIENT'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['review', 'review_audit'],
      events: ['freelancer.review.submitted', 'duplicate.review.rejected'],
      apiRoutes: [],
    },

    machineComponents: [
      "VALID_REVIEW_DIRECTIONS = ['CLIENT_TO_FREELANCER','FREELANCER_TO_CLIENT'] — compile-time (CF-17-4)",
      'Direction check at ORDER 1 — invalid direction rejected immediately (CF-17-4)',
      'Duplicate direction check at ORDER 2 — one review per direction per engagement (CF-17-4)',
      'Append-only: storeDocument only — no updateDocument on review records (CF-17-4)',
      'Comment excluded from audit record — PLATFORM_ONLY-safe, no PII in audit (CF-17-4)',
      'Outbox: storeDocument(audit) before FreelancerReviewSubmitted enqueue (DNA-8)',
    ],

    freedomComponents: [
      'review_comment_max_length — maximum characters for review comment',
      'review_submission_window_days — days after contract close to submit reviews',
    ],
  });
}

// ── Contract factories array (for bootstrapper wiring) ──────────────────────

export const FREELANCER_MARKETPLACE_NEW_CONTRACT_FACTORIES = [
  createGigAcceptanceLockGatewayContract,
  createMilestoneContractManagerContract,
  createDeliveryGateEscrowControllerContract,
  createFreelancerReviewWriterContract,
];

export const FREELANCER_MARKETPLACE_NEW_CONTRACT_DESCRIPTORS =
  FREELANCER_MARKETPLACE_NEW_CONTRACT_FACTORIES.map((f) => {
    const c = f();
    return {
      taskTypeId: c.taskTypeId,
      name: c.name,
      flowId: c.flowId,
      version: 'v1',
    };
  });
