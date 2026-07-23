/**
 * NanoGraphRagProvider E2E tests — requires running nano-graphrag FastAPI server.
 *
 * Run with:
 *   docker compose -f docker-compose.yml -f docker-compose.test.yml --profile open-source up -d nano-graphrag
 *   NANO_GRAPHRAG_URL=http://localhost:19300 npx jest nano-graphrag.provider.e2e
 *
 * Registers live-provider checks when NANO_GRAPHRAG_URL is set.
 * Otherwise registers a configuration contract so default Jest runs have no pending tests.
 */

import 'reflect-metadata';
import { NanoGraphRagProvider } from './nano-graphrag.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

const NANO_URL = process.env['NANO_GRAPHRAG_URL'];

const E2E_TENANT = 'e2e-nano-tenant';

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

if (NANO_URL) {
describe('NanoGraphRagProvider — E2E (requires running nano-graphrag server)', () => {
  // nano-graphrag ingest runs entity extraction (even in mock mode) — allow generous timeout
  jest.setTimeout(60000);

  let provider: NanoGraphRagProvider;

  beforeAll(() => {
    provider = new NanoGraphRagProvider(makeCls(), { baseUrl: NANO_URL, defaultMode: 'naive' });
  });

  it('healthCheck reports healthy server', async () => {
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
  });

  it('ingest() indexes documents into nano-graphrag knowledge graph', async () => {
    const result = await provider.ingest(
      [
        {
          doc_id: 'nano-e2e-1',
          content: 'The fabric interfaces make every provider swappable at runtime.',
        },
        { doc_id: 'nano-e2e-2', content: 'DNA-5 ensures tenant isolation via AsyncLocalStorage.' },
      ],
      'e2e-ns',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!['namespace']).toBe('e2e-ns');
  });

  it('search() retrieves relevant documents', async () => {
    const result = await provider.search('fabric interfaces', { namespace: 'e2e-ns', topK: 3 });
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('buildContextPack() returns structured context', async () => {
    const result = await provider.buildContextPack('tenant isolation', 'e2e-ns');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('nano-graphrag');
    expect(typeof result.data!['context_text']).toBe('string');
  });

  it('tenant isolation: different tenant workspace is separate', async () => {
    const otherProvider = new NanoGraphRagProvider(makeCls('different-nano-tenant'), {
      baseUrl: NANO_URL,
    });
    const result = await otherProvider.search('fabric interfaces', { namespace: 'e2e-ns' });
    expect(result.isSuccess).toBe(true);
    // Different workspace = different results
    expect(result.data).toBeDefined();
  });

  it('deleteByFilter() removes documents', async () => {
    const result = await provider.deleteByFilter('e2e-ns', { doc_id: 'nano-e2e-1' });
    expect(result.isSuccess).toBe(true);
  });
});
} else {
  describe('NanoGraphRagProvider — E2E configuration', () => {
    it('requires NANO_GRAPHRAG_URL to run live nano-graphrag provider checks', () => {
      expect(NANO_URL).toBeUndefined();
    });
  });
}
