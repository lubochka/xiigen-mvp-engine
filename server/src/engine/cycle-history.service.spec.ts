/**
 * Unit tests for CycleHistoryService — 9 tests
 *
 * Verifies:
 *   1. record() stores to xiigen-cycle-history with DNA-8
 *   2. record() id is deterministic: `${runId}::step-${stepIndex}`
 *   3. record() sets connectionType:FLOW_SCOPED and knowledgeScope:PRIVATE
 *   4. record() truncates stepText to 120 chars
 *   5. getSummariesForRun() returns summaries ordered by stepIndex ascending
 *   6. getSummariesForRun() returns empty array when no records exist (not failure)
 *   7. getSummariesForRun() filters by tenantId — returns only records matching tenantId
 *   8. record() failure (db throws) returns DataProcessResult.failure without throwing
 *   9. record() called twice with same runId+stepIndex: overwrites without error
 */

import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleHistoryService, RecordParams } from './cycle-history.service';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';

function makeMockDb(overrides?: Partial<IDatabaseService>): IDatabaseService {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    ...overrides,
  } as unknown as IDatabaseService;
}

const BASE_PARAMS: RecordParams = {
  runId: 'run-123',
  stepIndex: 0,
  stepText: 'Validate the user email address',
  winningNodeSummary: 'Email validation node with uniqueness check',
  grade: 0.9,
  modelWon: 'mock-gemini',
  tenantId: 'tenant-acme',
};

describe('CycleHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('record() stores to xiigen-cycle-history with DNA-8', async () => {
    const db = makeMockDb();
    const svc = new CycleHistoryService(db);

    const result = await svc.record(BASE_PARAMS);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-history',
      expect.objectContaining({ runId: 'run-123' }),
      expect.any(String),
    );
  });

  it('record() id is deterministic: `${runId}::step-${stepIndex}`', async () => {
    const db = makeMockDb();
    const svc = new CycleHistoryService(db);

    const result = await svc.record({ ...BASE_PARAMS, runId: 'run-abc', stepIndex: 3 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.id).toBe('run-abc::step-3');
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
    expect(storeCalls[0][2]).toBe('run-abc::step-3');
  });

  it('record() sets connectionType:FLOW_SCOPED and knowledgeScope:PRIVATE', async () => {
    const db = makeMockDb();
    const svc = new CycleHistoryService(db);

    const result = await svc.record(BASE_PARAMS);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.connectionType).toBe('FLOW_SCOPED');
    expect(result.data?.knowledgeScope).toBe('PRIVATE');
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-history',
      expect.objectContaining({ connectionType: 'FLOW_SCOPED', knowledgeScope: 'PRIVATE' }),
      expect.any(String),
    );
  });

  it('record() truncates stepText to 120 chars', async () => {
    const db = makeMockDb();
    const svc = new CycleHistoryService(db);
    const longText = 'A'.repeat(200);

    const result = await svc.record({ ...BASE_PARAMS, stepText: longText });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.stepText.length).toBe(120);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-history',
      expect.objectContaining({ stepText: 'A'.repeat(120) }),
      expect.any(String),
    );
  });

  it('getSummariesForRun() returns summaries ordered by stepIndex ascending', async () => {
    const mockRecords = [
      { stepIndex: 2, winningNodeSummary: 'Summary C', tenantId: 'tenant-acme' },
      { stepIndex: 0, winningNodeSummary: 'Summary A', tenantId: 'tenant-acme' },
      { stepIndex: 1, winningNodeSummary: 'Summary B', tenantId: 'tenant-acme' },
    ];
    const db = makeMockDb({
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(mockRecords)),
    });
    const svc = new CycleHistoryService(db);

    const result = await svc.getSummariesForRun('run-123', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(['Summary A', 'Summary B', 'Summary C']);
  });

  it('getSummariesForRun() returns empty array when no records exist (not failure)', async () => {
    const db = makeMockDb({
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    });
    const svc = new CycleHistoryService(db);

    const result = await svc.getSummariesForRun('run-123', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('getSummariesForRun() filters by tenantId — returns only records matching tenantId', async () => {
    // The db.searchDocuments receives { runId, tenantId } filter — the implementation filters by both
    const db = makeMockDb({
      searchDocuments: jest
        .fn()
        .mockImplementation((_idx: string, filter: Record<string, unknown>) => {
          expect(filter['tenantId']).toBe('tenant-acme');
          return Promise.resolve(
            DataProcessResult.success([
              { stepIndex: 0, winningNodeSummary: 'Summary A', tenantId: 'tenant-acme' },
            ]),
          );
        }),
    });
    const svc = new CycleHistoryService(db);

    const result = await svc.getSummariesForRun('run-123', 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-cycle-history',
      expect.objectContaining({ tenantId: 'tenant-acme', runId: 'run-123' }),
    );
  });

  it('record() failure (db throws) returns DataProcessResult.failure without throwing', async () => {
    const db = makeMockDb({
      storeDocument: jest.fn().mockRejectedValue(new Error('DB connection lost')),
    });
    const svc = new CycleHistoryService(db);

    const result = await svc.record(BASE_PARAMS);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CYCLE_HISTORY_ERROR');
  });

  it('record() called twice with same runId+stepIndex: overwrites without error', async () => {
    const db = makeMockDb();
    const svc = new CycleHistoryService(db);

    const result1 = await svc.record(BASE_PARAMS);
    const result2 = await svc.record({ ...BASE_PARAMS, winningNodeSummary: 'Updated summary' });

    expect(result1.isSuccess).toBe(true);
    expect(result2.isSuccess).toBe(true);
    // Both calls use same deterministic ID — second overwrites first
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
    expect(storeCalls[0][2]).toBe(storeCalls[1][2]); // same docId
    expect(storeCalls.length).toBe(2);
  });
});
