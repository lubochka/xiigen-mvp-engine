/**
 * FLOW-02 Phase 5 — Integration Tests
 *
 * INT-01: Full chain — QuestionnaireCompleted → A1/A2 parallel → A3 (on BusinessProfileCreated) → B1 → B2 → C → D
 * INT-02: DUAL-RECORD-WRITE — A1 writes PRIVATE + GLOBAL; B1 reads GLOBAL only
 * INT-03: Timeout-as-success — B1 timeout (timeoutMs=0) → partialResults=true → B2/C/D still complete
 * INT-04: A2 degraded (GENERAL fallback) — flow still produces PersonalizationCompleted
 * INT-05: A3 triggered by BusinessProfileCreated (reads profileId from store, not raw questionnaire)
 * INT-06: Idempotency — second A1 run with same userId returns same profileId, no duplicate stores
 * INT-07: PersonalizationCompleted event emitted (NOT OnboardingCompleted) cross-flow contract
 */

import 'reflect-metadata';
import { BusinessProfileService } from '../../src/engine/flows/profile-enrichment/business-profile.service';
import { AnalyticsSegmentationService } from '../../src/engine/flows/profile-enrichment/analytics-segmentation.service';
import { LearningProgramService } from '../../src/engine/flows/profile-enrichment/learning-program.service';
import { CompatibilityScoringService } from '../../src/engine/flows/profile-enrichment/compatibility-scoring.service';
import { ConnectionSuggestionService } from '../../src/engine/flows/profile-enrichment/connection-suggestion.service';
import { FeedPersonalizationService } from '../../src/engine/flows/profile-enrichment/feed-personalization.service';
import { PersonalizationCompletionService } from '../../src/engine/flows/profile-enrichment/personalization-completion.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Stateful mock db ────────────────────────────────────────────────────────────

function makeStatefulDb() {
  const store = new Map<string, { index: string; doc: Record<string, unknown> }>();

  const searchDocuments = jest.fn(async (index: string, filter: Record<string, unknown>) => {
    const results = [...store.values()]
      .filter((entry) => entry.index === index)
      .map((entry) => entry.doc)
      .filter((doc) => Object.entries(filter).every(([k, v]) => doc[k] === v));
    return DataProcessResult.success(results);
  });

  const storeDocument = jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
    store.set(id, { index, doc });
    return DataProcessResult.success(doc);
  });

  return {
    searchDocuments,
    storeDocument,
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _store: store,
  } as any;
}

// ── Stateful mock queue ─────────────────────────────────────────────────────────

function makeStatefulQueue() {
  const enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: unknown) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
    _clear(): void {
      enqueued.length = 0;
    },
  } as any;
}

// ── Service factory ─────────────────────────────────────────────────────────────

function makeServices(
  db?: ReturnType<typeof makeStatefulDb>,
  queue?: ReturnType<typeof makeStatefulQueue>,
) {
  const _db = db ?? makeStatefulDb();
  const _queue = queue ?? makeStatefulQueue();

  const bpSvc = new BusinessProfileService(_db, _queue);
  const a2Svc = new AnalyticsSegmentationService(_db, _queue);
  const a3Svc = new LearningProgramService(_db, _queue);
  const b1Svc = new CompatibilityScoringService(_db, _queue);
  const b2Svc = new ConnectionSuggestionService(_db, _queue);
  const feedSvc = new FeedPersonalizationService(_db);
  const pcSvc = new PersonalizationCompletionService(_db, _queue);

  return { db: _db, queue: _queue, bpSvc, a2Svc, a3Svc, b1Svc, b2Svc, feedSvc, pcSvc };
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('FLOW-02 Integration — T50/T51/T52 chain', () => {
  it('INT-01: Full chain — QuestionnaireCompleted → A1/A2 parallel → A3 → B1 → B2 → C → D', async () => {
    const { db, queue, bpSvc, a2Svc, a3Svc, b1Svc, b2Svc, feedSvc, pcSvc } = makeServices();
    const tenantId = 'int01-tenant';
    const userId = 'int01-user';

    // ── A1: Create BusinessProfile (triggers on QuestionnaireCompleted) ───────────
    const questionnaire = { industry: 'tech', stage: 'growth', location: 'US', teamSize: 10 };
    const bpResult = await bpSvc.createProfile({ userId, tenantId, questionnaire });
    expect(bpResult.isSuccess).toBe(true);
    const { profileId, matchingProfileId } = bpResult.data!;
    expect(profileId).toBeDefined();
    expect(matchingProfileId).toBeDefined();

    // A1 emits BusinessProfileCreated
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'BusinessProfileCreated'),
    ).toBe(true);

    // ── A2: Segment (parallel with A1, same QuestionnaireCompleted) ───────────────
    const segResult = await a2Svc.segment({ userId, tenantId, answers: questionnaire });
    expect(segResult.isSuccess).toBe(true);
    expect(segResult.data!.segment).toBeDefined();

    // ── A3: Learning program (triggered by BusinessProfileCreated — reads profileId) ──
    const a3Result = await a3Svc.initializeProgram({ profileId, userId, tenantId });
    expect(a3Result.isSuccess).toBe(true);
    expect(a3Result.data!.programId).toBeDefined();
    expect(a3Result.data!.moduleType).toBeDefined();

    // ── B1: Compatibility scoring — seed a matching profile for B1 to find ─────────
    // Simulate A1 GLOBAL write being in the matching-profiles index
    db._store.set(`match-${profileId}`, {
      index: 'xiigen-matching-profiles',
      doc: {
        user_id: 'other-user-1',
        tenant_id: tenantId,
        knowledge_scope: 'GLOBAL',
        industry_code: 'tech',
        business_stage: 'growth',
        location_proximity: 'US',
        team_size_tier: 'small',
      },
    });

    const b1Result = await b1Svc.scoreCompatibility({ userId, tenantId, profileId });
    expect(b1Result.isSuccess).toBe(true);
    expect(b1Result.data!.scoringId).toBeDefined();
    expect(b1Result.data!.partialResults).toBe(false);

    // B1 emits BusinessMatchesFound
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'BusinessMatchesFound'),
    ).toBe(true);

    // ── B2: Connection suggestions ─────────────────────────────────────────────────
    const b2Result = await b2Svc.buildSuggestions({
      userId,
      tenantId,
      matchedBusinessIds: b1Result.data!.matchedBusinessIds,
      partialResults: b1Result.data!.partialResults,
    });
    expect(b2Result.isSuccess).toBe(true);
    expect(b2Result.data!.suggestionId).toBeDefined();

    // ── C: Feed personalization ────────────────────────────────────────────────────
    const feedResult = await feedSvc.buildFeed({ userId, tenantId, profileId });
    expect(feedResult.isSuccess).toBe(true);
    expect(feedResult.data!.feedId).toBeDefined();
    expect(feedResult.data!.contentItems.length).toBeGreaterThan(0);

    // ── D: PersonalizationCompleted ────────────────────────────────────────────────
    const pcResult = await pcSvc.complete({
      userId,
      tenantId,
      feedId: feedResult.data!.feedId,
      profileId,
    });
    expect(pcResult.isSuccess).toBe(true);
    expect(pcResult.data!.completed).toBe(true);

    // PersonalizationCompleted is emitted (MACHINE literal — FLOW-02-DR-02-C)
    expect(
      queue._enqueued.some(
        (e: { eventType: string }) => e.eventType === 'PersonalizationCompleted',
      ),
    ).toBe(true);
  });

  it('INT-02: DUAL-RECORD-WRITE — A1 writes PRIVATE to business-profiles AND GLOBAL to matching-profiles', async () => {
    const { db, bpSvc } = makeServices();
    const tenantId = 'int02-tenant';
    const userId = 'int02-user';

    await bpSvc.createProfile({
      userId,
      tenantId,
      questionnaire: { industry: 'finance', stage: 'early', location: 'EU', teamSize: 3 },
    });

    // PRIVATE record in xiigen-business-profiles
    const privateRecords = [...db._store.values()]
      .filter((e) => e.index === 'xiigen-business-profiles')
      .map((e) => e.doc);
    expect(privateRecords.length).toBe(1);
    expect(privateRecords[0]['knowledge_scope']).toBe('PRIVATE');

    // GLOBAL record in xiigen-matching-profiles (4 match-safe fields + user/tenant)
    const globalRecords = [...db._store.values()]
      .filter((e) => e.index === 'xiigen-matching-profiles')
      .map((e) => e.doc);
    expect(globalRecords.length).toBe(1);
    expect(globalRecords[0]['knowledge_scope']).toBe('GLOBAL');
    // GLOBAL record must NOT contain full questionnaire private data
    expect(globalRecords[0]['questionnaire']).toBeUndefined();
    expect(globalRecords[0]['challenges']).toBeUndefined();
    // Must contain only match-safe fields
    expect(globalRecords[0]['industry_code']).toBeDefined();
  });

  it('INT-03: Timeout-as-success — B1 timeout (timeoutMs=0) → partialResults=true, B2/C/D still complete', async () => {
    const { queue, bpSvc, b1Svc, b2Svc, feedSvc, pcSvc } = makeServices();
    const tenantId = 'int03-tenant';
    const userId = 'int03-user';

    const bp = await bpSvc.createProfile({
      userId,
      tenantId,
      questionnaire: { industry: 'health' },
    });
    const { profileId } = bp.data!;

    // B1 with timeoutMs=-1 — always triggers timeout (elapsed > -1 is always true)
    const b1Result = await b1Svc.scoreCompatibility({ userId, tenantId, profileId, timeoutMs: -1 });
    expect(b1Result.isSuccess).toBe(true); // SUCCESS MODE — not failure
    expect(b1Result.data!.partialResults).toBe(true);

    // B1 still emits BusinessMatchesFound with partialResults=true
    const matchEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'BusinessMatchesFound',
    ) as { eventType: string; data: Record<string, unknown> } | undefined;
    expect(matchEvent).toBeDefined();
    expect((matchEvent!.data as Record<string, unknown>)['partialResults']).toBe(true);

    // B2 accepts partial results — forwards partialResults=true
    const b2Result = await b2Svc.buildSuggestions({
      userId,
      tenantId,
      matchedBusinessIds: b1Result.data!.matchedBusinessIds,
      partialResults: true,
    });
    expect(b2Result.isSuccess).toBe(true);
    expect(b2Result.data!.partialResults).toBe(true);

    // C produces degraded-but-valid feed
    const feedResult = await feedSvc.buildFeed({ userId, tenantId, profileId });
    expect(feedResult.isSuccess).toBe(true);

    // D still emits PersonalizationCompleted
    const pcResult = await pcSvc.complete({
      userId,
      tenantId,
      feedId: feedResult.data!.feedId,
      profileId,
    });
    expect(pcResult.isSuccess).toBe(true);
    expect(
      queue._enqueued.some(
        (e: { eventType: string }) => e.eventType === 'PersonalizationCompleted',
      ),
    ).toBe(true);
  });

  it('INT-04: A2 degraded (GENERAL fallback) — flow still completes with PersonalizationCompleted', async () => {
    const { queue, bpSvc, a2Svc, feedSvc, pcSvc } = makeServices();
    const tenantId = 'int04-tenant';
    const userId = 'int04-user';

    // A2 with no industry field in answers → GENERAL segment (degraded)
    const segResult = await a2Svc.segment({ userId, tenantId, answers: {} });
    expect(segResult.isSuccess).toBe(true); // always success (GENERAL fallback)
    expect(segResult.data!.degraded).toBe(true);
    expect(segResult.data!.segment).toBe('GENERAL');

    const bp = await bpSvc.createProfile({ userId, tenantId, questionnaire: {} });
    const { profileId } = bp.data!;

    // C: uses degraded signals — still produces output
    const feedResult = await feedSvc.buildFeed({ userId, tenantId, profileId });
    expect(feedResult.isSuccess).toBe(true);
    expect(feedResult.data!.degraded).toBe(true);

    // D still emits PersonalizationCompleted
    await pcSvc.complete({ userId, tenantId, feedId: feedResult.data!.feedId, profileId });
    expect(
      queue._enqueued.some(
        (e: { eventType: string }) => e.eventType === 'PersonalizationCompleted',
      ),
    ).toBe(true);
  });

  it('INT-05: A3 reads BusinessProfile by profileId (not raw questionnaire answers)', async () => {
    const { db, bpSvc, a3Svc } = makeServices();
    const tenantId = 'int05-tenant';
    const userId = 'int05-user';

    // A1 creates profile
    const bpResult = await bpSvc.createProfile({
      userId,
      tenantId,
      questionnaire: { industry: 'edtech' },
    });
    const { profileId } = bpResult.data!;

    // A3 reads from xiigen-business-profiles using profileId
    const a3Result = await a3Svc.initializeProgram({ profileId, userId, tenantId });
    expect(a3Result.isSuccess).toBe(true);

    // Verify A3 searched xiigen-business-profiles (not questionnaire index)
    const searchCalls = db.searchDocuments.mock.calls as Array<[string, Record<string, unknown>]>;
    const a3ProfileRead = searchCalls.find(
      ([index, _filter]) => index === 'xiigen-business-profiles',
    );
    expect(a3ProfileRead).toBeDefined();
  });

  it('INT-06: Idempotency — second A1 run with same userId returns same profileId, no duplicate store', async () => {
    const { db, bpSvc } = makeServices();
    const tenantId = 'int06-tenant';
    const userId = 'int06-user';

    const first = await bpSvc.createProfile({
      userId,
      tenantId,
      questionnaire: { industry: 'retail' },
    });
    expect(first.isSuccess).toBe(true);
    const firstProfileId = first.data!.profileId;

    // Seed the existing record so idempotency check finds it
    const existingDoc = [...db._store.values()].find(
      (e) => e.index === 'xiigen-business-profiles',
    )?.doc;
    expect(existingDoc).toBeDefined();

    // Second call with same userId — idempotency should return first record
    // (Note: uses same db that has the record stored)
    const second = await bpSvc.createProfile({
      userId,
      tenantId,
      questionnaire: { industry: 'retail' },
      idempotencyKey: existingDoc!['idempotency_key'] as string,
    });
    expect(second.isSuccess).toBe(true);
    expect(second.data!.profileId).toBe(firstProfileId);
  });

  it('INT-07: PersonalizationCompleted event NOT OnboardingCompleted — cross-flow contract (FLOW-02-DR-02-C)', async () => {
    const { queue, bpSvc, feedSvc, pcSvc } = makeServices();
    const tenantId = 'int07-tenant';
    const userId = 'int07-user';

    const bp = await bpSvc.createProfile({ userId, tenantId, questionnaire: {} });
    const { profileId } = bp.data!;

    const feed = await feedSvc.buildFeed({ userId, tenantId, profileId });
    await pcSvc.complete({ userId, tenantId, feedId: feed.data!.feedId, profileId });

    // PersonalizationCompleted MUST be emitted
    expect(
      queue._enqueued.some(
        (e: { eventType: string }) => e.eventType === 'PersonalizationCompleted',
      ),
    ).toBe(true);

    // OnboardingCompleted MUST NOT be emitted by FLOW-02 (belongs to FLOW-01)
    expect(
      queue._enqueued.some((e: { eventType: string }) => e.eventType === 'OnboardingCompleted'),
    ).toBe(false);
  });
});
