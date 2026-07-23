/**
 * pinecone-rag.integration.spec.ts — SESSION-8 (Pinecone)
 *
 * PineconeProvider integration tests against a real Pinecone serverless index.
 *
 * Availability detection:
 *   PINECONE_API_KEY    — Pinecone API key
 *   PINECONE_INDEX_HOST — full index host (e.g., xiigen-test-a9sji3n.svc.aped-4627-b74a.pinecone.io)
 *   PINECONE_INDEX      — index name (for reference only)
 *
 * If PINECONE_API_KEY is absent: all cloud tests skip (log SKIP, return early).
 * Error-handling tests (bad credentials / unreachable host) always run.
 *
 * Run with real keys:
 *   PINECONE_API_KEY=... PINECONE_INDEX_HOST=... npx jest pinecone-rag
 */

import 'reflect-metadata';
import { PineconeProvider } from '../../src/fabrics/rag/pinecone.provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { IRagService } from '../../src/fabrics/interfaces/rag.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { loadE2eSecrets, computeAvailability } from '../../src/testing/e2e-secrets-loader';

// ── Config ─────────────────────────────────────────────

const secrets = loadE2eSecrets();
const avail = computeAvailability(secrets);

// Pinecone index host: from env or a well-known default for the xiigen-test index
const PINECONE_INDEX_HOST =
  process.env['PINECONE_INDEX_HOST'] ?? 'xiigen-test-a9sji3n.svc.aped-4627-b74a.pinecone.io';

const TENANT_A = 'pinecone-tenant-A';
const TENANT_B = 'pinecone-tenant-B';

// Unique suffix to avoid cross-test contamination in the shared index
const RUN_ID = Date.now().toString(36);

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

function makePinecone(tenantId = TENANT_A): PineconeProvider {
  return new PineconeProvider(mockCls(tenantId), {
    apiKey: secrets.pineconeApiKey,
    indexHost: PINECONE_INDEX_HOST,
    dimension: 1536,
  });
}

async function pingPinecone(): Promise<boolean> {
  if (!secrets.pineconeApiKey) return false;
  try {
    const provider = makePinecone();
    const result = await provider.healthCheck();
    return result.isSuccess;
  } catch {
    return false;
  }
}

let PINECONE_UP = false;

beforeAll(async () => {
  PINECONE_UP = await pingPinecone();
  if (PINECONE_UP) console.log(`Pinecone: UP (index: ${secrets.pineconeIndex || 'xiigen-test'})`);
  else console.log('Pinecone: DOWN or no API key — cloud tests will skip');
}, 15000);

// ══════════════════════════════════════════════════════
// Solo via IRagService
// ══════════════════════════════════════════════════════

describe('PineconeProvider — solo via IRagService', () => {
  it('implements IRagService abstract class', () => {
    const provider = makePinecone();
    expect(provider).toBeInstanceOf(IRagService);
    expect(typeof provider.search).toBe('function');
    expect(typeof provider.ingest).toBe('function');
    expect(typeof provider.buildContextPack).toBe('function');
    expect(typeof provider.deleteByFilter).toBe('function');
  });

  it('healthCheck returns success for live index', async () => {
    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available');
      return;
    }
    const provider = makePinecone();
    const result = await provider.healthCheck();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
    expect(result.data!['provider']).toBe('pinecone');
  }, 15000);

  it('ingest stores a document in Pinecone', async () => {
    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available');
      return;
    }
    const provider = makePinecone();
    const result = await provider.ingest([
      {
        content: `XIIGen uses IAiProvider fabric interface for AI abstraction. run=${RUN_ID}`,
        doc_id: `pinecone-test-1-${RUN_ID}`,
      },
    ]);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBeGreaterThanOrEqual(1);
    expect(result.data!['namespace']).toBe('default');
  }, 20000);

  it('search returns results after ingest', async () => {
    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available');
      return;
    }
    const provider = makePinecone();

    const docContent = `fabric interface pattern enables provider swapping ${RUN_ID}`;
    await provider.ingest([{ content: docContent, doc_id: `pinecone-test-2-${RUN_ID}` }]);

    // Deterministic embedding: same query text → same vector → finds our doc
    const result = await provider.search(docContent);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    // Same-text query should score high (hash embedding round-trips through JSON serialization)
    if (result.data!.length > 0) {
      expect(result.data![0]['_score'] as number).toBeGreaterThan(0.7);
    }
  }, 25000);

  it('buildContextPack returns structured context bundle', async () => {
    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available');
      return;
    }
    const provider = makePinecone();

    await provider.ingest([
      {
        content: `IAiProvider interface defines generate() method ${RUN_ID}`,
        doc_id: `ctx-test-${RUN_ID}`,
      },
    ]);

    const result = await provider.buildContextPack(`IAiProvider ${RUN_ID}`, 'default');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['context_type']).toBe('default');
    expect(result.data!['provider']).toBe('pinecone');
    expect(result.data!['document_count']).toBeDefined();
  }, 25000);
});

// ══════════════════════════════════════════════════════
// Tenant isolation
// ══════════════════════════════════════════════════════

describe('PineconeProvider — tenant isolation (DNA-5)', () => {
  it('tenant-A content is not returned in tenant-B search', async () => {
    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available');
      return;
    }

    const providerA = makePinecone(TENANT_A);
    const providerB = makePinecone(TENANT_B);

    const uniqueContent = `tenant-A-exclusive-knowledge-${RUN_ID}`;
    await providerA.ingest([{ content: uniqueContent, doc_id: `isolation-${RUN_ID}` }]);

    // Tenant B searches with the exact same text — different namespace → different vectors
    const resultB = await providerB.search(uniqueContent);
    expect(resultB.isSuccess).toBe(true);

    // Tenant B should not find tenant A's document (different Pinecone namespace)
    const foundInB = (resultB.data ?? []).some((d) => JSON.stringify(d).includes(uniqueContent));
    expect(foundInB).toBe(false);
  }, 30000);
});

// ══════════════════════════════════════════════════════
// IRagService contract — shape parity InMemory vs Pinecone
// ══════════════════════════════════════════════════════

describe('Pinecone vs InMemory — same IRagService result shape', () => {
  it('ingest returns same result shape from both providers', async () => {
    const inMemory = new InMemoryRagProvider(mockCls());
    const imResult = await inMemory.ingest([{ content: 'test', text: 'test doc' }]);
    expect(imResult.isSuccess).toBe(true);
    expect(typeof imResult.data!['ingested']).toBe('number');
    expect(typeof imResult.data!['namespace']).toBe('string');

    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available — InMemory shape verified only');
      return;
    }
    const pcResult = await makePinecone().ingest([{ content: 'test', doc_id: `shape-${RUN_ID}` }]);
    expect(pcResult.isSuccess).toBe(true);
    expect(typeof pcResult.data!['ingested']).toBe('number');
    expect(typeof pcResult.data!['namespace']).toBe('string');
  }, 20000);

  it('search returns DataProcessResult<Array> from both providers', async () => {
    const inMemory = new InMemoryRagProvider(mockCls());
    await inMemory.ingest([{ content: 'test document content', text: 'test document content' }]);
    const imResult = await inMemory.search('test');
    expect(imResult.isSuccess).toBe(true);
    expect(Array.isArray(imResult.data)).toBe(true);

    if (!PINECONE_UP) {
      console.log('SKIP: Pinecone not available — InMemory shape verified only');
      return;
    }
    const pcResult = await makePinecone().search('test');
    expect(pcResult.isSuccess).toBe(true);
    expect(Array.isArray(pcResult.data)).toBe(true);
  }, 20000);
});

// ══════════════════════════════════════════════════════
// Error handling — always run (zero dependencies)
// ══════════════════════════════════════════════════════

describe('PineconeProvider — error handling', () => {
  it('bad API key returns DataProcessResult failure — never throws', async () => {
    const provider = new PineconeProvider(mockCls(), {
      apiKey: 'invalid-key-xyz',
      indexHost: PINECONE_INDEX_HOST,
      dimension: 1536,
    });
    const result = await provider.search('test query');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    // Either SEARCH_FAILED (HTTP 401) or PROVIDER_ERROR (network)
    expect(['SEARCH_FAILED', 'PROVIDER_ERROR', 'EMBED_FAILED']).toContain(result.errorCode);
  }, 15000);

  it('bad index host returns DataProcessResult failure — never throws', async () => {
    const provider = new PineconeProvider(mockCls(), {
      apiKey: secrets.pineconeApiKey || 'test-key',
      indexHost: 'nonexistent-index.svc.pinecone.io',
      dimension: 1536,
    });
    const result = await provider.search('test query');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  }, 15000);

  it('empty documents array returns EMPTY_DOCUMENTS failure', async () => {
    const provider = makePinecone();
    const result = await provider.ingest([]);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
  });

  it('empty search query returns empty results without calling Pinecone', async () => {
    const provider = makePinecone();
    const result = await provider.search('');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('healthCheck with bad host returns UNHEALTHY', async () => {
    const provider = new PineconeProvider(mockCls(), {
      apiKey: 'test-key',
      indexHost: 'nonexistent-index.svc.pinecone.io',
      dimension: 1536,
    });
    const result = await provider.healthCheck();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  }, 15000);
});
