import { DeferredShadowRunProvider } from './deferred-shadow-run.provider';
import { IDatabaseService } from '../interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

function makeDb(overrides: Partial<IDatabaseService> = {}): IDatabaseService {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    ...overrides,
  } as unknown as IDatabaseService;
}

describe('DeferredShadowRunProvider', () => {
  describe('recordAttempt', () => {
    it('creates record with status PENDING_LOCAL_MODEL when no ossScore', async () => {
      const db = makeDb();
      const provider = new DeferredShadowRunProvider(db);

      const result = await provider.recordAttempt({
        taskTypeId: 'T001',
        flowId: 'FLOW-01',
        paidModelScore: 0.85,
      });

      expect(result.status).toBe('PENDING_LOCAL_MODEL');
      expect(result.taskTypeId).toBe('T001');
      expect(result.flowId).toBe('FLOW-01');
      expect(result.flowsInPending).toBe(1);
      expect(result.ossScore).toBeUndefined();
      expect(result.gapScore).toBeUndefined();
    });

    it('transitions to STALLED after 4 flows (flowsInPending >= 4)', async () => {
      // Simulate existing record with flowsInPending=3
      const existingRecord = {
        taskTypeId: 'T001',
        flowId: 'FLOW-01',
        status: 'PENDING_LOCAL_MODEL',
        flowsInPending: 3,
        stalledAfterFlows: 4,
        recordedAt: new Date().toISOString(),
      };
      const db = makeDb({
        getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(existingRecord)),
      });
      const provider = new DeferredShadowRunProvider(db);

      const result = await provider.recordAttempt({
        taskTypeId: 'T001',
        flowId: 'FLOW-01',
        paidModelScore: 0.85,
        // no ossScore — so status decision falls to flowsInPending check
      });

      expect(result.status).toBe('STALLED');
      expect(result.flowsInPending).toBe(4);
    });
  });

  describe('getGapScore', () => {
    it('returns gapScore UNKNOWN when status is PENDING_LOCAL_MODEL', async () => {
      const pendingRecord = {
        taskTypeId: 'T002',
        flowId: 'FLOW-02',
        status: 'PENDING_LOCAL_MODEL',
        flowsInPending: 1,
        stalledAfterFlows: 4,
        recordedAt: new Date().toISOString(),
      };
      const db = makeDb({
        searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([pendingRecord])),
      });
      const provider = new DeferredShadowRunProvider(db);

      const result = await provider.getGapScore('T002');

      expect(result.gapScore).toBe('UNKNOWN');
      expect(result.status).toBe('PENDING_LOCAL_MODEL');
      expect(result.taskTypeId).toBe('T002');
    });

    it('NEVER throws even when DB throws', async () => {
      const db = makeDb({
        searchDocuments: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      });
      const provider = new DeferredShadowRunProvider(db);

      // Must not throw
      const result = await provider.getGapScore('T003');

      expect(result).toBeDefined();
      expect(result.taskTypeId).toBe('T003');
      expect(result.gapScore).toBe('UNKNOWN');
      expect(result.status).toBe('PENDING_LOCAL_MODEL');
    });
  });
});
