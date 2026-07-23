/**
 * FLOW-29 topology canvas — RUN-48 rebuild gate.
 *
 * Build gate (from Luba, verbatim):
 *   The PNG that proves this run succeeded must show:
 *     - the topology canvas with visible nodes and labelled edges
 *     - at least one node in a non-default state (?mock=/ ?run= to trigger)
 *     - the side panel open on one node with human-readable content
 *   A canvas with all grey nodes and no open panel is not done.
 *
 * URL used:
 *   /admin/adaptive-rag-deep-research
 *     ?role=platform-admin
 *     &run=stalled                       → colours a subset of nodes running/pending
 *     &select=multi-hop-graph-traversal  → opens side panel on that node by default
 *     &hideChrome=1                      → suppresses KeyStatusBanner for a clean PNG
 */
import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAP = (name: string) =>
  path.join(__dirname, '..', '..', 'docs', 'e2e-snapshots', 'c6-role-coverage', name);

test.describe('FLOW-29 topology canvas', () => {
  test('platform-admin stalled-run view with side panel open on a running node', async ({
    page,
  }) => {
    await page.goto(
      '/admin/adaptive-rag-deep-research?role=platform-admin&run=stalled&select=multi-hop-graph-traversal&hideChrome=1',
    );
    await page.waitForLoadState('networkidle');

    // Build-gate assertions:
    // 1. Topology canvas visible
    await expect(page.locator('[data-testid="topology-canvas"]')).toBeVisible();
    // 2. User-intent sentence visible in top bar (from STEP-1-INVARIANTS, verbatim)
    await expect(page.locator('[data-testid="topology-user-intent"]')).toBeVisible();
    // 3. At least one node in non-default state — multi-hop-graph-traversal is 'running'
    await expect(
      page.locator('[data-testid="node-multi-hop-graph-traversal"]'),
    ).toHaveAttribute('data-node-state', 'running');
    // 4. Nodes completed earlier in pipeline carry green state
    await expect(
      page.locator('[data-testid="node-adaptive-rag-router"]'),
    ).toHaveAttribute('data-node-state', 'complete');
    // 5. Side panel open on the selected node with description visible
    await expect(
      page.locator('[data-testid="topology-detail-panel"]'),
    ).toHaveAttribute('data-node-selected', 'multi-hop-graph-traversal');
    await expect(
      page.locator('[data-testid="topology-detail-description"]'),
    ).toBeVisible();
    // 6. Run-tiles show in-flight counts
    await expect(page.locator('[data-testid="topology-run-tiles"]')).toBeVisible();
    await expect(page.locator('[data-testid="topology-tile-running"]')).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-29-topology-canvas-stalled-run.png'),
      fullPage: true,
    });
  });

  test('platform-support sees same canvas with read-only banner', async ({ page }) => {
    await page.goto(
      '/admin/adaptive-rag-deep-research?role=platform-support&run=stalled&select=reranker-step&hideChrome=1',
    );
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="topology-readonly-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="topology-canvas"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="topology-detail-panel"]'),
    ).toHaveAttribute('data-node-selected', 'reranker-step');
    await expect(
      page.locator('[data-testid="topology-detail-readonly-banner"]'),
    ).toBeVisible();

    await page.screenshot({
      path: SNAP('flow-29-topology-canvas-platform-support.png'),
      fullPage: true,
    });
  });

  test('tenant-user sees not-available fallback', async ({ page }) => {
    await page.goto(
      '/admin/adaptive-rag-deep-research?role=tenant-user&hideChrome=1',
    );
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="rag-not-available"]')).toBeVisible();
    await page.screenshot({
      path: SNAP('flow-29-topology-canvas-tenant-user-fallback.png'),
      fullPage: true,
    });
  });
});
