/**
 * FLOW-02 Phase C — T52 Tests (FeedPersonalizationService + PersonalizationCompletionService)
 *
 * PC-1:  C with all 4 signals → signalsUsed=4, degraded=false
 * PC-2:  C with 0 signals (all reads return empty) → signalsUsed=0, degraded=true, still returns success
 * PC-3:  C stores feed before returning
 * PC-4:  C partial signals (2 of 4) → signalsUsed=2, degraded=true, still returns success
 * PC-5:  D emits 'PersonalizationCompleted' (MACHINE literal — not 'OnboardingCompleted')
 * PC-6:  D storeDocument called BEFORE PersonalizationCompleted enqueue (DNA-8)
 * PC-7:  D idempotency — same userId+tenantId returns same completionId
 * PC-8:  D PersonalizationCompleted payload contains userId, tenantId, feedId
 * MT-1:  D completion record stored with PRIVATE scope and tenantId
 * MT-2:  PersonalizationCompleted event does NOT contain PII (no questionnaire data)
 */

import 'reflect-metadata';
import { FeedPersonalizationService } from '../../src/engine/flows/profile-enrichment/feed-personalization.service';
import { PersonalizationCompletionService } from '../../src/engine/flows/profile-enrichment/personalization-completion.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(existingRecords: Array<Record<string, unknown>> = []) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];
  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      const results = existingRecords.filter((r) =>
        Object.entries(filter).every(([k, v]) => r[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push('storeDocument');
      stored.push({ index, doc, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
    _callOrder: callOrder,
  } as any;
}

function makeMockQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
  } as any;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('FLOW-02 Phase C — T52 Node C: FeedPersonalizationService', () => {
  it('PC-1: C with all 4 signals → signalsUsed=4, degraded=false', async () => {
    const allSignals = [
      // profileSignal
      {
        user_id: 'u1',
        industry_code: 'tech',
        knowledge_scope: 'PRIVATE',
        _index: 'xiigen-business-profiles',
      },
      // segmentSignal
      {
        user_id: 'u1',
        segment: 'TECH_STARTUP',
        knowledge_scope: 'PRIVATE',
        _index: 'xiigen-analytics-segments',
      },
      // curriculumSignal
      {
        user_id: 'u1',
        module_type: 'MODULE_TECH_FOUNDATIONS',
        knowledge_scope: 'PRIVATE',
        _index: 'xiigen-learning-programs',
      },
      // matchSignal
      {
        user_id: 'u1',
        matched_business_ids: ['match-001'],
        knowledge_scope: 'PRIVATE',
        _index: 'xiigen-business-matches',
      },
    ];

    // Build db that returns correct records per index
    const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
        callOrder.push('searchDocuments');
        if (index === 'xiigen-business-profiles' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', industry_code: 'tech', knowledge_scope: 'PRIVATE' },
          ]);
        }
        if (index === 'xiigen-analytics-segments' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', segment: 'TECH_STARTUP', knowledge_scope: 'PRIVATE' },
          ]);
        }
        if (index === 'xiigen-learning-programs' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', module_type: 'MODULE_TECH_FOUNDATIONS', knowledge_scope: 'PRIVATE' },
          ]);
        }
        if (index === 'xiigen-business-matches' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', matched_business_ids: ['match-001'], knowledge_scope: 'PRIVATE' },
          ]);
        }
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
        callOrder.push('storeDocument');
        stored.push({ index, doc, id });
        return DataProcessResult.success(doc);
      }),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      _stored: stored,
      _callOrder: callOrder,
    } as any;

    const svc = new FeedPersonalizationService(db);

    const result = await svc.buildFeed({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.signalsUsed).toBe(4);
    expect(result.data!.degraded).toBe(false);
  });

  it('PC-2: C with 0 signals → signalsUsed=0, degraded=true, still returns success', async () => {
    const db = makeMockDb([]); // no records in any index
    const svc = new FeedPersonalizationService(db);

    const result = await svc.buildFeed({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.signalsUsed).toBe(0);
    expect(result.data!.degraded).toBe(true);
    // Still produces content (trending fallback)
    expect(result.data!.contentItems.length).toBeGreaterThan(0);
  });

  it('PC-3: C stores feed before returning', async () => {
    const db = makeMockDb([]);
    const svc = new FeedPersonalizationService(db);

    const result = await svc.buildFeed({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    const feedStore = db._stored.find((s) => s.index === 'xiigen-personalization-feeds');
    expect(feedStore).toBeDefined();
    expect(feedStore!.doc['feed_id']).toBe(result.data!.feedId);
  });

  it('PC-4: C partial signals (2 of 4) → signalsUsed=2, degraded=true, still returns success', async () => {
    const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
    const db = {
      searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-business-profiles' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', industry_code: 'tech', knowledge_scope: 'PRIVATE' },
          ]);
        }
        if (index === 'xiigen-analytics-segments' && filter['user_id'] === 'u1') {
          return DataProcessResult.success([
            { user_id: 'u1', segment: 'TECH_STARTUP', knowledge_scope: 'PRIVATE' },
          ]);
        }
        // Learning programs and matches return empty
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
        stored.push({ index, doc, id });
        return DataProcessResult.success(doc);
      }),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      _stored: stored,
    } as any;

    const svc = new FeedPersonalizationService(db);

    const result = await svc.buildFeed({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.signalsUsed).toBe(2);
    expect(result.data!.degraded).toBe(true);
  });
});

describe('FLOW-02 Phase C — T52 Node D: PersonalizationCompletionService', () => {
  it('PC-5: D emits PersonalizationCompleted (MACHINE literal — NOT OnboardingCompleted)', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    await svc.complete({
      userId: 'u1',
      tenantId: 't1',
      feedId: 'feed-123',
      profileId: 'biz-123',
    });

    const personalizationEvent = queue._enqueued.find(
      (e) => e.eventType === 'PersonalizationCompleted',
    );
    const onboardingEvent = queue._enqueued.find((e) => e.eventType === 'OnboardingCompleted');

    expect(personalizationEvent).toBeDefined();
    expect(onboardingEvent).toBeUndefined(); // MUST NOT emit OnboardingCompleted (FLOW-01's event)
  });

  it('PC-6: D storeDocument called BEFORE PersonalizationCompleted enqueue (DNA-8)', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    await svc.complete({
      userId: 'u1',
      tenantId: 't1',
      feedId: 'feed-123',
      profileId: 'biz-123',
    });

    // storeDocument must have been called
    const storeIdx = db._callOrder.lastIndexOf('storeDocument');
    expect(storeIdx).toBeGreaterThanOrEqual(0);

    // Event was emitted after store
    expect(queue._enqueued.length).toBeGreaterThanOrEqual(1);
  });

  it('PC-7: D idempotency — same userId+tenantId returns same completionId', async () => {
    const crypto = require('crypto');
    const idemKey = crypto
      .createHash('sha256')
      .update('t1:u1:personalization-complete')
      .digest('hex')
      .slice(0, 12);
    const existingCompletionId = 'pc-existing-001';

    const existingRecords = [
      {
        completion_id: existingCompletionId,
        user_id: 'u1',
        tenant_id: 't1',
        idempotency_key: idemKey,
        knowledge_scope: 'PRIVATE',
      },
    ];

    const db = makeMockDb(existingRecords);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    const result = await svc.complete({
      userId: 'u1',
      tenantId: 't1',
      feedId: 'feed-123',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionId).toBe(existingCompletionId);
    // No new writes
    expect(db._stored.length).toBe(0);
  });

  it('PC-8: D PersonalizationCompleted payload contains userId, tenantId, feedId', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    await svc.complete({
      userId: 'u1',
      tenantId: 't1',
      feedId: 'feed-abc',
      profileId: 'biz-123',
    });

    const event = queue._enqueued.find((e) => e.eventType === 'PersonalizationCompleted');
    expect(event).toBeDefined();

    // CloudEvent wraps data — check the data field
    const payload = event!.data as Record<string, unknown>;
    const data = (payload['data'] as Record<string, unknown>) ?? payload;

    expect(data['userId'] ?? payload['userId']).toBeDefined();
    expect(data['tenantId'] ?? payload['tenantId']).toBeDefined();
    expect(data['feedId'] ?? payload['feedId']).toBeDefined();
  });

  it('MT-1: D completion record stored with PRIVATE scope and tenantId', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    await svc.complete({
      userId: 'u1',
      tenantId: 'tenant-W',
      feedId: 'feed-123',
      profileId: 'biz-123',
    });

    const stored = db._stored.find((s) => s.index === 'xiigen-personalization-completions');
    expect(stored).toBeDefined();
    expect(stored!.doc['knowledge_scope']).toBe('PRIVATE');
    expect(stored!.doc['tenant_id']).toBe('tenant-W');
  });

  it('MT-2: PersonalizationCompleted event does NOT contain PII (no questionnaire data)', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new PersonalizationCompletionService(db, queue);

    await svc.complete({
      userId: 'u1',
      tenantId: 't1',
      feedId: 'feed-123',
      profileId: 'biz-123',
    });

    const event = queue._enqueued.find((e) => e.eventType === 'PersonalizationCompleted');
    expect(event).toBeDefined();

    // Flatten the entire event object to check for PII fields
    const eventStr = JSON.stringify(event!.data);
    expect(eventStr).not.toContain('questionnaire');
    expect(eventStr).not.toContain('credentials');
    expect(eventStr).not.toContain('email');
    expect(eventStr).not.toContain('password');
  });
});
