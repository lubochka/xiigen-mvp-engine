---
name: ui-quality-standard
version: "1.0.0"
sk_number: SK-560
priority: MANDATORY
load_order: 5.5
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript"]
contexts: ["web-session", "claude-code"]
description: >
  The single NAMED visual-quality gate for XIIGen mvp React/Tailwind UI: five
  absolute BANs, the 60-30-10 colour rule, the 4pt spacing unit, the one
  dominant visual anchor rule, and the AI Slop Test. Consolidates criteria that
  were previously scattered across impeccable--*, design-for-ai--ai-tells.md and
  critique-* into one enum that is grep-checkable via scripts/ux-quality-score.sh.
  Run before any "UI готов / UI done" claim.
triggers:
  - "ui quality"
  - "AI slop"
  - "design ban"
  - "60-30-10"
  - "spacing unit"
  - "visual anchor"
  - "UI done"
  - "UI готов"
---

# SK-560 UI Quality Standard — Named BANs + AI Slop Test (React/Tailwind)

A React page is **not visually done** until it passes one named checklist, not a
vibe. The universal standard was authored in Windows-Forms terms (`SystemColors`,
`BorderStyle`, `Panel`). This skill carries the *same* design law into the mvp
TypeScript stack (React + Vite + Tailwind), so the BAN list and the AI Slop Test
become a concrete, grep-anchored gate instead of opinion spread across other
skills.

## Why this skill exists (the gap it closes)

mvp already ships deep design craft — `impeccable--*` (craft, spatial, type,
colour), `design-for-ai--ai-tells.md`, `critique--*`. But none of those is **one
named enum of absolute BANs with an AI Slop Test** attached to a score. The
criteria were impossible to enforce mechanically because they were narrative.
SK-560 is that enum. It does **not** duplicate the craft skills — it *references*
them for the "how to fix" detail and owns only the pass/fail BAN gate.

It is also distinct from **SK-539 (`planning--ui-ux-compliance`) / FC-18**: SK-539
checks *role/route/grammar/accessibility correctness* (who sees the page, is the
route right, are inputs labelled). SK-560 checks *visual craft* (does it look
machine-generated). A page can pass FC-18 and still fail SK-560, and vice-versa.
Run both.

## When to Invoke

- **Before any "UI done / UI готов" claim** for a `client/src` page or component.
- **At Phase 7 Step 5**, alongside SK-541 craft audit (SK-560 is the BAN gate;
  SK-541 is the four-layer PNG audit).
- **Before a Playwright PNG is accepted as evidence** — a slop-failing screen is
  not acceptable visual evidence.
- **In `scripts/ux-quality-score.sh`** as the BAN-marker grep source of truth.

One pass of SK-560 before claiming done = zero "this looks like AI made it"
findings at design review.

---

## Section 1 — The Five Absolute BANs (React/Tailwind idioms)

Each BAN is a hard fail on any tenant-facing or public surface. Each has a
concrete Tailwind/React marker so it can be grepped, plus the universal intent.

### BAN-1 — Side-stripe / accent-bar borders

**Universal:** a coloured vertical stripe glued to the left edge of a card to
"add colour" (the WinForms `BorderStyle` + coloured `Panel` tell).

**React/Tailwind marker:** `border-l-4`, `border-l-2`, `border-l-8`,
`borderLeft`/`border-left` with a colour, on cards/list rows used purely as
decoration.

```bash
grep -rnE "border-l-(2|4|8)|border-left:[^;]*(solid|#|rgb)" client/src --include=*.tsx --include=*.css
```

**Allowed exception:** a left border that encodes *status* (e.g. error row) AND
is paired with a text label (UX-10) is not decoration — it is semantic. Document
it.

### BAN-2 — Gradient text

**Universal:** headline text filled with a gradient to look "designed".

**React/Tailwind marker:** `bg-clip-text text-transparent` + `bg-gradient-*`, or
inline `-webkit-background-clip:text`.

```bash
grep -rnE "bg-clip-text|text-transparent|background-clip:\s*text" client/src --include=*.tsx --include=*.css
```

### BAN-3 — Identical control grids (uniform card/button matrices)

**Universal:** every element rendered at the same size/weight so nothing leads —
the "grid of identical tiles" tell.

**React/Tailwind marker:** a `grid grid-cols-N` (or `flex`) whose children are
all the same component with no size/weight/emphasis differentiation and no
dominant anchor (see Section 3). This is a *read* check, not pure grep — but a
`.map()` rendering one `<Card>` per item with identical classes and no hero/lead
element is the signal.

### BAN-4 — Generic drop-shadows

**Universal:** the default soft grey box-shadow on everything to fake depth.

**React/Tailwind marker:** ubiquitous `shadow`, `shadow-md`, `shadow-lg`,
`shadow-xl` with default colour, applied to many elements as decoration rather
than to express a single elevation hierarchy.

```bash
grep -rncE "shadow(-(sm|md|lg|xl|2xl))?\b" client/src --include=*.tsx
# A high per-file count of generic shadows = BAN-4 risk. Prefer ONE elevated
# surface, not twelve.
```

### BAN-5 — Modal for a low-stakes action

**Universal:** a blocking modal dialog for something that should be inline (a
toast, an inline edit, a popover).

**React/Tailwind / mvp marker:** mvp has **no shadcn / Radix** — modals are
hand-rolled. Catch them by `role="dialog"` / `aria-modal` / fixed full-screen
overlays in low-stakes flows.

```bash
grep -rnE "role=\"dialog\"|aria-modal|fixed inset-0" client/src --include=*.tsx
```

Known hand-rolled modal locations to audit (not exhaustive):
`client/src/pages/event-attendance/RsvpPage.tsx`,
`client/src/components/tenants/`.

**Allowed exception:** a modal for a genuinely destructive/irreversible action
(delete, terminate, purge) is *required* by UX-14 — that is not low-stakes.

---

## Section 2 — The 60-30-10 Colour Rule

A surface uses roughly **60%** dominant (neutral/background), **30%** secondary
(surface/structure), **10%** accent (a single brand/action colour). Accent is
for the *one* primary action, not for decoration.

**mvp adaptation:** colours come from `tailwind.config.js` →
`theme.extend.colors`. Do not introduce raw hex in components when a token
exists; do not spray the accent token across many elements.

```bash
# Raw hex sprayed in components instead of tokens (60-30-10 erosion signal):
grep -rnE "#[0-9a-fA-F]{3,6}\b" client/src --include=*.tsx | grep -vE "//|/\*" | head -40
# Accent token over-use: count accent utility usages per page; >~3 dominant
# accent fills on one screen usually breaks the 10% budget.
```

**Pass:** background neutral dominates, structure is a second neutral, exactly
one accent leads the primary CTA. **Fail:** two or three competing accents, or
accent used as a background wash.

---

## Section 3 — Spacing Unit (4pt scale) + One Dominant Anchor

### 4pt spacing scale

All spacing is a multiple of 4px: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64**. In
Tailwind this is the default scale (`p-1`=4, `p-2`=8, `p-3`=12, `p-4`=16,
`p-6`=24, `p-8`=32, `p-12`=48, `p-16`=64). Off-scale arbitrary values are the
tell.

```bash
# Off-scale arbitrary spacing (e.g. p-[13px], m-[7px], gap-[19px]):
grep -rnE "(p|m|gap|space)[trblxy]?-\[[0-9]+px\]" client/src --include=*.tsx
# Inspect each: is the px a 4-multiple? If not, snap to the scale.
```

### One dominant visual anchor

Every screen has exactly **one** element that wins the eye first (the hero
heading, the primary chart, the single CTA). If three things shout equally, none
leads — that is the "AI made a uniform wall" tell and overlaps BAN-3.

**Read check:** name the anchor out loud for the page. "On this screen the eye
goes first to ___." If you cannot, or if the answer is "everything", fail.

---

## Section 4 — The AI Slop Test (the gate)

Before writing `UI готов` / `UI done`, answer one question per screen, honestly:

> **"If a person saw this screen, would they believe an AI generated it?"**

If yes — it fails. Then identify which BAN / rule produced the tell and fix it.

The AI Slop Test is the union of Sections 1–3 plus the craft skills' detail. Use
`design-for-ai--ai-tells.md` for the *catalogue* of tells and `impeccable--craft`
/ `impeccable--spatial-design` / `impeccable--typography` for the *fix*.

```
AI SLOP VERDICT — [page]
  BAN-1 side-stripe:     [PASS | FAIL — file:line]
  BAN-2 gradient text:   [PASS | FAIL — file:line]
  BAN-3 identical grid:  [PASS | FAIL — what wins the eye?]
  BAN-4 generic shadow:  [PASS | FAIL — count + intent]
  BAN-5 low-stakes modal:[PASS | FAIL | N/A — destructive]
  60-30-10:              [PASS | FAIL — accents counted]
  4pt spacing:           [PASS | FAIL — off-scale values]
  one dominant anchor:   [PASS | FAIL — anchor named]
  AI Slop Test:          [BELIEVABLY-HUMAN | LOOKS-AI-MADE]
  Verdict:               [PASS | BLOCK]
```

A `BLOCK` here means the screen is not done regardless of FC-18 status.

---

## Section 5 — Integration with the mvp toolchain

- **Score source of truth:** the BAN greps in Sections 1–5 are the markers
  `scripts/ux-quality-score.sh` consumes. Keep the marker list in this skill;
  the script counts offenses; SK-544 forbids claiming improvement from a count
  drop without an observable PNG change.
- **Examination:** SK-550 (`visual-examination-round`) drives the multi-round
  fleet examination; SK-560 supplies the per-screen BAN verdict for each cell.
- **Craft fixes:** `impeccable--*`, `design-for-ai--*`, `critique--*` own the
  "how to make it good" detail. SK-560 owns only "is it slop: yes/no".
- **Role/route/grammar:** SK-539 / FC-18 — orthogonal gate, run alongside.

## Section 6 — What this skill does NOT do

- It does not check accessibility, route guards, role tiers, or screen grammar
  (that is SK-539 / FC-18).
- It does not train or score a model, and it is not a checkpoint/DPO artifact —
  the trainable visual-quality model lives in `llm_mvp_core` (G12 / R5/R6); SK-560
  is an evidence-and-discipline gate on the mvp client only.
- It does not replace the craft skills; it consolidates their absolute BANs into
  one named, grep-anchored pass/fail.
