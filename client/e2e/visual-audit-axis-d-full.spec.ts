/**
 * visual-audit-axis-d-full.spec.ts
 *
 * 2026-04-21 full-coverage Axis D capture per PROPER-EXAMINATION-PLAN-v1.md +
 * VISUAL-REEXAMINATION-PLAN dual convergence criterion.
 *
 * CELLS are imported from _axis-d-cells.generated.ts (generated from
 * AXIS-D-SWEEP-INVENTORY.json). 182 cells × 3 viewports = 546 PNGs.
 *
 * Output path:
 *   docs/e2e-snapshots/visual-audit/<viewport>/<slug>/<state>-<role>.png
 *
 * where <state> is either 'primary' (no mock) or 'populated' (with mock key).
 */

import { test } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CELLS, type Cell } from './_axis-d-cells.generated';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SNAP_ROOT = path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'visual-audit');

function cellUrl(c: Cell): string {
  const q = new URLSearchParams();
  q.set('role', c.role);
  if (c.mockKey) q.set('mock', c.mockKey);
  // RUN-173 FIX P4-5: suppress the "Missing provider keys" dev banner so
  // it doesn't leak into every admin capture.
  q.set('hideChrome', '1');
  return `${c.route}?${q.toString()}`;
}

test.describe('Axis D full-coverage captures', () => {
  for (const cell of CELLS) {
    const stateLabel = cell.state;
    test(`${cell.slug} — ${cell.role} — ${stateLabel}`, async ({ page }, testInfo) => {
      const viewport = testInfo.project.name;
      const fileName = `${stateLabel}-${cell.role}.png`;
      const outPath = path.join(SNAP_ROOT, viewport, cell.slug, fileName);
      await page.goto(cellUrl(cell), { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await page.screenshot({ path: outPath, fullPage: true });
    });
  }
});
