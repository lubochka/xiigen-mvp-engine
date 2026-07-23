---
name: product-design-context
version: "1.0.0"
sk_number: SK-540
load_order: 5.4
category: planning
updated: "2026-04-20"
contexts: ["web-session", "claude-code"]
---

# SK-540 Product Design Context — Establish design intent before writing JSX

## When to invoke

- BEFORE writing the first React page for a flow that has no `.impeccable.md`
- AT session start for any MATERIALIZATION or GENERATION session producing React pages
- Check in this order:

  ```bash
  # Check 1 — examination record (ground truth where present)
  cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20

  # Check 2 — existing design context
  cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
  ```

  - **Examination record present:** extract WHO/VERB/GRAMMAR from it (Step 1b below).
    Skip Steps 1a and 2. Go directly to Step 3.
  - **No examination record, but `.impeccable.md` present:** SK-540 already satisfied for
    this flow. Skip all steps. Proceed to SK-539 Section 1.
  - **Neither present:** run Steps 1a, 2, 3, 4 in full.

SK-540 is conditional: fires once per flow, before the first JSX is written.
Once `.impeccable.md` exists for a flow, SK-540 is satisfied for all future sessions
on that flow.

## What this skill produces

File: `docs/design-context/{slug}/.impeccable.md`

Required sections: WHO · VERB · FEEL · Domain concepts · Color world ·
Signature · Defaults rejected · Grammar type · Token vocabulary · Anti-references

## Step 1a — Read the business spec (when no examination record exists)

Read in this order. Each file answers a different question.

| # | File | Path | Answers |
|---|------|------|---------|
| F1 | STEP-1-INVARIANTS | `docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md` | `user_intent` verbatim — the page's purpose sentence |
| F2 | UI-REFLECTION-STATE | `docs/sessions/FLOW-XX/UI-REFLECTION-STATE.md` | Which processes + states exist; which React components implement them |
| F3 | ROLE-ANALYSIS-BATCH | `docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md` | Which roles open this screen and what each role sees |
| F4 | Business spec | `docs/business-flows/NN-{slug}.md` (FLOW-01..34 only) | PM intent, user journey, success criteria |
| F5 | DESIGN-SIMULATION | `docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md` (if exists) | End-to-end user walkthrough |
| F6 | RECONCILIATION-STATE | `docs/sessions/FLOW-XX/FLOW-XX-RECONCILIATION-STATE.md` | What is actually built vs what was designed |

**Batch map for F3 (ROLE-ANALYSIS-BATCH):**
FLOW-01..05 = BATCH-01 · FLOW-06..10 = BATCH-02 · FLOW-11..16 = BATCH-03 ·
FLOW-17..21 = BATCH-04 · FLOW-22..26 = BATCH-05 · FLOW-27..31 = BATCH-06 ·
FLOW-32..34 = BATCH-07 · FLOW-35..47 = BATCH-08+

**F6 resolution rule:** If F6 verdict = DEMONSTRABLY_WRONG, base the UI on F1–F4, not
on existing components. The implementation diverged from the design.

**F1 spec-gap warning (FLOW-04, FLOW-09, FLOW-34):** If F1 contradicts the slug, pages,
and PNGs, do not proceed. File the gap in the session record and request Luba's resolution.
See CFI-12 in SESSION-LOAD-PLAN v31. These three flows are blocked for UI design until
spec alignment is confirmed.

Extract from the above:
- `user_intent` — verbatim sentence from F1
- `primary_role` — specific role from F3
- `primary_verb` — one action (not "use the page" — the specific task)

If any of these three cannot be answered: stop. The sources have not been read.

## Step 1b — Extract from examination record (when record exists)

Read `docs/screen-examination/{slug}-examination.md`.

Extract directly:
- **WHO** — from "Roles (F3)" section: primary role + one-sentence context
- **VERB** — from "One-sentence spec (F1)" section: the primary action
- **GRAMMAR** — from "Grammar" section: G1–G7 declared type

Remaining fields for `.impeccable.md` (FEEL, domain concepts, color world,
signature, defaults rejected, token vocabulary, anti-references) still require
Step 2 domain exploration. The examination record gives WHO/VERB/GRAMMAR;
SK-540 provides the rest.

**Reference implementation:** `docs/screen-examination/adaptive-rag-deep-research-examination.md`
(FLOW-29) — the examination record with the most complete persona card, state inventory, and
grammar rationale in the fleet. Use as the exemplar for Step 1b extraction quality.

## Step 2 — Domain exploration

Answer all four outputs before writing anything.

**Domain concepts** — 5+ words from this domain's real-world territory. Not feature names.
The vocabulary a practitioner in this field already uses.

Example (FLOW-29 deep research):
> "convergence", "tracer rounds", "budget as constraint", "synthesis from sources",
> "confidence interval", "source provenance"

**Color world** — 5+ colors that exist physically in this domain. Not brand colors.
The colors of the actual environment.

Example (FLOW-29):
> oscilloscope green (live signal), terminal amber (warning threshold),
> rack metal grey (structural), deep navy (precision instrument), fault red (hard stop)

**Signature** — one UI element that could only exist for this flow. Something derived from
the domain that no generic template would produce.

Example (FLOW-29): budget consumption strip embedded inside each running research node
showing % of token budget consumed

**Defaults to reject** — 3 obvious choices that produce AI slop for this page type. Name
them explicitly so they cannot be accidentally chosen.

Example (FLOW-29):
> dark sidebar + white content split (generic admin template)
> metric dashboard with big numbers and gradient cards
> identical card grid with same padding and radius on every row

## Step 3 — Write .impeccable.md

Path: `docs/design-context/{slug}/.impeccable.md`

```markdown
## Design Context — {FlowName} ({slug})
Generated by SK-540 · Date: {date}
Source: [examination record at docs/screen-examination/{slug}-examination.md | spec files F1-F6]

### Users
WHO:  {role} — {one sentence: context, trigger, what they do before and after this page}
VERB: {one action — "approve or defer the porting decision for each FT record"}

### Aesthetic direction
FEEL: {3 words — specific enough to disagree with. Not "clean and modern".}
Domain concepts: {5+ terms from the domain's actual vocabulary}
Color world: {5+ physical colors with descriptors}
Signature: {one element that could only exist for this flow}
Defaults rejected: {3 named choices that must not appear}

### Grammar
Type: {G1 PROGRESS_STRIP | G2 VERDICT_GRID | G3 CARD_LIST | G4 TOPOLOGY_CANVAS |
       G5 KIOSK | G6 DASHBOARD | G7 SETTINGS_TABS}
Rationale: {one sentence connecting VERB to grammar type}

### Token vocabulary
{3–5 CSS variable names derived from domain words, e.g.:}
--signal-live: var(--color-green-oscilloscope)
--budget-warning: var(--color-amber-terminal)
--structural-chrome: var(--color-grey-rack)

### Anti-references
{1–2 interfaces this must NOT resemble, and why}
```

## Step 4 — Verify

```bash
ls docs/design-context/{slug}/.impeccable.md
grep -c "FEEL:\|^Type:\|Token vocabulary" docs/design-context/{slug}/.impeccable.md
# Expected: 3
```

SK-540 is complete when verification passes. Proceed to SK-539 Section 1.

## Grammar type reference

| Type | User's question | Pre-declared flows |
|------|-----------------|-------------------|
| G1 PROGRESS_STRIP | "Where is this in its lifecycle?" | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| G2 VERDICT_GRID | "What did each evaluator decide?" | FLOW-24 (mod), 25, 27, 35, 37 |
| G3 CARD_LIST | "Which items need attention?" | FLOW-06, 07, 08, 10, 12, 16, 17, 20, 28, 32, 36, 40, 46 |
| G4 TOPOLOGY_CANVAS | "How do the parts connect?" | FLOW-18, 26, 29, 34 |
| G5 KIOSK | "I have one task" | FLOW-01, 02, 03, 04, 05, 09, 22 (public), 24 (report) |
| G6 DASHBOARD | "What are my key metrics?" | FLOW-13, 20 (admin), 30, 31, 38 |
| G7 SETTINGS_TABS | "Which setting do I need?" | FLOW-15, 21, 23, 48 |

Consult `planning--business-flows-registry.md` for pre-declared grammar and CFI notes.
For per-grammar per-state rendering conventions, read
`docs/screen-examination/MARKET-REFERENCE-CATALOG.md` §{grammar-section}.

## Integration with SK-539

After SK-540 completes (`.impeccable.md` written and verified), proceed to
`planning--ui-ux-compliance-SKILL.md` (SK-539) Section 1. SK-539 Section 0 will
read the `.impeccable.md` to extract the grammar type and confirm design context
is established before asking the four role questions (Q1–Q4).

SK-540 answers "what does the user want to do?" (Vocabulary B).
SK-539 answers "who can access this and at what route?" (Vocabulary A).
Both are required. SK-540 runs first.
