# Flow-by-Flow Status — What's Built vs What Stayed on Paper

**Date:** 2026-04-22
**Audience:** Product designer, founder, stakeholder — anyone who wants a readable per-flow status without tech jargon
**Method:** Cross-checked three sources per flow — PM spec in `docs/business-flows/`, examination record in `docs/screen-examination/`, implementation reality in `docs/sessions/47-FLOW-CURRENT-STATE-MASTER.md` and per-flow `IMPL-STATE.json` files
**Scope:** All 48 canonical flows

---

## How to read this

Each flow gets a short section:

- **Intent** — one sentence in product-designer voice: what does the user want to do here?
- **Built today** — what's actually on disk and observable: services, pages, pipeline wiring, screenshots
- **Stayed in planning** — what's described in the PM spec but hasn't materialised in code or UI
- **Verdict** — one of Live / Half-built / Designed / Sketched, with a one-line "why"

---

## Onboarding & identity

### FLOW-00 — Bundle activation
- **Intent:** A tenant activates a feature bundle and watches the provisioning progress.
- **Built today:** Nothing observable yet. No dedicated services. Intent is an admin progress-strip view.
- **Stayed in planning:** The full activation pipeline and the per-step progress display.
- **Verdict:** **Designed** — spec exists; no code.

### FLOW-01 — User registration
- **Intent:** A new community member signs up (SSO or email), verifies email, walks a 3-step onboarding wizard, and lands on a personalised dashboard.
- **Built today:** 3 services (registration, email-verification, onboarding-delivery), 6 pages (Registration, RegistrationPending, VerifyToken, Resend, Onboarding, SSO), 18 screenshots on file, full test suite, topology wired, marketplace pipeline passing.
- **Stayed in planning:** Minor edge cases — clearer recovery paths for expired verification tokens, celebratory animation on verify.
- **Verdict:** **Live** — the canonical onboarding flow.

### FLOW-02 — Profile enrichment
- **Intent:** A freshly-registered member answers a skills questionnaire, sees 3–5 suggested projects, personalises their feed.
- **Built today:** 7 services, 3 pages (Questionnaire, Matching, Personalization), 15 screenshots. Pipeline runs.
- **Stayed in planning:** Rendering polish — one test track is red, no-matches empty state needs the right CTA, step indicator not finalised.
- **Verdict:** **Half-built** — runs end-to-end but the screen detail isn't shippable.

---

## Events

### FLOW-03 — Event management
- **Intent:** An organiser creates, promotes, and publishes an event via a 4-step wizard (Details → Tickets → Promotion → Publish).
- **Built today:** 4 services, 2 pages (EventList, EventCreation), 25 screenshots, pipeline passing.
- **Stayed in planning:** The right-panel live preview next to the wizard steps, post-publish audience-prediction card.
- **Verdict:** **Live** — wizard works; UI polish pending.

### FLOW-04 — Event attendance
- **Intent:** A member RSVPs to and attends an event (discovers, registers, participates).
- **Built today:** 5 services, pipeline passing on all tracks, 31 screenshots, 4 pages.
- **Stayed in planning:** No dedicated PM spec ever existed for this flow number — the zip's `04-post-publishing.md` describes blog publishing (mapped to FLOW-28 on 2026-04-22). Event-attendance grew organically out of FLOW-03 + FLOW-09 and uses the examination record as its source.
- **Verdict:** **Live** — the functionality works even though its PM-narrative origin is the examination record, not the zip.

---

## Learning & achievement

### FLOW-05 — Completion & gamification
- **Intent:** A member completes an activity, sees a celebratory screen, earns XP, extends a streak, collects badges, shares with peers.
- **Built today:** **16 services** (the most for any consumer flow), 4 pages (GamificationDashboard, LearningProgress, LessonCompletion, SocialLearning), 29 screenshots, pipeline passing.
- **Stayed in planning:** Full-screen kiosk treatment for the completion moment, confetti/badge animation, more expressive XP reveal.
- **Verdict:** **Live** — richest consumer surface in the product.

---

## Community & social

### FLOW-06 — User groups & communities
- **Intent:** A member joins, creates, and participates in topic-based groups.
- **Built today:** 4 services, pipeline passing. 19 session files.
- **Stayed in planning:** Dedicated PM spec doesn't exist for FLOW-06 specifically — the zip's `06-marketplace-publishing.md` content maps to FLOW-08 marketplace. Community functionality is implemented but its spec lives in the examination record.
- **Verdict:** **Live** — works; spec provenance is the examination record.

### FLOW-07 — Friend requests & social feed
- **Intent:** A member posts to a feed, sends and accepts friend requests, sees peer activity.
- **Built today:** **10 services**, 4 pages (Connections, FriendRequest, SocialFeed, SocialGraph), **31 screenshots** (densest social surface), pipeline passing.
- **Stayed in planning:** The feed still renders on a default table; purpose-built card layout (avatar + name + timestamp + body + like/comment/share) hasn't been wired. Empty-feed teaching copy.
- **Verdict:** **Live** pipeline; **Half-built** UI — works but looks like an admin table where it should feel like Twitter/LinkedIn.

### FLOW-10 — Reviews & reputation
- **Intent:** A member leaves a star-rating review; subjects respond; moderators handle borderline cases; a trust score surfaces.
- **Built today:** 4 services, 4 pages (ReviewSubmission, ReviewModeration, ReputationDashboard, ReviewResponse), 10 screenshots.
- **Stayed in planning:** Empty-state teaching copy, reviewer response affordance polish, moderation verdict-grid UI.
- **Verdict:** **Live** — works; rendering polish pending.

---

## Commerce

### FLOW-08 — Marketplace
- **Intent:** A seller lists a product, buyers browse a public marketplace with filters and search, transact.
- **Built today:** 6 services, 5 pages (BootstrapStatus, EventDiscovery, EventRegistration, ParticipationStatus, PurchaseHistory), 14 screenshots, pipeline passing.
- **Stayed in planning:** Product-grid card format (price top-right, rating stars, state badge), filter sidebar, per-role empty states.
- **Verdict:** **Live** — browse + purchase work; card rendering not purpose-built.

### FLOW-09 — Transactional event participation
- **Intent:** A member pays for an event ticket, the ticket state machine advances, downstream flows consume.
- **Built today:** Pipeline passing on all tracks. **0 dedicated services** — runs on upstream flow orchestration.
- **Stayed in planning:** Nothing major — this flow glues other flows together; most work happens upstream.
- **Verdict:** **Live** — lightweight by design.

### FLOW-12 — Subscription & billing
- **Intent:** A customer picks a plan, views invoices, manages payment methods, upgrades or downgrades.
- **Built today:** 4 services, 3 pages (SubscriptionPlan, Subscribe, BillingDashboard), 9 screenshots, pipeline passing.
- **Stayed in planning:** Empty-state copy, retry action on FAILED invoices, PDF download affordance.
- **Verdict:** **Live** — plan + invoice list work; minor polish pending.

### FLOW-16 — Marketplace payments (checkout + escrow)
- **Intent:** A buyer goes through checkout (guest or authenticated), payment flows through escrow for B2B/freelancer use cases, admin handles the refund queue.
- **Built today:** 4 services, 2 pages (Checkout, EscrowDashboard), 6 screenshots. Pipeline **not wired** to payment infrastructure.
- **Stayed in planning:** The richest role-variant spec in the whole corpus — **10 roles** (anonymous guest, public visitor, buyer, admin, referral user, freelancer escrow payee, B2B partner, event-organiser payout, platform fees, support read-only). Stripe-style two-column checkout layout. Per-role escrow dashboards. Admin refund verdict-grid.
- **Verdict:** **Designed** — richest spec on the shelf; wiring not done.

### FLOW-17 — Freelancer marketplace
- **Intent:** A hirer posts a job, freelancers apply, work is delivered through escrow, both sides review.
- **Built today:** 4 services scaffolded. No UI beyond stubs.
- **Stayed in planning:** The whole marketplace surface — job posting, freelancer discovery, applications, escrow handoff to FLOW-16, dual review back to FLOW-10.
- **Verdict:** **Designed** — spec rich; code minimal.

### FLOW-32 — Sharable flows marketplace
- **Intent:** A tenant discovers, installs, and shares flows as reusable modules.
- **Built today:** **20 services** (the second-highest for any flow), 22 session files. No marketplace wiring — tenants can't discover or install what's been built.
- **Stayed in planning:** The whole discoverability layer — listing, install flow, fork button, per-tenant adaptation.
- **Verdict:** **Half-built** — major infrastructure done; the user-facing marketplace is invisible.

---

## Content creation & publishing

### FLOW-21 — Dynamic forms & workflows
- **Intent:** A creator builds a custom form; an end-user fills it in at a public URL.
- **Built today:** 4 services (FormSubmissionProcessor etc.), pipeline scaffolded. `publicUrl` computed. **The public `/forms/:schemaId` route does not exist** — end users can't reach the forms.
- **Stayed in planning:** Settings-tabs layout for the form builder; the public form page itself.
- **Verdict:** **Half-built** — a one-route-plus-one-page unblock surfaces a working flow.

### FLOW-22 — CMS publishing
- **Intent:** An author writes and publishes content through a CMS; a public reader consumes it.
- **Built today:** 4 services. No purpose-built UI.
- **Stayed in planning:** The author console and the public-reader page — both designed, neither built.
- **Verdict:** **Designed**.

### FLOW-23 — Form-builder templates
- **Intent:** A platform admin authors reusable form templates tenants can start from.
- **Built today:** **13 services** (more than FLOW-21 which consumes it). No UI.
- **Stayed in planning:** The template authoring console and the template discovery page tenants would use.
- **Verdict:** **Designed** — unusually heavy back-end for a flow with no front-end yet.

### FLOW-28 — Blog CMS modules
- **Intent:** A tenant author writes blog posts with a WYSIWYG editor; public readers consume them at `/blog` and `/blog/:slug` with zero-chrome reader pages.
- **Built today:** **18 services** (a whole content pipeline — XSS/SSRF sanitization, cache-first published-only index, budget gating), 13 screenshots. **Neither `/blog` nor `/blog/:slug` exists as a public route.** Author UI still renders the default admin table.
- **Stayed in planning:** The public reader (Medium-style zero-chrome layout), the author's card-list dashboard (Draft / Published / Scheduled badges), WYSIWYG editor.
- **Verdict:** **Half-built** — the biggest content gap in the product; servers run fine, no user can see anything.
- **Provenance note:** Primary spec is `28-blog-cms-modules.md` (resolved 2026-04-22 from the zip's `04-post-publishing.md`).

---

## Platform operations — built for platform admins

### FLOW-11 — Schema registry & DAG
- **Intent:** A platform admin registers a new schema version, the system validates it against the dependency DAG for conflicts, publishes it.
- **Built today:** **20 services**, 3 pages (SchemaRegistry, SchemaSubmission, DagVisualization), 14 screenshots, pipeline passing.
- **Stayed in planning:** Compound-grammar rendering (progress strip next to DAG canvas), colour-per-compatibility-status on nodes.
- **Verdict:** **Live** — most code-heavy "live" admin flow.

### FLOW-13 — Data warehouse & analytics
- **Intent:** An analyst queries the data warehouse through an admin dashboard; metric tiles surface key trends.
- **Built today:** 15 services on disk. No marketplace wiring. Pages are stubs.
- **Stayed in planning:** The Grammar-6 dashboard: metric tiles, trend charts, drill-down. The whole user-facing analytics experience.
- **Verdict:** **Half-built** — code exists; the admin can't see anything yet.

### FLOW-14 — ETL data integration
- **Intent:** An admin configures and monitors ETL pipelines between external sources and the warehouse.
- **Built today:** 12 services. Topology missing — pipeline can't run as a flow yet.
- **Stayed in planning:** The progress-strip UI showing each pipeline phase; the pipeline runner wiring.
- **Verdict:** **Half-built**.

### FLOW-15 — SaaS multi-tenancy (workspace settings)
- **Intent:** A tenant admin configures their workspace — General / Members / Billing / Integrations / Advanced / Danger-zone — Linear/Notion/Vercel style.
- **Built today:** 4 services, 2 pages (TenantLifecycle, TenantProvisioning). Settings-tabs layout not built; current pages don't match the tabs-plus-danger-zone spec.
- **Stayed in planning:** The left-rail tabs layout, General tab (workspace name/slug/logo), Members tab with invites, Billing tab linking to FLOW-12, Integrations tab linking to plugin adapters, Danger zone.
- **Verdict:** **Designed** — the 40-contracts/7-checks/52-events spec is explicit; tabs UI is a blank template.
- **Provenance note:** Primary spec merged from the zip's two multi-tenant deep-research reports (no standalone base file).

### FLOW-18 — Visual flow engine
- **Intent:** A designer drags-and-drops nodes to compose a flow in a canvas editor.
- **Built today:** 4 services. No canvas UI.
- **Stayed in planning:** The whole node-editor — node types, edge validation, layout engine, inspector side-panel.
- **Verdict:** **Designed**.

### FLOW-19 — Durable sagas & compliance
- **Intent:** Long-running jobs survive failures through saga compensation; every step emits a compliance audit trail.
- **Built today:** 4 services. Topology missing.
- **Stayed in planning:** The saga orchestration engine surface, the compensation-chain visualisation, the audit viewer.
- **Verdict:** **Designed**.

### FLOW-20 — Ads platform & sponsored content
- **Intent:** Advertisers buy sponsored slots; users consent via privacy settings; feed ranking takes sponsored state into account.
- **Built today:** 4 services, topology NOT_APPLICABLE. **The `/settings/privacy` route doesn't exist** — the ConsentGateEnforcer service runs but users can't reach its UI.
- **Stayed in planning:** The `/settings/privacy` consent UI, the advertiser admin dashboard (Grammar-6 metrics).
- **Verdict:** **Half-built** — one missing route away from visible privacy.

### FLOW-24 — AI safety & moderation
- **Intent:** A user reports bad content; a moderator reviews in a verdict-grid queue; automated checks filter obvious cases.
- **Built today:** 1 service. No UI.
- **Stayed in planning:** The user report form (Grammar-5 kiosk) and the moderator verdict-grid (Grammar-2).
- **Verdict:** **Designed** — spec is clear; nearly nothing built.

### FLOW-25 — BFA cross-flow governance
- **Intent:** Platform admin reviews conflicts between flow changes (entity/event/route overlaps) before they ship.
- **Built today:** 0 services. 22 session files of spec.
- **Stayed in planning:** The whole conflict-detection engine and the verdict-grid UI where admins decide.
- **Verdict:** **Designed** — critical governance not yet built.

### FLOW-26 — Meta-flow engine (self-developing)
- **Intent:** The platform generates new flow skeletons and task types from a higher-level intent description.
- **Built today:** 0 services. Specs exist including engine-architecture artifacts.
- **Stayed in planning:** The entire self-extension loop — intent capture, flow proposal, validation, publication.
- **Verdict:** **Designed** — aspirational capability.

### FLOW-27 — Human interaction gate
- **Intent:** The system pauses on a decision it's unsure about and queues it for a human to resolve.
- **Built today:** 0 services. 22 session files.
- **Stayed in planning:** The queue, the verdict UI, the auto-resume mechanism, the SLA alerting.
- **Verdict:** **Designed**.

### FLOW-29 — Adaptive RAG deep research
- **Intent:** When a deep-research run is burning budget, an ML-ops admin sees which pipeline stage is running, decides kill / rebudget / let finish.
- **Built today:** **0 services** but **full reference UI**. 22 session files. **Passing screenshots** at `docs/e2e-snapshots/c6-role-coverage/flow-29-*.png`. **This is the canonical reference implementation for the Grammar-4 topology canvas** — the benchmark every other admin dashboard is measured against.
- **Stayed in planning:** Nothing major in UI terms. Services are intentionally upstream.
- **Verdict:** **Live (reference)** — the gold standard the fleet is catching up to.

### FLOW-30 — Tenant lifecycle manager
- **Intent:** A platform admin provisions, suspends, and deletes tenants across a cross-tenant dashboard.
- **Built today:** 0 services.
- **Stayed in planning:** The whole cross-tenant metric dashboard.
- **Verdict:** **Designed**.

### FLOW-31 — Design intelligence engine
- **Intent:** A platform admin watches trends in design-quality metrics and prompt effectiveness.
- **Built today:** 0 services.
- **Stayed in planning:** The Grammar-6 dashboard with trend panels.
- **Verdict:** **Designed**.

### FLOW-33 — System initiation & bootstrap
- **Intent:** An admin watches the platform's startup progress (8 deep-research revisions indicate this was one of the most iterated specs).
- **Built today:** 0 services. 22 session files.
- **Stayed in planning:** The Grammar-1 progress strip plus the whole bootstrap orchestrator.
- **Verdict:** **Designed** — heavily specified, unbuilt.

### FLOW-34 — Marketplace plugin adapter (C5 Canva template etc.)
- **Intent:** A thin adapter wires a third-party platform (Canva, Miro, Webflow, Framer) into the XIIGen plugin SDK.
- **Built today:** 0 services. No dedicated zip spec for this slug.
- **Stayed in planning:** The adapter surface and admin dashboard. The primary spec under "34-" in the zip described translation (mapped to FLOW-48 on 2026-04-22).
- **Verdict:** **Designed** — the FLOW-45 RUN-52 pattern applies when built.

### FLOW-35 — Meta-arbitration engine
- **Intent:** When two arbiters disagree on a decision, this engine runs a higher-order arbitration.
- **Built today:** 0 services.
- **Stayed in planning:** The verdict-grid UI + the meta-arbiter logic itself.
- **Verdict:** **Designed**.

### FLOW-36 — Feature registry
- **Intent:** A platform admin reviews which features are portable to new platforms, which are engine-only, which have porting decisions pending.
- **Built today:** 7 services, **34 screenshots** (densest PNG inventory in the fleet), purpose-built components exist (`FeatureMatrixScreen`, `FeatureMatrixRow`, `PortingProhibitedScreen`). **Page wrapper renders the default admin table** — the purpose-built screen sits orphaned.
- **Stayed in planning:** The 5-line page rewrite that surfaces the real UI. Pattern is ready (FLOW-45 RUN-52 template).
- **Verdict:** **Half-built** — one small fix from visible.

### FLOW-37 — Design system governance (multi-stack porting)
- **Intent:** A platform admin audits whether the engine can run on Node vs Python vs PHP — coupling taxonomy, compatibility matrix, porting jobs.
- **Built today:** **27 services** (the most of any admin flow), 18 screenshots, purpose-built `StackPortingScreen` + `CompatibilityReportCard` + `StackCouplingBadge`. **Page wrapper defaults to the admin CRUD panel** — purpose-built screen orphaned.
- **Stayed in planning:** Same 5-line page rewrite. The Grammar-2 verdict grid (task-type × dimension × coupling level) with colour + icon per cell.
- **Verdict:** **Half-built** — **the single biggest implementation-to-UI gap in the product**.

### FLOW-38 — RAG quality feedback (learning loop)
- **Intent:** Every generation round's quality score updates the RAG patterns used during that round, so future retrievals surface higher-quality patterns.
- **Built today:** 5 services, 13 screenshots, purpose-built `RagQualityScreen` orphaned behind the default CRUD page.
- **Stayed in planning:** The Grammar-6 dashboard (metric tiles, trend chart, pattern cards, distilled-rules card list, cycle outcome log). Same 5-line page fix pending.
- **Verdict:** **Half-built**.
- **Provenance note:** Primary spec resolved 2026-04-22 from the zip's `30-prompt improvements.md`.

### FLOW-39 — OSS curriculum
- **Intent:** A platform admin tracks OSS contributor progress along a defined curriculum.
- **Built today:** 4 services, purpose-built `OssCurriculumScreen` orphaned.
- **Stayed in planning:** The Grammar-1 progress strip, the contributor cards. Same 5-line fix.
- **Verdict:** **Half-built**.

### FLOW-40 — Client push
- **Intent:** A platform admin monitors push-notification delivery to client devices.
- **Built today:** 3 services, purpose-built `ClientPushScreen` orphaned.
- **Stayed in planning:** Same 5-line page-rewrite fix. Grammar-3 card list of pushes with delivery state.
- **Verdict:** **Half-built**.

### FLOW-46 — Platform agent
- **Intent:** A platform admin monitors the platform-agent process — health, actions taken, alerts.
- **Built today:** 6 services, pipeline passing on all tracks. 14 session files.
- **Stayed in planning:** Compound-grammar refinement (Grammar-3 card list + Grammar-6 dashboard).
- **Verdict:** **Live** — works; polish pending.

### FLOW-47 — Module lifecycle (fork + adapt + export + test in isolation)
- **Intent:** A tenant forks a flow module, adapts it locally, exports it back, tests in isolation — without touching the main XIIGen engine.
- **Built today:** 0 services. 13 session files. Partial thinking from the earlier unresolved architect goal ("decouple module lifecycle from Claude Code execution").
- **Stayed in planning:** The fork mechanism, the adaptation sandbox, the export pipeline, the isolation test runner.
- **Verdict:** **Designed** — the one we flagged earlier as the open architect question.

### FLOW-48 — i18n translation
- **Intent:** A user changes their language / locale at `/settings/language`; content renders in alternatives; RTL support.
- **Built today:** `UserPreferencesManager` service implemented. **`/settings/language` route doesn't exist** — user can't reach it.
- **Stayed in planning:** The settings-tabs page, the locale picker, RTL flip logic in the theming layer.
- **Verdict:** **Half-built** — one missing route.
- **Provenance note:** Primary spec resolved 2026-04-22 from the zip's `34-translate to alternatives.md`.

---

## Platform external adapters (intentionally out of XIIGen UI)

### FLOW-41 — Canva adapter
### FLOW-42 — Miro adapter
### FLOW-43 — Webflow adapter
### FLOW-44 — Framer adapter

- **Intent (all four):** An XIIGen feature is packaged as a thin adapter for the target platform's plugin SDK; users encounter the feature inside Canva / Miro / Webflow / Framer, not inside XIIGen.
- **Built today:** These live in external repositories, not this codebase. 0 services in the XIIGen repo. No XIIGen pages by design.
- **Stayed in planning:** N/A — out of XIIGen scope.
- **Verdict:** **External / out of scope** — the adapter template is FLOW-34.

*Note:* The 47-flow implementation matrix labels some of these slots with placeholder names (`platform-agent-instrumentation`, `rag-quality-graph`, `meta-flow-orchestration`, `ai-self-modification`) because the matrix was authored before the external-adapter mapping was locked. The registry is the current canonical source.

---

## Bootstrap

### FLOW-45 — History bootstrap
- **Intent:** A platform admin watches the platform's history-RAG seeding progress on a Grammar-1 progress strip.
- **Built today:** The `HistoryBootstrapPage` template was **closed in RUN-52** as the canonical pattern for the 5 CFI-05 orphaned-screen fixes. `?mock=<key>` → BusinessStateCard; no mock → PlatformOpsPage wrapping the purpose-built screen.
- **Stayed in planning:** Nothing — the template shipped.
- **Verdict:** **Live (reference)** — the template every half-built admin dashboard is waiting for.

---

## The numbers, one more time

| State | Count | What it means |
|---|---:|---|
| **Live** | 14 | A user can do this right now |
| **Half-built** | ~12 | Code runs, the screen is wrong or the route is missing |
| **Designed** | ~17 | Spec exists, little or no code |
| **Sketched** | 5 | Named placeholder, no spec |
| **External / out of scope** | 4 | Plugin adapters in separate repos |
| **Total** | 48 | |

> **Canonical Live count: 14.** Fourteen flows carry a "Live" verdict above
> (thirteen plain "Live" plus friend-request-social-feed, whose verdict leads
> "Live pipeline"). This is the reconciled figure used in `README.md` and matches
> the live enumeration in `PRODUCT-STATE.md`; the earlier "~15" was an estimate that
> overcounted by one.

**Four one-route-or-one-page wins** on the board today:
1. Add `/blog` + `/blog/:slug` public routes for FLOW-28 — 18 services light up.
2. Add `/forms/:schemaId` public route for FLOW-21.
3. Add `/settings/privacy` page for FLOW-20.
4. Add `/settings/language` page for FLOW-48.

**Five 5-line page-rewrite wins** on the board today (apply the FLOW-45 `HistoryBootstrapPage` template):
1. FLOW-37 multi-stack porting — **27 services** waiting.
2. FLOW-36 feature registry — 7 services + 34 screenshots waiting.
3. FLOW-38 RAG quality feedback — 5 services waiting.
4. FLOW-39 OSS curriculum — 4 services waiting.
5. FLOW-40 client push — 3 services waiting.

**The one heavy architect question** still open:
- FLOW-47 module lifecycle — needs the fork + adapt + export + test in isolation design before code.

---

## Where to dig deeper for any specific flow

- `docs/business-flows/NN-{slug}.md` — the PM spec (what the user wants)
- `docs/screen-examination/{slug}-examination.md` — WHO / VERB / GRAMMAR distillation
- `docs/sessions/FLOW-NN/FLOW-NN-IMPL-STATE.json` — per-flow implementation state
- `server/src/engine/flows/{slug}/` — actual services on disk
- `client/src/pages/{slug}/` — actual pages on disk
- `docs/business-flows/PRODUCT-STATE.md` — same data grouped by state (live/half-built/designed/sketched)

This document was compiled 2026-04-22 as part of the business-flows-integration session. Regeneration instructions in [`docs/sessions/business-flows-integration/PLAN.md`](../sessions/business-flows-integration/PLAN.md).
