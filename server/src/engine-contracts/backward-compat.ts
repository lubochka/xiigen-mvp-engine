/**
 * Backward Compatibility — loads existing engine artifacts into registries.
 *
 * 1. loadFactoryStubs(registry): F1–F165 across 24 families with correct fabric types
 * 2. loadTaskTypeStubs(registry): T1–T43 stub contracts (5 archetypes distributed)
 * 3. loadExistingBfaRegistrations(bfa): FLOW-02 through FLOW-05 entity/event/route data
 * 4. loadAllBackwardCompat(): calls all three, returns counts
 *
 * These are STUBS — they establish numbering and fabric mappings so new
 * flows (T44+, F166+) don't collide with existing artifacts.
 *
 * Phase 6.5: Backward compatibility layer.
 */

import { FabricType } from '../factories/fabric-type';
import { FactoryRegistry } from '../factories/factory-registry';
import { createRegistryEntry } from '../factories/factory-interfaces';
import { ContractArchetype } from './archetypes';
import {
  EngineContract,
  FactoryDependency,
  QualityGate,
  ArbiterPanelConfig,
} from './contract-schema';
import { TaskTypeRegistry } from './task-type-registry';
import { IBfaValidator } from './bfa-validator.stub';

// ── Family → Fabric mapping ─────────────────────────

interface FamilyDef {
  familyId: string;
  name: string;
  fabricType: FabricType;
  factoryRange: [number, number]; // inclusive start, inclusive end
}

/**
 * 24 families covering F1–F165.
 * Each family maps to a primary fabric type.
 */
const FAMILIES: FamilyDef[] = [
  {
    familyId: 'Family-01',
    name: 'User Management',
    fabricType: FabricType.DATABASE,
    factoryRange: [1, 7],
  },
  {
    familyId: 'Family-02',
    name: 'Authentication',
    fabricType: FabricType.DATABASE,
    factoryRange: [8, 14],
  },
  {
    familyId: 'Family-03',
    name: 'Content Management',
    fabricType: FabricType.DATABASE,
    factoryRange: [15, 21],
  },
  {
    familyId: 'Family-04',
    name: 'Search & Discovery',
    fabricType: FabricType.DATABASE,
    factoryRange: [22, 28],
  },
  {
    familyId: 'Family-05',
    name: 'Notifications',
    fabricType: FabricType.QUEUE,
    factoryRange: [29, 35],
  },
  {
    familyId: 'Family-06',
    name: 'Messaging',
    fabricType: FabricType.QUEUE,
    factoryRange: [36, 42],
  },
  {
    familyId: 'Family-07',
    name: 'Payment Processing',
    fabricType: FabricType.DATABASE,
    factoryRange: [43, 49],
  },
  {
    familyId: 'Family-08',
    name: 'Order Management',
    fabricType: FabricType.DATABASE,
    factoryRange: [50, 56],
  },
  {
    familyId: 'Family-09',
    name: 'Analytics',
    fabricType: FabricType.DATABASE,
    factoryRange: [57, 63],
  },
  {
    familyId: 'Family-10',
    name: 'Reporting',
    fabricType: FabricType.DATABASE,
    factoryRange: [64, 70],
  },
  {
    familyId: 'Family-11',
    name: 'AI Content Generation',
    fabricType: FabricType.AI_ENGINE,
    factoryRange: [71, 77],
  },
  {
    familyId: 'Family-12',
    name: 'AI Analysis',
    fabricType: FabricType.AI_ENGINE,
    factoryRange: [78, 84],
  },
  {
    familyId: 'Family-13',
    name: 'RAG Patterns',
    fabricType: FabricType.RAG,
    factoryRange: [85, 91],
  },
  {
    familyId: 'Family-14',
    name: 'Workflow Automation',
    fabricType: FabricType.FLOW_ENGINE,
    factoryRange: [92, 98],
  },
  {
    familyId: 'Family-15',
    name: 'File Management',
    fabricType: FabricType.DATABASE,
    factoryRange: [99, 105],
  },
  {
    familyId: 'Family-16',
    name: 'Media Processing',
    fabricType: FabricType.QUEUE,
    factoryRange: [106, 112],
  },
  {
    familyId: 'Family-17',
    name: 'Event Sourcing',
    fabricType: FabricType.QUEUE,
    factoryRange: [113, 119],
  },
  {
    familyId: 'Family-18',
    name: 'Configuration',
    fabricType: FabricType.DATABASE,
    factoryRange: [120, 126],
  },
  {
    familyId: 'Family-19',
    name: 'Secrets & Keys',
    fabricType: FabricType.SECRETS,
    factoryRange: [127, 133],
  },
  {
    familyId: 'Family-20',
    name: 'Audit & Compliance',
    fabricType: FabricType.DATABASE,
    factoryRange: [134, 140],
  },
  {
    familyId: 'Family-21',
    name: 'Integration Hub',
    fabricType: FabricType.QUEUE,
    factoryRange: [141, 147],
  },
  {
    familyId: 'Family-22',
    name: 'Scheduling',
    fabricType: FabricType.FLOW_ENGINE,
    factoryRange: [148, 154],
  },
  {
    familyId: 'Family-23',
    name: 'Matching & Scoring',
    fabricType: FabricType.AI_ENGINE,
    factoryRange: [155, 161],
  },
  {
    familyId: 'Family-24',
    name: 'Marketplace Core',
    fabricType: FabricType.DATABASE,
    factoryRange: [162, 165],
  },
];

// ── Default arbiterConfig for backward-compat stubs ─
// FC-26: ORCHESTRATION and AI_GENERATION stubs must have arbiterConfig.
// Minimal panel — all 5 required arbiters with permissive thresholds.
const STUB_ARBITER_CONFIG: ArbiterPanelConfig = {
  minPanel: {
    required: ['dna', 'fabric', 'business_logic', 'key_principles', 'iron_rules'],
    quorum: 5,
  },
  blockSemantics: {
    blockOnFail: ['iron_rules', 'key_principles'],
  },
  escalationGate: {
    minAggregateScore: 0.7,
    onFail: 'RETRY',
  },
} as unknown as ArbiterPanelConfig;

// ── Task Type → Archetype mapping ───────────────────

function getArchetypeForTaskType(t: number): ContractArchetype {
  if (t <= 9) return ContractArchetype.SERVICE;
  if (t <= 18) return ContractArchetype.DATA_PIPELINE;
  if (t <= 27) return ContractArchetype.ORCHESTRATION;
  if (t <= 36) return ContractArchetype.AI_GENERATION;
  return ContractArchetype.COMPOSITE;
}

function getFamilyForTaskType(t: number): string {
  // Distribute T1–T43 across families 1–22
  const familyIndex = (t - 1) % 22;
  return `Family-${String(familyIndex + 1).padStart(2, '0')}`;
}

// ── FLOW BFA data ───────────────────────────────────

interface FlowBfaData {
  flowId: string;
  entities: string[];
  events: string[];
  apiRoutes: string[];
}

const FLOW_BFA_DATA: FlowBfaData[] = [
  {
    flowId: 'FLOW-02',
    entities: ['content', 'category', 'tag'],
    events: ['content.published', 'content.archived'],
    apiRoutes: ['/api/content', '/api/categories', '/api/tags'],
  },
  {
    flowId: 'FLOW-03',
    entities: ['notification', 'channel', 'subscription'],
    events: ['notification.sent', 'notification.read'],
    apiRoutes: ['/api/notifications', '/api/channels', '/api/subscriptions'],
  },
  {
    flowId: 'FLOW-04',
    entities: ['order', 'payment', 'invoice'],
    events: ['order.placed', 'payment.processed', 'invoice.generated'],
    apiRoutes: ['/api/orders', '/api/payments', '/api/invoices'],
  },
  {
    flowId: 'FLOW-05',
    entities: ['report', 'dashboard', 'metric'],
    events: ['report.generated', 'metric.updated'],
    apiRoutes: ['/api/reports', '/api/dashboards', '/api/metrics'],
  },
];

// ── Loader Functions ─────────────────────────────────

/**
 * Register F1–F165 factory stubs across 24 families.
 * Each factory gets the correct fabric type from its family.
 */
export function loadFactoryStubs(registry: FactoryRegistry): number {
  let count = 0;

  for (const family of FAMILIES) {
    for (let f = family.factoryRange[0]; f <= family.factoryRange[1]; f++) {
      const entry = createRegistryEntry({
        factoryId: `F${f}`,
        interfaceName: `IService_F${f}`,
        familyId: family.familyId,
        fabricType: family.fabricType,
        provider: 'stub',
        description: `${family.name} — Factory F${f} (backward compat stub)`,
        status: 'CORE',
        version: '1.0.0',
      });

      const result = registry.register(entry);
      if (result.isSuccess) count++;
    }
  }

  return count;
}

/**
 * Register T1–T43 task type stubs.
 * Distributed across 5 archetypes.
 */
export function loadTaskTypeStubs(registry: TaskTypeRegistry): number {
  let count = 0;

  for (let t = 1; t <= 43; t++) {
    const archetype = getArchetypeForTaskType(t);
    const familyId = getFamilyForTaskType(t);
    const fabricType =
      t <= 22 ? FabricType.DATABASE : t <= 33 ? FabricType.QUEUE : FabricType.AI_ENGINE;

    const needsArbiterConfig =
      archetype === ContractArchetype.ORCHESTRATION ||
      archetype === ContractArchetype.AI_GENERATION;

    const contract = new EngineContract({
      taskTypeId: `T${t}`,
      name: `Task Type T${t} (backward compat stub)`,
      archetype,
      entry: `Legacy trigger for T${t}`,
      purpose: `Backward compatibility stub for T${t}`,
      familyId,
      factoryDependencies: [
        {
          factoryId: `F${t}`,
          interfaceName: `IService_T${t}`,
          fabricType,
          description: `Primary dependency for T${t}`,
        },
      ] as FactoryDependency[],
      afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
      qualityGates: [
        {
          gateId: `QG-${t}-01`,
          description: `DNA compliance for T${t}`,
          severity: 'error',
          checkType: 'dna_compliance',
        },
      ] as QualityGate[],
      bfaRegistration: {
        entities: [`entity_t${t}`],
        events: [`t${t}.processed`],
        apiRoutes: [`/api/t${t}`],
      },
      ironRules: ['Fabric-only access', 'Scope isolation'],
      machineComponents: ['DataProcessResult wrapping'],
      freedomComponents: [`T${t} config parameter`],
      ...(needsArbiterConfig ? { arbiterConfig: STUB_ARBITER_CONFIG } : {}),
    });

    const result = registry.register(contract);
    if (result.isSuccess) count++;
  }

  return count;
}

/**
 * Register FLOW-02 through FLOW-05 BFA data.
 * (FLOW-01 removed — implementation deleted, pending re-implementation via cycle-chain/run)
 */
export function loadExistingBfaRegistrations(bfa: IBfaValidator): number {
  let count = 0;

  for (const flow of FLOW_BFA_DATA) {
    const result = bfa.registerFlow(flow.flowId, {
      entities: flow.entities,
      events: flow.events,
      apiRoutes: flow.apiRoutes,
    });
    if (result.isSuccess) count++;
  }

  return count;
}

/**
 * Load all backward compatibility data into registries.
 * Returns counts for each category.
 */
export function loadAllBackwardCompat(
  factoryRegistry: FactoryRegistry,
  taskRegistry: TaskTypeRegistry,
  bfa: IBfaValidator,
): Record<string, number> {
  const factories = loadFactoryStubs(factoryRegistry);
  const taskTypes = loadTaskTypeStubs(taskRegistry);
  const bfaFlows = loadExistingBfaRegistrations(bfa);

  return {
    factories_loaded: factories,
    task_types_loaded: taskTypes,
    bfa_flows_loaded: bfaFlows,
    total_loaded: factories + taskTypes + bfaFlows,
  };
}

/** Exported for testing. */
export { FAMILIES, FLOW_BFA_DATA };
