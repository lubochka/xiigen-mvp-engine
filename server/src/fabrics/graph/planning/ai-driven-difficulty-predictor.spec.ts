/**
 * AIDrivenDifficultyPredictor — unit tests (Phase 3)
 * 8 tests covering confidence gate, AI pipeline, budget clamping.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenDifficultyPredictor } from './ai-driven-difficulty-predictor';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';
import { RAG_SERVICE } from '../../interfaces/rag.interface';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(budget: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'ORCHESTRATION',
        fromType: 'Archetype',
        relationship: 'HISTORICAL_CYCLE_BUDGET',
        toEntity: budget,
        toType: 'BudgetValue',
        confidence,
        observationCount: 5,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

const defaultParams = {
  archetype: 'ORCHESTRATION',
  novelPatterns: [],
  hasClarityNote: false,
  isInversionCase: false,
};

describe('AIDrivenDifficultyPredictor', () => {
  let predictor: AIDrivenDifficultyPredictor;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };
  let rag: { search: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: 2,
        reasoning: 'AI predicts 2',
        confidence: 0.75,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };
    rag = { search: jest.fn().mockResolvedValue({ isSuccess: true, data: [{ id: 'p1' }] }) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenDifficultyPredictor,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
        { provide: RAG_SERVICE, useValue: rag },
      ],
    }).compile();

    predictor = module.get(AIDrivenDifficultyPredictor);
  });

  it('1. High-confidence graph edges → bootstrap path (no AI pipeline call)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('3', 0.95));

    const result = await predictor.predict(defaultParams);

    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.budget).toBe(3);
    expect(result.confidence).toBe(0.95);
  });

  it('2. Below-threshold edges → AI pipeline called', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await predictor.predict(defaultParams);

    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionType: 'BUDGET_PREDICTION',
      }),
    );
  });

  it('3. Empty graph → AI pipeline called with empty graphContext', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await predictor.predict(defaultParams);

    expect(pipeline.decide).toHaveBeenCalledWith(expect.objectContaining({ graphContext: [] }));
  });

  it('4. AI result stored via learning.addDiscoveredEdge', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await predictor.predict(defaultParams);

    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'HISTORICAL_CYCLE_BUDGET',
        toEntity: '2',
      }),
    );
  });

  it('5. Budget clamped to [1,4] even when AI returns out-of-range value', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockResolvedValueOnce({
      decision: 10,
      reasoning: 'way too high',
      confidence: 0.5,
      modelUsed: 'claude',
      alternatives: [],
    });

    const result = await predictor.predict(defaultParams);

    expect(result.budget).toBeLessThanOrEqual(4);
    expect(result.budget).toBeGreaterThanOrEqual(1);
  });

  it('6. Returns correctly typed prediction result', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await predictor.predict(defaultParams);

    expect(typeof result.budget).toBe('number');
    expect(typeof result.rationale).toBe('string');
    expect(typeof result.confidence).toBe('number');
  });

  it('7. decidingEdge: graph-path result includes graph confidence in rationale', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('2', 0.92));

    const result = await predictor.predict(defaultParams);

    expect(result.rationale).toContain('0.92');
    expect(result.rationale).toContain('Graph edge');
  });

  it('8. Works without RAG service (optional dependency)', async () => {
    const moduleNoRag = await Test.createTestingModule({
      providers: [
        AIDrivenDifficultyPredictor,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
        // RAG_SERVICE omitted
      ],
    }).compile();

    const predictorNoRag = moduleNoRag.get(AIDrivenDifficultyPredictor);
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await predictorNoRag.predict(defaultParams);

    expect(result.budget).toBe(2);
  });
});
