/**
 * FLOW-08 Phase A — T67 ParticipationInviter (+ SUBFLOW-08-RATE)
 *
 * T67-1: audienceSize=0 is valid — emits immediately with 0 batches (success)
 * T67-2: Batch fanout: 250 audience → ceil(250/100) = 3 queue messages (not 250)
 * T67-3: storeDocument BEFORE InvitationBatchQueued (callOrder — DNA-8)
 * T67-4: Rate limit key includes tenantId + eventId
 * T67-5: InvitationBatchQueued after broker ACK not after delivery
 * T67-6: FREEDOM config batch_size respected (not hardcoded 100)
 * T67-7: ParticipationBootstrapCompleted payload: { eventId, batchCount, audienceSize }
 * T67-8: RATE subflow returns 429 when rate limit exceeded (success not failure)
 * T67-9: storeDocument BEFORE bootstrap completion (DNA-8)
 * MT-8: Stored record knowledgeScope=PRIVATE
 */

import 'reflect-metadata';
import { ParticipationInviterService } from '../../src/engine/flows/event-participation/participation-inviter.service';
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

function makeRateLimit(exceeded: boolean) {
  return {
    check: jest.fn().mockImplementation(async ({ key }: { key: string }) => {
      return DataProcessResult.success({ allowed: !exceeded, key });
    }),
    increment: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

function makeFreedom(batchSize = 100) {
  return {
    getConfig: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ flow08_invitation_batch_size: batchSize })),
  };
}

const BASE_INPUT = {
  eventId: 'event-001',
  tenantId: 'tenant-X',
  audienceSize: 250,
};

describe('T67 ParticipationInviter', () => {
  it('T67-1: audienceSize=0 is valid — emits immediately with 0 batches', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    const result = await svc.inviteParticipants({ ...BASE_INPUT, audienceSize: 0 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.batchCount).toBe(0);
    expect(result.data?.status).toBe('QUEUED');
    // Should still enqueue bootstrap completion
    const completionEvent = queue._enqueued.find((e: { eventType: string }) =>
      e.eventType.includes('bootstrap'),
    );
    expect(completionEvent).toBeDefined();
  });

  it('T67-2: Batch fanout: 250 audience → ceil(250/100) = 3 queue messages', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    // 3 batch messages + 1 bootstrap completion = 4 total
    const batchEvents = queue._enqueued.filter((e: { eventType: string }) =>
      e.eventType.includes('batch'),
    );
    expect(batchEvents.length).toBe(3);
  });

  it('T67-3: storeDocument BEFORE InvitationBatchQueued (callOrder — DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T67-4: Rate limit key includes tenantId + eventId', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    const checkCall = (rateLimit.check as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(checkCall?.['key']).toContain(BASE_INPUT.tenantId);
    expect(checkCall?.['key']).toContain(BASE_INPUT.eventId);
  });

  it('T67-6: FREEDOM config batch_size respected (not hardcoded 100)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(50); // custom batch size

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT); // 250/50 = 5 batches

    const batchEvents = queue._enqueued.filter((e: { eventType: string }) =>
      e.eventType.includes('batch'),
    );
    expect(batchEvents.length).toBe(5);
  });

  it('T67-7: ParticipationBootstrapCompleted payload: { eventId, batchCount, audienceSize }', async () => {
    const db = makeDb([]);
    const queue = makeQueue([]);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    const completionEvent = queue._enqueued.find((e: { eventType: string }) =>
      e.eventType.includes('bootstrap'),
    );
    expect(completionEvent).toBeDefined();
    const data = (completionEvent as { eventType: string; data: unknown }).data as Record<
      string,
      unknown
    >;
    expect(data['eventId']).toBe(BASE_INPUT.eventId);
    expect(data['batchCount']).toBe(3);
    expect(data['audienceSize']).toBe(250);
  });

  it('T67-8: RATE subflow returns success (not failure) when rate limit exceeded', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(true); // exceeded
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    const result = await svc.inviteParticipants(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('RATE_LIMITED');
  });

  it('T67-9: storeDocument BEFORE bootstrap completion (DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeLessThan(enqueueIdx);
  });

  it('MT-8: Stored record knowledgeScope=PRIVATE', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const rateLimit = makeRateLimit(false);
    const freedom = makeFreedom(100);

    const svc = new ParticipationInviterService(
      db as any,
      queue as any,
      rateLimit as any,
      freedom as any,
    );
    await svc.inviteParticipants(BASE_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });
});
