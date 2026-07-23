/**
 * AIDrivenArbiterPanelHandler — unit tests (Phase 3)
 * 8 tests covering confidence gate, AI pipeline, key_principles invariant.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenArbiterPanelHandler } from './ai-driven-arbiter-panel.handler';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'ORCHESTRATION',
        fromType: 'Archetype',
        relationship: 'REQUIRES_MINIMUM_ARBITER',
        toEntity,
        toType: 'ArbiterRole',
        confidence,
        observationCount: 3,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

describe('AIDrivenArbiterPanelHandler', () => {
  let handler: AIDrivenArbiterPanelHandler;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  const defaultParams = {
    archetype: 'ORCHESTRATION',
    context: {
      crossFlowEvents: false,
      newAlgorithmicPattern: false,
      isFirstOfArchetype: false,
      runId: 'r1',
    },
  };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: ['iron_rules', 'completeness'],
        reasoning: 'AI assembled',
        confidence: 0.8,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenArbiterPanelHandler,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    handler = module.get(AIDrivenArbiterPanelHandler);
  });

  it('1. High-confidence graph edges → bootstrap path (no AI pipeline call)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('iron_rules', 0.95));

    const result = await handler.assemblePanel(defaultParams);

    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.source).toBe('bootstrap-graph-query');
    expect(result.arbiters).toContain('iron_rules');
  });

  it('2. Below-threshold edges → AI pipeline called', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('iron_rules', 0.5)); // below threshold

    const result = await handler.assemblePanel(defaultParams);

    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionType: 'PANEL_ASSEMBLY',
      }),
    );
    expect(result.source).toBe('ai-pipeline');
  });

  it('3. Empty graph → AI pipeline called with empty graphContext', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await handler.assemblePanel(defaultParams);

    expect(pipeline.decide).toHaveBeenCalledWith(expect.objectContaining({ graphContext: [] }));
  });

  it('4. AI result stored via learning.addDiscoveredEdge', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await handler.assemblePanel(defaultParams);

    expect(learning.addDiscoveredEdge).toHaveBeenCalled();
    const call = learning.addDiscoveredEdge.mock.calls[0][0];
    expect(call.relationship).toBe('REQUIRES_MINIMUM_ARBITER');
    expect(call.discoveredBy).toBe('r1');
  });

  it('5. key_principles always in panel regardless of AI result', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockResolvedValueOnce({
      decision: ['iron_rules'],
      reasoning: 'test',
      confidence: 0.7,
      modelUsed: 'claude',
      alternatives: [],
    });

    const result = await handler.assemblePanel(defaultParams);

    expect(result.arbiters).toContain('key_principles');
  });

  it('6. Returns correctly typed ArbiterPanel', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await handler.assemblePanel(defaultParams);

    expect(Array.isArray(result.arbiters)).toBe(true);
    expect(result.source).toBe('ai-pipeline');
    expect(typeof result.reasoning).toBe('string');
  });

  it('7. decidingEdge: graph-path result includes source=bootstrap-graph-query', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('security', 0.95));

    const result = await handler.assemblePanel(defaultParams);

    expect(result.source).toBe('bootstrap-graph-query');
    expect(result.arbiters).toContain('security');
    expect(result.arbiters).toContain('key_principles');
  });

  it('8. AI pipeline error propagates to caller', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockRejectedValueOnce(new Error('AI_PIPELINE_ALL_BLOCKED'));

    await expect(handler.assemblePanel(defaultParams)).rejects.toThrow();
  });
});
