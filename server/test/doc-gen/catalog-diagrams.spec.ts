/**
 * P11.4 Tests — ServiceCatalogGenerator + DiagramGenerator
 *
 * Tests:
 * ServiceCatalog:
 *   - generates catalog with factory entries
 *   - includes fabric resolution map
 *   - groups by fabric type in summary
 *   - groups by status in summary
 *   - groups by family in summary
 *   - summary stats correct (totals)
 *   - includes contract entries
 *   - contract entries have archetype, factory deps, quality gates, BFA
 *   - DNA checklist on factory entries
 *   - handles empty registries
 *   - search filters by factory ID
 *   - search filters by contract name
 *   - search with no matches returns empty
 *   - DNA-3: returns DataProcessResult
 *
 * DiagramGenerator:
 *   - module diagram contains all module names
 *   - module diagram has arrows for imports
 *   - fabric diagram shows 6 layers
 *   - fabric diagram shows providers per layer
 *   - fabric diagram shows CORE connecting to all
 *   - pipeline diagram shows 3 sub-engines
 *   - pipeline diagram shows all 11 AF stations
 *   - pipeline diagram has inter-engine flow
 *   - flow DAG renders task nodes
 *   - flow DAG renders gateway nodes
 *   - flow DAG renders start/end nodes
 *   - flow DAG renders edges
 *   - flow DAG renders edge labels
 *   - flow DAG includes factoryId annotations
 *   - flow DAG handles empty flow definition
 *   - valid Mermaid syntax (starts with flowchart)
 *   - module deps has correct engine dependencies
 *   - all diagrams return DataProcessResult (DNA-3)
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { createRegistryEntry } from '../../src/factories/factory-interfaces';
import { FabricType } from '../../src/factories/fabric-type';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { EngineContract } from '../../src/engine-contracts/contract-schema';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';
import { ServiceCatalogGenerator } from '../../src/doc-gen/service-catalog-generator';
import { DiagramGenerator, type FlowDefinitionInput } from '../../src/doc-gen/diagram-generator';

// ── Test Data ───────────────────────────────────────

function populatedFactoryRegistry(): FactoryRegistry {
  const reg = new FactoryRegistry();
  reg.register(
    createRegistryEntry({
      factoryId: 'F166',
      interfaceName: 'IInventoryService',
      familyId: 'Family-25',
      fabricType: FabricType.DATABASE,
      provider: 'postgresql',
      status: 'GENERATED',
      methods: ['storeItem', 'searchItems'],
      description: 'Inventory service',
    }),
  );
  reg.register(
    createRegistryEntry({
      factoryId: 'F167',
      interfaceName: 'IStockService',
      familyId: 'Family-25',
      fabricType: FabricType.DATABASE,
      provider: 'elasticsearch',
      status: 'INJECTED',
      methods: ['checkStock'],
      description: 'Stock level service',
    }),
  );
  reg.register(
    createRegistryEntry({
      factoryId: 'F168',
      interfaceName: 'INotificationService',
      familyId: 'Family-26',
      fabricType: FabricType.QUEUE,
      provider: 'redis_streams',
      status: 'GENERATED',
      methods: ['enqueueNotification'],
      description: 'Notification service',
    }),
  );
  return reg;
}

function populatedTaskTypeRegistry(): TaskTypeRegistry {
  const reg = new TaskTypeRegistry();
  reg.register(
    new EngineContract({
      taskTypeId: 'T44',
      name: 'Inventory Sync Gate',
      archetype: ContractArchetype.ORCHESTRATION,
      entry: 'On inventory update event',
      purpose: 'Sync inventory across warehouses',
      factoryDependencies: [
        {
          factoryId: 'F166',
          interfaceName: 'IInventoryService',
          fabricType: FabricType.DATABASE,
          description: 'Inventory data',
        },
        {
          factoryId: 'F168',
          interfaceName: 'INotificationService',
          fabricType: FabricType.QUEUE,
          description: 'Notifications',
        },
      ],
      afStations: [
        { stationId: 'AF-1', role: 'generate', config: {} },
        { stationId: 'AF-9', role: 'judge', config: {} },
      ],
      qualityGates: [
        {
          gateId: 'QG-01',
          description: 'DNA compliance',
          severity: 'error',
          checkType: 'dna_compliance',
        },
      ],
      bfaRegistration: {
        entities: ['inventory_item'],
        events: ['inventory.synced'],
        apiRoutes: ['/api/inventory'],
      },
      ironRules: ['Must use MicroserviceBase', 'Must scope by tenantId'],
      machineComponents: ['sync_logic'],
      freedomComponents: ['sync_interval'],
      familyId: 'Family-25',
    }),
  );
  return reg;
}

const SAMPLE_FLOW: FlowDefinitionInput = {
  name: 'Inventory Sync',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'fetch', label: 'Fetch Inventory', type: 'task', factoryId: 'F166' },
    { id: 'check', label: 'Stock Check', type: 'gateway' },
    { id: 'notify', label: 'Send Notification', type: 'task', factoryId: 'F168' },
    { id: 'done', label: 'End', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'fetch' },
    { from: 'fetch', to: 'check' },
    { from: 'check', to: 'notify', label: 'Low Stock' },
    { from: 'check', to: 'done', label: 'OK' },
    { from: 'notify', to: 'done' },
  ],
};

// ══════════════════════════════════════════════════════
// ServiceCatalogGenerator
// ══════════════════════════════════════════════════════

describe('ServiceCatalogGenerator', () => {
  let gen: ServiceCatalogGenerator;
  let factoryReg: FactoryRegistry;
  let taskReg: TaskTypeRegistry;

  beforeEach(() => {
    gen = new ServiceCatalogGenerator();
    factoryReg = populatedFactoryRegistry();
    taskReg = populatedTaskTypeRegistry();
  });

  it('should generate catalog with factory entries', () => {
    const result = gen.generate(factoryReg, taskReg);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factories).toHaveLength(3);
    expect(result.data!.factories[0].factory_id).toBeDefined();
  });

  it('should include fabric resolution map', () => {
    const result = gen.generate(factoryReg, taskReg);
    const map = result.data!.fabric_resolution_map;
    expect(map[FabricType.DATABASE]).toContain('F166');
    expect(map[FabricType.DATABASE]).toContain('F167');
    expect(map[FabricType.QUEUE]).toContain('F168');
  });

  it('should group by fabric type in summary', () => {
    const result = gen.generate(factoryReg, taskReg);
    const byFabric = result.data!.summary.by_fabric;
    expect(byFabric[FabricType.DATABASE]).toBe(2);
    expect(byFabric[FabricType.QUEUE]).toBe(1);
  });

  it('should group by status in summary', () => {
    const result = gen.generate(factoryReg, taskReg);
    const byStatus = result.data!.summary.by_status;
    expect(byStatus['GENERATED']).toBe(2);
    expect(byStatus['INJECTED']).toBe(1);
  });

  it('should group by family in summary', () => {
    const result = gen.generate(factoryReg, taskReg);
    const byFamily = result.data!.summary.by_family;
    expect(byFamily['Family-25']).toBe(2);
    expect(byFamily['Family-26']).toBe(1);
  });

  it('should have correct totals in summary', () => {
    const result = gen.generate(factoryReg, taskReg);
    expect(result.data!.summary.total_factories).toBe(3);
    expect(result.data!.summary.total_contracts).toBe(1);
  });

  it('should include contract entries', () => {
    const result = gen.generate(factoryReg, taskReg);
    expect(result.data!.contracts).toHaveLength(1);
    expect(result.data!.contracts[0].task_type_id).toBe('T44');
  });

  it('should include archetype, factory deps, quality gates, BFA in contracts', () => {
    const result = gen.generate(factoryReg, taskReg);
    const contract = result.data!.contracts[0];
    expect(contract.archetype).toBe(ContractArchetype.ORCHESTRATION);
    expect(contract.factory_dependencies.length).toBeGreaterThanOrEqual(2);
    expect(contract.quality_gates.length).toBeGreaterThanOrEqual(1);
    expect(contract.bfa_registration).toBeDefined();
    expect((contract.bfa_registration as any).entities).toBeDefined();
  });

  it('should include iron_rules in contract entries', () => {
    const result = gen.generate(factoryReg, taskReg);
    const contract = result.data!.contracts[0];
    expect(contract.iron_rules).toContain('Must use MicroserviceBase');
  });

  it('should include DNA checklist on factory entries', () => {
    const result = gen.generate(factoryReg, taskReg);
    const entry = result.data!.factories[0];
    expect(entry.dna_checklist).toBeDefined();
    expect(entry.dna_checklist.length).toBeGreaterThan(0);
    // DNA-1 and DNA-3 should always be applicable
    const dna1 = entry.dna_checklist.find((d) => d.id === 'DNA-1');
    expect(dna1?.applicable).toBe(true);
    const dna3 = entry.dna_checklist.find((d) => d.id === 'DNA-3');
    expect(dna3?.applicable).toBe(true);
  });

  it('should mark DNA-2 applicable for DATABASE fabric factories', () => {
    const result = gen.generate(factoryReg, taskReg);
    const dbFactory = result.data!.factories.find((f) => f.factory_id === 'F166')!;
    const dna2 = dbFactory.dna_checklist.find((d) => d.id === 'DNA-2');
    expect(dna2?.applicable).toBe(true);

    const queueFactory = result.data!.factories.find((f) => f.factory_id === 'F168')!;
    const dna2Queue = queueFactory.dna_checklist.find((d) => d.id === 'DNA-2');
    expect(dna2Queue?.applicable).toBe(false);
  });

  it('should handle empty registries', () => {
    const result = gen.generate(new FactoryRegistry(), new TaskTypeRegistry());
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factories).toHaveLength(0);
    expect(result.data!.contracts).toHaveLength(0);
    expect(result.data!.summary.total_factories).toBe(0);
    expect(result.data!.summary.total_contracts).toBe(0);
  });

  it('should include generated_at timestamp', () => {
    const result = gen.generate(factoryReg, taskReg);
    expect(result.data!.generated_at).toBeDefined();
    expect(typeof result.data!.generated_at).toBe('string');
  });

  it('should include methods on factory entries', () => {
    const result = gen.generate(factoryReg, taskReg);
    const f166 = result.data!.factories.find((f) => f.factory_id === 'F166')!;
    expect(f166.methods).toContain('storeItem');
    expect(f166.methods).toContain('searchItems');
  });

  // ── Search ────────────────────────────────────────

  it('should search and filter by factory ID', () => {
    const catalog = gen.generate(factoryReg, taskReg).data!;
    const result = gen.search(catalog, 'F166');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factories).toHaveLength(1);
    expect(result.data!.factories[0].factory_id).toBe('F166');
  });

  it('should search and filter by contract name', () => {
    const catalog = gen.generate(factoryReg, taskReg).data!;
    const result = gen.search(catalog, 'Inventory');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.contracts).toHaveLength(1);
    expect(result.data!.factories.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty results for unmatched search', () => {
    const catalog = gen.generate(factoryReg, taskReg).data!;
    const result = gen.search(catalog, 'zzz_nonexistent_zzz');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factories).toHaveLength(0);
    expect(result.data!.contracts).toHaveLength(0);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = gen.generate(factoryReg, taskReg);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// DiagramGenerator
// ══════════════════════════════════════════════════════

describe('DiagramGenerator', () => {
  let gen: DiagramGenerator;

  beforeEach(() => {
    gen = new DiagramGenerator();
  });

  // ── Module Dependency Diagram ─────────────────────

  describe('generateModuleDependencyDiagram', () => {
    it('should contain all engine module names', () => {
      const result = gen.generateModuleDependencyDiagram();
      expect(result.isSuccess).toBe(true);
      const diagram = result.data!;
      expect(diagram).toContain('KernelModule');
      expect(diagram).toContain('FabricsModule');
      expect(diagram).toContain('FactoriesModule');
      expect(diagram).toContain('AfStationsModule');
      expect(diagram).toContain('EngineModule');
      expect(diagram).toContain('ApiModule');
    });

    it('should have arrows for imports', () => {
      const result = gen.generateModuleDependencyDiagram();
      const diagram = result.data!;
      // FabricsModule imports KernelModule
      expect(diagram).toContain('FabricsModule --> KernelModule');
      // FactoriesModule imports FabricsModule
      expect(diagram).toContain('FactoriesModule --> FabricsModule');
    });

    it('should start with flowchart', () => {
      const result = gen.generateModuleDependencyDiagram();
      expect(result.data!).toMatch(/^flowchart/);
    });

    it('should handle custom module list', () => {
      const result = gen.generateModuleDependencyDiagram([
        { name: 'ModA', imports: ['ModB'] },
        { name: 'ModB', imports: [] },
      ]);
      expect(result.data!).toContain('ModA');
      expect(result.data!).toContain('ModB');
      expect(result.data!).toContain('ModA --> ModB');
    });

    it('should handle empty module list', () => {
      const result = gen.generateModuleDependencyDiagram([]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toContain('No modules defined');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = gen.generateModuleDependencyDiagram();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── Fabric Layer Diagram ──────────────────────────

  describe('generateFabricLayerDiagram', () => {
    it('should show all 6 fabric layers', () => {
      const result = gen.generateFabricLayerDiagram();
      const diagram = result.data!;
      expect(diagram).toContain('DATABASE');
      expect(diagram).toContain('QUEUE');
      expect(diagram).toContain('AI_ENGINE');
      expect(diagram).toContain('RAG');
      expect(diagram).toContain('SECRETS');
      expect(diagram).toContain('FLOW_ENGINE');
    });

    it('should show providers for each layer', () => {
      const result = gen.generateFabricLayerDiagram();
      const diagram = result.data!;
      expect(diagram).toContain('PostgreSQL');
      expect(diagram).toContain('Elasticsearch');
      expect(diagram).toContain('Redis Streams');
      expect(diagram).toContain('Claude');
      expect(diagram).toContain('OpenAI');
    });

    it('should show CORE connecting to all layers', () => {
      const result = gen.generateFabricLayerDiagram();
      const diagram = result.data!;
      expect(diagram).toContain('CORE --> DATABASE');
      expect(diagram).toContain('CORE --> QUEUE');
      expect(diagram).toContain('CORE --> AI_ENGINE');
      expect(diagram).toContain('CORE --> RAG');
      expect(diagram).toContain('CORE --> SECRETS');
      expect(diagram).toContain('CORE --> FLOW_ENGINE');
    });

    it('should start with flowchart', () => {
      const result = gen.generateFabricLayerDiagram();
      expect(result.data!).toMatch(/^flowchart/);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = gen.generateFabricLayerDiagram();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── Pipeline Diagram ──────────────────────────────

  describe('generatePipelineDiagram', () => {
    it('should show 3 sub-engines', () => {
      const result = gen.generatePipelineDiagram();
      const diagram = result.data!;
      expect(diagram).toContain('INVENTORY');
      expect(diagram).toContain('SYNTHESIS');
      expect(diagram).toContain('JUDGMENT');
    });

    it('should show all 11 AF stations', () => {
      const result = gen.generatePipelineDiagram();
      const diagram = result.data!;
      for (let i = 1; i <= 11; i++) {
        expect(diagram).toContain(`AF-${i}`);
      }
    });

    it('should have inter-engine flow arrows', () => {
      const result = gen.generatePipelineDiagram();
      const diagram = result.data!;
      expect(diagram).toContain('INVENTORY --> SYNTHESIS');
      expect(diagram).toContain('SYNTHESIS --> JUDGMENT');
    });

    it('should start with flowchart', () => {
      const result = gen.generatePipelineDiagram();
      expect(result.data!).toMatch(/^flowchart/);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = gen.generatePipelineDiagram();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── Flow DAG Diagram ──────────────────────────────

  describe('generateFlowDagDiagram', () => {
    it('should render task nodes as rectangles', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('Fetch Inventory');
      expect(diagram).toContain('["'); // rectangle syntax
    });

    it('should render gateway nodes as diamonds', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('Stock Check');
      expect(diagram).toContain('{"'); // diamond syntax
    });

    it('should render start/end nodes as stadiums', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('(["Start"])');
      expect(diagram).toContain('(["End"])');
    });

    it('should render edges', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('start --> fetch');
      expect(diagram).toContain('fetch --> check');
    });

    it('should render edge labels', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('Low Stock');
      expect(diagram).toContain('OK');
    });

    it('should include factoryId annotations on task nodes', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      const diagram = result.data!;
      expect(diagram).toContain('F166');
      expect(diagram).toContain('F168');
    });

    it('should handle empty flow definition', () => {
      const result = gen.generateFlowDagDiagram({ nodes: [], edges: [] });
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toContain('No nodes defined');
    });

    it('should start with flowchart', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      expect(result.data!).toMatch(/^flowchart/);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = gen.generateFlowDagDiagram(SAMPLE_FLOW);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  // ── Engine Module Dependencies ────────────────────

  describe('getEngineModuleDependencies', () => {
    it('should return dependencies for all engine modules', () => {
      const deps = gen.getEngineModuleDependencies();
      expect(deps.length).toBeGreaterThanOrEqual(11);
      const names = deps.map((d) => d.name);
      expect(names).toContain('KernelModule');
      expect(names).toContain('EngineModule');
      expect(names).toContain('RagInitModule');
      expect(names).toContain('DocGenModule');
    });

    it('should show EngineModule importing 5 modules', () => {
      const deps = gen.getEngineModuleDependencies();
      const engine = deps.find((d) => d.name === 'EngineModule')!;
      expect(engine.imports).toContain('AfStationsModule');
      expect(engine.imports).toContain('FactoriesModule');
      expect(engine.imports.length).toBeGreaterThanOrEqual(5);
    });
  });
});
