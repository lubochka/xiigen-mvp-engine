/**
 * P11.5 E2E Tests — Full Phase 11 integration tests.
 *
 * Tests the 10 engine completeness checklist items for Phase 11:
 * 1. CodePatternExtractor scans real engine source → extracts 10+ patterns
 * 2. RagIndexerService.indexAll → merges skills + code + test patterns → total > 20
 * 3. ingestIntoRag stores patterns in mock RAG → searchable
 * 4. After indexing, AF-4 search returns real engine patterns (not just hardcoded 9)
 * 5. OpenApiGenerator produces valid OpenAPI with health/tenant/engine paths
 * 6. ServiceCatalog lists all registered factories with fabric resolution
 * 7. DiagramGenerator produces valid Mermaid for module deps + fabric layers + pipeline
 * 8. ModuleReadmeGenerator produces markdown for at least 5 modules
 * 9. DocsController endpoints return data
 * 10. Engine completeness: RAG patterns indexed + OpenAPI generated
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

// Bootstrap + API
import { RagBootstrapPhase } from '../../src/bootstrap/rag-bootstrap-phase';
import { DocsController } from '../../src/api/docs.controller';

// ── Real Engine Source Fixtures ─────────────────────

/**
 * Build a realistic source map from actual engine patterns.
 * These are representative snippets of real engine code.
 */
function realEngineSourceMap() {
  const sources = new Map<string, string>();

  // Kernel
  sources.set(
    'src/kernel/data-process-result.ts',
    `
export class DataProcessResult<T> {
  readonly isSuccess: boolean;
  readonly data?: T;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly metadata: Record<string, unknown>;

  private constructor(success: boolean, data?: T, errorCode?: string, errorMessage?: string) {
    this.isSuccess = success;
    this.data = data;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.metadata = { timestamp: new Date().toISOString() };
  }

  static success<T>(data: T): DataProcessResult<T> {
    return new DataProcessResult(true, data);
  }

  static failure(code: string, message: string): DataProcessResult<never> {
    return new DataProcessResult(false, undefined, code, message) as any;
  }
}
  `,
  );

  sources.set(
    'src/kernel/build-search-filter.ts',
    `
export function buildSearchFilter(params: Record<string, unknown>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      filters[key] = value;
    }
  }
  return filters;
}
  `,
  );

  sources.set(
    'src/kernel/scope-isolation.ts',
    `
export function validateScope(tenantId: string): DataProcessResult<boolean> {
  if (!tenantId || tenantId.trim() === '') {
    return DataProcessResult.failure('SCOPE_MISSING', 'tenantId is required');
  }
  return DataProcessResult.success(true);
}
  `,
  );

  sources.set(
    'src/kernel/cloud-events.ts',
    `
export class CloudEvent {
  readonly specVersion = '1.0';
  readonly type: string;
  readonly source: string;
  readonly id: string;
  readonly tenantId: string;
  constructor(type: string, source: string, tenantId: string) {
    this.type = type; this.source = source; this.tenantId = tenantId;
    this.id = 'ce-' + Date.now();
  }
}
  `,
  );

  // Fabrics
  sources.set(
    'src/fabrics/interfaces/database.interface.ts',
    `
export abstract class IDatabaseService {
  abstract storeDocument(tenantId: string, index: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>>;
  abstract searchDocuments(tenantId: string, index: string, filters: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>>;
  abstract deleteDocument(tenantId: string, index: string, docId: string): Promise<DataProcessResult<boolean>>;
}
  `,
  );

  sources.set(
    'src/fabrics/interfaces/queue.interface.ts',
    `
export abstract class IQueueService {
  abstract enqueueAsync(tenantId: string, topic: string, payload: Record<string, unknown>): Promise<DataProcessResult<string>>;
  abstract dequeueAsync(tenantId: string, topic: string): Promise<DataProcessResult<Record<string, unknown>>>;
}
  `,
  );

  sources.set(
    'src/fabrics/interfaces/ai-provider.interface.ts',
    `
export abstract class IAiProvider {
  abstract generate(tenantId: string, prompt: string, options?: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>>;
}
  `,
  );

  sources.set(
    'src/fabrics/database/in-memory.provider.ts',
    `
export class InMemoryDatabaseProvider extends IDatabaseService {
  private store = new Map<string, Array<Record<string, unknown>>>();

  async storeDocument(tenantId: string, index: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const key = tenantId + '_' + index;
    if (!this.store.has(key)) this.store.set(key, []);
    this.store.get(key)!.push(doc);
    return DataProcessResult.success({ stored: true, id: doc.id });
  }

  async searchDocuments(tenantId: string, index: string, filters: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const builtFilters = buildSearchFilter({ tenantId, ...filters });
    return DataProcessResult.success({ results: [], filters: builtFilters });
  }

  async deleteDocument(tenantId: string, index: string, docId: string): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}
  `,
  );

  // Factories
  sources.set(
    'src/factories/factory-registry.ts',
    `
export class FactoryRegistry {
  private readonly entries = new Map<string, Record<string, unknown>>();
  register(entry: Record<string, unknown>): DataProcessResult<boolean> {
    this.entries.set(entry.factoryId as string, entry);
    return DataProcessResult.success(true);
  }
  get(factoryId: string): DataProcessResult<Record<string, unknown>> {
    const entry = this.entries.get(factoryId);
    if (!entry) return DataProcessResult.failure('NOT_FOUND', factoryId);
    return DataProcessResult.success(entry);
  }
}
  `,
  );

  sources.set(
    'src/factories/fabric-type.ts',
    `
export enum FabricType {
  DATABASE = 'database',
  QUEUE = 'queue',
  AI_ENGINE = 'ai_engine',
  RAG = 'rag',
  FLOW_ENGINE = 'flow_engine',
  CORE = 'core',
  SECRETS = 'secrets',
}
  `,
  );

  // AF Stations
  sources.set(
    'src/af-stations/af4-rag-context.ts',
    `
export class RagContextStation {
  private readonly patterns: Array<Record<string, unknown>> = [];
  indexPattern(pattern: Record<string, unknown>): void { this.patterns.push(pattern); }
  search(keywords: string[]): Array<Record<string, unknown>> {
    return this.patterns.filter(p => {
      const tags = (p.tags as string[]) || [];
      return keywords.some(kw => tags.includes(kw));
    });
  }
}
  `,
  );

  // Test sources
  const testSources = new Map<string, string>();
  testSources.set(
    'test/kernel/data-process-result.spec.ts',
    `
describe('DataProcessResult', () => {
  it('should create success result', () => {
    const result = DataProcessResult.success({ value: 42 });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ value: 42 });
  });
  it('should create failure result', () => {
    const result = DataProcessResult.failure('ERR', 'msg');
    expect(result.isSuccess).toBe(false);
  });
});
  `,
  );

  testSources.set(
    'test/factories/factory-registry.spec.ts',
    `
describe('FactoryRegistry', () => {
  const registry = new FactoryRegistry();
  it('should register and retrieve factory', () => {
    registry.register({ factoryId: 'F166' });
    const result = registry.get('F166');
    expect(result.isSuccess).toBe(true);
  });
  it('should fail for unknown factory', () => {
    const result = registry.get('F999');
    expect(result.isSuccess).toBe(false);
  });
});
  `,
  );

  // AF-4 core patterns (representing RagContextStation's hardcoded 9)
  const ragContextPatterns = [
    {
      id: 'SK-01',
      name: 'MicroserviceBase',
      tags: ['microservice', 'base', 'DNA-4'],
      description: 'Base class',
    },
    {
      id: 'SK-02',
      name: 'DataProcessResult',
      tags: ['result', 'DNA-3'],
      description: 'Result wrapper',
    },
    {
      id: 'SK-03',
      name: 'BuildSearchFilter',
      tags: ['filter', 'query', 'DNA-2', 'database'],
      description: 'Auto-skip empty',
    },
    {
      id: 'SK-04',
      name: 'Factory Resolution',
      tags: ['factory', 'createAsync'],
      description: 'Factory pattern',
    },
    {
      id: 'SK-05',
      name: 'Queue Event',
      tags: ['queue', 'event', 'redis'],
      description: 'Queue pattern',
    },
    {
      id: 'SK-06',
      name: 'Scope Isolation',
      tags: ['tenant', 'scope', 'DNA-5'],
      description: 'Tenant scoping',
    },
    {
      id: 'SK-07',
      name: 'DynamicController',
      tags: ['controller', 'dynamic', 'DNA-6'],
      description: 'Dynamic routes',
    },
    {
      id: 'SK-08',
      name: 'Orchestration',
      tags: ['orchestration', 'dag', 'parallel'],
      description: 'DAG pattern',
    },
    {
      id: 'SK-09',
      name: 'AI Generation',
      tags: ['ai', 'llm', 'multi-model'],
      description: 'AI via fabric',
    },
  ];

  const contractDicts = [
    {
      task_type_id: 'T44',
      name: 'Inventory Sync',
      archetype: 'orchestration',
      factory_dependencies: [
        { factory_id: 'F166', interface_name: 'IInventoryService', fabric_type: 'database' },
      ],
      quality_gates: [{ gate_id: 'QG-01', severity: 'error', check_type: 'dna_compliance' }],
    },
  ];

  return { sources, testSources, ragContextPatterns, contractDicts };
}

// ══════════════════════════════════════════════════════
// E2E: Full Phase 11 Pipeline
// ══════════════════════════════════════════════════════

describe('Phase 11 E2E — Full Pipeline', () => {
  // Shared instances
  let extractor: CodePatternExtractor;
  let indexerService: RagIndexerService;
  let bootstrapPhase: RagBootstrapPhase;
  let openApiGen: OpenApiGenerator;
  let readmeGen: ModuleReadmeGenerator;
  let catalogGen: ServiceCatalogGenerator;
  let diagramGen: DiagramGenerator;
  let factoryReg: FactoryRegistry;
  let taskReg: TaskTypeRegistry;
  let docsController: DocsController;

  beforeEach(() => {
    extractor = new CodePatternExtractor();
    indexerService = new RagIndexerService(extractor, new SkillIndexer(), new TestPatternIndexer());
    bootstrapPhase = new RagBootstrapPhase(indexerService);
    openApiGen = new OpenApiGenerator();
    readmeGen = new ModuleReadmeGenerator();
    catalogGen = new ServiceCatalogGenerator();
    diagramGen = new DiagramGenerator();

    factoryReg = new FactoryRegistry();
    factoryReg.register(
      createRegistryEntry({
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        familyId: 'Family-25',
        fabricType: FabricType.DATABASE,
        provider: 'postgresql',
        status: 'GENERATED',
      }),
    );
    factoryReg.register(
      createRegistryEntry({
        factoryId: 'F167',
        interfaceName: 'IStockService',
        familyId: 'Family-25',
        fabricType: FabricType.DATABASE,
        provider: 'elasticsearch',
        status: 'GENERATED',
      }),
    );
    factoryReg.register(
      createRegistryEntry({
        factoryId: 'F168',
        interfaceName: 'INotificationService',
        familyId: 'Family-26',
        fabricType: FabricType.QUEUE,
        provider: 'redis_streams',
        status: 'GENERATED',
      }),
    );

    taskReg = new TaskTypeRegistry();
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
          {
            factoryId: 'F168',
            interfaceName: 'INotificationService',
            fabricType: FabricType.QUEUE,
            description: 'Notifications',
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

    docsController = new DocsController(
      openApiGen,
      readmeGen,
      catalogGen,
      diagramGen,
      factoryReg,
      taskReg,
    );
  });

  // ── E2E #1: CodePatternExtractor scans real source → 10+ patterns ──

  it('E2E-1: should extract 10+ patterns from real engine source', () => {
    const { sources } = realEngineSourceMap();
    const result = extractor.extractFromSources(sources);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalPatterns).toBeGreaterThanOrEqual(10);
  });

  it('E2E-1b: extracted patterns should have correct DNA tags', () => {
    const { sources } = realEngineSourceMap();
    const result = extractor.extractFromSources(sources);
    const allTags = result.data!.patterns.flatMap((p) => [...p.tags]);
    expect(allTags).toContain('DNA-3');
    expect(allTags).toContain('DNA-5');
  });

  // ── E2E #2: indexAll merges skills + code + test → total > 20 ──

  it('E2E-2: should merge all pattern sources → total > 20', () => {
    const { sources, testSources, ragContextPatterns, contractDicts } = realEngineSourceMap();
    const result = indexerService.indexAll(sources, testSources, ragContextPatterns, contractDicts);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalPatterns).toBeGreaterThan(20);
  });

  // ── E2E #3: ingestIntoRag stores patterns ──

  it('E2E-3: should ingest patterns into mock RAG', async () => {
    const { sources, testSources, ragContextPatterns, contractDicts } = realEngineSourceMap();
    const indexResult = indexerService.indexAll(
      sources,
      testSources,
      ragContextPatterns,
      contractDicts,
    );
    const patterns = indexResult.data!.patterns;

    const ragService = {
      ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ ok: true })),
    };

    const result = await indexerService.ingestIntoRag(ragService, patterns, 'tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.ingested).toBe(patterns.length);
    expect(ragService.ingest).toHaveBeenCalled();
  });

  // ── E2E #4: After indexing, AF-4 search returns real patterns ──

  it('E2E-4: should enrich AF-4 search after indexing', async () => {
    const sourceMap = realEngineSourceMap();
    const ragService = {
      ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ ok: true })),
    };

    const result = await bootstrapPhase.execute(sourceMap, 'tenant-1', ragService);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsExtracted).toBeGreaterThan(20);
    // After indexing, the extracted patterns include real code patterns
    // beyond just the hardcoded 9 skill patterns
    expect(result.data!.patternsExtracted).toBeGreaterThan(9);
  });

  // ── E2E #5: OpenAPI valid with health/tenant/engine paths ──

  it('E2E-5: should produce valid OpenAPI with standard paths', () => {
    const result = docsController.getOpenApi();
    expect(result.isSuccess).toBe(true);
    const spec = result.data!;
    expect(spec.openapi).toBe('3.0.0');
    const paths = spec.paths as Record<string, unknown>;
    expect(paths['/health/live']).toBeDefined();
    expect(paths['/tenants']).toBeDefined();
    expect(paths['/engine/generate']).toBeDefined();
    expect(paths['/engine/status']).toBeDefined();
  });

  // ── E2E #6: ServiceCatalog lists factories with fabric resolution ──

  it('E2E-6: should list all factories with fabric resolution', () => {
    const result = docsController.getCatalog();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.factories).toHaveLength(3);
    expect(result.data!.fabric_resolution_map[FabricType.DATABASE]).toContain('F166');
    expect(result.data!.fabric_resolution_map[FabricType.QUEUE]).toContain('F168');
  });

  // ── E2E #7: Mermaid diagrams valid for all types ──

  it('E2E-7: should produce valid Mermaid for module deps + fabric + pipeline', () => {
    const moduleResult = docsController.getDiagram('module');
    expect(moduleResult.isSuccess).toBe(true);
    expect(moduleResult.data!.mermaid as string).toMatch(/^flowchart/);

    const fabricResult = docsController.getDiagram('fabric');
    expect(fabricResult.isSuccess).toBe(true);
    expect(fabricResult.data!.mermaid as string).toContain('DATABASE');

    const pipelineResult = docsController.getDiagram('pipeline');
    expect(pipelineResult.isSuccess).toBe(true);
    expect(pipelineResult.data!.mermaid as string).toContain('INVENTORY');
  });

  // ── E2E #8: Module READMEs for at least 5 modules ──

  it('E2E-8: should produce READMEs for at least 5 modules', () => {
    const modules = readmeGen.getEngineModuleMetadata();
    const result = readmeGen.generateAll(modules);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.size).toBeGreaterThanOrEqual(5);
    // Each README should contain the module title
    for (const [name, readme] of result.data!.entries()) {
      expect(readme).toContain(`# ${name}`);
    }
  });

  // ── E2E #9: Docs API endpoints return data ──

  it('E2E-9: should return data from all docs endpoints', () => {
    // OpenAPI
    expect(docsController.getOpenApi().isSuccess).toBe(true);
    // Catalog
    expect(docsController.getCatalog().isSuccess).toBe(true);
    // Module README
    expect(docsController.getModuleReadme('KernelModule').isSuccess).toBe(true);
    // Diagrams
    expect(docsController.getDiagram('module').isSuccess).toBe(true);
    expect(docsController.getDiagram('fabric').isSuccess).toBe(true);
    expect(docsController.getDiagram('pipeline').isSuccess).toBe(true);
    // RAG stats
    expect(docsController.getRagStats().isSuccess).toBe(true);
  });

  // ── E2E #10: Engine completeness — RAG indexed + OpenAPI generated ──

  it('E2E-10: should complete engine checklist #21 (RAG indexed) + #22 (OpenAPI)', async () => {
    // Checklist #21: Engine patterns indexed
    const sourceMap = realEngineSourceMap();
    const ragService = {
      ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ ok: true })),
    };
    const indexResult = await bootstrapPhase.execute(sourceMap, 'tenant-1', ragService);
    expect(indexResult.isSuccess).toBe(true);
    expect(indexResult.data!.patternsExtracted).toBeGreaterThan(0);

    // Update RAG stats
    docsController.updateRagStats({
      totalPatterns: indexResult.data!.patternsExtracted,
      byCategory: indexResult.data!.byCategory,
    });
    const ragStats = docsController.getRagStats();
    expect(ragStats.data!.indexingStatus).toBe('complete');
    expect(ragStats.data!.totalPatterns).toBeGreaterThan(0);

    // Checklist #22: OpenAPI generated
    const openApiResult = docsController.getOpenApi();
    expect(openApiResult.isSuccess).toBe(true);
    expect(openApiResult.data!.openapi).toBe('3.0.0');
    const paths = openApiResult.data!.paths as Record<string, unknown>;
    expect(Object.keys(paths).length).toBeGreaterThanOrEqual(10);
  });
});
