/**
 * Tests for InMemory RAG Provider — keyword search, ingest, context packs.
 */

import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `T-${tenantId}`,
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
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

describe('InMemoryRagProvider', () => {
  describe('ingest', () => {
    it('should ingest documents', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      const result = await rag.ingest([
        { content: 'MicroserviceBase pattern', type: 'pattern' },
        { content: 'DataProcessResult usage', type: 'pattern' },
      ]);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['ingested']).toBe(2);
      expect(result.data!['namespace']).toBe('default');
    });

    it('should assign doc_id if missing', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'test' }]);
      const results = await rag.search('test');
      expect(results.data![0]['doc_id']).toBeDefined();
    });

    it('should stamp tenant_id on documents', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'test doc' }]);
      const results = await rag.search('test');
      expect(results.data![0]['tenant_id']).toBe('t1');
    });

    it('should support custom namespace', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'kernel pattern' }], 'kernel');
      await rag.ingest([{ content: 'fabric pattern' }], 'fabrics');

      const kResults = await rag.search('pattern', { namespace: 'kernel' });
      expect(kResults.data!.length).toBe(1);
      expect(kResults.data![0]['content']).toBe('kernel pattern');
    });

    it('should reject empty documents array', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      const result = await rag.ingest([]);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('EMPTY_DOCUMENTS');
    });

    it('should fail without tenant context', async () => {
      const rag = new InMemoryRagProvider(mockClsEmpty());
      const result = await rag.ingest([{ content: 'test' }]);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });
  });

  describe('search', () => {
    it('should find documents by keyword overlap', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([
        { content: 'factory pattern for service resolution' },
        { content: 'database fabric interface' },
        { content: 'factory interface with createAsync method' },
      ]);

      const results = await rag.search('factory interface');
      expect(results.isSuccess).toBe(true);
      expect(results.data!.length).toBeGreaterThan(0);
      // Results with 'factory' and 'interface' should score highest
      expect(results.data![0]['_score']).toBeGreaterThan(0);
    });

    it('should return results sorted by score descending', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([
        { content: 'no match here' },
        { content: 'factory pattern factory usage' },
        { content: 'factory pattern' },
      ]);

      const results = await rag.search('factory pattern');
      const scores = results.data!.map((d) => d['_score'] as number);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it('should respect topK limit', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      const docs = Array.from({ length: 20 }, (_, i) => ({
        content: `document number ${i} with keyword`,
      }));
      await rag.ingest(docs);

      const results = await rag.search('keyword', { topK: 5 });
      expect(results.data!.length).toBeLessThanOrEqual(5);
    });

    it('should return empty for empty query', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'something' }]);
      const result = await rag.search('');
      expect(result.data!.length).toBe(0);
    });

    it('should apply filters (DNA-2: skip empty values)', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([
        { content: 'alpha pattern', category: 'kernel' },
        { content: 'beta pattern', category: 'fabric' },
        { content: 'gamma pattern', category: 'kernel' },
      ]);

      const results = await rag.search('pattern', { filters: { category: 'kernel' } });
      expect(results.data!.length).toBe(2);

      // Empty filter should be skipped
      const all = await rag.search('pattern', { filters: { category: '' } });
      expect(all.data!.length).toBe(3);
    });
  });

  describe('buildContextPack', () => {
    it('should build context from searched documents', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest(
        [
          { content: 'DNA-3 requires DataProcessResult on all methods' },
          { content: 'DNA-5 requires scope isolation on every call' },
        ],
        'dna-patterns',
      );

      const result = await rag.buildContextPack('requires scope isolation', 'dna-patterns');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['context_type']).toBe('dna-patterns');
      expect(result.data!['document_count']).toBe(2);
      expect((result.data!['context_text'] as string).length).toBeGreaterThan(0);
      expect(result.data!['token_estimate']).toBeGreaterThan(0);
    });

    it('should return empty context when no documents match', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      const result = await rag.buildContextPack('nonexistent', 'empty-ns');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['document_count']).toBe(0);
    });
  });

  describe('deleteByFilter', () => {
    it('should delete matching documents', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([
        { content: 'keep', category: 'a' },
        { content: 'delete', category: 'b' },
        { content: 'keep too', category: 'a' },
      ]);
      expect(rag.documentCount).toBe(3);

      const result = await rag.deleteByFilter('default', { category: 'b' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(1);
      expect(rag.documentCount).toBe(2);
    });

    it('should return 0 for non-matching filter', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'x', category: 'a' }]);
      const result = await rag.deleteByFilter('default', { category: 'nonexistent' });
      expect(result.data).toBe(0);
    });

    it('should require namespace', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      const result = await rag.deleteByFilter('', { x: 1 });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_NAMESPACE');
    });
  });

  describe('tenant isolation', () => {
    it('should isolate documents between tenants', async () => {
      const ragA = new InMemoryRagProvider(mockCls('tA'));
      await ragA.ingest([{ content: 'secret A data' }]);

      const ragB = new InMemoryRagProvider(mockCls('tB'));
      const results = await ragB.search('secret');
      expect(results.data!.length).toBe(0);
    });

    it('should isolate ingestion counts', async () => {
      const ragA = new InMemoryRagProvider(mockCls('tA'));
      await ragA.ingest([{ content: 'a1' }, { content: 'a2' }]);
      expect(ragA.documentCount).toBe(2);

      const ragB = new InMemoryRagProvider(mockCls('tB'));
      expect(ragB.documentCount).toBe(0);
    });
  });

  describe('testing helpers', () => {
    it('should report total document count', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      expect(rag.documentCount).toBe(0);
      await rag.ingest([{ content: 'a' }, { content: 'b' }]);
      expect(rag.documentCount).toBe(2);
    });

    it('should clear all data', async () => {
      const rag = new InMemoryRagProvider(mockCls('t1'));
      await rag.ingest([{ content: 'a' }]);
      rag.clear();
      expect(rag.documentCount).toBe(0);
    });
  });
});
