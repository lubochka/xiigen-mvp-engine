/**
 * FLOW-04 Engine Contracts — Event Attendance & Management
 *
 * T63  RSVPOrchestrator            archetype: ORCHESTRATION
 * T64  WaitlistManager             archetype: PROCESSING
 * T65  CheckInProcessor            archetype: PROCESSING
 * T66  FeedbackWindowController    archetype: PROCESSING
 *
 * Named checks: attendance::capacity-atomicity, attendance::idempotent-rsvp,
 *               attendance::waitlist-fairness, attendance::feedback-window-gate
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: validate() returns DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared quality gates ───────────────────────────────────────────────────

const FLOW04_QUALITY_GATES_CORE = [
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

const FLOW04_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T63 — RSVPOrchestrator ─────────────────────────────────────────────────

/**
 * T63 — RSVPOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Handles dual-entry RSVP flow (free vs paid).
 *          Atomic capacity decrement + RSVP create = ONE operation (CF-802).
 *          Idempotent: duplicate (attendeeId, eventId) returns existing RSVPConfirmed.
 *          Waitlist join if capacity exhausted — FIFO ordered.
 *
 * IR-63-1: decrementAndCreate() atomic operation — no separate check+write (CF-802)
 * IR-63-2: Idempotency: SETNX on (attendeeId, eventId)
 */
export function createT63Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T63',
    flowId: 'FLOW-04',
    flowName: 'Event Attendance & Management',
    name: 'RSVPOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by rsvp.requested CloudEvent (free path) or payment.confirmed (paid path)',
    purpose:
      'Orchestrate dual-entry RSVP: free path (immediate) or paid path (after payment.confirmed). Capacity decrement + RSVP record create MUST be ONE atomic operation (CF-802). Idempotent by (attendeeId, eventId). If capacity exhausted: route to waitlist (T64).',
    distinctFrom: 'T64 (waitlist — T63 handles immediate RSVP; T64 manages waitlist queue)',

    factoryDependencies: [
      {
        factoryId: 'F04-01',
        interfaceName: 'IAtomicRsvpService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Atomic RSVP: decrementAndCreate() — capacity decrement + RSVP record in one operation',
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
      ...FLOW04_QUALITY_GATES_CORE,
      {
        gateId: 'QG-04-01',
        description: 'Atomic capacity decrement + RSVP create = ONE operation (CF-802)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-04-02',
        description: 'Duplicate (attendeeId, eventId) returns existing — SETNX (IR-63-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['rsvp_record', 'attendee_registration'],
      events: ['rsvp.requested', 'rsvp.confirmed', 'rsvp.failed', 'attendee.waitlisted'],
      apiRoutes: ['/api/dynamic/rsvps'],
    },

    ironRules: [
      ...FLOW04_IRON_RULES_CORE,
      'Capacity decrement + RSVP create MUST be ONE atomic operation — separate check-then-write creates oversell race condition (CF-802)',
      'Duplicate RSVP with same attendeeId MUST return existing RSVPConfirmed — SETNX pattern (IR-63-2)',
    ],

    machineComponents: [
      'decrementAndCreate() atomic DB operation (one call)',
      'SETNX idempotency key: (attendeeId, eventId)',
      'Dual-entry routing: free path vs paid-path via event type discriminator',
      'Outbox: RSVPConfirmed stored before emitted (DNA-8)',
    ],

    freedomComponents: [
      'RSVP cancellation window (FREEDOM config key: flow04_rsvp_cancellation_window_hours)',
      'Max RSVPs per attendee per month',
    ],
  });
}

// ── T64 — WaitlistManager ──────────────────────────────────────────────────

/**
 * T64 — WaitlistManager [PROCESSING].
 *
 * PURPOSE: Manages waitlist queue for full events.
 *          Waitlist promotion order is FIFO by joinTimestamp (CF-804).
 *          No priority override without tenant config (FREEDOM only).
 *          Idempotent join: same attendeeId+eventId returns existing position.
 *
 * IR-64-1: FIFO by joinTimestamp — no hardcoded priority override (CF-804)
 */
export function createT64Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T64',
    flowId: 'FLOW-04',
    flowName: 'Event Attendance & Management',
    name: 'WaitlistManager',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered when T63 finds capacity = 0 and routes to waitlist',
    purpose:
      'Manage FIFO waitlist for fully-booked events. Promotion order strictly by joinTimestamp (CF-804) — no priority override without FREEDOM config. Idempotent join by (attendeeId, eventId). Emit WaitlistJoined on join, WaitlistPromoted when slot opens.',
    distinctFrom: 'T63 (RSVP — T64 only activates when capacity is exhausted)',

    factoryDependencies: [
      {
        factoryId: 'F04-02',
        interfaceName: 'IWaitlistService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FIFO waitlist queue: sorted set by joinTimestamp, promotion via zadd/zrange',
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
      ...FLOW04_QUALITY_GATES_CORE,
      {
        gateId: 'QG-04-03',
        description: 'Waitlist promotion FIFO by joinTimestamp (CF-804)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['waitlist_entry'],
      events: ['waitlist.joined', 'waitlist.promoted', 'waitlist.expired'],
      apiRoutes: ['/api/dynamic/waitlists'],
    },

    ironRules: [
      ...FLOW04_IRON_RULES_CORE,
      'Waitlist promotion order MUST be FIFO by joinTimestamp — no priority override without tenant FREEDOM config (CF-804)',
      'Duplicate join (same attendeeId+eventId) MUST return existing waitlist position — no second write',
    ],

    machineComponents: [
      'Sorted set by joinTimestamp score for FIFO ordering',
      'idempotency on (attendeeId, eventId) — setIfAbsent pattern',
      'Promotion trigger on rsvp.cancelled or capacity.expanded event',
    ],

    freedomComponents: [
      'Waitlist max size (FREEDOM config key: flow04_waitlist_max_size)',
      'Waitlist expiry TTL (hours)',
      'Priority override rules (tenant-specific, FREEDOM config only)',
    ],
  });
}

// ── T65 — CheckInProcessor ─────────────────────────────────────────────────

/**
 * T65 — CheckInProcessor [PROCESSING].
 *
 * PURPOSE: Processes event check-in at venue.
 *          Validates RSVP exists and is CONFIRMED before check-in.
 *          Idempotent: duplicate check-in returns existing CheckInConfirmed.
 *          MACHINE_CONSTANT: check-in window (1hr before to event end) — never configurable.
 *
 * IR-65-1: RSVP must be CONFIRMED before check-in allowed
 * IR-65-2: Check-in window is a MACHINE_CONSTANT — not from FREEDOM config
 */
export function createT65Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T65',
    flowId: 'FLOW-04',
    flowName: 'Event Attendance & Management',
    name: 'CheckInProcessor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by checkin.scan.received CloudEvent (QR scan or manual entry)',
    purpose:
      'Process venue check-in. Validate RSVP status = CONFIRMED before allowing entry. Idempotent by (attendeeId, eventId). Record check-in timestamp. Emit CheckInConfirmed. MACHINE_CONSTANT: 1hr pre-event window (never from FREEDOM config).',
    distinctFrom: 'T63 (RSVP creation — T65 processes physical arrival at the event)',

    factoryDependencies: [
      {
        factoryId: 'F04-03',
        interfaceName: 'ICheckInService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Check-in record storage and RSVP validation',
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
      ...FLOW04_QUALITY_GATES_CORE,
      {
        gateId: 'QG-04-04',
        description: 'RSVP status must be CONFIRMED before check-in (IR-65-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['checkin_record'],
      events: ['checkin.scan.received', 'checkin.confirmed', 'checkin.rejected'],
      apiRoutes: ['/api/dynamic/checkins'],
    },

    ironRules: [
      ...FLOW04_IRON_RULES_CORE,
      'RSVP status MUST be CONFIRMED before check-in is processed — NO_RSVP or WAITLISTED = reject (IR-65-1)',
      'Check-in window boundary is a MACHINE_CONSTANT — never read from FREEDOM config (IR-65-2)',
    ],

    machineComponents: [
      'RSVP status validation: CONFIRMED only',
      'Idempotency on (attendeeId, eventId)',
      'Check-in timestamp record (UTC)',
    ],

    freedomComponents: ['Check-in confirmation message template', 'Late check-in escalation flag'],
  });
}

// ── T66 — FeedbackWindowController ────────────────────────────────────────

/**
 * T66 — FeedbackWindowController [PROCESSING].
 *
 * PURPOSE: Controls the post-event feedback collection window.
 *          FeedbackWindowOpened MUST only emit after EventEnded is received (CF-807).
 *          Timer-based trigger is WRONG — event-driven only.
 *          Feedback window TTL from FREEDOM config.
 *
 * IR-66-1: FeedbackWindowOpened only after EventEnded — no timer trigger (CF-807)
 */
export function createT66Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T66',
    flowId: 'FLOW-04',
    flowName: 'Event Attendance & Management',
    name: 'FeedbackWindowController',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by event.ended CloudEvent (NOT by timer)',
    purpose:
      'Open post-event feedback window. FeedbackWindowOpened MUST only emit after EventEnded is received — timer-based trigger is a CF-807 violation. Feedback window TTL from FREEDOM config. Close window after TTL expiry and emit FeedbackWindowClosed.',
    distinctFrom: 'T65 (check-in — T66 activates after the event ends, not at event start)',

    factoryDependencies: [
      {
        factoryId: 'F04-04',
        interfaceName: 'IFeedbackWindowService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Feedback window state management with TTL tracking',
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
      ...FLOW04_QUALITY_GATES_CORE,
      {
        gateId: 'QG-04-05',
        description: 'FeedbackWindowOpened only after EventEnded — no timer trigger (CF-807)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['feedback_window'],
      events: ['event.ended', 'feedback.window.opened', 'feedback.window.closed'],
      apiRoutes: ['/api/dynamic/feedback-windows'],
    },

    ironRules: [
      ...FLOW04_IRON_RULES_CORE,
      'FeedbackWindowOpened MUST only emit after EventEnded is received — timer-based trigger is a CF-807 violation (IR-66-1)',
      'Feedback window TTL from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Event-driven trigger: listen for event.ended CloudEvent only',
      'FeedbackWindowOpened emit gated on EventEnded receipt (CF-807)',
      'TTL-based window expiry tracking',
    ],

    freedomComponents: [
      'Feedback window TTL in hours (FREEDOM config key: flow04_feedback_window_ttl_hours)',
      'Feedback question template ID',
    ],
  });
}

// ── All FLOW-04 contracts ──────────────────────────────────────────────────

export const FLOW04_CONTRACT_FACTORIES = [
  createT63Contract,
  createT64Contract,
  createT65Contract,
  createT66Contract,
];

export const FLOW04_CONTRACTS = FLOW04_CONTRACT_FACTORIES.map((f) => f());
