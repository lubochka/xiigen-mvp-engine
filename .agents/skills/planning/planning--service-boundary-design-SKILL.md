---
name: service-boundary-design
sk_number: SK-496
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Given a UML sequence diagram, determine which services become task types,
  which become fabric interface calls within a task type, and which become
  shared infrastructure. Encodes the domain judgment behind T47/T48/T49 mapping
  from the Registration UML. Fires inside SK-492 (requirement-to-flow) at Step 2.
triggers:
  - "how do I map this UML to task types"
  - "which services become task types"
  - "service boundary from UML"
  - "UML to task type mapping"
  - "when to merge services"
  - "when to split services"
  - "service boundary decision"
---

# Service Boundary Design from UML (SK-496)

## WHAT THIS SKILL PREVENTS

Two failure modes with opposite causes:

**Over-splitting:** 10 UML services → 10 task types. The AF pipeline generates
10 separate services where 3 cohesive ones would be correct. Each service is
trivially simple, tests are shallow, DPO triples have low training value.

**Under-splitting:** 10 UML services → 1 task type called `RegistrationOrchestrator`
that does everything. The service is untestable in isolation. Iron rules conflict
because they cover unrelated concerns. Score cycles thrash.

---

## THE FOUR BOUNDARY TESTS

Apply all four. The boundary that passes the most tests is correct.

### Test 1 — Transaction Boundary Test

Services that must commit or roll back together belong in the same task type.

```
UserService.createRecord() + AuthService.createCredentials()
→ If one fails, both must rollback
→ They share a transaction boundary
→ MERGE into one task type (T47: UserRegistrationInitiator)

EmailService.sendVerification() + TokenService.createToken()
→ Token can be created even if email delivery fails (retry later)
→ They do NOT share a transaction boundary
→ SEPARATE task types (T48 handles email + token together via async retry)
```

### Test 2 — Lifecycle Test

Services with different TTLs, retry policies, or completion timelines belong
in different task types.

```
Registration: completes in milliseconds → T47
Email verification: window is 24 hours → T48
Profile completion: happens days later → T49

Different lifecycles → different task types.
```

### Test 3 — Consumer Independence Test

If service A's output is consumed by a flow that doesn't need service B's output,
A and B belong in different task types.

```
UserRegistered event → consumed by FLOW-02 (social graph seeding)
EmailVerified event → consumed by FLOW-06 (onboarding trigger)

Different consumers → different task types → different events.
Merging A+B means the wrong consumers receive the merged event.
```

### Test 4 — Domain Ownership Test

Services in different bounded contexts belong in different task types even if they
run sequentially.

```
Auth Service (security domain) → owns: credentials, tokens, sessions
User Service (identity domain) → owns: name, email, preferences, profile

Different domains → separate ownership → separate task types? 
Answer: MERGE here because they always commit together (Test 1 wins).
But note: Auth concerns in the merged task type get their own iron rules.
```

---

## THE DECISION TABLE

| Transaction shared? | Lifecycle shared? | Consumers shared? | Decision |
|--------------------|-------------------|-------------------|---------|
| YES | YES | YES | MERGE — one task type |
| YES | YES | NO | MERGE — same task type, different events emitted |
| YES | NO | any | SPLIT — different task types, same flow |
| NO | YES | YES | MERGE if domains are compatible |
| NO | YES | NO | SPLIT |
| NO | NO | any | SPLIT — definitely separate task types |

---

## FABRIC CALL vs TASK TYPE

Not every UML service becomes a task type. Some become fabric interface calls
*within* a task type.

**A UML service becomes a FABRIC INTERFACE CALL (not a task type) when:**
- It is stateless (no database write)
- It is called synchronously within another service's business logic
- Its failure doesn't change the outcome of the business operation
- It never emits its own domain events

```
MessagingService.send() in Registration UML:
  - Stateless (sends, doesn't store)
  - Called synchronously within T49 (onboarding delivery)
  - Failure means retry, not business state change
  - Never emits UserMessageSent as a business event
  → FABRIC INTERFACE CALL: IMessagingService within T49

Questionnaire Service in Registration UML:
  - Stateful (stores answers)
  - Has its own lifecycle (user can save and continue)
  - Emits QuestionnaireCompleted as a business event
  - FLOW-06 (Onboarding) consumes QuestionnaireCompleted
  → TASK TYPE: T49 QuestionnaireOrchestrator
```

---

## APPLYING TO THE REGISTRATION UML

| UML Service | Owns State | Lifecycle | Consumers | Decision |
|-------------|-----------|-----------|-----------|---------|
| Auth Service | YES | immediate | FLOW-01 internal | MERGE with User → T47 |
| User Service | YES | immediate | FLOW-02, FLOW-06 | MERGE with Auth → T47 |
| Email Service | YES | 24h TTL | FLOW-06 triggers | TASK TYPE: T48 |
| Verification Token | YES | 24h TTL | consumed by T48 | MERGE with T48 |
| Questionnaire Service | YES | multi-step | FLOW-06 | TASK TYPE: T49 |
| Messaging Service | NO | immediate | none | FABRIC CALL within T49 |
| Analytics Service | NO | eventual | analytics only | BEST-EFFORT OBSERVER |
| SSO Provider | external | external | FLOW-01 only | FABRIC INTERFACE: ISsoProvider |

Result: 3 task types (T47, T48, T49), 1 fabric call, 1 observer, 1 external interface.
Not 10 task types for 10 services.

---

## RECORDING THE DECISIONS

For each boundary decision, record in ARCHITECTURE-DECISIONS.json (SK-450):

```json
{
  "id": "D-FLOW01-001",
  "decision": "Merge Auth Service and User Service into T47",
  "rationale": "Transaction boundary — both commit atomically. Same lifecycle. FLOW-02 consumes the merged UserRegistered event, not separate Auth and User events.",
  "alternatives": ["Split into T47a AuthInitiator + T47b ProfileCreator"],
  "rejectedBecause": "Would require saga coordination for a single atomic business operation. DPO training value is lower on atomic trivial services.",
  "impact": "UserRegistered payload must carry both auth context and profile context"
}
```

---

## ANTI-PATTERNS

```
❌ One UML service = one task type (mechanical mapping, ignores domain logic)
❌ "Orchestrator" task type with 6+ responsibilities (under-splitting)
❌ Splitting on technical lines (database vs queue) rather than domain lines
❌ Making every stateless pass-through service a task type
❌ Making every external provider a task type (they are fabric interfaces)
```
