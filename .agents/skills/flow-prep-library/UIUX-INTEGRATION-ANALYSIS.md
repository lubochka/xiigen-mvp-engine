# UI/UX SKILLS INTEGRATION — HOW THEY FIT INTO THE FLOW PREPARATION GUIDE
## Analysis of 17 uploaded resources and their integration into flow prep guidance
## Date: 2026-04-20

---

## THE DIAGNOSIS (read this first)

All 17 uploaded resources converge on the same finding, stated most precisely in
THIRD-EXAMINATION-STRUCTURAL-GAPS.md:

> **The architecture has two completely separate question vocabularies that never
> talk to each other.**

**Vocabulary A — engine design (every existing document):**
What does this flow DO? What events does it emit? What arbiters validate it?
What DNA patterns apply?

**Vocabulary B — product design (absent from every existing document):**
Who opens this screen? What is the user trying to accomplish? What does the
screen grammar need to be?

The result: 18 flows shipped as generic admin CRUD tables. The CRUD tables had
correct role tiers, correct routes, passing Gate 0m. They failed the user entirely
because the user's intent was never asked. The specs existed. They were never read.

---

## WHAT THE 17 RESOURCES ARE AND WHAT EACH PROVIDES

### The Four External Skill Libraries

**1. interface-design** (interface-design-main.zip)
Domain exploration → signature → grammar → token vocabulary protocol.
Provides the *pre-JSX design direction discipline* — domain concepts, color world,
signature element, defaults to reject, CSS token names derived from domain vocabulary.
Prevents AI slop by requiring an aesthetic direction statement before any component
is written. Fires once per flow, before the first React page.

**2. impeccable** (impeccable-main.zip)
Nielsen's 10 heuristics (P0-P3 severity), cognitive load checklist, four-persona
testing (Jordan/Sam/Riley/Alex — each with different technical background and goal).
Provides the *post-build structured critique* — confirms that a completed screen
works for real users, not just technically compiles. Fires in Phase 7 after PNGs
are captured.

**3. design-for-ai** (design-for-ai-main.zip)
10 AI-tell detection checklist + Design for Hackers principles (typography,
proportion, composition, color hierarchy). CHECKER mode for auditing existing PNGs.
Provides the *"is this AI slop?" test*. If the XIIGen screens today score 10/10
confirmed tells (which they do — see IMPECCABLE-CRITIQUE.md), this skill names
exactly which tells to remove. Fires in Phase 7 Step 5.

**4. ui-ux-pro-max** (ui-ux-pro-max-skill-main.zip)
10 priority categories (P1/P2 = CRITICAL = blocking). Accessibility, touch targets,
forms, navigation. Already partially registered as SK-539 but not yet wired to
the pre-design phase. Provides the *compliance checklist* that runs alongside
impeccable in Phase 7.

### The Assessment Documents

**5. IMPECCABLE-CRITIQUE.md**
Running impeccable against the XIIGen PNG set. Result: **11/40 on Nielsen's
10 heuristics (CRITICAL)**. 10 confirmed AI design tells. Every heuristic failed
at score 1 or 0. The billing Retry Now button is the only passing element in the
entire fleet. This document establishes the severity of the current state.

**6. INTERFACE-DESIGN-CRITIQUE.md**
Applies the interface-design "three questions" (Who / What must they accomplish /
What should this feel like) to XIIGen. Four real user personas identified: the
ML-ops engineer at 2am, the tenant-admin retrying a failed payment, the anonymous
reporter, the freelancer browsing gigs. These four people are treated identically
by the current interface — same sidebar, same surface treatment. No aesthetic
direction was ever stated for XIIGen. This is the root cause.

**7. DESIGN-FOR-AI-CHECKER-ASSESSMENT.md**
AI slop test on XIIGen: FAIL immediately. "If I told someone AI made this, would
they believe me immediately? Yes. Immediately." No aesthetic direction stated.
Cyan-on-dark palette, identical card grids, side-stripe borders, gradient text,
hero metric template — all confirmed. This is not a polish problem; it is a
missing design intent problem.

**8. UIUX-PROMAX-SKILL-ASSESSMENT.md**
Applied P1-P9 to every XIIGen PNG. Critical failures: provider-keys engineering
banner on ALL screens including public anonymous pages (P4 style CRITICAL), no
`min-h-[44px]` on touch targets (P2), heading hierarchy violations (h1 → h3 with
no h2), no active nav state on any screen, no skip-to-main-content link.

### The Governance Plans

**9. UIUX-WISDOM-PHASED-PLAN.md**
8-phase plan to close CFI-10 (no session doc instructs Claude Code to read the
business spec before designing React pages). Adds Q8 to AUTHORING-GUIDE, Q10 to
ARCHITECT-GUIDE, Signal 13 to DESIGN-REVIEW-PROTOCOL, Gate 0g business-intent
sub-check to CODE-REVIEW-PROTOCOL, Rule 35 to AUTHORING-GUIDE, CFI-10 closed in
SESSION-LOAD-PLAN v31.

**10. EXTERNAL-SKILLS-INTEGRATION-PLAN.md**
7-phase plan to wire the four skill libraries into XIIGen governance. Creates SK-540
(product design context wrapper), SK-541 (screen craft audit wrapper), business
flows registry. Registers them in HOW-TO-USE-SKILLS, SESSION-LOAD-PLAN, SK-539.

**11. XIIGEN-UIUX-INTEGRATED-PLAN.md**
The combined 13-phase plan merging both of the above plus screen-examination.zip
corrections. This is the authoritative document. It adds SK-542 (flow UI examination
protocol) and identifies two additional grammar types (G6 Dashboard, G7 Settings
Tabs) that the 5-grammar model missed.

### The Examination System

**12. THIRD-EXAMINATION-STRUCTURAL-GAPS.md**
Root cause analysis of why 18 flows shipped CRUD tables. Seven specific structural
gaps identified, each with minimum precise text to close them. Key: the gap is
upstream — the architecture has strong post-build checks and zero pre-build guidance.

**13. XIIGEN-UIUX-WISDOM-GAP-ANALYSIS.md**
Five gaps in priority order. GAP 1 is the critical one: "No instruction to read
the business spec before designing a screen." Root cause of 90% of PNG failures.

**14. SCREEN-EXAMINATION-REPAIR-GUIDANCE.md**
6-source read order for any flow, complete examination protocol. This is what
Claude Code reads to know where to find the spec for any given screen.

**15. SPEC-LOCATION-MAP.md**
Exact file paths per flow. Answers "which file do I open for the user intent of
FLOW-XX?" with shell commands.

**16. SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md**
Corrections for FLOW-36..45 (the Potemkin UI batch). CFI-05 clarification: FLOW-45
was the only truly route-less flow. FLOW-36..40 have routes but their Page wrappers
default to AdminCrudPanel despite purpose-built screens existing as orphaned
components. This is a Page rewrite problem, not a routing problem.

**17. screen-examination.zip (53 files)**
38 per-flow examination files, MARKET-REFERENCE-CATALOG.md (per-grammar real-world
references), PNG-INVENTORY.md (per-PNG verdicts), SPEC-LOCATION-INDEX.md,
REPAIR-GUIDANCE.md, RUN-67-DELETE-MANIFEST.md. This is already the ground truth
for 38 flows. It makes SK-540 redundant for those flows — the examination is done.

---

## HOW THEY ALL FIT TOGETHER

The integration works as a **three-stage pipeline**. Every flow preparation session
passes through all three stages. Currently only Stage 3 exists. Stages 1 and 2 are
entirely missing.

```
STAGE 1 — BEFORE DESIGN (pre-JSX)          [currently missing]
  "What is this screen for and who uses it?"
  ├── Read business spec (SPEC-LOCATION-MAP order)
  ├── Check for existing examination file (screen-examination/{slug}-examination.md)
  ├── Declare WHO / VERB / GRAMMAR (Q8 / Q10)
  └── Write .impeccable.md design context (SK-540 / interface-design skill)

STAGE 2 — DURING DESIGN (build time)        [partially exists - SK-539 Sections 1-9]
  "Build the right screen the right way"
  ├── Use declared grammar (G1-G7 from MARKET-REFERENCE-CATALOG)
  ├── Apply role-visibility matrix (B-50 from flow prep library)
  └── Follow SK-539 checks (29 UX rules)

STAGE 3 — AFTER DESIGN (Phase 7)           [exists but incomplete]
  "Confirm it actually works for real users"
  ├── Run SK-541 (screen craft audit — 4 layers)
  │   ├── Layer 1: ui-ux-pro-max P1/P2 accessibility
  │   ├── Layer 2: design-for-ai 10-tell detection
  │   ├── Layer 3: impeccable H1/H2/H8/H9 spot check
  │   └── Layer 4: grammar verification vs .impeccable.md
  └── Produce FC-18 Audit Trail
```

---

## THE 13 NEW FILES TO ADD TO THE FLOW PREP GUIDANCE

The XIIGEN-UIUX-INTEGRATED-PLAN.md specifies exactly what to produce. Here is
the mapping of each new file to its role in the flow prep pipeline:

### New Skills (3 wrappers)

**SK-542 — flow-ui-examination-protocol-SKILL.md** (load order: 5.3, before SK-540)
The entry point for any flow that already has examination data. Checks
`docs/screen-examination/{slug}-examination.md` first. If it exists, uses it as
ground truth instead of re-deriving the grammar type and user intent. If it doesn't
exist, runs the examination protocol from REPAIR-GUIDANCE.md.
*Why it goes first: 38 of 48 flows already have examination files. Re-deriving
what was already examined wastes time and risks inconsistency.*

**SK-540 — planning--product-design-context-SKILL.md** (load order: 5.4)
Wraps interface-design domain exploration + impeccable `teach` mode. Fires when
`.impeccable.md` does not exist for the flow. Produces the design context file
at `docs/design-context/{slug}/.impeccable.md`. Steps: read business spec (Q8/Q10
sources) → domain exploration (5+ concepts, color world, signature, defaults to
reject) → write .impeccable.md → verify. If SK-542 already found an examination
file, SK-540 reads it and extracts the grammar type directly rather than re-deriving.
*Why it matters: this is the only gate between "reading the spec" and "writing JSX."
Without it, the developer knows what the engine does but not what the user wants.*

**SK-541 — planning--screen-craft-audit-SKILL.md** (runs at Phase 7 Step 5)
Wraps impeccable critique + design-for-ai CHECKER + ui-ux-pro-max into a 4-layer
audit protocol. Produces one record per page: Layer 1 accessibility (P1/P2 CRITICAL),
Layer 2 AI slop score (0-10 tells), Layer 3 Nielsen H1/H2/H8/H9, Layer 4 grammar
verification vs .impeccable.md. Output feeds FC-18 Audit Trail.
*Why it matters: the current Phase 7 has compliance checks (SK-539 29 rules) but
no design quality checks. A page can pass all 29 SK-539 rules and still score
11/40 on Nielsen heuristics.*

### New Reference Document

**planning--business-flows-registry.md** (no SK number — lookup table)
Maps all 48 flows to: spec file path, role analysis batch, user intent summary,
UI grammar type (G1-G7). The single document Claude Code reads to answer "which
file do I open for FLOW-XX's user intent?" Referenced by SK-539 Section 0, SK-540
Step 1, Q8, Q10, Q-08 in orientation map.
*Why it matters: without this registry, every session has to re-derive the file
path. With it, "FLOW-36, role analysis: RUN8, grammar: G3 CARD_LIST" is a lookup.*

### Updated Governance Documents (8 version bumps)

| Document | Change | Why |
|---------|--------|-----|
| SK-539 v1.1.0 | Section 0 added: examination record check + 6-file read order + 7 grammar types. UX-06 → BLOCK for tenant/public. UX-06b added (PNG must show populated state). UX-30 added (CRUD table = BLOCK for TENANT_CONSUMER/PUBLIC). | Section 0 is the bridge that connects Vocabulary A (engine design) to Vocabulary B (product design) — it makes the spec-read mandatory before any compliance check runs. |
| FC-18 gate v1.1.0 | FM-5 extended: 3 pre-creation steps (read UI-REFLECTION-STATE, run SK-542+SK-540, declare grammar). FM-6 added: wrong grammar for tenant-facing page. | A page can pass FM-1..FM-5 (route exists, component exists, Audit Trail exists) and still fail the user if the grammar is wrong. FM-6 closes this gap. |
| ORIENTATION-MAP v1.3 | Q-08 updated: examination record + 6-file order. Q-23: route gate. Q-24: job-to-be-done. Q-25: design context check. Q-26: grammar verification. | The orientation map is what Claude Code reads when it first opens a flow. Without these questions, it never learns what the user wants. |
| DESIGN-REVIEW-PROTOCOL v1.5 | Signal 13: grammar correctness for tenant-facing pages. Fleet-level interpretation: >3 flows MISSING = whole wave re-reads SK-539 Section 0. | Signal 13 is the fleet-level detector. Without it, per-page failures are invisible at the wave/batch level. |
| CODE-REVIEW-PROTOCOL v1.8 | Gate 0g extended: 4 sub-checks (examination record, user intent source, role-visibility source, grammar declaration). | Gate 0g currently only requires PNG evidence. It needs to require that the design was grounded in the spec before the implementation began. |
| AUTHORING-GUIDE v1.16 | Q8 added (WHO/VERB/GRAMMAR before JSX). SCREEN INTENT SERVED in completion gate. Rule 35 (Screen Intent Anchor). | Q8 is the authoring-time enforcement. Without Q8, a session can produce React pages without ever answering "who is this for?" |
| ARCHITECT-GUIDE v1.8 | Q10 added (same as Q8 but in architect context). Mistake 23 (FLOW-36 concrete example of building without reading spec). | Mistake 23 is pedagogically essential — it shows exactly what goes wrong when Q10 is skipped, with real evidence from FLOW-36. |
| SESSION-LOAD-PLAN v31 | Registers SK-540, SK-541, SK-542. CFI-10 CLOSED. CFI-11 OPEN (repo setup). CFI-12 OPEN (3 spec gaps). | The load plan is the authoritative registry. Without registration here, the new skills don't exist for Claude Code. |

---

## HOW THIS INTEGRATES INTO THE EXISTING FLOW PREP LIBRARY

The flow prep library (GUIDE-B01..B50) already handles stages 2 and 3 well.
The gap is in stage 1. The integration adds stage 1 as a mandatory prerequisite
for Phase 7 (the role-enriched files B45-B50).

**Existing flow prep library (GUIDE-B01..B50) — what stays unchanged:**
All 50 guidance files remain correct. Their generation order (B50 → B46 → B47 →
B48 → B45 → B49) is still correct. The 5 failure patterns (FP-1..FP-5) and their
prevention guidance are still correct.

**What the UI/UX integration adds to the flow prep library:**

```
BEFORE generating GUIDE-B46 (client screens):
  NEW: Check screen-examination/{slug}-examination.md (SK-542)
  NEW: If no examination file: run SK-540 (domain exploration → .impeccable.md)
  NEW: Read .impeccable.md grammar type → use it for B-46 screen specs

BEFORE generating GUIDE-B47 (UI state map):
  NEW: For each state, check MARKET-REFERENCE-CATALOG.md §{grammar-section}
       to confirm how the reference platform renders that state

BEFORE generating GUIDE-B48 (UX audit):
  NEW: Add SK-541 audit results (4 layers) to the UX audit output
       Layer 2 (AI slop) and Layer 3 (Nielsen) are new — SK-539 didn't cover them

BEFORE generating GUIDE-B50 (role-screen matrix):
  NEW: Check planning--business-flows-registry.md for the flow's grammar type
       The registry pre-declares the grammar — B-50 should reference it
```

In the `prompt-to-claude.md` the integration adds one sentence to the Phase 7 block:

```
Before generating B-50 / B-46 / B-47 / B-48:
1. Check docs/screen-examination/{slug}-examination.md (SK-542)
   If file exists: use it as ground truth for grammar type and user intent.
   If not: run SK-540 (interface-design domain exploration → .impeccable.md).
2. Read planning--business-flows-registry.md to confirm grammar type (G1-G7).
3. Generate B-50, B-46, B-47, B-48 using the declared grammar.
4. In B-48 (UX audit): run SK-541 4-layer audit in addition to SK-539 checks.
```

---

## THE 7 UI GRAMMAR TYPES — THE KEY ADDITION

The existing flow prep library uses 5 grammar types. The screen-examination.zip
and MARKET-REFERENCE-CATALOG.md correct this to 7:

| ID | Grammar | Real-world reference | XIIGen flows |
|----|---------|---------------------|-------------|
| G1 | Progress Strip | Vercel deploy, GitHub Actions, Docker Desktop | FLOW-00, 11, 14, 19, 33, 39, 45, 46, 47 |
| G2 | Verdict Grid | Linear review, Figma comment matrix, PR diff | FLOW-24(mod), 25, 27, 35, 37 |
| G3 | Card List + State Badge | Trello, Linear issues, Stripe invoice list | FLOW-06..08, 10, 12, 16, 17, 20, 28, 32, 36, 40, 46 |
| G4 | Topology Canvas | n8n, Zapier, Retool workflow editor | FLOW-18, 26, 29, 34 |
| G5 | Kiosk / Single Action | Stripe Checkout, Typeform one-question | FLOW-01..05, 09, 22, 24(report) |
| G6 | Dashboard (G3 + chart) | Stripe Dashboard, Mixpanel, Datadog | FLOW-13, 20(admin), 30, 31, 38, 39 |
| G7 | Settings Tabs (G3 + form) | Notion settings, Vercel project settings | FLOW-15, 21, 23, 48 |

G6 and G7 were missing from the original library. This matters because generating
GUIDE-B46 (client screens) for FLOW-38 (RAG quality feedback) without knowing it's
G6 (Dashboard) — not G3 (Card List) — produces the wrong screen specification.

---

## WHAT NEEDS TO HAPPEN (IN ORDER)

### One-time repo setup (CFI-11 — MAINTENANCE session)
Four things that only need to happen once before any of the new skills can work:
1. Copy `docs/business-flows/*.md` from business_flows.zip (FLOW-01..34)
2. Copy `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` (10 batch files)
3. Copy `docs/screen-examination/` contents from screen-examination.zip (53 files)
4. Commit SK-540, SK-541, SK-542 skill files to `.claude/skills/`

Until CFI-11 is done: SK-540/541/542 load but their companion doc paths return empty.

### Three blocked flows (CFI-12 — Luba's decision required)
FLOW-04, FLOW-09, FLOW-34 have spec mismatches between F1 and the actual
implementation. The examination files exist; the specs don't agree with the code.
No UI design work on these three flows until the spec direction is confirmed.

### What the updated prompt-to-claude.md should say
See the addition described in the integration section above. The addition is
small — one block before Phase 7 — but closes the gap that caused 18 CRUD tables.

---

## SUMMARY TABLE — EVERY RESOURCE AND WHERE IT GOES

| Resource | Type | Integrates into | When it fires |
|---------|------|----------------|--------------|
| interface-design skill | External skill library | SK-540 wrapper | Before first JSX per flow |
| impeccable skill | External skill library | SK-541 Layer 3 (Nielsen) + SK-540 teach mode | Phase 7 Step 5 |
| design-for-ai skill | External skill library | SK-541 Layer 2 (AI slop detection) | Phase 7 Step 5 |
| ui-ux-pro-max skill | External skill library | SK-541 Layer 1 (P1/P2 accessibility) | Phase 7 Step 5 |
| IMPECCABLE-CRITIQUE.md | Evidence document | Justifies SK-541 Layer 3 severity thresholds | Reference only |
| INTERFACE-DESIGN-CRITIQUE.md | Evidence document | Justifies SK-540 domain exploration requirement | Reference only |
| DESIGN-FOR-AI-CHECKER-ASSESSMENT.md | Evidence document | Establishes 10-tell detection baseline for SK-541 Layer 2 | Reference only |
| UIUX-PROMAX-SKILL-ASSESSMENT.md | Evidence document | Documents P1-P9 fleet failures; justifies P1/P2 CRITICAL | Reference only |
| UIUX-WISDOM-PHASED-PLAN.md | Governance plan (8 phases) | Absorbed by XIIGEN-UIUX-INTEGRATED-PLAN.md | Superseded |
| EXTERNAL-SKILLS-INTEGRATION-PLAN.md | Governance plan (7 phases) | Absorbed by XIIGEN-UIUX-INTEGRATED-PLAN.md | Superseded |
| XIIGEN-UIUX-INTEGRATED-PLAN.md | Master 13-phase plan | Everything above — authoritative | Execute this |
| THIRD-EXAMINATION-STRUCTURAL-GAPS.md | Root cause analysis | Justifies Q8, Q10, Rule 35, Gate 0g sub-check | Reference only |
| XIIGEN-UIUX-WISDOM-GAP-ANALYSIS.md | Gap analysis | Confirms 5 gaps, all closed by integrated plan | Reference only |
| SCREEN-EXAMINATION-REPAIR-GUIDANCE.md | Protocol document | SK-542 references it | Goes into docs/screen-examination/ |
| SPEC-LOCATION-MAP.md | Reference document | SK-542, Q-08, business-flows-registry | Goes into docs/screen-examination/ |
| SPEC-LOCATION-MAP-ADDENDUM-FLOW36-45.md | Reference document | CFI-05 rewrite, SK-542 for FLOW-36..45 | Goes into docs/screen-examination/ |
| screen-examination.zip (53 files) | Ground truth data | SK-542 (38 examination files), SK-541 (MARKET-REFERENCE-CATALOG), planning--business-flows-registry (grammar column) | Goes into docs/screen-examination/ |

---

## THE BOTTOM LINE

The flow prep library (GUIDE-B01..B50) already answers "how do I generate every
List B file correctly?" The 17 uploaded resources answer a prior question: "how
does Claude Code know what the screen is supposed to be before it generates anything?"

The two systems need to work together:
- Flow prep library → generates the right documentation for each file type
- UI/UX integration → ensures the content of those files reflects actual user intent

Without the UI/UX integration: GUIDE-B46 produces screen specs for whatever
Claude Code guesses the screen should be (usually a CRUD table).
With the UI/UX integration: GUIDE-B46 produces screen specs for the grammar type
the business spec demands — because SK-542 or SK-540 declared it before B-46 ran.

The updated `prompt-to-claude.md` and a new `flow-preparation-guidance-v2.zip`
should add the 4 new files (SK-540, SK-541, SK-542, business-flows-registry) and
the screen-examination.zip contents as mandatory pre-Phase-7 reading.

---

*UIUX-INTEGRATION-ANALYSIS.md — 2026-04-20*
*Based on: 4 external skill zips + 4 assessment docs + 3 governance plans + 6 examination docs*
