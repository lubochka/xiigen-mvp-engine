import 'reflect-metadata';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MetaDecisionEngine } from './meta-decision-engine.service';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { SpendGovernorService, SpendSession } from './spend-governor.service';
import { SecurityCircuitBreakerService } from './security-circuit-breaker.service';
import { ImprovementDetectorService } from './improvement-detector.service';
import { ModelFitnessService, ModelRoundResult } from './model-fitness.service';
import { RoundSummary } from './round-summary-processor.service';

const makeRoundSummary = (overrides: Partial<RoundSummary> = {}): RoundSummary => ({
  summaryId: 'sum-001',
  sessionId: 'sess-001',
  flowId: 'FLOW-35',
  roundNumber: 1,
  modelId: 'claude-3-5-sonnet',
  taskTypeId: 'T566',
  arbiterScores: [
    { arbiterId: 'arb-1', score: 82, verdict: 'PASS' },
    { arbiterId: 'arb-2', score: 85, verdict: 'PASS' },
  ],
  averageScore: 83,
  passingCount: 2,
  failingCount: 0,
  costUsd: 0.05,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const CLEAN_CODE = `
import { Injectable } from '@nestjs/common';
export class MyService { run() { return true; } }
`;

const makeDb = () => ({
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
});

const makeQueue = () => ({
  enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
});

const makeSpendGovernor = (verdict: 'CONTINUE' | 'HALT' = 'CONTINUE'): SpendGovernorService =>
  ({
    checkSpend: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        verdict,
        reason: verdict === 'HALT' ? 'Spend limit exceeded' : undefined,
      }),
    ),
    recordRoundCost: jest.fn().mockResolvedValue(DataProcessResult.success(0.05)),
  }) as unknown as SpendGovernorService;

const makeSecurityBreaker = (
  verdict: 'CONTINUE' | 'HALT' = 'CONTINUE',
): SecurityCircuitBreakerService =>
  ({
    scanBundle: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        verdict,
        violations: verdict === 'HALT' ? ['Forbidden pattern'] : [],
      }),
    ),
  }) as unknown as SecurityCircuitBreakerService;

const makeImprovementDetector = (
  signal: 'IMPROVING' | 'REGRESSING' | 'PLATEAU' = 'IMPROVING',
): ImprovementDetectorService =>
  ({
    detectImprovement: jest.fn().mockResolvedValue(DataProcessResult.success({ signal })),
  }) as unknown as ImprovementDetectorService;

const makeModelFitness = (fitnessAlert = false): ModelFitnessService =>
  ({
    computeFitness: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({ fitnessAlert, fitnessScore: fitnessAlert ? 0.3 : 0.9 }),
      ),
  }) as unknown as ModelFitnessService;

const makeSpendSessionFn = (s: RoundSummary): SpendSession => ({
  sessionId: s.sessionId,
  flowId: s.flowId,
  accumulatedCostUsd: s.costUsd,
  roundCount: s.roundNumber,
  startedAt: s.createdAt,
});

const makeEngine = (
  db: ReturnType<typeof makeDb> | IDatabaseService = makeDb(),
  queue: ReturnType<typeof makeQueue> | IQueueService = makeQueue(),
  spendVerdict: 'CONTINUE' | 'HALT' = 'CONTINUE',
  securityVerdict: 'CONTINUE' | 'HALT' = 'CONTINUE',
  improvementSignal: 'IMPROVING' | 'REGRESSING' | 'PLATEAU' = 'IMPROVING',
  fitnessAlert = false,
) => ({
  engine: new MetaDecisionEngine(
    db as unknown as IDatabaseService,
    queue as unknown as IQueueService,
    makeSpendGovernor(spendVerdict),
    makeSecurityBreaker(securityVerdict),
    makeImprovementDetector(improvementSignal),
    makeModelFitness(fitnessAlert),
    makeSpendSessionFn,
  ),
  db,
  queue,
});

describe('MetaDecisionEngine', () => {
  // ── POSITIVE ───────────────────────────────────────────────────────────────

  it('ACCEPT when all arbiters pass, high average score, no HALT', async () => {
    const { engine } = makeEngine();
    const summary = makeRoundSummary({ averageScore: 85, passingCount: 2, failingCount: 0 });
    const result = await engine.decide(summary, CLEAN_CODE, [], []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('ACCEPT');
  });

  it('CONTINUE when averageScore < 80 but no HALT or ESCALATE signals', async () => {
    const { engine } = makeEngine();
    const summary = makeRoundSummary({ averageScore: 70, passingCount: 1, failingCount: 1 });
    const result = await engine.decide(summary, CLEAN_CODE, [], []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('CONTINUE');
  });

  it('HALT when spend governor returns HALT', async () => {
    const { engine } = makeEngine(makeDb(), makeQueue(), 'HALT');
    const result = await engine.decide(makeRoundSummary(), CLEAN_CODE, [], []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('HALT');
    expect(result.data!.escalationBriefing).toBeDefined();
    expect(result.data!.escalationBriefing!.reasons).toContain('Spend limit exceeded');
  });

  it('HALT when security circuit breaker returns HALT', async () => {
    const { engine } = makeEngine(makeDb(), makeQueue(), 'CONTINUE', 'HALT');
    const elasticCode = `import { Client } from '@elastic/elasticsearch';`;
    const result = await engine.decide(makeRoundSummary(), elasticCode, [], []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('HALT');
    expect(result.data!.escalationBriefing).toBeDefined();
  });

  it('ESCALATE when improvement detector signals REGRESSING', async () => {
    const { engine } = makeEngine(makeDb(), makeQueue(), 'CONTINUE', 'CONTINUE', 'REGRESSING');
    const result = await engine.decide(makeRoundSummary({ averageScore: 70 }), CLEAN_CODE, [], []);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('ESCALATE');
    expect(result.data!.escalationBriefing!.reasons).toContain('Score trend REGRESSING');
  });

  it('ESCALATE when model fitness alert triggered', async () => {
    const { engine } = makeEngine(makeDb(), makeQueue(), 'CONTINUE', 'CONTINUE', 'IMPROVING', true);
    const result = await engine.decide(
      makeRoundSummary({ averageScore: 70 }),
      CLEAN_CODE,
      [],
      [
        {
          modelId: 'claude-3-5-sonnet',
          taskTypeId: 'T566',
          accepted: false,
          roundsToAccept: 5,
          costUsd: 0.25,
          at: new Date().toISOString(),
        },
      ],
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('ESCALATE');
  });

  it('CF-791: all 4 meta-arbiters run — spend governor + security + improvement + fitness', async () => {
    const spendSpy = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ verdict: 'CONTINUE' }));
    const securitySpy = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ verdict: 'CONTINUE', violations: [] }));
    const improveSpy = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ signal: 'IMPROVING' }));
    const fitnessSpy = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ fitnessAlert: false, fitnessScore: 0.9 }));

    const engine = new MetaDecisionEngine(
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      { checkSpend: spendSpy } as any,
      { scanBundle: securitySpy } as any,
      { detectImprovement: improveSpy } as any,
      { computeFitness: fitnessSpy } as any,
      makeSpendSessionFn,
    );

    await engine.decide(
      makeRoundSummary({ averageScore: 85, failingCount: 0 }),
      CLEAN_CODE,
      [],
      [
        {
          modelId: 'claude',
          taskTypeId: 'T566',
          accepted: true,
          roundsToAccept: 1,
          costUsd: 0.05,
          at: new Date().toISOString(),
        },
      ],
    );

    expect(spendSpy).toHaveBeenCalledTimes(1);
    expect(securitySpy).toHaveBeenCalledTimes(1);
    expect(improveSpy).toHaveBeenCalledTimes(1);
    expect(fitnessSpy).toHaveBeenCalledTimes(1);
  });

  it('DNA-8: storeDocument called before queue.enqueue', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };
    const { engine } = makeEngine(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );
    await engine.decide(
      makeRoundSummary({ averageScore: 85, failingCount: 0 }),
      CLEAN_CODE,
      [],
      [],
    );
    const storeIdx = callOrder.indexOf('store');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('CF-793: escalationBriefing includes 3 recovery options on HALT', async () => {
    const { engine } = makeEngine(
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      'HALT',
    );
    const result = await engine.decide(makeRoundSummary(), CLEAN_CODE, [], []);
    expect(result.data!.escalationBriefing!.options).toHaveLength(3);
  });

  it('arbiterVerdicts map present in result for all 4 meta-arbiters', async () => {
    const { engine } = makeEngine();
    const modelResults: ModelRoundResult[] = [
      {
        modelId: 'claude',
        taskTypeId: 'T566',
        accepted: true,
        roundsToAccept: 1,
        costUsd: 0.05,
        at: new Date().toISOString(),
      },
    ];
    const result = await engine.decide(
      makeRoundSummary({ averageScore: 85, failingCount: 0 }),
      CLEAN_CODE,
      [],
      modelResults,
    );
    const verdicts = result.data!.arbiterVerdicts;
    expect(verdicts['meta::spend-governor']).toBeDefined();
    expect(verdicts['meta::security-circuit-breaker']).toBeDefined();
    expect(verdicts['meta::improvement-detector']).toBeDefined();
    expect(verdicts['meta::model-fitness']).toBeDefined();
  });

  it('HALT takes precedence over ESCALATE when both triggered', async () => {
    const { engine } = makeEngine(
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      'HALT',
      'CONTINUE',
      'REGRESSING',
    );
    const result = await engine.decide(makeRoundSummary({ averageScore: 70 }), CLEAN_CODE, [], []);
    expect(result.data!.decision).toBe('HALT');
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('DNA-3: returns failure when storeDocument fails', async () => {
    const db = makeDb();
    db.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_FAIL', 'ES down'));
    const { engine } = makeEngine(db as unknown as IDatabaseService);
    const result = await engine.decide(
      makeRoundSummary({ averageScore: 85, failingCount: 0 }),
      CLEAN_CODE,
      [],
      [],
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAIL');
  });
});
