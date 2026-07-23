---
name: plan-review-skill
version: "2.0.0"
sk_number: SK-410
priority: MANDATORY
load_order: 8
updated: "2026-04-16"
supersedes: "1.0.0"
---

# Plan Review Skill — 14 Failure Classes + 3-Gate Approval

A plan with count drift costs more to fix than to prevent. A plan that misses the user's goals costs even more — v27 of User Journey Reconnection shipped 3 of 4 goals unmapped after 22 review rounds. This skill prevents both.

## Origin

v1.0 extracted from the XIIGen skill migration planning session (March 2026). The plan went through 7 review rounds and 23 corrections before reaching consistency. All 12 original failure classes (FC-1..FC-12) below were found repeatedly — not once — meaning they are structural failure modes, not one-off mistakes.

v2.0 extends the battery after XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). Retrospective analysis of v1-v27 of User Journey Reconnection showed that FC-1..FC-12 catch internal consistency failures (count drift, path errors, format violations) but do NOT catch coverage failures (goal unmapped, artifact empty). v27 passed 22 arbiter rounds with 55 findings applied on FC-1..FC-12 and shipped missing 3 of 4 user goals because no failure class checked goal delivery. FC-14 and FC-15 close that gap and run FIRST — before FC-1..FC-12 — because internal consistency of the wrong plan is still the wrong plan.

## When to Invoke

- BEFORE handing any plan to Claude Code
- BEFORE declaring a plan "ready for approval"
- AFTER any plan edit that touches a number, a phase, or a skill list
- **(NEW v2.0)** AFTER any plan edit that touches a goal, a turn, or a referenced artifact — re-run FC-14 and FC-15

One pass of this skill before handoff = zero "fix the count" cycles during execution.
**One pass with FC-14/15 = zero "shipped the plan, missed the goals" failures.**

---

## PRECEDENCE RULE (new v2.0)

FC-14 and FC-15 run FIRST. If either returns BLOCK, FC-1..FC-12 are not evaluated — the plan is rejected for coverage reasons before correctness reasons are audited.

```
Order of evaluation:
  FC-14  (Goal Delivery Completeness — governed by SK-534)
  FC-15  (Design Artifact Populated — governed by SK-537)
      ↓ (only if both PASS or CHALLENGE)
  FC-1 through FC-12 (internal consistency checks)
```

Rationale: a plan whose internal consistency is strong but whose goal coverage is incomplete is still the wrong plan. FC-1..FC-12 audit correctness. FC-14/15 audit whether the plan should exist in its current shape at all. Correctness review of the wrong shape is wasted effort.

---

## The 14 Failure Classes

### FC-14: Goal Delivery Completeness (NEW v2.0 — RUNS FIRST)

A plan that is internally consistent, codebase-grounded, and governance-compliant can still silently miss the user's stated goals. v1-v27 of the User Journey Reconnection plan shipped with 3 of 4 goals unmapped after 22 arbiter rounds found nothing wrong with FC-1..FC-12. FC-14 is the gate that catches this class.

**Governance:** SK-534 Goal Delivery Completeness Arbiter (MANDATORY)

**Inputs (strict isolation):**
- User's goal statement verbatim from `STATE.goalContext.statement` (loaded by SK-536)
- Plan's turn list (just turn names and 1-line purposes)

**Detection protocol (5 steps, executed by SK-534):**

1. Decompose goal statement into discrete goal elements (GE-1, GE-2, ...)
2. Parse plan turns (T1, T2, ...)
3. Build Goal → Turn(s) mapping table
4. Verify every mapped goal has a verification step (round-trip reference, acceptance test, or concrete observable)
5. Produce verdict table with per-goal classification

**Output format:**

```
| Goal | Mapped to turn(s) | Verification step | Verdict |
|------|-------------------|-------------------|---------|
| GE-1 | T1, T3            | round-trip step 2 | APPROVED |
| GE-2 | —                 | —                 | BLOCK_UNMAPPED |
```

**Verdict classes:**
- APPROVED — goal mapped + verification specified
- BLOCK_UNMAPPED — goal has zero turns assigned
- BLOCK_UNVERIFIED — goal has turns but no verification
- CHALLENGE — turn assignments are ambiguous

**Failure = any BLOCK.** Plan is rejected; FC-1..FC-12 do not execute.

### FC-15: Design Artifact Populated (NEW v2.0 — RUNS FIRST)

A plan that references existing design artifacts may be treating empty-but-present files as done. The 10-of-14 empty topology finding is the canonical example: files existed, contents were empty, every skill that checked "is X documented" saw YES. FC-15 catches this by verifying artifact completeness before treating artifacts as inputs.

**Governance:** SK-537 Design Artifact Completeness (MANDATORY)

**Detection protocol (per referenced artifact):**

1. Identify every design artifact the plan references (contracts, topologies, design-reasoning, arbiters NDJSON, event-schemas)
2. Run SK-537's Checks 1-4 per artifact:
   - C1: Files exist
   - C2: Fields populated (non-empty required fields)
   - C3: Content specific (not copy-pasted across flows)
   - C4: Matches implementation
3. Check 5 (seeded to RAG) is informational, not blocking
4. Fail plan if any referenced artifact fails Check 1 or Check 2

**Output format:**

```
| Artifact | C1 | C2 | C3 | C4 | Status |
|----------|----|----|----|----|--------|
| contracts/topologies/flow-X.topology.json | ✅ | ❌ | — | — | BLOCK_EMPTY |
| contracts/flow-Y.contract.json | ✅ | ✅ | ✅ | ✅ | PASS |
```

**Verdict classes:**
- PASS — all referenced artifacts usable as design input
- BLOCK_EMPTY — ≥1 referenced artifact has empty required fields (Check 2 FAIL)
- BLOCK_MISSING — ≥1 referenced artifact does not exist (Check 1 FAIL)
- CHALLENGE — ≥1 artifact has Check 3 or Check 4 failures (surface, not block)

**Failure = BLOCK_EMPTY or BLOCK_MISSING.** Plan either enriches artifacts first, or explicitly scopes around them with SK-531 claim-as-hypothesis deferral.

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

## The Review Protocol (12 steps — updated v2.0)

**Step 0 — Goal Delivery + Artifact Populated FIRST (NEW v2.0)**
- FC-14 — Goal Delivery Completeness (SK-534)
- FC-15 — Design Artifact Populated (SK-537)
- If either BLOCKs, STOP. Do not proceed to Steps 1-11. Plan is rejected for coverage.

**Step 1** — Build the Skill Presence Matrix (FC-5)
**Step 2** — Verify Phase Assignments (FC-7)
**Step 3** — Count All Numbers (FC-1)
**Step 4** — Verify Paths (FC-2)
**Step 5** — Check Load Order (FC-3, FC-4)
**Step 6** — Verify Source of Numbers (FC-6)
**Step 7** — Format Check (FC-8)
**Step 8** — Requirement Definitions (FC-9)
**Step 9** — Cross-Document Propagation Sweep (FC-10)
**Step 10** — Overview-Detail Match (FC-11)
**Step 11** — Principles Compliance (FC-12)

**Ordering rule:** Step 0 before Steps 1-11. No exceptions. Auditing internal consistency of a plan that misses goals is wasted effort.

---

## Passing Criteria — Three Gates Required

A plan is ready for Claude Code execution only after ALL THREE gates pass:

**Gate A — FC Checks (Claude Code runs Step 0 first, then Steps 1–11)**

Gate A passes when:
```
(New v2.0 — run FIRST)
✅ FC-14: Goal Delivery — every user goal mapped to ≥1 turn with verification
✅ FC-15: Artifact Populated — every referenced artifact passes SK-537 Checks 1-2

(Existing FC-1..FC-12 — run only if FC-14 and FC-15 PASS)
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
| **(NEW v2.0)** Plan is internally consistent but misses a stated goal | **14** | **Most common failure mode post-governance — shipped missing goals** |
| **(NEW v2.0)** Plan references existing artifact that is empty (nodes:[]) | **15** | **v27's 10-of-14 failure — plan built on empty fixtures** |
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

---

## Worked Examples (NEW v2.0)

### Example — FC-14 catches v27 at review round 1

**User goal statement (verbatim):** "I want: (1) design simulation, teach/QA produce decision flows visible in user's flow menu; (2) teach/QA workflow visible to each user; (3) each flow reflected in tenant admin panel, private to tenant; (4) each tenant can adapt and export flows through marketplace."

**v27 plan turns (abbreviated):**
- T1–T7: fabric infrastructure
- T8–T10: adapter wiring
- T11: subflow capture
- T12: marketplace packaging (no session file)
- T13–T15: more infrastructure

**FC-14 processing:**
- GE-1 (design sim → flow menu): T1–T11 partial, mixed verification → CHALLENGE
- GE-2 (teach/QA workflow visible): no turn assigned → **BLOCK_UNMAPPED**
- GE-3 (admin panel + tenant private): no turn assigned → **BLOCK_UNMAPPED**
- GE-4 (marketplace export): T12 only, no session file, no verification → **BLOCK_UNVERIFIED**

**FC-14 verdict: BLOCK.** Plan rejected at review Step 0. FC-1..FC-12 do not execute.

**Under v1.0:** v27 advanced past FC-1..FC-12 (internal consistency was fine) and accumulated 22 arbiter rounds before shipping.
**Under v2.0:** v27 fails Step 0 in 2 minutes. Plan returns to author with "3 of 4 goals unmapped" — specific, actionable, before any other review work begins. ~21 review rounds saved.

### Example — FC-15 catches the 10-of-14 empty topology gap

**Plan references:**
- `contracts/topologies/feature-gating.topology.json` (for Turn 3)
- `contracts/topologies/analytics-event-capture.topology.json` (for Turn 5)
- 12 other topology files (for various turns)

**FC-15 processing:**
- C1 (files exist): all 14 PASS
- C2 (fields populated): 4 PASS, 10 FAIL — `nodes: []`
- Referenced artifacts with Check 2 FAIL: 10 of 14

**FC-15 verdict: BLOCK_EMPTY.** Plan rejected at review Step 0.

**Resolution options:**
1. Add a "Enrich 10 empty topology files" task as Task 1 — populates before downstream turns use them
2. Explicitly scope around the 10 empty flows with SK-531 DEFERRED (Luba approval)

Under v1.0: empty files look fine to FC-1..FC-12 (they exist, paths are right). Execution would fail silently on the 10 empty references.
Under v2.0: FC-15 catches at review time.

---

## Backward Compatibility — v1.0 → v2.0

Plans approved under v1.0 that passed FC-1..FC-12 may still fail v2.0's FC-14 or FC-15. This is expected — v2.0 checks dimensions v1.0 did not.

### Re-reviewing a v1.0-approved plan under v2.0

- **If FC-14 BLOCKs:** the plan has unmapped goals that v1.0 could not detect. Add turns to cover the goals, OR explicitly scope out the unmapped goals with Luba approval (Luba signs a deferral per SK-531 DEFERRED protocol).
- **If FC-15 BLOCKs:** the plan depends on empty design artifacts. Either enrich the artifacts first (adds tasks), OR explicitly scope around them.
- **If both FC-14 and FC-15 PASS:** plan remains approved. v1.0 approval unchanged. Proceed to FC-1..FC-12 (which were already PASS under v1.0).

### v27 of User Journey Reconnection — retrospective

- Approved under v1.0 after 22 review rounds.
- Re-reviewed under v2.0: FC-14 BLOCK (3 of 4 goals unmapped), FC-15 BLOCK (10 of 14 empty topology references).
- Required remediation before v2.0 approval: cover the 3 unmapped goals OR defer them explicitly; enrich 10 empty topologies OR scope around them.

### In-flight reviews under v1.0

- May complete under v1.0 if Luba approves.
- Next review cycle adopts v2.0.

---

## Integration Notes (NEW v2.0)

- **SK-534 Goal Delivery Completeness Arbiter:** governs FC-14. Runs FIRST with exactly two inputs (goal statement + turn list). Four verdict classes (APPROVED / BLOCK_UNMAPPED / BLOCK_UNVERIFIED / CHALLENGE).

- **SK-537 Design Artifact Completeness:** governs FC-15. Five checks per artifact (files exist, fields populated, content specific, matches impl, seeded). Checks 1-2 are blocking; 3-4 are surfacing; 5 is informational.

- **SK-536 Goal Context Persistence:** provides the verbatim user goal statement that FC-14 uses. Plans reviewed without STATE.goalContext set cannot pass FC-14 — the arbiter returns CANNOT_EVALUATE.

- **SK-533 MVP Round-Trip Verification:** provides the verification step vocabulary (round-trip step references). FC-14's "Verification step present" column accepts round-trip step references for tenant-facing work.

- **SK-531 Claim-as-Hypothesis:** provides the DEFERRED verdict mechanism. When FC-14 returns BLOCK_UNMAPPED, the resolution can be an explicit deferral of the unmapped goal via SK-531 — provided Luba approves the deferral.

- **Rule 31 in SESSION-LOAD-PLAN-v23:** multi-goal plans must declare lanes. FC-14 runs per-lane when lanes are declared.

- **Gate 0g in CODE-REVIEW-PROTOCOL-v1.3 (Phase 09):** Code review's gate that invokes SK-534. FC-14 and Gate 0g share governance; they are the same skill applied at different review moments (plan-review-skill time vs code-review time).

---

## END OF SK-410 v2.0
