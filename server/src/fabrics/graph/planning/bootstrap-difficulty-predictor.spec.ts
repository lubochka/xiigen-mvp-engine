/**
 * BootstrapDifficultyPredictor — unit tests (Phase 2)
 * 8 tests covering budget formula, RAG first-occurrence penalty, confidence levels.
 */

import { Test } from '@nestjs/testing';
import { BootstrapDifficultyPredictor } from './bootstrap-difficulty-predictor';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { RAG_SERVICE } from '../../interfaces/rag.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { ES_INDEX } from '../../../kernel/es-index-constants';

function emptyGraphResult() {
  return { edges: [], formatted: () => '' };
}
function graphResultWith(count: number) {
  return { edges: Array.from({ length: count }, () => ({})), formatted: () => '' };
}

function makeRagMock(hasResults = false) {
  return {
    search: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success(hasResults ? [{ id: 'r1' }] : [])),
    ingest: jest.fn(),
    buildContextPack: jest.fn(),
    deleteByFilter: jest.fn(),
  };
}

const baseParams = {
  archetype: 'ORCHESTRATION',
  novelPatterns: [],
  hasClarityNote: false,
  isInversionCase: false,
};

describe('BootstrapDifficultyPredictor', () => {
  let predictor: BootstrapDifficultyPredictor;
  let graphRag: { query: jest.Mock };
  let rag: ReturnType<typeof makeRagMock>;

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyGraphResult()) };
    rag = makeRagMock(false); // by default, no RAG results → first occurrence

    const module = await Test.createTestingModule({
      providers: [
        BootstrapDifficultyPredictor,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: RAG_SERVICE, useValue: rag },
      ],
    }).compile();

    predictor = module.get(BootstrapDifficultyPredictor);
  });

  it('should return budget=2 for new archetype with no novelty (first-occurrence penalty)', async () => {
    // base(1) + first_occurrence(1) + novelty(0) - clarity(0) + inversion(0) = 2
    const result = await predictor.predict(baseParams);
    expect(result.budget).toBe(2);
  });

  it('should return budget=1 for known archetype with clarity note', async () => {
    // Simulate RAG has results → firstOccurrencePenalty = 0
    rag.search.mockResolvedValueOnce(DataProcessResult.success([{ id: 'existing' }]));
    // base(1) + first_occurrence(0) + novelty(0) - clarity(1) + inversion(0) = 0 → clamped to 1
    const result = await predictor.predict({ ...baseParams, hasClarityNote: true });
    expect(result.budget).toBe(1);
  });

  it('should add 0.5 per novel pattern', async () => {
    // base(1) + first_occurrence(1) + novelty(1.0) = 3 → budget=3
    const result = await predictor.predict({ ...baseParams, novelPatterns: ['p1', 'p2'] });
    expect(result.budget).toBe(3);
  });

  it('should add 1 for inversion case', async () => {
    // base(1) + first_occurrence(1) + inversion(1) = 3
    const result = await predictor.predict({ ...baseParams, isInversionCase: true });
    expect(result.budget).toBe(3);
  });

  it('should clamp budget to max 4', async () => {
    // base(1) + first_occurrence(1) + novelty(3.0) + inversion(1) = 6 → clamped to 4
    const result = await predictor.predict({
      archetype: 'ORCHESTRATION',
      novelPatterns: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
      hasClarityNote: false,
      isInversionCase: true,
    });
    expect(result.budget).toBe(4);
  });

  it('should return confidence 0.80 when historical graph data has > 5 edges', async () => {
    graphRag.query.mockResolvedValueOnce(graphResultWith(6));
    const result = await predictor.predict(baseParams);
    expect(result.confidence).toBe(0.8);
  });

  it('should return confidence 0.45 for first occurrence (no historical data)', async () => {
    const result = await predictor.predict(baseParams);
    expect(result.confidence).toBe(0.45);
  });

  it('should call IRagService.search (not AI engine) for first-occurrence check', async () => {
    await predictor.predict(baseParams);
    expect(rag.search).toHaveBeenCalledWith(
      'ORCHESTRATION',
      expect.objectContaining({
        namespace: ES_INDEX.RAG_PATTERNS,
      }),
    );
  });
});
