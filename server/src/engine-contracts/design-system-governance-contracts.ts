import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-31 Engine Contracts — Design Intelligence Engine.
 * T489–T515 — 27 task types across 6 families.
 *
 * T489: DesignSpecIngester          [INGESTION]       — ingest + normalize raw design specs
 * T490: ComponentMapParser          [INGESTION]       — parse component hierarchy maps
 * T491: DesignTokenExtractor        [INGESTION]       — extract design tokens (color, spacing, type)
 * T492: DesignContextBuilder        [INGESTION]       — build contextual metadata for design assets
 * T493: DesignPatternParser         [INGESTION]       — parse reusable design patterns
 * T494: DesignConflictDetector      [ARBITRATION]     — detect design conflicts with existing patterns
 * T495: ComponentCompatibilityChecker [ARBITRATION]  — check component compatibility
 * T496: DesignRuleValidator         [ARBITRATION]     — validate against design system rules
 * T497: TokenConflictScanner        [ARBITRATION]     — scan for token naming conflicts
 * T498: DesignDebtAnalyzer          [IMPACT_ANALYSIS] — analyze accumulated design debt
 * T499: DesignQualityGate           [GUARD]           — hard gate on design quality score
 * T500: ComponentSchemaGate         [GUARD]           — validate component schema compliance
 * T501: TokenConsistencyGate        [GUARD]           — ensure token consistency across system
 * T502: DesignComplexityAnalyzer    [EVALUATION]      — score design complexity
 * T503: ArchitectureScorer          [EVALUATION]      — score overall architecture quality
 * T504: DesignDecisionLogger        [GOVERNANCE]      — INSERT-ONLY design decisions log
 * T505: TokenLibraryUpdater         [BUILD]           — update token library in registry
 * T506: ComponentCatalogUpdater     [BUILD]           — update component catalog
 * T507: DesignVersionTracker        [GOVERNANCE]      — track design version history (INSERT-ONLY)
 * T508: DesignChangeEmitter         [BUILD]           — emit design change events
 * T509: DesignHealthScorer          [EVALUATION]      — score design system health
 * T510: DesignFeedbackLearner       [LEARNING]        — SCORE-0 async learner from design outcomes
 * T511: CrossDesignImpactAnalyzer   [IMPACT_ANALYSIS] — analyze cross-component impact
 * T512: DesignEvolutionTracker      [GOVERNANCE]      — track design evolution history
 * T513: DesignPublishOrchestrator   [ORCHESTRATION]   — orchestrate design publication
 * T514: DesignDeploymentGate        [GUARD]           — hard gate before design deployment
 * T515: MetaDesignOrchestrator      [ORCHESTRATION]   — top-level meta-design orchestrator
 *
 * Families: 191 (INGESTION), 192 (ANALYSIS), 193 (QUALITY_GATES),
 *           194 (BUILD_GOVERNANCE), 195 (LEARNING_IMPACT), 196 (ORCHESTRATION)
 * Factories: F1271–F1329
 * CF rules:  CF-531–CF-557
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const DESIGN_GOVERNANCE_STACK_COUPLING: TaskTypeStackCoupling = {
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

const DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE = [
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

const DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

// ── INGESTION — Family-191 ─────────────────────────────────────────────────

export function createT489Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T489',
    flowId: 'FLOW-31',
    name: 'DesignSpecIngester',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered by design-intelligence gateway when a new design spec is submitted',
    purpose:
      'Ingest and normalize raw design spec documents (Figma exports, JSON/YAML specs) into canonical DesignSpecDocument; store insert-only; emit design.spec.ingested',
    distinctFrom:
      'T490 (component parsing — T489 ingests raw spec, T490 parses component hierarchy)',
    familyId: 'Family-191',
    factoryDependencies: [
      {
        factoryId: 'F1271',
        interfaceName: 'IDesignSpecStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only design spec document store',
      },
      {
        factoryId: 'F1272',
        interfaceName: 'IDesignSpecEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.spec.ingested',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T489', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['ingestion', 'design_patterns', 'outbox_pattern'],
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
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['design_spec'],
      events: ['design.spec.ingested', 'design.spec.rejected'],
      apiRoutes: ['/api/dynamic/flow31-design-specs'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
      'Insert-only: duplicate specId returns existing without re-storing',
    ],
    machineComponents: ['specId generation (UUID)', 'insert-only write guard', 'outbox ordering'],
    freedomComponents: [
      'required spec fields list',
      'max spec document size',
      'supported spec formats',
    ],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT490Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T490',
    flowId: 'FLOW-31',
    name: 'ComponentMapParser',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after T489 emits design.spec.ingested',
    purpose:
      'Parse component hierarchy maps from ingested design spec; extract component tree, relationships, and props; store component map; emit design.components.parsed',
    distinctFrom: 'T489 (ingestion — T490 parses component structure from normalized spec)',
    familyId: 'Family-191',
    factoryDependencies: [
      {
        factoryId: 'F1273',
        interfaceName: 'IComponentMapStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Component map document store',
      },
      {
        factoryId: 'F1274',
        interfaceName: 'IComponentMapEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.components.parsed',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T490', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['component_map'],
      events: ['design.components.parsed'],
      apiRoutes: ['/api/dynamic/flow31-component-maps'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['component tree traversal', 'relationship extraction', 'outbox ordering'],
    freedomComponents: ['component_hierarchy_depth', 'required_component_props'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT491Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T491',
    flowId: 'FLOW-31',
    name: 'DesignTokenExtractor',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after component map parsed',
    purpose:
      'Extract design tokens (colors, spacing, typography, shadows) from design spec; normalize to token registry format; store token document; emit design.tokens.extracted',
    distinctFrom:
      'T505 (token library update — T491 extracts raw tokens, T505 updates the registry)',
    familyId: 'Family-191',
    factoryDependencies: [
      {
        factoryId: 'F1275',
        interfaceName: 'IDesignTokenStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Raw token extraction result store',
      },
      {
        factoryId: 'F1276',
        interfaceName: 'IDesignTokenEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.tokens.extracted',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T491', tier: 2 },
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
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['token'],
      events: ['design.tokens.extracted'],
      apiRoutes: ['/api/dynamic/flow31-tokens'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['token type classification', 'value normalization', 'outbox ordering'],
    freedomComponents: ['token_categories', 'token_naming_convention', 'token_value_formats'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT492Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T492',
    flowId: 'FLOW-31',
    name: 'DesignContextBuilder',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after tokens extracted',
    purpose:
      'Build contextual metadata for design assets: usage context, design system version, team ownership, accessibility annotations; store context doc; emit design.context.built',
    distinctFrom: 'T489 (raw ingestion — T492 enriches with contextual metadata)',
    familyId: 'Family-191',
    factoryDependencies: [
      {
        factoryId: 'F1277',
        interfaceName: 'IDesignContextStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Design context document store',
      },
      {
        factoryId: 'F1278',
        interfaceName: 'IDesignContextEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.context.built',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T492', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_context'],
      events: ['design.context.built'],
      apiRoutes: ['/api/dynamic/flow31-design-contexts'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['context enrichment logic', 'outbox ordering'],
    freedomComponents: ['context_metadata_fields', 'design_system_versions'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT493Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T493',
    flowId: 'FLOW-31',
    name: 'DesignPatternParser',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered after context built',
    purpose:
      'Parse and catalog reusable design patterns (layout grids, card patterns, navigation patterns) from ingested spec; store pattern catalog entry; emit design.patterns.parsed',
    distinctFrom: 'T494 (conflict detection — T493 catalogs patterns, T494 detects conflicts)',
    familyId: 'Family-191',
    factoryDependencies: [
      {
        factoryId: 'F1279',
        interfaceName: 'IDesignPatternStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Design pattern catalog store',
      },
      {
        factoryId: 'F1280',
        interfaceName: 'IDesignPatternEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.patterns.parsed',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T493', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_pattern'],
      events: ['design.patterns.parsed'],
      apiRoutes: ['/api/dynamic/flow31-design-patterns'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['pattern classification engine', 'outbox ordering'],
    freedomComponents: ['pattern_categories', 'pattern_matching_rules'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── ANALYSIS — Family-192 ──────────────────────────────────────────────────

export function createT494Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T494',
    flowId: 'FLOW-31',
    name: 'DesignConflictDetector',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after design patterns parsed',
    purpose:
      'Detect conflicts between incoming design spec and existing registered design patterns; hard stop on DESIGN_CONFLICT_DETECTED; store scan result; emit design.conflict.detected or design.conflict.clear',
    distinctFrom:
      'T497 (token conflicts — T494 detects structural design conflicts, T497 scans token name conflicts)',
    familyId: 'Family-192',
    factoryDependencies: [
      {
        factoryId: 'F1281',
        interfaceName: 'IDesignConflictStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Conflict scan result + existing pattern registry reader',
      },
      {
        factoryId: 'F1282',
        interfaceName: 'IDesignConflictEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for conflict outcome',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T494', tier: 2 },
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
          arbiters: ['dna', 'fabric', 'xiigen', 'arbitration::hard_stop'],
        },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'DESIGN_CONFLICT_DETECTED must be a hard stop — no bypass',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['design_conflict_scan'],
      events: ['design.conflict.detected', 'design.conflict.clear'],
      apiRoutes: ['/api/dynamic/flow31-conflict-scans'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'DESIGN_CONFLICT_DETECTED is a HARD STOP — no bypass path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['conflict detection algorithm', 'hard stop enforcement', 'outbox ordering'],
    freedomComponents: ['conflict_severity_thresholds', 'allowed_overlap_types'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT495Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T495',
    flowId: 'FLOW-31',
    name: 'ComponentCompatibilityChecker',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after conflict detection passes',
    purpose:
      'Check compatibility of new components against existing component catalog; verify prop interfaces, slot contracts, and style contracts; emit design.components.compatible or design.components.incompatible',
    distinctFrom:
      'T494 (design conflicts — T495 checks component-level compatibility, not structural conflicts)',
    familyId: 'Family-192',
    factoryDependencies: [
      {
        factoryId: 'F1283',
        interfaceName: 'IComponentCompatStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Compatibility check result + catalog reader',
      },
      {
        factoryId: 'F1284',
        interfaceName: 'IComponentCompatEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for compatibility outcome',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T495', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['component_compatibility_check'],
      events: ['design.components.compatible', 'design.components.incompatible'],
      apiRoutes: ['/api/dynamic/flow31-compat-checks'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['prop interface comparison', 'slot contract validation', 'outbox ordering'],
    freedomComponents: ['compatibility_rules', 'breaking_change_definitions'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT496Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T496',
    flowId: 'FLOW-31',
    name: 'DesignRuleValidator',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after compatibility check passes',
    purpose:
      'Validate design spec against design system rules from FREEDOM config; rules include accessibility (WCAG), spacing scales, color contrast; store validation result; emit design.rules.validated or design.rules.violated',
    distinctFrom: 'T495 (compatibility — T496 validates against explicit design rules from config)',
    familyId: 'Family-192',
    factoryDependencies: [
      {
        factoryId: 'F1285',
        interfaceName: 'IDesignRuleStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Rule validation result store',
      },
      {
        factoryId: 'F1286',
        interfaceName: 'IDesignRuleEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for validation outcome',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T496', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Design rules MUST come from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['design_rule_validation'],
      events: ['design.rules.validated', 'design.rules.violated'],
      apiRoutes: ['/api/dynamic/flow31-rule-validations'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'Design rules MUST come from FREEDOM config (key: flow31_design_rules)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['rule evaluation engine', 'outbox ordering'],
    freedomComponents: ['flow31_design_rules', 'wcag_compliance_level', 'spacing_scale_values'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT497Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T497',
    flowId: 'FLOW-31',
    name: 'TokenConflictScanner',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered after design rules validated',
    purpose:
      'Scan for token naming conflicts between incoming tokens and existing token library; hard stop on TOKEN_CONFLICT_DETECTED; store scan result; emit design.tokens.conflict or design.tokens.clear',
    distinctFrom: 'T494 (design conflicts — T497 specifically scans token name/value conflicts)',
    familyId: 'Family-192',
    factoryDependencies: [
      {
        factoryId: 'F1287',
        interfaceName: 'ITokenConflictStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Token conflict scan result + existing token library reader',
      },
      {
        factoryId: 'F1288',
        interfaceName: 'ITokenConflictEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for token conflict outcome',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T497', tier: 2 },
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
        config: {
          strict_mode: true,
          arbiters: ['dna', 'fabric', 'xiigen', 'arbitration::hard_stop'],
        },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'TOKEN_CONFLICT_DETECTED must be a hard stop — no bypass',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['token_conflict_scan'],
      events: ['design.tokens.conflict', 'design.tokens.clear'],
      apiRoutes: ['/api/dynamic/flow31-token-conflict-scans'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'TOKEN_CONFLICT_DETECTED is a HARD STOP — no bypass path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'token name deduplication check',
      'hard stop enforcement',
      'outbox ordering',
    ],
    freedomComponents: ['token_conflict_check_scope', 'allowed_token_overrides'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT498Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T498',
    flowId: 'FLOW-31',
    name: 'DesignDebtAnalyzer',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after token scan passes',
    purpose:
      'Analyze accumulated design debt: inconsistencies, deprecated patterns, accessibility violations, orphaned tokens; produce debt score and impact report; emit design.debt.analyzed',
    distinctFrom: 'T511 (cross-design impact — T498 analyzes accumulated technical design debt)',
    familyId: 'Family-192',
    factoryDependencies: [
      {
        factoryId: 'F1289',
        interfaceName: 'IDesignDebtStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Design debt report store',
      },
      {
        factoryId: 'F1290',
        interfaceName: 'IDesignDebtEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.debt.analyzed',
      },
      {
        factoryId: 'F1291',
        interfaceName: 'IDesignDebtConfig',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM config reader for debt thresholds',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T498', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_debt_report'],
      events: ['design.debt.analyzed'],
      apiRoutes: ['/api/dynamic/flow31-debt-reports'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'debt score calculation',
      'deprecated pattern detection',
      'outbox ordering',
    ],
    freedomComponents: ['flow31_debt_thresholds', 'deprecated_pattern_list', 'debt_score_weights'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── QUALITY GATES — Family-193 ─────────────────────────────────────────────

export function createT499Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T499',
    flowId: 'FLOW-31',
    name: 'DesignQualityGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after debt analysis; hard gate before build pipeline',
    purpose:
      'Hard gate: block design pipeline if overall quality score below FREEDOM config thresholds; DESIGN_QUALITY_GATE_FAILED hard stop — no bypass; on pass: store gate result; emit design.quality.passed',
    distinctFrom:
      'T500 (component schema gate — T499 is the overall quality gate, T500 checks component schema specifically)',
    familyId: 'Family-193',
    factoryDependencies: [
      {
        factoryId: 'F1292',
        interfaceName: 'IDesignQualityGateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Quality gate result store',
      },
      {
        factoryId: 'F1293',
        interfaceName: 'IDesignQualityGateEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.quality.passed',
      },
      {
        factoryId: 'F1294',
        interfaceName: 'IDesignQualityConfig',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'FREEDOM config reader for quality thresholds',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T499', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::no_bypass'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'DESIGN_QUALITY_GATE_FAILED must be a hard stop — no bypass',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
      {
        gateId: 'QG-07',
        description: 'Thresholds from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['design_quality_gate_result'],
      events: ['design.quality.passed', 'design.quality.failed'],
      apiRoutes: ['/api/dynamic/flow31-quality-gates'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'DESIGN_QUALITY_GATE_FAILED is a HARD STOP — no bypass path',
      'Thresholds MUST come from FREEDOM config (key: flow31_quality_thresholds)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['threshold evaluation', 'hard stop enforcement', 'outbox ordering'],
    freedomComponents: ['flow31_quality_thresholds', 'min_design_score', 'min_accessibility_score'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT500Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T500',
    flowId: 'FLOW-31',
    name: 'ComponentSchemaGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after quality gate passes',
    purpose:
      'Validate that all new components conform to component schema (required props, slot definitions, event contracts); COMPONENT_SCHEMA_INVALID hard stop; emit design.schema.valid',
    distinctFrom:
      'T499 (overall quality gate — T500 specifically validates component schema compliance)',
    familyId: 'Family-193',
    factoryDependencies: [
      {
        factoryId: 'F1295',
        interfaceName: 'IComponentSchemaStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Component schema validation result store',
      },
      {
        factoryId: 'F1296',
        interfaceName: 'IComponentSchemaEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.schema.valid',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T500', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::no_bypass'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'COMPONENT_SCHEMA_INVALID must be a hard stop',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['component_schema_validation'],
      events: ['design.schema.valid', 'design.schema.invalid'],
      apiRoutes: ['/api/dynamic/flow31-schema-validations'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'COMPONENT_SCHEMA_INVALID is a HARD STOP — no bypass path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['required prop enforcement', 'hard stop enforcement', 'outbox ordering'],
    freedomComponents: ['component_schema_registry', 'required_slot_definitions'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT501Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T501',
    flowId: 'FLOW-31',
    name: 'TokenConsistencyGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Triggered after component schema gate passes',
    purpose:
      'Ensure all token references in components point to valid tokens in the token library; TOKEN_REFERENCE_BROKEN hard stop on invalid references; emit design.tokens.consistent',
    distinctFrom:
      'T497 (token conflicts — T501 checks referential integrity of token usage, T497 scans for name conflicts)',
    familyId: 'Family-193',
    factoryDependencies: [
      {
        factoryId: 'F1297',
        interfaceName: 'ITokenConsistencyStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Token consistency check result store',
      },
      {
        factoryId: 'F1298',
        interfaceName: 'ITokenConsistencyEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.tokens.consistent',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T501', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::no_bypass'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'TOKEN_REFERENCE_BROKEN must be a hard stop',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['token_consistency_check'],
      events: ['design.tokens.consistent', 'design.tokens.broken'],
      apiRoutes: ['/api/dynamic/flow31-token-consistency-checks'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'TOKEN_REFERENCE_BROKEN is a HARD STOP — no bypass path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['token reference resolution', 'hard stop enforcement', 'outbox ordering'],
    freedomComponents: ['strict_token_mode', 'allowed_unresolved_tokens'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT502Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T502',
    flowId: 'FLOW-31',
    name: 'DesignComplexityAnalyzer',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered after token consistency gate passes',
    purpose:
      'Score design complexity: component tree depth, prop count, token usage breadth, pattern reuse ratio; produce complexity score 0.0–1.0; emit design.complexity.scored',
    distinctFrom:
      'T503 (architecture scoring — T502 scores design complexity, T503 scores overall architecture quality)',
    familyId: 'Family-193',
    factoryDependencies: [
      {
        factoryId: 'F1299',
        interfaceName: 'IDesignComplexityStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Complexity score document store',
      },
      {
        factoryId: 'F1300',
        interfaceName: 'IDesignComplexityEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.complexity.scored',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T502', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_complexity_score'],
      events: ['design.complexity.scored'],
      apiRoutes: ['/api/dynamic/flow31-complexity-scores'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['complexity algorithm (depth × breadth × prop count)', 'outbox ordering'],
    freedomComponents: ['complexity_weight_factors', 'complexity_thresholds'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT503Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T503',
    flowId: 'FLOW-31',
    name: 'ArchitectureScorer',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered after complexity analyzed',
    purpose:
      'Score overall design system architecture quality: consistency, reusability, accessibility compliance, pattern adherence; produce architecture score 0.0–1.0 with STRONG/ADEQUATE/WEAK classification; emit design.architecture.scored',
    distinctFrom:
      'T502 (complexity — T503 scores holistic architecture quality, not just complexity)',
    familyId: 'Family-193',
    factoryDependencies: [
      {
        factoryId: 'F1301',
        interfaceName: 'IArchitectureScoreStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Architecture score document store',
      },
      {
        factoryId: 'F1302',
        interfaceName: 'IArchitectureScoreEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.architecture.scored',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T503', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['architecture_score'],
      events: ['design.architecture.scored'],
      apiRoutes: ['/api/dynamic/flow31-architecture-scores'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'weighted scoring algorithm',
      'classification (STRONG/ADEQUATE/WEAK)',
      'outbox ordering',
    ],
    freedomComponents: ['architecture_score_weights', 'classification_thresholds'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── BUILD/GOVERNANCE — Family-194 ─────────────────────────────────────────

export function createT504Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T504',
    flowId: 'FLOW-31',
    name: 'DesignDecisionLogger',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered after architecture scored',
    purpose:
      'INSERT-ONLY log of design decisions: rationale, trade-offs, rejected alternatives, stakeholder approvals; immutable audit trail; emit design.decision.logged',
    distinctFrom:
      'T507 (version tracking — T504 logs decision rationale, T507 tracks version changes)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1303',
        interfaceName: 'IDesignDecisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'INSERT-ONLY design decision log store',
      },
      {
        factoryId: 'F1304',
        interfaceName: 'IDesignDecisionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.decision.logged',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T504', tier: 2 },
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
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Decisions must be INSERT-ONLY — no update or delete',
        severity: 'error' as const,
        checkType: 'governance_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['design_decision'],
      events: ['design.decision.logged'],
      apiRoutes: ['/api/dynamic/flow31-design-decisions'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'INSERT-ONLY: no update or delete on design decisions',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['insert-only write guard', 'decision audit trail', 'outbox ordering'],
    freedomComponents: ['required_decision_fields', 'decision_categories'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT505Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T505',
    flowId: 'FLOW-31',
    name: 'TokenLibraryUpdater',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after design decisions logged',
    purpose:
      'Update the token library registry with newly extracted and validated tokens; idempotent by (tenantId, specId); store updated library snapshot; emit design.tokens.library.updated',
    distinctFrom:
      'T491 (extraction — T505 persists extracted tokens to the shared library registry)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1305',
        interfaceName: 'ITokenLibraryStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Token library registry store',
      },
      {
        factoryId: 'F1306',
        interfaceName: 'ITokenLibraryEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.tokens.library.updated',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T505', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['token_library'],
      events: ['design.tokens.library.updated'],
      apiRoutes: ['/api/dynamic/flow31-token-library'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
      'Idempotent by (tenantId, specId)',
    ],
    machineComponents: ['idempotency guard', 'token merge algorithm', 'outbox ordering'],
    freedomComponents: ['token_library_merge_strategy', 'token_version_format'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT506Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T506',
    flowId: 'FLOW-31',
    name: 'ComponentCatalogUpdater',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after token library updated',
    purpose:
      'Update the component catalog with newly validated components; idempotent by (tenantId, specId); store updated catalog entry; emit design.catalog.updated',
    distinctFrom: 'T490 (parsing — T506 persists parsed components to the shared catalog registry)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1307',
        interfaceName: 'IComponentCatalogStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Component catalog registry store',
      },
      {
        factoryId: 'F1308',
        interfaceName: 'IComponentCatalogEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.catalog.updated',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T506', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['component_catalog'],
      events: ['design.catalog.updated'],
      apiRoutes: ['/api/dynamic/flow31-component-catalog'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
      'Idempotent by (tenantId, specId)',
    ],
    machineComponents: ['idempotency guard', 'catalog merge algorithm', 'outbox ordering'],
    freedomComponents: ['catalog_merge_strategy', 'component_version_format'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT507Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T507',
    flowId: 'FLOW-31',
    name: 'DesignVersionTracker',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered after catalog updated',
    purpose:
      'INSERT-ONLY version history for design system evolution; records version, changeset summary, author, timestamp; immutable changelog; emit design.version.tracked',
    distinctFrom: 'T504 (decision log — T507 tracks version history, T504 logs decision rationale)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1309',
        interfaceName: 'IDesignVersionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'INSERT-ONLY design version history store',
      },
      {
        factoryId: 'F1310',
        interfaceName: 'IDesignVersionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.version.tracked',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T507', tier: 2 },
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
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Version history must be INSERT-ONLY — no update or delete',
        severity: 'error' as const,
        checkType: 'governance_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['design_version'],
      events: ['design.version.tracked'],
      apiRoutes: ['/api/dynamic/flow31-design-versions'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'INSERT-ONLY: no update or delete on version history',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'insert-only write guard',
      'version sequence enforcement',
      'outbox ordering',
    ],
    freedomComponents: ['version_number_format', 'required_version_fields'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT508Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T508',
    flowId: 'FLOW-31',
    name: 'DesignChangeEmitter',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after version tracked',
    purpose:
      'Emit structured CloudEvents for all design changes (token updates, component changes, pattern changes); fanout to downstream consumers; store change event record; emit design.change.emitted',
    distinctFrom:
      'T504 (decisions — T508 emits operational change events, T504 logs strategic decisions)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1311',
        interfaceName: 'IDesignChangeStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Change event record store',
      },
      {
        factoryId: 'F1312',
        interfaceName: 'IDesignChangeEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.change.emitted',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T508', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'dna9::cloud_events'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Change events must use CloudEvents envelope (DNA-9)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['design_change_event'],
      events: ['design.change.emitted'],
      apiRoutes: ['/api/dynamic/flow31-change-events'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'Change events MUST use CloudEvents envelope (DNA-9)',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['CloudEvents envelope wrapping', 'fanout routing', 'outbox ordering'],
    freedomComponents: ['change_event_types', 'fanout_subscriber_list'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT509Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T509',
    flowId: 'FLOW-31',
    name: 'DesignHealthScorer',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered after change events emitted',
    purpose:
      'Score design system health from operational metrics: error rate, token adoption, component reuse rate, accessibility compliance rate; classify HEALTHY/DEGRADED/UNHEALTHY; emit design.health.scored',
    distinctFrom:
      'T503 (architecture — T509 scores real-time operational health, T503 scores static architecture quality)',
    familyId: 'Family-194',
    factoryDependencies: [
      {
        factoryId: 'F1313',
        interfaceName: 'IDesignHealthStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Design health score document store',
      },
      {
        factoryId: 'F1314',
        interfaceName: 'IDesignHealthEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.health.scored',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T509', tier: 2 },
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
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_health_score'],
      events: ['design.health.scored'],
      apiRoutes: ['/api/dynamic/flow31-health-scores'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'health scoring algorithm',
      'HEALTHY/DEGRADED/UNHEALTHY classifier',
      'outbox ordering',
    ],
    freedomComponents: ['health_score_weights', 'health_classification_thresholds'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── LEARNING/IMPACT — Family-195 ──────────────────────────────────────────

export function createT510Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T510',
    flowId: 'FLOW-31',
    name: 'DesignFeedbackLearner',
    archetype: ContractArchetype.LEARNING,
    entry: 'SCORE-0 async-only: triggered from queue consumer after design deployment feedback',
    purpose:
      'SCORE-0 async learning from design outcomes: extract patterns from successful/failed deployments; update design pattern confidence scores; emit design.feedback.learned',
    distinctFrom:
      'T509 (health scoring — T510 is SCORE-0 async learner for pattern improvement, T509 is real-time operational scoring)',
    familyId: 'Family-195',
    factoryDependencies: [
      {
        factoryId: 'F1315',
        interfaceName: 'IDesignFeedbackStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'SCORE-0 learning signal store',
      },
      {
        factoryId: 'F1316',
        interfaceName: 'IDesignFeedbackEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.feedback.learned',
      },
    ],
    afStations: [
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'design', patterns: ['feedback', 'learning', 'pattern_confidence'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 5000 },
      },
      { stationId: 'AF-11', role: 'feedback', config: { score_dimension: 'design_quality' } },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'SCORE-0: must NEVER run on live request path',
        severity: 'error' as const,
        checkType: 'async_only',
      },
    ],
    bfaRegistration: {
      entities: ['design_learning_signal'],
      events: ['design.feedback.learned'],
      apiRoutes: [],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'SCORE-0 ASYNC-ONLY: NEVER run on live request path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'SCORE-0 async gate',
      'pattern confidence update algorithm',
      'outbox ordering',
    ],
    freedomComponents: ['learning_rate', 'confidence_decay_factor', 'feedback_signal_weights'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT511Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T511',
    flowId: 'FLOW-31',
    name: 'CrossDesignImpactAnalyzer',
    archetype: ContractArchetype.IMPACT_ANALYSIS,
    entry: 'Triggered after feedback learned',
    purpose:
      'Analyze impact of design changes across the design system: which components are affected, which patterns need updating, blast radius estimation; produce impact report; emit design.impact.analyzed',
    distinctFrom:
      'T498 (debt analysis — T511 analyzes cross-component change impact, T498 analyzes static debt)',
    familyId: 'Family-195',
    factoryDependencies: [
      {
        factoryId: 'F1317',
        interfaceName: 'ICrossDesignImpactSearchStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Existing design registry reader for impact search',
      },
      {
        factoryId: 'F1318',
        interfaceName: 'ICrossDesignImpactStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Impact analysis result store',
      },
      {
        factoryId: 'F1319',
        interfaceName: 'ICrossDesignImpactEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.impact.analyzed',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T511', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE],
    bfaRegistration: {
      entities: ['design_impact_report'],
      events: ['design.impact.analyzed'],
      apiRoutes: ['/api/dynamic/flow31-impact-reports'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'blast radius calculation',
      'dependency graph traversal',
      'outbox ordering',
    ],
    freedomComponents: ['impact_severity_thresholds', 'impact_analysis_depth'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── ORCHESTRATION — Family-196 ─────────────────────────────────────────────

export function createT512Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T512',
    flowId: 'FLOW-31',
    name: 'DesignEvolutionTracker',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered after impact analyzed',
    purpose:
      'INSERT-ONLY track design system evolution across major versions; records architectural shifts, technology migrations, paradigm changes; immutable evolution history; emit design.evolution.tracked',
    distinctFrom:
      'T507 (version tracker — T512 tracks strategic evolution milestones, T507 tracks individual version changes)',
    familyId: 'Family-196',
    factoryDependencies: [
      {
        factoryId: 'F1320',
        interfaceName: 'IDesignEvolutionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'INSERT-ONLY design evolution history store',
      },
      {
        factoryId: 'F1321',
        interfaceName: 'IDesignEvolutionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.evolution.tracked',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T512', tier: 2 },
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
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Evolution history must be INSERT-ONLY — no update or delete',
        severity: 'error' as const,
        checkType: 'governance_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['design_evolution'],
      events: ['design.evolution.tracked'],
      apiRoutes: ['/api/dynamic/flow31-design-evolutions'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'INSERT-ONLY: no update or delete on evolution history',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'insert-only write guard',
      'evolution milestone detection',
      'outbox ordering',
    ],
    freedomComponents: ['evolution_milestone_criteria', 'evolution_categories'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT513Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T513',
    flowId: 'FLOW-31',
    name: 'DesignPublishOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered after evolution tracked; orchestrates full design system publication',
    purpose:
      'Orchestrate publication of validated design system: coordinate token library publish, component catalog publish, pattern library publish; idempotent by (tenantId, specId); emit design.published',
    distinctFrom:
      'T515 (meta orchestrator — T513 orchestrates publication pipeline, T515 orchestrates full design intelligence cycle)',
    familyId: 'Family-196',
    factoryDependencies: [
      {
        factoryId: 'F1322',
        interfaceName: 'IDesignPublishSearchStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Idempotency check store for publish runs',
      },
      {
        factoryId: 'F1323',
        interfaceName: 'IDesignPublishStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Publish run result store',
      },
      {
        factoryId: 'F1324',
        interfaceName: 'IDesignPublishEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.published',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T513', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Idempotency check before publish — return existing if already published',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],
    bfaRegistration: {
      entities: ['design_publish_run'],
      events: ['design.published'],
      apiRoutes: ['/api/dynamic/flow31-publish-runs'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'Idempotent by (tenantId, specId) — check searchDocuments first',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: ['idempotency guard', 'publish coordination', 'outbox ordering'],
    freedomComponents: ['publish_targets', 'publish_notification_channels'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT514Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T514',
    flowId: 'FLOW-31',
    name: 'DesignDeploymentGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Final gate before design system goes live; all prerequisite phases must be complete',
    purpose:
      'Hard gate: validate all required phases complete (ingested, analyzed, quality_passed, schema_valid, tokens_consistent, published); DESIGN_DEPLOYMENT_BLOCKED hard stop; emit design.deployment.approved',
    distinctFrom:
      'T499 (quality gate — T514 is the final deployment gate requiring all phases, T499 gates on quality score only)',
    familyId: 'Family-196',
    factoryDependencies: [
      {
        factoryId: 'F1325',
        interfaceName: 'IDesignDeploymentGateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Deployment gate result store',
      },
      {
        factoryId: 'F1326',
        interfaceName: 'IDesignDeploymentGateEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for design.deployment.approved',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T514', tier: 2 },
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
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'xiigen', 'guard::no_bypass'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'DESIGN_DEPLOYMENT_BLOCKED must be a hard stop — no bypass',
        severity: 'error' as const,
        checkType: 'guard_integrity',
      },
    ],
    bfaRegistration: {
      entities: ['design_deployment_gate_result'],
      events: ['design.deployment.approved', 'design.deployment.blocked'],
      apiRoutes: ['/api/dynamic/flow31-deployment-gates'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'DESIGN_DEPLOYMENT_BLOCKED is a HARD STOP — no bypass path',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'required phase checklist enforcement',
      'hard stop enforcement',
      'outbox ordering',
    ],
    freedomComponents: ['required_deployment_phases', 'deployment_approval_roles'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

export function createT515Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T515',
    flowId: 'FLOW-31',
    name: 'MetaDesignOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Top-level entry point for the Design Intelligence Engine pipeline',
    purpose:
      'Top-level orchestrator coordinating the full design intelligence lifecycle: ingest → analyze → validate → build → publish → deploy; idempotent by (tenantId, specId); emits metadesign.orchestration.initiated',
    distinctFrom:
      'T513 (publish orchestrator — T515 is the meta-orchestrator for the full pipeline, T513 handles publication only)',
    familyId: 'Family-196',
    factoryDependencies: [
      {
        factoryId: 'F1327',
        interfaceName: 'IMetaDesignSearchStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Idempotency check for meta-design runs',
      },
      {
        factoryId: 'F1328',
        interfaceName: 'IMetaDesignRunStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Meta-design run document store',
      },
      {
        factoryId: 'F1329',
        interfaceName: 'IMetaDesignEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'CloudEvent publisher for metadesign.orchestration.initiated',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow31', taskType: 'T515', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['orchestration', 'design_intelligence', 'meta_patterns'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 7000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'tenant', 'xiigen'] },
      },
    ],
    qualityGates: [
      ...DESIGN_SYSTEM_GOVERNANCE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-06',
        description: 'Idempotency check before run — return existing if already initiated',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],
    bfaRegistration: {
      entities: ['meta_design_run'],
      events: ['metadesign.orchestration.initiated', 'metadesign.orchestration.completed'],
      apiRoutes: ['/api/dynamic/flow31-meta-design-runs'],
    },
    ironRules: [
      ...DESIGN_SYSTEM_GOVERNANCE_IRON_RULES_CORE,
      'Idempotent by (tenantId, specId) — check searchDocuments first',
      'storeDocument() BEFORE enqueue() — DNA-8',
    ],
    machineComponents: [
      'idempotency guard',
      'pipeline coordination',
      'run status tracking',
      'outbox ordering',
    ],
    freedomComponents: ['pipeline_stage_config', 'max_parallel_stages', 'pipeline_timeout_ms'],
    stackCoupling: DESIGN_GOVERNANCE_STACK_COUPLING,
  });
}

// ── Factory export ─────────────────────────────────────────────────────────

export const DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES = [
  createT489Contract,
  createT490Contract,
  createT491Contract,
  createT492Contract,
  createT493Contract,
  createT494Contract,
  createT495Contract,
  createT496Contract,
  createT497Contract,
  createT498Contract,
  createT499Contract,
  createT500Contract,
  createT501Contract,
  createT502Contract,
  createT503Contract,
  createT504Contract,
  createT505Contract,
  createT506Contract,
  createT507Contract,
  createT508Contract,
  createT509Contract,
  createT510Contract,
  createT511Contract,
  createT512Contract,
  createT513Contract,
  createT514Contract,
  createT515Contract,
];
