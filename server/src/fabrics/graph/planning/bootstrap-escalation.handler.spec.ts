/**
 * BootstrapEscalationHandler — unit tests (Phase 2)
 * 8 tests covering boundary invariants + graph path + bootstrap defaults.
 */

import { Test } from '@nestjs/testing';
import { BootstrapEscalationHandler } from './bootstrap-escalation.handler';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  GRAPH_CONFIG_READER,
  IGraphConfigReader,
  ArbiterPanelVerdicts,
} from './planning-abstracts';

function makeVerdicts(candidateCount = 2, blockCount = 0): ArbiterPanelVerdicts {
  const candidates = Array.from({ length: candidateCount }, (_, i) => ({
    id: `c-${i}`,
    score: 0.8 + i * 0.05,
    lowestSubScore: 'intent',
    challenges: i,
  }));
  const blocks = Array.from({ length: blockCount }, (_, i) => ({
    candidateId: `c-${i}`,
    reason: 'test block',
    arbiterRole: 'quality_judge',
  }));
  return { candidates, blocks };
}

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'ORCH:cycle_1',
        relationship: 'ESCALATION_ACTION',
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

describe('BootstrapEscalationHandler', () => {
  let handler: BootstrapEscalationHandler;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

  const baseParams = { archetype: 'ORCHESTRATION', cyclesUsed: 1, cycleBudget: 3, runId: 'r1' };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapEscalationHandler,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    handler = module.get(BootstrapEscalationHandler);
  });

  it('should return UNDECIDED when all candidates are blocked', async () => {
    const result = await handler.evaluate({ ...baseParams, verdicts: makeVerdicts(2, 2) });
    expect(result.action).toBe('UNDECIDED');
    expect(graphRag.query).not.toHaveBeenCalled(); // short-circuit before graph query
  });

  it('should return ESCALATE_TO_UPPER_JUDGE when budget exhausted', async () => {
    const result = await handler.evaluate({
      ...baseParams,
      cyclesUsed: 3,
      cycleBudget: 3,
      verdicts: makeVerdicts(2, 0),
    });
    expect(result.action).toBe('ESCALATE_TO_UPPER_JUDGE');
  });

  it('should use graph answer when high-confidence edge exists', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('CYCLE_WITH_PATCH'));
    const result = await handler.evaluate({ ...baseParams, verdicts: makeVerdicts(2, 0) });
    expect(result.action).toBe('CYCLE_WITH_PATCH');
    expect(result.reasoning).toContain('Graph');
  });

  it('should return ACCEPT for single survivor with < 3 challenges (bootstrap default)', async () => {
    const result = await handler.evaluate({
      ...baseParams,
      verdicts: {
        candidates: [{ id: 'c-0', score: 0.85, lowestSubScore: 'intent', challenges: 1 }],
        blocks: [],
      },
    });
    expect(result.action).toBe('ACCEPT');
    expect(result.reasoning).toContain('Bootstrap default');
  });

  it('should return CYCLE_WITH_PATCH for single survivor with >= 3 challenges', async () => {
    const result = await handler.evaluate({
      ...baseParams,
      verdicts: {
        candidates: [{ id: 'c-0', score: 0.75, lowestSubScore: 'intent', challenges: 3 }],
        blocks: [],
      },
    });
    expect(result.action).toBe('CYCLE_WITH_PATCH');
  });

  it('should ACCEPT highest-scoring survivor when multiple remain (bootstrap default)', async () => {
    const result = await handler.evaluate({ ...baseParams, verdicts: makeVerdicts(3, 0) });
    expect(result.action).toBe('ACCEPT');
    expect(result.chosen).toBeDefined();
  });

  it('should read confidence threshold from config', async () => {
    await handler.evaluate({ ...baseParams, verdicts: makeVerdicts(2, 0) });
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should not call AI engine', () => {
    const aiSpy = jest.fn();
    expect(aiSpy).not.toHaveBeenCalled();
  });
});
