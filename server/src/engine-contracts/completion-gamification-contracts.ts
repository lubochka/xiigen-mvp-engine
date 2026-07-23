/**
 * FLOW-05 Engine Contracts — Completion & Gamification
 *
 * T83  CompletionRecorder            archetype: ORCHESTRATION
 * T84  PointsCalculator              archetype: PROCESSING
 * T85  LedgerUpdater                 archetype: PROCESSING
 * T86  LevelUpChecker                archetype: PROCESSING
 * T87  AchievementGate               archetype: PROCESSING
 * T88  MLCurriculumTrigger           archetype: PROCESSING
 * T89  MLAdaptationProcessor         archetype: PROCESSING
 * T90  SocialShareGate               archetype: PROCESSING
 * T91  SocialShareDistributor        archetype: PROCESSING
 * T92  SocialPostCreator             archetype: PROCESSING
 * T93  SocialFeedUpdater             archetype: PROCESSING
 * T94  SocialNotificationSender      archetype: OBSERVABILITY
 * T95  SocialAnalyticsRecorder       archetype: OBSERVABILITY
 * T96  StreakManager                 archetype: PROCESSING
 * T97  GamificationAnalytics         archetype: OBSERVABILITY
 * T98  LearningFlowCompleted         archetype: ORCHESTRATION
 *
 * Named checks:
 *   gamification::server-side-points   — T84 input has no earnedPoints field (CF-05-1)
 *   gamification::timezone-streak      — T96 uses userTimezoneOffset (CF-05-2)
 *   gamification::privacy-gate-entry   — T91 triggers on SocialShareApproved (CF-05-3)
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: validate() returns DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared quality gates ───────────────────────────────────────────────────

const FLOW05_QUALITY_GATES_CORE = [
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

const FLOW05_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T83 — CompletionRecorder ───────────────────────────────────────────────

/**
 * T83 — CompletionRecorder [ORCHESTRATION].
 *
 * PURPOSE: Records questionnaire completion idempotently.
 *          SETNX on (questionnaireId, userId) — duplicate submissions return existing record.
 *          Stores completion record (PRIVATE scope) before emitting QuestionnaireAnswered.
 *
 * IR-83-1: SETNX on (questionnaireId, userId) — idempotent completion
 * IR-83-2: DNA-8 — store completion record BEFORE emitting QuestionnaireAnswered
 */
export function createT83Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T83',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'CompletionRecorder',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by questionnaire.submitted CloudEvent',
    purpose:
      'Record questionnaire completion idempotently. SETNX on (questionnaireId, userId). Store completion record (PRIVATE scope) BEFORE emitting QuestionnaireAnswered. Orchestrate fan-out to Branch A (gamification sync), B (ML async), C (social async).',
    distinctFrom:
      'T84 (points calculation — T83 records completion; T84 computes points from the stored result)',

    factoryDependencies: [
      {
        factoryId: 'F05-01',
        interfaceName: 'ICompletionStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'SETNX completion record on (questionnaireId, userId)',
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
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-01',
        description: 'SETNX on (questionnaireId, userId) — idempotent completion',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],

    bfaRegistration: {
      entities: ['questionnaire_completion'],
      events: ['questionnaire.answered', 'completion.recorded'],
      apiRoutes: ['/api/dynamic/questionnaire-completions'],
    },

    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-83-1: SETNX on (questionnaireId, userId) — return existing on duplicate',
      'IR-83-2: DNA-8 — store completion BEFORE emitting QuestionnaireAnswered',
    ],

    machineComponents: [
      'SETNX idempotency key: (questionnaireId, userId)',
      'Completion scope: PRIVATE — not tenant-wide',
      'Outbox: completion stored before QuestionnaireAnswered emitted (DNA-8)',
    ],

    freedomComponents: ['Completion expiry window (FREEDOM: flow05_completion_expiry_days)'],
  });
}

// ── T84 — PointsCalculator ─────────────────────────────────────────────────

/**
 * T84 — PointsCalculator [PROCESSING].
 *
 * PURPOSE: Calculates points server-side from stored questionnaireResult.scorePercent.
 *          earnedPoints field DOES NOT EXIST in input shape (CF-05-1).
 *          Produces pointBreakdown{} object for T85 LedgerUpdater.
 *
 * IR-84-1: NEVER read earnedPoints from input — CF-05-1 BUILD_FAILURE
 * IR-84-2: Read questionnaireResult.scorePercent from DB
 * IR-84-3: Output pointBreakdown{} not a raw number
 */
export function createT84Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T84',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'PointsCalculator',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by QuestionnaireAnswered event from T83',
    purpose:
      'Calculate gamification points server-side. Read questionnaireResult.scorePercent from xiigen-questionnaire-results. Apply FREEDOM formula (flow05_points_formula key). Produce pointBreakdown{base, bonus, multiplier, total}. earnedPoints field does not exist in input — CF-05-1.',
    distinctFrom: 'T85 (ledger update — T84 computes points; T85 atomically updates the ledger)',

    factoryDependencies: [
      {
        factoryId: 'F05-02',
        interfaceName: 'IQuestionnaireResultReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Read stored questionnaire result to derive scorePercent',
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
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-02',
        description: 'earnedPoints field absent from input shape (CF-05-1)',
        severity: 'error' as const,
        checkType: 'server_side_calculation',
      },
      {
        gateId: 'QG-F05-03',
        description: 'Output is pointBreakdown{} object, not raw number',
        severity: 'error' as const,
        checkType: 'output_shape',
      },
    ],

    bfaRegistration: {
      entities: ['points_calculation'],
      events: ['points.calculated'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-84-1: earnedPoints MUST NOT exist in input shape — CF-05-1 BUILD_FAILURE',
      'IR-84-2: read questionnaireResult.scorePercent from DB — never trust client score',
      'IR-84-3: output pointBreakdown{base, bonus, multiplier, total} — not a single number',
    ],

    machineComponents: [
      'Input shape: no earnedPoints field (structural exclusion, CF-05-1)',
      'Output shape: pointBreakdown{base, bonus, multiplier, total}',
      'Source: questionnaireResult.scorePercent from xiigen-questionnaire-results',
    ],

    freedomComponents: [
      'Point formula (FREEDOM: flow05_points_formula)',
      'Bonus multiplier thresholds (FREEDOM: flow05_bonus_thresholds)',
    ],

    machineConstants: [
      { key: 'POINTS_INPUT_FIELD_ABSENT', value: 'earnedPoints', neverFromConfig: true },
    ],
  });
}

// ── T85 — LedgerUpdater ────────────────────────────────────────────────────

/**
 * T85 — LedgerUpdater [PROCESSING].
 *
 * PURPOSE: Merges T84 (points) and T96 (streak) outputs into an atomic ledger update.
 *          incrementAndRecord() — atomic increment + record in one DB operation.
 *          DNA-8: store ledger record BEFORE emitting GamificationBatchStored.
 */
export function createT85Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T85',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'LedgerUpdater',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered after T84 (PointsCalculator) and T96 (StreakManager) complete',
    purpose:
      'Atomically update the gamification ledger with points (from T84) and streak data (from T96). Use incrementAndRecord() — one atomic DB operation. Store ledger update record BEFORE emitting GamificationBatchStored (DNA-8).',
    distinctFrom:
      'T84 (computes points — T85 applies them), T96 (computes streak — T85 records it)',

    factoryDependencies: [
      {
        factoryId: 'F05-03',
        interfaceName: 'ILedgerService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Atomic incrementAndRecord() — increment balance + create ledger entry',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-04',
        description: 'incrementAndRecord() is ONE atomic operation',
        severity: 'error' as const,
        checkType: 'atomicity',
      },
    ],

    bfaRegistration: {
      entities: ['gamification_ledger_entry'],
      events: ['gamification.batch.stored'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-85-1: incrementAndRecord() atomic — not read-then-write (race condition at ledger boundary)',
      'IR-85-2: DNA-8 — ledger record stored BEFORE emitting GamificationBatchStored',
    ],

    machineComponents: [
      'incrementAndRecord() atomic DB operation',
      'Outbox: ledger entry stored before GamificationBatchStored emitted (DNA-8)',
    ],

    freedomComponents: [],
  });
}

// ── T86 — LevelUpChecker ──────────────────────────────────────────────────

/** T86 — LevelUpChecker [PROCESSING]. Checks level thresholds from FREEDOM config. */
export function createT86Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T86',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'LevelUpChecker',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by GamificationBatchStored event from T85',
    purpose:
      'Check if updated total points crosses a level threshold (FREEDOM: flow05_level_thresholds). If threshold crossed: store level update record → emit LevelUpDetected. If no threshold crossed: return success with no emission.',
    distinctFrom:
      'T87 (achievement gate — T86 checks level; T87 checks achievement unlock conditions)',
    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['level_record'], events: ['level.up.detected'], apiRoutes: [] },
    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-86-1: level thresholds from FREEDOM key flow05_level_thresholds — never hardcoded',
    ],
    machineComponents: [],
    freedomComponents: ['Level thresholds (FREEDOM: flow05_level_thresholds)'],
  });
}

// ── T87 — AchievementGate ─────────────────────────────────────────────────

/**
 * T87 — AchievementGate [PROCESSING].
 *
 * PURPOSE: Checks whether an achievement has already been unlocked before emitting.
 *          History read BEFORE storeDocument — prevents double unlock.
 *
 * IR-87-1: History read BEFORE any storeDocument — prevents double unlock
 * IR-87-2: DNA-8 — store achievement record BEFORE emitting AchievementUnlocked
 */
export function createT87Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T87',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'AchievementGate',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by GamificationBatchStored event from T85',
    purpose:
      'Gate achievement unlock with history check. Read xiigen-achievements for (userId, achievementId). If exists: return success({alreadyUnlocked:true}). If not: storeDocument(achievement) → emit AchievementUnlocked.',
    distinctFrom:
      'T86 (level check — T87 checks achievement; both trigger on GamificationBatchStored)',
    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],
    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-05',
        description: 'History read before storeDocument — prevents double unlock',
        severity: 'error' as const,
        checkType: 'history_gate',
      },
    ],
    bfaRegistration: {
      entities: ['achievement_record'],
      events: ['achievement.unlocked'],
      apiRoutes: [],
    },
    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-87-1: searchDocuments(xiigen-achievements, {userId, achievementId}) BEFORE any write',
      'IR-87-2: DNA-8 — store achievement record BEFORE emitting AchievementUnlocked',
    ],
    machineComponents: [
      'History read gate: (userId, achievementId) checked before unlock',
      'Outbox: achievement record stored before AchievementUnlocked emitted (DNA-8)',
    ],
    freedomComponents: ['Achievement criteria (FREEDOM: flow05_achievement_criteria)'],
  });
}

// ── T88 — MLCurriculumTrigger ─────────────────────────────────────────────

/** T88 — MLCurriculumTrigger [PROCESSING]. Branch B entry. Async. */
export function createT88Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T88',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'MLCurriculumTrigger',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by QuestionnaireAnswered event — Branch B entry',
    purpose:
      'Initiate ML curriculum adaptation pipeline. Async — does not block Branch A. Store MLAdaptationRequest record → emit MLAdaptationRequested.',
    distinctFrom: 'T89 (ML processor — T88 initiates; T89 applies validated ML output)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['ml_adaptation_request'],
      events: ['ml.adaptation.requested'],
      apiRoutes: [],
    },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T89 — MLAdaptationProcessor ───────────────────────────────────────────

/**
 * T89 — MLAdaptationProcessor [PROCESSING].
 *
 * PURPOSE: Applies ML curriculum recommendations after three mandatory guards:
 *          1. Count ceiling (max modules changed — FREEDOM)
 *          2. Protected modules check (MACHINE — never modify locked modules)
 *          3. Recency cooldown (skip if last adaptation was within threshold)
 *
 * IR-89-1..3: All three guards before any storeDocument call
 */
export function createT89Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T89',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'MLAdaptationProcessor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by MLModelOutputReady event',
    purpose:
      'Apply ML adaptation recommendations with three mandatory guards: (1) count ceiling (flow05_ml_max_changes FREEDOM key), (2) protected modules check (MACHINE — locked modules never modified), (3) recency cooldown (flow05_ml_cooldown_days FREEDOM key). All guards pass → storeDocument(adaptation) → emit MLAdaptationCompleted.',
    distinctFrom: 'T88 (trigger — T89 applies validated output; T88 initiates the request)',
    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],
    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-06',
        description: 'All three ML guards (count, protected, recency) before storeDocument',
        severity: 'error' as const,
        checkType: 'ml_validation',
      },
    ],
    bfaRegistration: {
      entities: ['ml_adaptation_record'],
      events: ['ml.adaptation.completed'],
      apiRoutes: [],
    },
    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-89-1: count ceiling check FIRST (flow05_ml_max_changes) — never unlimited ML changes',
      'IR-89-2: protected modules check SECOND — MACHINE constant list, never from config',
      'IR-89-3: recency cooldown check THIRD (flow05_ml_cooldown_days) — skip if too recent',
    ],
    machineComponents: ['Protected modules list (MACHINE — never ML-modifiable)'],
    freedomComponents: [
      'Max modules changed per adaptation (FREEDOM: flow05_ml_max_changes)',
      'Adaptation cooldown window (FREEDOM: flow05_ml_cooldown_days)',
    ],
  });
}

// ── T90 — SocialShareGate ─────────────────────────────────────────────────

/**
 * T90 — SocialShareGate [PROCESSING].
 *
 * PURPOSE: Branch C entry — structural privacy gate.
 *          Private users: return success({shared:false}) — no emission.
 *          Public: storeDocument → emit SocialShareApproved.
 *          T91 triggers on SocialShareApproved — NOT QuestionnaireAnswered (CF-05-3).
 */
export function createT90Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T90',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialShareGate',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by QuestionnaireAnswered event — Branch C entry (sole)',
    purpose:
      'Privacy gate for social distribution. Read user privacySetting. If private: return DataProcessResult.success({shared:false}) — branch terminates. If public: storeDocument(shareIntent) → emit SocialShareApproved. T91 listens on SocialShareApproved only.',
    distinctFrom: 'T91 (distributor — T90 gates; T91 distributes only after T90 approves)',
    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],
    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-07',
        description: 'T91 listens on SocialShareApproved — not QuestionnaireAnswered (CF-05-3)',
        severity: 'error' as const,
        checkType: 'privacy_gate',
      },
    ],
    bfaRegistration: {
      entities: ['social_share_intent'],
      events: ['social.share.approved'],
      apiRoutes: [],
    },
    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-90-1: private users → success({shared:false}) — NO SocialShareApproved emission',
      'IR-90-2: T91 event pattern is SocialShareApproved — CF-05-3 BUILD_FAILURE otherwise',
    ],
    machineComponents: [
      'Privacy check: privacySetting from user profile — MACHINE gate, not FREEDOM',
    ],
    freedomComponents: [],
  });
}

// ── T91 — SocialShareDistributor ───────────────────────────────────────────

/** T91 — SocialShareDistributor [PROCESSING]. Entry: SocialShareApproved (CF-05-3). */
export function createT91Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T91',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialShareDistributor',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: "@EventPattern('SocialShareApproved') — NEVER QuestionnaireAnswered (CF-05-3)",
    purpose:
      'Distribute completion to social channels. Entry is SocialShareApproved from T90. Routes to T92 (post creation) and T93 (feed update) in parallel.',
    distinctFrom: 'T90 (gate — T91 distributes; T90 approves)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['social_distribution'],
      events: ['social.share.distributed'],
      apiRoutes: [],
    },
    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-91-1: entry event is SocialShareApproved — NEVER QuestionnaireAnswered (CF-05-3)',
    ],
    machineComponents: [
      'Entry event: SocialShareApproved (not QuestionnaireAnswered) — structural privacy gate',
    ],
    freedomComponents: [],
  });
}

// ── T92 — SocialPostCreator ────────────────────────────────────────────────

/** T92 — SocialPostCreator [PROCESSING]. */
export function createT92Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T92',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialPostCreator',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by SocialShareDistributed event from T91',
    purpose:
      'Create social post record in xiigen-social-posts. Store post BEFORE emitting SocialPostCreated (DNA-8).',
    distinctFrom: 'T93 (feed updater — T92 creates post; T93 updates feeds)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['social_post'], events: ['social.post.created'], apiRoutes: [] },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T93 — SocialFeedUpdater ────────────────────────────────────────────────

/** T93 — SocialFeedUpdater [PROCESSING]. */
export function createT93Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T93',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialFeedUpdater',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by SocialPostCreated event from T92',
    purpose:
      'Update follower feeds with the new social post. Batch update via queue — no direct HTTP to feed service (Rule 11).',
    distinctFrom: 'T92 (creates post — T93 propagates to feeds)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['social_feed_entry'],
      events: ['social.feed.updated'],
      apiRoutes: [],
    },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T94 — SocialNotificationSender ────────────────────────────────────────

/** T94 — SocialNotificationSender [OBSERVABILITY]. Queue-driven only. */
export function createT94Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T94',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialNotificationSender',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('SocialFeedUpdated') — queue consumer only (Rule 11)",
    purpose:
      'Send social share notifications to relevant users. Queue-driven only — no HTTP (Rule 11). Store notification record BEFORE emitting.',
    distinctFrom: 'T95 (analytics — T94 sends notifications; T95 records analytics)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: {
      entities: ['social_notification'],
      events: ['social.notification.sent'],
      apiRoutes: [],
    },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T95 — SocialAnalyticsRecorder ─────────────────────────────────────────

/** T95 — SocialAnalyticsRecorder [OBSERVABILITY]. Pure queue consumer. */
export function createT95Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T95',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'SocialAnalyticsRecorder',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('SocialShareApproved') — pure queue consumer, no HTTP endpoint (Rule 11)",
    purpose:
      'Record social share analytics. Pure observer — no HTTP. Stores analytics in xiigen-social-analytics.',
    distinctFrom: 'T94 (notifications — T95 records analytics; T94 sends notifications)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['social_analytics_record'], events: [], apiRoutes: [] },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T96 — StreakManager ────────────────────────────────────────────────────

/**
 * T96 — StreakManager [PROCESSING].
 *
 * PURPOSE: Computes streak in learner's local timezone (CF-05-2).
 *          Requires userTimezoneOffset (minutes). Computes localDate = utcNow + offset.
 *
 * IR-96-1: userTimezoneOffset required — absence = BUILD_FAILURE (CF-05-2)
 * IR-96-2: localDate computed from offset — never UTC midnight
 */
export function createT96Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T96',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'StreakManager',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by QuestionnaireAnswered event from T83',
    purpose:
      'Compute and update learning streak using learner local timezone. Receive userTimezoneOffset (minutes). Compute localDate = utcNow + offsetMinutes. Compare to last streak record. Extend or reset streak. Store streak update BEFORE emitting StreakUpdated (DNA-8).',
    distinctFrom: 'T85 (ledger — T96 computes streak; T85 merges T96 output into ledger)',

    factoryDependencies: [],
    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
    ],

    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-08',
        description: 'userTimezoneOffset is required field — CF-05-2',
        severity: 'error' as const,
        checkType: 'timezone_aware',
      },
      {
        gateId: 'QG-F05-09',
        description: 'localDate computed from offset — never UTC midnight',
        severity: 'error' as const,
        checkType: 'timezone_aware',
      },
    ],

    bfaRegistration: {
      entities: ['streak_record'],
      events: ['streak.updated'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-96-1: userTimezoneOffset (minutes) is required — CF-05-2 BUILD_FAILURE if absent',
      'IR-96-2: localDate = Math.floor((utcMs + offsetMin * 60000) / 86400000) — never toISOString().slice(0,10)',
    ],

    machineComponents: [
      'Streak boundary: local midnight (utcNow + userTimezoneOffset) — never UTC midnight',
      'Outbox: streak record stored before StreakUpdated emitted (DNA-8)',
    ],

    freedomComponents: ['Streak grace window (FREEDOM: flow05_streak_grace_hours)'],

    machineConstants: [{ key: 'STREAK_BOUNDARY', value: 'LOCAL_TIMEZONE', neverFromConfig: true }],
  });
}

// ── T97 — GamificationAnalytics ───────────────────────────────────────────

/** T97 — GamificationAnalytics [OBSERVABILITY]. Pure queue consumer. */
export function createT97Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T97',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'GamificationAnalytics',
    archetype: ContractArchetype.OBSERVABILITY,
    version: '1.0.0',
    entry: "@EventPattern('GamificationBatchStored') — pure queue consumer (Rule 11)",
    purpose:
      'Record gamification analytics event. Pure observer — no HTTP. Stores analytics in xiigen-gamification-analytics.',
    distinctFrom: 'T98 (completion gate — T97 records analytics; T98 emits LearningFlowCompleted)',
    factoryDependencies: [],
    afStations: [{ stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} }],
    qualityGates: FLOW05_QUALITY_GATES_CORE,
    bfaRegistration: { entities: ['gamification_analytics_record'], events: [], apiRoutes: [] },
    ironRules: FLOW05_IRON_RULES_CORE,
    machineComponents: [],
    freedomComponents: [],
  });
}

// ── T98 — LearningFlowCompleted ────────────────────────────────────────────

/**
 * T98 — LearningFlowCompleted [ORCHESTRATION].
 *
 * PURPOSE: Emits LearningFlowCompleted after Branch A completes (GamificationBatchStored).
 *          Gates on Branch A ONLY — Branches B and C are time-decoupled.
 *
 * IR-98-1: Trigger is GamificationBatchStored — never ML or Social completion events
 * IR-98-2: DNA-8 — store summary BEFORE emitting LearningFlowCompleted
 */
export function createT98Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T98',
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'LearningFlowCompleted',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by GamificationBatchStored event from T85 — Branch A gate only',
    purpose:
      'Emit LearningFlowCompleted after Branch A (gamification) completes. Branch B (ML) and Branch C (social) are async and time-decoupled. Waiting for B or C violates the <1s UX SLA. Store completion summary BEFORE emitting LearningFlowCompleted (DNA-8).',
    distinctFrom: 'T83 (entry — T98 is the completion gate; T83 is the entry orchestrator)',

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

    qualityGates: [
      ...FLOW05_QUALITY_GATES_CORE,
      {
        gateId: 'QG-F05-10',
        description: 'Trigger on GamificationBatchStored (Branch A) only — not B or C',
        severity: 'error' as const,
        checkType: 'branch_gate',
      },
    ],

    bfaRegistration: {
      entities: ['learning_flow_completion'],
      events: ['learning.flow.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW05_IRON_RULES_CORE,
      'IR-98-1: entry event is GamificationBatchStored — NEVER MLAdaptationCompleted or SocialDistributionCompleted',
      'IR-98-2: DNA-8 — store LearningFlowCompletedRecord BEFORE emitting LearningFlowCompleted',
    ],

    machineComponents: [
      'Completion gate: Branch A only (GamificationBatchStored)',
      'Branches B and C are time-decoupled — no wire to T98',
      'Outbox: completion summary stored before LearningFlowCompleted emitted (DNA-8)',
    ],

    freedomComponents: [],

    machineConstants: [
      { key: 'COMPLETION_GATE_BRANCH', value: 'BRANCH_A_ONLY', neverFromConfig: true },
    ],
  });
}
