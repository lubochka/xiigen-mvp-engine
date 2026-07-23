/**
 * Key Provisioning — Playwright E2E tests.
 *
 * Prerequisite: Playwright installed + configured (playwright.config.ts).
 *   npm install --save-dev @playwright/test
 *   npx playwright install chromium
 *
 * Requires running servers:
 *   Server: http://localhost:3000  (NestJS — with empty byok-keys for master tenant)
 *   Client: http://localhost:5173  (Vite dev server)
 *
 * Run: npx playwright test e2e/key-provisioning.spec.ts
 */

import { test, expect } from '@playwright/test';

const MASTER_TENANT = 'xiigen-master-00000000-0000-0000-0000-000000000001';
const BASE = 'http://localhost:3000';
const CLIENT = 'http://localhost:5173';

test.describe('Key Provisioning — full flow', () => {

  test.beforeEach(async ({ request }) => {
    // Ensure byok-keys empty for master tenant before each test.
    // Server has no DELETE route — PUT with empty body clears all keys.
    await request.put(`${BASE}/api/tenants/${MASTER_TENANT}/keys`, {
      headers: { 'X-Tenant-Id': MASTER_TENANT, 'Content-Type': 'application/json' },
      data: {},
    });
  });

  test('missing-key banner visible when no keys configured', async ({ page }) => {
    await page.goto(`${CLIENT}`);
    await expect(page.getByTestId('key-status-banner')).toBeVisible();
    await expect(page.getByTestId('key-status-banner')).toHaveAttribute('data-severity', 'error');
    await page.screenshot({ path: 'docs/phase-reports/PHASE-A1/snapshots/banner-no-keys.png' });
  });

  test('provisioning form appears when Configure keys clicked', async ({ page }) => {
    await page.goto(`${CLIENT}`);
    await page.screenshot({ path: `\${__dirname}/../../docs/e2e-snapshots/UNKNOWN/provisioning-form-appears-when-configure-before.png`, fullPage: true });
    await page.getByTestId('provision-keys-button').click();
    await expect(page.getByTestId('key-provisioning-form')).toBeVisible();
    await expect(page.getByTestId('anthropic-key-input')).toHaveAttribute('type', 'password');
    await expect(page.getByTestId('openai-key-input')).toHaveAttribute('type', 'password');
    await expect(page.getByTestId('gemini-key-input')).toHaveAttribute('type', 'password');
    await page.screenshot({ path: 'docs/phase-reports/PHASE-A1/snapshots/form-empty.png' });
  });

  test('banner disappears after keys provisioned successfully', async ({ page }) => {
    await page.goto(`${CLIENT}`);
    await page.screenshot({ path: `\${__dirname}/../../docs/e2e-snapshots/UNKNOWN/banner-disappears-after-keys-provisioned-before.png`, fullPage: true });
    await page.getByTestId('provision-keys-button').click();
    await page.getByTestId('anthropic-key-input').fill(process.env['TEST_ANTHROPIC_KEY'] ?? 'sk-ant-test');
    await page.getByTestId('submit-keys-button').click();
    await expect(page.getByTestId('provisioning-success')).toBeVisible();
    // Error state must be gone (warning state acceptable if only 1 of 3 keys provided)
    const banner = page.getByTestId('key-status-banner');
    const bannerCount = await banner.count();
    if (bannerCount > 0) {
      await expect(banner).not.toHaveAttribute('data-severity', 'error');
    }
    await page.screenshot({ path: 'docs/phase-reports/PHASE-A1/snapshots/after-provision.png' });
  });

});
