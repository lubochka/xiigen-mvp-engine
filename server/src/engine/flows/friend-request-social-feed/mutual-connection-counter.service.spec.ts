import { MutualConnectionCounterService } from './mutual-connection-counter.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('MutualConnectionCounterService (T80)', () => {
  const makeRequest = () => ({
    userIdA: 'user-A',
    userIdB: 'user-B',
    tenantId: 'tenant-1',
  });

  const makeConnectionGraphService = (connectionsA: string[], connectionsB: string[]) => ({
    getConnections: jest
      .fn()
      .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: connectionsA }))
      .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: connectionsB })),
  });

  const makeDb = () => ({
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: true })),
  });

  const makeQueue = () => ({
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  });

  it('T80-1: Full recompute: mutual count computed from intersection (not incremented)', async () => {
    // A has connections [C, D, E], B has connections [D, E, F]
    // Mutual = [D, E] → count = 2
    const service = new MutualConnectionCounterService(
      makeConnectionGraphService(['user-C', 'user-D', 'user-E'], ['user-D', 'user-E', 'user-F']),
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
    );

    const result = await service.countMutualConnections(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.mutualCount).toBe(2);
  });

  it('T80-2: Idempotent: calling twice with same inputs returns same count', async () => {
    // Both calls use same data — same count must result
    const connectionGraphService = {
      getConnections: jest
        .fn()
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['user-C', 'user-D'] }))
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['user-D', 'user-E'] }))
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['user-C', 'user-D'] }))
        .mockResolvedValueOnce(DataProcessResult.success({ connectionIds: ['user-D', 'user-E'] })),
    };

    const service = new MutualConnectionCounterService(
      connectionGraphService,
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
    );

    const result1 = await service.countMutualConnections(makeRequest());
    const result2 = await service.countMutualConnections(makeRequest());

    expect(result1.data?.mutualCount).toBe(result2.data?.mutualCount);
    expect(result1.data?.mutualCount).toBe(1);
  });

  it('T80-3: storeDocument BEFORE enqueue (DNA-8 call order)', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({ stored: true });
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };

    const service = new MutualConnectionCounterService(
      makeConnectionGraphService(['user-C', 'user-D'], ['user-D', 'user-E']),
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );

    await service.countMutualConnections(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});
