---
name: context-overflow-skill
version: "1.0.0"
sk_number: SK-429
priority: MANDATORY
load_order: 29
---

# Context Overflow Skill

Prevents silent truncation at context limit. Codex monitors context usage and triggers a clean session-end protocol before the window fills, rather than hitting the wall mid-task.

## The Problem

Without monitoring, Codex at 28% remaining context will continue a complex task, produce a truncated Section A, drop Section B entirely, and stop mid-sentence. STATE.json is not saved. The next session has no clean handoff point.

## Three-Threshold Protocol

After every tool call, check the remaining context percentage:

| Threshold | Action |
|-----------|--------|
| > 35% remaining | Continue normally |
| ≤ 35% remaining | **Wrap-up mode**: complete only the current in-progress step. Do not start any new step that cannot finish in ≤ 3 tool calls. |
| ≤ 25% remaining | **Emergency stop**: stop immediately. Run end-of-session protocol now — even if the session is not complete. |

## Emergency Stop Protocol (≤ 25%)

1. Save current progress to STATE.json with `status: "INCOMPLETE"` and `completed_steps: [...]` and `remaining_steps: [...]`
2. Output Section A with partial results clearly marked: `"STATUS: INCOMPLETE — context limit reached at step N"`
3. Output Section B for the NEXT session as planned (if context allows) OR state "Context exhausted — Section B omitted"
4. ⛔ STOP — Luba restarts in a new session

## Wrap-Up Mode Rules (≤ 35%)

- Finish writing the current file if already started
- Do NOT start writing a new test file
- Do NOT start a new governance fix if not already in progress
- DO run the current test if the file was just written (single tool call)
- DO update STATE.json (single tool call)
- Then run end-of-session protocol

## Implementation Note

Codex does not have direct access to context percentage. Proxy indicators:
- Conversation has run > 60 tool calls in this session → assume approaching 35%
- Context compaction warnings appear in system messages → approaching limit
- User says `/clear` was triggered → always start fresh, load STATE.json first

## Integration

- Invoked by agent-constitution at every major step boundary (after each file write, after test run)
- Results logged to STATE.json `context_usage` field if approaching threshold
- Pairs with debug-session-skill: if emergency stop triggers mid-debugging, the debug session file preserves state

---

## Universal Bits (UUS G07) — three thresholds + Session Resumption Protocol (node pipeline)

These are the universal cross-project bits this skill must carry (imported from core via the universal-skills mapping), TS-adapted for the mvp stack (NestJS + React, Jest/Playwright).

### Three thresholds (universal)

- **> 35% remaining** → continue normally.
- **≤ 35% remaining** → wrap-up: finish the current step only, save STATE with `status: "PAUSED_CONTEXT_LIMIT"`, and record a Resume-From pointer. Do not start a step that cannot finish in ≤ 3 tool calls.
- **≤ 25% remaining** → emergency stop: stop immediately and run the end-of-session protocol now, even if incomplete, committing what exists.

(The table above is the mvp implementation; this is the portable statement. Use `status: "PAUSED_CONTEXT_LIMIT"` for the wrap-up pause so the next session recognizes the resumable state.)

### Session Resumption Protocol (run at session START)

At the start of every session, before any new work, check for a paused/incomplete prior state and resume cleanly. Resume steps are the **node pipeline**, not `dotnet build/test`:

```bash
# 1. Confirm branch / worktree:
git branch --show-current

# 2. Restore dependencies and build (node, not dotnet):
cd server && npm ci && npm run build
cd client && npm ci && npm run build      # if the project has a client

# 3. Re-establish the Jest baseline before continuing:
cd server && npx jest 2>&1 | grep "Tests:" | tail -1
cd client && npx jest 2>&1 | grep "Tests:" | tail -1

# 4. Load STATE.json → if status is PAUSED_CONTEXT_LIMIT or INCOMPLETE,
#    continue from completed_steps / remaining_steps + the Resume-From pointer.
```

The STATE status/Resume-From data is written to the project STATE-JSON; resume commands are hardcoded to `.NET` in the core source and must be substituted with the node commands above for mvp.
