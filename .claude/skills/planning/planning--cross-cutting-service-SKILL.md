---
name: cross-cutting-service
sk_number: SK-495
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Before designing any Wave 1+ flow, identify services that appear in multiple
  UML pages. These are cross-cutting concerns that need shared fabric interfaces
  rather than per-flow implementations. Building a notification service inside
  FLOW-03 and a different one inside FLOW-07 creates drift — the same skill
  prevents that. Fires during requirement-to-flow decomposition (SK-492).
triggers:
  - "appears in multiple flows"
  - "shared service"
  - "cross-cutting concern"
  - "notification in multiple places"
  - "which services are shared"
  - "feed service appears everywhere"
  - "before designing wave 2"
---

# Cross-Cutting Service Identification Skill (SK-495)

## WHAT THIS SKILL PREVENTS

Building two implementations of Notification Service — one inside FLOW-03
(event notifications) and another inside FLOW-07 (learning reminders) — that
diverge over time and require double maintenance. Building a Feed write path
inside FLOW-05 (posts) that is incompatible with the Feed write path FLOW-08
(marketplace) needs.

Cross-cutting services that are re-implemented per flow are the most expensive
class of architectural mistake in a multi-flow system.

---

## STEP 1 — COUNT SERVICE APPEARANCES ACROSS UMLS

For each service mentioned in any UML, count how many UML pages reference it:

```
Feed Service:          ████████ 7 of 8 UML pages  ← CRITICAL: shared infrastructure
Notification Service:  ██████   6 of 8 UML pages  ← shared infrastructure
Analytics Service:     █████    5 of 8 UML pages  ← shared infrastructure
Ranking Service:       ████     4 of 8 UML pages  ← shared
ML Service:            ███      3 of 8 UML pages  ← shared
Event Service:         ██       2 of 8 UML pages  ← may be shared
Auth Service:          ██       2 of 8 UML pages  ← single implementation, shared read
Questionnaire Service: █        1 of 8 UML pages  ← per-flow
```

**Classification threshold:**
- Appears in ≥3 UMLs → SHARED INFRASTRUCTURE: fabric interface required
- Appears in 2 UMLs → REVIEW: may be shared depending on usage type
- Appears in 1 UML → PER-FLOW: build inside that flow

---

## STEP 2 — CLASSIFY EACH SHARED SERVICE

For each shared service, determine its sharing pattern:

**Pattern A — Shared Write + Shared Read (most complex)**
Multiple flows write to this service AND multiple flows read from it.
Example: Feed Service — posts, events, marketplace listings all write; every view reads.

Resolution: Define the service as a fabric interface with write methods AND read/query
methods. Build it as a standalone infrastructure item (not inside any single flow) BEFORE
the first flow that writes to it.

**Pattern B — Shared Read Only**
One flow builds the service; subsequent flows only read from it.
Example: Auth Service — FLOW-01 builds it; all other flows call it for token validation.

Resolution: Build in the first flow. Document the read interface as a cross-flow dependency.
Subsequent flows use it via the existing service (not rebuild it).

**Pattern C — Shared Notification/Outbox**
Multiple flows trigger notifications via this service; each flow provides different
notification templates.

Example: Notification Service — FLOW-01 uses it for email verification, FLOW-03 for
event reminders, FLOW-07 for learning reminders.

Resolution: Build the Notification Service as a fabric interface (INotificationService)
in FLOW-01 (first flow to need it). Each subsequent flow registers new templates but
calls the same interface. Never build a per-flow notification implementation.

---

## STEP 3 — ORDER THE BUILD SEQUENCE

Shared infrastructure services must be built (or at least stubbed as fabric interfaces)
BEFORE the first flow that uses them:

```
Pre-FLOW-05 infrastructure needed:
  IRankingService    ← FLOW-05 (post distribution) needs scoring
  IFeedService       ← FLOW-05 writes post to feed; also needed by FLOW-08, FLOW-09
  INotificationService ← FLOW-03 already built this; verify interface covers FLOW-05 needs
  scoring_weights_from_freedom_config named check ← FLOW-05 scoring = ML weights problem

Pre-FLOW-07 infrastructure needed:
  IGamificationService ← FLOW-07 awards points; FLOW-08 may also need this
  IMLService (stub)    ← FLOW-07 updates recommendation models
```

---

## STEP 4 — PRODUCE THE SHARED SERVICES MAP

Before any Wave 1+ flow design session, produce:

```markdown
## SHARED SERVICES MAP (required before Wave [N] design)

| Service | Appearances | Pattern | Built in | Fabric interface |
|---------|------------|---------|----------|-----------------|
| Feed Service | 7 flows | A: shared write+read | Pre-FLOW-05 infra | IFeedService |
| Notification Service | 6 flows | C: shared notification | FLOW-03 | INotificationService |
| Analytics Service | 5 flows | B: shared read | FLOW-05 | IAnalyticsService |
| Ranking Service | 4 flows | A: shared write+read | Pre-FLOW-05 infra | IRankingService |
| ML Service | 3 flows | B: shared read | FLOW-07 | IMLService |

## FLOW-SPECIFIC SERVICES (build inside the flow, share only read)
| Service | Flow | Not shared because |
|---------|------|-------------------|
| Questionnaire Service | FLOW-01 | Only FLOW-01 writes; others only read answers |
| Event Service | FLOW-03 | Only FLOW-03 creates events; others reference them |
```

---

## THE ANTI-PATTERNS THIS PREVENTS

```
❌ Building FeedWriter in FLOW-05 and FeedInserter in FLOW-08 — same domain, different names
❌ Building NotificationService twice — FLOW-03 email reminders and FLOW-07 learning reminders
   both send notifications but use different implementations
❌ Building Analytics tracking in FLOW-05, FLOW-07, FLOW-08 as separate services
   when IAnalyticsService called from all three would be identical
❌ Discovering in FLOW-08 that IFeedService needs a new method, causing retroactive
   changes to FLOW-05's already-generated code
```

---

## INTEGRATION WITH SK-492

Run this skill INSIDE the SK-492 decomposition session, at Step 3 (Group into flows).
Before finalizing which task types belong in which flow:

1. Run the service appearance count across all UMLs
2. Extract shared services → they become fabric interface prerequisites
3. Build the shared services map
4. Update the flow dependency graph: flows that need shared infrastructure
   depend on the infrastructure item, not just on other flows
