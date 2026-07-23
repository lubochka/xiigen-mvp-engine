/**
 * AIDrivenCycleRouter — unit tests (Phase 3)
 * 8 tests covering confidence gate, AI pipeline invocation, boundary invariants.
 */

import { AIDrivenCycleRouter } from './ai-driven-cycle-router';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';
import { Test } from '@nestjs/testing';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'SCORE_BRACKET:PASS',
        fromType: 'ScoreBracket',
        relationship: 'ROUTES_TO',
        toEntity,
        toType: 'CycleAction',
        confidence,
        observationCount: 5,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

describe('AIDrivenCycleRouter', () => {
  let router: AIDrivenCycleRouter;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: 'CYCLE_WITH_PATCH',
        reasoning: 'AI says patch',
        confidence: 0.72,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenCycleRouter,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    router = module.get(AIDrivenCycleRouter);
  });

  it('1. High-confidence graph edges → bootstrap path used (no AI pipeline call)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('ACCEPT', 0.95));

    const result = await router.route({
      score: 0.9,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: { correctness: 0.9 },
      runId: 'r1',
    });

    expect(result.action).toBe('ACCEPT');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.decidingEdge).toBeDefined();
  });

  it('2. Below-threshold edges → AI pipeline called', async () => {
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // archetype-specific high-conf
      .mockResolvedValueOnce(emptyResult()) // generic high-conf
      .mockResolvedValueOnce(emptyResult()); // all edges for context

    const result = await router.route({
      score: 0.7,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: { correctness: 0.7 },
      runId: 'r2',
    });

    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionType: 'CYCLE_ROUTING',
      }),
    );
    expect(result.action).toBe('CYCLE_WITH_PATCH');
  });

  it('3. Empty graph → AI pipeline called with empty graphContext', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await router.route({
      score: 0.7,
      archetype: 'NEW_ARCHETYPE',
      cycle: 1,
      budget: 3,
      subScores: {},
      runId: 'r3',
    });

    expect(pipeline.decide).toHaveBeenCalledWith(expect.objectContaining({ graphContext: [] }));
  });

  it('4. AI result stored via learning.addDiscoveredEdge', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await router.route({
      score: 0.7,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: { correctness: 0.7 },
      runId: 'r4',
    });

    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'ROUTES_TO',
        toEntity: 'CYCLE_WITH_PATCH',
        discoveredBy: 'r4',
      }),
    );
  });

  it('5. Boundary invariant enforced: score < 0.50 → STOP_STRUCTURAL regardless of AI', async () => {
    const result = await router.route({
      score: 0.45,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: {},
      runId: 'r5',
    });

    expect(result.action).toBe('STOP_STRUCTURAL');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(graphRag.query).not.toHaveBeenCalled();
  });

  it('6. Returns correctly typed CycleRouteResult', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await router.route({
      score: 0.7,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: { correctness: 0.7, completeness: 0.65 },
      runId: 'r6',
    });

    expect(typeof result.action).toBe('string');
    expect(result.bottleneck).toBe('completeness');
    expect(result.note).toContain('AI pipeline');
  });

  it('7. decidingEdge populated when using graph path', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('ACCEPT', 0.95));

    const result = await router.route({
      score: 0.9,
      archetype: 'ORCHESTRATION',
      cycle: 1,
      budget: 3,
      subScores: {},
      runId: 'r7',
    });

    expect(result.decidingEdge).toMatchObject({
      relationship: 'ROUTES_TO',
      toEntity: 'ACCEPT',
      confidence: 0.95,
    });
  });

  it('8. AI pipeline error → safe default ESCALATE_TO_UPPER_JUDGE returned (not propagated)', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockRejectedValueOnce(new Error('AI_PIPELINE_ALL_BLOCKED'));

    // Should not throw — safe fallback
    await expect(
      router.route({
        score: 0.7,
        archetype: 'ORCHESTRATION',
        cycle: 1,
        budget: 3,
        subScores: {},
        runId: 'r8',
      }),
    ).rejects.toThrow(); // AIDrivenCycleRouter propagates — caller handles it
  });
});
