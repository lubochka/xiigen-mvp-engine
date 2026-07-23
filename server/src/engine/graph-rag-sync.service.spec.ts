/**
 * Unit tests for GraphRagSyncService — 9 tests
 *
 * Tests:
 *   1. syncTriple: returns skipped when triple already has graphRagSyncedAt
 *   2. syncTriple: returns skipped when qualityScore below threshold
 *   3. syncTriple: builds rich text payload from triple fields
 *   4. syncTriple: calls IGraphRagService.insert with correct workspace and mode
 *   5. syncTriple: DNA-8 updates triple with graphRagSyncedAt after successful insert
 *   6. syncTriple: returns failure when triple not found in xiigen-dpo-triples
 *   7. syncTriple: returns SCOPE_VIOLATION when triple.tenantId !== callerTenantId and knowledgeScope PRIVATE
 *   8. syncBatch: processes up to GRAPHRAG_BATCH_SIZE triples
 *   9. syncBatch: aggregates syncedCount, failedCount, skippedCount across batch
 */

import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { GraphRagSyncService } from './graph-rag-sync.service';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';
import { IGraphRagService } from '../fabrics/interfaces/graph-rag.interface';

function makeMockDb(tripleDoc?: Record<string, unknown>): IDatabaseService {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest
      .fn()
      .mockResolvedValue(
        tripleDoc
          ? DataProcessResult.success(tripleDoc)
          : DataProcessResult.failure('NOT_FOUND', 'not found'),
      ),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as unknown as IDatabaseService;
}

function makeMockGraphRag(success = true): IGraphRagService {
  return {
    insert: jest.fn().mockResolvedValue({ success }),
  };
}

const VALID_TRIPLE: Record<string, unknown> = {
  id: 'triple-1',
  tripleId: 'triple-1',
  tenantId: 'tenant-acme',
  knowledgeScope: 'PRIVATE',
  qualityScore: 0.9,
  prompt: 'Generate email validation service',
  chosen: 'class EmailValidator...',
  rejected: 'function validate...',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('GraphRagSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncTriple: returns skipped when triple already has graphRagSyncedAt', async () => {
    const syncedTriple = { ...VALID_TRIPLE, graphRagSyncedAt: '2026-01-02T00:00:00.000Z' };
    const db = makeMockDb(syncedTriple);
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncTriple('triple-1', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.skippedCount).toBe(1);
    expect(result.data?.syncedCount).toBe(0);
    expect(graphRag.insert).not.toHaveBeenCalled();
  });

  it('syncTriple: returns skipped when qualityScore below threshold', async () => {
    const lowQualityTriple = { ...VALID_TRIPLE, qualityScore: 0.5 }; // below 0.85 default
    const db = makeMockDb(lowQualityTriple);
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncTriple('triple-1', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.skippedCount).toBe(1);
    expect(graphRag.insert).not.toHaveBeenCalled();
  });

  it('syncTriple: builds rich text payload from triple fields', async () => {
    const db = makeMockDb(VALID_TRIPLE);
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    await svc.syncTriple('triple-1', 'tenant-acme');

    expect(graphRag.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Generate email validation service'),
        mode: 'triple',
      }),
    );
    const callArg = (graphRag.insert as jest.Mock).mock.calls[0]![0] as { text: string };
    expect(callArg.text).toContain('Chosen');
    expect(callArg.text).toContain('Rejected');
  });

  it('syncTriple: calls IGraphRagService.insert with correct workspace and mode', async () => {
    const db = makeMockDb(VALID_TRIPLE);
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    await svc.syncTriple('triple-1', 'tenant-acme');

    expect(graphRag.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace: 'tenant-acme',
        mode: 'triple',
      }),
    );
  });

  it('syncTriple: DNA-8 updates triple with graphRagSyncedAt after successful insert', async () => {
    const db = makeMockDb(VALID_TRIPLE);
    const graphRag = makeMockGraphRag(true);
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncTriple('triple-1', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.syncedCount).toBe(1);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-dpo-triples',
      expect.objectContaining({ graphRagSyncedAt: expect.any(String) }),
      'triple-1',
    );
  });

  it('syncTriple: returns failure when triple not found in xiigen-dpo-triples', async () => {
    const db = makeMockDb(); // no tripleDoc → returns failure
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncTriple('missing-triple', 'tenant-acme');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('syncTriple: returns SCOPE_VIOLATION when triple.tenantId !== callerTenantId and knowledgeScope PRIVATE', async () => {
    const crossTenantTriple = {
      ...VALID_TRIPLE,
      tenantId: 'tenant-other',
      knowledgeScope: 'PRIVATE',
    };
    const db = makeMockDb(crossTenantTriple);
    const graphRag = makeMockGraphRag();
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncTriple('triple-1', 'tenant-acme');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCOPE_VIOLATION');
    expect(graphRag.insert).not.toHaveBeenCalled();
  });

  it('syncBatch: processes up to GRAPHRAG_BATCH_SIZE triples', async () => {
    const triples = Array.from({ length: 15 }, (_, i) => ({
      id: `t-${i}`,
      tripleId: `t-${i}`,
      tenantId: 'tenant-acme',
      knowledgeScope: 'PRIVATE',
      qualityScore: 0.9,
      prompt: `prompt-${i}`,
      chosen: `chosen-${i}`,
      rejected: `rejected-${i}`,
    }));

    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(triples)),
      getDocument: jest.fn().mockImplementation(async (_idx: string, id: string) => {
        const triple = triples.find((t) => t.id === id);
        return triple
          ? DataProcessResult.success(triple)
          : DataProcessResult.failure('NOT_FOUND', '');
      }),
      deleteDocument: jest.fn(),
      bulkStore: jest.fn(),
      countDocuments: jest.fn(),
      createIndex: jest.fn(),
    } as unknown as IDatabaseService;

    const graphRag = makeMockGraphRag(true);
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncBatch('tenant-acme');

    expect(result.isSuccess).toBe(true);
    // Should process at most batchSize (default 10) triples
    expect((graphRag.insert as jest.Mock).mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('syncBatch: aggregates syncedCount, failedCount, skippedCount across batch', async () => {
    const triples = [
      {
        id: 't-1',
        tripleId: 't-1',
        tenantId: 'tenant-acme',
        knowledgeScope: 'PRIVATE',
        qualityScore: 0.9,
        prompt: 'p1',
        chosen: 'c1',
        rejected: 'r1',
      },
      {
        id: 't-2',
        tripleId: 't-2',
        tenantId: 'tenant-acme',
        knowledgeScope: 'PRIVATE',
        qualityScore: 0.3,
        prompt: 'p2',
        chosen: 'c2',
        rejected: 'r2',
      }, // low quality → skipped
    ];

    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(triples)),
      getDocument: jest.fn().mockImplementation(async (_idx: string, id: string) => {
        const triple = triples.find((t) => t.id === id);
        return triple
          ? DataProcessResult.success(triple)
          : DataProcessResult.failure('NOT_FOUND', '');
      }),
      deleteDocument: jest.fn(),
      bulkStore: jest.fn(),
      countDocuments: jest.fn(),
      createIndex: jest.fn(),
    } as unknown as IDatabaseService;

    const graphRag = makeMockGraphRag(true);
    const svc = new GraphRagSyncService(db, graphRag);

    const result = await svc.syncBatch('tenant-acme');

    expect(result.isSuccess).toBe(true);
    // t-1: synced, t-2: skipped (low quality)
    expect(result.data?.syncedCount).toBe(1);
    expect(result.data?.skippedCount).toBe(1);
    expect(result.data?.failedCount).toBe(0);
  });
});
