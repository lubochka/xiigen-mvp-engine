# FLOW-34 BFA STRESS TEST — Skill Multi-Target Translation
## BFA Rules CF-295–CF-332 | Stress Tests ST-164–ST-198

---

## SECTION 1: BUSINESS FLOW ARBITER RULES (CF-295–CF-332)

### GROUP A — CANONICAL SPEC INTEGRITY (CF-295–CF-299)

**CF-295: Source → Canonical Lineage Required**
```
ID: CF-295
NAME: Source → Canonical Lineage Required
FLOW: FLOW-34
ENTITIES: CanonicalSkillSpec, SourceSkill
RULE: Every CanonicalSkillSpec MUST record its sourceSkillId (F637:ISkillLineageTrackerService).
      A spec without lineage cannot be registered in F632.
CONFLICT: Spec registered without sourceSkillId
DETECTION: F637 checks for null/empty sourceSkillId before F631.StoreDocument
RESOLUTION: Abort spec creation; require sourceSkillId before retry
SEVERITY: BUILD_FAILURE
```

**CF-296: No Duplicate Canonical Families**
```
ID: CF-296
NAME: No Duplicate Canonical Families
FLOW: FLOW-34
ENTITIES: CanonicalSkillSpec, SkillFamily
RULE: One family = one canonical spec. Cannot create second canonical spec for same familyId.
CONFLICT: Attempt to create CanonicalSkillSpec when familyId already has a spec at version != patch
DETECTION: F632 registry check before F631.StoreDocument
RESOLUTION: Create new version of existing spec; do not duplicate family
SEVERITY: BUILD_FAILURE
```

**CF-297: No API Route Conflicts Between Language Variants**
```
ID: CF-297
NAME: No API Route Conflicts Between Language Variants
FLOW: FLOW-34
ENTITIES: ServerVariant, APIRoute
RULE: Node, Go, Java, Rust, PHP variants of the same skill family MUST expose identical API route shapes.
      /api/dynamic/{tenantId}/{action} — path structure must be the same.
CONFLICT: Go variant exposes /api/v1/go/{tenantId}/{action} — different path from .NET variant
DETECTION: F671:IApiConformanceCheckerService compares route paths across variants
RESOLUTION: Generator must enforce DynamicRouter pattern (SK-147/148/149/150/151)
SEVERITY: BUILD_FAILURE
```

**CF-298: DynamicRouter Required — No Entity-Specific Routes**
```
ID: CF-298
NAME: DynamicRouter Required — No Entity-Specific Routes
FLOW: FLOW-34
ENTITIES: ServerVariant, APIRoute
RULE: All generated server variants MUST use DynamicRouter pattern.
      No entity-specific route files (e.g., /api/orders, /api/customers) are permitted.
CONFLICT: Generated Java adapter creates @RestController OrderController with /api/orders
DETECTION: AF-7 static analysis; F649:IAdapterDNAComplianceService
RESOLUTION: Merge into single @RestController with /{tenantId}/dynamic/{action}
SEVERITY: BUILD_FAILURE
```

**CF-299: Canonical Spec Version Before Variant Generation**
```
ID: CF-299
NAME: Canonical Spec Version Before Variant Generation
FLOW: FLOW-34
ENTITIES: CanonicalSkillSpec, ServerVariant, ClientVariant
RULE: T250–T258 (variant generation) MUST NOT start if T247 (extraction) has not produced a valid spec.
CONFLICT: T251 (Go variant) triggered before T247 completes
DETECTION: F682:IMultiTargetTranslationOrchestratorService checks T247 status in trace (F683)
RESOLUTION: Hold T251 in QUEUE FABRIC until T247 publishes CanonicalSpecReady event
SEVERITY: BUILD_FAILURE
```

---

### GROUP B — FABRIC PURITY RULES (CF-300–CF-306)

**CF-300: No Direct Database Driver in Generated Adapters**
```
ID: CF-300
NAME: No Direct Database Driver in Generated Adapters
FLOW: FLOW-34
ENTITIES: ServerVariant, FabricInterface
RULE: Generated server adapters (T250–T254) MUST NOT import or instantiate DB drivers directly.
      Node: no require('pg'), require('mysql2'), require('ioredis')
      Go: no pgx.Connect(), no go-redis.NewClient()
      Java: no new JdbcTemplate(), no new DataSource()
      Rust: no sqlx::PgPool::connect()
      PHP: no new PDO(), no new mysqli()
CONFLICT: Any detected direct driver import in generated code
DETECTION: AF-7 static analysis (regex + AST scan for known driver identifiers)
RESOLUTION: Replace with fabric interface call; regenerate via AF-1 with corrected prompt
SEVERITY: BUILD_FAILURE
```

**CF-301: No Direct AI Provider Import in Generated Code**
```
ID: CF-301
NAME: No Direct AI Provider Import in Generated Code
FLOW: FLOW-34
ENTITIES: ServerVariant, AIFabric
RULE: Generated code MUST NOT import openai, anthropic, or other AI SDKs directly.
      Always through IAiProvider.GenerateAsync via AI ENGINE FABRIC.
CONFLICT: Generated Node adapter: const { OpenAI } = require('openai')
DETECTION: AF-7 static analysis
RESOLUTION: Replace with IAiProvider call
SEVERITY: BUILD_FAILURE
```

**CF-302: No Typed Models in Generated Server Adapters**
```
ID: CF-302
NAME: No Typed Models in Generated Server Adapters
FLOW: FLOW-34
ENTITIES: ServerVariant, DocumentPattern
RULE: Generated server adapters MUST use dictionary/map types for ALL domain documents.
      Node: plain {} — not class instances
      Go: map[string]interface{} — not domain structs
      Java: Map<String,Object> — not @Entity POJOs
      Rust: HashMap<String, serde_json::Value> — not domain structs
      PHP: PHP array (json_decode with true) — not class objects
CONFLICT: Generated Java adapter: Order order = new Order(...)
DETECTION: AF-7 static analysis; F649:IAdapterDNAComplianceService
SEVERITY: BUILD_FAILURE
```

**CF-303: No Hardcoded API Endpoints in Client Adapters**
```
ID: CF-303
NAME: No Hardcoded API Endpoints in Client Adapters
FLOW: FLOW-34
ENTITIES: ClientVariant, FabricFirst
RULE: Generated client adapters (T256–T258) MUST use config-driven API base URL.
      NEVER hardcode API endpoint strings.
CONFLICT: React hook: const API = 'https://api.xiigen.com/...' (hardcoded)
DETECTION: AF-7 static analysis; string literal URL pattern detection
RESOLUTION: Replace with useFabricClient() or environment-driven config
SEVERITY: BUILD_FAILURE
```

**CF-304: tenantId Source — Auth Context Only**
```
ID: CF-304
NAME: tenantId Source — Auth Context Only
FLOW: FLOW-34
ENTITIES: ClientVariant, ServerVariant, TenantScope
RULE: tenantId MUST come from auth context in ALL variants (client and server).
      Client: from auth hook/context — never from form input field
      Server: from JWT middleware / route param validated by auth — never from request body
CONFLICT: React form has <input name="tenantId" /> and uses that value directly
DETECTION: AF-8 security scan; form field name inspection
RESOLUTION: Remove form field; source from auth context
SEVERITY: BUILD_FAILURE
```

**CF-305: No unsafe{} Blocks in Rust Adapters**
```
ID: CF-305
NAME: No unsafe{} Blocks in Rust Adapters
FLOW: FLOW-34
ENTITIES: ServerVariant (Rust), Security
RULE: Generated Rust adapters MUST NOT contain unsafe{} blocks in service logic.
CONFLICT: Rust adapter: unsafe { ... raw pointer operation ... }
DETECTION: AF-8 security scan; Rust-specific AST analysis
SEVERITY: BUILD_FAILURE
```

**CF-306: No eval() in Generated PHP**
```
ID: CF-306
NAME: No eval() in Generated PHP
FLOW: FLOW-34
ENTITIES: ServerVariant (PHP), ClientVariant (WordPress)
RULE: Generated PHP code (server adapter + WordPress plugin) MUST NOT use eval(), extract(), or variable variables.
CONFLICT: PHP adapter: eval('$' . $action . '($payload)')
DETECTION: AF-8 security scan; PHP token analysis
SEVERITY: BUILD_FAILURE
```

---

### GROUP C — WORDPRESS PACKAGING RULES (CF-307–CF-318)

**CF-307: WordPress Plugin Header Required**
```
ID: CF-307
NAME: WordPress Plugin Header Required
FLOW: FLOW-34
ENTITIES: WordPressPlugin, PluginHeader
RULE: Generated WordPress plugin PHP file MUST have valid plugin header with required fields.
      Required: Plugin Name, Version, Requires PHP, Text Domain
CONFLICT: Main plugin PHP file missing Text Domain header comment
DETECTION: AF-7 static analysis; PHP comment block parser
SEVERITY: BUILD_FAILURE
```

**CF-308: Settings API on admin_init Only**
```
ID: CF-308
NAME: Settings API on admin_init Only
FLOW: FLOW-34
ENTITIES: WordPressPlugin, SettingsAPI
RULE: register_setting() and related functions MUST be called on admin_init hook.
      Not on init, plugins_loaded, or any other hook.
CONFLICT: Plugin calls register_setting() on plugins_loaded hook
DETECTION: AF-7 static analysis; hook name inspection
SEVERITY: BUILD_FAILURE
```

**CF-309: Block Registration on Both Server and Client**
```
ID: CF-309
NAME: Block Registration on Both Server and Client
FLOW: FLOW-34
ENTITIES: WordPressPlugin, GutenbergBlock
RULE: Gutenberg blocks MUST be registered on BOTH server (PHP: register_block_type) and client (JS: registerBlockType).
      Omitting either = incomplete block support.
CONFLICT: Plugin registers block in JS only; no PHP server registration
DETECTION: AF-7 checks for both register_block_type call (PHP) and registerBlockType call (JS index file)
SEVERITY: BUILD_FAILURE
```

**CF-310: WordPress Plugin — Zero Business Logic**
```
ID: CF-310
NAME: WordPress Plugin — Zero Business Logic
FLOW: FLOW-34
ENTITIES: WordPressPlugin, BusinessLogic
RULE: WordPress plugin variant MUST contain ZERO business logic.
      Allowed: Settings API, block registration, REST proxy to XIIGen API.
      NOT allowed: Database queries (direct), processing algorithms, data transformations.
CONFLICT: Plugin PHP file contains: $wpdb->query("SELECT * FROM orders WHERE ...")
DETECTION: AF-7 scans for direct DB calls ($wpdb, PDO, mysqli)
RESOLUTION: Remove business logic; route to XIIGen API via REST proxy (F656)
SEVERITY: BUILD_FAILURE
```

**CF-311: REST permission_callback Required**
```
ID: CF-311
NAME: REST permission_callback Required
FLOW: FLOW-34
ENTITIES: WordPressPlugin, RESTAPI
RULE: ALL register_rest_route() calls MUST include permission_callback.
      __return_true is acceptable ONLY for explicitly public endpoints (documented in code comment).
CONFLICT: register_rest_route('xiigen/v1', '/action', ['callback' => $handler]) — missing permission_callback
DETECTION: AF-7 and AF-8 scan all register_rest_route calls for permission_callback key
SEVERITY: BUILD_FAILURE
```

**CF-312: WordPress — No Secrets in PHP or Options**
```
ID: CF-312
NAME: WordPress — No Secrets in PHP or Options
FLOW: FLOW-34
ENTITIES: WordPressPlugin, WordPressTheme, Security
RULE: No API keys, tokens, passwords, or connection strings may be stored in:
      - PHP source files
      - WordPress wp_options table via plugin
      - Client JS bundles
      API base URL in wp_options is acceptable. Auth tokens must use secure transient or server-managed.
CONFLICT: Plugin stores 'xiigen_api_key' → 'sk-1234...' in wp_options
DETECTION: AF-8 security scan; pattern matching for known secret formats
SEVERITY: BUILD_FAILURE
```

**CF-313: theme.json as Only Global Style Mechanism**
```
ID: CF-313
NAME: theme.json as Only Global Style Mechanism
FLOW: FLOW-34
ENTITIES: WordPressTheme
RULE: WordPress theme variants MUST use theme.json as the ONLY mechanism for global settings and styles.
      No wp_enqueue_style() for global design tokens.
CONFLICT: Theme enqueues global-styles.css with hardcoded color variables
DETECTION: AF-7 checks functions.php for wp_enqueue_style with global token patterns
SEVERITY: BUILD_FAILURE
```

**CF-314: WordPress Theme — Zero Business Logic**
```
ID: CF-314
NAME: WordPress Theme — Zero Business Logic
FLOW: FLOW-34
ENTITIES: WordPressTheme
RULE: WordPress theme MUST contain ZERO business logic.
      If REST proxy needed: companion plugin must be declared.
CONFLICT: Theme's functions.php queries $wpdb directly
DETECTION: AF-7 scans for $wpdb in theme PHP files
SEVERITY: BUILD_FAILURE
```

**CF-315: Nonce Validation on WP Admin Forms**
```
ID: CF-315
NAME: Nonce Validation on WP Admin Forms
FLOW: FLOW-34
ENTITIES: WordPressPlugin, Security
RULE: All admin form submissions in generated WordPress plugin MUST validate nonce using wp_verify_nonce() or check_admin_referer().
CONFLICT: Settings page form submission handler missing wp_verify_nonce()
DETECTION: AF-8 security scan on settings form handlers
SEVERITY: BUILD_FAILURE
```

**CF-316: wp-scripts Build Required for Plugin Blocks**
```
ID: CF-316
NAME: wp-scripts Build Required for Plugin Blocks
FLOW: FLOW-34
ENTITIES: WordPressPlugin, GutenbergBlock, Build
RULE: Plugin blocks MUST use @wordpress/scripts (wp-scripts) for build.
      Output: build/index.js + build/index.asset.php (dependency manifest).
CONFLICT: Plugin block uses custom webpack config without generating index.asset.php
DETECTION: T260 packaging gate checks for index.asset.php in build output
SEVERITY: BUILD_FAILURE
```

**CF-317: Template Structure — WordPress Theme**
```
ID: CF-317
NAME: Template Structure — WordPress Theme
FLOW: FLOW-34
ENTITIES: WordPressTheme, Templates
RULE: Block theme templates MUST be in templates/ folder.
      Template parts MUST be in parts/ folder.
      Inline templates in functions.php are not permitted.
CONFLICT: Theme includes page template in functions.php as string
DETECTION: AF-7 checks theme directory structure
SEVERITY: BUILD_FAILURE
```

**CF-318: WordPress REST Proxy — XIIGen API Only**
```
ID: CF-318
NAME: WordPress REST Proxy — XIIGen API Only
FLOW: FLOW-34
ENTITIES: WordPressPlugin, RESTProxy
RULE: Plugin REST proxy endpoints MUST only call the XIIGen API gateway.
      Direct calls to third-party APIs, databases, or other backends are prohibited.
CONFLICT: Plugin REST proxy calls aws.amazonaws.com directly
DETECTION: AF-8 scans wp_remote_post/get targets for non-XIIGen URLs
SEVERITY: BUILD_FAILURE
```

---

### GROUP D — CROSS-VARIANT CONFORMANCE RULES (CF-319–CF-325)

**CF-319: Conformance Suite Required Before Promotion**
```
ID: CF-319
NAME: Conformance Suite Required Before Promotion
FLOW: FLOW-34
ENTITIES: SkillVariant, ConformanceSuite, PromotionLadder
RULE: No variant can advance beyond GENERATED without passing T263 (cross-variant conformance runner).
      Promotion gate (T264) MUST block until conformance = 100%.
CONFLICT: Variant promoted to INJECTED with conformanceScore = 0.87
DETECTION: F678:IVariantPromotionGateService checks conformanceScore from F642
SEVERITY: BUILD_FAILURE
```

**CF-320: idempotency Semantics Consistent Across Variants**
```
ID: CF-320
NAME: idempotency Semantics Consistent Across Variants
FLOW: FLOW-34
ENTITIES: SkillVariant, Idempotency
RULE: Same idempotencyKey submitted twice MUST produce identical result across ALL server variants of the same family.
      Server variants CANNOT differ in idempotency behavior.
CONFLICT: Node variant returns 200 on retry; Rust variant returns 409 Conflict
DETECTION: GT-03 (idempotency) in canonical test suite; T255 cross-language judge
SEVERITY: BUILD_FAILURE
```

**CF-321: DataProcessResult Envelope Consistent Across Variants**
```
ID: CF-321
NAME: DataProcessResult Envelope Consistent Across Variants
FLOW: FLOW-34
ENTITIES: SkillVariant, DataProcessResult
RULE: All server variants MUST return DataProcessResult-equivalent envelope.
      Shape: { isSuccess: bool, data: map/null, error: string/null }
      isSuccess=false for business errors (never HTTP 500 for business logic).
CONFLICT: Java variant throws RuntimeException for missing field; returns HTTP 500
DETECTION: T255 judge; AF-9 quality gate
SEVERITY: BUILD_FAILURE
```

**CF-322: Canonical Test Suite Frozen During Active Variant Generation**
```
ID: CF-322
NAME: Canonical Test Suite Frozen During Active Variant Generation
FLOW: FLOW-34
ENTITIES: ConformanceSuite, SkillVariant
RULE: The canonical test suite (created by T249) MUST NOT be modified while any variant generation (T250–T258) is in progress for the same family.
CONFLICT: Admin updates golden test vectors while T251 (Go) variant is still generating
DETECTION: F668 orchestrator checks suite lock state; family lock via QUEUE FABRIC
RESOLUTION: Queue suite update; apply after active generation complete
SEVERITY: WARN + QUEUE_HOLD
```

**CF-323: Variant Cannot Target Multiple Languages in Single Bundle**
```
ID: CF-323
NAME: Variant Cannot Target Multiple Languages in Single Bundle
FLOW: FLOW-34
ENTITIES: ServerVariant
RULE: A single variant bundle MUST target exactly ONE server language. No polyglot bundles.
      Cross-language orchestration happens at the fabric level, not within a variant.
CONFLICT: Generated bundle attempts to include both Go and Java service files
DETECTION: F650 validates artifact manifest has single targetServer value
SEVERITY: BUILD_FAILURE
```

**CF-324: Cross-Flow Entity Conflict — Existing T1–T246 Flows Unchanged**
```
ID: CF-324
NAME: Cross-Flow Entity Conflict — Existing Flows Unchanged
FLOW: FLOW-34 cross-check with FLOW-01 through FLOW-17
ENTITIES: AllFlows
RULE: FLOW-34 factories (F631–F685), task types (T247–T268), and BFA rules (CF-295–CF-332) MUST NOT modify or override any artifact from FLOW-01 through FLOW-17.
CONFLICT: FLOW-34 redefines F640 (already reserved — check registry)
DETECTION: F632 registry duplicate check; session state file bounds verification
SEVERITY: BUILD_FAILURE
```

**CF-325: Graph RAG Only After INJECTED Status**
```
ID: CF-325
NAME: Graph RAG Only After INJECTED Status
FLOW: FLOW-34
ENTITIES: SkillVariant, GraphRAG
RULE: T265 (Graph RAG node ingestion) MUST NOT run for any variant below INJECTED status.
      Graph should only contain stable, tested variants.
CONFLICT: GENERATED-status variant ingested into graph; graph contaminated with unstable data
DETECTION: F673:IGraphSkillIndexService checks F642 for maturity level before ingestion
SEVERITY: BUILD_FAILURE
```

---

### GROUP E — SECURITY AND SCOPE RULES (CF-326–CF-332)

**CF-326: tenantId on ALL Variant Operations**
```
ID: CF-326
NAME: tenantId on ALL Variant Operations
FLOW: FLOW-34
ENTITIES: AllVariants, TenantScope
RULE: Every database query, queue publish, cache operation in ALL generated variants MUST include tenantId as a filter/scope.
      No cross-tenant data leakage is permitted.
CONFLICT: Go variant performs IDatabaseService.SearchDocuments without tenantId in filter
DETECTION: AF-7 compliance check; F649 DNA-5 scan
SEVERITY: BUILD_FAILURE
```

**CF-327: No Secrets in Any Client Bundle**
```
ID: CF-327
NAME: No Secrets in Any Client Bundle
FLOW: FLOW-34
ENTITIES: ClientVariant, Security
RULE: No API keys, tokens, passwords, or connection strings in any generated client bundle.
      Applies to: React, Vue, Angular bundles, WordPress plugin JS, WordPress theme files.
CONFLICT: React bundle contains process.env.XIIGEN_SECRET_KEY (secret leaked via bundler)
DETECTION: AF-8 security scan; pattern matching for known secret formats + env var names
SEVERITY: BUILD_FAILURE
```

**CF-328: WordPress API Auth — No Raw Keys in Plugin**
```
ID: CF-328
NAME: WordPress API Auth — No Raw Keys in Plugin
FLOW: FLOW-34
ENTITIES: WordPressPlugin, Security
RULE: WordPress plugin MUST NOT store raw API keys. Auth strategy must use:
      Option A: WordPress Application Passwords (user-scoped)
      Option B: OAuth token in encrypted transient
      Option C: Server-managed JWT via XIIGen gateway
CONFLICT: Plugin stores 'xiigen_secret' → 'sk-live-abc...' in wp_options
DETECTION: AF-8 security scan; wp_options key inspection
SEVERITY: BUILD_FAILURE
```

**CF-329: Variant Promotion Audit Immutable**
```
ID: CF-329
NAME: Variant Promotion Audit Immutable
FLOW: FLOW-34
ENTITIES: VariantPromotion, AuditTrail
RULE: Promotion audit records (F681) are append-only. Rollback does not delete promotion records — it adds a new ROLLBACK record.
CONFLICT: Attempt to delete promotion record after failed CORE promotion
DETECTION: F681 configured as append-only ES index (no delete operations allowed)
SEVERITY: SYSTEM_ERROR (violates immutability contract)
```

**CF-330: CORE Promotion Requires Human Approval**
```
ID: CF-330
NAME: CORE Promotion Requires Human Approval
FLOW: FLOW-34
ENTITIES: SkillVariant, PromotionLadder
RULE: Promotion from MINIMAL → CORE MUST require explicit human approval via admin interface.
      Automated pipeline CANNOT execute CORE promotion unilaterally.
CONFLICT: Automated promotion job promotes variant to CORE without human review
DETECTION: F679 checks for approved_by field (human actor) before CORE transition
RESOLUTION: Publish PromotionPendingApproval event; wait for human confirmation
SEVERITY: BUILD_FAILURE
```

**CF-331: CloudEvents Required for All Async Variant Events**
```
ID: CF-331
NAME: CloudEvents Required for All Async Variant Events
FLOW: FLOW-34
ENTITIES: AllVariants, EventEnvelope
RULE: All async events published by generated variants MUST use CloudEvents envelope (SK-158).
      Required attributes: id, source, specversion, type.
CONFLICT: Node variant publishes bare JSON event without CloudEvents wrapper
DETECTION: F672 validates event shape before queue publish (T263 conformance)
SEVERITY: BUILD_FAILURE
```

**CF-332: WordPress Theme Cannot Reference Removed Plugin**
```
ID: CF-332
NAME: WordPress Theme Cannot Reference Removed Plugin
FLOW: FLOW-34
ENTITIES: WordPressTheme, WordPressPlugin
RULE: If WordPress theme variant declares dependency on a companion plugin (CF-314), that plugin variant MUST exist and be at INJECTED or above before theme can be promoted.
CONFLICT: Theme variant promoted to INJECTED; companion plugin variant still at GENERATED
DETECTION: F679 checks companion plugin status during theme promotion gate
SEVERITY: BUILD_FAILURE
```

---

## SECTION 2: STRESS TESTS (ST-164–ST-198)

### ST-164: Multi-Language Idempotency Convergence
```
TEST: ST-164
NAME: Multi-Language Idempotency Convergence
TESTS: CF-320, T255
SCENARIO: Submit same payload with same idempotencyKey to Node, Go, Java, Rust, PHP variants simultaneously.
EXPECTED: All variants return identical isSuccess=true, same data structure. All subsequent retries return identical responses.
FAILURE MODE: Any variant returns different isSuccess or different error semantics.
RECOVERY: AF-9 judge identifies divergent variant; hold at GENERATED; regenerate via AF-1 with corrected prompt.
```

### ST-165: WordPress Plugin — Direct DB Injection Attempt
```
TEST: ST-165
NAME: WordPress Plugin Direct DB Injection Attempt
TESTS: CF-310, CF-311
SCENARIO: AF-1 generates WordPress plugin. Injected malicious prompt tries to add $wpdb->query() call inside plugin.
EXPECTED: AF-7 static analysis catches $wpdb direct call. AF-9 rejects. Plugin regenerated.
FAILURE MODE: $wpdb call passes into packaged ZIP.
RECOVERY: CF-310 BUILD_FAILURE triggers; plugin regeneration queued.
```

### ST-166: Secret Injection into React Bundle
```
TEST: ST-166
NAME: Secret Injection into React Bundle
TESTS: CF-327, CF-303
SCENARIO: AF-1 generates React hook with hardcoded API key string embedded.
EXPECTED: AF-8 detects secret pattern; SK-165 gate fails; BUILD_FAILURE.
FAILURE MODE: API key included in npm bundle.
RECOVERY: Regenerate with SK-165 enforced; key replaced with useFabricClient() call.
```

### ST-167: tenantId Cross-Contamination — Go Variant
```
TEST: ST-167
NAME: tenantId Cross-Contamination — Go Variant
TESTS: CF-326, CF-304
SCENARIO: Go variant generated without tenantId filter in SearchDocuments call.
EXPECTED: AF-7 DNA-5 scan detects missing tenantId; CF-326 BUILD_FAILURE.
FAILURE MODE: Variant returns results from multiple tenants.
RECOVERY: Regenerate; inject tenantId from context.Context in all fabric calls.
```

### ST-168: WordPress Plugin Missing permission_callback
```
TEST: ST-168
NAME: WordPress Plugin Missing permission_callback
TESTS: CF-311
SCENARIO: AF-1 generates register_rest_route without permission_callback key.
EXPECTED: AF-7 + AF-8 detect missing callback; CF-311 BUILD_FAILURE.
FAILURE MODE: Plugin REST endpoint is publicly accessible without auth check.
RECOVERY: Regenerate T260 with CF-311 enforced; add permission_callback.
```

### ST-169: Canonical Spec Generated Without Golden Tests
```
TEST: ST-169
NAME: Canonical Spec Generated Without Golden Tests
TESTS: CF-295, IRON-247-3
SCENARIO: T247 completes extraction but goldenTests array has only 1 scenario (less than required 3).
EXPECTED: AF-9 judge rejects spec; IRON-247-3 BUILD_FAILURE.
FAILURE MODE: Incomplete spec accepted; variants generated without adequate test coverage.
RECOVERY: Return to T247; AF-1 generates additional negative and edge case scenarios.
```

### ST-170: Variant Promoted Before Conformance Complete
```
TEST: ST-170
NAME: Variant Promoted Before Conformance Complete
TESTS: CF-319
SCENARIO: Admin manually triggers T264 (promotion gate) for Node variant before T263 (conformance runner) completes.
EXPECTED: F678 promotion gate checks F642 conformance status = null; blocks promotion; returns DataProcessResult<failure>.
FAILURE MODE: Variant reaches INJECTED without test validation.
RECOVERY: Queue retry of T264 after T263 completion event received.
```

### ST-171: Duplicate Canonical Family Registration
```
TEST: ST-171
NAME: Duplicate Canonical Family Registration
TESTS: CF-296
SCENARIO: Admin triggers T247 for SK-69 which already has a canonical spec at v1.
EXPECTED: F632 registry check detects duplicate; returns DataProcessResult<failure> with "family already registered at version v1".
FAILURE MODE: Second canonical spec created for same family ID.
RECOVERY: Route to version bump flow (T247 creates v2 of existing spec, not a new family).
```

### ST-172: Go Variant Uses Typed Struct for Domain Object
```
TEST: ST-172
NAME: Go Variant Uses Typed Struct for Domain Object
TESTS: CF-302, IRON-251-1
SCENARIO: AF-1 generates Go adapter with: type OrderDocument struct { ID string; Amount float64 } — typed domain struct.
EXPECTED: AF-7 detects non-map document type; CF-302 BUILD_FAILURE.
FAILURE MODE: Typed struct passes into Go module artifact.
RECOVERY: Regenerate; enforce map[string]interface{} for domain documents.
```

### ST-173: WordPress Theme Contains Direct $wpdb Query
```
TEST: ST-173
NAME: WordPress Theme Contains Direct $wpdb Query
TESTS: CF-314
SCENARIO: Theme functions.php generated with $wpdb->get_results() call for displaying content.
EXPECTED: AF-7 scans theme PHP files for $wpdb; CF-314 BUILD_FAILURE.
FAILURE MODE: Theme queries database directly, bypassing fabric and tenant scope.
RECOVERY: Remove query; route display data through REST API call to XIIGen or plugin.
```

### ST-174: React Client tenantId from Form Field
```
TEST: ST-174
NAME: React Client tenantId from Form Field
TESTS: CF-304, IRON-256-2
SCENARIO: AF-1 generates React hook that reads tenantId from a form input field value.
EXPECTED: AF-8 detects tenantId sourced from form; CF-304 BUILD_FAILURE.
FAILURE MODE: User can spoof tenantId by manipulating form field.
RECOVERY: Regenerate; source tenantId exclusively from useAuth() hook.
```

### ST-175: Rust Variant Uses unsafe{} in Business Logic
```
TEST: ST-175
NAME: Rust Variant Uses unsafe{} in Business Logic
TESTS: CF-305, IRON-253-2
SCENARIO: AF-1 generates Rust adapter with unsafe { raw_ptr_to_string(ptr) } in payload parsing logic.
EXPECTED: AF-8 security scan detects unsafe block; CF-305 BUILD_FAILURE.
FAILURE MODE: Unsafe Rust code in production variant creates memory safety risk.
RECOVERY: Regenerate T253; AF-1 prompt enforces no unsafe blocks.
```

### ST-176: Graph RAG Ingestion of GENERATED Variant
```
TEST: ST-176
NAME: Graph RAG Ingestion of GENERATED Variant
TESTS: CF-325
SCENARIO: T265 triggered for Node variant at GENERATED status (conformance not yet run).
EXPECTED: F673 checks F642 maturity = GENERATED; rejects ingestion; returns DataProcessResult<failure>.
FAILURE MODE: Unstable variant node appears in graph; AF-4 retrieval returns unvalidated variant.
RECOVERY: Queue T265 retry after T264 promotes variant to INJECTED.
```

### ST-177: CORE Promotion Without Human Approval
```
TEST: ST-177
NAME: CORE Promotion Without Human Approval
TESTS: CF-330
SCENARIO: Automated promotion pipeline calls T264 for MINIMAL → CORE transition without approved_by field.
EXPECTED: F679 checks for approved_by; absent → blocks; publishes PromotionPendingApproval event.
FAILURE MODE: Variant reaches CORE status without human review.
RECOVERY: Admin must explicitly approve via admin interface; F679 then allows transition.
```

### ST-178: PHP eval() in Generated WordPress Plugin
```
TEST: ST-178
NAME: PHP eval() in Generated WordPress Plugin
TESTS: CF-306
SCENARIO: AF-1 generates plugin PHP with dynamic dispatch using eval($functionName.'($payload)').
EXPECTED: AF-8 PHP token analysis detects eval(); CF-306 BUILD_FAILURE.
FAILURE MODE: eval() in plugin creates remote code execution risk.
RECOVERY: Regenerate T260; implement dynamic dispatch using match/switch on allowed action names.
```

### ST-179: Java @RestController Per Entity Type
```
TEST: ST-179
NAME: Java @RestController Per Entity Type
TESTS: CF-298, IRON-252-2
SCENARIO: AF-1 generates Java adapter with OrderController, CustomerController, ProductController — separate controllers per entity.
EXPECTED: AF-7 detects multiple @RestController classes; CF-298 BUILD_FAILURE.
FAILURE MODE: Entity-specific controllers violate DynamicController DNA.
RECOVERY: Merge into single @RestController @RequestMapping("/{tenantId}/dynamic").
```

### ST-180: Cross-Language API Path Divergence
```
TEST: ST-180
NAME: Cross-Language API Path Divergence
TESTS: CF-297
SCENARIO: Node variant uses /api/dynamic/{tenantId}/{action}. Go variant generated with /api/v1/go/{tenantId}/{action}.
EXPECTED: T255 (cross-language judge) + F671 API conformance checker detects path divergence; CF-297 BUILD_FAILURE for Go variant.
FAILURE MODE: Clients targeting different routes for different languages — breaks fabric-first.
RECOVERY: Regenerate Go variant with DynamicRouter pattern (SK-148).
```

### ST-181: Vue Composable Resets idempotencyKey on Retry
```
TEST: ST-181
NAME: Vue Composable Resets idempotencyKey on Retry
TESTS: CF-320, SK-167
SCENARIO: Generated Vue composable calls idempotencyKey = ref(uuidv4()) inside the submit function (not in setup). Each call generates a new key.
EXPECTED: AF-9 + conformance GT-03 detects idempotency broken; IRON-257-2 BUILD_FAILURE.
FAILURE MODE: User retries → duplicate operation created on server (idempotency broken).
RECOVERY: Regenerate T257; idempotencyKey created in composable setup() — not inside submit.
```

### ST-182: WordPress Plugin Stores API Token in Options
```
TEST: ST-182
NAME: WordPress Plugin Stores API Token in Options
TESTS: CF-312, CF-328
SCENARIO: Generated plugin settings registration includes 'xiigen_api_token' option that stores full JWT in wp_options.
EXPECTED: AF-8 detects secret option name pattern; CF-312 BUILD_FAILURE.
FAILURE MODE: API token exposed in database and admin UI.
RECOVERY: Remove token option; implement auth via WP Application Passwords or server-managed session.
```

### ST-183: Node Variant require('ioredis') Direct Call
```
TEST: ST-183
NAME: Node Variant Direct ioredis Import
TESTS: CF-300
SCENARIO: Generated Node adapter: const redis = require('ioredis'); const client = new Redis({...}).
EXPECTED: AF-7 detects 'ioredis' in require() call; CF-300 BUILD_FAILURE.
FAILURE MODE: Direct Redis driver bypasses QUEUE FABRIC; cannot swap to Kafka or SQS without code changes.
RECOVERY: Replace with IQueueService.EnqueueAsync via fabric injection.
```

### ST-184: Canonical Suite Modified During Active Generation
```
TEST: ST-184
NAME: Canonical Suite Modified During Active Generation
TESTS: CF-322
SCENARIO: Admin updates golden test vectors while T251 (Go), T252 (Java) still running.
EXPECTED: F668 detects active generation lock; returns DataProcessResult<failure> "suite locked during active generation". Suite update queued.
FAILURE MODE: Variants tested against different test versions; cross-language comparison invalid.
RECOVERY: Update applied after all active T25x tasks complete; T263 re-run.
```

### ST-185: Rust Adapter Box<dyn> Fabric Interface Missing
```
TEST: ST-185
NAME: Rust Adapter Fabric Interface Missing
TESTS: CF-300, IRON-253-3
SCENARIO: Rust adapter instantiates sqlx::PgPool directly instead of receiving Box<dyn IDatabaseService>.
EXPECTED: AF-7 detects sqlx direct usage; CF-300 BUILD_FAILURE.
FAILURE MODE: Rust variant tightly coupled to PostgreSQL; cannot swap DB provider.
RECOVERY: Regenerate T253; inject Box<dyn IDatabaseService> as trait object.
```

### ST-186: Angular HttpInterceptor Missing tenantId Header
```
TEST: ST-186
NAME: Angular HttpInterceptor Missing tenantId Header
TESTS: CF-304, IRON-258-1
SCENARIO: Generated Angular component injects tenantId via component-level @Input() property instead of HttpInterceptor.
EXPECTED: AF-7 detects component-level tenantId injection; CF-304 + IRON-258-1 BUILD_FAILURE.
FAILURE MODE: tenantId injection inconsistent; components can be used without tenant context.
RECOVERY: Regenerate T258; HttpInterceptor must inject tenantId header from AuthService.
```

### ST-187: PHP Adapter new PDO() in Service
```
TEST: ST-187
NAME: PHP Adapter Direct PDO Instantiation
TESTS: CF-300
SCENARIO: PHP service adapter: $db = new PDO('pgsql:host=localhost;dbname=xiigen', $user, $pass).
EXPECTED: AF-7 detects new PDO(); CF-300 BUILD_FAILURE.
FAILURE MODE: Direct DB access; bypasses IDatabaseService fabric; secrets in code.
RECOVERY: Inject $databaseService via DI container; use $databaseService->searchDocuments($filter).
```

### ST-188: WordPress Block Missing index.asset.php
```
TEST: ST-188
NAME: WordPress Block Missing index.asset.php
TESTS: CF-316
SCENARIO: Plugin block generated with custom webpack but doesn't produce index.asset.php.
EXPECTED: T260 packaging gate checks for index.asset.php in build/; absent = BUILD_FAILURE.
FAILURE MODE: WordPress cannot resolve block script dependencies; fatal error on activation.
RECOVERY: Regenerate block using @wordpress/scripts (wp-scripts build); produces index.asset.php automatically.
```

### ST-189: Promotion Rollback Deletes Audit Record
```
TEST: ST-189
NAME: Promotion Rollback Attempts to Delete Audit Record
TESTS: CF-329
SCENARIO: Failed CORE promotion triggers rollback. Admin requests deletion of the failed promotion record.
EXPECTED: F681 rejects DELETE operation; returns DataProcessResult<failure> "audit records are immutable". Rollback creates new ROLLBACK record instead.
FAILURE MODE: Audit trail manipulated; compliance violated.
```

### ST-190: Multi-Target Translation Orchestrator Resume After Crash
```
TEST: ST-190
NAME: Multi-Target Translation Orchestrator Resume
TESTS: IRON-268-4 (T268 resumability)
SCENARIO: T268 running parallel T251+T252+T253. Server crashes after T251 complete, T252 mid-run, T253 not started.
EXPECTED: On restart, F683 trace shows T251=DONE, T252=INTERRUPTED, T253=PENDING. Orchestrator resumes: re-runs T252 from checkpoint, starts T253. Does not re-run T251.
FAILURE MODE: All tasks re-run from scratch on restart.
```

### ST-191: Graph Edge ALTERNATIVE_OF Within Family
```
TEST: ST-191
NAME: Graph Edge ALTERNATIVE_OF Bidirectional Within Family
TESTS: T266, SK-162
SCENARIO: SK-69 has variants: #server#node, #server#go, #server#java. Graph edges must include ALTERNATIVE_OF between all three.
EXPECTED: F674 creates ALTERNATIVE_OF edges: node↔go, node↔java, go↔java (undirected).
FAILURE MODE: Edges missing; graph query returns only one variant instead of all alternatives.
```

### ST-192: Variant Selector Returns Fallback Recipe
```
TEST: ST-192
NAME: Variant Selector Returns Fallback When No Exact Match
TESTS: T267, CF-325
SCENARIO: AF-4 requests SK-69 with targetServer=go, but SK-69#server#go does not yet exist in graph.
EXPECTED: F675 graph query returns null for exact match. F644 fallback returns: {variantExists: false, canonicalSpec: SK-69-canonical-v1, adapterRecipe: "Run T251 to generate Go variant"}.
FAILURE MODE: AF-4 errors or returns wrong variant.
```

### ST-193: Cross-Flow BFA — FLOW-34 Factory Conflicts with Prior Flow
```
TEST: ST-193
NAME: FLOW-34 Factory Registry Conflict Check
TESTS: CF-324
SCENARIO: Verify F631–F685 do not overlap with any F1–F630 from prior flows.
EXPECTED: Registry check on all new factory IDs returns no conflicts. Session state confirms F630 as last pre-FLOW-34 factory.
FAILURE MODE: Any FLOW-34 factory ID falls in F1–F630 range.
```

### ST-194: WordPress Theme Companion Plugin Not INJECTED
```
TEST: ST-194
NAME: WordPress Theme Promoted Without INJECTED Companion Plugin
TESTS: CF-332
SCENARIO: Theme variant at GENERATED requires companion plugin. Plugin variant still at GENERATED. Admin triggers T264 for theme.
EXPECTED: F679 checks companion plugin status = GENERATED; blocks theme promotion; returns DataProcessResult<failure>.
FAILURE MODE: Theme at INJECTED but companion plugin at GENERATED; theme has broken REST dependency.
```

### ST-195: Java @Entity Used for Domain Object
```
TEST: ST-195
NAME: Java Variant Uses @Entity for Domain Object
TESTS: CF-302, IRON-252-1
SCENARIO: AF-1 generates Java adapter with @Entity class OrderDocument.
EXPECTED: AF-7 detects @Entity annotation on domain class; CF-302 BUILD_FAILURE.
FAILURE MODE: JPA entity tied to specific DB schema; breaks fabric-first DB swap.
RECOVERY: Replace with Map<String,Object>; remove @Entity, @Column annotations.
```

### ST-196: CloudEvents specversion Missing from Event
```
TEST: ST-196
NAME: CloudEvents Required Attribute Missing
TESTS: CF-331, SK-158
SCENARIO: Node variant publishes event: {"id": "...", "source": "...", "type": "..."} — missing specversion.
EXPECTED: F672 event envelope validator detects missing specversion; CF-331 BUILD_FAILURE; event not published.
FAILURE MODE: Non-conformant events corrupt event bus routing.
RECOVERY: Regenerate event publisher in Node variant with full CloudEvents envelope.
```

### ST-197: Angular Retry Generates New idempotencyKey
```
TEST: ST-197
NAME: Angular Retry Generates New idempotencyKey
TESTS: SK-167, CF-320
SCENARIO: Angular service generates new UUID every time submit() is called, including on retry.
EXPECTED: Conformance GT-03 fails: two calls with different keys are treated as different requests on server.
FAILURE MODE: User retry creates duplicate operation.
RECOVERY: Regenerate T258; idempotencyKey stored as private service field; reset only on explicit "start over".
```

### ST-198: Full Translation Flow — End-to-End Stress
```
TEST: ST-198
NAME: Full Multi-Target Translation — End-to-End
TESTS: T247→T268 full chain
SCENARIO: Admin triggers T268 for SK-69 with targets: server=[node,go,java], client=[reactjs, angular], wordpress=[plugin].
EXPECTED:
  1. T247: Canonical spec extracted with 3+ golden tests ✓
  2. T248: Variant descriptors attached ✓
  3. T249: Conformance suite seeded with 3 scenarios ✓
  4. T250,T251,T252 parallel: Node, Go, Java adapters generated; all DNA compliant ✓
  5. T256, T258 parallel: React, Angular client adapters generated ✓
  6. T260: WordPress plugin packaged with all IRON rules satisfied ✓
  7. T255: Cross-language judge: all server variants pass with 100% conformance ✓
  8. T259: Client fabric compliance gate: all client variants pass ✓
  9. T262: WordPress security gate: pass ✓
  10. T263: Cross-variant conformance runner: all 3 scenarios × 6 variants = 100% ✓
  11. T264: Variants promoted to INJECTED (human approval queued for CORE) ✓
  12. F683 trace: complete audit trail with all task IDs and timestamps ✓
FAILURE MODE: Any step produces BUILD_FAILURE or variant left at GENERATED after all others promoted.
ESTIMATED DURATION: 45-90 minutes (AI generation steps are longest)
```
