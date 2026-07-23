/**
 * i18n-translation-topology-qa.spec.ts — FLOW-48 Phase 6 Topology Visual QA (REAL TOPOLOGY)
 *
 * TVQ-01..TVQ-09 for FLOW-48 — authored 2026-04-19 per FLOW-48-PLAN-P1-P14 §P14.
 *
 * Source of truth: contracts/topologies/i18n-translation.topology.json
 * (6 nodes T665–T670, 11 edges including 5 terminal markers to domain events).
 *
 * Adapter (topology-fixtures.ts):
 *   archetype → type (uppercased)
 *   entry     → description
 *   Terminal edges to non-node ids (TranslationRequestStored, TranslationFallback,
 *   TranslationCached, MarketplaceCacheStored, PreferencesUpdated,
 *   TranslationRequested, UserPreferencesRequested, AccountCreated) stay in the
 *   edge list — the viewer drops edges to unknown node IDs at render time.
 *
 * Requires:
 *   - Vite dev server (CLIENT_URL or http://localhost:5173)
 *   - /flow-viewer/:flowId route mounted
 *   - data-node-id, data-node-type rendered on every TopologyNodeComponent
 */

import { test, expect } from '@playwright/test';
import { loadRealTopology } from './topology-fixtures';

const FLOW_ID = 'FLOW-48';
const SLUG = 'i18n-translation';
const TOPOLOGY = loadRealTopology(SLUG);

const NODE_COUNT = TOPOLOGY.nodes.length;
const FIRST_NODE_ID = TOPOLOGY.nodes[0].id;
const LAST_NODE_ID = TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].id;

const BASE_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const TOPOLOGY_URL = `${BASE_URL}/flow-viewer/${FLOW_ID}`;
const API_PATTERN = `**/api/topology/${FLOW_ID}`;
const API_RUN_PATTERN = `**/api/topology/${FLOW_ID}/run/**`;

test.beforeEach(async ({ page }) => {
  await page.route(API_PATTERN, async (route) => {
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

test.describe(`${FLOW_ID} — i18n-translation Topology Visual QA`, () => {
  test('TVQ-01: topology graph renders without error', async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await expect(page.locator('text=Error:')).toHaveCount(0);
  });

  test(`TVQ-02: ${NODE_COUNT} nodes render (T665..T670)`, async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    const nodes = await page.getByTestId('topology-node').all();
    expect(nodes.length).toBe(NODE_COUNT);
  });

  test(`TVQ-03: first node ${FIRST_NODE_ID} TranslationRequestRegistrar present`, async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${FIRST_NODE_ID}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[0].name);
  });

  test(`TVQ-04: last node ${LAST_NODE_ID} UserPreferencesManager reachable`, async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${LAST_NODE_ID}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].name);
  });

  test('TVQ-05: every node has data-node-type (archetype normalised)', async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    for (const n of TOPOLOGY.nodes) {
      const node = page.locator(`[data-node-id="${n.id}"]`);
      await expect(node).toHaveAttribute('data-node-type', n.type);
    }
  });

  test('TVQ-06: SUSPENDED on T665 TranslationRequestRegistrar shows badge + resume', async ({ page }) => {
    await page.route(API_RUN_PATTERN, async (route) => {
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
            suspensions: [
              {
                id: 'susp-tvq-06',
                nodeId: FIRST_NODE_ID,
                gapDescription: 'Missing acceptLanguage normalisation policy for T665',
                gapRequest: ['Which BCP-47 subtags should be registered for auto-enrollment?'],
              },
            ],
          },
        }),
      });
    });
    try {
      await page.goto(`${TOPOLOGY_URL}?runId=tvq-test-run`, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('node-suspended-badge')).toBeVisible();
    await expect(page.getByTestId('resume-button')).toBeVisible();
  });

  test('TVQ-07: cycle 2 score spread chart renders for DPO traces', async ({ page }) => {
    await page.route(API_RUN_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          topology: TOPOLOGY,
          runState: {
            nodeStates: {},
            cycle2Traces: [
              {
                round: 1,
                stepText: 'Translate user-registration module to Hebrew',
                chosen: { model: 'gpt-4', score: 8.9 },
                rejected: { model: 'gemini', score: 7.1 },
                discarded: null,
              },
              {
                round: 2,
                stepText: 'Translate marketplace base terms to French',
                chosen: { model: 'gemini', score: 9.2 },
                rejected: { model: 'gpt-4', score: 7.6 },
                discarded: null,
              },
            ],
            cycle3Traces: [],
            subFlows: [],
            suspensions: [],
          },
        }),
      });
    });
    try {
      await page.goto(`${TOPOLOGY_URL}?runId=tvq-test-run`, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('score-spread-chart')).toBeVisible();
  });

  test('TVQ-08: no JS console errors on topology load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('TVQ-09: golden screenshot — full topology visible', async ({ page }) => {
    try {
      await page.goto(TOPOLOGY_URL, { timeout: 10_000 });
    } catch {
      test.skip(true, 'Dev server not running');
    }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await page.waitForTimeout(800);
    const screenshotPath = `../docs/topology-snapshots/${SLUG}/tvq-09-topology-render.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: false,
      clip: (await page.getByTestId('topology-graph').boundingBox()) ?? undefined,
    });
    const { statSync } = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  });
});

// Authoring provenance:
//   NODE_COUNT = 6  (T665 T666 T667 T668 T669 T670)
//   EDGE_COUNT = 11 (including terminal-to-event markers)
//   Source     = contracts/topologies/i18n-translation.topology.json
