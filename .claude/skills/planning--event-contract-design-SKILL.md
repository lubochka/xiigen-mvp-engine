---
name: event-contract-design
sk_number: SK-505
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: product
author: luba
updated: "2026-06-29"
contexts: ["web-session", "claude-code"]
description: >
  The mandatory server-event CONTRACT for every event that crosses a module or
  flow boundary in mvp: correlation fields that are always present (MACHINE),
  a compensation/rollback schema for every forward event, an SLA/retry
  annotation, an INJECTABLE vs PLATFORM_ONLY handler boundary, string-constant
  event-type names (never class names), and a hard no-PII rule. domain-event-design
  (SK-494) owns naming and payload shape; THIS skill adds the parts that make an
  event safe to trace, roll back, and consume without coupling to the publisher.
triggers:
  - "event contract"
  - "correlation id on event"
  - "compensation event"
  - "rollback event"
  - "saga compensation"
  - "event SLA"
  - "event retry policy"
  - "injectable vs platform event handler"
  - "cross-module event"
  - "CloudEvent envelope contract"
  - "no PII in event"
---

# Event Contract Design Skill (SK-505)

## WHAT THIS SKILL PREVENTS

- An event with **no correlation fields** → it cannot be traced back to the
  session/execution that produced it; cross-module debugging is impossible.
- An event with **PII in the payload** → user data leaks across module/flow
  boundaries into consumers that had no business seeing it.
- A forward event with **no compensation schema** → a multi-step flow cannot be
  rolled back when a later step fails (no LIFO undo).
- A bus event modelled as **HTTP coupling** → the subscriber is welded to the
  publisher's implementation and cannot be swapped.

domain-event-design (SK-494) answers "what is this event called and what is in
its payload". This skill answers "what is the binding *contract* every
boundary-crossing event must satisfy before any handler is written".

---

## WHEN TO INVOKE

- Before writing any new event that crosses a NestJS module boundary or a flow
  boundary.
- When SK-494 produces an event that participates in a compensable (multi-step,
  rollback-able) flow.
- Before wiring any compensation / LIFO rollback chain.
- Whenever an event must carry correlation for cross-service tracing.

---

## SECTION 1 — SERVER EVENT SCHEMA (required structure)

Every boundary-crossing event is emitted as a **CloudEvents envelope** (the DNA-9
transport — `createCloudEvent(...)` / `ICloudEventsEnvelopeService`, surfaced via
`cloudEvents.emit(...)`), never a raw `EventEmitter2.emit()` or a direct
`queue.enqueue()` (forbidden by DNA-9 / CF-448; the queue fabric is a downstream
consumer reached through store-before-dispatch / DNA-8).

```typescript
// Stack-neutral event type names are STRING CONSTANTS, never class names.
export const ScoreUpdated = 'com.xiigen.community.ScoreUpdated' as const;

interface ServerEventEnvelope<T> {
  // Correlation fields — ALWAYS present, ALWAYS named the same (MACHINE)
  type:          string;   // the string-constant event type, e.g. ScoreUpdated
  source:        string;   // "/xiigen-community/FLOW-01/T47"
  correlationId: string;   // ties every event in one execution chain together (MACHINE)
  sessionId:     string;   // scope isolation — replaces tenantId at session scope (MACHINE)
  traceParent:   string;   // W3C distributed trace for cross-phase debugging (MACHINE)
  time:          string;   // ISO-8601 — when emitted
  origin:        'server' | 'client';

  // Typed payload — NEVER `any`/`unknown` in production handlers
  data:          T;

  // Tenant/flow context
  tenantId:      string;   // multi-tenant scope root (DNA-5)
  flowId:        string;
  taskTypeId:    string;
}
```

**Three correlation fields are MACHINE — always present, always identically named:**
`correlationId`, `sessionId`, `traceParent`. A handler/test may assert their
presence unconditionally.

### No PII in any event payload. Ever.

PII for this project: external-system userId, email addresses, display names, IP
addresses not needed for routing, payment/card data, health data. If a downstream
consumer needs user context, it carries an **id** and looks the rest up through the
proper service — the event never carries the sensitive value.

```typescript
// ❌ PII leak
data: { email: 'a@b.com', hashedPassword: '...', fullName: 'Jane Doe' }
// ✅ id + capability-level data only
data: { memberId: 'm_123', registrationMethod: 'sso' }
```

---

## SECTION 2 — COMPENSATION EVENT RULE

For every **forward** server event that mutates state, define its compensation
event up front:

```
Forward:        {EventName}
Compensation:   {EventName}Reverted  |  {EventName}RolledBack

The compensation payload is the forward payload PLUS one field:
    rollbackReason: string

TERMINAL events have NO compensation (state cannot be undone), e.g.:
  - OnboardingCompleted    → terminal, no compensation
  - PaymentCaptured        → compensation is PaymentRefunded with rollbackReason
  - CapabilityPromoted     → terminal (can only be demoted by new evidence)
```

```typescript
export const ScoreUpdated  = 'com.xiigen.community.ScoreUpdated'  as const;
export const ScoreReverted = 'com.xiigen.community.ScoreReverted' as const; // compensation

interface ScoreRevertedData extends ScoreUpdatedData {
  rollbackReason: string;   // why the forward effect was undone
}
```

Compensation events wire directly into the LIFO rollback chain of the flow's
saga. A forward event that mutates state with no compensation event is an
admission-blocking gap, not a later cleanup.

---

## SECTION 3 — SLA / RETRY ANNOTATION

Every place a flow **waits on** an event must declare its timing explicitly.
"No annotation" is forbidden — it implies "unknown", which cannot be verified.

```typescript
interface EventGateConfig {
  eventType:       string;        // event to await
  timeoutMs:       number | null; // null = synchronous, no timeout (must be explicit)
  timeoutEvent:    string | null; // emitted if the timeout fires
  retry:           RetryPolicy | null;
}

interface RetryPolicy {
  owner:        'task-type' | 'caller';
  maxAttempts:  number;                              // default 3
  strategy:     'exponential_backoff' | 'linear';
  onMaxRetries: 'compensate' | 'fail' | 'escalate';
}

// Synchronous, sub-millisecond event → timeout is explicitly null
const gate: EventGateConfig = { eventType: ScoreUpdated, timeoutMs: null, timeoutEvent: null, retry: null };
```

---

## SECTION 4 — FABRIC INTERFACE BOUNDARY (INJECTABLE vs PLATFORM_ONLY)

For each subscriber/handler, declare whether a session or experiment may swap it:

```
INJECTABLE:     a session/experiment MAY provide a different handler implementation
PLATFORM_ONLY:  security-critical or DNA-invariant — NO customization allowed
```

```typescript
// IScoreHandler:    INJECTABLE     — experiments may supply a custom scoring handler
// IPromotionHandler: PLATFORM_ONLY — promotion logic is invariant / security-critical
```

Default for any unmarked handler: **PLATFORM_ONLY** (safe default — opt in to
customization explicitly).

---

## SECTION 5 — STACK-NEUTRAL CONTRACT CHECK

After designing CONSUMES / EMITS / BOUNDARY for any capability, verify:

```
□ Every event type name is a STRING CONSTANT — not a TS interface/class name
    CORRECT: ScoreUpdated = 'com.xiigen.community.ScoreUpdated'
    WRONG:   IScoreUpdatedEvent (interface reference) / class ScoreUpdatedEvent

□ CONSUMES references only DNA-9 CloudEvents bus events — no HTTP calls
    CORRECT: "ScoreUpdated (CloudEvents bus — from RankingModule)"
    WRONG:   "POST /api/score/update" (HTTP coupling)

□ EMITS goes through cloudEvents.emit(...) — never EventEmitter2/queue.enqueue() directly

□ BOUNDARY values are exactly "INJECTABLE" or "PLATFORM_ONLY"
    WRONG:   "IScoreHandler: @Injectable() class ScoreHandler" (impl detail)

□ Payload carries NO PII; correlationId/sessionId/traceParent are present
```

A failed check → produce a gap report **before** any handler implementation.

---

## SECTION 6 — EVENT CONTRACT DOCUMENT FORMAT

Before any handler implementation, produce:

```markdown
## Event Contract — [CapabilityName]

### Emitted:
- `ScoreUpdated` — after scoring completes
  Correlation: correlationId, sessionId, traceParent, time, origin="server"
  Data: { score: number; capability: string; observationCount: number }   // no PII
  Compensation: `ScoreReverted` (+ rollbackReason)
  SLA: synchronous, timeoutMs = null

- `CapabilityPromoted` — when confidence ≥ threshold
  Data: { capability: string; fromStatus: string; newStatus: string }
  Terminal — no compensation

### Consumed: (none — server-driven)

### Boundary:
  IScorePublisher: PLATFORM_ONLY — promotion logic is invariant
```

---

## TYPED RESULT BOUNDARY (mvp)

Handlers return through the project's typed `DataProcessResult<T>` (or a
discriminated `Result` union), never a thrown exception for business outcomes and
never `OperationResult<T>` (that is the C# core wrapper, not the mvp one). An event
handler that throws for an expected business condition violates the contract.

---

## ANTI-PATTERNS

1. **Email/PII in `data`** → remove it; carry an id and look up via the service.
2. **Forward event with no compensation** → add `{Event}Reverted` before coding.
3. **Event type = class/interface name** → use a string constant.
4. **CONSUMES references an HTTP endpoint** → events cross boundaries via the
   CloudEvents bus, not HTTP.
5. **`timeoutMs` left undefined** → set it explicitly (`null` for synchronous).
6. **`EventEmitter2.emit()` / `queue.enqueue()` called directly** → emit through
   `cloudEvents.emit(...)` (DNA-9); the queue is a downstream consumer (DNA-8).

---

## TEST STRATEGY (untrained-honest scaffold AND wired contract)

```
unit         — payload shape; correlationId/sessionId/traceParent always present;
               no PII fields; string-constant type names.
integration  — emit through cloudEvents.emit(...) and assert the envelope on the
               bus (NOT a direct EventEmitter2 path); compensation event fires on
               induced downstream failure and carries rollbackReason.
negative     — handler returns a typed failure Result (does not throw) on a bad
               payload; PII field in payload is rejected by the contract check.
```

A contract that only declares the schema but has no test asserting correlation +
no-PII + compensation-on-failure is a scaffold, not a wired contract — report it
as such, do not claim the event is production-safe.

---

## INTEGRATION

- `planning--domain-event-design-SKILL.md` (SK-494) — naming + payload shape; this
  skill adds the binding contract (correlation, compensation, SLA, boundary, no-PII).
- DNA-9 (CloudEvents transport) / DNA-8 (store-before-dispatch) — the only allowed
  emit/deliver path; direct `EventEmitter2`/`queue.enqueue()` is forbidden.
- `planning--temporal-behavior-design-SKILL.md` — temporal phase-transition events
  use this contract for their correlation + scheduler-emitted envelopes.
