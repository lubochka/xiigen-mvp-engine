# FLOW-31 — UNIFIED SOURCE INDEX
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Design Decisions: DD-245–DD-264 (20)
## Design Records: DR-184–DR-197 (14)
## Templates: 83–90 (8 JSON DAG flow definitions)
## Date: 2026-03-01

---

## STARTING NUMBERS (FLOW-31)
```
Design Decision: DD-245   (ends DD-264)
Design Record:   DR-184   (ends DR-197)
Template:        83       (ends 90)
```

---

## SECTION 1 — DESIGN DECISIONS (DD-245–DD-264)

### Zone A — Ingestion & IR Architecture Decisions (DD-245–DD-250)

```
DD-245 : FIGMA_REST_PLUS_PLUGIN_DUAL_INGESTION
  DECISION: Use BOTH Figma REST API (F1075) AND Figma Plugin (F1076) for ingestion.
  RATIONALE: REST API provides node tree + component library but misses prototype reactions,
             local variables, and auto-layout details only accessible via plugin bridge.
             Plugin fills REST gaps. Dual ingestion = complete DesignIR.
  ALTERNATIVES CONSIDERED:
    A) REST only — loses prototype reactions (critical for flow detection)
    B) Plugin only — unreliable in CI/server environments
  SELECTED: REST-primary + Plugin-supplement (plugin events queued via Redis Streams F1076)
  TRADE-OFFS: Extra complexity of plugin event pipeline vs completeness of DesignIR
  MACHINE IMPACT: Both paths always active; plugin results merged into REST output
  FREEDOM IMPACT: Admin can disable plugin supplement if plugin deployment not feasible
  REFERENCES: F1075, F1076, T389, T392, T393

DD-246 : DESIGNIR_AS_DICTIONARY_ONLY
  DECISION: DesignIR, ScreenSemanticsIR, SystemModelIR are all Dictionary<string,object>.
            Zero typed model classes at any IR layer.
  RATIONALE: DNA-1 (ParseDocument) is non-negotiable. Figma schema evolves constantly;
             typed models break on schema changes. Dictionary approach is schema-forward compatible.
  ALTERNATIVES CONSIDERED:
    A) Typed models with [JsonExtensionData] for unknown fields — still breaks on rename
    B) Partial typing with Dictionary<string,object> for unknown fields — adds complexity
  SELECTED: Pure Dictionary<string,object> throughout all IR layers
  TRADE-OFFS: Less IntelliSense in generated service code vs permanent schema resilience
  IRON RULE: CF-516 enforces this; AF-7 gate validates
  REFERENCES: F1077, F1083–F1090, T390, T395–T397, CF-516

DD-247 : THREE_LAYER_IR_ARCHITECTURE
  DECISION: DesignIR (structural) → ScreenSemanticsIR (per-screen functional) → SystemModelIR (global)
            is the canonical IR pipeline. No shortcutting from DesignIR to SystemModelIR.
  RATIONALE: Each layer produces independently queryable artifacts stored in Elasticsearch.
             Skipping ScreenSemanticsIR means no per-screen evidence maps — makes hallucination
             detection (CF-528) impossible.
  ALTERNATIVES CONSIDERED:
    A) One-shot: DesignIR → SystemModelIR directly (cheaper but no per-screen auditability)
    B) Two layers: DesignIR → ScreenSemanticsIR → SystemModelIR (selected)
  SELECTED: Three-layer (as designed). Middle layer is mandatory.
  REFERENCES: F1083–F1090, F1091–F1098, F1121–F1126, T395–T415

DD-248 : SCREEN_FINGERPRINT_FOR_CHANGE_DETECTION
  DECISION: F1087 (IScreenFingerprintService) computes a hash of component composition
            per screen. Used as cheap change-detection mechanism before re-processing.
  RATIONALE: Avoids expensive AI re-processing for screens that haven't materially changed.
             Component composition hash is deterministic and fast to compute.
  HASH INPUTS: sorted list of (componentId, instanceCount) tuples + layout primitive set
  STABILITY: Stable for visual restyling (color/font changes); unstable for structural changes
  TRADE-OFFS: May miss purely textual content changes — acceptable since text changes
             don't change module mapping (unless new action-triggering text added)
  REFERENCES: F1087, T394, CF-526

DD-249 : PROTOTYPE_LINKS_AS_FIRST_CLASS_FLOW_EDGES
  DECISION: Figma prototype reactions (navigate, overlay, swap) are treated as FLOW EDGES
            in the UI graph, not as optional metadata.
  RATIONALE: Navigation flows are the primary signal for "does this system have a checkout flow?",
             "is there a profile→settings path?", etc. Without flow edges, gap detection
             for missing screens is impossible.
  EXTRACTION: F1076 (plugin) extracts reactions; F1088 (interaction semantics) classifies
              trigger type (tap→navigate vs tap→overlay vs drag→swap)
  REFERENCES: F1076, F1088, F1100, F1104, T392, T393, CF-522

DD-250 : VERSIONED_INGESTION_AS_IMMUTABLE_SNAPSHOTS
  DECISION: Each ingestion run creates an IMMUTABLE snapshot indexed by (tenantId, fileKey, version).
            Re-runs don't overwrite; they create new snapshot documents.
  RATIONALE: Enables comparison between design versions; enables learning loop to track how
             design evolved and how module mappings changed over time.
  STORAGE IMPACT: Higher ES storage but enables historical queries
  FREEDOM: Admin configures snapshot retention policy (e.g., keep last 10 versions)
  REFERENCES: F1081, T389, CF-514
```

---

### Zone B — AI & RAG Architecture Decisions (DD-251–DD-256)

```
DD-251 : HYBRID_RAG_MANDATORY
  DECISION: Both Vector RAG (Family 158) and GraphRAG (Family 157) are ALWAYS run during
            module mapping. Neither is optional.
  RATIONALE: Vector RAG catches "this looks like X we've seen before" (similarity).
             GraphRAG enforces "if Cart exists, Checkout should exist" (constraints).
             Either alone misses critical signals. Hybrid = complementary coverage.
  RAG FABRIC STRATEGY: IRagService routes to "Multi" strategy which internally invokes
                       both Graph and Vector sub-strategies.
  TRADE-OFFS: Higher cost per analysis vs lower hallucination rate, better gap detection
  REFERENCES: Skills 00a/00b, F1099–F1113, T401–T406, CF-536

DD-252 : EVIDENCE_BASED_CONFIDENCE_SCORING
  DECISION: Module candidate confidence scores are COMPUTED from evidence count + quality,
            NOT from LLM self-reported confidence.
  RATIONALE: LLMs consistently over-report confidence. Evidence-based scoring anchors
             confidence to verifiable artifacts (nodeId, component name, text).
  FORMULA: confidence = (distinct_evidence_count × 0.4) + (evidence_quality_score × 0.4)
           + (llm_self_confidence × 0.2)
  Evidence quality score: "component name match" > "text label match" > "layout pattern match"
  REFERENCES: F1116, T409, CF-546, CF-528

DD-253 : MULTIMODAL_REQUIRED_FOR_COMPLEX_SCREENS
  DECISION: Any screen with estimated height ≥500px OR > 20 nodes requires multimodal
            (image + node tree) analysis. Text-only analysis is forbidden for these screens.
  RATIONALE: Complex screens have spatial relationships (sidebar vs main content, tab vs
             modal, hero vs grid) that are ambiguous from node tree alone.
             Image provides spatial context LLMs cannot infer from tree structure.
  COST IMPACT: Vision models cost ~3x text models per token
  FREEDOM: Threshold (500px / 20 nodes) configurable by admin
  REFERENCES: F1092, F1078, T398, CF-530

DD-254 : GRAPHRAG_PROJECT_VS_ONTOLOGY_SPLIT
  DECISION: Two types of graphs with different access modes:
            (A) PROJECT GRAPHS (tenant-scoped, read-write): ui_graph, navigation_flows, module_candidates
            (B) ONTOLOGY GRAPHS (global, read-only): system_type_graph, module_dependency_graph
  RATIONALE: Project graphs are tenant-specific analysis artifacts.
             Ontology graphs encode universal knowledge (module dependencies, system type signatures)
             shared across all tenants. Mixing write permissions is a data integrity risk.
  IRON RULE: CF-539 enforces read-only on ontology graphs at runtime
  REFERENCES: F1099–F1107, CF-539, ST-325

DD-255 : UNCLASSIFIED_SCREENS_NEVER_GUESSED
  DECISION: Screens where ALL archetype candidates score below 0.4 confidence are tagged
            UNCLASSIFIED. They are NEVER assigned the highest-scoring candidate as default.
  RATIONALE: Forcing a classification below confidence floor introduces false evidence into
             the system type inference → cascades into wrong gap detection.
             "Don't know" is better than "wrong confidence."
  UX: UNCLASSIFIED screens surfaced to user for manual classification. Suggestions provided
      as "weak signals" but not auto-applied.
  REFERENCES: F1093, T398, CF-529, ST-307

DD-256 : THREE_SCREEN_MINIMUM_FOR_SYSTEM_TYPE
  DECISION: System type inference (T412) requires minimum 3 classified screens.
            Single-screen and 2-screen projects return INSUFFICIENT_DATA.
  RATIONALE: System type signatures (store, social, hotel, etc.) require multi-screen evidence.
             Single screen "ProductCard" could be a shop, a marketplace, a directory, or even
             a dashboard widget. Multi-screen cooccurrence removes ambiguity.
  REFERENCES: F1121, T412, CF-542, ST-316
```

---

### Zone C — Module Mapping & Gap Completion Decisions (DD-257–DD-261)

```
DD-257 : MODULE_MATRIX_AS_GROUND_TRUTH_ONTOLOGY
  DECISION: The module-architecture matrix (DEFINITIVE_MODULE_ARCHITECTURE.md,
            GENERIC_MODULE_ANALYSIS_COMPLETE.md) is the canonical ontology for:
            (a) which modules exist per system type
            (b) module dependency rules
            (c) required vs optional modules per system type
  RATIONALE: Using an external ontology (not LLM-generated) ensures stable, auditable
             module definitions. LLMs retrieve from this ontology — they don't define it.
  LOADING: F1114 (IModuleMatrixLoaderService) loads matrix into ES on startup; versioned.
  REFERENCES: F1114, F1105, T407, CF-541

DD-258 : FABRIC_FIRST_WIRING_PLAN
  DECISION: Module wiring plan output (F1118) contains ONLY references to config document
            IDs in Elasticsearch. Never hardcoded site-type values, module names, or
            platform-specific strings.
  RATIONALE: DNA-6 (DynamicController/fabric-first). Wiring plan is the "code" that
             the engine injects — it must be free of any hardcoded decisions.
             All values flow from FREEDOM layer config docs.
  EXAMPLES:
    WRONG: { "system_type": "shop", "cart_module": "enabled" }
    RIGHT: { "config_doc_ref": "figma31::tenant1::wiring::abc123" }
  REFERENCES: F1118, CF-544, ST-318

DD-259 : GAP_SEVERITY_TAXONOMY
  DECISION: Four severity levels for detected gaps:
            CRITICAL — dependency constraint violated (Cart without Checkout)
            HIGH     — system-type required module missing (Shop without ProductList)
            MEDIUM   — common module absent (EmptyState, ErrorState, Loading screens)
            LOW      — nice-to-have (404 page, Onboarding flow)
  RATIONALE: Flat severity leads to alert fatigue. Tiered severity lets users triage.
  AUTO-STUB: Only CRITICAL gaps get auto-stub generation by default (CF-548).
  REFERENCES: F1127, T413, CF-548, DD-260

DD-260 : AUTO_STUB_OPT_IN_FOR_NON_CRITICAL
  DECISION: Auto-stub generation for MEDIUM and LOW severity gaps requires explicit
            admin opt-in via FREEDOM config (auto_stub_severities array).
            Default = ["CRITICAL"] only.
  RATIONALE: Medium/Low gaps may reflect intentional design decisions (e.g., "no 404 page
             because we handle all routes"). Auto-generating stubs for these would create
             noise and waste developer review time.
  REFERENCES: F1132, T413, CF-548, ST-320

DD-261 : AMBIGUOUS_SYSTEM_TYPE_USER_GATE
  DECISION: When top-2 system type candidates are within 0.1 confidence of each other,
            pipeline PAUSES and presents both to user for selection. Does NOT auto-resolve.
  RATIONALE: System type choice propagates through ALL gap detection. Wrong auto-selection
             generates wrong gap report (e.g., detecting "missing Stories screen" on a
             marketplace that happens to have a feed).
  UX: Both candidates shown with supporting evidence. User picks one. Pipeline continues.
  REFERENCES: F1125, T412, T413, CF-547, ST-317
```

---

### Zone D — Learning Loop Decisions (DD-262–DD-264)

```
DD-262 : NEGATIVE_EXEMPLAR_INJECTION_THRESHOLD
  DECISION: A correction is only injected as a negative exemplar into the RAG corpus
            after it has been validated by a human reviewer (or after 3 identical corrections
            from different users on the same screen type).
  RATIONALE: Single incorrect corrections (user error, misunderstanding) should not
             corrupt the training corpus. Threshold prevents noise injection.
  FREEDOM: Threshold configurable (default: 1 human-validated OR 3 unvalidated identical)
  REFERENCES: F1134, T414, CF-549

DD-263 : BENCHMARK_AS_REGRESSION_GATE
  DECISION: The label benchmark (F1136) is run AFTER every learning cycle application.
            If accuracy drops >5%, changes are ROLLED BACK and HUMAN_REVIEW triggered.
  RATIONALE: Learning loops can cause regression (feedback poisoning, adversarial corrections).
             Automated rollback + human gate protects system accuracy.
  METRICS TRACKED: accuracy per module type, precision/recall per module, calibration curve
  REFERENCES: F1136, F1137, T415, CF-551, ST-323

DD-264 : CROSS_TENANT_EXEMPLAR_PRIVACY
  DECISION: Positive and negative exemplars are stored with tenantId scope.
            No cross-tenant exemplar sharing by default (even if exemplars would benefit all).
  RATIONALE: Figma designs may contain proprietary UX patterns. Sharing exemplars cross-tenant
             creates IP leakage risk.
  EXCEPTION: Tenants may opt-in to anonymized global exemplar pool (admin config).
             Anonymization strips all tenant-specific text/component names, keeping only
             structural patterns (layout primitives, module signature hash).
  REFERENCES: F1134, F1135, CF-536
```

---

## SECTION 2 — DESIGN RECORDS (DR-184–DR-197)

```
DR-184 : FIGMA_API_RATE_LIMIT_ARCHITECTURE
  DATE: 2026-03-01
  DECISION MADE: Use Redis token bucket (F1082) as rate-limit guard for all Figma API calls.
  CONTEXT: Figma REST API has per-seat rate limits (60 req/min for editor seats, 30 for viewer).
           Multiple tenant pipelines sharing same API key can exhaust quota.
  IMPLEMENTATION:
    - F1082 maintains per-(tenantId, apiKeyTier) token buckets in Redis
    - Token refill: 60/min for editor, 30/min for viewer
    - T389 acquires token via QUEUE FABRIC before each API batch
    - Failure to acquire token = exponential backoff, max 3 retries, then QUEUE event for retry later
  STATUS: ACCEPTED
  REFERENCES: F1082, CF-512, ST-300

DR-185 : DESIGNIR_ELASTICSEARCH_INDEXING_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: Each DesignIR layer (structural, semantic, system model) gets dedicated ES indices.
                 No co-mingling of IR layers in same index.
  CONTEXT: Co-mingled indices cause query performance degradation when filtering by IR type.
           Dedicated indices allow per-type retention policies and independent scaling.
  INDICES DEFINED:
    designir_screens (F1083), ui_controls (F1084), layout_semantics (F1085),
    component_signatures (F1086), screen_fingerprints (F1087), interaction_semantics (F1088),
    design_ir (F1089), ir_validation_log (F1090)
  STATUS: ACCEPTED
  REFERENCES: F1083–F1090, DD-247

DR-186 : GRAPHRAG_NEO4J_VS_ELASTICSEARCH
  DATE: 2026-03-01
  DECISION MADE: Use DATABASE FABRIC (IDatabaseService) with Elasticsearch as initial graph store
                 for UI graphs. Neo4j available as optional provider via FREEDOM config.
  CONTEXT: Neo4j provides native graph traversal (Cypher) but adds operational complexity.
           Elasticsearch with nested documents + parent-join handles the graph traversal needs
           for FLOW-31's query patterns (module dependency traversal, navigation flow queries).
           Factory F1105 (IModuleDependencyGraphService) resolves through DATABASE FABRIC.
  TRADE-OFFS: ES graph queries slower than Cypher for deep traversal (>5 hops) but sufficient
              for the module dependency graph (max 3 hops in practice).
  ESCALATION: If graph query performance becomes a bottleneck, swap to Neo4j provider via
              FREEDOM config without code change (IDatabaseService fabric).
  STATUS: ACCEPTED — ES first, Neo4j as escalation path
  REFERENCES: F1099–F1107, DD-254

DR-187 : VECTOR_EMBEDDING_PROVIDER
  DATE: 2026-03-01
  DECISION MADE: Use IAiProvider (AI ENGINE FABRIC) for all embedding generation.
                 OpenAI text-embedding-3-large as default; configurable via FREEDOM.
  CONTEXT: Embedding generation must be provider-agnostic for same reasons as text generation.
           All embedding calls go through IAiProvider.EmbedAsync() — same fabric as generation.
  EMBEDDING DIMENSIONS: 3072 (text-embedding-3-large); stored in ES with knn index
  FREEDOM: Admin can configure embedding model (e.g., Cohere, Voyage AI, local Ollama) via fabric
  STATUS: ACCEPTED
  REFERENCES: F1108–F1113, T405, T406

DR-188 : SCREEN_SIMILARITY_SEARCH_KNN
  DATE: 2026-03-01
  DECISION MADE: Screen similarity search (F1111) uses Elasticsearch kNN vector search.
                 k=10 nearest neighbors; score floor 0.6 (CF-538).
  CONTEXT: kNN in ES 8.x supports HNSW index with efficient approximate nearest neighbor search.
           No separate vector database needed — embedded in existing ES fabric.
  INDEX: screen_embeddings with knn mapping { dims: 3072, similarity: cosine }
  FILTER: tenantId applied as pre-filter (exact match) before kNN — ES 8.x native pre-filter support
  STATUS: ACCEPTED
  REFERENCES: F1111, CF-537, CF-538, DR-187

DR-189 : MODULE_MATRIX_LOADING_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: Module matrix loaded from Elasticsearch at service startup by F1114.
                 Cached in-memory (Redis) with 1-hour TTL. Version tracked per cache entry.
  CONTEXT: Module matrix is large (~20 modules × 15 site types = 300 cells with configuration).
           Loading per-request is too expensive. Caching is required.
  VERSION TRACKING: Each matrix document has schema_version field.
                    F1114 invalidates cache if matrix version changes (admin-triggered).
  STATUS: ACCEPTED
  REFERENCES: F1114, CF-541, DD-257

DR-190 : EVIDENCE_GATE_MINIMUM_THRESHOLDS
  DATE: 2026-03-01
  DECISION MADE: Evidence coverage gate (F1138) minimum thresholds by claim type:
    module_candidate: ≥2 distinct evidence items required (nodeId + text OR component name)
    user_action: ≥1 evidence item required (text label minimum)
    data_entity: ≥1 evidence item required (text label minimum)
    archetype: ≥3 evidence items required (layout pattern + widget + text minimum)
  CONTEXT: Archetype claims have highest downstream impact (gates system type inference).
           Higher threshold prevents confident hallucination on archetypes.
  STATUS: ACCEPTED
  REFERENCES: F1138, CF-528, DD-252

DR-191 : FLOW_TEMPLATE_DAG_STRUCTURE
  DATE: 2026-03-01
  DECISION MADE: 8 flow templates (Templates 83–90) map to 8 sub-pipelines.
                 Main orchestration template (Template 83) calls sub-pipeline templates.
                 Each step in DAG references factory interface via CreateAsync().
  STRUCTURE:
    Template 83 (figma-ingestion-v1.json):        T389→T390→T391→T392→T393→T394
    Template 84 (designir-processing-v1.json):     T395→T396→T397 (per-screen batch)
    Template 85 (screen-semantics-v1.json):        T398→T399→T400 (per-screen, parallelizable)
    Template 86 (graph-build-v1.json):             T401→T402→T403→T404
    Template 87 (vector-embedding-v1.json):        T405→T406
    Template 88 (module-mapping-v1.json):          T407→T408→T409→T410→T411
    Template 89 (gap-completion-v1.json):          T412→T413
    Template 90 (learning-loop-v1.json):           T414→T415
  STATUS: ACCEPTED
  REFERENCES: Templates 83–90, Skills 08/09

DR-192 : PER_SCREEN_PARALLELIZATION_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: ScreenSemanticsIR extraction (Template 85, T398–T400) runs per-screen in parallel,
                 limited to max 10 concurrent screens per tenant.
  CONTEXT: A file with 200 screens cannot be processed sequentially (would take hours at ~10s/screen).
           Parallelization is required but must be bounded to prevent AI provider quota exhaustion.
  ORCHESTRATION: FlowOrchestrator (Skill 09) spawns parallel sub-flows, one per screen.
                 Redis Streams tracks completion; main flow waits on allSettled.
  FREEDOM: max_concurrent_screens configurable (default 10)
  STATUS: ACCEPTED
  REFERENCES: F1091–F1098, T398, Templates 85, DR-193

DR-193 : ALLSETTLED_PATTERN_FOR_SCREEN_BATCH
  DATE: 2026-03-01
  DECISION MADE: Screen batch processing uses allSettled (not allResolved) pattern.
                 Failed screens are collected; pipeline continues with succeeded screens.
  CONTEXT: A single screen failing multimodal extraction should not block all 199 other screens.
           Partial success is acceptable; full failure is escalated.
  PARTIAL_COMPLETE: CF-527 defines PARTIAL_COMPLETE state handling.
  REFERENCES: T397, CF-527, DR-192

DR-194 : LEARNING_LOOP_ISOLATION_FROM_ANALYSIS_PIPELINE
  DATE: 2026-03-01
  DECISION MADE: Learning loop (Template 90, T414–T415) runs on a SEPARATE queue consumer group
                 from the analysis pipeline (Templates 83–89).
  CONTEXT: Learning loop is background, non-urgent. Analysis pipeline is user-facing, urgent.
           Shared consumer group = learning loop starves analysis pipeline during high-load periods.
  QUEUE SEPARATION: Analysis: consumer group "figma31-{tenantId}-analysis"
                    Learning: consumer group "figma31-{tenantId}-learning"
  STATUS: ACCEPTED
  REFERENCES: F1137, CF-549, Template 90

DR-195 : UNCLASSIFIED_SCREEN_HANDLING
  DATE: 2026-03-01
  DECISION MADE: UNCLASSIFIED screens are stored in ES with status="unclassified" and surfaced
                 to admin UI in "Review Queue" section. They are excluded from system type inference
                 but included in gap detection as "unknown" (in case they were supposed to be
                 a specific screen type).
  CONTEXT: UNCLASSIFIED screens may represent genuinely novel UX patterns not in ontology.
           They should be visible for human classification, which feeds the learning loop.
  REFERENCES: F1093, T398, CF-529, DD-255

DR-196 : BFA_REGISTRATION_SCOPE
  DATE: 2026-03-01
  DECISION MADE: FLOW-31 registers in BFA:
    ENTITIES: DesignFile, FigmaScreen, ScreenSemantics, UIGraph, ModuleCandidate, SystemModel, GapReport
    EVENTS: ingestion.completed, semantics.extracted, module.mapped, system-type.inferred, gap.detected,
            correction.submitted, learning-cycle.completed
    APIs: /api/flow31/ingest, /api/flow31/status/{fileKey}, /api/flow31/results/{fileKey},
          /api/flow31/corrections, /api/flow31/gaps/{fileKey}
  CONFLICT CHECKS AGAINST: FLOW-15, FLOW-16, FLOW-17, FLOW-18, FLOW-22, FLOW-23, FLOW-25
  STATUS: ACCEPTED
  REFERENCES: T389, T411, T413, CF-510–CF-551

DR-197 : FLOW31_PROMOTION_LADDER_ENTRY
  DATE: 2026-03-01
  DECISION MADE: FLOW-31 generated services enter at GENERATED level.
                 Promotion path: GENERATED → INJECTED (after benchmark passes) → MINIMAL (after
                 3 projects successfully processed) → CORE (after cross-tenant validation complete).
  PROMOTION GATES:
    GENERATED→INJECTED: All 26 stress tests passing; CF-510–CF-551 all green
    INJECTED→MINIMAL: 3 real projects analyzed, learning loop cycle completed once
    MINIMAL→CORE: Cross-tenant isolation validated; accuracy benchmark ≥0.85
  STATUS: ACCEPTED
  REFERENCES: CF-551, DD-263
```

---

## SECTION 3 — FLOW TEMPLATES (83–90)

### Template 83 — figma-ingestion-v1.json
```json
{
  "id": "figma-ingestion-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Figma file ingestion gate — structural extraction and DesignIR preparation",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T389",
      "factory": "F1075",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC",
      "description": "Figma full-file ingestion gate — rate-limit token acquisition + API fetch + version check",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T390",
      "factory": "F1077",
      "fabric": "DATABASE_FABRIC",
      "description": "Node tree normalization — parse raw JSON → canonical Dictionary node tree",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T391",
      "factory": "F1078",
      "fabric": "AI_ENGINE_FABRIC + DATABASE_FABRIC",
      "description": "Image rendering — render frames to PNG for multimodal AI input",
      "onSuccess": "step-4",
      "onFailure": "retry-3"
    },
    {
      "id": "step-4",
      "taskType": "T392",
      "factory": "F1076",
      "fabric": "QUEUE_FABRIC",
      "description": "Plugin data extraction — prototype reactions + local variables via plugin bridge",
      "onSuccess": "step-5",
      "onFailure": "warn-continue"
    },
    {
      "id": "step-5",
      "taskType": "T393",
      "factory": "F1088",
      "fabric": "DATABASE_FABRIC",
      "description": "Prototype flow mapping — build navigation graph from reactions",
      "onSuccess": "step-6",
      "onFailure": "DLQ"
    },
    {
      "id": "step-6",
      "taskType": "T394",
      "factory": "F1087",
      "fabric": "DATABASE_FABRIC",
      "description": "Screen fingerprinting — compute component composition hashes for change detection",
      "onSuccess": "EMIT:ingestion.completed",
      "onFailure": "DLQ"
    }
  ],
  "parallelism": "sequential",
  "errorPolicy": "DataProcessResult<T> — never throw, always return Failure state"
}
```

### Template 84 — designir-processing-v1.json
```json
{
  "id": "designir-processing-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "DesignIR assembly per screen — layout semantics, component signatures, IR validation",
  "trigger": "EVENT:ingestion.completed",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T395",
      "factory": "F1083, F1084, F1085, F1086",
      "fabric": "DATABASE_FABRIC",
      "description": "Per-screen DesignIR extraction — layout primitives, widget detection, component signatures",
      "parallelism": "per-screen, max 10 concurrent",
      "onSuccess": "step-2",
      "onFailure": "PARTIAL_COMPLETE"
    },
    {
      "id": "step-2",
      "taskType": "T396",
      "factory": "F1088, F1089",
      "fabric": "DATABASE_FABRIC",
      "description": "DesignIR assembly — merge screen-level artifacts into file-level DesignIR",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T397",
      "factory": "F1090",
      "fabric": "DATABASE_FABRIC",
      "description": "IR validation gate — completeness check (screens[], components[], designTokens, screenMap, prototypeLinks)",
      "onSuccess": "EMIT:designir.ready",
      "onFailure": "BLOCK:incomplete-IR"
    }
  ]
}
```

### Template 85 — screen-semantics-v1.json
```json
{
  "id": "screen-semantics-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Per-screen semantic extraction — multimodal AI → ScreenSemanticsIR with evidence",
  "trigger": "EVENT:designir.ready",
  "parallelism": "per-screen, max 10 concurrent (allSettled)",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T398",
      "factory": "F1091, F1092, F1093",
      "fabric": "AI_ENGINE_FABRIC + DATABASE_FABRIC",
      "description": "ScreenSemanticsIR extraction — multimodal prompt → archetype + controls + actions + entities + evidence",
      "requires": ["imageUrl from T391", "nodeTree from T390"],
      "onSuccess": "step-2",
      "onFailure": "UNCLASSIFIED"
    },
    {
      "id": "step-2",
      "taskType": "T399",
      "factory": "F1094, F1095, F1096",
      "fabric": "DATABASE_FABRIC",
      "description": "Entity + action mapping — normalize entities/actions; build evidence map",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T400",
      "factory": "F1097, F1098",
      "fabric": "DATABASE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Semantic IR validation — evidence coverage gate + schema completeness check",
      "onSuccess": "EMIT:semantics.extracted",
      "onFailure": "BLOCK:evidence-gate-fail"
    }
  ]
}
```

### Template 86 — graph-build-v1.json
```json
{
  "id": "graph-build-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "UI graph construction — nodes, edges, module signatures, GraphRAG retrieval",
  "trigger": "EVENT:semantics.extracted (all screens complete)",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T401",
      "factory": "F1099, F1100",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC (distributed lock)",
      "description": "UI graph construction — screens as nodes; prototype links + semantic relations as edges",
      "distributedLock": "{tenantId}::{fileKey}::graph-build",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T402",
      "factory": "F1101, F1102",
      "fabric": "DATABASE_FABRIC",
      "description": "Module signature graph enrichment — overlay module candidate signals onto UI graph",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T403",
      "factory": "F1103, F1104, F1105",
      "fabric": "DATABASE_FABRIC (read-only for F1103, F1105)",
      "description": "System-type graph alignment — check project graph against global ontology graphs",
      "onSuccess": "step-4",
      "onFailure": "DLQ"
    },
    {
      "id": "step-4",
      "taskType": "T404",
      "factory": "F1106, F1107",
      "fabric": "RAG_FABRIC (Graph strategy)",
      "description": "GraphRAG retrieval — retrieve module dependency constraints + similar navigation patterns",
      "onSuccess": "EMIT:graph.built",
      "onFailure": "warn-continue"
    }
  ]
}
```

### Template 87 — vector-embedding-v1.json
```json
{
  "id": "vector-embedding-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Vector embedding generation and similarity retrieval for screens and components",
  "trigger": "EVENT:semantics.extracted",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T405",
      "factory": "F1108, F1109, F1110",
      "fabric": "AI_ENGINE_FABRIC (EmbedAsync) + DATABASE_FABRIC (kNN index)",
      "description": "Embed screens, components, archetypes — generate 3072-dim vectors, store in kNN index",
      "parallelism": "per-screen, max 10 concurrent",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T406",
      "factory": "F1111, F1112, F1113",
      "fabric": "DATABASE_FABRIC (kNN search) + RAG_FABRIC (Vector strategy)",
      "description": "Similarity search — find nearest known archetypes/module compositions, score floor 0.6",
      "onSuccess": "EMIT:embeddings.ready",
      "onFailure": "warn-continue"
    }
  ]
}
```

### Template 88 — module-mapping-v1.json
```json
{
  "id": "module-mapping-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Module mapping — candidate resolution, confidence scoring, wiring plan, config doc requirements",
  "trigger": "EVENT:graph.built AND EVENT:embeddings.ready",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T407",
      "factory": "F1114",
      "fabric": "DATABASE_FABRIC + CORE_FABRIC (cache)",
      "description": "Module matrix loading — load versioned module matrix from ES; validate version",
      "onSuccess": "step-2",
      "onFailure": "BLOCK:matrix-load-fail"
    },
    {
      "id": "step-2",
      "taskType": "T408",
      "factory": "F1115, F1116",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC (Multi: Graph+Vector)",
      "description": "Module candidate resolution — per screen, merge graph+vector signals into ranked candidates with confidence",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T409",
      "factory": "F1115, F1117",
      "fabric": "DATABASE_FABRIC",
      "description": "Cross-flow BFA check — validate inferred entities against existing FLOW-16/17/18+ BFA registrations",
      "onSuccess": "step-4",
      "onFailure": "BLOCK:bfa-conflict"
    },
    {
      "id": "step-4",
      "taskType": "T410",
      "factory": "F1118, F1119",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC",
      "description": "Wiring plan generation — produce fabric-first config doc references; generate config doc requirements list",
      "onSuccess": "step-5",
      "onFailure": "DLQ"
    },
    {
      "id": "step-5",
      "taskType": "T411",
      "factory": "F1120, F1141, F1140",
      "fabric": "DATABASE_FABRIC",
      "description": "Module mapping validation gate — DNA compliance + dependency constraint + evidence coverage checks",
      "onSuccess": "EMIT:module.mapped",
      "onFailure": "BLOCK:mapping-gate-fail"
    }
  ]
}
```

### Template 89 — gap-completion-v1.json
```json
{
  "id": "gap-completion-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "System type inference + gap detection + gap report + optional stub generation",
  "trigger": "EVENT:module.mapped",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T412",
      "factory": "F1121, F1122, F1123, F1124, F1125, F1126",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC (Graph strategy)",
      "description": "System type inference — aggregate module evidence → rank system type candidates → ambiguity gate → SystemModelIR",
      "minimumScreens": 3,
      "onSuccess": "step-2",
      "onAmbiguous": "PAUSE:user-selection",
      "onInsufficient": "EMIT:insufficient-data"
    },
    {
      "id": "step-2",
      "taskType": "T413",
      "factory": "F1127, F1128, F1129, F1130, F1131, F1132, F1142",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Gap completion — detect missing modules/screens/flows → gap report → CRITICAL auto-stubs → judge gate",
      "onSuccess": "EMIT:gap.detected",
      "onFailure": "DLQ"
    }
  ]
}
```

### Template 90 — learning-loop-v1.json
```json
{
  "id": "learning-loop-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Feedback correction injection and learning loop orchestration",
  "consumerGroup": "figma31-{tenantId}-learning",
  "trigger": "EVENT:correction.submitted OR SCHEDULE:daily",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T414",
      "factory": "F1133, F1134, F1135",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + RAG_FABRIC",
      "description": "Correction injection — store correction in audit log → inject as negative/positive exemplar into RAG corpus",
      "onSuccess": "step-2",
      "onFailure": "BLOCK:audit-incomplete"
    },
    {
      "id": "step-2",
      "taskType": "T415",
      "factory": "F1136, F1137, F1116",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Learning loop orchestration — benchmark → accuracy check → human gate if drop >5% → update confidence model",
      "trigger": "SCHEDULE:daily OR correction_count >= 10",
      "onSuccess": "EMIT:learning-cycle.completed",
      "onAccuracyDrop": "BLOCK:human-review-required"
    }
  ]
}
```

---

## SECTION 4 — ARTIFACT NUMBER CROSS-REFERENCE (FLOW-31 COMPLETE)

| Artifact Type | Range | Count | Status |
|--------------|-------|-------|--------|
| Factories | F1075–F1142 | 68 | ✅ Phase 2 |
| Families | 154–162 | 9 | ✅ Phase 2 |
| Task Types | T389–T415 | 27 | ✅ Phase 3 |
| Templates | 83–90 | 8 | ✅ Phase 6 |
| Skills | SK-251–SK-265 | 15 | ✅ Phase 4 |
| BFA Rules | CF-510–CF-551 | 42 | ✅ Phase 5 |
| Stress Tests | ST-300–ST-325 | 26 | ✅ Phase 5 |
| Design Decisions | DD-245–DD-264 | 20 | ✅ Phase 6 |
| Design Records | DR-184–DR-197 | 14 | ✅ Phase 6 |

### NEXT AVAILABLE (FLOW-32 starts here)
```
Factory:         F1143
Family:          163
Task Type:       T416
Template:        91
BFA Rule:        CF-552
Stress Test:     ST-326
Skill:           SK-266
Design Decision: DD-265
Design Record:   DR-198
```
