---
name: domain-event-design
sk_number: SK-494
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before designing any flow that emits or consumes events, design the event
  schema: naming conventions, payload structure, versioning, forward compatibility,
  and cross-flow consumer registration. The UMLs contain 50+ domain events with
  no design discipline. Every ad-hoc event name or schema is a future migration cost.
triggers:
  - "design an event"
  - "what should this event look like"
  - "event schema"
  - "event naming"
  - "what events does this flow emit"
  - "cross-flow event contract"
  - "CloudEvent design"
  - "event payload"
---

# Domain Event Design Skill (SK-494)

## WHAT THIS SKILL PREVENTS

Event names that don't form a coherent vocabulary (`UserRegistered` vs
`RegistrationCompleted` vs `UserOnboarded` — which is which?). Payload shapes
that drop fields across refactors, breaking downstream consumers silently.
Consumer counts that become impossible to track. Events that couple flows
too tightly (consumer reads internal IDs that shouldn't cross boundaries).

---

## RULE 1 — NAMING CONVENTION

All events follow: `[Entity][PastTenseVerb]`

**Entity** = the domain object that changed state.
**PastTenseVerb** = what happened to it.

```
✅ UserRegistered, EmailVerified, EventCreated, PaymentCompleted
❌ RegistrationEvent, UserOnboardingDone, EventWasCreated
```

For state machine transitions, use the specific state name:
```
UserRegistered → UserEmailVerified → UserOnboardingStarted → UserOnboardingCompleted
NOT: UserUpdated (three times at different stages)
```

---

## RULE 2 — PAYLOAD DESIGN

Every event payload follows the CloudEvents DNA-9 envelope PLUS a domain section:

```typescript
interface DomainEvent<T> {
  // CloudEvents required fields (DNA-9)
  id:          string;     // UUID, globally unique
  source:      string;     // e.g. "/xiigen-community/FLOW-01/T47"
  type:        string;     // e.g. "com.xiigen.community.UserRegistered"
  time:        string;     // ISO-8601
  datacontenttype: 'application/json';

  // Domain payload
  data: T;

  // XIIGen metadata
  tenantId:    string;     // scope_id root (DNA-5)
  traceId:     string;     // for cross-service correlation
  flowId:      string;     // which flow produced this event
  taskTypeId:  string;     // which task type produced this event
}
```

**Payload design rules:**

1. **Include stable identifiers, not internal IDs.** Cross-flow consumers should
   receive `email` (stable) not `internalMemberId` (internal, may change).
   Exception: when the internal ID is specifically needed for the downstream operation.

2. **Never include sensitive data.** Passwords, payment card numbers, health data.
   Include a reference (memberId) that the consumer can use to look up what it needs.

3. **Include enough to act without a lookup.** If 80% of consumers need `memberName`
   alongside `memberId`, include both. The consumer should not need to make a
   synchronous call to process the event.

4. **Design for additive evolution.** Future versions add fields; they never remove
   or rename. Consider marking optional fields explicitly.

```typescript
// Good: stable, minimal, no sensitive data, enough to act
interface UserRegisteredPayload {
  memberId:       string;  // stable internal reference
  email:          string;  // stable identifier for dedup
  registrationMethod: 'email' | 'sso';  // needed by downstream routing
  preferences:    { projectType: string; teamSize: string };  // needed by onboarding
}

// Bad: internal IDs without context, over-specified
interface UserRegisteredPayload {
  dbRowId:        number;  // internal, unstable
  registrationTimestampMs: number;  // can be derived from time field
  hashedPassword: string;  // NEVER include
  internalFlags:  Record<string, unknown>;  // coupling to internals
}
```

---

## RULE 3 — CONSUMER COUNT LIMIT

Each event may have a maximum of 5 direct consumers before it becomes shared
infrastructure requiring its own topic/stream with explicit consumer groups.

```
UserRegistered consumers:
  → FLOW-02 T50 (profile enrichment) ✅ consumer 1
  → FLOW-06 T_BusinessProfiler ✅ consumer 2
  → Analytics Service ✅ consumer 3
  Total: 3 consumers — ACCEPTABLE

PostCreated consumers:
  → NLP Service ✅ consumer 1
  → Content Moderation Service ✅ consumer 2
  → Ranking Service ✅ consumer 3
  → Feed Integration Service ✅ consumer 4
  → Analytics Service ✅ consumer 5
  → Notification Service ✅ consumer 6  ← 6 consumers — OVER LIMIT
  Action: Create PostPublished as a downstream event after the first 5 complete
```

When consumer count exceeds 5: add an intermediate orchestration step that fans
out to consumers in parallel, then emits a consolidated downstream event.

---

## RULE 4 — CROSS-FLOW EVENT CONTRACTS

When an event crosses a flow boundary (FLOW-01 emits → FLOW-02 consumes), it is
a cross-flow contract. Cross-flow contracts have stricter rules than intra-flow events:

1. **Schema is frozen once a consumer exists.** After FLOW-02 is designed to consume
   `OnboardingCompleted`, the payload schema cannot be changed without a version bump.

2. **Register in cross-flow-deps index before Phase A of the consuming flow.**
   The event must be visible in `xiigen-cross-flow-deps` before FLOW-02 Phase A.

3. **Include minimum viable payload for all current consumers.** If FLOW-02 needs
   `memberId` and FLOW-03 needs `memberProfile`, and both consume `OnboardingCompleted`,
   the payload includes both — not the lowest common denominator.

4. **Version when the schema changes.** Use `com.xiigen.community.OnboardingCompleted.v2`
   — not a silent schema change.

---

## BINDING PAYLOAD INVARIANTS (universal, from core)

These three Rule-2/Rule-4 clauses are **binding score-0 invariants**, not style
guidance. A reviewer rejects any event that violates them:

```
no_internal_ids       — payload carries stable identifiers (email, public memberId),
                        never internal/unstable DB ids (dbRowId, autoincrement).
additive_only         — schema evolution adds optional fields; it never removes or
                        renames an existing field. A breaking change ⇒ a NEW version
                        type (e.g. ...Completed.v2), never a silent edit.
freeze_after_subscriber — once any consumer is wired to an event, its payload schema
                        is frozen; changes require a version bump (Rule 4.1).
```

> **Pair with `event-contract-design`:** this skill owns *naming + payload shape*.
> The moment an event needs **correlation fields, compensation/rollback, an SLA,
> or an INJECTABLE/PLATFORM_ONLY boundary**, switch to
> `planning--event-contract-design-SKILL.md` — that skill adds the mandatory
> server-event schema (correlationId/sessionId/traceParent), the `*Reverted` /
> `*RolledBack` compensation rule, SLA/retry annotation, no-PII enforcement, and
> the string-constant (not class-name) event-type rule. Together they form the
> full core event contract; naming alone is not the contract.

---

## STEP-BY-STEP: DESIGN AN EVENT

```
1. Name the entity and verb: User + Registered → UserRegistered
2. Apply naming check: PastTense? Clear entity? No "Event" suffix? ✅
3. List who produces it: FLOW-01 T47 on successful registration
4. List who consumes it: FLOW-02 T50, Analytics, possibly more
5. Consumer count check: ≤5? If not, design intermediate event
6. Payload: What does each consumer NEED? Start with minimum, add for coverage
7. Cross-flow check: Does it cross a flow boundary? Apply frozen-schema rule
8. CloudEvents wrapper: Add envelope fields
9. Register: If cross-flow, add to FLOW-01 Phase F cross-flow registration step
10. Verify naming consistency with existing events in the vocabulary
```

---

## THE EVENT VOCABULARY

Maintain a running event vocabulary when designing multiple flows. Before adding
a new event, verify:
- No existing event covers the same state transition
- The name follows the Entity+PastVerb pattern
- It is in the same granularity tier as other events in the flow

```
Registration vocabulary (example):
UserRegistrationInitiated     ← FLOW-01 T47 start
EmailVerificationRequested    ← FLOW-01 T47 → T48 bridge
EmailVerified                 ← FLOW-01 T48 completion
OnboardingStarted             ← FLOW-01 T49 start
OnboardingDelivered           ← FLOW-01 T49 completion (intra-flow terminal)
OnboardingCompleted           ← FLOW-01 cross-flow terminal event (consumed by Wave 2)
```
