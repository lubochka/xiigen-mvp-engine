# HISTORY-RAG-INTEGRATION-DESIGN-I4
## Integration Round I4 — Complete Paste-Ready D-HIST Block for DECISIONS-LOCKED.md
## Date: 2026-04-19 | Status: READY FOR EXECUTION
## Applies to: docs/decisions/DECISIONS-LOCKED.md (→ D2)

---

## Purpose

I2 specified what each D-HIST entry *means* (design rationale, fixture sources,
teaching points). This document (I4) provides the **complete paste-ready block** in
the exact format that `DECISIONS-LOCKED.md` uses for D-STACK-1..8 entries.

**D2 execution = append §2 verbatim after the final line of D-STACK-8.**

No reformatting, no editorial decisions needed at execution time.

---

## §1 — Confirmed Insertion Point

```
File:        docs/decisions/DECISIONS-LOCKED.md
Insert after: **Registered:** 2026-03-22          ← final line of D-STACK-8 (current EOF)
```

Format template used: `## D-STACK-N — Title (date)` with prose body,
`**To change:**` and `**Registered:**` closing fields.
All 8 D-HIST entries follow this exact template.

---

## §2 — Complete Paste-Ready Block (append verbatim after D-STACK-8)

```markdown

---

## D-HIST Group — Historical RAG Decisions (Phase R5, 2026-04-19)

These 8 decisions were extracted from `docs/sessions/historyRag/` pass files,
per-flow `ARCHITECTURE-DECISIONS.json` files, `docs/decisions/`, and
`docs/architecture/` during the History RAG integration plan (Phase R0-R5,
2026-04-19). Each is proposed for permanent lock status. Luba approval is
required before any may be changed.

Source fixtures: `fixtures/rag-patterns/hist_arch_001`, `hist_arch_007`,
`hist_fd_017`, `hist_fd_026`; `fixtures/design-reasoning/historical/`
`hist_flow_flow03_d_03_1`, `hist_flow_flow03_d_03_4`,
`hist_flow_flow04_d_04_5`, `hist_adr_flow18_topology`.

---

## D-HIST-001 — Fabric-First: Interface + Factory + Skeleton Mandatory (2026-04-19)

Every external system dependency is introduced through three artifacts in order:
(1) Interface — abstract class in `fabrics/interfaces/` (`IDatabaseService`,
    `IAiProvider`, `IQueueService`, etc.);
(2) Factory — resolves to a concrete provider via `FactoryResolutionContext`;
(3) Skeleton — base class or stub that the Skill Factory generates concrete
    implementations from.

Generated services import only interface tokens (`DATABASE_SERVICE`, `AI_PROVIDER`,
etc.) via `@Inject()`. Provider SDKs (`@elastic/elasticsearch`, `@anthropic-ai/sdk`)
appear ONLY inside provider implementation files under `fabrics/*/providers/`. Never
in service code. The fabric layer is the single boundary where SDKs are permitted.

This invariant makes provider migration a configuration change, not a code change.
Violation: any `import { Client } from '@elastic/elasticsearch'` in a service file.
Detected by: FC-31, DNA compliance scan, BFA Phase A gate.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-002 — Idempotency SETNX at ORDER 1 Before Any Processing (2026-04-19)

All queue consumers that mutate state place a SETNX idempotency check at ORDER 1 —
before any business logic:

```typescript
// ORDER 1 — idempotency guard (MACHINE — never remove or reorder)
const alreadyProcessed = await this.cache.setIfAbsent(
  `idem:${event.id}`, 'processing', ttlSeconds
);
if (!alreadyProcessed.data) return DataProcessResult.success({ skipped: true });
// ORDER 2+ — business logic starts here
```

Queue delivery is at-least-once. Without SETNX at ORDER 1, every redelivery
produces duplicate state mutations (double charges, double registrations, double
points). SETNX must be first — not after any I/O — to prevent partial execution
on redelivery from producing partial duplicates.

`cycleBudget` for REGISTRATION archetype tasks = 3 (maximum). A lower budget risks
the model generating the sequential anti-pattern before the arbiter can reject it.

Detected by: NAMED_CHECK_IDEMPOTENCY in validate.handler.ts; score-0 in AF-9.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-003 — V39 Rule: 4 Artifacts per External System (2026-04-19)

For every external system dependency, the engine generates exactly 4 artifacts:
(1) Interface — abstract contract (`IEmailService`, `IPaymentGateway`, etc.);
(2) Factory — resolution via `IExternalServiceFactory<T>.createAsync(context)`;
(3) Base Skeleton — abstract class that generated implementations extend;
(4) Generated Implementation — concrete class produced by the Skill Factory.

The Skill Factory routes to implementations via factories. Generated code never
imports concrete providers directly. V39 was codified after finding 6 flows that
skipped the factory and called provider SDKs directly during FLOW-DESIGN-017 review.

Supplements D-HIST-001 (fabric-first principle) at the per-external-system level.
Detected by: V39 named check, BFA Phase A audit, FC-31 pattern scan.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-004 — BOLA: Tenant Scope via AsyncLocalStorage, Never Request Parameter (2026-04-19)

Tenant scoping is automatic via AsyncLocalStorage (ALS). `TenantContextMiddleware`
sets `TenantContext` in ALS on every request. All fabric providers read `tenantId`
from ALS internally. No service method accepts `tenantId` as a parameter.

This makes cross-tenant reads architecturally impossible by construction: no developer
can accidentally query another tenant's data because the tenant filter is applied
automatically by the fabric. Passing `tenantId` as a parameter creates a
caller-responsibility model where any caller can pass any tenantId — including forged.

Addresses OWASP API Top 1 (BOLA — Broken Object Level Authorization): manipulating
object IDs to access other tenants' data. ALS-automatic scoping makes this impossible
within XIIGen's service layer without a deliberate fabric override.

Detected by: DNA-5 scan, BOLA named check, scope isolation arbiter (SK-526 / FC-32).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-005 — REGISTRATION Archetype: Atomic Single-Operation, cycleBudget=3 (2026-04-19)

The REGISTRATION archetype uses a single atomic operation. `registerAtomically()`
wraps both the capacity check and the registration write in one database transaction.
No separate `check()` then `create()` sequence is ever permitted.

The default model output is a sequential check-then-write (PROCESSING archetype).
This produces a race condition under concurrent requests: two users see capacity=1,
both pass the check, both write — capacity goes to -1. This is the canonical
REGISTRATION failure mode. It compiles, passes unit tests, and is a SILENT_FAILURE
in training data if the arbiter does not catch it at score-0.

Teaching point: "When you see 'check available then register', it is always a race
condition. The only safe pattern is `registerAtomically()`."

cycleBudget = 3 (maximum) for REGISTRATION archetype tasks.
DPO triple tagged `dpo-training-guard` (correctness-propagating).
Source: FLOW-03 ARCHITECTURE-DECISIONS.json D-03-1.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-006 — Best-Effort Observer: Catch Block Returns Success, Never Failure (2026-04-19)

Any task type that observes another task type's output (analytics tracking,
notification dispatch, audit logging, feed updates) is a best-effort observer.
The entire handler body is wrapped in try/catch. The catch block returns
`DataProcessResult.success({ operationName: false })` — never `DataProcessResult.failure()`.

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

A failure result from an observer contaminates the DPO triple of the upstream task:
it transforms a successful business outcome into a failed training example, corrupting
the AI's learning signal for the correct upstream pattern.

DPO triple tagged `dpo-training-guard`. Cross-reference: D-02-BROAD-03 (FLOW-02
nudge best-effort), D-HIST-007 (SILENT_FAILURE), D-HIST-005 (REGISTRATION).
Source: FLOW-03 ARCHITECTURE-DECISIONS.json D-03-4.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-007 — SILENT_FAILURE: config.get() for MACHINE Constant = score-0 (2026-04-19)

When a named check prevents a SILENT_FAILURE (code that compiles, passes all tests,
but violates an architectural invariant), that check is `score-0` severity, not
`BUILD_FAILURE`. BUILD_FAILURE is for compilation errors. SILENT_FAILURE violations
require score-0 because the violation is invisible to standard testing.

Canonical example: a value declared in `machineConstants[]` with `neverFromConfig: true`.
The model generates `this.config.get('qr_token_ttl', 60)` — the code is functionally
correct but architecturally wrong. It must be scored 0 regardless of functional
correctness, because a tenant override of a security constant is the actual failure.

Correct form: `const QR_TOKEN_TTL_SECONDS = 60` — numeric literal in source, never
from config. `machineConstants` entry: `{ name: 'QR_TOKEN_TTL_SECONDS', neverFromConfig: true }`.

Teaching point: "Any named check that prevents a SILENT_FAILURE must be score-0
severity, not BUILD_FAILURE. BUILD_FAILURE is for compilation errors. SILENT_FAILURE
is for architecturally wrong code that compiles and passes tests."

DPO triple tagged `dpo-training-guard`. Governed by SK-441 SILENT_FAILURE protocol.
Source: FLOW-04 ARCHITECTURE-DECISIONS.json D-04-5.

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19

---

## D-HIST-008 — Read-Path Extension Over Dual-Write for Guarded Services (2026-04-19)

When a service writes to its own index with carefully ordered guards (BOLA, OCC
optimistic concurrency, FLOW_IMMUTABLE), the correct approach to make that data
visible in other read paths is to extend the read path (add a fallback to the
reader) — not to dual-write (add a second write target in the existing service).

Dual-write forces identical guard ordering across two indices. Any future change to
the guard ordering must be applied twice, at different blast radii. OCC schemes
keyed to the original index become fragile when replicated.

The read-path extension is bounded: it touches only the reader (TopologyController)
and a new adapter. The writer's guard invariants remain single-sourced.

Locked: Option (b) — extend TopologyController bridge with additional fallback path.
`FlowCanvasWriterService` (T617) stays untouched; its BOLA + FLOW_IMMUTABLE guards
(CF-18-1) remain single-sourced in `xiigen-flow-canvases`.

Source: docs/decisions/ADR-USER-JOURNEY-RECONNECTION-INDEX-RECONCILIATION.md.
Cross-reference: D-PARALLEL-1 (immutable ranges — same single-source-of-guards principle).

**To change:** Luba approval + DECISIONS-LOCKED.md amendment.
**Registered:** 2026-04-19
```

---

## §3 — Verification after D2

```bash
# 1. Count D-HIST headings appended
grep "^## D-HIST-" docs/decisions/DECISIONS-LOCKED.md | wc -l
# Expected: 8

# 2. Confirm D-STACK-8 is immediately before D-HIST Group header
grep -n "D-STACK-8\|D-HIST Group" docs/decisions/DECISIONS-LOCKED.md
# Expected: D-STACK-8 heading at lower line number; D-HIST Group header follows

# 3. Confirm all 8 To change / Registered fields are present
grep "Luba approval + DECISIONS-LOCKED.md amendment" docs/decisions/DECISIONS-LOCKED.md | wc -l
# Expected: 8

# 4. Confirm no D-HIST entry is missing its Registered date
grep "2026-04-19" docs/decisions/DECISIONS-LOCKED.md | wc -l
# Expected: ≥8 (one per D-HIST entry)

# 5. Confirm the code block in D-HIST-006 is intact
grep "NEVER failure" docs/decisions/DECISIONS-LOCKED.md
# Expected: 1 hit inside the best-effort observer catch comment
```

---

## §4 — Relationship to I2

| Round | Role |
|---|---|
| **I2** | Design spec — rationale, fixture sources, iron rules, lock reasoning for each entry |
| **I4** | Production copy — exact formatted text to paste into DECISIONS-LOCKED.md |

D2 executor uses **I4** only. I2 is retained as the design record explaining WHY
each entry was admitted.
