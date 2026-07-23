# Flow UI examination — FLOW-31 design-intelligence-engine

## Date: 2026-04-20 · Run: RUN-60 · Batch: F (Grammar 6 Dashboard + compound Grammar 4 Topology)

## One-sentence spec (F1)
> When a design token is updated on the XIIGen design system, extract the
> new token values, validate all dependent components for compliance, and
> publish the updated governance report.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-07.md`)
- **platform-admin** — primary; design-system operator
- **platform-support** — read-only
- **tenant-admin** — consume (when custom tenant theming is allowed)

## Grammar (compound)
- **G6 Dashboard** for governance metrics (tokens updated this week / components out-of-compliance / overall compliance %)
- **G4 Topology Canvas** for token-dependency graph (tokens → components → pages)

## Reference
**LangSmith dashboards** (experiment tracking), **W&B** (ML experiments, but pattern similar),
**Figma design-system analytics** (token usage), **Storybook design-system docs**.

## Classification
- **Q1 CRUD?** 🟡 `DesignIntelligenceEnginePage` likely AdminCrudPanel default.
- **Q2 Error/empty?** Empty token list: "Import design tokens to activate governance checks".
- **Q3 Engineering leak?** "Governance report", "compliance" — acceptable for admin audience.
- **Q4 Role-correct?** 3-role scope, mostly admin.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — dashboard + topology.

## 12 existing PNGs

## Planned fixes
- Dashboard top: 4 tiles (Tokens monitored / Recent updates 7d / Components affected / Compliance %)
- Token-dependency graph: tokens-as-nodes → components-as-nodes → pages-as-nodes (3-level hierarchy) with compliance status colour per node
- Per-token inspect: value history + affected components list + "Apply update" action
- Compliance report: card list of violations with "View in component" deep-link
