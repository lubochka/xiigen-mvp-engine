# VISUAL-ROUND-4-FULL-SCORES — FULL 45-flow visual audit (RUN-154)

**Date:** 2026-04-21
**Branch:** claude/pensive-tereshkova-baf347
**Capture source:** `client/e2e/visual-audit-all-flows.spec.ts` (45 flows × 3 viewports = 135 PNGs)
**Scoring method:** 4 parallel subagent examinations (batches A/B/C/D) + 29 prior V-R4 entries (VISUAL-ROUND-4-SCORES.md)
**Rubric:** 11-axis VISUAL-REEXAMINATION-PLAN.md (UX-P1/P2/P4/P5/P6/P8/P9 + G/R/H/S)
**Severity weights:** BLOCKER=3, MAJOR=2, MINOR=1
**Resume sources:** `.tmp-batch-A.json`, `.tmp-batch-B.json`, `.tmp-batch-C.json`, `.tmp-batch-D.json`

## Coverage

- **Flows scanned:** 45/45 (100%)
- **PNGs examined:** 135 (3 viewports × 45 flows)
- **Fresh captures:** 2026-04-21 (includes RUN-151/152/153 fixes)

## Score

| Verdict band | Count | Flows |
|--------------|-------|-------|
| **pass** (0 offences) | 27 | bundle-activation, user-registration, profile-enrichment, event-management, event-attendance, user-groups-communities, friend-request-social-feed, marketplace, subscription-billing, data-warehouse-analytics, marketplace-payments, ads-platform, saas-multi-tenancy, cms-publishing, ai-safety-moderation, bfa-cross-flow-governance, meta-arbitration-engine, feature-registry, adaptive-rag-deep-research, client-push, oss-curriculum, history-bootstrap, blog-cms-modules, **completion-gamification** (fixed), **transactional-event-participation** (fixed) |
| **partial** (MINOR only) | 9 | reviews-reputation, form-builder-templates, system-initiation-bootstrap, design-system-governance, schema-registry-dag, etl-data-integration, sharable-flows-marketplace, module-lifecycle, admin-i18n |
| **MAJOR** (1+ MAJOR) | 7 | platform-agent, meta-flow-engine, tenant-lifecycle-manager, design-intelligence-engine, rag-quality-feedback, ai-self-modification, cycle-chain-extension, visual-flow-engine, freelancer-marketplace, human-interaction-gate |
| **BLOCKER** (1+ BLOCKER) | 2 | dynamic-forms-workflows, marketplace-plugin-adapter |

**Total weighted offences: ~104**
  - Prior 29 flows (V-R4 up to RUN-153): 13 offences
  - Batch A (5 flows): 24
  - Batch B (5 flows): 29
  - Batch C (6 flows): 31
  - Batch D (5 rescored, 2 flows fixed from prior): 7

**Per-flow offence rate: 104/45 = 2.3** — far from <1% convergence target.

## Pattern summary — by frequency (systemic fixes that move many PNGs)

| # | Pattern | Flows affected | Severity | Fix scope |
|---|---------|----------------|----------|-----------|
| 1 | **FLOW-NN / internal ID leaks in user-visible copy** | ~10 (meta-flow, rag-feedback, ai-self-mod, cycle-chain, hig, sharable, vfe, platform-agent, dynamic-forms, mpa) | MAJOR | per-file; grep `FLOW-NN ·` + raw prefix patterns |
| 2 | **Grammar grammar mismatch** | 9 (G6→list: tlm/die/rqf; G1→cards: cyx/mlc; G7→form: dfw; G3 on form route: fm/rr; G4 responsive: mpa/vfe/mfe) | MAJOR | per-flow page rewrite against MARKET-REFERENCE-CATALOG §1-7 |
| 3 | **Raw Index / admin debug card stuck Loading** | 4 (meta-flow, tlm, die, ai-self-mod) | MAJOR | single-component fix in AdminCrudPanel: gate behind dev flag OR fix data source wiring |
| 4 | **SCREAMING_SNAKE enum values rendered to user** | 3+ (cycle-chain hooks, sys-init ENGINE_WARM, platform-agent) | MAJOR | presenter layer mapping enum → human label |
| 5 | **Canvas grammar (G4) breaks below desktop** | 3 (mpa, vfe, mfe) | BLOCKER/MAJOR | zoom-to-fit + mobile fallback list view |
| 6 | **Missing AppShell for internal tenant routes** | 2 (dfw, fm) | MAJOR | whitelist tenant-user internal routes |
| 7 | **Unicode escape literal \\u2014 rendered** | 1 (sharable-flows) | MAJOR | fix JSON-to-render decoding |
| 8 | **Dev banner persists / debug affordances leak** | ~8 admin routes | MINOR-MAJOR | gate dev UI behind NODE_ENV |
| 9 | **Monospace code-style identifiers dominate hierarchy** | 3 (cyx, mlc, etl) | MINOR | typography demotion for IDs |

## V-R5 fix strategy (sequenced by impact)

**Systemic Fix 1 (S1) — FLOW-NN + internal-ID sweep**
- Grep all client/src for `FLOW-\d{2,3}`, `T\d{3}`, `CF-\d{3}`, `ui-\d{10,}`, `[A-Z]{2,4}-\d{4}-\d{4}-\d+` in JSX render paths
- Map each to a human label via a presenter helper `humanizeArtifactId(id)`
- Sweep affected files; expect ~10 flows to improve

**Systemic Fix 2 (S2) — Raw Index card gating**
- Find AdminCrudPanel Raw Index rendering
- Gate behind `import.meta.env.DEV` OR fix the loading state
- Expect ~4 flows to improve

**Systemic Fix 3 (S3) — SCREAMING_SNAKE enum presenter**
- Create `sentenceCase(enumStr)` helper (or extend existing if present)
- Apply to cycle-chain hook names + sys-init phase labels + platform-agent actions

**Systemic Fix 4 (S4) — Dev banner NODE_ENV gate + dismiss-sticky**
- `ProviderKeysBanner` → only render when `import.meta.env.DEV || role === 'platform-admin' && hasMissingKeys`
- Persist dismiss state in localStorage

**Systemic Fix 5 (S5) — Unicode em-dash fix**
- Find sharable-flows raw-index subtitle — replace `\\u2014` with literal `—`

**Systemic Fix 6 (S6) — G6 Dashboard rebuild (3 flows)**
- tenant-lifecycle-manager, design-intelligence-engine, rag-quality-feedback
- Add KPI tile row + trend chart/sparkline per Stripe Billing/Linear Insights reference
- Per-flow work; not bulk

**Systemic Fix 7 (S7) — G4 Canvas responsive**
- marketplace-plugin-adapter, visual-flow-engine, meta-flow-engine
- Below 768px: swap canvas for "View as list" of nodes + edges
- Shared component change across all 3 flows

**Systemic Fix 8 (S8) — G7 Settings Tabs for dynamic-forms-workflows**
- BLOCKER fix: rewrite page to tabbed Settings layout (Notion/Linear reference)
- Hide raw DSL (`condition:`, `viewerRole`, field slug arrays) behind preview

**Systemic Fix 9 (S9) — G1 Progress Strip for cycle-chain + module-lifecycle**
- Per-flow rewrite; adds pipeline step strip above current card list

**Systemic Fix 10 (S10) — AppShell whitelist for tenant-user**
- dynamic-forms-workflows, freelancer-marketplace
- Check route table — add AppShell wrapper

## Expected delta after V-R5 systemic fixes

- S1-S5 (bulk sweeps): ~40-60 offences cleared → ~50 remaining
- S6-S9 (per-flow rewrites): ~20-30 offences cleared → ~20 remaining
- S10: ~5 offences cleared → ~15 remaining

Target after V-R5: score ≤ 15 (~85% reduction); per-flow rate ~0.3.
Target after V-R6: score ≤ 5 (~95% reduction); per-flow rate ~0.1 = **≤1% convergence**.

## Session resume info

- **Source of truth for V-R4 scores:** this file + `.tmp-batch-{A,B,C,D}.json`
- **Capture spec:** `client/e2e/visual-audit-all-flows.spec.ts`
- **PNG baseline:** `docs/e2e-snapshots/visual-audit/{chromium-desktop,chromium-tablet,chromium-mobile}/<slug>/primary-<role>.png`
- **Rubric:** `docs/screen-examination/VISUAL-REEXAMINATION-PLAN.md` + `PER-IMAGE-VALIDATION-TEMPLATE.md`
- **Prior scoring (29 flows):** `docs/screen-examination/VISUAL-ROUND-4-SCORES.md`

## Next action (V-R5)

1. Commit this file + tmp JSONs for resume safety.
2. Apply S1 FLOW-NN sweep + S5 em-dash + S3 enum presenter in one commit (bulk greppable).
3. Apply S2 Raw Index gate + S4 dev banner gate in one commit.
4. Apply S10 AppShell whitelist in one commit.
5. Apply S6 G6 dashboards (3 flows) one per commit.
6. Apply S7 G4 responsive canvas (1 shared component commit).
7. Apply S8 G7 tabs rewrite (dfw).
8. Apply S9 G1 progress strip (cyx + mlc).
9. Re-capture PNGs.
10. Rescore V-R5.
