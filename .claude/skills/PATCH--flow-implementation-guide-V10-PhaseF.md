# PATCH: flow-implementation-guide-SKILL.md — V10 Validation + Phase F Self-Model
## Applies to: code-execution--flow-implementation-guide-SKILL.md
## Version: v1.0.3 | Date: 2026-03-24
## Source: XIIGEN-SKILLS-GAP-DOCUMENT.md — EDIT 5

---

## HOW TO APPLY

**Addition A** — insert V10 validation dimension in the Phase A exit gate section.
**Addition B** — insert 4 new steps in the Phase F exit gate, after ACTIVE registration.

---

## ADDITION A: V10 NODE REPRESENTATION INTEGRITY (Phase A exit gate)

Add after existing V9 validation dimension:

```
V10: NODE REPRESENTATION INTEGRITY
  Skip if: convergence.handler not yet ACTIVE (Task 7 — pre-FLOW-01)
  Run at: Phase A completion

  V10-001: node-has-all-properties
    Severity: BUILD_FAILURE
    Check: every task type with capabilityRouting[].decision=FLOW has
           structure, intent, constraints, quality fields in REFERENCE-PLAN.md
    Fail: "NODE missing properties for T-XXX — Phase A incomplete"
    Detection:
      python3 -c "
      import json, sys
      plan = open('FLOW-XX-REFERENCE-PLAN.md').read()
      # for each T-XXX with decision=FLOW, check for node: block within 2000 chars
      "

  V10-002: node-seeded-to-rag
    Severity: BUILD_FAILURE
    Check: xiigen-rag-patterns contains document with
           patternId="node-representation::${flowId}::${taskTypeId}"
           for each task type with decision=FLOW
    Fail: "NODE not seeded — downstream convergences cannot reference it"
    Detection:
      curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
        -d '{"query":{"bool":{"must":[
          {"term":{"patternType.keyword":"NODE_REPRESENTATION"}},
          {"term":{"flowId.keyword":"FLOW-XX"}}]}}}'
      # Expected: count = number of FLOW task types in this flow

  V10-003: stack-profiles-complete
    Severity: SCORE-0 (warning, not build failure)
    Check: each NODE has at least 2 stack profiles
           (primary + at least one alternative)
    Fail: "Single-stack NODE — multi-stack portability not verified"
    Note: acceptable when the capability is genuinely single-stack by design
          (document the reason in node.intent.domainConcepts)
```

---

## ADDITION B: PHASE F SELF-MODEL UPDATE (4 new steps after ACTIVE registration)

Add after the ACTIVE flow-lifecycle registration step in Phase F:

```
PHASE F STEP F-NEW-1: SEED ARTIFACT_RANGE TO RAG

After registering FLOW-XX as ACTIVE, seed the artifact range document:

  Document to seed:
  {
    "patternId": "artifact-range::FLOW-XX",
    "patternType": "ARTIFACT_RANGE",
    "flowId": "FLOW-XX",
    "flowName": "${flow human name}",
    "status": "ACTIVE",
    "completedAt": "${ISO timestamp}",
    "taskTypes": {
      "range": "T${start}-T${end}",
      "next": "T${end+1}"
    },
    "factories": {
      "range": "F${start}-F${end}",
      "next": "F${end+1}"
    },
    "families": {
      "assigned": "${N}",
      "next": "${N+1}"
    },
    "bfaRules": {
      "range": "CF-${start}-CF-${end}",
      "next": "CF-${end+1}"
    }
  }

  Verify:
    curl -sf "localhost:9200/xiigen-rag-patterns/_search" \
      -d '{"query":{"term":{"patternId.keyword":"artifact-range::FLOW-XX"}}}' \
      | jq '.hits.total.value'
    # Expected: 1

PHASE F STEP F-NEW-2: VERIFY ARCHITECTURE-DECISIONS SEEDED

  Check: xiigen-rag-patterns contains at least one document with
         patternType=ARCHITECTURE_DECISION and flowId=FLOW-XX

    ARCH_COUNT=$(curl -sf "localhost:9200/xiigen-rag-patterns/_count" \
      -d '{"query":{"bool":{"must":[
        {"term":{"patternType.keyword":"ARCHITECTURE_DECISION"}},
        {"term":{"flowId.keyword":"FLOW-XX"}}]}}}' | jq .count)
    echo "Architecture decisions for FLOW-XX: ${ARCH_COUNT}"

  If 0: seed now from FLOW-XX-ARCHITECTURE-DECISIONS.json
  Fail: "Architecture decisions not in RAG — design learning broken for this flow"

PHASE F STEP F-NEW-3: UPDATE CLAUDE.md FROM RAG (rendered view only)

  Query RAG for all ARTIFACT_RANGE documents and compute:
    - max(taskTypes.next) across all ACTIVE flows = true next T
    - max(factories.next) across all ACTIVE flows = true next F
    - max(families.next) across all ACTIVE flows = true next Family

  Update CLAUDE.md artifact numbers section from query results.
  DO NOT edit CLAUDE.md manually. Always derive from RAG query.
  CLAUDE.md is a rendered view — the RAG is the source of truth.

PHASE F STEP F-NEW-4: VERIFY NODE REPRESENTATIONS PROPAGATED

  Check: every NODE seeded in Phase A has patternType=NODE_REPRESENTATION
         in xiigen-rag-patterns.

  If unretrieved by any downstream session yet: acceptable (may not have run yet).
  If NODE retrieval fails in downstream sessions: check semantic query construction.
  A NODE that is never retrieved may have content that is too abstract or too
  implementation-specific to appear in semantic search results.
  Fix: revise the purpose and domainConcepts fields to be more discoverable.
```
