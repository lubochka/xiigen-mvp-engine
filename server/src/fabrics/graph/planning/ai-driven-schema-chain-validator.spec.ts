/**
 * AIDrivenSchemaChainValidator — unit tests (Phase 4)
 * 6 tests covering graph path, AI path, break mapping.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenSchemaChainValidator } from './ai-driven-schema-chain-validator';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}

describe('AIDrivenSchemaChainValidator', () => {
  let validator: AIDrivenSchemaChainValidator;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: [],
        reasoning: 'no breaks',
        confidence: 0.9,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenSchemaChainValidator,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    validator = module.get(AIDrivenSchemaChainValidator);
  });

  it('1. Graph path: high-confidence CHAIN_BREAK edges → returned without AI call', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'FLOW:F1',
          relationship: 'CHAIN_BREAK',
          toEntity: 'producerA::consumerB::fieldX',
          confidence: 0.95,
          observationCount: 2,
          fromType: 'Flow',
          toType: 'Break',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await validator.validateChain('F1');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.valid).toBe(false);
    expect(result.breaks[0].producer).toBe('producerA');
  });

  it('2. Empty graph → AI pipeline called', async () => {
    const result = await validator.validateChain('F1');
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decisionType: 'SCHEMA_CHAIN' }),
    );
    expect(result.valid).toBe(true);
  });

  it('3. AI returns breaks → stored via learning.addDiscoveredEdge', async () => {
    pipeline.decide.mockResolvedValueOnce({
      decision: [{ producer: 'svcA', consumer: 'svcB', missingField: 'userId' }],
      reasoning: 'missing field',
      confidence: 0.8,
      modelUsed: 'claude',
      alternatives: [],
    });
    const result = await validator.validateChain('F1');
    expect(result.valid).toBe(false);
    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({ relationship: 'CHAIN_BREAK' }),
    );
  });

  it('4. AI returns empty breaks → valid=true', async () => {
    const result = await validator.validateChain('F1');
    expect(result.valid).toBe(true);
    expect(result.breaks).toHaveLength(0);
  });

  it('5. Low-confidence graph data → returned without AI (fallback to lower-conf edges)', async () => {
    // First call (high-conf) returns empty, second call (no-min) returns data
    graphRag.query
      .mockResolvedValueOnce(emptyResult()) // high-conf query
      .mockResolvedValueOnce({
        edges: [
          {
            fromEntity: 'FLOW:F1',
            relationship: 'CHAIN_BREAK',
            toEntity: 'p::c::f',
            confidence: 0.6,
            observationCount: 1,
            fromType: 'Flow',
            toType: 'Break',
            immutable: false,
          },
        ],
        formatted: () => '',
      });
    const result = await validator.validateChain('F1');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.valid).toBe(false);
  });

  it('6. AI pipeline called with correct flowId in inputs', async () => {
    await validator.validateChain('MY-FLOW-99');
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({ flowId: 'MY-FLOW-99' }),
      }),
    );
  });
});
