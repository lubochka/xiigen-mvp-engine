# FLOW-30 UNIFIED SOURCE INDEX
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Date: 2026-03-01

---

## ARTIFACT CROSS-REFERENCE

### FACTORIES (F1275–F1297)

| ID | Interface | Family | Task Types Using | Skills | BFA Rules |
|----|-----------|--------|-----------------|--------|-----------|
| F1275 | IPromptTemplateService | 175 | T452, T460 | SK-261, SK-267 | CF-572, CF-580 |
| F1276 | IPromptVersionService | 175 | T445, T446, T452, T456, T457, T460 | SK-261, SK-265 | CF-572, CF-573, CF-587 |
| F1277 | IPromptPolicyService | 175 | T445, T449 | SK-261 | CF-579 |
| F1278 | IPromptPatchService | 175 | T448, T452, T458 | SK-261, SK-263 | CF-573 |
| F1279 | IJudgeRubricService | 175 | T448, T451, T454 | SK-269 | CF-593 |
| F1280 | IPromptOpsRagService | 176 | T450, T458, T461, T465 | SK-262, SK-268 | CF-570, CF-576 |
| F1281 | ITraceIndexService | 176 | T446, T458 | SK-262, SK-270 | CF-570 |
| F1282 | IEvalCaseService | 176 | T450, T453, T459 | SK-264 | CF-577, CF-584 |
| F1283 | IEvalSuiteService | 176 | T453, T459 | SK-264 | CF-584 |
| F1284 | IPromptCriticService | 177 | T447, T451, T461 | SK-263, SK-269 | CF-590 |
| F1285 | IPromptEditorService | 177 | T452 | SK-263 | CF-572 |
| F1286 | IPromptGuardService | 177 | T452, T454, T460, T465 | SK-263, SK-268 | CF-575, CF-576, CF-580 |
| F1287 | ICandidateEvaluatorService | 177 | T453 | SK-264 | CF-584, CF-593 |
| F1288 | ICanaryAssignmentService | 178 | T449, T455 | SK-265 | CF-583, CF-585 |
| F1289 | IPromotionDecisionService | 178 | T454, T456 | SK-265 | CF-571 |
| F1290 | IPromptRoutingService | 178 | T445, T455, T456, T462 | SK-266 | CF-578, CF-579 |
| F1291 | IRollbackService | 178 | T457 | SK-265 | CF-586, CF-587 |
| F1292 | IPromptTraceService | 179 | T446, T448, T459, T463 | SK-270 | CF-588, CF-591 |
| F1293 | IPromptMetricsService | 179 | T455, T462, T463 | SK-266, SK-270 | CF-592 |
| F1294 | IPromptAuditService | 179 | T456, T457, T464 | SK-270 | CF-574 |
| F1295 | ITenantPromptProfileService | 180 | T460 | SK-267 | CF-580 |
| F1296 | ICrossTenantLearningService | 180 | T461 | SK-267 | CF-581, CF-582 |
| F1297 | IPromptScopeGuardService | 180 | T460 | SK-267 | CF-580 |

---

### TASK TYPES (T445–T465)

| ID | Name | Archetype | Factories | Template | BFA Checks |
|----|------|-----------|-----------|----------|-----------|
| T445 | Prompt Version Selection Gate | ORCHESTRATION | F1276, F1277, F1290 | 90 | CF-579, CF-594 |
| T446 | Node Execution with Trace Capture | AI_GENERATION | F1292, F1281, F1276 | 90 | CF-588, CF-591 |
| T447 | Multi-Model Prompt Run | ORCHESTRATION | F1276, F1284, F1292 | 90 | CF-570 |
| T448 | Judge Verdict Capture & Scoring | JUDGMENT | F1279, F1292, F1278 | 90 | CF-593 |
| T449 | Prompt Improvement Trigger Gate | ORCHESTRATION | F1277, F1288 | 90 | CF-589 |
| T450 | Evidence Pack Retrieval | ORCHESTRATION | F1280, F1281, F1282 | 91 | CF-570 |
| T451 | Prompt Critique Sub-Flow | AI_GENERATION | F1284, F1279 | 91 | CF-590, CF-591 |
| T452 | Candidate Prompt Generation | AI_GENERATION | F1285, F1275, F1276, F1286 | 91 | CF-572, CF-573 |
| T453 | Candidate Evaluation on Eval Suite | JUDGMENT | F1283, F1287, F1282 | 91 | CF-584, CF-593 |
| T454 | Promotion Decision Gate | ORCHESTRATION | F1286, F1289, F1279 | 91 | CF-571 |
| T455 | Canary Rollout Coordinator | ORCHESTRATION | F1288, F1293, F1290 | 91 | CF-583, CF-585 |
| T456 | Production Promotion Gate | ORCHESTRATION | F1276, F1289, F1294, F1290 | 91 | CF-571 |
| T457 | Rollback Trigger | EVENT_PROCESSING | F1291, F1276, F1294 | 91 | CF-586, CF-587 |
| T458 | PromptOps RAG Ingestion | EVENT_PROCESSING | F1280, F1281, F1278 | 90 | CF-570 |
| T459 | Eval Suite Harvest from Failure | EVENT_PROCESSING | F1282, F1283, F1292 | 90 | CF-577 |
| T460 | Tenant Prompt Override Application | ORCHESTRATION | F1295, F1297, F1276 | 92 | CF-580 |
| T461 | Cross-Tenant Learning Aggregation | AI_GENERATION | F1296, F1280, F1284 | 92 | CF-581, CF-582 |
| T462 | Prompt Policy Router | ORCHESTRATION | F1290, F1293 | 90 | CF-578, CF-579 |
| T463 | Prompt Metrics Snapshot | EVENT_PROCESSING | F1293, F1292 | 90 | CF-592 |
| T464 | Prompt Audit Log Entry | EVENT_PROCESSING | F1294 | 90 | CF-574 |
| T465 | Prompt Injection Guard | COMPLIANCE | F1286, F1280 | 90 | CF-575, CF-576 |

---

### SKILLS (SK-261–SK-270)

| ID | Name | Level | Task Types | Factories | BFA Enforced |
|----|------|-------|-----------|-----------|-------------|
| SK-261 | Prompt Version Asset Management | CORE | T445, T446, T452, T456 | F1275, F1276, F1277 | CF-572, CF-573 |
| SK-262 | PromptOps Hybrid RAG Retrieval | INJECTED | T450, T458 | F1280, F1281 | CF-570 |
| SK-263 | Candidate Prompt Generation Pipeline | INJECTED | T451, T452 | F1284, F1285, F1286 | CF-590 |
| SK-264 | Eval Suite Construction & Harvest | INJECTED | T453, T459 | F1282, F1283, F1287 | CF-577, CF-584 |
| SK-265 | Canary Promotion Pipeline | CORE | T454, T455, T456, T457 | F1288, F1289, F1291 | CF-571, CF-583, CF-586, CF-587 |
| SK-266 | Bandit-Based Prompt Routing | INJECTED | T445, T462 | F1290, F1293 | CF-578, CF-579 |
| SK-267 | Multi-Tenant Prompt Safety | CORE | T460, T461 | F1295, F1296, F1297 | CF-580, CF-581, CF-582 |
| SK-268 | Prompt Injection Guard Pattern | CORE | T465 | F1286, F1280 | CF-575, CF-576 |
| SK-269 | TextGrad-Style Prompt Critique | INJECTED | T451 | F1284, F1279 | CF-590, CF-591 |
| SK-270 | PromptOps Observability | CORE | T446, T448, T456, T463, T464 | F1292, F1293, F1294 | CF-574, CF-592 |

---

### BFA RULES (CF-570–CF-594)

| ID | Severity | Applies To | Stress Test |
|----|----------|-----------|-------------|
| CF-570 | CRITICAL | RAG index isolation | ST-340 |
| CF-571 | CRITICAL | Single-judge promotion | ST-341 |
| CF-572 | CRITICAL | Version text mutation | ST-342 |
| CF-573 | HIGH | Missing lineage | ST-342 |
| CF-574 | CRITICAL | Audit log mutation | ST-352 |
| CF-575 | CRITICAL | Injection silent skip | ST-346 |
| CF-576 | HIGH | Raw chunk injection | ST-346 |
| CF-577 | CRITICAL | PII in eval suite | ST-344 |
| CF-578 | HIGH | Variant cap | ST-345 |
| CF-579 | MEDIUM | Exploration rate cap | ST-345 |
| CF-580 | CRITICAL | MACHINE override | ST-348 |
| CF-581 | CRITICAL | Global auto-promotion | ST-347 |
| CF-582 | CRITICAL | Cross-tenant leakage | ST-347 |
| CF-583 | HIGH | Non-deterministic canary | ST-351 |
| CF-584 | HIGH | Insufficient eval evidence | ST-344 |
| CF-585 | HIGH | Unsafe canary rollout | ST-343 |
| CF-586 | HIGH | Rollback timeout | ST-343 |
| CF-587 | HIGH | Failed candidate deletion | ST-343 |
| CF-588 | HIGH | Missing trace | ST-350 |
| CF-589 | MEDIUM | Duplicate optimization | ST-350 |
| CF-590 | HIGH | Unstructured critique | ST-353 |
| CF-591 | MEDIUM | Missing context efficiency | ST-353 |
| CF-592 | MEDIUM | Unbounded metrics query | ST-353 |
| CF-593 | HIGH | Rubric version mismatch | ST-353 |
| CF-594 | CRITICAL | Backward compat break | ST-354 |

---

### DESIGN DECISIONS (DD-265–DD-269)

| ID | Title | Affects |
|----|-------|---------|
| DD-265 | PromptOps RAG must be separate from Operational RAG | F1280, CF-570, SK-262 |
| DD-266 | Promotion requires multi-gate (not single judge) | F1289, CF-571, SK-265 |
| DD-267 | Prompt Versions are immutable after creation | F1276, CF-572, SK-261 |
| DD-268 | Bandit routing for explore/exploit (cap: 3 variants) | F1290, CF-578, SK-266 |
| DD-269 | Cross-tenant learning requires non-sensitive gate | F1296, CF-582, SK-267 |

---

### DESIGN RECORDS (DR-200–DR-202)

| ID | Title | Affects |
|----|-------|---------|
| DR-200 | ES Index Structure for FLOW-30 | All F1275–F1297 |
| DR-201 | Optimization Sub-Flow Trigger Conditions | T449, CF-589 |
| DR-202 | Backward Compatibility Contract | CF-594, All FLOW-01–FLOW-29 |

---

### TEMPLATES (90–92)

| ID | Name | Task Types |
|----|------|-----------|
| 90 | Standard PromptOps Execution Wrapper | T445→T446→T448→T449 (+ T462, T463, T464, T465) |
| 91 | Optimization Sub-Flow | T450→T451→T452→T453→T454→T455→T456 (+ T457 rollback branch) |
| 92 | Multi-Tenant PromptOps | T460→T461 with T465 guard |

---

### FLOW-30 DEPENDENCY GRAPH

```
[Execution Path]
T445 (Select Version) → T446 (Execute + Trace) → T448 (Judge Verdict)
                                                      ↓
                                                T449 (Trigger Gate)
                                                      ↓ if triggered
                                          [Optimization Sub-Flow]
T450 (Evidence Pack) → T451 (Critique) → T452 (Generate Candidate) → T453 (Eval Suite)
                                                                           ↓
                                                               T454 (Promotion Gate)
                                                                     ↓ APPROVED
                                                               T455 (Canary Rollout)
                                                                     ↓ success
                                                               T456 (Production Promote)
                                                                     ↓ regression
                                                               T457 (Rollback)

[Supporting Services — fire on every execution]
T458 (RAG Ingestion) ← T446
T459 (Harvest) ← T448 (when score < threshold)
T463 (Metrics) — scheduled
T464 (Audit) — on every state transition
T465 (Guard) — before T450→T451 context injection

[Multi-Tenant Path]
T460 (Override) → T461 (Cross-Tenant Learn, scheduled)
T465 (Guard) — wraps T461 input
```

---

### FABRIC RESOLUTION MAP (FLOW-30)

| Service | → Fabric | → Provider |
|---------|----------|-----------|
| F1275–F1279 (Control Plane) | DATABASE FABRIC | Elasticsearch |
| F1280 (PromptOps RAG) | RAG FABRIC | Hybrid (vector+graph) |
| F1281–F1283 (Trace/Eval) | DATABASE FABRIC | Elasticsearch |
| F1284–F1287 (Optimization Engine) | AI ENGINE FABRIC | AiDispatcher (multi-model) |
| F1288, F1291 (Canary/Rollback) | QUEUE FABRIC | Redis Streams |
| F1289 (Promotion Decisions) | DATABASE FABRIC | Elasticsearch |
| F1290 (Routing) | AI ENGINE FABRIC | Bandit engine |
| F1292–F1294 (Observability) | DATABASE FABRIC | Elasticsearch |
| F1295–F1296 (MT Profiles) | DATABASE FABRIC | Elasticsearch |
| F1297 (Scope Guard) | CORE FABRIC | MicroserviceBase (in-process) |

---

### INTERACTION WITH PRIOR FLOWS

| Prior Flow | Interaction with FLOW-30 | BFA Rule |
|-----------|-------------------------|----------|
| FLOW-01–FLOW-25 | Opt-in only (promptOpsEnabled=false default) | CF-594 |
| FLOW-15 (MVP Builder) | PromptOps can wrap generated nodes when enabled | CF-594 |
| FLOW-18 (Visual Flow Creation) | User-created flows can enable PromptOps per node | CF-594 |
| FLOW-25 (BFA Governance) | PromptOps sub-flows registered in BFA conflict index | CF-594 |

---

### NEXT AVAILABLE NUMBERS (FLOW-31 starts here)

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
