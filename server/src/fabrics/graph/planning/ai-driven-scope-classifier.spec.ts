/**
 * AIDrivenScopeClassifier — unit tests (Phase 4)
 * 6 tests covering graph path, AI path, effort mapping.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenScopeClassifier } from './ai-driven-scope-classifier';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
const baseParams = {
  gapType: 'MISSING_SERVICE',
  serviceCategory: 'core',
  description: 'need new service',
};

describe('AIDrivenScopeClassifier', () => {
  let classifier: AIDrivenScopeClassifier;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: 'EXTENSION',
        reasoning: 'needs extension',
        confidence: 0.8,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenScopeClassifier,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    classifier = module.get(AIDrivenScopeClassifier);
  });

  it('1. Graph path: high-confidence edge → no AI call', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'PREREQ_GAP_TYPE:MISSING_SERVICE',
          relationship: 'RESOLVES_VIA',
          toEntity: 'NEW_FLOW',
          confidence: 0.95,
          observationCount: 3,
          fromType: 'GapType',
          toType: 'ScopeLevel',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await classifier.classify(baseParams);
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.level).toBe('NEW_FLOW');
  });

  it('2. AI path: no graph data → pipeline called', async () => {
    const result = await classifier.classify(baseParams);
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decisionType: 'SCOPE_CLASSIFICATION' }),
    );
    expect(result.level).toBe('EXTENSION');
  });

  it('3. AI result stored via learning.addDiscoveredEdge', async () => {
    await classifier.classify(baseParams);
    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'RESOLVES_VIA',
      }),
    );
  });

  it('4. Graph path: returns effort string for level', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'PREREQ_GAP_TYPE:X',
          relationship: 'RESOLVES_VIA',
          toEntity: 'CONVENTION',
          confidence: 0.95,
          observationCount: 2,
          fromType: 'GapType',
          toType: 'ScopeLevel',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await classifier.classify(baseParams);
    expect(result.estimatedEffort).toBe('< 1 day');
  });

  it('5. AI result: effort returned for AI-chosen level', async () => {
    const result = await classifier.classify(baseParams);
    expect(result.estimatedEffort).toBe('2-5 days');
  });

  it('6. AI path: rationale mentions AI pipeline', async () => {
    const result = await classifier.classify(baseParams);
    expect(result.rationale).toContain('AI pipeline');
  });
});
