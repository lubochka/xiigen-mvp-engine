---
name: graph-entity-schema-design
sk_number: SK-511
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  After SK-510 classifies a decision as GRAPH RAG, this skill designs the graph
  entities: node types, edge types, relationship names, seed weights, immutability
  flags, and promotion paths. Produces the entity schema that IGraphRagService
  stores and queries. Without this skill, graph entities are designed ad hoc
  with inconsistent types, missing confidence fields, and no promotion path.
triggers:
  - "add to decision graph"
  - "new graph entity"
  - "seed this decision"
  - "what nodes does this need"
  - "entity or edge"
  - "immutable edge"
  - "relationship type"
  - "graph schema for"
---

# Graph Entity Schema Design (SK-511)

## WHEN TO INVOKE

After SK-510 classifies a decision as GRAPH RAG (Q3). Before any graph entity
is written to `xiigen-decision-graph`. Before any topology references a graph query.

---

## WHAT THIS SKILL PREVENTS

- Graph entities designed as flat key-value store (no relationships)
- Decisions modeled as nodes when they should be edges (relationships ARE the knowledge)
- Edges with no confidence field (they can never learn)
- Entities that should be FREEDOM config keys (scalar values with no relationships)
- Missing promotion paths (graph that never grows its minimum panels)
- Inconsistent entity types across different flows

---

## ENTITY TYPE CLASSIFICATION

For each LEARNABLE decision, classify every element:

**NODE:** An entity that exists independently and accumulates observations.
Test: can this be the subject of its own learning?
Examples: `ARCHETYPE:ROUTING`, `ARBITER_ROLE:security`, `SCORE_BRACKET:65-84`

**EDGE:** A claim about a relationship between two nodes — learnable, weighted.
Can be added or removed without changing the nodes it connects.
Test: can this be proven right or wrong by observing run outcomes?
Examples: `ARCHETYPE:ROUTING --[REQUIRES_MINIMUM]--> ARBITER_ROLE:security`

**PROPERTY:** A fact about a node that is not itself a learning target.
Test: does this value change based on evidence? If no → property, not edge.
Examples: `ARCHETYPE:ROUTING.handlerType = "route.handler"` (always true)

**IMMUTABLE EDGE:** A boundary condition that cannot be learned away.
Test: is this a definition rather than a hypothesis?
Examples: `BLOCK_VERDICT --[FORCES]--> REMOVE_FROM_POOL` (DNA invariant)

---

## THE ENTITY DERIVATION TABLE

```
Decision type                     → Node types             → Edge type
"which arbiters for archetype"    → ARCHETYPE, ARBITER_ROLE → REQUIRES_MINIMUM / OPTIONAL_ARBITER
"what action at this score"       → SCORE_BRACKET, ACTION   → ROUTES_TO
"which model for this task"       → TASK_TYPE, MODEL_FAMILY → PREFERRED_MODEL
"is this check needed for X"     → ARCHETYPE, NAMED_CHECK  → REQUIRES_CHECK / OPTIONAL_CHECK
"avoid this pattern for X"       → ARCHETYPE, ANTI_PATTERN → AVOID
"this skill governs entity Y"    → SKILL_NODE, any entity  → GOVERNS_SEED
```

---

## SEED VALUES

Every edge MUST have these fields at creation time:

```
weight:           0.5  (neutral prior — equal pull toward yes/no)
confidence:       from ConfidencePreseeder formula (see SK-512)
observationCount: 0    (no runtime observations yet)
immutable:        false (unless classified as IMMUTABLE EDGE)
source:           "bootstrap" | "discovered" | "manual"
```

---

## THE FIVE-FIELD EDGE SCHEMA (minimum)

```json
{
  "fromEntity":       "ARCHETYPE:ROUTING",
  "fromType":         "ARCHETYPE",
  "relationship":     "OPTIONAL_ARBITER",
  "toEntity":         "ARBITER_ROLE:security",
  "toType":           "ARBITER_ROLE",
  "confidence":       0.14,
  "observationCount": 0,
  "immutable":        false,
  "source":           "bootstrap",
  "reasoning":        "Seeded from SK-442 arbiter-panel-design minimum panel table"
}
```

---

## PROMOTION PATH DESIGN

For edges that can upgrade, define the path at design time:

```
OPTIONAL_ARBITER  → PROMOTED_ARBITER   (at engine.graph.optionalToPromotedThreshold observations)
PROMOTED_ARBITER  → REQUIRES_MINIMUM   (at engine.graph.promotedToRequiredThreshold observations)
OPTIONAL_CHECK    → PROMOTED_CHECK     (same thresholds)
PROMOTED_CHECK    → REQUIRES_CHECK     (same thresholds)
PREFERRED_MODEL   → (no promotion — model preference stays configurable, never REQUIRED)
AVOID             → (no promotion — but weight strengthens; AVOID edges don't change type)
GOVERNS_SEED      → (no promotion — structural link, not a learning target)
```

---

## ANTI-PATTERNS

❌ Creating an entity for a scalar value that has no relationships.
   "cycle budget = 5" has no graph relationships → FREEDOM CONFIG, not a graph entity.

❌ Making every edge immutable "to be safe."
   Only DNA invariants are immutable. Everything else must be learnable.

❌ Designing edges without a `relationship` field.
   `ARCHETYPE:ROUTING → ARBITER_ROLE:security` means nothing without the relationship type.
   Is it REQUIRES? OPTIONAL? AVOID? The relationship IS the knowledge.

❌ Using the same relationship type for different semantics.
   REQUIRES_MINIMUM (mandatory panel member) ≠ OPTIONAL_ARBITER (can be promoted).

---

## OUTPUT: ENTITY SCHEMA DOCUMENT

Produce this for every GRAPH RAG decision before writing any topology:

```markdown
### Entity schema for: [decision name]

Nodes:
- ARCHETYPE:ROUTING (type: ARCHETYPE)
- ARBITER_ROLE:security (type: ARBITER_ROLE)

Edges:
- ARCHETYPE:ROUTING --[OPTIONAL_ARBITER]--> ARBITER_ROLE:security
  seed: weight 0.5, confidence 0.14, observationCount 0
  promotion: OPTIONAL → PROMOTED at 3 obs, PROMOTED → REQUIRED at 5 obs
  immutable: false

Immutable edges:
- ARBITER_ROLE:key_principles --[ISOLATED]--> true
  confidence: 1.0, immutable: true
```
