# FLOW-31 — ENGINE ARCHITECTURE
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Date: 2026-03-01

---

## STARTING NUMBERS (FLOW-31)
```
Factory:  F1075    Family: 154
Ends at:  F1142    Family: 162
```

---

## ZONE MAP (9 Families)

| Family | Zone | Factories | Description |
|--------|------|-----------|-------------|
| 154 | Figma Ingestion | F1075–F1082 | REST API, plugin extraction, rate limiting, versioning |
| 155 | DesignIR Processing | F1083–F1090 | Feature extraction, layout semantics, component signatures |
| 156 | AI Semantic Extraction | F1091–F1098 | Multimodal prompts, archetype classification, evidence maps |
| 157 | Graph Index | F1099–F1107 | UI graph nodes/edges, module/system-type graphs, GraphRAG retrieval |
| 158 | Vector RAG | F1108–F1113 | Screen/component/archetype embeddings, similarity search |
| 159 | Module Mapping | F1114–F1120 | Module matrix, candidate resolution, wiring plan, config docs |
| 160 | System Type Inference | F1121–F1126 | System type candidates, dependency constraints, SystemModelIR |
| 161 | Gap Completion | F1127–F1132 | Missing modules/screens, flow gaps, stub generation |
| 162 | Learning Loop | F1133–F1142 | Feedback correction, exemplar injection, benchmark, quality gates |

---

## FAMILY 154 — FIGMA INGESTION ZONE
### Purpose: Extract all design data from Figma (REST + plugin), enforcing rate limits and caching.

```
F1075 : IFigmaApiClientService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (cache layer) + QUEUE FABRIC (Skill 04) → Redis Streams (rate-limit token bucket)
  CREATES:  Authenticated Figma REST sessions; manages API key rotation; returns raw JSON node tree per file version
  METHODS:  GetFileAsync(fileKey, version?) → DataProcessResult<Dictionary<string,object>>
            GetFileNodesAsync(fileKey, nodeIds[]) → DataProcessResult<Dictionary<string,object>>
            GetImagesAsync(fileKey, nodeIds[], format) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Rate limit enforcement, version tracking, JSON node tree structure
  FREEDOM:  API key selection, max-concurrent-requests, cache TTL
  DNA:      ParseDocument (all responses are Dictionary<string,object>), MicroserviceBase, DataProcessResult

F1076 : IFigmaPluginExtractorService
  FABRIC:   QUEUE FABRIC (Skill 04) → Redis Streams (plugin→server event pipeline)
  CREATES:  Plugin-side extractor that captures prototype reactions, auto-layout, variables not in REST API
  METHODS:  ExtractPrototypeReactionsAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
            ExtractLocalVariablesAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Reaction trigger/action schema, variable resolution
  FREEDOM:  Plugin polling interval, extraction depth
  DNA:      ParseDocument, MicroserviceBase, Scope Isolation (tenantId on all plugin events)

F1077 : IFigmaNodeParserService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (parsed node store)
  CREATES:  Normalizes raw Figma JSON into canonical node tree with typed attributes preserved as Dictionary
  METHODS:  ParseNodeTreeAsync(rawJson) → DataProcessResult<Dictionary<string,object>>
            ExtractTextLayersAsync(nodeTree) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Node type normalization (FRAME, COMPONENT, INSTANCE, TEXT, RECTANGLE…), hierarchy resolution
  FREEDOM:  Node depth limit, text-layer filtering rules
  DNA:      ParseDocument (no typed NodeModel classes), DataProcessResult

F1078 : IFigmaImageRendererService
  FABRIC:   AI ENGINE FABRIC (Skill 07) → vision model input preparation; DATABASE FABRIC → image URL cache
  CREATES:  Renders specific frames to images for multimodal AI input; manages image URL lifecycle
  METHODS:  RenderFrameAsync(fileKey, frameId, scale) → DataProcessResult<Dictionary<string,object>>
            RenderBatchAsync(fileKey, frameIds[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Image format (PNG/SVG), scale factor, URL expiry handling
  FREEDOM:  Max resolution, batch size, storage provider (S3/Azure Blob)
  DNA:      DataProcessResult, Scope Isolation

F1079 : IFigmaComponentCatalogService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (component registry index)
  CREATES:  Ingests published component/style library metadata; maps component IDs to canonical design-system names
  METHODS:  GetPublishedComponentsAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
            GetStylesAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
            ResolveComponentIdentityAsync(instanceNodeId) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Component ID → main component linkage, variant properties schema
  FREEDOM:  Which libraries to index, variant depth
  DNA:      ParseDocument, BuildQueryFilters (empty-field skip on style queries)

F1080 : IDesignTokenResolverService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (token index)
  CREATES:  Resolves Figma variables/tokens to semantic meaning (color roles, spacing scales, typography)
  METHODS:  ResolveTokenAsync(variableId) → DataProcessResult<Dictionary<string,object>>
            GetTokenMapAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Token → semantic role mapping (primary-color, spacing-md, heading-1…)
  FREEDOM:  Token taxonomy, alias resolution depth
  DNA:      ParseDocument, DataProcessResult

F1081 : IDesignVersionTrackerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (version history index)
  CREATES:  Tracks Figma file versions; triggers incremental re-ingestion only on change; prevents redundant scraping
  METHODS:  GetCurrentVersionAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
            HasChangedSinceAsync(fileKey, lastVersion) → DataProcessResult<Dictionary<string,object>>
            RecordIngestionAsync(fileKey, version, result) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Version comparison, change detection algorithm
  FREEDOM:  Polling interval, full-rescan threshold
  DNA:      DataProcessResult, Scope Isolation, BuildQueryFilters

F1082 : IFigmaRateLimitGuardService
  FABRIC:   QUEUE FABRIC (Skill 04) → Redis Streams (token-bucket per tenant per API tier)
  CREATES:  Enforces Figma API rate limits per seat type and endpoint tier; queues excess requests; never drops silently
  METHODS:  AcquireTokenAsync(endpointTier, tenantId) → DataProcessResult<Dictionary<string,object>>
            GetCurrentBudgetAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Tier definitions (REST-v1, REST-v2, Images), hard limits per plan
  FREEDOM:  Burst allowance, back-pressure strategy (queue vs reject)
  DNA:      DataProcessResult, MicroserviceBase, Scope Isolation
```

---

## FAMILY 155 — DESIGNIR PROCESSING ZONE
### Purpose: Transform normalized node tree into DesignIR — the stable machine-readable structural representation.

```
F1083 : IScreenFeatureExtractorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (designir_screens index)
  CREATES:  Per-screen deterministic feature set: layout primitives, detected widget types, component multiset
  METHODS:  ExtractFeaturesAsync(screenNode) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Widget detection rules (date-picker, cart-icon, table, filter-chips, chat-thread…), layout primitive taxonomy
  FREEDOM:  Custom widget pattern definitions, detection threshold
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1084 : IUIControlDetectorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (ui_controls index)
  CREATES:  Detects normalized control types from node structure (button/input/table/card/filter/modal/tab/form-field)
  METHODS:  DetectControlsAsync(screenNode) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Control taxonomy, detection heuristics (size+position+text+component-name patterns)
  FREEDOM:  Custom control definitions, ambiguity resolution policy
  DNA:      ParseDocument, DataProcessResult

F1085 : ILayoutSemanticAnalyzerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (layout_semantics index)
  CREATES:  Analyzes auto-layout direction/spacing/alignment as semantic signals (list vs grid, sidebar vs centered)
  METHODS:  AnalyzeLayoutAsync(screenNode) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Auto-layout axis, itemSpacing, padding, counterAxisAlignment → semantic label
  FREEDOM:  Layout archetype thresholds, grid detection sensitivity
  DNA:      ParseDocument, DataProcessResult

F1086 : IComponentSignatureBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (component_signatures index)
  CREATES:  Builds per-screen component multiset signature (which design-system components appear, counts, variants)
  METHODS:  BuildSignatureAsync(screenId, componentInstances[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Signature schema: {componentName, mainComponentId, variantProps, count}
  FREEDOM:  Signature normalization rules, alias mapping
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1087 : IScreenFingerprintBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (screen_fingerprints index)
  CREATES:  Combines component signature + layout primitive + interaction summary into a stable fingerprint for similarity
  METHODS:  BuildFingerprintAsync(screenId, features) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Fingerprint hash algorithm, canonical ordering
  FREEDOM:  Feature weighting (how much component vs layout vs interaction contributes)
  DNA:      ParseDocument, DataProcessResult

F1088 : IInteractionSemanticExtractorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (interaction_semantics index)
  CREATES:  Extracts prototype reactions (navigate/overlay/swap) as interaction event graph; detects CTA buttons
  METHODS:  ExtractInteractionsAsync(screenId, reactions[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Reaction taxonomy: NAVIGATE_TO, OPEN_OVERLAY, SWAP_STATE, CLOSE, SCROLL_TO
  FREEDOM:  CTA detection keywords, navigation depth limit
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1089 : IDesignIRAssemblerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (design_ir index — master DesignIR document per file)
  CREATES:  Assembles all per-screen artifacts into master DesignIR: screens[], components[], designTokens, screenMap, prototypeLinks
  METHODS:  AssembleDesignIRAsync(fileKey, version) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  DesignIR schema, cross-screen reference resolution
  FREEDOM:  Assembly strategy (incremental vs full rebuild), output index
  DNA:      ParseDocument, DataProcessResult, Scope Isolation, BuildQueryFilters

F1090 : IDesignIRValidatorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (ir_validation_log index)
  CREATES:  Validates DesignIR completeness: every screen has features, every component has identity, no orphaned refs
  METHODS:  ValidateAsync(designIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Validation rule set, mandatory field schema
  FREEDOM:  Strictness level, warning vs error thresholds
  DNA:      DataProcessResult, MicroserviceBase
```

---

## FAMILY 156 — AI SEMANTIC EXTRACTION ZONE
### Purpose: Use multimodal AI (image + structured JSON) to produce ScreenSemanticsIR per screen.

```
F1091 : IScreenSemanticsOrchestratorService
  FABRIC:   AI ENGINE FABRIC (Skill 07) → AiDispatcher (multi-model parallel: Claude Vision + GPT-4o) + QUEUE FABRIC → Redis Streams (per-screen tasks)
  CREATES:  Orchestrates per-screen semantic extraction pipeline: render → prompt build → AI call → parse → validate → store
  METHODS:  ExtractSemanticsAsync(screenId) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Pipeline steps, retry policy, AI model selection
  FREEDOM:  Which models compete, max-tokens, temperature
  DNA:      MicroserviceBase, DataProcessResult, Scope Isolation

F1092 : IMultimodalPromptBuilderService
  FABRIC:   RAG FABRIC (Skills 00a/00b) → IRagService (retrieves module signatures + known archetype examples as context)
  CREATES:  Builds structured multimodal prompt: pruned node tree JSON + text layers + component names + rendered image + RAG-retrieved module context
  METHODS:  BuildPromptAsync(screenId, imageUrl, nodeTree, ragContext) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Prompt schema, node tree pruning algorithm (remove decoration nodes), RAG context injection template
  FREEDOM:  Prompt template variant (detail level), RAG strategy (Vector vs Hybrid)
  DNA:      ParseDocument, DataProcessResult

F1093 : IScreenArchetypeClassifierService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider; DATABASE FABRIC → Elasticsearch (archetype_classifications index)
  CREATES:  Classifies each screen into archetype: list|detail|form|feed|profile|checkout|report|settings|onboarding|empty-state
  METHODS:  ClassifyArchetypeAsync(screenId, semanticsRaw) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Archetype taxonomy, confidence threshold
  FREEDOM:  Custom archetypes per project, confidence floor
  DNA:      ParseDocument, DataProcessResult

F1094 : IUIEntityExtractorService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider; DATABASE FABRIC → Elasticsearch (ui_entities index)
  CREATES:  Extracts data entities visible on screen (Product, Order, User, Post, Ticket, Invoice…) with field evidence
  METHODS:  ExtractEntitiesAsync(screenId, textLayers, componentNames) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Entity taxonomy, field extraction heuristics
  FREEDOM:  Domain-specific entity definitions, custom entity registry per tenant
  DNA:      ParseDocument, DataProcessResult, Scope Isolation (tenantId on entity index)

F1095 : IActionPatternDetectorService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider; DATABASE FABRIC → Elasticsearch (action_patterns index)
  CREATES:  Detects user actions from screen (create/edit/search/pay/chat/book/filter/export/cancel/refund…)
  METHODS:  DetectActionsAsync(screenId, ctaButtons, interactions) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Action taxonomy, CTA button → action mapping
  FREEDOM:  Custom action definitions, ambiguity resolution
  DNA:      ParseDocument, DataProcessResult

F1096 : IEvidenceMapBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (evidence_maps index)
  CREATES:  For every AI-inferred claim (module/action/entity), builds evidence record: {nodeId, textLayer, componentName, boundingBoxCue}
  METHODS:  BuildEvidenceMapAsync(screenId, aiOutput) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Evidence schema, claim→evidence linkage, minimum-evidence threshold
  FREEDOM:  Evidence depth, additional evidence sources
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1097 : IIntentSummaryGeneratorService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider; DATABASE FABRIC → Elasticsearch (intent_summaries index)
  CREATES:  Generates one-line screen intent summary (searchable): "Product catalog grid with price badges and filter sidebar"
  METHODS:  GenerateSummaryAsync(screenId, semanticsIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Summary template, max length
  FREEDOM:  Summary style (technical vs user-facing), language
  DNA:      ParseDocument, DataProcessResult

F1098 : ISemanticIRValidatorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (semantic_ir_validation_log index)
  CREATES:  Validates ScreenSemanticsIR: schema-valid, evidence coverage threshold met, no contradictions
  METHODS:  ValidateSemanticsAsync(screenId, semanticsIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Schema rules, coverage minimum (every claim has ≥1 evidence item)
  FREEDOM:  Strictness level, warning vs error policy
  DNA:      DataProcessResult, MicroserviceBase
```

---

## FAMILY 157 — GRAPH INDEX ZONE
### Purpose: Build and maintain the property graph (Screen/Component/Action/Entity/Module/SystemType nodes + typed edges).

```
F1099 : IUIGraphBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (ui_graph_nodes + ui_graph_edges indices)
  CREATES:  Builds property graph per file: Screen nodes, Component nodes, ControlType nodes, Action nodes, Entity nodes
  METHODS:  BuildGraphAsync(fileKey, designIR, semanticsIRs[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Node schemas, edge types: CONTAINS, USES, HAS_ACTION, OPERATES_ON, NAVIGATES_TO, VARIANT_OF
  FREEDOM:  Graph depth, edge weight algorithm
  DNA:      ParseDocument, DataProcessResult, Scope Isolation (all nodes tagged tenantId + fileKey)

F1100 : IGraphNodeIndexerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (graph nodes index with vector field)
  CREATES:  Indexes graph nodes with embeddings + properties for hybrid graph+vector retrieval
  METHODS:  IndexNodeAsync(node) → DataProcessResult<Dictionary<string,object>>
            BatchIndexAsync(nodes[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Node embedding schema, index mapping
  FREEDOM:  Embedding model selection, batch size
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1101 : IGraphEdgeResolverService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (graph edges index)
  CREATES:  Resolves and stores typed edges; deduplicates; handles bidirectional edges where needed
  METHODS:  ResolveEdgesAsync(sourceNodeId, targetNodeId, edgeType, properties) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Edge type taxonomy, deduplication key
  FREEDOM:  Edge weight source (frequency/confidence/manual)
  DNA:      ParseDocument, DataProcessResult

F1102 : IModuleSignatureGraphService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (module_signature_graph index)
  CREATES:  Stores canonical "module signatures" as subgraphs (e.g., Cart module = ProductCard + Quantity + Checkout CTA + price typography)
  METHODS:  StoreModuleSignatureAsync(moduleName, signatureSubgraph) → DataProcessResult<Dictionary<string,object>>
            GetSignatureAsync(moduleName) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Module signature schema from DEFINITIVE_MODULE_ARCHITECTURE.md
  FREEDOM:  Custom module signatures per tenant, confidence thresholds
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1103 : ISystemTypeGraphService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (system_type_graph index)
  CREATES:  Stores system type nodes (store/social/events/hotels/dashboard) with required-module edges and dependency constraints from module matrix
  METHODS:  StoreSystemTypeConstraintsAsync(systemType, constraints) → DataProcessResult<Dictionary<string,object>>
            GetConstraintsAsync(systemType) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  System type taxonomy, module dependency map from GENERIC_MODULE_ANALYSIS_COMPLETE.md
  FREEDOM:  Custom system types, dependency override
  DNA:      ParseDocument, DataProcessResult

F1104 : INavigationFlowGrapherService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (navigation_flows index)
  CREATES:  Derives navigation flow graph from prototype reactions: Screen A → Screen B via trigger/action
  METHODS:  BuildNavigationFlowAsync(fileKey, reactions[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Flow DAG construction, entry-point detection
  FREEDOM:  Max path depth, cycle detection policy
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1105 : IModuleDependencyGrapherService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (module_dependency_graph index)
  CREATES:  Stores cross-module dependency edges (Cart ← Promotions, Checkout → Invoices, Cancel/Refund → CreditNote…)
  METHODS:  StoreDependencyAsync(sourceModule, targetModule, dependencyType) → DataProcessResult<Dictionary<string,object>>
            GetDependenciesAsync(moduleName) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Dependency type taxonomy: REQUIRES, OPTIONAL, CONFLICTS_WITH
  FREEDOM:  Custom dependency overrides
  DNA:      ParseDocument, DataProcessResult

F1106 : IGraphRAGRetrieverService
  FABRIC:   RAG FABRIC (Skills 00a/00b) → IRagService (Graph strategy); DATABASE FABRIC → Elasticsearch (graph traversal)
  CREATES:  Multi-hop graph retrieval: vector similarity → graph traversal → constraint pull (module signatures, dependencies)
  METHODS:  RetrieveAsync(screenEmbedding, candidateModules[], hops) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Hop limit, traversal strategy (BFS/DFS), result scoring
  FREEDOM:  Max hops, retrieval depth, context window limit
  DNA:      ParseDocument, DataProcessResult, MicroserviceBase

F1107 : ICrossScreenGraphMergerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (merged_screen_graph index)
  CREATES:  Merges individual screen subgraphs into unified file-level graph; resolves shared entities (same Order entity across Checkout + OrderDetail)
  METHODS:  MergeGraphsAsync(fileKey, screenGraphs[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Entity identity resolution (name + field fingerprint), merge conflict policy
  FREEDOM:  Merge strategy (conservative/aggressive), similarity threshold
  DNA:      ParseDocument, DataProcessResult, Scope Isolation
```

---

## FAMILY 158 — VECTOR RAG ZONE
### Purpose: Embed screens, components, archetypes for similarity search.

```
F1108 : IScreenEmbeddingService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider (embedding endpoint); DATABASE FABRIC → Elasticsearch (screen_embeddings index, dense_vector field)
  CREATES:  Generates multi-signal screen embedding: text content + component names + layout descriptors + intent summary
  METHODS:  EmbedScreenAsync(screenId, semanticsIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Embedding model (text-embedding-3-large or equivalent), vector dimension
  FREEDOM:  Embedding model choice, signal weighting
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1109 : IComponentEmbeddingService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider (embedding); DATABASE FABRIC → Elasticsearch (component_embeddings index)
  CREATES:  Embeds canonical design-system components (name + variant props + usage context) for pattern mining
  METHODS:  EmbedComponentAsync(componentId, metadata) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Component embedding schema
  FREEDOM:  Embedding refresh schedule
  DNA:      ParseDocument, DataProcessResult

F1110 : IArchetypeEmbeddingService
  FABRIC:   AI ENGINE FABRIC (Skill 06) → IAiProvider (embedding); DATABASE FABRIC → Elasticsearch (archetype_embeddings index)
  CREATES:  Stores canonical archetype embeddings ("Store Product List", "Social Feed", "Hotel Booking") as retrieval anchors
  METHODS:  EmbedArchetypeAsync(archetypeName, canonicalDescription) → DataProcessResult<Dictionary<string,object>>
            GetArchetypeEmbeddingAsync(archetypeName) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Archetype catalog (sourced from module-architecture matrix), embedding strategy
  FREEDOM:  Custom archetypes per tenant, description templates
  DNA:      ParseDocument, DataProcessResult

F1111 : ISimilaritySearchService
  FABRIC:   RAG FABRIC (Skills 00a/00b) → IRagService (Vector strategy); DATABASE FABRIC → Elasticsearch (kNN search)
  CREATES:  kNN vector search across screen/component/archetype indices; returns top-K with cosine similarity scores
  METHODS:  SearchSimilarScreensAsync(queryEmbedding, topK) → DataProcessResult<Dictionary<string,object>>
            SearchSimilarComponentsAsync(queryEmbedding, topK) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  kNN algorithm, similarity metric (cosine), score threshold
  FREEDOM:  topK value, minimum similarity threshold
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters (tenantId filter always applied)

F1112 : IVectorIndexManagerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (index management)
  CREATES:  Manages vector index lifecycle: creation, mapping updates, reindex on model change, scope-isolated per tenant
  METHODS:  EnsureIndexAsync(indexName, mappingConfig) → DataProcessResult<Dictionary<string,object>>
            ReindexAsync(indexName, newModel) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Index mapping templates, reindex strategy
  FREEDOM:  Index naming convention, shard count
  DNA:      DataProcessResult, Scope Isolation, MicroserviceBase

F1113 : IEmbeddingCacheService
  FABRIC:   DATABASE FABRIC (Skill 05) → Redis provider (embedding cache); QUEUE FABRIC → Redis Streams (cache invalidation events)
  CREATES:  Caches embeddings by (screenId + version + modelId) to avoid re-embedding on re-ingest without changes
  METHODS:  GetCachedEmbeddingAsync(cacheKey) → DataProcessResult<Dictionary<string,object>>
            SetCachedEmbeddingAsync(cacheKey, embedding, ttl) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Cache key schema, TTL policy
  FREEDOM:  TTL duration, invalidation trigger policy
  DNA:      DataProcessResult, Scope Isolation
```

---

## FAMILY 159 — MODULE MAPPING ZONE
### Purpose: Map screens to Genie DNA modules using matrix constraints + GraphRAG + similarity.

```
F1114 : IModuleMatrixLoaderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (module_matrix index — sourced from GENERIC_MODULE_ANALYSIS_COMPLETE.md 20×15 matrix)
  CREATES:  Loads and serves the module matrix: for each system type, which modules are required/optional/typical; dependency map
  METHODS:  GetModuleMatrixAsync(systemType?) → DataProcessResult<Dictionary<string,object>>
            GetDependencyMapAsync(moduleName) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Matrix schema, 20 core modules × 15 site types, dependency edges
  FREEDOM:  Custom module additions per tenant
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1115 : IModuleCandidateResolverService
  FABRIC:   RAG FABRIC → IRagService (Hybrid: Vector + Graph); DATABASE FABRIC → Elasticsearch (module_candidates index)
  CREATES:  Resolves module candidates per screen: combines vector similarity to archetypes + graph traversal of module signatures + deterministic feature matching
  METHODS:  ResolveModuleCandidatesAsync(screenId, semanticsIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Candidate scoring formula: evidence_weight×0.5 + vector_sim×0.3 + graph_hop_score×0.2
  FREEDOM:  Weight adjustments, minimum candidate threshold
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1116 : IConfidenceScorerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (confidence_scores index)
  CREATES:  Scores each module candidate with calibrated confidence; tracks calibration over time via feedback
  METHODS:  ScoreAsync(screenId, candidateModules[], evidence[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Scoring model, calibration curve
  FREEDOM:  Confidence floor for inclusion, calibration update frequency
  DNA:      DataProcessResult, MicroserviceBase

F1117 : IConstraintSatisfactionEngineService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (constraint_checks index); RAG FABRIC → Graph strategy
  CREATES:  Validates module candidate set against module dependency constraints: if Cart exists, Checkout must exist or be explicitly excluded
  METHODS:  CheckConstraintsAsync(fileKey, candidateModuleSets[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Constraint rule engine (REQUIRES, OPTIONAL, CONFLICTS_WITH)
  FREEDOM:  Violation handling: WARN vs BLOCK
  DNA:      DataProcessResult, BuildQueryFilters

F1118 : IModuleWiringPlanBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (wiring_plans index); QUEUE FABRIC → Redis Streams (plan-ready event)
  CREATES:  Builds final "module wiring plan": screen→module assignments + required config doc list per module
  METHODS:  BuildWiringPlanAsync(fileKey, resolvedModules[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Wiring plan schema, config doc mapping
  FREEDOM:  Plan output format, export targets
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1119 : IConfigDocRequirementResolverService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (config_doc_requirements index)
  CREATES:  For each mapped module, resolves required Genie DNA config docs: view_definitions, detail_definitions, form_definitions, cart_rules, invoice_configs, chat_configs…
  METHODS:  ResolveRequirementsAsync(moduleName) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Module → config doc mapping (from DEFINITIVE_MODULE_ARCHITECTURE.md)
  FREEDOM:  Config doc overrides per project
  DNA:      ParseDocument, DataProcessResult

F1120 : IGenieDNAModuleValidatorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (module_validation_log index)
  CREATES:  Validates that all module mappings result in Genie DNA config docs (not hardcoded values); enforces "no site-type hardcoding" rule
  METHODS:  ValidateModuleMappingAsync(wiringPlan) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  DNA compliance rules for module layer
  FREEDOM:  Strictness level
  DNA:      DataProcessResult, MicroserviceBase
```

---

## FAMILY 160 — SYSTEM TYPE INFERENCE ZONE
### Purpose: Aggregate module evidence across all screens to infer system type candidates.

```
F1121 : ISystemTypeInferencerService
  FABRIC:   AI ENGINE FABRIC (Skill 07) → AiDispatcher; DATABASE FABRIC → Elasticsearch (system_type_inferences index)
  CREATES:  Aggregates per-screen module evidence; scores each system type candidate; produces ranked list with rationale
  METHODS:  InferSystemTypeAsync(fileKey, perScreenModuleSets[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Aggregation algorithm, system type scoring
  FREEDOM:  System type taxonomy, scoring weights
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1122 : IModuleEvidenceAggregatorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (module_evidence_aggregate index)
  CREATES:  Counts module evidence across all screens; weights by screen count, confidence, and flow position
  METHODS:  AggregateAsync(fileKey, allScreenModuleCandidates[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Evidence aggregation formula, flow-position weights (entry-screen gets higher weight)
  FREEDOM:  Weight adjustments
  DNA:      ParseDocument, DataProcessResult, BuildQueryFilters

F1123 : ISiteTypeSignatureLoaderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (site_type_signatures index)
  CREATES:  Loads canonical site-type signatures (Social needs Feed+Profile+Engagement; Store needs Catalog+Cart+Checkout; Hotel needs Availability+Cancellation)
  METHODS:  GetSignatureAsync(systemType) → DataProcessResult<Dictionary<string,object>>
            MatchSignatureAsync(observedModules[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Signature definitions, match threshold
  FREEDOM:  Custom site-type signatures per tenant
  DNA:      ParseDocument, DataProcessResult

F1124 : IDependencyConstraintCheckerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (dependency_constraint_checks index)
  CREATES:  Checks whether inferred system type is consistent with observed module set (constraint satisfaction over system type)
  METHODS:  CheckSystemTypeConsistencyAsync(systemType, observedModules[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Consistency rules from module-architecture dependency map
  FREEDOM:  Violation severity policy
  DNA:      DataProcessResult

F1125 : ISystemTypeConfidenceRankerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (system_type_rankings index)
  CREATES:  Produces final ranked list of system type candidates with calibrated confidence; flags ambiguous multi-type systems
  METHODS:  RankCandidatesAsync(fileKey, scoredTypes[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Ranking algorithm, ambiguity threshold
  FREEDOM:  Min confidence for "definitive" vs "ambiguous" label
  DNA:      DataProcessResult

F1126 : ISystemModelIRBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (system_model_ir index — master output document); QUEUE FABRIC → Redis Streams (model-ready event)
  CREATES:  Assembles final SystemModelIR: system_type_candidates, module_map, flows[], entity_map, config_doc_plan, gaps[]
  METHODS:  BuildSystemModelIRAsync(fileKey) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  SystemModelIR schema
  FREEDOM:  Output format, downstream consumer config
  DNA:      ParseDocument, DataProcessResult, Scope Isolation
```

---

## FAMILY 161 — GAP COMPLETION ZONE
### Purpose: Detect missing modules/screens/flows and generate stubs.

```
F1127 : IGapDetectorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (gap_reports index); RAG FABRIC → Graph strategy (module dependency traversal)
  CREATES:  Compares inferred system type against module matrix expectations; emits gaps[] with severity
  METHODS:  DetectGapsAsync(fileKey, systemModelIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Gap detection rules, severity taxonomy: CRITICAL/HIGH/MEDIUM/LOW
  FREEDOM:  Gap severity thresholds, which modules are "required" for the detected system type
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1128 : IMissingModuleResolverService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (missing_modules index)
  CREATES:  For each detected gap, resolves which specific Genie DNA module + config docs are needed
  METHODS:  ResolveMissingModulesAsync(gaps[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Module resolution rules, priority ordering
  FREEDOM:  Resolution strategy (must-add vs suggest)
  DNA:      DataProcessResult

F1129 : IMissingScreenDetectorService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (missing_screens index)
  CREATES:  Detects missing screens based on flow completeness: if Cart exists, Order Confirmation screen should exist
  METHODS:  DetectMissingScreensAsync(fileKey, navigationFlowGraph) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Flow completeness rules, mandatory screen pairs
  FREEDOM:  Completeness policy strictness
  DNA:      ParseDocument, DataProcessResult

F1130 : IFlowGapAnalyzerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (flow_gaps index); QUEUE FABRIC → Redis Streams (gap-found events)
  CREATES:  Analyzes prototype flow graph for broken flows: navigation paths that terminate without resolution
  METHODS:  AnalyzeFlowGapsAsync(fileKey, navigationFlowGraph) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Flow termination rules, dead-end detection
  FREEDOM:  Severity thresholds, which terminations are acceptable
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1131 : IGapReportBuilderService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (gap_reports_final index); QUEUE FABRIC → Redis Streams (report-ready event)
  CREATES:  Compiles all gap findings into unified gap report with prioritized action list
  METHODS:  BuildReportAsync(fileKey, moduleGaps[], screenGaps[], flowGaps[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Report schema, priority ordering algorithm
  FREEDOM:  Report format, consumer targets (admin UI, webhook, email)
  DNA:      ParseDocument, DataProcessResult

F1132 : IStubGenerationOrchestratorService
  FABRIC:   AI ENGINE FABRIC (Skill 07) → AiDispatcher (stub code generation); FLOW ENGINE FABRIC (Skill 09) → IFlowOrchestrator (stub flow injection)
  CREATES:  For critical gaps, generates Genie DNA compliant stubs: config doc stubs for missing modules; flow node stubs for missing screens
  METHODS:  GenerateStubsAsync(fileKey, criticalGaps[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Stub template library per module type, DNA compliance rules
  FREEDOM:  Which gaps trigger auto-stub vs human review
  DNA:      ParseDocument, DataProcessResult, MicroserviceBase, DynamicController
```

---

## FAMILY 162 — LEARNING LOOP ZONE
### Purpose: Feedback correction, exemplar injection, benchmark management, quality gates.

```
F1133 : IFeedbackCorrectionStoreService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (feedback_corrections index); QUEUE FABRIC → Redis Streams (correction events)
  CREATES:  Stores user corrections: before/after labels, model output, judge verdict, evidence used
  METHODS:  StoreCorrectionAsync(screenId, before, after, reason, userId) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Correction schema, correction type taxonomy: WRONG_ARCHETYPE/WRONG_MODULE/WRONG_SYSTEM_TYPE/MISSING_GAP
  FREEDOM:  Correction validation (human review required vs auto-apply)
  DNA:      ParseDocument, DataProcessResult, Scope Isolation, BuildQueryFilters

F1134 : INegativeExemplarInjectorService
  FABRIC:   RAG FABRIC (Skills 00a/00b) → IRagService (stores as negative exemplar in retrieval corpus)
  CREATES:  Injects negative corrections as anti-examples into RAG corpus so future retrievals avoid same mistakes
  METHODS:  InjectNegativeExemplarAsync(correction) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Exemplar injection schema, anti-example tagging
  FREEDOM:  Injection threshold (min corrections before injection), exemplar TTL
  DNA:      ParseDocument, DataProcessResult

F1135 : IPositiveExemplarInjectorService
  FABRIC:   RAG FABRIC (Skills 00a/00b) → IRagService (stores as positive exemplar)
  CREATES:  Injects confirmed-correct mappings as positive exemplars for future retrieval reinforcement
  METHODS:  InjectPositiveExemplarAsync(screenId, confirmedMapping) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Positive exemplar schema, confidence reinforcement algorithm
  FREEDOM:  Injection trigger policy, weight boost magnitude
  DNA:      ParseDocument, DataProcessResult

F1136 : ILabelBenchmarkManagerService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (label_benchmark index)
  CREATES:  Maintains labeled benchmark set of screens (known ground truth) for continuous classification evaluation
  METHODS:  AddBenchmarkSampleAsync(screenId, groundTruthMapping) → DataProcessResult<Dictionary<string,object>>
            RunBenchmarkAsync() → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Benchmark evaluation metrics: accuracy, precision/recall per module, calibration
  FREEDOM:  Benchmark size, evaluation schedule
  DNA:      ParseDocument, DataProcessResult, Scope Isolation

F1137 : ILearningLoopOrchestratorService
  FABRIC:   QUEUE FABRIC (Skill 04) → Redis Streams (learning loop events); AI ENGINE FABRIC → AiDispatcher (re-scoring)
  CREATES:  Orchestrates full learning loop: correction → exemplar injection → benchmark run → metric tracking → alert if accuracy drops
  METHODS:  RunLearningCycleAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Loop cadence, accuracy drop threshold for alert
  FREEDOM:  Loop frequency, alert channels
  DNA:      MicroserviceBase, DataProcessResult, Scope Isolation

F1138 : IEvidenceCoverageGateService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (gate_results index)
  CREATES:  Gate: every module/action/entity claim must reference ≥1 evidence item (nodeId/text/component name). Fails build if not met.
  METHODS:  EvaluateAsync(screenId, semanticsIR) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Minimum evidence count per claim type
  FREEDOM:  Evidence threshold per severity tier
  DNA:      DataProcessResult, MicroserviceBase

F1139 : ICrossScreenConsistencyGateService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (consistency_gate_results index)
  CREATES:  Gate: entities must be consistent across screens (same Order entity = same fields + naming). Fires on contradiction.
  METHODS:  EvaluateAsync(fileKey, allEntityMaps[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Consistency rules, contradiction detection algorithm
  FREEDOM:  Tolerance for minor naming variation, severity thresholds
  DNA:      DataProcessResult, MicroserviceBase, BuildQueryFilters

F1140 : IModuleDependencyConstraintGateService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (dependency_gate_results index)
  CREATES:  Gate: if Cart exists, Checkout must exist or explicitly marked cart-only. Applies all dependency constraint checks.
  METHODS:  EvaluateAsync(fileKey, resolvedModules[]) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Dependency constraint rules from module matrix
  FREEDOM:  Exemption declarations
  DNA:      DataProcessResult

F1141 : IGenieDNAModuleGateService
  FABRIC:   DATABASE FABRIC (Skill 05) → Elasticsearch (dna_gate_results index)
  CREATES:  Gate: no screen mapping results in hardcoded site-type values; everything must flow into module config docs
  METHODS:  EvaluateAsync(fileKey, wiringPlan) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  DNA rules for design intelligence layer
  FREEDOM:  Strictness level
  DNA:      DataProcessResult, MicroserviceBase

F1142 : IJudgeOrchestrator31Service
  FABRIC:   QUEUE FABRIC (Skill 04) → Redis Streams (judgment pipeline); AI ENGINE FABRIC → IAiProvider (AF-9 Judge)
  CREATES:  Orchestrates all 4 quality gates in sequence (Evidence → Consistency → Dependency → DNA); aggregates verdicts; promotes or blocks
  METHODS:  RunJudgmentAsync(fileKey, pipeline) → DataProcessResult<Dictionary<string,object>>
  MACHINE:  Gate execution order, verdict aggregation, promotion decision
  FREEDOM:  Gate bypass policy for specific warning types
  DNA:      MicroserviceBase, DataProcessResult, Scope Isolation
```

---

## ELASTICSEARCH INDEX INVENTORY (FLOW-31)

| Index | Owner Factory | Scope |
|-------|---------------|-------|
| figma_ingestion_cache | F1075 | tenant + fileKey |
| figma_plugin_events | F1076 | tenant + fileKey |
| figma_node_tree | F1077 | tenant + fileKey |
| figma_image_cache | F1078 | tenant + fileKey |
| figma_component_catalog | F1079 | tenant |
| design_token_map | F1080 | tenant + fileKey |
| figma_version_history | F1081 | tenant + fileKey |
| rate_limit_buckets | F1082 | tenant |
| designir_screens | F1083 | tenant + fileKey |
| ui_controls | F1084 | tenant + fileKey + screenId |
| layout_semantics | F1085 | tenant + fileKey + screenId |
| component_signatures | F1086 | tenant + fileKey + screenId |
| screen_fingerprints | F1087 | tenant + fileKey + screenId |
| interaction_semantics | F1088 | tenant + fileKey + screenId |
| design_ir | F1089 | tenant + fileKey |
| ir_validation_log | F1090 | tenant + fileKey |
| archetype_classifications | F1093 | tenant + fileKey + screenId |
| ui_entities | F1094 | tenant + fileKey + screenId |
| action_patterns | F1095 | tenant + fileKey + screenId |
| evidence_maps | F1096 | tenant + fileKey + screenId |
| intent_summaries | F1097 | tenant + fileKey + screenId |
| semantic_ir_validation_log | F1098 | tenant + fileKey |
| ui_graph_nodes | F1099 | tenant + fileKey |
| ui_graph_edges | F1099 | tenant + fileKey |
| module_signature_graph | F1102 | tenant |
| system_type_graph | F1103 | global (shared ontology) |
| navigation_flows | F1104 | tenant + fileKey |
| module_dependency_graph | F1105 | global |
| screen_embeddings | F1108 | tenant + fileKey + screenId |
| component_embeddings | F1109 | tenant |
| archetype_embeddings | F1110 | global |
| module_matrix | F1114 | global |
| module_candidates | F1115 | tenant + fileKey + screenId |
| confidence_scores | F1116 | tenant + fileKey + screenId |
| constraint_checks | F1117 | tenant + fileKey |
| wiring_plans | F1118 | tenant + fileKey |
| config_doc_requirements | F1119 | tenant + fileKey |
| module_validation_log | F1120 | tenant + fileKey |
| system_type_inferences | F1121 | tenant + fileKey |
| module_evidence_aggregate | F1122 | tenant + fileKey |
| site_type_signatures | F1123 | global |
| system_type_rankings | F1125 | tenant + fileKey |
| system_model_ir | F1126 | tenant + fileKey |
| gap_reports | F1127 | tenant + fileKey |
| missing_modules | F1128 | tenant + fileKey |
| missing_screens | F1129 | tenant + fileKey |
| flow_gaps | F1130 | tenant + fileKey |
| gap_reports_final | F1131 | tenant + fileKey |
| feedback_corrections | F1133 | tenant |
| label_benchmark | F1136 | tenant |
| gate_results | F1138–F1141 | tenant + fileKey |
