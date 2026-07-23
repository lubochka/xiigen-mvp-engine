# Root Cause Tracing — Agent Instructions

## When to Use
Error appears deep in execution. Stack trace shows long call chain.
Unclear where invalid data originated.

## The Process
1. **Observe** the symptom (exact error message)
2. **Find** the immediate cause (which line throws?)
3. **Ask:** What called this? Trace the call chain backward.
4. **Repeat** until you find where invalid data ENTERED the system
5. **Fix at the source**, not at the symptom point

## Key Question at Each Level
```
"Who passed this value? Where did IT get it from?"
```

## Integration
After finding root cause → apply `defense-in-depth` (validate at every layer).
Before claiming fixed → run `verification-before-completion`.
