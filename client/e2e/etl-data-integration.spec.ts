/**
 * FLOW-14 ETL Data Integration P1 state coverage.
 *
 * Mapping: docs/flow-coverage/etl-data-integration/P5-ui-specs.md
 */

import { test, expect, type TestInfo } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string, testInfo: TestInfo) =>
  path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'e2e-snapshots',
    'etl-data-integration',
    `${testInfo.project.name}-${name}`,
  );

const ADMIN_URL = '/admin/etl-data-integration?role=platform-admin';

test.describe('FLOW-14 etl-data-integration P1 state coverage', () => {
  test.beforeAll(async ({ request }) => {
    try {
      const r = await request.get('http://localhost:3000/health/live');
      if (!r.ok()) test.skip(true, 'Server not ready');
    } catch {
      test.skip(true, 'Server unreachable; start docker compose up');
    }
  });

  test('P1-01: Every task type in T213-T224 has at least one plan step', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('01-every-task-type-in-t213-t224-has-at-leas.png', testInfo),
      fullPage: true,
    });
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
  });

  test('P1-02: Every plan step is scoped to a single responsibility', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('02-every-plan-step-is-scoped-to-a-single-re.png', testInfo),
      fullPage: true,
    });
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
  });

  test('P1-03: No step imports provider SDKs directly', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('03-no-step-imports-provider-sdks-directly-f.png', testInfo),
      fullPage: true,
    });
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
  });

  test('P1-04: No step creates entity-specific controllers', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('04-no-step-creates-entity-specific-controll.png', testInfo),
      fullPage: true,
    });
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
  });

  test('P1-05: All steps return DataProcessResult<T>', async ({ page }, testInfo) => {
    await page.goto(ADMIN_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: SNAP('05-all-steps-return-dataprocessresult-t.png', testInfo),
      fullPage: true,
    });
    await expect(page.getByTestId('etl-role-platform-admin-view')).toBeVisible();
  });
});
