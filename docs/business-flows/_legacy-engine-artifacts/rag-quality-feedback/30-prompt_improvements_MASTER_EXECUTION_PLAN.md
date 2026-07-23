# FLOW-30 MASTER EXECUTION PLAN
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Date: 2026-03-01 | Status: READY FOR IMPLEMENTATION
---

## STARTING NUMBERS (FLOW-30)
```
Factory:         F1275    Family: 175
Task Type:       T445
BFA Rule:        CF-570
Stress Test:     ST-340
Skill:           SK-261
Design Decision: DD-265
Design Record:   DR-200
Template:        90
```

## ENDING NUMBERS (FLOW-30)
```
Factory:         F1297    Family: 180
Task Type:       T465
BFA Rule:        CF-594
Stress Test:     ST-354
Skill:           SK-270
Design Decision: DD-269
Design Record:   DR-202
Template:        92
```

## NEXT FLOW STARTS AT
```
Factory:         F1298    Family: 181
Task Type:       T466
BFA Rule:        CF-595
Stress Test:     ST-355
Skill:           SK-271
Design Decision: DD-270
Design Record:   DR-203
Template:        93
```

---

## WHAT FLOW-30 ADDS (SUMMARY)

| Artifact | Count | Range |
|----------|-------|-------|
| Factories | 23 | F1275–F1297 |
| Families | 6 | 175–180 |
| Task Types | 21 | T445–T465 |
| BFA Rules | 25 | CF-570–CF-594 |
| Stress Tests | 15 | ST-340–ST-354 |
| Skills | 10 | SK-261–SK-270 |
| Design Decisions | 5 | DD-265–DD-269 |
| Design Records | 3 | DR-200–DR-202 |
| Templates | 3 | 90–92 |

---

## PHASE PLAN

### PHASE 0 — Validate & Anchor (15 min)
Goal: Confirm starting numbers from RAG_INDEX_UPDATED.md. Confirm FLOW-25 ended at F1074/T508/CF-509.
Confirm FLOW-26–29 consumed F1075–F1274, T389–T444 (per session notes).
FLOW-30 starts: F1275 / T445 / CF-570 / SK-261 / Family 175 / Template 90.
Backward compat check: FLOW-30 is opt-in (promptOpsEnabled config flag). All existing flows default to false.
SAVE POINT: Numbers confirmed, backward compat strategy locked.

### PHASE 1 — Factory Registry (45 min)
Deliverable: ENGINE_ARCHITECTURE document (DONE — 30-prompt_improvements_ENGINE_ARCHITECTURE.md)
Content: 6 families (175–180), 23 factories (F1275–F1297)
  - Family 175: Prompt Asset Control Plane (F1275–F1279) → DATABASE FABRIC (ES)
  - Family 176: PromptOps RAG Meta-Memory (F1280–F1283) → RAG FABRIC + DATABASE FABRIC
  - Family 177: Prompt Optimization Engine (F1284–F1287) → AI ENGINE FABRIC
  - Family 178: Canary Promotion Pipeline (F1288–F1291) → QUEUE + DATABASE FABRIC
  - Family 179: PromptOps Observability (F1292–F1294) → DATABASE FABRIC
  - Family 180: Multi-Tenant Safety (F1295–F1297) → CORE + DATABASE FABRIC
Key design decisions: DD-265 through DD-269. ES index structure: DR-200.
VALIDATION: Every factory has fabric resolution declared. No factory imports provider directly.
STATUS: ✅ COMPLETE

### PHASE 2 — Task Types Catalog (60 min)
Deliverable: TASK_TYPES_CATALOG document (DONE — 30-prompt_improvements_TASK_TYPES_CATALOG.md)
Content: 21 task types (T445–T465), 3 templates (90–92)

Execution Path task types (Template 90):
  T445 — Prompt Version Selection Gate (ORCHESTRATION)
  T446 — Node Execution with Trace Capture (AI_GENERATION)
  T447 — Multi-Model Prompt Run (ORCHESTRATION)
  T448 — Judge Verdict Capture & Scoring (JUDGMENT)
  T449 — Prompt Improvement Trigger Gate (ORCHESTRATION)
  T462 — Prompt Policy Router (ORCHESTRATION)
  T463 — Prompt Metrics Snapshot (EVENT_PROCESSING)
  T464 — Prompt Audit Log Entry (EVENT_PROCESSING)
  T465 — Prompt Injection Guard (COMPLIANCE)

Optimization Sub-Flow task types (Template 91):
  T450 — Evidence Pack Retrieval
  T451 — Prompt Critique Sub-Flow
  T452 — Candidate Prompt Generation
  T453 — Candidate Evaluation on Eval Suite
  T454 — Promotion Decision Gate
  T455 — Canary Rollout Coordinator
  T456 — Production Promotion Gate
  T457 — Rollback Trigger

Supporting event task types (Template 90):
  T458 — PromptOps RAG Ingestion
  T459 — Eval Suite Harvest from Failure

Multi-Tenant task types (Template 92):
  T460 — Tenant Prompt Override Application
  T461 — Cross-Tenant Learning Aggregation

VALIDATION: Every task type has full engine contract format (no one-line stubs).
Every factory dependency declared with FABRIC RESOLUTION.
AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES all present.
STATUS: ✅ COMPLETE

### PHASE 3 — Skills Factory RAG (45 min)
Deliverable: SKILLS_FACTORY_RAG document (DONE — 30-prompt_improvements_SKILLS_FACTORY_RAG.md)
Content: 10 skills (SK-261–SK-270)

CORE promotion (required in all generated services):
  SK-261 — Prompt Version Asset Management (CQRS + Immutable Versioning)
  SK-265 — Canary Promotion Pipeline (Multi-Gate Gated Promotion)
  SK-267 — Multi-Tenant Prompt Safety (MACHINE/FREEDOM Guard)
  SK-268 — Prompt Injection Guard Pattern (Data/Instruction Separation)
  SK-270 — PromptOps Observability (Trace+Metrics+Audit)

INJECTED (engine generates as needed):
  SK-262 — PromptOps Hybrid RAG Retrieval
  SK-263 — Candidate Prompt Generation Pipeline
  SK-264 — Eval Suite Construction & Harvest
  SK-266 — Bandit-Based Prompt Routing
  SK-269 — TextGrad-Style Prompt Critique

VALIDATION: Each skill includes DNA compliance notes, iron rules, reuse guidance.
All code patterns use Dictionary<string,object>, DataProcessResult, fabric calls.
STATUS: ✅ COMPLETE

### PHASE 4 — BFA Rules & Stress Tests (45 min)
Deliverable: V62_BFA_STRESS_TEST document (DONE — 30-prompt_improvements_V62_BFA_STRESS_TEST.md)
Content: 25 BFA rules (CF-570–CF-594), 15 stress tests (ST-340–ST-354)

CRITICAL severity rules (9):
  CF-570 (RAG index isolation), CF-571 (single-judge promotion),
  CF-572 (version text mutation), CF-574 (audit log mutation),
  CF-575 (injection silent skip), CF-577 (PII in eval suite),
  CF-580 (MACHINE override), CF-581 (global auto-promotion),
  CF-582 (cross-tenant leakage), CF-594 (backward compat)

HIGH severity rules (11):
  CF-573, CF-576, CF-578, CF-583, CF-584, CF-585, CF-586, CF-587, CF-588, CF-590, CF-593

MEDIUM severity rules (4):
  CF-579, CF-589, CF-591, CF-592

Key stress tests:
  ST-340 — RAG isolation under 100-tenant concurrent load
  ST-343 — Cascade rollback under canary regression (30s SLA)
  ST-346 — Prompt injection in RAG content (100% detection required)
  ST-353 — End-to-end optimization cycle (happy path)
  ST-354 — Backward compatibility (FLOW-01–25 unaffected)

VALIDATION: Every CRITICAL rule has a corresponding stress test.
Detection method specified (Static or AI_SCAN). BUILD_FAILURE_CODE assigned.
STATUS: ✅ COMPLETE

### PHASE 5 — Unified Source Index (30 min)
Deliverable: UNIFIED_SOURCE_INDEX document (DONE — 30-prompt_improvements_UNIFIED_SOURCE_INDEX.md)
Content: Cross-reference tables for all FLOW-30 artifacts, dependency graph, fabric resolution map.
VALIDATION: Every factory appears in task type tables. Every BFA rule has a stress test mapped.
STATUS: ✅ COMPLETE

### PHASE 6 — Session State (20 min)
Deliverable: SESSION_STATE document (DONE — 30-prompt_improvements_SESSION_STATE.md)
Content: Current state tracker, merge instructions for main documents, recovery protocol.
STATUS: ✅ COMPLETE

### PHASE 7 — Master Execution Plan (this document)
Deliverable: MASTER_EXECUTION_PLAN document (this file)
STATUS: ✅ COMPLETE (in progress)

---

## FLOW DAG (JSON Template — for FlowOrchestrator Skill 09)

```json
{
  "flowId": "FLOW-30-PromptOps",
  "version": "1.0",
  "promptOpsEnabled": true,
  "description": "Self-Learning Prompt Optimization Engine",
  "templates": {
    "template-90": {
      "name": "Standard PromptOps Execution Wrapper",
      "steps": [
        { "stepId": "step-1", "taskType": "T445", "factory": "F1277,F1276,F1290", "nextOnSuccess": "step-2" },
        { "stepId": "step-2", "taskType": "T446", "factory": "F1292,F1281,F1276", "nextOnSuccess": "step-3" },
        { "stepId": "step-3", "taskType": "T448", "factory": "F1279,F1292,F1278", "nextOnSuccess": "step-4" },
        { "stepId": "step-4", "taskType": "T449", "factory": "F1277,F1288",
          "nextOnSuccess": "step-5", "nextOnTrigger": "template-91" },
        { "stepId": "step-5", "taskType": "T458", "factory": "F1280,F1281,F1278", "async": true },
        { "stepId": "step-6", "taskType": "T459", "factory": "F1282,F1283,F1292",
          "condition": "judgeScore < harvestThreshold", "async": true },
        { "stepId": "step-7", "taskType": "T463", "factory": "F1293,F1292", "scheduled": "*/15 * * * *" },
        { "stepId": "step-8", "taskType": "T464", "factory": "F1294", "onEvent": "any_state_transition" },
        { "stepId": "step-9", "taskType": "T465", "factory": "F1286,F1280", "beforeStep": "step-2" }
      ]
    },
    "template-91": {
      "name": "Optimization Sub-Flow",
      "trigger": "StartOptimizationFlow event from T449",
      "steps": [
        { "stepId": "opt-1", "taskType": "T450", "factory": "F1280,F1281,F1282", "nextOnSuccess": "opt-2" },
        { "stepId": "opt-2", "taskType": "T451", "factory": "F1284,F1279", "nextOnSuccess": "opt-3" },
        { "stepId": "opt-3", "taskType": "T452", "factory": "F1285,F1275,F1276,F1286", "nextOnSuccess": "opt-4" },
        { "stepId": "opt-4", "taskType": "T453", "factory": "F1283,F1287,F1282",
          "nextOnPass": "opt-5", "nextOnFail": "opt-reject" },
        { "stepId": "opt-5", "taskType": "T454", "factory": "F1286,F1289,F1279",
          "nextOnApproved": "opt-6", "nextOnMarginal": "opt-human-review" },
        { "stepId": "opt-6", "taskType": "T455", "factory": "F1288,F1293,F1290",
          "nextOnSuccess": "opt-7", "nextOnRegression": "opt-rollback" },
        { "stepId": "opt-7", "taskType": "T456", "factory": "F1276,F1289,F1294,F1290" },
        { "stepId": "opt-rollback", "taskType": "T457", "factory": "F1291,F1276,F1294" },
        { "stepId": "opt-reject", "taskType": "T464", "factory": "F1294", "note": "archive rejected candidate" }
      ]
    },
    "template-92": {
      "name": "Multi-Tenant PromptOps",
      "steps": [
        { "stepId": "mt-1", "taskType": "T460", "factory": "F1295,F1297,F1276" },
        { "stepId": "mt-2", "taskType": "T461", "factory": "F1296,F1280,F1284", "scheduled": "0 2 * * *" }
      ],
      "guard": { "taskType": "T465", "wraps": ["mt-2"] }
    }
  }
}
```

---

## MERGE INSTRUCTIONS (for main merged documents)

When merging FLOW-30 into the main document set:

### 1. ENGINE_ARCHITECTURE_MERGED.md
- Append Families 175–180 (F1275–F1297)
- Update FLOW registry: add FLOW-30 entry
- Update artifact counts: Factories → 1297 total, Families → 180

### 2. TASK_TYPES_CATALOG_MERGED.md
- Append T445–T465 (21 task types)
- Append Templates 90–92

### 3. SKILLS_FACTORY_RAG_MERGED.md
- Append SK-261–SK-270 (10 skills)

### 4. V62_BFA_STRESS_TEST_MERGED.md (or UNIFIED_SOURCE_INDEX)
- Append CF-570–CF-594 (25 rules)
- Append ST-340–ST-354 (15 tests)

### 5. UNIFIED_SOURCE_INDEX_MERGED.md
- Append FLOW-30 cross-reference tables
- Append design decisions DD-265–DD-269
- Append design records DR-200–DR-202

### 6. SESSION_STATE_MERGE.md (global tracker)
- Register FLOW-30 in flow registry
- Update ALL artifact counts
- Set NEXT AVAILABLE: F1298 / T466 / CF-595 / ST-355 / SK-271 / DD-270 / DR-203 / Template 93 / Family 181

---

## POST-MERGE GLOBAL ARTIFACT COUNTS

| Artifact | Pre-FLOW-30 | FLOW-30 Adds | Post-FLOW-30 |
|----------|-------------|--------------|--------------|
| Factories | ~1074 (F1–F1274 incl. FLOW-26–29) | 23 | ~1297 |
| Families | ~174 | 6 | ~180 |
| Task Types | ~508 (T1–T444 incl. FLOW-26–29) | 21 | ~529 |
| Templates | ~89 | 3 | ~92 |
| BFA Rules | ~569 | 25 | ~594 |
| Stress Tests | ~339 | 15 | ~354 |
| Skills | ~260 | 10 | ~270 |
| Design Decisions | ~264 | 5 | ~269 |
| Design Records | ~199 | 3 | ~202 |
| Flows Defined | 29 | 1 | 30 |

---

## DNA COMPLIANCE SUMMARY (FLOW-30)

All FLOW-30 generated services comply with all 9 DNA patterns:

| DNA | Pattern | How FLOW-30 complies |
|-----|---------|---------------------|
| DNA-1 | ParseDocument (Dictionary) | All prompt assets, traces, eval cases stored as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | Policy lookups, trace queries, eval case dedup — all skip empty fields |
| DNA-3 | DataProcessResult<T> | Every operation returns DataProcessResult — no thrown exceptions for business logic |
| DNA-4 | MicroserviceBase | All 6 FLOW-30 service families inherit MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | tenantId on every ES index operation; separate promptops_rag_{tenantId} per tenant |
| DNA-6 | DynamicController | No IPromptVersionController — DynamicController routes all prompt version endpoints |
| DNA-7 | Idempotency | traceId as idempotency key; Redis SETNX for optimization trigger dedup (CF-589) |
| DNA-8 | Outbox | Promotion events (CANARY_APPROVED, PROMOTED, ROLLED_BACK) via QUEUE FABRIC outbox |
| DNA-9 | (Extended) | Audit log is append-only (immutability enforcement — CF-574) |

---

## AF STATION MAPPING (FLOW-30)

How the AI pipeline generates and validates FLOW-30 services:

| AF Station | Role in FLOW-30 |
|-----------|----------------|
| AF-1 Genesis | Generates services for F1275–F1297 from engine contracts (T445–T465) |
| AF-2 Planning | Decomposes PromptOps optimization sub-flow into steps (Template 91) |
| AF-3 Prompt Library | Retrieves active prompt version via IPromptVersionService (F1276) for each node |
| AF-4 RAG Context | Retrieves similar failure evidence via IPromptOpsRagService (F1280) — hybrid vector+graph |
| AF-5 Multi-model | Runs Critic (T451) across Claude+GPT-4+Gemini in parallel via AiDispatcher |
| AF-6 Code Review | Reviews IPromptEditorService (F1285) candidate output for structural quality |
| AF-7 Compliance | IPromptGuardService (F1286) — validates no MACHINE violation, no schema break |
| AF-8 Security | IPromptGuardService injection scan (T465) — detects control-plane pattern injection |
| AF-9 Judge | ICandidateEvaluatorService (F1287) — eval suite delta scoring; promotion gate validation |
| AF-10 Merge | Merges multi-model critiques (T451) — union failureModes, intersect editRecommendations |
| AF-11 Feedback | Writes traces (T446), patches (T452), audit entries (T464), metrics (T463) |

---

## BACKWARD COMPATIBILITY CONTRACT

FLOW-30 is additive and opt-in. The engine behavior for FLOW-01–FLOW-29 is unchanged.

Activation: `promptOpsEnabled: true` in flow config (or per-node config).
Default: `false` for all existing flows and all new flows unless explicitly set.

What changes when promptOpsEnabled = false (default):
  - T445 (selection gate) does NOT fire — nodes use their existing prompt injection
  - T446 (trace capture) does NOT fire — no PromptOps traces written
  - All F1275–F1297 services are deployed but dormant
  - No performance impact on existing flows

What changes when promptOpsEnabled = true:
  - T445 wraps node execution → selects versioned prompt
  - T446 captures execution trace
  - T448 applies structured verdict
  - T449 conditionally triggers optimization sub-flow

BFA rule CF-594 enforces backward compat as a BUILD FAILURE check in CI.
ST-354 validates behavioral equivalence for all 25 existing flows.

