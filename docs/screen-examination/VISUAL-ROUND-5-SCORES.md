# VISUAL-ROUND-5-SCORES — convergence round after RUN-155 systemic fixes

**Date:** 2026-04-21
**Branch:** claude/pensive-tereshkova-baf347
**Baseline:** cc64905c (RUN-155 V-R5 systemic fixes)
**Capture:** b67d0df7 (RUN-156 PNG recapture, 141/141 Playwright pass)
**Rescore method:** 4 parallel subagent batches (21 flows × 3 viewports = 63 PNGs examined)

## Score table (21 flows rescored)

| Flow | Role | Grammar | V-R4 | V-R5 | Delta | Verdict |
|------|------|---------|------|------|-------|---------|
| meta-flow-engine | platform-admin | G4 | 9 | 2 | **-7** | partial |
| rag-quality-feedback | platform-admin | G6 | 5 | 0 | **-5** | **pass** |
| ai-self-modification | platform-admin | G3 | 8 | 1 | **-7** | partial |
| cycle-chain-extension | platform-admin | G1 | 9 | 2 | **-7** | partial |
| human-interaction-gate | platform-admin | G2 | 4 | 0 | **-4** | **pass** |
| visual-flow-engine | platform-admin | G4 | 6 | 3 | -3 | pass |
| tenant-lifecycle-manager | platform-admin | G6 | 6 | 5 | -1 | partial |
| design-intelligence-engine | platform-admin | G6 | 7 | 5 | -2 | partial |
| marketplace-plugin-adapter | platform-admin | G4 | 7 | 5 | -2 | **BLOCKER** (canvas) |
| platform-agent | platform-admin | G3 | 3 | 4 | +1 | partial (TNT regression) |
| dynamic-forms-workflows | tenant-admin | G7 | 10 | 2 | **-8** | partial |
| freelancer-marketplace | freelancer | G3 | 3 | 0 | **-3** | **pass** |
| etl-data-integration | platform-admin | G1 | 2 | 1 | -1 | partial |
| sharable-flows-marketplace | platform-admin | G3 | 3 | 0 | **-3** | **pass** |
| design-system-governance | platform-admin | G2 | 2 | 5 | +3 | MAJOR (T-NN unscored prior) |
| system-initiation-bootstrap | platform-admin | G1 | 1 | 0 | -1 | **pass** |
| marketplace | tenant-user | G3 | 2 | 4 | +2 | partial (regression) |
| bundle-activation | platform-admin | G1 | 1 | 1 | 0 | pass |
| user-registration | anonymous | G5 | 0 | 0 | 0 | pass |
| completion-gamification | tenant-user | G5 | 2 | 2 | 0 | partial |
| transactional-event-participation | tenant-user | G5 | 0 | 0 | 0 | pass |

### Aggregate

- **V-R5 total (21 rescored):** 42 offences (was 90, -48 = **-53%**)
- **Non-rescored 24 flows carry V-R4 scores:** ~14 offences (estimate)
- **V-R5 full estimate:** 56 offences / 45 flows = **1.24 per-flow rate** (was 2.3)
- **Delta vs V-R4: -48 offences / -46% improvement**

### Verdicts now

- **pass:** 33 flows (from 27)
- **partial:** 10 flows
- **MAJOR:** 1 flow (design-system-governance)
- **BLOCKER:** 1 flow (marketplace-plugin-adapter canvas responsive)

## Systemic patterns still present (V-R6 targets)

1. **SCREAMING_CAPS section headers everywhere** (NODES, CONNECTIONS, TENANTS, AGENT STATUS, ADAPTER LIFECYCLE, PATTERN REGISTRY, CROSS-TENANT FINDINGS, PENDING SECURITY SCAN, etc.) — shared component fix will move ~6+ flows
2. **Status/severity badges SCREAMING** (ACTIVE, SUSPENDED, OFFBOARDING, APPROVED, DEPRECATED, HIGH, MEDIUM) — shared Badge component fix
3. **marketplace-plugin-adapter canvas responsive BLOCKER** — needs mobile fallback to list view
4. **TNT-* leak on platform-agent Tenant Scope** — per-row subtitle component fix
5. **DSG T-NN + dep-slug leaks** (T617, T621, T624, node-express, python-fastapi) — per-file humanization
6. **DFW tip mentions `viewerRole`** — 1 string fix
7. **ETL DEV footer still visible** — import.meta.env.DEV === true in Playwright dev mode; use different approach (delete line)
8. **marketplace REGRESSION** — "We couldn't load the marketplace" error shown; investigate data fetch path
9. **Adaptive-RAG topology renders all 27 nodes at once** — Luba directive 2026-04-21 violation; S11 drill-down implementation required (MAJOR)

## V-R6 fix plan

- V-R6-S1 (bulk shared-component): Case-fix Badge + section headers → move 6+ flows
- V-R6-S2 (marketplace regression): investigate + fix
- V-R6-S3 (DSG T-NN): humanize task-type IDs + dep-slug labels
- V-R6-S4 (DFW + ETL): remove remaining DSL / DEV footer strings
- V-R6-S5 (MPA canvas responsive): mobile list-fallback for G4 canvas
- V-R6-S6 (TNT per-row fix): extend BusinessStateCard pattern to list-row subtitles
- V-R6-S7 (topology drill-down): implement progressive disclosure for G4 flows (FLOW-18/26/29/34), starting with adaptive-rag-deep-research

## Convergence estimate after V-R6

If V-R6 lands the 7 systemic fixes:
- S1 (casing sweep) — estimated -10 offences
- S2 (marketplace) — estimated -2
- S3 (DSG) — estimated -4
- S4 (DFW+ETL) — estimated -2
- S5 (MPA canvas) — estimated -5 (BLOCKER→partial)
- S6 (TNT per-row) — estimated -2
- S7 (topology drill-down) — establishes pattern, score impact partial

Expected V-R6 total: ~31 / 45 flows = **0.69 per-flow rate**
Expected V-R7: ~20 / 45 = **0.44 per-flow rate** → approaches <1% convergence
