/**
 * FLOW-07 Phase A — T73 FriendRequestProcessor
 *
 * T73-1: T81 called before storeDocument (callOrder spy)
 * T73-2: FriendRequestSent NOT emitted when T81 returns allowed=false
 * T73-3: connectionId direction-independent: hash(sort([A,B])) === hash(sort([B,A]))
 * T73-4: Duplicate request returns success with existing record (SETNX)
 * T73-5: Mutual pending detection: B→A pending → auto-accept both
 * T73-6: storeDocument before FriendRequestSent (callOrder)
 * T73-7: Rate limit key = tenantId + senderUserId (PER-TENANT-COUNTER-001)
 * MT-1: FriendRequest record knowledgeScope=PRIVATE + tenantId from ALS
 */

import 'reflect-metadata';
import { FriendRequestProcessorService } from '../../src/engine/flows/friend-request-social-feed/friend-request-processor.service';
import { PrivacyGatekeeperService } from '../../src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock helpers ──────────────────────────────────────────────────────────────

function makeDb(
  callOrder: string[],
  seed: Record<string, Array<Record<string, unknown>>> = {},
  storeCapture?: Array<Record<string, unknown>>,
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        const rows = seed[index] ?? [];
        const filtered = rows.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
        return DataProcessResult.success(filtered);
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

function makePrivacyGatekeeper(callOrder: string[], allowed: boolean) {
  return {
    check: jest.fn().mockImplementation(async () => {
      callOrder.push('privacyCheck');
      return DataProcessResult.success({ allowed });
    }),
  } as unknown as PrivacyGatekeeperService;
}

function makePrivacyGatekeeperBlocked(callOrder: string[]) {
  return makePrivacyGatekeeper(callOrder, false);
}

function makePrivacyGatekeeperAllowed(callOrder: string[]) {
  return makePrivacyGatekeeper(callOrder, true);
}

function makeRateLimit(exceeded: boolean) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed: !exceeded })),
    increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

const BASE_INPUT = {
  requestId: 'req-001',
  senderUserId: 'user-A',
  recipientUserId: 'user-B',
  tenantId: 'tenant-X',
  message: 'Hello',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('T73 FriendRequestProcessor', () => {
  it('T73-1: T81 called before storeDocument', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    await svc.processFriendRequest(BASE_INPUT);

    const privacyIdx = callOrder.indexOf('privacyCheck');
    const storeIdx = callOrder.indexOf('storeDocument');
    expect(privacyIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(privacyIdx);
  });

  it('T73-2: FriendRequestSent NOT emitted when T81 returns allowed=false', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperBlocked(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    const result = await svc.processFriendRequest(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(queue._enqueued.length).toBe(0);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('T73-3: connectionId direction-independent', async () => {
    const callOrder: string[] = [];
    const storeCapA: Array<Record<string, unknown>> = [];
    const storeCapB: Array<Record<string, unknown>> = [];
    const dbA = makeDb(callOrder, {}, storeCapA);
    const dbB = makeDb(callOrder, {}, storeCapB);
    const queueA = makeQueue([]);
    const queueB = makeQueue([]);
    const gk = makePrivacyGatekeeperAllowed([]);
    const rateLimit = makeRateLimit(false);

    const svcA = new FriendRequestProcessorService(dbA as any, queueA as any, gk, rateLimit as any);
    const svcB = new FriendRequestProcessorService(dbB as any, queueB as any, gk, rateLimit as any);

    await svcA.processFriendRequest({
      ...BASE_INPUT,
      senderUserId: 'user-A',
      recipientUserId: 'user-B',
    });
    await svcB.processFriendRequest({
      ...BASE_INPUT,
      senderUserId: 'user-B',
      recipientUserId: 'user-A',
    });

    const connIdA = storeCapA[0]?.['connectionId'] as string;
    const connIdB = storeCapB[0]?.['connectionId'] as string;
    expect(connIdA).toBeDefined();
    expect(connIdA).toBe(connIdB);
  });

  it('T73-4: Duplicate request returns success with existing record (SETNX)', async () => {
    const callOrder: string[] = [];
    const existingRecord = {
      requestId: BASE_INPUT.requestId,
      senderUserId: BASE_INPUT.senderUserId,
      recipientUserId: BASE_INPUT.recipientUserId,
      tenantId: BASE_INPUT.tenantId,
      status: 'PENDING',
    };
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [existingRecord] });
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    const result = await svc.processFriendRequest(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('T73-5: Mutual pending detection: B→A pending → auto-accept both', async () => {
    const callOrder: string[] = [];
    // B→A pending exists
    const mutualPending = {
      requestId: 'req-mutual',
      senderUserId: 'user-B',
      recipientUserId: 'user-A',
      tenantId: 'tenant-X',
      status: 'PENDING',
    };
    const db = makeDb(callOrder, { 'xiigen-friend-requests': [mutualPending] });
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    const result = await svc.processFriendRequest(BASE_INPUT); // A→B

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('AUTO_ACCEPTED');
  });

  it('T73-6: storeDocument before FriendRequestSent', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    await svc.processFriendRequest(BASE_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T73-7: Rate limit key = tenantId + senderUserId', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    await svc.processFriendRequest(BASE_INPUT);

    const rateLimitCall = (rateLimit.check as jest.Mock).mock.calls[0]?.[0] as Record<
      string,
      unknown
    >;
    expect(rateLimitCall?.['key']).toContain(BASE_INPUT.tenantId);
    expect(rateLimitCall?.['key']).toContain(BASE_INPUT.senderUserId);
  });

  it('MT-1: FriendRequest record knowledgeScope=PRIVATE', async () => {
    const callOrder: string[] = [];
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb(callOrder, {}, stored);
    const queue = makeQueue(callOrder);
    const gk = makePrivacyGatekeeperAllowed(callOrder);
    const rateLimit = makeRateLimit(false);

    const svc = new FriendRequestProcessorService(db as any, queue as any, gk, rateLimit as any);
    await svc.processFriendRequest(BASE_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
    expect(stored[0]?.['tenantId']).toBe(BASE_INPUT.tenantId);
  });
});
