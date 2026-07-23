# FLOW-34 SKILLS FACTORY RAG — Skill Multi-Target Translation
## Skills SK-145–SK-168

> All skills follow the established XIIGen skill format.
> LANGUAGE VARIANTS pattern extended with CLIENT VARIANTS block (new for FLOW-34).
> DNA patterns enforced in all variants.

---

## SK-145 — CANONICAL SKILL SPEC FORMAT
```
SKILL: SK-145
NAME: Canonical Skill Spec Format
TASK TYPES: T247, T248
FACTORIES: F631, F632, F635, F636
ARCHETYPE: SPEC / CONTRACT

PURPOSE:
  The Canonical Skill Spec is the single source of truth for a skill family.
  It is language/framework-neutral. All variants (server + client) are adapters to this spec.

CANONICAL SPEC STRUCTURE (stored as Dictionary in ES):
  {
    "canonicalId": "SK-{n}-canonical-v{version}",
    "familyId": "SK-{n}",
    "name": "...",
    "version": "v1",
    "sourceSkillId": "SK-{n}",     // original source
    "archetype": "...",            // STATEFUL_ORCHESTRATION / EXTRACTION / etc.

    "contractSurface": {
      "inputs": {"key": {"type": "string|int|bool|map", "required": true}},
      "outputs": {"key": {"type": "string|int|bool|map"}},
      "idempotencyKey": {"present": true, "scope": "per-submit"},
      "tenantScope": {"tenantId": "required on all operations"}
    },

    "eventsSchema": {
      "async": [{"eventType": "...", "cloudeventsType": "..."}],
      "attributes": {"id": "required", "source": "required", "specversion": "required", "type": "required"}
    },

    "goldenTests": [
      {"scenarioId": "GT-01", "type": "positive", "input": {...}, "expectedOutput": {...}},
      {"scenarioId": "GT-02", "type": "negative", "input": {...}, "expectedError": "..."},
      {"scenarioId": "GT-03", "type": "edge", "input": {...}, "expectedOutput": {...}}
    ],

    "machineFreedomMap": {
      "machine": ["tenant scope required", "no typed models", "DataProcessResult envelope"],
      "freedom": ["target language", "target framework", "packaging format"]
    },

    "factoriesUsed": ["F374", "F376", "F381"],
    "fabricsUsed": ["DATABASE", "QUEUE", "AI_ENGINE"],
    "dependencyTags": ["...", "..."],
    "af4Keywords": ["...", "..."]
  }

IRON RULES:
  - No language-specific type names in spec (no 'class', 'struct', 'interface', 'POCO')
  - Inputs/outputs always dictionary key-value with type annotation
  - Min 3 golden test vectors (positive + negative + edge)
  - CloudEvents attributes defined for all async events

AI AGENT PROMPT (for AF-1 extraction):
  "You are extracting a Canonical Skill Spec from a .NET or React Native skill definition.
   Output ONLY a Dictionary-format spec (no typed classes).
   All inputs and outputs must be dictionary key-value pairs.
   Define min 3 golden test vectors.
   Define CloudEvents envelope for all async events.
   Do NOT include any language-specific syntax."
```

---

## SK-146 — VARIANT DESCRIPTOR BLOCK SCHEMA
```
SKILL: SK-146
NAME: Variant Descriptor Block Schema
TASK TYPES: T248
FACTORIES: F638, F641
ARCHETYPE: SPEC / SCHEMA

PURPOSE:
  Defines the CLIENT VARIANTS and LANGUAGE VARIANTS blocks that are attached to every
  Canonical Skill Spec. Mirrors the existing LANGUAGE VARIANTS pattern in SK-69 etc.
  but adds CLIENT VARIANTS as a first-class equal block.

LANGUAGE VARIANTS BLOCK (existing pattern — now formalized):
  LANGUAGE VARIANTS:
    {targetServer}: {dotnet|node|go|java|rust|php}
      - SDK: MicroserviceBase-{lang} (SK-{n} reference)
      - documentType: "map/dict equivalent for this language"
      - resultEnvelope: "DataProcessResult<T> equivalent"
      - fabricCalls: ["IDatabaseService", "IQueueService", "IAiProvider"]
      - status: GENERATED|INJECTED|MINIMAL|CORE
      - conformanceScore: 0.0-1.0
      - packaging: "npm package | Maven JAR | Go module | Cargo crate | Composer package"

CLIENT VARIANTS BLOCK (NEW in FLOW-34):
  CLIENT VARIANTS:
    {targetClient}: {reactjs|vue|angular|wordpress_plugin|wordpress_theme|react_native}
      - SDK: Client adapter pattern (SK-{n} reference)
      - routingModel: "pages/components/blocks/admin-page"
      - buildHooks: ["npm build | wp-scripts | ng build | vite build"]
      - integrationContract: "DynamicController REST via config-base-url"
      - idempotencyKeyBehavior: "per-submit UUID v4; stable across retries"
      - tenantSource: "auth context (not form field)"
      - packagingRules: "npm package | plugin ZIP | theme ZIP"
      - status: GENERATED|INJECTED|MINIMAL|CORE
      - conformanceScore: 0.0-1.0

PACKAGING VARIANTS BLOCK (NEW):
  PACKAGING:
    - npm: "@xiigen/{skill-name}-ui"
    - wordpress_plugin: "xiigen-{skill-name}.zip"
    - wordpress_theme: "xiigen-{skill-name}-theme.zip" (optional)

IRON RULES:
  - Every CLIENT VARIANT must declare: integrationContract, idempotencyKeyBehavior, tenantSource, packagingRules
  - WordPress variants must include: settingsApiRules, blockRegistrationMode (plugin) OR themeJsonScope, businessLogicPolicy: "none" (theme)
```

---

## SK-147 — MICROSERVICEBASE-NODE SDK PATTERN
```
SKILL: SK-147
NAME: MicroserviceBase-Node SDK Pattern
TASK TYPES: T250
FACTORIES: F662
ARCHETYPE: SERVER_SDK

PURPOSE:
  Node.js runtime equivalent of MicroserviceBase (.NET). Enforces all 5 DNA behaviors
  for generated Node.js adapters.

REQUIRED SDK COMPONENTS:
  1. DataProcessResult envelope:
     { isSuccess: boolean, data: object|null, error: string|null }
     Never throw for business logic. Catch all → return { isSuccess: false, error: message }

  2. ParseDocument: all payload as plain {} (object), never class instance
     const doc = JSON.parse(body) // Object literal only

  3. Tenant scope: extract tenantId from JWT or route param; attach to ALL DB/Queue/Cache calls
     const tenantId = ctx.auth.tenantId // never from body

  4. DynamicRouter: single express Router with param-based routing
     router.all('/:tenantId/dynamic/:action', handler) // no route per entity

  5. Trace propagation: OpenTelemetry compatible
     Extract W3C traceparent; propagate to all downstream calls

FABRIC INTERFACE PATTERN (Node):
  // CORRECT — through fabric
  const result = await databaseService.searchDocuments({ tenantId, filter })
  // WRONG — direct driver import
  const { Pool } = require('pg') // BUILD FAILURE

DNA COMPLIANCE CHECKLIST:
  ☐ All IO as plain {} objects (DNA-1)
  ☐ Filter builder skips null/undefined fields (DNA-2)
  ☐ DataProcessResult returned always (DNA-3)
  ☐ MicroserviceBase-Node SDK imported (DNA-4)
  ☐ tenantId on every DB/Queue/Cache call (DNA-5)
  ☐ DynamicRouter only (DNA-6)

AI AGENT PROMPT (for AF-1 Node generation):
  "Generate a Node.js adapter for the skill. Use MicroserviceBase-Node SDK.
   ALL inputs/outputs are plain {} objects — never class instances.
   Return DataProcessResult always — never throw.
   tenantId from auth context only.
   Use IDatabaseService, IQueueService via dependency injection — never require('pg'), require('ioredis').
   Use DynamicRouter pattern — no entity-specific routes."
```

---

## SK-148 — MICROSERVICEBASE-GO SDK PATTERN
```
SKILL: SK-148
NAME: MicroserviceBase-Go SDK Pattern
TASK TYPES: T251
FACTORIES: F662
ARCHETYPE: SERVER_SDK

PURPOSE: Go runtime MicroserviceBase equivalent. Optimized for event workers and high-throughput consumers.

REQUIRED SDK COMPONENTS:
  1. ResultEnvelope:
     type Result struct { IsSuccess bool; Data map[string]interface{}; Error string }
     Return (Result, error) — never panic() for business logic

  2. ParseDocument: all payloads as map[string]interface{}
     var doc map[string]interface{} — never typed domain structs

  3. Tenant scope: from context.Context
     tenantId := ctx.Value("tenantId").(string)

  4. DynamicRouter (chi or gin):
     r.HandleFunc("/{tenantId}/dynamic/{action}", handler)

  5. CloudEvents SDK for event publishing:
     Use cloudevents-go SDK; required attrs: id, source, specversion, type

FABRIC INTERFACE PATTERN (Go):
  // CORRECT
  result := dbService.SearchDocuments(ctx, SearchFilter{TenantId: tenantId})
  // WRONG — direct driver
  db, _ := pgx.Connect(ctx, dsn) // BUILD FAILURE

AI AGENT PROMPT:
  "Generate a Go adapter. Payloads MUST be map[string]interface{} — no domain structs.
   Return (ResultEnvelope, error) — never panic.
   tenantId from context.Context always.
   Fabric calls only — no pgx, go-redis, or other direct driver imports."
```

---

## SK-149 — MICROSERVICEBASE-JAVA SDK PATTERN
```
SKILL: SK-149
NAME: MicroserviceBase-Java SDK Pattern
TASK TYPES: T252
FACTORIES: F662
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. DataProcessResult<T>:
     record DataProcessResult<T>(boolean isSuccess, T data, String error) {}
     Never throw for business logic. Wrap in try-catch → return failure result.

  2. ParseDocument: Map<String,Object> for all documents
     No @Entity, no @Document, no @JsonProperty domain POJOs

  3. Tenant scope: from SecurityContextHolder or request attribute
     String tenantId = (String) request.getAttribute("tenantId")

  4. Single @RestController:
     @RestController @RequestMapping("/{tenantId}/dynamic")
     No per-entity @RestController classes

  5. Fabric via @Autowired:
     @Autowired IDatabaseService databaseService — never new JdbcTemplate()

AI AGENT PROMPT:
  "Generate Java Spring Boot adapter. Documents are Map<String,Object> — no @Entity.
   Single @RestController with path variables — no per-entity controllers.
   Return DataProcessResult<T> — no throw for business logic.
   All DB/Queue/AI via @Autowired fabric interfaces — never direct instantiation."
```

---

## SK-150 — MICROSERVICEBASE-RUST SDK PATTERN
```
SKILL: SK-150
NAME: MicroserviceBase-Rust SDK Pattern
TASK TYPES: T253
FACTORIES: F662
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. ResultEnvelope:
     struct ResultEnvelope { is_success: bool, data: Option<serde_json::Value>, error: Option<String> }
     Return Result<ResultEnvelope, AppError> — never panic! in business logic

  2. ParseDocument: HashMap<String, serde_json::Value>
     No domain structs for payloads. Deserialize to HashMap only.

  3. Tenant scope: from Axum/Actix Extension
     let tenant_id = req.extensions().get::<TenantId>().unwrap()

  4. DynamicRouter: single Axum router with wildcard
     .route("/:tenant_id/dynamic/:action", post(handler))

  5. Trait objects for fabric:
     Box<dyn IDatabaseService>, Box<dyn IQueueService>
     Never use sqlx::PgPool directly in service code

  NO unsafe{} blocks in generated service code.

AI AGENT PROMPT:
  "Generate Rust adapter (Axum). Payloads are HashMap<String, serde_json::Value> — no domain structs.
   Return ResultEnvelope — never panic! for business logic.
   Fabric through trait objects Box<dyn IDatabaseService> — no direct sqlx or redis-rs.
   No unsafe blocks in service code."
```

---

## SK-151 — MICROSERVICEBASE-PHP SDK PATTERN
```
SKILL: SK-151
NAME: MicroserviceBase-PHP SDK Pattern
TASK TYPES: T254
FACTORIES: F662
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. DataProcessResult:
     return ['isSuccess' => true, 'data' => [...], 'error' => null]
     Catch exceptions → return ['isSuccess' => false, 'error' => $e->getMessage()]

  2. ParseDocument: PHP array (not class/object)
     $doc = json_decode($body, true) — associative array only

  3. Tenant scope: from JWT or route param
     $tenantId = $request->get('tenantId') // from validated auth layer

  4. DynamicRouter (when used as standalone API):
     Single route handler: /api/{tenantId}/dynamic/{action}
     No per-entity route files

  5. WordPress context rules:
     register_rest_route with permission_callback required
     No eval(), no extract(), no variable variables

FABRIC:
  Use IFabric interface injection — never new PDO(), never new wpdb()
  In WP context: REST API calls go to XIIGen gateway, not direct to DB

AI AGENT PROMPT:
  "Generate PHP adapter. Documents are PHP arrays (json_decode with true) — no classes for domain data.
   Return DataProcessResult array — catch exceptions.
   In WordPress context: register_rest_route with permission_callback.
   No eval(), no direct PDO/MySQLi creation, no secrets in PHP files."
```

---

## SK-152 — REACTJS CLIENT VARIANT ADAPTER
```
SKILL: SK-152
NAME: ReactJS Client Variant Adapter
TASK TYPES: T256
FACTORIES: F647
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN:
  Hook: use{SkillName}()
    - Generates idempotencyKey (UUID v4) per submit attempt
    - Re-uses SAME key on retry (stable across retries)
    - tenantId from auth context (useAuth hook or context provider)
    - API base URL from config (env var or context) — never hardcoded
    - Returns: { submit, isLoading, result, error }

  Component: <{SkillName}Form />
    - Controlled inputs with validation
    - Submit → calls hook.submit(payload)
    - Retry button re-uses same idempotencyKey (does not generate new one)
    - Error display with retry affordance

IDEMPOTENCY PATTERN (MACHINE — always this way):
  const [idempotencyKey] = useState(() => uuidv4()) // generated once
  const handleRetry = () => submit({ ...payload, idempotencyKey }) // SAME key

FABRIC-FIRST PATTERN:
  const { apiClient } = useFabricClient() // platform-resolved via config
  // NEVER: import axios from 'axios' with hardcoded URL

DNA-5 EQUIVALENT (CLIENT):
  const { tenantId } = useAuth() // ALWAYS from auth context
  // NEVER: <input name="tenantId" /> — never from form field

AI AGENT PROMPT:
  "Generate React hook + component. idempotencyKey generated once per submit sequence — same key on retry.
   tenantId from useAuth() — never from form field.
   API calls via useFabricClient() with config-driven base URL — never hardcoded URL.
   Use plain object {} for all API payloads — no class instances."
```

---

## SK-153 — VUE CLIENT VARIANT ADAPTER
```
SKILL: SK-153
NAME: Vue Client Variant Adapter
TASK TYPES: T257
FACTORIES: F647
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN (Composition API):
  composable: use{SkillName}()
    const idempotencyKey = ref(uuidv4()) // generated once; NEVER reset on retry
    const tenantId = inject('tenantId') // or useAuth composable
    const submit = async (payload) => {
      // idempotencyKey.value stays the same on retry — do not replace
      const result = await apiClient.post(endpoint, { ...payload, idempotencyKey: idempotencyKey.value })
      return parseResult(result) // DataProcessResult<object>
    }

  Component: <{SkillName}Form /> (SFC)
    - emits: submitted, error
    - internal retry uses same idempotencyKey ref

IRON RULES:
  - Composition API only (not Options API)
  - idempotencyKey ref: created once in composable; retry re-uses ref.value

AI AGENT PROMPT:
  "Generate Vue composable (Composition API) + SFC component.
   idempotencyKey is a ref created ONCE — retry MUST NOT reset it.
   tenantId from inject or useAuth — not from template input.
   API via fabric client (config base URL) — not hardcoded axios instance."
```

---

## SK-154 — ANGULAR CLIENT VARIANT ADAPTER
```
SKILL: SK-154
NAME: Angular Client Variant Adapter
TASK TYPES: T258
FACTORIES: F647
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN:
  Service: {SkillName}Service
    constructor(private apiClient: FabricApiClient, private authService: AuthService) {}
    submit(payload: object): Observable<DataProcessResult> {
      const idempotencyKey = this.currentIdempotencyKey // preserved across retries
      const tenantId = this.authService.tenantId
      return this.apiClient.post(endpoint, { ...payload, idempotencyKey, tenantId })
    }

  Component: {SkillName}Component
    - HttpInterceptor injects tenantId as header (not from component)
    - Retry: preserve idempotencyKey — call service.submit(samePayload)

  HttpInterceptor (MACHINE — always required):
    intercept(req, next) {
      const tenantId = this.authService.tenantId
      const cloned = req.clone({ setHeaders: { 'X-Tenant-Id': tenantId } })
      return next.handle(cloned)
    }

IRON RULES:
  - HttpInterceptor MUST inject tenantId — never from component template
  - idempotencyKey held in service instance — not regenerated on retry

AI AGENT PROMPT:
  "Generate Angular service + component + HttpInterceptor.
   HttpInterceptor adds tenantId header from AuthService — never from component.
   idempotencyKey preserved in service across retries.
   All HTTP via FabricApiClient with config base URL — no direct HttpClient with hardcoded URL."
```

---

## SK-155 — WORDPRESS PLUGIN ADAPTER PATTERN
```
SKILL: SK-155
NAME: WordPress Plugin Adapter Pattern
TASK TYPES: T260
FACTORIES: F652, F653, F654, F655, F656
ARCHETYPE: WORDPRESS_HOST_TARGET

PURPOSE: Template for generating a WordPress plugin variant of any XIIGen skill.
         Plugin = behaviors + admin + blocks. NOT business logic.

PLUGIN STRUCTURE (generated):
  xiigen-{skill-name}/
    xiigen-{skill-name}.php      // main plugin file with header
    includes/
      class-settings.php         // Settings API registration
      class-rest-proxy.php       // REST endpoint → XIIGen API proxy
    blocks/
      {skill-name}/
        block.json               // block metadata + registration
        index.php                // server-side registration
        src/index.js             // client-side registerBlockType
        build/                   // wp-scripts output
    README.txt

PLUGIN HEADER (MACHINE — required fields):
  <?php
  /**
   * Plugin Name: XIIGen {Skill Name}
   * Version: 1.0.0
   * Requires PHP: 8.1
   * Text Domain: xiigen-{skill-name}
   */

SETTINGS API PATTERN (MACHINE — on admin_init):
  add_action('admin_init', function() {
    register_setting('xiigen_{skill}_settings', 'xiigen_{skill}_api_url')
    add_settings_section('xiigen_{skill}_main', 'XIIGen Settings', null, 'xiigen-{skill}')
    add_settings_field('xiigen_{skill}_api_url', 'API Base URL', 'render_api_url_field', 'xiigen-{skill}', 'xiigen_{skill}_main')
  })
  // NO SECRETS stored in WP options

BLOCK REGISTRATION (MACHINE — BOTH server and client):
  // PHP (server):
  register_block_type(__DIR__ . '/blocks/{skill-name}')
  // JS (client):
  registerBlockType('xiigen/{skill-name}', { ...settings })

REST PROXY PATTERN (MACHINE — permission_callback required):
  register_rest_route('xiigen/v1', '/{skill-name}', [
    'methods' => 'POST',
    'callback' => [$this, 'proxy_to_xiigen'],
    'permission_callback' => [$this, 'check_permission'] // NEVER omit
  ])
  // proxy_to_xiigen calls XIIGen API gateway — NOT direct DB

IRON RULES (same as T260):
  IRON-155-1: plugin header required fields present
  IRON-155-2: Settings API on admin_init
  IRON-155-3: Block registered on BOTH server + client
  IRON-155-4: REST endpoint has permission_callback
  IRON-155-5: NO secrets in PHP files or WP options
  IRON-155-6: ZERO business logic — presentation + config + API proxy only

AI AGENT PROMPT:
  "Generate WordPress plugin. Plugin header must include Name, Version, Requires PHP, Text Domain.
   Settings API on admin_init hook only — never on init or plugins_loaded.
   Block: register_block_type in PHP + registerBlockType in JS — both required.
   REST endpoint: permission_callback MUST be present — never omit.
   NO secrets in PHP — API URL stored in wp_options is fine; API keys are NOT.
   Plugin is presentation + config layer only — proxy to XIIGen API, never touch DB directly."
```

---

## SK-156 — WORDPRESS THEME ADAPTER PATTERN
```
SKILL: SK-156
NAME: WordPress Theme Adapter Pattern
TASK TYPES: T261
FACTORIES: F657, F658, F659, F660, F661
ARCHETYPE: WORDPRESS_HOST_TARGET

PURPOSE: Template for generating WordPress block theme variant. Styling + templates ONLY.

THEME STRUCTURE (generated):
  xiigen-{skill-name}-theme/
    theme.json           // global settings + styles (ONLY global style mechanism)
    templates/
      index.html         // main template
      single.html        // optional: single post template
    parts/
      header.html        // template parts
      footer.html
    patterns/
      {skill-pattern}.php // optional: block patterns
    style.css            // theme identification header only
    README.md

THEME.JSON PATTERN (from design tokens — MACHINE):
  {
    "version": 2,
    "settings": {
      "color": { "palette": [...] },    // from design token export (F661)
      "typography": { "fontFamilies": [...] },
      "spacing": { "units": [...] }
    },
    "styles": { "color": {...}, "typography": {...} }
  }

IRON RULES:
  IRON-156-1: theme.json is ONLY global style mechanism — no wp_enqueue_style for global tokens
  IRON-156-2: templates in templates/ — NEVER inline in functions.php
  IRON-156-3: ZERO business logic — all behavior via REST to plugin or XIIGen API
  IRON-156-4: companion plugin required if REST proxy needed (declared in README)

AI AGENT PROMPT:
  "Generate WordPress block theme. theme.json handles ALL global styles — no inline CSS for global tokens.
   Templates in templates/ folder. Template parts in parts/ folder.
   ZERO business logic in theme — all behavior proxied to plugin or XIIGen API.
   Design tokens mapped from canonical design system via F661."
```

---

## SK-157 — WORDPRESS REST INTEGRATION PATTERN
```
SKILL: SK-157
NAME: WordPress REST Integration Pattern
TASK TYPES: T260, T262
FACTORIES: F656
ARCHETYPE: SECURITY / INTEGRATION

PURPOSE: Governs how WordPress plugins communicate with the XIIGen API.

AUTH STRATEGY OPTIONS (FREEDOM):
  Option A: Application Passwords (WP core) — plugin stores user-scoped token in transient
  Option B: Custom OAuth token stored in site options (not user-meta)
  Option C: Service account JWT issued by XIIGen and stored in encrypted option

INTEGRATION PATTERN (REST proxy):
  $response = wp_remote_post(get_option('xiigen_api_url') . '/api/dynamic/' . $tenant_id . '/' . $action, [
    'headers' => ['Authorization' => 'Bearer ' . $this->get_token(), 'Content-Type' => 'application/json'],
    'body' => wp_json_encode($payload),
    'timeout' => 15
  ])

SECURITY CHECKLIST (AF-8 validates):
  ☐ No API keys or secrets in PHP source
  ☐ permission_callback present on all REST routes
  ☐ Nonce validation on admin form submissions
  ☐ wp_remote_post timeout set (default: 15s)
  ☐ Response validated: wp_is_wp_error($response) check
  ☐ tenantId from user meta or site option — never from request body in admin context
```

---

## SK-158 — CLOUDEVENTS ENVELOPE PATTERN
```
SKILL: SK-158
NAME: CloudEvents Envelope Pattern
TASK TYPES: T247, T249, T263
FACTORIES: F672
ARCHETYPE: EVENTS / CONTRACT

PURPOSE: Standard event envelope for all async skill events across all language variants.

REQUIRED CLOUDEVENTS ATTRIBUTES (MACHINE):
  id: UUID (unique per event)
  source: "xiigen/{tenantId}/{skillId}"
  specversion: "1.0"
  type: "xiigen.{flowId}.{eventName}"

OPTIONAL BUT RECOMMENDED:
  time: ISO 8601
  datacontenttype: "application/json"
  subject: "{tenantId}/{entityId}"

ENVELOPE STRUCTURE:
  {
    "specversion": "1.0",
    "id": "...",
    "source": "xiigen/tenant-123/SK-69",
    "type": "xiigen.flow34.VariantGenerated",
    "time": "2026-03-01T00:00:00Z",
    "datacontenttype": "application/json",
    "data": { /* skill event payload as Dictionary */ }
  }

LANGUAGE SDKs AVAILABLE:
  Node: cloudevents-sdk-javascript
  Go: cloudevents-go
  Java: cloudevents-java
  Rust: cloudevents-sdk-rust
  PHP: cloudevents-php
  (All listed as official CloudEvents project SDKs)
```

---

## SK-159 — OPENAPI CANONICAL CONTRACT PATTERN
```
SKILL: SK-159
NAME: OpenAPI Canonical Contract Pattern
TASK TYPES: T247, T271
FACTORIES: F634, F671
ARCHETYPE: CONTRACT

PURPOSE: Defines how canonical skill HTTP contracts are expressed in OpenAPI 3.1.

OPENAPI 3.1 DOCUMENT REQUIREMENTS:
  openapi: "3.1.0"    // required field
  info:
    title: "{SkillName} — XIIGen Canonical Contract"
    version: "v1"
  paths:
    /api/dynamic/{tenantId}/{action}:
      post:
        parameters: [tenantId (path), action (path)]
        requestBody: schema → Dictionary (additionalProperties: true)
        responses:
          200: DataProcessResult envelope
          400: error result (isSuccess: false)

IRON RULES:
  - requestBody schema MUST be additionalProperties: true (never fixed typed schema for domain data)
  - tenantId MUST be path parameter (not body field)
  - All responses use DataProcessResult envelope schema

CODE GENERATION (multi-language stubs via OpenAPI Generator):
  dotnet: openapi-generator generate -g aspnetcore
  node: openapi-generator generate -g nodejs-express-server
  go: openapi-generator generate -g go-gin-server
  java: openapi-generator generate -g spring
  rust: openapi-generator generate -g rust-axum
  php: openapi-generator generate -g slim4
```

---

## SK-160 — JSON SCHEMA PAYLOAD VALIDATOR
```
SKILL: SK-160
NAME: JSON Schema Payload Validator
TASK TYPES: T249, T263
FACTORIES: F634, F672
ARCHETYPE: CONTRACT / VALIDATION

PURPOSE: Cross-language payload validation using JSON Schema draft 2020-12.

CANONICAL SCHEMA (per skill, in canonical spec):
  {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "tenantId": {"type": "string", "minLength": 1},
      "idempotencyKey": {"type": "string", "format": "uuid"},
      // ... skill-specific fields
    },
    "required": ["tenantId", "idempotencyKey"],
    "additionalProperties": true
  }

VALIDATION USES:
  - Canonical golden test vector validation
  - Cross-variant conformance assertion
  - API boundary parity check (T271)
```

---

## SK-161 — CROSS-VARIANT GOLDEN TEST SUITE
```
SKILL: SK-161
NAME: Cross-Variant Golden Test Suite
TASK TYPES: T249, T263
FACTORIES: F668, F669, F670
ARCHETYPE: TESTING

PURPOSE: Defines structure and execution of canonical test suite that ALL variants must pass.

TEST SUITE STRUCTURE:
  {
    "suiteId": "...",
    "familyId": "SK-{n}",
    "scenarios": [
      {
        "scenarioId": "GT-01",
        "type": "positive",
        "input": {"tenantId": "t1", "idempotencyKey": "uuid-1", ...},
        "expectedOutput": {"isSuccess": true, "data": {...}},
        "tolerance": "exact|semantic" // semantic = same logical meaning, not byte-equal
      },
      {
        "scenarioId": "GT-02",
        "type": "negative — missing tenantId",
        "input": {"idempotencyKey": "uuid-2"},
        "expectedOutput": {"isSuccess": false}
      },
      {
        "scenarioId": "GT-03",
        "type": "idempotency — same key twice",
        "input": {"tenantId": "t1", "idempotencyKey": "uuid-3", ...},
        "runTwice": true,
        "expectedSameResult": true
      }
    ]
  }

EXECUTION PATTERN:
  1. Queue test runs for all variants (F668 → QUEUE FABRIC)
  2. Replay each scenario against each variant (F669)
  3. Compare output: DataProcessResult semantics must match canonical
  4. Store results in F670; flag any variant that fails
```

---

## SK-162 — GRAPH RAG INGESTION PATTERN
```
SKILL: SK-162
NAME: Graph RAG Ingestion Pattern
TASK TYPES: T265, T266
FACTORIES: F673, F674
ARCHETYPE: GRAPH_RAG (Phase B / P4)

PURPOSE: How to convert the regular skill library into Graph RAG nodes + edges.

NODE CREATION (one canonical Skill → N nodes):
  Skill node: { id: "skill:SK-{n}", type: "Skill", name, archetype, keywords, factories, status }
  Variant nodes: { id: "variant:SK-{n}#server#node", type: "Variant", variantKind: "server", target: "node", maturity, conformanceScore }
  Factory nodes: { id: "dep:F{n}", type: "Factory", name }
  TestSuite node: { id: "test:SK-{n}-canonical", type: "TestSuite", scenarioCount, coverage }

EDGE CREATION:
  skill → variant: HAS_VARIANT
  variant → variant (same family): ALTERNATIVE_OF
  skill → factory: DEPENDS_ON
  variant → testSuite: VALIDATED_BY
  skill → fabric: USES_FABRIC

GRAPH RAG QUERY PATTERNS:
  Local search (entity-based):
    "Does SK-69 have a WordPress plugin variant?"
    → find skill:SK-69 → traverse HAS_VARIANT → filter target=wordpress_plugin
    → return variant node + maturity + conformanceScore

  Global search (community-based):
    "What's our WordPress coverage across the skill library?"
    → community = all nodes with target=wordpress_plugin
    → LLM summarizes completeness and gaps
```

---

## SK-163 — GRAPH RAG VARIANT SELECTION
```
SKILL: SK-163
NAME: Graph RAG Variant Selection
TASK TYPES: T267
FACTORIES: F675, F639
ARCHETYPE: GRAPH_RAG (Phase B / P4)

PURPOSE: AF-4 upgrade: hybrid retrieval → graph expansion to select best variant.

SELECTION ALGORITHM:
  1. Hybrid retrieve: semantic + keyword search finds top-K skill families
  2. For each family: graph-traverse HAS_VARIANT edges
  3. Filter by requested target (targetClient, targetServer)
  4. Rank by: maturity (CORE > MINIMAL > INJECTED > GENERATED) then conformanceScore
  5. Return: best matching variant + rationale
  6. If no matching variant: return canonical spec + adapter recipe (via F644)

FALLBACK STRATEGY:
  No exact variant → F644:IVariantFallbackService returns:
    { variantExists: false, canonicalSpec: {...}, adapterRecipe: "Generate using T250/T256..." }
```

---

## SK-164 — VARIANT PACKAGING MANIFEST
```
SKILL: SK-164
NAME: Variant Packaging Manifest
TASK TYPES: T260, T261, T264
FACTORIES: F655, F660
ARCHETYPE: PACKAGING

PURPOSE: Standard packaging manifest for all variant output artifacts.

MANIFEST STRUCTURE:
  {
    "manifestVersion": "1.0",
    "familyId": "SK-{n}",
    "variantId": "SK-{n}#client#wordpress_plugin",
    "artifactType": "wordpress_plugin_zip | npm_package | go_module | java_jar | rust_crate | composer_package",
    "artifactPath": "...",
    "generatorVersion": "FLOW-34-v1",
    "conformancePassed": true,
    "conformanceScore": 1.0,
    "promotionStatus": "GENERATED",
    "checksums": { "sha256": "..." },
    "createdAt": "2026-03-01T00:00:00Z"
  }
```

---

## SK-165 — NO-SECRETS GATE PATTERN
```
SKILL: SK-165
NAME: No-Secrets Gate Pattern
TASK TYPES: T262, T260, T256–T258
FACTORIES: F649
ARCHETYPE: SECURITY

PURPOSE: Security gate enforced on ALL client variant bundles and WordPress artifacts.

CHECKS (AF-8 static analysis):
  ☐ No API keys, tokens, passwords, connection strings in source
  ☐ No base64-encoded secrets
  ☐ No .env file contents embedded in bundle
  ☐ tenantId only from auth context (not hardcoded)
  ☐ WordPress: no secrets in WP options; API URLs are acceptable

VIOLATION = BUILD FAILURE (same severity as IRON RULES)
```

---

## SK-166 — TENANT SCOPE PROPAGATION — MULTI-LANGUAGE
```
SKILL: SK-166
NAME: Tenant Scope Propagation — Multi-Language
TASK TYPES: T250–T254
FACTORIES: F665
ARCHETYPE: MULTI-LANG / DNA-5

PURPOSE: Reference implementation of DNA-5 (tenant scope) for all supported languages.

PER-LANGUAGE EXTRACTION PATTERNS:
  .NET: var tenantId = HttpContext.Items["tenantId"]?.ToString()
  Node: const tenantId = req.auth?.tenantId || req.params.tenantId
  Go: tenantId := ctx.Value("tenantId").(string)
  Java: String tenantId = (String) request.getAttribute("tenantId")
  Rust: let tenant_id = req.extensions().get::<TenantId>().cloned()
  PHP: $tenantId = $request->get('tenantId') // from validated JWT middleware

IRON RULE: tenantId on EVERY DB/Queue/Cache call — never query without it
```

---

## SK-167 — IDEMPOTENCY KEY STABILITY PATTERN
```
SKILL: SK-167
NAME: Idempotency Key Stability Pattern
TASK TYPES: T256–T258, T263
FACTORIES: F669
ARCHETYPE: QUALITY / CLIENT

PURPOSE: Ensures idempotency key is stable across retries in all client variants.

RULE: idempotencyKey is generated ONCE per "user submission intent" — NOT per network call.
      Retry = same intent → same key. New submission = new key.

PER-FRAMEWORK PATTERNS:
  React: const [key] = useState(() => uuidv4()) // created once in state
  Vue: const key = ref(uuidv4()) // created once in composable setup
  Angular: private key = uuidv4() // private field on service instance; reset only on explicit "start over"
  WordPress: PHP stores key in session/transient on form init; re-uses on retry

CONFORMANCE TEST (GT-03 in every canonical suite):
  Submit → capture response
  Submit SAME key again → response MUST be identical (server idempotency)
  Submit with NEW key → treated as new request
```

---

## SK-168 — CANONICAL TEST REPLAY RUNNER
```
SKILL: SK-168
NAME: Canonical Test Replay Runner
TASK TYPES: T263, T255
FACTORIES: F668, F669, F670
ARCHETYPE: TESTING

PURPOSE: Execution engine for replaying canonical golden test scenarios against variants.

EXECUTION FLOW:
  1. Load canonical test suite from F636
  2. For each variant in scope: queue a test run (F668 → QUEUE FABRIC)
  3. For each scenario: call variant endpoint with golden input
  4. Compare response to expected output:
     - isSuccess semantics must match
     - data structure must satisfy JSON Schema
     - error messages must be non-empty when expected
  5. Record pass/fail + conformanceScore in F670
  6. Publish test completion event (CloudEvents envelope via SK-158)

QUEUE PATTERN (Fan-out):
  TestSuiteStarted → [TestVariantRequested per variant] → [ScenarioReplayed per scenario per variant]
  All fan-out via IQueueService.EnqueueAsync — never direct HTTP between test runner and variants
```
