/**
 * FLOW-02 — FREEDOM-Config Adaptation Verification
 *
 * Per FLOW-PORTABILITY-TEST-PROTOCOL-v1.2: a FREEDOM-config adaptation is a
 * tenant-scoped FREEDOM-key value change. This test proves FLOW-02 correctly
 * honors tenant-scoped FREEDOM overrides WITHOUT any MACHINE-logic change.
 *
 * Adaptation plan:
 *   docs/portability/flow-02/adaptation-plan-freedom-config-profile-enrichment.md
 * Tenant profile:
 *   docs/portability/flow-02/tenant-profile-acme-pro-members.json
 *
 * The sub-tenant 'acme-pro-members' overrides 4 live FREEDOM weight keys read
 * by CompatibilityScoringService (T51 Node B1):
 *   - flow02_match_weight_industry: 0.4 → 0.55
 *   - flow02_match_weight_stage:    0.3 → 0.25
 *   - flow02_match_weight_location: 0.2 → 0.10
 *   - flow02_match_weight_team:     0.1 → 0.10
 *
 * Weight-sum invariant: 0.55 + 0.25 + 0.10 + 0.10 = 1.00 (matches default 1.00).
 *
 * Tuning keys (Gap-FLOW-02-B — CLOSED 2026-04-23):
 *   - flow02_match_timeout_seconds (30 → 15) — honored by scoreCompatibility.timeoutMs fallback
 *   - flow02_debounce_window_seconds (300 → 60) — honored by idempotency cache window
 *
 * Acceptance:
 *   FC-ADAPT-1: Acme tenant scoring calls freedomConfig.get for all 4 weight keys.
 *   FC-ADAPT-2: Acme tenant topScore for a profile with (industry + stage only)
 *               reflects acme weights: 0.55 + 0.25 = 0.80 (not default 0.70).
 *   FC-ADAPT-3: Default tenant topScore for the same shape profile reflects
 *               default weights: 0.40 + 0.30 = 0.70 (not acme's 0.80).
 *   FC-ADAPT-4: MACHINE invariants unchanged — event name BusinessMatchesFound,
 *               index names, knowledge_scope=PRIVATE, connection_type=FLOW_SCOPED,
 *               DNA-8 outbox ordering (storeDocument before enqueue).
 *   FC-ADAPT-5: Default and Acme run side-by-side — no cross-tenant weight bleed;
 *               each tenant's topScore reflects its own FREEDOM values.
 *   FC-ADAPT-6: Acme scoring consults both tuning keys (timeout + debounce window).
 *   FC-ADAPT-7: Debounce window expiry — a stale cached record (older than
 *               FREEDOM-configured window) triggers a fresh recompute, proving
 *               the window is actually read from FREEDOM.
 *
 * Naming convention: "freedom-config adaptation" is one of four adaptation
 * categories defined in adaptation-surface-profile-enrichment.json:
 *   freedom-config / grammar / role-scope / business-domain
 */

import 'reflect-metadata';
import { CompatibilityScoringService } from '../../src/engine/flows/profile-enrichment/compatibility-scoring.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// Acme-Pro-Members tenant FREEDOM overrides — 4 weights + 2 tuning keys (all 6 now wired)
const ACME_OVERRIDES = {
  flow02_match_weight_industry: 0.55,
  flow02_match_weight_stage: 0.25,
  flow02_match_weight_location: 0.1,
  flow02_match_weight_team: 0.1,
  flow02_match_timeout_seconds: 15,
  flow02_debounce_window_seconds: 60,
} as const;

// Default-tenant FREEDOM values (XIIGEN_FREEDOM_DEFAULTS baseline)
const DEFAULT_OVERRIDES = {
  flow02_match_weight_industry: 0.4,
  flow02_match_weight_stage: 0.3,
  flow02_match_weight_location: 0.2,
  flow02_match_weight_team: 0.1,
  flow02_match_timeout_seconds: 30,
  flow02_debounce_window_seconds: 300,
} as const;

// ── Mock builders ──────────────────────────────────────────────────────────

function makeDb(seedMatchingProfiles: Array<Record<string, unknown>> = []) {
  const partition = new Map<string, Array<Record<string, unknown>>>();
  partition.set('xiigen-matching-profiles', [...seedMatchingProfiles]);

  const storedOrder: Array<{ index: string; id: string }> = [];

  return {
    _partition: partition,
    _storedOrder: storedOrder,
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const records = partition.get(index) ?? [];
      const matches = records.filter((r) =>
        Object.entries(filter).every(([k, v]) => {
          if (v === undefined || v === null || v === '') return true;
          return r[k] === v;
        }),
      );
      return DataProcessResult.success(matches);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const records = partition.get(index) ?? [];
      records.push({ ...doc, _id: id });
      partition.set(index, records);
      storedOrder.push({ index, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown>; ts: number }> = [];
  return {
    _enqueued: enqueued,
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data, ts: Date.now() });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeFreedomConfig(values: Record<string, unknown>) {
  return {
    get: jest.fn(async (key: string) => {
      if (!(key in values)) return null;
      return { value: values[key] };
    }),
    set: jest.fn(),
    list: jest.fn(),
  } as any;
}

function makeSystem(
  freedomValues: Record<string, unknown>,
  seedProfiles: Array<Record<string, unknown>> = [],
) {
  const db = makeDb(seedProfiles);
  const queue = makeQueue();
  const freedomConfig = makeFreedomConfig(freedomValues);
  const scoring = new CompatibilityScoringService(db, queue, freedomConfig);
  return { db, queue, freedomConfig, scoring };
}

// Matching profile shape per GLOBAL-scope B1 read contract
function matchingProfile(
  tenantId: string,
  matchingProfileId: string,
  fields: { industry?: boolean; stage?: boolean; location?: boolean; team?: boolean },
): Record<string, unknown> {
  return {
    matching_profile_id: matchingProfileId,
    user_id: matchingProfileId,
    tenant_id: tenantId,
    knowledge_scope: 'GLOBAL',
    connection_type: 'FLOW_SCOPED',
    industry_code: fields.industry ? 'tech' : undefined,
    business_stage: fields.stage ? 'seed' : undefined,
    location_proximity: fields.location ? 'remote' : undefined,
    team_size_tier: fields.team ? 'small' : undefined,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('FLOW-02 FREEDOM-Config Adaptation Verification', () => {
  it('FC-ADAPT-1: Acme tenant scoring consults all 4 live weight FREEDOM keys', async () => {
    const acme = makeSystem(ACME_OVERRIDES, [
      matchingProfile('acme-pro-members', 'peer-1', {
        industry: true,
        stage: true,
        location: true,
        team: true,
      }),
    ]);

    const result = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-1',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-1',
    });

    expect(result.isSuccess).toBe(true);

    // Prove FREEDOM config WAS consulted for all 4 live weight keys
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_match_weight_industry');
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_match_weight_stage');
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_match_weight_location');
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_match_weight_team');
  });

  it('FC-ADAPT-2: Acme tenant topScore for (industry+stage) profile reflects acme weights 0.80', async () => {
    // Profile with only industry + stage fields set → acme weights: 0.55 + 0.25 = 0.80
    const acme = makeSystem(ACME_OVERRIDES, [
      matchingProfile('acme-pro-members', 'peer-1', { industry: true, stage: true }),
    ]);

    const result = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-1',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-1',
    });

    expect(result.isSuccess).toBe(true);
    // Floating-point: 0.55 + 0.25 = 0.80 (exact in binary). toBeCloseTo for safety.
    expect(result.data!.topScore).toBeCloseTo(0.8, 10);
    expect(result.data!.topScore).not.toBeCloseTo(0.7, 2); // not default
  });

  it('FC-ADAPT-3: Default tenant topScore for (industry+stage) profile reflects default weights 0.70', async () => {
    // Same shape profile, default FREEDOM values → 0.40 + 0.30 = 0.70
    const def = makeSystem(DEFAULT_OVERRIDES, [
      matchingProfile('default-tenant', 'peer-1', { industry: true, stage: true }),
    ]);

    const result = await def.scoring.scoreCompatibility({
      userId: 'user-default-1',
      tenantId: 'default-tenant',
      profileId: 'profile-default-1',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.topScore).toBeCloseTo(0.7, 10);
    expect(result.data!.topScore).not.toBeCloseTo(0.8, 2); // not acme
  });

  it('FC-ADAPT-4: MACHINE invariants unchanged under acme FREEDOM overrides', async () => {
    const acme = makeSystem(ACME_OVERRIDES, [
      matchingProfile('acme-pro-members', 'peer-1', {
        industry: true,
        stage: true,
        location: true,
        team: true,
      }),
    ]);

    const result = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-1',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-1',
    });
    expect(result.isSuccess).toBe(true);

    // MACHINE event name unchanged
    const emittedTypes = acme.queue._enqueued.map((e) => e.eventType);
    expect(emittedTypes).toContain('BusinessMatchesFound');

    // MACHINE: record stored with PRIVATE scope + FLOW_SCOPED connection
    const matches = acme.db._partition.get('xiigen-business-matches') ?? [];
    expect(matches.length).toBe(1);
    const match = matches[0];
    expect(match['knowledge_scope']).toBe('PRIVATE');
    expect(match['connection_type']).toBe('FLOW_SCOPED');
    expect(match['tenant_id']).toBe('acme-pro-members');

    // MACHINE outbox ordering: storeDocument BEFORE enqueue (DNA-8)
    expect(acme.db._storedOrder.length).toBe(1);
    expect(acme.db._storedOrder[0].index).toBe('xiigen-business-matches');
    const storeTs = acme.db.storeDocument.mock.invocationCallOrder[0];
    const enqueueTs = acme.queue.enqueue.mock.invocationCallOrder[0];
    expect(storeTs).toBeLessThan(enqueueTs);

    // MACHINE idempotency key format (sha256, 12-char prefix)
    expect(match['idempotency_key']).toMatch(/^[a-f0-9]{12}$/);

    // MACHINE weight sum: acme sum still 1.0 (0.55+0.25+0.10+0.10) → score with all 4 fields = 1.0
    expect(result.data!.topScore).toBeCloseTo(1.0, 10);
  });

  it('FC-ADAPT-5: Default + Acme side-by-side — no cross-tenant weight bleed', async () => {
    // Both tenants seed a profile with (industry + location) fields only.
    // Acme weights → 0.55 + 0.10 = 0.65
    // Default weights → 0.40 + 0.20 = 0.60
    const acme = makeSystem(ACME_OVERRIDES, [
      matchingProfile('acme-pro-members', 'peer-1', { industry: true, location: true }),
    ]);
    const def = makeSystem(DEFAULT_OVERRIDES, [
      matchingProfile('default-tenant', 'peer-1', { industry: true, location: true }),
    ]);

    const acmeResult = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-1',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-1',
    });
    const defResult = await def.scoring.scoreCompatibility({
      userId: 'user-default-1',
      tenantId: 'default-tenant',
      profileId: 'profile-default-1',
    });

    expect(acmeResult.isSuccess).toBe(true);
    expect(defResult.isSuccess).toBe(true);

    // Acme tenant: industry(0.55) + location(0.10) = 0.65
    expect(acmeResult.data!.topScore).toBeCloseTo(0.65, 10);

    // Default tenant: industry(0.40) + location(0.20) = 0.60
    expect(defResult.data!.topScore).toBeCloseTo(0.6, 10);

    // No cross-tenant bleed
    expect(acmeResult.data!.topScore).not.toBeCloseTo(0.6, 2);
    expect(defResult.data!.topScore).not.toBeCloseTo(0.65, 2);

    // Both tenants stored scoring records scoped to their own tenant_id
    const acmeMatches = acme.db._partition.get('xiigen-business-matches') ?? [];
    const defMatches = def.db._partition.get('xiigen-business-matches') ?? [];
    expect(acmeMatches[0]['tenant_id']).toBe('acme-pro-members');
    expect(defMatches[0]['tenant_id']).toBe('default-tenant');
    // Mocks are isolated per system → no shared db state (tenant isolation at mock level)
    expect(acmeMatches.some((m) => m['tenant_id'] === 'default-tenant')).toBe(false);
    expect(defMatches.some((m) => m['tenant_id'] === 'acme-pro-members')).toBe(false);
  });

  it('FC-ADAPT-6: Acme scoring consults both tuning keys (timeout + debounce window)', async () => {
    const acme = makeSystem(ACME_OVERRIDES, [
      matchingProfile('acme-pro-members', 'peer-1', { industry: true, stage: true }),
    ]);

    const result = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-6',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-6',
    });

    expect(result.isSuccess).toBe(true);

    // Both tuning keys consulted — proves Gap-FLOW-02-B wiring (service reads from FREEDOM)
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_match_timeout_seconds');
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_debounce_window_seconds');
  });

  it('FC-ADAPT-7: Debounce window expiry — stale cached record triggers recompute under FREEDOM override', async () => {
    const STALE_SCORING_ID = 'score-stale-cached-001';
    const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Seed a cached record that is 10 min old — older than Acme's 60s debounce window
    const idemKey = require('crypto')
      .createHash('sha256')
      .update('acme-pro-members:user-acme-7:b1')
      .digest('hex')
      .slice(0, 12);

    const staleRecord = {
      scoring_id: STALE_SCORING_ID,
      user_id: 'user-acme-7',
      tenant_id: 'acme-pro-members',
      idempotency_key: idemKey,
      matched_business_ids: ['stale-match-1'],
      partial_results: false,
      top_score: 0.42,
      created_at: TEN_MINUTES_AGO,
      knowledge_scope: 'PRIVATE',
      connection_type: 'FLOW_SCOPED',
    };

    // Seed the stale record in xiigen-business-matches (where idempotency lookup happens)
    const acme = makeSystem(ACME_OVERRIDES, []);
    (acme.db._partition.get('xiigen-business-matches') ?? []).push(staleRecord);
    acme.db._partition.set('xiigen-business-matches', [staleRecord]);

    // Also seed a matching profile so recompute produces a real score
    const matchingPartition = acme.db._partition.get('xiigen-matching-profiles') ?? [];
    matchingPartition.push(
      matchingProfile('acme-pro-members', 'peer-fresh', { industry: true, stage: true }),
    );
    acme.db._partition.set('xiigen-matching-profiles', matchingPartition);

    const result = await acme.scoring.scoreCompatibility({
      userId: 'user-acme-7',
      tenantId: 'acme-pro-members',
      profileId: 'profile-acme-7',
    });

    expect(result.isSuccess).toBe(true);
    // Stale cache NOT returned — fresh scoringId generated
    expect(result.data!.scoringId).not.toBe(STALE_SCORING_ID);
    // Fresh compute used Acme weights: industry(0.55) + stage(0.25) = 0.80
    expect(result.data!.topScore).toBeCloseTo(0.8, 10);
    // Debounce window key was consulted (guarantees FREEDOM read path executed)
    expect(acme.freedomConfig.get).toHaveBeenCalledWith('flow02_debounce_window_seconds');
  });
});
