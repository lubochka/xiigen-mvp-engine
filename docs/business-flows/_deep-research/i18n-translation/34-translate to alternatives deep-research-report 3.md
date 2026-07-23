# Translating XIIGen Skills Across Client Frameworks, WordPress, and Multi-Language Servers Using Alternatives and GraphRAG

## Context and target state

You are already on the correct conceptual path: “translation” should not mean rewriting skill logic per stack. It should mean **preserving a single behavioral truth** (contract + tests + prompts + invariants) and generating **target adapters** that satisfy that truth across:

- Client: ReactJS, Vue, Angular, WordPress plugin, WordPress theme  
- Server: Rust, PHP, Java, Node, Go

This is the same scaling mechanism that shows up repeatedly in interoperability-heavy production systems: define portable interfaces and portable validation rules (schemas and test vectors), then vary only the “outer skin” (framework runtime + packaging) per target. OpenAPI 3.1 explicitly puts its schema layer on top of JSON Schema 2020‑12 (Schema Object is a superset of JSON Schema draft 2020‑12), which is a key enabler when you want “one spec → many languages.” citeturn4search2

For event-driven skills, CloudEvents provides a strongly portable event envelope and defines required context attributes and a clear uniqueness contract (`source` + `id`). citeturn4search4

For your “alternatives-first” requirement (library first, graph later), the design objective is:

- Every **Skill** has one canonical “truth” and multiple **Alternatives**
- Alternatives are selectable by deployment policy and gated by conformance evidence
- GraphRAG becomes the discoverability + reasoning layer over that structured library (local, global, and hybrid selection)

## Canonical skill specification and conformance model

A canonical spec needs to represent three surfaces consistently across .NET/Node/Go/Java/Rust/PHP and across React/Vue/Angular and WordPress packaging:

### API contract surface

Use an OpenAPI 3.1 document as the canonical contract for callable endpoints (even if your internal signature is dictionary/map-based). OpenAPI 3.1’s Schema Object is designed to align with JSON Schema 2020‑12 semantics, and the dialect identifier is explicitly defined by the spec. citeturn4search2

This matters because you can generate predictable stubs and clients and keep boundary drift low across ecosystems. The canonical contract becomes the “anchor” for multiple alternatives.

### Document validity surface

Use JSON Schema as the canonical shape validator for “dictionary/map documents.” The JSON Schema project explicitly states that 2020‑12 is the current version and that the specification is split into Core and Validation documents. citeturn4search0  
The Validation vocabulary specification defines validation as constraints over instance structure and uses a standardized notion of an instance being “valid against” a schema. citeturn4search1

This enables one set of golden fixtures to be reused across alternatives—especially useful when your internal DNA requires “map everywhere” while still enforcing structure and versioning discipline.

### Event validity surface

When skills publish/consume events, use CloudEvents as the canonical envelope:

- CloudEvents requires attributes like `id` and `source` (among others) and states that producers must ensure `source` + `id` is unique for each distinct event; consumers may treat identical pairs as duplicates. citeturn4search4  
- CloudEvents also maintains language SDKs across the languages you listed (Go, Java, JavaScript, PHP, Rust, and .NET among others), which reduces the chance of each alternative “inventing” an envelope variant. citeturn7search7

### Conformance evidence as the “alternative gate”

To make “alternatives” safe and automatable, each alternative should carry versioned evidence:

- OpenAPI-level contract tests (endpoint + payload compliance) citeturn4search2  
- JSON Schema fixture validation for I/O documents citeturn4search1  
- CloudEvents envelope validation and idempotency/deduplication expectations where applicable citeturn4search4  

This is what lets you avoid cloning logic: the canonical spec + fixtures define the behavior; alternatives implement and prove it.

## Client alternatives including WordPress plugin and theme

For ReactJS/Vue/Angular, your “platform resolved by config” model (as you described for XIIGen) naturally expresses these as **presentation alternatives** over the same UI intent model.

WordPress plugin/theme is different: it is not just “another UI framework.” It is primarily a **packaging + lifecycle + security model** with its own conventions. The clean way to integrate WordPress into your alternatives catalog is to treat it as **two separate client targets** that share UI intent but differ in artifact shape and responsibilities:

- `wordpress_plugin`: behaviors + admin configuration + block(s)/shortcodes/widgets
- `wordpress_theme`: templates + template parts + styling tokens via `theme.json`

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["WordPress plugin header comment Plugin Name required example","WordPress Settings API register_setting add_settings_section admin_init example","WordPress block.json metadata register block type both PHP and JavaScript","WordPress theme.json global settings and styles templates parts folders example"],"num_per_query":1}

### WordPress plugin alternative

A WordPress plugin is recognized by its header comment in the main PHP file, and the minimum required field is “Plugin Name.” citeturn0search2  
This is a concrete packaging requirement your generator must satisfy for a `wordpress_plugin` alternative to be installable and recognizable.

For configuration, WordPress’ Settings API provides standard primitives (`register_setting`, `add_settings_section`, `add_settings_field`) and WordPress documentation recommends calling these from the `admin_init` hook. citeturn0search0turn0search1  
The Settings API documentation also notes a key operational security property: settings forms post to `wp-admin/options.php` with strict capability checks, and users typically need `manage_options` to submit the form. citeturn0search1turn0search4

For editor-facing UI, modern WordPress favors blocks (Gutenberg). WordPress recommends `block.json` as the canonical way to register block types with both PHP (server-side) and JavaScript (client-side), and it ties this to the WordPress 5.8+ era. citeturn2search1  
The platform also provides built-in registration functions—`register_block_type_from_metadata()` explicitly registers a block type from metadata stored in `block.json`. citeturn2search0

For build + bundling, WordPress documents `@wordpress/scripts` (“wp-scripts”) as a standardized approach. It produces `build/index.js` and also generates a `build/index.asset.php` file containing dependencies and a version for cache busting. citeturn3search3  
This is especially relevant to code export: a WordPress plugin alternative should ship as a ZIP containing the PHP shell, the `block.json`, and the built JS output with the asset manifest.

A particularly strong advantage of `block.json` in your “skill alternative” world is that it supports cross-language processing: WordPress notes `block.json` allows code sharing in processing block types stored as JSON, and that blocks registered via `block.json` can have optimized asset enqueuing (only loaded when the block is present). citeturn8search6turn2search1  
It also notes ecosystem implications: the WordPress Plugins Directory can detect `block.json` files and extract their metadata. citeturn8search6

If your plugin exposes REST endpoints (for proxying calls into XIIGen services or for creating a tenant-aware integration surface), WordPress recommends registering custom REST routes through `register_rest_route()` and calling it on the `rest_api_init` hook. citeturn2search2turn3search1  
Crucially, WordPress 5.5 added a warning when `permission_callback` is omitted; routes without it are treated as public, and WordPress notes that mistakes here have “catastrophic” consequences. citeturn3search0turn3search1  
So, in your generator, `permission_callback` should be treated as mandatory and generated from your canonical security policy (e.g., capability checks, tenant restrictions, or explicitly public endpoints).

For authentication strategy when WordPress needs to call APIs, WordPress core includes REST controllers for Application Passwords (e.g., `WP_REST_Application_Passwords_Controller`) and documents it as the core class to access a user’s app passwords via the REST API. citeturn1search0  
This doesn’t mean you should rely on it for every scenario, but it should be mapped as one of the supported auth modes in your WordPress plugin alternative profile.

### WordPress theme alternative

A theme alternative is anchored around WordPress’ theme structure and `theme.json`.

WordPress describes `theme.json` as a standard file WordPress looks for, and it is used to configure settings and styles and to register templates and template parts. citeturn0search5  
A block theme has a defined expected structure, including `templates/` and `parts/`, and WordPress identifies required files for a block theme such as `style.css` and `templates/index.html`. citeturn8search0

Template parts have strict placement rules: WordPress states template parts must be in the theme’s `/parts` folder and that nested template parts are not currently supported. citeturn8search1  
Templates are expected under `/templates`, with `index.html` as the fallback template in block themes. citeturn8search2turn8search0

These constraints imply a clean separation in your XIIGen alternatives model:

- Theme alternative primarily contains **design tokens, templates, template parts, and patterns** emitted from your UI intent model and token system into `theme.json` and `/templates` + `/parts`. citeturn0search5turn8search0turn8search1  
- Plugin alternative contains **configuration UI + blocks + integration plumbing** (including REST routes, if needed). citeturn0search1turn2search1turn2search2  

## Server alternatives across Rust, Go, Java, Node, and PHP

On the server side, your “MicroserviceBase semantics” and “DynamicController-style routing” (as you described) represent **non-negotiable invariants** that should be implemented once per language via a small runtime SDK and then reused by code generation.

A pragmatic architecture is “generated boundaries, stable internal SDKs”:

### Generated boundary layer

OpenAPI-based generation is a proven mechanism for keeping server alternatives consistent at the edge. The official OpenAPI Generator project supports generation of API client libraries and server stubs from OpenAPI specs. citeturn5search0  
Its published supported output list includes server stub generators for Go, Java, NodeJS, PHP, and Rust (“rust-server”), aligning directly with your target set. citeturn5search0  

(First mention entity) entity["company","GitHub","code hosting platform"] is where OpenAPI Generator is maintained and distributed, which is operationally relevant for tracking generator versioning and provenance in your artifacts. citeturn5search0

### Stable per-language MicroserviceBase SDK layer

Your per-language SDK should standardize the behaviors that must not diverge across alternatives:

- Result envelope semantics (your `DataProcessResult<T>` equivalent)
- Tenant context propagation into storage, queues, caches, and RAG calls
- Dynamic routing/controller mechanics
- Trace context propagation

The cross-language tracing/propagation part is important because once you have multiple server languages, correlation breaks quickly if each runtime chooses different propagation defaults. OpenTelemetry’s documentation explains that context propagation allows traces/metrics/logs to be correlated across service boundaries and that the default propagator uses W3C TraceContext headers. citeturn7search1  
The OpenTelemetry propagators API specification explicitly calls out W3C TraceContext and W3C Baggage as official propagators that must be maintained and distributed, and it requires parsing and validating `traceparent` and `tracestate` headers according to W3C Trace Context Level 2 requirements. citeturn7search0  
The entity["organization","World Wide Web Consortium","web standards body"] Trace Context specification defines details about `tracestate` behavior and its relationship to `traceparent`. citeturn7search6

This gives you a standards-backed target: each generated server alternative should be required to propagate trace context consistently, regardless of language. citeturn7search0turn7search1turn7search6

### Events and asynchronous processing

For event-driven skills, using CloudEvents plus SDKs in each target language reduces envelope drift and makes your canonical “event contract” reliably enforceable. CloudEvents explicitly requires certain attributes and defines uniqueness behavior for `source` + `id`. citeturn4search4  
The CloudEvents spec repository also lists language SDKs including Go, Java, JavaScript, PHP, and Rust, matching your server target set. citeturn7search7  

(First mention entity) entity["organization","Cloud Native Computing Foundation","cloud native foundation"] hosts CloudEvents as one of its ecosystem projects, which reinforces it as a stable interoperability anchor for a multi-language runtime set. citeturn7search7turn4search4

## Skill library alternatives schema and selection governance

Your operational requirement is “the skill library is already alternatives-aware.” The deep-research upgrade is to make client alternatives and WordPress packaging alternatives first-class in the same pattern as server language variants, and to ensure each alternative has enough metadata to be:

- generated deterministically
- validated consistently
- selected automatically

A minimal “library-first” schema that works well in practice has three layers:

### Canonical skill record

A canonical record should include:

- Contract pointers: OpenAPI doc id, JSON Schema ids, CloudEvents type ids citeturn4search2turn4search1turn4search4  
- Test suite pointers: golden fixtures, e2e scenarios, negative tests (schema failures)
- Prompt pointers: implementer/judge prompts (your AF pipeline)
- Invariants flags: “dictionary/map I/O,” tenant-scoped, envelope required

### Alternative records

Each alternative should be an explicit entry, not an implied attribute. Suggested shape:

- `kind`: `client` | `server`
- `target`: e.g., `reactjs`, `vue`, `angular`, `wordpress_plugin`, `wordpress_theme`, `go`, `java`, `rust`, `node`, `php`
- `artifact`: how it ships (npm package, zip, container image, etc.)
- `build_profile`: toolchain constraints (wp-scripts for WordPress plugin bundles) citeturn3search3  
- `security_profile`: auth modes, capability requirements, REST permissions callback policy for WordPress routes citeturn3search0turn3search1turn0search1  
- `conformance`: test suite run ids + coverage + pass/fail status

### Selection policy

Selection is where “alternatives” become valuable. For example, a policy can prioritize:

- exact match (client=wordpress_plugin AND server=go)
- maturity level
- conformance evidence recency
- packaging fit (theme vs plugin constraints)

For WordPress specifically, your selection policy also needs to encode the “theme vs plugin” boundary:

- A theme alternative must respect `theme.json` and file-structure rules (`templates/`, `parts/`). citeturn8search0turn8search1turn0search5  
- A plugin alternative must respect plugin header requirements, admin settings patterns, and block registration/build output patterns. citeturn0search2turn0search1turn2search1turn3search3  

Here is an example of a compact “alternative descriptor” that is designed to fit both regular library indexing and future graph ingestion (illustrative only):

```json
{
  "skill_id": "SK-251",
  "canonical": {
    "openapi_ref": "openapi:sk-251@v1",
    "schemas": ["schema:sk-251/input@v1", "schema:sk-251/output@v1"],
    "cloudevents_types": ["ce:sk-251.executed@v1"]
  },
  "alternatives": [
    {
      "alt_id": "SK-251#client#wordpress_plugin",
      "kind": "client",
      "target": "wordpress_plugin",
      "artifact": { "type": "zip", "name": "sk-251-wp-plugin.zip" },
      "build_profile": { "js_build": "wp-scripts", "block_metadata": "block.json" },
      "security_profile": { "rest_permission_callback_required": true }
    },
    {
      "alt_id": "SK-251#server#go",
      "kind": "server",
      "target": "go",
      "artifact": { "type": "container", "image": "registry/skill/sk-251:go-v1" },
      "runtime_profile": { "tracing": "w3c_tracecontext", "events": "cloudevents" }
    }
  ]
}
```

The value of this schema is that it is immediately usable for “regular” library routing and export, and it becomes trivially projectable into a graph (skills → alternatives → targets → artifacts → tests).

## GraphRAG projection and retrieval operations

GraphRAG is best used here as the *reasoning layer over a structured alternatives catalog*, not as the source of truth itself. citeturn6search1

(First mention entity) entity["organization","Microsoft Research","research division of microsoft"] defines GraphRAG as a technique that combines extraction, network analysis, and LLM prompting/summarization into an end-to-end system for understanding text datasets. citeturn6search1  

### Why GraphRAG helps specifically with alternatives

Your alternatives problem is not purely semantic retrieval (“find me skills about ERP”). It is also structural selection (“find the best alternative for WordPress plugin + Go and expand dependencies”). GraphRAG’s local search is explicitly entity-driven: it identifies entities as access points into the knowledge graph and then gathers connected entities, relationships, and related text chunks to fit a context window. citeturn5search3  
This matches the “skill → alternative → target → artifact → dependencies” traversal you want.

Global questions also matter at platform scale (for product planning and coverage auditing). GraphRAG’s global search is designed for “whole dataset reasoning” and uses LLM-generated community reports from a selected level of the community hierarchy, producing an answer map-reduce style. citeturn6search0  
This enables questions like: “Which skills have WordPress plugin alternatives but no WordPress theme alternative?” or “Where are we missing Rust server variants?” based on the overall graph.

Microsoft Research also describes dynamic community selection as a way to prune irrelevant communities early in global search by rating community-report relevance top-down before the map-reduce stage, improving efficiency and allowing variable abstraction depth. citeturn5search1turn6search4

### Recommended graph schema for skills with alternatives

To make GraphRAG actually operational for your use case, the graph needs explicit nodes and edges that represent alternatives:

- Nodes: `Skill`, `Alternative`, `Target`, `Contract`, `Schema`, `EventType`, `Artifact`, `TestRun`, `Factory/Fabric` (from your internal constructs)
- Edges:
  - `Skill HAS_ALTERNATIVE Alternative`
  - `Alternative TARGETS Target`
  - `Skill DEFINED_BY Contract/Schema/EventType`
  - `Alternative PACKAGED_AS Artifact`
  - `Alternative VERIFIED_BY TestRun`
  - `Skill DEPENDS_ON Skill/Factory/Fabric`

This schema supports two decisive retrieval operations:

- “Select best alternative”: traverse `HAS_ALTERNATIVE` with constraint filters on `TARGETS`, then rank by maturity and test evidence. citeturn5search3  
- “Expand dependency closure”: traverse `DEPENDS_ON` and include the required supporting skills/factories in the context window (local search pattern). citeturn5search3  

It also supports global coverage reporting via community summaries. citeturn6search0turn5search1

## Implementation sequence and risk controls

A pragmatic rollout that aligns with “regular first, graph later” is:

### Regular alternatives completion

Start by ensuring every skill has a canonical contract and tests that are language-agnostic and portable:

- OpenAPI 3.1 contract and aligned schema modeling citeturn4search2  
- JSON Schema validation for all dictionary/map documents citeturn4search1turn4search0  
- CloudEvents types for eventing skills citeturn4search4turn7search7  

Then define alternatives, including explicit WordPress plugin/theme outputs:

- Plugin: must include plugin header with Plugin Name citeturn0search2  
- Plugin config: Settings API via `admin_init`, plus capability constraints citeturn0search0turn0search1  
- Blocks: `block.json` as canonical registration; server registration recommended; `register_block_type_from_metadata` usage supported citeturn2search1turn2search0  
- Build: `wp-scripts` standardizes build, produces `build/index.js` + `index.asset.php` citeturn3search3  
- REST routes: `register_rest_route` on `rest_api_init`; require `permission_callback` due to 5.5+ behavior/warnings citeturn2search2turn3search1turn3search0  
- Theme: `theme.json` + `/templates` + `/parts`, respecting placement and non-nesting rules citeturn0search5turn8search0turn8search1  

### Runtime SDKs for server languages

Implement the minimum MicroserviceBase SDK per language and enforce uniform tracing propagation:

- Use W3C TraceContext (`traceparent`, `tracestate`) and propagate via OpenTelemetry propagators for consistent cross-language tracing. citeturn7search0turn7search1turn7search6  

This is not just observability—it is also a practical debugging and regression requirement once multiple implementations exist.

### GraphRAG projection and retrieval

After the regular library is stable and alternatives have conformance evidence, ingest the structured catalog into GraphRAG:

- Use local search for target-specific selection and dependency expansion. citeturn5search3  
- Use global search (with optional dynamic community selection) for portfolio-level coverage and gap analysis. citeturn6search0turn5search1  

### Key risks and mitigations

The main failure modes in multi-target alternatives systems are well-known:

- **Boundary drift** (API shapes diverge across languages): mitigate with OpenAPI 3.1 contract anchoring and generated stubs. citeturn4search2turn5search0  
- **Schema drift** (dictionary/map becomes “anything goes”): mitigate with JSON Schema validation gates and golden fixtures. citeturn4search1turn4search0  
- **Event drift** (duplicate semantics, envelope mismatches): mitigate by enforcing CloudEvents required attributes and SDK use across languages. citeturn4search4turn7search7  
- **WordPress security pitfalls** (accidentally public REST endpoints): mitigate by generating `permission_callback` on every route and treating omission as a build-breaking error (WordPress 5.5+). citeturn3search0turn3search1  

(First mention entity) entity["organization","OpenAPI Initiative","openapi governance group"] is the governance home for the OpenAPI specification line, and aligning your canonical contract with OpenAPI 3.1 gives you a stable, versionable anchor for multi-language generation. citeturn4search2  

(First mention entity) entity["organization","OpenTelemetry","cncf observability project"] provides standardized context propagation concepts and APIs, making it a practical cross-language invariant for your multi-runtime server alternatives. citeturn7search1turn7search0