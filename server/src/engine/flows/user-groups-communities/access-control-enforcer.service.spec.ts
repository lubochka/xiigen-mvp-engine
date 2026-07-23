import { AccessControlEnforcerService } from './access-control-enforcer.service';

describe('AccessControlEnforcerService (T90)', () => {
  let service: AccessControlEnforcerService;
  let db: { storeDocument: jest.Mock };
  let accessControlService: {
    getGroupConfig: jest.Mock;
    isMember: jest.Mock;
    checkTierAccess: jest.Mock;
  };
  let queue: { enqueue: jest.Mock };

  beforeEach(() => {
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };
    accessControlService = {
      getGroupConfig: jest.fn(),
      isMember: jest.fn(),
      checkTierAccess: jest.fn().mockResolvedValue({ isSuccess: true, data: { allowed: true } }),
    };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    service = new AccessControlEnforcerService(db, accessControlService, queue);
  });

  it('IR-2: invite_only group, non-member returns allowed=false with reason NOT_DISCOVERABLE', async () => {
    accessControlService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: true },
    });
    accessControlService.isMember.mockResolvedValue({
      isSuccess: true,
      data: { member: false },
    });

    const result = await service.enforceAccess({
      accessEventId: 'acc-001',
      userId: 'user-1',
      groupId: 'grp-private',
      tenantId: 'tenant-1',
      requestedAction: 'VIEW_GROUP',
      membershipTier: 'FREE',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.allowed).toBe(false);
    expect(result.data?.reason).toBe('NOT_DISCOVERABLE');
  });

  it('IR-1: stored access log record includes BOTH tenantId AND groupId (dual scope)', async () => {
    accessControlService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: false },
    });
    accessControlService.checkTierAccess.mockResolvedValue({
      isSuccess: true,
      data: { allowed: true },
    });

    await service.enforceAccess({
      accessEventId: 'acc-002',
      userId: 'user-2',
      groupId: 'grp-open',
      tenantId: 'tenant-2',
      requestedAction: 'POST_CONTENT',
      membershipTier: 'STANDARD',
    });

    const storedDoc = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(storedDoc['tenantId']).toBe('tenant-2');
    expect(storedDoc['groupId']).toBe('grp-open');
  });

  it('DNA-8: storeDocument is called BEFORE enqueue', async () => {
    accessControlService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: false },
    });
    accessControlService.checkTierAccess.mockResolvedValue({
      isSuccess: true,
      data: { allowed: true },
    });

    const callOrder: string[] = [];
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return { isSuccess: true };
    });
    queue.enqueue.mockImplementation(async () => {
      callOrder.push('enqueue');
    });

    await service.enforceAccess({
      accessEventId: 'acc-003',
      userId: 'user-3',
      groupId: 'grp-3',
      tenantId: 'tenant-3',
      requestedAction: 'READ',
      membershipTier: 'PREMIUM',
    });

    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });
});
