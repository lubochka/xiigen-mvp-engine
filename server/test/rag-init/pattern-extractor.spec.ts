/**
 * P11.1 Tests — Pattern Types + CodePatternExtractor
 *
 * PatternTypes: CodePattern fields, toRagDocument snake_case, PatternCategory values,
 *   createPattern auto-ID, trimSnippet, createExtractionResult.
 * Extractor: extract class, interface, function, enum, module; DNA tag detection;
 *   fabric tag detection; empty source; long snippet trimming; multiple files;
 *   DataProcessResult (DNA-3).
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  PatternCategory,
  createPattern,
  createExtractionResult,
  toRagDocument,
  trimSnippet,
  type CodePattern,
} from '../../src/rag-init/pattern-types';
import { CodePatternExtractor } from '../../src/rag-init/code-pattern-extractor';

// ── Test Sources ────────────────────────────────────

const SERVICE_SOURCE = `
/**
 * InventoryService — extends MicroserviceBase.
 */
export class InventoryService extends MicroserviceBase {
  async process(tenantId: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const filter = buildSearchFilter({ tenantId, status: doc.status });
      const items = await this.databaseFabric.searchDocuments(tenantId, filter);
      return DataProcessResult.success(items);
    } catch (error) {
      return DataProcessResult.failure('PROCESS_FAILED', error.message);
    }
  }
}
`;

const INTERFACE_SOURCE = `
export abstract class IAiProvider {
  abstract generate(prompt: string, options?: { systemPrompt?: string }): Promise<DataProcessResult<Record<string, unknown>>>;
  abstract getModelInfo(): Record<string, unknown>;
}
`;

const FUNCTION_SOURCE = `
export function buildSearchFilter(params: Record<string, unknown>): Record<string, unknown> {
  const filters: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== null && v !== undefined && v !== '') filters[k] = v;
  }
  return filters;
}

export async function validateScope(tenantId: string): Promise<DataProcessResult<boolean>> {
  if (!tenantId) return DataProcessResult.failure('MISSING', 'required');
  return DataProcessResult.success(true);
}
`;

const ENUM_SOURCE = `
export enum FabricType {
  DATABASE = 'database',
  QUEUE = 'queue',
  AI_ENGINE = 'ai_engine',
  RAG = 'rag',
  CORE = 'core',
  FLOW_ENGINE = 'flow_engine',
}
`;

const MODULE_SOURCE = `
import { Module } from '@nestjs/common';
@Module({
  imports: [KernelModule, FabricsModule],
  providers: [FactoryRegistry, DatabaseServiceFactory],
  exports: [FactoryRegistry],
})
export class FactoriesModule {}
`;

const QUEUE_SERVICE_SOURCE = `
export class QueueManager {
  async publish(tenantId: string, event: string, data: Record<string, unknown>): Promise<DataProcessResult<boolean>> {
    await this.queueService.enqueueAsync(tenantId, event, data);
    return DataProcessResult.success(true);
  }
}
`;

// ══════════════════════════════════════════════════════
// Pattern Types
// ══════════════════════════════════════════════════════

describe('PatternCategory', () => {
  it('should have exactly 7 values', () => {
    const values = Object.values(PatternCategory);
    expect(values).toHaveLength(7);
  });

  it('should include all expected categories', () => {
    expect(PatternCategory.SKILL).toBe('SKILL');
    expect(PatternCategory.DNA_PATTERN).toBe('DNA_PATTERN');
    expect(PatternCategory.FABRIC_USAGE).toBe('FABRIC_USAGE');
    expect(PatternCategory.FACTORY_INTERFACE).toBe('FACTORY_INTERFACE');
    expect(PatternCategory.SERVICE_IMPL).toBe('SERVICE_IMPL');
    expect(PatternCategory.TEST_PATTERN).toBe('TEST_PATTERN');
    expect(PatternCategory.MODULE_STRUCTURE).toBe('MODULE_STRUCTURE');
  });
});

describe('createPattern', () => {
  it('should create a pattern with auto-generated ID', () => {
    const p = createPattern({
      name: 'TestPattern',
      source: 'test.ts',
      category: PatternCategory.SKILL,
    });
    expect(p.id).toMatch(/^pat-/);
    expect(p.name).toBe('TestPattern');
    expect(p.source).toBe('test.ts');
    expect(p.category).toBe(PatternCategory.SKILL);
    expect(p.tags).toEqual([]);
    expect(p.description).toBe('');
    expect(p.codeSnippet).toBe('');
  });

  it('should accept optional fields', () => {
    const p = createPattern({
      name: 'WithTags',
      source: 'file.ts',
      category: PatternCategory.DNA_PATTERN,
      tags: ['DNA-3', 'result'],
      description: 'Returns DataProcessResult',
      codeSnippet: 'return DataProcessResult.success(data);',
      metadata: { phase: 1 },
    });
    expect(p.tags).toEqual(['DNA-3', 'result']);
    expect(p.description).toBe('Returns DataProcessResult');
    expect(p.codeSnippet).toBe('return DataProcessResult.success(data);');
    expect(p.metadata.phase).toBe(1);
  });

  it('should generate unique IDs', () => {
    const p1 = createPattern({ name: 'A', source: 'a.ts', category: PatternCategory.SKILL });
    const p2 = createPattern({ name: 'B', source: 'b.ts', category: PatternCategory.SKILL });
    expect(p1.id).not.toBe(p2.id);
  });
});

describe('toRagDocument', () => {
  it('should produce snake_case keys (DNA-1)', () => {
    const p = createPattern({
      name: 'TestPattern',
      source: 'test.ts',
      category: PatternCategory.DNA_PATTERN,
      tags: ['DNA-3'],
      description: 'Test desc',
      codeSnippet: 'code here',
    });

    const doc = toRagDocument(p);
    expect(doc.id).toBe(p.id);
    expect(doc.name).toBe('TestPattern');
    expect(doc.source).toBe('test.ts');
    expect(doc.category).toBe('DNA_PATTERN');
    expect(doc.tags).toEqual(['DNA-3']);
    expect(doc.description).toBe('Test desc');
    expect(doc.code_snippet).toBe('code here'); // snake_case
    expect(doc.type).toBe('code_pattern');
    expect(doc.indexed_at).toBeDefined();
  });

  it('should not mutate original pattern tags', () => {
    const p = createPattern({
      name: 'X',
      source: 'x.ts',
      category: PatternCategory.SKILL,
      tags: ['a'],
    });
    const doc = toRagDocument(p);
    (doc.tags as string[]).push('b');
    expect(p.tags).toEqual(['a']); // Unchanged
  });
});

// ── TIER1-S1: connectionType fields ─────────────────
describe('toRagDocument — connectionType fields (TIER1-S1)', () => {
  it('defaults connection_type to FLOW_SCOPED when metadata has none', () => {
    const p = createPattern({ name: 'T', source: 't.ts', category: PatternCategory.SKILL });
    const doc = toRagDocument(p);
    expect(doc.connection_type).toBe('FLOW_SCOPED');
    expect(doc.tenant_id).toBe('');
    expect(doc.flow_id).toBe('');
    expect(doc.exportable).toBe(true);
    expect(doc.flow_version).toBe('1.0.0');
  });

  it('uses metadata.connectionType override when provided', () => {
    const p = createPattern({
      name: 'TenantPrompt',
      source: 'prompt.ts',
      category: PatternCategory.SKILL,
      metadata: {
        connectionType: 'TENANT_PRIVATE',
        tenantId: 'acme',
        flowId: 'FLOW-0',
        exportable: false,
      },
    });
    const doc = toRagDocument(p);
    expect(doc.connection_type).toBe('TENANT_PRIVATE');
    expect(doc.tenant_id).toBe('acme');
    expect(doc.flow_id).toBe('FLOW-0');
    expect(doc.exportable).toBe(false);
  });

  it('FLOW_SCOPED pattern has empty tenant_id', () => {
    const p = createPattern({
      name: 'FlowPattern',
      source: 'flow.ts',
      category: PatternCategory.SERVICE_IMPL,
      metadata: { connectionType: 'FLOW_SCOPED', flowId: 'FLOW-0' },
    });
    const doc = toRagDocument(p);
    expect(doc.connection_type).toBe('FLOW_SCOPED');
    expect(doc.tenant_id).toBe('');
  });

  it('toRagDocument does not validate — caller responsibility for TENANT_PRIVATE+empty tenant_id', () => {
    const p = createPattern({
      name: 'Bad',
      source: 'bad.ts',
      category: PatternCategory.SKILL,
      metadata: { connectionType: 'TENANT_PRIVATE', tenantId: '' },
    });
    const doc = toRagDocument(p);
    // toRagDocument passes through as-is; validateConnectionFields catches this
    expect(doc.connection_type).toBe('TENANT_PRIVATE');
    expect(doc.tenant_id).toBe('');
  });

  it('includes all new fields in the returned document', () => {
    const p = createPattern({ name: 'Full', source: 'f.ts', category: PatternCategory.SKILL });
    const doc = toRagDocument(p);
    expect('connection_type' in doc).toBe(true);
    expect('tenant_id' in doc).toBe(true);
    expect('flow_id' in doc).toBe(true);
    expect('flow_version' in doc).toBe(true);
    expect('exportable' in doc).toBe(true);
    expect('export_group' in doc).toBe(true);
    expect('dependencies' in doc).toBe(true);
    expect('created_by' in doc).toBe(true);
    expect('imported_from' in doc).toBe(true);
  });
});

describe('trimSnippet', () => {
  it('should return short strings unchanged', () => {
    expect(trimSnippet('short', 500)).toBe('short');
  });

  it('should trim long strings', () => {
    const long = 'a'.repeat(600);
    const trimmed = trimSnippet(long, 500);
    expect(trimmed.length).toBeLessThanOrEqual(520); // 500 + suffix
    expect(trimmed).toContain('trimmed');
  });

  it('should handle empty string', () => {
    expect(trimSnippet('', 500)).toBe('');
  });

  it('should try to cut at last newline', () => {
    const code = 'line1\nline2\nline3\n' + 'x'.repeat(500);
    const trimmed = trimSnippet(code, 50);
    expect(trimmed).toContain('trimmed');
  });
});

describe('createExtractionResult', () => {
  it('should aggregate counts by category', () => {
    const patterns = [
      createPattern({ name: 'A', source: 'a.ts', category: PatternCategory.SKILL }),
      createPattern({ name: 'B', source: 'b.ts', category: PatternCategory.SKILL }),
      createPattern({ name: 'C', source: 'c.ts', category: PatternCategory.DNA_PATTERN }),
    ];
    const result = createExtractionResult(patterns, 3);
    expect(result.totalPatterns).toBe(3);
    expect(result.byCategory.SKILL).toBe(2);
    expect(result.byCategory.DNA_PATTERN).toBe(1);
    expect(result.filesScanned).toBe(3);
    expect(result.errors).toEqual([]);
    expect(result.patterns).toHaveLength(3);
  });

  it('should include errors', () => {
    const result = createExtractionResult([], 1, ['parse error']);
    expect(result.errors).toEqual(['parse error']);
  });
});

// ══════════════════════════════════════════════════════
// CodePatternExtractor
// ══════════════════════════════════════════════════════

describe('CodePatternExtractor', () => {
  let extractor: CodePatternExtractor;

  beforeEach(() => {
    extractor = new CodePatternExtractor();
  });

  // ── Class Extraction ────────────────────────────

  it('should extract class definition', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'inventory.ts');
    expect(result.isSuccess).toBe(true);
    const patterns = result.data!;
    const svc = patterns.find((p) => p.name === 'InventoryService');
    expect(svc).toBeDefined();
    expect(svc!.category).toBe(PatternCategory.SERVICE_IMPL);
    expect(svc!.source).toBe('inventory.ts');
    expect(svc!.codeSnippet.length).toBeGreaterThan(0);
  });

  it('should detect extends MicroserviceBase → SERVICE_IMPL', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'svc.ts');
    const svc = result.data!.find((p) => p.name === 'InventoryService');
    expect(svc!.category).toBe(PatternCategory.SERVICE_IMPL);
    expect(svc!.tags).toContain('microservicebase');
  });

  // ── Interface Extraction ────────────────────────

  it('should extract abstract class interface starting with I', () => {
    const result = extractor.extractFromSource(INTERFACE_SOURCE, 'ai.ts');
    const iface = result.data!.find((p) => p.name === 'IAiProvider');
    expect(iface).toBeDefined();
    expect(iface!.tags).toContain('interface');
  });

  // ── Function Extraction ─────────────────────────

  it('should extract exported functions', () => {
    const result = extractor.extractFromSource(FUNCTION_SOURCE, 'utils.ts');
    const funcs = result.data!.filter((p) => p.tags.includes('function'));
    expect(funcs.length).toBeGreaterThanOrEqual(2);
    expect(funcs.some((f) => f.name === 'buildSearchFilter')).toBe(true);
    expect(funcs.some((f) => f.name === 'validateScope')).toBe(true);
  });

  // ── Enum Extraction ─────────────────────────────

  it('should extract enum declaration', () => {
    const result = extractor.extractFromSource(ENUM_SOURCE, 'types.ts');
    const enm = result.data!.find((p) => p.name === 'FabricType');
    expect(enm).toBeDefined();
    expect(enm!.category).toBe(PatternCategory.MODULE_STRUCTURE);
    expect(enm!.tags).toContain('enum');
  });

  // ── Module Extraction ───────────────────────────

  it('should extract @Module decorated class', () => {
    const result = extractor.extractFromSource(MODULE_SOURCE, 'factories.module.ts');
    const mod = result.data!.find((p) => p.name === 'FactoriesModule');
    expect(mod).toBeDefined();
    expect(mod!.category).toBe(PatternCategory.MODULE_STRUCTURE);
    expect(mod!.tags).toContain('module');
    expect(mod!.tags).toContain('nestjs');
  });

  it('should detect has_imports and has_exports in module metadata', () => {
    const result = extractor.extractFromSource(MODULE_SOURCE, 'factories.module.ts');
    const mod = result.data!.find((p) => p.name === 'FactoriesModule');
    expect(mod!.metadata.has_imports).toBe(true);
    expect(mod!.metadata.has_exports).toBe(true);
  });

  // ── DNA Tag Detection ───────────────────────────

  it('should tag DNA-3 when DataProcessResult found', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'svc.ts');
    const svc = result.data!.find((p) => p.name === 'InventoryService');
    expect(svc!.tags).toContain('DNA-3');
  });

  it('should tag DNA-4 when MicroserviceBase found', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'svc.ts');
    const svc = result.data!.find((p) => p.name === 'InventoryService');
    expect(svc!.tags).toContain('DNA-4');
  });

  it('should tag DNA-5 when tenantId found', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'svc.ts');
    const svc = result.data!.find((p) => p.name === 'InventoryService');
    expect(svc!.tags).toContain('DNA-5');
  });

  it('should tag DNA-2 when buildSearchFilter found', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'svc.ts');
    const svc = result.data!.find((p) => p.name === 'InventoryService');
    expect(svc!.tags).toContain('DNA-2');
  });

  // ── Fabric Tag Detection ────────────────────────

  it('should tag DATABASE fabric when IDatabaseService found', () => {
    const dbSource = `
export class DbService extends MicroserviceBase {
  async store(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    return this.IDatabaseService.storeDocument(tenantId, {});
  }
}`;
    const result = extractor.extractFromSource(dbSource, 'db.ts');
    const svc = result.data!.find((p) => p.name === 'DbService');
    expect(svc!.tags).toContain('database');
  });

  it('should tag QUEUE fabric when enqueueAsync found', () => {
    const result = extractor.extractFromSource(QUEUE_SERVICE_SOURCE, 'queue.ts');
    const svc = result.data!.find((p) => p.name === 'QueueManager');
    expect(svc!.tags).toContain('queue');
  });

  // ── Edge Cases ──────────────────────────────────

  it('should handle empty source', () => {
    const result = extractor.extractFromSource('', 'empty.ts');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  it('should handle source with no extractable patterns', () => {
    const result = extractor.extractFromSource('const x = 1;\nconst y = 2;\n', 'simple.ts');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  it('should trim long code snippets', () => {
    const longClass =
      `export class BigService extends MicroserviceBase {\n` +
      '  // lots of code\n'.repeat(100) +
      `}`;
    const result = extractor.extractFromSource(longClass, 'big.ts');
    const svc = result.data!.find((p) => p.name === 'BigService');
    expect(svc).toBeDefined();
    expect(svc!.codeSnippet.length).toBeLessThanOrEqual(520); // 500 + suffix
  });

  // ── Multiple Files ──────────────────────────────

  it('should extract from multiple sources', () => {
    const sources = new Map<string, string>();
    sources.set('svc.ts', SERVICE_SOURCE);
    sources.set('types.ts', ENUM_SOURCE);
    sources.set('module.ts', MODULE_SOURCE);

    const result = extractor.extractFromSources(sources);
    expect(result.isSuccess).toBe(true);
    const extraction = result.data!;
    expect(extraction.filesScanned).toBe(3);
    expect(extraction.totalPatterns).toBeGreaterThanOrEqual(3);
    expect(extraction.byCategory.SERVICE_IMPL).toBeGreaterThanOrEqual(1);
    expect(extraction.byCategory.MODULE_STRUCTURE).toBeGreaterThanOrEqual(1);
  });

  // ── detectTags ──────────────────────────────────

  it('detectTags should find multiple DNA patterns', () => {
    const tags = (extractor as any).detectTags(
      'DataProcessResult MicroserviceBase tenantId buildSearchFilter',
    );
    expect(tags).toContain('DNA-3');
    expect(tags).toContain('DNA-4');
    expect(tags).toContain('DNA-5');
    expect(tags).toContain('DNA-2');
  });

  it('detectTags should find fabric types', () => {
    const tags = (extractor as any).detectTags('IDatabaseService IQueueService IAiProvider');
    expect(tags).toContain('database');
    expect(tags).toContain('queue');
    expect(tags).toContain('ai_engine');
  });

  it('detectTags should return empty for unrelated code', () => {
    const tags = (extractor as any).detectTags('const x = 1; console.log(x);');
    expect(tags).toHaveLength(0);
  });

  // ── DNA-3 ───────────────────────────────────────

  it('extractFromSource should return DataProcessResult (DNA-3)', () => {
    const result = extractor.extractFromSource(SERVICE_SOURCE, 'test.ts');
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('extractFromSources should return DataProcessResult (DNA-3)', () => {
    const result = extractor.extractFromSources(new Map());
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
