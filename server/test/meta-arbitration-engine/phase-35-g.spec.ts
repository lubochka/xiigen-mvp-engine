/**
 * FLOW-35 Phase G — End-to-End simulation
 *
 * Full meta-arbitration simulation: ArbitersComplete → T565 → T566 → RoundDecision
 * All 5 meta-arbiters evaluated. HALT/ESCALATE paths produce EscalationBriefing.
 * DPO triple export on ACCEPT.
 */

import {
  RoundSummaryProcessor,
  ArbiterScore,
} from '../../src/engine/flows/generation-loop/round-summary-processor.service';
import { MetaDecisionEngine } from '../../src/engine/flows/generation-loop/meta-decision-engine.service';
import { SpendGovernorService } from '../../src/engine/flows/generation-loop/spend-governor.service';
import { SecurityCircuitBreakerService } from '../../src/engine/flows/generation-loop/security-circuit-breaker.service';
import { ImprovementDetectorService } from '../../src/engine/flows/generation-loop/improvement-detector.service';
import { ModelFitnessService } from '../../src/engine/flows/generation-loop/model-fitness.service';
import { DecisionLogService } from '../../src/engine/testing/decision-log.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(docs: any[] = []) {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, _id?: string) => {
      stored.push({ _i, doc });
      return DataProcessResult.success(doc);
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success(docs)),
    updateDocument: jest.fn(async (_i: string, _id: string, upd: any) =>
      DataProcessResult.success(upd),
    ),
    _stored: stored,
  } as any;
}
function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (e: string, d: any) => {
      events.push({ e, d });
      return DataProcessResult.success('ok');
    }),
    _events: events,
  } as any;
}
function makeConfig(val: any) {
  return { getConfig: jest.fn(async () => DataProcessResult.success(val)) } as any;
}

function buildFullPipeline(db = makeDb(), queue = makeQueue()) {
  const processor = new RoundSummaryProcessor(db, queue);
  const spend = new SpendGovernorService(db, makeConfig(100));
  const security = new SecurityCircuitBreakerService(db, makeConfig([]));
  const improvement = new ImprovementDetectorService(makeConfig(3));
  const fitness = new ModelFitnessService(db, makeConfig(10));
  const engine = new MetaDecisionEngine(db, queue, spend, security, improvement, fitness, (s) => ({
    sessionId: s.sessionId,
    flowId: s.flowId,
    accumulatedCostUsd: s.costUsd,
    roundCount: s.roundNumber,
    startedAt: s.createdAt,
  }));
  const log = new DecisionLogService(db);
  return { processor, engine, log, db, queue };
}

const GOOD_SCORES: ArbiterScore[] = Array.from({ length: 5 }, (_, i) => ({
  arbiterId: `arb-${i}`,
  score: 90,
  verdict: 'PASS' as const,
}));
const CLEAN_CODE = 'const x = computeResult(db, tenant);';
const GOOD_MODEL_RESULT = [
  {
    modelId: 'claude-sonnet',
    taskTypeId: 'T47',
    accepted: true,
    roundsToAccept: 1,
    costUsd: 0.05,
    at: '',
  },
];

describe('FLOW-35 Phase G — End-to-End', () => {
  it('F35G-1: full pipeline ACCEPT path produces RoundSummary then RoundDecision', async () => {
    const { processor, engine } = buildFullPipeline();
    const summaryResult = await processor.processRound(
      'sess-G1',
      1,
      'FLOW-01',
      'claude-sonnet',
      'T47',
      GOOD_SCORES,
      0.1,
    );
    expect(summaryResult.isSuccess).toBe(true);
    const summary = summaryResult.data!;
    const decisionResult = await engine.decide(summary, CLEAN_CODE, [], GOOD_MODEL_RESULT);
    expect(decisionResult.isSuccess).toBe(true);
    expect(decisionResult.data?.decision).toBe('ACCEPT');
  });

  it('F35G-2: ACCEPT path emits meta.decision.accept event', async () => {
    const { processor, engine, queue } = buildFullPipeline(makeDb(), makeQueue());
    const summaryResult = await processor.processRound(
      'sess-G2',
      1,
      'FLOW-01',
      'claude-sonnet',
      'T47',
      GOOD_SCORES,
      0.1,
    );
    await engine.decide(summaryResult.data!, CLEAN_CODE, [], GOOD_MODEL_RESULT);
    const emitted = queue.enqueue.mock.calls.map((c: any[]) => c[0]);
    expect(emitted).toContain('meta.decision.accept');
  });

  it('F35G-3: decision logged via DecisionLogService after engine decides', async () => {
    const db = makeDb();
    const { processor, engine, log } = buildFullPipeline(db);
    const summaryResult = await processor.processRound(
      'sess-G3',
      1,
      'FLOW-01',
      'claude-sonnet',
      'T47',
      GOOD_SCORES,
      0.05,
    );
    const decisionResult = await engine.decide(
      summaryResult.data!,
      CLEAN_CODE,
      [],
      GOOD_MODEL_RESULT,
    );
    await log.appendDecision(decisionResult.data!);
    expect(log.getCount()).toBe(1);
    expect(log.getLog()[0].decision).toBe('ACCEPT');
  });

  it('F35G-4: HALT path stores EscalationBriefing (CF-793)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const processor = new RoundSummaryProcessor(db, queue);
    const spend = new SpendGovernorService(db, makeConfig(0.001)); // tiny limit → HALT
    const security = new SecurityCircuitBreakerService(db, makeConfig([]));
    const improvement = new ImprovementDetectorService(makeConfig(3));
    const fitness = new ModelFitnessService(db, makeConfig(10));
    const engine = new MetaDecisionEngine(
      db,
      queue,
      spend,
      security,
      improvement,
      fitness,
      (s) => ({
        sessionId: s.sessionId,
        flowId: s.flowId,
        accumulatedCostUsd: 1.0,
        roundCount: 1,
        startedAt: s.createdAt,
      }),
    );

    const summaryResult = await processor.processRound(
      'sess-G4',
      1,
      'FLOW-01',
      'claude-sonnet',
      'T47',
      GOOD_SCORES,
      1.0,
    );
    const decisionResult = await engine.decide(
      summaryResult.data!,
      CLEAN_CODE,
      [],
      GOOD_MODEL_RESULT,
    );
    expect(decisionResult.data?.decision).toBe('HALT');
    expect(decisionResult.data?.escalationBriefing).toBeDefined();

    const storeArgs = db.storeDocument.mock.calls.map((c: any[]) => c[0]);
    expect(storeArgs).toContain('escalation-briefings');
  });

  it('F35G-5: HALT emits meta.decision.halt event', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const processor = new RoundSummaryProcessor(db, queue);
    const spend = new SpendGovernorService(db, makeConfig(0.001));
    const security = new SecurityCircuitBreakerService(db, makeConfig([]));
    const improvement = new ImprovementDetectorService(makeConfig(3));
    const fitness = new ModelFitnessService(db, makeConfig(10));
    const engine = new MetaDecisionEngine(
      db,
      queue,
      spend,
      security,
      improvement,
      fitness,
      (s) => ({ ...s, accumulatedCostUsd: 1.0, roundCount: 1, startedAt: s.createdAt }),
    );

    const summaryResult = await processor.processRound(
      'sess-G5',
      1,
      'FLOW-01',
      'm',
      'T47',
      GOOD_SCORES,
      1.0,
    );
    await engine.decide(summaryResult.data!, CLEAN_CODE, [], []);
    const emitted = queue.enqueue.mock.calls.map((c: any[]) => c[0]);
    expect(emitted).toContain('meta.decision.halt');
  });

  it('F35G-6: security violation path emits meta.decision.halt', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const processor = new RoundSummaryProcessor(db, queue);
    const spend = new SpendGovernorService(db, makeConfig(100));
    const security = new SecurityCircuitBreakerService(db, makeConfig([]));
    const improvement = new ImprovementDetectorService(makeConfig(3));
    const fitness = new ModelFitnessService(db, makeConfig(10));
    const engine = new MetaDecisionEngine(
      db,
      queue,
      spend,
      security,
      improvement,
      fitness,
      (s) => ({
        sessionId: s.sessionId,
        flowId: s.flowId,
        accumulatedCostUsd: s.costUsd,
        roundCount: 1,
        startedAt: s.createdAt,
      }),
    );

    const badCode = `import { Client } from '@elastic/elasticsearch'`;
    const summaryResult = await processor.processRound(
      'sess-G6',
      1,
      'FLOW-01',
      'm',
      'T47',
      GOOD_SCORES,
      0.1,
    );
    const decisionResult = await engine.decide(summaryResult.data!, badCode, [], []);
    expect(decisionResult.data?.decision).toBe('HALT');
    const emitted = queue.enqueue.mock.calls.map((c: any[]) => c[0]);
    expect(emitted).toContain('meta.decision.halt');
  });

  it('F35G-7: multi-round session accumulates log correctly', async () => {
    const db = makeDb();
    const { processor, engine, log } = buildFullPipeline(db);
    for (let i = 1; i <= 3; i++) {
      const s = await processor.processRound(
        'sess-G7',
        i,
        'FLOW-01',
        'claude-sonnet',
        'T47',
        GOOD_SCORES,
        0.1,
      );
      const d = await engine.decide(s.data!, CLEAN_CODE, [], GOOD_MODEL_RESULT);
      await log.appendDecision(d.data!);
    }
    expect(log.getCount()).toBe(3);
  });

  it('F35G-8: round-summaries and round-decisions stored in correct indices', async () => {
    const db = makeDb();
    const { processor, engine } = buildFullPipeline(db);
    const s = await processor.processRound('sess-G8', 1, 'FLOW-01', 'm', 'T47', GOOD_SCORES, 0.1);
    await engine.decide(s.data!, CLEAN_CODE, [], GOOD_MODEL_RESULT);
    const indices = db.storeDocument.mock.calls.map((c: any[]) => c[0]);
    expect(indices).toContain('round-summaries');
    expect(indices).toContain('round-decisions');
  });

  it('F35G-9: tenant isolation — session IDs scoped per session, not shared', async () => {
    const { processor } = buildFullPipeline();
    const r1 = await processor.processRound(
      'sess-tenant-A',
      1,
      'FLOW-01',
      'm',
      'T47',
      GOOD_SCORES,
      0.1,
    );
    const r2 = await processor.processRound(
      'sess-tenant-B',
      1,
      'FLOW-01',
      'm',
      'T47',
      GOOD_SCORES,
      0.1,
    );
    expect(r1.data?.sessionId).not.toBe(r2.data?.sessionId);
  });

  it('F35G-10: summaryId unique across sessions and rounds', async () => {
    const { processor } = buildFullPipeline();
    const r1 = await processor.processRound('sess-A', 1, 'FLOW-01', 'm', 'T47', GOOD_SCORES, 0);
    const r2 = await processor.processRound('sess-A', 2, 'FLOW-01', 'm', 'T47', GOOD_SCORES, 0);
    const r3 = await processor.processRound('sess-B', 1, 'FLOW-01', 'm', 'T47', GOOD_SCORES, 0);
    expect(r1.data?.summaryId).not.toBe(r2.data?.summaryId);
    expect(r1.data?.summaryId).not.toBe(r3.data?.summaryId);
  });

  it('F35G-11: DPO export path — ACCEPT decision includes all required fields', async () => {
    const { processor, engine } = buildFullPipeline();
    const s = await processor.processRound(
      'sess-G11',
      1,
      'FLOW-01',
      'claude-sonnet',
      'T47',
      GOOD_SCORES,
      0.05,
    );
    const d = await engine.decide(s.data!, CLEAN_CODE, [], GOOD_MODEL_RESULT);
    expect(d.data?.decision).toBe('ACCEPT');
    expect(d.data?.decisionId).toBeTruthy();
    expect(d.data?.sessionId).toBe('sess-G11');
    expect(d.data?.arbiterVerdicts).toBeDefined();
  });

  it('F35G-12: EscalationBriefing has 3 CASE options (CF-793)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const spend = new SpendGovernorService(db, makeConfig(0.001));
    const security = new SecurityCircuitBreakerService(db, makeConfig([]));
    const improvement = new ImprovementDetectorService(makeConfig(3));
    const fitness = new ModelFitnessService(db, makeConfig(10));
    const engine = new MetaDecisionEngine(
      db,
      queue,
      spend,
      security,
      improvement,
      fitness,
      (_) => ({
        sessionId: 'sess',
        flowId: 'FLOW-01',
        accumulatedCostUsd: 5.0,
        roundCount: 1,
        startedAt: '',
      }),
    );
    const proc = new RoundSummaryProcessor(db, queue);
    const s = await proc.processRound('sess', 1, 'FLOW-01', 'm', 'T47', GOOD_SCORES, 5.0);
    const d = await engine.decide(s.data!, CLEAN_CODE, [], []);
    expect(d.data?.decision).toBe('HALT');
    expect(d.data?.escalationBriefing?.options).toHaveLength(3);
    expect(d.data?.escalationBriefing?.options[0]).toContain('CASE A');
    expect(d.data?.escalationBriefing?.options[1]).toContain('CASE B');
    expect(d.data?.escalationBriefing?.options[2]).toContain('CASE C');
  });
});
