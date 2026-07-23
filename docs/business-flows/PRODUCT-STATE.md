# The XIIGen Product — State Map

**Date:** 2026-04-22
**Scope:** All 48 canonical flows
**Audience:** Product designer or AI session opening the repo cold
**Source of truth:** `docs/business-flows/` (specs) + `docs/screen-examination/` (examination records) + `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` (implementation state)

---

## The product in one paragraph

XIIGen today is a community platform with working signup, events, learning, social, marketplace, and billing. Users can sign up, verify email, walk onboarding, fill a profile, create and attend events, earn XP and streaks for completing activities, post to a social feed, browse a marketplace and buy things, subscribe to plans, and leave reviews. Admins can register schema versions and monitor a deep-research pipeline. That's 14 user intents live today. Another 11 are **half-built** — the services exist, tests pass, but the screen the user sees is still a generic admin table or a key route is missing; a small unblock puts each on the product. A further ~21 are **designed on paper, not built yet** — specs exist, scaffolding may exist, but the work to wire them hasn't been done. A handful are **just titles**: named placeholders with no spec.

Three flows (ads privacy, dynamic forms, blog) have complete back-ends with **no public route at all** — the biggest wins available for a short unblock. One flow (multi-stack porting) has **27 services built** with the UI sitting orphaned behind the default admin table — same 5-line page rewrite that closed the same bug for History Bootstrap.

---

## What a user can do today — actually running in the product

### Onboarding & identity

- **A new community member signs up, verifies their email, and walks onboarding.** Live. 6 pages, 3 services, 18 screenshots passing. Spec: [`01-user-registration.md`](01-user-registration.md). Examination: [`user-registration-examination.md`](../screen-examination/user-registration-examination.md).
- **A member fills out their profile and gets matched to projects.** Live but imperfect. 3 pages (questionnaire, matching, personalisation), 7 services. One test track is red — rendering polish needed before I'd call it fully live. Spec: [`02-profile-enrichment.md`](02-profile-enrichment.md). Examination: [`profile-enrichment-examination.md`](../screen-examination/profile-enrichment-examination.md).

### Events

- **An organiser creates, promotes, and publishes an event.** Live. 4-step wizard (Details → Tickets → Promotion → Publish), AI-suggested tags, audience prediction post-publish. 2 pages, 4 services, 25 screenshots. Spec: [`03-event-management.md`](03-event-management.md). Examination: [`event-management-examination.md`](../screen-examination/event-management-examination.md).
- **A user RSVPs to and attends an event.** Live. 5 services. (The zip numbered the slot "04" as content publishing; today's FLOW-04 event-attendance grew independently — see "Naming conflicts" below.) Examination: [`event-attendance-examination.md`](../screen-examination/event-attendance-examination.md).
- **A user transacts around an event** (paid-ticket pipeline). Live pipeline; runs on upstream flows, 0 dedicated services. Spec: [`09-transactional-event-participation.md`](09-transactional-event-participation.md).

### Learning & achievement

- **A member completes an activity, earns XP, builds a streak, collects badges.** Live. Celebratory completion screen, streak counter, badge grid, peer "high-five" feed. 4 pages, 16 services, 29 screenshots — one of the richest surfaces in the product. Spec: [`05-completion-gamification.md`](05-completion-gamification.md). Examination: [`completion-gamification-examination.md`](../screen-examination/completion-gamification-examination.md).

### Social

- **A user joins groups and communities.** Live. 4 services. Spec implied in marketplace/social specs; examination: [`user-groups-communities-examination.md`](../screen-examination/user-groups-communities-examination.md).
- **A user posts to a feed, sends and accepts friend requests.** Live. 4 pages (feed, friend-requests, social-graph, connections), 10 services, 31 screenshots — the densest social surface. The feed still renders on a default table; purpose-built card layout not built yet. Spec: [`07-friend-request-social-feed.md`](07-friend-request-social-feed.md). Examination: [`friend-request-social-feed-examination.md`](../screen-examination/friend-request-social-feed-examination.md).
- **A user leaves reviews, builds reputation.** Live. Star rating + moderation queue. 4 pages, 4 services. Examination: [`reviews-reputation-examination.md`](../screen-examination/reviews-reputation-examination.md).

### Commerce

- **A seller lists a product, a buyer browses and purchases.** Live. 5 pages spanning public browse + seller admin, 6 services, 14 screenshots. Spec: [`08-marketplace.md`](08-marketplace.md). Examination: [`marketplace-examination.md`](../screen-examination/marketplace-examination.md).
- **A customer subscribes to a plan, views invoices, manages billing.** Live. Current-plan card + invoice list with PAID / FAILED / VOIDED / OPEN states + download-PDF + inline retry. 3 pages, 4 services, 9 screenshots. Spec: [`12-subscription-billing.md`](12-subscription-billing.md). Examination: [`subscription-billing-examination.md`](../screen-examination/subscription-billing-examination.md).

### Platform operations (admin audience)

- **A platform admin registers a schema version, sees a dependency graph.** Live. 3 pages (registry, submission, DAG-visualisation), 20 services, 14 screenshots. Spec: [`_orphans/32-first rag initialization.md`](_orphans/32-first rag initialization.md) + examination: [`schema-registry-dag-examination.md`](../screen-examination/schema-registry-dag-examination.md). (No zip base-spec under the `11-` number; the schema-registry idea was extracted from the system-initiation work.)
- **A platform agent monitors the product + tenant platform view.** Live. 6 services. Examination: [`platform-agent-examination.md`](../screen-examination/platform-agent-examination.md).
- **An ML-ops admin watches a deep-research run and decides kill / rebudget / let finish.** Live — and this is the **reference implementation** for the topology-canvas grammar. Passing screenshots at `docs/e2e-snapshots/c6-role-coverage/flow-29-*.png` are the benchmark every other admin dashboard is measured against. 0 dedicated services (pipeline draws on upstream). Spec: [`29-adaptive-rag-deep-research.md`](29-adaptive-rag-deep-research.md). Examination: [`adaptive-rag-deep-research-examination.md`](../screen-examination/adaptive-rag-deep-research-examination.md).

---

## Half-built — code exists, the UI the user would see is wrong or missing

These are the **biggest product wins available for short money**. The services are written; a page rewrite or a route addition makes them visible.

### Biggest wins available for a small unblock

- **A reader reads a blog post; an author writes and publishes one.** 18 services built. Author UI still renders the default admin table. *No public `/blog` or `/blog/:slug` route exists at all* — the biggest content gap in the product. Spec: [`28-blog-cms-modules.md`](28-blog-cms-modules.md) (resolved from zip's `04-post-publishing`). Examination: [`blog-cms-modules-examination.md`](../screen-examination/blog-cms-modules-examination.md).
- **A multi-stack-porting admin reviews whether the engine can run on Node vs Python vs PHP.** **27 services** built (the most for any admin flow), purpose-built screen (`StackPortingScreen`) sits orphaned in the components directory; the page wrapper still renders the default admin table. *The single biggest implementation-to-UI gap in the product.* A 5-line page rewrite — the exact pattern already used to close the same bug for the History Bootstrap flow — surfaces the real UI. Examination: [`design-system-governance-examination.md`](../screen-examination/design-system-governance-examination.md).
- **A feature-registry admin reviews which features are portable, which are engine-only, which have porting decisions pending.** 7 services, 34 screenshots (the densest PNG inventory), purpose-built `FeatureMatrixScreen` orphaned, same 5-line page fix pending. Examination: [`feature-registry-examination.md`](../screen-examination/feature-registry-examination.md).
- **A visitor submits a dynamic form at `/forms/:schemaId`.** Server built (4 services). Public route doesn't exist. Spec: [`21-dynamic-forms-workflows.md`](21-dynamic-forms-workflows.md).
- **A user changes privacy/consent settings at `/settings/privacy`.** Server built (4 services — the ads-platform consent enforcer). Client route missing. Spec: [`20-ads-platform.md`](20-ads-platform.md).
- **A user changes their language/locale at `/settings/language`.** Server built. Client route missing. Spec: [`48-i18n-translation.md`](48-i18n-translation.md) (resolved from zip's `34-translate to alternatives`).

### Smaller unblocks

- **An admin watches the RAG quality-feedback dashboard.** 5 services, `RagQualityScreen` orphaned, same page-rewrite fix. Spec: [`38-rag-quality-feedback.md`](38-rag-quality-feedback.md) (resolved from zip's `30-prompt improvements`). Examination: [`rag-quality-feedback-examination.md`](../screen-examination/rag-quality-feedback-examination.md).
- **An admin tracks OSS curriculum progress.** 4 services, `OssCurriculumScreen` orphaned. Examination: [`oss-curriculum-examination.md`](../screen-examination/oss-curriculum-examination.md).
- **An admin monitors client-push delivery.** 3 services, `ClientPushScreen` orphaned. Examination: [`client-push-examination.md`](../screen-examination/client-push-examination.md).
- **A tenant discovers, installs, and shares flows on a marketplace.** 20 services built, no marketplace wiring — tenants can't discover or install what's been built. Spec: [`32-sharable-flows-marketplace.md`](32-sharable-flows-marketplace.md). Examination: [`sharable-flows-marketplace-examination.md`](../screen-examination/sharable-flows-marketplace-examination.md).
- **An analyst queries warehouse + ETL admin views.** 15 + 12 services on disk; no pipeline wiring. Spec: [`13-data-warehouse-analytics.md`](13-data-warehouse-analytics.md). Examinations: [`data-warehouse-analytics-examination.md`](../screen-examination/data-warehouse-analytics-examination.md), [`etl-data-integration-examination.md`](../screen-examination/etl-data-integration-examination.md).

---

## Designed on paper, not on screen yet

Specs written; code scaffolded to varying degrees; no user-visible delivery yet.

### Commerce completeness

- **A buyer goes through checkout (including escrow, 10 role variants, admin refund queue).** Richest role-coverage spec in the corpus — 10 roles including anonymous guest checkout, freelancer escrow, business-partner invoicing, event-organiser payout splits, platform fees, support read-only. Stripe-style two-column checkout designed. 2 pages scaffolded; not wired to payment infrastructure. Spec: [`16-marketplace-payments.md`](16-marketplace-payments.md). Examination: [`marketplace-payments-examination.md`](../screen-examination/marketplace-payments-examination.md).
- **A hirer finds a freelancer, a freelancer delivers work.** 4 services scaffolded. Spec: [`17-freelancer-marketplace.md`](17-freelancer-marketplace.md). Examination: [`freelancer-marketplace-examination.md`](../screen-examination/freelancer-marketplace-examination.md).
- **A tenant admin manages workspace settings** (General / Members / Billing / Integrations / Advanced with Danger-zone). 2 pages stubbed; settings-tabs layout not built. Spec: [`15-saas-multi-tenancy.md`](15-saas-multi-tenancy.md). Examination: [`saas-multi-tenancy-examination.md`](../screen-examination/saas-multi-tenancy-examination.md).

### Content creation tooling

- **A user designs a visual flow** (node editor). Spec: [`18-visual-flow-engine.md`](18-visual-flow-engine.md). Examination: [`visual-flow-engine-examination.md`](../screen-examination/visual-flow-engine-examination.md).
- **An author uses a WYSIWYG CMS** (author console + public reader). Examination: [`cms-publishing-examination.md`](../screen-examination/cms-publishing-examination.md).
- **A platform admin authors form-builder templates** for tenants to use. 13 services on disk (the highest for any "designed" flow), no UI. Spec: [`23-form-builder-templates.md`](23-form-builder-templates.md). Examination: [`form-builder-templates-examination.md`](../screen-examination/form-builder-templates-examination.md).

### Trust & safety

- **A user reports bad content; a moderator reviews.** Report form + verdict queue designed. 1 service. Examination: [`ai-safety-moderation-examination.md`](../screen-examination/ai-safety-moderation-examination.md).
- **Long-running jobs are durable against failures, with compliance audit.** Designed. 4 services. Spec: [`19-durable-sagas-compliance.md`](19-durable-sagas-compliance.md). Examination: [`durable-sagas-compliance-examination.md`](../screen-examination/durable-sagas-compliance-examination.md).

### Engine self-governance (admin-only)

- **The platform evaluates flow-to-flow conflicts** (BFA cross-flow governance). Designed. 0 services. Spec: [`25-bfa-cross-flow-governance.md`](25-bfa-cross-flow-governance.md). Examination: [`bfa-cross-flow-governance-examination.md`](../screen-examination/bfa-cross-flow-governance-examination.md).
- **The system pauses and asks a human when it's unsure** (human interaction gate). Designed. 0 services. Spec: [`27-human-interaction-gate.md`](27-human-interaction-gate.md). Examination: [`human-interaction-gate-examination.md`](../screen-examination/human-interaction-gate-examination.md).
- **The engine develops its own new flows** (self-developing / meta-flow engine / meta-arbitration engine). Designed. 0 services. Specs: [`26-meta-flow-engine.md`](26-meta-flow-engine.md). Examinations: [`meta-flow-engine-examination.md`](../screen-examination/meta-flow-engine-examination.md), [`meta-arbitration-engine-examination.md`](../screen-examination/meta-arbitration-engine-examination.md).
- **A platform admin provisions a new tenant** (cross-tenant dashboard). Designed. 0 services. Examination: [`tenant-lifecycle-manager-examination.md`](../screen-examination/tenant-lifecycle-manager-examination.md).
- **Design-intelligence engine for tracking design quality trends.** Designed. 0 services. Spec: [`31-design-intelligence-engine.md`](31-design-intelligence-engine.md). Examination: [`design-intelligence-engine-examination.md`](../screen-examination/design-intelligence-engine-examination.md).
- **An admin watches system bootstrap progress.** Designed. 0 services. Spec: [`33-system-initiation-bootstrap.md`](33-system-initiation-bootstrap.md). Examination: [`system-initiation-bootstrap-examination.md`](../screen-examination/system-initiation-bootstrap-examination.md).
- **A tenant activates a feature bundle** (progress strip). Designed. Examination: [`bundle-activation-examination.md`](../screen-examination/bundle-activation-examination.md).
- **A tenant forks + adapts + exports + tests a flow module in isolation** (module lifecycle). Partial — this is the unresolved architect goal from earlier sessions. Examination: [`module-lifecycle-examination.md`](../screen-examination/module-lifecycle-examination.md).

### Platform marketplace

- **A developer installs a plugin adapter for a third-party platform** (today's FLOW-34). Intent unclear; see naming-conflicts below. Examination: [`marketplace-plugin-adapter-examination.md`](../screen-examination/marketplace-plugin-adapter-examination.md).

---

## Still just a title

- **Canva / Miro / Webflow / Framer adapters** — intentionally external, living in separate repos. Not XIIGen pages. Correctly out of scope. Examination: [`external-adapters-examination.md`](../screen-examination/external-adapters-examination.md).
- **Platform-agent-instrumentation, RAG-quality-graph, meta-flow-orchestration, AI-self-modification, cycle-chain-extension** — named placeholders in the flow matrix. No specs, no services. These are reserved slots for future work.

---

## Content left behind in the playbook

The zip contained material that doesn't correspond to a single flow but is preserved for reference:

- **Learning calendar extension** (`_orphans/`) — an idea to extend events or lessons with a calendar; never got a flow number.
- **Shops P3..P7 expansion + social network P1..P3 expansion** (`_legacy-engine-artifacts/marketplace/` and `_legacy-engine-artifacts/friend-request-social-feed/`) — sub-design rounds now subsumed into today's marketplace and friend-feed flows.
- **Cross-cutting architecture substrate** (`_cross-cutting/`) — the UML model (469 KB draw.io + 140 KB markdown), original PRD, multi-tenant doctrine. Read these for platform-wide decisions.
- **Pre-merge engine artifacts** (`_legacy-engine-artifacts/`) — 109 files of old ENGINE_ARCHITECTURE / TASK_TYPES / BFA / SKILLS from earlier design rounds. Superseded by `docs/architecture/ENGINE_ARCHITECTURE_MERGED.md` etc. Kept as history.

---

## Naming conflicts — resolved 2026-04-22

Three files in the source zip describe product intents that no longer match the slug under the same number after the 2026-03 flow renumber. Resolutions applied; each resolved spec carries the rationale in its provenance header.

**"Post-publishing" (zip `04-`) → blog authoring (flow `28-`).**
The zip's `04-post-publishing.md` describes content authoring, sanitization, and public publishing — content that maps one-for-one to today's blog-cms-modules flow. Today's FLOW-04 slug is "event-attendance" — a different intent that grew from FLOW-03 event-management + FLOW-09 transactional-event-participation. Event-attendance has no dedicated zip spec; it uses the examination record at `docs/screen-examination/event-attendance-examination.md` as its product source.

**"Prompt improvements" (zip `30-`) → RAG quality feedback (flow `38-`).**
The zip-30 bundle (base spec + engine artifacts + input zip) describes the prompt-versioning and quality-scoring learning loop — AF-9 scoring, PromptPatch generation, RAG pattern quality updates. Today's FLOW-30 slug "tenant-lifecycle-manager" is a cross-tenant admin dashboard concept, unrelated to the prompt loop. Today's FLOW-38 is the learning loop, so zip-30 content lives under `38-rag-quality-feedback.md`.

**"Translate to alternatives" (zip `34-`) → translation (flow `48-`).**
The zip-34 bundle describes locale detection and alternative-content rendering. Today's FLOW-34 slug "marketplace-plugin-adapter" (Canva, Miro, Webflow, Framer adapters) is a different concept that post-dates the renumber and has no dedicated zip spec. Zip-34 lives under `48-i18n-translation.md`.

---

## Three-way accounting

| | Count | Notes |
|---|---:|---|
| User intents live today | 14 | What a user can do right now, with working pages and services (canonical count; matches `FLOW-BY-FLOW-STATUS.md`) |
| Half-built (small unblock surfaces them) | ~11 | Services built, UI is generic CRUD or missing route — include the ~30k lines of code sitting behind the default admin table |
| Designed on paper, not on screen | ~21 | Specs exist; varying degrees of scaffolding; no user-visible delivery |
| Sketched only | 5 external + 5 internal placeholders | Names without substance (adapters are intentionally external) |
| Total | 48 canonical flows + 3 orphan ideas | — |

Three flows have zero-route-exists problems (blog, dynamic forms, privacy, language) — **these are the cheapest product wins on the board**: server already built, one-line route + one page surfaces each.

Five flows have orphaned-screen problems (feature-registry, multi-stack-porting, RAG-quality, OSS-curriculum, client-push) — the **5-line page rewrite pattern from History Bootstrap** fixes each in minutes.

---

## Sources + reproducibility

Compiled from:
- [`docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md`](../sessions/47-FLOW-CURRENT-STATE-MASTER.md) — per-flow implementation state (authored 2026-04-17)
- [`docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json`](../sessions/) — per-flow services + tests + pages counts
- [`docs/screen-examination/{slug}-examination.md`](../screen-examination/) — 45 examination records with user-intent extractions (authored 2026-04-20)
- [`docs/business-flows/NN-{slug}.md`](.) — 27 primary specs extracted 2026-04-22 from `business flows.zip`
- [`.claude/skills/flow-prep-library/planning--business-flows-registry.md`](../../.claude/skills/flow-prep-library/planning--business-flows-registry.md) — canonical slug + grammar registry

To regenerate: extract business flows.zip, run `docs/sessions/business-flows-integration/park-specs.py`, re-read the sources above, rewrite this document in the same shape.

---

## What each state means

| Badge | Meaning |
|---|---|
| **Live** | Services exist, topology exists, pages render, tests pass |
| **Half-built** | Services and spec exist but the page the user would see is the generic admin table OR a key route is missing |
| **Designed** | Spec describes intent; little or no code; no pipeline wiring |
| **Sketched** | Named placeholder, no spec, no services |

See [`README.md`](README.md) for navigation of this directory.
