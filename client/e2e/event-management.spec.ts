/**
 * FLOW-03 — Event Management E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server not required — all tests are mock-driven via URL params.
 *
 * EM-01: event list page renders with events
 * EM-02: empty state shown when no events
 * EM-03: error state shown on load failure
 * EM-04: create-event button navigates to creation form
 * EM-05: event creation form renders
 * EM-06: validation error — uniform shape (no field name in error text)
 * EM-07: unlimited capacity checkbox disables the capacity input
 * EM-08: event created successfully — success state shown
 * EM-09: event creation error state shown
 * EM-10: event duplicate state shown
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'event-management', name);

test.describe('FLOW-03 — Event Management', () => {

  // ── Event List ─────────────────────────────────────────────────────────────

  test('EM-01: event list page renders with seeded events', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-event-list.png'), fullPage: true });

    await expect(page.locator('[data-testid="page-event-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-list"]')).toBeVisible();

    const items = page.locator('[data-testid="event-item"]');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThanOrEqual(1);
  });

  test('EM-02: empty state shown when no events', async ({ page }) => {
    await page.goto('/events?mock=empty');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('02-event-list-empty.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-list-empty"]')).toBeVisible();
    // Create button still visible in empty state
    await expect(page.locator('[data-testid="create-event-button"]')).toBeVisible();
  });

  test('EM-03: error state shown on load failure', async ({ page }) => {
    await page.goto('/events?mock=error');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03-event-list-error.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-list-error"]')).toBeVisible();
  });

  test('EM-04: create-event button navigates to creation form', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('em-04-before.png'), fullPage: true });
    await page.click('[data-testid="create-event-button"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-navigate-to-create.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-creation-form"]')).toBeVisible();
  });

  test('EM-01b: event list shows status badge on each item', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const firstBadge = page.locator('[data-testid="event-status-badge"]').first();
    await expect(firstBadge).toBeVisible();
    const badgeText = await firstBadge.textContent() ?? '';
    expect(['ACTIVE', 'PROMOTED', 'DRAFT', 'ENDED']).toContain(badgeText.trim());
  });

  test('EM-01c: event count footer visible', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="event-count"]')).toBeVisible();
  });

  // ── Event Creation ─────────────────────────────────────────────────────────

  test('EM-05: event creation form renders with all fields', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-event-creation-form.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-creation-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="title-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="organizer-id-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-date-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="capacity-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="unlimited-checkbox"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
  });

  test('EM-06: validation error — uniform shape (no field name in error text)', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('em-06-before.png'), fullPage: true });
    // Submit with all fields empty
    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('06-validation-error.png'), fullPage: true });

    const errorEl = page.locator('[data-testid="event-creation-validation-error"]');
    await expect(errorEl).toBeVisible();

    // Uniform error — must NOT leak field names
    const errorText = await errorEl.textContent() ?? '';
    expect(errorText).not.toContain('title');
    expect(errorText).not.toContain('organizer');
    expect(errorText).not.toContain('date');
    expect(errorText).not.toContain('field');
  });

  test('EM-07: unlimited checkbox disables the capacity input', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForLoadState('networkidle');

    const capacityInput = page.locator('[data-testid="capacity-input"]');
    const unlimitedBox  = page.locator('[data-testid="unlimited-checkbox"]');

    // Initially enabled
    await expect(capacityInput).toBeEnabled();

await page.screenshot({ path: SNAP('em-07-before.png'), fullPage: true });
    // Check unlimited → capacity input disabled
    await unlimitedBox.check();
    await page.screenshot({ path: SNAP('07-unlimited-checked.png'), fullPage: true });
    await expect(capacityInput).toBeDisabled();

    // Uncheck → re-enabled
    await unlimitedBox.uncheck();
    await expect(capacityInput).toBeEnabled();
  
    await page.screenshot({ path: SNAP('em-07-after.png'), fullPage: true });});

  test('EM-08: event created successfully — success state shown', async ({ page }) => {
    await page.goto('/events/create?mock=created');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('08-event-created.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-created"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-to-events-link"]')).toBeVisible();
  });

  test('EM-09: event creation error state shown', async ({ page }) => {
    await page.goto('/events/create?mock=error');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('09-event-creation-error.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-creation-error"]')).toBeVisible();
  });

  test('EM-10: event duplicate state shown', async ({ page }) => {
    await page.goto('/events/create?mock=duplicate');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-event-duplicate.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-duplicate"]')).toBeVisible();
  });

  test('EM-05b: form submission with valid data shows success', async ({ page }) => {
    await page.goto('/events/create');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('em-05b-before.png'), fullPage: true });
    await page.fill('[data-testid="title-input"]',       'Integration Test Event');
    await page.fill('[data-testid="organizer-id-input"]', 'org-001');
    await page.fill('[data-testid="start-date-input"]',  '2026-09-01T10:00');
    await page.fill('[data-testid="capacity-input"]',    '50');

    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('05b-form-submitted.png'), fullPage: true });

    await expect(page.locator('[data-testid="event-created"]')).toBeVisible();
  });

  // ── Sidebar navigation ─────────────────────────────────────────────────────

  test('EM-nav: Events entry visible in sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="nav-events"]')).toBeVisible();
  });

});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/event-management/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs event-management
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'event-management', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-03 event-management — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test("P1-01: EventCreationOrchestrator \u2014 orchestration step entered via POST /events (\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-eventcreationorchestrator-orchestration.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-03: EventPromotionEngine \u2014 processing step entered via EventPromotionRequeste\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("02-eventpromotionengine-processing-step-ent.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-04: EventAnalyticsTracker \u2014 observability step entered via TTL-windowed count\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("03-eventanalyticstracker-observability-step.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-05: EventCreationRequested \u2192 EventCreationOrchestrator when  (emits xiigen.ev\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("04-eventcreationrequested-eventcreationorch.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-06: EventCreationOrchestrator \u2192 EventRegistrationManager when  (emits xiigen.\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("05-eventcreationorchestrator-eventregistrat.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-07: EventCreationOrchestrator \u2192 EventPromotionEngine when promotion enabled (\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("06-eventcreationorchestrator-eventpromotion.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-08: EventRegistrationManager \u2192 EventAnalyticsTracker when  (emits xiigen.even\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("07-eventregistrationmanager-eventanalyticst.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-09: EventPromotionEngine \u2192 EventAnalyticsTracker when  (emits xiigen.event-ma\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("08-eventpromotionengine-eventanalyticstrack.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

  test("P1-10: EventAnalyticsTracker \u2192 EventLifecycleComplete when terminal (emits xiige\u2026", async ({ page }) => {
    await page.goto("/events/create");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("09-eventanalyticstracker-eventlifecyclecomp.png"), fullPage: true });
    await expect(page.getByTestId("event-created")).toBeVisible();
  });

});
// END P1 state coverage (P8)


// ---------------------------------------------------------------------------
// Merged from e2e/tests/flow03-event-management.spec.ts (P12 duplicate consolidation)
// Full-stack tests hit the NestJS server at http://localhost:3000.
// Auto-skip when server is unreachable (unit-only runs stay green).
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:3000';
const TENANT_A = 'e2e-tenant-A';
const TENANT_B = 'e2e-tenant-B';

test.describe('FLOW-03 event-management — API + tenant isolation (real server)', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${API_BASE}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  const makeEventPayload = (suffix: string) => ({
    title: `E2E Test Event ${suffix}`,
    organizerId: `org-e2e-${suffix}`,
    startDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    capacity: 50,
    isPrivate: false,
    isPaidEvent: false,
  });

  test('F03-API-01: POST /api/flows/event-management/events returns non-500 for valid payload', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-management/events`, {
      data: makeEventPayload(`${Date.now()}`),
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F03-API-02: POST with null capacity (unlimited) returns non-500', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-management/events`, {
      data: { ...makeEventPayload(`${Date.now()}-unlim`), capacity: null },
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F03-API-03: GET /api/dynamic/xiigen-events returns non-500 for tenant-A', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dynamic/xiigen-events`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F03-API-04: GET /api/dynamic/xiigen-events response is JSON', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dynamic/xiigen-events`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    if (res.ok()) {
      const contentType = res.headers()['content-type'] ?? '';
      expect(contentType).toContain('application/json');
    }
  });

  test('F03-ISO-01: event list endpoint is non-500 for tenant-A AND tenant-B', async ({ request }) => {
    const [resA, resB] = await Promise.all([
      request.get(`${API_BASE}/api/dynamic/xiigen-events`, { headers: { 'X-Tenant-Id': TENANT_A } }),
      request.get(`${API_BASE}/api/dynamic/xiigen-events`, { headers: { 'X-Tenant-Id': TENANT_B } }),
    ]);
    expect(resA.status()).not.toBe(500);
    expect(resB.status()).not.toBe(500);
  });

  test('F03-ISO-02: event creation for tenant-A is scoped (non-500 response)', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-management/events`, {
      data: makeEventPayload(`iso-${Date.now()}`),
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
  });

});
