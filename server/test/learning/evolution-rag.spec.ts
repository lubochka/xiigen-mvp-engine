/**
 * P12.4 Tests — Prompt Evolution via AI + RAG Quality Signals
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { PromptVersionStore } from '../../src/learning/prompt-version-store';
import { createPromptVersion } from '../../src/learning/prompt-types';
import {
  createFeedbackRecord,
  createQualityScore,
  type FeedbackRecord,
} from '../../src/learning/feedback-types';
import { PromptEvolver, type IAiProviderLike } from '../../src/learning/prompt-evolver';
import { RagQualityTracker } from '../../src/learning/rag-quality-tracker';
import { RagWeightIntegrator } from '../../src/learning/rag-weight-integrator';

// ── Helpers ─────────────────────────────────────────

function lowQualityScore() {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.2, weight: 0.3 },
    { name: 'fabric_usage', score: 0.1, weight: 0.25 },
    { name: 'spec_adherence', score: 0.3, weight: 0.2 },
    { name: 'code_structure', score: 0.2, weight: 0.15 },
    { name: 'test_quality', score: 0.1, weight: 0.1 },
  ]);
}

function makeFailure(i: number): FeedbackRecord {
  return createFeedbackRecord({
    tenantId: 't1',
    taskType: 'T44',
    modelId: 'claude',
    promptVersion: 'v1.0',
    qualityScore: lowQualityScore(),
    passed: false,
    generatedCodeLength: 50,
    metadata: { index: i },
  });
}

function populateFeedbackWithFailures(store: PersistentFeedbackStore, count: number): void {
  for (let i = 0; i < count; i++) {
    store.record(makeFailure(i));
  }
}

function mockAiProvider(
  responseText = 'Improved prompt: always use MicroserviceBase and DataProcessResult.',
): IAiProviderLike {
  return {
    generate: jest.fn().mockResolvedValue(DataProcessResult.success({ text: responseText })),
  };
}

function failingAiProvider(): IAiProviderLike {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('AI_ERROR', 'Provider unavailable')),
  };
}

// ══════════════════════════════════════════════════════
// PromptEvolver
// ══════════════════════════════════════════════════════

describe('PromptEvolver', () => {
  let feedbackStore: PersistentFeedbackStore;
  let promptStore: PromptVersionStore;
  let evolver: PromptEvolver;

  beforeEach(() => {
    feedbackStore = new PersistentFeedbackStore();
    promptStore = new PromptVersionStore();

    // Register a champion prompt
    promptStore.registerVersion(
      createPromptVersion({
        taskType: 'T44',
        role: 'system',
        content: 'Generate code following DNA patterns.',
        version: 'v1.0',
        status: 'champion',
      }),
    );

    evolver = new PromptEvolver(feedbackStore, promptStore, {
      failureThreshold: 5,
      lookbackWindow: 20,
    });
  });

  // ── analyzeFailures ───────────────────────────────

  it('should find common failure patterns', () => {
    const failures = Array.from({ length: 5 }, (_, i) => makeFailure(i));
    const result = evolver.analyzeFailures('t1', 'T44', 'system', failures);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.commonPatterns.length).toBeGreaterThan(0);
    expect(result.data!.failureCount).toBe(5);
  });

  it('should suggest improvements for detected patterns', () => {
    const failures = Array.from({ length: 5 }, (_, i) => makeFailure(i));
    const result = evolver.analyzeFailures('t1', 'T44', 'system', failures);
    expect(result.data!.suggestedImprovements.length).toBeGreaterThan(0);
  });

  it('should handle empty failures list', () => {
    const result = evolver.analyzeFailures('t1', 'T44', 'system', []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.commonPatterns).toHaveLength(0);
    expect(result.data!.failureCount).toBe(0);
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    const result = evolver.analyzeFailures('', 'T44', 'system', []);
    expect(result.isSuccess).toBe(false);
  });

  // ── shouldEvolve ──────────────────────────────────

  it('should return true when enough failures accumulated', () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const result = evolver.shouldEvolve('t1', 'T44', 'system');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });

  it('should return false with few failures', () => {
    populateFeedbackWithFailures(feedbackStore, 2);
    const result = evolver.shouldEvolve('t1', 'T44', 'system');
    expect(result.data).toBe(false);
  });

  it('should return false for empty store', () => {
    const result = evolver.shouldEvolve('t1', 'T44', 'system');
    expect(result.data).toBe(false);
  });

  // ── evolvePrompt ──────────────────────────────────

  it('should create candidate version from AI response', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const ai = mockAiProvider();

    const result = await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.status).toBe('candidate');
    expect(result.data!.taskType).toBe('T44');
    expect(result.data!.role).toBe('system');
    expect(result.data!.content).toContain('Improved prompt');
    expect(result.data!.version).toContain('evolved');
  });

  it('should call AI provider with meta-prompt', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const ai = mockAiProvider();

    await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    expect(ai.generate).toHaveBeenCalledWith(
      't1',
      expect.stringContaining('XIIGen'),
      expect.any(Object),
    );
  });

  it('should register new version in prompt store', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const ai = mockAiProvider();

    const result = await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    const candidates = promptStore.getCandidates('T44', 'system');
    expect(candidates.data!.some((c) => c.id === result.data!.id)).toBe(true);
  });

  it('should include failure analysis in metadata', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const ai = mockAiProvider();

    const result = await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    const meta = result.data!.metadata;
    expect(meta.failure_analysis).toBeDefined();
    expect((meta.failure_analysis as any).failure_count).toBe(6);
  });

  it('should fail when insufficient failures', async () => {
    populateFeedbackWithFailures(feedbackStore, 2);
    const ai = mockAiProvider();
    const result = await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_FAILURES');
  });

  it('should fail when AI provider fails', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const result = await evolver.evolvePrompt('t1', 'T44', 'system', failingAiProvider());
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AI_GENERATION_FAILED');
  });

  it('should fail on empty AI response', async () => {
    populateFeedbackWithFailures(feedbackStore, 6);
    const ai = mockAiProvider('');
    const result = await evolver.evolvePrompt('t1', 'T44', 'system', ai);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_RESULT');
  });

  it('should fail on missing tenantId (DNA-5)', async () => {
    const result = await evolver.evolvePrompt('', 'T44', 'system', mockAiProvider());
    expect(result.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// RagQualityTracker
// ══════════════════════════════════════════════════════

describe('RagQualityTracker', () => {
  let tracker: RagQualityTracker;

  beforeEach(() => {
    tracker = new RagQualityTracker();
  });

  it('should return initial weight of 0.5 for unknown pattern', () => {
    const result = tracker.getWeight('t1', 'SK-01');
    expect(result.data).toBe(0.5);
  });

  it('should boost weight on success', () => {
    tracker.recordPatternUsage('t1', 'SK-01', true);
    const result = tracker.getWeight('t1', 'SK-01');
    expect(result.data!).toBeGreaterThan(0.5);
  });

  it('should penalize weight on failure', () => {
    tracker.recordPatternUsage('t1', 'SK-01', false);
    const result = tracker.getWeight('t1', 'SK-01');
    expect(result.data!).toBeLessThan(0.5);
  });

  it('should clamp weight to minimum 0.01', () => {
    // Repeated failures should converge toward 0 but never below 0.01
    for (let i = 0; i < 100; i++) {
      tracker.recordPatternUsage('t1', 'SK-bad', false);
    }
    const result = tracker.getWeight('t1', 'SK-bad');
    expect(result.data!).toBeGreaterThanOrEqual(0.01);
  });

  it('should clamp weight to maximum 1.0', () => {
    for (let i = 0; i < 100; i++) {
      tracker.recordPatternUsage('t1', 'SK-great', true);
    }
    const result = tracker.getWeight('t1', 'SK-great');
    expect(result.data!).toBeLessThanOrEqual(1.0);
  });

  it('should converge toward 1.0 on repeated success', () => {
    for (let i = 0; i < 20; i++) {
      tracker.recordPatternUsage('t1', 'SK-01', true);
    }
    const result = tracker.getWeight('t1', 'SK-01');
    expect(result.data!).toBeGreaterThan(0.8);
  });

  it('should converge toward 0.01 on repeated failure', () => {
    for (let i = 0; i < 20; i++) {
      tracker.recordPatternUsage('t1', 'SK-01', false);
    }
    const result = tracker.getWeight('t1', 'SK-01');
    expect(result.data!).toBeLessThan(0.15);
  });

  it('should getTopPatterns sorted by weight descending', () => {
    // Create patterns with different success rates
    for (let i = 0; i < 10; i++) tracker.recordPatternUsage('t1', 'SK-high', true);
    for (let i = 0; i < 5; i++) tracker.recordPatternUsage('t1', 'SK-mid', true);
    for (let i = 0; i < 5; i++) tracker.recordPatternUsage('t1', 'SK-mid', false);
    for (let i = 0; i < 10; i++) tracker.recordPatternUsage('t1', 'SK-low', false);

    const result = tracker.getTopPatterns('t1', 3);
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(3);
    expect(result.data![0].patternId).toBe('SK-high');
    expect(result.data![0].weight).toBeGreaterThan(result.data![1].weight);
    expect(result.data![1].weight).toBeGreaterThan(result.data![2].weight);
  });

  it('should manually boost pattern', () => {
    const result = tracker.boostPattern('t1', 'SK-01', 0.3);
    expect(result.isSuccess).toBe(true);
    expect(tracker.getWeight('t1', 'SK-01').data!).toBeCloseTo(0.8, 1);
  });

  it('should manually penalize pattern', () => {
    const result = tracker.penalizePattern('t1', 'SK-01', 0.3);
    expect(result.isSuccess).toBe(true);
    expect(tracker.getWeight('t1', 'SK-01').data!).toBeCloseTo(0.2, 1);
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    expect(tracker.recordPatternUsage('', 'SK-01', true).isSuccess).toBe(false);
    expect(tracker.getWeight('', 'SK-01').isSuccess).toBe(false);
    expect(tracker.getTopPatterns('', 5).isSuccess).toBe(false);
    expect(tracker.boostPattern('', 'SK-01', 0.1).isSuccess).toBe(false);
  });

  it('should fail on missing patternId', () => {
    expect(tracker.recordPatternUsage('t1', '', true).isSuccess).toBe(false);
  });

  it('should return pattern stats', () => {
    tracker.recordPatternUsage('t1', 'SK-01', true);
    tracker.recordPatternUsage('t1', 'SK-01', true);
    tracker.recordPatternUsage('t1', 'SK-01', false);

    const result = tracker.getPatternStats('t1', 'SK-01');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.success_count).toBe(2);
    expect(result.data!.failure_count).toBe(1);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    expect(tracker.getWeight('t1', 'SK-01')).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// RagWeightIntegrator
// ══════════════════════════════════════════════════════

describe('RagWeightIntegrator', () => {
  let tracker: RagQualityTracker;
  let integrator: RagWeightIntegrator;

  beforeEach(() => {
    tracker = new RagQualityTracker();
    integrator = new RagWeightIntegrator(tracker);
  });

  it('should re-rank results by weighted score', () => {
    // Boost SK-02 weight, keep SK-01 default
    for (let i = 0; i < 10; i++) tracker.recordPatternUsage('t1', 'SK-02', true);

    const results = [
      { id: 'SK-01', score: 0.9, name: 'Pattern A' },
      { id: 'SK-02', score: 0.7, name: 'Pattern B' },
    ];

    const result = integrator.reRankResults('t1', results);
    expect(result.isSuccess).toBe(true);
    // SK-02 has higher quality weight, so its weighted score should potentially win
    // SK-01: 0.9 * 0.5 = 0.45, SK-02: 0.7 * ~0.87 = ~0.61
    expect(result.data![0].id).toBe('SK-02');
  });

  it('should add weighted_score and quality_weight fields', () => {
    const results = [{ id: 'SK-01', score: 0.8 }];
    const result = integrator.reRankResults('t1', results);
    expect(result.data![0].weighted_score).toBeDefined();
    expect(result.data![0].quality_weight).toBeDefined();
    expect(result.data![0].original_score).toBe(0.8);
  });

  it('should handle zero-relevance results', () => {
    const results = [
      { id: 'SK-01', score: 0 },
      { id: 'SK-02', score: 0.5 },
    ];
    const result = integrator.reRankResults('t1', results);
    // Zero relevance stays at bottom
    expect(result.data![result.data!.length - 1].id).toBe('SK-01');
  });

  it('should handle empty results', () => {
    const result = integrator.reRankResults('t1', []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    const result = integrator.reRankResults('', [{ id: 'SK-01', score: 0.8 }]);
    expect(result.isSuccess).toBe(false);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = integrator.reRankResults('t1', []);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
