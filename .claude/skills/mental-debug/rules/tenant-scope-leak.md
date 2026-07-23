# Rule 14: Tenant Scope Leak (NEW)

## What It Catches

`tenantId` lost in `Promise.all()` or concurrent execution paths — one tenant's request leaks into another tenant's execution context, or `tenantId` becomes `undefined` in a concurrent branch, causing the wrong data to be returned or isolation to be violated.

## The Problem

XIIGen is multi-tenant by default (P1). Every fabric call, every AF station, every generated service must operate within a single tenant's scope. When `tenantId` is propagated via `AsyncLocalStorage` and that context is lost in a concurrent execution branch, the branch either:
1. Reads data from the wrong tenant (data leak)
2. Writes data to the wrong tenant (data corruption)
3. Uses `undefined` as tenantId (fallback to default or crash)

## Root Cause

`AsyncLocalStorage` context does NOT propagate into `Promise.all()` children in Node 18. See `async-local-storage.md` (Rule 11) for propagation rules.

This rule focuses specifically on the tenant isolation consequence of that propagation failure.

## Tenant Leak Scenarios

| Scenario | Leak Type |
|----------|-----------|
| `Promise.all([tenantA.query(), tenantB.query()])` — shared context | Cross-tenant read |
| `Promise.all([flow1.validate(), flow2.validate()])` — tenantId from CLS lost | Undefined tenantId |
| Concurrent fabric calls — first call sets context, second loses it | Wrong tenant data |
| EventEmitter handler reads from CLS — context not propagated from emitter | Undefined tenantId |

## Detection

```bash
# Find all Promise.all in server code
grep -rn "Promise.all" server/src/

# Find all tenantId reads
grep -rn "tenantId\|cls.get.*tenant\|AsyncLocalStorage" server/src/

# Find concurrent operations that also read tenantId
# Manual cross-reference: any file with both Promise.all AND tenantId reads
```

## Checklist

```
☐ In every Promise.all(): is tenantId passed EXPLICITLY to each concurrent function?
☐ OR: is each concurrent branch wrapped in cls.run({ tenantId }, () => ...)?
☐ Is there any concurrent operation (Promise.all, EventEmitter, setTimeout) that reads
   tenantId from CLS without one of the above protections?
☐ In tests: is the multi-tenant case tested? (two different tenantIds, both correct)
☐ After the fix: run tenant isolation test (test/fabrics/tenant-isolation-e2e.spec.ts)
```

## Fix Pattern

```typescript
// WRONG: tenantId lost in concurrent branches
const tenantId = this.cls.get('tenantId');
const results = await Promise.all([
  this.fabricA.query(input),    // tenantId from CLS — will be undefined
  this.fabricB.query(input),    // tenantId from CLS — will be undefined
]);

// RIGHT: explicit tenantId passed to each branch
const tenantId = this.cls.get('tenantId');
const results = await Promise.all([
  this.fabricA.query(input, tenantId),   // explicit
  this.fabricB.query(input, tenantId),   // explicit
]);

// ALSO RIGHT: cls.run() wrapper (if fabric accepts tenantId from CLS)
const tenantId = this.cls.get('tenantId');
const results = await Promise.all([
  this.cls.run({ tenantId }, () => this.fabricA.query(input)),
  this.cls.run({ tenantId }, () => this.fabricB.query(input)),
]);
```

## Test — Tenant Isolation Verification

After any fix involving concurrent operations and tenantId:

```typescript
// Extend existing test/fabrics/tenant-isolation-e2e.spec.ts
it('should not leak tenant data in concurrent Promise.all', async () => {
  const [resultA, resultB] = await Promise.all([
    service.execute({ tenantId: 'tenant-a', ... }),
    service.execute({ tenantId: 'tenant-b', ... }),
  ]);
  expect(resultA.data.tenantId).toBe('tenant-a');
  expect(resultB.data.tenantId).toBe('tenant-b');
});
```

## Bug Classification

Tenant scope leak is a **Class D (AF Pipeline)** bug if traceable to a specific station's concurrent execution pattern. It may also be **Class F (Engine Contract)** if the contract does not declare required tenant isolation for a specific operation.

## Anti-Pattern

"We only have one tenant in staging so it works fine." Single-tenant environments cannot catch cross-tenant leaks. The bug appears only in production with multiple tenants. Always test with two tenants.
