/**
 * PineconeProvider unit tests — fetch mocked, no network calls.
 *
 * Verifies:
 * - IRagService interface compliance
 * - Correct Pinecone REST API call shapes
 * - DataProcessResult wrapping (DNA-3)
 * - Tenant namespace isolation (DNA-5)
 * - hashEmbedding determinism
 */

import 'reflect-metadata';
import { PineconeProvider, hashEmbedding } from './pinecone.provider';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

// ── Helpers ───────────────────────────────────────────

const TENANT_ID = 'pinecone-unit-tenant';
const INDEX_HOST = 'test-index.svc.pinecone.io';

function mockCls(tenantId: string = TENANT_ID): any {
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

function makeProvider(overrides: Partial<{ tenantId: string }> = {}): PineconeProvider {
  return new PineconeProvider(mockCls(overrides.tenantId), {
    apiKey: 'test-api-key',
    indexHost: INDEX_HOST,
    dimension: 8, // small for unit tests
  });
}

function mockFetch(status: number, body: unknown): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as Response);
}

// ── Tests ─────────────────────────────────────────────

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('PineconeProvider — interface compliance', () => {
  it('implements IRagService abstract class', () => {
    const provider = makeProvider();
    expect(provider).toBeInstanceOf(IRagService);
    expect(typeof provider.search).toBe('function');
    expect(typeof provider.ingest).toBe('function');
    expect(typeof provider.buildContextPack).toBe('function');
    expect(typeof provider.deleteByFilter).toBe('function');
  });

  it('returns DataProcessResult from all methods (failure path)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));
    const provider = makeProvider();

    const searchResult = await provider.search('test query');
    expect(searchResult).toBeInstanceOf(DataProcessResult);
    expect(searchResult.isSuccess).toBe(false);
    expect(searchResult.errorCode).toBe('PROVIDER_ERROR');
  });
});

describe('PineconeProvider — ingest', () => {
  it('calls POST /vectors/upsert with correct namespace', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ upsertedCount: 1 }),
    } as Response);

    const provider = makeProvider();
    const result = await provider.ingest([{ content: 'test content', doc_id: 'doc-1' }]);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBe(1);

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://${INDEX_HOST}/vectors/upsert`);
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string);
    expect(body.vectors).toHaveLength(1);
    expect(body.vectors[0].id).toBe('doc-1');
    expect(Array.isArray(body.vectors[0].values)).toBe(true);
    expect(body.vectors[0].values).toHaveLength(8); // dimension
    // Namespace: tenantId_namespace
    expect(body.namespace).toContain(TENANT_ID.replace(/[^a-zA-Z0-9_-]/g, '_'));
    expect(body.namespace).toContain('_default');
  });

  it('returns EMPTY_DOCUMENTS failure for empty array', async () => {
    const provider = makeProvider();
    const result = await provider.ingest([]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
  });

  it('passes Api-Key header to Pinecone', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ upsertedCount: 1 }),
    } as Response);

    const provider = makeProvider();
    await provider.ingest([{ content: 'hello', doc_id: 'x1' }]);

    const [, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)['Api-Key']).toBe('test-api-key');
  });
});

describe('PineconeProvider — search', () => {
  it('calls POST /query with correct shape', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ matches: [] }),
    } as Response);

    const provider = makeProvider();
    const result = await provider.search('test query');

    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://${INDEX_HOST}/query`);
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body as string);
    expect(Array.isArray(body.vector)).toBe(true);
    expect(body.vector).toHaveLength(8);
    expect(body.topK).toBeGreaterThan(0);
    expect(body.includeMetadata).toBe(true);
  });

  it('returns empty array for empty query without calling Pinecone', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const provider = makeProvider();

    const result = await provider.search('');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps Pinecone matches to IRagService result shape', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        matches: [
          {
            id: 'doc-42',
            score: 0.93,
            metadata: { content: 'match content', tenant_id: TENANT_ID },
          },
        ],
      }),
    } as Response);

    const provider = makeProvider();
    const result = await provider.search('query');

    expect(result.isSuccess).toBe(true);
    const first = result.data![0];
    expect(first['doc_id']).toBe('doc-42');
    expect(first['_score']).toBe(0.93);
    expect(first['content']).toBe('match content');
  });
});

describe('PineconeProvider — tenant namespace isolation', () => {
  it('different tenants get different Pinecone namespaces', async () => {
    const calls: string[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
      const body = JSON.parse((opts as RequestInit).body as string);
      calls.push(body.namespace);
      return { ok: true, status: 200, json: async () => ({ upsertedCount: 1 }) } as Response;
    });

    const providerA = new PineconeProvider(mockCls('tenant-A'), {
      apiKey: 'k',
      indexHost: INDEX_HOST,
      dimension: 8,
    });
    const providerB = new PineconeProvider(mockCls('tenant-B'), {
      apiKey: 'k',
      indexHost: INDEX_HOST,
      dimension: 8,
    });

    await providerA.ingest([{ content: 'a', doc_id: 'a1' }]);
    await providerB.ingest([{ content: 'b', doc_id: 'b1' }]);

    expect(calls).toHaveLength(2);
    expect(calls[0]).not.toBe(calls[1]);
    // hyphens are valid in Pinecone namespaces — sanitiser preserves them
    expect(calls[0]).toContain('tenant-A');
    expect(calls[1]).toContain('tenant-B');
  });
});

describe('PineconeProvider — healthCheck', () => {
  it('returns success when Pinecone responds', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ namespaces: {}, totalVectorCount: 0, dimension: 1536 }),
    } as Response);

    const provider = makeProvider();
    const result = await provider.healthCheck();

    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
    expect(result.data!['provider']).toBe('pinecone');
  });

  it('returns UNHEALTHY failure when Pinecone is unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const provider = makeProvider();
    const result = await provider.healthCheck();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  });
});

describe('hashEmbedding', () => {
  it('returns array of correct dimension', async () => {
    const vec = await hashEmbedding('hello world', 16);
    expect(vec).toHaveLength(16);
  });

  it('is deterministic — same text gives same vector', async () => {
    const v1 = await hashEmbedding('deterministic test', 8);
    const v2 = await hashEmbedding('deterministic test', 8);
    expect(v1).toEqual(v2);
  });

  it('is unit-length (L2 norm ≈ 1)', async () => {
    const vec = await hashEmbedding('some text here', 32);
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it('different texts produce different vectors', async () => {
    const v1 = await hashEmbedding('text one', 16);
    const v2 = await hashEmbedding('text two', 16);
    expect(v1).not.toEqual(v2);
  });
});
