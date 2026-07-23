# Context Hygiene — Clean Prompt Discipline

## The Rule

Each AF station call receives a CLEAN prompt. No state leaks from previous calls.

This means:
- Skill blocks are re-injected fresh every time, not accumulated from prior calls
- Previous generation output is NOT included in the new prompt context
- Effectiveness data informs SELECTION priority only — it does not appear in the prompt
- Error messages from previous iterations are NOT forwarded to the next iteration

## Why This Matters

The XIIGen engine makes multiple AF calls per flow generation cycle. Without context hygiene:
- The model's context window fills with accumulated history
- DNA governance instructions get pushed out by verbose prior output
- The model starts "pattern-matching" on previous generations instead of following fresh instructions
- Token budget for skill blocks gets crowded out

## What IS Passed Between Calls

| Passes between calls | Does NOT pass between calls |
|---------------------|------------------------------|
| The engine contract (task type spec) | Previous generation output |
| The factory registry reference | Intermediate reasoning |
| The final StationOutput from the PREVIOUS station | Draft code from current station |
| The current iteration count | Error messages from prior iterations |
| The quality scores (as numbers, not full report) | The full quality score report |

## Skill Block Freshness

Skill blocks are selected fresh for each AF-4 call. The block content itself is static (comes from the skill definition), but the SELECTION decision (which blocks to inject) is made fresh each time based on current context.

This prevents "stale governance" — a scenario where SK-DNA was injected in iteration 1 because DNA score was 0.6, but by iteration 3 the score is 0.9 and SK-DNA is still being injected (wasting token budget).

## Implementation Check

When reviewing AF-4 or AF-1 code, check:
```bash
# Look for accumulated context patterns
grep -n "previousOutput\|history\|accumulated\|concat.*prompt" \
  server/src/af-stations/af4-rag-context.ts \
  server/src/af-stations/af1-genesis.ts
```
If any of these patterns exist: investigate whether they're leaking prior call content.

## Exception: Feedback Loop

AF-11 → AF-4 IS intentional. The feedback loop from effectiveness tracking back to selection priority is by design. This is not context leak — it's the memory system.

The distinction:
- **Leak:** previous prompt content appearing in next prompt (BAD)
- **Memory:** aggregate effectiveness scores informing future selection priority (GOOD)
