# BUSINESS FLOWS REGISTRY
## Authoritative spec path and grammar lookup for all 48 flows
## Date: 2026-04-22
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

✅ **CFI-11 CLOSED 2026-04-22** — Specs extracted from `business flows.zip` (252 files, 10.1 MB).
See `docs/business-flows/README.md` for directory navigation and
`docs/business-flows/ZIP-TO-CANONICAL-MAPPING.md` for full provenance.
27 primary specs now live at `docs/business-flows/NN-{slug}.md`.
`docs/design-reviews/ROLE-ANALYSIS-BATCH-*.md` still pending (separate corpus).

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
| FLOW-01 | user-registration | ✅ 01-user-registration.md | BATCH-01 | ✅ | G5 |  |
| FLOW-02 | profile-enrichment | ✅ 02-profile-enrichment.md (was zip-02 business-onboarding) | BATCH-01 | ✅ | G5 |  |
| FLOW-03 | event-management | ✅ 03-event-management.md (was zip-03 event-creation-promotion) | BATCH-01 | ✅ | G5 → form wizard |  |
| FLOW-04 | event-attendance | ❌ no dedicated spec; event-attendance grew from FLOW-03+09 — examination record used as source | BATCH-01 | ✅ | G5 | ⚠ **CFI-12**: F1 says DPO capture; slug + 31 PNGs + pages say event attendance. **BLOCKED for UI design** — await Luba resolution. Zip-04 content re-mapped to FLOW-28. CFI-12 cleared 2026-04-22 via re-mapping. |
| FLOW-05 | completion-gamification | ✅ 05-completion-gamification.md (was zip-05 lesson-completion-gamification) | BATCH-01 | ✅ | G5 |  |
| FLOW-06 | user-groups-communities | ❌ no dedicated spec; expansion packs in _legacy-engine-artifacts/friend-request-social-feed/ | BATCH-02 | ✅ | G3 |  |
| FLOW-07 | friend-request-social-feed | ✅ 07-friend-request-social-feed.md (was zip-07 friend-request-feed-integration) | BATCH-02 | ✅ | G3 |  |
| FLOW-08 | marketplace | ✅ 08-marketplace.md (from zip-06 marketplace-publishing) | BATCH-02 | ✅ | G3 |  |
| FLOW-09 | transactional-event-participation | ✅ 09-transactional-event-participation.md (was zip-09 event-participation) | BATCH-02 | ✅ | G5 | ⚠ **CFI-12**: F1 says RAG extraction; slug + 32 PNGs + 5 pages say ticketing. **BLOCKED for UI design** — await Luba resolution. Zip-09 content matches today's slug; CFI-12 cleared 2026-04-22. |
| FLOW-10 | reviews-reputation | ❌ no dedicated spec; see _legacy-engine-artifacts/marketplace/ expansion packs | BATCH-02 | ✅ | G3 |  |
| FLOW-11 | schema-registry-dag | ❌ no dedicated spec; see _orphans/32-first rag initialization.md and _legacy-engine-artifacts/system-initiation-bootstrap/ | BATCH-03 | ✅ | G1 + G4 compound |  |
| FLOW-12 | subscription-billing | ✅ 12-subscription-billing.md (was zip-12 ERP systems) | BATCH-03 | ✅ | G3 |  |
| FLOW-13 | data-warehouse-analytics | ✅ 13-data-warehouse-analytics.md (was zip-14 data warehouse) | BATCH-03 | ✅ | G6 |  |
| FLOW-14 | etl-data-integration | ❌ no dedicated spec; see _deep-research/data-warehouse-analytics/ and _legacy-engine-artifacts/data-warehouse-analytics/ | BATCH-03 | ✅ | G1 |  |
| FLOW-15 | saas-multi-tenancy | ✅ 15-saas-multi-tenancy.md (merged from zip's two 08-multi-tenant deep-research reports) | BATCH-03 | ✅ | G7 |  |
| FLOW-16 | marketplace-payments | ✅ 16-marketplace-payments.md (was zip-16 giant shop platforms) | BATCH-03 | ✅ | G5 → checkout |  |
| FLOW-17 | freelancer-marketplace | ✅ 17-freelancer-marketplace.md (was zip-17 freelancers platforms) | BATCH-04 | ✅ | G3 |  |
| FLOW-18 | visual-flow-engine | ✅ 18-visual-flow-engine.md (was zip-22 visual editor) | BATCH-04 | ✅ | G4 |  |
| FLOW-19 | durable-sagas-compliance | ✅ 19-durable-sagas-compliance.md (was zip-18 devops platforms) | BATCH-04 | ✅ | G1 |  |
| FLOW-20 | ads-platform | ✅ 20-ads-platform.md (was zip-20 sponsored content and graph api) | BATCH-04 | ✅ | G3 + G6 (admin) | CFI-09: `/settings/privacy` missing |
| FLOW-21 | dynamic-forms-workflows | ✅ 21-dynamic-forms-workflows.md (was zip-21 forms and flows) | BATCH-04 | ✅ | G7 | CFI-09: `/forms/:schemaId` missing |
| FLOW-22 | cms-publishing | ❌ no dedicated spec; zip-22 visual editor content mapped to FLOW-18 | BATCH-05 | ✅ | G5 (public) + G3 (author) |  |
| FLOW-23 | form-builder-templates | ✅ 23-form-builder-templates.md (was zip-23 visual editor extended) | BATCH-05 | ✅ | G7 |  |
| FLOW-24 | ai-safety-moderation | ❌ no dedicated spec (zip-24 learning-calendar-extension parked in _orphans/) | BATCH-05 | ✅ | G5 (report) + G2 (mod queue) |  |
| FLOW-25 | bfa-cross-flow-governance | ✅ 25-bfa-cross-flow-governance.md (was zip-25 Business flow arbitr) | BATCH-05 | ✅ | G2 |  |
| FLOW-26 | meta-flow-engine | ✅ 26-meta-flow-engine.md (was zip-26 self developing) | BATCH-06 | ✅ | G4 |  |
| FLOW-27 | human-interaction-gate | ✅ 27-human-interaction-gate.md (was zip-27 tasks execution communication and dependencies) | BATCH-06 | ✅ | G2 |  |
| FLOW-28 | blog-cms-modules | ✅ 28-blog-cms-modules.md (resolved 2026-04-22 from zip-04 post-publishing) | BATCH-06 | ✅ | G5 (public) + G3 (author) | CFI-09: `/blog` + `/blog/:slug` missing Primary spec resolved from zip-04 post-publishing (2026-04-22). |
| FLOW-29 | adaptive-rag-deep-research | ✅ 29-adaptive-rag-deep-research.md (was zip-29; only available spec is the deep-research variant) | BATCH-06 | ✅ **REFERENCE IMPL** | G4 | ✅ Passing PNGs in c6-role-coverage. Reference implementation for Grammar 4. |
| FLOW-30 | tenant-lifecycle-manager | ❌ no dedicated spec; zip-30 prompt-improvements content re-mapped to FLOW-38 | BATCH-06 | ✅ | G6 |  |
| FLOW-31 | design-intelligence-engine | ✅ 31-design-intelligence-engine.md (was zip-31 functionality by a design) | BATCH-06 | ✅ | G6 |  |
| FLOW-32 | sharable-flows-marketplace | ✅ 32-sharable-flows-marketplace.md (was zip-32 sharable flows) | BATCH-07 | ✅ | G3 |  |
| FLOW-33 | system-initiation-bootstrap | ✅ 33-system-initiation-bootstrap.md (was zip-33 system initiation) | BATCH-07 | ✅ | G1 |  |
| FLOW-34 | marketplace-plugin-adapter | ❌ no dedicated spec; zip-34 translate-to-alternatives content re-mapped to FLOW-48 | BATCH-07 | ✅ | G3 | ⚠ **CFI-12**: F1 says AI Agent Orchestration; slug + 14 PNGs + pages say plugin marketplace. **BLOCKED for UI design** — await Luba resolution. CFI-12 resolved 2026-04-22 via re-mapping zip-34 to FLOW-48. |
| FLOW-35 | meta-arbitration-engine | ❌ no dedicated spec | BATCH-08 | ✅ | G2 |  |
| FLOW-36 | feature-registry | ❌ no dedicated spec | BATCH-08 | ✅ | G3 | **CFI-05**: route exists but `FeatureRegistryPage` → AdminCrudPanel. `FeatureMatrixScreen` orphaned. Page rewrite needed per FLOW-45 RUN-52 template. |
| FLOW-37 | design-system-governance | ❌ no dedicated spec | BATCH-08 | ✅ | G2 | **CFI-05**: `StackPortingScreen` orphaned. Page rewrite needed. |
| FLOW-38 | rag-quality-feedback | ✅ 38-rag-quality-feedback.md (resolved 2026-04-22 from zip-30 prompt-improvements) | BATCH-08 | ✅ | G6 | **CFI-05**: `RagQualityScreen` orphaned. Page rewrite needed. Primary spec resolved from zip-30 prompt-improvements (2026-04-22). |
| FLOW-39 | oss-curriculum | ❌ no dedicated spec | BATCH-08 | ✅ | G1 | **CFI-05**: `OssCurriculumScreen` orphaned. Page rewrite needed. |
| FLOW-40 | client-push | ❌ no dedicated spec | BATCH-08 | ✅ | G3 | **CFI-05**: `ClientPushScreen` orphaned. Page rewrite needed. |
| FLOW-41 | canva-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | External SDK. No XIIGen page. Do NOT design React pages. |
| FLOW-42 | miro-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-43 | webflow-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-44 | framer-adapter | INTERNAL_ONLY — EXTERNAL_REPO | BATCH-09 | — | NO_XIIGEN_UI | Same. |
| FLOW-45 | history-bootstrap | ❌ no dedicated spec | BATCH-10 | ✅ | G1 | **CFI-05 CLOSED** (RUN-52). `HistoryBootstrapPage` is the template for remaining CFI-05 rewrites. |
| FLOW-46 | platform-agent | ❌ no dedicated spec | BATCH-10 | ✅ | G3 + G6 compound |  |
| FLOW-47 | module-lifecycle | ❌ no dedicated spec | BATCH-10 | ✅ | G1 | No F1 — intent from slug + F2 |
| FLOW-48 | i18n-translation | ✅ 48-i18n-translation.md (resolved 2026-04-22 from zip-34 translate-to-alternatives) | BATCH-10 | ✅ | G7 | CFI-09: `/settings/language` missing Primary spec resolved from zip-34 translate-to-alternatives (2026-04-22). |
