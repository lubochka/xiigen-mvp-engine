# SCREEN EXAMINATION GUIDANCE — EXACT SPEC LOCATIONS
## For Claude Code — precise file paths, what each file answers, read order
## Supersedes the previous guidance document — this version has exact paths
## Date: 2026-04-20

---

## THE ANSWER TO LUBA'S POINT

The specs are not missing. They are in three distinct places in the repo and
in the uploaded zips. Claude Code was not told which file to read for each
question. This document maps every design question to the exact file that
answers it.

---

## THE COMPLETE SPEC LOCATION MAP

Every FLOW-XX has a folder at `docs/sessions/FLOW-XX/` in the repo.
The uploaded `FLOW_1-47_List_B.zip` contains the same files for reference.
The uploaded `business_flows.zip` contains the original product specs.

For each flow, these are the files that matter for UI design, in read order:

---

### FILE 1 — The user intent sentence
**Question answered:** "What is this flow for? In one sentence, what does the user accomplish?"

**Exact path (repo):**
```
docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md
```
**Exact path (zip):**
```
FLOW_1-47_List_B.zip / FLOW-XX / FLOW-XX-STEP-1-INVARIANTS.md
```

**Where inside the file:** Look for `user_intent:` in the INPUTS FROM STATE section.
This is the verbatim sentence that anchors every design decision for this flow.

**Example (FLOW-01):**
```
user_intent: "When a new user registers for the XIIGen community platform, verify
their email address before granting access, and deliver onboarding materials
including workspace setup, a first flow tutorial, and a community invitation."
```

**Read this first. Always. Before opening any PNG.**

---

### FILE 2 — The process list and states
**Question answered:** "What processes exist in this flow? What states can each
process be in? Which React components implement them?"

**Exact path (repo):**
```
docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md
```
**Exact path (zip):**
```
FLOW_1-47_List_B.zip / FLOW-XX / UI-REFLECTION-STATE.md
```

**What it contains:**
- Per-Process Verdict Table: every service + its UI state coverage
  (initiate / in_progress / result / error / next_step — Y or missing)
- Verdict per process: FULL_UI / PARTIAL_UI / NO_UI / INTERNAL_ONLY
- Exact React component file paths implementing each state
- Exact line numbers where each state is set
- E2E spec files that test each process

**How to use it:**
The verdict table tells you which states are MISSING from the current implementation.
A process showing `initiate: no` means the screen has no design for when the user
first arrives. That is an empty-state gap. Fix it.

**Example reading (FLOW-01):**
```
| processId                 | initiate | in_progress | result | error | next_step | verdict    |
|---------------------------|----------|-------------|--------|-------|-----------|------------|
| EmailVerificationService  | Y        | Y           | Y      | Y     | Y         | FULL_UI    |
| OnboardingDeliveryService | .        | Y           | Y      | Y     | n/a       | PARTIAL_UI |  ← missing initiate
| RegistrationService       | Y        | Y           | Y      | Y     | Y         | FULL_UI    |
```

Any `.` in the table = a missing state = a screen gap to fix.

---

### FILE 3 — The role-to-screen mapping
**Question answered:** "Which roles open this screen? What does each role see?
What actions are available per role?"

**Exact path (flowprep zip):**
```
FLOW-PREP-LIBRARY-MASTER-PLAN.zip / FLOW-ROLE-ANALYSIS-RUN[N]-FLOW[XX]-[YY].md
```

The runs cover:
```
FLOW-ROLE-ANALYSIS-RUN1-FLOW01-05.md  → FLOW-01 through FLOW-05
FLOW-ROLE-ANALYSIS-RUN2-FLOW06-10.md  → FLOW-06 through FLOW-10
FLOW-ROLE-ANALYSIS-RUN3-FLOW11-16.md  → FLOW-11 through FLOW-16
FLOW-ROLE-ANALYSIS-RUN4-FLOW17-21.md  → FLOW-17 through FLOW-21
FLOW-ROLE-ANALYSIS-RUN5-FLOW22-26.md  → FLOW-22 through FLOW-26
FLOW-ROLE-ANALYSIS-RUN7-FLOW32-34.md  → FLOW-32 through FLOW-34
FLOW-ROLE-ANALYSIS-RUN8-FLOW35-47.md  → FLOW-35 through FLOW-47
```

**Also:** `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` in the same zip —
contains the complete 144-role taxonomy, all 8 layers, 5 structural templates.
This is the AUTHORITATIVE role reference for the entire platform.

**How to use it:**
Find the section for FLOW-XX. Read the Role-visibility matrix (the ✅/🚫 table).
This tells Claude Code exactly which roles can see each screen and what they see.

---

### FILE 4 — The original product intent and business logic
**Question answered:** "What does this flow mean to the business? What user
journey does it represent? What are the success criteria?"

**Exact path (business flows zip):**
```
business_flows.zip / NN-flow-name.md
```

The files and their flows:
```
01-user-registration.md              → FLOW-01
02-business-onboarding.md            → FLOW-02
03-event-creation-promotion.md       → FLOW-03
04-post-publishing.md                → FLOW-04  (also covers FLOW-07 feed)
05-lesson-completion-gamification.md → FLOW-05
06-marketplace-publishing.md         → FLOW-06
07-friend-request-feed-integration.md → FLOW-07
09-event-participation.md            → FLOW-09
10-shops modules.md                  → FLOW-10
11-social network modules.md         → FLOW-11
12 - ERP systems.md                  → FLOW-12
13 - finance.md                      → FLOW-13
...
32-sharable flows.md                 → FLOW-32
33-system initiation.md              → FLOW-33
34-translate to alternatives.md      → FLOW-34
```

**Also:** `Small Business Networking App - Functional Specifications & Architecture.docx`
and `umls.md` — the master UML diagrams showing every user journey.

**What section to read:**
- `## Long Description` → business context for the PM question
- `### For Product Manager` → conversion goals, success metrics
- `### For AI / Code Generation` → exact service names, events, data stores

**FLOW-35 through FLOW-47 have no entry in this zip.** For those flows,
use FILE 2 (UI-REFLECTION-STATE.md) and FILE 5 (DESIGN-SIMULATION) instead.

---

### FILE 5 — The end-to-end user walkthrough
**Question answered:** "What does the user experience feel like from start to
finish? What decisions do they make at each step?"

**Exact path (repo):**
```
docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md
```
**Exact path (zip):**
```
FLOW_1-47_List_B.zip / FLOW-XX / FLOW-XX-DESIGN-SIMULATION-R1.md
```
*(Not all flows have this file — check first)*

**What it contains:** A simulation of the user journey through the flow —
what the user sees, what they decide, what happens next. This is the
"screenplay" of the flow. It tells Claude Code what the screen should
FEEL like at each step.

---

### FILE 6 — What's actually built vs designed
**Question answered:** "What is the current implementation state? Are there
gaps between the design spec and what the code does?"

**Exact path (repo):**
```
docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md
```
**Exact path (zip):**
```
FLOW_1-47_List_B.zip / FLOW-XX / FLOW-XX-RECONCILIATION-STATE.md
```

**What it contains:** A line-by-line audit of the IMPL-STATE claims vs.
actual codebase state. Discrepancy list with BLOCKING/SIGNIFICANT/MINOR
severity tags. The `## Top-line verdict` field gives the current status:
RECONCILED / RECONCILED_WITH_CAVEATS / DEMONSTRABLY_WRONG.

**How to use it:** If the verdict is DEMONSTRABLY_WRONG, the existing
implementation does not match the spec. Do not base UI design on the
existing components — base it on the spec (Files 1-5). The mismatch is
the root cause of screens that show the wrong content.

---

## THE READ ORDER FOR EVERY EXAMINATION RUN

Before opening any PNG, read these files in this order:

```
Step 1 — Read FILE 1 (STEP-1-INVARIANTS.md)
         Extract: user_intent sentence (verbatim)
         Time: 1 minute

Step 2 — Read FILE 3 (ROLE-ANALYSIS-RUN[N].md for this flow's batch)
         Extract: role-visibility matrix (which roles, which screens)
         Also read: XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md Section 1
         for the role's layer and description if unfamiliar
         Time: 2 minutes

Step 3 — Read FILE 2 (UI-REFLECTION-STATE.md)
         Extract: per-process state table, identify any '.' entries (missing states)
         Extract: React component file paths for each process
         Time: 2 minutes

Step 4 — Read FILE 4 (business_flows / NN-flow-name.md)
         Extract: Long Description + For Product Manager section
         Skip if FLOW-35 through FLOW-47 (no entry in this zip)
         Time: 2 minutes

Step 5 — Open the PNG
         Apply the 4 classification questions (NEEDS_PURPOSE_BUILT_UI /
         NEEDS_EMPTY_STATE / NEEDS_LABEL_SANITISATION / NEEDS_ROLE_BRANCH)
         Time: 1 minute

Total reading time before touching code: ~8 minutes per flow.
This is not optional. Skipping this reading is what produced the
CRUD tables and empty states in the first place.
```

---

## THE UI/UX SKILL APPLICATION ORDER

After reading the spec files, apply the four skills in this order:

```
SKILL 1 — impeccable (critique mode)
  Apply first because it catches P0 blocking issues.
  Run Nielsen H1, H2, H9 specifically.
  H1=0 or H2=0 means the screen has engineering jargon or no system status.
  H9=0 means there is an error with no recovery path.
  Fix P0 issues before applying any other skill.

SKILL 2 — ui-ux-pro-max
  Apply second because it catches accessibility failures.
  Run P1 (color-not-only, aria-labels, form-labels) — these are blocking.
  Run P9 (nav-state-active, drawer-usage for anonymous screens).
  P1 failures must be fixed before any visual design work.

SKILL 3 — design-for-ai (CHECKER mode)
  Apply third to catch identity and aesthetic failures.
  Run the Detection Checklist (10 tells).
  This informs what the rebuilt screen should NOT look like.
  Do not apply design-for-ai recommendations until P0/P1 bugs are fixed.

SKILL 4 — interface-design (critique mode)
  Apply last. Answer the three Intent First questions using the
  spec files (Files 1-4) as the source of truth.
  Who → from FILE 3 role analysis
  What → from FILE 1 user_intent
  Feel → from FILE 4 business spec + real-world reference (table below)
```

---

## THE DESIGN DECISION FALLBACK (when specs don't prescribe UI)

The specs define WHAT the flow does. They do not always prescribe HOW
a screen should look. When the spec is silent on a specific UI pattern,
use the closest well-known platform as the reference:

| Flow | Domain | Reference platform | Key UI conventions |
|------|--------|-------------------|--------------------|
| FLOW-01 | Registration / onboarding | Airbnb signup, Linear onboarding | SSO buttons stack above email form. One field per visual group. Progress indicator after registration. First-load dashboard shows personalised suggestions, not empty state. |
| FLOW-02 | Profile questionnaire | Typeform, LinkedIn setup | Step indicator top or side. One question group per screen. Skip option always secondary. Progress bar shows completion. |
| FLOW-03 | Event creation + promotion | Eventbrite create event | Multi-step wizard: Details → Tickets → Promotion → Publish. Right panel shows live preview. Match score / audience prediction shown after publish. |
| FLOW-04 | Social feed / posts | Twitter/X, LinkedIn feed | Card per post. Author avatar + name + timestamp in top-left. Like / comment / share row at card bottom. Feed is infinite scroll. Author sees edit/delete; reader sees share/report. |
| FLOW-05 | Lesson completion / gamification | Duolingo, Khan Academy | Full-screen completion moment. Animated badge or XP reveal. Streak counter. Next lesson CTA is the dominant action. Admin view: cohort completion rate chart. |
| FLOW-06 | Marketplace / gig listing | Etsy, Upwork browse | Card grid. Price prominent top-right of card. Seller rating stars. Category filters left sidebar. "Post a gig" CTA top-right for sellers. |
| FLOW-07 | Friend requests / social graph | LinkedIn connections | "People you may know" row. Mutual connections shown on profile. Pending requests badge on nav icon. Connect/Message buttons on profile. |
| FLOW-09 | Event booking / attendance | Eventbrite checkout, Airbnb | Capacity bar showing seats remaining. Ticket type selector with price. Order summary sidebar. QR code on confirmation. |
| FLOW-10 | Shop / commerce | Shopify storefront, Etsy shop | Product grid with thumbnail, name, price. Product detail with Add to cart. Cart with quantity adjusters. |
| FLOW-11 | Social network | Instagram, Twitter/X | Profile header: avatar, name, bio, stats (posts/followers/following). Post grid. Follow/Message buttons. |
| FLOW-12 | Billing / invoices | Stripe billing portal, Paddle | Current plan card at top. Invoice list with PAID/FAILED/VOIDED badges. Retry action on FAILED. Download PDF per invoice. |
| FLOW-13 | Finance / analytics | QuickBooks summary | Revenue vs expense chart. Period selector (30d / 90d / YTD). Recent transactions list. Export button. |
| FLOW-16 | Checkout / payment | Stripe checkout | Left: order summary with item, quantity, price. Right: payment form. Single "Pay $X" button. Trust indicators below form. |
| FLOW-17 | Freelancer gigs | Upwork, Fiverr | Gig card: title, price range, bid count, "Place bid" CTA. Freelancer profile: skills, rating, portfolio. Active gig: milestone timeline. |
| FLOW-18 | Visual flow builder | n8n, Zapier | Three-column: node palette | canvas | assistant/properties. Dotted canvas background. Node palette shows type + data type. Canvas has zoom controls. |
| FLOW-20 | Ads / auction | Google Ads dashboard | Campaign cards with status badge. Budget consumed bar. CTR / impressions chart. Bid amount editable inline. |
| FLOW-22 | CMS / blog public | Medium, Substack | Zero chrome for anonymous reader. Article title as h1. Author + date + read time. Continue reading → full article. Subscribe email form at bottom. |
| FLOW-24 | Content moderation | Trust & Safety forms | Anonymous report: category tiles + reason textarea + submit. Moderator: report queue with preview card + Keep/Remove/Escalate. |
| FLOW-29 | Deep research | Perplexity AI, Elicit | Search input prominent. Source cards with citation. Synthesised answer with numbered references. Budget/time consumed indicator. |
| FLOW-32 | Sharable flows marketplace | GitHub marketplace, npm | Template cards: name, description, install count, version badge. Install button. Rating. |
| FLOW-33 | System bootstrap | Vercel deploy, Docker setup | Progress strip: Cold → Seeding → Indices ready → Warm. Each step with status chip. Log output expandable. |
| FLOW-35 | Meta arbitration | GitHub PR review | Pending conflicts list. Per-conflict: arbiter grid with APPROVED/REJECTED/NEEDS_REVISION per cell. Consensus result. Approve / Override / Escalate actions. |
| FLOW-36 | Feature registry | LaunchDarkly, Split.io | Feature flag cards: name, porting status badge, source → target arrow, simulator verdict. Decision actions per card. |

**Rule for using this table:** If the spec (Files 1-4) defines the UI pattern,
follow the spec. Use this table only for details the spec is silent on (spacing,
card layout, button hierarchy, empty state copy).

---

## THE COMPLETE FILE MAP — ONE TABLE

For every question a screen raises, the exact file that answers it:

| Question | File to read | Exact path in repo |
|----------|--------------|--------------------|
| What does this flow do? | STEP-1-INVARIANTS.md | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` |
| Which roles open this screen? | ROLE-ANALYSIS-RUN[N].md | `FLOW-PREP-LIBRARY-MASTER-PLAN.zip / FLOW-ROLE-ANALYSIS-RUN[N]-FLOW[XX]-[YY].md` |
| What states does each process have? | UI-REFLECTION-STATE.md | `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` |
| Which React components exist already? | UI-REFLECTION-STATE.md | Same file — `React components:` field per process |
| What states are missing from the UI? | UI-REFLECTION-STATE.md | Same file — look for `.` (dot) in the state columns |
| What is the business intent? | business_flows / NN-flow-name.md | `business_flows.zip / NN-flow-name.md` → Long Description |
| What does the user journey feel like? | DESIGN-SIMULATION-R1.md | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` |
| What is currently built vs designed? | RECONCILIATION-STATE.md | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` |
| What are the complete role definitions? | ROLE-SCREEN-ARCHITECTURE-GUIDE | `FLOW-PREP-LIBRARY-MASTER-PLAN.zip / XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` |
| What does the Playwright spec test? | UI-REFLECTION-STATE.md | Same file — `E2E tests:` field per process |
| What is the real-world UI reference? | This document | Part 5 table above — fallback only |

---

## END OF SPEC LOCATION GUIDANCE
