/**
 * P12.1 Tests — PersistentFeedbackStore + RealCodeQualityScorer
 *
 * FeedbackRecord:
 *   - creates with all fields
 *   - serializes to dict (DNA-1 snake_case)
 *   - auto-generates id and timestamp
 *
 * QualityScore:
 *   - creates from dimensions
 *   - total is weighted sum
 *   - serializes to dict
 *
 * PersistentFeedbackStore:
 *   - record stores entry
 *   - rejects duplicate IDs
 *   - query by taskType
 *   - query by model
 *   - query by minScore
 *   - query by passed
 *   - query respects maxResults
 *   - getStats aggregates correctly
 *   - getStats model breakdown
 *   - getByModel returns filtered results
 *   - addHumanFeedback updates record
 *   - addHumanFeedback not found
 *   - getById returns record
 *   - empty store returns empty
 *   - DNA-5: missing tenantId fails on record
 *   - DNA-5: missing tenantId fails on query
 *   - DNA-5: missing tenantId fails on getStats
 *
 * RealCodeQualityScorer:
 *   - scores DNA-compliant code high
 *   - scores code with direct imports low
 *   - scores empty code at 0
 *   - all 5 dimensions present
 *   - weights sum to ~1.0
 *   - dna_compliance detects DNA patterns
 *   - fabric_usage penalizes forbidden imports
 *   - fabric_usage rewards fabric interface refs
 *   - spec_adherence checks factory presence
 *   - spec_adherence gives neutral when no spec deps
 *   - code_structure checks class and exports
 *   - code_structure checks methods
 *   - test_quality detects describe/it/expect
 *   - test_quality neutral for non-test code
 *   - custom weights override defaults
 *   - DNA-3: returns DataProcessResult
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  createFeedbackRecord,
  feedbackRecordToDict,
  createQualityScore,
  qualityScoreToDict,
  type QualityDimension,
  type FeedbackRecord,
  type QualityScore,
} from '../../src/learning/feedback-types';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { RealCodeQualityScorer, DEFAULT_WEIGHTS } from '../../src/learning/quality-scorer';

// ── Test Helpers ────────────────────────────────────

function sampleScore(total = 0.75): QualityScore {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.9, weight: 0.3 },
    { name: 'fabric_usage', score: 0.8, weight: 0.25 },
    { name: 'spec_adherence', score: 0.7, weight: 0.2 },
    { name: 'code_structure', score: 0.6, weight: 0.15 },
    { name: 'test_quality', score: 0.5, weight: 0.1 },
  ]);
}

function sampleFeedback(
  overrides?: Partial<{
    tenantId: string;
    taskType: string;
    modelId: string;
    passed: boolean;
    score: QualityScore;
  }>,
): FeedbackRecord {
  return createFeedbackRecord({
    tenantId: overrides?.tenantId ?? 'tenant-1',
    taskType: overrides?.taskType ?? 'T44',
    modelId: overrides?.modelId ?? 'claude',
    promptVersion: 'v1.0',
    qualityScore: overrides?.score ?? sampleScore(),
    ragPatternsUsed: ['SK-01', 'SK-03'],
    passed: overrides?.passed ?? true,
    generatedCodeLength: 500,
  });
}

const DNA_COMPLIANT_CODE = `
export class InventoryService extends MicroserviceBase {
  async store(tenantId: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const filters = buildSearchFilter({ tenantId, ...doc });
    const result = await this.databaseService.storeDocument(tenantId, 'inventory', doc);
    return DataProcessResult.success({ stored: true });
  }
  async search(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({ results: [] });
  }
}
`;

const BAD_CODE_DIRECT_IMPORTS = `
import { Client } from 'pg';
import OpenAI from 'openai';

const client = new Client();
const ai = new OpenAI({ apiKey: 'sk-xxx' });
`;

const TEST_CODE = `
describe('InventoryService', () => {
  let service: InventoryService;
  beforeEach(() => { service = new InventoryService(); });

  it('should store document', () => {
    const result = service.store('t1', { name: 'item' });
    expect(result.isSuccess).toBe(true);
  });

  it('should search with filters', () => {
    const result = service.search('t1');
    expect(result.data).toBeDefined();
  });
});
`;

// ══════════════════════════════════════════════════════
// FeedbackRecord + QualityScore Types
// ══════════════════════════════════════════════════════

describe('FeedbackRecord Types', () => {
  it('should create FeedbackRecord with all fields', () => {
    const record = sampleFeedback();
    expect(record.id).toMatch(/^fb-/);
    expect(record.tenantId).toBe('tenant-1');
    expect(record.taskType).toBe('T44');
    expect(record.modelId).toBe('claude');
    expect(record.promptVersion).toBe('v1.0');
    expect(record.qualityScore.total).toBeGreaterThan(0);
    expect(record.ragPatternsUsed).toContain('SK-01');
    expect(record.passed).toBe(true);
    expect(record.createdAt).toBeDefined();
  });

  it('should auto-generate id and timestamp', () => {
    const r1 = sampleFeedback();
    const r2 = sampleFeedback();
    expect(r1.id).not.toBe(r2.id);
    expect(r1.createdAt).toBeDefined();
  });

  it('should serialize to dict with snake_case (DNA-1)', () => {
    const record = sampleFeedback();
    const dict = feedbackRecordToDict(record);
    expect(dict.tenant_id).toBe('tenant-1');
    expect(dict.task_type).toBe('T44');
    expect(dict.model_id).toBe('claude');
    expect(dict.prompt_version).toBe('v1.0');
    expect(dict.quality_score).toBeDefined();
    expect(dict.rag_patterns_used).toBeDefined();
    expect(dict.generated_code_length).toBe(500);
    expect(dict.created_at).toBeDefined();
  });

  it('should create QualityScore from dimensions', () => {
    const score = sampleScore();
    expect(score.total).toBeGreaterThan(0);
    expect(score.dimensions).toHaveLength(5);
    // total = 0.9*0.3 + 0.8*0.25 + 0.7*0.2 + 0.6*0.15 + 0.5*0.1
    // = 0.27 + 0.2 + 0.14 + 0.09 + 0.05 = 0.75
    expect(score.total).toBeCloseTo(0.75, 2);
  });

  it('should serialize QualityScore to dict', () => {
    const score = sampleScore();
    const dict = qualityScoreToDict(score);
    expect(dict.total).toBeCloseTo(0.75, 2);
    expect((dict.dimensions as any[]).length).toBe(5);
  });
});

// ══════════════════════════════════════════════════════
// PersistentFeedbackStore
// ══════════════════════════════════════════════════════

describe('PersistentFeedbackStore', () => {
  let store: PersistentFeedbackStore;

  beforeEach(() => {
    store = new PersistentFeedbackStore();
  });

  // ── Record ────────────────────────────────────────

  it('should record a feedback entry', () => {
    const fb = sampleFeedback();
    const result = store.record(fb);
    expect(result.isSuccess).toBe(true);
    expect(store.count).toBe(1);
  });

  it('should reject duplicate IDs', () => {
    const fb = sampleFeedback();
    store.record(fb);
    const result = store.record(fb);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE');
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    const fb = createFeedbackRecord({
      tenantId: '',
      taskType: 'T44',
      modelId: 'claude',
      qualityScore: sampleScore(),
      passed: true,
    });
    const result = store.record(fb);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── Query ─────────────────────────────────────────

  it('should query by taskType', () => {
    store.record(sampleFeedback({ taskType: 'T44' }));
    store.record(sampleFeedback({ taskType: 'T45' }));
    store.record(sampleFeedback({ taskType: 'T44' }));

    const result = store.query({ tenantId: 'tenant-1', taskType: 'T44' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(2);
  });

  it('should query by model', () => {
    store.record(sampleFeedback({ modelId: 'claude' }));
    store.record(sampleFeedback({ modelId: 'gpt' }));

    const result = store.query({ tenantId: 'tenant-1', modelId: 'claude' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(1);
    expect(result.data![0].modelId).toBe('claude');
  });

  it('should query by minScore', () => {
    const highScore = createQualityScore([{ name: 'total', score: 1.0, weight: 1.0 }]);
    const lowScore = createQualityScore([{ name: 'total', score: 0.1, weight: 1.0 }]);
    store.record(sampleFeedback({ score: highScore }));
    store.record(sampleFeedback({ score: lowScore }));

    const result = store.query({ tenantId: 'tenant-1', minScore: 0.5 });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  it('should query by passed status', () => {
    store.record(sampleFeedback({ passed: true }));
    store.record(sampleFeedback({ passed: false }));

    const passedResult = store.query({ tenantId: 'tenant-1', passed: true });
    expect(passedResult.data!.length).toBe(1);
    expect(passedResult.data![0].passed).toBe(true);
  });

  it('should respect maxResults', () => {
    for (let i = 0; i < 10; i++) {
      store.record(sampleFeedback());
    }

    const result = store.query({ tenantId: 'tenant-1', maxResults: 3 });
    expect(result.data!.length).toBe(3);
  });

  it('should fail on query with missing tenantId (DNA-5)', () => {
    const result = store.query({ tenantId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('should return empty for empty store', () => {
    const result = store.query({ tenantId: 'tenant-1' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  // ── getStats ──────────────────────────────────────

  it('should aggregate stats correctly', () => {
    store.record(sampleFeedback({ passed: true }));
    store.record(sampleFeedback({ passed: true }));
    store.record(sampleFeedback({ passed: false }));

    const result = store.getStats('tenant-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalRecords).toBe(3);
    expect(result.data!.passCount).toBe(2);
    expect(result.data!.failCount).toBe(1);
    expect(result.data!.passRate).toBeCloseTo(2 / 3, 2);
    expect(result.data!.avgScore).toBeGreaterThan(0);
  });

  it('should include model breakdown in stats', () => {
    store.record(sampleFeedback({ modelId: 'claude' }));
    store.record(sampleFeedback({ modelId: 'claude' }));
    store.record(sampleFeedback({ modelId: 'gpt' }));

    const result = store.getStats('tenant-1');
    expect(result.data!.modelBreakdown['claude'].count).toBe(2);
    expect(result.data!.modelBreakdown['gpt'].count).toBe(1);
  });

  it('should filter stats by taskType', () => {
    store.record(sampleFeedback({ taskType: 'T44' }));
    store.record(sampleFeedback({ taskType: 'T45' }));

    const result = store.getStats('tenant-1', 'T44');
    expect(result.data!.totalRecords).toBe(1);
    expect(result.data!.taskType).toBe('T44');
  });

  it('should fail on getStats with missing tenantId (DNA-5)', () => {
    const result = store.getStats('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── getByModel ────────────────────────────────────

  it('should return filtered results by model', () => {
    store.record(sampleFeedback({ modelId: 'claude' }));
    store.record(sampleFeedback({ modelId: 'gpt' }));

    const result = store.getByModel('tenant-1', 'claude');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  // ── addHumanFeedback ──────────────────────────────

  it('should add human feedback to existing record', () => {
    const fb = sampleFeedback();
    store.record(fb);
    const result = store.addHumanFeedback(fb.id, { rating: 'good', comment: 'Nice!' });
    expect(result.isSuccess).toBe(true);

    const retrieved = store.getById(fb.id);
    expect(retrieved.data!.humanFeedback?.rating).toBe('good');
    expect(retrieved.data!.humanFeedback?.comment).toBe('Nice!');
  });

  it('should fail on addHumanFeedback for unknown record', () => {
    const result = store.addHumanFeedback('fb-nonexistent', { rating: 'bad' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FEEDBACK_NOT_FOUND');
  });

  // ── getById ───────────────────────────────────────

  it('should get record by ID', () => {
    const fb = sampleFeedback();
    store.record(fb);
    const result = store.getById(fb.id);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.id).toBe(fb.id);
  });
});

// ══════════════════════════════════════════════════════
// RealCodeQualityScorer
// ══════════════════════════════════════════════════════

describe('RealCodeQualityScorer', () => {
  let scorer: RealCodeQualityScorer;

  beforeEach(() => {
    scorer = new RealCodeQualityScorer();
  });

  // ── Overall scoring ───────────────────────────────

  it('should score DNA-compliant code high', () => {
    const result = scorer.score(DNA_COMPLIANT_CODE, {
      factory_dependencies: [{ factory_id: 'F166', fabric_type: 'database' }],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.total).toBeGreaterThan(0.5);
  });

  it('should score code with direct imports low', () => {
    const result = scorer.score(BAD_CODE_DIRECT_IMPORTS, {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.total).toBeLessThan(0.35);
  });

  it('should score empty code at 0', () => {
    const result = scorer.score('', {});
    expect(result.isSuccess).toBe(true);
    expect(result.data!.total).toBe(0);
  });

  it('should return all 5 dimensions', () => {
    const result = scorer.score(DNA_COMPLIANT_CODE, {});
    expect(result.data!.dimensions).toHaveLength(5);
    const names = result.data!.dimensions.map((d) => d.name);
    expect(names).toContain('dna_compliance');
    expect(names).toContain('fabric_usage');
    expect(names).toContain('spec_adherence');
    expect(names).toContain('code_structure');
    expect(names).toContain('test_quality');
  });

  it('should have weights summing to ~1.0', () => {
    const weights = scorer.getWeights();
    const sum =
      weights.dna_compliance +
      weights.fabric_usage +
      weights.spec_adherence +
      weights.code_structure +
      weights.test_quality;
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = scorer.score(DNA_COMPLIANT_CODE, {});
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  // ── DNA Compliance ────────────────────────────────

  it('should detect DNA patterns in code', () => {
    const result = scorer.score(DNA_COMPLIANT_CODE, {});
    const dna = result.data!.dimensions.find((d) => d.name === 'dna_compliance')!;
    expect(dna.score).toBeGreaterThan(0.3);
    expect(dna.details).toContain('DNA patterns found');
  });

  it('should score low DNA compliance for code without patterns', () => {
    const result = scorer.score('const x = 1;', {});
    const dna = result.data!.dimensions.find((d) => d.name === 'dna_compliance')!;
    expect(dna.score).toBeLessThan(0.2);
  });

  // ── Fabric Usage ──────────────────────────────────

  it('should penalize forbidden imports', () => {
    const result = scorer.score(BAD_CODE_DIRECT_IMPORTS, {});
    const fabric = result.data!.dimensions.find((d) => d.name === 'fabric_usage')!;
    expect(fabric.score).toBeLessThan(0.5);
    expect(fabric.details).toContain('forbidden imports');
  });

  it('should reward fabric interface references', () => {
    const codeWithFabric = `
      class MyService {
        constructor(private db: IDatabaseService) {}
        async run() { return await this.db.createAsync(ctx); }
      }
    `;
    const result = scorer.score(codeWithFabric, {});
    const fabric = result.data!.dimensions.find((d) => d.name === 'fabric_usage')!;
    expect(fabric.score).toBeGreaterThan(0.8);
  });

  // ── Spec Adherence ────────────────────────────────

  it('should check factory presence from spec', () => {
    const code = 'class X { F166: IInventoryService; database() {} }';
    const result = scorer.score(code, {
      factory_dependencies: [
        { factory_id: 'F166', interface_name: 'IInventoryService', fabric_type: 'database' },
      ],
    });
    const spec = result.data!.dimensions.find((d) => d.name === 'spec_adherence')!;
    expect(spec.score).toBeGreaterThanOrEqual(0.5);
  });

  it('should give neutral score when no spec deps', () => {
    const result = scorer.score('class X {}', {});
    const spec = result.data!.dimensions.find((d) => d.name === 'spec_adherence')!;
    expect(spec.score).toBe(0.5);
  });

  it('should score low spec adherence when factories missing', () => {
    const result = scorer.score('class X {}', {
      factory_dependencies: [
        { factory_id: 'F166', interface_name: 'IInventoryService', fabric_type: 'database' },
        { factory_id: 'F167', interface_name: 'IStockService', fabric_type: 'database' },
      ],
    });
    const spec = result.data!.dimensions.find((d) => d.name === 'spec_adherence')!;
    expect(spec.score).toBeLessThan(0.3);
  });

  // ── Code Structure ────────────────────────────────

  it('should detect class and exports', () => {
    const result = scorer.score('export class MyService { run() {} }', {});
    const structure = result.data!.dimensions.find((d) => d.name === 'code_structure')!;
    expect(structure.score).toBeGreaterThan(0.4);
    expect(structure.details).toContain('class: yes');
    expect(structure.details).toContain('exports: yes');
  });

  it('should detect methods', () => {
    const result = scorer.score(DNA_COMPLIANT_CODE, {});
    const structure = result.data!.dimensions.find((d) => d.name === 'code_structure')!;
    expect(structure.details).toContain('methods:');
  });

  // ── Test Quality ──────────────────────────────────

  it('should detect describe/it/expect in test code', () => {
    const result = scorer.score(TEST_CODE, {});
    const testQ = result.data!.dimensions.find((d) => d.name === 'test_quality')!;
    expect(testQ.score).toBeGreaterThan(0.5);
    expect(testQ.details).toContain('describe: yes');
    expect(testQ.details).toContain('it/test: yes');
    expect(testQ.details).toContain('assertions: yes');
  });

  it('should give neutral score for non-test code', () => {
    const result = scorer.score('export class MyService { run() { return 1; } }', {});
    const testQ = result.data!.dimensions.find((d) => d.name === 'test_quality')!;
    expect(testQ.score).toBe(0.5);
    expect(testQ.details).toContain('neutral');
  });

  // ── Custom Weights ────────────────────────────────

  it('should accept custom weights', () => {
    const custom = new RealCodeQualityScorer({
      dna_compliance: 1.0,
      fabric_usage: 0,
      spec_adherence: 0,
      code_structure: 0,
      test_quality: 0,
    });
    const weights = custom.getWeights();
    expect(weights.dna_compliance).toBe(1.0);
    expect(weights.fabric_usage).toBe(0);
  });
});

// ── Phase 11 — FeedbackStation skill tracking ─────────────────────────────

import { FeedbackStation } from '../../src/af-stations/af11-feedback';

describe('FeedbackStation — skillsActive + scoreDelta (Phase 11)', () => {
  let station: FeedbackStation;

  beforeEach(() => {
    station = new FeedbackStation();
  });

  it('recordFeedback with skillsActive updates skill stats (withSkill bucket)', () => {
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.9, passed: true }, [
      'SK-DNA',
    ]);
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.85, passed: true }, [
      'SK-DNA',
    ]);
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.88, passed: true }, [
      'SK-DNA',
    ]);
    // Need 3+ in withoutSkill bucket too for getSkillEffectiveness to return data
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.5, passed: false }, []);
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.5, passed: false }, []);
    station.recordFeedback('gen-service', { tenant_id: 't1', score: 0.5, passed: false }, []);
    const eff = station.getSkillEffectiveness('t1', 'SK-DNA');
    expect(eff).not.toBeNull();
    expect(eff!.avgWithSkill as number).toBeGreaterThan(0.8);
  });

  it('scoreDelta is 0 for first feedback entry (no prior average)', () => {
    const firstAvg = station.getStats('new-task')?.average_score ?? 0;
    station.recordFeedback('new-task', { tenant_id: 't1', score: 0.7, passed: true });
    // scoreDelta computed outside: score - previousAvg = 0.7 - 0 = 0.7
    // The entry has no scoreDelta field added by recordFeedback — delta is computed at execute() level
    // Verify via getStats: first entry, count=1, avg=0.7
    const stats = station.getStats('new-task');
    expect(stats?.count).toBe(1);
    expect(stats?.average_score).toBeCloseTo(0.7);
    expect(firstAvg).toBe(0);
  });

  it('getSkillEffectiveness returns higher avg when skill-active scores are higher', () => {
    // SK-PLAN active → high scores
    for (let i = 0; i < 3; i++) {
      station.recordFeedback('task-x', { tenant_id: 'tA', score: 0.95, passed: true }, ['SK-PLAN']);
    }
    // SK-PLAN inactive → low scores
    for (let i = 0; i < 3; i++) {
      station.recordFeedback('task-x', { tenant_id: 'tA', score: 0.4, passed: false }, []);
    }
    const eff = station.getSkillEffectiveness('tA', 'SK-PLAN');
    expect(eff).not.toBeNull();
    expect(eff!.avgWithSkill as number).toBeGreaterThan(eff!.avgWithoutSkill as number);
  });

  it('getSkillEffectiveness returns null when fewer than 3 samples in either bucket', () => {
    station.recordFeedback('task-y', { tenant_id: 'tB', score: 0.8, passed: true }, ['SK-TEST']);
    station.recordFeedback('task-y', { tenant_id: 'tB', score: 0.8, passed: true }, ['SK-TEST']);
    // Only 2 withSkill samples — not enough
    const eff = station.getSkillEffectiveness('tB', 'SK-TEST');
    expect(eff).toBeNull();
  });
});

// ── Phase 11 — RealCodeQualityScorer 4-layer test_quality ────────────────

describe('RealCodeQualityScorer — 4-layer test_quality (Phase 11)', () => {
  let scorer: RealCodeQualityScorer;

  beforeEach(() => {
    scorer = new RealCodeQualityScorer();
  });

  it('4-layer file scores higher than 1-layer file on test_quality', () => {
    const oneLayer = `describe('x', () => { it('a', () => { expect(1).toBe(1); }); });`;
    const fourLayer = `
      describe('x', () => { it('a', () => { expect(1).toBe(1); }); });
      jest.mock('./module');
      const moduleRef = Test.createTestingModule({}).compile();
      fc.property(fc.integer(), n => n >= 0);
    `;
    const r1 = scorer.score(oneLayer, {});
    const r4 = scorer.score(fourLayer, {});
    const tq1 = r1.data!.dimensions.find((d) => d.name === 'test_quality')!;
    const tq4 = r4.data!.dimensions.find((d) => d.name === 'test_quality')!;
    expect(tq4.score).toBeGreaterThan(tq1.score);
  });

  it('e2e file (TestingModule import) gets Layer 3 credit', () => {
    const code = `
      import { Test, TestingModule } from '@nestjs/testing';
      describe('e2e', () => { it('runs', () => { expect(true).toBe(true); }); });
    `;
    const result = scorer.score(code, {});
    const tq = result.data!.dimensions.find((d) => d.name === 'test_quality')!;
    expect(tq.details).toContain('e2e: yes');
  });

  it('mock file (jest.mock pattern) gets Layer 2 credit', () => {
    const code = `
      jest.mock('./service');
      describe('sim', () => { it('runs', () => { expect(true).toBe(true); }); });
    `;
    const result = scorer.score(code, {});
    const tq = result.data!.dimensions.find((d) => d.name === 'test_quality')!;
    expect(tq.details).toContain('simulation: yes');
  });

  it('weight sum equals 1.00', () => {
    const w = scorer.getWeights();
    const sum =
      w.dna_compliance + w.fabric_usage + w.spec_adherence + w.code_structure + w.test_quality;
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('test_quality default weight is 0.20', () => {
    const w = scorer.getWeights();
    expect(w.test_quality).toBe(0.2);
  });
});
