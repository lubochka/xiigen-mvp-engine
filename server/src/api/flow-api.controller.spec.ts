/**
 * FlowApiController — unit tests.
 */
import { FlowApiController } from './flow-api.controller';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  updateDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  listDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
};

const mockExecutor = {
  execute: jest
    .fn()
    .mockResolvedValue(DataProcessResult.success({ runId: 'r1', status: 'PASS', trace: [] })),
  getTrace: jest
    .fn()
    .mockResolvedValue(DataProcessResult.success({ runId: 'r1', status: 'PASS', nodes: [] })),
};

const mockPromptLibrary = {
  resolvePrompt: jest.fn(),
  storePrompt: jest.fn(),
  updatePrompt: jest.fn(),
  listPrompts: jest.fn(),
};

const mockSnapshotService = {
  writeSnapshot: jest.fn(),
  getLatestSnapshot: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
};

const validContract = { taskTypeId: 'T47', flowId: 'FLOW-01', archetype: 'ROUTING', ironRules: [] };

describe('FlowApiController', () => {
  let controller: FlowApiController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FlowApiController(
      mockDb as any,
      mockExecutor as any,
      mockPromptLibrary as any,
      mockSnapshotService as any,
    );
  });

  // ─── executeFlow ────────────────────────────────────────────────────────

  describe('executeFlow', () => {
    it('returns success with run result', async () => {
      const result = await controller.executeFlow(validContract, { prompt: 'test' });
      expect(result.isSuccess).toBe(true);
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('returns failure on invalid contract data', async () => {
      // Pass null to force contract parse failure
      const result = await controller.executeFlow(null as any, {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CONTRACT');
    });

    it('propagates executor failure', async () => {
      mockExecutor.execute.mockResolvedValueOnce(
        DataProcessResult.failure('TOPOLOGY_LOAD_FAILED', 'load failed'),
      );
      const result = await controller.executeFlow(validContract, {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TOPOLOGY_LOAD_FAILED');
    });
  });

  // ─── getRunTrace ────────────────────────────────────────────────────────

  describe('getRunTrace', () => {
    it('returns trace on success', async () => {
      const result = await controller.getRunTrace('r1');
      expect(result.isSuccess).toBe(true);
      expect(mockExecutor.getTrace).toHaveBeenCalledWith('r1');
    });

    it('returns failure for missing runId', async () => {
      const result = await controller.getRunTrace('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_RUN_ID');
    });

    it('propagates trace not found', async () => {
      mockExecutor.getTrace.mockResolvedValueOnce(
        DataProcessResult.failure('TRACE_NOT_FOUND', 'not found'),
      );
      const result = await controller.getRunTrace('r-missing');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TRACE_NOT_FOUND');
    });
  });

  // ─── getPrompt ──────────────────────────────────────────────────────────

  describe('getPrompt', () => {
    it('returns prompt on success', async () => {
      const fakePrompt = { promptId: 'p1', taskTypeId: 'T47', content: 'test' };
      mockPromptLibrary.resolvePrompt.mockResolvedValueOnce(DataProcessResult.success(fakePrompt));
      const result = await controller.getPrompt('T47', 'genesis');
      expect(result.isSuccess).toBe(true);
      expect(mockPromptLibrary.resolvePrompt).toHaveBeenCalledWith('T47', 'genesis', {
        tenantId: undefined,
      });
    });

    it('returns failure for missing params', async () => {
      const result = await controller.getPrompt('', 'genesis');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('returns PROMPT_NOT_FOUND when not found', async () => {
      mockPromptLibrary.resolvePrompt.mockResolvedValueOnce(
        DataProcessResult.failure('PROMPT_NOT_FOUND', 'not found'),
      );
      const result = await controller.getPrompt('T99', 'genesis');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROMPT_NOT_FOUND');
    });
  });

  // ─── upsertPrompt ───────────────────────────────────────────────────────

  describe('upsertPrompt', () => {
    it('creates a new prompt version', async () => {
      const fakePrompt = {
        promptId: 'p2',
        taskTypeId: 'T47',
        content: 'new content',
        version: '1.1.0',
      };
      mockPromptLibrary.updatePrompt.mockResolvedValueOnce(DataProcessResult.success(fakePrompt));
      const result = await controller.upsertPrompt('T47', {
        promptType: 'genesis',
        content: 'new content',
        version: '1.1.0',
      });
      expect(result.isSuccess).toBe(true);
    });

    it('returns failure for missing required fields', async () => {
      const result = await controller.upsertPrompt('T47', {
        promptType: 'genesis',
        content: '',
        version: '1.0.0',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });
  });

  // ─── deactivatePrompt ───────────────────────────────────────────────────

  describe('deactivatePrompt', () => {
    it('deactivates found prompts', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ promptId: 'p1', active: true }]),
      );
      const result = await controller.deactivatePrompt('T47', 'genesis');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.deactivated).toBe(1);
    });

    it('returns PROMPT_NOT_FOUND when none active', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
      const result = await controller.deactivatePrompt('T47', 'genesis');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROMPT_NOT_FOUND');
    });
  });

  // ─── searchRag ──────────────────────────────────────────────────────────

  describe('searchRag', () => {
    it('returns patterns from database', async () => {
      const patterns = [{ patternId: 'pt1', namespace: 'user-registration' }];
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success(patterns));
      const result = await controller.searchRag({ namespace: 'user-registration' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('returns empty array when no patterns found', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
      const result = await controller.searchRag({});
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('propagates DB failure', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'connection failed'),
      );
      const result = await controller.searchRag({ namespace: 'ns1' });
      expect(result.isSuccess).toBe(false);
    });
  });

  // ─── getFlowState ───────────────────────────────────────────────────────

  describe('getFlowState', () => {
    it('returns SNAPSHOT_NOT_FOUND when no snapshots', async () => {
      const result = await controller.getFlowState('FLOW-01');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SNAPSHOT_NOT_FOUND');
    });

    it('returns latest snapshot when found', async () => {
      const snap = { snapshotId: 's1', flowId: 'FLOW-01', updatedAt: '2024-01-01T00:00:00Z' };
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([snap]));
      const result = await controller.getFlowState('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.snapshotId).toBe('s1');
    });
  });

  // ─── getLifecycleStatus ─────────────────────────────────────────────────

  describe('getLifecycleStatus', () => {
    it('returns NOT_STARTED when no lifecycle record exists', async () => {
      // Gate Check 5: getLifecycleStatus returns NOT_STARTED as default (not a failure)
      const result = await controller.getLifecycleStatus('FLOW-99');
      expect(result.isSuccess).toBe(true);
      expect((result.data as Record<string, unknown>)?.['status']).toBe('NOT_STARTED');
    });

    it('returns lifecycle record when found', async () => {
      const lifecycle = { flowId: 'FLOW-01', status: 'ACTIVE' };
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.success(lifecycle));
      const result = await controller.getLifecycleStatus('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('ACTIVE');
    });
  });

  // ─── updateLifecycleStatus ──────────────────────────────────────────────

  describe('updateLifecycleStatus', () => {
    it('creates new lifecycle record when none exists', async () => {
      const result = await controller.updateLifecycleStatus('FLOW-01', { status: 'PENDING' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-flow-lifecycle',
        expect.objectContaining({ flowId: 'FLOW-01', status: 'PENDING' }),
        'FLOW-01',
      );
    });

    it('returns CAS_MISMATCH when expected status does not match', async () => {
      const lifecycle = { flowId: 'FLOW-01', status: 'PENDING' };
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.success(lifecycle));
      const result = await controller.updateLifecycleStatus('FLOW-01', {
        status: 'ACTIVE',
        expectedStatus: 'DEPRECATED',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CAS_MISMATCH');
    });

    it('transitions status when expectedStatus matches', async () => {
      const lifecycle = { flowId: 'FLOW-01', status: 'PENDING' };
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.success(lifecycle));
      const result = await controller.updateLifecycleStatus('FLOW-01', {
        status: 'ACTIVE',
        expectedStatus: 'PENDING',
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('ACTIVE');
    });

    it('rejects invalid status values', async () => {
      const result = await controller.updateLifecycleStatus('FLOW-01', { status: 'UNKNOWN' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_STATUS');
    });
  });
});
