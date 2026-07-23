# Role Analysis — Batch 1 of ~10 (FLOW-01 → FLOW-05)

## Date: 2026-04-20 | Branch: claude/pensive-tereshkova-baf347
## Source: `business flows.zip` + `docs/flow-coverage/*/P1-business-logic-inventory.md`
## Scope constraint: per Luba, no more than 5 flows per run

## ⚠️ Naming-alignment note (important)

The business-flows zip organises files by business theme, not by XIIGen FLOW-NN slug. Mapping:

| Business doc | XIIGen flow |
|--------------|-------------|
| `01-user-registration` | FLOW-01 user-registration |
| `02-business-onboarding` | FLOW-02 profile-enrichment |
| `03-event-creation-promotion` | FLOW-03 event-management |
| `04-post-publishing` | **FLOW-07 friend-request-social-feed** (NOT FLOW-04) |
| `05-lesson-completion-gamification` | FLOW-05 completion-gamification |
| `09-event-participation` | **FLOW-09 transactional-event-participation** (NOT FLOW-04 event-attendance) |

XIIGen **FLOW-04 event-attendance** has no dedicated business-flow doc in the zip — its business logic is inferred from its topology contract + P1 template. The batch-1 analysis below covers:

- **Direct business-doc matches** for FLOW-01, FLOW-02, FLOW-03, FLOW-05 (reviewed against their matching zip files).
- **FLOW-04 event-attendance** — analysed from its topology + name + upstream FLOW-03 event-management relationship + downstream FLOW-09 transactional-event-participation context.
- The **post-publishing content** (business doc 04) is tagged `[→ FLOW-07]` where it surfaces.

---

## Executive summary

Reviewed FLOW-01 (User Registration), FLOW-02 (Business Onboarding), FLOW-03 (Event Creation), FLOW-04 (Post Publishing), FLOW-05 (Lesson Completion + Gamification) against the business-logic documentation in `business flows.zip`. Each flow description was analysed for **who interacts with it, at what stage, and what they are permitted to see or do**.

Key finding across all 5 flows: **the business docs describe only implementer personas (AI / PM / Security / SRE / Marketing)** — they never name the end-user viewer persona explicitly. That was a latent gap that C6 made visible. The analysis below derives the *viewer* roles from the event chains, entry points, and conditional logic in each flow's `For AI / Code Generation` YAML block.

| Flow | Net role count | Public-internet? | Anonymous path? | Priority |
|------|:-------------:|:---------------:|:---------------:|:--------:|
| FLOW-01 user-registration | 5 | ✅ partial | ✅ entry point | P1 |
| FLOW-02 profile-enrichment | 4 | ❌ | ❌ | P3 |
| FLOW-03 event-management | 6 | ✅ partial | ⚠️ event discovery | P1 |
| FLOW-04 post-publishing | 5 | ✅ partial (public posts) | ⚠️ | P2 |
| FLOW-05 completion-gamification | 4 | ❌ | ❌ | P3 |

---

## FLOW-01 — User Registration & SSO Onboarding

**Business-logic summary (from business flows.zip):** entry point for every user; two paths (SSO via Google/Facebook/LinkedIn/Figma OR email/password + verification); triggers downstream personalisation (matching, feed adaptation, learning programs) on `UserOnboardingCompleted`.

**Entry points:** `POST /auth/sso/{provider}`, `POST /auth/register`, `GET /auth/verify?token=`.

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** | Lands on landing page, hits /register or /auth/sso | Marketing hero + "Sign up with Google" CTA + "or register with email" form | ✅ YES — no auth-gated widgets at all |
| **`public-marketplace-visitor`** | Arriving from a marketplace referral link, referral code in URL | Same as `anonymous` + referral-code badge + "Join via [Referrer Name]" confirmation | ✅ YES — referral acknowledgement + auto-filled referral code |
| **`referral-user`** | Just completed registration via referral | Welcome screen with "You joined via [Referrer]" + first-time reward hint | ✅ YES — distinct from normal onboarding welcome |
| **`tenant-user`** (post-verification) | Standard "verify your email" → "answer questionnaire" journey | Dashboard with questionnaire chat message | Shared with `tenant-user` persona; no additional template |
| **`tenant-admin`** (invited sign-up) | Invited by another admin to join as tenant admin — pre-stamped role during activation | Admin welcome banner + admin-scoped questionnaire variant | ⚠️ PARTIAL — at minimum a post-activation admin-quickstart modal |

### Cross-role surfaces

- **Verification email resend page** (`ResendPage.tsx`, already in repo): currently shows same template to all users. Role-aware variant: referral-user sees "Your referrer's reward activates when you verify" hint; tenant-admin sees "An admin activation is pending".
- **Onboarding delivery screen** (`OnboardingPage.tsx`): workspace setup + tutorial + community invitation. Role-aware variant: freelancer joining via business-partner invite sees "Your business sponsor is [Name]" card.

### Template implications

1. **Landing + /register pages** must render the `public-marketplace-visitor` template when a `?ref=<code>` or `?referral=<code>` query param is present (the URL is the identity for the anonymous visitor).
2. **`ResendPage.tsx`** already exists but lacks role-aware copy — add 2 new branches (referral-user, tenant-admin).
3. **`OnboardingPage.tsx`** currently has one code path; add a `freelancer-invited-by-business` MOCK_STATE and render a sponsor acknowledgement card.

### ROLE-COVERAGE-MATRIX update for FLOW-01

Row reaffirmed: anon ✅ · public-mkt — · tenant-user ✅ · tenant-admin ⚠️ · referral ✅ · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin — · platform-support —

(Previously 7 ✅+⚠️ cells; no changes.)

---

## FLOW-02 — Business Onboarding & Personalization

**Business-logic summary:** triggered by `QuestionnaireCompleted` from FLOW-01. Three parallel branches (business profile, analytics, learning) converge on `OnboardingCompleted`. Runs the matching algorithm (industry 30% + location 25% + stage 25% + interest 20%).

**Entry points:** event-driven — no HTTP endpoint the user hits directly. UI surface is the "Personalizing your experience..." loading screen + the post-personalisation dashboard.

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-user`** | During personalisation + after completion | Progress indicator → "We found 12 business matches for you!" → personalised feed | ✅ YES — default |
| **`freelancer`** | Same event — user is a freelancer persona | Different match types: "mentor" vs "peer" vs "collaborative" take different weights; freelancer sees "Your matched clients" not "Your matched partners" | ✅ YES — copy + action verbs |
| **`business-partner`** | Same event — user is business-partner persona | Sees "matched freelancers" + "complementary businesses" grouped separately | ✅ YES — grouped output |
| **`event-organiser`** | Event-heavy profile | Learning program de-prioritised; events-feed hero-sized | ✅ YES — emphasis swap |
| **`tenant-admin`** | Usually skipped for admins | Either N/A (admins don't re-run onboarding) OR "You are viewing [user]'s match results" read-only variant | ⚠️ CONDITIONAL — only if impersonation is supported |

### Cross-role surfaces

- The **matches carousel** is rendered on the dashboard. Same data, but the phrasing per role differs:
  - tenant-user: "Connect with [Business]"
  - freelancer: "Offer services to [Business]"
  - business-partner: "Hire from [Freelancer]" or "Partner with [Business]"

### Template implications

1. **Loading state** (progress spinner during personalisation): single template, no variant needed.
2. **Matches carousel**: card CTA is role-dependent — use `RoleScopedView`.
3. **Match-reasons tooltip**: freelancer sees "strong skill overlap + client industry match"; business-partner sees "budget fit + scope fit". Both derive from the same `matchReasons` field but filter differently.

### Not-relevant roles

- `anonymous`, `public-marketplace-visitor`, `referral-user` — this flow is event-driven post-registration; the user is already authenticated.
- `platform-admin`, `platform-support` — no cross-tenant view of personalisation output specified in R1.

### ROLE-COVERAGE-MATRIX update for FLOW-02

Row refined: anon — · public-mkt — · tenant-user ✅ · tenant-admin ⚠️ (impersonation view only) · referral — · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin — · platform-support —

(Removed the previous `referral-user` ✅ — the referral fact is captured at FLOW-01, not re-surfaced in personalisation output. Net 4 active roles.)

---

## FLOW-03 — Event Creation & Promotion

**Business-logic summary:** organiser submits event (title, dates, pricing, capacity). Matching runs multi-factor scoring (interest 35% + location 25% + time 20% + price 10% + social 10%), segments into strong/medium/weak match tiers, Feed Service injects events at positions driven by score.

**Entry points:** `POST /events` (organiser), `GET /events/:id` (everyone who discovers the event), `POST /events/:id/register` (attendee).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** / **`public-marketplace-visitor`** | Arriving at `/events/:id` from a shared link | Read-only event card + "Sign in to register" CTA | ✅ YES — already in FLOW-08 pilot pattern |
| **`tenant-user`** | Discovers event in feed OR via direct link | "Register" CTA + capacity remaining + friends-going indicator | ✅ YES — primary |
| **`referral-user`** | Came via event referral link (`/events/:id?ref=...`) | "Register" + "Referrer gets reward" copy | ✅ YES — referral banner, same as FLOW-01 pattern |
| **`freelancer`** | Discovers event marked "open to service offers" | "Offer services at this event" CTA (distinct from register) | ✅ YES — **implemented in FLOW-08 EventDiscoveryPage pilot** |
| **`business-partner`** | Sees event with `acceptsSponsorship: true` | "Explore sponsorship" CTA | ✅ YES — **implemented in FLOW-08 pilot** |
| **`event-organiser`** | Authoring + publishing own event | Distinct creation flow: preview + reach prediction + capacity controls + pricing; after publish sees analytics dashboard + attendee roster | ✅ YES — separate page `EventCreationPage.tsx` (already present) |
| **`tenant-admin`** | Admin reviewing event before publish OR moderating | Approve/reject + content-policy flags + revenue projection | ✅ YES — admin moderation variant |

### Cross-role surfaces

- **Event detail card**: the SAME event surface (same ID, same content) must render 5+ CTA templates depending on who's viewing. This is the canonical C6 example and the FLOW-08 pilot proves the pattern works.
- **Analytics view**: visible to `event-organiser` (own event), `tenant-admin` (all tenant events), `platform-admin` (cross-tenant aggregate). Same data, 3 zoom levels.

### Template implications

1. Event detail page: apply `RoleScopedView` per role bucket (anonymous/tenant-user/freelancer/biz-partner/organiser/admin) — same pattern as FLOW-08 pilot.
2. Event creation wizard: role-gated — `event-organiser` or `tenant-admin` only. Everyone else → redirect to event list with a "Request organiser role" banner.
3. Attendee roster: organiser sees full PII; tenant-admin sees anonymised; tenant-user sees only "Name + headshot" without contact details.

### ROLE-COVERAGE-MATRIX update for FLOW-03

Row expanded: anon ✅ · public-mkt ✅ · tenant-user ✅ · tenant-admin ⚠️ (moderation) · referral ✅ · freelancer ✅ · biz-partner ✅ · event-org ✅ · platform-admin ⚠️ (cross-tenant analytics) · platform-support —

(Previously 5 cells; now 8 with upgraded granularity. FLOW-03 is a major role-template target.)

---

## FLOW-04 — Event Attendance & Check-In (the real XIIGen FLOW-04)

**Business-logic summary (inferred from topology + upstream/downstream flows):** downstream of FLOW-03 event creation. Tracks RSVP state (pending/confirmed/declined/waitlisted), manages day-of check-in, captures attendance for reporting and for FLOW-05 gamification (attendance streaks are a gamification source).

**Entry points (inferred):** `POST /events/:id/rsvp` (attendee), `POST /events/:id/checkin` (organiser scanning QR at door), `GET /events/:id/attendees` (organiser roster), `GET /users/:id/events` (attendee's own event list).

### Observable viewer roles — FLOW-04 event-attendance

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-user`** (attendee) | Receives an event invite → RSVPs → checks in day-of | Event card with RSVP toggle (Going/Maybe/Decline) + calendar sync button; day-of: QR code for scanning | ✅ YES — attendee primary |
| **`anonymous`** | Arrives from a shared "I'm going to [Event]" link | Read-only "X people are going" + "Sign in to join" CTA | ✅ YES — public preview |
| **`referral-user`** | RSVP'd via a friend's share link | RSVP screen shows "[Friend] invited you" + preserved referral credit | ✅ YES — referral banner |
| **`event-organiser`** | Managing attendee list | Roster with filters (confirmed / waitlisted / checked-in) + bulk actions (waitlist-promote, cancel) + day-of QR scanner | ✅ YES — organiser dashboard |
| **`tenant-admin`** | Monitoring attendance for compliance or reporting | Aggregate attendance stats + no-show patterns + capacity utilisation | ✅ YES — admin reporting |

**Template implications:** role-gated RSVP section on event detail (FLOW-03 card); organiser-only check-in page at `/events/:id/checkin`; tenant-user `/my/events` list.

### Not-relevant roles for FLOW-04

`freelancer`, `business-partner`, `platform-admin`, `platform-support` — this flow's business logic is event-attendance-specific. Freelancer/business CTAs live in FLOW-03 event discovery, not here.

### ROLE-COVERAGE-MATRIX update for FLOW-04 event-attendance

Row refined: anon ✅ · public-mkt ⚠️ (preview) · tenant-user ✅ · tenant-admin ✅ · referral ✅ · freelancer — · biz-partner — · event-org ✅ · platform-admin — · platform-support —

(Previously 3 cells; now 5 active cells.)

---

## Bonus — Post Publishing content (business doc 04 → XIIGen FLOW-07)

The business-flows-zip doc `04-post-publishing.md` describes the post-publishing + feed-distribution pipeline. In XIIGen's slug map this is **FLOW-07 friend-request-social-feed**, not FLOW-04. Carrying a condensed analysis here for continuity; batch 2 will cover FLOW-07 in full.

**Business-logic summary (from business flows.zip):** user publishes a post (text/image/video/article/poll). NLP extracts topics → three parallel matchers (business/friends/groups) → composite ranking across 6 factors (match 25% + friend 20% + group 15% + activity 20% + recency 10% + engagement 10%) → feed distribution in 5 tiers (premium/high/medium/low/minimal) with diversity controls.

**Entry points:** `POST /posts` (author), `GET /feed` (reader).

### Observable viewer roles — post-publishing content (→ FLOW-07)

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`anonymous`** / **`public-marketplace-visitor`** | Arriving at a post via shared link (if post is flagged `public: true`) | Read-only post + "Sign in to comment/like" CTA | ✅ YES — public post share-link template [→ FLOW-07] |
| **`tenant-user`** (author) | Publishing own post | Composer + audience preview ("This will reach ~2,400 users in your network") + post-publish distribution report | ✅ YES — author template [→ FLOW-07] |
| **`tenant-user`** (reader) | Sees post in feed | Post card + like/comment/share actions | ✅ YES — default reader [→ FLOW-07] |
| **`freelancer`** (author) | Publishes a gig-related post | Composer has extra fields: "Service category", "Rate", "Availability" | ✅ YES — freelancer composer variant [→ FLOW-07] |
| **`business-partner`** (author) | Publishes a sponsorship-or-hiring post | Composer has "Partnership type", "Budget range" | ✅ YES — business composer variant [→ FLOW-07] |
| **`tenant-admin`** | Moderating flagged posts | Queue view: offending posts + "Approve / Remove / Warn user" actions | ✅ YES — moderation queue page [→ FLOW-07] |
| **`platform-admin`** | Cross-tenant moderation + NLP category review | Same as admin, broader scope | ✅ YES — cross-tenant moderation page [→ FLOW-07] |

### Cross-role surfaces

- **The feed itself** shows different posts to different roles even for the same event stream: freelancer's feed is skewed toward gig-related posts; business-partner's feed toward hiring posts. This is FLOW-04's matching algorithm naturally working per role — no additional UI template needed, just correctly-tagged post sources.
- **Post composer** needs 3 templates: default (text/media), freelancer (gig fields), business-partner (hiring fields).
- **Shared public post** needs a template too — today posts are assumed tenant-private.

### Template implications

1. Current feed UI assumes one template; no obvious fleet changes needed beyond the role-aware composer.
2. Add `PublicPostSharePage.tsx` — standalone route for anonymous visitors arriving via a share URL.
3. Composer: use `RoleScopedView` to switch field set.
4. Moderation queue: `/admin/moderation/posts` with tenant-admin vs platform-admin variants.

### ROLE-COVERAGE-MATRIX update — this row will land on **FLOW-07** (batch 2)

anon ⚠️ (public posts only) · public-mkt ⚠️ · tenant-user ✅ · tenant-admin ✅ · freelancer ✅ · biz-partner ✅ · platform-admin ⚠️

Note: the current FLOW-07 row in the matrix only has 2 active cells — batch 2 will expand it to 6–7 per this analysis.

---

## FLOW-05 — Lesson Completion & Gamification

**Business-logic summary:** user completes a lesson questionnaire. Three parallel branches: (1) Gamification awards points + levels + achievements, (2) Learning plan adapts curriculum via ML, (3) Social distribution publishes a "questionnaire post" with peer grading (accuracy, depth, clarity, creativity) and categorised comments (support, question, challenge, insight).

**Entry points:** `POST /questionnaires/:id/answer` (learner), `POST /posts/:id/grade` (peer grader).

### Observable viewer roles

| Role | When they interact | What they see | Distinct template needed? |
|------|--------------------|---------------|---------------------------|
| **`tenant-user`** (learner) | Completing own lesson | Points-earned toast + level-up animation (if triggered) + achievement unlock card | ✅ YES — primary |
| **`tenant-user`** (peer grader) | Seeing a peer's questionnaire post in feed | 4-criteria grading widget (accuracy/depth/clarity/creativity stars) + comment-type picker (support/question/challenge/insight) | ✅ YES — grading-view variant |
| **`referral-user`** | Same as tenant-user | — | — merge |
| **`freelancer`** (learner, if enrolled in freelancer-specific programs) | Freelancer-skills lesson (e.g., client-communication) | Same as tenant-user learner + "Add to portfolio" shortcut | ⚠️ OPTIONAL — portfolio action is additional, not a distinct template |
| **`event-organiser`** (learner, if enrolled in event-running programs) | Event-planning lesson | Same as tenant-user learner | — merge |
| **`tenant-admin`** | Monitoring learner progress across tenant | Dashboard of learner completion + aggregate scores — read-only | ✅ YES — admin monitoring page |

### Cross-role surfaces

- **Achievement unlock animation** is consistent for all learners — no role variation needed.
- **Questionnaire post in feed** (created by FLOW-05 → FLOW-04 distribution): reader sees same post card regardless of their role; the peer-grading widget below the post card is role-gated (must be enrolled in the same learning track to grade authoritatively — the business logic mentions "similar learners by similarity threshold 30%").

### Template implications

1. Learner completion screen: one template; gamification reveals happen via animations, not separate pages.
2. Peer grading view: drops a new widget under post card when viewer is a qualifying peer. Use `RoleScopedView` with a custom condition (not just role, but "similarity ≥ threshold").
3. Admin learner-progress page: new page or subsection of existing FLOW-05 admin surface.

### ROLE-COVERAGE-MATRIX update for FLOW-05

Row refined: anon — · public-mkt — · tenant-user ✅ · tenant-admin ✅ (monitoring) · referral — (merged) · freelancer ⚠️ (portfolio add) · biz-partner — · event-org — (merged) · platform-admin — · platform-support —

(Previously 2 ✅ cells; now 3 active role cells. Low-to-medium role-template target.)

---

## Consolidated role signals across batch 1

| Role | Flows in batch 1 needing it | Notes |
|------|:----------------------------:|-------|
| `anonymous` | FLOW-01, -03, -04 (public path) | Public-internet visibility confirmed — all 3 need dedicated template |
| `public-marketplace-visitor` | FLOW-03, -04 (share links) | Subset of `anonymous` — apply same template with referral-code variant |
| `tenant-user` | All 5 | Default authenticated persona |
| `tenant-admin` | FLOW-01, -03, -04, -05 | Moderation / impersonation / monitoring |
| `referral-user` | FLOW-01 (entry), FLOW-03 (event referral) | Only surfaces on entry + event-referral flows; merges into tenant-user elsewhere |
| `freelancer` | FLOW-02, -03, -04 | Distinct CTAs (offer-services, composer fields, match-reasons) |
| `business-partner` | FLOW-02, -03, -04 | Sponsorship, hiring, partner CTAs |
| `event-organiser` | FLOW-01 (invited), FLOW-03 (primary author) | Exists across 2 flows in batch 1 |
| `platform-admin` | FLOW-03, -04 | Cross-tenant moderation + analytics |
| `platform-support` | None in batch 1 | Will appear in later batches (multi-tenancy flows) |

### Biggest finding

**FLOW-03 Event Creation & Promotion is the fleet's densest role-template target** — 8 distinct viewer templates for the same event detail surface. The FLOW-08 EventDiscoveryPage pilot already demonstrates the pattern; FLOW-03's event-detail page should be the next roll-out.

**Priority for Pass 3-A (recommended in FLEET-VALIDATION-v2 §5):**

1. FLOW-03 event-management (8 templates) ← **upgrade from P3 to P1**
2. FLOW-01 user-registration landing + ResendPage + OnboardingPage (5 templates)
3. FLOW-04 post-publishing composer + share-link page (6 templates)

FLOW-02 + FLOW-05 are lower priority — their role differences are mostly copy tweaks + conditional widgets, not full template branches.

---

## Next batch

Batch 2 target: **FLOW-06 → FLOW-10** (user-groups-communities, friend-request-social-feed, marketplace, transactional-event-participation, reviews-reputation). These are the heart of the marketplace + social fleet and will produce the highest concentration of public-internet templates.

Produces: `docs/design-reviews/ROLE-ANALYSIS-BATCH-02.md`.

### Updating ROLE-COVERAGE-MATRIX.md

Rows 01, 02, 03, 04, 05 in the canonical matrix need the refinements above reflected. I'll write those updates directly into the matrix in the next commit so the matrix stays the single source of truth.
