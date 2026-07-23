/**
 * MemgraphProvider E2E tests — requires real Memgraph instance.
 *
 * Run with:
 *   docker compose -f docker-compose.yml -f docker-compose.test.yml --profile open-source up -d memgraph
 *   MEMGRAPH_URL=http://localhost:17474 npx jest memgraph.provider.e2e
 *
 * Registers live-provider checks when MEMGRAPH_URL is set.
 * Otherwise registers a configuration contract so default Jest runs have no pending tests.
 */

import 'reflect-metadata';
import { MemgraphProvider } from './memgraph.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

const MEMGRAPH_URL = process.env['MEMGRAPH_URL'];

const E2E_TENANT = 'e2e-memgraph-tenant';

function makeCls(tenantId = E2E_TENANT): any {
  const tenant = new TenantContext({
    id: tenantId,
    name: `E2E Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return { get: jest.fn((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)) };
}

if (MEMGRAPH_URL) {
describe('MemgraphProvider — E2E (requires running Memgraph)', () => {
  let provider: MemgraphProvider;

  beforeAll(() => {
    provider = new MemgraphProvider(makeCls(), { baseUrl: MEMGRAPH_URL });
  });

  it('healthCheck reports healthy Memgraph instance', async () => {
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
  });

  it('ingest() creates RagDoc nodes in Memgraph', async () => {
    const result = await provider.ingest(
      [
        {
          doc_id: 'e2e-doc-1',
          content: 'DataProcessResult wraps all service responses',
          source: 'e2e-test',
        },
        {
          doc_id: 'e2e-doc-2',
          content: 'Tenant isolation via AsyncLocalStorage',
          source: 'e2e-test',
        },
      ],
      'e2e-namespace',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!['ingested']).toBe(2);
  });

  it('search() retrieves ingested documents by content match', async () => {
    const result = await provider.search('DataProcessResult', {
      namespace: 'e2e-namespace',
      topK: 5,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBeGreaterThan(0);
    const contents = result.data!.map((d) => d['content'] as string);
    expect(contents.some((c) => c.includes('DataProcessResult'))).toBe(true);
  });

  it('search() with namespace filter only returns same-namespace docs', async () => {
    await provider.ingest(
      [{ doc_id: 'other-ns-doc', content: 'other namespace content' }],
      'other-namespace',
    );

    const result = await provider.search('content', { namespace: 'e2e-namespace' });
    expect(result.isSuccess).toBe(true);
    // Should not include docs from other-namespace
    const ids = result.data!.map((d) => d['id'] as string);
    expect(ids).not.toContain('other-ns-doc');
  });

  it('buildContextPack() returns concatenated context text', async () => {
    const result = await provider.buildContextPack('AsyncLocalStorage', 'e2e-namespace');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('memgraph');
    expect(typeof result.data!['context_text']).toBe('string');
  });

  it('tenant isolation: different tenant cannot read other tenant docs', async () => {
    const otherProvider = new MemgraphProvider(makeCls('different-e2e-tenant'), {
      baseUrl: MEMGRAPH_URL,
    });
    const result = await otherProvider.search('DataProcessResult', { namespace: 'e2e-namespace' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(0);
  });

  it('deleteByFilter() removes matching nodes', async () => {
    const deleted = await provider.deleteByFilter('e2e-namespace', { source: 'e2e-test' });
    expect(deleted.isSuccess).toBe(true);
    expect(deleted.data).toBeGreaterThanOrEqual(2);

    // Verify gone
    const afterDelete = await provider.search('DataProcessResult', { namespace: 'e2e-namespace' });
    expect(afterDelete.isSuccess).toBe(true);
    expect(afterDelete.data!.length).toBe(0);
  });
});
} else {
  describe('MemgraphProvider — E2E configuration', () => {
    it('requires MEMGRAPH_URL to run live Memgraph provider checks', () => {
      expect(MEMGRAPH_URL).toBeUndefined();
    });
  });
}
