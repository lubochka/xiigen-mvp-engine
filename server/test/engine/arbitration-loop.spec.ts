import { ArbitrationLoopController } from '../../src/engine/arbitration/arbitration-loop.controller';
import { ArbiterRegistry } from '../../src/engine/arbitration/arbiter-registry';
import { ArbiterService } from '../../src/engine/arbitration/arbiter.service';
import { UnanimousVerdictAggregator } from '../../src/engine/arbitration/unanimous-aggregator';
import { FeedbackSynthesizer } from '../../src/engine/arbitration/feedback-synthesizer';
import { TrainingTraceWriter } from '../../src/engine/arbitration/training-trace-writer';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { Candidate } from '../../src/engine/arbitration/generation-round';

function mockCls(tenantId = 'test-tenant') {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

// MockAiProvider returns 'Mock AI response' (not JSON) → ArbiterService returns PARSE_FAILED
// verdicts.filter(isSuccess) = [] → allPassed = false → no winner → stalled after maxRounds
function makeController() {
  const registry = new ArbiterRegistry();
  const ai = new MockAiProvider(mockCls(), { defaultResponse: 'Mock AI response' });
  const arbiter = new ArbiterService(ai as any, ai as any);
  const aggregator = new UnanimousVerdictAggregator();
  const synthesizer = new FeedbackSynthesizer();
  const tracer = new TrainingTraceWriter(); // no DB — no-op
  return new ArbitrationLoopController(registry, arbiter, aggregator, synthesizer, tracer);
}

const CANDIDATE: Candidate = {
  model: 'mock',
  code: 'export class Svc extends MicroserviceBase {}',
  taskType: 'T569',
  generatedAt: new Date().toISOString(),
};

describe('ArbitrationLoopController', () => {
  it('runs and returns a LoopResult (accepted or stalled)', async () => {
    const controller = makeController();
    const result = await controller.run({
      taskType: 'T569',
      tenantId: 't1',
      initialPrompt: 'Generate PatternIndexerService',
      maxRounds: 2,
      candidates: async () => [CANDIDATE],
      runId: 'test-run-001',
    });

    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!.accepted).toBe('boolean');
    expect(result.data!.roundsCompleted).toBeGreaterThanOrEqual(1);
    expect(result.data!.finalRound).toBeDefined();
  });

  it('marks stalled=true when maxRounds exceeded without winner', async () => {
    const controller = makeController();
    const result = await controller.run({
      taskType: 'T569',
      tenantId: 't1',
      initialPrompt: 'Generate',
      maxRounds: 2,
      candidates: async () => [
        {
          model: 'bad',
          code: 'throw new Error()',
          taskType: 'T569',
          generatedAt: new Date().toISOString(),
        },
      ],
      runId: 'test-run-002',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.roundsCompleted).toBe(2);
    expect(result.data!.stalled).toBe(true);
  });

  it('FeedbackSynthesizer builds improved prompt containing arbiter notes', () => {
    const synthesizer = new FeedbackSynthesizer();
    const result = synthesizer.synthesize({
      originalSpec: {},
      bestCandidateCode: 'class Foo {}',
      bestCandidateModel: 'mock',
      roundNumber: 1,
      arbiterNotes: ['[dna] Score: 55/100', '  → DataProcessResult not used'],
      previousGenesisPrompt: 'Generate PatternIndexer',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toContain('DataProcessResult not used');
    expect(result.data!).toContain('Round 1');
  });

  it('FeedbackSynthesizer fails with NO_NOTES when notes array is empty', () => {
    const synthesizer = new FeedbackSynthesizer();
    const result = synthesizer.synthesize({
      originalSpec: {},
      bestCandidateCode: 'class Foo {}',
      bestCandidateModel: 'mock',
      roundNumber: 1,
      arbiterNotes: [],
      previousGenesisPrompt: 'Generate',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_NOTES');
  });

  it('TrainingTraceWriter returns success without DB (no-op)', async () => {
    const tracer = new TrainingTraceWriter();
    const { buildRound } = await import('../../src/engine/arbitration/generation-round');
    const round = buildRound(1, 'T569', 't1', [
      {
        candidate: CANDIDATE,
        verdicts: [],
      },
    ]);
    const result = await tracer.write({ round, prompt: 'test prompt' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!).toMatch(/^trace-/);
  });
});
