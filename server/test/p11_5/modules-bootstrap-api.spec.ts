/**
 * P11.5 Tests — Part 1: Modules + Bootstrap + DocsController
 *
 * Tests:
 * - RagInitModule: provides RagIndexerService; provides CodePatternExtractor
 * - DocGenModule: provides all 4 generators
 * - RagBootstrapPhase: executes extraction; ingests into RAG; handles missing tenantId;
 *   non-blocking on ingest failure; buildMinimalSourceMap produces indexable patterns
 * - DocsController: getOpenApi; getCatalog; getDiagram (module, fabric, pipeline);
 *   getDiagram invalid type; getModuleReadme; getModuleReadme not found;
 *   getRagStats; updateRagStats; markRagFailed
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FactoryRegistry } from '../../src/factories/factory-registry';
import { createRegistryEntry } from '../../src/factories/factory-interfaces';
import { FabricType } from '../../src/factories/fabric-type';
import { TaskTypeRegistry } from '../../src/engine-contracts/task-type-registry';
import { EngineContract } from '../../src/engine-contracts/contract-schema';
import { ContractArchetype } from '../../src/engine-contracts/archetypes';

// RAG Init
import { CodePatternExtractor } from '../../src/rag-init/code-pattern-extractor';
import { SkillIndexer } from '../../src/rag-init/skill-indexer';
import { TestPatternIndexer } from '../../src/rag-init/test-pattern-indexer';
import { RagIndexerService } from '../../src/rag-init/rag-indexer.service';

// Doc Gen
import { OpenApiGenerator } from '../../src/doc-gen/openapi-generator';
import { ModuleReadmeGenerator } from '../../src/doc-gen/module-readme-generator';
import { ServiceCatalogGenerator } from '../../src/doc-gen/service-catalog-generator';
import { DiagramGenerator } from '../../src/doc-gen/diagram-generator';

// Bootstrap
import { RagBootstrapPhase, type EngineSourceMap } from '../../src/bootstrap/rag-bootstrap-phase';

// API
import { DocsController } from '../../src/api/docs.controller';

// ── Test Helpers ────────────────────────────────────

function createIndexerService(): RagIndexerService {
  return new RagIndexerService(
    new CodePatternExtractor(),
    new SkillIndexer(),
    new TestPatternIndexer(),
  );
}

function sampleSourceMap(): EngineSourceMap {
  const sources = new Map<string, string>();
  sources.set(
    'kernel/data-process-result.ts',
    `
    export class DataProcessResult<T> {
      readonly isSuccess: boolean;
      readonly data?: T;
      static success<T>(data: T): DataProcessResult<T> { return new DataProcessResult(true, data) as any; }
      static failure(code: string, message: string): DataProcessResult<never> { return new DataProcessResult(false) as any; }
    }
  `,
  );
  sources.set(
    'factories/factory-registry.ts',
    `
    export class FactoryRegistry {
      register(entry: Record<string, unknown>): DataProcessResult<boolean> { return DataProcessResult.success(true); }
    }
  `,
  );
  sources.set(
    'fabrics/database/in-memory.provider.ts',
    `
    export class InMemoryDatabaseProvider {
      async storeDocument(tenantId: string, index: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
        return DataProcessResult.success({ stored: true });
      }
      async searchDocuments(tenantId: string, index: string, filters: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
        const result = buildSearchFilter(filters);
        return DataProcessResult.success({ results: [] });
      }
    }
  `,
  );

  const testSources = new Map<string, string>();
  testSources.set(
    'test/kernel/data-process-result.spec.ts',
    `
    describe('DataProcessResult', () => {
      it('should create success result', () => {
        const result = DataProcessResult.success({ value: 42 });
        expect(result.isSuccess).toBe(true);
      });
    });
  `,
  );

  const ragContextPatterns: Array<Record<string, unknown>> = [
    {
      id: 'SK-01',
      name: 'MicroserviceBase',
      tags: ['microservice', 'DNA-4'],
      description: 'Base class',
    },
    {
      id: 'SK-02',
      name: 'DataProcessResult',
      tags: ['result', 'DNA-3'],
      description: 'Result wrapper',
    },
  ];

  const contractDicts: Array<Record<string, unknown>> = [
    {
      task_type_id: 'T44',
      name: 'Test Contract',
      archetype: 'orchestration',
      factory_dependencies: [{ factory_id: 'F166', fabric_type: 'database' }],
      quality_gates: [{ gate_id: 'QG-01', severity: 'error' }],
    },
  ];

  return { sources, testSources, ragContextPatterns, contractDicts };
}

function mockRagService(shouldFail = false): { ingest: jest.Mock } {
  return {
    ingest: jest
      .fn()
      .mockResolvedValue(
        shouldFail
          ? DataProcessResult.failure('INGEST_ERROR', 'Mock ingest failed')
          : DataProcessResult.success({ ingested: true }),
      ),
  };
}

function populatedRegistries(): { factoryReg: FactoryRegistry; taskReg: TaskTypeRegistry } {
  const factoryReg = new FactoryRegistry();
  factoryReg.register(
    createRegistryEntry({
      factoryId: 'F166',
      interfaceName: 'IInventoryService',
      familyId: 'Family-25',
      fabricType: FabricType.DATABASE,
    }),
  );

  const taskReg = new TaskTypeRegistry();
  taskReg.register(
    new EngineContract({
      taskTypeId: 'T44',
      name: 'Inventory Sync Gate',
      archetype: ContractArchetype.ORCHESTRATION,
      entry: 'On inventory update',
      purpose: 'Sync inventory',
      factoryDependencies: [
        {
          factoryId: 'F166',
          interfaceName: 'IInventoryService',
          fabricType: FabricType.DATABASE,
          description: 'Inventory',
        },
      ],
      afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
      qualityGates: [
        {
          gateId: 'QG-01',
          description: 'DNA check',
          severity: 'error',
          checkType: 'dna_compliance',
        },
      ],
      bfaRegistration: {
        entities: ['inventory_item'],
        events: ['inventory.synced'],
        apiRoutes: ['/api/inventory'],
      },
      ironRules: ['Must use MicroserviceBase'],
      machineComponents: ['sync_logic'],
      freedomComponents: ['sync_interval'],
    }),
  );

  return { factoryReg, taskReg };
}

// ══════════════════════════════════════════════════════
// RagBootstrapPhase
// ══════════════════════════════════════════════════════

describe('RagBootstrapPhase', () => {
  let phase: RagBootstrapPhase;

  beforeEach(() => {
    phase = new RagBootstrapPhase(createIndexerService());
  });

  it('should execute extraction and return pattern counts', async () => {
    const result = await phase.execute(sampleSourceMap(), 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsExtracted).toBeGreaterThan(0);
    expect(result.data!.filesScanned).toBeGreaterThan(0);
  });

  it('should ingest into RAG service when provided', async () => {
    const ragService = mockRagService();
    const result = await phase.execute(sampleSourceMap(), 'tenant-1', ragService);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsIngested).toBeGreaterThan(0);
    expect(ragService.ingest).toHaveBeenCalled();
  });

  it('should skip ingestion when no RAG service provided', async () => {
    const result = await phase.execute(sampleSourceMap(), 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsIngested).toBe(0);
  });

  it('should fail on missing tenantId (DNA-5)', async () => {
    const result = await phase.execute(sampleSourceMap(), '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should be non-blocking on ingest failure', async () => {
    const ragService = mockRagService(true);
    const result = await phase.execute(sampleSourceMap(), 'tenant-1', ragService);
    // Extraction succeeds even if ingest fails
    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsExtracted).toBeGreaterThan(0);
  });

  it('should report elapsed time', async () => {
    const result = await phase.execute(sampleSourceMap(), 'tenant-1');
    expect(result.data!.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('should report byCategory breakdown', async () => {
    const result = await phase.execute(sampleSourceMap(), 'tenant-1');
    expect(result.data!.byCategory).toBeDefined();
    expect(typeof result.data!.byCategory).toBe('object');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const result = await phase.execute(sampleSourceMap(), 'tenant-1');
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  describe('buildMinimalSourceMap', () => {
    it('should produce indexable patterns', () => {
      const map = phase.buildMinimalSourceMap(
        [{ id: 'SK-01', name: 'Test', tags: ['test'], description: 'test' }],
        [{ task_type_id: 'T44', name: 'Test Contract' }],
      );
      expect(map.sources.size).toBeGreaterThan(0);
      expect(map.ragContextPatterns).toHaveLength(1);
      expect(map.contractDicts).toHaveLength(1);
    });

    it('should produce patterns that extract via indexer', async () => {
      const map = phase.buildMinimalSourceMap(
        [{ id: 'SK-01', name: 'MicroserviceBase', tags: ['microservice'], description: 'base' }],
        [],
      );
      const result = await phase.execute(map, 'tenant-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.patternsExtracted).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════
// DocsController
// ══════════════════════════════════════════════════════

describe('DocsController', () => {
  let controller: DocsController;
  let factoryReg: FactoryRegistry;
  let taskReg: TaskTypeRegistry;

  beforeEach(() => {
    const regs = populatedRegistries();
    factoryReg = regs.factoryReg;
    taskReg = regs.taskReg;
    controller = new DocsController(
      new OpenApiGenerator(),
      new ModuleReadmeGenerator(),
      new ServiceCatalogGenerator(),
      new DiagramGenerator(),
      factoryReg,
      taskReg,
    );
  });

  describe('getOpenApi', () => {
    it('should return valid OpenAPI 3.0 spec', () => {
      const result = controller.getOpenApi();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.openapi).toBe('3.0.0');
      expect(result.data!.paths).toBeDefined();
    });

    it('should include health, tenant, engine paths', () => {
      const result = controller.getOpenApi();
      const paths = result.data!.paths as Record<string, unknown>;
      expect(paths['/health/live']).toBeDefined();
      expect(paths['/tenants']).toBeDefined();
      expect(paths['/engine/generate']).toBeDefined();
    });
  });

  describe('getCatalog', () => {
    it('should return catalog with factories', () => {
      const result = controller.getCatalog();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.factories.length).toBeGreaterThanOrEqual(1);
    });

    it('should return catalog with contracts', () => {
      const result = controller.getCatalog();
      expect(result.data!.contracts.length).toBeGreaterThanOrEqual(1);
      expect(result.data!.contracts[0].task_type_id).toBe('T44');
    });

    it('should include fabric resolution map', () => {
      const result = controller.getCatalog();
      expect(result.data!.fabric_resolution_map).toBeDefined();
    });
  });

  describe('getDiagram', () => {
    it('should return module dependency diagram', () => {
      const result = controller.getDiagram('module');
      expect(result.isSuccess).toBe(true);
      const data = result.data!;
      expect(data.type).toBe('module');
      expect(typeof data.mermaid).toBe('string');
      expect(data.mermaid as string).toContain('flowchart');
    });

    it('should return fabric layer diagram', () => {
      const result = controller.getDiagram('fabric');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.mermaid as string).toContain('DATABASE');
    });

    it('should return pipeline diagram', () => {
      const result = controller.getDiagram('pipeline');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.mermaid as string).toContain('INVENTORY');
      expect(result.data!.mermaid as string).toContain('AF-1');
    });

    it('should fail for invalid diagram type', () => {
      const result = controller.getDiagram('invalid_type');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_DIAGRAM_TYPE');
    });

    it('should fail for flow diagram without flowDef', () => {
      const result = controller.getDiagram('flow');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_DEF');
    });

    it('should return flow diagram with flowDef', () => {
      const result = controller.getDiagram('flow', {
        nodes: [{ id: 'a', label: 'Start', type: 'start' }],
        edges: [],
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.mermaid as string).toContain('Start');
    });
  });

  describe('getModuleReadme', () => {
    it('should return README for KernelModule', () => {
      const result = controller.getModuleReadme('KernelModule');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.markdown as string).toContain('# KernelModule');
    });

    it('should fail for unknown module', () => {
      const result = controller.getModuleReadme('NonExistentModule');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MODULE_NOT_FOUND');
    });

    it('should include module name in response', () => {
      const result = controller.getModuleReadme('FabricsModule');
      expect(result.data!.module_name).toBe('FabricsModule');
    });
  });

  describe('getRagStats', () => {
    it('should return initial stats (not_started)', () => {
      const result = controller.getRagStats();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.indexingStatus).toBe('not_started');
      expect(result.data!.totalPatterns).toBe(0);
    });

    it('should reflect updated stats after indexing', () => {
      controller.updateRagStats({ totalPatterns: 85, byCategory: { SKILL: 9, DNA_PATTERN: 18 } });
      const result = controller.getRagStats();
      expect(result.data!.totalPatterns).toBe(85);
      expect(result.data!.indexingStatus).toBe('complete');
      expect(result.data!.lastIndexedAt).not.toBeNull();
      expect(result.data!.byCategory.SKILL).toBe(9);
    });

    it('should reflect failed status', () => {
      controller.markRagFailed();
      const result = controller.getRagStats();
      expect(result.data!.indexingStatus).toBe('failed');
    });
  });
});
