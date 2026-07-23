# FLOW-03: EVENT CREATION & PROMOTION — REFERENCE PLAN v3
## Naming conventions integrated (SK-430 + FLOW-00.1 prerequisite)
## All other content unchanged from v2 (28/28 SK-418 ✅)
## Updated: 2026-03-22 (v3)
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
##               + FLOW-00.1 complete (npm run lint:naming exits 0) ← NEW v3
## Wave: 2 (parallel — delta gate model, parallel_wave: 2)

---

## WHAT CHANGED FROM v2

| What v2 had | What v3 adds |
|-------------|-------------|
| Prerequisite: FLOW-02 ACTIVE | Prerequisite: + FLOW-00.1 complete (lint:naming exits 0) |
| STATE.json: flow_id, parallel_wave | STATE.json: flow_name added |
| SESSION-0: FC-1 through FC-15 | SESSION-0: FC-16, FC-17, FC-18 added |
| Phase D gate: no naming check | Phase D gate: npm run lint:naming exits 0 |
| Phase E gate: no naming regression | Phase E gate: npm run lint:naming exits 0 |
| No service file naming rule | Service files: {verb}-{domain-noun}.service.ts |
| Jira: default format | Jira: SK-430 Rule 5 — 5 sections |
| CLIENT-ARCHITECTURE-ADDENDUM added in v2 | No change — remains from v2 |

All content from v2 (V24–V28 client architecture, T61 realtime-push,
T62 new-content-available-banner, draft state, offline queue, delta gate)
is unchanged.

---

## STATE.json (v3 — flow_name added)

```json
{
  "flow_id": "FLOW-03",
  "flow_name": "Event Creation & Promotion",
  "parallel_wave": 2,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 0
}
```

**Delta gate reminder (unchanged from v2):**
Gate model: `jest --testPathPattern=test/flow-03` (delta, not absolute)
Artifact ranges: from pre-allocation table in INFRASTRUCTURE-FLOWS-STATE-v4.json

---

## SESSION-0 ADDITIONS (FC-16, FC-17, FC-18)

### FC-16: Service file naming compliance

Expected service file names for FLOW-03:

| Task Type | ID | Service File Name | Notes |
|-----------|----|------------------|-------|
| EventCreationOrchestrator | T59 | `event-creation-orchestrator.service.ts` | reuses ORCHESTRATION archetype |
| EventRegistrationManager | T60 | `event-registration-manager.service.ts` | ⚠️ "Manager" exception: domain-specific, acceptable |
| EventPromotionEngine | T61 | `event-promotion-engine.service.ts` | realtime-push background step |
| EventAnalyticsTracker | T62 | `event-analytics-tracker.service.ts` | TTL-windowed batching |

**Note on T60 "EventRegistrationManager":** The naming skill flags `Manager` as
a potential anti-pattern. However, "EventRegistrationManager" is domain-specific
(it manages registration state for a specific event — not a generic manager).
This is the context-aware exception documented in naming-conventions-SKILL.md.
The class name `EventRegistrationManager` is acceptable here.

**Flow directory:** `engine/flows/event-creation-promotion/`
(derived from flowName "Event Creation & Promotion" → lowercase-hyphenated,
ampersand dropped)

```bash
# Verify after Phase D:
find server/src/engine/flows/event-creation-promotion -name "*.service.ts" | sort
# Expected:
#   event-creation-orchestrator.service.ts
#   event-registration-manager.service.ts
#   event-promotion-engine.service.ts
#   event-analytics-tracker.service.ts

# Anti-pattern check:
find server/src/engine/flows/event-creation-promotion -name "t5*.ts" -o -name "t6*.ts" 2>/dev/null
# Expected: no output
```

### FC-17: STATE.json includes flow_name

```python
import json
with open('STATE.json') as f:
    s = json.load(f)
assert s.get('flow_name') == 'Event Creation & Promotion', \
    f"FC-17 FAIL — got: {s.get('flow_name', 'MISSING')}"
print(f"✅ FC-17 PASS")
```

### FC-18: Jira comment template verified (5 sections)

---

## SERVICE FILE NAMING (v3 addition)

| Task Type | ID | Service File | Class Name |
|-----------|----|-------------|------------|
| EventCreationOrchestrator | T59 | `event-creation-orchestrator.service.ts` | `EventCreationOrchestrator` |
| EventRegistrationManager | T60 | `event-registration-manager.service.ts` | `EventRegistrationManager` |
| EventPromotionEngine | T61 | `event-promotion-engine.service.ts` | `EventPromotionEngine` |
| EventAnalyticsTracker | T62 | `event-analytics-tracker.service.ts` | `EventAnalyticsTracker` |

**EngineContract factory additions (Phase A):**
```typescript
taskTypeId: 'T59',  // also T60, T61, T62
flowId: 'FLOW-03',
flowName: 'Event Creation & Promotion',
```

---

## PHASE D GATE ADDITIONS (v3)

```bash
# After service files generated:
npm run lint:naming
# Expected: exit 0

find server/src/engine/flows/event-creation-promotion -name "*.service.ts" | sort
# Expected: 4 files (orchestrator, manager, engine, tracker)
```

---

## PHASE E GATE ADDITIONS (v3)

```bash
# Delta gate (unchanged from v2): jest --testPathPattern=test/flow-03
# Naming regression:
npm run lint:naming
# Expected: exit 0
```

---

## JIRA COMMENT EXAMPLE (v3 — SK-430 Rule 5 format)

```
## What was built — Phase D [Flow: FLOW-03 — Event Creation & Promotion]

### Business purpose
FLOW-03 enables tenant users to create, publish, and promote events within
the platform. EventCreationOrchestrator (T59) validates the event spec and
transitions the event through DRAFT → VALIDATED → PUBLISHED states.
EventRegistrationManager (T60) handles attendee capacity tracking with
optimistic locking. EventPromotionEngine (T61) evaluates promotion thresholds
and emits real-time status signals to the organizer dashboard. EventAnalyticsTracker
(T62) aggregates view and registration counters in TTL-windowed batches for
the analytics feed.

### Flow context
- **Flow:** FLOW-03 — Event Creation & Promotion
- **Task types:** T59 EventCreationOrchestrator, T60 EventRegistrationManager,
  T61 EventPromotionEngine, T62 EventAnalyticsTracker
- **Will be used by:** FLOW-04 (Event Attendance & Management) — reads
  EventPublished to enable RSVP. Analytics dashboard reads T62 counter
  events for organizer reporting.

### Technical delivery
- 4 service files created
- 8 factory interfaces registered (F197–F204)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F197 IEventRepository (DATABASE FABRIC),
  F198 ICapacityLockStore (DATABASE FABRIC — optimistic lock),
  F199 IPromotionSignalQueue (QUEUE FABRIC),
  F200 IAnalyticsCounterStore (DATABASE FABRIC — TTL-windowed)

### Architecture fit
T59 draft state: requiresDraftState: true — event spec stored in
figma.clientStorage across sessions (CLIENT-ARCHITECTURE-SPEC.md §4).
T60 uses optimistic capacity lock (DNA-2 BuildSearchFilter for slot query).
T61 background step: realtime-push signal (silentMutationPermitted).
T62 TTL-windowed batching: emit batched, not per-increment (CF rule).
Delta gate: jest --testPathPattern=test/flow-03 (parallel_wave: 2).
```

---

## ALL OTHER CONTENT — UNCHANGED FROM v2

The following sections are identical to FLOW-03-REFERENCE-PLAN-v2.md:
- Wave 2 assignment, delta gate model, parallel_wave: 2
- Artifact numbers (T59/T60/T61/T62, F197–F204, family from pre-allocation table)
- All 7 passes
- V1–V28 SK-418 checklist results (28/28)
- Client architecture (requiresDraftState: true for T59, backgroundSteps for T61+T62)
- Offline queue spec, draft state rules
- Phase A through Phase E content (except gate additions above)

Reference v2 for all content not listed in this v3 amendment section.
