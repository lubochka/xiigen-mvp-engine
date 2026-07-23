import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-26 Engine Contracts — Self-Developing Meta-Flow Engine.
 * T389–T412 — 24 task types across 6 archetypes.
 *
 * T389: FlowSpecParser           [INGESTION]      — parse + normalize raw flow spec documents
 * T390: FlowSpecValidator        [INGESTION]      — validate spec against schema + BFA rules
 * T391: FlowDependencyMapper     [INGESTION]      — map inter-flow dependencies + conflict surface
 * T392: FlowTemplateResolver     [INGESTION]      — resolve code templates for new flow scaffold
 * T393: CodeScaffoldGenerator    [BUILD]          — generate NestJS service scaffold from spec
 * T394: ServiceCodeGenerator     [BUILD]          — generate full service implementation via AI
 * T395: TestCodeGenerator        [BUILD]          — generate unit + integration test suite
 * T396: ContractCodeEmitter      [BUILD]          — emit EngineContract TypeScript file
 * T397: CodeAssemblyOrchestrator [ORCHESTRATION]  — assemble generated files into deployable set
 * T398: DnaComplianceChecker     [ARBITRATION]    — verify generated code passes all 9 DNA rules
 * T399: BfaConflictScanner       [ARBITRATION]    — scan for BFA conflicts vs existing 31 flows
 * T400: FlowQualityGate          [GUARD]          — hard gate — all quality checks must pass
 * T401: SyntaxValidationRunner   [ARBITRATION]    — TypeScript syntax + type-check validation
 * T402: CrossFlowImpactAnalyzer  [IMPACT_ANALYSIS]— analyze cross-flow impact of new flow
 * T403: FlowRegistrationOrchestrator [ORCHESTRATION] — orchestrate full flow registration
 * T404: TaskTypeRegistrar        [BUILD]          — register new task types in TaskTypeRegistry
 * T405: FactoryRegistrar         [BUILD]          — register new factories in factory registry
 * T406: SeedPromptRegistrar      [BUILD]          — seed genesis prompts into PromptLibrary
 * T407: FlowDeploymentGate       [GUARD]          — hard gate before production deployment
 * T408: SelfExtensionLearner     [LEARNING]       — SCORE-0 async learner from flow outcomes
 * T409: FlowEvolutionTracker     [GOVERNANCE]     — track flow version evolution + changelog
 * T410: MetaFlowAuditEmitter     [GOVERNANCE]     — insert-only audit trail for meta-flow events
 * T411: ExtensionHealthScorer    [EVALUATION]     — score health of self-extension pipeline
 * T412: MetaFlowOrchestrator     [ORCHESTRATION]  — master orchestrator for full extension cycle
 *
 * Families: 154 (INGESTION), 155 (BUILD), 156 (ORCHESTRATION),
 *           157 (VALIDATION), 158 (REGISTRATION), 159 (META_LEARNING)
 * Factories: F1075–F1102
 * CF rules:  CF-502–CF-530
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const FLOW_EXTENSION_STACK_COUPLING: TaskTypeStackCoupling = {
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

const FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE = [
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

const FLOW_EXTENSION_ENGINE_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

// ── INGESTION — Family-154 ─────────────────────────────────────────────────

export function createT389Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T389',
    flowId: 'FLOW-26',
    name: 'FlowSpecParser',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered by meta-flow gateway when a new flow spec is submitted',
    purpose:
      'Parse and normalize raw flow spec documents into canonical FlowSpecDocument; validate required fields; store insert-only before emitting flow.spec.parsed event',
    distinctFrom: 'T390 (spec validation — T389 ingests, T390 validates against schema rules)',
    familyId: 'Family-154',
    factoryDependencies: [
      {
        factoryId: 'F1075',
        interfaceName: 'IFlowSpecStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only flow spec document writer',
      },
      {
        factoryId: 'F1076',
        interfaceName: 'IFlowSpecEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for flow.spec.parsed',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T389', tier: 2 },
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
          arbiters: ['dna', 'fabric', 'tenant', 'xiigen', 'ingestion::immutability'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['flow_spec_document'],
      events: ['flow.spec.parsed', 'flow.spec.rejected'],
      apiRoutes: ['/api/dynamic/flow26-spec-documents'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
      'Insert-only: duplicate specId returns existing without re-storing',
    ],
    machineComponents: ['specId generation (UUID)', 'insert-only write guard', 'outbox ordering'],
    freedomComponents: ['required spec fields list', 'max spec document size'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT390Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T390',
    flowId: 'FLOW-26',
    name: 'FlowSpecValidator',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after T389 emits flow.spec.parsed',
    purpose:
      'Validate flow spec against schema rules from FREEDOM config; check required task types, archetype assignments, factory count; store validation result; emit flow.spec.validated or flow.spec.invalid',
    distinctFrom: 'T389 (raw parse — T390 validates parsed spec against rules)',
    familyId: 'Family-154',
    factoryDependencies: [
      {
        factoryId: 'F1077',
        interfaceName: 'IFlowSpecValidationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Validation result document writer',
      },
      {
        factoryId: 'F1078',
        interfaceName: 'IFlowSpecValidationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for validation outcome',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T390', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'validation', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Validation rules come from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['flow_spec_validation'],
      events: ['flow.spec.validated', 'flow.spec.invalid'],
      apiRoutes: ['/api/dynamic/flow26-spec-validations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Validation rules MUST come from FREEDOM config (key: flow26_validation_rules)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['required field check', 'archetype enum enforcement', 'outbox ordering'],
    freedomComponents: [
      'flow26_validation_rules',
      'min_task_types_per_flow',
      'required_archetypes',
    ],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT391Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T391',
    flowId: 'FLOW-26',
    name: 'FlowDependencyMapper',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after flow spec validated',
    purpose:
      'Map inter-flow dependencies for the new flow spec; identify BFA entity + event overlaps; store dependency map; emit flow.dependencies.mapped',
    distinctFrom: 'T399 (BFA conflict scan — T391 maps deps, T399 detects conflicts)',
    familyId: 'Family-154',
    factoryDependencies: [
      {
        factoryId: 'F1079',
        interfaceName: 'IFlowDependencyStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Dependency map document store',
      },
      {
        factoryId: 'F1080',
        interfaceName: 'IFlowDependencyEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.dependencies.mapped publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T391', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['flow_dependency_map'],
      events: ['flow.dependencies.mapped'],
      apiRoutes: ['/api/dynamic/flow26-dependency-maps'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'dependency graph traversal',
      'entity overlap detection',
      'outbox ordering',
    ],
    freedomComponents: ['dependency_scan_depth', 'conflict_entity_types'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT392Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T392',
    flowId: 'FLOW-26',
    name: 'FlowTemplateResolver',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after dependencies mapped',
    purpose:
      'Resolve code generation templates for each task type in the new flow; reads template registry from FREEDOM config; store resolved template set; emit flow.templates.resolved',
    distinctFrom: 'T393 (scaffold generation — T392 resolves templates, T393 generates code)',
    familyId: 'Family-154',
    factoryDependencies: [
      {
        factoryId: 'F1081',
        interfaceName: 'IFlowTemplateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Template resolution result store',
      },
      {
        factoryId: 'F1082',
        interfaceName: 'IFlowTemplateEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.templates.resolved publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T392', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Template registry from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['flow_template_set'],
      events: ['flow.templates.resolved'],
      apiRoutes: ['/api/dynamic/flow26-template-sets'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Template registry MUST come from FREEDOM config (key: flow26_template_registry)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'archetype-to-template mapping',
      'missing template detection',
      'outbox ordering',
    ],
    freedomComponents: ['flow26_template_registry', 'default_template_per_archetype'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

// ── BUILD — Family-155 ─────────────────────────────────────────────────────

export function createT393Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T393',
    flowId: 'FLOW-26',
    name: 'CodeScaffoldGenerator',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after templates resolved',
    purpose:
      'Generate NestJS service scaffold (file structure, imports, class skeleton) from resolved templates; store scaffold document; emit flow.scaffold.generated',
    distinctFrom: 'T394 (full service code — T393 generates skeleton, T394 fills implementation)',
    familyId: 'Family-155',
    factoryDependencies: [
      {
        factoryId: 'F1083',
        interfaceName: 'ICodeScaffoldStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Generated scaffold document store',
      },
      {
        factoryId: 'F1084',
        interfaceName: 'ICodeScaffoldEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.scaffold.generated publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T393', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['build', 'dna_compliance', 'microservice_base'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Generated scaffold must extend MicroserviceBase (DNA-4)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['code_scaffold'],
      events: ['flow.scaffold.generated'],
      apiRoutes: ['/api/dynamic/flow26-code-scaffolds'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Generated scaffold MUST include MicroserviceBase extension (DNA-4)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['MicroserviceBase extension', 'import structure', 'outbox ordering'],
    freedomComponents: ['scaffold_template_config', 'import_style'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT394Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T394',
    flowId: 'FLOW-26',
    name: 'ServiceCodeGenerator',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after scaffold generated',
    purpose:
      'Generate full NestJS service implementation via AI; all methods must return DataProcessResult<T>; store generated code; emit flow.service.generated',
    distinctFrom: 'T393 (scaffold only — T394 generates full implementation logic)',
    familyId: 'Family-155',
    factoryDependencies: [
      {
        factoryId: 'F1085',
        interfaceName: 'IGeneratedServiceStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Generated service code document store',
      },
      {
        factoryId: 'F1086',
        interfaceName: 'IServiceCodeEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.service.generated publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T394', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['build', 'dna_compliance', 'data_process_result'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 12000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'tenant', 'xiigen', 'build::code-quality'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'All generated methods return DataProcessResult (DNA-3)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['generated_service_code'],
      events: ['flow.service.generated'],
      apiRoutes: ['/api/dynamic/flow26-generated-services'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'ALL generated methods MUST return DataProcessResult<T> — never throw (DNA-3)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['DataProcessResult wrapping', 'no-throw enforcement', 'outbox ordering'],
    freedomComponents: ['generation_model_hint', 'max_tokens_per_service'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT395Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T395',
    flowId: 'FLOW-26',
    name: 'TestCodeGenerator',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after service code generated',
    purpose:
      'Generate unit + integration test suite for the generated service; tests must cover UNSCOPED_QUERY, DNA-8 ordering, failure propagation; store test code; emit flow.tests.generated',
    distinctFrom: 'T394 (service code — T395 generates tests for that service)',
    familyId: 'Family-155',
    factoryDependencies: [
      {
        factoryId: 'F1087',
        interfaceName: 'IGeneratedTestStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Generated test code document store',
      },
      {
        factoryId: 'F1088',
        interfaceName: 'ITestCodeEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.tests.generated publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T395', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['build', 'testing', 'dna_compliance'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 10000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'xiigen', 'build::test-coverage'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Tests must cover UNSCOPED_QUERY, DNA-8 ordering, and failure propagation',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['generated_test_suite'],
      events: ['flow.tests.generated'],
      apiRoutes: ['/api/dynamic/flow26-generated-tests'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Generated tests MUST include UNSCOPED_QUERY, DNA-8 ordering, and DB failure tests',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['test pattern enforcement', 'mock factory pattern', 'outbox ordering'],
    freedomComponents: ['test_coverage_requirements', 'test_framework'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT396Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T396',
    flowId: 'FLOW-26',
    name: 'ContractCodeEmitter',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after service + test code generated',
    purpose:
      'Emit EngineContract TypeScript file for the new flow; uses correct bfaRegistration, machineComponents, freedomComponents shape; store contract code; emit flow.contract.emitted',
    distinctFrom:
      'T404 (registry insertion — T396 emits TS code, T404 registers in runtime registry)',
    familyId: 'Family-155',
    factoryDependencies: [
      {
        factoryId: 'F1089',
        interfaceName: 'IContractCodeStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Generated contract code document store',
      },
      {
        factoryId: 'F1090',
        interfaceName: 'IContractCodeEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.contract.emitted publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T396', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'xiigen', 'build::contract-shape'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'Contract uses bfaRegistration + machineComponents + freedomComponents (not legacy shape)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['contract_code_artifact'],
      events: ['flow.contract.emitted'],
      apiRoutes: ['/api/dynamic/flow26-contract-artifacts'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Contract MUST use bfaRegistration/machineComponents/freedomComponents — not bfaEntities/bfaEvents/bfaRoutes',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['contract shape validation', 'factory ID assignment', 'outbox ordering'],
    freedomComponents: ['contract_template_config'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT397Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T397',
    flowId: 'FLOW-26',
    name: 'CodeAssemblyOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered after all code artifacts generated',
    purpose:
      'Assemble scaffold + service + test + contract code artifacts into a complete deployable set; idempotent by flowId; store assembly record; emit flow.code.assembled',
    distinctFrom:
      'T403 (registration — T397 assembles code, T403 orchestrates runtime registration)',
    familyId: 'Family-156',
    factoryDependencies: [
      {
        factoryId: 'F1091',
        interfaceName: 'ICodeAssemblyStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Code assembly record store',
      },
      {
        factoryId: 'F1092',
        interfaceName: 'ICodeAssemblyEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.code.assembled publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T397', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent by flowId — second call returns existing assembly',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['code_assembly'],
      events: ['flow.code.assembled'],
      apiRoutes: ['/api/dynamic/flow26-code-assemblies'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent by flowId — duplicate returns existing WITHOUT re-assembling',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'idempotency check by flowId',
      'artifact completeness check',
      'outbox ordering',
    ],
    freedomComponents: ['required_artifact_types'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

// ── ARBITRATION / VALIDATION — Family-157 ─────────────────────────────────

export function createT398Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T398',
    flowId: 'FLOW-26',
    name: 'DnaComplianceChecker',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after code assembled',
    purpose:
      'Verify generated code passes all 9 DNA rules (DNA-1 through DNA-9); atomic set-if-not-exists idempotency by assemblyId (IScopedMemoryService.setIfAbsent()); store compliance report; emit flow.dna.checked',
    distinctFrom: 'T399 (BFA conflict scan — T398 checks DNA rules, T399 checks BFA conflicts)',
    familyId: 'Family-157',
    factoryDependencies: [
      {
        factoryId: 'F1093',
        interfaceName: 'IDnaComplianceStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'DNA compliance report store',
      },
      {
        factoryId: 'F1094',
        interfaceName: 'IDnaComplianceEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.dna.checked publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T398', tier: 2 },
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
          arbiters: ['dna', 'fabric', 'xiigen', 'arbitration::idempotency-lock'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'setIfAbsent idempotency by assemblyId — duplicate returns existing without re-checking (IScopedMemoryService.setIfAbsent())',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['dna_compliance_report'],
      events: ['flow.dna.checked', 'flow.dna.failed'],
      apiRoutes: ['/api/dynamic/flow26-dna-reports'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Atomic set-if-not-exists idempotency by assemblyId — no separate check+write (IScopedMemoryService.setIfAbsent() in Node.js; INSERT IGNORE in MySQL)',
      'storeDocument() BEFORE enqueue() — DNA-8',
      'All 9 DNA rules must be checked',
    ],
    machineComponents: [
      '9 DNA rule check set',
      'setIfAbsent idempotency (IScopedMemoryService)',
      'outbox ordering',
    ],
    freedomComponents: ['dna_rules_enabled', 'compliance_strictness'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT399Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T399',
    flowId: 'FLOW-26',
    name: 'BfaConflictScanner',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after DNA compliance passed',
    purpose:
      'Scan for BFA conflicts between new flow entities/events/routes and existing 31 flows; store scan report; emit flow.bfa.scanned',
    distinctFrom: 'T398 (DNA check — T399 scans BFA conflicts, T398 checks DNA rules)',
    familyId: 'Family-157',
    factoryDependencies: [
      {
        factoryId: 'F1095',
        interfaceName: 'IBfaScanStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'BFA scan report store',
      },
      {
        factoryId: 'F1096',
        interfaceName: 'IBfaScanEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.bfa.scanned publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T399', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'xiigen', 'arbitration::bfa-conflict'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'All 31 existing flows checked for entity/event/route conflicts',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['bfa_scan_report'],
      events: ['flow.bfa.scanned', 'flow.bfa.conflict.detected'],
      apiRoutes: ['/api/dynamic/flow26-bfa-scans'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'MUST check against all 31 existing flows',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'entity conflict detection',
      'event conflict detection',
      'route conflict detection',
      'outbox ordering',
    ],
    freedomComponents: ['conflict_severity_thresholds'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT400Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T400',
    flowId: 'FLOW-26',
    name: 'FlowQualityGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after DNA + BFA checks complete',
    purpose:
      'Hard gate — all quality checks must pass before proceeding; if any check failed: QUALITY_GATE_FAILED with no bypass; if all passed: store gate record + emit flow.quality.passed',
    distinctFrom: 'T407 (deployment gate — T400 checks quality, T407 gates deployment)',
    familyId: 'Family-157',
    factoryDependencies: [
      {
        factoryId: 'F1097',
        interfaceName: 'IQualityGateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Quality gate result store',
      },
      {
        factoryId: 'F1098',
        interfaceName: 'IQualityGateEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.quality.passed publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T400', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'HARD STOP — QUALITY_GATE_FAILED with no bypass path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['quality_gate_record'],
      events: ['flow.quality.passed'],
      apiRoutes: ['/api/dynamic/flow26-quality-gates'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'HARD STOP on any failed check — QUALITY_GATE_FAILED, NO bypass',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'all-checks-passed validation',
      'QUALITY_GATE_FAILED error code',
      'outbox ordering',
    ],
    freedomComponents: ['quality_gate_checks_required'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT401Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T401',
    flowId: 'FLOW-26',
    name: 'SyntaxValidationRunner',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered in parallel with DNA/BFA checks',
    purpose:
      'Validate TypeScript syntax and type correctness of generated code; store validation result; emit flow.syntax.validated or flow.syntax.failed',
    distinctFrom: 'T398 (DNA compliance — T401 validates syntax, T398 checks structural DNA rules)',
    familyId: 'Family-157',
    factoryDependencies: [
      {
        factoryId: 'F1099',
        interfaceName: 'ISyntaxValidationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Syntax validation result store',
      },
      {
        factoryId: 'F1100',
        interfaceName: 'ISyntaxValidationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.syntax.validated publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T401', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'TypeScript compiler errors reported as structured failures',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['syntax_validation_result'],
      events: ['flow.syntax.validated', 'flow.syntax.failed'],
      apiRoutes: ['/api/dynamic/flow26-syntax-validations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['TypeScript parse tree check', 'type error detection', 'outbox ordering'],
    freedomComponents: ['ts_compiler_options', 'strict_mode_enabled'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT402Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T402',
    flowId: 'FLOW-26',
    name: 'CrossFlowImpactAnalyzer',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after BFA scan',
    purpose:
      'Analyze cross-flow impact of adding new flow; assess severity for each conflict found; store impact report; emit flow.impact.analyzed',
    distinctFrom: 'T399 (raw conflict scan — T402 analyzes severity and resolution paths)',
    familyId: 'Family-157',
    factoryDependencies: [
      {
        factoryId: 'F1101',
        interfaceName: 'IImpactAnalysisStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Cross-flow impact analysis store',
      },
      {
        factoryId: 'F1102',
        interfaceName: 'IImpactAnalysisEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.impact.analyzed publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T402', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['impact_analysis', 'bfa'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'impact_analysis', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Impact severity scored for each conflict detected by T399',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['cross_flow_impact_report'],
      events: ['flow.impact.analyzed'],
      apiRoutes: ['/api/dynamic/flow26-impact-reports'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['severity classification', 'resolution path mapping', 'outbox ordering'],
    freedomComponents: ['impact_severity_thresholds'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

// ── REGISTRATION — Family-158 ──────────────────────────────────────────────

export function createT403Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T403',
    flowId: 'FLOW-26',
    name: 'FlowRegistrationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered after quality gate passed',
    purpose:
      'Orchestrate full flow registration: idempotent by flowId; triggers T404, T405, T406 in sequence; stores registration record; emits flow.registered',
    distinctFrom: 'T404/T405/T406 (individual registrars — T403 orchestrates the full sequence)',
    familyId: 'Family-158',
    factoryDependencies: [
      {
        factoryId: 'F1103',
        interfaceName: 'IFlowRegistrationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Flow registration record store',
      },
      {
        factoryId: 'F1104',
        interfaceName: 'IFlowRegistrationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.registered publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T403', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent by flowId — second call returns existing without re-registering',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['flow_registration_record'],
      events: ['flow.registered'],
      apiRoutes: ['/api/dynamic/flow26-registrations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent by flowId',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['idempotency by flowId', 'T404/T405/T406 sequencing', 'outbox ordering'],
    freedomComponents: ['registration_sequence_config'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT404Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T404',
    flowId: 'FLOW-26',
    name: 'TaskTypeRegistrar',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered by T403 orchestration sequence',
    purpose:
      'Register new task types from generated EngineContracts into TaskTypeRegistry; idempotent per taskTypeId; store registration record; emit task.types.registered',
    distinctFrom: 'T403 (full orchestration — T404 handles only task type registration)',
    familyId: 'Family-158',
    factoryDependencies: [
      {
        factoryId: 'F1105',
        interfaceName: 'ITaskTypeRegistrationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Task type registration record store',
      },
      {
        factoryId: 'F1106',
        interfaceName: 'ITaskTypeRegistrationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'task.types.registered publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T404', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent per taskTypeId — skip existing without error',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['task_type_registration'],
      events: ['task.types.registered'],
      apiRoutes: ['/api/dynamic/flow26-task-type-registrations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent per taskTypeId — no duplicate registrations',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['duplicate taskTypeId check', 'registry write', 'outbox ordering'],
    freedomComponents: ['task_type_registry_config'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT405Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T405',
    flowId: 'FLOW-26',
    name: 'FactoryRegistrar',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered by T403 orchestration sequence',
    purpose:
      'Register new factories from generated contracts into factory registry; idempotent per factoryId; store registration record; emit factories.registered',
    distinctFrom: 'T404 (task types — T405 handles factory registration)',
    familyId: 'Family-158',
    factoryDependencies: [
      {
        factoryId: 'F1107',
        interfaceName: 'IFactoryRegistrationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Factory registration record store',
      },
      {
        factoryId: 'F1108',
        interfaceName: 'IFactoryRegistrationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'factories.registered publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T405', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent per factoryId — skip existing without error',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['factory_registration'],
      events: ['factories.registered'],
      apiRoutes: ['/api/dynamic/flow26-factory-registrations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent per factoryId — no duplicate registrations',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['duplicate factoryId check', 'fabric type validation', 'outbox ordering'],
    freedomComponents: ['factory_registry_config'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT406Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T406',
    flowId: 'FLOW-26',
    name: 'SeedPromptRegistrar',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered by T403 orchestration sequence',
    purpose:
      'Seed genesis prompts from generated seed prompt arrays into PromptLibrary; idempotent per (taskType, flow_id) compound key; store seeding record; emit seed.prompts.registered',
    distinctFrom: 'T404/T405 (type/factory registration — T406 handles prompt seeding)',
    familyId: 'Family-158',
    factoryDependencies: [
      {
        factoryId: 'F1109',
        interfaceName: 'ISeedPromptStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Seed prompt seeding record store',
      },
      {
        factoryId: 'F1110',
        interfaceName: 'ISeedPromptEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'seed.prompts.registered publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T406', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent by (taskType, flow_id) — no duplicate seeding',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['seed_prompt_registration'],
      events: ['seed.prompts.registered'],
      apiRoutes: ['/api/dynamic/flow26-seed-prompt-registrations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent by (taskType, flow_id) compound key',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      '(taskType, flow_id) dedup check',
      'FLOW_SCOPED connection_type enforcement',
      'outbox ordering',
    ],
    freedomComponents: ['prompt_library_index_config'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT407Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T407',
    flowId: 'FLOW-26',
    name: 'FlowDeploymentGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after full registration complete',
    purpose:
      'Hard gate before production deployment; verifies T398/T399/T400/T401/T402 all passed for this flowId; FLOW_DEPLOYMENT_BLOCKED if any check missing; on pass: store gate record + emit flow.deployment.approved',
    distinctFrom: 'T400 (quality gate — T407 is the final deployment gate after registration)',
    familyId: 'Family-158',
    factoryDependencies: [
      {
        factoryId: 'F1111',
        interfaceName: 'IDeploymentGateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Deployment gate record store',
      },
      {
        factoryId: 'F1112',
        interfaceName: 'IDeploymentGateEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.deployment.approved publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T407', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'HARD STOP — FLOW_DEPLOYMENT_BLOCKED if any validation check is missing',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['deployment_gate_record'],
      events: ['flow.deployment.approved'],
      apiRoutes: ['/api/dynamic/flow26-deployment-gates'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'FLOW_DEPLOYMENT_BLOCKED if T398/T399/T400/T401/T402 not all passed — NO bypass',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'prerequisite check set',
      'FLOW_DEPLOYMENT_BLOCKED error code',
      'outbox ordering',
    ],
    freedomComponents: ['required_pre_deployment_checks'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

// ── META_LEARNING — Family-159 ─────────────────────────────────────────────

export function createT408Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T408',
    flowId: 'FLOW-26',
    name: 'SelfExtensionLearner',
    archetype: ContractArchetype.LEARNING,
    entry: 'SCORE-0 ASYNC-ONLY: triggered via queue consumer after flow deployment outcome',
    purpose:
      'SCORE-0 async: learns from generated flow outcomes (success/failure patterns); aggregates generation quality metrics; stores learning record; emits self.extension.learned',
    distinctFrom: 'T411 (health scorer — T408 learns from outcomes, T411 scores pipeline health)',
    familyId: 'Family-159',
    factoryDependencies: [
      {
        factoryId: 'F1113',
        interfaceName: 'ISelfExtensionLearningStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Learning record store',
      },
      {
        factoryId: 'F1114',
        interfaceName: 'ISelfExtensionLearningEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'self.extension.learned publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T408', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 6000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'xiigen', 'learning::async-only'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'ASYNC-ONLY — MUST only be triggered via queue consumer, never on live path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['self_extension_learning_record'],
      events: ['self.extension.learned'],
      apiRoutes: ['/api/dynamic/flow26-learning-records'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'ASYNC-ONLY — never on live request path (SCORE-0)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['async-only enforcement', 'outcome pattern aggregation', 'outbox ordering'],
    freedomComponents: ['learning_retention_period', 'outcome_aggregation_window'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT409Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T409',
    flowId: 'FLOW-26',
    name: 'FlowEvolutionTracker',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered after flow deployed or updated',
    purpose:
      'Track flow version evolution; record version changelog (insert-only); store evolution record; emit flow.evolution.tracked',
    distinctFrom: 'T410 (audit emitter — T409 tracks versions, T410 records all meta-flow events)',
    familyId: 'Family-159',
    factoryDependencies: [
      {
        factoryId: 'F1115',
        interfaceName: 'IFlowEvolutionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only flow evolution record store',
      },
      {
        factoryId: 'F1116',
        interfaceName: 'IFlowEvolutionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'flow.evolution.tracked publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T409', tier: 2 },
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
          arbiters: ['dna', 'fabric', 'xiigen', 'governance::immutability'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Evolution records are INSERT-ONLY — never update or delete',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['flow_evolution_record'],
      events: ['flow.evolution.tracked'],
      apiRoutes: ['/api/dynamic/flow26-evolution-records'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Evolution records IMMUTABLE — insert-only, no updates, no deletes',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['insert-only write guard', 'version increment logic', 'outbox ordering'],
    freedomComponents: ['evolution_changelog_format'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT410Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T410',
    flowId: 'FLOW-26',
    name: 'MetaFlowAuditEmitter',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered on any meta-flow lifecycle event',
    purpose:
      'Insert-only audit trail for all meta-flow events (generation, validation, registration, deployment); store audit record; emit meta.flow.audit.recorded',
    distinctFrom:
      'T409 (version tracking — T410 records all meta-flow events, T409 tracks versions)',
    familyId: 'Family-159',
    factoryDependencies: [
      {
        factoryId: 'F1117',
        interfaceName: 'IMetaFlowAuditStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only meta-flow audit store',
      },
      {
        factoryId: 'F1118',
        interfaceName: 'IMetaFlowAuditEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'meta.flow.audit.recorded publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T410', tier: 2 },
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
          arbiters: ['dna', 'fabric', 'xiigen', 'governance::immutability'],
        },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Audit records IMMUTABLE — insert-only, no updates, no deletes',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['meta_flow_audit_record'],
      events: ['meta.flow.audit.recorded'],
      apiRoutes: ['/api/dynamic/flow26-audit-records'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Audit records IMMUTABLE — insert-only, no updates, no deletes',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['insert-only write guard', 'auditId UUID generation', 'outbox ordering'],
    freedomComponents: ['audit_retention_period'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT411Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T411',
    flowId: 'FLOW-26',
    name: 'ExtensionHealthScorer',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered periodically or after each flow generation cycle',
    purpose:
      'Score health of the self-extension pipeline (0.0–1.0) based on generation success rate, validation pass rate, BFA conflict rate; store health score; emit extension.health.scored',
    distinctFrom:
      'T408 (learner — T411 scores pipeline health, T408 learns from individual outcomes)',
    familyId: 'Family-159',
    factoryDependencies: [
      {
        factoryId: 'F1119',
        interfaceName: 'IExtensionHealthStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Extension health score store',
      },
      {
        factoryId: 'F1120',
        interfaceName: 'IExtensionHealthEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'extension.health.scored publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T411', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'evaluation', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Health score MUST be in range 0.0–1.0 (inclusive)',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['extension_health_score'],
      events: ['extension.health.scored'],
      apiRoutes: ['/api/dynamic/flow26-health-scores'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Health score MUST be in range 0.0–1.0 (inclusive)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['0.0–1.0 range enforcement', 'multi-signal aggregation', 'outbox ordering'],
    freedomComponents: ['health_score_weights', 'score_window_days'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

export function createT412Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T412',
    flowId: 'FLOW-26',
    name: 'MetaFlowOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when a new flow extension request is submitted',
    purpose:
      'Master orchestrator for full self-extension cycle: idempotent by extensionRequestId; coordinates spec→build→validate→register→deploy phases; stores orchestration record; emits meta.flow.cycle.complete',
    distinctFrom: 'T403 (registration only — T412 orchestrates the entire extension lifecycle)',
    familyId: 'Family-159',
    factoryDependencies: [
      {
        factoryId: 'F1121',
        interfaceName: 'IMetaFlowOrchestrationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Meta-flow orchestration record store',
      },
      {
        factoryId: 'F1122',
        interfaceName: 'IMetaFlowOrchestrationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'meta.flow.cycle.complete publisher',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow26', taskType: 'T412', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 8000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...FLOW_EXTENSION_ENGINE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Idempotent by extensionRequestId — second call returns existing cycle',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['meta_flow_orchestration'],
      events: ['meta.flow.cycle.complete'],
      apiRoutes: ['/api/dynamic/flow26-orchestrations'],
    },
    ironRules: [
      ...FLOW_EXTENSION_ENGINE_IRON_RULES_CORE,
      'Idempotent by extensionRequestId — QUEUED on duplicate',
      'storeDocument() BEFORE enqueue() — DNA-8',
      'Returns QUEUED immediately — never blocks for pipeline completion',
    ],
    machineComponents: [
      'idempotency by extensionRequestId',
      'phase sequencing',
      'QUEUED status',
      'outbox ordering',
    ],
    freedomComponents: ['phase_execution_config', 'extension_timeout_minutes'],
    stackCoupling: FLOW_EXTENSION_STACK_COUPLING,
  });
}

/** All FLOW-26 contract factories in task-type order. */
export const FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES: Array<() => EngineContract> = [
  createT389Contract,
  createT390Contract,
  createT391Contract,
  createT392Contract,
  createT393Contract,
  createT394Contract,
  createT395Contract,
  createT396Contract,
  createT397Contract,
  createT398Contract,
  createT399Contract,
  createT400Contract,
  createT401Contract,
  createT402Contract,
  createT403Contract,
  createT404Contract,
  createT405Contract,
  createT406Contract,
  createT407Contract,
  createT408Contract,
  createT409Contract,
  createT410Contract,
  createT411Contract,
  createT412Contract,
];
