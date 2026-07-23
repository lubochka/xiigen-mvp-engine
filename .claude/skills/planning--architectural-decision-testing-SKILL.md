---
name: architectural-decision-testing
sk_number: SK-438
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Tests whether architectural decisions made during planning produced the
  expected outcomes. Three timeframes: immediate (same session), short-term
  (after 3 flows using the decision), long-term (after 10+ flows). Decisions
  that fail testing are marked INVALIDATED — not deleted — so negative
  knowledge is preserved.
triggers:
  - "test this decision"
  - "verify the architecture"
  - "was this right"
  - "architectural review"
  - "decision retrospective"
  - "did the decision hold"
  - "did INCOMPATIBLE reclassification work"
  - "what decisions have been made"
  - "before proposing anything"
  - "load prior decisions"
  - "what's already locked"
  - "check against decisions"
---

# Architectural Decision Testing Skill v1.0

## DECISION LOADING (fires at session start — before any testing or proposal)

Load prior decisions BEFORE any proposal is made. Prevents proposing solutions
that contradict locked decisions without knowing they exist.

### Step 1: Find locked decisions for this domain

```bash
# Check for locked decisions document
cat DECISIONS-LOCKED.md 2>/dev/null | head -50

# Check for flow-specific architecture decisions
cat FLOW-XX-ARCHITECTURE-DECISIONS.json 2>/dev/null | jq '.decisions[] | {decisionId, type, resolution}'

# Query RAG for prior DESIGN_REASONING in this domain
curl -s localhost:9200/xiigen-rag-patterns/_search \
  -d '{"query":{"bool":{"must":[
    {"term":{"patternType.keyword":"DESIGN_REASONING"}},
    {"match":{"domain":"FLOW-01"}}
  ]}},"_source":["decisionId","capability","resolution","principleApplied"]}' \
  | jq '.hits.hits[]._source'
```

### Step 2: Classify each decision as LOCKED, OPEN, or PENDING

```
LOCKED:  implemented, tested, or explicitly closed in a prior session
         → requires DECISION_REOPENING to change
         → changing without reopening is a planning protocol violation

OPEN:    stated as direction but not yet implemented or tested
         → can be changed with evidence and rationale in this session

PENDING: flagged as open question, not yet resolved
         → must be resolved before dependent work can proceed
         → flag to Luba if it blocks planning
```

### Step 3: Check every proposal against locked decisions

For every proposed solution in this session: does it contradict any LOCKED decision?

If yes: **STOP.** Produce a DECISION_REOPENING challenge before proceeding:

```
DECISION_REOPENING:
  locked_decision:  [exact text of the locked decision]
  new_evidence:     [what was found that warrants reconsideration]
  proposed_change:  [what would change if reopened]
  blast_radius:     [which artifacts and flows depend on this decision]
  recommendation:   reopen | confirm locked | defer
```

Do not proceed with a proposal that contradicts a locked decision
without explicit approval to reopen. Do not "work around" the decision.

**Rule:** A planning session that ignores a locked decision and implements
something contradictory wastes the session and creates debt to unwind.

---

## THREE TESTING TIMEFRAMES

---

## IMMEDIATE TESTING (same session as the decision)

Run immediately after Gate C approval, before Phase A starts.

### For CAPABILITY_CLASSIFICATION decisions:

```
□ Q1-Q4 was applied (verify capabilityRouting[] has all 4 answers recorded)
□ Classification is consistent with similar capabilities in other flows
  → Query RAG: "same archetype, same domain, how was it classified?"
  → If different: document why this case is different or reopen the decision
□ If FLOW: topology contract exists and has required nodes
□ If MANUAL: capability is on bootstrap-boundary exhaustive list
```

### For INCOMPATIBILITY_RECLASSIFICATION decisions:

```
□ New fabric interface is defined (ISchedulerService, IQueueProvider, etc.)
□ FREEDOM config key exists for provider selection
□ Both providers (NestJS implementation + WordPress implementation) implement
  the same interface — different implementations, same contract
□ The capability that was INCOMPATIBLE can now generate for the new stack
□ Genesis prompt Section 4 exists for the previously-INCOMPATIBLE stack
```

### For WAVE_ASSIGNMENT decisions:

```
□ All flows that DEPEND ON this capability come AFTER its wave
□ No flow at a lower wave number imports from this capability's domain
□ The wave assignment is consistent with PARALLEL-EXECUTION-PLAN.md
```

### For INTERFACE_INTRODUCTION / FABRIC-FIRST decisions (universal):

When a decision introduces or relies on an interface (fabric-first), the immediate
test verifies the decision actually holds in code — no consumer bypasses the
interface with a concrete `new`, and every implementor honors the same contract:

```bash
# 1) Fabric-first: zero direct instantiation of the concrete behind the interface.
#    DNA Rule 2 — depend on the interface, never `new ConcreteType()` for a fabric dep.
grep -rn "new <ConcreteServiceType>(" server/src/ | grep -v "\.spec\.ts"
# Expected: 0 hits. Any hit = a consumer bypassed the fabric → decision violated.

# 2) Interface stability across implementors (TS): every implementor implements the
#    SAME interface — different implementations, identical contract.
grep -rn "implements <IServiceInterface>" server/src/
# Expected: ≥2 implementors (e.g. real + in-memory/mock) all naming the same interface.

# 3) DI wiring uses the interface token, not the concrete, in the NestJS module:
grep -rn "provide:.*<IServiceInterface>" server/src/**/*.module.ts
# Expected: provider registered against the interface token (fabric swap point exists).
```

```
□ grep "new <ConcreteType>(" (non-test) = 0 hits — no fabric bypass
□ ≥2 implementors implement the SAME interface (stable contract across stacks)
□ NestJS module registers the provider by interface token (swap point exists)
□ A consumer can switch implementors via FREEDOM/DI config without code change
```

---

## SHORT-TERM TESTING (after the first 3 flows that use the decision)

Run during Phase A of the 4th flow that touches the same capability class.

### For NODE-First design:

```bash
# Were there generation failures a better NODE would have prevented?
# Compare GAP_SIGNAL count: flows with NODEs vs flows before NODEs
curl -sf "localhost:9200/xiigen-training-data/_search" \
  -d '{"query":{"bool":{"must":[{"term":{"type":"GAP_SIGNAL"}},
      {"term":{"flowId":"${flowId}"}}]}},"aggs":{"total":{"value_count":{"field":"signalId"}}}}' \
  | jq '.aggregations.total.value'
# Expected: lower count for NODE-enabled flows

# Did the stack profiles hold?
curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
  -d '{"query":{"bool":{"must":[{"term":{"patternType.keyword":"NODE_REPRESENTATION"}},
      {"term":{"flowId":"${flowId}"}}]}},"_source":["stackProfiles","convergenceHistory"]}' \
  | jq '.hits.hits[]._source.stackProfiles | keys'
# Expected: all target stacks present, no unexpected INCOMPATIBLE additions
```

### For DESIGN_REASONING training data:

```bash
# Did AF-4 retrieve ARCHITECTURE_DECISION patterns during 2nd and 3rd flows?
curl -sf "localhost:9200/xiigen-rag-retrieval-outcomes/_search" \
  -d '{"query":{"bool":{"must":[{"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}},
      {"range":{"timestamp":{"gte":"${date of first flow}"}}}]}},"size":20}' \
  | jq '.hits.total.value'
# If 0: architecture learning not connected

# Were any retrieved decisions wrong for the new context? (false positive retrievals)
# Check: were any decisions retrieved and then NOT applied?
# If yes: teachingPoint needs to be more specific
```

### For ARBITER_SELECTION:

```bash
# Did CALIBRATION triples show skipped arbiters were actually unnecessary?
curl -sf "localhost:9200/xiigen-calibration-memory/_search" \
  -d '{"query":{"term":{"type":"ARBITER_SELECTION_CALIBRATION"}},"size":20}' \
  | jq '.hits.hits[]._source | {implementationClass, arbitersSkipped, anySkippedNeeded}'
# Expected: anySkippedNeeded = false for ADAPTED and CLONED classes

# Were there any final-round failures that a skipped arbiter would have caught?
# If yes: tighten the selection criteria for that implementation class
```

---

## LONG-TERM TESTING (after 10+ flows)

Run during any architectural review session.

### For semantic RAG:

```bash
# Plot: average rounds to convergence per flow over time
# Expected: decreasing. If flat or increasing: RAG not helping convergence.
curl -sf "localhost:9200/xiigen-convergence-sessions/_search" \
  -d '{"aggs":{"by_flow":{"terms":{"field":"flowId.keyword"},
      "aggs":{"avg_rounds":{"avg":{"field":"rounds"}}}}},"size":0}' \
  | jq '.aggregations.by_flow.buckets | sort_by(.key) | .[] | {flowId:.key, avgRounds:.avg_rounds.value}'

# Plot: AF-9 score on round 1 vs round 3 over time
# Expected: round 1 scores increasing (better initial generation from RAG context)
```

### For NODEs:

```bash
# Are NODEs from early flows being referenced by later flows' convergences?
# Expected: yes, with increasing frequency
curl -sf "localhost:9200/xiigen-convergence-sessions/_search" \
  -d '{"query":{"exists":{"field":"upstreamNodesReferenced"}},"_source":["nodeId","upstreamNodesReferenced"],"size":50}' \
  | jq '.hits.hits[]._source'

# Were there upstream NODE corrections (escalations from downstream)?
# Expected: a few early, decreasing over time
# If many: upstream NODEs not thorough enough in early rounds
```

---

## DECISION INVALIDATION

If testing shows a decision was wrong:

```
1. Record in ARCHITECTURE-DECISIONS.json with status: INVALIDATED
   Add challenged field with what the testing revealed.

2. Reopen as DECISION_REOPENING
   (see planning--decision-reopening-SKILL.md)

3. The invalidated decision remains in the RAG with status=INVALIDATED
   → Future sessions know it was tried and found wrong
   → Negative knowledge is valuable — don't delete it

4. Seed the invalidation itself as a DESIGN_REASONING triple:
   {
     "type": "DESIGN_REASONING",
     "decisionType": "INVALIDATION",
     "context": "${original decision context}",
     "invalidatedDecision": "${what was decided}",
     "invalidationEvidence": "${what the testing revealed}",
     "teachingPoint": "${what to NOT do in similar situations}"
   }
```

> **Step 4 is NOTE-ONLY / optional for this project (R5).** Seeding the invalidation
> as a DPO/DESIGN_REASONING training triple is a *common-model learning* action.
> Per R5 the common trainable model and its DPO sets live in `llm_mvp_core`, not in
> this repo. In mvp, Steps 1–3 are mandatory (record `INVALIDATED`, reopen, keep the
> negative knowledge), but Step 4 (DPO triple seeding) is **not required here** — at
> most record the invalidation as a plain governance/decision note. Do not stand up a
> local DPO/training pipeline in mvp to satisfy this step; the model consumes such
> learning through core manifests/locators.

---

## GOOD ARCHITECTURAL DECISIONS HAVE THESE PROPERTIES

A decision is well-tested when:

```
□ Immediate test: passes all classification consistency checks
□ Short-term test: observable improvement in the metric the decision was meant to improve
□ Long-term test: the improvement is sustained, not just an initial spike
□ No false positive retrievals of the decision in unrelated contexts
□ The teachingPoint generalizes correctly to new situations
```

A decision needs reopening when:
```
□ The metric it was meant to improve is flat or worse after 3 flows
□ It is retrieved and applied in contexts where it produces wrong guidance
□ A downstream NODE escalation reveals an assumption the decision made was wrong
□ The same problem recurs despite the decision being applied
```

---

## INTEGRATION

```
Invoke at:    Gate C (immediate tests), Phase A of 4th related flow (short-term),
              architectural review sessions (long-term)
Produces:     test results → appended to ARCHITECTURE-DECISIONS.json
References:   code-execution--learning-signal-capture-SKILL.md (DESIGN_REASONING signal)
              planning--decision-reopening-SKILL.md (if invalidation needed)
```
