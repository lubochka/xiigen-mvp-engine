import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-25 Engine Contracts — BFA Cross-Flow Governance & Impact Analysis.
 * T375–T388 — 14 task types across 6 archetypes.
 *
 * T375: ChangeIntakeParser      [INGESTION]       — parse + normalize + persist raw BFA change requests
 * T376: DependencyIndexQuery    [IMPACT_ANALYSIS] — ES query for direct + transitive deps per tenant
 * T377: StaticConflictDetector  [IMPACT_ANALYSIS] — rule-based CF clash detection (CF-473–CF-479)
 * T378: SemanticImpactAnalyzer  [IMPACT_ANALYSIS] — AI advisory impact scoring (multi-model)
 * T379: SeverityAggregator      [IMPACT_ANALYSIS] — merge static + AI results → final severity
 * T380: BlastRadiusCalculator   [BLAST_RADIUS]    — transitive graph traversal, cycle-safe
 * T381: ArbitrationStateMachine [ARBITRATION]     — 8-state FSM, persist-before-emit on every tx
 * T382: ImpactReportGenerator   [SYNTHESIS]       — assemble Web/CLI/Chat conflict report
 * T383: HumanResolutionCapture  [ARBITRATION]     — setIfAbsent idempotent decision capture + FORCE_PROCEED guard
 * T384: ResolutionApplier       [ARBITRATION]     — 4-path resolution execution
 * T385: DecisionAuditTrail      [GOVERNANCE]      — insert-only audit, dual log for FORCE_PROCEED
 * T386: MultiTenantIsolationGate[GOVERNANCE]      — BFA config gate, unscoped query blocker
 * T387: CrossTenantConflictGuard[GOVERNANCE]      — aggregated cross-tenant analytics (no per-tenant rows)
 * T388: AnalyticsEmitter        [GOVERNANCE]      — async fire-and-forget BFA analytics
 *
 * Families: 147 (INGESTION), 148 (IMPACT_ANALYSIS), 149 (BLAST_RADIUS),
 *           150 (ARBITRATION), 151 (SYNTHESIS), 152 (GOVERNANCE)
 * Factories: F1028–F1062
 * CF rules:  CF-473–CF-501
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

/**
 * All FLOW-25 (BFA Conflict Arbitration) task types are CONCEPT_NEUTRAL engine internals.
 * portingCandidate: false — XIIGen infrastructure only, not user application flows.
 * The iron rules apply identically on any stack. Only the DI/async syntax differs,
 * but these services are only generated for node-nestjs.
 */
const BFA_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>. Use DATABASE FABRIC for queries with build_search_filter.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ───────────────────────────────────────────────────

const BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE = [
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
];

const BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

// ── INGESTION — Family-147 ─────────────────────────────────────────────────

/**
 * T375 — ChangeIntakeParser [INGESTION].
 *
 * PURPOSE: Accepts a raw BFA change request (PR diff, schema migration, API contract change),
 *          validates it against CF-473 (4 valid change_types), content-addresses the diff blob,
 *          and stores it insert-only before emitting the parsed-change event.
 *
 * F1028: IChangeIntakeStore → DATABASE FABRIC  (insert-only change document writer)
 * F1029: IChangeEventEmitter → QUEUE FABRIC    (parsed-change CloudEvent publisher)
 *
 * IR-375-1: storeDocument() BEFORE enqueue() (DNA-8)
 * IR-375-2: diff_blob_ref = sha256 content hash
 * IR-375-3: actor validated against auth context from MicroserviceBase
 */
export function createT375Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T375',
    name: 'ChangeIntakeParser',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered by BFA gateway on PR merge / schema migration / API contract change',
    purpose:
      'Parse and normalize raw change requests into canonical ChangeDocument; validate change_type (CF-473); content-address diff blob; persist insert-only before emitting parsed-change event',
    distinctFrom: 'T376 (dependency query — T375 ingests, T376 resolves dependencies)',
    familyId: 'Family-147',

    factoryDependencies: [
      {
        factoryId: 'F1028',
        interfaceName: 'IChangeIntakeStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Insert-only change document writer — stores ChangeDocument with sha256 diff blob ref',
      },
      {
        factoryId: 'F1029',
        interfaceName: 'IChangeEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description:
          'CloudEvent publisher for parsed-change — emitted AFTER successful storeDocument()',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T375', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['ingestion', 'dna_compliance', 'outbox_pattern'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'ingestion::immutability',
            'ingestion::schema-validation',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() called BEFORE enqueue() (IR-375-1, DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'change_type validated against CF-473 enum (4 valid values)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'diff_blob_ref is sha256 content hash (IR-375-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['change_document', 'diff_blob'],
      events: ['change.parsed', 'change.rejected'],
      apiRoutes: ['/api/bfa/intake'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern (IR-375-1)',
      'change_type MUST be one of 4 CF-473 values — hardcoded enum, NOT free-form string',
      'diff_blob_ref MUST be sha256 content hash of the diff — NOT a mutable pointer (IR-375-2)',
      'actor MUST be validated against auth context from MicroserviceBase (IR-375-3)',
      'Duplicate intake (same sha256) MUST return existing record — idempotent no-op',
    ],

    machineComponents: [
      'change_type enum enforcement (CF-473)',
      'sha256 blob ref generation',
      'Insert-only write guard',
      'Outbox ordering (store then enqueue)',
    ],
    freedomComponents: [
      'Max diff blob size limit',
      'Accepted change_type list (subset of CF-473 values)',
      'Event topic name',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

// ── IMPACT_ANALYSIS — Family-148 ──────────────────────────────────────────

/**
 * T376 — DependencyIndexQuery [IMPACT_ANALYSIS].
 *
 * PURPOSE: Given a parsed ChangeDocument, query ES for all direct and transitive
 *          dependencies that share entity_class or access_type with the changed entity.
 *          EVERY query must include tenantId filter (CF-476, DNA-5).
 *
 * F1030: IDependencyIndexReader → DATABASE FABRIC  (ES dependency graph reader)
 * F1031: IDependencyQueryCache  → DATABASE FABRIC  (Redis short-TTL query cache)
 *
 * IR-376-1: build_search_filter skips empty entity_class / access_type (DNA-2)
 * IR-376-2: empty result set = NONE severity (not an error)
 * IR-376-3: unscoped query → DataProcessResult.failure (never bypass tenant filter)
 */
export function createT376Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T376',
    name: 'DependencyIndexQuery',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after T375 emits parsed-change event',
    purpose:
      'Query ES dependency graph for all direct + transitive dependents of the changed entity; enforce tenant scope on every query; return empty set (NONE severity) when no deps found',
    distinctFrom: 'T377 (static rule conflict detection — T376 resolves deps, T377 checks rules)',
    familyId: 'Family-148',

    factoryDependencies: [
      {
        factoryId: 'F1030',
        interfaceName: 'IDependencyIndexReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'ES dependency graph reader — all queries must include tenantId (CF-476)',
      },
      {
        factoryId: 'F1031',
        interfaceName: 'IDependencyQueryCache',
        fabricType: FabricType.DATABASE,
        providerHint: 'redis',
        description: 'Short-TTL query cache — key must include tenantId prefix',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T376', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['impact_analysis', 'dna_compliance', 'tenant_scope'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'impact_analysis', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'impact_analysis::scope-isolation',
            'impact_analysis::ordering-gate',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'EVERY ES query includes tenantId filter via build_search_filter (CF-476)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'Empty dependency set returns NONE severity — not an error (IR-376-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['dependency_query_result'],
      events: ['dependency.resolved', 'dependency.scope_violation'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'EVERY query MUST include tenantId via build_search_filter — never bypass (CF-476)',
      'build_search_filter MUST skip empty entity_class and access_type fields (IR-376-1, DNA-2)',
      'Empty blast radius candidate set returns NONE severity — NOT an escalation (IR-376-2)',
      'Unscoped query detection MUST return DataProcessResult.failure — never silently pass (IR-376-3)',
    ],

    machineComponents: [
      'build_search_filter with auto-skip empty fields (DNA-2)',
      'Tenant scope enforcement (CF-476)',
      'NONE severity for empty result',
    ],
    freedomComponents: [
      'Cache TTL (seconds)',
      'Max dependency depth for initial query',
      'ES index name for dependency graph',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T377 — StaticConflictDetector [IMPACT_ANALYSIS].
 *
 * PURPOSE: Run rule-based CF conflict checks against resolved dependencies.
 *          Each TRUE_CONFLICT must cite the specific CF rule that triggered it.
 *          MUST complete before T378 (SemanticImpactAnalyzer) starts — static is authoritative.
 *
 * F1032: IConflictRuleStore → DATABASE FABRIC  (CF rule definition reader)
 * F1033: IConflictResultStore → DATABASE FABRIC (TRUE_CONFLICT result writer)
 *
 * IR-377-1: T377 MUST complete before T378 starts (CF-480)
 * IR-377-2: static CRITICAL result overrides AI advisory — always
 * IR-377-3: every TRUE_CONFLICT cites specific CF rule (CF-479)
 */
export function createT377Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T377',
    name: 'StaticConflictDetector',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after T376 resolves dependency list',
    purpose:
      'Apply CF rule set to resolved dependencies; detect TRUE_CONFLICT cases; cite specific CF rule per conflict; complete before T378 starts (static takes precedence over AI)',
    distinctFrom: 'T378 (AI semantic analysis — T377 is authoritative static, T378 is advisory)',
    familyId: 'Family-148',

    factoryDependencies: [
      {
        factoryId: 'F1032',
        interfaceName: 'IConflictRuleStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'CF rule definition reader — reads CF-473 through CF-501 rule definitions',
      },
      {
        factoryId: 'F1033',
        interfaceName: 'IConflictResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'TRUE_CONFLICT result writer — persists detected conflicts with CF rule citations',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T377', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['conflict_detection', 'cf_rules', 'impact_analysis'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'impact_analysis', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'impact_analysis::scope-isolation',
            'impact_analysis::ordering-gate',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Every TRUE_CONFLICT cites specific CF rule (IR-377-3, CF-479)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Static CRITICAL overrides AI advisory result (IR-377-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['conflict_result', 'cf_rule_match'],
      events: ['conflict.detected', 'conflict.clear'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'T377 MUST complete BEFORE T378 starts — static detection is authoritative (IR-377-1, CF-480)',
      'static CRITICAL result overrides AI advisory regardless of AI severity (IR-377-2, IR-378-2)',
      'EVERY TRUE_CONFLICT MUST cite the specific CF rule that triggered it (IR-377-3, CF-479)',
      'AI HIGH/CRITICAL without evidence_links MUST be downgraded to LOW (CF-481)',
    ],

    machineComponents: [
      'CF rule application loop',
      'CF rule citation enforcement (CF-479)',
      'Static-over-AI precedence (IR-377-2)',
    ],
    freedomComponents: [
      'Active CF rule set (which CF rules to enforce)',
      'Conflict severity thresholds',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T378 — SemanticImpactAnalyzer [IMPACT_ANALYSIS].
 *
 * PURPOSE: AI-advisory semantic analysis — runs AFTER T377.
 *          Uses AiDispatcher (multi-model) to score semantic impact.
 *          AI result is advisory: static CRITICAL always wins.
 *          AI HIGH/CRITICAL without evidence_links is downgraded to LOW.
 *
 * F1034: ISemanticAnalysisRunner → AI_ENGINE FABRIC (AiDispatcher multi-model)
 * F1035: ISemanticResultStore    → DATABASE FABRIC  (advisory result writer)
 * F1036: IEvidenceLinkResolver   → DATABASE FABRIC  (validates evidence_links refer to real docs)
 *
 * IR-378-1: runs AFTER T377 (static) completes (CF-480)
 * IR-378-2: AI is advisory — static CRITICAL always takes precedence
 */
export function createT378Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T378',
    name: 'SemanticImpactAnalyzer',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after T377 (StaticConflictDetector) completes',
    purpose:
      'AI-advisory semantic impact scoring via AiDispatcher (multi-model); evidence_links required for HIGH/CRITICAL; advisory result fed to T379 alongside T377 static result',
    distinctFrom: 'T377 (authoritative static — T378 is advisory AI only)',
    familyId: 'Family-148',

    factoryDependencies: [
      {
        factoryId: 'F1034',
        interfaceName: 'ISemanticAnalysisRunner',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'anthropic',
        description: 'AiDispatcher multi-model runner — never import AI SDK directly',
      },
      {
        factoryId: 'F1035',
        interfaceName: 'ISemanticResultStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Advisory semantic result writer — marked as advisory in stored document',
      },
      {
        factoryId: 'F1036',
        interfaceName: 'IEvidenceLinkResolver',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Validates evidence_links reference real ES document IDs (IR-382-3)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T378', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['semantic_analysis', 'ai_advisory', 'impact_analysis'],
        },
      },
      {
        stationId: 'AF-5',
        role: 'multi_model',
        config: { models: [MODEL_HINT_FROM_FREEDOM], aggregation: 'best_score', keepAll: true },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'impact_analysis', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'impact_analysis::scope-isolation',
            'impact_analysis::ordering-gate',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'AI HIGH/CRITICAL without evidence_links downgraded to LOW (CF-481)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'NEVER import AI SDK directly — use IAiProvider via AI_ENGINE FABRIC',
        severity: 'error' as const,
        checkType: 'fabric_usage',
      },
    ],

    bfaRegistration: {
      entities: ['semantic_result', 'evidence_link'],
      events: ['semantic_analysis.completed', 'semantic_analysis.downgraded'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'NEVER import AI SDK directly — use IAiProvider via AI_ENGINE FABRIC',
      'AI result is ADVISORY — static CRITICAL from T377 always takes precedence (IR-378-2)',
      'AI HIGH/CRITICAL result WITHOUT evidence_links MUST be downgraded to LOW (CF-481)',
      'T378 MUST run AFTER T377 completes (IR-378-1, CF-480)',
    ],

    machineComponents: [
      'Evidence link validation',
      'Advisory downgrade logic (CF-481)',
      'Static precedence check',
    ],
    freedomComponents: [
      'AI models to use for semantic analysis',
      'Evidence link minimum count for HIGH',
      'Advisory score weight',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T379 — SeverityAggregator [IMPACT_ANALYSIS].
 *
 * PURPOSE: Merge static (T377) and AI advisory (T378) results into a single
 *          final ConflictReport with severity level.
 *          Static CRITICAL always wins. AI is advisory only.
 *
 * F1037: IConflictReportStore → DATABASE FABRIC  (final ConflictReport writer)
 * F1038: ISeverityConfigReader → DATABASE FABRIC (FREEDOM severity thresholds)
 */
export function createT379Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T379',
    name: 'SeverityAggregator',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after both T377 and T378 complete',
    purpose:
      'Merge static conflict detection + AI advisory results into a final ConflictReport; static CRITICAL always wins; emit conflict.severity.resolved event for T380',
    distinctFrom: 'T377 (static detection), T378 (AI advisory) — T379 aggregates both',
    familyId: 'Family-148',

    factoryDependencies: [
      {
        factoryId: 'F1037',
        interfaceName: 'IConflictReportStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Final ConflictReport writer — stores merged severity result before emitting',
      },
      {
        factoryId: 'F1038',
        interfaceName: 'ISeverityConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM config reader for severity thresholds — never hardcode thresholds',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T379', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['aggregation', 'severity_scoring', 'impact_analysis'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'impact_analysis', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'impact_analysis::scope-isolation',
            'impact_analysis::ordering-gate',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'ConflictReport stored BEFORE severity event emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'Severity thresholds from FREEDOM config — not hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['conflict_report'],
      events: ['conflict.severity.resolved'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'ConflictReport MUST be stored BEFORE severity event is emitted (DNA-8)',
      'Static CRITICAL result ALWAYS overrides AI advisory — no exceptions',
      'Severity thresholds MUST come from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Static-over-AI aggregation logic',
      'Outbox ordering (store then emit)',
      'Conflict report schema enforcement',
    ],
    freedomComponents: [
      'Severity thresholds (CRITICAL/HIGH/LOW bounds)',
      'Aggregation weight for AI advisory',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

// ── BLAST_RADIUS — Family-149 ─────────────────────────────────────────────

/**
 * T380 — BlastRadiusCalculator [BLAST_RADIUS].
 *
 * PURPOSE: Transitive graph traversal from the changed entity outward.
 *          Cycle detection uses visited set — no infinite loops (CF-486).
 *          Max depth from FREEDOM config — never hardcoded (CF-485).
 *
 * F1039: IDependencyGraphReader → DATABASE FABRIC (transitive dep graph reader)
 * F1040: IBlastRadiusStore     → DATABASE FABRIC (blast radius report writer)
 * F1041: IDepthConfigReader    → DATABASE FABRIC (FREEDOM max_depth config)
 *
 * IR-380-1: circular dependency = log + continue, NOT throw
 * IR-380-2: blast radius report attached to ConflictReport before assembly
 */
export function createT380Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T380',
    name: 'BlastRadiusCalculator',
    archetype: ContractArchetype.BLAST_RADIUS,
    entry: 'Triggered after T379 emits conflict.severity.resolved event',
    purpose:
      'Traverse dependency graph transitively; detect cycles (visited set, log+continue, no throw); respect FREEDOM max_depth; report direct_impacts, transitive_impacts, max_hop_reached',
    distinctFrom: 'T376 (direct dep query — T380 does full transitive traversal)',
    familyId: 'Family-149',

    factoryDependencies: [
      {
        factoryId: 'F1039',
        interfaceName: 'IDependencyGraphReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Transitive dependency graph reader — all queries tenant-scoped (CF-476)',
      },
      {
        factoryId: 'F1040',
        interfaceName: 'IBlastRadiusStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Blast radius report writer — stored before attached to ConflictReport (DNA-8)',
      },
      {
        factoryId: 'F1041',
        interfaceName: 'IDepthConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM max_depth config reader — traversal depth limit (CF-485)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T380', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['graph_traversal', 'blast_radius', 'cycle_detection'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'blast_radius', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'blast_radius::graph-traversal',
            'blast_radius::report-completeness',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Cycle detection uses visited set — no infinite loops (CF-486)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Max hop depth from FREEDOM config — never hardcoded int (CF-485)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'Circular dep = log + continue, NOT throw (IR-380-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-08',
        description: 'Report includes direct_impacts, transitive_impacts, max_hop_reached',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['blast_radius_report'],
      events: ['blast_radius.calculated', 'blast_radius.cycle_detected'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Cycle detection MUST use visited set — infinite loop is a build failure (CF-486)',
      'Traversal depth MUST stop at FREEDOM config max_depth — never a hardcoded integer (CF-485)',
      'Circular dependency MUST be logged + traversal continues — NOT throw (IR-380-1)',
      'Blast radius report MUST be stored BEFORE attaching to ConflictReport (IR-380-2, DNA-8)',
      'Empty result (no transitive impacts) is valid — NOT an error condition',
    ],

    machineComponents: [
      'BFS/DFS traversal with visited set',
      'Cycle detection (log+continue)',
      'FREEDOM max_depth enforcement',
      'Report fields: direct_impacts, transitive_impacts, max_hop_reached',
    ],
    freedomComponents: [
      'Max traversal depth (max_depth)',
      'Tenant graph index name',
      'Cycle detection log level',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

// ── ARBITRATION — Family-150 ──────────────────────────────────────────────

/**
 * T381 — ArbitrationStateMachine [ARBITRATION].
 *
 * PURPOSE: 8-state FSM that orchestrates the BFA arbitration lifecycle.
 *          persist-before-emit on EVERY state transition (DNA-8, CF-487, IR-381-1).
 *          Invalid transitions return DataProcessResult.failure — never throw (IR-381-2).
 *          Timeout scheduled on PENDING_RESOLUTION entry (CF-488).
 *
 * States: IDLE → EXTRACTING → DETECTING → SEVERITY_AGGREGATING →
 *         PENDING_RESOLUTION | SKIP_ARBITRATION →
 *         APPLYING_RESOLUTION → RESOLVED | REJECTED | ERROR
 *
 * F1042: IArbitrationSessionStore → DATABASE FABRIC (session state writer)
 * F1043: IStateTransitionEmitter  → QUEUE FABRIC    (CloudEvent publisher per transition)
 * F1044: IArbitrationConfigReader → DATABASE FABRIC (FREEDOM config: timeout, skip threshold)
 * F1045: ITimeoutScheduler        → QUEUE FABRIC    (delayed timeout event on PENDING_RESOLUTION)
 *
 * CRITICAL: CF-487 / IR-381-1 — persist-before-emit. Score 0 on violation.
 */
export function createT381Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T381',
    name: 'ArbitrationStateMachine',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after T379/T380 build ConflictReport with severity + blast radius',
    purpose:
      'Orchestrate 8-state BFA arbitration FSM; persist-before-emit on every transition; schedule timeout on PENDING_RESOLUTION; route to SKIP_ARBITRATION for LOW severity',
    distinctFrom: 'T383 (human decision capture — T381 manages state, T383 captures decision)',
    familyId: 'Family-150',

    factoryDependencies: [
      {
        factoryId: 'F1042',
        interfaceName: 'IArbitrationSessionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Session state writer — insert-only + update, storeDocument() BEFORE enqueue()',
      },
      {
        factoryId: 'F1043',
        interfaceName: 'IStateTransitionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for state transitions — emitted AFTER storeDocument()',
      },
      {
        factoryId: 'F1044',
        interfaceName: 'IArbitrationConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM config reader: timeout duration, LOW severity skip threshold',
      },
      {
        factoryId: 'F1045',
        interfaceName: 'ITimeoutScheduler',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Delayed timeout event scheduler — triggers on PENDING_RESOLUTION (CF-488)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T381', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['state_machine', 'arbitration', 'outbox_pattern'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 9000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'arbitration::state-machine-integrity',
            'arbitration::decision-validation',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'storeDocument() BEFORE enqueue() on EVERY transition — score 0 on violation (CF-487, IR-381-1)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'All 8 states implemented (IDLE through RESOLVED/REJECTED/ERROR)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'Invalid transitions return DataProcessResult.failure — not throw (IR-381-2)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-08',
        description: 'Timeout scheduled on PENDING_RESOLUTION entry (CF-488)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['arbitration_session'],
      events: [
        'arbitration.state.transitioned',
        'arbitration.timeout.scheduled',
        'arbitration.skip',
      ],
      apiRoutes: ['/api/bfa/sessions/:id/state'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      '⛔ CRITICAL: storeDocument() MUST be called BEFORE enqueue() on EVERY state transition — score 0 on violation (CF-487, IR-381-1)',
      'ALL 8 states MUST be implemented: IDLE→EXTRACTING→DETECTING→SEVERITY_AGGREGATING→PENDING_RESOLUTION|SKIP_ARBITRATION→APPLYING_RESOLUTION→RESOLVED|REJECTED|ERROR',
      'Invalid transitions MUST return DataProcessResult.failure — never throw (IR-381-2)',
      'Timeout MUST be scheduled on every PENDING_RESOLUTION entry (CF-488)',
      'LOW severity MUST route to SKIP_ARBITRATION — not PENDING_RESOLUTION',
    ],

    machineComponents: [
      '8-state FSM with valid transition map',
      'Persist-before-emit on every transition (CF-487)',
      'PENDING_RESOLUTION timeout scheduling (CF-488)',
      'LOW severity auto-skip routing',
    ],
    freedomComponents: [
      'Timeout duration for PENDING_RESOLUTION (CF-488)',
      'LOW severity skip threshold',
      'State history retention period',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T382 — ImpactReportGenerator [SYNTHESIS].
 *
 * PURPOSE: Assemble the human-readable conflict/impact report from ConflictReport + blast radius.
 *          FORCE_PROCEED option hidden unless actor has bfa:override permission (CF-489) — score 0 on violation.
 *          Evidence links validated against real document IDs (IR-382-3).
 *          Report renders in 3 channels: Web, CLI, Chat.
 *
 * F1046: IReportTemplateStore → DATABASE FABRIC (report template reader per channel)
 * F1047: IReportOutputStore   → DATABASE FABRIC (rendered report writer)
 *
 * CRITICAL: CF-489 — FORCE_PROCEED shown without permission check. Score 0.
 */
export function createT382Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T382',
    name: 'ImpactReportGenerator',
    archetype: ContractArchetype.SYNTHESIS,
    entry: 'Triggered when ArbitrationStateMachine enters PENDING_RESOLUTION',
    purpose:
      'Assemble human-readable BFA impact report for Web/CLI/Chat; always include 4 decision options (FORCE_PROCEED hidden unless bfa:override permission); validate evidence links; include severity badge and impacted_flows[]',
    distinctFrom:
      'T381 (state machine), T383 (decision capture) — T382 generates the report humans read',
    familyId: 'Family-151',

    factoryDependencies: [
      {
        factoryId: 'F1046',
        interfaceName: 'IReportTemplateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Report template reader per channel (Web/CLI/Chat)',
      },
      {
        factoryId: 'F1047',
        interfaceName: 'IReportOutputStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Rendered report writer — stored before presenting to actor',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T382', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['report_generation', 'synthesis', 'permission_guard'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'synthesis', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'synthesis::report-safety',
            'synthesis::decision-completeness',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          '⛔ FORCE_PROCEED hidden unless actor has bfa:override permission (CF-489) — score 0 on violation',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Report always includes exactly 4 decision options',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description: 'Evidence links reference real document IDs — not fabricated (IR-382-3)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-08',
        description: 'CRITICAL/HIGH severity: impacted_flows[] has min 1 entry (IR-382-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['impact_report'],
      events: ['impact_report.generated'],
      apiRoutes: ['/api/bfa/sessions/:id/report'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      '⛔ CRITICAL: FORCE_PROCEED option MUST be hidden unless actor has bfa:override permission — score 0 on violation (CF-489, IR-382-2)',
      'Report MUST always include exactly 4 decision options',
      'evidence_links MUST reference real document IDs — never fabricated (IR-382-3)',
      'precedent suggestions shown ONLY when 3+ matching precedents found (CF-490)',
      'CRITICAL/HIGH severity: impacted_flows[] MUST have min 1 entry (IR-382-1)',
      'Report MUST render correctly in all 3 channels: Web, CLI, Chat',
    ],

    machineComponents: [
      'FORCE_PROCEED permission guard (CF-489)',
      'Evidence link validation (IR-382-3)',
      'Precedent threshold enforcement (CF-490)',
      'Multi-channel render',
    ],
    freedomComponents: [
      'Report template per channel',
      'Precedent minimum count threshold (default: 3)',
      'Severity badge style',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T383 — HumanResolutionCapture [ARBITRATION].
 *
 * PURPOSE: Atomic set-if-not-exists idempotent decision capture — duplicate decision returns existing (DNA-7, CF-493).
 *          FORCE_PROCEED requires rationale >= 50 chars (CF-492, IR-383-2).
 *          FORCE_PROCEED requires bfa:override permission re-validated at capture time (IR-383-3).
 *          Decision value must be one of 4 CF-491 options.
 *
 * F1048: IResolutionDecisionStore → DATABASE FABRIC (setIfAbsent decision writer)
 * F1049: IPermissionValidator     → DATABASE FABRIC (bfa:override permission re-validation)
 * F1050: IDecisionEventEmitter    → QUEUE FABRIC    (CloudEvent on captured decision)
 */
export function createT383Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T383',
    name: 'HumanResolutionCapture',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered when human actor submits resolution decision via API',
    purpose:
      'Capture human resolution decision with atomic set-if-not-exists idempotency (IScopedMemoryService.setIfAbsent()); validate decision is one of 4 CF-491 options; enforce FORCE_PROCEED rationale min 50 chars + bfa:override permission re-validation',
    distinctFrom: 'T382 (report generation), T384 (resolution apply) — T383 captures the decision',
    familyId: 'Family-150',

    factoryDependencies: [
      {
        factoryId: 'F1048',
        interfaceName: 'IResolutionDecisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'setIfAbsent decision writer — duplicate session_id returns existing decision (DNA-7, IScopedMemoryService.setIfAbsent())',
      },
      {
        factoryId: 'F1049',
        interfaceName: 'IPermissionValidator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'bfa:override permission re-validator — checked at capture time (IR-383-3)',
      },
      {
        factoryId: 'F1050',
        interfaceName: 'IDecisionEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for decision.captured — emitted after storeDocument()',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T383', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['decision_capture', 'idempotency', 'permission_validation'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'arbitration::state-machine-integrity',
            'arbitration::decision-validation',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'setIfAbsent on session_id prevents duplicate decision (DNA-7, CF-493, IR-383-1) — IScopedMemoryService.setIfAbsent()',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'FORCE_PROCEED requires rationale min 50 chars (CF-492, IR-383-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description:
          'FORCE_PROCEED re-validates bfa:override permission at capture time (IR-383-3)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-08',
        description: 'Decision value is one of 4 CF-491 options',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['resolution_decision'],
      events: ['decision.captured', 'decision.rejected_unauthorized'],
      apiRoutes: ['/api/bfa/sessions/:id/decision'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Atomic set-if-not-exists on session_id — duplicate decision returns existing record idempotently (IR-383-1, DNA-7, CF-493). Mechanism: IScopedMemoryService.setIfAbsent() in Node.js; INSERT IGNORE in MySQL/WordPress; IDistributedCache.GetSetAsync() in .NET',
      'FORCE_PROCEED rationale MUST be >= 50 chars — reject shorter (CF-492, IR-383-2)',
      'bfa:override permission MUST be re-validated at capture time — not only at report render (IR-383-3)',
      'Decision value MUST be one of 4 CF-491 options: REFACTOR_FLOWS, REJECT_CHANGE, COMPAT_MODE, FORCE_PROCEED',
    ],

    machineComponents: [
      'setIfAbsent idempotency (CF-493, IScopedMemoryService)',
      'CF-491 decision enum validation',
      'FORCE_PROCEED rationale length guard (CF-492)',
      'Permission re-validation at capture (IR-383-3)',
    ],
    freedomComponents: [
      'FORCE_PROCEED rationale minimum length (default: 50)',
      'Session timeout before decision expires',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T384 — ResolutionApplier [ARBITRATION].
 *
 * PURPOSE: Execute one of 4 resolution paths based on captured decision.
 *          Each path has specific actions and emits a distinct event.
 *
 * F1051: IResolutionExecutor  → DATABASE FABRIC (writes resolution record)
 * F1052: IFlowRefactorClient  → QUEUE FABRIC    (emits refactor events for REFACTOR_FLOWS path)
 * F1053: ICompatModeActivator → DATABASE FABRIC (activates compatibility mode for COMPAT_MODE path)
 */
export function createT384Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T384',
    name: 'ResolutionApplier',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after T383 captures the human resolution decision',
    purpose:
      'Execute one of 4 resolution paths: REFACTOR_FLOWS (emit refactor events), REJECT_CHANGE (mark change as rejected), COMPAT_MODE (activate compatibility layer), FORCE_PROCEED (override with audit trail)',
    distinctFrom: 'T383 (decision capture — T384 executes the decision)',
    familyId: 'Family-150',

    factoryDependencies: [
      {
        factoryId: 'F1051',
        interfaceName: 'IResolutionExecutor',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Resolution record writer — stores resolution result before emitting events',
      },
      {
        factoryId: 'F1052',
        interfaceName: 'IFlowRefactorClient',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits flow.refactor events for REFACTOR_FLOWS path (after storeDocument)',
      },
      {
        factoryId: 'F1053',
        interfaceName: 'ICompatModeActivator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Activates compatibility mode document for COMPAT_MODE path',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T384', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['resolution_execution', 'arbitration', 'multi_path'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'arbitration::state-machine-integrity',
            'arbitration::decision-validation',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Resolution record stored BEFORE any events emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'All 4 resolution paths implemented (CF-491)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['resolution_execution'],
      events: [
        'resolution.applied',
        'resolution.rejected',
        'resolution.compat_mode.activated',
        'resolution.force_proceeded',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Resolution record MUST be stored BEFORE any downstream events are emitted (DNA-8)',
      'ALL 4 resolution paths MUST be implemented: REFACTOR_FLOWS, REJECT_CHANGE, COMPAT_MODE, FORCE_PROCEED',
      'FORCE_PROCEED path MUST write to both tenant log AND global override log (T385)',
    ],

    machineComponents: [
      '4-path resolution router',
      'Outbox ordering per path (DNA-8)',
      'FORCE_PROCEED dual-log enforcement',
    ],
    freedomComponents: ['Refactor flow event topic', 'Compat mode document TTL'],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

// ── GOVERNANCE — Family-152 ───────────────────────────────────────────────

/**
 * T385 — DecisionAuditTrail [GOVERNANCE].
 *
 * PURPOSE: Insert-only immutable audit records for every arbitration decision.
 *          FORCE_PROCEED written to BOTH tenant log AND global override log (IR-385-2, CF-498).
 *          Audit written BEFORE arbitration session closes (CF-497).
 *          Required fields: session_id, tenant_id, decision, actor, timestamp, rationale, affected_flows[].
 *
 * F1054: IAuditTrailStore    → DATABASE FABRIC (insert-only audit writer, tenant + global)
 * F1055: IAuditConfigReader  → DATABASE FABRIC (FREEDOM audit retention config)
 *
 * IR-385-1: insert-only — no UPDATE or DELETE path
 * IR-385-2: FORCE_PROCEED → both tenant AND global log
 */
export function createT385Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T385',
    name: 'DecisionAuditTrail',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by T384 ResolutionApplier on every decision execution',
    purpose:
      'Write insert-only immutable audit records; FORCE_PROCEED writes to both tenant log and global override log; audit written before session closes; all required fields enforced',
    distinctFrom:
      'T381 (state machine transitions — T385 is the immutable audit record per decision)',
    familyId: 'Family-152',

    factoryDependencies: [
      {
        factoryId: 'F1054',
        interfaceName: 'IAuditTrailStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Insert-only audit writer — no UPDATE/DELETE allowed; dual-index for FORCE_PROCEED',
      },
      {
        factoryId: 'F1055',
        interfaceName: 'IAuditConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM audit retention config reader (retention period, index names)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T385', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['audit_trail', 'immutability', 'governance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'governance::immutable-audit',
            'governance::tenant-safety',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Audit records are INSERT-only — no UPDATE or DELETE path (IR-385-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description:
          'FORCE_PROCEED written to both tenant log AND global override log (IR-385-2, CF-498)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-07',
        description:
          'Required fields present: session_id, tenant_id, decision, actor, timestamp, rationale, affected_flows[] (IR-385-3)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-08',
        description: 'Audit written BEFORE arbitration session closes (CF-497)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['audit_record', 'global_override_log'],
      events: ['audit.written', 'audit.force_proceed_logged'],
      apiRoutes: ['/api/bfa/audit/:sessionId'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Audit records are INSERT-ONLY — no UPDATE or DELETE code path allowed (IR-385-1)',
      'FORCE_PROCEED MUST be written to BOTH tenant audit log AND global override log (IR-385-2, CF-498)',
      'Required audit fields MUST all be present: session_id, tenant_id, decision, actor, timestamp, rationale, affected_flows[] (IR-385-3)',
      'Audit MUST be written BEFORE arbitration session closes (CF-497)',
    ],

    machineComponents: [
      'Insert-only enforcement (no update/delete paths)',
      'FORCE_PROCEED dual-log routing (IR-385-2)',
      'Required field validation (IR-385-3)',
      'Audit-before-close ordering (CF-497)',
    ],
    freedomComponents: ['Audit index names (tenant + global)', 'Audit record retention period'],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T386 — MultiTenantIsolationGate [GOVERNANCE].
 *
 * PURPOSE: BFA does not process tenants without F1065 config (IR-386-1).
 *          Unscoped query detection triggers CRITICAL alert + auto-disable (IR-386-2).
 *
 * F1056: ITenantBfaConfigReader → DATABASE FABRIC (F1065 config reader per tenant)
 * F1057: IIsolationAlertStore  → DATABASE FABRIC (CRITICAL alert writer on scope violation)
 * F1058: ITenantDisableClient  → QUEUE FABRIC    (auto-disable event emitter)
 */
export function createT386Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T386',
    name: 'MultiTenantIsolationGate',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Executed as a gate before any BFA processing begins for a tenant',
    purpose:
      'Verify tenant has F1065 BFA config before processing; detect unscoped queries and trigger CRITICAL alert + auto-disable; platform_admin role validated via MicroserviceBase auth context',
    distinctFrom:
      'T387 (cross-tenant guard — T386 gates per-tenant entry, T387 aggregates cross-tenant)',
    familyId: 'Family-152',

    factoryDependencies: [
      {
        factoryId: 'F1056',
        interfaceName: 'ITenantBfaConfigReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'F1065 BFA config reader — gate blocks unconfigured tenants (IR-386-1)',
      },
      {
        factoryId: 'F1057',
        interfaceName: 'IIsolationAlertStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'CRITICAL alert writer on unscoped query detection (IR-386-2)',
      },
      {
        factoryId: 'F1058',
        interfaceName: 'ITenantDisableClient',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Auto-disable event emitter — triggered after CRITICAL alert is stored',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T386', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['tenant_gate', 'isolation', 'governance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'governance::immutable-audit',
            'governance::tenant-safety',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'Unconfigured tenant (no F1065 config) blocked with DataProcessResult.failure (IR-386-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Unscoped query detection triggers CRITICAL alert + auto-disable (IR-386-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['tenant_bfa_config', 'isolation_alert'],
      events: ['tenant.bfa.blocked', 'tenant.isolation.violation', 'tenant.auto_disabled'],
      apiRoutes: ['/api/bfa/tenant-gate/:tenantId'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'BFA MUST NOT process tenant without F1065 BFA config — return DataProcessResult.failure (IR-386-1)',
      'Unscoped query detection MUST trigger CRITICAL alert + auto-disable event (IR-386-2)',
      'CRITICAL alert MUST be stored BEFORE auto-disable event is emitted (DNA-8)',
      'platform_admin role MUST be validated via MicroserviceBase auth context (IR-387-2)',
    ],

    machineComponents: [
      'F1065 config gate (IR-386-1)',
      'Unscoped query detector (IR-386-2)',
      'CRITICAL alert + auto-disable (store-then-emit)',
    ],
    freedomComponents: [
      'F1065 config index name',
      'Auto-disable delay (grace period)',
      'Alert severity level',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T387 — CrossTenantConflictGuard [GOVERNANCE].
 *
 * PURPOSE: Aggregated cross-tenant analytics — no per-tenant rows exposed (CF-501, IR-387-1).
 *          Only platform_admin role can access (IR-387-2).
 *
 * F1059: ICrossTenantAggregator → DATABASE FABRIC (aggregated-only cross-tenant reader)
 * F1060: ICrossTenantReportStore → DATABASE FABRIC (aggregated report writer)
 */
export function createT387Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T387',
    name: 'CrossTenantConflictGuard',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Invoked by platform_admin for cross-tenant BFA analytics',
    purpose:
      'Produce aggregated cross-tenant conflict analytics; never expose per-tenant rows; platform_admin role required; output is count/rate aggregates only',
    distinctFrom: 'T386 (per-tenant gate — T387 is cross-tenant aggregation for platform admins)',
    familyId: 'Family-152',

    factoryDependencies: [
      {
        factoryId: 'F1059',
        interfaceName: 'ICrossTenantAggregator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Aggregated-only cross-tenant reader — returns counts/rates, never per-tenant rows',
      },
      {
        factoryId: 'F1060',
        interfaceName: 'ICrossTenantReportStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Aggregated cross-tenant report writer (no per-tenant identifiers)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T387', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['cross_tenant', 'aggregation', 'governance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'governance::immutable-audit',
            'governance::tenant-safety',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'Cross-tenant output is aggregated only — no per-tenant rows (CF-501, IR-387-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'platform_admin role validated via MicroserviceBase auth context (IR-387-2)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],

    bfaRegistration: {
      entities: ['cross_tenant_report'],
      events: ['cross_tenant.report.generated'],
      apiRoutes: ['/api/bfa/admin/cross-tenant-analytics'],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Cross-tenant output MUST be aggregated only — NO per-tenant rows in response (CF-501, IR-387-1)',
      'platform_admin role MUST be validated via MicroserviceBase auth context (IR-387-2)',
      'Aggregation queries MUST include global-scope flag — no tenant filter for cross-tenant reads',
    ],

    machineComponents: [
      'Aggregation-only response (no per-tenant identifiers)',
      'platform_admin permission gate (IR-387-2)',
      'Global-scope query with aggregation',
    ],
    freedomComponents: [
      'Aggregation time windows (daily/weekly/monthly)',
      'Cross-tenant report retention',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

/**
 * T388 — AnalyticsEmitter [GOVERNANCE].
 *
 * PURPOSE: Async fire-and-forget BFA analytics emission.
 *          Does NOT block session close (IR-388-1).
 *
 * F1061: IAnalyticsEventStore  → DATABASE FABRIC (analytics event writer)
 * F1062: IAnalyticsQueueClient → QUEUE FABRIC    (async analytics event publisher)
 */
export function createT388Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T388',
    name: 'AnalyticsEmitter',
    archetype: ContractArchetype.GOVERNANCE,
    entry:
      'Triggered on every significant BFA event (conflict detected, decision captured, resolution applied)',
    purpose:
      'Async fire-and-forget analytics emission; does not block session close; store analytics event then emit asynchronously',
    distinctFrom: 'T385 (immutable audit — T388 is analytics only, T385 is compliance audit)',
    familyId: 'Family-152',

    factoryDependencies: [
      {
        factoryId: 'F1061',
        interfaceName: 'IAnalyticsEventStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Analytics event writer — stored before async emit (DNA-8)',
      },
      {
        factoryId: 'F1062',
        interfaceName: 'IAnalyticsQueueClient',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Async analytics event publisher — fire-and-forget, does not block (IR-388-1)',
      },
    ],

    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow25', taskType: 'T388', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['analytics', 'async_emit', 'governance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: [
            'dna',
            'fabric',
            'tenant',
            'xiigen',
            'governance::immutable-audit',
            'governance::tenant-safety',
          ],
        },
      },
    ],

    qualityGates: [
      ...BFA_CONFLICT_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'Analytics emit is async fire-and-forget — does NOT block session close (IR-388-1)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'Analytics event stored BEFORE async emit (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['analytics_event'],
      events: ['analytics.emitted'],
      apiRoutes: [],
    },

    ironRules: [
      ...BFA_CONFLICT_ARBITRATION_IRON_RULES_CORE,
      'Analytics emit MUST be async fire-and-forget — it MUST NOT block session close (IR-388-1)',
      'Analytics event MUST be stored BEFORE async emit (DNA-8)',
      'Analytics emit failure MUST NOT propagate — log error, continue session close',
    ],

    machineComponents: [
      'Async fire-and-forget emit (IR-388-1)',
      'Store-before-emit ordering (DNA-8)',
      'Error isolation (emit failure does not propagate)',
    ],
    freedomComponents: [
      'Analytics event topic name',
      'Analytics index name',
      'Event payload schema version',
    ],
    stackCoupling: BFA_STACK_COUPLING,
  });
}

// ── Aggregated exports ─────────────────────────────────────────────────────

/** All 14 FLOW-25 contracts as an array. */
export const BFA_CONFLICT_ARBITRATION_CONTRACTS = [
  createT375Contract(),
  createT376Contract(),
  createT377Contract(),
  createT378Contract(),
  createT379Contract(),
  createT380Contract(),
  createT381Contract(),
  createT382Contract(),
  createT383Contract(),
  createT384Contract(),
  createT385Contract(),
  createT386Contract(),
  createT387Contract(),
  createT388Contract(),
] as const;

/** INGESTION contracts only. */
export const BFA_CONFLICT_ARBITRATION_INGESTION_CONTRACTS = [createT375Contract()] as const;
/** IMPACT_ANALYSIS contracts only. */
export const BFA_CONFLICT_ARBITRATION_IMPACT_ANALYSIS_CONTRACTS = [
  createT376Contract(),
  createT377Contract(),
  createT378Contract(),
  createT379Contract(),
] as const;
/** BLAST_RADIUS contracts only. */
export const BFA_CONFLICT_ARBITRATION_BLAST_RADIUS_CONTRACTS = [createT380Contract()] as const;
/** ARBITRATION contracts only. */
export const BFA_CONFLICT_ARBITRATION_ARBITRATION_CONTRACTS = [
  createT381Contract(),
  createT383Contract(),
  createT384Contract(),
] as const;
/** SYNTHESIS contracts only. */
export const BFA_CONFLICT_ARBITRATION_SYNTHESIS_CONTRACTS = [createT382Contract()] as const;
/** GOVERNANCE contracts only. */
export const BFA_CONFLICT_ARBITRATION_GOVERNANCE_CONTRACTS = [
  createT385Contract(),
  createT386Contract(),
  createT387Contract(),
  createT388Contract(),
] as const;
