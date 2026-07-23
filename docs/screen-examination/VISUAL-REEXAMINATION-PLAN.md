# VISUAL-REEXAMINATION-PLAN — proper UI/UX job, PNG-grounded

> **Correction.** The four "grep-score" rounds (R0–R4, RUN-137..145) measured
> pattern matches in source code, not rendered pixels. That is not a UI/UX
> audit — it is a lint pass. This document starts over with visible pixels
> as ground truth. The v2 grep score stays as a lint metric; it does not
> count as a "round" in this plan.

## Scope (the full examination matrix)

Every rendered cell = one PNG captured by Playwright and visually read.

| Axis | Values | Count |
|------|--------|-------|
| Flows | 48 (FLOW-00..FLOW-49, minus FLOW-41/42/43 no-UI adapters and FLOW-44 in-platform-only) | 44 |
| Roles | anonymous, tenant-user, tenant-admin, platform-admin, platform-support, freelancer/business-partner (where relevant) | 4–6 per flow |
| Language | en (baseline) + he-RTL (layout flip) | 2 |
| **Viewport** | mobile (Pixel 7, 412px), tablet (iPad Air, 820px), desktop (1440px) | **3** |
| Phase states | default, empty, loading, populated, error, success | 3–6 per flow |
| Framing | external (world-facing) vs internal (admin console) | 2 (role-dependent) |

**World-facing flows MUST pass on mobile first.** Public surfaces (anonymous + tenant-user
consumer views, CMS reader, event registration, marketplace browse, completion kiosk,
review form, ads campaign view) get visual audit at all 3 viewports. Internal admin
consoles (platform-admin, platform-support, tenant-admin engine-facing) get desktop-first
audit but must degrade gracefully at ≥1024px.

Target capture count: ~600 PNGs across the matrix (sampled strategically, not the full cross-product).

## Rubric — ui-ux-pro-max P1–P10 + MARKET-REFERENCE-CATALOG grammar fit

Every PNG gets scored against:

**Per-image rubric (11 axes):**

| Axis | Source | What to check |
|------|--------|---------------|
| UX-P1 Accessibility | ui-ux-pro-max P1 | contrast ≥4.5:1, focus rings, aria-labels on icon-only buttons, color-not-only |
| UX-P2 Touch & Interaction | ui-ux-pro-max P2 | 44×44 min targets, 8px gaps, visible loading feedback |
| UX-P4 Style Selection | ui-ux-pro-max P4 | SVG icons (no emoji), consistent style, no brutalism/claymorphism mix |
| UX-P5 Layout & Responsive | ui-ux-pro-max P5 | no horizontal scroll at any of the 3 captured viewports (mobile/tablet/desktop); touch targets ≥44×44 on mobile; content reflows (not zooms); tables collapse to card stacks below 768px; sidebars collapse to hamburger below 768px |
| UX-P6 Typography & Color | ui-ux-pro-max P6 | body ≥14px, line-height 1.5, semantic tokens |
| UX-P8 Forms & Feedback | ui-ux-pro-max P8 | labels visible above inputs, error near field |
| UX-P9 Navigation | ui-ux-pro-max P9 | AppShell chrome present for internal roles, absent for anonymous/celebratory |
| **G Grammar fit** | MARKET-REFERENCE-CATALOG | does the flow render in its assigned G1–G7 grammar? |
| **R Reference parity** | MARKET-REFERENCE-CATALOG | does it resemble Stripe / Linear / n8n / Google Ads / Notion etc. for its category? |
| **H Human language** | Nielsen H2 | no camelCase field names, no engineering IDs without a human label, no SCREAMING_SNAKE enums |
| **S State legibility** | per-grammar per-state table | is the state visually distinct (empty ≠ loading ≠ populated ≠ error)? |

Each axis scored 0 (pass) / 1 (minor) / 2 (blocker).

## Round structure

| Round | Goal | How score moves |
|-------|------|-----------------|
| V-R0 baseline | capture representative sample (~50 PNGs) and record per-axis offence count per PNG | establishes baseline offences |
| V-R1 systemic | fix 3 systemic issues (AppShell chrome, BusinessStateCard rendering, page-header composition) → one change, many PNGs improve | expect 40-60% delta |
| V-R2 per-grammar | each grammar gets a reference alignment pass (G1 progress-strip for FLOW-00/11/14/19/33/45/47; G3 card-list for marketplace flows; G4 topology for 18/26/29/34; etc.) | expect 20-30% delta |
| V-R3 per-flow touch-ups | residual per-cell issues | expect 10-15% delta |
| V-R4 convergence | re-capture, re-score, declare converged if Δ < 1% | terminal |

## Convergence target — DUAL CRITERION (corrected 2026-04-21)

A round cannot declare CONVERGED under a single score-delta check. Prior rounds
V-R4..V-R8 hit the grep-countable floor and claimed convergence while 27 of 45
flows were carrying extrapolated scores and 0 of 45 had a completed
PER-IMAGE-VALIDATION-TEMPLATE block for their primary populated state. The
automated score has no weight for "does the screen show correct domain content?"
and therefore cannot, by itself, certify that the work is done.

**The convergence criterion is both of the following, evaluated on the same commit:**

1. `round_over_round_improvement_pct < 1%` — the grep-countable / surface-quality floor
   has been reached.

2. `coverage_NOT_YET_EXAMINED = 0` across the PER-IMAGE-VALIDATION-TEMPLATE matrix —
   every flow has at least one completed template block for its primary populated
   state (Axis D confirmed), and every flow flagged NEEDS_PURPOSE_BUILT_UI in its
   examination record has a completed Axis D verification confirming the purpose-
   built surface actually shipped.

Either condition alone is not sufficient. Condition 1 without condition 2 is
"we fixed the grep patterns." Condition 2 without condition 1 is "we read the
PNGs but left cosmetic leaks." CONVERGED requires both.

## Deliverables

1. `VISUAL-REEXAMINATION-PLAN.md` — this file
2. `VISUAL-ROUND-{N}-SCORES.json` — per-round offence counts per PNG per axis
3. `VISUAL-CONVERGENCE.json` — per-round total and delta (mirrors ROUND-CONVERGENCE.json but for visible metrics)
4. `docs/e2e-snapshots/<slug>/` — the actual PNGs per flow × role × state (already the existing location)
5. Per-round commit trail so each round is reproducible from history

## Hard rules during execution

- **Read every PNG we score.** No blind "assumed clean" cells.
- **Compare to the reference platform.** If FLOW-20 doesn't look like Google Ads, that is a visible offence, not just a taste disagreement.
- **Pulse every 3 minutes** with score-movement and what changed.
- **Fix the systemic issue before per-cell touch-ups** — otherwise we paper over the same leak 40 times.
