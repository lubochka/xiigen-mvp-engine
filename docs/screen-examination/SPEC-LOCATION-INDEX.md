# SPEC LOCATION INDEX — per-flow inventory of the 6 governing files

**Purpose.** `SPEC-LOCATION-MAP.md` (sibling doc) defines *which file answers
which question* in the abstract. This index applies that map to every flow:
for FLOW-XX, which of the 6 files exists, at what exact repo path, and which
external zip file substitutes when a repo file is missing.

**When to use this file.** Before opening any PNG for FLOW-XX, open this
index's row for that flow, then open each of the files listed. Total reading
time is ~8 minutes per flow (per the read order in SPEC-LOCATION-MAP).

---

## Legend

| Cell | Meaning |
|------|---------|
| `✅ <path>` | File exists in repo at the path shown |
| `❌ no-repo` | File not in repo for this flow; fall back to Source 4 (business zip) or Source 5 (market catalog) |
| `F1` | `FLOW-XX-STEP-1-INVARIANTS.md` — user_intent sentence |
| `F2` | `UI-REFLECTION-STATE.md` — per-process state table + React component paths |
| `F3` | `ROLE-ANALYSIS-BATCH-NN.md` — role-visibility matrix (covers a range of flows) |
| `F4` | `business_flows.zip / NN-flow-name.md` — business intent (external; not in repo) |
| `F5` | `FLOW-XX-DESIGN-SIMULATION-R1.md` — end-to-end screenplay |
| `F6` | `FLOW-XX-RECONCILIATION-STATE.md` — built vs designed audit |

**Also available per flow (not part of the 6 but useful):**
- `flow-ui-automation.json` — UI phase requirements + "uiRequired" classification
- `viz/` — existing SVG/PNG design references
- `{FLOW-XX}-IMPL-STATE.json` — canonical phase completion state
- `{FLOW-XX}-IMPLEMENTATION-PLAN-v1.md` — the plan of record (FLOW-25+ only)

---

## The complete index — 48 flows

All repo paths are relative to branch `claude/pensive-tereshkova-baf347`.

| Flow | Slug | F1 intent | F2 states | F3 roles | F4 business | F5 design-sim | F6 reconciliation |
|------|------|-----------|-----------|----------|-------------|---------------|-------------------|
| FLOW-00 | bundle-activation | ❌ no-repo | ❌ no-repo | `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` + `RUN-01-FINAL-BATCH-5-RECON.md` | ❌ no business doc | ❌ no-repo | ❌ no-repo |
| FLOW-01 | user-registration | ✅ `docs/sessions/FLOW-01/FLOW-01-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-01/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` | `business_flows.zip / 01-user-registration.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-01/FLOW-01-RECONCILIATION-STATE.md` |
| FLOW-02 | profile-enrichment | ✅ `docs/sessions/FLOW-02/FLOW-02-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-02/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` | `business_flows.zip / 02-business-onboarding.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-02/FLOW-02-RECONCILIATION-STATE.md` |
| FLOW-03 | event-management | ✅ `docs/sessions/FLOW-03/FLOW-03-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-03/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` | `business_flows.zip / 03-event-creation-promotion.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-03/FLOW-03-RECONCILIATION-STATE.md` |
| FLOW-04 | event-attendance | ✅ `docs/sessions/FLOW-04/FLOW-04-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-04/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` | ❌ no entry in zip — inferred from FLOW-03 + FLOW-09 | ❌ no-repo | ✅ `docs/sessions/FLOW-04/FLOW-04-RECONCILIATION-STATE.md` |
| FLOW-05 | completion-gamification | ✅ `docs/sessions/FLOW-05/FLOW-05-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-05/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` | `business_flows.zip / 05-lesson-completion-gamification.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-05/FLOW-05-RECONCILIATION-STATE.md` |
| FLOW-06 | user-groups-communities | ✅ `docs/sessions/FLOW-06/FLOW-06-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-06/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` | `business_flows.zip / 06-marketplace-publishing.md` (marketplace theme) | ❌ no-repo | ✅ `docs/sessions/FLOW-06/FLOW-06-RECONCILIATION-STATE.md` |
| FLOW-07 | friend-request-social-feed | ✅ `docs/sessions/FLOW-07/FLOW-07-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-07/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` | `business_flows.zip / 04-post-publishing.md` + `07-friend-request-feed-integration.md` | ✅ `docs/sessions/FLOW-07/FLOW-07-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-07/FLOW-07-RECONCILIATION-STATE.md` |
| FLOW-08 | marketplace | ✅ `docs/sessions/FLOW-08/FLOW-08-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-08/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` | `business_flows.zip / 06-marketplace-publishing.md` | ✅ `docs/sessions/FLOW-08/FLOW-08-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-08/FLOW-08-RECONCILIATION-STATE.md` |
| FLOW-09 | transactional-event-participation | ✅ `docs/sessions/FLOW-09/FLOW-09-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-09/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` | `business_flows.zip / 09-event-participation.md` | ✅ `docs/sessions/FLOW-09/FLOW-09-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-09/FLOW-09-RECONCILIATION-STATE.md` |
| FLOW-10 | reviews-reputation | ✅ `docs/sessions/FLOW-10/FLOW-10-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-10/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` | `business_flows.zip / 10-shops modules.md` (commerce theme) | ✅ `docs/sessions/FLOW-10/FLOW-10-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-10/FLOW-10-RECONCILIATION-STATE.md` |
| FLOW-11 | schema-registry-dag | ✅ `docs/sessions/FLOW-11/FLOW-11-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-11/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` | `business_flows.zip / 11-social network modules.md` (partial — engine flow) | ❌ no-repo | ✅ `docs/sessions/FLOW-11/FLOW-11-RECONCILIATION-STATE.md` |
| FLOW-12 | subscription-billing | ✅ `docs/sessions/FLOW-12/FLOW-12-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-12/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` | `business_flows.zip / 12 - ERP systems.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-12/FLOW-12-RECONCILIATION-STATE.md` |
| FLOW-13 | data-warehouse-analytics | ✅ `docs/sessions/FLOW-13/FLOW-13-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-13/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` | `business_flows.zip / 13 - finance.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-13/FLOW-13-RECONCILIATION-STATE.md` |
| FLOW-14 | etl-data-integration | ✅ `docs/sessions/FLOW-14/FLOW-14-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-14/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` | ❌ infer from FLOW-13 finance context | ❌ no-repo | ✅ `docs/sessions/FLOW-14/FLOW-14-RECONCILIATION-STATE.md` |
| FLOW-15 | saas-multi-tenancy | ✅ `docs/sessions/FLOW-15/FLOW-15-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-15/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` | `business_flows.zip / 08-multi tenant deep-research-report 1.md` + `2.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-15/FLOW-15-RECONCILIATION-STATE.md` |
| FLOW-16 | marketplace-payments | ✅ `docs/sessions/FLOW-16/FLOW-16-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-16/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` | `business_flows.zip / 10-shops modules.md` (checkout section) | ❌ no-repo | ✅ `docs/sessions/FLOW-16/FLOW-16-RECONCILIATION-STATE.md` |
| FLOW-17 | freelancer-marketplace | ✅ `docs/sessions/FLOW-17/FLOW-17-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-17/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` | ❌ infer from marketplace docs + Upwork/Fiverr reference | ❌ no-repo | ✅ `docs/sessions/FLOW-17/FLOW-17-RECONCILIATION-STATE.md` |
| FLOW-18 | visual-flow-engine | ✅ `docs/sessions/FLOW-18/FLOW-18-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-18/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` | ❌ no business doc — reference is n8n / Zapier | ❌ no-repo | ✅ `docs/sessions/FLOW-18/FLOW-18-RECONCILIATION-STATE.md` |
| FLOW-19 | durable-sagas-compliance | ✅ `docs/sessions/FLOW-19/FLOW-19-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-19/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` | ❌ no business doc — engine-internal | ❌ no-repo | ✅ `docs/sessions/FLOW-19/FLOW-19-RECONCILIATION-STATE.md` |
| FLOW-20 | ads-platform | ✅ `docs/sessions/FLOW-20/FLOW-20-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-20/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` | `business_flows.zip / 13 - finance.md` (partial — ads revenue) | ❌ no-repo | ✅ `docs/sessions/FLOW-20/FLOW-20-RECONCILIATION-STATE.md` |
| FLOW-21 | dynamic-forms-workflows | ✅ `docs/sessions/FLOW-21/FLOW-21-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-21/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` | ❌ reference is Typeform / Google Forms | ❌ no-repo | ✅ `docs/sessions/FLOW-21/FLOW-21-RECONCILIATION-STATE.md` |
| FLOW-22 | cms-publishing | ✅ `docs/sessions/FLOW-22/FLOW-22-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-22/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` | `business_flows.zip / 04-post-publishing.md` | ❌ no-repo | ✅ `docs/sessions/FLOW-22/FLOW-22-RECONCILIATION-STATE.md` |
| FLOW-23 | form-builder-templates | ✅ `docs/sessions/FLOW-23/FLOW-23-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-23/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` | ❌ reference is Typeform template gallery | ❌ no-repo | ✅ `docs/sessions/FLOW-23/FLOW-23-RECONCILIATION-STATE.md` |
| FLOW-24 | ai-safety-moderation | ✅ `docs/sessions/FLOW-24/FLOW-24-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-24/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` | ❌ reference is Discord AutoMod + Reddit modqueue | ❌ no-repo | ✅ `docs/sessions/FLOW-24/FLOW-24-RECONCILIATION-STATE.md` |
| FLOW-25 | bfa-cross-flow-governance | ✅ `docs/sessions/FLOW-25/FLOW-25-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-25/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-25/FLOW-25-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-25/FLOW-25-RECONCILIATION-STATE.md` |
| FLOW-26 | meta-flow-engine | ✅ `docs/sessions/FLOW-26/FLOW-26-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-26/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-26/FLOW-26-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-26/FLOW-26-RECONCILIATION-STATE.md` |
| FLOW-27 | human-interaction-gate | ✅ `docs/sessions/FLOW-27/FLOW-27-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-27/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-27/FLOW-27-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-27/FLOW-27-RECONCILIATION-STATE.md` |
| FLOW-28 | blog-cms-modules | ✅ `docs/sessions/FLOW-28/FLOW-28-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-28/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` | `business_flows.zip / 04-post-publishing.md` (long-form) | ✅ `docs/sessions/FLOW-28/FLOW-28-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-28/FLOW-28-RECONCILIATION-STATE.md` |
| FLOW-29 | adaptive-rag-deep-research | ✅ `docs/sessions/FLOW-29/FLOW-29-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-29/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-29/FLOW-29-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-29/FLOW-29-RECONCILIATION-STATE.md` |
| FLOW-30 | tenant-lifecycle-manager | ✅ `docs/sessions/FLOW-30/FLOW-30-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-30/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` | `business_flows.zip / 08-multi tenant deep-research-report*` | ✅ `docs/sessions/FLOW-30/FLOW-30-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-30/FLOW-30-RECONCILIATION-STATE.md` |
| FLOW-31 | design-intelligence-engine | ✅ `docs/sessions/FLOW-31/FLOW-31-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-31/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-31/FLOW-31-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-31/FLOW-31-RECONCILIATION-STATE.md` |
| FLOW-32 | sharable-flows-marketplace | ✅ `docs/sessions/FLOW-32/FLOW-32-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-32/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` | `business_flows.zip / 32-sharable flows.md` | ✅ `docs/sessions/FLOW-32/FLOW-32-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-32/FLOW-32-RECONCILIATION-STATE.md` |
| FLOW-33 | system-initiation-bootstrap | ✅ `docs/sessions/FLOW-33/FLOW-33-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-33/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` | `business_flows.zip / 33-system initiation.md` | ✅ `docs/sessions/FLOW-33/FLOW-33-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-33/FLOW-33-RECONCILIATION-STATE.md` |
| FLOW-34 | marketplace-plugin-adapter | ✅ `docs/sessions/FLOW-34/FLOW-34-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-34/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` | `business_flows.zip / 34-translate to alternatives.md` | ✅ `docs/sessions/FLOW-34/FLOW-34-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-34/FLOW-34-RECONCILIATION-STATE.md` |
| FLOW-35 | meta-arbitration-engine | ✅ `docs/sessions/FLOW-35/FLOW-35-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-35/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` | ❌ **no entry in business zip** — engine-internal | ✅ `docs/sessions/FLOW-35/FLOW-35-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-35/FLOW-35-RECONCILIATION-STATE.md` |
| FLOW-36 | feature-registry (**CFI-05 Potemkin**) | ✅ `docs/sessions/FLOW-36/FLOW-36-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-36/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` | ❌ **no entry in business zip** — engine-internal | ✅ `docs/sessions/FLOW-36/FLOW-36-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-36/FLOW-36-RECONCILIATION-STATE.md` |
| FLOW-37 | design-system-governance / multi-stack porting (**CFI-05 Potemkin**) | ✅ `docs/sessions/FLOW-37/FLOW-37-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-37/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` | ❌ engine-internal (coupling taxonomy, not Figma governance) | ✅ `docs/sessions/FLOW-37/FLOW-37-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-37/FLOW-37-RECONCILIATION-STATE.md` |
| FLOW-38 | rag-quality-feedback (**CFI-05 Potemkin**) | ✅ `docs/sessions/FLOW-38/FLOW-38-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-38/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-38/FLOW-38-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-38/FLOW-38-RECONCILIATION-STATE.md` |
| FLOW-39 | oss-curriculum / local-model teaching pipeline (**CFI-05 Potemkin**) | ✅ `docs/sessions/FLOW-39/FLOW-39-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-39/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` | ❌ engine-internal (curriculum tiers for DPO corpus, not Khan Academy) | ✅ `docs/sessions/FLOW-39/FLOW-39-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-39/FLOW-39-RECONCILIATION-STATE.md` |
| FLOW-40 | client-push SSE (**CFI-05 Potemkin; admin-only**) | ✅ `docs/sessions/FLOW-40/FLOW-40-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-40/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` | ❌ engine-internal; tenant-user has no UI here | ✅ `docs/sessions/FLOW-40/FLOW-40-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-40/FLOW-40-RECONCILIATION-STATE.md` |
| FLOW-41 | canva-adapter (**no XIIGen UI**) | ✅ `docs/sessions/FLOW-41/FLOW-41-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-41/UI-REFLECTION-STATE.md` (verdict: `INTERNAL_ONLY — EXTERNAL_REPO`) | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` | ❌ external adapter | ✅ `docs/sessions/FLOW-41/FLOW-41-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-41/FLOW-41-RECONCILIATION-STATE.md` |
| FLOW-42 | miro-adapter (**no XIIGen UI**) | ✅ `docs/sessions/FLOW-42/FLOW-42-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-42/UI-REFLECTION-STATE.md` (verdict: `INTERNAL_ONLY — EXTERNAL_REPO`) | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` | ❌ external adapter | ✅ `docs/sessions/FLOW-42/FLOW-42-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-42/FLOW-42-RECONCILIATION-STATE.md` |
| FLOW-43 | webflow-adapter (**no XIIGen UI**) | ✅ `docs/sessions/FLOW-43/FLOW-43-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-43/UI-REFLECTION-STATE.md` (verdict: `INTERNAL_ONLY — EXTERNAL_REPO`) | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` | ❌ external adapter | ✅ `docs/sessions/FLOW-43/FLOW-43-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-43/FLOW-43-RECONCILIATION-STATE.md` |
| FLOW-44 | framer-adapter (**no XIIGen UI**) | ✅ `docs/sessions/FLOW-44/FLOW-44-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-44/UI-REFLECTION-STATE.md` (verdict: `INTERNAL_ONLY — EXTERNAL_REPO`) | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` | ❌ external adapter | ✅ `docs/sessions/FLOW-44/FLOW-44-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-44/FLOW-44-RECONCILIATION-STATE.md` |
| FLOW-45 | history-bootstrap (**CFI-05 closed RUN-52**) | ✅ `docs/sessions/FLOW-45/FLOW-45-STEP-1-INVARIANTS.md` | ✅ `docs/sessions/FLOW-45/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-45/FLOW-45-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-45/FLOW-45-RECONCILIATION-STATE.md` |
| FLOW-46 | platform-agent | ❌ no-repo (check FLOW-46-IMPL-STATE.json) | ✅ `docs/sessions/FLOW-46/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` | ❌ engine-internal | ✅ `docs/sessions/FLOW-46/FLOW-46-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-46/FLOW-46-RECONCILIATION-STATE.md` |
| FLOW-47 | module-lifecycle | ❌ no-repo | ✅ `docs/sessions/FLOW-47/UI-REFLECTION-STATE.md` | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` | ❌ engine-internal | ❌ no-repo | ✅ `docs/sessions/FLOW-47/FLOW-47-RECONCILIATION-STATE.md` |
| FLOW-48 | admin-i18n / i18n-translation | ❌ no-repo | ❌ no-repo | ✅ `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` + `FLOW-48-DESIGN-REVIEW-v1.md` | ❌ no business doc | ✅ `docs/sessions/FLOW-48/FLOW-48-DESIGN-SIMULATION-R1.md` | ✅ `docs/sessions/FLOW-48/FLOW-48-RECONCILIATION-STATE.md` |

---

## F4 — Business flow docs cross-reference (from `business_flows.zip`)

The zip uploads are not checked into the repo. When F4 is referenced from an
inventory row, it names the zip file exactly. Extract the zip locally before
running an examination batch that needs F4.

| Zip filename | Primary flow | Secondary flows |
|--------------|--------------|-----------------|
| `01-user-registration.md` | FLOW-01 | — |
| `02-business-onboarding.md` | FLOW-02 | — |
| `03-event-creation-promotion.md` | FLOW-03 | FLOW-04 (inferred) |
| `04-post-publishing.md` | FLOW-07 (feed) | FLOW-22 (CMS long-form), FLOW-28 (blog) |
| `05-lesson-completion-gamification.md` | FLOW-05 | FLOW-39 (curriculum) |
| `06-marketplace-publishing.md` | FLOW-08, FLOW-06 | FLOW-17 (freelancer gigs) |
| `07-friend-request-feed-integration.md` | FLOW-07 | — |
| `08-multi tenant deep-research-report 1.md` + `2.md` | FLOW-15 | FLOW-30 (tenant lifecycle) |
| `09-event-participation.md` | FLOW-09 | FLOW-04 (inferred) |
| `10-shops modules.md` | FLOW-10 | FLOW-16 (checkout) |
| `11-social network modules.md` | FLOW-11 | — |
| `12 - ERP systems.md` | FLOW-12 | — |
| `13 - finance.md` | FLOW-13 | FLOW-20 (ads revenue) |
| `32-sharable flows.md` | FLOW-32 | — |
| `33-system initiation.md` | FLOW-33 | — |
| `34-translate to alternatives.md` | FLOW-34 | — |
| — | FLOW-35..FLOW-48 | **No entry.** Use F1+F2+F5 plus Source 5 (MARKET-REFERENCE-CATALOG). |

---

## Gaps discovered during indexing (2026-04-20)

The following inputs are required by SPEC-LOCATION-MAP but missing in the repo:

1. **`XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md`** — 144-role taxonomy + 8 layers + 5 structural templates. Currently only in `FLOW-PREP-LIBRARY-MASTER-PLAN.zip`. **Action:** extract into `docs/design-reviews/` or `docs/screen-examination/` so the role taxonomy travels with the code.
2. **FLOW-00 session docs** — no `STEP-1-INVARIANTS.md` / `UI-REFLECTION-STATE.md` under `docs/sessions/FLOW-00/`. Bundle activation is represented only by `ROLE-COVERAGE-MATRIX.md` and `RUN-01-FINAL-BATCH-5-RECON.md`.
3. **FLOW-46 / FLOW-47 / FLOW-48 intent sentences** — missing `FLOW-XX-STEP-1-INVARIANTS.md`; rely on FILE 2 + FILE 5 only.
4. **FLOW-48 UI-REFLECTION-STATE.md** — missing; design review `FLOW-48-DESIGN-REVIEW-v1.md` substitutes.

---

## CFI-05 — The Potemkin UI problem (critical for PNG evidence)

**Per `SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md`** (sibling doc, also from the
governance set): CFI-05 originally flagged six flows as Potemkin UI. After
RUN-52 investigation, the failure mode is more nuanced:

| Flow | Slug | Route in App.tsx | Page wrapper | Purpose-built screen | CFI-05 status |
|------|------|-------------------|---------------|----------------------|---------------|
| FLOW-36 | feature-registry | ✅ `/admin/feature-registry` | ✅ `FeatureRegistryPage` (CRUD default) | 🟡 `FeatureMatrixScreen.tsx` exists, orphaned | **Orphaned screen** — Page renders AdminCrudPanel, not FeatureMatrixScreen |
| FLOW-37 | design-system-governance | ✅ `/admin/design-system-governance` | ✅ `DesignSystemGovernancePage` (CRUD default) | 🟡 `StackPortingScreen.tsx` exists at `client/src/components/stack-coupling/`, orphaned | **Orphaned screen** |
| FLOW-38 | rag-quality-feedback | ✅ `/admin/rag-quality-feedback` | ✅ `RagQualityFeedbackPage` (CRUD default) | 🟡 `RagQualityScreen.tsx` exists at `client/src/components/rag-quality/`, orphaned | **Orphaned screen** |
| FLOW-39 | oss-curriculum | ✅ `/admin/oss-curriculum` | ✅ `OssCurriculumPage` (CRUD default) | 🟡 `OssCurriculumScreen.tsx` exists, orphaned | **Orphaned screen** |
| FLOW-40 | client-push | ✅ `/admin/client-push` | ✅ `ClientPushPage` (CRUD default) | 🟡 `ClientPushScreen.tsx` exists, orphaned | **Orphaned screen** |
| FLOW-45 | history-bootstrap | ✅ `/admin/history-bootstrap` (RUN-52) | ✅ `HistoryBootstrapPage` (RUN-52) | ✅ `HistoryBootstrapScreen.tsx` wired as default | **Closed (RUN-52)** |

**CFI-05 refinement:** Only FLOW-45 was truly route-less before RUN-52. The
other 5 flows had routes but the Page wrappers default to `AdminCrudPanel` —
exactly the CRUD-anti-pattern the guidance rejects. The fix for those 5 is
to rewrite each Page to render its purpose-built screen as the default view
(the FLOW-45 RUN-52 pattern is the template).

**Per-flow fix order (deferred to per-flow examination batches, not a
separate sweep):** the Page rewrite for FLOW-36/37/38/39/40 happens when the
flow is examined in its batch (Batch C for 36/40, Batch F for 38/39, Batch B
for 37). This keeps each PNG cleanly attributable to one flow-level fix.

---

## External adapter flows (FLOW-41 / 42 / 43 / 44) — no XIIGen UI

Per the same addendum, **FLOW-41 through FLOW-44** are Canva / Miro /
Webflow / Framer external adapters. `UI-REFLECTION-STATE.md` for all four
says:

```
INTERNAL_ONLY — EXTERNAL_REPO — adapter lives in vendor SDK, no XIIGen UI
```

**There is no XIIGen screen to design for these flows.** The "screen" is
the vendor's plugin panel rendered inside Canva / Miro / Webflow / Framer.
Any PNG in `docs/e2e-snapshots/` claiming to show one of these flows from
the XIIGen client is a mis-capture by definition. These rows in
`PNG-INVENTORY.md` must be flagged `❌ invalid — external adapter`.

Each gap here is a real source-of-truth shortfall. The examination protocol
must NOT invent content for these flows — it must note the gap in the row's
"Notes" column and use the next-best file from the 6-file list.

---

## How to use this index

1. Pick a flow (e.g. FLOW-12).
2. Open this file, locate the row for FLOW-12.
3. Read files in the order F1 → F3 → F2 → F4 → F5 → F6 (per SPEC-LOCATION-MAP).
4. Cross-reference the row's "Ref platform" column in `MARKET-REFERENCE-CATALOG.md` for fallback visual conventions.
5. Open the PNG and run the 7-step examination from REPAIR-GUIDANCE Part 2.
6. Write the examination record at `docs/screen-examination/{slug}-examination.md`, citing which of F1–F6 and which MARKET-REFERENCE row supports each design decision.
7. Add the inventory row(s) to `PNG-INVENTORY.md` under the flow's section.
