/**
 * Profile Enrichment & Matching — Engine Contracts (FLOW-02)
 *
 * Business purpose: Enriches user profiles with external data sources (GitHub, portfolio,
 * skills) and matches users to relevant projects based on confidence scoring. Broadcasts
 * onboarding completion to community channels. Runs after FLOW-01 UserOnboardingCompleted.
 *
 * T50: ProfileEnrichmentFanIn        [fan_in]     — parallel GitHub+portfolio+skills enrichment
 * T51: MatchingConvergenceGate       [convergence] — skill-to-project matching, confidence >= 0.80
 * T52: OnboardingCompletionBroadcast [broadcast]   — announce to community channels, consent-gated
 *
 * Artifact numbers: T50–T52, F1508–F1515, CF-796–CF-801 (verify present before using)
 * Family: 206
 * Wave: 1 (sequential after FLOW-01; parallel_wave: null)
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract, ArbiterPanelConfig } from './contract-schema';
import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Named Checks ──────────────────────────────────────────────────────────────

/**
 * T51 named check: convergence_threshold_from_freedom_config
 *
 * SILENT_FAILURE guard (SK-441 L3): hardcoded confidence thresholds prevent
 * business users from tuning matching precision at runtime. Score-0 on violation
 * even if code compiles and tests pass — this is exactly the SILENT_FAILURE scenario.
 *
 * PASS: confidence threshold read from FREEDOM config (freedomConfig, FREEDOM_KEYS, config.get)
 * FAIL: hardcoded numeric confidence threshold (0.8, 0.75, etc.) without any config read
 */
export const NAMED_CHECK_CONVERGENCE_THRESHOLD = {
  name: 'convergence_threshold_from_freedom_config',
  severity: 'score-0',
  category: 'machine-constant-guard',
  check: (code: string): boolean => {
    // PASS: confidence threshold read from FREEDOM config
    // FAIL: hardcoded numeric confidence threshold (0.8, 0.75, etc.) without config read
    const hardcodedThresholdPattern = /(?:confidence|threshold|score)\s*[><=!]+\s*0\.[0-9]+/;
    const freedomConfigPattern = /freedomConfig|FREEDOM_KEYS|config\.get\s*\(/;
    const hasHardcoded = hardcodedThresholdPattern.test(code);
    const hasFreedomRead = freedomConfigPattern.test(code);
    return !hasHardcoded || hasFreedomRead;
  },
  teachingPoint:
    'Confidence thresholds (0.80, 0.75) are FREEDOM config — business users tune matching precision. Never hardcode. Use: freedomConfig.get("matching.confidenceThreshold", 0.80)',
};

// ── Per-task-type stack coupling ────────────────────────────────────────────

/** T50 ProfileEnrichmentFanIn — IMPL_VARIES (allSettled fan-in pattern) */
const T50_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE', 'SERVER_ASYNC_MODEL'],
      neutralConcepts: [
        'Fan-in: all enrichment branches must complete before convergence (DNA-8)',
        'Partial failure tolerance: one branch failing must not block others (FAIL_OPEN per branch)',
        'No PII in enrichment events (IR-1)',
        'DNA-8: store enrichment result before emitting EnrichmentCompleted',
        'Atomic set-if-not-exists idempotency: IScopedMemoryService.setIfAbsent()',
      ],
      implementationNotes:
        'Promise.allSettled() for parallel branches. Each branch stores result before next step. NestJS @Injectable() extending MicroserviceBase.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['fan-in completion tracking', 'idempotency key for enrichment run'],
      implementationNotes:
        'Key: {tenantId}:enrich:{userId}. TTL from FREEDOM config. All stacks access via DATABASE FABRIC.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['mock allSettled partial failure', 'mock F1508/F1509 to throw'],
      implementationNotes:
        'Verify EnrichmentCompleted emits even when one branch rejects. Promise.allSettled guarantees continuation.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

/** T51 MatchingConvergenceGate — IMPL_VARIES (convergence threshold from FREEDOM config) */
const T51_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Confidence threshold from FREEDOM config (CF-796)',
        'No hardcoded numeric thresholds (score-0 violation)',
        'Degraded terminal: below min_confidence emits MatchingDeferred — NOT failure',
        'DNA-8: persist match result before emitting MatchingConverged',
      ],
      implementationNotes:
        'NestJS @Injectable() extending MicroserviceBase. Confidence threshold via freedomConfig.get("matching.confidenceThreshold", 0.80). Degraded path via freedomConfig.get("matching.minConfidence", 0.50).',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['match result caching', 'idempotency for matching run'],
      implementationNotes: 'Key: {tenantId}:match:{userId}. All stacks access via DATABASE FABRIC.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['mock FREEDOM config for threshold', 'test degraded path (low confidence)'],
      implementationNotes:
        'Test convergence at threshold boundary (0.80). Test degraded path (0.50–0.79). Test below min (< 0.50 → MatchingDeferred).',
    },
  },
  supportedServerStacks: ['nestjs'],
};

/** T52 OnboardingCompletionBroadcast — IMPL_VARIES (consent-gated nudge) */
const T52_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'Consent gate: broadcast ONLY to channels user has consented to (CF-801)',
        'Best-effort delivery: broadcast failure must not block upstream (FAIL_OPEN)',
        'DNA-8: store broadcast record before emitting OnboardingBroadcastSent',
        'No PII in community event payloads (IR-1)',
      ],
      implementationNotes:
        'NestJS @Injectable() extending MicroserviceBase. Channel list from FREEDOM config. Consent check via F1514 IUserConsentStore before each channel emit.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['mock consent store', 'mock channel emit failure'],
      implementationNotes:
        'Verify OnboardingBroadcastSent emits even when channel delivery fails. Verify consent-blocked channels are skipped silently.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ────────────────────────────────────────────────────

const PROFILE_ENRICHMENT_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-02-00',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02-01',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-02-02',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02-03',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02-04',
    description: 'storeDocument() BEFORE enqueue() on every transition (DNA-8)',
    severity: 'error' as const,
    checkType: 'outbox_ordering',
  },
];

const PROFILE_ENRICHMENT_IRON_RULES_CORE = [
  'NEVER import database/enrichment SDK directly — use fabric interfaces only (Rule 1)',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() MUST happen BEFORE enqueue() on every state transition (DNA-8)',
  'tenantId is read from AsyncLocalStorage — never passed as parameter',
  'No PII in any queue event payload — userId as reference only',
];

// ── PROFILE_ENRICHMENT — Family-206 ─────────────────────────────────────────

/**
 * T50 — ProfileEnrichmentFanIn [fan_in].
 *
 * PURPOSE: Launch parallel enrichment branches for GitHub profile, portfolio URLs,
 *          and skill assessment. All branches must complete (or fail gracefully)
 *          before convergence. Partial failure is tolerated — FAIL_OPEN per branch.
 *
 * F1508: IGithubProfileFetcher → RAG FABRIC (GitHub profile enrichment)
 * F1509: IPortfolioAnalyzer → RAG FABRIC (portfolio URL analysis)
 * F1510: ISkillAssessor → AI ENGINE FABRIC (AI-driven skill assessment)
 * F1511: IEnrichmentResultStore → DATABASE FABRIC (enrichment result persistence)
 *
 * Service file: profile-enrichment-fan-in.service.ts (SK-430 naming rule)
 */
export function createT50Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T50',
    flowId: 'FLOW-02',
    flowName: 'Profile Enrichment & Matching',
    name: 'ProfileEnrichmentFanIn',
    archetype: 'fan_in' as ContractArchetype,
    entry: 'Triggered by UserOnboardingCompleted event from FLOW-01 T49',
    purpose:
      'Launch parallel enrichment branches (GitHub, portfolio, skills). Use Promise.allSettled() — partial failure is tolerated (FAIL_OPEN per branch). Aggregate enrichment results. Persist aggregate result via F1511. Emit EnrichmentCompleted to trigger T51 MatchingConvergenceGate.',
    distinctFrom:
      'T51 MatchingConvergenceGate (T50 collects raw enrichment data; T51 evaluates matching confidence)',
    familyId: 'Family-206',

    factoryDependencies: [
      {
        factoryId: 'F1508',
        interfaceName: 'IGithubProfileFetcher',
        fabricType: FabricType.RAG,
        providerHint: 'elasticsearch',
        description: 'Fetches GitHub profile data — repositories, languages, contribution graph.',
      },
      {
        factoryId: 'F1509',
        interfaceName: 'IPortfolioAnalyzer',
        fabricType: FabricType.RAG,
        providerHint: 'elasticsearch',
        description: 'Analyzes portfolio URLs — extracts skills, technologies, project types.',
      },
      {
        factoryId: 'F1510',
        interfaceName: 'ISkillAssessor',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'claude',
        description: 'AI-driven skill assessment — infers proficiency levels from enrichment data.',
      },
      {
        factoryId: 'F1511',
        interfaceName: 'IEnrichmentResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Enrichment result persistence — stores aggregated enrichment data per user.',
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
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow02.profile-enrichment-fan-in.genesis' },
      },
    ],

    qualityGates: [
      ...PROFILE_ENRICHMENT_QUALITY_GATES_CORE,
      {
        gateId: 'QG-02-10',
        description: 'Promise.allSettled() used — branch failure does not block others (FAIL_OPEN)',
        severity: 'error' as const,
        checkType: 'fan_in_pattern',
      },
      {
        gateId: 'QG-02-11',
        description: 'Enrichment result stored BEFORE EnrichmentCompleted emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-02-12',
        description: 'Idempotency: duplicate enrichment runs return cached result (CF-796)',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],

    bfaRegistration: {
      entities: ['enrichment_result', 'user_profile'],
      events: ['user.enrichment.completed', 'user.enrichment.branch.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...PROFILE_ENRICHMENT_IRON_RULES_CORE,
      'Promise.allSettled() MUST be used — never Promise.all() (partial failure tolerance)',
      'Each branch result stored individually before aggregate (DNA-8)',
      'EnrichmentCompleted emitted only after ALL branches settle (success or failure)',
      'Failed branches recorded in enrichment result with failedBranches[] array',
    ],

    machineComponents: [
      'Fan-in branch orchestration (Promise.allSettled)',
      'Branch failure recording',
      'Idempotency lock for enrichment run',
      'Aggregate result assembly',
    ],

    freedomComponents: [
      'flow02_enrichment_github_enabled — enable/disable GitHub enrichment branch (default: true)',
      'flow02_enrichment_portfolio_enabled — enable/disable portfolio enrichment branch (default: true)',
      'flow02_enrichment_ttl_days — enrichment result cache TTL (default: 7)',
    ],
    stackCoupling: T50_STACK_COUPLING,
  });
}

/**
 * T51 — MatchingConvergenceGate [convergence].
 *
 * PURPOSE: Evaluate enriched profile against available projects. Compute confidence
 *          score for each match. Converge when confidence >= threshold (from FREEDOM config).
 *          Degraded terminal: below min_confidence emits MatchingDeferred (not failure).
 *
 * SILENT_FAILURE guard: confidence threshold MUST come from FREEDOM config.
 * Hardcoded numeric thresholds (0.80, 0.75, etc.) are a score-0 violation — they
 * prevent business users from tuning matching precision at runtime.
 *
 * Named check: convergence_threshold_from_freedom_config (see NAMED_CHECK_CONVERGENCE_THRESHOLD)
 *
 * F1511: IEnrichmentResultStore → DATABASE FABRIC
 * F1512: IProjectMatchEngine → AI ENGINE FABRIC (AI-driven match scoring)
 * F1513: IMatchResultStore → DATABASE FABRIC (match result persistence)
 *
 * Service file: matching-convergence-gate.service.ts (SK-430 naming rule)
 */
export function createT51Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T51',
    flowId: 'FLOW-02',
    flowName: 'Profile Enrichment & Matching',
    name: 'MatchingConvergenceGate',
    archetype: 'convergence' as ContractArchetype,
    entry: 'Triggered by EnrichmentCompleted event from T50',
    purpose:
      'Evaluate enriched user profile against available projects. Compute AI-driven match confidence scores. Converge when confidence >= threshold (from FREEDOM config). Emit MatchingConverged on success. Emit MatchingDeferred when confidence < min_confidence (degraded terminal — not failure).',
    distinctFrom: 'T50 ProfileEnrichmentFanIn (T51 scores matches; T50 collects enrichment data)',
    familyId: 'Family-206',

    factoryDependencies: [
      {
        factoryId: 'F1511',
        interfaceName: 'IEnrichmentResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Enrichment result retrieval — reads aggregated enrichment data from T50.',
      },
      {
        factoryId: 'F1512',
        interfaceName: 'IProjectMatchEngine',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'claude',
        description:
          'AI-driven match scoring — computes confidence scores for skill-to-project fit.',
      },
      {
        factoryId: 'F1513',
        interfaceName: 'IMatchResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Match result persistence — stores convergence result and confidence scores.',
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
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow02.matching-convergence-gate.genesis' },
      },
    ],

    qualityGates: [
      ...PROFILE_ENRICHMENT_QUALITY_GATES_CORE,
      {
        gateId: 'QG-02-20',
        description: 'Confidence threshold read from FREEDOM config — never hardcoded (CF-797)',
        severity: 'error' as const,
        checkType: 'machine_constant_guard',
      },
      {
        gateId: 'QG-02-21',
        description:
          'Degraded terminal emits MatchingDeferred — never DataProcessResult.failure (CF-798)',
        severity: 'error' as const,
        checkType: 'degraded_terminal',
      },
      {
        gateId: 'QG-02-22',
        description: 'Match result stored BEFORE MatchingConverged emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-02-23',
        description:
          'No hardcoded numeric confidence values (0.8, 0.75, etc.) — score-0 if found (convergence_threshold_from_freedom_config)',
        severity: 'error' as const,
        checkType: 'machine_constant_guard',
      },
    ],

    bfaRegistration: {
      entities: ['match_result', 'user_profile'],
      events: ['user.matching.converged', 'user.matching.deferred'],
      apiRoutes: [],
    },

    ironRules: [
      ...PROFILE_ENRICHMENT_IRON_RULES_CORE,
      'Confidence threshold MUST come from FREEDOM config — never hardcoded numeric (CF-797)',
      'Below min_confidence → emit MatchingDeferred — NEVER DataProcessResult.failure',
      'Match result stored BEFORE any event emitted (DNA-8)',
      'Confidence scores are MACHINE outputs — do not round or truncate before storing',
    ],

    ironRulesStructured: [
      {
        id: 'IR-T51-1',
        description:
          'Confidence threshold must be read from FREEDOM config, never hardcoded. Check: convergence_threshold_from_freedom_config (score-0 severity, category: machine-constant-guard). Teaching point: freedomConfig.get("matching.confidenceThreshold", 0.80)',
        check: 'convergence_threshold_from_freedom_config',
        parameters: {
          severity: 'score-0',
          category: 'machine-constant-guard',
          teachingPoint:
            'Confidence thresholds (0.80, 0.75) are FREEDOM config — business users tune matching precision. Never hardcode. Use: freedomConfig.get("matching.confidenceThreshold", 0.80)',
        },
      },
    ],

    machineComponents: [
      'Confidence score computation (AI ENGINE FABRIC)',
      'Threshold comparison logic (threshold from FREEDOM config)',
      'Degraded terminal routing (MatchingDeferred path)',
      'Match result assembly and persistence',
    ],

    freedomComponents: [
      'matching.confidenceThreshold — convergence threshold (default: 0.80)',
      'matching.minConfidence — degraded terminal threshold (default: 0.50)',
      'flow02_matching_project_limit — max projects to score per user (default: 20)',
    ],

    arbiterConfig: {
      minPanel: { required: ['business_logic', 'key_principles', 'iron_rules'], quorum: 3 },
      blockSemantics: { blockOnFail: ['key_principles', 'iron_rules'] },
      escalationGate: { minAggregateScore: 0.7, onFail: 'RETRY' },
      evaluatorArbiters: {
        business_logic: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'business logic and domain correctness',
          blind: true,
          isolated: false,
        },
        iron_rules: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'iron rule compliance and constraint enforcement',
          blind: true,
          isolated: false,
        },
        key_principles: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'M1-M5 + P1-P22 + DNA-1..9 full text',
          blind: true,
          isolated: true,
        },
      },
      blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
      undecidedIndex: 'xiigen-training-data-review',
    } as unknown as ArbiterPanelConfig, // CARRY-FORWARD: ISSUE-001 — T51/T52 arbiterConfig uses pre-ArbiterPanelConfig format; deferred to contracts migration session

    stackCoupling: T51_STACK_COUPLING,
  });
}

/**
 * T52 — OnboardingCompletionBroadcast [broadcast].
 *
 * PURPOSE: Announce user onboarding completion to subscribed community channels
 *          (Slack, Discord, community feed, etc.). All channel delivery is consent-gated
 *          and best-effort. Channel delivery failure must not block upstream.
 *
 * F1513: IMatchResultStore → DATABASE FABRIC (read match result for broadcast content)
 * F1514: IUserConsentStore → DATABASE FABRIC (consent gate per channel)
 * F1515: ICommunityChannelBroadcast → QUEUE FABRIC (channel event emission)
 *
 * Service file: onboarding-completion-broadcast.service.ts (SK-430 naming rule)
 */
export function createT52Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T52',
    flowId: 'FLOW-02',
    flowName: 'Profile Enrichment & Matching',
    name: 'OnboardingCompletionBroadcast',
    archetype: 'broadcast' as ContractArchetype,
    entry: 'Triggered by MatchingConverged event from T51',
    purpose:
      'Broadcast onboarding completion to community channels. All delivery is consent-gated (check F1514 before each channel emit) and best-effort (channel failure does not block). Emit OnboardingBroadcastSent after all consented channels attempted.',
    distinctFrom:
      'T51 MatchingConvergenceGate (T52 announces completion; T51 scores project matches)',
    familyId: 'Family-206',

    factoryDependencies: [
      {
        factoryId: 'F1513',
        interfaceName: 'IMatchResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Match result read — provides match data for broadcast content assembly.',
      },
      {
        factoryId: 'F1514',
        interfaceName: 'IUserConsentStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Consent gate — checks per-channel consent before each broadcast emit.',
      },
      {
        factoryId: 'F1515',
        interfaceName: 'ICommunityChannelBroadcast',
        fabricType: FabricType.QUEUE,
        providerHint: 'in-memory',
        description:
          'Community channel broadcast — emits OnboardingAnnounced event to each consented channel.',
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
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow02.onboarding-completion-broadcast.genesis' },
      },
    ],

    qualityGates: [
      ...PROFILE_ENRICHMENT_QUALITY_GATES_CORE,
      {
        gateId: 'QG-02-30',
        description: 'Consent checked per channel BEFORE broadcast emit (CF-801)',
        severity: 'error' as const,
        checkType: 'consent_gate',
      },
      {
        gateId: 'QG-02-31',
        description:
          'Channel delivery is best-effort — failure returns DataProcessResult.success (CF-799)',
        severity: 'error' as const,
        checkType: 'best_effort_observer',
      },
      {
        gateId: 'QG-02-32',
        description: 'Broadcast record stored BEFORE OnboardingBroadcastSent emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-02-33',
        description: 'No PII in broadcast payload — userId and matched project IDs only (CF-800)',
        severity: 'error' as const,
        checkType: 'pii_protection',
      },
    ],

    bfaRegistration: {
      entities: ['broadcast_record', 'user_consent'],
      events: ['user.onboarding.broadcast.sent', 'user.onboarding.announcement.channel.skipped'],
      apiRoutes: [],
    },

    ironRules: [
      ...PROFILE_ENRICHMENT_IRON_RULES_CORE,
      'Consent MUST be checked before each channel broadcast — no unconsented channels (CF-801)',
      'Channel delivery failure MUST return DataProcessResult.success — best-effort observer (CF-799)',
      'Broadcast record stored BEFORE OnboardingBroadcastSent emitted (DNA-8)',
      'No PII in broadcast payload — userId and matched project IDs only (CF-800)',
      'Channel list from FREEDOM config — never hardcoded list of channel names',
    ],

    machineComponents: [
      'Consent gate enforcement (per-channel)',
      'Best-effort delivery loop (try/catch per channel)',
      'Broadcast record assembly',
      'Skipped-channel logging',
    ],

    freedomComponents: [
      'flow02_broadcast_channels_enabled — list of enabled community channels (default: [slack, community-feed])',
      'flow02_broadcast_announcement_template — announcement message template version',
    ],

    arbiterConfig: {
      minPanel: { required: ['business_logic', 'key_principles', 'iron_rules'], quorum: 3 },
      blockSemantics: { blockOnFail: ['key_principles', 'iron_rules'] },
      escalationGate: { minAggregateScore: 0.7, onFail: 'RETRY' },
      evaluatorArbiters: {
        business_logic: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'business logic and domain correctness',
          blind: true,
          isolated: false,
        },
        iron_rules: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'iron rule compliance and constraint enforcement',
          blind: true,
          isolated: false,
        },
        key_principles: {
          modelToken: MODEL_HINT_FROM_FREEDOM,
          expertise: 'M1-M5 + P1-P22 + DNA-1..9 full text',
          blind: true,
          isolated: true,
        },
      },
      blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
      undecidedIndex: 'xiigen-training-data-review',
    } as unknown as ArbiterPanelConfig, // CARRY-FORWARD: ISSUE-001 — T51/T52 arbiterConfig uses pre-ArbiterPanelConfig format; deferred to contracts migration session

    stackCoupling: T52_STACK_COUPLING,
  });
}

// ── Exports ─────────────────────────────────────────────────────────────────

// Domain aliases (SK-430 Rule 2)
export const createProfileEnrichmentFanInContract = createT50Contract;
export const createMatchingConvergenceGateContract = createT51Contract;
export const createOnboardingCompletionBroadcastContract = createT52Contract;

// Domain-grouped barrel (SK-430 Rule 6)
export const PROFILE_ENRICHMENT_MATCHING_CONTRACT_FACTORIES = [
  createT50Contract,
  createT51Contract,
  createT52Contract,
];

// EngineContract instances — tests call .validate() on these
export const PROFILE_ENRICHMENT_MATCHING_CONTRACTS =
  PROFILE_ENRICHMENT_MATCHING_CONTRACT_FACTORIES.map((f) => f());
