---
name: plan-review-skill
version: "1.0.0"
sk_number: SK-410
priority: MANDATORY
load_order: 8
---

# Plan Review Skill — 12 Failure Classes + 3-Gate Approval

A plan with count drift costs more to fix than to prevent. This skill prevents it.

## Origin

Extracted from the XIIGen skill migration planning session (March 2026). The plan went through 7 review rounds and 23 corrections before reaching consistency. All 12 failure classes below were found repeatedly — not once — meaning they are structural failure modes, not one-off mistakes.

## When to Invoke

- BEFORE handing any plan to Codex
- BEFORE declaring a plan "ready for approval"
- AFTER any plan edit that touches a number, a phase, or a skill list

One pass of this skill before handoff = zero "fix the count" cycles during execution.

---

## The 12 Failure Classes

### FC-1: Count Drift
A number is updated in one place but not in all places that reference the same count.

**Detection:**
```bash
grep -n "19\b\|20\b\|23\b" PLAN.md | grep -i "skill\|yaml\|governance\|references all"
# Every hit must be the same target number
```

### FC-2: Path Errors
File paths in the plan don't match actual codebase convention.

**Detection:**
```bash
grep -n "Codex-skill\|\.Codex/skills" PLAN.md | head -10
find . -type d -name "skills" | head -5  # verify actual path
```

### FC-3: Phantom Skills
A skill appears in the numbered load order but no phase creates it.

**Detection:**
```python
# For each skill in load order 1–N, verify a phase creates it
# grep -c "skill-name" PHASE_MAP — if 0 matches → PHANTOM
```

### FC-4: Duplicate Numbers
The same position number appears twice in a numbered list.

**Detection:**
```bash
grep -n "^[ ]*[0-9]\+\." PLAN.md | awk '{print $1}' | sort | uniq -d
# Any output = duplicate numbers
```

### FC-5: Missing Items in Lists
A skill exists in the plan but is absent from one or more required lists.

**Skill presence matrix (every cell must be filled):**

| skill-name | Phase Map | Deliverable | Load Order | B-0 List | Count |
|------------|-----------|-------------|------------|----------|-------|

### FC-6: Stale Numbers
A number in the plan references an older version of live data.

**Detection:**
```bash
# Check: artifact numbers from plan file vs live AGENTS.md
# Check: test baseline is npx jest COUNT, not file count
# Check: line counts match wc -l output
```

### FC-7: Phase Placement Errors
A skill is in one phase in the Phase Map but a different phase in the deliverable block.

**Phase assignment matrix (all three must agree):**

| skill-name | Phase Map | Deliverable block | SESSION file |

### FC-8: Format Violations
Plan is formatted for human reading, not Codex execution.

**Codex handoff checklist:**
- [ ] `STATE.json` exists with `current_session: 0`
- [ ] `SESSION-N-*.md` files exist (one per phase)
- [ ] Each SESSION file has: STEP N, exact paths, code blocks, SESSION GATE, ⛔ STOP
- [ ] REFERENCE plan is labeled "Do not execute"
- [ ] No single file mixes analysis with execution

### FC-9: Requirement Ambiguity
A delivery requirement exists in the plan but has no project-specific "done" definition.

**Required definitions for XIIGen:**
- R1 compile + tests → `cd server && npm run build && npm test ≥ 2,342`
- R2c UI e2e → `@testing-library/react + @nestjs/testing = established convention`
- R2d docker → `fabric-coverage-matrix: ES+PG+SQS+LocalStack containers`
- R8 tracker → `ITrackerService + local-file default, FREEDOM swap`

### FC-10: Cross-Document Propagation Failure
A fix is applied to one document but the same fact exists in other documents that were not updated.

**After EVERY correction, sweep ALL documents:**
```bash
OLD="old_value"
for f in PLAN.md SESSION-*.md docs/*.md .Codex/skills/**/*.md; do
    count=$(grep -c "$OLD" "$f" 2>/dev/null || echo 0)
    if [ "$count" -gt "0" ]; then
        echo "STALE in $f: $count occurrence(s)"
    fi
done
```

### FC-11: Overview-Detail Phase Mismatch
The overview description of a phase lists different skills than the detailed deliverable block for the same phase.

**Detection:**
```python
import re
# For each phase: extract header skill list vs deliverable folder tree
# They must match exactly
```

### FC-12: Foundational Principles Compliance (P1–P8)
The plan does not explicitly answer the 8 gate questions from `xiigen-core-principles-skill`.

**Detection:**
```bash
for p in P1 P2 P3 P4 P5 P6 P7 P8; do
    count=$(grep -c "${p}:" PLAN.md || echo 0)
    if [ "$count" -eq "0" ]; then
        echo "FC-12: ${p} not addressed in plan"
    fi
done
```

**Gate passes when:** All 8 principles have explicit YES answers or Luba-signed N/A in the plan.

---

## The Review Protocol (10 steps)

**Step 1** — Build the Skill Presence Matrix (FC-5)
**Step 2** — Verify Phase Assignments (FC-7)
**Step 3** — Count All Numbers (FC-1)
**Step 4** — Verify Paths (FC-2)
**Step 5** — Check Load Order (FC-3, FC-4)
**Step 6** — Verify Source of Numbers (FC-6)
**Step 7** — Format Check (FC-8)
**Step 8** — Requirement Definitions (FC-9)
**Step 9** — Cross-Document Propagation Sweep (FC-10)
**Step 10** — Overview-Detail Match (FC-11) + Principles Compliance (FC-12)

---

## Passing Criteria — Three Gates Required

A plan is ready for Codex execution only after ALL THREE gates pass:

**Gate A — FC Checks** (Codex runs Steps 1–10 in SESSION-0)
Gate A passes when:
```
✅ FC-1:  Count grep — single number, all occurrences match
✅ FC-2:  Path grep — zero wrong-convention paths
✅ FC-3:  Phantom skills — every numbered skill has a creating phase
✅ FC-4:  Duplicate numbers — no number appears twice
✅ FC-5:  Skill Presence Matrix — zero empty cells
✅ FC-6:  Stale numbers — every live-state number has live-read protocol
✅ FC-7:  Phase placement — Phase Map = Deliverable = SESSION file
✅ FC-8:  Format — STATE.json + SESSION files + labeled REFERENCE
✅ FC-9:  Requirement definitions — every req has a project-specific done-definition
✅ FC-10: Propagation sweep — zero old-value hits across ALL documents
✅ FC-11: Overview-detail match — phase header list = deliverable block contents
✅ FC-12: Principles compliance — all 8 P-gate questions answered
```

**Gate B — AI Cross-Review** (2 independent models, different from the plan author)
Different models catch different things. This is the CROSS_VALIDATE pattern from skill-advisor-skill applied to plan review.

**Gate C — Luba Written Approval**
Luba reviews Gate A results + Gate B findings. Writes explicit approval. Session 1 does NOT start without this.

---

## Anti-Patterns Table

| Anti-pattern | FC | Real cost |
|---|---|---|
| "I updated the count" (in one place) | 1 | 4 re-review rounds |
| Copying a path from memory | 2 | 42 files in wrong location |
| Conceptual placeholder in numbered list | 3 | Codex loads non-existent skill |
| Numbers from update targets mixed with new | 4 | Load order appears to have 24 skills instead of 18 |
| Adding a skill without updating all lists | 5 | Count says 23, B-0 generates 22 skill.yaml files |
| Using plan-time estimates for live counts | 6 | Gate passes on wrong baseline |
| Moving a skill without updating all three locations | 7 | SESSION builds in Phase 1; plan says Phase 3 |
| Sending a 1,100-line merged doc to Codex | 8 | Codex commits it as reference and stops |
| Generic requirement ("UI e2e") | 9 | Codex invents wrong definition |
| Fix in one doc, stale in others | 10 | Most frequent failure mode (30% of issues) |
| Phase header says 2 skills, deliverable has 3 | 11 | Count drift + phantom in execution |
| P1–P8 not answered | 12 | Principles violations shipped to production |

---

## UNIVERSAL STANDARD ADDENDUM — Gate 0, FC-13, FC-14, Dishonest-Claim Rejection (ported from llm_mvp_core)

> Added by the Universal-Skills refresh (UpdateUniversalSkills). Source:
> `llm_mvp_core/docs/skills/plan-review-SKILL.md`. Additive to the 12 FCs above.
> The fuller treatment lives in `.agents/skills/planning/planning--plan-review-SKILL.md`
> (FC-1..FC-31 + this same addendum). TS adaptation: domain return type is
> `DataProcessResult<T>` (`server/src/kernel/data-process-result.ts`), tests are
> Jest + Playwright, fabric is NestJS DI.

**Gate 0 — Reviewer reads the plan itself.** A review is invalid if the reviewer
read only the author's report. Open the plan document AND every cited
`server/src/...:line` before any verdict. Parent/self review is not an independent
review. Record `reviewer_read_plan_document=true`, `reviewer_read_cited_refs=true`,
`writer_report_is_evidence_only=true`, and a real `reviewer_id`.

**FC-0 — Requirement traceability.** Every binding requirement maps to plan § +
Gate B (jest/playwright filter) + artifact. Removing an old mechanism is NOT
coverage for a required trainable replacement (name unit, state, checkpoint,
export/import, locator, fresh-load, continue-training, ablation). Unmapped or
contradicted requirement BLOCKS execution.

**FC-13 — Part A §0–§5, plain-language.** Plan not admissible unless Part A has:
§0 Mermaid classDiagram (draw.io-importable) with `note for` on EVERY class +
legend + all arrows; §1 algorithms in plain language (the operator's working language) naming exact CLASS + METHOD +
PARAMETERS + STEP-BY-STEP (functional spec + class name alone is NOT enough);
§2 description (analogy, init data, inference, "What it does NOT do", TS signature block);
§3 code-refs WHY/HOW/WHAT with `path:line`; §4 status table (working vs stub named).
A §1 that is only a functional spec, not plain prose in the operator's working language, = FAIL.

**FC-14 — Per-connection + per-branch simulation.** §0 carries one simulation row
per arrow (data_sent, example_input, expected_output, failure_case,
responsible class/method); §1 carries one row per branch (example_input →
expected `DataProcessResult.success/.failure`). Stub rows (`TBD`, `...`) = FAIL.
Part A ↔ Part B branch parity required (only Jest/Playwright filters, gate numbers,
CI/UI detail may differ in B).

**Dishonest Claim Rejection Gate.** "N review cycles" requires N INDEPENDENT
evidence packets (reviewer id, before/after refs, loaded gates, findings, fix refs,
recheck). Ledger rows ≠ cycles; parent/self ≠ sub-agent. Required downgrade
language when evidence is narrower: "This is a ledger/checklist, not a completed
cycle." / "The evidence supports only: <narrow claim>."

**Plan-Not-Ready = repair loop.** NEEDS_FIX means repair the plan then re-review;
it is not a stop and not "executor may proceed". "Do not stop" / old `next_action`
do not authorize execution while FC-13 or FC-14 is incomplete.
