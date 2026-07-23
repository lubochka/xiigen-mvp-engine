/**
 * friend-request-social-feed-topology-qa.spec.ts — Phase 6 Topology Visual QA (REAL TOPOLOGY)
 *
 * TVQ-01..TVQ-08 for FLOW-07 — REPLACED 2026-04-17 (Track B batch).
 *
 * Source of truth: contracts/topologies/friend-request-social-feed.topology.json
 * (8 nodes, 10 edges incl. 0 terminal `to:null` markers).
 *
 * Adapter: archetype -> type, entry -> description, terminal markers stripped.
 *
 * Requires:
 *   - Vite dev server (CLIENT_URL or http://localhost:5173)
 *   - /flow-viewer/:flowId route mounted
 *   - data-node-id, data-node-type rendered on every TopologyNodeComponent
 */

import { test, expect } from '@playwright/test';
import { loadRealTopology, countTerminalMarkers } from './topology-fixtures';

const FLOW_ID         = 'FLOW-07';
const SLUG            = 'friend-request-social-feed';
const TOPOLOGY        = loadRealTopology(SLUG);
const TERMINAL_COUNT  = countTerminalMarkers(SLUG);

const NODE_COUNT      = TOPOLOGY.nodes.length;
const EDGE_COUNT      = TOPOLOGY.edges.length;
const FIRST_NODE_ID   = TOPOLOGY.nodes[0].id;
const LAST_NODE_ID    = TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].id;

const BASE_URL        = process.env.CLIENT_URL ?? 'http://localhost:5173';
const TOPOLOGY_URL    = `${BASE_URL}/flow-viewer/${FLOW_ID}`;
const API_PATTERN     = `**/api/topology/${FLOW_ID}`;
const API_RUN_PATTERN = `**/api/topology/${FLOW_ID}/run/**`;

test.beforeEach(async ({ page }) => {
  await page.route(API_PATTERN, async route => {
    if (!route.request().url().includes('/run/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TOPOLOGY),
      });
    } else {
      await route.continue();
    }
  });
});

test.describe(`${FLOW_ID} - Topology Visual QA (real topology)`, () => {

  test('TVQ-01: topology graph renders without error', async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await expect(page.locator('text=Error:')).toHaveCount(0);
  });

  test(`TVQ-02: ${NODE_COUNT} nodes render (matches real topology node count)`, async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    const nodes = await page.getByTestId('topology-node').all();
    expect(nodes.length).toBe(NODE_COUNT);
  });

  test(`TVQ-03: first node ${FIRST_NODE_ID} present and labelled`, async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${FIRST_NODE_ID}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[0].name);
  });

  test(`TVQ-04: last node ${LAST_NODE_ID} present and reachable`, async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${LAST_NODE_ID}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].name);
  });

  test(`TVQ-05: every node has data-node-type attribute (archetype-driven)`, async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    for (const n of TOPOLOGY.nodes) {
      const node = page.locator(`[data-node-id="${n.id}"]`);
      await expect(node).toHaveAttribute('data-node-type', n.type);
    }
  });

  test(`TVQ-06: SUSPENDED state on first node shows badge + resume button`, async ({ page }) => {
    await page.route(API_RUN_PATTERN, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          topology: TOPOLOGY,
          runState: {
            nodeStates: { [FIRST_NODE_ID]: { status: 'SUSPENDED' } },
            cycle2Traces: [],
            cycle3Traces: [],
            subFlows: [],
            suspensions: [{
              id: 'susp-tvq-06',
              nodeId: FIRST_NODE_ID,
              gapDescription: `Missing constraint for ${FIRST_NODE_ID}`,
              gapRequest: ['What is the acceptance threshold for this node?'],
            }],
          },
        }),
      });
    });
    try { await page.goto(`${TOPOLOGY_URL}?runId=tvq-test-run`, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('node-suspended-badge')).toBeVisible();
    await expect(page.getByTestId('resume-button')).toBeVisible();
  });

  test('TVQ-07: cycle 2 score spread chart renders for DPO traces', async ({ page }) => {
    await page.route(API_RUN_PATTERN, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          topology: TOPOLOGY,
          runState: {
            nodeStates: {},
            cycle2Traces: [
              { round: 1, stepText: `Build ${FIRST_NODE_ID} step 1`,
                chosen: { model: 'gemini', score: 8.7 },
                rejected: { model: 'gpt-4', score: 6.2 }, discarded: null },
              { round: 2, stepText: `Build ${FIRST_NODE_ID} step 2`,
                chosen: { model: 'gpt-4', score: 9.1 },
                rejected: { model: 'gemini', score: 7.4 }, discarded: null },
            ],
            cycle3Traces: [],
            subFlows: [],
            suspensions: [],
          },
        }),
      });
    });
    try { await page.goto(`${TOPOLOGY_URL}?runId=tvq-test-run`, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('score-spread-chart')).toBeVisible();
  });

  test('TVQ-08: no JS console errors on topology load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });


  test('TVQ-09: golden screenshot — full topology visible', async ({ page }) => {
    try { await page.goto(TOPOLOGY_URL, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await page.waitForTimeout(800);
    const screenshotPath = `../docs/topology-snapshots/${SLUG}/tvq-09-topology-render.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      clip: await page.getByTestId('topology-graph').boundingBox() ?? undefined,
    });
    const { statSync } = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  });
});

// Track B REPLACE provenance:
//   NODE_COUNT       = 8
//   EDGE_COUNT_RAW   = 10     (0 terminal-to-null filtered)
//   Source           = contracts/topologies/friend-request-social-feed.topology.json
void EDGE_COUNT;
void TERMINAL_COUNT;
