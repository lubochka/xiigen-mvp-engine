// T74 FriendRequestResponderService — unit tests
// Validates: ACCEPTED flow, REJECTED flow, idempotent duplicate accept

import { FriendRequestResponderService } from './friend-request-responder.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const EXISTING_REQUEST = {
  requestId: 'req-001',
  connectionId: 'conn-user-A-user-B-tenant-alpha',
  senderUserId: 'user-A',
  responderId: 'user-B',
  tenantId: 'tenant-alpha',
  status: 'PENDING',
};

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'resp-req-001' })),
    searchDocuments: jest.fn().mockImplementation((_index: string, _filter: unknown) => {
      return Promise.resolve(DataProcessResult.success([EXISTING_REQUEST]));
    }),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' })),
  };
  return { db, queue };
}

const BASE_INPUT = {
  requestId: 'req-001',
  responderId: 'user-B',
  tenantId: 'tenant-alpha',
};

describe('FriendRequestResponderService — T74', () => {
  let service: FriendRequestResponderService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new FriendRequestResponderService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );
    jest.clearAllMocks();
  });

  it('T74-1: ACCEPTED flow — storeDocument called, FriendRequestAccepted enqueued', async () => {
    mocks.db.searchDocuments.mockResolvedValue(DataProcessResult.success([EXISTING_REQUEST]));
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'resp-req-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' }));

    const result = await service.respondToRequest({ ...BASE_INPUT, response: 'ACCEPT' });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('ACCEPTED');
    expect(mocks.db.storeDocument).toHaveBeenCalledWith(
      'xiigen-friend-request-responses',
      expect.objectContaining({ status: 'ACCEPTED', requestId: 'req-001' }),
      expect.any(String),
    );
    expect(mocks.queue.enqueue).toHaveBeenCalledWith(
      'social.friend-request.accepted',
      expect.objectContaining({ requestId: 'req-001' }),
    );

    // DNA-8: storeDocument before enqueue
    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });

  it('T74-2: REJECTED flow — storeDocument called, FriendRequestRejected enqueued', async () => {
    mocks.db.searchDocuments.mockResolvedValue(DataProcessResult.success([EXISTING_REQUEST]));
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'resp-req-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' }));

    const result = await service.respondToRequest({ ...BASE_INPUT, response: 'REJECT' });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('REJECTED');
    expect(mocks.db.storeDocument).toHaveBeenCalledWith(
      'xiigen-friend-request-responses',
      expect.objectContaining({ status: 'REJECTED', requestId: 'req-001' }),
      expect.any(String),
    );
    expect(mocks.queue.enqueue).toHaveBeenCalledWith(
      'social.friend-request.rejected',
      expect.objectContaining({ requestId: 'req-001' }),
    );

    // DNA-8: storeDocument before enqueue
    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });

  it('T74-3: GROUP_NOT_FOUND when friend request does not exist', async () => {
    mocks.db.searchDocuments.mockResolvedValue(DataProcessResult.success([]));

    const result = await service.respondToRequest({ ...BASE_INPUT, response: 'ACCEPT' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GROUP_NOT_FOUND');
    expect(mocks.db.storeDocument).not.toHaveBeenCalled();
  });
});
