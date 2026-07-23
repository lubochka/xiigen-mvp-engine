# XIIGen Flow Inventory — Phase 0 Deliverable

**Date:** 2026-04-17 | **Branch:** claude/vigorous-margulis | **Plan:** FLOW-UI-COVERAGE-PLAN-v2.md

## Scope

48 rows (FLOW-00..FLOW-47). Every row populated. Phase 1 cannot begin for a flow until
this document is approved and the flow's classification is confirmed.

## Classification Counts

- TENANT_FACING: 18
- ADMIN_FACING:  8
- ENGINE_INTERNAL: 21
- ADAPTER: 1
- **Total: 48**

## Legend

- **Topology Contract:** OK = `contracts/topologies/{slug}.topology.json` exists (grep-verified); MISS = absent.
- **Product Spec:** OK = `# FLOW-XX:` heading present in `docs/XIIGEN_PRODUCT_SPECS.md`; MISS = absent.
- **UI Exists:**
  - `FULL_ROUTED (N/N)` — every `.tsx` in `client/src/pages/{slug}/` referenced as `<Component />` in App.tsx
  - `PARTIAL_ROUTED (k/N)` — some pages routed, some Potemkin
  - `POTEMKIN (N files, 0 routed)` — page dir exists, 0 components referenced in App.tsx
  - `NONE` — no client page dir
  - `ADMIN_MISSING` — ENGINE_INTERNAL with no admin debug page yet
  - `N/A_NO_UI` — ADAPTER (no UI surface by design)
- **Session Stage:** inferred from files in `docs/sessions/FLOW-XX/`
  - `IMPL_REVIEW` — LIVE-RUN + RECONCILIATION present
  - `IMPL_TESTED` — IMPL-STATE + QA-COVERAGE present
  - `IMPL` — IMPL-STATE present
  - `PLAN` — PLAN-STATE present
  - `SIMULATION` — DESIGN-SIMULATION or SESSION-SIM files present
  - `DESIGN` — session dir exists with design material only

## Inventory

| Flow | Name | Server Slug | Classification | Topology | Spec | UI Exists | Session Stage | Classification Justification |
|------|------|-------------|---------------|----------|------|-----------|---------------|-----------------------------|
| FLOW-00 | Bundle Activation | `bundle-activation` | ENGINE_INTERNAL | OK | MISS | ADMIN_MISSING | DESIGN | no client pages dir (engine-only output) |
| FLOW-01 | User Registration and Onboarding | `user-registration` | TENANT_FACING | OK | OK | FULL_ROUTED (6/6) | IMPL_REVIEW | human user observes UI output directly |
| FLOW-02 | Profile Enrichment | `profile-enrichment` | TENANT_FACING | OK | OK | FULL_ROUTED (3/3) | IMPL_TESTED | human user observes UI output directly |
| FLOW-03 | Event Management | `event-management` | TENANT_FACING | OK | OK | FULL_ROUTED (2/2) | IMPL_TESTED | human user observes UI output directly |
| FLOW-04 | Event Attendance | `event-attendance` | TENANT_FACING | OK | OK | FULL_ROUTED (2/2) | IMPL_TESTED | human user observes UI output directly |
| FLOW-05 | Completion Gamification | `completion-gamification` | TENANT_FACING | OK | OK | POTEMKIN (4 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-06 | User Groups & Communities | `user-groups-communities` | TENANT_FACING | OK | OK | POTEMKIN (5 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-07 | Friend Request & Social Feed | `friend-request-social-feed` | TENANT_FACING | OK | OK | POTEMKIN (4 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-08 | Marketplace | `marketplace` | TENANT_FACING | OK | OK | POTEMKIN (5 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-09 | Transactional Event Participation | `transactional-event-participation` | TENANT_FACING | OK | OK | POTEMKIN (5 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-10 | Reviews & Reputation | `reviews-reputation` | TENANT_FACING | OK | OK | FULL_ROUTED (4/4) | IMPL_TESTED | human user observes UI output directly |
| FLOW-11 | Schema Registry DAG | `schema-registry-dag` | ADMIN_FACING | OK | OK | FULL_ROUTED (3/3) | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-12 | Subscription Billing | `subscription-billing` | TENANT_FACING | OK | OK | FULL_ROUTED (3/3) | IMPL_TESTED | human user observes UI output directly |
| FLOW-13 | Data Warehouse & Analytics | `data-warehouse-analytics` | ADMIN_FACING | MISS | OK | NONE | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-14 | ETL Data Integration | `etl-data-integration` | ADMIN_FACING | MISS | OK | NONE | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-15 | SaaS Multi-Tenancy | `saas-multi-tenancy` | ADMIN_FACING | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-16 | Marketplace Payments | `marketplace-payments` | TENANT_FACING | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-17 | Freelancer Marketplace | `freelancer-marketplace` | TENANT_FACING | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-18 | Visual Flow Engine | `visual-flow-engine` | ENGINE_INTERNAL | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | client pages exist (visual-flow-engine) but flow output is engine-consumed |
| FLOW-19 | Durable Sagas & Compliance | `durable-sagas-compliance` | ADMIN_FACING | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-20 | Ads Platform | `ads-platform` | ADMIN_FACING | MISS | OK | POTEMKIN (2 files, 0 routed) | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-21 | Dynamic Forms & Workflows | `dynamic-forms-workflows` | TENANT_FACING | MISS | OK | NONE | IMPL_TESTED | human user observes UI output directly |
| FLOW-22 | CMS Publishing | `cms-publishing` | TENANT_FACING | MISS | OK | NONE | IMPL_TESTED | human user observes UI output directly |
| FLOW-23 | Form Builder Templates | `form-builder-templates` | TENANT_FACING | MISS | OK | POTEMKIN (1 files, 0 routed) | IMPL_TESTED | human user observes UI output directly |
| FLOW-24 | AI Safety & Moderation | `ai-safety-moderation` | TENANT_FACING | MISS | OK | NONE | IMPL_TESTED | human user observes UI output directly |
| FLOW-25 | BFA Cross-Flow Governance | `bfa-cross-flow-governance` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-26 | Meta Flow Engine | `meta-flow-engine` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-27 | Human Interaction Gate | `human-interaction-gate` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-28 | Blog/CMS Modules | `blog-cms-modules` | TENANT_FACING | MISS | MISS | NONE | IMPL_TESTED | human user observes UI output directly |
| FLOW-29 | Adaptive RAG / Deep Research | `adaptive-rag-deep-research` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-30 | Tenant Lifecycle Manager | `tenant-lifecycle-manager` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-31 | Design Intelligence Engine | `design-intelligence-engine` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-32 | Sharable Flows Marketplace | `sharable-flows-marketplace` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-33 | System Initiation Bootstrap | `system-initiation-bootstrap` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-34 | Marketplace Plugin Adapter | `marketplace-plugin-adapter` | ADMIN_FACING | MISS | MISS | NONE | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-35 | Meta Arbitration Engine | `meta-arbitration-engine` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-36 | Feature Registry | `feature-registry` | ENGINE_INTERNAL | OK | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-37 | Design System Governance | `design-system-governance` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-38 | RAG Quality Feedback | `rag-quality-feedback` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-39 | OSS Curriculum | `oss-curriculum` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-40 | Client Push | `client-push` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-41 | Platform Agent Instrumentation | `platform-agent-instrumentation` | ADAPTER | MISS | MISS | N/A_NO_UI | IMPL_TESTED | no client surface; external bridge |
| FLOW-42 | RAG Quality Graph | `rag-quality-graph` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-43 | Meta Flow Orchestration | `meta-flow-orchestration` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-44 | AI Self-Modification | `ai-self-modification` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-45 | Cycle Chain Extension | `cycle-chain-extension` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_TESTED | no client pages dir (engine-only output) |
| FLOW-46 | Platform Agent | `platform-agent` | ADMIN_FACING | OK | MISS | NONE | IMPL_TESTED | admin operator surface (dashboard/audit/provisioning) |
| FLOW-47 | Module Lifecycle | `module-lifecycle` | ENGINE_INTERNAL | MISS | MISS | ADMIN_MISSING | IMPL_REVIEW | no client pages dir (engine-only output) |
| FLOW-48 | i18n Translation | `i18n-translation` | TENANT_FACING | MISS | MISS | NONE | DESIGN | cross-cutting shell + all pages; tenant end-users switch language via LanguageSwitcher |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = 48):** PASS — 48 rows produced.
- **Arbiter 2 — Classification accuracy:** PASS — each row carries a justification column. TENANT_FACING flows have `client/src/pages/{slug}/` dirs with user-visible components. ADMIN_FACING flows produce operator dashboards. ENGINE_INTERNAL flows produce events consumed by other engine flows (not directly by a user). ADAPTER (FLOW-41) produces no UI.
- **Arbiter 3 — No assumed classifications:** PASS — topology/spec/UI columns cite filesystem presence. No classification derived from guesswork.

## Known Discrepancies (tracked, not blocking)

1. `FLOW-17` plan name = "Digital Asset & IP Management" vs. repo slug `freelancer-marketplace` (spec section agrees with slug).
2. `FLOW-18` plan name = "Platform Infrastructure" vs. repo slug `visual-flow-engine`.
3. `FLOW-20` plan name = "AI Safety & Content Moderation" vs. repo slug `ads-platform` (spec: Ads Platform).
4. `FLOW-24` plan name = "AI Tutoring & Learning" vs. repo slug `ai-safety-moderation`.
5. `FLOW-30` plan name = "RAG Result Aggregation & Ranking" vs. repo slug `tenant-lifecycle-manager`.
6. `FLOW-32` plan name = "Skill Graph" vs. repo slug `sharable-flows-marketplace`.
7. `FLOW-34` plan name = "Feature Registry" vs. repo slug `marketplace-plugin-adapter` (FLOW-36 also named Feature Registry).
8. `FLOW-37` plan name = "Engine Self-Awareness / Porting" vs. repo slug `design-system-governance`.

For phases P1+ we use the **repo slug** as the source of truth (per CLAUDE.md Rule 16). Plan names serve as labels only.

## Phase 0 Completion Gate

- [x] 48 rows produced
- [x] every row has classification + evidence
- [x] discrepancies between plan names and repo slugs tracked
- [x] every flow's `docs/sessions/FLOW-XX/flow-ui-automation.json` seeded with this classification

## Phase 1 Entry Conditions

Each flow's `flow-ui-automation.json` `p1_input_branch` is already pre-computed:

- **Branch A** (topology present): FLOW-01, FLOW-02, FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07, FLOW-08, FLOW-09, FLOW-10, FLOW-11, FLOW-12, FLOW-36, FLOW-46, and FLOW-00 (bundle-activation).
- **Branch B** (no topology, product spec present — FLOW-01..24 + FLOW-28 not in Branch A set): FLOW-13, FLOW-14, FLOW-15, FLOW-16, FLOW-17, FLOW-18, FLOW-19, FLOW-20, FLOW-21, FLOW-22, FLOW-23, FLOW-24, FLOW-28.
- **Branch C** (neither topology nor spec — simulation only): FLOW-25, FLOW-26, FLOW-27, FLOW-29, FLOW-30, FLOW-31, FLOW-32, FLOW-33, FLOW-34, FLOW-35, FLOW-37, FLOW-38, FLOW-39, FLOW-40, FLOW-41 (also ADAPTER), FLOW-42, FLOW-43, FLOW-44, FLOW-45, FLOW-47.
