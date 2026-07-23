# Role Analysis — Batch 5 of ~10 (FLOW-21 → FLOW-25)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: XIIGen P1 business-logic inventories + existing page scaffolds + topology + CLAUDE.md slug semantics
## Scope constraint: per Luba, no more than 5 flows per run

---

## Batch 5 scope

Transitional batch — mix of tenant-facing (FLOW-21 forms engine, FLOW-22 CMS, FLOW-23 form templates) and engine-internal admin-heavy (FLOW-24 AI safety, FLOW-25 BFA governance). Role density is moderate; no single-flow density peak. Most of the "new" coverage comes from recognising that forms + CMS + safety cut across many personas even when the primary authoring persona is `tenant-admin`.

Existing client scaffolds confirmed (from `client/src/pages/`):

- **FLOW-21 dynamic-forms-workflows:** `DynamicFormsWorkflowsPage.tsx`
- **FLOW-22 cms-publishing:** `CmsPublishingPage.tsx`
- **FLOW-23 form-builder-templates:** `TemplateBuilder.tsx`
- **FLOW-24 ai-safety-moderation:** `AiSafetyModerationPage.tsx`
- **FLOW-25 bfa-cross-flow-governance:** `BfaCrossFlowGovernancePage.tsx`

All 5 pages are single-scaffold today. Batch 5 upgrades them to role-aware variants where the business logic demands.

---

## Zip-to-XIIGen mapping for batch 5

| Business doc | XIIGen flow | Coverage |
|--------------|-------------|----------|
| (no zip doc — but form-driven event registration is referenced in `09-event-participation.md`) | **FLOW-21 dynamic-forms-workflows** | Partial via event-registration cross-ref |
| (no zip doc — but CMS/blog surfaces referenced in `06-marketplace-publishing.md` for advertorial content) | **FLOW-22 cms-publishing** | Partial via advertorial cross-ref |
| (no zip doc) | **FLOW-23 form-builder-templates** | Inferred |
| (no zip doc — but content-moderation tracks to FLOW-07 / FLOW-08 admin surfaces in zip) | **FLOW-24 ai-safety-moderation** | Partial via moderation cross-refs from earlier batches |
| (no zip doc) | **FLOW-25 bfa-cross-flow-governance** | Inferred — pure engine governance |

---

## FLOW-21 — Dynamic Forms & Workflows

**Business-logic summary (from P1 inventory "dynamic form engine, workflow state machine, conditional logic"):** Tenant-admins design dynamic forms with conditional-branching logic (show/hide fields based on earlier answers, jump-to-step, validation rules) and state-machine workflows (approve/reject loops, multi-party signoffs). End-users fill these forms — the forms surface *anywhere* in the tenant: event registration, questionnaires (FLOW-02), onboarding (FLOW-01), gig-applications (FLOW-17), procurement (business-partners), support tickets. The form-rendering engine is single-codebase; the forms themselves are tenant-configured documents.

**Entry points:** `GET /admin/forms` (tenant-admin — builder), `GET /admin/forms/:id/preview` (tenant-admin — preview), `GET /forms/:id` (end-user — run form), `POST /forms/:id/submit` (end-user), `GET /admin/workflows/:id/queue` (tenant-admin — pending-approval queue).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Fills a public form (e.g., "Contact us", lead-capture, public application) | Rendered form + optional CAPTCHA + "Sign in to save draft" CTA | ⚠️ public-form variant |
| **`tenant-user`** | Primary end-user persona — fills forms surfaced anywhere in the tenant | Rendered form with progress indicator + resume-draft + submit confirmation | ✅ YES — end-user primary |
| **`tenant-admin`** | Primary author persona — builds forms with the drag-and-drop designer + defines workflow state machine + monitors submissions + approves/rejects at workflow gates | Form designer + workflow designer + submissions table + approval queue | ✅ YES — admin primary |
| **`freelancer`** | Fills service-application intake forms when bidding on gigs (FLOW-17 cross-cut) or reviewing milestone submissions | Standard end-user form view + "fill as freelancer" context badge | ⚠️ context-badge variant |
| **`business-partner`** | Fills procurement / partnership-application forms (B2B workflows) | Form render with B2B-specific conditional-logic paths enabled | ⚠️ B2B-context variant |
| **`event-organiser`** | Uses event-registration form for their event (cross-cut with FLOW-03) | Standard end-user render; "Edit this form" admin-quick-access if also tenant-admin | ⚠️ inherits from tenant-user |
| **`platform-admin`** | Cross-tenant form template library — publishes shared form archetypes for tenants to fork | Template library + archetype editor + cross-tenant analytics | ⚠️ library admin |
| **`referral-user` / `public-marketplace-visitor` / `platform-support`** | Not primary surfaces — inherit tenant-user/end-user behaviour | — | — |

### Cross-role surfaces

- **Form render** is the single most widely-used primitive — the same component shows for tenant-user, freelancer, business-partner, event-organiser, anonymous. The *form definition* differs per role-aware conditional logic the admin authored ("If viewer role = freelancer, show these extra fields").
- **Workflow approval queue** is tenant-admin specific.
- **Submission receipt** appears to whoever submitted — tenant-user sees their history; admin sees the full table.

### Template implications

1. `FormRunnerPage` (`/forms/:id`) — rendered-form primary; conditional logic may fork per viewer role.
2. `DynamicFormsWorkflowsPage` (existing) → tenant-admin-only form designer surface.
3. `PublicFormPage` (`/public/forms/:slug`) — anonymous variant with CAPTCHA + no resume-draft.
4. `WorkflowApprovalQueuePage` (`/admin/workflows/:id/queue`) — tenant-admin.
5. `CrossTenantFormTemplateLibrary` (`/admin/platform/forms/templates`) — platform-admin archetype publisher.

### ROLE-COVERAGE-MATRIX update for FLOW-21

anon ⚠️ (public forms) · public-mkt — · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (context-badge) · biz-partner ⚠️ (B2B context) · event-org ⚠️ (inherits) · platform-admin ⚠️ (library) · platform-support —

(Previously 2 cells; now **2 full + 5 partial** cells. +5 surfaces — most are light-weight context variants of the form runner, which is the correct architecture since tenants author their forms dynamically rather than ship per-role templates.)

---

## FLOW-22 — CMS Publishing

**Business-logic summary (from P1 inventory "CMS editorial workflow, versioned publishing, slug registry"):** Authors draft content → editors review → admin publishes → published content served to public readers. Versioned publishing with rollback. Slug registry prevents URL collisions across tenant. Some content is advertorial (paid by business-partners), some is promoted (via FLOW-20 ads), some is SEO-organic public content.

**Entry points:** `GET /` (public reader — homepage), `GET /blog/:slug` (public reader — article), `GET /cms/drafts` (tenant-user author), `GET /cms/edit/:id` (tenant-user author or tenant-admin editor), `GET /admin/cms/review-queue` (tenant-admin editor — review queue), `POST /cms/:id/publish` (tenant-admin).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Primary reader — consumes published articles via SEO/direct URL | Article page + related content + "Subscribe / Sign in" CTAs (no auth-gated affordances in body) | ✅ YES — public reader primary |
| **`public-marketplace-visitor`** | Permalink landing from share | Same as anonymous + highlighted-section if link targeted anchor | ⚠️ permalink variant (near-merge with anonymous) |
| **`tenant-user`** (author) | Drafts content, saves drafts, submits for review, reads their own pending drafts | Draft editor + submissions status + "my articles" list | ✅ YES — author primary |
| **`tenant-admin`** (editor) | Reviews drafts, edits copy, approves publish, manages slug registry, handles takedowns | Editor + review queue + publish controls + slug manager + version history | ✅ YES — editor primary |
| **`freelancer`** (content author hired for gig) | May be hired to produce content; uses standard author flow + gig-association metadata | Standard author view + "for which gig" breadcrumb | ⚠️ gig-context variant |
| **`business-partner`** (advertorial author) | Submits sponsored content; must go through tenant-admin approval | Same author flow as tenant-user + "sponsored" flag + advertorial-specific disclosure fields | ⚠️ advertorial variant |
| **`event-organiser`** | Publishes event-promotion articles tied to an event | Standard author flow + event-cross-link suggester | ⚠️ event-cross-link variant |
| **`platform-admin`** | Cross-tenant content policy, slug conflict resolution across tenants, global takedowns for ToS | Cross-tenant CMS ops console | ✅ YES — platform CMS ops |
| **`platform-support`** | Read-only article history for support tickets ("why was my article unpublished?") | Single-article state inspector + decision log | ⚠️ read-only variant |
| **`referral-user`** | — | Inherits tenant-user behaviour | — |

### Cross-role surfaces

- **Article page** at `/blog/:slug` is the classic anonymous-primary surface. Authenticated users may see additional affordances (bookmark, comment, reshare) but the *content render* is identical for all roles.
- **Editor queue** (`/admin/cms/review-queue`) is tenant-admin primary with platform-admin override for ToS takedowns.

### Template implications

1. `PublicArticlePage` (`/blog/:slug`) — anonymous + public-mkt primary; authenticated affordances conditionally overlay.
2. `CmsPublishingPage` (existing) → role-fork into 4 templates: tenant-user author / tenant-admin editor / platform-admin cross-tenant / platform-support read-only.
3. `AdvertorialSubmissionPage` (`/cms/advertorial/new`) — business-partner specific with disclosure fields.
4. `SlugRegistryAdminPage` (`/admin/cms/slugs`) — tenant-admin primary; platform-admin cross-tenant.

### Not-relevant roles

- Referral/event-organiser/freelancer are mostly CONTEXT VARIANTS on the author path, not full template branches. They inherit tenant-user.

### ROLE-COVERAGE-MATRIX update for FLOW-22

anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ✅ · referral — · freelancer ⚠️ (gig-context) · biz-partner ⚠️ (advertorial) · event-org ⚠️ (event-cross-link) · platform-admin ✅ · platform-support ⚠️ (read-only)

(Previously 4 cells; now **5 full + 4 partial** cells. +5 surfaces.)

---

## FLOW-23 — Form Builder Templates

**Business-logic summary (inferred from slug):** Template library for FLOW-21 form designer. Tenant-admins pick from a catalogue of pre-built form templates (event-registration, feedback, application, survey, questionnaire) and fork them into tenant-local forms. Platform-admins publish new archetypes to the shared library; tenant-admins consume + customize.

**Entry points:** `GET /admin/form-templates` (tenant-admin — library browse), `POST /admin/form-templates/:id/fork` (tenant-admin — fork into local form), `GET /admin/platform/form-templates` (platform-admin — archetype publisher).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Primary — browses library, forks templates into local forms, customizes | Template gallery + preview + "Fork this template" action | ✅ YES — admin library browser |
| **`tenant-user`** | Narrow — power-users with form-create permissions may browse templates (inherits admin UI with action-gate) | Same gallery; action gated to their permission | ⚠️ permission-gated variant |
| **`platform-admin`** | Archetype publisher — authors platform-shared templates, promotes community templates to official status | Template editor + promotion gate + library ops | ✅ YES — platform template ops |
| **`freelancer`** | Niche — may use templates for gig-intake forms | Library filtered to gig-relevant templates | ⚠️ filtered variant |
| **`business-partner`** | B2B procurement form templates | Library filtered to B2B-relevant templates | ⚠️ filtered variant |
| **`platform-support`** | Read-only — support audit of which templates a tenant uses | Single-tenant template usage inspector | ⚠️ support read-only |
| Others | — | No surface | — |

### Template implications

1. `TemplateBuilder` (existing) → role-fork: tenant-admin builder / platform-admin archetype publisher.
2. `FormTemplateLibraryPage` (`/admin/form-templates`) — tenant-admin browse.
3. `PlatformFormTemplateOpsPage` (`/admin/platform/form-templates`) — platform-admin.

### ROLE-COVERAGE-MATRIX update for FLOW-23

anon — · public-mkt — · tenant-user ⚠️ · tenant-admin ✅ · referral — · freelancer ⚠️ (filtered) · biz-partner ⚠️ (filtered) · event-org — · platform-admin ✅ · platform-support ⚠️

(Previously 2 cells; now **2 full + 4 partial** cells. +4 surfaces.)

---

## FLOW-24 — AI Safety & Moderation

**Business-logic summary (from P1 inventory "CF-465 IRON RULE, SafetyGateToken, 8 named checks, gamification ledger"):** AI-driven content moderation with safety-gate tokens. Admins configure policies; AI scans user-generated content across flows (posts, listings, reviews, messages); flagged content enters a moderation queue. End-users may appeal moderation decisions. CF-465 is an iron rule — no content ships without a SafetyGateToken from this flow.

**Entry points:** `GET /admin/moderation/queue` (tenant-admin), `POST /admin/moderation/:id/decide` (tenant-admin), `GET /admin/platform/moderation/policies` (platform-admin), `POST /moderation/appeal/:id` (tenant-user — appealing a decision), `POST /report` (any authenticated — report content).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-admin`** | Configures tenant-scoped safety policies, reviews moderation queue, approves/rejects flagged content | Queue UI + policy editor + appeal decisions | ✅ YES — tenant moderation |
| **`platform-admin`** | Global safety policy, SafetyGateToken provisioning, cross-tenant ToS sanctions, iron-rule enforcement | Global policy editor + cross-tenant queue + sanction actions | ✅ YES — platform safety ops |
| **`platform-support`** | Read-only audit, appeal escalation, policy-question triage | Per-ticket moderation-decision inspector + escalation path | ✅ YES — platform safety support |
| **`tenant-user`** | Receives moderation notifications (warnings/removals/bans) + submits appeals | "My moderation status" page + appeal form + decision history | ⚠️ user-visible slice |
| **`anonymous`** | Submits content report without auth (limited to public-facing content) | Public report form with CAPTCHA + rate-limit + no-tracking receipt | ⚠️ public report |
| `public-marketplace-visitor` / `referral-user` / `freelancer` / `business-partner` / `event-organiser` | Inherit tenant-user moderation-status behaviour | — | — |

### Cross-role surfaces

- **Report-content action** is surfaced universally — from ad cards (FLOW-20), post cards (FLOW-07), listings (FLOW-08), reviews (FLOW-10). The receiver is always FLOW-24.
- **Appeal page** is tenant-user specific; admin/platform admins see the appeal queue.

### Template implications

1. `AiSafetyModerationPage` (existing) → role-fork: tenant-admin / platform-admin / platform-support.
2. `MyModerationStatusPage` (`/my/moderation`) — tenant-user appeal surface (new).
3. `PublicReportContentPage` (`/report`) — anonymous public report.

### ROLE-COVERAGE-MATRIX update for FLOW-24

anon ⚠️ (public report) · public-mkt — · tenant-user ⚠️ (appeal slice) · tenant-admin ✅ · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ✅

(Previously 3 cells; now **3 full + 2 partial** cells. +2 surfaces.)

---

## FLOW-25 — BFA Cross-Flow Governance

**Business-logic summary (inferred from slug + CLAUDE.md):** Before-Flow-Activation (BFA) is XIIGen's governance gate — every new flow must pass BFA cross-flow validation (CF-rule arbiters, DNA-rule arbiters, schema-compatibility with the registry) before deployment. Platform operators own this surface. Tenant-admins who propose a custom tenant-flow see read-only BFA status for their submission.

**Entry points:** `GET /admin/platform/bfa` (platform-admin — BFA console), `GET /admin/platform/bfa/:flowId` (platform-admin — per-flow gate detail), `POST /admin/platform/bfa/:flowId/approve` (platform-admin), `GET /admin/my-flows/bfa` (tenant-admin — read-only status of their submitted flows).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`platform-admin`** | Primary — operates BFA gate: approves/rejects flow submissions, investigates rule violations, resolves cross-flow dependency conflicts | BFA console with rule arbiter trace + override actions + flow-dependency graph | ✅ YES — BFA ops primary |
| **`platform-support`** | Read-only — "why was this flow blocked at BFA?" for support tickets | Single-flow gate history + arbiter trace viewer | ⚠️ read-only variant |
| **`tenant-admin`** | Read-only — tenants who submit FREEDOM-flows see their BFA status (pending / passed / failed + remediation hints) | Per-submitted-flow status + "what to fix" hints | ⚠️ tenant-read-only |
| All other roles | — | Pure engine governance | — |

### Template implications

1. `BfaCrossFlowGovernancePage` (existing) → platform-admin primary.
2. `TenantSubmittedFlowsBFAPage` (`/admin/my-flows/bfa`) — tenant-admin read-only status.
3. `BFASupportInspectorPage` (`/support/bfa/:flowId`) — platform-support.

### ROLE-COVERAGE-MATRIX update for FLOW-25

anon — · public-mkt — · tenant-user — · tenant-admin ⚠️ (status-only) · referral — · freelancer — · biz-partner — · event-org — · platform-admin ✅ · platform-support ⚠️ (read-only)

(Previously 1 cell; now **1 full + 2 partial** cells. +2 surfaces.)

---

## Consolidated role signals across batch 5

| Role | Flows in batch 5 needing it | Notes |
|------|:---------------------------:|-------|
| `anonymous` | FLOW-21 ⚠️ (public forms), FLOW-22 ✅ (reader), FLOW-24 ⚠️ (report) | Public content is the primary anonymous surface |
| `public-marketplace-visitor` | FLOW-22 ✅ | Permalink landings |
| `tenant-user` | FLOW-21 ✅, FLOW-22 ✅, FLOW-23 ⚠️, FLOW-24 ⚠️ | Broad end-user surface |
| `tenant-admin` | All 5 (⚠️ on FLOW-25) | Densest role in batch 5 |
| `referral-user` | — | No dedicated surface in this batch |
| `freelancer` | FLOW-21 ⚠️, FLOW-22 ⚠️, FLOW-23 ⚠️ | Context variants on the authoring path |
| `business-partner` | FLOW-21 ⚠️, FLOW-22 ⚠️ (advertorial), FLOW-23 ⚠️ | B2B variants of forms + advertorial CMS |
| `event-organiser` | FLOW-21 ⚠️, FLOW-22 ⚠️ | Cross-cut with event flows |
| `platform-admin` | FLOW-21 ⚠️, FLOW-22 ✅, FLOW-23 ✅, FLOW-24 ✅, FLOW-25 ✅ | Pure ops surface |
| `platform-support` | FLOW-22 ⚠️, FLOW-23 ⚠️, FLOW-24 ✅, FLOW-25 ⚠️ | Read-only audit everywhere |

### Biggest finding in batch 5

**Batch 5 is the "form engine" batch.** FLOW-21 + FLOW-23 together teach the key architectural lesson: role-aware rendering of tenant-authored forms is NOT a template-per-role exercise — it's a **conditional-logic authoring primitive** the tenant uses inside the form definition itself. The `RoleScopedView` component is for *XIIGen-coded* screens; the FLOW-21 form runner exposes `viewerRole` as a VARIABLE inside conditional-logic expressions so the admin can write `"If viewerRole = freelancer, show hourly-rate field"` without touching React code.

**FLOW-22 CMS has the clearest public-reader surface of any flow outside the marketplace cluster.** It's #6 priority for RoleScopedView rollout — lower density than FLOW-16/08/12/17 but its anonymous reader page is the highest-traffic anonymous surface after the marketplace.

### Consolidated batch 1..5 density (per flow, top 20)

| Flow | Active role cells | Density rank |
|------|------------------:|-------------:|
| FLOW-16 marketplace-payments | 10 | #1 |
| FLOW-08 marketplace | 9 | #2 |
| FLOW-12 subscription-billing | 9 | #2 |
| FLOW-17 freelancer-marketplace | 9 | #2 |
| FLOW-22 cms-publishing | 9 (5 full + 4 partial) | #5 |
| FLOW-09 transactional-event-participation | 8 | #6 |
| FLOW-03 event-management | 8 | #6 |
| FLOW-20 ads-platform | 8 | #6 |
| FLOW-21 dynamic-forms-workflows | 7 (2 full + 5 partial) | #9 |
| FLOW-01 user-registration | 7 | #9 |
| FLOW-07 friend-request-social-feed | 7 | #9 |
| FLOW-10 reviews-reputation | 7 | #9 |
| FLOW-23 form-builder-templates | 6 (2 full + 4 partial) | #13 |
| FLOW-13 data-warehouse-analytics | 6 | #13 |
| FLOW-06 user-groups-communities | 6 | #13 |
| FLOW-15 saas-multi-tenancy | 6 | #13 |
| FLOW-24 ai-safety-moderation | 5 (3 full + 2 partial) | #17 |
| FLOW-04 event-attendance | 5 | #17 |
| FLOW-19 durable-sagas-compliance | 4 | #19 |
| FLOW-02 profile-enrichment | 4 | #19 |

---

## Fleet-wide plan validation status (end of batch 5)

| Plan | 48-flow coverage | Tested | UI/UX examined | Business-state evident |
|------|------------------|--------|----------------|------------------------|
| P14b FLOW-SESSION-VISUALIZATION-v2 | ✅ 48/48 — 164 PNGs | ✅ | ✅ | ✅ |
| UX-FIX-THREE-TRACK | ✅ | ✅ | ✅ | ✅ |
| UX-FIX-EXECUTION (7-task v2) | ✅ | ✅ | ✅ | n/a |
| P14-EXECUTION (P1-14 test coverage) | ✅ | ✅ | ✅ | ✅ |
| FLOW-UI-COVERAGE-PLAN-UNIFIED | ✅ all 48 | ✅ | ✅ | ✅ |
| FLOW-48-PLAN-P1-P14 (i18n) | ✅ | ✅ 12/12 Playwright | ✅ 14 PNGs w/ Hebrew | ✅ |
| ui-ux-pro-max-skill-main | ✅ baseline; 43 pages pending useTranslation wiring | partial | ✅ | ✅ |
| **C6 role-aware templating** | 🟡 scaffold + FLOW-08 pilot; 47 flows pending rollout — **198-cell target (revised)** | 🟡 1 flow × 7 roles | 🟡 | 🟡 |

**Overall gate:** 7 of 8 plans GREEN. C6 rollout progressing — **5 of 10 batches DONE** (half-fleet milestone reached).

---

## Running coverage target

- Initial: ~135 cells
- After batch 1: +9 → 144
- After batch 2: +20 → 155
- After batch 3: +18 → 173
- After batch 4: +7 → 180
- **After batch 5: +18 → 198**

Fleet target is converging toward the 200-220 band predicted in batch 4.

**Top-5 rollout priority (after batch 5):** Unchanged from batch 4:

1. FLOW-16 marketplace-payments — 10 cells
2. FLOW-08 marketplace — 9 cells
3. FLOW-12 subscription-billing — 9 cells
4. FLOW-17 freelancer-marketplace — 9 cells
5. FLOW-22 cms-publishing — 9 cells (NEW ENTRY — ties FLOW-03/09)

**Architectural note for implementers:** Batch 5 clarified that the `RoleScopedView` primitive applies to **XIIGen-coded screens**. Tenant-authored form definitions (FLOW-21) need a complementary concept — a `viewerRole` variable accessible to conditional-logic expressions inside the form DSL. This is a FLOW-21 design decision, not a `RoleScopedView` bug.

---

## Next batch

Batch 6 target: **FLOW-26 → FLOW-30** (meta-flow-engine, human-interaction-gate, blog-cms-modules, adaptive-rag-deep-research, tenant-lifecycle-manager). Mostly engine-internal + platform-admin heavy. FLOW-28 blog-cms-modules will be similar to FLOW-22 CMS in density (public readers + authors + admin); others will be admin-narrow.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-06.md` on the next run.

---

## Footer

Produces artifact at: `docs/design-reviews/ROLE-ANALYSIS-BATCH-05.md`.
Companion: `docs/design-reviews/ROLE-COVERAGE-MATRIX.md` (matrix rows 21..25 updated).
Prior batches: `ROLE-ANALYSIS-BATCH-01.md` through `-04.md`.
Fleet verdict context: `docs/design-reviews/FLEET-VALIDATION-v2.md`.
