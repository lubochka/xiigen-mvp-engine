/**
 * BootstrapScopeClassifier — unit tests (Phase 2)
 * 8 tests covering graph path + SK-434 fallback + effort mapping.
 */

import { Test } from '@nestjs/testing';
import { BootstrapScopeClassifier } from './bootstrap-scope-classifier';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(level: string) {
  return {
    edges: [
      {
        fromEntity: 'PREREQ_GAP_TYPE:test',
        relationship: 'RESOLVES_VIA',
        toEntity: level,
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

describe('BootstrapScopeClassifier', () => {
  let classifier: BootstrapScopeClassifier;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapScopeClassifier,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    classifier = module.get(BootstrapScopeClassifier);
  });

  it('should return graph-driven level when RESOLVES_VIA edge exists', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('NEW_FLOW'));
    const result = await classifier.classify({
      gapType: 'flow-missing',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.level).toBe('NEW_FLOW');
    expect(result.rationale).toContain('Graph');
  });

  it('should return fallback-invariant source when graph has no edges', async () => {
    const result = await classifier.classify({
      gapType: 'adapt-service',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.rationale).toContain('Bootstrap default');
  });

  it('should classify infra gap as NEW_INFRA (SK-434 fallback)', async () => {
    const result = await classifier.classify({
      gapType: 'infra-db',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.level).toBe('NEW_INFRA');
  });

  it('should classify flow gap as NEW_FLOW (SK-434 fallback)', async () => {
    const result = await classifier.classify({
      gapType: 'flow-missing',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.level).toBe('NEW_FLOW');
  });

  it('should classify adapt gap as ADAPTATION (SK-434 fallback)', async () => {
    const result = await classifier.classify({
      gapType: 'adapt-service',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.level).toBe('ADAPTATION');
  });

  it('should classify unknown gap as CONVENTION (SK-434 fallback)', async () => {
    const result = await classifier.classify({
      gapType: 'unknown-type',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(result.level).toBe('CONVENTION');
  });

  it('should read confidence threshold from config', async () => {
    await classifier.classify({ gapType: 'test', serviceCategory: 'core', description: 'test' });
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should return estimated effort string for each level', async () => {
    const result = await classifier.classify({
      gapType: 'infra-test',
      serviceCategory: 'core',
      description: 'test',
    });
    expect(typeof result.estimatedEffort).toBe('string');
    expect(result.estimatedEffort.length).toBeGreaterThan(0);
  });
});
