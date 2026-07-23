# XIIGen — UNIFIED ENGINE ARCHITECTURE
## Consolidated from: V39 + V40 + V43 Master + V43 Fabric Extension + V40-V69 Audit + FLOW-05 + FLOW-01 + FLOW-02 + FCE + FLOW-03
## All unique content merged additively. Conflicts resolved by latest compliant version.
## Date: 2026-02-25 | Status: AUTHORITATIVE REFERENCE (Post FLOW-03 Integration)
## Checksum: UNIFIED-V39-V40-V43-AUDIT-FLOW05-FLOW01-FLOW02-FCE-FLOW03

---

# VERSION LINEAGE & CONSOLIDATION

| Version | Title | Date | Key Contribution | Status |
|---------|-------|------|-----------------|--------|
| V39 | Engine Design Specification | 2026-02-24 | Factory-first philosophy, 12 factory interfaces, universal factory pattern | ✅ ANCHOR |
| V40 | Engine-Fabric-First | 2026-02-24 | DB1/DB2 resolutions, AF stations, 41 families, task type dependency maps | ✅ ANCHOR |
| V43 Master | Unified Flow Factory | 2026-02-24 | 53 factories, FlowDefinition/NodeDefinition schemas, 70-gate quality, code ingestion | ✅ ANCHOR (with V43 EXT) |
| V43 EXT | Fabric Extension | 2026-02-24 | F54-F68, Execution/Infra/Mgmt fabrics, Flow→WorkItem mapping | ✅ ANCHOR |
| V40-V69 Audit | Compliance Audit | 2026-02-25 | Keep/discard/salvage decisions, architecture drift analysis | ✅ REFERENCE |
| FLOW-05 EXT | Lesson Gamification Engine Extension (MERGED FINAL) | 2026-02-25 | Family 17, F166-F173 (31 methods), T44-T46, lesson-gamification-v1, G6 transactional rule, Appendices B-F | ✅ MERGED |
| **FLOW-01 EXT** | **User Registration Engine Extension** | **2026-02-25** | **Family 18, F174-F181, T47-T49, user-registration-v1, BFA G4+G7** | **✅ MERGED** |
| **FLOW-03 EXT** | **Event Creation & Promotion Engine Extension** | **2026-02-25** | **Family 21, F197-F204, T59-T62, event-promotion-v1, CF-10–CF-17, V62 REINFORCED** | **✅ MERGED** |

### Audit Summary (from V40-V69 Compliance Audit)

| Verdict | Versions | Action |
|---------|----------|--------|
| ✅ KEEP | V39, V40, V43 EXT, V62 BFA Stress Test | Use as-is — all merged here |
| 🟡 SALVAGE | V41, V42, V43 Master, V44, V52, V62 | Good content extracted, fabric layer added |
| ❌ DISCARD | V45-V61, V63-V69 | Architecture drift — describe services not engine. MACHINE/FREEDOM tables from V63-V69 are salvageable. |

**Critical insight from audit:** After V54, versions increasingly describe *what services do* rather than *how the engine generates them on fabric interfaces*. This unified document restores the engine-first architecture.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — CORE PHILOSOPHY (from V39)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The V39 Design Rule

> Every external dependency is a FACTORY with a TYPED INTERFACE.
> The engine routes to implementations. Never to providers directly.

For EVERY external system the engine touches:
1. **Define the INTERFACE** — inputs, outputs, error contract
2. **Define the FACTORY** — runtime resolution, config, fallback
3. **Define the BASE SKELETON** — what every implementation must provide
4. **The Skill Factory GENERATES concrete implementations** — each provider = a new skill

```
WRONG (pre-V39):
  freedomConfig.imageProvider = "dall-e-3"   ← magic string, no contract

CORRECT (V39+):
  IImageGenerationProvider<TPrompt, TGenerationResult>
    └── DallE3Provider : IImageGenerationProvider
    └── MidjourneyProvider : IImageGenerationProvider
    └── StableDiffusionProvider : IImageGenerationProvider
  ImageGenerationFactory.CreateAsync(config) → IImageGenerationProvider
```

## The V40 Engine Rule

```
THE ENGINE IS THE FABRIC.
The AI Factory (AF-1 → AF-11) IS the engine.
Every external system = a FAMILY (F1-F41+).
Every family has a FACTORY INTERFACE.
Every factory has CONFIG-FIRST routing.
Every factory creation is ASYNC.

M160: Direct provider SDK call without factory = ACS -15 per occurrence (automatic)
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — UNIVERSAL FACTORY PATTERN (V39 + V40 DB1/DB2)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## DB1 Resolution: ASYNC Factory Creation (V40)

```csharp
// DECISION: All factory creation is async (I/O for config, health, circuit breaker)
public interface IExternalServiceFactory<TService>
    where TService : IExternalService<,>
{
    Task<TService> CreateAsync(FactoryResolutionContext ctx, CancellationToken ct = default);
    Task<IReadOnlyList<TService>> GetResolutionChainAsync(FactoryResolutionContext ctx);
    Task<TService> SelectByCapabilityAsync(CapabilityQuery query, IRAGProvider rag);
}
```

## DB2 Resolution: CONFIG-FIRST Factory Routing (V40)

```
ROUTING ORDER (always):
  1. Read config: primaryProviderId, fallbackProviderId (FREEDOM layer)
  2. Resolve primary: registry.Get(primaryProviderId) → IService instance
  3. Validate capability: instance.CapabilityManifest.Supports(request)
  4. Health check: instance.GetHealthAsync() → ProviderHealthReport
  5. If primary fails ANY of steps 2-4: route to fallback
  6. If fallback also fails: ESCALATE (not silent fail)

Config is the explicit contract. Admin sets "which provider" deliberately.
Capability manifest VALIDATES the config choice, does not OVERRIDE it.
```

## The Base Contracts (V39)

```csharp
// 1. THE INTERFACE — what the engine talks to (never changes)
public interface IExternalService<TInput, TOutput>
{
    Task<ServiceResult<TOutput>> ExecuteAsync(
        TInput input, ServiceExecutionContext context, CancellationToken ct = default);
    Task<ProviderHealthReport> GetHealthAsync();
    ValidationResult ValidateConfiguration(ServiceConfig config);
}

// 2. THE RESULT ENVELOPE — consistent across all factories
public record ServiceResult<TOutput>
{
    TOutput Value { get; init; }
    bool Success { get; init; }
    string ProviderId { get; init; }
    TimeSpan Duration { get; init; }
    int TokensUsed { get; init; }
    ServiceResultMetadata Metadata { get; init; }
    ServiceError? Error { get; init; }
}

// 3. THE CONFIG — FREEDOM layer
public record ServiceConfig
{
    string PrimaryProviderId { get; init; }
    string? FallbackProviderId { get; init; }
    int TimeoutMs { get; init; }
    int MaxRetries { get; init; }
    Dictionary<string, object> ProviderParams { get; init; }
}
```

## Factory Resolution Context (V39/V40)

```csharp
public record FactoryResolutionContext
{
    string ProjectId { get; init; }
    string TaskType { get; init; }           // T1-T46+
    ComplexityTier Tier { get; init; }       // LITE / STANDARD / DEEP
    ServiceConfig Config { get; init; }      // from FREEDOM layer
    CapabilityRequirements Required { get; init; }
    ProviderHealthCache HealthCache { get; init; }
    UserContext UserContext { get; init; }    // language, region, preferences
}

public record CapabilityRequirements
{
    string[] SupportedLanguages { get; init; }
    string[] SupportedFormats { get; init; }
    int MaxOutputTokens { get; init; }
    bool RequiresStreaming { get; init; }
    bool RequiresVision { get; init; }
    QualityTier MinimumQuality { get; init; }  // FAST / BALANCED / BEST
    bool PrivacyMode { get; init; }
}
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — FABRIC INTERFACES (Layer 0)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Fabric | Skill | Interface | Providers | Key Methods |
|--------|-------|-----------|-----------|-------------|
| DATABASE | 05 | IDatabaseService | Elasticsearch, MongoDB, PostgreSQL, Redis, MySQL, SQLServer | StoreDocument, SearchDocuments, DeleteDocument → DataProcessResult<T> |
| QUEUE | 04 | IQueueService | Redis Streams (consumer groups) | EnqueueAsync, DequeueAsync, AcknowledgeAsync. Main→Consumed→Archive→DLQ |
| AI ENGINE | 06/07 | IAiProvider + AiDispatcher | Claude, OpenAI, Gemini, DeepSeek | GenerateAsync(). Multi-model + aggregation |
| RAG | 00a/00b | IRagService | 7 strategies: Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi | SearchAsync() |
| CORE | 01 | MicroserviceBase | N/A (inherited by ALL services) | 19 components: DB, Queue, Cache, Auth, Scope, Health, Log, Config, Permissions, ObjectProcessor... |
| FLOW ENGINE | 08/09 | IFlowDefinition + IFlowOrchestrator | JSON DAGs in Elasticsearch | Flow definitions are documents, not code |

**Rule:** Every component talks ONLY through these fabric interfaces. Never to providers directly.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — FACTORY REGISTRY (Complete, All Versions)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## V39 Original 12 Factory Interfaces

| # | Interface | Domain | Providers |
|---|-----------|--------|-----------|
| 1 | IModelProvider | AI model execution | Claude, GPT, Gemini, Grok, DeepSeek |
| 2 | IRAGProvider | RAG / GraphRAG | Elasticsearch, GraphRAG, LocalVector |
| 3 | IImageGenerationProvider | Image generation | DALL-E, Stability AI, Flux, Midjourney |
| 4 | IConversationStrategy | Dialog management | Turn-based, tree, Socratic |
| 5 | ICodeGenerationTarget | Code output format | React, Angular, Vue, .NET, Node |
| 6 | IVisualDiffCalculator | Visual QA | Playwright+diff, SSIM |
| 7 | IHeadlessRenderer | Screenshot/render | Playwright, Puppeteer |
| 8 | ITranslationProvider | Language translation | DeepL, Google, Azure |
| 9 | IDeploymentTarget | Deploy pipeline | Vercel, Railway, Docker, K8s |
| 10 | ITokenExtractor | Design tokens | Figma API, Style Dictionary |
| 11 | ILayoutSegmenter | Layout analysis | AI-based, rule-based |
| 12 | IContentManifestBuilder | Content manifest | JSON, YAML schema |

## V40 Catalog Families (F1-F41)

| # | Family | Interface | Used By |
|---|--------|-----------|---------|
| 1 | DATABASE | IDatabaseService | All |
| 2 | QUEUE | IQueueService | All |
| 3 | CACHE | ICacheService | All |
| 4 | AI_TEXT | IAiProvider | All |
| 5 | RAG | IRagService | Figma, Text-to-System |
| 6 | VIDEO_GENERATION | IVideoGenerationProvider | Media, Content Pipeline |
| 7 | AUDIO_GENERATION | IAudioGenerationProvider | Media, Content Pipeline |
| 8 | SPEECH_TO_TEXT | ISpeechToTextProvider | Media |
| 9 | IMAGE_GENERATION | IImageGenerationProvider | Content Pipeline |
| 10 | 3D_SCENE | I3DSceneProvider | Media (future) |
| 11 | COACHING_PLAN | ICoachingPlanProvider | Coaching |
| 12 | INPUT_PARSER | IInputParserProvider | Coaching |
| 13 | VISUAL_COMPARATOR | IVisualComparatorProvider | Figma, Design Integration |
| 14 | MODULE_RESOLVER | IModuleResolverProvider | Figma, Text-to-System |
| 15 | CODE_ANALYSIS | ICodeAnalysisProvider | Legacy Migration |
| 16 | MIGRATION_PLANNER | IMigrationPlannerProvider | Legacy Migration |
| **17** | **GAMIFICATION** | **IGamificationProvider** | **FLOW-05** |
| **18** | **USER_REGISTRATION** | **IUserRegistrationProvider** | **FLOW-01** |

## V43 Fabric Extension (F54-F68)

### Execution Fabric (Phase 9)
| ID | Interface | Purpose |
|----|-----------|---------|
| F54 | ISourceControlProvider | Git operations (clone, branch, commit, push) |
| F55 | ICiCdPipelineProvider | Pipeline trigger, status, logs |
| F56 | IPullRequestProvider | Create PR, add reviewers, merge |
| F57 | IAgentDispatchProvider | AI agent task dispatch |
| F58 | IArtifactRegistryProvider | Package publish/retrieve |

### Infrastructure Fabric (Phase 10)
| ID | Interface | Purpose |
|----|-----------|---------|
| F59 | IContainerOrchestrationProvider | K8s deploy, scale, rollback |
| F60 | IInfraAsCodeProvider | Terraform/Pulumi plan, apply |
| F61 | IMessageQueueProvider | Kafka/RabbitMQ/SQS management |
| F62 | ISecretVaultProvider | Vault/AWS Secrets read/write |
| F63 | IMonitoringProvider | Prometheus/Grafana/Datadog |

### Management + Intelligence Fabric (Phase 11)
| ID | Interface | Purpose |
|----|-----------|---------|
| F64 | IProjectManagementProvider | Flow→WorkItem mapping (Azure DevOps, Jira, Monday) |
| F65 | IGraphAiProvider | Graph DB queries (Neo4j, Neptune) |
| F66 | IVectorStoreProvider | Specialized vector operations |
| F67 | IFeatureFlagProvider | LaunchDarkly/Unleash/custom |
| F68 | INotificationProvider | Email, Slack, Teams, push |

### FLOW-05 Extension (F166-F173) — Family 17: GAMIFICATION
| ID | Interface | Fabric Resolution | Methods | MACHINE | FREEDOM |
|----|-----------|-------------------|---------|---------|---------|
| F166 | IGamificationService | DATABASE FABRIC (InfluxDB+Redis) + QUEUE FABRIC | CalculatePointsAsync, CheckLevelUpAsync, CheckAchievementsAsync, GetStreakAsync | Point formula, level formula, server-side only, idempotency, BigInt | Point values, streak thresholds, achievement definitions |
| F167 | ILearningPlanService | AI ENGINE FABRIC + DATABASE FABRIC (MongoDB) + QUEUE FABRIC | AnalyzePerformanceAsync, GenerateAdaptationAsync, ValidateAdaptationAsync, ApplyAdaptationAsync, GetCurrentPlanAsync, GetAdaptationHistoryAsync | Max 3 changes, min 2 lessons, safe default, persist-before-event | Score thresholds, pace multipliers, ML model, sensitivity |
| F168 | IAchievementRegistryService | DATABASE FABRIC (ES+MongoDB) | GetAchievementCriteriaAsync, ValidateAchievementUnlockAsync, RecordAchievementAsync, GetUserAchievementsAsync | Criteria evaluation, event history cross-reference | Achievement definitions in ES (names, criteria, rarity) |
| F169 | IStreakTrackingService | DATABASE FABRIC (Redis+MongoDB) | RecordActivityAsync, GetCurrentStreakAsync, CheckStreakBonusAsync, ResetStreakAsync | Timezone-aware consecutive-day requirement | Bonus thresholds (3/7/30 days), bonus amounts |
| F170 | IPointLedgerService | DATABASE FABRIC (InfluxDB) | RecordPointsAsync, GetPointHistoryAsync, GetTotalPointsAsync | Immutable append-only, BigInt, idempotency on sourceEvent | **None** — ledger structure is MACHINE (audit trail) |
| F171 | IQuestionnairePostService | DATABASE FABRIC (MongoDB) + AI ENGINE FABRIC + QUEUE FABRIC | CreatePostFromAnswersAsync, GetPostAsync | Privacy gate (opted-in only), struggling learner protection | Post formatting templates, AI prompt templates |
| F172 | IGradeCalculationService | DATABASE FABRIC (MongoDB) + QUEUE FABRIC | SubmitGradeAsync, GetGradesForAnswerAsync, GetGraderStatsAsync, PostCommentAsync, GetCommentsForAnswerAsync | 4 criteria (fixed), pseudonymity until 3 graders, rate limit 20/hr | **None** — grading schema is MACHINE |
| F173 | ILearningAudienceService | RAG FABRIC + DATABASE FABRIC + QUEUE FABRIC | IdentifyAudienceAsync, BuildDistributionPlanAsync, HandoffToFlow04Async | Weights must sum to 1.0, per-segment caps, FLOW-04 reuse only | Weight defaults (30/20/30/20), similarity threshold, caps |

**All F166-F173:** Factory creation via `IExternalServiceFactory<T>.CreateAsync(FactoryResolutionContext ctx)` with config-first routing. All extend MicroserviceBase. All DNA 6/6 compliant. Total: 31 methods across 8 interfaces.

**BFA G6 Transactional Rule:** Any operation modifying an entity across multiple DB FABRIC stores MUST be traced as a single logical transaction. Partial writes = BFA ALERT.

### Multi-DB Entity Registry (FLOW-05, G6 Gap Patch)
| Entity | Primary Store | Cache | History | Fabric Instances |
|--------|-------------|-------|---------|-----------------|
| GamificationProfile | MongoDB | Redis (level, streaks) | InfluxDB (points) | DATABASE FABRIC × 3 |
| PointLedgerEntry | InfluxDB | — | — | DATABASE FABRIC × 1 |
| AchievementRecord | MongoDB | Elasticsearch (configs) | — | DATABASE FABRIC × 2 |
| StreakRecord | Redis (current) | — | MongoDB (history) | DATABASE FABRIC × 2 |
| LearningPlan | MongoDB | — | — | DATABASE FABRIC × 1 |
| QuestionnairePost | MongoDB | — | — | DATABASE FABRIC × 1 |
| AnswerGrade | MongoDB | — | — | DATABASE FABRIC × 1 |
| AnswerComment | MongoDB | — | — | DATABASE FABRIC × 1 |
| AudienceRecord | ES/MongoDB | — | — | DATABASE FABRIC × 1 |

### FLOW-01 Extension (F174-F181)
| ID | Interface | Family | Purpose |
|----|-----------|--------|---------|
| F174 | IAuthenticationService | 18 | SSO validation, email registration, JWT issuance, account merge |
| F175 | IUserProfileService | 18 | Profile creation, onboarding state machine, merge |
| F176 | IEmailDeliveryService | 18 | Verification emails, reminders (stateless, queue-only) |
| F177 | IQuestionnaireService | 18 | AI-personalized questionnaire generation + response storage |
| F178 | IChatDeliveryService | 18 | In-app chat delivery via WebSocket/push |
| F179 | IRegistrationAnalyticsService | 18 | Funnel tracking, registration metrics |
| F180 | IAuditTrailService | 18 | GDPR-compliant audit logging with PII redaction |
| F181 | ITokenManagementService | 18 | Verification tokens, JWT rotation, blacklist |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5 — ENGINE CONTRACTS SYSTEM (V40 + V43)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Required Engine Contract Format (from basic_prompt.txt)

Every task type MUST have ALL of these fields:

```
TASK TYPE: T{N} — {Name}
ARCHETYPE: {PROCESSING | ORCHESTRATION | INTELLIGENCE | DISTRIBUTION | DATA_TRANSFORMATION}
ENTRY: What triggers it
PURPOSE: What it does
DISTINCT FROM: Similar task types it could be confused with
FACTORY DEPENDENCIES: F{N}: I{Interface} — resolved via CreateAsync()
FABRIC RESOLUTION: F{N} → {FABRIC} ({provider})
AF CONFIGURATION: Which AF stations generate/review/judge
BFA VALIDATION: Cross-flow checks + entity/event registration
MACHINE / FREEDOM: Fixed vs configurable
IRON RULES: Violations = BUILD FAILURE
QUALITY GATES: What AF-9 validates
```

## Task Types Catalog

| Range | Source | Description |
|-------|--------|-------------|
| T1-T7 | TASK_TYPES_CATALOG.md | Media, Content, Figma, Coaching, Text-to-System, Design Integration, Legacy Migration |
| T8-T21 | V40 Master Plan | On-demand flow generation, extended catalog |
| T22-T43 | V43 + later versions | Flow factory, node types, advanced orchestration |
| **T44-T46** | **FLOW-05 Extension** | **Fan-Out Scoring, ML Adaptation Gate, Social Learning Distribution** |
| **T47-T49** | **FLOW-01 Extension** | **Multi-Path Auth Gate, Deferred Verification Pipeline, Onboarding Delivery Orchestration** |

## Flow Template Registry (10 templates)

| Template ID | Task Type | Phases | Phase-Gated | Human Gates | Sub-Flows |
|-------------|-----------|--------|-------------|-------------|-----------|
| voice-to-video-v1 | Media | 3 | Light | 0 | 0 |
| content-pipeline-v1 | Content | 4 | Yes | 0 | 0 |
| figma-to-system-v1 | Figma | 8 | 8 gates | 0 | 0 |
| coaching-plan-v1 | Coaching | Multi | 3 gates | 0 | 0 |
| text-to-system-v1 | Text-to-System | 5 | 3 gates | 0 | 0 |
| design-integration-v1 | Design | 5 | 3 gates | 0 | 0 |
| migration-v1 | Legacy | Multi | Variable | 3 | 1 |
| code-to-skills-v1 | *(sub-flow)* | 7 | 7 steps | 2 | 0 |
| lesson-gamification-v1 | Gamification | 3 parallel + join | 3 branch gates | 0 | 0 |
| **user-registration-v1** | **User Registration** | **13 steps** | **2 path gates** | **0** | **0 (3 wait states)** |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6 — FLOW SYSTEM (V43)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## V43 Statement

```
V43 says: "ALL of it. 53 factories. Typed flows. Typed nodes. 70-gate.
           Code ingestion. Skills factory. Engine contracts. Sub-engines.
           Nothing is lost. Everything is additive."
```

## What V43 Unified

| Addition | Source | Why |
|----------|--------|-----|
| FlowDefinition + NodeDefinition schemas WITH 53 factory bindings | V42-V2 schemas + V42-Combined factories | V2 had schemas but only 12 factories. Combined had 53 factories but no schemas. |
| 70-Gate quality WITH Skills Factory pattern lookup | V42-V2 gates + V42-Combined factory | V2 had 70-gate but no skills factory. Combined had skills factory but ACS-21. |
| Code Ingestion WITH V7 engine contract validation | V42-V2 ingestion + V42-Combined contracts | V2 ingestion didn't check against V7 contracts. |
| 6-stage promotion WITH sub-engine routing | V42-V2 ladder + V42-Combined sub-engines | V2 had 6 stages but no INV/SYN/JUDG. |

## 10 Phases (V43)

| Phase | Name | Key Output |
|-------|------|-----------|
| 0 | Foundation + Skills Factory | Session state, RAG index, 47 skill references |
| 1 | Flow & Node Schemas + Factory Registry | FlowDefinition/NodeDefinition schemas, 53 interfaces |
| 2 | Code Ingestion + V7 Contract Validation | Pattern extraction, COPY/ADAPT/REWRITE classify |
| 3 | Flow Intelligence + Sub-Engines | Intent→TaskType routing, INVENTORY/SYNTHESIS/JUDGMENT |
| 4 | Conversation + Reuse Engine | Right questions before building, reuse scoring |
| 5 | Adaptive Genesis | LITE/STANDARD/DEEP tier generation |
| 6 | Quality Gates + Test-First + Promotion | ACS-21 (LITE) / 70-Gate (STANDARD+DEEP) |
| 7 | Vision Pipeline + Code Injection | Figma→DesignIR→code→visual QA |
| 8 | Lifecycle + Learning | 53-factory registry, flow registry, DNA card |
| 9 | Agent Configs + Smoke Tests | Cursor/Claude Code/Copilot/Cline configs |

## Promotion Ladder (6 stages from V43)

```
DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE
```

## Quality System: Dual-Track (V43)

| Tier | Quality System | Threshold | When |
|------|---------------|-----------|------|
| LITE | ACS-21 fast-path | ≥75/100 | Simple, single-model tasks |
| STANDARD/DEEP | 70-Gate (8 clusters) | ≥52/70 | Complex, multi-model tasks |
| Both | 12 auto-healable gates | Auto-fix before human escalation | All tiers |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7 — AF STATIONS (Layer 3)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Station | Role | Sub-Engine |
|---------|------|-----------|
| AF-1 Genesis | Generates code from spec | SYNTHESIS |
| AF-2 Planning | Decomposes into steps | INVENTORY |
| AF-3 Prompt Library | Domain-specific prompts | INVENTORY |
| AF-4 RAG (Task Context) | Searches skill library for reusable patterns | INVENTORY |
| AF-5 Multi-model | Runs competing models | SYNTHESIS |
| AF-6 Code Review | Automated review | JUDGMENT |
| AF-7 Compliance | DNA pattern check | JUDGMENT |
| AF-8 Security | Security scan | JUDGMENT |
| AF-9 Judge (Quality Context) | Validates against iron rules/quality gates | JUDGMENT |
| AF-10 Merge | Combines multi-model outputs | SYNTHESIS |
| AF-11 Feedback | Stores generation quality for improvement | N/A (cross-cutting) |

## 3 Sub-Engines

| Sub-Engine | Purpose | AF Stations |
|-----------|---------|-------------|
| INVENTORY (extract) | Extract context, find patterns, discover reusable skills | AF-2, AF-3, AF-4 |
| SYNTHESIS (generate) | Generate code, run competing models, merge outputs | AF-1, AF-5, AF-10 |
| JUDGMENT (validate) | Review, compliance, security, quality gates | AF-6, AF-7, AF-8, AF-9 |

### Sub-Engine Routing by Flow (from MERGED FINAL Appendix B + FLOW-01 Phase 3)

| Sub-Engine | FLOW-05 | FLOW-01 |
|-----------|---------|---------|
| INVENTORY | Extract: answers, scores, timing, consent from QuestionnaireAnswered | Extract: SSO tokens, credentials, profile data, questionnaire responses |
| SYNTHESIS | Generate: gamification code, ML adaptation, social distribution on fabrics | Generate: auth services, verification pipeline, onboarding orchestration |
| JUDGMENT | Validate: DNA 48/48, iron rules (24 total), cross-flow BFA, quality gates (20 total) | Validate: DNA 48/48, iron rules (18 total), security (OAuth/JWT/CSRF), quality gates (18 total) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8 — FABRIC EXTENSIONS (V43 EXT)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

V43 base (Phases 0-8) produces typed FlowDefinitions with validated code.
V43 Extension adds 3 fabric layers to go from code → running service:

## Execution Fabric (Phase 9) — F54-F58
Code → branch → PR → CI/CD → deployed service
- Source control, CI/CD pipeline, pull request, agent dispatch, artifact registry

## Infrastructure Fabric (Phase 10) — F59-F63
What the running service needs to operate
- Container orchestration, IaC, message queue management, secret vault, monitoring

## Management + Intelligence Fabric (Phase 11) — F64-F68
Coordination and advanced AI
- Project management (Flow→WorkItem mapping), graph AI, vector store, feature flags, notifications

## Critical Concept: Flow → Work Item Mapping (V43 EXT)

```
A FlowDefinition is not just code. It is also a unit of work.

FlowCollection (2+ related FlowDefinitions)     →  FEATURE / INITIATIVE
FlowDefinition (complexity = DEEP, multi-node)   →  EPIC
FlowDefinition (complexity = STANDARD, ≤5 nodes) →  USER STORY
NodeDefinition                                    →  TASK
NodeDefinition.implementationStep / gate          →  SUB-TASK / BUG
```

---


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8A — FLOW-02 EXTENSION (Family 19)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FAMILY 19 — BUSINESS ONBOARDING INTELLIGENCE
# F182–F189 | Source: FLOW-02 business-onboarding.md
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## F182 — IBusinessProfileService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T50, T51
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `CreateProfile(ctx, questionnaireData)` | DATABASE FABRIC | IDatabaseService → MongoDB | StoreDocument → returns DataProcessResult<Dictionary<string,object>> |
| `GetProfile(ctx, userId)` | DATABASE FABRIC | IDatabaseService → MongoDB | SearchDocuments with BuildSearchFilter({userId, tenantId}) |
| `UpdateProfile(ctx, userId, updates)` | DATABASE FABRIC | IDatabaseService → MongoDB | StoreDocument (upsert) |
| `EnrichProfile(ctx, userId, enrichmentType)` | AI ENGINE FABRIC + DATABASE FABRIC | IAiProvider → GenerateAsync() + IDatabaseService → MongoDB → StoreDocument | AI enrichment stored back |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → BusinessProfileCreated |

### DNA Compliance
| Pattern | Implementation |
|---------|---------------|
| DNA-1 ParseDocument | `ParseDocument(questionnaireData)` → Dictionary<string,object>; NEVER typed model |
| DNA-2 BuildSearchFilter | `BuildSearchFilter({userId: ctx.userId, tenantId: ctx.tenantId})` skips empty |
| DNA-3 DataProcessResult | All methods return `DataProcessResult<Dictionary<string,object>>` |
| DNA-4 MicroserviceBase | `class BusinessProfileService : MicroserviceBase` |
| DNA-5 Scope Isolation | tenantId on every MongoDB query |
| DNA-6 DynamicController | Routes via DynamicController config, no entity-specific controller |
| DNA-7 Trace Context | `ctx.traceparent` forwarded to AI provider call + queue publish |

### Machine / Freedom
```
MACHINE: CreateProfile always emits BusinessProfileCreated via QUEUE FABRIC
         Profile schema validated against BusinessProfileSchema (version-pinned)
         Revenue field encrypted at rest (field-level encryption, MongoDB)
FREEDOM: MongoDB collection name (admin config), enrichment fields list, cache TTL
```

### Factory Creation Block
```csharp
// Resolved via: IExternalServiceFactory<IBusinessProfileService>.CreateAsync(ctx)
// Config key: "factories.businessProfile.provider"
// Providers: MongoDbBusinessProfileProvider (default), PostgresBusinessProfileProvider
// Health check: connection + schema version check
// Fallback: cached profile if DB unreachable (read operations only)
```

---

## F183 — IMatchingService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T50, T51
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `FindMatches(ctx, profileId, options)` | DATABASE FABRIC | IDatabaseService → PostgreSQL | SearchDocuments (scan active businesses with compatibility filter) |
| `ScoreCompatibility(ctx, profileA, profileB)` | DATABASE FABRIC | IDatabaseService → PostgreSQL | SearchDocuments (scoring algorithm query) |
| `GetMatchReasons(ctx, matchId)` | DATABASE FABRIC | IDatabaseService → PostgreSQL | SearchDocuments by matchId |
| `GetTopMatches(ctx, userId, limit)` | DATABASE FABRIC | IDatabaseService → Redis | SearchDocuments (cache-first, TTL 12h) |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → BusinessMatchesFound |

### DNA Compliance (all 7 patterns) ✅
DNA-1: Match results as Dictionary<string,object>. NEVER typed MatchResult model.
DNA-2: BuildSearchFilter auto-skips empty industry/location/stage fields.
DNA-3: ScoreCompatibility returns DataProcessResult<Dictionary<string,object>>.
DNA-4: MatchingService : MicroserviceBase.
DNA-5: tenantId on every PostgreSQL query.
DNA-6: DynamicController routing.
DNA-7: traceparent forwarded to all downstream calls.

### Machine / Freedom
```
MACHINE: Compatibility score formula fixed (weighted sum, 4 components)
         Match timeout: 30s hard limit (T51 IR-2)
         Match scores Redis TTL: 12h (T51 IR-3)
         Privacy filter: match reasons scrubbed of matched user's private fields

FREEDOM: Algorithm weights (industry:0.30, location:0.25, stage:0.25, interest:0.20)
         Max matches returned (default: 10)
         Match type priorities (complementary/peer/mentor/collaborative)
         Scoring index: PostgreSQL table (admin-tunable via ES config document)
```

### Factory Creation Block
```csharp
// Resolved via: IExternalServiceFactory<IMatchingService>.CreateAsync(ctx)
// Config key: "factories.matching.provider"
// Tech: Python/scikit-learn compatibility scoring (via internal HTTP through API gateway)
// Health check: scoring endpoint + DB connection
// Fallback: return empty matches with matchStatus="pending"
```

---

## F184 — IAnalyticsSegmentService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T50
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `SegmentUser(ctx, userId, profileData)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | StoreDocument (segment document) |
| `GetSegment(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments by userId |
| `AnalyzePatterns(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (aggregation query) |
| `GetInsights(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (insights query) |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → UserProfileAnalyzed |

### DNA Compliance (all 7 patterns) ✅
All methods return DataProcessResult<Dictionary<string,object>>.
AnalyticsSegmentService : MicroserviceBase.
Analytics data anonymized before storage (PII stripped — DNA-5 scope isolation).
DNA-7: traceparent forwarded to all Elasticsearch queries.

### Machine / Freedom
```
MACHINE: Analytics failure → degrade to industry defaults (T50 QG-4), NOT flow failure
         PII anonymized before storage (no raw email/name in analytics index)

FREEDOM: Segment taxonomy (industry tags, maturity levels — admin-configurable)
         Pattern analysis depth (quick vs deep analytics)
```

---

## F185 — ILearningProgramService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T50
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `GenerateProgram(ctx, userId, skillGaps)` | AI ENGINE FABRIC | IAiProvider → GenerateAsync() | Multi-model: Claude primary, GPT fallback |
| `GetProgram(ctx, userId)` | DATABASE FABRIC | IDatabaseService → MongoDB | SearchDocuments by userId |
| `UpdateProgress(ctx, userId, moduleId, progress)` | DATABASE FABRIC | IDatabaseService → MongoDB | StoreDocument (upsert) |
| `AdaptProgram(ctx, userId, newData)` | AI ENGINE FABRIC + DATABASE FABRIC | IAiProvider → GenerateAsync() + MongoDB → StoreDocument | Adaptation stored back |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → LearningProgramGenerated |

### DNA Compliance (all 7 patterns) ✅
GenerateProgram returns DataProcessResult<Dictionary<string,object>> (curriculum as Dictionary).
LearningProgramService : MicroserviceBase.
AI budget: 10s timeout (T50 QG-3).
DNA-7: traceparent forwarded to AI provider.

### Machine / Freedom
```
MACHINE: LearningProgramGenerated MUST fire even on AI timeout (degrade to template curriculum)
         Downstream FLOW-05 (T45) depends on this event

FREEDOM: AI model selection (Claude / GPT / Gemini), curriculum format (structured/ad-hoc),
         module count (5/10/progressive)
```

---

## F186 — IRecommendationEngineService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T51
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `StorePreferences(ctx, userId, preferences)` | DATABASE FABRIC | IDatabaseService → MongoDB + Redis | StoreDocument (persistent) + StoreDocument (cache, 24h TTL) |
| `GetRecommendations(ctx, userId, type)` | AI ENGINE FABRIC | IAiProvider → GenerateAsync() | Recommendation scoring |
| `UpdateWeights(ctx, userId, feedback)` | DATABASE FABRIC | IDatabaseService → MongoDB | StoreDocument (weight update) |
| `GetSimilar(ctx, userId, targetType)` | DATABASE FABRIC | IDatabaseService → MongoDB + Redis | SearchDocuments (cache-first) |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → LearningPreferencesStored |

### DNA Compliance (all 7 patterns) ✅
All return DataProcessResult<Dictionary<string,object>>.
RecommendationEngineService : MicroserviceBase.
DNA-7: traceparent on AI calls.

---

## F187 — IBusinessCategoryService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T50, T51
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `CategorizeAsync(ctx, businessId, profileData)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | StoreDocument (category document) |
| `GetCategory(ctx, businessId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments |
| `SearchCategories(ctx, query)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (full-text) |
| `UpdateTaxonomy(ctx, taxonomyUpdates)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | StoreDocument (bulk upsert) |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → BusinessCategorized |

### DNA Compliance (all 7 patterns) ✅
BusinessCategoryService : MicroserviceBase. BuildSearchFilter skips empty category fields.
DNA-7: traceparent on all Elasticsearch requests.

### Machine / Freedom
```
MACHINE: BusinessCategorized MUST fire after CategorizeAsync (required for T51 join)
FREEDOM: Taxonomy structure (industry tags, maturity levels — admin-configurable via ES config)
```

---

## F188 — IFeedPersonalizationService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T51, T52
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `PersonalizeFeed(ctx, userId, profileData, matches)` | DATABASE FABRIC | IDatabaseService → Redis + PostgreSQL | StoreDocument (feed config in Redis, 1h TTL) + StoreDocument (PG config) |
| `GetFeed(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Redis | SearchDocuments (cache-first) |
| `RefreshFeed(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Redis + PostgreSQL | StoreDocument (refresh cache) |
| `GetTrending(ctx, tenantId)` | DATABASE FABRIC | IDatabaseService → Redis | SearchDocuments (trending items) |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → UserFeedPersonalized |

### DNA Compliance (all 7 patterns) ✅
FeedPersonalizationService : MicroserviceBase.
PersonalizeFeed timeout: 2s (T51 QG-3); on timeout → degrade_to_trending.
DNA-7: traceparent forwarded.

### Machine / Freedom
```
MACHINE: Feed config cache TTL = 1h (Redis). Fallback to trending on timeout.
FREEDOM: Feed mix ratio (matched% vs trending% vs learning%), content sources (per tenant)
```

---

## F189 — IEventsPersonalizationService
**Family:** 19 — Business Onboarding Intelligence
**Task Types:** T51, T52
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `PersonalizeEvents(ctx, userId, interests, learningPath)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (event index with filters) |
| `GetEvents(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch + Redis | SearchDocuments (ES) + Redis cache (4h TTL) |
| `RefreshEvents(ctx, userId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (fresh query) |
| `GetUpcoming(ctx, userId, days)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments with date filter |
| All events | QUEUE FABRIC | IQueueService → Redis Streams | EnqueueAsync → EventFeedPersonalized |

### DNA Compliance (all 7 patterns) ✅
IEventsPersonalizationService : MicroserviceBase. BuildSearchFilter skips empty interest fields.
EventsPersonalizationService timeout: 2s (T51 QG-4). DNA-7: traceparent forwarded.

### Machine / Freedom
```
MACHINE: Event recommendations cache TTL = 4h (Redis). Timeout = degrade (empty events list).
FREEDOM: Event recommendation scoring weights (industry relevance, location, learning path match)
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FAMILY 19 REGISTRY ENTRY (for ENGINE_ARCHITECTURE_UNIFIED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
FAMILY: 19
NAME: Business Onboarding Intelligence
FLOW: FLOW-02 (business-onboarding.md)
FACTORIES: F182–F189 (8 factories, ~32 methods)
TASK TYPES: T50, T51, T52
FLOW TEMPLATE: business-onboarding-v1.json
PRIMARY FABRICS: DATABASE FABRIC (MongoDB, PostgreSQL, Redis, Elasticsearch) + QUEUE FABRIC + AI ENGINE FABRIC
TRIGGER: QuestionnaireCompleted (gate from FLOW-01, Family 18)
TERMINAL EVENT: OnboardingCompleted (gate for FLOW-03/04/05/07)
DNA COMPLIANCE: 56/56 (8 factories × 7 patterns including DNA-7)
BACKWARD COMPAT: ✅ F1–F181 unchanged; additive only
```

---

# VERSION LINEAGE UPDATE (for ENGINE_ARCHITECTURE_UNIFIED)

```
VERSION HISTORY:
  F1–F53:    V39 baseline (factory-first foundation)
  F54–F68:   V43 extension (execution + infra + mgmt fabrics)
  F69–F165:  V40 master expansion (all catalog families)
  F166–F173: FLOW-05 — Lesson Gamification (Family 17)
  F174–F181: FLOW-01 — User Registration (Family 18)
  F182–F189: FLOW-02 — Business Onboarding Intelligence (Family 19) ← THIS PHASE
  F190–F196: FCE — Flow Creation Engine (Family 20) ← P4 will add
```

---

# STATE SAVE — Phase 2 Complete

```
FCE-EXEC-P2: COMPLETE
DATE: 2026-02-25

DELIVERED:
  ✅ F182 — IBusinessProfileService (full fabric resolution + DNA × 7)
  ✅ F183 — IMatchingService (full fabric resolution + DNA × 7)
  ✅ F184 — IAnalyticsSegmentService (full fabric resolution + DNA × 7)
  ✅ F185 — ILearningProgramService (full fabric resolution + DNA × 7)
  ✅ F186 — IRecommendationEngineService (full fabric resolution + DNA × 7)
  ✅ F187 — IBusinessCategoryService (full fabric resolution + DNA × 7)
  ✅ F188 — IFeedPersonalizationService (full fabric resolution + DNA × 7)
  ✅ F189 — IEventsPersonalizationService (full fabric resolution + DNA × 7)
  ✅ Family 19 registry entry
  ✅ Version lineage updated (F182-F189 inserted correctly between F181 and F190)

FACTORY COUNT: F1–F189 (continuous, no gaps)
DNA COMPLIANCE: 56/56 for FLOW-02 (8 factories × 7 patterns)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8B — FCE EXTENSION (Family 20 + Queue + DNA-7 + BFA)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FAMILY 20 — FLOW CREATION ENGINE (FCE)
# F190–F196 + Queue Fabric Extension | Source: XIIGEN_FCE_MERGED_v2.md
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## F190 — IFlowDefinitionService
**Family:** 20 — Flow Creation Engine
**Task Types:** T53, T54, T57
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `StoreDefinition(ctx, flowDef)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | StoreDocument (flow-definitions index) |
| `GetDefinition(ctx, flowId, version)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments with BuildSearchFilter({flowId, version, tenantId}) |
| `ListDefinitions(ctx, filter)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | SearchDocuments (filter auto-skips empty fields via BuildSearchFilter) |
| `PublishDefinition(ctx, flowId, version)` | DATABASE FABRIC + QUEUE FABRIC | IDatabaseService → Elasticsearch (status update) + IQueueService → Redis Streams (FlowDefinitionPublished) |
| `DeprecateDefinition(ctx, flowId, version)` | DATABASE FABRIC | IDatabaseService → Elasticsearch | StoreDocument (status=deprecated) |

### DNA Compliance (all 7 patterns)
| Pattern | Implementation |
|---------|---------------|
| DNA-1 ParseDocument | Flow definition stored/retrieved as Dictionary<string,object>; NEVER typed FlowDefinition model |
| DNA-2 BuildSearchFilter | `BuildSearchFilter({flowId, version, tenantId, status})` auto-skips empty |
| DNA-3 DataProcessResult | All methods return `DataProcessResult<Dictionary<string,object>>` |
| DNA-4 MicroserviceBase | `class FlowDefinitionService : MicroserviceBase` |
| DNA-5 Scope Isolation | tenantId on ALL Elasticsearch queries (multi-tenant flow registry) |
| DNA-6 DynamicController | Routes via DynamicController config |
| DNA-7 Trace Context | traceparent forwarded on PublishDefinition → FlowDefinitionPublished event |

### Machine / Freedom
```
MACHINE: Published flows are immutable — StoreDefinition creates new version, never overwrites
         FlowDefinitionPublished event emitted on every successful publish
FREEDOM: Elasticsearch index name, version format (semver configurable), retention policy
```

---

## F191 — IFlowValidationService
**Family:** 20 — Flow Creation Engine
**Task Types:** T53, T58
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `ValidateDefinition(ctx, flowDef)` | AI ENGINE FABRIC + DATABASE FABRIC | IAiProvider → GenerateAsync() (semantic check) + Elasticsearch (factory registry lookup) |
| `CompileToDAG(ctx, flowDef)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (compiled DAG index) |
| `CheckFactoryRegistry(ctx, factoryIds[])` | DATABASE FABRIC | IDatabaseService → Elasticsearch (factory registry) |
| `ValidateCorrelationKeys(ctx, nodes[])` | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema registry via F194) |

### DNA Compliance (all 7 patterns) ✅
FlowValidationService : MicroserviceBase. ValidateDefinition returns DataProcessResult<Dictionary<string,object>>.
AI validation uses IAiProvider (never direct model call). DNA-7: traceparent on AI call.

### Machine / Freedom
```
MACHINE: All factory references validated against live registry; invalid = validation failure
         Compiled DAG stored immutably alongside flow definition
FREEDOM: AI model for semantic validation (configurable via IAiProvider config)
         Validation strictness level (strict/permissive — admin toggle)
```

---

## F192 — IFlowRuntimeService
**Family:** 20 — Flow Creation Engine
**Task Types:** T54, T59
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `StartRun(ctx, flowId, version, triggerPayload)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (flow-runs index) |
| `PersistStepState(ctx, runId, stepId, state)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (run-steps index) |
| `RecoverRun(ctx, runId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (load last persisted state) |
| `CompleteRun(ctx, runId, status)` | DATABASE FABRIC + QUEUE FABRIC | IDatabaseService → Elasticsearch + IQueueService → Redis Streams (FlowRunCompleted) |
| `SupersedeRun(ctx, runId, newTrigger)` | DATABASE FABRIC + QUEUE FABRIC | IDatabaseService (status=superseded) + IQueueService (SupersedeAsync) |
| `GetRunStatus(ctx, runId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch |

### DNA Compliance (all 7 patterns) ✅
FlowRuntimeService : MicroserviceBase. All state operations return DataProcessResult<Dictionary<string,object>>.
DNA-5: tenantId + runId on all run state queries. DNA-7: runId propagated as traceId.

### Machine / Freedom
```
MACHINE: Run state persisted after EVERY step (T54 IR-1)
         Running instances pinned to start version (T54 IR-2)
         SupersedeRun cancels in-flight run on debounce window hit
FREEDOM: Run retention policy (default: 90 days), state index name, max concurrent runs per tenant
```

---

## F193 — IFlowStepExecutor
**Family:** 20 — Flow Creation Engine
**Task Types:** T54
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `ExecuteStep(ctx, step, runContext)` | RESOLVED AT RUNTIME | Step's declared factory resolved via CreateAsync() — executor is factory-of-factories |
| `HandleFork(ctx, forkNode, runContext)` | QUEUE FABRIC | IQueueService → Redis Streams (publish branch triggers) |
| `HandleJoin(ctx, joinNode, runContext)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (wait-for-event state) |
| `HandleTimeout(ctx, node, policy)` | QUEUE FABRIC | IQueueService → Redis Streams (timeout event) |
| `HandleWaitForEvent(ctx, node, correlationKey)` | DATABASE FABRIC + QUEUE FABRIC | Elasticsearch (pending waits index) + Redis Streams (event subscription) |

### DNA Compliance (all 7 patterns) ✅
FlowStepExecutor : MicroserviceBase. ExecuteStep returns DataProcessResult<Dictionary<string,object>>.
DNA-7: parent traceparent injected into every step execution context.
CRITICAL: ExecuteStep NEVER imports specific factory implementations — uses CreateAsync() only.

### Machine / Freedom
```
MACHINE: ExecuteStep resolves factory via CreateAsync() — no direct instantiation (T54 IR-5)
         HandleTimeout follows node's declared policy (required → fail; optional → degrade)
FREEDOM: Timeout values per node type (configured in flow DSL, overridable by admin)
         Fork initialization parallelism (sequential vs true parallel, default: parallel)
```

---

## F194 — ISchemaRegistryService
**Family:** 20 — Flow Creation Engine
**Task Types:** T53, T55
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `RegisterSchema(ctx, eventType, schema)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (event-schemas index) |
| `GetSchema(ctx, eventType, version)` | DATABASE FABRIC | IDatabaseService → Elasticsearch |
| `ValidatePayload(ctx, eventType, payload)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (schema lookup + validation) |
| `ListSchemas(ctx, filter)` | DATABASE FABRIC | IDatabaseService → Elasticsearch |
| `DetectSchemaChange(ctx, eventType, newSchema)` | DATABASE FABRIC + QUEUE FABRIC | Elasticsearch (schema diff) + IQueueService (SchemaChangeDetected → BFA G1) |

### DNA Compliance (all 7 patterns) ✅
SchemaRegistryService : MicroserviceBase.
DetectSchemaChange emits SchemaChangeDetected → triggers BFA G1 (event payload change detector).
DNA-7: traceparent on DetectSchemaChange event.

### Machine / Freedom
```
MACHINE: Schema changes detected → SchemaChangeDetected event ALWAYS emitted (BFA G1 trigger)
         Schema versions immutable — changes create new version
FREEDOM: Schema format (JSON Schema / Avro / Protobuf — configurable provider)
         Validation strictness (strict / permissive / audit-only)
```

---

## F195 — IFlowDesignerService
**Family:** 20 — Flow Creation Engine
**Task Types:** T56
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `GetPalette(ctx, tenantId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (node-palette-config index) |
| `SaveDraft(ctx, draftFlow)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (flow-drafts index) |
| `GetDraft(ctx, draftId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch |
| `PublishFlow(ctx, draftId)` | QUEUE FABRIC | IQueueService → Redis Streams (FlowDefinitionSubmitted → T53) |
| `GetComponentModel(ctx)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (ui-component-model-config index) |
| `ResolveRenderer(ctx)` | RESOLVED AT RUNTIME | Config: "ui.platform" → React / Angular / ReactNative / Web |

### DNA Compliance (all 7 patterns) ✅
FlowDesignerService : MicroserviceBase. ZERO platform-specific imports.
Component models, node palettes, theme configs all in Elasticsearch. DNA-7: traceparent on all calls.

### Machine / Freedom
```
MACHINE: ZERO hardcoded platform values — renderer resolved via config (T56 IR-1/IR-3)
         PublishFlow routes through T53 (never direct deployment)
FREEDOM: Platform (React/Angular/RN), node palette contents (admin-configurable),
         theme, layout direction, node spacing — ALL via Elasticsearch config docs
```

---

## F196 — IFlowMonitorService
**Family:** 20 — Flow Creation Engine
**Task Types:** T56
**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

### Fabric Resolution
| Method | Fabric | Provider | Pattern |
|--------|--------|---------|---------|
| `GetRunStatus(ctx, runId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (flow-runs index) |
| `GetActiveRuns(ctx, filter)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (filter: status=running) |
| `GetStepHistory(ctx, runId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (run-steps index) |
| `GetErrorTrace(ctx, runId)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (run-errors index) |
| `GetFlowMetrics(ctx, flowId, timeRange)` | DATABASE FABRIC | IDatabaseService → Elasticsearch (aggregation query) |
| `StreamRunUpdates(ctx, runId)` | QUEUE FABRIC | IQueueService → Redis Streams (subscribe to run events) |

### DNA Compliance (all 7 patterns) ✅
IFlowMonitorService : MicroserviceBase (separate from designer — F195 ≠ F196).
All monitoring read operations via DATABASE FABRIC only (never direct DB calls).

### Machine / Freedom
```
MACHINE: Real-time updates via QUEUE FABRIC subscription (never polling)
         Error traces include DNA-7 traceparent for cross-service debugging
FREEDOM: Metrics retention window (default 30 days), dashboard refresh rate, alert thresholds
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUEUE FABRIC EXTENSION (+3 METHODS)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The outbox and supersession patterns are FABRIC concerns, not factory concerns.
Services call ONE method on IQueueService — complexity is hidden in the fabric.

```
EXTENDED: IQueueService (Skill 04 — QUEUE FABRIC)
Existing: EnqueueAsync, DequeueAsync, AcknowledgeAsync
NEW METHODS:

OutboxWriteAsync(ctx, domainEvent, dbWriteAction)
  → Atomically: execute dbWriteAction AND enqueue domainEvent
  → Fabric internally: writes to outbox table in same DB transaction
  → Fabric internally: CDC/polling relay publishes to Redis Streams
  → Service code: ONE call. No orchestration of two concerns.

OutboxRelayAsync(ctx, outboxEntry)
  → Internal use by outbox relay process
  → Reads pending outbox entries → publishes to Redis Streams → marks delivered

SupersedeAsync(ctx, correlationKey, newEvent, windowSeconds)
  → If existing in-flight event matches correlationKey within windowSeconds:
     cancel existing, enqueue newEvent
  → Implements debounce / latest_wins policy (T50 debounce, T54 supersession)
  → Returns DataProcessResult<{superseded: bool, previousEventId: string}>
```

**Architectural rationale:** Outbox is a DATABASE + QUEUE co-concern. Services should
call `_queueService.OutboxWriteAsync()` — one call. The queue fabric internally handles
the atomic write + relay. Complexity moves DOWN into the fabric. This IS the Freedom
Machine philosophy.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DNA PATTERN 7 — W3C TRACE CONTEXT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
DNA-7: W3C Trace Context (traceparent / tracestate)
Enforced by: AF-7 Compliance station on ALL generated services
Enforcement mechanism: F195 IFlowDesignerService → FCE compilation pipeline

RULE:
  ALL generated services MUST:
  1. Accept traceparent in incoming requests/events
  2. Forward traceparent to ALL downstream calls (HTTP, queue publishes, AI calls, DB calls)
  3. Generate new traceparent child span for each operation
  4. NEVER lose trace context across service boundaries

IMPLEMENTATION:
  MicroserviceBase provides: ctx.Tracer — OpenTelemetry-based trace context
  Services use: ctx.Tracer.StartSpan(), ctx.traceparent — never manual header setting
  Queue events: traceparent included in CloudEvents extension attribute

VIOLATION EXAMPLES:
  ❌ this.aiProvider.GenerateAsync(prompt) // missing context
  ✅ this.aiProvider.GenerateAsync(prompt, { traceparent: ctx.traceparent })

  ❌ queueService.EnqueueAsync(event) // no trace propagation
  ✅ queueService.EnqueueAsync(event, ctx) // ctx carries traceparent

DNA COMPLIANCE COUNT:
  Post-FLOW-02: 56/56 (8 factories × 7 patterns)
  Post-FCE:     +49 (7 factories × 7 patterns)
  TOTAL:        261/261 (ALL factories × 7 patterns)
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BFA ENFORCEMENT INDEXES — G1–G7 (ENFORCED)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These close the 7 gaps identified in V62_BFA_STRESS_TEST.md.
Status changes from IDENTIFIED → ENFORCED.

## G1 — EVENT_SCHEMA_CHANGE Index
```
Closes: V62 Gap 1 (event payload changes don't trigger T32)
Mechanism: F194.DetectSchemaChange() emits SchemaChangeDetected → triggers T32 pipeline
Index: BFA_EVENT_SCHEMA_INDEX (Elasticsearch)
  Stores: eventType, version, schemaHash, publishingService, consumingServices[]
  Trigger: Any change to registered event schema → T32 auto-fires
Status: ENFORCED ✅
```

## G2 — EVENT_PROPAGATION_CHAIN Index
```
Closes: V62 Gap 2 (event chain propagation not tracked)
Mechanism: Every EnqueueAsync writes publisher + consumer metadata to propagation index
Index: BFA_EVENT_PROPAGATION_INDEX (Elasticsearch)
  Stores: eventType, publisherId, consumerId[], payloadFields[], correlationKey
  Trigger: Field deletion on any entity → propagation index queried → impact analysis
Status: ENFORCED ✅
```

## G3 — DISTRIBUTED_STATE_MACHINE Index
```
Closes: V62 Gap 3 (distributed state machine not understood)
Mechanism: F192.StartRun() registers state machine topology in BFA index
Index: BFA_STATE_MACHINE_INDEX (Elasticsearch)
  Stores: flowId, stateOwners[{service, managedStates[], gateEvents[]}]
  Trigger: State transition change → cross-service gate event dependencies checked
Status: ENFORCED ✅
```

## G4 — API_CONTRACT_CHANGE Index
```
Closes: V62 Gap 4 (API contract changes don't trigger T32)
Mechanism: DynamicController registers all route signatures in BFA index on startup
Index: BFA_API_CONTRACT_INDEX (Elasticsearch)
  Stores: routePath, method, requestSchema, responseSchema, version, consumingClients[]
  Trigger: Route path/method/schema change → T32 fires for affected consumers
Status: ENFORCED ✅
```

## G5 — FLOW_DEPENDENCY_GRAPH Index
```
Closes: V62 Gap 5 (flow-to-flow dependency via events not tracked)
Mechanism: T53 compilation registers flow's input triggers + output events in index
Index: BFA_FLOW_DEPENDENCY_INDEX (Elasticsearch)
  Stores: flowId, triggerEvents[], outputEvents[], consumingFlows[{flowId, triggerEvent}]
  Trigger: Output event payload changes → all consuming flows re-validated
  FLOW-02 registration:
    outputEvents: [BusinessProfileCreated, OnboardingCompleted, ...]
    consumingFlows: [FLOW-03, FLOW-04, FLOW-05, FLOW-07]
Status: ENFORCED ✅
```

## G6 — MULTI_DB_ENTITY_REGISTRY Index
```
Closes: V62 Gap 6 (multi-database entity fragments not tracked)
Mechanism: F190–F189 factory registration declares entity fragments per DB
Index: BFA_ENTITY_REGISTRY_INDEX (Elasticsearch)
  Stores: entityName, fragments[{dbType, provider, collection/table, fields[]}]
  Example (User entity):
    fragments: [
      {db: PostgreSQL, table: "users", fields: [id, email, status]},
      {db: MongoDB, collection: "user_profiles", fields: [userId, businessDetails]},
      {db: Redis, key: "session:{userId}", fields: [accessToken, expiresAt]},
      {db: Elasticsearch, index: "user-events", fields: [userId, eventType]}
    ]
  Trigger: Field deletion in ANY fragment → all other fragments checked for cross-reference
Status: ENFORCED ✅
```

## G7 — SEMANTIC_RULE_ANALYZER
```
Closes: V62 Gap 7 (business rule semantics beyond field-level changes)
Mechanism: F191.ValidateDefinition() uses IAiProvider for semantic rule analysis
Component: IBfaSemanticAnalyzer (AI-powered, backed by IAiProvider via AI ENGINE FABRIC)
  Input: business rule description + change description
  Output: DataProcessResult<{semanticImpact, affectedRules[], severity, recommendation}>
  Example: "merge preserves older userId" → AI detects foreign key cascade implications
Trigger: Business logic changes flagged by developer (manual trigger + auto-detection via AST)
Status: ENFORCED ✅
```

---

# FAMILY 20 REGISTRY ENTRY (for ENGINE_ARCHITECTURE_UNIFIED)

```
FAMILY: 20
NAME: Flow Creation Engine (FCE)
FLOW: FCE (XIIGEN_FCE_MERGED_v2.md)
FACTORIES: F190–F196 (7 factories, ~34 methods)
QUEUE FABRIC METHODS: +3 (OutboxWriteAsync, OutboxRelayAsync, SupersedeAsync)
TASK TYPES: T53–T59
FLOW TEMPLATES: business-onboarding-v2.json (T59 migration reference)
PRIMARY FABRICS: DATABASE FABRIC (Elasticsearch primary) + QUEUE FABRIC + AI ENGINE FABRIC
TRIGGER: Multiple (FlowDefinitionSubmitted, FlowRunRequested, CapabilityGapDetected)
DNA-7: W3C Trace Context — 7th pattern enforced on ALL generated services
BFA ENFORCEMENT INDEXES: G1–G7 (all ENFORCED)
DNA COMPLIANCE: 49/49 (7 factories × 7 patterns)
BACKWARD COMPAT: ✅ F1–F189 unchanged; additive only
```

---

# STATE SAVE — Phase 4 Complete

```
FCE-EXEC-P4: COMPLETE
DATE: 2026-02-25

DELIVERED:
  ✅ F190 — IFlowDefinitionService (full fabric resolution + DNA × 7)
  ✅ F191 — IFlowValidationService (full fabric resolution + DNA × 7)
  ✅ F192 — IFlowRuntimeService (full fabric resolution + DNA × 7)
  ✅ F193 — IFlowStepExecutor (full fabric resolution + DNA × 7)
  ✅ F194 — ISchemaRegistryService (full fabric resolution + DNA × 7)
  ✅ F195 — IFlowDesignerService (full fabric resolution + DNA × 7)
  ✅ F196 — IFlowMonitorService (full fabric resolution + DNA × 7)
  ✅ Queue Fabric +3 methods (OutboxWriteAsync, OutboxRelayAsync, SupersedeAsync)
  ✅ DNA-7 — W3C Trace Context (7th pattern enforced on all services)
  ✅ BFA G1–G7 all ENFORCED (closes V62 gaps)
  ✅ Family 20 registry entry

FACTORY COUNT: F1–F196 (continuous, no gaps)
DNA COMPLIANCE: 261/261 (all factories × 7 patterns)
BFA GAPS: 0 open (all 7 closed and enforced)
TOTAL IRON RULES (T50-T59): 41
TOTAL QUALITY GATES (T50-T59): 38
BACKWARD COMPAT: ✅ F1–F189 and T1–T52 unchanged

PENDING: P5 → SESSION_STATE finalize

RESUME: "Continue FCE-EXEC from Phase 5"
```

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9 — GUARDRAILS (Layer 4)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 6 DNA Patterns (Enforced on ALL generated code)

| # | Pattern | Rule |
|---|---------|------|
| DNA-1 | ParseDocument | Dictionary<string,object>, not typed models |
| DNA-2 | BuildQueryFilters | Empty fields auto-skipped |
| DNA-3 | DataProcessResult<T> | Never throw for business logic |
| DNA-4 | MicroserviceBase | 19 components inherited by ALL services |
| DNA-5 | Scope Isolation | tenantId on every query |
| DNA-6 | DynamicController | No entity-specific controllers |

### DNA Compliance by Flow

| Flow | Factories | Methods | DNA Cells | Compliance |
|------|-----------|---------|-----------|------------|
| FLOW-05 | 8 (F166-F173) | 31 | 48/48 | ✅ 100% |
| FLOW-01 | 8 (F174-F181) | 24 | 48/48 | ✅ 100% |
| **Combined** | **16** | **55** | **96/96** | **✅ 100%** |

### MACHINE / FREEDOM Classification (Combined)

| Component | MACHINE (Fixed) | FREEDOM (Admin-Configurable via ES) |
|-----------|----------------|--------------------------------------|
| **FLOW-05 Gamification** | Point formula, level formula (×1.5+100), server-side only, idempotency, BigInt, persist-before-event | Point values, streak thresholds, achievement definitions |
| **FLOW-05 Learning** | Max 3 changes, min 2 lessons, required modules, safe default, validation gate | Score thresholds, pace multipliers, ML model, timeout |
| **FLOW-05 Social** | Consent gate, pseudonymity (3), 4 criteria, comment types, FLOW-04 reuse | Audience weights, caps, similarity threshold |
| **FLOW-05 Grading** | 4 criteria (accuracy/depth/clarity/creativity), 1-5 scale | **None** — schema is MACHINE |
| **FLOW-05 Ledger** | Immutable append-only, BigInt storage | **None** — audit trail is MACHINE |
| **FLOW-01 Auth** | OAuth2, bcrypt-12, RS256, merge-older-userId, enumeration prevention | SSO providers, JWT expiry, rate limits, password rules |
| **FLOW-01 Verification** | 256-bit tokens, single-use, one active per email, server-side expiry | Token expiry (24hr), reminder schedule, email templates |
| **FLOW-01 Onboarding** | 3 criteria ALL required, completedAt immutable, server-side validation | Question count, delivery method, AI model, skip option |

## Business Flow Arbiter (BFA)

6-step T32 engine for cross-service conflict detection BEFORE code ships.
(See V62_BFA_STRESS_TEST.md for detailed test scenarios and 7 identified gaps.)

### BFA Capabilities (Post FLOW-01 Extension)

| Capability | Status | Added By |
|-----------|--------|----------|
| Entity change detection | ✅ | Original V62 |
| Event payload schema tracking | ✅ | FLOW-05 (addresses G1) |
| Event chain propagation analysis | ✅ | FLOW-05 (addresses G2) |
| Distributed state machine tracking | ✅ | FLOW-05 (addresses G3) |
| **API contract change detection** | **✅ NEW** | **FLOW-01 (addresses G4)** |
| Flow-to-flow event dependency | ✅ | FLOW-05 (addresses G5) |
| Multi-DB entity fragment indexing | ✅ | FLOW-05 (addresses G6) |
| **Business rule semantic auditing** | **✅ NEW** | **FLOW-01 (addresses G7)** |

All 7 V62 gaps are now addressed.

### BFA Event Chain Propagation Index (G2)

**FLOW-05 Event Chain:**
```
QuestionnaireAnswered (input from FLOW-02)
  ├── GamificationPointsAwarded (F166) → [UI, Analytics]
  │   ├── UserLeveledUp (conditional) → [Notification, UI, FLOW-02 matching]
  │   └── AchievementUnlocked (conditional) → [Notification, UI, Social]
  ├── LearningPlanAdapted (F167) → [Notification, Analytics]
  └── QuestionnairePostCreated (F171, conditional: consent gate)
      └── AudienceIdentified → PostRanked → PostDistributed (via FLOW-04)
          └── ENGAGEMENT LOOP: AnswerGraded / AnswerCommented → T44 re-entry
```

**FLOW-01 Event Chain:**
```
POST /auth/sso/{provider} OR POST /auth/register
  ├── SSO PATH: UserSSOAuthenticated → UserCreated → T49
  └── EMAIL PATH: UserRegistrationInitiated → VerificationEmailSent
      → EmailVerified → UserActivated → T49
T49: QuestionnaireRequired → QuestionnaireSent → QuestionnaireCompleted
  → UserOnboardingCompleted (GATE for FLOW-02/03/04/05)
```

### Cross-Flow Event Contracts

| Event | Publisher | Consumers | Contract |
|-------|-----------|-----------|----------|
| UserOnboardingCompleted (E10) | FLOW-01 T49 | FLOW-02/03/04/05 | MUST include onboardingSteps[], completedAt |
| QuestionnaireCompleted (E9) | FLOW-01 T49 | FLOW-05 | Responses queryable by gamification |
| UserLeveledUp | FLOW-05 T44 | FLOW-02 | New capabilities at higher levels |
| QuestionnairePostCreated | FLOW-05 T46 | FLOW-04 | Must not conflict with FLOW-04 PostCreated schema |

### BFA Stress Tests (13 total)

| Tests | Flow | Coverage |
|-------|------|----------|
| T9-T14 | FLOW-05 | Event schema, chain propagation, pseudonymity, MACHINE enforcement, backward compat, multi-DB |
| T15-T21 | FLOW-01 | API contract, business rule semantic, account merge, state machine, token lifecycle, cross-flow gate, dormancy |

**See:** FLOW05_ENGINE_EXTENSION_MERGED_FINAL.md Appendix E, FLOW01_ENGINE_EXTENSION.md Phase 4

## Promotion Ladder

```
GENERATED → INJECTED → MINIMAL → CORE
(V43 extended: DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE)
```

### Promotion by Contract (from FLOW-05 Appendix C)

| Contract | GENERATED | INJECTED | MINIMAL | CORE |
|----------|-----------|----------|---------|------|
| T44 | GamificationService skeleton | AwardPoints tested (InfluxDB container) | Rate limit + idempotency tested | Achievement validation in staging |
| T45 | LearningPlanService skeleton | ML pipeline tested (mock model) | Max 3 + min 2 enforced | Safe default validated in staging |
| T46 | PostService + GradeService + AudienceService | Consent gate + privacy tested | FLOW-04 integration end-to-end | Pseudonymity + rate limiting in staging |
| T47 | AuthService skeleton | SSO + email paths tested | Account merge + CSRF tested | JWT rotation + enumeration prevention |
| T48 | VerificationPipeline skeleton | Token lifecycle tested | Wait state + reminder tested | DLQ + concurrent token handling |
| T49 | OnboardingOrchestrator skeleton | Questionnaire generation tested | Completion criteria enforced | Cross-flow gate events validated |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 10 — COMPLIANCE FINDINGS (from Audit)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The 9-Point Compliance Checklist

| # | Requirement | What It Means |
|---|------------|---------------|
| R1 | FABRIC INTERFACES | All through IDatabaseService, IQueueService, IAiProvider, IRagService, IFlowOrchestrator |
| R2 | FACTORY PATTERN | IExternalServiceFactory<T>.CreateAsync() with config-first routing |
| R3 | ENGINE CONTRACTS (full) | ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, QUALITY GATES |
| R4 | AF STATION MAPPING | Which of AF-1→AF-11 generates/reviews/judges |
| R5 | DNA PATTERNS (6) | All 6 enforced on every generated service |
| R6 | BFA + GUARDRAILS | Cross-flow conflict detection, promotion ladder |
| R7 | FLOW = ENGINE OUTPUT | JSON DAGs generated by engine, not written by hand |
| R8 | BACKWARD COMPAT | Existing T/F numbers unchanged |
| R9 | MUST NOT list | No standalone services, no skipped fabric, no stubs, no direct imports, no typed models |

## What Must Be Rebuilt for V45+ Content

Any content from V45-V69 that needs to be used MUST be rebuilt with:
1. Factory interface registration via CreateAsync()
2. Fabric resolution mapping (which fabric each factory resolves through)
3. Full engine contract format (not one-line stubs)
4. AF station mapping
5. MicroserviceBase inheritance
6. DNA-1 compliance (Dictionary, not typed models)
7. DNA-6 compliance (DynamicController)

## Salvageable Content from V63-V69

- ✅ MACHINE/FREEDOM classification tables (excellent business logic)
- ✅ Iron Rules (IR-47+) — good guardrails, just need engine context
- ✅ FOG quality gates — good gates, need AF station mapping
- ✅ BFA invariants — useful cross-flow checks
- ✅ Skills Factory patterns — need factory wrapping + fabric resolution

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 11 — CURRENT SYSTEM STATE (POST FLOW-03 MERGE)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Metric | Count | Source |
|--------|-------|--------|
| Fabric interfaces (Layer 0) | 6 | DATABASE, QUEUE (+3 methods), AI ENGINE, RAG, CORE, FLOW ENGINE |
| Factory families | 21 | 20 previous + Event Promotion |
| Factory interfaces | F1-F204 | F1-F196 (existing) + F197-F204 (FLOW-03) |
| Task types | T1-T62 | T1-T58 (existing) + T59-T62 (FLOW-03) |
| Flow templates | 13 | 12 existing + event-promotion-v1 |
| Flows (engine-extended) | FLOW-01, FLOW-02, FLOW-03, FLOW-05 | + FCE meta-capability |
| AF stations | 11 | AF-1 through AF-11 |
| Sub-engines | 3 | INVENTORY, SYNTHESIS, JUDGMENT |
| DNA patterns | 7 | 6 original + DNA-7 (W3C Trace Context) |
| Queue Fabric methods | 6 | 3 original + OutboxWriteAsync + SupersedeAsync + CorrelateAsync |
| Quality systems | 2 | ACS-21 (LITE) + 70-Gate (STANDARD/DEEP) |
| Promotion stages | 6 | DRAFT→WIRED→VALIDATED→INJECTED→MINIMAL→CORE |
| BFA capabilities | Events + Entities + APIs + Business Rules + G1-G7 ENFORCED + FLOW-03 REINFORCED | All V62 gaps closed + reinforced |
| BFA conflict rules | CF-1–CF-17 | CF-1–CF-9 (existing) + CF-10–CF-17 (FLOW-03) |
| V62 gaps | 0 open (7/7 ENFORCED + REINFORCED) | G1-G7: 2 enforcement layers (FCE + FLOW-03) |
| DNA compliance | 317/317 | 261 existing + 56 FLOW-03 (8 factories × 7 patterns) |
| Iron Rules (all contracts) | 72 | 41 existing + 31 FLOW-03 (T59:8+T60:8+T61:8+T62:7) |
| Quality Gates (all contracts) | 62 | 38 existing + 24 FLOW-03 (T59:5+T60:6+T61:7+T62:6) |
| Backward compat breaks | 0 | T1-T58, F1-F196 untouched |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 12 — FLOW-03 FACTORY INTERFACES (F197–F204)
# Family 21: Event Promotion
# Merged: 2026-02-25 | Source: FLOW03_ENGINE_EXTENSION_COMBINED.md
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 21 Overview: Event Promotion

An organizer creates an event → the engine generates: store → moderate → index + analyze →
score audience → segment tiers → inject feeds → notify → track campaign → bill.
8 factories, ~30 methods, all fabric-resolved, all DataProcessResult<T>.

### F197 — IEventService
```
Family: 21 — Event Promotion
Methods: StoreWithOutboxAsync, UpdateStatusAsync, DecrementCapacityAsync,
         ArchiveStaleDraftAsync, TriggerRenotificationAsync, GetEventAsync
Fabric Resolution:
  Primary: DATABASE FABRIC → PostgreSQL (events table, state machine)
  Cache: DATABASE FABRIC → Redis (event:{tenantId}:{eventId}, TTL configurable)
  Outbox: QUEUE FABRIC → OutboxWriteAsync (atomic store+publish)
DNA Compliance: 7/7 ✅
Machine: 6-state machine (draft→submitted→moderated→promoted→completed→cancelled),
         rate limit 5/day/organizer, no backward state transitions
Freedom: Event categories, pricing tiers, moderation sensitivity level — ES config docs
Factory Creation:
  var svc = await _factory.CreateAsync<IEventService>(ctx);
  var result = await svc.StoreWithOutboxAsync(eventDoc, scopeId, ct);
```

### F198 — IEventMatchingService
```
Family: 21 — Event Promotion
Methods: CalculateMatchScoresAsync, GetSimilarUsersAsync, ScoreBatchAsync,
         FallbackBroadenAsync
Fabric Resolution:
  Primary: AI ENGINE FABRIC (Skill 07) → AiDispatcher multi-model consensus
  RAG: RAG FABRIC (Skill 00b) → IRagService Vector strategy (interest similarity)
  Profiles: DATABASE FABRIC (Skill 05) → Elasticsearch (user profile data)
DNA Compliance: 7/7 ✅
Machine: 5-factor formula (interest 35%, location 25%, time 20%, price 10%, social 10%),
         score ∈ [0.0, 1.0], weights must sum to 1.0
Freedom: Factor weights, fallback broadening radius — ES config docs
Factory Creation:
  var svc = await _factory.CreateAsync<IEventMatchingService>(ctx);
  var result = await svc.CalculateMatchScoresAsync(eventId, config, scopeId, ct);
```

### F199 — IAudienceSegmentationService
```
Family: 21 — Event Promotion
Methods: SegmentAudienceAsync, GetSegmentAsync
Fabric Resolution:
  Primary: DATABASE FABRIC (Skill 05) → Redis (segment cache, TTL: 4h)
DNA Compliance: 7/7 ✅
Machine: Tier assignment (strong ≥0.75, medium ≥0.50, weak ≥0.25),
         feed position mapping (>0.8→top3, >0.6→top10, >0.4→inView, else→belowFold)
Freedom: Tier thresholds (admin-configurable via ES config doc)
Factory Creation:
  var svc = await _factory.CreateAsync<IAudienceSegmentationService>(ctx);
  var result = await svc.SegmentAudienceAsync(eventId, matchScores, thresholds, scopeId, ct);
```

### F200 — ISearchIndexService
```
Family: 21 — Event Promotion
Methods: IndexEventAsync, SearchEventsAsync
Fabric Resolution:
  Primary: DATABASE FABRIC (Skill 05) → Elasticsearch (event search index)
DNA Compliance: 7/7 ✅
Machine: Index schema validation, field mapping
Freedom: ES refresh policy (default: wait_for), searchable field configuration — ES config docs
Factory Creation:
  var svc = await _factory.CreateAsync<ISearchIndexService>(ctx);
  var result = await svc.IndexEventAsync(eventDoc, scopeId, ct);
```

### F201 — IFeedInjectionService (CQRS Write Path)
```
Family: 21 — Event Promotion
Methods: InjectEventToFeedsAsync, InjectBatchAsync, RecalculatePositionsAsync
Fabric Resolution:
  Primary: DATABASE FABRIC (Skill 05) → Redis (sorted sets: ZADD with match score)
NOTE: WRITE path only. F188/F189 (FLOW-02) = READ path. CQRS boundary.
DNA Compliance: 7/7 ✅
Machine: Placement rules (>0.8→top3, >0.6→top10, >0.4→inView, else→belowFold)
Freedom: Feed TTL, position boost for new events — ES config docs
Factory Creation:
  var svc = await _factory.CreateAsync<IFeedInjectionService>(ctx);
  var result = await svc.InjectEventToFeedsAsync(eventId, segments, scopeId, ct);
```

### F202 — INotificationOrchestrationService
```
Family: 21 — Event Promotion
Methods: RouteNotificationAsync, BatchDeliverAsync, CancelCampaignNotificationsAsync,
         GetDeliveryStatusAsync
Fabric Resolution:
  Primary: QUEUE FABRIC (Skill 04) → IQueueService → Redis Streams (priority lanes per channel)
DNA Compliance: 7/7 ✅
Machine: Channel rules (in-app=always, push=enabled+>0.6, email=digest+>0.4, SMS=urgent+>0.8+50km),
         SLA (strong ≤5min, medium ≤30min, weak ≤1hr), backpressure threshold
Freedom: Notification copy templates, email digest schedule, SMS distance threshold — ES config docs
Security: Organizer CANNOT bypass F202 to message attendees directly. Violation = BUILD FAILURE.
Factory Creation:
  var svc = await _factory.CreateAsync<INotificationOrchestrationService>(ctx);
  var result = await svc.RouteNotificationAsync(userId, eventId, matchScore, userPrefs, scopeId, ct);
```

### F203 — IPaymentIntegrationService
```
Family: 21 — Event Promotion
Methods: ValidateStripeSignatureAsync, ProcessRefundAsync, RecordPromotionCostAsync,
         GetCampaignCostAsync
Fabric Resolution:
  Primary: DATABASE FABRIC (Skill 05) → PostgreSQL (billing records, audit trail)
NOTE: Payment processing delegated to Stripe. F203 manages billing records and
      webhook validation ONLY. No Stripe SDK in service code — resolved via factory.
DNA Compliance: 7/7 ✅
Machine: Refund = paid event cancel → full refund ≤48h (PCI DSS, via Stripe)
Freedom: Promotion billing tiers — ES config doc
Factory Creation:
  var svc = await _factory.CreateAsync<IPaymentIntegrationService>(ctx);
  var result = await svc.RecordPromotionCostAsync(eventId, campaignId, metrics, scopeId, ct);
```

### F204 — ICampaignAnalyticsService
```
Family: 21 — Event Promotion
Methods: PredictEventMetricsAsync, RecordImpressionAsync, AggregateMetricsAsync,
         PublishCampaignCompletedAsync
Fabric Resolution:
  Primary: DATABASE FABRIC (Skill 05) → Elasticsearch (time-series metrics, aggregation)
  AI: AI ENGINE FABRIC (Skill 07) → IAiProvider (attendance prediction, virality scoring)
DNA Compliance: 7/7 ✅
Machine: ROI formula: roi = (conversions × avg_ticket_price) / campaign_cost (NEVER configurable)
Freedom: Attribution window (default 7 days), prediction model weights — ES config docs
Factory Creation:
  var svc = await _factory.CreateAsync<ICampaignAnalyticsService>(ctx);
  var result = await svc.AggregateMetricsAsync(eventId, campaignId, scopeId, ct);
```

### FLOW-03 DNA Compliance Matrix (56/56)

| Factory | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-7 |
|---------|-------|-------|-------|-------|-------|-------|-------|
| F197 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F198 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F199 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F200 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F201 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F202 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F203 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F204 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# SUPERSEDED DOCUMENTS

The following documents are now superseded by this unified version:

| File | Status | Reason |
|------|--------|--------|
| XIIGEN_V39_ENGINE_DESIGN.md | Merged here (Section 1-2) | Factory philosophy + universal pattern |
| XIIGEN_V40_MASTER_PLAN_v2.md | Merged here (Sections 2-7) | DB resolutions, AF stations, families |
| V43_MASTER_PLAN.md | Merged here (Section 6) | Flow system, 10 phases, quality |
| V43_FABRIC_EXTENSION.md | Merged here (Section 8) | Execution/Infra/Mgmt fabrics |
| V40_V69_ARCHITECTURE_AUDIT.md | Merged here (Section 10) | Compliance findings |
| FLOW05_ENGINE_EXTENSION_MERGED_FINAL.md | Merged here (Section 4, 5, 8A) | Family 17, F166-F173, T44-T46 |
| FLOW01_ENGINE_EXTENSION.md | Merged here (Section 4, 5, 8A) | Family 18, F174-F181, T47-T49 |
| **FCE_EXEC_P1_P5.md** | **Merged here (Section 8A, 8B)** | **Family 19 (F182-F189), Family 20 (F190-F196), Queue+3, DNA-7, BFA G1-G7** |
| **FLOW03_ENGINE_EXTENSION_COMBINED.md** | **Merged here (Section 12)** | **Family 21 (F197-F204), T59-T62, CF-10–CF-17, V62 REINFORCED** |

These original files should be retained as version history but this unified document
is the authoritative reference for the current engine architecture.

## INTEGRATION CHANGELOG

| Date | Extension | Changes |
|------|-----------|---------|
| 2026-02-25 | FLOW-05 (Lesson Gamification) | +Family 17, +F166-F173, +T44-T46, +lesson-gamification-v1, V62 G1/G2/G3/G5/G6 |
| 2026-02-25 | FLOW-05 MERGED FINAL enrichment | Enriched F166-F173 with FACTORY CREATION blocks + 31 method signatures, FREEDOM:None on F170/F172 |
| 2026-02-25 | FLOW-01 (User Registration) | +Family 18, +F174-F181, +T47-T49, +user-registration-v1, V62 G4/G7 |
| 2026-02-25 | FLOW-02 (Business Onboarding) | +Family 19, +F182-F189 (8 factories, ~32 methods), +T50-T52, +business-onboarding-v1 |
| 2026-02-25 | FCE (Flow Creation Engine) | +Family 20, +F190-F196 (7 factories), +Queue Fabric +3 methods, +DNA-7, +BFA G1-G7 ENFORCED, +T53-T58, +flow-creation-v1 |
| 2026-02-25 | **FLOW-03 (Event Creation & Promotion)** | **+Family 21, +F197-F204 (8 factories, ~30 methods), +T59-T62 (31 IRs, 24 QGs), +event-promotion-v1, +CF-10–CF-17, V62 G1-G7 REINFORCED (2nd layer), DNA 317/317** |

## NUMBERED SEQUENCE (Backward Compatibility Proof)

```
FACTORIES (continuous, no gaps):
  F1...F165 [V39/V40/V43] → F166-F173 [FLOW-05] → F174-F181 [FLOW-01]
  → F182-F189 [FLOW-02] → F190-F196 [FCE] → F197-F204 [FLOW-03]
  Next available: F205

TASK TYPES (continuous, no gaps):
  T1...T43 [V39/V40/V43] → T44-T46 [FLOW-05] → T47-T49 [FLOW-01]
  → T50-T52 [FLOW-02] → T53-T58 [FCE] → T59-T62 [FLOW-03]
  Next available: T63

FAMILIES (continuous):
  1-16 [original] → 17 [FLOW-05] → 18 [FLOW-01] → 19 [FLOW-02] → 20 [FCE] → 21 [FLOW-03]
  Next available: 22
```

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-04 EXTENSION — POST PUBLISHING & FEED DISTRIBUTION
# Merged: 2026-02-25 | Source: FLOW04_ENGINE_EXTENSION_v2.md P1+P5
# Adds: Family 22, F205-F212 (8 factories, 34 methods)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 22: POST_PUBLISHING_DISTRIBUTION (FLOW-04)

```
F205 — IPostContentService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    CreatePost(Dictionary<string,object> postData) → Task<DataProcessResult<Dictionary<string,object>>>
    StoreMedia(string postId, Stream media, string mediaType) → Task<DataProcessResult<string>>
    GetPost(string postId) → Task<DataProcessResult<Dictionary<string,object>>>
    UpdatePost(string postId, Dictionary<string,object> changes) → Task<DataProcessResult<Dictionary<string,object>>>
    DeletePost(string postId) → Task<DataProcessResult<bool>>
    ValidateContent(Dictionary<string,object> postData) → Task<DataProcessResult<Dictionary<string,object>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → MongoDB (posts collection)
    Cache: DATABASE FABRIC (Skill 05) → Redis (post-cache:{postId}, TTL: 15min)
    Event: QUEUE FABRIC (Skill 04) → Redis Streams (PostCreated, PostUpdated, PostDeleted)
    Media: DATABASE FABRIC (Skill 05) → MongoDB GridFS
  DNA Compliance: 7/7 ✅
  Machine: Content sanitization, rate limit 10/hour/user (MACHINE), OutboxWriteAsync atomic
  Freedom: Max post sizes, supported media types, content type boost factors
  Factory Creation: var svc = await _factory.CreateAsync<IPostContentService>(ctx);

F206 — INlpAnalysisService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    AnalyzeContent(string postId, Dictionary<string,object> content) → Task<DataProcessResult<Dictionary<string,object>>>
    ExtractTopics(string text) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    DetectLanguage(string text) → Task<DataProcessResult<string>>
    ClassifySentiment(string text) → Task<DataProcessResult<Dictionary<string,object>>>
  Fabric Resolution:
    Primary: AI ENGINE FABRIC (Skill 07) → AiDispatcher (Claude for entities, Gemini for topics)
    Cache: DATABASE FABRIC (Skill 05) → Redis (nlp-cache:{postId}, TTL: 24h)
    Index: DATABASE FABRIC (Skill 05) → Elasticsearch (post-analysis index)
  DNA Compliance: 7/7 ✅
  Machine: Analysis pipeline, failure mode (degrade and continue), image-only skip
  Freedom: Topic taxonomy, sentiment thresholds, model selection
  Factory Creation: var svc = await _factory.CreateAsync<INlpAnalysisService>(ctx);

F207 — IContentMatchingService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    FindBusinessMatches(string postId, Dictionary<string,object> nlpAnalysis) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    CalculateMatchScore(Dictionary<string,object> postAnalysis, Dictionary<string,object> businessProfile) → Task<DataProcessResult<double>>
    BatchMatch(string postId, List<string> businessIds, int batchSize) → Task<DataProcessResult<Dictionary<string,object>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → PostgreSQL (business profiles, match factors)
    Search: DATABASE FABRIC (Skill 05) → Elasticsearch (full-text topic matching)
    AI: AI ENGINE FABRIC (Skill 07) → Claude (semantic relevance scoring)
    Reuse: F182 IBusinessProfileService (FLOW-02) → read-only business profile access
  DNA Compliance: 7/7 ✅
  Machine: Sub-factors: questionnaire=0.40, industry=0.30, size=0.15, location=0.15
  Freedom: Sub-factor weights, minimum match threshold, industry taxonomy mapping
  Factory Creation: var svc = await _factory.CreateAsync<IContentMatchingService>(ctx);

F208 — ISocialGraphService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    GetFriendGraph(string userId, int maxDepth) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    GetFollowers(string userId) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    GetConnectionStrength(string userId, string targetUserId) → Task<DataProcessResult<double>>
    BatchGraphQuery(string userId, int batchSize) → Task<DataProcessResult<Dictionary<string,object>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → Neo4j (social graph traversals)
    Fallback: DATABASE FABRIC (Skill 05) → PostgreSQL (adjacency list when graph DB unavailable)
    Cache: DATABASE FABRIC (Skill 05) → Redis (connection-graph:{userId}, TTL: 6h)
  DNA Compliance: 7/7 ✅
  Machine: Connection types: direct=1.0, 2nd=0.5, follower=0.3, following=0.4
           Max depth=2. Privacy: NEVER expose full friend list.
  Freedom: Strength multipliers, max depth, cache TTL
  Factory Creation: var svc = await _factory.CreateAsync<ISocialGraphService>(ctx);

F209 — IGroupMembershipService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    GetUserGroups(string userId) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    GetGroupMembers(string groupId) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    CalculateGroupRelevance(string postId, Dictionary<string,object> nlpAnalysis, string groupId) → Task<DataProcessResult<double>>
    BatchGroupMatch(string postId, List<string> groupIds) → Task<DataProcessResult<List<Dictionary<string,object>>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → PostgreSQL (group memberships, roles)
    Secondary: DATABASE FABRIC (Skill 05) → MongoDB (group metadata, topic tags)
    Cache: DATABASE FABRIC (Skill 05) → Redis (group-members:{groupId}, TTL: 1h)
  DNA Compliance: 7/7 ✅
  Machine: Role weights: admin=1.0, mod=0.8, member=0.6. Groups >10K: paginate.
  Freedom: Group relevance thresholds, role weights, topic matching sensitivity
  Factory Creation: var svc = await _factory.CreateAsync<IGroupMembershipService>(ctx);

F210 — ICompositeRankingService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    CompileRecipientList(string postId, List<Dictionary<string,object>> businessMatches, List<Dictionary<string,object>> connections, List<Dictionary<string,object>> groupMembers) → Task<DataProcessResult<Dictionary<string,object>>>
    CalculateCompositeScores(string postId, List<Dictionary<string,object>> recipients) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    AssignTiers(List<Dictionary<string,object>> scoredRecipients) → Task<DataProcessResult<List<Dictionary<string,object>>>>
    GetFallbackRecipients(string userId) → Task<DataProcessResult<List<Dictionary<string,object>>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → Redis (ranking-cache:{postId}, TTL: 30min)
    Activity: DATABASE FABRIC (Skill 05) → Elasticsearch (user activity history)
    AI: AI ENGINE FABRIC (Skill 07) → Claude/Gemini (engagement prediction sub-factor)
  DNA Compliance: 7/7 ✅
  Machine: composite = (match×0.25)+(friend×0.20)+(group×0.15)+(activity×0.20)+(recency×0.10)+(engage×0.10)
           Tiers: premium>0.8, high>0.6, medium>0.4, low>0.2, minimal>0.0
           Join: TIMEOUT_THEN_FALLBACK, 10s per stream. Batch: 1000/batch.
  Freedom: Factor weights (must sum 1.0; validation MACHINE, values FREEDOM), tier thresholds, timeouts
  Factory Creation: var svc = await _factory.CreateAsync<ICompositeRankingService>(ctx);

F211 — IPostFeedDistributionService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    DistributeToFeeds(string postId, List<Dictionary<string,object>> rankedRecipients) → Task<DataProcessResult<Dictionary<string,object>>>
    ApplyDiversityControls(string feedId, Dictionary<string,object> postEntry) → Task<DataProcessResult<Dictionary<string,object>>>
    ReorderFeed(string userId) → Task<DataProcessResult<Dictionary<string,object>>>
    RemoveFromFeeds(string postId) → Task<DataProcessResult<int>>
    UpdateFeedEntry(string postId, Dictionary<string,object> changes) → Task<DataProcessResult<int>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → Redis Cluster (sorted sets, ZADD)
    Secondary: DATABASE FABRIC (Skill 05) → Elasticsearch (feed history, search)
    Cache: DATABASE FABRIC (Skill 05) → Redis (user-feed:{userId}, TTL: 5min L1 cache)
    Event: QUEUE FABRIC (Skill 04) → Redis Streams (FeedsUpdated, FeedsReordered)
  DISTINCT FROM F201 (IFeedInjectionService, FLOW-03):
    F211 = post distribution (diversity controls, tiered batching, reordering, removal)
    F201 = event promotion injection (simple ZADD). Different patterns, different scale.
  DNA Compliance: 7/7 ✅
  Machine: Batch=500/dist, 100/transaction. Diversity: max 2/author top10, 60% topic diversity.
           Delivery: direct=5s, business(>0.6)=5min, weak=hourly. Private=NEVER in feeds.
  Freedom: Diversity thresholds, batch sizes, cache TTLs (L1:5min, L2:30min, L3:6h)
  Factory Creation: var svc = await _factory.CreateAsync<IPostFeedDistributionService>(ctx);

F212 — IDistributionAnalyticsService
  Family: 22 (Post Publishing & Feed Distribution)
  Methods:
    TrackDistribution(string postId, Dictionary<string,object> distributionData) → Task<DataProcessResult<Dictionary<string,object>>>
    AggregateMetrics(string postId) → Task<DataProcessResult<Dictionary<string,object>>>
    PublishCompletion(string postId) → Task<DataProcessResult<Dictionary<string,object>>>
    GetDistributionReport(string postId) → Task<DataProcessResult<Dictionary<string,object>>>
  Fabric Resolution:
    Primary: DATABASE FABRIC (Skill 05) → Elasticsearch (distribution-metrics-posts index, time-series)
    Event: QUEUE FABRIC (Skill 04) → Redis Streams (PostDistributionCompleted)
  DNA Compliance: 7/7 ✅
  Machine: Metrics: reach, impressions, distributionTime, tierBreakdown, avgPosition, latency, feedsUpdated, feedsReordered
           SLA: distribution>30s=SLA_BREACH alert. userId hashed (no PII in metrics).
  Freedom: Metric retention periods, alert thresholds, report format, aggregation intervals
  Factory Creation: var svc = await _factory.CreateAsync<IDistributionAnalyticsService>(ctx);
```

---

## DNA Compliance Matrix — FLOW-04 (56/56 = 100%)

| Factory | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-7 | Total |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|
| F205 IPostContentService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F206 INlpAnalysisService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F207 IContentMatchingService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F208 ISocialGraphService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F209 IGroupMembershipService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F210 ICompositeRankingService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F211 IPostFeedDistributionService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F212 IDistributionAnalyticsService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| **TOTAL** | **8/8** | **8/8** | **8/8** | **8/8** | **8/8** | **8/8** | **8/8** | **56/56** |

---

## System State Update (Post FLOW-04)

| Metric | Pre-FLOW-04 | Post-FLOW-04 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F204 | F1-F212 | +8 |
| Factory families | 21 | 22 | +1 |
| Task type contracts | T1-T62 | T1-T66 | +4 |
| Flow templates | 13 | 14 | +1 |
| BFA conflict rules | CF-1-CF-17 | CF-1-CF-25 | +8 |
| DNA compliance | 317/317 | 373/373 | +56 |
| Iron rules (total) | 72 | 106 | +34 |
| Quality gates (total) | 62 | 90 | +28 |

## Factory Numbering Chain (Complete)
```
F1-F165   [V39/V40/V43]
F166-F173 [FLOW-05, Family 17]
F174-F181 [FLOW-01, Family 18]
F182-F189 [FLOW-02, Family 19]
F190-F196 [FCE, Family 20]
F197-F204 [FLOW-03, Family 21]
F205-F212 [FLOW-04, Family 22] ← NEW
Next: F213
```

## MERGE04:P2 STATE SAVE
```
MERGE04:P2 = COMPLETE
Target: ENGINE_ARCHITECTURE_MERGED.md
Added: F205-F212 (8 factories, 34 methods, full fabric resolution per factory)
Added: Family 22 header, 56/56 DNA compliance matrix, system state totals
Added: Deep Research enhancements DR-1 through DR-4
Next: MERGE04:P3 → UNIFIED_SOURCE_INDEX_MERGED.md
```

---

## Deep Research Enhancements (Architectural Notes from 04-post-publishing_deep_search.md)

These supplement the existing architecture with runtime capabilities for complex flow execution:

| # | Enhancement | Scope | How It Applies |
|---|-----------|-------|---------------|
| DR-1 | JoinAggregationState tracking | Skill 09 (FlowOrchestrator) | Per-join-node state persistence: which upstream branches arrived, deadline tracking. T64 join uses this for 3-way TIMEOUT_THEN_FALLBACK with postId correlation. |
| DR-2 | Compensation edges | Future engine capability | If distribution partially fails (e.g., 200/500 batches written), compensating removal runs. Modeled as reversed edges in flow DAG. Applies to T65 failure recovery. |
| DR-3 | FlowInstance correlation | Template 14 (correlationKey) | Every node in post-publishing-v1 keyed on postId. Enables cross-node debugging and full instance state reconstruction. |
| DR-4 | NodeInstance observability | Skill 09 inherits | Per-node status tracking (pending→running→succeeded|failed|skipped|timed_out) with retry counts and duration. Critical for SLA monitoring in T66. |

**Note:** DR-5 (FlowVersion state machine) already exists in FCE T53-T58. DR-6 (Contract registry) already exists via BFA schema tracking. DR-7 (Idempotency) implemented in T65 IR-4. DR-8 (Backpressure) implemented in T65 IR-11.

---

## INTEGRATION CHANGELOG (updated post FLOW-04)

| Date | Extension | Changes |
|------|-----------|---------| 
| 2026-02-25 | FLOW-05 (Lesson Gamification) | +Family 17, +F166-F173, +T44-T46, +lesson-gamification-v1, V62 G1/G2/G3/G5/G6 |
| 2026-02-25 | FLOW-05 MERGED FINAL enrichment | Enriched F166-F173 with FACTORY CREATION blocks + 31 method signatures |
| 2026-02-25 | FLOW-01 (User Registration) | +Family 18, +F174-F181, +T47-T49, +user-registration-v1, V62 G4/G7 |
| 2026-02-25 | FLOW-02 (Business Onboarding) | +Family 19, +F182-F189, +T50-T52, +business-onboarding-v1 |
| 2026-02-25 | FCE (Flow Creation Engine) | +Family 20, +F190-F196, +Queue Fabric +3, +DNA-7, +BFA G1-G7 ENFORCED, +T53-T58, +flow-creation-v1 |
| 2026-02-25 | FLOW-03 (Event Creation & Promotion) | +Family 21, +F197-F204, +T59-T62, +event-promotion-v1, +CF-10–CF-17, V62 REINFORCED, DNA 317/317 |
| 2026-02-25 | **FLOW-04 (Post Publishing & Feed Distribution)** | **+Family 22, +F205-F212 (34 methods), +T63-T66 (34 IRs, 28 QGs), +post-publishing-v1, +CF-18–CF-25, DNA 373/373, +DR-1–DR-4 arch notes** |
| 2026-02-26 | **FLOW-05 Hardening (Family 23)** | **+Family 23, +F213-F218 (6 factories, ~24 methods), +T67-T69, +CF-26–CF-33, +DR-5–DR-8, DNA 415/415, closes spec gaps O1-O6** |
| 2026-02-26 | **FLOW-05 Engagement Service Layer (Family 24)** | **+Family 24, +F219-F224 (6 factories, 27 methods), +T70-T71 (20 IRs, 16 QGs), +CF-34–CF-41, +DR-9–DR-12, +SK-11–SK-16, DNA 457/457, closes spec gaps SG-1–SG-5+G1** |

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-05 EXTENSION — GAMIFICATION HARDENING (FAMILY 23)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Adds: Family 23, F213-F218 (6 factories, ~24 methods)
# Task types: T67-T69 | BFA: CF-26-CF-33 | DR: DR-5-DR-8
# Closes spec gaps: O1-O6 (operational integrity layer)

## Family 23: GAMIFICATION_HARDENING (FLOW-05 V3)

**Purpose:** Provides the operational integrity layer UNDERNEATH Family 17's happy-path
fan-out (T44-T46, F166-F173). Users never see Family 23 directly — it runs behind the
scenes ensuring points are correct, events conform to schema, anomalies are caught,
dead letters are recovered, and A/B experiments are governed safely.

**Relationship to Family 17 (FLOW-05 V1):**
- Family 17 = happy path: QuestionnaireAnswered → scoring → learning → social
- Family 23 = integrity: audit scoring, detect anomalies, govern events, recover failures
- Family 24 (next) = engagement: grading, commenting, anti-abuse, sync compute

```
Family 23 owns: F213, F214, F215, F216, F217, F218
Task types:     T67 (Gamification Integrity), T68 (Event Governance), T69 (Adaptive Experimentation)
BFA rules:      CF-26 – CF-33
Design rules:   DR-5 – DR-8
```

---

## F213 — IReconciliationService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | InfluxDB | point_ledger (read-only replica) | Time-series point audit trail |
| DATABASE FABRIC (Skill 05) | MongoDB | gamification_profile (read-only replica) | Profile state snapshot comparison |
| DATABASE FABRIC (Skill 05) | Redis | reconciliation:{tenantId}:{window} HASH | Lock + progress tracking per audit window |
| DATABASE FABRIC (Skill 05) | Elasticsearch | reconciliation_audit index | Discrepancy log (append-only, immutable) |
| QUEUE FABRIC (Skill 04) | Redis Streams | reconciliation.discrepancy.found stream | Alert stream → ops dashboard consumer group |

**Factory Creation:**
```csharp
var reconciliation = await _factory.CreateAsync<IReconciliationService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "reconciliation.primaryProvider",
    FallbackKey = "reconciliation.fallback",
    RequiredCapabilities = ["read_only", "point_ledger_access", "profile_access"]
  });
var result = await reconciliation.RunPointsReconciliationAsync(tenantId, window, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| RunPointsReconciliationAsync | (tenantId, Dictionary\<string,object\> window, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| RunStreakReconciliationAsync | (tenantId, Dictionary\<string,object\> window, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetDiscrepanciesAsync | (tenantId, Dictionary\<string,object\> filters, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| AuditAchievementsAsync | (tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F166 (IGamificationService, Family 17):**
F166 = writes points/levels/achievements (production path, read-write).
F213 = reads and audits points/levels/achievements (integrity path, read-only).
F213 has NO write access to F166's indices. Discrepancies are logged, NEVER auto-corrected.

**MACHINE:**
- Read-only access to production data (RequiredCapabilities includes "read_only")
- Never auto-correct — discrepancies logged to reconciliation_audit, alert emitted
- Reconciliation window: configurable but bounded (max 24h lookback per run)
- Lock acquisition: Redis distributed lock prevents concurrent audit runs per tenant
- Append-only audit log: reconciliation_audit index is write-once (no update/delete)

**FREEDOM (ES config docs):**
- reconciliation_schedule_cron (default: "0 3 * * *" — daily 3 AM UTC)
- reconciliation_tolerance_percentage (default: 0.01 — 1% discrepancy threshold)
- reconciliation_lookback_hours (default: 24)
- alert_routing_channel (default: "ops-gamification")

**DNA Compliance:** 7/7 ✅
| DNA-1 ParseDocument | DNA-2 BuildSearchFilter | DNA-3 DataProcessResult | DNA-4 MicroserviceBase | DNA-5 ScopeIsolation | DNA-6 DynamicController | DNA-7 TraceContext |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## F214 — IAnomalyDetectionService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| AI ENGINE FABRIC (Skill 07) | Claude/Gemini | Anomaly pattern recognition prompts | ML/AI analysis of behavioral patterns |
| DATABASE FABRIC (Skill 05) | Elasticsearch | anomaly_telemetry index | Historical behavior telemetry storage |
| DATABASE FABRIC (Skill 05) | Redis | anomaly:window:{tenantId}:{userId} ZSET | Sliding window event counters |
| QUEUE FABRIC (Skill 04) | Redis Streams | abuse.behavior.telemetry stream (consumer) | Consumes from F219/F221 telemetry producers |
| QUEUE FABRIC (Skill 04) | Redis Streams | anomaly.detected stream (producer) | Emits confirmed anomaly events |

**Factory Creation:**
```csharp
var anomaly = await _factory.CreateAsync<IAnomalyDetectionService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "anomaly.primaryProvider",
    RequiredCapabilities = ["pattern_detection", "telemetry_consumer"]
  });
var result = await anomaly.AnalyzeBehaviorAsync(userId, telemetryBatch, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| AnalyzeBehaviorAsync | (userId, Dictionary\<string,object\> telemetryBatch, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| DetectPointFarmingPatternAsync | (tenantId, Dictionary\<string,object\> window, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| DetectGradingAnomalyAsync | (tenantId, Dictionary\<string,object\> window, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetAnomalyHistoryAsync | (userId, tenantId, Dictionary\<string,object\> filters, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F221 (IAntiAbuseGateService, Family 24):**
F221 = real-time BLOCKING gate (runs synchronously BEFORE writes, returns allowed/blocked).
F214 = async PATTERN ANALYST (consumes telemetry AFTER the fact, detects sustained patterns over time).
F214 does NOT write back to F221. One-directional: F221 produces telemetry → F214 consumes it.

**MACHINE:**
- Async processing only — NEVER blocks user-facing operations
- One-directional data flow: F219/F221 → telemetry stream → F214 (no circular dependency)
- Anomaly detection window: sliding 24h minimum (pattern detection needs history)
- Confirmed anomaly emitted to anomaly.detected stream → ops review queue

**FREEDOM (ES config docs):**
- anomaly_detection_sensitivity (default: medium, options: low/medium/high)
- anomaly_window_hours (default: 24)
- farming_threshold_completions_per_day (default: 20)
- grading_anomaly_pattern_threshold (default: 50 grades in 30 min)

**DNA Compliance:** 7/7 ✅

---

## F215 — IEventSchemaRegistryService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | Elasticsearch | event_schema_registry index | Stores versioned CloudEvents schemas |
| DATABASE FABRIC (Skill 05) | Redis | schema:cache:{eventType}:{version} STRING | Schema validation cache (hot path) |
| QUEUE FABRIC (Skill 04) | Redis Streams | schema.validation.failed stream | Failed validation events → ops alert |

**Factory Creation:**
```csharp
var schemaRegistry = await _factory.CreateAsync<IEventSchemaRegistryService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "eventSchema.primaryProvider",
    RequiredCapabilities = ["schema_validation", "version_management"]
  });
var result = await schemaRegistry.ValidateEventAsync(eventType, eventPayload, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| ValidateEventAsync | (eventType, Dictionary\<string,object\> payload, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| RegisterSchemaAsync | (eventType, version, Dictionary\<string,object\> schema, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetSchemaAsync | (eventType, version, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| CheckBackwardCompatibilityAsync | (eventType, Dictionary\<string,object\> newSchema, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- CloudEvents JSON envelope mandatory for all FLOW-05 events
- Schema versioning: semver (major = breaking, minor = additive, patch = fix)
- Backward compatibility check: new schema must accept old payloads (additive only)
- Failed validation: event rejected, logged to schema.validation.failed, counter incremented

**FREEDOM (ES config docs):**
- schema_validation_mode (default: strict, options: strict/warn/disabled)
- schema_cache_ttl_seconds (default: 300)
- backward_compat_check_enabled (default: true)

**DNA Compliance:** 7/7 ✅

---

## F216 — IFeatureFlagService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | Elasticsearch | feature_flags index | Flag definitions + experiment configs |
| DATABASE FABRIC (Skill 05) | Redis | flag:{tenantId}:{flagKey} STRING (cached) | Hot-path flag evaluation cache |
| DATABASE FABRIC (Skill 05) | Elasticsearch | experiment_results index | A/B test outcome tracking |

**Factory Creation:**
```csharp
var flags = await _factory.CreateAsync<IFeatureFlagService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "featureFlag.primaryProvider",
    RequiredCapabilities = ["flag_evaluation", "experiment_tracking"]
  });
var result = await flags.EvaluateFlagAsync(flagKey, userId, tenantId, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| EvaluateFlagAsync | (flagKey, userId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetExperimentVariantAsync | (experimentId, userId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| RecordOutcomeAsync | (experimentId, userId, Dictionary\<string,object\> outcome, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetExperimentResultsAsync | (experimentId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- Deterministic assignment: hash(userId + experimentId) % 100 → variant bucket
- Same user always gets same variant within experiment lifetime
- Control group minimum: 20% (IRON RULE — experiment must have meaningful baseline)
- Flag evaluation hot path: Redis cache first, ES fallback

**FREEDOM (ES config docs):**
- experiment definitions (point values, streak thresholds, grading visibility rules per spec)
- variant percentages (default: 50/50 for 2-arm, 33/33/34 for 3-arm)
- experiment duration_days (default: 14)
- minimum_sample_size (default: 1000)

**DNA Compliance:** 7/7 ✅

---

## F217 — IGamificationRecoveryService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| QUEUE FABRIC (Skill 04) | Redis Streams | gamification.*.dlq (DLQ consumer) | Read dead-lettered gamification events |
| DATABASE FABRIC (Skill 05) | MongoDB | dlq_recovery_log | Recovery attempt audit trail |
| DATABASE FABRIC (Skill 05) | Elasticsearch | recovery_telemetry index | Recovery metrics + success rates |
| QUEUE FABRIC (Skill 04) | Redis Streams | gamification.completion.points (re-enqueue) | Replay recovered events to main queue |

**Factory Creation:**
```csharp
var recovery = await _factory.CreateAsync<IGamificationRecoveryService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "gamification.recovery.provider",
    RequiredCapabilities = ["dlq_access", "replay_capability", "audit_log"]
  });
var result = await recovery.ProcessDlqBatchAsync(batchSize, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| ProcessDlqBatchAsync | (batchSize, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ReplayEventAsync | (Dictionary\<string,object\> dlqEvent, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetRecoveryStatusAsync | (tenantId, Dictionary\<string,object\> filters, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| EscalateUnrecoverableAsync | (Dictionary\<string,object\> event, reason, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- Max 3 replay attempts per event (IRON RULE — prevents infinite retry loops)
- Log-before-replay: every replay attempt logged to dlq_recovery_log BEFORE re-enqueue
- Unrecoverable events escalated to ops (never silently dropped)
- Recovery batch size bounded: max 100 events per run (prevents queue flooding)
- Replay preserves original correlation ID + adds recovery metadata

**FREEDOM (ES config docs):**
- dlq_processing_schedule (default: every 15 min)
- max_retry_attempts (default: 3, ceiling: 5)
- recovery_batch_size (default: 50, ceiling: 100)
- escalation_channel (default: "ops-gamification-recovery")

**DNA Compliance:** 7/7 ✅

---

## F218 — IAdaptiveDifficultyService

**Family:** 23 (GAMIFICATION HARDENING)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| AI ENGINE FABRIC (Skill 07) | Claude/Gemini | Difficulty analysis prompts | ML-informed difficulty assessment |
| DATABASE FABRIC (Skill 05) | MongoDB | learning_performance_history | Historical performance data |
| DATABASE FABRIC (Skill 05) | Elasticsearch | difficulty_adjustments index | Adjustment audit log |
| DATABASE FABRIC (Skill 05) | Redis | difficulty:{tenantId}:{userId}:{moduleId} HASH | Cached current difficulty level |

**Factory Creation:**
```csharp
var adaptive = await _factory.CreateAsync<IAdaptiveDifficultyService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "adaptive.difficulty.provider",
    RequiredCapabilities = ["performance_analysis", "difficulty_adjustment"]
  });
var result = await adaptive.CalculateDifficultyAsync(userId, moduleId, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| CalculateDifficultyAsync | (userId, moduleId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ApplyAdaptationAsync | (userId, Dictionary\<string,object\> adaptations, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetPerformanceProfileAsync | (userId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ValidateAdaptationSafetyAsync | (Dictionary\<string,object\> proposed, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F167 (ILearningPlanService, Family 17):**
F167 = ML-based curriculum adaptation (which modules to recommend, what pace to set).
F218 = difficulty scoring within a module (how hard should the next question set be).
F218 feeds INTO F167's adaptation loop — F167 uses difficulty data as one input factor.

**MACHINE:**
- Max 3 changes per adaptation (spec constraint — prevents dramatic difficulty swings)
- Min 2 lessons between adaptations (spec constraint — gives adaptation time to show effects)
- Safe defaults on ML failure: maintain current difficulty level (never increase on error)
- Adaptation validation: F218.ValidateAdaptationSafetyAsync checks bounds BEFORE applying
- Required module protection: adaptations cannot skip or remove required curriculum modules

**FREEDOM (ES config docs):**
- difficulty_levels (default: 5 levels — beginner/easy/medium/hard/expert)
- adaptation_sensitivity (default: medium)
- min_data_points_for_adaptation (default: 5 completed lessons)
- score_below_threshold (default: 60% — triggers difficulty decrease)
- score_above_threshold (default: 90% — triggers difficulty increase)

**DNA Compliance:** 7/7 ✅

---

## DNA Compliance Matrix — Family 23 (42/42 = 100%)

| DNA Pattern | F213 Reconciliation | F214 Anomaly | F215 Schema | F216 Flags | F217 Recovery | F218 Adaptive |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **DNA-1** ParseDocument (Dictionary) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-2** BuildSearchFilter (skip empty) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-3** DataProcessResult\<T\> | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-4** MicroserviceBase (19 components) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-5** Scope Isolation (tenantId) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-6** DynamicController | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-7** W3C Trace Context | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Family 23 Total: 42/42 ✅ | System Running Total: 415/415**

---

## Design Rules DR-5 through DR-8

### DR-5: Hybrid Sync+Async for Gamification 1s SLA
```
DECISION: Gamification compute uses synchronous path (800ms budget) with durable async
  emit for persistence. If sync times out, async path (T44) acts as primary.
RATIONALE: Spec requires <1s UI feedback for "dopamine loop". Pure async cannot guarantee
  latency under queue backlog. Sync provides instant UX; async provides durability.
IMPLEMENTATION: F224 (Family 24) implements circuit breaker. T71 orchestrates the flow.
  T44 checks idempotency key before processing (prevents double-count).
LOCKED: YES
```

### DR-6: Read-Only Reconciliation (Never Auto-Correct)
```
DECISION: F213 reconciliation MUST be read-only against production data stores.
  Discrepancies are LOGGED and ALERTED, never auto-corrected.
RATIONALE: Auto-correction risks compounding errors. Manual review ensures intentional
  correction. Read-only access prevents reconciliation bugs from corrupting production.
IMPLEMENTATION: F213 FactoryResolutionContext includes "read_only" RequiredCapability.
  DATABASE FABRIC validates capability flag. No StoreDocument in F213 method signatures.
LOCKED: YES
```

### DR-7: One-Directional Telemetry Flow
```
DECISION: Telemetry flows one direction only: real-time gates (F219/F221) → telemetry
  stream → async analyst (F214). F214 never writes back to F219/F221.
RATIONALE: Circular dependencies between real-time gates and async analysts create
  deadlocks and unpredictable latency. One-direction ensures clean architecture.
IMPLEMENTATION: F219.FlagSpamAsync → abuse.behavior.telemetry (producer only).
  F214.DetectGradingAnomalyAsync → abuse.behavior.telemetry (consumer only).
  BFA monitors stream registry for circular refs.
LOCKED: YES
```

### DR-8: Experiment Safety Guardrails
```
DECISION: A/B experiments on gamification parameters MUST have control group ≥ 20%
  and cannot modify MACHINE constraints (only FREEDOM parameters).
RATIONALE: Experiments that accidentally disable anti-abuse or change point formulas
  without baseline measurement would corrupt system integrity.
IMPLEMENTATION: F216.GetExperimentVariantAsync validates experiment targets against
  MACHINE/FREEDOM registry. Experiments targeting MACHINE params → rejected at registration.
  AF-9 validates control group percentage ≥ 20%.
LOCKED: YES
```

---

## System State Update (Post Family 23)

| Metric | Pre-Family23 | Post-Family23 | Delta |
|--------|-------------|---------------|-------|
| Factory interfaces | F1-F212 | F1-F218 | +6 |
| Factory families | 22 | 23 | +1 |
| DNA compliance | 373/373 | 415/415 | +42 |

```
FACTORIES (continuous):
  F1-F212  [through FLOW-04, Family 22]
  F213-F218 [FLOW-05 Hardening, Family 23] ← NEW
  Next: F219
```

# FAMILY 24: FLOW-05 ENGAGEMENT SERVICE LAYER

**Purpose:** Closes 6 service-layer gaps in FLOW-05 V1 (Family 17) that leave the
user-facing engagement loop incomplete. Users can now grade peers' answers with
pseudonymity protection, leave categorized comments, have their streaks calculated
correctly across timezone boundaries, earn social engagement points via a feedback
loop, and have gamification computed synchronously within the 1-second UI SLA.

**Relationship to prior families:**
- Family 17 (FLOW-05 V1) — owns the happy-path fan-out (scoring, ML, distribution)
- Family 23 (Gamification Hardening) — owns operational integrity (reconciliation, anomaly, schema)
- Family 24 (THIS) — owns the engagement loop ON TOP of Family 17's happy path
- F219 calls F172 (Family 17) via CreateAsync() — wraps math-only grade calculator
- F222 calls F169 (Family 17) via CreateAsync() — wraps UTC streak tracker with timezone
- ALL Family 24 factories call earlier factories only via CreateAsync(). Never directly.

```
Family 24 owns: F219, F220, F221, F222, F223, F224
Task types:     T70 (Peer Review & Engagement Gate), T71 (Sync Compute & Anti-Abuse Gate)
BFA rules:      CF-34 – CF-41
Design rules:   DR-9 – DR-12
Stress tests:   ST-7 – ST-12
```

---

## F219 — IGradingService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | MongoDB | answer-grades (answerId+graderId composite unique index) | Persist grade submissions — one per grader per answer |
| DATABASE FABRIC (Skill 05) | Redis | rate:grade:{tenantId}:{graderId} ZSET (sliding window) | Rate limit enforcement: 20 grades/hr |
| DATABASE FABRIC (Skill 05) | MongoDB | grade-threshold:{answerId} (atomic counter) | Pseudonymity threshold tracking |
| QUEUE FABRIC (Skill 04) | Redis Streams | engagement.answer.graded stream | AnswerGraded event → gamification-social-points consumer group |

**Factory Creation:**
```csharp
var gradingService = await _factory.CreateAsync<IGradingService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "grading.primaryProvider",
    FallbackKey = "grading.fallback",
    RequiredCapabilities = ["persist_grades", "rate_limit", "pseudonymity"]
  });
var result = await gradingService.SubmitGradeAsync(answerId, graderId, grades, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| SubmitGradeAsync | (answerId, graderId, Dictionary\<string,object\> grades, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetAggregatedGradesAsync | (answerId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| CheckPseudonymityThresholdAsync | (answerId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetGraderRateLimitStatusAsync | (graderId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| FlagSpamAsync | (graderId, Dictionary\<string,object\> evidence, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F172 (IGradeCalculationService, Family 17):**
F172 = math-only aggregation (no persistence, no rate limiting, no pseudonymity).
F219 = full grading service with persistence + rules. F219 calls F172 via CreateAsync() for the weighted average calculation step.

**MACHINE:**
- Grade scale: 1–5 integer per criterion (fixed: accuracy, depth, clarity, creativity)
- Pseudonymity: hide grader identity until uniqueGraderCount ≥ floor (floor NEVER < 2, IRON RULE)
- Rate limit: 20 grades/hr/grader (Redis ZSET sliding window, server-side enforced)
- Uniqueness: one grade per grader per answer (MongoDB unique index — DB constraint, not app layer)
- Spam: automatic flag emitted to F214 telemetry when rate exceeds threshold

**FREEDOM (ES config docs):**
- grading_pseudonymity_threshold (default: 3, min: 2)
- top_answer_bonus_points (default: 20)
- grade_anomaly_window_minutes (default: 60)
- grade_visibility_rules (per audience segment, ES doc)

**DNA Compliance:** 7/7 ✅
| DNA-1 ParseDocument | DNA-2 BuildSearchFilter | DNA-3 DataProcessResult | DNA-4 MicroserviceBase | DNA-5 ScopeIsolation | DNA-6 DynamicController | DNA-7 TraceContext |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## F220 — ICommentService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | MongoDB | answer-comments (answerId, commenterId, commentType, createdAt) | Persist comments |
| DATABASE FABRIC (Skill 05) | Redis | rate:comment:{tenantId}:{commenterId} ZSET | Rate limit: 10 comments/hr |
| QUEUE FABRIC (Skill 04) | Redis Streams | engagement.answer.commented stream | AnswerCommented → notification + gamification |
| QUEUE FABRIC (Skill 04) | Redis Streams | moderation.comment.flagged stream | Flagged → moderation tooling (separate from notifications) |

**Factory Creation:**
```csharp
var commentService = await _factory.CreateAsync<ICommentService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "comment.primaryProvider",
    RequiredCapabilities = ["persist_comments", "rate_limit", "moderation"]
  });
var result = await commentService.PostCommentAsync(answerId, commenterId, content, commentType, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| PostCommentAsync | (answerId, commenterId, content, commentType, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetCommentsAsync | (answerId, Dictionary\<string,object\> filters, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ModerateCommentAsync | (commentId, Dictionary\<string,object\> action, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| FlagCommentAsync | (commentId, reporterId, reason, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- Comment types: fixed set — support / question / challenge / insight (extension = schema change, CF-40 route)
- Character limit: enforced server-side (FREEDOM configures value)
- Rate limit: Redis ZSET sliding window, server-side enforced
- Content sanitization: before storage (SQL/XSS, MACHINE step)
- Persist-before-event: comment stored BEFORE AnswerCommented event emitted (IR-8 from T70)

**FREEDOM (ES config docs):**
- comment_max_chars (default: 500)
- comment_rate_limit_per_hour (default: 10)
- moderation_auto_flag_threshold (default: 3 reports)
- comment_sort_strategy (default: recent, options: votes/type)

**DNA Compliance:** 7/7 ✅

---

## F221 — IAntiAbuseGateService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | Redis | abuse:idem:{tenantId}:{actionKey} (SET, TTL 24h) | Idempotency key registry |
| DATABASE FABRIC (Skill 05) | Redis | abuse:farm:{tenantId}:{userId} (ZSET) | Point farming rate tracking |
| DATABASE FABRIC (Skill 05) | Elasticsearch | abuse_telemetry index | Abuse pattern audit log |
| QUEUE FABRIC (Skill 04) | Redis Streams | abuse.behavior.telemetry stream | → F214 anomaly consumer |

**Factory Creation:**
```csharp
var antiAbuse = await _factory.CreateAsync<IAntiAbuseGateService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "antiabuse.provider",
    RequiredCapabilities = ["idempotency", "rate_gate", "telemetry"]
  });
var check = await antiAbuse.CheckPointFarmingAsync(userId, actionType, ct);
if (!check.Data["allowed"]) return DataProcessResult<>.Blocked("abuse_gate");
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| CheckPointFarmingAsync | (userId, actionType, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ValidateIdempotencyKeyAsync | (key, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| SetIdempotencyKeyAsync | (key, ttlSeconds, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| CheckGradingSpamAsync | (graderId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| RecordAbuseEventAsync | (userId, Dictionary\<string,object\> evidence, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F214 (IAnomalyDetectionService, Family 23):**
F221 = REAL-TIME blocking gate (runs BEFORE writes, returns allowed/blocked immediately).
F214 = ASYNC pattern analyst (consumes telemetry AFTER the fact, flags for review).
These are complementary. F221 gates; F214 investigates.

**MACHINE:**
- Max 1 scored completion per lesson per hour (enforced here, not in gamification)
- Idempotency key prevents double-counting sync+async paths (CF-37)
- Blocks return immediately (no async review needed for gate decisions)

**FREEDOM (ES config):**
- farm_rate_limit_per_hour, farm_rate_limit_per_day
- idempotency_key_ttl_seconds (default: 86400)
- abuse_telemetry_retention_days

**DNA Compliance:** 7/7 ✅

---

## F222 — IStreakTimezoneService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | PostgreSQL | user_timezone_preferences (userId, ianaTimezone, updatedAt) | User timezone store |
| DATABASE FABRIC (Skill 05) | Redis | streak:{tenantId}:{userId} (current streak + localTZ lastActivity) | Streak state cache |
| DATABASE FABRIC (Skill 05) | MongoDB | streak-history (userId, date, streakCount) | Streak audit log |
| QUEUE FABRIC (Skill 04) | Redis Streams | gamification.streak.updated stream | Streak event → analytics |

**Factory Creation:**
```csharp
var streakTZ = await _factory.CreateAsync<IStreakTimezoneService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "streak.timezone.provider",
    RequiredCapabilities = ["iana_timezone", "local_date_boundary", "streak_tracking"]
  });
// Internally: streakTZ delegates storage to F169 via CreateAsync()
var result = await streakTZ.RecordActivityAsync(userId, completionTime, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| RecordActivityAsync | (userId, completionTime, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetCurrentStreakAsync | (userId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetTimezoneAsync | (userId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| SetTimezoneAsync | (userId, ianaTimezone, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| ValidateStreakBoundaryAsync | (userId, localDate, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**DISTINCT FROM F169 (IStreakTrackingService, Family 17):**
F169 = UTC-only streak tracking (V1 baseline).
F222 = timezone-aware layer wrapping F169. F222.RecordActivityAsync converts UTC→localTZ date THEN calls F169 with the correct local date. T44 (V1) still calls F169 directly and uses UTC (backward compat preserved per CF-39 and DR-10).

**MACHINE:**
- IANA timezone required (not UTC offsets — DST safety)
- lastActivityDate stored in BOTH utcDate and localDate (no retroactive recalculation)
- Streak increment = calendar day boundary in user's LOCAL timezone
- BigInt for streak count (overflow protection)

**FREEDOM (ES config):**
- streak_grace_period_hours (default: 1, allows slight boundary tolerance)
- streak_freeze_enabled (default: false)

**DNA Compliance:** 7/7 ✅

---

## F223 — IEngagementFeedbackService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | Redis | engagement:window:{tenantId}:{windowKey} (HASH, aggregation) | Tumbling window accumulator |
| DATABASE FABRIC (Skill 05) | Elasticsearch | engagement-social-points index | Engagement history + analytics |
| QUEUE FABRIC (Skill 04) | Redis Streams | gamification.social.points.awarded stream | → F166 social points consumer group |

**Factory Creation:**
```csharp
var feedback = await _factory.CreateAsync<IEngagementFeedbackService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "engagement.feedback.provider",
    RequiredCapabilities = ["tumbling_window", "social_points_routing"]
  });
var result = await feedback.AccumulateEngagementAsync(answerId, eventType, pointValue, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| AccumulateEngagementAsync | (answerId, eventType, pointValue, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| FlushWindowAsync | (windowKey, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| RouteToGamificationAsync | (Dictionary\<string,object\> aggregated, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetEngagementSummaryAsync | (answerId, tenantId, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- Tumbling window: flush on TIME (default 15 min) OR COUNT (default 10 events) — whichever first
- RouteToGamificationAsync uses QUEUE FABRIC only (EnqueueAsync) — NEVER direct HTTP (CF-41)
- Window key = {tenantId}:{answerId}:{windowStartEpoch} — idempotent on replay
- GamificationSocialPointsAwarded event type is DISTINCT from GamificationPointsAwarded (CF-34, DR-11)

**FREEDOM (ES config):**
- engagement_window_duration_minutes (default: 15)
- engagement_window_flush_count (default: 10)
- social_points_per_grade_received (default: 5)
- social_points_per_comment_received (default: 2)
- social_points_daily_cap (default: 100)

**DNA Compliance:** 7/7 ✅

---

## F224 — ISyncComputeGatewayService

**Family:** 24 (ENGAGEMENT SERVICE LAYER)

**Fabric Resolution:**

| Fabric | Provider | Index / Key | Purpose |
|--------|----------|-------------|---------|
| DATABASE FABRIC (Skill 05) | Redis | sync_result:{tenantId}:{idempotencyKey} (STRING, TTL) | Cache sync compute result for dedup with T44 |
| QUEUE FABRIC (Skill 04) | Redis Streams | gamification.completion.points stream | Durable emit after sync compute |

**Factory Creation:**
```csharp
var gateway = await _factory.CreateAsync<ISyncComputeGatewayService>(
  new FactoryResolutionContext {
    TenantId = ctx.TenantId,
    ConfigKey = "sync.compute.provider",
    RequiredCapabilities = ["circuit_breaker", "durable_emit", "result_cache"]
  });
var result = await gateway.ComputeWithCircuitBreakerAsync(ctx, computeFn, ct);
```

**Methods:**

| Method | Signature | Returns |
|--------|-----------|---------|
| ComputeWithCircuitBreakerAsync | (Dictionary\<string,object\> ctx, Func computeFn, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| CacheResultAsync | (idempotencyKey, Dictionary\<string,object\> result, ttl, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| EmitDurableEventAsync | (Dictionary\<string,object\> event, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |
| GetCachedResultAsync | (idempotencyKey, ct) | Task\<DataProcessResult\<Dictionary\<string,object\>\>\> |

**MACHINE:**
- 800ms budget (IRON RULE — exceeding = circuit breaker trip → fallback "pending")
- Durable emit: after sync compute → enqueue to gamification.completion.points (BEFORE returning to UI)
- Idempotency key set in Redis BEFORE F166 compute call (prevents T44 double-count via CF-37)
- Fallback path returns {status: "pending"} — not error — T44 async will complete

**FREEDOM (ES config):**
- sync_circuit_breaker_timeout_ms (default: 800, max: 2000)
- sync_result_cache_ttl_seconds (default: 60)
- sync_fallback_message_key (default: "gamification.pending")

**DNA Compliance:** 7/7 ✅

---

# DESIGN RULES DR-9 through DR-12

### DR-9: Anti-Abuse Gate Before Gamification Write (Ordering Rule)
```
DECISION: F221 IAntiAbuseGateService MUST execute BEFORE F166 IGamificationService
  on EVERY gamification write path. No exceptions. No reordering.
RATIONALE: If abuse check runs after points are written, fraudulent points exist in
  the ledger even briefly. Retroactive reversal is explicitly rejected
  (spec principle: "integrity over retroactivity").
IMPLEMENTATION: T71 step ordering: F221 → F222 → F166 → F224.
  AF-9 validates ordering in generated code via QG-2.
LOCKED: YES
```

### DR-10: Wrap-Don't-Replace for Backward Compatibility
```
DECISION: New Family 24 factories that enhance existing V1 factories MUST wrap them
  via CreateAsync(), never replace them. V1 call paths remain functional.
RATIONALE: T44 (Family 17) still calls F169 directly. T44 calls F172 directly.
  If F222 replaced F169 or F219 replaced F172, V1 flows would break.
IMPLEMENTATION: F219 wraps F172 (adds persistence + rules around math).
  F222 wraps F169 (adds timezone conversion before calling F169's RecordActivityAsync).
  Both use CreateAsync() internally.
LOCKED: YES | APPLIES TO: F219→F172, F222→F169
```

### DR-11: Event Type Isolation for Social vs Completion Points
```
DECISION: Social engagement points and lesson completion points MUST use different
  event types and different queue streams. Never conflated.
RATIONALE: CF-34 analysis shows conflation would break T67 reconciliation, T44 scoring,
  and analytics. Different point sources serve different business metrics.
IMPLEMENTATION:
  Completion: GamificationPointsAwarded → gamification.completion.points stream
  Social: GamificationSocialPointsAwarded → gamification.social.points.awarded stream
LOCKED: YES
```

### DR-12: Tumbling Window for Engagement Aggregation
```
DECISION: Social engagement events (grades, comments) are aggregated in tumbling windows
  before routing to gamification. Individual events are NOT routed one-by-one.
RATIONALE: 500 grades in a day would generate 500 gamification writes without aggregation.
  Window aggregation bounds write load and enables per-window caps.
IMPLEMENTATION: F223 tumbling window: flush on time (default 15min) OR count (default 10).
  Whichever triggers first. Idempotent on replay (window key).
LOCKED: YES
```

---

# DNA COMPLIANCE MATRIX — Family 24

| DNA Pattern | F219 Grading | F220 Comment | F221 AntiAbuse | F222 Streak | F223 Engagement | F224 SyncGateway |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **DNA-1** ParseDocument (Dictionary) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-2** BuildSearchFilter (skip empty) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-3** DataProcessResult\<T\> | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-4** MicroserviceBase (19 components) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-5** Scope Isolation (tenantId) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-6** DynamicController | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DNA-7** W3C Trace Context | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total: 42/42 (7 patterns × 6 factories) = 100% compliance**
**Combined with Family 23 (42/42): 84/84 across 12 new factories = 100%**
**System total: 457/457 (7 × 65 factories across all families)**

---

## System State Update (Post Family 24)

| Metric | Pre-Family24 | Post-Family24 | Delta |
|--------|-------------|---------------|-------|
| Factory interfaces | F1-F218 | F1-F224 | +6 |
| Factory families | 23 | 24 | +1 |
| DNA compliance | 415/415 | 457/457 | +42 |

```
FACTORIES (continuous):
  F1-F218  [through Family 23]
  F219-F224 [FLOW-05 Engagement, Family 24] ← NEW
  Next: F225
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-06 MERGE — Family 25: MARKETPLACE PUBLISHING & DISTRIBUTION
# Merged from: FLOW06_P1_FACTORIES_v2.md + v3 patches
# Date: 2026-02-26 | Save Point: MERGE:P1
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## FAMILY 25 — MARKETPLACE PUBLISHING & DISTRIBUTION
**Flow**: FLOW-06
**Factories**: F225-F233 (9 interfaces)
**Entry event**: MarketplaceItemCreated
**Primary flows serviced**: F225→F226→[F227+F228+F229]→[F230+F231+F232+F233]

---

## F225 — IMarketplaceInventoryService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `marketplace_inventory_{tenantId}` (composite: tenantId+itemId) | Strong-consistency CRUD for stock levels |
| DATABASE FABRIC | Skill 05 | Redis | `cache:inventory:{tenantId}:{itemId}` STRING (TTL 60s) | Low-latency stock reads for display |
| QUEUE FABRIC | Skill 04 | Redis Streams | `marketplace.inventory.events` consumer group `inventory-main` | Emit InventoryDepleted, InventoryRestored events |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var inventoryService = await _factory.CreateAsync<IMarketplaceInventoryService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "inventory-crud", "stock-tracking", "depletion-events" },
        FabricHint = "database:pg+redis,queue:redis-streams"
    });
```

### Methods

1. `CreateItemAsync(itemData: Dictionary<string,object>) → DataProcessResult<string>` — itemId
2. `UpdateStockAsync(itemId, delta: int, reason: string) → DataProcessResult<StockState>`
3. `GetAvailabilityAsync(itemId) → DataProcessResult<Dictionary<string,object>>`
4. `ReserveStockAsync(itemId, quantity, reservationToken) → DataProcessResult<bool>`
5. `ReleaseReservationAsync(reservationToken) → DataProcessResult<bool>`
6. `EmitDepletionEventAsync(itemId) → DataProcessResult<bool>` — publishes InventoryDepleted to queue

### DISTINCT FROM

- **F205 (IListingService, FLOW-04)**: F205 manages CONTENT listings (posts, media). F225 manages PHYSICAL/SERVICE INVENTORY (stock, reservations, depletion). Different domains, different DB schemas, separate event streams.
- **F166 (IInventoryService, FLOW-05)**: F166 manages lesson content availability (seat counts). F225 manages physical product/service stock with reservations and atomic depletion.

### MACHINE (non-negotiable)

- InventoryDepleted event MUST be published BEFORE the API response returns to the buyer (transactional outbox pattern — event IFF DB commit)
- Stock MUST be decremented atomically (no race conditions — DB-level row lock + Redis DECR)
- ReserveStockAsync MUST be idempotent (same reservationToken = same result)
- Raw stock levels NEVER exposed in public API responses (competitive intelligence protection)

### FREEDOM (admin-configurable via ES)

- Low-stock alert threshold (default: 10 units)
- Stock cache TTL (default: 60s)
- Reservation expiry duration (default: 15 minutes)
- Bulk pricing tier breakpoints (default: 10/50/100 units)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | itemData = Dictionary<string,object>, no typed ItemModel |
| DNA-2 | BuildSearchFilter | ✅ | GetAvailabilityAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 6 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Service inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every PG query AND Redis key |
| DNA-6 | DynamicController | ✅ | No InventoryController — DynamicController routes |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to all downstream calls |

---

## F226 — IMarketplaceListingService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `marketplace_listings_{tenantId}` | Listing lifecycle, state machine transitions |
| DATABASE FABRIC | Skill 05 | Redis | `cache:listing:{tenantId}:{listingId}` HASH | Pricing rules, discount cache |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `marketplace-listings-{tenantId}` | Searchable listing index, full-text |
| FLOW ENGINE FABRIC | Skill 09 | IFlowOrchestrator | correlationKey: listingId | Durable timer for listing expiry |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var listingService = await _factory.CreateAsync<IMarketplaceListingService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "listing-lifecycle", "pricing-rules", "state-machine", "timer-events" },
        FabricHint = "database:pg+redis+es,flow-engine:orchestrator"
    });
```

### Methods

1. `CreateListingAsync(itemId, listingData: Dictionary<string,object>) → DataProcessResult<string>` — listingId
2. `PublishListingAsync(listingId) → DataProcessResult<ListingState>`
3. `TransitionStateAsync(listingId, targetState, reason) → DataProcessResult<ListingState>`
4. `ApplyPricingRulesAsync(listingId, audienceType, basePrice) → DataProcessResult<Dictionary<string,object>>`
5. `ScheduleExpiryAsync(listingId, expiresAt: DateTime) → DataProcessResult<bool>`
6. `DeactivateListingAsync(listingId, reason) → DataProcessResult<bool>`
7. `SearchListingsAsync(filters: Dictionary<string,object>) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`

### State Machine (MACHINE — transitions fixed in code)

```
Draft ──publish──► Active ──soldOut──► SoldOut ──restock──► Active
  │                  │                                         │
  └──discard──►Deleted └──deactivate──►Deactivated ◄──────────┘
```

Transitions: Draft→Active, Active→SoldOut, Active→Deactivated, SoldOut→Active, Deactivated→Deleted

### DISTINCT FROM

- **F226 vs F208 (IPostPublishingService, FLOW-04)**: F208 publishes SOCIAL CONTENT (posts with reactions, comments). F226 manages COMMERCE LISTINGS (pricing, inventory link, purchase state). Separate state machines, separate lifecycles.
- **F226 vs T63 (ListingLifecycle, FLOW-04)**: T63 describes the post content lifecycle. F226 implements the marketplace commerce lifecycle — pricing + inventory + legal (return policy).

### MACHINE (non-negotiable)

- State transitions MUST follow the defined state machine diagram (invalid transitions = BUILD FAILURE)
- Discount MUST be applied server-side only (never trust client-side price)
- Friend discount: 5–10% (floor and ceiling enforced by MACHINE, exact % = FREEDOM)
- Group discount: 10–15% (floor and ceiling enforced by MACHINE, exact % = FREEDOM)
- Listing expiry timer MUST use FLOW ENGINE FABRIC (not cron) for resume-ability

### FREEDOM (admin-configurable via ES)

- Friend discount exact percentage within 5-10% range (default: 7%)
- Group discount exact percentage within 10-15% range (default: 12%)
- Pre-order badge text (default: "Coming Soon")
- Listing visibility options (default: public, connections-only, groups-only)
- Price currency display format (default: seller's home currency + FX conversion)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | listingData = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | SearchListingsAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 7 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on all PG/ES/Redis queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes listing endpoints |
| DNA-7 | Trace Context | ✅ | traceparent on all fabric calls |

---

## F227 — IMarketplaceAnalyticsService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Elasticsearch | `marketplace-analytics-{tenantId}` | Audience segments, buyer personas, trend data |
| AI ENGINE FABRIC | Skill 07 | IAiProvider (AiDispatcher) | prompt: audience-profiling-v1 | LLM-based buyer persona inference |
| RAG FABRIC | Skill 00b | IRagService (Tiered strategy) | index: marketplace-intelligence | Retrieve market trend data for context |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var analyticsService = await _factory.CreateAsync<IMarketplaceAnalyticsService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "audience-profiling", "buyer-persona", "market-trends" },
        FabricHint = "database:es,ai:llm,rag:tiered"
    });
```

### Methods

1. `ProfileTargetAudienceAsync(itemId, listingData) → DataProcessResult<Dictionary<string,object>>`
2. `IdentifyBuyerPersonasAsync(audienceProfile) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
3. `GetMarketPresenceScoreAsync(businessId) → DataProcessResult<decimal>` — 0.0-1.0
4. `GetReputationScoreAsync(businessId) → DataProcessResult<decimal>` — 0.0-1.0
5. `RecordDistributionResultAsync(postId, distributionStats) → DataProcessResult<bool>`
6. `GetOptimalPricingInsightsAsync(itemId, category) → DataProcessResult<Dictionary<string,object>>`

### DISTINCT FROM

- **F197 (IAnalyticsService, FLOW-03)**: F197 tracks SOCIAL ENGAGEMENT analytics (event attendance, promotion reach). F227 profiles COMMERCIAL audiences (buyer personas, purchase intent, marketplace intelligence).
- **F209 (IPostAnalyticsService, FLOW-04)**: F209 analyzes content post performance. F227 analyzes marketplace listing performance + buyer profiling — different ES indices, different metric taxonomy.

### MACHINE

- Audience profile MUST be computed before cooperator matching begins (ordering enforced by T73)
- MarketPresenceScore and ReputationScore MUST feed into F229's synergy formula
- ES indices MUST be `marketplace-analytics-*` (never `lesson-*` or `social-*`)

### FREEDOM

- LLM model for persona inference (default: claude-sonnet)
- Number of buyer personas to return (default: 3)
- Audience segment taxonomy (default: industry/geography/company-size)
- Trend lookback window (default: 30 days)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | All audience/persona data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | ProfileTargetAudienceAsync skips empty fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 6 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId in every ES query |
| DNA-6 | DynamicController | ✅ | DynamicController routes analytics endpoints |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to AI ENGINE + RAG calls |

---

## F228 — IMarketplacePostGeneratorService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | MongoDB | `marketplace_posts` collection (tenantId field) | Store generated post content (flexible schema) |
| AI ENGINE FABRIC | Skill 07 | IAiProvider (AiDispatcher) | prompt: marketplace-post-gen-v1 | Generate headline, highlights, CTA from listing |
| AI ENGINE FABRIC | Skill 07 | AiDispatcher (multi-model) | parallel: claude+gpt → AF-10 merge | Competing post variants, pick highest quality |
| QUEUE FABRIC | Skill 04 | Redis Streams | `marketplace.post.events` consumer group `post-main` | Emit MarketplacePostCreated |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var postGenService = await _factory.CreateAsync<IMarketplacePostGeneratorService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "post-generation", "multi-model-content", "social-copy" },
        FabricHint = "database:mongodb,ai:multi-model,queue:redis-streams"
    });
```

### Methods

1. `GenerateMarketplacePostAsync(listingId, listingData, audienceProfile) → DataProcessResult<Dictionary<string,object>>`
2. `CheckDuplicateAsync(postContent, sellerId) → DataProcessResult<Dictionary<string,object>>` — similarity score + decision
3. `StorePostAsync(postData: Dictionary<string,object>) → DataProcessResult<string>` — postId
4. `GetPostPreviewAsync(postId) → DataProcessResult<Dictionary<string,object>>`
5. `UpdatePostStatusAsync(postId, status) → DataProcessResult<bool>`

### DISTINCT FROM

- **F208 (IPostPublishingService, FLOW-04)**: F208 handles SOCIAL CONTENT posts (user-authored, engagement-driven). F228 AUTO-GENERATES commerce posts from structured listing data — AI-authored, product-driven, different prompt library, different content schema.
- Content from F228 always has a `listingId` linkage and `specialOffer` field — F208 posts have neither.

### MACHINE

- Duplicate detection: >90% NLP similarity to existing seller posts = BLOCK (emit DuplicateDetected event, DO NOT publish)
- Post MUST include: headline, highlights (≥2), media reference, CTA, specialOffer
- Multi-model generation MUST run AF-5 (AiDispatcher) + AF-10 (Merge) — single-model shortcut forbidden
- MarketplacePostCreated event MUST be emitted only AFTER successful MongoDB write

### FREEDOM

- LLM model selection for post generation (default: claude-sonnet + gpt-4o)
- Duplicate detection threshold (default: 0.90 — but configurable 0.80-0.95)
- Max post length in characters (default: 500)
- Tone/style prompt variant (default: "professional-engaging")
- Special offer badge display format (default: countdown timer HH:MM:SS)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | postData = Dictionary<string,object>, no typed PostModel |
| DNA-2 | BuildSearchFilter | ✅ | CheckDuplicateAsync uses BuildSearchFilter for ES similarity query |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId field in MongoDB, sellerId in duplicate check scope |
| DNA-6 | DynamicController | ✅ | DynamicController routes post generation endpoints |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to AI ENGINE (all model calls) |

---

## F229 — ICooperatorMatchingService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `cooperator_profiles_{tenantId}` | Collaboration history, business profiles |
| DATABASE FABRIC | Skill 05 | Redis | `cache:synergy:{tenantId}:{itemId}:{businessId}` HASH | Cache computed synergy scores (TTL 3600s) |
| AI ENGINE FABRIC | Skill 07 | IAiProvider | prompt: product-complementarity-v1 | LLM determines product complement category |
| RAG FABRIC | Skill 00b | IRagService (Hybrid strategy) | index: marketplace-intelligence | Market presence + reputation context |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var matchingService = await _factory.CreateAsync<ICooperatorMatchingService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "synergy-scoring", "product-complementarity", "cooperation-classification" },
        FabricHint = "database:pg+redis,ai:llm,rag:hybrid"
    });
```

### Methods

1. `CalculateSynergyAsync(itemId, candidateBusinessId) → DataProcessResult<Dictionary<string,object>>`
2. `FindCooperatorsAsync(itemId, minSynergy, maxResults) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
3. `ClassifyCooperationTypeAsync(synergyScore: decimal) → DataProcessResult<string>` — cooperation type
4. `GetProductComplementarityAsync(categoryA, categoryB) → DataProcessResult<Dictionary<string,object>>`
5. `StoreCollaborationHistoryAsync(itemId, cooperatorId, outcome) → DataProcessResult<bool>`

### Synergy Formula (MACHINE — structure fixed, weights = FREEDOM)

```
synergy = (audienceOverlap × w1) + (productComplement × w2) + (marketPresence × w3) + (reputation × w4) + (collaborationHistory × w5)

MACHINE: must have exactly 5 factors, weighted sum, range [0.0, 1.0]
FREEDOM: w1=0.30, w2=0.25, w3=0.20, w4=0.15, w5=0.10 (must sum to 1.0)

Cooperation types (thresholds = FREEDOM):
  cross_promotion:      synergy ≥ 0.50
  bundle_partner:       synergy ≥ 0.70
  referral_partner:     synergy ≥ 0.40
  distribution_channel: synergy ≥ 0.60
  competing:            complementarity = 0.0 → synergy = 0.0 (MACHINE override)
```

### DISTINCT FROM

- **F170 (ICooperatorService, FLOW-05)**: F170 manages cooperator RELATIONSHIPS (who is connected to whom, connection graph). F229 COMPUTES SYNERGY SCORES (how complementary are two businesses). F170 = lookup; F229 = compute engine with AI + RAG.
- **F229 vs F197 (FLOW-03 analytics)**: F197 tracks event analytics. F229 computes real-time business compatibility — different formula, different data source, different purpose.

### MACHINE

- Synergy formula MUST use exactly 5 weighted factors (adding/removing = BUILD FAILURE)
- Competing products (complementarity=0.0) MUST produce synergy=0 regardless of other factors
- Rate limit: max 50 synergy calculations per minute per tenant
- Product complementarity MUST route through AI ENGINE FABRIC (never hardcoded rule tables)
- Synergy scores MUST be cached in Redis with configurable TTL

### FREEDOM

- Factor weight values (must sum to 1.0; default: 0.30/0.25/0.20/0.15/0.10)
- Cooperation type thresholds (default: cross_promo≥0.5, bundle≥0.7, referral≥0.4, dist≥0.6)
- Max cooperators returned per listing (default: 20)
- LLM model for complementarity (default: claude-sonnet)
- Synergy score cache TTL (default: 3600s)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | All synergy data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | FindCooperatorsAsync uses BuildSearchFilter on candidate pool |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG queries, Redis key prefix |
| DNA-6 | DynamicController | ✅ | DynamicController routes cooperator endpoints |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to AI ENGINE + RAG calls |

---

## F230 — IMarketplaceConnectionService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Neo4j | graph: `(:User)-[:CONNECTED_TO]-(:User)` with properties | Graph traversal for friend discovery |
| DATABASE FABRIC | Skill 05 | PostgreSQL | `marketplace_purchase_affinity_{tenantId}` | Purchase history, affinity scores |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var connectionService = await _factory.CreateAsync<IMarketplaceConnectionService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "friend-audience", "purchase-affinity", "graph-query" },
        FabricHint = "database:neo4j+pg"
    });
```

### Methods

1. `GetFriendAudienceAsync(sellerId, postId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
2. `GetPurchaseAffinityScoreAsync(userId, itemCategory) → DataProcessResult<decimal>` — 0.0-1.0
3. `FilterByRelevanceAsync(friendList, minAffinity) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
4. `GetConnectionDepthAsync(userId, candidateId) → DataProcessResult<int>` — 1=direct, 2=2nd degree

### DISTINCT FROM

- **Existing ConnectionService (FLOW-07 dep)**: The existing service manages social graph connections. F230 ADDS marketplace-specific purchase affinity scoring on top of the social graph — different queries, different result shape, separate factory.

### MACHINE

- Purchase affinity score MUST consider previous purchases (not just category interest)
- Graph queries MUST include tenantId in all traversals (scope isolation on Neo4j)
- Friend audience MUST exclude the seller themselves

### FREEDOM

- Minimum purchase affinity threshold for friend targeting (default: 0.3)
- Max friends per batch (default: 500)
- Graph traversal depth (default: 2nd degree connections)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Friend/affinity data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | FilterByRelevanceAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId in Neo4j traversal + PG queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes connection endpoints |
| DNA-7 | Trace Context | ✅ | traceparent on all fabric calls |

---

## F231 — IMarketplaceGroupService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `marketplace_groups_{tenantId}` (marketplace_enabled flag) | Group membership, marketplace eligibility |
| DATABASE FABRIC | Skill 05 | MongoDB | `group_marketplace_sections` collection | Flexible group marketplace section config |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var groupService = await _factory.CreateAsync<IMarketplaceGroupService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "group-marketplace", "auto-post", "marketplace-eligibility" },
        FabricHint = "database:pg+mongodb"
    });
```

### Methods

1. `GetMarketplaceEnabledGroupsAsync(sellerId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
2. `GetGroupRelevanceScoreAsync(groupId, itemCategory) → DataProcessResult<decimal>`
3. `AutoPostToGroupAsync(groupId, postId, sellerId) → DataProcessResult<bool>`
4. `GetGroupMemberCountAsync(groupId) → DataProcessResult<int>`

### DISTINCT FROM

- **Existing GroupService**: Manages general group membership and content. F231 adds the `marketplace_enabled` flag query + relevance scoring + auto-post capability — marketplace-specific overlay on top of general group infrastructure.

### MACHINE

- Auto-post to group ONLY when `marketplace_enabled = true` on that group
- Group discount: 10-15% range enforced (floor/ceiling = MACHINE, exact % = FREEDOM)
- Seller MUST be a member of the group to auto-post

### FREEDOM

- Group relevance scoring weights (category match vs member count vs activity level)
- Max groups to auto-post per listing (default: 5)
- Group member discount exact percentage within 10-15% range (default: 12%)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Group/section data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetMarketplaceEnabledGroupsAsync skips empty filters |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG + MongoDB queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes group endpoints |
| DNA-7 | Trace Context | ✅ | traceparent on all fabric calls |

---

## F232 — IMarketplaceFeedService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| QUEUE FABRIC | Skill 04 | Redis Streams | `marketplace.feed.distribution` consumer group `feed-main` | HIGH-PRIORITY consumer for InventoryDepleted override |
| QUEUE FABRIC | Skill 04 | Redis Streams | `marketplace.feed.distribution` consumer group `feed-content` | Normal feed card distribution |
| DATABASE FABRIC | Skill 05 | Redis Cluster | `feed:{tenantId}:{userId}` LIST (LPUSH) | Write feed entries to user feeds |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `marketplace-feed-cards-{tenantId}` | Indexed card metadata for recall |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var feedService = await _factory.CreateAsync<IMarketplaceFeedService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "feed-distribution", "card-formats", "inventory-override", "batch-write" },
        FabricHint = "queue:redis-streams,database:redis-cluster+es"
    });
```

### Methods

1. `DistributeToFriendFeedsAsync(postId, friendAudience, cardType) → DataProcessResult<Dictionary<string,object>>`
2. `DistributeToGroupFeedsAsync(postId, groupAudience, cardType) → DataProcessResult<Dictionary<string,object>>`
3. `DistributeToCooperatorFeedsAsync(postId, cooperators, synergyBand) → DataProcessResult<Dictionary<string,object>>`
4. `MarkSoldOutAsync(itemId) → DataProcessResult<int>` — batch update count
5. `GetCardTemplateAsync(cardType, synergyBand) → DataProcessResult<Dictionary<string,object>>`

### Card Types (FREEDOM — configurable via ES)

```
PRODUCT_CARD:      Default friend/group distribution (itemDetails + price + CTA + badge)
PARTNERSHIP_CARD:  Cooperator distribution (synergyScore + complementaryProducts + "Partnership Opportunity")
SERVICE_CARD:      Service listings variant (deliverables + timeline + rate card)

Synergy bands for PARTNERSHIP_CARD:
  HIGH:   synergy > 0.75 → full partnership data + direct negotiation CTA
  MEDIUM: synergy 0.50-0.75 → overview + "Learn More" CTA
  LOW:    synergy < 0.50 → minimal card (referral opportunity only)
```

### DISTINCT FROM

- **F173 (IFeedDistributionService, FLOW-05)**: F173 distributes LESSON CONTENT cards. F232 distributes MARKETPLACE COMMERCE cards (product/partnership/service types). Separate Redis Streams, separate ES indices, separate card schema registry.

### MACHINE

- InventoryDepleted MUST trigger batch MarkSoldOutAsync within SLA < 30s (HIGH-PRIORITY consumer group)
- Competing cooperators (synergy=0) NEVER receive partnership cards
- Batch size cap: 500 feeds per batch (MACHINE ceiling — prevents queue overwhelm)
- `feed:` Redis key prefix isolation from lesson feed `lesson-feed:` keys (CF-43 enforcement)

### FREEDOM

- Card template design per card type and synergy band (via ES document)
- Countdown timer format for limited-time offers (default: HH:MM:SS)
- Friend feed batch size (default: 500)
- Card expiry TTL in Redis (default: 7 days)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | All card data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetCardTemplateAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId in every Redis key + ES index |
| DNA-6 | DynamicController | ✅ | DynamicController routes feed endpoints |
| DNA-7 | Trace Context | ✅ | traceparent on all downstream queue + DB calls |

---

## F233 — ICooperatorNotificationService

**Family:** 25 (MARKETPLACE PUBLISHING)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| QUEUE FABRIC | Skill 04 | Redis Streams | `marketplace.notification.events` consumer group `notif-main` | Emit CooperatorNotificationsSent event |
| DATABASE FABRIC | Skill 05 | Redis | `rate:notif:{tenantId}:{cooperatorId}` COUNTER (sliding window) | Rate limit: 5 partnership requests/day |
| DATABASE FABRIC | Skill 05 | Redis | `cache:notif-prefs:{tenantId}:{cooperatorId}` | Notification channel preferences |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var notifService = await _factory.CreateAsync<ICooperatorNotificationService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "partnership-notifications", "rate-limiting", "channel-routing" },
        FabricHint = "queue:redis-streams,database:redis"
    });
```

### Methods

1. `SendPartnershipOpportunityAsync(cooperatorId, itemId, synergyData) → DataProcessResult<bool>`
2. `CheckRateLimitAsync(cooperatorId) → DataProcessResult<bool>` — true = allowed
3. `GetNotificationPreferencesAsync(cooperatorId) → DataProcessResult<Dictionary<string,object>>`
4. `BatchNotifyCooperatorsAsync(cooperators, itemId) → DataProcessResult<Dictionary<string,object>>`

### DISTINCT FROM

- **F212 (IDistributionAnalyticsService, FLOW-04)**: F212 tracks content distribution analytics. F233 sends REAL-TIME PARTNERSHIP NOTIFICATIONS to cooperators — different event types, different channels, different rate limiting logic.

### MACHINE

- Rate limit: MAXIMUM 5 partnership notifications per cooperator per day (security: anti-spam)
- If rate limit exceeded: emit RateLimitExceeded event + discard silently (do NOT error to sender)
- Notification MUST include: synergyScore, cooperationType, complementaryProducts, itemId
- Rate limit counter MUST use sliding window (not fixed window) to prevent boundary burst attacks

### FREEDOM

- Notification channel preferences per cooperator (default: in-app + email)
- Daily rate limit value (default: 5 — within security-reviewed range)
- Partnership notification template content (localized via ES document)

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | All notification/preference data as Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | BatchNotifyCooperatorsAsync uses BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId in all Redis keys + queue consumer groups |
| DNA-6 | DynamicController | ✅ | DynamicController routes notification endpoints |
| DNA-7 | Trace Context | ✅ | traceparent on queue emit + downstream calls |

---

## DESIGN RECORDS (DR-13 to DR-16)

### DR-13 — Transactional Outbox for Inventory Events

**Decision**: InventoryDepleted MUST be emitted via transactional outbox (write to DB + outbox table in single transaction, relay publishes to queue).

**Rationale**: If inventory write succeeds but queue emit fails, feeds could show "Available" for depleted items. Transactional outbox guarantees eventual consistency.

**Impact**: F225 (IMarketplaceInventoryService) must implement outbox relay pattern. MACHINE rule: event guaranteed IFF DB commit.

**Alternatives Rejected**: Saga compensations (too slow for stock depletion), best-effort publish (race condition risk too high for inventory).

---

### DR-14 — Durable Timer for Listing Expiry via Flow Engine

**Decision**: All listing lifecycle timers (offer expiry, grace periods, pre-order end dates) MUST use FLOW ENGINE FABRIC (Skill 09 IFlowOrchestrator) durable timers, NOT cron jobs.

**Rationale**: Cron jobs don't survive restarts and have no resume capability. Flow engine timers are persistent checkpoints that survive pod restarts. Critical for 48-hour grace period reliability.

**Impact**: F226 (IMarketplaceListingService) integrates with IFlowOrchestrator for timer scheduling. Each timer is a correlationKey-linked flow step.

**Alternatives Rejected**: Redis EXPIRE key (no audit trail, no compensation), Kubernetes CronJob (no per-listing granularity).

---

### DR-15 — Synergy Scoring Language-Agnostic via AI ENGINE FABRIC

**Decision**: Product complementarity classification MUST use AI ENGINE FABRIC (IAiProvider), not a Python ML model or hardcoded rule table.

**Rationale**: The spec mentions Python as a candidate for synergy logic. In the engine architecture, ALL AI calls go through IAiProvider (Skill 07) regardless of the underlying model — this preserves fabric-first, enables model swapping via config.

**Impact**: F229 (ICooperatorMatchingService) calls IAiProvider.GenerateAsync(prompt: product-complementarity-v1) — never imports Python ML libraries or hardcodes complementarity rules.

**Alternatives Rejected**: Hardcoded rule tables (cannot generalize new categories), direct Python calls (breaks fabric-first, creates language coupling).

---

### DR-16 — Separate High-Priority Consumer Group for InventoryDepleted

**Decision**: F232 (IMarketplaceFeedService) registers TWO consumer groups on the same stream: `feed-main` (HIGH-PRIORITY, InventoryDepleted only) and `feed-content` (normal priority, card distribution).

**Rationale**: If a single consumer group processes both, InventoryDepleted can be queued behind hundreds of card distribution events — causing stale "Available" displays for minutes. Separate consumer group guarantees InventoryDepleted is processed within the 30s SLA even under high distribution load.

**Impact**: CF-45 enforces that inventory events and content events use separate stream partitions.

**Alternatives Rejected**: Single consumer group with priority flag (Redis Streams doesn't support native priority), separate streams entirely (operational overhead; same service manages both).

---

## FAMILY 25 SUMMARY TABLE

| Factory | Interface | Primary Fabric | Secondary Fabrics | Key Methods |
|---------|-----------|---------------|-------------------|-------------|
| F225 | IMarketplaceInventoryService | DB(PG) | Queue | 6 methods |
| F226 | IMarketplaceListingService | DB(PG) | DB(Redis+ES), Flow Engine | 7 methods |
| F227 | IMarketplaceAnalyticsService | DB(ES) | AI Engine, RAG | 6 methods |
| F228 | IMarketplacePostGeneratorService | DB(MongoDB) | AI Engine (multi-model), Queue | 5 methods |
| F229 | ICooperatorMatchingService | DB(PG) | DB(Redis), AI Engine, RAG | 5 methods |
| F230 | IMarketplaceConnectionService | DB(Neo4j) | DB(PG) | 4 methods |
| F231 | IMarketplaceGroupService | DB(PG) | DB(MongoDB) | 4 methods |
| F232 | IMarketplaceFeedService | Queue | DB(Redis Cluster+ES) | 5 methods |
| F233 | ICooperatorNotificationService | Queue | DB(Redis) | 4 methods |

**Total DNA compliance: 63/63 (7 patterns × 9 factories) ✅**

---

## SAVE POINT: MERGE:P1 ✅
## Next: Phase 2 — T72-T76 Task Type Contracts + AF Station Map + Template 16
## Recovery: "Continue FLOW-06 Phase 2" → generate FLOW06_P2_TASK_TYPES.md

---

## DNA-8 — Transactional Outbox (NEW — introduced by FLOW-06)

**Pattern**: Domain events MUST be published atomically with the database write that produces them. Event is written to an outbox table in the same DB transaction; a separate poller/CDC reads the outbox and publishes to the queue fabric. Never fire-and-forget.

**Applicability in Family 25:**

| Factory | DNA-8 Applicable? | Evidence |
|---------|-------------------|----------|
| F225 IMarketplaceInventoryService | YES | InventoryDepleted via outbox (MACHINE rule + DR-13) |
| F226 IMarketplaceListingService | YES | ListingPublished via outbox (state machine transition) |
| F227 IMarketplaceAnalyticsService | N/A | Reads data, emits analysis — no transactional domain events |
| F228 IMarketplacePostGeneratorService | YES | MarketplacePostCreated must be atomic with post storage |
| F229 ICooperatorMatchingService | N/A | Computes scores — caches results, no domain state mutation |
| F230 IMarketplaceConnectionService | N/A | Reads graph — no domain events published |
| F231 IMarketplaceGroupService | N/A | Reads groups — no domain events published |
| F232 IMarketplaceFeedService | YES | MarketplaceFeedDistributed must be atomic with card writes |
| F233 ICooperatorNotificationService | N/A | Notification delivery — idempotent retry, not transactional |

**DNA-8 compliance: 4/4 applicable PASS, 5 N/A**

---

## ENGINE PRIMITIVES (NEW category — introduced by FLOW-06)

### EP-1 — State Machine Registry

**Purpose**: Declarative state transitions with validation. Invalid transition = BUILD FAILURE.
**Exercised by**: F226 IMarketplaceListingService
**States**: Draft → Active → SoldOut → Expired → Deactivated (+ Active ← SoldOut for restock)
**Implementation**: State + valid transitions stored as MACHINE constants in engine contract. Generated code validates transition before executing. Optimistic locking (version field) prevents concurrent state change race conditions.
**Fabric**: FLOW ENGINE FABRIC (Skill 09) for durable checkpoints.

### EP-2 — Durable Timer Service

**Purpose**: Resume-able timers that survive pod restarts. Fires once reliably.
**Exercised by**: F226 (listing expiry) + FLOW ENGINE FABRIC (Skill 09)
**Use cases**: Limited-time offer expiry, 48-hour grace period after price change, restock reminder
**Implementation**: Timer registered through Flow Engine Fabric, NOT cron. Timer state persisted in Elasticsearch. On pod restart, timer resumes from checkpoint.
**Design record**: DR-14

### EP-3 — Card Schema Registry

**Purpose**: Config-driven card type definitions. New card types via ES config, not code changes.
**Exercised by**: F232 IMarketplaceFeedService
**Card types**: PRODUCT_CARD, PARTNERSHIP_CARD, SERVICE_CARD, PREORDER_CARD
**Implementation**: Card templates stored in ES config document. Card type selection logic reads FREEDOM config. All card data as Dictionary<string,object> (DNA-1).
**Design record**: DR-16 (dual consumer group for priority handling)

---

## Integration Changelog (FLOW-06)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-06 Marketplace Publishing merge | F225-F233 (+9) | T72-T76 (+5) | CF-42-CF-51 (+10) | Family 25, Template 16, DNA-8, EP-1/2/3 |

---

## System State Update (Post Family 25 / FLOW-06)

| Metric | Pre-FLOW-06 | Post-FLOW-06 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F224 | F1-F233 | +9 |
| Factory families | 24 | 25 | +1 |
| DNA patterns | 7 | 8 (DNA-8 Transactional Outbox) | +1 |
| DNA compliance | 457/457 | 524/524 | +67 (63 universal + 4 DNA-8) |
| Design records | DR-1-DR-12 | DR-1-DR-16 | +4 |
| Engine primitives | 0 | 3 (EP-1/2/3) | +3 |

```
FACTORIES (continuous):
  F1-F224  [through Family 24]
  F225-F233 [FLOW-06 Marketplace, Family 25] <- NEW
  Next: F234
```

# FLOW-07 MERGE — Family 26: FRIEND REQUEST & FEED INTEGRATION
# Merged from: FLOW07_UNIFIED_EXECUTION_PLAN.md Phase 1
# Date: 2026-02-26 | Save Point: MERGE:P1
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


## FAMILY 26 — FRIEND REQUEST & FEED INTEGRATION LAYER
**Flow**: FLOW-07
**Factories**: F234-F243 (10 interfaces)
**Entry event**: FriendRequestSent
**Primary flows serviced**: F234→F235→F236→[F237+F238+F239+F240]→F241→F242→F243(scheduled)
**Cross-flow reads**: F208 (FLOW-04 post retrieval), F173 (FLOW-05 feed patterns), F230 (FLOW-06 graph queries)

---

## F234 — IConnectionGraphService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Neo4j | `connection_graph_{tenantId}` with edge labels `FRIEND_OF`, `BLOCKED_BY` | Bidirectional social graph edges + strength properties |
| DATABASE FABRIC | Skill 05 | PostgreSQL | `friend_requests_{tenantId}` (composite: tenantId+requestId) | Request lifecycle state machine (Pending/Accepted/Rejected/Withdrawn) |
| DATABASE FABRIC | Skill 05 | Redis | `rate:connect:{tenantId}:{userId}` ZSET (TTL 86400s) | Sliding window rate limit for friend requests |
| DATABASE FABRIC | Skill 05 | Redis | `cache:connection:{tenantId}:{connectionId}` HASH (TTL configurable) | Hot connection data cache |
| QUEUE FABRIC | Skill 04 | Redis Streams | `connection.lifecycle.events` consumer group `connection-main` | Emit FriendRequestSent, FriendRequestAccepted events |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var connectionService = await _factory.CreateAsync<IConnectionGraphService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "graph-write", "request-lifecycle", "block-check", "rate-limit" },
        FabricHint = "database:neo4j+pg+redis,queue:redis-streams"
    });
```

### Methods

1. `SendRequestAsync(tenantId, senderId, recipientId, requestContext: Dictionary<string,object>) → DataProcessResult<string>` — requestId
2. `AcceptRequestAsync(tenantId, requestId, recipientId) → DataProcessResult<Dictionary<string,object>>` — connectionId + integrationId
3. `RejectRequestAsync(tenantId, requestId, recipientId, reason) → DataProcessResult<bool>`
4. `WithdrawRequestAsync(tenantId, requestId, senderId) → DataProcessResult<bool>`
5. `CheckBlockStatusAsync(tenantId, userId, targetId) → DataProcessResult<bool>` — true if blocked, generic result
6. `UpdateConnectionStrengthAsync(tenantId, connectionId, newStrength: decimal) → DataProcessResult<bool>`
7. `GetConnectionAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>`
8. `GetConnectionsByUserAsync(tenantId, userId, filters: Dictionary<string,object>) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`

### Connection State Machine (MACHINE — transitions fixed)

```
                  ┌──reject──► Rejected
Pending ──accept──► Accepted ──► Active ──weaken──► Weakening ──► Dormant
  │                                                                   │
  └──withdraw──► Withdrawn                          ◄──reconnect──────┘
```

Transitions: Pending→Accepted, Pending→Rejected, Pending→Withdrawn, Accepted→Active (auto after integration), Active→Weakening (strength < 0.5), Weakening→Dormant (strength < 0.2), Dormant→Active (reconnection)

### DISTINCT FROM

- **F230 (IMarketplaceConnectionService, FLOW-06)**: F230 READS the social graph for marketplace friend-audience discovery (read-only, purchase affinity scoring). F234 WRITES bidirectional FRIEND_OF edges, manages request lifecycle state machine, handles block detection, and updates connection strength. Different edge labels (`FRIEND_OF` vs `CONNECTED_TO`), different graph databases (`connection_graph` vs marketplace graph), write vs read-only.
- **F170 (ICooperatorService, FLOW-05)**: F170 manages cooperator lookup relationships. F234 manages social friend requests with lifecycle state machine, mutual-pending auto-accept, and evolving strength.

### MACHINE (non-negotiable)

- Block check MUST execute BEFORE request creation — CheckBlockStatusAsync called first; if blocked, return generic DataProcessResult with IsSuccess=false, no block information exposed
- Mutual-pending auto-accept: if A→B pending and B→A arrives, auto-accept BOTH and emit FriendRequestAccepted for BOTH
- All connections MUST be bidirectional (A↔B, never A→B only)
- Rate limit: configurable per-day cap, enforced via Redis ZSET sliding window
- FriendRequestSent and FriendRequestAccepted MUST use transactional outbox (DNA-8)
- Request deduplication: same sender+recipient pair within 24h = reject with "already pending"

### FREEDOM (admin-configurable via ES)

- Friend request rate limit (default: 20/day, range: 5-50) — `freedom_connection_{tenantId}`
- Connection cache TTL (default: 1h, range: 15min-24h) — `freedom_connection_{tenantId}`
- Graph query timeout (default: 2s, range: 1s-10s) — `freedom_connection_{tenantId}`
- Request expiry duration (default: 30 days, range: 7-90 days) — `freedom_connection_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | requestContext, connection data = Dictionary<string,object>, no FriendRequest class |
| DNA-2 | BuildSearchFilter | ✅ | GetConnectionsByUserAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 8 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on Neo4j traversal, PG queries, Redis keys |
| DNA-6 | DynamicController | ✅ | No ConnectionController — DynamicController routes /relations/* |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to all downstream fabric calls |
| DNA-8 | Transactional Outbox | ✅ | FriendRequestSent, FriendRequestAccepted via outbox (atomic with PG state write) |

---

## F235 — IMatchScoringService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `user_profiles_{tenantId}` | Read user profile data for scoring |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `match-scores-{tenantId}` | Store/retrieve computed match scores |
| DATABASE FABRIC | Skill 05 | Redis | `cache:match:{tenantId}:{sorted(userId1,userId2)}` HASH (TTL 3600s) | Cache pairwise match scores |
| AI ENGINE FABRIC | Skill 07 | IAiProvider via AiDispatcher | prompt: profile-compatibility-v1 | LLM-assisted profile compatibility analysis |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var matchService = await _factory.CreateAsync<IMatchScoringService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "profile-scoring", "compatibility-analysis", "cache-scoring" },
        FabricHint = "database:pg+es+redis,ai:dispatcher"
    });
```

### Methods

1. `CalculateMatchScoreAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — matchScore (0.0-1.0) + factors
2. `GetCachedScoreAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — cached score or miss
3. `BatchScoreAsync(tenantId, userId, candidateIds: IEnumerable<string>) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
4. `StoreScoreAsync(tenantId, userId1, userId2, scoreData: Dictionary<string,object>) → DataProcessResult<bool>`

### DISTINCT FROM

- **F229 (ICooperatorMatchingService, FLOW-06)**: F229 computes BUSINESS SYNERGY (product complementarity, 5-factor weighted formula for marketplace cooperation). F235 computes PERSONAL COMPATIBILITY (profile similarity, industry alignment, experience overlap for social connection). Different formula, different input data, different purpose — synergy vs compatibility.
- **F170 (ICooperatorService, FLOW-05)**: F170 does cooperator lookup. F235 does AI-powered pairwise scoring.

### MACHINE (non-negotiable)

- Match score MUST be symmetrical: score(A,B) = score(B,A) — enforce by sorting userId pair
- Score range clamped [0.0, 1.0]
- AI ENGINE FABRIC call MUST have configurable timeout (default: 5s)
- Cache key MUST use sorted(userId1, userId2) to guarantee symmetry
- Score MUST be pre-computed on FriendRequestSent (not on-demand at acceptance)

### FREEDOM (admin-configurable via ES)

- AI model for compatibility analysis (default: claude-sonnet) — `freedom_match_{tenantId}`
- Score cache TTL (default: 3600s, range: 600s-86400s) — `freedom_match_{tenantId}`
- Scoring factors and weights (default: industry=0.30, experience=0.25, interests=0.25, location=0.20) — `freedom_match_{tenantId}`
- Batch size for BatchScoreAsync (default: 50, range: 10-200) — `freedom_match_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | scoreData, profile data = Dictionary<string,object>, no MatchResult class |
| DNA-2 | BuildSearchFilter | ✅ | BatchScoreAsync filters use BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG, ES, Redis queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes /relations/* endpoints |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to AI ENGINE FABRIC calls |
| DNA-8 | Transactional Outbox | N/A | Computes and caches — no domain events published |

---

## F236 — IFeedIntegrationOrchestratorService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Redis | `integration_run:{tenantId}:{integrationId}` HASH | Orchestration state (branches pending/completed/defaulted) |
| DATABASE FABRIC | Skill 05 | PostgreSQL | `integration_runs_{tenantId}` (composite: tenantId+integrationId) | Durable integration_run record for recovery |
| QUEUE FABRIC | Skill 04 | Redis Streams | `feed.integration.orchestration` consumer group `orchestrator-main` | Emit FeedIntegrationStarted; consume sub-weight events |
| QUEUE FABRIC | Skill 04 | Redis Streams | `feed.weight.results` consumer group `weight-collector` | Consume GroupWeightCalculated, EventWeightCalculated, etc. |
| FLOW ENGINE FABRIC | Skill 09 | IFlowOrchestrator | correlationKey: integrationId | EP-2 Durable Timer for 10s allSettled deadline |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var orchestrator = await _factory.CreateAsync<IFeedIntegrationOrchestratorService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "integration-orchestration", "weight-collection", "deadline-timer", "state-tracking" },
        FabricHint = "database:redis+pg,queue:redis-streams,flow-engine:orchestrator"
    });
```

### Methods

1. `InitiateIntegrationAsync(tenantId, connectionId, userId1, userId2, baseMatchScore) → DataProcessResult<string>` — integrationId
2. `RecordSubWeightAsync(tenantId, integrationId, weightType: string, weightValue: decimal, factors: Dictionary<string,object>) → DataProcessResult<bool>`
3. `CheckCompletionAsync(tenantId, integrationId) → DataProcessResult<Dictionary<string,object>>` — status, completedBranches, pendingBranches
4. `ApplyDefaultsAndProceedAsync(tenantId, integrationId) → DataProcessResult<Dictionary<string,object>>` — applies 0.5 defaults for timed-out branches
5. `GetIntegrationRunAsync(tenantId, integrationId) → DataProcessResult<Dictionary<string,object>>`
6. `CancelIntegrationAsync(tenantId, integrationId, reason) → DataProcessResult<bool>` — for block-during-integration

### Orchestration State Machine

```
Created ──start──► WaitingForWeights ──allArrived──► Complete ──► FinalWeightRequested
                        │                                            │
                        └──timeout(10s)──► DefaultsApplied ──────────┘
                                                │
                                          (async retry queued for missing branches)
```

### DISTINCT FROM

- **FLOW-06 orchestrator pattern**: FLOW-06 orchestrated 3-way marketplace distribution (3 audience streams). F236 orchestrates 4-way weight fork with allSettled semantics, default fallback, and privacy mask enforcement. F236 also tracks integration_run state for recovery/retry.
- **F232 (IMarketplaceFeedService, FLOW-06)**: F232 distributes marketplace content. F236 orchestrates weight gathering — does not write feeds.

### MACHINE (non-negotiable)

- AllSettled semantics: proceed when all 4 arrive OR deadline expires (whichever first)
- Deadline MUST use EP-2 Durable Timer (survives pod restarts)
- Default weight for timed-out branch = configurable (MACHINE: default MUST be applied; FREEDOM: value)
- integrationId MUST be present on ALL emitted events (correlationKey)
- CancelIntegrationAsync MUST be callable at any point (block-during-integration scenario)
- integration_run state MUST be persisted in PG (durable) AND Redis (fast access)
- FeedIntegrationStarted event MUST use transactional outbox (DNA-8)

### FREEDOM (admin-configurable via ES)

- Weight timeout deadline (default: 10s, range: 5s-30s) — `freedom_connection_{tenantId}`
- Default missing weight value (default: 0.5, range: 0.3-0.7) — `freedom_connection_{tenantId}`
- Retry delay for missing branches (default: 30s, range: 10s-5min) — `freedom_connection_{tenantId}`
- Max retry attempts (default: 3, range: 1-10) — `freedom_connection_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Integration run data = Dictionary<string,object>, no IntegrationRun class |
| DNA-2 | BuildSearchFilter | ✅ | GetIntegrationRunAsync uses BuildSearchFilter for lookup |
| DNA-3 | DataProcessResult<T> | ✅ | All 6 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on Redis hash keys, PG queries, stream messages |
| DNA-6 | DynamicController | ✅ | DynamicController routes /relations/* endpoints |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to all 4 analyzer branches |
| DNA-8 | Transactional Outbox | ✅ | FeedIntegrationStarted via outbox (atomic with PG integration_run write) |

---

## F237 — IGroupWeightAnalyzerService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `group_memberships_{tenantId}` (read-only) | Group membership, roles, join dates |
| DATABASE FABRIC | Skill 05 | MongoDB | `group_activities` collection (read-only) | Activity overlap, interaction patterns |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var groupAnalyzer = await _factory.CreateAsync<IGroupWeightAnalyzerService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "group-overlap-analysis", "activity-scoring", "read-only" },
        FabricHint = "database:pg+mongodb"
    });
```

### Methods

1. `AnalyzeGroupOverlapAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — groupWeight (0.0-1.0) + weightFactors
2. `GetCommonGroupsAsync(tenantId, userId1, userId2) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`

### Sub-Weight Formula (MACHINE — structure fixed)

```
groupWeight = (commonCount × 0.30) + (activityOverlap × 0.30) + (roleSimilarity × 0.20) + (joinDateProximity × 0.20)
Range: [0.0, 1.0]
```

### DISTINCT FROM

- **F227 (IMarketplaceAnalyticsService, FLOW-06)**: F227 aggregates marketplace engagement analytics. F237 analyzes bidirectional group membership overlap between TWO specific users — different query pattern, different purpose.
- **F231 (IMarketplaceGroupService, FLOW-06)**: F231 checks marketplace-enabled groups for auto-posting. F237 reads group membership for pairwise user comparison.

### MACHINE (non-negotiable)

- Read-only access — MUST NOT write to group tables
- Sub-weight formula factors MUST sum to 1.0
- Output range clamped [0.0, 1.0]
- MUST be independently idempotent (same inputs → same output)

### FREEDOM (admin-configurable via ES)

- Sub-weight factor weights (default: 0.30/0.30/0.20/0.20, must sum to 1.0) — `freedom_weight_{tenantId}`
- Minimum common groups for non-zero weight (default: 1) — `freedom_weight_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Group data = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetCommonGroupsAsync skips empty filters |
| DNA-3 | DataProcessResult<T> | ✅ | All 2 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG + MongoDB queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes (no dedicated controller) |
| DNA-7 | Trace Context | ✅ | traceparent forwarded |
| DNA-8 | Transactional Outbox | N/A | Read-only analyzer — no domain events published |

---

## F238 — IEventWeightAnalyzerService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `event_registrations_{tenantId}` (read-only) | Event attendance, registrations, types |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var eventAnalyzer = await _factory.CreateAsync<IEventWeightAnalyzerService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "event-overlap-analysis", "co-attendance-scoring", "read-only" },
        FabricHint = "database:pg"
    });
```

### Methods

1. `AnalyzeEventOverlapAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — eventWeight (0.0-1.0) + weightFactors
2. `GetCommonEventsAsync(tenantId, userId1, userId2) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`

### Sub-Weight Formula (MACHINE — structure fixed)

```
eventWeight = (attendedSame × 0.35) + (typeMatch × 0.25) + (frequency × 0.20) + (futureOverlap × 0.20)
Range: [0.0, 1.0]
```

### DISTINCT FROM

- **F197 (FLOW-03 event analytics)**: F197 tracks event analytics aggregate metrics. F238 computes pairwise co-attendance analysis between TWO specific users.

### MACHINE (non-negotiable)

- Read-only access — MUST NOT write to event tables
- Sub-weight formula factors MUST sum to 1.0
- Output range clamped [0.0, 1.0]
- futureOverlap considers only events within next 90 days
- MUST be independently idempotent

### FREEDOM (admin-configurable via ES)

- Sub-weight factor weights (default: 0.35/0.25/0.20/0.20, must sum to 1.0) — `freedom_weight_{tenantId}`
- Future event lookahead window (default: 90 days, range: 30-180 days) — `freedom_weight_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Event data = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetCommonEventsAsync skips empty filters |
| DNA-3 | DataProcessResult<T> | ✅ | All 2 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes |
| DNA-7 | Trace Context | ✅ | traceparent forwarded |
| DNA-8 | Transactional Outbox | N/A | Read-only analyzer — no domain events |

---

## F239 — IPurchaseWeightAnalyzerService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `purchase_history_{tenantId}` (read-only) | Purchase categories, price ranges, brands |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var purchaseAnalyzer = await _factory.CreateAsync<IPurchaseWeightAnalyzerService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "purchase-overlap-analysis", "category-scoring", "privacy-masked", "read-only" },
        FabricHint = "database:pg"
    });
```

### Methods

1. `AnalyzePurchaseOverlapAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — purchaseWeight (0.0-1.0) + opaque weightFactors (NO raw purchase data)
2. `GetOverlapCategoriesAsync(tenantId, userId1, userId2) → DataProcessResult<IEnumerable<string>>` — category names ONLY, no amounts/items

### Sub-Weight Formula (MACHINE — structure fixed)

```
purchaseWeight = (categoryOverlap × 0.30) + (priceRangeMatch × 0.25) + (brandMatch × 0.25) + (wishlistSimilarity × 0.20)
Range: [0.0, 1.0]
```

### DISTINCT FROM

- **F232 (IMarketplaceFeedService, FLOW-06)**: F232 distributes marketplace content to feeds. F239 ANALYZES purchase patterns between two users for connection weight — completely different purpose.
- **F225 (IMarketplaceInventoryService, FLOW-06)**: F225 manages stock/inventory. F239 reads purchase HISTORY for similarity scoring.

### ⚠️ PRIVACY MASK — IRON RULE

**Raw purchase data (amounts, item names, order IDs, prices, transaction dates) MUST NEVER appear in the return value.** Only aggregate float weight (0.0-1.0) and opaque weightFactors (named factor contributions, not raw data). Violation = BUILD FAILURE (AF-8 security gate + IR-79-5).

### MACHINE (non-negotiable)

- **PRIVACY MASK**: raw purchase data MUST NOT propagate beyond this service boundary
- Read-only access — MUST NOT write to purchase tables
- Output contains ONLY: purchaseWeight (float), weightFactors (opaque sub-scores), category names (no amounts)
- Sub-weight formula factors MUST sum to 1.0
- Output range clamped [0.0, 1.0]
- MUST be independently idempotent

### FREEDOM (admin-configurable via ES)

- Sub-weight factor weights (default: 0.30/0.25/0.25/0.20, must sum to 1.0) — `freedom_weight_{tenantId}`
- Minimum purchase overlap count for non-zero weight (default: 2) — `freedom_weight_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Aggregate weight data = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | Internal queries use BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 2 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes |
| DNA-7 | Trace Context | ✅ | traceparent forwarded |
| DNA-8 | Transactional Outbox | N/A | Read-only analyzer — no domain events |

---

## F240 — IQuestionnaireWeightAnalyzerService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | MongoDB | `questionnaire_responses` collection (read-only) | Answer data, scores, learning paths |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var questionnaireAnalyzer = await _factory.CreateAsync<IQuestionnaireWeightAnalyzerService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "questionnaire-similarity", "answer-scoring", "privacy-masked", "read-only" },
        FabricHint = "database:mongodb"
    });
```

### Methods

1. `AnalyzeQuestionnaireSimilarityAsync(tenantId, userId1, userId2) → DataProcessResult<Dictionary<string,object>>` — questionnaireWeight (0.0-1.0) + opaque weightFactors (NO raw answers)
2. `GetSharedQuestionnairesAsync(tenantId, userId1, userId2) → DataProcessResult<IEnumerable<string>>` — questionnaire IDs ONLY, no answers/scores

### Sub-Weight Formula (MACHINE — structure fixed)

```
questionnaireWeight = (sameQuestionnaires × 0.25) + (answerSimilarity × 0.35) + (scoreProximity × 0.20) + (learningPathOverlap × 0.20)
Range: [0.0, 1.0]
```

### DISTINCT FROM

- **F170 (ICooperatorService, FLOW-05)**: F170 manages cooperator relationships. F240 compares questionnaire responses between TWO users for similarity scoring — completely different data domain and purpose.

### ⚠️ PRIVACY MASK — IRON RULE

**Raw questionnaire answers, individual scores, and learning path details MUST NEVER appear in the return value.** Only aggregate float weight and opaque factors. Violation = BUILD FAILURE.

### MACHINE (non-negotiable)

- **PRIVACY MASK**: raw answers/scores MUST NOT propagate beyond this service boundary
- Read-only access — MUST NOT write to questionnaire tables
- Output contains ONLY: questionnaireWeight (float), weightFactors (opaque sub-scores), questionnaire IDs (no answers)
- Sub-weight formula factors MUST sum to 1.0
- Output range clamped [0.0, 1.0]
- MUST be independently idempotent

### FREEDOM (admin-configurable via ES)

- Sub-weight factor weights (default: 0.25/0.35/0.20/0.20, must sum to 1.0) — `freedom_weight_{tenantId}`
- Minimum shared questionnaires for non-zero weight (default: 1) — `freedom_weight_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Aggregate weight data = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | Internal MongoDB queries use BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 2 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on MongoDB queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes |
| DNA-7 | Trace Context | ✅ | traceparent forwarded |
| DNA-8 | Transactional Outbox | N/A | Read-only analyzer — no domain events |

---

## F241 — IWeightCalculationService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Redis | `weight:final:{tenantId}:{integrationId}` HASH | Store final computed weight + component breakdown |
| DATABASE FABRIC | Skill 05 | Redis | `weight:history:{tenantId}:{connectionId}` ZSET | Historical weight progression for ML training |
| AI ENGINE FABRIC | Skill 07 | IAiProvider (ML inference) | model: gradient-boost-v1 (configurable) | ML adjustment prediction |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var weightService = await _factory.CreateAsync<IWeightCalculationService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "weight-combination", "ml-adjustment", "formula-engine" },
        FabricHint = "database:redis,ai:ml-model"
    });
```

### Methods

1. `CalculateFinalWeightAsync(tenantId, integrationId, componentWeights: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — finalWeight, componentWeights, mlAdjustment, confidenceScore
2. `GetWeightHistoryAsync(tenantId, connectionId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
3. `RecalculateWeightAsync(tenantId, connectionId, updatedComponents: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — for rebalancer

### Weight Formula (MACHINE — coefficients fixed)

```
rawWeight = (baseMatch × 0.25) + (groupWeight × 0.20) + (eventWeight × 0.20)
          + (purchaseWeight × 0.15) + (questionnaireWeight × 0.20)

mlAdjustment = MLModel.Predict(userId1, userId2, componentWeights)  // via AI ENGINE FABRIC
mlAdjustment = clamp(mlAdjustment, -0.2, +0.2)

finalWeight = clamp(rawWeight + mlAdjustment, 0.0, 1.0)
confidenceScore = 1.0 - (defaultedBranches × 0.15)  // lower confidence if branches defaulted
```

### DISTINCT FROM

- **F229 (ICooperatorMatchingService, FLOW-06)**: F229 computes 5-factor synergy score WITHOUT ML adjustment, for marketplace cooperation. F241 computes 5-factor connection weight WITH bounded ML adjustment (±0.2), for social relationship strength. Different formula structure, different output semantics, ML vs pure formula.

### MACHINE (non-negotiable)

- Formula coefficients: 0.25/0.20/0.20/0.15/0.20 — fixed (not admin-configurable)
- ML adjustment MUST be clamped to [-0.2, +0.2]
- Final weight MUST be clamped to [0.0, 1.0]
- ML model MUST be called through AI ENGINE FABRIC (never direct model import)
- If ML model is unavailable, mlAdjustment = 0.0 (graceful degrade)
- Weight history MUST be stored for ML training pipeline

### FREEDOM (admin-configurable via ES)

- ML model selection (default: gradient-boost-v1, enum of available models) — `freedom_weight_{tenantId}`
- ML model inference timeout (default: 2s, range: 1s-5s) — `freedom_weight_{tenantId}`
- Weight history retention period (default: 365 days) — `freedom_weight_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | componentWeights, weight history = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetWeightHistoryAsync filters use BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 3 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on Redis keys |
| DNA-6 | DynamicController | ✅ | DynamicController routes |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to AI ENGINE FABRIC |
| DNA-8 | Transactional Outbox | N/A | Computes and returns — orchestrator publishes events |

---

## F242 — IFeedInjectionService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | Redis Cluster | `feed:{tenantId}:{userId}` ZSET | Feed timeline — sorted set by position score |
| DATABASE FABRIC | Skill 05 | Redis | `injection:meta:{tenantId}:{integrationId}` HASH | Injection metadata for rollback/attribution |
| DATABASE FABRIC | Skill 05 | PostgreSQL | `feed_injections_{tenantId}` | Durable injection record (what was injected, positions) |
| QUEUE FABRIC | Skill 04 | Redis Streams | `feed.injection.events` consumer group `injection-main` | Emit HistoricalPostsIntegrated, FeedIntegrationCompleted |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var feedInjector = await _factory.CreateAsync<IFeedInjectionService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "bidirectional-injection", "zone-placement", "feed-write", "diversity-control" },
        FabricHint = "database:redis-cluster+redis+pg,queue:redis-streams"
    });
```

### Methods

1. `InjectHistoricalPostsAsync(tenantId, integrationId, userId1, userId2, finalWeight, connectionStrength: string) → DataProcessResult<Dictionary<string,object>>` — injection summary (postCounts, positions)
2. `CalculateZonePlacementAsync(tenantId, userId, posts: IEnumerable<Dictionary<string,object>>, tier: string) → DataProcessResult<IEnumerable<Dictionary<string,object>>>` — posts with calculated positions
3. `EnforceDiversityRulesAsync(tenantId, userId, candidatePosts: IEnumerable<Dictionary<string,object>>, maxConsecutive: int) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
4. `RollbackInjectionAsync(tenantId, integrationId) → DataProcessResult<bool>` — for block/unfriend scenarios
5. `GetInjectionMetadataAsync(tenantId, integrationId) → DataProcessResult<Dictionary<string,object>>`

### Feed Tier Rules (MACHINE — thresholds and limits fixed)

```
STRONG (finalWeight > 0.8):
  posts: 20 per user, zone: top 20% of feed, maxConsecutive: 3
  
MEDIUM (finalWeight 0.5-0.8):
  posts: 10 per user, zone: middle 40%, diversityRules: true

WEAK (finalWeight < 0.5):
  posts: 5 per user, zone: bottom 40%, highEngagementOnly: true

Position formula: position = base × (1 - weight) + time_decay × 0.3 + engagement × 0.2
Historical window: last 30 days ONLY
```

### DISTINCT FROM

- **F173 (IFeedDistributionService, FLOW-05)**: F173 distributes content FROM author TO audience (unidirectional, score-based ranking). F242 injects historical posts BIDIRECTIONALLY into BOTH users' feeds with zone placement (top/middle/bottom). Different direction, different placement strategy, different triggers.
- **F208 (ISocialPostService, FLOW-04)**: F208 manages post creation and publishing. F242 READS posts from F208 for injection into feeds (cross-flow read dependency).
- **F232 (IMarketplaceFeedService, FLOW-06)**: F232 distributes marketplace cards with dual consumer groups. F242 injects social connection posts with tiered zone placement.

### MACHINE (non-negotiable)

- Bidirectional: MUST inject into BOTH User A AND User B feeds in a single operation
- Historical window: MUST be last 30 days only (no older posts)
- Strong: 20 posts, top 20%, max 3 consecutive from same author
- Medium: 10 posts, middle 40%, diversity rules enforced
- Weak: 5 posts, bottom 40%, high-engagement posts only
- Injection MUST be idempotent (same integrationId + same users = no duplicate posts)
- RollbackInjectionAsync MUST remove ALL injected posts (for block/unfriend)
- HistoricalPostsIntegrated and FeedIntegrationCompleted MUST use transactional outbox (DNA-8)
- Max 30% friend content in any user's feed (enforced at injection time)

### FREEDOM (admin-configurable via ES)

- Feed integration level per user (Full/Selective/Minimal) — `freedom_privacy_{tenantId}`
- Post types to share per user (All/Public/Selected) — `freedom_privacy_{tenantId}`
- Time decay coefficient in position formula (default: 0.3) — `freedom_feed_{tenantId}`
- Engagement coefficient in position formula (default: 0.2) — `freedom_feed_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Post data, injection metadata = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | Post retrieval and zone calculation use BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on Redis ZSET keys, PG queries |
| DNA-6 | DynamicController | ✅ | DynamicController routes /relations/* |
| DNA-7 | Trace Context | ✅ | traceparent forwarded on all fabric calls |
| DNA-8 | Transactional Outbox | ✅ | HistoricalPostsIntegrated, FeedIntegrationCompleted via outbox |

---

## F243 — IConnectionEvolutionService

**Family:** 26 (FRIEND REQUEST & FEED INTEGRATION)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------|
| DATABASE FABRIC | Skill 05 | PostgreSQL | `connection_interactions_{tenantId}` | Interaction frequency, engagement quality metrics |
| DATABASE FABRIC | Skill 05 | Redis | `strength:current:{tenantId}:{connectionId}` STRING | Current strength for fast lookup |
| DATABASE FABRIC | Skill 05 | Redis | `rebalance:lock:{tenantId}` STRING (TTL=rebalanceInterval) | Distributed lock preventing overlapping rebalance runs |
| FLOW ENGINE FABRIC | Skill 09 | IFlowOrchestrator | EP-2 Durable Timer | 6h rebalance timer, 24h new-friend boost timer |
| QUEUE FABRIC | Skill 04 | Redis Streams | `connection.evolution.events` consumer group `evolution-main` | Emit ConnectionStrengthUpdated events |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var evolutionService = await _factory.CreateAsync<IConnectionEvolutionService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "strength-evolution", "rebalancing", "dormancy-detection", "scheduled-execution" },
        FabricHint = "database:pg+redis,flow-engine:ep-2,queue:redis-streams"
    });
```

### Methods

1. `RebalanceConnectionsAsync(tenantId) → DataProcessResult<Dictionary<string,object>>` — rebalanceSummary (updated count, dormant count, reconnection prompts)
2. `CalculateStrengthEvolutionAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>` — newStrength, delta, factors
3. `DetectDormantConnectionsAsync(tenantId, threshold: decimal) → DataProcessResult<IEnumerable<Dictionary<string,object>>>`
4. `ApplyNewFriendBoostAsync(tenantId, connectionId) → DataProcessResult<bool>` — 24h visibility boost
5. `QueueReconnectionPromptsAsync(tenantId, dormantConnections: IEnumerable<string>) → DataProcessResult<int>` — count queued

### Strength Evolution Logic (MACHINE — structure fixed)

```
strengthDelta = (interactionFrequency × 0.40) + (engagementQuality × 0.35) + (reciprocalActions × 0.25)

If strengthDelta > 0: strength grows (cap at 1.0)
If strengthDelta ≤ 0: strength decays
If strength < dormancyThreshold: mark dormant, queue reconnection prompt

Tier transitions:
  Active (≥0.5) → Weakening (<0.5) → Dormant (<dormancyThreshold)
  Dormant → Active (on reconnection engagement)
```

### DISTINCT FROM

- **EP-2 (Durable Timer, FLOW-06)**: EP-2 is the timer MECHANISM. F243 is the SERVICE that EP-2 triggers — different layer (infrastructure vs business logic).
- **F243 is the FIRST scheduled-only service**: No human-triggered entry point. EP-2 fires every 6h (configurable), F243 executes rebalance logic.

### MACHINE (non-negotiable)

- Rebalance MUST run on EP-2 Durable Timer schedule (not cron — must survive pod restarts)
- Max 30% friend content in any user's feed (enforced during rebalance)
- Dormancy threshold MUST be applied consistently (below threshold = dormant)
- New friend boost: 24h window, then normal ranking
- Distributed lock MUST prevent overlapping rebalance runs
- ConnectionStrengthUpdated event MUST use transactional outbox (DNA-8)
- Rebalance MUST NOT process more than 1000 connections per batch (backpressure)

### FREEDOM (admin-configurable via ES)

- Rebalance interval (default: 6h, range: 1h-24h) — `freedom_feed_{tenantId}`
- New friend boost duration (default: 24h, range: 6h-72h) — `freedom_feed_{tenantId}`
- Dormancy threshold (default: 0.2, range: 0.1-0.3) — `freedom_feed_{tenantId}`
- Reconnection prompt threshold (default: 0.15, range: 0.1-0.2) — `freedom_feed_{tenantId}`
- Rebalance batch size (default: 500, range: 100-1000) — `freedom_feed_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | Interaction data, strength data = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | DetectDormantConnectionsAsync uses BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase |
| DNA-5 | Scope Isolation | ✅ | tenantId on PG queries, Redis keys |
| DNA-6 | DynamicController | ✅ | DynamicController routes /relations/* |
| DNA-7 | Trace Context | ✅ | traceparent forwarded on all fabric calls |
| DNA-8 | Transactional Outbox | ✅ | ConnectionStrengthUpdated via outbox (atomic with PG strength write) |

---

## DESIGN RECORDS (DR-17 through DR-20)

### DR-17 — Neo4j as Primary Graph Store (Write Path)

**Decision**: F234 uses Neo4j via DATABASE FABRIC as PRIMARY store for bidirectional social graph edges, with `FRIEND_OF` edge labels and `connectionStrength` property.

**Rationale**: Graph operations (bidirectional edges, traversals, path queries, strength-weighted neighbor discovery) naturally fit a graph database. PostgreSQL is SECONDARY for request lifecycle state (relational, transactional). Redis for rate-limit and cache.

**Precedent**: F230 (FLOW-06) used Neo4j via DATABASE FABRIC for read-only cooperator graph queries. F234 EXTENDS this to full write access with bidirectional edge creation, strength updates, and block management.

**Impact**: CF-52 enforces namespace isolation between `connection_graph_{tenantId}` (F234) and the marketplace cooperator graph (F230). Different edge labels: `FRIEND_OF` vs `CONNECTED_TO`.

**Alternatives Rejected**: PostgreSQL-only for graph (too slow for traversals, no native bidirectional edges), direct Neo4j driver (breaks fabric-first).

---

### DR-18 — Four-Way AllSettled with Privacy Mask

**Decision**: F236 orchestrates 4 parallel analyzer branches (F237-F240) using allSettled semantics with EP-2 Durable Timer for deadline enforcement.

**Rationale**: allSettled (not allResolved) ensures the flow NEVER blocks on missing data. If any branch times out after the configurable deadline (default: 10s), the orchestrator proceeds with default 0.5 for the missing component and queues an async retry. This matches the spec's explicit requirement for degraded-mode completion.

**Privacy mask enforcement**: F239 (purchase) and F240 (questionnaire) MUST return aggregate-only output. The orchestrator (F236) never sees raw purchase/questionnaire data — it receives only float weights and opaque factor objects.

**Impact**: T79 (Four-Way Weight Analysis Fork) iron rules IR-79-1 through IR-79-8 encode this design. ST-26 stress test validates the timeout+default path.

**Alternatives Rejected**: V1 proposed EP-4 (new Four-Way Fan-Out primitive) — rejected because EP-2 + allSettled pattern covers it entirely without new infrastructure.

---

### DR-19 — Privacy-Masked Aggregate Weights

**Decision**: F239 (purchase analyzer) and F240 (questionnaire analyzer) return ONLY aggregate float weights (0.0-1.0) and opaque weightFactors. Raw purchase data (amounts, items, orders) and raw questionnaire data (answers, scores) NEVER propagate beyond the analyzer service boundary.

**Rationale**: The FLOW-07 spec and deep research explicitly flag purchase overlap and questionnaire similarity as sensitive data categories. ICO data minimisation guidance reinforces that only the minimum data necessary should cross service boundaries. Aggregate weights serve the integration purpose without exposing individual behavior.

**Impact**: IR-79-5 makes this a BUILD FAILURE if violated. AF-8 security station validates at code generation time. SK-28 (Privacy-Masked Analyzer) captures this as a reusable skill pattern.

**Alternatives Rejected**: Full data with post-hoc masking (risk of accidental exposure), encrypted raw data (unnecessary complexity when only the aggregate is needed).

---

### DR-20 — Bidirectional Feed Injection vs Unidirectional Distribution

**Decision**: New factory F242 (IFeedInjectionService) created instead of reusing F173 (IFeedDistributionService, FLOW-05).

**Rationale**: F173 pushes content FROM one author TO many audience members (one-to-many, unidirectional). F242 injects historical posts INTO BOTH users' feeds simultaneously (many-to-two, bidirectional, with zone placement). The injection patterns, rollback requirements, and zone placement logic are fundamentally different from distribution.

**Impact**: CF-53 and CF-58 enforce namespace isolation between F242 (injection) and F173 (distribution). F242's RollbackInjectionAsync has no equivalent in F173.

**Alternatives Rejected**: Extending F173 with bidirectional mode (Single Responsibility violation; would complicate existing FLOW-05 distribution code).

---

## FAMILY 26 SUMMARY TABLE

| Factory | Interface | Primary Fabric | Secondary Fabrics | Key Methods | DNA-8 |
|---------|-----------|---------------|-------------------|-------------|-------|
| F234 | IConnectionGraphService | DB(Neo4j) | DB(PG+Redis), Queue | 8 methods | ✅ YES |
| F235 | IMatchScoringService | DB(PG) | DB(ES+Redis), AI Engine | 4 methods | N/A |
| F236 | IFeedIntegrationOrchestratorService | Queue | DB(Redis+PG), Flow Engine | 6 methods | ✅ YES |
| F237 | IGroupWeightAnalyzerService | DB(PG) | DB(MongoDB) | 2 methods | N/A |
| F238 | IEventWeightAnalyzerService | DB(PG) | — | 2 methods | N/A |
| F239 | IPurchaseWeightAnalyzerService | DB(PG) | — | 2 methods (privacy-masked) | N/A |
| F240 | IQuestionnaireWeightAnalyzerService | DB(MongoDB) | — | 2 methods (privacy-masked) | N/A |
| F241 | IWeightCalculationService | DB(Redis) | AI Engine (ML) | 3 methods | N/A |
| F242 | IFeedInjectionService | DB(Redis Cluster) | DB(PG+Redis), Queue | 5 methods | ✅ YES |
| F243 | IConnectionEvolutionService | DB(PG) | DB(Redis), Flow Engine, Queue | 5 methods | ✅ YES |

**Total methods: 39**
**Total DNA compliance: 80/80 (8 patterns × 10 factories) ✅**
**DNA-8 applicable: 4/4 PASS, 6 N/A**

---

## DNA-8 Applicability in Family 26

| Factory | DNA-8 Applicable? | Evidence |
|---------|-------------------|----------|
| F234 IConnectionGraphService | ✅ YES | FriendRequestSent, FriendRequestAccepted via outbox (atomic with PG request state write) |
| F235 IMatchScoringService | N/A | Computes and caches match scores — no domain events published |
| F236 IFeedIntegrationOrchestratorService | ✅ YES | FeedIntegrationStarted via outbox (atomic with PG integration_run creation) |
| F237 IGroupWeightAnalyzerService | N/A | Read-only analyzer — returns weight to orchestrator, no domain events |
| F238 IEventWeightAnalyzerService | N/A | Read-only analyzer — no domain events |
| F239 IPurchaseWeightAnalyzerService | N/A | Read-only analyzer — no domain events |
| F240 IQuestionnaireWeightAnalyzerService | N/A | Read-only analyzer — no domain events |
| F241 IWeightCalculationService | N/A | Computes final weight — orchestrator publishes FinalWeightCalculated, not F241 |
| F242 IFeedInjectionService | ✅ YES | HistoricalPostsIntegrated, FeedIntegrationCompleted via outbox (atomic with PG injection record) |
| F243 IConnectionEvolutionService | ✅ YES | ConnectionStrengthUpdated via outbox (atomic with PG strength update) |

**DNA-8 compliance: 4/4 applicable PASS, 6 N/A**

---

## Integration Changelog (FLOW-07)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-06 Marketplace Publishing merge | F225-F233 (+9) | T72-T76 (+5) | CF-42-CF-51 (+10) | Family 25, Template 16, DNA-8, EP-1/2/3 |
| 2026-02-26 | FLOW-07 Friend Request & Feed Integration merge | F234-F243 (+10) | T77-T82 (+6) | CF-52-CF-63 (+12) | Family 26, Template 17, DR-17-DR-20 |

---

## System State Update (Post Family 26 / FLOW-07)

| Metric | Pre-FLOW-07 | Post-FLOW-07 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F233 | F1-F243 | +10 |
| Factory families | 25 | 26 | +1 |
| DNA patterns | 8 | 8 | +0 (reuse DNA-1-DNA-8) |
| DNA compliance | 524/524 | 604/604 | +80 (70 universal + 4 DNA-8 + 6 DNA-8 N/A) |
| Design records | DR-1-DR-16 | DR-1-DR-20 | +4 |
| Engine primitives | 3 (EP-1/2/3) | 3 (EP-1/2/3) | +0 (reuse) |

```
FACTORIES (continuous):
  F1-F224  [through Family 24]
  F225-F233 [FLOW-06 Marketplace, Family 25]
  F234-F243 [FLOW-07 Friend Request & Feed Integration, Family 26] <- NEW
  Next: F244
```

---

## SAVE POINT: MERGE:P1 ✅
## Next: Phase 2 — T77-T82 Task Type Contracts + AF Station Map + Template 17
## Recovery: "Continue FLOW-07 Phase 2" → generate T77-T82 + AF Map + Template 17

---


# ═══════════════════════════════════════════════════════════════════════════
# FLOW-08 — MULTI-TENANT SUPPORT (Families 27–29, F244–F271, T83–T92)
# ═══════════════════════════════════════════════════════════════════════════
#
# Extension Date: 2026-02-26
# Source: 28-multi_tenant_deep-research-reports + FLOW08_DEFINITIVE_PLAN_v3
# Families: 3 (27: Tenant Control Plane, 28: Provider Adapters, 29: Operations)
# Factories: 28 (F244-F271)
# Task Types: 10 (T83-T92)
# DNA Patterns: 8 (DNA-1-DNA-8, reuse — no new patterns)
# Design Records: DR-21 through DR-26
# Design Decisions: DD-21 through DD-30
#
# ═══════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════
# FAMILY 27 — TENANT CONTROL PLANE (F244–F251) [FLOW-08]
# ═══════════════════════════════════════════════════════
## Purpose: Owns the complete lifecycle of a tenant entity — creation, configuration,
##          isolation binding, context propagation, onboarding, graduation, audit, entitlements.
##          The control plane that governs WHO tenants are and WHAT they're allowed to do.
## Fabric: DATABASE (ES+PG+Redis), QUEUE (Redis Streams), FLOW ENGINE (Skill 09+EP-1), CORE
## DNA: 8 patterns × 8 factories = 64/64 compliance checkpoints
## Design Records: DR-21, DR-22

---

## F244 — ITenantRegistryService

```
FACTORY: F244
NAME: ITenantRegistryService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-tenants (tenant master records)
  SECONDARY → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: tenant_state (activation state, compliance lock flags — ACID)
INTERFACE METHODS:
  RegisterTenantAsync(payload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates tenant master record; assigns tenantId; sets tier, isolation default, compliance labels.
      BuildSearchFilter skips empty payload fields (DNA-2).

  GetTenantAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Reads tenant master by tenantId. Returns DataProcessResult.Failure if not found.

  UpdateTenantAsync(tenantId: string, patch: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Partial update via BuildSearchFilter; only present fields overwrite stored values.

  DeactivateTenantAsync(tenantId: string, reason: string)
      → Task<DataProcessResult<bool>>
      Marks tenant as DEACTIVATED in PG (state table) + emits audit event via F250.
      Does NOT delete data — GDPR deletion is a separate flow (F267).

  ListTenantsAsync(filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Filtered ES search. Always includes tenantId-scope guard (DNA-5 meta-layer: platform admin only).

FACTORY CREATION:
  var registry = await _factory.CreateAsync<ITenantRegistryService>(
      new FactoryResolutionContext
      {
          TenantId = platformAdminContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["secondaryProvider"] = "postgresql" }
      });

DISTINCT FROM: F245 manages tenant configuration. F244 manages the tenant ENTITY itself (CRUD + lifecycle state).

DNA COMPLIANCE:
  DNA-1 ✅  All outputs are Dictionary<string,object> via ParseDocument. No ITenant typed model.
  DNA-2 ✅  BuildSearchFilter skips empty fields in ListTenantsAsync and UpdateTenantAsync.
  DNA-3 ✅  All 5 methods return DataProcessResult<T>. RegisterTenantAsync never throws on duplicate — returns Failure with code TENANT_EXISTS.
  DNA-4 ✅  TenantRegistryService extends MicroserviceBase (19 components inherited).
  DNA-5 ✅  ListTenantsAsync enforces platform-admin scope guard. GetTenantAsync verifies caller tenantId matches or is platform admin.
  DNA-6 ✅  No ITenantController. Routed via DynamicController with route prefix /api/tenants.
  DNA-7 ✅  traceparent propagated on all inter-service calls. Registration events carry W3C traceparent.
  DNA-8 ✅  RegisterTenantAsync writes to PG state table + publishes TenantRegistered event via transactional outbox.

MACHINE (fixed — cannot be overridden by FREEDOM config):
  tenantId format: ^[a-z0-9_-]{3,64}$ — violations = REGISTRATION_FAILURE
  tier enum: [free, pro, enterprise] — unknown tier = BUILD_FAILURE at engine generation time
  Deactivation is soft-only — hard delete requires explicit GDPR flow (F267)
  RegisterTenantAsync is idempotent on (tenantId) — duplicate returns existing record

FREEDOM (admin-configurable via ES config index: xiigen-tenant-registry-config):
  defaultIsolationMode per tier (free=shared_schema, pro=separate_schema, enterprise=hybrid)
  maxTenantsPerTier (platform quota, configurable per deployment)
  tenantIdGenerationStrategy (uuid4 vs custom prefix)
  auditRetentionDays (how long tenant audit entries are kept)
```

---

## F245 — ITenantConfigService

```
FACTORY: F245
NAME: ITenantConfigService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-tenant-configs (versioned tenant configuration documents)
  SECONDARY → DATABASE FABRIC (Skill 05) → Redis provider
              Key: config:cache:{tenantId} HASH (L2 cache layer)
INTERFACE METHODS:
  LoadConfigAsync(tenantId: string, version: string = "latest")
      → Task<DataProcessResult<Dictionary<string,object>>>
      Retrieves full config document: isolation, identity, authZ, accessTopology, payments, compliance labels, provider bindings.
      Cache-first: L1 in-process (30s TTL), L2 Redis (5min TTL), L3 ES fallback.
      BuildSearchFilter skips empty version field — returns latest if omitted.

  SaveConfigAsync(tenantId: string, config: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Validates config against JSON Schema before persisting (compliance label constraints enforced here).
      Increments version, stores previous version for rollback.
      Emits config-changed event via DNA-8 outbox → F250 audit pipeline.

  RollbackConfigAsync(tenantId: string, targetVersion: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Restores a prior config version. Audit log records who triggered rollback.

  ValidateConfigAsync(tenantId: string, config: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Dry-run validation: checks JSON Schema conformance + compliance label constraint matrix.
      Returns DataProcessResult with violation list (never throws).

  InvalidateCacheAsync(tenantId: string)
      → Task<DataProcessResult<bool>>
      Evicts both L1 and L2 cache entries. Used after SaveConfigAsync on other nodes.

  GetProviderBindingsAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns provider bindings section from config: identity, payments, enforcement topology.
      Convenience method — equivalent to LoadConfigAsync + extract "providers" key.

FACTORY CREATION:
  var configService = await _factory.CreateAsync<ITenantConfigService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["cacheProvider"] = "redis",
              ["configIndex"]   = "xiigen-tenant-configs"
          }
      });

DISTINCT FROM: F244 manages tenant ENTITY. F245 manages tenant CONFIGURATION (versioned documents with validation).

DNA COMPLIANCE:
  DNA-1 ✅  Config document is Dictionary<string,object>. No ITenantConfig typed model.
  DNA-2 ✅  BuildSearchFilter on LoadConfigAsync: empty version field skipped → defaults to latest.
  DNA-3 ✅  ValidateConfigAsync returns DataProcessResult with violations list, not exception.
  DNA-4 ✅  TenantConfigService extends MicroserviceBase.
  DNA-5 ✅  All ES queries include tenantId as filter term.
  DNA-6 ✅  No TenantConfigController. DynamicController with /api/tenant-config.
  DNA-7 ✅  traceparent on all inter-service calls including cache invalidation broadcasts.
  DNA-8 ✅  SaveConfigAsync writes config version + publishes ConfigChanged event via transactional outbox.

MACHINE (fixed):
  Config versioning is append-only — stored versions never deleted (only superseded)
  Compliance label constraint matrix is MACHINE-enforced (PCI+shared_schema → BLOCKED)
  JSON Schema conformance check runs on EVERY SaveConfigAsync call
  Cache TTLs have a minimum floor: L1 ≥ 10s, L2 ≥ 60s (prevents cache stampede)

FREEDOM (config index: xiigen-tenant-registry-config):
  L1 cache TTL (default 30s)
  L2 cache TTL (default 5min)
  maxConfigVersionsRetained (default 10 — older versions pruned)
  allowedIsolationModesByTier (which tiers may use which isolation modes)
```

---

## F246 — ITenantIsolationBindingService

```
FACTORY: F246
NAME: ITenantIsolationBindingService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: tenant_bindings_{region} (ACID binding records + RLS policies)
  SECONDARY → DATABASE FABRIC (Skill 05) → Redis provider
              Key: binding:cache:{tenantId} HASH (resolved binding cache, 60s TTL)
  TERTIARY  → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-tenant-bindings (binding index for search/admin queries)
  QUATERNARY→ QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: tenant.binding.events (binding change notifications)
INTERFACE METHODS:
  ResolveBindingAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns binding document: {tenantId, dataMode, connectionRef, schemaName, region, shardKey}
      Cache-first: L1 in-process (60s), L2 Redis. Determines WHERE data lives for this tenant.

  SetBindingAsync(tenantId: string, bindingConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Persists new binding. Validates via compliance label constraints (PCI → no shared_schema without RLS).
      Emits binding.updated event via DNA-8 outbox.

  ValidateBindingAsync(tenantId: string, complianceLabels: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Checks label constraints. PCI + shared_schema → DataProcessResult.Failure(COMPLIANCE_VIOLATION).

  MigrateBindingAsync(tenantId: string, fromMode: string, toMode: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Coordinates pool→silo transition. Emits TENANT_MIGRATION_STARTED event.
      Integrates with F249 (graduation) for full migration workflow.

  EnforceRlsAsync(tenantId: string, sessionContext: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Sets PG session variable SET LOCAL app.tenant_id for shared_schema tenants.
      RLS IS DNA-5 implementation for shared_schema mode — defense-in-depth.

  SetSearchPathAsync(tenantId: string, connectionContext: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Sets PG search_path for separate_schema tenants. Schema: xiigen_t_{slugifiedTenantId}

  ProvisionSchemaAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates PG schema + applies migrations for new separate_schema tenant. Idempotent.

  InvalidateCacheAsync(tenantId: string)
      → Task<DataProcessResult<bool>>
      Evicts binding from L1+L2 cache after SetBindingAsync.

FACTORY CREATION:
  var svc = await _factory.CreateAsync<ITenantIsolationBindingService>(
      new FactoryResolutionContext
      {
          TenantId = scope.TenantId,
          Capabilities = new[] { "binding-resolve", "binding-cache", "binding-migrate", "rls-enforce" },
          FabricHint = "database:pg+redis+es,queue:redis-streams"
      });

DISTINCT FROM: F244 manages tenant metadata. F246 manages WHERE data lives.
  F246 consolidates isolation binding, RLS enforcement, schema routing, and shard routing
  (what v3 split across 4 factories F258-F261) into a single factory with mode-dependent behavior.

DNA COMPLIANCE:
  DNA-1 ✅  Binding records as Dictionary<string,object>. No ITenantBinding typed model.
  DNA-2 ✅  BuildSearchFilter on SetBindingAsync: skips empty bindingConfig fields.
  DNA-3 ✅  ValidateBindingAsync returns DataProcessResult — compliance violations as Failure, not thrown.
  DNA-4 ✅  TenantIsolationBindingService extends MicroserviceBase.
  DNA-5 ✅  EnforceRlsAsync IS the DNA-5 implementation for shared_schema. tenantId on every query.
  DNA-6 ✅  DynamicController at /api/isolation/bindings. No entity-specific controller.
  DNA-7 ✅  traceparent propagated on migration events. MigrateBindingAsync carries trace context.
  DNA-8 ✅  SetBindingAsync + MigrateBindingAsync write through transactional outbox.

MACHINE (fixed):
  PCI + shared_schema without RLS = BLOCKED (DataProcessResult.Failure, no override)
  CMK label → requires separate_db or hybrid (not shared_schema alone)
  data_residency_eu → connectionRef must point to EU-region instance
  Binding resolution at EVERY request boundary — no cached bypass for isolation mode
  RLS enforcement runs for ALL shared_schema mode tenants (not optional)
  Schema naming: xiigen_t_{slugifiedTenantId} — no custom schema names

FREEDOM (config):
  defaultDataModeByTier (free=shared_schema, pro=separate_schema, enterprise=hybrid)
  bindingCacheTtlSeconds L1 (default 60), L2 (default 300)
  allowedDataModeTransitions map (which migrations are auto-approved)
  rlsEnforcementMode [strict | audit_only] (audit_only during migration testing only)
  shardAssignmentStrategy [round_robin | least_loaded | geo_affinity]
```

---

## F247 — ITenantContextPropagatorService

```
FACTORY: F247
NAME: ITenantContextPropagatorService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              All CloudEvents-wrapped messages published to Redis Streams.
  SECONDARY → CORE FABRIC (Skill 01 — MicroserviceBase)
              In-process OTel context propagation via baggage header.
INTERFACE METHODS:
  WrapAndPublishAsync(tenantId: string, eventType: string, source: string, eventData: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Wraps payload in CloudEvents 1.0 envelope:
        {specversion: "1.0", id: <uuidv4>, source, type, time: <ISO8601>,
         datacontenttype: "application/json",
         data: { tenantId, correlationId, ...eventData }}
      Publishes to configured Redis Stream. Returns {cloudEventId, streamOffset}.

  ParseEnvelopeAsync(tenantId: string, rawMessage: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Deserializes and validates CloudEvents 1.0 envelope.
      Validates: specversion, id, source, type, data.tenantId present.
      Returns Failure(CE_INVALID_ENVELOPE) if required fields missing.

  InjectBaggageAsync(tenantId: string, outboundContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Injects OTel baggage: tenant.id=<tenantId> (bounded — no PII, no sensitive data).
      Returns enriched outboundContext with W3C baggage header set.

  ExtractBaggageAsync(inboundContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Extracts and validates baggage from inbound context.
      Returns {tenantId, correlationId, traceparent} as Dictionary.
      Validates tenant.id in baggage matches TenantContext.TenantId.

  ForwardTraceparentAsync(tenantId: string, inboundContext: Dictionary<string,object>, outboundContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Copies W3C traceparent from inbound to outbound. Creates child span. Extends DNA-7.

  BuildDeadLetterEnvelopeAsync(tenantId: string, originalEnvelope: Dictionary<string,object>, reason: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Wraps failed event in DLQ-targeted CloudEvent with failure reason.

FACTORY CREATION:
  var propagator = await _factory.CreateAsync<ITenantContextPropagatorService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string>
          {
              ["defaultSource"]   = "xiigen-engine",
              ["eventStreamName"] = "xiigen-events-main"
          }
      });

DISTINCT FROM: DNA-7 handles basic traceparent forwarding. F247 extends DNA-7 with full
  CloudEvents envelope + OTel baggage + tenant context validation. Consolidates what v3
  split across F262 (CloudEvents) + F263 (OTel baggage) into one context propagation factory.

DNA COMPLIANCE:
  DNA-1 ✅  All contexts and envelopes as Dictionary<string,object>. No ICloudEvent or IBaggage typed model.
  DNA-2 ✅  ParseEnvelopeAsync: BuildSearchFilter-style skipping of non-required extension attributes.
  DNA-3 ✅  ParseEnvelopeAsync returns DataProcessResult.Failure on invalid envelope — never throws.
  DNA-4 ✅  TenantContextPropagatorService extends MicroserviceBase.
  DNA-5 ✅  data.tenantId REQUIRED in every CloudEvent. tenant.id in baggage validated against TenantContext.
  DNA-6 ✅  DynamicController at /api/events/context. No entity-specific controller.
  DNA-7 ✅  ForwardTraceparentAsync IS the DNA-7 extension for FLOW-08 context.
  DNA-8 ✅  WrapAndPublishAsync uses outbox pattern for event publication reliability.

MACHINE (fixed):
  CloudEvents specversion MUST be "1.0"
  data.tenantId MUST match TenantContext.TenantId — mismatch = CE_TENANT_MISMATCH failure
  Baggage carries ONLY tenant.id — no user PII, no session tokens, no internal IPs
  traceparent is ALWAYS forwarded (DNA-7) — no opt-out
  External boundary: outbound calls to external systems strip all baggage

FREEDOM (config):
  defaultSource string per deployment
  allowedEventTypes list per tenant (optional allowlist)
  dlqStreamName (default xiigen-events-dlq)
  externalBoundaryStrip (default true)
  traceSamplingRate per tenant (default 0.1 pro, 1.0 enterprise)
```

---

## F248 — ITenantOnboardingOrchestratorService

```
FACTORY: F248
NAME: ITenantOnboardingOrchestratorService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → FLOW ENGINE FABRIC (Skills 08/09 — IFlowDefinition + IFlowOrchestrator)
              Onboarding IS a flow — executed by FlowOrchestrator as named flow definition.
              Flow definition stored in ES: xiigen-flow-definitions / name=tenant-onboarding-v1
  SECONDARY → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-onboarding-state (per-tenant onboarding progress via EP-1 State Machine)
INTERFACE METHODS:
  StartOnboardingAsync(tenantId: string, initPayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Starts 8-state onboarding FlowRun via FlowOrchestrator + EP-1 State Machine Registry.
      States: Created→DomainVerified→IdentityConfigured→AuthzConfigured→
              PaymentConfigured→WebhookVerified→ComplianceValidated→Activated
      Returns {flowRunId, currentState: "Created", nextStep: "domain-verification"} as Dictionary.

  GetOnboardingStateAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns current state, completed steps, and next required action.

  AdvanceStateAsync(tenantId: string, stepResult: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Advances the onboarding state machine. Called by each sub-step factory upon completion.
      Uses EP-1 (State Machine Registry) for transition validation.

  AbortOnboardingAsync(tenantId: string, reason: string)
      → Task<DataProcessResult<bool>>
      Rolls back partially completed onboarding. Deregisters providers, cleans up registration.
      Emits onboarding.aborted audit event via F250.

  ResumeOnboardingAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Resumes from last saved state after crash/timeout. Idempotent re-entry.

FACTORY CREATION:
  var onboardingService = await _factory.CreateAsync<ITenantOnboardingOrchestratorService>(
      new FactoryResolutionContext
      {
          TenantId = newTenantId,
          Provider  = "flow-orchestrator",
          Metadata  = new Dictionary<string,string> { ["flowDefinition"] = "tenant-onboarding-v1" }
      });

DISTINCT FROM: T40 (3-way parallel join). F248/T89 is a sequential 8-state machine with gates.
  Each gate must pass before the next. Failure = rollback to previous state.

DNA COMPLIANCE:
  DNA-1 ✅  Onboarding state as Dictionary<string,object>. No IOnboardingState model.
  DNA-2 ✅  GetOnboardingStateAsync: BuildSearchFilter on (tenantId) lookup.
  DNA-3 ✅  AdvanceStateAsync returns DataProcessResult — invalid transition = Failure(INVALID_STATE_TRANSITION).
  DNA-4 ✅  TenantOnboardingOrchestratorService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every ES onboarding-state query.
  DNA-6 ✅  DynamicController at /api/onboarding. No entity-specific controller.
  DNA-7 ✅  traceparent propagated across all onboarding sub-steps via F247.
  DNA-8 ✅  Each state transition written via transactional outbox (audit event + state persist atomic).

MACHINE (fixed):
  8-state sequence is fixed — states cannot be reordered or skipped
  Activation (final state) requires ALL mandatory gates passed
  AbortOnboardingAsync rolls back in reverse order (saga compensation)
  ComplianceValidated gate runs F266 label constraints BEFORE activation

FREEDOM (config):
  stateTimeoutMinutesPerStep (default 1440min = 24h before auto-abort)
  requiredStepsByTier (free: skip Payment+Webhook; enterprise: all steps)
  onboardingWebhookUrl (tenant-provided URL for state transition notifications)
  domainVerificationMethod (dns | email)
```

---

## F249 — ITenantGraduationService

```
FACTORY: F249
NAME: ITenantGraduationService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch + PostgreSQL providers
              ES: reads source tenant data, writes target isolation binding
              PG: coordinates migration state, saga compensation points
  SECONDARY → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-graduation-events → consumed by migration workers
INTERFACE METHODS:
  PlanGraduationAsync(tenantId: string, targetMode: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates graduation plan: {planId, sourceMode, targetMode, steps, estimatedDurationMs, riskLevel}
      Validates via F266 (compliance gate) that targetMode is allowed.
      Runs compatibility check on in-flight FlowRuns.

  ExecuteGraduationAsync(tenantId: string, planId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Executes migration with saga compensation at each step.
      Replays in-flight FlowRun events after migration.
      Returns {migrationRunId, status: "in_progress", expectedCompletionAt}.

  GetGraduationStatusAsync(tenantId: string, migrationRunId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns {migrationRunId, currentStep, percentComplete, status, issues}.

  RollbackGraduationAsync(tenantId: string, migrationRunId: string)
      → Task<DataProcessResult<bool>>
      Triggers saga compensation to revert migration. Auto on failure, manual by admin.

FACTORY CREATION:
  var graduationService = await _factory.CreateAsync<ITenantGraduationService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["migrationStream"]   = "xiigen-graduation-events",
              ["isolationFactory"]  = "F246"
          }
      });

DISTINCT FROM: F246 manages WHERE data lives. F249 manages MOVING data between isolation modes.

DNA COMPLIANCE:
  DNA-1 ✅  Graduation plans as Dictionary<string,object>. No IGraduationPlan model.
  DNA-2 ✅  PlanGraduationAsync: BuildSearchFilter on tenant binding queries.
  DNA-3 ✅  ExecuteGraduationAsync returns DataProcessResult — migration failure triggers rollback, not exception.
  DNA-4 ✅  TenantGraduationService extends MicroserviceBase.
  DNA-5 ✅  tenantId on all ES + PG migration-state queries.
  DNA-6 ✅  DynamicController at /api/tenant-graduation.
  DNA-7 ✅  traceparent propagated across graduation events via F247.
  DNA-8 ✅  Each migration step written via transactional outbox (compensation point + state persist atomic).

MACHINE (fixed):
  Graduation plan MUST be created and approved BEFORE execution (no ad-hoc migration)
  Saga compensation registered BEFORE each migration step begins
  In-flight FlowRuns are drained or replayed (never silently dropped)
  PCI tenant graduation requires CMK key rotation via F259

FREEDOM (config):
  allowedGraduationPaths (source→target mode transitions supported)
  migrationWorkerConcurrency (default 1 — serialized per tenant)
  drainTimeoutSeconds (default 300 — wait for in-flight FlowRuns)
  graduationApprovalRequired (default true for enterprise; pro can self-approve)
```

---

## F250 — ITenantAuditService

```
FACTORY: F250
NAME: ITenantAuditService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-audit-main → Consumed → Archive → DLQ
  SECONDARY → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-audit-log (append-only audit records for query)
INTERFACE METHODS:
  EmitAuditEventAsync(tenantId: string, actor: string, action: string, payload: Dictionary<string,object>)
      → Task<DataProcessResult<string>>   // returns auditEventId
      Publishes event to Redis Stream (fire-and-forget from caller's perspective).
      Returns immediately with auditEventId. Background relay writes to ES via DNA-8 outbox.
      action enum: [tenant.registered, config.saved, config.rolled-back, provider.bound,
                    provider.unbound, tenant.deactivated, gdpr.deletion-requested, ...]

  QueryAuditLogAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Queries ES audit index with BuildSearchFilter. Supports: actorId, action, dateRange, correlationId.

  GetAuditEventAsync(tenantId: string, auditEventId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Single audit event retrieval by ID.

FACTORY CREATION:
  var auditService = await _factory.CreateAsync<ITenantAuditService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string>
          {
              ["streamName"]       = "xiigen-audit-main",
              ["secondaryProvider"] = "elasticsearch",
              ["auditIndex"]       = "xiigen-audit-log"
          }
      });

DISTINCT FROM: DNA-7 tracing is for observability. F250 is for compliance audit trail (immutable, queryable, legally significant).

DNA COMPLIANCE:
  DNA-1 ✅  All audit records as Dictionary<string,object>. No IAuditEvent typed model.
  DNA-2 ✅  QueryAuditLogAsync uses BuildSearchFilter — empty date/action fields skipped.
  DNA-3 ✅  EmitAuditEventAsync never throws — if Redis unavailable, falls back to direct ES write.
  DNA-4 ✅  TenantAuditService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every ES query + in every Redis Stream message payload.
  DNA-6 ✅  DynamicController at /api/audit-log. No IAuditController.
  DNA-7 ✅  Audit events carry traceparent + correlationId for distributed trace correlation.
  DNA-8 ✅  Audit emission uses outbox pattern — audit event is atomic with triggering operation.

MACHINE (fixed):
  Audit log is APPEND-ONLY — no UpdateAuditEventAsync method exists
  auditEventId is UUIDv4 generated at emission (idempotent retry-safe)
  Audit records NEVER deleted by application code — only by F267 GDPR after legal hold expiry

FREEDOM (config):
  auditRetentionDays per tenant (GDPR label: minimum 90; PCI label: minimum 365)
  auditStreamConsumerGroup name
  esAuditIndexShardsCount (ES index configuration)
  actionTypes allowlist (platform can restrict which actions are auditable)
```

---

## F251 — ITenantEntitlementService

```
FACTORY: F251
NAME: ITenantEntitlementService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-entitlements (tenant entitlement documents: tier, quotas, feature flags)
  SECONDARY → DATABASE FABRIC (Skill 05) → Redis provider
              Key: entitlement:{tenantId} HASH (cache for hot-path quota checks, 120s TTL)
INTERFACE METHODS:
  GetEntitlementsAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns tenant's active entitlements: {tier, maxFlowRuntimeMs, maxConcurrentFlows,
        priorityWeight, featureFlags, quotas, drTier, supportSla}.
      Cache-first (in-process 120s TTL, Redis L2).

  CheckQuotaAsync(tenantId: string, resource: string, requestedAmount: int)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Checks if requested resource amount is within tenant's quota.
      Returns {allowed: bool, remaining, limit, resource} as Dictionary.

  EvaluateSlaBreachAsync(tenantId: string, metric: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Checks if a metric (flow runtime, queue depth, error rate) breaches SLA.
      Returns {breached: bool, severity: [warning|critical], recommendedAction}.
      Emits sla.breach-detected audit event via F250 on breach.

  UpdateEntitlementsAsync(tenantId: string, entitlements: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Updates entitlements (admin operation). BuildSearchFilter on fields. Emits audit event.

  GetFeatureFlagsAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns feature flags for tenant: which flows are enabled, which capabilities active.

  GetPriorityWeightAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns scheduling priority weight for FlowOrchestrator resource allocation.

FACTORY CREATION:
  var entitlementService = await _factory.CreateAsync<ITenantEntitlementService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["cacheProvider"] = "redis" }
      });

DISTINCT FROM: F245 manages full tenant configuration. F251 manages the ENTITLEMENT and QUOTA
  subset — optimized for hot-path quota checks with Redis caching. Consolidates what v3 split
  across SLA policy (F275) into a single entitlement + quota + SLA factory.

DNA COMPLIANCE:
  DNA-1 ✅  Entitlements as Dictionary<string,object>. No IEntitlement or ISlaPolicy typed model.
  DNA-2 ✅  UpdateEntitlementsAsync: BuildSearchFilter on entitlement patch fields.
  DNA-3 ✅  CheckQuotaAsync returns DataProcessResult — quota exceeded = Failure(QUOTA_EXCEEDED).
  DNA-4 ✅  TenantEntitlementService extends MicroserviceBase.
  DNA-5 ✅  tenantId on all ES entitlement queries + Redis cache keys.
  DNA-6 ✅  DynamicController at /api/entitlements. No entity-specific controller.
  DNA-7 ✅  SLA breach events carry traceparent for correlation with triggering flow.
  DNA-8 ✅  UpdateEntitlementsAsync writes through transactional outbox (entitlement change + audit atomic).

MACHINE (fixed):
  Priority weight is MACHINE-determined by tier (cannot exceed tier ceiling)
  SLA breach detection always emits audit event — no silent breaches
  DR tier set at provisioning, requires platform admin to change
  Quota enforcement runs in hot path — Redis cache miss falls back to ES, never skips check

FREEDOM (config):
  entitlementsByTier (default quotas per tier — flows, concurrency, runtime)
  slaBreachNotificationWebhookUrl per tenant
  drTierOptions [best_effort | standard | enhanced] by tier
  entitlementCacheTtlSeconds (default 120)
  featureFlagsByTier (which flows and capabilities enabled per tier)
```

---

## Family 27 Summary Table

| Factory | Interface | Methods | Primary Fabric | DNA |
|---------|-----------|---------|---------------|-----|
| F244 | ITenantRegistryService | 5 | DATABASE (ES+PG) | 8/8 ✅ |
| F245 | ITenantConfigService | 6 | DATABASE (ES+Redis) | 8/8 ✅ |
| F246 | ITenantIsolationBindingService | 8 | DATABASE (PG+Redis+ES)+QUEUE | 8/8 ✅ |
| F247 | ITenantContextPropagatorService | 6 | QUEUE+CORE | 8/8 ✅ |
| F248 | ITenantOnboardingOrchestratorService | 5 | FLOW ENGINE+DATABASE (ES) | 8/8 ✅ |
| F249 | ITenantGraduationService | 4 | DATABASE (ES+PG)+QUEUE | 8/8 ✅ |
| F250 | ITenantAuditService | 3 | QUEUE+DATABASE (ES) | 8/8 ✅ |
| F251 | ITenantEntitlementService | 6 | DATABASE (ES+Redis) | 8/8 ✅ |

**Totals: 8 factories, 43 methods, 64/64 DNA compliance checkpoints ✅**

---

## DR-21 — Hybrid Bridge as Default Isolation (D1)

```
DECISION: Default tenants to shared_schema (pooled) with RLS enforcement, support separate_schema
          and separate_db modes, design pool→silo graduation from day one via F246+F249.
CONTEXT: Both 28-reports recommend hybrid bridge. AWS/Azure SaaS guidance aligns.
  shared_schema gives cost efficiency for free/pro tiers. Enterprise tenants get dedicated isolation.
TRADE-OFF: RLS adds latency (~2ms per query) vs full schema/DB isolation (no RLS needed).
MACHINE: F246 binding resolution at EVERY ingress boundary. PCI tenants CANNOT use shared_schema without RLS.
FREEDOM: Isolation mode per tenant is admin-configurable via F245.
APPLIED BY: F246 (binding), F249 (graduation), T83 (provisioning gate), T90 (graduation gate)
```

---

## DR-22 — Onboarding as Flow (D7)

```
DECISION: Tenant onboarding is a flow executed by FlowOrchestrator (Skill 09) with EP-1 state machine.
  8-state lifecycle: Created→DomainVerified→IdentityConfigured→AuthzConfigured→
    PaymentConfigured→WebhookVerified→ComplianceValidated→Activated
CONTEXT: Both 28-reports describe onboarding as state machine. EP-1 already proven in FLOW-06.
TRADE-OFF: 8 states (vs v3's 7) adds ComplianceValidated gate before Activated — ensures
  label constraints are checked as final gate, not mixed into earlier steps.
MACHINE: State transitions are non-negotiable. Each gate MUST pass. Partial activation = BUILD FAILURE.
FREEDOM: Free tier skips Payment+Webhook gates. Timeout per gate configurable.
APPLIED BY: F248 (orchestrator), T89 (task type), Template 18 step 7
```

---

## DNA-8 Applicability Table (Family 27)

| Factory | DNA-8 Applicable | Outbox Usage |
|---------|-----------------|-------------|
| F244 ITenantRegistryService | ✅ YES | TenantRegistered event via outbox (atomic with PG state write) |
| F245 ITenantConfigService | ✅ YES | ConfigChanged event via outbox (atomic with ES config version) |
| F246 ITenantIsolationBindingService | ✅ YES | BindingUpdated, MigrationStarted events via outbox |
| F247 ITenantContextPropagatorService | ✅ YES | WrapAndPublishAsync uses outbox for reliable CloudEvents publication |
| F248 ITenantOnboardingOrchestratorService | ✅ YES | Each state transition via outbox (audit + state atomic) |
| F249 ITenantGraduationService | ✅ YES | Each migration step via outbox (compensation point + state atomic) |
| F250 ITenantAuditService | ✅ YES | Audit emission uses outbox (audit event atomic with triggering operation) |
| F251 ITenantEntitlementService | ✅ YES | EntitlementChanged event via outbox (change + audit atomic) |

**DNA-8 compliance: 8/8 applicable, all PASS ✅**

---

## SAVE POINT: MERGE:P1a ✅
## Phase 1a COMPLETE: Family 27 (F244-F251), 8 factories, 43 methods, DR-21+DR-22, 64/64 DNA
## Next: Phase 1b — Family 28 (F252-F259) Provider Adapter Layer
## Recovery: "Continue FLOW-08 from Phase 1b"

---

# ═══════════════════════════════════════════════════════
# FAMILY 28 — PLUGGABLE PROVIDER ADAPTER LAYER (F252–F259) [FLOW-08]
# ═══════════════════════════════════════════════════════
## Purpose: Runtime-swappable external provider adapters for identity, authorization,
##          payments, and encryption. Each tenant can use DIFFERENT providers — resolved
##          at runtime through FABRIC interfaces, never hard-coded.
## Fabric: DATABASE (ES+PG+Redis), QUEUE (Redis Streams), CORE, AI ENGINE
## DNA: 8 patterns × 8 factories = 64/64 compliance checkpoints
## Design Records: DR-23, DR-24

---

## F252 — IIdentityProviderAdapterService

```
FACTORY: F252
NAME: IIdentityProviderAdapterService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: xiigen_users (local auth, RLS-enforced by tenantId)
  SECONDARY → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-oidc-jwks-cache (OIDC JWKS cache per tenant IdP)
  TERTIARY  → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-scim-lifecycle (SCIM provisioning events, async)
INTERFACE METHODS:
  AuthenticateAsync(tenantId: string, credentials: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Strategy pattern: reads identity.mode from tenant config (F245).
      mode=local → validates username+bcrypt hash against PG.
      mode=oidc → validates JWT against tenant's OIDC issuer JWKS.
      mode=scim → validates via SCIM-provisioned local record.
      Returns user profile + session context on success.

  ValidateTokenAsync(tenantId: string, rawToken: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      OIDC token validation. JWKS cache-first (L1 in-process, L2 ES). kid-miss triggers refresh.
      Returns claims as Dictionary<string,object> on success.

  ExchangeCodeAsync(tenantId: string, authCode: string, redirectUri: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      PKCE authorization code → tokens. Never logs tokens. OIDC mode only.

  HandleScimEventAsync(tenantId: string, scimEvent: Dictionary<string,object>)
      → Task<DataProcessResult<string>>
      Ingests SCIM 2.0 event (User.Create/Update/Delete, Group.*). Async processing via Redis Stream.
      Returns correlationId.

  CreateLocalUserAsync(tenantId: string, userPayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates local user record. BuildSearchFilter skips empty optional fields.

  GetUserMappingAsync(tenantId: string, externalId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns internal user record linked to external SCIM/OIDC subject ID.

FACTORY CREATION:
  var idp = await _factory.CreateAsync<IIdentityProviderAdapterService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = tenantConfig["identity"]["mode"].ToString(),  // "local"|"oidc"|"scim"
          Metadata  = new Dictionary<string,string>
          {
              ["issuer"]         = tenantConfig["identity"]["oidc"]?["issuer"]?.ToString() ?? "",
              ["jwksCacheIndex"] = "xiigen-oidc-jwks-cache"
          }
      });

DISTINCT FROM: F253 manages authentication POLICIES (MFA, session). F252 manages identity RESOLUTION (who you are).
  Consolidates v3's 3 identity factories (F248 local + F249 OIDC + F250 SCIM) into one strategy-driven adapter.

DNA COMPLIANCE:
  DNA-1 ✅  All user records and claims as Dictionary<string,object>. No IUser or IOidcToken model.
  DNA-2 ✅  CreateLocalUserAsync: BuildSearchFilter skips empty optional fields.
  DNA-3 ✅  AuthenticateAsync returns DataProcessResult.Failure(INVALID_CREDENTIALS) — never throws.
  DNA-4 ✅  IdentityProviderAdapterService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every query. RLS on xiigen_users. JWKS cache namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/identity. No IIdentityController.
  DNA-7 ✅  traceparent propagated on OIDC discovery calls and SCIM event processing.
  DNA-8 ✅  User creation + SCIM events via transactional outbox (user record + audit atomic).

MACHINE (fixed):
  Raw passwords NEVER stored or logged — bcrypt hash only (local mode)
  OIDC alg whitelist: [RS256, RS384, RS512, ES256, ES384] — HS256 BLOCKED
  iss claim must match registered issuer exactly
  SCIM events validated against SCIM 2.0 schema before processing

FREEDOM (config):
  identity.mode per tenant [local | oidc | scim] (from F245 config)
  sessionTokenTtlSeconds (default 3600)
  jwksCacheTtlSeconds (default 300)
  maxLoginAttemptsBeforeLockout (default 5)
  pkceEnabled (default true)
```

---

## F253 — IAuthenticationPolicyService

```
FACTORY: F253
NAME: IAuthenticationPolicyService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-auth-policies (per-tenant authentication rules)
  SECONDARY → DATABASE FABRIC (Skill 05) → Redis provider
              Key: auth:session:{tenantId}:{sessionId} HASH (active session tracking)
INTERFACE METHODS:
  EvaluateStepUpAsync(tenantId: string, sessionContext: Dictionary<string,object>, requestedAction: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Determines if MFA step-up is required for the requested action.
      Returns {stepUpRequired: bool, methods: ["totp","sms"], reason}.

  ValidateSessionAsync(tenantId: string, sessionToken: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Validates session freshness, scope, and step-up status.
      Returns user context on success. Failure on expired/revoked session.

  RevokeSessionAsync(tenantId: string, sessionId: string)
      → Task<DataProcessResult<bool>>
      Revokes active session. Removes from Redis. Emits audit event via F250.

  GetActiveSessions(tenantId: string, userId: string)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Lists active sessions for a user. BuildSearchFilter applied.

FACTORY CREATION:
  var authPolicy = await _factory.CreateAsync<IAuthenticationPolicyService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["cacheProvider"] = "redis" }
      });

DISTINCT FROM: F252 handles WHO you are (identity resolution). F253 handles WHAT security
  policies apply to your session (MFA, step-up, session lifecycle). NEW factory — not in v3.

DNA COMPLIANCE:
  DNA-1 ✅  Policies and sessions as Dictionary<string,object>. No ISession or IAuthPolicy model.
  DNA-2 ✅  GetActiveSessions: BuildSearchFilter on userId filter.
  DNA-3 ✅  ValidateSessionAsync returns DataProcessResult.Failure(SESSION_EXPIRED) — not exception.
  DNA-4 ✅  AuthenticationPolicyService extends MicroserviceBase.
  DNA-5 ✅  tenantId on all ES + Redis queries. Session keys namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/auth/policies.
  DNA-7 ✅  Session revocation events carry traceparent for distributed trace correlation.
  DNA-8 ✅  Session revocation via outbox (revoke + audit event atomic).

MACHINE (fixed):
  Session expiry minimum: 60 seconds (cannot be lower)
  Step-up MFA check runs at EVERY boundary for sensitive actions (never cached > 5min)
  RevokeSessionAsync always emits audit event — no silent revocations

FREEDOM (config):
  stepUpActions list per tenant (which actions require MFA)
  sessionTtlSeconds (default 3600)
  mfaMethods per tenant [totp | sms | webauthn]
  maxConcurrentSessions per user (default 5)
```

---

## F254 — IAuthorizationPolicyService

```
FACTORY: F254
NAME: IAuthorizationPolicyService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-authz-policies (per-tenant authorization rules: RBAC/ABAC/hybrid)
  SECONDARY → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: object_acls (object-level ACLs for fine-grained ABAC — ACID)
INTERFACE METHODS:
  EvaluatePolicyAsync(tenantId: string, subject: string, action: string, resource: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Main authZ check. Reads tenant's policyModel from F245 config.
      rbac: checks subject's roles against action permissions.
      abac: evaluates attribute-based conditions on resource.
      hybrid: RBAC first, ABAC as override.
      Returns {allowed: bool, reason, policyId} as Dictionary.

  CreatePolicyAsync(tenantId: string, policy: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates authZ policy under tenant scope. Validates policy schema. Emits audit event.

  UpdatePolicyAsync(tenantId: string, policyId: string, patch: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Partial update. BuildSearchFilter skips empty fields. Emits audit.

  ListPoliciesAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Filtered list. BuildSearchFilter applied.

  GetEffectivePermissionsAsync(tenantId: string, subject: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns flattened permission set for a subject under tenant scope.

FACTORY CREATION:
  var authzPolicy = await _factory.CreateAsync<IAuthorizationPolicyService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["policyModel"] = tenantConfig["authz"]["model"].ToString()  // "rbac"|"abac"|"hybrid"
          }
      });

DISTINCT FROM: F253 handles authentication policies (session, MFA). F254 handles authorization
  policies (what you're allowed to DO). Adapted from P1:F251.

DNA COMPLIANCE:
  DNA-1 ✅  Policies as Dictionary<string,object>. No IPolicy typed model.
  DNA-2 ✅  ListPoliciesAsync + UpdatePolicyAsync: BuildSearchFilter — empty fields skipped.
  DNA-3 ✅  EvaluatePolicyAsync returns DataProcessResult with allowed=false — never throws.
  DNA-4 ✅  AuthorizationPolicyService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every ES + PG query. Policies namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/authz/policies.
  DNA-7 ✅  Policy evaluation decisions carry traceparent for audit trail correlation.
  DNA-8 ✅  Policy CRUD via outbox (policy write + audit event atomic).

MACHINE (fixed):
  Default-deny: no matching policy = DataProcessResult.Failure(POLICY_NOT_FOUND)
  DENY overrides ALLOW (explicit deny wins)
  Object-level authorization (BOLA protection): resource must include objectId
  Policy schema version must match engine's current version

FREEDOM (config):
  policyModel per tenant [rbac | abac | rbac_abac_hybrid]
  cachePolicyEvaluationTtlMs (default 500ms)
  maxPoliciesPerTenant (quota by tier)
  defaultRoleOnRegistration (e.g., "viewer")
```

---

## F255 — IAccessEnforcementTopologyService

```
FACTORY: F255
NAME: IAccessEnforcementTopologyService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → CORE FABRIC (Skill 01 — MicroserviceBase)
              Implemented as middleware in MicroserviceBase request pipeline.
  SECONDARY → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-authz-decisions (mesh ext_authz decision cache + audit)
INTERFACE METHODS:
  EnforceAtGatewayAsync(tenantId: string, requestContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Coarse-grained enforcement: validates tenantId claim matches path.
      Calls F254 for role check. Returns enriched context.

  EnforceAtMeshAsync(tenantId: string, requestContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Fine-grained object-level authZ (BOLA protection at mesh level).
      ONLY active when accessTopology = gateway_plus_mesh_ext_authz.

  InjectTenantContextAsync(tenantId: string, requestContext: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Attaches TenantContext (isolation binding, tier, labels) to request scope.

  AuditAccessDecisionAsync(tenantId: string, decision: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Emits decision to F250 audit. Fire-and-forget.

FACTORY CREATION:
  var enforcement = await _factory.CreateAsync<IAccessEnforcementTopologyService>(
      new FactoryResolutionContext
      {
          TenantId = resolvedTenantId,
          Provider  = tenantConfig["accessTopology"]["mode"].ToString(),  // "gateway_only"|"gateway_plus_mesh"
      });

DISTINCT FROM: F254 defines authZ POLICIES. F255 ENFORCES them at network boundaries.
  Consolidates v3's F252 (gateway) + F253 (mesh) into one topology-aware factory.

DNA COMPLIANCE:
  DNA-1 ✅  Request contexts as Dictionary<string,object>. No IRequestContext model.
  DNA-2 ✅  BuildSearchFilter in policy lookup delegation to F254.
  DNA-3 ✅  EnforceAtGatewayAsync returns DataProcessResult.Failure(ENFORCEMENT_DENIED) — never throws.
  DNA-4 ✅  AccessEnforcementTopologyService extends MicroserviceBase.
  DNA-5 ✅  tenantId validated at entry — this IS the scope-setting step.
  DNA-6 ✅  No entity-specific controller. DynamicController routes post-enforcement.
  DNA-7 ✅  Enforcement decisions carry traceparent. Access audit correlated via trace.
  DNA-8 ✅  Enforcement decisions published via outbox for audit reliability.

MACHINE (fixed):
  EnforceAtGatewayAsync MUST run before any downstream factory CreateAsync()
  Token tenantId ≠ URL path tenantId → immediate ENFORCEMENT_DENIED
  Both allow and deny decisions are audited
  Mesh enforcement only resolves when topology mode = gateway_plus_mesh_ext_authz

FREEDOM (config):
  accessTopologyMode per tenant [gateway_only | gateway_plus_mesh_ext_authz]
  coarseGrainedPolicyCacheTtlMs (default 500ms)
  auditAllowDecisions (default true)
```

---

## F256 — IPaymentProviderAdapterService

```
FACTORY: F256
NAME: IPaymentProviderAdapterService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-payment-events → Consumed → Archive → DLQ
  SECONDARY → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: payment_intents (payment lifecycle state — ACID)
INTERFACE METHODS:
  CreatePaymentIntentAsync(tenantId: string, payload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Authorizes payment via tenant's configured PSP (Stripe/Adyen/Braintree).
      PSP resolved from F245 config. Idempotency key checked via F260 before PSP call.
      Returns {intentId, status, clientSecret} as Dictionary.

  CapturePaymentAsync(tenantId: string, intentId: string, capturePayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Captures authorized intent. Idempotency-safe.

  RefundPaymentAsync(tenantId: string, intentId: string, refundPayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Initiates refund. Validates against capture amount.

  GetPaymentStatusAsync(tenantId: string, intentId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns current lifecycle state.

  ListPaymentIntentsAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Filtered list. BuildSearchFilter applied.

FACTORY CREATION:
  var psp = await _factory.CreateAsync<IPaymentProviderAdapterService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = tenantConfig["payments"]["provider"].ToString(),
          Metadata  = new Dictionary<string,string>
          {
              ["apiKeyRef"]         = tenantConfig["payments"]["apiKeyVaultRef"].ToString(),
              ["idempotencyFactory"] = "F260"
          }
      });

DISTINCT FROM: F257 handles incoming webhooks. F258 handles ledger. F256 initiates outbound PSP calls.

DNA COMPLIANCE:
  DNA-1 ✅  Payment intents as Dictionary<string,object>. No IPaymentIntent model.
  DNA-2 ✅  ListPaymentIntentsAsync: BuildSearchFilter skips empty filter fields.
  DNA-3 ✅  CreatePaymentIntentAsync returns DataProcessResult.Failure(PSP_DECLINED) — never throws.
  DNA-4 ✅  PaymentProviderAdapterService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every PG query.
  DNA-6 ✅  DynamicController at /api/payments/intents.
  DNA-7 ✅  traceparent on PSP webhook correlation.
  DNA-8 ✅  Payment intent creation via transactional outbox (PG record + event atomic).

MACHINE (fixed):
  idempotencyKey MUST be in payload — missing = BUILD_FAILURE
  API keys from vault by reference — never in ES config
  PCI-labeled tenants: payment_intents in PCI-isolated PG instance
  Raw card data NEVER touches this service — tokenization at PSP hosted fields

FREEDOM (config):
  pspProvider per tenant [stripe | adyen | braintree | manual_invoice]
  captureMethod [automatic | manual] (default automatic)
  retryPolicy per PSP operation
  statementDescriptor (tenant-branded)
```

---

## F257 — IPaymentWebhookService

```
FACTORY: F257
NAME: IPaymentWebhookService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY → QUEUE FABRIC (Skill 04) → Redis Streams
            Stream: xiigen-payment-webhooks-main → Consumed → Archive → DLQ
INTERFACE METHODS:
  IngestWebhookAsync(tenantId: string, rawPayload: string, signatureHeader: string, providerHint: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Verifies HMAC signature. Deduplicates via F260 (event.id as idempotency key).
      Enqueues to Redis Stream. Returns {eventId, status: "accepted"|"duplicate"}.

  GetIngestionStatusAsync(tenantId: string, eventId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>

  RetryDlqAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Admin: re-queues DLQ events. BuildSearchFilter applied.

FACTORY CREATION:
  var webhook = await _factory.CreateAsync<IPaymentWebhookService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string> { ["streamName"] = "xiigen-payment-webhooks-main" }
      });

DISTINCT FROM: F256 makes outbound PSP calls. F257 receives inbound PSP webhooks.

DNA COMPLIANCE:
  DNA-1 ✅  Webhook events as Dictionary. No IWebhookEvent model.
  DNA-2 ✅  RetryDlqAsync: BuildSearchFilter on filter.
  DNA-3 ✅  Signature failure returns DataProcessResult.Failure(SIGNATURE_INVALID).
  DNA-4 ✅  PaymentWebhookService extends MicroserviceBase.
  DNA-5 ✅  tenantId in every stream message.
  DNA-6 ✅  DynamicController at /api/payments/webhooks.
  DNA-7 ✅  Webhook processing carries traceparent for distributed trace.
  DNA-8 ✅  Verified webhooks enqueued via outbox pattern for reliable delivery.

MACHINE (fixed):
  Signature verification MANDATORY — unverified = Failure(SIGNATURE_INVALID)
  rawPayload NEVER logged
  Deduplication via F260 runs BEFORE enqueueing

FREEDOM (config):
  webhookSignatureAlgorithm per provider [hmac_sha256 | hmac_sha512]
  dlqMaxRetries (default 3)
  eventTypesAllowlist (optional filter)
```

---

## F258 — IPaymentLedgerService

```
FACTORY: F258
NAME: IPaymentLedgerService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY → DATABASE FABRIC (Skill 05) → PostgreSQL provider
            Table: payment_ledger (double-entry: tenantId, debitAccount, creditAccount, amount, currency)
            ACID writes only — no ES for ledger.
INTERFACE METHODS:
  RecordTransactionAsync(tenantId: string, transaction: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Double-entry ledger write in PG transaction. Idempotent on intentId.

  GetBalanceAsync(tenantId: string, accountId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>

  ListTransactionsAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      BuildSearchFilter applied.

  ReconcileAsync(tenantId: string, reconcilePayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Compares local ledger against PSP export. Returns {matched, mismatched}.

FACTORY CREATION:
  var ledger = await _factory.CreateAsync<IPaymentLedgerService>(
      new FactoryResolutionContext { TenantId = flowRun.TenantContext.TenantId, Provider = "postgresql" });

DISTINCT FROM: F256 handles PSP communication. F258 handles financial accounting.

DNA COMPLIANCE:
  DNA-1 ✅  Ledger records as Dictionary. No ILedgerEntry model.
  DNA-2 ✅  ListTransactionsAsync: BuildSearchFilter.
  DNA-3 ✅  RecordTransactionAsync: DataProcessResult — duplicate returns existing.
  DNA-4 ✅  PaymentLedgerService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every PG query.
  DNA-6 ✅  DynamicController at /api/payments/ledger.
  DNA-7 ✅  Ledger entries carry traceparent correlating to originating payment flow.
  DNA-8 ✅  Ledger write + reconciliation event via transactional outbox.

MACHINE (fixed):
  Double-entry: debit ≠ credit, |debit| = |credit|
  Amount = positive integer (minor currency units) — floats = BUILD_FAILURE
  PCI-labeled tenants: ledger in PCI-isolated PG schema

FREEDOM (config):
  supportedCurrencies (ISO 4217)
  reconciliationScheduleCron (default daily)
```

---

## F259 — IEncryptionKeyManagementService

```
FACTORY: F259
NAME: IEncryptionKeyManagementService
FAMILY: 28 — Pluggable Provider Adapters
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-key-metadata (key metadata, version, rotation — NOT key material)
  SECONDARY → DATABASE FABRIC (Skill 05) → Redis provider
              Key: dek:{tenantId}:{purpose} HASH (DEK envelope cache)
  EXTERNAL  → KMS (AWS KMS / Azure Key Vault / HashiCorp Vault) via vault reference
INTERFACE METHODS:
  GetDataEncryptionKeyAsync(tenantId: string, keyPurpose: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns DEK envelope: {keyId, encryptedDek, algorithm, kmsKeyRef}. Caller decrypts via KMS.
      keyPurpose: [payment_data | pii | audit_log | general]

  RotateKeyAsync(tenantId: string, keyPurpose: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Generates new DEK, re-encrypts with current KEK. Emits cmk.key-rotated audit via F250.
      In-flight FlowRuns continue with old key; new writes use new key.

  RevokeKeyAsync(tenantId: string, keyId: string, reason: string)
      → Task<DataProcessResult<bool>>
      Marks key as revoked. Data encrypted with revoked key becomes inaccessible.
      Mandatory audit event.

  ValidateKeyReadinessAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Checks CMK configured + KMS reachable before tenant activation.

FACTORY CREATION:
  var keyMgmt = await _factory.CreateAsync<IEncryptionKeyManagementService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["kmsProvider"] = tenantConfig["compliance"]["kmsProvider"].ToString(),
              ["kmsKeyRef"]   = tenantConfig["compliance"]["kmsKeyRef"].ToString()
          }
      });

DISTINCT FROM: F266 enforces compliance LABELS. F259 manages encryption KEYS that labels may require.

DNA COMPLIANCE:
  DNA-1 ✅  Key metadata as Dictionary. No ICmkKey model. Key material never in Dictionary.
  DNA-2 ✅  GetDataEncryptionKeyAsync: BuildSearchFilter on (tenantId, keyPurpose).
  DNA-3 ✅  RotateKeyAsync returns DataProcessResult — KMS unreachable = Failure(KMS_UNREACHABLE).
  DNA-4 ✅  EncryptionKeyManagementService extends MicroserviceBase.
  DNA-5 ✅  tenantId on all ES queries. Key IDs namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/encryption/keys.
  DNA-7 ✅  Key rotation events carry traceparent for audit correlation.
  DNA-8 ✅  Key rotation via outbox (metadata update + audit event atomic).

MACHINE (fixed):
  Key material NEVER stored in ES — only kmsKeyRef and encrypted DEK envelope
  RevokeKeyAsync ALWAYS emits audit event
  CMK tenant cannot use shared_schema isolation without additional controls
  ValidateKeyReadinessAsync runs during onboarding before Activated state

FREEDOM (config):
  kmsProvider per tenant [aws_kms | azure_key_vault | hashicorp_vault]
  keyRotationScheduleCron (default monthly)
  deksPerKeyPurpose (active versions; default 2)
  rotationGracePeriodHours (old DEK valid for reads; default 24)
```

---

## Family 28 Summary Table

| Factory | Interface | Methods | Primary Fabric | DNA |
|---------|-----------|---------|---------------|-----|
| F252 | IIdentityProviderAdapterService | 6 | DATABASE (PG+ES)+QUEUE | 8/8 ✅ |
| F253 | IAuthenticationPolicyService | 4 | DATABASE (ES+Redis) | 8/8 ✅ |
| F254 | IAuthorizationPolicyService | 5 | DATABASE (ES+PG) | 8/8 ✅ |
| F255 | IAccessEnforcementTopologyService | 4 | CORE+QUEUE | 8/8 ✅ |
| F256 | IPaymentProviderAdapterService | 5 | QUEUE+DATABASE (PG) | 8/8 ✅ |
| F257 | IPaymentWebhookService | 3 | QUEUE (Redis Streams) | 8/8 ✅ |
| F258 | IPaymentLedgerService | 4 | DATABASE (PG) | 8/8 ✅ |
| F259 | IEncryptionKeyManagementService | 4 | DATABASE (ES+Redis) | 8/8 ✅ |

**Totals: 8 factories, 35 methods, 64/64 DNA compliance checkpoints ✅**

---

## DR-23 — Provider Adapter as Strategy Pattern (D4)

```
DECISION: Provider adapters (identity F252, payments F256) use the same factory resolution
  pattern as V39/V40 IExternalServiceFactory. Read tenant config → extract provider binding
  → resolve adapter via CreateAsync(). Same pattern as AiDispatcher (Skill 07) for multi-provider.
CONTEXT: Both 28-reports recommend pluggable providers. AiDispatcher proven in FLOW-06/07.
TRADE-OFF: Single factory with mode/strategy vs. separate factories per provider.
  Strategy pattern reduces factory count (3 identity factories → 1) while maintaining type safety.
MACHINE: Provider resolution MUST read from tenant config. Never hardcoded.
FREEDOM: Available provider list per tier.
APPLIED BY: F252 (identity), F256 (payments), F259 (encryption KMS)
```

---

## DR-24 — Saga + Outbox for Payment-Critical Flows (D5)

```
DECISION: DNA-8 transactional outbox + F260 idempotency keys for all payment operations.
  Each payment step = local transaction + compensating action. Events via outbox.
CONTEXT: Both 28-reports emphasize saga, outbox, idempotency as foundational.
  FLOW-06 proved DNA-8 outbox pattern. FLOW-08 extends to payments.
TRADE-OFF: Outbox adds ~5ms latency per write but guarantees exactly-once event delivery.
MACHINE: idempotencyKey MUST be present on all payment writes. Missing = BUILD_FAILURE.
FREEDOM: Retry policy and TTL configurable per operation type.
APPLIED BY: F256 (PSP), F257 (webhooks), F258 (ledger), F260 (idempotency)
```

---

## DNA-8 Applicability Table (Family 28)

| Factory | DNA-8 Applicable | Outbox Usage |
|---------|-----------------|-------------|
| F252 IIdentityProviderAdapterService | ✅ YES | User creation + SCIM events atomic with audit |
| F253 IAuthenticationPolicyService | ✅ YES | Session revocation + audit atomic |
| F254 IAuthorizationPolicyService | ✅ YES | Policy CRUD + audit atomic |
| F255 IAccessEnforcementTopologyService | ✅ YES | Enforcement decisions published for audit |
| F256 IPaymentProviderAdapterService | ✅ YES | Payment intent creation + event atomic |
| F257 IPaymentWebhookService | ✅ YES | Verified webhooks enqueued reliably |
| F258 IPaymentLedgerService | ✅ YES | Ledger write + reconciliation event atomic |
| F259 IEncryptionKeyManagementService | ✅ YES | Key rotation + audit event atomic |

**DNA-8 compliance: 8/8 applicable, all PASS ✅**

---

## SAVE POINT: MERGE:P1b ✅
## Phase 1b COMPLETE: Family 28 (F252-F259), 8 factories, 35 methods, DR-23+DR-24, 64/64 DNA
## Running total: 16 factories (F244-F259), 78 methods, 128/128 DNA
## Next: Phase 1c — Family 29 (F260-F271) Tenant-Aware Operations
## Recovery: "Continue FLOW-08 from Phase 1c"

---


---

# ═══════════════════════════════════════════════════════
# FAMILY 29 — TENANT-AWARE OPERATIONS (F260–F271) [FLOW-08]
# ═══════════════════════════════════════════════════════
## Purpose: Cross-cutting operational capabilities that span ALL tenants and ALL flows.
##          Idempotency, rate limiting, metrics, billing, backup, canary, compliance,
##          data export, tenant-scoped flow execution, webhooks, notifications, config promotion.
##          This is the LARGEST family (12 factories) because operations is the broadest layer.
## Fabric: DATABASE (ES+PG+Redis), QUEUE (Redis Streams), FLOW ENGINE, CORE
## DNA: 8 patterns × 12 factories = 96/96 compliance checkpoints
## Design Records: DR-25, DR-26

---

## F260 — IIdempotencyKeyService

```
FACTORY: F260
NAME: IIdempotencyKeyService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Table: idempotency_keys (idempotency_key, tenantId, operationType, requestHash, responseSnapshot, createdAt, expiresAt)
              Unique constraint: (tenantId, idempotency_key)
INTERFACE METHODS:
  CheckOrReserveAsync(tenantId: string, idempotencyKey: string, requestHash: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Atomic check-and-reserve. If key is NEW: reserves it, returns {status: "new"}.
      If key EXISTS with same requestHash: returns {status: "duplicate", cachedResponse: {...}}.
      If key EXISTS with different requestHash: returns DataProcessResult.Failure(IDEMPOTENCY_CONFLICT).

  StoreResponseAsync(tenantId: string, idempotencyKey: string, response: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Stores response snapshot against key. Called after operation succeeds.
      Expires after configurable TTL.

  ExpireKeyAsync(tenantId: string, idempotencyKey: string)
      → Task<DataProcessResult<bool>>
      Explicit expiration. Marks key as EXPIRED.

  CleanupExpiredAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Background job: prunes expired keys. Returns {deletedCount, oldestRetained}.

FACTORY CREATION:
  var idempotency = await _factory.CreateAsync<IIdempotencyKeyService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "postgresql"
      });

DISTINCT FROM: F256 uses F260 for payment idempotency. F260 is CROSS-CUTTING — used by payments,
  webhooks, SCIM events, and any operation needing exactly-once semantics.
  Adapted from v1's F255 (payment-specific) into a general-purpose idempotency service.

DNA COMPLIANCE:
  DNA-1 ✅  Response snapshots as Dictionary<string,object>. No IIdempotencyRecord model.
  DNA-2 ✅  CheckOrReserveAsync uses BuildSearchFilter for (tenantId, idempotencyKey) lookup.
  DNA-3 ✅  Conflict returned as DataProcessResult.Failure(IDEMPOTENCY_CONFLICT) — not exception.
  DNA-4 ✅  IdempotencyKeyService extends MicroserviceBase.
  DNA-5 ✅  tenantId in every PG query (composite key + filter).
  DNA-6 ✅  DynamicController at /api/idempotency.
  DNA-7 ✅  traceparent carried on idempotency check for correlation with source operation.
  DNA-8 ✅  StoreResponseAsync called within caller's DB transaction scope (outbox-compatible).

MACHINE (fixed):
  Unique constraint on (tenantId, idempotency_key) enforced at DB level
  Response snapshot stored ONLY after operation succeeds — partial failures do not store
  TTL minimum: 300 seconds — no key expires faster than this

FREEDOM (config):
  defaultTtlSeconds per operation type (payment.create: 86400, webhook: 3600, scim: 7200)
  maxKeyLengthBytes (default 256)
  cleanupJobIntervalHours (background expired-key pruning; default 6)
```

---

## F261 — ITenantRateLimitingService

```
FACTORY: F261
NAME: ITenantRateLimitingService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Redis provider
              Uses Redis sorted sets (sliding window) for per-tenant rate limit counters.
              Key pattern: rate:{tenantId}:{operationType}:{windowStart}
INTERFACE METHODS:
  CheckAndIncrementAsync(tenantId: string, operationType: string, cost: int = 1)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Atomic check-and-increment in Redis. Returns:
        {allowed: bool, remaining: int, resetAt: <ISO8601>, retryAfterMs: int (if denied)}
      Sliding window algorithm: configurable window, max per window from F251 entitlements.

  GetQuotaStatusAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns all active rate limit counters for a tenant as Dictionary.

  ResetQuotaAsync(tenantId: string, operationType: string)
      → Task<DataProcessResult<bool>>
      Admin operation: resets a specific quota counter. Emits quota.reset audit event via F250.

  ApplyBurstAllowanceAsync(tenantId: string, operationType: string, additionalCost: int)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Enterprise tenants: applies burstable quota (temporary above base limit).

FACTORY CREATION:
  var rateLimiter = await _factory.CreateAsync<ITenantRateLimitingService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis",
          Metadata  = new Dictionary<string,string>
          {
              ["windowSeconds"] = tenantSlaConfig["rateLimitWindowSeconds"].ToString(),
              ["maxRequests"]   = tenantSlaConfig["maxRequestsPerWindow"].ToString()
          }
      });

DISTINCT FROM: F251 handles ENTITLEMENTS (tier quotas, SLA). F261 handles RATE LIMITING (short-term request throttling).
  Adapted from v1's F267 with unchanged structure.

DNA COMPLIANCE:
  DNA-1 ✅  Rate limit results as Dictionary<string,object>. No IRateLimitResult model.
  DNA-2 ✅  GetQuotaStatusAsync: BuildSearchFilter on operationType (skips empty).
  DNA-3 ✅  CheckAndIncrementAsync returns DataProcessResult.Failure(RATE_LIMIT_EXCEEDED) — not exception. Caller maps to HTTP 429.
  DNA-4 ✅  TenantRateLimitingService extends MicroserviceBase.
  DNA-5 ✅  Redis key includes tenantId — counters are always tenant-scoped.
  DNA-6 ✅  DynamicController at /api/quota.
  DNA-7 ✅  Rate limit decisions carry traceparent for correlation with denied requests.
  DNA-8 ✅  ResetQuotaAsync via outbox (counter reset + audit event atomic).

MACHINE (fixed):
  Rate limiting applies to ALL flows (FLOW-01 through FLOW-08 ingress all pass through F261)
  free tier: hard cap (no burst), pro: soft cap (burst 2×), enterprise: configurable burst
  Sliding window minimum: 60 seconds — no sub-minute windows

FREEDOM (config):
  maxRequestsPerWindowByTier (free: 100, pro: 1000, enterprise: configurable)
  burstMultiplierByTier (pro: 2.0, enterprise: configurable)
  operationTypeWeights (some operations cost >1 unit: AI generation = 10 units)
  rateLimitWindowSeconds (default 60)
```

---

## F262 — ITenantMetricsService

```
FACTORY: F262
NAME: ITenantMetricsService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-metrics-{yyyy-MM} (time-series tenant metrics, monthly rollover)
  SECONDARY → CORE FABRIC (Skill 01 — MicroserviceBase)
              In-process OTel Meter API for real-time metric emission.
INTERFACE METHODS:
  RecordMetricAsync(tenantId: string, metricName: string, value: double, dimensions: Dictionary<string,object>)
      → Task<DataProcessResult<bool>>
      Records a metric data point. Dual-write: OTel collector (real-time) + ES (query).
      metricName enum: [flow.duration_ms, flow.error_rate, api.latency_ms, api.throughput_rps,
                         isolation.binding_resolution_ms, identity.auth_latency_ms]
      dimensions: {flowId, taskType, tier, region} — bounded cardinality only.

  QueryMetricsAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Queries aggregated metrics from ES. BuildSearchFilter applied.
      Supports: metricName, dateRange, aggregation (avg, p95, p99, max), groupBy.

  GetDashboardAsync(tenantId: string, dashboardType: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns pre-computed dashboard data for a tenant.
      dashboardType: [overview | performance | errors | isolation | identity]

  AlertOnThresholdAsync(tenantId: string, alertRule: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Evaluates alertRule against current metrics. Returns {triggered: bool, currentValue, threshold}.
      Emits alert via F270 notification router if triggered.

FACTORY CREATION:
  var metrics = await _factory.CreateAsync<ITenantMetricsService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["metricsIndexPattern"] = "xiigen-metrics-*",
              ["otelCollectorEndpoint"] = config["observability"]["otelEndpoint"].ToString()
          }
      });

DISTINCT FROM: F263 handles BILLING metering (usage → money). F262 handles OPERATIONAL metrics (performance → alerts).
  NEW factory — no P1 equivalent.

DNA COMPLIANCE:
  DNA-1 ✅  Metrics and dashboard data as Dictionary<string,object>. No IMetricDataPoint model.
  DNA-2 ✅  QueryMetricsAsync: BuildSearchFilter on dateRange, metricName, aggregation.
  DNA-3 ✅  QueryMetricsAsync returns DataProcessResult — no metrics found = empty list, not exception.
  DNA-4 ✅  TenantMetricsService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every ES query. Metrics namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/metrics.
  DNA-7 ✅  Metric recording carries traceparent for correlation with source FlowRun.
  DNA-8 ✅  AlertOnThresholdAsync via outbox (alert evaluation + notification dispatch atomic).

MACHINE (fixed):
  RecordMetricAsync NEVER blocks the main flow execution path (fire-and-forget)
  dimensions MUST be bounded cardinality — per-user labels FORBIDDEN (high-cardinality risk)
  ES index monthly rollover with ILM policy (hot→warm→cold→delete)

FREEDOM (config):
  metricsRetentionDays (hot: 7, warm: 30, cold: 90)
  alertEvaluationIntervalSeconds (default 60)
  otelCollectorEndpoint per deployment
  enabledMetricNames per tenant (which metrics recorded; default: all)
```

---

## F263 — ITenantBillingMeteringService

```
FACTORY: F263
NAME: ITenantBillingMeteringService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-metering-events → Consumed → Archive → DLQ
  SECONDARY → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-billing-usage (aggregated billing-period usage summaries)
INTERFACE METHODS:
  EmitUsageEventAsync(tenantId: string, metricName: string, value: double, unit: string, dimensions: Dictionary<string,object>)
      → Task<DataProcessResult<string>>   // returns meteringEventId
      Emits usage/billing event to Redis Stream. Returns immediately.
      metricName examples: [flow.execution_ms, ai.tokens_used, connector.api_calls, storage.bytes_written]
      dimensions: {flowId, taskType, tier, isolationMode} — bounded cardinality only.

  QueryUsageAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Queries aggregated usage from ES billing index. BuildSearchFilter applied.

  GetBillingSummaryAsync(tenantId: string, period: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns billing-period summary: {totalFlowExecutions, totalAiTokens, totalStorageGb, estimatedCost} as Dictionary.

  ExportBillingDataAsync(tenantId: string, period: string, format: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Exports billing data for external billing system integration.
      Returns {exportId, downloadUrlRef, recordCount} as Dictionary.

FACTORY CREATION:
  var metering = await _factory.CreateAsync<ITenantBillingMeteringService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string> { ["streamName"] = "xiigen-metering-events" }
      });

DISTINCT FROM: F262 handles OPERATIONAL metrics. F263 handles BILLING metering (usage → cost).
  Adapted from v1's F268 with billing export added.

DNA COMPLIANCE:
  DNA-1 ✅  Usage events and billing summaries as Dictionary<string,object>. No IUsageEvent model.
  DNA-2 ✅  QueryUsageAsync: BuildSearchFilter on filter (skips empty date ranges, metricName).
  DNA-3 ✅  EmitUsageEventAsync returns DataProcessResult — Redis unavailable falls back to in-memory buffer. Never throws.
  DNA-4 ✅  TenantBillingMeteringService extends MicroserviceBase.
  DNA-5 ✅  tenantId in every metering event + every ES query.
  DNA-6 ✅  DynamicController at /api/billing/metering.
  DNA-7 ✅  traceparent carried on metering events for FlowRun correlation.
  DNA-8 ✅  EmitUsageEventAsync via transactional outbox when called within DB transaction scope.

MACHINE (fixed):
  Metering events NEVER block the main flow execution path (fire-and-forget)
  tenantId, metricName, value, unit are REQUIRED — missing = Failure(METERING_INVALID_EVENT)
  dimensions use bounded-cardinality labels only — per-user labels FORBIDDEN

FREEDOM (config):
  enabledMetricNames per tenant (which metrics metered; default: all)
  billingPeriodType [monthly | weekly | daily]
  meteringFlushIntervalMs (buffer flush if Redis degraded; default 5000)
  retentionDaysForMeteringData (default 90)
  exportFormatType [json | csv | parquet]
```

---

## F264 — ITenantBackupRestoreService

```
FACTORY: F264
NAME: ITenantBackupRestoreService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → PostgreSQL provider + Elasticsearch provider
              PG: tenant schema/shard data backup via pg_dump (per-tenant scoped)
              ES: tenant index data backup via snapshot API (per-tenant filtered)
  SECONDARY → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-backup-events (backup lifecycle events)
INTERFACE METHODS:
  CreateBackupAsync(tenantId: string, backupConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Initiates per-tenant backup. Scope determined by F246 isolation binding:
      shared_schema → row-level export (filtered by tenantId).
      separate_schema → schema-level pg_dump.
      separate_db → full shard snapshot.
      Returns {backupId, status: "in_progress", estimatedDurationMs} as Dictionary.

  RestoreBackupAsync(tenantId: string, backupId: string, restoreConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Restores from backup. Validates backup integrity before applying.
      BuildSearchFilter skips empty restoreConfig fields.
      Returns {restoreId, status: "in_progress"} as Dictionary.

  ListBackupsAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Filtered list of available backups. BuildSearchFilter applied.

  GetBackupStatusAsync(tenantId: string, backupId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns backup lifecycle status: {backupId, status, sizeBytes, completedAt}.

  DeleteBackupAsync(tenantId: string, backupId: string)
      → Task<DataProcessResult<bool>>
      Removes backup artifact. Emits audit event via F250. Requires confirmationToken.

FACTORY CREATION:
  var backup = await _factory.CreateAsync<ITenantBackupRestoreService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["isolationMode"]   = flowRun.TenantContext.IsolationMode,
              ["backupProvider"]   = config["backup"]["provider"].ToString()  // "s3"|"azure_blob"|"gcs"
          }
      });

DISTINCT FROM: F267 handles DATA EXPORT (GDPR Right of Access). F264 handles full BACKUP/RESTORE (disaster recovery).
  NEW factory — no P1 equivalent.

DNA COMPLIANCE:
  DNA-1 ✅  Backup configs and status as Dictionary<string,object>. No IBackupConfig model.
  DNA-2 ✅  ListBackupsAsync + RestoreBackupAsync: BuildSearchFilter skips empty filter fields.
  DNA-3 ✅  CreateBackupAsync returns DataProcessResult — backup failure = Failure(BACKUP_FAILED), not exception.
  DNA-4 ✅  TenantBackupRestoreService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every backup operation. shared_schema backups are row-filtered by tenantId.
  DNA-6 ✅  DynamicController at /api/backup.
  DNA-7 ✅  traceparent carried on backup/restore operations for audit trail.
  DNA-8 ✅  CreateBackupAsync via outbox (backup record + backup-started event atomic).

MACHINE (fixed):
  shared_schema backup MUST filter by tenantId — no cross-tenant data leakage
  RestoreBackupAsync validates backup integrity checksum before applying
  DeleteBackupAsync requires confirmationToken + F250 audit event (non-optional)
  Backup storage location determined by backup provider config (S3/Azure Blob/GCS)

FREEDOM (config):
  backupScheduleCron per tenant (default: daily at 03:00 for enterprise, weekly for pro)
  backupRetentionDays (default 30)
  backupProvider [s3 | azure_blob | gcs]
  maxConcurrentBackupsPerTenant (default 1)
```

---

## F265 — ITenantCanaryDeploymentService

```
FACTORY: F265
NAME: ITenantCanaryDeploymentService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-canary-cohorts (canary deployment groups, rollout state)
  SECONDARY → FLOW ENGINE FABRIC (Skills 08/09)
              Canary cohort assignment determines which flow-definition VERSION a tenant executes.
INTERFACE METHODS:
  CreateCohortAsync(cohortConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates a canary cohort: {cohortId, name, targetVersion, rolloutPercentage, selectionCriteria}.
      selectionCriteria: tier, region, labels, explicit tenantId list.
      Returns {cohortId, status: "created", memberCount} as Dictionary.

  AssignTenantToCohortAsync(tenantId: string, cohortId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Assigns a tenant to a canary cohort. Tenant receives cohort's target flow-definition version.

  ResolveTenantCohortAsync(tenantId: string, flowDefinitionName: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns which version of a flow-definition a tenant should execute based on cohort assignment.
      Returns {flowDefinitionName, resolvedVersion, cohortId, isCanary: bool} as Dictionary.
      If no cohort → returns stable (latest promoted) version.

  PromoteCohortAsync(cohortId: string, promotionTarget: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Promotes canary version to wider audience or to stable. promotionTarget: [expand | stable | rollback].
      Emits canary.promoted audit event via F250.

  GetRolloutStatusAsync(cohortId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns rollout status: {cohortId, percentage, errorRate, p95Latency, decision: "proceed"|"rollback"}.

FACTORY CREATION:
  var canary = await _factory.CreateAsync<ITenantCanaryDeploymentService>(
      new FactoryResolutionContext
      {
          TenantId = "platform",   // Canary management is platform-wide
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["cohortIndex"] = "xiigen-canary-cohorts" }
      });

DISTINCT FROM: F271 handles CONFIG promotion (dev→staging→prod). F265 handles FLOW VERSION canary (% rollout).
  NEW factory — no P1 equivalent. FIRST TIME capability in XIIGen.

DNA COMPLIANCE:
  DNA-1 ✅  Cohort configs and rollout status as Dictionary<string,object>. No ICohort model.
  DNA-2 ✅  ResolveTenantCohortAsync: BuildSearchFilter on (tenantId, flowDefinitionName).
  DNA-3 ✅  ResolveTenantCohortAsync returns DataProcessResult — no cohort = returns stable version, not exception.
  DNA-4 ✅  TenantCanaryDeploymentService extends MicroserviceBase.
  DNA-5 ✅  Tenant cohort assignment scoped per tenantId. Platform operations use "platform" scope.
  DNA-6 ✅  DynamicController at /api/canary.
  DNA-7 ✅  traceparent carried on cohort operations. Canary FlowRuns tagged with cohortId in trace.
  DNA-8 ✅  PromoteCohortAsync via outbox (cohort state + promotion event atomic).

MACHINE (fixed):
  Canary cohort maximum: 20% of tenants on initial deploy (cannot start at 100%)
  Rollback is ALWAYS available — no canary promotion is irreversible until stable
  Error rate threshold: canary auto-rolls back if error rate > 5× baseline
  F262 metrics feed canary decision (p95 latency + error rate comparison)

FREEDOM (config):
  maxCanaryPercentage (default 20%, configurable per deployment)
  autoRollbackErrorRateMultiplier (default 5.0)
  cohortEvaluationIntervalSeconds (default 300)
  canaryDurationMinutes (minimum canary bake time before promotion; default 60)
```

---

## F266 — IComplianceLabelEnforcementService

```
FACTORY: F266
NAME: IComplianceLabelEnforcementService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-compliance-rules (constraint matrix: label combinations → allowed/blocked config)
INTERFACE METHODS:
  EvaluateConstraintsAsync(tenantId: string, proposedConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Evaluates proposed config changes against compliance constraint matrix.
      Returns {allowed: bool, violations: [{rule, reason, severity}]} as Dictionary.
      Example constraint: pci + shared_schema → BLOCKED.

  GetConstraintMatrixAsync()
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns full constraint matrix as Dictionary. Used by UI to show allowed combinations.

  RegisterConstraintAsync(constraintPayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Platform admin only: adds a new constraint rule to the matrix. Emits audit event.

  ValidateOnboardingAsync(tenantId: string, tenantConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Full compliance validation for a new tenant config during F248 onboarding.
      Returns {passed: bool, gatedSteps: [...], blockedCapabilities: [...]} as Dictionary.

  EvaluateGraduationConstraintsAsync(tenantId: string, sourceMode: string, targetMode: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Validates that proposed isolation graduation doesn't violate compliance labels.
      Called by F249 before executing graduation plan.

FACTORY CREATION:
  var complianceGate = await _factory.CreateAsync<IComplianceLabelEnforcementService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["constraintIndex"] = "xiigen-compliance-rules" }
      });

DISTINCT FROM: F254 handles AUTHORIZATION policies (who can do what). F266 handles COMPLIANCE constraints (what combinations are allowed).
  Adapted from v1's F266 with graduation constraint method added.

DNA COMPLIANCE:
  DNA-1 ✅  Constraint rules and violations as Dictionary<string,object>. No IConstraintRule model.
  DNA-2 ✅  EvaluateConstraintsAsync: BuildSearchFilter on labels in proposedConfig.
  DNA-3 ✅  EvaluateConstraintsAsync returns DataProcessResult with violations list — never throws.
  DNA-4 ✅  ComplianceLabelEnforcementService extends MicroserviceBase.
  DNA-5 ✅  Per-tenant evaluation uses tenantId to load current labels for comparison.
  DNA-6 ✅  DynamicController at /api/compliance/gates.
  DNA-7 ✅  Compliance evaluation decisions carry traceparent for audit trail correlation.
  DNA-8 ✅  RegisterConstraintAsync via outbox (constraint write + audit event atomic).

MACHINE (fixed):
  Constraint matrix is READ-ONLY at runtime — changes require platform admin + audit
  pci + shared_schema → ALWAYS BLOCKED (hardcoded in engine — defense-in-depth)
  CMK label requires kmsProvider to be set — missing = BLOCKED
  data_residency_eu requires region = eu-* pattern — non-EU region = BLOCKED

FREEDOM (config):
  constraintMatrixVersion (staged rollout of new constraint rules)
  customConstraints (tenant-specific additional constraints by enterprise agreement)
  violationSeverities [BLOCKED | WARNING | INFO] per constraint rule
```

---

## F267 — ITenantDataExportService

```
FACTORY: F267
NAME: ITenantDataExportService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-gdpr-lifecycle → Consumed → Archive → DLQ
  SECONDARY → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-gdpr-requests (retention + deletion + export request tracking)
  TERTIARY  → DATABASE FABRIC (Skill 05) → PostgreSQL provider
              Reads tenant data from PG tables for export/deletion (scoped by tenantId).
INTERFACE METHODS:
  RequestDeletionAsync(tenantId: string, subjectId: string, reason: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates GDPR deletion request (Right to Erasure). Enqueues to Redis Stream.
      Returns {requestId, status: "queued", estimatedCompletionTime} as Dictionary.
      Emits gdpr.deletion-requested audit event via F250.

  GetDeletionStatusAsync(tenantId: string, requestId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns status: {requestId, status, progressPercent, flowsCascaded: [...]}

  RequestExportAsync(tenantId: string, subjectId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Triggers data export for a subject (Right of Access).
      Returns {exportId, status, downloadUrlRef}.

  ApplyRetentionPolicyAsync(tenantId: string, policyPayload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Applies retention rules: age-based purge of workflow history, audit log trimming.
      Runs as SCHEDULED task (EP-2 Durable Timer triggers this).

  GetDataInventoryAsync(tenantId: string, subjectId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns complete inventory of data held for a subject across all flows.
      Scans FLOW-01 through FLOW-08 indices for subject's tenantId-scoped data.

FACTORY CREATION:
  var dataExport = await _factory.CreateAsync<ITenantDataExportService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string> { ["streamName"] = "xiigen-gdpr-lifecycle" }
      });

DISTINCT FROM: F264 handles BACKUP/RESTORE (disaster recovery). F267 handles GDPR DATA LIFECYCLE (export, deletion, retention).
  Adapted from v1's F264 (GDPR retention) with data inventory method added.

DNA COMPLIANCE:
  DNA-1 ✅  All requests and inventories as Dictionary<string,object>. No IGdprRequest model.
  DNA-2 ✅  ApplyRetentionPolicyAsync: BuildSearchFilter on policyPayload.
  DNA-3 ✅  RequestDeletionAsync returns DataProcessResult — subject not found = Failure(SUBJECT_NOT_FOUND), not exception.
  DNA-4 ✅  TenantDataExportService extends MicroserviceBase.
  DNA-5 ✅  tenantId on all GDPR queries. Deletion cascades are tenant-scoped.
  DNA-6 ✅  DynamicController at /api/gdpr.
  DNA-7 ✅  GDPR operations carry traceparent for audit trail across deletion cascade.
  DNA-8 ✅  RequestDeletionAsync via outbox (request record + lifecycle event atomic).

MACHINE (fixed):
  Deletion cascades to FLOW-01 through FLOW-08 data
  Audit log entries retained for legal hold minimum even after data deletion
  Export downloadUrlRef expires after 24h — no persistent links
  GetDataInventoryAsync scans ALL indices — never misses data stores

FREEDOM (config):
  retentionDaysByDataClass (workflow_history: 90, audit_log: 365 for PCI)
  deletionCascadeTargets list (which data stores included)
  exportFormatType [json | csv | parquet]
  deletionSlaHours (GDPR default 720h = 30 days)
```

---

## F268 — ITenantScopedFlowRunnerService

```
FACTORY: F268
NAME: ITenantScopedFlowRunnerService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → FLOW ENGINE FABRIC (Skills 08/09 — IFlowDefinition + IFlowOrchestrator)
              Wraps FlowOrchestrator with tenant context injection at every step.
  SECONDARY → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-flow-run-events (per-tenant flow execution lifecycle events)
INTERFACE METHODS:
  StartFlowRunAsync(tenantId: string, flowDefinitionName: string, input: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Starts a FlowRun with full tenant context:
      1. Resolves tenant config via F245.
      2. Resolves isolation binding via F246.
      3. Checks entitlement quota via F251.
      4. Checks rate limit via F261.
      5. Resolves canary cohort version via F265.
      6. Delegates to FlowOrchestrator with enriched context.
      Returns {flowRunId, version, tenantId, status: "started"} as Dictionary.

  GetFlowRunStatusAsync(tenantId: string, flowRunId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns flow run progress scoped to tenant.

  CancelFlowRunAsync(tenantId: string, flowRunId: string, reason: string)
      → Task<DataProcessResult<bool>>
      Cancels in-progress flow run. Emits cancellation event.

  ListFlowRunsAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Filtered list of flow runs for a tenant. BuildSearchFilter applied.

  ReplayFlowRunAsync(tenantId: string, flowRunId: string, fromStep: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Replays a failed flow run from a specific step. Uses same tenant context as original.

FACTORY CREATION:
  var flowRunner = await _factory.CreateAsync<ITenantScopedFlowRunnerService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "flow-orchestrator",
          Metadata  = new Dictionary<string,string>
          {
              ["flowRunStream"] = "xiigen-flow-run-events"
          }
      });

DISTINCT FROM: Skill 09 FlowOrchestrator is the RAW engine. F268 is the TENANT-AWARE wrapper
  that injects config, isolation, quotas, rate limits, and canary before delegating to Skill 09.
  NEW factory — implements D9 (tenant-scoped flow execution).

DNA COMPLIANCE:
  DNA-1 ✅  Flow run state and results as Dictionary<string,object>. No IFlowRun model.
  DNA-2 ✅  ListFlowRunsAsync: BuildSearchFilter on filter (status, dateRange, flowName).
  DNA-3 ✅  StartFlowRunAsync returns DataProcessResult — quota exceeded = Failure(QUOTA_EXCEEDED), not exception.
  DNA-4 ✅  TenantScopedFlowRunnerService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every flow run operation. FlowRuns are always tenant-scoped.
  DNA-6 ✅  DynamicController at /api/flows/runs.
  DNA-7 ✅  traceparent created at StartFlowRunAsync and propagated through all flow steps.
  DNA-8 ✅  StartFlowRunAsync via outbox (flow run record + flow-started event atomic).

MACHINE (fixed):
  StartFlowRunAsync MUST check F251 entitlement + F261 rate limit BEFORE executing
  Canary version resolution (F265) runs BEFORE flow start — version locked for entire run
  TenantContext is IMMUTABLE once flow starts — no mid-run context changes
  CancelFlowRunAsync emits compensation events for completed steps

FREEDOM (config):
  maxConcurrentFlowRunsPerTenant (from F251 entitlement)
  flowRunTimeoutMs (default 300000 = 5 minutes; configurable per flow definition)
  replayEnabled per flow definition (default true)
  flowRunRetentionDays (how long completed flow run records kept; default 30)
```

---

## F269 — ITenantWebhookRegistryService

```
FACTORY: F269
NAME: ITenantWebhookRegistryService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-webhook-registrations (per-tenant outbound webhook endpoints)
  SECONDARY → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-webhook-delivery (outbound webhook delivery attempts)
INTERFACE METHODS:
  RegisterWebhookAsync(tenantId: string, webhookConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Registers an outbound webhook endpoint for a tenant.
      webhookConfig: {url, events: ["flow.completed", "payment.captured", ...], secret, headers}
      Returns {webhookId, status: "active"} as Dictionary.

  DeregisterWebhookAsync(tenantId: string, webhookId: string)
      → Task<DataProcessResult<bool>>
      Removes webhook registration. Emits audit event via F250.

  DeliverWebhookAsync(tenantId: string, webhookId: string, payload: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Delivers payload to registered webhook endpoint. Signs payload with tenant's webhook secret.
      Retries on failure (exponential backoff). Returns {deliveryId, status, responseCode}.

  ListWebhooksAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Lists registered webhooks. BuildSearchFilter applied.

  GetDeliveryHistoryAsync(tenantId: string, webhookId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Returns delivery attempts for a webhook. BuildSearchFilter on status, dateRange.

FACTORY CREATION:
  var webhookRegistry = await _factory.CreateAsync<ITenantWebhookRegistryService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string>
          {
              ["registryIndex"] = "xiigen-webhook-registrations",
              ["deliveryStream"] = "xiigen-webhook-delivery"
          }
      });

DISTINCT FROM: F257 handles INBOUND webhook ingestion (PSP → us). F269 handles OUTBOUND webhook delivery (us → tenant endpoints).
  NEW factory — no P1 equivalent.

DNA COMPLIANCE:
  DNA-1 ✅  Webhook configs and delivery records as Dictionary<string,object>. No IWebhookRegistration model.
  DNA-2 ✅  ListWebhooksAsync + GetDeliveryHistoryAsync: BuildSearchFilter on filter.
  DNA-3 ✅  DeliverWebhookAsync returns DataProcessResult — delivery failure = Failure(WEBHOOK_DELIVERY_FAILED) with responseCode.
  DNA-4 ✅  TenantWebhookRegistryService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every ES query. Webhook registrations namespaced per tenant.
  DNA-6 ✅  DynamicController at /api/webhooks.
  DNA-7 ✅  traceparent carried on webhook delivery for correlation with triggering event.
  DNA-8 ✅  DeliverWebhookAsync via outbox (delivery record + delivery attempt event atomic).

MACHINE (fixed):
  Webhook secrets NEVER logged or stored in plaintext — HMAC signing only
  Delivery retries: max 5 attempts with exponential backoff (1s, 2s, 4s, 8s, 16s)
  Failed webhooks after max retries → DLQ + alert via F270

FREEDOM (config):
  maxWebhooksPerTenant (default 10, configurable by tier)
  deliveryTimeoutMs (default 10000)
  maxRetryAttempts (default 5)
  signatureAlgorithm [hmac_sha256 | hmac_sha512]
  allowedEventTypes per tenant (which events trigger webhook delivery)
```

---

## F270 — ITenantNotificationRouterService

```
FACTORY: F270
NAME: ITenantNotificationRouterService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → QUEUE FABRIC (Skill 04) → Redis Streams
              Stream: xiigen-notifications-main → Consumed → Archive → DLQ
INTERFACE METHODS:
  RouteNotificationAsync(tenantId: string, notification: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Routes notification to appropriate channel based on tenant config + notification type.
      Channels: [webhook (F269), email, in-app, slack, teams]
      notification: {type, severity, title, body, metadata}
      Returns {notificationId, channels: [...], status} as Dictionary.

  GetNotificationPreferencesAsync(tenantId: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Returns tenant's notification routing preferences: which types go to which channels.

  UpdatePreferencesAsync(tenantId: string, preferences: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Updates notification routing preferences. BuildSearchFilter on preference fields.

  GetNotificationHistoryAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Returns notification delivery history. BuildSearchFilter applied.

FACTORY CREATION:
  var notificationRouter = await _factory.CreateAsync<ITenantNotificationRouterService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "redis-streams",
          Metadata  = new Dictionary<string,string> { ["streamName"] = "xiigen-notifications-main" }
      });

DISTINCT FROM: F269 handles WEBHOOK delivery (one channel). F270 handles NOTIFICATION ROUTING (multi-channel dispatch).
  NEW factory — no P1 equivalent.

DNA COMPLIANCE:
  DNA-1 ✅  Notifications and preferences as Dictionary<string,object>. No INotification model.
  DNA-2 ✅  UpdatePreferencesAsync + GetNotificationHistoryAsync: BuildSearchFilter applied.
  DNA-3 ✅  RouteNotificationAsync returns DataProcessResult — channel unavailable = partial success with failedChannels list.
  DNA-4 ✅  TenantNotificationRouterService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every notification + every preference query.
  DNA-6 ✅  DynamicController at /api/notifications.
  DNA-7 ✅  traceparent carried on notification dispatch for correlation with triggering event.
  DNA-8 ✅  RouteNotificationAsync via outbox (notification record + dispatch events atomic).

MACHINE (fixed):
  SLA breach notifications (from F262) are ALWAYS routed — cannot be suppressed by preferences
  Security notifications (auth failure, key revocation) are ALWAYS routed
  Notification NEVER contains sensitive data (PII, payment info) — only references

FREEDOM (config):
  notificationChannels per tenant [webhook | email | in_app | slack | teams]
  routingRulesByType (e.g., sla.breach → [webhook, email], flow.completed → [in_app])
  quietHoursEnabled (suppress non-critical during configured hours)
  maxNotificationsPerHour (rate limit on notifications; default 100)
```

---

## F271 — ITenantConfigPromotionService

```
FACTORY: F271
NAME: ITenantConfigPromotionService
FAMILY: 29 — Tenant-Aware Operations
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (Skill 05) → Elasticsearch provider
              Index: xiigen-config-promotion (promotion pipeline state: dev → staging → production)
INTERFACE METHODS:
  CreatePromotionPipelineAsync(tenantId: string, pipelineConfig: Dictionary<string,object>)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Creates a config promotion pipeline for a tenant.
      pipelineConfig: {stages: ["dev", "staging", "production"], approvalRequired: {staging: false, production: true}}
      Returns {pipelineId, status: "created"} as Dictionary.

  PromoteConfigAsync(tenantId: string, sourceStage: string, targetStage: string, configVersion: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Promotes a tenant config version from one stage to the next.
      Validates via F266 compliance gate before promotion.
      If approvalRequired for target stage → returns {status: "pending_approval"}.
      Otherwise → applies config to target stage immediately.

  ApprovePromotionAsync(tenantId: string, promotionId: string, approver: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Approves a pending promotion. Emits config.promoted audit event via F250.

  GetPromotionHistoryAsync(tenantId: string, filter: Dictionary<string,object>)
      → Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>>
      Returns promotion pipeline history. BuildSearchFilter applied.

  RollbackPromotionAsync(tenantId: string, stage: string, targetVersion: string)
      → Task<DataProcessResult<Dictionary<string,object>>>
      Rolls back a stage to a previous config version. Delegates to F245.RollbackConfigAsync.

FACTORY CREATION:
  var configPromotion = await _factory.CreateAsync<ITenantConfigPromotionService>(
      new FactoryResolutionContext
      {
          TenantId = flowRun.TenantContext.TenantId,
          Provider  = "elasticsearch",
          Metadata  = new Dictionary<string,string> { ["promotionIndex"] = "xiigen-config-promotion" }
      });

DISTINCT FROM: F245 manages CONFIG CRUD. F271 manages CONFIG PROMOTION PIPELINE (staged rollout across environments).
  NEW factory — implements D10 (config promotion lifecycle).

DNA COMPLIANCE:
  DNA-1 ✅  Pipeline configs and promotion records as Dictionary<string,object>. No IPromotionPipeline model.
  DNA-2 ✅  GetPromotionHistoryAsync: BuildSearchFilter on filter (stage, dateRange, status).
  DNA-3 ✅  PromoteConfigAsync returns DataProcessResult — compliance violation = Failure(PROMOTION_BLOCKED), not exception.
  DNA-4 ✅  TenantConfigPromotionService extends MicroserviceBase.
  DNA-5 ✅  tenantId on every promotion operation. Pipelines are tenant-scoped.
  DNA-6 ✅  DynamicController at /api/config/promotion.
  DNA-7 ✅  traceparent carried on promotion operations for end-to-end audit trail.
  DNA-8 ✅  PromoteConfigAsync via outbox (promotion record + config.promoted event atomic).

MACHINE (fixed):
  Production promotion ALWAYS requires compliance gate check (F266) — no bypass
  Promotion is ALWAYS forward-only through stages (dev→staging→production, never dev→production)
  RollbackPromotionAsync available at any stage (but rollback itself is audited)
  Config version promoted to production becomes the new "latest" for F245.LoadConfigAsync

FREEDOM (config):
  pipelineStages list per tenant (default: ["dev", "staging", "production"])
  approvalRequiredByStage (e.g., {dev: false, staging: false, production: true})
  autoPromotionEnabled (default false — enterprise tenants can enable dev→staging auto-promote)
  promotionCooldownMinutes (minimum time between promotions; default 30)
```

---

## Family 29 Summary Table

| Factory | Name | Methods | Primary Fabric | Secondary Fabric |
|---------|------|---------|---------------|-----------------|
| F260 | IIdempotencyKeyService | 4 | DATABASE (PG) | — |
| F261 | ITenantRateLimitingService | 4 | DATABASE (Redis) | — |
| F262 | ITenantMetricsService | 4 | DATABASE (ES) | CORE (OTel) |
| F263 | ITenantBillingMeteringService | 4 | QUEUE (Redis Streams) | DATABASE (ES) |
| F264 | ITenantBackupRestoreService | 5 | DATABASE (PG+ES) | QUEUE (Redis Streams) |
| F265 | ITenantCanaryDeploymentService | 5 | DATABASE (ES) | FLOW ENGINE |
| F266 | IComplianceLabelEnforcementService | 5 | DATABASE (ES) | — |
| F267 | ITenantDataExportService | 5 | QUEUE (Redis Streams) | DATABASE (ES+PG) |
| F268 | ITenantScopedFlowRunnerService | 5 | FLOW ENGINE | QUEUE (Redis Streams) |
| F269 | ITenantWebhookRegistryService | 5 | DATABASE (ES) | QUEUE (Redis Streams) |
| F270 | ITenantNotificationRouterService | 4 | QUEUE (Redis Streams) | — |
| F271 | ITenantConfigPromotionService | 5 | DATABASE (ES) | — |
| **TOTAL** | | **55** | | |

## DNA-8 Applicability (Family 29)

| Factory | DNA-8 Applicable | Outbox Pattern |
|---------|-----------------|----------------|
| F260 | ✅ | StoreResponseAsync within caller's transaction scope |
| F261 | ✅ | ResetQuotaAsync + audit event atomic |
| F262 | ✅ | AlertOnThresholdAsync + notification dispatch atomic |
| F263 | ✅ | EmitUsageEventAsync within DB transaction scope |
| F264 | ✅ | CreateBackupAsync + backup-started event atomic |
| F265 | ✅ | PromoteCohortAsync + promotion event atomic |
| F266 | ✅ | RegisterConstraintAsync + audit event atomic |
| F267 | ✅ | RequestDeletionAsync + lifecycle event atomic |
| F268 | ✅ | StartFlowRunAsync + flow-started event atomic |
| F269 | ✅ | DeliverWebhookAsync + delivery record atomic |
| F270 | ✅ | RouteNotificationAsync + dispatch events atomic |
| F271 | ✅ | PromoteConfigAsync + promotion event atomic |

**DNA-8 compliance: 12/12 applicable, all PASS ✅**

## Design Records (Family 29)

### DR-25 — Cross-Cutting Idempotency (Generalized from Payment-Only)

```
DECISION: Generalize F260 IIdempotencyKeyService beyond payments to serve ALL operations
          requiring exactly-once semantics: webhooks, SCIM events, flow starts, notifications.

CONTEXT: v1's F255 was payment-specific (IPaymentIdempotencyStore). FLOW-08 has multiple
         operations needing idempotency: webhook ingestion (F257), SCIM events (F252),
         flow run starts (F268), notification delivery (F270).

RESOLUTION: F260 is generic with operationType dimension in the key. TTL configurable per
            operation type. All services that need idempotency use F260 via CreateAsync().

JUSTIFICATION: Single idempotency infrastructure. Uniform TTL management. Consistent dedup
               pattern across all operations. One cleanup job instead of N.
```

### DR-26 — Tenant-Scoped Flow Runner (D9 Implementation)

```
DECISION: F268 wraps Skill 09 FlowOrchestrator with tenant context injection, providing
          a single entry point that resolves config, isolation, quotas, rate limits, and
          canary version BEFORE delegating to the raw orchestrator.

CONTEXT: Skill 09 FlowOrchestrator is tenant-agnostic. FLOW-08 requires every flow execution
         to be tenant-scoped: correct DB binding, correct entitlement check, correct canary version.

RESOLUTION: F268 acts as the tenant-aware facade. Its StartFlowRunAsync chains:
            F245 (config) → F246 (isolation) → F251 (entitlement) → F261 (rate limit) →
            F265 (canary) → Skill 09 (execute). This chain runs ONCE at start, not per-step.

JUSTIFICATION: Centralizes tenant context resolution. Eliminates per-step duplication.
               Guarantees context immutability during FlowRun. Single audit point for flow starts.
```

---

## SAVE POINT: MERGE:P1c ✅
## Phase 1c COMPLETE: Family 29 (F260-F271), 12 factories, 55 methods, DR-25+DR-26, 96/96 DNA
## Running total: 28 factories (F244-F271), 135 methods, 224/224 DNA, DR-21-DR-26
## Next: Phase 2a — Task Type Contracts T83-T87
## Recovery: "Continue FLOW-08 from merge P1c" or "Continue FLOW-08 from Phase 2a"

---

## Integration Changelog

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-06 Marketplace Publishing merge | F225-F233 (+9) | T72-T76 (+5) | CF-42-CF-51 (+10) | Family 25, Template 16, DNA-8, EP-1/2/3 |
| 2026-02-26 | FLOW-07 Friend Request & Feed Integration merge | F234-F243 (+10) | T77-T82 (+6) | CF-52-CF-63 (+12) | Family 26, Template 17, DR-17-DR-20 |
| 2026-02-26 | FLOW-08 Multi-Tenant P1a merge | F244-F251 (+8) | — | — | Family 27, DR-21-DR-22, 64/64 DNA |
| 2026-02-26 | FLOW-08 Multi-Tenant P1b merge | F252-F259 (+8) | — | — | Family 28, DR-23-DR-24, 64/64 DNA |
| 2026-02-26 | FLOW-08 Multi-Tenant P1c merge | F260-F271 (+12) | — | — | Family 29, DR-25-DR-26, 96/96 DNA |

---

## System State Update (Post Family 29 / FLOW-08 Phase 1 Complete)

| Metric | Pre-FLOW-08 | Post-Phase 1 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F243 | F1-F271 | +28 |
| Factory families | 26 | 29 | +3 |
| Methods | ~670 | ~805 | +135 |
| DNA patterns | 8 | 8 | +0 (reuse DNA-1-DNA-8) |
| DNA compliance | 604/604 | 828/828 | +224 (8×28 factories) |
| Design records | DR-1-DR-20 | DR-1-DR-26 | +6 |

```
FACTORIES (continuous):
  F1-F224  [through Family 24]
  F225-F233 [FLOW-06 Marketplace, Family 25]
  F234-F243 [FLOW-07 Friend Request & Feed, Family 26]
  F244-F251 [FLOW-08 Tenant Control Plane, Family 27]
  F252-F259 [FLOW-08 Provider Adapters, Family 28]
  F260-F271 [FLOW-08 Tenant-Aware Operations, Family 29] <- NEW
  Next: T83 (Phase 2 — Task Type Contracts)
```

---

## MERGE:P1_COMPLETE STATE SAVE
```
MERGE:P1_COMPLETE = ALL 3 FAMILIES MERGED
Target: ENGINE_ARCHITECTURE_MERGED.md
Phase 1a: Family 27 (F244-F251), 8 factories, 45 methods, DR-21-DR-22
Phase 1b: Family 28 (F252-F259), 8 factories, 35 methods, DR-23-DR-24
Phase 1c: Family 29 (F260-F271), 12 factories, 55 methods, DR-25-DR-26
TOTAL: 28 factories, 135 methods, 6 design records
DNA compliance: 224/224 (8 patterns × 28 factories) ✅
System: 29 families, F1-F271, DNA-1-DNA-8, EP-1-EP-3, DR-1-DR-26
FLOW-08 COMPLETE: Factories merged. Tasks in TASK_TYPES_CATALOG_MERGED.
Status: VALIDATED (105/105 checks PASS)
```

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-09: EVENT PARTICIPATION & SOCIAL INTEGRATION
# Families 30-31, Factories F272-F287
# Engine Primitives: EP-4 (Saga Compensation), EP-5 (Dedup Store)
# DNA Pattern: DNA-9 (Compensation Chain)
# Date: 2026-02-26 | Save Point: MERGE:P1
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## FAMILY 30: TRANSACTIONAL PARTICIPATION (F272-F279)

Family 30 covers the critical ACID path: reservation → payment → ticket → capacity.
All factories resolve through existing fabrics. No direct provider imports.

---

### F272 — IReservationHoldService

```
FACTORY: F272
INTERFACE: IReservationHoldService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis provider (holds) + PostgreSQL provider (persistence)

PURPOSE: Reserve a spot with configurable TTL (FREEDOM: default 5 min).
         Redis key = reservation:{tenantId}:{eventId}:{userId} with TTL.
         DB record tracks reservation state machine: ACTIVE → COMPLETED | EXPIRED | CANCELLED.

METHODS:
  CheckAvailabilityAsync(eventId, tenantId) → DataProcessResult<AvailabilityStatus>
    FABRIC: DATABASE FABRIC → PostgreSQL (read events table with BuildSearchFilter)
    Checks: event exists, status=active, date not passed, capacity_available > 0

  ReserveSpotAsync(eventId, userId, tenantId) → DataProcessResult<ReservationToken>
    FABRIC: DATABASE FABRIC → Redis (SET with TTL) + PostgreSQL (INSERT reservation)
    Atomic: Redis SET NX + DB INSERT in outbox transaction
    Returns: reservationId + token + expiresAt

  ValidateReservationAsync(reservationId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → Redis (EXISTS) + PostgreSQL (read status)
    Returns: true if ACTIVE and not expired

  ReleaseReservationAsync(reservationId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → Redis (DEL) + PostgreSQL (UPDATE status=CANCELLED)
    Idempotent: releasing an already-released reservation is a no-op

  ExpireReservationsAsync(tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → Redis (SCAN expired) + PostgreSQL (batch UPDATE)
    Scheduled: runs every 30s (FREEDOM configurable)

DNA COMPLIANCE:
  DNA-1: ✅ Dictionary<string,object> for reservation docs (no ReservationModel class)
  DNA-2: ✅ BuildSearchFilter skips null eventId/userId
  DNA-3: ✅ All methods return DataProcessResult<T>
  DNA-4: ✅ Inherits MicroserviceBase (19 components)
  DNA-5: ✅ tenantId on every query
  DNA-6: ✅ DynamicController exposes REST endpoints
  DNA-9: ✅ ReleaseReservationAsync is a compensation step in EP-4

MACHINE: Reservation state machine (ACTIVE → COMPLETED | EXPIRED | CANCELLED)
FREEDOM: TTL duration (default 5 min), expiry check interval (default 30s)
```

### F273 — IPaymentGatewayService

```
FACTORY: F273
INTERFACE: IPaymentGatewayService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams (events)
                   + External gateway via FLOW-08 F252 IPaymentProviderAdapter

PURPOSE: Manage Stripe PaymentIntent lifecycle. Never imports Stripe SDK directly —
         resolves through FLOW-08 F252 which wraps Stripe/PayPal/etc.
         Webhook signature verification mandatory. Dedup via EP-5.

METHODS:
  CreatePaymentIntentAsync(reservationId, amount, currency, tenantId) → DataProcessResult<PaymentIntentRef>
    FABRIC: FLOW-08 F252 → Stripe provider (via CreateAsync())
    Validates: reservation still ACTIVE (calls F272.ValidateReservationAsync)
    Sets idempotency key: hash(tenantId + reservationId + amount)
    Returns: clientSecret + paymentIntentId

  HandleWebhookAsync(payload, signature, tenantId) → DataProcessResult<WebhookResult>
    FABRIC: FLOW-08 F252 → Stripe provider (signature verification)
    Step 1: Verify HMAC signature (reject if invalid → HTTP 400)
    Step 2: EP-5 dedup check (stripe_event_id)
    Step 3: If new → process, emit PaymentCompleted or PaymentFailed
    Step 4: If duplicate → return HTTP 200, no event emitted
    QUEUE FABRIC: emits PaymentCompleted/PaymentFailed to Redis Streams

  CancelPaymentIntentAsync(paymentIntentId, tenantId) → DataProcessResult<bool>
    FABRIC: FLOW-08 F252 → Stripe provider
    EP-4 compensation step: cancels intent, refunds if already charged

  RefundPaymentAsync(paymentId, amount, tenantId) → DataProcessResult<RefundRef>
    FABRIC: FLOW-08 F252 → Stripe provider
    Idempotent: refunding already-refunded payment is a no-op

DNA COMPLIANCE:
  DNA-1: ✅ Dictionary<string,object> for payment docs
  DNA-2: ✅ BuildSearchFilter for payment queries
  DNA-3: ✅ DataProcessResult<T> for all returns
  DNA-4: ✅ MicroserviceBase inherited
  DNA-5: ✅ tenantId on every call + Stripe key resolved per tenant (CF-90)
  DNA-6: ✅ DynamicController for webhook endpoint
  DNA-9: ✅ CancelPaymentIntentAsync + RefundPaymentAsync are EP-4 compensation steps

MACHINE: Webhook signature verification, idempotency key formula
FREEDOM: Payment provider (Stripe/PayPal via F252), currency list, refund policy
```

### F274 — ITicketingService

```
FACTORY: F274
INTERFACE: ITicketingService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (tickets)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: Generate tickets with encrypted QR codes. Dedup via EP-5.
         Sequence-based ticket numbers (no gaps on dedup).
         Ticket state machine: ISSUED → SCANNED → USED | CANCELLED.

METHODS:
  IssueTicketAsync(eventId, userId, paymentId, tenantId) → DataProcessResult<TicketRef>
    FABRIC: DATABASE FABRIC → PostgreSQL (INSERT ticket + sequence)
    EP-5 dedup: hash(eventId + paymentId + "ticket-issuance")
    If free event: dedup key uses reservationId instead of paymentId
    QR payload: AES-256-GCM encrypted (eventId|ticketId|tenantId|issuedAt)
    Key from KMS (FREEDOM: per-event vs per-tenant keys)
    Emits: TicketIssued to QUEUE FABRIC

  ValidateTicketAsync(ticketId, qrPayload, tenantId) → DataProcessResult<ValidationResult>
    FABRIC: DATABASE FABRIC → PostgreSQL (read ticket + decrypt QR)
    Checks: ticket exists, status=ISSUED, event date matches, tenant matches
    Returns: validation result with participant details

  ScanTicketAsync(ticketId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE status=SCANNED)
    Idempotent: scanning already-scanned ticket returns success

  CancelTicketAsync(ticketId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE status=CANCELLED)
    EP-4 compensation step: part of saga rollback

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: QR encryption algorithm (AES-256-GCM), ticket state machine
FREEDOM: QR key rotation interval, ticket number format, encryption key scope
```

### F275 — ICalendarIntegrationService

```
FACTORY: F275
INTERFACE: ICalendarIntegrationService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (calendar entries)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: Create calendar entries for events. Supports Google Calendar OAuth,
         Apple EventKit ICS, and generic ICS download. Provider resolved via config.
         Cross-flow overlap check with FLOW-06 F225 (CF-95).

METHODS:
  CreateCalendarEntryAsync(eventId, userId, eventDetails, tenantId) → DataProcessResult<CalendarEntryRef>
    FABRIC: DATABASE FABRIC → PostgreSQL (INSERT)
    Cross-flow: reads FLOW-06 F225 for overlap check (CF-95)
    If overlap + lenient mode → create with conflict_flag=true
    If overlap + strict mode → return 409 with overlap details
    Emits: EventAddedToCalendar to QUEUE FABRIC

  LinkExternalCalendarAsync(userId, provider, authToken, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (store calendar link)
    Providers: google_calendar, apple_eventkit, ics_download (FREEDOM)

  RemoveCalendarEntryAsync(calendarEntryId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (soft delete)
    EP-4 compensation step

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: Calendar entry schema, overlap detection logic
FREEDOM: Calendar provider, overlap conflict mode (strict/lenient), ICS template
```

### F276 — IReminderScheduleService

```
FACTORY: F276
INTERFACE: IReminderScheduleService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (sorted sets) + PostgreSQL (durable record)

PURPOSE: Schedule and dispatch reminders using Redis sorted sets (score = epoch timestamp).
         Catch-up job (EP-2 timer) processes overdue reminders on restart.
         Milestone schedule: T-7d, T-1d, T-1h, T-15m (FREEDOM configurable).

METHODS:
  ScheduleRemindersAsync(eventId, userId, eventStartUtc, timezone, tenantId) → DataProcessResult<ScheduleRef>
    FABRIC: DATABASE FABRIC → Redis (ZADD to sorted set) + PostgreSQL (INSERT schedule record)
    Computes reminder times using user timezone + milestone offsets
    Emits: RemindersScheduled to QUEUE FABRIC

  ProcessDueRemindersAsync(tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → Redis (ZRANGEBYSCORE -inf, now) + PostgreSQL (update status)
    Catch-up: if reminder >15min late, adjust messaging template
    Dedup: by reminder_schedule_id (no duplicates on catch-up)
    Returns: count of reminders dispatched

  RescheduleRemindersAsync(eventId, newStartUtc, tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → Redis (ZREM old + ZADD new) + PostgreSQL (UPDATE)
    For event time changes: recalculates all reminder times

  CancelRemindersAsync(eventId, userId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → Redis (ZREM) + PostgreSQL (UPDATE status=CANCELLED)
    EP-4 compensation step

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: Catch-up job algorithm, sorted set score formula (epoch seconds)
FREEDOM: Milestone offsets, catch-up interval (default 15min), late messaging templates
```

### F277 — ICapacityManagementService

```
FACTORY: F277
INTERFACE: ICapacityManagementService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (row locks)

PURPOSE: Atomic capacity management with PostgreSQL row-level locking.
         Enforces invariant: capacity_total = capacity_available + tickets_sold + capacity_reserved.
         EP-5 dedup prevents double-decrement from duplicate TicketIssued events.

METHODS:
  DecrementCapacityAsync(eventId, ticketId, tenantId) → DataProcessResult<CapacitySnapshot>
    FABRIC: DATABASE FABRIC → PostgreSQL (SELECT FOR UPDATE + UPDATE in transaction)
    EP-5 dedup: hash(eventId + ticketId + "capacity-decrement")
    If capacity_available = 0 → reject (offer waitlist)
    If dedup hit → return cached CapacityUpdated
    Emits: CapacityUpdated to QUEUE FABRIC

  RestoreCapacityAsync(eventId, ticketId, tenantId) → DataProcessResult<CapacitySnapshot>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE increment)
    EP-4 compensation step: restores 1 spot on cancellation/refund
    Idempotent: restoring already-restored is no-op

  GetCapacitySnapshotAsync(eventId, tenantId) → DataProcessResult<CapacitySnapshot>
    FABRIC: DATABASE FABRIC → PostgreSQL (read)
    Returns: total, available, reserved, sold, waitlist counts

  ReconcileCapacityAsync(eventId, tenantId) → DataProcessResult<ReconciliationReport>
    FABRIC: DATABASE FABRIC → PostgreSQL (count tickets + reservations vs counters)
    Detects drift: if counters don't match actual records, logs alert + auto-corrects

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: Row-lock strategy (SELECT FOR UPDATE), invariant formula
FREEDOM: Reconciliation schedule, auto-correct policy, waitlist threshold
```

### F278 — IWaitlistService

```
FACTORY: F278
INTERFACE: IWaitlistService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (waitlist)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: FIFO waitlist with automatic upgrade when spots open.
         On CapacityUpdated (increase): offer upgrade to next in line.
         Upgrade offer TTL (FREEDOM: default 10 min) before moving to next.

METHODS:
  JoinWaitlistAsync(eventId, userId, tenantId) → DataProcessResult<WaitlistPosition>
    FABRIC: DATABASE FABRIC → PostgreSQL (INSERT with position sequence)
    Returns: position number, estimated wait time

  OfferUpgradeAsync(eventId, tenantId) → DataProcessResult<UpgradeOffer>
    FABRIC: DATABASE FABRIC → PostgreSQL (SELECT next in line FOR UPDATE)
    Sets upgrade TTL (Redis key with expiry)
    Emits: UpgradeOffered to QUEUE FABRIC

  AcceptUpgradeAsync(upgradeOfferId, tenantId) → DataProcessResult<ReservationToken>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE waitlist status=UPGRADED)
    Creates new reservation via F272.ReserveSpotAsync
    Emits: UpgradeCompleted to QUEUE FABRIC

  LeaveWaitlistAsync(eventId, userId, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE status=LEFT)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: FIFO ordering, upgrade offer flow
FREEDOM: Upgrade offer TTL, max waitlist size, auto-upgrade policy
```

### F279 — ISagaCoordinatorService

```
FACTORY: F279
INTERFACE: ISagaCoordinatorService
FAMILY: 30 — TRANSACTIONAL PARTICIPATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (saga state)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (compensation events)

PURPOSE: Orchestrates the participation saga. Tracks step completion and
         triggers EP-4 compensation on failure. Uses optimistic locking
         to prevent concurrent compensation races (CF-91).

METHODS:
  StartSagaAsync(participationId, steps, tenantId) → DataProcessResult<SagaExecution>
    FABRIC: DATABASE FABRIC → PostgreSQL (INSERT saga record with step manifest)
    Steps registered: Reserve → Pay → Ticket → Capacity → Calendar → Remind

  CompleteStepAsync(sagaId, stepName, result, tenantId) → DataProcessResult<SagaStatus>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE step status)
    If all steps complete → saga status = COMPLETED
    If step failed → trigger compensation

  TriggerCompensationAsync(sagaId, failedStep, tenantId) → DataProcessResult<CompensationResult>
    FABRIC: DATABASE FABRIC → PostgreSQL (optimistic lock on saga status)
    EP-4: Execute LIFO compensation chain (reverse order from failed step)
    Each step idempotent (EP-5 dedup)
    CF-91: concurrent triggers → only first executes

  GetSagaStatusAsync(sagaId, tenantId) → DataProcessResult<SagaStatus>
    FABRIC: DATABASE FABRIC → PostgreSQL (read)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: LIFO compensation order, optimistic locking, step manifest schema
FREEDOM: Compensation retry policy, timeout per step, max compensation attempts
```

---

## FAMILY 31: SOCIAL INTEGRATION (F280-F287)

Family 31 covers participant discovery, connection scoring, feed integration,
weight evolution, and analytics. All O(n²) operations use bounded fan-out.

---

### F280 — IParticipantIdentificationService

```
FACTORY: F280
INTERFACE: IParticipantIdentificationService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (participants)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: Identify all participants for an event after successful registration.
         Triggers scoring pipeline. Respects privacy mode ("attend anonymously").

METHODS:
  IdentifyParticipantsAsync(eventId, tenantId) → DataProcessResult<ParticipantList>
    FABRIC: DATABASE FABRIC → PostgreSQL (query all confirmed participants)
    Filters: excludes anonymous participants from scoring pipeline
    Emits: ParticipantsIdentified to QUEUE FABRIC

  SetPrivacyModeAsync(eventId, userId, mode, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE participation record)
    Modes: visible | anonymous | connections_only (FREEDOM)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅

MACHINE: Privacy mode enforcement (anonymous excluded from scoring)
FREEDOM: Default privacy mode, visibility options per tenant
```

### F281 — IHistoryScoringService

```
FACTORY: F281
INTERFACE: IHistoryScoringService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (past events)

PURPOSE: Sub-component 1/4 of connection scoring (T97).
         Computes history_score based on co-attendance at past events.

METHODS:
  ComputeHistoryScoreAsync(userA, userB, tenantId) → DataProcessResult<SubScore>
    FABRIC: DATABASE FABRIC → PostgreSQL (count shared past events)
    Formula: min(shared_events / normalization_factor, 1.0)
    normalization_factor = FREEDOM config (default 10)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅
```

### F282 — IAudienceMatchScoringService

```
FACTORY: F282
INTERFACE: IAudienceMatchScoringService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL + MongoDB (profiles)

PURPOSE: Sub-component 2/4 of connection scoring (T97).
         Computes audience_score from business profile similarity.
         Cross-flow: reads FLOW-02 business profiles. If missing → 0.0 (CF-87).

METHODS:
  ComputeAudienceScoreAsync(userA, userB, tenantId) → DataProcessResult<SubScore>
    FABRIC: DATABASE FABRIC → MongoDB (read business profiles)
    CF-87: if either profile missing → return SubScore(0.0, partial=true)
    Formula: cosine_similarity(profileVectorA, profileVectorB)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅
```

### F283 — IGroupOverlapScoringService

```
FACTORY: F283
INTERFACE: IGroupOverlapScoringService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (group memberships)
                   RAG FABRIC (Skill 00b) → optional Neo4j for graph queries

PURPOSE: Sub-component 3/4 of connection scoring (T97).
         Computes group_overlap_score from shared group memberships.

METHODS:
  ComputeGroupOverlapScoreAsync(userA, userB, tenantId) → DataProcessResult<SubScore>
    FABRIC: DATABASE FABRIC → PostgreSQL (intersect group memberships)
    Optional: RAG FABRIC → Neo4j (graph shortest path between users via groups)
    Formula: |shared_groups| / max(|groupsA|, |groupsB|, 1)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅
```

### F284 — IFeedIntegrationService

```
FACTORY: F284
INTERFACE: IFeedIntegrationService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (feed positions)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: Inject participant posts into user feeds with diversity enforcement.
         Cross-flow: shares feed namespace with FLOW-07 F242 (CF-89).
         40% cap + 3-post spacing rule (FREEDOM configurable).

METHODS:
  InjectParticipantPostsAsync(userId, participantPosts, tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → Redis (ZADD feed positions)
    Tags each post with source_flow_id=FLOW-09
    Namespace: feed:{tenantId}:{userId}:{FLOW-09}

  EnforceDiversityCapsAsync(userId, tenantId) → DataProcessResult<DiversityReport>
    FABRIC: DATABASE FABRIC → Redis (read all feed namespaces)
    CF-84: count participant posts / total → if >40%, demote excess
    CF-89: combined cap across FLOW-07 + FLOW-09 sources

  RemoveParticipantPostsAsync(eventId, userId, tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → Redis (ZREM by eventId tag)
    EP-4 compensation step: removes feed entries on cancellation

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅ DNA-9 ✅

MACHINE: Diversity cap formula, spacing rule
FREEDOM: Cap percentage (default 40%), spacing window (default 3), source weighting
```

### F285 — IWeightEvolutionService

```
FACTORY: F285
INTERFACE: IWeightEvolutionService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (weight cache) + PostgreSQL (weight records)

PURPOSE: Time-based weight multipliers and decay for participant connections.
         T-7d: 1.5×, T-1d: 2.0×, event day: 3.0×, post-event: exponential decay to 1.0 by T+7.
         Permanent bonus: +0.05 after decay completes.
         Writes to SEPARATE dimension (CF-93): event_participation_weight (NOT connection_weight).

METHODS:
  ApplyMultiplierAsync(eventId, milestone, tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE event_participation_weight column)
    Milestones: T-7d (1.5×), T-1d (2.0×), T-0 (3.0×)
    CF-93: writes to event_participation_weight, NEVER to connection_weight
    Emits: WeightMultiplied to QUEUE FABRIC

  ApplyDecayAsync(eventId, daysSinceEvent, tenantId) → DataProcessResult<int>
    FABRIC: DATABASE FABRIC → PostgreSQL (UPDATE with decay formula)
    Formula: base × (1 + (multiplier - 1) × e^(-daysSinceEvent / tau))
    tau = FREEDOM config (default 2.0 for 7-day normalization)
    At T+7: weight ≈ 1.0 + permanent_bonus
    Emits: DecayCompleted when weight within 1% of base + bonus

  GetCompositeWeightAsync(userA, userB, tenantId) → DataProcessResult<CompositeWeight>
    FABRIC: DATABASE FABRIC → PostgreSQL (read both dimensions)
    Returns: connection_weight × event_participation_weight

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅

MACHINE: Decay formula (exponential), permanent bonus application
FREEDOM: Multiplier values per milestone, decay tau, permanent bonus amount
```

### F286 — IQuestionnaireSimilarityScoringService

```
FACTORY: F286
INTERFACE: IQuestionnaireSimilarityScoringService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → MongoDB (questionnaire responses)
                   + AI ENGINE FABRIC (Skill 07) → embedding generation

PURPOSE: Sub-component 4/4 of connection scoring (T97).
         Computes questionnaire_similarity_score from response vector comparison.

METHODS:
  ComputeQuestionnaireSimilarityAsync(userA, userB, tenantId) → DataProcessResult<SubScore>
    FABRIC: DATABASE FABRIC → MongoDB (read questionnaire responses)
    AI ENGINE FABRIC → generate embeddings if not cached
    Formula: cosine_similarity(embeddingA, embeddingB)
    Cache: Redis (embedding vectors, TTL 24h)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅
```

### F287 — IParticipationAnalyticsService

```
FACTORY: F287
INTERFACE: IParticipationAnalyticsService
FAMILY: 31 — SOCIAL INTEGRATION
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (analytics index)
                   + QUEUE FABRIC (Skill 04) → Redis Streams (events)

PURPOSE: Record and query participation analytics.
         Emits EventParticipationAnalyzed (consumed by FLOW-05 for gamification — CF-94).
         Metrics: participants, capacity %, payment amounts, match quality, segment distribution.

METHODS:
  RecordParticipationAsync(eventId, participationData, tenantId) → DataProcessResult<bool>
    FABRIC: DATABASE FABRIC → Elasticsearch (INDEX analytics doc)
    Emits: EventParticipationAnalyzed to QUEUE FABRIC
    CF-94: carries metadata { xp_eligible: true, participation_type: "paid|free|waitlist_upgrade" }

  GetEventAnalyticsAsync(eventId, tenantId) → DataProcessResult<AnalyticsSummary>
    FABRIC: DATABASE FABRIC → Elasticsearch (SEARCH + aggregation)

  GetTrendAnalyticsAsync(dateRange, tenantId) → DataProcessResult<TrendReport>
    FABRIC: DATABASE FABRIC → Elasticsearch (date histogram aggregation)

DNA COMPLIANCE: DNA-1 ✅ DNA-2 ✅ DNA-3 ✅ DNA-4 ✅ DNA-5 ✅ DNA-6 ✅
```

---

## ENGINE PRIMITIVES (FLOW-09)

### EP-4 — Saga Compensation Registry

```
ENGINE PRIMITIVE: EP-4
NAME: Saga Compensation Registry
USED BY: F279 (saga coordinator), compensation steps in F272/F273/F274/F275/F276/F277/F284

PURPOSE: Manages compensation chains for the participation saga.
         Each saga has an ordered list of completed steps.
         On failure: execute compensation in LIFO order (reverse).
         Each compensation step is idempotent (EP-5 dedup).

STORAGE: DATABASE FABRIC → PostgreSQL (saga_executions + saga_steps tables)
LOCKING: Optimistic lock on saga_executions.status (CF-91)

COMPENSATION CHAIN (participation saga):
  Step 6: Cancel reminders → F276.CancelRemindersAsync
  Step 5: Remove calendar → F275.RemoveCalendarEntryAsync
  Step 4: Restore capacity → F277.RestoreCapacityAsync
  Step 3: Cancel ticket → F274.CancelTicketAsync
  Step 2: Refund payment → F273.RefundPaymentAsync
  Step 1: Release reservation → F272.ReleaseReservationAsync

Each step checked against EP-5 dedup before execution.
```

### EP-5 — Idempotency & Dedup Store

```
ENGINE PRIMITIVE: EP-5
NAME: Idempotency & Dedup Store
USED BY: All FLOW-09 event consumers, webhook handlers, compensation steps

PURPOSE: Provides exactly-once processing semantics for event consumption.
         Key format: hash(context-specific components)
         TTL: 72 hours minimum (Stripe retries up to 3 days)

STORAGE: DATABASE FABRIC → Redis (hash store with TTL)
         + PostgreSQL (durable record for audit)

OPERATIONS:
  CheckAndClaimAsync(dedupKey, tenantId) → DataProcessResult<DedupResult>
    Returns: { isNew: true/false, existingResult: <cached> }
  ReleaseClaimAsync(dedupKey, tenantId) → DataProcessResult<bool>
    For failed processing: release claim so retry can succeed
```

### DNA-9 — Compensation Chain Pattern

```
DNA PATTERN: DNA-9
NAME: Compensation Chain
ENFORCED ON: All saga-participating services in FLOW-09+

RULES:
  1. Every step that modifies state MUST have a compensation method
  2. Compensation methods MUST be idempotent (checked via EP-5)
  3. Compensation executes in LIFO order (reverse of completion)
  4. Compensation status tracked in EP-4 (not fire-and-forget)
  5. Concurrent compensation triggers handled via optimistic locking (CF-91)
  6. Each compensation returns DataProcessResult<T> (DNA-3)
```

---

### DR-27 — Reservation Hold Strategy (Redis + PostgreSQL Dual-Write)

```
DECISION: F272 uses Redis for fast TTL-based hold and PostgreSQL for durable record.
          Redis key deletion = expiry. PostgreSQL status = audit trail.

CONTEXT: Reservation holds need sub-second check performance (Redis) but also need
         to survive Redis restarts (PostgreSQL). The 5-minute TTL is enforcement.

RESOLUTION: Dual-write via outbox pattern. Redis is source of truth for "is hold active?"
            PostgreSQL is source of truth for "what happened to this hold?"

JUSTIFICATION: Redis TTL handles automatic expiry without cron jobs.
               PostgreSQL handles crash recovery and audit.
               If Redis is down: fall back to PostgreSQL TTL check (slower but correct).
```

### DR-28 — Weight Dimension Isolation

```
DECISION: FLOW-09 writes to event_participation_weight dimension, separate from
          connection_weight used by FLOW-04 ranking.

CONTEXT: Multiple flows read/write connection weights. Without isolation, event-boosted
         weights would inflate non-event content ranking (CF-93).

RESOLUTION: Connection documents store nested weight dimensions:
            { "connection_weight": 0.8, "event_participation_weight": 1.5 }
            FLOW-04 reads connection_weight only.
            FLOW-09 reads connection_weight × event_participation_weight for feed ranking.

JUSTIFICATION: No cross-flow interference. Each flow owns its dimension.
               Base connection_weight only changes via FLOW-07 (friend request flow).
```

---

## Integration Changelog (continued)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-09 P1 merge | F272-F287 (+16) | — | — | Family 30-31, EP-4/EP-5, DNA-9, DR-27-DR-28 |

## System State Update (Post Family 31 / FLOW-09 Phase 1 Complete)

| Metric | Pre-FLOW-09 | Post-Phase 1 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F271 | F1-F287 | +16 |
| Factory families | 29 | 31 | +2 |
| Engine primitives | EP-1-EP-3 | EP-1-EP-5 | +2 |
| DNA patterns | DNA-1-DNA-8 | DNA-1-DNA-9 | +1 |
| Design records | DR-1-DR-26 | DR-1-DR-28 | +2 |
| DNA compliance | 828/828 | 956/956 | +128 (8 base × 16 factories) |

```
FACTORIES (continuous):
  F1-F271   [through Family 29, FLOW-08]
  F272-F279 [FLOW-09 Transactional Participation, Family 30]
  F280-F287 [FLOW-09 Social Integration, Family 31]      <- NEW
  Next: T93 (Phase 2 — Task Type Contracts)
```

## SAVE POINT: FLOW-09:MERGE:P1 ✅
## Phase 1 COMPLETE: Families 30-31 (F272-F287), EP-4, EP-5, DNA-9, DR-27-DR-28

---

# ═══════════════════════════════════════════════════════
# FLOW-11 — ERP SYSTEMS ENGINE EXTENSION
# Family 32 | F288–F303 | DR-29–DR-32
# ═══════════════════════════════════════════════════════

## FAMILY 32: ERP Systems Integration

```
FAMILY: 32
NAME: ERP Systems Integration
FLOW: FLOW-11
FACTORIES: F288–F303 (16 interfaces)
VALUE STREAMS: Order-to-Cash (O2C), Procure-to-Pay (P2P), Record-to-Report (R2R),
               Master Data Sync, Multi-Tenant Connection Bootstrap, Derived Analytics
EXTERNAL SYSTEMS: SAP Business One (OData v3/v4), monday.com (GraphQL),
                  Generic ERP connectors (config-driven)
MULTI-TENANT: Three-tier isolation (Shared Schema / Separate Schema / Separate Instance)
FINANCIAL CORRECTNESS: Reversal-not-delete, WORM audit log, idempotency on all
                        state-changing ops, period seal immutability, three-way match gate
```

---

### F288: IERPConnectorService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → provider selected per tenant config
  Default: Elasticsearch (ERP document index)
  Enterprise tier: PostgreSQL (separate schema with RLS)
  Fallback: MongoDB (document-native)
PURPOSE: Adapter for external ERP API (SAP B1 OData v4 model)
  - Abstracts OData v3/v4 protocol differences between ERP versions
  - Manages B1SESSION cookie lifecycle: re-login on 401, NEVER logs session token
  - Handles sticky routing (ROUTEID for load-balanced Service Layer clusters)
  - All ERP entity calls return DataProcessResult<Dictionary<string,object>> (DNA-1 + DNA-3)
METHODS:
  ConnectAsync(tenantId, connectionConfig) → DataProcessResult<Dictionary<string,object>>
  QueryEntitiesAsync(tenantId, entitySet, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  CreateDocumentAsync(tenantId, docType, payload, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  CancelDocumentAsync(tenantId, docId, reversalPayload) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: FactoryResolutionContext.TenantId routes to tenant-specific connection pool
IRON RULE: Never throw for business logic — always DataProcessResult<T>
IRON RULE: B1SESSION never written to logs or DataProcessResult — BUILD FAILURE if exposed
```

### F289: IMasterDataService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch primary, PostgreSQL for regulated tenants
PURPOSE: Canonical representation of ERP master data (partners, items, warehouses)
  - Tenant-isolated master data store
  - Incremental sync via watermarks from ERP (OData $skiptoken pagination)
  - Read-mostly path with cache-aside via Redis (MicroserviceBase Cache component)
METHODS:
  UpsertPartnerAsync(tenantId, partnerData) → DataProcessResult<string>
  UpsertItemAsync(tenantId, itemData) → DataProcessResult<string>
  UpsertWarehouseAsync(tenantId, warehouseData) → DataProcessResult<string>
  SearchPartnersAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  GetExternalMappingAsync(tenantId, systemType, externalId) → DataProcessResult<string>
MULTI-TENANT: Every record carries tenantId; BuildSearchFilter auto-skips empty tenantId (DNA-2)
```

### F290: IDocumentChainService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only, immutable once posted)
  Enterprise: separate schema per tenant (t_{tenantId}.erp_document)
PURPOSE: Manages transactional document graph
  O2C chain: Quote → SalesOrder → Delivery → ARInvoice → IncomingPayment
  P2P chain: PurchaseRequisition → PurchaseOrder → GoodsReceipt → APInvoice → OutgoingPayment
  - Creates document chain links (from_doc_id → to_doc_id → link_type)
  - Enforces chain integrity: no posting without predecessor document
  - Immutable once status = POSTED; corrections only via F295:IReversalService
METHODS:
  CreateDocumentAsync(tenantId, docType, parentDocId, payload, idempotencyKey) → DataProcessResult<string>
  PostDocumentAsync(tenantId, docId, approverContext, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  GetChainAsync(tenantId, rootDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ValidateChainIntegrityAsync(tenantId, docId) → DataProcessResult<bool>
MULTI-TENANT: All queries include tenantId scope; RLS policy at DB level for regulated tenants
IRON RULE: PostDocumentAsync requires idempotencyKey — BUILD FAILURE if absent
```

### F291: ILedgerService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only journal_entry table)
PURPOSE: Universal Journal — single source of truth for all financial postings
  - All operational document postings create immutable journal entries
  - journal_entry rows are WORM (write-once, read-many); no UPDATE/DELETE ever
  - Correction = new reversal journal_entry referencing original je_id
  - Derived analytics synced to Elasticsearch via F296:IOutboxPublisherService
METHODS:
  PostJournalEntryAsync(tenantId, sourceDocId, lines, idempotencyKey) → DataProcessResult<string>
  GetJournalEntriesAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ReconcileAsync(tenantId, periodId) → DataProcessResult<Dictionary<string,object>>
  ReverseEntryAsync(tenantId, originalJeId, reason, idempotencyKey) → DataProcessResult<string>
MULTI-TENANT: Separate schema for enterprise/regulated tenants
              Per-tenant KEK for at-rest encryption of all ledger data
IRON RULE: PostJournalEntryAsync requires idempotencyKey — BUILD FAILURE if absent
IRON RULE: ReverseEntryAsync creates new entry; never modifies original — BUILD FAILURE otherwise
```

### F292: IWorkPlatformConnectorService

```
FAMILY: 32
FABRIC RESOLUTION: AI ENGINE FABRIC (Skill 07) → GraphQL provider abstraction
  Config-driven: monday.com is one implementation; swap to other work platforms without code change
PURPOSE: Connector to external work platform for approval workflows, intake, coordination
  - Manages OAuth 2.0 token lifecycle (PKCE for browser flows)
  - Handles GraphQL complexity budget rate limiting (retry_in_seconds backoff)
  - Webhook URL verification (challenge echo) as a first-class method
  - JWT signature verification for all signed inbound webhook events
METHODS:
  VerifyWebhookEndpointAsync(tenantId, challenge) → DataProcessResult<string>
  VerifyWebhookSignatureAsync(tenantId, jwtToken, signingSecret) → DataProcessResult<bool>
  QueryBoardAsync(tenantId, graphqlQuery, variables) → DataProcessResult<Dictionary<string,object>>
  MutateItemAsync(tenantId, mutation, variables, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  GetRateLimitStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: OAuth tokens stored as vault references ONLY — never raw credentials in DB
IRON RULE: Raw OAuth tokens never stored in any persistence layer — BUILD FAILURE if stored directly
```

### F293: ISagaCoordinatorService

```
FAMILY: 32
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams consumer groups
PURPOSE: Durable saga orchestration for all multi-step ERP flows
  - Maintains process_instance state (O2C, P2P, R2R, SYNC, BOOTSTRAP)
  - Persists step execution state (process_step) with attempt count + retry metadata
  - Drives compensating actions on permanent failure via F295:IReversalService
  - CorrelationId is stable across retries, restarts, and manual replays
METHODS:
  StartSagaAsync(tenantId, sagaType, correlationId, initialPayload) → DataProcessResult<string>
  AdvanceStepAsync(tenantId, sagaId, stepName, result) → DataProcessResult<Dictionary<string,object>>
  CompensateAsync(tenantId, sagaId, fromStepName) → DataProcessResult<bool>
  GetSagaStateAsync(tenantId, correlationId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: CorrelationId always prefixed: "{tenantId}:{businessKey}"
              Stream keys namespaced: "{tenantId}.erp.{sagaType}"
IRON RULE: StartSagaAsync requires correlationId — BUILD FAILURE if absent
```

### F294: IIdempotencyService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (fast lookup) with PostgreSQL fallback
PURPOSE: Prevents double-posting across retries and duplicate webhook deliveries
  - Stores (tenantId, key, requestHash, resultRef, expiresAt)
  - Returns cached result if key already processed — idempotent replay
  - Invalidates keys after configurable TTL (default 24h financial ops, 1h sync ops)
METHODS:
  CheckOrCreateAsync(tenantId, key, requestHash) → DataProcessResult<Dictionary<string,object>>
  StoreResultAsync(tenantId, key, resultRef) → DataProcessResult<bool>
  InvalidateAsync(tenantId, key) → DataProcessResult<bool>
KEY FORMAT CONVENTIONS:
  Document creation:  "{docType}:{correlationId}:{stepName}"
  Reversal:           "reversal:{originalDocId}:{tenantId}:{reason}"
  Journal entry:      "je:{sourceDocId}:{tenantId}:{period}"
  Sync job page:      "sync_job:{tenantId}:{entitySet}:{watermark}"
  Webhook event:      "webhook:{tenantId}:{eventId}"
MULTI-TENANT: Unique constraint on (tenantId, key) — cross-tenant key collision impossible
```

### F295: IReversalService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → same fabric as F290:IDocumentChainService (PostgreSQL)
PURPOSE: Implements reversal-not-delete semantics for all posted ERP documents
  - Creates cancellation document referencing original (audit trail always preserved)
  - Cascades CANCELLED state to all chain links from the cancelled document onward
  - Posts balancing reversal journal entry via F291:ILedgerService
  - Marks original as status=CANCELLED — NEVER deletes any document
METHODS:
  ReverseDocumentAsync(tenantId, originalDocId, reason, idempotencyKey) → DataProcessResult<string>
  GetReversalHistoryAsync(tenantId, originalDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: Original document is NEVER deleted — BUILD FAILURE if DELETE called on any posted doc
IRON RULE: Reversal doc MUST reference original doc_id in link — BUILD FAILURE if absent
IRON RULE: Reversal journal entry MUST balance: sum(debit)==sum(credit) of original — BUILD FAILURE
```

### F296: IOutboxPublisherService

```
FAMILY: 32
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams
PURPOSE: Transactional outbox pattern — eliminates dual-write risk between DB + queue
  - Outbox row written in SAME DB transaction as aggregate update (atomic)
  - Background relay worker publishes to queue then marks published_at
  - Guarantees at-least-once event delivery even on partial failures
METHODS:
  WriteToOutboxAsync(tenantId, aggregateId, eventType, payload) → DataProcessResult<string>
  RelayPendingAsync(tenantId, batchSize) → DataProcessResult<int>
  GetPendingCountAsync(tenantId) → DataProcessResult<int>
MULTI-TENANT: All outbox rows include tenantId; relay worker processes per-tenant batches
              Stream: "{tenantId}.erp.outbox"
```

### F297: IWebhookGatewayService

```
FAMILY: 32
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams (inbound webhook events → Main stream)
PURPOSE: Ingests, verifies, and deduplicates all inbound webhook events from work platform
  - Challenge-response verification on webhook setup (BLOCKING — cannot skip)
  - JWT signature verification on every inbound event
  - Deduplication via F294:IIdempotencyService using event_id as key
  - Normalizes events and routes to FLOW-11 saga via F293:ISagaCoordinatorService
METHODS:
  HandleChallengeAsync(challenge) → DataProcessResult<string>
  IngestEventAsync(tenantId, headers, rawPayload) → DataProcessResult<string>
  GetEventStatusAsync(tenantId, eventId) → DataProcessResult<Dictionary<string,object>>
IRON RULE: No event processed without JWT signature verification — BUILD FAILURE if skipped
IRON RULE: Challenge-response verification cannot be bypassed in any code path — BUILD FAILURE
```

### F298: IThreeWayMatchService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
PURPOSE: Validates P2P three-way match: PurchaseOrder ↔ GoodsReceipt ↔ VendorInvoice
  - Compares quantities, amounts, and item codes across all three documents
  - Returns structured match status with variance details
  - Routes to exception workflow via F293:ISagaCoordinatorService on mismatch
METHODS:
  MatchAsync(tenantId, poId, grId, invoiceId) → DataProcessResult<Dictionary<string,object>>
  GetMatchHistoryAsync(tenantId, docId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
MATCH STATUSES: FULL_MATCH | QUANTITY_VARIANCE | PRICE_VARIANCE | MISMATCH
MULTI-TENANT: Match records scoped to tenantId; BuildSearchFilter skips empty fields (DNA-2)
IRON RULE: MISMATCH status NEVER silently advances saga to AP invoice posting — BUILD FAILURE
IRON RULE: Override of MISMATCH requires approvalToken with role=finance_admin — BUILD FAILURE
```

### F299: IPeriodCloseService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (ledger) + Elasticsearch (analytics)
PURPOSE: Orchestrates period-end closing sequence (Record-to-Report value stream)
  SEQUENCE: INIT → REVALUE → ACCRUE → VALIDATE → SEAL (each step idempotent)
  - Currency revaluation (exchange rate adjustments posted as journal entries)
  - Accruals (expenses not yet invoiced posted as journal entries)
  - Balance validation (sum debit = sum credit enforcement before seal)
  - Period SEAL: immutable — re-open creates new reversal period, never modifies closed one
METHODS:
  InitiateCloseAsync(tenantId, periodId, idempotencyKey) → DataProcessResult<string>
  RevalueAsync(tenantId, periodId, exchangeRates) → DataProcessResult<Dictionary<string,object>>
  PostAccrualsAsync(tenantId, periodId, accruals, idempotencyKey) → DataProcessResult<bool>
  FinalizeCloseAsync(tenantId, periodId, approvalToken) → DataProcessResult<Dictionary<string,object>>
IRON RULE: FinalizeCloseAsync without approvalToken (role=finance_admin) = BUILD FAILURE
IRON RULE: Period cannot be sealed if unresolved P2P mismatches exist = BUILD FAILURE
IRON RULE: Closed period NEVER modified/deleted — re-open creates reversal period — BUILD FAILURE
```

### F300: IERPTenantConnectionRegistry

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config index)
PURPOSE: Manages per-tenant ERP + work platform connection configurations
  - Stores connection metadata (base_url, scopes, status, health) — NEVER raw secrets
  - Maps credentials to vault references (secret_ref) only
  - Supports multiple ERP instances per tenant (test vs production environments)
  - Provides health-check status per connection
METHODS:
  RegisterConnectionAsync(tenantId, connectionConfig) → DataProcessResult<string>
  GetConnectionAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  HealthCheckAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  RevokeConnectionAsync(tenantId, connectionId) → DataProcessResult<bool>
MULTI-TENANT: Primary key is (tenantId, connectionId) — strict cross-tenant isolation
IRON RULE: Raw secrets never stored — vault reference only — BUILD FAILURE if stored directly
```

### F301: IAuditLedgerService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (append-only audit index)
PURPOSE: WORM-equivalent audit log for all ERP state-changing operations
  Captures: who (actorId), what (action), when (timestamp), tenantId, objectRef, diff
  - SOC 2 processing integrity and GDPR accountability coverage
  - Tamper-evident: hash chain available for enterprise tier
  - Every PostDocument, PostJournalEntry, ReverseDocument, FinalizeClose writes audit entry
METHODS:
  WriteAuditAsync(tenantId, actorId, action, objectRef, diff) → DataProcessResult<string>
  QueryAuditAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: WriteAuditAsync called synchronously BEFORE returning success from any state-changing
           operation — BUILD FAILURE if audit written after return or skipped
```

### F302: IERPReportingService

```
FAMILY: 32
FABRIC RESOLUTION: RAG FABRIC (Skill 00b) → Hybrid strategy (Elasticsearch analytics index)
PURPOSE: Derived analytics over ERP events — NOT an authoritative ledger
  - Fed by F296:IOutboxPublisherService relay (event-driven, not polling)
  - All analytics records tagged: source="derived", erp_doc_id="{externalId}"
  - Scheduled reconciliation job detects analytics-vs-ERP discrepancies
  - Discrepancies written as reconciliation_gap events (never auto-corrected)
METHODS:
  IndexDocumentEventAsync(tenantId, event) → DataProcessResult<string>
  SearchReportsAsync(tenantId, reportType, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  GetReconciliationGapsAsync(tenantId, periodId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: Analytics index NEVER used as source for PostJournalEntryAsync — BUILD FAILURE
IRON RULE: Reconciliation gaps NEVER silently resolved — human review required — BUILD FAILURE
```

### F303: ITenantQuotaEnforcerService

```
FAMILY: 32
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (quota counters, TTL-based windows)
PURPOSE: Enforces per-tenant resource quotas to prevent noisy-neighbor degradation
  - ERP API call budgets, sync page limits, document volume caps
  - Quota configs read from FREEDOM config index (admin-configurable, no hardcoded limits)
  - Returns structured quota status: ALLOWED | RATE_LIMITED | EXCEEDED
METHODS:
  CheckQuotaAsync(tenantId, operationType, cost) → DataProcessResult<Dictionary<string,object>>
  IncrementCounterAsync(tenantId, operationType, amount) → DataProcessResult<bool>
  GetQuotaStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
COUNTER NAMESPACE: "{tenantId}:{operationType}:{periodWindow}"
MULTI-TENANT: Counters physically namespaced — one tenant cannot consume another's quota
IRON RULE: CheckQuotaAsync called BEFORE any ERP sync page fetch — BUILD FAILURE if skipped
```

---

## FLOW-11 Design Records (DR-29–DR-32)

### DR-29 — Reversal-Not-Delete Pattern

```
DECISION: All posted ERP documents are immutable. Corrections create new reversal documents
          referencing the original. DELETE is never called on any posted document.

CONTEXT: Financial audit requirements demand a complete, unbroken document trail.
         Deleting a posted invoice or journal entry would create gaps that fail SOC 2
         processing integrity checks and break double-entry accounting balance.

RESOLUTION: F295:IReversalService.ReverseDocumentAsync creates:
            (1) A cancellation document with link_type=REVERSAL pointing to original doc
            (2) A balancing reversal journal entry (sum of debits/credits swapped)
            Both original and reversal remain queryable/reportable.
            Original status → CANCELLED. Reversal status → POSTED.
            Iron Rule in AF-9: any call to IDatabaseService.DeleteDocument on a
            document with status=POSTED or CANCELLED = BUILD FAILURE.

JUSTIFICATION: Reversal-not-delete is the universal pattern in double-entry accounting
               systems (SAP, Oracle, Xero). It preserves the audit chain completely,
               is idempotent (reversing twice returns first reversal), and enables
               period-level reconciliation across all states.
```

### DR-30 — Transactional Outbox + Idempotency Co-Design

```
DECISION: Every state-changing ERP operation requires BOTH an idempotency key check
          (F294) AND an outbox write (F296) in the same logical unit as the DB mutation.

CONTEXT: Distributed ERP operations span external systems (SAP, work platform) and
         internal services. Without outbox: "document created but event not published"
         breaks downstream sagas. Without idempotency: retries after partial failure
         create duplicate documents or double-posted journal entries.

RESOLUTION: Co-design pattern (always used together):
            Step 1: F294.CheckOrCreateAsync — if replay, return cached result immediately
            Step 2: Perform DB mutation (document creation / journal posting)
            Step 3: F296.WriteToOutboxAsync in same DB transaction as Step 2
            Step 4: F301.WriteAuditAsync before returning success
            This sequence is enforced by AF-9 Judge as an Iron Rule.
            If Step 3 fails, Step 2 is rolled back atomically.

JUSTIFICATION: The transactional outbox eliminates the dual-write problem entirely.
               Idempotency ensures retry safety. Together they provide exactly-once
               business effect semantics across all FLOW-11 document operations.
```

### DR-31 — Three-Tier ERP Tenant Isolation

```
DECISION: FLOW-11 uses three distinct isolation tiers selected per tenant via
          FactoryResolutionContext.IsolationTier (SHARED / SCHEMA / INSTANCE).

CONTEXT: ERP data spans a unique risk gradient: SMB tenants need cost efficiency;
         regulated tenants (GDPR, SOC 2, financial audit) need schema-level isolation;
         enterprise/multi-jurisdiction tenants require complete instance isolation.
         A single isolation model would either over-provision SMBs or under-protect
         regulated entities.

RESOLUTION:
  TIER 1 SHARED: All tenants share ES indices + Redis namespaces.
                 tenantId field + BuildSearchFilter (DNA-2, DNA-5) enforce logical isolation.
                 F303:ITenantQuotaEnforcerService prevents noisy-neighbor.
  TIER 2 SCHEMA: Dedicated PostgreSQL schema per tenant (t_{tenantId}.*).
                 RLS enforced at DB level. Per-tenant KEK for PII field encryption.
  TIER 3 INSTANCE: Dedicated microservice instances + dedicated PostgreSQL instance.
                   F288:IERPConnectorService gets isolated connection pool.
                   All fabrics route to tenant-exclusive infrastructure.
  All tiers: FactoryResolutionContext carries IsolationTier so fabrics resolve correctly.
  Tier upgrade: config-change only (FREEDOM layer), no code change needed.

JUSTIFICATION: Matches multi-tenant-support.md hybrid isolation model.
               Config-driven tier selection honors the Freedom Machine philosophy.
```

### DR-32 — Analytics-vs-Ledger Separation

```
DECISION: F302:IERPReportingService (analytics index) and F291:ILedgerService
          (journal_entry table) are strictly separated sources. Analytics is
          always DERIVED; ledger is always AUTHORITATIVE. No system may use
          analytics data as input to a financial posting.

CONTEXT: SAP's own "universal journal" concept (S/4HANA) is the "book of original entry" —
         analytics aggregations over it are secondary. In FLOW-11, mixing analytics
         reads into posting logic would create a feedback loop where derived
         approximations become authoritative financial records. This is a SOC 2 /
         GAAP violation.

RESOLUTION: CF-107 (BFA rule) enforces this at engine level: any code path where
            F302.SearchReportsAsync is called before F291.PostJournalEntryAsync in the
            same step fails AF-9 Judge with BUILD FAILURE.
            F302 analytics records always tagged source="derived".
            Reconciliation job (F302.GetReconciliationGapsAsync) compares derived vs
            authoritative but never auto-corrects — human review required.
            Analytics index is fed only by F296 outbox relay (not by direct writes).

JUSTIFICATION: Eliminates risk of derived data becoming authoritative.
               Keeps audit trail clean. Enables analytics without compromising
               financial correctness.
```

---

## Integration Changelog (FLOW-11 append)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-11 complete | F288-F303 (+16) | T103-T110 (+8) | CF-96-CF-107 (+12) | Family 32, DR-29-DR-32, Template 20 |

## System State Update (Post Family 32 / FLOW-11 Complete)

| Metric | Pre-FLOW-11 | Post-FLOW-11 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F287 | F1-F303 | +16 |
| Factory families | 31 | 32 | +1 |
| Task types | T1-T102 | T1-T110 | +8 |
| BFA conflict rules | CF-1-CF-95 | CF-1-CF-107 | +12 |
| Stress tests | ST-1-ST-46 | ST-1-ST-53 | +7 |
| Flow templates | 1-19 | 1-20 | +1 |
| Design records | DR-1-DR-28 | DR-1-DR-32 | +4 |

```
FACTORIES (continuous):
  F1-F271   [through Family 29, FLOW-08]
  F272-F279 [FLOW-09 Transactional Participation, Family 30]
  F280-F287 [FLOW-09 Social Integration, Family 31]
  F288-F303 [FLOW-11 ERP Systems Integration, Family 32]  <- NEW
  Next: F304+ (FLOW-12)
```

## SAVE POINT: FLOW-11:MERGE:P1 ✅
## Phase 1 COMPLETE: Family 32 (F288-F303), DR-29-DR-32
