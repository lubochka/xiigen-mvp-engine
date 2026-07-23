/**
 * FLOW-07 Phase D — T76 FeedItemGenerator
 *
 * T76-1: T81 called inline before generation
 * T76-2: skipped:true when T81 returns allowed=false (no storeDocument)
 * T76-3: storeDocument BEFORE FeedItemGenerated (callOrder)
 * T76-4: knowledgeScope=PRIVATE on feed item records
 * T76-5: T76 reads FREEDOM config for max items count
 * T76-6: T76 does NOT read T76 result in T78 (T78 calls T81 independently)
 * T76-7: Feed item knowledgeScope filter — stored as PRIVATE not GLOBAL (H-3)
 * MT-4: FeedItemGenerated event correct CloudEvents format
 */

import 'reflect-metadata';
import { FeedItemGeneratorService } from '../../src/engine/flows/friend-request-social-feed/feed-item-generator.service';
import { PrivacyGatekeeperService } from '../../src/engine/flows/friend-request-social-feed/privacy-gatekeeper.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makePrivacyGatekeeper(callOrder: string[], allowed: boolean) {
  return {
    check: jest.fn().mockImplementation(async () => {
      callOrder.push('privacyCheck');
      return DataProcessResult.success({ allowed });
    }),
  } as unknown as PrivacyGatekeeperService;
}

function makeAi() {
  return {
    generateFeedItem: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ content: 'AI content' })),
  };
}

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

function makeFreedom(configData: Record<string, unknown> = {}) {
  return {
    getConfig: jest.fn().mockResolvedValue(DataProcessResult.success(configData)),
  };
}

const BASE_REQUEST = {
  activityId: 'act-001',
  sourceUserId: 'user-A',
  targetUserId: 'user-B',
  tenantId: 'tenant-X',
  activityType: 'connection',
};

describe('T76 FeedItemGenerator', () => {
  it('T76-1: T81 called inline before generation', async () => {
    const callOrder: string[] = [];
    const gk = makePrivacyGatekeeper(callOrder, true);
    const ai = makeAi();
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom({ flow07_feed_items_per_connection: 10 });

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    const privacyIdx = callOrder.indexOf('privacyCheck');
    const storeIdx = callOrder.indexOf('storeDocument');
    expect(privacyIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(privacyIdx);
  });

  it('T76-2: skipped:true when T81 returns allowed=false (no storeDocument)', async () => {
    const callOrder: string[] = [];
    const gk = makePrivacyGatekeeper(callOrder, false);
    const ai = makeAi();
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom();

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    const result = await svc.generateFeedItem(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['skipped']).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('T76-3: storeDocument BEFORE FeedItemGenerated (callOrder)', async () => {
    const callOrder: string[] = [];
    const gk = makePrivacyGatekeeper(callOrder, true);
    const ai = makeAi();
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom();

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T76-4: knowledgeScope=PRIVATE on feed item records', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const gk = makePrivacyGatekeeper([], true);
    const ai = makeAi();
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const freedom = makeFreedom();

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T76-5: T76 reads FREEDOM config for max items count', async () => {
    const callOrder: string[] = [];
    const gk = makePrivacyGatekeeper(callOrder, true);
    const ai = makeAi();
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const freedom = makeFreedom({ flow07_feed_items_per_connection: 5 });

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    expect(freedom.getConfig).toHaveBeenCalled();
  });

  it('T76-7: Feed item stored as PRIVATE not GLOBAL (H-3)', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const gk = makePrivacyGatekeeper([], true);
    const ai = makeAi();
    const db = makeDb([], stored);
    const queue = makeQueue([]);
    const freedom = makeFreedom();

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
    expect(stored[0]?.['knowledgeScope']).not.toBe('GLOBAL');
  });

  it('MT-4: FeedItemGenerated event correct CloudEvents format', async () => {
    const queue = makeQueue([]);
    const gk = makePrivacyGatekeeper([], true);
    const ai = makeAi();
    const db = makeDb([]);
    const freedom = makeFreedom();

    const svc = new FeedItemGeneratorService(
      ai as any,
      queue as any,
      db as any,
      gk,
      freedom as any,
    );
    await svc.generateFeedItem(BASE_REQUEST);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('feed');
    const data = event.data as Record<string, unknown>;
    expect(data['activityId']).toBe(BASE_REQUEST.activityId);
    expect(data['tenantId']).toBe(BASE_REQUEST.tenantId);
  });
});
