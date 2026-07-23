/**
 * P8.1 Tests — Base Types + AF-4 RAG Context
 *
 * Tests: StationId (11 values), StationInput (clone deep copy),
 * StationOutput (toDict snake_case), IAfStation interface,
 * AF-4 (execute, search, keyword extraction, core patterns, DNA-5).
 *
 * Note: AF-3 PromptLibrary (in-memory Map) retired in S3.
 * ES-backed PromptLibraryStation is the replacement.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { StationId, StationInput, StationOutput } from '../../src/af-stations/base';
import { RagContextStation } from '../../src/af-stations/af4-rag-context';

// ── Helper ───────────────────────────────────────────

function makeInput(
  overrides: Partial<ConstructorParameters<typeof StationInput>[0]> = {},
): StationInput {
  return new StationInput({
    tenantId: 'tenant-test',
    taskType: 'T44',
    spec: { archetype: 'DATA_PIPELINE', description: 'inventory management' },
    ...overrides,
  });
}

// ══════════════════════════════════════════════════════
// StationId
// ══════════════════════════════════════════════════════

describe('StationId', () => {
  it('should have exactly 11 values', () => {
    expect(Object.values(StationId)).toHaveLength(11);
  });

  it('should have AF-1 through AF-11', () => {
    expect(StationId.AF1_GENESIS).toBe('AF-1');
    expect(StationId.AF2_PLANNING).toBe('AF-2');
    expect(StationId.AF3_PROMPT_LIBRARY).toBe('AF-3');
    expect(StationId.AF4_RAG_CONTEXT).toBe('AF-4');
    expect(StationId.AF5_MULTI_MODEL).toBe('AF-5');
    expect(StationId.AF6_CODE_REVIEW).toBe('AF-6');
    expect(StationId.AF7_COMPLIANCE).toBe('AF-7');
    expect(StationId.AF8_SECURITY).toBe('AF-8');
    expect(StationId.AF9_JUDGE).toBe('AF-9');
    expect(StationId.AF10_MERGE).toBe('AF-10');
    expect(StationId.AF11_FEEDBACK).toBe('AF-11');
  });
});

// ══════════════════════════════════════════════════════
// StationInput
// ══════════════════════════════════════════════════════

describe('StationInput', () => {
  it('should construct with defaults', () => {
    const input = new StationInput({ tenantId: 't1' });
    expect(input.tenantId).toBe('t1');
    expect(input.taskType).toBe('');
    expect(input.code).toBe('');
    expect(input.prompts).toHaveLength(0);
    expect(input.ragContext).toHaveLength(0);
    expect(input.planSteps).toHaveLength(0);
  });

  it('should clone as deep copy', () => {
    const input = makeInput({ spec: { key: 'value', nested: { a: 1 } } });
    const cloned = input.clone();

    expect(cloned.tenantId).toBe(input.tenantId);
    expect(cloned.spec).toEqual(input.spec);

    // Mutating clone should not affect original
    (cloned.spec as any).key = 'changed';
    expect(input.spec.key).toBe('value');
  });

  it('should clone arrays independently', () => {
    const input = makeInput();
    input.prompts.push({ role: 'system', content: 'test' });
    const cloned = input.clone();

    cloned.prompts.push({ role: 'gen', content: 'added' });
    expect(input.prompts).toHaveLength(1);
    expect(cloned.prompts).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════
// StationOutput
// ══════════════════════════════════════════════════════

describe('StationOutput', () => {
  it('should construct with defaults', () => {
    const out = new StationOutput({ stationId: 'AF-1', success: true });
    expect(out.stationId).toBe('AF-1');
    expect(out.success).toBe(true);
    expect(out.data).toEqual({});
    expect(out.errors).toHaveLength(0);
    expect(out.warnings).toHaveLength(0);
  });

  it('should serialize to snake_case dict (DNA-1)', () => {
    const out = new StationOutput({
      stationId: 'AF-3',
      success: true,
      data: { count: 5 },
      warnings: ['w1'],
      elapsedMs: 42,
    });
    const dict = out.toDict();
    expect(dict.station_id).toBe('AF-3');
    expect(dict.elapsed_ms).toBe(42);
    expect(dict).not.toHaveProperty('stationId');
    expect(dict).not.toHaveProperty('elapsedMs');
  });
});

// ══════════════════════════════════════════════════════
// AF-4: RAG Context
// ══════════════════════════════════════════════════════

describe('RagContextStation', () => {
  let rag: RagContextStation;

  beforeEach(() => {
    rag = new RagContextStation();
  });

  it('should have stationId AF-4', () => {
    expect(rag.stationId).toBe(StationId.AF4_RAG_CONTEXT);
  });

  it('should load 9 core patterns', () => {
    expect(rag.patternCount).toBe(9);
  });

  it('should return matching patterns for database keyword', () => {
    const matches = rag.search(['database']);
    expect(matches.length).toBeGreaterThan(0);
    const names = matches.map((m) => m.name);
    expect(names).toContain('BuildSearchFilter');
  });

  it('should return matching patterns for orchestration keyword', () => {
    const matches = rag.search(['orchestration']);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('should return empty for no keywords', () => {
    expect(rag.search([])).toHaveLength(0);
  });

  it('should respect maxResults', () => {
    const matches = rag.search(['service', 'database', 'query'], 2);
    expect(matches.length).toBeLessThanOrEqual(2);
  });

  it('should extract keywords from input spec', () => {
    const input = makeInput({
      taskType: 'T44',
      spec: { archetype: 'DATA_PIPELINE', description: 'inventory management database' },
    });
    const keywords = rag.extractKeywords(input);
    expect(keywords).toContain('T44');
    expect(keywords).toContain('DATA_PIPELINE');
  });

  it('should execute and return patterns', async () => {
    const input = makeInput({
      spec: { archetype: 'DATA_PIPELINE', description: 'database service' },
    });
    const result = await rag.execute(input);
    expect(result.isSuccess).toBe(true);
    const data = result.data!.data;
    expect((data.patterns as any[]).length).toBeGreaterThan(0);
    expect(data.count).toBeGreaterThan(0);
  });

  it('should reject missing tenantId (DNA-5)', async () => {
    const input = makeInput({ tenantId: '' });
    const result = await rag.execute(input);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should allow indexing custom patterns', () => {
    rag.indexPattern({ id: 'custom-1', name: 'Custom', tags: ['custom'], description: 'test' });
    expect(rag.patternCount).toBe(10);
    const matches = rag.search(['custom']);
    expect(matches).toHaveLength(1);
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const result = await rag.execute(makeInput());
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
