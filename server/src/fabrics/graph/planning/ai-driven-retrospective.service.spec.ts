/**
 * AIDrivenRetrospectiveService — unit tests (Phase 4)
 * 14 tests covering outcome classification, calibration gate, triple upgrade, promotion.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenRetrospectiveService } from './ai-driven-retrospective.service';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { DATABASE_SERVICE } from '../../interfaces';
import { GRAPH_CONFIG_READER } from './planning-abstracts';

function emptyQueryResult() {
  return { edges: [], formatted: () => '' };
}
function archetypeEdgeResult(archetype: string) {
  return {
    edges: [
      {
        fromEntity: 'FLOW:F1',
        fromType: 'Flow',
        relationship: 'EXECUTED_ARCHETYPE',
        toEntity: archetype,
        toType: 'Archetype',
        confidence: 0.95,
        observationCount: 3,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

describe('AIDrivenRetrospectiveService', () => {
  let service: AIDrivenRetrospectiveService;
  let graphRag: { query: jest.Mock };
  let learning: { updateEdge: jest.Mock; promoteEdgeIfThresholdMet: jest.Mock };
  let db: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyQueryResult()) };
    learning = {
      updateEdge: jest.fn().mockResolvedValue(undefined),
      promoteEdgeIfThresholdMet: jest.fn().mockResolvedValue('UNCHANGED'),
    };
    db = {
      searchDocuments: jest.fn().mockResolvedValue({ isSuccess: true, data: [] }),
      storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }),
    };
    config = { get: jest.fn().mockResolvedValue(0.6) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenRetrospectiveService,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: DATABASE_SERVICE, useValue: db },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(AIDrivenRetrospectiveService);
  });

  it('1. runR1: returns clearToProceed=true when no outcomes (first run)', async () => {
    const result = await service.runR1('FLOW-01');
    expect(result.clearToProceed).toBe(true);
  });

  it('2. runR1: loads outcomes from xiigen-flow-lifecycle', async () => {
    await service.runR1('FLOW-01');
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-flow-lifecycle',
      expect.objectContaining({ flowId: 'FLOW-01', type: 'ROUTING_DECISION_OUTCOME' }),
      expect.any(Number),
    );
  });

  it('3. runR1: SUCCESS_WITHIN_BUDGET → positive delta (+0.05)', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            flowId: 'FLOW-01',
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ACCEPT',
            cyclesUsed: 1,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    await service.runR1('FLOW-01');

    expect(learning.updateEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        outcomeWasPositive: true,
        confidence_delta: 0.05,
      }),
    );
  });

  it('4. runR1: ESCALATION_REQUIRED → negative delta (-0.05)', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            flowId: 'FLOW-01',
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ESCALATE_TO_UPPER_JUDGE',
            cyclesUsed: 3,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    await service.runR1('FLOW-01');

    expect(learning.updateEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        outcomeWasPositive: false,
        confidence_delta: 0.05,
      }),
    );
  });

  it('5. runR1: WASTED_CYCLE (cyclesUsed > cycleBudget) → negative delta', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            flowId: 'FLOW-01',
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ACCEPT',
            cyclesUsed: 5,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    await service.runR1('FLOW-01');

    expect(learning.updateEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        outcomeWasPositive: false,
      }),
    );
  });

  it('6. runR1: promotionResults populated when edge is promoted', async () => {
    graphRag.query
      .mockResolvedValueOnce(archetypeEdgeResult('ORCHESTRATION')) // EXECUTED_ARCHETYPE
      .mockResolvedValueOnce({
        edges: [
          {
            fromEntity: 'ORCHESTRATION',
            relationship: 'OPTIONAL_ARBITER',
            toEntity: 'security',
            confidence: 0.95,
            observationCount: 5,
            fromType: 'Archetype',
            toType: 'Arbiter',
            immutable: false,
          },
        ],
        formatted: () => '',
      })
      .mockResolvedValue(emptyQueryResult());
    learning.promoteEdgeIfThresholdMet.mockResolvedValue('PROMOTED');

    const result = await service.runR1('FLOW-01');

    expect(result.promotionResults).toHaveLength(1);
    expect(result.promotionResults[0].result).toBe('PROMOTED');
  });

  it('7. runR1: clearToProceed=false when successRate < minSuccessRate', async () => {
    // 2 failures, 0 successes → successRate = 0.0 < 0.60
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ESCALATE_TO_UPPER_JUDGE',
            cyclesUsed: 3,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
          {
            archetype: 'ORCHESTRATION',
            runId: 'r2',
            routingDecision: 'ESCALATE_TO_HUMAN',
            cyclesUsed: 3,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    const result = await service.runR1('FLOW-01');
    expect(result.clearToProceed).toBe(false);
  });

  it('8. runR1: calibration contains _successRate key', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ACCEPT',
            cyclesUsed: 1,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    const result = await service.runR1('FLOW-01');
    expect(result.calibration['_successRate']).toBeDefined();
    expect(result.calibration['_successRate']).toBe(1.0);
  });

  it('9. runR1: upgradeTripleQuality stores VALIDATED triple', async () => {
    // outcomes load → empty; flow-lifecycle empty; planning-decisions has OUTCOME_PENDING triple
    db.searchDocuments
      .mockResolvedValueOnce({ isSuccess: true, data: [] }) // outcomes
      .mockResolvedValueOnce({ isSuccess: true, data: [] }) // arbiter signals
      .mockResolvedValueOnce({
        // planning-decisions
        isSuccess: true,
        data: [
          {
            runId: 'r1',
            decisionType: 'CYCLE_ROUTING',
            trainingDataQuality: 'OUTCOME_PENDING',
            flowId: 'FLOW-01',
          },
        ],
      });

    await service.runR1('FLOW-01');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-planning-decisions',
      expect.objectContaining({ trainingDataQuality: 'VALIDATED' }),
      expect.any(String),
    );
  });

  it('10. runR1: upgradeTripleQuality failure is non-fatal', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({ isSuccess: true, data: [] })
      .mockResolvedValueOnce({ isSuccess: true, data: [] })
      .mockRejectedValueOnce(new Error('ES down'));

    // Should not throw
    await expect(service.runR1('FLOW-01')).resolves.toBeDefined();
  });

  it('11. runR1: loads arbiter signals from xiigen-training-data', async () => {
    await service.runR1('FLOW-01');
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({ category: 'ARBITER_VERDICT' }),
      expect.any(Number),
    );
  });

  it('12. runR1: promotionResults empty when no promotions occur', async () => {
    const result = await service.runR1('FLOW-01');
    expect(result.promotionResults).toHaveLength(0);
  });

  it('13. runR1: learning.updateEdge called once per outcome', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            archetype: 'A',
            runId: 'r1',
            routingDecision: 'ACCEPT',
            cyclesUsed: 1,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
          {
            archetype: 'B',
            runId: 'r2',
            routingDecision: 'ACCEPT',
            cyclesUsed: 1,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });

    await service.runR1('FLOW-01');

    expect(learning.updateEdge).toHaveBeenCalledTimes(2);
  });

  it('14. runR1: updateEdge error is non-fatal (caught per-outcome)', async () => {
    db.searchDocuments
      .mockResolvedValueOnce({
        isSuccess: true,
        data: [
          {
            archetype: 'ORCHESTRATION',
            runId: 'r1',
            routingDecision: 'ACCEPT',
            cyclesUsed: 1,
            cycleBudget: 3,
            type: 'ROUTING_DECISION_OUTCOME',
          },
        ],
      })
      .mockResolvedValue({ isSuccess: true, data: [] });
    learning.updateEdge.mockRejectedValueOnce(new Error('graph error'));

    await expect(service.runR1('FLOW-01')).resolves.toBeDefined();
  });
});
