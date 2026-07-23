# Rule 8: Error Silent Catch

## What It Catches

Errors swallowed silently — a `try/catch` block catches an error, logs it (or not), and returns a default value. No signal reaches the caller. The caller believes the operation succeeded.

## The Problem

Silent error swallowing is the most dangerous bug pattern in XIIGen because:
1. The system continues operating with wrong data
2. No test catches it — the test sees a value, just the wrong one
3. The bug compounds: downstream stations build on the wrong output
4. Logs may record the error but nothing in the call chain knows to stop

## Patterns That Create Silent Failures

```typescript
// Pattern 1: catch-and-default
try {
  result = await this.fabric.search(query);
} catch (e) {
  this.logger.warn('search failed', e);
  result = { hits: [] }; // WRONG: caller sees "success" with empty result
}

// Pattern 2: optional chaining producing undefined silently
const score = input?.qualityScores?.overall ?? 0.5;
// If qualityScores was never set, falls back to 0.5 — no error, wrong threshold

// Pattern 3: DataProcessResult.failure not checked
const r = await provider.execute(query);
const data = r.data; // If r.success === false, r.data is undefined — no guard
```

## Required Pattern — DataProcessResult Propagation

```typescript
// CORRECT: propagate failure to caller
const r = await this.fabric.search(query);
if (!r.success) {
  return DataProcessResult.failure(`Search failed: ${r.error}`);
}
// Only reach here if actually successful
const hits = r.data.hits;
```

## Checklist

```
☐ Every try/catch: does the catch block return DataProcessResult.failure() or throw?
☐ No try/catch returns a default value as if the operation succeeded
☐ Every DataProcessResult consumer checks .success before reading .data
☐ Optional chaining (?.) with ?? fallback: is the fallback a valid sentinel or a silent mask?
☐ Fabric provider catch clauses: do they propagate the error or swallow it?
☐ Async station errors: are they caught at the station boundary and reported?
☐ Logger.warn without a failure return = silent swallow → REJECT
```

## XIIGen Contract — Error Propagation Rule

Every fabric provider and AF station that encounters an error MUST return `DataProcessResult.failure(message)` — NOT a default/empty result. The caller decides whether to retry, fall back, or fail the pipeline. The callee's job is to report faithfully.

```
WRONG: catch → log → return { data: null, success: false }  ← success=false but caller may not check
RIGHT: catch → return DataProcessResult.failure(e.message)  ← explicit failure
```

## When to Apply This Rule

Apply immediately when:
- Output is wrong but no exception is seen in logs
- A station returns a valid-looking result but with incorrect data
- Default values appear in output that should be computed values

## Anti-Pattern

"We log the error so it's not silent." Logging is not error propagation. If the caller receives a default value and continues, the system is in a wrong state. Log AND propagate.
