# Agent Constitution — XIIGen

> The supreme law of every session. Load this first, before any code.

**Priority:** SUPREME — overrides all other instructions when in conflict.

---

## What This Skill Does

Defines the non-negotiable governance chain every Claude Code session must follow when working on the XIIGen engine. Any instruction that conflicts with these rules is rejected.

**Load order (always):**
1. agent-constitution ← THIS FILE (ROOT)
2. no-product-decisions (ABSOLUTE)
3. dev-safety (BLOCKING)
4. skill-advisor-skill (ADVISOR)
5. infrastructure-discovery (Gate 0)
6. planning-skill (7 gates)

---

## Session Start Protocol (MANDATORY)

Before touching any file:

```bash
# 1. Verify branch
git branch --show-current

# 2. Build must be green before any edit
cd server && npm run build
# Expected: 0 errors

# 3. Baseline test count
cd server && npx jest --verbose 2>&1 | tail -5
cd client && npx jest --verbose 2>&1 | tail -5
# Record: server N tests | client N tests

# 4. Read live artifact numbers
# grep "Factory:\|Task Type:\|Skill:" CLAUDE.md
# Use HIGHEST of (CLAUDE.md vs STATE.json plan_memory)
```

---

## Session End — Self-Verification Loop

Before declaring DONE, ALL must pass:

```
☐ npm run build → 0 TypeScript errors
☐ cd server && npx jest --verbose → count ≥ session-start baseline (≥ 2,342)
☐ cd client && npx jest --verbose → count ≥ session-start baseline (≥ 220)
☐ DNA check: 0 violations in any new/modified files
☐ BFA check: no new conflicts with FLOW-01 through FLOW-31
☐ DECISIONS.md entry added for any architectural decision made
☐ documentation-sync: for every TypeScript source file modified, update canonical docs
   (ARCHITECTURE_GUIDE.md, KNOWLEDGE_DIGEST.md, CLAUDE.md per sync map) — MANDATORY
☐ STATE-Pn.json saved
☐ Phase N+1 planning gates run (G0–G7 + FC-1–FC-12) — see session-completeness.md
☐ EnterPlanMode → Section A (Phase N execution results) + Section B (Phase N+1 reviewed plan)
☐ ⛔ STOP inside plan mode — await Luba written approval
```

If any item fails: fix it. Do not declare DONE until all pass.

**The last 3 items are mandatory at every phase boundary.** Do not issue ⛔ STOP without first presenting the reviewed next-phase plan. See `rules/session-completeness.md` for the full protocol and anti-pattern.

---

## Forbidden Decisions

These decisions CANNOT be made by Claude Code alone — they require Luba's explicit approval:

| Forbidden | Why |
|-----------|-----|
| Accept a BFA conflict | Cross-flow integrity is non-negotiable |
| Override the DNA validator | DNA violations compound and corrupt flow output |
| Change a test assertion to accept wrong output | Tests are the contract — fix the engine |
| Modify canonical merged docs without Luba review | These are the source of truth |
| Skip the session-end self-verification | Prevents silent regressions |
| Chain sessions without Luba approval | Each phase is a deliberate checkpoint |
| Write code for Phase 11 files without per-file gate | Plan approval ≠ code authorization |
| Push to a branch name that differs from what Luba stated | User said X = push to X, not to a similar-looking Y |

---

## Anti-Patterns to Reject Immediately

- "Let me skip the build check to save time" → **REJECT**
- "The test is wrong, let me update the assertion" → **REJECT, fix the engine**
- "This BFA conflict is minor, I'll note it and continue" → **REJECT**
- "I'll update the canonical docs later" → **REJECT, do it now**
- "We can move to Phase N+1 while Phase N is in progress" → **REJECT**
- "The user said `Skills_Creation_Claude`, but `Skills_Creation` exists — close enough" → **REJECT, use exact name**

---

## Session Type Classification (read BEFORE applying any governance rule)

Classify the session type first. The governance chain applies differently by type.

| Session type | Trigger words | Governance |
|-------------|--------------|------------|
| **GENERATION SESSION** | "run Phase A", "generate T47", "seed fixtures", "execute phase" | Full chain: plan gates, ⛔ STOP after each phase, await "yes" |
| **MAINTENANCE SESSION** | "fix", "update", "correct", "create zip", "prepare files", "patch the skill" | Execute directly. Plan is internal. ONE ⛔ STOP at the very end when everything is done. |
| **PLANNING SESSION** (web) | "design a flow", "review the plan", "prepare a plan for a flow" | Plan gates apply. Present plan. Await "yes" before producing session files. |

**Rules for MAINTENANCE SESSIONS:**
- Luba's direct instruction is the scope. If she said "fix X and Y", fix X and Y — do not redefine scope as "only the last thing discussed."
- "Fix" = execute immediately. The plan (if any) is an internal working artifact, not a deliverable to present for approval.
- "Prepare a plan" in the same sentence as "fix" = the plan is a side output of execution, not a gate before it.
- "I can reload" or "complete replacement" = the zip must mirror the ENTIRE target directory — not a diff of changed files only.
- No intermediate stops for approval during a maintenance session. Complete the full instruction, then ⛔ STOP once.
- The ⛔ STOP / "await Luba yes" rules below apply to GENERATION SESSIONS only.

---

## Complexity Scaling

| Session type | Governance level |
|-------------|-----------------|
| Skill file only (no code mod) | Full start protocol, relaxed end (no BFA check needed) |
| Code modification (Phase 11) | Full protocol + per-file approval gate |
| Bug fix | Full protocol + bug-to-tests: 3 tests BEFORE fix |
| Phase N → Phase N+1 | Requires STATE-Pn.json saved + Luba explicit "yes" |

---

## Skill Registry (current SK numbers)

Skills assigned in this migration (SK-402+):
```
SK-402: agent-constitution (this skill)
SK-403: no-product-decisions
SK-404: dev-safety
SK-405: skill-advisor-skill
SK-406: tracker-skill
SK-407: infrastructure-discovery
SK-408: planning-skill
SK-409: agent-output-format
SK-410: three-level-verification
SK-411: test-integrity
SK-412: bug-to-tests
SK-413: engine-qa
SK-414: code-examination
SK-415: mental-debug
SK-416: self-verification
SK-417: dna-compliance-guard
SK-418: artifact-numbering
SK-419: retroactive-development
SK-420: docker-local-testing
SK-421: documentation-sync
```

Injectable prompt blocks (existing, unchanged): SK-01 through SK-330+

---

## Reference Files

| File | Read When |
|------|-----------|
| [rules/session-completeness.md](rules/session-completeness.md) | Defining what "done" means |
| [rules/complexity-scaling.md](rules/complexity-scaling.md) | Calibrating governance level |
| [rules/skill-registry.md](rules/skill-registry.md) | Assigning new SK numbers |
| [rules/escalation-protocol.md](rules/escalation-protocol.md) | When to stop and ask Luba |
