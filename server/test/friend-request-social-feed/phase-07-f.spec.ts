/**
 * FLOW-07 Phase F — T79 SocialNotificationDispatcher
 *
 * T79-1: Dispatches notification on FriendRequestAccepted
 * T79-2: Returns success even when notification channel throws (OBSERVABILITY)
 * T79-3: Notification channels from FREEDOM config
 * T79-4: storeDocument before dispatch (callOrder)
 * T79-5: knowledgeScope=PRIVATE on notification record
 */

import 'reflect-metadata';
import { SocialNotificationDispatcherService } from '../../src/engine/flows/friend-request-social-feed/social-notification-dispatcher.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function makeNotificationService(shouldThrow = false) {
  return {
    checkConsent: jest.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error('consent error');
      return DataProcessResult.success({ hasConsent: true });
    }),
    getDeliveryChannel: jest.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error('channel error');
      return DataProcessResult.success({ channel: 'push' });
    }),
    dispatch: jest.fn().mockImplementation(async () => {
      if (shouldThrow) throw new Error('channel error');
      return DataProcessResult.success({});
    }),
  };
}

function makeNotificationServiceThrows() {
  return {
    checkConsent: jest.fn().mockRejectedValue(new Error('consent error')),
    getDeliveryChannel: jest.fn().mockRejectedValue(new Error('channel error')),
    dispatch: jest.fn().mockRejectedValue(new Error('channel error')),
  };
}

function makeFreedom(channels: string[] = ['push', 'email']) {
  return {
    getConfig: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ flow07_notification_channels: channels })),
  };
}

const makeUserProfile = () => ({
  getProfile: jest.fn().mockResolvedValue(DataProcessResult.success({ userId: 'user-B' })),
});

const BASE_REQUEST = {
  notificationId: 'notif-001',
  tenantId: 'tenant-X',
  recipientUserId: 'user-B',
  notificationType: 'FriendRequestAccepted',
  payload: { requestId: 'req-001' },
};

describe('T79 SocialNotificationDispatcher', () => {
  it('T79-1: Dispatches notification on FriendRequestAccepted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const notif = makeNotificationService();
    const freedom = makeFreedom();

    const svc = new SocialNotificationDispatcherService(
      makeUserProfile(),
      queue as any,
      notif as any,
      db as any,
      freedom as any,
    );
    const result = await svc.dispatchNotification(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('DISPATCHED');
  });

  it('T79-2: Returns success even when notification channel throws (OBSERVABILITY)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const notif = makeNotificationServiceThrows();
    const freedom = makeFreedom();

    const svc = new SocialNotificationDispatcherService(
      makeUserProfile(),
      queue as any,
      notif as any,
      db as any,
      freedom as any,
    );

    let threw = false;
    let result: DataProcessResult<unknown>;
    try {
      result = await svc.dispatchNotification(BASE_REQUEST);
    } catch {
      threw = true;
      result = DataProcessResult.failure('THREW', 'threw');
    }

    expect(threw).toBe(false);
    expect(result!.isSuccess).toBe(true);
  });

  it('T79-3: Notification channels from FREEDOM config', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const notif = makeNotificationService();
    const freedom = makeFreedom(['sms', 'push']);

    const svc = new SocialNotificationDispatcherService(
      makeUserProfile(),
      queue as any,
      notif as any,
      db as any,
      freedom as any,
    );
    await svc.dispatchNotification(BASE_REQUEST);

    expect(freedom.getConfig).toHaveBeenCalled();
  });

  it('T79-4: storeDocument before dispatch (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const notif = makeNotificationService();
    const freedom = makeFreedom();

    const svc = new SocialNotificationDispatcherService(
      makeUserProfile(),
      queue as any,
      notif as any,
      db as any,
      freedom as any,
    );
    await svc.dispatchNotification(BASE_REQUEST);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T79-5: knowledgeScope=PRIVATE on notification record', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const notif = makeNotificationService();
    const freedom = makeFreedom();

    const svc = new SocialNotificationDispatcherService(
      makeUserProfile(),
      queue as any,
      notif as any,
      db as any,
      freedom as any,
    );
    await svc.dispatchNotification(BASE_REQUEST);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });
});
