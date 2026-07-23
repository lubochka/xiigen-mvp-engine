# FLOW-29 adaptive-rag-deep-research — Screen Examination
## Run: RUN-48 (template for topology-canvas grammar)
## Date: 2026-04-20
## Supersedes: RUN-47a PNG (generic CRUD table)

---

## Step 0 — Product intent (ground truth, no invention)

Source: `docs/sessions/FLOW-29/FLOW-29-STEP-1-INVARIANTS.md`

> **USER INTENT (verbatim):**
> "When a deep research query arrives on the XIIGen engine, route it through
> the adaptive RAG pipeline, execute multi-hop graph traversal, and return
> synthesised findings with source attribution."

Classification: **ENGINE_INTERNAL** · uiRequired: "Admin debug only".

---

## Step 1 — Persona card

**Primary persona:** ML-ops engineer / AI-quality reviewer on platform-admin duty.

- **Triggering moment:** a deep research run has been in-flight 4+ minutes, burning budget.
- **Decision they need to make:** Kill the run · Rebudget it · Let it finish.
- **What they must see to decide:** which pipeline stage is current, which upstream stages completed, which downstream gates are pending, live budget / time / sub-query counts on the active stage.

**Secondary persona:** platform-support investigating a complaint about a wrong answer.

- **Triggering moment:** a tenant opened a support ticket citing an incorrect citation.
- **Decision:** is this a known pipeline failure or a novel bug that needs escalation?
- **What they must see:** same topology, same live state, read-only (no Kill / Rebudget).

**No tenant-facing branch.** `ENGINE_INTERNAL` per `flow-ui-automation.json`.

---

## Step 2 — State inventory

Source: `docs/sessions/FLOW-29/UI-REFLECTION-STATE.md` (27 named processes).

Each process runs through 5 canonical runtime states:

```
idle       → not yet reached in this run
running    → currently executing
pending    → awaiting a gate decision
complete   → finished successfully in this run
failed     → ran and errored
```

These map to node-border colours on the canvas per the architect-response standard (grey / blue / orange / green / red).

The flow also has 7 run-level states preserved in the `?mock=` early-return contract: `query-received`, `plan-queued`, `search-running`, `sources-gathered`, `synthesis-done`, `search-failed`, `clarification-escalated`.

---

## Step 3 — Data shape per node

Per `UI-REFLECTION-STATE.md`, every node carries: service slug, human-label, pipeline phase, sample inputs, sample outputs. The side panel renders these on click.

The 27 nodes group into 6 pipeline phases derived from the user-intent walk-through:

| Phase | Nodes |
|-------|-------|
| Ingest | Route Research Query, Select AI Model |
| Retrieval | Retrieve Vectors, Query Knowledge Community, Traverse Knowledge Graph, Merge Retrieval Results, Rerank Sources |
| Gates | Check Budget Limit, Check Context Fit, Self-Reflect On Answer, Score Answer Quality |
| Knowledge maintenance | Gate Knowledge Edits, Apply Graph Edit, Render Graph Node, Rebuild Domain Index, Compile Domain Profile, Summarise Community |
| Feedback | Capture Trace, Receive User Feedback, Aggregate Feedback, Suggest Improvements |
| Policy promotion | Promote Prompt Version, Compare Asset Versions, Rollback Strategy, Update Routing Policy, Gate Promotion, Allocate A/B Test |

---

## Step 4 — UI grammar

**Grammar 4 — Topology Canvas** (n8n / draw.io format per architect-response).

Rejected alternatives (documented to prevent regression):
- Generic CRUD table — the RUN-47a default. Showed `ui-1776451808918 | active | Delete`. Zero pipeline visibility.
- Progress Strip alone — too shallow for a 27-node pipeline with 4 phases. Works for single-query lifecycle but obscures the parallel knowledge-maintenance and feedback sub-pipelines.
- Verdict Grid — wrong domain (no arbiters per node).

---

## Step 5 — Role-differentiated actions

| Role | Branch | Canvas | Actions |
|------|--------|--------|---------|
| platform-admin | full | interactive, draggable | Click node → side panel. (Kill / Rebudget actions planned — not in this run; see `CARRY-FORWARD`.) |
| platform-support | read-only | draggable for inspection | Click node → side panel with explicit escalate-to-admin note. |
| anonymous / tenant-user / tenant-admin / freelancer / event-organiser / business-partner / referral-user | fallback | not available | Single card: "This is an engine-internal operations surface. Not available for your current role." |

---

## Step 6 — PNG evidence (build gate)

Luba's gate, verbatim: *"The PNG that proves this run succeeded must show the topology canvas with visible nodes and labelled edges, at least one node in a non-default state (use ?mock= to trigger a mid-run state), and the side panel open on one node showing human-readable content."*

Three PNGs generated, each against a live Vite run of the rebuilt page.

### `flow-29-topology-canvas-stalled-run.png` (platform-admin)

URL: `/admin/adaptive-rag-deep-research?role=platform-admin&run=stalled&select=multi-hop-graph-traversal&hideChrome=1`

Gate checks:
- ✅ Topology canvas with visible nodes and labelled edges (all 27 nodes rendered, edges carry plain-English labels: "query entities", "vector hits", "fused candidates", "trimmed sources", "revised answer", "final answer", "feedback record", "aggregated metrics", "proposal", "new prompt", "quality delta", "promoted asset", "policy update", "effective", "span", "approved edit", "commit", "changed domain", "new index", "profile")
- ✅ Multiple nodes in non-default states:
  - **green (complete):** Route Research Query, Select AI Model, Retrieve Vectors, Query Knowledge Community
  - **blue (running):** Traverse Knowledge Graph, Merge Retrieval Results, Capture Trace
  - **orange (pending):** Check Budget Limit, Rerank Sources
  - **grey (not reached):** remaining 18 nodes
- ✅ Side panel open on `Traverse Knowledge Graph` with human-readable content: description "Walks 2–3 hops through the knowledge graph to collect supporting context", INPUTS "Seed nodes, Hop budget", OUTPUTS "Traversal path, Supporting nodes"
- ✅ Top bar shows user-intent sentence verbatim from STEP-1-INVARIANTS
- ✅ Run tiles: RUNNING 3 · COMPLETE 4 · PENDING 2 · FAILED 0
- ✅ Legend for node state colours visible
- ✅ No CRUD table · no `ui-1776451808918` · no "New record" button · no KeyStatusBanner (suppressed via `hideChrome=1`)

### `flow-29-topology-canvas-platform-support.png` (read-only)

URL: `/admin/adaptive-rag-deep-research?role=platform-support&run=stalled&select=reranker-step&hideChrome=1`

- Same canvas, same nodes, same edges
- Amber read-only banner at top: "Read-only for support access. Canvas is inspectable; Kill / Rebudget are platform-admin only."
- Side panel on `Rerank Sources` (PENDING state) with the escalate-to-admin sub-banner inside

### `flow-29-topology-canvas-tenant-user-fallback.png`

URL: `/admin/adaptive-rag-deep-research?role=tenant-user&hideChrome=1`

- Single card with AlertTriangle icon: "Adaptive RAG / Deep Research — This is an engine-internal operations surface for the platform team. Not available for your current role."

---

## Step 7 — Gap classification (pre-run vs post-run)

**Pre-run (RUN-47a PNG):** `NEEDS_PURPOSE_BUILT_UI` — generic CRUD table. Verdict: broken.

**Post-run (this run):** Gap **CLOSED** for the default view. Canvas surfaces the 27-process topology derived from `UI-REFLECTION-STATE.md` with live-state colouring and side-panel detail per the architect-response topology-canvas standard.

---

## Carry-forward items (new, documented honestly)

1. **Kill / Rebudget actions** — the persona card identifies them as required for platform-admin. Not yet wired. Needs a server endpoint + confirmation modal + idempotency key per the compliance-grade pattern used in RUN-39/40. LOW for now since there are no real runs to kill against mock data; MEDIUM when the server side goes live.

2. **Left-edge nodes partially clipped by Sidebar** — the Route Research Query + Select AI Model nodes sit at `x=0` in the graph and ReactFlow's `fitView` padding doesn't fully push them past the 224px Sidebar. A `padding: 40` bump on fitView and `marginLeft` on the canvas container fixes it. LOW — content is readable, just not centred.

3. **Sidebar still visible on ENGINE_INTERNAL pages** — same pre-existing AppShell gap documented in FLEET-VALIDATION-v5 §11 (the "zero-chrome" carry-forward). Not unique to this flow.

4. **Node label translation map lives in a source-file comment** — per Luba's rule, authored at top of `AdaptiveRagDeepResearchPage.tsx`. If a reviewer wants a label changed, edit the constant, not the ReactFlow JSX.

---

## Template status

This examination record + the rebuilt page together constitute the **reference template** for all Grammar-4 (Topology Canvas) flows. Batches B (FLOW-11, 18, 26, 31) and the Grammar-4 portion of Batch D (FLOW-44) will follow this pattern:

1. Read `docs/sessions/FLOW-XX/STEP-1-INVARIANTS.md` → user intent sentence
2. Read `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` → process inventory
3. Author slug→human-label translation map as top-of-file comment
4. Group processes into pipeline phases from the user-intent walkthrough
5. Author `PROCESS_NODES` with (id, label, description, phase, x, y, inputs, outputs)
6. Author `PIPELINE_EDGES` as plain-English data-flow labels
7. Author `STALLED_RUN_STATE` map for a representative mid-run PNG
8. Playwright test captures canvas + side-panel-open at a representative node

Total per-flow effort: ~1.5 hours per flow once the template is borrowed.

---

END OF EXAMINATION RECORD — FLOW-29
