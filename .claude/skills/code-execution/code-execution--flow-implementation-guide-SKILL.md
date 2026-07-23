# Flow Implementation Guide Skill v1.0
## How to plan, implement, test, and validate ANY XIIGen flow
## References: data-connection-classification, flow-prerequisites
---
name: flow-implementation-guide
version: "2.0.0"
description: >
  The master skill for implementing any new flow through the XIIGen AF pipeline.
  Covers: how to decompose a goal into EngineContracts, how to define prompts
  for each AF node, how to test each phase, how to validate all 8 dimensions,
  and how to classify every document for export/import. This is what Claude Code
  loads before starting any flow implementation.
author: luba
updated: "2026-03-19"
priority: SUPREME
triggers:
  - "implement flow"
  - "new flow"
  - "plan implementation"
  - "execute flow"
---

## Skill Loading Order

```
1. data-connection-classification  ← What type is each document?
2. flow-prerequisites              ← Is infrastructure ready?
3. flow-implementation-guide       ← THIS SKILL: how to implement
4. xiigen-core-principles          ← P1-P8 compliance check
5. plan-review-skill               ← FC-1 through FC-15 consistency
```

---

## THE 7-STEP FLOW IMPLEMENTATION PROTOCOL

Every flow follows these 7 steps. No exceptions. No shortcuts.

---

### STEP 1: VERIFY PREREQUISITES

Before writing any code, run the flow-prerequisites verification gate.
If ANY Tier 1 prerequisite fails, stop and fix infrastructure first.

```bash
# Run prerequisite gate (from flow-prerequisites skill)
curl localhost:9200/xiigen-rag-patterns/_mapping | jq '.xiigen-rag-patterns.mappings.properties.connectionType'
curl localhost:9200/xiigen-prompts/_mapping | jq '.xiigen-prompts.mappings.properties.connectionType'
cd server && npx jest --testPathPattern="project-tracker" --verbose
cd server && npx jest --verbose  # baseline >= 2,342
cd client && npx jest --verbose  # baseline >= 220
```

**Output:** Prerequisite gate PASS or FAIL + which prerequisites are missing.

---

### STEP 2: CLAIM ARTIFACT NUMBERS

**Read from 5 canonical docs — NEVER from memory.**

```bash
# Highest factory
grep -oE "F1[0-9]{3}" ENGINE_ARCHITECTURE_MERGED.md | sort -t'F' -k1 -n | tail -1
# Highest task type
grep -oE "T[0-9]{3}" TASK_TYPES_CATALOG_MERGED.md | sort -t'T' -k1 -n | tail -1
# Highest CF rule
grep -oE "CF-[0-9]+" V62_BFA_STRESS_TEST_MERGED.md | sort -t'-' -k2 -n | tail -1
# Highest skill
grep -oE "SK-[0-9]+" SKILLS_FACTORY_RAG_MERGED.md | sort -t'-' -k2 -n | tail -1
# Highest DR
grep -oE "DR-[0-9]+" ENGINE_ARCHITECTURE_MERGED.md | sort -t'-' -k2 -n | tail -1
# Highest ST
grep -oE "ST-[0-9]+" V62_BFA_STRESS_TEST_MERGED.md | sort -t'-' -k2 -n | tail -1
```

**Your flow starts at highest + 1 for each artifact type.**

Document in STATE.json:
```json
{
  "flow_starts_at": {
    "factory": "F????",
    "task_type": "T???",
    "bfa_rule": "CF-???",
    "verified_from": ["file:line for each number"]
  }
}
```

---

### STEP 3: CLASSIFY EVERY DOCUMENT

Before designing any factory or service, list every document type the flow creates
and classify it using data-connection-classification:

```markdown
| Document | connectionType | tenantId | flowId | Exports? | PII fields |
|----------|---------------|----------|--------|----------|------------|
| Factory patterns | FLOW_SCOPED | "" | FLOW-XX | Yes | None |
| Task contracts | FLOW_SCOPED | "" | FLOW-XX | Yes | None |
| Default prompts | FLOW_SCOPED | "" | FLOW-XX | Yes | None |
| BFA rules | FLOW_SCOPED | "" | FLOW-XX | Yes | None |
| User results | TENANT_PRIVATE | {tenantId} | - | No | tenantId, scores |
| Training data | TENANT_PRIVATE | {tenantId} | - | No | tenantId, code |
| Shared prompts | TENANT_EXPORTABLE | {tenantId} | - | With consent | tenantId |
```

**Iron rule:** If you can't fill this table, the flow design is incomplete.

---

### STEP 4: CREATE ENGINE CONTRACTS

For each task type the flow needs, create an EngineContract following
`server/src/engine-contracts/contract-schema.ts`.

**Required fields (from codebase):**
```typescript
new EngineContract({
  taskTypeId: 'T???',
  name: 'Descriptive Name',
  archetype: ContractArchetype.DATA_PIPELINE,  // or ORCHESTRATION, INTELLIGENCE, etc.
  entry: 'What triggers this task',
  purpose: 'What AF-1 generates',
  distinctFrom: 'Similar task types it could be confused with',
  familyId: 'Family-???',

  factoryDependencies: [
    { factoryId: 'F???', interfaceName: 'IServiceName',
      fabricType: FabricType.DATABASE, description: '...' }
  ],

  afConfiguration: {
    af1Genesis: 'What to generate',
    af3PromptLibrary: 'Which prompts to retrieve',
    af4RagContext: 'What patterns to search for',
    af6CodeReview: 'What to check',
    af7Compliance: 'DNA + principle checks',
    af9Judge: 'Scoring criteria + threshold',
    af11Feedback: 'What to capture',
  },

  ironRules: ['Non-negotiable constraints'],
  qualityGates: ['Specific test commands'],

  // NEW: data connection classification
  connectionType: 'FLOW_SCOPED',
  flowId: 'FLOW-XX',
  flowVersion: '1.0.0',
})
```

**Register in task-type-registry.ts.**

---

### STEP 5: DEFINE AF PROMPTS

For each task type, create 4 prompts (P22 standard):

| Role | AF Station | What It Does | connectionType |
|------|-----------|-------------|----------------|
| `genesis` | AF-1 | The main code generation instruction | FLOW_SCOPED |
| `review` | AF-6 | Code review criteria | FLOW_SCOPED |
| `compliance` | AF-7 | DNA + P1-P8 validation rules | FLOW_SCOPED |
| `judge` | AF-9 | 5-component scoring + iron rules | FLOW_SCOPED |

**Prompt structure:**
```typescript
{
  promptId: `{flowDomain}::T{N}::{role}`,
  domainId: '{flowDomain}',
  taskType: 'T{N}',
  role: '{role}',
  tenantId: '',              // FLOW_SCOPED = empty tenantId
  connectionType: 'FLOW_SCOPED',
  flowId: 'FLOW-XX',
  content: '...',            // The actual prompt text
  version: 1,
  isDefault: true,
  isActive: true,
}
```

**Genesis prompt MUST include:**
- Positive example (what correct output looks like)
- Negative example (what violations look like)
- DNA rules adapted for target language
- All iron rules from the EngineContract
- RAG context injection point (`{RAG_PATTERNS}` placeholder)

**Seed to xiigen-prompts index (ES) AND register in AF-3 in-memory map.**

---

### STEP 6: SUBMIT TO AF PIPELINE AND CAPTURE RESULTS

```typescript
// Submit contract to AF pipeline
const result = await afPipeline.run({
  tenantId: '{testTenantId}',
  taskType: 'T???',
  spec: contract.toDict(),
});

// Capture and report
const report = {
  taskType: 'T???',
  passed: result.passed,
  score: result.judgment?.score ?? 0,
  promotionLevel: result.promotionLevel,
  stages: result.stages.map(s => ({
    stage: s.stage,
    success: s.success,
    elapsedMs: s.elapsedMs,
  })),
  errors: result.errors,
  warnings: result.warnings,
};

// Record in learning module
await modelPreferenceTracker.record({
  modelId: result.stages.find(s => s.stage === 'SYNTHESIS')?.details?.model ?? 'unknown',
  taskType: 'T???',
  score: result.judgment?.score ?? 0,
  passed: result.passed,
  recordedAt: Date.now(),
});

// Record in project tracker
await projectTracker.updateCardStatus({
  cardId: phaseCardId,
  status: result.passed ? 'done' : 'blocked',
  tenantId: testTenantId,
});
```

---

### STEP 7: VALIDATE (8 dimensions after every phase)

After each phase, run ALL 8 validation checks:

```
V1: CODE QUALITY
  - Re-run AF-9 on all generated artifacts from this phase
  - python -m py_compile / npx tsc --noEmit on generated code
  - Check P1-P8 compliance via grep (tenantId, connectionType, etc.)
  - PASS if: AF-9 score >= 70 AND zero compilation errors AND P1-P8 present

V2: LEARNING PROGRESS
  - Compare arbiter state: now vs previous phase
  - ModelPreference entries: count increased?
  - Prompt versions: any evolutions triggered?
  - PASS if: at least one metric improved OR this is Phase A (no baseline)

V3: OBSERVABILITY
  - Query AF-11 feedback store for this phase's runs
  - Every AF station (1,3,4,6,7,9,11) must have at least one trace
  - Trace IDs link across stations (same runId)
  - PASS if: all expected stations have traces AND traces are correlated

V4: DOCUMENTATION
  - DR entries created (if this phase specifies them)?
  - CHANGELOG updated?
  - STATE.json reflects current phase state?
  - PASS if: all specified docs exist AND STATE.json is current

V5: SOURCE CONTROL (P19 — absolute gate, not delta)
  - git status clean (no uncommitted changes)
  - All phase code committed to feature branch
  - cd server && npx jest 2>&1 | tail -3  # failures must === 0, not "no new failures"
  - cd client && npx jest 2>&1 | tail -3  # failures must === 0
  - PASS if: clean git AND failures === 0 AND each skip has documented justification
  V5-B: If any pre-existing failures observed during this session:
    → Fix them in this session, OR
    → Escalate to Luba with root cause (ISSUE INVENTORY entry required)
    → "Pre-existing — not introduced by this session" is NOT a disposition (P19/M4)

V6: PROJECT TRACKING
  - Phase card exists in project tracker
  - Card status updated to "done" or "blocked"
  - Time logged (from phase elapsed time)
  - Linked to flow epic
  - PASS if: card exists AND status updated

V7: TESTABILITY
  - Replay primary task type with:
    (a) Different model (mock vs real, or different real model)
    (b) Different tenantId (verify isolation)
    (c) Mock AI provider (verify framework works without API keys)
  - PASS if: all 3 replays produce valid output (quality may differ)

V8: RAG INTEGRITY
  - Query xiigen-rag-patterns for this flow's documents
  - Check connectionType distribution (FLOW_SCOPED vs TENANT_PRIVATE)
  - Check 4 concerns covered: code patterns, orchestration, arbitration, skills
  - Retrieval test: 3 queries return relevant results from this flow
  - PASS if: patterns exist AND connectionTypes correct AND retrieval works

V9: LOCAL TEACHING HEALTH (C-2 fix: NEVER skip — FLOW-39 refines, not creates)
  Run at: end of Phase B gate, Phase D gate, Phase E gate
  FLOW-39 assigns curriculumTier automatically when active. When NOT active:
    assign curriculumTier manually, create SHADOW_RUN placeholder, extract 1-3
    DISTILLED_RULE entries manually from passing cycles. V9 does NOT skip.

  V9-001: distilled-rule-count-increased
    Severity: WARNING (not BUILD_FAILURE when FLOW-39 not active)
    Check: DISTILLED_RULE count in xiigen-distilled-rules for this flowId
           is greater than the pre-phase baseline recorded in STATE.json
    Interim (FLOW-39 not active): extract 1-3 rules manually from cycle summaries,
    seed to xiigen-distilled-rules via POST. Record count in STATE.json.
    Fail message: "No DISTILLED_RULE this phase — extract manually if FLOW-39 inactive"

  V9-002: dpo-triple-has-chosen-code AND cross-model provenance (P17)
    Severity: BUILD_FAILURE — blocks phase completion
    Check: All DPO triples for this flowId have:
      (a) non-null chosen.code field
      (b) chosen.model != rejected.model (different families)
    Fail message: "DPO triple missing chosen.code or same-model provenance (P17/GAP-08)"

  V9-003: curriculumTier non-null on every triple (P18)
    Severity: BUILD_FAILURE — blocks phase completion
    Check: All DPO triples for this flowId have curriculumTier in [1,2,3,4,5]
    Assignment: T47=ROUTING=1, T48=SCHEDULED=5, T49=ORCHESTRATION=4 (inline, not referenced)
    Fail message: "curriculumTier null — FLOW-39 cannot build curriculum from null-tier triples"

  V9-004: shadow-run-placeholder-created (P21)
    Severity: WARNING — must be visible but does not block
    Check: xiigen-shadow-runs has a record for each task type in this flow
    If ossKey absent: create placeholder { gapScore:null, shadowStatus:'PENDING_LOCAL_MODEL' }
    Fail message: "No shadow run record — independence timeline unknown (P21)"

  Run command:
  ```bash
  # V9-002: cross-model check
  curl -sf localhost:9200/xiigen-training-data/_search \
    -d '{"query":{"term":{"flowId.keyword":"FLOW-XX"}}}' \
    | jq "[.hits.hits[]._source | select(.chosen.model == .rejected.model) | .taskTypeId]"
  # Expected: [] (empty — all triples are cross-model)

  # V9-003: curriculumTier check
  curl -sf localhost:9200/xiigen-training-data/_search \
    -d '{"query":{"bool":{"must":[{"term":{"flowId.keyword":"FLOW-XX"}},{"bool":{"must_not":{"range":{"curriculumTier":{"gte":1}}}}}]}}}'  \
    | jq ".hits.total.value"
  # Expected: 0 (no null-tier triples)
  ```

V10: MISSION PROGRESS (M5/P22 — always runs, never skips)
  Run at: every ⛔ STOP (every phase, every session type)
  Load SK-445 (session-output--mission-progress-SKILL.md) before producing PHASE-COMPLETE

  V10-001: teaching-data-produced
    Severity: WARNING (not BUILD_FAILURE — Phase A legitimately produces 0 triples)
    Check: at least one structurally valid DPO triple this phase
           (cross-model + curriculumTier set + teachingPoint + prompt.system non-null)
    Fail message: "This phase produced code but ZERO valid teaching triples.
                  Engine did not learn. State explicitly in ENGINE PROGRESS."

  V10-002: learning-rag-updated
    Severity: WARNING
    Check: at least one positive or negative RAG pattern example added this phase
    Interim (FLOW-38 not active): manually update qualityScore on any retrieved
    pattern that proved useful this phase.
    Fail message: "No RAG update. Generation results not feeding back into context."

  V10-003: graduation-progress-recorded
    Severity: BUILD_FAILURE — blocks ⛔ STOP
    Check: STATE.json contains graduation_progress with:
           { validTripleCount, tierCoverage, estimatedSessionsRemaining }
    Fail message: "Graduation progress not in STATE.json — Luba has no visibility (P21)"

V11: SHADOW RUN HEALTH (P21 — always runs, never skips)
  Run at: Phase B completion

  V11-001: shadow-run-attempted
    Severity: WARNING (not BUILD_FAILURE — OSS key may be absent)
    Check: xiigen-shadow-runs contains a record for each task type in this flow
    If absent: create placeholder { gapScore:null, shadowStatus:'PENDING_LOCAL_MODEL' }
    Fail message: "No shadow run — independence timeline unknown for this archetype tier"

  V11-002: curriculum-tier-assigned
    Severity: BUILD_FAILURE
    Check: all DPO triples for this flow have curriculumTier in [1,2,3,4,5]
    Same as V9-003 — duplicate check intentional for defense in depth
    Fail message: "curriculumTier null — curriculum is corrupted from triple one"
```

**Report format:**
```json
{
  "phase": "X",
  "validation": {
    "V1_code_quality": {"status": "PASS|FAIL", "details": "..."},
    "V2_learning":     {"status": "PASS|FAIL", "details": "..."},
    "V3_observability": {"status": "PASS|FAIL", "details": "..."},
    "V4_documentation": {"status": "PASS|FAIL", "details": "..."},
    "V5_source_control": {"status": "PASS|FAIL", "details": "..."},
    "V6_project_tracking": {"status": "PASS|FAIL", "details": "..."},
    "V7_testability":  {"status": "PASS|FAIL", "details": "..."},
    "V8_rag_integrity": {"status": "PASS|FAIL", "details": "..."},
    "V9_local_teaching": {"status": "PASS|FAIL", "details": "..."},
    "V10_mission_progress": {"status": "PASS|FAIL|WARNING", "details": "..."},
    "V11_shadow_run": {"status": "PASS|FAIL|WARNING", "details": "..."},
    "V12_node_representation": {"status": "PASS|FAIL|MANUAL", "details": "..."}
  },
  "all_pass": true,
  "blockers": [],
  "next_phase_unlocked": true
}
```

V12: NODE REPRESENTATION INTEGRITY (S-1 — from PATCH--flow-implementation-guide-V10-PhaseF.md)
  convergence.handler (Task 7) automates this check when active.
  Until active: perform manually using the checklist below — DO NOT SKIP.
  Phase B generation from an incomplete NODE causes wrong stack assumptions
  and 3+ extra correction cycles.
  Run at: Phase A completion

  V12-001: node-has-all-properties
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

  V12-002: node-seeded-to-rag
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

  V12-003: stack-profiles-complete
    Severity: SCORE-0 (warning, not build failure)
    Check: each NODE has at least 2 stack profiles
           (primary + at least one alternative)
    Fail: "Single-stack NODE — multi-stack portability not verified"
    Note: acceptable when the capability is genuinely single-stack by design
          (document the reason in node.intent.domainConcepts)
```

---

## AUTONOMY GRADIENT

As the engine executes more flows, it earns more autonomy:

| Phase | Autonomy | What Claude Code Does | What Engine Does |
|-------|----------|----------------------|-----------------|
| First flow, Phase A | 0% | Everything: write contracts, prompts, submit, validate | Nothing — just executes what it's told |
| First flow, Phase B | ~30% | Provides contracts + prompts | AF-6 selects model, AF-9 judges |
| First flow, Phase C | ~70% | Sets goals + constraints | Engine generates, judges, selects, learns |
| Second flow onward | ~90% | Approves at gates | Engine plans families, selects models, generates, validates |

**How the engine earns trust:**
- 5+ AF-9 judgments completed → ModelPreference data exists → model selection semi-autonomous
- 10+ successful generations → PromptEvolver has failure patterns → prompt improvement autonomous
- 20+ benchmark runs → RAG quality tracker has data → retrieval strategy learned
- 50+ total runs → full autonomy for similar task types, human approval only for novel tasks

---

## FLOW PLANNING TEMPLATE

When planning a new flow, fill in this template:

```markdown
## FLOW-XX: [Name]

### Goal
[One sentence: what does this flow produce?]

### Prerequisites
[Which flow-prerequisites Tier 1 items are needed? All? Subset?]

### Document Classification
| Document | connectionType | Exports? |
|----------|---------------|----------|
| ... | FLOW_SCOPED / TENANT_PRIVATE / TENANT_EXPORTABLE | Yes/No |

### Task Types
| T-ID | Name | Archetype | What AF-1 Generates |
|------|------|-----------|---------------------|
| T??? | ... | DATA_PIPELINE / INTELLIGENCE / ORCHESTRATION | ... |

### AF Prompt Strategy
| Task Type | Genesis Prompt Summary | Model Tier |
|-----------|----------------------|------------|
| T??? | "Generate a service that..." | LOCAL_LARGE / PAID_LARGE |

### Phases
| Phase | Autonomy | What's Done | Expected AF-9 Score Range |
|-------|----------|-------------|--------------------------|
| A | 0% (inject) | ... | 40-70 (first attempt) |
| B | 30% | ... | 60-80 (improved prompts) |
| C | 70% | ... | 70-90 (model selection learned) |

### Validation Criteria
[Which of the 8 dimensions matter most for this flow?]

### Export/Import
[Which documents travel with this flow as a template? Dependencies?]
```

---

## ANTI-PATTERNS

| Anti-Pattern | What Goes Wrong |
|-------------|----------------|
| Skip Step 1 (prerequisites) | ES index missing → first write crashes |
| Skip Step 2 (claim numbers) | Artifact collision with existing flows |
| Skip Step 3 (classify data) | Tenant data leaks on export |
| Write code directly instead of EngineContract | Bypasses AF pipeline — no judgment, no learning |
| Hardcode prompts in AF stations | No PromptOps improvement possible |
| Skip V6 (project tracking) | No audit trail of what was done |
| Skip V8 (RAG integrity) | Future flows can't find this flow's patterns |
| Assume autonomy before earning it | Engine makes bad decisions without data |

---

## ONE-LINE SUMMARY

> **Verify infrastructure → claim numbers → classify data → write contracts →
> define prompts → submit to pipeline → validate 8 dimensions → report results.**
