# Flow UI examination — FLOW-26 meta-flow-engine

## Date: 2026-04-20 · Run: RUN-54 · Batch: A (Grammar 4 Topology Canvas)

## One-sentence spec (F1)
> When the XIIGen engine identifies a capability gap, generate the contract
> for a new meta-flow, extend the engine with the generated service, and
> register the extension with the BFA conflict detector.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-06.md`)
- **platform-admin** — primary; manages meta-flow routing config, inspects live dispatches, troubleshoots routing decisions. Full canvas + config editor + dispatch stream.
- **platform-support** — read-only debug. Per-trace inspector.
- **all other roles** — excluded. Engine-internal.

## State inventory (F2)
24 processes, **all INTERNAL_ONLY**. Engine mechanics: bfa-conflict-scanner,
code-assembly-orchestrator, code-scaffold-generator, contract-code-emitter,
cross-flow-impact-analyzer, dna-compliance-checker, extension-health-scorer,
factory-registrar, flow-dependency-mapper, flow-deployment-gate,
flow-evolution-tracker, flow-quality-gate, flow-registration-orchestrator,
flow-spec-parser, flow-spec-validator, flow-template-resolver,
meta-flow-audit-emitter, meta-flow-orchestrator, seed-prompt-registrar, + 5 more.

**Every process is missing all 5 UI states** in UI-REFLECTION-STATE (`initiate`,
`in_progress`, `result`, `error`, `next_step`). The existing
`MetaFlowEnginePage.tsx` (612 lines) derives 5 runtime states from the plan
backbone: `FLOW_REGISTERED → GENERATION_RUNNING → REVIEW_GATE → PUBLISHED → FAILED`
plus server-service states (code-assembly, five-arbiter-consensus,
dna-compliance).

## Business intent (F4)
No business_flows zip entry. Engine-internal.

## Real-world reference (MARKET-REFERENCE-CATALOG §4 · G4)
- **Primary:** n8n meta-workflow view; Temporal UI; Airflow DAG.
- **Key pattern:** topology of flows (flow-as-node); state colour per flow node;
  side panel with currently-inspected flow's traces; action bar (trigger / pause
  / resume / rollback) gated to platform-admin.

## Existing page (`MetaFlowEnginePage.tsx`, 612 lines)

Header comment confirms:
- `?mock=<key>` → BusinessStateCard for the 5 derived states.
- no `?mock` → role-scoped view (RUN-35).
- Role-aware: platform-admin (full controls) / platform-support (aria-disabled) / fallback ("internal platform tool" notice).

## Classification (Step A)

- **Q1 CRUD?** 🟡 **Partial** — RUN-35 role-scoped view is NOT a CRUD table, but the page stack still includes `AdminCrudPanel` fallback paths. No topology canvas. Not Grammar-4-complete.
- **Q2 Error/empty as normal?** Needs PNG inspection; 23 PNGs exist.
- **Q3 Engineering leak?** 🟡 **Very likely** — 9 PNGs named `01..09-dna-*.png` render DNA rule text as visible UI (same pattern as FLOW-18 SUCCESS_CRITERIA leak and FLOW-29 `state-1-flow-has`). Needs confirmation but filename strongly suggests leak.
- **Q4 Role-correct?** ✅ 3 branches documented in code.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — current page is config editor + action buttons + AdminCrudPanel; should be a topology canvas with flow-as-node (matching FLOW-29 reference implementation, Grammar 4). Also NEEDS_LABEL_SANITISATION (P1) for the 9+ DNA/state mock PNGs that leak engineering text.

## UI/UX Pro Max / Impeccable (inferred from code inspection)

- **P1 color-not-only** ❓ need PNG inspection
- **P9 nav-state-active** ✅ RUN-49 G2
- **P9 drawer-usage** ✅ RUN-49 G3 (admin-only page)
- **H1 Visibility of System Status** ❓ — page has state icons (CheckCircle2, XCircle, Clock, Lock) per imports, good start
- **H2 Match Real-world** ❓ — "GENERATION_RUNNING", "REVIEW_GATE", "PUBLISHED" are human-readable; good. But flow-slug identifiers may leak.
- **H8 Minimalist** ❓ needs PNG inspection
- **H9 Error Recovery** ❓ — page has FAILED state; need to verify retry path exists

## Planned fixes (for later RUN; docs-only this run)

**P0 — Topology Canvas rebuild (Grammar 4):**
Port FLOW-29 topology canvas pattern to FLOW-26:
- Replace the 5-state stack with a meta-flow topology: each registered flow = a node; edges = flow-to-flow handoffs (when FLOW-A emits an event consumed by FLOW-B); phase groups = lifecycle phase (REGISTERED / GENERATING / PUBLISHED / DEPRECATED).
- Side panel on node click: flow ID + current state + recent dispatches + trigger/pause action (platform-admin) or read-only (platform-support).
- Path-summary collapsible table as Chart #25 A11y fallback.
- Use FLOW-29 design tokens (cold precision, slate foundation, domain-specific colour aliases).

**P1 — Delete the 9 DNA-rule mock PNGs** (01..09) and 5 state-1..5-dna-*.png duplicates — BFA mock engineering leak.

**P1 — Replace "FLOW-26" slug leak** in any visible header with "Meta Flow Engine".

**P2 — Regenerate post-RUN-49 PNGs** for platform-admin full canvas and platform-support read-only.

## FLOW-26 inventory rows (appended to PNG-INVENTORY.md)

See the FLOW-26 section in `docs/screen-examination/PNG-INVENTORY.md`.

## Next action

RUN-55 examines FLOW-34 (marketplace-plugin-adapter, last of Batch A). After
Batch A docs complete, sweep run rebuilds FLOW-26 + FLOW-18 + FLOW-34 pages
as proper Grammar-4 topology canvases following the FLOW-29 recipe.
