import { GroupMembershipProcessorService } from './group-membership-processor.service';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('GroupMembershipProcessorService (T71)', () => {
  let service: GroupMembershipProcessorService;
  let db: { storeDocument: jest.Mock };
  let groupMembershipService: { getGroupConfig: jest.Mock; validateInvitation: jest.Mock };
  let queue: { enqueue: jest.Mock };

  beforeEach(() => {
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };
    groupMembershipService = {
      getGroupConfig: jest.fn(),
      validateInvitation: jest.fn(),
    };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    service = new GroupMembershipProcessorService(
      db as unknown as IDatabaseService,
      groupMembershipService as unknown as ConstructorParameters<
        typeof GroupMembershipProcessorService
      >[1],
      queue as unknown as IQueueService,
    );
  });

  it('JOIN without invite in invite_only group returns INVITE_REQUIRED — no store', async () => {
    groupMembershipService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: true },
    });

    const result = await service.processMembership({
      membershipEventId: 'evt-001',
      userId: 'user-1',
      groupId: 'grp-1',
      tenantId: 'tenant-1',
      action: 'JOIN',
      // no invitationId
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('INVITE_REQUIRED');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('JOIN with valid invite stores record with tenantId AND groupId, enqueues MembershipJoined', async () => {
    groupMembershipService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: true },
    });
    groupMembershipService.validateInvitation.mockResolvedValue({
      isSuccess: true,
      data: { valid: true },
    });

    const result = await service.processMembership({
      membershipEventId: 'evt-002',
      userId: 'user-2',
      groupId: 'grp-2',
      tenantId: 'tenant-2',
      action: 'JOIN',
      invitationId: 'inv-abc',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('JOINED');

    // IR-3: stored record must include both tenantId AND groupId (dual scope)
    const storedDoc = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(storedDoc['tenantId']).toBe('tenant-2');
    expect(storedDoc['groupId']).toBe('grp-2');

    // MembershipJoined event enqueued
    expect(queue.enqueue).toHaveBeenCalledWith(
      'groups.membership.joined',
      expect.objectContaining({
        membershipEventId: 'evt-002',
        userId: 'user-2',
        groupId: 'grp-2',
        tenantId: 'tenant-2',
      }),
    );
  });

  it('DNA-8: storeDocument is called BEFORE enqueue', async () => {
    groupMembershipService.getGroupConfig.mockResolvedValue({
      isSuccess: true,
      data: { invite_only: false },
    });

    const callOrder: string[] = [];
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return { isSuccess: true };
    });
    queue.enqueue.mockImplementation(async () => {
      callOrder.push('enqueue');
    });

    await service.processMembership({
      membershipEventId: 'evt-003',
      userId: 'user-3',
      groupId: 'grp-3',
      tenantId: 'tenant-3',
      action: 'JOIN',
    });

    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });
});
