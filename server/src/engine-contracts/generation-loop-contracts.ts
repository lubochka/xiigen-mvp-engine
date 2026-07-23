/**
 * FLOW-33 Engine Contracts — System Initiation: Self-Building Bootstrap.
 * T536–T542 — 7 task types across 5 archetypes.
 *
 * T536: BootstrapOrchestrator          [ORCHESTRATION]      — 7-phase sentinel state machine, all-or-nothing import
 * T537: GraphRAGTwoLayerSeeder         [DATA_PIPELINE]      — two-layer GraphRAG construction (Layer 1 before Layer 2)
 * T538: ImplementationStatusRegistry   [STATE_MACHINE]      — idempotency composite key, per-family status tracking
 * T539: ImplementFamilyMetaLoop        [AI_GENERATION_LOOP] — bounded retry loop with arbiter feedback injection
 * T540: FiveArbiterConsensusGate       [AI_CONSENSUS]       — 5 arbiters parallel, ≥4/5 quorum required
 * T541: RegressionImpactAnalyzer       [CHANGE_DETECTION]   — blast radius graph traversal before any promotion
 * T542: ContextPackAssembler           [ORCHESTRATION]      — TTL-managed hybrid RAG context pack assembly
 *
 * Families: 200 (BOOTSTRAP), 201 (IMPLEMENT_FAMILY)
 * Factories: F1339–F1347 (9 new), F1348 = IRagService reuse from FLOW-29
 * CF rules:  CF-739–CF-750 (12 rules)
 * SK nodes:  SK-346–SK-354 (9 skill patterns)
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const GENERATION_LOOP_STACK_COUPLING: TaskTypeStackCoupling = {
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

// ── Shared quality gates ───────────────────────────────────────────────────

const META_ARBITRATION_QUALITY_GATES_CORE = [
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

const META_ARBITRATION_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-739)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'Sentinel state MUST be read before any bootstrap phase executes (CF-739)',
  'Bootstrap phases MUST execute in order — no phase skipping (CF-740)',
  'Schemas MUST be registered before events emitted (CF-741)',
  'Partial plan bundle import MUST NOT be committed (CF-742)',
  'GraphRAG Layer 2 MUST NOT start before Layer 1 is complete (CF-743)',
  'Regression impact check MUST run before any promotion (CF-746)',
  'Stale ContextPack MUST NOT be reused across retry rounds (CF-747)',
  'Evolved prompt MUST NOT be applied to in-flight session (CF-750)',
];

const META_ARBITRATION_AF_STATIONS_CORE = [
  { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
  { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
  { stationId: 'AF-9', role: 'judge', modelHint: undefined, config: { enforceQualityGates: true } },
];

// ── BOOTSTRAP — Family-200 ─────────────────────────────────────────────────

/**
 * T536 — BootstrapOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: 7-phase sentinel state machine that orchestrates the entire self-building
 *          bootstrap lifecycle. Reads sentinel state before every phase (CF-739).
 *          Atomic import: all-or-nothing — partial import triggers rollback (CF-742).
 *          Supports DRY_RUN mode: validates without triggering AI calls or state mutation.
 *
 * F1339: IBootstrapService → DATABASE FABRIC  (sentinel state machine, phase orchestration)
 * F1346: IPlanBundleImportService → DATABASE FABRIC  (atomic import + rollback)
 *
 * IR-516-1: Read sentinel state BEFORE any phase execution (CF-739)
 * IR-516-2: DRY_RUN mode MUST NOT trigger AI calls or state mutation (IR-DRY-1)
 * IR-516-3: Plan bundle import is all-or-nothing — rollback on any phase failure (CF-742)
 */
export function createT536Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T536',
    flowId: 'FLOW-33',
    name: 'BootstrapOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by FLOW-33 initiation event or DRY_RUN validation request',
    purpose:
      'Orchestrate 7-phase self-building bootstrap via sentinel state machine; enforce phase ordering (CF-740); support DRY_RUN mode returning DryRunValidationReport without state mutation; atomic plan bundle import with rollback on failure',
    distinctFrom:
      'T542 (context pack assembly — T536 orchestrates phases, T542 assembles RAG context)',
    familyId: 'Family-200',

    factoryDependencies: [
      {
        factoryId: 'F1339',
        interfaceName: 'IBootstrapService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Sentinel state machine — read and update phase state before each transition',
      },
      {
        factoryId: 'F1346',
        interfaceName: 'IPlanBundleImportService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Atomic plan bundle import with rollback support (CF-742)',
      },
    ],

    afStations: [
      ...META_ARBITRATION_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow33.bootstrap.orchestrator' },
      },
    ],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-01',
        description: 'Sentinel state read before every phase (CF-739)',
        severity: 'error' as const,
        checkType: 'sentinel_read',
      },
      {
        gateId: 'QG-33-02',
        description: 'DRY_RUN: no AI calls, no state mutation (IR-DRY-1)',
        severity: 'error' as const,
        checkType: 'dry_run_isolation',
      },
      {
        gateId: 'QG-33-03',
        description: 'Import is all-or-nothing — rollback on failure (CF-742)',
        severity: 'error' as const,
        checkType: 'atomic_import',
      },
    ],

    bfaRegistration: {
      entities: ['bootstrap_sentinel', 'plan_bundle'],
      events: [
        'bootstrap.phase.started',
        'bootstrap.phase.completed',
        'bootstrap.completed',
        'bootstrap.dry_run.validated',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Sentinel MUST be loaded from DATABASE FABRIC before phase 1 — never from memory (CF-739)',
      'DRY_RUN execution MUST return DryRunValidationReport with zero side effects (IR-DRY-1)',
    ],

    machineComponents: [
      '7-phase state machine ordering enforcement (CF-740)',
      'Sentinel read-before-phase lock (CF-739)',
      'Atomic import with rollback on partial failure (CF-742)',
      'DRY_RUN isolation — no AI calls, no state mutations (IR-DRY-1)',
      'Outbox ordering: storeDocument() before enqueue() (DNA-8)',
    ],

    freedomComponents: [
      'Phase timeout per phase (FREEDOM config key: flow33_phase_timeout_minutes)',
      'Max concurrent family imports',
      'DRY_RUN enabled flag',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

/**
 * T537 — GraphRAGTwoLayerSeeder [DATA_PIPELINE].
 *
 * PURPOSE: Constructs the self-knowledge GraphRAG in two strict layers.
 *          Layer 1: index all existing engine contracts, task types, factory interfaces.
 *          Layer 2: build cross-flow dependency graph edges.
 *          Layer 2 MUST NOT start before Layer 1 is 100% complete (CF-743).
 *
 * F1340: IGraphRAGSeedingService → DATABASE FABRIC  (two-layer RAG construction)
 * F1348: IRagService → RAG FABRIC  (RAG indexing — reused from FLOW-29)
 *
 * IR-517-1: Layer 1 completeness verified before Layer 2 start (CF-743)
 * IR-517-2: Each seeding batch idempotent — content-addressed by nodeId
 */
export function createT537Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T537',
    flowId: 'FLOW-33',
    name: 'GraphRAGTwoLayerSeeder',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered after T536 bootstrap phase 2 (schema registration) completes',
    purpose:
      'Seed self-knowledge GraphRAG in two strict layers: Layer 1 indexes engine contracts/task types/factory interfaces; Layer 2 builds cross-flow dependency graph edges. Layer 2 blocked until Layer 1 verified complete (CF-743). Each batch idempotent by nodeId.',
    distinctFrom: 'T542 (uses RAG for context packs — T537 builds the RAG, T542 queries it)',
    familyId: 'Family-200',

    factoryDependencies: [
      {
        factoryId: 'F1340',
        interfaceName: 'IGraphRAGSeedingService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Two-layer GraphRAG construction state tracking and batch coordination',
      },
      {
        factoryId: 'F1348',
        interfaceName: 'IRagService',
        fabricType: FabricType.RAG,
        providerHint: 'elasticsearch',
        description: 'RAG index population — reused from FLOW-29',
      },
    ],

    afStations: [
      ...META_ARBITRATION_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow33.graphrag.seeder' },
      },
    ],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-04',
        description: 'Layer 1 verified complete before Layer 2 begins (CF-743)',
        severity: 'error' as const,
        checkType: 'layer_ordering',
      },
      {
        gateId: 'QG-33-05',
        description: 'Each seeding batch idempotent by nodeId',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],

    bfaRegistration: {
      entities: ['graphrag_node', 'graphrag_edge', 'seeding_batch'],
      events: [
        'graphrag.layer1.completed',
        'graphrag.layer2.completed',
        'graphrag.seeding.batch.indexed',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Layer 2 seeding MUST be blocked until Layer 1 status = COMPLETE in DATABASE FABRIC (CF-743)',
    ],

    machineComponents: [
      'Layer 1 completion check before Layer 2 trigger (CF-743)',
      'Content-addressed nodeId for idempotent batches',
      'Two-layer pipeline ordering enforcement',
    ],

    freedomComponents: [
      'Batch size per seeding round (FREEDOM config key: flow33_graphrag_batch_size)',
      'RAG index name for self-knowledge graph',
      'Layer 1 entity types to index (subset of all task types)',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

/**
 * T538 — ImplementationStatusRegistry [STATE_MACHINE].
 *
 * PURPOSE: Per-family implementation status tracker with idempotency locks.
 *          Composite key: (tenantId, flowId, familyId, runId).
 *          State machine: PENDING → IN_PROGRESS → COMPLETED | FAILED | NEEDS_REVIEW.
 *          Sentinel read enforced before every state transition (CF-739).
 *
 * F1341: IImplementationRegistryService → DATABASE FABRIC  (status tracking, idempotency composite key)
 *
 * IR-518-1: State transitions are persist-before-emit (DNA-8)
 * IR-518-2: Idempotency key = (tenantId, flowId, familyId, runId) — atomic set-if-not-exists pattern (IScopedMemoryService.setIfAbsent())
 */
export function createT538Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T538',
    flowId: 'FLOW-33',
    name: 'ImplementationStatusRegistry',
    archetype: ContractArchetype.STATE_MACHINE,
    entry: 'Called by T536 orchestrator before and after each family implementation attempt',
    purpose:
      'Track per-family implementation status using composite idempotency key (tenantId, flowId, familyId, runId). Sentinel state read before every transition. States: PENDING → IN_PROGRESS → COMPLETED|FAILED|NEEDS_REVIEW. All transitions persist-before-emit.',
    distinctFrom: 'T536 (orchestrates phases — T538 tracks per-family status within each phase)',
    familyId: 'Family-200',

    factoryDependencies: [
      {
        factoryId: 'F1341',
        interfaceName: 'IImplementationRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Status tracking with composite idempotency key and atomic setIfAbsent locking',
      },
    ],

    afStations: [...META_ARBITRATION_AF_STATIONS_CORE],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-06',
        description: 'Composite idempotency key enforced (CF-739)',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
      {
        gateId: 'QG-33-07',
        description: 'All state transitions are persist-before-emit (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['implementation_status'],
      events: [
        'implementation.status.pending',
        'implementation.status.in_progress',
        'implementation.status.completed',
        'implementation.status.failed',
        'implementation.status.needs_review',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Atomic set-if-not-exists idempotency key MUST be checked before any IN_PROGRESS transition — no duplicate runs (IScopedMemoryService.setIfAbsent() in Node.js; INSERT IGNORE in MySQL/WordPress)',
    ],

    machineComponents: [
      'setIfAbsent composite key lock (tenantId + flowId + familyId + runId) — IScopedMemoryService.setIfAbsent()',
      'State machine transition guard (invalid transitions rejected)',
      'Persist-before-emit on every state change (DNA-8)',
    ],

    freedomComponents: [
      'Status TTL — how long NEEDS_REVIEW stays open before escalation',
      'Allowed transition paths (subset of full state graph)',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

// ── IMPLEMENT_FAMILY — Family-201 ──────────────────────────────────────────

/**
 * T539 — ImplementFamilyMetaLoop [AI_GENERATION_LOOP].
 *
 * PURPOSE: Bounded retry loop that drives per-family code generation.
 *          Max retries from FREEDOM config key "flow33_max_family_retries" — never hardcoded.
 *          Injects arbiter feedback from T540 into next iteration prompt.
 *          Evolved prompt MUST NOT be applied to in-flight sessions (CF-750).
 *
 * F1343: IFamilyImplementationService → AI_ENGINE FABRIC  (meta-loop coordination)
 * F1341: IImplementationRegistryService → DATABASE FABRIC  (status updates between retries)
 *
 * IR-519-1: Retry count from FREEDOM config — hardcoded = score-0 violation
 * IR-519-2: Evolved prompts applied only to new sessions (CF-750)
 */
export function createT539Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T539',
    flowId: 'FLOW-33',
    name: 'ImplementFamilyMetaLoop',
    archetype: ContractArchetype.AI_GENERATION_LOOP,
    entry:
      'Triggered by T536 orchestrator for each family — executes after T538 PENDING→IN_PROGRESS',
    purpose:
      'Drive per-family code generation in a bounded retry loop. Max retries from FREEDOM config "flow33_max_family_retries". Inject T540 arbiter feedback into next iteration. Evolved prompts applied only to new sessions — never in-flight (CF-750). On max retries exceeded: transition T538 to NEEDS_REVIEW.',
    distinctFrom: 'T540 (consensus gate — T539 generates code, T540 gates it)',
    familyId: 'Family-201',

    factoryDependencies: [
      {
        factoryId: 'F1343',
        interfaceName: 'IFamilyImplementationService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'openai',
        description: 'Meta-loop coordination — code generation with retry and feedback injection',
      },
      {
        factoryId: 'F1341',
        interfaceName: 'IImplementationRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Update implementation status between retry rounds',
      },
    ],

    afStations: [
      ...META_ARBITRATION_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow33.implement_family.meta_loop' },
      },
    ],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-08',
        description: 'Retry count from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'freedom_config',
      },
      {
        gateId: 'QG-33-09',
        description: 'Evolved prompt never applied to in-flight session (CF-750)',
        severity: 'error' as const,
        checkType: 'prompt_isolation',
      },
    ],

    bfaRegistration: {
      entities: ['family_implementation_run'],
      events: [
        'family.implementation.attempt.started',
        'family.implementation.attempt.completed',
        'family.implementation.max_retries_exceeded',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Retry limit MUST be read from FREEDOM config "flow33_max_family_retries" — hardcoded value = score-0',
      'Evolved prompt MUST only apply to fresh sessions — never to in-flight generation (CF-750)',
    ],

    machineComponents: [
      'Retry counter increment and max-check on each loop iteration',
      'Arbiter feedback injection into prompt for next iteration',
      'NEEDS_REVIEW escalation on max retry exceeded',
      'Prompt isolation — evolved prompts never touch in-flight (CF-750)',
    ],

    freedomComponents: [
      'Max retries per family (FREEDOM config key: flow33_max_family_retries)',
      'AI model for code generation',
      'Arbiter feedback weight in next-prompt injection',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

/**
 * T540 — FiveArbiterConsensusGate [AI_CONSENSUS].
 *
 * PURPOSE: 5 specialized arbiters run in PARALLEL via Promise.allSettled.
 *          Quorum threshold: ≥4/5 required (never ≥3/5 or other — score-0 violation).
 *          Arbiters: architecture, security, dna, business, integration.
 *          Arbiter prompts seeded INTO T540 genesis prompt — NOT into ArbiterRegistry.
 *          Sequential execution = score-0 CF violation.
 *
 * F1344: IFiveArbiterConsensusService → AI_ENGINE FABRIC  (parallel arbiter dispatch)
 *
 * IR-520-1: All 5 arbiters via Promise.allSettled — sequential = score-0 (CF)
 * IR-520-2: Quorum ≥4/5 — threshold 3 or lower = score-0 (CF)
 * IR-520-3: Arbiter prompts in T540 genesis seed — not ArbiterRegistry
 */
export function createT540Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T540',
    flowId: 'FLOW-33',
    name: 'FiveArbiterConsensusGate',
    archetype: ContractArchetype.AI_CONSENSUS,
    entry:
      'Called by T539 after each code generation attempt — blocks promotion until ≥4/5 verdicts PASS',
    purpose:
      'Run 5 specialized arbiters in parallel via Promise.allSettled (architecture, security, dna, business, integration). Quorum: ≥4/5 = APPROVED, 3/5 = NEEDS_REVISION, <3/5 = REJECTED. Sequential execution is a score-0 violation. Arbiter prompts are seeded in T540 genesis prompt.',
    distinctFrom:
      'T541 (regression impact — T540 gates generation quality, T541 checks promotion impact)',
    familyId: 'Family-201',

    factoryDependencies: [
      {
        factoryId: 'F1344',
        interfaceName: 'IFiveArbiterConsensusService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'openai',
        description: 'Parallel arbiter dispatch with Promise.allSettled and quorum calculation',
      },
    ],

    afStations: [
      ...META_ARBITRATION_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow33.consensus.five_arbiter' },
      },
    ],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-10',
        description: '5 arbiters run via Promise.allSettled — not sequentially',
        severity: 'error' as const,
        checkType: 'parallel_execution',
      },
      {
        gateId: 'QG-33-11',
        description: 'Quorum threshold exactly ≥4/5 — no other value permitted',
        severity: 'error' as const,
        checkType: 'quorum_threshold',
      },
    ],

    bfaRegistration: {
      entities: ['consensus_verdict'],
      events: ['consensus.approved', 'consensus.needs_revision', 'consensus.rejected'],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'ALL 5 arbiters MUST execute via Promise.allSettled — sequential order = score-0 (CF)',
      'Quorum MUST be exactly ≥4/5 — threshold of 3 or lower = score-0 (CF)',
      'Arbiter prompts MUST be seeded inside T540 genesis prompt — not in ArbiterRegistry',
    ],

    machineComponents: [
      'Promise.allSettled parallel dispatch for all 5 arbiters',
      'Quorum calculation: passed.length >= 4 check',
      'Verdict mapping: APPROVED | NEEDS_REVISION | REJECTED',
      'Settled-not-fulfilled handling for failed arbiter calls',
    ],

    freedomComponents: [
      'AI model per arbiter type',
      'Arbiter prompt templates (in genesis seed, not ArbiterRegistry)',
      'Individual arbiter timeout',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

/**
 * T541 — RegressionImpactAnalyzer [CHANGE_DETECTION].
 *
 * PURPOSE: Graph traversal to identify downstream impact before any promotion.
 *          Regression check MUST run before any CASE A/B/C promotion (CF-746).
 *          After CASE A or CASE C promotion: scan active bundle manifests with
 *          requiredFlows[] — check minFlowVersions[flowId] — set bundle DEGRADED
 *          if promotion version < minimum.
 *          Supports arbiter replay for bundle impact (replayArbiterOnBundle).
 *
 * F1345: IRegressionImpactService → DATABASE FABRIC  (graph traversal blast radius + arbiter replay)
 *
 * IR-521-1: Regression check before promotion — skip = score-0 (CF-746)
 * IR-521-2: Bundle minFlowVersions check after CASE A/C promotion
 */
export function createT541Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T541',
    flowId: 'FLOW-33',
    name: 'RegressionImpactAnalyzer',
    archetype: ContractArchetype.CHANGE_DETECTION,
    entry: 'Called by T539 before any family promotion — mandatory gate (CF-746)',
    purpose:
      'Graph traversal blast radius analysis before any promotion decision. Skipping = score-0 violation (CF-746). After CASE A/C promotion: scan bundle manifests with requiredFlows[], check minFlowVersions[flowId], set bundle DEGRADED if version below minimum. Supports replayArbiterOnBundle() for bundle impact re-validation.',
    distinctFrom:
      'T540 (generation quality gate — T541 checks promotion impact on existing system)',
    familyId: 'Family-201',

    factoryDependencies: [
      {
        factoryId: 'F1345',
        interfaceName: 'IRegressionImpactService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Graph traversal blast radius calculation + arbiter replay + bundle minFlowVersions check',
      },
    ],

    afStations: [...META_ARBITRATION_AF_STATIONS_CORE],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-12',
        description: 'Regression check runs before every promotion (CF-746)',
        severity: 'error' as const,
        checkType: 'regression_gate',
      },
      {
        gateId: 'QG-33-13',
        description: 'Bundle minFlowVersions checked after CASE A/C promotion',
        severity: 'error' as const,
        checkType: 'bundle_version',
      },
    ],

    bfaRegistration: {
      entities: ['regression_impact_report', 'bundle_version_check'],
      events: ['regression.impact.analyzed', 'bundle.degraded', 'regression.promotion.blocked'],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Regression impact check MUST run before any promotion — skip = score-0 (CF-746)',
      'After CASE A or CASE C: scan ALL active bundle manifests for minFlowVersions violations',
      'Bundle set to DEGRADED if promoted flow version < bundle minFlowVersions[flowId]',
    ],

    machineComponents: [
      'Graph traversal blast radius calculation (depth-limited, cycle-safe)',
      'Bundle manifest scan after CASE A/C promotion',
      'minFlowVersions[flowId] version comparison logic',
      'DEGRADED status emit: storeDocument() before enqueue() (DNA-8)',
      'replayArbiterOnBundle() arbiter re-validation on bundle impact',
    ],

    freedomComponents: [
      'Graph traversal max depth (FREEDOM config key: blast_radius_promotion_threshold)',
      'Bundle manifest index name',
      'Promotion case classification rules (CASE A / B / C thresholds)',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

/**
 * T542 — ContextPackAssembler [ORCHESTRATION].
 *
 * PURPOSE: Assembles TTL-managed hybrid RAG context packs for each family iteration.
 *          Context pack TTL from FREEDOM config "flow33_context_pack_ttl_minutes".
 *          Stale ContextPack MUST NOT be reused across retry rounds (CF-747).
 *          Combines GraphRAG vector results + database metadata into structured context.
 *
 * F1342: IContextPackService → DATABASE FABRIC  (pack assembly, TTL management)
 * F1348: IRagService → RAG FABRIC  (hybrid RAG retrieval — reused from FLOW-29)
 *
 * IR-522-1: TTL from FREEDOM config — never hardcoded
 * IR-522-2: Stale pack detected by TTL — never reused (CF-747)
 */
export function createT542Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T542',
    flowId: 'FLOW-33',
    name: 'ContextPackAssembler',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Called by T539 before each family implementation attempt — fresh pack per retry round',
    purpose:
      'Assemble TTL-managed hybrid RAG context packs for family code generation. TTL from FREEDOM config "flow33_context_pack_ttl_minutes". Stale packs detected by TTL check — never reused across retry rounds (CF-747). Combines GraphRAG vector results with database metadata into structured ContextPack.',
    distinctFrom: 'T537 (builds the RAG index — T542 queries it to assemble packs for T539)',
    familyId: 'Family-201',

    factoryDependencies: [
      {
        factoryId: 'F1342',
        interfaceName: 'IContextPackService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Context pack assembly, TTL management, staleness detection',
      },
      {
        factoryId: 'F1348',
        interfaceName: 'IRagService',
        fabricType: FabricType.RAG,
        providerHint: 'elasticsearch',
        description: 'Hybrid RAG retrieval — reused from FLOW-29',
      },
    ],

    afStations: [
      ...META_ARBITRATION_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'rag_context',
        config: { promptKey: 'flow33.context_pack.assembler', useGraphRAG: true },
      },
    ],

    qualityGates: [
      ...META_ARBITRATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-33-14',
        description: 'Context pack TTL from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'freedom_config',
      },
      {
        gateId: 'QG-33-15',
        description: 'Stale context pack never reused across retry rounds (CF-747)',
        severity: 'error' as const,
        checkType: 'ttl_enforcement',
      },
    ],

    bfaRegistration: {
      entities: ['context_pack'],
      events: ['context_pack.assembled', 'context_pack.refreshed', 'context_pack.stale_detected'],
      apiRoutes: [],
    },

    ironRules: [
      ...META_ARBITRATION_IRON_RULES_CORE,
      'Context pack TTL MUST be read from FREEDOM config "flow33_context_pack_ttl_minutes" — never hardcoded',
      'Stale ContextPack (TTL expired) MUST be refreshed — reuse across retry rounds = score-0 (CF-747)',
    ],

    machineComponents: [
      'TTL staleness check: current time vs ttlExpiresAt field',
      'Hybrid RAG assembly: vector results merged with database metadata',
      'Stale pack refresh trigger on TTL expiry (CF-747)',
    ],

    freedomComponents: [
      'Context pack TTL (FREEDOM config key: flow33_context_pack_ttl_minutes)',
      'RAG result count per pack assembly',
      'Graph depth for GraphRAG queries',
    ],

    version: '1.0.0',
    stackCoupling: GENERATION_LOOP_STACK_COUPLING,
  });
}

// ── All FLOW-33 contracts ──────────────────────────────────────────────────

/** Factory functions array — matches FLOW31_CONTRACT_FACTORIES pattern. */
export const META_ARBITRATION_CONTRACT_FACTORIES = [
  createT536Contract,
  createT537Contract,
  createT538Contract,
  createT539Contract,
  createT540Contract,
  createT541Contract,
  createT542Contract,
];

/** Pre-constructed contracts array. */
export const META_ARBITRATION_CONTRACTS = META_ARBITRATION_CONTRACT_FACTORIES.map((f) => f());
