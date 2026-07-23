# FLOW-31 — MASTER EXECUTION PLAN
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Date: 2026-03-01

---

## OVERVIEW

FLOW-31 extends the XIIGen engine to understand Figma designs as structured functional artifacts.
The engine ingests screens, produces DesignIR → ScreenSemanticsIR → SystemModelIR, maps screens
to Genie DNA modules, infers system type, detects gaps, and continuously improves via a learning loop.

**9 Fabric Families: 154–162 | 68 Factories: F1075–F1142 | 27 Task Types: T389–T415 | 8 Templates: 83–90**

---

## PHASE SUMMARY TABLE

| Phase | Name | Factories | Duration | Save Point |
|-------|------|-----------|----------|-----------|
| P0 | Foundation + Rate Limit Infrastructure | F1075–F1082 | 30 min | ES indices created, rate-limit bucket active |
| P1 | DesignIR Processing Pipeline | F1083–F1090 | 45 min | DesignIR flowing end-to-end for test file |
| P2 | AI Semantic Extraction | F1091–F1098 | 45 min | ScreenSemanticsIR with evidence maps for test screens |
| P3 | Graph Index + Vector Embedding | F1099–F1113 | 45 min | UI graph built + kNN embeddings indexed |
| P4 | Module Mapping + BFA Validation | F1114–F1120 | 45 min | Module candidates + wiring plan for test file |
| P5 | System Type + Gap Completion | F1121–F1132 | 30 min | Gap report generated for test file |
| P6 | Learning Loop + Quality Gates | F1133–F1142 | 30 min | Correction stored; benchmark running |
| P7 | Integration + Promotion Validation | All | 30 min | All 26 stress tests passing; GENERATED→INJECTED promotion |

---

## PHASE P0 — FOUNDATION + RATE LIMIT INFRASTRUCTURE
**Duration: 30 minutes**
**Factories: F1075–F1082 (Family 154)**

### Objective
Stand up all Figma ingestion factories with rate-limit protection. No AI calls yet.

### Steps

**P0-1: Elasticsearch Index Creation (10 min)**
Create all FLOW-31 ES indices with mappings:
- figma_ingestion_cache (F1075): tenant + fileKey, TTL-enabled
- figma_plugin_events (F1076): tenant + fileKey, Redis Streams consumer group
- figma_node_tree (F1077): tenant + fileKey, nested Dictionary<string,object>
- figma_image_cache (F1078): tenant + fileKey, includes expiresAt field
- figma_component_catalog (F1079): tenant (prefix "figma31_component_catalog")
- design_token_map (F1080): tenant + fileKey
- figma_version_history (F1081): tenant + fileKey, immutable snapshot per version
- rate_limit_buckets (F1082): tenant, Redis token bucket config

**Validation:** `GET /_cat/indices/figma31*` returns all 8 indices.

**P0-2: Rate Limit Guard Activation (10 min)**
Configure F1082 (IFigmaRateLimitGuardService):
- Token buckets: editor tier = 60/min, viewer tier = 30/min
- Bucket scope: per (tenantId, apiKeyTier)
- Redis key pattern: "figma31::ratelimit::{tenantId}::{tier}"
- Backoff: exponential, max 3 retries, then DLQ event

**Validation:** Simulate 65 API token requests from same tenant in 1 minute.
Expected: 60 succeed immediately, 5 queued/retried. No 429 propagated to caller.

**P0-3: Version Check Flow (10 min)**
Activate F1081 (IFigmaVersionManagerService):
- GET /files/{key} fetched once → version stored in figma_version_history
- Second call: version comparison → cache hit → no API call

**Validation:** Same fileKey submitted twice. Assert API call count = 1.

**Save Point:** `SESSION_STATE.phases.P0 = COMPLETE`. All ingestion indices active, rate limit operational.

---

## PHASE P1 — DESIGNIR PROCESSING PIPELINE
**Duration: 45 minutes**
**Factories: F1083–F1090 (Family 155)**

### Objective
Transform raw Figma JSON (from P0) into structured DesignIR stored in Elasticsearch.
All processing is DETERMINISTIC — no AI calls in this phase.

### Steps

**P1-1: Node Tree Processing (15 min)**
Activate F1077 (IFigmaNodeParserService) + F1079 (IFigmaComponentCatalogService):
- Parse raw Figma JSON → Dictionary<string,object> node tree
- Resolve all INSTANCE nodes → main component IDs via component catalog
- Extract all TEXT layer content with nodeId tags
- Validate: no typed model classes (DNA-1); all nodes have nodeId + type + parentId + frameId

**Validation:** Feed 10-screen test file. Assert:
- All screens have ≥1 node in node tree
- All INSTANCE nodes have resolved main_component_id
- Zero typed NodeModel classes in codebase (AF-7 gate)

**P1-2: DesignIR Feature Extraction (15 min)**
Activate F1083–F1088:
- F1083: DesignIR compiler — produces per-screen IR with all subcomponents
- F1084: UI controls detector — list/grid/table/tabs/modal/sidebar/nav-bar/input/button/badge
- F1085: Layout semantics — infer layout primitive per screen
- F1086: Component signatures — compute (componentId → instanceCount) map per screen
- F1087: Screen fingerprints — hash component composition for change detection
- F1088: Interaction semantics — classify prototype reactions as action types

**Validation:** For test file, every screen has:
- ≥1 layout primitive (or tagged "indeterminate")
- component_signature (even if empty for screens with no components)
- fingerprint_hash (deterministic — same input = same hash)

**P1-3: DesignIR Assembly + Validation Gate (15 min)**
Activate F1089 (IDesignIRAssemblerService) + F1090 (IDesignIRValidatorService):
- Assemble all screen-level artifacts into file-level DesignIR document
- Validate: screens[], components[], designTokens, screenMap, prototypeLinks all present
- Store in design_ir index with tenantId + fileKey + version

**Validation:** DesignIR document query returns complete document with all required fields.
T397 validation gate passes for well-formed test file; rejects intentionally incomplete test file.

**Save Point:** `SESSION_STATE.phases.P1 = COMPLETE`. DesignIR flowing end-to-end.

---

## PHASE P2 — AI SEMANTIC EXTRACTION
**Duration: 45 minutes**
**Factories: F1091–F1098 (Family 156)**

### Objective
For each screen, run multimodal AI analysis → produce ScreenSemanticsIR with evidence maps.
This is the first phase with AI ENGINE FABRIC calls.

### Steps

**P2-1: Prompt Template Library (10 min)**
Activate F1092 (IPromptTemplateLibraryService):
- Load prompt templates for: archetype classification, entity extraction, action pattern detection
- Each template includes: strict JSON output schema, evidence requirement instructions,
  multimodal input format (node tree excerpt + image URL)
- Store templates in RAG FABRIC for AF-3 retrieval

**Validation:** AF-3 (Prompt Library) retrieves correct template for "archetype_classification" task.

**P2-2: Multimodal Semantic Extraction (20 min)**
Activate F1091 (IMultimodalPromptOrchestratorService) + F1093–F1097:
- For each screen: check imageUrl from F1078 (re-render if expired — CF-518)
- Check screen height ≥500px → multimodal mode required (CF-530)
- Call IAiProvider.GenerateAsync() with: system prompt + node tree + image URL
- Parse response → ScreenSemanticsIR (Dictionary<string,object>, never typed)
- Validate schema completeness: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[]

**Parallelism:** max 10 screens concurrent per tenant. allSettled pattern (DR-193).

**P2-3: Evidence Coverage Gate + Semantic Validation (15 min)**
Activate F1098 (ISemanticIRValidatorService) + F1138 (pre-wire):
- Evidence coverage gate: every module/action/entity claim must have ≥1 evidence item
- Archetype claims require ≥3 evidence items (DR-190)
- Confidence floor: any archetype with max confidence < 0.4 → UNCLASSIFIED (CF-529)
- Schema validation: AF-9 validates required fields before downstream use

**Validation:** 
- Intentionally-hallucinated claim (no nodeId/text evidence) → EVIDENCE_COVERAGE_GATE_FAIL ✅
- Low-confidence screen → UNCLASSIFIED (not forced-classified) ✅
- Complete valid screen → EMIT:semantics.extracted ✅

**Save Point:** `SESSION_STATE.phases.P2 = COMPLETE`. ScreenSemanticsIR with evidence maps operational.

---

## PHASE P3 — GRAPH INDEX + VECTOR EMBEDDING
**Duration: 45 minutes**
**Factories: F1099–F1113 (Families 157–158)**

### Objective
Build UI graph (screens as nodes, prototype links as edges) and generate vector embeddings.
Enables GraphRAG + vector similarity retrieval for module mapping.

### Steps

**P3-1: UI Graph Construction (15 min)**
Activate F1099 (IUIGraphNodeBuilderService) + F1100 (IUIGraphEdgeBuilderService):
- Screens → graph nodes (tenantId + fileKey scoped)
- Prototype links + semantic relations → graph edges
- Distributed lock: "{tenantId}::{fileKey}::graph-build" (CF-540)
- Orphan node check: screens with no edges → NAVIGATION_ISOLATION flag (CF-535)

**Validation:** Graph built for test file. Assert: no duplicate nodes/edges; concurrent run test shows lock working.

**P3-2: Module Signature + System Type Graph Enrichment (15 min)**
Activate F1101–F1105:
- F1101: Navigation flow extractor — extract multi-step flows from graph (browse→detail→checkout)
- F1102: Module signature graph — overlay module candidate signals as graph annotations
- F1103: System type graph — READ-ONLY query against global system-type ontology (CF-539)
- F1104: Navigation flow index — store detected flows in navigation_flows index
- F1105: Module dependency graph — READ-ONLY query (CF-539)

**GraphRAG Retrieval (F1106, F1107):**
- F1106: GraphRAG retrieval — query graph for module dependency constraints + similar patterns
- Tenant isolation: project graphs filtered by tenantId; ontology graphs are global read-only
- F1107: Navigation pattern matching — compare project flows against canonical flow patterns

**P3-3: Vector Embedding Generation + kNN Indexing (15 min)**
Activate F1108–F1113:
- F1108: Screen embeddings — embed per-screen ScreenSemanticsIR summary (3072-dim)
- F1109: Component embeddings — embed component signatures for cross-project similarity
- F1110: Archetype embeddings — embed screen archetypes for canonical archetype retrieval
- Index type: kNN with HNSW, similarity: cosine, pre-filter: tenantId
- F1111: Screen similarity search — kNN query, k=10, score floor 0.6 (CF-538)
- F1112: Component composition search — find screens with similar component patterns
- F1113: Archetype retrieval — retrieve canonical archetype examples for prompt injection

**Validation:** 
- Global write attempt to system_type_graph → rejected 403 ✅
- Cross-tenant graph query returns zero results ✅
- kNN search returns correct k=10 neighbors with cosine score ✅

**Save Point:** `SESSION_STATE.phases.P3 = COMPLETE`. Graph built + kNN embeddings indexed.

---

## PHASE P4 — MODULE MAPPING + BFA VALIDATION
**Duration: 45 minutes**
**Factories: F1114–F1120 (Family 159)**

### Objective
Map each screen to Genie DNA modules. Check against BFA for cross-flow conflicts.
Produce fabric-first wiring plan and config document requirements.

### Steps

**P4-1: Module Matrix Loading (10 min)**
Activate F1114 (IModuleMatrixLoaderService):
- Load module matrix from Elasticsearch (from module-architecture docs)
- Cache in Redis with 1-hour TTL (DR-189)
- Version tracking: if matrix version changes → invalidate all project mappings (CF-541)

**Matrix Contents:** 20 modules × 15 system types. Per-cell: enabled/typical_behaviors/config_knobs.

**P4-2: Module Candidate Resolution (20 min)**
Activate F1115 (IModuleCandidateResolverService) + F1116 (IConfidenceScoringService):
- Per screen: merge signals from GraphRAG (F1106) + vector similarity (F1111) + DesignIR features
- Compute evidence-based confidence (not LLM self-rating) — formula from DD-252
- Rank candidates; apply confidence floor (0.4 minimum to count as candidate)
- BFA cross-flow check: F1117 (IConstraintCheckExecutorService) queries BFA entity registry
  for conflicts with FLOW-16 Product, FLOW-17 JobPosting, etc. (CF-533)

**P4-3: Wiring Plan + Config Doc Requirements (15 min)**
Activate F1118 (IModuleWiringPlanService) + F1119 (IConfigDocumentRequirementsService):
- Wiring plan: NEVER hardcode system type strings — always produce config doc references (CF-544)
- Config doc requirements: for each required module, specify which Genie DNA config docs needed
  (view_definitions, detail_definitions, form_definitions, cart_rules, etc.)
- Reference canonical schema from module-architecture registry (CF-545)

**Module Mapping Validation Gate (F1120 + F1140 + F1141):**
- F1120: Module validation log — record validation result per screen
- F1140: Dependency constraint gate — Cart without Checkout = DEPENDENCY_VIOLATION → gap (CF-543)
- F1141: Genie DNA module gate — no hardcoded site-type values in wiring plan (CF-544)

**Validation:**
- Hardcoded "system_type = 'shop'" in wiring plan → AF-7 detects + blocks ✅
- Module candidate with 0 evidence → rejected by evidence gate ✅
- FLOW-16 entity collision → BFA_CONFLICT result ✅

**Save Point:** `SESSION_STATE.phases.P4 = COMPLETE`. Module candidates + wiring plan for test file.

---

## PHASE P5 — SYSTEM TYPE INFERENCE + GAP COMPLETION
**Duration: 30 minutes**
**Factories: F1121–F1132 (Families 160–161)**

### Objective
Infer system type (shop / social / hotel / etc.) from aggregate module evidence.
Detect missing modules, screens, and flows. Generate gap report.

### Steps

**P5-1: System Type Inference (15 min)**
Activate F1121–F1126:
- F1121: System type inference — aggregate module evidence across all screens
- F1122: Module evidence aggregator — count + weight module signals per system type
- F1123: Site type signature matcher — compare evidence to system type signatures (global ontology)
- F1124: System type confidence calculator — compute per-candidate confidence
- Minimum 3 classified screens required (CF-542); else INSUFFICIENT_DATA
- Ambiguity check: top-2 candidates within 0.1 confidence → PAUSE for user selection (CF-547)
- F1125: System type ranker — final ranking with ambiguity detection
- F1126: SystemModelIR assembler — compile full SystemModelIR with all screen mappings + evidence

**P5-2: Gap Completion (15 min)**
Activate F1127–F1132:
- F1127: Gap detector — compare inferred modules against module matrix requirements for system type
- F1128: Missing module resolver — for each gap, identify specific missing module + config docs needed
- F1129: Missing screen detector — detect missing screens (Cart exists but no Cart Empty State)
- F1130: Flow gap analyzer — detect broken navigation flows (dead-end paths in UI graph)
- F1131: Gap report builder — compile unified gap report with priorities
- F1132: Stub generation orchestrator — auto-generate DNA-compliant stubs for CRITICAL gaps only (CF-548)

Judge gate (F1142 — pre-wire): evidence → consistency → dependency → DNA gates all run before gap report finalized.

**Validation:**
- 3-screen shop file: correctly identifies system_type=store with confidence >0.7 ✅
- Cart + Product without Checkout: DEPENDENCY_VIOLATION gap = CRITICAL in gap report ✅
- 1-screen file: INSUFFICIENT_DATA (not guessed) ✅
- Ambiguous confidence (social 0.71 vs marketplace 0.68): PAUSE for user input ✅

**Save Point:** `SESSION_STATE.phases.P5 = COMPLETE`. Gap report generated for test file.

---

## PHASE P6 — LEARNING LOOP + ALL QUALITY GATES
**Duration: 30 minutes**
**Factories: F1133–F1142 (Family 162)**

### Objective
Activate feedback correction pipeline and learning loop. Wire all 4 quality gates (F1138–F1142).

### Steps

**P6-1: Feedback Correction Pipeline (10 min)**
Activate F1133–F1135:
- F1133: Feedback correction store — validate audit fields (screenId, before, after, reason, userId, tenantId, timestamp)
  Reject if any field missing (CF-550)
- F1134: Negative exemplar injector — inject corrected mappings as anti-examples into RAG corpus
- F1135: Positive exemplar injector — inject confirmed-correct mappings as positive examples

Consumer group: "figma31-{tenantId}-learning" (separate from analysis pipeline — DR-194)

**P6-2: Benchmark + Learning Loop (10 min)**
Activate F1136–F1137:
- F1136: Label benchmark manager — maintain labeled benchmark set; run accuracy/precision/recall evaluation
- F1137: Learning loop orchestrator — benchmark FIRST, then exemplar injection (CF-549)
  Accuracy drop > 5% → HUMAN_REVIEW_REQUIRED + rollback (CF-551)
- F1116 (confidence scoring): updated with learning cycle results

**P6-3: Quality Gate Wiring (10 min)**
Wire all 4 gates in judgment pipeline (F1142 — IJudgeOrchestrator31Service):
- Gate 1: F1138 (evidence coverage) — every claim has ≥1 evidence item
- Gate 2: F1139 (cross-screen consistency) — entity naming consistent across screens
- Gate 3: F1140 (module dependency constraint) — dependency violations flagged
- Gate 4: F1141 (Genie DNA module gate) — no hardcoded values in wiring plan

Gate sequence: G1 → G2 → G3 → G4. Any CRITICAL failure → build stopped.
Verdict aggregation → promote (GENERATED) or block.

**Validation:**
- Correction missing "reason" field → REJECT ✅
- Benchmark run shows 7% accuracy drop → HUMAN_REVIEW_REQUIRED ✅
- All 4 gates fire correctly on intentional violations ✅
- Benchmark-first sequence enforced (no injection before benchmark completes) ✅

**Save Point:** `SESSION_STATE.phases.P6 = COMPLETE`. All quality gates wired; learning loop active.

---

## PHASE P7 — INTEGRATION + PROMOTION VALIDATION
**Duration: 30 minutes**
**All Factories**

### Objective
Run all 26 stress tests (ST-300–ST-325). Validate end-to-end pipeline on 3 test files.
Promote from GENERATED to INJECTED if all gates pass.

### Steps

**P7-1: Full Pipeline Integration Test (10 min)**
End-to-end run on 3 test Figma files:
1. e-commerce file (3 screens: ProductGrid, ProductDetail, Checkout)
   Expected: system_type=store, Invoices gap detected, confidence >0.85
2. social file (5 screens: Feed, Profile, Post, Chat, Notifications)
   Expected: system_type=social, all core modules detected
3. Ambiguous file (mixed signals — could be marketplace or social)
   Expected: AMBIGUOUS_SYSTEM_TYPE → user pause

**P7-2: Stress Test Execution (15 min)**
Run all 26 stress tests (ST-300–ST-325). Required: 26/26 PASS.
Critical stress tests:
- ST-302 (cross-tenant isolation) — CRITICAL
- ST-306 (hallucination evidence gate) — CRITICAL
- ST-313 (concurrent graph build) — CRITICAL
- ST-323 (accuracy drop human gate) — CRITICAL
- ST-325 (global graph write prevention) — CRITICAL

**P7-3: Promotion Gate (5 min)**
Promotion: GENERATED → INJECTED
Criteria:
- 26/26 stress tests PASS ✅
- CF-510–CF-551: all 42 BFA rules green ✅
- 3 test files processed correctly ✅
- Backward compatibility: T1–T388, F1–F1074 unchanged ✅

**Save Point:** `SESSION_STATE.phases.P7 = COMPLETE`. FLOW-31 promoted to INJECTED.

---

## BACKWARD COMPATIBILITY STATEMENT

All prior artifacts UNCHANGED:
- Task Types T1–T388: ✅ UNCHANGED
- Factories F1–F1074: ✅ UNCHANGED  
- Families 1–153: ✅ UNCHANGED
- Templates 1–82: ✅ UNCHANGED
- BFA Rules CF-1–CF-509: ✅ UNCHANGED
- Stress Tests ST-1–ST-299: ✅ UNCHANGED
- Skills SK-1–SK-250: ✅ UNCHANGED
- Design Decisions DD-1–DD-244: ✅ UNCHANGED
- Design Records DR-1–DR-183: ✅ UNCHANGED

FLOW-31 ADDS ONLY: F1075–F1142, T389–T415, Templates 83–90, CF-510–CF-551, ST-300–ST-325,
                    SK-251–SK-265, DD-245–DD-264, DR-184–DR-197

---

## DEPENDENCY MAP

```
P0 (Ingestion) 
  ↓
P1 (DesignIR)
  ↓
P2 (AI Semantics)  ──────────────┐
  ↓                               │
P3 (Graph + Vectors) ◄────────────┘
  ↓
P4 (Module Mapping + BFA)
  ↓
P5 (System Type + Gap)
  ↓
P6 (Learning Loop + Gates)
  ↓
P7 (Integration + Promotion)
```

P2 and P3 share triggers (both fire after P1 complete). P4 waits for BOTH P2 and P3 (EVENT:graph.built AND EVENT:embeddings.ready per Template 88).
