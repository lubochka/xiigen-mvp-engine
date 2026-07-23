---
name: four-tier-decision-classification
sk_number: SK-510
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Before any component, service, or handler is designed, every decision point
  runs a four-question test: BOUNDARY CODE, FREEDOM CONFIG, GRAPH RAG, or
  AI PIPELINE. Extends SK-451 (FREEDOM/MACHINE) from 2 tiers to 4 tiers.
  The third tier (GRAPH RAG) and fourth tier (AI PIPELINE) are the categories
  no prior skill covered — they transform static decisions into learning entities.
triggers:
  - "design a component"
  - "implement this service"
  - "translate skill to code"
  - "is this a decision"
  - "hardcode or config"
  - "should this learn"
  - "four-tier"
  - "BOUNDARY or FREEDOM or GRAPH or AI"
  - "what tier does this belong in"
  - "static or dynamic"
---

# Four-Tier Decision Classification (SK-510)

## WHEN TO INVOKE

Before designing any component, service, handler, or topology node that makes
a decision. "Decision" means: any if/else, switch, lookup table, threshold
comparison, enum-to-value mapping, or conditional branch.

This skill supersedes SK-451 for NEW components. SK-451 remains valid for
values that are clearly MACHINE or FREEDOM — SK-510 adds the GRAPH RAG and
AI PIPELINE tiers that SK-451 does not cover.

---

## WHAT THIS SKILL PREVENTS

- Translating a skill's decision table into a `Record<string, T[]>` TypeScript
  constant that cannot learn (the failure of the initial 17 integration proposals)
- Putting a LEARNABLE decision in FREEDOM config (it gets a value but never improves)
- Putting a truly STATIC decision in the graph (overhead with zero learning value)
- Missing the AI PIPELINE tier for decisions that require contextual reasoning

---

## THE FOUR-TIER TEST

For every decision point in the proposed design, run these four questions IN ORDER.
Stop at the first YES.

```
Q1: Does changing this value break a system guarantee AND require a code change?
    YES → BOUNDARY CODE (Layer 1)
    Hardcode. DNA invariant. Abstract interface + factory wiring.
    Examples: BLOCK verdict removes candidate from pool, key_principles arbiter
    runs isolated, DNA-8 outbox-before-queue.
    → STOP. Use SK-451/SK-426 patterns.

Q2: Might different tenants reasonably want different values for this?
    YES → FREEDOM CONFIG (Layer 2)
    Config key with safe default. Changes without redeploy.
    Examples: cycle budget per archetype, model family for generation,
    confidence threshold, decay window size.
    → STOP. Use SK-451 patterns.

Q3: Could the correct answer improve if the engine observed more runs?
    YES → GRAPH RAG (Layer 4)
    Graph entity with seed weight. Learns from outcomes.
    Examples: which arbiters for ROUTING, what action at score 0.65,
    which model produces best results for ORCHESTRATION.
    → Continue to SK-511 (graph entity design) + SK-512 (confidence lifecycle).

Q4: Does answering this require contextual reasoning beyond pattern matching?
    YES → AI PIPELINE (Layer 3)
    IAIDecisionPipeline with N-model blind proposal + arbiter challenge.
    Produces DPO triple.
    Examples: novel archetype not in graph, first-ever flow for a product,
    conflicting evidence that requires judgment.
    → Continue to SK-513 (AI pipeline design) + SK-514 (planning DPO).
```

Every decision classified Q3 or Q4 must ALSO produce a learning signal → SK-515.

---

## THE FIVE LEARNABLE INDICATORS (for Q3)

When Q1 and Q2 are both NO, apply these indicators to determine if the decision
is LEARNABLE (graph-backed) or simply unclassified:

1. The decision has been wrong before (historical corrections exist)
2. The answer differs by archetype (ROUTING vs ORCHESTRATION vs DATA_PIPELINE)
3. The right answer needs evidence from multiple runs (not one observation)
4. Domain experts disagree on the default (uncertainty = learning opportunity)
5. A human has had to override the default answer more than once

If 2+ indicators are YES → LEARNABLE → graph entity (Q3 path).
If 0–1 indicators → likely FREEDOM CONFIG that hasn't been classified yet.

**Note:** "outcome is measurable at Phase F" is NOT an indicator — it's a
PREREQUISITE. Every LEARNABLE decision must have measurable outcomes, but
measurability alone doesn't make a decision learnable. If outcomes can't
be attributed, the decision should not enter the graph regardless.

---

## CLASSIFICATION TABLE TEMPLATE

Produce this table for every component design before writing any TypeScript:

```markdown
| Decision point | Q1 | Q2 | Q3 | Q4 | Tier | Next skill |
|----------------|----|----|----|----|------|-----------|
| Minimum arbiter panel size | NO | NO | YES (indicators 1,2,4) | — | GRAPH RAG | SK-511 |
| key_principles isolation | YES | — | — | — | BOUNDARY CODE | SK-426 |
| Cycle budget for ROUTING | NO | YES | — | — | FREEDOM CONFIG | SK-451 |
| Score bracket → action routing | NO | NO | YES (indicators 1,2,3,5) | — | GRAPH RAG | SK-511 |
| First-ever product spec audit | NO | NO | NO | YES | AI PIPELINE | SK-513 |
```

---

## ANTI-PATTERNS

❌ "Every decision should learn" — graph overhead for truly static decisions is waste.
BLOCK verdict semantics will NEVER improve with more observations. They are definitions.

❌ "This is simple enough to hardcode" — simplicity is not the test. A simple lookup
table that maps archetypes to arbiter panels IS a learning target. Simplicity of the
current answer does not mean the answer is permanently correct.

❌ "We can always make it learnable later" — retrofitting DPO signals is 5x harder
than designing them from the start. The outcome attribution, the retrospective plan,
and the graph entity schema all need to be designed before the topology is written.

❌ Classifying a decision as GRAPH RAG when it has no measurable outcome — the graph
cannot learn without outcome attribution. If you can't define what "positive" and
"negative" mean for this decision, it cannot be Q3.

---

## CONNECTION TO DOWNSTREAM SKILLS

```
SK-510 classifies → BOUNDARY CODE → SK-451/SK-426 (existing, unchanged)
SK-510 classifies → FREEDOM CONFIG → SK-451 (existing, unchanged)
SK-510 classifies → GRAPH RAG → SK-511 (entity design) → SK-512 (confidence lifecycle)
SK-510 classifies → AI PIPELINE → SK-513 (pipeline design) → SK-514 (planning DPO)
All Q3/Q4 decisions → SK-515 (learning loop closure)
```

---

## RECONCILE — core `four-tier-decision-classification` parity (G02 refresh from llm_mvp_core)

SK-510 is the 4-tier classifier and supersedes SK-451 (freedom-machine) for NEW
components by adding Q3/Q4. mvp names tier 3 **GRAPH RAG**; the core names it
**LEARNABLE**. Keep the GRAPH-RAG formulation; reconcile three core facts so a
LEARNABLE decision does not silently fall back into FREEDOM config:

**(A) Run Q1→Q2→Q3→Q4 in order and STOP at the first YES.** Q1 = TS boundary
invariant (the typed `DataProcessResult<T>`/`Result<T>` contract shape, the public
DTO/route contract). Q2 = a value different deployments/tenants may want (NestJS
`ConfigService`/env with a safe default). Q3 = GRAPH RAG / LEARNABLE. Q4 = AI
PIPELINE (inference + optional arbiter).

**(B) The 5 LEARNABLE indicators (apply when Q1 and Q2 are both NO — 2+ YES ⇒
LEARNABLE, 0–1 ⇒ unclassified FREEDOM):**

```
1. The decision has been wrong before (corrections in git history)
2. The answer differs by corpus/domain (code vs prose vs schema)
3. The right answer needs evidence from multiple runs, not one observation
4. Domain experts disagree on the default (uncertainty = learning opportunity)
5. A human has had to override the default more than once
```
A Q3 decision with no measurable outcome ("better" undefined) is NOT Q3 — it cannot
be attributed, so it cannot learn.

**(C) R5/G12 boundary.** LEARNABLE/AI-PIPELINE stays as a CLASSIFICATION here, but
mvp does NOT hold common ML units locally. A Q3/Q4 decision is realized by consuming
the shared model from `llm_mvp_core` through `.xiigen` manifests/locators and
training only the adaptive (user) leg locally. Do not invent a local checkpoint to
satisfy a "learnable" classification — point at the consumed model manifest.
