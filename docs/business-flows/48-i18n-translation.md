<!--
  Source: business flows.zip / 34-translate to alternatives.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-48 i18n-translation
  Naming note: Resolved 2026-04-22 — zip-34 translate-to-alternatives describes locale detection + alternative content rendering; maps to today's i18n-translation. Today's FLOW-34 slug 'marketplace-plugin-adapter' is a different concept.
  Related deep-research: docs/business-flows/_deep-research/i18n-translation/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/i18n-translation/ (if present)
-->


Currently the skills we are creating are for .net and react native- we would like to effectively translate those skills to : client: reactjs, vue, angular ,wordpress plugin/theme server: rust, php, java, node, go
wordpress plugin/theme


Here’s the clean way to “translate skills” without cloning business logic per stack: **separate the skill into a canonical, stack-agnostic contract + tests + prompts**, then generate **target adapters** (client + server) through the existing factory/fabric + AF pipeline.

Below is a RAG-grounded plan that stays 100% Fabric-First / Genie-DNA and scales to React/Vue/Angular + WordPress plugin/theme + Rust/Go/Java/Node/PHP.

---

## 0) RAG anchors from your engine (what we should reuse, not reinvent)

**Client side already supported as platforms (renderer-resolved):**

* `F641 IFlowDesignerService` resolves UI platform via **FREEDOM config**: react / angular / svelte / react-native / vue, and explicitly forbids importing platform modules in service code 
* Skill inventory already lists `26-web-flow-editor` supporting React/Svelte/Vue/Angular/Solid 

**Client code export already exists:**

* `T363 — UI Code Export Gate` produces deployable code and supports React/Angular/Vue via FREEDOM config, using multi-model generation + review + judge gating 

**Server code generation pipeline exists (needs new targets):**

* `F643 INodeCodeGeneratorService` already generates node service code with a FREEDOM `target language (.NET/Node/Python)`  (we extend this list to Rust/Go/Java/PHP)

**Non-negotiable DNA (applies to every generated service in every language):**

* DNA requires Dictionary/Map documents, result envelopes, MicroserviceBase semantics, tenant scope, and DynamicController-style routing 

---

## 1) What “translate skills” should mean in XIIGen terms

Instead of “porting code”, we translate **the skill’s behavior** into a **Canonical Skill Spec** that is **language/framework neutral**, then generate per-target implementations.

### Canonical Skill Spec (the single source of truth)

Stored as documents (ES via DB Fabric), and includes:

1. **Capability contract**

* Inputs/outputs: `Dictionary<string,object>` (or language equivalent: map)
* Events (CloudEvents), correlation keys, tenant scoping rules
* Iron rules + quality gates + BFA checks (unchanged across stacks)

2. **Reference behavior tests**

* Golden inputs/outputs, replayable scenarios, E2E expectations

3. **UI intent model (if skill has UI)**

* UI component model nodes, bindings, validation rules (again: neutral)

4. **Target mapping table (FREEDOM)**

* `clientTargets`: react/vue/angular/wordpress_plugin/wordpress_theme
* `serverTargets`: dotnet/node/go/java/rust/php
* `constraints`: “must be server-renderable”, “must run in WP admin”, etc.

This makes the “skill” portable. Only adapters change.

---

## 2) Client translation strategy (ReactJS / Vue / Angular / WordPress plugin/theme)

### A) ReactJS / Vue / Angular

You already have the correct architecture: platform selection is a **config decision**, not a code fork:

* UI renderer is resolved by `"ui.platform"` (react/angular/vue/…) 
* Code export pipeline exists (`T363`) and is explicitly multi-framework through FREEDOM 

**So “translation” here = feed the same node-tree/UI spec into T363 and choose the framework in config.**
No new business logic, no duplicated “skill”, just a different output target.

### B) WordPress plugin/theme (new target)

Treat WordPress as **two outputs** (both are packaging + runtime integration problems):

#### 1) WordPress Plugin output

Use plugin as “host runtime”:

* Admin config via Settings API (`register_setting`, `add_settings_section`, etc.) ([WordPress Developer Resources][1])
* Optional REST endpoints to talk to your engine / tenant control plane (if WP is acting as an integration surface)
* Gutenberg block(s) for content/UI, registered using `block.json` and server+client registration ([WordPress Developer Resources][2])
* JS build pipeline can use `@wordpress/scripts` (`wp-scripts`) for standardized builds ([WordPress Developer Resources][3])

Authentication options (when WP needs to call your APIs):

* “Application Passwords” are part of WP core REST patterns (controller + routes) ([WordPress Developer Resources][4])

**How this maps to XIIGen:**

* Add new **clientTarget** = `wordpress_plugin`
* Extend the **framework adapter** (same idea as F976 in code export) to emit:

  * plugin skeleton (PHP)
  * block editor assets (JS bundle)
  * settings page + option schema
  * deployment artifact = ZIP

#### 2) WordPress Theme output (block theme)

Theme is a token + template packaging format:

* `theme.json` is the canonical config surface for global settings/styles in modern themes ([WordPress Developer Resources][5])
* Template parts are the modular building blocks ([WordPress Developer Resources][6])

**How this maps to XIIGen:**

* Add new **clientTarget** = `wordpress_theme`
* Reuse your existing design token export gate to generate:

  * `theme.json` mappings (colors/typography/spacing)
  * CSS variables and/or style variations
* Emit template parts + patterns as derived artifacts from the same node tree

> Practical rule: **Plugin = behaviors + admin + blocks**; **Theme = styling + templates**.
> Both can embed a React/Vue/Angular build, but WordPress has its own preferred conventions (blocks, theme.json) so it’s worth a dedicated adapter.

---

## 3) Server translation strategy (Rust / PHP / Java / Node / Go)

Your engine already supports “generate services for a node” (`F643`) and lets you choose target language via FREEDOM . To expand to Rust/Go/Java/PHP without breaking DNA:

### The only scalable approach

Create **language runtimes** that implement the same “MicroserviceBase contract” *behaviorally*:

**Per-language “MicroserviceBase SDK” must provide:**

* `DataProcessResult<T>` envelope equivalent (success/error without throwing for business logic)
* `ParseDocument` → map/dict only
* tenant scope propagation on every storage/query/cache operation
* DynamicController equivalent (a single generic controller/router driven by config)
* trace context propagation (you already enforce this as part of the pipeline elsewhere; keep it consistent)

Then codegen produc, validation, orchestration)

* calls to fabrics (DB/Queue/AI/RAG) via the SDK interfaces (not provider SDKs)

This keeps: **“same skill behavior, different language surface”**.

### How to decide which language gets what

* **Node**: fastest path (already close to existing targets)
* **Go**: excellent for event workers and high-throughput queue consumers
* **Java**: enterprise tenants + JVM ecosystems
* **Rust**: perf/security critical edge services
* **PHP**: mostly for WordPress runtime (plugin side), but can also host lightweight APIs if needed

---

## 4) No-code orchestration: “Skill Multi-Target Translation” flow

Think of this as a FLOW that consumes an existing skill and outputs N target implementations:

1. **Inventory step (AF-2/AF-4):**
   Extract Canonical Skill Spec from the .NET/RN source (contracts, events, tests, UI model)

2. **Client target branch (per framework):**

   * For React/Vue/Angular: run `T363 UI Code Export` with `targetFramework` FREEDOM 
   * For WordPress:

     * plugin adapter output (settings page + blocks + bundle) ([WordPress Developer Resources][1])
     * theme adapter output (`theme.json`, template parts) ([WordPress Developer Resources][5])

3. **Server target branch (per language):**
   Run node-code generation with `targetLanguage` expanded beyond `.NET/Node/Python` 

4. **Judge + compliance:**
   Enforce DNA invariants for every output 

5. **Sandbox + E2E:**
   Run the same scenario suite against every language/framework output (the spec makes this possible)

6. **Register artifacts:**
   Stotry (already part of your export pipeline conceptually) 

---

## 5) What we need to add (minimal new surface area)

### Client: only new adapters (not new business logic)

* Add `wordpress_plugin` and `wordpress_theme` as new framework adapter targets (same pattern as React/Vue/Angular in `T363`) 
* Add packaging rules + security gate (“no secrets in export”; your export patterns already emphasize this idea) 

### Server: langemplates

* Extend `target language` options to Rust/Go/Java/PHP er-language MicroserviceBase SDKs that satisfy DNA behaviors 

---

## 6) Save state (so we can resume exactly from here)

**Current engine state for next numbering:** next flow starts at `F1075 / T389 / Template 83 /

```json
{
  "initiative": "Skill Multi-Target Translation",
  "source_skills": ["current:.NET", "current:ReactNative"],
  "targets": {
    "client": ["reactjs", "vue", "angular", "wordpress_plugin", "wordpress_t:contentReference[oaicite:30]{index=30}, "go", "java", "rust", "php"]
  },
  "reuse_anchors": {
    "ui_platform_resolution": "F641 (ui.platform -> react/a:contentReference[oaicite:31]{index=31}EDOM]",
    "ui_code_export": "T363 (React/Angular/Vue via FREEDOM) + framework adapter",
    "server_codegen": ":contentReference[oaicite:32]{index=32}ly .NET/Node/Python; extend list)",
    "dna_rules": "DNA-1..DNA-6 enfo:contentReference[oaicite:33]{index=33}vices"
  },
  "new_requirements_wordpress": {
    "plugin": ["Settings API", "Gutenberg block.json registration", "wp-scripts build"],
    "theme": ["theme.json global settings/styles",:contentReference[oaicite:34]{index=34}xt_artifacts_to_create": [
    "WordPress framework adapter (plugin + theme packaging targets)",
    "Language SDK stubs: MicroserviceBase-Go, MicroserviceBase-Java, MicroserviceBase-Rust, MicroserviceBase-PHP",
    "Golden test suite schema for cross-language verification",
    "Security gates: export has no secrets; WP REST auth strategy options"
  ],
  "proposed_start_numbers": {
    "factory": "F1075",
    "task_type": "T389",
    "template": "83",
    "bfa_rule": "CF-510",
    "stress_test": "ST-300",
    "skill": "SK-251"
  }
}
```

---

If you want, the next step is to define **one concrete “pilot skill”** (pick a simple one you already have) and run this translation flow on it first—because once the adapters + SDK stubs exist, every other skill becomes “multi-target by config”, not by reimplementation.

[1]: https://developer.wordpress.org/plugins/settings/using-settings-api/?utm_source=chatgpt.com "Using Settings API – Plugin Handbook"
[2]: https://developer.wordpress.org/block-editor/getting-started/fundamentals/registration-of-a-block/?utm_source=chatgpt.com "Registration of a block – Block Editor Handbook"
[3]: https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-wp-scripts/?utm_source=chatgpt.com "Get started with wp-scripts – Block Editor Handbook"
[4]: https://developer.wordpress.org/reference/classes/wp_rest_application_passwords_controller/?utm_source=chatgpt.com "class WP_REST_Application_Passwords_Controller {}"
[5]: https://developer.wordpress.org/themes/global-settings-and-styles/?utm_source=chatgpt.com "Global Settings and Styles (theme.json) – Theme Handbook"
[6]: https://developer.wordpress.org/themes/global-settings-and-styles/template-parts/?utm_source=chatgpt.com "Template Parts – Theme Handbook | Developer.WordPress.org"


Look please on how we made the xiigen skill library where any skill has it's alternatives, we will need something like that, first regular and then it will need to be part of the graph rag

([Past chat][1])([Past chat][2])([Past chat][3])([Past chat][3])

You’re right — **XIIGen already has “alternatives” baked into the skill format**, so we shouldn’t “invent a second system”. We should **extend the same pattern to client targets (React/Vue/Angular/WordPress plugin/theme)** and then **project it into Graph RAG**.

## 1) Proof: alternatives already exist in the skill library

In the current Skills Factory RAG doc, skills include explicit per-language variants (example: SK-69 includes Node/Python/Java/Rust/PHP variants). 

Also, the engine’s **IRagService** already lists **Graph** (and other) retrieval strategies as a first-class fabric capability. 

So the missing piece is not “alternatives exist” — it’s:

* **make client-side alternatives as first-class the same way**
* **make alternatives queryable / traversable in Graph RAG**

---

## 2) Make client alternatives mirror the existing “LANGUAGE VARIANTS” pattern

### What we keep (canonical)

Keep the skill’s “truth” as a **Canonical Skill Spec**:

* behavior + contracts
* tests (unit/e2e expectations)
* prompts (implementer + arbiter)
* fabrics used, factories used, task types referenced
* MACHINE/FREEDOM split and DNA compliance rules

### What we add (client alternatives)

Add a sibling block to “LANGUAGE VARIANTS” called something like:

**CLIENT VARIANTS**

* `reactjs`
* `vue`
* `angular`
* `wordpress_plugin`
* `wordpress_theme`

Each client variant must point to:

* **UI contract inputs/outputs** (still dictionary-first)
* **routing model** (pages/components/blocks)
* **build/test hooks**
* **integration contract** to server (API endpoints are resolved via DynamicController patterns, not hardcoded)
* **packaging** rules (esp. WP)

This matches the existing fabric-first rule that UI rendering is done via a platform resolver rather than importing frameworks inside core logic (see the UI fabric resolution skill pattern: “service code NEVER imports React/Angular/…; only IUIComponentFabricService”). 

### WordPress plugin/theme nuance (important)

Treat WP plugin/theme as **host targets**, not “just UI”:

* **wordpress_plugin**: admin pages + config + Gutenberg blocks (optionally) + API proxy to your backend services
* **wordpress_theme**: templates + theme.json + styling + optional block patterns, still delegating “logic” to canonical server APIs

Rule: **do not duplicate business logic** into WP. WP gets **presentation + configuration + safe API calls**.

---

## 3) Add a Graph RAG layer on top of the existing RAG index

You already have RAG (keywords/semantic) and a skill catalog. Graph RAG should add **structure**:

### Graph nodes

* **Skill** (canonical)
* **Variant** (client/server)
* **Target** (`reactjs`, `vue`, `angular`, `wordpress_plugin`, `wordpress_theme`, `node`, `go`, `java`, `rust`, `php`, etc.)
* **Factory**
* **Fabric**
* **TaskType**
* **Prompt** (implementer/judge/arbiter)
* **TestSpec**
* **Template/Scaffold**
* **SourceDoc**

### Graph edges (examples)

* `SKILL_HAS_VARIANT` (Skill → Variant)
* `VARIANT_TARGETS` (Variant → Target)
* `SKILL_DEPENDS_ON_SKILL` (reuse map)
* `SKILL_REFERENCED_BY_TASKTYPE`
* `VARIANT_USES_UI_FABRIC` / `VARIANT_USES_MICROSERVICE_SDK`
* `VARIANT_HAS_TESTSPEC`
* `VARIANT_HAS_TEMPLATE`
* `SKILL_USES_FABRIC` (DB/Queue/RAG/AI/etc.)

### Retrieval flow (hybrid + graph)

1. **Hybrid retrieve** candidate skills from text (existing AF-4 behavior).
2. **Graph expand** from the top skill nodes:

   * pick variants that match `target.client` + `target.server`
   * rank by maturity + test coverage + compliance flags
3. If exact variant missing:

   * return canonical skill + the adapter recipe (“generate this variant using adapter X, constraints Y”).

Because IRagService already includes a Graph strategy, this is a natural upgrade path rather than a new subsystem. 

---

## 4) No-code orchestration: “regular alternatives first → then graph-rag”

### Phase A — “Regular alternatives” (deterministic, file-based)

**Goal:** every skill has complete alternative descriptors (client + server) and a repeatable generation path.

1. **Normalize skills → Canonical Skill Spec**

   * ensure every skill has: contracts, tests, prompts, fabrics, dependencies, MACHINE/FREEDOM
2. **Attach “Variant descriptors”**

   * server variants: already present in many skills (Node/Python/Java/Rust/PHP) 
   * add client variants: React/Vue/Angular/WP plugin/WP theme
3. **Create per-target adapter rules**

   * UI adapter rules reference the UI fabric patterns (platform selected by config), not framework-specific imports in core logic 
4. **Conformance tests**

   * same canonical behavior validated across all variants (snapshot tests for UI models, contract tests for API interactions, smoke tests for WP packaging)

### Phase B — Graph RAG integration (discoverability + dependency-aware selection)

**Goal:** variants become *first-class retrieval objects*.

1. **Ingest skill specs + variant descriptors into the graph**
2. **Link edges** (skill↔variant↔targets, skill↔task types, skill↔dependencies)
3. **Update AF-4 retrieval**

   * first retrieve skills by meaning
   * then select the best variant by graph traversal using the requested target stack
4. **Store outcomes**

   * which variant was chosen
   * why (ranking explanation)
   * test results and promotion status

---

## 5) What changes for your immediate request (React Native/.NET → everything else)

* **Server side:** you already have the “language variants” pattern; extend it to include `go` explicitly and ensure each server language has a small “MicroserviceBase SDK equivalent” (DataProcessResult equivalent, factory resolution, tracing, config, tenancy).
* **Client side:** treat RN as just another UI target. Add:

  * `reactjs` as “web renderer”
  * `vue` and `angular` as renderers
  * `wordpress_plugin` and `wordpress_theme` as host targets (UI + config + safe API proxy)

---

# SAVE POINT

```
SAVE POINT: ALT+GRAPH_RAG:P1

CONFIRMED:
- XIIGen skills already include explicit language variants (Node/Python/Java/Rust/PHP) in-skill. 
- IRagService already supports Graph strategy as a first-class fabric capability.

DECISIONS:
- Keep Canonical Skill Spec as the only “truth”; alternatives are adapters.
- Add CLIENT VARIANTS to mirror LANGUAGE VARIANTS: reactjs, vue, angular, wordpress_plugin, wordpress_theme.
- Graph RAG schema will model Skill→Variant→Target and dependency edges for selection.

NEXT IMPLEMENTATION STEPS:
1) Define Variant Descriptor schema (client/server) and apply to 5–10 representative skills.
2) Add UI-fabric based client adapters (React/Vue/Angular/WP plugin/WP theme).
3) Ingest Skill + Variant descriptors into Graph and wire AF-4 retrieval: hybrid → graph select.
```

If you want, I can take **one concrete skill** (pick any from your library) and write the **exact canonical+variants spec** for it in the “XIIGen style” (including React/Vue/Angular/WP plugin/WP theme entries) and the **graph nodes/edges** that should be created for that skill.

[1]: # "prior working session (private link removed for public release)"
[2]: # "prior working session (private link removed for public release)"
[3]: # "prior working session (private link removed for public release)"


Cool — I’ll do it on **one concrete existing skill** and show:

1. **regular skill library entry** (with alternatives extended to *client stacks + WP plugin/theme*), and
2. the **Graph-RAG projection** (nodes/edges) so AF-4 can retrieve “skill → best variant” and expand dependencies.

I’ll use **SK-69** because it already demonstrates the “alternatives” pattern (full .NET implementation + language variants + agent prompt). 

---

## A) What SK-69 already has (baseline “alternatives”)

SK-69 already encodes the canonical behavior and its server-language alternatives:

* Pattern: **idempotency check → chain validation → create doc → outbox write → audit → store idempotency result** 
* **LANGUAGE VARIANTS**: Node/Python/Java/Rust/PHP 
* **AI Agent Implementation Prompt**: tells implementer exactly what to do and what not to do (DNA rules, no provider imports) 

So we’re not “adding alternatives” to XIIGen — we’re **extending the same SK-69 pattern** to include:

* **client alternatives** (React/Vue/Angular/WP plugin/theme)
* and a **Graph-RAG representation** of those alternatives.

---

## B) SK-69 “Extended Alternatives” (client + packaging + graph tags)

Below is the **delta** you would append to the SK-69 entry (same doc style, same principles, just more alternatives):

```txt
SKILL: SK-69
NAME: ERP Document Chain Step
TASK TYPES: T149
FACTORIES: F368, F370, F374, F376, F381
ARCHETYPE: STATEFUL_ORCHESTRATION

EXISTING PATTERN (UNCHANGED):
  - Idempotency FIRST (F374)
  - Chain integrity validation (F370 / CF-161)
  - Create document (F370)
  - Outbox write (F376) in same logical unit (DR-47)
  - Audit BEFORE return (F381)
  - Store idempotency result (F374)
  - Return DataProcessResult<Dictionary<string,object>>; never throw

LANGUAGE VARIANTS (UNCHANGED):
  Node.js / Python / Java / Rust / PHP

------------------------------------------------------------
NEW: CLIENT VARIANTS (ALTERNATIVES)
------------------------------------------------------------

CLIENT CONTRACT (CANONICAL):
  Endpoint: /api/dynamic/{tenantId}/erp/document-chain/step   (DynamicController routed)
  Method: POST
  Body (Dictionary):
    {
      "docType": "...",
      "parentDocId": "...",
      "payload": {...},              // Dictionary
      "idempotencyKey": "..."        // generated client-side (UUID) OR provided by caller
    }
  Response: DataProcessResult<Dictionary> { isSuccess, data, error }

CLIENT VARIANTS:
  ReactJS:
    - useErpDocumentChainStep() hook + <ErpDocumentChainStepForm />
    - Generates idempotencyKey per submit attempt (UUID v4)
    - Stores last successful result in local cache keyed by (tenantId + idempotencyKey)

  Vue:
    - composable useErpChainStep() + <ErpChainStepForm />
    - Same contract; uses reactive state + retry UI that reuses SAME idempotencyKey

  Angular:
    - ErpChainStepService + ErpChainStepComponent
    - HttpInterceptor injects tenantId header OR route param binding
    - Retry button MUST re-send SAME idempotencyKey (prevents duplicates)

  WordPress Plugin:
    - Provides:
      (1) wp-admin settings page: configure XIIGen API base URL + tenantId mapping (NO secrets stored)
      (2) Gutenberg block + shortcode: [xiigen_erp_chain_step_form]
    - Block renders a form; submits to XIIGen API endpoint above
    - Nonce used only for WP-side form submission; XIIGen auth handled by your normal gateway

  WordPress Theme:
    - Theme supplies template part + optional block pattern that embeds the same form UI
    - Theme must NOT store credentials; uses same plugin settings OR environment-level config
    - If theme-only: requires a minimal companion plugin for REST proxy + settings

------------------------------------------------------------
NEW: PACKAGING VARIANTS (ALTERNATIVES)
------------------------------------------------------------

PACKAGING:
  - npm package (React/Vue/Angular): publish as "@xiigen/erp-chain-step-ui"
  - WordPress plugin ZIP: "xiigen-erp-chain-step.zip"
  - Theme ZIP (optional): "xiigen-erp-theme-addon.zip" (tokens + template parts)

SECURITY NOTES (MACHINE):
  - No secrets in client bundles or WP options
  - tenantId always explicit; never infer from UI-only fields
  - idempotencyKey must be stable across retries

AF-4 KEYWORDS (EXTENDED):
  "erp document step ui", "document chain form", "idempotent submit", "outbox audit",
  "wordpress block", "gutenberg", "shortcode", "react vue angular client"

DEPENDENCY TAGS (for Graph expansion):
  depends_on: [F374, F376, F381, SK-73-style co-design]
  uses_fabrics: [DATABASE, QUEUE, CORE, AI(optional)]
```

Why this matches your engine DNA:

* The “**no direct platform imports**” principle exists on the **UI runtime** side (everything through UI fabric). In engine architecture, UI rendering is resolved via `"ui.platform"` config and must not import React/Angular directly. 
* For **code export**, the platform adapter idea is already formal in T363: output is React/Angular/Vue and the framework adapter resolves via config (not hardcoded). 
* For Graph-RAG strategies, your fabric catalog already includes **Graph** as a supported RAG strategy. 

---

## C) Graph-RAG projection for SK-69 (nodes + edges)

This is the concrete graph representation you can store so retrieval can do:
**Skill → choose best variant for requested targets → expand dependencies**.

I’m using the metadata discipline you already captured (lineage/governance/freshness etc.) as properties. 

```json
{
  "nodes": [
    {
      "id": "skill:SK-69",
      "type": "Skill",
      "name": "ERP Document Chain Step",
      "task_types": ["T149"],
      "archetype": "STATEFUL_ORCHESTRATION",
      "factories": ["F368", "F370", "F374", "F376", "F381"],
      "keywords": ["erp", "document chain", "idempotency", "outbox", "audit"],
      "status": "active",
      "version": "v1",
      "governance": { "tenant_scoped": true }
    },

    { "id": "variant:SK-69#server#dotnet", "type": "Variant", "variant_kind": "server", "target": "dotnet" },
    { "id": "variant:SK-69#server#node",   "type": "Variant", "variant_kind": "server", "target": "node" },
    { "id": "variant:SK-69#server#java",   "type": "Variant", "variant_kind": "server", "target": "java" },
    { "id": "variant:SK-69#server#rust",   "type": "Variant", "variant_kind": "server", "target": "rust" },
    { "id": "variant:SK-69#server#php",    "type": "Variant", "variant_kind": "server", "target": "php" },

    { "id": "variant:SK-69#client#reactjs",          "type": "Variant", "variant_kind": "client", "target": "reactjs" },
    { "id": "variant:SK-69#client#vue",              "type": "Variant", "variant_kind": "client", "target": "vue" },
    { "id": "variant:SK-69#client#angular",          "type": "Variant", "variant_kind": "client", "target": "angular" },
    { "id": "variant:SK-69#client#wordpress_plugin", "type": "Variant", "variant_kind": "client", "target": "wordpress_plugin" },
    { "id": "variant:SK-69#client#wordpress_theme",  "type": "Variant", "variant_kind": "client", "target": "wordpress_theme" },

    { "id": "dep:F374", "type": "Factory", "name": "Idempotency Service" },
    { "id": "dep:F376", "type": "Factory", "name": "Outbox Publisher" },
    { "id": "dep:F381", "type": "Factory", "name": "Audit Ledger" }
  ],
  "edges": [
    { "from": "skill:SK-69", "to": "variant:SK-69#server#dotnet", "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#server#node",   "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#server#java",   "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#server#rust",   "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#server#php",    "type": "HAS_VARIANT" },

    { "from": "skill:SK-69", "to": "variant:SK-69#client#reactjs",          "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#client#vue",              "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#client#angular",          "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#client#wordpress_plugin", "type": "HAS_VARIANT" },
    { "from": "skill:SK-69", "to": "variant:SK-69#client#wordpress_theme",  "type": "HAS_VARIANT" },

    { "from": "skill:SK-69", "to": "dep:F374", "type": "DEPENDS_ON" },
    { "from": "skill:SK-69", "to": "dep:F376", "type": "DEPENDS_ON" },
    { "from": "skill:SK-69", "to": "dep:F381", "type": "DEPENDS_ON" }
  ]
}
```

**Graph retrieval behavior (what changes once this exists):**

* User asks: “generate ERP chain step + Angular UI + Go service”
* Hybrid retrieval finds `SK-69` (keywords/semantic).
* Graph expansion selects:

  * `variant:SK-69#server#go` (if exists; otherwise falls back to node/dotnet),
  * `variant:SK-69#client#angular`,
  * plus dependencies `F374/F376/F381` automatically.

---

## D) No-code orchestration to build this (regular → graph)

1. **Regular library update (file-based)**

* Add the **CLIENT VARIANTS + PACKAGING VARIANTS** section into the SK markdown entry (as above).
* Add/extend AF-4 keywords (so classic RAG can still retrieve it).

2. **Graph ingestion**

* Parse skill docs → create node `skill:SK-69`
* Parse `LANGUAGE VARIANTS` + `CLIENT VARIANTS` → create variant nodes
* Parse `FACTORIES / depends_on` → create dependency edges
* Persist graph store + also keep vector/hybrid index.

3. **Runtime selection**

* Target constraints come from request context:

  * `target.client` ∈ {reactjs, vue, angular, wordpress_plugin, wordpress_theme}
  * `target.server` ∈ {dotnet, node, go, java, rust, php}
* Graph picks best match; if missing, routes to “generate new variant using adapter rules”.

---

## SAVE POINT (so we resume from here)

```
SAVE_POINT: SK-69_EXTENDED_VARIANTS_AND_GRAPH
WHAT_DONE:
  - Took existing SK-69 (already has LANGUAGE VARIANTS + agent prompt)
  - Added client alternatives (React/Vue/Angular/WP plugin/WP theme) + packaging alternatives
  - Defined concrete Graph-RAG nodes/edges representation for SK-69 and its variants
SOURCES_USED:
  - SK-69 canonical pattern + language variants + agent prompt :contentReference[oaicite:8]{index=8}
  - UI fabric platform resolution via config; no direct React/Angular imports :contentReference[oaicite:9]{index=9}
  - T363 export target frameworks and adapter-driven resolution :contentReference[oaicite:10]{index=10}
  - RAG fabric supports Graph strategy :contentReference[oaicite:11]{index=11}
NEXT:
  - Repeat this pattern for the “top 20 skills” you expect to translate most (RICE scoring),
    then ingest all into graph and update AF-4 to do hybrid→graph expansion.
```

If you tell me **which skill(s) you want next** (e.g., one of your .NET + React-Native “real” skills, not just SK-69), I’ll output the same “extended alternatives + graph nodes/edges” package for them too.
