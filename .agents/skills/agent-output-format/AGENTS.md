# AGENTS.md — Agent Output Format Skill v2.0
## For: Web sessions (claude.ai) producing deliverables for Claude Code

## The One Rule

> The human reads the analysis. Claude Code reads the instructions.
> They must be DIFFERENT FILES — and the instructions must be VALIDATED
> before Claude Code starts.

## When to Invoke

At the START of any web session where the user says anything like:
- "make plans for Claude Code"
- "Claude Code with Opus model"
- "capable to implement and test itself"
- "autonomous sessions"

Re-check BEFORE creating every deliverable file.

## The Checklist (run before every file)

1. Who consumes this file — Claude Code or human?
2. If Claude Code: numbered steps, exact paths, code blocks, gate commands, ⛔ STOP
3. If human: prose analysis is fine, but label it REFERENCE
4. Is analysis mixed with execution? → SPLIT into separate files
5. Does a STATE.json exist? → Claude Code needs to know which session is current
6. Does each session have its own file? → One file per session, not one file for all
7. Are gate commands literal? → From package.json, not paraphrased (npm vs yarn)
8. Are test baselines test COUNTS? → Not file counts (spec files ≠ tests)
9. Does SESSION-0 exist? → Plan review gate runs before Session 1

## Three-File Rule

Every handoff package needs at minimum:
- `docs/REFERENCE-PLAN.md` — human reads for context (labeled "Do not execute")
- `STATE.json` — Claude Code loads first (current_session, test_baselines)
- `SESSION-0-PLAN-REVIEW.md` — validates plan before Session 1 (12 FC checks)
- `SESSION-N-*.md` — one per phase, agent-executable

## What Claude Code CANNOT Execute

- A 479-line analysis document with code snippets scattered in prose
- A "comprehensive plan" with all sessions visible at once
- A README that says "when ready, begin Phase 1"
- Anything without explicit ⛔ STOP markers between sessions
- A perfectly formatted SESSION file with WRONG paths or counts (Anti-Pattern 4)

## What Claude Code CAN Execute

- `SESSION-0-PLAN-REVIEW.md` with 12 FC checks + Gate A/B/C
- `SESSION-1-GOVERNANCE.md` with Step 1, Step 2, Step 3, GATE, STATE, ⛔ STOP
- `STATE.json` with `current_session: 0`
- Separate reference docs it reads for context but doesn't try to "execute"

## The Flow

```
STATE.json (current_session: 0)
  → SESSION-0: FC checks → report → await Gate B + Gate C
  → SESSION-1: execute → gate (server AND client) → STATE → ⛔ STOP
  → SESSION-2: (only after Luba approves Session 1)
  → ...
```

## Why This Is a Web Session Problem

Web chat produces COMPLETE documents (all at once).
Claude Code needs INCREMENTAL instructions (one session at a time).
This skill forces web session output into Claude Code's execution format.
plan-review-skill validates the CONTENT. This skill validates the FORMAT.
