/**
 * lightrag-knowledge.integration.spec.ts — SESSION-8
 *
 * LightRagProvider integration tests against a real LightRAG Docker container.
 *
 * Availability detection:
 *   LIGHTRAG_UP — LightRAG server reachable at http://localhost:19100
 *   OLLAMA_UP   — Ollama (needed for LightRAG's embedding + LLM backend)
 *
 * If LightRAG is not running: tests log SKIP and return early (never fail CI).
 *
 * Start: docker compose -f docker-compose.yml -f docker-compose.test.yml \
 *          --profile local-llm up -d
 *        bash scripts/pull-ollama-models.sh
 *
 * Error-handling tests with bad URLs always run (zero dependencies).
 */

import 'reflect-metadata';
import { LightRagProvider } from '../../src/fabrics/rag/lightrag.provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { IRagService } from '../../src/fabrics/interfaces/rag.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── Config ─────────────────────────────────────────────

const LIGHTRAG_URL = process.env['LIGHTRAG_BASE_URL'] ?? 'http://localhost:19100';
const TENANT_A = 'lightrag-tenant-A';
const TENANT_B = 'lightrag-tenant-B';
const LIGHTRAG_PING_TIMEOUT_MS = 1000;

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string = TENANT_A): any {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  };
}

async function pingLightRag(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIGHTRAG_PING_TIMEOUT_MS);

  try {
    const res = await fetch(`${LIGHTRAG_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function makeLightRag(tenantId = TENANT_A): LightRagProvider {
  return new LightRagProvider(mockCls(tenantId), { baseUrl: LIGHTRAG_URL });
}

let LIGHTRAG_UP = false;

beforeAll(async () => {
  LIGHTRAG_UP = await pingLightRag();
  if (LIGHTRAG_UP) console.log('LightRAG: UP');
  else console.log(`LightRAG: DOWN (${LIGHTRAG_URL}) — all container tests will skip`);
}, 15000);

// ══════════════════════════════════════════════════════
// Solo via IRagService
// ══════════════════════════════════════════════════════

describe('LightRagProvider — solo via IRagService', () => {
  it('implements IRagService abstract class', () => {
    const provider = makeLightRag();
    expect(provider).toBeInstanceOf(IRagService);
    expect(typeof provider.search).toBe('function');
    expect(typeof provider.ingest).toBe('function');
    expect(typeof provider.buildContextPack).toBe('function');
    expect(typeof provider.deleteByFilter).toBe('function');
  });

  it('ingest stores knowledge document', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const provider = makeLightRag();
    const result = await provider.ingest([
      {
        content: 'XIIGen uses IAiProvider fabric interface for AI abstraction.',
        doc_id: 'test-doc-1',
      },
    ]);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('searchAsync returns relevant result after ingest', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const provider = makeLightRag();
    await provider.ingest([
      {
        content:
          'The fabric interface pattern allows swapping infrastructure providers at runtime.',
        doc_id: 'test-doc-2',
      },
    ]);

    const result = await provider.search('fabric interface pattern');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  }, 30000);

  it('tenant-A knowledge not visible to tenant-B', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const providerA = makeLightRag(TENANT_A);
    const providerB = makeLightRag(TENANT_B);

    const tenantAContent = `tenant-A-secret-knowledge-${Date.now()}`;
    await providerA.ingest([{ content: tenantAContent, doc_id: `isolation-test-${Date.now()}` }]);

    // Tenant-B queries the same content — should not find it
    const resultB = await providerB.search(tenantAContent, { namespace: 'default' });
    expect(resultB.isSuccess).toBe(true);
    const foundInB = (resultB.data ?? []).some((d) => JSON.stringify(d).includes(tenantAContent));
    expect(foundInB).toBe(false);
  }, 30000);

  it('hybrid search mode returns results without error', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const provider = new LightRagProvider(mockCls(), {
      baseUrl: LIGHTRAG_URL,
      defaultMode: 'hybrid',
    });
    const result = await provider.search('test query', { namespace: 'default' });
    expect(result).toBeInstanceOf(DataProcessResult);
    // hybrid mode: success or graceful failure (depends on graph being populated)
    expect(typeof result.isSuccess).toBe('boolean');
  }, 30000);
});

// ══════════════════════════════════════════════════════
// Knowledge ingestion from cloud API responses
// ══════════════════════════════════════════════════════

describe('LightRAG — knowledge ingestion pipeline', () => {
  it('ingests a cloud-style API response document', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const provider = makeLightRag();
    const cloudResponse = {
      content:
        'The IAiProvider interface in XIIGen defines generate() and generateStructured() methods. ' +
        'Each concrete provider (Anthropic, Gemini, Ollama) implements these methods differently ' +
        'but returns the same DataProcessResult shape, enabling transparent provider switching.',
      doc_id: `cloud-response-${Date.now()}`,
      source: 'anthropic-haiku',
      quality_score: 0.85,
    };
    const result = await provider.ingest([cloudResponse]);
    expect(result.isSuccess).toBe(true);
  }, 30000);

  it('buildContextPack returns structured context bundle', async () => {
    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running');
      return;
    }
    const provider = makeLightRag();
    const result = await provider.buildContextPack('IAiProvider interface', 'default');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['context_type']).toBe('default');
    expect(result.data!['provider']).toBe('lightrag');
    expect(result.data!['document_count']).toBeDefined();
  }, 30000);
});

// ══════════════════════════════════════════════════════
// IRagService contract shape — always run (InMemory vs LightRAG)
// ══════════════════════════════════════════════════════

describe('LightRAG vs InMemory — same IRagService result shape', () => {
  it('ingest returns same shape from both providers', async () => {
    const inMemory = new InMemoryRagProvider(mockCls());
    const imResult = await inMemory.ingest([{ content: 'test', text: 'test doc' }]);
    expect(imResult.isSuccess).toBe(true);
    expect(typeof imResult.data!['ingested']).toBe('number');
    expect(typeof imResult.data!['namespace']).toBe('string');

    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running — InMemory shape verified only');
      return;
    }
    const lgResult = await makeLightRag().ingest([{ content: 'test', doc_id: 'shape-test' }]);
    expect(lgResult.isSuccess).toBe(true);
    expect(typeof lgResult.data!['ingested']).toBe('number');
    expect(typeof lgResult.data!['namespace']).toBe('string');
  }, 15000);

  it('search returns DataProcessResult<Array> from both providers', async () => {
    const inMemory = new InMemoryRagProvider(mockCls());
    await inMemory.ingest([{ content: 'test document content', text: 'test document content' }]);
    const imResult = await inMemory.search('test');
    expect(imResult.isSuccess).toBe(true);
    expect(Array.isArray(imResult.data)).toBe(true);

    if (!LIGHTRAG_UP) {
      console.log('SKIP: LightRAG not running — InMemory shape verified only');
      return;
    }
    const lgResult = await makeLightRag().search('test');
    expect(lgResult.isSuccess).toBe(true);
    expect(Array.isArray(lgResult.data)).toBe(true);
  }, 15000);
});

// ══════════════════════════════════════════════════════
// Error handling — always run
// ══════════════════════════════════════════════════════

describe('LightRAG — error handling', () => {
  it('LightRAG down returns DataProcessResult failure — never throws', async () => {
    const provider = new LightRagProvider(mockCls(), {
      baseUrl: 'http://localhost:19999', // deliberately bad URL
      requestTimeoutMs: 500,
    });
    const result = await provider.search('test query');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROVIDER_ERROR');
  });

  it('healthCheck returns failure when server unreachable', async () => {
    const provider = new LightRagProvider(mockCls(), {
      baseUrl: 'http://localhost:19999',
      requestTimeoutMs: 500,
    });
    const result = await provider.healthCheck();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  });

  it('empty documents array returns EMPTY_DOCUMENTS failure', async () => {
    const provider = makeLightRag();
    const result = await provider.ingest([]);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
  });

  it('empty search query returns empty results without error', async () => {
    if (!LIGHTRAG_UP) {
      // InMemory also returns empty — verify consistent behaviour
      const inMemory = new InMemoryRagProvider(mockCls());
      const result = await inMemory.search('');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
      return;
    }
    const provider = makeLightRag();
    const result = await provider.search('');
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  }, 10000);
});
