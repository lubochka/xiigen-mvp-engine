# BUSINESS FLOWS REGISTRY
## Authoritative spec path and grammar lookup for all 48 flows
## Date: 2026-04-20
## Used by: SK-539 §0 · SK-540 Step 1 · SK-542 · Q8 · Q10 · Q-08 · Q-24 · Q-25

---

## Source file locations

```bash
# F1 — user intent (all flows)
docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# F2 — process + state + component list (all flows)
docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md

# F3 — role visibility matrix
docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md

# F4 — business spec (FLOW-01..34)
docs/business-flows/NN-{slug}.md

# F5 — design simulation screenplay (where it exists)
docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md

# F6 — built vs designed audit
docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md

# Examination record (ground truth where present — 38 flows)
docs/screen-examination/{slug}-examination.md

# Design context (produced by SK-540)
docs/design-context/{slug}/.impeccable.md
```

⚠ **CFI-11** — `docs/business-flows/` and `docs/design-reviews/ROLE-ANALYSIS-BATCH-*.md`
must be copied from their source zips in one MAINTENANCE session before the paths above
resolve. See SESSION-LOAD-PLAN v31 CFI-11.

⚠ **CFI-12** — Three F1 spec gaps require Luba's decision before any UI design work
on FLOW-04, FLOW-09, or FLOW-34. See per-flow notes below.

---

## Quick lookup commands

```bash
# User intent
grep -A 5 "user_intent" docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md

# Examination record (check first — ground truth where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -30

# Role visibility
grep -A 20 "FLOW-XX\|{slug}" docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md 2>/dev/null | head -20

# Grammar pre-declared
grep "Grammar\|^Type:" docs/screen-examination/{slug}-examination.md 2>/dev/null ||
grep "^Type:" docs/design-context/{slug}/.impeccable.md 2>/dev/null

# Design context exists?
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
```

---

## Grammar taxonomy (7 types)

| Code | Name | User's question | Flows |
|------|------|-----------------|-------|
| G1 | PROGRESS_STRIP | "Where is this in its lifecycle?" | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| G2 | VERDICT_GRID | "What did each evaluator decide, and why?" | FLOW-24 (mod), 25, 27, 35, 37 |
| G3 | CARD_LIST | "Which items need my attention, in what state?" | FLOW-06, 07, 08, 10, 12, 16, 17, 20, 28, 32, 36, 40, 46 |
| G4 | TOPOLOGY_CANVAS | "How do the parts connect?" | FLOW-18, 26, 29, 34 |
| G5 | KIOSK | "I have one task, one decision" | FLOW-01, 02, 03, 04, 05, 09, 22 (public), 24 (report) |
| G6 | DASHBOARD | "What are my key metrics right now?" | FLOW-13, 20 (admin), 30, 31, 38 |
| G7 | SETTINGS_TABS | "Which setting do I need to change?" | FLOW-15, 21, 23, 48 |
| — | NO_XIIGEN_UI | External SDK — no XIIGen page | FLOW-41, 42, 43, 44 |

**Reference implementation (passing):** FLOW-29 (G4 TOPOLOGY_CANVAS) — three role PNGs at
`docs/e2e-snapshots/c6-role-coverage/flow-29-*.png` all passing as of RUN-50. Use as the
template for any Grammar 4 rebuild and as the benchmark for Layer 4 grammar audits.

---

## Role-Analysis-BATCH file map

| Flows | Batch file |
|-------|-----------|
| FLOW-01..05 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-01.md` |
| FLOW-06..10 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md` |
| FLOW-11..16 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-03.md` |
| FLOW-17..21 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md` |
| FLOW-22..26 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md` |
| FLOW-27..31 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` |
| FLOW-32..34 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-07.md` |
| FLOW-35..40 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md` |
| FLOW-41..44 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` (external adapters) |
| FLOW-45..48 | `docs/design-reviews/ROLE-ANALYSIS-BATCH-10.md` |

---

## Per-flow registry

| Flow | Slug | F4 business spec? | F3 batch | Exam record? | Grammar | CFI notes |
|------|------|-------------------|----------|--------------|---------|-----------|
| FLOW-00 | bundle-activation | ❌ no entry | BATCH-10 | ✅ | G1 | No F1 — intent from slug + session files |
| FLOW-01 | user-registration | ✅ 01-user-registration.md | BATCH-01 | ✅ | G5 | |
| FLOW-02 | profile-enrichment | ✅ 02-business-onboarding.md | BATCH-01 | ✅ | G5 | |
| FLOW-03 | event-management | ✅ 03-event-creation-promotion.md | BATCH-01 | ✅ | G5 → form wizard | |
| FLOW-04 | event-attendance | ❌ inferred from FLOW-03+09 | BATCH-01 | ✅ | G5 | ⚠ **CFI-12**: F1 says DPO capture; slug + 31 PNGs + pages say event attendance. **BLOCKED for UI design** — await Luba resolution. |
| FLOW-05 | completion-gamification | ✅ 05-lesson-completion-gamification.md | BATCH-01 | ✅ | G5 | |
| FLOW-06 | user-groups-communities | ✅ 06-marketplace-publishing.md | BATCH-02 | ✅ | G3 | |
| FLOW-07 | friend-request-social-feed | ✅ 07-friend-request-feed-integration.md | BATCH-02 | ✅ | G3 | |
| FLOW-08 | marketplace | ✅ 06-marketplace-publishing.md | BATCH-02 | ✅ | G3 | |
| FLOW-09 | transactional-event-participation | ✅ 09-event-participation.md | BATCH-02 | ✅ | G5 | ⚠ **CFI-12**: F1 says RAG extraction; slug + 32 PNGs + 5 pages say ticketing. **BLOCKED for UI design** — await Luba resolution. |
| FLOW-10 | reviews-reputation | ❌ | BATCH-02 | ✅ | G3 | |
| FLOW-11 | schema-registry-dag | ❌ | BATCH-03 | ✅ | G1 + G4 compound | |
| FLOW-12 | subscription-billing | ✅ 12-ERP-systems.md | BATCH-03 | ✅ | G3 | |
| FLOW-13 | data-warehouse-analytics | ❌ | BATCH-03 | ✅ | G6 | |
| FLOW-14 | etl-data-integration | ❌ | BATCH-03 | ✅ | G1 | |
| FLOW-15 | saas-multi-tenancy | ❌ | BATCH-03 | ✅ | G7 | |
| FLOW-16 | marketplace-payments | ❌ deep research only | BATCH-03 | ✅ | G5 → checkout | |
| FLOW-17 | freelancer-marketplace | ❌ | BATCH-04 | ✅ | G3 | |
| FLOW-18 | visual-flow-engine | ❌ | BATCH-04 | ✅ | G4 | |
| FLOW-19 | durable-sagas-compliance | ❌ | BATCH-04 | ✅ | G1 | |
| FLOW-20 | ads-platform | ❌ | BATCH-04 | ✅ | G3 + G6 (admin) | CFI-09: `/settings/privacy` missing |
| FLOW-21 | dynamic-forms-workflows | ❌ | BATCH-04 | ✅ | G7 | CFI-09: `/forms/:schemaId` missing |
| FLOW-22 | cms-publishing | ❌ | BATCH-05 | ✅ | G5 (public) + G3 (author) | |
| FLOW-23 | form-builder-templates | ❌ | BATCH-05 | ✅ | G7 | |
| FLOW-24 | ai-safety-moderation | ❌ | BATCH-05 | ✅ | G5 (report) + G2 (mod queue) | |
| FLOW-25 | bfa-cross-flow-governance | ❌ | BATCH-05 | ✅ | G2 | |
| FLOW-26 | meta-flow-engine | ❌ | BATCH-06 | ✅ | G4 | |
| FLOW-27 | human-interaction-gate | ❌ | BATCH-06 | ✅ | G2 | |
| FLOW-28 | blog-cms-modules | ❌ | BATCH-06 | ✅ | G5 (public) + G3 (author) | CFI-09: `/blog` + `/blog/:slug` missing |
| FLOW-29 | adaptive-rag-deep-research | ❌ | BATCH-06 | ✅ **REFERENCE IMPL** | G4 | ✅ Passing PNGs in c6-role-coverage. Reference implementation for Grammar 4. |
| FLOW-30 | tenant-lifecycle-manager | ❌ | BATCH-06 | ✅ | G6 | |
| FLOW-31 | design-intelligence-engine | ❌ | BATCH-06 | ✅ | G6 | |
| FLOW-32 | sharable-flows-marketplace | ❌ | BATCH-07 | ✅ | G3 | |
| FLOW-33 | system-initiation-bootstrap | ❌ | BATCH-07 | ✅ | G1 | |
| FLOW-34 | marketplace-plugin-adapter | ❌ | BATCH-07 | ✅ | G3 | ⚠ **CFI-12**: F1 says AI Agent Orchestration; slug + 14 PNGs + pages say plugin marketplace. **BLOCKED for UI design** — await Luba resolution. |
| FLOW-35 | meta-arbitration-engine | ❌ | BATCH-08 | ✅ | G2 | |
| FLOW-36 | feature-registry | ❌ | BATCH-08 | ✅ | G3 | **CFI-05**: route exists but `FeatureRegistryPage` → AdminCrudPanel. `FeatureMatrixScreen` orphaned. Page rewrite needed per FLOW-45 RUN-52 template. |
| FLOW-37 | design-system-governance | ❌ | BATCH-08 | ✅ | G2 | **CFI-05**: `StackPortingScreen` orphaned. Page rewrite needed. |
| FLOW-38 | rag-quality-feedback | ❌ | BATCH-08 | ✅ | G6 | **CFI-05**: `RagQualityScreen` orphaned. Page rewrite needed. |
| FLOW-39 | oss-curriculum | ❌ | BATCH-08 | ✅ | G1 | **CFI-05**: `OssCurriculumScreen` orphaned. Page rewrite needed. |
| FLOW-40 | client-push | ❌ | BATCH-08 | ✅ | G3 | **CFI-05**: `ClientPushScreen` orphaned. Page rewrite needed. |
| FLOW-41 | canva-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | External SDK. No XIIGen page. Do NOT design React pages. |
| FLOW-42 | miro-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-43 | webflow-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-44 | framer-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-45 | history-bootstrap | ❌ | BATCH-10 | ✅ | G1 | **CFI-05 CLOSED** (RUN-52). `HistoryBootstrapPage` is the template for remaining CFI-05 rewrites. |
| FLOW-46 | platform-agent | ❌ | BATCH-10 | ✅ | G3 + G6 compound | |
| FLOW-47 | module-lifecycle | ❌ | BATCH-10 | ✅ | G1 | No F1 — intent from slug + F2 |
| FLOW-48 | i18n-translation | ❌ | BATCH-10 | ✅ | G7 | CFI-09: `/settings/language` missing |
