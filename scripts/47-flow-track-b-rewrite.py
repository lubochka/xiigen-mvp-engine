#!/usr/bin/env python3
"""
47-flow-track-b-rewrite.py

For each of the 11 Track B REPLACE candidates (where both topology JSON AND existing
spec are present), overwrite the spec to use loadRealTopology() + real node IDs.

Mirrors user-registration-topology-qa.spec.ts (the FLOW-01 reference).
"""
import json
from pathlib import Path

WORK = Path(r"C:\Projects\xiigen mvp\.claude\worktrees\vigorous-margulis")
RAW  = WORK / "docs" / "sessions" / "47-FLOW-RAW-INPUTS.jsonl"

TEMPLATE = '''/**
 * {SLUG}-topology-qa.spec.ts — Phase 6 Topology Visual QA (REAL TOPOLOGY)
 *
 * TVQ-01..TVQ-08 for {FLOW_ID} — REPLACED 2026-04-17 (Track B batch).
 *
 * Source of truth: contracts/topologies/{SLUG}.topology.json
 * ({NODE_COUNT} nodes, {EDGE_COUNT_TOTAL} edges incl. {TERMINAL_COUNT} terminal `to:null` markers).
 *
 * Adapter: archetype -> type, entry -> description, terminal markers stripped.
 *
 * Requires:
 *   - Vite dev server (CLIENT_URL or http://localhost:5173)
 *   - /flow-viewer/:flowId route mounted
 *   - data-node-id, data-node-type rendered on every TopologyNodeComponent
 */

import {{ test, expect }} from '@playwright/test';
import {{ loadRealTopology, countTerminalMarkers }} from './topology-fixtures';

const FLOW_ID         = '{FLOW_ID}';
const SLUG            = '{SLUG}';
const TOPOLOGY        = loadRealTopology(SLUG);
const TERMINAL_COUNT  = countTerminalMarkers(SLUG);

const NODE_COUNT      = TOPOLOGY.nodes.length;
const EDGE_COUNT      = TOPOLOGY.edges.length;
const FIRST_NODE_ID   = TOPOLOGY.nodes[0].id;
const LAST_NODE_ID    = TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].id;

const BASE_URL        = process.env.CLIENT_URL ?? 'http://localhost:5173';
const TOPOLOGY_URL    = `${{BASE_URL}}/flow-viewer/${{FLOW_ID}}`;
const API_PATTERN     = `**/api/topology/${{FLOW_ID}}`;
const API_RUN_PATTERN = `**/api/topology/${{FLOW_ID}}/run/**`;

test.beforeEach(async ({{ page }}) => {{
  await page.route(API_PATTERN, async route => {{
    if (!route.request().url().includes('/run/')) {{
      await route.fulfill({{
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TOPOLOGY),
      }});
    }} else {{
      await route.continue();
    }}
  }});
}});

test.describe(`${{FLOW_ID}} - Topology Visual QA (real topology)`, () => {{

  test('TVQ-01: topology graph renders without error', async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await expect(page.locator('text=Error:')).toHaveCount(0);
  }});

  test(`TVQ-02: ${{NODE_COUNT}} nodes render (matches real topology node count)`, async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    const nodes = await page.getByTestId('topology-node').all();
    expect(nodes.length).toBe(NODE_COUNT);
  }});

  test(`TVQ-03: first node ${{FIRST_NODE_ID}} present and labelled`, async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${{FIRST_NODE_ID}}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[0].name);
  }});

  test(`TVQ-04: last node ${{LAST_NODE_ID}} present and reachable`, async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    const node = page.locator(`[data-node-id="${{LAST_NODE_ID}}"]`);
    await expect(node).toBeVisible();
    await expect(node).toContainText(TOPOLOGY.nodes[TOPOLOGY.nodes.length - 1].name);
  }});

  test(`TVQ-05: every node has data-node-type attribute (archetype-driven)`, async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    for (const n of TOPOLOGY.nodes) {{
      const node = page.locator(`[data-node-id="${{n.id}}"]`);
      await expect(node).toHaveAttribute('data-node-type', n.type);
    }}
  }});

  test(`TVQ-06: SUSPENDED state on first node shows badge + resume button`, async ({{ page }}) => {{
    await page.route(API_RUN_PATTERN, async route => {{
      await route.fulfill({{
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({{
          topology: TOPOLOGY,
          runState: {{
            nodeStates: {{ [FIRST_NODE_ID]: {{ status: 'SUSPENDED' }} }},
            cycle2Traces: [],
            cycle3Traces: [],
            subFlows: [],
            suspensions: [{{
              id: 'susp-tvq-06',
              nodeId: FIRST_NODE_ID,
              gapDescription: `Missing constraint for ${{FIRST_NODE_ID}}`,
              gapRequest: ['What is the acceptance threshold for this node?'],
            }}],
          }},
        }}),
      }});
    }});
    try {{ await page.goto(`${{TOPOLOGY_URL}}?runId=tvq-test-run`, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('node-suspended-badge')).toBeVisible();
    await expect(page.getByTestId('resume-button')).toBeVisible();
  }});

  test('TVQ-07: cycle 2 score spread chart renders for DPO traces', async ({{ page }}) => {{
    await page.route(API_RUN_PATTERN, async route => {{
      await route.fulfill({{
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({{
          topology: TOPOLOGY,
          runState: {{
            nodeStates: {{}},
            cycle2Traces: [
              {{ round: 1, stepText: `Build ${{FIRST_NODE_ID}} step 1`,
                chosen: {{ model: 'gemini', score: 8.7 }},
                rejected: {{ model: 'gpt-4', score: 6.2 }}, discarded: null }},
              {{ round: 2, stepText: `Build ${{FIRST_NODE_ID}} step 2`,
                chosen: {{ model: 'gpt-4', score: 9.1 }},
                rejected: {{ model: 'gemini', score: 7.4 }}, discarded: null }},
            ],
            cycle3Traces: [],
            subFlows: [],
            suspensions: [],
          }},
        }}),
      }});
    }});
    try {{ await page.goto(`${{TOPOLOGY_URL}}?runId=tvq-test-run`, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('score-spread-chart')).toBeVisible();
  }});

  test('TVQ-08: no JS console errors on topology load', async ({{ page }}) => {{
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  }});

}});

// Track B REPLACE provenance:
//   NODE_COUNT       = {NODE_COUNT}
//   EDGE_COUNT_RAW   = {EDGE_COUNT_TOTAL}     ({TERMINAL_COUNT} terminal-to-null filtered)
//   Source           = contracts/topologies/{SLUG}.topology.json
void EDGE_COUNT;
void TERMINAL_COUNT;
'''


def main():
    rows = [json.loads(l) for l in open(RAW, encoding="utf-8")]
    candidates = [r for r in rows if r["track_b"]["replace_applicable"]]
    written = 0
    skipped = 0
    for r in candidates:
        slug = r["slug"]
        flow_id = r["flowId"]
        node_count = r["track_a"]["node_count"]
        edge_count_total = r["track_a"]["edge_count"]
        terminal = r["track_a"]["terminal_marker_count"]
        spec_path = WORK / r["track_b"]["spec_path"]
        if not spec_path.exists():
            print(f"SKIP {flow_id}: spec path does not resolve: {spec_path}")
            skipped += 1
            continue
        content = TEMPLATE.format(
            FLOW_ID=flow_id,
            SLUG=slug,
            NODE_COUNT=node_count,
            EDGE_COUNT_TOTAL=edge_count_total,
            TERMINAL_COUNT=terminal,
        )
        spec_path.write_text(content, encoding="utf-8")
        written += 1
        print(f"REPLACED {flow_id} {slug} ({node_count} nodes, {edge_count_total} edges, {terminal} terminal)")
    print(f"\nDone: {written} replaced, {skipped} skipped")


if __name__ == "__main__":
    main()
