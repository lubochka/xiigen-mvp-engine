import 'reflect-metadata';
import { TeachingRoundService, TeachingRoundOptions } from './teaching-round.service';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Mock factory helpers ──────────────────────────────────────────────────────

function makeMockProvider(modelId: string, scoreSequence: number[] = [8.5]) {
  let callCount = 0;
  const generate = jest.fn().mockImplementation(() => {
    const score = scoreSequence[callCount % scoreSequence.length] ?? 8.5;
    callCount++;
    // Even calls = generation (text output), odd calls = self-judge (JSON score)
    const isJudgeCall = callCount % 2 === 0;
    const text = isJudgeCall
      ? JSON.stringify({ score, reasoning: 'looks good' })
      : `Node proposal from ${modelId} (call ${callCount})`;
    return Promise.resolve(
      DataProcessResult.success({
        text,
        model: modelId,
        cost: 0.001,
        tokens_used: { input: 10, output: 20 },
      }),
    );
  });
  return { generate, getModelInfo: () => ({ provider: 'mock', modelId }) };
}

function makeFailingProvider(modelId: string) {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('PROVIDER_ERROR', 'mock failure')),
    getModelInfo: () => ({ provider: 'mock', modelId }),
  };
}

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
};

function makeOptions(overrides: Partial<TeachingRoundOptions> = {}): TeachingRoundOptions {
  return {
    nodePrompt: 'Build a user registration node',
    judgeSystemPrompt: 'Evaluate this node output. Score 0-10.',
    stepText: 'User registration',
    constraints: ['technology-neutral', 'no frameworks'],
    minRounds: 2,
    maxRounds: 3,
    stagnationDrift: 0.1,
    flowId: 'flow-test-01',
    runId: 'run-test-01',
    tenantId: 'tenant-unit',
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('TeachingRoundService', () => {
  // ── POSITIVE ──────────────────────────────────────────────────────────────

  it('returns DataProcessResult.success with bestOutput from highest-scoring round', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.5]);
    const judge = makeMockProvider('mock-claude', [6.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, judge as any, mockDb as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 2 }));

    expect(result.isSuccess).toBe(true);
    expect(result.data!.bestOutput).toBeTruthy();
    expect(result.data!.bestModel).toBe('mock-gemini'); // highest score
    expect(result.data!.bestScore).toBe(9.0);
  });

  it('stores one DPO triple per round with correct schema fields (DNA-8)', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);
    const judge = makeMockProvider('mock-claude', [5.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, judge as any, mockDb as any);
    await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({
        station: 'CYCLE-2',
        curriculumTier: 1,
        knowledgeScope: 'PRIVATE',
        round: 1,
        chosen: expect.objectContaining({ model: 'mock-gemini', score: 9.0 }),
        rejected: expect.objectContaining({ model: 'mock-openai', score: 7.0 }),
        discarded: expect.objectContaining({ model: 'mock-claude', score: 5.0 }),
        flowId: 'flow-test-01',
        runId: 'run-test-01',
        tenantId: 'tenant-unit',
      }),
      expect.any(String), // randomUUID
    );
  });

  it('DNA-8: storeDocument called before returning result', async () => {
    const order: string[] = [];
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);
    const dbWithOrder = {
      ...mockDb,
      storeDocument: jest.fn().mockImplementation(() => {
        order.push('store');
        return Promise.resolve(DataProcessResult.success({}));
      }),
    };

    const svc = new TeachingRoundService(gemini as any, openai as any, null, dbWithOrder as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    expect(order).toContain('store');
    expect(result.isSuccess).toBe(true);
  });

  it('discarded is null when only 2 providers succeed (3rd provider fails)', async () => {
    const gemini = makeMockProvider('mock-gemini', [8.0]);
    const openai = makeMockProvider('mock-openai', [6.0]);
    const failing = makeFailingProvider('mock-claude');

    const svc = new TeachingRoundService(
      gemini as any,
      openai as any,
      failing as any,
      mockDb as any,
    );
    await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({ discarded: null }),
      expect.any(String),
    );
  });

  it('stops early when stagnation detected after minRounds', async () => {
    // Same score every round → stagnation after minRounds
    const gemini = makeMockProvider('mock-gemini', [8.0]);
    const openai = makeMockProvider('mock-openai', [6.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    const result = await svc.run(
      makeOptions({ minRounds: 3, maxRounds: 10, stagnationDrift: 0.1 }),
    );

    expect(result.isSuccess).toBe(true);
    // Should stop before maxRounds (10) since scores are static
    expect(result.data!.triples.length).toBeLessThan(10);
  });

  it('V9-002: chosen.model always differs from rejected.model (different providers)', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 2 }));

    expect(result.isSuccess).toBe(true);
    for (const triple of result.data!.triples) {
      expect(triple.chosen.model).not.toBe(triple.rejected.model);
    }
  });

  it('no role parameter passed to generate — provider uses its own defaultModel', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    // generate() should be called with only the prompt string, no role option
    for (const call of (gemini.generate as jest.Mock).mock.calls) {
      if (call[1]) {
        expect(call[1].role).toBeUndefined();
      }
    }
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('returns DataProcessResult.failure when all rounds produce fewer than 2 results', async () => {
    const failing1 = makeFailingProvider('mock-gemini');
    const failing2 = makeFailingProvider('mock-openai');

    const svc = new TeachingRoundService(failing1 as any, failing2 as any, null, mockDb as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 2 }));

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_ROUNDS');
  });

  it('runSelfJudgedRound: returns null when generate() fails on generation call', async () => {
    const failing = makeFailingProvider('mock-gemini');
    const openai = makeMockProvider('mock-openai', [7.0]);

    const svc = new TeachingRoundService(failing as any, openai as any, null, mockDb as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    // Only openai succeeds — only 1 result → no DPO triple (needs 2+)
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_ROUNDS');
  });

  it('DNA-3: returns DataProcessResult.failure when unexpected error thrown internally', async () => {
    const broken = {
      generate: jest.fn().mockRejectedValue(new Error('unexpected crash')),
      getModelInfo: () => ({ provider: 'mock', modelId: 'mock-broken' }),
    };

    const svc = new TeachingRoundService(broken as any, broken as any, null, mockDb as any);
    const result = await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    expect(result.isSuccess).toBe(false);
    // Both providers throw → Promise.allSettled swallows rejections → rounds produce < 2 results → NO_ROUNDS
    expect(result.errorCode).toBe('NO_ROUNDS');
  });

  // ── isStagnating ──────────────────────────────────────────────────────────

  it('isStagnating: returns false when fewer than 3 rounds', async () => {
    // Use a score sequence that would stagnate, but only 2 rounds happen
    const gemini = makeMockProvider('mock-gemini', [8.0]);
    const openai = makeMockProvider('mock-openai', [6.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    // minRounds=3 means stagnation check starts at round index 2 (0-based)
    // With maxRounds=2, we never reach that check
    const result = await svc.run(makeOptions({ minRounds: 3, maxRounds: 2 }));

    expect(result.isSuccess).toBe(true);
    expect(result.data!.triples.length).toBe(2); // all 2 rounds completed (no early stop)
  });

  it('isStagnating: returns true when drift < threshold across last 3 rounds', async () => {
    // Scores 9.0, 9.05, 9.02 → max-min = 0.05 < 0.1
    const scores = [9.0, 7.0, 9.05, 6.0, 9.02, 5.0]; // gen/judge alternating per provider
    const gemini = {
      generate: jest.fn(),
      getModelInfo: () => ({ provider: 'mock', modelId: 'mock-gemini' }),
    };
    let callIdx = 0;
    gemini.generate.mockImplementation(() => {
      const isJudge = callIdx % 2 !== 0;
      const scoreIdx = Math.floor(callIdx / 2);
      const score = scores[scoreIdx * 2] ?? 9.0;
      callIdx++;
      const text = isJudge ? JSON.stringify({ score, reasoning: 'ok' }) : 'node output';
      return Promise.resolve(
        DataProcessResult.success({
          text,
          model: 'mock-gemini',
          cost: 0.001,
          tokens_used: { input: 5, output: 10 },
        }),
      );
    });

    const openai = makeMockProvider('mock-openai', [7.0]);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    const result = await svc.run(
      makeOptions({ minRounds: 3, maxRounds: 10, stagnationDrift: 0.1 }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!.triples.length).toBeLessThanOrEqual(3); // stopped after stagnation detected
  });

  // ── GAP-A tests: depth + nodeIntent stored in DPO triple ─────────────────

  it('GAP-A: stores depth and nodeIntent in DPO triple when provided', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);
    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);

    await svc.run(
      makeOptions({ minRounds: 1, maxRounds: 1, depth: 1, nodeIntent: 'verify email' }),
    );

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({ depth: 1, nodeIntent: 'verify email' }),
      expect.any(String),
    );
  });

  it('GAP-A: defaults depth=0 and nodeIntent=stepText when not provided', async () => {
    const gemini = makeMockProvider('mock-gemini', [9.0]);
    const openai = makeMockProvider('mock-openai', [7.0]);
    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    const opts = makeOptions({ minRounds: 1, maxRounds: 1 }); // no depth or nodeIntent

    await svc.run(opts);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({ depth: 0, nodeIntent: opts.stepText }),
      expect.any(String),
    );
  });

  // ── Judging independence ──────────────────────────────────────────────────

  it('judging independence: each provider judges only its own generated output', async () => {
    // Each provider generates output X, then judges X.
    // The judge call must contain X from that provider, not Y from the other provider.
    const genOutputs: Record<string, string> = {};
    const judgePrompts: Record<string, string> = {};

    function makeCapturingProvider(modelId: string, score: number) {
      let callIdx = 0;
      return {
        generate: jest.fn().mockImplementation(async (prompt: string) => {
          callIdx++;
          const isJudge = callIdx % 2 === 0;
          if (!isJudge) {
            const text = `${modelId}-unique-gen-output-${callIdx}`;
            genOutputs[modelId] = text;
            return DataProcessResult.success({
              text,
              model: modelId,
              cost: 0.001,
              tokens_used: { input: 5, output: 10 },
            });
          }
          judgePrompts[modelId] = prompt;
          return DataProcessResult.success({
            text: JSON.stringify({ score, reasoning: 'ok' }),
            model: modelId,
            cost: 0.001,
            tokens_used: { input: 5, output: 10 },
          });
        }),
        getModelInfo: () => ({ provider: 'mock', modelId }),
      };
    }

    const gemini = makeCapturingProvider('mock-gemini', 9.0);
    const openai = makeCapturingProvider('mock-openai', 7.0);

    const svc = new TeachingRoundService(gemini as any, openai as any, null, mockDb as any);
    await svc.run(makeOptions({ minRounds: 1, maxRounds: 1 }));

    // Gemini's judge call must contain gemini's own gen output
    expect(judgePrompts['mock-gemini']).toBeDefined();
    expect(judgePrompts['mock-gemini']).toContain(genOutputs['mock-gemini']);
    // Gemini's judge prompt must NOT contain openai's gen output
    expect(judgePrompts['mock-gemini']).not.toContain(genOutputs['mock-openai']);

    // OpenAI's judge call must contain openai's own gen output
    expect(judgePrompts['mock-openai']).toBeDefined();
    expect(judgePrompts['mock-openai']).toContain(genOutputs['mock-openai']);
    // OpenAI's judge prompt must NOT contain gemini's gen output
    expect(judgePrompts['mock-openai']).not.toContain(genOutputs['mock-gemini']);
  });
});
