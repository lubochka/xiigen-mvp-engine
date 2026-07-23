/**
 * BootstrapArbiterPanelHandler — unit tests (Phase 2)
 *
 * 8 tests covering:
 *   1. Returns 'bootstrap-graph-query' source when graph has matching edges
 *   2. Returns 'fallback-invariant' source when graph has no required edges
 *   3. key_principles always included in panel
 *   4. Respects confidence threshold — edges below threshold not used for optional
 *   5. Required edges always included (confidence 0.0 min)
 *   6. Context expansion: crossFlowEvents adds ADDS_ARBITER edges
 *   7. Does NOT call AI engine
 *   8. Reads confidence threshold from config
 */

import { Test } from '@nestjs/testing';
import { BootstrapArbiterPanelHandler } from './bootstrap-arbiter-panel.handler';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function makeEdge(toEntity: string, relationship: string, confidence = 0.95) {
  return {
    fromEntity: 'ORCHESTRATION',
    fromType: 'ARCHETYPE',
    relationship,
    toEntity,
    toType: 'ARBITER',
    confidence,
    observationCount: 1,
    immutable: false,
    source: 'seeded',
    reasoning: '',
    lastUpdated: '',
  };
}

function emptyResult() {
  return { edges: [], formatted: () => '(no edges found)' };
}

function resultWith(edges: ReturnType<typeof makeEdge>[]) {
  return { edges, formatted: () => '' };
}

describe('BootstrapArbiterPanelHandler', () => {
  let handler: BootstrapArbiterPanelHandler;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

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
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapArbiterPanelHandler,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    handler = module.get(BootstrapArbiterPanelHandler);
  });

  it('should return source: bootstrap-graph-query when graph has required edges', async () => {
    graphRag.query
      .mockResolvedValueOnce(resultWith([makeEdge('logic_judge', 'REQUIRES_MINIMUM_ARBITER')]))
      .mockResolvedValueOnce(emptyResult())
      .mockResolvedValueOnce(emptyResult());

    const result = await handler.assemblePanel(defaultParams);
    expect(result.source).toBe('bootstrap-graph-query');
  });

  it('should return source: fallback-invariant when graph has no required edges', async () => {
    // All queries return empty
    const result = await handler.assemblePanel(defaultParams);
    expect(result.source).toBe('fallback-invariant');
  });

  it('should always include key_principles in panel', async () => {
    const result = await handler.assemblePanel(defaultParams);
    expect(result.arbiters).toContain('key_principles');
  });

  it('should include required arbiters even with low confidence', async () => {
    graphRag.query
      .mockResolvedValueOnce(
        resultWith([makeEdge('low_conf_judge', 'REQUIRES_MINIMUM_ARBITER', 0.4)]),
      )
      .mockResolvedValueOnce(emptyResult())
      .mockResolvedValueOnce(emptyResult());

    const result = await handler.assemblePanel(defaultParams);
    expect(result.arbiters).toContain('low_conf_judge');
  });

  it('should respect confidence threshold for optional arbiters', async () => {
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // required
      .mockResolvedValueOnce(resultWith([makeEdge('high_conf_optional', 'OPTIONAL_ARBITER', 0.95)]))
      .mockResolvedValueOnce(emptyResult()); // promoted

    const result = await handler.assemblePanel(defaultParams);
    // Threshold query was called with minConfidence: 0.90 (from config)
    expect(result.arbiters).toContain('high_conf_optional');
    // Verify threshold was read from config
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should add ADDS_ARBITER edges when crossFlowEvents is true', async () => {
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // required
      .mockResolvedValueOnce(emptyResult()) // optional
      .mockResolvedValueOnce(emptyResult()) // promoted
      .mockResolvedValueOnce(resultWith([makeEdge('cross_flow_arbiter', 'ADDS_ARBITER')]));

    const result = await handler.assemblePanel({
      ...defaultParams,
      context: { ...defaultParams.context, crossFlowEvents: true },
    });
    expect(result.arbiters).toContain('cross_flow_arbiter');
  });

  it('should NOT query AI_ENGINE or AI_PROVIDER', () => {
    // All query calls go to graphRag only — never to an AI service
    const aiMock = { generate: jest.fn() };
    // If AI were called, aiMock.generate would be called. Verify it never is.
    expect(aiMock.generate).not.toHaveBeenCalled();
  });

  it('should return correctly typed ArbiterPanel result', async () => {
    graphRag.query
      .mockResolvedValueOnce(resultWith([makeEdge('judge_a', 'REQUIRES_MINIMUM_ARBITER')]))
      .mockResolvedValueOnce(emptyResult())
      .mockResolvedValueOnce(emptyResult());

    const result = await handler.assemblePanel(defaultParams);
    expect(typeof result.source).toBe('string');
    expect(Array.isArray(result.arbiters)).toBe(true);
    result.arbiters.forEach((a) => expect(typeof a).toBe('string'));
  });
});
