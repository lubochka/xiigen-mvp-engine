/**
 * P12.5 Tests — LearningController + Phase 12 E2E
 *
 * LearningController:
 *   - getFeedback returns records
 *   - addHumanFeedback updates record
 *   - getModelRanking returns rankings
 *   - getPromptVersions returns versions
 *   - getRagWeights returns patterns
 *   - scoreCode returns 5 dimensions
 *   - getStats returns overview
 *   - getStats fails on missing tenantId
 *
 * E2E (Engine Completeness #16–#20):
 *   #16: Feedback persists — record → query → still there
 *   #17: Model preference tracks — 10 results → ranking reflects scores
 *   #18: Prompt A/B works — champion + candidate → auto-promotion
 *   #19: RAG quality weights — 5 successes → weight > 0.5; 5 failures → weight < 0.5
 *   #20: Real quality scoring — DNA-compliant code high; direct imports low
 *   E2E-6: Prompt evolution — 5+ failures → evolvePrompt creates candidate
 *   E2E-7: Learning API endpoints return data
 *   E2E-8: Full loop — generate → score → feedback → model ranking → prompt selection → RAG weight
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';

// Learning
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { RealCodeQualityScorer } from '../../src/learning/quality-scorer';
import { ModelPreferenceTracker } from '../../src/learning/model-preference';
import { ModelSelectionStrategy, SelectionStrategy } from '../../src/learning/model-selection';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { PromptAbTester } from '../../src/learning/prompt-ab-tester';
import { PromptEvolver, type IAiProviderLike } from '../../src/learning/prompt-evolver';
import { RagQualityTracker } from '../../src/learning/rag-quality-tracker';
import { RagWeightIntegrator } from '../../src/learning/rag-weight-integrator';
import {
  createFeedbackRecord,
  createQualityScore,
  type QualityDimension,
} from '../../src/learning/feedback-types';
import { createPromptVersion } from '../../src/learning/prompt-types';

// API
import { LearningController } from '../../src/api/learning.controller';

// ── Helpers ─────────────────────────────────────────

function buildController() {
  const feedbackStore = new PersistentFeedbackStore();
  const qualityScorer = new RealCodeQualityScorer();
  const modelTracker = new ModelPreferenceTracker({ minSamples: 3 });
  const promptStore = new PromptVersionStore();
  const abTester = new PromptAbTester(promptStore, {
    championRatio: 0.8,
    promotionConfig: { minSamples: 5, scoreThreshold: 0.05 },
  });
  const evolver = new PromptEvolver(feedbackStore, promptStore, {
    failureThreshold: 5,
    lookbackWindow: 20,
  });
  const ragTracker = new RagQualityTracker();

  const controller = new LearningController(
    feedbackStore,
    qualityScorer,
    modelTracker,
    promptStore,
    abTester,
    evolver,
    ragTracker,
  );

  return {
    controller,
    feedbackStore,
    qualityScorer,
    modelTracker,
    promptStore,
    abTester,
    evolver,
    ragTracker,
  };
}

function sampleScore(total?: number) {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.8, weight: 0.3 },
    { name: 'fabric_usage', score: 0.9, weight: 0.25 },
    { name: 'spec_adherence', score: 0.7, weight: 0.2 },
    { name: 'code_structure', score: 0.6, weight: 0.15 },
    { name: 'test_quality', score: 0.5, weight: 0.1 },
  ]);
}

function lowScore() {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.2, weight: 0.3 },
    { name: 'fabric_usage', score: 0.1, weight: 0.25 },
    { name: 'spec_adherence', score: 0.3, weight: 0.2 },
    { name: 'code_structure', score: 0.2, weight: 0.15 },
    { name: 'test_quality', score: 0.1, weight: 0.1 },
  ]);
}

const DNA_CODE = `
export class InventoryService extends MicroserviceBase {
  async store(tenantId: string, doc: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const filters = buildSearchFilter({ tenantId, ...doc });
    return DataProcessResult.success({ stored: true });
  }
}
`;

const BAD_CODE = `import { Client } from 'pg';\nimport OpenAI from 'openai';\nconst x = 1;`;

function mockAiProvider(): IAiProviderLike {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({
          text: 'Improved: always use MicroserviceBase and DataProcessResult and tenantId.',
        }),
      ),
  };
}

// ══════════════════════════════════════════════════════
// LearningController
// ══════════════════════════════════════════════════════

describe('LearningController', () => {
  let ctx: ReturnType<typeof buildController>;

  beforeEach(() => {
    ctx = buildController();
    // Seed some data
    ctx.feedbackStore.record(
      createFeedbackRecord({
        tenantId: 't1',
        taskType: 'T44',
        modelId: 'claude',
        qualityScore: sampleScore(),
        passed: true,
      }),
    );
    ctx.promptStore.registerVersion(
      createPromptVersion({
        taskType: 'T44',
        role: 'system',
        content: 'Generate...',
        version: 'v1',
        status: 'champion',
      }),
    );
    for (let i = 0; i < 3; i++) {
      ctx.modelTracker.recordResult('t1', 'T44', 'claude', 0.85);
    }
    ctx.ragTracker.recordPatternUsage('t1', 'SK-01', true);
  });

  it('should return feedback records', () => {
    const result = ctx.controller.getFeedback('t1', 'T44');
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).count).toBe(1);
    expect((result.data! as any).records).toHaveLength(1);
  });

  it('should add human feedback', () => {
    const fb = ctx.feedbackStore.query({ tenantId: 't1' }).data![0];
    const result = ctx.controller.addHumanFeedback(fb.id, { rating: 'good', comment: 'Nice' });
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).updated).toBe(true);
  });

  it('should return model rankings', () => {
    const result = ctx.controller.getModelRanking('t1', 'T44');
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).rankings.length).toBeGreaterThanOrEqual(1);
  });

  it('should return prompt versions', () => {
    const result = ctx.controller.getPromptVersions('T44');
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).count).toBeGreaterThanOrEqual(1);
  });

  it('should return RAG weights', () => {
    const result = ctx.controller.getRagWeights('t1');
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).patterns).toBeDefined();
  });

  it('should score code and return 5 dimensions', () => {
    const result = ctx.controller.scoreCode(DNA_CODE, {});
    expect(result.isSuccess).toBe(true);
    expect((result.data! as any).dimensions).toHaveLength(5);
    expect((result.data! as any).total).toBeGreaterThan(0);
  });

  it('should return learning stats overview', () => {
    const result = ctx.controller.getStats('t1');
    expect(result.isSuccess).toBe(true);
    const data = result.data!;
    expect(data.feedback).toBeDefined();
    expect(data.models).toBeDefined();
    expect(data.prompts).toBeDefined();
    expect(data.rag).toBeDefined();
  });

  it('should fail getStats on missing tenantId (DNA-5)', () => {
    const result = ctx.controller.getStats('');
    expect(result.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Phase 12 E2E — Engine Completeness #16–#20
// ══════════════════════════════════════════════════════

describe('Phase 12 E2E — Engine Completeness', () => {
  let ctx: ReturnType<typeof buildController>;

  beforeEach(() => {
    ctx = buildController();
  });

  // ── #16: Feedback persists ────────────────────────

  it('E2E #16: feedback persists — record → query → still there', () => {
    const fb = createFeedbackRecord({
      tenantId: 't1',
      taskType: 'T44',
      modelId: 'claude',
      qualityScore: sampleScore(),
      passed: true,
    });
    ctx.feedbackStore.record(fb);

    // Query returns the record
    const queryResult = ctx.feedbackStore.query({ tenantId: 't1', taskType: 'T44' });
    expect(queryResult.data!).toHaveLength(1);
    expect(queryResult.data![0].id).toBe(fb.id);

    // Stats reflect the record
    const stats = ctx.feedbackStore.getStats('t1', 'T44');
    expect(stats.data!.totalRecords).toBe(1);
    expect(stats.data!.passCount).toBe(1);
  });

  // ── #17: Model preference tracks ──────────────────

  it('E2E #17: 10 generations → ranking reflects actual scores', () => {
    // Claude: high scores
    for (let i = 0; i < 5; i++)
      ctx.modelTracker.recordResult('t1', 'T44', 'claude', 0.85 + Math.random() * 0.1, true);
    // GPT: lower scores
    for (let i = 0; i < 5; i++)
      ctx.modelTracker.recordResult('t1', 'T44', 'gpt', 0.65 + Math.random() * 0.1, true);

    const ranking = ctx.modelTracker.getRanking('t1', 'T44');
    expect(ranking.data!).toHaveLength(2);
    expect(ranking.data![0].modelId).toBe('claude');
    expect(ranking.data![0].avgScore).toBeGreaterThan(ranking.data![1].avgScore);

    // Model selection picks claude
    const selector = new ModelSelectionStrategy(ctx.modelTracker);
    const selected = selector.selectModel('t1', 'T44', ['claude', 'gpt'], SelectionStrategy.BEST);
    expect(selected.data).toBe('claude');
  });

  // ── #18: Prompt A/B works ─────────────────────────

  it('E2E #18: champion + candidate → auto-promotion when candidate beats champion', () => {
    // Register champion and candidate
    const champion = createPromptVersion({
      taskType: 'T44',
      role: 'system',
      content: 'Old prompt',
      version: 'v1.0',
      status: 'champion',
    });
    const candidate = createPromptVersion({
      taskType: 'T44',
      role: 'system',
      content: 'New improved prompt',
      version: 'v1.1',
      status: 'candidate',
    });
    ctx.promptStore.registerVersion(champion);
    ctx.promptStore.registerVersion(candidate);

    // Champion gets mediocre scores
    for (let i = 0; i < 6; i++) ctx.abTester.recordResult('t1', champion.id, 0.65, true, 'T44');
    // Candidate gets great scores
    for (let i = 0; i < 6; i++) ctx.abTester.recordResult('t1', candidate.id, 0.9, true, 'T44');

    // Check promotion
    const promotion = ctx.abTester.checkPromotion('T44', 'system');
    expect(promotion.data!.promoted).toBe(true);
    expect(promotion.data!.versionId).toBe(candidate.id);

    // Verify: candidate is now champion, old champion retired
    expect(ctx.promptStore.getChampion('T44', 'system').data!.id).toBe(candidate.id);
    expect(ctx.promptStore.getById(champion.id).data!.status).toBe('retired');
  });

  // ── #19: RAG quality weights ──────────────────────

  it('E2E #19: pattern in 5 successes → weight > 0.5; pattern in 5 failures → weight < 0.5', () => {
    // Good pattern: 5 successes
    for (let i = 0; i < 5; i++) ctx.ragTracker.recordPatternUsage('t1', 'SK-good', true);
    const goodWeight = ctx.ragTracker.getWeight('t1', 'SK-good');
    expect(goodWeight.data!).toBeGreaterThan(0.5);

    // Bad pattern: 5 failures
    for (let i = 0; i < 5; i++) ctx.ragTracker.recordPatternUsage('t1', 'SK-bad', false);
    const badWeight = ctx.ragTracker.getWeight('t1', 'SK-bad');
    expect(badWeight.data!).toBeLessThan(0.5);

    // Re-ranking reflects weights
    const integrator = new RagWeightIntegrator(ctx.ragTracker);
    const reRanked = integrator.reRankResults('t1', [
      { id: 'SK-good', score: 0.5 },
      { id: 'SK-bad', score: 0.8 },
    ]);
    // SK-good should rank higher because quality weight boosts its effective score
    expect(reRanked.data![0].id).toBe('SK-good');
  });

  // ── #20: Real quality scoring ─────────────────────

  it('E2E #20: DNA-compliant code → high score; direct imports → low score', () => {
    const goodResult = ctx.qualityScorer.score(DNA_CODE, {
      factory_dependencies: [{ factory_id: 'F166', fabric_type: 'database' }],
    });
    expect(goodResult.data!.total).toBeGreaterThan(0.5);

    const badResult = ctx.qualityScorer.score(BAD_CODE, {});
    expect(badResult.data!.total).toBeLessThan(0.35);

    // Score gap is significant
    expect(goodResult.data!.total - badResult.data!.total).toBeGreaterThan(0.2);
  });

  // ── E2E-6: Prompt evolution ───────────────────────

  it('E2E-6: 5+ failures → shouldEvolve → evolvePrompt creates candidate', async () => {
    // Register champion
    ctx.promptStore.registerVersion(
      createPromptVersion({
        taskType: 'T44',
        role: 'system',
        content: 'Old prompt',
        version: 'v1.0',
        status: 'champion',
      }),
    );

    // Record 6 failures
    for (let i = 0; i < 6; i++) {
      ctx.feedbackStore.record(
        createFeedbackRecord({
          tenantId: 't1',
          taskType: 'T44',
          modelId: 'claude',
          qualityScore: lowScore(),
          passed: false,
        }),
      );
    }

    // Should evolve
    expect(ctx.evolver.shouldEvolve('t1', 'T44', 'system').data).toBe(true);

    // Evolve
    const result = await ctx.evolver.evolvePrompt('t1', 'T44', 'system', mockAiProvider());
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('candidate');

    // New candidate registered in store
    const candidates = ctx.promptStore.getCandidates('T44', 'system');
    expect(candidates.data!.length).toBeGreaterThanOrEqual(1);
  });

  // ── E2E-7: All learning API endpoints return data ─

  it('E2E-7: all learning API endpoints return data', () => {
    // Seed data
    ctx.feedbackStore.record(
      createFeedbackRecord({
        tenantId: 't1',
        taskType: 'T44',
        modelId: 'claude',
        qualityScore: sampleScore(),
        passed: true,
      }),
    );
    for (let i = 0; i < 3; i++) ctx.modelTracker.recordResult('t1', 'T44', 'claude', 0.85);
    ctx.promptStore.registerVersion(
      createPromptVersion({
        taskType: 'T44',
        role: 'system',
        content: 'test',
        version: 'v1',
        status: 'champion',
      }),
    );
    ctx.ragTracker.recordPatternUsage('t1', 'SK-01', true);

    expect(ctx.controller.getFeedback('t1').isSuccess).toBe(true);
    expect(ctx.controller.getModelRanking('t1', 'T44').isSuccess).toBe(true);
    expect(ctx.controller.getPromptVersions('T44').isSuccess).toBe(true);
    expect(ctx.controller.getRagWeights('t1').isSuccess).toBe(true);
    expect(ctx.controller.scoreCode('class X {}', {}).isSuccess).toBe(true);
    expect(ctx.controller.getStats('t1').isSuccess).toBe(true);
  });

  // ── E2E-8: Full learning loop ─────────────────────

  it('E2E-8: full loop — generate → score → feedback → ranking → prompt → RAG', () => {
    // 1. Score generated code
    const scoreResult = ctx.qualityScorer.score(DNA_CODE, {
      factory_dependencies: [{ factory_id: 'F166', fabric_type: 'database' }],
    });
    const qualityScore = scoreResult.data!;
    const passed = qualityScore.total > 0.5;

    // 2. Record feedback
    const fb = createFeedbackRecord({
      tenantId: 't1',
      taskType: 'T44',
      modelId: 'claude',
      promptVersion: 'v1.0',
      qualityScore,
      passed,
      ragPatternsUsed: ['SK-01', 'SK-03'],
      generatedCodeLength: DNA_CODE.length,
    });
    ctx.feedbackStore.record(fb);

    // 3. Update model ranking
    ctx.modelTracker.recordResult('t1', 'T44', 'claude', qualityScore.total, passed);

    // 4. Update RAG weights for used patterns
    for (const patternId of fb.ragPatternsUsed) {
      ctx.ragTracker.recordPatternUsage('t1', patternId, passed);
    }

    // 5. Select prompt for next generation (needs champion registered)
    ctx.promptStore.registerVersion(
      createPromptVersion({
        taskType: 'T44',
        role: 'system',
        content: 'Prompt v1',
        version: 'v1.0',
        status: 'champion',
      }),
    );
    const promptResult = ctx.abTester.selectPrompt('t1', 'T44', 'system');
    expect(promptResult.isSuccess).toBe(true);

    // 6. Verify everything reflects the loop
    expect(ctx.feedbackStore.count).toBe(1);
    expect(ctx.modelTracker.getResultCount('t1', 'T44')).toBe(1);

    const ragWeight = ctx.ragTracker.getWeight('t1', 'SK-01');
    // SK-01 used in a pass → weight boosted above 0.5
    if (passed) {
      expect(ragWeight.data!).toBeGreaterThan(0.5);
    }

    // Stats reflect everything
    const stats = ctx.controller.getStats('t1');
    expect(stats.isSuccess).toBe(true);
    expect((stats.data! as any).feedback.total_records).toBe(1);
  });
});
