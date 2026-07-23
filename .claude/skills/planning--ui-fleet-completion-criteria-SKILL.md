---
name: ui-fleet-completion-criteria
version: "1.0.0"
sk_number: SK-545
priority: MANDATORY
load_order: 5
category: planning
updated: "2026-04-21"
contexts: ["web-session", "claude-code"]
---

# SK-545 UI Fleet Completion Criteria — What "done" means at the fleet level

Without a definition of done, fleet work has no finish line. A session can run
hundreds of rounds improving individual flows while 30 flows sit untouched and
unexamined. This skill defines the minimum examined state per flow and the
conditions under which fleet-level UI/UX work is considered complete.

## Origin

Extracted from the session corpus where repeated UI/UX sessions improved the
same small set of flows without any mechanism to surface that 30+ flows had
never been examined at all. No document said what "done" meant at the fleet
level, so sessions optimised locally and the fleet stayed incomplete. This skill
closes that gap.

## When to Invoke

- At the start of any UI/UX fleet session to establish the completion baseline
- At any ⛔ STOP where a session claims fleet-level progress or completion
- When deciding which flows to work on next (start with not-started before
  re-examining partially-examined flows)
- When closing out a batch to verify it meets minimum examined state

---

## Section 1 — Minimum Examined State Per Flow

A flow is considered **examined** when all three of the following exist and
are populated:

### Criterion 1 — Examination record

File: `docs/screen-examination/{slug}-examination.md`

Must contain all of:
- `WHO:` field populated (specific role + one-sentence context)
- `VERB:` field populated (one action the user is here to take)
- `GRAMMAR:` field populated (G1–G7 type declared)
- `FEEL:` field populated (one sentence on the visual register)
- At least one PNG audit result (SK-541 four-layer output)
- `overall_grade:` field populated (APPROVED | NEEDS_REVISION | NEEDS_PURPOSE_BUILT_UI)

A file that exists but is empty, or is missing any of the above fields,
does not satisfy Criterion 1. It counts as partial, not examined.

### Criterion 2 — Design context

File: `docs/design-context/{slug}/.impeccable.md`

Must exist and be populated. An empty file does not satisfy this criterion.
This file is produced by SK-540 (product-design-context). If it is absent,
SK-540 has not run for this flow.

### Criterion 3 — FC-18 Audit Trail

File: `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`

Must exist with all mandatory fields populated per `fc-18-ui-ux-compliance-gate.md`:
- Grammar type declared (G1–G7)
- All BLOCK findings cleared (or none present)
- SK-541 AUDIT record attached
- .impeccable.md presence confirmed

A trail that exists but has unclosed BLOCK findings does not satisfy Criterion 3.

### Verification commands

```bash
SLUG="feature-registry"  # replace with target flow slug

# Criterion 1
echo "=== Criterion 1: Examination record ==="
cat docs/screen-examination/${SLUG}-examination.md 2>/dev/null \
  | grep -E "^WHO:|^VERB:|^GRAMMAR:|^FEEL:|overall_grade:" \
  || echo "MISSING or incomplete"

# Criterion 2
echo "=== Criterion 2: Design context ==="
wc -l docs/design-context/${SLUG}/.impeccable.md 2>/dev/null \
  || echo "MISSING"

# Criterion 3
echo "=== Criterion 3: FC-18 Audit Trail ==="
grep -E "Grammar type:|BLOCK findings:|SK-541 AUDIT:" \
  docs/ux-review/${SLUG}/FC-18-AUDIT-TRAIL.md 2>/dev/null \
  || echo "MISSING"
```

---

## Section 2 — Flow States

| State | Definition |
|-------|-----------|
| **NOT_STARTED** | No examination record exists |
| **PARTIAL** | Examination record exists but missing ≥1 required field, OR .impeccable.md absent, OR FC-18 Audit Trail absent/incomplete |
| **EXAMINED** | All three criteria met |
| **BLOCKED** | Open CFI prevents work — do not examine until CFI resolves |
| **APPROVED** | Examined + overall_grade = APPROVED |

An EXAMINED flow with grade NEEDS_REVISION is examined but not approved.
Work can continue on it — it counts toward examined count, not approved count.

An EXAMINED flow with grade NEEDS_PURPOSE_BUILT_UI requires a rewrite session
before it can reach APPROVED. It is examined; it is not done.

---

## Section 3 — Batch Structure

Fleet work is organised in 10 batches. A batch is not done until every flow
in it reaches EXAMINED state (CFI-blocked flows excepted).

| Batch | Flows | Count |
|-------|-------|-------|
| BATCH-01 | FLOW-01..FLOW-05 | 5 |
| BATCH-02 | FLOW-06..FLOW-10 | 5 |
| BATCH-03 | FLOW-11..FLOW-16 | 6 |
| BATCH-04 | FLOW-17..FLOW-21 | 5 |
| BATCH-05 | FLOW-22..FLOW-26 | 5 |
| BATCH-06 | FLOW-27..FLOW-31 | 5 |
| BATCH-07 | FLOW-32..FLOW-34 | 3 |
| BATCH-08 | FLOW-35..FLOW-40 | 6 |
| BATCH-09 | FLOW-41..FLOW-44 | 4 |
| BATCH-10 | FLOW-45..FLOW-48 | 4 |
| **Total** | | **48** |

Fleet work is not done until all 10 batches have at least one EXAMINED flow,
and all non-blocked flows in all batches have reached EXAMINED state.

**Batch-level done:** every non-blocked flow in the batch is EXAMINED.

**Fleet-level done:** all 10 batches are batch-level done.

---

## Section 4 — The Only Valid Fleet Progress Metric

```
Fleet progress = N_examined / (48 - N_blocked)
```

Where:
- `N_examined` = count of flows at EXAMINED state or better (including APPROVED)
- `N_blocked` = count of flows with open CFIs blocking examination
- The denominator `(48 - N_blocked)` = eligible fleet

**This is the only valid fleet progress metric.** Any other metric is a
session-level metric, not a fleet-level metric.

Examples of invalid fleet metrics:
- "Offenses reduced from 22 to 8" — session-level grep count, not fleet progress
- "5 flows improved this session" — session-level, not fleet progress
- "BATCH-08 is 50% done" — batch-level, not fleet-level progress
- "FC-18 passes on 12 flows" — structural gate, not fleet progress

Valid fleet progress statement format:
```
Fleet progress: [N_examined] of [48 - N_blocked] eligible flows examined
  ([N_examined / (48 - N_blocked) * 100]% of eligible fleet)
  Blocked: [N_blocked] flows — [list CFI IDs]
  Last updated: [date]
```

---

## Section 5 — Fleet-Level Done Conditions

Fleet UI/UX work is **done** when:

```
N_examined == (48 - N_blocked)
AND
N_blocked == 0 OR all blocked flows have a resolution date in their CFI
```

In other words: every flow is either EXAMINED or has a resolution path recorded
in its blocking CFI. Flows that remain BLOCKED indefinitely without a resolution
path are not "done" — they are abandoned.

**APPROVED vs DONE:**
- DONE means examined (all three criteria met, any grade)
- APPROVED means examined with grade = APPROVED
- Fleet can be "done" (all examined) before it is "all approved"
- Tracking both counts is required: N_examined and N_approved

---

## Section 6 — Batch Completion Verification

```bash
# Check examination record existence per batch
echo "=== BATCH-01: FLOW-01..05 ==="
for SLUG in onboarding subscription content marketplace social-graph; do
  if [ -f "docs/screen-examination/${SLUG}-examination.md" ]; then
    GRADE=$(grep "overall_grade:" docs/screen-examination/${SLUG}-examination.md \
            | head -1 | awk '{print $2}')
    echo "${SLUG}: ${GRADE:-INCOMPLETE}"
  else
    echo "${SLUG}: NOT_STARTED"
  fi
done
```

Repeat per batch using slugs from `planning--business-flows-registry.md`.

---

## Section 7 — Integration with SK-543, SK-544, SK-546

**SK-543 (work-scope-inventory):** SK-543 produces STATE.scope at session start.
SK-545 defines what the done/partial/not-started categories in STATE.scope mean.
The six-count protocol in SK-543 uses the criteria in this skill to classify flows.

**SK-544 (improvement-measurement-protocol):** SK-544's flow-level improvement
claims reference a flow's EXAMINED state — an unexamined flow cannot have a
verified improvement claim because it has no baseline (no examination record,
no .impeccable.md, no FC-18 Audit Trail to compare against).

**SK-546 (coverage-completeness-gate):** SK-546's "UI/UX fleet work is done"
claim type requires SK-545 completion criteria to be met for all non-blocked
flows. SK-545 defines the criteria; SK-546 enforces that the criteria are met
before the "done" claim fires at STOP.

---

## Section 8 — Work Priority Protocol

When multiple flows are available, work in this order:

1. **NOT_STARTED flows in incomplete batches** — the most valuable work:
   it advances batch completion and fleet coverage simultaneously
2. **PARTIAL flows** — already started; completing them is lower marginal cost
   than starting new ones
3. **EXAMINED flows needing revision** — (grade NEEDS_REVISION or
   NEEDS_PURPOSE_BUILT_UI) — important but does not advance fleet coverage count
4. **Re-examining APPROVED flows** — lowest priority; fleet is already served

Do not re-examine an APPROVED flow when NOT_STARTED flows exist in the same
or other batches. The fleet progress metric does not improve from re-examination.

---

## Section 9 — Anti-patterns

1. **"We've done 8 flows — that's good progress"** — fleet progress requires
   the denominator. 8 of 45 eligible flows is 17.8%. State it as such.

2. **"The examination record exists so the flow is done"** — existence is not
   sufficiency. All three criteria must be met. A record missing WHO or GRAMMAR
   is partial, not examined.

3. **"FC-18 passed so this flow is examined"** — FC-18 is Criterion 3 only.
   Criterion 1 (examination record with all fields) and Criterion 2 (.impeccable.md)
   must also be satisfied.

4. **"We'll come back to the blocked flows"** — blocked flows with no resolution
   path in their CFI are not deferred, they are abandoned. Every blocking CFI
   must have a resolution path recorded before the fleet can reach done.

5. **"BATCH-08 is done"** — a batch is done only when every non-blocked flow
   in it is EXAMINED. Check all flows in the batch before claiming batch-level done.

---

## Section 10 — Failure Modes This Skill Prevents

| Failure mode | How completion criteria catch it |
|--------------|----------------------------------|
| Hundreds of rounds on same 5 flows | Work priority protocol sends sessions to NOT_STARTED first |
| Fleet "done" without examining 30 flows | Fleet-level done requires N_examined == (48 - N_blocked) |
| Examination record exists but is empty | Criterion 1 requires all fields populated |
| Claiming batch done before all flows examined | Batch-level done definition requires every non-blocked flow |
| No resolution path for blocked flows | Fleet done condition requires resolution date in blocking CFI |

---

## Changelog

- **v1.0.0** — initial skill. Three-criterion minimum examined state; 10-batch
  structure; fleet progress metric N_examined/(48-N_blocked); fleet-level done
  conditions; work priority protocol; integration with SK-543/544/546;
  anti-patterns 1–5; failure-mode table.

---

## END OF SK-545
