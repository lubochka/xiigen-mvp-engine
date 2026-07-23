---
name: ui-ux-compliance
version: "1.1.0"
sk_number: SK-539
priority: MANDATORY
load_order: 5.5
category: planning
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# SK-539 UI/UX Compliance — Role-aware screen standards for XIIGen flows

A flow implementation that has no clear answer to "who sees this page and what can they do?" is not done. This skill installs that question as a mandatory pre-code gate and a post-code verification checklist.

## What changed in v1.1.0

- **Section 0 added** (before Section 1): mandatory pre-design gate — examination record check, 6-file business spec read order, 7 grammar type declarations, real-world reference deferred to MARKET-REFERENCE-CATALOG.md
- **Phase 7 Step 1** updated: references SK-542 (examination protocol) and SK-540 (design context) before proceeding
- **Phase 7 Step 5** updated: references SK-541 (screen craft audit) and REPAIR-GUIDANCE.md Parts 2/3
- **UX-06** promoted from CONCERN to BLOCK (tenant/public), CONCERN (admin)
- **UX-06b** added (Group A): Playwright PNG must show populated state — BLOCK
- **UX-30** added (Group H): grammar type mandate — CRUD table on TENANT_CONSUMER/PUBLIC is BLOCK
- **Section 7** FC-18 BLOCK conditions updated for UX-06, UX-06b, UX-30
- **Section 8** integration points updated for new documents and skills

## Origin

Extracted from a 10-run role reconnaissance across all 48 XIIGen flows (2026-04-20). The reconnaissance found: 52 distinct roles across 5 tiers, 4 missing public-facing pages with implemented server services, 12 visibility scopes, 7 reusable screen templates, and a recurring pattern of ENGINE_INTERNAL admin CRUD surfaces shipped in place of domain-specific tenant-facing UIs. Every flow whose page header says `classification="TENANT_FACING"` but routes to a generic CRUD panel fails this skill. Every flow with a `publicUrl` in its mock state but no client route for it fails this skill.

## When to Invoke

- **BEFORE writing any React page** — Section 0 runs first; Section 1 follows
- **AT ⛔ STOP** — as Mandatory Check 15 (new, added alongside FC-18 in HOW-TO-USE-SKILLS v4.4.0)
- **AT plan review time** — Gate 0m of CODE-REVIEW-PROTOCOL v1.8 enforces FC-18 at the plan level
- **When a flow is classified TENANT\_FACING** — automatic trigger; skip is a BLOCK
- **When a flow state machine has a `publicUrl` field** — UX-20 check is mandatory

One pass of SK-539 before writing a page = zero "this looks like an admin console to a regular user" findings at QA time.

---

## Section 0 — Product intent read (mandatory before Section 1)

SK-539 verifies pages were built correctly. Section 0 ensures the right page was conceived in the first place. It runs before the four role questions in Section 1.

### 0.1 — Check examination record and design context

```bash
# Check 1 — examination record (highest-authority source where present)
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20

# Check 2 — design context produced by SK-540
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
```

**Examination record present:** WHO/VERB/GRAMMAR already established. Extract the grammar type for §0.3. Proceed to Section 1.

**Design context present (no examination record):** SK-540 already ran for this flow. Grammar is declared. Proceed to Section 1.

**Neither present:** Load SK-542 (flow-ui-examination-protocol-SKILL.md) and SK-540 (planning--product-design-context-SKILL.md) and run them before returning to Section 1. Do not proceed to JSX without grammar declared.

### 0.2 — Read the business spec (6-file read order)

If neither record exists, read these six files in order. Each answers a different question.

| # | File | Path | Answers |
|---|------|------|---------|
| F1 | STEP-1-INVARIANTS | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | `user_intent` verbatim — the page's purpose sentence |
| F2 | UI-REFLECTION-STATE | `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` | Which processes + states exist; which React components implement them |
| F3 | ROLE-ANALYSIS-BATCH | `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` | Which roles open this screen and what each role sees |
| F4 | Business spec | `docs/business-flows/NN-{slug}.md` (FLOW-01..34 only) | PM intent, user journey, success criteria |
| F5 | DESIGN-SIMULATION | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` (if exists) | End-to-end user walkthrough |
| F6 | RECONCILIATION-STATE | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` | What is actually built vs what was designed |

**Batch map for F3:**
FLOW-01..05 = BATCH-01 · FLOW-06..10 = BATCH-02 · FLOW-11..16 = BATCH-03 ·
FLOW-17..21 = BATCH-04 · FLOW-22..26 = BATCH-05 · FLOW-27..31 = BATCH-06 ·
FLOW-32..34 = BATCH-07 · FLOW-35..47 = BATCH-08+

**F6 resolution rule:** If F6 verdict = DEMONSTRABLY_WRONG, base the UI on F1–F4, not on existing components. The implementation diverged from the design.

**F1 spec-gap halt (FLOW-04, FLOW-09, FLOW-34):** If F1 contradicts the slug, pages, and PNGs, halt and report to Luba. Do not guess which direction is correct. See CFI-12 in SESSION-LOAD-PLAN v31.

Reference: `planning--business-flows-registry.md` for exact paths, batch numbers, and per-flow grammar pre-declarations.

### 0.3 — Grammar type

Seven valid grammar types. Declare one before writing any JSX. The declared grammar must match the grammar in `.impeccable.md` and in the examination record where those exist.

| Type | User's question | Flows |
|------|-----------------|-------|
| **G1 PROGRESS_STRIP** | "Where is this in its lifecycle?" | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| **G2 VERDICT_GRID** | "What did each evaluator decide, and why?" | FLOW-24 (mod), 25, 27, 35, 37 |
| **G3 CARD_LIST** | "Which items need my attention, in what state?" | FLOW-06, 07, 08, 10, 12, 16, 17, 20, 28, 32, 36, 40, 46 |
| **G4 TOPOLOGY_CANVAS** | "How do the parts connect?" | FLOW-18, 26, 29, 34 |
| **G5 KIOSK** | "I have one task, one decision" | FLOW-01, 02, 03, 04, 05, 09, 22 (public), 24 (report) |
| **G6 DASHBOARD** | "What are my key metrics right now?" | FLOW-13, 20 (admin), 30, 31, 38 |
| **G7 SETTINGS_TABS** | "Which setting do I need to change?" | FLOW-15, 21, 23, 48 |

A deviation from the pre-declared grammar requires a documented rationale in the session record and in the FC-18 Audit Trail.

**Reference implementation (Grammar 4, passing):** FLOW-29 adaptive-rag-deep-research. Three role PNGs at `docs/e2e-snapshots/c6-role-coverage/flow-29-topology-canvas-*.png` all passing as of RUN-50. Use as the template for any G4 rebuild.

### 0.4 — Real-world reference

For detailed per-state rendering conventions (empty / loading / populated / error / success), read:

> `docs/screen-examination/MARKET-REFERENCE-CATALOG.md`

Section reference by grammar: G1 §1 · G2 §2 · G3 §3 · G4 §4 · G5 §5 · G6 §6 · G7 §7

Quick platform lookup (use MARKET-REFERENCE-CATALOG for per-state detail):

| Domain | Reference | Key convention |
|--------|-----------|----------------|
| Registration | Airbnb / Linear | SSO above email; one CTA; immediate onboarding after verify |
| Profile setup | Typeform / LinkedIn | Step indicator; one group per screen |
| Event creation | Eventbrite | Multi-step: Details→Tickets→Promote→Publish; live preview |
| Social feed | Twitter/X, LinkedIn | Card; author+timestamp; actions bottom |
| Gamification | Duolingo | Celebrate first; streak counter; Next CTA dominant |
| Marketplace | Etsy, Upwork | Card grid; price prominent; filter sidebar |
| Booking/checkout | Eventbrite / Airbnb | Capacity bar; ticket selector; QR on confirm |
| Billing invoices | Stripe billing portal | Plan card; invoice list; FAILED never dominant anchor; Retry on FAILED |
| Content (public) | Medium / Substack | Zero chrome for anonymous; article as h1 |
| Moderation | Trust & Safety forms | Category tiles; textarea; anonymous submit |
| Topology | n8n, Temporal UI | Nodes+edges; phase groups; side panel; human-readable labels |
| Arbitration | GitHub PR review | Item × reviewer grid; verdict per cell; Approve/Override |
| Bootstrap/lifecycle | Vercel deploy, CircleCI | Phase chips; log tail; retry per step |
| Analytics/dashboard | QuickBooks, Wave | Revenue/expense chart; period selector |
| Settings | Stripe Dashboard, Linear | Tabs; form fields; save confirmation |

---

## Section 1 — The Role Question

Every React page in XIIGen must answer four questions before a single line of JSX is written:

```
Q1 — ROLE_TIER:     Which tier does this page serve?
                    PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS |
                    TENANT_CONSUMER | PUBLIC

Q2 — ROLE_GATE:     Which specific role(s) are the primary audience?
                    (From the 52-role taxonomy in §3)

Q3 — ROUTE_GUARD:   What route prefix enforces the access boundary?
                    /admin/...   → PLATFORM_ENG or PLATFORM_OPS
                    /tenant/...  → TENANT_OPS (future — currently mixed)
                    /...         → TENANT_CONSUMER or PUBLIC

Q4 — VISIBILITY:    What visibility scope applies to the data shown?
                    (From the 12-scope registry in §4)
```

A page spec that cannot answer all four questions is not ready to implement. If Q3 is answered `/admin/...` but Q1 is `PUBLIC`, that is a route-guard gap (UX-16) and must be fixed before any other work proceeds.

---

## Section 2 — The 31 UX Checks (UX-01..UX-30)

Checks are grouped into three tiers:

- **BLOCK** — FC-18 fails if any BLOCK check fails on a TENANT_FACING or PUBLIC page. Page cannot ship.
- **CONCERN** — FC-18 raises a CONCERN. Page may ship with a documented carry-forward. CONCERN on an ADMIN_FACING page does not block.
- **POLISH** — Informational. Tracked but does not affect FC-18 verdict.

### Group A — Baseline Accessibility (UX-01..UX-10)
These apply to ALL pages regardless of role tier.

| Check | Description | FC-18 |
|---|---|---|
| **UX-01** | Page has exactly one `<h1>` with a meaningful title | BLOCK (tenant/public), CONCERN (admin) |
| **UX-02** | Every button and link has visible text or `aria-label` | BLOCK |
| **UX-03** | Every form input has an associated `<label>` | BLOCK |
| **UX-04** | Validation errors appear inline near the offending field, not only in a toast | BLOCK |
| **UX-05** | Loading state is visually communicated (spinner, skeleton, or progress indicator) | BLOCK (tenant/public), CONCERN (admin) |
| **UX-06** | Empty state is meaningful — shows what the section is for and a primary CTA that guides the user toward the action that populates it | BLOCK (tenant/public), CONCERN (admin) |
| **UX-06b** | Playwright PNG captures for TENANT_CONSUMER and PUBLIC pages must show the populated operating state, not the empty or error state. A PNG showing $0.00, zero counts, "not found", or "Failed to fetch" as primary content is invalid as visual evidence. Use `?mock=[state-name]` URL params to trigger the correct state before capture. | BLOCK (invalidates PNG as evidence) |
| **UX-07** | Icons are SVG, not emoji used as functional UI elements | CONCERN |
| **UX-08** | Focus ring is visible on all interactive elements (not `outline: none` without replacement) | BLOCK |
| **UX-09** | Tap targets are ≥44×44px on mobile breakpoints | BLOCK (tenant/public), CONCERN (admin) |
| **UX-10** | Color is not the sole differentiator for status (badge label + color, not color alone) | BLOCK |

### Group B — Interaction and Mobile (UX-11..UX-15)

| Check | Description | FC-18 |
|---|---|---|
| **UX-11** | No interaction is hover-only — touch equivalents exist for all hover affordances | CONCERN |
| **UX-12** | Tenant-facing and public pages have responsive layout at mobile breakpoints (≥320px) | BLOCK |
| **UX-13** | Multi-field forms have per-field inline validation, not only on submit | CONCERN |
| **UX-14** | Destructive actions (delete, terminate, purge, uninstall) require a confirmation step with explicit consequence description | BLOCK |
| **UX-15** | App shell includes a skip-to-main landmark for keyboard navigation | CONCERN |

### Group C — Role and Route Correctness (UX-16..UX-19)

| Check | Description | FC-18 |
|---|---|---|
| **UX-16** | Route prefix matches declared role tier — PLATFORM_ENG/OPS pages live under `/admin/`, PUBLIC pages do not | BLOCK if mismatch |
| **UX-17** | API errors are translated to user-friendly messages — raw HTTP status codes (400, 500) never appear in tenant or public UI copy | BLOCK |
| **UX-18** | Role-conditional UI elements (actions, form fields, directional selectors) are conditionally rendered, not offered as free-choice to all roles | BLOCK |
| **UX-19** | Privacy and user-rights pages (consent management, data export, language preferences) are accessible to all R-REG users — not gated under `/admin/` | BLOCK |

### Group D — Page Contract Completeness (UX-20..UX-22)

| Check | Description | FC-18 |
|---|---|---|
| **UX-20** | Published forms with a `publicUrl` field in their mock state must have a corresponding `/forms/:schemaId` client route that renders the form for submission | BLOCK |
| **UX-21** | Internal IDs (T-numbers, F-numbers, CF-numbers, flow IDs, SK-numbers, spec file paths from test runners) must not appear in tenant-facing or consumer-facing UI text — not in headings, field labels, notes columns, or status messages | CONCERN (BLOCK if in h1/h2) |
| **UX-22** | Pages in flows with a no-bypass safety gate (FLOW-24 CF-465, FLOW-37 DESIGN_DEPLOYMENT_BLOCKED) must display a visible, non-dismissable indicator that the gate cannot be overridden — even by platform admin | BLOCK |

### Group E — AI and Automated Gate Patterns (UX-23..UX-25)

| Check | Description | FC-18 |
|---|---|---|
| **UX-23** | Fully automated gates (arbiter consensus, safety gate, design deployment gate) show a progress indicator (X of N verdicts/checks) not a manual action button. When the automated outcome is a *recommendation* (not a decision), the UI labels it as a recommendation with an informational badge — not as an alert requiring immediate action | BLOCK if manual action button on automated gate |
| **UX-24** | Human-in-the-loop decision surfaces must show all four mandatory fields: (1) item identity and context, (2) requester identity and timestamp, (3) SLA countdown or deadline, (4) decision form with mandatory reason field for rejection | BLOCK |
| **UX-25** | TENANT_FACING flows must not route to admin CRUD pages — a `classification="TENANT_FACING"` badge on a page backed by `/api/dynamic/xiigen-*` CRUD is a BLOCK | BLOCK |

### Group F — External Integration Patterns (UX-26..UX-27)

| Check | Description | FC-18 |
|---|---|---|
| **UX-26** | OAuth and external-platform handshake flows must have two distinct screens: (a) a pending state screen shown while the user is on the external platform (with explanation of what they are authorizing), and (b) a return state screen shown after the user comes back (confirming success or showing failure with retry) | BLOCK |
| **UX-27** | Human override on any automated system (arbiter consensus, safety gate, AI self-modification) must require a mandatory written justification field. The original automated verdict and the override verdict must both be displayed in the UI and recorded in the audit trail | BLOCK |

### Group G — AI Content and Consent (UX-28..UX-29)

| Check | Description | FC-18 |
|---|---|---|
| **UX-28** | Any page that renders AI-generated content (lessons from FLOW-24, deep research from FLOW-29, RAG responses, AI design proposals) must embed a feedback widget (thumbs-up/down or 1–5 star rating) that feeds the RAG quality graph (FLOW-42) | CONCERN |
| **UX-29** | Pages where the system enters a consent-pending state (PatternContributor Path B in FLOW-46, ConsentAndEnrollmentGate in FLOW-24) must render an explicit approve/deny affordance for the responsible role — not merely display a PENDING status chip | BLOCK |

### Group H — Grammar and Design Intent (UX-30) *(NEW v1.1.0)*

| Check | Description | FC-18 |
|---|---|---|
| **UX-30** | TENANT_CONSUMER and PUBLIC pages implement one of the seven declared grammar types (G1–G7 from SK-539 §0.3). A page rendering a generic Name/Status/Notes/Actions table backed by `/api/dynamic/xiigen-*` for a TENANT_CONSUMER or PUBLIC audience is not a grammar type implementation — it is development scaffolding left exposed. Grammar type must be declared in the session record and in `.impeccable.md` before JSX is written. | BLOCK |

---

## Section 3 — Role Taxonomy (52 roles, 5 tiers)

These are the roles established by the 10-run reconnaissance. Every page spec must declare which role(s) from this list are its primary and secondary audience.

### Tier 1 — Platform Engineering (8 roles)

| Role ID | Name | Primary domain | Key screens |
|---|---|---|---|
| R-ENGINE-ARCHITECT | Engine Architect | AI self-modification (FLOW-44) | Proposal review, diff preview, approve/reject, rollback monitor |
| R-SENIOR-ARCHITECT | Senior Architect | Meta arbitration override (FLOW-35) | Override form, arbiter verdict review, audit trail |
| R-ENGINE-DEV | Engine Developer | Schema/DAG management (FLOW-11) | Schema registry, DAG visualization, schema submission |
| R-DATA-ENGINEER | Data Engineer | ETL pipelines (FLOW-14) | Connector config, job schedule, run history |
| R-DEVOPS-ENGINEER | DevOps / SRE | System bootstrap (FLOW-33) | Bootstrap status checklist, fabric health, seed progress |
| R-FLOW-ARCHITECT | Flow Cycle Architect | Cycle chain extension (FLOW-45) | Topology viewer, extension diff, apply confirmation |
| R-FLOW-DESIGNER | Flow Designer | Visual flow authoring (FLOW-18, 26) | Flow canvas (DRAFT/PUBLISHED), node registration, code injection |
| R-AI-AGENT-OPERATOR | AI Agent Operator | RAG pipelines, orchestration (FLOW-29, 38, 43) | Research console, quality dashboard, orchestration monitor |

### Tier 2 — Platform Operations (11 roles)

| Role ID | Name | Primary domain | Key screens |
|---|---|---|---|
| R-PLATFORM-ADMIN | Platform Administrator | Cross-tenant operations | Tenant list, lifecycle management, all admin surfaces |
| R-GOVERNANCE-OPERATOR | Governance Operator | BFA cross-flow rules (FLOW-25) | Rule lifecycle, blast-radius monitor, enforcement console |
| R-COMPLIANCE-OFFICER | Compliance Officer | Audit trails (FLOW-19) | Compliance audit viewer, retention management, legal holds |
| R-AI-SAFETY-REVIEWER | AI Safety Reviewer | Content moderation (FLOW-24) | Moderation queue, safety decision surface (no bypass) |
| R-AI-SAFETY-REVIEWER-OSS | OSS Curriculum Monitor | OSS model teaching (FLOW-39) | Shadow run monitor, grade trend, plateau alert |
| R-DESIGN-COUNCIL | Design System Council | Design governance (FLOW-37) | Rule authoring, architecture score, token conflict scanner |
| R-FEATURE-CURATOR | Feature Registry Operator | Feature porting (FLOW-36) | FT-NNN registry, porting decisions, platform simulation |
| R-DESIGN-REVIEWER | Design Intelligence Reviewer | AI design proposals (FLOW-31) | Proposal queue, confidence score, approve/reject |
| R-BILLING-ADMIN | Billing Administrator | Tenant billing (FLOW-30) | Invoice management, suspension triggers, reactivation |
| R-MARKETPLACE-CERTIFIER | Marketplace Certifier | Flow marketplace (FLOW-32) | Certification queue, quality + security scan results |
| R-MARKETPLACE-FRAUD-REVIEWER | Fraud Reviewer | Marketplace integrity (FLOW-32) | Fraud flagged queue, suspicious pattern review |

### Tier 3 — Tenant Operations (16 roles)

| Role ID | Name | Primary domain |
|---|---|---|
| R-TENANT-ADMIN | Tenant Administrator | Tenant config, module install, agent chat, i18n (FLOW-46, 47, 48) |
| R-DATA-ANALYST | Data Analyst | Analytics dashboards (FLOW-13) |
| R-MODERATOR | Content Moderator | Review queue (FLOW-07) |
| R-EDITOR-REVIEWER | Editor Reviewer | CMS approval gate 1 (FLOW-22) |
| R-LEGAL-REVIEWER | Legal Reviewer | CMS approval gate 2 (FLOW-22) |
| R-CONTENT-SCHEDULER | Content Scheduler | Publication timing (FLOW-22, 28) |
| R-FORM-BUILDER | Form Builder | Form schema authoring (FLOW-21) |
| R-WORKFLOW-ADMIN | Workflow Admin | Automation dispatch rules (FLOW-21) |
| R-TEMPLATE-COLLABORATOR | Template Collaborator | Collaborative editing (FLOW-23) |
| R-TEMPLATE-REVIEWER | Template Reviewer | Code export quality gate (FLOW-23) |
| R-BLOG-EDITOR | Blog Editor | Editorial review, schedule (FLOW-28) |
| R-BLOG-MODERATOR | Comment Moderator | Comment moderation queue (FLOW-28) |
| R-BLOG-SCHEDULER | Blog Scheduler | Publish schedule calendar (FLOW-28) |
| R-ADVERTISER | Advertiser | Auction bids, campaign analytics (FLOW-20) |
| R-HUMAN-REVIEWER | Human Approval Reviewer | Approval inbox, SLA countdown (FLOW-27) |
| R-SENIOR-REVIEWER | Senior/Escalation Reviewer | Escalated approvals (FLOW-27) |

### Tier 4 — Tenant Consumers (12 roles)

| Role ID | Name | Primary domain |
|---|---|---|
| R-TENANT-MEMBER | Registered Tenant Member | Base authenticated surface |
| R-SELLER | Seller | Marketplace listings (FLOW-06, 08) |
| R-CONTENT-AUTHOR | Content Author | CMS draft writing, AI suggestions (FLOW-10, 22, 28) |
| R-CUSTOMER | Billing Customer | Subscribe, invoice history (FLOW-12) |
| R-FREELANCER | Freelancer | Gig bidding, milestone delivery (FLOW-17) |
| R-CLIENT | Client / Job Poster | Gig posting, bid review (FLOW-17) |
| R-BLOG-AUTHOR | Blog Author | Draft editor, media upload (FLOW-28) |
| R-BLOG-SUBSCRIBER | Blog Subscriber | Newsletter subscription (FLOW-28) |
| R-TEMPLATE-CONSUMER | Template Consumer | Form instantiation from templates (FLOW-23) |
| R-FLOW-PUBLISHER | Flow Publisher | Package submission, revenue (FLOW-32) |
| R-COMPONENT-AUTHOR | Component Author | Design system components (FLOW-37) — reactive, sees violation alerts |
| R-PLUGIN-DEVELOPER | Plugin/Adapter Developer | Adapter schema mapping, publish (FLOW-34) |

### Tier 5 — Public / Consumer (9 roles)

| Role ID | Name | Primary domain |
|---|---|---|
| R-ANON | Anonymous Visitor | Public pages (landing, blog, storefront) |
| R-REG | Registered User (base) | All authenticated surfaces |
| R-FORM-SUBMITTER | Form Submitter | Public form rendering `/forms/:schemaId` (FLOW-21) |
| R-LEARNER | Learner | AI-powered lessons, quiz, progress (FLOW-24) |
| R-COMMENTER | Blog Commenter | Comment submission on published posts (FLOW-28) |
| R-ORG | Event Organizer | Event creation, attendance management (FLOW-03) |
| R-ATTENDEE | Event Attendee | RSVP, check-in (FLOW-04) |
| R-WAITLIST | Waitlist Member | Waitlist registration (FLOW-04) |
| R-TICKET-SCANNER | Ticket Scanner | Attendance verification (FLOW-04) |

---

## Section 4 — Visibility Scope Registry (12 scopes)

Every data element on every page must declare which visibility scope governs it. A page that mixes scopes without conditional rendering has a V-scope violation.

| Scope ID | Name | Definition | Evidence |
|---|---|---|---|
| V-PUBLIC | Public | Visible to R-ANON + all roles | Blog posts, public events, marketplace listings |
| V-TENANT-PUBLIC | Tenant Public | Visible to all members of a specific tenant | Tenant-branded product listings (FLOW-08) |
| V-MATCHED | Matched | Visible only to users the system has determined are a match | Recommendation results (FLOW-02) |
| V-CONNECTIONS | Connections | Visible only to confirmed connections | Connection-scoped social content (FLOW-07) |
| V-PRIVATE | Private | Visible only to the individual owner | Private profile fields, private flow drafts |
| V-ORG | Organisation | Visible only to members of a specific org | Org-scoped event data (FLOW-03) |
| V-COOPERATOR | Cooperator | Visible to cooperating parties in a specific engagement | Cooperation-scoped content (FLOW-07) |
| V-ADMIN | Admin | Visible to tenant admin + platform admin | Tenant configuration, member management |
| V-TENANT-ADMIN | Tenant Admin | Visible only within a single tenant's admin scope | Tenant-specific billing, quota |
| V-TRANSACTIONAL | Transactional | Visible only to the two parties in a specific transaction | Escrow records, order details (FLOW-16) |
| V-PLATFORM-ONLY | Platform Only | Visible only to platform-level staff — tenant admins excluded | Compliance audit trails (FLOW-19), bootstrap internals (FLOW-33) |
| V-PUBLIC-BLOG | Public Blog | Published blog content served to R-ANON via CDN | Blog posts after publish gate (FLOW-28) |

---

## Section 5 — Screen Template Library (7 templates)

When a page matches one of these patterns, the corresponding template must be used as the starting point. Templates pre-satisfy all 29 UX checks for their pattern.

### T-1 — AI-Proposal-Review

**Used by:** FLOW-24 (safety gate), FLOW-26 (5-arbiter gate), FLOW-31 (design intelligence), FLOW-35 (meta arbitration)

**Required fields:**
- Proposal identity (proposalId, topic, draftedBy, draftedAt)
- Automated score or confidence (0.0–1.0 range with classification label)
- Evidence panel (source citations, simulation runs, regression count)
- Decision form: APPROVE button + REJECT button with mandatory `reason` textarea (min 20 chars)
- Audit: approvedBy / rejectedBy populated on submit

**UX checks pre-satisfied:** UX-01, UX-03, UX-04, UX-23, UX-24, UX-27

---

### T-2 — Bootstrap-Checklist

**Used by:** FLOW-33 (system initiation), FLOW-47 (module upgrade steps)

**Required fields:**
- Boot/upgrade ID and start timestamp
- Sequential step list — each step has: name, status chip (NOT_STARTED / IN_PROGRESS / COMPLETE / FAILED), and elapsed time
- Progress bar (N of M steps complete)
- Current step highlighted
- Failure detail: expandable panel with error code + recovery suggestion
- Terminal state: explicit WARM/READY confirmation or FAILED banner with retry option

**UX checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-3 — Arbiter-Progress

**Used by:** FLOW-26 (5-arbiter consensus), FLOW-35 (meta arbitration), FLOW-44 (AI self-modification validation)

**Required fields:**
- Gate ID and triggered-by source
- Per-arbiter verdict chip list: arbiter name + PENDING / PASS / NEEDS_REVISION / REJECTED status
- "N of M verdicts received" counter (not a manual publish button)
- Consensus result panel (shown when all N received): final verdict + color classification
- No manual action button — verdict is the action trigger

**UX checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-4 — ParallelFlowMonitor

**Used by:** FLOW-43 (meta flow orchestration)

**Required fields:**
- Orchestration ID + triggered-by + enqueued timestamp
- Child flow swimlane list: each flow has name + current status chip (QUEUED / DISPATCHING / RUNNING / COMPLETE / FAILED) + elapsed time
- Overall progress: "N of M child flows complete"
- Failed flow detail: expandable with error code + last successful step
- Completion summary panel on terminal state

**UX checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-5 — AiSelfModificationReview

**Used by:** FLOW-44 (AI self-modification)

**Required fields:**
- Proposal metadata: proposalId, target (skill/prompt/arbiter), changeType, draftedBy
- Diff preview panel: before (old version) vs after (proposed version) — side-by-side or unified diff
- Simulation evidence: simulationRuns (integer), regressionCount (integer), blastRadius classification (LOW / MEDIUM / HIGH / CRITICAL)
- Auto-rollback threshold indicator: "Will auto-rollback if quality drops X%" — non-dismissable
- Decision form: APPROVE (requires R-ENGINE-ARCHITECT role check) + REJECT with mandatory reason textarea
- Rejection reason stored in audit trail alongside proposalId, rejectedBy, timestamp

**UX checks pre-satisfied:** UX-01, UX-03, UX-04, UX-23, UX-24, UX-27

---

### T-6 — CycleTopologyDiff

**Used by:** FLOW-45 (cycle chain extension)

**Required fields:**
- Cycle identity: cycleId, flowId, baselineNodes chain (n1 → n2 → ... → nN)
- Before graph: rendered using `TopologyViewer` component with existing nodes
- Extension proposal: insertPoint + newNodeId highlighted with a distinct color
- After graph: rendered chain with new node inserted at correct position
- Validation result badge: PASS (cycle-detection, type-compatibility both clear) or FAILED with specific failure reason
- Apply button: disabled until validation PASS; requires confirmation dialog on click

**UX checks pre-satisfied:** UX-01, UX-05, UX-14, UX-23

**Component dependency:** `client/src/components/topology/TopologyViewer.tsx` (already exists)

---

### T-7 — AgentSessionMonitor

**Used by:** FLOW-46 (platform agent)

**Required fields:**
- Session metadata: sessionId, userIntent (displayed verbatim), submittedBy, startedAt
- Execution stage pipeline (horizontal or vertical): PlatformContextEnricher → AF-4 → SuperJudgeArbiter → AgentActionPublisher → PatternContributor — each with IN_PROGRESS / COMPLETE / FAILED / SKIPPED chip
- SuperJudge verdict panel: DEFER_TO_AF9 / OVERRIDE_PASS / OVERRIDE_BLOCK with reason
- Action dispatch panel (shown when AgentActionPublisher complete): actionType chip (ADVISE / PROPOSE_EDIT / CREATE_FLOW / APPLY_GLOBAL) + target + af9Verdict
- Consent pending widget (shown when PatternContributor enters consent gate): SHARE vs KEEP_PRIVATE radio with explanation of each; Submit button
- Session summary (terminal state): contribution status + session duration

**UX checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23, UX-24, UX-29

---

## Section 6 — Missing Pages Registry

These pages have implemented server services but no client route. Any session implementing a flow that depends on them must create the missing page.

| Missing page | Flow | Server services implemented | Audience | Priority |
|---|---|---|---|---|
| `/settings/privacy` | FLOW-20 | `ConsentGateEnforcer` | All R-REG — GDPR right | BLOCKER — consent page is wrongly at `/admin/ads/consent` |
| `/forms/:schemaId` | FLOW-21 | `FormSubmissionProcessor`, `AutomationDispatcher` | R-FORM-SUBMITTER (R-ANON or R-REG) | BLOCKER — `publicUrl` exists in mock state, no route exists |
| `/blog` + `/blog/:slug` | FLOW-28 | `PublicPageRequestPipeline`, `CommentSubmissionSpamGate` (18 total services) | R-ANON + R-COMMENTER | BLOCKER — 18 services built, zero public routes |
| `/settings/language` | FLOW-48 | `UserPreferencesManager`, `TranslationPolicyGate` | All R-REG — user locale preference | HIGH — server implementation complete, no client route |

---

## Section 7 — FC-18 Gate Definition

FC-18 is the gate check for SK-539. It runs at plan review time (Gate 0m in CODE-REVIEW-PROTOCOL v1.8) and at ⛔ STOP (Mandatory Check 15 in HOW-TO-USE-SKILLS v4.5.0).

### FC-18 Verdict Logic

```
BLOCK conditions (plan is rejected / STOP does not fire):
  - Any UX-01..UX-10 gap on a TENANT_FACING or PUBLIC page
    (UX-06: empty state without CTA on TENANT_CONSUMER or PUBLIC page)
    (UX-06b: PNG shows empty/error state as primary content on TENANT_CONSUMER or PUBLIC page)
  - Any UX-12 (mobile responsive) gap on a TENANT_FACING page
  - Any UX-14 (destructive action confirmation) gap on any page
  - Any UX-16 (route-guard mismatch) on any page
  - Any UX-17 (raw HTTP error code shown to user) on any page
  - Any UX-18 (role-conditional UI rendered unconditionally) on any page
  - Any UX-19 (user-rights page behind /admin/) on any page
  - Any UX-20 (published form with publicUrl and no /forms/:id route) on any tenant
  - UX-21 with internal ID in h1 or h2 on any page
  - Any UX-22 (no-bypass gate without visible no-bypass indicator) on any page
  - Any UX-23 (manual button on automated gate) on any page
  - Any UX-24 (human-in-the-loop page missing any of 4 mandatory fields) on any page
  - Any UX-25 (TENANT_FACING page routing to admin CRUD) on any page
  - Any UX-26 (OAuth handshake flow missing pending or return state screen)
  - Any UX-27 (human override without mandatory written justification) on any page
  - Any UX-29 (consent-pending state with no approve/deny affordance) on any page
  - Any UX-30 (TENANT_CONSUMER or PUBLIC page with no declared grammar type, or
    grammar declared but CRUD table rendered instead) on any page

CONCERN conditions (STOP fires with CONCERN note, carry-forward required):
  - UX-06 (empty state without CTA) on admin pages
  - UX-07 (emoji as functional icon) on any page
  - UX-09 (tap target <44px) on admin pages only
  - UX-11 (hover-only interaction) on any page
  - UX-13 (submit-only validation) on any page
  - UX-15 (no skip-to-main) on any page
  - UX-21 (internal ID in h3 or lower, or in notes/status copy)
  - UX-28 (AI content without feedback widget)

EXEMPT from FC-18:
  - Pages with role tier PLATFORM_ENG and no tenant users — UX-09, UX-12 do not apply
  - Pages served only to R-DEVOPS-ENGINEER or R-ENGINE-ARCHITECT — same exemption
```

### FC-18 Audit Trail

Every FC-18 evaluation produces a per-page record:

```
FC-18 AUDIT — [FlowSlug] / [PageName]
  Role tier declared:   [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS | TENANT_CONSUMER | PUBLIC]
  Primary role(s):      [R-role-id, ...]
  Route:                [/path]
  Route correct:        [YES | NO — gap: UX-16]
  Visibility scope:     [V-scope-id]
  Grammar type:         [G1–G7 declared | NONE — UX-30 BLOCK]
  .impeccable.md:       [present | absent — SK-540 skipped]
  Examination record:   [present: {classification} | absent]
  Checks run:           [UX-01, UX-02, ... list]
  BLOCK findings:       [none | UX-XX: description]
  CONCERN findings:     [none | UX-XX: description]
  SK-541 audit:         [attached | not run — Phase 7 Step 5 pending]
  Verdict:              [APPROVED | BLOCK | CONCERN]
  Carry-forward:        [none | CF-NNN: description]
```

### Phase 7 procedure (updated v1.1.0)

**Phase 7 Step 1 — Pre-design gate (updated):**
```bash
# Step 1a — Load examination protocol
# flow-ui-examination-protocol-SKILL.md (SK-542) — loads companion documents

# Step 1b — Check examination record
cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -10

# Step 1c — Check design context
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
# If absent: load SK-540 and run it now. Do not proceed to Step 2 until
# .impeccable.md exists with grammar declared.
```

**Phase 7 Step 5 — UX review pass on captured PNGs (updated):**

Load `planning--screen-craft-audit-SKILL.md` (SK-541). Run all four layers:
- Layer 1: accessibility (ui-ux-pro-max P1–P2)
- Layer 2: AI slop detection (design-for-ai CHECKER)
- Layer 3: Nielsen H1/H2/H8/H9 (impeccable critique)
- Layer 4: grammar verification against declared grammar (UX-30)

The authoritative classification protocol is in `docs/screen-examination/REPAIR-GUIDANCE.md`
Parts 2 and 3. SK-541 invokes it. Output: one SK-541 AUDIT record per page →
feeds Phase 7 Step 6 FC-18 Audit Trail.

Five common failure modes to check first (from REPAIR-GUIDANCE FM-1..FM-5 + FM-6):
  FM-1: Wrong route tier (UX-16 + UX-19)
  FM-2: TENANT_FACING badge on admin CRUD (UX-25)
  FM-3: Automated gate with manual action button (UX-23)
  FM-4: Internal IDs (T-numbers, CF-numbers) in tenant UI copy (UX-21)
  FM-5: Missing public page for implemented service (UX-20)
  FM-6: Wrong grammar for tenant-facing page (UX-30) *(new v1.1.0)*

---

## Section 8 — Integration Points

SK-539 integrates with the following governance documents. Version bumps tracked in SESSION-LOAD-PLAN v31.

| Document | Change | Version |
|---|---|---|
| `XIIGEN-CODE-REVIEW-PROTOCOL` | Add Gate 0m (FC-18 at plan review) | v1.6 → v1.7 |
| `XIIGEN-CODE-REVIEW-PROTOCOL` | Gate 0g business-intent sub-check | v1.7 → v1.8 |
| `XIIGEN-DESIGN-REVIEW-PROTOCOL` | Add Signal 12 (UI/UX compliance signal) | v1.3 → v1.4 |
| `XIIGEN-DESIGN-REVIEW-PROTOCOL` | Add Signal 13 (grammar correctness) | v1.4 → v1.5 |
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE` | Add Phase 7 (UX compliance phase) + Phase-N starter templates | v1.14 → v1.15 |
| `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE` | Add Q8 (WHO/VERB/GRAMMAR), completion gate SCREEN INTENT SERVED, Rule 35 | v1.15 → v1.16 |
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | Add Mistake 22 (starting React pages without SK-539) | v1.6 → v1.7 |
| `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE` | Add Q10 (job-to-be-done), Mistake 23 | v1.7 → v1.8 |
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | Add Q-23 (client page inventory + UX compliance lookup) | v1.1 → v1.2 |
| `XIIGEN-CODEBASE-ORIENTATION-MAP` | Add Q-24/Q-25/Q-26, route gate in Q-23, updated Q-08 | v1.2 → v1.3 |
| `HOW-TO-USE-SKILLS` | Add load_order 5.5, Check 15, Q2 table update | v4.3.0 → v4.4.0 |
| `HOW-TO-USE-SKILLS` | Add SK-540 (5.4), SK-541 (Phase 7 Step 5), SK-542 (5.3) | v4.4.0 → v4.5.0 |
| `XIIGEN-SESSION-LOAD-PLAN` | Register SK-539, FC-18, Rule 35 | v29 → v30 |
| `XIIGEN-SESSION-LOAD-PLAN` | Register SK-540/541/542, CFI-10 closed, CFI-11/12 open | v30 → v31 |
| `planning--flow-completeness-checker-SKILL.md` (SK-441) | Add V34 (UI/UX compliance pre-gate) | v2.0 → v2.1 |
| `DECISIONS-LOCKED.md` | Append D-ROLE-1 (role taxonomy) + D-ROLE-2 (screen template standard) | current → +2 decisions |
| `docs/screen-examination/REPAIR-GUIDANCE.md` | Authoritative 8-part examination + classification protocol | v1.0 |
| `docs/screen-examination/MARKET-REFERENCE-CATALOG.md` | Per-flow platform refs + per-state rendering (replaces §0.4 inline table) | v1.0 |
| `planning--business-flows-registry.md` | All-flow grammar lookup + CFI-12 flags + spec paths | v1.0 NEW |
| `flow-ui-examination-protocol-SKILL.md` (SK-542) | Session orchestrator for screen examination/repair | v1.0 NEW |
| `planning--product-design-context-SKILL.md` (SK-540) | Design context gate + .impeccable.md production | v1.0 NEW |
| `planning--screen-craft-audit-SKILL.md` (SK-541) | Four-layer PNG audit feeding FC-18 Audit Trail | v1.0 NEW |

---

## Section 9 — Quick Reference: Checks by Phase

When implementing a React page, run checks in this order:

**Before writing JSX (design gate — Section 0):**
- Load SK-542 (examination protocol) → read examination record if present
- Load SK-540 (design context) → verify .impeccable.md exists with grammar declared
- Declare grammar type (G1–G7) from §0.3
- UX-16 (route correct for role tier?)
- UX-19 (user-rights page not behind /admin/?)
- UX-20 (publicUrl → need /forms/:id route?)
- UX-25 (TENANT_FACING → not routing to admin CRUD?)
- UX-30 (grammar declared and not CRUD table?)
- Select template from §5 if pattern matches

**While writing JSX (implementation checks):**
- UX-01 (h1 present and meaningful, derived from user_intent)
- UX-02 (buttons and links have text/aria-label)
- UX-03 (all inputs have labels)
- UX-07 (no emoji as icons)
- UX-18 (role-conditional elements conditionally rendered)
- UX-21 (no internal IDs in copy)
- UX-22 (no-bypass gate badge if applicable)
- UX-23 (automated gate = progress indicator, not button)
- UX-28 (AI content = feedback widget)
- UX-29 (consent gate = approve/deny affordance)

**Before first Playwright capture (state completeness):**
- UX-04 (inline errors near fields)
- UX-05 (loading state present)
- UX-06 (empty state with CTA — required for tenant/public)
- UX-06b (PNG must show populated state, not empty/error)
- UX-10 (status uses color + label, not color alone)
- UX-14 (destructive actions have confirmation)
- UX-17 (API errors translated, no raw HTTP codes)
- UX-24 (human-in-the-loop 4-field pattern if applicable)
- UX-26 (OAuth flow has pending + return screens if applicable)
- UX-27 (human override has written justification if applicable)

**Phase 7 Step 5 — SK-541 four-layer audit:**
- Load SK-541 → run Layers 1–4
- Attach SK-541 AUDIT record to FC-18 Audit Trail

**Mobile/accessibility pass:**
- UX-08 (focus ring visible)
- UX-09 (tap targets ≥44px)
- UX-11 (no hover-only interactions)
- UX-12 (responsive at ≥320px for tenant/public pages)
- UX-13 (per-field inline validation)
- UX-15 (skip-to-main in app shell)

---

## Section 10 — Failure Mode Examples

### Failure class A — Wrong role tier for route

**Symptom:** `/admin/ads/consent` hosts "Ad Consent Preferences" — a GDPR user-rights page.
**Root cause:** UX-19 + UX-16 violation. Consent management belongs to R-REG (all users), not admin staff.
**Fix:** Move to `/settings/privacy`. Add role guard: authenticated users only, no admin role required.

### Failure class B — TENANT_FACING badge on admin CRUD

**Symptom:** `classification="TENANT_FACING"` on `DynamicFormsWorkflowsPage.tsx`, but the page renders a generic Name/Status/Notes table backed by `/api/dynamic/xiigen-dynamic-forms-workflows`.
**Root cause:** UX-25 violation. The form builder surface has never been built.
**Fix:** Build a form schema editor + publish workflow. The admin CRUD is acceptable for back-office use but must not be the TENANT_FACING surface.

### Failure class C — Automated gate with manual button

**Symptom:** `FlowCanvasPage.tsx` — "Publish Flow" button is present but the publication is gated by DFS cycle detection + type compatibility validation running on the server.
**Root cause:** UX-23 violation. The button implies the user triggers publication; the gate triggers it.
**Fix:** Replace button with "Validating…" progress indicator when validation is running. Show result (PASS / FAILED with reason). If PASS, show "Flow will publish automatically" — no manual button.

### Failure class D — Missing public page with implemented service

**Symptom:** `PublicPageRequestPipeline` (T430) is a complete server service in FLOW-28 with CDN caching, 404 handling, and analytics. No client route serves `/blog/:slug`.
**Root cause:** UX-20 extended pattern — the service exists but the consumer route does not.
**Fix:** Create `/blog` (index) and `/blog/:slug` (post) routes. The `PublicPageRequestPipeline` already handles the data assembly; the client only needs to render the assembled page.

### Failure class E — Internal IDs exposed in tenant UI

**Symptom:** `TemplateBuilder.tsx` headings: "T637 Validate Schema", "T638 Publish Version", "T639 Instantiate Form".
**Root cause:** UX-21 violation. T-numbers are engine-internal task type IDs with no meaning to a form author.
**Fix:** Replace with user-facing labels: "Validate Schema", "Publish Version", "Create Form". Move T-number to a collapsed "Technical details" tray if needed for debugging.

### Failure class F — Wrong grammar for tenant-facing page *(NEW v1.1.0)*

**Symptom:** `FeatureRegistryPage.tsx` renders `AdminCrudPanel` with columns Name / portingCandidate / signals / Delete for a platform-admin managing porting decisions.
**Root cause:** UX-30 violation. Grammar type was never declared. SK-540 and SK-542 were not run before JSX was written. The examination record at `docs/screen-examination/feature-registry-examination.md` declares NEEDS_PURPOSE_BUILT_UI (P0) and G3 CARD_LIST grammar.
**Fix:** Run SK-542 (read examination record) → SK-540 (produce .impeccable.md with G3 CARD_LIST declared) → apply FLOW-45 RUN-52 HistoryBootstrapPage template to wire `FeatureMatrixScreen` as the default Page output.
