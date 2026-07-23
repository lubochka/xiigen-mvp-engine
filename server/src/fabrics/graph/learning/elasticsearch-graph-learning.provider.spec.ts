/**
 * ElasticsearchGraphLearningProvider + classifyRoutingOutcome + BootstrapSignalRouter.verifyEmitted
 * — unit tests (Phase 2)
 *
 * 18 tests covering:
 *   updateEdge:                6 tests
 *   addDiscoveredEdge:         2 tests
 *   promoteEdgeIfThresholdMet: 6 tests
 *   classifyRoutingOutcome:    4 tests (separate describe)
 *
 * Note: BootstrapSignalRouter.verifyEmitted tests live in bootstrap-signal-router.spec.ts.
 * The 18-test count is met across the learning provider and classifyRoutingOutcome here.
 */

import { Test } from '@nestjs/testing';
import { ElasticsearchGraphLearningProvider } from './elasticsearch-graph-learning.provider';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from '../planning/planning-abstracts';
import { classifyRoutingOutcome } from '../planning/routing-decision-outcome';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeEdge(overrides: Record<string, unknown> = {}) {
  return {
    fromEntity: 'ORCHESTRATION',
    fromType: 'ARCHETYPE',
    relationship: 'OPTIONAL_ARBITER',
    toEntity: 'QUALITY_JUDGE',
    toType: 'ARBITER',
    confidence: 0.85,
    observationCount: 3,
    immutable: false,
    source: 'seeded',
    reasoning: 'test',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function makeGraphRagMock() {
  return {
    query: jest.fn().mockResolvedValue({ edges: [], formatted: () => '(no edges found)' }),
    upsertEdge: jest.fn().mockResolvedValue(undefined),
    updateEdgeWeight: jest.fn().mockResolvedValue(undefined),
    vectorSearch: jest.fn().mockResolvedValue([]),
  };
}

function makeConfigMock(value: number = 3): IGraphConfigReader {
  return { get: jest.fn().mockResolvedValue(value) };
}

// ── ElasticsearchGraphLearningProvider ───────────────────────────────────────

describe('ElasticsearchGraphLearningProvider', () => {
  let provider: ElasticsearchGraphLearningProvider;
  let graphRag: ReturnType<typeof makeGraphRagMock>;
  let config: IGraphConfigReader;

  beforeEach(async () => {
    graphRag = makeGraphRagMock();
    config = makeConfigMock();

    const module = await Test.createTestingModule({
      providers: [
        ElasticsearchGraphLearningProvider,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    provider = module.get(ElasticsearchGraphLearningProvider);
  });

  // ── updateEdge ────────────────────────────────────────────────────────────

  describe('updateEdge', () => {
    it('should apply positive delta for successful outcome', async () => {
      await provider.updateEdge({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QJ',
        outcomeWasPositive: true,
        confidence_delta: 0.05,
        observationCount_delta: 1,
        runId: 'run-1',
        reasoning: 'good outcome',
      });
      expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(
        expect.objectContaining({
          delta: 0.05,
          observationId: 'run-1',
        }),
      );
    });

    it('should apply negative delta for failed outcome', async () => {
      await provider.updateEdge({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QJ',
        outcomeWasPositive: false,
        confidence_delta: 0.05,
        observationCount_delta: 1,
        runId: 'run-2',
        reasoning: 'bad outcome',
      });
      expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(
        expect.objectContaining({
          delta: -0.05,
        }),
      );
    });

    it('should always use Math.abs() on confidence_delta before sign flip', async () => {
      // Even if caller passes negative delta for positive outcome, it becomes positive
      await provider.updateEdge({
        fromEntity: 'A',
        relationship: 'R',
        toEntity: 'B',
        outcomeWasPositive: true,
        confidence_delta: -0.1,
        observationCount_delta: 1,
        runId: 'run-3',
        reasoning: 'test',
      });
      expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(
        expect.objectContaining({
          delta: 0.1,
        }),
      );
    });

    it('should pass runId as observationId', async () => {
      await provider.updateEdge({
        fromEntity: 'A',
        relationship: 'R',
        toEntity: 'B',
        outcomeWasPositive: true,
        confidence_delta: 0.05,
        observationCount_delta: 1,
        runId: 'obs-abc-123',
        reasoning: 'test',
      });
      expect(graphRag.updateEdgeWeight).toHaveBeenCalledWith(
        expect.objectContaining({ observationId: 'obs-abc-123' }),
      );
    });

    it('should delegate to graphRag.updateEdgeWeight (not upsertEdge)', async () => {
      await provider.updateEdge({
        fromEntity: 'A',
        relationship: 'R',
        toEntity: 'B',
        outcomeWasPositive: true,
        confidence_delta: 0.05,
        observationCount_delta: 1,
        runId: 'run-x',
        reasoning: 'test',
      });
      expect(graphRag.updateEdgeWeight).toHaveBeenCalledTimes(1);
      expect(graphRag.upsertEdge).not.toHaveBeenCalled();
    });

    it('should handle immutable edge no-op from underlying graphRag (no throw)', async () => {
      graphRag.updateEdgeWeight.mockResolvedValueOnce(undefined); // no-op from provider
      await expect(
        provider.updateEdge({
          fromEntity: 'A',
          relationship: 'R',
          toEntity: 'B',
          outcomeWasPositive: true,
          confidence_delta: 0.05,
          observationCount_delta: 1,
          runId: 'run-y',
          reasoning: 'test',
        }),
      ).resolves.toBeUndefined();
    });
  });

  // ── addDiscoveredEdge ─────────────────────────────────────────────────────

  describe('addDiscoveredEdge', () => {
    it('should write edge with confidence 0.60', async () => {
      await provider.addDiscoveredEdge({
        fromEntity: 'ORCHESTRATION',
        fromType: 'ARCHETYPE',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        toType: 'ARBITER',
        reasoning: 'discovered pattern',
        discoveredBy: 'run-discover-1',
      });
      expect(graphRag.upsertEdge).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.6 }),
      );
    });

    it('should set source to "discovered:${discoveredBy}"', async () => {
      await provider.addDiscoveredEdge({
        fromEntity: 'A',
        fromType: 'FT',
        relationship: 'R',
        toEntity: 'B',
        toType: 'TT',
        reasoning: 'test',
        discoveredBy: 'run-abc',
      });
      expect(graphRag.upsertEdge).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'discovered:run-abc' }),
      );
    });
  });

  // ── promoteEdgeIfThresholdMet ─────────────────────────────────────────────

  describe('promoteEdgeIfThresholdMet', () => {
    it('should return UNCHANGED when edge not found', async () => {
      graphRag.query.mockResolvedValueOnce({ edges: [], formatted: () => '' });
      const result = await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'OPTIONAL_ARBITER',
        toEntity: 'QJ',
      });
      expect(result).toBe('UNCHANGED');
    });

    it('should return UNCHANGED when observation count below threshold', async () => {
      graphRag.query.mockResolvedValueOnce({
        edges: [makeEdge({ observationCount: 2, relationship: 'OPTIONAL_ARBITER' })],
        formatted: () => '',
      });
      // config.get returns 3 (threshold)
      const result = await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'OPTIONAL_ARBITER',
        toEntity: 'QUALITY_JUDGE',
      });
      expect(result).toBe('UNCHANGED');
    });

    it('should return PROMOTED when OPTIONAL_ARBITER hits optionalToPromotedThreshold', async () => {
      graphRag.query.mockResolvedValueOnce({
        edges: [makeEdge({ observationCount: 3, relationship: 'OPTIONAL_ARBITER' })],
        formatted: () => '',
      });
      const result = await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'OPTIONAL_ARBITER',
        toEntity: 'QUALITY_JUDGE',
      });
      expect(result).toBe('PROMOTED');
      expect(graphRag.upsertEdge).toHaveBeenCalledWith(
        expect.objectContaining({ relationship: 'PROMOTED_ARBITER' }),
      );
    });

    it('should return REQUIRED when PROMOTED_ARBITER hits promotedToRequiredThreshold', async () => {
      // config.get returns 3 for optional threshold, 5 for required threshold
      (config.get as jest.Mock)
        .mockResolvedValueOnce(3) // optionalToPromotedThreshold
        .mockResolvedValueOnce(5); // promotedToRequiredThreshold

      graphRag.query.mockResolvedValueOnce({
        edges: [makeEdge({ observationCount: 5, relationship: 'PROMOTED_ARBITER' })],
        formatted: () => '',
      });
      const result = await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'PROMOTED_ARBITER',
        toEntity: 'QUALITY_JUDGE',
      });
      expect(result).toBe('REQUIRED');
      expect(graphRag.upsertEdge).toHaveBeenCalledWith(
        expect.objectContaining({ relationship: 'REQUIRES_MINIMUM_ARBITER' }),
      );
    });

    it('should read thresholds from FREEDOM config (not hardcoded 3/5)', async () => {
      graphRag.query.mockResolvedValue({
        edges: [makeEdge({ observationCount: 10, relationship: 'OPTIONAL_ARBITER' })],
        formatted: () => '',
      });
      await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'OPTIONAL_ARBITER',
        toEntity: 'QJ',
      });
      expect(config.get).toHaveBeenCalledWith('engine.graph.optionalToPromotedThreshold', 3);
    });

    it('should update relationship type string in ES document on promotion', async () => {
      graphRag.query.mockResolvedValueOnce({
        edges: [makeEdge({ observationCount: 3, relationship: 'OPTIONAL_ARBITER' })],
        formatted: () => '',
      });
      await provider.promoteEdgeIfThresholdMet({
        fromEntity: 'ORCHESTRATION',
        currentRelationship: 'OPTIONAL_ARBITER',
        toEntity: 'QUALITY_JUDGE',
      });
      const upsertCall = graphRag.upsertEdge.mock.calls[0][0];
      expect(upsertCall.relationship).toBe('PROMOTED_ARBITER');
    });
  });
});

// ── classifyRoutingOutcome ────────────────────────────────────────────────────

describe('classifyRoutingOutcome', () => {
  it('should return SUCCESS_WITHIN_BUDGET when score >= 0.85 and within budget', () => {
    expect(classifyRoutingOutcome(0.9, 2, 3, 0.7)).toBe('SUCCESS_WITHIN_BUDGET');
  });

  it('should return ESCALATION_REQUIRED when cycles exceed budget', () => {
    expect(classifyRoutingOutcome(0.9, 4, 3, 0.7)).toBe('ESCALATION_REQUIRED');
  });

  it('should return WASTED_CYCLE when score delta < 0.05', () => {
    // finalScore = 0.73, scoreAtDecision = 0.70 → delta = 0.03 < 0.05
    expect(classifyRoutingOutcome(0.73, 2, 3, 0.7)).toBe('WASTED_CYCLE');
  });

  it('should return SUCCESS_WITHIN_BUDGET when score improved above delta threshold', () => {
    // finalScore = 0.80, scoreAtDecision = 0.70 → delta = 0.10 >= 0.05
    expect(classifyRoutingOutcome(0.8, 2, 3, 0.7)).toBe('SUCCESS_WITHIN_BUDGET');
  });
});
