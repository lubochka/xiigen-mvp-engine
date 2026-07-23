#!/usr/bin/env python3
"""
P14 Part C: create 6 missing topology contracts + rewrite 6 LEGACY TVQ specs.

Each LEGACY spec (FLOW-14, 15, 16, 17, 18, 19) currently uses unit-style
FLOW_FIXTURES assertions. Replace with the REAL pattern (page.goto + API mock
via loadRealTopology) and append TVQ-09 (+ TVQ-10 for FLOW-18).
"""
import json
from pathlib import Path

FLOWS = [
    {
        "flowId": "FLOW-14",
        "slug": "etl-data-integration",
        "name": "ETL Data Integration",
        "nodes": [
            {"id": "T213", "taskTypeId": "T213", "name": "ConnectorRegistrationHandler", "archetype": "orchestration", "entry": "POST /etl/connectors (register + validate)"},
            {"id": "T214", "taskTypeId": "T214", "name": "IdentityJoinResolver",         "archetype": "processing",    "entry": "IdentityJoinRequested event (raw-zone lookup)"},
            {"id": "T215", "taskTypeId": "T215", "name": "DimensionalModelBuilder",       "archetype": "processing",    "entry": "SCD-2 close_old + open_new writer"},
            {"id": "T216", "taskTypeId": "T216", "name": "BackfillCoordinator",           "archetype": "observability", "entry": "CRON: reverse-ETL via queue fabric only"},
        ],
        "edges": [
            {"from": "EtlSourceRegistered",  "to": "T213", "event": "xiigen.etl-data-integration.connector-registered.v1"},
            {"from": "T213", "to": "T214",  "event": "xiigen.etl-data-integration.join-requested.v1"},
            {"from": "T214", "to": "T215",  "event": "xiigen.etl-data-integration.dim-model-ready.v1"},
            {"from": "T215", "to": "T216",  "event": "xiigen.etl-data-integration.backfill-scheduled.v1"},
            {"from": "T216", "to": "EtlLifecycleComplete", "event": "xiigen.etl-data-integration.backfill-completed.v1", "condition": "terminal"},
        ],
    },
    {
        "flowId": "FLOW-15",
        "slug": "saas-multi-tenancy",
        "name": "SaaS Multi-Tenancy",
        "nodes": [
            {"id": "T605", "taskTypeId": "T605", "name": "TenantProvisioningOrchestrator", "archetype": "orchestration", "entry": "POST /tenants (SETNX + synchronous config seed)"},
            {"id": "T606", "taskTypeId": "T606", "name": "TenantConfigurationManager",     "archetype": "validation",    "entry": "MACHINE_LOCKED_KEYS compile-time guard"},
            {"id": "T607", "taskTypeId": "T607", "name": "TenantQuotaMaterializer",        "archetype": "processing",    "entry": "Redis MULTI/EXEC quota materialization"},
            {"id": "T608", "taskTypeId": "T608", "name": "TenantLifecycleManager",         "archetype": "governance",    "entry": "suspend-not-delete + cascade to subscriptions"},
        ],
        "edges": [
            {"from": "TenantProvisioningRequested", "to": "T605", "event": "xiigen.saas-multi-tenancy.provisioning-requested.v1"},
            {"from": "T605", "to": "T606", "event": "xiigen.saas-multi-tenancy.config-seed-required.v1"},
            {"from": "T606", "to": "T607", "event": "xiigen.saas-multi-tenancy.quotas-materialized.v1"},
            {"from": "T607", "to": "T608", "event": "xiigen.saas-multi-tenancy.tenant-active.v1"},
            {"from": "T608", "to": "TenantLifecycleComplete", "event": "xiigen.saas-multi-tenancy.tenant-suspended.v1", "condition": "terminal"},
        ],
    },
    {
        "flowId": "FLOW-16",
        "slug": "marketplace-payments",
        "name": "Marketplace Payments",
        "nodes": [
            {"id": "T609", "taskTypeId": "T609", "name": "MarketplaceCheckoutGateway",   "archetype": "validation",    "entry": "POST /checkout (BOLA + cart lock SETNX)"},
            {"id": "T610", "taskTypeId": "T610", "name": "MarketplacePaymentSplitter",   "archetype": "transaction",   "entry": "SETNX idempotency + FREEDOM platform fee bps"},
            {"id": "T611", "taskTypeId": "T611", "name": "MarketplaceEscrowController",  "archetype": "orchestration", "entry": "LIFO saga compensation (REFUND → RESTORE)"},
            {"id": "T612", "taskTypeId": "T612", "name": "SellerPayoutWriter",           "archetype": "emit",          "entry": "SETNX payout-lock + vault-ref-only"},
        ],
        "edges": [
            {"from": "CheckoutInitiated", "to": "T609", "event": "xiigen.marketplace-payments.checkout-initiated.v1"},
            {"from": "T609", "to": "T610", "event": "xiigen.marketplace-payments.checkout-reserved.v1"},
            {"from": "T610", "to": "T611", "event": "xiigen.marketplace-payments.order-confirmed.v1"},
            {"from": "T611", "to": "T612", "event": "xiigen.marketplace-payments.escrow-released.v1", "condition": "delivery-confirmed"},
            {"from": "T612", "to": "PaymentsLifecycleComplete", "event": "xiigen.marketplace-payments.payout-executed.v1", "condition": "terminal"},
        ],
    },
    {
        "flowId": "FLOW-17",
        "slug": "freelancer-marketplace",
        "name": "Freelancer Marketplace",
        "nodes": [
            {"id": "T613", "taskTypeId": "T613", "name": "GigAcceptanceLockGateway",     "archetype": "validation",    "entry": "POST /gigs/:id/accept (BOLA + SETNX + OCC)"},
            {"id": "T614", "taskTypeId": "T614", "name": "MilestoneContractManager",     "archetype": "transaction",   "entry": "CONTRACT_IMMUTABLE_FIELDS compile-time + sum validation"},
            {"id": "T615", "taskTypeId": "T615", "name": "DeliveryGateEscrowController", "archetype": "orchestration", "entry": "delivery gate before release + LIFO milestone compensation"},
            {"id": "T616", "taskTypeId": "T616", "name": "FreelancerReviewWriter",       "archetype": "emit",          "entry": "VALID_REVIEW_DIRECTIONS + append-only audit"},
        ],
        "edges": [
            {"from": "GigAcceptanceRequested", "to": "T613", "event": "xiigen.freelancer-marketplace.gig-acceptance-requested.v1"},
            {"from": "T613", "to": "T614", "event": "xiigen.freelancer-marketplace.gig-accepted.v1"},
            {"from": "T614", "to": "T615", "event": "xiigen.freelancer-marketplace.contract-signed.v1"},
            {"from": "T615", "to": "T616", "event": "xiigen.freelancer-marketplace.milestone-released.v1"},
            {"from": "T616", "to": "FreelancerLifecycleComplete", "event": "xiigen.freelancer-marketplace.review-published.v1", "condition": "terminal"},
        ],
    },
    {
        "flowId": "FLOW-18",
        "slug": "visual-flow-engine",
        "name": "Visual Flow Engine",
        "nodes": [
            {"id": "T617", "taskTypeId": "T617", "name": "FlowCanvasWriter",           "archetype": "validation",    "entry": "POST /flows/:id/canvas (BOLA + FLOW_IMMUTABLE guard)"},
            {"id": "T618", "taskTypeId": "T618", "name": "FlowPublicationOrchestrator","archetype": "orchestration", "entry": "DFS WHITE/GRAY/BLACK cycle detect + OCC DRAFT→PUBLISHED"},
            {"id": "T619", "taskTypeId": "T619", "name": "NodeTypeRegistrar",          "archetype": "processing",    "entry": "SETNX node-type-reg-lock + dual write + redis.del in catch"},
            {"id": "T620", "taskTypeId": "T620", "name": "CodeInjectionProcessor",     "archetype": "emit",          "entry": "version lock + pre-write audit (rollback pointer)"},
        ],
        "edges": [
            {"from": "FlowCanvasEditRequested", "to": "T617", "event": "xiigen.visual-flow-engine.canvas-edit-requested.v1"},
            {"from": "T617", "to": "T618", "event": "xiigen.visual-flow-engine.canvas-updated.v1"},
            {"from": "T618", "to": "T619", "event": "xiigen.visual-flow-engine.flow-published.v1"},
            {"from": "T619", "to": "T620", "event": "xiigen.visual-flow-engine.node-type-registered.v1"},
            {"from": "T620", "to": "VisualFlowLifecycleComplete", "event": "xiigen.visual-flow-engine.code-injected.v1", "condition": "terminal"},
        ],
    },
    {
        "flowId": "FLOW-19",
        "slug": "durable-sagas-compliance",
        "name": "Durable Sagas & Compliance",
        "nodes": [
            {"id": "T621", "taskTypeId": "T621", "name": "SagaOrchestrator",      "archetype": "orchestration", "entry": "OCC versionPin:-1 + SETNX step-lock + checkpoint before enqueue"},
            {"id": "T622", "taskTypeId": "T622", "name": "CompensationEngine",    "archetype": "orchestration", "entry": "LIFO .reverse() serial + SETNX comp-lock + stop-on-first-failure"},
            {"id": "T623", "taskTypeId": "T623", "name": "ComplianceAuditWriter", "archetype": "governance",    "entry": "retentionExpiresAt + SHA-256 hash + PLATFORM_ONLY append-only"},
            {"id": "T624", "taskTypeId": "T624", "name": "DataRetentionEnforcer", "archetype": "governance",    "entry": "CRON from FREEDOM + dual-gate (expired AND !legalHold) + archive before tombstone"},
        ],
        "edges": [
            {"from": "SagaStarted", "to": "T621", "event": "xiigen.durable-sagas-compliance.saga-started.v1"},
            {"from": "T621", "to": "T622", "event": "xiigen.durable-sagas-compliance.step-failed.v1", "condition": "failure"},
            {"from": "T621", "to": "T623", "event": "xiigen.durable-sagas-compliance.step-executed.v1"},
            {"from": "T622", "to": "T623", "event": "xiigen.durable-sagas-compliance.compensation-executed.v1"},
            {"from": "T623", "to": "T624", "event": "xiigen.durable-sagas-compliance.compliance-recorded.v1"},
            {"from": "T624", "to": "SagaLifecycleComplete", "event": "xiigen.durable-sagas-compliance.retention-enforced.v1", "condition": "terminal"},
        ],
    },
]

SPEC_TEMPLATE = '''/**
 * {slug}-topology-qa.spec.ts — Phase 6 Topology Visual QA (REAL TOPOLOGY)
 *
 * TVQ-01..TVQ-09 for {flowId}.
 *
 * Source of truth: contracts/topologies/{slug}.topology.json
 * Adapter: archetype -> type, entry -> description, terminal markers stripped.
 *
 * Requires:
 *   - Vite dev server (CLIENT_URL or http://localhost:5173)
 *   - /flow-viewer/:flowId route mounted
 *   - data-node-id, data-node-type rendered on every TopologyNodeComponent
 */

import {{ test, expect }} from '@playwright/test';
import {{ loadRealTopology, countTerminalMarkers }} from './topology-fixtures';

const FLOW_ID         = '{flowId}';
const SLUG            = '{slug}';
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

  test('TVQ-09: golden screenshot — full topology visible', async ({{ page }}) => {{
    try {{ await page.goto(TOPOLOGY_URL, {{ timeout: 10_000 }}); }}
    catch {{ test.skip(true, 'Dev server not running'); }}
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    await page.waitForTimeout(800);
    const screenshotPath = `../docs/topology-snapshots/${{SLUG}}/tvq-09-topology-render.png`;
    await page.screenshot({{
      path: screenshotPath,
      fullPage: false,
      clip: await page.getByTestId('topology-graph').boundingBox() ?? undefined,
    }});
    const {{ statSync }} = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  }});
{tvq10_block}
}});

void EDGE_COUNT;
void TERMINAL_COUNT;
'''

TVQ10_FLOW18 = '''
  test('TVQ-10: FlowCanvasPage embeds TopologyViewer (not text list)', async ({ page }) => {
    const canvasUrl = `${BASE_URL}/admin/visual-flow/canvas`;
    try { await page.goto(canvasUrl, { timeout: 10_000 }); }
    catch { test.skip(true, 'Dev server not running'); }
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('topology-view-section')).toBeVisible();
    await expect(page.getByTestId('flow-canvas-topology')).toBeVisible();
    await expect(page.getByTestId('topology-graph')).toBeVisible();
    const screenshotPath = `../docs/topology-snapshots/${SLUG}/tvq-10-page-render.png`;
    await page.screenshot({ path: screenshotPath });
    const { statSync } = await import('fs');
    expect(statSync(screenshotPath).size).toBeGreaterThan(5_000);
  });
'''

def main():
    root = Path(__file__).resolve().parents[1]
    contracts_dir = root / "contracts" / "topologies"
    topology_dir = root / "client" / "e2e" / "topology"

    for flow in FLOWS:
        slug = flow["slug"]
        flow_id = flow["flowId"]

        # 1. Write topology contract
        contract_path = contracts_dir / f"{slug}.topology.json"
        contract_data = {
            "flowId": flow_id,
            "name": flow["name"],
            "status": "NOT_STARTED",
            "nodes": flow["nodes"],
            "edges": flow["edges"],
        }
        contract_path.write_text(json.dumps(contract_data, indent=2) + "\n", encoding="utf-8")
        print(f"OK contract: {contract_path.name}")

        # 2. Write spec file
        spec_path = topology_dir / f"{slug}-topology-qa.spec.ts"
        tvq10 = TVQ10_FLOW18 if flow_id == "FLOW-18" else ""
        spec_body = SPEC_TEMPLATE.format(slug=slug, flowId=flow_id, tvq10_block=tvq10)
        spec_path.write_text(spec_body, encoding="utf-8")
        print(f"OK spec:     {spec_path.name}")

if __name__ == "__main__":
    main()
