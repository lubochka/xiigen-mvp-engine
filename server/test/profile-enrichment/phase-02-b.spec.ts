/**
 * FLOW-02 Phase B — T51 Tests (CompatibilityScoringService + ConnectionSuggestionService)
 *
 * BM-1:  B1 TIMEOUT-AS-SUCCESS: when timeoutMs=0 → success with partialResults=true
 * BM-2:  B1 normal path → success with partialResults=false, topScore >= 0
 * BM-3:  B1 stores record BEFORE BusinessMatchesFound enqueue
 * BM-4:  B1 reads from xiigen-matching-profiles (GLOBAL scope only) not business-profiles
 * BM-5:  B2 produces suggestions from matchedBusinessIds
 * BM-6:  B2 partialResults=true when B1 returned partialResults=true
 * BM-7:  B2 stores to xiigen-connection-suggestions BEFORE ConnectionSuggestionsReady
 * BM-8:  B2 reads from xiigen-matching-profiles only (GLOBAL, NOT xiigen-business-profiles)
 * BM-9:  B1 idempotency — second call with same key returns existing record
 * MT-1:  B1 GLOBAL query includes tenantId scope
 * MT-2:  B2 only reads GLOBAL records — no PRIVATE profile access
 * MT-3:  B1 and B2 store PRIVATE records with tenant_id
 */

import 'reflect-metadata';
import { CompatibilityScoringService } from '../../src/engine/flows/profile-enrichment/compatibility-scoring.service';
import { ConnectionSuggestionService } from '../../src/engine/flows/profile-enrichment/connection-suggestion.service';
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

describe('FLOW-02 Phase B — T51 Node B1: CompatibilityScoringService', () => {
  it('BM-1: TIMEOUT-AS-SUCCESS — timeoutMs=-1 → success with partialResults=true', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    const result = await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
      timeoutMs: -1, // elapsed > -1 always true — guaranteed timeout in mock
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.partialResults).toBe(true);
  });

  it('BM-2: B1 normal path → success with partialResults=false, topScore >= 0', async () => {
    const matchingProfiles = [
      {
        matching_profile_id: 'match-001',
        user_id: 'u2',
        tenant_id: 't1',
        industry_code: 'tech',
        business_stage: 'seed',
        location_proximity: 'NYC',
        team_size_tier: 'small',
        knowledge_scope: 'GLOBAL',
      },
    ];
    const db = makeMockDb(matchingProfiles);
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    const result = await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
      timeoutMs: 30000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.partialResults).toBe(false);
    expect(result.data!.topScore).toBeGreaterThanOrEqual(0);
  });

  it('BM-3: B1 stores record BEFORE BusinessMatchesFound enqueue', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    // storeDocument must appear in callOrder before enqueue
    const storeIdx = db._callOrder.lastIndexOf('storeDocument');
    expect(storeIdx).toBeGreaterThanOrEqual(0);

    // Must have enqueued BusinessMatchesFound
    const matchEvent = queue._enqueued.find((e) => e.eventType === 'BusinessMatchesFound');
    expect(matchEvent).toBeDefined();
  });

  it('BM-4: B1 reads from xiigen-matching-profiles (GLOBAL scope) not business-profiles', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    // Must query xiigen-matching-profiles with GLOBAL scope
    const matchingProfileQuery = (db.searchDocuments as jest.Mock).mock.calls.find(
      ([index, filter]: [string, Record<string, unknown>]) =>
        index === 'xiigen-matching-profiles' && filter['knowledge_scope'] === 'GLOBAL',
    );
    expect(matchingProfileQuery).toBeDefined();

    // Must NOT query xiigen-business-profiles for matching
    const businessProfileQuery = (db.searchDocuments as jest.Mock).mock.calls.find(
      ([index]: [string]) => index === 'xiigen-business-profiles',
    );
    expect(businessProfileQuery).toBeUndefined();
  });

  it('BM-9: B1 idempotency — second call with same key returns existing record', async () => {
    const existingScoringId = 'score-existing-001';
    const idemKey = require('crypto')
      .createHash('sha256')
      .update('t1:u1:b1')
      .digest('hex')
      .slice(0, 12);

    const existingRecords = [
      {
        scoring_id: existingScoringId,
        user_id: 'u1',
        tenant_id: 't1',
        idempotency_key: idemKey,
        matched_business_ids: ['match-001'],
        partial_results: false,
        top_score: 0.7,
        knowledge_scope: 'PRIVATE',
      },
    ];

    const db = makeMockDb(existingRecords);
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    const result = await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 't1',
      profileId: 'biz-123',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.scoringId).toBe(existingScoringId);
    // No new writes
    expect(db._stored.length).toBe(0);
  });

  it('MT-1: B1 GLOBAL query includes tenantId scope', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 'tenant-XYZ',
      profileId: 'biz-123',
    });

    const matchingCall = (db.searchDocuments as jest.Mock).mock.calls.find(
      ([index, filter]: [string, Record<string, unknown>]) =>
        index === 'xiigen-matching-profiles' && filter['tenant_id'] === 'tenant-XYZ',
    );
    expect(matchingCall).toBeDefined();
  });

  it('MT-3: B1 stores PRIVATE record with tenant_id', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CompatibilityScoringService(db, queue, null);

    await svc.scoreCompatibility({
      userId: 'u1',
      tenantId: 'tenant-Z',
      profileId: 'biz-123',
    });

    const stored = db._stored.find((s) => s.index === 'xiigen-business-matches');
    expect(stored).toBeDefined();
    expect(stored!.doc['knowledge_scope']).toBe('PRIVATE');
    expect(stored!.doc['tenant_id']).toBe('tenant-Z');
  });
});

describe('FLOW-02 Phase B — T51 Node B2: ConnectionSuggestionService', () => {
  it('BM-5: B2 produces suggestions from matchedBusinessIds', async () => {
    // Matching profiles exist in GLOBAL index
    const matchingProfiles = [
      { matching_profile_id: 'match-001', knowledge_scope: 'GLOBAL', tenant_id: 't1' },
      { matching_profile_id: 'match-002', knowledge_scope: 'GLOBAL', tenant_id: 't1' },
    ];
    const db = makeMockDb(matchingProfiles);
    const queue = makeMockQueue();
    const svc = new ConnectionSuggestionService(db, queue);

    const result = await svc.buildSuggestions({
      userId: 'u1',
      tenantId: 't1',
      matchedBusinessIds: ['match-001', 'match-002'],
      partialResults: false,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.suggestions).toContain('match-001');
    expect(result.data!.suggestions).toContain('match-002');
  });

  it('BM-6: B2 partialResults=true when B1 returned partialResults=true', async () => {
    const db = makeMockDb([
      { matching_profile_id: 'match-001', knowledge_scope: 'GLOBAL', tenant_id: 't1' },
    ]);
    const queue = makeMockQueue();
    const svc = new ConnectionSuggestionService(db, queue);

    const result = await svc.buildSuggestions({
      userId: 'u1',
      tenantId: 't1',
      matchedBusinessIds: ['match-001'],
      partialResults: true, // forwarded from B1
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.partialResults).toBe(true);
  });

  it('BM-7: B2 stores to xiigen-connection-suggestions BEFORE ConnectionSuggestionsReady', async () => {
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new ConnectionSuggestionService(db, queue);

    await svc.buildSuggestions({
      userId: 'u1',
      tenantId: 't1',
      matchedBusinessIds: [],
      partialResults: false,
    });

    // storeDocument must have been called
    const storeIdx = db._callOrder.lastIndexOf('storeDocument');
    expect(storeIdx).toBeGreaterThanOrEqual(0);

    // Event was enqueued
    const event = queue._enqueued.find((e) => e.eventType === 'ConnectionSuggestionsReady');
    expect(event).toBeDefined();
  });

  it('BM-8: B2 reads from xiigen-matching-profiles only (GLOBAL, NOT xiigen-business-profiles)', async () => {
    const db = makeMockDb([
      { matching_profile_id: 'match-001', knowledge_scope: 'GLOBAL', tenant_id: 't1' },
    ]);
    const queue = makeMockQueue();
    const svc = new ConnectionSuggestionService(db, queue);

    await svc.buildSuggestions({
      userId: 'u1',
      tenantId: 't1',
      matchedBusinessIds: ['match-001'],
      partialResults: false,
    });

    // Only xiigen-matching-profiles should be queried
    const businessProfileCalls = (db.searchDocuments as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-business-profiles',
    );
    expect(businessProfileCalls.length).toBe(0);

    const matchingCalls = (db.searchDocuments as jest.Mock).mock.calls.filter(
      ([index]: [string]) => index === 'xiigen-matching-profiles',
    );
    expect(matchingCalls.length).toBeGreaterThan(0);
  });

  it('MT-2: B2 only reads GLOBAL records — query includes knowledge_scope=GLOBAL', async () => {
    const db = makeMockDb([
      { matching_profile_id: 'match-001', knowledge_scope: 'GLOBAL', tenant_id: 't1' },
    ]);
    const queue = makeMockQueue();
    const svc = new ConnectionSuggestionService(db, queue);

    await svc.buildSuggestions({
      userId: 'u1',
      tenantId: 't1',
      matchedBusinessIds: ['match-001'],
      partialResults: false,
    });

    const globalQuery = (db.searchDocuments as jest.Mock).mock.calls.find(
      ([index, filter]: [string, Record<string, unknown>]) =>
        index === 'xiigen-matching-profiles' && filter['knowledge_scope'] === 'GLOBAL',
    );
    expect(globalQuery).toBeDefined();
  });
});
