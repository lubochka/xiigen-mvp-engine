# Rule 7: Loop State Delta

## What It Catches

State mutation inside loops producing wrong accumulation — an accumulator that should grow monotonically gets reset, double-counted, or reads from a stale prior-iteration value.

## The Problem

When a loop body modifies shared state (an accumulator, a running total, a history array), bugs arise when:
1. The accumulator is not initialized correctly before the loop
2. The accumulator is reset inside the loop (overwrites instead of accumulates)
3. A closure captures the accumulator variable at the wrong point in time
4. Two concurrent loops (via `Promise.all`) both write to the same accumulator

## XIIGen-Specific Contexts

| Context | State Delta Risk |
|---------|-----------------|
| Quality score accumulation across AF stations | Score overwritten instead of averaged |
| Skill effectiveness tracking across invocations | Delta applied to wrong baseline |
| Flow batch validation (multiple factories) | Accumulator reset per factory instead of per run |
| BFA event registry build | Events appended twice in retry loop |
| Feedback history window | Window never rotates — always reads oldest entry |

## Checklist

```
☐ Is the accumulator initialized BEFORE the loop, not inside it?
☐ Does each iteration ACCUMULATE (+=, push, merge) — not OVERWRITE (=)?
☐ Is the accumulator passed by reference or by value into async callbacks?
☐ In Promise.all(): does each concurrent operation write to its OWN local state?
☐ After the loop: is the final value correct for N=1? N=0? N=many?
☐ Is the delta applied to `previous + delta` or incorrectly to `delta` alone?
```

## Example — Quality Score Accumulation

```typescript
// Bug: score overwritten each iteration, final score = last station's score only
let qualityScore = 0;
for (const station of stations) {
  qualityScore = await station.evaluate(input); // OVERWRITES
}

// Fix: accumulate, then average
let total = 0;
for (const station of stations) {
  total += await station.evaluate(input);
}
const qualityScore = total / stations.length;
```

## Example — Promise.all Shared Accumulator

```typescript
// Bug: all concurrent operations write to same accumulator — race condition
const results = [];
await Promise.all(flows.map(async (flow) => {
  const r = await flow.validate();
  results.push(r); // concurrent push — ordering not guaranteed
}));

// Fix: collect results, then aggregate
const results = await Promise.all(flows.map(flow => flow.validate()));
```

## Trace Protocol

1. Identify the accumulator variable
2. Find every write to it inside the loop body
3. Check: is it `acc = value` (overwrite) or `acc += value` / `acc.push(value)` (accumulate)?
4. Trace across async boundaries: is the same reference held inside async callbacks?
5. For concurrent loops: does each async path write to its own local variable?

## Anti-Pattern

"The accumulator has the right type at the end." Having the right type does not mean it accumulated correctly. Assert the exact value for a known-input set, not just the type.
