/**
 * P4.3 — AI Engine Supporting Infrastructure Tests.
 *
 * OutputScorer: score/rank outputs, custom rubric, tie-breaking
 * CostTracker: record usage, tenant/model summaries, reset
 * TokenBudget: within budget, request too large, budget exceeded, custom limits
 * ExecutionRecipe: creation, defaults, serialization
 */

import { OutputScorer, DEFAULT_RUBRIC } from '../../src/fabrics/ai-engine/scoring';
import { CostTracker } from '../../src/fabrics/ai-engine/cost-tracker';
import { TokenBudget } from '../../src/fabrics/ai-engine/token-budget';
import {
  createExecutionRecipe,
  executionRecipeToDict,
} from '../../src/fabrics/ai-engine/execution-recipe';
import { CLAUDE_SONNET } from '../../src/fabrics/ai-engine/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ══════════════════════════════════════════════════════
// OutputScorer
// ══════════════════════════════════════════════════════

describe('OutputScorer', () => {
  let scorer: OutputScorer;

  beforeEach(() => {
    scorer = new OutputScorer();
  });

  describe('scoreOutputs', () => {
    it('should return empty array for empty input', () => {
      expect(scorer.scoreOutputs([])).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(scorer.scoreOutputs(null as any)).toEqual([]);
      expect(scorer.scoreOutputs(undefined as any)).toEqual([]);
    });

    it('should score a single output', () => {
      const outputs = [
        { model_id: 'claude', text: 'Hello world, this is a test response.', cost: 0.01 },
      ];
      const scored = scorer.scoreOutputs(outputs);
      expect(scored.length).toBe(1);
      expect(scored[0]['model_id']).toBe('claude');
      expect(scored[0]['total_score']).toBeGreaterThan(0);
      expect(scored[0]['breakdown']).toBeDefined();
    });

    it('should rank multiple outputs by score descending', () => {
      const outputs = [
        { model_id: 'short', text: 'Hi', cost: 0.001 },
        {
          model_id: 'medium',
          text: 'This is a moderate length response with reasonable content that should score higher.',
          cost: 0.01,
        },
        { model_id: 'long', text: 'A'.repeat(500), cost: 0.05 },
      ];
      const scored = scorer.scoreOutputs(outputs);
      // Scores should be descending
      for (let i = 1; i < scored.length; i++) {
        expect(scored[i - 1]['total_score']).toBeGreaterThanOrEqual(
          scored[i]['total_score'] as number,
        );
      }
    });

    it('should use default rubric when none provided', () => {
      const outputs = [{ model_id: 'test', text: 'Some text', cost: 0 }];
      const scored = scorer.scoreOutputs(outputs);
      const breakdown = scored[0]['breakdown'] as Record<string, number>;
      expect(breakdown).toHaveProperty('quality');
      expect(breakdown).toHaveProperty('length');
      expect(breakdown).toHaveProperty('speed');
    });

    it('should use custom rubric when provided', () => {
      const outputs = [{ model_id: 'test', text: 'Some text', cost: 0 }];
      const scored = scorer.scoreOutputs(outputs, { correctness: 0.7, style: 0.3 });
      const breakdown = scored[0]['breakdown'] as Record<string, number>;
      expect(breakdown).toHaveProperty('correctness');
      expect(breakdown).toHaveProperty('style');
      expect(breakdown).not.toHaveProperty('quality');
    });

    it('should break ties by cost ascending (cheaper wins)', () => {
      const outputs = [
        { model_id: 'expensive', text: 'Same quality text here.', cost: 0.1 },
        { model_id: 'cheap', text: 'Same quality text here.', cost: 0.01 },
      ];
      const scored = scorer.scoreOutputs(outputs);
      // Same text = same score, cheaper should be first
      if ((scored[0]['total_score'] as number) === (scored[1]['total_score'] as number)) {
        expect(scored[0]['model_id']).toBe('cheap');
      }
    });

    it('should handle empty text with minimal score', () => {
      const outputs = [{ model_id: 'empty', text: '', cost: 0 }];
      const scored = scorer.scoreOutputs(outputs);
      // quality=0, length=0, speed=0.5*0.2=0.1 → total=0.1
      expect(scored[0]['total_score']).toBeLessThan(0.2);
    });

    it('should skip null/non-object entries', () => {
      const outputs = [null as any, { model_id: 'valid', text: 'ok', cost: 0 }, undefined as any];
      const scored = scorer.scoreOutputs(outputs);
      expect(scored.length).toBe(1);
      expect(scored[0]['model_id']).toBe('valid');
    });

    it('should include tokens_used in scored output', () => {
      const outputs = [
        { model_id: 'test', text: 'text', cost: 0, tokens_used: { input: 10, output: 20 } },
      ];
      const scored = scorer.scoreOutputs(outputs);
      expect(scored[0]['tokens_used']).toEqual({ input: 10, output: 20 });
    });
  });

  describe('selectBest', () => {
    it('should return the highest scored output', () => {
      const outputs = [
        { model_id: 'bad', text: '', cost: 0 },
        { model_id: 'good', text: 'A well-formed response with decent content.', cost: 0.01 },
      ];
      const best = scorer.selectBest(outputs);
      expect(best).toBeDefined();
      expect(best!['model_id']).toBe('good');
    });

    it('should return undefined for empty list', () => {
      expect(scorer.selectBest([])).toBeUndefined();
    });
  });

  describe('scoreCriterion', () => {
    it('quality: empty text = 0', () => {
      expect(scorer.scoreCriterion('quality', { text: '' })).toBe(0);
    });

    it('quality: long text = 1.0', () => {
      expect(scorer.scoreCriterion('quality', { text: 'A'.repeat(1500) })).toBe(1.0);
    });

    it('length: 0 chars = 0', () => {
      expect(scorer.scoreCriterion('length', { text: '' })).toBe(0);
    });

    it('length: moderate = 1.0', () => {
      expect(scorer.scoreCriterion('length', { text: 'A'.repeat(100) })).toBe(1.0);
    });

    it('speed: unknown (0 ms) = 0.5 neutral', () => {
      expect(scorer.scoreCriterion('speed', { text: 'x' })).toBe(0.5);
    });

    it('speed: fast (<500ms) = 1.0', () => {
      expect(scorer.scoreCriterion('speed', { text: 'x', elapsed_ms: 200 })).toBe(1.0);
    });

    it('dna_compliance: has DNA keywords = higher score', () => {
      const textWithDna = 'Uses DataProcessResult and tenant_id with MicroserviceBase';
      expect(scorer.scoreCriterion('dna_compliance', { text: textWithDna })).toBeGreaterThan(0.8);
    });

    it('unknown criterion = 0.5 neutral', () => {
      expect(scorer.scoreCriterion('alien_criterion', { text: 'x' })).toBe(0.5);
    });
  });
});

// ══════════════════════════════════════════════════════
// CostTracker
// ══════════════════════════════════════════════════════

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('record', () => {
    it('should accumulate usage for a tenant', () => {
      tracker.record('t1', 'claude', 100, 50, 0.01);
      tracker.record('t1', 'claude', 200, 100, 0.02);

      const usage = tracker.getTenantUsage('t1');
      expect(usage['totalCost']).toBeCloseTo(0.03);
      expect(usage['totalTokensIn']).toBe(300);
      expect(usage['totalTokensOut']).toBe(150);
      expect(usage['callCount']).toBe(2);
    });

    it('should track per-model breakdown within tenant', () => {
      tracker.record('t1', 'claude', 100, 50, 0.01);
      tracker.record('t1', 'gpt', 200, 100, 0.02);

      const usage = tracker.getTenantUsage('t1');
      const byModel = usage['byModel'] as Record<string, any>;
      expect(byModel['claude'].totalCost).toBeCloseTo(0.01);
      expect(byModel['gpt'].totalCost).toBeCloseTo(0.02);
    });

    it('should track global model usage across tenants', () => {
      tracker.record('t1', 'claude', 100, 50, 0.01);
      tracker.record('t2', 'claude', 200, 100, 0.02);

      const modelUsage = tracker.getModelUsage('claude');
      expect(modelUsage['totalCost']).toBeCloseTo(0.03);
      expect(modelUsage['callCount']).toBe(2);
    });
  });

  describe('getTenantUsage', () => {
    it('should return zeros for unknown tenant', () => {
      const usage = tracker.getTenantUsage('unknown');
      expect(usage['totalCost']).toBe(0);
      expect(usage['callCount']).toBe(0);
    });
  });

  describe('getModelUsage', () => {
    it('should return zeros for unknown model', () => {
      const usage = tracker.getModelUsage('unknown');
      expect(usage['totalCost']).toBe(0);
      expect(usage['callCount']).toBe(0);
    });
  });

  describe('getTenantTotalCost', () => {
    it('should return total cost for tenant', () => {
      tracker.record('t1', 'claude', 100, 50, 0.05);
      expect(tracker.getTenantTotalCost('t1')).toBeCloseTo(0.05);
    });

    it('should return 0 for unknown tenant', () => {
      expect(tracker.getTenantTotalCost('unknown')).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all tracked data', () => {
      tracker.record('t1', 'claude', 100, 50, 0.01);
      tracker.record('t2', 'gpt', 200, 100, 0.02);
      expect(tracker.tenantCount).toBe(2);

      tracker.reset();
      expect(tracker.tenantCount).toBe(0);
      expect(tracker.modelCount).toBe(0);
      expect(tracker.getTenantTotalCost('t1')).toBe(0);
    });
  });

  describe('isolation', () => {
    it('tenant-A usage should not affect tenant-B', () => {
      tracker.record('A', 'claude', 1000, 500, 1.0);
      tracker.record('B', 'gpt', 100, 50, 0.01);

      expect(tracker.getTenantTotalCost('A')).toBeCloseTo(1.0);
      expect(tracker.getTenantTotalCost('B')).toBeCloseTo(0.01);
    });
  });
});

// ══════════════════════════════════════════════════════
// TokenBudget
// ══════════════════════════════════════════════════════

describe('TokenBudget', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe('checkBudget', () => {
    it('should return success when within budget', () => {
      const budget = new TokenBudget(tracker, { defaultTenantLimit: 10.0 });
      const result = budget.checkBudget('t1', 1000);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should fail when request exceeds per-request max tokens', () => {
      const budget = new TokenBudget(tracker, { perRequestMaxTokens: 1000 });
      const result = budget.checkBudget('t1', 5000);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('REQUEST_TOO_LARGE');
    });

    it('should fail when tenant exceeds cost limit', () => {
      tracker.record('t1', 'claude', 100000, 50000, 150.0);
      const budget = new TokenBudget(tracker, { defaultTenantLimit: 100.0 });
      const result = budget.checkBudget('t1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('BUDGET_EXCEEDED');
    });

    it('should use custom tenant limit over default', () => {
      tracker.record('premium', 'claude', 100000, 50000, 50.0);
      const budget = new TokenBudget(tracker, {
        defaultTenantLimit: 10.0,
        tenantLimits: { premium: 1000.0 },
      });
      // Default limit would fail (50 > 10), but custom limit allows it (50 < 1000)
      const result = budget.checkBudget('premium');
      expect(result.isSuccess).toBe(true);
    });

    it('should fail with missing tenant_id', () => {
      const budget = new TokenBudget(tracker);
      const result = budget.checkBudget('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const budget = new TokenBudget(tracker);
      expect(budget.checkBudget('t1')).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('setTenantLimit', () => {
    it('should dynamically set a custom limit', () => {
      const budget = new TokenBudget(tracker, { defaultTenantLimit: 10.0 });
      expect(budget.getTenantLimit('t1')).toBe(10.0); // default

      budget.setTenantLimit('t1', 500.0);
      expect(budget.getTenantLimit('t1')).toBe(500.0);
    });
  });

  describe('properties', () => {
    it('should expose maxTokensPerRequest', () => {
      const budget = new TokenBudget(tracker, { perRequestMaxTokens: 8000 });
      expect(budget.maxTokensPerRequest).toBe(8000);
    });

    it('should expose defaultLimit', () => {
      const budget = new TokenBudget(tracker, { defaultTenantLimit: 50.0 });
      expect(budget.defaultLimit).toBe(50.0);
    });

    it('should use sensible defaults', () => {
      const budget = new TokenBudget(tracker);
      expect(budget.defaultLimit).toBe(100.0);
      expect(budget.maxTokensPerRequest).toBe(32000);
    });
  });
});

// ══════════════════════════════════════════════════════
// ExecutionRecipe
// ══════════════════════════════════════════════════════

describe('ExecutionRecipe', () => {
  describe('createExecutionRecipe', () => {
    it('should create with defaults', () => {
      const recipe = createExecutionRecipe('recipe-1');
      expect(recipe.recipeId).toBe('recipe-1');
      expect(recipe.promptVersion).toBe('1.0');
      expect(recipe.ragProfile).toBe('default');
      expect(recipe.maxTokens).toBe(4096);
      expect(recipe.temperature).toBe(0.7);
      expect(recipe.judgeRubric).toEqual({ correctness: 0.4, quality: 0.4, style: 0.2 });
      expect(recipe.systemPrompt).toBeUndefined();
      expect(recipe.modelProfile).toBeUndefined();
    });

    it('should accept overrides', () => {
      const recipe = createExecutionRecipe('recipe-2', {
        promptVersion: '2.0',
        ragProfile: 'code_patterns',
        modelProfile: CLAUDE_SONNET,
        maxTokens: 8192,
        temperature: 0.3,
        systemPrompt: 'You are a code generator',
        metadata: { task_type: 'T44' },
      });
      expect(recipe.promptVersion).toBe('2.0');
      expect(recipe.ragProfile).toBe('code_patterns');
      expect(recipe.modelProfile?.modelId).toBe('claude-sonnet-4-5');
      expect(recipe.maxTokens).toBe(8192);
      expect(recipe.temperature).toBe(0.3);
      expect(recipe.systemPrompt).toBe('You are a code generator');
      expect(recipe.metadata['task_type']).toBe('T44');
    });
  });

  describe('executionRecipeToDict', () => {
    it('should serialize to dict (DNA-1)', () => {
      const recipe = createExecutionRecipe('recipe-3', {
        modelProfile: CLAUDE_SONNET,
        systemPrompt: 'Generate code',
      });
      const dict = executionRecipeToDict(recipe);
      expect(dict['recipe_id']).toBe('recipe-3');
      expect(dict['prompt_version']).toBe('1.0');
      expect(dict['rag_profile']).toBe('default');
      expect(dict['model_profile']).toBeDefined();
      expect((dict['model_profile'] as any)['model_id']).toBe('claude-sonnet-4-5');
      expect(dict['system_prompt']).toBe('Generate code');
      expect(dict['judge_rubric']).toEqual({ correctness: 0.4, quality: 0.4, style: 0.2 });
    });

    it('should handle null model profile', () => {
      const recipe = createExecutionRecipe('recipe-4');
      const dict = executionRecipeToDict(recipe);
      expect(dict['model_profile']).toBeNull();
    });

    it('should handle null system prompt', () => {
      const recipe = createExecutionRecipe('recipe-5');
      const dict = executionRecipeToDict(recipe);
      expect(dict['system_prompt']).toBeNull();
    });

    it('should return a copy (mutations safe)', () => {
      const recipe = createExecutionRecipe('recipe-6', { metadata: { key: 'val' } });
      const dict = executionRecipeToDict(recipe);
      (dict['metadata'] as any)['hacked'] = true;
      expect(recipe.metadata['hacked']).toBeUndefined();
    });
  });
});
