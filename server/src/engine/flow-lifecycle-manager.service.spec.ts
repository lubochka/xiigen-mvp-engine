/**
 * FlowLifecycleManagerService — unit tests.
 * S9: Lifecycle transitions + audit trail.
 */
import {
  FlowLifecycleManagerService,
  ALLOWED_TRANSITIONS,
  LifecycleStatus,
} from './flow-lifecycle-manager.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

describe('FlowLifecycleManagerService', () => {
  let svc: FlowLifecycleManagerService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new FlowLifecycleManagerService(mockDb as any);
  });

  // ─── canTransition ───────────────────────────────────────────────────────

  describe('canTransition', () => {
    it('allows PENDING → ACTIVE', () => {
      expect(svc.canTransition('PENDING', 'ACTIVE')).toBe(true);
    });

    it('allows PENDING → FAILED', () => {
      expect(svc.canTransition('PENDING', 'FAILED')).toBe(true);
    });

    it('allows ACTIVE → DEPRECATED', () => {
      expect(svc.canTransition('ACTIVE', 'DEPRECATED')).toBe(true);
    });

    it('allows ACTIVE → FAILED', () => {
      expect(svc.canTransition('ACTIVE', 'FAILED')).toBe(true);
    });

    it('blocks DEPRECATED → anything', () => {
      expect(svc.canTransition('DEPRECATED', 'ACTIVE')).toBe(false);
      expect(svc.canTransition('DEPRECATED', 'PENDING')).toBe(false);
    });

    it('blocks FAILED → anything', () => {
      expect(svc.canTransition('FAILED', 'ACTIVE')).toBe(false);
    });

    it('blocks PENDING → DEPRECATED (skip transition)', () => {
      expect(svc.canTransition('PENDING', 'DEPRECATED')).toBe(false);
    });
  });

  // ─── getStatus ───────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns failure for missing flowId', async () => {
      const result = await svc.getStatus('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('returns null when no record exists', async () => {
      const result = await svc.getStatus('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns lifecycle record when found', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ flowId: 'FLOW-01', status: 'ACTIVE' }),
      );
      const result = await svc.getStatus('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('ACTIVE');
    });
  });

  // ─── transitionStatus ────────────────────────────────────────────────────

  describe('transitionStatus', () => {
    it('returns failure for missing params', async () => {
      const result = await svc.transitionStatus('', 'ACTIVE');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('returns INVALID_TRANSITION when transition not allowed', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ flowId: 'FLOW-01', status: 'DEPRECATED' }),
      );
      const result = await svc.transitionStatus('FLOW-01', 'ACTIVE');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_TRANSITION');
    });

    it('writes audit entry BEFORE updating lifecycle record (DNA-8)', async () => {
      const writes: string[] = [];
      mockDb.storeDocument.mockImplementation((index: string) => {
        writes.push(index);
        return Promise.resolve(DataProcessResult.success({}));
      });
      await svc.transitionStatus('FLOW-01', 'ACTIVE', { transitionedBy: 'alice' });
      expect(writes[0]).toBe('xiigen-flow-lifecycle-audit');
      expect(writes[1]).toBe('xiigen-flow-lifecycle');
    });

    it('defaults from PENDING when no existing record', async () => {
      const result = await svc.transitionStatus('FLOW-NEW', 'ACTIVE');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('ACTIVE');
    });

    it('transitions ACTIVE → DEPRECATED', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({
          flowId: 'FLOW-01',
          status: 'ACTIVE',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
          updatedBy: 'system',
        }),
      );
      const result = await svc.transitionStatus('FLOW-01', 'DEPRECATED', { reason: 'sunset' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('DEPRECATED');
      // audit entry contains reason
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-flow-lifecycle-audit',
        expect.objectContaining({ reason: 'sunset', fromStatus: 'ACTIVE', toStatus: 'DEPRECATED' }),
        expect.any(String),
      );
    });
  });

  // ─── getAuditTrail ───────────────────────────────────────────────────────

  describe('getAuditTrail', () => {
    it('returns failure for missing flowId', async () => {
      const result = await svc.getAuditTrail('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('returns empty array when db fails', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'search failed'),
      );
      const result = await svc.getAuditTrail('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('returns entries sorted by timestamp asc', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([
          {
            auditId: 'a2',
            flowId: 'FLOW-01',
            timestamp: '2024-01-02T00:00:00Z',
            fromStatus: 'ACTIVE',
            toStatus: 'DEPRECATED',
            transitionedBy: 'sys',
          },
          {
            auditId: 'a1',
            flowId: 'FLOW-01',
            timestamp: '2024-01-01T00:00:00Z',
            fromStatus: 'PENDING',
            toStatus: 'ACTIVE',
            transitionedBy: 'sys',
          },
        ]),
      );
      const result = await svc.getAuditTrail('FLOW-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.[0].auditId).toBe('a1');
      expect(result.data?.[1].auditId).toBe('a2');
    });
  });

  // ─── ALLOWED_TRANSITIONS export ──────────────────────────────────────────

  describe('ALLOWED_TRANSITIONS export', () => {
    it('terminal states have no allowed transitions', () => {
      expect(ALLOWED_TRANSITIONS['DEPRECATED']).toEqual([]);
      expect(ALLOWED_TRANSITIONS['FAILED']).toEqual([]);
    });
  });
});
