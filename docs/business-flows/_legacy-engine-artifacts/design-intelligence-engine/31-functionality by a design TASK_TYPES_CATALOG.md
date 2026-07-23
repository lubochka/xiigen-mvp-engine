# FLOW-31 — TASK TYPES CATALOG
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Task Types: T389–T415 (27 contracts)

---

## ENGINE CONTRACT FORMAT (all fields required)
```
TASK TYPE: T### — Name
ARCHETYPE: [INGESTION|EXTRACTION|ANALYSIS|SYNTHESIS|CLASSIFICATION|MAPPING|VALIDATION|LEARNING]
ENTRY: What triggers this task
PURPOSE: What it produces
DISTINCT FROM: Most similar existing task type(s)
FACTORY DEPENDENCIES: F### list — resolved via CreateAsync()
FABRIC RESOLUTION: Each F→which FABRIC→which provider
AF CONFIGURATION: Which AF stations generate/review/judge
BFA VALIDATION: Cross-flow conflict checks
MACHINE: Fixed invariant behaviour
FREEDOM: Admin-configurable parameters
IRON RULES: Violations = BUILD FAILURE
QUALITY GATES: What AF-9 (Judge) checks
```

---

## T389 — Figma Full-File Ingestion Gate

```
TASK TYPE: T389 — Figma Full-File Ingestion Gate
ARCHETYPE: INGESTION
ENTRY: User submits fileKey + API credentials; version check shows change from last ingestion OR first-time ingest
PURPOSE: Authenticate, acquire rate-limit token, fetch full file JSON + version metadata, cache result, emit ingestion-ready event
DISTINCT FROM: T3 (Figma→System) which processes an already-ingested file; T389 is the raw extraction layer before any analysis
FACTORY DEPENDENCIES: F1075, F1081, F1082
FABRIC RESOLUTION:
  F1075→DATABASE FABRIC (Elasticsearch, cache) + QUEUE FABRIC (Redis Streams, rate token bucket)
  F1081→DATABASE FABRIC (Elasticsearch, version history index)
  F1082→QUEUE FABRIC (Redis Streams, rate-limit token bucket per tenant per API tier)
AF CONFIGURATION:
  AF-2 (Planning): decomposes into node-batch plan if file is large (>1000 frames)
  AF-8 (Security): validates API credentials scope; checks no PII in file metadata
  AF-9 (Judge): validates ingestion completeness (all pages fetched, version recorded)
BFA VALIDATION:
  Check: no collision with FLOW-18 (visual flow creation) fileKey namespace
  Check: Figma tenantId scope matches requesting tenant — CF-510
MACHINE: Rate limit enforcement per seat type; version comparison before re-fetch; JSON cache TTL
FREEDOM: Cache TTL duration, max concurrent file fetches, full-rescan trigger threshold
IRON RULES:
  - NEVER fetch without acquiring rate-limit token first → CF-512
  - NEVER store file JSON without tenantId scope tag → CF-513
  - NEVER skip version check (always check before re-fetching) → CF-514
QUALITY GATES:
  - Ingestion record contains: fileKey, version, timestamp, tenantId, page count, frame count
  - Rate limit token acquired before any API call
  - No PII detected in file metadata (AF-8)
```

---

## T390 — Node Tree Normalization

```
TASK TYPE: T390 — Node Tree Normalization
ARCHETYPE: EXTRACTION
ENTRY: Fires after T389 emits ingestion-ready event; raw file JSON available in cache
PURPOSE: Parse raw Figma JSON into canonical normalized node tree; resolve all component instances to main component IDs; extract text layers; tag every node with pageId + frameId
DISTINCT FROM: T389 (raw fetch); T391 (image rendering); T390 is structural normalization only
FACTORY DEPENDENCIES: F1077, F1079, F1080
FABRIC RESOLUTION:
  F1077→DATABASE FABRIC (Elasticsearch, parsed node store)
  F1079→DATABASE FABRIC (Elasticsearch, component catalog — resolves instance→main component)
  F1080→DATABASE FABRIC (Elasticsearch, token map — resolves variable bindings)
AF CONFIGURATION:
  AF-1 (Genesis): no AI — pure deterministic parse
  AF-7 (Compliance): validates Dictionary<string,object> usage (no typed NodeModel) — DNA-1
  AF-9 (Judge): validates all nodes have required fields (nodeId, type, parentId, frameId, pageId)
BFA VALIDATION:
  Check: component IDs don't collide with FLOW-22/23 (visual editor) component registry — CF-515
MACHINE: Node type taxonomy, hierarchy normalization, component instance→main resolution, text layer extraction
FREEDOM: Node depth limit, text-layer filter rules (exclude decoration layers by naming convention)
IRON RULES:
  - NEVER create typed model classes (ProductNode, TextLayer, etc.) — use Dictionary<string,object> → CF-516
  - NEVER store without tenantId + fileKey on every document → CF-513
QUALITY GATES:
  - Every node: nodeId, type, parentId, frameId, pageId, tenantId present
  - All component instances resolved to main component ID
  - Zero typed model classes in output
```

---

## T391 — Image Rendering & Asset Extraction

```
TASK TYPE: T391 — Image Rendering & Asset Extraction
ARCHETYPE: EXTRACTION
ENTRY: Fires after T390; list of frame IDs requiring visual rendering for multimodal AI input
PURPOSE: Render each Figma frame to PNG image; store URL with frameId+version+tenantId; prepare image references for T398 multimodal prompt
DISTINCT FROM: T390 (structural); T391 is visual rendering only, not semantic analysis
FACTORY DEPENDENCIES: F1075, F1078, F1082
FABRIC RESOLUTION:
  F1075→DATABASE FABRIC (Elasticsearch, image URL cache)
  F1078→AI ENGINE FABRIC (vision model input prep — image URLs passed to IAiProvider) + DATABASE FABRIC (image URL cache)
  F1082→QUEUE FABRIC (Redis Streams, rate-limit token for image endpoint tier)
AF CONFIGURATION:
  AF-8 (Security): validates images don't expose PII; checks image URL expiry policy
  AF-9 (Judge): validates image URLs accessible, correct dimensions, tenantId tagged
BFA VALIDATION:
  Check: image storage bucket scope matches tenant — CF-517
MACHINE: Image format (PNG), scale factor (2x default), URL expiry handling, batch size
FREEDOM: Max resolution, storage provider (S3/Azure Blob config), batch size
IRON RULES:
  - NEVER render without rate-limit token for image endpoint tier → CF-512
  - ALL image URLs must expire and be renewed; no permanent public URLs → CF-518
QUALITY GATES:
  - Each rendered frame: imageUrl, frameId, version, tenantId, expiresAt
  - URL accessible at judge time
  - Image dimensions ≥ 800px on longest side
```

---

## T392 — Design Token Resolution

```
TASK TYPE: T392 — Design Token Resolution
ARCHETYPE: EXTRACTION
ENTRY: Fires alongside T390; file contains variable bindings
PURPOSE: Resolve all Figma variables/tokens to semantic roles (primary-color → brand.primary, spacing-md → 16px, heading-1 → font config); store token map for downstream semantic extraction
DISTINCT FROM: T390 (structural normalization); T392 focuses purely on token/variable semantics
FACTORY DEPENDENCIES: F1080, F1079
FABRIC RESOLUTION:
  F1080→DATABASE FABRIC (Elasticsearch, design_token_map index)
  F1079→DATABASE FABRIC (Elasticsearch, component catalog — cross-refs component styles)
AF CONFIGURATION:
  AF-9 (Judge): validates token map completeness; no unresolved variable IDs
BFA VALIDATION:
  Check: token namespaces don't collide with FLOW-22 site builder token registry — CF-519
MACHINE: Token resolution algorithm, alias chain depth limit, semantic role taxonomy
FREEDOM: Custom semantic role definitions per tenant, alias resolution depth
IRON RULES:
  - NEVER hardcode resolved token values in output — always reference by semantic role → CF-520
QUALITY GATES:
  - All variable IDs resolved to semantic roles
  - No circular alias chains (depth limit enforced)
  - Token map stored with tenantId + fileKey scope
```

---

## T393 — Prototype Flow Extraction

```
TASK TYPE: T393 — Prototype Flow Extraction
ARCHETYPE: EXTRACTION
ENTRY: Fires after T390; prototype reactions available from plugin extractor (F1076)
PURPOSE: Extract all prototype reactions (triggers + actions) and build navigation flow graph: Screen A -[TAP CTA]→ Screen B; identify entry-point frames
DISTINCT FROM: T104 (navigation flow in FLOW-09 Search & Discovery); T393 is Figma-specific prototype extraction
FACTORY DEPENDENCIES: F1076, F1104
FABRIC RESOLUTION:
  F1076→QUEUE FABRIC (Redis Streams, plugin→server event pipeline)
  F1104→DATABASE FABRIC (Elasticsearch, navigation_flows index)
AF CONFIGURATION:
  AF-2 (Planning): identifies distinct user flows from entry points
  AF-9 (Judge): validates DAG is acyclic (no infinite loops); all target frameIds exist
BFA VALIDATION:
  Check: navigation flow entities don't duplicate FLOW-18 flow definition entities — CF-521
MACHINE: Reaction taxonomy (NAVIGATE_TO, OPEN_OVERLAY, SWAP_STATE, CLOSE, SCROLL_TO), entry-point detection
FREEDOM: Max navigation depth, cycle detection policy
IRON RULES:
  - NEVER use direct HTTP to Figma plugin — always via QUEUE FABRIC events → CF-522
QUALITY GATES:
  - All reactions have: sourceFrameId, targetFrameId, trigger, actionType
  - At least one entry-point frame identified
  - Navigation DAG stored with tenantId + fileKey
```

---

## T394 — DesignIR Assembly & Validation

```
TASK TYPE: T394 — DesignIR Assembly & Validation
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T390+T392+T393 all complete; all per-screen artifacts ready
PURPOSE: Assemble master DesignIR document: screens[], components[], designTokens, screenMap, prototypeLinks; validate completeness; emit DesignIR-ready event
DISTINCT FROM: T390-T393 (individual extractions); T394 is the assembly and gate
FACTORY DEPENDENCIES: F1089, F1090
FABRIC RESOLUTION:
  F1089→DATABASE FABRIC (Elasticsearch, design_ir index — master document)
  F1090→DATABASE FABRIC (Elasticsearch, ir_validation_log)
AF CONFIGURATION:
  AF-9 (Judge): validates DesignIR completeness (all screens present, components resolved, no orphaned refs)
  AF-7 (Compliance): DNA-1 check (no typed models anywhere in IR)
BFA VALIDATION:
  Check: DesignIR fileKey doesn't shadow existing FLOW-13 AI content pipeline assets — CF-523
MACHINE: DesignIR schema, cross-screen reference resolution algorithm
FREEDOM: Assembly strategy (incremental vs full rebuild trigger)
IRON RULES:
  - DesignIR MUST be schema-valid before emitting ready event → CF-524
  - ALL cross-references must resolve (no dangling nodeIds) → CF-524
QUALITY GATES:
  - screens[] count matches Figma file frame count (within tolerance)
  - Every component instance resolved to main component
  - prototypeLinks references valid screenIds
  - DesignIR stored with version + tenantId
```

---

## T395 — Deterministic Feature Extraction

```
TASK TYPE: T395 — Deterministic Feature Extraction
ARCHETYPE: EXTRACTION
ENTRY: Fires per-screen after T394; processes one screen at a time from DesignIR.screens[]
PURPOSE: No-AI deterministic extraction per screen: layout primitives, widget types, component multiset, auto-layout semantics, CTA buttons — provides stable baseline before AI enrichment
DISTINCT FROM: T398 (AI semantic extraction); T395 is deterministic only, no LLM calls
FACTORY DEPENDENCIES: F1083, F1084, F1085, F1086, F1087, F1088
FABRIC RESOLUTION:
  F1083→DATABASE FABRIC (Elasticsearch, designir_screens)
  F1084→DATABASE FABRIC (Elasticsearch, ui_controls)
  F1085→DATABASE FABRIC (Elasticsearch, layout_semantics)
  F1086→DATABASE FABRIC (Elasticsearch, component_signatures)
  F1087→DATABASE FABRIC (Elasticsearch, screen_fingerprints)
  F1088→DATABASE FABRIC (Elasticsearch, interaction_semantics)
AF CONFIGURATION:
  AF-7 (Compliance): DNA-1 check (ParseDocument usage)
  AF-9 (Judge): validates feature set completeness
BFA VALIDATION:
  Check: extracted entities (detected widget names) don't collide with FLOW-09 entity catalog — CF-525
MACHINE: Widget detection rules, layout primitive taxonomy, control type taxonomy
FREEDOM: Custom widget pattern definitions, detection sensitivity thresholds
IRON RULES:
  - ZERO LLM calls in T395 — deterministic only → CF-526
  - Screen fingerprint must be stored before T398 fires → CF-527
QUALITY GATES:
  - Each screen has: layout_primitives[], ui_controls[], component_signature, screen_fingerprint, interaction_semantics
  - Fingerprint includes: componentMultiset hash, layoutType, ctaCount
```

---

## T396 — Layout Semantic Analysis

```
TASK TYPE: T396 — Layout Semantic Analysis
ARCHETYPE: ANALYSIS
ENTRY: Fires per-screen after T395; auto-layout properties available
PURPOSE: Translate auto-layout properties into semantic layout labels: list/grid/table/sidebar/centered/modal/tab — enables downstream module matching
DISTINCT FROM: T395 (feature extraction which includes raw auto-layout data); T396 interprets those properties semantically
FACTORY DEPENDENCIES: F1085
FABRIC RESOLUTION:
  F1085→DATABASE FABRIC (Elasticsearch, layout_semantics index)
AF CONFIGURATION:
  AF-9 (Judge): validates layout label assigned; confidence score present
BFA VALIDATION: No cross-flow conflicts (layout semantics are local to design intelligence domain)
MACHINE: Auto-layout axis + itemSpacing + padding + counterAxisAlignment → semantic label algorithm
FREEDOM: Layout archetype thresholds, custom layout definitions
IRON RULES:
  - EVERY screen must have a layout semantic label before T398 fires → CF-528
QUALITY GATES:
  - Layout label from taxonomy: list|grid|table|sidebar|centered|modal|tab|freeform
  - Confidence score 0.0–1.0 present
  - Evidence reference: which auto-layout properties drove the label
```

---

## T397 — Component Signature Building

```
TASK TYPE: T397 — Component Signature Building
ARCHETYPE: ANALYSIS
ENTRY: Fires per-screen after T395 feature extraction; component instances resolved
PURPOSE: Build canonical component multiset signature per screen: {componentName, mainComponentId, variantProps[], count} — enables cross-screen pattern mining and module signature matching
DISTINCT FROM: T395 (raw extraction); T397 builds the structured signature object used for vector embedding and module matching
FACTORY DEPENDENCIES: F1086, F1079
FABRIC RESOLUTION:
  F1086→DATABASE FABRIC (Elasticsearch, component_signatures)
  F1079→DATABASE FABRIC (Elasticsearch, component catalog — variant resolution)
AF CONFIGURATION:
  AF-9 (Judge): validates all instances resolved to main component; no unknown component IDs
BFA VALIDATION:
  Check: component names don't collide with FLOW-22/23 (visual editor) registered component registry — CF-529
MACHINE: Signature schema, variant property normalization, canonical ordering
FREEDOM: Alias mapping rules (if component renamed in DS update)
IRON RULES:
  - EVERY instance must be linked to a mainComponentId — no anonymous components in signature → CF-530
QUALITY GATES:
  - Signature has ≥1 entry per screen
  - All mainComponentIds verifiable against component catalog
  - Variant properties normalized (consistent key names)
```

---

## T398 — Multimodal Screen Semantics Extraction

```
TASK TYPE: T398 — Multimodal Screen Semantics Extraction
ARCHETYPE: ANALYSIS
ENTRY: Fires per-screen after T395+T396+T397 complete AND T391 image rendered; triggers AI pipeline
PURPOSE: AI-powered extraction of ScreenSemanticsIR: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[] — uses rendered image + pruned node tree + RAG-retrieved module context
DISTINCT FROM: T395 (deterministic); T398 is the AI semantic enrichment layer; distinct from T169 (AI content pipeline) because it operates on UI structure, not content
FACTORY DEPENDENCIES: F1091, F1092, F1093, F1094, F1095, F1096, F1097, F1098
FABRIC RESOLUTION:
  F1091→AI ENGINE FABRIC (Skill 07) AiDispatcher + QUEUE FABRIC Redis Streams
  F1092→RAG FABRIC (IRagService, Hybrid strategy — module signatures + archetype exemplars)
  F1093→AI ENGINE FABRIC (IAiProvider) + DATABASE FABRIC (Elasticsearch, archetype_classifications)
  F1094→AI ENGINE FABRIC (IAiProvider) + DATABASE FABRIC (Elasticsearch, ui_entities)
  F1095→AI ENGINE FABRIC (IAiProvider) + DATABASE FABRIC (Elasticsearch, action_patterns)
  F1096→DATABASE FABRIC (Elasticsearch, evidence_maps)
  F1097→AI ENGINE FABRIC (IAiProvider) + DATABASE FABRIC (Elasticsearch, intent_summaries)
  F1098→DATABASE FABRIC (Elasticsearch, semantic_ir_validation_log)
AF CONFIGURATION:
  AF-1 (Genesis): generates ScreenSemanticsIR from multimodal prompt
  AF-3 (Prompt Library): retrieves domain-specific module signature prompts
  AF-4 (RAG Task Context): searches archetype + exemplar corpus
  AF-5 (Multi-model): runs Claude Vision + GPT-4o in parallel for competing analyses
  AF-6 (Code Review): n/a — replaced by schema validation
  AF-7 (Compliance): DNA-1 (no typed models in output), DNA-2 (BuildQueryFilters)
  AF-9 (Judge): Evidence Coverage Gate (every claim has evidence), schema validity
  AF-10 (Merge): combines competing model outputs into consensus ScreenSemanticsIR
  AF-11 (Feedback): stores generation quality metric per screen
BFA VALIDATION:
  Check: entity names extracted don't collide with FLOW-08 payment entity namespace — CF-531
  Check: action patterns don't duplicate FLOW-07 social action registry — CF-532
MACHINE: ScreenSemanticsIR schema, multi-model competition, evidence map construction, schema-strict output
FREEDOM: Which models compete, temperature, max-tokens, RAG strategy (Hybrid vs Vector vs Graph)
IRON RULES:
  - EVERY claim (module/action/entity) MUST have ≥1 evidence item → CF-533 (EVIDENCE_COVERAGE_GATE)
  - Output MUST be schema-valid ScreenSemanticsIR → CF-534
  - NEVER call openai.chat() directly — always IAiProvider.GenerateAsync() → CF-535
QUALITY GATES (AF-9):
  - Evidence coverage: 100% of claims have evidence
  - Schema: all required fields present (screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[])
  - Conflict: no contradictions between multi-model outputs (AF-10 resolves; if unresolvable → HUMAN_REVIEW flag)
  - Intent summary generated and stored
```

---

## T399 — Evidence Map Validation Gate

```
TASK TYPE: T399 — Evidence Map Validation Gate
ARCHETYPE: VALIDATION
ENTRY: Fires after T398; ScreenSemanticsIR ready
PURPOSE: Hard gate: validates every claim has evidence; emits PASS or FAIL with details; failed screens go to HUMAN_REVIEW queue
DISTINCT FROM: T398 (generation); T399 is the dedicated validation gate — separation of concerns
FACTORY DEPENDENCIES: F1096, F1098, F1138
FABRIC RESOLUTION:
  F1096→DATABASE FABRIC (Elasticsearch, evidence_maps)
  F1098→DATABASE FABRIC (Elasticsearch, semantic_ir_validation_log)
  F1138→DATABASE FABRIC (Elasticsearch, gate_results) + QUEUE FABRIC (Redis Streams, gate events)
AF CONFIGURATION:
  AF-9 (Judge): THE judge for this gate
BFA VALIDATION: None (internal validation gate)
MACHINE: Minimum evidence count per claim type (module: ≥1, entity: ≥1, action: ≥1)
FREEDOM: Evidence threshold per severity tier, WARN vs BLOCK policy
IRON RULES:
  - BLOCK promotion if evidence coverage < 100% of CRITICAL claims → CF-533
QUALITY GATES:
  - Gate result: PASS | WARN | FAIL | HUMAN_REVIEW
  - FAIL → screen goes to manual review queue; pipeline continues for other screens
  - HUMAN_REVIEW → admin notified via QUEUE FABRIC event
```

---

## T400 — Screen Intent Summary Generation

```
TASK TYPE: T400 — Screen Intent Summary Generation
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T399 PASS; generates searchable one-line intent summary per screen
PURPOSE: Produce concise, searchable intent summary: "Product catalog grid with price badges and filter sidebar" — stored for search, comparison, and downstream UI display
DISTINCT FROM: T398 (full semantics); T400 is the lightweight searchable label
FACTORY DEPENDENCIES: F1097
FABRIC RESOLUTION:
  F1097→AI ENGINE FABRIC (IAiProvider) + DATABASE FABRIC (Elasticsearch, intent_summaries)
AF CONFIGURATION:
  AF-1 (Genesis): generates summary from ScreenSemanticsIR (constrained by schema — max 20 words, must mention archetype + key modules)
  AF-9 (Judge): validates summary length, content accuracy
BFA VALIDATION: None
MACHINE: Summary template, max 20 words, must include screen_archetype + top 2 modules
FREEDOM: Summary language, style (technical vs user-facing)
IRON RULES:
  - Summary MUST reference at minimum the screen_archetype → CF-536
QUALITY GATES:
  - Length: 5–20 words
  - Contains archetype label
  - Stored with screenId + tenantId + fileKey + version
```

---

## T401 — UI Graph Node Indexing

```
TASK TYPE: T401 — UI Graph Node Indexing
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T399 PASS for all screens; builds graph from DesignIR + SemanticsIRs
PURPOSE: Create Screen, Component, ControlType, Action, Entity nodes in property graph; each with embedding + metadata; scope-isolated per tenant
DISTINCT FROM: T402 (edge resolution); T401 is node creation only
FACTORY DEPENDENCIES: F1099, F1100
FABRIC RESOLUTION:
  F1099→DATABASE FABRIC (Elasticsearch, ui_graph_nodes index)
  F1100→DATABASE FABRIC (Elasticsearch, graph nodes index with dense_vector field)
AF CONFIGURATION:
  AF-7 (Compliance): DNA-5 (tenantId on every graph node)
  AF-9 (Judge): validates node count matches source (every screen becomes a node)
BFA VALIDATION:
  Check: graph node IDs don't collide with FLOW-25 BFA entity registry — CF-537
MACHINE: Node type taxonomy, embedding schema, index mapping
FREEDOM: Embedding model choice, batch size
IRON RULES:
  - EVERY graph node MUST have tenantId + fileKey → CF-538
  - NO graph nodes for cross-tenant shared entities (those go to global ontology) → CF-539
QUALITY GATES:
  - Node count: |screens| + |components| + |controls| + |actions| + |entities|
  - All nodes have embeddings
  - TenantId present on all tenant-scoped nodes
```

---

## T402 — UI Graph Edge Resolution

```
TASK TYPE: T402 — UI Graph Edge Resolution
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T401 nodes indexed
PURPOSE: Resolve and store typed edges: CONTAINS (Screen→Component), USES (Screen→ControlType), HAS_ACTION (Screen→Action), OPERATES_ON (Action→Entity), NAVIGATES_TO (Screen→Screen), VARIANT_OF (Component→MainComponent)
DISTINCT FROM: T401 (nodes); T402 is edge resolution
FACTORY DEPENDENCIES: F1101, F1104, F1107
FABRIC RESOLUTION:
  F1101→DATABASE FABRIC (Elasticsearch, ui_graph_edges)
  F1104→DATABASE FABRIC (Elasticsearch, navigation_flows — source of NAVIGATES_TO edges)
  F1107→DATABASE FABRIC (Elasticsearch, merged_screen_graph)
AF CONFIGURATION:
  AF-9 (Judge): validates edge consistency (no dangling references, no cycles in NAVIGATES_TO)
BFA VALIDATION:
  Check: NAVIGATES_TO edges don't duplicate FLOW-18 flow definition DAG edges — CF-540
MACHINE: Edge type taxonomy, deduplication key, bidirectionality rules
FREEDOM: Edge weight source, custom edge types per project
IRON RULES:
  - ALL edges must reference valid node IDs from T401 index → CF-541
  - NAVIGATES_TO edges must derive from T393 prototype extraction (not inferred) → CF-542
QUALITY GATES:
  - No dangling edge references
  - Navigation DAG is acyclic
  - All edge types from taxonomy
```

---

## T403 — Module Signature Graph Build

```
TASK TYPE: T403 — Module Signature Graph Build
ARCHETYPE: SYNTHESIS
ENTRY: Fires once per system setup / when module-architecture matrix is updated; not per-file
PURPOSE: Build canonical module signature subgraphs from DEFINITIVE_MODULE_ARCHITECTURE.md: each Genie DNA module represented as a subgraph (component types, action types, entity types typical for that module)
DISTINCT FROM: T401/T402 (per-file graphs); T403 is the global ontology build from the module matrix
FACTORY DEPENDENCIES: F1102, F1103, F1105, F1114
FABRIC RESOLUTION:
  F1102→DATABASE FABRIC (Elasticsearch, module_signature_graph)
  F1103→DATABASE FABRIC (Elasticsearch, system_type_graph)
  F1105→DATABASE FABRIC (Elasticsearch, module_dependency_graph)
  F1114→DATABASE FABRIC (Elasticsearch, module_matrix — sourced from GENERIC_MODULE_ANALYSIS_COMPLETE.md)
AF CONFIGURATION:
  AF-4 (RAG Task Context): retrieves module-architecture documentation as source
  AF-9 (Judge): validates all 20 core modules present; dependency edges match matrix
BFA VALIDATION:
  Check: module names don't conflict with FLOW-25 BFA entity registry — CF-543
MACHINE: Module signature schema, 20 core modules × 15 site types matrix, dependency edge taxonomy
FREEDOM: Custom module additions per tenant
IRON RULES:
  - 20 core modules from DEFINITIVE_MODULE_ARCHITECTURE.md MUST all be present → CF-544
  - Module dependency edges MUST match the matrix dependency map → CF-545
QUALITY GATES:
  - All 20 core modules indexed with signature subgraphs
  - All system types (≥5) indexed with required-module edges
  - Dependency edges complete per module
```

---

## T404 — Navigation Flow Graph Build

```
TASK TYPE: T404 — Navigation Flow Graph Build
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T402; builds higher-level flow graph from NAVIGATES_TO edges
PURPOSE: Identify distinct user flows (browse→detail→checkout), entry points, and flow completeness; store as flow graph nodes for gap analysis
DISTINCT FROM: T393 (raw prototype extraction); T404 interprets the navigation graph into user flow semantics
FACTORY DEPENDENCIES: F1104, F1130
FABRIC RESOLUTION:
  F1104→DATABASE FABRIC (Elasticsearch, navigation_flows)
  F1130→DATABASE FABRIC (Elasticsearch, flow_gaps — pre-seeded with open flow paths)
AF CONFIGURATION:
  AF-2 (Planning): decomposes file into distinct user flows
  AF-9 (Judge): validates each flow has entry + exit; no dead-end paths (unless explicitly marked terminal)
BFA VALIDATION:
  Check: flow semantics don't conflict with FLOW-18 user flow definitions — CF-546
MACHINE: Flow DAG construction, entry-point heuristics (frames with no incoming NAVIGATES_TO), terminal-screen detection
FREEDOM: Max path depth, cycle policy
IRON RULES:
  - EVERY user flow must have an identified entry point → CF-547
QUALITY GATES:
  - ≥1 flow identified per file
  - Each flow: entry screen, terminal screens, intermediate screens, CTA triggers
  - Dead-end paths flagged for gap analysis
```

---

## T405 — Screen Embedding Generation

```
TASK TYPE: T405 — Screen Embedding Generation
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T400 intent summary generated; all per-screen data available
PURPOSE: Generate multi-signal screen embedding combining: text content + component names + layout type + intent summary → store in vector index for kNN similarity search
DISTINCT FROM: T406 (component embedding); T405 is per-screen whole-screen embedding
FACTORY DEPENDENCIES: F1108, F1112, F1113
FABRIC RESOLUTION:
  F1108→AI ENGINE FABRIC (IAiProvider, embedding endpoint) + DATABASE FABRIC (Elasticsearch, screen_embeddings dense_vector)
  F1112→DATABASE FABRIC (Elasticsearch, index management)
  F1113→DATABASE FABRIC (Redis, embedding cache)
AF CONFIGURATION:
  AF-9 (Judge): validates embedding dimension matches index mapping; cache key correct
BFA VALIDATION: None (embeddings are tenant-scoped)
MACHINE: Embedding model, vector dimension, multi-signal concatenation strategy
FREEDOM: Embedding model choice, signal weighting
IRON RULES:
  - Cache key MUST include screenId + version + modelId → CF-548
  - ALL embeddings MUST be scope-isolated to tenant → CF-538
QUALITY GATES:
  - Embedding dimension matches configured model
  - Stored with: screenId, tenantId, fileKey, version, modelId, embedding vector
```

---

## T406 — Component Embedding Generation

```
TASK TYPE: T406 — Component Embedding Generation
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T403 module signature graph built; canonical component catalog available
PURPOSE: Embed each canonical design-system component (name + variant props + usage context) for cross-file pattern mining; stored in shared component embedding index (tenant-scoped)
DISTINCT FROM: T405 (per-screen); T406 is per canonical component
FACTORY DEPENDENCIES: F1109, F1112, F1113
FABRIC RESOLUTION:
  F1109→AI ENGINE FABRIC (IAiProvider, embedding) + DATABASE FABRIC (Elasticsearch, component_embeddings)
  F1112→DATABASE FABRIC (Elasticsearch, index management)
  F1113→DATABASE FABRIC (Redis, embedding cache)
AF CONFIGURATION:
  AF-9 (Judge): validates all catalog components embedded
BFA VALIDATION: None
MACHINE: Component embedding schema, batch size
FREEDOM: Embedding refresh schedule
IRON RULES:
  - EVERY component in catalog MUST be embedded → CF-549
QUALITY GATES:
  - Component embedding count = catalog component count
  - Embeddings stored with: componentId, tenantId, modelId, version
```

---

## T407 — Vector Similarity Search

```
TASK TYPE: T407 — Vector Similarity Search
ARCHETYPE: ANALYSIS
ENTRY: Called at query time (during T409 module candidate resolution); provides kNN retrieval
PURPOSE: Execute kNN search across screen/component/archetype embedding indices; returns top-K matches with cosine similarity scores; always filtered by tenantId
DISTINCT FROM: T411 (module wiring plan synthesis which uses T407 output); T407 is pure retrieval
FACTORY DEPENDENCIES: F1111, F1113
FABRIC RESOLUTION:
  F1111→RAG FABRIC (IRagService, Vector strategy) + DATABASE FABRIC (Elasticsearch, kNN search)
  F1113→DATABASE FABRIC (Redis, embedding cache)
AF CONFIGURATION:
  AF-4 (RAG Task Context): this IS the RAG retrieval step
  AF-9 (Judge): validates result count; no cross-tenant results
BFA VALIDATION:
  Check: search results are tenant-scoped; no cross-tenant leakage — CF-550
MACHINE: kNN algorithm, cosine similarity, score threshold, BuildQueryFilters (tenantId always included — DNA-2)
FREEDOM: topK value, similarity threshold
IRON RULES:
  - BuildQueryFilters MUST include tenantId on every search → CF-551 (DNA-2 enforcement)
  - ZERO cross-tenant results permitted → CF-550
QUALITY GATES:
  - Results filtered to requesting tenant
  - Similarity scores present on all results
  - Result count ≤ topK configured value
```

---

## T408 — Module Matrix Constraint Loading

```
TASK TYPE: T408 — Module Matrix Constraint Loading
ARCHETYPE: ANALYSIS
ENTRY: Fires at system startup and on module-architecture updates; also called at resolution time if cache miss
PURPOSE: Load the module matrix (20 modules × 15 site types) and dependency map into active cache; validate consistency; make available for constraint satisfaction in T409
DISTINCT FROM: T403 (graph build); T408 is the runtime cache loader for fast constraint lookup
FACTORY DEPENDENCIES: F1114, F1103, F1105
FABRIC RESOLUTION:
  F1114→DATABASE FABRIC (Elasticsearch, module_matrix)
  F1103→DATABASE FABRIC (Elasticsearch, system_type_graph)
  F1105→DATABASE FABRIC (Elasticsearch, module_dependency_graph)
AF CONFIGURATION:
  AF-9 (Judge): validates matrix consistency on load (all 20 modules, all dependencies present)
BFA VALIDATION: None
MACHINE: Matrix schema, mandatory module count (20), dependency edge validation
FREEDOM: Cache TTL, reload trigger events
IRON RULES:
  - Matrix MUST contain all 20 core modules from DEFINITIVE_MODULE_ARCHITECTURE.md → CF-544
QUALITY GATES:
  - 20 core modules loaded
  - ≥5 system types loaded
  - All dependency edges validated
```

---

## T409 — Module Candidate Resolution

```
TASK TYPE: T409 — Module Candidate Resolution
ARCHETYPE: CLASSIFICATION
ENTRY: Fires per-screen after T407 (vector similarity) results ready; module matrix loaded (T408)
PURPOSE: Resolve module candidates per screen combining: vector similarity to archetypes (0.3) + GraphRAG traversal of module signatures (0.2) + deterministic feature matching (0.5); output ranked module candidates with evidence
DISTINCT FROM: T410 (system-level inference); T409 is per-screen module resolution
FACTORY DEPENDENCIES: F1115, F1116, F1117, F1106
FABRIC RESOLUTION:
  F1115→RAG FABRIC (IRagService, Hybrid) + DATABASE FABRIC (Elasticsearch, module_candidates)
  F1116→DATABASE FABRIC (Elasticsearch, confidence_scores)
  F1117→DATABASE FABRIC (Elasticsearch, constraint_checks) + RAG FABRIC (Graph strategy)
  F1106→RAG FABRIC (IRagService, Graph strategy) + DATABASE FABRIC (Elasticsearch, graph traversal)
AF CONFIGURATION:
  AF-4 (RAG Task Context): module signature retrieval via GraphRAG
  AF-5 (Multi-model): competing analyses if confidence below threshold
  AF-9 (Judge): validates candidate set passes constraint checks
  AF-10 (Merge): resolves competing model outputs if multi-model invoked
BFA VALIDATION:
  Check: resolved module names are valid Genie DNA modules — CF-553
MACHINE: Candidate scoring: evidence_weight×0.5 + vector_sim×0.3 + graph_hop_score×0.2
FREEDOM: Weight adjustments, minimum candidate threshold, confidence floor for inclusion
IRON RULES:
  - EVERY candidate MUST pass constraint satisfaction check → CF-554
  - Scoring formula weights MUST sum to 1.0 → CF-555
QUALITY GATES:
  - ≥1 module candidate per screen (except pure navigation screens)
  - All candidates have confidence scores
  - Constraint check PASS for all candidates
```

---

## T410 — Cross-Screen System Type Inference

```
TASK TYPE: T410 — Cross-Screen System Type Inference
ARCHETYPE: CLASSIFICATION
ENTRY: Fires after T409 complete for ALL screens; all per-screen module candidates available
PURPOSE: Aggregate module evidence across all screens; score system type candidates; produce ranked system_type_candidates list with rationale for SystemModelIR
DISTINCT FROM: T409 (per-screen); T410 is the file-level aggregation and system type classification
FACTORY DEPENDENCIES: F1121, F1122, F1123, F1124, F1125
FABRIC RESOLUTION:
  F1121→AI ENGINE FABRIC (AiDispatcher) + DATABASE FABRIC (Elasticsearch, system_type_inferences)
  F1122→DATABASE FABRIC (Elasticsearch, module_evidence_aggregate)
  F1123→DATABASE FABRIC (Elasticsearch, site_type_signatures)
  F1124→DATABASE FABRIC (Elasticsearch, dependency_constraint_checks)
  F1125→DATABASE FABRIC (Elasticsearch, system_type_rankings)
AF CONFIGURATION:
  AF-5 (Multi-model): competing system type classifications from Claude + GPT-4o; both see same evidence
  AF-9 (Judge): validates system type consistency with observed module set; constraint gate
  AF-10 (Merge): reconciles competing classifications into ranked candidates
BFA VALIDATION:
  Check: inferred system types don't duplicate FLOW-16 Giant Shop or FLOW-17 Freelancer Marketplace as hardcoded labels — CF-556
MACHINE: Aggregation algorithm, system type scoring, dependency consistency check
FREEDOM: System type taxonomy, scoring weights, ambiguity threshold
IRON RULES:
  - NEVER produce "definitive" system type with confidence < 0.7 — use "ambiguous" label → CF-557
  - ALWAYS include rationale referencing module evidence → CF-558
QUALITY GATES:
  - ≥1 system type candidate produced
  - Each candidate has: type, confidence, supporting_modules[], rationale
  - Consistency check PASS (modules consistent with system type constraints)
  - Ambiguous flag set if top confidence < 0.7
```

---

## T411 — Module Wiring Plan Synthesis

```
TASK TYPE: T411 — Module Wiring Plan Synthesis
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T410 system type confirmed; all module candidates validated
PURPOSE: Build final module wiring plan: screen→module assignments + required config doc list per module (view_definitions, form_definitions, cart_rules, invoice_configs, etc.); emit wiring-plan-ready event
DISTINCT FROM: T409 (candidate resolution); T411 is the final binding synthesis — not just candidates but committed assignments
FACTORY DEPENDENCIES: F1118, F1119, F1120
FABRIC RESOLUTION:
  F1118→DATABASE FABRIC (Elasticsearch, wiring_plans) + QUEUE FABRIC (Redis Streams, plan-ready event)
  F1119→DATABASE FABRIC (Elasticsearch, config_doc_requirements)
  F1120→DATABASE FABRIC (Elasticsearch, module_validation_log)
AF CONFIGURATION:
  AF-7 (Compliance): DNA gate (no hardcoded site-type values; all values → config docs)
  AF-9 (Judge): DNA module gate; validates all modules map to config docs
BFA VALIDATION:
  Check: config doc names don't shadow FLOW-21 form automation config docs — CF-559
MACHINE: Wiring plan schema, config doc mapping from DEFINITIVE_MODULE_ARCHITECTURE.md
FREEDOM: Plan output format, export targets, consumer config
IRON RULES:
  - EVERY module assignment MUST have corresponding config doc requirement list → CF-560
  - ZERO hardcoded site-type values in wiring plan → CF-561 (Genie DNA module gate)
QUALITY GATES:
  - All screens assigned ≥1 module (except pure navigation)
  - All modules have config doc requirement lists
  - DNA gate PASS: no hardcoded values
  - Plan stored with tenantId + fileKey + version
```

---

## T412 — Gap Detection Gate

```
TASK TYPE: T412 — Gap Detection Gate
ARCHETYPE: VALIDATION
ENTRY: Fires after T411 wiring plan ready; checks plan against module matrix expectations
PURPOSE: Detect missing modules, missing screens, broken flows; emit gap report with CRITICAL/HIGH/MEDIUM/LOW severity
DISTINCT FROM: T412 is the gap detection; T413 generates stubs for found gaps
FACTORY DEPENDENCIES: F1127, F1128, F1129, F1130, F1131
FABRIC RESOLUTION:
  F1127→DATABASE FABRIC (Elasticsearch, gap_reports) + RAG FABRIC (Graph, dependency traversal)
  F1128→DATABASE FABRIC (Elasticsearch, missing_modules)
  F1129→DATABASE FABRIC (Elasticsearch, missing_screens)
  F1130→DATABASE FABRIC (Elasticsearch, flow_gaps) + QUEUE FABRIC (Redis Streams, gap-found events)
  F1131→DATABASE FABRIC (Elasticsearch, gap_reports_final) + QUEUE FABRIC (Redis Streams, report-ready)
AF CONFIGURATION:
  AF-9 (Judge): AF-9 IS the gap detection judge; reviews module gap, screen gap, flow gap verdicts
BFA VALIDATION:
  Check: detected gap entities don't create new cross-flow conflicts with FLOW-01–FLOW-25 — CF-562
MACHINE: Gap detection rules, severity taxonomy, module dependency traversal
FREEDOM: Gap severity thresholds, which modules are "required" for detected system type
IRON RULES:
  - CRITICAL gaps MUST block promotion until resolved or explicitly deferred → CF-563
QUALITY GATES:
  - Gap report contains: moduleGaps[], screenGaps[], flowGaps[], each with severity + reason
  - CRITICAL gaps trigger admin notification via QUEUE FABRIC event
  - Gap report stored with fileKey + tenantId + timestamp
```

---

## T413 — Missing Screen / Flow Stub Generation

```
TASK TYPE: T413 — Missing Screen / Flow Stub Generation
ARCHETYPE: SYNTHESIS
ENTRY: Fires after T412 gap report; processes CRITICAL + HIGH gaps only for auto-stub
PURPOSE: Generate Genie DNA-compliant stubs for critical gaps: config doc stubs for missing modules; flow node stubs for missing screens; inject into FlowOrchestrator as GENERATED-tier artifacts
DISTINCT FROM: T412 (detection); T413 is generative — produces actual stubs
FACTORY DEPENDENCIES: F1132, F1118, F1119
FABRIC RESOLUTION:
  F1132→AI ENGINE FABRIC (AiDispatcher, stub generation) + FLOW ENGINE FABRIC (IFlowOrchestrator, stub injection)
  F1118→DATABASE FABRIC (Elasticsearch, wiring_plans — updated with stubs)
  F1119→DATABASE FABRIC (Elasticsearch, config_doc_requirements — extended)
AF CONFIGURATION:
  AF-1 (Genesis): generates stub config docs using module template library
  AF-7 (Compliance): DNA compliance check on all stubs
  AF-8 (Security): security scan on generated stubs
  AF-9 (Judge): validates stubs are GENERATED-tier (not CORE); Genie DNA compliant
BFA VALIDATION:
  Check: generated stubs don't create BFA conflicts — CF-564 (runs full BFA before stub promotion)
MACHINE: Stub template library per module type, DNA compliance rules, GENERATED-tier promotion rules
FREEDOM: Which gaps trigger auto-stub vs human review flag
IRON RULES:
  - ALL stubs MUST be GENERATED tier — never CORE → CF-565
  - ALL stubs MUST use DynamicController (no entity-specific controllers) → CF-566 (DNA-6)
  - ZERO typed models in stubs → CF-516 (DNA-1)
QUALITY GATES:
  - Stubs: schema-valid, DNA-compliant, GENERATED-tier tagged, BFA-checked
  - Each stub linked to gap that triggered it
```

---

## T414 — Feedback Correction Injection

```
TASK TYPE: T414 — Feedback Correction Injection
ARCHETYPE: LEARNING
ENTRY: User submits correction (wrong archetype/module/system type/missing gap); fires feedback pipeline
PURPOSE: Store correction; inject as negative or positive exemplar into RAG corpus; trigger calibration update; record in audit log
DISTINCT FROM: T415 (orchestrates full learning cycle); T414 is the single-correction injection
FACTORY DEPENDENCIES: F1133, F1134, F1135
FABRIC RESOLUTION:
  F1133→DATABASE FABRIC (Elasticsearch, feedback_corrections) + QUEUE FABRIC (Redis Streams, correction events)
  F1134→RAG FABRIC (IRagService, stores as negative exemplar)
  F1135→RAG FABRIC (IRagService, stores as positive exemplar)
AF CONFIGURATION:
  AF-11 (Feedback): THIS is AF-11 for FLOW-31
  AF-9 (Judge): validates correction is well-formed (has before/after/reason)
BFA VALIDATION:
  Check: correction doesn't inadvertently remove a FLOW-25 BFA-registered entity — CF-567
MACHINE: Correction schema, exemplar injection logic, audit trail
FREEDOM: Injection threshold, exemplar TTL, correction validation policy
IRON RULES:
  - EVERY correction MUST be stored in audit log with userId + timestamp → CF-568
  - Negative exemplar injection MUST reference the original model output + judge verdict → CF-569
QUALITY GATES:
  - Correction stored with: screenId, before, after, reason, userId, tenantId, timestamp
  - Exemplar injected into RAG with appropriate negative/positive tag
  - Calibration update queued
```

---

## T415 — Learning Loop Orchestration

```
TASK TYPE: T415 — Learning Loop Orchestration
ARCHETYPE: LEARNING
ENTRY: Scheduled (daily/weekly) OR triggered by correction count threshold (e.g., ≥10 corrections since last run)
PURPOSE: Full learning cycle: aggregate recent corrections → inject exemplars → run benchmark evaluation → track accuracy/calibration metrics → alert if accuracy drops > 5% → update confidence scoring model
DISTINCT FROM: T414 (single correction); T415 is the systematic learning cycle
FACTORY DEPENDENCIES: F1136, F1137, F1116, F1134, F1135
FABRIC RESOLUTION:
  F1136→DATABASE FABRIC (Elasticsearch, label_benchmark)
  F1137→QUEUE FABRIC (Redis Streams, learning loop events) + AI ENGINE FABRIC (AiDispatcher, re-scoring)
  F1116→DATABASE FABRIC (Elasticsearch, confidence_scores — updated)
  F1134→RAG FABRIC (negative exemplar updates)
  F1135→RAG FABRIC (positive exemplar updates)
AF CONFIGURATION:
  AF-5 (Multi-model): runs benchmark evaluation with current models
  AF-9 (Judge): validates benchmark results; compares to previous run; flags regressions
  AF-11 (Feedback): stores learning cycle results for meta-learning
BFA VALIDATION:
  Check: learning loop doesn't mutate FLOW-25 BFA conflict registry — CF-570
MACHINE: Benchmark evaluation metrics (accuracy/precision/recall/calibration), alert thresholds
FREEDOM: Loop frequency, correction count trigger threshold, alert channels
IRON RULES:
  - NEVER apply learning cycle results without first passing benchmark validation → CF-571
  - Accuracy drop > 5% MUST trigger HUMAN_REVIEW before applying changes → CF-572
QUALITY GATES:
  - Benchmark results: accuracy per module type, calibration curve, regression flags
  - Previous vs current comparison stored
  - Alert fired if accuracy drops > 5%
  - Learning cycle result stored with tenantId + timestamp + model versions
```

---

## FLOW-31 TEMPLATE INDEX

| Template | Name | Purpose |
|----------|------|---------|
| 83 | figma-ingestion-v1.json | DAG: T389→T390→T391→T392→T393→T394 |
| 84 | designir-processing-v1.json | DAG: T395→T396→T397 (per-screen batch) |
| 85 | screen-semantics-v1.json | DAG: T398→T399→T400 (per-screen) |
| 86 | graph-build-v1.json | DAG: T401→T402→T403→T404 |
| 87 | vector-embedding-v1.json | DAG: T405→T406 |
| 88 | module-mapping-v1.json | DAG: T407→T408→T409→T410→T411 |
| 89 | gap-completion-v1.json | DAG: T412→T413 |
| 90 | learning-loop-v1.json | DAG: T414→T415 |

---

## BACKWARD COMPATIBILITY STATEMENT
All task types T1–T388 and factory interfaces F1–F1074 are UNCHANGED.
FLOW-31 adds T389–T415 and F1075–F1142 only.
No modifications to existing engine contracts.
