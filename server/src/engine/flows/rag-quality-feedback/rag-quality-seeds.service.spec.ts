/**
 * Unit tests for RagQualitySeedsService — FLOW-38 Phase A
 */

import 'reflect-metadata';
import { RagQualitySeedsService } from './rag-quality-seeds.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

function makeMockDb() {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('RagQualitySeedsService', () => {
  it('seeds exactly 5 FLOW_DESIGN RAG patterns', async () => {
    const db = makeMockDb();
    const seeder = new RagQualitySeedsService(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ragPatternsSeeded).toBe(5);
    expect(db.storeDocument).toHaveBeenCalledTimes(5);
  });

  it('stores all patterns to xiigen-rag-patterns', async () => {
    const db = makeMockDb();
    const seeder = new RagQualitySeedsService(db as any);
    await seeder.seed();

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [index] of calls) {
      expect(index).toBe('xiigen-rag-patterns');
    }
  });

  it('seeds patterns with IDs FLOW-38-DESIGN-001 through FLOW-38-DESIGN-005', async () => {
    const db = makeMockDb();
    const seeder = new RagQualitySeedsService(db as any);
    await seeder.seed();

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const ids = calls.map(([, , id]) => id);
    expect(ids).toContain('FLOW-38-DESIGN-001');
    expect(ids).toContain('FLOW-38-DESIGN-005');
  });

  it('all seeds have patternType=FLOW_DESIGN and flowId=FLOW-38', async () => {
    const db = makeMockDb();
    const seeder = new RagQualitySeedsService(db as any);
    await seeder.seed();

    const calls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of calls) {
      expect(doc['patternType']).toBe('FLOW_DESIGN');
      expect(doc['flowId']).toBe('FLOW-38');
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
      expect(doc['tenantId']).toBe(MASTER_TENANT_ID);
    }
  });

  it('DNA-3: returns failure on unexpected error', async () => {
    const db = makeMockDb();
    db.storeDocument.mockRejectedValue(new Error('unexpected crash'));
    const seeder = new RagQualitySeedsService(db as any);

    const result = await seeder.seed();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEEDS_ERROR');
  });
});
