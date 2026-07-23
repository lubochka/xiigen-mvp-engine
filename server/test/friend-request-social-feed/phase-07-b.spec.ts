/**
 * FLOW-07 Phase B — T74 FriendRequestResponder
 *
 * T74-1: ACCEPT path stores before emit
 * T74-2: REJECT path stores before emit
 * T74-3: REQUEST_EXPIRED returns failure not throws
 * T74-4: GROUP_NOT_FOUND on missing requestId
 * T74-5: storeDocument BEFORE emit (callOrder)
 * T74-6: knowledgeScope=PRIVATE on stored record
 * MT-2: FriendRequestAccepted event has correct CloudEvents envelope
 */

import 'reflect-metadata';
import { FriendRequestResponderService } from '../../src/engine/flows/friend-request-social-feed/friend-request-responder.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(
  callOrder: string[],
  seed: Record<string, Array<Record<string, unknown>>> = {},
  storeCapture?: Array<Record<string, unknown>>,
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, _filter: Record<string, unknown>) => {
        return DataProcessResult.success(seed[index] ?? []);
      }),
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

const PENDING_REQUEST: Record<string, unknown> = {
  requestId: 'req-001',
  senderUserId: 'user-A',
  recipientUserId: 'user-B',
  tenantId: 'tenant-X',
  connectionId: 'conn-user-A-user-B-tenant-X',
  status: 'PENDING',
  sentAt: new Date().toISOString(),
};

const BASE_RESPOND_INPUT = {
  requestId: 'req-001',
  responderId: 'user-B',
  tenantId: 'tenant-X',
  response: 'ACCEPT' as const,
};

describe('T74 FriendRequestResponder', () => {
  it('T74-1: ACCEPT path stores before emit', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [PENDING_REQUEST] });
    const queue = makeQueue(callOrder);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    await svc.respondToRequest(BASE_RESPOND_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T74-2: REJECT path stores before emit', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [PENDING_REQUEST] });
    const queue = makeQueue(callOrder);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    await svc.respondToRequest({ ...BASE_RESPOND_INPUT, response: 'REJECT' });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T74-3: REQUEST_EXPIRED returns failure not throws', async () => {
    const callOrder: string[] = [];
    const expiredRequest = { ...PENDING_REQUEST, status: 'EXPIRED' };
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [expiredRequest] });
    const queue = makeQueue(callOrder);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    let threw = false;
    let result: DataProcessResult<unknown>;
    try {
      result = await svc.respondToRequest(BASE_RESPOND_INPUT);
    } catch {
      threw = true;
      result = DataProcessResult.failure('THREW', 'threw');
    }

    expect(threw).toBe(false);
    expect(result!.isSuccess).toBe(false);
    expect(result!.errorCode).toBe('REQUEST_EXPIRED');
  });

  it('T74-4: GROUP_NOT_FOUND on missing requestId', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, {}); // no records
    const queue = makeQueue(callOrder);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    const result = await svc.respondToRequest(BASE_RESPOND_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GROUP_NOT_FOUND');
  });

  it('T74-5: storeDocument BEFORE emit (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [PENDING_REQUEST] });
    const queue = makeQueue(callOrder);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    await svc.respondToRequest(BASE_RESPOND_INPUT);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T74-6: knowledgeScope=PRIVATE on stored record', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], { 'xiigen-friend-requests': [PENDING_REQUEST] }, stored);
    const queue = makeQueue([]);
    const svc = new FriendRequestResponderService(db as any, queue as any);

    await svc.respondToRequest(BASE_RESPOND_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('MT-2: FriendRequestAccepted event has correct CloudEvents envelope', async () => {
    const queue = makeQueue([]);
    const db = makeDb([], { 'xiigen-friend-requests': [PENDING_REQUEST] });
    const svc = new FriendRequestResponderService(db as any, queue as any);

    await svc.respondToRequest(BASE_RESPOND_INPUT);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('accepted');
    expect(event.data).toBeDefined();
    const data = event.data as Record<string, unknown>;
    expect(data['requestId']).toBe(BASE_RESPOND_INPUT.requestId);
    expect(data['tenantId']).toBe(BASE_RESPOND_INPUT.tenantId);
  });
});
