# FLOW-31 — SKILLS FACTORY RAG
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Skills: SK-251–SK-265 (15 skills)

---

## SKILL FORMAT
```
SKILL: SK-### — Name
PATTERN TYPE: [INGESTION|EXTRACTION|ANALYSIS|SYNTHESIS|RETRIEVAL|VALIDATION|LEARNING]
PURPOSE: What problem this skill solves
FABRIC INTERFACES USED: Which fabrics the skill leverages
REUSABLE IN: Other task types / flows that can use this pattern
IMPLEMENTATION PATTERN: Core algorithm / approach
DNA COMPLIANCE: Which DNA patterns enforced
ALTERNATIVE IMPLEMENTATIONS: Node.js / Python / Rust variants
STATE SAVE TRIGGER: When to checkpoint
```

---

## SK-251 — FigmaIngestSkill

```
SKILL: SK-251 — FigmaIngestSkill
PATTERN TYPE: INGESTION
PURPOSE: Authenticated, rate-limited, version-aware ingestion of Figma design files via REST API + plugin events
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (cache layer, version tracking)
  - QUEUE FABRIC (Skill 04) → Redis Streams (rate-limit token bucket, plugin events)
TASK TYPES USING: T389, T391, T392
REUSABLE IN: Any flow requiring external API ingestion with rate limiting + version tracking (pattern applies to Storybook, Zeroheight, Lottie sources)
IMPLEMENTATION PATTERN:
  1. Check version cache (F1081) → skip if unchanged
  2. Acquire rate-limit token from token bucket (F1082) → block if budget exhausted
  3. Fetch file JSON via REST (F1075) → store in cache with version + tenantId
  4. Fire plugin extraction event to QUEUE FABRIC (F1076) for prototype reactions
  5. Emit ingestion-ready event to QUEUE FABRIC
  KEY: Never fetch without token. Never store without tenantId.
DNA COMPLIANCE:
  - DNA-4 (MicroserviceBase): F1075–F1082 all extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on ALL cache entries + version records
  - DNA-3 (DataProcessResult): all methods return DataProcessResult<T>
  - DNA-1 (ParseDocument): all Figma JSON stored as Dictionary<string,object>
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: Same pattern, axios + ioredis token bucket + @elastic/elasticsearch
  Python: requests + redis-py + elasticsearch-py
  Rust: reqwest + fred (redis) + elasticsearch-rs
STATE SAVE TRIGGER: After step 3 (file cached) — resumable from cache on failure
```

---

## SK-252 — DesignIRBuilderSkill

```
SKILL: SK-252 — DesignIRBuilderSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Transform raw Figma JSON node tree into canonical DesignIR (screens[], components[], designTokens, screenMap, prototypeLinks) with no typed models
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (designir_screens, design_ir, component_catalog, token_map indices)
TASK TYPES USING: T390, T392, T393, T394
REUSABLE IN: Any flow requiring structured extraction from hierarchical JSON without typed models (pattern applies to OpenAPI spec parsing, GraphQL schema extraction)
IMPLEMENTATION PATTERN:
  1. Parse raw JSON → Dictionary<string,object> via ParseDocument (DNA-1)
  2. Traverse node tree → extract screens[], text layers, component instances
  3. Resolve component instances → main component IDs via F1079
  4. Resolve variable bindings → semantic token roles via F1080
  5. Extract prototype reactions → navigation edges via F1076
  6. Assemble master DesignIR document → F1089
  7. Validate completeness → F1090; emit DesignIR-ready event
  KEY: ParseDocument at every step. BuildQueryFilters on all ES queries (DNA-2). Zero typed models.
DNA COMPLIANCE:
  - DNA-1 (ParseDocument): ALL node tree parsing via Dictionary<string,object>
  - DNA-2 (BuildQueryFilters): ALL Elasticsearch queries skip empty fields
  - DNA-3 (DataProcessResult): no exceptions thrown for business logic errors
  - DNA-5 (Scope Isolation): tenantId + fileKey on all documents
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: JSON tree traversal with Map<string,object>
  Python: dict-based traversal, pydantic disabled for this layer
  PHP: array-based (associative arrays as Dictionary equivalent)
STATE SAVE TRIGGER: After each screen processed (incremental — resumable mid-file on large files)
```

---

## SK-253 — ScreenSemanticsExtractionSkill

```
SKILL: SK-253 — ScreenSemanticsExtractionSkill
PATTERN TYPE: ANALYSIS
PURPOSE: Multimodal AI-powered per-screen semantic extraction: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[] using rendered image + pruned node tree + RAG context
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (Skill 07) → AiDispatcher (parallel Claude Vision + GPT-4o)
  - RAG FABRIC (Skill 00b) → IRagService (Hybrid: module signatures + archetype exemplars)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (multiple semantic indices)
TASK TYPES USING: T398, T399, T400
REUSABLE IN: Any flow requiring multimodal AI analysis of visual + structural content with evidence requirement (medical imaging analysis, document understanding, diagram parsing)
IMPLEMENTATION PATTERN:
  1. Render frame image (F1078) → get imageUrl
  2. Build multimodal prompt: pruned node tree + text layers + component names + image + RAG context (F1092)
  3. Dispatch to AiDispatcher → Claude Vision + GPT-4o compete (F1091)
  4. Parse each model output → Dictionary<string,object> (DNA-1)
  5. Classify archetype (F1093), extract entities (F1094), detect actions (F1095)
  6. Build evidence map — every claim linked to nodeId/text/component (F1096)
  7. Validate evidence coverage gate (F1138) → PASS or HUMAN_REVIEW
  8. Generate intent summary (F1097)
  9. Store ScreenSemanticsIR + emit ready event
  KEY: Evidence gate is non-negotiable. Every claim needs evidence.
DNA COMPLIANCE:
  - DNA-1 (ParseDocument): all AI outputs stored as Dictionary<string,object>
  - DNA-4 (MicroserviceBase): all orchestrating services extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on all semantic indices
  - DNA-3 (DataProcessResult): pipeline never throws; all failures → DataProcessResult.Failure
EVIDENCE REQUIREMENT PATTERN (critical):
  Every claim in output MUST have evidence[]:
  { claimType: "module|action|entity", claim: "Cart", evidence: [{nodeId:"5:32", text:"Add to Cart", componentName:"Button/Primary"}] }
  Claims with no evidence → stripped from output and flagged in validation log
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: Same via Anthropic SDK + OpenAI SDK through IAiProvider abstraction
  Python: anthropic + openai clients through IAiProvider
STATE SAVE TRIGGER: After each screen's evidence map validated (per-screen checkpoint)
```

---

## SK-254 — UIGraphBuildSkill

```
SKILL: SK-254 — UIGraphBuildSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Build property graph from DesignIR + SemanticsIRs: Screen/Component/ControlType/Action/Entity nodes with typed edges (CONTAINS, USES, HAS_ACTION, OPERATES_ON, NAVIGATES_TO, VARIANT_OF)
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (ui_graph_nodes, ui_graph_edges, navigation_flows, merged_screen_graph indices)
TASK TYPES USING: T401, T402, T404
REUSABLE IN: Any flow requiring property graph construction from structured documents (BOM graph, API dependency graph, knowledge graph from documents)
IMPLEMENTATION PATTERN:
  1. For each screen: create Screen node with embedding + metadata (F1099, F1100)
  2. For each component instance: create Component node; link CONTAINS edge + VARIANT_OF edge to main component
  3. For each control type: create ControlType node; link USES edge from Screen
  4. For each action: create Action node; link HAS_ACTION edge from Screen
  5. For each entity: create Entity node; link OPERATES_ON edge from Action
  6. For each NAVIGATES_TO prototype reaction: create directed edge Screen→Screen
  7. Merge cross-screen entities (same Order = same node) via F1107
  8. Index all nodes with embeddings for hybrid retrieval
  KEY: TenantId on every node. Entity deduplication across screens.
DNA COMPLIANCE:
  - DNA-1: all node properties as Dictionary<string,object>
  - DNA-5: tenantId + fileKey on all nodes
  - DNA-2: BuildQueryFilters on all graph queries
GRAPH NODE SCHEMA:
  { nodeId, nodeType, tenantId, fileKey, screenId?, label, properties: Dictionary<string,object>, embedding: float[] }
GRAPH EDGE SCHEMA:
  { edgeId, edgeType, sourceNodeId, targetNodeId, tenantId, fileKey, weight?, properties: Dictionary<string,object> }
ALTERNATIVE IMPLEMENTATIONS:
  Neo4j: Cypher CREATE nodes + relationships (still through DATABASE FABRIC IDatabaseService)
  Python: networkx for in-memory graph + ES for persistence
STATE SAVE TRIGGER: After each batch of 50 nodes indexed
```

---

## SK-255 — GraphRAGRetrievalSkill

```
SKILL: SK-255 — GraphRAGRetrievalSkill
PATTERN TYPE: RETRIEVAL
PURPOSE: Multi-hop graph retrieval: vector similarity → graph traversal → constraint pull — combining RAG FABRIC (Graph strategy) with DATABASE FABRIC traversal for architecture-level answers
FABRIC INTERFACES USED:
  - RAG FABRIC (Skill 00b) → IRagService (Graph strategy + Vector strategy)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (graph traversal, module signature lookup)
TASK TYPES USING: T406, T409, T412
REUSABLE IN: Any flow requiring relational retrieval beyond flat similarity (knowledge graph QA, impact analysis, dependency chain lookup)
IMPLEMENTATION PATTERN:
  STEP 1 — Vector similarity (F1111):
    kNN search on screen_embeddings → top-K similar screens
  STEP 2 — Graph traversal from similar screens (F1106):
    For each similar screen: traverse MAPS_TO_MODULE edges → get module candidates
    Traverse REQUIRES_MODULE edges from system_type_graph → get constraints
  STEP 3 — Module signature pull (F1102):
    For each candidate module: retrieve signature subgraph (component types, action types)
  STEP 4 — Constraint validation (F1117):
    Check candidate module set against dependency constraints
  STEP 5 — Aggregate and rank:
    Score = (vector_sim × 0.3) + (graph_hop_score × 0.2) + (evidence_match × 0.5)
  KEY: Never return cross-tenant graph results. BuildQueryFilters(tenantId) always.
DNA COMPLIANCE:
  - DNA-2 (BuildQueryFilters): tenantId filter on every graph query
  - DNA-3 (DataProcessResult): retrieval failures → empty result, never throw
RETRIEVAL RESULT SCHEMA:
  { queryScreenId, results: [{moduleId, confidence, evidence[], graphPath[], vectorSimilarity}] }
ALTERNATIVE IMPLEMENTATIONS:
  Neo4j: native MATCH traversal (still through IDatabaseService)
  Python: graph-tool + ES for hybrid retrieval
STATE SAVE TRIGGER: After vector step complete (expensive); graph traversal checkpointed per hop
```

---

## SK-256 — VectorEmbeddingSkill

```
SKILL: SK-256 — VectorEmbeddingSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Multi-signal vector embedding for screens, components, archetypes; with caching by (id + version + modelId) to prevent redundant embedding
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (Skill 06) → IAiProvider (embedding endpoint)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (dense_vector indices), Redis (embedding cache)
TASK TYPES USING: T405, T406
REUSABLE IN: Any flow requiring embedding generation with deduplication (document similarity, code similarity, entity matching)
IMPLEMENTATION PATTERN:
  1. Check embedding cache (F1113) by key = {entityId}_{version}_{modelId}
  2. If cache hit → return cached embedding
  3. If cache miss:
     a. Build embedding text: concatenate text content + component names + layout type + intent summary
     b. Call IAiProvider.EmbedAsync() → returns float[] (DNA: never call openai.embeddings.create() directly)
     c. Store in Elasticsearch dense_vector field (F1108/F1109/F1110)
     d. Cache in Redis with TTL (F1113)
  4. Return DataProcessResult<Dictionary<string,object>> with embeddingId
  KEY: Cache key must include modelId — different models produce incompatible embeddings.
DNA COMPLIANCE:
  - DNA-4 (MicroserviceBase): F1108–F1113 all extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on all embedding documents
  - DNA-3 (DataProcessResult): embedding failures → DataProcessResult.Failure with reason
CACHE KEY PATTERN: "{entityType}:{entityId}:{version}:{modelId}"
ALTERNATIVE IMPLEMENTATIONS:
  Python: sentence-transformers for local embedding (through IAiProvider abstraction)
  Node.js: OpenAI SDK embedding endpoint (through IAiProvider)
STATE SAVE TRIGGER: After every 100 embeddings generated (batch checkpoint)
```

---

## SK-257 — ModuleMappingSkill

```
SKILL: SK-257 — ModuleMappingSkill
PATTERN TYPE: CLASSIFICATION
PURPOSE: Map each screen to Genie DNA modules using scoring formula: evidence_weight×0.5 + vector_sim×0.3 + graph_hop_score×0.2; validate against module matrix constraints
FABRIC INTERFACES USED:
  - RAG FABRIC (Skill 00b) → IRagService (Hybrid strategy)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (module_candidates, constraint_checks, wiring_plans)
TASK TYPES USING: T408, T409, T411
REUSABLE IN: Any flow requiring constraint-satisfaction classification against a known ontology (product category classification, content type routing, service routing)
IMPLEMENTATION PATTERN:
  1. Load module matrix constraints (F1114) from cache or ES
  2. Execute vector similarity search for screen (SK-255 step 1)
  3. Execute graph traversal for module signatures (SK-255 steps 2-4)
  4. Calculate deterministic evidence match score: count evidence items matching module signature
  5. Combine scores: total = (evidence × 0.5) + (vector_sim × 0.3) + (graph × 0.2)
  6. Filter by confidence floor (admin-configurable FREEDOM)
  7. Run constraint satisfaction check (F1117): dependency rules from module matrix
  8. Store candidates as Dictionary<string,object> in module_candidates index
  9. On full-file completion: build wiring plan (F1118) + config doc requirements (F1119)
  KEY: Scoring formula weights must sum to 1.0. Constraint check is mandatory.
  MODULE MATRIX SCORING EXAMPLE:
    Screen has: ProductCard (component), "Add to Cart" (text), price badge (widget)
    → Cart module: evidence=3 items, vector_sim=0.87 to "Store Checkout" archetype, graph=Cart signature match
    → Cart confidence = (3/5 × 0.5) + (0.87 × 0.3) + (1.0 × 0.2) = 0.30 + 0.26 + 0.20 = 0.76 ✅
DNA COMPLIANCE:
  - DNA-1: all candidate documents as Dictionary<string,object>
  - DNA-2: BuildQueryFilters on all module lookups (tenantId always)
  - DNA-5: scope isolation on all candidate indices
  - DNA-6 (DynamicController): module wiring plan does NOT create entity-specific controllers
WIRING PLAN OUTPUT SCHEMA:
  { fileKey, tenantId, version, screenAssignments: [{ screenId, modules: [{ moduleName, confidence, configDocs: string[] }] }] }
ALTERNATIVE IMPLEMENTATIONS:
  Python: scikit-learn for scoring; Neo4j for constraint graph
STATE SAVE TRIGGER: After each screen's candidates validated (per-screen checkpoint)
```

---

## SK-258 — SystemTypeInferenceSkill

```
SKILL: SK-258 — SystemTypeInferenceSkill
PATTERN TYPE: CLASSIFICATION
PURPOSE: Aggregate per-screen module evidence across all screens to infer system type (shop/social/events/hotel/dashboard/etc.) with calibrated confidence and rationale
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (Skill 07) → AiDispatcher (multi-model competition)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (system_type_inferences, module_evidence_aggregate, site_type_signatures)
TASK TYPES USING: T410
REUSABLE IN: Any flow requiring multi-signal classification at a document/portfolio level by aggregating sub-document classifications (document type inference, project category classification)
IMPLEMENTATION PATTERN:
  1. Aggregate module evidence across all screens (F1122):
     - Count: how many screens show each module?
     - Weight: entry-screen modules weighted 1.5× (they define system intent)
  2. Load site-type signatures (F1123): canonical module sets per system type
  3. Match signatures: cosine similarity between observed module set and each system type signature
  4. Multi-model classification (F1121): Claude + GPT-4o both see aggregated evidence → each votes on top-2 system types
  5. Consistency check (F1124): does inferred system type's required modules match observed?
  6. Rank candidates (F1125): by match_score × consistency_score; flag ambiguous if top < 0.7
  7. Build SystemModelIR (F1126): system_type_candidates, module_map, flows[], entity_map
  KEY: Never "definitive" label if confidence < 0.7. Always include rationale with module evidence.
DNA COMPLIANCE:
  - DNA-3 (DataProcessResult): classification failures never throw
  - DNA-5: tenantId on all inference documents
SYSTEM TYPE SIGNATURES (from module-architecture matrix):
  store: Catalog + Cart + Checkout + Pricing (required); Promotions + Inventory (typical)
  social: Feed + Profile + Engagement (required); Messaging + Events (typical)
  events: Events + Booking + Availability + Cancellation (required); Invoices (typical)
  hotel: Availability + Booking + Cancellation + Invoices (required); Reviews (typical)
  dashboard/report: EntityViewer + Analytics (required); Financial (conditional)
  freelancer: Profile + Marketplace + Messaging + Invoices (required)
ALTERNATIVE IMPLEMENTATIONS:
  Python: sklearn for multiclass scoring + custom signature matching
STATE SAVE TRIGGER: After aggregation step (before multi-model competition)
```

---

## SK-259 — GapCompletionSkill

```
SKILL: SK-259 — GapCompletionSkill
PATTERN TYPE: ANALYSIS
PURPOSE: Detect missing modules/screens/flows by comparing inferred system type + wiring plan against module matrix expectations + flow completeness rules; generate Genie DNA stubs for critical gaps
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (gap_reports, missing_modules, missing_screens, flow_gaps)
  - RAG FABRIC (Skill 00b) → IRagService (Graph strategy, dependency traversal)
  - AI ENGINE FABRIC (Skill 07) → AiDispatcher (stub generation for critical gaps)
  - FLOW ENGINE FABRIC (Skill 09) → IFlowOrchestrator (stub injection)
TASK TYPES USING: T412, T413
REUSABLE IN: Any flow requiring completeness analysis against an ontology (API surface coverage check, test coverage analysis, schema coverage validation)
IMPLEMENTATION PATTERN:
  GAP DETECTION (T412):
  1. Load system type constraints: required modules for detected system type (F1114)
  2. Compare: wiring plan modules vs required modules → missing modules[]
  3. Load module dependency map (F1105): if Cart exists, Checkout must exist OR "cart-only" declared
  4. Check screen completeness: if Checkout module present, Order Confirmation screen must exist
  5. Check flow completeness: all NAVIGATES_TO paths must terminate at a known terminal (not dead-end)
  6. Assign severity: CRITICAL (required module missing), HIGH (dependency violation), MEDIUM (screen missing), LOW (optional recommended)
  7. Build gap report (F1131) → emit gap-found events
  STUB GENERATION (T413 — CRITICAL + HIGH only):
  8. For each critical gap: load module stub template from RAG (SK-255)
  9. Generate config doc stub using AiDispatcher (AF-1): uses module template + system type context
  10. Validate stub: DNA-1 (no typed models), DNA-6 (DynamicController)
  11. Inject as GENERATED-tier artifact into FlowOrchestrator
  12. Run BFA check on stubs before injection (CF-564)
  KEY: NEVER auto-inject stubs without BFA check. CRITICAL gaps block promotion.
DNA COMPLIANCE:
  - All stubs: DNA-1 (ParseDocument), DNA-4 (MicroserviceBase), DNA-6 (DynamicController)
  - GENERATED tier — not CORE or MINIMAL
SEVERITY TAXONOMY:
  CRITICAL: Required module for detected system type is absent
  HIGH: Module dependency constraint violated
  MEDIUM: Complementary screen missing (e.g., empty state, confirmation screen)
  LOW: Optional module recommended by matrix
STATE SAVE TRIGGER: After gap detection complete (before stub generation starts)
```

---

## SK-260 — LearningLoopSkill

```
SKILL: SK-260 — LearningLoopSkill
PATTERN TYPE: LEARNING
PURPOSE: Continuous improvement: corrections → exemplar injection → benchmark evaluation → calibration update; implements AF-11 (Feedback) for FLOW-31
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (feedback_corrections, label_benchmark, confidence_scores)
  - RAG FABRIC (Skill 00b) → IRagService (exemplar injection to retrieval corpus)
  - QUEUE FABRIC (Skill 04) → Redis Streams (correction events, learning cycle events)
  - AI ENGINE FABRIC (Skill 07) → AiDispatcher (benchmark re-scoring)
TASK TYPES USING: T414, T415
REUSABLE IN: Any AI-powered flow requiring continuous improvement from user feedback (AI content pipeline quality improvement, code generation calibration, recommendation refinement)
IMPLEMENTATION PATTERN:
  SINGLE CORRECTION (T414 — AF-11):
  1. Store correction (F1133): screenId, before, after, reason, userId, tenantId, timestamp
  2. Determine exemplar type:
     - Correction says "was wrong" → inject negative exemplar (F1134) tagged with original model output
     - User confirms mapping is correct → inject positive exemplar (F1135)
  3. Queue calibration update event to QUEUE FABRIC
  4. Log to audit trail
  LEARNING CYCLE (T415 — scheduled):
  5. Aggregate all corrections since last cycle
  6. Batch inject accumulated exemplars into RAG corpus (negative + positive)
  7. Run benchmark: score current model against labeled ground truth (F1136)
  8. Compare metrics: accuracy/precision/recall per module; calibration curve
  9. If accuracy drop > 5% → HUMAN_REVIEW required before applying
  10. If pass → update confidence scoring model (F1116)
  11. Store cycle results with modelVersions + timestamp
  KEY: Never apply learning results without benchmark validation. Human review for accuracy drops.
DNA COMPLIANCE:
  - DNA-5: tenantId on all correction + benchmark documents
  - DNA-3: learning failures → DataProcessResult.Failure, never corrupt confidence scores
CORRECTION SCHEMA:
  { correctionId, screenId, fileKey, tenantId, userId, correctionType, before: {}, after: {}, reason, modelOutput: {}, judgeVerdict: {}, timestamp }
BENCHMARK METRICS SCHEMA:
  { cycleId, tenantId, timestamp, modelVersions: {}, metrics: { accuracy, precisionPerModule: {}, recallPerModule: {}, calibrationError }, vsLastCycle: { delta, regressions: [] } }
STATE SAVE TRIGGER: After exemplar injection; before benchmark run (expensive)
```

---

## SK-261 — EvidenceCoverageGateSkill

```
SKILL: SK-261 — EvidenceCoverageGateSkill
PATTERN TYPE: VALIDATION
PURPOSE: Hard quality gate — every AI-inferred claim must reference ≥1 evidence item; implements Evidence Coverage Gate (CF-533); separates AI generation from validation concerns
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (evidence_maps, gate_results)
  - QUEUE FABRIC (Skill 04) → Redis Streams (gate events — PASS/FAIL/HUMAN_REVIEW)
TASK TYPES USING: T399, all AF-9 calls in FLOW-31
REUSABLE IN: Any AI generation flow requiring grounded outputs (medical diagnosis must cite symptoms, legal analysis must cite precedents, code generation must cite requirements)
IMPLEMENTATION PATTERN:
  1. Load ScreenSemanticsIR from ES
  2. For each claim in output (module/action/entity):
     a. Check claim has evidence[] array
     b. Check evidence[] has ≥1 item
     c. Check each evidence item has: nodeId OR textLayer OR componentName
  3. Count: claimsWithEvidence / totalClaims → coverage ratio
  4. Apply policy:
     - coverage = 1.0 → PASS
     - 0.8 ≤ coverage < 1.0 → WARN (non-critical claims allowed without evidence)
     - coverage < 0.8 → FAIL → screen queued for HUMAN_REVIEW
  5. Store gate result in gate_results index
  6. Emit gate event to QUEUE FABRIC
  KEY: CRITICAL claims (module/entity) require coverage = 1.0. Actions can be WARN.
DNA COMPLIANCE:
  - DNA-3: gate failures never throw — always DataProcessResult.Failure with details
  - DNA-5: gate results scoped by tenantId + screenId
GATE RESULT SCHEMA:
  { gateId, screenId, tenantId, verdict: PASS|WARN|FAIL|HUMAN_REVIEW, coverageRatio, failedClaims: [], timestamp }
STATE SAVE TRIGGER: Stateless gate — no save needed per run; results written to ES atomically
```

---

## SK-262 — MultimodalPromptSkill

```
SKILL: SK-262 — MultimodalPromptSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Build structured multimodal prompts combining pruned node tree + text layers + component names + rendered image URL + RAG-retrieved context for AI screen analysis
FABRIC INTERFACES USED:
  - RAG FABRIC (Skill 00b) → IRagService (Hybrid — retrieves module signatures + archetype exemplars as context)
  - AI ENGINE FABRIC (Skill 06) → IAiProvider (prompt dispatch)
TASK TYPES USING: T398
REUSABLE IN: Any flow combining structured data + visual data for AI analysis (document + scan analysis, data sheet + product image analysis)
IMPLEMENTATION PATTERN:
  1. Prune node tree: remove decoration nodes (text="", fills only, no component name, bounding box < 10px)
  2. Extract: text layers[], component instance names[], auto-layout labels[]
  3. Retrieve RAG context (F1092):
     - Vector: top-3 similar screens from archetype embeddings
     - Graph: module signatures for top-3 candidate modules (from deterministic features)
  4. Build prompt XML structure:
     <screen_analysis>
       <node_tree_pruned>{pruned JSON}</node_tree_pruned>
       <text_layers>{text[]}</text_layers>
       <component_instances>{names[]}</component_instances>
       <layout_semantics>{auto-layout labels}</layout_semantics>
       <image_url>{rendered frame URL}</image_url>
       <rag_context>
         <similar_screens>{top-3}</similar_screens>
         <module_signatures>{candidate module signatures}</module_signatures>
       </rag_context>
       <output_schema>{ScreenSemanticsIR JSON schema}</output_schema>
     </screen_analysis>
  5. Add output constraint: "Return ONLY valid ScreenSemanticsIR JSON. Every claim MUST have evidence[]."
  KEY: Include output schema in prompt. Inject evidence requirement explicitly.
DNA COMPLIANCE:
  - DNA-1: prompt construction never creates typed model objects
  - DNA-3: prompt build failures → DataProcessResult.Failure
PROMPT TEMPLATE VARIANTS (FREEDOM):
  technical: verbose node tree, detailed module names
  user-facing: simplified descriptions, business module names
STATE SAVE TRIGGER: After RAG context retrieved (expensive step); prompt build is fast
```

---

## SK-263 — DesignTokenSkill

```
SKILL: SK-263 — DesignTokenSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Resolve Figma variable bindings to semantic token roles (color-primary, spacing-md, heading-1); enable token-aware module matching
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (design_token_map index)
TASK TYPES USING: T392
REUSABLE IN: Any flow processing design system tokens (Storybook token extraction, CSS variable semantic mapping, design-to-code token generation)
IMPLEMENTATION PATTERN:
  1. Fetch all variables/modes from Figma API (F1075)
  2. Build alias resolution chain: variableId → aliasTarget → ... → primitiveValue
  3. Detect cycle (max depth 5): if cycle found → DataProcessResult.Warning
  4. Map resolved value to semantic role via taxonomy:
     - Color tokens: brand.primary, brand.secondary, semantic.success, semantic.error, neutral.XXX
     - Spacing tokens: spacing.xs(4), spacing.sm(8), spacing.md(16), spacing.lg(24), spacing.xl(48)
     - Typography: heading.1-6, body.large/regular/small, label.large/small, caption
  5. Store token map as Dictionary<string,object> in ES (scope: tenant + fileKey)
  6. Return: tokenMap{variableId → {semanticRole, resolvedValue, mode}}
  KEY: Never hardcode resolved values in output (DNA-2 pattern: always reference by semantic role)
DNA COMPLIANCE:
  - DNA-1: token map stored as Dictionary, never as TokenModel
  - DNA-5: token map scoped to tenant + fileKey
SEMANTIC ROLE TAXONOMY (extensible by admin):
  Color: brand.*, semantic.*, neutral.*, elevation.*, on.*
  Spacing: spacing.xs through spacing.xxl
  Typography: heading.*, body.*, label.*, caption.*
STATE SAVE TRIGGER: After alias chain resolution complete; mapping is fast from that point
```

---

## SK-264 — PrototypeFlowExtractionSkill

```
SKILL: SK-264 — PrototypeFlowExtractionSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Extract Figma prototype reactions (triggers + actions) via plugin, build navigation flow graph DAG, detect entry points and flow boundaries
FABRIC INTERFACES USED:
  - QUEUE FABRIC (Skill 04) → Redis Streams (plugin→server event pipeline)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (navigation_flows index)
TASK TYPES USING: T393, T404
REUSABLE IN: Any flow requiring user journey extraction from prototype tools (InVision flow extraction, Marvel prototype parsing, Axure interaction extraction)
IMPLEMENTATION PATTERN:
  1. Listen for plugin extraction event on QUEUE FABRIC (F1076)
  2. Parse reactions per frame: trigger{type, delay} + action{type, destinationId, transition}
  3. Normalize reaction → canonical edge:
     {sourceFrameId, targetFrameId, trigger: "TAP|DRAG|HOVER|KEY|TIMER", actionType: "NAVIGATE_TO|OPEN_OVERLAY|SWAP_STATE|CLOSE|SCROLL_TO"}
  4. Detect entry points: frames with no incoming NAVIGATE_TO edge AND marked as flow starting point
  5. Detect terminals: frames with no outgoing NAVIGATE_TO edges (or explicitly marked terminal)
  6. Build DAG: validate acyclic (BFS cycle detection); if cycle → flag as REVIEW
  7. Store navigation_flow as Dictionary<string,object> in ES: {fileKey, tenantId, flows:[{flowId, entryFrameId, edges:[], terminalFrameIds:[]}]}
  KEY: NEVER direct HTTP to plugin. Always via QUEUE FABRIC. DAG must be validated before storage.
DNA COMPLIANCE:
  - DNA-1: all reaction data as Dictionary
  - DNA-5: flows scoped to tenant + fileKey
  - DNA-4: F1076 extends MicroserviceBase
REACTION TAXONOMY:
  Triggers: ON_CLICK, ON_DRAG, ON_HOVER_IN/OUT, ON_KEY_DOWN, AFTER_TIMEOUT, ON_COMPONENT_ACTION
  Actions: NAVIGATE, OVERLAY (open/close), SCROLL_TO, SWAP (variant), SET_VARIABLE, CONDITIONAL
STATE SAVE TRIGGER: After DAG validation; before ES storage
```

---

## SK-265 — FeedbackCorrectionSkill

```
SKILL: SK-265 — FeedbackCorrectionSkill
PATTERN TYPE: LEARNING
PURPOSE: Structured capture, validation, and routing of user corrections for design intelligence outputs; implements AF-11 feedback loop with audit trail
FABRIC INTERFACES USED:
  - DATABASE FABRIC (Skill 05) → Elasticsearch (feedback_corrections index)
  - QUEUE FABRIC (Skill 04) → Redis Streams (correction events for async processing)
  - RAG FABRIC (Skill 00b) → IRagService (exemplar injection)
TASK TYPES USING: T414
REUSABLE IN: Any AI flow requiring structured human feedback capture with audit trail (content moderation feedback, recommendation correction, classification improvement)
IMPLEMENTATION PATTERN:
  1. Receive correction payload: {screenId, correctionType, before:{}, after:{}, reason, userId}
  2. Validate correction:
     - correctionType ∈ [WRONG_ARCHETYPE, WRONG_MODULE, WRONG_SYSTEM_TYPE, MISSING_GAP, FALSE_GAP]
     - before{} references valid screenId + version in ES
     - after{} is valid ScreenSemanticsIR fragment (schema check)
  3. Enrich correction: add {tenantId, timestamp, modelOutput, judgeVerdict} from ES lookup
  4. Store in feedback_corrections index (scope: tenant)
  5. Emit correction event to QUEUE FABRIC → async processing
  6. On processing:
     a. Determine exemplar type: before was wrong → negative; after is confirmed → positive
     b. Route to F1134 (negative) or F1135 (positive) exemplar injector
     c. Check if correction count threshold crossed → queue T415 learning cycle
  7. Acknowledge correction to caller with DataProcessResult.Success
  KEY: Audit trail is mandatory (userId + timestamp always). Never silently drop corrections.
DNA COMPLIANCE:
  - DNA-5: corrections scoped to tenant
  - DNA-3: correction failures → DataProcessResult.Failure with reason
  - DNA-4: F1133–F1135 extend MicroserviceBase
CORRECTION TYPE ROUTING:
  WRONG_ARCHETYPE → negative on archetype classification output → positive on correct archetype
  WRONG_MODULE → negative on module candidate → positive on correct module + update evidence map
  WRONG_SYSTEM_TYPE → negative on system type inference → positive on correct type
  MISSING_GAP → positive exemplar: "this gap IS critical for this system type"
  FALSE_GAP → negative exemplar: "this gap is NOT critical for this system type"
STATE SAVE TRIGGER: After step 4 (stored to ES) — correction is durable; async processing can retry
```

---

## SKILL DEPENDENCY MAP

```
SK-251 (FigmaIngest) → SK-252 (DesignIRBuilder)
SK-252 → SK-253 (ScreenSemantics) + SK-263 (DesignToken) + SK-264 (PrototypeFlow)
SK-253 → SK-261 (EvidenceCoverageGate) + SK-262 (MultimodalPrompt)
SK-261 → SK-254 (UIGraphBuild)
SK-254 → SK-255 (GraphRAGRetrieval) + SK-256 (VectorEmbedding)
SK-255 + SK-256 → SK-257 (ModuleMapping)
SK-257 → SK-258 (SystemTypeInference)
SK-258 → SK-259 (GapCompletion)
SK-259 → SK-260 (LearningLoop)
SK-260 → SK-265 (FeedbackCorrection) [bidirectional — corrections feed SK-260]
```

---

## AF STATION MAPPING FOR FLOW-31

| AF Station | Role in FLOW-31 |
|-----------|-----------------|
| AF-1 Genesis | Generates ScreenSemanticsIR (T398), stub config docs (T413), intent summaries (T400) |
| AF-2 Planning | Decomposes large files into screen batches (T389), identifies user flows (T404) |
| AF-3 Prompt Library | Retrieves module signature prompts for T398 multimodal prompt |
| AF-4 RAG Task Context | Hybrid retrieval for T398 (archetype exemplars + module signatures), T409 (GraphRAG) |
| AF-5 Multi-model | Competing models for T398 (Claude Vision + GPT-4o), T410 (system type), T415 (benchmark) |
| AF-6 Code Review | Validates generated stubs (T413) — structure review |
| AF-7 Compliance | DNA-1 check (no typed models) everywhere; DNA-5 (scope isolation) |
| AF-8 Security | PII check in Figma file metadata (T389); image URL policy (T391); stub security (T413) |
| AF-9 Judge | Evidence coverage gate (T399), schema validity, constraint satisfaction, gap severity |
| AF-10 Merge | Combines competing ScreenSemanticsIR outputs (T398), system type votes (T410) |
| AF-11 Feedback | T414 single correction injection; T415 learning cycle orchestration |
