---
name: feature-prioritization
sk_number: SK-502
version: "1.0.0"
priority: MEDIUM
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  Given a set of flows (from SK-492 decomposition), determine the build order
  when business priority and technical dependency order conflict. Applies when
  a customer has >3 flows and needs a subset first, or when two flows are both
  technically unblocked but resources allow only one at a time.
triggers:
  - "which flow to build first"
  - "prioritize features"
  - "customer wants X before Y"
  - "build order"
  - "what to build next"
  - "customer priority vs dependency order"
---

# Feature Prioritization Skill (SK-502)

## WHEN THIS SKILL FIRES

After SK-492 produces the flow decomposition and dependency graph. When there are
multiple flows that are technically buildable (no blocking dependencies) and a
priority decision is needed.

---

## THE THREE-AXIS EVALUATION

For each candidate flow, score against three axes:

**Axis 1 — Business value unlock (1-5)**
Does completing this flow unlock measurable customer value on its own?
5 = Users can DO something with the platform after this flow is complete
3 = Platform is more complete but no new user action is enabled
1 = Backend capability only, no user-visible change

**Axis 2 — Dependency multiplier (1-3)**  
How many other flows are blocked behind this one?
3 = 3+ other flows cannot start until this completes
2 = 1-2 flows blocked behind this
1 = No other flow depends on this

**Axis 3 — Infrastructure cost (1-3, inverted)**
How much new infrastructure does this flow need?
1 = Needs 2+ new fabric interfaces not yet defined (high cost)
2 = Needs 1 new fabric interface
3 = All fabric interfaces already exist (low cost)

**Priority score = Axis1 × Axis2 × Axis3**

---

## EXAMPLE: FLOW-05..09 PRIORITIZATION

```
FLOW-05 Post Creation + Distribution:
  Business value:    5 (users can post content — core action)
  Dependency mult:   3 (FLOW-08 marketplace and FLOW-09 feed depend on it)
  Infra cost:        2 (needs IRankingService, IFeedService — 2 new interfaces)
  Score: 5 × 3 × 2 = 30

FLOW-06 Onboarding + Questionnaire:
  Business value:    4 (completes registration story)
  Dependency mult:   2 (FLOW-07 learning depends on it)
  Infra cost:        3 (all interfaces exist from FLOW-01)
  Score: 4 × 2 × 3 = 24

FLOW-07 Learning + Gamification:
  Business value:    3 (engaged users, but requires FLOW-06 first)
  Dependency mult:   1 (FLOW-11 analytics only loosely depends)
  Infra cost:        1 (needs IGamificationService + IMLService)
  Score: 3 × 1 × 1 = 3

FLOW-09 Feed Personalization:
  Business value:    4 (personalized discovery — visible to users)
  Dependency mult:   2 (FLOW-08 marketplace needs it)
  Infra cost:        1 (needs IRankingService + IFeedService full impl)
  Score: 4 × 2 × 1 = 8
```

Priority order: FLOW-05 (30) → FLOW-06 (24) → FLOW-09 (8) → FLOW-07 (3)

---

## OVERRIDE CONDITIONS

Customer priority can override the score. Record overrides explicitly:

```
Customer says: "We need Learning (FLOW-07) before Post Creation (FLOW-05)
because our primary product is education, not social."

Override applied: FLOW-07 moves before FLOW-05 despite lower score.
Infrastructure consequence: Need IGamificationService + IMLService before
social ranking infrastructure — different Sprint 1/2 sequencing.

Record as ARCHITECTURE-DECISIONS.json entry: D-PRIORITY-001
"Customer-driven priority override: Learning before Social. Infrastructure
sequencing adjusted accordingly."
```

---

## DEPENDENCY-LOCKED CONSTRAINT

Priority scores never override hard dependency locks:

```
CANNOT build FLOW-07 before FLOW-06 regardless of score.
CANNOT build FLOW-09 before FLOW-05 regardless of score.
The dependency graph is invariant. Prioritization operates within it.
```
