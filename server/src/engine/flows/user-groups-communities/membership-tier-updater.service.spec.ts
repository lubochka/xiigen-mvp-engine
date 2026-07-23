import { MembershipTierUpdaterService } from './membership-tier-updater.service';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('MembershipTierUpdaterService (T72)', () => {
  let service: MembershipTierUpdaterService;
  let db: { storeDocument: jest.Mock };
  let groupMembershipService: { getMemberTier: jest.Mock };
  let queue: { enqueue: jest.Mock };

  beforeEach(() => {
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };
    groupMembershipService = { getMemberTier: jest.fn() };
    queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
    service = new MembershipTierUpdaterService(
      db as unknown as IDatabaseService,
      groupMembershipService as unknown as ConstructorParameters<
        typeof MembershipTierUpdaterService
      >[1],
      queue as unknown as IQueueService,
    );
  });

  it('self-promotion attempt returns BLOCKED with reason SELF_PROMOTION', async () => {
    const result = await service.updateTier({
      updateEventId: 'upd-001',
      userId: 'user-1',
      groupId: 'grp-1',
      tenantId: 'tenant-1',
      requestedTier: 'PREMIUM',
      requestingUserId: 'user-1', // same as userId — self-promotion
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('BLOCKED');
    expect(result.data?.reason).toBe('SELF_PROMOTION');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('admin escalation by non-admin returns BLOCKED with reason ADMIN_ONLY', async () => {
    groupMembershipService.getMemberTier.mockResolvedValue({
      isSuccess: true,
      data: { tier: 'PREMIUM' }, // requesting user is PREMIUM, not ADMIN
    });

    const result = await service.updateTier({
      updateEventId: 'upd-002',
      userId: 'user-2',
      groupId: 'grp-2',
      tenantId: 'tenant-2',
      requestedTier: 'ADMIN',
      requestingUserId: 'user-moderator', // different user, but not ADMIN
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('BLOCKED');
    expect(result.data?.reason).toBe('ADMIN_ONLY');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('valid tier update: storeDocument called, TierUpdated enqueued, status UPDATED', async () => {
    groupMembershipService.getMemberTier.mockResolvedValue({
      isSuccess: true,
      data: { tier: 'STANDARD' },
    });

    const callOrder: string[] = [];
    db.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return { isSuccess: true };
    });
    queue.enqueue.mockImplementation(async () => {
      callOrder.push('enqueue');
    });

    const result = await service.updateTier({
      updateEventId: 'upd-003',
      userId: 'user-3',
      groupId: 'grp-3',
      tenantId: 'tenant-3',
      requestedTier: 'PREMIUM',
      requestingUserId: 'admin-user', // different user
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('UPDATED');
    expect(result.data?.tier).toBe('PREMIUM');

    // DNA-8: storeDocument BEFORE enqueue
    expect(callOrder).toEqual(['storeDocument', 'enqueue']);

    expect(queue.enqueue).toHaveBeenCalledWith(
      'groups.membership.tier-updated',
      expect.objectContaining({
        updateEventId: 'upd-003',
        userId: 'user-3',
        tier: 'PREMIUM',
      }),
    );
  });
});
