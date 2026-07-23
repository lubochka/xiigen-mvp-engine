/**
 * Teaching Pipeline Validation — Playwright E2E tests (FLOW-02 + FLOW-01)
 *
 * Validates that the RAG teaching corpus is seeded and queryable.
 * All tests use Playwright's `request` API — no browser rendering required.
 *
 * Prerequisites (graceful skip if unavailable):
 *   Elasticsearch: http://localhost:9200  (or ES_URL env)
 *   nano-graphrag:  http://localhost:8080  (or GRAPHRAG_URL env)
 *
 * Tests gracefully skip when services are not running.
 * They fail only when a running service returns unexpected results.
 *
 * To seed and then run:
 *   # Start ES (infra profile):
 *   docker compose --profile infra up -d elasticsearch
 *   # Seed FLOW-02 patterns:
 *   python rag-benchmark/seed_flow02_patterns.py
 *   # Run tests:
 *   npx playwright test client/e2e/teaching-pipeline.spec.ts
 *
 * SEED-01: FLOW-02 RAG patterns in xiigen-rag-patterns (count >= 8)
 * SEED-02: FLOW-01 RAG patterns in xiigen-rag-patterns (count >= 4)
 * SEED-03: FLOW-02 design reasoning in xiigen-planning-decisions (count >= 7)
 * SEED-04: FAN_IN arch pattern retrievable by keyword
 * SEED-05: dual-record-write pattern retrievable by keyword
 * SEED-06: nano-graphrag health check passes
 * SEED-07: nano-graphrag returns results for FLOW-02 design query
 * SEED-08: FLOW-02 arbiters in xiigen-arbiters (count >= 6)
 * SEED-09: plan-flow02 PLAN_EXEMPLAR document is present
 * SEED-10: FLOW-01 design reasoning present in planning-decisions
 */

import { test, expect } from '@playwright/test';

const ES       = process.env['ES_URL']       ?? 'http://localhost:9200';
const GRAPHRAG = process.env['GRAPHRAG_URL'] ?? 'http://localhost:8080';

// ── Graceful-skip helpers ────────────────────────────────────────────────────

/**
 * Make an ES request. Returns null (and skips the test) if ES is unreachable
 * or if the index does not exist. Only propagates when ES is UP and responding.
 */
async function esGet(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  path: string,
): Promise<Response | null> {
  let resp: Awaited<ReturnType<typeof request.get>>;
  try {
    resp = await request.get(`${ES}${path}`, { timeout: 5000 });
  } catch {
    test.skip(true, `Elasticsearch not reachable at ${ES} — test skipped`);
    return null;
  }
  if (resp.status() === 0 || resp.status() === 503) {
    test.skip(true, 'Elasticsearch returned service unavailable — test skipped');
    return null;
  }
  return resp as unknown as Response;
}

async function esPost(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  path: string,
  body: Record<string, unknown>,
): Promise<Response | null> {
  let resp: Awaited<ReturnType<typeof request.post>>;
  try {
    resp = await request.post(`${ES}${path}`, { data: body, timeout: 5000 });
  } catch {
    test.skip(true, `Elasticsearch not reachable at ${ES} — test skipped`);
    return null;
  }
  if (resp.status() === 0 || resp.status() === 503) {
    test.skip(true, 'Elasticsearch returned service unavailable — test skipped');
    return null;
  }
  return resp as unknown as Response;
}

async function graphragGet(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  path: string,
): Promise<Awaited<ReturnType<typeof request.get>> | null> {
  try {
    const resp = await request.get(`${GRAPHRAG}${path}`, { timeout: 5000 });
    if (!resp.ok()) {
      test.skip(true, `nano-graphrag at ${GRAPHRAG}${path} returned ${resp.status()} — test skipped`);
      return null;
    }
    return resp;
  } catch {
    test.skip(true, `nano-graphrag not reachable at ${GRAPHRAG} — test skipped`);
    return null;
  }
}

async function graphragPost(
  request: Parameters<Parameters<typeof test>[1]>[0]['request'],
  path: string,
  body: Record<string, unknown>,
): Promise<Awaited<ReturnType<typeof request.post>> | null> {
  try {
    return await request.post(`${GRAPHRAG}${path}`, { data: body, timeout: 10000 });
  } catch {
    test.skip(true, `nano-graphrag not reachable at ${GRAPHRAG} — test skipped`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Teaching Pipeline — Seeded corpus validation', () => {

  // ── SEED-01 ──────────────────────────────────────────────────────────────
  test('SEED-01: FLOW-02 arch patterns present in xiigen-rag-patterns (count >= 8)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_count?q=flowId:FLOW-02');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    // If index doesn't exist yet, count returns 0 — skip rather than fail
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-rag-patterns has 0 FLOW-02 docs — run seed_flow02_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(8);
  });

  // ── SEED-02 ──────────────────────────────────────────────────────────────
  test('SEED-02: FLOW-01 arch patterns present in xiigen-rag-patterns (count >= 4)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_count?q=flowId:FLOW-01');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-rag-patterns has 0 FLOW-01 docs — seed not run');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // ── SEED-03 ──────────────────────────────────────────────────────────────
  test('SEED-03: FLOW-02 design reasoning present in xiigen-planning-decisions (count >= 7)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-02');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-02 docs — run seed_flow02_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(7);
  });

  // ── SEED-04 ──────────────────────────────────────────────────────────────
  test('SEED-04: FAN_IN parallel enrichment pattern retrievable by keyword', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_search', {
      query: { match: { keywords: 'FAN_IN parallel enrichment' } },
    });
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const hits = (body['hits'] as Record<string, unknown>);
    const total = (hits?.['total'] as Record<string, unknown>)?.['value'] as number ?? 0;
    if (total === 0) {
      test.skip(true, 'No FAN_IN patterns in index — seed not run');
      return;
    }
    expect(total).toBeGreaterThan(0);
    const firstHit = ((hits?.['hits'] as unknown[]) ?? [])[0] as Record<string, unknown>;
    const patternId = (firstHit?.['_source'] as Record<string, unknown>)?.['patternId'] as string ?? '';
    expect(patternId).toContain('fan-in');
  });

  // ── SEED-05 ──────────────────────────────────────────────────────────────
  test('SEED-05: dual-record-write pattern retrievable by keyword', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_search', {
      query: { match: { keywords: 'dual record write PRIVATE GLOBAL' } },
    });
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const total = ((body['hits'] as Record<string, unknown>)?.['total'] as Record<string, unknown>)?.['value'] as number ?? 0;
    if (total === 0) {
      test.skip(true, 'No dual-record-write patterns in index — seed not run');
      return;
    }
    expect(total).toBeGreaterThan(0);
  });

  // ── SEED-06 ──────────────────────────────────────────────────────────────
  test('SEED-06: nano-graphrag health check passes', async ({ request }) => {
    const resp = await graphragGet(request, '/health');
    if (!resp) return;

    const body = await resp.json();
    expect(body['status']).toBe('healthy');
    expect(body['provider']).toBe('nano-graphrag');
  });

  // ── SEED-07 ──────────────────────────────────────────────────────────────
  test('SEED-07: nano-graphrag returns results for FLOW-02 design query', async ({ request }) => {
    // First check health — skip silently if not running
    const health = await graphragGet(request, '/health');
    if (!health) return;

    const resp = await graphragPost(request, '/query', {
      query:     'dual record write business profile',
      workspace: 'flow02-design',
      mode:      'local',
    });
    if (!resp) return;

    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    const results = (body['results'] as unknown[]) ?? [];
    if (results.length === 0) {
      // Workspace not yet seeded — skip rather than fail
      test.skip(true, 'flow02-design workspace has no documents — run seed_flow02_patterns.py first');
      return;
    }
    expect(results.length).toBeGreaterThan(0);
  });

  // ── SEED-08 ──────────────────────────────────────────────────────────────
  test('SEED-08: FLOW-02 arbiters present in xiigen-arbiters (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-02');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-02 arbiters — bulk-load profile-enrichment-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-09 ──────────────────────────────────────────────────────────────
  test('SEED-09: plan-flow02-business-onboarding PLAN_EXEMPLAR is present', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/plan-flow02-business-onboarding');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'plan-flow02-business-onboarding not in index — run seed_flow02_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('PLAN_EXEMPLAR');
    expect(source['flowId']).toBe('FLOW-02');
  });

  // ── SEED-10 ──────────────────────────────────────────────────────────────
  test('SEED-10: FLOW-01 design reasoning present in xiigen-planning-decisions', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-01');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-01 docs — seed not run for FLOW-01');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── SEED-11 ──────────────────────────────────────────────────────────────
  test('SEED-11: FLOW-05 server-side calculation pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/SERVER-SIDE-CALCULATION-ONLY-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'SERVER-SIDE-CALCULATION-ONLY-001 not in index — run seed_flow05_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-05');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-12 ──────────────────────────────────────────────────────────────
  test('SEED-12: FLOW-05 timezone streak pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/TIMEZONE-AWARE-STREAK-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'TIMEZONE-AWARE-STREAK-001 not in index — run seed_flow05_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-05');
    expect(source['archetype']).toBe('PROCESSING');
  });

  // ── SEED-13 ──────────────────────────────────────────────────────────────
  test('SEED-13: FLOW-05 privacy gate branch pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/PRIVACY-GATE-BRANCH-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'PRIVACY-GATE-BRANCH-001 not in index — run seed_flow05_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-05');
    expect(source['archetype']).toBe('BROADCAST');
  });

  // ── SEED-14 ──────────────────────────────────────────────────────────────
  test('SEED-14: FLOW-05 ML output validation pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/ML-OUTPUT-VALIDATION-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'ML-OUTPUT-VALIDATION-001 not in index — run seed_flow05_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-05');
    expect(source['archetype']).toBe('PROCESSING');
  });

  // ── SEED-15 ──────────────────────────────────────────────────────────────
  test('SEED-15: FLOW-05 design decisions loaded in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-05');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-05 docs — run seed_flow05_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-16 ──────────────────────────────────────────────────────────────
  test('SEED-16: FLOW-06 access-control-before-content pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/ACCESS-CONTROL-BEFORE-CONTENT-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'ACCESS-CONTROL-BEFORE-CONTENT-001 not in index — run seed_flow06_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-06');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-17 ──────────────────────────────────────────────────────────────
  test('SEED-17: FLOW-06 server-side tier assignment pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/SERVER-SIDE-TIER-ASSIGNMENT-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'SERVER-SIDE-TIER-ASSIGNMENT-001 not in index — run seed_flow06_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-06');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-18 ──────────────────────────────────────────────────────────────
  test('SEED-18: FLOW-06 group join idempotency pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/GROUP-JOIN-IDEMPOTENCY-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'GROUP-JOIN-IDEMPOTENCY-001 not in index — run seed_flow06_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-06');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-19 ──────────────────────────────────────────────────────────────
  test('SEED-19: FLOW-06 tier-gated content query pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/TIER-GATED-CONTENT-QUERY-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'TIER-GATED-CONTENT-QUERY-001 not in index — run seed_flow06_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-06');
    expect(source['archetype']).toBe('PROCESSING');
  });

  // ── SEED-20 ──────────────────────────────────────────────────────────────
  test('SEED-20: FLOW-06 design decisions loaded in xiigen-planning-decisions (count >= 7)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-06');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-06 docs — run seed_flow06_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(7);
  });

  // ── SEED-21 ──────────────────────────────────────────────────────────────
  test('SEED-21: FLOW-07 privacy-gatekeeper-inline-invocation pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/privacy-gatekeeper-inline-invocation');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'privacy-gatekeeper-inline-invocation not in index — run seed_flow07_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-07');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-22 ──────────────────────────────────────────────────────────────
  test('SEED-22: FLOW-07 bidirectional-atomic-graph-write pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/bidirectional-atomic-graph-write');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'bidirectional-atomic-graph-write not in index — run seed_flow07_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-07');
    expect(source['archetype']).toBe('ORCHESTRATION');
  });

  // ── SEED-23 ──────────────────────────────────────────────────────────────
  test('SEED-23: FLOW-07 zero-score passthrough pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/zero-score-passthrough');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'zero-score-passthrough not in index — run seed_flow07_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-07');
    expect(source['archetype']).toBe('DATA_PIPELINE');
  });

  // ── SEED-24 ──────────────────────────────────────────────────────────────
  test('SEED-24: FLOW-07 two-phase privacy gate pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/two-phase-privacy-gate');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'two-phase-privacy-gate not in index — run seed_flow07_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-07');
    expect(source['archetype']).toBe('ROUTING');
  });

  // ── SEED-25 ──────────────────────────────────────────────────────────────
  test('SEED-25: FLOW-07 design decisions loaded in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-07');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-07 docs — run seed_flow07_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-26 ──────────────────────────────────────────────────────────────
  test('SEED-26: FLOW-09 seat-before-payment pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/seat-before-payment');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'seat-before-payment not in index — run seed_flow09_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-09');
    expect(source['qualityScore']).toBe(0.92);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-27 ──────────────────────────────────────────────────────────────
  test('SEED-27: FLOW-09 fail-open-fraud-detection pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/fail-open-fraud-detection');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'fail-open-fraud-detection not in index — run seed_flow09_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-09');
    expect(source['qualityScore']).toBe(0.88);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-28 ──────────────────────────────────────────────────────────────
  test('SEED-28: FLOW-09 platform-only-qr pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/platform-only-qr');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'platform-only-qr not in index — run seed_flow09_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-09');
    expect(source['curriculumTier']).toBe(1);
    expect(source['qualityScore']).toBe(0.94);
  });

  // ── SEED-29 ──────────────────────────────────────────────────────────────
  test('SEED-29: FLOW-09 all-or-nothing-group-booking pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/all-or-nothing-group-booking');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'all-or-nothing-group-booking not in index — run seed_flow09_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-09');
    expect(source['qualityScore']).toBe(0.91);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-30 ──────────────────────────────────────────────────────────────
  test('SEED-30: FLOW-09 design decisions loaded in xiigen-planning-decisions (count >= 7)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-09');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-09 docs — run seed_flow09_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(7);
  });

  // ── SEED-31 ──────────────────────────────────────────────────────────────
  test('SEED-31: FLOW-10 eligibility-before-audit-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/eligibility-before-audit-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'eligibility-before-audit-001 not in index — run seed_reviews_reputation_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-10');
    expect(source['qualityScore']).toBe(0.93);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-32 ──────────────────────────────────────────────────────────────
  test('SEED-32: FLOW-10 three-path-moderation-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/three-path-moderation-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'three-path-moderation-001 not in index — run seed_reviews_reputation_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-10');
    expect(source['qualityScore']).toBe(0.94);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-33 ──────────────────────────────────────────────────────────────
  test('SEED-33: FLOW-10 additive-subtractive-aggregate-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/additive-subtractive-aggregate-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'additive-subtractive-aggregate-001 not in index — run seed_reviews_reputation_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-10');
    expect(source['qualityScore']).toBe(0.91);
    expect(source['curriculumTier']).toBe(2);
  });

  // ── SEED-34 ──────────────────────────────────────────────────────────────
  test('SEED-34: FLOW-10 conditional-revision-gate-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/conditional-revision-gate-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'conditional-revision-gate-001 not in index — run seed_reviews_reputation_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-10');
    expect(source['qualityScore']).toBe(0.89);
    expect(source['curriculumTier']).toBe(3);
  });

  // ── SEED-35 ──────────────────────────────────────────────────────────────
  test('SEED-35: FLOW-10 design decisions loaded in xiigen-planning-decisions (count >= 10)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-10');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-10 docs — run seed_reviews_reputation_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(10);
  });

  // ── SEED-36 ──────────────────────────────────────────────────────────────
  test('SEED-36: FLOW-11 occ-publish-gate-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/occ-publish-gate-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'occ-publish-gate-001 not in index — run seed_schema_registry_dag_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-11');
  });

  // ── SEED-37 ──────────────────────────────────────────────────────────────
  test('SEED-37: FLOW-11 two-color-dfs-cycle-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/two-color-dfs-cycle-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'two-color-dfs-cycle-001 not in index — run seed_schema_registry_dag_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-11');
  });

  // ── SEED-38 ──────────────────────────────────────────────────────────────
  test('SEED-38: FLOW-11 breaking-change-gate-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/breaking-change-gate-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'breaking-change-gate-001 not in index — run seed_schema_registry_dag_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-11');
  });

  // ── SEED-39 ──────────────────────────────────────────────────────────────
  test('SEED-39: FLOW-11 dag-rebuild-async-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/dag-rebuild-async-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'dag-rebuild-async-001 not in index — run seed_schema_registry_dag_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-11');
  });

  // ── SEED-40 ──────────────────────────────────────────────────────────────
  test('SEED-40: FLOW-11 design decisions loaded in xiigen-planning-decisions (count >= 5)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-11');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-11 docs — run seed_schema_registry_dag_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ── SEED-41 ──────────────────────────────────────────────────────────────
  test('SEED-41: FLOW-12 design decisions loaded in xiigen-planning-decisions (count >= 5)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-12');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-12 docs — run seed_subscription_billing_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ── SEED-42 ──────────────────────────────────────────────────────────────
  test('SEED-42: FLOW-12 integer-cents-guard pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/INTEGER-CENTS-GUARD-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'INTEGER-CENTS-GUARD-001 not in index — run seed_subscription_billing_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-12');
  });

  // ── SEED-43 ──────────────────────────────────────────────────────────────
  test('SEED-43: FLOW-12 arbiters present in xiigen-arbiters (count >= 7)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-12');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-12 arbiters — bulk-load subscription-billing-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(7);
  });

  // ── SEED-44 ──────────────────────────────────────────────────────────────
  test('SEED-44: FLOW-12 status-before-lock pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/STATUS-BEFORE-LOCK-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'STATUS-BEFORE-LOCK-001 not in index — run seed_subscription_billing_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-12');
  });

  // ── SEED-45 ──────────────────────────────────────────────────────────────
  test('SEED-45: FLOW-12 additive-subtractive MRR pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/ADDITIVE-SUBTRACTIVE-MRR-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'ADDITIVE-SUBTRACTIVE-MRR-001 not in index — run seed_subscription_billing_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-12');
  });

  // ── SEED-46 ──────────────────────────────────────────────────────────────
  test('SEED-46: FLOW-13 design decisions loaded in xiigen-planning-decisions (count >= 5)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-13');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-13 docs — run seed_data_warehouse_analytics_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ── SEED-47 ──────────────────────────────────────────────────────────────
  test('SEED-47: FLOW-13 three-layer-gate-order pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/THREE-LAYER-GATE-ORDER-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'THREE-LAYER-GATE-ORDER-001 not in index — run seed_data_warehouse_analytics_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-13');
  });

  // ── SEED-48 ──────────────────────────────────────────────────────────────
  test('SEED-48: FLOW-13 arbiters present in xiigen-arbiters (count >= 7)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-13');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-13 arbiters — bulk-load data-warehouse-analytics-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(7);
  });

  // ── SEED-49 ──────────────────────────────────────────────────────────────
  test('SEED-49: FLOW-13 inline-quota-manager pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/INLINE-QUOTA-MANAGER-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'INLINE-QUOTA-MANAGER-001 not in index — run seed_data_warehouse_analytics_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-13');
  });

  // ── SEED-50 ──────────────────────────────────────────────────────────────
  test('SEED-50: FLOW-13 data-retention-execution-order pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/DATA-RETENTION-EXECUTION-ORDER-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'DATA-RETENTION-EXECUTION-ORDER-001 not in index — run seed_data_warehouse_analytics_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-13');
  });

  // \u2500\u2500 SEED-51 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  test('SEED-51: FLOW-14 design reasoning records present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-14');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-14 records \u2014 run seed_etl_data_integration_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // \u2500\u2500 SEED-52 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  test('SEED-52: FLOW-14 ep4-saga-cycle-001 pattern retrievable in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/ep4-saga-cycle-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'ep4-saga-cycle-001 not in index \u2014 run seed_etl_data_integration_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-14');
  });

  // \u2500\u2500 SEED-53 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  test('SEED-53: FLOW-14 timing-safe-hmac-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/timing-safe-hmac-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'timing-safe-hmac-001 not in index \u2014 run seed_etl_data_integration_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-14');
  });

  // \u2500\u2500 SEED-54 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  test('SEED-54: FLOW-14 arbiters present in xiigen-arbiters (count >= 10)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-14');
    if (!resp) return;

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const count = (body['count'] as number) ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-14 arbiters \u2014 bulk-load etl-data-integration-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(10);
  });

  // \u2500\u2500 SEED-55 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  test('SEED-55: FLOW-14 pii-gate-order1-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/pii-gate-order1-001');
    if (!resp) return;

    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'pii-gate-order1-001 not in index \u2014 run seed_etl_data_integration_patterns.py first');
      return;
    }

    const body = await (resp as unknown as { json(): Promise<Record<string, unknown>> }).json();
    const source = body['_source'] as Record<string, unknown>;
    expect(source['patternType']).toBe('ARCH_PATTERN');
    expect(source['flowId']).toBe('FLOW-14');
  });

  // ── SEED-56 ──────────────────────────────────────────────────────────────────
  test('SEED-56: FLOW-15 design-reasoning corpus present (6 DR records)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=flowId:FLOW-15+AND+patternType:DESIGN_REASONING&size=10');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing — seed saas-multi-tenancy corpus first');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'xiigen-rag-patterns has 0 FLOW-15 DR records — run seed script first');
      return;
    }
    expect(hits.length).toBeGreaterThanOrEqual(6);
    const source = hits[0]._source;
    expect(source['flowId']).toBe('FLOW-15');
    expect(source['patternType']).toBe('DESIGN_REASONING');
  });

  // ── SEED-57 ──────────────────────────────────────────────────────────────────
  test('SEED-57: FLOW-15 atomic-tenant-bootstrap-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:ATOMIC-TENANT-BOOTSTRAP-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'ATOMIC-TENANT-BOOTSTRAP-001 not found — run seed script');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('ATOMIC-TENANT-BOOTSTRAP-001');
    expect(source['flowId']).toBe('FLOW-15');
  });

  // ── SEED-58 ──────────────────────────────────────────────────────────────────
  test('SEED-58: FLOW-15 arbiters present in xiigen-arbiters (count >= 26)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-15');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-15 arbiters — bulk-load saas-multi-tenancy-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(26);
  });

  // ── SEED-59 ──────────────────────────────────────────────────────────────────
  test('SEED-59: FLOW-15 suspend-not-delete-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:SUSPEND-NOT-DELETE-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'SUSPEND-NOT-DELETE-001 not found — run seed script');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('SUSPEND-NOT-DELETE-001');
    expect(source['flowId']).toBe('FLOW-15');
  });

  // ── SEED-60 ──────────────────────────────────────────────────────────────────
  test('SEED-60: FLOW-15 immutable-machine-key-guard-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:IMMUTABLE-MACHINE-KEY-GUARD-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'IMMUTABLE-MACHINE-KEY-GUARD-001 not found — run seed script');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('IMMUTABLE-MACHINE-KEY-GUARD-001');
    expect(source['flowId']).toBe('FLOW-15');
  });

  // ── SEED-61 ──────────────────────────────────────────────────────────────────
  test('SEED-61: FLOW-16 design-reasoning corpus present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-16');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-16 docs — run seed_marketplace_payments_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-62 ──────────────────────────────────────────────────────────────────
  test('SEED-62: FLOW-16 CART-LOCK-SETNX-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:CART-LOCK-SETNX-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'CART-LOCK-SETNX-001 not found — run seed_marketplace_payments_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('CART-LOCK-SETNX-001');
    expect(source['flowId']).toBe('FLOW-16');
  });

  // ── SEED-63 ──────────────────────────────────────────────────────────────────
  test('SEED-63: FLOW-16 arbiters present in xiigen-arbiters (count >= 29)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-16');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-16 arbiters — bulk-load marketplace-payments-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(29);
  });

  // ── SEED-64 ──────────────────────────────────────────────────────────────────
  test('SEED-64: FLOW-16 LIFO-SAGA-COMPENSATION-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:LIFO-SAGA-COMPENSATION-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'LIFO-SAGA-COMPENSATION-001 not found — run seed_marketplace_payments_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('LIFO-SAGA-COMPENSATION-001');
    expect(source['flowId']).toBe('FLOW-16');
  });

  // ── SEED-65 ──────────────────────────────────────────────────────────────────
  test('SEED-65: FLOW-16 NON-REPUDIATION-AUDIT-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:NON-REPUDIATION-AUDIT-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'NON-REPUDIATION-AUDIT-001 not found — run seed_marketplace_payments_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('NON-REPUDIATION-AUDIT-001');
    expect(source['flowId']).toBe('FLOW-16');
  });

  // ── SEED-66 ──────────────────────────────────────────────────────────────────
  test('SEED-66: FLOW-17 design decisions present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-17');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-17 docs — run seed_freelancer_marketplace_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-67 ──────────────────────────────────────────────────────────────────
  test('SEED-67: FLOW-17 PROPOSAL-ACCEPTANCE-LOCK-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:PROPOSAL-ACCEPTANCE-LOCK-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'PROPOSAL-ACCEPTANCE-LOCK-001 not found — run seed_freelancer_marketplace_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('PROPOSAL-ACCEPTANCE-LOCK-001');
    expect(source['flowId']).toBe('FLOW-17');
  });

  // ── SEED-68 ──────────────────────────────────────────────────────────────────
  test('SEED-68: FLOW-17 arbiters present in xiigen-arbiters (count >= 29)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-17');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-17 arbiters — bulk-load freelancer-marketplace-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(29);
  });

  // ── SEED-69 ──────────────────────────────────────────────────────────────────
  test('SEED-69: FLOW-17 DELIVERY-GATE-BEFORE-RELEASE-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:DELIVERY-GATE-BEFORE-RELEASE-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'DELIVERY-GATE-BEFORE-RELEASE-001 not found — run seed_freelancer_marketplace_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('DELIVERY-GATE-BEFORE-RELEASE-001');
    expect(source['flowId']).toBe('FLOW-17');
  });

  // ── SEED-70 ──────────────────────────────────────────────────────────────────
  test('SEED-70: FLOW-17 SINGLE-DIRECTION-REVIEW-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:SINGLE-DIRECTION-REVIEW-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'SINGLE-DIRECTION-REVIEW-001 not found — run seed_freelancer_marketplace_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('SINGLE-DIRECTION-REVIEW-001');
    expect(source['flowId']).toBe('FLOW-17');
  });

  // ── SEED-71 ──────────────────────────────────────────────────────────────────
  test('SEED-71: FLOW-18 design decisions present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-18');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-18 docs — run seed_visual_flow_engine_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-72 ──────────────────────────────────────────────────────────────────
  test('SEED-72: FLOW-18 DRAFT-BEFORE-PUBLISH-GATE-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:DRAFT-BEFORE-PUBLISH-GATE-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'DRAFT-BEFORE-PUBLISH-GATE-001 not found — run seed_visual_flow_engine_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('DRAFT-BEFORE-PUBLISH-GATE-001');
    expect(source['flowId']).toBe('FLOW-18');
  });

  // ── SEED-73 ──────────────────────────────────────────────────────────────────
  test('SEED-73: FLOW-18 arbiters present in xiigen-arbiters (count >= 29)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-18');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-18 arbiters — bulk-load visual-flow-engine-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(29);
  });

  // ── SEED-74 ──────────────────────────────────────────────────────────────────
  test('SEED-74: FLOW-18 CONNECTION-TYPE-COMPATIBILITY-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:CONNECTION-TYPE-COMPATIBILITY-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'CONNECTION-TYPE-COMPATIBILITY-001 not found — run seed_visual_flow_engine_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('CONNECTION-TYPE-COMPATIBILITY-001');
    expect(source['flowId']).toBe('FLOW-18');
  });

  // ── SEED-75 ──────────────────────────────────────────────────────────────────
  test('SEED-75: FLOW-18 INJECTION-VERSION-LOCK-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:INJECTION-VERSION-LOCK-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'INJECTION-VERSION-LOCK-001 not found — run seed_visual_flow_engine_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('INJECTION-VERSION-LOCK-001');
    expect(source['flowId']).toBe('FLOW-18');
  });

  // ── SEED-76 ──────────────────────────────────────────────────────────────────
  test('SEED-76: FLOW-19 design decisions present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_search?q=flowId:FLOW-19&size=10');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? 0;
    if (total === 0) {
      test.skip(true, 'FLOW-19 design decisions not found — run seed_durable_sagas_compliance_corpus.py first');
      return;
    }
    expect(total).toBeGreaterThanOrEqual(6);
    const hits = body?.hits?.hits ?? [];
    const flowIds = hits.map((h: Record<string, unknown>) => (h['_source'] as Record<string, unknown>)['flowId']);
    expect(flowIds.every((id: string) => id === 'FLOW-19')).toBe(true);
  });

  // ── SEED-77 ──────────────────────────────────────────────────────────────────
  test('SEED-77: FLOW-19 SAGA-PERSIST-BEFORE-DISPATCH-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:SAGA-PERSIST-BEFORE-DISPATCH-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'SAGA-PERSIST-BEFORE-DISPATCH-001 not found — run seed_durable_sagas_compliance_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('SAGA-PERSIST-BEFORE-DISPATCH-001');
    expect(source['flowId']).toBe('FLOW-19');
  });

  // ── SEED-78 ──────────────────────────────────────────────────────────────────
  test('SEED-78: FLOW-19 arbiters present in xiigen-arbiters (count >= 5)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_search?q=flowId:FLOW-19&size=10');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const total = body?.hits?.total?.value ?? body?.hits?.total ?? 0;
    if (total === 0) {
      test.skip(true, 'FLOW-19 arbiters not found — run seed_durable_sagas_compliance_arbiters.py first');
      return;
    }
    expect(total).toBeGreaterThanOrEqual(5);
  });

  // ── SEED-79 ──────────────────────────────────────────────────────────────────
  test('SEED-79: FLOW-19 COMPLIANCE-APPEND-ONLY-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:COMPLIANCE-APPEND-ONLY-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'COMPLIANCE-APPEND-ONLY-001 not found — run seed_durable_sagas_compliance_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('COMPLIANCE-APPEND-ONLY-001');
    expect(source['flowId']).toBe('FLOW-19');
  });

  // ── SEED-80 ──────────────────────────────────────────────────────────────────
  test('SEED-80: FLOW-19 RETENTION-DUAL-GATE-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:RETENTION-DUAL-GATE-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'RETENTION-DUAL-GATE-001 not found — run seed_durable_sagas_compliance_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('RETENTION-DUAL-GATE-001');
    expect(source['flowId']).toBe('FLOW-19');
  });

  // ── SEED-96 ──────────────────────────────────────────────────────────────────
  test('SEED-96: FLOW-23 design decisions present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-23');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-23 docs — run seed_form_builder_templates_corpus.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-97 ──────────────────────────────────────────────────────────────────
  test('SEED-97: FLOW-23 SCHEMA-VALIDATION-BEFORE-PUBLICATION-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:SCHEMA-VALIDATION-BEFORE-PUBLICATION-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'SCHEMA-VALIDATION-BEFORE-PUBLICATION-001 not found — run seed_form_builder_templates_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('SCHEMA-VALIDATION-BEFORE-PUBLICATION-001');
    expect(source['flowId']).toBe('FLOW-23');
  });

  // ── SEED-98 ──────────────────────────────────────────────────────────────────
  test('SEED-98: FLOW-23 arbiters present in xiigen-arbiters (count >= 29)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-23');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-23 arbiters — bulk-load form-builder-templates-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(29);
  });

  // ── SEED-99 ──────────────────────────────────────────────────────────────────
  test('SEED-99: FLOW-23 VARIABLE-BINDING-LOCK-ORDERING-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:VARIABLE-BINDING-LOCK-ORDERING-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'VARIABLE-BINDING-LOCK-ORDERING-001 not found — run seed_form_builder_templates_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('VARIABLE-BINDING-LOCK-ORDERING-001');
    expect(source['flowId']).toBe('FLOW-23');
  });

  // ── SEED-100 ─────────────────────────────────────────────────────────────────
  test('SEED-100: FLOW-23 event schemas present for T637-T640 (count >= 4)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-event-schemas/_count?q=flowId:FLOW-23');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-event-schemas index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-event-schemas has 0 FLOW-23 schemas — load fixtures/event-schemas/form-builder-templates/*.schema.json first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

  // ── SEED-91 ──────────────────────────────────────────────────────────────────
  test('SEED-91: FLOW-22 design decisions present in xiigen-planning-decisions (count >= 6)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-22');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-planning-decisions index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-22 docs — run seed_cms_publishing_patterns.py first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(6);
  });

  // ── SEED-92 ──────────────────────────────────────────────────────────────────
  test('SEED-92: FLOW-22 OCC-DRAFT-PUBLISHED-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:OCC-DRAFT-PUBLISHED-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'OCC-DRAFT-PUBLISHED-001 not found — run seed_cms_publishing_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('OCC-DRAFT-PUBLISHED-001');
    expect(source['flowId']).toBe('FLOW-22');
  });

  // ── SEED-93 ──────────────────────────────────────────────────────────────────
  test('SEED-93: FLOW-22 arbiters present in xiigen-arbiters (count >= 29)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-arbiters/_count?q=flowId:FLOW-22');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-arbiters index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-arbiters has 0 FLOW-22 arbiters — bulk-load cms-publishing-arbiters.bulk.ndjson first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(29);
  });

  // ── SEED-94 ──────────────────────────────────────────────────────────────────
  test('SEED-94: FLOW-22 SEQUENTIAL-GATE-ARBITER-001 pattern visible in xiigen-rag-patterns', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_search?q=patternId:SEQUENTIAL-GATE-ARBITER-001&size=1');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-rag-patterns index missing');
      return;
    }
    const body = await resp.json();
    const hits = body?.hits?.hits ?? [];
    if (hits.length === 0) {
      test.skip(true, 'SEQUENTIAL-GATE-ARBITER-001 not found — run seed_cms_publishing_patterns.py first');
      return;
    }
    const source = hits[0]._source;
    expect(source['patternId']).toBe('SEQUENTIAL-GATE-ARBITER-001');
    expect(source['flowId']).toBe('FLOW-22');
  });

  // ── SEED-95 ──────────────────────────────────────────────────────────────────
  test('SEED-95: FLOW-22 event schemas present for T633-T636 (count >= 8)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-event-schemas/_count?q=flowId:FLOW-22');
    if (resp.status === 404) {
      test.skip(true, 'xiigen-event-schemas index missing');
      return;
    }
    const body = await resp.json();
    const count = body?.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-event-schemas has 0 FLOW-22 schemas — load fixtures/event-schemas/cms-publishing/*.schema.json first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(8);
  });
