import { SocialNotificationDispatcherService } from './social-notification-dispatcher.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('SocialNotificationDispatcherService (T79)', () => {
  const makeRequest = () => ({
    notificationId: 'notif-001',
    tenantId: 'tenant-1',
    recipientUserId: 'user-B',
    notificationType: 'friend_request',
    payload: { senderId: 'user-A', message: 'Friend request received' },
  });

  const makeNotificationService = (hasConsent: boolean) => ({
    checkConsent: jest.fn().mockResolvedValue(DataProcessResult.success({ hasConsent })),
    getDeliveryChannel: jest.fn().mockResolvedValue(DataProcessResult.success({ channel: 'push' })),
  });

  const makeDb = () => ({
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: true })),
  });

  const makeQueue = () => ({
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  });

  const makeUserProfileService = () => ({
    getProfile: jest.fn().mockResolvedValue(DataProcessResult.success({ userId: 'user-B' })),
  });

  it('T79-1: Consent given: SocialNotificationSent enqueued, status=DISPATCHED', async () => {
    const queue = makeQueue();

    const service = new SocialNotificationDispatcherService(
      makeUserProfileService(),
      queue as unknown as IQueueService,
      makeNotificationService(true),
      makeDb() as unknown as IDatabaseService,
    );

    const result = await service.dispatchNotification(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('DISPATCHED');
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.notification.sent',
      expect.objectContaining({ notificationId: 'notif-001' }),
    );
  });

  it('T79-2: No consent: return success({ status: SKIPPED }) — no enqueue', async () => {
    const queue = makeQueue();
    const db = makeDb();

    const service = new SocialNotificationDispatcherService(
      makeUserProfileService(),
      queue as unknown as IQueueService,
      makeNotificationService(false),
      db as unknown as IDatabaseService,
    );

    const result = await service.dispatchNotification(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('SKIPPED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T79-3: storeDocument BEFORE enqueue when consent given (DNA-8)', async () => {
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

    const service = new SocialNotificationDispatcherService(
      makeUserProfileService(),
      queue as unknown as IQueueService,
      makeNotificationService(true),
      db as unknown as IDatabaseService,
    );

    await service.dispatchNotification(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});
