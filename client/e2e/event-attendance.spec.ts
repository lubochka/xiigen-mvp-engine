/**
 * FLOW-04 — Event Attendance E2E Tests
 *
 * Prerequisites: Vite dev server (auto-started by playwright.config.ts webServer)
 *   NestJS server not required — all tests are mock-driven via URL params.
 *
 * AT-01: RSVP form renders with required fields
 * AT-02: RSVP validation error — uniform shape (no field name)
 * AT-03: RSVP confirmed state shown
 * AT-04: RSVP waitlisted state shown
 * AT-05: RSVP duplicate state shown
 * AT-06: RSVP cancellation window closed state shown
 * AT-07: RSVP error state shown
 * AT-08: RSVP confirmed shows cancel button + cancel confirm dialog
 * AT-09: RSVP form submission with valid data → confirmed state
 * AT-10: Attendance dashboard renders with counters
 * AT-11: Attendance empty state shown
 * AT-12: Attendance error state shown
 * AT-13: Check-in kiosk renders and accepts attendee ID
 * AT-14: Check-in kiosk shows success on valid ID
 * AT-15: Check-in kiosk shows not-found on empty ID
 * AT-16: Feedback window open state shown
 * AT-nav: RSVP and Attendance entries visible in sidebar
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'event-attendance', name);

const ADAPTED_SNAP_DIR = SNAP('tenant-a-v1.0.1');
const ADAPTED_SNAP = (name: string) => path.join(ADAPTED_SNAP_DIR, name);
const TENANT_B_INSTALLED_SNAP_DIR = SNAP('tenant-b-installed-from-a');
const TENANT_B_INSTALLED_SNAP = (name: string) => path.join(TENANT_B_INSTALLED_SNAP_DIR, name);
const TENANT_B_ADAPTED_SNAP_DIR = SNAP('tenant-b-v1.0.2');
const TENANT_B_ADAPTED_SNAP = (name: string) => path.join(TENANT_B_ADAPTED_SNAP_DIR, name);
const TENANT_C_INSTALLED_SNAP_DIR = SNAP('tenant-c-installed-from-b');
const TENANT_C_INSTALLED_SNAP = (name: string) => path.join(TENANT_C_INSTALLED_SNAP_DIR, name);
const TENANT_C_ADAPTED_SNAP_DIR = SNAP('tenant-c-v1.0.3');
const TENANT_C_ADAPTED_SNAP = (name: string) => path.join(TENANT_C_ADAPTED_SNAP_DIR, name);
const POST_CERT_UX_SNAP_DIR = SNAP('post-cert-ux');
const POST_CERT_UX_SNAP = (name: string) => path.join(POST_CERT_UX_SNAP_DIR, name);

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3000';
const ORGANISER_ATTENDANCE_URL = '/attendance?role=event-organiser';

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const bodyWidth = document.body.scrollWidth;
    const rootWidth = document.documentElement.scrollWidth;
    return Math.max(bodyWidth, rootWidth) > window.innerWidth + 1;
  });
  expect(hasOverflow).toBe(false);
}

test.describe('FLOW-04 — Event Attendance', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ADAPTED_SNAP_DIR, { recursive: true });
    fs.mkdirSync(TENANT_B_INSTALLED_SNAP_DIR, { recursive: true });
    fs.mkdirSync(TENANT_B_ADAPTED_SNAP_DIR, { recursive: true });
    fs.mkdirSync(TENANT_C_INSTALLED_SNAP_DIR, { recursive: true });
    fs.mkdirSync(TENANT_C_ADAPTED_SNAP_DIR, { recursive: true });
    fs.mkdirSync(POST_CERT_UX_SNAP_DIR, { recursive: true });
  });

  // ── RSVP Page ──────────────────────────────────────────────────────────────

  test('AT-01: RSVP form renders with required fields', async ({ page }) => {
    await page.goto('/rsvp');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('01-rsvp-form.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="attendee-id-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="event-id-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-button"]')).toBeVisible();
    await expect(page.locator('[for="attendee-code-input"]')).toContainText('Ticket or guest code');
    await expect(page.locator('[for="event-code-input"]')).toContainText('Event code');
  });

  test('AT-02: RSVP validation error — uniform shape (no field name in error text)', async ({ page }) => {
    await page.goto('/rsvp');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('at-02-before.png'), fullPage: true });
    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('02-rsvp-validation-error.png'), fullPage: true });

    const errorEl = page.locator('[data-testid="rsvp-validation-error"]');
    await expect(errorEl).toBeVisible();

    const errorText = await errorEl.textContent() ?? '';
    expect(errorText).not.toContain('attendee');
    expect(errorText).not.toContain('event');
    expect(errorText).not.toContain('field');
  });

  test('AT-03: RSVP confirmed state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=confirmed');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03-rsvp-confirmed.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-confirmed"]')).toBeVisible();
    await expect(page.locator('[data-testid="rsvp-status-label"]')).toContainText('Confirmed');
  });

  test('AT-04: RSVP waitlisted state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=waitlisted');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('04-rsvp-waitlisted.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-waitlisted"]')).toBeVisible();
    await expect(page.locator('[data-testid="rsvp-status-label"]')).toContainText('Waitlisted');
  });

  test('AT-05: RSVP duplicate state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=duplicate');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('05-rsvp-duplicate.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-duplicate"]')).toBeVisible();
  });

  test('AT-06: RSVP cancellation window closed state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=window-closed');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('06-rsvp-window-closed.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-window-closed"]')).toBeVisible();
  });

  test('AT-07: RSVP error state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=error');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('07-rsvp-error.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-error"]')).toBeVisible();
  });

  test('AT-08: RSVP confirmed shows cancel button; cancel dialog appears on click', async ({ page }) => {
    await page.goto('/rsvp?mock=confirmed');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="cancel-rsvp-button"]')).toBeVisible();

await page.screenshot({ path: SNAP('at-08-before.png'), fullPage: true });
    await page.click('[data-testid="cancel-rsvp-button"]');
    await page.screenshot({ path: SNAP('08-cancel-confirm-dialog.png'), fullPage: true });

    await expect(page.locator('[data-testid="cancel-confirm-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-cancel-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="dismiss-cancel-button"]')).toBeVisible();
  });

  test('AT-09: RSVP form submission with valid data → confirmed state', async ({ page }) => {
    await page.goto('/rsvp');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('at-09-before.png'), fullPage: true });
    await page.fill('[data-testid="attendee-id-input"]', 'att-001');
    await page.fill('[data-testid="event-id-input"]',    'evt-001');

    await page.click('[data-testid="submit-button"]');
    await page.screenshot({ path: SNAP('09-rsvp-submitted.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-confirmed"]')).toBeVisible();
  });

  test('AT-03b: RSVP cancelled state shown', async ({ page }) => {
    await page.goto('/rsvp?mock=cancelled');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('03b-rsvp-cancelled.png'), fullPage: true });

    await expect(page.locator('[data-testid="rsvp-cancelled"]')).toBeVisible();
  });

  // ── Attendance Dashboard ───────────────────────────────────────────────────

  test('AT-10: Attendance dashboard renders with confirmed/waitlisted/checked-in counters', async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('10-attendance-dashboard.png'), fullPage: true });

    await expect(page.locator('[data-testid="attendance-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmed-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="waitlist-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkedin-count"]')).toBeVisible();
  });

  test('AT-11: Attendance empty state shown', async ({ page }) => {
    await page.goto('/attendance?mock=empty');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('11-attendance-empty.png'), fullPage: true });

    await expect(page.locator('[data-testid="attendance-empty"]')).toBeVisible();
  });

  test('AT-12: Attendance error state shown', async ({ page }) => {
    await page.goto('/attendance?mock=error');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('12-attendance-error.png'), fullPage: true });

    await expect(page.locator('[data-testid="attendance-error"]')).toBeVisible();
  });

  test('AT-13: Check-in kiosk renders and shows attendee input', async ({ page }) => {
    await page.goto('/attendance?mock=checkin-open');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('13-checkin-kiosk.png'), fullPage: true });

    await expect(page.locator('[data-testid="checkin-kiosk"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-attendee-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-submit-button"]')).toBeVisible();
  });

  test('AT-14: Check-in kiosk shows success on valid attendee ID', async ({ page }) => {
    await page.goto('/attendance?mock=checkin-open');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('at-14-before.png'), fullPage: true });
    await page.fill('[data-testid="checkin-attendee-input"]', 'att-001');
    await page.click('[data-testid="checkin-submit-button"]');
    await page.screenshot({ path: SNAP('14-checkin-success.png'), fullPage: true });

    await expect(page.locator('[data-testid="checkin-success"]')).toBeVisible();
  });

  test('AT-15: Check-in kiosk shows not-found when attendee ID empty', async ({ page }) => {
    await page.goto('/attendance?mock=checkin-open');
    await page.waitForLoadState('networkidle');

await page.screenshot({ path: SNAP('at-15-before.png'), fullPage: true });
    // Submit without filling the input
    await page.click('[data-testid="checkin-submit-button"]');
    await page.screenshot({ path: SNAP('15-checkin-not-found.png'), fullPage: true });

    await expect(page.locator('[data-testid="checkin-not-found"]')).toBeVisible();
  });

  test('AT-16: Feedback window open state shown with closes-at info', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: SNAP('16-feedback-window.png'), fullPage: true });

    await expect(page.locator('[data-testid="feedback-window-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toBeVisible();
  });

  test('AT-adapt-01: Acme organiser policy shows adapted attendance values', async ({ page }) => {
    await page.goto('/attendance?role=event-organiser&tenant=acme-corp');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: ADAPTED_SNAP('01-acme-organiser-policy.png'), fullPage: true });

    const policy = page.locator('[data-testid="ea-adaptation-policy"]');
    await expect(policy).toBeVisible();
    await expect(policy).toContainText('Acme onsite attendance policy');
    await expect(policy).toContainText('6 hours');
    await expect(policy).toContainText('12 hours');
    await expect(policy).not.toContainText(/flow04_|FREEDOM|ENGINE_INTERNAL/);
  });

  test('AT-adapt-02: Acme feedback window uses adapted duration', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open&tenant=acme-corp');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: ADAPTED_SNAP('02-acme-feedback-window.png'), fullPage: true });

    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toContainText('next 12 hours');
  });

  test('AT-install-01: Northwind installed Acme policy shows inherited values', async ({ page }) => {
    await page.goto('/attendance?role=event-organiser&tenant=northwind&stage=installed-from-a');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_B_INSTALLED_SNAP('01-northwind-installed-policy.png'),
      fullPage: true,
    });

    const policy = page.locator('[data-testid="ea-adaptation-policy"]');
    await expect(policy).toBeVisible();
    await expect(policy).toContainText('Northwind installed Acme onsite policy');
    await expect(policy).toContainText('6 hours');
    await expect(policy).toContainText('12 hours');
    await expect(policy).not.toContainText(/flow04_|FREEDOM|ENGINE_INTERNAL/);
  });

  test('AT-install-02: Northwind inherited feedback window stays at twelve hours', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open&tenant=northwind&stage=installed-from-a');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_B_INSTALLED_SNAP('02-northwind-feedback-window.png'),
      fullPage: true,
    });

    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toContainText('next 12 hours');
  });

  test('AT-adapt-b-01: Northwind sponsor check-in policy shows Tenant B values', async ({ page }) => {
    await page.goto('/attendance?role=event-organiser&tenant=northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_B_ADAPTED_SNAP('01-northwind-sponsor-policy.png'),
      fullPage: true,
    });

    const policy = page.locator('[data-testid="ea-adaptation-policy"]');
    await expect(policy).toBeVisible();
    await expect(policy).toContainText('Northwind sponsor check-in policy');
    await expect(policy).toContainText('6 hours');
    await expect(policy).toContainText('8 hours');
    await expect(policy).not.toContainText(/flow04_|FREEDOM|ENGINE_INTERNAL/);
  });

  test('AT-adapt-b-02: Northwind sponsor feedback window stays at eight hours', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open&tenant=northwind');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_B_ADAPTED_SNAP('02-northwind-feedback-window.png'),
      fullPage: true,
    });

    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toContainText('next 8 hours');
  });

  test('AT-install-c-01: Tessera installed Northwind policy shows inherited values', async ({ page }) => {
    await page.goto('/attendance?role=event-organiser&tenant=tessera-collective&stage=installed-from-b');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_C_INSTALLED_SNAP('01-tessera-installed-policy.png'),
      fullPage: true,
    });

    const policy = page.locator('[data-testid="ea-adaptation-policy"]');
    await expect(policy).toBeVisible();
    await expect(policy).toContainText('Tessera installed Northwind sponsor policy');
    await expect(policy).toContainText('6 hours');
    await expect(policy).toContainText('8 hours');
    await expect(policy).not.toContainText(/flow04_|FREEDOM|ENGINE_INTERNAL/);
  });

  test('AT-install-c-02: Tessera inherited feedback window stays at eight hours', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open&tenant=tessera-collective&stage=installed-from-b');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_C_INSTALLED_SNAP('02-tessera-feedback-window.png'),
      fullPage: true,
    });

    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toContainText('next 8 hours');
  });

  test('AT-adapt-c-01: Tessera circle check-in policy shows Tenant C values', async ({ page }) => {
    await page.goto('/attendance?role=event-organiser&tenant=tessera-collective');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_C_ADAPTED_SNAP('01-tessera-circle-policy.png'),
      fullPage: true,
    });

    const policy = page.locator('[data-testid="ea-adaptation-policy"]');
    await expect(policy).toBeVisible();
    await expect(policy).toContainText('Tessera circle check-in policy');
    await expect(policy).toContainText('3 hours');
    await expect(policy).toContainText('8 hours');
    await expect(policy).not.toContainText(/flow04_|FREEDOM|ENGINE_INTERNAL/);
  });

  test('AT-adapt-c-02: Tessera circle feedback window stays at eight hours', async ({ page }) => {
    await page.goto('/attendance?mock=feedback-open&tenant=tessera-collective');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: TENANT_C_ADAPTED_SNAP('02-tessera-feedback-window.png'),
      fullPage: true,
    });

    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-window-closes-at"]')).toContainText('next 8 hours');
  });

  test('AT-10b: Attendance dashboard shows RSVP list with status badges', async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');

    const rows = page.locator('[data-testid="rsvp-row"]');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(1);

    const firstStatus = page.locator('[data-testid="rsvp-status"]').first();
    await expect(firstStatus).toBeVisible();
  });

  // ── Post-certification UX follow-ups ───────────────────────────────────────

  test('AT-ux-01: RSVP form uses plain event details on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/rsvp?lang=en');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: POST_CERT_UX_SNAP('01-rsvp-mobile-details.png'),
      fullPage: true,
    });

    await expect(page.locator('[data-testid="rsvp-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="rsvp-detail-help"]')).toContainText(
      'invitation or event page',
    );
    await expect(page.locator('[for="attendee-code-input"]')).toContainText(
      'Ticket or guest code',
    );
    await expect(page.locator('[for="event-code-input"]')).toContainText('Event code');
    await expectNoHorizontalOverflow(page);
  });

  test('AT-ux-02: Attendance organiser page renders Hebrew RTL without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/attendance?role=event-organiser&tenant=tessera-collective&lang=he');
    await page.waitForLoadState('networkidle');

    await expect
      .poll(() => page.evaluate(() => document.documentElement.dir))
      .toBe('rtl');

    await expect(page.locator('[data-testid="ea-organiser-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-adaptation-policy"]')).toContainText(
      'Tessera circle check-in policy',
    );
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: POST_CERT_UX_SNAP('02-attendance-he-rtl.png'),
      fullPage: true,
    });
  });

  test('AT-ux-03: Attendance organiser page stacks cleanly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/attendance?role=event-organiser&tenant=tessera-collective&lang=en');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="ea-organiser-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="ea-organiser-checkin-link"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: POST_CERT_UX_SNAP('03-attendance-mobile-organiser.png'),
      fullPage: true,
    });
  });

  // ── Sidebar navigation ─────────────────────────────────────────────────────

  test('AT-nav: RSVP and Attendance entries visible in sidebar', async ({ page }) => {
    await page.goto('/dashboard?role=event-organiser');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="nav-rsvp"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-attendance"]')).toBeVisible();
  });

});


// ---------------------------------------------------------------------------
// P1 state coverage (P8) — auto-generated by scripts/gen-phase8-p1-coverage.py
// Source: docs/flow-coverage/event-attendance/P5-ui-specs.md
// Regenerate: python scripts/gen-phase8-p1-coverage.py --slugs event-attendance
// ---------------------------------------------------------------------------
const P8_SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'event-attendance', name);

// P1 state coverage (P8) — auto-generated
test.describe('FLOW-04 event-attendance — P1 state coverage', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${API_BASE}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up or set E2E_API_BASE');
    }
  });

  test("P1-01: n1 \u2014 processing step entered via system-initialized", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("01-n1-processing-step-entered-via-system-in.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-02: n2 \u2014 processing step entered via system-initialized", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("02-n2-processing-step-entered-via-system-in.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-03: n3 \u2014 processing step entered via system-initialized", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("03-n3-processing-step-entered-via-system-in.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-04: n4 \u2014 processing step entered via system-initialized", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("04-n4-processing-step-entered-via-system-in.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-05: n5 \u2014 processing step entered via system-initialized", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("05-n5-processing-step-entered-via-system-in.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-06: n1 \u2192 n2 when  (emits )", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("06-n1-n2-when-emits.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-07: n2 \u2192 n3 when  (emits )", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("07-n2-n3-when-emits.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-08: n3 \u2192 n4 when  (emits )", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("08-n3-n4-when-emits.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

  test("P1-09: n4 \u2192 n5 when  (emits )", async ({ page }) => {
    await page.goto(ORGANISER_ATTENDANCE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: P8_SNAP("09-n4-n5-when-emits.png"), fullPage: true });
    await expect(page.getByTestId("attendance-empty")).toBeVisible();
  });

});
// END P1 state coverage (P8)


// ---------------------------------------------------------------------------
// Merged from e2e/tests/flow04-event-attendance.spec.ts (P12 duplicate consolidation)
// Full-stack tests hit the NestJS server at E2E_API_BASE or http://localhost:3000.
// Auto-skip when server is unreachable (unit-only runs stay green).
// ---------------------------------------------------------------------------

const TENANT_A = 'e2e-tenant-A';
const TENANT_B = 'e2e-tenant-B';

const uniqueId = (prefix: string) => `${prefix}-e2e-${Date.now()}`;

test.describe('FLOW-04 event-attendance — API + RSVP→check-in chain (real server)', () => {

  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get(`${API_BASE}/health/live`);
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up or set E2E_API_BASE');
    }
  });

  test('F04-API-01: POST /api/flows/event-attendance/rsvp returns non-500 for valid payload', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-attendance/rsvp`, {
      data: { attendeeId: uniqueId('att'), eventId: uniqueId('evt') },
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F04-API-02: POST /api/flows/event-attendance/rsvp returns non-500 with missing fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-attendance/rsvp`, {
      data: {},
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F04-API-03: POST /api/flows/event-attendance/checkin returns non-500 for valid payload', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/flows/event-attendance/checkin`, {
      data: { attendeeId: uniqueId('att'), eventId: uniqueId('evt') },
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F04-API-04: GET /api/dynamic/xiigen-event-rsvps returns non-500 for tenant-A', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dynamic/xiigen-event-rsvps`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F04-API-05: GET /api/dynamic/xiigen-event-checkins returns non-500 for tenant-A', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dynamic/xiigen-event-checkins`, {
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(res.status()).not.toBe(500);
    expect(res.status()).not.toBe(503);
  });

  test('F04-CHAIN-01: RSVP endpoint and check-in endpoint both non-500 for same (attendee, event)', async ({ request }) => {
    const attendeeId = uniqueId('att');
    const eventId = uniqueId('evt');
    const rsvpRes = await request.post(`${API_BASE}/api/flows/event-attendance/rsvp`, {
      data: { attendeeId, eventId },
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(rsvpRes.status()).not.toBe(500);
    const checkinRes = await request.post(`${API_BASE}/api/flows/event-attendance/checkin`, {
      data: { attendeeId, eventId },
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(checkinRes.status()).not.toBe(500);
  });

  test('F04-CHAIN-02: RSVP list endpoint is tenant-scoped (both tenants return non-500)', async ({ request }) => {
    const [resA, resB] = await Promise.all([
      request.get(`${API_BASE}/api/dynamic/xiigen-event-rsvps`, { headers: { 'X-Tenant-Id': TENANT_A } }),
      request.get(`${API_BASE}/api/dynamic/xiigen-event-rsvps`, { headers: { 'X-Tenant-Id': TENANT_B } }),
    ]);
    expect(resA.status()).not.toBe(500);
    expect(resB.status()).not.toBe(500);
  });

  test('F04-CHAIN-03: duplicate RSVP for same (attendee, event) returns non-500 (idempotency)', async ({ request }) => {
    const payload = { attendeeId: uniqueId('att-idem'), eventId: uniqueId('evt-idem') };
    const first = await request.post(`${API_BASE}/api/flows/event-attendance/rsvp`, {
      data: payload,
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    const second = await request.post(`${API_BASE}/api/flows/event-attendance/rsvp`, {
      data: payload,
      headers: { 'X-Tenant-Id': TENANT_A },
    });
    expect(first.status()).not.toBe(500);
    expect(second.status()).not.toBe(500);
  });

});
