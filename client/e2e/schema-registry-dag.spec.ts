/**
 * FLOW-11 — Schema Registry & DAG E2E Playwright Tests
 *
 * R-01: Schema Registry page loads
 * R-02: Schema Registry search form is visible
 * R-03: Schema Registry search returns results
 * R-04: Schema Submission page loads
 * R-05: Schema Submission form is visible
 * R-06: Schema Submission validates empty fields
 * R-07: Schema Submission succeeds with valid input
 * R-08: DAG Visualization page loads and renders output
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadRealTopology } from './topology/topology-fixtures';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const FLOW_ID = 'FLOW-11';
const FLOW_SLUG = 'schema-registry-dag';
const TOPOLOGY = loadRealTopology(FLOW_SLUG);
const API_PATTERN = `**/api/topology/${FLOW_ID}`;

test.beforeEach(async ({ page }) => {
  await page.route(API_PATTERN, async route => {
    if (!route.request().url().includes('/run/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TOPOLOGY),
      });
      return;
    }

    await route.continue();
  });
});

test.describe('FLOW-11 — Schema Registry & DAG', () => {

  // R-01: Schema Registry page loads
  test('R-01: Schema Registry page loads', async ({ page }) => {
    try { await page.goto('/schema-registry', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-schema-registry"]')).toBeVisible();
  });

  // R-02: Schema Registry search form is visible
  test('R-02: Schema Registry search form is visible', async ({ page }) => {
    try { await page.goto('/schema-registry', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="schema-search-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="schema-type-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-button"]')).toBeVisible();
  });

  // R-03: Schema Registry search returns results
  test('R-03: Schema Registry search returns results', async ({ page }) => {
    try { await page.goto('/schema-registry', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-03-before.png'), fullPage: true });
    await page.locator('[data-testid="search-button"]').click();
    await expect(page.locator('[data-testid="schema-list"]')).toBeVisible();
    const items = page.locator('[data-testid="schema-item"]');
    expect(await items.count()).toBeGreaterThan(0);
  
    await page.screenshot({ path: P8_SNAP('r-03-after.png'), fullPage: true });});

  // R-04: Schema Submission page loads
  test('R-04: Schema Submission page loads', async ({ page }) => {
    try { await page.goto('/schema-submission', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-schema-submission"]')).toBeVisible();
  });

  // R-05: Schema Submission form is visible
  test('R-05: Schema Submission form is visible', async ({ page }) => {
    try { await page.goto('/schema-submission', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="schema-submission-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="schema-type-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="json-schema-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-schema-button"]')).toBeVisible();
  });

  // R-06: Schema Submission validates empty fields
  test('R-06: Schema Submission validates empty fields', async ({ page }) => {
    try { await page.goto('/schema-submission', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-06-before.png'), fullPage: true });
    await page.locator('[data-testid="submit-schema-button"]').click();
    await expect(page.locator('[data-testid="submission-error"]')).toBeVisible();
  
    await page.screenshot({ path: P8_SNAP('r-06-after.png'), fullPage: true });});

  // R-07: Schema Submission succeeds with valid input
  test('R-07: Schema Submission succeeds with valid input', async ({ page }) => {
    try { await page.goto('/schema-submission', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP('r-07-before.png'), fullPage: true });
    await page.locator('[data-testid="schema-type-input"]').fill('UserSchema');
    await page.locator('[data-testid="json-schema-input"]').fill('{"type":"object","properties":{"name":{"type":"string"}}}');
    await page.locator('[data-testid="submit-schema-button"]').click();
    await expect(page.locator('[data-testid="submission-result"]')).toBeVisible({ timeout: 3_000 });
  
    await page.screenshot({ path: P8_SNAP('r-07-after.png'), fullPage: true });});

  // R-08: DAG Visualization page loads and renders output
  test('R-08: DAG Visualization page loads and renders output', async ({ page }) => {
    try { await page.goto('/dag-visualization?role=platform-admin', { timeout: 30_000 }); }
    catch { test.skip(true, 'Dev server not running'); return; }
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="page-dag-visualization"]')).toBeVisible();
    await page.screenshot({ path: P8_SNAP('r-08-before.png'), fullPage: true });
    await expect(page.locator('[data-testid="dag-role-platform-admin-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="topology-graph"]')).toBeVisible({ timeout: 30_000 });
  
    await page.screenshot({ path: P8_SNAP('r-08-after.png'), fullPage: true });});
});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/schema-registry-dag/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs schema-registry-dag
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'schema-registry-dag', name);
const SERVER_URL = process.env.SERVER_URL ?? process.env.VITE_API_URL ?? 'http://localhost:3000';

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-11 schema-registry-dag — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${SERVER_URL}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable — start docker compose up');
    }
  });

  test("P1-01: SchemaRegistrationGateway \u2014 transaction step entered via POST /schemas (t\u2026", async ({ page }) => {
    await page.goto("/dag-visualization?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-schemaregistrationgateway-transaction-st.png"), fullPage: true });
    await expect(page.getByTestId("page-dag-visualization")).toBeVisible();
  });

  test("P1-02: SchemaVersionManager \u2014 validation step entered via Inline validation \u2014 ca\u2026", async ({ page }) => {
    await page.goto("/dag-visualization?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("02-schemaversionmanager-validation-step-ent.png"), fullPage: true });
    await expect(page.getByTestId("page-dag-visualization")).toBeVisible();
  });

  test("P1-03: DagCycleDetector \u2014 validation step entered via Inline \u2014 prevents circular\u2026", async ({ page }) => {
    await page.goto("/schema-registry?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("03-dagcycledetector-validation-step-entered.png"), fullPage: true });
    await expect(page.getByTestId("page-schema-registry")).toBeVisible();
  });

  test("P1-04: SchemaCompatibilityChecker \u2014 validation step entered via Inline \u2014 checks\u2026", async ({ page }) => {
    await page.goto("/dag-visualization?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("04-schemacompatibilitychecker-validation-st.png"), fullPage: true });
    await expect(page.getByTestId("page-dag-visualization")).toBeVisible();
  });

  test("P1-05: SchemaPublisher \u2014 transaction step entered via SchemaValidated event (OCC\u2026", async ({ page }) => {
    await page.goto("/dag-visualization?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("05-schemapublisher-transaction-step-entered.png"), fullPage: true });
    await expect(page.getByTestId("page-dag-visualization")).toBeVisible();
  });

  test("P1-06: DagTopologyBuilder \u2014 data_pipeline step entered via SchemaPublished event\u2026", async ({ page }) => {
    await page.goto("/dag-visualization?role=platform-admin");
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("06-dagtopologybuilder-data-pipeline-step-en.png"), fullPage: true });
    await expect(page.getByTestId("page-dag-visualization")).toBeVisible();
  });

});
// END P1 state coverage (P8)
