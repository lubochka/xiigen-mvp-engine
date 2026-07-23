# SCREEN EXAMINATION & REPAIR GUIDANCE
## For Claude Code — complete instructions for examining, evaluating, and fixing every screen
## Date: 2026-04-20
## Authority: This document supersedes all prior per-run plan files for screen examination

---

## THE CORE COMPLAINT (read this first)

Luba's diagnosis: the screens are "disconnected from the business idea they suppose to
represent — like the model is blind, and it's not."

The model is not blind. The business logic is fully specified. The specs exist in
multiple locations. The problem is that Claude Code never read them before building
the UI. This document tells Claude Code exactly where to look, in what order, and
what to do with what it finds.

---

## PART 1 — WHERE THE SPECS LIVE (all locations, authoritative)

For every flow, read sources in this priority order. Higher number = more detailed.

### Source 1 — Business Flow Specs (uploaded zip)
**Location:** `business flows/NN-flow-name.md` (the uploaded zip, now accessible at the path where Luba uploaded it)

**What it contains:**
- Short and long description of what the flow does in plain English
- Persona descriptions for PM and for code generation
- Event chains, service dependencies, data stores
- Error handling rules, idempotency requirements

**The files:**
```
01-user-registration.md              → FLOW-01 registration + onboarding
02-business-onboarding.md            → FLOW-02 profile + questionnaire
03-event-creation-promotion.md       → FLOW-03 event creation + AI matching
04-post-publishing.md                → FLOW-04 social posting + feed
05-lesson-completion-gamification.md → FLOW-05 learning + badges
06-marketplace-publishing.md         → FLOW-06 marketplace listing + cooperators
07-friend-request-feed-integration.md → FLOW-07 social graph + feed
09-event-participation.md            → FLOW-09 booking + attendance
10-shops modules.md                  → FLOW-10 shop/commerce
11-social network modules.md         → FLOW-11 social network
12 - ERP systems.md                  → FLOW-12 billing + ERP
13 - finance.md                      → FLOW-13 finance/analytics
...and more
```

**Also available:** `Small Business Networking App - Functional Specifications & Architecture.docx`
and `umls.md` / `umls.drawio.xml` — the UML diagrams that define every user journey.

**When to use this source:** For every TENANT-FACING flow. Read the "For Product Manager"
section to understand what the screen should feel like. Read the "For AI/Code Generation"
section to understand the technical structure.

---

### Source 2 — Codebase Session Docs
**Location:** `docs/sessions/FLOW-XX/` in the repository

**What it contains per flow:**
```
STEP-1-INVARIANTS.md         → verbatim user intent + BFA constraints (the "why")
UI-REFLECTION-STATE.md       → all processes + states + events (the node list)
DESIGN-SIMULATION-R1.md      → end-to-end user walkthrough (the "what happens")
flow-ui-automation.json      → UI phase requirements + which phases need UI
viz/                         → existing visual references already generated
FLOW-XX-RECONCILIATION-STATE.md → what is actually built vs designed
```

**When to use this source:** For ENGINE-INTERNAL flows (topology canvas flows,
arbitration, feature registry, etc.) where the business spec is the engine's own
design. For ANY flow where you need the exact list of states (initiate/in_progress/
result/error/next_step) for each process.

---

### Source 3 — Product Specs Document
**Location:** `docs/XIIGEN_PRODUCT_SPECS.md` in the repository

**What it contains:** The authoritative per-flow product intent in a single document.
Section headers are `## FLOW-XX`. Read this for the one-sentence "what does this do
for the user" answer.

---

### Source 4 — Deep Research Reports (in the uploaded zip)
**Location:** `business flows/NN-flow-name deep research.md`

**What it contains:** Detailed UX research, competitive analysis, user stories,
edge cases. These were produced by prior research sessions.

**When to use:** When the base spec doesn't answer a specific design question
(e.g., "what does the empty state look like when a new freelancer has no gigs?").
Read the deep research for the answer.

---

### Source 5 — Well-Known Platform Conventions (fallback only)
**When to use:** ONLY when Sources 1–4 don't answer a specific design question.

Every flow in XIIGen maps to a well-understood product category. If the spec
doesn't prescribe a specific UI pattern, use the dominant convention from
the closest real-world platform:

| Flow | Real-world reference | Key UI conventions to follow |
|------|---------------------|------------------------------|
| FLOW-01 Registration | Airbnb, Linear, Notion signup | SSO buttons above email form; single page; immediate onboarding after verify |
| FLOW-02 Profile/Questionnaire | LinkedIn profile setup, Typeform | Step indicator; one question per screen or grouped short form; progress bar |
| FLOW-03 Event Creation | Eventbrite, Meetup create | Form wizard: details → tickets → promotion → publish; live preview |
| FLOW-04 Social Feed/Posts | Twitter/X, LinkedIn feed | Infinite scroll; card per post; like/comment/share row; author avatar + name + timestamp |
| FLOW-05 Lesson/Gamification | Duolingo, Khan Academy | Completion animation; streak counter; XP/badge reveal; next lesson CTA |
| FLOW-06 Marketplace | Etsy, Upwork | Card grid; filter sidebar; price prominent; seller rating; "Buy" / "Hire" CTA |
| FLOW-07 Friend Requests/Feed | Facebook, LinkedIn connections | Pending requests badge; "People you may know"; mutual connections shown |
| FLOW-09 Event Booking | Eventbrite checkout, Airbnb booking | Capacity indicator; ticket type selector; payment → confirmation → QR |
| FLOW-10 Shops/Commerce | Shopify storefront, Etsy shop | Product grid; product detail; cart; checkout funnel |
| FLOW-11 Social Network | Instagram, Twitter/X | Profile + follower counts; post grid; follow button; bio |
| FLOW-12 Billing | Stripe billing portal, Paddle | Invoice list; current plan card; payment method; upgrade CTA |
| FLOW-13 Finance | QuickBooks summary, Wave | Revenue/expense chart; recent transactions; period selector |
| FLOW-29 Deep Research | Perplexity, Elicit | Search input; source cards; synthesised answer; citation links |
| FLOW-35 Arbitration | Code review tools (GitHub PR) | Item list; reviewer grid; verdict badges; approve/reject buttons |

**Rule:** If a screen looks like it belongs on a well-known platform, it should
feel like it belongs there. Not copied — but the user should have zero learning
curve.

---

## PART 2 — HOW TO EXAMINE EACH PNG (the 7-step protocol)

Run these 7 steps for every flow, in order. Do not skip to the fix before
completing the examination.

### Step 1 — Read the business spec (2 minutes)

```
Read: business flows/NN-flow-name.md (Source 1)
      OR docs/sessions/FLOW-XX/STEP-1-INVARIANTS.md (Source 2)
      
Extract:
  - One sentence: "This screen allows [WHO] to [DO WHAT] in order to [ACHIEVE WHAT]"
  - Role list: which roles open this screen (anonymous / tenant-user / tenant-admin /
    event-organiser / freelancer / platform-admin / platform-support)
  - Primary action: the one verb the user is here to perform
```

### Step 2 — Read the state inventory (2 minutes)

```
Read: docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md (for engine flows)
      OR docs/sessions/FLOW-XX/DESIGN-SIMULATION-R1.md (for business flows)
      OR business flows/NN-flow-name deep research.md §User Stories (for business flows)

Extract:
  - All states the screen can be in:
      empty     → user has no data yet (new account, no orders, etc.)
      loading   → data is being fetched
      populated → normal operating state with data
      error     → fetch failed or action failed
      success   → action just completed
  - Per-role variants: what changes between roles
```

### Step 3 — Open the PNG

```
Open: docs/e2e-snapshots/{slug}/default.png (or the role-specific PNG)

Ask the 4 classification questions:
  Q1: Is this still a CRUD table backed by /api/dynamic/xiigen-*?
      YES → NEEDS_PURPOSE_BUILT_UI
  Q2: Is the primary content empty, zero, or showing an error as normal state?
      YES → NEEDS_EMPTY_STATE or NEEDS_ERROR_HANDLING
  Q3: Does the screen expose internal identifiers (T621, MONO_MODEL_CALIBRATION,
      ENGINE_INTERNAL, spec file names, machine IDs)?
      YES → NEEDS_LABEL_SANITISATION
  Q4: Is the content correct for the current role?
      NO  → NEEDS_ROLE_BRANCH_CORRECTION
```

### Step 4 — Apply UI/UX Pro Max P1 checks (accessibility — blocking)

```
From skill: ui-ux-pro-max (uploaded)

Check P1 — Accessibility (CRITICAL):
  [ ] color-not-only: Is state communicated by colour alone? (Add text/icon)
  [ ] aria-labels: Are icon-only buttons labelled? (canvas zoom, send buttons)
  [ ] form-labels: Does every input have a visible label?
  [ ] heading-hierarchy: Is there h1 → h2 → h3 without skipping levels?

Check P2 — Touch & Interaction (CRITICAL):
  [ ] loading-buttons: Does every async button disable and show a spinner?
  [ ] error-feedback: Are errors shown near the field that caused them?

Check P9 — Navigation:
  [ ] nav-state-active: Is the current page highlighted in the sidebar?
  [ ] drawer-usage: Is the sidebar hidden for anonymous public-reader screens?
```

### Step 5 — Apply Design for AI AI-tells check (identity)

```
From skill: design-for-ai (uploaded)

Run the Detection Checklist:
  [ ] Font: Is it Inter/Roboto/system-ui with no intentional choice?
  [ ] Color: Is it cyan-on-dark, pure black/white, or purple-to-blue gradient?
  [ ] Layout: Is every section wrapped in identical rounded cards?
  [ ] Layout: Is there a hero metric template (big number + small label)?
  [ ] Copy: Is every label "clean and modern" rather than product-specific?

If 3+ tells are present: the screen needs an aesthetic direction pass AFTER
the blocking functional fixes are done.
```

### Step 6 — Apply Impeccable Nielsen heuristics (quality score)

```
From skill: impeccable (uploaded) — critique mode

Score only H1, H2, H8, H9 per screen (the four that catch the most problems):

H1 Visibility of System Status:
  0: No feedback — user is guessing
  1: Most actions produce no visible response
  2: Some states communicated, major gaps

H2 Match System / Real World:
  0: Engineering jargon throughout
  1: Mostly technical language, some plain
  2: Mixed

H8 Aesthetic and Minimalist Design:
  0: Everything competes for attention equally
  1: Cluttered — hard to find what matters
  2: Some clutter, main content clear

H9 Error Recovery:
  0: Errors are cryptic or absent
  1: Error shown but no recovery path

If H1 ≤ 1 or H2 ≤ 1: these are P1 bugs, fix before any aesthetic work.
If H9 = 0: P0 — error state without recovery is a broken screen.
```

### Step 7 — Apply Interface Design domain test (craft)

```
From skill: interface-design (uploaded)

Three questions, answer with specifics:
  1. Who is this human? (not "users" — the actual person, their context right now)
  2. What must they accomplish? (one verb)
  3. What should this feel like? (not "clean and modern" — something specific)

If you cannot answer question 3 with specifics: the screen needs an intent
statement before any visual fixes.

Swap test: If you replaced this screen with the most generic version of the same
screen type (a Stripe billing page, an Airbnb checkout, a LinkedIn profile), would
anyone notice the difference? If NO — the screen has no identity.
```

---

## PART 3 — THE DECISION TREE (how to choose what to fix)

After running Steps 1–7, every screen is in one of these states:

```
CLASSIFICATION          SEVERITY    WHAT TO DO
─────────────────────────────────────────────────────────
NEEDS_PURPOSE_BUILT_UI  P0          Throw out CRUD table. Build new page using
                                    Step 1 spec + Step 2 states + real-world
                                    reference from Part 1 Source 5 table.

NEEDS_ERROR_HANDLING    P0          Add specific error message + retry action.
                                    "Booking not found" → "No booking selected.
                                    Choose from the attendee list." with a link.

NEEDS_EMPTY_STATE       P1          Add empty state that explains + teaches.
                                    Use the flow's business spec to write copy
                                    that explains what will appear here when
                                    the user takes an action.

NEEDS_LABEL_SANITISATION P1         Replace every technical string with plain
                                    language. Check Step 2 for the human-readable
                                    names of processes. Replace task type IDs
                                    with those names.

NEEDS_ROLE_BRANCH       P1          Read the flow spec for the role's journey.
                                    The content must match what that role came
                                    to do — not a generic view.

PROVIDER_KEYS_BANNER    P0          Gate to platform-admin role only. This fix
                                    runs FIRST, before any other per-screen fix.
                                    One code change, all screens repaired.

NO_ACTIVE_NAV_STATE     P2          Add active state to the sidebar nav item
                                    that corresponds to the current route.
                                    One CSS change, all screens repaired.

SIDEBAR_ON_ZERO_CHROME  P1          Anonymous public-reader screens (CMS, Blog,
                                    OSS Curriculum, AI Safety anonymous) must
                                    render without the AppShell wrapper.
                                    Conditional: {role === 'anonymous' && isPublicRoute
                                    ? <PublicLayout> : <AppShell>}

PASSES                  —           Capture PNG as evidence. Move on.
```

---

## PART 4 — THE BUILD STANDARD (what a passing screen looks like)

A screen passes when all of the following are true:

**Business alignment:**
- A non-technical reviewer can read the screen and state what the flow does
- The primary action matches what the spec says the user is here to do
- The copy uses the vocabulary of the flow's domain (not engineering vocab)

**Role correctness:**
- Anonymous users see zero platform chrome on public screens
- Tenant-users see only their own data
- Platform-admins see the only operational controls (banner, system status)
- The sidebar shows only the navigation items appropriate to the role

**State coverage (every screen needs all four):**
- `empty` — new user/no data state with explanation + CTA
- `loading` — skeleton or spinner while data fetches
- `populated` — the normal operating state (this is what the PNG shows)
- `error` — friendly message + recovery action (not "Failed to fetch")

**UI/UX minimums:**
- No colour-only state communication (text or icon alongside every colour)
- No icon-only buttons (aria-label + visible label or tooltip)
- No native `<select>` elements (custom dropdown component)
- No engineering identifiers visible to non-engineering roles
- Active nav state highlighted for current route
- All async buttons have loading/disabled state

**The non-technical reviewer test:**
Ask: "Can a person who knows nothing about XIIGen's architecture look at this PNG
and answer YES to all three:"
1. I understand what this feature does.
2. I can see what I should do next.
3. Nothing on this screen looks like it was left there by a developer by accident.

If any answer is NO, the screen has not passed.

---

## PART 5 — SCREEN-BY-SCREEN REFERENCE TABLE

One row per flow. The table tells Claude Code exactly where to read, what to
look for, and what real-world reference to use if the spec is ambiguous.

| Flow | PNG slug | Primary spec source | Real-world reference | Expected grammar | Known P0/P1 issues |
|------|----------|--------------------|--------------------|-----------------|-------------------|
| FLOW-01 | user-registration, onboarding | `01-user-registration.md` | Airbnb signup, Linear onboarding | Grammar 5 (Kiosk/Single action) | Banner visible; confirm active nav |
| FLOW-02 | questionnaire | `02-business-onboarding.md` | Typeform, LinkedIn setup wizard | Grammar 5 → multi-step | Check step indicator present |
| FLOW-03 | event-creation | `03-event-creation-promotion.md` | Eventbrite create | Grammar 8 (Form wizard) | Check live preview panel |
| FLOW-04 | event-attendance, social-feed | `04-post-publishing.md`, `07-friend-request.md` | Twitter/X, Facebook feed | Grammar 3 (Card list with state badge) | Banner; check feed has real post content |
| FLOW-05 | lesson-completion | `05-lesson-completion-gamification.md` | Duolingo completion | Grammar 5 (Kiosk/celebration) | Check animation exists; streak counter |
| FLOW-06 | marketplace, gig-posting | `06-marketplace-publishing.md` | Etsy, Upwork | Grammar 3 (Card grid) | Banner; gig cards need hover + CTA inside |
| FLOW-07 | social-feed, groups, friend-requests | `07-friend-request-feed-integration.md` | LinkedIn, Facebook | Grammar 3 (Card list) | Check connection state badge (connected/pending/stranger) |
| FLOW-09 | booking, event-registration | `09-event-participation.md` | Eventbrite checkout | Grammar 5 → Grammar 8 | P0: booking event-organiser shows "not found" — needs mock data |
| FLOW-10 | shops (future) | `10-shops modules.md` | Shopify storefront | Grammar 3 (Product grid) | |
| FLOW-12 | billing | `12-erp-systems.md` | Stripe billing portal | Grammar 3 (Card list with state) | Banner; FAILED invoice not dominant |
| FLOW-16 | checkout | Deep research zip | Stripe checkout, Airbnb pay | Grammar 8 (Checkout funnel) | P0: Cart ID field — replace with order summary + payment |
| FLOW-18 | visual-flow-engine | `docs/sessions/FLOW-18/` | n8n, Zapier | Grammar 4 (Topology canvas) | Backend error visible to tenant; two equal primary CTAs |
| FLOW-20 | ads-auction | `13-finance.md` + deep research | Google Ads dashboard | Grammar 3 (Card list) | P0: "Failed to fetch" as normal state; T626 jargon |
| FLOW-22 | cms-publishing | `04-post-publishing.md` | Medium, Substack | Grammar 5 (Zero chrome article) | P1: sidebar visible on anonymous view |
| FLOW-24 | ai-safety-moderation | `docs/sessions/FLOW-24/` | Content moderation forms | Grammar 5 (Kiosk) + Grammar 3 (queue) | Banner; sidebar on anonymous reporter |
| FLOW-29 | adaptive-rag-deep-research | `docs/sessions/FLOW-29/` | Perplexity AI, Elicit | Grammar 4 (Topology) for admin; Grammar 5 (Search) for user | Canvas sidebar offset; colour-only states |
| FLOW-32 | sharable-flows | `32-sharable flows.md` | GitHub marketplace, npm | Grammar 3 (Card grid) | |
| FLOW-33 | system-initiation | `33-system initiation.md` | Docker setup, Vercel deploy | Grammar 1 (Progress strip) | |
| FLOW-35 | meta-arbitration | `docs/sessions/FLOW-35/` | GitHub PR review, code review | Grammar 2 (Verdict grid) | CRUD table — needs purpose-built UI |
| FLOW-36 | feature-registry | `docs/sessions/FLOW-36/` | Feature flag dashboards | Grammar 3 (Card list with state badge) | CRUD table — needs purpose-built UI |

---

## PART 6 — THE RUN STRUCTURE

Every examination run follows this exact structure. One flow per run.

```
RUN FOR FLOW-XX:

STEP A — Read spec (5 minutes, no code)
  1. Read: business flows/NN-flow-name.md (or STEP-1-INVARIANTS.md)
  2. Write one sentence: "This screen allows [WHO] to [DO WHAT]"
  3. List all roles that open this screen
  4. Identify the primary action (one verb)

STEP B — Read states (3 minutes, no code)
  1. Read: DESIGN-SIMULATION-R1.md OR deep research for the flow
  2. List: empty / loading / populated / error / success states
  3. Note: what changes between roles

STEP C — Examine the PNG (3 minutes, no code)
  1. Open the PNG
  2. Ask the 4 classification questions (Part 2, Step 3)
  3. Note the classification(s)
  4. Note which UI/UX skill checks fail

STEP D — Write the examination record (2 minutes)
  File: docs/screen-examination/{slug}-examination.md
  Content:
    - One-sentence spec (from Step A)
    - State list (from Step B)
    - Classification (from Step C)
    - Highest-severity finding
    - Real-world reference (from Part 1 Source 5 table)

STEP E — Resolve the highest-severity finding (one task only)
  - If NEEDS_PURPOSE_BUILT_UI: build the new page using the spec + states + reference
  - If NEEDS_ERROR_HANDLING: add error message + recovery action
  - If NEEDS_EMPTY_STATE: add empty state with explanation + CTA
  - If NEEDS_LABEL_SANITISATION: replace all technical strings
  - If NEEDS_ROLE_BRANCH: fix the RoleScopedView branch
  - If PASSES: skip to Step F

STEP F — Capture PNG evidence
  Run: Playwright spec for this flow
  Gate: PNG must show human-readable content for this role
  Gate: PNG must show at least one non-default state (use ?mock= param)

STEP G — Update examination record
  Add: before PNG path, after PNG path, resolution summary
```

---

## PART 7 — GLOBAL FIXES (run once, fix all screens)

These three fixes affect every screen. Run them FIRST, before any per-flow work.

**Global Fix 1 — Provider-keys banner (P0, affects ~90% of PNGs)**
```
The banner: "Missing provider keys: openai, gemini. DPO triples will be
MONO_MODEL_CALIBRATION. Configure keys ×"

Fix: Gate the banner component to platform-admin role only.
In the AppShell or root layout:
  {role === 'platform-admin' && <ProviderKeysBanner />}

After this fix: retake ALL PNGs. Many screens will pass Step 3 after
this single change that currently fail.
```

**Global Fix 2 — Active nav state (P2, affects all screens)**
```
The sidebar navigation has no active state on any screen.

Fix: Add active state CSS to the nav item whose route matches the current URL.
Use: NavLink with activeClassName, or check useLocation().pathname against
each nav item's href.

One CSS change:
  .nav-item.active { color: var(--brand); font-weight: 600; }
  .nav-item.active::before { content: ''; width: 3px; background: var(--brand); }
```

**Global Fix 3 — Anonymous screens remove sidebar (P1, affects ~6 screens)**
```
Screens: CMS anonymous, Blog anonymous, OSS Curriculum anonymous,
         AI Safety Moderation anonymous, Ticket Purchase anonymous,
         Event Registration anonymous

Fix: Wrap routing logic:
  const isPublicRoute = ['/blog', '/cms', '/report', '/events/:id/register',
                         '/tickets/:id'].some(pattern => matches(pattern, pathname))
  const isAnonymous = role === 'anonymous'
  
  return (isPublicRoute && isAnonymous)
    ? <PublicLayout>{children}</PublicLayout>
    : <AppShell>{children}</AppShell>

PublicLayout: no sidebar, no top navigation, full-width content, single clean header
with just the XIIGen wordmark.
```

---

## PART 8 — WHAT CLAUDE CODE MUST NOT DO

1. **Do not start any screen fix without reading the spec first.**
   The spec is in `business flows/` or `docs/sessions/FLOW-XX/`. Read it.
   30 seconds of reading prevents 2 hours of rebuilding the wrong thing.

2. **Do not use "clean and modern" as an aesthetic direction.**
   Every flow has a real-world reference platform (Part 1, Source 5 table).
   Use that platform's visual conventions as the baseline. Then make it
   distinctly XIIGen.

3. **Do not capture a PNG that shows an error or empty state as "done."**
   A PNG showing "Booking not found" or "$0.00" is not evidence the screen works.
   Use `?mock=` URL params to trigger a populated state before capturing.

4. **Do not fix more than one finding per run.**
   The run structure (Part 6) has one fix per run. This prevents compounding
   regressions and keeps each PNG cleanly attributable to one change.

5. **Do not rebuild a screen without checking if the empty state design exists.**
   Every screen must have an empty state. If the populated state looks perfect
   but the empty state shows a blank white rectangle — the screen is not done.

---

## END OF SCREEN EXAMINATION & REPAIR GUIDANCE
