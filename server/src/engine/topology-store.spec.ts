import { TopologyStore } from './topology-store';
import { DataProcessResult } from '../kernel/data-process-result';

describe('TopologyStore', () => {
  let store: TopologyStore;

  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    store = new TopologyStore(mockDb as any);
  });

  describe('getTopology', () => {
    it('returns null gracefully for unknown taskTypeId', async () => {
      const result = await store.getTopology('T999');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns topology when found', async () => {
      const topology = {
        taskTypeId: 'T47',
        flowId: 'FLOW-01',
        version: '1.0.0',
        nodes: [],
        edges: [],
      };
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([topology]));
      const result = await store.getTopology('T47');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.taskTypeId).toBe('T47');
    });

    it('returns latest version', async () => {
      const topologies = [
        { taskTypeId: 'T47', version: '1.0.0', nodes: [], edges: [] },
        { taskTypeId: 'T47', version: '2.0.0', nodes: [], edges: [] },
      ];
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success(topologies));
      const result = await store.getTopology('T47');
      expect(result.data?.version).toBe('2.0.0');
    });
  });

  describe('storeTopology', () => {
    it('stores and returns topology', async () => {
      const topology = {
        flowId: 'FLOW-01',
        taskTypeId: 'T47',
        version: '1.0.0',
        nodes: [],
        edges: [],
      };
      const result = await store.storeTopology(topology);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.taskTypeId).toBe('T47');
    });
  });
});
