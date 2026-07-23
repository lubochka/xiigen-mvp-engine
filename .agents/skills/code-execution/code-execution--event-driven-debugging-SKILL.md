---
name: event-driven-debugging
sk_number: SK-498
version: "1.0.0"
priority: HIGH
load_order: 0
category: code-execution
layer: product
author: luba
updated: "2026-03-26"
contexts: ["claude-code"]
description: >
  When a user action triggers a chain of 10+ domain events but the expected
  final state is not reached, trace the event chain to find the break.
  Different from debug-session-protocol (SK-486) which handles a single failing
  test. This skill handles "the service looks fine but the platform doesn't
  respond correctly to the user action." Load at the start of any session
  where the bug manifests as a missing business outcome, not a test failure.
triggers:
  - "event chain broken"
  - "event not consumed"
  - "downstream service not triggered"
  - "event not emitted"
  - "trace this event"
  - "why didn't this flow trigger"
  - "event-driven debugging"
  - "publish consume trace"
  - "missing event"
  - "downstream not receiving"
---

# Event-Driven Debugging Skill (SK-498)

## WHAT THIS SKILL PREVENTS

Debugging an individual service when the bug is in an event that never arrives.
Checking the wrong service when the real break is three hops downstream. Spending
hours on logs when the event stream shows the break in seconds.

---

## THE CORE PRINCIPLE

In an event-driven system, every user action produces a predictable chain of events.
If the final business outcome is missing, exactly one of these is true:
1. An event was never emitted (producer bug)
2. An event was emitted but never consumed (consumer registration bug)
3. An event was consumed but produced a wrong downstream event (transformation bug)
4. An event was consumed and the final state was written, but the read path returns wrong data (read bug)

The debug session finds WHICH of these four is the case. Then SK-486 (debug-session-protocol)
handles fixing the identified single failure.

---

## STEP 1 — DEFINE THE EXPECTED CHAIN

Before looking at any log, write out the expected event chain from user action to
final state. Use the UML sequence diagram if available.

```
User action: POST /events → "Create Event"

Expected chain:
  1. T63 EventCreationOrchestrator → emits EventCreated
  2. T64 EventEnrichmentService consumes EventCreated → emits EventEnriched
  3. T65 NotificationBroadcaster consumes EventEnriched → emits EventNotificationsSent
  4. T66 FeedDistributor consumes EventEnriched → emits EventAddedToFeeds
  5. T67 MatchingEngine consumes EventEnriched → emits EventMatchesCalculated
  6. Final state: event visible in feed for matching members

Total: 6 domain events, 5 consumers
```

---

## STEP 2 — FIND THE BREAK POINT (binary search)

Don't start at step 1. Start in the middle of the chain.

```bash
# Check if the midpoint event exists in the event stream
curl -sf "localhost:9200/xiigen-events/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {"bool": {"must": [
      {"term": {"type.keyword": "EventEnriched"}},
      {"term": {"traceId.keyword": "[trace-id-from-user-request]"}}
    ]}},
    "size": 1
  }' | jq '.hits.total.value'
# 0 = break is in steps 1-2 (before midpoint)
# 1 = break is in steps 3-6 (after midpoint)
```

Apply binary search recursively until the break is isolated to a single step.

```bash
# Generic event check command
check_event() {
  local EVENT_TYPE=$1
  local TRACE_ID=$2
  COUNT=$(curl -sf "localhost:9200/xiigen-events/_search" \
    -d "{\"query\":{\"bool\":{\"must\":[{\"term\":{\"type.keyword\":\"${EVENT_TYPE}\"}},{\"term\":{\"traceId.keyword\":\"${TRACE_ID}\"}}]}}}" \
    | jq '.hits.total.value')
  echo "${EVENT_TYPE}: ${COUNT} events found"
}

TRACE="your-trace-id-here"
check_event "EventCreated" $TRACE
check_event "EventEnriched" $TRACE
check_event "EventNotificationsSent" $TRACE
check_event "EventAddedToFeeds" $TRACE
check_event "EventMatchesCalculated" $TRACE
```

---

## STEP 3 — CLASSIFY THE BREAK

Once the break is isolated to a single step (event N exists, event N+1 does not):

### Break Class A — Event emitted but consumer never registered
The event exists in the stream. The consumer task type has no subscription to it.

```bash
# Check cross-flow-deps registration
curl -sf "localhost:9200/xiigen-cross-flow-deps/_search" \
  -d '{"query":{"term":{"event.keyword":"EventEnriched"}}}' \
  | jq '.hits.hits[]._source | {targetFlowId, taskTypeId, subscriptionType}'
# Empty result = consumer not registered
```

Fix: Add cross-flow dependency registration in Phase F of the producing flow.
This is a BUG-3 class issue — see cross-flow-dependency-design (SK-463).

### Break Class B — Consumer registered but handler throws before emitting
The subscription exists. The consumer receives the event. The handler fails
before emitting the next event.

```bash
# Check handler execution logs for the trace
curl -sf "localhost:9200/xiigen-execution-log/_search" \
  -d "{\"query\":{\"bool\":{\"must\":[{\"term\":{\"taskTypeId.keyword\":\"T64\"}},{\"term\":{\"traceId.keyword\":\"${TRACE}\"}}]}}}" \
  | jq '.hits.hits[]._source | {status, error, timestamp}'
# Look for: status: "FAILED" with error detail
```

Fix: The handler has an unhandled exception. Load SK-486 (debug-session-protocol).

### Break Class C — Handler executes but emits wrong event type
The handler runs successfully. The next event exists in the stream but with the
wrong type string (e.g., `EventEnriched` vs `event.enriched` — case/format mismatch).

```bash
# Search for ALL events from this trace (not filtered by type)
curl -sf "localhost:9200/xiigen-events/_search" \
  -d "{\"query\":{\"term\":{\"traceId.keyword\":\"${TRACE}\"}},\"size\":50}" \
  | jq '.hits.hits[]._source | {type, timestamp}'
# Compare actual event types against expected types from Step 1
```

Fix: Event type string mismatch. Verify against the event vocabulary (SK-494).

### Break Class D — All events emitted but read path returns wrong state
All events exist in the stream. The final state write happened. But the read
endpoint returns incorrect data.

```bash
# Verify the write happened (check the ES document directly)
curl -sf "localhost:9200/xiigen-community-events/_doc/[event-id]" \
  | jq '{status: ._source.status, feedEntries: ._source.feedEntryCount}'

# If write is correct but GET /api/events/[id] returns wrong data:
# Read path bug — cache, query filter, or projection issue
```

Fix: Cache invalidation or read model query bug. Not an event-driven issue.

---

## STEP 4 — VERIFY THE FIX DOESN'T BREAK ADJACENT CHAINS

After fixing the identified break, re-run the full chain check for the original
trace AND for at least one other trace to verify no regression.

```bash
# Full chain verification after fix
for EVENT in EventCreated EventEnriched EventNotificationsSent EventAddedToFeeds EventMatchesCalculated; do
  check_event $EVENT $TRACE
done
echo "---"
# Run a fresh scenario and verify all events appear
NEW_TRACE=$(curl -sf -X POST localhost:3000/api/events \
  -H "X-Tenant-Id: xiigen-community" \
  -d '{"name":"Test Event","date":"2026-04-01"}' | jq -r '.data.traceId')
sleep 2  # allow async processing
for EVENT in EventCreated EventEnriched EventNotificationsSent EventAddedToFeeds EventMatchesCalculated; do
  check_event $EVENT $NEW_TRACE
done
```

---

## QUICK REFERENCE: BREAK CLASS BY SYMPTOM

| Symptom | Break class | First check |
|---------|------------|-------------|
| Event N+1 missing, Event N present | A or B | cross-flow-deps registration |
| Consumer registered, Event N+1 still missing | B | execution-log for handler error |
| Event N+1 present but wrong type string | C | event type string comparison |
| All events present but UI shows wrong state | D | direct ES document check |
| Event N itself missing | Producer bug | check T_N handler directly via SK-486 |

---

## ANTI-PATTERNS

```
❌ Starting by reading service code before checking the event stream
❌ Checking consumer services when the producer never emitted
❌ Adding more logging before isolating which step fails (binary search first)
❌ Fixing the wrong service because it's "in that area" of the code
❌ Running a single test scenario and not verifying the fix on a second trace
```
