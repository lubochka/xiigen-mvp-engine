# PROPER EXAMINATION PLAN v1 — no extrapolation, full matrix coverage

**Date:** 2026-04-21
**Supersedes:** VISUAL-REEXAMINATION-PLAN.md (which described the matrix but never executed beyond axis 11)
**Authority:** EXAMINATION-GAP-ANALYSIS-2026-04-21.md

## Principles

1. **No extrapolation.** Every flow-role-language-state-viewport cell that scores PASS must be directly examined, not inferred from "unchanged since V-R4".
2. **Functional coverage first.** A PNG that renders cleanly but covers 20% of the business spec is a BLOCKER, not a pass.
3. **Subagent-isolated visual reading.** Images never enter the main context.
4. **Per-flow spec mapping.** Every flow's spec is decomposed into capability modules; the examination checks each module against the rendered PNGs.

## The 15-axis rubric (expanded)

The V-R4..V-R8 rubric had 11 axes (UX-P1/P2/P4/P5/P6/P8/P9 + G/R/H/S). It is replaced with this 15-axis rubric:

| Axis | Name | Scope |
|------|------|-------|
| UX-P1 | Accessibility | contrast, focus, aria, color-not-only |
| UX-P2 | Touch & interaction | 44×44 min targets, 8px gaps, loading feedback |
| UX-P4 | Style selection | SVG icons, consistent style |
| UX-P5 | Responsive layout | no h-scroll, reflows, breakpoints |
| UX-P6 | Typography & color | 14px body, line-height, semantic tokens |
| UX-P8 | Forms & feedback | label placement, error near field |
| UX-P9 | Navigation | AppShell correctness per role |
| G | Grammar fit | G1–G7 rendering matches assignment |
| R | Reference parity | resembles real-world platform reference |
| H | Human language | no SCREAMING_SNAKE, no XX-NN prefixes, no camelCase |
| S | State legibility | empty/loading/populated/error/success distinct |
| **12** | **Functional coverage** | **% of spec modules rendered / stubbed / missing** |
| **13** | **Role completeness** | **every applicable role has ≥1 PNG** |
| **14** | **Language completeness** | **en + he-RTL both captured** |
| **15** | **Business-state completeness** | **every `.` (missing) state in UI-REFLECTION-STATE.md has a PNG** |

### New-axis severity weights

- Axis 12 (functional coverage):
  - < 50% → **BLOCKER** (6 points)
  - 50–69% → **MAJOR** (4 points)
  - 70–89% → **MINOR** (1 point)
  - ≥ 90% → **pass**
- Axis 13 (role completeness):
  - each missing applicable role → **MAJOR** (2 points)
- Axis 14 (language completeness):
  - he-RTL missing → **MAJOR** (2 points)
  - en broken → **BLOCKER** (3 points)
- Axis 15 (business-state completeness):
  - each missing `.` state → **MINOR** (1 point)

## The new capture matrix

### Per-flow coverage requirement

For each of the 45 flows in scope:

```
minimum PNGs = (roles in flow-role-analysis) × 2 languages × 3 viewports × max(3, business-states count)
```

Realistic per-flow target: **10–20 PNGs** (not 30+, using sampling where states overlap).

### Sampling strategy

Because `45 flows × 5 roles × 2 langs × 3 viewports × 4 states = 5400 PNGs` is not tractable in one session:

- **Tier 1 (mandatory, per flow):**
  - 1 PNG per applicable role × en × 1 desktop viewport = 3–5 PNGs
  - 1 PNG per applicable role × he-RTL × 1 desktop viewport = 3–5 PNGs
  - 1 PNG per applicable role × en × mobile viewport = 3–5 PNGs
  - **Total: 9–15 PNGs per flow × 45 = 405–675 PNGs**

- **Tier 2 (conditional, per flow):**
  - 1 PNG per business state (beyond primary) × primary role × en × desktop = 2–5 PNGs per flow
  - Total: 90–225 PNGs across 45 flows

- **Tier 3 (optional):**
  - Tablet viewports (already captured in V-R4..V-R8 at 207 PNGs)

**Total new captures needed: ~500 PNGs on top of the existing 207 visual-audit PNGs.**

### Playwright spec changes required

Current `client/e2e/visual-audit-all-flows.spec.ts` assumes 1 role + 1 language per flow. Replace with:

```ts
// per-flow cell list
const CELLS: Array<{
  slug: string;
  grammar: string;
  route: string;
  role: string;
  lang: 'en' | 'he';
}> = [
  // FLOW-21 dynamic-forms-workflows example:
  { slug: 'dynamic-forms-workflows', role: 'tenant-admin', lang: 'en', ... },
  { slug: 'dynamic-forms-workflows', role: 'tenant-admin', lang: 'he', ... },
  { slug: 'dynamic-forms-workflows', role: 'tenant-user', lang: 'en', ... },
  { slug: 'dynamic-forms-workflows', role: 'tenant-user', lang: 'he', ... },
  { slug: 'dynamic-forms-workflows', role: 'anonymous', lang: 'en', ... },
  { slug: 'dynamic-forms-workflows', role: 'anonymous', lang: 'he', ... },
  // ... 6 cells per flow × 3 viewports = 18 PNGs per flow
];
```

Output path: `docs/e2e-snapshots/visual-audit/<viewport>/<slug>/<role>-<lang>-<state>.png`

## Per-flow spec mapping (Axis 12 source)

For each flow, produce a **module-coverage grid**: list the capabilities named in the flow's business spec, then mark each PRESENT / STUB / MISSING against the current implementation.

Example for FLOW-21:

| Module | Spec description | Implementation state |
|--------|------------------|----------------------|
| A. Form Definition & UI Builder | drag-drop fields, conditional rules, calcs | MISSING — no builder surface |
| B. Form Runtime Renderer | public form UI + admin preview, client-side logic | PRESENT (one demo form) |
| C. Submission Pipeline | intake → normalize → validate → spam → persist → post-process → confirm | STUB (handler wired but no submission list) |
| D. Entry Storage | submissions + meta, CSV export, lifecycle | MISSING |
| E. Notification Engine | email/SMS templates with merge tags | MISSING |
| F. Feeds / Integration Add-ons | per-form CRM/Mail/Slack rules | MISSING |
| G. Payments Module | payment fields, gateways, states | MISSING |
| H. File Uploads | secure upload, virus scan, storage, perms | MISSING |
| I. Admin Ops | audit logs, resend, re-run, RBAC | STUB (AdminCrudPanel raw browser only) |
| J. Extensibility Layer | hooks/events, REST/webhooks | MISSING |

**FLOW-21 coverage: 1 PRESENT + 2 STUB + 7 MISSING = 10% present, 30% if stubs count. BLOCKER.**

## Execution stages

### Stage 1 — Framework (this session)

1. Write this plan + gap analysis (DONE).
2. Extend capture spec to include role × language × state cells.
3. Pilot FLOW-21 end-to-end with new rubric (produce module-coverage grid + expanded captures).
4. Commit pilot output + plan so future session can resume.

### Stage 2 — Per-flow spec mapping (multi-session)

For each of 45 flows:
- Read the flow's business spec from `business flows/NN-*.md`
- Produce a module-coverage grid (like the FLOW-21 example above)
- Write to `docs/screen-examination/<slug>-coverage-grid.md`

**Estimated effort: 45 flows × 15 min/flow = ~11 hours of careful reading.**

### Stage 3 — Expanded Playwright capture (one session)

- Update `client/e2e/visual-audit-all-flows.spec.ts` with full CELLS list
- Run capture (45 flows × 5–6 cells × 3 viewports = ~800 PNGs)
- Estimated wall time: 15–25 min

### Stage 4 — Proper rescore (multi-session)

For each of 45 flows:
- Spawn a subagent with the 15-axis rubric, PNG paths, and module-coverage grid
- Subagent scores all axes including functional coverage
- Returns JSON with per-axis verdicts

**Estimated effort: 45 flows × 2–3 min per subagent (parallel 4 at a time) = ~30 min wall time.**

### Stage 5 — Fix cycle until TRUE convergence

Per-flow fixes scoped by coverage grid:
- Modules marked MISSING or STUB that the spec requires → build
- Rounds of fix-recapture-rescore until every flow has axes 12–15 = pass

**Estimated effort: unknown — depends on how many modules each flow is missing. FLOW-21 alone could be 2–5 days of implementation.**

## Deliverables this session

1. `EXAMINATION-GAP-ANALYSIS-2026-04-21.md` (DONE)
2. `PROPER-EXAMINATION-PLAN-v1.md` (this file, DONE)
3. FLOW-21 module-coverage grid: `docs/screen-examination/dynamic-forms-workflows-coverage-grid.md`
4. Expanded capture spec pilot for FLOW-21: role × language × state cells
5. Captured PNGs for FLOW-21 pilot
6. Per-axis rescore of FLOW-21 (all 15 axes)

Luba sees the FLOW-21 pilot, decides whether to approve the full 45-flow execution (Stages 2–4).

## Commitment

**No "CONVERGED" claim until every flow has been directly examined under axes 12–15.** The V-R4..V-R8 convergence claim is retracted for any dimension beyond "rendering quality of primary-role × en × populated-state captures."
