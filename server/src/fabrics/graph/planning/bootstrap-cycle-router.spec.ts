/**
 * BootstrapCycleRouter — unit tests (Phase 2)
 * 8 tests covering boundary invariants + graph path + SK-462 defaults.
 */

import { Test } from '@nestjs/testing';
import { BootstrapCycleRouter } from './bootstrap-cycle-router';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95, fromEntity = 'SCORE_BRACKET:DETAIL_GAP') {
  return {
    edges: [
      {
        fromEntity,
        relationship: 'ROUTES_TO',
        toEntity,
        confidence,
        observationCount: 1,
        immutable: false,
        source: 'seeded',
        reasoning: '',
        fromType: '',
        toType: '',
        lastUpdated: '',
      },
    ],
    formatted: () => '',
  };
}

describe('BootstrapCycleRouter', () => {
  let router: BootstrapCycleRouter;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

  const baseParams = {
    archetype: 'ORCHESTRATION',
    cycle: 1,
    budget: 3,
    subScores: { intent: 0.7, detail: 0.6 },
    runId: 'r1',
  };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapCycleRouter,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    router = module.get(BootstrapCycleRouter);
  });

  it('should return STOP_STRUCTURAL for score < 0.50 (boundary invariant)', async () => {
    const result = await router.route({ ...baseParams, score: 0.45 });
    expect(result.action).toBe('STOP_STRUCTURAL');
    expect(result.decidingEdge?.confidence).toBe(1.0);
  });

  it('should return ESCALATE_TO_UPPER_JUDGE when cycle >= budget (boundary invariant)', async () => {
    const result = await router.route({ ...baseParams, score: 0.7, cycle: 3, budget: 3 });
    expect(result.action).toBe('ESCALATE_TO_UPPER_JUDGE');
  });

  it('should use archetype-specific graph answer when available', async () => {
    graphRag.query.mockResolvedValueOnce(
      edgeResult('ACCEPT', 0.95, 'ORCHESTRATION:SCORE_BRACKET:DETAIL_GAP'),
    );
    const result = await router.route({ ...baseParams, score: 0.7 });
    expect(result.action).toBe('ACCEPT');
    expect(result.decidingEdge).toBeDefined();
  });

  it('should fall back to generic bracket when archetype-specific has no edges', async () => {
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // archetype-specific
      .mockResolvedValueOnce(edgeResult('CYCLE_WITH_PATCH')); // generic bracket
    const result = await router.route({ ...baseParams, score: 0.7 });
    expect(result.action).toBe('CYCLE_WITH_PATCH');
  });

  it('should return ACCEPT for score >= 0.85 (bootstrap default)', async () => {
    const result = await router.route({ ...baseParams, score: 0.9 });
    expect(result.action).toBe('ACCEPT');
  });

  it('should return CYCLE_WITH_PATCH for score in 0.65–0.85 range (bootstrap default)', async () => {
    const result = await router.route({ ...baseParams, score: 0.7 });
    expect(result.action).toBe('CYCLE_WITH_PATCH');
    expect(result.patchClass).toBe('DETAIL_GAP');
  });

  it('should read confidence threshold from config', async () => {
    await router.route({ ...baseParams, score: 0.7 });
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should include bottleneck (lowest sub-score) in result', async () => {
    const result = await router.route({
      ...baseParams,
      score: 0.7,
      subScores: { intent: 0.8, detail: 0.55 },
    });
    expect(result.bottleneck).toBe('detail'); // 0.55 is lowest
  });
});
