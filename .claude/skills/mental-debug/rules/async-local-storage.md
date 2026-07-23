# Rule 11: AsyncLocalStorage (adapted from env-dynamic-access)

## What It Catches

`AsyncLocalStorage` context not propagated across async boundaries — the context is set in the parent call but lost inside `Promise.all()`, `setTimeout`, `setImmediate`, or other async operations that create a new execution context.

## The Problem

XIIGen uses `AsyncLocalStorage` (via NestJS `ClsService`) to propagate `tenantId` and session context through the request lifecycle without passing it as a parameter. In Node 18, `AsyncLocalStorage` context does NOT automatically propagate into `Promise.all()` children. When concurrent operations lose the context, they either crash (missing tenantId), use a default tenantId (wrong tenant's data), or produce undefined behavior.

## Node 18 Propagation Rules

```
Context PROPAGATES into:
  ✓ Sequential awaits:           await op1(); await op2();
  ✓ Promise chaining:            await op1().then(op2);
  ✓ NestJS ClsService calls:     this.cls.get('tenantId') — if propagated via ClsModule
  ✓ Child async functions:       async function child() { ... } called from parent

Context DOES NOT PROPAGATE into:
  ✗ Promise.all():               await Promise.all([op1(), op2()])
  ✗ setTimeout/setImmediate:     setTimeout(() => ..., 0)
  ✗ Worker threads:              new Worker(...)
  ✗ EventEmitter callbacks:      emitter.on('event', callback)
```

## XIIGen-Specific Contexts at Risk

| Operation | Risk |
|-----------|------|
| `Promise.all([flow1.validate(), flow2.validate()])` | Both lose tenantId — fall to default tenant |
| `Promise.all(stations.map(s => s.execute(input)))` | Each station loses AsyncLocalStorage context |
| Concurrent fabric calls in AF-4 | RAG + DB calls concurrently — one or both lose context |
| BFA validation of multiple flows | Each flow validation loses tenantId isolation |

## Fix Patterns

**Pattern 1: Explicit tenantId parameter (preferred for new code)**
```typescript
// Pass tenantId explicitly to concurrent operations
await Promise.all(flows.map(flow => flow.validate(input, tenantId)));
```

**Pattern 2: ClsService.run() wrapper (for ClsModule users)**
```typescript
// Propagate cls context into each concurrent branch
await Promise.all(flows.map(flow =>
  this.cls.run({ tenantId }, () => flow.validate(input))
));
```

**Pattern 3: Sequential execution when isolation is critical**
```typescript
// If concurrent execution is not required, go sequential
for (const flow of flows) {
  await flow.validate(input); // context preserved
}
```

## Checklist

```
☐ Is tenantId read from AsyncLocalStorage anywhere in this call chain?
☐ Is Promise.all() used anywhere on this path?
☐ In each Promise.all() branch: does tenantId come from AsyncLocalStorage or from an explicit parameter?
☐ If from AsyncLocalStorage: is ClsService.run() wrapping each branch?
☐ If tenantId is missing: what is the fallback? Is it a safe default or a wrong tenant?
☐ In tests: is the AsyncLocalStorage context set up before the concurrent calls?
```

## Detection

```bash
# Find all Promise.all() in server code
grep -rn "Promise.all" server/src/

# Find all AsyncLocalStorage / ClsService reads
grep -rn "cls.get\|AsyncLocalStorage\|tenantId" server/src/

# Cross-reference: Promise.all sites that read tenantId from CLS
# Any site that does both is a potential propagation gap
```

## Anti-Pattern

"The tenantId is available in the outer function so it's available inside Promise.all." The outer function's AsyncLocalStorage context is NOT inherited by Promise.all() children in Node 18. Verify explicitly.
