# AGENTS.md — How to Prepare a Plan for Claude Code

## Load This Skill When
User says anything like:
- "make a plan for Claude Code"
- "prepare a plan"
- "how do I plan a session"
- "instructions for autonomous"
- Start of any web session producing work for Claude Code

## The 5 Sub-Skills — In Order

```
1. agent-output-format-skill         ← FIRST. Declares consumer. Locks format.
2. xiigen-core-principles-skill      ← Gate 0: 8 principles, 32 items. BEFORE discovery.
3. infrastructure-discovery          ← Verifies codebase facts before writing plan.
4. planning-skill                    ← Validates plan content (8 gates).
5. plan-review-skill                 ← Validates plan structure (FC-1 to FC-12).
```

Never reorder. Never skip. Never combine steps from different skills.

## The Critical Ordering Rule

`agent-output-format-skill` must be invoked at the START of the session,
before any analysis or discovery begins. It is NOT a final formatting step.

`xiigen-core-principles-skill` is Gate 0 — runs immediately after format is
declared, BEFORE infrastructure discovery. All 8 principles must have explicit
design answers before any content is written.

**Wrong:** Write the plan → format it at the end
**Right:** Declare format → check 8 principles → discover → plan → review

## The 3-Gate Approval

After all 5 skills complete, three gates must pass before Session 1 starts:

```
Gate A: Claude Code runs SESSION-0 (FC-1 to FC-12) → produces report
Gate B: 2 AI models (different from plan author) review independently
Gate C: Luba reads Gate A + Gate B → writes explicit approval
```

Session 1 starts only after Gate C.

## What Claude Code Receives

```
STATE.json                 current_session: 0
SESSION-0-PLAN-REVIEW.md  FC checks (Claude Code runs this first)
SESSION-1-*.md             first executable phase
docs/REFERENCE-PLAN.md    context (labeled: do not execute)
```

## Quick Diagnostic — Which Skill Catches What

| Symptom | Which skill failed |
|---------|-------------------|
| Wrong file paths (.claude-skill/ instead of .claude/skills/) | infrastructure-discovery |
| Wrong test counts (files not tests) | infrastructure-discovery |
| Plan solves the wrong problem | planning-skill gate 1-7 |
| Count is 19 everywhere but should be 20 | plan-review FC-1 |
| Skill in load order but no phase creates it | plan-review FC-3 |
| Fix applied but stale value persists in other docs | plan-review FC-10 |
| Phase 4 header says 2 skills, deliverable has 3 | plan-review FC-11 |
| Plan has no tenant_id design, no versioned prompts, no local RAG | xiigen-core-principles Gate 0 (FC-12) |
| Claude Code commits analysis doc instead of executing | agent-output-format |
| Session 1 starts without Luba approval | Gate C missing |
