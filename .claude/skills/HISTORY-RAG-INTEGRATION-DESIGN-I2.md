# HISTORY-RAG-INTEGRATION-DESIGN-I2
## Integration Round I2 — D-HIST-001..008 Lock Candidate Text
## Date: 2026-04-19 | Status: READY FOR EXECUTION
## Applies to: docs/decisions/DECISIONS-LOCKED.md (→ D2)
## Source: hist_arch_001, hist_arch_007, hist_fd_017, hist_fd_026,
##          hist_flow_flow03_d_03_1, hist_flow_flow03_d_03_4,
##          hist_flow_flow04_d_04_5, hist_adr_flow18_topology

---

## Purpose

This document specifies the exact text of 8 new `D-HIST` entries to be appended
to `docs/decisions/DECISIONS-LOCKED.md` after `D-STACK-8`. All content is derived
from the live fixture files — no new decisions are authored here.

---

## §1 — Insertion Point (confirmed from live file)

**File:** `docs/decisions/DECISIONS-LOCKED.md`

**Insert after the final line of D-STACK-8:**
```
**To change:** SK-417 decision reopening required.
**Registered:** 2026-03-22
```
(This is the current end-of-file.)

**New group header to prepend before D-HIST-001:**
```markdown
---

## D-HIST Group — Historical RAG Decisions (proposed locks from Phase R5)

These 8 decisions were extracted from `docs/sessions/historyRag/` pass files,
per-flow ARCHITECTURE-DECISIONS.json files, and `docs/decisions/` during the
History RAG integration plan (2026-04-19). Each is proposed as a permanently
locked rule. Luba approval required before any may be changed.

**Source fixtures:** `fixtures/rag-patterns/hist_arch_001`, `hist_arch_007`,
`hist_fd_017`, `hist_fd_026`; `fixtures/design-reasoning/historical/`
`hist_flow_flow03_d_03_1`, `hist_flow_flow03_d_03_4`, `hist_flow_flow04_d_04_5`,
`hist_adr_flow18_topology`.
```

---

## §2 — Full D-HIST Entry Text (8 entries)

### D-HIST-001 — Fabric-First: Interface + Factory + Skeleton Mandatory

```markdown
## D-HIST-001 — Fabric-First: Interface + Factory + Skeleton Mandatory (2026-04-19)

**Source fixture:** `fixtures/rag-patterns/hist_arch_001.json` (qualityScore: 0.95)
**Supplements:** Rule 1 (CLAUDE.md: "No direct SDK imports in service code")

**Decision:**
Every external system dependency must be introduced through three artifacts in order:
1. **Interface** — abstract class in `fabrics/interfaces/` (`IDatabaseService`, `IAiProvider`, etc.)
2. **Factory** — resolves to a concrete provider via `FactoryResolutionContext`
3. **Skeleton** — base class or stub that the Skill Factory generates implementations from

Generated services import only interface tokens (`DATABASE_SERVICE`, `AI_PROVIDER`, etc.)
via `@Inject()`. Provider SDKs (`@elastic/elasticsearch`, `@anthropic-ai/sdk`) appear
ONLY inside provider implementation files in `fabrics/*/providers/`. Never in service code.

**Iron Rules (from fixture):**
- Generic interface layer (IDatabaseService, IAiService, IQueueService) — mandatory for all external systems
- Generated services import only interfaces — never provider SDKs
- REJECTED pattern: provider-specific direct implementations in service code

**Rationale:** Swapping providers requires only an environment variable change.
No service code changes. The fabric layer is the single boundary where SDKs are permitted.
Without this invariant, any provider outage or migration requires touching every service
that imports the SDK directly.

**Violations detected by:** FC-31 (hardcoded endpoints), DNA compliance scan, BFA Phase A gate.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-002 — Idempotency SETNX at ORDER 1

```markdown
## D-HIST-002 — Idempotency SETNX at ORDER 1 Before Any Processing (2026-04-19)

**Source fixture:** `fixtures/rag-patterns/hist_arch_007.json` (qualityScore: 0.90)
**Supplements:** DNA-7 (CLAUDE.md: "All queue consumers deduplicate via idempotency keys")

**Decision:**
All queue consumers that mutate state must place a SETNX idempotency check at ORDER 1 —
before any business logic runs. The pattern:

```typescript
// ORDER 1 — idempotency guard (MACHINE — never remove)
const alreadyProcessed = await this.cache.setIfAbsent(
  `idem:${event.id}`, 'processing', ttlSeconds
);
if (!alreadyProcessed.data) return DataProcessResult.success({ skipped: true });
// ORDER 2+ — business logic begins here
```

SETNX at ORDER 1 means: if the event has been processed before (queue redelivery,
at-least-once delivery), the handler exits immediately with success. No duplicate
side effects occur. cycleBudget on REGISTRATION archetype = 3 (maximum) because
any lower budget risks generating non-atomic patterns.

**Iron Rules (from fixture):**
- DynamicController handles all CRUD via /api/dynamic/{indexName}
- DNA-6: No entity-specific controllers
- Idempotency key on mutations is MACHINE — never configurable

**Rationale:** Queue delivery is at-least-once. Without SETNX at ORDER 1, every redelivery
produces duplicate state mutations (double charges, double registrations, double points).
SETNX must be first — not after any I/O — to prevent partial execution on redelivery.

**Violations detected by:** NAMED_CHECK_IDEMPOTENCY in validate.handler.ts; score-0 in AF-9.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-003 — V39 Rule: 4 Artifacts per External System

```markdown
## D-HIST-003 — V39 Rule: 4 Artifacts per External System (2026-04-19)

**Source fixture:** `fixtures/rag-patterns/hist_fd_017.json` (qualityScore: 0.96)
**Supplements:** D-HIST-001 (interface+factory+skeleton triple)

**Decision:**
For EVERY external system dependency, the engine must generate exactly 4 artifacts:
1. **Interface** — abstract contract (`IEmailService`, `IPaymentGateway`, etc.)
2. **Factory** — resolution via `IExternalServiceFactory<T>.createAsync(context)`
3. **Base Skeleton** — abstract class that generated implementations extend
4. **Generated Implementation** — concrete class produced by the Skill Factory AF pipeline

The Skill Factory routes to implementations via factories. Generated code NEVER imports
concrete providers directly. The 4-artifact pattern is the enforcement mechanism for
the fabric-first principle (D-HIST-001) at the per-external-system level.

**Iron Rules (from fixture):**
- V39 Rule: For EVERY external system: (1) Interface, (2) Factory, (3) Base Skeleton, (4) Generated Implementation
- Engine routes to implementations via factories — NEVER to providers directly
- REJECTED: Direct provider imports in generated service code

**Rationale:** The 4-artifact pattern ensures every external system is independently
swappable. A generated service that skips the factory and calls the provider SDK directly
breaks provider portability. V39 was codified after finding 6 flows that violated this
pattern during FLOW-DESIGN-017 review.

**Violations detected by:** V39 named check; BFA Phase A audit; FC-31 pattern scan.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-004 — BOLA: Tenant Scope via AsyncLocalStorage, Never Request Parameter

```markdown
## D-HIST-004 — BOLA: Tenant Scope via AsyncLocalStorage, Never Request Parameter (2026-04-19)

**Source fixture:** `fixtures/rag-patterns/hist_fd_026.json` (qualityScore: 0.97)
**Supplements:** DNA-5 (CLAUDE.md: "Tenant context via AsyncLocalStorage — no tenantId parameter")

**Decision:**
Tenant scoping is AUTOMATIC via AsyncLocalStorage (ALS). `TenantContextMiddleware` sets
`TenantContext` in ALS on every request. All fabric providers read `tenantId` from ALS
internally. No service method may accept `tenantId` as a parameter.

This makes cross-tenant reads architecturally impossible: a developer cannot accidentally
query another tenant's data because the tenant filter is applied automatically by the fabric.
Passing `tenantId` as a parameter creates a caller-responsibility model where any caller
can pass any tenantId — including forged ones.

**Iron Rules (from fixture):**
- Mandatory tenant scoping at EVERY layer: queries, caches, events, queues, metrics, logs
- Tenant scope is AUTOMATIC via ALS — developers cannot skip it
- REJECTED: Developer responsibility — each query manually adds WHERE tenant_id = ?

**OWASP context:** OWASP API Top 1 = BOLA (Broken Object Level Authorization).
Manipulating object IDs to access other tenants' data. ALS-automatic scoping makes
BOLA impossible by construction within XIIGen's service layer.

**Violations detected by:** DNA-5 scan; BOLA named check; scope isolation arbiter (SK-526 / FC-32).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-005 — REGISTRATION Atomic: One Transaction, cycleBudget=3

```markdown
## D-HIST-005 — REGISTRATION Archetype: Atomic Single-Operation, cycleBudget=3 (2026-04-19)

**Source fixture:** `fixtures/design-reasoning/historical/hist_flow_flow03_d_03_1.json` (qualityScore: 0.95)
**Origin:** FLOW-03 ARCHITECTURE-DECISIONS.json D-03-1

**Decision:**
The REGISTRATION archetype uses a single atomic operation: `registerAtomically()` wraps
both the capacity check and the registration write in ONE database transaction. No separate
`check()` then `create()` sequence is permitted.

The model defaults to generating a sequential check-then-write pattern (PROCESSING archetype).
This produces a race condition under concurrent requests: two users see capacity=1, both
pass the check, both write — capacity goes to -1. This is the canonical REGISTRATION failure mode.

cycleBudget = 3 (maximum) for REGISTRATION archetype tasks. A lower budget risks the
model generating the sequential anti-pattern before the arbiter can reject it.

**Teaching point (verbatim from fixture):**
"When you see 'check available then register', it is always a race condition. The only
safe pattern is registerAtomically()."

**Positive example:** `registrationService.registerAtomically(eventId, userId)` — one atomic op.
Two concurrent requests: first succeeds, second gets CAPACITY_EXCEEDED.

**Negative example:** `capacityService.check()` then `registrationService.create()` — race condition.
Compiles and passes unit tests. SILENT_FAILURE in training data if not caught.

**Lock rationale:** Correctness-propagating. A session that generates sequential check-then-write
produces a race condition that compiles and passes unit tests. Score-0 required, not BUILD_FAILURE.
DPO triple tagged `dpo-training-guard`.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-006 — Best-Effort Observer: Catch Returns Success, Never Failure

```markdown
## D-HIST-006 — Best-Effort Observer: Catch Block Returns Success, Never Failure (2026-04-19)

**Source fixture:** `fixtures/design-reasoning/historical/hist_flow_flow03_d_03_4.json` (qualityScore: 0.95)
**Origin:** FLOW-03 ARCHITECTURE-DECISIONS.json D-03-4

**Decision:**
Any task type that observes another task type's output (analytics tracking, notification
dispatch, audit logging, feed updates) is a best-effort observer. The entire handler
body must be wrapped in try/catch. The catch block MUST return
`DataProcessResult.success({operationName: false})` — never `DataProcessResult.failure()`.

A failure result from an observer contaminates the DPO triple of the upstream task.
It transforms a successful business outcome into a failed training example, corrupting
the AI's learning signal for the correct upstream pattern.

**Teaching point (verbatim from fixture):**
"If a task type observes another task type's output, it is best-effort.
Best-effort = try/catch entire handler. catch returns
DataProcessResult.success({tracked:false}), never failure."

**Pattern:**
```typescript
async handle(event: SomeEvent): Promise<DataProcessResult<ObserverResult>> {
  try {
    // ... observer logic ...
    return DataProcessResult.success({ tracked: true });
  } catch (err) {
    this.logger.warn('Observer failed — best-effort', { err });
    return DataProcessResult.success({ tracked: false }); // NEVER failure
  }
}
```

**Lock rationale:** DPO training guard. An observer that returns failure corrupts training
data for the upstream task type. This is a SILENT_FAILURE — the code passes unit tests
but poisons the model's learning signal for every upstream pattern that ever triggers this observer.

**Cross-reference:** D-02-BROAD-03 (FLOW-02 nudge best-effort), D-HIST-007 (SILENT_FAILURE).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-007 — SILENT_FAILURE: config.get() for MACHINE Constant = score-0

```markdown
## D-HIST-007 — SILENT_FAILURE: config.get() for MACHINE Constant = score-0 (2026-04-19)

**Source fixture:** `fixtures/design-reasoning/historical/hist_flow_flow04_d_04_5.json` (qualityScore: 0.95)
**Origin:** FLOW-04 ARCHITECTURE-DECISIONS.json D-04-5

**Decision:**
When a named check prevents a SILENT_FAILURE (code that compiles, passes tests, but
violates an architectural invariant), that check must be `score-0` severity, not
`BUILD_FAILURE`. BUILD_FAILURE is for compilation errors. SILENT_FAILURE violations
require score-0 because the violation is invisible to standard testing.

The canonical example: a value declared in `machineConstants[]` with `neverFromConfig: true`.
The model defaults to `const ttl = this.config.get('qr_token_ttl', 60)` — the code is
functionally identical but architecturally wrong. It must be scored 0 regardless of
functional correctness.

**Teaching point (verbatim from fixture):**
"Any named check that prevents a SILENT_FAILURE must be score-0 severity, not BUILD_FAILURE.
BUILD_FAILURE is for compilation errors. SILENT_FAILURE is for architecturally wrong code
that compiles and passes tests."

**Positive example:** `const QR_TOKEN_TTL_SECONDS = 60` — numeric literal in source.
Never from config. machineConstants entry: `{ name: 'QR_TOKEN_TTL_SECONDS', neverFromConfig: true }`.

**Negative example:** `this.config.get('qr_token_ttl', 60)` — functionally identical,
compiles, passes all tests, but allows tenant override of a security constant.
QR token TTL is a security constraint — not a business parameter.

**Lock rationale:** SILENT_FAILURE priority (SK-441). A session that generates config.get()
for a MACHINE constant produces code that works in testing but fails the architectural
invariant. Without score-0, the violation ships undetected. DPO triple tagged `dpo-training-guard`.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

### D-HIST-008 — Read-Path Extension Over Dual-Write for Guarded Services

```markdown
## D-HIST-008 — Read-Path Extension Over Dual-Write for Guarded Services (2026-04-19)

**Source fixture:** `fixtures/design-reasoning/historical/hist_adr_flow18_topology.json` (qualityScore: 0.91)
**Origin:** docs/decisions/ADR-USER-JOURNEY-RECONNECTION-INDEX-RECONCILIATION.md (LOCKED: Option b)

**Decision:**
When a service writes to its own index with carefully ordered guards (BOLA, OCC optimistic
concurrency, FLOW_IMMUTABLE), the correct approach to make that data visible in other read
paths is to **extend the read path** (add a fallback to the reader), not to **dual-write**
(add a second write in the existing service).

Dual-write forces the writer to maintain identical guard ordering across two indices.
Any future change to the guard ordering must be applied twice — at different blast radii.
OCC schemes keyed to the original index become fragile when replicated to a second index.

The read-path extension is bounded: it touches only the TopologyController + a new adapter.
The writer's guard invariants remain single-sourced.

**Locked decision (from ADR):** Option (b) — extend TopologyController bridge with an
additional fallback path. T617 `FlowCanvasWriterService` stays untouched.

**Teaching point (verbatim from fixture):**
"When a service has carefully ordered write guards (BOLA/OCC), never dual-write.
Extend the read path instead. Guards must remain single-sourced."

**Applies to:** Any topology-fragmentation scenario where a write service has ordered guards.
Pattern class: FLOW-18 visual canvas / multi-index architecture.

**Cross-reference:** D-CLIENT-1 (background step signals), D-PARALLEL-1 (immutable ranges).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

## §3 — Complete Insertion Block

The full block to append at the end of `docs/decisions/DECISIONS-LOCKED.md`:

```
[D-STACK-8 final line: "**Registered:** 2026-03-22"]

---

## D-HIST Group — Historical RAG Decisions (proposed locks from Phase R5)

[Group intro text from §1]

[D-HIST-001 through D-HIST-008 entries from §2 above, each separated by ---]
```

Total addition: ~175 lines appended to the end of the file.

---

## §4 — Verification Commands (for D2 execution)

```bash
# Verify all 8 D-HIST entries are present after D2
grep -c "^## D-HIST-" docs/decisions/DECISIONS-LOCKED.md
# Expected: 8

# Verify each entry has its fixture source reference
grep "Source fixture" docs/decisions/DECISIONS-LOCKED.md | wc -l
# Expected: 8

# Verify insertion point is correct (D-STACK-8 is immediately before D-HIST group)
grep -n "D-STACK-8\|D-HIST Group\|D-HIST-001" docs/decisions/DECISIONS-LOCKED.md
# Expected: D-STACK-8 heading, then D-HIST Group header, then D-HIST-001 heading

# Count total locked decisions after D2
grep "^## D-" docs/decisions/DECISIONS-LOCKED.md | wc -l
# Expected: 10 (D-FT-1 + D-STACK-1..8 headings with ## prefix) 
# Note: compact entries use inline format — grep "^D-" for full count
grep -c "Status: LOCKED" docs/decisions/DECISIONS-LOCKED.md
# Expected: original count + 8 new entries
```

---

## §5 — Dependency chain

This I2 spec feeds:
- **Round D2** → applies these 8 entries to `docs/decisions/DECISIONS-LOCKED.md` (final)

No further design decisions needed. D2 execution = append the §3 insertion block.
