/**
 * T653 SuperJudgeArbiter — unit tests (8 per FLOW-46 R1 test matrix).
 */
import { SuperJudgeArbiter } from './super-judge-arbiter.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('SuperJudgeArbiter (T653)', () => {
  let mockDb: { storeDocument: jest.Mock };
  let mockAi: { generate: jest.Mock };
  let mockFreedom: { get: jest.Mock };
  let arb: SuperJudgeArbiter;

  beforeEach(() => {
    mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    mockAi = {
      generate: jest.fn(),
    };
    mockFreedom = {
      get: jest.fn().mockResolvedValue({ modelId: 'super-judge-v1' }),
    };
    arb = new SuperJudgeArbiter(mockDb as never, mockAi as never, mockFreedom as never);
  });

  it('1. CF-840 — platformPatternsMatched===0 → DEFER_TO_AF9 with cost:0 llmCalls:0', async () => {
    const result = await arb.evaluate({
      sessionId: 's-1',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [],
      platformPatternsMatched: 0,
      candidate: {},
    });
    expect(result.data!.verdict).toBe('DEFER_TO_AF9');
    expect(result.data!.cost).toBe(0);
    expect(result.data!.llmCalls).toBe(0);
    expect(mockAi.generate).not.toHaveBeenCalled();
  });

  it('2. platformPatternsMatched > 0 → LLM call fires', async () => {
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({ text: '{"verdict":"DEFER_TO_AF9","reason":"agree"}' }),
    );
    await arb.evaluate({
      sessionId: 's-2',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [{ patternId: 'p' }],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(mockAi.generate).toHaveBeenCalledTimes(1);
  });

  it('3. superJudge.model retrieved from FREEDOM config (not hardcoded)', async () => {
    mockFreedom.get.mockResolvedValueOnce({ modelId: 'gpt-x' });
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({ text: '{"verdict":"DEFER_TO_AF9","reason":"."}' }),
    );
    await arb.evaluate({
      sessionId: 's-3',
      af9Verdict: 'PASS',
      af9Reason: 'r',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(mockFreedom.get).toHaveBeenCalledWith('superJudge.model');
    expect(mockAi.generate).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ model: 'gpt-x' }));
  });

  it('4. OVERRIDE_PASS writes DPO triple to xiigen-training-data', async () => {
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({
        text: '{"verdict":"OVERRIDE_PASS","reason":"safe","discriminating_constraint":"DNA-1 satisfied"}',
      }),
    );
    await arb.evaluate({
      sessionId: 's-4',
      af9Verdict: 'BLOCK',
      af9Reason: 'too strict',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    const [index] = mockDb.storeDocument.mock.calls[0] as [string];
    expect(index).toBe('xiigen-training-data');
  });

  it('5. OVERRIDE_BLOCK writes DPO triple', async () => {
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({
        text: '{"verdict":"OVERRIDE_BLOCK","reason":"unsafe","discriminating_constraint":"violates CF-840"}',
      }),
    );
    await arb.evaluate({
      sessionId: 's-5',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('6. DEFER_TO_AF9 writes NO DPO triple', async () => {
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({ text: '{"verdict":"DEFER_TO_AF9","reason":"agree"}' }),
    );
    await arb.evaluate({
      sessionId: 's-6',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  it('7. DPO triple discriminating_constraint must be NON-EMPTY (IR-3)', async () => {
    mockAi.generate.mockResolvedValueOnce(
      DataProcessResult.success({
        text: '{"verdict":"OVERRIDE_BLOCK","reason":"r","discriminating_constraint":"   "}',
      }),
    );
    const result = await arb.evaluate({
      sessionId: 's-7',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DISCRIMINATING_CONSTRAINT');
  });

  it('8. malformed LLM response → DataProcessResult.failure', async () => {
    mockAi.generate.mockResolvedValueOnce(DataProcessResult.success({ text: 'not-json' }));
    const result = await arb.evaluate({
      sessionId: 's-8',
      af9Verdict: 'PASS',
      af9Reason: 'ok',
      platformPatterns: [{}],
      platformPatternsMatched: 1,
      candidate: {},
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MALFORMED_LLM_RESPONSE');
  });
});
