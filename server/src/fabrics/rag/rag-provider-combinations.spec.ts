/**
 * RAG × AI Provider Combination Tests — unit + logic layer.
 *
 * Tests the full retrieve→generate→score pipeline across every RAG provider
 * with MockAiProvider. All HTTP mocked — no external services required.
 *
 * Covers:
 * - Unit: each RAG provider correctly feeds context to AI generation
 * - Logic: retrieve→augment→generate loop, training signal capture (P8),
 *   fallback when RAG fails, tenant isolation across the full stack
 *
 * Combination matrix (unit):
 *   RAG: InMemory | LightRAG | Memgraph | NanoGraphRAG
 *   AI:  MockAiProvider (canned responses, call history tracking)
 */

import 'reflect-metadata';
import { InMemoryRagProvider } from './in-memory.provider';
import { LightRagProvider } from './lightrag.provider';
import { MemgraphProvider } from './memgraph.provider';
import { NanoGraphRagProvider } from './nano-graphrag.provider';
import { MockAiProvider } from '../ai-engine/mock.provider';
import { IRagService } from '../interfaces/rag.interface';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

// ── Helpers ────────────────────────────────────────────────────────────────

const TENANT_ID = 'combo-unit-tenant';

function mockCls(tenantId: string = TENANT_ID): any {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Combo Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest.fn((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  };
}

/** Stub fetch for HTTP-backed providers. Returns the given body on every call. */
function stubFetch(body: unknown, ok = true): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

/** Build RAG provider by name — using mock HTTP where needed. */
function makeRag(
  name: 'inmemory' | 'lightrag' | 'memgraph' | 'nano',
  tenantId = TENANT_ID,
): IRagService {
  const cls = mockCls(tenantId);
  switch (name) {
    case 'inmemory':
      return new InMemoryRagProvider(cls);
    case 'lightrag':
      return new LightRagProvider(cls, { baseUrl: 'http://localhost:19100' });
    case 'memgraph':
      return new MemgraphProvider(cls, { baseUrl: 'http://localhost:7474' });
    case 'nano':
      return new NanoGraphRagProvider(cls, { baseUrl: 'http://localhost:19300' });
  }
}

function makeAi(tenantId = TENANT_ID, response = 'RAG-augmented answer'): MockAiProvider {
  return new MockAiProvider(mockCls(tenantId), { defaultResponse: response });
}

/** Simulate the retrieve→augment→generate learning loop. */
async function ragAugmentedGenerate(
  rag: IRagService,
  ai: IAiProvider,
  query: string,
  namespace = 'default',
): Promise<{
  ragResult: DataProcessResult<Array<Record<string, unknown>>>;
  contextPack: DataProcessResult<Record<string, unknown>>;
  aiResult: DataProcessResult<Record<string, unknown>>;
  trainingSignal: Record<string, unknown>;
}> {
  const ragResult = await rag.search(query, { namespace, topK: 5 });
  const contextPack = await rag.buildContextPack(query, namespace);

  const contextText = contextPack.isSuccess
    ? ((contextPack.data!['context_text'] as string) ?? '')
    : '';

  const augmentedPrompt = contextText ? `Context:\n${contextText}\n\nQuestion: ${query}` : query;

  const aiResult = await ai.generate(augmentedPrompt);

  const hasContext = contextText.length > 0;
  const aiText = aiResult.isSuccess ? ((aiResult.data!['text'] as string) ?? '') : '';
  const qualityScore = hasContext && aiText.length > 10 ? 85 : 50;

  const trainingSignal: Record<string, unknown> = {
    query,
    rag_provider: (contextPack.data?.['provider'] as string) ?? 'unknown',
    context_doc_count: contextPack.isSuccess
      ? ((contextPack.data!['document_count'] as number) ?? 0)
      : 0,
    context_tokens: contextPack.isSuccess
      ? ((contextPack.data!['token_estimate'] as number) ?? 0)
      : 0,
    ai_response_length: aiText.length,
    quality_score: qualityScore,
    used_rag_context: hasContext,
    tenant_id: TENANT_ID,
    captured_at: new Date().toISOString(),
  };

  return { ragResult, contextPack, aiResult, trainingSignal };
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Interface compliance per provider ──────────────────────────────────

describe('All RAG providers implement IRagService', () => {
  const providers = ['inmemory', 'lightrag', 'memgraph', 'nano'] as const;

  for (const name of providers) {
    it(`${name}: implements IRagService`, () => {
      stubFetch({ results: [], data: [] });
      const rag = makeRag(name);
      expect(rag).toBeInstanceOf(IRagService);
      expect(typeof rag.search).toBe('function');
      expect(typeof rag.ingest).toBe('function');
      expect(typeof rag.buildContextPack).toBe('function');
      expect(typeof rag.deleteByFilter).toBe('function');
    });
  }

  it('all providers return DataProcessResult.failure on network error', async () => {
    const httpProviders = ['lightrag', 'memgraph', 'nano'] as const;
    for (const name of httpProviders) {
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'));
      const rag = makeRag(name);
      const result = await rag.search('q');
      expect(result).toBeInstanceOf(DataProcessResult);
      expect(result.isSuccess).toBe(false);
    }
  });
});

// ── 2. Combination unit tests: RAG × MockAi ──────────────────────────────

describe('InMemory RAG × MockAiProvider — retrieve→generate loop', () => {
  it('ingests then searches and generates with context', async () => {
    const rag = makeRag('inmemory');
    const ai = makeAi();

    await rag.ingest(
      [
        { content: 'DataProcessResult wraps all service responses in XIIGen', doc_id: 'doc1' },
        { content: 'Fabric interfaces make providers swappable at runtime', doc_id: 'doc2' },
      ],
      'patterns',
    );

    const { ragResult, aiResult, trainingSignal } = await ragAugmentedGenerate(
      rag,
      ai,
      'DataProcessResult',
      'patterns',
    );

    expect(ragResult.isSuccess).toBe(true);
    expect(aiResult.isSuccess).toBe(true);
    expect(trainingSignal['used_rag_context']).toBe(true);
    expect(trainingSignal['quality_score'] as number).toBeGreaterThanOrEqual(50);
  });

  it('AI still generates when RAG returns empty results (graceful degradation)', async () => {
    const rag = makeRag('inmemory');
    const ai = makeAi();

    const { ragResult, aiResult, trainingSignal } = await ragAugmentedGenerate(
      rag,
      ai,
      'unknown topic',
      'empty-ns',
    );

    expect(ragResult.isSuccess).toBe(true);
    expect(ragResult.data).toEqual([]);
    expect(aiResult.isSuccess).toBe(true);
    expect(trainingSignal['used_rag_context']).toBe(false);
  });
});

describe('LightRAG × MockAiProvider — retrieve→generate loop', () => {
  it('builds augmented prompt from LightRAG context pack', async () => {
    // Mock LightRAG search then query
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ content: 'LightRAG found: fabric pattern' }] }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ content: 'LightRAG found: fabric pattern' }] }),
        text: async () => '',
      } as Response);

    const rag = makeRag('lightrag');
    const ai = makeAi();

    const { contextPack, aiResult, trainingSignal } = await ragAugmentedGenerate(
      rag,
      ai,
      'fabric pattern',
    );

    expect(contextPack.isSuccess).toBe(true);
    expect(contextPack.data!['provider']).toBe('lightrag');
    expect(aiResult.isSuccess).toBe(true);
    expect(trainingSignal['rag_provider']).toBe('lightrag');
  });

  it('captures training signal with correct context_doc_count', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ content: 'doc 1' }, { content: 'doc 2' }] }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ content: 'doc 1' }, { content: 'doc 2' }] }),
        text: async () => '',
      } as Response);

    const rag = makeRag('lightrag');
    const ai = makeAi();

    const { trainingSignal } = await ragAugmentedGenerate(rag, ai, 'query');

    expect(trainingSignal['context_doc_count']).toBe(2);
  });
});

describe('Memgraph × MockAiProvider — retrieve→generate loop', () => {
  it('builds context from Memgraph graph nodes', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { columns: ['n'], data: [{ row: [{ content: 'graph node content', id: 'n1' }] }] },
          ],
          errors: [],
        }),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { columns: ['n'], data: [{ row: [{ content: 'graph node content', id: 'n1' }] }] },
          ],
          errors: [],
        }),
        text: async () => '',
      } as Response);

    const rag = makeRag('memgraph');
    const ai = makeAi();

    const { contextPack, aiResult, trainingSignal } = await ragAugmentedGenerate(
      rag,
      ai,
      'graph node',
    );

    expect(contextPack.isSuccess).toBe(true);
    expect(contextPack.data!['provider']).toBe('memgraph');
    expect(contextPack.data!['graph_label']).toBe('RagDoc');
    expect(aiResult.isSuccess).toBe(true);
    expect(trainingSignal['rag_provider']).toBe('memgraph');
  });
});

describe('NanoGraphRAG × MockAiProvider — retrieve→generate loop', () => {
  it('sends mode=local query and builds context', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ content: 'GraphRAG local retrieval result', score: 0.92 }],
      }),
      text: async () => '',
    } as Response);

    const rag = makeRag('nano');
    const ai = makeAi();

    const { contextPack, aiResult, trainingSignal } = await ragAugmentedGenerate(
      rag,
      ai,
      'GraphRAG retrieval',
    );

    expect(contextPack.data!['provider']).toBe('nano-graphrag');
    expect(contextPack.data!['mode']).toBe('local');
    expect(aiResult.isSuccess).toBe(true);
    expect(trainingSignal['quality_score'] as number).toBeGreaterThanOrEqual(50);

    // Verify mode was sent to server
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.mode).toBe('local');
  });

  it('global mode captures theme-level context', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ content: 'Global theme: multi-tenant architecture' }] }),
      text: async () => '',
    } as Response);

    const cls = mockCls();
    const rag = new NanoGraphRagProvider(cls, { defaultMode: 'global' });
    const ai = makeAi();

    const { contextPack } = await ragAugmentedGenerate(rag, ai, 'multi-tenant');

    expect(contextPack.data!['mode']).toBe('global');
  });
});

// ── 3. Logic tests: fallback, isolation, training signal integrity ─────────

describe('RAG combination logic — fallback when RAG unavailable', () => {
  const httpProviders: Array<['lightrag' | 'memgraph' | 'nano', string]> = [
    ['lightrag', 'lightrag'],
    ['memgraph', 'memgraph'],
    ['nano', 'nano-graphrag'],
  ];

  for (const [name, providerLabel] of httpProviders) {
    it(`${providerLabel}: AI generates without RAG when provider throws`, async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('service down'));

      const rag = makeRag(name);
      const ai = makeAi();

      const ragResult = await rag.search('query');
      const contextPack = await rag.buildContextPack('query', 'ns');
      const aiResult = await ai.generate('query');

      expect(ragResult.isSuccess).toBe(false);
      expect(contextPack.isSuccess).toBe(false);
      expect(aiResult.isSuccess).toBe(true); // AI must work regardless of RAG failure
    });
  }
});

describe('RAG combination logic — cross-tenant isolation', () => {
  it('InMemory: separate tenants cannot see each other docs', async () => {
    const ragA = makeRag('inmemory', 'tenant-A');
    const ragB = makeRag('inmemory', 'tenant-B');

    await ragA.ingest([{ content: 'tenant A secret doc', doc_id: 'a1' }], 'private');
    await ragB.ingest([{ content: 'tenant B secret doc', doc_id: 'b1' }], 'private');

    const resultsA = await ragA.search('secret', { namespace: 'private' });
    const resultsB = await ragB.search('secret', { namespace: 'private' });

    expect(resultsA.isSuccess).toBe(true);
    expect(resultsB.isSuccess).toBe(true);
    // Both find their own docs
    const contentsA = resultsA.data!.map((d) => d['content'] as string);
    const contentsB = resultsB.data!.map((d) => d['content'] as string);
    expect(contentsA.every((c) => c.includes('tenant A'))).toBe(true);
    expect(contentsB.every((c) => c.includes('tenant B'))).toBe(true);
  });

  it('HTTP providers: tenant IDs are namespaced in all requests', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const clsA = mockCls('corp-alpha');
    const clsB = mockCls('corp-beta');

    const lightragA = new LightRagProvider(clsA, {});
    const lightragB = new LightRagProvider(clsB, {});

    await lightragA.search('query');
    await lightragB.search('query');

    const body0 = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    const body1 = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(body0.workspace).toContain('corp-alpha');
    expect(body1.workspace).toContain('corp-beta');
    expect(body0.workspace).not.toContain('corp-beta');
    expect(body1.workspace).not.toContain('corp-alpha');
  });
});

describe('Training signal capture (P8) — format validation', () => {
  it('training signal contains all required P8 fields', async () => {
    const rag = makeRag('inmemory');
    const ai = makeAi();

    await rag.ingest([{ content: 'test content', doc_id: 'd1' }], 'ns');
    const { trainingSignal } = await ragAugmentedGenerate(rag, ai, 'test', 'ns');

    // P8 mandatory fields
    expect(trainingSignal['query']).toBeDefined();
    expect(trainingSignal['rag_provider']).toBeDefined();
    expect(typeof trainingSignal['quality_score']).toBe('number');
    expect(trainingSignal['tenant_id']).toBe(TENANT_ID);
    expect(trainingSignal['captured_at']).toBeDefined();
    expect(typeof trainingSignal['used_rag_context']).toBe('boolean');
    expect(typeof trainingSignal['context_doc_count']).toBe('number');
  });

  it('quality_score is higher when RAG context is available', async () => {
    const ragWithDocs = makeRag('inmemory');
    const ragEmpty = makeRag('inmemory');
    const ai = makeAi();

    await ragWithDocs.ingest([{ content: 'relevant context document', doc_id: 'd1' }], 'ns');

    const { trainingSignal: withCtx } = await ragAugmentedGenerate(
      ragWithDocs,
      ai,
      'relevant',
      'ns',
    );
    const { trainingSignal: noCtx } = await ragAugmentedGenerate(
      ragEmpty,
      ai,
      'relevant',
      'empty-ns',
    );

    expect(withCtx['quality_score'] as number).toBeGreaterThan(noCtx['quality_score'] as number);
    expect(withCtx['used_rag_context']).toBe(true);
    expect(noCtx['used_rag_context']).toBe(false);
  });

  it('training signals from 4 providers all share the same schema', async () => {
    const requiredFields = [
      'query',
      'rag_provider',
      'context_doc_count',
      'quality_score',
      'tenant_id',
      'used_rag_context',
    ];

    // InMemory
    const inMemoryRag = makeRag('inmemory');
    const { trainingSignal: ts1 } = await ragAugmentedGenerate(inMemoryRag, makeAi(), 'q', 'ns');

    // LightRAG (mocked)
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);
    const { trainingSignal: ts2 } = await ragAugmentedGenerate(
      makeRag('lightrag'),
      makeAi(),
      'q',
      'ns',
    );

    jest.restoreAllMocks();

    // Memgraph (mocked)
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ columns: ['n'], data: [] }], errors: [] }),
      text: async () => '',
    } as Response);
    const { trainingSignal: ts3 } = await ragAugmentedGenerate(
      makeRag('memgraph'),
      makeAi(),
      'q',
      'ns',
    );

    jest.restoreAllMocks();

    // Nano (mocked)
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);
    const { trainingSignal: ts4 } = await ragAugmentedGenerate(
      makeRag('nano'),
      makeAi(),
      'q',
      'ns',
    );

    for (const ts of [ts1, ts2, ts3, ts4]) {
      for (const field of requiredFields) {
        expect(ts[field]).toBeDefined();
      }
    }
  });
});

describe('RAG combination logic — namespace scoping', () => {
  it('InMemory: same query different namespaces returns independent results', async () => {
    const rag = makeRag('inmemory');
    await rag.ingest([{ content: 'skill block alpha', doc_id: 'd1' }], 'skills');
    await rag.ingest([{ content: 'code review beta', doc_id: 'd2' }], 'reviews');

    const skillResults = await rag.search('alpha', { namespace: 'skills' });
    const reviewResults = await rag.search('alpha', { namespace: 'reviews' });

    expect(skillResults.data!.length).toBeGreaterThan(0);
    expect(reviewResults.data!.length).toBe(0);
  });

  it('HTTP providers: namespace is encoded in workspace key', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const rag = new NanoGraphRagProvider(mockCls(), {});
    await rag.search('q', { namespace: 'skills-patterns' });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.workspace).toContain('skills-patterns');
    expect(body.workspace).toContain(TENANT_ID);
  });
});
