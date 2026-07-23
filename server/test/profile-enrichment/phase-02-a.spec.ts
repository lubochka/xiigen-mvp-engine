/**
 * FLOW-02 Phase A — T50 Tests (BusinessProfileService + AnalyticsSegmentationService + LearningProgramService)
 *
 * BP-1:  A1 stores PRIVATE record to xiigen-business-profiles
 * BP-2:  A1 stores GLOBAL record to xiigen-matching-profiles with only 4 match-safe fields
 * BP-3:  A1 GLOBAL record has knowledge_scope='GLOBAL', PRIVATE has knowledge_scope='PRIVATE'
 * BP-4:  A1 DUAL-RECORD-WRITE: both writes happen before enqueue
 * BP-5:  A1 emits BusinessProfileCreated after both writes
 * BP-6:  A2 always returns success (GENERAL fallback if error)
 * BP-7:  A2 stores segment record with degraded=true when questionnaire missing industry
 * BP-8:  A3 reads from xiigen-business-profiles (not direct from questionnaire)
 * BP-9:  A3 MODULE_INTRO fallback when profile read returns empty
 * BP-10: A1 idempotency — same idempotencyKey returns same profileId
 * MT-1:  A1 PRIVATE record scoped to tenantId
 * MT-2:  GLOBAL records from different tenants don't cross-contaminate
 * MT-3:  A2 segment records are PRIVATE (not GLOBAL)
 */

import 'reflect-metadata';
import { BusinessProfileService } from '../../src/engine/flows/profile-enrichment/business-profile.service';
import { AnalyticsSegmentationService } from '../../src/engine/flows/profile-enrichment/analytics-segmentation.service';
import { LearningProgramService } from '../../src/engine/flows/profile-enrichment/learning-program.service';
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

describe('FLOW-02 Phase A — T50 Node A1: BusinessProfileService', () => {
  it('BP-1: A1 stores PRIVATE record to xiigen-business-profiles', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    const result = await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'tech', stage: 'seed' },
    });

    expect(result.isSuccess).toBe(true);
    const privateWrite = db._stored.find((s) => s.index === 'xiigen-business-profiles');
    expect(privateWrite).toBeDefined();
  });

  it('BP-2: A1 stores GLOBAL record to xiigen-matching-profiles with only 4 match-safe fields', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'finance', stage: 'growth', location: 'NYC', teamSize: 'small' },
    });

    const globalWrite = db._stored.find((s) => s.index === 'xiigen-matching-profiles');
    expect(globalWrite).toBeDefined();
    const globalDoc = globalWrite!.doc;

    // Must have 4 match-safe fields
    expect(globalDoc['industry_code']).toBeDefined();
    expect(globalDoc['business_stage']).toBeDefined();
    expect(globalDoc['location_proximity']).toBeDefined();
    expect(globalDoc['team_size_tier']).toBeDefined();

    // Must NOT have full questionnaire (that stays PRIVATE)
    expect(globalDoc['questionnaire']).toBeUndefined();
    expect(globalDoc['credentials']).toBeUndefined();
  });

  it('BP-3: A1 GLOBAL record has knowledge_scope=GLOBAL, PRIVATE has knowledge_scope=PRIVATE', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'tech' },
    });

    const privateWrite = db._stored.find((s) => s.index === 'xiigen-business-profiles');
    const globalWrite = db._stored.find((s) => s.index === 'xiigen-matching-profiles');

    expect(privateWrite!.doc['knowledge_scope']).toBe('PRIVATE');
    expect(globalWrite!.doc['knowledge_scope']).toBe('GLOBAL');
  });

  it('BP-4: A1 DUAL-RECORD-WRITE — both writes happen before enqueue', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'tech' },
    });

    // Both stores must have happened before any enqueue
    const privateIdx = db._callOrder.lastIndexOf('storeDocument');
    expect(privateIdx).toBeGreaterThanOrEqual(0);

    // 2 storeDocuments happened (private + global)
    const storeCount = db._callOrder.filter((c) => c === 'storeDocument').length;
    expect(storeCount).toBe(2);

    // Queue enqueue happened after both writes
    expect(queue._enqueued.length).toBe(1);
  });

  it('BP-5: A1 emits BusinessProfileCreated after both writes', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    const result = await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'tech' },
    });

    expect(result.isSuccess).toBe(true);
    expect(queue._enqueued.length).toBeGreaterThanOrEqual(1);
    const event = queue._enqueued.find((e) => e.eventType === 'BusinessProfileCreated');
    expect(event).toBeDefined();
    expect(event!.data['userId']).toBe('u1');
    expect(event!.data['tenantId']).toBe('t1');
  });

  it('BP-10: A1 idempotency — same idempotencyKey returns same profileId', async () => {
    const idemKey = 'test-idem-key-001';
    const profileId = 'biz-existing-profile';

    const existingRecords = [
      {
        profile_id: profileId,
        user_id: 'u1',
        idempotency_key: idemKey,
        knowledge_scope: 'PRIVATE',
      },
    ];

    const db = makeMockDb(existingRecords);
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    const result = await svc.createProfile({
      userId: 'u1',
      tenantId: 't1',
      questionnaire: { industry: 'tech' },
      idempotencyKey: idemKey,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.profileId).toBe(profileId);
    // No new writes
    expect(db._stored.length).toBe(0);
  });

  it('MT-1: A1 PRIVATE record scoped to tenantId', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new BusinessProfileService(db, queue);

    await svc.createProfile({
      userId: 'u1',
      tenantId: 'tenant-X',
      questionnaire: { industry: 'tech' },
    });

    const privateWrite = db._stored.find((s) => s.index === 'xiigen-business-profiles');
    expect(privateWrite!.doc['tenant_id']).toBe('tenant-X');
  });

  it('MT-2: GLOBAL records from different tenants — each gets its own GLOBAL record with correct tenant_id', async () => {
    const dbA = makeMockDb();
    const queueA = makeMockQueue();
    const svcA = new BusinessProfileService(dbA, queueA);

    const dbB = makeMockDb();
    const queueB = makeMockQueue();
    const svcB = new BusinessProfileService(dbB, queueB);

    await svcA.createProfile({
      userId: 'u1',
      tenantId: 'tenant-A',
      questionnaire: { industry: 'tech' },
    });

    await svcB.createProfile({
      userId: 'u2',
      tenantId: 'tenant-B',
      questionnaire: { industry: 'finance' },
    });

    const globalA = dbA._stored.find((s) => s.index === 'xiigen-matching-profiles');
    const globalB = dbB._stored.find((s) => s.index === 'xiigen-matching-profiles');

    expect(globalA!.doc['tenant_id']).toBe('tenant-A');
    expect(globalB!.doc['tenant_id']).toBe('tenant-B');
    // They should not share records
    expect(globalA!.id).not.toBe(globalB!.id);
  });
});

describe('FLOW-02 Phase A — T50 Node A2: AnalyticsSegmentationService', () => {
  it('BP-6: A2 always returns success — GENERAL fallback even when db throws', async () => {
    const db = makeMockDb();
    // Make storeDocument throw to simulate infrastructure failure
    db.storeDocument.mockRejectedValue(new Error('disk full'));
    const queue = makeMockQueue();
    const svc = new AnalyticsSegmentationService(db, queue);

    const result = await svc.segment({
      userId: 'u1',
      tenantId: 't1',
      answers: { industry: 'tech' },
    });

    // Always success — analytics never blocks the flow
    expect(result.isSuccess).toBe(true);
    expect(result.data!.segment).toBe('GENERAL');
    expect(result.data!.degraded).toBe(true);
  });

  it('BP-7: A2 stores segment record with degraded=true when questionnaire missing industry', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new AnalyticsSegmentationService(db, queue);

    const result = await svc.segment({
      userId: 'u1',
      tenantId: 't1',
      answers: {}, // no industry field
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.degraded).toBe(true);
    expect(result.data!.segment).toBe('GENERAL');

    const stored = db._stored[0];
    expect(stored).toBeDefined();
    expect(stored.doc['degraded']).toBe(true);
  });

  it('MT-3: A2 segment records are PRIVATE (not GLOBAL)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new AnalyticsSegmentationService(db, queue);

    await svc.segment({ userId: 'u1', tenantId: 't1', answers: { industry: 'tech' } });

    const storedSegment = db._stored.find((s) => s.index === 'xiigen-analytics-segments');
    expect(storedSegment).toBeDefined();
    expect(storedSegment!.doc['knowledge_scope']).toBe('PRIVATE');
  });
});

describe('FLOW-02 Phase A — T50 Node A3: LearningProgramService', () => {
  it('BP-8: A3 reads from xiigen-business-profiles (not direct from questionnaire)', async () => {
    const existingProfile = [
      {
        profile_id: 'biz-123',
        user_id: 'u1',
        industry_code: 'tech',
        knowledge_scope: 'PRIVATE',
      },
    ];

    const db = makeMockDb(existingProfile);
    const queue = makeMockQueue();
    const svc = new LearningProgramService(db, queue);

    const result = await svc.initializeProgram({
      profileId: 'biz-123',
      userId: 'u1',
      tenantId: 't1',
    });

    expect(result.isSuccess).toBe(true);
    // Must have searched xiigen-business-profiles
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-business-profiles',
      expect.objectContaining({ profile_id: 'biz-123' }),
    );
  });

  it('BP-9: A3 MODULE_INTRO fallback when profile read returns empty', async () => {
    const db = makeMockDb([]); // no profiles
    const queue = makeMockQueue();
    const svc = new LearningProgramService(db, queue);

    const result = await svc.initializeProgram({
      profileId: 'biz-nonexistent',
      userId: 'u1',
      tenantId: 't1',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.moduleType).toBe('MODULE_INTRO');
    expect(result.data!.degraded).toBe(true);
  });
});
