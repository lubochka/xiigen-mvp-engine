/**
 * P11.2 Tests — SkillIndexer + TestPatternIndexer + RagIndexerService
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { PatternCategory, type CodePattern } from '../../src/rag-init/pattern-types';
import { SkillIndexer } from '../../src/rag-init/skill-indexer';
import { TestPatternIndexer } from '../../src/rag-init/test-pattern-indexer';
import { RagIndexerService } from '../../src/rag-init/rag-indexer.service';
import { CodePatternExtractor } from '../../src/rag-init/code-pattern-extractor';

// ── Test Data ───────────────────────────────────────

const MOCK_CORE_PATTERNS: Array<Record<string, unknown>> = [
  {
    id: 'SK-01',
    name: 'MicroserviceBase',
    tags: ['microservice', 'base', 'DNA-4'],
    description: 'Base class for all services.',
    code_snippet: 'class MyService extends MicroserviceBase {}',
  },
  {
    id: 'SK-02',
    name: 'DataProcessResult',
    tags: ['result', 'error', 'DNA-3'],
    description: 'Structured result type.',
    code_snippet: 'return DataProcessResult.success(data);',
  },
  {
    id: 'SK-03',
    name: 'BuildSearchFilter',
    tags: ['filter', 'DNA-2', 'database'],
    description: 'Skip empty fields.',
    code_snippet: 'buildSearchFilter({ tenantId })',
  },
];

const MOCK_CONTRACTS: Array<Record<string, unknown>> = [
  {
    task_type_id: 'T44',
    name: 'Inventory Management',
    archetype: 'DATA_PIPELINE',
    family_id: 'Family-25',
    factory_dependencies: [
      { factory_id: 'F166', interface_name: 'IInventoryService', fabric_type: 'database' },
      { factory_id: 'F169', interface_name: 'IInventoryEventService', fabric_type: 'queue' },
    ],
    quality_gates: [{ gate_id: 'QG-01', check_type: 'dna_compliance' }],
  },
  {
    task_type_id: 'T45',
    name: 'Marketplace Listing',
    archetype: 'ORCHESTRATION',
    family_id: 'Family-26',
    factory_dependencies: [
      { factory_id: 'F170', interface_name: 'ICooperatorService', fabric_type: 'rag' },
    ],
    quality_gates: [],
  },
];

const TEST_SOURCE = `
describe('InventoryService', () => {
  let service: any;
  const mockDb = jest.fn();

  beforeEach(() => {
    service = new InventoryService();
    mockDb.mockClear();
  });

  it('should store document', () => {
    const result = DataProcessResult.success({ id: '1' });
    expect(result.isSuccess).toBe(true);
  });

  it('should require tenantId', () => {
    const result = service.process('', {});
    expect(result.isSuccess).toBe(false);
  });
});

describe('QueueService', () => {
  const mockQueue = { enqueueAsync: jest.fn() };

  beforeEach(async () => {
    await mockQueue.enqueueAsync.mockClear();
  });

  it('should enqueue event', () => {
    expect(mockQueue.enqueueAsync).toBeDefined();
  });
});
`;

const ENGINE_SOURCE = `
export class HealthReporter {
  async checkAll(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({ status: 'HEALTHY' });
  }
}
`;

// ══════════════════════════════════════════════════════
// SkillIndexer
// ══════════════════════════════════════════════════════

describe('SkillIndexer', () => {
  let indexer: SkillIndexer;

  beforeEach(() => {
    indexer = new SkillIndexer();
  });

  describe('indexSkills', () => {
    it('should index core patterns into CodePatterns', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(3);
    });

    it('should set category to SKILL', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      for (const p of result.data!) {
        expect(p.category).toBe(PatternCategory.SKILL);
      }
    });

    it('should preserve original tags plus "skill"', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      const first = result.data![0];
      expect(first.tags).toContain('skill');
      expect(first.tags).toContain('microservice');
      expect(first.tags).toContain('DNA-4');
    });

    it('should set source to af-4/core-patterns/', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      expect(result.data![0].source).toContain('af-4/core-patterns/');
    });

    it('should include skill_id in metadata', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      expect(result.data![0].metadata.skill_id).toBe('SK-01');
    });

    it('should handle empty patterns', () => {
      const result = indexer.indexSkills([]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(0);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('indexContracts', () => {
    it('should index contracts as patterns', () => {
      const result = indexer.indexContracts(MOCK_CONTRACTS);
      expect(result.isSuccess).toBe(true);
      expect(result.data!).toHaveLength(2);
    });

    it('should tag contracts with archetype', () => {
      const result = indexer.indexContracts(MOCK_CONTRACTS);
      const t44 = result.data!.find((p) => p.name.includes('T44'));
      expect(t44!.tags).toContain('data_pipeline');
      expect(t44!.tags).toContain('contract');
    });

    it('should tag contracts with fabric types from deps', () => {
      const result = indexer.indexContracts(MOCK_CONTRACTS);
      const t44 = result.data!.find((p) => p.name.includes('T44'));
      expect(t44!.tags).toContain('database');
      expect(t44!.tags).toContain('queue');
    });

    it('should include factory and quality gate counts in metadata', () => {
      const result = indexer.indexContracts(MOCK_CONTRACTS);
      const t44 = result.data!.find((p) => p.name.includes('T44'));
      expect(t44!.metadata.factory_count).toBe(2);
      expect(t44!.metadata.quality_gate_count).toBe(1);
    });

    it('should include factory dep details in snippet', () => {
      const result = indexer.indexContracts(MOCK_CONTRACTS);
      const t44 = result.data!.find((p) => p.name.includes('T44'));
      expect(t44!.codeSnippet).toContain('F166');
      expect(t44!.codeSnippet).toContain('IInventoryService');
    });

    it('should handle empty contracts', () => {
      const result = indexer.indexContracts([]);
      expect(result.data!).toHaveLength(0);
    });
  });
});

// ══════════════════════════════════════════════════════
// TestPatternIndexer
// ══════════════════════════════════════════════════════

describe('TestPatternIndexer', () => {
  let indexer: TestPatternIndexer;

  beforeEach(() => {
    indexer = new TestPatternIndexer();
  });

  it('should extract describe blocks', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    expect(result.isSuccess).toBe(true);
    const suites = result.data!.filter((p) => p.tags.includes('test_suite'));
    expect(suites.length).toBeGreaterThanOrEqual(2);
    expect(suites.some((s) => s.name.includes('InventoryService'))).toBe(true);
    expect(suites.some((s) => s.name.includes('QueueService'))).toBe(true);
  });

  it('should count it blocks in describe', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    const invSuite = result.data!.find(
      (p) => p.name.includes('InventoryService') && p.tags.includes('test_suite'),
    );
    expect(invSuite!.metadata.test_count).toBeGreaterThanOrEqual(2);
  });

  it('should extract mock patterns (jest.fn)', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    const mocks = result.data!.filter((p) => p.tags.includes('mock_pattern'));
    expect(mocks.length).toBeGreaterThanOrEqual(1);
    expect(mocks.some((m) => m.name.includes('mockDb'))).toBe(true);
  });

  it('should extract setup patterns (beforeEach)', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    const setups = result.data!.filter((p) => p.tags.includes('setup_pattern'));
    expect(setups.length).toBeGreaterThanOrEqual(1);
  });

  it('should tag dna3_test when DataProcessResult in test', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    const invSuite = result.data!.find(
      (p) => p.name.includes('InventoryService') && p.tags.includes('test_suite'),
    );
    expect(invSuite!.tags).toContain('dna3_test');
  });

  it('should tag uses_mocks when jest.fn in describe block', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    const invSuite = result.data!.find(
      (p) => p.name.includes('InventoryService') && p.tags.includes('test_suite'),
    );
    expect(invSuite!.tags).toContain('uses_mocks');
  });

  it('should handle empty source', () => {
    const result = indexer.extractTestPatterns('', 'empty.spec.ts');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  it('should extract from multiple test files', () => {
    const sources = new Map<string, string>();
    sources.set('a.spec.ts', TEST_SOURCE);
    sources.set('b.spec.ts', `describe('B', () => { it('x', () => {}); });`);
    const result = indexer.extractFromTestSources(sources);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBeGreaterThanOrEqual(3);
  });

  it('should set all patterns to TEST_PATTERN category', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    for (const p of result.data!) {
      expect(p.category).toBe(PatternCategory.TEST_PATTERN);
    }
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = indexer.extractTestPatterns(TEST_SOURCE, 'test.spec.ts');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// RagIndexerService
// ══════════════════════════════════════════════════════

describe('RagIndexerService', () => {
  let service: RagIndexerService;

  beforeEach(() => {
    service = new RagIndexerService(
      new CodePatternExtractor(),
      new SkillIndexer(),
      new TestPatternIndexer(),
    );
  });

  describe('indexEnginePatterns', () => {
    it('should extract patterns from source map', () => {
      const sources = new Map<string, string>();
      sources.set('health.ts', ENGINE_SOURCE);
      const result = service.indexEnginePatterns(sources);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.totalPatterns).toBeGreaterThanOrEqual(1);
      expect(result.data!.filesScanned).toBe(1);
    });
  });

  describe('indexSkillPatterns', () => {
    it('should merge skills + contracts', () => {
      const result = service.indexSkillPatterns(MOCK_CORE_PATTERNS, MOCK_CONTRACTS);
      expect(result.isSuccess).toBe(true);
      // 3 skills + 2 contracts
      expect(result.data!.length).toBe(5);
    });
  });

  describe('indexTestPatterns', () => {
    it('should extract test patterns', () => {
      const sources = new Map<string, string>();
      sources.set('test.spec.ts', TEST_SOURCE);
      const result = service.indexTestPatterns(sources);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('indexAll', () => {
    it('should merge all three indexers', () => {
      const sources = new Map([['health.ts', ENGINE_SOURCE]]);
      const testSources = new Map([['test.spec.ts', TEST_SOURCE]]);

      const result = service.indexAll(sources, testSources, MOCK_CORE_PATTERNS, MOCK_CONTRACTS);
      expect(result.isSuccess).toBe(true);
      // engine patterns + skills + contracts + test patterns
      expect(result.data!.totalPatterns).toBeGreaterThanOrEqual(8);
    });

    it('should report correct filesScanned', () => {
      const sources = new Map([
        ['a.ts', ENGINE_SOURCE],
        ['b.ts', ENGINE_SOURCE],
      ]);
      const testSources = new Map([['t.spec.ts', TEST_SOURCE]]);

      const result = service.indexAll(sources, testSources, [], []);
      expect(result.data!.filesScanned).toBe(3); // 2 source + 1 test
    });

    it('should deduplicate patterns by name+source', () => {
      const sources = new Map([['a.ts', ENGINE_SOURCE]]);
      // indexAll calls this twice won't happen, but duplicate names in same source get deduped
      const result = service.indexAll(sources, new Map(), [], []);
      const names = result.data!.patterns.map((p) => `${p.name}::${p.source}`);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });

    it('should have byCategory breakdown', () => {
      const sources = new Map([['svc.ts', ENGINE_SOURCE]]);
      const result = service.indexAll(sources, new Map(), MOCK_CORE_PATTERNS, MOCK_CONTRACTS);
      expect(result.data!.byCategory).toBeDefined();
      expect(result.data!.byCategory.SKILL).toBe(3);
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = service.indexAll(new Map(), new Map(), [], []);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('ingestIntoRag', () => {
    it('should fail without tenantId (DNA-5)', async () => {
      const mockRag = { ingest: jest.fn() };
      const patterns: CodePattern[] = [];
      const result = await service.ingestIntoRag(mockRag, patterns, '');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT');
    });

    it('should return 0 ingested for empty patterns', async () => {
      const mockRag = { ingest: jest.fn() };
      const result = await service.ingestIntoRag(mockRag, [], 'tenant-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.ingested).toBe(0);
      expect(mockRag.ingest).not.toHaveBeenCalled();
    });

    it('should call ragService.ingest with converted documents', async () => {
      const mockRag = {
        ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ count: 1 })),
      };
      const skillResult = new SkillIndexer().indexSkills(MOCK_CORE_PATTERNS);
      const patterns = skillResult.data!;

      const result = await service.ingestIntoRag(mockRag, patterns, 'tenant-1', 'test_ns');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.ingested).toBe(3);
      expect(mockRag.ingest).toHaveBeenCalledTimes(1);

      // Verify documents are in RAG format (snake_case)
      const docs = mockRag.ingest.mock.calls[0][0];
      expect(docs).toHaveLength(3);
      expect(docs[0].code_snippet).toBeDefined(); // snake_case
      expect(docs[0].type).toBe('code_pattern');
    });

    it('should batch large pattern sets', async () => {
      const mockRag = {
        ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ count: 50 })),
      };
      // Create 120 patterns (will need 3 batches of 50)
      const patterns: CodePattern[] = [];
      const indexer = new SkillIndexer();
      for (let i = 0; i < 40; i++) {
        const result = indexer.indexSkills(MOCK_CORE_PATTERNS);
        patterns.push(
          ...result.data!.map((p, j) => ({
            ...p,
            id: `pat-${i}-${j}`,
            name: `P${i}-${j}`,
            source: `src-${i}`,
          })),
        );
      }

      const result = await service.ingestIntoRag(mockRag, patterns.slice(0, 120), 'tenant-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.ingested).toBe(120);
      expect(mockRag.ingest).toHaveBeenCalledTimes(3); // 50 + 50 + 20
    });

    it('should fail on ingest error and report progress', async () => {
      let callCount = 0;
      const mockRag = {
        ingest: jest.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 2) return DataProcessResult.failure('STORE_ERROR', 'disk full');
          return DataProcessResult.success({ count: 50 });
        }),
      };
      // 80 patterns = 2 batches
      const patterns: CodePattern[] = Array.from({ length: 80 }, (_, i) => ({
        id: `p-${i}`,
        name: `Pat ${i}`,
        source: 's.ts',
        category: PatternCategory.SKILL,
        tags: [],
        description: '',
        codeSnippet: '',
        metadata: {},
      }));

      const result = await service.ingestIntoRag(mockRag, patterns, 'tenant-1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INGEST_FAILED');
    });

    it('should use provided namespace', async () => {
      const mockRag = {
        ingest: jest.fn().mockResolvedValue(DataProcessResult.success({ count: 1 })),
      };
      const patterns: CodePattern[] = [
        {
          id: 'p-1',
          name: 'X',
          source: 'x.ts',
          category: PatternCategory.SKILL,
          tags: [],
          description: '',
          codeSnippet: '',
          metadata: {},
        },
      ];

      await service.ingestIntoRag(mockRag, patterns, 'tenant-1', 'custom_ns');
      expect(mockRag.ingest).toHaveBeenCalledWith(expect.any(Array), 'custom_ns');
    });
  });
});
