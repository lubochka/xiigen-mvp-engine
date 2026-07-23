# XIIGen — FLOW-08: Event Participation & Social Integration
## UNIFIED EXECUTION PLAN
### Date: 2026-02-26 | Status: PLAN READY | Save Point: PLAN:P0

---

## ═══ PART 1 — NO-CODE EXPLANATION (WHAT WE ARE DOING) ═══

### What This Is

FLOW-08 is the most complex flow in the XIIGen engine to date. It is NOT a single service —
it is an ENGINE EXTENSION that adds:
  - 12 new factory interfaces (Family 27: F244–F255)
  - 7 new engine contracts (T83–T89)
  - 2 new engine primitives (EP-4: Saga Compensation, EP-5: Idempotency Fabric)
  - 1 new DNA pattern (DNA-9: Idempotency-First)
  - 12 new BFA conflict rules (CF-64–CF-75)
  - 6 new stress tests (ST-31–ST-36)
  - 4 new design records (DR-21–DR-24)
  - 6 new design decisions (DD-21–DD-26)
  - 6 new skill patterns (SK-29–SK-34)
  - 1 new flow template (Template 18)

When a user request comes in (e.g. "build me an event participation feature"), the engine
reads these contracts and GENERATES the complete service code + config + DAG — no human writes
any service implementation.

### The Three Structural Novelties of FLOW-08

FLOW-08 introduces capabilities NOT present in FLOW-01 through FLOW-07:

**1. Saga Compensation (EP-4 — NEW ENGINE PRIMITIVE)**
All prior flows assumed happy-path or simple error returns. FLOW-08 has a multi-step
booking pipeline (reserve → pay → ticket → decrement capacity) where any step can fail,
requiring explicit rollback:
  - Payment fails → release reservation → restore capacity → cancel intent
  - Ticket fails → refund payment → release reservation
  - Capacity decrement fails → invalidate ticket → compensate upstream
The engine must know HOW to unwind each step, not just detect failure.

**2. Idempotency Fabric (EP-5 — NEW ENGINE PRIMITIVE)**
FLOW-08 explicitly calls out: duplicate Stripe webhooks, retried event emissions, and
"same user clicks Participate twice" races. Every factory call in this family MUST carry
an idempotency key. Every event emission MUST go through a transactional outbox. This is
a new cross-cutting concern the engine enforces at contract level (DNA-9).

**3. O(n²) Bounded Fan-Out with Backpressure (new task archetype in T87)**
For large events (1000+ attendees), computing connection scores for all pairs is O(n²).
T87 introduces a BOUNDED FAN-OUT archetype: the engine emits batched sub-tasks capped
at a configurable ceiling, with backpressure via queue depth monitoring. This is different
from T40 (3-way join) or T79 (4-way fork) — it is a dynamic fan-out of N×N pairs.

### The Three Infrastructure Novelties

**External Payment Gateway Fabric**
All prior flows use DATABASE FABRIC, QUEUE FABRIC, AI ENGINE FABRIC, RAG FABRIC.
FLOW-08 adds the EXTERNAL GATEWAY FABRIC — a new fabric layer wrapping third-party systems
(Stripe, Google Calendar, Apple Calendar) behind typed factory interfaces with:
  - Webhook signature verification
  - Retry + circuit breaker
  - Secret management integration
  - Audit event emission

**Multi-Milestone Timer Evolution**
EP-2 (Durable Timer) already exists. FLOW-08 uses a CHAIN of timers on a temporal
timeline (T-7d, T-1d, T-0, T+1...T+7) with different actions at each milestone, plus
exponential decay math. T89 formalizes this as the TIME-EVOLUTION SCHEDULER archetype.

**ACID Critical Section with Row Lock**
The capacity decrement step (T85) must happen inside a PostgreSQL row-lock transaction.
The engine must generate service code that acquires the lock, decrements, and releases —
all wrapped in a saga compensation boundary. If the engine generates code without the lock
pattern, AF-7 (Compliance) and AF-9 (Judge) must reject it as an IRON RULE violation.

---

## ═══ PART 2 — REQUIREMENT COVERAGE VALIDATION ═══

### FLOW-08 Spec Requirements → Engine Coverage Map

| Spec Requirement | Engine Coverage | Phase |
|-----------------|-----------------|-------|
| Capacity check + 5-min reservation hold | F244 IAvailabilityService → DATABASE FABRIC(PG+Redis) | P1 |
| Stripe payment lifecycle (PaymentIntent) | F245 IPaymentGatewayService → EXTERNAL GATEWAY FABRIC | P1 |
| Idempotency keys + duplicate webhook dedup | EP-5 Idempotency Fabric + DNA-9 | P1 |
| Ticket QR generation + issuance | F246 ITicketingService → DATABASE FABRIC(PG) | P1 |
| Atomic capacity decrement with row lock | T85 engine contract + DR-21 ACID record | P2 |
| Calendar integration (Google/Apple) | F247 ICalendarIntegrationService → EXTERNAL GATEWAY FABRIC | P1 |
| Progressive reminders (T-7/T-1/T-1h/T-15m) | F248 IReminderSchedulerService → DATABASE FABRIC(Redis sorted sets) | P1 |
| Attendee discovery | F249 IParticipantService → DATABASE FABRIC(PG) | P1 |
| 4-component connection scoring | F250–F253, T87 bounded fan-out | P1/P2 |
| Feed integration + diversity rules | F254 IWeightCalcService + F255 IEventFeedService | P1 |
| Time weight evolution + decay | T89 SCHEDULED archetype + EP-2 reuse | P2 |
| Saga compensation (rollback chain) | EP-4 Saga Compensation Registry | P1 |
| BFA conflict: payment race | CF-64 | P3 |
| BFA conflict: capacity double-decrement | CF-65 | P3 |
| BFA conflict: duplicate ticket | CF-66 | P3 |
| BFA conflict: duplicate webhook | CF-67 | P3 |
| BFA conflict: feed diversity cap | CF-68 | P3 |
| BFA conflict: timer drift | CF-69 | P3 |
| Cross-flow: FLOW-01 (auth dependency) | CF-70 | P3 |
| Cross-flow: FLOW-02 (business profile for audience match) | CF-71 | P3 |
| Cross-flow: FLOW-03 (event must exist) | CF-72 | P3 |
| Cross-flow: FLOW-07 (feed service shared with friend feed) | CF-73 | P3 |
| Multi-tenant scope on ALL queries | DNA-5 reuse (scope isolation) — enforced in all T83-T89 | P2 |
| Observability + correlation IDs across 14 services | SK-29 saga skill + DR-22 | P1/P4 |
| Backward compat: FLOW-01–FLOW-07 unchanged | Sequence gap check in P6 validation | P6 |

### Gaps vs FLOW-07 Engine (what FLOW-08 adds that did NOT exist)

| Gap | Resolution |
|-----|-----------|
| No compensation chain | EP-4 Saga Compensation Registry |
| No idempotency enforcement | EP-5 Idempotency Fabric + DNA-9 |
| No external payment gateway fabric | New fabric tier: EXTERNAL GATEWAY FABRIC |
| No calendar integration fabric | F247 in EXTERNAL GATEWAY FABRIC |
| No bounded O(n²) fan-out archetype | T87 BOUNDED FAN-OUT + SK-33 |
| No multi-milestone temporal chain | T89 TIME-EVOLUTION SCHEDULER |
| No transactional outbox in engine | SK-30 skill pattern |
| No row-lock ACID critical section | SK-31 skill pattern |

### Confirmation: Nothing Breaks Backward Compatibility
- Sequences are append-only: F244+, T83+, CF-64+, etc.
- No changes to existing T1-T82 contracts
- No changes to existing F1-F243 interfaces
- EP-1, EP-2, EP-3 unchanged
- DNA-1 through DNA-8 unchanged (DNA-9 is additive)

---

## ═══ PART 3 — POSITIVE AND NEGATIVE EXAMPLES ═══

### Positive Example: T85 (Correct Engine Contract)

```
TASK TYPE: T85 — Ticket Issuance + Atomic Capacity Decrement
ARCHETYPE: ACID CRITICAL SECTION
ENTRY: Fires on TicketIssued event (consumed from Main queue)
PURPOSE: Atomically decrement event capacity under PostgreSQL row-level lock,
         then publish CapacityUpdated. Any failure triggers saga compensation via EP-4.
DISTINCT FROM: T84 (payment saga — different ACID boundary), T83 (reservation hold — optimistic)
FACTORY DEPENDENCIES:
  F246 ITicketingService — resolved via CreateAsync()
  F244 IAvailabilityService — resolved via CreateAsync()
  (IQueueService — resolved via QUEUE FABRIC for TicketIssued consumption)
FABRIC RESOLUTION:
  F246 → DATABASE FABRIC (Skill 05) → PostgreSQL provider
  F244 → DATABASE FABRIC (Skill 05) → PostgreSQL provider (row-lock capable)
  Queue → QUEUE FABRIC (Skill 04) → Redis Streams
AF CONFIGURATION:
  AF-1 (Genesis): generates row-lock acquisition code + compensation trigger
  AF-4 (RAG): retrieves SK-31 (row-lock ACID critical section pattern)
  AF-7 (Compliance): enforces DNA-4 (MicroserviceBase), DNA-9 (idempotency key present)
  AF-8 (Security): verifies no raw SQL injection path
  AF-9 (Judge): validates IR-83 (row lock acquired), IR-84 (compensation registered), IR-85 (no direct PG import)
BFA VALIDATION:
  Registers: entity=EventCapacity, event=CapacityUpdated, API=none
  Conflict checks: CF-65 (double-decrement), CF-72 (event must exist from FLOW-03)
MACHINE/FREEDOM:
  MACHINE (fixed): row-lock pattern, saga compensation registration, idempotency key
  FREEDOM (config): lock timeout (default 5s), retry count (default 3), queue consumer group name
IRON RULES:
  IR-83: Row lock MUST be acquired via F244 factory, not direct SQL
  IR-84: Compensation handler MUST be registered in EP-4 before lock acquisition
  IR-85: No PostgreSQL driver import in generated service code
  IR-86: Capacity must be checked for >0 inside the lock (not before)
  IR-87: CapacityUpdated event MUST be emitted via outbox (EP-5), not direct publish
  IR-88: Duplicate TicketIssued events MUST be rejected via EP-5 dedup store
  IR-89: tenantId MUST be on all database queries (DNA-5)
  IR-90: DataProcessResult<T> wraps all business logic (DNA-3)
QUALITY GATES:
  QG-83: Simulate concurrent 2 users buying last ticket — only 1 succeeds
  QG-84: Simulate TicketIssued received twice — second is idempotent no-op
  QG-85: Simulate lock timeout — compensation fires, reservation released
  QG-86: Simulate capacity=0 on lock acquisition — flow terminates cleanly
  QG-87: CapacityUpdated contains correct before/after counts
  QG-88: Wrong tenantId returns empty, not data from another tenant
  QG-89: DLQ receives poisoned message after 3 retry exhaustion
  QG-90: All DNA-9 compliance checks pass (idempotency key present, outbox used)
```

### Negative Example: What NOT To Do (BUILD FAILURE)

```
BAD — ENGINE REJECTS THIS:

// ❌ Direct PostgreSQL import — violates IR-85, DNA-4
using Npgsql;

// ❌ Typed model — violates DNA-1
public class TicketModel { public int CapacityRemaining { get; set; } }

// ❌ Direct event publish — violates IR-87, DNA-9
await _rabbitMq.PublishAsync("capacity.updated", payload);

// ❌ Raw SQL without lock — violates IR-83
var result = await _db.ExecuteAsync("UPDATE events SET capacity = capacity - 1 WHERE id = @id");

// ❌ No compensation registration — violates IR-84
await DecrementCapacity(eventId); // no rollback registered

// ❌ Missing tenantId — violates IR-89
var ticket = await _db.FindAsync(ticketId); // no scope filter
```

```
CORRECT — ENGINE GENERATES THIS:

// ✅ Fabric interface only
private readonly IExternalServiceFactory<IAvailabilityService> _availFactory;

// ✅ Dictionary, not typed model (DNA-1)
var doc = ObjectProcessor.ParseDocument(rawData); // Dictionary<string, object>

// ✅ Outbox emission (EP-5 / DNA-9)
await _outbox.EmitAsync("capacity.updated", payload, idempotencyKey);

// ✅ Factory resolution with row-lock capability declared
var svc = await _availFactory.CreateAsync(ctx.WithCapability("row-lock"));

// ✅ Compensation registered BEFORE the critical section (EP-4)
await _sagaRegistry.RegisterCompensation(executionId, CompensationStep.RestoreCapacity);
var result = await svc.DecrementAtomicAsync(eventId, tenantId);

// ✅ DataProcessResult wrap (DNA-3)
return result.IsSuccess
    ? DataProcessResult<CapacityState>.Ok(result.Value)
    : DataProcessResult<CapacityState>.Fail(result.Error);
```

### Positive Example: T87 (Bounded Fan-Out — NEW ARCHETYPE)

```
TASK TYPE: T87 — Participant Connection Scoring (Bounded O(n²) Fan-Out)
ARCHETYPE: BOUNDED FAN-OUT
ENTRY: Fires on ParticipantsIdentified event
PURPOSE: For each pair of attendees, compute 4-component connection weight
         with backpressure — emit sub-tasks in batches, never exceeding
         FREEDOM-configured ceiling (default: 500 pairs/batch).
DISTINCT FROM: T40 (static 3-way join), T79 (static 4-way fork) — T87 is DYNAMIC N×N
...
IRON RULES:
  IR-96: Fan-out MUST be bounded — emit batch events, never inline all pairs
  IR-97: Each sub-task MUST carry idempotency key (pairId = sorted(userId1, userId2))
  IR-98: Queue depth MUST be checked before emitting next batch (backpressure gate)
  IR-99: Partial results MUST be acceptable — flow continues if >80% pairs scored
  ...
```

### Negative Example: T87 Anti-Pattern

```
BAD:
// ❌ Computes all pairs inline for 2000 attendee event = 2,000,000 pairs in memory
foreach (var user1 in allParticipants)
  foreach (var user2 in allParticipants)
    await ScorePair(user1, user2); // kills service

CORRECT:
// ✅ Engine generates batch-chunked fan-out via queue
var pairs = ParticipantPairGenerator.Batch(participants, maxBatchSize: 500);
foreach (var batch in pairs)
    await _queue.EnqueueAsync("score-pairs.batch", batch, idempotencyKey: batchId);
```

---

## ═══ PART 4 — PHASED EXECUTION PLAN ═══

Each phase: ~20–40 minutes, clear save point, explicit recovery command.

```
CURRENT STATE (from SESSION_STATE_MERGE.md FLOW-07 FINAL):
  Factories:       F1–F243 (26 families)
  Task Types:      T1–T82
  BFA Rules:       CF-1–CF-63
  Stress Tests:    ST-1–ST-30
  Design Records:  DR-1–DR-20
  Design Decisions DD-1–DD-20
  Skill Patterns:  SK-1–SK-28
  Flow Templates:  Template 1–17
  DNA Patterns:    DNA-1–DNA-8
  Engine Prims:    EP-1, EP-2, EP-3
  DNA Compliance:  604/604

NEXT NUMBERS (FLOW-08):
  Factories:    F244–F255 (Family 27, 12 interfaces)
  Task Types:   T83–T89 (7 contracts)
  BFA Rules:    CF-64–CF-75 (12 rules)
  Stress Tests: ST-31–ST-36 (6 tests)
  Design Recs:  DR-21–DR-24 (4 records)
  Design Dec:   DD-21–DD-26 (6 decisions)
  Skill Pats:   SK-29–SK-34 (6 patterns)
  Template:     Template 18 (event-participation-v1)
  DNA:          DNA-9 (Idempotency-First — new)
  Engine Prim:  EP-4 (Saga Compensation), EP-5 (Idempotency Fabric)
```

---

### PHASE 0 — RAG Index + Gap Analysis (15 min)
**Save Point: PLAN:P0 ✅ (this file)**

What we do:
  - Extract all FLOW-08 requirements into a mini-RAG (this plan IS that RAG)
  - Map each requirement to engine components
  - Confirm all sequence numbers (done above)
  - Identify new engine primitives needed
  - Write the positive/negative examples as guardrails for Phase 2

Output: FLOW08_UNIFIED_EXECUTION_PLAN.md (this file)

Recovery: "Show FLOW-08 plan" → re-read this file, all state is here

---

### PHASE 1 — Factory Interfaces + Engine Primitives
**Save Point: MERGE:P1**
**Target doc: FLOW08_P1_FACTORIES.md → ENGINE_ARCHITECTURE_MERGED**

What we do:
  - Register Family 27: F244–F255 (12 factory interfaces)
  - Each with: interface name, methods, FABRIC RESOLUTION, capability flags
  - Add EP-4: Saga Compensation Registry
  - Add EP-5: Idempotency Fabric (outbox + dedup store)
  - Add DNA-9: Idempotency-First pattern
  - Add DR-21–DR-24 (4 design records)
  - DNA compliance update: 12 factories × 9 DNA patterns (8 existing + DNA-9) = 108 new cells

Sub-phases (to keep each chunk small):
  1a: F244–F249 (availability, payment gateway, ticketing, calendar, reminder, participant)
  1b: F250–F255 (matching, questionnaire, group, audience, weight-calc, event-feed)
  1c: EP-4 + EP-5 + DNA-9 + DR-21–DR-24 + changelog

Recovery: "Show FLOW-08 factories" → FLOW08_P1_FACTORIES.md
          "Resume P1b" → start from F250

---

### PHASE 2 — Task Type Engine Contracts
**Save Point: MERGE:P2**
**Target doc: FLOW08_P2_TASK_TYPES.md → TASK_TYPES_CATALOG_MERGED**

What we do:
  - T83: Availability Guard + Reservation Hold (SAGA ENTRY archetype)
  - T84: Payment Saga (SAGA STEP with Stripe lifecycle)
  - T85: Ticket Issuance + Atomic Capacity Decrement (ACID CRITICAL SECTION)
  - T86: Calendar Sync + Progressive Reminder Scheduling (PARALLEL FORK)
  - T87: Participant Identification + Connection Scoring Fan-Out (BOUNDED FAN-OUT — NEW)
  - T88: Feed Integration with Diversity Rules (FEED INTEGRATION)
  - T89: Time-Evolution Scheduler (TIME-EVOLUTION SCHEDULER — NEW)
  - AF Station Map: 11 stations × 7 task types = 77 cells
  - Flow Template 18: event-participation-v1 JSON DAG structure

Each task type: full format (ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES,
FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES ×8,
QUALITY GATES ×8)

Sub-phases:
  2a: T83, T84 (saga archetypes)
  2b: T85, T86 (ACID + calendar fork)
  2c: T87, T88, T89 (fan-out + feed + scheduler) + AF Map + Template 18

Recovery: "Show FLOW-08 task types" → FLOW08_P2_TASK_TYPES.md
          "Resume P2b" → start from T85

---

### PHASE 3 — BFA Cross-Flow Validation
**Save Point: MERGE:P3**
**Target doc: FLOW08_P3_BFA.md → V62_BFA_STRESS_TEST_MERGED**

What we do:
  - CF-64: Payment-reservation race (F244+F245 conflict)
  - CF-65: Capacity double-decrement (F244+F246 race)
  - CF-66: Duplicate ticket issuance (F246 idempotency violation)
  - CF-67: Duplicate Stripe webhook processing (F245 idempotency)
  - CF-68: Feed diversity cap violation (F255 vs FLOW-07 F242)
  - CF-69: Timer drift / reminder missed catch-up (F248+EP-2)
  - CF-70: Unauthenticated user participation (FLOW-01 dependency)
  - CF-71: Business profile missing for audience match (FLOW-02 dependency)
  - CF-72: Event must exist before participation (FLOW-03 dependency)
  - CF-73: Feed service shared with FLOW-07 friend feed (conflict scope)
  - CF-74: Saga compensation race (two compensation triggers fire for same execution)
  - CF-75: O(n²) fan-out queue overflow (T87 backpressure violation)
  - ST-31–ST-36: 6 stress tests (each with TRIGGER, EXPECTED, PROOF)
  - BFA registration block for FLOW-08 entities/events/APIs

Sub-phases:
  3a: CF-64–CF-69 + ST-31–ST-33
  3b: CF-70–CF-75 + ST-34–ST-36 + BFA registration

Recovery: "Show FLOW-08 BFA" → FLOW08_P3_BFA.md

---

### PHASE 4 — Source Index + Skill Patterns
**Save Point: MERGE:P4**
**Target doc: FLOW08_P4_INDEX_SKILLS.md → UNIFIED_SOURCE_INDEX + SKILLS_FACTORY_RAG**

What we do:
  - DD-21: Saga compensation strategy — why EP-4 vs inline rollback
  - DD-22: Idempotency fabric placement — engine-level vs service-level
  - DD-23: Bounded fan-out ceiling config — static vs dynamic backpressure
  - DD-24: External gateway fabric tier — why separate from DATABASE/QUEUE fabrics
  - DD-25: Timer chain vs single timer — why T89 uses a chain of EP-2 timers
  - DD-26: Feed diversity enforcement location — feed service vs engine rule
  - SK-29: Saga orchestration with compensation chain (multi-step unwind)
  - SK-30: Transactional outbox pattern (.NET implementation)
  - SK-31: Row-lock ACID critical section (PG + factory interface)
  - SK-32: Redis sorted-set durable timer + catch-up semantics
  - SK-33: Bounded fan-out with backpressure (N×N pair batching)
  - SK-34: Time-evolution weight multiplier + exponential decay formula
  - Concept map + event chain diagram for FLOW-08
  - Source index update (UNIFIED_SOURCE_INDEX section for FLOW-08)

Recovery: "Show FLOW-08 index" → FLOW08_P4_INDEX_SKILLS.md

---

### PHASE 5 — Validation
**Save Point: MERGE:P5**
**Output: FLOW08_VALIDATION.md**

Validation checklist (target: 90/90 PASS):

  Section A: Sequence integrity (no gaps in F244-F255, T83-T89, CF-64-CF-75...)
  Section B: Full engine contract format for all 7 task types
  Section C: Fabric resolution declared for all 12 factories
  Section D: AF station cells complete (77 cells: 11×7)
  Section E: Iron rules count (8 per task type = 56 rules)
  Section F: Quality gates count (8 per task type = 56 gates)
  Section G: EP-4 and EP-5 registered in engine primitives
  Section H: DNA-9 compliance declared for all new factories
  Section I: BFA conflict rules have proof + stress test
  Section J: Backward compat — zero changes to F1-F243, T1-T82

Recovery: "Show FLOW-08 validation" → FLOW08_VALIDATION.md

---

### PHASE 6 — Session State + System Totals
**Save Point: MERGE:FINAL**
**Output: SESSION_STATE_FLOW08_FINAL.md**

Final system totals after FLOW-08:

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | 243 | 255 | +12 |
| Factory families | 26 | 27 | +1 |
| Task types | 82 | 89 | +7 |
| Flow templates | 17 | 18 | +1 |
| BFA conflict rules | 63 | 75 | +12 |
| Stress tests | 30 | 36 | +6 |
| Design records | 20 | 24 | +4 |
| Design decisions | 20 | 26 | +6 |
| Skill patterns | 28 | 34 | +6 |
| DNA patterns | 8 | 9 | +1 |
| Engine primitives | 3 | 5 | +2 |
| Iron rules (FLOW-08) | — | 56 | +56 |
| Quality gates (FLOW-08) | — | 56 | +56 |
| AF station cells (FLOW-08) | — | 77 | +77 |
| DNA compliance | 604/604 | 712/712 | +108 |

Recovery: "Show FLOW-08 session state" → SESSION_STATE_FLOW08_FINAL.md
          "Start FLOW-09" → prerequisites: F1-F255, T1-T89, CF-1-CF-75

---

## ═══ PART 5 — MINI RAG (REFERENCE INDEX FOR PHASES 1–4) ═══

This RAG is consumed by AF-4 during code generation and by the plan executor during phases.

### RAG-1: Factory Interface Template (for F244–F255)

```
FACTORY: F{N} — {InterfaceName}
FAMILY: 27
PURPOSE: {one line}
METHODS:
  - {MethodName}Async({params}) → Task<DataProcessResult<{TResult}>>
FABRIC RESOLUTION: {FABRIC NAME} (Skill {N}) → {provider}
CAPABILITY FLAGS: [{row-lock | idempotent | webhook | encrypted | batch}]
COMPENSATION: {CompensationAction via EP-4}
DNA COMPLIANCE:
  DNA-1 ✅ ParseDocument (all inputs as Dictionary)
  DNA-2 ✅ BuildQueryFilters (empty fields skipped)
  DNA-3 ✅ DataProcessResult<T>
  DNA-4 ✅ MicroserviceBase
  DNA-5 ✅ Scope isolation (tenantId)
  DNA-6 ✅ DynamicController
  DNA-7 ✅ {if applicable}
  DNA-8 ✅ {if applicable}
  DNA-9 ✅ Idempotency-First (outbox + dedup key)
```

### RAG-2: New Fabric Tier — EXTERNAL GATEWAY FABRIC

```
EXTERNAL GATEWAY FABRIC (new — FLOW-08 introduces this tier)
  Purpose: wraps third-party systems that require:
    - Webhook signature verification
    - Retry + circuit breaker
    - Secret management integration (KMS/Vault, never hardcoded)
    - Structured audit event emission
  Factories using this fabric: F245 (Payment), F247 (Calendar)
  Interface: IExternalGatewayService
    VerifyWebhookSignatureAsync(payload, signature, secret) → bool
    ExecuteWithRetryAsync(action, retryPolicy) → DataProcessResult<T>
    AuditEmitAsync(auditEvent) → void
  DNA-9 mandatory on ALL external gateway calls
```

### RAG-3: EP-4 Saga Compensation Registry

```
ENGINE PRIMITIVE EP-4: Saga Compensation Registry
  Purpose: before any destructive step, register the undo action
  API:
    RegisterCompensation(executionId, step, compensationFactory, compensationPayload)
    ExecuteCompensations(executionId) → compensates all registered steps in LIFO order
    GetCompensationStatus(executionId) → list of steps + status
  Iron Rule: compensation MUST be registered BEFORE the action it compensates
  Integration: all SAGA STEP and ACID CRITICAL SECTION task archetypes
  Persistent store: DATABASE FABRIC(PG) — compensation table per execution
```

### RAG-4: EP-5 Idempotency Fabric

```
ENGINE PRIMITIVE EP-5: Idempotency Fabric
  Purpose: prevent duplicate processing of events and API calls
  Components:
    1. Idempotency Key Generator: hash(flowId + stepId + correlationId)
    2. Dedup Store: DATABASE FABRIC(Redis) with TTL (default: 24h)
    3. Transactional Outbox: DATABASE FABRIC(PG) — events written to outbox table first
       Outbox poller publishes to QUEUE FABRIC only after DB commit
    4. Idempotency Middleware: wraps every factory CreateAsync() call
  DNA-9 enforces: every event emission via outbox, every factory call carries dedup key
```

### RAG-5: DNA-9 — Idempotency-First

```
DNA PATTERN 9: Idempotency-First
  Rule: Every event emission MUST use EP-5 transactional outbox (never direct publish)
  Rule: Every factory method call MUST include an idempotency/dedup key
  Rule: Every event consumer MUST check EP-5 dedup store before processing
  Enforcement: AF-7 (Compliance) rejects generated code missing dedup key
  Enforcement: AF-9 (Judge) QG checks idempotent re-processing behavior
  Iron Rule companion: always paired with IR-8x rules in ACID and SAGA task types
```

### RAG-6: T89 TIME-EVOLUTION SCHEDULER Archetype

```
NEW ARCHETYPE: TIME-EVOLUTION SCHEDULER
  First instance: T89
  Definition: a SCHEDULED task that chains multiple timer milestones, each with
    a different action, and concludes with a mathematical decay curve to base state.
  Structure:
    milestone[] = [{at: T-7d, action: multiplyWeights(1.5)},
                   {at: T-1d, action: multiplyWeights(2.0)},
                   {at: T+0,  action: multiplyWeights(3.0), mode: pin},
                   {at: T+1,  action: startDecay(base, k=0.1, days=7)},
                   {at: T+7,  action: applyPermanentBonus(+0.05)}]
  Timer chain: uses EP-2 (Durable Timer) per milestone, each registered at
    flow initialization, with catch-up semantics if timer fires late
  Catch-up: if timer fires >15min late, apply missed transitions immediately
  FREEDOM config: multiplier values, decay k constant, bonus amount, catch-up window
```

### RAG-7: T87 BOUNDED FAN-OUT Archetype

```
NEW ARCHETYPE: BOUNDED FAN-OUT
  First instance: T87
  Definition: a dynamic N×M or N×N fan-out where N is not known at design time.
    The engine emits sub-tasks in bounded batches rather than all at once.
  Structure:
    input_event: ParticipantsIdentified (contains N participant IDs)
    pair_generator: emit all unique pairs (N*(N-1)/2 total)
    batch_size: FREEDOM config (default 500, max 2000)
    backpressure_gate: check queue depth before emitting next batch
      if queue_depth > threshold: wait + retry
    partial_result_policy: if >20% pairs fail, still proceed (FREEDOM configurable)
    idempotency: pairId = sort(userId1, userId2) → hash
  MACHINE: batching logic, queue depth check, idempotency key formula
  FREEDOM: batch_size, backpressure_threshold, partial_result_policy percentage
```

### RAG-8: FLOW-08 Event Chain

```
Event flow (in order):
  POST /events/{id}/participate
    → SpotReserved (F244, 5-min hold)
    → PaymentIntentCreated (F245)
    → PaymentCompleted (F245 webhook, EP-5 deduped)
    → TicketIssued (F246)
    → CapacityUpdated (F244, row-lock, via outbox)
    → EventAddedToCalendar (F247)
    → RemindersScheduled (F248)
    → ParticipantsIdentified (F249)
    → ScoringBatchEmitted×N (T87 fan-out, F250-F253)
    → ParticipantConnectionsCalculated (F250 aggregate)
    → ParticipantPostsIntegrated (F255)
    → FeedWeightsAdjusted (F254, timer-triggered T89)
    → [T-7d] WeightMultiplied(1.5)
    → [T-1d] WeightMultiplied(2.0)
    → [T+0]  FeedPrioritized(3.0×, pinned)
    → [T+7]  DecayCompleted, PermanentBonusApplied(+0.05)
    → EventParticipationAnalyzed

Compensation chain (if payment fails):
  PaymentFailed → EP-4 executes LIFO:
    → CancelPaymentIntent (F245)
    → ReleaseReservation (F244)
    → NotifyUser (F249 / notification via queue)
```

### RAG-9: Cross-Flow Dependencies

```
FLOW-08 depends on:
  FLOW-01: User must be authenticated (tenantId + userId required by all factories)
  FLOW-02: Business profile required for F253 IAudienceMatchService (audience overlap)
  FLOW-03: Event must exist with valid capacity (F244 checks event record)

FLOW-08 shares services with:
  FLOW-07: F242 IBidirectionalFeedService ← SHARED with F255 IEventFeedService
    Conflict: two flows both write to user feed; BFA CF-73 enforces feed ownership rule

FLOW-08 introduces (available to future flows):
  F244 IAvailabilityService (reservation holds — reusable for any bookable entity)
  F245 IPaymentGatewayService (Stripe — reusable for any payment flow)
  EP-4 Saga Compensation Registry (reusable by all future multi-step flows)
  EP-5 Idempotency Fabric (reusable by all future flows with external callbacks)
```

---

## ═══ PART 6 — SAVE STATE ═══

```
PLAN:P0 = COMPLETE ✅
Save Point: FLOW08_UNIFIED_EXECUTION_PLAN.md (this file)
All phases defined. RAG index built. Positive/negative examples written.
System state confirmed: F1-F243, T1-T82, CF-1-CF-63, EP-1-EP-3, DNA-1-DNA-8

RECOVERY COMMANDS:
  "Show FLOW-08 plan"       → This file (FLOW08_UNIFIED_EXECUTION_PLAN.md)
  "Start Phase 1"           → Build F244-F255 + EP-4 + EP-5 + DNA-9 + DR-21-DR-24
  "Start Phase 1b"          → Resume from F250 (if P1a done)
  "Start Phase 2"           → Build T83-T89 engine contracts
  "Start Phase 2b"          → Resume from T85
  "Start Phase 3"           → Build CF-64-CF-75 + ST-31-ST-36
  "Start Phase 4"           → Build DD-21-DD-26 + SK-29-SK-34
  "Start Phase 5"           → Validation (90 checks)
  "Start Phase 6"           → Session state + totals

NEXT ACTION: "Start Phase 1" to begin factory interfaces
```

---

## ═══ PART 7 — MULTI-TENANT CONSIDERATIONS ═══

Per the multi-tenant research document, FLOW-08 requires explicit treatment at every boundary.
This is not new architecture — it is DNA-5 (Scope Isolation) applied to ALL new factories.
However, three FLOW-08-specific concerns require explicit design decisions (DD-21–DD-26):

**Payment tenant isolation**: Stripe accounts may be per-platform or per-tenant.
  → F245 IPaymentGatewayService must accept tenantId to route to correct Stripe keys
  → MACHINE: Stripe account routing per tenantId
  → FREEDOM: shared Stripe account vs per-tenant keys (config-driven)

**Reservation hold isolation**: Redis reservation keys must be namespaced by tenantId.
  → F244 key pattern: `reservation:{tenantId}:{eventId}:{userId}`
  → Iron Rule: IR-83 violation if tenantId absent from reservation key

**Fan-out quota per tenant**: Large events for tenant A must not starve tenant B's queues.
  → T87 BOUNDED FAN-OUT ceiling is per-tenantId, not global
  → CF-75: BFA conflict rule for quota enforcement
```
