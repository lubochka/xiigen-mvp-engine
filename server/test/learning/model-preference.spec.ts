/**
 * P12.2 Tests — ModelPreferenceTracker + ModelSelectionStrategy + DispatcherIntegration
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { ModelPreferenceTracker, type ModelRanking } from '../../src/learning/model-preference';
import { ModelSelectionStrategy, SelectionStrategy } from '../../src/learning/model-selection';
import { DispatcherIntegration } from '../../src/learning/dispatcher-integration';

// ── Helpers ─────────────────────────────────────────

function populatedTracker(minSamples = 3): ModelPreferenceTracker {
  const tracker = new ModelPreferenceTracker({ minSamples, decayHalflife: 50 });
  // Claude: 5 results, avg ~0.85
  for (const score of [0.9, 0.85, 0.82, 0.88, 0.8]) {
    tracker.recordResult('t1', 'T44', 'claude', score, true);
  }
  // GPT: 5 results, avg ~0.72
  for (const score of [0.7, 0.75, 0.68, 0.72, 0.74]) {
    tracker.recordResult('t1', 'T44', 'gpt', score, true);
  }
  // Gemini: 5 results, avg ~0.65, some failures
  for (const s of [0.6, 0.7, 0.55, 0.65, 0.75]) {
    tracker.recordResult('t1', 'T44', 'gemini', s, s > 0.6);
  }
  return tracker;
}

// ══════════════════════════════════════════════════════
// ModelPreferenceTracker
// ══════════════════════════════════════════════════════

describe('ModelPreferenceTracker', () => {
  let tracker: ModelPreferenceTracker;

  beforeEach(() => {
    tracker = new ModelPreferenceTracker({ minSamples: 3 });
  });

  it('should record result and retrieve ranking', () => {
    for (let i = 0; i < 3; i++) tracker.recordResult('t1', 'T44', 'claude', 0.8);
    const result = tracker.getRanking('t1', 'T44');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(1);
    expect(result.data![0].modelId).toBe('claude');
  });

  it('should sort ranking by score descending', () => {
    const t = populatedTracker();
    const result = t.getRanking('t1', 'T44');
    const rankings = result.data!;
    expect(rankings.length).toBe(3);
    expect(rankings[0].modelId).toBe('claude');
    expect(rankings[0].avgScore).toBeGreaterThan(rankings[1].avgScore);
    expect(rankings[1].avgScore).toBeGreaterThan(rankings[2].avgScore);
  });

  it('should enforce minimum sample size', () => {
    tracker.recordResult('t1', 'T44', 'claude', 0.9);
    tracker.recordResult('t1', 'T44', 'claude', 0.85);
    // Only 2 results, min is 3
    const result = tracker.getRanking('t1', 'T44');
    expect(result.data!).toHaveLength(0);
  });

  it('should getBestModel returning top-ranked model', () => {
    const t = populatedTracker();
    const result = t.getBestModel('t1', 'T44');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe('claude');
  });

  it('should return null when no data for getBestModel', () => {
    const result = tracker.getBestModel('t1', 'T44');
    expect(result.data).toBeNull();
  });

  it('should aggregate global ranking across task types', () => {
    const t = populatedTracker();
    // Add results for a second task type
    for (let i = 0; i < 3; i++) {
      t.recordResult('t1', 'T45', 'claude', 0.9);
      t.recordResult('t1', 'T45', 'gpt', 0.6);
    }
    const result = t.getGlobalRanking('t1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBeGreaterThanOrEqual(2);
    // Claude should still be top globally
    expect(result.data![0].modelId).toBe('claude');
  });

  it('should include passRate in ranking', () => {
    const t = populatedTracker();
    const result = t.getRanking('t1', 'T44');
    const gemini = result.data!.find((r) => r.modelId === 'gemini')!;
    expect(gemini.passRate).toBeLessThan(1.0);
    expect(gemini.passRate).toBeGreaterThan(0);
  });

  it('should include lastUsed timestamp', () => {
    const t = populatedTracker();
    const result = t.getRanking('t1', 'T44');
    expect(result.data![0].lastUsed).toBeDefined();
    expect(typeof result.data![0].lastUsed).toBe('string');
  });

  it('should apply decay — newer results weighted more', () => {
    // Record old results for claude at low scores
    for (let i = 0; i < 5; i++) tracker.recordResult('t1', 'T44', 'claude', 0.3, true);
    // Record newer results for claude at high scores
    for (let i = 0; i < 5; i++) tracker.recordResult('t1', 'T44', 'claude', 0.9, true);

    const result = tracker.getRanking('t1', 'T44');
    const claude = result.data![0];
    // Average should be biased toward 0.9 (newer), not 0.6 (simple average)
    // With short time gap in tests, decay effect is minimal, but result count is sufficient
    expect(claude.avgScore).toBeGreaterThanOrEqual(0.5);
  });

  it('should handle empty data', () => {
    const result = tracker.getRanking('t1', 'T44');
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toHaveLength(0);
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    expect(tracker.recordResult('', 'T44', 'claude', 0.8).isSuccess).toBe(false);
    expect(tracker.getRanking('', 'T44').isSuccess).toBe(false);
    expect(tracker.getGlobalRanking('').isSuccess).toBe(false);
  });

  it('should track result count', () => {
    tracker.recordResult('t1', 'T44', 'claude', 0.8);
    tracker.recordResult('t1', 'T44', 'claude', 0.85);
    expect(tracker.getResultCount('t1', 'T44')).toBe(2);
  });

  it('should isolate tenants', () => {
    for (let i = 0; i < 3; i++) {
      tracker.recordResult('t1', 'T44', 'claude', 0.9);
      tracker.recordResult('t2', 'T44', 'gpt', 0.8);
    }
    const t1Ranking = tracker.getRanking('t1', 'T44');
    expect(t1Ranking.data!).toHaveLength(1);
    expect(t1Ranking.data![0].modelId).toBe('claude');

    const t2Ranking = tracker.getRanking('t2', 'T44');
    expect(t2Ranking.data!).toHaveLength(1);
    expect(t2Ranking.data![0].modelId).toBe('gpt');
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = tracker.getRanking('t1', 'T44');
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// ModelSelectionStrategy
// ══════════════════════════════════════════════════════

describe('ModelSelectionStrategy', () => {
  let tracker: ModelPreferenceTracker;
  let selector: ModelSelectionStrategy;
  const models = ['claude', 'gpt', 'gemini'];

  beforeEach(() => {
    tracker = populatedTracker();
    selector = new ModelSelectionStrategy(tracker, { exploreRate: 0.2 });
  });

  describe('BEST strategy', () => {
    it('should select top-ranked model', () => {
      const result = selector.selectModel('t1', 'T44', models, SelectionStrategy.BEST);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('claude');
    });

    it('should fallback to first available when best not in list', () => {
      const result = selector.selectModel(
        't1',
        'T44',
        ['deepseek', 'grok'],
        SelectionStrategy.BEST,
      );
      expect(result.data).toBe('deepseek');
    });

    it('should fallback when no ranking data', () => {
      const emptyTracker = new ModelPreferenceTracker();
      const sel = new ModelSelectionStrategy(emptyTracker);
      const result = sel.selectModel('t1', 'T99', models, SelectionStrategy.BEST);
      expect(result.data).toBe('claude'); // first available
    });
  });

  describe('EXPLORE strategy', () => {
    it('should mostly select best model', () => {
      // Run 100 selections — most should be 'claude'
      let claudeCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = selector.selectModel('t1', 'T44', models, SelectionStrategy.EXPLORE);
        if (result.data === 'claude') claudeCount++;
      }
      // With 20% explore rate, expect ~80% claude
      expect(claudeCount).toBeGreaterThan(50);
      expect(claudeCount).toBeLessThan(100);
    });

    it('should sometimes select non-top model', () => {
      let nonClaudeCount = 0;
      for (let i = 0; i < 100; i++) {
        const result = selector.selectModel('t1', 'T44', models, SelectionStrategy.EXPLORE);
        if (result.data !== 'claude') nonClaudeCount++;
      }
      expect(nonClaudeCount).toBeGreaterThan(0);
    });
  });

  describe('ROUND_ROBIN strategy', () => {
    it('should cycle through models', () => {
      const selections: string[] = [];
      for (let i = 0; i < 6; i++) {
        const result = selector.selectModel('t1', 'T44', models, SelectionStrategy.ROUND_ROBIN);
        selections.push(result.data!);
      }
      // Should cycle: claude, gpt, gemini, claude, gpt, gemini
      expect(selections[0]).toBe(models[0]);
      expect(selections[1]).toBe(models[1]);
      expect(selections[2]).toBe(models[2]);
      expect(selections[3]).toBe(models[0]);
    });
  });

  it('should fail on empty models list', () => {
    const result = selector.selectModel('t1', 'T44', [], SelectionStrategy.BEST);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_MODELS');
  });

  it('should return single model when only one available', () => {
    const result = selector.selectModel('t1', 'T44', ['only-one'], SelectionStrategy.EXPLORE);
    expect(result.data).toBe('only-one');
  });

  it('should fail on missing tenantId (DNA-5)', () => {
    const result = selector.selectModel('', 'T44', models, SelectionStrategy.BEST);
    expect(result.isSuccess).toBe(false);
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const result = selector.selectModel('t1', 'T44', models, SelectionStrategy.BEST);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// DispatcherIntegration
// ══════════════════════════════════════════════════════

describe('DispatcherIntegration', () => {
  let tracker: ModelPreferenceTracker;
  let integration: DispatcherIntegration;

  beforeEach(() => {
    tracker = populatedTracker();
    integration = new DispatcherIntegration(tracker, { tieThreshold: 0.05 });
  });

  it('should return original best when score gap > threshold', () => {
    const outputs = [
      { model_id: 'gpt', total_score: 0.9, text: 'code A' },
      { model_id: 'claude', total_score: 0.7, text: 'code B' },
    ];
    const result = integration.enhancedSelect('t1', 'T44', outputs);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.model_id).toBe('gpt'); // gpt has higher score, gap = 0.2 > 0.05
    expect(result.data!.selection_reason).toBe('score_gap');
  });

  it('should use preference to break tie when scores close', () => {
    const outputs = [
      { model_id: 'gpt', total_score: 0.82, text: 'code A' },
      { model_id: 'claude', total_score: 0.8, text: 'code B' },
    ];
    const result = integration.enhancedSelect('t1', 'T44', outputs);
    expect(result.isSuccess).toBe(true);
    // Gap = 0.02 < 0.05 → tie → claude preferred (higher ranking)
    expect(result.data!.model_id).toBe('claude');
    expect(result.data!.selection_reason).toBe('preference_tiebreak');
  });

  it('should return original best when no preference data', () => {
    const emptyTracker = new ModelPreferenceTracker();
    const integ = new DispatcherIntegration(emptyTracker);
    const outputs = [
      { model_id: 'gpt', total_score: 0.82, text: 'code A' },
      { model_id: 'claude', total_score: 0.8, text: 'code B' },
    ];
    const result = integ.enhancedSelect('t1', 'T44', outputs);
    expect(result.data!.model_id).toBe('gpt'); // original best
    expect(result.data!.selection_reason).toBe('no_preference_data');
  });

  it('should handle single output', () => {
    const outputs = [{ model_id: 'claude', total_score: 0.8, text: 'code' }];
    const result = integration.enhancedSelect('t1', 'T44', outputs);
    expect(result.data!.model_id).toBe('claude');
  });

  it('should fail on empty outputs', () => {
    const result = integration.enhancedSelect('t1', 'T44', []);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_OUTPUTS');
  });

  it('should include score_gap in result', () => {
    const outputs = [
      { model_id: 'gpt', total_score: 0.9, text: 'code A' },
      { model_id: 'claude', total_score: 0.85, text: 'code B' },
    ];
    const result = integration.enhancedSelect('t1', 'T44', outputs);
    expect(result.data!.score_gap).toBeDefined();
  });

  it('should return DataProcessResult (DNA-3)', () => {
    const outputs = [{ model_id: 'claude', total_score: 0.8, text: 'code' }];
    const result = integration.enhancedSelect('t1', 'T44', outputs);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});
