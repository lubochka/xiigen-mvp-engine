/**
 * NanoGraphRagProvider unit + logical tests — fetch mocked, no real server required.
 *
 * Verifies:
 * - IRagService interface compliance
 * - Correct nano-graphrag FastAPI call shapes
 * - DataProcessResult wrapping (DNA-3)
 * - Workspace tenant isolation (DNA-5)
 * - Null/empty filter skipping (DNA-2)
 */

import 'reflect-metadata';
import { NanoGraphRagProvider } from './nano-graphrag.provider';
import { IRagService } from '../interfaces/rag.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

const TENANT_ID = 'nano-unit-tenant';

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

function makeProvider(tenantId: string = TENANT_ID): NanoGraphRagProvider {
  return new NanoGraphRagProvider(mockCls(tenantId), {
    baseUrl: 'http://localhost:19300',
    defaultMode: 'local',
  });
}

function mockFetchOk(body: unknown): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

beforeEach(() => {
  jest.restoreAllMocks();
});

// ── 1. Interface compliance ───────────────────────────

describe('NanoGraphRagProvider — IRagService interface compliance', () => {
  it('implements IRagService abstract class', () => {
    const p = makeProvider();
    expect(p).toBeInstanceOf(IRagService);
    expect(typeof p.search).toBe('function');
    expect(typeof p.ingest).toBe('function');
    expect(typeof p.buildContextPack).toBe('function');
    expect(typeof p.deleteByFilter).toBe('function');
    expect(typeof p.healthCheck).toBe('function');
  });

  it('returns DataProcessResult from all methods on network failure', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const p = makeProvider();

    const s = await p.search('q');
    expect(s).toBeInstanceOf(DataProcessResult);
    expect(s.isSuccess).toBe(false);

    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const i = await p.ingest([{ content: 'x' }]);
    expect(i).toBeInstanceOf(DataProcessResult);
    expect(i.isSuccess).toBe(false);
  });
});

// ── 2. Core method tests ──────────────────────────────

describe('NanoGraphRagProvider — ingest()', () => {
  it('calls POST /insert with workspace = tenantId/namespace', async () => {
    const fetchSpy = mockFetchOk({ inserted: 2 });

    const p = makeProvider();
    const result = await p.ingest(
      [
        { content: 'doc A', doc_id: 'a1' },
        { content: 'doc B', doc_id: 'b2' },
      ],
      'skills',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBe(2);
    expect(result.data!['namespace']).toBe('skills');

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:19300/insert');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body.documents[0].workspace).toBe(`${TENANT_ID}/skills`);
    expect(body.documents[0].metadata.tenant_id).toBe(TENANT_ID);
  });

  it('returns EMPTY_DOCUMENTS for empty array', async () => {
    const p = makeProvider();
    const result = await p.ingest([]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
  });

  it('returns INGEST_FAILED on server error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'internal error',
      json: async () => ({}),
    } as Response);

    const p = makeProvider();
    const result = await p.ingest([{ content: 'x' }]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INGEST_FAILED');
  });

  it('assigns random doc_id when not provided', async () => {
    const fetchSpy = mockFetchOk({ inserted: 1 });

    const p = makeProvider();
    await p.ingest([{ content: 'no id provided' }]);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(typeof body.documents[0].doc_id).toBe('string');
    expect(body.documents[0].doc_id.length).toBeGreaterThan(0);
  });
});

describe('NanoGraphRagProvider — search()', () => {
  it('calls POST /query with correct workspace and mode', async () => {
    const fetchSpy = mockFetchOk({ results: [{ content: 'found doc', score: 0.9 }] });

    const p = makeProvider();
    await p.search('skill block pattern', { namespace: 'patterns' });

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:19300/query');
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe('skill block pattern');
    expect(body.workspace).toBe(`${TENANT_ID}/patterns`);
    expect(body.mode).toBe('local');
  });

  it('returns results array on success', async () => {
    mockFetchOk({ results: [{ content: 'result 1' }, { content: 'result 2' }] });

    const p = makeProvider();
    const result = await p.search('query');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(2);
    expect(result.data![0]['content']).toBe('result 1');
  });

  it('returns empty array for blank query without HTTP call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const p = makeProvider();
    const result = await p.search('   ');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns SEARCH_FAILED on non-200 response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'service unavailable',
      json: async () => ({}),
    } as Response);

    const p = makeProvider();
    const result = await p.search('query');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEARCH_FAILED');
  });
});

describe('NanoGraphRagProvider — deleteByFilter()', () => {
  it('sends DELETE /documents with workspace and filters', async () => {
    const fetchSpy = mockFetchOk({ deleted: 3 });

    const p = makeProvider();
    const result = await p.deleteByFilter('skills', { source: 'doc-1' });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(3);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:19300/documents');
    expect(init.method).toBe('DELETE');
    const body = JSON.parse(init.body as string);
    expect(body.workspace).toBe(`${TENANT_ID}/skills`);
    expect(body.filters.source).toBe('doc-1');
  });

  it('returns MISSING_NAMESPACE for empty namespace string', async () => {
    const p = makeProvider();
    const result = await p.deleteByFilter('', { id: '1' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_NAMESPACE');
  });

  it('returns DELETE_FAILED on server error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'error',
      json: async () => ({}),
    } as Response);

    const p = makeProvider();
    const result = await p.deleteByFilter('ns', { id: '1' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DELETE_FAILED');
  });
});

describe('NanoGraphRagProvider — buildContextPack()', () => {
  it('assembles context_text from results with provider=nano-graphrag', async () => {
    mockFetchOk({ results: [{ content: 'part A' }, { answer: 'part B' }] });

    const p = makeProvider();
    const result = await p.buildContextPack('test query', 'patterns');

    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('nano-graphrag');
    expect(result.data!['context_text']).toContain('part A');
    expect(result.data!['context_text']).toContain('part B');
    expect(result.data!['mode']).toBe('local');
  });
});

describe('NanoGraphRagProvider — healthCheck()', () => {
  it('returns healthy with provider=nano-graphrag', async () => {
    mockFetchOk({ status: 'ok', version: '0.3.0' });

    const p = makeProvider();
    const result = await p.healthCheck();

    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('nano-graphrag');
    expect(result.data!['status']).toBe('healthy');
  });

  it('returns UNHEALTHY when server unreachable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const p = makeProvider();
    const result = await p.healthCheck();
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  });
});

// ── 3. Logical behavior ──────────────────────────────

describe('NanoGraphRagProvider — tenant isolation (DNA-5)', () => {
  it('two tenants produce different workspace keys in request body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const p1 = new NanoGraphRagProvider(mockCls('tenant-A'), {});
    const p2 = new NanoGraphRagProvider(mockCls('tenant-B'), {});

    await p1.search('q');
    await p2.search('q');

    const body1 = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    const body2 = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(body1.workspace).toContain('tenant-A');
    expect(body2.workspace).toContain('tenant-B');
    expect(body1.workspace).not.toBe(body2.workspace);
  });

  it('returns NO_TENANT when CLS has no TenantContext', async () => {
    const emptyCls = { get: jest.fn().mockReturnValue(undefined) };
    const p = new NanoGraphRagProvider(emptyCls as any, {});
    const result = await p.search('q');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
  });
});

describe('NanoGraphRagProvider — DNA-2 empty filter skipping', () => {
  it('omits null and empty-string filter values from request body', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const p = makeProvider();
    await p.search('q', {
      filters: { source: '', category: null as any, domain: 'eng' },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.filters.domain).toBe('eng');
    expect(body.filters.source).toBeUndefined();
    expect(body.filters.category).toBeUndefined();
  });
});

describe('NanoGraphRagProvider — query mode configuration', () => {
  it('global mode sends mode=global in request', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const p = new NanoGraphRagProvider(mockCls(), { defaultMode: 'global' });
    await p.search('q');

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.mode).toBe('global');
  });

  it('naive mode sends mode=naive for keyword-style retrieval', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
      text: async () => '',
    } as Response);

    const p = new NanoGraphRagProvider(mockCls(), { defaultMode: 'naive' });
    await p.search('q');

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.mode).toBe('naive');
  });
});
