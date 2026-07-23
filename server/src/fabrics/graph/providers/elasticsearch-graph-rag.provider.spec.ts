/**
 * ElasticsearchGraphRagProvider — unit tests (Phase 1)
 *
 * Covers:
 *   query:            returns GraphQueryResult with edges, empty on miss, respects minConfidence
 *   formatted():      returns human-readable string, not [object Object]
 *   upsertEdge:       writes doc, no-op for immutable edges
 *   updateEdgeWeight: clamps [0,1], no-op immutable, no-op on miss, increments observationCount
 *   vectorSearch:     delegates embed to IEmbeddingService, filters by minScore, respects entityType
 *   factory switch:   elasticsearch default, stub throws for lightrag
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchGraphRagProvider } from './elasticsearch-graph-rag.provider';
import { MockEmbeddingProvider } from './mock-embedding.provider';
import { EMBEDDING_SERVICE } from '../interfaces/i-embedding.service';
import { GraphEdge } from '../interfaces/graph-types';
import { LightRagGraphProvider } from './stub-graph-rag.providers';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeEdgeSource(
  overrides: Partial<GraphEdge & Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    fromEntity: 'ORCHESTRATION',
    fromType: 'ARCHETYPE',
    relationship: 'USES_ARBITER',
    toEntity: 'QUALITY_JUDGE',
    toType: 'ARBITER',
    confidence: 0.85,
    observationCount: 3,
    immutable: false,
    source: 'seeded',
    reasoning: 'High quality outcomes observed',
    ...overrides,
  };
}

function makeSearchResponse(
  sources: Record<string, unknown>[],
  scores?: number[],
): Record<string, unknown> {
  return {
    hits: {
      hits: sources.map((src, i) => ({
        _source: src,
        _score: scores?.[i] ?? 1.0,
      })),
    },
  };
}

// ── suite ────────────────────────────────────────────────────────────────────

describe('ElasticsearchGraphRagProvider', () => {
  let provider: ElasticsearchGraphRagProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchGraphRagProvider,
        { provide: EMBEDDING_SERVICE, useClass: MockEmbeddingProvider },
      ],
    }).compile();

    provider = module.get(ElasticsearchGraphRagProvider);
    // Default: return empty
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => makeSearchResponse([]),
    } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // ── query ─────────────────────────────────────────────────────────────────

  describe('query', () => {
    it('should return GraphQueryResult with correct edges shape', async () => {
      const src = makeEdgeSource();
      fetchSpy.mockResolvedValueOnce({
        json: async () => makeSearchResponse([src]),
      } as unknown as Response);

      const result = await provider.query({ fromEntity: 'ORCHESTRATION' });

      expect(result.edges).toHaveLength(1);
      const edge = result.edges[0];
      expect(edge.fromEntity).toBe('ORCHESTRATION');
      expect(edge.relationship).toBe('USES_ARBITER');
      expect(edge.confidence).toBe(0.85);
      expect(edge.observationCount).toBe(3);
      expect(edge.immutable).toBe(false);
    });

    it('should return empty edges when no match', async () => {
      // fetchSpy already returns empty by default
      const result = await provider.query({ fromEntity: 'UNKNOWN' });
      expect(result.edges).toHaveLength(0);
    });

    it('should build minConfidence range filter in request body', async () => {
      fetchSpy.mockResolvedValueOnce({
        json: async () => makeSearchResponse([]),
      } as unknown as Response);

      await provider.query({ fromEntity: 'ORCHESTRATION', minConfidence: 0.7 });

      const callBody = JSON.parse(fetchSpy.mock.calls[0][1].body as string) as Record<
        string,
        unknown
      >;
      const must = (callBody['query'] as Record<string, unknown>)['bool'] as Record<
        string,
        unknown
      >;
      const mustArr = must['must'] as Array<Record<string, unknown>>;
      expect(mustArr.some((c) => JSON.stringify(c).includes('gte'))).toBe(true);
    });

    it('should return empty on fetch error (fail-open)', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('network error'));
      const result = await provider.query({ fromEntity: 'ORCHESTRATION' });
      expect(result.edges).toHaveLength(0);
    });
  });

  // ── formatted() ──────────────────────────────────────────────────────────

  describe('GraphQueryResult.formatted()', () => {
    it('should return human-readable string not [object Object]', async () => {
      fetchSpy.mockResolvedValueOnce({
        json: async () => makeSearchResponse([makeEdgeSource()]),
      } as unknown as Response);

      const result = await provider.query({ fromEntity: 'ORCHESTRATION' });
      const text = result.formatted();

      expect(text).not.toContain('[object Object]');
      expect(text).toContain('ORCHESTRATION');
      expect(text).toContain('USES_ARBITER');
      expect(text).toContain('QUALITY_JUDGE');
      expect(text).toContain('confidence: 0.85');
    });

    it('should return (no edges found) for empty result', async () => {
      const result = await provider.query({ fromEntity: 'X' });
      expect(result.formatted()).toBe('(no edges found)');
    });
  });

  // ── upsertEdge ────────────────────────────────────────────────────────────

  describe('upsertEdge', () => {
    it('should write document to ES with correct fields', async () => {
      let putBody: Record<string, unknown> | null = null;
      fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
        if ((init?.method ?? 'GET') === 'PUT') {
          putBody = JSON.parse(init.body as string) as Record<string, unknown>;
        }
        return { json: async () => makeSearchResponse([]) } as unknown as Response;
      });

      await provider.upsertEdge({
        fromEntity: 'ORCHESTRATION',
        fromType: 'ARCHETYPE',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        toType: 'ARBITER',
        confidence: 0.8,
        source: 'test',
      });

      expect(putBody).not.toBeNull();
      expect(putBody!['fromEntity']).toBe('ORCHESTRATION');
      expect(putBody!['confidence']).toBe(0.8);
      expect(putBody!['immutable']).toBe(false);
      expect(putBody!['lastUpdated']).toBeDefined();
    });

    it('should be a no-op for immutable edges (logs warning, no PUT)', async () => {
      const immutableSrc = makeEdgeSource({ immutable: true });
      fetchSpy.mockResolvedValueOnce({
        json: async () => makeSearchResponse([immutableSrc]),
      } as unknown as Response);

      await provider.upsertEdge({
        fromEntity: 'ORCHESTRATION',
        fromType: 'ARCHETYPE',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        toType: 'ARBITER',
        confidence: 0.9,
      });

      // Only 1 fetch call (the query) — no PUT
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── updateEdgeWeight ──────────────────────────────────────────────────────

  describe('updateEdgeWeight', () => {
    it('should clamp confidence to [0, 1] when delta would exceed bounds', async () => {
      const src = makeEdgeSource({ confidence: 0.98 });
      let updateBody: Record<string, unknown> | null = null;

      fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
        const method = init?.method ?? 'GET';
        if (method === 'POST' && (url as string).includes('_update')) {
          updateBody = JSON.parse(init.body as string) as Record<string, unknown>;
        }
        return { json: async () => makeSearchResponse([src]) } as unknown as Response;
      });

      await provider.updateEdgeWeight({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        delta: 0.1,
        observationId: 'obs-001',
      });

      const doc = updateBody!['doc'] as Record<string, unknown>;
      expect(doc['confidence']).toBe(1.0); // 0.98 + 0.10 clamped to 1.0
    });

    it('should clamp confidence to 0 when delta is deeply negative', async () => {
      const src = makeEdgeSource({ confidence: 0.02 });
      let updateBody: Record<string, unknown> | null = null;

      fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
        const method = init?.method ?? 'GET';
        if (method === 'POST' && (url as string).includes('_update')) {
          updateBody = JSON.parse(init.body as string) as Record<string, unknown>;
        }
        return { json: async () => makeSearchResponse([src]) } as unknown as Response;
      });

      await provider.updateEdgeWeight({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        delta: -0.15,
        observationId: 'obs-002',
      });

      const doc = updateBody!['doc'] as Record<string, unknown>;
      expect(doc['confidence']).toBe(0); // 0.02 - 0.15 clamped to 0
    });

    it('should increment observationCount by 1', async () => {
      const src = makeEdgeSource({ observationCount: 5 });
      let updateBody: Record<string, unknown> | null = null;

      fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
        const method = init?.method ?? 'GET';
        if (method === 'POST' && (url as string).includes('_update')) {
          updateBody = JSON.parse(init.body as string) as Record<string, unknown>;
        }
        return { json: async () => makeSearchResponse([src]) } as unknown as Response;
      });

      await provider.updateEdgeWeight({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        delta: 0.05,
        observationId: 'obs-003',
      });

      expect((updateBody!['doc'] as Record<string, unknown>)['observationCount']).toBe(6);
    });

    it('should be a no-op for immutable edges', async () => {
      const src = makeEdgeSource({ immutable: true });
      fetchSpy.mockResolvedValue({
        json: async () => makeSearchResponse([src]),
      } as unknown as Response);

      await provider.updateEdgeWeight({
        fromEntity: 'ORCHESTRATION',
        relationship: 'USES_ARBITER',
        toEntity: 'QUALITY_JUDGE',
        delta: 0.05,
        observationId: 'obs-004',
      });

      // Only the search query — no _update calls
      const updateCalls = fetchSpy.mock.calls.filter(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('_update'),
      );
      expect(updateCalls).toHaveLength(0);
    });

    it('should warn and return when edge not found', async () => {
      // fetchSpy returns empty by default
      const warnSpy = jest.spyOn(
        (provider as unknown as Record<string, unknown>)['logger'] as { warn: jest.Mock },
        'warn',
      );

      await provider.updateEdgeWeight({
        fromEntity: 'MISSING',
        relationship: 'USES_ARBITER',
        toEntity: 'NOWHERE',
        delta: 0.05,
        observationId: 'obs-005',
      });

      expect(warnSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledTimes(1); // only the query
    });
  });

  // ── vectorSearch ──────────────────────────────────────────────────────────

  describe('vectorSearch', () => {
    it('should call IEmbeddingService.embed() — never embedding API directly', async () => {
      const embeddingProvider = new MockEmbeddingProvider();
      const embedSpy = jest.spyOn(embeddingProvider, 'embed');

      const module = await Test.createTestingModule({
        providers: [
          ElasticsearchGraphRagProvider,
          { provide: EMBEDDING_SERVICE, useValue: embeddingProvider },
        ],
      }).compile();
      const p = module.get(ElasticsearchGraphRagProvider);

      fetchSpy.mockResolvedValueOnce({
        json: async () => makeSearchResponse([]),
      } as unknown as Response);

      await p.vectorSearch({ queryText: 'orchestration arbiter selection' });
      expect(embedSpy).toHaveBeenCalledWith('orchestration arbiter selection');
    });

    it('should filter results by minScore', async () => {
      fetchSpy.mockResolvedValueOnce({
        json: async () =>
          makeSearchResponse(
            [makeEdgeSource(), makeEdgeSource({ fromEntity: 'DATA_PIPELINE' })],
            [0.9, 0.4],
          ),
      } as unknown as Response);

      const results = await provider.vectorSearch({ queryText: 'test', minScore: 0.5 });
      expect(results).toHaveLength(1);
      expect(results[0].edge.fromEntity).toBe('ORCHESTRATION');
      expect(results[0].score).toBe(0.9);
    });

    it('should include entityType filter in kNN query when provided', async () => {
      let requestBody: Record<string, unknown> | null = null;
      fetchSpy.mockImplementation(async (url: string, init: RequestInit) => {
        requestBody = JSON.parse(init.body as string) as Record<string, unknown>;
        return { json: async () => makeSearchResponse([]) } as unknown as Response;
      });

      await provider.vectorSearch({ queryText: 'test', entityType: 'ARCHETYPE' });

      const knn = requestBody!['knn'] as Record<string, unknown>;
      expect(knn['filter']).toBeDefined();
      expect(JSON.stringify(knn['filter'])).toContain('ARCHETYPE');
    });

    it('should return empty array on fetch error (fail-open)', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('ES offline'));
      const results = await provider.vectorSearch({ queryText: 'test' });
      expect(results).toHaveLength(0);
    });
  });
});

// ── stub provider smoke test ──────────────────────────────────────────────────

describe('LightRagGraphProvider (stub)', () => {
  it('should throw "not implemented in Phase 1" for query', () => {
    const stub = new LightRagGraphProvider();
    expect(() => stub.query({ fromEntity: 'X' })).toThrow('not implemented in Phase 1');
  });
});
