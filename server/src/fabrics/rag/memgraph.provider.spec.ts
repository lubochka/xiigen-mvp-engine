/**
 * MemgraphProvider unit + logical tests — fetch mocked, no real Memgraph required.
 *
 * Verifies:
 * - IRagService interface compliance
 * - Correct Memgraph HTTP API call shapes (Cypher statements)
 * - DataProcessResult wrapping (DNA-3)
 * - Tenant node isolation (DNA-5)
 * - Empty filter skipping (DNA-2)
 */

import 'reflect-metadata';
import { MemgraphProvider } from './memgraph.provider';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

const TENANT_ID = 'memgraph-unit-tenant';

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

function makeProvider(tenantId: string = TENANT_ID): MemgraphProvider {
  return new MemgraphProvider(mockCls(tenantId), {
    baseUrl: 'http://localhost:7474',
    defaultTopK: 5,
  });
}

function mockFetchOk(body: unknown): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

function mockFetchError(status: number, text = 'error'): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ errors: [{ message: text }] }),
    text: async () => text,
  } as Response);
}

/** Standard successful Memgraph response with zero rows. */
function memgraphOkEmpty() {
  return { results: [{ columns: ['n'], data: [] }], errors: [] };
}

/** Standard successful Memgraph response with one node row. */
function memgraphOkRow(props: Record<string, unknown>) {
  return { results: [{ columns: ['n'], data: [{ row: [props] }] }], errors: [] };
}

/** Standard count response. */
function memgraphCount(cnt: number) {
  return { results: [{ columns: ['cnt'], data: [{ row: [cnt] }] }], errors: [] };
}

beforeEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Interface compliance ───────────────────────────

describe('MemgraphProvider — IRagService interface compliance', () => {
  it('implements IRagService abstract class', () => {
    const provider = makeProvider();
    expect(provider).toBeInstanceOf(IRagService);
    expect(typeof provider.search).toBe('function');
    expect(typeof provider.ingest).toBe('function');
    expect(typeof provider.buildContextPack).toBe('function');
    expect(typeof provider.deleteByFilter).toBe('function');
    expect(typeof provider.healthCheck).toBe('function');
  });

  it('returns DataProcessResult from all methods on network failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = makeProvider();

    const searchResult = await provider.search('test');
    expect(searchResult).toBeInstanceOf(DataProcessResult);
    expect(searchResult.isSuccess).toBe(false);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const ingestResult = await provider.ingest([{ content: 'doc' }]);
    expect(ingestResult).toBeInstanceOf(DataProcessResult);
    expect(ingestResult.isSuccess).toBe(false);
  });
});

// ── 2. Core method tests ──────────────────────────────

describe('MemgraphProvider — ingest()', () => {
  it('calls /db/neo4j/tx/commit with MERGE Cypher statement', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkRow({ id: 'doc1', content: 'hello' }),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    const result = await provider.ingest([{ content: 'hello world', doc_id: 'doc1' }], 'skills');

    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBe(1);
    expect(result.data!['namespace']).toBe('skills');

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:7474/db/neo4j/tx/commit');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.statements[0].statement).toContain('MERGE');
    expect(body.statements[0].parameters.tenant_id).toBe(TENANT_ID);
    expect(body.statements[0].parameters.ns).toBe('skills');
    expect(body.statements[0].parameters.content).toBe('hello world');
  });

  it('returns failure for empty documents array', async () => {
    const provider = makeProvider();
    const result = await provider.ingest([]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
  });

  it('counts partial success correctly', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy
      .mockResolvedValueOnce({
        ok: true,
        json: async () => memgraphOkRow({}),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ errors: [{ message: 'error' }] }),
        text: async () => 'error',
      } as Response);

    const provider = makeProvider();
    const result = await provider.ingest([{ content: 'doc 1' }, { content: 'doc 2' }]);

    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBe(1);
    expect(result.data!['failed']).toBe(1);
  });

  it('returns INGEST_FAILED when all documents fail', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'));
    const provider = makeProvider();
    const result = await provider.ingest([{ content: 'x' }]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INGEST_FAILED');
  });
});

describe('MemgraphProvider — search()', () => {
  it('sends MATCH Cypher with tenant_id and namespace filters', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () =>
        memgraphOkRow({ id: 'r1', content: 'skill block result', tenant_id: TENANT_ID }),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    await provider.search('skill block', { namespace: 'patterns' });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.statements[0].statement).toContain('MATCH');
    expect(body.statements[0].parameters.tenant_id).toBe(TENANT_ID);
    expect(body.statements[0].parameters.ns).toBe('patterns');
    expect(body.statements[0].parameters.q).toBe('skill block');
  });

  it('returns empty array for empty query', async () => {
    const provider = makeProvider();
    const result = await provider.search('  ');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('wraps results as DataProcessResult success array', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkRow({ id: 'r1', content: 'found', tenant_id: TENANT_ID }),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    const result = await provider.search('found');
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data![0]['content']).toBe('found');
  });

  it('returns failure on Memgraph HTTP error', async () => {
    mockFetchError(500, 'internal error');
    const provider = makeProvider();
    const result = await provider.search('query');
    expect(result.isSuccess).toBe(false);
  });
});

describe('MemgraphProvider — deleteByFilter()', () => {
  it('executes COUNT then DETACH DELETE Cypher', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => memgraphCount(3),
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => memgraphOkEmpty(),
        text: async () => '',
      } as Response);

    const provider = makeProvider();
    const result = await provider.deleteByFilter('skills', { source: 'doc-1' });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(3);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const deleteBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(deleteBody.statements[0].statement).toContain('DETACH DELETE');
  });

  it('returns MISSING_NAMESPACE for empty namespace', async () => {
    const provider = makeProvider();
    const result = await provider.deleteByFilter('', { id: '1' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_NAMESPACE');
  });
});

describe('MemgraphProvider — buildContextPack()', () => {
  it('builds context pack from search results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkRow({ content: 'context text here', tenant_id: TENANT_ID }),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    const result = await provider.buildContextPack('test query', 'patterns');

    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('memgraph');
    expect(result.data!['context_type']).toBe('patterns');
    expect(result.data!['context_text']).toContain('context text here');
  });
});

describe('MemgraphProvider — healthCheck()', () => {
  it('returns healthy when RETURN 1 succeeds', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ columns: ['ping'], data: [{ row: [1] }] }], errors: [] }),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
    expect(result.data!['provider']).toBe('memgraph');
  });

  it('returns UNHEALTHY when server unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const provider = makeProvider();
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  });
});

// ── 3. Logical behavior tests ────────────────────────

describe('MemgraphProvider — tenant isolation (DNA-5)', () => {
  it('two providers with different tenants send different tenant_id in Cypher', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkEmpty(),
      text: async () => '',
    } as Response);

    const p1 = new MemgraphProvider(mockCls('tenant-alpha'), {});
    const p2 = new MemgraphProvider(mockCls('tenant-beta'), {});

    await p1.search('query');
    await p2.search('query');

    const body1 = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    const body2 = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(body1.statements[0].parameters.tenant_id).toBe('tenant-alpha');
    expect(body2.statements[0].parameters.tenant_id).toBe('tenant-beta');
  });

  it('returns NO_TENANT failure when CLS has no context', async () => {
    const emptyCls = { get: jest.fn().mockReturnValue(undefined) };
    const provider = new MemgraphProvider(emptyCls as any, {});
    const result = await provider.search('query');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
  });
});

describe('MemgraphProvider — DNA-2 empty filter skipping', () => {
  it('null and empty-string filter values are not included in Cypher params', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkEmpty(),
      text: async () => '',
    } as Response);

    const provider = makeProvider();
    await provider.search('query', {
      filters: { source: '', category: null as any, domain: 'valid-domain' },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    const params = body.statements[0].parameters;
    // Only 'valid-domain' filter should appear
    expect(params.filter_0).toBe('valid-domain');
    expect(Object.values(params)).not.toContain('');
    expect(Object.values(params)).not.toContain(null);
  });
});

describe('MemgraphProvider — Basic auth header', () => {
  it('includes Authorization header when credentials configured', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => memgraphOkEmpty(),
      text: async () => '',
    } as Response);

    const provider = new MemgraphProvider(mockCls(), {
      username: 'admin',
      password: 'secret',
    });
    await provider.search('query');

    const headers = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['authorization']).toMatch(/^Basic /);
  });
});
