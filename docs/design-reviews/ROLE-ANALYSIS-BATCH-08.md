# Role Analysis — Batch 8 of ~10 (FLOW-36 → FLOW-40)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories + CLAUDE.md slug semantics + FLOW-36 real topology + existing page scaffolds
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 8 scope

**Admin-narrow engine batch with one public-facing exception.** FLOW-36/37/38/40 are `ENGINE_INTERNAL` with the standard two-role minimum + occasional tenant extensions. FLOW-39 oss-curriculum breaks the pattern — the "OSS" framing implies a public developer-community surface (open-source learners + contributors + curators).

FLOW-36 has REAL topology content (7 nodes: FeatureExtractor, FeatureSignalAggregator, PortingCostEstimator, PortingDecisionGate, PlatformAdapterGenerator, PlatformSimulator, FeaturePortingOrchestrator). The other four have placeholder P1 content; analysis derived from slug + execution-order position.

Existing client scaffolds confirmed:

- **FLOW-36 feature-registry:** `FeatureRegistryPage.tsx`
- **FLOW-37 design-system-governance:** `DesignSystemGovernancePage.tsx`
- **FLOW-38 rag-quality-feedback:** `RagQualityFeedbackPage.tsx`
- **FLOW-39 oss-curriculum:** `OssCurriculumPage.tsx`
- **FLOW-40 client-push:** `ClientPushPage.tsx`

---

## Zip-to-XIIGen mapping for batch 8

No direct zip documents. All analyses inferred.

---

## FLOW-36 — Feature Registry

**Business-logic summary (from FLOW-36 topology — 7 real nodes):** Engine-wide feature registry managing FT-IDs — feature-porting between platforms, cost estimation, decision gating. Platform operators own the registry; tenants READ which features are enabled for them.

**Entry points (inferred from topology):** `GET /admin/platform/features` (platform-admin — FT record management), `GET /admin/platform/features/:ftId/porting-decision` (platform-admin — porting gate review), `GET /admin/my-tenant/features` (tenant-admin — read-only features-active-in-my-tenant), `GET /support/tenant/:id/features` (platform-support — audit).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — manage FT records, review porting decisions, approve platform-adapter generation, run platform simulations | Feature registry ops console + porting-decision gate + simulator | ✅ YES — feature registry ops primary |
| **`platform-support`** | Read-only — inspect which features are enabled for a tenant, audit porting-decision history | Per-tenant feature inspector | ⚠️ read-only variant |
| **`tenant-admin`** | Read-only visibility into features active in their tenant (what FT records apply to them, what's enabled) | Flat list of active features + "request new feature" CTA (routes to gap-flow-proposer) | ⚠️ read-only visibility |
| All other roles | — | FT records are platform-level governance artifacts | — |

### Template implications

1. `FeatureRegistryPage` (existing) → platform-admin primary.
2. `MyTenantFeaturesPage` (`/admin/my-tenant/features`) — tenant-admin read-only.
3. `FeatureSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-36

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (read-only) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells, both ✅; now **1 full + 2 partial** cells = 3. +1 net — quality shift: tenant-admin demoted from ✅ to ⚠️ because tenants READ features but don't author them.)

---

## FLOW-37 — Design System Governance

**Business-logic summary (from P1 inventory "DESIGN-SYSTEM-CLASSIFICATION-001 stack coupling audit, HYBRID-GENESIS-PROMPT-001, DESIGN-DEBT-ANALYSIS-001"):** Design-system governance — manages design tokens (colours, typography, spacing), validates stack coupling (React vs Vue compatibility), audits design debt. Each tenant may have their own design system that plugs into the shared architecture.

**Entry points (inferred):** `GET /admin/platform/design-system` (platform-admin), `GET /admin/design-system` (tenant-admin — tenant-scoped design system), `POST /admin/design-system/tokens` (tenant-admin — edit tokens), `GET /support/tenant/:id/design-system` (platform-support).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — platform design-system governance, stack-coupling rules, cross-tenant audits | Full design-system ops + stack-classification editor + debt dashboard | ✅ YES — platform design ops |
| **`tenant-admin`** | Manages tenant's own design tokens, inherits platform tokens, resolves local overrides | Tenant token editor + inheritance view + debt scorecard | ✅ YES — tenant design admin |
| **`platform-support`** | Read-only — "why does this tenant's design system report this debt score?" | Per-tenant design-system inspector + debt history | ⚠️ read-only variant |
| All other roles | — | Design system is admin substrate | — |

### Template implications

1. `DesignSystemGovernancePage` (existing) → platform-admin + tenant-admin fork.
2. `TenantDesignSystemPage` (`/admin/design-system`) — tenant-admin primary.
3. `DesignSystemSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-37

anon — · public-mkt — · tenant-user — · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **2 full + 1 partial** cells = 3. +1.)

---

## FLOW-38 — RAG Quality Feedback

**Business-logic summary (from P1 "Learning Loop — RAG Quality Feedback-specific patterns"):** Feedback loop for RAG responses. When a user queries RAG (via FLOW-29 adaptive-rag-deep-research or any flow embedding RAG), the response comes with a feedback widget — "Was this helpful?" / "Rate this answer." Platform-admin tunes the learning loop; end-users submit feedback; feedback drives retrieval quality improvements.

**Entry points (inferred):** `POST /rag-feedback` (tenant-user or anonymous — submit feedback), `GET /admin/platform/rag-feedback` (platform-admin — feedback aggregation + quality dashboards), `GET /support/rag-feedback/:id` (platform-support — trace a specific feedback item).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — feedback aggregation, quality trend dashboards, retrieval-tuning signals | Quality dashboards + feedback stream + retriever A/B controls | ✅ YES — feedback ops primary |
| **`platform-support`** | Read-only — trace a specific feedback item back to the retrieval event | Feedback + retrieval-trace inspector | ⚠️ read-only variant |
| **`tenant-user`** | Submits feedback on AI responses inline (thumbs-up/down + free-text) | Feedback widget + "my past feedback" optional drilldown | ⚠️ feedback-submission widget (cross-cut) |
| **`anonymous`** | Submits feedback on public-facing AI-backed surfaces (public RAG searches if any) | Anonymous feedback widget with CAPTCHA | ⚠️ anonymous submission (very narrow) |
| All other roles | — | Engine feedback substrate | — |

### Cross-role surfaces

- **Feedback widget** is the cross-cutting component — it appears wherever a RAG answer is rendered in any other flow (FLOW-29, FLOW-13 analytics-explain, anywhere with AI-backed content). Same widget, different context.

### Template implications

1. `RagQualityFeedbackPage` (existing) → platform-admin primary.
2. `FeedbackWidget` shared component — used in RAG-rendering contexts across flows.
3. `MyRagFeedbackPage` (`/my/rag-feedback`) — tenant-user optional drilldown.
4. `RagFeedbackSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-38

anon ⚠️ (submission) · public-mkt — · tenant-user ⚠️ (submission) · tenant-admin — · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **1 full + 3 partial** cells = 4. +2 — feedback widget is ubiquitous but each role surface is light-weight.)

---

## FLOW-39 — OSS Curriculum

**Business-logic summary (from P1 "Local Model Curriculum — OSS Teaching Pipeline" + slug "oss-curriculum"):** Open-source curriculum for developers learning XIIGen (and/or teaching-pipeline for local models). Public community surface — docs, tutorials, exercises, progress tracking. This is the "OSS onboarding" flow; it departs from the other engine-internal flows in this batch because it faces the public developer community.

**Entry points (inferred):** `GET /oss` (public community entry), `GET /oss/lessons/:slug` (public lesson), `GET /oss/progress` (tenant-user — own progress), `POST /oss/submit` (tenant-user — submit completion/exercise), `GET /admin/oss` (tenant-admin — tenant training dashboards), `GET /admin/platform/oss` (platform-admin — curriculum curator).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Primary public learner — browses lessons, reads docs, tries exercises without signing in | Lesson grid + docs + embedded exercises with local-browser execution + "Sign in to track progress" CTA | ✅ YES — public learner primary |
| **`public-marketplace-visitor`** | Permalink landing on specific lesson | Lesson content + navigation + auth-gated progress tracking | ⚠️ permalink variant |
| **`tenant-user`** | Authenticated learner — tracks progress, earns completions, contributes to community | Progress dashboard + certificates + community contribution surface | ✅ YES — learner primary |
| **`tenant-admin`** | Tenant-scoped training dashboards — which team members are learning which courses (HR/L&D use case) | Team-progress dashboard + assigned-courses admin | ⚠️ L&D admin variant |
| **`platform-admin`** | Curriculum curator — authors lessons, reviews community contributions, promotes featured content | Lesson editor + contribution review queue + featured-content promotion | ✅ YES — curriculum curator |
| **`platform-support`** | Read-only — "why did this learner not get credit for this lesson?" | Per-learner trace + completion-log audit | ⚠️ read-only variant |
| All other roles | — | No dedicated surface — inherit anonymous/tenant-user | — |

### Cross-role surfaces

- **Lesson page** renders identically for anonymous + public-mkt + tenant-user + tenant-admin + platform-admin; only the *affordances* differ (progress tracking for authenticated users, edit-in-place for admins, progress-overview for tenant-admin viewing their team).

### Template implications

1. `OssCurriculumPage` (existing) → role-fork into 4 templates.
2. `PublicLessonPage` (`/oss/lessons/:slug`) — anonymous primary.
3. `MyOssProgressPage` (`/oss/progress`) — tenant-user.
4. `TenantOssTrainingPage` (`/admin/oss`) — tenant-admin L&D.
5. `PlatformOssCurationPage` (`/admin/platform/oss`) — platform-admin.

### ROLE-COVERAGE-MATRIX update for FLOW-39

anon ✅ · public-mkt ⚠️ · tenant-user ✅ · tenant-admin ⚠️ (L&D) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **3 full + 3 partial** cells = 6. +4 — the batch-8 exception: confirmed as public-facing flow.)

---

## FLOW-40 — Client Push

**Business-logic summary (inferred from slug):** Push notification + real-time client-state sync infrastructure. Handles service-worker push, WebSocket live updates, toast notifications. Every other flow uses FLOW-40 as a delivery mechanism; FLOW-40 owns the push-subscription management, delivery audit, and preferences.

**Entry points (inferred):** `GET /admin/push` (tenant-admin — configure tenant push rules + templates), `GET /my/notification-preferences` (tenant-user — manage own push preferences), `GET /admin/platform/push` (platform-admin — push infrastructure ops), `GET /support/push/:deliveryId` (platform-support — delivery trace).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-user`** | Primary end-user — receives push notifications + manages preferences (channel opt-in/out, digest frequency, quiet hours) | Notification preferences page + notification-history drawer | ✅ YES — user preferences |
| **`tenant-admin`** | Configures tenant-wide push templates, triggering rules, delivery SLAs | Push rules editor + template library + delivery metrics | ✅ YES — tenant push admin |
| **`platform-admin`** | Push infrastructure ops — carrier integration (APNs/FCM), delivery quotas, cost dashboards | Full push infrastructure ops + cross-tenant delivery metrics | ✅ YES — platform push ops |
| **`platform-support`** | Read-only — "why did this notification not deliver?" | Per-delivery trace + carrier-response inspector | ⚠️ read-only variant |
| All other roles | — | Push is universal — every role benefits as an end-user but no role-specific surface needed | — |

### Cross-role surfaces

- **Push notification body** (the message on-device) is the cross-cut. Every flow authoring a notification uses FLOW-40's templating engine; the content varies by source flow but the delivery mechanism is unified.

### Template implications

1. `ClientPushPage` (existing) → tenant-admin primary.
2. `NotificationPreferencesPage` (`/my/notification-preferences`) — tenant-user.
3. `PlatformPushOpsPage` (`/admin/platform/push`) — platform-admin.
4. `PushSupportInspectorPage` — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-40

anon — · public-mkt — · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 3 cells; now **3 full + 1 partial** cells = 4. +1.)

---

## Consolidated role signals across batch 8

| Role | Flows in batch 8 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-38 ⚠️ (submission), FLOW-39 ✅ (OSS learner) | OSS community is primary anon surface |
| `public-marketplace-visitor` | FLOW-39 ⚠️ | Lesson permalinks |
| `tenant-user` | FLOW-38 ⚠️ (feedback), FLOW-39 ✅ (learner), FLOW-40 ✅ (preferences) | Three light-to-moderate end-user surfaces |
| `tenant-admin` | FLOW-36 ⚠️, FLOW-37 ✅, FLOW-39 ⚠️ (L&D), FLOW-40 ✅ | Primary admin across most flows in batch 8 |
| `referral-user` | — | No dedicated surface in batch 8 |
| `freelancer` | — | No dedicated surface in batch 8 |
| `business-partner` | — | No dedicated surface in batch 8 |
| `event-organiser` | — | No dedicated surface in batch 8 |
| `platform-admin` | All 5 ✅ | Universal |
| `platform-support` | All 5 ⚠️ | Universal read-only audit |

### Biggest finding in batch 8

**FLOW-39 oss-curriculum is the fleet's second "public-facing content" flow after FLOW-22 CMS** — anonymous browsing + authenticated learning + tenant L&D + platform curation. Its density (6 cells) doesn't reach the dual-sided marketplace tier but places it alongside FLOW-04 event-attendance and FLOW-24 ai-safety-moderation as "publicly discoverable + authentication-enriched" surfaces.

**FLOW-40 client-push is the universal delivery substrate** — every notification across the fleet flows through FLOW-40's templating engine. The role surface is narrow (admin config + user prefs) but the NOTIFICATION CONTENT itself is role-aware through every originating flow.

### Consolidated batch 1..8 density (per flow, top 20)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-16 marketplace-payments | 10 | #1 |
| FLOW-08 marketplace | 9 | #2 |
| FLOW-12 subscription-billing | 9 | #2 |
| FLOW-17 freelancer-marketplace | 9 | #2 |
| FLOW-22 cms-publishing | 9 | #2 |
| FLOW-28 blog-cms-modules | 9 | #2 |
| FLOW-32 sharable-flows-marketplace | 9 | #2 |
| FLOW-09 transactional-event-participation | 8 | #8 |
| FLOW-03 event-management | 8 | #8 |
| FLOW-20 ads-platform | 8 | #8 |
| FLOW-34 marketplace-plugin-adapter | 8 | #8 |
| FLOW-21 dynamic-forms-workflows | 7 | #12 |
| FLOW-01 user-registration | 7 | #12 |
| FLOW-07 friend-request-social-feed | 7 | #12 |
| FLOW-10 reviews-reputation | 7 | #12 |
| FLOW-06 user-groups-communities | 6 | #16 |
| FLOW-13 data-warehouse-analytics | 6 | #16 |
| FLOW-15 saas-multi-tenancy | 6 | #16 |
| FLOW-23 form-builder-templates | 6 | #16 |
| FLOW-39 oss-curriculum | 6 (3 full + 3 partial) | #16 |

---

## Fleet-wide plan validation status (end of batch 8)

| Plan | 48-flow coverage |
|------|---|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 164 PNGs |
| UX-FIX-THREE-TRACK | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ |
| P14-EXECUTION (P1-14 test coverage) | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ 12/12 + 14 PNGs |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation |
| **C6 role-aware templating** | 🟡 scaffold + FLOW-08 pilot; **8 of 10 batches DONE** — 40 of 48 flows (83%) |

**Overall gate:** 7 of 8 plans GREEN. C6 analysis at 83% — final stretch.

---

## Running coverage target

- Initial: ~135
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- After batch 5: +18 → 198
- After batch 6: +9 → 207
- After batch 7: +9 → 216
- **After batch 8: +8 → 224**

Fleet target trajectory confirms 220-230 band. Remaining 2 batches (FLOW-41..48 = 8 flows) will add ~8-12 cells — mostly engine-internal two-role minimum.

---

## Next batch

Batch 9 target: **FLOW-41 → FLOW-45** (adapter CI/CD bridge, rag-quality-graph, meta-flow-orchestration, ai-self-modification, cycle-chain-extension). All engine-internal per CLAUDE.md — expect very narrow 2-3 cell rows.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-09.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-08.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 36..40 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-07.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
