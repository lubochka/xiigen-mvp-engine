# Translating XIIGen Skills Across Web Frameworks, WordPress, and Multi-Language Servers With Alternatives and GraphRAG

## Problem framing and success criteria

Your goal is not “porting code” from a .NET + React Native implementation into multiple new stacks. The scalable goal is **porting behavior** into a **canonical skill definition** and then producing multiple **equivalent alternatives** (variants) that satisfy the same contract and test suite—so that “target stack selection” becomes a deployment decision rather than a rewrite decision.

This approach aligns with how cross-language interoperability is typically achieved in distributed systems: define a single source of truth for API shapes and schema constraints (for example **OpenAPI 3.1** plus **JSON Schema 2020-12**), then generate or implement stubs/adapters in each target runtime while enforcing conformance through shared tests. OpenAPI 3.1 explicitly bases its data types on JSON Schema draft 2020-12 and defines its Schema Object dialect as a superset of JSON Schema draft 2020-12. citeturn3search0turn3search2

For event-driven skills, adopting a standard envelope such as **CloudEvents** provides a portable event contract across languages and transport bindings. The CloudEvents spec defines required context attributes (including `id`, `source`, `specversion`, and `type`) and the semantics around uniqueness (`source` + `id`). citeturn5search0turn5search2

Given your additional requirement—“look at how we made the XIIGen skill library with alternatives, and we need something like that; first regular and then part of the graph rag”—the core success criteria become:

- **One canonical skill identity** (semantic meaning, lifecycle, ownership).
- **Many alternatives** (client + server targets) that are verifiably equivalent and selectable by policy.
- **A deterministic “regular” library representation** (documents/records/artifacts + test results).
- **A GraphRAG projection** of that library that makes alternatives discoverable, traversable, and rankable via graph-aware retrieval.

## Canonical skill specification as the portability layer

A canonical skill spec must be expressive enough that you can implement it in .NET, Node, Go, Java, Rust, PHP—and also bind it to very different client surfaces (React/Vue/Angular web, WordPress plugin/theme packaging). In practice this means the canonical spec should be composed of multiple coordinated “contracts,” each with a clear authority and validation shape.

### Synchronous interface contract

For HTTP-style skills, OpenAPI 3.1 is a pragmatic canonical boundary because it is language-agnostic, widely supported by tooling, and its schema layer is aligned with JSON Schema draft 2020-12. citeturn3search0turn3search2

You get three things from using OpenAPI as the canonical boundary:

- A standardized description of endpoints, methods, parameters, and request/response bodies. citeturn3search0turn3search2
- A schema language for input/output types via the Schema Object dialect. citeturn3search0turn3search2
- A mature multi-language generation ecosystem for stubs/clients to reduce drift between implementations.

For the last point: **OpenAPI Generator** explicitly supports generating server stubs for Go, Java, NodeJS, PHP, and Rust (among many others), and client libraries for those ecosystems as well. citeturn4search0turn4search3

### Document/schema contract

Your DNA requirement (“Dictionary/Map documents”) maps naturally to JSON objects whose structure can still be validated and versioned via JSON Schema. The JSON Schema Validation vocabulary defines structural constraints and the definition of “valid against a schema.” citeturn3search1turn3search3

This matters because it gives you a language-neutral authority for:

- Required and optional fields
- Enumerations and pattern constraints
- Compatibility rules enforced in CI/before promotion

### Event contract

For asynchronous skills, CloudEvents provides a portable envelope. The CloudEvents specification defines required attributes, and also defines uniqueness expectations around `source` + `id`. citeturn5search0turn5search2

CloudEvents is also practical for your target-language matrix: the CloudEvents project tracks SDKs across Go, Java, JavaScript, PHP, and Rust, among others. citeturn6search1turn6search2

### Conformance suite as the enforcement mechanism

Canonical specs become operational only when they are enforced. For a “skill alternatives” library, the conformance suite is what makes alternatives safe to select automatically. A robust suite typically includes:

- **Schema validation** of fixtures against JSON Schema (structure-level invariants). citeturn3search1turn3search3
- **Contract tests** at the API boundary against the OpenAPI spec (endpoint parity). citeturn3search0turn4search0
- **Event validation** for CloudEvents contexts and routing correlation. citeturn5search0turn6search1

In XIIGen terms, this is the foundation that lets you keep your “canonical skill spec” stable while producing new client/server alternatives through adapters/codegen without cloning business logic.

## Alternatives in the skill library as a first-class object model

To mirror how you already treat “alternatives” in your existing skill library, the key is to formalize a two-level catalog:

- **Skill (canonical)**: meaning, contracts, tests, prompts, dependency graph, governance.
- **Alternative (variant)**: platform/language packaging + runtime integration that implements the canonical spec.

This structure is what makes “translation” mechanically simple:

1. Convert a .NET + React Native skill into canonical artifacts (OpenAPI/JSON Schema/CloudEvents + tests + UI intent model).
2. Emit N variants for the desired targets.
3. Register each emitted artifact as an alternative under the same canonical skill identity, with provenance and conformance evidence.

The minimum metadata that makes alternatives usable and rankable tends to cluster into:

- **Target identity**: `(client_target, server_target)` or separate axes, plus runtime constraints.
- **Conformance evidence**: pass/fail + coverage + versioned test suite id.
- **Operational maturity**: experimental/active/deprecated, plus SLA class.
- **Compatibility constraints**: required host environment (e.g., WordPress admin), required auth surface, required build toolchain.

The reason to be strict here is GraphRAG: once alternatives become graph nodes, missing metadata quickly becomes missing edges—and therefore missing retrieval and ranking signals.

## Client targets with emphasis on WordPress plugin and theme outputs

Your ReactJS/Vue/Angular targets are conceptually “renderer alternatives” for the same UI intent model. But **WordPress plugin/theme** targets are not simply renderer alternatives; they are “host packaging alternatives” with specific conventions, lifecycle hooks, and security rules.

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["WordPress plugin structure main file header comment example","WordPress Settings API admin settings page example","WordPress block.json Gutenberg block registration diagram","WordPress theme.json global styles diagram"] ,"num_per_query":1}

### Web framework alternatives: ReactJS, Vue, Angular

The portable strategy here is:

- Keep a **single UI intent model** (node tree + bindings + validation rules).
- Generate framework-specific output using adapters (React/Vue/Angular).
- Validate output with framework-level smoke tests plus canonical behavior tests (where applicable).

The most important architectural constraint is the one you already highlighted from your system: keep skill logic “platform-agnostic,” and treat UI platform selection as configuration rather than code forks.

### entity["organization","WordPress","open-source cms"] plugin alternative

A generated WordPress plugin alternative must satisfy WordPress’ packaging recognition and recommended extension patterns:

- **Plugin recognition**: WordPress identifies a plugin via a header comment in the main PHP file. The Plugin Name field is required, and there are documented standard header fields such as Version, Requires PHP, Text Domain, etc. citeturn0search1
- **Admin configuration**: WordPress’ Settings API provides standard functions such as `register_setting()`, `add_settings_section()`, and `add_settings_field()`, and WordPress documentation notes that these should be called from an `admin_init` hook. citeturn0search2turn0search3turn0search0
- **Content/editor surface**: blocks are commonly registered using `block.json` metadata, and WordPress explicitly recommends registering blocks on both server and client—because server-side registration enables features such as dynamic rendering, block supports, style variations, and interoperability with `theme.json` styling. citeturn2search0turn0search5
- **Build pipeline**: `@wordpress/scripts` (“wp-scripts”) standardizes the build step and produces artifacts including `build/index.js` and a `build/index.asset.php` dependency/version file that WordPress can use for proper enqueuing and cache-busting. citeturn2search2

If your plugin alternative includes a REST integration surface (often necessary when WordPress is a host UI that calls XIIGen services), WordPress’ REST extension mechanism is well defined:

- Custom routes are registered using `register_rest_route()` on the `rest_api_init` hook. citeturn2search1
- WordPress Core has explicitly warned that omitting `permission_callback` can unintentionally make endpoints public; a `_doing_it_wrong` notice was added and public endpoints should explicitly set permission callbacks (such as `__return_true`) only when intended. citeturn0search6

These WordPress requirements define what a “plugin alternative adapter” must generate: plugin metadata, admin settings wiring, block registration stubs, build pipeline scaffolding, and REST integration with explicit permission design.

### WordPress theme alternative

A WordPress theme alternative is distinct from a plugin in both purpose and artifact shape:

- WordPress treats `theme.json` as a standard configuration file it looks for in a theme; it is how themes configure settings and styles and can also register templates and template parts. citeturn1search0turn1search1
- The Theme Handbook documents standard folders such as `templates/` (templates) and `parts/` (template parts), and explains that template parts must be placed directly within `/parts` (and that nested template parts are not supported). citeturn1search2turn1search5

For XIIGen, this means a WordPress theme alternative should be treated as:

- A **design token/style projection** into `theme.json` (`settings`, `styles`, presets, CSS custom properties).
- A **layout projection** into templates and template parts.

This is your own “alternative” pattern applied to packaging: the canonical UI intent model stays the same, but the target output is “theme artifacts” rather than “SPA code export.”

## Server targets via MicroserviceBase-compatible runtimes and generated boundaries

The big risk in expanding from .NET/Node into Go/Java/Rust/PHP is behavioral drift: each language team reinterprets routing, error envelopes, tenancy, and event semantics slightly differently. The practical mitigation is to make **the runtime contract and boundary artifacts non-negotiable**:

- The canonical boundary artifacts are OpenAPI + JSON Schema + CloudEvents. citeturn3search0turn3search1turn5search0
- The per-language runtime must implement the same “MicroserviceBase semantics” (in your words) so that the generated code is thin and predictable.

OpenAPI Generator is useful here because it can generate server stubs across your target set (Go net/http/Gin/Echo, Java Spring/JAX-RS, NodeJS, PHP frameworks, Rust server templates) and therefore reduce divergence at the edge. citeturn4search0turn4search3

CloudEvents is similarly useful for cross-language event parity because official SDKs exist across the languages you listed (Go, Java, JavaScript, PHP, Rust, etc.), which reduces the chance of subtle envelope mis-serialization. citeturn6search1turn6search2turn6search0turn5search8turn5search9

The key “deep research” point is that your translation pipeline will be dramatically simpler if it enforces two boundaries:

- **Generated boundary**: OpenAPI stubs + schema validators + event envelope adapter.
- **Stable internal abstractions**: your Fabric interfaces (DB/Queue/RAG/etc.) and your result envelope/tenancy/routing rules.

Everything else becomes per-language implementation detail—but always behind the same internal contract.

## Projecting the alternatives library into GraphRAG for discovery and selection

Your “regular alternatives library” is how you ensure determinism. Your GraphRAG layer is how you ensure **discoverability and reasoning**: “What alternatives exist?”, “Which one should I use for WordPress + Go?”, “Which skills lack a WordPress theme alternative?”, “Which variants are production-ready?”

GraphRAG’s research framing is directly relevant: it is designed to answer both “local” questions grounded in specific entities and “global” questions that require summarizing patterns across an entire corpus. citeturn7search1turn7search3

image_group{"layout":"carousel","aspect_ratio":"16:9","query":["GraphRAG local search entity based reasoning flowchart","GraphRAG global search map reduce community reports diagram","knowledge graph software catalog skills variants visualization","community detection hierarchy graph rag illustration"] ,"num_per_query":1}

### What GraphRAG adds beyond standard RAG

GraphRAG’s published method builds an entity knowledge graph and then pre-generates “community” summaries; at query time it can answer by composing partial responses from community summaries and then summarizing again into a final answer (map-reduce style). citeturn7search1turn7search3turn7search2

GraphRAG’s own docs distinguish:

- **Local search**: entity-based reasoning combining structured graph data with unstructured text units, particularly well suited when the query is about specific entities. citeturn7search4
- **Global search**: uses LLM-generated community reports at a specified level of a community hierarchy and produces answers via a map-reduce process; selecting the community level affects thoroughness and cost/latency. citeturn7search2

Microsoft Research also describes improving global search by dynamically selecting relevant communities before map-reduce summarization, pruning irrelevant reports earlier and reducing cost while keeping quality comparable in their experiments. citeturn7search0

### Graph schema recommendation for “Skill with Alternatives”

To make “alternatives” first-class in GraphRAG, the graph must encode them as nodes and edges—not as text-only descriptions. A pragmatic schema is:

- Nodes: `Skill`, `Variant`, `Target`, `Contract` (OpenAPI/Schema/Event types), `TestSuite`, `Artifact`, `Prompt`, `Fabric/Dependency`.
- Edges:
  - `Skill HAS_VARIANT Variant`
  - `Variant TARGETS Target`
  - `Skill DEFINED_BY Contract`
  - `Variant VALIDATED_BY TestSuite`
  - `Variant PACKAGED_AS Artifact`
  - `Skill DEPENDS_ON Skill` (reuse)
  - `Variant USES Fabric` (DB/Queue/RAG/etc.)

This schema supports both local and global retrieval patterns:

- Local search: “Find the WordPress plugin alternative for Skill X” becomes “entity = Skill X → traverse `HAS_VARIANT` → filter `TARGETS=wordpress_plugin` → rank by conformance+maturity.” citeturn7search4
- Global search: “Which capabilities lack a Rust server variant?” becomes “community summaries over (Skill ↔ Variant ↔ Target) subgraphs,” enabling map-reduce summarization across the corpus. citeturn7search2turn7search1

### Implementation pattern: regular first, then graph projection

A robust rollout pattern that matches your request:

- **Regular library** (system of record): canonical skill specs, variants, artifacts, test results.
- **Graph projection** (derived): ingest the regular library into a graph index, generate community reports for clusters like “WordPress plugin variants” or “Rust server variants,” then enable GraphRAG local/global queries over that graph. citeturn7search1turn7search2turn7search4

This separation matters because GraphRAG works best when the data is already internally consistent; if “alternatives” are only implied in text, the graph will be noisy and ranking will be unreliable.

## Practical integration roadmap with WordPress-focused gates

A deep-research-based roadmap that avoids business-logic duplication while meeting WordPress packaging rules and GraphRAG discoverability looks like this:

Start by defining the canonical spec layer for one pilot skill:
- OpenAPI boundary (3.1), using JSON Schema 2020-12 compatible modeling where possible. citeturn3search0turn3search2
- JSON Schema validation for payload documents. citeturn3search1turn3search3
- CloudEvents types if the skill emits/consumes events; enforce required attributes and uniqueness semantics. citeturn5search0turn6search1

Then implement “variant adapters” in two categories:

Client adapters:
- Web (React/Vue/Angular): emit framework code from the same UI intent model.
- WordPress plugin: generate plugin header + Settings API wiring + block.json registration scaffolding + wp-scripts build scaffolding. citeturn0search1turn0search2turn2search0turn2search2
- WordPress theme: generate `theme.json` + templates + template parts. citeturn1search0turn1search2turn1search5

Server adapters:
- Use OpenAPI Generator (or equivalent templating) to generate the boundary for Go/Java/Node/PHP/Rust and then implement your MicroserviceBase semantics behind it. citeturn4search0turn4search3
- Use CloudEvents SDKs where relevant to ensure envelope consistency across languages. citeturn6search1turn6search0turn5search8turn5search9

Finally, promote into GraphRAG:
- Ingest canonical skill docs + variant descriptors + artifacts into the graph.
- Precompute community summaries for clusters such as “WordPress plugin skills” or “Rust server skills,” enabling both local and global retrieval patterns. citeturn7search1turn7search2turn7search4
- Consider dynamic community selection for global queries to reduce cost by pruning irrelevant communities before map-reduce summarization, as Microsoft Research describes. citeturn7search0

Security and governance gates specifically required for WordPress variants:
- Enforce explicit REST API access control with `permission_callback` always set; WordPress has documented the risk of unintentionally public endpoints when permission callbacks are omitted. citeturn0search6turn2search1
- Ensure plugin configuration uses Settings API and capability checks where appropriate (WordPress notes Settings API forms post to `options.php` with strict capability checks such as `manage_options`). citeturn0search0turn0search3

This roadmap satisfies your “clean translation” requirement: preserve one canonical skill identity and behavior, express alternatives as first-class variants with strong conformance evidence, and then make those alternatives graph-queryable through GraphRAG’s local/global mechanisms. citeturn7search1turn7search4turn7search2