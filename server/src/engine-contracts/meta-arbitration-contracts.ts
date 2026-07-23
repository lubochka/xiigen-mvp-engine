/**
 * FLOW-35 Engine Contracts — Meta-Arbitration Engine.
 * T565–T566 — 2 task types.
 *
 * T565: RoundSummaryProcessor   [META_COLLECTION] — collect arbiter scores into RoundSummary
 * T566: MetaDecisionEngine      [META_DECISION]   — apply meta-arbiter policies → RoundDecision
 *
 * Families: 202 (META_ARBITRATION)
 * Factories: F1484–F1491 (8 new)
 * CF rules:  CF-789–CF-795 (7 rules)
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const META_ARBITRATION_STACK_COUPLING: TaskTypeStackCoupling = {
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

const GENERATION_LOOP_QUALITY_GATES_CORE = [
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

const GENERATION_LOOP_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'RoundDecision MUST be stored (DNA-8) before any downstream event is emitted',
  'Meta-arbiter HALT or ESCALATE decisions MUST produce EscalationBriefing with options (CF-793)',
  'Decision log MUST be append-only — never overwrite or delete entries (CF-792)',
  'Spend limit MUST be read from FREEDOM config — never hardcoded (CF-789)',
  'Security circuit breaker MUST fire before code reaches any downstream consumer (CF-790)',
];

const GENERATION_LOOP_AF_STATIONS_CORE = [
  { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
  { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
  { stationId: 'AF-9', role: 'judge', modelHint: undefined, config: { enforceQualityGates: true } },
];

// ── META_ARBITRATION — Family-202 ──────────────────────────────────────────

/**
 * T565 — RoundSummaryProcessor [META_COLLECTION].
 *
 * PURPOSE: Triggered by ArbitersComplete event. Collects all arbiter results
 *          for the current generation round and assembles a structured RoundSummary.
 *          Enriches with cost, token counts, model metadata. Persists before emit (DNA-8).
 *
 * F1484: IMetaArbiterRegistryService → DATABASE FABRIC (meta-arbiter registry, layer="meta")
 * F1489: IDecisionLogService → DATABASE FABRIC (append-only decision log, CF-792)
 */
export function createT565Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T565',
    name: 'RoundSummaryProcessor',
    archetype: ContractArchetype.META_COLLECTION,
    entry: 'Triggered by ArbitersComplete event after all standard arbiters write their scores',
    purpose:
      'Collect all arbiter scores for the generation round into a RoundSummary; enrich with cost and token data; persist to ES (DNA-8) before emitting RoundSummaryReady event for T566',
    distinctFrom:
      'T566 (meta decision engine — T565 collects raw data, T566 applies policies to produce final decision)',
    familyId: 'Family-202',

    factoryDependencies: [
      {
        factoryId: 'F1484',
        interfaceName: 'IMetaArbiterRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Meta-arbiter registry — layer="meta", separate from standard ArbiterRegistry',
      },
      {
        factoryId: 'F1489',
        interfaceName: 'IDecisionLogService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Append-only decision log — stores every RoundSummary and RoundDecision (CF-792)',
      },
    ],

    afStations: [
      ...GENERATION_LOOP_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow35.meta.round-summary' },
      },
    ],

    qualityGates: [
      ...GENERATION_LOOP_QUALITY_GATES_CORE,
      {
        gateId: 'QG-35-01',
        description: 'RoundSummary persisted before RoundSummaryReady emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-35-02',
        description: 'Decision log is append-only — no updates or deletes (CF-792)',
        severity: 'error' as const,
        checkType: 'immutability',
      },
    ],

    bfaRegistration: {
      entities: ['round_summary', 'decision_log'],
      events: ['arbiters.complete', 'round_summary.ready'],
      apiRoutes: [],
    },

    ironRules: [
      ...GENERATION_LOOP_IRON_RULES_CORE,
      'Collect ALL arbiter results before assembling RoundSummary — partial summaries are invalid',
      'Cost and token metadata MUST be included in every RoundSummary for spend governance',
    ],

    machineComponents: [
      'ArbitersComplete event listener',
      'RoundSummary assembly logic',
      'Cost enrichment from model metadata',
      'Append-only persistence to decision_log index',
    ],

    freedomComponents: [
      'meta_arbiter_timeout_ms — how long to wait for all arbiters before timeout',
    ],
    stackCoupling: META_ARBITRATION_STACK_COUPLING,
  });
}

/**
 * T566 — MetaDecisionEngine [META_DECISION].
 *
 * PURPOSE: Triggered by RoundSummaryReady event. Applies all 5 meta-arbiter policies
 *          (SpendGovernor, SecurityCircuitBreaker, ImprovementDetector, ModelFitness,
 *          RoundController) in sequence. Produces final RoundDecision:
 *          CONTINUE | ESCALATE | HALT | ACCEPT.
 *          ESCALATE/HALT always include EscalationBriefing (CF-793).
 *          Persists decision before emitting (DNA-8).
 *
 * F1485: ISpendGovernorService → DATABASE FABRIC
 * F1486: ISecurityCircuitBreakerService → DATABASE FABRIC
 * F1487: IImprovementDetectorService → DATABASE FABRIC
 * F1488: IModelFitnessService → DATABASE FABRIC
 * F1490: IEscalationBriefingService → DATABASE FABRIC
 * F1491: IFlowLifecycleService → DATABASE FABRIC
 */
export function createT566Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T566',
    name: 'MetaDecisionEngine',
    archetype: ContractArchetype.META_DECISION,
    entry: 'Triggered by RoundSummaryReady event from T565',
    purpose:
      'Apply 5 meta-arbiter policies to RoundSummary; produce RoundDecision (CONTINUE/ESCALATE/HALT/ACCEPT); generate EscalationBriefing with options A/B/C for HALT/ESCALATE cases; update flow-lifecycle status (D-VIS-4); persist before emit (DNA-8)',
    distinctFrom: 'T565 (collects raw scores — T566 applies policies and decides)',
    familyId: 'Family-202',

    factoryDependencies: [
      {
        factoryId: 'F1485',
        interfaceName: 'ISpendGovernorService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Spend limit enforcement — reads from FREEDOM config, never hardcoded (CF-789)',
      },
      {
        factoryId: 'F1486',
        interfaceName: 'ISecurityCircuitBreakerService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Security gate — pattern matching for credential leaks, forbidden imports (CF-790)',
      },
      {
        factoryId: 'F1487',
        interfaceName: 'IImprovementDetectorService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Trend detection across rounds — IMPROVING / PLATEAUED / REGRESSING',
      },
      {
        factoryId: 'F1488',
        interfaceName: 'IModelFitnessService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Per-model fitness scoring — acceptance rate, cost efficiency, round count',
      },
      {
        factoryId: 'F1490',
        interfaceName: 'IEscalationBriefingService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Builds EscalationBriefing with options A/B/C for HALT and ESCALATE decisions',
      },
      {
        factoryId: 'F1491',
        interfaceName: 'IFlowLifecycleService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Flow lifecycle state updates — Phase A DRY_RUN → GENERATED, Phase E → PROMOTED → ACTIVE (D-VIS-4)',
      },
    ],

    afStations: [
      ...GENERATION_LOOP_AF_STATIONS_CORE,
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow35.meta.decision-engine' },
      },
    ],

    qualityGates: [
      ...GENERATION_LOOP_QUALITY_GATES_CORE,
      {
        gateId: 'QG-35-03',
        description: 'RoundDecision persisted before downstream event (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-35-04',
        description: 'HALT/ESCALATE always produce EscalationBriefing (CF-793)',
        severity: 'error' as const,
        checkType: 'escalation_briefing',
      },
      {
        gateId: 'QG-35-05',
        description: 'Spend limit from FREEDOM config — never hardcoded (CF-789)',
        severity: 'error' as const,
        checkType: 'freedom_config_usage',
      },
    ],

    bfaRegistration: {
      entities: ['round_decision', 'escalation_briefing', 'flow_lifecycle'],
      events: [
        'round_summary.ready',
        'round.decision.made',
        'round.escalated',
        'round.halted',
        'round.accepted',
        'flow.status.generated',
        'flow.status.active',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...GENERATION_LOOP_IRON_RULES_CORE,
      'All 5 meta-arbiters MUST be evaluated — no short-circuit on first failure (CF-791)',
      'HALT decision overrides all other decisions — spend and security HALT is final',
      'ESCALATE decision requires human approval before generation continues',
      'DPO triple MUST be exported on ACCEPT decision for training data pipeline',
    ],

    machineComponents: [
      '5-policy evaluation pipeline (sequential, all policies applied)',
      'RoundDecision assembly with policy verdicts',
      'EscalationBriefing generation for HALT/ESCALATE',
      'DPO triple export hook on ACCEPT',
      'Flow lifecycle status update (D-VIS-4)',
    ],

    freedomComponents: [
      'flow35_spend_limit_per_session_usd — max spend before SpendGovernor triggers HALT',
      'flow35_improvement_window_rounds — rounds to consider for trend detection',
      'flow35_model_fitness_threshold — min fitness score before ModelFitness triggers ESCALATE',
    ],
    stackCoupling: META_ARBITRATION_STACK_COUPLING,
  });
}

// ── Exports ────────────────────────────────────────────────────────────────

// Domain aliases (SK-430 Rule 2) — use these in new code
export const createRoundSummaryProcessorContract = createT565Contract;
export const createMetaDecisionEngineContract = createT566Contract;

// Domain-grouped barrel (SK-430 Rule 6)
export const META_ARBITRATION_COLLECTION_CONTRACTS = [createRoundSummaryProcessorContract];
export const META_ARBITRATION_DECISION_CONTRACTS = [createMetaDecisionEngineContract];

// Kept for test backward compatibility — DO NOT REMOVE
export const GENERATION_LOOP_CONTRACT_FACTORIES = [createT565Contract, createT566Contract];
// GENERATION_LOOP_CONTRACTS returns EngineContract instances — tests call .validate() on these
export const GENERATION_LOOP_CONTRACTS = GENERATION_LOOP_CONTRACT_FACTORIES.map((f) => f());
