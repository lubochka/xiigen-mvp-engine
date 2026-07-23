---
name: temporal-behavior-design
sk_number: SK-503
version: "1.0.0"
priority: MEDIUM
load_order: 1
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  How to design task types whose behavior changes over time — multi-stage
  scheduled state machines. Distinct from SCHEDULED archetype (one-shot
  delayed execution). Covers: event participation weight decay, content
  freshness scoring, learning plan adaptation, and any service whose
  outputs change based on elapsed time relative to a reference point.
triggers:
  - "behavior changes over time"
  - "weight decay"
  - "time-based scoring"
  - "freshness"
  - "scheduled state changes"
  - "TTL-based behavior"
  - "different behavior per day"
  - "event day approaching"
---

# Temporal Behavior Design Skill (SK-503)

## THE PATTERN

Some services compute different outputs at different times relative to an anchor
event. The Event Participation UML is the canonical example:

```
1 week before event:  base weights (balanced social + interest matching)
1 day before event:   urgency weights (amplify capacity + proximity signals)
day of event:         real-time weights (amplify activity, suppress distant members)
after event:          decay weights (reduce score over time since event)
```

This is NOT the SCHEDULED archetype (which runs once at a set time).
This is a single service whose scoring formula is parameterized by time-delta.

---

## STEP 1 — IDENTIFY THE ANCHOR EVENT AND PHASES

```
Anchor event: the reference point time is measured from
  Event Participation: EventCreated.eventDate
  Content Feed: PostCreated.createdAt
  Learning Plan: LessonCompleted.completedAt

Phases: distinct time ranges where behavior is qualitatively different
  Phase A: [creation] → [T minus 7 days]:  baseline behavior
  Phase B: [T minus 7] → [T minus 1]:      approach behavior
  Phase C: [T minus 1] → [event start]:    imminent behavior
  Phase D: [event start] → [event end]:    active behavior
  Phase E: [event end] → [T plus 7 days]:  post-event decay
  Phase F: [T plus 7] → ∞:                 archive behavior
```

---

## STEP 2 — CLASSIFY THE PHASE BEHAVIOR

For each phase, define: what changes, what stays constant, and what FREEDOM config
keys govern the transitions.

```
Phase A (baseline):
  MACHINE constants: score formula structure (which factors combine)
  FREEDOM config:    scoring.event.baseMatchWeight = 0.25
                     scoring.event.baseSocialWeight = 0.20
  Trigger: no scheduler needed — default behavior when time delta > 7 days

Phase B (approach):
  MACHINE constants: score formula structure
  FREEDOM config:    scoring.event.approachCapacityBoost = 1.5 (multiplier)
                     scoring.event.approachThresholdDays = 7
  Trigger: ISchedulerService.scheduleDelayed at T minus 7 days
           emits: EventApproachPhaseActivated

Phase C (imminent):
  MACHINE constants: urgency formula kicks in (different formula, not just different weights)
  FREEDOM config:    scoring.event.imminentProximityWeight = 0.40
  Trigger: ISchedulerService.scheduleDelayed at T minus 1 day
           emits: EventImminentPhaseActivated
```

**Key design rule:** Phase transitions are FREEDOM-config-timed (the threshold days
are configurable) but the formula structure per phase is a MACHINE constant (the
formula cannot change without a deployment).

---

## STEP 3 — DESIGN THE STATE MACHINE

Express the phase transitions as a topology:

```
Nodes:
  EventScorer (handles ALL phases — single task type)
  PhaseTransitionScheduler (sets up the phase-change timers)
  PhaseEventEmitter (emits phase-transition events)

The EventScorer node reads:
  1. Current time
  2. eventDate from the event record
  3. Time delta = eventDate - now
  4. Phase = determinePhase(timeDelta, freedomConfig)
  5. Weights = getWeightsForPhase(phase, freedomConfig)

Do NOT create a separate task type per phase — that is over-decomposition.
Create one task type that is parameterized by phase.
```

---

## STEP 4 — IRON RULES FOR TEMPORAL SERVICES

Every temporal service needs these additional iron rules beyond standard archetypes:

```
IR-TEMPORAL-1: phase_determined_by_time_delta_not_hardcoded
  "Phase boundaries must be read from FREEDOM config. A service that hardcodes
  '7 days' as the approach threshold violates this rule."
  Named check: temporal_threshold_from_config

IR-TEMPORAL-2: anchor_event_from_payload_not_system_clock_alone
  "The time-delta computation must use the anchor event's timestamp from payload,
  not just the current time. Using only current time makes the service non-reproducible."
  Named check: anchor_event_timestamp_present

IR-TEMPORAL-3: phase_transition_via_scheduler_not_polling
  "Phase transitions must be scheduled via ISchedulerService. Polling the current
  time on each request is a performance violation."
  Named check: phase_transition_uses_scheduler
```

### The `Date.now()`-only ban (IR-TEMPORAL-2, made concrete)

The time-delta MUST be computed from the anchor event's timestamp carried in the
event payload. Reading only the wall clock makes the score non-reproducible —
the same input replayed an hour later yields a different score, and unit tests
cannot pin a value.

```typescript
// ❌ BANNED — non-reproducible, no anchor from payload
const ageHours = (Date.now() - someInternalClock) / 3_600_000;

// ✅ REQUIRED — anchor timestamp from the event payload; "now" is an injected param
function phaseScore(event: EventCreated, nowMs: number, cfg: ConfigService): number {
  const anchorMs = Date.parse(event.data.eventDate);   // anchor FROM payload
  const deltaMs  = anchorMs - nowMs;                    // nowMs is passed in, not read inside
  const phase    = determinePhase(deltaMs, cfg);        // thresholds from FREEDOM config
  return weightsForPhase(phase, cfg).apply(event);
}
```

Injecting `nowMs` (instead of calling `Date.now()` inside the function) is what
makes the iron rule testable.

### Idempotency / reproducibility test (Jest)

```typescript
it('is reproducible: same anchor + same now ⇒ identical score (IR-TEMPORAL-2)', () => {
  const event = makeEventCreated({ eventDate: '2026-07-01T00:00:00Z' });
  const now   = Date.parse('2026-06-24T00:00:00Z');   // fixed "now" injected
  const a = phaseScore(event, now, cfg);
  const b = phaseScore(event, now, cfg);              // recompute, no clock read inside
  expect(b).toBe(a);                                  // deterministic — not Date.now()-driven
});

it('phase boundary is FREEDOM config, not hardcoded 7 days (IR-TEMPORAL-1)', () => {
  cfg.set('scoring.event.approachThresholdDays', 3);  // != default 7
  const event = makeEventCreated({ eventDate: '2026-07-01T00:00:00Z' });
  const now   = Date.parse('2026-06-26T00:00:00Z');   // 5 days out
  // with threshold 7 → still baseline; with threshold 3 → already approach phase
  expect(determinePhaseName(event, now, cfg)).toBe('approach');
});
```

---

## ARCHETYPE CLASSIFICATION

Temporal behavior services map to: **TEMPORAL** sub-type of DATA_PIPELINE.

```
curriculumTier: 3 (same as TRANSACTION — multi-step with side effects)
generatorHint:  "This service's output changes based on time-delta from an anchor event.
                 Phase boundaries are FREEDOM config. Formula structure per phase is MACHINE.
                 Use ISchedulerService for phase transitions, not polling."
```
