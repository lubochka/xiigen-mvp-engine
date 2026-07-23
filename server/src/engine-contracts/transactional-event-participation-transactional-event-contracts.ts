/**
 * FLOW-09 Engine Contracts — Transactional Event Participation
 *
 * T99   EventParticipationOrchestrator  archetype: ORCHESTRATION
 * T100  TicketInventoryManager          archetype: DATA_PIPELINE
 * T101  PaymentEligibilityGate          archetype: VALIDATION
 * T102  TicketIssuer                    archetype: DATA_PIPELINE
 * T103  ReceiptValidator                archetype: VALIDATION
 * T104  RefundOrchestrator              archetype: ORCHESTRATION
 * T105  ComplianceEscalationController  archetype: ORCHESTRATION
 * T106  SeatReservationManager          archetype: PROCESSING
 * T107  AttendanceTokenService          archetype: PROCESSING
 * T108  TokenRedemptionProcessor        archetype: PROCESSING
 * T109  ParticipationDataPipeline       archetype: DATA_PIPELINE
 * T110  ParticipationAggregator         archetype: OBSERVABILITY
 * T111  CrossFlowParticipationGate      archetype: ORCHESTRATION
 * T112  TicketFormatRenderer            archetype: DATA_PIPELINE    (inline-pure, caller: T110)
 * T113  EligibilityCompositeChecker     archetype: VALIDATION       (inline, caller: T99)
 * T114  RevenueAttributionTracker       archetype: OBSERVABILITY
 * T115  ParticipationAnalytics          archetype: OBSERVABILITY
 * T116  FraudSignalCollector            archetype: OBSERVABILITY
 * T117  ParticipationExportPipeline     archetype: DATA_PIPELINE
 * T118  ParticipationReportGenerator    archetype: OBSERVABILITY
 *
 * Backward cross-wave: T102 TicketIssued → FLOW-04 T63 RSVPOrchestrator
 * Prerequisites: FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: validate() returns DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared components ──────────────────────────────────────────────────────

const FLOW09_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-01',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-03',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-04',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-05',
    description: 'storeDocument() BEFORE enqueue() on every transition (DNA-8)',
    severity: 'error' as const,
    checkType: 'outbox_ordering',
  },
];

const FLOW09_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T99 — EventParticipationOrchestrator ──────────────────────────────────

/**
 * T99 — EventParticipationOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Top-level orchestrator for the full transactional participation flow.
 *          Seat reservation MUST happen BEFORE payment (not after) to prevent oversell.
 *          Inline caller for T113 EligibilityCompositeChecker.
 *          Score-0 expected on cycle-1 (seat_before_payment ordering + T113 fail-open).
 */
export function createT99Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T99',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'EventParticipationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by participation.requested CloudEvent',
    purpose:
      'Orchestrate full transactional participation: eligibility check (T113, inline) → seat reservation (T106) → payment → ticket issue (T102) → attendance token (T107). Seat reservation BEFORE payment to prevent oversell. Cross-flow gate via T111.',
    distinctFrom:
      'T104 (refund orchestrator — T99 handles forward flow; T104 handles cancellation/refund)',

    factoryDependencies: [
      {
        factoryId: 'F09-01',
        interfaceName: 'IParticipationOrchestrationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Participation saga state machine — tracks phase completion across steps',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW09_QUALITY_GATES_CORE,
      {
        gateId: 'QG-09-01',
        description: 'Seat reservation BEFORE payment (anti-oversell)',
        severity: 'error' as const,
        checkType: 'execution_order',
      },
    ],

    bfaRegistration: {
      entities: ['participation_saga'],
      events: ['participation.requested', 'participation.completed', 'participation.failed'],
      apiRoutes: ['/api/dynamic/participations'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Seat reservation (T106) MUST execute BEFORE payment processing — never after (anti-oversell)',
      'T113 EligibilityCompositeChecker is inline — called synchronously within T99, not via queue',
    ],

    machineComponents: [
      'Saga state machine: eligibility → seat → payment → ticket → token',
      'Outbox: participation record stored before any event emitted (DNA-8)',
      'Inline T113 call (executionModel: inline)',
    ],

    freedomComponents: [
      'Participation timeout (FREEDOM config key: flow09_participation_timeout_seconds)',
      'Max concurrent participations per tenant',
    ],
  });
}

// ── T100 — TicketInventoryManager ─────────────────────────────────────────

export function createT100Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T100',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'TicketInventoryManager',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by inventory.query.requested or inventory.update.requested',
    purpose:
      'Manage ticket inventory: atomic decrement on allocation, increment on cancellation. Content-addressed by (eventId, ticketTier). Idempotent updates via version-gated writes.',
    distinctFrom:
      'T106 (seat reservation — T100 tracks raw inventory; T106 handles reserved seats)',

    factoryDependencies: [
      {
        factoryId: 'F09-02',
        interfaceName: 'ITicketInventoryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Ticket inventory with atomic decrement/increment operations',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['ticket_inventory'],
      events: ['inventory.allocated', 'inventory.released', 'inventory.exhausted'],
      apiRoutes: ['/api/dynamic/ticket-inventories'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Inventory decrement MUST be atomic — no separate read-then-write pattern',
    ],

    machineComponents: [
      'Atomic decrement on allocation, increment on release',
      'Version-gated writes for idempotency',
    ],

    freedomComponents: [
      'Low inventory warning threshold (FREEDOM config key: flow09_low_inventory_threshold)',
    ],
  });
}

// ── T101 — PaymentEligibilityGate ─────────────────────────────────────────

export function createT101Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T101',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'PaymentEligibilityGate',
    archetype: ContractArchetype.VALIDATION,
    version: '1.0.0',
    entry: 'Called inline by T99 before payment step',
    purpose:
      'Validate attendee payment eligibility: account in good standing, no outstanding balance, payment method valid. Returns DataProcessResult.failure on ineligible — never throws.',
    distinctFrom: 'T113 (composite eligibility — T101 checks payment-specific eligibility only)',

    factoryDependencies: [
      {
        factoryId: 'F09-03',
        interfaceName: 'IPaymentEligibilityService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Payment eligibility checks: account standing, balance, method validity',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['payment_eligibility_check'],
      events: ['payment.eligibility.passed', 'payment.eligibility.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Payment eligibility failure MUST return DataProcessResult.failure — never throw',
    ],

    machineComponents: ['Account standing check', 'Balance check', 'Payment method validation'],
    freedomComponents: ['Max outstanding balance threshold', 'Eligible payment method types'],
  });
}

// ── T102 — TicketIssuer ────────────────────────────────────────────────────

/**
 * T102 — TicketIssuer [DATA_PIPELINE].
 *
 * Backward cross-wave: TicketIssued event triggers FLOW-04 T63 RSVPOrchestrator.
 * This is the first confirmed Wave3→Wave2 backward cross-wave dependency.
 */
export function createT102Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T102',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'TicketIssuer',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by payment.confirmed CloudEvent',
    purpose:
      'Issue ticket after payment confirmed. Store ticket record with unique ticketId (content-addressed). Emit TicketIssued — backward cross-wave: this event triggers FLOW-04 T63 RSVPOrchestrator. Idempotent by (participationId, ticketTier).',
    distinctFrom:
      'T107 (attendance token — T102 issues the ticket; T107 generates the physical/digital token)',

    factoryDependencies: [
      {
        factoryId: 'F09-04',
        interfaceName: 'ITicketIssuanceService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Ticket record creation with unique ID generation and cross-wave event emit',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW09_QUALITY_GATES_CORE,
      {
        gateId: 'QG-09-02',
        description: 'TicketIssued stored before emitted — triggers FLOW-04 T63 (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['ticket'],
      events: ['payment.confirmed', 'ticket.issued'],
      apiRoutes: ['/api/dynamic/tickets'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Ticket record MUST be stored before TicketIssued is emitted (DNA-8) — backward cross-wave to FLOW-04',
      'Ticket ID MUST be content-addressed by (participationId, ticketTier) — idempotent issuance',
    ],

    machineComponents: [
      'Content-addressed ticket ID generation',
      'Outbox: ticket stored before TicketIssued emitted (DNA-8)',
      'Backward cross-wave: TicketIssued → FLOW-04 T63',
    ],

    freedomComponents: ['Ticket format (PDF/QR/digital)', 'Ticket expiry policy'],
  });
}

// ── T103 — ReceiptValidator ────────────────────────────────────────────────

export function createT103Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T103',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ReceiptValidator',
    archetype: ContractArchetype.VALIDATION,
    version: '1.0.0',
    entry: 'Triggered by receipt.validation.requested CloudEvent',
    purpose:
      'Validate payment receipt: verify amount, currency, merchant reference, non-expired. Returns DataProcessResult.success({ valid: true }) or failure with reason code.',
    distinctFrom:
      'T101 (payment eligibility — T103 validates a completed payment receipt, not pre-payment eligibility)',

    factoryDependencies: [
      {
        factoryId: 'F09-05',
        interfaceName: 'IReceiptValidationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Receipt validation with amount, currency and reference verification',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['receipt_validation'],
      events: ['receipt.validated', 'receipt.validation.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Receipt validation failure MUST return DataProcessResult.failure with reason code — never throw',
    ],

    machineComponents: ['Amount verification', 'Currency check', 'Reference uniqueness check'],
    freedomComponents: ['Receipt expiry window', 'Accepted currencies'],
  });
}

// ── T104 — RefundOrchestrator ──────────────────────────────────────────────

export function createT104Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T104',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'RefundOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by refund.requested CloudEvent',
    purpose:
      'Orchestrate refund: validate refund eligibility → release seat (T106 reverse) → initiate payment reversal → invalidate ticket (T102 reverse) → emit RefundCompleted. Refund eligibility window from FREEDOM config.',
    distinctFrom: 'T99 (forward flow — T104 is the compensation/reversal orchestrator)',

    factoryDependencies: [
      {
        factoryId: 'F09-06',
        interfaceName: 'IRefundOrchestrationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Refund saga state tracking and compensation coordination',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['refund_saga'],
      events: ['refund.requested', 'refund.completed', 'refund.rejected'],
      apiRoutes: ['/api/dynamic/refunds'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Refund eligibility MUST be checked before initiating any reversal',
      'Refund eligibility window from FREEDOM config — never hardcoded',
    ],

    machineComponents: ['Saga compensation ordering (LIFO)', 'Refund eligibility gate'],
    freedomComponents: [
      'Refund window (FREEDOM config key: flow09_refund_window_hours)',
      'Partial refund policy',
    ],
  });
}

// ── T105 — ComplianceEscalationController ─────────────────────────────────

export function createT105Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T105',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ComplianceEscalationController',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by compliance.flag.raised CloudEvent',
    purpose:
      'Handle compliance escalation for flagged participations. Simultaneous escalation to multiple compliance channels (legal, fraud, risk) via Promise.allSettled — NOT sequential. Score-0 expected cycle-1 if sequential.',
    distinctFrom:
      'T116 (fraud signal collector — T105 responds to compliance flags; T116 passively collects signals)',

    factoryDependencies: [
      {
        factoryId: 'F09-07',
        interfaceName: 'IComplianceEscalationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Compliance escalation routing to legal/fraud/risk channels in parallel',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW09_QUALITY_GATES_CORE,
      {
        gateId: 'QG-09-03',
        description: 'Escalation to all channels via Promise.allSettled — not sequential',
        severity: 'error' as const,
        checkType: 'parallel_execution',
      },
    ],

    bfaRegistration: {
      entities: ['compliance_escalation'],
      events: ['compliance.flag.raised', 'compliance.escalation.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'ALL compliance channels MUST be notified via Promise.allSettled — sequential = score-0',
    ],

    machineComponents: [
      'Promise.allSettled parallel escalation',
      'Compliance record persist-before-emit',
    ],
    freedomComponents: ['Escalation channel routing rules', 'Escalation SLA thresholds'],
  });
}

// ── T106 — SeatReservationManager ─────────────────────────────────────────

export function createT106Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T106',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'SeatReservationManager',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Called by T99 before payment step',
    purpose:
      'Reserve seat atomically before payment. Seat reservation is a MACHINE_CONSTANT ordering constraint — always before payment. TTL-gated reservation: held for duration of FREEDOM config "flow09_seat_hold_seconds". Atomic reserve/release.',
    distinctFrom:
      'T100 (inventory — T106 manages individual seat holds; T100 tracks aggregate inventory)',

    factoryDependencies: [
      {
        factoryId: 'F09-08',
        interfaceName: 'ISeatReservationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Atomic seat reservation with TTL-gated hold and release',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['seat_reservation'],
      events: ['seat.reserved', 'seat.released', 'seat.hold.expired'],
      apiRoutes: ['/api/dynamic/seat-reservations'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Seat reservation MUST be atomic — no separate availability check + reserve pattern',
      'Seat hold TTL from FREEDOM config — never hardcoded',
    ],

    machineComponents: ['Atomic seat reserve/release', 'TTL expiry and auto-release'],
    freedomComponents: ['Seat hold TTL (FREEDOM config key: flow09_seat_hold_seconds)'],
  });
}

// ── T107 — AttendanceTokenService ─────────────────────────────────────────

export function createT107Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T107',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'AttendanceTokenService',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by ticket.issued CloudEvent',
    purpose:
      'Generate cryptographic attendance token (QR code, NFC token, etc.) after ticket issuance. Token content-addressed by (ticketId, attendeeId). Token format from FREEDOM config.',
    distinctFrom:
      'T102 (ticket issuance — T107 generates the physical/digital presentation artifact)',

    factoryDependencies: [
      {
        factoryId: 'F09-09',
        interfaceName: 'IAttendanceTokenService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Token generation and storage for attendance verification',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['attendance_token'],
      events: ['attendance.token.generated', 'attendance.token.invalidated'],
      apiRoutes: ['/api/dynamic/attendance-tokens'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Token MUST be content-addressed by (ticketId, attendeeId) — idempotent generation',
    ],

    machineComponents: ['Content-addressed token generation', 'Token persistence before emit'],
    freedomComponents: ['Token format (QR/NFC/digital)', 'Token expiry window'],
  });
}

// ── T108 — TokenRedemptionProcessor ───────────────────────────────────────

/**
 * T108 — TokenRedemptionProcessor [PROCESSING].
 * Score-0 expected cycle-1: loop outside transaction boundary.
 */
export function createT108Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T108',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'TokenRedemptionProcessor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by token.redemption.requested CloudEvent (venue scan)',
    purpose:
      'Process attendance token redemption at venue. Validate token, mark as redeemed atomically (setIfAbsent), emit TokenRedeemed. Redemption is idempotent — duplicate scan returns existing. Redemption loop MUST be inside transaction boundary.',
    distinctFrom: 'T107 (token generation — T108 processes the consumption of the token at venue)',

    factoryDependencies: [
      {
        factoryId: 'F09-10',
        interfaceName: 'ITokenRedemptionService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Atomic token redemption with idempotency via setIfAbsent pattern',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW09_QUALITY_GATES_CORE,
      {
        gateId: 'QG-09-04',
        description: 'Redemption loop inside transaction boundary (prevents double-redeem)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['token_redemption'],
      events: ['token.redemption.requested', 'token.redeemed', 'token.redemption.rejected'],
      apiRoutes: ['/api/dynamic/token-redemptions'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Redemption loop MUST be inside transaction boundary — loop outside = STOP_STRUCTURAL (IR-108-1)',
      'Duplicate token scan MUST return existing TokenRedeemed — setIfAbsent pattern',
    ],

    machineComponents: [
      'setIfAbsent idempotency on (tokenId)',
      'Transaction boundary around redemption check-and-mark loop',
    ],

    freedomComponents: ['Redemption window (hours before/after event)', 'Multi-redemption policy'],
  });
}

// ── T109 — ParticipationDataPipeline ──────────────────────────────────────

export function createT109Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T109',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ParticipationDataPipeline',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by participation.completed CloudEvent',
    purpose:
      'Pipeline participation data to analytics and downstream flows (FLOW-10, FLOW-13). Append-only writes. Tenant-scoped. No cross-tenant joins.',
    distinctFrom: 'T110 (aggregation — T109 pipelines raw data; T110 aggregates into summaries)',

    factoryDependencies: [
      {
        factoryId: 'F09-11',
        interfaceName: 'IParticipationDataService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Participation data pipeline with append-only writes to analytics index',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['participation_record'],
      events: ['participation.data.pipelined'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Participation data writes MUST be append-only — no updates or deletes',
      'Cross-tenant data joins are BLOCKED — tenant scope via AsyncLocalStorage (DNA-5)',
    ],

    machineComponents: ['Append-only write enforcement', 'Tenant isolation gate'],
    freedomComponents: ['Downstream flow routing rules', 'Data retention window'],
  });
}

// ── T110 — ParticipationAggregator ────────────────────────────────────────

export function createT110Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T110',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ParticipationAggregator',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by participation.data.pipelined CloudEvent; inline caller of T112',
    purpose:
      'Aggregate participation data into summary statistics. Calls T112 TicketFormatRenderer inline-pure for ticket display formatting. Best-effort aggregation — failures do not surface to caller.',
    distinctFrom: 'T109 (raw pipeline — T110 aggregates T109 output into summaries)',

    factoryDependencies: [
      {
        factoryId: 'F09-12',
        interfaceName: 'IParticipationAggregatorService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Participation aggregation with TTL-windowed counters',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['participation_summary'],
      events: ['participation.aggregated'],
      apiRoutes: ['/api/dynamic/participation-summaries'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'T112 TicketFormatRenderer is inline-pure — called synchronously, no queue',
    ],

    machineComponents: [
      'TTL-windowed counter aggregation',
      'Inline T112 call (executionModel: inline-pure)',
    ],
    freedomComponents: ['Aggregation window size', 'Summary metric definitions'],
  });
}

// ── T111 — CrossFlowParticipationGate ─────────────────────────────────────

export function createT111Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T111',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'CrossFlowParticipationGate',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Called by T99 before participation is allowed',
    purpose:
      'Cross-flow eligibility gate: GET_ONLY reads from FLOW-03 (event active), FLOW-04 (no duplicate RSVP), FLOW-05 (membership standing). All reads are GET_ONLY — no side effects on peer flows.',
    distinctFrom:
      'T101 (payment eligibility — T111 checks cross-flow standing; T101 checks payment-specific eligibility)',

    factoryDependencies: [
      {
        factoryId: 'F09-13',
        interfaceName: 'ICrossFlowEligibilityService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Cross-flow eligibility reads from FLOW-03, FLOW-04, FLOW-05',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['cross_flow_eligibility_check'],
      events: ['cross_flow.gate.passed', 'cross_flow.gate.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'ALL cross-flow reads MUST be GET_ONLY — no side effects on peer flows (FLOW-03, FLOW-04, FLOW-05)',
    ],

    machineComponents: [
      'GET_ONLY cross-flow eligibility reads',
      'Multi-flow eligibility aggregation',
    ],
    freedomComponents: ['Required prerequisite flows for gate', 'Gate failure behavior'],
  });
}

// ── T112 — TicketFormatRenderer (inline-pure) ─────────────────────────────

export function createT112Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T112',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'TicketFormatRenderer',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Called inline-pure by T110 ParticipationAggregator — synchronous, no queue',
    purpose:
      'Pure function: renders ticket data into display format (PDF, HTML, text). No side effects, no async calls, no DB writes. Returns formatted ticket string. executionModel: inline-pure.',
    distinctFrom:
      'T107 (token generation — T112 renders display format only; no cryptographic token)',

    factoryDependencies: [],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: [],
      events: [],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'TicketFormatRenderer is inline-pure — zero side effects, zero async calls, zero DB writes',
    ],

    machineComponents: ['Pure synchronous format rendering', 'Zero side effects'],
    freedomComponents: ['Ticket template by format type'],
  });
}

// ── T113 — EligibilityCompositeChecker (inline) ───────────────────────────

/**
 * T113 — EligibilityCompositeChecker [VALIDATION] (inline, caller: T99).
 * Score-0 expected cycle-1: 3-condition simultaneous check fails (fail-open).
 */
export function createT113Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T113',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'EligibilityCompositeChecker',
    archetype: ContractArchetype.VALIDATION,
    version: '1.0.0',
    entry: 'Called inline by T99 EventParticipationOrchestrator — synchronous',
    purpose:
      'Composite 3-condition eligibility check: age gate, geographic restriction, account standing. All 3 MUST be evaluated simultaneously (not sequential short-circuit). Fail-open: if all 3 checks fail simultaneously, return DataProcessResult.failure with all reason codes.',
    distinctFrom:
      'T111 (cross-flow gate — T113 checks per-attendee eligibility; T111 checks cross-flow standing)',

    factoryDependencies: [
      {
        factoryId: 'F09-14',
        interfaceName: 'IEligibilityCheckService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Composite eligibility: age, geography, account standing — parallel evaluation',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW09_QUALITY_GATES_CORE,
      {
        gateId: 'QG-09-05',
        description: 'All 3 eligibility conditions evaluated simultaneously — no short-circuit',
        severity: 'error' as const,
        checkType: 'parallel_execution',
      },
    ],

    bfaRegistration: {
      entities: ['eligibility_check'],
      events: ['eligibility.passed', 'eligibility.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'ALL 3 eligibility conditions MUST be evaluated simultaneously — sequential short-circuit = score-0',
    ],

    machineComponents: [
      'Promise.allSettled parallel eligibility evaluation',
      'Composite failure reason collection',
    ],
    freedomComponents: [
      'Age gate threshold',
      'Blocked geographic regions',
      'Account standing rules',
    ],
  });
}

// ── T114 — RevenueAttributionTracker ──────────────────────────────────────

export function createT114Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T114',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'RevenueAttributionTracker',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by ticket.issued or refund.completed CloudEvent',
    purpose:
      'Track revenue attribution for participation transactions. Append-only ledger. Best-effort: entire handler in try/catch.',
    distinctFrom:
      'T115 (participation analytics — T114 tracks revenue; T115 tracks participation metrics)',

    factoryDependencies: [
      {
        factoryId: 'F09-15',
        interfaceName: 'IRevenueAttributionService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Revenue attribution ledger with append-only writes',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['revenue_attribution'],
      events: ['revenue.attributed'],
      apiRoutes: ['/api/dynamic/revenue-attributions'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Revenue ledger MUST be append-only — no updates or deletions',
    ],

    machineComponents: ['Append-only ledger write', 'Best-effort try/catch wrapper'],
    freedomComponents: ['Attribution model (last-touch, first-touch, linear)'],
  });
}

// ── T115 — ParticipationAnalytics ─────────────────────────────────────────

export function createT115Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T115',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ParticipationAnalytics',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by participation.completed CloudEvent',
    purpose:
      'Track participation metrics: conversion rate, completion rate, abandonment rate. TTL-windowed counters. Best-effort observability — failures never surface to caller.',
    distinctFrom: 'T114 (revenue — T115 tracks behavioral metrics, not financial)',

    factoryDependencies: [
      {
        factoryId: 'F09-16',
        interfaceName: 'IParticipationAnalyticsService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Participation analytics counters with TTL windowing',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['participation_metric'],
      events: ['participation.analytics.tracked'],
      apiRoutes: ['/api/dynamic/participation-analytics'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Analytics counter MUST use TTL-windowed increment — no unbounded counters',
    ],

    machineComponents: ['TTL-windowed counter pattern', 'Best-effort try/catch'],
    freedomComponents: ['Analytics window size', 'Metric definitions'],
  });
}

// ── T116 — FraudSignalCollector ────────────────────────────────────────────

export function createT116Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T116',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'FraudSignalCollector',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by any FLOW-09 event (passive collector)',
    purpose:
      'Passively collect fraud signals from participation events. Append-only signal log. Signals trigger T105 ComplianceEscalationController when threshold breached. Threshold from FREEDOM config.',
    distinctFrom:
      'T105 (active escalation — T116 passively collects; T105 responds to threshold breach)',

    factoryDependencies: [
      {
        factoryId: 'F09-17',
        interfaceName: 'IFraudSignalService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Fraud signal collection with threshold-based escalation trigger',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['fraud_signal'],
      events: ['fraud.signal.collected', 'fraud.threshold.breached'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Fraud signal threshold from FREEDOM config — never hardcoded',
    ],

    machineComponents: ['Append-only signal log', 'Threshold breach detection'],
    freedomComponents: [
      'Fraud threshold (FREEDOM config key: flow09_fraud_signal_threshold)',
      'Signal window TTL',
    ],
  });
}

// ── T117 — ParticipationExportPipeline ────────────────────────────────────

export function createT117Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T117',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ParticipationExportPipeline',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by participation.export.requested CloudEvent',
    purpose:
      'Export participation data to downstream systems (FLOW-13 data warehouse, FLOW-20 analytics). Batch-based. Tenant-scoped. Append-only export records.',
    distinctFrom: 'T109 (real-time pipeline — T117 is batch export for downstream integrations)',

    factoryDependencies: [
      {
        factoryId: 'F09-18',
        interfaceName: 'IParticipationExportService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Batch participation export with tenant isolation',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['participation_export'],
      events: ['participation.export.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Export records are append-only — no overwrite of previous exports',
      'Cross-tenant export is BLOCKED — tenant scope via AsyncLocalStorage',
    ],

    machineComponents: ['Batch export with append-only records', 'Tenant isolation gate'],
    freedomComponents: ['Export batch size', 'Export destination routing'],
  });
}

// ── T118 — ParticipationReportGenerator ───────────────────────────────────

export function createT118Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T118',
    flowId: 'FLOW-09',
    flowName: 'Transactional Event Participation',
    name: 'ParticipationReportGenerator',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by report.generation.requested CloudEvent',
    purpose:
      'Generate participation summary reports for organizers. Reads from T110 aggregation index. Best-effort: entire handler in try/catch. Report format from FREEDOM config.',
    distinctFrom:
      'T110 (aggregation — T118 consumes T110 output to produce human-readable reports)',

    factoryDependencies: [
      {
        factoryId: 'F09-19',
        interfaceName: 'IParticipationReportService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Report generation from participation aggregation data',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: FLOW09_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['participation_report'],
      events: ['participation.report.generated'],
      apiRoutes: ['/api/dynamic/participation-reports'],
    },

    ironRules: [
      ...FLOW09_IRON_RULES_CORE,
      'Report generation MUST be best-effort — entire handler in try/catch',
      'Report format from FREEDOM config — never hardcoded',
    ],

    machineComponents: ['Best-effort try/catch wrapper', 'Read-only from aggregation index'],
    freedomComponents: ['Report format (PDF/CSV/JSON)', 'Report retention TTL'],
  });
}

// ── All FLOW-09 contracts ──────────────────────────────────────────────────

export const FLOW09_CONTRACT_FACTORIES = [
  createT99Contract,
  createT100Contract,
  createT101Contract,
  createT102Contract,
  createT103Contract,
  createT104Contract,
  createT105Contract,
  createT106Contract,
  createT107Contract,
  createT108Contract,
  createT109Contract,
  createT110Contract,
  createT111Contract,
  createT112Contract,
  createT113Contract,
  createT114Contract,
  createT115Contract,
  createT116Contract,
  createT117Contract,
  createT118Contract,
];

export const FLOW09_CONTRACTS = FLOW09_CONTRACT_FACTORIES.map((f) => f());
