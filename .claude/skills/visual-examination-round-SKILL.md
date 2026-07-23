---
name: visual-examination-round
sk_number: SK-550
version: "1.0.0"
priority: MANDATORY
load_order: 5.7
category: planning
author: luba
updated: "2026-04-21"
contexts: ["claude-code"]
description: >
  Multi-round visual examination protocol for fleet-level UI/UX improvement.
  Defines: baseline capture before any scoring, systemic-fix-before-per-cell
  discipline, round-over-round scoring, dual convergence criterion
  (score-delta < 1% AND primary-cells-examined = 100%), and per-round
  deliverables. Prevents the "-63.6% improvement" failure where a session
  reported improvement without a baseline across the full fleet.
  Also prevents the V-R7 failure where convergence was declared because the
  grep score reached 0, while functional content (Axis D) was never validated.
triggers:
  - "visual round"
  - "fleet UX audit"
  - "UX improvement round"
  - "rescore flows"
  - "PNG examination round"
  - "V-R"
  - "visual examination"
  - "fleet visual"
---

# Visual Examination Round Skill (SK-550)

## Purpose

Govern one round of fleet-wide visual examination. A "round" is a bounded
improvement cycle: baseline → systemic fixes → per-cell fixes → rescore →
convergence check. Rounds cannot skip the baseline. Improvement claims cannot
be made until the baseline exists for the scope being claimed.

**Why this skill exists:** The V-R7 failure: convergence declared because the
grep score reached 0, but 30 flows had never been examined with SK-549 Axis D.
The automated score measures grep-countable patterns; it cannot measure whether
the screen shows correct functional content. This skill adds the second
convergence condition — full cell coverage — that the automated score cannot.

---

## The Examination Matrix

Every leaf cell is one examinable unit:

```
FLOW-XX (48 total)
  └── Screen (each page component)
      └── Language (en / he-RTL / fr)
          └── Role (anonymous | tenant-user | tenant-admin |
                    platform-admin | platform-support |
                    freelancer | business-partner |
                    event-organiser | referral-user |
                    public-marketplace-visitor)
              └── Business-logic phase (flow-specific from P1)
                  └── State (empty | loading | populated | error | success)
```

**Priority cells (must be examined before any convergence claim):**
- Primary cell = flow × primary role × en × populated state
- Every flow must have its primary cell examined before the round closes

**World-facing flows (G5/G3 consumer surfaces):** examine at 3 viewports
(mobile 412px, tablet 820px, desktop 1440px). Internal admin flows: desktop
first, verify graceful degradation at ≥1024px.

---

## Pre-Round: Establish Scope with SK-543

Before the round begins, run SK-543 (work-scope-inventory) to establish STATE.scope:

```
STATE.scope:
  total_flows: 48
  flows_in_this_round: N  (which flows this round will touch)
  primary_cells_not_yet_examined: N  (from SK-551 coverage matrix)
  flows_needs_purpose_built_ui: N  (from examination records)
  flows_blocked_cfi: N  (FLOW-04, FLOW-09, FLOW-34)
```

A round that begins without STATE.scope cannot make fleet-level claims.

---

## Round Structure

### Phase 1 — Baseline Capture

**Rule: no improvement claims before a baseline exists.**

Capture representative PNGs for each flow in scope. For each captured PNG, run
SK-549 to produce a template block. Record in SK-551 coverage matrix.

Baseline minimum per flow:
- Primary cell (primary role × en × populated) captured and SK-549 block written
- Examination record present at `docs/screen-examination/{slug}-examination.md`

```bash
# Capture PNGs via Playwright
npx playwright test client/e2e/ --reporter=list

# Check which flows have examination records
ls docs/screen-examination/*-examination.md | wc -l

# Check SK-551 coverage matrix for NOT_YET_EXAMINED
python3 - << 'EOF'
import json
matrix = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
not_examined = [
  f for f, data in matrix.get('flows', {}).items()
  if any(c.get('current_verdict') == 'NOT_YET_EXAMINED'
         for c in data.get('cells', []))
]
print(f"NOT_YET_EXAMINED flows: {len(not_examined)}")
for f in not_examined:
    print(f"  {f}")
EOF
```

If baseline is incomplete → do not proceed to Phase 2. Extend baseline first.

### Phase 2 — Systemic Fixes

Fix patterns that affect many PNGs with a single code change. Always fix
systemic issues before per-cell issues — otherwise you paper over the same
leak 40 times.

Common systemic patterns (from fleet history):

| Pattern | Scope | Fix |
|---------|-------|-----|
| CRUD table on tenant/public page (UX-30) | Many flows | Purpose-built domain screen |
| AppShell chrome wrong for role | Many flows | isConsumerShell gate |
| Engineering identifiers in user copy | Many flows | Plain-language sweep |
| Physical direction classes (RTL failures) | Many flows | Logical properties sweep |
| SCREAMING_SNAKE enum values visible | Many flows | Presenter layer mapping |
| Hero metric template | Many flows | Summary-row replacement |

**Systemic fix identification:**
```bash
# UX-30 candidates
grep -rl "api/dynamic/xiigen-" client/src/pages/ | xargs grep -l "<table\|TableRow"

# Engineering leak sweep
grep -rn "BFA\|DNA-[1-9]\|arbiter\|ENGINE_INTERNAL\|T[0-9]{3}\b\|CF-[0-9]{3}\b" \
  client/src/pages/ --include="*.tsx" | grep -v "// \|/\*\*\|{/\*" | wc -l

# RTL failures
grep -rn "text-left\|text-right\|\bml-\|\bmr-\|left-[0-9]\|right-[0-9]" \
  client/src/pages/ --include="*.tsx" | wc -l
```

Document each systemic fix with:
- Which pattern it addresses
- How many flows it affects
- The commit hash
- Which SK-549 axes it clears

### Phase 3 — Per-Cell Fixes

After systemic fixes are committed, address remaining per-cell issues using
SK-549 to identify what each cell still fails.

**One finding per run discipline** (from REPAIR-GUIDANCE §8): fix one finding
per Claude Code run. Prevents compounding regressions and keeps each PNG
cleanly attributable to one change.

Per-cell fix record format:
```
Finding: {classification} for {slug} / {PageName} / {role} / {state}
Source evidence: {SK-549 axis that failed + specific observation}
Fix: {one specific code change}
PNG gate: {role} × {state} using ?mock={key} must pass SK-549 overall
```

### Phase 4 — Rescore

After fixes are committed, recapture PNGs and re-run SK-549 for changed cells.
Update the SK-551 coverage matrix.

**Rescore scope:** only cells that had fixes applied this round. Do not re-examine
cells that had no changes — carry forward their prior verdicts.

**Exception:** if a systemic fix touched many components, rescore a representative
sample of cells that should have improved.

```bash
# Rescore command
npx playwright test client/e2e/ --reporter=list

# Update coverage matrix for rescored cells
# (run SK-549 per changed cell, update SK-551)
```

### Phase 5 — Convergence Check

The round converges when **both** conditions hold:

**Condition 1 — Score delta < 1%:**
```bash
bash scripts/ux-quality-score.sh
# Compare to prior round score in ROUND-CONVERGENCE.json
# If (prior_score - current_score) / prior_score < 0.01 → condition 1 met
```

**Condition 2 — Primary cells examined = 100%:**
```bash
# Every flow's primary cell (primary role × en × populated)
# must have overall ≠ NOT_YET_EXAMINED in SK-551 matrix
python3 - << 'EOF'
import json
matrix = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
not_covered = []
for slug, data in matrix.get('flows', {}).items():
    cells = data.get('cells', [])
    primary = [c for c in cells
               if c.get('language') == 'en'
               and c.get('state') == 'populated'
               and c.get('current_verdict') != 'NOT_YET_EXAMINED']
    if not primary:
        not_covered.append(slug)
print(f"Flows without examined primary cell: {len(not_covered)}")
for f in not_covered:
    print(f"  {f}")
EOF
```

**Condition 3 — NEEDS_PURPOSE_BUILT_UI flows have Axis D PASS:**
```bash
# For each flow with NEEDS_PURPOSE_BUILT_UI in its examination record,
# verify SK-549 Axis D = PASS in the coverage matrix
python3 - << 'EOF'
import json, os, glob
matrix = json.load(open('docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json'))
needs_purpose_built = []
for f in glob.glob('docs/screen-examination/*-examination.md'):
    content = open(f).read()
    if 'NEEDS_PURPOSE_BUILT_UI' in content:
        slug = os.path.basename(f).replace('-examination.md', '')
        needs_purpose_built.append(slug)

print(f"Flows needing purpose-built UI: {len(needs_purpose_built)}")
for slug in needs_purpose_built:
    flow_data = matrix.get('flows', {})
    matching = [k for k in flow_data if slug in k]
    if matching:
        cells = flow_data[matching[0]].get('cells', [])
        axis_d_pass = any(
            c.get('axis_d_verdict') == 'PASS'
            for c in cells
            if c.get('state') == 'populated'
        )
        status = "✅ Axis D PASS" if axis_d_pass else "❌ Axis D not verified"
        print(f"  {slug}: {status}")
    else:
        print(f"  {slug}: ❌ no matrix entry")
EOF
```

If all three conditions hold → round converges. Declare convergence.
If any condition fails → continue with per-cell fixes and rescore.

---

## Per-Round Deliverables

Every round must produce:

1. `docs/screen-examination/VISUAL-ROUND-{N}-SCORES.md`
   Per-round offence counts per flow per axis. Includes:
   - Flows rescored this round (with before/after)
   - Flows carried forward (prior verdict + reason not rescored)
   - Aggregate score + delta + improvement percentage

2. Update to `docs/screen-examination/ROUND-CONVERGENCE.json`
   Add new round entry with:
   - commit hash
   - offences_v2_user_visible breakdown
   - score_v2
   - delta_vs_prev
   - improvement_pct
   - convergence status (CONVERGED if both conditions met, else IN_PROGRESS)
   - primary_cells_examined count

3. Updated `docs/screen-examination/ROUND-2-COVERAGE-MATRIX.json`
   Via SK-551 — updated cell verdicts for all rescored cells.

4. Per-round commit trail
   Every commit tagged with: FLOW-XX, RUN-NN, which SK-549 axes it addresses.

---

## Improvement Claim Rules

**Flow-level claim** ("this flow improved"):
- Requires: SK-549 block with overall = PASS for at least the primary cell
- Does NOT require: all cells examined

**Grammar-level claim** ("all G3 card-list flows improved"):
- Requires: SK-549 primary cell PASS for every flow in that grammar group

**Fleet-level claim** ("fleet UI/UX improved"):
- Requires: SK-543 denominator established AND primary cells examined
  for ≥20% of non-blocked flows
- Does NOT require: full convergence

**Convergence claim** ("fleet is converged"):
- Requires: all three convergence conditions above

Extrapolating unchecked flows as "assumed similar" to checked flows is not
a valid fleet-level claim. State the actual examined count explicitly:
"N of M flows examined (X%)" per SK-546.

---

## The V-R4 Automation Score Trap

The automated score (ROUND-CONVERGENCE.json v2) measures:
- Engineering acronym leaks in user-visible copy
- AI-slop patterns (hero metric, side-stripe, etc.)
- Physical direction classes

It does NOT measure:
- Whether the screen shows the correct functional content (Axis D)
- Whether the correct role sees the right content (Axis B)
- Whether the grammar is correctly implemented with domain data (Layer 4)

**The trap:** if all grep-countable axes reach 0, the automated score
declares convergence. But a screen can score 0 and still be a CRUD table
(Axis D failure) or show the wrong role branch (Axis B failure).

This skill adds Condition 2 and 3 to the convergence check specifically to
prevent this. Score-delta < 1% alone is not convergence.

---

## Anti-Patterns

```
❌ Starting a round without a baseline
   → Improvement claims require knowing what you improved FROM.
     Run Phase 1 before Phase 2.

❌ Rescoring only the flows you fixed
   → Per SK-546: claim scope must match evidence scope.
     You can only claim improvement for flows you rescored.
     Carry-forward flows are estimates, not audits.

❌ Declaring convergence when Condition 2 is not met
   → Primary cells NOT_YET_EXAMINED means convergence is on the
     automatable subset. Not on functional quality.

❌ Fixing per-cell issues before systemic issues
   → You will make the same fix 40 times. Identify the pattern first.
     One systemic fix clears many cells.

❌ Counting grep-score improvement as a UI improvement
   → Grep scores measure code text, not rendered pixels.
     A screen can have 0 grep offences and still be unusable.
     Pair every grep improvement with SK-549 Axis D evidence.
```
