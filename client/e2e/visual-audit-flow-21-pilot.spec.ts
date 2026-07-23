/**
 * visual-audit-flow-21-pilot.spec.ts
 *
 * 2026-04-21 pilot capture for FLOW-21 dynamic-forms-workflows under the
 * PER-IMAGE-VALIDATION-TEMPLATE axis D mandate (NEEDS_PURPOSE_BUILT_UI).
 *
 * The existing visual-audit-all-flows.spec.ts captures one cell per flow at
 * the primary role. That is insufficient for Axis D on flows flagged
 * NEEDS_PURPOSE_BUILT_UI, because it never captures the populated business
 * state with the domain fields that the examination record planned.
 *
 * This pilot captures 3 roles × 1 populated state × 3 viewports = 9 PNGs,
 * each at `?role=<role>&mock=populated` so the BusinessStateCard /
 * purpose-built surface renders with domain content.
 *
 * Output:
 *   docs/e2e-snapshots/visual-audit/<viewport>/dynamic-forms-workflows/
 *     populated-tenant-admin.png     (builder view)
 *     populated-tenant-user.png      (respondent view)
 *     populated-anonymous.png        (public respondent view)
 */

import { test } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');

// FLOW-21 cells under Axis D mandate. Each role opens the same route with
// ?mock=published (an actual MOCK_STATES key in DynamicFormsWorkflowsPage —
// 'published' is the populated state: form schema accepting submissions).
const FLOW_21_CELLS: Array<{
  slug: string;
  route: string;
  role: string;
  mockKey: string;
  label: string;
}> = [
  {
    slug: 'dynamic-forms-workflows',
    route: '/dynamic-forms-workflows',
    role: 'tenant-admin',
    mockKey: 'published',
    label: 'builder (tenant-admin)',
  },
  {
    slug: 'dynamic-forms-workflows',
    route: '/dynamic-forms-workflows',
    role: 'tenant-user',
    mockKey: 'published',
    label: 'respondent (tenant-user)',
  },
  {
    slug: 'dynamic-forms-workflows',
    route: '/dynamic-forms-workflows',
    role: 'anonymous',
    mockKey: 'published',
    label: 'respondent (anonymous)',
  },
];

function cellUrl(c: typeof FLOW_21_CELLS[number]): string {
  const q = new URLSearchParams();
  q.set('role', c.role);
  q.set('mock', c.mockKey);
  return `${c.route}?${q.toString()}`;
}

test.describe('FLOW-21 pilot — Axis D mandated captures', () => {
  for (const cell of FLOW_21_CELLS) {
    test(`${cell.slug} — ${cell.label} — populated`, async ({ page }, testInfo) => {
      const viewport = testInfo.project.name; // chromium-desktop / tablet / mobile
      const outPath = path.join(
        SNAP_ROOT,
        viewport,
        cell.slug,
        `populated-${cell.role}.png`,
      );

      await page.goto(cellUrl(cell), { waitUntil: 'networkidle' });
      // Allow animations + microtask flush
      await page.waitForTimeout(600);

      await page.screenshot({ path: outPath, fullPage: true });
    });
  }
});
