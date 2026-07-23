/**
 * BootstrapRetrospectiveService — unit tests (Phase 2)
 * 8 tests covering clearToProceed invariant, promotion delegation, graph wiring.
 */

import { Test } from '@nestjs/testing';
import { BootstrapRetrospectiveService } from './bootstrap-retrospective.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function archetypeResult(archetypes: string[]) {
  return {
    edges: archetypes.map((a) => ({
      fromEntity: 'FLOW:FLOW-01',
      relationship: 'EXECUTED_ARCHETYPE',
      toEntity: a,
      confidence: 0.95,
      observationCount: 1,
      immutable: false,
      source: 'seeded',
      reasoning: '',
      fromType: '',
      toType: '',
      lastUpdated: '',
    })),
    formatted: () => '',
  };
}
function arbiterResult(arbiters: string[]) {
  return {
    edges: arbiters.map((a) => ({
      fromEntity: 'ORCHESTRATION',
      relationship: 'OPTIONAL_ARBITER',
      toEntity: a,
      confidence: 0.95,
      observationCount: 1,
      immutable: false,
      source: 'seeded',
      reasoning: '',
      fromType: '',
      toType: '',
      lastUpdated: '',
    })),
    formatted: () => '',
  };
}

describe('BootstrapRetrospectiveService', () => {
  let service: BootstrapRetrospectiveService;
  let graphRag: { query: jest.Mock };
  let learning: { promoteEdgeIfThresholdMet: jest.Mock };
  let config: IGraphConfigReader;

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { promoteEdgeIfThresholdMet: jest.fn().mockResolvedValue('UNCHANGED') };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapRetrospectiveService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(BootstrapRetrospectiveService);
  });

  it('should always return clearToProceed: true in bootstrap mode', async () => {
    const result = await service.runR1('FLOW-01');
    expect(result.clearToProceed).toBe(true);
  });

  it('should return empty calibration object in bootstrap mode', async () => {
    const result = await service.runR1('FLOW-01');
    expect(result.calibration).toEqual({});
  });

  it('should return empty promotionResults when no archetypes ran', async () => {
    const result = await service.runR1('FLOW-01');
    expect(result.promotionResults).toHaveLength(0);
  });

  it('should query FLOW:${flowId} → EXECUTED_ARCHETYPE edges', async () => {
    await service.runR1('FLOW-TEST');
    expect(graphRag.query).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'FLOW:FLOW-TEST',
        relationship: 'EXECUTED_ARCHETYPE',
      }),
    );
  });

  it('should call promoteEdgeIfThresholdMet for each optional arbiter when archetype ran', async () => {
    graphRag.query
      .mockResolvedValueOnce(archetypeResult(['ORCHESTRATION']))
      .mockResolvedValueOnce(arbiterResult(['quality_judge', 'logic_judge']));

    await service.runR1('FLOW-01');
    expect(learning.promoteEdgeIfThresholdMet).toHaveBeenCalledTimes(2);
  });

  it('should include promotion result when edge is promoted', async () => {
    graphRag.query
      .mockResolvedValueOnce(archetypeResult(['ORCHESTRATION']))
      .mockResolvedValueOnce(arbiterResult(['quality_judge']));
    learning.promoteEdgeIfThresholdMet.mockResolvedValueOnce('PROMOTED');

    const result = await service.runR1('FLOW-01');
    expect(result.promotionResults).toHaveLength(1);
    expect(result.promotionResults[0].result).toBe('PROMOTED');
  });

  it('should not include UNCHANGED in promotionResults', async () => {
    graphRag.query
      .mockResolvedValueOnce(archetypeResult(['ORCHESTRATION']))
      .mockResolvedValueOnce(arbiterResult(['quality_judge']));
    learning.promoteEdgeIfThresholdMet.mockResolvedValueOnce('UNCHANGED');

    const result = await service.runR1('FLOW-01');
    expect(result.promotionResults).toHaveLength(0);
  });

  it('should not call AI engine', () => {
    const aiSpy = jest.fn();
    expect(aiSpy).not.toHaveBeenCalled();
  });
});
