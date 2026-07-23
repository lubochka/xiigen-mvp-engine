# FLOW-04: EVENT ATTENDANCE & MANAGEMENT — REFERENCE PLAN v2
## Naming conventions integrated (SK-430 + FLOW-00.1 prerequisite)
## All other content unchanged from v1 (28/28 SK-418 ✅)
## Updated: 2026-03-22 (v2)
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
##               + FLOW-00.1 complete (npm run lint:naming exits 0) ← NEW v2
## Wave: 2 (parallel — delta gate model, parallel_wave: 2)

---

## WHAT CHANGED FROM v1

| What v1 had | What v2 adds |
|-------------|-------------|
| Prerequisite: FLOW-02 ACTIVE | Prerequisite: + FLOW-00.1 complete (lint:naming exits 0) |
| STATE.json: flow_id, parallel_wave | STATE.json: flow_name added |
| SESSION-0: FC-1 through FC-15 | SESSION-0: FC-16, FC-17, FC-18 added |
| Phase D gate: no naming check | Phase D gate: npm run lint:naming exits 0 |
| Phase E gate: no naming regression | Phase E gate: npm run lint:naming exits 0 |
| No service file naming rule | Service files: {verb}-{domain-noun}.service.ts |
| Jira: default format | Jira: SK-430 Rule 5 — 5 sections |

All content from v1 (T63/T64/T65/T66, F205–F210, client architecture, test matrix
with 2 virtualClock scenarios T007+T009, LIFO compensation, waitlist promotion)
is unchanged.

---

## STATE.json (v2 — flow_name added)

```json
{
  "flow_id": "FLOW-04",
  "flow_name": "Event Attendance & Management",
  "parallel_wave": 2,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 0
}
```

---

## SESSION-0 ADDITIONS (FC-16, FC-17, FC-18)

### FC-16: Service file naming compliance

Expected service file names for FLOW-04:

| Task Type | ID | Service File Name | Notes |
|-----------|----|------------------|-------|
| RSVPOrchestrator | T63 | `rsvp-orchestrator.service.ts` | atomic capacity decrement |
| WaitlistCoordinator | T64 | `waitlist-coordinator.service.ts` | capacity-freed trigger |
| CheckInValidator | T65 | `check-in-validator.service.ts` | QR token + 60s TTL |
| PostEventFeedbackAggregator | T66 | `post-event-feedback-aggregator.service.ts` | 7-day window |

**Note on naming decisions:**
- `RSVPOrchestrator` → `rsvp-orchestrator.service.ts`: RSVP is a well-known domain
  abbreviation (see naming-conventions-SKILL.md: "except well-known: id, url, api, http").
  RSVP is widely understood in event-management domain — acceptable.
- `WaitlistCoordinator` → `waitlist-coordinator.service.ts`: "Coordinator" is
  domain-specific here (coordinates waitlist promotion logic). Acceptable.
- `PostEventFeedbackAggregator` → `post-event-feedback-aggregator.service.ts`:
  Long but clear. Do not abbreviate to `feedback-aggregator.service.ts` —
  "post-event" provides critical timing context (runs after event ends).

**Flow directory:** `engine/flows/event-attendance-management/`

```bash
# Verify after Phase D:
find server/src/engine/flows/event-attendance-management -name "*.service.ts" | sort
# Expected:
#   rsvp-orchestrator.service.ts
#   waitlist-coordinator.service.ts
#   check-in-validator.service.ts
#   post-event-feedback-aggregator.service.ts

# Anti-pattern check:
find server/src/engine/flows/event-attendance-management -name "t6*.ts" 2>/dev/null
# Expected: no output
```

### FC-17: STATE.json includes flow_name

```python
import json
with open('STATE.json') as f:
    s = json.load(f)
assert s.get('flow_name') == 'Event Attendance & Management', \
    f"FC-17 FAIL — got: {s.get('flow_name', 'MISSING')}"
print(f"✅ FC-17 PASS")
```

### FC-18: Jira comment template verified (5 sections)

---

## SERVICE FILE NAMING (v2 addition)

| Task Type | ID | Service File | Class Name |
|-----------|----|-------------|------------|
| RSVPOrchestrator | T63 | `rsvp-orchestrator.service.ts` | `RSVPOrchestrator` |
| WaitlistCoordinator | T64 | `waitlist-coordinator.service.ts` | `WaitlistCoordinator` |
| CheckInValidator | T65 | `check-in-validator.service.ts` | `CheckInValidator` |
| PostEventFeedbackAggregator | T66 | `post-event-feedback-aggregator.service.ts` | `PostEventFeedbackAggregator` |

**EngineContract factory additions (Phase A):**
```typescript
taskTypeId: 'T63',  // also T64, T65, T66
flowId: 'FLOW-04',
flowName: 'Event Attendance & Management',
```

---

## PHASE D GATE ADDITIONS (v2)

```bash
# After service files generated:
npm run lint:naming
# Expected: exit 0

find server/src/engine/flows/event-attendance-management -name "*.service.ts" | sort
# Expected: 4 files (rsvp-orchestrator, waitlist-coordinator,
#           check-in-validator, post-event-feedback-aggregator)
```

---

## PHASE E GATE ADDITIONS (v2)

```bash
# Delta gate (unchanged from v1): jest --testPathPattern=test/flow-04
# virtualClock scenarios: T007 (QR 60s TTL), T009 (7-day feedback window)
# Naming regression:
npm run lint:naming
# Expected: exit 0
```

---

## JIRA COMMENT EXAMPLE (v2 — SK-430 Rule 5 format)

```
## What was built — Phase D [Flow: FLOW-04 — Event Attendance & Management]

### Business purpose
FLOW-04 handles the complete attendance lifecycle after an event is published.
RSVPOrchestrator (T63) performs an atomic capacity decrement before confirming
a seat — preventing double-booking at high concurrency. WaitlistCoordinator
(T64) manages the queue of waitlisted attendees and promotes the first in line
when a cancellation frees a seat. CheckInValidator (T65) validates QR codes
on event day with a 60-second expiry TTL. PostEventFeedbackAggregator (T66)
opens a 7-day feedback collection window after the event ends.

### Flow context
- **Flow:** FLOW-04 — Event Attendance & Management
- **Task types:** T63 RSVPOrchestrator, T64 WaitlistCoordinator,
  T65 CheckInValidator, T66 PostEventFeedbackAggregator
- **Will be used by:** FLOW-03 (Event Creation & Promotion) produces the
  EventPublished event that triggers T63. Analytics service reads T66
  aggregated feedback for organizer reports. FLOW-09+ (post-event flows,
  Wave 3) read attendance data for follow-up automation.

### Technical delivery
- 4 service files created
- 6 factory interfaces registered (F205–F210)
- [N] tests added (unit: [N], e2e: [N], virtualClock: 2)
- Key factories: F205 IAttendanceService (DATABASE FABRIC — INJECTABLE),
  F206 ICapacityDecrementer (DATABASE FABRIC — atomic),
  F207 IWaitlistQueue (QUEUE FABRIC),
  F208 IQRTokenStore (DATABASE FABRIC — TTL),
  F209 ICapacityIncrementer (DATABASE FABRIC — for cancellation LIFO),
  F210 IFeedbackCollectionStore (DATABASE FABRIC — 7-day window)

### Architecture fit
T63 uses LIFO compensation: on cancellation, F209.increment → RSVPCancelled
→ T64 WaitlistPromoted (v1 test T004 verifies this chain). T65 uses
virtualClock injection for QR TTL test (T007). T66 uses virtualClock for
7-day window test (T009). All 4 services extend MicroserviceBase (DNA-4).
Delta gate: jest --testPathPattern=test/flow-04 (parallel_wave: 2).
```

---

## NAMING DECISION LOG (v2 addition)

Naming decisions made for this flow that future sessions should not re-debate:

| Decision | Rationale |
|----------|-----------|
| `rsvp-orchestrator` not `reservation-orchestrator` | RSVP is the domain term used by the v1 plan and all event contracts. Changing it would misalign with existing event schema field names. |
| `post-event-feedback-aggregator` not `feedback-aggregator` | "post-event" is load-bearing context — the aggregator only opens after EventEnded. Dropping it makes the name ambiguous vs real-time feedback. |
| `WaitlistCoordinator` not `WaitlistManager` | Manager is prohibited by naming-conventions-SKILL.md. Coordinator is domain-specific and acceptable. |

---

## ALL OTHER CONTENT — UNCHANGED FROM v1

The following sections are identical to FLOW-04-REFERENCE-PLAN-v1.md:
- Wave 2 assignment, delta gate model, parallel_wave: 2
- Artifact numbers (T63/T64/T65/T66, F205–F210, family from pre-allocation table)
- Note: T66 reuses AGGREGATION archetype from FLOW-29/FLOW-03
- All 7 passes
- V1–V28 SK-418 checklist results (28/28)
- Client architecture (node state map: rsvp-pending, waitlist-holding,
  check-in-active, feedback-window-open)
- Offline queue: RSVPRequested queueable, CheckInRequested NOT queueable
  (requires live validation)
- 12 test matrix scenarios, virtualClock: T007 + T009
- LIFO compensation chain: F209.increment → RSVPCancelled → T64 → WaitlistPromoted

Reference v1 for all content not listed in this v2 amendment section.
