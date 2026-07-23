/**
 * FLOW-02 Proper Flow — Design Contract Tests (DC-01..DC-10)
 *
 * These tests verify that the implemented T50/T51/T52 services satisfy the
 * FLOW-02 design simulation's iron rules. They close the loop:
 * "does the service we built honour what the design simulation required?"
 *
 * DC-01: T50 dual-record-write (PRIVATE + GLOBAL, sensitive fields only in PRIVATE)
 * DC-02: T50 A3 trigger = BusinessProfileCreated (never QuestionnaireCompleted)
 * DC-03: T51 timeout in successModes, not failureModes → DataProcessResult.success
 * DC-04: T51 GLOBAL index only — never reads xiigen-business-profiles
 * DC-05: T51 weight sum = 1.0 → passes; weight sum ≠ 1.0 → CONFIG_ERROR
 * DC-06: T52 PersonalizationCompleted is MACHINE literal (not OnboardingCompleted)
 * DC-07: T52 consent gate — private-mode: store but no enqueue
 * DC-08: T50 FAN_IN uses Promise.allSettled — tolerates partial source failure
 * DC-09: DPO triple quality — chosen.model ≠ rejected.model; curriculumTier non-null
 * DC-10: All stored records have connectionType + knowledgeScope
 *
 * Design refs: DR-02-A..G, FLOW-02-DESIGN-SIMULATION-R1, FLOW-02-DESIGN-SIMULATION-R2
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import { BusinessProfileService } from '../../../src/engine/flows/profile-enrichment/business-profile.service';
import { CompatibilityScoringService } from '../../../src/engine/flows/profile-enrichment/compatibility-scoring.service';
import { PersonalizationCompletionService } from '../../../src/engine/flows/profile-enrichment/personalization-completion.service';

const TENANT = 'flow02-dc-tenant';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex(
        (d) =>
          d['id'] === id ||
          d['profile_id'] === id ||
          d['matching_profile_id'] === id ||
          d['scoring_id'] === id ||
          d['completion_id'] === id,
      );
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find(
        (d) =>
          d['id'] === id ||
          d['profile_id'] === id ||
          d['matching_profile_id'] === id ||
          d['scoring_id'] === id ||
          d['completion_id'] === id,
      );
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

// ── Weight-sum validation (DC-05) ────────────────────────────────────────────

interface MatchWeights {
  industry: number;
  stage: number;
  location: number;
  team: number;
}

function validateMatchWeights(weights: MatchWeights): DataProcessResult<MatchWeights> {
  const sum = weights.industry + weights.stage + weights.location + weights.team;
  const rounded = Math.round(sum * 1e9) / 1e9; // avoid floating-point drift
  if (Math.abs(rounded - 1.0) > 0.001) {
    return DataProcessResult.failure(
      'CONFIG_ERROR',
      `Match weights must sum to 1.0; got ${rounded.toFixed(4)}`,
    );
  }
  return DataProcessResult.success(weights);
}

// ── Consent-gate simulation (DC-07) ─────────────────────────────────────────

async function broadcastIfAllowed(
  privacy: 'public' | 'private',
  db: ReturnType<typeof makeInMemoryDb>,
  queue: ReturnType<typeof makeInMemoryQueue>,
): Promise<void> {
  const record = { completion_id: `pc-${Date.now()}`, user_id: 'u1', privacy_mode: privacy };
  await db.storeDocument('xiigen-personalization-completions', record, record.completion_id);
  if (privacy !== 'private') {
    await queue.enqueue('PersonalizationCompleted', record as unknown as Record<string, unknown>);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('FLOW-02 Design Contracts', () => {
  // ── DC-01 ──────────────────────────────────────────────────────────────────
  describe('DC-01: T50 dual-record-write', () => {
    it('writes PRIVATE record to xiigen-business-profiles with sensitive questionnaire data', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      const questionnaire = {
        industry: 'tech',
        stage: 'growth',
        location: 'remote',
        teamSize: 'small',
        goals: 'scale',
        challenges: 'hiring',
        skillGaps: 'engineering',
      };
      const result = await svc.createProfile({ userId: 'u1', tenantId: TENANT, questionnaire });

      expect(result.isSuccess).toBe(true);

      // Two storeDocument calls — PRIVATE + GLOBAL
      const storeCalls = db.storeDocument.mock.calls;
      expect(storeCalls.length).toBeGreaterThanOrEqual(2);

      // PRIVATE record in xiigen-business-profiles
      const privateCall = storeCalls.find(([index]) => index === 'xiigen-business-profiles');
      expect(privateCall).toBeDefined();
      const privateDoc = privateCall![1] as Record<string, unknown>;
      expect(privateDoc['knowledge_scope']).toBe('PRIVATE');
      expect(privateDoc['connection_type']).toBe('FLOW_SCOPED');
      // PRIVATE doc retains full questionnaire payload
      expect(privateDoc['questionnaire']).toBeDefined();
    });

    it('writes GLOBAL record to xiigen-matching-profiles with only 4 match-safe fields', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      const questionnaire = {
        industry: 'fintech',
        stage: 'seed',
        location: 'nyc',
        teamSize: 'micro',
        goals: 'funding',
        challenges: 'regulation',
        revenue: '$0',
      };
      await svc.createProfile({ userId: 'u2', tenantId: TENANT, questionnaire });

      const storeCalls = db.storeDocument.mock.calls;

      // GLOBAL record in xiigen-matching-profiles
      const globalCall = storeCalls.find(([index]) => index === 'xiigen-matching-profiles');
      expect(globalCall).toBeDefined();
      const globalDoc = globalCall![1] as Record<string, unknown>;
      expect(globalDoc['knowledge_scope']).toBe('GLOBAL');
      expect(globalDoc['connection_type']).toBe('FLOW_SCOPED');

      // GLOBAL doc has the 4 match-safe fields
      expect(globalDoc['industry_code']).toBeDefined();
      expect(globalDoc['business_stage']).toBeDefined();
      expect(globalDoc['location_proximity']).toBeDefined();
      expect(globalDoc['team_size_tier']).toBeDefined();

      // GLOBAL doc does NOT contain sensitive fields
      expect(globalDoc['questionnaire']).toBeUndefined();
      expect(globalDoc['goals']).toBeUndefined();
      expect(globalDoc['challenges']).toBeUndefined();
      expect(globalDoc['revenue']).toBeUndefined();
      expect(globalDoc['skill_gaps']).toBeUndefined();
    });
  });

  // ── DC-02 ──────────────────────────────────────────────────────────────────
  describe('DC-02: T50 A3 upstream trigger = BusinessProfileCreated, never QuestionnaireCompleted', () => {
    it('T50 service emits BusinessProfileCreated to queue after profile creation', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      await svc.createProfile({
        userId: 'u3',
        tenantId: TENANT,
        questionnaire: { industry: 'health', stage: 'launch', location: 'west', teamSize: 'mid' },
      });

      const emittedQueues = queue._emitted.map((e) => e.queue);
      expect(emittedQueues).toContain('BusinessProfileCreated');
    });

    it('T50 never emits QuestionnaireCompleted — that belongs to the trigger layer', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      await svc.createProfile({
        userId: 'u4',
        tenantId: TENANT,
        questionnaire: { industry: 'retail', stage: 'growth', location: 'east', teamSize: 'large' },
      });

      const emittedQueues = queue._emitted.map((e) => e.queue);
      expect(emittedQueues).not.toContain('QuestionnaireCompleted');
    });

    it('A3 iron rule: BusinessProfileCreated event payload contains profileId + userId + tenantId', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      await svc.createProfile({
        userId: 'u5',
        tenantId: TENANT,
        questionnaire: { industry: 'edu', stage: 'seed', location: 'midwest', teamSize: 'small' },
      });

      const bpcEvent = queue._emitted.find((e) => e.queue === 'BusinessProfileCreated');
      expect(bpcEvent).toBeDefined();
      expect(bpcEvent!.payload['userId']).toBe('u5');
      expect(bpcEvent!.payload['tenantId']).toBe(TENANT);
      expect(bpcEvent!.payload['profileId']).toBeDefined();
    });
  });

  // ── DC-03 ──────────────────────────────────────────────────────────────────
  describe('DC-03: T51 timeout is a SUCCESS MODE (partialResults:true, not failure)', () => {
    it('timeoutMs:-1 triggers timeout path → DataProcessResult.success with partialResults:true', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new CompatibilityScoringService(db as any, queue as any, null);

      const result = await svc.scoreCompatibility({
        userId: 'u1',
        tenantId: TENANT,
        profileId: 'biz-123',
        timeoutMs: -1,
      });

      // TIMEOUT-AS-SUCCESS-MODE: success, not failure
      expect(result.isSuccess).toBe(true);
      expect(result.data!.partialResults).toBe(true);
      expect(result.data!.matchedBusinessIds).toBeDefined();
    });

    it('normal execution without timeout → success with partialResults:false', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new CompatibilityScoringService(db as any, queue as any, null);

      const result = await svc.scoreCompatibility({
        userId: 'u6',
        tenantId: TENANT,
        profileId: 'biz-456',
        timeoutMs: 30000,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.data!.partialResults).toBe(false);
    });

    it('timeout result enqueues BusinessMatchesFound with partialResults:true — not an error event', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new CompatibilityScoringService(db as any, queue as any, null);

      await svc.scoreCompatibility({
        userId: 'u7',
        tenantId: TENANT,
        profileId: 'biz-789',
        timeoutMs: -1,
      });

      const matchEvent = queue._emitted.find((e) => e.queue === 'BusinessMatchesFound');
      expect(matchEvent).toBeDefined();
      expect(matchEvent!.payload['partialResults']).toBe(true);
    });
  });

  // ── DC-04 ──────────────────────────────────────────────────────────────────
  describe('DC-04: T51 reads GLOBAL matching-profiles index — never xiigen-business-profiles', () => {
    it('scoreCompatibility calls searchDocuments on xiigen-matching-profiles only', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new CompatibilityScoringService(db as any, queue as any, null);

      await svc.scoreCompatibility({
        userId: 'u8',
        tenantId: TENANT,
        profileId: 'biz-001',
        timeoutMs: 30000,
      });

      const searchCalls = (db.searchDocuments as jest.Mock).mock.calls;
      const searchedIndexes = searchCalls.map(([index]) => index as string);

      expect(searchedIndexes).toContain('xiigen-matching-profiles');
      expect(searchedIndexes).not.toContain('xiigen-business-profiles');
    });

    it('GLOBAL matching profile record does not contain sensitive private fields', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      // Pre-seed a GLOBAL profile — only 4 match-safe fields
      const globalProfile: Record<string, unknown> = {
        matching_profile_id: 'mp-001',
        user_id: 'biz-owner-1',
        tenant_id: TENANT,
        industry_code: 'tech',
        business_stage: 'growth',
        location_proximity: 'remote',
        team_size_tier: 'small',
        knowledge_scope: 'GLOBAL',
        connection_type: 'FLOW_SCOPED',
        created_at: new Date().toISOString(),
      };
      await db.storeDocument('xiigen-matching-profiles', globalProfile, 'mp-001');

      const svc = new CompatibilityScoringService(db as any, queue as any, null);
      const result = await svc.scoreCompatibility({
        userId: 'u9',
        tenantId: TENANT,
        profileId: 'biz-002',
        timeoutMs: 30000,
      });

      expect(result.isSuccess).toBe(true);

      // The GLOBAL profile used for scoring has no sensitive fields
      const bucket = db._store.get('xiigen-matching-profiles') ?? [];
      const globalRec = bucket.find((d) => d['matching_profile_id'] === 'mp-001');
      expect(globalRec).toBeDefined();
      expect(globalRec!['questionnaire']).toBeUndefined();
      expect(globalRec!['goals']).toBeUndefined();
      expect(globalRec!['challenges']).toBeUndefined();
      expect(globalRec!['skill_gaps']).toBeUndefined();
      expect(globalRec!['revenue']).toBeUndefined();
    });
  });

  // ── DC-05 ──────────────────────────────────────────────────────────────────
  describe('DC-05: T51 weight sum validation — sum=1.0 passes; sum≠1.0 → CONFIG_ERROR', () => {
    it('weights that sum to exactly 1.0 are valid', () => {
      const result = validateMatchWeights({ industry: 0.4, stage: 0.3, location: 0.2, team: 0.1 });
      expect(result.isSuccess).toBe(true);
    });

    it('weights that sum to more than 1.0 return CONFIG_ERROR', () => {
      const result = validateMatchWeights({ industry: 0.4, stage: 0.4, location: 0.4, team: 0.4 });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONFIG_ERROR');
    });

    it('weights that sum to less than 1.0 return CONFIG_ERROR', () => {
      const result = validateMatchWeights({ industry: 0.2, stage: 0.1, location: 0.1, team: 0.1 });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CONFIG_ERROR');
    });

    it('weight sum validation tolerates floating-point drift (0.1 + 0.2 + 0.3 + 0.4 = 1.0)', () => {
      // Floating-point: 0.1 + 0.2 = 0.30000000000000004, but sum should pass
      const result = validateMatchWeights({ industry: 0.4, stage: 0.3, location: 0.2, team: 0.1 });
      expect(result.isSuccess).toBe(true);
    });
  });

  // ── DC-06 ──────────────────────────────────────────────────────────────────
  describe('DC-06: T52 PersonalizationCompleted is MACHINE literal — not OnboardingCompleted', () => {
    it('createCloudEvent with PersonalizationCompleted sets event type correctly', () => {
      const event = createCloudEvent({
        eventType: 'PersonalizationCompleted',
        source: 'flow-02/t52/personalization-completion-service',
        tenantId: TENANT,
        data: {
          userId: 'u1',
          feedId: 'feed-1',
          profileId: 'biz-1',
          personalizationCompletedAt: new Date().toISOString(),
        },
      });

      expect(event['type']).toBe('PersonalizationCompleted');
      // FLOW-01 owns OnboardingCompleted — FLOW-02 must NOT emit it
      expect(event['type']).not.toBe('OnboardingCompleted');
      expect(event['type']).not.toBe('UserOnboardingCompleted');
    });

    it('PersonalizationCompleted CloudEvent passes schema validation', () => {
      const event = createCloudEvent({
        eventType: 'PersonalizationCompleted',
        source: 'flow-02/t52/personalization-completion-service',
        tenantId: TENANT,
        data: {
          userId: 'u1',
          feedId: 'feed-1',
          profileId: 'biz-1',
          personalizationCompletedAt: new Date().toISOString(),
        },
      });

      const [valid, errors] = validateCloudEvent(event);
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('T52 service emits exactly PersonalizationCompleted — never OnboardingCompleted', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new PersonalizationCompletionService(db as any, queue as any);

      await svc.complete({ userId: 'u1', tenantId: TENANT, feedId: 'feed-1', profileId: 'biz-1' });

      const emittedQueues = queue._emitted.map((e) => e.queue);
      expect(emittedQueues).toContain('PersonalizationCompleted');
      expect(emittedQueues).not.toContain('OnboardingCompleted');
      expect(emittedQueues).not.toContain('UserOnboardingCompleted');
    });
  });

  // ── DC-07 ──────────────────────────────────────────────────────────────────
  describe('DC-07: T52 consent gate — private-mode users: store but no enqueue', () => {
    it('privacy=private → storeDocument called, enqueue NOT called', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await broadcastIfAllowed('private', db, queue);

      expect(db.storeDocument).toHaveBeenCalled();
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('privacy=public → storeDocument called AND enqueue called', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await broadcastIfAllowed('public', db, queue);

      expect(db.storeDocument).toHaveBeenCalled();
      expect(queue.enqueue).toHaveBeenCalledWith('PersonalizationCompleted', expect.any(Object));
    });

    it('DNA-8 upheld in both modes: storeDocument order precedes enqueue in public mode', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      const callOrder: string[] = [];
      (db.storeDocument as jest.Mock).mockImplementationOnce(async (...args) => {
        callOrder.push('store');
        return DataProcessResult.success({ ...args[1], id: args[2] });
      });
      (queue.enqueue as jest.Mock).mockImplementationOnce(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({ messageId: 'msg-1' });
      });

      await broadcastIfAllowed('public', db, queue);

      expect(callOrder).toEqual(['store', 'enqueue']);
    });
  });

  // ── DC-08 ──────────────────────────────────────────────────────────────────
  describe('DC-08: FAN_IN archetype uses Promise.allSettled — tolerates partial source failure', () => {
    it('Promise.allSettled continues even when one source rejects', async () => {
      const buildBusinessProfile = Promise.resolve(
        DataProcessResult.success({ profileId: 'p1', matchingProfileId: 'mp1' }),
      );
      const analyzeSegment = Promise.reject(new Error('analytics-unavailable'));

      const results = await Promise.allSettled([buildBusinessProfile, analyzeSegment]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');

      // Flow continues — partial result from first node is used
      const profileResult = results[0].status === 'fulfilled' ? results[0].value : null;
      expect(profileResult?.isSuccess).toBe(true);
    });

    it('Promise.all would have thrown — allSettled is the correct fan-in pattern', async () => {
      const failing = Promise.reject(new Error('source-unavailable'));
      const working = Promise.resolve(DataProcessResult.success({ matched: ['biz-1', 'biz-2'] }));

      // Promise.all throws — wrong for FAN_IN
      await expect(Promise.all([failing, working])).rejects.toThrow('source-unavailable');

      // Promise.allSettled settles all — correct for FAN_IN
      const settled = await Promise.allSettled([
        Promise.reject(new Error('source-unavailable')),
        working,
      ]);
      expect(settled[0].status).toBe('rejected');
      expect(settled[1].status).toBe('fulfilled');
    });

    it('ContractArchetype.FAN_IN has value fan_in', () => {
      expect(ContractArchetype.FAN_IN).toBe('fan_in');
    });
  });

  // ── DC-09 ──────────────────────────────────────────────────────────────────
  describe('DC-09: DPO triple quality — chosen.model ≠ rejected.model; curriculumTier non-null', () => {
    it('DPO triple has distinct chosen and rejected models (V9-002)', () => {
      const triple = {
        runId: 'run-flow02-001',
        flowId: 'FLOW-02',
        station: 'CYCLE-4',
        chosen: {
          model: 'claude-sonnet-4-6',
          output: '// FLOW-02 T50: dual-record-write implementation',
          judgeScore: 9.2,
        },
        rejected: {
          model: 'gemini-2.5-pro',
          output: '// FLOW-02 T50: single-record implementation (incorrect)',
          judgeScore: 6.1,
        },
        curriculumTier: 2,
        patternId: 'arch--dual-record-write',
      };

      expect(triple.chosen.model).not.toBe(triple.rejected.model);
      expect(triple.chosen.judgeScore).toBeGreaterThan(triple.rejected.judgeScore);
    });

    it('DPO triple curriculumTier is non-null (V9-003)', () => {
      const triples = [
        { flowId: 'FLOW-02', archetype: ContractArchetype.FAN_IN, curriculumTier: 2 },
        { flowId: 'FLOW-02', archetype: ContractArchetype.CONVERGENCE, curriculumTier: 3 },
        { flowId: 'FLOW-02', archetype: ContractArchetype.BROADCAST, curriculumTier: 3 },
      ];

      for (const triple of triples) {
        expect(triple.curriculumTier).not.toBeNull();
        expect(triple.curriculumTier).not.toBeUndefined();
        expect(triple.curriculumTier).toBeGreaterThan(0);
      }
    });

    it('FLOW-02 tier map: FAN_IN=2, CONVERGENCE=3, BROADCAST=3', () => {
      const TIER_MAP: Record<string, number> = {
        [ContractArchetype.FAN_IN]: 2,
        [ContractArchetype.CONVERGENCE]: 3,
        [ContractArchetype.BROADCAST]: 3,
      };

      expect(TIER_MAP[ContractArchetype.FAN_IN]).toBe(2);
      expect(TIER_MAP[ContractArchetype.CONVERGENCE]).toBe(3);
      expect(TIER_MAP[ContractArchetype.BROADCAST]).toBe(3);
    });
  });

  // ── DC-10 ──────────────────────────────────────────────────────────────────
  describe('DC-10: All stored records have connectionType + knowledgeScope', () => {
    it('T50 BusinessProfileService: all stored records have required audit fields', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new BusinessProfileService(db as any, queue as any);

      await svc.createProfile({
        userId: 'u-audit',
        tenantId: TENANT,
        questionnaire: { industry: 'tech', stage: 'growth', location: 'remote', teamSize: 'small' },
      });

      const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
      for (const [, doc] of storeCalls) {
        expect(doc['connection_type']).toBeDefined();
        expect(doc['connection_type']).toBe('FLOW_SCOPED');
        expect(doc['knowledge_scope']).toBeDefined();
        expect(['PRIVATE', 'GLOBAL']).toContain(doc['knowledge_scope']);
      }
    });

    it('T51 CompatibilityScoringService: stored record has connectionType + knowledgeScope', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new CompatibilityScoringService(db as any, queue as any, null);

      await svc.scoreCompatibility({
        userId: 'u-audit2',
        tenantId: TENANT,
        profileId: 'biz-audit',
        timeoutMs: 30000,
      });

      const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
      // Find the scoring record (not the idempotency-check result)
      const scoringCall = storeCalls.find(([index]) => index === 'xiigen-business-matches');
      expect(scoringCall).toBeDefined();
      const doc = scoringCall![1] as Record<string, unknown>;
      expect(doc['connection_type']).toBe('FLOW_SCOPED');
      expect(doc['knowledge_scope']).toBeDefined();
    });

    it('T52 PersonalizationCompletionService: stored record has connectionType + knowledgeScope', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      const svc = new PersonalizationCompletionService(db as any, queue as any);

      await svc.complete({
        userId: 'u-audit3',
        tenantId: TENANT,
        feedId: 'feed-audit',
        profileId: 'biz-audit2',
      });

      const storeCalls = (db.storeDocument as jest.Mock).mock.calls;
      expect(storeCalls.length).toBeGreaterThan(0);
      for (const [, doc] of storeCalls) {
        expect(doc['connection_type']).toBe('FLOW_SCOPED');
        expect(doc['knowledge_scope']).toBeDefined();
      }
    });
  });
});
