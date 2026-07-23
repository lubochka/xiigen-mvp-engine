/**
 * Unit tests for DpoToRagPromoter — FLOW-38 Phase A
 */

import 'reflect-metadata';
import { DpoToRagPromoter } from './dpo-to-rag-promoter.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

const mockTriples = [
  { tripleId: 'DPO-001', flowId: 'FLOW-01', chosen: 'impl A: great solution', score: 9.2 },
  { tripleId: 'DPO-002', flowId: 'FLOW-01', chosen: 'impl B: ok solution', score: 7.0 },
  { tripleId: 'DPO-003', flowId: 'FLOW-02', chosen: 'impl C: excellent', score: 8.5 },
  { tripleId: 'DPO-004', flowId: 'FLOW-02', chosen: 'impl D: poor', score: 4.0 },
];

function makeMockDb(triples = mockTriples as Array<Record<string, unknown>>) {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(triples)),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('DpoToRagPromoter', () => {
  it('promotes triples with score >= 8.5 only', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);

    const result = await promoter.promote({ tenantId: 'master' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(2); // DPO-001 (9.2) and DPO-003 (8.5)
    expect(result.data!.skipped).toBe(2); // DPO-002 (7.0) and DPO-004 (4.0)
  });

  it('stores promoted patterns to xiigen-rag-patterns', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master' });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [index] of calls) {
      expect(index).toBe('xiigen-rag-patterns');
    }
    expect(calls.length).toBe(2);
  });

  it('uses PROMOTED-{tripleId} as document ID', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master' });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const docIds = calls.map(([, , id]) => id);
    expect(docIds).toContain('PROMOTED-DPO-001');
    expect(docIds).toContain('PROMOTED-DPO-003');
  });

  it('normalizes score (0–10) to qualityScore (0–1)', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master' });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const dpo001 = calls.find(([, doc]) => doc['promotedFrom'] === 'DPO-001');
    expect(dpo001![1]['qualityScore']).toBeCloseTo(0.92, 5);
    expect(dpo001![1]['promotionScore']).toBe(9.2);
  });

  it('stores pattern with FLOW_SCOPED connectionType and correct tenantId', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master-tenant' });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of calls) {
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
      expect(doc['tenantId']).toBe('master-tenant');
      expect(doc['patternType']).toBe('PROMOTED_DPO');
    }
  });

  it('stores chosen output as teachingPoint', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master' });

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const dpo001 = calls.find(([, doc]) => doc['promotedFrom'] === 'DPO-001');
    expect(dpo001![1]['teachingPoint']).toBe('impl A: great solution');
  });

  it('reads from xiigen-training-data with tenantId + knowledgeScope filter (Gap 1)', async () => {
    const db = makeMockDb();
    const promoter = new DpoToRagPromoter(db as any);
    await promoter.promote({ tenantId: 'master' });

    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-training-data',
      { tenantId: 'master', knowledgeScope: 'PRIVATE' },
      1000,
    );
  });

  it('tenant isolation: only promotes triples matching the caller tenantId', async () => {
    // tenant-a and tenant-b triples both above threshold — promoter must filter by tenantId
    const allTriples = [
      {
        tripleId: 'DPO-A1',
        flowId: 'FLOW-01',
        chosen: 'a output',
        score: 9.0,
        tenantId: 'tenant-a',
      },
      {
        tripleId: 'DPO-B1',
        flowId: 'FLOW-01',
        chosen: 'b output',
        score: 9.0,
        tenantId: 'tenant-b',
      },
    ];
    const db = makeMockDb(allTriples as Array<Record<string, unknown>>);
    // searchDocuments mock returns only tenant-a triples (simulating fabric-level filter)
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.success([allTriples[0]] as Array<Record<string, unknown>>),
    );
    const promoter = new DpoToRagPromoter(db as any);

    await promoter.promote({ tenantId: 'tenant-a' });

    // Verify the filter was passed to the fabric — tenant-b data never visible
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-training-data',
      { tenantId: 'tenant-a', knowledgeScope: 'PRIVATE' },
      1000,
    );
    // Only tenant-a triple was returned by the mock — only 1 store call
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('DNA-3: returns failure when database read fails', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.failure('DB_ERROR', 'connection refused'),
    );
    const promoter = new DpoToRagPromoter(db as any);

    const result = await promoter.promote({ tenantId: 'master' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROMOTER_READ_FAILED');
  });

  it('skips triples with missing tripleId or chosen', async () => {
    const db = makeMockDb([
      { tripleId: 'DPO-OK', flowId: 'FLOW-01', chosen: 'good output', score: 9.0 },
      { flowId: 'FLOW-01', chosen: 'no id', score: 9.0 }, // missing tripleId
      { tripleId: 'DPO-NC', flowId: 'FLOW-01', score: 9.0 }, // missing chosen
    ] as Array<Record<string, unknown>>);
    const promoter = new DpoToRagPromoter(db as any);

    const result = await promoter.promote({ tenantId: 'master' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(1);
    expect(result.data!.skipped).toBe(2);
  });

  it('DNA-3: returns failure on unexpected error', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('unexpected crash'));
    const promoter = new DpoToRagPromoter(db as any);

    const result = await promoter.promote({ tenantId: 'master' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROMOTER_ERROR');
  });
});
