---
name: mode-c-event-contract-designer
sk: SK-419
description: >
  Guides the design of Mode C event contracts for any flow. Covers server
  events, client events, compensation events, SLA specs, and the topology
  file structure. Use when writing Pass 1 or Pass 2 of the re-examination
  algorithm, or when designing new event schemas from scratch.
layer: planning
version: 1.1.0
createdAt: 2026-03-20
requires: [SK-416]
complements: [SK-418, SK-420]
---

# ModeC EventContractDesigner [SK-419]

## Purpose

In Mode C, the event contract is canonical. The code is advisory.
This skill ensures every event schema is complete, language-agnostic,
and carries the three required correlation fields. It also ensures
compensation events are auto-generated for every forward event,
and client events have the source field and clientTimestamp.

## When AF-4 RAG Retrieves This Skill

- Writing Pass 1 (event contract extraction) of re-examination algorithm
- Writing Pass 2 (client event identification)
- "Design the event schemas for FLOW-XX"
- "What events does this task type need?"
- Any question about CloudEvents format or schema structure

## Pattern

### Server event schema — required structure

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "{EventName}",
  "type": "object",
  "required": [
    "eventType", "flowId", "correlationId", "tenantId",
    "timestamp", "source", "traceparent", "data"
  ],
  "properties": {
    "eventType":     { "type": "string", "const": "{EventName}" },
    "flowId":        { "type": "string", "const": "FLOW-XX" },
    "correlationId": { "type": "string", "format": "uuid" },
    "tenantId":      { "type": "string", "format": "uuid" },
    "timestamp":     { "type": "string", "format": "date-time" },
    "source":        { "type": "string", "const": "server" },
    "traceparent":   { "type": "string" },
    "data": {
      "type": "object",
      "required": [...],
      "properties": { /* flow-specific payload */ }
    }
  }
}
```

**Three correlation fields are MACHINE (always present, always named the same):**
- `correlationId` — ties all events in one flow execution together
- `tenantId` — scope isolation (DNA-5)
- `traceparent` — W3C distributed trace (DNA-7)

**No PII in any event payload. Ever.**
PII definition: email, firstName, lastName, phone, address, dateOfBirth, nationalId.
If a downstream consumer needs to display the user's name, they fetch it from
the profile service — the event carries only IDs.

### Client event schema — two extra required fields

```json
"source":          { "type": "string", "const": "client" },
"sessionId":       { "type": "string", "format": "uuid" },
"clientTimestamp": { "type": "string", "format": "date-time" }
```

`clientTimestamp` is for SLA adjudication: if a user acted before the
deadline but network delay caused late arrival, the client timestamp is
authoritative for the window calculation.

### Compensation event — auto-generated rule

For every forward server event, generate a compensation event:
```
Forward:      {EventName}
Compensation: {EventName}RolledBack

The compensation schema is identical to the forward schema
with one additional field in data:
  "rollbackReason": { "type": "string" }

EXCEPTION: terminal events (no rollback possible)
  - EmailVerified → no compensation (verified = verified)
  - UserOnboardingCompleted → no compensation (terminal state)
  - PaymentCaptured → compensation is Refund, not RolledBack
```

### SLA annotation in topology file

Every event gate in the topology must specify timing:
```json
{
  "eventGate": "{EventName}",
  "sla": {
    "timeout": "24h",
    "timeoutEvent": "{EventName}TimedOut",
    "retryPolicy": {
      "owner": "execution-unit",
      "maxAttempts": 3,
      "strategy": "exponential_backoff"
    },
    "onMaxRetries": "compensate"
  }
}
```

Events with no SLA (synchronous, sub-second):
```json
{ "eventGate": "UserRegistrationInitiated", "sla": { "timeout": "none" } }
```

### Integration boundary annotation in genesis prompt

For each factory in the task type:
```
F174 (IAuthenticationService):   INJECTABLE — tenant may provide own auth impl
F181 (ITokenManagementService):  PLATFORM-ONLY — security-critical, not injectable
```

PLATFORM-ONLY factories: any factory handling cryptographic operations,
key management, audit trail, compliance enforcement.
Default for unmarked factories: PLATFORM-ONLY.

## Positive Example

```
Task: design event contracts for T48 EmailVerificationWaitState

CORRECT output:
  Server events (3):
    VerificationEmailSent.schema.json
    EmailVerified.schema.json  
    UserActivated.schema.json

  Client events (2):
    ResendVerificationRequested.schema.json  (source: "client", clientTimestamp present)
    ChangeEmailRequested.schema.json

  Compensation events (1):
    VerificationEmailRevoked.schema.json  (for ChangeEmailRequested path)
    Note: EmailVerified has no compensation (terminal)

  SLA in topology:
    EmailVerified gate: timeout 24h, onTimeout emit VerificationExpired

  Integration boundary:
    F176 (IEmailDeliveryService): INJECTABLE
    F181 (ITokenManagementService): PLATFORM-ONLY
```

## Negative Example

```
WRONG: Event schema includes email field in data
  "data": { "userId": "...", "email": "user@example.com" }
  → PII violation. Email is PII. Remove it.

WRONG: Client event missing clientTimestamp
  Client event only has correlationId + tenantId + source
  → clientTimestamp required. SLA adjudication depends on it.

WRONG: No compensation event for UserRegistrationInitiated
  Forward event exists but no UserRegistrationRolledBack schema
  → Every forward event needs a compensation unless terminal.

WRONG: Factory interface type in event schema
  "data": { "authService": "IAuthenticationService" }
  → Event schemas are pure JSON Schema. No type references.
```

## Integration

```
requires:    SK-416 (session startup — know the flow context before designing)
complements: SK-418 (completeness checker — verifies V2, V3, V15)
             SK-420 (client-server symmetry — Pass 2 uses this skill's patterns)
```

## Test

```
Given: design event contracts for FLOW-09 T94 PaymentSagaStep

Expected:
  - Server events: PaymentIntentCreated, PaymentCompleted, PaymentFailed
  - Client events: (none — payment is server-driven)
  - Compensation: PaymentRolledBack (void + refund path)
  - SLA: PaymentCompleted gate has timeout with compensation
  - Integration: F293 (IPaymentOrchestrator) PLATFORM-ONLY
  - No card number, no PSP key in any schema data field

Failure: schema contains card number, PSP key, or email field
```

## Stack-Neutral Event Contract Check (v1.1 addition)

After producing CONSUMES/EMITS/BOUNDARY for any task type, verify:

[ ] All event type names are string literals — not TypeScript interfaces,
  Python dataclass references, or framework-specific annotations
  CORRECT: 'UserOnboardingCompleted'  WRONG: UserOnboardingCompleted (TypeScript type)

[ ] CONSUMES list references only QUEUE FABRIC events — no HTTP endpoints
  CORRECT: 'UserOnboardingCompleted (QUEUE FABRIC — from FLOW-01 T49)'
  WRONG: 'POST /api/enrichment/trigger'

[ ] EMITS list contains only CloudEvents-compatible event names (string)
  CORRECT: 'ProfileEnrichmentCompleted'  WRONG: IProfileEnrichmentEvent (interface)

[ ] INTEGRATION BOUNDARY uses only 'INJECTABLE' or 'PLATFORM-ONLY' values
  CORRECT: 'F184 IEnrichmentSourceService: INJECTABLE'
  WRONG: 'F184: @Injectable() class EnrichmentService' (implementation detail)

If any of these fail: return gap report before proceeding to Pass 4.
