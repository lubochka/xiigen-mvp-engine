---
name: requirement-to-flow
sk_number: SK-492
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["claude-code", "web-session"]
description: >
  Given a requirements document, UML sequence diagram, or product description,
  produce: the list of flows needed, the task types within each flow, the execution
  order, and what is generatable vs hand-built. The product-level equivalent of
  problem-decomposition (SK-430). Fires before any flow design session for a
  new product or new user journey.
triggers:
  - "turn this UML into flows"
  - "how many flows does this require"
  - "what task types do I need"
  - "decompose this requirement"
  - "given this spec what flows"
  - "new product planning"
  - "new customer platform"
  - "I have a UML what do I build"
---

# Requirement-to-Flow Decomposition Skill (SK-492)

## WHAT THIS SKILL PREVENTS

Building flows in the wrong order. Missing a dependency between flows (events
that FLOW-07 needs from FLOW-05). Over-scoping a single flow (creating a FLOW
with 12 task types that should be 3 separate flows). Under-scoping (merging
services that have different ownership domains into one task type).

---

## INPUT FORMS

This skill handles three input forms:

**Form A — UML sequence diagram:** A diagram showing actors, services, and message
flows with events. (e.g., the 8 pages from `possible_umls.xml`)

**Form B — Product description:** Plain English description of what the product
does. (e.g., "A coaching platform where users receive diet plans via WhatsApp")

**Form C — Requirements document:** Structured spec with user stories, features,
or acceptance criteria.

---

## STEP 1 — IDENTIFY THE DOMAIN BOUNDARY

Before listing flows, establish the domain boundary:

```
What does the product DO for users? (one sentence, no technical terms)
What does the product NEED TO KNOW to do that? (data it stores)
What does the product REACT TO? (events that trigger actions)
What does the product PRODUCE? (outputs users see or receive)
```

Example — Community Platform Registration:
```
Does:     Registers a developer and delivers their workspace
Knows:    member identity, email verification status, workspace config
Reacts to: signup action, email link click, questionnaire submission
Produces: verified account, API key, welcome content
```

Everything outside this boundary is a dependency, not a scope item.

---

## STEP 2 — COUNT SERVICE OWNERSHIP GROUPS

For UML inputs: each service that OWNs STATE belongs in a separate task type.
State-owning = the service has a database write as its primary action.

```
For each service in the UML:
  Does it write to its own store? → potential task type
  Does it only read from another service's store? → dependency, not a task type
  Does it only transform data and pass it on? → may merge with adjacent task type
```

**Registration UML example:**
| Service | Owns State? | Task type? |
|---------|------------|------------|
| Auth Service | YES (credentials) | T47 scope |
| User Service | YES (profile) | T47 scope (merge — same transaction) |
| Email Service | YES (verification token) | T48 scope |
| Questionnaire Service | YES (answers) | T49 scope |
| Messaging Service | NO (sends, doesn't store) | IMessagingService call within T49 |
| Analytics Service | YES (metrics) | T62-class best-effort observer |

**Merge rule:** Two state-owning services MAY be merged into one task type when:
- They always write together atomically (registration + profile creation)
- They have no independent consumers (nothing listens to one without the other)
- They represent the SAME domain concept (auth + profile = "member record")

**Split rule:** Two services MUST be separate task types when:
- They have different lifecycles (email verification can fail independently)
- Other flows consume them independently
- One is async/long-running (T48 with 24h TTL)

---

## STEP 3 — GROUP INTO FLOWS

Group task types into flows by answering: "What is the one thing this user journey
accomplishes?"

```
Flow boundary rule: A flow ends when it emits a terminal event that
represents a complete business outcome from the user's perspective.

FLOW-01 ends with: OnboardingDelivered → user is ready to use the platform
FLOW-02 ends with: OnboardingCompleted → user is matched and connected
FLOW-03 ends with: EventCreated → event exists and is promotable
```

If a group of task types does not have a clear terminal event, it is either:
- Too large (split into two flows)
- Not cohesive (task types belong in different flows)

---

## STEP 4 — ESTABLISH DEPENDENCY ORDER

A flow depends on another when:
- It consumes an event produced by the other flow
- It reads data created by the other flow (via a service that was built in it)
- It requires a task type from the other flow to have been generated and tested first

Draw the dependency graph:

```
FLOW-01 → FLOW-02 (FLOW-02 starts on OnboardingDelivered from FLOW-01)
FLOW-01 → FLOW-03 (FLOW-03 creates events for members, needs member records)
FLOW-03 → FLOW-04 (FLOW-04 handles participation in events from FLOW-03)
FLOW-02 → FLOW-05 (FLOW-05 distributes posts to connections from FLOW-02)
```

Flows with no incoming arrows = Wave 0 or Wave 1 (start the sequence).
Flows with incoming arrows = later waves (depend on earlier flows being ACTIVE).

---

## STEP 5 — CLASSIFY GENERATABLE vs HAND-BUILT

```
For each task type:
  Does it fit an existing archetype? (ROUTING / DATA_PIPELINE / CONVERGENCE / etc.)
  → GENERATABLE: AF pipeline produces the service

  Does it require calling an external provider with no existing fabric interface?
  → FABRIC INTERFACE FIRST: Define IXxxService, then generate

  Does it require custom business logic that changes frequently per customer?
  → HAND-BUILT: generate the shell, note manual sections

  Does it depend on a fabric interface that doesn't exist yet?
  → BLOCKED: note the infrastructure dependency
```

---

## STEP 6 — OUTPUT: FLOW DECOMPOSITION DOCUMENT

Produce a document with exactly these sections:

```markdown
## PRODUCT: [name]
## DOMAIN: [one-sentence description]
## TERMINAL EVENT: [the event that says "the product is working for a user"]

## FLOW LIST (dependency order)
| Flow | Purpose | Task types | Depends on | Wave |
|------|---------|-----------|------------|------|
| FLOW-XX | [purpose] | T_N..T_M | [flows] | [wave] |

## TASK TYPE MAP
| Flow | TT | Name | Archetype | Owns state | Merge/split rationale |
|------|----|----|-----------|-----------|----------------------|

## BLOCKED ITEMS (fabric interfaces needed first)
| Blocking item | Which task types blocked | Priority |

## DECISION LOG (decisions made during decomposition)
| Decision | Rationale | Impact |
```

---

## ANTI-PATTERNS

```
❌ One flow per UML page — UML pages are user journeys, flows are domain boundaries
❌ One task type per UML service — merge stateless pass-through services
❌ Any flow with >7 task types — split before designing
❌ Starting to write session files before the dependency graph is drawn
❌ Treating "doesn't exist yet" as "can't be decomposed" — the map is the output
```
