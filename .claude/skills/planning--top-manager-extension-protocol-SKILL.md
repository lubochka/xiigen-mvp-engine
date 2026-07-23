---
name: top-manager-extension-protocol
sk_number: SK-518
version: "1.0.0"
priority: MEDIUM
load_order: 3
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session"]
description: >
  How the Top Manager AI role detects knowledge gaps in the decision graph and
  proposes mutations through a structured three-phase approval protocol. Distinct
  from SK-506 (gap-to-proposal) which covers engine capability gaps detected via
  the capability manifest. This skill covers gaps in the KNOWLEDGE GRAPH itself.
triggers:
  - "Top Manager"
  - "graph mutation"
  - "extend the graph"
  - "propose new edge"
  - "REJECTION_REASON"
  - "approval protocol"
  - "novel archetype"
  - "graph mutation proposal"
---

# Top Manager Extension Protocol (SK-518)

## WHEN TO INVOKE

When the AI decision pipeline encounters a novel case that the graph cannot
answer. When designing the Top Manager component (T587/T588 from
FLOW-GRAPH-EXTENSION). When reviewing proposed GraphMutationProposals.

---

## WHAT THIS SKILL PREVENTS

- Top Manager re-proposing rejected mutations (REJECTION_REASON edge memory)
- Single-model self-simulation (confirmation bias — V9-002 violation)
- Unstructured free-text proposals that Luba can't systematically evaluate
- Top Manager writing TypeScript directly (it proposes mutations, not code)
- Low-evidence proposals wasting Luba's review time

---

## THREE ESCALATION TRIGGERS

The Top Manager activates when:

1. Graph returns no matching edges for a query (novel archetype or relationship)
2. All matching edges have confidence below `engine.graph.minConfidence` (FREEDOM config)
3. Context AI emits `CONTEXT_INSUFFICIENT` typed event

---

## THREE LEGITIMATE MUTATION TYPES

```
ADD_EDGE:             new relationship between existing entities
                      Evidence bar: ≥ 3 runs where the gap was observed

PROMOTE_EDGE_TYPE:    OPTIONAL → PROMOTED → REQUIRED
                      Evidence bar: observationCount crosses FREEDOM threshold

PROPOSE_NEW_NODE:     new entity type not yet in graph
                      Evidence bar: ≥ 10 runs showing consistent pattern
                      (highest bar — new entity types change the schema)
```

---

## TWO PROHIBITED ACTIONS

1. **Modify an `immutable: true` edge** → auto-reject at Phase 1 screening.
   Immutable edges are architectural invariants. The Top Manager cannot override
   DNA patterns regardless of evidence.

2. **Directly write TypeScript code** → Top Manager proposes graph mutations OR
   routes to CapabilityGapFlowProposer (T585) which runs the code generation
   pipeline. The Top Manager never generates code itself. It proposes structured
   mutations or delegates to T585 when the gap is a missing capability rather
   than a missing graph edge. T585 then runs FLOW-PREREQ-02's autonomous
   interface generation. Without this distinction, session authors may block
   T585 routing because the prohibition appears to cover all TypeScript output.

---

## GraphMutationProposal STRUCTURE

```typescript
interface GraphMutationProposal {
  id: string;
  type: 'ADD_EDGE' | 'PROMOTE_EDGE_TYPE' | 'PROPOSE_NEW_NODE';
  targetGraph: 'xiigen-decision-graph';
  proposedMutation: GraphMutation;
  evidence: {
    triggeringRuns: string[];       // flow IDs where gap was observed
    observationCount: number;
    similarExistingEdges: string[];
    conflictsWithEdges: string[];
  };
  scopeClassification: 'CONVENTION' | 'EXTENSION' | 'NEW_FLOW';
  requiredBeforeNextWave: boolean;
  blocksCurrentFlowDesign: boolean;
  reversible: boolean;
}
```

---

## THREE-PHASE APPROVAL

```
Phase 1 — AUTOMATED SCREENING:
  Conflict with IMMUTABLE edge?        → REJECT immediately
  Edge name already exists?            → MERGE_SUGGESTION
  Evidence count < 3 runs?             → INSUFFICIENT_EVIDENCE, requeue after 3 more

Phase 2 — CROSS-MODEL SIMULATION:
  CONSTRAINT: simulatorModel ≠ proposerModel (V9-002 logic)
  If proposer = Claude → simulator must be Gemini or DeepSeek
  If only one model family available → SKIP Phase 2, route to Luba directly
  Simulator: "if this edge existed for the last 10 runs, would outcomes improve?"
  Produces: SIMULATION_REPORT with before/after comparison
  CONTESTED proposals (simulator disagrees with proposer) → show both views to Luba

Phase 3 — LUBA REVIEW:
  Present: mutation in plain language, evidence, simulation, scope level
  Options: APPROVE / REJECT / MODIFY
  APPROVED → mutation applied immediately
  REJECTED → REJECTION_REASON edge stored in graph
  MODIFY  → guidance becomes approval criterion for future similar proposals
```

---

## REJECTION_REASON EDGES

When Luba rejects a mutation, a `REJECTION_REASON` edge is stored:

```json
{
  "fromEntity": "PROPOSAL:add-overlap-arbiter-routing",
  "relationship": "REJECTION_REASON",
  "toEntity": "REASON:false-positive-rate-too-high",
  "confidence": 1.0,
  "immutable": false,
  "reasoning": "Luba rejected: overlap arbiter on ROUTING produces 80% false positives"
}
```

The Top Manager queries REJECTION_REASON edges BEFORE proposing. If a similar
mutation was previously rejected, the proposal must either cite new evidence
that addresses the rejection reason or not be proposed at all.

Rejected proposals become training data: "mutations Luba doesn't want."

---

## ANTI-PATTERNS

❌ Top Manager proposing mutations without checking REJECTION_REASON history.
   Same proposal rejected in run 7 will be rejected again in run 21.

❌ Phase 2 simulation by the same model that proposed the mutation.
   Self-evaluation is confirmation bias. V9-002 applies to proposals too.

❌ Proposals with evidence count < 3. One observation is not a pattern.

❌ PROPOSE_NEW_NODE for a concept that could be an edge on existing nodes.
   New node types are expensive (schema change). Prefer ADD_EDGE first.
