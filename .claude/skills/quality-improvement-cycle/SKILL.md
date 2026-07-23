---
name: quality-improvement-cycle
version: "1.0.0"
sk_number: SK-566
priority: HIGH
load_order: 6.4
category: ui-ux
stack: ["react", "vite", "tailwind", "typescript", "jest", "playwright"]
contexts: ["web-session", "claude-code"]
description: >
  The bounded quality-improvement cycle for XIIGen mvp UI work: a score-band
  protocol (PASS / NEAR-PASS 70-84% / PATCH 60-69% / STOP <60%), a 9-step cycle
  (confirm band, read failing asserts, classify failure, read state, generate
  fix, apply, version bump, re-evaluate, compare), a hard limit of 3 cycles then
  escalate, and a Cycle Log. "Evaluation" is Jest/Playwright pass-rate or the
  UX score (scripts/ux-quality-score.sh) — NOT model DPO machinery.
triggers:
  - "improvement cycle"
  - "score band"
  - "near-pass"
  - "patch band"
  - "cycle log"
  - "max 3 cycles"
  - "re-evaluate"
---

# SK-566 Quality Improvement Cycle — bounded score-band loop (Jest/Playwright)

When a screen or component is below standard, fixing it is a **bounded loop**,
not open-ended polishing. SK-566 sets the bands, the 9 steps, the 3-cycle limit,
and the Cycle Log. The universal version was wired to `dotnet test` +
`ContinuousLearningPipeline` + DPO; the mvp version keeps only the universal
discipline and reinterprets "evaluation" for the TS stack.

## Why this skill exists (the gap it closes)

mvp has examination (SK-550 tells you *what* to fix) but **no band protocol with
a 3-cycle limit and a Cycle Log** (the *how to converge* discipline). SK-566 adds
that. It deliberately does **not** import the core DPO / `DpoTrainingPair`
training machinery — that is G12 / `llm_mvp_core`. Here, "evaluation" is a test
pass-rate or a UX score.

## When to Invoke

- After examination (SK-550) or a craft audit (SK-560/SK-541) flags a screen.
- Whenever a component must be brought from below-standard up to PASS.

---

## Section 1 — Score bands

| Band | Score | Action |
|------|-------|--------|
| **PASS** | ≥ 85% | accept; stop the cycle |
| **NEAR-PASS** | 70–84% | one focused cycle, usually closes it |
| **PATCH** | 60–69% | targeted fixes; expect 2–3 cycles |
| **STOP** | < 60% | do not patch — the screen likely needs a purpose-built rebuild (grammar/SK-561), escalate |

"Score" on mvp = the relevant **Jest/Playwright pass-rate** for the screen's
tests, or the **UX score** from `scripts/ux-quality-score.sh` (offense-derived),
or the SK-560 BAN verdict turned into a pass ratio — declare which metric is the
band source for the run.

---

## Section 2 — The 9-step cycle

1. **Confirm band** — compute the current score; record the band.
2. **Read failing asserts** — read the actual failing Jest cases / Playwright
   expectations / offense lines (do not guess; SK-544 forbids claiming a change
   without reading the observable failure).
3. **Classify failure** — which category (accessibility, grammar, BAN, layout,
   state, error copy)?
4. **Read state** — read the component/page and any service it calls before
   editing (read-before-touch).
5. **Generate fix** — the smallest change that addresses the classified failure.
6. **Apply** — make the edit in `client/src`.
7. **Version bump** — bump the screen's version/changelog note if the surface has
   one.
8. **Re-evaluate** — re-run the same metric (Jest/Playwright/UX score).
9. **Compare** — new score vs old; record the delta in the Cycle Log; decide
   continue / stop / escalate.

---

## Section 3 — Hard limit and escalation

- **Maximum 3 cycles** per screen. If still not PASS after cycle 3, **escalate**:
  the screen probably needs a grammar rebuild (SK-561) or a product decision, not
  more patching.
- A STOP-band screen (<60%) escalates immediately without burning cycles.

---

## Section 4 — Cycle Log

Record every cycle (this is the evidence the loop was bounded and real):

```
CYCLE LOG — [screen / component]
  Metric: [jest-pass-rate | playwright-pass-rate | ux-quality-score | BAN-pass-ratio]
  Cycle 1: band=PATCH(64%)  failing=[UX-06 empty state, BAN-4 shadows]  fix=[added empty CTA, removed 9 shadows]  re-eval=78%  delta=+14
  Cycle 2: band=NEAR-PASS(78%) failing=[UX-10 colour-only badge]        fix=[added label to badge]                re-eval=88%  delta=+10
  Result: PASS(88%) at cycle 2.   Escalated: no.
```

If escalated: name why (e.g. "needs G3 rebuild per SK-561") and stop.

## Section 5 — What this skill does NOT do

- It does not train a model or build DPO pairs; the core `DpoTrainingPair` /
  `ContinuousLearningPipeline` machinery stays in `llm_mvp_core` (G12 / R5).
- It does not define the standard itself — bands measure against SK-560 (BANs),
  SK-561 (grammar), SK-562 (tests), and FC-18; SK-566 is only the convergence
  loop.
- It does not allow unbounded polishing — 3 cycles, then escalate.
