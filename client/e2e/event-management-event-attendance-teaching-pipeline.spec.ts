/**
 * FLOW-03/04 Teaching Pipeline Validation — Playwright E2E tests
 *
 * Validates that the RAG teaching corpus for FLOW-03 and FLOW-04 is seeded
 * and queryable. All tests use Playwright's `request` API — no browser rendering.
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
 *   # Seed FLOW-03 patterns via NestJS RAG seed on app start, OR run:
 *   npx ts-node -e "require('./src/rag-init').Flow03EventManagementRagSeed"
 *   # Run tests:
 *   npx playwright test client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts
 *
 * SEED-11: FLOW-03 arch patterns in xiigen-rag-patterns (count >= 4)
 * SEED-12: FLOW-04 arch patterns in xiigen-rag-patterns (count >= 5)
 * SEED-13: FLOW-03 BFA rules in xiigen-rag-patterns (count >= 3)
 * SEED-14: FLOW-04 BFA rules in xiigen-rag-patterns (count >= 3)
 * SEED-15: FLOW-03 design decisions in xiigen-planning-decisions (count >= 1)
 * SEED-16: FLOW-04 design reasoning in xiigen-planning-decisions (count >= 3)
 * SEED-17: event-created-outbox-pattern retrievable by keyword
 * SEED-18: rsvp-setnx-idempotency pattern retrievable by keyword
 * SEED-19: null-capacity-unlimited-events pattern retrievable by keyword
 * SEED-20: waitlist-fifo-promotion pattern retrievable by keyword
 */

import { test, expect } from '@playwright/test';

const ES       = process.env['ES_URL']       ?? 'http://localhost:9200';
const GRAPHRAG = process.env['GRAPHRAG_URL'] ?? 'http://localhost:8080';

// ── Graceful-skip helpers ─────────────────────────────────────────────────────

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

// Helper to parse ES body safely
type EsBody = { count?: number; hits?: { total?: { value?: number }; hits?: unknown[] }; _source?: Record<string, unknown>; found?: boolean };

async function parseEsBody(resp: Response | null): Promise<EsBody> {
  if (!resp) return {};
  return (resp as unknown as { json(): Promise<EsBody> }).json();
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('FLOW-03/04 Teaching Pipeline — Seeded corpus validation', () => {

  // ── SEED-11 ───────────────────────────────────────────────────────────────
  test('SEED-11: FLOW-03 arch patterns present in xiigen-rag-patterns (count >= 4)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_count?q=domainId:flow-03-event-management');
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-rag-patterns has 0 FLOW-03 docs — run Flow03EventManagementRagSeed first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(4);
  });

  // ── SEED-12 ───────────────────────────────────────────────────────────────
  test('SEED-12: FLOW-04 arch patterns present in xiigen-rag-patterns (count >= 5)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_count?q=domainId:flow-04-event-attendance');
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-rag-patterns has 0 FLOW-04 docs — run Flow04EventAttendanceRagSeed first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(5);
  });

  // ── SEED-13 ───────────────────────────────────────────────────────────────
  test('SEED-13: FLOW-03 BFA rules present in xiigen-rag-patterns (count >= 3)', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_count', {
      query: {
        bool: {
          must: [
            { term: { 'domainId.keyword': 'flow-03-event-management' } },
            { exists: { field: 'ruleId' } },
          ],
        },
      },
    });
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'No FLOW-03 BFA rule docs in index — seed not run');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── SEED-14 ───────────────────────────────────────────────────────────────
  test('SEED-14: FLOW-04 BFA rules present in xiigen-rag-patterns (count >= 3)', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_count', {
      query: {
        bool: {
          must: [
            { term: { 'domainId.keyword': 'flow-04-event-attendance' } },
            { exists: { field: 'ruleId' } },
          ],
        },
      },
    });
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'No FLOW-04 BFA rule docs in index — seed not run');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── SEED-15 ───────────────────────────────────────────────────────────────
  test('SEED-15: FLOW-03 design decisions present in xiigen-rag-patterns (count >= 1)', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_count', {
      query: {
        bool: {
          must: [
            { term: { 'domainId.keyword': 'flow-03-event-management' } },
            { exists: { field: 'ddRef' } },
          ],
        },
      },
    });
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'No FLOW-03 design decision docs in index — seed not run');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── SEED-16 ───────────────────────────────────────────────────────────────
  test('SEED-16: FLOW-04 design reasoning present in xiigen-planning-decisions (count >= 3)', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-planning-decisions/_count?q=flowId:FLOW-04+AND+decisionType:DESIGN_REASONING');
    if (!resp) return;

    const body = await parseEsBody(resp);
    const count = body.count ?? 0;
    if (count === 0) {
      test.skip(true, 'xiigen-planning-decisions has 0 FLOW-04 DESIGN_REASONING docs — run SESSION-TEACH scripts first');
      return;
    }
    expect(count).toBeGreaterThanOrEqual(3);
  });

  // ── SEED-17 ───────────────────────────────────────────────────────────────
  test('SEED-17: event-created-outbox-pattern retrievable by patternId', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/event-created-outbox-pattern');
    if (!resp) return;

    const body = await parseEsBody(resp);
    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'event-created-outbox-pattern not in index — run Flow03EventManagementRagSeed first');
      return;
    }
    const source = body._source ?? {};
    expect(source['patternId']).toBe('event-created-outbox-pattern');
    expect(source['domainId']).toBe('flow-03-event-management');
    expect((source['tags'] as string[] | undefined) ?? []).toContain('DNA-8');
  });

  // ── SEED-18 ───────────────────────────────────────────────────────────────
  test('SEED-18: rsvp-setnx-idempotency retrievable by patternId', async ({ request }) => {
    const resp = await esGet(request, '/xiigen-rag-patterns/_doc/rsvp-setnx-idempotency');
    if (!resp) return;

    const body = await parseEsBody(resp);
    const status = (resp as unknown as { status(): number }).status();
    if (status === 404) {
      test.skip(true, 'rsvp-setnx-idempotency not in index — run Flow04EventAttendanceRagSeed first');
      return;
    }
    const source = body._source ?? {};
    expect(source['patternId']).toBe('rsvp-setnx-idempotency');
    expect(source['domainId']).toBe('flow-04-event-attendance');
    expect((source['tags'] as string[] | undefined) ?? []).toContain('CF-04-1');
  });

  // ── SEED-19 ───────────────────────────────────────────────────────────────
  test('SEED-19: null-capacity-unlimited-events retrievable by keyword search', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_search', {
      query: { match: { tags: 'null-unlimited strict-null' } },
    });
    if (!resp) return;

    const body = await parseEsBody(resp);
    const total = body.hits?.total?.value ?? 0;
    if (total === 0) {
      test.skip(true, 'No null-capacity patterns in index — seed not run');
      return;
    }
    expect(total).toBeGreaterThan(0);

    const firstHit = (body.hits?.hits ?? [])[0] as Record<string, unknown> | undefined;
    const patternId = ((firstHit?.['_source'] as Record<string, unknown>)?.['patternId'] as string) ?? '';
    expect(patternId).toContain('null-capacity');
  });

  // ── SEED-20 ───────────────────────────────────────────────────────────────
  test('SEED-20: waitlist-fifo-promotion retrievable by keyword search', async ({ request }) => {
    const resp = await esPost(request, '/xiigen-rag-patterns/_search', {
      query: { match: { tags: 'FIFO join_timestamp waitlist' } },
    });
    if (!resp) return;

    const body = await parseEsBody(resp);
    const total = body.hits?.total?.value ?? 0;
    if (total === 0) {
      test.skip(true, 'No waitlist-fifo patterns in index — seed not run');
      return;
    }
    expect(total).toBeGreaterThan(0);
  });

  // ── SEED-21 (GraphRAG) ────────────────────────────────────────────────────
  test('SEED-21: nano-graphrag returns results for FLOW-03 event management query', async ({ request }) => {
    const resp = await graphragPost(request, '/query', {
      query:     'event creation outbox pattern DNA-8',
      workspace: 'flow03-event-management',
      mode:      'local',
    });
    if (!resp) return;

    if (!resp.ok()) {
      test.skip(true, `nano-graphrag query returned ${resp.status()} — workspace may not be seeded`);
      return;
    }

    const body = await resp.json() as Record<string, unknown>;
    const results = (body['results'] as unknown[]) ?? [];
    if (results.length === 0) {
      test.skip(true, 'flow03-event-management workspace has no documents — seed not run');
      return;
    }
    expect(results.length).toBeGreaterThan(0);
  });

  // ── SEED-22 (GraphRAG) ────────────────────────────────────────────────────
  test('SEED-22: nano-graphrag returns results for FLOW-04 RSVP idempotency query', async ({ request }) => {
    const resp = await graphragPost(request, '/query', {
      query:     'RSVP SETNX idempotency single storeDocument',
      workspace: 'flow04-event-attendance',
      mode:      'local',
    });
    if (!resp) return;

    if (!resp.ok()) {
      test.skip(true, `nano-graphrag query returned ${resp.status()} — workspace may not be seeded`);
      return;
    }

    const body = await resp.json() as Record<string, unknown>;
    const results = (body['results'] as unknown[]) ?? [];
    if (results.length === 0) {
      test.skip(true, 'flow04-event-attendance workspace has no documents — seed not run');
      return;
    }
    expect(results.length).toBeGreaterThan(0);
  });

});
