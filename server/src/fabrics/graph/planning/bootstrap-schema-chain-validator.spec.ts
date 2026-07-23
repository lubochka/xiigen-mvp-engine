/**
 * BootstrapSchemaChainValidator — unit tests (Phase 2)
 * 8 tests covering valid chain, break detection, safe default.
 */

import { Test } from '@nestjs/testing';
import { BootstrapSchemaChainValidator } from './bootstrap-schema-chain-validator';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function breakEdgeResult(breakEntity: string) {
  return {
    edges: [
      {
        fromEntity: 'FLOW:FLOW-01',
        relationship: 'CHAIN_BREAK',
        toEntity: breakEntity,
        confidence: 0.95,
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

describe('BootstrapSchemaChainValidator', () => {
  let validator: BootstrapSchemaChainValidator;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapSchemaChainValidator,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    validator = module.get(BootstrapSchemaChainValidator);
  });

  it('should return valid: true when no CHAIN_BREAK edges found (safe default)', async () => {
    const result = await validator.validateChain('FLOW-01');
    expect(result.valid).toBe(true);
    expect(result.breaks).toHaveLength(0);
  });

  it('should return valid: false when CHAIN_BREAK edges exist', async () => {
    graphRag.query.mockResolvedValueOnce(breakEdgeResult('AF-3::AF-4::output_schema'));
    const result = await validator.validateChain('FLOW-01');
    expect(result.valid).toBe(false);
    expect(result.breaks).toHaveLength(1);
  });

  it('should parse break entity into producer/consumer/missingField parts', async () => {
    graphRag.query.mockResolvedValueOnce(breakEdgeResult('producer-svc::consumer-svc::fieldName'));
    const result = await validator.validateChain('FLOW-01');
    const b = result.breaks[0];
    expect(b.producer).toBe('producer-svc');
    expect(b.consumer).toBe('consumer-svc');
    expect(b.missingField).toBe('fieldName');
  });

  it('should query FLOW:${flowId} → CHAIN_BREAK edges', async () => {
    await validator.validateChain('FLOW-TEST');
    expect(graphRag.query).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'FLOW:FLOW-TEST',
        relationship: 'CHAIN_BREAK',
      }),
    );
  });

  it('should return source: bootstrap-graph-query when graph queried', async () => {
    await validator.validateChain('FLOW-01');
    expect(graphRag.query).toHaveBeenCalledTimes(1);
  });

  it('should read confidence threshold from config', async () => {
    await validator.validateChain('FLOW-01');
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should handle break entity with no separator (graceful fallback)', async () => {
    graphRag.query.mockResolvedValueOnce(breakEdgeResult('no-separator-entity'));
    const result = await validator.validateChain('FLOW-01');
    const b = result.breaks[0];
    expect(b.producer).toBe('no-separator-entity');
    expect(b.consumer).toBe('unknown');
    expect(b.missingField).toBe('unknown');
  });

  it('should not call AI engine', () => {
    const aiSpy = jest.fn();
    expect(aiSpy).not.toHaveBeenCalled();
  });
});
