/**
 * FLOW-07 Phase C — T75 ConnectionGraphWriter
 *
 * T75-1: Both A→B and B→A written (two storeDocument calls with same connectionId)
 * T75-2: connectionId direction-independent
 * T75-3: storeDocument BEFORE SocialConnectionEstablished (callOrder)
 * T75-4: If ORM transaction fails, SocialConnectionEstablished NOT emitted
 * T75-5: initialConnectionStrength=0 when no FLOW-02 match score available
 * T75-6: knowledgeScope=PRIVATE
 * MT-3: SocialConnectionEstablished event correct CloudEvents format
 */

import 'reflect-metadata';
import { ConnectionGraphWriterService } from '../../src/engine/flows/friend-request-social-feed/connection-graph-writer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
  };
}

function makeDbFail(callOrder: string[]) {
  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest.fn().mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('STORE_FAILED', 'DB error');
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

const BASE_INPUT = {
  userIdA: 'user-A',
  userIdB: 'user-B',
  tenantId: 'tenant-X',
  requestId: 'req-001',
};

describe('T75 ConnectionGraphWriter', () => {
  it('T75-1: Both A→B and B→A written (two storeDocument calls with same connectionId)', async () => {
    const callOrder: string[] = [];
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb(callOrder, stored);
    const queue = makeQueue(callOrder);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    await svc.writeConnection(BASE_INPUT);

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
    expect(storeCalls.length).toBeGreaterThanOrEqual(2);

    const connIds = storeCalls.map(
      (c: unknown[]) => (c[1] as Record<string, unknown>)['connectionId'],
    );
    const uniqueConnIds = new Set(connIds);
    expect(uniqueConnIds.size).toBe(1);
  });

  it('T75-2: connectionId direction-independent', async () => {
    const storedA: Array<Record<string, unknown>> = [];
    const storedB: Array<Record<string, unknown>> = [];
    const dbA = makeDb([], storedA);
    const dbB = makeDb([], storedB);
    const qA = makeQueue([]);
    const qB = makeQueue([]);

    const svcA = new ConnectionGraphWriterService(dbA as any, qA as any);
    const svcB = new ConnectionGraphWriterService(dbB as any, qB as any);

    await svcA.writeConnection({ ...BASE_INPUT, userIdA: 'user-A', userIdB: 'user-B' });
    await svcB.writeConnection({ ...BASE_INPUT, userIdA: 'user-B', userIdB: 'user-A' });

    const connIdA = storedA[0]?.['connectionId'] as string;
    const connIdB = storedB[0]?.['connectionId'] as string;
    expect(connIdA).toBeDefined();
    expect(connIdA).toBe(connIdB);
  });

  it('T75-3: storeDocument BEFORE SocialConnectionEstablished (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    await svc.writeConnection(BASE_INPUT);

    const lastStore = callOrder.lastIndexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(lastStore).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(lastStore);
  });

  it('T75-4: If ORM transaction fails, SocialConnectionEstablished NOT emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDbFail(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    const result = await svc.writeConnection(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T75-5: initialConnectionStrength=0 when no FLOW-02 match score available', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    await svc.writeConnection(BASE_INPUT);

    const connRecord = stored.find((s) => s['initialConnectionStrength'] !== undefined);
    expect(connRecord?.['initialConnectionStrength']).toBe(0);
  });

  it('T75-6: knowledgeScope=PRIVATE', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    await svc.writeConnection(BASE_INPUT);

    expect(stored.every((s) => s['knowledgeScope'] === 'PRIVATE')).toBe(true);
  });

  it('MT-3: SocialConnectionEstablished event correct CloudEvents format', async () => {
    const queue = makeQueue([]);
    const db = makeDb([]);
    const svc = new ConnectionGraphWriterService(db as any, queue as any);

    await svc.writeConnection(BASE_INPUT);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('established');
    const data = event.data as Record<string, unknown>;
    expect(data['userIdA']).toBeDefined();
    expect(data['userIdB']).toBeDefined();
    expect(data['tenantId']).toBe(BASE_INPUT.tenantId);
  });
});
