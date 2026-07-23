/**
 * FlowRegistryService — unit tests.
 * S6: CRUD for flow catalog entries.
 */
import { FlowRegistryService } from './flow-registry.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

const validEntry = {
  flowId: 'FLOW-01',
  name: 'Test Flow',
  taskTypeId: 'T47',
  version: '1.0.0',
  status: 'PENDING' as const,
};

describe('FlowRegistryService', () => {
  let svc: FlowRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new FlowRegistryService(mockDb as any);
  });

  // ─── registerFlow ────────────────────────────────────────────────────────

  describe('registerFlow', () => {
    it('returns failure when required fields missing', async () => {
      const result = await svc.registerFlow({
        flowId: '',
        taskTypeId: '',
        version: '',
        name: 'X',
        status: 'PENDING',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('returns failure when db write fails', async () => {
      mockDb.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'write failed'),
      );
      const result = await svc.registerFlow(validEntry);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
    });

    it('returns registered entry on success', async () => {
      const result = await svc.registerFlow(validEntry);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.flowId).toBe('FLOW-01');
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-flow-registry',
        expect.objectContaining({ flowId: 'FLOW-01' }),
        'FLOW-01',
      );
    });

    it('defaults status to PENDING when not provided', async () => {
      const { status: _s, ...noStatus } = validEntry;
      const result = await svc.registerFlow({ ...noStatus } as any);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('PENDING');
    });
  });

  // ─── getFlow ─────────────────────────────────────────────────────────────

  describe('getFlow', () => {
    it('returns failure for missing flowId', async () => {
      const result = await svc.getFlow('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('returns null when not found', async () => {
      const result = await svc.getFlow('FLOW-99');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns entry when found', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({
          flowId: 'FLOW-01',
          name: 'Test',
          taskTypeId: 'T47',
          version: '1.0.0',
          status: 'ACTIVE',
        }),
      );
      const result = await svc.getFlow('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.flowId).toBe('FLOW-01');
    });
  });

  // ─── updateFlow ──────────────────────────────────────────────────────────

  describe('updateFlow', () => {
    it('returns failure for missing flowId', async () => {
      const result = await svc.updateFlow('', { status: 'ACTIVE' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('returns failure when flow not found', async () => {
      const result = await svc.updateFlow('FLOW-99', { status: 'ACTIVE' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('FLOW_NOT_FOUND');
    });

    it('updates and returns merged record', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({
          flowId: 'FLOW-01',
          status: 'PENDING',
          taskTypeId: 'T47',
          version: '1.0.0',
          name: 'X',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        }),
      );
      const result = await svc.updateFlow('FLOW-01', { status: 'ACTIVE' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('ACTIVE');
      expect(result.data?.updatedAt).not.toBe('2024-01-01');
    });
  });

  // ─── listFlows ───────────────────────────────────────────────────────────

  describe('listFlows', () => {
    it('returns empty array when db fails', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'search failed'),
      );
      const result = await svc.listFlows();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns entries when found', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ flowId: 'FLOW-01' }, { flowId: 'FLOW-02' }]),
      );
      const result = await svc.listFlows({ status: 'ACTIVE' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.length).toBe(2);
      expect(mockDb.searchDocuments).toHaveBeenCalledWith(
        'xiigen-flow-registry',
        { status: 'ACTIVE' },
        100,
      );
    });
  });

  // ─── deleteFlow ──────────────────────────────────────────────────────────

  describe('deleteFlow', () => {
    it('returns failure for missing flowId', async () => {
      const result = await svc.deleteFlow('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('returns failure when db delete fails', async () => {
      mockDb.deleteDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'delete failed'),
      );
      const result = await svc.deleteFlow('FLOW-01');
      expect(result.isSuccess).toBe(false);
    });

    it('returns true on success', async () => {
      const result = await svc.deleteFlow('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
    });
  });
});
