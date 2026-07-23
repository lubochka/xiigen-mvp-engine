# FLOW-34 TASK TYPES CATALOG — Skill Multi-Target Translation
## Engine Contracts T247–T268 | Templates 50–57

> Every task type follows the FULL engine contract format.
> FABRIC RESOLUTION is mandatory for every factory dependency.

---

## T247 — CANONICAL SKILL EXTRACTION GATE
```
TASK TYPE: T247
NAME: Canonical Skill Extraction Gate
ARCHETYPE: EXTRACTION
ENTRY: Source skill document identified (SK-id provided by admin or trigger)
PURPOSE: Extract a Canonical Skill Spec from an existing .NET / React Native skill definition; store as language-neutral behavioral contract document.
DISTINCT FROM: T248 (T247 extracts from existing skill; T248 attaches variant descriptors to an already-extracted canonical spec)

FACTORY DEPENDENCIES:
  F631:ICanonicalSkillSpecService — store canonical spec
  F635:ISkillMetadataIndexService — index for AF-4 retrieval
  F636:ISkillGoldenTestStoreService — store golden test vectors
  F634:ISkillContractValidatorService — validate contract completeness

FABRIC RESOLUTION:
  F631 → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument
  F635 → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument
  F636 → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument
  F634 → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync

AF CONFIGURATION:
  AF-2 (Planning): decompose source skill into: contracts, events, UI model, test vectors, MACHINE/FREEDOM split
  AF-4 (RAG): retrieve SK-145 (Canonical Skill Spec Format) as extraction template
  AF-5 (Multi-model): run Claude + GPT-4 in parallel to extract contract; consensus on completeness
  AF-7 (Compliance): confirm canonical spec contains no typed models (DNA-1), tenant scope rules, DataProcessResult envelope
  AF-9 (Judge): validate spec has: inputs/outputs as Dictionary, CloudEvents definition, golden test vectors (min 3), MACHINE/FREEDOM declarations
  AF-11 (Feedback): store extraction quality score for improvement

BFA VALIDATION:
  Check CF-295: source skill → canonical spec lineage recorded
  Check CF-296: canonical spec does not duplicate business logic from existing families

MACHINE / FREEDOM:
  MACHINE (fixed):
    - Output is always Dictionary<string,object> (or language-equivalent map)
    - CloudEvents envelope required for all async events
    - Min 3 golden test vectors required before spec is valid
    - tenantId always present in scope rules
  FREEDOM (configurable):
    - Source skill language (.NET, RN — where extraction starts)
    - Target stack preferences (recorded but not enforced at extraction time)
    - Extra domain keywords for AF-4 retrieval tagging

IRON RULES:
  IRON-247-1: Canonical spec MUST NOT contain language-specific type names (class, struct, interface — use "map/dict")
  IRON-247-2: Every input/output MUST be documented as Dictionary key-value pair with type annotation
  IRON-247-3: At least 3 golden test vectors (positive + negative + edge case) required
  IRON-247-4: CloudEvents envelope MUST be defined for all async triggers
  VIOLATION = BUILD FAILURE; extraction job aborted

QUALITY GATES (AF-9):
  - Contract completeness score ≥ 0.85 (Claude + GPT-4 consensus)
  - All DNA-1 through DNA-6 patterns documented in spec
  - Tenant scope rules present and non-empty
  - Golden test vectors validated against JSON Schema
  - Source lineage recorded in F637

OUTPUT: Canonical Skill Spec document (ES) with canonicalId, version, sourceSkillId, goldenTests[], contractSchema, eventsSchema, machineFreedomMap
```

---

## T248 — SKILL VARIANT DESCRIPTOR ATTACH
```
TASK TYPE: T248
NAME: Skill Variant Descriptor Attach
ARCHETYPE: ENRICHMENT
ENTRY: Canonical Skill Spec exists (T247 completed); admin triggers variant descriptor creation
PURPOSE: Attach CLIENT VARIANTS and LANGUAGE VARIANTS blocks to canonical skill spec, mirroring the existing "LANGUAGE VARIANTS" pattern already used in SK-69, etc.
DISTINCT FROM: T247 (extraction); T250–T254 (actual code generation per variant)

FACTORY DEPENDENCIES:
  F631:ICanonicalSkillSpecService — load/update canonical spec
  F638:IVariantRegistryService — register variant descriptors
  F641:IVariantDependencyService — record per-variant factory/skill dependencies
  F648:IAdapterPromptLibraryService — retrieve variant descriptor templates

FABRIC RESOLUTION:
  F631 → DATABASE FABRIC (ES)
  F638 → DATABASE FABRIC (ES)
  F641 → DATABASE FABRIC (ES)
  F648 → RAG FABRIC (Skill 00a)

AF CONFIGURATION:
  AF-3 (Prompt Library): retrieve variant descriptor templates per target (SK-146 — Variant Descriptor Block Schema)
  AF-4 (RAG): retrieve existing LANGUAGE VARIANTS examples from SK-69, SK-70 etc. as format reference
  AF-9 (Judge): validate each variant descriptor has: clientContract, routingModel, buildHooks, integrationContract, packagingRules

MACHINE / FREEDOM:
  MACHINE: CLIENT VARIANTS block must list all supported targets (even if "not yet generated")
  FREEDOM: per-variant constraints, packaging preferences, hosting notes

IRON RULES:
  IRON-248-1: Every variant descriptor MUST declare which fabrics it uses (cannot be empty)
  IRON-248-2: WordPress plugin variant descriptor MUST include: settingsApiRules, blockRegistrationMode, restProxyRequired
  IRON-248-3: WordPress theme variant descriptor MUST include: themeJsonScope, templatePartsExpected, businessLogicPolicy: "none"

OUTPUT: Updated canonical spec document with CLIENT VARIANTS + LANGUAGE VARIANTS blocks; variant registry entries in F638
```

---

## T249 — CANONICAL SPEC CONFORMANCE SEED
```
TASK TYPE: T249
NAME: Canonical Spec Conformance Seed
ARCHETYPE: VALIDATION
ENTRY: Canonical spec + variant descriptors complete
PURPOSE: Create the canonical conformance test suite (golden vectors → JSON Schema validation + CloudEvents envelope checks) that ALL variant implementations must pass.
DISTINCT FROM: T263 (T249 creates the suite; T263 runs it against variants)

FACTORY DEPENDENCIES:
  F636:ISkillGoldenTestStoreService — load golden vectors
  F668:IConformanceTestOrchestratorService — register test suite
  F671:IApiConformanceCheckerService — generate OpenAPI boundary checks
  F672:IEventEnvelopeValidatorService — generate CloudEvents envelope checks

FABRIC RESOLUTION:
  F636 → DATABASE FABRIC (ES)
  F668 → QUEUE FABRIC (Redis Streams)
  F671 → AI ENGINE FABRIC (Skill 07)
  F672 → DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-2 (Planning): decompose canonical test scenarios into: API conformance, event conformance, payload JSON Schema validation
  AF-8 (Security): check test suite includes negative cases: missing tenant, missing idempotencyKey, oversized payload
  AF-9 (Judge): validate suite coverage ≥ 3 scenarios per variant; positive + negative + edge

IRON RULES:
  IRON-249-1: Every conformance suite MUST include at least 1 test that verifies tenant scope isolation
  IRON-249-2: idempotency stability test required (same key → idempotent result)
  IRON-249-3: suite stored as canonical artifact under same family ID (not per-variant)

OUTPUT: Conformance test suite document (ES) with suiteId, familyId, scenarios[], openApiCheck, cloudEventsCheck
```

---

## T250 — SERVER VARIANT GENERATION — NODE
```
TASK TYPE: T250
NAME: Server Variant Generation — Node.js
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Node.js selected as targetServer
PURPOSE: Generate a Node.js server adapter for a skill family, implementing MicroserviceBase-Node SDK (SK-147). Closest path to existing targets.
DISTINCT FROM: T251–T254 (other server languages)

FACTORY DEPENDENCIES:
  F645:IAdapterGenerationOrchestratorService — orchestrate generation
  F646:IServerAdapterGeneratorService — generate Node adapter
  F648:IAdapterPromptLibraryService — Node-specific implementer prompts
  F662:IMicroserviceSdkGeneratorService — scaffold MicroserviceBase-Node
  F649:IAdapterDNAComplianceService — check DNA patterns
  F650:IAdapterBundleStoreService — store generated bundle

FABRIC RESOLUTION:
  F645 → AI ENGINE FABRIC (AiDispatcher)
  F646 → AI ENGINE FABRIC (Skill 07)
  F648 → RAG FABRIC (Skill 00a)
  F662 → AI ENGINE FABRIC (Skill 07)
  F649 → CORE FABRIC (Skill 01)
  F650 → DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1 (Genesis): generate Node.js adapter; inject SK-147 (MicroserviceBase-Node) as base scaffold
  AF-3 (Prompt Library): retrieve Node adapter implementer prompt from F648
  AF-4 (RAG): search for existing Node patterns in skill library (SK-147)
  AF-5 (Multi-model): Claude + GPT-4 parallel generation; consensus on DataProcessResult implementation
  AF-6 (Code Review): automated Node.js code review
  AF-7 (Compliance): check all 9 DNA patterns — no 'require('pg')', no typed classes, map-only IO
  AF-8 (Security): no secrets in bundle; no direct DB driver import
  AF-9 (Judge): validate adapter against canonical conformance suite (T249)
  AF-10 (Merge): select best multi-model output
  AF-11 (Feedback): store generation quality

BFA VALIDATION:
  Check CF-297: Node adapter does not create duplicate API routes conflicting with .NET variant
  Check CF-298: DynamicRouter is used (no entity-specific Express routes)

MACHINE / FREEDOM:
  MACHINE: map-only IO, DataProcessResult envelope, fabric calls only (not require('pg'))
  FREEDOM: targetRuntime (Node 18/20/22), packageManager (npm/yarn/pnpm)

IRON RULES:
  IRON-250-1: MUST use fabric interface — IDatabaseService, IQueueService, IAiProvider (not 'pg', 'ioredis', 'openai' direct)
  IRON-250-2: All inputs/outputs MUST use plain object {} (not class instances)
  IRON-250-3: Single generic router — never create route per entity type

QUALITY GATES (AF-9):
  - Conformance suite pass rate: 100% (all scenarios)
  - DNA compliance: 9/9 patterns
  - No provider imports detected (static analysis)

OUTPUT: Node.js adapter bundle (ES); variant registered in F638 as SK-{id}#server#node with status GENERATED
```

---

## T251 — SERVER VARIANT GENERATION — GO
```
TASK TYPE: T251
NAME: Server Variant Generation — Go
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Go selected as targetServer
PURPOSE: Generate a Go server adapter implementing MicroserviceBase-Go SDK (SK-148). Optimized for event workers and high-throughput queue consumers.
DISTINCT FROM: T250 (Node), T252 (Java), T253 (Rust), T254 (PHP)

FACTORY DEPENDENCIES:
  F645, F646, F648, F662, F649, F650 — same as T250
FABRIC RESOLUTION: same as T250

AF CONFIGURATION:
  AF-1 (Genesis): generate Go adapter; inject SK-148 (MicroserviceBase-Go) scaffold
  AF-3 (Prompt Library): retrieve Go implementer prompt
  AF-4 (RAG): search for Go patterns in skill library (SK-148)
  AF-5 (Multi-model): parallel generation; consensus on Go error handling (no panic for business logic)
  AF-7 (Compliance): check DNA — map[string]interface{} only, no struct models for payload
  AF-8 (Security): no secrets; no direct driver imports (pgx, go-redis must be behind fabric)
  AF-9 (Judge): conformance suite pass; CloudEvents envelope validated

IRON RULES:
  IRON-251-1: payload types MUST be map[string]interface{} — no Go structs for domain objects
  IRON-251-2: errors MUST return (result, error) where result is ResultEnvelope{IsSuccess, Data, ErrorMessage} — never panic
  IRON-251-3: tenantId MUST be extracted from context (context.Context) — never from request body
  VIOLATION = BUILD FAILURE

QUALITY GATES (AF-9): same as T250 (100% conformance, 9/9 DNA, no provider imports)
OUTPUT: Go adapter module (ES); variant SK-{id}#server#go registered as GENERATED
```

---

## T252 — SERVER VARIANT GENERATION — JAVA
```
TASK TYPE: T252
NAME: Server Variant Generation — Java
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Java selected as targetServer
PURPOSE: Generate a Java/Spring server adapter implementing MicroserviceBase-Java SDK (SK-149). For enterprise tenants + JVM ecosystems.
DISTINCT FROM: T250, T251, T253, T254

FACTORY DEPENDENCIES: F645, F646, F648, F662, F649, F650
FABRIC RESOLUTION: same as T250

AF CONFIGURATION:
  AF-1 (Genesis): generate Java Spring Boot adapter; inject SK-149 scaffold
  AF-4 (RAG): search for Java patterns (SK-149)
  AF-7 (Compliance): check Map<String,Object> usage (not POJOs for domain docs); DataProcessResult<T> equivalent
  AF-8 (Security): no hardcoded credentials; use fabric config resolution
  AF-9 (Judge): conformance suite + DNA compliance

IRON RULES:
  IRON-252-1: domain documents MUST use Map<String,Object> — no @Entity POJOs, no @Document classes
  IRON-252-2: single @RestController with path variable routing — no per-entity @RestController classes
  IRON-252-3: all DB/Queue/AI calls through fabric interface injection (@Autowired IAiProvider) — never new JdbcTemplate()

OUTPUT: Java Spring Boot adapter (ES); variant SK-{id}#server#java registered as GENERATED
```

---

## T253 — SERVER VARIANT GENERATION — RUST
```
TASK TYPE: T253
NAME: Server Variant Generation — Rust
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Rust selected as targetServer
PURPOSE: Generate Rust server adapter implementing MicroserviceBase-Rust SDK (SK-150). For performance/security critical edge services.
DISTINCT FROM: T250, T251, T252, T254

FACTORY DEPENDENCIES: F645, F646, F648, F662, F649, F650
FABRIC RESOLUTION: same as T250

AF CONFIGURATION:
  AF-1 (Genesis): generate Rust adapter (Axum or Actix-web); inject SK-150 scaffold
  AF-4 (RAG): search for Rust patterns (SK-150)
  AF-7 (Compliance): check HashMap<String,serde_json::Value> as document type; ResultEnvelope return type
  AF-8 (Security): memory safety review; no unsafe blocks in business logic
  AF-9 (Judge): conformance suite; no direct driver crate imports in service code

IRON RULES:
  IRON-253-1: document type MUST be HashMap<String, serde_json::Value> — no typed structs for domain payloads
  IRON-253-2: no unsafe{} blocks in generated business logic
  IRON-253-3: fabric calls via trait objects (Box<dyn IDatabaseService>) — no direct sqlx/redis-rs calls

OUTPUT: Rust adapter crate (ES); variant SK-{id}#server#rust registered as GENERATED
```

---

## T254 — SERVER VARIANT GENERATION — PHP
```
TASK TYPE: T254
NAME: Server Variant Generation — PHP
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; PHP selected as targetServer
PURPOSE: Generate PHP server adapter implementing MicroserviceBase-PHP SDK (SK-151). Primarily supports WordPress plugin runtime; can also host lightweight APIs.
DISTINCT FROM: T250–T253

FACTORY DEPENDENCIES: F645, F646, F648, F662, F649, F650, F656:IWpRestProxyGeneratorService
FABRIC RESOLUTION:
  F645–F650 → AI ENGINE FABRIC / DATABASE FABRIC (same as T250)
  F656 → AI ENGINE FABRIC (Skill 07)

AF CONFIGURATION:
  AF-1 (Genesis): generate PHP adapter; inject SK-151 scaffold (PSR-7/PSR-15 compatible)
  AF-4 (RAG): search for PHP patterns (SK-151)
  AF-7 (Compliance): check array as document type; DataProcessResult equivalent as PHP array{isSuccess, data, error}
  AF-8 (Security): no eval(); no direct PDO connection creation; no secrets in PHP files
  AF-9 (Judge): conformance suite; DNA compliance; WP packaging rules if WordPress context

IRON RULES:
  IRON-254-1: document type MUST be array (not PHP classes/objects for domain data)
  IRON-254-2: no direct PDO/MySQLi instantiation — use fabric config to resolve DB
  IRON-254-3: if WordPress context: MUST use register_rest_route with permission_callback (never omit)
  IRON-254-4: no eval(), no extract(), no variable variables in generated code

OUTPUT: PHP adapter (ES); variant SK-{id}#server#php registered as GENERATED
```

---

## T255 — SERVER VARIANT CROSS-LANGUAGE JUDGE
```
TASK TYPE: T255
NAME: Server Variant Cross-Language Judge
ARCHETYPE: JUDGMENT
ENTRY: All requested server variants generated (T250–T254 completed for selected targets)
PURPOSE: Run the canonical conformance suite simultaneously against all server variants; produce comparative report; flag divergences.
DISTINCT FROM: T263 (T255 focuses on server variants only; T263 is the global cross-variant runner)

FACTORY DEPENDENCIES:
  F668:IConformanceTestOrchestratorService
  F669:IGoldenTestReplayService
  F670:IVariantTestReporterService
  F671:IApiConformanceCheckerService

FABRIC RESOLUTION:
  F668 → QUEUE FABRIC (Redis Streams)
  F669 → DATABASE FABRIC (ES)
  F670 → DATABASE FABRIC (ES)
  F671 → AI ENGINE FABRIC (Skill 07)

AF CONFIGURATION:
  AF-9 (Judge): validate all variants produce identical DataProcessResult envelopes for same inputs
  AF-9: flag any variant whose error shape diverges from canonical
  AF-11 (Feedback): record divergences for future prompt improvement

IRON RULES:
  IRON-255-1: same golden input MUST produce same logical output across ALL server variants (data may differ in format, but isSuccess/error semantics must match)
  IRON-255-2: any variant failing conformance suite MUST be held at GENERATED status (cannot promote)

OUTPUT: Cross-language conformance report (ES); promotion eligibility flags per variant
```

---

## T256 — CLIENT VARIANT GENERATION — REACTJS
```
TASK TYPE: T256
NAME: Client Variant Generation — ReactJS
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; ReactJS selected as targetClient
PURPOSE: Generate ReactJS client adapter (hook + component) for a skill family. UI platform resolved via config; no direct React import in service layer.
DISTINCT FROM: T257 (Vue), T258 (Angular), T260 (WordPress Plugin)

FACTORY DEPENDENCIES:
  F647:IClientAdapterGeneratorService
  F648:IAdapterPromptLibraryService
  F649:IAdapterDNAComplianceService
  F650:IAdapterBundleStoreService
  F639:IVariantSelectorService

FABRIC RESOLUTION:
  F647 → AI ENGINE FABRIC (Skill 07)
  F648 → RAG FABRIC (Skill 00a)
  F649 → CORE FABRIC (Skill 01)
  F650 → DATABASE FABRIC (ES)
  F639 → DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1 (Genesis): generate React hook (use{SkillName}) + React component (<SkillNameForm/>); inject SK-152
  AF-4 (RAG): retrieve SK-152 (ReactJS Client Variant Adapter) + SK-167 (idempotency key stability)
  AF-6 (Code Review): review hook + component for fabric-first patterns
  AF-7 (Compliance): UI fabric resolution via config; no direct import of backend drivers
  AF-8 (Security): no secrets in bundle; tenantId from auth context (not from form input)
  AF-9 (Judge): idempotencyKey generated per submit attempt (UUID v4); stable across retries; last result cached

IRON RULES:
  IRON-256-1: hook MUST generate idempotencyKey per submit (UUID v4) and re-use SAME key on retry
  IRON-256-2: tenantId MUST come from auth context — never from form field
  IRON-256-3: API endpoint MUST be dynamic (config-driven base URL) — never hardcoded
  IRON-256-4: no direct axios/fetch to specific backend — goes through configured API fabric client

MACHINE / FREEDOM:
  MACHINE: idempotency behavior, tenant sourcing, no hardcoded endpoints
  FREEDOM: componentStyle (controlled/uncontrolled), cacheStrategy (memory/localStorage/none), reactVersion (18/19)

OUTPUT: React hook + component bundle (ES); variant SK-{id}#client#reactjs registered as GENERATED
```

---

## T257 — CLIENT VARIANT GENERATION — VUE
```
TASK TYPE: T257
NAME: Client Variant Generation — Vue
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Vue selected as targetClient
DISTINCT FROM: T256 (ReactJS), T258 (Angular)

FACTORY DEPENDENCIES: F647, F648, F649, F650, F639
FABRIC RESOLUTION: same as T256

AF CONFIGURATION:
  AF-1 (Genesis): generate Vue composable (use{SkillName}) + <SkillNameForm/> SFC; inject SK-153
  AF-4 (RAG): retrieve SK-153 (Vue Client Variant Adapter)
  AF-9 (Judge): reactive state management; same idempotency stability rules as T256

IRON RULES: same as T256 with Vue-specific:
  IRON-257-1: use Vue Composition API (composable pattern) — not Options API
  IRON-257-2: idempotencyKey in reactive ref; retry button re-uses same ref value (does not reset)

OUTPUT: Vue composable + SFC bundle; variant SK-{id}#client#vue registered as GENERATED
```

---

## T258 — CLIENT VARIANT GENERATION — ANGULAR
```
TASK TYPE: T258
NAME: Client Variant Generation — Angular
ARCHETYPE: GENERATION
ENTRY: Canonical spec validated; Angular selected as targetClient
DISTINCT FROM: T256 (ReactJS), T257 (Vue)

FACTORY DEPENDENCIES: F647, F648, F649, F650, F639
FABRIC RESOLUTION: same as T256

AF CONFIGURATION:
  AF-1 (Genesis): generate Angular service + component; inject SK-154
  AF-4 (RAG): retrieve SK-154 (Angular Client Variant Adapter)
  AF-9 (Judge): HttpInterceptor injects tenantId; retry MUST re-send SAME idempotencyKey

IRON RULES:
  IRON-258-1: HttpInterceptor MUST inject tenantId header (not component-level injection)
  IRON-258-2: service layer MUST handle retry transparently (same idempotencyKey preserved)

OUTPUT: Angular service + component; variant SK-{id}#client#angular registered as GENERATED
```

---

## T259 — CLIENT VARIANT FABRIC COMPLIANCE GATE
```
TASK TYPE: T259
NAME: Client Variant Fabric Compliance Gate
ARCHETYPE: JUDGMENT
ENTRY: All requested client variants generated (T256–T258)
PURPOSE: Validate all client variants for fabric-first compliance: no direct provider imports, UI platform resolved via config, no secrets, idempotency stable.
DISTINCT FROM: T255 (server variants)

FACTORY DEPENDENCIES: F649, F671, F642
FABRIC RESOLUTION: F649 → CORE FABRIC; F671 → AI ENGINE FABRIC; F642 → DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-7 (Compliance): static analysis — no direct framework imports in service layer
  AF-8 (Security): no secrets or hardcoded endpoints in bundles
  AF-9 (Judge): idempotency stability across all client variants

IRON RULES:
  IRON-259-1: any client variant importing a backend provider directly = BUILD FAILURE
  IRON-259-2: tenantId sourced from auth context in ALL client variants

OUTPUT: Client compliance report; promotion eligibility flags
```

---

## T260 — WORDPRESS PLUGIN PACKAGING GATE
```
TASK TYPE: T260
NAME: WordPress Plugin Packaging Gate
ARCHETYPE: GENERATION + PACKAGING
ENTRY: PHP server variant (T254) complete; wordpress_plugin selected as clientTarget
PURPOSE: Generate and package a complete WordPress plugin artifact for a skill family: PHP shell, Settings API admin page, Gutenberg block, REST proxy, ZIP artifact.
DISTINCT FROM: T261 (theme), T254 (PHP server adapter)

FACTORY DEPENDENCIES:
  F652:IWpPluginScaffoldService
  F653:IWpSettingsPageService
  F654:IWpBlockGeneratorService
  F655:IWpPluginPackagingService
  F656:IWpRestProxyGeneratorService

FABRIC RESOLUTION:
  F652 → AI ENGINE FABRIC (Skill 07)
  F653 → AI ENGINE FABRIC (Skill 07)
  F654 → AI ENGINE FABRIC (Skill 07)
  F655 → DATABASE FABRIC (ES) + QUEUE FABRIC (Redis Streams)
  F656 → AI ENGINE FABRIC (Skill 07)

AF CONFIGURATION:
  AF-1 (Genesis): generate plugin using SK-155 (WordPress Plugin Adapter Pattern) as scaffold
  AF-3 (Prompt Library): retrieve WP plugin implementer prompt from F648
  AF-4 (RAG): retrieve SK-155, SK-157 (WP REST Integration), SK-165 (No-Secrets Gate)
  AF-7 (Compliance): check plugin PHP for correct header, admin_init hook, block registration on both server+client
  AF-8 (Security): check permission_callback present; no secrets in options; nonce validation present
  AF-9 (Judge): validate packaging checklist (all MACHINE rules satisfied)

BFA VALIDATION:
  Check CF-310: WP plugin does not contain business logic (only presentation + config + API proxy)
  Check CF-311: REST endpoint permission_callback is not missing or set to __return_true without documentation

MACHINE / FREEDOM:
  MACHINE: plugin header required fields, Settings API on admin_init, dual block registration, permission_callback required, no secrets in PHP files
  FREEDOM: wp.plugin.namespace, wp.plugin.textDomain, wp.plugin.hasBlock, wp.plugin.hasRestProxy, wp.plugin.minPhp

IRON RULES:
  IRON-260-1: Plugin header MUST include: Plugin Name, Version, Requires PHP, Text Domain
  IRON-260-2: Settings registration MUST be on admin_init hook (not plugins_loaded, not init)
  IRON-260-3: Block MUST register on BOTH server (register_block_type in PHP) and client (registerBlockType in JS)
  IRON-260-4: REST endpoint MUST have permission_callback — absence = BUILD FAILURE
  IRON-260-5: NO secrets in WP options or PHP config files
  IRON-260-6: ALL business logic routed to XIIGen API — plugin is presentation + config layer ONLY

QUALITY GATES (AF-9):
  - Plugin ZIP assembles without error
  - wp-scripts build succeeds (index.js + index.asset.php generated)
  - REST proxy endpoint responds to health check
  - Security scan: no secrets, nonce validation present

OUTPUT: WordPress plugin ZIP artifact (ES + file store); variant SK-{id}#client#wordpress_plugin registered as GENERATED
```

---

## T261 — WORDPRESS THEME PACKAGING GATE
```
TASK TYPE: T261
NAME: WordPress Theme Packaging Gate
ARCHETYPE: GENERATION + PACKAGING
ENTRY: Design tokens available; wordpress_theme selected as clientTarget
PURPOSE: Generate and package WordPress block theme: theme.json, template parts, block patterns, theme ZIP. Styling + templates only — NO business logic.
DISTINCT FROM: T260 (plugin = behaviors; theme = styling + templates)

FACTORY DEPENDENCIES:
  F657:IWpThemeJsonGeneratorService
  F658:IWpTemplatePartGeneratorService
  F659:IWpBlockPatternGeneratorService
  F660:IWpThemePackagingService
  F661:IWpTokenExportService

FABRIC RESOLUTION:
  F657 → AI ENGINE FABRIC (Skill 07)
  F658 → AI ENGINE FABRIC (Skill 07)
  F659 → AI ENGINE FABRIC (Skill 07)
  F660 → DATABASE FABRIC (ES)
  F661 → RAG FABRIC (Skill 00a)

AF CONFIGURATION:
  AF-1 (Genesis): generate theme using SK-156 (WordPress Theme Adapter Pattern) scaffold
  AF-4 (RAG): retrieve SK-156, SK-161 (design token export patterns)
  AF-7 (Compliance): theme.json is ONLY mechanism for global styles; no inline PHP styles
  AF-8 (Security): no API credentials in theme files
  AF-9 (Judge): template structure correct (templates/, parts/ folders); theme.json valid schema

IRON RULES:
  IRON-261-1: theme.json is the ONLY global style mechanism — no wp_enqueue_style with custom CSS for global tokens
  IRON-261-2: Templates MUST be in templates/ folder; template parts in parts/ folder
  IRON-261-3: ZERO business logic in theme — routing to plugin or XIIGen API only
  IRON-261-4: If theme requires REST proxy: companion plugin declaration MUST be included in documentation

OUTPUT: WordPress theme ZIP (ES + file store); variant SK-{id}#client#wordpress_theme registered as GENERATED
```

---

## T262 — WORDPRESS SECURITY & AUTH GATE
```
TASK TYPE: T262
NAME: WordPress Security & Auth Gate
ARCHETYPE: VALIDATION
ENTRY: T260 or T261 packaging complete
PURPOSE: Security validation for all WordPress artifacts: no secrets exposure, correct auth strategy, nonce usage, REST permissions.

FACTORY DEPENDENCIES: F649, F642, F656
FABRIC RESOLUTION: F649 → CORE FABRIC; F642 → DATABASE FABRIC; F656 → AI ENGINE FABRIC

AF CONFIGURATION:
  AF-8 (Security): deep security scan of all WordPress PHP + JS files
  AF-9 (Judge): checklist validation

IRON RULES:
  IRON-262-1: ZERO secrets in client bundle or WP options
  IRON-262-2: API auth goes through XIIGen gateway — never embed API keys in plugin
  IRON-262-3: nonce validation required for all form submissions from WP admin

OUTPUT: Security gate report; PASS/FAIL per artifact
```

---

## T263 — CROSS-VARIANT CONFORMANCE RUNNER
```
TASK TYPE: T263
NAME: Cross-Variant Conformance Runner
ARCHETYPE: VALIDATION
ENTRY: Any variant promoted from GENERATED → INJECTED (or on schedule)
PURPOSE: Run canonical test suite against ALL variants of a skill family simultaneously; produce coverage matrix; flag regressions.

FACTORY DEPENDENCIES:
  F668:IConformanceTestOrchestratorService
  F669:IGoldenTestReplayService
  F670:IVariantTestReporterService

FABRIC RESOLUTION:
  F668 → QUEUE FABRIC (Redis Streams)
  F669 → DATABASE FABRIC (ES)
  F670 → DATABASE FABRIC (ES)

IRON RULES:
  IRON-263-1: variant CANNOT advance promotion ladder if conformance suite < 100% pass
  IRON-263-2: conformance runner MUST run on ALL variants simultaneously (parallel queue dispatch)

OUTPUT: Conformance matrix (ES): familyId → {variantId → passRate, failedTests[]}
```

---

## T264 — VARIANT PROMOTION LADDER GATE
```
TASK TYPE: T264
NAME: Variant Promotion Ladder Gate
ARCHETYPE: ORCHESTRATION
ENTRY: Variant passes T263 conformance; promotion requested
PURPOSE: Evaluate variant against quality gates and advance through GENERATED → INJECTED → MINIMAL → CORE.

FACTORY DEPENDENCIES:
  F678:IVariantPromotionGateService
  F679:IVariantStatusTransitionService
  F681:IPromotionAuditService

FABRIC RESOLUTION:
  F678 → AI ENGINE FABRIC (Skill 07 / AF-9)
  F679 → DATABASE FABRIC (ES) + QUEUE FABRIC
  F681 → DATABASE FABRIC (ES)

IRON RULES:
  IRON-264-1: conformance = 100% required for any promotion
  IRON-264-2: CORE promotion requires human approval (not automated)
  IRON-264-3: promotion audit trail is immutable (append-only, never delete)

OUTPUT: Promotion event (QUEUE); updated variant status in F638
```

---

## T265 — GRAPH RAG NODE INGESTION
```
TASK TYPE: T265
NAME: Graph RAG Node Ingestion
ARCHETYPE: ENRICHMENT (Phase B / P4)
ENTRY: Skill family + variants stable at INJECTED or above
PURPOSE: Ingest skill family and all its variants as nodes into the Graph RAG index.

FACTORY DEPENDENCIES:
  F673:IGraphSkillIndexService
  F674:IGraphEdgeLinkingService
  F635:ISkillMetadataIndexService

FABRIC RESOLUTION:
  F673 → RAG FABRIC (Graph strategy — Skill 00b)
  F674 → RAG FABRIC (Graph strategy)
  F635 → DATABASE FABRIC (ES)

OUTPUT: Graph nodes created: Skill, Variants, Factories, TestSuites; edges: HAS_VARIANT, DEPENDS_ON, VALIDATED_BY
```

---

## T266 — GRAPH RAG EDGE LINKING
```
TASK TYPE: T266
NAME: Graph RAG Edge Linking
ARCHETYPE: ENRICHMENT (Phase B / P4)
ENTRY: T265 complete; graph nodes exist
PURPOSE: Create relationship edges between skills in the graph: dependencies, alternatives, task type references.

FACTORY DEPENDENCIES: F674, F677
FABRIC RESOLUTION: F674, F677 → RAG FABRIC (Graph strategy)

OUTPUT: Edges: ALTERNATIVE_OF (variant↔variant within family), SKILL_DEPENDS_ON_SKILL, SKILL_REFERENCED_BY_TASKTYPE
```

---

## T267 — GRAPH RAG VARIANT SELECTION QUERY
```
TASK TYPE: T267
NAME: Graph RAG Variant Selection Query
ARCHETYPE: RETRIEVAL (Phase B / P4)
ENTRY: User/AF-4 requests skill for specific target stack
PURPOSE: Graph-local search: given target.client + target.server, find best matching variant(s) by graph traversal; return with maturity + test coverage ranking.

FACTORY DEPENDENCIES: F675, F639
FABRIC RESOLUTION: F675 → RAG FABRIC (Graph strategy); F639 → DATABASE FABRIC (ES)

OUTPUT: Ranked variant list with selection rationale; fallback: canonical + adapter recipe if exact variant missing
```

---

## T268 — MULTI-TARGET TRANSLATION ORCHESTRATOR
```
TASK TYPE: T268
NAME: Multi-Target Translation Orchestrator
ARCHETYPE: ORCHESTRATION (Master)
ENTRY: Admin triggers translation; provides source skill ID + target stack config
PURPOSE: Master DAG orchestrator for the full multi-target translation flow. Dispatches T247→T249, then parallel T250–T258 per selected targets, then T260–T262 if WordPress, then T263–T264, then T265–T267 (Phase B).

FACTORY DEPENDENCIES:
  F682:IMultiTargetTranslationOrchestratorService
  F683:ITranslationTraceService
  F684:ITranslationFeedbackInjectorService

FABRIC RESOLUTION:
  F682 → FLOW ENGINE FABRIC (Skill 09 — IFlowOrchestrator)
  F683 → DATABASE FABRIC (ES)
  F684 → AI ENGINE FABRIC (Skill 07 / AF-11)

TEMPLATE: Template 50 — Multi-Target Translation DAG (see MASTER_EXECUTION_PLAN)

IRON RULES:
  IRON-268-1: T247 (extraction) MUST complete before ANY T250–T258 (generation) starts
  IRON-268-2: T249 (conformance seed) MUST complete before T263 (runner) starts
  IRON-268-3: T265–T267 (Graph RAG) MUST only run AFTER all requested variants reach INJECTED status
  IRON-268-4: trace ID persisted; orchestrator MUST be resumable from any checkpoint (F683)

QUALITY GATES (AF-9):
  - All requested variants reach at least GENERATED status
  - Cross-variant conformance matrix produced
  - Trace ID recorded for full audit trail

OUTPUT: Translation job summary document (ES); all variants registered; optional Graph RAG nodes created
```
