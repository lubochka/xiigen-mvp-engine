---
name: flow-design-cycle
sk_number: SK-469
version: "2.0.0"
priority: HIGH
load_order: 4
category: planning
author: luba
updated: "2026-03-25"
contexts: ["web-session", "claude-code"]
description: >
  The complete cycle: how a capability gap becomes a flow topology, gets judged
  by AF-9, improves via PromptOps, accumulates DPO triples, and eventually
  teaches the engine to design similar topologies better. Covers all five stages
  and their learning outputs. Used for planning new infrastructure flows and
  reviewing topology designs.
triggers:
  - "design a new flow"
  - "new infrastructure flow"
  - "flow design cycle"
  - "how does the engine improve"
  - "FLOW-37 FLOW-38 cycle"
  - "topology improvement"
  - "flow gets better over time"
---

# Flow Design Cycle Skill v1.0

## WHEN TO INVOKE

**Web session:** When designing a new infrastructure flow (FLOW-37+). After
`flow-vs-service-gate` classifies capabilities as FLOW, this skill explains
how each flow topology moves through its improvement cycle.

**Claude Code:** When reviewing a completed phase to determine whether the
topology is improving as expected and where the next cycle starts.

---

## WHAT THIS SKILL PREVENTS

Infrastructure flows that are designed once, deployed, and never improve —
because the design process didn't account for the improvement cycle. Specifically:
flows that have no PromptOps connection, no DPO triples, and no mechanism to
detect when their output quality has degraded.

---

## THE FIVE-STAGE CYCLE

Every flow topology moves through these five stages, then repeats from Stage 2:

```
Stage 1: GAP IDENTIFIED
  Source: capability-gap-scanner detects missing capability
          OR human identifies repeated failure pattern
          OR FLOW-38G (design-flaw-learning) produces GAP_SIGNAL
  Output: Capability name, failure class, proposedSkill

Stage 2: TOPOLOGY DESIGNED (Phase A of the owning flow)
  Who:    Claude Code writes the contract JSON
  How:    topology-structure-SKILL.md + self-questioning-SKILL.md
  Output: contracts/topologies/FLOW-XX/{capability}.topology.json
          genesis prompt seeded to xiigen-prompts
          FLOW_DESIGN RAG patterns updated

Stage 3: TOPOLOGY GENERATED + JUDGED (Phase B-F via af-pipeline)
  Who:    AF pipeline (AF-1 generates, AF-9 judges)
  Score 0-49  → STRUCTURAL_FAILURE: topology contract needs redesign
  Score 50-64 → PromptPatch: genesis prompt improved, re-run
  Score 65-84 → PromptPatch: targeted negative examples added
  Score 85+   → INJECTED: topology promoted
  Output: DPO triple (rejected topology + chosen topology)
          PromptPatch entry in xiigen-prompt-evolution

Stage 4: TOPOLOGY RUNS + RECORDS OUTCOMES (ongoing)
  Every execution: OUTCOME signal → xiigen-rag-retrieval-outcomes
  After 5+ outcomes: RagQualityEvolver updates qualityScore for retrieved patterns
  Multi-cycle runs: GAP_SIGNAL → xiigen-capability-gap-signals
  Wrong topology structure: DESIGN_FLAW → xiigen-flow-design-flaws

  Shadow runs (FLOW-39D — active from FLOW-01 Phase B onward):
    Every Phase B generation request runs local model in parallel (zero latency
    cost — local inference). Shadow output is scored by AF-9 but NEVER enters
    the main pipeline.
    Gap score = expensive_model_score - local_model_score (recorded per task type)
    When gap < 5% for 3 consecutive runs on same task type:
      → shadow.switch.recommended event emitted
      → that task type switches to local-model-primary
      → expensive model becomes fallback only
    This produces a continuous learning curve: is the gap narrowing across flows?
    Without shadow runs, the three-consecutive rule has no data until FLOW-12.

Stage 5: SIGNALS PROMOTE (thresholds triggered)
  DPO triple with teachingPoint × 3 (from 2+ flows)
    → DpoToRagPromoter promotes to PROVEN_SOLUTION in xiigen-rag-patterns
  qualityScore < 0.30 after 20+ outcomes
    → Pattern demoted in retrieval ranking
  DESIGN_FLAW × 3 with similar structure
    → FLOW-38G generates new FLOW_DESIGN RAG pattern
    → Next flow design retrieves this pattern via AF-4
    → Cycle repeats from Stage 2 with better starting knowledge
```

---

## WHAT EACH STAGE PRODUCES AS LEARNING DATA

```
Stage 2 → FLOW_DESIGN RAG patterns (5 patterns per Phase A)
Stage 3 → DPO triples in xiigen-training-data
           PromptPatch entries in xiigen-prompt-evolution
Stage 4 → OUTCOME signals in xiigen-rag-retrieval-outcomes
           GAP_SIGNAL if cycles > 1
           DESIGN_FLAW if topology structure caused the cycles
Stage 5 → Promoted PROVEN_SOLUTION in xiigen-rag-patterns
           Updated qualityScore on existing patterns
           New FLOW_DESIGN pattern from accumulated design flaws
```

After 10 flows through the full cycle, AF-4 retrieves PROVEN_SOLUTION patterns
that were seeded from FLOW-01 through FLOW-05. AF-1 starts generating topologies
that don't need Stage 3 PromptPatch cycles because the patterns already encode
the right design decisions.

---

## CYCLE HEALTH METRICS

Track these per flow to verify the cycle is working:

```
□ Stage 2 → 5 FLOW_DESIGN patterns seeded (verified: curl ES count)
□ Stage 3 → AF-9 score >= 0.85 within 3 cycles (verified: run trace)
□ Stage 3 → DPO triple with full prompt.system (GAP-08 check)
□ Stage 4 → OUTCOME signals captured (verified: xiigen-rag-retrieval-outcomes count)
□ Stage 5 → qualityScore updated after 5+ runs (verified: pattern qualityDataPoints)
```

If Stage 3 requires 3+ cycles on the same task type consistently across flows:
→ The FLOW_DESIGN RAG patterns are insufficient (Stage 2 problem)
→ Add more specific patterns about the repeating design mistake

---

## THE FLOW DESIGN ENGINE (FLOW-39)

> **Reference document:** `FLOW-39-FLOW-DESIGN-TEACHING-AND-LOCAL-MODEL-CURRICULUM.md`
> contains the full execution plan for FLOW-39 including all 7 phases,
> 4 new ES indices, 6 topology contracts, and V9 gate specification.
> Add this document to project knowledge alongside this skill set.

After FLOW-37 and FLOW-38 are both ACTIVE, a meta-flow can design other flows.
This is Stage 2 automated:

```
FLOW-39: flow-design-engine

n1: rag-retrieve.handler
    Queries: xiigen-rag-patterns (patternType: FLOW_DESIGN)
             xiigen-flow-design-flaws (similar past flaws)
             xiigen-flow-registry (existing flows)

n2: validate.handler
    Checks: not-duplicate-flow, not-better-as-extension

n3: route.handler
    condition: n2.shouldCreate

n4: ai-generate.handler  [for new flow]
    Includes: FLOW_DESIGN patterns from n1 as RAG context
    Prompt includes: QUESTION YOURSELF section
    Outputs: topology JSON + selfQuestions + answers

n5: ai-generate.handler  [for extension]
    Outputs: extensionProposal

n6: validate.handler
    Checks: no-hardcoded-routing, has-feedback-node,
            has-learning-signal, self-questions-answered (min 3)

n7: route.handler
    condition: n6.valid

n8: feedback.handler [success]
    Stores: xiigen-flow-designs-pending
    Learning: DPO_TRIPLE (bad design vs good design)
    Emits: flow.design.proposed

n9: feedback.handler [iterate]
    Stores: iteration signal
    Learning: DESIGN_FLAW (what made the design invalid)
```

FLOW-39 itself goes through AF-9 judgment. Its genesis prompt is improved via
PromptOps when it produces poor topology designs. Its DPO triples accumulate
good-design vs bad-design pairs.

---

## USING THIS SKILL IN PLANNING SESSIONS

When reviewing a plan for an infrastructure flow, check:

```
□ Does the plan show all 5 stages? Or does it stop at Stage 3?
□ Is there a mechanism for Stage 5 promotion? (FLOW-38B subscription)
□ Are FLOW_DESIGN RAG patterns seeded in Phase A? (Stage 2 prerequisite)
□ Does the topology contract include learning_signals[] in feedback.handler?
□ Is the DPO triple format complete? (prompt.system populated, not just scores)
```

---

## ANTI-PATTERNS

```
❌ "The topology is deployed, it works, we're done"
   → Stage 4 and 5 haven't run yet
   → Without OUTCOME signals, the topology never improves
   → "Works" means it compiles and runs once; "improves" takes 5+ flows

❌ "DPO triples capture scores, that's enough for fine-tuning"
   → GAP-08: scores without full prompt.system are unusable for local model training
   → The local model trains on context + contrast, not just outcome labels

❌ "FLOW_DESIGN patterns are seeded in Phase A but never updated"
   → Stage 5 should update or add patterns when design flaws accumulate
   → Static FLOW_DESIGN patterns encode only Phase A knowledge forever

❌ "FLOW-39 is too complex, we'll design flows manually forever"
   → Manual flow design means Stage 2 never benefits from Stage 5 knowledge
   → Each flow starts from scratch; the engine never learns to design better
```

---

## TEST SCENARIOS

- After FLOW-01 completes Phase B, check: are OUTCOME signals in
  `xiigen-rag-retrieval-outcomes`? Are the `patternsRetrieved` array populated?
  → If empty: learning loop broke at Stage 4 entry point

- After 5 flows, check: has any pattern's `qualityDataPoints` reached >= 5?
  → If not: RagQualityEvolver (FLOW-38A) is not subscribing to phase.b.completed

- After a topology was redesigned 3 times before reaching score 0.85, check:
  was a DESIGN_FLAW signal captured for each iteration?
  → If not: Stage 4 is capturing PROMPT_PATCH but not DESIGN_FLAW

---

## INTEGRATION

```
Invoked after: flow-vs-service-gate classifies capabilities as FLOW
Depends on:   FLOW-38 (all 6+ loops running) to complete the cycle
Produces:     Phase structure for any infrastructure flow using all 5 stages
Used by:      FLOW-39 planning when designing the meta-flow
Complements:  bootstrap-boundary-SKILL.md (Stage 1 → Stage 2 transition)
              topology-structure-SKILL.md (Stage 2 contract format)
              self-questioning-SKILL.md (Stage 3 quality improvement)
              learning-signal-capture-SKILL.md (Stage 4 signal types)
```

---

## DPO Schema Note (v2.0.0 — K-2)

> DPO triples referenced in this file use abbreviated notation (planning context).
> As of v2.0.0, required fields include: `curriculumTier`, `modelComparison`
> (chosen.model ≠ rejected.model enforced), `targetModelFamily` (FREEDOM config),
> `instructionFormat`, `distillationReadiness`, `prompt.system`.
> Full schema: `code-execution--learning-signal-capture-SKILL.md` (v2.0.0).
> Cross-reference acceptable here — this is a planning-session skill.
> Claude Code SESSION-N.md files must inline all fields (FC-28/SK-443).
