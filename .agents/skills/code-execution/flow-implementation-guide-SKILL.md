# Flow Implementation Guide Skill v1.0
## How to plan, implement, test, and validate ANY XIIGen flow
## References: data-connection-classification, flow-prerequisites
---
name: flow-implementation-guide
version: "1.0.0"
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

  afStations: [
    { stationId: 'AF-1', role: 'generate', config: {} },
    { stationId: 'AF-9', role: 'judge', config: {} },
  ],

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
// Submit contract to AF pipeline via FlowGenerator
const engineContract = new EngineContract(contractParams);
const result = await engine.generate(engineContract, testTenantId);

// Capture and report
const report = {
  taskType: 'T???',
  isSuccess: result.isSuccess,
  score: result.data?.pipelineMetadata?.['score'] ?? 0,
  runId: result.data?.pipelineMetadata?.['artifact_id'] ?? null,
  elapsedMs: result.data?.elapsedMs,
  generatedCode: result.data?.generatedCode,
  errors: result.isSuccess ? [] : [result.errorMessage],
};

// Note: modelPreferenceTracker.record() and projectTracker.updateCardStatus()
// were removed in the S3 refactor. Use the run trace and DataProcessResult directly.
// GET /api/runs/:runId/trace to inspect the 8-node pipeline execution.
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
  - Run trace entries: did the pipeline score improve vs prior run?
  - Prompt versions: any evolutions triggered via PromptOps?
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

V5: SOURCE CONTROL
  - git status clean (no uncommitted changes)
  - All phase code committed to feature branch
  - cd server && npx jest >= baseline (no regressions)
  - cd client && npx jest >= baseline (no regressions)
  - PASS if: clean git AND tests pass

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
    "V8_rag_integrity": {"status": "PASS|FAIL", "details": "..."}
  },
  "all_pass": true,
  "blockers": [],
  "next_phase_unlocked": true
}
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
- 5+ AF-9 judgments completed → run traces exist → score patterns visible → model selection semi-autonomous
- 10+ successful generations → PromptOps has failure patterns → prompt improvement autonomous via PUT /api/prompts
- 20+ benchmark runs → RAG patterns indexed → retrieval strategy learned
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

## Phase B pre-step: Difficulty prediction (automated after SESSION-P-4)

Before Phase B begins, the engine queries the RAG for archetype occurrence count
and computes a cycle budget. This replaces the manual cycle prediction in flow plans.

`DifficultyPredictorService.predict({ taskTypeId, archetype, ironRules })` returns:
- `cycleBudget: 1 | 2 | 3` — how many AF generation cycles to budget
- `noveltyFactors: string[]` — what triggered the novelty score
- `noveltyScore: number` — raw score (0 = well-known, 3+ = very novel)

Novelty scoring:
- Archetype never seen before in RAG ARCH_PATTERN docs → +2
- Many new iron rules (>2) + few prior patterns (<2) → +1
- No existing arch pattern for this specific task type → +1

State.json gains: `taskTypeCycleBudgets: { T59: 1, T60: 3, T61: 2, T62: 2 }`

The adaptation map is still human-authored — difficulty prediction only sets the
budget (how many cycles to run), not the fix strategy (what to patch on cycle 2).

## Phase B Stage 2: Concept-based named checks

Provider-keyed checks evaluate conditions using named concept paths rather than
raw field checks. The `evaluateCondition()` method in `GenericNodeExecutor` supports:
- Dot-path resolution: `context.score >= 0.80`
- Comparison operators: `==`, `!=`, `>`, `>=`, `<`, `<=`
- Truthy checks: `context.generated` (just a dot-path with no operator)

No `eval()` — all evaluation is safe string parsing. Max context accumulation
is capped at 10 entries per loop body to prevent unbounded growth (CF-814).

---

## ONE-LINE SUMMARY

> **Verify infrastructure → claim numbers → classify data → write contracts →
> define prompts → submit to pipeline → validate 8 dimensions → report results.**
