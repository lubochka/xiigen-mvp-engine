---
name: improvement-measurement-protocol
version: "1.0.0"
sk_number: SK-544
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-544 Improvement Measurement Protocol — Observable outcome required

An internal metric that improved is not an improvement until a user-facing change
can be described. Grep patterns can drop while PNGs look identical. TypeScript
errors can reach zero while the UI is broken. This skill requires the observable
delta before any improvement claim is permitted.

## Origin

Extracted from the session corpus where "22 to 8 offenses, -63.6%" was reported
as a UI/UX improvement. The -63.6% derived from grep pattern counts against
TypeScript source across 5 of 48 flows. No PNGs were read. No screen states were
described. The internal metric improved. Whether any user saw a different page
was never established.

The same failure class appears in three forms in the corpus:
- Grep count reduction treated as UI improvement
- TypeScript error count reaching zero treated as feature complete
- FC-18 Audit Trail produced treated as page quality verified

None of these are sufficient. All three are Layer 1. Layer 2 is the observable.

## When to Invoke

- Any session claiming a UI/UX improvement
- Any ⛔ STOP that includes an improvement percentage or before/after metric
- Any session where FC-18, SK-541, or SK-539 gates are run
- Before any fleet-level improvement claim (after SK-543 establishes denominator)

---

## Section 1 — The Two-Layer Protocol

For any UI/UX change, two layers must be present before an improvement claim is valid.

### Layer 1 — Internal metrics (necessary but not sufficient)

Internal metrics confirm structural correctness. They are required. They are
not sufficient alone for an improvement claim.

| Metric type | What it confirms | What it does NOT confirm |
|-------------|-----------------|--------------------------|
| Grep pattern count reduction | Code no longer contains the pattern | The UI looks different |
| TypeScript error count = 0 | Code compiles | The page renders correctly |
| Test pass rate = 100% | Tests pass | Tests test the right thing |
| FC-18 Audit Trail produced | Compliance gate ran | The page serves the user's job |
| SK-541 four-layer audit PASS | Audit criteria met | The visual output changed |

Layer 1 result format (required in every STOP that includes UI/UX changes):
```
Layer 1 — Internal metrics:
  Grep pattern count: [before] → [after] ([delta])
  TypeScript errors: [N]
  FC-18 Audit Trail: [present / absent]
  SK-541 audit: [PASS / CONCERN / BLOCK / not run]
```

### Layer 2 — Observable delta (required for improvement claim)

For every changed component, one sentence describing what a user would see
differently in a captured PNG between before and after.

Layer 2 result format (required for any improvement claim):
```
Layer 2 — Observable delta:
  [Screen state]: [what changed visually]
  empty state:    [what the page shows when no data is loaded]
  loading state:  [what the page shows while fetching]
  populated state: [what the page shows with data — the primary view]
  error state:    [what the page shows on failure]
  success state:  [what the page shows after a completed action]
```

Not all screen states apply to every page. Declare which states were checked
and what changed in each.

**"No sentence = no improvement claim"** — if the session cannot state what
a user would see differently, the improvement has not been measured.

---

## Section 2 — Claim Validity Rules

### Flow-level claim: "FLOW-XX UI improved"

Requires:
- Layer 1 pass for all changed components in FLOW-XX
- Layer 2 sentence for at least one screen state per changed component
- SK-541 four-layer audit run on at least one PNG per changed page

Example of a valid flow-level claim:
```
FLOW-36 FeatureRegistryPage improved.
Layer 1: grep AdminCrudPanel: 1 → 0; TypeScript errors: 0; FC-18 Audit Trail: present
Layer 2 (populated state): Previously showed a Name/portingCandidate/Delete table.
  Now shows FT-record cards with porting-candidate badge, usage signal count,
  and Approve/Defer action buttons per card.
SK-541: Layer 4 PASS (G3 CARD_LIST implemented, not CRUD table)
```

### Fleet-level claim: "UI/UX fleet is improving"

Requires:
- SK-543 denominator established (STATE.scope present)
- SK-546 coverage threshold met (≥ 20% of eligible flows examined)
- Layer 1 pass for all changed components across all flows in scope
- Layer 2 sentence for at least one screen state per changed component per flow
- SK-541 run on each flow in scope

Example of a valid fleet-level claim:
```
UI/UX fleet is improving.
Scope: 10 of 45 eligible flows (22%) — SK-543 denominator established
Layer 1 summary: 10 flows, FC-18 Audit Trail present for all
Layer 2 summary: [N] screen states described across all 10 flows
SK-541: run on all 10 flows, [N] PASS, [N] CONCERN, [N] BLOCK
```

### Invalid claims (do not permit at ⛔ STOP)

```
❌ "Offenses reduced from 22 to 8 (-63.6%)"
   Reason: Layer 1 only — no observable described

❌ "TypeScript errors: 0 — UI is complete"
   Reason: Layer 1 only — zero compile errors does not mean correct render

❌ "FC-18 Audit Trail produced — page is compliant"
   Reason: Layer 1 only — audit trail existence ≠ page quality

❌ "All 5 flows improved"
   Reason: fleet claim without SK-543 denominator

❌ "UI/UX work is improving" [after examining 2 flows]
   Reason: fleet claim without SK-546 coverage threshold
```

---

## Section 3 — The STOP Gate

Before any ⛔ STOP that includes an improvement percentage or before/after metric:

```
IMPROVEMENT CLAIM GATE (SK-544):

Claim: "[stated improvement]"

Layer 1 check:
  □ Internal metrics present (grep counts / error counts / audit trail)
  □ Layer 1 format block present in this response

Layer 2 check:
  □ Observable delta present for each changed component
  □ At least one screen state described per changed component
  □ "No PNGs read" explicitly stated if no PNGs were read

Claim scope check:
  □ Flow-level claim: SK-541 run on this flow
  □ Fleet-level claim: SK-543 denominator present + SK-546 threshold met

Verdict: VALID | INVALID — [reason if invalid]

If INVALID: revise the claim before STOP fires.
  Option A: Provide the Layer 2 observable (read a PNG and describe what changed)
  Option B: Downgrade the claim to what Layer 1 actually establishes:
    "Internal metrics improved — visual improvement unverified"
```

---

## Section 4 — "No PNGs Read" Declaration

If the session did not read any PNGs, it must declare this explicitly before STOP:

```
Layer 2 status: NO PNGs READ.
Internal metrics improved. Visual improvement unverified.
Claim revised to: "[internal metric] improved.
  Observable delta: not established — PNG read required to verify."
```

This is not a failure. It is an honest claim. A session that states
"internal metrics improved, visual improvement unverified" has done more
useful work than a session that claims -63.6% without establishing what changed.

The explicit declaration also tells the next session exactly what remains to do:
read a PNG for each changed component and describe what the user sees.

---

## Section 5 — Screen State Coverage

Five screen states apply to most tenant-facing and platform-facing pages.
A full Layer 2 measurement covers all applicable states.

| State | When it applies | What to describe |
|-------|----------------|-----------------|
| empty | page with no data loaded | what the user sees before any records exist |
| loading | data fetch in progress | skeleton, spinner, or loading indicator |
| populated | data present — primary view | the main content: cards, list, canvas, etc. |
| error | fetch failed or validation error | error message, retry option |
| success | after a user action completes | confirmation, state change, next step |

For each state: one sentence. If a state is not applicable (e.g., no loading
state because data is static), declare "N/A — [reason]".

---

## Section 6 — Integration with SK-543, SK-546, SK-547

**SK-543 (work-scope-inventory):** must run before fleet-level Layer 2 claims.
STATE.scope denominator tells SK-544 whether the claimed scope is established.
If STATE.scope is absent: SK-544 cannot validate fleet-level claims.

**SK-546 (coverage-completeness-gate):** uses the SK-544 Layer 2 result to
determine if coverage thresholds are met. A flow without a Layer 2 description
does not count toward the coverage numerator in SK-546.

**SK-547 (output-skepticism):** uses SK-544's proxy check at step 3. The
proxy check question "am I measuring something that could improve without the
underlying thing improving?" is exactly the Layer 1 vs Layer 2 distinction.
SK-544 provides the concrete answer.

**SK-541 (screen-craft-audit):** SK-541 runs the four-layer PNG audit.
SK-544 requires SK-541 to have run before a flow-level improvement claim is
valid. SK-541's Layer 4 (grammar verification) is the primary source of Layer 2
observable evidence when PNGs are captured.

**Mistake 28 in ARCHITECT-SESSION-GUIDE v1.9:** the architect guide's Mistake 28
("internal metric substituted for observable outcome") is the authoring-side
mirror of this skill's gate. SK-544 enforces it at STOP time.

---

## Section 7 — Anti-patterns

1. **"Grep count dropped — the UI is better"** — grep measures source text,
   not rendered output. The user sees the render. Establish Layer 2.

2. **"I ran FC-18 — the page is compliant"** — FC-18 confirms the compliance
   gate ran and found no BLOCKs. It does not describe what the user sees.
   Compliance and quality are orthogonal.

3. **"The PNG would show the same thing I described"** — then read the PNG
   and confirm it. "Would show" is prediction, not evidence.

4. **"It's obvious the UI improved — the CRUD table is gone"** — "obvious"
   is memory, not evidence (SK-531 anti-pattern 3). State what replaced it
   and in which screen state it appears.

5. **"We improved 3 flows — that's Layer 2 for the fleet"** — 3 flows with
   Layer 2 descriptions is flow-level evidence for 3 flows, not fleet-level
   evidence. Fleet-level requires SK-543 denominator and SK-546 threshold.

6. **"I didn't read PNGs but I know what the component renders"** — knowledge
   of the component's expected output is not the same as verifying the actual
   output. Declare "visual improvement unverified" and proceed honestly.

---

## Section 8 — Failure Modes This Skill Prevents

| Failure mode | How measurement protocol catches it |
|--------------|-------------------------------------|
| "-63.6% improvement" on grep counts | Layer 2 required — no observable = claim blocked |
| "TypeScript errors: 0" treated as UI complete | Layer 1 only — Layer 2 explicitly required |
| Fleet claim without denominator | SK-543 check fires at fleet-claim gate |
| Visual regression undetected | Layer 2 screen-state coverage catches missing states |
| "Obvious" improvement stated without evidence | Anti-pattern 4 + SK-531 cross-reference |
| FC-18 pass treated as quality proof | Layer 1/Layer 2 distinction explicit in claim validity |

---

## Changelog

- **v1.0.0** — initial skill. Two-layer protocol; Layer 1/Layer 2 format blocks;
  claim validity rules with valid/invalid examples; STOP gate template; "No PNGs Read"
  declaration; five screen states; integration notes for SK-541/543/546/547 and
  Mistake 28; anti-patterns 1–6; failure-mode table. Origin: corpus -63.6% claim.

---

## END OF SK-544
