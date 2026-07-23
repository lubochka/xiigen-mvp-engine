# FLOW-31 — BFA STRESS TEST
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## BFA Rules: CF-510–CF-551 (42 rules)
## Stress Tests: ST-300–ST-325 (26 tests)
## Date: 2026-03-01

---

## STARTING NUMBERS (FLOW-31)
```
BFA Rule:    CF-510   (ends CF-551)
Stress Test: ST-300   (ends ST-325)
```

---

## SECTION 1 — BFA CONFLICT RULES (CF-510–CF-551)

### GROUP A — Ingestion & Rate Limit Safety (CF-510–CF-519)

```
CF-510 : FIGMA_SCOPE_ISOLATION
  SEVERITY: CRITICAL
  TRIGGER: Any FLOW-31 factory stores or queries without tenantId
  RULE: Every Figma ingestion document (node tree, image cache, IR, graph node) MUST carry tenantId as first-level
        field. Absence = BUILD FAILURE.
  AFFECTED TASK TYPES: T389–T415
  CONFLICTS WITH: Any cross-tenant Figma data leak
  RESOLUTION: Engine adds tenantId to all store/search calls via Scope Isolation (DNA-5)

CF-511 : FIGMA_FILKEY_NAMESPACE_COLLISION
  SEVERITY: HIGH
  TRIGGER: FLOW-31 fileKey index overlaps with FLOW-18 visual flow editor's flow definition registry
  RULE: Figma fileKey namespace (figma::*) is reserved for FLOW-31. Flow definition IDs (flow::*) are reserved
        for FLOW-18. Collision = BUILD FAILURE.
  AFFECTED TASK TYPES: T389, T390
  CONFLICTS WITH: FLOW-18 (F472 IFlowExecutionService), FLOW-15 (F466 IFlowDefinitionRegistryService)
  RESOLUTION: Prefix all FLOW-31 ES document IDs with "figma31::{tenantId}::{fileKey}"

CF-512 : RATE_LIMIT_TOKEN_REQUIRED
  SEVERITY: CRITICAL
  TRIGGER: Any Figma API call attempted without acquiring rate-limit token from F1082
  RULE: F1075 (IFigmaApiClientService) MUST call F1082 (IFigmaRateLimitGuardService) BEFORE every REST call.
        Bypassing = BUILD FAILURE.
  AFFECTED TASK TYPES: T389, T391
  CONFLICTS WITH: Figma API quota violations that affect all tenants on shared API key
  RESOLUTION: Rate limit token acquisition is first step in ingestion pipeline, enforced by MACHINE config

CF-513 : DOCUMENT_SCOPE_REQUIRED
  SEVERITY: CRITICAL
  TRIGGER: Any document stored without tenantId + fileKey composite scope
  RULE: All FLOW-31 ES indices require { tenantId, fileKey } on every document. Queries missing either field
        are rejected by BuildSearchFilter (DNA-2).
  AFFECTED TASK TYPES: T389–T415
  CONFLICTS WITH: Global shared indices that ignore tenant boundaries
  RESOLUTION: MicroserviceBase (DNA-4) enforces scope injection; AF-7 (Compliance) gate validates

CF-514 : VERSION_CHECK_MANDATORY
  SEVERITY: HIGH
  TRIGGER: Figma file re-fetched without first checking IFigmaVersionManagerService (F1081)
  RULE: NEVER re-ingest a file that hasn't changed. Version comparison required before any GET /files/{key} call.
  AFFECTED TASK TYPES: T389
  CONFLICTS WITH: Redundant API quota consumption + stale IR data coexisting with fresh data
  RESOLUTION: T389 ENTRY condition requires version delta confirmation before proceeding

CF-515 : COMPONENT_REGISTRY_COLLISION
  SEVERITY: HIGH
  TRIGGER: FLOW-31 component catalog (F1079) uses same ES index name as FLOW-22/FLOW-23 visual editor
           component registry
  RULE: Component catalog index for FLOW-31 must be prefixed "figma31_component_catalog", not "component_catalog"
  AFFECTED TASK TYPES: T390
  CONFLICTS WITH: FLOW-22 (visual editor), FLOW-23 (component library)
  RESOLUTION: Index naming convention enforced at factory registration

CF-516 : TYPED_MODEL_PROHIBITION
  SEVERITY: CRITICAL
  TRIGGER: Generated service creates typed class (ProductNode, TextLayer, ScreenModel, etc.) instead of
           Dictionary<string,object>
  RULE: DNA-1 (ParseDocument) — ALL Figma IR, ScreenSemanticsIR, SystemModelIR MUST be Dictionary<string,object>.
        Zero typed model classes = BUILD RULE. Violation = BUILD FAILURE.
  AFFECTED TASK TYPES: T390–T415
  CONFLICTS WITH: Any typed model usage in AI-generated code
  RESOLUTION: AF-7 (Compliance) gate checks generated code for class declarations with UI/IR/Model suffix

CF-517 : IMAGE_STORAGE_SCOPE
  SEVERITY: HIGH
  TRIGGER: Rendered frame images stored in shared bucket without tenant partition
  RULE: All frame images must be stored under tenant-scoped path: {storageProvider}/{tenantId}/{fileKey}/{frameId}
  AFFECTED TASK TYPES: T391
  CONFLICTS WITH: Cross-tenant image URL exposure
  RESOLUTION: F1078 (IFigmaImageRendererService) enforces bucket path scoping via FREEDOM config

CF-518 : IMAGE_URL_EXPIRY_REQUIRED
  SEVERITY: HIGH
  TRIGGER: Frame image URLs stored without expiry timestamp (Figma image URLs expire after 30 days)
  RULE: EVERY stored image URL must carry expiresAt field. Stale URL access = data corruption risk.
  AFFECTED TASK TYPES: T391
  CONFLICTS WITH: T398 multimodal AI prompt failing due to expired image URLs mid-pipeline
  RESOLUTION: F1078 stores expiresAt; T398 checks expiry before using URL, triggers re-render if expired

CF-519 : PLUGIN_EVENT_QUEUE_ISOLATION
  SEVERITY: MEDIUM
  TRIGGER: Figma plugin events (F1076) published to shared Redis Stream without consumer group scoping
  RULE: Plugin events MUST use consumer group "figma31-{tenantId}-plugin" to prevent cross-tenant event pickup
  AFFECTED TASK TYPES: T392, T393
  CONFLICTS WITH: FLOW-18 queue consumer groups
  RESOLUTION: QUEUE FABRIC consumer group naming enforced in F1076 factory config
```

---

### GROUP B — IR Processing Safety (CF-520–CF-527)

```
CF-520 : DESIGNIR_SCHEMA_COMPLETENESS
  SEVERITY: HIGH
  TRIGGER: DesignIR document missing required top-level fields
  RULE: Every DesignIR document MUST contain: screens[], components[], designTokens, screenMap, prototypeLinks.
        Missing any = T397 (IR Validation Gate) fires REJECT.
  AFFECTED TASK TYPES: T395–T397
  CONFLICTS WITH: Downstream T398 (semantics extraction) failing on incomplete DesignIR
  RESOLUTION: F1090 (IDesignIRValidatorService) runs schema completeness check as quality gate

CF-521 : SCREEN_FINGERPRINT_COLLISION
  SEVERITY: MEDIUM
  TRIGGER: Two screens from different fileKeys share same fingerprint hash (component composition hash)
  RULE: Screen fingerprint collisions across tenants are acceptable (shared patterns), but WITHIN same
        fileKey a collision = duplicate screen error, not allowed.
  AFFECTED TASK TYPES: T394
  CONFLICTS WITH: F1087 (IScreenFingerprintService) producing non-unique IDs within a file
  RESOLUTION: Fingerprint includes frameId + fileKey in hash seed; within-file uniqueness enforced

CF-522 : PROTOTYPE_LINK_ORPHAN
  SEVERITY: MEDIUM
  TRIGGER: Navigation flow includes prototype link to non-existent frameId (deleted screen still referenced)
  RULE: All prototypeLinks must point to existing frameIds in the node tree. Orphan links are flagged as
        FLOW_GAP, not silent failures.
  AFFECTED TASK TYPES: T393, T430 (flow gap analysis)
  CONFLICTS WITH: Gap completion producing false positives from orphan links
  RESOLUTION: F1076 (plugin extractor) resolves links against current frame set; orphans tagged separately

CF-523 : DESIGNIR_CROSS_TENANT_READ
  SEVERITY: CRITICAL
  TRIGGER: T396 (DesignIR Assembly) attempts to load screen data from another tenant's fileKey
  RULE: BuildSearchFilter (DNA-2) MUST apply tenantId filter on ALL DesignIR queries.
        Cross-tenant read = BUILD FAILURE.
  AFFECTED TASK TYPES: T395–T397
  RESOLUTION: DNA-2 enforced; AF-7 gate validates all DB read calls include tenantId

CF-524 : LAYOUT_SEMANTIC_EMPTY_RESULT
  SEVERITY: MEDIUM
  TRIGGER: F1085 (ILayoutSemanticsService) returns empty result for a non-empty screen
  RULE: A screen with ≥3 nodes MUST produce at least one layout semantic (list/grid/table/modal/tabs).
        Empty result on non-trivial screen = WARN + human review flag, not silent success.
  AFFECTED TASK TYPES: T395
  CONFLICTS WITH: System type inference producing no evidence for screens that genuinely have semantics
  RESOLUTION: T395 QUALITY GATES require minimum semantic count; AF-9 fires WARNING if empty

CF-525 : INTERACTION_SEMANTIC_WITHOUT_TEXT
  SEVERITY: LOW
  TRIGGER: Interaction semantic (action) inferred with no text evidence (no CTA text, no label)
  RULE: Action patterns without any textual evidence MUST be tagged "low_confidence" and excluded from
        primary module mapping. Only high+medium confidence actions count for gap detection.
  AFFECTED TASK TYPES: T396
  RESOLUTION: F1088 (IInteractionSemanticsService) tags confidence; T411 filters by confidence threshold

CF-526 : COMPONENT_SIGNATURE_DRIFT
  SEVERITY: HIGH
  TRIGGER: Same component (by main component ID) has significantly different signatures across two ingestion
           runs (>30% feature change)
  RULE: Signature drift > 30% triggers RE-PROCESS for all screens using that component. Silent ignore = invalid.
  AFFECTED TASK TYPES: T394, T389
  CONFLICTS WITH: Stale screen mappings based on outdated component signatures
  RESOLUTION: F1086 (IComponentSignatureService) computes drift score; T389 version check includes component
              signature comparison

CF-527 : DESIGNIR_BATCH_PARTIAL_FAILURE
  SEVERITY: HIGH
  TRIGGER: Batch DesignIR processing (T397) partially fails — some screens succeed, some fail
  RULE: Partial batch = PARTIAL_COMPLETE state. System MUST record which screenIds succeeded/failed.
        Downstream tasks MUST only operate on succeeded screens. No silent full-batch retry on partial failure.
  AFFECTED TASK TYPES: T395–T397
  RESOLUTION: DataProcessResult<T> (DNA-3) carries per-item success/failure; T397 aggregates and emits
              PARTIAL_COMPLETE with lists of succeeded/failed screenIds
```

---

### GROUP C — AI Semantic Safety (CF-528–CF-534)

```
CF-528 : EVIDENCE_COVERAGE_GATE_FAIL
  SEVERITY: CRITICAL
  TRIGGER: AI (T398–T400) produces ScreenSemanticsIR where any module/action/entity claim has zero
           evidence items
  RULE: EVERY claim (module candidate, user action, data entity) MUST reference ≥1 evidence item (nodeId,
        text snippet, or component name). Zero evidence = BUILD FAILURE, judge blocks promotion.
  AFFECTED TASK TYPES: T398, T399, T400
  IRON RULE: This is the primary guard against AI hallucination in FLOW-31
  RESOLUTION: F1138 (IEvidenceCoverageGateService) enforces; AF-9 judge validates before promotion

CF-529 : ARCHETYPE_CONFIDENCE_FLOOR
  SEVERITY: HIGH
  TRIGGER: ScreenSemanticsIR produced with archetype confidence < 0.4 for ALL candidates
  RULE: If maximum archetype confidence < 0.4, screen is tagged UNCLASSIFIED — NOT assigned a random archetype.
        UNCLASSIFIED screens are flagged for human review; gap detection excludes them.
  AFFECTED TASK TYPES: T398
  CONFLICTS WITH: System type inference being distorted by low-confidence misclassifications
  RESOLUTION: F1093 (IScreenArchetypeClassifierService) outputs confidence; T398 IRON RULES enforce floor

CF-530 : MULTIMODAL_IMAGE_REQUIRED
  SEVERITY: HIGH
  TRIGGER: T398 (ScreenSemanticsIR Extraction) runs without rendered image URL (image-only or text-only mode)
  RULE: For screens with ≥500 pixels estimated height, multimodal (image + node tree) is REQUIRED.
        Text-only analysis of complex screens must be blocked.
  AFFECTED TASK TYPES: T398
  CONFLICTS WITH: T391 image rendering failing upstream — pipeline should pause T398, not skip image
  RESOLUTION: T398 ENTRY condition requires imageUrl from T391; if missing, T391 re-triggered first

CF-531 : SEMANTIC_IR_SCHEMA_VIOLATION
  SEVERITY: CRITICAL
  TRIGGER: AI produces ScreenSemanticsIR that violates required schema (missing required fields)
  RULE: Required fields: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[].
        Missing any = AF-9 fires REJECT; build stops.
  AFFECTED TASK TYPES: T398
  RESOLUTION: F1092 (IPromptTemplateLibraryService) uses strict output schema in prompt;
              AF-9 validates schema before downstream use

CF-532 : ENTITY_NAMING_INCONSISTENCY
  SEVERITY: HIGH
  TRIGGER: Same data entity referenced by different names across screens within same file
           (e.g., "Product" on one screen, "Item" on another)
  RULE: Entity naming must be consistent within a fileKey. Contradiction detected by F1139 triggers
        CROSS_SCREEN_ENTITY_CONFLICT; judge blocks until human resolves canonical name.
  AFFECTED TASK TYPES: T399, T403
  CONFLICTS WITH: BFA entity registry receiving duplicate entity definitions under different names
  RESOLUTION: F1139 (ICrossScreenConsistencyGateService) detects; judge fires WARNING or BLOCK per policy

CF-533 : CROSS_FLOW_ENTITY_COLLISION
  SEVERITY: HIGH
  TRIGGER: FLOW-31 inferred entity (e.g., "Product") conflicts with same-named entity registered in
           BFA by FLOW-16 (Giant Shop) or FLOW-17 (Freelancer)
  RULE: BFA entity registry is checked. If FLOW-31 infers entity X and FLOW-N has X registered:
        - Same schema → allowed (confirmed shared entity, annotated)
        - Different schema → BLOCKED until schema reconciliation
  AFFECTED TASK TYPES: T409, T410, T411
  CONFLICTS WITH: FLOW-16 (F249 IProductService), FLOW-17 (F297 IJobPostingService), etc.
  RESOLUTION: F1115 (IModuleCandidateResolverService) checks BFA entity registry before finalizing module map

CF-534 : AI_PROVIDER_FALLBACK_REQUIRED
  SEVERITY: HIGH
  TRIGGER: Primary AI provider for multimodal call (T398) fails; no fallback configured
  RULE: Multimodal semantic extraction MUST have fallback AI provider configured.
        Single-provider failure with no fallback = pipeline halt + operator alert.
  AFFECTED TASK TYPES: T398
  CONFLICTS WITH: Single-model dependency creating full pipeline failure
  RESOLUTION: IAiProvider (Skill 06) + AiDispatcher (Skill 07) handle fallback via FREEDOM config
```

---

### GROUP D — Graph & Vector Safety (CF-535–CF-540)

```
CF-535 : GRAPH_NODE_ORPHAN_PREVENTION
  SEVERITY: HIGH
  TRIGGER: UI graph node created (T401) without at least one edge connecting to another node
  RULE: Orphan graph nodes (no edges) are only allowed for single-screen files. Multi-screen files with
        orphan nodes flag as NAVIGATION_ISOLATION — not silently ignored.
  AFFECTED TASK TYPES: T401, T402
  RESOLUTION: F1100 (IUIGraphEdgeBuilderService) runs immediately after F1099; orphan check in T401 QUALITY GATES

CF-536 : GRAPHRAG_CROSS_TENANT_LEAK
  SEVERITY: CRITICAL
  TRIGGER: GraphRAG retrieval (T404, F1106) returns nodes from another tenant's graph
  RULE: RAG FABRIC (IRagService) calls with graph strategy MUST include tenantId filter.
        Cross-tenant graph retrieval = BUILD FAILURE.
  AFFECTED TASK TYPES: T404
  CONFLICTS WITH: Global system-type and module-dependency graphs (F1103, F1105) which are intentionally
                  global — differentiate: PROJECT GRAPHS are tenant-scoped, ONTOLOGY GRAPHS are global-read-only
  RESOLUTION: F1106 (IGraphRAGRetrievalService) applies tenant filter to project graphs; reads ontology graphs
              in read-only mode without tenant filter

CF-537 : VECTOR_EMBEDDING_STALENESS
  SEVERITY: MEDIUM
  TRIGGER: Screen embedding (F1108) generated for a screen version N but screen has since been updated to
           version N+1 via new ingestion
  RULE: On re-ingestion (T389 version change), all screen embeddings for changed screens MUST be invalidated
        and regenerated. Stale embeddings cause false similarity results.
  AFFECTED TASK TYPES: T405, T389
  RESOLUTION: F1081 (version manager) emits "screens-changed" list; T405 checks embedding version vs screen version

CF-538 : SIMILARITY_SCORE_FLOOR
  SEVERITY: LOW
  TRIGGER: Vector similarity search (T406) returns result with score < 0.6
  RULE: Results below 0.6 similarity are excluded from module candidate scoring. They are optionally surfaced
        as "weak signals" but never counted as evidence.
  AFFECTED TASK TYPES: T406
  RESOLUTION: F1111 (IScreenSimilaritySearchService) applies score floor; results below threshold tagged
              "weak_signal" not "evidence"

CF-539 : MODULE_DEPENDENCY_GRAPH_WRITE_LOCK
  SEVERITY: HIGH
  TRIGGER: Any FLOW-31 factory attempts to WRITE to the global module dependency graph (F1105)
  RULE: Global ontology graphs (F1103 system type graph, F1105 module dependency graph) are READ-ONLY for
        tenant-level analysis. Only admin-level migrations can write. Runtime write attempt = BUILD FAILURE.
  AFFECTED TASK TYPES: T403, T404, T407
  RESOLUTION: Factory F1105 is registered with read-only mode; write attempts are rejected with 403

CF-540 : GRAPH_BUILD_RACE_CONDITION
  SEVERITY: HIGH
  TRIGGER: Two concurrent ingestion pipelines for same fileKey run T401 graph build simultaneously
  RULE: Graph build for a fileKey MUST be serialized using Redis distributed lock.
        Concurrent build = data corruption risk (duplicate edges, split-brain graph).
  AFFECTED TASK TYPES: T401
  RESOLUTION: F1099 (IUIGraphNodeBuilderService) acquires Redis lock on "{tenantId}::{fileKey}::graph-build"
              before writing; releases on completion or timeout
```

---

### GROUP E — Module Mapping & System Type Safety (CF-541–CF-547)

```
CF-541 : MODULE_MATRIX_VERSION_MISMATCH
  SEVERITY: HIGH
  TRIGGER: Module matrix loaded by F1114 (IModuleMatrixLoaderService) has different version than what
           was used for previous module mapping of same fileKey
  RULE: If module matrix version changes mid-project, ALL screen mappings for the project MUST be
        invalidated and re-run. Partial re-mapping (only new screens) = inconsistency risk.
  AFFECTED TASK TYPES: T407, T408
  RESOLUTION: F1114 stores matrix version in each mapping document; version change triggers full re-run alert

CF-542 : SYSTEM_TYPE_SINGLE_SCREEN_PROHIBITION
  SEVERITY: HIGH
  TRIGGER: System type inference (T412) attempted on project with only 1 screen
  RULE: System type CANNOT be confidently inferred from a single screen. Minimum 3 screens required.
        Single-screen attempt = INSUFFICIENT_DATA result, not a guess.
  AFFECTED TASK TYPES: T412
  CONFLICTS WITH: Engine making confident system type declaration from minimal data
  RESOLUTION: T412 IRON RULES enforce 3-screen minimum; F1121 returns INSUFFICIENT_DATA if not met

CF-543 : DEPENDENCY_CONSTRAINT_VIOLATION
  SEVERITY: HIGH
  TRIGGER: Module mapping declares Cart present but Checkout absent, without explicit "cart-only" declaration
  RULE: F1140 (IModuleDependencyConstraintGateService) enforces module matrix dependency rules.
        Unresolved dependency violations = GAP (not error), but must appear in gap report.
  AFFECTED TASK TYPES: T411, T413
  CONFLICTS WITH: Gap completion missing critical flow gaps due to unenforced dependency rules
  RESOLUTION: F1140 emits DEPENDENCY_VIOLATION → F1127 (gap detector) converts to gap item with CRITICAL severity

CF-544 : WIRING_PLAN_HARDCODED_VALUE
  SEVERITY: CRITICAL
  TRIGGER: Module wiring plan (F1118) contains hardcoded site-type string (e.g., "system_type: 'shop'")
           instead of config document reference
  RULE: DNA-6 (DynamicController/fabric-first) — ALL system type decisions MUST flow through module config
        documents in Elasticsearch. Hardcoded values = BUILD FAILURE.
  AFFECTED TASK TYPES: T409, T410, T411
  IRON RULE: This is the UI fabric-first enforcement for FLOW-31 — no platform-specific hardcoding
  RESOLUTION: F1118 (IModuleWiringPlanService) generates config document references only; AF-7 gate validates

CF-545 : CONFIG_DOC_WITHOUT_SCHEMA
  SEVERITY: MEDIUM
  TRIGGER: F1119 (IConfigDocumentRequirementsService) generates config doc requirement without referencing
           the Genie DNA module schema for that module type
  RULE: Every required config doc (view_definitions, cart_rules, form_definitions, etc.) MUST reference the
        canonical schema from the module-architecture registry.
  AFFECTED TASK TYPES: T410
  RESOLUTION: F1119 loads module schemas from RAG FABRIC before generating requirements

CF-546 : CONFIDENCE_WITHOUT_EVIDENCE
  SEVERITY: HIGH
  TRIGGER: Module candidate assigned high confidence (>0.7) but has fewer than 2 evidence items
  RULE: Confidence score is derived from evidence count + quality, not from AI self-rating.
        High confidence requires minimum 2 distinct evidence items (nodeId + text at minimum).
  AFFECTED TASK TYPES: T409, T408
  CONFLICTS WITH: CF-528 (evidence gate) — this is the confidence calibration version
  RESOLUTION: F1116 (IConfidenceScoringService) computes confidence from evidence count; self-rated
              confidence from LLM output is used only as a signal, not the primary score

CF-547 : SYSTEM_TYPE_INFERENCE_CONFLICT
  SEVERITY: MEDIUM
  TRIGGER: System type inference produces two candidates with confidence within 0.1 of each other
           (ambiguous system type — e.g., 0.72 "social" vs 0.68 "marketplace")
  RULE: Ambiguous system type (top-2 candidates within 0.1 confidence) = AMBIGUOUS_SYSTEM_TYPE result.
        Engine presents both candidates to user with evidence. Does NOT auto-select.
  AFFECTED TASK TYPES: T412, T413
  RESOLUTION: F1125 (ISystemTypeRankerService) detects ambiguity and sets result type = AMBIGUOUS;
              FLOW orchestrator pauses for user input
```

---

### GROUP F — Gap Completion & Learning Loop Safety (CF-548–CF-551)

```
CF-548 : AUTO_STUB_CRITICAL_ONLY
  SEVERITY: HIGH
  TRIGGER: F1132 (IStubGenerationOrchestratorService) auto-generates stubs for MEDIUM/LOW severity gaps
           without explicit admin configuration to do so
  RULE: Auto-stub generation is ONLY allowed for CRITICAL severity gaps by default. MEDIUM/LOW gaps are
        surfaced in gap report but NOT auto-stubbed unless FREEDOM config explicitly enables.
  AFFECTED TASK TYPES: T413
  CONFLICTS WITH: Excessive auto-generated stubs cluttering the project
  RESOLUTION: F1132 FREEDOM config: auto_stub_severities[] defaults to ["CRITICAL"] only

CF-549 : LEARNING_LOOP_BEFORE_BENCHMARK
  SEVERITY: CRITICAL
  TRIGGER: T415 (Learning Loop Orchestration) applies exemplar updates to production corpus WITHOUT first
           running benchmark validation
  RULE: Benchmark validation MUST complete and pass BEFORE any exemplar injection is applied.
        Pre-validation injection = BUILD FAILURE.
  AFFECTED TASK TYPES: T415
  IRON RULE: Protects against learning loop causing accuracy regression
  RESOLUTION: T415 IRON RULES enforce benchmark-first sequence; F1137 orchestrates in correct order

CF-550 : CORRECTION_WITHOUT_AUDIT
  SEVERITY: CRITICAL
  TRIGGER: User correction stored (T414) without userId + timestamp in audit log
  RULE: EVERY correction MUST be stored with: screenId, before, after, reason, userId, tenantId, timestamp.
        Missing any audit field = REJECT.
  AFFECTED TASK TYPES: T414
  CONFLICTS WITH: Compliance requirements for AI-assisted classification corrections
  RESOLUTION: F1133 (IFeedbackCorrectionStoreService) validates audit fields before commit;
              AF-9 validates correction record completeness

CF-551 : ACCURACY_DROP_HUMAN_GATE
  SEVERITY: CRITICAL
  TRIGGER: T415 benchmark run shows accuracy drop > 5% vs previous run
  RULE: Accuracy regression > 5% MUST trigger HUMAN_REVIEW gate. Engine pauses learning loop updates.
        Auto-continue without human approval = BUILD FAILURE.
  AFFECTED TASK TYPES: T415
  IRON RULE: Protects against automated system degrading itself via feedback poisoning
  RESOLUTION: F1137 checks accuracy delta; sends alert; sets status = HUMAN_REVIEW_REQUIRED;
              FLOW orchestrator waits for admin approval before applying changes
```

---

## SECTION 2 — STRESS TESTS (ST-300–ST-325)

### Group 1 — Ingestion & Rate Limit Stress (ST-300–ST-305)

```
ST-300 : FIGMA_RATE_LIMIT_BURST
  TESTS: CF-512, CF-519
  SCENARIO: 50 concurrent tenants each submit a different Figma fileKey at the same time.
            All attempt to call Figma REST API simultaneously.
  EXPECTED: Rate limit token bucket (F1082) serializes/throttles API calls.
            No tenant starves; all eventually complete.
            No Figma 429 errors propagate to user layer.
            Redis Streams consumer groups correctly isolate per-tenant plugin events (CF-519).
  FAILURE MODE: Any Figma 429 escalating to user = CF-512 violation.
  VERDICT: PASS / FAIL

ST-301 : VERSION_UNCHANGED_NO_REFETCH
  TESTS: CF-514
  SCENARIO: Same tenant submits same fileKey 3 times. File unchanged between submissions.
  EXPECTED: First submission: fetches + caches. Second + third: version match → skip fetch, use cache.
            API call count = 1, not 3.
  FAILURE MODE: Any submission re-fetching unchanged file = CF-514 violation.
  VERDICT: PASS / FAIL

ST-302 : CROSS_TENANT_DATA_ISOLATION
  TESTS: CF-510, CF-513, CF-523, CF-536
  SCENARIO: Tenant A ingests fileKey "abc". Tenant B queries for fileKey "abc".
  EXPECTED: Tenant B receives zero results (tenantId isolation active on all indices).
            No DesignIR, no graph nodes, no embeddings bleed across.
  FAILURE MODE: Any FLOW-31 data visible cross-tenant = CRITICAL violation.
  VERDICT: PASS / FAIL

ST-303 : PARTIAL_FILE_FAILURE_RECOVERY
  TESTS: CF-527
  SCENARIO: Figma file has 200 screens. Screens 150–200 fail during T390 (node tree normalization — 
            simulated API timeout on batch 8 of 8).
  EXPECTED: T390 emits PARTIAL_COMPLETE with succeeded=[1..149], failed=[150..200].
            Downstream T395 processes only succeeded=[1..149].
            Retry mechanism re-attempts failed=[150..200] without re-processing succeeded.
  FAILURE MODE: Either silent success (ignoring failed) or full retry of all 200 = CF-527 violation.
  VERDICT: PASS / FAIL

ST-304 : IMAGE_URL_EXPIRY_PIPELINE
  TESTS: CF-518, CF-530
  SCENARIO: T391 renders 50 frame images. Pipeline pauses (e.g., long queue). 31 days later, T398 
            multimodal extraction runs and finds expired image URLs.
  EXPECTED: T398 detects expired URLs → triggers T391 re-render for expired frames → proceeds with fresh URLs.
            No extraction run with expired URLs.
  FAILURE MODE: T398 using expired URLs (returning 403 from storage) = CF-518 violation.
  VERDICT: PASS / FAIL

ST-305 : COMPONENT_SIGNATURE_DRIFT_REPROCESS
  TESTS: CF-526
  SCENARIO: Tenant ingests a file. Designer updates a shared component "ProductCard" (adds 3 new fields).
            File version changes. Re-ingestion runs.
  EXPECTED: F1086 detects >30% signature drift on "ProductCard".
            All screens using "ProductCard" are flagged for re-processing in T394.
            Module mappings for those screens are invalidated.
  FAILURE MODE: Drift ignored = stale mappings for affected screens = CF-526 violation.
  VERDICT: PASS / FAIL
```

---

### Group 2 — AI Semantic & Evidence Stress (ST-306–ST-312)

```
ST-306 : HALLUCINATION_EVIDENCE_GATE
  TESTS: CF-528, CF-529
  SCENARIO: AI (T398) produces ScreenSemanticsIR claiming "Checkout" module with zero evidence items.
            Confidence: 0.82. No nodeId, no text, no component name referenced.
  EXPECTED: F1138 (evidence coverage gate) fires EVIDENCE_COVERAGE_GATE_FAIL.
            AF-9 blocks promotion. Screen goes to UNCLASSIFIED + human review queue.
  FAILURE MODE: High-confidence claim with zero evidence passes = CF-528 violation.
  VERDICT: PASS / FAIL

ST-307 : LOW_CONFIDENCE_ARCHETYPE
  TESTS: CF-529
  SCENARIO: Screen has only a navigation bar and a blank content area. AI produces:
            archetype confidence: {"list": 0.31, "form": 0.28, "detail": 0.25}.
            All below 0.4 floor.
  EXPECTED: Screen tagged UNCLASSIFIED. NOT assigned "list" (highest). Not used in system type inference.
            Surfaced in human review queue with raw evidence.
  FAILURE MODE: "list" assigned because it's highest = CF-529 violation.
  VERDICT: PASS / FAIL

ST-308 : MULTIMODAL_REQUIRED_ENFORCEMENT
  TESTS: CF-530
  SCENARIO: T391 fails for 5 complex screens (>500px height). T398 attempts text-only analysis for those 5.
  EXPECTED: T398 rejects text-only mode for these screens. Pauses. Triggers T391 re-render.
            Only runs after images available.
  FAILURE MODE: Text-only analysis runs on complex screens = CF-530 violation.
  VERDICT: PASS / FAIL

ST-309 : ENTITY_NAMING_COLLISION
  TESTS: CF-532, CF-533
  SCENARIO: File has 20 screens. Screen 3 calls entity "Product". Screen 12 calls same entity "Item".
            FLOW-16 (Giant Shop) already has "Product" registered in BFA.
  EXPECTED: F1139 (cross-screen consistency gate) fires CROSS_SCREEN_ENTITY_CONFLICT for "Product" vs "Item".
            F1115 (module candidate resolver) detects FLOW-16 "Product" BFA registration.
            Judge blocks until user selects canonical name.
            BFA confirms selected name matches FLOW-16 schema or flags schema difference.
  FAILURE MODE: Both names accepted without reconciliation = CF-532 + CF-533 violation.
  VERDICT: PASS / FAIL

ST-310 : AI_PROVIDER_FAILOVER
  TESTS: CF-534
  SCENARIO: Primary vision model (e.g., Claude claude-sonnet-4-6) returns 503 during T398.
            Secondary provider (e.g., GPT-4o) is configured as fallback.
  EXPECTED: AiDispatcher (Skill 07) automatically routes to secondary provider.
            Pipeline continues. Result annotated with "provider: fallback" in audit log.
  FAILURE MODE: Pipeline halts with no fallback attempt = CF-534 violation.
  VERDICT: PASS / FAIL

ST-311 : TYPED_MODEL_DETECTION
  TESTS: CF-516
  SCENARIO: AI-generated service code (via AF-1 Genesis) for FLOW-31 accidentally creates:
            public class ScreenModel { public string Archetype { get; set; } ... }
  EXPECTED: AF-7 (Compliance) gate detects class declaration with "Model" suffix in generated service.
            Fires DNA-1 violation (ParseDocument rule). Build blocked.
  FAILURE MODE: Typed model class passes into codebase = CF-516 violation.
  VERDICT: PASS / FAIL

ST-312 : SEMANTIC_SCHEMA_INCOMPLETE
  TESTS: CF-531
  SCENARIO: AI outputs ScreenSemanticsIR missing "user_actions[]" field (forgot to populate it).
  EXPECTED: AF-9 validates required schema fields. Missing user_actions[] = REJECT.
            Screen re-queued for T398 with AF-3 fetching updated prompt template.
  FAILURE MODE: Incomplete schema accepted downstream = CF-531 violation.
  VERDICT: PASS / FAIL
```

---

### Group 3 — Graph & Module Mapping Stress (ST-313–ST-319)

```
ST-313 : CONCURRENT_GRAPH_BUILD
  TESTS: CF-540
  SCENARIO: Two identical pipeline runs for same fileKey triggered simultaneously (user double-click).
  EXPECTED: First run acquires Redis distributed lock. Second run detects lock → waits or yields.
            Only ONE graph built. No duplicate nodes/edges. Lock released after completion.
  FAILURE MODE: Both runs write simultaneously → split-brain graph = CF-540 violation.
  VERDICT: PASS / FAIL

ST-314 : GRAPHRAG_TENANT_ISOLATION
  TESTS: CF-536
  SCENARIO: Tenant A has graph with "Product → Cart → Checkout" flow. Tenant B queries GraphRAG.
  EXPECTED: Tenant B's GraphRAG (T404) retrieves zero nodes from Tenant A's graph.
            Global ontology graphs (system_type_graph, module_dependency_graph) are readable by both,
            but project-specific graphs are isolated.
  FAILURE MODE: Tenant B retrieves Tenant A's project graph nodes = CF-536 violation.
  VERDICT: PASS / FAIL

ST-315 : MODULE_MATRIX_VERSION_UPGRADE
  TESTS: CF-541
  SCENARIO: Mid-project, admin updates module matrix (v2 → v3, adds new "Loyalty" module).
            Project has 50 screens with mappings based on v2.
  EXPECTED: F1114 detects matrix version mismatch for this project.
            ALL 50 screen mappings invalidated. Full re-run triggered (not partial).
            Alert sent to project admin.
  FAILURE MODE: Only new screens re-mapped; existing 50 use stale v2 mappings = CF-541 violation.
  VERDICT: PASS / FAIL

ST-316 : SINGLE_SCREEN_SYSTEM_TYPE_BLOCK
  TESTS: CF-542
  SCENARIO: User submits Figma file with only 1 screen (landing page skeleton).
  EXPECTED: T412 fires INSUFFICIENT_DATA. System type = UNKNOWN. Gap completion skipped.
            User presented with message: "Minimum 3 screens required for system type inference."
  FAILURE MODE: System type inferred from 1 screen (e.g., "landing page") = CF-542 violation.
  VERDICT: PASS / FAIL

ST-317 : AMBIGUOUS_SYSTEM_TYPE_PAUSE
  TESTS: CF-547
  SCENARIO: 15-screen file produces: social confidence 0.71, marketplace confidence 0.68.
            Within 0.1 threshold.
  EXPECTED: T412 returns AMBIGUOUS_SYSTEM_TYPE with both candidates + evidence.
            FlowOrchestrator pauses pipeline. Admin notified. User selects system type.
            Pipeline resumes with selected type.
  FAILURE MODE: Auto-selection of "social" (highest) without user confirmation = CF-547 violation.
  VERDICT: PASS / FAIL

ST-318 : HARDCODED_SYSTEM_TYPE_DETECTION
  TESTS: CF-544
  SCENARIO: AF-1 (Genesis) generates wiring plan code that contains string constant "system_type = 'shop'"
            hardcoded in service logic.
  EXPECTED: AF-7 (Compliance) gate detects hardcoded system type string.
            DNA-6 (fabric-first) violation fired. Build blocked.
  FAILURE MODE: Hardcoded string passes compliance check = CF-544 violation.
  VERDICT: PASS / FAIL

ST-319 : DEPENDENCY_GAP_DETECTION
  TESTS: CF-543
  SCENARIO: File has Cart + Product screens but no Checkout screen.
            Module matrix says: Cart → requires → Checkout.
  EXPECTED: F1140 (dependency constraint gate) fires DEPENDENCY_VIOLATION.
            F1127 (gap detector) converts to gap item: severity=CRITICAL, missing=Checkout.
            Gap report includes this item. User notified.
  FAILURE MODE: Dependency violation silent or treated as warning-only = CF-543 violation.
  VERDICT: PASS / FAIL
```

---

### Group 4 — Gap Completion & Learning Loop Stress (ST-320–ST-325)

```
ST-320 : AUTO_STUB_SEVERITY_ENFORCEMENT
  TESTS: CF-548
  SCENARIO: Gap report has: 2 CRITICAL gaps, 3 MEDIUM gaps, 5 LOW gaps.
            Default FREEDOM config: auto_stub_severities = ["CRITICAL"].
  EXPECTED: F1132 auto-generates stubs ONLY for the 2 CRITICAL gaps.
            MEDIUM and LOW gaps appear in gap report but no stubs generated.
  FAILURE MODE: Stubs generated for MEDIUM/LOW gaps without explicit config = CF-548 violation.
  VERDICT: PASS / FAIL

ST-321 : LEARNING_LOOP_BENCHMARK_FIRST
  TESTS: CF-549
  SCENARIO: 15 corrections accumulated. T415 learning loop triggered.
            Benchmark run starts but times out after 5 minutes (simulated slow ES query).
  EXPECTED: T415 waits for benchmark completion. Exemplar injection NOT applied until benchmark returns.
            If benchmark times out → BENCHMARK_TIMEOUT result → learning cycle aborted for this run.
            Retry scheduled for next cycle.
  FAILURE MODE: Exemplar injection applied before benchmark timeout = CF-549 violation.
  VERDICT: PASS / FAIL

ST-322 : CORRECTION_AUDIT_COMPLETENESS
  TESTS: CF-550
  SCENARIO: User submits correction missing the "reason" field (just provides before/after labels).
  EXPECTED: F1133 validation rejects correction. Returns error: "reason field required".
            Correction NOT stored. Audit log not written with incomplete record.
            User prompted to provide reason.
  FAILURE MODE: Partial correction stored without reason = CF-550 violation.
  VERDICT: PASS / FAIL

ST-323 : ACCURACY_DROP_HUMAN_GATE
  TESTS: CF-551
  SCENARIO: T415 benchmark: previous accuracy = 0.89, current accuracy = 0.82.
            Delta = -0.07 (> 5% threshold).
  EXPECTED: F1137 detects 7% accuracy drop. Fires ACCURACY_REGRESSION alert.
            Learning loop paused. Status = HUMAN_REVIEW_REQUIRED.
            Exemplar updates NOT applied. Admin receives alert with before/after metrics.
            Pipeline resumes only after admin approves.
  FAILURE MODE: Updates applied despite >5% drop = CF-551 violation.
  VERDICT: PASS / FAIL

ST-324 : VECTOR_STALE_EMBEDDING_INVALIDATION
  TESTS: CF-537
  SCENARIO: File v3 ingested. Screens 10-20 changed from v2. T405 runs.
  EXPECTED: F1081 version manager provides list of changed screen IDs.
            F1108 invalidates existing embeddings for screen IDs 10-20.
            New embeddings generated only for 10-20 (unchanged screens reuse v2 embeddings).
  FAILURE MODE: Stale v2 embeddings used for screens 10-20 in similarity search = CF-537 violation.
  VERDICT: PASS / FAIL

ST-325 : GLOBAL_GRAPH_WRITE_PREVENTION
  TESTS: CF-539
  SCENARIO: T403 (module signature graph build) mistakenly attempts to write a new node to the global
            system_type_graph (F1103, read-only ontology).
  EXPECTED: DATABASE FABRIC IDatabaseService rejects write call with 403 (read-only factory mode).
            DataProcessResult<T> returns Failure("read-only index"). Pipeline logs write-blocked event.
            Admin alerted.
  FAILURE MODE: Write succeeds to global ontology graph = CF-539 violation.
  VERDICT: PASS / FAIL
```

---

## SECTION 3 — BFA RULE COVERAGE MATRIX

| Task Type | CF Rules Applied |
|-----------|-----------------|
| T389 | CF-510, CF-511, CF-512, CF-513, CF-514 |
| T390 | CF-513, CF-515, CF-516 |
| T391 | CF-512, CF-517, CF-518 |
| T392 | CF-519 |
| T393 | CF-519, CF-522 |
| T394 | CF-521, CF-526 |
| T395 | CF-513, CF-523, CF-524, CF-525 |
| T396 | CF-523, CF-525 |
| T397 | CF-520, CF-527 |
| T398 | CF-528, CF-529, CF-530, CF-531, CF-534 |
| T399 | CF-532 |
| T400 | CF-528 |
| T401 | CF-535, CF-540 |
| T402 | CF-535 |
| T403 | CF-539 |
| T404 | CF-536 |
| T405 | CF-537 |
| T406 | CF-538 |
| T407 | CF-539, CF-541 |
| T408 | CF-541, CF-546 |
| T409 | CF-533, CF-544, CF-546 |
| T410 | CF-544, CF-545 |
| T411 | CF-543, CF-544 |
| T412 | CF-542, CF-547 |
| T413 | CF-543, CF-548 |
| T414 | CF-550 |
| T415 | CF-549, CF-551 |

---

## SECTION 4 — BACKWARD COMPATIBILITY CHECK

FLOW-31 BFA rules CF-510–CF-551 do NOT modify existing CF-1–CF-509.

Existing flows checked for FLOW-31 entity/API conflicts:

| Prior Flow | Entity/API at Risk | Check Result |
|-----------|-------------------|--------------|
| FLOW-15 (DevOps) | IFlowDefinitionRegistryService fileKey namespace | CF-511 ✅ enforced |
| FLOW-16 (Giant Shop) | Product entity in BFA registry | CF-533 ✅ enforced |
| FLOW-17 (Freelancer) | JobPosting, User entities | CF-533 ✅ enforced |
| FLOW-18 (Flow Creation) | Flow definition IDs, visual editor component registry | CF-511, CF-515 ✅ enforced |
| FLOW-22/23 (Visual Editor) | Component catalog index name | CF-515 ✅ enforced |
| FLOW-25 (last prior flow) | BFA conflict registry entries | CF-567–CF-570 (from T414/T415) ✅ |

All prior task types T1–T388 and factories F1–F1074: UNCHANGED. ✅
