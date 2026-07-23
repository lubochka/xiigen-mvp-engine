---
name: scope-isolation-arbiter
sk_number: SK-526
version: "1.1.0"
priority: CRITICAL
load_order: 0
category: planning
author: luba
updated: "2026-04-07"
contexts: ["web-session", "claude-code"]
description: >
  Governs the mandatory 8th arbiter panel member: scope_isolation.
  Enforces the three-tier knowledgeScope model (PRIVATE|MODULE|GLOBAL) on
  every generated node that reads from mixed-scope indices or writes to
  per-tenant indices. FC-32: scope_isolation absent from ANY node = BUILD_FAILURE.
  Applies regardless of archetype or node size. No exceptions.
triggers:
  - "arbiter panel"
  - "arbiterConfig"
  - "scope isolation"
  - "knowledgeScope"
  - "mixed-scope"
  - "per-tenant"
  - "xiigen-training-data"
  - "xiigen-rag-patterns"
  - "xiigen-freedom-config"
  - "dpo triple"
  - "spend-events"
  - "security-violations"
  - "xiigen-arbiter-verdicts"
  - "FC-32"
  - "CF-POLICY-01"
  - "PRIVATE"
  - "MODULE"
  - "GLOBAL"
---

# Scope Isolation Arbiter Skill (SK-526) v1.1.0

## ORIGIN

Extracted from six production read-path leakage gaps (GAP-SCOPE-01..06) discovered
2026-04-07. These gaps allowed cross-tenant data reads on every DPO triple query,
OSS seeding, graduation count, arbiter verdict storage, and flow run rendering.
All six fixed in SESSION -1. SK-526 prevents recurrence in AI-generated code.

## WHEN TO INVOKE

- Before authoring any `arbiterConfig` block in any contract
- Before writing any node that reads from a mixed-scope index
- Before writing any node that writes to a per-tenant index
- When reviewing AI-generated code for any flow node (FC-32 gate check)
- When a GAP-SCOPE class issue is found (use this skill to diagnose which IR-SCOPE rule was violated)
- Any GENERATION or PLANNING session that designs arbiter panels

---

## THE THREE-TIER SCOPING MODEL (canonical)

```
PRIVATE  — owner tenant only.
           Read: knowledgeScope === 'PRIVATE' AND tenantId === caller's tenantId
           Default when knowledgeScope field is absent (CF-POLICY-01).
           Write: include tenantId on every store operation.

MODULE   — per-module, copyable via ModuleAdoptionService.
           Read: all tenants may read (no tenantId filter required).
           Write: include moduleId; tenantId optional.

GLOBAL   — platform knowledge.
           Read: all tenants (no filter).
           Write: platform-level operations only.
```

---

## INDEX CLASSIFICATION (Rule 18 — memorise)

**Mixed-scope indices (scope filter REQUIRED on every read):**
```
xiigen-training-data
xiigen-rag-patterns
xiigen-knowledge-policy
xiigen-training-data-pending
xiigen-training-data-review
xiigen-freedom-config
```

**Per-tenant indices (tenantId field REQUIRED on every write):**
```
spend-events
security-violations
invoices
xiigen-subscriptions
xiigen-arbiter-verdicts
xiigen-oss-curriculum-runs
xiigen-shadow-runs
xiigen-run-traces
```

**Platform-global indices (no scope filter — correct to omit):**
```
xiigen-flow-lifecycle
xiigen-flow-registry
xiigen-engine-contracts
xiigen-calibration-baseline
```

---

## THE SCOPE ISOLATION ARBITER — 8th PANEL MEMBER

### Identity
- **Role name:** `scope_isolation`
- **Model token:** `AI_SCOPE_ARBITER` (register in FabricsModule, AiModelRole.FAST)
  - Fallback until registered: `AI_JUDGE_PROVIDER` — do NOT skip the arbiter entirely
- **Panel position:** 8th — parallel with other evaluators, never sequential
- **Isolation:** `isolated: false` (may receive contract index names and scoping rules)
- **Blind:** `true` (receives generated code without generator model identity)

### Expertise scope
- Three-tier knowledgeScope model (PRIVATE | MODULE | GLOBAL)
- Mixed-scope index read path compliance
- Per-tenant index write compliance
- CF-POLICY-01: absent knowledgeScope = PRIVATE
- Fail-open pattern: CLS unavailable → no filter (admin path), not rejection

### Context package (ONLY these — no other context)
- Generated code under review
- Index classification table (this section — mixed-scope, per-tenant, platform-global)
- CF-POLICY-01: absent = PRIVATE
- Rule 18 from XIIGEN-IMPLEMENTATION-PROTOCOL-v6.1

### Verdict class
```
IR-SCOPE-01: BLOCK — unfiltered read on mixed-scope index
IR-SCOPE-02: BLOCK — write to per-tenant index without tenantId
IR-SCOPE-03: ADVISORY — unnecessary tenantId filter on platform-global index (not BLOCK)
IR-SCOPE-04: BLOCK — knowledgeScope absent from DpoTriple interface (TypeScript gap)
IR-SCOPE-05: BLOCK — CLS not injected but mixed-scope read is performed
```

Only IR-SCOPE-01, IR-SCOPE-02, IR-SCOPE-04, IR-SCOPE-05 trigger BLOCK.
IR-SCOPE-03 is ADVISORY — platform-global reads with extra tenantId are harmless but noisy.

---

## arbiterConfig ADDITION (every node — no archetype exception)

Add this entry to every `evaluatorArbiters` block:

```typescript
scope_isolation: {
  modelToken: "AI_SCOPE_ARBITER",    // register in FabricsModule: AiModelRole.FAST
                                      // fallback: AI_JUDGE_PROVIDER until registered
  expertise:  "three-tier scoping model (PRIVATE|MODULE|GLOBAL) read/write compliance",
  blind:      true,
  isolated:   false,
},
```

And add/update the block-semantics setting:

```typescript
blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS',
```

This means: if scope_isolation issues IR-SCOPE-01 (BLOCK), the entire node is rejected
even if all other 7 arbiters PASS.

---

## FC-32 GATE CHECK

```
For every arbiter-panel.handler or multi-generate.handler node in any topology:

Detection:
  grep for scope_isolation in arbiterConfig.evaluatorArbiters

Checklist:
  □ scope_isolation arbiter present
  □ blind: true
  □ blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS'
  □ AI_SCOPE_ARBITER token registered in FabricsModule
    (fallback: AI_JUDGE_PROVIDER until dedicated token is registered — do NOT skip)

FAIL if: scope_isolation arbiter absent from ANY flow node.
No archetype exception. No "small node" exception.
```

---

## MINIMUM PANEL BY ARCHETYPE — AMENDED (v3.1.0)

SK-442 amended: Scope Isolation added unconditionally to every archetype row.

| Archetype | Minimum arbiters |
|-----------|-----------------|
| ROUTING | Business Logic + Principles + Iron Rules + **Scope Isolation** |
| DATA_PIPELINE | + Security + **Scope Isolation** |
| VALIDATION | + Completeness + **Scope Isolation** |
| TRANSACTION | All 7 + **Scope Isolation** (8th) |
| ORCHESTRATION | All 7 + **Scope Isolation** (8th) |
| SCHEDULED | Business Logic + Security + Principles + Iron Rules + Completeness + **Scope Isolation** |

**No archetype exception. No size exception.**

---

## FIVE TEST VECTORS (add to every component that reads/writes scoped indices)

```
SCOPE-1 (BLOCK path): PRIVATE read without tenantId filter
  → Mock: two tenants' DPO triples in store, call with Tenant A's tenantId
  → Expect: only Tenant A's triples returned; Tenant B's absent

SCOPE-2 (PASS path): MODULE read returns all tenants
  → Mock: MODULE triple from Tenant B in store, call with Tenant A's tenantId
  → Expect: Tenant B's MODULE triple is included

SCOPE-3 (DEFAULT path): knowledgeScope absent → treated as PRIVATE (CF-POLICY-01)
  → Mock: triple with no knowledgeScope field from Tenant B
  → Expect: Tenant A's query does NOT return Tenant B's triple

SCOPE-4 (FAIL-OPEN): CLS unavailable → no filter, no error
  → Mock: CLS throws on get()
  → Expect: service returns all records (admin path), no exception thrown

SCOPE-5 (WRITE path): per-tenant index write includes tenantId
  → Call storeDocument on per-tenant index
  → Expect: stored record contains tenantId field with caller's tenant value
```

---

## READ QUERY PATTERNS (iron rules — copy verbatim)

```typescript
// PRIVATE only (most common — user's own training data):
const triples = await db.searchDocuments('xiigen-training-data', {
  flowId,
  knowledgeScope: 'PRIVATE',
  tenantId,                       // ← REQUIRED for PRIVATE
});

// PRIVATE + MODULE (entitled reads — graduated curriculum):
const raw = await db.searchDocuments('xiigen-training-data', { flowId });
const filtered = raw.data.filter(t => {
  const scope = t.knowledgeScope ?? 'PRIVATE';   // CF-POLICY-01
  if (scope === 'PRIVATE') return t.tenantId === callerTenantId;
  if (scope === 'MODULE')  return true;          // any tenant
  if (scope === 'GLOBAL')  return true;          // any tenant
  return false;
});

// GLOBAL only (platform curriculum seeds):
const global = await db.searchDocuments('xiigen-training-data', {
  flowId,
  knowledgeScope: 'GLOBAL',
  // NO tenantId — correct
});

// ABSENT scope (post-filter — CF-POLICY-01):
const scope = record.knowledgeScope ?? 'PRIVATE';
if (scope === 'PRIVATE' && record.tenantId !== callerTenantId) continue; // filter out
```

---

## ANTI-PATTERNS

```
WRONG: db.searchDocuments('xiigen-training-data', { flowId })
       — no scope filter, returns ALL tenants' PRIVATE data
RIGHT: Apply scope filter (SCOPE-1 test vector above) + tenantId from CLS

WRONG: db.storeDocument('spend-events', { sessionId, amount })
       — no tenantId, per-tenant write without isolation
RIGHT: db.storeDocument('spend-events', { sessionId, tenantId, amount })

WRONG: db.storeDocument('xiigen-flow-lifecycle', { flowId, tenantId, status })
       — platform-global index, tenantId is unnecessary and misleading
RIGHT: db.storeDocument('xiigen-flow-lifecycle', { flowId, status })
       (IR-SCOPE-03: ADVISORY, not BLOCK)

WRONG: throw new Error('CLS not available') when tenantId is null
RIGHT: Return admin path (no filter) or fail-open per SCOPE-4 test vector

WRONG: Injecting tenantId as a method parameter on a service that already uses CLS
RIGHT: CLS read at top of method; fail-open to null (admin path)

WRONG: No scope_isolation arbiter because "it's a ROUTING archetype, only 3 needed"
RIGHT: All 4 required for ROUTING: Business Logic + Principles + Iron Rules + Scope Isolation
```

---

## SESSION 4 — PENDING CODE CHANGES

These code changes bring the scope_isolation arbiter into the live execution path.
They are NOT part of SESSION -1 (which only fixes read paths). SESSION 4 wires the arbiter.

```
1. arbiter-context-builders.ts:
   Add buildScopeIsolationContext() function — returns the index classification
   table + CF-POLICY-01 + IR-SCOPE rules as a context string for the arbiter call.

2. arbiter-panel.handler.ts:
   Add scope_isolation to the parallel contexts array alongside existing 7 arbiters.
   Resolve AI_SCOPE_ARBITER token (fallback: AI_JUDGE_PROVIDER).

3. FabricsModule:
   Register AI_SCOPE_ARBITER injection token with AiModelRole.FAST.
   Separate from AI_JUDGE_PROVIDER — two distinct economy-tier calls.

4. Tests: 3 new
   - FC-32 check: scope_isolation present in every flow node's arbiterConfig
   - buildScopeIsolationContext() returns correct index classification
   - arbiter-panel.handler executes scope_isolation arbiter in parallel
```

---

## WHAT THIS SKILL PREVENTS

| Gap class | Description | Prevented by |
|-----------|-------------|-------------|
| GAP-SCOPE-01 | DPO triple reads return all tenants' PRIVATE data | IR-SCOPE-01 BLOCK |
| GAP-SCOPE-02 | Graduation count inflated by other tenants' triples | IR-SCOPE-05 BLOCK (CLS not injected) |
| GAP-SCOPE-03 | OSS pre-seeding from other tenants' PRIVATE training data | IR-SCOPE-01 BLOCK |
| GAP-SCOPE-04 | spend-events + security-violations stored without tenantId | IR-SCOPE-02 BLOCK |
| GAP-SCOPE-05 | Flow run history visible cross-tenant via flowId | IR-SCOPE-01 BLOCK |
| GAP-SCOPE-06 | Arbiter verdicts stored without tenantId | IR-SCOPE-02 BLOCK |
| — | False BLOCK on platform-global index reads | IR-SCOPE-03 ADVISORY (not BLOCK) |
| — | knowledgeScope absent from DpoTriple interface | IR-SCOPE-04 BLOCK |

---

## GOVERNANCE

```
FC-32: scope_isolation arbiter absent from ANY node = BUILD_FAILURE
CF-POLICY-01: absent knowledgeScope = PRIVATE (enforced in read post-filter)
Rule 18: every session must apply scope filter on mixed-scope reads
Next skill: SK-527 (Module Isolation Arbiter, FC-33) — pending
```
