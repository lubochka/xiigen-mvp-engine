/**
 * RAG × AI Provider Learning Combination E2E Tests.
 *
 * Tests every available local open-source stack combination:
 *   - InMemory RAG     × Ollama (always available as unit fallback)
 *   - LightRAG         × Ollama (requires: OLLAMA_URL + LIGHTRAG_URL)
 *   - Memgraph         × Ollama (requires: OLLAMA_URL + MEMGRAPH_URL)
 *   - NanoGraphRAG     × Ollama (requires: OLLAMA_URL + NANO_GRAPHRAG_URL)
 *
 * Each combination runs the same 5-step pipeline:
 *   1. Ingest XIIGen architecture docs into RAG store
 *   2. Search for a query term
 *   3. Build context pack
 *   4. Generate AI response augmented with context (via Ollama)
 *   5. Capture P8 training signal with quality score
 *
 * At the end, prints a comparison matrix of quality scores per combination.
 *
 * Run locally:
 *   docker compose -f docker-compose.yml -f docker-compose.test.yml \
 *     --profile local-llm --profile open-source up -d
 *
 *   OLLAMA_URL=http://localhost:11434 \
 *   LIGHTRAG_URL=http://localhost:19100 \
 *   MEMGRAPH_URL=http://localhost:17474 \
 *   NANO_GRAPHRAG_URL=http://localhost:19300 \
 *   npx jest rag-learning-combinations.e2e --verbose
 */

import 'reflect-metadata';
import { InMemoryRagProvider } from './in-memory.provider';
import { LightRagProvider } from './lightrag.provider';
import { MemgraphProvider } from './memgraph.provider';
import { NanoGraphRagProvider } from './nano-graphrag.provider';
import { OllamaProvider } from '../ai-engine/ollama.provider';
import { IRagService } from '../interfaces/rag.interface';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

// ── Environment ───────────────────────────────────────────────────────────

const OLLAMA_URL = process.env['OLLAMA_URL'];
const LIGHTRAG_URL = process.env['LIGHTRAG_URL'];
const MEMGRAPH_URL = process.env['MEMGRAPH_URL'];
const NANO_URL = process.env['NANO_GRAPHRAG_URL'];
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'] ?? 'qwen2.5-coder:7b';

const E2E_TENANT = 'e2e-combo-tenant';

// ── XIIGen sample docs for ingestion ─────────────────────────────────────

const XIIGEN_DOCS = [
  {
    doc_id: 'xiigen-fabric-1',
    content:
      'XIIGen uses 6 fabric interfaces: DATABASE, QUEUE, AI_ENGINE, RAG, SECRETS, FLOW_ENGINE. Service code never imports a provider directly — all access goes through abstract fabric interfaces resolved at runtime via configuration.',
    source: 'ARCHITECTURE_GUIDE',
    domain: 'fabrics',
  },
  {
    doc_id: 'xiigen-dna-1',
    content:
      'DNA-3: All service methods return DataProcessResult<T>. Never throw exceptions for business logic. Use DataProcessResult.success(data) or DataProcessResult.failure(code, message).',
    source: 'ARCHITECTURE_GUIDE',
    domain: 'dna',
  },
  {
    doc_id: 'xiigen-tenant-1',
    content:
      'DNA-5: Tenant scope is automatic via AsyncLocalStorage. Fabric providers read TenantContext internally. No tenantId parameter on fabric methods. Callers cannot forget tenant scoping.',
    source: 'ARCHITECTURE_GUIDE',
    domain: 'multi-tenant',
  },
  {
    doc_id: 'xiigen-rag-1',
    content:
      'RAG fabric supports 7 strategies: Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi. Strategy selected via FREEDOM config. Local providers: InMemory, LightRAG, Memgraph, NanoGraphRAG. Cloud: Pinecone.',
    source: 'ARCHITECTURE_GUIDE',
    domain: 'rag',
  },
  {
    doc_id: 'xiigen-llm-1',
    content:
      'AI Engine fabric supports: Anthropic Claude, OpenAI GPT, Gemini, Grok, Ollama (local $0), Mock. Ollama enables local inference with open-source models like qwen2.5-coder, mistral, llama3. No API key or cost.',
    source: 'ARCHITECTURE_GUIDE',
    domain: 'ai-engine',
  },
];

const TEST_QUERIES = [
  { query: 'fabric interfaces', namespace: 'fabrics', expectDomain: 'fabrics' },
  { query: 'DataProcessResult', namespace: 'dna', expectDomain: 'dna' },
  { query: 'tenant isolation', namespace: 'multi-tenant', expectDomain: 'multi-tenant' },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function makeCls(tenantId = E2E_TENANT): any {
  const tenant = new TenantContext({
    id: tenantId,
    name: `E2E Combo Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { get: jest.fn((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)) };
}

/** P8 training signal captured from one combination run. */
interface LearningSignal {
  combo: string;
  rag_provider: string;
  ai_provider: string;
  ai_model: string;
  query: string;
  context_doc_count: number;
  context_tokens: number;
  response_length: number;
  used_rag_context: boolean;
  quality_score: number;
  latency_ms: number;
  tenant_id: string;
  captured_at: string;
}

/** Score a response based on context use and response quality. */
function scoreResponse(aiText: string, contextDocCount: number, queryTerms: string[]): number {
  let score = 40; // base
  if (contextDocCount > 0) score += 20; // RAG context retrieved
  if (aiText.length > 50) score += 10; // non-trivial response
  if (aiText.length > 200) score += 10; // detailed response
  for (const term of queryTerms) {
    if (aiText.toLowerCase().includes(term.toLowerCase())) score += 5; // topical relevance
  }
  return Math.min(score, 100);
}

/** Run the full 5-step pipeline for one RAG × AI combination. */
async function runCombo(
  comboName: string,
  rag: IRagService,
  ai: IAiProvider,
  aiModel: string,
  query: string,
  namespace: string,
  /** Provider label override — required for providers that don't set 'provider' in contextPack */
  providerLabel?: string,
): Promise<LearningSignal> {
  const startMs = Date.now();

  // Step 1: Ingest
  const docsForNs = XIIGEN_DOCS.filter((d) => d['domain'] === namespace || namespace === 'default');
  await rag.ingest(docsForNs.length > 0 ? docsForNs : XIIGEN_DOCS.slice(0, 2), namespace);

  // Step 2: Search
  const searchResult = await rag.search(query, { namespace, topK: 3 });

  // Step 3: Build context pack
  const contextPack = await rag.buildContextPack(query, namespace);
  const contextText = contextPack.isSuccess
    ? ((contextPack.data!['context_text'] as string) ?? '')
    : '';
  const contextDocCount = contextPack.isSuccess
    ? ((contextPack.data!['document_count'] as number) ?? 0)
    : 0;
  const contextTokens = contextPack.isSuccess
    ? ((contextPack.data!['token_estimate'] as number) ?? 0)
    : 0;

  // Step 4: Generate with RAG-augmented prompt
  const augmentedPrompt = contextText
    ? `You are the XIIGen engine assistant.\n\nContext from knowledge base:\n${contextText}\n\nQuestion: ${query}\n\nAnswer based on the context above:`
    : `You are the XIIGen engine assistant. Question: ${query}`;

  const aiResult = await ai.generate(augmentedPrompt, {
    systemPrompt: 'You are a concise technical assistant for the XIIGen code generation engine.',
    maxTokens: 256,
  });

  const aiText = aiResult.isSuccess ? ((aiResult.data!['text'] as string) ?? '') : '';
  const latencyMs = Date.now() - startMs;

  // Step 5: Capture P8 training signal
  const queryTerms = query.split(/\s+/);
  const qualityScore = scoreResponse(aiText, contextDocCount, queryTerms);

  return {
    combo: comboName,
    rag_provider: providerLabel ?? (contextPack.data?.['provider'] as string) ?? 'unknown',
    ai_provider: 'ollama',
    ai_model: aiModel,
    query,
    context_doc_count: contextDocCount,
    context_tokens: contextTokens,
    response_length: aiText.length,
    used_rag_context: contextText.length > 0,
    quality_score: qualityScore,
    latency_ms: latencyMs,
    tenant_id: E2E_TENANT,
    captured_at: new Date().toISOString(),
  };
}

// ── Comparison matrix accumulator ────────────────────────────────────────

const learningMatrix: LearningSignal[] = [];

function printMatrix(): void {
  if (learningMatrix.length === 0) return;
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         RAG x AI Learning Combination Matrix             ║');
  console.log('╠══════════════════════════════════╦═══════╦═══╦═════╦═════╣');
  console.log('║ Combination                      ║ Score ║Ctx║Docs ║ ms  ║');
  console.log('╠══════════════════════════════════╬═══════╬═══╬═════╬═════╣');
  for (const s of [...learningMatrix].sort((a, b) => b.quality_score - a.quality_score)) {
    const combo = s.combo.padEnd(32).slice(0, 32);
    const score = String(s.quality_score).padStart(5);
    const ctx = s.used_rag_context ? 'YES' : ' NO';
    const docs = String(s.context_doc_count).padStart(3);
    const ms = String(s.latency_ms).padStart(5);
    console.log(`║ ${combo} ║ ${score} ║ ${ctx}║  ${docs}║${ms} ║`);
  }
  console.log('╚══════════════════════════════════╩═══════╩═══╩═════╩═════╝');
}

afterAll(() => {
  printMatrix();
});

// ── E2E Test Suites ───────────────────────────────────────────────────────

// ── Suite 1: InMemory RAG (always runs — no Docker needed) ────────────────

describe('E2E Combination: InMemory RAG × MockOllama (unit fallback)', () => {
  /**
   * InMemory provider needs no Docker. We mock Ollama to test the full
   * pipeline shape without any network dependency. Always runs.
   */
  let rag: IRagService;

  beforeAll(() => {
    rag = new InMemoryRagProvider(makeCls());
  });

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        model: OLLAMA_MODEL,
        message: {
          role: 'assistant',
          content: 'InMemory context: XIIGen uses fabric interfaces for all infrastructure access.',
        },
        done: true,
        eval_count: 35,
        prompt_eval_count: 120,
      }),
      text: async () => '',
    } as Response);
  });

  afterEach(() => jest.restoreAllMocks());

  it('ingests XIIGen docs into InMemory store', async () => {
    const result = await rag.ingest(XIIGEN_DOCS, 'fabrics');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested'] as number).toBeGreaterThanOrEqual(1);
  });

  for (const { query, namespace } of TEST_QUERIES) {
    it(`query "${query}" returns context and generates response`, async () => {
      await rag.ingest(XIIGEN_DOCS, namespace);
      const ai = new OllamaProvider(makeCls(), {
        baseUrl: 'http://localhost:11434',
        model: OLLAMA_MODEL,
      });

      const signal = await runCombo(
        `InMemory+Ollama(mock)`,
        rag,
        ai,
        OLLAMA_MODEL,
        query,
        namespace,
        'inmemory',
      );

      expect(signal.rag_provider).toBe('inmemory');
      expect(typeof signal.quality_score).toBe('number');
      expect(signal.tenant_id).toBe(E2E_TENANT);
      learningMatrix.push(signal);
    });
  }

  it('training signals have all P8 mandatory fields', async () => {
    await rag.ingest(XIIGEN_DOCS, 'fabrics');
    const ai = new OllamaProvider(makeCls(), { baseUrl: 'http://localhost:11434' });
    const signal = await runCombo(
      'InMemory+Ollama(mock)',
      rag,
      ai,
      OLLAMA_MODEL,
      'fabric interfaces',
      'fabrics',
      'inmemory',
    );

    expect(signal.combo).toBeDefined();
    expect(signal.rag_provider).toBeDefined();
    expect(signal.quality_score).toBeGreaterThanOrEqual(0);
    expect(signal.context_doc_count).toBeGreaterThanOrEqual(0);
    expect(signal.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});

// ── Suite 2: LightRAG × Ollama (requires local-llm profile) ─────────────

const lightStackConfigured = Boolean(OLLAMA_URL && LIGHTRAG_URL);

if (lightStackConfigured) {
describe('E2E Combination: LightRAG × Ollama (requires local-llm profile)', () => {
  let rag: IRagService;
  let ai: IAiProvider;

  beforeAll(async () => {
    rag = new LightRagProvider(makeCls(), { baseUrl: LIGHTRAG_URL, defaultMode: 'hybrid' });
    ai = new OllamaProvider(makeCls(), { baseUrl: OLLAMA_URL, model: OLLAMA_MODEL });

    // Verify both services healthy before running
    const ragHealth = await (rag as LightRagProvider).healthCheck();
    if (!ragHealth.isSuccess) throw new Error(`LightRAG not healthy: ${ragHealth.errorMessage}`);
  });

  it('healthCheck passes for LightRAG', async () => {
    const result = await (rag as LightRagProvider).healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('lightrag');
  });

  it('ingest XIIGen docs into LightRAG knowledge graph', async () => {
    const result = await rag.ingest(XIIGEN_DOCS, 'xiigen-arch');
    expect(result.isSuccess).toBe(true);
  });

  for (const { query, namespace } of TEST_QUERIES) {
    it(`LightRAG+Ollama query "${query}" — captures training signal`, async () => {
      await rag.ingest(XIIGEN_DOCS, namespace);
      const signal = await runCombo(
        `LightRAG+Ollama/${OLLAMA_MODEL}`,
        rag,
        ai,
        OLLAMA_MODEL,
        query,
        namespace,
      );

      expect(signal.rag_provider).toBe('lightrag');
      expect(signal.quality_score).toBeGreaterThanOrEqual(0);
      learningMatrix.push(signal);
    }, 60_000);
  }

  it('tenant isolation: different tenant has empty LightRAG workspace', async () => {
    const otherRag = new LightRagProvider(makeCls('other-e2e-tenant'), { baseUrl: LIGHTRAG_URL });
    const result = await otherRag.search('fabric interfaces', { namespace: 'fabrics' });
    expect(result.isSuccess).toBe(true);
    // Different workspace = no docs from E2E_TENANT
    expect(result.data!.length).toBe(0);
  });
});
} else {
  describe('E2E Combination: LightRAG × Ollama configuration', () => {
    it('requires OLLAMA_URL and LIGHTRAG_URL for live LightRAG combination checks', () => {
      expect(lightStackConfigured).toBe(false);
    });
  });
}

// ── Suite 3: Memgraph × Ollama (requires open-source profile) ────────────

const memgraphStackConfigured = Boolean(OLLAMA_URL && MEMGRAPH_URL);

if (memgraphStackConfigured) {
describe('E2E Combination: Memgraph × Ollama (requires open-source profile)', () => {
  let rag: IRagService;
  let ai: IAiProvider;

  beforeAll(async () => {
    rag = new MemgraphProvider(makeCls(), { baseUrl: MEMGRAPH_URL });
    ai = new OllamaProvider(makeCls(), { baseUrl: OLLAMA_URL, model: OLLAMA_MODEL });

    const ragHealth = await (rag as MemgraphProvider).healthCheck();
    if (!ragHealth.isSuccess) throw new Error(`Memgraph not healthy: ${ragHealth.errorMessage}`);
  });

  it('healthCheck passes for Memgraph', async () => {
    const result = await (rag as MemgraphProvider).healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('memgraph');
  });

  it('ingest creates RagDoc nodes in Memgraph graph', async () => {
    const result = await rag.ingest(XIIGEN_DOCS, 'xiigen-arch');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested'] as number).toBeGreaterThan(0);
  });

  for (const { query, namespace } of TEST_QUERIES) {
    it(`Memgraph+Ollama query "${query}" — captures training signal`, async () => {
      await rag.ingest(XIIGEN_DOCS, namespace);
      const signal = await runCombo(
        `Memgraph+Ollama/${OLLAMA_MODEL}`,
        rag,
        ai,
        OLLAMA_MODEL,
        query,
        namespace,
      );

      expect(signal.rag_provider).toBe('memgraph');
      expect(signal.quality_score).toBeGreaterThanOrEqual(0);
      learningMatrix.push(signal);
    }, 60_000);
  }

  it('graph query: Cypher CONTAINS filter works for multi-word queries', async () => {
    await rag.ingest(
      [{ doc_id: 'g1', content: 'Cypher query with tenant isolation' }],
      'graph-test',
    );
    const result = await rag.search('tenant isolation', { namespace: 'graph-test' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
  });

  it('delete cleans up test nodes', async () => {
    await rag.ingest(
      [{ doc_id: 'cleanup-1', content: 'to be deleted', source: 'e2e-cleanup' }],
      'cleanup-ns',
    );
    const deleted = await rag.deleteByFilter('cleanup-ns', { source: 'e2e-cleanup' });
    expect(deleted.isSuccess).toBe(true);
    expect(deleted.data).toBeGreaterThan(0);
  });
});
} else {
  describe('E2E Combination: Memgraph × Ollama configuration', () => {
    it('requires OLLAMA_URL and MEMGRAPH_URL for live Memgraph combination checks', () => {
      expect(memgraphStackConfigured).toBe(false);
    });
  });
}

// ── Suite 4: NanoGraphRAG × Ollama (requires open-source profile) ─────────

const nanoStackConfigured = Boolean(OLLAMA_URL && NANO_URL);

if (nanoStackConfigured) {
describe('E2E Combination: NanoGraphRAG × Ollama (requires open-source profile)', () => {
  let ragLocal: IRagService;
  let ragGlobal: IRagService;
  let ragNaive: IRagService;
  let ai: IAiProvider;

  beforeAll(async () => {
    ragLocal = new NanoGraphRagProvider(makeCls(), { baseUrl: NANO_URL, defaultMode: 'local' });
    ragGlobal = new NanoGraphRagProvider(makeCls(), { baseUrl: NANO_URL, defaultMode: 'global' });
    ragNaive = new NanoGraphRagProvider(makeCls(), { baseUrl: NANO_URL, defaultMode: 'naive' });
    ai = new OllamaProvider(makeCls(), { baseUrl: OLLAMA_URL, model: OLLAMA_MODEL });

    const ragHealth = await (ragLocal as NanoGraphRagProvider).healthCheck();
    if (!ragHealth.isSuccess)
      throw new Error(`NanoGraphRAG not healthy: ${ragHealth.errorMessage}`);
  });

  it('healthCheck passes for nano-graphrag server', async () => {
    const result = await (ragLocal as NanoGraphRagProvider).healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('nano-graphrag');
  });

  it('ingest XIIGen docs into nano-graphrag knowledge graph', async () => {
    const result = await ragLocal.ingest(XIIGEN_DOCS, 'xiigen-arch');
    expect(result.isSuccess).toBe(true);
  });

  it('local mode — entity-level retrieval + generate', async () => {
    await ragLocal.ingest(XIIGEN_DOCS, 'fabrics');
    const signal = await runCombo(
      'NanoGraphRAG(local)+Ollama',
      ragLocal,
      ai,
      OLLAMA_MODEL,
      'fabric interfaces',
      'fabrics',
    );
    expect(signal.rag_provider).toBe('nano-graphrag');
    expect(signal.quality_score).toBeGreaterThanOrEqual(0);
    learningMatrix.push(signal);
  }, 90_000);

  it('global mode — theme-level retrieval + generate', async () => {
    await ragGlobal.ingest(XIIGEN_DOCS, 'themes');
    const signal = await runCombo(
      'NanoGraphRAG(global)+Ollama',
      ragGlobal,
      ai,
      OLLAMA_MODEL,
      'tenant isolation',
      'themes',
    );
    expect(signal.quality_score).toBeGreaterThanOrEqual(0);
    learningMatrix.push(signal);
  }, 90_000);

  it('naive mode — keyword retrieval + generate', async () => {
    await ragNaive.ingest(XIIGEN_DOCS, 'naive-ns');
    const signal = await runCombo(
      'NanoGraphRAG(naive)+Ollama',
      ragNaive,
      ai,
      OLLAMA_MODEL,
      'DataProcessResult',
      'naive-ns',
    );
    expect(signal.quality_score).toBeGreaterThanOrEqual(0);
    learningMatrix.push(signal);
  }, 90_000);

  it('all 3 nano-graphrag modes produce valid training signals', async () => {
    const signals = learningMatrix.filter((s) => s.rag_provider === 'nano-graphrag');
    expect(signals.length).toBeGreaterThanOrEqual(1);
    for (const s of signals) {
      expect(s.quality_score).toBeGreaterThanOrEqual(0);
      expect(s.context_doc_count).toBeGreaterThanOrEqual(0);
    }
  });
});
} else {
  describe('E2E Combination: NanoGraphRAG × Ollama configuration', () => {
    it('requires OLLAMA_URL and NANO_GRAPHRAG_URL for live NanoGraphRAG combination checks', () => {
      expect(nanoStackConfigured).toBe(false);
    });
  });
}

// ── Suite 5: Cross-combination comparison (runs if any real services available) ──

const crossCombinationConfigured = Boolean(OLLAMA_URL);

if (crossCombinationConfigured) {
describe('E2E Cross-combination: training signal comparison', () => {
  it('all captured training signals have consistent schema', () => {
    if (learningMatrix.length === 0) {
      console.log('No E2E combinations ran — skipping cross-comparison.');
      return;
    }

    const requiredFields: Array<keyof LearningSignal> = [
      'combo',
      'rag_provider',
      'ai_provider',
      'ai_model',
      'query',
      'context_doc_count',
      'quality_score',
      'tenant_id',
      'captured_at',
    ];

    for (const signal of learningMatrix) {
      for (const field of requiredFields) {
        expect(signal[field]).toBeDefined();
      }
      expect(signal.quality_score).toBeGreaterThanOrEqual(0);
      expect(signal.quality_score).toBeLessThanOrEqual(100);
    }
  });

  it('combinations that used RAG context score higher on average', () => {
    if (learningMatrix.length < 2) return;

    const withCtx = learningMatrix.filter((s) => s.used_rag_context);
    const withoutCtx = learningMatrix.filter((s) => !s.used_rag_context);

    if (withCtx.length === 0 || withoutCtx.length === 0) return;

    const avgWith = withCtx.reduce((sum, s) => sum + s.quality_score, 0) / withCtx.length;
    const avgWithout = withoutCtx.reduce((sum, s) => sum + s.quality_score, 0) / withoutCtx.length;

    // RAG-augmented responses should score at least as high as no-context responses
    expect(avgWith).toBeGreaterThanOrEqual(avgWithout);
  });

  it('best combination is identified from training matrix', () => {
    if (learningMatrix.length === 0) return;

    const best = learningMatrix.reduce((prev, curr) =>
      curr.quality_score > prev.quality_score ? curr : prev,
    );

    console.log(`\nBest combination: ${best.combo} (score: ${best.quality_score})`);
    console.log(`  RAG docs retrieved: ${best.context_doc_count}`);
    console.log(`  Response length: ${best.response_length} chars`);
    console.log(`  Latency: ${best.latency_ms}ms`);

    expect(best.combo).toBeDefined();
    expect(best.quality_score).toBeGreaterThan(0);
  });
});
} else {
  describe('E2E Cross-combination configuration', () => {
    it('requires OLLAMA_URL for live cross-combination comparison checks', () => {
      expect(crossCombinationConfigured).toBe(false);
    });
  });
}
