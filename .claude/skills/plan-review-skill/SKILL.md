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

- BEFORE handing any plan to Claude Code
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
grep -n "claude-skill\|\.claude/skills" PLAN.md | head -10
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
# Check: artifact numbers from plan file vs live CLAUDE.md
# Check: test baseline is npx jest COUNT, not file count
# Check: line counts match wc -l output
```

### FC-7: Phase Placement Errors
A skill is in one phase in the Phase Map but a different phase in the deliverable block.

**Phase assignment matrix (all three must agree):**

| skill-name | Phase Map | Deliverable block | SESSION file |

### FC-8: Format Violations
Plan is formatted for human reading, not Claude Code execution.

**Claude Code handoff checklist:**
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
for f in PLAN.md SESSION-*.md docs/*.md .claude/skills/**/*.md; do
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

A plan is ready for Claude Code execution only after ALL THREE gates pass:

**Gate A — FC Checks** (Claude Code runs Steps 1–10 in SESSION-0)
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
| Conceptual placeholder in numbered list | 3 | Claude Code loads non-existent skill |
| Numbers from update targets mixed with new | 4 | Load order appears to have 24 skills instead of 18 |
| Adding a skill without updating all lists | 5 | Count says 23, B-0 generates 22 skill.yaml files |
| Using plan-time estimates for live counts | 6 | Gate passes on wrong baseline |
| Moving a skill without updating all three locations | 7 | SESSION builds in Phase 1; plan says Phase 3 |
| Sending a 1,100-line merged doc to Claude Code | 8 | Claude Code commits it as reference and stops |
| Generic requirement ("UI e2e") | 9 | Claude Code invents wrong definition |
| Fix in one doc, stale in others | 10 | Most frequent failure mode (30% of issues) |
| Phase header says 2 skills, deliverable has 3 | 11 | Count drift + phantom in execution |
| P1–P8 not answered | 12 | Principles violations shipped to production |
