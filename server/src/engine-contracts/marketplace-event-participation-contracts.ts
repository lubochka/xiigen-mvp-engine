/**
 * FLOW-08: Event Participation & Purchase History
 * Task types: T67-T72
 * T67: ParticipationBootstrapOrchestrator
 * T68: EventInvitationBroadcaster
 * T69: RegistrationProcessor
 * T70: PurchaseHistoryRecorder
 * T71: PurchaseOverlapAnalyzer
 * T72: ParticipationAnalyticsTracker
 * BFA rules: CF-08-1 through CF-08-4 (see flow-08-bfa-rules.ts if it exists)
 *
 * Key patterns:
 *   T67: ParticipationBootstrapCompleted gates on batch queuing only — T68/T69/T70 time-decoupled
 *   T68: Inline visibility check before any write (PRIVACY_GATEKEEPER_INLINE_INVOCATION)
 *   T68: Atomic capacity decrement + registration write (DR-04-A)
 *   T71: Full recompute of purchase overlap — never delta (FULL_RECOMPUTE_PATTERN)
 *   T72: OBSERVABILITY — try/catch wraps all, returns success on error
 *
 * DNA compliance:
 *   DNA-2: all queries use Record<string, unknown>
 *   DNA-3: all methods return DataProcessResult
 *   DNA-8: storeDocument() BEFORE enqueue() throughout
 */

// ── T67 — ParticipationBootstrapOrchestrator ──────────────────────────────────

export const T67_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T67',
  name: 'ParticipationBootstrapOrchestrator',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'ORCHESTRATION',
  version: 'v1',
  executionModel: 'async',
  description:
    'Bootstraps event participation by batching invitation dispatch. ' +
    'ParticipationBootstrapCompleted gates on batch queuing completion (<1s) — NOT on T68/T69/T70 delivery. ' +
    'T68/T69/T70 are time-decoupled from bootstrap. ' +
    'Inherited from DR-03-B: completion event gates on orchestration step only, not full downstream delivery.',
  ironRules: [
    'IR-1: ParticipationBootstrapCompleted emitted when batch queuing completes — NOT when T68/T69/T70 delivery finishes (BUILD_FAILURE if waits for downstream)',
    'IR-2: T68/T69/T70 are time-decoupled — ParticipationBootstrapCompleted fires in <1s regardless of invitation fanout volume',
    'IR-3: storeDocument BEFORE ParticipationBootstrapCompleted enqueue (DNA-8)',
    'IR-4: Batch size from FREEDOM config — no hardcoded invitation batch limit',
  ],
  ragPatterns: [
    'dr-03-b-completion-gates-on-orchestration',
    'plan-flow07-friend-request-social-feed',
  ],
  completionEventPolicy: {
    gatesOn: 'batch_queuing_complete',
    doesNotWaitFor: ['T68', 'T69', 'T70'],
    rationale: 'DR-03-B inherited: completion event must not block on downstream async delivery',
  },
  bfaRules: ['CF-08-1'],
};

// ── T68 — EventInvitationBroadcaster ─────────────────────────────────────────

export const T68_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T68',
  name: 'EventInvitationBroadcaster',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'ORCHESTRATION',
  version: 'v1',
  executionModel: 'async',
  description:
    'Broadcasts event invitations with inline visibility check and atomic capacity management. ' +
    'Inline privacy/visibility check BEFORE any write — inherited from PRIVACY_GATEKEEPER_INLINE_INVOCATION (T81 pattern). ' +
    'Atomic capacity decrement + invitation write — inherited from DR-04-A (T63 pattern). ' +
    'Visibility check is synchronous constructor injection — no queue-driven privacy event.',
  ironRules: [
    'IR-1: Inline visibility/privacy check BEFORE storeDocument or InvitationSent emit — queue-driven check = BUILD_FAILURE (PRIVACY_GATEKEEPER_INLINE_INVOCATION inherited)',
    'IR-2: Atomic capacity decrement + invitation write in ONE operation — separate check-then-write creates oversell race (DR-04-A inherited from T63)',
    'IR-3: capacity null means unlimited — use strict null check, not falsy check',
    'IR-4: storeDocument BEFORE InvitationSent enqueue (DNA-8)',
    'IR-5: Idempotency on invitationId — duplicate InvitationRequested events return existing (SETNX)',
  ],
  ragPatterns: ['privacy-gatekeeper-inline-invocation', 'dr-04-a-atomic-capacity-decrement'],
  atomicCapacityPolicy: {
    required: true,
    operation: 'decrementAndCreate',
    violationClass: 'BUILD_FAILURE',
  },
  bfaRules: ['CF-08-2'],
};

// ── T69 — RegistrationProcessor ──────────────────────────────────────────────

export const T69_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T69',
  name: 'RegistrationProcessor',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'ROUTING',
  version: 'v1',
  executionModel: 'async',
  description:
    'Processes event RSVP and registration submissions. ' +
    'Validates registration eligibility before write. ' +
    'SETNX idempotency on (eventId + userId) — duplicate RSVPs return existing. ' +
    'Registration status transitions: PENDING → CONFIRMED | WAITLISTED.',
  ironRules: [
    'IR-1: SETNX idempotency on (eventId + userId) — duplicate RegistrationReceived events return existing registration record',
    'IR-2: Registration eligibility check before storeDocument — blocked users return DataProcessResult.success({ status: "BLOCKED" }), not failure',
    'IR-3: storeDocument BEFORE RegistrationConfirmed or RegistrationWaitlisted enqueue (DNA-8)',
    'IR-4: Status transition PENDING → CONFIRMED | WAITLISTED — status from capacity check, not request payload',
  ],
  ragPatterns: ['setnx-idempotency', 'store-before-enqueue'],
  bfaRules: ['CF-08-2'],
};

// ── T70 — PurchaseHistoryRecorder ─────────────────────────────────────────────

export const T70_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T70',
  name: 'PurchaseHistoryRecorder',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'DATA_PIPELINE',
  version: 'v1',
  executionModel: 'async',
  description:
    'Records event purchase history in xiigen-purchase-history index. ' +
    'Schema must be queryable by FLOW-07 T76 FeedItemGenerator for purchase-based feed personalisation. ' +
    'PRIVATE scope per-tenant. ' +
    'Purchase record shape: { purchaseId, userId, eventId, eventType, tenantId, purchasedAt, amount }.',
  ironRules: [
    'IR-1: Store in xiigen-purchase-history with schema queryable by FLOW-07 T76 — userId + eventType + tenantId fields required',
    'IR-2: knowledgeScope PRIVATE — purchase history is per-tenant, never GLOBAL',
    'IR-3: SETNX idempotency on purchaseId — duplicate PurchaseCompleted events return existing record',
    'IR-4: storeDocument BEFORE PurchaseHistoryRecorded enqueue (DNA-8)',
    'IR-5: amount is aggregate only — no line-item breakdown in stored record (data-retention policy)',
  ],
  crossFlowDependency: {
    consumedBy: 'FLOW-07 T76',
    indexName: 'xiigen-purchase-history',
    requiredFields: ['userId', 'eventId', 'eventType', 'tenantId', 'purchasedAt'],
  },
  bfaRules: ['CF-08-3'],
};

// ── T71 (alias T_PURCHASE_OVERLAP) — PurchaseOverlapAnalyzer ──────────────────

export const T71_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T71',
  name: 'PurchaseOverlapAnalyzer',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'DATA_PIPELINE',
  version: 'v1',
  executionModel: 'async',
  description:
    'Analyzes purchase history overlap between two users. ' +
    'Full recompute from purchase history intersection on every invocation — NEVER delta. ' +
    'Inherited from FULL_RECOMPUTE_PATTERN (T80 pattern): idempotent by algorithm, retry-safe. ' +
    'Output: overlapCount (number only) — no list of shared purchase IDs.',
  ironRules: [
    'IR-1: Full recompute from xiigen-purchase-history intersection on every invocation — NEVER read stored overlapCount and increment/decrement (DR-07-E inherited)',
    'IR-2: Output is overlapCount (number) only — no array of shared eventIds or purchaseIds (data retention violation)',
    'IR-3: Idempotent by algorithm — same purchase histories always produce same count regardless of retry count',
    'IR-4: storeDocument BEFORE PurchaseOverlapAnalyzed enqueue (DNA-8)',
  ],
  ragPatterns: ['full-recompute-pattern'],
  inheritedPattern: {
    source: 'FULL_RECOMPUTE_PATTERN (T80 MutualConnectionCounter)',
    rationale:
      'DR-07-E: full recompute from purchase history intersection — same idempotency guarantee as graph intersection in T80',
  },
  bfaRules: ['CF-08-3'],
};

// ── T119 — ParticipationAnalyticsTracker (T_PARTICIPATE_ANALYT) ──────────────

export const T119_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T119',
  name: 'ParticipationAnalyticsTracker',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'OBSERVABILITY',
  version: 'v1',
  executionModel: 'async',
  description:
    'Tracks participation analytics — OBSERVABILITY pattern. ' +
    'Entire handler body in try/catch. Returns DataProcessResult.success({ tracked: false }) on error. ' +
    'Never returns failure — analytics tracking must not block or fail the event participation pipeline. ' +
    'Aggregate counters only — no per-user participation data in stored records.',
  ironRules: [
    'IR-1: Entire handler body in try/catch — catch block returns DataProcessResult.success({ tracked: false }) (OBSERVABILITY pattern, BUILD_FAILURE if returns failure)',
    'IR-2: Analytics records are aggregate only — no per-user IDs, no per-user participation history (data-retention)',
    'IR-3: storeDocument BEFORE ParticipationTracked enqueue (DNA-8) — if storeDocument throws, catch handles it',
    'IR-4: TTL-windowed counters — unbounded counters are not allowed (FREEDOM config TTL)',
  ],
  observabilityPolicy: {
    errorBehavior: 'DataProcessResult.success({ tracked: false })',
    neverReturnsFailure: true,
    tryCatchRequired: true,
  },
  ragPatterns: ['best-effort-try-catch-observability'],
  bfaRules: ['CF-08-4'],
};

// ── T120 — BootstrapGate (T_BOOTSTRAP_GATE) ───────────────────────────────────

export const T120_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T120',
  name: 'BootstrapGate',
  family: 'event-participation',
  flowId: 'FLOW-08',
  archetype: 'ORCHESTRATION',
  version: 'v1',
  executionModel: 'async',
  description:
    'Tracks batch acknowledgement count and emits ParticipationBootstrapCompleted when all batches acked. ' +
    'Counter stored in DATABASE FABRIC — NOT in scoped memory (R2/CF-08-3). ' +
    'SETNX on gate record key prevents double-completion.',
  ironRules: [
    'IR-1: Batch-ack counter stored in DATABASE FABRIC — in-memory map or SCOPED_MEMORY = BUILD_FAILURE (R2/CF-08-3)',
    'IR-2: ParticipationBootstrapCompleted emitted only when ackedBatches === totalBatches',
    'IR-3: SETNX on gate record key — duplicate completion event must be idempotent',
    'IR-4: storeDocument of gate record BEFORE ParticipationBootstrapCompleted emit (DNA-8)',
    'IR-5: knowledgeScope PRIVATE on gate records',
  ],
  ragPatterns: ['database-fabric-counter', 'setnx-idempotency'],
  bfaRules: ['CF-08-4'],
};
