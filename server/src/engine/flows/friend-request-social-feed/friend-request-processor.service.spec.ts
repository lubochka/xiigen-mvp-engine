// T73 FriendRequestProcessorService — unit tests
// Validates: happy path SENT, BLOCKED on privacy denial, T81 before storeDocument, storeDocument before enqueue

import { FriendRequestProcessorService } from './friend-request-processor.service';
import { PrivacyGatekeeperService } from './privacy-gatekeeper.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks() {
  const db = {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'req-001' })),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' })),
  };
  const privacyGatekeeper = {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
  } as unknown as PrivacyGatekeeperService;
  const rateLimit = {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: true })),
    increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
  return { db, queue, privacyGatekeeper, rateLimit };
}

const BASE_INPUT = {
  requestId: 'req-001',
  senderUserId: 'user-A',
  recipientUserId: 'user-B',
  tenantId: 'tenant-alpha',
  message: 'Hello!',
};

describe('FriendRequestProcessorService — T73', () => {
  let service: FriendRequestProcessorService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new FriendRequestProcessorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
      mocks.privacyGatekeeper,
      mocks.rateLimit,
    );
    jest.clearAllMocks();
  });

  it('T73-1: SENT when privacy allows and both profiles valid', async () => {
    (mocks.privacyGatekeeper.check as jest.Mock).mockResolvedValue(
      DataProcessResult.success({ allowed: true }),
    );
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'req-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' }));

    const result = await service.processFriendRequest(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('SENT');
    expect(result.data?.requestId).toBe('req-001');
  });

  it('T73-2: BLOCKED (success with status=BLOCKED) when T81 returns allowed=false', async () => {
    (mocks.privacyGatekeeper.check as jest.Mock).mockResolvedValue(
      DataProcessResult.success({ allowed: false, reason: 'friend_requests_disabled' }),
    );

    const result = await service.processFriendRequest(BASE_INPUT);

    // Must be success (not failure) with BLOCKED status
    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('BLOCKED');
    expect(result.data?.reason).toBe('friend_requests_disabled');
    // storeDocument must NOT be called when blocked
    expect(mocks.db.storeDocument).not.toHaveBeenCalled();
  });

  it('T73-3: T81 (privacyGatekeeper.check) called BEFORE storeDocument', async () => {
    (mocks.privacyGatekeeper.check as jest.Mock).mockResolvedValue(
      DataProcessResult.success({ allowed: true }),
    );
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'req-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    await service.processFriendRequest(BASE_INPUT);

    const privacyOrder = (mocks.privacyGatekeeper.check as jest.Mock).mock.invocationCallOrder[0];
    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    expect(privacyOrder).toBeLessThan(storeOrder);
  });

  it('T73-4: storeDocument called BEFORE enqueue (DNA-8)', async () => {
    (mocks.privacyGatekeeper.check as jest.Mock).mockResolvedValue(
      DataProcessResult.success({ allowed: true }),
    );
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'req-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    await service.processFriendRequest(BASE_INPUT);

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });
});
