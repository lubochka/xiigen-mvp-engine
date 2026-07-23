// T75 ConnectionGraphWriterService — unit tests
// Validates: both A→B and B→A edges written, direction-independent connectionId, storeDocument before enqueue

import { ConnectionGraphWriterService } from './connection-graph-writer.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'conn-doc-001' })),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' })),
  };
  return { db, queue };
}

const BASE_INPUT = {
  userIdA: 'user-A',
  userIdB: 'user-B',
  tenantId: 'tenant-alpha',
  requestId: 'req-001',
};

describe('ConnectionGraphWriterService — T75', () => {
  let service: ConnectionGraphWriterService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new ConnectionGraphWriterService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );
    jest.clearAllMocks();
  });

  it('T75-1: both A→B and B→A edges written (two storeDocument calls)', async () => {
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'conn-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    const result = await service.writeConnection(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(mocks.db.storeDocument).toHaveBeenCalledTimes(2);
  });

  it('T75-2: connectionId is direction-independent (same for A→B and B→A inputs)', async () => {
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'conn-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    const resultAB = await service.writeConnection({
      userIdA: 'user-A',
      userIdB: 'user-B',
      tenantId: 'tenant-alpha',
      requestId: 'req-001',
    });
    const connectionIdAB = resultAB.data?.connectionId;

    jest.clearAllMocks();
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'conn-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    const resultBA = await service.writeConnection({
      userIdA: 'user-B',
      userIdB: 'user-A',
      tenantId: 'tenant-alpha',
      requestId: 'req-002',
    });
    const connectionIdBA = resultBA.data?.connectionId;

    expect(connectionIdAB).toBe(connectionIdBA);
  });

  it('T75-3: storeDocument called BEFORE enqueue (DNA-8)', async () => {
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'conn-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    await service.writeConnection(BASE_INPUT);

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });
});
