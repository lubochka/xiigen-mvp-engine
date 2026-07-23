# XIIGen — FLOW-32 TASK TYPES CATALOG
## Flow: First RAG Initialization — Production Bootstrap
## Date: 2026-03-01 | New Task Types: T389–T398
## Extends: T1–T388 (unchanged)

---

# TASK TYPE T389: RAG Bootstrap Initialization Gate
## "Initialize the RAG system from existing skill and task-type catalogs"

### Entry
```
Event: rag.bootstrap.requested
Trigger: System startup | Admin command | New tenant provisioning
TaskRequest.intent: rag_bootstrap_init
TaskRequest.domain: skill_catalog | task_type_catalog | source_corpus
```

### ARCHETYPE: ORCHESTRATION

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1075 | IDocumentIngestionService | Ingests skill/task-type docs |
| F1080 | IIngestionManifestService | Tracks ingestion state |
| F1081 | ISourceCatalogService | Registers source corpora |
| F1082 | IIngestionPipelineOrchestrator | Coordinates full pipeline |
| F1094 | IMetadataSchemaRegistryService | Validates doc schemas |
| F1123 | ICanaryRolloutService | Controls traffic ramp |

### FABRIC RESOLUTION
```
F1075 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch provider
F1080 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (manifest index)
F1081 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1082 → QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams
         + FLOW ENGINE FABRIC (IFlowOrchestrator, Skill 09) → DAG execution
F1094 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1123 → QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams
         + DATABASE FABRIC (IDatabaseService, Skill 05) → Redis (canary state)
```

### AF CONFIGURATION
```
AF-2 Planning:  Decomposes bootstrap into: coverage-analysis → source-catalog → schema-reg 
                → ingestion → index-build → skill-mapping → synthetic-eval → validation → canary
AF-4 RAG:       Retrieves SK-251 (RAG Bootstrap) + SK-260 (Cold Start Seeder) patterns
AF-7 Compliance: Verifies all services use MicroserviceBase + DataProcessResult (DNA-3, DNA-4)
AF-9 Judge:     Validates coverage ≥ min threshold before marking step complete
AF-11 Feedback: Stores bootstrap duration + coverage % for future optimization
```

### BFA VALIDATION
```
CF-510: RAG index naming must not conflict with FLOW-09 search indices
CF-511: Embedding model version must be registered before index build (ordering rule)
CF-512: Tenant provisioning event must precede RAG bootstrap (dependency on FLOW-15)
CF-513: Canary ramp must not activate if bootstrap validation fails (gate rule)
```

### MACHINE / FREEDOM
| Aspect | MACHINE (Fixed) | FREEDOM (Configurable) |
|--------|-----------------|------------------------|
| Pipeline steps | Fixed order, checkpoint-per-step | chunking strategy, chunk size |
| Fabric resolution | Always through factory | DB provider, queue provider |
| Scope isolation | tenantId on every call | index naming prefix |
| Failure mode | pause_and_alert | max_retries, DLQ name |
| DNA patterns | All 9 patterns enforced | N/A |

### IRON RULES
- BUILD FAILURE if any service imports ElasticsearchClient, RedisClient, or OpenAI SDK directly
- BUILD FAILURE if any method receives no tenantId
- BUILD FAILURE if bootstrap starts without schema validation passing (F1094)
- BUILD FAILURE if canary ramp starts before F1122 validation succeeds

### QUALITY GATES (AF-9 checks)
| Gate | Check | Threshold |
|------|-------|-----------|
| Pre-bootstrap | Source catalog registered? | ≥ 1 source |
| Post-ingestion | Manifest shows all sources ingested? | 100% of enqueued |
| Post-index | BM25 + vector indices report ready? | Both healthy |
| Post-validation | Coverage thresholds met? | Per F1122 config |
| Pre-canary | Synthetic eval run with no critical failures? | Pass |

### Flow Template
`rag-bootstrap-v1.json` (defined in ENGINE_ARCHITECTURE SECTION 2)

---

# TASK TYPE T390: Hybrid Recall Orchestration
## "Execute parallel BM25 + vector recall and fuse into a single ranked list"

### Entry
```
Event: rag.query.received
TaskRequest.intent: rag_retrieve
TaskRequest.domain: skill_retrieval | task_type_retrieval | source_retrieval
Input: query text + task_type + tenant_id + optional filters
```

### ARCHETYPE: RETRIEVAL

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1083 | IHybridRecallService | Orchestrates parallel recall |
| F1084 | IBm25IndexService | BM25 lexical recall |
| F1085 | IVectorIndexService | Dense vector recall |
| F1086 | IRrfFusionService | RRF merge |
| F1087 | IMetadataFilterService | Pre-recall security trimming |
| F1088 | IQueryExpansionService | Optional query expansion |
| F1089 | IRetrievalCacheService | Cache check |

### FABRIC RESOLUTION
```
F1083 → RAG FABRIC (IRagService, Skill 00b) → Hybrid strategy
F1084 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (BM25)
F1085 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (HNSW vector)
F1086 → CORE FABRIC (MicroserviceBase, Skill 01) → in-process RRF computation
F1087 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch filter layer
F1088 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM provider (optional)
F1089 → DATABASE FABRIC (IDatabaseService, Skill 05) → Redis provider
```

### AF CONFIGURATION
```
AF-4 RAG:       Retrieves SK-252 (Hybrid Retrieval) patterns for code generation
AF-6 Review:    Checks parallel execution pattern (Promise.All not sequential)
AF-7 Compliance: Verifies BuildSearchFilter (DNA-2), scope isolation (DNA-5)
AF-9 Judge:     Runs golden set precision@K / recall@K check post-index
```

### BFA VALIDATION
```
CF-514: BM25 index must not share name with FLOW-09 SearchIndexService indices
CF-515: Vector index dimension must match embedding model registered at bootstrap (T389)
CF-516: Cache keys must include tenantId (cross-tenant leak prevention)
```

### MACHINE / FREEDOM
| Aspect | MACHINE (Fixed) | FREEDOM (Configurable) |
|--------|-----------------|------------------------|
| Recall execution | BM25 + vector in parallel (never sequential) | topK (10–100) |
| Fusion algorithm | RRF (not raw score averaging) | rrf_k constant (default 60) |
| Security trimming | Mandatory post-recall step | ACL field name |
| Cache keying | hash(query + filters + tenantId) | TTL (30–3600s) |

### IRON RULES
- BUILD FAILURE if BM25 and vector calls are sequential (must be parallel)
- BUILD FAILURE if RRF fuses on raw scores instead of rank positions
- BUILD FAILURE if security trimming is skipped or optional
- BUILD FAILURE if tenantId missing from any index query

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Latency | BM25 + vector recall | P95 ≤ 500ms each |
| Fusion | RRF output contains both BM25+vector candidates | Always |
| Precision | P@5 on golden set | ≥ 0.70 |
| Recall | R@10 on golden set | ≥ 0.80 |
| Cache hit | Cache check executes before index query | Always |

---

# TASK TYPE T391: Metadata-Driven Skill Router
## "Route query to correct skill subset and retrieval strategy based on task-type classification"

### Entry
```
Event: rag.query.received (after T390 cache miss)
TaskRequest.intent: rag_route
Input: query text + tenantId
Output: routing config (strategy, source filters, top_k, rerank flag)
```

### ARCHETYPE: ROUTING

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1099 | ITaskTypeRouterService | Classifies query intent |
| F1100 | ISkillMappingService | Maps task type → skills → sources |
| F1101 | IQueryPlannerService | Decomposes multi-intent queries |
| F1102 | IRetrievalStrategySelector | Selects hybrid/bm25/vector strategy |
| F1103 | ISourcePriorityService | Ranks source corpora by relevance |

### FABRIC RESOLUTION
```
F1099 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM intent classifier
F1100 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (skill-task mapping)
F1101 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM planner
F1102 → RAG FABRIC (IRagService, Skill 00b) → strategy selection
F1103 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
```

### AF CONFIGURATION
```
AF-3 Prompt Library: Retrieves domain-specific routing prompts per task type
AF-4 RAG:            Retrieves SK-255 (Task-Type Skill Routing) patterns
AF-5 Multi-model:    Routes classification through multiple models for confidence scoring
AF-9 Judge:          Validates routing accuracy on synthetic query set (≥ 85% correct routes)
```

### BFA VALIDATION
```
CF-517: Skill mapping index must be populated before routing activates (bootstrap dependency)
CF-518: Multi-intent query decomposition must not exceed maxSubQueries config
```

### IRON RULES
- BUILD FAILURE if routing makes direct HTTP call to skill service (must go through queue event)
- BUILD FAILURE if task-type classification result is not stored for AF-11 feedback loop
- BUILD FAILURE if routing config omits latency_budget_ms field

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Classification accuracy | Routing correct on synthetic set | ≥ 85% |
| Routing latency | LLM classify + mapping lookup | P95 ≤ 300ms |
| Source coverage | At least 1 source per skill found | 100% |

---

# TASK TYPE T392: Rerank & Confidence Gate
## "Rerank top-K retrieved chunks then apply confidence gating"

### Entry
```
Event: rag.recall.complete
Input: top-K chunks from T390 + original query + tenantId
Output: reranked top-N + confidence verdict (ANSWER | HEDGE | ABSTAIN)
```

### ARCHETYPE: JUDGMENT

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1090 | INeuralRerankerService | Cross-encoder reranking |
| F1091 | ILatencyBudgetService | Enforces time budget |
| F1092 | IRerankCacheService | Cache for rerank results |
| F1104 | IConfidenceGateService | ANSWER/HEDGE/ABSTAIN verdict |
| F1105 | IFallbackResponseService | Generates fallback if needed |
| F1107 | IAbstentionAuditService | Logs hedge/abstain events |
| F1108 | IGradedResponseBuilder | Assembles final response |

### FABRIC RESOLUTION
```
F1090 → AI ENGINE FABRIC (IAiProvider, Skill 06) → cross-encoder/reranker provider
F1091 → CORE FABRIC (MicroserviceBase, Skill 01) → in-process timer
F1092 → DATABASE FABRIC (IDatabaseService, Skill 05) → Redis provider
F1104 → CORE FABRIC (MicroserviceBase, Skill 01) → in-process scoring
F1105 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM provider
F1107 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (audit)
F1108 → CORE FABRIC (MicroserviceBase, Skill 01) → in-process assembly
```

### AF CONFIGURATION
```
AF-4 RAG:    Retrieves SK-253 (Neural Reranking) + SK-256 (Confidence Gating) patterns
AF-8 Security: Verifies no PII leakage in fallback response
AF-9 Judge:  Validates abstention rate ≤ configured threshold on golden set
AF-11 Feedback: Stores reranker score distribution for threshold calibration
```

### BFA VALIDATION
```
CF-519: Reranker must operate on chunks already security-trimmed by T390 (never re-fetch raw)
CF-520: Abstention audit must fire BEFORE returning response to caller
```

### IRON RULES
- BUILD FAILURE if reranker exceeds latency budget and doesn't fall back to first-stage ranking
- BUILD FAILURE if ABSTAIN verdict returns hallucinated answer (must use fallback template)
- BUILD FAILURE if abstention event not logged (F1107)

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Reranker latency | Cross-encoder scoring | P95 ≤ 600ms |
| MRR improvement | Reranker vs first-stage | ≥ +10% MRR |
| Abstention rate | ABSTAIN on golden set queries | ≤ 15% |
| Fallback quality | HEDGE responses include ≥ 1 citation | 100% |

---

# TASK TYPE T393: RAG Evaluation Harness Runner
## "Execute offline evaluation suite: golden set precision/recall + RAGAS metrics"

### Entry
```
Event: rag.eval.requested | rag.canary.step.reached
TaskRequest.intent: rag_evaluate
Input: eval config + tenantId + optional runId
```

### ARCHETYPE: VALIDATION

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1109 | IGoldenSetService | P@K / R@K evaluation |
| F1111 | IRagasMetricsService | Faithfulness / relevance metrics |
| F1112 | IEvaluationSchedulerService | Schedules and runs suites |
| F1113 | IUserFeedbackCollectorService | Incorporates user signals |
| F1114 | IEvalReportService | Generates evaluation reports |

### FABRIC RESOLUTION
```
F1109 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (golden-set index)
F1111 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM evaluator
         + RAG FABRIC (IRagService, Skill 00b) → context retrieval for faithfulness
F1112 → QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams (eval job scheduling)
F1113 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
         + QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams
F1114 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
         + AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM (narrative report)
```

### AF CONFIGURATION
```
AF-4 RAG:    Retrieves SK-257 (RAGAS Evaluation) patterns
AF-9 Judge:  THIS task type IS a judge-pattern. AF-9 validates eval harness outputs.
AF-11 Feedback: Eval results fed back into AF-11 → prompt improvement loop
```

### BFA VALIDATION
```
CF-521: Eval runs must use isolated eval index (not production index)
CF-522: RAGAS LLM evaluator costs must be tracked in F1118 GenAI event log
```

### IRON RULES
- BUILD FAILURE if eval run blocks production traffic (must be async, queue-based)
- BUILD FAILURE if synthetic queries used in golden set without synthetic: true flag
- BUILD FAILURE if regression (> 5% metric drop) doesn't trigger alert (F1119)

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Golden set coverage | ≥ N golden queries per task type | ≥ 10 per type |
| Faithfulness | RAGAS faithfulness score | ≥ 0.80 |
| Context precision | RAGAS context precision | ≥ 0.75 |
| Answer relevance | RAGAS answer relevance | ≥ 0.80 |
| Regression gate | No metric drop vs last run | ≤ 5% degradation allowed |

---

# TASK TYPE T394: Synthetic Query Generator
## "Generate synthetic queries from indexed chunks for cold-start evaluation coverage"

### Entry
```
Event: rag.index.built | rag.eval.synthetic.requested
TaskRequest.intent: synthetic_query_generation
Input: source corpus + task_type + tenantId
```

### ARCHETYPE: GENERATION

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1110 | ISyntheticQueryGeneratorService | LLM-based query generation |
| F1094 | IMetadataSchemaRegistryService | Schema validation for synthetic queries |
| F1109 | IGoldenSetService | Stores synthetic queries in golden set |

### FABRIC RESOLUTION
```
F1110 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM provider (query generation)
F1094 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1109 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (golden-set index)
```

### AF CONFIGURATION
```
AF-1 Genesis:   Generates synthetic query generation prompts from skill taxonomy
AF-3 Prompt Library: Retrieves per-task-type query generation templates
AF-5 Multi-model: Runs query generation on 2+ models for diversity
AF-9 Judge:     Validates synthetic queries are genuinely answerable from indexed chunks
```

### IRON RULES
- BUILD FAILURE if synthetic queries stored without synthetic: true flag
- BUILD FAILURE if > 20% of generated queries fail answerability check (quality signal)

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Answerability | Query answerable from indexed content | ≥ 80% |
| Diversity | Unique query styles across task types | ≥ 3 styles per type |
| Volume | Synthetic queries per task type | ≥ 10 |

---

# TASK TYPE T395: RAG OTel Observability Pipeline
## "Instrument every RAG stage with OTel GenAI spans, metrics, and cost tracking"

### Entry
```
Triggered: Always-on; activated per RAG query execution
TaskRequest.intent: rag_observe
Runs alongside: T390, T391, T392 (cross-cutting concern)
```

### ARCHETYPE: OBSERVABILITY

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1115 | IOtelRagTracerService | Stage span creation |
| F1116 | ILatencyMetricsService | P50/P95 latency per stage |
| F1117 | IRagMetricsDashboardService | Aggregated dashboard |
| F1118 | IGenAiEventLogService | AI model cost + token tracking |
| F1119 | IAlertingService | SLO breach alerting |

### FABRIC RESOLUTION
```
F1115 → CORE FABRIC (MicroserviceBase, Skill 01) → OTel tracer (in-process)
F1116 → CORE FABRIC (MicroserviceBase, Skill 01) → Prometheus (in-process)
F1117 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1118 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (genai-events)
F1119 → QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams (alert events)
```

### AF CONFIGURATION
```
AF-4 RAG:    Retrieves SK-258 (OTel GenAI Tracing) patterns
AF-8 Security: Verifies no PII in span attributes or metric labels
AF-7 Compliance: Verifies traceId propagated through all stages (DNA-4 MicroserviceBase)
```

### IRON RULES
- BUILD FAILURE if any RAG stage lacks OTel span instrumentation
- BUILD FAILURE if GenAI model invocation not logged to F1118 (cost tracking mandatory)
- BUILD FAILURE if SLO breach doesn't trigger F1119 alert within 60s

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Coverage | All 6 pipeline stages instrumented | 100% |
| Latency budget | P95 total pipeline | ≤ 2000ms |
| Cost visibility | All LLM calls logged with cost_usd | 100% |

---

# TASK TYPE T396: Cold Start Coverage Seeder
## "Bootstrap RAG index with highest-priority sources on day one"

### Entry
```
Event: rag.bootstrap.requested (sub-task of T389)
TaskRequest.intent: cold_start_seed
Input: existing SK catalog + T catalog + tenantId
```

### ARCHETYPE: BOOTSTRAP

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1120 | ICoverageAnalyzerService | Scores sources by impact priority |
| F1121 | ISeedingQueueService | Enqueues prioritized ingestion jobs |
| F1122 | IBootstrapValidatorService | Validates min coverage thresholds |
| F1082 | IIngestionPipelineOrchestrator | Executes ingestion (from F1082) |

### FABRIC RESOLUTION
```
F1120 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1121 → QUEUE FABRIC (IQueueService, Skill 04) → Redis Streams (priority queue)
F1122 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch
F1082 → QUEUE FABRIC + FLOW ENGINE FABRIC (as per T389)
```

### AF CONFIGURATION
```
AF-2 Planning:  Creates prioritized seeding plan: highest-frequency task types first
AF-9 Judge:     Coverage validated by F1122 before marking T396 complete
AF-11 Feedback: Coverage % and seeding duration stored for future cold-start optimization
```

### IRON RULES
- BUILD FAILURE if seeder re-ingests already-indexed content (must check manifest F1080)
- BUILD FAILURE if blockServingIfBelowThreshold=true and coverage not validated before canary

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Priority order | Top-10 task types seeded first | Enforced by F1120 score |
| No re-ingestion | Already-indexed content skipped | 0% duplication |
| Coverage threshold | Min % task types with ≥ 1 source | Per FREEDOM config |

---

# TASK TYPE T397: Multi-Tenant RAG Index Provisioner
## "Provision isolated RAG indices per tenant with scope isolation"

### Entry
```
Event: tenant.provisioned (from FLOW-15)
TaskRequest.intent: rag_tenant_provision
Input: tenantId + tenant config + index policy
```

### ARCHETYPE: PROVISIONING

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1084 | IBm25IndexService | Creates per-tenant BM25 index |
| F1085 | IVectorIndexService | Creates per-tenant vector index |
| F1080 | IIngestionManifestService | Initializes tenant manifest |
| F1094 | IMetadataSchemaRegistryService | Registers tenant schemas |
| F1097 | IAclPropagationService | Sets tenant ACL policies |

### FABRIC RESOLUTION
```
F1084–F1085 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (per-tenant indices)
F1080 → DATABASE FABRIC → Elasticsearch (manifest-{tenantId})
F1094 → DATABASE FABRIC → Elasticsearch
F1097 → DATABASE FABRIC → Elasticsearch
```

### AF CONFIGURATION
```
AF-7 Compliance: Verifies tenantId isolation on all created indices (DNA-5)
AF-8 Security:   Validates ACL policies (F1097) before index is activated
AF-9 Judge:      Confirms cross-tenant query isolation (zero cross-tenant leakage)
```

### BFA VALIDATION
```
CF-523: Tenant RAG index names must follow naming pattern: {prefix}-{tenantId}-{type}
CF-524: New tenant RAG indices must not share alias with existing tenant indices
```

### IRON RULES
- BUILD FAILURE if tenantId is absent from any index creation call
- BUILD FAILURE if cross-tenant alias created (strict index isolation required)
- BUILD FAILURE if ACL policy not set before index is marked active

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Isolation | Query with tenantA returns 0 tenantB docs | 100% isolation |
| Provisioning time | Index ready for first ingestion | ≤ 30 seconds |
| Schema registration | Tenant schemas registered before first write | Always |

---

# TASK TYPE T398: RAG Fallback Response Generator
## "Generate structured fallback when confidence gate returns HEDGE or ABSTAIN"

### Entry
```
Event: rag.confidence.gate.hedge | rag.confidence.gate.abstain
TaskRequest.intent: rag_fallback_generate
Input: query + verdict + partial_results (may be empty) + tenantId
```

### ARCHETYPE: GENERATION (FALLBACK)

### FACTORY DEPENDENCIES
| Factory | Interface | Role |
|---------|-----------|------|
| F1105 | IFallbackResponseService | Generates structured fallback |
| F1107 | IAbstentionAuditService | Logs fallback event |
| F1108 | IGradedResponseBuilder | Assembles response with citations |
| F1106 | IThresholdCalibrationService | Uses feedback to calibrate thresholds |

### FABRIC RESOLUTION
```
F1105 → AI ENGINE FABRIC (IAiProvider, Skill 06) → LLM provider (hedged response only)
F1107 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (audit)
F1108 → CORE FABRIC (MicroserviceBase, Skill 01) → in-process assembly
F1106 → DATABASE FABRIC (IDatabaseService, Skill 05) → Elasticsearch (calibration history)
```

### AF CONFIGURATION
```
AF-3 Prompt Library: Retrieves fallback prompt templates per task type + verdict type
AF-8 Security:       Scans fallback response for PII or hallucinated facts
AF-9 Judge:          Validates: ABSTAIN returns no invented answer; HEDGE includes citations
AF-11 Feedback:      Stores fallback events for threshold calibration (F1106)
```

### BFA VALIDATION
```
CF-525: Fallback responses must not trigger FLOW-09 content indexing (read-only path)
```

### IRON RULES
- BUILD FAILURE if ABSTAIN verdict generates any factual claim not in partial_results
- BUILD FAILURE if fallback response omits abstention_reason field
- BUILD FAILURE if fallback event not logged to F1107 before response returned

### QUALITY GATES
| Gate | Check | Threshold |
|------|-------|-----------|
| Hallucination | ABSTAIN response contains no invented facts | 0% |
| Citation | HEDGE response includes ≥ 1 source citation | 100% |
| Latency | Fallback response generation | P95 ≤ 1000ms |
| Audit | Every fallback logged before return | 100% |

---

# TASK TYPE SUMMARY TABLE

| Type | Name | Archetype | Factories | Flow Template |
|------|------|-----------|-----------|---------------|
| T389 | RAG Bootstrap Initialization Gate | ORCHESTRATION | F1075,F1080,F1081,F1082,F1094,F1123 | rag-bootstrap-v1.json |
| T390 | Hybrid Recall Orchestration | RETRIEVAL | F1083,F1084,F1085,F1086,F1087,F1088,F1089 | rag-query-v1.json |
| T391 | Metadata-Driven Skill Router | ROUTING | F1099,F1100,F1101,F1102,F1103 | rag-query-v1.json |
| T392 | Rerank & Confidence Gate | JUDGMENT | F1090,F1091,F1092,F1104,F1105,F1107,F1108 | rag-query-v1.json |
| T393 | RAG Evaluation Harness Runner | VALIDATION | F1109,F1111,F1112,F1113,F1114 | rag-eval-v1.json |
| T394 | Synthetic Query Generator | GENERATION | F1110,F1094,F1109 | rag-eval-v1.json |
| T395 | RAG OTel Observability Pipeline | OBSERVABILITY | F1115,F1116,F1117,F1118,F1119 | cross-cutting |
| T396 | Cold Start Coverage Seeder | BOOTSTRAP | F1120,F1121,F1122,F1082 | rag-bootstrap-v1.json |
| T397 | Multi-Tenant RAG Index Provisioner | PROVISIONING | F1084,F1085,F1080,F1094,F1097 | rag-tenant-v1.json |
| T398 | RAG Fallback Response Generator | GENERATION (FALLBACK) | F1105,F1107,F1108,F1106 | rag-query-v1.json |

---

# DISTINCT FROM ANALYSIS

| T390 | DISTINCT FROM T99–T118 (FLOW-09 Search) | T390 uses RAG FABRIC hybrid strategy; T99–T118 use search-specific task routing. RAG adds vector recall + RRF + chunked context; Search returns whole documents |
| T391 | DISTINCT FROM T169–T178 (FLOW-13 AI Content) | T391 routes retrieval queries; T169–T178 route content generation tasks. Different intent classifiers, different factory sets |
| T392 | DISTINCT FROM AF-9 Judge Station | T392 is a runtime confidence gate on retrieved content; AF-9 is a build-time code quality judge |
| T393 | DISTINCT FROM T375–T388 (FLOW-25 BFA) | T393 evaluates RAG pipeline quality; T375–T388 evaluate cross-flow conflict governance |

---

# BACKWARD COMPATIBILITY

- T1–T388: UNCHANGED. No modifications to existing engine contracts.
- FLOW-32 task types are additive only.
- All FLOW-32 task types reference existing fabric interfaces (Skill 00b, 01, 04, 05, 06) without modifying them.
