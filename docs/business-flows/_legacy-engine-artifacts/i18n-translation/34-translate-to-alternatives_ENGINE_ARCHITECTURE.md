# FLOW-34 ENGINE ARCHITECTURE — Skill Multi-Target Translation
## Factories F631–F685 | Families 84–93

> All factories resolve through existing fabric interfaces.
> Service code NEVER imports a specific provider (no 'pg', no 'redis', no 'openai').
> All use CreateAsync(FactoryResolutionContext) with config-first routing.

---

## FAMILY 84 — CANONICAL SKILL STORE & SPEC MANAGEMENT (F631–F637)

**Purpose:** Store, retrieve, and version Canonical Skill Specs — the language-neutral behavioral contracts that are the single source of truth for every skill family.

**Fabric Resolution:** DATABASE FABRIC (Skill 05 — IDatabaseService → Elasticsearch primary)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F631 | ICanonicalSkillSpecService | DATABASE FABRIC (ES) | Store/retrieve canonical skill specs as dynamic documents |
| F632 | ISkillFamilyRegistryService | DATABASE FABRIC (ES) | Register skill families; maintain family → variant membership |
| F633 | ISkillSpecVersioningService | DATABASE FABRIC (ES) | Version canonical specs; backward compatibility checks |
| F634 | ISkillContractValidatorService | AI ENGINE FABRIC (Skill 07) | Validate that OpenAPI + JSON Schema + CloudEvents match behavior description |
| F635 | ISkillMetadataIndexService | DATABASE FABRIC (ES) | Index skill keywords, AF-4 retrieval tags, dependency tags |
| F636 | ISkillGoldenTestStoreService | DATABASE FABRIC (ES) | Store canonical golden input/output test vectors per family |
| F637 | ISkillLineageTrackerService | DATABASE FABRIC (ES) | Track which source skill generated which canonical spec (source → canon) |

**DNA Compliance:**
- All documents stored as `Dictionary<string,object>` via ParseDocument (DNA-1)
- BuildSearchFilter skips empty fields on all queries (DNA-2)
- All methods return `DataProcessResult<T>` (DNA-3)
- All services extend MicroserviceBase (DNA-4)
- tenantId on every store/search operation (DNA-5)
- DynamicController routing via `/api/dynamic/{tenantId}/canonical-skill/{action}` (DNA-6)

---

## FAMILY 85 — VARIANT REGISTRY & SELECTION ENGINE (F638–F644)

**Purpose:** Maintain the registry of all skill variants (per family), enable config-driven selection of the best variant for a given target stack.

**Fabric Resolution:** DATABASE FABRIC (ES) for registry; QUEUE FABRIC for selection events

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F638 | IVariantRegistryService | DATABASE FABRIC (ES) | Register variants; store variant descriptor (target, maturity, test status) |
| F639 | IVariantSelectorService | DATABASE FABRIC (ES) + AI ENGINE FABRIC | Select best variant given targetClient + targetServer from FREEDOM config |
| F640 | IVariantMaturityService | DATABASE FABRIC (ES) | Track variant maturity: GENERATED→INJECTED→MINIMAL→CORE per variant |
| F641 | IVariantDependencyService | DATABASE FABRIC (ES) | Track variant-level factory/skill/fabric dependencies |
| F642 | IVariantConformanceStatusService | DATABASE FABRIC (ES) | Store conformance test outcomes per variant (pass/fail/coverage%) |
| F643 | IVariantEventPublisherService | QUEUE FABRIC (Redis Streams) | Publish variant lifecycle events (created, promoted, deprecated) |
| F644 | IVariantFallbackService | DATABASE FABRIC (ES) | When exact variant missing: return canonical + adapter recipe |

**FREEDOM Config Keys:**
- `skill.target.client` ∈ {reactjs, vue, angular, wordpress_plugin, wordpress_theme, react_native}
- `skill.target.server` ∈ {dotnet, node, go, java, rust, php}
- `skill.variant.maturityThreshold` — minimum maturity to use in production (default: INJECTED)

---

## FAMILY 86 — TARGET ADAPTER CODE GENERATION (F645–F651)

**Purpose:** The generation engine that takes a Canonical Skill Spec and produces target-specific adapter code through the AF pipeline. Never generates provider-specific code directly.

**Fabric Resolution:** AI ENGINE FABRIC (Skills 06/07) for generation; DATABASE FABRIC for spec input/output

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F645 | IAdapterGenerationOrchestratorService | AI ENGINE FABRIC (AiDispatcher) | Orchestrate multi-model adapter generation per target |
| F646 | IServerAdapterGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate server-side adapter for target language (Node/Go/Java/Rust/PHP) |
| F647 | IClientAdapterGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate client-side adapter for target framework (React/Vue/Angular) |
| F648 | IAdapterPromptLibraryService | RAG FABRIC (Skill 00a) | Retrieve implementer prompts per target language/framework |
| F649 | IAdapterDNAComplianceService | CORE FABRIC (Skill 01) | Check generated adapter against all 9 DNA patterns |
| F650 | IAdapterBundleStoreService | DATABASE FABRIC (ES) | Store generated adapter bundles with metadata and generator version |
| F651 | IAdapterRetryOrchestratorService | QUEUE FABRIC (Redis Streams) | Re-queue failed adapter generations for retry with feedback injection |

**Iron Rules for Adapter Generation:**
- IRON-86-1: Generated server adapters MUST call through fabric interfaces (IDatabaseService, IQueueService, IAiProvider) — never import providers
- IRON-86-2: Generated client adapters MUST use UI fabric resolution (platform via config, not import)
- IRON-86-3: All adapters MUST pass canonical golden test suite before promotion
- IRON-86-4: No typed models; all documents as Dictionary / language-equivalent map

---

## FAMILY 87 — WORDPRESS PLUGIN PACKAGING (F652–F656)

**Purpose:** Generate and package WordPress plugin output as a first-class skill target. Plugins deliver behaviors: admin pages, Gutenberg blocks, REST API proxy, settings.

**Fabric Resolution:** AI ENGINE FABRIC (generation); DATABASE FABRIC (artifact store); QUEUE FABRIC (packaging events)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F652 | IWpPluginScaffoldService | AI ENGINE FABRIC (Skill 07) | Generate plugin PHP shell: header, activation hooks, namespace |
| F653 | IWpSettingsPageService | AI ENGINE FABRIC (Skill 07) | Generate Settings API admin page (register_setting, add_settings_section) |
| F654 | IWpBlockGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate Gutenberg block: block.json + server PHP registration + client JS |
| F655 | IWpPluginPackagingService | DATABASE FABRIC (ES) + QUEUE FABRIC | Assemble plugin ZIP artifact; store metadata; publish packaging event |
| F656 | IWpRestProxyGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate WP REST endpoint (register_rest_route) that proxies to XIIGen API |

**WordPress Plugin Rules (MACHINE — not configurable):**
- Plugin header fields: Plugin Name (required), Version, Requires PHP, Text Domain
- Settings registration MUST happen on `admin_init` hook
- Block MUST register on both server (PHP) and client (JS) via block.json
- REST endpoints MUST specify permission_callback (never omit)
- NO secrets stored in WP options or client bundles
- All API calls from WP plugin go through XIIGen API gateway — no direct DB access from PHP

**WordPress Plugin FREEDOM config:**
- `wp.plugin.namespace` — PHP namespace for generated plugin
- `wp.plugin.textDomain` — i18n text domain
- `wp.plugin.minPhp` — minimum PHP version requirement
- `wp.plugin.hasBlock` — whether to generate Gutenberg block (true/false)
- `wp.plugin.hasRestProxy` — whether to generate REST proxy endpoint

---

## FAMILY 88 — WORDPRESS THEME PACKAGING (F657–F661)

**Purpose:** Generate WordPress block theme output as a distinct skill target. Themes deliver styling + templates, NOT business logic.

**Fabric Resolution:** AI ENGINE FABRIC (generation); DATABASE FABRIC (artifact store)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F657 | IWpThemeJsonGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate theme.json from design tokens (colors, typography, spacing) |
| F658 | IWpTemplatePartGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate template parts (header, footer, content) in HTML block markup |
| F659 | IWpBlockPatternGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate reusable block patterns for theme |
| F660 | IWpThemePackagingService | DATABASE FABRIC (ES) | Assemble theme ZIP; store artifact metadata |
| F661 | IWpTokenExportService | RAG FABRIC (Skill 00a) | Export design tokens from existing token store to theme.json format |

**WordPress Theme Rules (MACHINE):**
- theme.json is the ONLY mechanism for global settings/styles (no inline PHP styles)
- Templates in `templates/` folder; template parts in `parts/` folder
- NO business logic in theme — all behavior routes through plugin or XIIGen API
- Theme may include optional companion plugin declaration if REST proxy needed
- Design tokens MUST come from the canonical design system (not hardcoded in theme.json)

---

## FAMILY 89 — SERVER LANGUAGE SDK SCAFFOLDING (F662–F667)

**Purpose:** Generate and maintain per-language MicroserviceBase SDK equivalents that enforce DNA behaviors in non-.NET languages.

**Fabric Resolution:** AI ENGINE FABRIC (generation); DATABASE FABRIC (SDK artifact store); RAG FABRIC (pattern retrieval)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F662 | IMicroserviceSdkGeneratorService | AI ENGINE FABRIC (Skill 07) | Generate MicroserviceBase SDK scaffold for target language |
| F663 | IDataProcessResultAdapterService | AI ENGINE FABRIC (Skill 07) | Generate DataProcessResult<T> equivalent for target language |
| F664 | IDynamicRoutingAdapterService | AI ENGINE FABRIC (Skill 07) | Generate DynamicController equivalent (single generic router/config-driven) |
| F665 | ITenantScopeAdapterService | AI ENGINE FABRIC (Skill 07) | Generate tenant scope propagation pattern for target language |
| F666 | ISdkConformanceValidatorService | AI ENGINE FABRIC + RAG FABRIC | Validate SDK satisfies all 9 DNA patterns |
| F667 | ISdkArtifactStoreService | DATABASE FABRIC (ES) | Store SDK artifacts with version and compliance status |

**Per-Language SDK Requirements (MACHINE — enforced for ALL languages):**
1. `DataProcessResult<T>` equivalent — success/error without throwing for business logic
2. `ParseDocument` → map/dict only — no typed models in generated code
3. Tenant scope propagation on every storage/query/cache operation
4. DynamicController equivalent — single generic router driven by config, not entity-specific routes
5. Trace context propagation — OpenTelemetry compatible

---

## FAMILY 90 — CROSS-VARIANT CONFORMANCE TESTING (F668–F672)

**Purpose:** Run the canonical golden test suite against every variant to ensure behavioral equivalence before promotion.

**Fabric Resolution:** QUEUE FABRIC (test orchestration); DATABASE FABRIC (test results); AI ENGINE FABRIC (test generation)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F668 | IConformanceTestOrchestratorService | QUEUE FABRIC (Redis Streams) | Queue and orchestrate test runs across all variants of a skill family |
| F669 | IGoldenTestReplayService | DATABASE FABRIC (ES) | Load canonical golden vectors; replay against variant under test |
| F670 | IVariantTestReporterService | DATABASE FABRIC (ES) | Store test results; compute coverage%; flag failures |
| F671 | IApiConformanceCheckerService | AI ENGINE FABRIC (Skill 07) | Check OpenAPI boundary parity between canonical spec and variant |
| F672 | IEventEnvelopeValidatorService | DATABASE FABRIC (ES) | Validate CloudEvents envelope on all async variant events |

---

## FAMILY 91 — GRAPH RAG SKILL INDEX (F673–F677)

**Purpose:** Maintain the graph representation of skills, variants, and their relationships for Graph RAG retrieval (Phase B / P4).

**Fabric Resolution:** RAG FABRIC (Skill 00b — Graph strategy); DATABASE FABRIC (graph document store)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F673 | IGraphSkillIndexService | RAG FABRIC (Graph strategy) | Ingest skill + variant nodes into graph |
| F674 | IGraphEdgeLinkingService | RAG FABRIC (Graph strategy) | Create HAS_VARIANT, DEPENDS_ON, VALIDATES_BY edges |
| F675 | IGraphVariantQueryService | RAG FABRIC (Graph strategy) | Local search: entity → variant traversal by target |
| F676 | IGraphCoverageReportService | RAG FABRIC (Graph strategy) | Global search: coverage reports per target cluster |
| F677 | IGraphSyncService | QUEUE FABRIC (Redis Streams) | Sync regular skill library changes into graph on variant lifecycle events |

**Graph Node Types:**
- `Skill` (canonical family node)
- `Variant` (server or client, per target)
- `Factory` (dependency)
- `Fabric` (which fabric each variant uses)
- `TaskType` (which task type generates this variant)
- `TestSuite` (golden vectors)
- `Artifact` (packaging output)

**Graph Edge Types:**
- `HAS_VARIANT` (Skill → Variant)
- `VARIANT_TARGETS` (Variant → Target string)
- `DEPENDS_ON` (Skill/Variant → Factory)
- `USES_FABRIC` (Variant → Fabric)
- `VALIDATED_BY` (Variant → TestSuite)
- `PACKAGED_AS` (Variant → Artifact)
- `ALTERNATIVE_OF` (Variant → Variant, within same family)

---

## FAMILY 92 — VARIANT PROMOTION PIPELINE (F678–F681)

**Purpose:** Manage the promotion ladder for variants: GENERATED → INJECTED → MINIMAL → CORE.

**Fabric Resolution:** QUEUE FABRIC (promotion events); DATABASE FABRIC (status store); AI ENGINE FABRIC (promotion review)

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F678 | IVariantPromotionGateService | AI ENGINE FABRIC (Skill 07 / AF-9) | Evaluate variant against quality gates for promotion |
| F679 | IVariantStatusTransitionService | DATABASE FABRIC (ES) + QUEUE FABRIC | Execute promotion; publish event; update registry |
| F680 | IVariantRollbackService | QUEUE FABRIC (Redis Streams) | Roll back failed promotion; restore previous status |
| F681 | IPromotionAuditService | DATABASE FABRIC (ES) | Audit trail of all promotions: who, when, gate results |

---

## FAMILY 93 — MULTI-TARGET ORCHESTRATION CONTROL (F682–F685)

**Purpose:** Top-level orchestration of the full multi-target translation flow, connecting all sub-systems.

**Fabric Resolution:** FLOW ENGINE FABRIC (Skills 08/09); QUEUE FABRIC; AI ENGINE FABRIC

| Factory | Interface | Resolves Through | Purpose |
|---------|-----------|-----------------|---------|
| F682 | IMultiTargetTranslationOrchestratorService | FLOW ENGINE FABRIC (Skill 09) | Master orchestrator: reads DAG, dispatches per-phase steps |
| F683 | ITranslationTraceService | DATABASE FABRIC (ES) | Track trace ID through multi-step translation; enable resume |
| F684 | ITranslationFeedbackInjectorService | AI ENGINE FABRIC (Skill 07 / AF-11) | Inject user feedback into future translation prompts |
| F685 | ITranslationCostTrackerService | DATABASE FABRIC (ES) | Track AI token usage per translation job |

---

## FABRIC RESOLUTION SUMMARY TABLE

| Factory Range | Fabric | Provider |
|---------------|--------|----------|
| F631–F637 | DATABASE FABRIC | Elasticsearch |
| F638–F644 | DATABASE FABRIC (primary) + QUEUE FABRIC | ES + Redis Streams |
| F645–F651 | AI ENGINE FABRIC (primary) + DATABASE FABRIC | AiDispatcher + ES |
| F652–F656 | AI ENGINE FABRIC + DATABASE FABRIC + QUEUE FABRIC | Multi |
| F657–F661 | AI ENGINE FABRIC + DATABASE FABRIC + RAG FABRIC | Multi |
| F662–F667 | AI ENGINE FABRIC + RAG FABRIC + DATABASE FABRIC | Multi |
| F668–F672 | QUEUE FABRIC + DATABASE FABRIC + AI ENGINE FABRIC | Multi |
| F673–F677 | RAG FABRIC (Graph strategy) + DATABASE FABRIC | Neo4j/LightRAG + ES |
| F678–F681 | QUEUE FABRIC + DATABASE FABRIC + AI ENGINE FABRIC | Multi |
| F682–F685 | FLOW ENGINE FABRIC + QUEUE FABRIC + AI ENGINE FABRIC | Multi |
