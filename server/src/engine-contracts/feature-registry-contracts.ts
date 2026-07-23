import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * Feature Registry — Engine Contracts (FLOW-36)
 *
 * Business purpose: Makes Feature a first-class artifact in XIIGen. Every capability
 * gets a stable FT-ID that persists across platforms. Engine-internal capabilities
 * (portingCandidate=false) are protected from accidental porting attempts via a
 * synchronous PROHIBITED guard. Portable capabilities (portingCandidate=true) are
 * evaluated by signal thresholds before platform adapter generation begins.
 *
 * T567: FeatureExtractor              [ANALYSIS]       — extract FT entries with portingCandidate classification
 * T568: FeatureSignalAggregator       [GOVERNANCE]     — aggregate MODE_A/MODE_B signals per FT per platform
 * T569: PortingCostEstimator          [ANALYSIS]       — estimate porting effort via RAG (portingCandidate=true only)
 * T570: PortingDecisionGate           [GOVERNANCE]     — PROHIBITED guard first, then APPROVE/DEFER/BLOCK
 * T571: PlatformAdapterGenerator      [SYNTHESIS]      — generate thin adapter for target platform
 * T572: PlatformSimulator             [SIMULATION]     — simulate target platform runtime for Mode B testing
 * T573: FeaturePortingOrchestrator    [ORCHESTRATION]  — orchestrate full porting pipeline for one FT
 *
 * Families: 203 (FEATURE_REGISTRY)
 * Factories: F1492–F1498 (7 new)
 * CF rules:  CF-796–CF-821 (26 rules)
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const FEATURE_REGISTRY_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ────────────────────────────────────────────────────

const FEATURE_REGISTRY_QUALITY_GATES_CORE = [
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

const FEATURE_REGISTRY_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'portingCandidate field is MACHINE — tenant config cannot override it (CF-817)',
  'storeDocument() MUST happen BEFORE enqueue() on every state transition (DNA-8)',
];

const FEATURE_REGISTRY_AF_STATIONS_CORE = [
  { stationId: 'AF-1', role: 'generate', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
  { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
  {
    stationId: 'AF-9',
    role: 'judge',
    modelHint: MODEL_HINT_FROM_FREEDOM,
    config: { enforceQualityGates: true },
  },
];

// ── FEATURE_REGISTRY — Family-203 ──────────────────────────────────────────

/**
 * T567 — FeatureExtractor [ANALYSIS].
 *
 * PURPOSE: Given source code ZIP or design reference (via FeatureExtractionRequested event),
 *          extract FT entries with portingCandidate classification and productScope assignment.
 *          Validates output against feature-manifest.schema.json v2.0 before commit.
 *
 * F1492: IFeatureRegistryService → DATABASE FABRIC  (FT record CRUD, dedup check)
 * F1493: IFeatureExtractorService → AI ENGINE FABRIC (extraction + classification AI call)
 *
 * Iron rules from Amendment 2:
 *   - Client flow source (FLOW-01..24) → productScope = "client-capability"
 *   - XIIGen infra flow (FLOW-25..36) → productScope = "xiigen-capability"
 *   - Engine-internal capabilities → portingCandidate = false
 *   - Portable capabilities → portingCandidate = true
 */
export function createT567Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T567',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'FeatureExtractor',
    archetype: ContractArchetype.ANALYSIS,
    entry: 'Triggered by FeatureExtractionRequested event (source code ZIP or design ref)',
    purpose:
      'Extract FT entries from source code or design input; classify portingCandidate and productScope per Amendment 2 iron rules; validate against feature-manifest.schema.json v2.0; dedup against existing FT registry via RAG; emit FeatureExtractionCompleted',
    distinctFrom:
      'T569 PortingCostEstimator (T567 extracts FT definitions; T569 evaluates cost of porting a specific FT)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Feature registry CRUD — feature-registry-{tenantId} ES index. Dedup check for existing FT entries.',
      },
      {
        factoryId: 'F1493',
        interfaceName: 'IFeatureExtractorService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description:
          'AI extraction pipeline — uses versioned genesis prompt (SK-431). Handles portingCandidate classification and productScope assignment.',
      },
    ],

    afStations: [
      ...FEATURE_REGISTRY_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow36.feature-extractor.genesis' },
      },
    ],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-01',
        description:
          'Output validated against feature-manifest.schema.json v2.0 before commit (CF-796)',
        severity: 'error' as const,
        checkType: 'schema_validation',
      },
      {
        gateId: 'QG-36-02',
        description:
          'portingCandidate classification matches productScope assignment rules (Amendment 2)',
        severity: 'error' as const,
        checkType: 'business_rule',
      },
      {
        gateId: 'QG-36-03',
        description: 'extraction_precision metric captured per run (CF-797)',
        severity: 'error' as const,
        checkType: 'metrics_capture',
      },
      {
        gateId: 'QG-36-04',
        description: 'Tenant isolation: extraction does not read other tenant FT records (P1)',
        severity: 'error' as const,
        checkType: 'tenant_isolation',
      },
    ],

    bfaRegistration: {
      entities: ['feature_registry', 'ft_record'],
      events: ['feature.extraction.requested', 'feature.extraction.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'Client flow source (FLOW-01..24) → productScope = "client-capability" — MACHINE rule (CF-798)',
      'XIIGen infra flow (FLOW-25..36) → productScope = "xiigen-capability" — MACHINE rule (CF-798)',
      'Engine-internal capabilities (arbiters, consensus gates, bootstrap) → portingCandidate = false (CF-799)',
      'Portable capabilities with defined API boundary → portingCandidate = true (CF-799)',
      'Output MUST validate against schema v2.0 before any storeDocument() call (CF-796)',
      'RAG dedup check MUST run before creating new FT entry — avoid duplicate FT IDs (CF-800)',
    ],

    machineComponents: [
      'portingCandidate classification logic (engine-internal detection)',
      'productScope assignment from source flow range',
      'feature-manifest.schema.json v2.0 validation',
      'FT-ID uniqueness enforcement per tenant',
      'extraction_precision metric capture',
    ],

    freedomComponents: [
      'flow36_extraction_confidence_threshold — minimum confidence score to accept extracted FT',
      'flow36_max_ft_per_extraction — cap on FT entries per extraction run',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T568 — FeatureSignalAggregator [GOVERNANCE].
 *
 * PURPOSE: Aggregate signals per FT per platform. Routes to MODE_A (engine execution metrics)
 *          when ftRecord.platforms is empty, or MODE_B (marketplace signals) when adapters exist.
 *
 * F1492: IFeatureRegistryService → DATABASE FABRIC (FT record read/update)
 * F1494: ISignalIngestionService → QUEUE FABRIC (webhook receiver + aggregator)
 */
export function createT568Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T568',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'FeatureSignalAggregator',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by SignalIngested event or periodic aggregation trigger',
    purpose:
      'Aggregate feature usage signals per FT per platform. MODE_A (engine telemetry) when platforms[] empty; MODE_B (marketplace signals) when adapters exist. Evaluate porting threshold formulas for both modes. Update FT record signal fields.',
    distinctFrom:
      'T567 FeatureExtractor (T568 aggregates runtime signals; T567 extracts static feature definitions)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'FT record read and signal field updates in feature-registry-{tenantId} index.',
      },
      {
        factoryId: 'F1494',
        interfaceName: 'ISignalIngestionService',
        fabricType: FabricType.QUEUE,
        providerHint: 'in-memory',
        description:
          'Signal webhook receiver and aggregator. Routes MODE_A (internal telemetry) and MODE_B (marketplace webhook) signals.',
      },
    ],

    afStations: [...FEATURE_REGISTRY_AF_STATIONS_CORE],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-05',
        description:
          'Signal routing based on ftRecord.platforms array — MODE_A when empty, MODE_B when populated (CF-801)',
        severity: 'error' as const,
        checkType: 'business_rule',
      },
      {
        gateId: 'QG-36-06',
        description:
          'MODE_A threshold formula: w1*tenantAdoption + w2*successRate + w3*improvementVelocity (CF-802)',
        severity: 'error' as const,
        checkType: 'formula_accuracy',
      },
      {
        gateId: 'QG-36-07',
        description:
          'MODE_B signal score formula: w1*installs + w2*activeUsers30d + w3*likes + w4*citations (CF-803)',
        severity: 'error' as const,
        checkType: 'formula_accuracy',
      },
      {
        gateId: 'QG-36-08',
        description:
          'Porting threshold weights must come from FREEDOM config — never hardcoded (CF-804)',
        severity: 'error' as const,
        checkType: 'freedom_config_usage',
      },
    ],

    bfaRegistration: {
      entities: ['feature_signal', 'ft_record'],
      events: ['signal.ingested', 'signal.threshold.met', 'signal.threshold.not_met'],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'Signal routing MUST be based on ftRecord.platforms array — MODE_A when empty (CF-801)',
      'Porting threshold evaluation MUST use FREEDOM config weights — not hardcoded values (CF-804)',
      'MODE_A: fields from execution telemetry (executionCount, successRate, avgCostPerRunUsd, avgLatencyMs, tenantAdoption, improvementVelocity)',
      'MODE_B: fields from platform marketplace (installs, activeUsers30d, likes, citations, signalScore)',
    ],

    machineComponents: [
      'Signal mode routing (MODE_A vs MODE_B based on platforms array)',
      'MODE_A porting threshold formula evaluation',
      'MODE_B signal score formula evaluation',
      'portingThresholdMet flag update on FT record',
    ],

    freedomComponents: [
      'flow36_mode_a_weights — w1/w2/w3 for MODE_A porting score formula',
      'flow36_mode_b_weights — w1/w2/w3/w4 for MODE_B signal score formula',
      'flow36_porting_threshold — minimum score (default: 60) to set portingThresholdMet=true',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T569 — PortingCostEstimator [ANALYSIS].
 *
 * PURPOSE: Given FT record (portingCandidate=true) and target platform, estimate porting
 *          effort via RAG retrieval of platform constraint docs and historical porting data.
 *          ONLY runs when portingCandidate=true — guarded by PortingDecisionGate (T570).
 *
 * F1492: IFeatureRegistryService → DATABASE FABRIC (FT record read)
 * F1495: IPortingDecisionService → AI ENGINE FABRIC (RAG-augmented cost model)
 */
export function createT569Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T569',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'PortingCostEstimator',
    archetype: ContractArchetype.ANALYSIS,
    entry: 'Called by PortingDecisionGate (T570) after portingCandidate=true guard passes',
    purpose:
      'Estimate porting effort for a specific FT to a target platform. RAG retrieves platform API constraint docs and historical porting effort data. Returns cost_estimate (USD), effort_days, complexity_score.',
    distinctFrom:
      'T570 PortingDecisionGate (T569 estimates cost; T570 makes the final APPROVE/DEFER/BLOCK decision based on cost + signals)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'FT record read — canonicalImplementation path, portingConstraints, platformIncompatibilities.',
      },
      {
        factoryId: 'F1495',
        interfaceName: 'IPortingDecisionService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description:
          'RAG-augmented porting cost model — retrieves platform constraint docs (SK-432, SK-433) and historical effort data.',
      },
    ],

    afStations: [
      ...FEATURE_REGISTRY_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow36.porting-cost.genesis' },
      },
    ],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-09',
        description:
          'MUST NOT run when portingCandidate=false — caller (T570) enforces this (CF-805)',
        severity: 'error' as const,
        checkType: 'business_rule',
      },
      {
        gateId: 'QG-36-10',
        description:
          'RAG retrieval MUST include platform constraint docs for target platform (CF-806)',
        severity: 'error' as const,
        checkType: 'rag_usage',
      },
      {
        gateId: 'QG-36-11',
        description: 'cost_estimate, effort_days, complexity_score all required in output (CF-807)',
        severity: 'error' as const,
        checkType: 'output_completeness',
      },
    ],

    bfaRegistration: {
      entities: ['porting_cost_estimate'],
      events: ['porting.cost.estimated'],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'MUST NOT be called for portingCandidate=false FTs — this is enforced by T570 guard (CF-805)',
      'RAG MUST retrieve platform API surface + historical porting effort for target platform (CF-806)',
      'cost_estimate, effort_days, complexity_score are all REQUIRED output fields (CF-807)',
      'max_porting_cost threshold comes from FREEDOM config — not hardcoded',
    ],

    machineComponents: [
      'RAG platform constraint retrieval',
      'Historical porting effort lookup',
      'Cost model computation',
    ],

    freedomComponents: [
      'flow36_max_porting_cost_usd — max acceptable cost for APPROVE decision',
      'flow36_porting_cost_model — RAG strategy for cost estimation',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T570 — PortingDecisionGate [GOVERNANCE].
 *
 * PURPOSE: Four-outcome decision engine for feature porting requests.
 *          STEP 0 (synchronous, pre-arbiter): if portingCandidate=false → emit PortingProhibited, TERMINAL.
 *          STEP 1: incompatibility check → BLOCK if target platform in platformIncompatibilities.
 *          STEP 2: call T569 PortingCostEstimator.
 *          STEP 3: signal threshold evaluation (MODE_A or MODE_B formula).
 *          STEP 4: APPROVE / DEFER / BLOCK based on score + cost.
 *
 * F1492: IFeatureRegistryService → DATABASE FABRIC
 * F1495: IPortingDecisionService → AI ENGINE FABRIC
 */
export function createT570Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T570',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'PortingDecisionGate',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by PortingRequested event',
    purpose:
      'Four-outcome porting decision engine. PROHIBITED guard runs FIRST (synchronous, no AI) — if portingCandidate=false, emit PortingProhibited and terminate. For portingCandidate=true: check platform compatibility, estimate cost via T569, evaluate signal threshold, produce APPROVE/DEFER/BLOCK decision.',
    distinctFrom:
      'T569 PortingCostEstimator (T570 makes the final decision; T569 provides the cost input)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'FT record read — portingCandidate, portingCandidateReason, platforms, platformIncompatibilities, signals.',
      },
      {
        factoryId: 'F1495',
        interfaceName: 'IPortingDecisionService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description:
          'Governance arbiter — evaluates signal score + cost against FREEDOM config thresholds.',
      },
    ],

    afStations: [...FEATURE_REGISTRY_AF_STATIONS_CORE],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-12',
        description:
          'PROHIBITED guard MUST be FIRST — before any AI call or cost estimation (CF-808 score-0)',
        severity: 'error' as const,
        checkType: 'guard_ordering',
      },
      {
        gateId: 'QG-36-13',
        description:
          'PortingCostEstimator MUST NOT run when portingCandidate=false (CF-809 score-0)',
        severity: 'error' as const,
        checkType: 'guard_enforcement',
      },
      {
        gateId: 'QG-36-14',
        description:
          'PortingProhibited event emitted (not DEFER or BLOCK) for portingCandidate=false (CF-810 score-0)',
        severity: 'error' as const,
        checkType: 'event_correctness',
      },
      {
        gateId: 'QG-36-15',
        description: 'Decision persisted before event emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-36-16',
        description: 'APPROVE/DEFER/BLOCK thresholds from FREEDOM config — not hardcoded (CF-811)',
        severity: 'error' as const,
        checkType: 'freedom_config_usage',
      },
    ],

    bfaRegistration: {
      entities: ['porting_decision', 'ft_record'],
      events: [
        'porting.requested',
        'porting.prohibited',
        'porting.approved',
        'porting.deferred',
        'porting.blocked',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'PROHIBITED guard MUST execute FIRST — before any other logic, AI call, or cost estimation (CF-808)',
      'portingCandidate=false → emit PortingProhibited and return — TERMINAL, no further evaluation (CF-809)',
      'PortingCostEstimator MUST NOT be invoked when portingCandidate=false (CF-809)',
      'APPROVE/DEFER/BLOCK decisions require portingCandidate=true AND signal + cost evaluation (CF-810)',
      'Decision MUST be stored before PortingProhibited/Approved/Deferred/Blocked event is emitted (DNA-8)',
      'Signal mode (MODE_A vs MODE_B) determined by ftRecord.platforms array',
    ],

    machineComponents: [
      'portingCandidate guard (STEP 0 — synchronous, pre-arbiter)',
      'Platform incompatibility check (STEP 1)',
      'Signal mode routing (MODE_A vs MODE_B)',
      'Decision assembly (APPROVE/DEFER/BLOCK/PROHIBITED)',
    ],

    freedomComponents: [
      'flow36_porting_threshold — minimum signal score for APPROVE (default: 60)',
      'flow36_max_porting_cost_usd — max cost for APPROVE decision',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T571 — PlatformAdapterGenerator [SYNTHESIS].
 *
 * PURPOSE: Generate thin adapter code for a target platform after PortingDecisionGate APPROVE.
 *          Adapter wraps Mode A service call via QUEUE FABRIC event.
 *          Only runs for portingCandidate=true FTs — belt-and-suspenders guard included.
 *
 * F1492: IFeatureRegistryService → DATABASE FABRIC
 * F1496: IAdapterGeneratorService → AI ENGINE FABRIC
 */
export function createT571Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T571',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'PlatformAdapterGenerator',
    archetype: ContractArchetype.SYNTHESIS,
    entry: 'Triggered by PortingApproved event from PortingDecisionGate (T570)',
    purpose:
      'Generate thin adapter code for target platform. Adapter contains only platform-specific UI, API calls, auth flow — zero business logic. Business logic stays in Mode A canonical implementation. Adapter calls canonical service via QUEUE FABRIC event.',
    distinctFrom:
      'T572 PlatformSimulator (T571 generates the adapter; T572 runs it in a mock platform runtime)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'FT record read — canonicalImplementation path, portingConstraints, target platform spec.',
      },
      {
        factoryId: 'F1496',
        interfaceName: 'IAdapterGeneratorService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description:
          'Code generation for platform adapters — uses platform API constraint docs from RAG (SK-433) and existing adapter templates.',
      },
    ],

    afStations: [
      ...FEATURE_REGISTRY_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow36.adapter-generator.genesis' },
      },
    ],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-17',
        description:
          'MUST refuse to run if portingCandidate=false (belt-and-suspenders guard, CF-812)',
        severity: 'error' as const,
        checkType: 'guard_enforcement',
      },
      {
        gateId: 'QG-36-18',
        description:
          'Generated adapter contains ZERO business logic — only platform API calls (CF-813)',
        severity: 'error' as const,
        checkType: 'adapter_purity',
      },
      {
        gateId: 'QG-36-19',
        description:
          'Adapter calls canonical service via QUEUE FABRIC event — no direct HTTP (CF-813)',
        severity: 'error' as const,
        checkType: 'fabric_usage',
      },
      {
        gateId: 'QG-36-20',
        description: 'Adapter path written to FT record after generation (CF-814)',
        severity: 'error' as const,
        checkType: 'state_update',
      },
    ],

    bfaRegistration: {
      entities: ['platform_adapter', 'ft_record'],
      events: ['porting.approved', 'adapter.generated', 'adapter.generation.failed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'Refuse to generate adapter for portingCandidate=false FTs — belt-and-suspenders guard (CF-812)',
      'Generated adapter MUST contain zero business logic — platform API calls only (CF-813)',
      'Canonical service MUST be called via QUEUE FABRIC event — never direct HTTP (CF-813)',
      'Adapter path written to FT record before PortingComplete event emitted (DNA-8 + CF-814)',
      'PromptPatch retry cycle (max 3) on simulator failure',
    ],

    machineComponents: [
      'portingCandidate guard (belt-and-suspenders)',
      'Adapter code generation via versioned genesis prompt',
      'Adapter path registration in FT record',
    ],

    freedomComponents: [
      'flow36_adapter_generator_prompt_version — active prompt version for adapter generation',
      'flow36_max_adapter_retry_rounds — max PromptPatch retry rounds (default: 3)',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T572 — PlatformSimulator [SIMULATION].
 *
 * PURPOSE: Simulate target platform runtime for generated adapter testing.
 *          Supported in Phase E: Figma and Canva.
 *          FAIL → triggers PromptPatch retry cycle (max 3 rounds).
 *
 * F1495: IPortingDecisionService → AI ENGINE FABRIC (simulator orchestration)
 * F1497: IPlatformSimulatorService → AI ENGINE FABRIC (mock platform runtime)
 */
export function createT572Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T572',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'PlatformSimulator',
    archetype: ContractArchetype.SIMULATION,
    entry: 'Triggered after PlatformAdapterGenerator (T571) produces adapter code',
    purpose:
      'Execute generated adapter against mock platform runtime. Supported platforms: Figma, Canva. PASS → update FT record status to "implemented". FAIL → trigger PromptPatch retry via T571 (max 3 rounds).',
    distinctFrom: 'T571 PlatformAdapterGenerator (T572 tests the adapter; T571 generates it)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1495',
        interfaceName: 'IPortingDecisionService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: MODEL_HINT_FROM_FREEDOM,
        description: 'Simulator orchestration — manages retry cycle and sim pass/fail evaluation.',
      },
      {
        factoryId: 'F1497',
        interfaceName: 'IPlatformSimulatorService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'in-memory',
        description:
          'Mock platform runtime — implements Figma Plugin API surface, Canva Design API surface. Local-only, zero cloud credentials.',
      },
    ],

    afStations: [...FEATURE_REGISTRY_AF_STATIONS_CORE],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-21',
        description: 'Simulator runs with ZERO cloud credentials — local mock only (P7)',
        severity: 'error' as const,
        checkType: 'local_testability',
      },
      {
        gateId: 'QG-36-22',
        description: 'FAIL triggers PromptPatch retry — max 3 rounds (CF-815)',
        severity: 'error' as const,
        checkType: 'retry_policy',
      },
      {
        gateId: 'QG-36-23',
        description: 'FT record status updated to "implemented" only after PASS (CF-816)',
        severity: 'error' as const,
        checkType: 'state_update',
      },
    ],

    bfaRegistration: {
      entities: ['simulator_run', 'ft_record'],
      events: ['simulator.passed', 'simulator.failed', 'porting.complete'],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'Simulator MUST run with zero cloud credentials — local mock only (P7)',
      'FAIL response MUST trigger PromptPatch retry — max 3 rounds (CF-815)',
      'FT record status MUST NOT be set to "implemented" until simulator PASS (CF-816)',
      'PortingComplete event MUST be emitted after status update (DNA-8)',
    ],

    machineComponents: [
      'Figma mock runtime (implements Figma Plugin API surface)',
      'Canva mock runtime (implements Canva Design API surface)',
      'PromptPatch retry orchestration (max 3 rounds)',
      'sim_pass_rate training data capture',
    ],

    freedomComponents: ['flow36_simulator_timeout_ms — max time per simulator run before FAIL'],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

/**
 * T573 — FeaturePortingOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Orchestrate the full porting pipeline for one FT.
 *          Coordinates T570 → T569 → T571 → T572 in dependency order.
 *          Emits per-step progress events for FlowStateSnapshot.
 *
 * F1498: IPortingOrchestrator → FLOW ENGINE FABRIC (pipeline coordinator)
 * F1492: IFeatureRegistryService → DATABASE FABRIC (FT record updates)
 */
export function createT573Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T573',
    flowId: 'FLOW-36',
    flowName: 'Feature Registry',
    name: 'FeaturePortingOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by PortingRequested event (top-level entry point for porting pipeline)',
    purpose:
      'Orchestrate full porting pipeline for one FT: portingCandidate guard → cost estimation → decision gate → adapter generation → simulator. Emit per-step progress events. App-reopen: resume from last incomplete step.',
    distinctFrom:
      'T570 PortingDecisionGate (T573 orchestrates the whole pipeline; T570 makes the APPROVE/DEFER/BLOCK/PROHIBITED decision)',
    familyId: 'Family-203',

    factoryDependencies: [
      {
        factoryId: 'F1498',
        interfaceName: 'IPortingOrchestrator',
        fabricType: FabricType.FLOW_ENGINE,
        providerHint: 'in-memory',
        description:
          'Pipeline coordinator — manages step sequencing, resume-on-reopen, progress event emission.',
      },
      {
        factoryId: 'F1492',
        interfaceName: 'IFeatureRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FT record state reads and pipeline checkpoint writes.',
      },
    ],

    afStations: [...FEATURE_REGISTRY_AF_STATIONS_CORE],

    qualityGates: [
      ...FEATURE_REGISTRY_QUALITY_GATES_CORE,
      {
        gateId: 'QG-36-24',
        description:
          'Pipeline steps executed in dependency order — PROHIBITED guard before cost estimation (CF-808)',
        severity: 'error' as const,
        checkType: 'step_ordering',
      },
      {
        gateId: 'QG-36-25',
        description: 'Per-step progress events emitted for FlowStateSnapshot visibility (P9)',
        severity: 'error' as const,
        checkType: 'observability',
      },
      {
        gateId: 'QG-36-26',
        description:
          'App-reopen idempotency — resume from last incomplete step without re-triggering completed steps (CF-818)',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
      {
        gateId: 'QG-36-27',
        description: 'correlationId + tenantId + traceparent on every emitted event (DNA-9)',
        severity: 'error' as const,
        checkType: 'event_envelope',
      },
    ],

    bfaRegistration: {
      entities: ['porting_pipeline', 'ft_record'],
      events: [
        'porting.requested',
        'porting.step.progress',
        'porting.complete',
        'porting.prohibited',
        'porting.deferred',
        'porting.blocked',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...FEATURE_REGISTRY_IRON_RULES_CORE,
      'Pipeline MUST execute steps in dependency order — PROHIBITED guard before any other step (CF-808)',
      'Each step checkpoint stored before next step begins — idempotent resume on reopen (CF-818)',
      'correlationId + tenantId + traceparent on every event (DNA-9)',
      'TERMINAL steps (PROHIBITED, BLOCKED, DEFERRED, COMPLETE) stop pipeline — no further steps',
    ],

    machineComponents: [
      'Step dependency ordering (PROHIBITED → incompatibility → cost → signal → decision → adapter → simulator)',
      'Per-step checkpoint persistence',
      'App-reopen resume logic',
      'FlowStateSnapshot progress events',
    ],

    freedomComponents: [
      'flow36_porting_pipeline_timeout_ms — max time for full pipeline before timeout',
    ],
    stackCoupling: FEATURE_REGISTRY_STACK_COUPLING,
  });
}

// ── Exports ─────────────────────────────────────────────────────────────────

// Domain aliases (SK-430 Rule 2) — use these in new code
export const createFeatureExtractorContract = createT567Contract;
export const createFeatureSignalAggregatorContract = createT568Contract;
export const createPortingCostEstimatorContract = createT569Contract;
export const createPortingDecisionGateContract = createT570Contract;
export const createPlatformAdapterGeneratorContract = createT571Contract;
export const createPlatformSimulatorContract = createT572Contract;
export const createFeaturePortingOrchestratorContract = createT573Contract;

// Domain-grouped barrels (SK-430 Rule 6)
export const FEATURE_REGISTRY_ANALYSIS_CONTRACTS = [createT567Contract, createT569Contract];
export const FEATURE_REGISTRY_GOVERNANCE_CONTRACTS = [createT568Contract, createT570Contract];
export const FEATURE_REGISTRY_SYNTHESIS_CONTRACTS = [createT571Contract];
export const FEATURE_REGISTRY_SIMULATION_CONTRACTS = [createT572Contract];
export const FEATURE_REGISTRY_ORCHESTRATION_CONTRACTS = [createT573Contract];

// All contract factories
export const FEATURE_REGISTRY_CONTRACT_FACTORIES = [
  createT567Contract,
  createT568Contract,
  createT569Contract,
  createT570Contract,
  createT571Contract,
  createT572Contract,
  createT573Contract,
];

// EngineContract instances — tests call .validate() on these
export const FEATURE_REGISTRY_CONTRACTS = FEATURE_REGISTRY_CONTRACT_FACTORIES.map((f) => f());
