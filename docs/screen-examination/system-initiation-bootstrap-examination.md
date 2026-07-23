# Flow UI examination — FLOW-33 system-initiation-bootstrap

## Date: 2026-04-20 · Run: RUN-59 · Batch: E (Grammar 1 Progress Strip)

## One-sentence spec (F1)
> When the XIIGen engine starts for the first time, bootstrap the generation
> loop, seed the initial skills into the knowledge graph, and confirm the
> engine is capable of self-initiating the first flow.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-07.md`)
- **platform-admin** — primary bootstrap operator
- **platform-support** — read-only
- Engine-internal; no tenant/consumer surface

## Grammar
**G1 Progress Strip** — discrete bootstrap phases.
**Reference:** **Vercel deploy**, **Docker setup**, **Stripe onboarding**
(multi-phase setup wizard).

## F4 Business doc
`business_flows.zip / 33-system initiation.md`

## Classification
- **Q1 CRUD?** Likely — SystemInitiationBootstrapPage likely AdminCrudPanel default.
- **Q2 Error/empty?** Pre-bootstrap state: "Bootstrap has not yet run. Press Start to initialize the engine."
- **Q3 Engineering leak?** "Generation loop", "knowledge graph", "self-initiating" — admin audience acceptable; reword in UI if possible.
- **Q4 Role-correct?** 2-role admin scope.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) — Progress Strip layout.

## 13 existing PNGs

## Planned fixes (G1 canonical pattern)
- Phase strip: `Cold → Seeding → Indices ready → Warm → Self-verification` (5 phases)
- Per-phase chip: status icon + label + elapsed time
- Log tail auto-expanded for currently-running phase
- Retry per step (failed phase gets "Retry from this step" inline)
- Overall status bar at top with total elapsed + final verdict
