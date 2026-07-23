# Skill Blocks — Injectable Content

Each block is injected as a prompt section into AF-1 Genesis. Token budget: ≤ 800 tokens each.

---

## SK-PLAN — Planning Governance Block

```
GOVERNANCE: PLANNING GATE ACTIVE

Before decomposing this task:
1. Verify artifact numbers are from live canonical docs (not memory)
   - Next factory: read ENGINE_ARCHITECTURE_MERGED
   - Next task type: read TASK_TYPES_CATALOG_MERGED
2. Check for BFA conflicts: does this spec use any entity/event/route already in FLOW-01–FLOW-31?
3. Confirm all factory IDs in the spec exist in the factory registry
4. Record any new SK, F, T, CF numbers assigned in DECISIONS.md
5. Plan approval is required before any code generation

If artifact collision detected: STOP, report conflict with existing FLOW-XX number.
If factory ID missing: STOP, report which factory is unregistered.
```

---

## SK-DNA — DNA Compliance Block

```
GOVERNANCE: DNA COMPLIANCE ACTIVE

All generated code must satisfy these patterns:
DNA-1: No typed models — all business data is Record<string, unknown>
DNA-2: All queries use BuildSearchFilter — no hardcoded field names
DNA-3: All returns are DataProcessResult<T> — no throws for business logic
DNA-4: All services extend MicroserviceBase — no standalone classes
DNA-5: No tenantId parameter — reads from AsyncLocalStorage via TenantContext
DNA-6: No entity-specific controllers — use DynamicController only
DNA-7: All queue consumers have idempotency key
DNA-8: storeDocument() BEFORE enqueue() — outbox pattern always
DNA-9: Inter-service events wrapped in CloudEvents envelope

Violation = generation failure. Fix the pattern, not the check.
```

---

## SK-TEST — Testing Requirements Block

```
GOVERNANCE: TEST REQUIREMENTS ACTIVE

Every generated service or station modification requires:
LEVEL 1 — Unit: test each method in isolation with in-memory providers
LEVEL 2 — Simulation: test with real EngineContract fixtures from sample-contracts.ts
LEVEL 3 — E2E: test via @nestjs/testing AppModule (real DI, real pipeline)

Pattern for all tests:
- Describe: "ServiceName"
- It: "should [behavior] when [condition]"
- Assert: expect(result.isSuccess).toBe(true/false)
- Multi-tenant: verify tenant-A data invisible to tenant-B

New test files must be added, not just assertions. Test count must increase.
```

---

## SK-BFA — BFA Registration Block

```
GOVERNANCE: BFA REGISTRATION ACTIVE

Before generating code that introduces new entities, events, or routes:
1. Check FLOW-01–FLOW-31 for conflicts:
   - Entity name collision: same entity registered in two flows = BFA conflict
   - Event name collision: same event published by two flows without coordination
   - Route collision: same REST path in two flows

2. Register new artifacts with next available numbers:
   - Factory: F[next available after F1484]
   - Task Type: T[next available after T565]
   - BFA Rule: CF[next available after CF-789]

3. Confirm registration in BFA registry before generating implementation

BFA conflict = session blocker. Cannot accept "note it and continue."
```

---

## SK-DOCS — Documentation Sync Block

```
GOVERNANCE: DOCUMENTATION SYNC ACTIVE

After generation, update these canonical docs:
| Change type | Update |
|-------------|--------|
| New factory | ENGINE_ARCHITECTURE_MERGED: factory registry section |
| New task type | TASK_TYPES_CATALOG_MERGED: task type entry |
| New DNA pattern | DNA_PATTERNS_MERGED: pattern entry + detection rule |
| New BFA rule | BFA_REGISTRY_MERGED: CF-XXX entry |
| New skill | SKILLS_INDEX.md: SK-XXX entry |

Format: append, never delete existing entries.
Version: bump minor version (v2.N → v2.N+1) in file header.
```
