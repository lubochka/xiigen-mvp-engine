/**
 * AIDrivenNodeCompletenessValidator — unit tests (Phase 4)
 * 6 tests covering hard checks, graph path, AI path.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenNodeCompletenessValidator } from './ai-driven-node-completeness-validator';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
const baseNode = {
  intent: {
    purpose: 'Process orders without stack terms',
    failureModes: ['timeout'],
    domainConcepts: ['order', 'payment'],
  },
};

describe('AIDrivenNodeCompletenessValidator', () => {
  let validator: AIDrivenNodeCompletenessValidator;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: { overallScore: 0.85, suggestions: ['good'] },
        reasoning: 'ok',
        confidence: 0.85,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = {
      get: jest
        .fn()
        .mockImplementation((key: string) =>
          key.includes('completeness') ? Promise.resolve(0.75) : Promise.resolve(0.9),
        ),
    };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenNodeCompletenessValidator,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    validator = module.get(AIDrivenNodeCompletenessValidator);
  });

  it('1. Hard violation: empty purpose returns immediately without AI call', async () => {
    const result = await validator.validate({
      node: { intent: { purpose: '', failureModes: ['x'], domainConcepts: ['a', 'b'] } },
      archetype: 'ORCHESTRATION',
    });
    expect(result.passed).toBe(false);
    expect(result.hardViolations).toContain(
      'NODE-HARD-001: purpose is empty — cannot derive genesis prompt',
    );
    expect(pipeline.decide).not.toHaveBeenCalled();
  });

  it('2. Hard violation: stack terminology in purpose', async () => {
    const result = await validator.validate({
      node: {
        intent: {
          purpose: 'extends OrderService to handle',
          failureModes: ['x'],
          domainConcepts: ['a', 'b'],
        },
      },
      archetype: 'ORCHESTRATION',
    });
    expect(result.hardViolations.some((v) => v.includes('NODE-001'))).toBe(true);
    expect(pipeline.decide).not.toHaveBeenCalled();
  });

  it('3. Graph path: high-confidence edge → no AI call', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ARCHETYPE:ORCHESTRATION',
          relationship: 'COMPLETENESS_STANDARD',
          toEntity: 'SCORE:0.90',
          confidence: 0.95,
          observationCount: 3,
          fromType: 'Archetype',
          toType: 'Score',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await validator.validate({ node: baseNode, archetype: 'ORCHESTRATION' });
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.passed).toBe(true);
  });

  it('4. AI path: no graph data → pipeline called', async () => {
    const result = await validator.validate({ node: baseNode, archetype: 'ORCHESTRATION' });
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decisionType: 'NODE_COMPLETENESS' }),
    );
    expect(result.aiGrading).toBeDefined();
  });

  it('5. AI result stored via learning.addDiscoveredEdge', async () => {
    await validator.validate({ node: baseNode, archetype: 'ORCHESTRATION' });
    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'COMPLETENESS_STANDARD',
      }),
    );
  });

  it('6. AI score < threshold → passed=false', async () => {
    pipeline.decide.mockResolvedValueOnce({
      decision: { overallScore: 0.5, suggestions: [] },
      reasoning: 'low',
      confidence: 0.5,
      modelUsed: 'claude',
      alternatives: [],
    });
    const result = await validator.validate({ node: baseNode, archetype: 'ORCHESTRATION' });
    expect(result.passed).toBe(false);
  });
});
