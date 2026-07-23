/**
 * FLOW-07: Friend Request & Social Feed
 * Task types: T73–T82 (10 task types)
 * Families: 25–28 (Wave 2)
 * BFA rules: CF-803–CF-812
 * Factories: F234–F243
 * Wave: 2 (parallel)
 *
 * Architectural notes (MASTER-PLAN-v4):
 *   T81 PrivacyGatekeeper — INLINE_ONLY (no @EventPattern — called synchronously by T73/T76/T78)
 *   T75 — bidirectional atomic graph write (both edges in one ORM transaction)
 *   T77 — score=0 is valid; items pass through to T78 for delivery decision
 *   T80 — full recompute from graph on every invocation (never delta)
 *   T76/T78 — both must invoke T81 independently (two-phase privacy)
 *
 * DNA compliance:
 *   DNA-2: all queries use Record<string, unknown>
 *   DNA-3: all methods return DataProcessResult
 *   DNA-8: storeDocument() BEFORE enqueue()
 */

// ── T73 — FriendRequestProcessor ─────────────────────────────────────────────

export const T73_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T73',
  name: 'FriendRequestProcessor',
  family: 25,
  flowId: 'FLOW-07',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Processes incoming friend requests. Validates sender/receiver eligibility, ' +
    'invokes T81 PrivacyGatekeeper synchronously (inline), stores request record, ' +
    'emits FriendRequestSent CloudEvent.',
  requiredFactories: ['F234', 'F235', 'F236'],
  inlineServices: ['T81'],
  bfaRules: ['CF-803', 'CF-804'],
  ironRules: [
    'IR-1: T81 must be called BEFORE storeDocument — privacy gate is first',
    'IR-2: storeDocument BEFORE enqueue (DNA-8)',
    'IR-3: connectionId = hash(sorted([userIdA, userIdB]) + tenantId)',
  ],
  ragPatterns: ['privacy-gatekeeper-inline-invocation', 'bidirectional-atomic-graph-write'],
  prompt_assembly_spec: {
    genesisVersion: 'v1',
    reviewVersion: 'v3',
    sections: ['iron-rules', 'event-schema', 'factory-map'],
  },
};

// ── T74 — FriendRequestResponder ──────────────────────────────────────────────

export const T74_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T74',
  name: 'FriendRequestResponder',
  family: 25,
  flowId: 'FLOW-07',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Handles accept/decline of a friend request. On accept: triggers T75 (connection graph write). ' +
    'On decline: stores decline record, emits FriendRequestDeclined. ' +
    'Idempotent — duplicate accept/decline returns existing state.',
  requiredFactories: ['F234', 'F235', 'F237'],
  bfaRules: ['CF-803', 'CF-805'],
  ironRules: [
    'IR-1: storeDocument BEFORE enqueue (DNA-8)',
    'IR-2: duplicate accept returns DataProcessResult.success with existing connection',
  ],
  ragPatterns: ['idempotent-state-transition'],
};

// ── T75 — ConnectionGraphWriter ───────────────────────────────────────────────

export const T75_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T75',
  name: 'ConnectionGraphWriter',
  family: 25,
  flowId: 'FLOW-07',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Writes bidirectional connection graph edges atomically. ' +
    'Both A→B and B→A adjacency entries in ONE ORM transaction. ' +
    'connectionId = hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent. ' +
    'Partial write (crash before B→A) is BUILD_FAILURE.',
  requiredFactories: ['F235', 'F238'],
  bfaRules: ['CF-806'],
  ironRules: [
    'IR-1: BOTH adjacency edges in ONE atomic transaction — no two-step write',
    'IR-2: connectionId is direction-independent hash(sorted([a,b]) + tenantId)',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['bidirectional-atomic-graph-write'],
  atomicGraphWrite: {
    required: true,
    edgeDirections: ['A→B', 'B→A'],
    idempotencyKey: 'hash(sorted([userIdA, userIdB]) + tenantId)',
  },
};

// ── T76 — FeedItemGenerator ───────────────────────────────────────────────────

export const T76_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T76',
  name: 'FeedItemGenerator',
  family: 26,
  flowId: 'FLOW-07',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description:
    'Generates feed items from social graph activity. ' +
    'MUST invoke T81 PrivacyGatekeeper BEFORE emitting FeedItemGenerated. ' +
    'Two-phase privacy: T76 checks at generation, T78 checks again at delivery.',
  requiredFactories: ['F235', 'F236', 'F239'],
  inlineServices: ['T81'],
  bfaRules: ['CF-807', 'CF-808'],
  ironRules: [
    'IR-1: T81 must be invoked BEFORE FeedItemGenerated is emitted',
    'IR-2: storeDocument BEFORE enqueue (DNA-8)',
    'IR-3: T78 skipping T81 because "T76 already checked" = BUILD_FAILURE',
  ],
  ragPatterns: ['privacy-gatekeeper-inline-invocation', 'two-phase-privacy-gate'],
};

// ── T77 — FeedScorer ──────────────────────────────────────────────────────────

export const T77_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T77',
  name: 'FeedScorer',
  family: 26,
  flowId: 'FLOW-07',
  archetype: 'ai_generation',
  version: 'v1',
  executionModel: 'async',
  description:
    'Scores feed items for personalization relevance. ' +
    'score=0 is VALID — means lowest relevance, item still passes through. ' +
    'T77 MUST NOT filter items on score. T78 decides what to do. ' +
    'Filtering on score in T77 = BUILD_FAILURE.',
  requiredFactories: ['F235', 'F239', 'F240'],
  bfaRules: ['CF-807'],
  ironRules: [
    'IR-1: score=0 items PASS THROUGH — do not filter, do not defer',
    'IR-2: scoring weights from FREEDOM config only — no hardcoded constants',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['zero-score-passthrough', 'freedom-config-weights'],
  scorePassthrough: {
    required: true,
    zeroScoreIsValid: true,
    filterOnScore: false,
  },
};

// ── T78 — FeedDeliveryOrchestrator ────────────────────────────────────────────

export const T78_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T78',
  name: 'FeedDeliveryOrchestrator',
  family: 26,
  flowId: 'FLOW-07',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Delivers scored feed items to recipients. ' +
    'MUST invoke T81 PrivacyGatekeeper again independently — privacy settings can change ' +
    'between generation (T76) and delivery (T78). ' +
    'Applies two-phase gate schema for delivery decisions.',
  requiredFactories: ['F235', 'F236', 'F239'],
  inlineServices: ['T81'],
  bfaRules: ['CF-807', 'CF-808', 'CF-809'],
  ironRules: [
    'IR-1: T81 MUST run independently regardless of T76 privacy check result',
    'IR-2: twoPhaseGate — generation pass + delivery pass both required',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['privacy-gatekeeper-inline-invocation', 'two-phase-privacy-gate'],
  twoPhaseGate: {
    phase1: 'generation',
    phase2: 'delivery',
    phase2SkipForbidden: true,
  },
};

// ── T79 — SocialNotificationDispatcher ───────────────────────────────────────

export const T79_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T79',
  name: 'SocialNotificationDispatcher',
  family: 27,
  flowId: 'FLOW-07',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Dispatches social notifications (friend requests, feed activity, connection updates). ' +
    'Consent-gated: only dispatches if recipient has notification consent. ' +
    'Notification preferences from FREEDOM config.',
  requiredFactories: ['F235', 'F236', 'F241'],
  bfaRules: ['CF-810'],
  ironRules: [
    'IR-1: check notification consent BEFORE dispatching',
    'IR-2: storeDocument BEFORE enqueue (DNA-8)',
    'IR-3: notification preferences from FREEDOM config only',
  ],
  ragPatterns: ['consent-gated-notification'],
};

// ── T80 — MutualConnectionCounter ────────────────────────────────────────────

export const T80_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T80',
  name: 'MutualConnectionCounter',
  family: 27,
  flowId: 'FLOW-07',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Counts mutual connections between two users. ' +
    'MUST perform full recompute from graph — never delta increment/decrement. ' +
    'Delta counting drifts under retries. Idempotent by design.',
  requiredFactories: ['F238', 'F242'],
  bfaRules: ['CF-811'],
  ironRules: [
    'IR-1: full recompute from graph — delta (++/--) is BUILD_FAILURE',
    'IR-2: idempotent — same inputs always produce same count',
    'IR-3: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['full-recompute-pattern'],
  fullRecompute: {
    required: true,
    deltaForbidden: true,
    idempotentByDesign: true,
  },
};

// ── T81 — PrivacyGatekeeper (INLINE_ONLY) ─────────────────────────────────────

export const T81_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T81',
  name: 'PrivacyGatekeeper',
  family: 27,
  flowId: 'FLOW-07',
  archetype: 'guard',
  version: 'v1',
  executionModel: 'INLINE_ONLY',
  description:
    'Privacy enforcement gate — called synchronously by T73, T76, T78. ' +
    'INLINE_ONLY: no @EventPattern, no @MessagePattern, pure @Injectable(). ' +
    'Injected directly into callers, not consumed from queue. ' +
    'Engine must NOT generate queue decorators on T81.',
  requiredFactories: ['F241', 'F243'],
  bfaRules: ['CF-812'],
  ironRules: [
    'IR-1: INLINE_ONLY — no @EventPattern or @MessagePattern (BUILD_FAILURE if generated)',
    'IR-2: T73/T76/T78 MUST call via direct injection, not via queue',
    'IR-3: privacy settings read from DATABASE FABRIC — never cached locally',
  ],
  ragPatterns: ['inline-only-service-injection'],
  entryType: 'INLINE_ONLY',
  executorSkipRule: 'skip-queue-consumer-generation',
};

// ── T82 — SocialGraphAnalytics ────────────────────────────────────────────────

export const T82_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T82',
  name: 'SocialGraphAnalytics',
  family: 28,
  flowId: 'FLOW-07',
  archetype: 'data_pipeline',
  version: 'v1',
  executionModel: 'async',
  description:
    'Emits social graph analytics events (connection growth, feed engagement). ' +
    'Aggregate-only: counters only, no per-user identifiers in payloads. ' +
    'storeDocument BEFORE enqueue (DNA-8).',
  requiredFactories: ['F238', 'F242'],
  bfaRules: ['CF-811', 'CF-812'],
  ironRules: [
    'IR-1: no per-user identifiers in analytics payloads — aggregate counts only',
    'IR-2: storeDocument BEFORE enqueue (DNA-8)',
  ],
  ragPatterns: ['aggregate-only-analytics'],
};

/** All FLOW-07 contracts as an array for bootstrapper registration. */
export const FLOW_07_CONTRACTS: Record<string, unknown>[] = [
  T73_CONTRACT,
  T74_CONTRACT,
  T75_CONTRACT,
  T76_CONTRACT,
  T77_CONTRACT,
  T78_CONTRACT,
  T79_CONTRACT,
  T80_CONTRACT,
  T81_CONTRACT,
  T82_CONTRACT,
];
