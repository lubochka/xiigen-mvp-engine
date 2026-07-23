/**
 * FLOW-03 Engine Contracts — Event Management Platform
 *
 * T59  EventCreationOrchestrator    archetype: ORCHESTRATION
 * T60  EventRegistrationManager     archetype: PROCESSING
 * T61  EventPromotionEngine         archetype: PROCESSING
 * T62  EventAnalyticsTracker        archetype: OBSERVABILITY
 *
 * Families: F-03-xx
 * Named checks: atomic_capacity_operation, null_capacity_is_unlimited,
 *               content_safety_before_promotion, best_effort_try_catch_entire_handler,
 *               ttl_windowed_counter_pattern, freedom_config_threshold_scan
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: validate() returns DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared quality gates ───────────────────────────────────────────────────

const FLOW03_QUALITY_GATES_CORE = [
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

const FLOW03_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T59 — EventCreationOrchestrator ───────────────────────────────────────

/**
 * T59 — EventCreationOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Orchestrates multi-step event creation: validate → store → publish → notify.
 *          capacity=null means unlimited — enforced via strict null check (not falsy).
 *          Outbox ordering: event record stored before EventCreated emitted.
 *
 * IR-59-1: capacity null === unlimited — use strict null check, not falsy check
 * IR-59-2: storeDocument() before enqueue() on EventCreated emit (DNA-8)
 */
export function createT59Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T59',
    flowId: 'FLOW-03',
    flowName: 'Event Management Platform',
    name: 'EventCreationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by event.creation.requested CloudEvent',
    purpose:
      'Orchestrate multi-step event creation: validate organizer permissions, store event record, publish to discovery index, emit EventCreated. capacity=null treated as unlimited seats (strict null check). Outbox: store before emit.',
    distinctFrom: 'T60 (registration manager — T59 creates the event, T60 registers attendees)',

    factoryDependencies: [
      {
        factoryId: 'F03-01',
        interfaceName: 'IEventStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Store and retrieve event records with capacity tracking',
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
      ...FLOW03_QUALITY_GATES_CORE,
      {
        gateId: 'QG-03-01',
        description: 'capacity=null treated as unlimited (strict null check, IR-59-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-03-02',
        description: 'storeDocument() before EventCreated emit (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['event'],
      events: ['event.creation.requested', 'event.created', 'event.creation.failed'],
      apiRoutes: ['/api/dynamic/events'],
    },

    ironRules: [
      ...FLOW03_IRON_RULES_CORE,
      'capacity null MUST be treated as unlimited — use `capacity !== null` not `!capacity` (IR-59-1)',
      'Event record MUST be stored in DATABASE FABRIC before EventCreated is enqueued (DNA-8)',
    ],

    machineComponents: [
      'Strict null capacity check (null = unlimited, 0 = closed)',
      'Outbox ordering: store before emit (DNA-8)',
      'Organizer permission validation gate',
    ],

    freedomComponents: [
      'Max events per organizer per month (FREEDOM config key: flow03_max_events_per_organizer)',
      'Default event visibility (public/private)',
      'Allowed event categories',
    ],
  });
}

// ── T60 — EventRegistrationManager ────────────────────────────────────────

/**
 * T60 — EventRegistrationManager [PROCESSING].
 *
 * PURPOSE: Handles attendee registration for an event.
 *          Registration MUST be ONE atomic operation — separate check+write = race condition.
 *          Idempotency: same attendeeId + eventId returns existing AttendeeRegistered.
 *          Thresholds (max attendees, waitlist limit) from FREEDOM config — never hardcoded.
 *
 * IR-60-1: registerAtomically() — ONE atomic operation, not check-then-write (T60 IR-1)
 * IR-60-2: Duplicate attendeeId+eventId returns existing — SETNX pattern
 * IR-60-3: All thresholds from FREEDOM config — no hardcoded values
 */
export function createT60Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T60',
    flowId: 'FLOW-03',
    flowName: 'Event Management Platform',
    name: 'EventRegistrationManager',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by event.registration.requested CloudEvent',
    purpose:
      'Atomic attendee registration: validate eligibility, decrement capacity and create registration record in one atomic operation. Idempotent by (attendeeId, eventId). Waitlist promotion via FIFO queue. All capacity limits from FREEDOM config.',
    distinctFrom: 'T59 (event creation — T60 registers attendees to an existing event)',

    factoryDependencies: [
      {
        factoryId: 'F03-02',
        interfaceName: 'IAtomicRegistrationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Atomic registration with capacity decrement — ONE operation, no TOCTOU race',
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
      ...FLOW03_QUALITY_GATES_CORE,
      {
        gateId: 'QG-03-03',
        description: 'Registration is ONE atomic op — no separate check+write (IR-60-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-03-04',
        description: 'All thresholds from FREEDOM config — no hardcoded values (IR-60-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['event_registration', 'waitlist_entry'],
      events: [
        'event.registration.requested',
        'attendee.registered',
        'registration.failed',
        'waitlist.joined',
        'waitlist.promoted',
      ],
      apiRoutes: ['/api/dynamic/event-registrations'],
    },

    ironRules: [
      ...FLOW03_IRON_RULES_CORE,
      'Registration MUST be ONE atomic operation — separate check+write creates race condition (IR-60-1)',
      'Duplicate (attendeeId, eventId) MUST return existing AttendeeRegistered — SETNX pattern (IR-60-2)',
      'Capacity limit, waitlist limit from FREEDOM config — never hardcoded (IR-60-3)',
    ],

    machineComponents: [
      'Atomic capacity decrement + registration create (one DB call)',
      'setIfAbsent idempotency key: (attendeeId, eventId)',
      'FIFO waitlist queue ordering by joinTimestamp',
      'Persist-before-emit: AttendeeRegistered stored before enqueued (DNA-8)',
    ],

    freedomComponents: [
      'Max attendees per event (FREEDOM config key: flow03_max_attendees)',
      'Waitlist size limit',
      'Waitlist auto-promotion enabled flag',
    ],
  });
}

// ── T61 — EventPromotionEngine ─────────────────────────────────────────────

/**
 * T61 — EventPromotionEngine [PROCESSING].
 *
 * PURPOSE: Promotes events to discovery feeds after content safety check.
 *          Content safety check MUST run BEFORE promotion/distribution.
 *          Promotion is asynchronous — no blocking on external calls.
 *
 * IR-61-1: Safety check before promotion (T61 IR-2)
 * IR-61-2: storeDocument() before EventPromoted emit
 */
export function createT61Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T61',
    flowId: 'FLOW-03',
    flowName: 'Event Management Platform',
    name: 'EventPromotionEngine',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by event.promotion.requested CloudEvent',
    purpose:
      'Promote events to discovery feeds. Content safety check MUST run BEFORE any distribution action. On safety pass: store promotion record, emit EventPromoted. On safety fail: emit EventPromotionRejected. Promotion targets from FREEDOM config.',
    distinctFrom: 'T59 (event creation — T61 promotes an already-created event to discovery)',

    factoryDependencies: [
      {
        factoryId: 'F03-03',
        interfaceName: 'IEventPromotionService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Event promotion record store and discovery feed index update',
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
      ...FLOW03_QUALITY_GATES_CORE,
      {
        gateId: 'QG-03-05',
        description: 'Content safety check BEFORE promotion/distribution (IR-61-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['event_promotion'],
      events: ['event.promotion.requested', 'event.promoted', 'event.promotion.rejected'],
      apiRoutes: ['/api/dynamic/event-promotions'],
    },

    ironRules: [
      ...FLOW03_IRON_RULES_CORE,
      'Content safety check MUST complete and PASS before any promotion/distribution action (IR-61-1)',
      'Promotion targets (channels, audience) from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Content safety check ordering gate (before promotion)',
      'Promotion record persist-before-emit (DNA-8)',
    ],

    freedomComponents: [
      'Promotion target channels (FREEDOM config key: flow03_promotion_channels)',
      'Content safety provider',
      'Auto-promote flag per event category',
    ],
  });
}

// ── T62 — EventAnalyticsTracker ────────────────────────────────────────────

/**
 * T62 — EventAnalyticsTracker [OBSERVABILITY].
 *
 * PURPOSE: Tracks event analytics (views, registrations, cancellations).
 *          Counter uses increment()+TTL — no unbounded counters.
 *          Entire handler wrapped in try/catch — best-effort, never fails the caller.
 *          TTL and threshold values from FREEDOM config — never hardcoded.
 *
 * IR-62-1: increment()+TTL counter pattern (T62 IR-1)
 * IR-62-2: Entire handler in try/catch, catch returns success({ tracked: false }) (T62 IR-4)
 * IR-62-3: Thresholds from FREEDOM config (T62 IR-6)
 */
export function createT62Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T62',
    flowId: 'FLOW-03',
    flowName: 'Event Management Platform',
    name: 'EventAnalyticsTracker',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: 'Triggered by any FLOW-03 event (view, registration, cancellation)',
    purpose:
      'Track event analytics in best-effort mode. Entire handler in try/catch — analytics failures never surface to caller. TTL-windowed counters (increment+TTL) for rate windows. All thresholds from FREEDOM config. Returns DataProcessResult.success({ tracked: false }) on any error.',
    distinctFrom:
      'T59/T60/T61 (transactional flows — T62 is best-effort observability, zero impact on caller)',

    factoryDependencies: [
      {
        factoryId: 'F03-04',
        interfaceName: 'IEventAnalyticsService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Analytics counter storage with TTL-windowed increment',
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
      ...FLOW03_QUALITY_GATES_CORE,
      {
        gateId: 'QG-03-06',
        description: 'TTL-windowed counter pattern — no unbounded counters (IR-62-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-03-07',
        description: 'Entire handler in try/catch — best-effort mode (IR-62-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-03-08',
        description: 'Thresholds from FREEDOM config — never hardcoded (IR-62-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['event_analytics_counter'],
      events: ['event.analytics.tracked', 'event.analytics.threshold_reached'],
      apiRoutes: ['/api/dynamic/event-analytics'],
    },

    ironRules: [
      ...FLOW03_IRON_RULES_CORE,
      'Counter MUST use increment()+TTL — unbounded counters are not allowed (IR-62-1)',
      'Entire handler body MUST be in try/catch — catch returns DataProcessResult.success({ tracked: false }) (IR-62-2)',
      'All threshold/TTL/rate values from FREEDOM config — no hardcoded constants (IR-62-3)',
    ],

    machineComponents: [
      'try/catch wrapping entire handler body (best-effort)',
      'increment()+TTL counter pattern for rate windows',
      'success({ tracked: false }) on any analytics error',
    ],

    freedomComponents: [
      'Counter TTL (FREEDOM config key: flow03_analytics_counter_ttl)',
      'Analytics threshold for alerts',
      'Tracked event types',
    ],
  });
}

// ── All FLOW-03 contracts ──────────────────────────────────────────────────

export const FLOW03_CONTRACT_FACTORIES = [
  createT59Contract,
  createT60Contract,
  createT61Contract,
  createT62Contract,
];

export const FLOW03_CONTRACTS = FLOW03_CONTRACT_FACTORIES.map((f) => f());
