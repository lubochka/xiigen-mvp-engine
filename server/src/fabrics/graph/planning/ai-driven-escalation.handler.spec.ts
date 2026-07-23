/**
 * AIDrivenEscalationHandler — unit tests (Phase 3)
 * 8 tests covering boundary invariants, confidence gate, AI pipeline.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenEscalationHandler } from './ai-driven-escalation.handler';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';
import { ArbiterPanelVerdicts } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'ORCHESTRATION',
        fromType: 'Archetype',
        relationship: 'ESCALATION_ACTION',
        toEntity,
        toType: 'EscalationAction',
        confidence,
        observationCount: 3,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

function makeVerdicts(candidateIds: string[], blockIds: string[] = []): ArbiterPanelVerdicts {
  return {
    candidates: candidateIds.map((id) => ({
      id,
      score: 0.75,
      lowestSubScore: 'completeness',
      challenges: 0,
    })),
    blocks: blockIds.map((id) => ({
      candidateId: id,
      reason: 'CF-CYCLE-1',
      arbiterRole: 'iron_rules',
    })),
  };
}

describe('AIDrivenEscalationHandler', () => {
  let handler: AIDrivenEscalationHandler;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: 'ACCEPT',
        reasoning: 'AI accepts',
        confidence: 0.78,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenEscalationHandler,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    handler = module.get(AIDrivenEscalationHandler);
  });

  it('1. High-confidence graph edges → bootstrap path (no AI pipeline call)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('ACCEPT', 0.95));

    const result = await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r1',
    });

    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.action).toBe('ACCEPT');
  });

  it('2. Below-threshold edges → AI pipeline called', async () => {
    graphRag.query.mockResolvedValueOnce(emptyResult()).mockResolvedValueOnce(emptyResult());

    await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r2',
    });

    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionType: 'ESCALATION',
      }),
    );
  });

  it('3. Empty graph → AI pipeline called with empty graphContext', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r3',
    });

    expect(pipeline.decide).toHaveBeenCalledWith(expect.objectContaining({ graphContext: [] }));
  });

  it('4. AI result stored via learning.addDiscoveredEdge', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r4',
    });

    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'ESCALATION_ACTION',
        discoveredBy: 'r4',
      }),
    );
  });

  it('5. Boundary invariant: all candidates blocked → UNDECIDED (no AI, no graph)', async () => {
    const result = await handler.evaluate({
      verdicts: makeVerdicts(['c1', 'c2'], ['c1', 'c2']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r5',
    });

    expect(result.action).toBe('UNDECIDED');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(graphRag.query).not.toHaveBeenCalled();
  });

  it('6. Returns correctly typed EscalationResult', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 1,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r6',
    });

    expect(typeof result.action).toBe('string');
    expect(typeof result.reasoning).toBe('string');
  });

  it('7. Budget exhausted → ESCALATE_TO_UPPER_JUDGE before graph/AI check', async () => {
    const result = await handler.evaluate({
      verdicts: makeVerdicts(['c1']),
      cyclesUsed: 3,
      cycleBudget: 3,
      archetype: 'ORCHESTRATION',
      runId: 'r7',
    });

    expect(result.action).toBe('ESCALATE_TO_UPPER_JUDGE');
    expect(graphRag.query).not.toHaveBeenCalled();
    expect(pipeline.decide).not.toHaveBeenCalled();
  });

  it('8. AI pipeline error propagates to caller', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockRejectedValueOnce(new Error('AI_PIPELINE_ALL_BLOCKED'));

    await expect(
      handler.evaluate({
        verdicts: makeVerdicts(['c1']),
        cyclesUsed: 1,
        cycleBudget: 3,
        archetype: 'ORCHESTRATION',
        runId: 'r8',
      }),
    ).rejects.toThrow();
  });
});
