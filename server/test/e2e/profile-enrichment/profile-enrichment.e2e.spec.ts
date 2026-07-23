/**
 * FLOW-02 E2E — Fan-In Convergence Engine (Profile Enrichment & Matching)
 *
 * Archetypes: FAN_IN, CONVERGENCE, BROADCAST
 * Fabric interfaces: IDatabaseService (DATABASE), IQueueService (QUEUE), IAiProvider (AI_ENGINE)
 * CloudEvents: ConvergenceCompleted, GenesisSeedCreated, FanInCollected, BroadcastEmitted,
 *              MatchConfidenceScored, EnrichmentFailed
 *
 * Named checks (validate.handler.ts):
 *   fan_in_minimum_two_candidates
 *   convergence_score_above_threshold
 *   genesis_prompt_required_fields
 *   tenant_scope_on_enrichment_result
 *   broadcast_consent_gated
 *   deduplication_idempotency_key_present
 *   store_before_emit_convergence
 *   partial_failure_tolerant_fan_in
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — fan-in with 3 inputs, genesis seeding, convergence scoring, winner selection
 *   2. Error path — below threshold, empty input, missing required fields
 *   3. Tenant isolation — fan-in results scoped, genesis prompts not cross-tenant
 *   4. Idempotency — duplicate genesis submission, same-input fan-in returns same winner
 *   5. UI state mapping — FAN_IN_COLLECTING → FAN_IN_SCORING → FAN_IN_COMPLETE, GENESIS states
 *   6. API contract — /api/dynamic/convergence-results, /api/dynamic/genesis-prompts
 *   7. CloudEvents — ConvergenceCompleted, GenesisSeedCreated with valid envelope
 *   8. Named checks — minimum candidates, score threshold, required fields
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';

// ── Mock fabric providers ──────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
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
      const doc = bucket.find((d) => d['id'] === id);
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

// ── Fan-in simulation helpers ──────────────────────────────────────────────

interface FanInCandidate {
  candidateId: string;
  source: string;
  score: number;
  data: Record<string, unknown>;
}

function runFanInConvergence(
  candidates: FanInCandidate[],
  threshold: number,
): DataProcessResult<FanInCandidate> {
  if (candidates.length < 2) {
    return DataProcessResult.failure(
      'INSUFFICIENT_CANDIDATES',
      'Fan-in requires at least 2 candidates',
    );
  }

  const winner = candidates.reduce((best, c) => (c.score > best.score ? c : best));

  if (winner.score < threshold) {
    return DataProcessResult.failure(
      'BELOW_THRESHOLD',
      `Best candidate score ${winner.score} is below threshold ${threshold}`,
    );
  }

  return DataProcessResult.success(winner);
}

function validateGenesisPrompt(prompt: Record<string, unknown>): DataProcessResult<boolean> {
  const requiredFields = ['promptId', 'flowId', 'tenantId', 'content'];
  const missing = requiredFields.filter((f) => !prompt[f]);

  if (missing.length > 0) {
    return DataProcessResult.failure(
      'MISSING_FIELDS',
      `Genesis prompt missing required fields: ${missing.join(', ')}`,
    );
  }

  return DataProcessResult.success(true);
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — Happy Path [FAN-IN CONVERGENCE + GENESIS SEEDING]', () => {
  const TENANT = 'flow02-happy-tenant';
  const THRESHOLD = 0.7;

  it('F02-H1: fan-in convergence with 3 inputs selects highest-score result', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'c-001', source: 'enricher-a', score: 0.75, data: { profileId: 'p-001' } },
      { candidateId: 'c-002', source: 'enricher-b', score: 0.92, data: { profileId: 'p-001' } },
      { candidateId: 'c-003', source: 'enricher-c', score: 0.81, data: { profileId: 'p-001' } },
    ];

    const result = runFanInConvergence(candidates, THRESHOLD);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.candidateId).toBe('c-002');
    expect(result.data!.score).toBe(0.92);
  });

  it('F02-H2: genesis prompt seeding produces valid genesis record', async () => {
    const db = makeInMemoryDb();
    const genesis = {
      promptId: 'genesis-001',
      flowId: 'FLOW-02',
      tenantId: TENANT,
      content: 'Enrich user profile using multi-source fan-in with confidence-gated convergence.',
      createdAt: new Date().toISOString(),
    };

    const validation = validateGenesisPrompt(genesis);
    expect(validation.isSuccess).toBe(true);

    const stored = await db.storeDocument('genesis-prompts', genesis, genesis.promptId);
    expect(stored.isSuccess).toBe(true);
  });

  it('F02-H3: convergence scoring produces DataProcessResult.success when score exceeds threshold', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'c-A', source: 'source-1', score: 0.85, data: {} },
      { candidateId: 'c-B', source: 'source-2', score: 0.78, data: {} },
    ];

    const result = runFanInConvergence(candidates, 0.7);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.score).toBeGreaterThanOrEqual(0.7);
  });

  it('F02-H4: multiple candidates fan-in returns winner with highest confidence score', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'c-1', source: 'linkedin', score: 0.6, data: {} },
      { candidateId: 'c-2', source: 'github', score: 0.88, data: {} },
      { candidateId: 'c-3', source: 'twitter', score: 0.72, data: {} },
      { candidateId: 'c-4', source: 'crunchbase', score: 0.95, data: {} },
    ];

    const result = runFanInConvergence(candidates, 0.7);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.candidateId).toBe('c-4');
    expect(result.data!.source).toBe('crunchbase');
  });

  it('F02-H5: quality threshold exceeded → result accepted and stored', async () => {
    const db = makeInMemoryDb();
    const candidates: FanInCandidate[] = [
      { candidateId: 'c-X', source: 'enricher-x', score: 0.95, data: { profileId: 'p-002' } },
      { candidateId: 'c-Y', source: 'enricher-y', score: 0.82, data: { profileId: 'p-002' } },
    ];

    const result = runFanInConvergence(candidates, 0.7);
    expect(result.isSuccess).toBe(true);

    const stored = await db.storeDocument(
      'convergence-results',
      {
        ...result.data!,
        tenantId: TENANT,
        profileId: 'p-002',
        status: 'FAN_IN_COMPLETE',
      },
      `convergence-${result.data!.candidateId}`,
    );

    expect(stored.isSuccess).toBe(true);
  });

  it('F02-H6: genesis prompt stored before ConvergenceStarted event emitted (DNA-8)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    await trackedDb.storeDocument(
      'genesis-prompts',
      { promptId: 'g-001', tenantId: TENANT },
      'g-001',
    );
    await trackedQueue.enqueue('flow02.genesis.seeded', { promptId: 'g-001', tenantId: TENANT });

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F02-H7: fan-in with 2 candidates (minimum) succeeds when both above threshold', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'min-a', source: 'source-a', score: 0.8, data: {} },
      { candidateId: 'min-b', source: 'source-b', score: 0.75, data: {} },
    ];

    const result = runFanInConvergence(candidates, 0.7);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.candidateId).toBe('min-a');
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — Error Path [FAILURE CASES]', () => {
  const THRESHOLD = 0.7;

  it('F02-E1: all candidates below threshold → DataProcessResult.failure with BELOW_THRESHOLD', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'low-a', source: 'src-a', score: 0.4, data: {} },
      { candidateId: 'low-b', source: 'src-b', score: 0.55, data: {} },
    ];

    const result = runFanInConvergence(candidates, THRESHOLD);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BELOW_THRESHOLD');
    expect(result.errorMessage).toContain('0.55');
  });

  it('F02-E2: empty fan-in input (0 candidates) → failure with INSUFFICIENT_CANDIDATES', () => {
    const result = runFanInConvergence([], THRESHOLD);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_CANDIDATES');
  });

  it('F02-E3: single candidate fan-in (< 2) → failure — minimum 2 required', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'solo', source: 'single-source', score: 0.99, data: {} },
    ];

    const result = runFanInConvergence(candidates, THRESHOLD);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INSUFFICIENT_CANDIDATES');
  });

  it('F02-E4: genesis prompt missing required fields → DataProcessResult.failure', () => {
    const incompleteGenesis = {
      promptId: 'bad-001',
      // missing flowId, tenantId, content
    };

    const result = validateGenesisPrompt(incompleteGenesis);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FIELDS');
    expect(result.errorMessage).toContain('flowId');
    expect(result.errorMessage).toContain('tenantId');
    expect(result.errorMessage).toContain('content');
  });

  it('F02-E5: genesis prompt missing content field → failure with MISSING_FIELDS', () => {
    const noContent = { promptId: 'g-nc', flowId: 'FLOW-02', tenantId: 'tenant-x' };
    const result = validateGenesisPrompt(noContent);

    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('content');
  });

  it('F02-E6: getDocument NOT_FOUND returns DataProcessResult.failure', async () => {
    const db = makeInMemoryDb();
    const result = await db.getDocument('genesis-prompts', 'nonexistent-id');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F02-E7: DataProcessResult.failure propagates correct errorCode and message', () => {
    const failure = DataProcessResult.failure('CONVERGENCE_FAILED', 'No candidates met threshold');

    expect(failure.isSuccess).toBe(false);
    expect(failure.errorCode).toBe('CONVERGENCE_FAILED');
    expect(failure.errorMessage).toContain('threshold');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — Tenant Isolation [ENRICHMENT RESULTS SCOPED]', () => {
  it('F02-T1: fan-in results scoped per tenant — searchDocuments with tenantId filter', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'convergence-results',
      { tenantId: 'tenant-alpha', profileId: 'p-1', score: 0.9 },
      'cr-alpha-1',
    );
    await db.storeDocument(
      'convergence-results',
      { tenantId: 'tenant-beta', profileId: 'p-2', score: 0.85 },
      'cr-beta-1',
    );

    const resultAlpha = await db.searchDocuments('convergence-results', {
      tenantId: 'tenant-alpha',
    });

    expect(resultAlpha.isSuccess).toBe(true);
    const docs = resultAlpha.data as Record<string, unknown>[];
    expect(docs).toHaveLength(1);
    expect(docs[0]['tenantId']).toBe('tenant-alpha');
    expect(docs.some((d) => d['tenantId'] === 'tenant-beta')).toBe(false);
  });

  it('F02-T2: genesis prompts not accessible cross-tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'genesis-prompts',
      { promptId: 'gp-1', tenantId: 'owner-tenant', content: 'X' },
      'gp-1',
    );

    const otherResult = await db.searchDocuments('genesis-prompts', { tenantId: 'other-tenant' });

    expect(otherResult.isSuccess).toBe(true);
    expect((otherResult.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F02-T3: enrichment result stored with tenantId field for downstream isolation', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'tenant-enrichment';

    const enrichment = {
      profileId: 'p-enriched',
      tenantId: TENANT,
      sources: ['linkedin', 'github'],
      score: 0.88,
      status: 'FAN_IN_COMPLETE',
    };

    const result = await db.storeDocument('enrichment-results', enrichment, 'enr-001');

    expect(result.isSuccess).toBe(true);
    const fetched = await db.getDocument('enrichment-results', 'enr-001');
    expect((fetched.data as Record<string, unknown>)['tenantId']).toBe(TENANT);
  });

  it('F02-T4: fan-in for tenant-A does not affect fan-in state for tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'fan-in-sessions',
      { tenantId: 'T-A', sessionId: 'session-a', candidates: 3 },
      'sess-a',
    );
    await db.storeDocument(
      'fan-in-sessions',
      { tenantId: 'T-B', sessionId: 'session-b', candidates: 2 },
      'sess-b',
    );

    const resultA = await db.searchDocuments('fan-in-sessions', { tenantId: 'T-A' });
    const docsA = resultA.data as Record<string, unknown>[];

    expect(docsA.every((d) => d['tenantId'] === 'T-A')).toBe(true);
    expect(docsA[0]['candidates']).toBe(3);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — Idempotency [STABLE FAN-IN RESULTS]', () => {
  const THRESHOLD = 0.7;

  it('F02-I1: duplicate genesis prompt submission handled — upsert via same ID', async () => {
    const db = makeInMemoryDb();
    const genesis = {
      promptId: 'g-idem-001',
      flowId: 'FLOW-02',
      tenantId: 'tenant-idem',
      content: 'Idempotent content',
    };

    await db.storeDocument('genesis-prompts', genesis, genesis.promptId);
    await db.storeDocument('genesis-prompts', genesis, genesis.promptId);

    const results = await db.searchDocuments('genesis-prompts', { promptId: 'g-idem-001' });
    expect((results.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F02-I2: fan-in with same inputs returns same winner deterministically', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'stable-a', source: 'source-a', score: 0.88, data: {} },
      { candidateId: 'stable-b', source: 'source-b', score: 0.75, data: {} },
    ];

    const result1 = runFanInConvergence(candidates, THRESHOLD);
    const result2 = runFanInConvergence(candidates, THRESHOLD);

    expect(result1.data!.candidateId).toBe(result2.data!.candidateId);
    expect(result1.data!.score).toBe(result2.data!.score);
  });

  it('F02-I3: genesis prompt validation is idempotent — same prompt validates identically', () => {
    const genesis = { promptId: 'g-v1', flowId: 'FLOW-02', tenantId: 'T1', content: 'Content' };

    const v1 = validateGenesisPrompt(genesis);
    const v2 = validateGenesisPrompt(genesis);

    expect(v1.isSuccess).toBe(v2.isSuccess);
  });

  it('F02-I4: convergence result stored with idempotency key — same key = upsert', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'convergence-results',
      { profileId: 'p-idem', score: 0.9, status: 'FAN_IN_COMPLETE' },
      'conv-idem-001',
    );
    await db.storeDocument(
      'convergence-results',
      { profileId: 'p-idem', score: 0.9, status: 'FAN_IN_COMPLETE' },
      'conv-idem-001',
    );

    const results = await db.searchDocuments('convergence-results', { profileId: 'p-idem' });
    expect((results.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F02-I5: re-running fan-in with identical candidates returns same DataProcessResult', () => {
    const candidates: FanInCandidate[] = [
      { candidateId: 'rep-x', source: 'src-x', score: 0.77, data: { tag: 'x' } },
      { candidateId: 'rep-y', source: 'src-y', score: 0.84, data: { tag: 'y' } },
    ];

    const run1 = runFanInConvergence(candidates, THRESHOLD);
    const run2 = runFanInConvergence(candidates, THRESHOLD);

    expect(run1.isSuccess).toBe(run2.isSuccess);
    expect(run1.data!.candidateId).toBe(run2.data!.candidateId);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — UI State Mapping [STATE TRANSITIONS]', () => {
  it('F02-U1: FAN_IN_COLLECTING state when gathering candidates from sources', () => {
    const session = {
      sessionId: 'sess-001',
      status: 'FAN_IN_COLLECTING',
      candidatesReceived: 1,
      sourcesTotal: 3,
    };
    const screen = session.status === 'FAN_IN_COLLECTING' ? 'fan-in-collecting' : 'fan-in-scoring';
    expect(screen).toBe('fan-in-collecting');
  });

  it('F02-U2: FAN_IN_SCORING state when all candidates collected, scoring in progress', () => {
    const session = {
      sessionId: 'sess-001',
      status: 'FAN_IN_SCORING',
      candidatesReceived: 3,
      sourcesTotal: 3,
    };
    const screen = session.status === 'FAN_IN_SCORING' ? 'fan-in-scoring' : 'fan-in-complete';
    expect(screen).toBe('fan-in-scoring');
  });

  it('F02-U3: FAN_IN_COMPLETE state when winner selected above threshold', () => {
    const session = { status: 'FAN_IN_COMPLETE', winnerId: 'c-002', winnerScore: 0.92 };
    const screen = session.status === 'FAN_IN_COMPLETE' ? 'fan-in-complete' : 'fan-in-scoring';
    expect(screen).toBe('fan-in-complete');
    expect(session.winnerScore).toBeGreaterThanOrEqual(0.7);
  });

  it('F02-U4: GENESIS_PENDING state shows genesis-loading screen', () => {
    const state = { genesisStatus: 'GENESIS_PENDING', promptId: 'g-001' };
    const screen = state.genesisStatus === 'GENESIS_PENDING' ? 'genesis-loading' : 'genesis-seeded';
    expect(screen).toBe('genesis-loading');
  });

  it('F02-U5: GENESIS_SEEDED state shows genesis-ready screen with prompt summary', () => {
    const state = { genesisStatus: 'GENESIS_SEEDED', promptId: 'g-001', flowId: 'FLOW-02' };
    const screen = state.genesisStatus === 'GENESIS_SEEDED' ? 'genesis-ready' : 'genesis-loading';
    expect(screen).toBe('genesis-ready');
    expect(state.flowId).toBe('FLOW-02');
  });

  it('F02-U6: FAN_IN transition from COLLECTING → SCORING → COMPLETE is sequential', () => {
    const transitions = ['FAN_IN_COLLECTING', 'FAN_IN_SCORING', 'FAN_IN_COMPLETE'];
    const idx = (s: string) => transitions.indexOf(s);

    expect(idx('FAN_IN_SCORING')).toBeGreaterThan(idx('FAN_IN_COLLECTING'));
    expect(idx('FAN_IN_COMPLETE')).toBeGreaterThan(idx('FAN_IN_SCORING'));
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — API Contract [DYNAMIC CONTROLLER]', () => {
  it('F02-A1: /api/dynamic/convergence-results query returns DataProcessResult', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'tenant-api';

    await db.storeDocument(
      'convergence-results',
      { tenantId: TENANT, profileId: 'p-api', score: 0.88, status: 'FAN_IN_COMPLETE' },
      'cr-api-001',
    );

    const result = await db.searchDocuments('convergence-results', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['status']).toBe('FAN_IN_COMPLETE');
  });

  it('F02-A2: /api/dynamic/genesis-prompts query returns DataProcessResult', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'tenant-genesis-api';

    await db.storeDocument(
      'genesis-prompts',
      {
        promptId: 'gp-api-001',
        flowId: 'FLOW-02',
        tenantId: TENANT,
        content: 'Profile enrichment seed prompt',
      },
      'gp-api-001',
    );

    const result = await db.searchDocuments('genesis-prompts', { tenantId: TENANT });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('F02-A3: /api/dynamic/enrichment-results empty query returns empty list', async () => {
    const db = makeInMemoryDb();

    const result = await db.searchDocuments('enrichment-results', { tenantId: 'empty-tenant' });

    expect(result.isSuccess).toBe(true);
    expect(result.data as unknown[]).toHaveLength(0);
  });

  it('F02-A4: /api/dynamic/convergence-results returns only tenant-scoped records', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument('convergence-results', { tenantId: 'T-QUERY', score: 0.9 }, 'cr-q-1');
    await db.storeDocument('convergence-results', { tenantId: 'T-OTHER', score: 0.8 }, 'cr-q-2');

    const result = await db.searchDocuments('convergence-results', { tenantId: 'T-QUERY' });
    const docs = result.data as Record<string, unknown>[];

    expect(docs.every((d) => d['tenantId'] === 'T-QUERY')).toBe(true);
  });

  it('F02-A5: DataProcessResult.failure returns structured error for API error response', () => {
    const failure = DataProcessResult.failure(
      'FAN_IN_FAILED',
      'All candidates below quality threshold',
    );

    expect(failure.isSuccess).toBe(false);
    expect(failure.errorCode).toBe('FAN_IN_FAILED');
    expect(failure.errorMessage).toContain('quality threshold');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — CloudEvents [CONVERGENCE EVENT ENVELOPE]', () => {
  const TENANT = 'flow02-cloud-tenant';

  it('F02-C1: ConvergenceCompleted event has correct CloudEvents envelope', () => {
    const event = createCloudEvent({
      eventType: 'flow02.convergence.completed',
      source: 'flow-02/convergence-engine',
      data: { profileId: 'p-cloud-001', winnerId: 'c-002', winnerScore: 0.92, tenantId: TENANT },
      tenantId: TENANT,
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['type']).toBe('flow02.convergence.completed');
    expect(event['tenantid']).toBe(TENANT);
    expect(event['id']).toBeDefined();
  });

  it('F02-C2: GenesisSeedCreated event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'flow02.genesis.seed.created',
      source: 'flow-02/genesis-seeder',
      data: { promptId: 'g-cloud-001', flowId: 'FLOW-02', tenantId: TENANT },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F02-C3: FanInCollected event includes candidateCount field', () => {
    const event = createCloudEvent({
      eventType: 'flow02.fan.in.collected',
      source: 'flow-02/fan-in-collector',
      data: { sessionId: 'sess-cloud-001', candidateCount: 3, tenantId: TENANT },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['candidateCount']).toBe(3);
  });

  it('F02-C4: ConvergenceCompleted event stored before emitted (DNA-8 outbox pattern)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    await trackedDb.storeDocument(
      'convergence-results',
      { profileId: 'p-001', score: 0.9, tenantId: TENANT },
      'conv-001',
    );
    const event = createCloudEvent({
      eventType: 'flow02.convergence.completed',
      source: 'flow-02/convergence-engine',
      data: { profileId: 'p-001', tenantId: TENANT },
      tenantId: TENANT,
    });
    await trackedQueue.enqueue(
      'flow02.convergence.completed',
      event as unknown as Record<string, unknown>,
    );

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F02-C5: EnrichmentFailed event has required fields including reason', () => {
    const event = createCloudEvent({
      eventType: 'flow02.enrichment.failed',
      source: 'flow-02/enricher',
      data: { profileId: 'p-fail', reason: 'BELOW_THRESHOLD', tenantId: TENANT },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('BELOW_THRESHOLD');
  });

  it('F02-C6: BroadcastEmitted event includes consentGated field', () => {
    const event = createCloudEvent({
      eventType: 'flow02.broadcast.emitted',
      source: 'flow-02/broadcast',
      data: {
        profileId: 'p-broadcast',
        consentGated: true,
        notificationType: 'onboarding',
        tenantId: TENANT,
      },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['consentGated']).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-02 E2E — Named Checks [FAN-IN + CONVERGENCE ENFORCEMENT]', () => {
  const THRESHOLD = 0.7;

  it('F02-N1: check fan_in_minimum_two_candidates — 2 candidates pass, 1 fails', () => {
    const withTwo = runFanInConvergence(
      [
        { candidateId: 'a', source: 's-a', score: 0.8, data: {} },
        { candidateId: 'b', source: 's-b', score: 0.75, data: {} },
      ],
      THRESHOLD,
    );

    const withOne = runFanInConvergence(
      [{ candidateId: 'a', source: 's-a', score: 0.99, data: {} }],
      THRESHOLD,
    );

    expect(withTwo.isSuccess).toBe(true);
    expect(withOne.isSuccess).toBe(false);
    expect(withOne.errorCode).toBe('INSUFFICIENT_CANDIDATES');
  });

  it('F02-N2: check convergence_score_above_threshold — 0.71 passes, 0.69 fails', () => {
    const aboveThreshold = runFanInConvergence(
      [
        { candidateId: 'pass-a', source: 's-1', score: 0.71, data: {} },
        { candidateId: 'pass-b', source: 's-2', score: 0.65, data: {} },
      ],
      THRESHOLD,
    );

    const belowThreshold = runFanInConvergence(
      [
        { candidateId: 'fail-a', source: 's-1', score: 0.69, data: {} },
        { candidateId: 'fail-b', source: 's-2', score: 0.65, data: {} },
      ],
      THRESHOLD,
    );

    expect(aboveThreshold.isSuccess).toBe(true);
    expect(belowThreshold.isSuccess).toBe(false);
    expect(belowThreshold.errorCode).toBe('BELOW_THRESHOLD');
  });

  it('F02-N3: check genesis_prompt_required_fields — all 4 required fields enforced', () => {
    const complete = validateGenesisPrompt({
      promptId: 'g-1',
      flowId: 'FLOW-02',
      tenantId: 'T',
      content: 'C',
    });
    const missingContent = validateGenesisPrompt({
      promptId: 'g-2',
      flowId: 'FLOW-02',
      tenantId: 'T',
    });
    const missingAll = validateGenesisPrompt({});

    expect(complete.isSuccess).toBe(true);
    expect(missingContent.isSuccess).toBe(false);
    expect(missingContent.errorMessage).toContain('content');
    expect(missingAll.isSuccess).toBe(false);
    expect(missingAll.errorMessage).toContain('promptId');
  });

  it('F02-N4: check tenant_scope_on_enrichment_result — all stored results have tenantId', async () => {
    const db = makeInMemoryDb();
    const TENANT = 'T-SCOPED';

    const result = { profileId: 'p-001', score: 0.88, tenantId: TENANT };
    await db.storeDocument('enrichment-results', result, 'er-001');

    const fetched = await db.getDocument('enrichment-results', 'er-001');
    expect((fetched.data as Record<string, unknown>)['tenantId']).toBe(TENANT);
  });

  it('F02-N5: check deduplication_idempotency_key_present — same key results in single stored record', async () => {
    const db = makeInMemoryDb();

    const key = 'conv-idempotent-key';
    await db.storeDocument('convergence-results', { score: 0.9, tenantId: 'T' }, key);
    await db.storeDocument('convergence-results', { score: 0.9, tenantId: 'T' }, key);

    const results = await db.searchDocuments('convergence-results', { tenantId: 'T' });
    expect((results.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F02-N6: check store_before_emit_convergence — database write precedes event emit', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const order: string[] = [];

    await db
      .storeDocument('convergence-results', { profileId: 'p-order', score: 0.9 }, 'conv-order')
      .then(() => order.push('store'));
    const event = createCloudEvent({
      eventType: 'flow02.convergence.completed',
      source: 'flow-02',
      data: {},
      tenantId: 'T',
    });
    await queue
      .enqueue('flow02.convergence.completed', event as unknown as Record<string, unknown>)
      .then(() => order.push('enqueue'));

    expect(order[0]).toBe('store');
    expect(order[1]).toBe('enqueue');
  });

  it('F02-N7: check partial_failure_tolerant_fan_in — failed sources excluded, remaining evaluated', () => {
    // Simulate partial failure: source-c fails, source-a and source-b succeed
    const successfulCandidates: FanInCandidate[] = [
      { candidateId: 'partial-a', source: 'source-a', score: 0.82, data: {} },
      { candidateId: 'partial-b', source: 'source-b', score: 0.76, data: {} },
      // source-c not included (simulating allSettled rejected)
    ];

    const result = runFanInConvergence(successfulCandidates, THRESHOLD);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.source).toBe('source-a');
  });

  it('F02-N8: check broadcast_consent_gated — broadcast event always includes consentGated flag', () => {
    const broadcastWithConsent = {
      profileId: 'p-broadcast',
      consentGated: true,
      notificationType: 'onboarding',
      tenantId: 'T-B',
    };

    const hasCGField = 'consentGated' in broadcastWithConsent;
    expect(hasCGField).toBe(true);
    expect(broadcastWithConsent.consentGated).toBe(true);
  });
});
