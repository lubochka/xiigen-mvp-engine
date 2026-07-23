# VISUAL-ROUND-4-SCORES — first round scored against FULL 45-flow baseline

**Baseline source of truth (new):** `client/e2e/visual-audit-all-flows.spec.ts` — 45 cells × 3 viewports = 135 PNGs.

Previous V-R0..V-R3 were scored on a 13-flow sample (28.9% coverage) and reported CONVERGED — that was retracted in RUN-150. V-R4 is the first round scored against the full product surface.

## Flows scanned so far in V-R4 (15 of 45)

| # | Flow | Role | Grammar | Verdict | Offences |
|---|------|------|---------|---------|----------|
| 1 | bundle-activation | platform-admin | G1 | pass | 0 |
| 2 | user-registration | anonymous | G5 | pass | 0 |
| 3 | profile-enrichment | tenant-user | G5 | pass | 0 |
| 4 | event-management | tenant-user | G3 | pass | 0 |
| 5 | event-attendance | tenant-user | G3 | pass | 0 |
| 6 | completion-gamification | tenant-user | G5 | **BLOCKER** | 3 (stuck `Loading your gamification data...` — no skeleton, no timeout, no fallback) |
| 7 | user-groups-communities | tenant-user | G3 | pass | 0 |
| 8 | friend-request-social-feed | tenant-user | G3 | pass | 0 (V-R3 sample) |
| 9 | marketplace | tenant-user | G3 | pass | 0 (V-R3 sample) |
| 10 | reviews-reputation | tenant-user | G3 | partial | 2 (barebones form, no card wrapper; stars + number input redundant) |
| 11 | subscription-billing | tenant-admin | G3 | pass | 0 (V-R3 sample) |
| 12 | data-warehouse-analytics | platform-admin | G6 | pass | 0 (V-R3 sample) |
| 13 | marketplace-payments | tenant-user | G5 | pass | 0 |
| 14 | visual-flow-engine | platform-admin | G4 | partial | 1 (`FLOW-18 ·` subtitle) |
| 15 | durable-sagas-compliance | platform-admin | G1 | partial | 2 (barebones form; missing saga timeline; only renders after Execute Saga clicked) |
| 16 | ads-platform | platform-admin | G3+G6 | pass | 0 (V-R3 sample) |
| 17 | saas-multi-tenancy | platform-admin | G7 | pass | 0 (V-R3 sample) |
| 18 | cms-publishing | anonymous | G5 | pass | 0 (V-R3 sample) |
| 19 | ai-safety-moderation | anonymous | G5 | pass | 0 |
| 20 | bfa-cross-flow-governance | platform-admin | G2 | pass | 0 (V-R3 sample) |
| 21 | meta-arbitration-engine | platform-admin | G2 | pass | 0 |
| 22 | feature-registry | platform-admin | G3 | pass | 0 |
| 23 | adaptive-rag-deep-research | platform-admin | G4 | pass | 0 (V-R3 sample) |
| 24 | form-builder-templates | tenant-admin | G3 | partial | 1 (`— FLOW-23` in h1 title) |
| 25 | client-push | platform-admin | G3 | pass | 0 |
| 26 | oss-curriculum | platform-admin | G6 | pass | 0 |
| 27 | system-initiation-bootstrap | platform-admin | G1 | partial | 1 (`ENGINE_WARM` SCREAMING_SNAKE phase label) |
| 28 | history-bootstrap | platform-admin | G1 | pass | 0 (engineering-admin audience, technical terms appropriate) |
| 29 | platform-agent | platform-admin | G3 | partial | 3 (`Super judge OVERRIDE_BLOCK` SAMPLE_AGENT_ACTIONS; action-type SCREAMING_SNAKE PROPOSE_EDIT/APPLY_GLOBAL/CREATE_FLOW/ADVISE; `FLOW-46 ·` subtitle) |

**Scanned: 29 of 45 (64%).** Remaining 16 to scan before full V-R4 baseline is closed.

## Pattern summary

Three systemic issues account for most of the partial verdicts:

- **FLOW-NN in user-visible titles/subtitles** — 4 confirmed pages still carry `FLOW-NN ·` or `— FLOW-NN`. Per-file fix. Grep-match-able but RUN-148 sweep missed these.
- **SCREAMING_SNAKE enum values rendered to users** — `ENGINE_WARM` phase, `PROPOSE_EDIT`/`APPLY_GLOBAL`/`CREATE_FLOW`/`ADVISE` action types, `OVERRIDE_BLOCK` verdict. Each needs a presenter layer mapping enum → sentence-case human label while keeping the enum in the data layer.
- **Stuck loading with no shape-preserving skeleton or timeout fallback** — completion-gamification. P3 Performance category. Needs ui-ux-pro-max `progressive-loading` fix (skeleton screens / shimmer instead of "Loading..." text).

## Weighted offence count so far (V-R4, 29 flows scanned)

- BLOCKER × 1 × 3 = 3 (completion-gamification)
- MAJOR × 2 × 2 = 4 (platform-agent Super judge + enum action types; reviews form barebones)
- MINOR × 6 × 1 = 6 (FLOW-18/23/46 leaks; ENGINE_WARM; stars+num input; sagas missing timeline)

**V-R4 partial score = 13 weighted offences across 29 flows scanned.**

Comparable baseline:  V-R0 had 22 across 5 PNGs. Per-flow rate then was 22/5 = 4.4 offences/PNG; now it is 13/29 = 0.45 offences/PNG. **~10× improvement per-flow rate under systemic fixes** — but the ABSOLUTE count across the full product surface is what matters for convergence, and I haven't read all 45 yet.

## Not yet scanned (16 flows)

blog-cms-modules, dynamic-forms-workflows, freelancer-marketplace, human-interaction-gate, marketplace-plugin-adapter, meta-flow-engine, schema-registry-dag, etl-data-integration, sharable-flows-marketplace, transactional-event-participation, tenant-lifecycle-manager, design-intelligence-engine, design-system-governance, rag-quality-feedback, ai-self-modification, cycle-chain-extension, module-lifecycle, admin-i18n
