# XIIGen — FLOW-32 SKILLS FACTORY & RAG INDEX
## Flow: First RAG Initialization — Production Bootstrap
## Date: 2026-03-01 | New Skills: SK-251–SK-260
## Quick-lookup for all FLOW-32 concepts, patterns, and source references

---

# SECTION 1 — CONCEPT → SOURCE MAPPING

## RAG-Specific Concepts (FLOW-32 additions)

### Layer 0: Fabric Interfaces Used by FLOW-32
| Concept | Fabric | Key Detail |
|---------|--------|------------|
| IDatabaseService | DATABASE FABRIC (Skill 05) | Elasticsearch for BM25 + HNSW vector indices, Redis for cache |
| IQueueService | QUEUE FABRIC (Skill 04) | Redis Streams for ingestion events, eval jobs, alert events |
| IAiProvider | AI ENGINE FABRIC (Skill 06) | Embedding, enrichment, classification, reranking, fallback |
| IRagService | RAG FABRIC (Skill 00b) | Hybrid strategy selected by admin via FREEDOM config |
| MicroserviceBase | CORE FABRIC (Skill 01) | OTel tracer, Prometheus, in-process fusion, confidence scoring |
| IFlowOrchestrator | FLOW ENGINE FABRIC (Skill 09) | DAG execution for rag-bootstrap-v1.json |

### Layer 1: FLOW-32 Factory Families
| Family | Scope | Factories |
|--------|-------|-----------|
| 154 — RAG Bootstrap Ingestion | Parse→chunk→enrich→embed→index | F1075–F1082 |
| 155 — Hybrid Retrieval & RRF | BM25+vector parallel + fusion | F1083–F1089 |
| 156 — Neural Reranking | Cross-encoder + latency budget | F1090–F1093 |
| 157 — RAG Metadata Schema | Schema registry + lineage + ACL | F1094–F1098 |
| 158 — Task-Type Routing | Intent classify → source filter | F1099–F1103 |
| 159 — Confidence Gating | ANSWER/HEDGE/ABSTAIN + fallback | F1104–F1108 |
| 160 — RAG Evaluation | Golden set + RAGAS + regression | F1109–F1114 |
| 161 — OTel GenAI Observability | Spans + metrics + alerts + cost | F1115–F1119 |
| 162 — Cold Start Seeder | Coverage analysis + priority queue | F1120–F1123 |

### Layer 2: New Engine Contracts
| Task Type | Archetype | Key Innovation |
|-----------|-----------|----------------|
| T389 | ORCHESTRATION | Full bootstrap DAG with checkpoint-per-step |
| T390 | RETRIEVAL | Parallel BM25+vector + RRF fusion (never sequential) |
| T391 | ROUTING | LLM-based intent classify → task-type → skill → source |
| T392 | JUDGMENT | Cross-encoder rerank + ANSWER/HEDGE/ABSTAIN gate |
| T393 | VALIDATION | RAGAS faithfulness + P@K/R@K + regression gate |
| T394 | GENERATION | Synthetic query generation for cold-start eval |
| T395 | OBSERVABILITY | OTel GenAI spans + Prometheus + cost tracking |
| T396 | BOOTSTRAP | Priority-based cold-start seeding (highest-frequency first) |
| T397 | PROVISIONING | Per-tenant isolated RAG index provisioning |
| T398 | GENERATION (FALLBACK) | ABSTAIN=no facts; HEDGE=citations; graded response |

### Layer 4: New BFA Rules
| Rule | Type | Protects |
|------|------|----------|
| CF-510 | INDEX_NAMING | RAG vs FLOW-09 search index conflict |
| CF-511 | ORDERING | Embedding model registration before index build |
| CF-512 | DEPENDENCY | Tenant must exist (FLOW-15) before RAG bootstrap |
| CF-513 | GATE | Canary blocked if bootstrap validation fails |
| CF-514 | INDEX_ISOLATION | BM25 not shared with FLOW-09 SearchIndexService |
| CF-515 | SCHEMA | Vector dimension must match registered embedding model |
| CF-516 | SECURITY | Cache keys must include tenantId |
| CF-517 | DEPENDENCY | Skill mapping populated before routing activates |
| CF-518 | RESOURCE | Sub-query count bounded by config |
| CF-519 | DATA_FLOW | Reranker only sees security-trimmed results |
| CF-520 | ORDERING | Abstention audit fires before response returned |
| CF-521 | ISOLATION | Eval runs use isolated eval index |
| CF-522 | COST | RAGAS LLM calls logged to GenAI event log |
| CF-523 | NAMING | Tenant index naming pattern enforced |
| CF-524 | ALIAS | No cross-tenant alias sharing |
| CF-525 | FLOW_BOUNDARY | Fallback responses not indexed by FLOW-09 |

---

# SECTION 2 — SKILLS CATALOG (SK-251–SK-260)

## SK-251: RAG Bootstrap Ingestion Skill

```yaml
skill_id: SK-251
name: RAG Bootstrap Ingestion
version: 1.0.0
domain: rag_initialization
task_types: [T389, T396]
factory_interfaces: [F1075, F1076, F1077, F1078, F1079, F1080, F1081, F1082]
fabrics_used:
  - DATABASE FABRIC → Elasticsearch (manifest, source catalog)
  - QUEUE FABRIC → Redis Streams (pipeline events)
  - AI ENGINE FABRIC → LLM (enrichment, summary extraction)
  - FLOW ENGINE FABRIC → DAG (pipeline orchestration)
dna_patterns: [DNA-1, DNA-2, DNA-3, DNA-4, DNA-5]
```

**Pattern Description:**
Bootstrap ingestion follows the fixed pattern:
1. **Register sources** (F1081) → sources registered in source-catalog ES index
2. **Validate schemas** (F1094) → all documents validated against metadata schema
3. **Chunk** (F1076) → structural chunking with overlap, preserving headings
4. **Enrich** (F1077) → AI adds title, keywords, summary, language via IAiProvider
5. **Embed** (F1078) → dense vectors via IAiProvider embedding model
6. **Deduplicate** (F1079) → exact hash check before indexing
7. **Propagate ACL** (F1097) → ACL labels from source → chunks before index commit
8. **Index** → BM25 (F1084) + vector (F1085) in parallel via queue events
9. **Update manifest** (F1080) → document marked ingested with version hash

**Implementation Pattern (DNA-1 compliant):**
```csharp
// ✅ CORRECT — Dictionary, not typed model
var chunk = new Dictionary<string, object>
{
    ["chunk_id"] = Guid.NewGuid().ToString(),
    ["document_id"] = source["document_id"],
    ["source_id"] = source["source_id"],
    ["tenant_id"] = ctx.TenantId,       // DNA-5: always scoped
    ["content"] = chunkText,
    ["sequence_index"] = i,
    ["ingested_at"] = DateTime.UtcNow,
    ["keywords"] = new List<string>(),   // populated by enrichment
    ["summary"] = "",                    // populated by enrichment
    ["embedding_model"] = config["embeddingModel"],
    ["acl_labels"] = source["acl_labels"]
};

// ✅ CORRECT — DataProcessResult, never throw
var result = await _ingestionService.IngestAsync(chunk, ctx);
if (!result.Success)
    return DataProcessResult<bool>.Fail(result.Error);
```

**Resume / Checkpoint Pattern:**
Every pipeline step emits an event with `checkpoint_id`. If step N fails, resume from checkpoint N-1:
```json
{
  "trace_id": "bootstrap-abc123",
  "tenant_id": "tenant-xyz",
  "checkpoint": "post_enrichment",
  "step_index": 4,
  "document_ids_completed": ["doc-001", "doc-002"]
}
```

---

## SK-252: Hybrid Retrieval & RRF Fusion Skill

```yaml
skill_id: SK-252
name: Hybrid Retrieval & RRF Fusion
version: 1.0.0
domain: rag_retrieval
task_types: [T390]
factory_interfaces: [F1083, F1084, F1085, F1086, F1087, F1089]
fabrics_used:
  - RAG FABRIC → Hybrid strategy (Skill 00b)
  - DATABASE FABRIC → Elasticsearch (BM25 + HNSW), Redis (cache)
  - CORE FABRIC → in-process RRF fusion
```

**Core Pattern — Parallel Recall + RRF:**
```csharp
// ✅ CORRECT — parallel execution (never sequential)
var (bm25Task, vectorTask) = (
    _bm25Service.SearchAsync(query, topK, filters, tenantId),
    _vectorService.SearchAsync(queryVector, topK, filters, tenantId)
);
await Task.WhenAll(bm25Task, vectorTask);

var bm25Results = bm25Task.Result.Data;
var vectorResults = vectorTask.Result.Data;

// RRF fusion: score(d) = Σ 1/(k + rank_i(d))
var fused = await _rrfService.FuseAsync(bm25Results, vectorResults, rrf_k: 60);
```

**DNA-2 Filter Pattern:**
```csharp
// BuildSearchFilter auto-skips empty fields (DNA-2)
var filter = BuildSearchFilter(new Dictionary<string, object>
{
    ["tenant_id"] = ctx.TenantId,        // NEVER skip
    ["task_type_tags"] = queryCtx.TaskType,  // skipped if null
    ["skill_tags"] = queryCtx.SkillFilter,   // skipped if null
    ["acl_labels"] = userCtx.AclLabels       // skipped if empty
});
```

---

## SK-253: Neural Cross-Encoder Reranking Skill

```yaml
skill_id: SK-253
name: Neural Cross-Encoder Reranking
version: 1.0.0
domain: rag_reranking
task_types: [T392]
factory_interfaces: [F1090, F1091, F1092]
fabrics_used:
  - AI ENGINE FABRIC → cross-encoder provider (resolved via IAiProvider)
  - CORE FABRIC → latency budget enforcement
  - DATABASE FABRIC → Redis (rerank cache)
```

**Two-Stage Pattern:**
```
Stage 1 (T390): BM25 + vector recall → top-K=50 candidates
Stage 2 (T392): Cross-encoder scores all 50 → return top-N=5
```

**Latency Budget Fallback (Iron Rule):**
```csharp
var sw = Stopwatch.StartNew();
var rerankResult = await _reranker.RerankAsync(query, candidates, topN, tenantId);
sw.Stop();

// Never blow latency budget — fall back to first-stage ranking
var budgetCheck = await _latencyBudget.CheckBudgetAsync("rerank", sw.ElapsedMilliseconds, budget);
if (!budgetCheck.Data)
    return await _latencyBudget.FallbackToFirstStageAsync(firstStageResults);
```

---

## SK-254: RAG Metadata Schema Skill

```yaml
skill_id: SK-254
name: RAG Metadata Schema
version: 1.0.0
domain: rag_metadata
task_types: [T389, T397]
factory_interfaces: [F1094, F1095, F1096, F1097, F1098]
fabrics_used:
  - DATABASE FABRIC → Elasticsearch (schema registry, lineage, ACL)
  - QUEUE FABRIC → Redis Streams (freshness events)
  - AI ENGINE FABRIC → LLM (chunk tagging)
```

**Canonical Chunk Metadata Schema:**
```json
{
  "chunk_id": "string (UUID)",
  "document_id": "string",
  "source_id": "string",
  "tenant_id": "string (REQUIRED — DNA-5)",
  "sequence_index": "integer",
  "content": "string",
  "title": "string (enriched)",
  "keywords": ["string"],
  "summary": "string (AI-generated, ≤200 tokens)",
  "language": "string (ISO 639-1)",
  "quality_score": "float (0.0-1.0)",
  "task_type_tags": ["string"],
  "skill_tags": ["string"],
  "acl_labels": ["string"],
  "embedding_model": "string",
  "embedding_vector": "[float] (stored separately in vector index)",
  "source_type": "string (skill | task_type | external_doc | runbook)",
  "version_hash": "string (SHA-256 of content)",
  "ingested_at": "ISO-8601 datetime",
  "last_modified": "ISO-8601 datetime",
  "synthetic": "bool (false for real docs, true for synthetic queries)"
}
```

---

## SK-255: Task-Type Skill Routing Skill

```yaml
skill_id: SK-255
name: Task-Type Skill Routing
version: 1.0.0
domain: rag_routing
task_types: [T391]
factory_interfaces: [F1099, F1100, F1101, F1102, F1103]
fabrics_used:
  - AI ENGINE FABRIC → LLM intent classifier + planner
  - DATABASE FABRIC → Elasticsearch (skill-task mapping)
  - RAG FABRIC → strategy selection
```

**Routing Decision Tree:**
```
query → F1099 classify intent → task_type
task_type → F1100 get skills → [skill_id list]
skill_ids → F1103 get sources → [source_id list]
task_type → F1102 select strategy → (hybrid | bm25 | vector)
→ routing config: {strategy, source_filters, top_k, rerank_enabled, latency_budget_ms}
```

**Routing Config Shape (Dictionary, DNA-1):**
```csharp
var routingConfig = new Dictionary<string, object>
{
    ["strategy"] = "hybrid",
    ["source_filters"] = new List<string> { "skill", "task_type" },
    ["top_k"] = 20,
    ["rerank_enabled"] = true,
    ["rerank_top_n"] = 5,
    ["latency_budget_ms"] = 2000,
    ["task_type"] = classifiedIntent,
    ["skill_ids"] = relevantSkills
};
```

---

## SK-256: Confidence Gating & Fallback Skill

```yaml
skill_id: SK-256
name: Confidence Gating & Fallback
version: 1.0.0
domain: rag_confidence
task_types: [T392, T398]
factory_interfaces: [F1104, F1105, F1106, F1107, F1108]
fabrics_used:
  - CORE FABRIC → in-process confidence scoring + response assembly
  - AI ENGINE FABRIC → LLM (hedged response generation)
  - DATABASE FABRIC → Elasticsearch (abstention audit, calibration history)
```

**Three-Verdict Decision Logic:**
```
topScore ≥ minAnswerScore (0.60) → ANSWER verdict
topScore ≥ minHedgeScore (0.40) → HEDGE verdict (partial answer + citations)
topScore < abstainBelowScore (0.40) → ABSTAIN verdict (safe deflect, no facts)
```

**Fallback Template Map:**
| Verdict | Template | LLM Called? |
|---------|----------|-------------|
| ANSWER | Full answer with citations | Yes (generation) |
| HEDGE | Partial answer with explicit uncertainty + citations | Yes (generation) |
| ABSTAIN | Safe deflection: "I cannot answer from available sources. See: [source list]" | No (template) |

**Iron Rule Enforcement:**
```csharp
if (verdict == "ABSTAIN")
{
    // NEVER generate factual claims — use static template
    return _gradedResponseBuilder.BuildResponseAsync(
        chunks: partialResults,  // may be empty
        verdict: new Dictionary<string,object> { ["verdict"] = "ABSTAIN", ["reason"] = gateResult["reason"] },
        query: query
    );
    // DataProcessResult returned, never thrown
}
// Log BEFORE returning response (Iron Rule)
await _abstentionAudit.LogAbstentionAsync(auditEvent, tenantId);
```

---

## SK-257: RAGAS Evaluation Harness Skill

```yaml
skill_id: SK-257
name: RAGAS Evaluation Harness
version: 1.0.0
domain: rag_evaluation
task_types: [T393, T394]
factory_interfaces: [F1109, F1110, F1111, F1112, F1113, F1114]
fabrics_used:
  - DATABASE FABRIC → Elasticsearch (golden set, eval results, user feedback)
  - AI ENGINE FABRIC → LLM evaluator (faithfulness, relevance)
  - QUEUE FABRIC → Redis Streams (eval scheduling)
  - RAG FABRIC → context retrieval for faithfulness check
```

**RAGAS Triad Metrics:**
| Metric | Measures | Formula Concept |
|--------|----------|-----------------|
| Faithfulness | Answer grounded in retrieved context? | claims_in_context / total_claims |
| Context Relevance | Retrieved chunks relevant to question? | relevant_sentences / total_sentences |
| Answer Relevance | Answer addresses the question? | cosine_sim(question, answer_embedding) |

**Regression Gate Pattern:**
```csharp
var comparison = await _evalScheduler.CompareRunsAsync(currentRunId, baselineRunId, tenantId);
foreach (var metric in comparison.Data["metrics"])
{
    var drop = (float)metric["baseline"] - (float)metric["current"];
    if (drop > 0.05f) // 5% regression threshold
    {
        await _alertService.FireAlertAsync(
            new Dictionary<string,object> { ["type"] = "REGRESSION", ["metric"] = metric["name"], ["drop"] = drop },
            tenantId
        );
        // Block rollout via CanaryRolloutService
    }
}
```

---

## SK-258: OTel GenAI Tracing Skill

```yaml
skill_id: SK-258
name: OTel GenAI Tracing
version: 1.0.0
domain: rag_observability
task_types: [T395]
factory_interfaces: [F1115, F1116, F1117, F1118, F1119]
fabrics_used:
  - CORE FABRIC → OTel tracer + Prometheus (in-process)
  - DATABASE FABRIC → Elasticsearch (metrics, genai events)
  - QUEUE FABRIC → Redis Streams (alert events)
```

**OTel Span Names (GenAI Semantic Conventions):**
| Stage | Span Name | Key Attributes |
|-------|-----------|----------------|
| BM25 Recall | gen_ai.retrieval.bm25 | top_k, filters_applied, latency_ms |
| Vector Recall | gen_ai.retrieval.vector | top_k, model, dimension, latency_ms |
| RRF Fusion | gen_ai.retrieval.fusion | rrf_k, input_count, output_count |
| Reranking | gen_ai.rerank | model, input_k, output_n, latency_ms |
| Confidence Gate | gen_ai.confidence_gate | verdict, top_score, threshold |
| Generation | gen_ai.generate | model, input_tokens, output_tokens, cost_usd |

**Cost Tracking (mandatory per Iron Rule):**
```csharp
await _genAiEventLog.LogEventAsync(new Dictionary<string, object>
{
    ["model"] = model,
    ["provider"] = provider,
    ["input_tokens"] = response.InputTokens,
    ["output_tokens"] = response.OutputTokens,
    ["cost_usd"] = ComputeCost(model, response.InputTokens, response.OutputTokens),
    ["latency_ms"] = sw.ElapsedMilliseconds,
    ["trace_id"] = ctx.TraceId,
    ["tenant_id"] = ctx.TenantId,
    ["timestamp"] = DateTime.UtcNow
}, tenantId);
```

---

## SK-259: Synthetic Query Generation Skill

```yaml
skill_id: SK-259
name: Synthetic Query Generation
version: 1.0.0
domain: rag_evaluation
task_types: [T394]
factory_interfaces: [F1110, F1094, F1109]
fabrics_used:
  - AI ENGINE FABRIC → LLM provider (query generation)
  - DATABASE FABRIC → Elasticsearch (golden set + schema registry)
```

**Query Style Templates (per task type):**
```
factual:      "What is [concept extracted from chunk]?"
procedural:   "How do I [action from chunk]?"
conceptual:   "Explain the purpose of [abstracted topic]"
troubleshooting: "Why might [failure condition from chunk] occur?"
```

**Quality Gate — Answerability Check:**
Generated synthetic queries pass through T390 (Hybrid Recall). If top retrieved chunk is NOT the source chunk → query rejected. Target: ≥ 80% answerable from indexed content.

---

## SK-260: Cold Start Seeder Skill

```yaml
skill_id: SK-260
name: Cold Start Seeder
version: 1.0.0
domain: rag_bootstrap
task_types: [T396]
factory_interfaces: [F1120, F1121, F1122, F1082]
fabrics_used:
  - DATABASE FABRIC → Elasticsearch (coverage analysis, validation)
  - QUEUE FABRIC → Redis Streams (priority seeding queue)
  - FLOW ENGINE FABRIC → DAG (ingestion pipeline)
```

**Priority Scoring Formula:**
```
coverage_score(source) = 
  (task_type_frequency_rank / total_task_types) * 0.5 +
  (source_richness_score / max_richness) * 0.3 +
  (task_type_weight_config / max_weight) * 0.2
```

**Day-One Bootstrap Order (Default Priority):**
1. Core skill docs (SK-1–SK-50) — foundational patterns
2. Top-20 task types by usage frequency
3. AI/ML skills (SK-200–SK-250) — RAG-adjacent
4. External docs marked `priority: high` in source catalog
5. Remaining skills and task types

**Resumability Pattern:**
```csharp
// Check manifest before seeding (never re-ingest)
var manifest = await _manifestService.GetManifestAsync(sourceId, tenantId);
if (manifest.Success && (string)manifest.Data["status"] == "ingested")
{
    // Skip — already indexed
    continue;
}
```

---

# SECTION 3 — REUSE ANALYSIS

## Existing Assets → FLOW-32 Needs
| FLOW-32 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Document storage (indices) | IDatabaseService → Elasticsearch | REUSE (Fabric Layer 0) |
| Pipeline event streaming | IQueueService → Redis Streams | REUSE (Fabric Layer 0) |
| Embedding model calls | IAiProvider → embedding provider | REUSE (Fabric Layer 0) |
| LLM enrichment / generation | IAiProvider → LLM providers | REUSE (Fabric Layer 0) |
| Hybrid retrieval strategy | IRagService → Hybrid (Skill 00b) | REUSE (Fabric Layer 0) |
| Flow DAG execution | IFlowOrchestrator (Skill 09) | REUSE (Fabric Layer 0) |
| Multi-tenant scope isolation | MicroserviceBase + tenantId pattern | REUSE (DNA-5) |
| OTel tracing | MicroserviceBase OTel integration | REUSE (Fabric Layer 0) |
| BM25 indexing | IDatabaseService → Elasticsearch | REUSE (new index, same fabric) |
| Vector indexing (HNSW) | IDatabaseService → Elasticsearch | REUSE (new index, same fabric) |
| Cache layer | IDatabaseService → Redis | REUSE (Fabric Layer 0) |
| Skill catalog data | SK-1–SK-250 (existing) | CONSUME as ingestion source |
| Task type catalog data | T1–T388 (existing) | CONSUME as ingestion source |
| Ingestion pipeline orchestration | NEW → F1082 | NEW |
| RRF fusion | NEW → F1086 | NEW |
| Neural reranking | NEW → F1090 | NEW |
| Confidence gating | NEW → F1104 | NEW |
| RAGAS evaluation | NEW → F1111 | NEW |
| Synthetic query gen | NEW → F1110 | NEW |
| Cold start seeding | NEW → F1120, F1121, F1122 | NEW |

---

# SECTION 4 — ANTI-PATTERNS (MUST NOT)

| Anti-Pattern | Violation | DNA Rule |
|---|---|---|
| `new ElasticsearchClient(...)` in service code | Never import provider SDK | DNA-4 (MicroserviceBase) |
| `openAiClient.Embeddings.Create(...)` directly | Use IAiProvider.EmbedAsync() | DNA-4 |
| Typed `ChunkDocument` class instead of Dictionary | Use ParseDocument | DNA-1 |
| BM25 + vector calls sequential (`await bm25; await vector`) | Must be parallel | T390 Iron Rule |
| ABSTAIN verdict generating factual answer | Template only | T398 Iron Rule |
| Missing tenantId on index queries | Scope isolation required | DNA-5 |
| Raw score averaging instead of RRF | RRF rank-based fusion required | T390 Iron Rule |
| Eval run blocking production traffic | Must be async queue-based | T393 Iron Rule |
| GenAI model call without cost logging | F1118 mandatory | T395 Iron Rule |
| Canary without bootstrap validation | F1122 gate required | CF-513 |

---

# SECTION 5 — CROSS-FLOW DEPENDENCIES

| Flow | Relation to FLOW-32 | Type |
|------|---------------------|------|
| FLOW-09 (Search & Discovery) | RAG indices must not conflict with search indices | CF-510, CF-514 |
| FLOW-13 (AI Content Pipeline) | Reuses IAiProvider fabric; routing must not confuse AI content gen with RAG retrieval | Architecture note |
| FLOW-15 (MVP Builder) | Tenant provisioning (T397) depends on FLOW-15 tenant lifecycle events | CF-512 |
| FLOW-25 (BFA) | BFA governs changes to RAG factory interfaces; FLOW-32 entities registered in BFA | Governance |
| SK-1–SK-250 | Consumed as ingestion sources; FLOW-32 does not modify them | Data dependency |
| T1–T388 | Consumed as ingestion sources; FLOW-32 does not modify them | Data dependency |
