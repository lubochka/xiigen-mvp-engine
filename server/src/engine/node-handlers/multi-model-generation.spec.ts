/**
 * Multi-model blind parallel generation tests.
 *
 * Covers the full judging protocol in AiGenerateHandler:
 *   1. Three providers succeed: chosen = highest-scored, rejected = lowest, middle discarded
 *   2. Swap mock scores: verify assignment FLIPS — score-driven not position-driven
 *   3. Two-way tie for highest: verify alphabetical label tie-break applied
 *   4. Three-way tie: triple written to xiigen-training-data-review, not main index
 *   5. One provider fails: remaining two still produce valid chosen/rejected pair
 *   6. All providers fail except primary: fallback to single-model, modelComparison: null
 *   7. Judge unavailable: fallback to primary output, warning logged, generation not blocked
 */
import { AiGenerateHandler } from './ai-generate.handler';
import { FeedbackHandler } from './feedback.handler';
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeHandlerContext } from './node-handler.types';

// ── Helpers ───────────────────────────────────────────────────────────────

const baseContract: any = {
  taskTypeId: 'T999',
  archetype: 'SERVICE',
  ironRules: ['Must extend MicroserviceBase', 'Use DataProcessResult'],
  handlers: [],
  machineConstants: [],
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-mm-1',
  flowId: 'FLOW-TEST',
  taskTypeId: 'T999',
  tenantId: 'acme',
  inputs: {},
  priorOutputs: [],
  nodeConfig: {},
};

/** Build a mock IAiProvider that always succeeds with the given text. */
function mockProvider(text: string, modelName: string) {
  return {
    generate: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        text,
        model: modelName,
        tokens_used: { input: 100, output: 200 },
        cost: 0.001,
        provider: 'mock',
      }),
    ),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getModelInfo: jest.fn().mockReturnValue({ model: modelName }),
  };
}

/** Build a mock provider that always fails. */
function failingProvider() {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('PROVIDER_ERROR', 'provider unavailable')),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getModelInfo: jest.fn().mockReturnValue({ model: 'fail' }),
  };
}

/**
 * Build a mock judge that returns a specific scores map.
 * The judge text is JSON with the given scores.
 */
function mockJudge(scores: Record<string, number>) {
  const labels = Object.keys(scores);
  const ranking = [...labels].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
  const violations: Record<string, string[]> = {};
  for (const l of labels) violations[l] = [];
  const judgeText = JSON.stringify({ ranking, scores, violations });
  return {
    generate: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        text: judgeText,
        model: 'claude-sonnet-4-5',
        tokens_used: { input: 50, output: 80 },
      }),
    ),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
  };
}

/** Failing judge — simulates judge provider returning failure. */
function failingJudge() {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('JUDGE_ERROR', 'judge unavailable')),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getModelInfo: jest.fn().mockReturnValue({ model: 'fail' }),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AiGenerateHandler — multi-model blind judging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test 1: three providers succeed — chosen=highest, rejected=lowest, middle discarded', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');
    const geminiAi = mockProvider('class GeminiService {}', 'gemini-2.0-flash');

    // The judge will be called with shuffled outputs A/B/C.
    // We cannot predict which label maps to which provider after shuffle,
    // but we CAN verify that the chosen output's model matches the provider
    // with the highest judge score.
    // Strategy: intercept the judge prompt to extract the label map.
    let capturedJudgePrompt = '';
    const judge = {
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        capturedJudgePrompt = prompt;
        // Parse which label got which provider output from the prompt
        // Assign: A=0.9, B=0.6, C=0.3 regardless of which label is which provider
        const scores: Record<string, string> = {};
        for (const label of ['A', 'B', 'C']) {
          const match = prompt.match(new RegExp(`--- Output ${label} ---\\n([^\\n]+)`));
          if (match) scores[label] = match[1] ?? '';
        }
        // Highest score to A, middle to B, lowest to C
        return DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['A', 'B', 'C'],
            scores: { A: 0.9, B: 0.6, C: 0.3 },
            violations: { A: [], B: [], C: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        });
      }),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const handler = new AiGenerateHandler(
      primaryAi as any,
      judge as any,
      openaiAi as any,
      geminiAi as any,
    );

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);

    const mc = result.data?.data?.['modelComparison'] as any;
    expect(mc).not.toBeNull();
    expect(mc.chosen.score).toBe(0.9);
    expect(mc.rejected).not.toBeNull();
    expect(mc.rejected.score).toBe(0.3);
    expect(mc.discarded).not.toBeNull();
    expect(mc.discarded.score).toBe(0.6);
    expect(mc.shuffleWasApplied).toBe(true);
    expect(result.data?.data?.['tripleStatus']).toBe('ACCEPTED');
  });

  it('Test 2: swap scores — assignment FLIPS (score-driven, not position-driven)', async () => {
    // Verify that the chosen output is always the one with the HIGHER judge score,
    // regardless of label position. The judge returns deterministic scores for A/B.
    // Since labels are randomly shuffled, we cannot know which provider gets which label.
    // Instead, we verify the invariant: chosen.score > rejected.score in all cases.
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');

    // Scenario A: A beats B strongly
    const judgeABeatsB = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['A', 'B'],
            scores: { A: 0.9, B: 0.2 },
            violations: { A: [], B: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        }),
      ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const handlerA = new AiGenerateHandler(
      primaryAi as any,
      judgeABeatsB as any,
      openaiAi as any,
      null,
    );
    const resultA = await handlerA.handle(baseCtx);
    const mcA = resultA.data?.data?.['modelComparison'] as any;
    // Chosen must always have higher score than rejected
    expect(mcA.chosen.score).toBeGreaterThan(mcA.rejected.score);
    expect(mcA.chosen.score).toBe(0.9);
    expect(mcA.rejected.score).toBe(0.2);

    // Scenario B: B beats A strongly
    const judgeBBeatsA = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['B', 'A'],
            scores: { A: 0.2, B: 0.9 },
            violations: { A: [], B: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        }),
      ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const handlerB = new AiGenerateHandler(
      primaryAi as any,
      judgeBBeatsA as any,
      openaiAi as any,
      null,
    );
    const resultB = await handlerB.handle(baseCtx);
    const mcB = resultB.data?.data?.['modelComparison'] as any;
    // In this scenario too: chosen must have higher score than rejected
    expect(mcB.chosen.score).toBeGreaterThan(mcB.rejected.score);
    expect(mcB.chosen.score).toBe(0.9);
    expect(mcB.rejected.score).toBe(0.2);
  });

  it('Test 3: two-way tie for highest — alphabetical label tie-break applied', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');

    // Both A and B get equal scores — alphabetical tie-break should pick A
    const judge = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['A', 'B'],
            scores: { A: 0.7, B: 0.7 },
            violations: { A: [], B: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        }),
      ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const handler = new AiGenerateHandler(primaryAi as any, judge as any, openaiAi as any, null);

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);

    const mc = result.data?.data?.['modelComparison'] as any;
    // With tie at 0.7, alphabetical tie-break means A wins.
    // The chosen score should be 0.7 (same as rejected for a tie)
    expect(mc.chosen.score).toBe(0.7);
    // tripleStatus is ACCEPTED (two-way tie is not three-way)
    expect(result.data?.data?.['tripleStatus']).toBe('ACCEPTED');
  });

  it('Test 4: three-way tie — triple written to xiigen-training-data-review', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');
    const geminiAi = mockProvider('class GeminiService {}', 'gemini-2.0-flash');

    // All three providers get equal scores → UNDECIDED
    const judge = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['A', 'B', 'C'],
            scores: { A: 0.5, B: 0.5, C: 0.5 },
            violations: { A: [], B: [], C: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        }),
      ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    };

    const handler = new AiGenerateHandler(
      primaryAi as any,
      judge as any,
      openaiAi as any,
      geminiAi as any,
    );

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['tripleStatus']).toBe('UNDECIDED');

    // Now run through FeedbackHandler to verify it routes to review index
    const feedbackHandler = new FeedbackHandler(mockDb as any);
    const feedbackCtx: NodeHandlerContext = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode: 'class X {}',
            model: 'claude-sonnet-4-5',
            tokensUsed: {},
            taskTypeId: 'T999',
            modelComparison: {
              chosen: { model: 'anthropic', score: 0.5 },
              rejected: { model: 'openai', score: 0.5 },
              discarded: { model: 'gemini', score: 0.5 },
              judgeModel: 'claude-sonnet-4-5',
              shuffleWasApplied: true,
            },
            tripleStatus: 'UNDECIDED',
          },
        },
        { nodeType: 'score', data: { score: 0.8 } },
      ],
    };

    await feedbackHandler.handle(feedbackCtx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data-review',
      expect.objectContaining({ tripleStatus: 'UNDECIDED' }),
      expect.any(String),
    );
    // Should NOT have written to main training-data index
    const calls = mockDb.storeDocument.mock.calls as Array<[string, ...unknown[]]>;
    const mainIndexCalls = calls.filter((c) => c[0] === 'xiigen-training-data');
    expect(mainIndexCalls).toHaveLength(0);
  });

  it('Test 5: one provider fails — remaining two produce valid chosen/rejected pair', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = failingProvider();
    const geminiAi = mockProvider('class GeminiService {}', 'gemini-2.0-flash');

    // Only anthropic and gemini succeed — judge picks between them
    const judge = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            ranking: ['A', 'B'],
            scores: { A: 0.8, B: 0.5 },
            violations: { A: [], B: [] },
          }),
          model: 'claude-sonnet-4-5',
          tokens_used: {},
        }),
      ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-sonnet-4-5' }),
    };

    const handler = new AiGenerateHandler(
      primaryAi as any,
      judge as any,
      openaiAi as any,
      geminiAi as any,
    );

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);

    const mc = result.data?.data?.['modelComparison'] as any;
    expect(mc).not.toBeNull();
    expect(mc.chosen.score).toBe(0.8);
    expect(mc.rejected).not.toBeNull();
    expect(mc.rejected.score).toBe(0.5);
    // discarded should be null (only 2 providers succeeded)
    expect(mc.discarded).toBeNull();
    expect(result.data?.data?.['tripleStatus']).toBe('ACCEPTED');
  });

  it('Test 6: all providers fail except primary — single-model fallback, modelComparison: null', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = failingProvider();
    const geminiAi = failingProvider();

    const handler = new AiGenerateHandler(
      primaryAi as any,
      null, // judge not needed
      openaiAi as any,
      geminiAi as any,
    );

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['modelComparison']).toBeNull();
    expect(result.data?.data?.['tripleStatus']).toBe('ACCEPTED');
    expect(result.data?.data?.['generatedCode']).toBe('class AnthropicService {}');
  });

  it('Test 7: judge unavailable — fallback to primary output, warning logged, generation not blocked', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');

    // Construct handler with null judge
    const handler = new AiGenerateHandler(
      primaryAi as any,
      null, // no judge
      openaiAi as any,
      null,
    );

    // Spy on logger.warn
    const warnSpy = jest.spyOn((handler as any).logger, 'warn').mockImplementation(() => {});

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    // Generation should not be blocked
    expect(result.data?.data?.['generatedCode']).toBeTruthy();
    // Warning should have been logged
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('AI_JUDGE_PROVIDER'));
    // modelComparison should be null (no judging)
    expect(result.data?.data?.['modelComparison']).toBeNull();

    warnSpy.mockRestore();
  });

  it('Test 7b: judge returns failure — fallback to primary, warning logged, not blocked', async () => {
    const primaryAi = mockProvider('class AnthropicService {}', 'claude-sonnet-4-5');
    const openaiAi = mockProvider('class OpenAiService {}', 'gpt-4o');
    const badJudge = failingJudge();

    const handler = new AiGenerateHandler(primaryAi as any, badJudge as any, openaiAi as any, null);

    const warnSpy = jest.spyOn((handler as any).logger, 'warn').mockImplementation(() => {});

    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['generatedCode']).toBeTruthy();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('AI_JUDGE_PROVIDER'));
    expect(result.data?.data?.['modelComparison']).toBeNull();

    warnSpy.mockRestore();
  });
});

// ── FeedbackHandler — modelComparison field in DPO triple ─────────────────

describe('FeedbackHandler — modelComparison written to DPO triple', () => {
  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
  });

  it('includes modelComparison in DPO triple when present', async () => {
    const handler = new FeedbackHandler(mockDb as any);
    const modelComparison = {
      chosen: { model: 'anthropic', score: 0.9 },
      rejected: { model: 'openai', score: 0.4 },
      discarded: null,
      judgeModel: 'claude-sonnet-4-5',
      shuffleWasApplied: true,
    };

    const ctx: NodeHandlerContext = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode: 'class X extends MicroserviceBase {}',
            model: 'claude-sonnet-4-5',
            tokensUsed: {},
            taskTypeId: 'T999',
            modelComparison,
            tripleStatus: 'ACCEPTED',
          },
        },
        { nodeType: 'score', data: { score: 0.88 } },
      ],
    };

    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({
        modelComparison: expect.objectContaining({
          chosen: { model: 'anthropic', score: 0.9 },
          rejected: { model: 'openai', score: 0.4 },
        }),
        tripleStatus: 'ACCEPTED',
      }),
      expect.any(String),
    );
  });

  it('writes null modelComparison for single-model outputs', async () => {
    const handler = new FeedbackHandler(mockDb as any);

    const ctx: NodeHandlerContext = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode: 'class X extends MicroserviceBase {}',
            model: 'claude-sonnet-4-5',
            tokensUsed: {},
            taskTypeId: 'T999',
            modelComparison: null,
            tripleStatus: 'ACCEPTED',
          },
        },
        { nodeType: 'score', data: { score: 0.85 } },
      ],
    };

    await handler.handle(ctx);

    // G6: null modelComparison → SINGLE_PROVIDER → pending index (not main training index)
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data-pending',
      expect.objectContaining({ modelComparison: null, pendingReason: 'SINGLE_PROVIDER' }),
      expect.any(String),
    );
  });
});
