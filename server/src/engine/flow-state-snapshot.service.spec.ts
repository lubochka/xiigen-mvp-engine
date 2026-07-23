import { FlowStateSnapshotService } from './flow-state-snapshot.service';
import { DataProcessResult } from '../kernel/data-process-result';

describe('FlowStateSnapshotService', () => {
  let service: FlowStateSnapshotService;

  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FlowStateSnapshotService(mockDb as any);
  });

  describe('writeSnapshot', () => {
    it('returns snapshot with snapshotId', async () => {
      const result = await service.writeSnapshot('FLOW-01', 'T47', 'acme', 'run-1', 'PHASE_B', {
        step: 1,
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.snapshotId).toBeDefined();
      expect(result.data?.flowId).toBe('FLOW-01');
      expect(result.data?.taskTypeId).toBe('T47');
      expect(result.data?.phase).toBe('PHASE_B');
    });

    it('calls storeDocument on the database', async () => {
      await service.writeSnapshot('FLOW-01', 'T47', 'acme', 'run-1', 'PHASE_B', {});
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-flow-state-snapshots',
        expect.any(Object),
        expect.any(String),
      );
    });

    it('includes optional appReopenBehavior', async () => {
      const result = await service.writeSnapshot(
        'FLOW-01',
        'T47',
        'acme',
        'run-1',
        'PHASE_B',
        {},
        {
          appReopenBehavior: 'resume',
        },
      );
      expect(result.data?.appReopenBehavior).toBe('resume');
    });
  });

  describe('getLatestSnapshot', () => {
    it('returns null when no results', async () => {
      const result = await service.getLatestSnapshot('FLOW-01', 'run-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns most recent snapshot by updatedAt', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([
          { snapshotId: 'a', updatedAt: '2024-01-01T00:00:00Z' },
          { snapshotId: 'b', updatedAt: '2024-01-02T00:00:00Z' },
        ]),
      );
      const result = await service.getLatestSnapshot('FLOW-01', 'run-1');
      expect(result.data?.['snapshotId']).toBe('b');
    });
  });
});
