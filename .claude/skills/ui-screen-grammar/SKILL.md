---
name: ui-screen-grammar
version: "1.0.0"
sk_number: SK-561
priority: MANDATORY
load_order: 5.45
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript"]
contexts: ["web-session", "claude-code"]
description: >
  The standalone catalogue of the seven screen grammars (G1 PROGRESS_STRIP,
  G2 VERDICT_GRID, G3 CARD_LIST, G4 TOPOLOGY_CANVAS, G5 KIOSK, G6 DASHBOARD,
  G7 SETTINGS_TABS) with a Pre-Code Declaration gate and a Grammar Violation
  Signals table, mapped to React page templates. One page = one grammar,
  declared in writing before any JSX.
triggers:
  - "screen grammar"
  - "grammar type"
  - "pre-code declaration"
  - "G1"
  - "G2"
  - "G3"
  - "G4"
  - "G5"
  - "G6"
  - "G7"
  - "violation signals"
---

# SK-561 UI Screen Grammar — Declare one of seven before any JSX (React)

Before a control is written, a page must commit to **one** screen grammar and
record *why not the others*. This skill is the standalone catalogue of the seven
grammars plus the Pre-Code Declaration gate and the Violation Signals table.

## Why this skill exists (the gap it closes)

The seven grammar *types* already appear inside SK-539 §0.3 as a lookup table,
and SK-550 uses the word "grammar" inside its examination cells. But mvp had **no
separate skill that (a) catalogues all seven as React page templates, (b) forces
a Pre-Code Declaration ("why NOT G2?") before JSX, and (c) lists Grammar
Violation Signals**. Without that, grammar is chosen implicitly and only caught
late at FC-18 UX-30. SK-561 makes the choice explicit and early. It references
SK-539 for the per-flow grammar assignments and FC-18 UX-30 for enforcement —
it does not duplicate the role/route checks.

## When to Invoke

- **Before writing any JSX** for a new or rebuilt `client/src/pages/*Page.tsx`.
- **At the design gate** (SK-539 Section 0) — declare grammar here, then run the
  four role questions.
- **When UX-30 fails** at FC-18 — the page rendered a generic CRUD table instead
  of an implemented grammar; come back here, declare, and rebuild.

---

## Section 1 — The Seven Grammars (React templates)

One page implements exactly one grammar. The "User's question" is the test: the
screen exists to answer that one question.

| Type | User's question | React shape (mvp) |
|------|-----------------|-------------------|
| **G1 PROGRESS_STRIP** | "Where is this in its lifecycle?" | Horizontal/vertical step strip; per-step status chip; current step highlighted; progress count `N of M`. |
| **G2 VERDICT_GRID** | "What did each evaluator decide, and why?" | Item × reviewer grid; one verdict cell per (item, reviewer); reason on cell; consensus panel. |
| **G3 CARD_LIST** | "Which items need my attention, in what state?" | `.map()` of domain cards with state badge; filter/sort header; one lead/hero card or section, never a uniform wall (see SK-560 BAN-3). |
| **G4 TOPOLOGY_CANVAS** | "How do the parts connect?" | Nodes + edges via `reactflow`; phase grouping; side detail panel; human-readable node labels. Reference: topology/graph screens. |
| **G5 KIOSK** | "I have one task, one decision." | Single dominant CTA/decision; minimal chrome; one job per screen (RSVP, check-in, single-form submit). |
| **G6 DASHBOARD** | "What are my key metrics right now?" | Metric tiles + chart(s) + period selector; one dominant chart as the anchor. |
| **G7 SETTINGS_TABS** | "Which setting do I need to change?" | Tabbed form sections; labelled fields; save confirmation. |

Authoritative per-flow grammar assignments live in SK-539 §0.3 and
`planning--business-flows-registry.md`. The declared grammar must match those
where they exist, and match `.impeccable.md` and the examination record.

---

## Section 2 — Pre-Code Declaration gate (mandatory)

Before JSX, write this block into the session record / `.impeccable.md`:

```
SCREEN GRAMMAR DECLARATION — [page / flow-slug]
  Chosen grammar:        [G1 | G2 | G3 | G4 | G5 | G6 | G7]
  User's one question:   "[the question this screen answers]"
  Why NOT the nearest alternative:
                         "Not G2 because ___" (name the runner-up and reject it)
  Dominant anchor:       "[the one element that wins the eye]"  (ties to SK-560)
  Source of truth:       [SK-539 §0.3 row | examination record | business-flows-registry]
  Matches .impeccable.md:[yes | n/a — produced here]
```

A page whose declaration is missing, or whose chosen grammar contradicts the
registry without a documented rationale, is **not ready to implement**. A
documented deviation from the pre-declared grammar must be recorded in the
session record and the FC-18 Audit Trail.

---

## Section 3 — Grammar Violation Signals

These are the smells that a page picked the wrong grammar or no grammar. Each is
a prompt to stop and re-declare.

| Signal | What it usually means |
|--------|-----------------------|
| Generic Name / Status / Notes / Actions table on a TENANT_CONSUMER/PUBLIC page | No grammar declared — scaffolding left exposed (FC-18 UX-30 BLOCK). Likely should be G2/G3/G4. |
| Multi-step lifecycle squeezed into a single flat list | G1 PROGRESS_STRIP needed; a CARD_LIST hides the lifecycle. |
| Several reviewers/verdicts flattened into one status column | G2 VERDICT_GRID needed; the per-reviewer reasoning is lost. |
| A graph of connected nodes rendered as a table of rows | G4 TOPOLOGY_CANVAS needed; relationships are invisible in a table. |
| Many competing CTAs on a one-task screen | G5 KIOSK violated; reduce to one decision. |
| Metrics shown as a list of numbers with no chart/period | G6 DASHBOARD needed; no anchor metric. |
| Settings spread across many pages instead of tabs | G7 SETTINGS_TABS needed. |
| "Everything is the same size" — no dominant anchor | Grammar present but BAN-3 / anchor failure (see SK-560 §3). |

---

## Section 4 — Integration

- **SK-539 / FC-18 UX-30** enforces that a declared grammar is actually
  implemented (not a CRUD table). SK-561 is the *declaration + catalogue*; FC-18
  is the *enforcement*.
- **SK-560** owns visual craft (the dominant-anchor and uniform-grid BANs).
- **SK-550** (`visual-examination-round`) examines screens per cell; the declared
  grammar is an input to each cell's expected layout.
- **G4 dependency:** `reactflow` for nodes/edges; reuse existing topology
  components rather than re-rolling a canvas.

## Section 5 — What this skill does NOT do

- It does not assign role tiers, route guards, or visibility scopes (SK-539 §1).
- It does not score visual craft (SK-560).
- It is not a trainable unit; grammar selection is a human/architect declaration,
  not a model output. Any learned grammar-suggestion model would live in
  `llm_mvp_core`, not here.
