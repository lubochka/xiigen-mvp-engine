import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * Bundle Activation — Engine Contracts (FLOW-00)
 *
 * Business purpose: Enables tenant provisioning via curated solution bundles.
 * BundleValidator (T574) ensures a bundle is activatable before any flow
 * is provisioned. BundleActivationOrchestrator (T575) provisions all required
 * flows in dependency order, calling T536 DRY_RUN then FULL per flow.
 * BundleStatusTracker (T576) monitors bundle health continuously, emitting
 * BundleDegraded when any required flow version falls below the bundle minimum.
 *
 * T574: BundleValidator              [VALIDATION]
 * T575: BundleActivationOrchestrator [ORCHESTRATION]
 * T576: BundleStatusTracker          [GOVERNANCE]
 *
 * Factories: F1499–F1501 (3 new)
 * CF rules:  CF-822–CF-831 (10 rules)
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const BUNDLE_ACTIVATION_STACK_COUPLING: TaskTypeStackCoupling = {
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

const BUNDLE_ACTIVATION_QUALITY_GATES_CORE = [
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

const BUNDLE_ACTIVATION_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() MUST happen BEFORE enqueue() on every state transition (DNA-8)',
  'tenantId is read from AsyncLocalStorage — never passed as parameter',
];

// ── SOLUTION_BUNDLES — Family-204 ──────────────────────────────────────────

/**
 * T574 — BundleValidator [VALIDATION].
 *
 * PURPOSE: Validate a solution bundle before any tenant provisioning begins.
 * Checks: requiredFlows exist in flow-lifecycle, no BFA conflicts, all flows
 * are ACTIVE or activatable. Returns BundleValidationReport with estimatedActivationMs.
 *
 * F1499: IBundleRegistryService → DATABASE FABRIC (solution-bundles ES index CRUD)
 */
export function createT574Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T574',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    name: 'BundleValidator',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by BundleActivationRequested event or pre-activation validation call',
    purpose:
      'Validate a solution bundle before provisioning: check requiredFlows exist in flow-lifecycle, run BFA cross-flow check across all bundle flows, verify all flows are ACTIVE or activatable. Return BundleValidationReport with valid flag and estimatedActivationMs.',
    distinctFrom: 'T575 BundleActivationOrchestrator (T574 validates; T575 provisions)',
    familyId: 'Family-204',

    factoryDependencies: [
      {
        factoryId: 'F1499',
        interfaceName: 'IBundleRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Bundle registry CRUD — solution-bundles ES index. Read bundle manifest, validate requiredFlows against flow-lifecycle index.',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { enforceQualityGates: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow00.bundle-validator.genesis' },
      },
    ],

    qualityGates: [
      ...BUNDLE_ACTIVATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-00-01',
        description:
          'Read bundle manifest from solution-bundles ES index before any validation (CF-822)',
        severity: 'error' as const,
        checkType: 'read_before_validate',
      },
      {
        gateId: 'QG-00-02',
        description: 'Validate ALL requiredFlows exist in flow-lifecycle — not a subset (CF-823)',
        severity: 'error' as const,
        checkType: 'completeness',
      },
      {
        gateId: 'QG-00-03',
        description: 'BFA cross-flow check MUST include all requiredFlows[] flows (CF-824)',
        severity: 'error' as const,
        checkType: 'bfa_coverage',
      },
      {
        gateId: 'QG-00-04',
        description:
          'estimatedActivationMs field is mandatory in BundleValidationReport — even for invalid bundles (CF-825)',
        severity: 'error' as const,
        checkType: 'output_completeness',
      },
      {
        gateId: 'QG-00-05',
        description:
          'Never throw for business validation failures — return DataProcessResult.failure() (DNA-3)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],

    bfaRegistration: {
      entities: ['solution_bundle', 'bundle_validation_report'],
      events: ['bundle.activation.requested', 'bundle.validation.completed'],
      apiRoutes: [],
    },

    ironRules: [
      ...BUNDLE_ACTIVATION_IRON_RULES_CORE,
      'Read bundle manifest from solution-bundles ES index before any validation (CF-822)',
      'Validate ALL requiredFlows exist in flow-lifecycle index — not a subset (CF-823)',
      'BFA cross-check MUST include every flow in requiredFlows[] (CF-824)',
      'estimatedActivationMs is always populated, even for invalid bundles (CF-825)',
      'All ES queries use BuildSearchFilter — no raw query objects (DNA-2)',
    ],

    machineComponents: [
      'requiredFlows existence check in flow-lifecycle index',
      'BFA cross-flow validation across all bundle flows',
      'estimatedActivationMs calculation',
      'BundleValidationReport assembly',
    ],

    freedomComponents: [
      'bundle00_validation_timeout_ms — max time for bundle validation before timeout',
    ],
    stackCoupling: BUNDLE_ACTIVATION_STACK_COUPLING,
  });
}

/**
 * T575 — BundleActivationOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Provision all required flows for a tenant in dependency order.
 * For each flow in requiredFlows[]: call T536 BootstrapOrchestrator DRY_RUN then FULL.
 * Pre-populate FREEDOM config additively (never overwrite existing tenant values).
 * Emit BundleActivated with flowVersionsAtActivation.
 *
 * F1499: IBundleRegistryService → DATABASE FABRIC (bundle manifest read)
 * F1500: IBundleActivationService → FLOW ENGINE FABRIC (per-flow DRY_RUN + FULL orchestration)
 */
export function createT575Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T575',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    name: 'BundleActivationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered after BundleValidator (T574) returns valid: true',
    purpose:
      'Provision all required flows for a tenant in dependency order. For each flow: call T536 BootstrapOrchestrator DRY_RUN (mandatory), then FULL. Pre-populate FREEDOM config additively. Record flowVersionsAtActivation. Emit BundleActivated. App-reopen: resume from last incomplete flow (idempotent).',
    distinctFrom: 'T574 BundleValidator (T575 provisions; T574 validates pre-conditions)',
    familyId: 'Family-204',

    factoryDependencies: [
      {
        factoryId: 'F1499',
        interfaceName: 'IBundleRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Bundle manifest read and activation record storage in solution-bundles index.',
      },
      {
        factoryId: 'F1500',
        interfaceName: 'IBundleActivationService',
        fabricType: FabricType.FLOW_ENGINE,
        providerHint: 'in-memory',
        description:
          'Per-flow DRY_RUN + FULL bootstrap orchestration (calls T536 BootstrapOrchestrator).',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { enforceQualityGates: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow00.bundle-activation-orchestrator.genesis' },
      },
    ],

    qualityGates: [
      ...BUNDLE_ACTIVATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-00-06',
        description: 'DRY_RUN called before FULL for every flow in requiredFlows[] (CF-826)',
        severity: 'error' as const,
        checkType: 'step_ordering',
      },
      {
        gateId: 'QG-00-07',
        description: 'Flows activated in dependency order — FLOW-01 first (CF-827)',
        severity: 'error' as const,
        checkType: 'dependency_ordering',
      },
      {
        gateId: 'QG-00-08',
        description:
          'FREEDOM config pre-population ADDITIVE only — never overwrite existing tenant values (CF-828)',
        severity: 'error' as const,
        checkType: 'additive_config',
      },
      {
        gateId: 'QG-00-09',
        description: 'flowVersionsAtActivation recorded at moment each flow is set ACTIVE (CF-829)',
        severity: 'error' as const,
        checkType: 'state_capture',
      },
      {
        gateId: 'QG-00-10',
        description:
          'App-reopen idempotency: resume from last incomplete flow without re-triggering completed flows (CF-830)',
        severity: 'error' as const,
        checkType: 'idempotency',
      },
    ],

    bfaRegistration: {
      entities: ['bundle_activation', 'flow_lifecycle'],
      events: ['bundle.activation.requested', 'bundle.activated', 'flow.activation.progress'],
      apiRoutes: [],
    },

    ironRules: [
      ...BUNDLE_ACTIVATION_IRON_RULES_CORE,
      'DRY_RUN MUST complete successfully before FULL is called — no skip (CF-826)',
      'Dependency order MUST be respected — FLOW-01 first, then others in dependency order (CF-827)',
      'FREEDOM config is ADDITIVE — never overwrite existing tenant values (CF-828)',
      'flowVersionsAtActivation populated at moment each flow is set ACTIVE (CF-829)',
      'Idempotent resume on app-reopen — skip already-ACTIVE flows (CF-830)',
    ],

    machineComponents: [
      'Dependency ordering (FLOW-01 first, numeric order heuristic)',
      'Per-flow DRY_RUN → FULL activation sequence',
      'Per-flow checkpoint persistence for resume',
      'FREEDOM config additive pre-population',
      'flowVersionsAtActivation capture',
    ],

    freedomComponents: [
      'bundle00_activation_timeout_ms — max time per flow activation before timeout',
    ],
    stackCoupling: BUNDLE_ACTIVATION_STACK_COUPLING,
  });
}

/**
 * T576 — BundleStatusTracker [GOVERNANCE].
 *
 * PURPOSE: Monitor active bundles and detect degradation when a required flow
 * is regenerated with a version below the bundle minimum.
 * Subscribe to flow-lifecycle regeneration events via QUEUE FABRIC — never poll.
 * Check ALL bundles for the regenerated flow — not just the first.
 *
 * F1499: IBundleRegistryService → DATABASE FABRIC
 * F1501: IBundleStatusService → DATABASE FABRIC (degradation/restoration persistence)
 */
export function createT576Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T576',
    flowId: 'FLOW-00',
    flowName: 'Bundle Activation',
    name: 'BundleStatusTracker',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Subscribed to flow-lifecycle regeneration events via QUEUE FABRIC',
    purpose:
      'Monitor active bundles continuously. On flow regeneration event: check ALL bundles containing that flow, not just the first. Emit BundleDegraded when flow version < bundle.minFlowVersions[flowId]. Emit BundleRestored when all bundle flows meet minFlowVersions after re-promotion.',
    distinctFrom:
      'T574 BundleValidator (T576 monitors continuously; T574 validates point-in-time before activation)',
    familyId: 'Family-204',

    factoryDependencies: [
      {
        factoryId: 'F1499',
        interfaceName: 'IBundleRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Bundle registry read — find all bundles containing a given flowId, read minFlowVersions.',
      },
      {
        factoryId: 'F1501',
        interfaceName: 'IBundleStatusService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Bundle status persistence — write DEGRADED/RESTORED status before emitting event (DNA-8).',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...BUNDLE_ACTIVATION_QUALITY_GATES_CORE,
      {
        gateId: 'QG-00-11',
        description:
          'Subscribe via QUEUE FABRIC only — never poll flow-lifecycle directly (CF-831)',
        severity: 'error' as const,
        checkType: 'fabric_usage',
      },
      {
        gateId: 'QG-00-12',
        description:
          'Check ALL bundles containing the regenerated flow — not just the first (CF-831)',
        severity: 'error' as const,
        checkType: 'completeness',
      },
      {
        gateId: 'QG-00-13',
        description: 'Status persisted BEFORE event emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-00-14',
        description:
          'Tenant isolation: Tenant A degradation does not query Tenant B bundle records (DNA-5)',
        severity: 'error' as const,
        checkType: 'tenant_isolation',
      },
    ],

    bfaRegistration: {
      entities: ['bundle_status', 'solution_bundle'],
      events: ['flow.lifecycle.regenerated', 'bundle.degraded', 'bundle.restored'],
      apiRoutes: [],
    },

    ironRules: [
      ...BUNDLE_ACTIVATION_IRON_RULES_CORE,
      'Subscribe via QUEUE FABRIC only — never poll flow-lifecycle directly (CF-831)',
      'Check ALL bundles for a regenerated flow — never stop at first match (CF-831)',
      'Persist status change BEFORE emitting BundleDegraded/BundleRestored (DNA-8)',
      'Tenant isolation: one tenant bundle degradation MUST NOT query other tenant records (DNA-5)',
    ],

    machineComponents: [
      'Queue fabric subscription for flow-lifecycle regeneration events',
      'All-bundles traversal for a given flowId',
      'Version comparison (v1 < v2 semantic)',
      'DEGRADED/RESTORED status transition logic',
    ],

    freedomComponents: [
      'bundle00_version_check_enabled — tenant can disable automatic degradation checks (FREEDOM only)',
    ],
    stackCoupling: BUNDLE_ACTIVATION_STACK_COUPLING,
  });
}

// ── Exports ─────────────────────────────────────────────────────────────────

// Domain aliases (SK-430 Rule 2)
export const createBundleValidatorContract = createT574Contract;
export const createBundleActivationOrchestratorContract = createT575Contract;
export const createBundleStatusTrackerContract = createT576Contract;

// Domain-grouped barrel (SK-430 Rule 6)
export const BUNDLE_ACTIVATION_CONTRACT_FACTORIES = [
  createT574Contract,
  createT575Contract,
  createT576Contract,
];

// EngineContract instances — tests call .validate() on these
export const BUNDLE_ACTIVATION_CONTRACTS = BUNDLE_ACTIVATION_CONTRACT_FACTORIES.map((f) => f());
