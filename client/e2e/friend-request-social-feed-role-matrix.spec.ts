/**
 * FLOW-07 role matrix capture.
 *
 * The generated Axis-D inventory currently covers the four baseline roles.
 * FLOW-07's role analysis requires seven primary role cells, so this spec
 * captures the full role set into the same visual-audit directory.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SLUG = 'friend-request-social-feed';
const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');
const ROLES = [
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'freelancer',
  'business-partner',
  'tenant-admin',
  'platform-admin',
] as const;

const CONSUMER_SHELL_ROLES = new Set<(typeof ROLES)[number]>([
  'anonymous',
  'public-marketplace-visitor',
  'tenant-user',
  'freelancer',
  'business-partner',
]);

const PLAIN_LANGUAGE_BLOCKLIST =
  /\bBFA\b|\bDNA-[1-9]\b|\bAF[- ]station\b|\barbiter\b|FREEDOM config|MACHINE code|DataProcessResult|ENGINE_INTERNAL|\bT[0-9]{3}\b|\bCF-[0-9]{3}\b|adaptive-rag|topology canvas|build-gate|\bCRUD\b|\/api\/dynamic|xiigen-feed-items/i;

function urlFor(role: (typeof ROLES)[number]): string {
  const query = new URLSearchParams();
  query.set('role', role);
  query.set('hideChrome', '1');
  return `/social-feed?${query.toString()}`;
}

test.describe('FLOW-07 role matrix captures', () => {
  for (const role of ROLES) {
    test(`friend-request-social-feed primary role cell - ${role}`, async ({ page }, testInfo) => {
      const viewport = testInfo.project.name;
      const outPath = path.join(SNAP_ROOT, viewport, SLUG, `primary-${role}.png`);
      await page.goto(urlFor(role), { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId('social-feed-page')).toBeVisible();
      await expect(page.getByTestId('social-feed-page')).toHaveAttribute('data-viewer-role', role);
      const visibleText = await page.locator('body').innerText();
      expect(visibleText).not.toMatch(PLAIN_LANGUAGE_BLOCKLIST);
      if (CONSUMER_SHELL_ROLES.has(role)) {
        await expect(page.locator('aside').filter({ hasText: 'Engine Client' })).toHaveCount(0);
      }
      await page.waitForTimeout(800);
      await page.screenshot({ path: outPath, fullPage: true });
    });
  }
});
