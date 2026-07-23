---
name: coverage-completeness-gate
version: "1.0.0"
sk_number: SK-546
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-546 Coverage Completeness Gate — Claim scope must match evidence scope

A session that improves 5 flows and claims "UI/UX fleet is improving" has not
lied — 5 flows did improve. It has overclaimed — the fleet result does not follow
from 5 data points in a 48-flow fleet. This skill gates improvement claims at
⛔ STOP to prevent the evidence scope from being smaller than the claimed scope.

## Origin

Extracted from the session corpus where a session reported "-63.6% improvement"
after examining 5 of 48 flows. The claim was mathematically consistent with the
evidence it cited. The evidence scope (5 flows) did not support the claim scope
(fleet). No gate existed to catch the mismatch before STOP fired. This skill
installs that gate.

## When to Invoke

Fires at Step 6 (feedback recheck) of the Response Construction Protocol,
before every ⛔ STOP that contains a claim of improvement, completion, or progress.

Trigger phrases (any of these in the response draft activates the gate):
- "improved", "reduced", "fixed", "resolved", "addressed"
- percentage reductions: "-X%", "X% reduction", "X% improvement"
- completion claims: "done", "complete", "finished", "all flows"
- progress claims: "fleet is improving", "significant progress", "major improvement"

One gate check before STOP = no overclaimed scope in the session output.

---

## Section 1 — The Coverage Gate Table

| Claim type | Required coverage before claim is valid |
|------------|----------------------------------------|
| "This flow improved" | 100% of that flow's screen states audited (SK-541 four layers per state) |
| "These N flows improved" | 100% of all N claimed flows fully audited (SK-541 + SK-544 Layer 2 per flow) |
| "UI/UX fleet is improving" | SK-543 denominator established; ≥ 20% of non-blocked flows at EXAMINED state |
| "UI/UX fleet work is done" | SK-545 completion criteria met for all non-blocked flows |
| "BATCH-XX is done" | Every non-blocked flow in the batch is at EXAMINED state (SK-545) |
| "X% improvement in [metric]" | The metric is Layer 2 (observable delta), not Layer 1 (internal count) per SK-544 |

---

## Section 2 — Coverage Check at ⛔ STOP

For every claim trigger phrase detected in the response draft, run this check
before STOP fires:

```
COVERAGE CHECK (SK-546):

Claim detected: "[exact quote]"
Claim type: [single flow | N flows | fleet improving | fleet done | batch | metric]

Coverage required: [per table in Section 1]
Coverage actual:
  This session examined: [list flow IDs]
  Each flow fully audited (SK-541 four layers): [YES/NO per flow]
  SK-544 Layer 2 present per flow: [YES/NO per flow]
  SK-543 STATE.scope present: [YES — denominator: N of M | NO]

Coverage verdict:
  SUFFICIENT — claim matches evidence scope → STOP may fire
  INSUFFICIENT — [actual coverage] < [required coverage] → revise claim
```

If INSUFFICIENT: do not suppress the response. Downgrade the claim per Section 3.

---

## Section 3 — Claim Downgrade Protocol

When coverage is insufficient, the claim is downgraded to match actual evidence.
The work is preserved. The claim is revised. The STOP fires with the downgraded claim.

| Original claim | Coverage gap | Downgraded claim |
|---------------|-------------|-----------------|
| "Fleet is improving" | < 20% of eligible fleet examined | "FLOW-XX and FLOW-YY improved. Fleet coverage: N of M eligible (X%). Fleet-level trend not yet established." |
| "These 5 flows improved" | 3 of 5 fully audited | "FLOW-AA, FLOW-BB, FLOW-CC improved (fully audited). FLOW-DD, FLOW-EE: internal metrics improved, visual improvement unverified." |
| "-63.6% improvement" | Grep count, not Layer 2 | "Grep offense count reduced from 22 to 8 in these 5 flows (Layer 1 confirmed). Visual improvement unverified (no PNGs read)." |
| "BATCH-08 done" | 4 of 6 flows examined | "BATCH-08: 4 of 6 flows examined. FLOW-39, FLOW-40 not yet examined." |
| "UI work complete" | 12 of 45 eligible examined | "12 of 45 eligible flows examined (26.7%). Fleet work not complete." |

**Rule:** A downgraded claim is not a failure. It is an honest report. A session
that correctly identifies its own coverage limit and states it explicitly has
produced a more valuable output than one that overclaims and ships an unfalsifiable
result.

---

## Section 4 — Threshold Reasoning

### Why 20% for "fleet is improving"

A fleet-level trend claim requires enough data points to be non-trivial. 20% of
non-blocked flows (≈ 9 of 45 eligible) is the minimum for a directional claim.
Below 20%, the session has data on individual flows only — not a fleet trend.

The 20% threshold is not a quality bar — it is a sample-size bar. A session
can have 9 perfectly-examined flows and still be making a fleet-level claim from
a 20% sample. Such a claim should be stated as "directional, not conclusive."

### Why 100% for "this flow improved"

A single flow is a small scope. There is no sampling argument for examining 3
of 5 screen states and claiming the flow improved. If the empty state was not
audited, the flow's empty-state experience is unknown.

### Why SK-545 for "fleet done"

SK-545 defines exactly what "done" means — all three criteria per flow, all
10 batches. "Fleet done" is binary: either SK-545 conditions are met or they
are not. There is no partial "done."

---

## Section 5 — Integration with Step 6 of Response Construction Protocol

SK-546 fires at Step 6 (feedback recheck) of
XIIGEN-RESPONSE-CONSTRUCTION-PROTOCOL-v1.md.

Step 6 checks that every correction declared addressed is actually addressed.
SK-546 adds a parallel check: every improvement claim declared in the draft
has coverage that supports it.

The Step 6 artifact for a session that includes improvement claims:

```
Feedback recheck (Step 6) — SK-546 coverage gate:
  Claim 1: "[claim]"
    Coverage: [N flows audited of N claimed]
    Verdict: SUFFICIENT / INSUFFICIENT → [downgrade if insufficient]
  Claim 2: "[claim]"
    Coverage: [...]
    Verdict: [...]
```

If any claim is INSUFFICIENT and not downgraded: STOP does not fire.
Revise the draft. Re-run Step 6.

---

## Section 6 — Integration with SK-543, SK-544, SK-545, SK-547

**SK-543 (work-scope-inventory):** SK-546 reads STATE.scope to get the
denominator for fleet-level claims. If STATE.scope is absent, SK-546 emits:
"STATE.scope missing — cannot assess fleet coverage. Run SK-543 first."

**SK-544 (improvement-measurement-protocol):** SK-544 verifies the measurement
unit (Layer 2 observable delta). SK-546 verifies the coverage fraction (N of M
flows). Both must pass for any multi-flow improvement claim. SK-544 runs first;
SK-546 runs at Step 6 with SK-544's output as input.

**SK-545 (ui-fleet-completion-criteria):** SK-546's "fleet done" row references
SK-545 completion criteria directly. SK-546 does not re-define "done" — it checks
whether SK-545's definition has been met.

**SK-547 (output-skepticism):** SK-547's scope validity check (skeptic question 2)
is the upstream version of SK-546's coverage check. SK-547 asks "does my evidence
cover my scope?" before drafting; SK-546 verifies the answer at STOP.
If SK-547 ran, SK-546 should have little to catch.

---

## Section 7 — Anti-patterns

1. **"I improved what I worked on — that's a valid claim"** — improving what you
   worked on is valid at the scope of what you worked on. The gate catches scope
   inflation: claiming fleet improvement from flow-level work.

2. **"20% is a low bar"** — 20% is not a quality bar. It is a minimum sample for
   a directional fleet claim. Meeting it does not mean the claim is strong — it
   means the claim is non-trivially grounded.

3. **"Downgrading the claim makes the session look bad"** — the opposite is true.
   A session that correctly identifies its coverage limit and states it explicitly
   is more trustworthy than one that ships an overclaimed result. Luba can trust
   a session that knows what it doesn't know.

4. **"The gate is too strict for short sessions"** — short sessions should make
   short-scope claims. A one-flow session claiming one-flow improvement needs only
   100% of that one flow audited. The gate is proportional to the claim.

5. **"I'll note the coverage caveat in the notes section"** — a coverage caveat
   in a notes section does not satisfy the gate. The claim itself must be
   downgraded to match coverage. A caveat alongside an overclaimed headline is
   still an overclaimed headline.

---

## Section 8 — Failure Modes This Skill Prevents

| Failure mode | How coverage gate catches it |
|--------------|------------------------------|
| "Fleet improving" from 5 of 48 flows | Fleet claim requires ≥ 20% — 5/48 = 10.4%, gate blocks |
| "-63.6% improvement" on 5 flows | Metric is Layer 1 only; coverage = 5/48; both gates fail |
| "BATCH-08 done" with 2 flows unexamined | Batch done requires all non-blocked flows EXAMINED |
| Overclaim alongside a buried caveat | Claim itself must be downgraded, not caveated |
| Fleet claim without denominator | STATE.scope required before fleet claim assessment |

---

## Section 9 — Universal Coverage Gate (from core, code/test scope)

The same gate applies beyond UI fleets to ANY "N improved / pipeline complete"
claim. The single rule: **claimed scope ≤ evidence scope**; if not, downgrade —
do not caveat.

| Claim | Required evidence before the claim is valid |
|-------|---------------------------------------------|
| "Subproject X improved" | a `npx jest` / `npx playwright test` delta FOR X (passing count before→after), not an estimate, not a build-only result |
| "N subprojects improved" | a test delta for ALL N — every claimed package/module shows its own run output. Improving 2 and claiming N is overclaim |
| "Pipeline complete" | every component present AND `0 failed` across the suite (`npx jest` + Playwright + RAG eval) |
| "RAG retrieval improved" | a NUMERIC FastAPI eval-scenario run (e.g. recall/precision before→after), never "looks better" |
| "Type-safety improved" | `npx tsc --noEmit` exit 0 — proves type-check only, not runtime |

A "subproject" in mvp = a monorepo workspace package (`server` / `client` /
`packages/*`) or a flow module — improvement is measured by that package's own
test output, not by the whole repo's.

Count/actor honesty (proxy guard): `build clean ≠ tests pass`; `grep 0 ≠ logic
correct`; `one --testPathPatterns run ≠ full suite`; `N ledger rows ≠ N cycles`.
If `independent_evidence_count < count_claimed`, state the narrow truth.

If any row fails, the only honest status is the downgraded claim with the first
uncovered item named — never an overclaimed headline plus a buried caveat.

## Changelog

- **v1.0.0** — initial skill. Coverage gate table (6 claim types); coverage check
  format at ⛔ STOP; claim downgrade protocol with example downgrades; threshold
  reasoning (20% / 100% / SK-545); Step 6 integration with Response Construction
  Protocol; integration chain SK-543/544/545/547; anti-patterns 1–5; failure-mode table.
- **v1.1.0** — Section 9 added: universal code/test coverage gate from core
  (scope ≤ evidence, N-subprojects test-delta, pipeline `0 failed`, numeric RAG
  eval, npm/tsc proxy-guards). TS-adapted; UI fleet sections unchanged.

---

## END OF SK-546
