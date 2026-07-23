/**
 * FLOW-06 Engine Contracts — Membership & Group Feed
 *
 * T99   MembershipOrchestrator        archetype: ORCHESTRATION
 * T100  SubscriptionTierResolver      archetype: PROCESSING
 * T101  MembershipActivator           archetype: PROCESSING
 * T102  MembershipAccessController    archetype: PROCESSING
 * T103  MemberJoinedNotificationSender archetype: OBSERVABILITY
 * T104  HistoricalContentSeeder       archetype: PROCESSING
 * T105  TierGatedContentRetriever     archetype: PROCESSING
 * T106  FeedComposer                  archetype: PROCESSING
 * T107  FeedAnalyticsRecorder         archetype: OBSERVABILITY
 * T108  NotificationDispatcher        archetype: OBSERVABILITY
 * T109  WelcomeMessageSender          archetype: PROCESSING
 * T110  GroupActivityNotifier         archetype: OBSERVABILITY
 * T111  AdminNotificationSender       archetype: OBSERVABILITY
 * T112  ApprovalRequestSender         archetype: PROCESSING
 * T113  ApprovalStatusTracker         archetype: PROCESSING
 * T114  AccessGrantedRecorder         archetype: PROCESSING
 * T115  MembershipFinalizer           archetype: ORCHESTRATION
 * T116  TierUpgradeProcessor          archetype: PROCESSING
 * T117  TierDowngradeProcessor        archetype: PROCESSING
 * T118  TierChangeAnalytics           archetype: OBSERVABILITY
 *
 * Named checks:
 *   membership::access-before-content   — T104 triggers on MembershipActivated (CF-06-1)
 *   membership::tier-from-subscription  — T100 reads tier from xiigen-subscriptions (CF-06-2)
 *   membership::setnx-idempotency       — T99 SETNX on (userId, groupId) (CF-06-3)
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: validate() returns DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared quality gates ───────────────────────────────────────────────────

const FLOW06_QUALITY_GATES_CORE = [
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

const FLOW06_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T99 — MembershipOrchestrator ──────────────────────────────────────────

/**
 * T99 — MembershipOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Entry orchestrator for group join flow.
 *          SETNX on (userId, groupId) — idempotent, returns existing on duplicate (CF-06-3).
 *
 * IR-99-1: SETNX (userId, groupId) — return success(existing) on duplicate, never failure
 * IR-99-2: DNA-8 — store join record BEFORE emitting GroupJoinInitiated
 */
export function createT99Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T99',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'MembershipOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by group.join.requested CloudEvent',
    purpose:
      'Orchestrate group join flow. SETNX on (userId, groupId): duplicate returns DataProcessResult.success(existingRecord). Route to T100 (tier resolution) → T102 (access control) → T101 (activation). Store initial join record BEFORE emitting GroupJoinInitiated (DNA-8).',
    distinctFrom:
      'T101 (activator — T99 orchestrates; T101 stores the final ACTIVE/PENDING membership)',

    factoryDependencies: [
      {
        factoryId: 'F06-01',
        interfaceName: 'IMembershipStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'SETNX membership record on (userId, groupId)',
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
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-01',
        description: 'SETNX (userId, groupId) returns existing as success — CF-06-3',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],

    bfaRegistration: {
      entities: ['membership_record'],
      events: ['group.join.initiated', 'membership.activated', 'membership.pending'],
      apiRoutes: ['/api/dynamic/memberships'],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-99-1: SETNX (userId, groupId) — return success(existing) on duplicate, never failure',
      'IR-99-2: DNA-8 — store join record BEFORE emitting GroupJoinInitiated',
    ],

    machineComponents: [
      'SETNX idempotency key: (userId, groupId)',
      'Outbox: join record stored before GroupJoinInitiated emitted (DNA-8)',
    ],

    freedomComponents: ['Max members per group (FREEDOM: flow06_max_group_members)'],
  });
}

// ── T100 — SubscriptionTierResolver ───────────────────────────────────────

/**
 * T100 — SubscriptionTierResolver [PROCESSING].
 *
 * PURPOSE: Resolves membership tier from xiigen-subscriptions (server-side, CF-06-2).
 *          membershipTier field DOES NOT EXIST in input shape.
 *
 * IR-100-1: NEVER read membershipTier from input — CF-06-2 BUILD_FAILURE
 * IR-100-2: Query xiigen-subscriptions by userId for active subscription
 */
export function createT100Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T100',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'SubscriptionTierResolver',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by GroupJoinInitiated event from T99',
    purpose:
      'Resolve membership tier from xiigen-subscriptions. Query by userId → find active subscription → return resolvedTier. membershipTier field does not exist in input shape — CF-06-2 prevents client-side tier injection.',
    distinctFrom: 'T99 (orchestrator — T100 resolves tier; T99 routes and deduplicates)',

    factoryDependencies: [
      {
        factoryId: 'F06-02',
        interfaceName: 'ISubscriptionReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Read active subscription record to resolve membershipTier',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-02',
        description: 'membershipTier absent from input shape — CF-06-2',
        severity: 'error' as const,
        checkType: 'server_side_tier',
      },
    ],

    bfaRegistration: {
      entities: ['subscription_tier_resolution'],
      events: ['tier.resolved'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-100-1: membershipTier MUST NOT exist in input shape — CF-06-2 BUILD_FAILURE',
      'IR-100-2: query xiigen-subscriptions by userId — never trust client-submitted tier',
    ],

    machineComponents: [
      'Input shape: no membershipTier field (structural exclusion, CF-06-2)',
      'Source: xiigen-subscriptions.tier for userId',
    ],

    freedomComponents: [],

    machineConstants: [
      { key: 'TIER_INPUT_FIELD_ABSENT', value: 'membershipTier', neverFromConfig: true },
    ],
  });
}

// ── T101 — MembershipActivator ─────────────────────────────────────────────

/**
 * T101 — MembershipActivator [PROCESSING].
 *
 * PURPOSE: Stores final membership record.
 *          PUBLIC: status='ACTIVE' → emit MembershipActivated.
 *          PRIVATE: status='PENDING' → emit MembershipPendingApproval.
 *          DNA-8: store BEFORE emitting on both paths.
 *
 * IR-101-1: status derived from group.type — MACHINE constant
 * IR-101-2: DNA-8 — storeDocument BEFORE emitting on both paths
 */
export function createT101Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T101',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'MembershipActivator',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by TierResolved event from T100',
    purpose:
      'Store final membership record. group.type=PUBLIC → status=ACTIVE → storeDocument → emit MembershipActivated (triggers Branch B). group.type=PRIVATE → status=PENDING → storeDocument → emit MembershipPendingApproval (triggers SUBFLOW-06P). DNA-8 required on both paths.',
    distinctFrom:
      'T115 (finalizer — T101 handles PUBLIC path; T115 finalizes PRIVATE path after approval)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-03',
        description: 'status derived from group.type — MACHINE constant',
        severity: 'error' as const,
        checkType: 'machine_constant',
      },
    ],

    bfaRegistration: {
      entities: ['membership_activation'],
      events: ['membership.activated', 'membership.pending.approval'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-101-1: status = group.type === PRIVATE ? PENDING : ACTIVE — MACHINE, not input',
      'IR-101-2: DNA-8 — storeDocument BEFORE emitting on both PUBLIC and PRIVATE paths',
    ],

    machineComponents: [
      'Status derivation: group.type=PRIVATE → PENDING, group.type=PUBLIC → ACTIVE',
      'Outbox: membership stored before MembershipActivated or MembershipPendingApproval emitted (DNA-8)',
    ],

    freedomComponents: [],

    machineConstants: [
      { key: 'PRIVATE_GROUP_STATUS', value: 'PENDING', neverFromConfig: true },
      { key: 'PUBLIC_GROUP_STATUS', value: 'ACTIVE', neverFromConfig: true },
    ],
  });
}

// ── T102 — MembershipAccessController ─────────────────────────────────────

/** T102 — MembershipAccessController [PROCESSING]. Validates join permissions. */
export function createT102Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T102',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'MembershipAccessController',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by TierResolved event (runs before T101)',
    purpose:
      'Validate join permissions. Check: group capacity not exceeded, user not banned, join restrictions satisfied. On failure: DataProcessResult.failure(reason) — T101 does not run. On success: proceed to T101.',
    distinctFrom: 'T101 (activator — T102 validates; T101 stores after validation passes)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['membership_access_check'], events: [], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: ['Join restrictions (FREEDOM: flow06_join_restrictions)'],
  });
}

// ── T103 — MemberJoinedNotificationSender ─────────────────────────────────

/** T103 — MemberJoinedNotificationSender [OBSERVABILITY]. Queue-driven only. */
export function createT103Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T103',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'MemberJoinedNotificationSender',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('MembershipActivated') — queue-driven only (Rule 11)",
    purpose:
      'Notify group admins when a new member joins. Queue-driven — no HTTP (Rule 11). Stores notification record BEFORE emitting.',
    distinctFrom: 'T108 (general dispatcher — T103 specifically handles join notifications)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['join_notification'],
      events: ['member.joined.notification.sent'],
      apiRoutes: [],
    },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T104 — HistoricalContentSeeder ────────────────────────────────────────

/**
 * T104 — HistoricalContentSeeder [PROCESSING].
 *
 * PURPOSE: Branch B entry — triggers on MembershipActivated (CF-06-1).
 *          Never triggers on GroupJoinRequested.
 *
 * IR-104-1: Entry event is MembershipActivated — NEVER GroupJoinRequested (CF-06-1)
 */
export function createT104Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T104',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'HistoricalContentSeeder',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry:
      "@EventPattern('MembershipActivated') — Branch B entry. NEVER GroupJoinRequested (CF-06-1)",
    purpose:
      'Seed historical group content for new member feed. Entry: MembershipActivated (access confirmed). Call T105 with membershipTier for tier-filtered content retrieval. Store seed record BEFORE emitting HistoricalContentSeeded (DNA-8).',
    distinctFrom: 'T105 (retriever — T104 orchestrates; T105 executes tier-gated query)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-04',
        description: 'Entry event is MembershipActivated — CF-06-1',
        severity: 'error' as const,
        checkType: 'access_before_content',
      },
    ],

    bfaRegistration: {
      entities: ['historical_content_seed'],
      events: ['historical.content.seeded'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-104-1: entry event is MembershipActivated — NEVER GroupJoinRequested (CF-06-1 BUILD_FAILURE)',
    ],

    machineComponents: [
      'Entry event: MembershipActivated (not GroupJoinRequested) — access control gate',
    ],
    freedomComponents: ['Historical content window (FREEDOM: flow06_history_seed_days)'],
  });
}

// ── T105 — TierGatedContentRetriever ──────────────────────────────────────

/**
 * T105 — TierGatedContentRetriever [PROCESSING].
 *
 * PURPOSE: Retrieves content filtered by membershipTier.
 *          Tier filter is MANDATORY — absence = access control bypass.
 */
export function createT105Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T105',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'TierGatedContentRetriever',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Called by T104 with groupId + membershipTier',
    purpose:
      "Retrieve group content filtered by tier. searchDocuments('xiigen-group-content', {groupId, tier: {lte: memberTier}}). Tier filter is mandatory — omission exposes premium content to free-tier members.",
    distinctFrom: 'T104 (seeds — T105 queries; T104 orchestrates the seeding process)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-05',
        description: 'Tier filter mandatory on all content queries',
        severity: 'error' as const,
        checkType: 'tier_filter',
      },
    ],

    bfaRegistration: { entities: ['content_retrieval'], events: [], apiRoutes: [] },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-105-1: searchDocuments MUST include {tier: {lte: membershipTier}} — absence is access control bypass',
    ],

    machineComponents: [
      'Tier filter: {tier: {lte: membershipTier}} — always present in query (CF-06-1)',
    ],
    freedomComponents: [],
  });
}

// ── T106 — FeedComposer ───────────────────────────────────────────────────

/** T106 — FeedComposer [PROCESSING]. */
export function createT106Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T106',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'FeedComposer',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by HistoricalContentSeeded event from T104',
    purpose:
      'Compose member feed from seeded content. Always applies tier filter. Store feed record BEFORE emitting FeedComposed (DNA-8).',
    distinctFrom: 'T105 (retrieves — T106 composes and stores the final feed)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['member_feed'], events: ['feed.composed'], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: ['Feed page size (FREEDOM: flow06_feed_page_size)'],
  });
}

// ── T107 — FeedAnalyticsRecorder ──────────────────────────────────────────

/** T107 — FeedAnalyticsRecorder [OBSERVABILITY]. Pure queue consumer. */
export function createT107Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T107',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'FeedAnalyticsRecorder',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('FeedComposed') — pure queue consumer (Rule 11)",
    purpose:
      'Record feed population analytics. Pure observer — no HTTP. Stores analytics in xiigen-feed-analytics.',
    distinctFrom: 'T106 (composes — T107 records analytics)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['feed_analytics_record'], events: [], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T108–T111: Branch C (Notifications) ───────────────────────────────────

/** T108 — NotificationDispatcher [OBSERVABILITY]. */
export function createT108Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T108',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'NotificationDispatcher',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('MembershipActivated') — queue-driven (Rule 11)",
    purpose:
      'Dispatch membership notifications to appropriate channels. Routes to T109 (welcome), T110 (activity), T111 (admin). No HTTP calls — Rule 11.',
    distinctFrom:
      'T103 (join notification — T108 dispatches; T103 is specifically join notifications)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['notification_dispatch'],
      events: ['notification.dispatched'],
      apiRoutes: [],
    },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

/** T109 — WelcomeMessageSender [PROCESSING]. */
export function createT109Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T109',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'WelcomeMessageSender',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by NotificationDispatched from T108',
    purpose:
      'Send welcome message to new member. Store message record BEFORE emitting WelcomeSent (DNA-8).',
    distinctFrom: 'T108 (dispatcher — T109 sends the welcome; T108 routes)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['welcome_message'],
      events: ['welcome.message.sent'],
      apiRoutes: [],
    },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: ['Welcome message template (FREEDOM: flow06_welcome_message_template)'],
  });
}

/** T110 — GroupActivityNotifier [OBSERVABILITY]. */
export function createT110Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T110',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'GroupActivityNotifier',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('MembershipActivated')",
    purpose:
      'Notify existing group members of new member join. Pure observer. Queue-driven only (Rule 11).',
    distinctFrom: 'T109 (welcome to new member — T110 notifies existing members)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['group_activity_notification'], events: [], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

/** T111 — AdminNotificationSender [OBSERVABILITY]. */
export function createT111Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T111',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'AdminNotificationSender',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('MembershipActivated')",
    purpose: 'Notify group admins of new PUBLIC member join. Queue-driven — no HTTP (Rule 11).',
    distinctFrom: 'T103 (join-specific — T111 notifies admins; T103 is a broader notification)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['admin_notification'], events: [], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T112–T115: SUBFLOW-06P (Approval) ─────────────────────────────────────

/**
 * T112 — ApprovalRequestSender [PROCESSING].
 * SUBFLOW-06P entry. DNA-8 — store ApprovalRequest BEFORE emitting.
 */
export function createT112Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T112',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'ApprovalRequestSender',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: "@EventPattern('MembershipPendingApproval') — SUBFLOW-06P entry",
    purpose:
      'Send approval request notification to group admins. Store ApprovalRequest record BEFORE emitting ApprovalNotificationSent (DNA-8). T114 follows after admin approval decision.',
    distinctFrom: 'T114 (access grant — T112 requests; T114 records the grant)',
    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['approval_request'],
      events: ['approval.notification.sent'],
      apiRoutes: [],
    },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: ['Approval timeout (FREEDOM: flow06_approval_timeout_hours)'],
  });
}

/** T113 — ApprovalStatusTracker [PROCESSING]. */
export function createT113Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T113',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'ApprovalStatusTracker',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by ApprovalNotificationSent from T112',
    purpose:
      'Track approval workflow status. Update membership record with approvalRequestedAt. Handles approval timeout via FREEDOM config.',
    distinctFrom: 'T112 (sends request — T113 tracks status)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['approval_status'],
      events: ['approval.status.tracked'],
      apiRoutes: [],
    },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: ['Approval timeout (FREEDOM: flow06_approval_timeout_hours)'],
  });
}

/**
 * T114 — AccessGrantedRecorder [PROCESSING].
 *
 * PURPOSE: Records AccessGranted audit event BEFORE T115 stores ACTIVE membership.
 *          The AccessGranted record is the audit evidence for the approval.
 *
 * IR-114-1: storeDocument(AccessGranted) BEFORE T115 writes ACTIVE status
 */
export function createT114Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T114',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'AccessGrantedRecorder',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by admin approval decision event',
    purpose:
      'Record AccessGranted audit event. storeDocument(AccessGranted) BEFORE T115 updates membership to ACTIVE. The access grant record must exist as audit evidence before ACTIVE status is written.',
    distinctFrom: 'T115 (finalizer — T114 creates audit record; T115 activates membership)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-06',
        description: 'AccessGranted stored BEFORE ACTIVE membership — audit ordering',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['access_granted_record'],
      events: ['access.granted'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-114-1: storeDocument(AccessGranted) BEFORE T115 writes status=ACTIVE — audit evidence first',
    ],

    machineComponents: [
      'Audit ordering: AccessGranted stored before ACTIVE membership status (DNA-8 within SUBFLOW-06P)',
    ],
    freedomComponents: [],
  });
}

/**
 * T115 — MembershipFinalizer [ORCHESTRATION].
 *
 * PURPOSE: Finalizes PRIVATE group membership after approval chain completes.
 *          Updates membership status PENDING → ACTIVE.
 *          DNA-8: updateDocument BEFORE emitting MembershipActivated.
 */
export function createT115Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T115',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'MembershipFinalizer',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by AccessGranted event from T114',
    purpose:
      'Finalize PRIVATE group membership after approval. Update membership status PENDING → ACTIVE. storeDocument(update) BEFORE emitting MembershipActivated (DNA-8). MembershipActivated triggers Branch B (T104 feed seeding).',
    distinctFrom:
      'T101 (PUBLIC activator — T115 finalizes PRIVATE path after approval; T101 handles PUBLIC path)',

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

    qualityGates: FLOW06_QUALITY_GATES_CORE,

    bfaRegistration: {
      entities: ['membership_finalization'],
      events: ['membership.activated'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-115-1: DNA-8 — updateDocument(ACTIVE) BEFORE emitting MembershipActivated',
    ],

    machineComponents: [
      'Outbox: membership updated to ACTIVE before MembershipActivated emitted (DNA-8)',
    ],
    freedomComponents: [],
  });
}

// ── T116–T118: Tier Change Subflows ───────────────────────────────────────

/**
 * T116 — TierUpgradeProcessor [PROCESSING].
 *
 * PURPOSE: Handles tier upgrades via conditional update — NOT SETNX.
 *          SETNX would no-op on existing records — tier never changes.
 *
 * IR-116-1: updateDocument — NOT setnxDocument for tier changes
 */
export function createT116Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T116',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'TierUpgradeProcessor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by subscription.upgraded CloudEvent',
    purpose:
      'Process membership tier upgrade. Use updateDocument (conditional) on existing (userId, groupId) membership record — NOT setnxDocument. Store tier history record BEFORE emitting TierUpgraded (DNA-8).',
    distinctFrom: 'T117 (downgrade — T116 upgrades; same conditional update pattern)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-07',
        description: 'updateDocument (not setnxDocument) for tier changes',
        severity: 'error' as const,
        checkType: 'conditional_update',
      },
    ],

    bfaRegistration: {
      entities: ['tier_upgrade_record'],
      events: ['tier.upgraded'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-116-1: updateDocument on existing membership record — NEVER setnxDocument for tier changes',
    ],

    machineComponents: [
      'Conditional update: updateDocument on (userId, groupId) — not setnxDocument',
    ],
    freedomComponents: [],
  });
}

/** T117 — TierDowngradeProcessor [PROCESSING]. Conditional update — same pattern as T116. */
export function createT117Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T117',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'TierDowngradeProcessor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by subscription.downgraded CloudEvent',
    purpose:
      'Process membership tier downgrade. Use updateDocument (conditional) on existing (userId, groupId) membership record. Store tier history record BEFORE emitting TierDowngraded (DNA-8).',
    distinctFrom: 'T116 (upgrade — T117 downgrades; same conditional update pattern)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW06_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F06-08',
        description: 'updateDocument (not setnxDocument) for tier changes',
        severity: 'error' as const,
        checkType: 'conditional_update',
      },
    ],

    bfaRegistration: {
      entities: ['tier_downgrade_record'],
      events: ['tier.downgraded'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW06_IRON_RULES_CORE,
      'IR-117-1: updateDocument on existing membership record — NEVER setnxDocument for tier changes',
    ],

    machineComponents: [
      'Conditional update: updateDocument on (userId, groupId) — not setnxDocument',
    ],
    freedomComponents: [],
  });
}

/** T118 — TierChangeAnalytics [OBSERVABILITY]. Pure queue consumer. */
export function createT118Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T118',
    flowId: 'FLOW-06',
    flowName: 'Membership & Group Feed',
    name: 'TierChangeAnalytics',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry:
      "@EventPattern('TierUpgraded') | @EventPattern('TierDowngraded') — pure queue consumer (Rule 11)",
    purpose:
      'Record tier change analytics. Pure observer — no HTTP endpoint (Rule 11). Stores analytics in xiigen-tier-change-analytics.',
    distinctFrom: 'T116/T117 (processors — T118 records analytics only)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW06_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['tier_change_analytics_record'], events: [], apiRoutes: [] },
    ironRules: FLOW06_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}
