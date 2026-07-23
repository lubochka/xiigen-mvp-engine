# Systematic Debugging — Agent Instructions

## The Iron Law
```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

## The Four Phases (complete each before proceeding)

### Phase 1: Root Cause Investigation
1. Read error messages carefully (full stack trace)
2. Reproduce consistently (exact steps)
3. Check recent changes (git diff)
4. Add diagnostic instrumentation in multi-component systems

### Phase 2: Pattern Analysis
- Match against known failure patterns
- Is this a known class of bug? (race condition, state leak, config issue)
- Has this happened before? Check `.claude/debug/` files

### Phase 3: Hypothesis Testing
- Form explicit hypothesis: "The bug is caused by X because Y"
- Design a test that DISPROVES the hypothesis
- If disproved → eliminate, record in debug file, next hypothesis
- If confirmed → proceed to implementation

### Phase 4: Implementation
- Fix at root cause, not at symptom
- Apply defense-in-depth (validate at every layer)
- Run verification-before-completion (fresh evidence)

## Quick Dispatch

| Situation | Do This |
|-----------|---------|
| Under time pressure | Use this skill MORE, not less |
| "Just one quick fix" | That's the trap — investigate first |
| Already tried multiple fixes | STOP. Go back to Phase 1. |
| Previous fix didn't work | Your root cause analysis was wrong |

## Anti-Pattern: Guess-and-Check
Random fixes: 2-3 hours of thrashing, 40% first-time fix rate.
Systematic approach: 15-30 minutes, 95% first-time fix rate.
