# XIIGen — SKILLS FACTORY & RAG INDEX (Python + React Native)
## Consolidated: SK-1–SK-345, All 32 Flows Merged
## Date: 2026-03-01 | Status: AUTHORITATIVE POST-FLOW-31 REFERENCE
## Scope: SK-1–SK-329, 31 flows, all skill patterns
## Stack: Python 3.12 + FastAPI | React Native + Expo + TypeScript
## Supersedes: SKILLS_FACTORY_RAG_MERGED.md (.NET/C# reference — archived)

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This document was written during the Python/FastAPI design phase.
> The live codebase has migrated to **Node.js 22 + NestJS 11 + TypeScript 5 + React 18 + Vite 5**.
>
> **Key differences from this document:**
>
> | Artifact | Document value | Actual codebase value |
> |----------|---------------|----------------------|
> | Stack | Python 3.12 + FastAPI | Node.js 22 + NestJS 11 + TypeScript 5 |
> | Frontend | React Native + Expo | React 18 + Vite 5 + Tailwind CSS |
> | Skill files | SK-1–SK-329 | 138 skill .md files in `.claude/skills/`, SK numbers up to SK-527 |
> | Factories | F1–F1338 | F1–F1600+ (highest referenced: F1592) |
> | Task Types | T1–T515 | T1–T649 (398 unique, including T605-T649 remapped for FLOW-15..23) |
> | BFA Rules | CF-1–CF-714 | CF-1–CF-809+ (94 unique rule IDs in bfa-rules.ts files) |
> | Flows | 31 complete | 45 flow directories, FLOW-01..40 + FLOW-45 |
> | RAG init files | (design) | 35 files in `server/src/rag-init/` (seeds + indexers + pattern extractors) |
> | Next Factory | F1339 | **F1601** |
> | Next Task Type | T516 | **T650** |
> | Next Skill | SK-330 | **SK-529** |
>
> **Skill organization in live code:**
> - `.claude/skills/` contains 138 skill .md files covering:
>   - Planning skills: SK-416..SK-425 (PlanningSessionStartup, DecisionReopening, etc.)
>   - Session output skills: SK-426..SK-429 (ExecutionLog, PhaseCompletion, WebHandoff, GitReport)
>   - Flow design skills: SK-430..SK-527 (engine internals, lifecycle, product, self-awareness, graph intelligence)
>   - Orchestration skills: flow-reexamination, how-to-prepare-a-plan, xiigen-core-principles
> - `server/src/rag-init/` contains 35 TypeScript files:
>   - Per-flow RAG seed files (event-management, marketplace, saas-multi-tenancy, etc.)
>   - Infrastructure: RagIndexerService, RagPatternSeeder, SkillIndexer, CodePatternExtractor
>   - Base classes: FlowRagSeedBase, FlowPromptSeedBase with interfaces
>
> **The skill patterns, factory mappings, and RAG seeding strategies described below remain
> architecturally valid** — the implementation uses the same patterns in NestJS/TypeScript.
> Actual code locations: `.claude/skills/` for skills, `server/src/rag-init/` for RAG seeding.

---

# ═══ CONSOLIDATED MASTER INDEX (Updated 2026-04-14) ═══

## System State

| Artifact | Design (Post-31) | Actual (2026-04-14) |
|----------|-------------------|---------------------|
| Factories | 1,338 (F1–F1338) | 1,600+ (F1–F1592) |
| Task Types | 515 (T1–T515) | 398 unique (T1–T649 + T367–T374) |
| Skill Patterns | 329 (SK-1–SK-329) | 138 .md files (SK-1–SK-527) |
| BFA Conflict Rules | 714 (CF-1–CF-714) | 94+ unique (CF-1–CF-809) |
| Flows Complete | 31 (FLOW-01–FLOW-31) | 45 directories |
| RAG seed files | — | 35 files in server/src/rag-init/ |

## Next Available Numbers

```
Factory:          F1601    Family: 209
Task Type:        T650
Skill:            SK-529
BFA Rule:         CF-809
```

## Complete Flow Registry

| Flow | Domain | Factories | Task Types | Families |
|------|--------|-----------|------------|----------|
| FLOW-01 | User Registration & Onboarding | F174-F181 | T47-T49 | 18 |
| FLOW-02 | Content Management | F182-F189 | T50-T52 | 19 |
| FLOW-03 | Event Creation & Promotion | F197-F204 | T59-T62 | 21 |
| FLOW-04 | Post Publishing & Feed Distribution | F190-F196 | T53-T58 | 20 |
| FLOW-05 | Lesson Completion & Gamification | F166-F173 | T44-T46 | 17 |
| FLOW-06 | Marketplace Publishing & Distribution | F225-F233 | T63-T72 | 25 |
| FLOW-07 | Friend Request & Social Feed | F234-F243 | T73-T82 | 26 |
| FLOW-08 | Multi-Tenant Payment Processing | F244-F271 | T83-T98 | 27-29 |
| FLOW-09 | Transactional Event Participation | F272-F287 | T99-T118 | 30-31 |
| FLOW-10 | Social Platform (Post/Feed/Chat/Search) | F288-F367 | T119-T158 | 32-37 |
| FLOW-11 | Content Moderation & Social Graph | F325-F367 | T139-T158 | 38-44 |
| FLOW-12 | Chat & Messaging Platform | F368-F383 | T159-T168 | 45 |
| FLOW-13 | Data Warehouse & Analytics | F384-F425 | T169-T188 | 46-51 |
| FLOW-14 | Data Pipeline & ETL | F426-F495 | T189-T198 | 52-59 |
| FLOW-15 | MVP Builder & App Platform | F496-F565 | T199-T218 | 60-73 |
| FLOW-16 | Giant Shop (E-Commerce Platforms) | F566-F579 | T219-T226 | 74 |
| FLOW-17 | Freelancer Marketplace | F580-F630 | T227-T246 | 75-83 |
| FLOW-18 | Visual Flow Creation & Code Injection | F631-F696 | T247-T268 | 84-93 |
| FLOW-19 | CI/CD & DevOps Control Plane | F697-F727 | T269-T286 | 94-101 |
| FLOW-20 | Sponsored Content + Graph API + Ads | F728-F851 | T287-T306 | 102-118 |
| FLOW-21 | Forms & Flow Automation Builder | F852-F900 | T307-T326 | 119-127 |
| FLOW-22 | Visual Editor & Site Builder | F901-F944 | T327-T346 | 128-134 |
| FLOW-23 | Visual Editor Extended (Canvas/Layout) | F945-F981 | T347-T366 | 135-139 |
| FLOW-24 | Learning Calendar (AI Tutor) | F982-F1027 | T367-T388 | 140-146 |
| FLOW-25 | BFA Cross-Flow Governance & Impact | F1028-F1074 | T375-T388 | 147-153 |
| FLOW-26 | Self-Developing Meta-Flow Engine | F1075-F1102 | T389-T412 | 154-159 |
| FLOW-27 | Human Interaction Gate + Scheduling | F1103-F1128 | T413-T422 | 160-164 |
| FLOW-28 | Blog/CMS Modules Platform | F1129-F1175 | T423-T440 | 165-174 |
| FLOW-29 | Adaptive RAG Deep Research Engine | F1176-F1247 | T441-T467 | 175-184 |
| FLOW-30 | PromptOps — Self-Learning Prompts | F1248-F1270 | T468-T488 | 185-190 |
| FLOW-31 | Design Intelligence Engine | F1271-F1338 | T489-T515 | 191-199 |
| FLOW-32 | Sharable Flows & RAG Marketplace | F1339-F1400 | T516-T535 | 200-205 |
| FLOW-33 | System Initiation Bootstrap | F1401-F1420 | T565-T566 | 206 |
| FLOW-35 | Meta-Arbitration Engine | F1484-F1490 | T516-T522 | 207 |
| FLOW-36 | Feature Registry | F1491-F1510 | T567-T570 | 208 |
| FLOW-37 | Engine Self-Awareness | F1511-F1530 | T590-T593 | — |
| FLOW-38 | RAG Quality Feedback | F1531-F1545 | T594-T596 | — |
| FLOW-39 | OSS Curriculum | F1546-F1560 | T597-T600 | — |
| FLOW-40 | Client Push (SSE) | F1561-F1575 | T587-T589 | — |
| FLOW-45 | History Bootstrap | F1576-F1592 | T601-T604 | — |

## Skill Ranges by Flow

### Design-Phase Skills (SK-1 through SK-329)

| Flow | Skills | Count | Domain |
|------|--------|-------|--------|
| Base (V39/V40) | SK-1–SK-16 | 16 | Core engine skills |
| FLOW-05 | SK-17–SK-24 | 8 | Gamification |
| FLOW-01–04 | SK-25–SK-40 | 16 | Registration/Content/Events/Notifications |
| FLOW-06–07 | SK-41–SK-56 | 16 | Marketplace/Social |
| FLOW-08–09 | SK-57–SK-80 | 24 | Payments/Participation |
| FLOW-10–12 | SK-81–SK-120 | 40 | Social/Chat |
| FLOW-13–14 | SK-121–SK-150 | 30 | Data Warehouse/ETL |
| FLOW-15–16 | SK-151–SK-180 | 30 | MVP Builder/E-Commerce |
| FLOW-17–19 | SK-181–SK-210 | 30 | Freelancer/Visual Flow/CI-CD |
| FLOW-20–22 | SK-211–SK-245 | 35 | Sponsored/Forms/Site Builder |
| FLOW-23–24 | SK-246–SK-260 | 15 | Visual Editor/AI Tutor |
| FLOW-25–26 | SK-261–SK-280 | 20 | BFA Governance/Self-Dev |
| FLOW-27 | SK-281–SK-290 | 10 | HIG + Scheduling |
| FLOW-28 | SK-291–SK-304 | 14 | Blog/CMS |
| FLOW-29 | SK-290–SK-304 | 15 | Adaptive RAG |
| FLOW-30 | SK-305–SK-314 | 10 | PromptOps |
| FLOW-31 | SK-315–SK-329 | 15 | Design Intelligence Engine |

### Implementation-Phase Skills (SK-402 through SK-527, in .claude/skills/)

| Skill Range | Category | Description |
|-------------|----------|-------------|
| SK-402–SK-415 | Engine internals | SpendGovernor, SecurityCircuitBreaker, ModelFitness, ImprovementDetector |
| SK-416–SK-425 | Planning | PlanningSessionStartup, DecisionReopening, FlowCompleteness, etc. |
| SK-426–SK-429 | Session output | ExecutionLog, PhaseCompletion, WebSessionHandoff, GitReport |
| SK-430–SK-447 | Flow design L1 | Engine internals, bootstrap boundary, flow design cycle |
| SK-448–SK-457 | Flow design L1.5 | Output contract, iron rule derivation, FREEDOM/MACHINE |
| SK-461–SK-470 | Flow design L1.7 | Difficulty prediction, adaptation map, cross-flow deps |
| SK-471–SK-491 | Flow design L2 | Engine lifecycle, score investigation, QA session type |
| SK-492–SK-504 | Flow design L3 | Product lifecycle, requirement-to-flow, domain event design |
| SK-505–SK-509 | Flow design L4 | Self-awareness, capability state, gap-to-proposal |
| SK-510–SK-519 | Flow design L5 | Graph intelligence, AI decision pipeline, confidence lifecycle |
| SK-520–SK-527 | Specialized | AI_SCOPE_ARBITER (SK-526), session crystallization, etc. |

> **Note:** 138 skill .md files exist in `.claude/skills/`. Not all have sequential SK numbers.
> Orchestration skills (flow-reexamination, how-to-prepare-a-plan, xiigen-core-principles)
> don't have SK numbers but are loaded by skill name.

## Promotion Ladder

| Level | Description | Criteria |
|-------|-------------|----------|
| GENERATED | Fresh AI output | Passes AF-1 through AF-8 |
| INJECTED | Reviewed & tested | Human review + unit tests |
| MINIMAL | Production-stable | 30-day incident-free |
| CORE | Platform foundation | Critical path, fully tested |

## Flow Section Navigation

| Flow | Line | Section |
|------|------|---------|
| FLOW-03 | ~167 | Event Creation & Promotion |
| FLOW-04 | ~225 | Post Publishing & Feed Distribution |
| FLOW-05 | ~1 | Lesson Completion & Gamification |
| FLOW-06 | ~767 | Marketplace Publishing & Distribution |
| FLOW-07 | ~1007 | Friend Request & Social Feed |
| FLOW-08 | ~1234 | Multi-Tenant Payment Processing |
| FLOW-10 | ~1495 | Social Platform (Post/Feed/Chat/Search) |
| FLOW-11 | ~1995 | Content Moderation & Social Graph |
| FLOW-12 | ~2104 | Chat & Messaging Platform |
| FLOW-13 | ~2441 | Data Warehouse & Analytics |
| FLOW-14 | ~3246 | Data Pipeline & ETL |
| FLOW-15 | ~4095 | MVP Builder & App Platform |
| FLOW-16 | ~5414 | Giant Shop (E-Commerce Platforms) |
| FLOW-17 | ~6816 | Freelancer Marketplace |
| FLOW-18 | ~7362 | Visual Flow Creation & Code Injection |
| FLOW-19 | ~7703 | CI/CD & DevOps Control Plane |
| FLOW-20 | ~8186 | Sponsored Content + Graph API + Ads |
| FLOW-21 | ~9119 | Forms & Flow Automation Builder |
| FLOW-22 | ~9861 | Visual Editor & Site Builder |
| FLOW-23 | ~10361 | Visual Editor Extended (Canvas/Layout) |
| FLOW-24 | ~10795 | Learning Calendar (AI Tutor) |
| FLOW-25 | ~11339 | BFA Cross-Flow Governance & Impact |
| FLOW-26 | ~11941 | Self-Developing Meta-Flow Engine |
| FLOW-27 | ~12947 | Human Interaction Gate + Scheduling |
| FLOW-28 | ~13610 | Blog/CMS Modules Platform |
| FLOW-29 | ~14479 | Adaptive RAG Deep Research Engine |
| FLOW-30 | ~14984 | PromptOps — Self-Learning Prompts |
| FLOW-31 | ~15700 | Design Intelligence Engine |

# ═══ END CONSOLIDATED MASTER INDEX ═══

---


## CONCEPT → SOURCE MAPPING

### Layer 0: Fabric Interfaces
| Concept | Source | Key Detail |
|---------|--------|------------|
| IDatabaseService | basic_prompt LAYER 0 | 6 providers: ES, Mongo, PG, Redis, MySQL, SQLServer |
| IQueueService | basic_prompt LAYER 0 | Redis Streams, Main→Consumed→Archive→DLQ |
| IAiProvider + AiDispatcher | basic_prompt LAYER 0 | 4+ providers: Claude, OpenAI, Gemini, DeepSeek |
| IRagService | basic_prompt LAYER 0 | 7 strategies: Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi |
| MicroserviceBase | basic_prompt LAYER 0 | 19 components, ALL services inherit |
| IFlowDefinition + IFlowOrchestrator | basic_prompt LAYER 0 | JSON DAGs in ES |

### Layer 1: Factory Pattern
| Concept | Source | Key Detail |
|---------|--------|------------|
| IExternalServiceFactory<T> | V39_ENGINE_DESIGN PART 0-1 | CreateAsync(ctx), config-first routing |
| Factory count baseline | V43_FABRIC_EXTENSION | F1-F68 (after V43) |
| Factory count current | FLOW05_EXTENSION_PLAN | F1-F165 (pre-FLOW-05) |
| New factories for FLOW-05 | FLOW05_EXTENSION_PLAN | F166-F173 (8 new) |

### Layer 2: Engine Contracts
| Concept | Source | Key Detail |
|---------|--------|------------|
| T1-T7 (full format examples) | TASK_TYPES_CATALOG | Reference for format |
| T40 (three-way join) | basic_prompt LAYER 2 | Closest archetype to T44 |
| Required fields | basic_prompt LAYER 2 | ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, QUALITY GATES |
| Family registry | TASK_TYPES_CATALOG | 16 families pre-FLOW-05 |

### Layer 3: AF Stations
| Station | Role | Key for FLOW-05 |
|---------|------|-----------------|
| AF-1 Genesis | Generate code from spec | Generates gamification services on fabrics |
| AF-2 Planning | Decompose into steps | 3 parallel branches + join |
| AF-3 Prompt Library | Domain-specific prompts | Gamification scoring, ML adaptation |
| AF-4 RAG | Reusable patterns | SK-383 (RedisStreamQueue) (Queue), SK-382 (ElasticsearchDatabase) (DB), FLOW-04 pipeline |
| AF-5 Multi-model | Competing models | ML adaptation logic |
| AF-6 Code Review | Automated review | Overflow, timezone, race conditions |
| AF-7 Compliance | DNA patterns check | All 6 patterns |
| AF-8 Security | Security scan | Client-side injection, rate limits, privacy |
| AF-9 Judge | Iron rules + quality gates | T44/T45/T46 specific rules |
| AF-10 Merge | Multi-model output merge | Best ML adaptation result |
| AF-11 Feedback | Quality storage | Future gamification improvements |

### Layer 4: Guardrails
| Concept | Source | Key Detail |
|---------|--------|------------|
| BFA | V62_BFA_STRESS_TEST | 6-step T32 engine, 7 gaps identified |
| 6 DNA Patterns | basic_prompt LAYER 4 | parse_document, build_search_filter, DataProcessResult, MicroserviceBase, Scope Isolation, DynamicController |
| Promotion Ladder | basic_prompt LAYER 4 | GENERATED→INJECTED→MINIMAL→CORE |

### FLOW-05 Specifics
| Concept | Source | Key Detail |
|---------|--------|------------|
| 3 branches | 05-lesson-completion-gamification.md | Gamification, Learning, Social |
| 11 events | 05-lesson-completion-gamification.md Event Definitions | Full payload specs |
| 9 services | 05-lesson-completion-gamification.md Services Involved | With DB assignments |
| Gamification formulas | 05-lesson-completion-gamification.md Business Logic | Point calc, level progression |
| 6 edge cases | 05-lesson-completion-gamification.md Edge Cases | Idempotency, timezone, overflow |
| Deep research findings | 05-lesson-completion-gamification_deep_research.md | CloudEvents, durable messaging, sync+async pattern |

### Cross-Flow Dependencies
| Flow | Relation to FLOW-05 | Source |
|------|---------------------|--------|
| FLOW-01 (User Registration) | Prerequisite: user must exist + be active | 05-lesson-completion-gamification.md |
| FLOW-02 (Matching) | Prerequisite: active learning program | 05-lesson-completion-gamification.md |
| FLOW-04 (Feed Distribution) | Reused: social branch uses same pipeline | 05-lesson-completion-gamification.md |

### Anti-Patterns (MUST NOT)
1. ❌ Describe services as standalone implementations
2. ❌ Skip fabric resolution mapping
3. ❌ Use one-line task type stubs
4. ❌ Forget AF station mapping
5. ❌ Import specific providers (PostgreSQL, Redis, OpenAI)
6. ❌ Create typed models (use dict[str, Any])
7. ❌ Break backward compatibility (T1-T43, F1-F165)

---

## REUSE ANALYSIS

### Existing Assets → FLOW-05 Needs
| FLOW-05 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Answer storage | IDatabaseService → MongoDB | REUSE (Fabric Layer 0) |
| Event publishing (all 11) | IQueueService → Redis Streams | REUSE (Fabric Layer 0) |
| ML inference | IAiProvider → model inference | REUSE (Fabric Layer 0) |
| Feed distribution | FLOW-04 pipeline (5 services) | REUSE (existing flow) |
| Notifications | Existing notification patterns | REUSE |
| Gamification scoring | — | NEW → F166 |
| Learning plan adaptation | — | NEW → F167 |
| Achievement registry | — | NEW → F168 |
| Streak tracking | — | NEW → F169 |
| Point ledger | — | NEW → F170 |
| Questionnaire post creation | — | NEW → F171 |
| Grade calculation | — | NEW → F172 |
| Learning audience targeting | — | NEW → F173 |

### Factory ID Numbering Justification
- V39 baseline: F1-F53
- V43 extension: F54-F68
- V40 master expansion: F69-F165
- FLOW-05 extension: F166-F173 (THIS DOCUMENT)

# PHASE 7 — SKILLS_FACTORY_RAG ADDENDUM
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FCE Addendum (append to SKILLS_FACTORY_RAG.md)

### Family 19: Business Onboarding Intelligence (FLOW-02)
| Need | Factory | Key Detail |
|------|---------|------------|
| Business profile creation | F182 IBusinessProfileService | MongoDB primary, AI enrichment option |
| Compatibility matching | F183 IMatchingService | PostgreSQL scan, Redis cache 12h, 30s timeout |
| User segmentation | F184 IAnalyticsSegmentService | Elasticsearch, degrade on failure |
| AI learning program generation | F185 ILearningProgramService | Multi-model, 10s budget, fallback template |
| Recommendation engine | F186 IRecommendationEngineService | MongoDB + Redis 24h, AI-backed |
| Business categorization | F187 IBusinessCategoryService | Elasticsearch full-text |
| Feed personalization | F188 IFeedPersonalizationService | Redis 1h cache, degrade to trending |
| Events personalization | F189 IEventsPersonalizationService | Elasticsearch + Redis 4h |

### Family 20: Flow Creation Engine (FCE)
| Need | Factory | Key Detail |
|------|---------|------------|
| Flow definition storage + versioning | F190 IFlowDefinitionService | Elasticsearch, immutable versions |
| Flow DSL validation + DAG compilation | F191 IFlowValidationService | AI semantic + factory registry check |
| Run lifecycle management | F192 IFlowRuntimeService | Elasticsearch state persistence, crash-recovery |
| Step execution (factory-of-factories) | F193 IFlowStepExecutor | CreateAsync() resolves each step's factory |
| Event schema registry | F194 ISchemaRegistryService | Elasticsearch, drives BFA G1 |
| Visual flow designer (fabric-first) | F195 IFlowDesignerService | ZERO platform-specific, all config in ES |
| Flow run monitoring | F196 IFlowMonitorService | Separate from designer, real-time via queue |

### Queue Fabric Additions (not a new factory — extends existing SK-383 (RedisStreamQueue))
| Method | Purpose | Key Pattern |
|--------|---------|------------|
| OutboxWriteAsync | Atomic DB write + event publish | ONE call from service code |
| OutboxRelayAsync | Internal outbox relay process | CDC pattern |
| SupersedeAsync | Debounce / latest_wins | Cancels in-flight, enqueues replacement |

### DNA-7 Quick Reference (new 7th pattern)
| Pattern | How to check | Violation example |
|---------|-------------|------------------|
| W3C Trace Context | ctx.traceparent forwarded on ALL calls | Calling AI provider without ctx |
| Applied to | All generated services (F182–F196) | Any service not inheriting ctx.Tracer |

### Reuse Analysis (FCE)
| FCE Need | Existing Asset | Action |
|----------|---------------|--------|
| Flow state persistence | IDatabaseService → Elasticsearch | REUSE (Fabric Layer 0) |
| Event pub/sub | IQueueService → Redis Streams | REUSE (Fabric Layer 0) |
| AI composition | IAiProvider → multi-model | REUSE (Fabric Layer 0) |
| RAG for flow patterns | IRagService → SearchAsync | REUSE (Fabric Layer 0) |
| Flow orchestration (runs) | MicroserviceBase + existing patterns | REUSE |
| Flow DSL validation | — | NEW → F191 |
| Versioned runtime state | — | NEW → F192 |
| Step executor (factory-of-factories) | — | NEW → F193 |
| Schema registry | — | NEW → F194 |
| Visual designer | — | NEW → F195 |
| Run monitor | — | NEW → F196 |
| Outbox + supersede | — | NEW → Queue Fabric +3 methods |

# PHASE — SKILLS_FACTORY_RAG ADDENDUM (FLOW-03)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 21: Event Promotion (FLOW-03)
| Need | Factory | Key Detail |
|------|---------|------------|
| Event CRUD + state machine | F197 IEventService | PG primary, Redis cache, outbox atomic, 6-state machine |
| Event-user matching (5-factor) | F198 IEventMatchingService | AI multi-model, RAG Vector, ES profiles, checkpointed batch |
| 3-tier audience segmentation | F199 IAudienceSegmentationService | Redis cache 4h TTL, strong/medium/weak tiers |
| Search indexing (write) | F200 ISearchIndexService | Elasticsearch, configurable refresh policy |
| Feed injection (CQRS write) | F201 IFeedInjectionService | Redis ZADD sorted sets, F188/F189 are READ path |
| Notification dispatch | F202 INotificationOrchestrationService | Redis Streams priority lanes, 4 channels, backpressure |
| Payment/billing | F203 IPaymentIntegrationService | PG billing records, Stripe webhook validation (no SDK) |
| Campaign analytics + ROI | F204 ICampaignAnalyticsService | ES time-series metrics, AI attendance prediction |

### FLOW-03 Key Decisions (Locked)
| Decision | Rationale |
|----------|-----------|
| F201 new (not reuse F188/F189) | CQRS: F201=WRITE (1→10K+ ZADD), F188/F189=READ. Different scaling profiles. |
| T62 separate contract | Time-decoupled: T59 completes in minutes, T62 runs 7+ days. Different lifecycle. |
| 4 contracts (T59-T62) | Clean separation: pipeline → scoring → delivery → aggregation. Each independently testable. |

### Reuse Analysis (FLOW-03)
| FLOW-03 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Event storage (CRUD) | IDatabaseService → PostgreSQL | ✅ REUSE (Fabric Layer 0) |
| Event caching | IDatabaseService → Redis | ✅ REUSE (Fabric Layer 0) |
| Domain events (8) | IQueueService → Redis Streams | ✅ REUSE (Fabric Layer 0) |
| Outbox pattern | Queue Fabric → OutboxWriteAsync | ✅ REUSE (Queue +3 from FCE) |
| ML scoring (multi-model) | IAiProvider → AiDispatcher | ✅ REUSE (Fabric Layer 0) |
| Interest similarity | IRagService → Vector strategy | ✅ REUSE (Fabric Layer 0) |
| Search indexing | IDatabaseService → Elasticsearch | ✅ REUSE (Fabric Layer 0) |
| Flow orchestration | IFlowOrchestrator (SK-392 (RagStrategyRegistry)) | ✅ REUSE (Fabric Layer 0) |
| Feed READ path | F188/F189 (FLOW-02) | ✅ REUSE (read-only) |
| Business profiles for scoring | F182 (FLOW-02) | ✅ REUSE (matching input) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| Event CRUD + state machine | — | 🆕 F197 |
| Event-user matching | — | 🆕 F198 |
| Audience tiers | — | 🆕 F199 |
| Search index write | — | 🆕 F200 |
| Feed write/inject (CQRS) | — | 🆕 F201 |
| Notification dispatch | — | 🆕 F202 |
| Payment/billing | — | 🆕 F203 |
| Campaign analytics | — | 🆕 F204 |

### Factory ID Numbering Justification (Updated)
- V39 baseline: F1-F53
- V43 extension: F54-F68
- V40 master expansion: F69-F165
- FLOW-05 extension: F166-F173 (Family 17)
- FLOW-01 extension: F174-F181 (Family 18)
- FLOW-02 extension: F182-F189 (Family 19)
- FCE extension: F190-F196 (Family 20)
- FLOW-03 extension: F197-F204 (Family 21) ← THIS DOCUMENT

---


# PHASE — SKILLS_FACTORY_RAG ADDENDUM (FLOW-04)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 22: Post Publishing & Feed Distribution (FLOW-04)

| Need | Factory | Key Detail |
|------|---------|------------|
| Post storage + media + events | F205 IPostContentService | MongoDB primary, Redis cache 15min, OutboxWriteAsync atomic, rate limit 10/hr/user MACHINE |
| NLP content analysis | F206 INlpAnalysisService | AI multi-model (Claude+Gemini+DeepSeek), Redis cache 24h, degrade gracefully on failure |
| Business-content matching | F207 IContentMatchingService | PG+ES, AI semantic scoring, F182 read reuse, 5000/batch |
| Social graph (1st+2nd degree) | F208 ISocialGraphService | Neo4j primary, PG fallback, Redis cache 6h, NEVER expose full adjacency |
| Group membership resolution | F209 IGroupMembershipService | PG+MongoDB, Redis cache 1h, role weights MACHINE |
| 6-factor composite ranking | F210 ICompositeRankingService | Redis cache 30min, AI engagement prediction, TIMEOUT_THEN_FALLBACK join, 1000/batch |
| Tiered feed distribution + diversity | F211 IPostFeedDistributionService | Redis Cluster ZADD, ES secondary, 500/batch, max 2/author top10 MACHINE |
| Distribution analytics + completion | F212 IDistributionAnalyticsService | ES time-series, userId hashed, SLA 30s alert MACHINE |

### FLOW-04 Key Decisions (Locked)

| Decision | Rationale |
|----------|-----------|
| F211 new (not reuse F201) | CQRS: F201=event injection (simple ZADD), F211=post distribution (diversity+reorder+removal). Different scaling profiles. |
| T64 separate from T40 | T40 merges STREAMS; T64 DISCOVERS audiences then joins. Different archetypes. |
| 4 contracts (T63-T66) | Clean separation: analysis → discovery+ranking → distribution → analytics. Each independently testable. |
| F208 includes Neo4j | Social graph traversals need graph DB; PG fallback for resilience. Fabric hides the difference. |
| Completion gate (both events) | PostDistributionCompleted requires BOTH FeedsUpdated AND FeedsReordered — prevents premature notifications. |

### Reuse Analysis (FLOW-04)

| FLOW-04 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Event publishing (10 events) | IQueueService → Redis Streams (SK-383 (RedisStreamQueue)) | ✅ REUSE (Fabric Layer 0) |
| Outbox pattern | Queue Fabric → OutboxWriteAsync (FCE +3) | ✅ REUSE |
| Multi-model NLP | IAiProvider + AiDispatcher (SK-385 (IAiProvider)/07) | ✅ REUSE (Fabric Layer 0) |
| Business profiles | F182 IBusinessProfileService (FLOW-02) | ✅ REUSE (read-only) |
| Feed READ path | F188 IFeedPersonalizationService (FLOW-02) | ✅ REUSE (read-only) |
| Feed WRITE reference | F201 IFeedInjectionService (FLOW-03) | ⚠️ PATTERN REFERENCE only (different logic) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| Flow orchestration | IFlowOrchestrator (SK-392 (RagStrategyRegistry)) | ✅ REUSE (Fabric Layer 0) |
| Post content storage | — | 🆕 F205 |
| NLP analysis service | — | 🆕 F206 |
| Post-content matching | — | 🆕 F207 |
| Social graph queries | — | 🆕 F208 |
| Group membership resolution | — | 🆕 F209 |
| 6-factor composite ranking | — | 🆕 F210 |
| Post feed distribution + diversity | — | 🆕 F211 |
| Distribution analytics | — | 🆕 F212 |

### Factory ID Numbering Justification (Updated)
- V39 baseline: F1-F53
- V43 extension: F54-F68
- V40 master expansion: F69-F165
- FLOW-05 extension: F166-F173 (Family 17)
- FLOW-01 extension: F174-F181 (Family 18)
- FLOW-02 extension: F182-F189 (Family 19)
- FCE extension: F190-F196 (Family 20)
- FLOW-03 extension: F197-F204 (Family 21)
- FLOW-04 extension: F205-F212 (Family 22) ← THIS DOCUMENT

## MERGE04:P4 STATE SAVE
```
MERGE04:P4 = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: Family 22 addendum, key decisions, full reuse analysis, numbering justification
Next: MERGE04:P5 → V62_BFA_STRESS_TEST_MERGED.md
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-05 — SKILLS FACTORY RAG ADDENDUM (Family 23 + 24)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 23: GAMIFICATION HARDENING — 6 Skill Patterns (SK-5 through SK-10)

**Purpose:** Reusable patterns AF-4 (RAG) retrieves when generating operational integrity
factories for any gamification, scoring, or event-driven system.

---

### SK-5: Read-Only Reconciliation Audit Pattern

**Trigger:** AI agent generating a data integrity audit service for any points/scoring system

**Pattern:**
```
Step 1: Resolve DB FABRIC with "read_only" RequiredCapability
Step 2: Compare source of truth (InfluxDB ledger) vs derived state (MongoDB profile)
Step 3: Log discrepancies to SEPARATE append-only audit index (never production index)
Step 4: Emit alert to reconciliation stream (never auto-correct)
Step 5: Distributed lock prevents concurrent audit runs per tenant
```

**DNA:** 7/7 ✅ | **Key principle:** Read-only access (DR-6)
**Reuse in:** Any domain requiring periodic data integrity verification

---

### SK-6: One-Directional Telemetry Analyst Pattern

**Trigger:** AI agent generating async behavioral analysis alongside real-time gates

**Pattern:**
```
Step 1: Real-time gate (e.g., F221) produces telemetry to dedicated stream
Step 2: Async analyst (e.g., F214) CONSUMES from that stream only
Step 3: Analyst NEVER writes back to gate (DR-7 — no circular dependency)
Step 4: Analyst emits findings to SEPARATE output stream (anomaly.detected)
Step 5: BFA monitors stream registry for circular references
```

**DNA:** 7/7 ✅ | **Key distinction:** Producer and consumer roles strictly separated
**Reuse in:** Any domain with real-time gate + async analysis pattern

---

### SK-7: CloudEvents Schema Governance Pattern

**Trigger:** AI agent generating event-driven system with multiple producers/consumers

**Pattern:**
```
Step 1: All domain events wrapped in CloudEvents JSON envelope
Step 2: Schema registered with version in ES-backed registry (F215)
Step 3: Runtime validation: cache schema in Redis (hot path) → ES fallback
Step 4: Minor version changes: backward compatibility check (additive only)
Step 5: Major version changes: explicit migration flag required
Step 6: Failed validation → event rejected + logged to failure stream
```

**DNA:** 7/7 ✅ | **Key principle:** Contract-first event governance
**Reuse in:** Any event-driven system with multiple services and schema evolution

---

### SK-8: FREEDOM-Only Experimentation Pattern

**Trigger:** AI agent generating A/B testing for configurable parameters

**Pattern:**
```
Step 1: Experiment targets validated against MACHINE/FREEDOM classification
Step 2: MACHINE params → experiment REJECTED at registration (DR-8)
Step 3: Deterministic variant: hash(userId + experimentId) % 100
Step 4: Control group minimum 20% (meaningful baseline)
Step 5: All services resolve variants through central F216 (no local computation)
Step 6: Outcomes tracked in ES for statistical analysis
```

**DNA:** 7/7 ✅ | **Key constraint:** MACHINE parameters are NEVER experimental targets
**Reuse in:** Any system with configurable parameters and A/B testing needs

---

### SK-9: DLQ Recovery with Anti-Abuse Replay Pattern

**Trigger:** AI agent generating dead-letter queue recovery for gamification/scoring systems

**Pattern:**
```
Step 1: Read DLQ events in bounded batches (max 100 per run)
Step 2: Log-before-replay: audit log entry BEFORE re-enqueue (traceability)
Step 3: Replay to MAIN queue (not directly to target service)
Step 4: Main queue processing includes all normal gates (anti-abuse, validation)
Step 5: Max 3 retries per event (prevent infinite loops)
Step 6: Unrecoverable events ESCALATED to ops (never silently dropped)
Step 7: Preserve original correlationId + add recovery metadata
```

**DNA:** 7/7 ✅ | **Key principle:** DLQ replay MUST go through normal pipeline (CF-28)
**Reuse in:** Any system with DLQ recovery that has security/abuse gates in the pipeline

---

### SK-10: Adaptive Difficulty with Safety Bounds Pattern

**Trigger:** AI agent generating ML-based difficulty adjustment for learning systems

**Pattern:**
```
Step 1: Collect performance data (scores, time, patterns) via DB FABRIC
Step 2: Calculate difficulty via AI ENGINE FABRIC (ML inference)
Step 3: Validate adaptation safety BEFORE applying (bounds check)
Step 4: Max 3 changes per adaptation, min 2 lessons between adaptations
Step 5: Safe defaults on ML failure: maintain current difficulty (never increase on error)
Step 6: Required modules protected: adaptation cannot skip required curriculum
Step 7: Scope is MODULE-level difficulty (not curriculum-level, which is F167's scope)
```

**DNA:** 7/7 ✅ | **Key distinction:** Difficulty (within module) ≠ Curriculum (across modules)
**Reuse in:** Any ML-based adaptive system with safety constraints

---

## Factory ID Numbering Justification (Updated)
- V39 baseline: F1-F53
- V43 extension: F54-F68
- V40 master expansion: F69-F165
- FLOW-05 V1 extension: F166-F173 (Family 17)
- FLOW-01 extension: F174-F181 (Family 18)
- FLOW-02 extension: F182-F189 (Family 19)
- FCE extension: F190-F196 (Family 20)
- FLOW-03 extension: F197-F204 (Family 21)
- FLOW-04 extension: F205-F212 (Family 22)
- FLOW-05 Hardening: F213-F218 (Family 23) ← NEW
- FLOW-05 Engagement: F219-F224 (Family 24) ← NEW

## Family 24: FLOW-05 Engagement Service Layer — SK-11 through SK-16

### SK-11: Pseudonymous Grading Pattern

**Trigger:** AI agent generating a peer evaluation factory with privacy requirements

**Pattern:**
```
Step 1: CheckPseudonymityThreshold BEFORE returning grade identities
Step 2: MongoDB unique index (composite key) at DB level — not app level
Step 3: Redis ZSET sliding window for rate limiting (not in-memory counter)
Step 4: Emit AnswerGraded to engagement stream AFTER persistent storage
Step 5: FlagSpam if rate exceeded → telemetry stream → async analyst
```

**DNA:** 7/7 ✅ | **Wraps:** F172 (call via CreateAsync for calculation step)
**Reuse in:** Any domain requiring pseudonymous peer evaluation with rate limiting

---

### SK-12: Categorized Comment with Moderation Pattern

**Trigger:** AI agent generating a comment/feedback factory with moderation requirements

**Pattern:**
```
Step 1: Validate commentType against MACHINE-fixed enum (never free-text type)
Step 2: Sanitize content BEFORE storage (XSS/injection prevention — MACHINE)
Step 3: Persist comment BEFORE emitting AnswerCommented event
Step 4: Rate limit via Redis ZSET sliding window
Step 5: Route flagged comments to moderation.* stream (NOT to user notification stream)
```

**DNA:** 7/7 ✅ | **Key distinction:** moderation events ≠ notification events (different stream namespaces)
**Reuse in:** Any domain requiring categorized community feedback with moderation pipeline

---

### SK-13: Real-Time Anti-Abuse Gate Pattern

**Trigger:** AI agent generating any write path to gamification or points system

**Pattern:**
```
Step 1: ALWAYS resolve IAntiAbuseGateService via CreateAsync FIRST in any write pipeline
Step 2: CheckPointFarming → {allowed: bool} → if false, return immediately (no F166 call)
Step 3: ValidateIdempotencyKey → if key exists, skip downstream (dedup)
Step 4: SetIdempotencyKey BEFORE the downstream write (atomic Redis SET)
Step 5: Emit telemetry to abuse.behavior.telemetry for async analyst consumption
```

**DNA:** 7/7 ✅ | **Hard rule:** Gate BEFORE write (DR-9). Non-negotiable.
**Reuse in:** Any flow that awards points, credits, or similar fungible value

---

### SK-14: Timezone-Aware Activity Tracking Pattern (Wrap-Don't-Replace)

**Trigger:** AI agent generating streak or daily-activity tracking with timezone requirements

**Pattern:**
```
Step 1: Resolve ITimezoneService via CreateAsync → get user IANA timezone (PostgreSQL)
Step 2: Convert UTC event time → local calendar date (IANA-aware, DST-safe)
Step 3: Resolve wrapped V1 service (e.g., F169) via CreateAsync
Step 4: Call V1 service with local date (V1 service now does the correct computation)
Step 5: Store BOTH utcDate and localDate in record (no retroactive recalculation needed)
```

**DNA:** 7/7 ✅ | **Pattern:** Wrap V1 via CreateAsync — never direct import or replace (DR-10)
**Reuse in:** Any domain with daily activity tracking where users span timezones

---

### SK-15: Social Points Tumbling Window Pattern

**Trigger:** AI agent generating engagement feedback loops with high event volume

**Pattern:**
```
Step 1: Accumulate engagement events in Redis HASH (windowKey = {tenantId}:{entityId}:{windowStart})
Step 2: Flush trigger: time elapsed (default 15 min) OR count threshold (default 10)
Step 3: Window key is idempotent on replay (prevents float-aggregation on consumer restart)
Step 4: Route aggregated result to gamification via QUEUE FABRIC EnqueueAsync (never HTTP)
Step 5: Use SEPARATE event type for social points (distinct from completion points — DR-11)
```

**DNA:** 7/7 ✅ | **Key rule:** Never route individual engagement events one-by-one (DR-12)
**Reuse in:** Any engagement loop with high event volume (reactions, votes, views, grades)

---

### SK-16: Hybrid Sync+Async Compute Pattern (Circuit Breaker)

**Trigger:** AI agent generating a compute path that must serve a UI SLA (< 1s) AND be durable

**Pattern:**
```
Step 1: Accept HTTP request on sync compute endpoint
Step 2: Resolve ISyncComputeGatewayService via CreateAsync
Step 3: Execute computeFn within circuit breaker (configurable timeout, default 800ms)
Step 4: On success: cache result (Redis, TTL from config) + emit durable event to QUEUE FABRIC
Step 5: On timeout: return {status: "pending"} to UI (NOT error). Async path will complete.
Step 6: Async consumer (T44 equivalent): check idempotency key BEFORE writing → skip if T71 completed
```

**DNA:** 7/7 ✅ | **Key insight:** Sync and async are complementary, not competing (CF-37)
**Reuse in:** Any flow requiring instant UI feedback + guaranteed eventual consistency

---

## Family 24 Reuse Analysis

| Family 24 Factory | Reuses From | How |
|------------------|-------------|-----|
| F219 IGradingService | F172 (Family 17) | CreateAsync delegation for weighted avg calc |
| F219 IGradingService | SK-382 (ElasticsearchDatabase) (DB Fabric) | MongoDB unique index + Redis ZSET |
| F220 ICommentService | SK-383 (RedisStreamQueue) (Queue Fabric) | Dual-stream emit (engagement + moderation) |
| F221 IAntiAbuseGateService | SK-382 (ElasticsearchDatabase) (DB Fabric) | Redis idempotency keys + ES audit log |
| F221 IAntiAbuseGateService | F214 (Family 23) | Telemetry stream consumer relationship |
| F222 IStreakTimezoneService | F169 (Family 17) | CreateAsync delegation for streak storage |
| F222 IStreakTimezoneService | SK-382 (ElasticsearchDatabase) (DB Fabric) | PostgreSQL timezone store |
| F223 IEngagementFeedbackService | SK-383 (RedisStreamQueue) (Queue Fabric) | EnqueueAsync to gamification stream |
| F223 IEngagementFeedbackService | F166 (Family 17) | Downstream gamification consumer |
| F224 ISyncComputeGatewayService | SK-383 (RedisStreamQueue) (Queue Fabric) | Durable emit after sync compute |

**Reuse ratio:** 10 dependency relationships across 6 factories.
10 of 10 reuse patterns go through Fabric interfaces or CreateAsync(). Zero direct imports.

---

# ═══════════════════════════════════════════════════════
# P4c — FINAL SESSION STATE
# Supersedes: SESSION_STATE_FLOW05_UNIFIED_v2.md
# ═══════════════════════════════════════════════════════

# XIIGen — SESSION STATE: FLOW-05 UNIFIED COMPLETE
## Date: 2026-02-26 | Status: FAMILIES 23 + 24 — ALL PHASES COMPLETE ✅
## Save Point: UNIFIED:P4 (ALL PHASES DONE)

---

## WHAT WAS DONE THIS SESSION

Produced 4 addendum files (P1-P4) that merge Family 24 (Engagement Service Layer)
into the 5 unified source-of-truth documents. Family 23 (V3) was previously complete.

| File | Merges Into | Status |
|------|------------|--------|
| FLOW05_UNIFIED_P1_ARCH_ADDENDUM.md | ENGINE_ARCHITECTURE_MERGED | ✅ COMPLETE |
| FLOW05_UNIFIED_P2_TASK_TYPES.md | TASK_TYPES_CATALOG_MERGED | ✅ COMPLETE |
| FLOW05_UNIFIED_P3_BFA_STRESS.md | V62_BFA_STRESS_TEST_MERGED | ✅ COMPLETE |
| FLOW05_UNIFIED_P4_INDEX_STATE.md | UNIFIED_SOURCE_INDEX + SKILLS_RAG | ✅ THIS FILE |

---

## UNIFIED SYSTEM TOTALS (FINAL)

| Metric | Pre-Extension (FLOW-04) | +Family 23 (V3) | +Family 24 (This Session) | **FINAL** |
|--------|------------------------|------------------|--------------------------|-----------|
| Factory interfaces | F1-F212 | +6 (F213-F218) | +6 (F219-F224) | **F1-F224 (224)** |
| Factory families | 22 | 23 | 24 | **24** |
| Task type contracts | T1-T66 | +3 (T67-T69) | +2 (T70-T71) | **T1-T71 (71)** |
| Flow templates | 14 | +1 (Template 15) | 0 (extends T15) | **15** |
| BFA conflict rules | CF-1-CF-25 | +8 (CF-26-CF-33) | +8 (CF-34-CF-41) | **CF-1-CF-41 (41)** |
| BFA stress tests | 12 | +6 (ST-1-ST-6) | +6 (ST-7-ST-12) | **24** |
| Design rules | DR-1-DR-4 | +4 (DR-5-DR-8) | +4 (DR-9-DR-12) | **DR-1-DR-12 (12)** |
| DNA compliance | 373/373 | +42 (415/415) | +42 | **457/457** |
| Iron rules | 106 | +28 (134) | +20 | **154** |
| Quality gates | 90 | +22 (112) | +16 | **128** |
| Skill patterns (SK) | 10 (SK-1-SK-10) | 0 | +6 (SK-11-SK-16) | **16** |
| Backward compat breaks | 0 | 0 | 0 | **0 BREAKS** |

---

## NUMBERED SEQUENCE (Full Backward Compatibility Proof)

```
FACTORIES (continuous, verified, no gaps):
  F1-F165   [V39/V40/V43]
  F166-F173 [FLOW-05 V1, Family 17]         ← UNCHANGED
  F174-F181 [FLOW-01, Family 18]             ← UNCHANGED
  F182-F189 [FLOW-02, Family 19]             ← UNCHANGED
  F190-F196 [FCE, Family 20]                 ← UNCHANGED
  F197-F204 [FLOW-03, Family 21]             ← UNCHANGED
  F205-F212 [FLOW-04, Family 22]             ← UNCHANGED
  F213-F218 [FLOW-05 Hardening, Family 23]   ← V3 (accepted)
  F219-F224 [FLOW-05 Service, Family 24]     ← THIS SESSION ✅
  Next: F225

TASK TYPES (continuous, verified, no gaps):
  T1-T43    [V39/V40/V43]                    ← UNCHANGED
  T44-T46   [FLOW-05 V1]                     ← UNCHANGED
  T47-T49   [FLOW-01]                        ← UNCHANGED
  T50-T52   [FLOW-02]                        ← UNCHANGED
  T53-T58   [FCE]                            ← UNCHANGED
  T59-T62   [FLOW-03]                        ← UNCHANGED
  T63-T66   [FLOW-04]                        ← UNCHANGED
  T67-T69   [FLOW-05 Family 23 / V3]        ← accepted
  T70-T71   [FLOW-05 Family 24]              ← THIS SESSION ✅
  Next: T72

FAMILIES:         1-23 [existing] → 24 [Engagement Service Layer] ← THIS | Next: 25
FLOW TEMPLATES:   1-15 [existing — T15 extended with F219-F224 steps] | Next: 16
BFA RULES:        CF-1-CF-33 → CF-34-CF-41 [Family 24] ← THIS | Next: CF-42
DESIGN RULES:     DR-1-DR-8 → DR-9-DR-12 [Family 24] ← THIS | Next: DR-13
STRESS TESTS:     ST-1-ST-6 [Family 23] → ST-7-ST-12 [Family 24] ← THIS | Next: ST-13
SKILL PATTERNS:   SK-1-SK-10 [prior] → SK-11-SK-16 [Family 24] ← THIS | Next: SK-17
```

---

## SPEC GAP CLOSURE PROOF (All 12 Gaps Closed)

| Gap ID | Description | Closed By | Factory | Task Type | CF Rule |
|--------|-------------|-----------|---------|-----------|---------|
| SG-1 | Peer grading: pseudonymity, 4 criteria, rate limits | Family 24 | F219 | T70 | CF-35 |
| SG-2 | Categorized comments: 4 types, rate limits, moderation | Family 24 | F220 | T70 | CF-40 |
| SG-3 | Real-time anti-abuse gate (blocking BEFORE writes) | Family 24 | F221 | T71 | CF-38 |
| SG-4 | Timezone-aware streaks (UTC boundary bug fix) | Family 24 | F222 | T71 | CF-39 |
| SG-5 | Social points feedback loop | Family 24 | F223 | T70 | CF-34, CF-41 |
| G1 | 1s SLA hybrid sync+async with circuit breaker | Family 24 | F224 | T71 | CF-37 |
| O1 | Periodic reconciliation audit | Family 23 (V3) | F213 | T67 | CF-26 |
| O2 | Anomaly detection (async, after-the-fact) | Family 23 (V3) | F214 | T67 | CF-27 |
| O3 | CloudEvents / schema governance | Family 23 (V3) | F215 | T68 | CF-29, CF-30 |
| O4 | A/B testing / feature flags | Family 23 (V3) | F216 | T69 | CF-31, CF-32 |
| O5 | DLQ event recovery | Family 23 (V3) | F217 | T67 | CF-28 |
| O6 | Adaptive difficulty scoring | Family 23 (V3) | F218 | T69 | CF-33 |

**ALL 12 GAPS: CLOSED ✅ | OPEN GAPS: 0**

---

## MERGE CHECKLIST (execute to update 5 unified docs)

| # | Operation | Source → Target | Status |
|---|-----------|-----------------|--------|
| M7 | F219-F224 + DR-9-DR-12 + DNA 42/42 + changelog | P1 Arch Addendum → ENGINE_ARCHITECTURE_MERGED | ✅ FILE READY |
| M8 | T70-T71 + AF Map 11×2 + Template 15 extension | P2 Task Types → TASK_TYPES_CATALOG_MERGED | ✅ FILE READY |
| M9 | CF-34-CF-41 + ST-7-ST-12 + BFA entity/event registration | P3 BFA Stress → V62_BFA_STRESS_TEST_MERGED | ✅ FILE READY |
| M10 | FLOW-05 Family 24 concept map + reuse analysis + anti-patterns | P4a Index → UNIFIED_SOURCE_INDEX_MERGED | ✅ FILE READY |
| M11 | SK-11-SK-16 skill patterns + Family 24 addendum | P4b Skills → SKILLS_FACTORY_RAG_MERGED | ✅ FILE READY |
| M12 | This session state | → Replaces SESSION_STATE_FLOW05_UNIFIED_v2.md | ✅ THIS FILE |

---

## VALIDATION CHECKLIST (40-point)

| # | Check | Result |
|---|-------|--------|
| 1 | Factory continuity F1-F224 (no gaps) | ✅ PASS |
| 2 | Task type continuity T1-T71 (no gaps) | ✅ PASS |
| 3 | Family count = 24 | ✅ PASS |
| 4 | Flow template count = 15 | ✅ PASS |
| 5 | BFA CF-1-CF-41 all present | ✅ PASS |
| 6 | DNA compliance 457/457 system total | ✅ PASS |
| 7 | T1-T69 content untouched | ✅ PASS |
| 8 | F1-F218 content untouched | ✅ PASS |
| 9 | F219-F224 all have fabric resolution tables | ✅ PASS |
| 10 | F219-F224 all have factory creation code blocks | ✅ PASS |
| 11 | F219-F224 all have MACHINE + FREEDOM sections | ✅ PASS |
| 12 | F219-F224 DNA 42/42 (7 × 6) | ✅ PASS |
| 13 | T70 has all 9 mandatory engine contract fields | ✅ PASS |
| 14 | T71 has all 9 mandatory engine contract fields | ✅ PASS |
| 15 | T70 Iron Rules: 10 IRs | ✅ PASS |
| 16 | T71 Iron Rules: 10 IRs | ✅ PASS |
| 17 | T70 Quality Gates: 8 QGs | ✅ PASS |
| 18 | T71 Quality Gates: 8 QGs | ✅ PASS |
| 19 | AF Station Map 11×2=22 cells | ✅ PASS |
| 20 | Template 15 extension JSON present | ✅ PASS |
| 21 | CF-34-CF-41 all have SEVERITY, ENTITIES, CONFLICT, RESOLUTION, ISOLATION, PROOF, RUNTIME ENFORCEMENT | ✅ PASS |
| 22 | ST-7-ST-12 all have SCENARIO, ATTACK VECTOR, DEFENSE LAYERS (multi-layer), BFA CHECK, CROSS-FLOW, RESULT | ✅ PASS |
| 23 | All 6 stress tests PASS | ✅ PASS |
| 24 | DR-9-DR-12 all have DECISION, RATIONALE, IMPLEMENTATION, LOCKED | ✅ PASS |
| 25 | No direct provider imports in F219-F224 (CreateAsync only) | ✅ PASS |
| 26 | No typed models (Dictionary\<str,object\> everywhere) | ✅ PASS |
| 27 | All methods return DataProcessResult\<T\> | ✅ PASS |
| 28 | All factories inherit MicroserviceBase (DNA-4) | ✅ PASS |
| 29 | tenantId on every query (DNA-5, scope isolation) | ✅ PASS |
| 30 | GamificationSocialPointsAwarded ≠ GamificationPointsAwarded (CF-34, DR-11) | ✅ PASS |
| 31 | F221 runs BEFORE F166 on all write paths (CF-38, DR-9) | ✅ PASS |
| 32 | F222 wraps F169 via CreateAsync (CF-39, DR-10) | ✅ PASS |
| 33 | F219 wraps F172 via CreateAsync (DR-10) | ✅ PASS |
| 34 | F223 routes to F166 via QUEUE only (CF-41) | ✅ PASS |
| 35 | Idempotency key prevents sync+async float-count (CF-37, ST-8) | ✅ PASS |
| 36 | Pseudonymity floor ≥ 2 enforced (T70 IR-2 — MACHINE) | ✅ PASS |
| 37 | SK-11-SK-16 (6 new skill patterns) documented | ✅ PASS |
| 38 | All 12 spec gaps closed (SG-1..SG-5 + G1 + O1..O6) | ✅ PASS |
| 39 | Backward compatibility: 0 breaks to F1-F218, T1-T69 | ✅ PASS |
| 40 | FLOW-05 V1 (T44-T46, F166-F173) fully backward compatible | ✅ PASS |

**ALL 40 CHECKS: ✅ PASS**

---

## RECOVERY COMMANDS

```
"Show current state"                    → Read this document (P4c session state)
"What is Family 24?"                    → F219-F224, T70-T71, CF-34-CF-41, SK-11-SK-16
"What did Family 23 add?"              → F213-F218, T67-T69, CF-26-CF-33 (V3 accepted)
"How do Family 23 and 24 interact?"   → P4a Index → Cross-Family Dependency Map + Event Chain
"Continue from T71"                    → Next: T72, F225, Family 25, CF-42, Template 16, DR-13, ST-13
"Continue from CF-41"                  → Next: CF-42
"Continue from Family 24"             → Next: Family 25
"What spec gaps are still open?"       → ZERO — all 12 closed
"Add a new flow"                       → Use basic_prompt.txt + this session state as context
"Merge all Family 24 into unified docs" → Execute M7-M12 (all files ready)
"What prevents float-counting?"       → CF-37, F221 idempotency, ST-8
"What prevents streak UTC bug?"        → F222, CF-39, ST-9
"What blocks grading spam?"           → F221, F219, CF-35, ST-7
"How does social point loop close?"    → F223 tumbling window → QUEUE → F166 (CF-41, DR-11, DR-12)
```

---

## FILES IN THIS SESSION

| File | Merges Into | Content | Status |
|------|------------|---------|--------|
| FLOW05_UNIFIED_P1_ARCH_ADDENDUM.md | ENGINE_ARCHITECTURE_MERGED | F219-F224 + DR-9-DR-12 + DNA 42/42 | ✅ COMPLETE |
| FLOW05_UNIFIED_P2_TASK_TYPES.md | TASK_TYPES_CATALOG_MERGED | T70-T71 + AF 11×2 + Template 15 ext | ✅ COMPLETE |
| FLOW05_UNIFIED_P3_BFA_STRESS.md | V62_BFA_STRESS_TEST_MERGED | CF-34-CF-41 + ST-7-ST-12 | ✅ COMPLETE |
| FLOW05_UNIFIED_P4_INDEX_STATE.md | SOURCE_INDEX + SKILLS_RAG + Session | RAG lookup + SK-11-SK-16 + this state | ✅ THIS FILE |

## SUPERSEDED DOCUMENTS

| Document | Status |
|----------|--------|
| SESSION_STATE_FLOW05_UNIFIED_v2.md | SUPERSEDED — Family 24 was "SPEC READY"; now COMPLETE |
| SESSION_STATE_FLOW05C_FINAL.md | SUPERSEDED — combined approach; unified is canonical |
| FLOW05C_P1_P2_ARCH_ADDENDUM.md | SUPERSEDED — different numbering (F213-F222 combined) |
| FLOW05C_P3_P4_TASK_TYPES.md | SUPERSEDED — different numbering (T67-T70 combined) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-06 — FAMILY 25: MARKETPLACE PUBLISHING & DISTRIBUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 25 Addendum

**Family 25: MARKETPLACE PUBLISHING & DISTRIBUTION**
**Flow**: FLOW-06
**Factories**: F225-F233 (9 interfaces)
**Numbering justification**: Follows Family 24 (Anti-Abuse & Cooperation Infrastructure, FLOW-05). FLOW-06 adds the commerce layer: inventory → listing → enrichment (audience/post/synergy) → multi-audience distribution → marketplace intelligence.
**Entry event**: MarketplaceItemCreated
**Primary chain**: F225→F226→[F227+F228+F229]→[F230+F231+F232+F233]→F227

### Factory Summary

| Factory | Interface | Fabrics | Primary Role |
|---------|-----------|---------|-------------|
| F225 | IMarketplaceInventoryService | DB(PG+Redis) + Queue | Item CRUD, stock, depletion events |
| F226 | IMarketplaceListingService | DB(PG+Redis+ES) + Flow Engine | Listing lifecycle state machine |
| F227 | IMarketplaceAnalyticsService | DB(ES) + AI Engine + RAG | Audience profiling, buyer personas |
| F228 | IMarketplacePostGeneratorService | DB(MongoDB) + AI Engine + Queue | Multi-model post gen + NLP dup check |
| F229 | ICooperatorMatchingService | DB(PG+Redis) + AI Engine + RAG | 5-factor synergy scoring |
| F230 | IMarketplaceConnectionService | DB(Neo4j+PG) | Friend audience + purchase affinity |
| F231 | IMarketplaceGroupService | DB(PG+MongoDB) | Group marketplace sections |
| F232 | IMarketplaceFeedService | Queue + DB(Redis Cluster+ES) | Multi-format card distribution |
| F233 | ICooperatorNotificationService | Queue + DB(Redis) | Partnership notifications + rate limit |

### Reuse Analysis

| FLOW-06 Factory | Reuses From | Type | What's Different |
|----------------|------------|------|-----------------|
| F228 | F208 (FLOW-04) post generation | PATTERN | Marketplace content domain + NLP dup check |
| F229 | F170 (FLOW-05) cooperator lookup | EXTENDS | Adds 5-factor weighted scoring layer |
| F232 | F173 (FLOW-05) feed distribution | ADAPTS | Multiple card types + dual consumer group |
| F233 | F221 (FLOW-05) rate limit patterns | PATTERN | Different key space (cooperatorId vs userId) |
| F227 | F197 (FLOW-03) analytics patterns | PATTERN | Marketplace analytics domain |
| F230 | F150 DATABASE FABRIC(Neo4j) | DIRECT USE | New query patterns for purchase affinity |

### New Engine Capabilities (first introduced by FLOW-06)

| Primitive | ID | Exercised By | Purpose |
|-----------|-----|-------------|---------|
| State Machine Registry | EP-1 | F226 | Declarative state transitions with validation |
| Durable Timer Service | EP-2 | F226 + Flow Engine Fabric | Resume-able timers across pod restarts |
| Card Schema Registry | EP-3 | F232 | Config-driven card type definitions |

---

## FLOW-06 SKILL PATTERNS (SK-17 through SK-22)

---

### SK-17 — Weighted Multi-Factor Scoring Pattern

**Category:** DATA PROCESSING
**Source:** F229 (ICooperatorMatchingService, FLOW-06 T74)
**Reusable For:** Product recommendations, candidate matching, risk scoring, content ranking

**Pattern:**
```
1. Define N factors with configurable weights (must sum to 1.0)
2. MACHINE: factor COUNT and NAME are fixed in code
3. FREEDOM: weight VALUES are stored in ES config document
4. For each factor: compute sub-score [0.0-1.0] via appropriate fabric (DB/AI/RAG)
5. Multiply each sub-score by its weight, sum all
6. Apply MACHINE overrides AFTER weighted sum (e.g., competing=0 override)
7. Cache result in Redis with configurable TTL
8. Return DataProcessResult[dict[str, Any]] — never typed model
```

**Gotchas:**
- Weight validation must run at service startup (not per request) — fail fast
- Multi-model sub-scores (AI factor) need consensus merge before weighting
- Override rules (e.g., competing=0) must apply AFTER weighted sum, not replace a factor
- Score caching key must include all inputs that affect the score (not just one ID)

---

### SK-18 — Multi-Format Feed Card Distribution Pattern

**Category:** ORCHESTRATION
**Source:** F232 (IMarketplaceFeedService, FLOW-06 T75)
**Reusable For:** Any future multi-card-type feed distribution (event cards, course cards, job cards)

**Pattern:**
```
1. Define card types in ES config document (not in code)
2. Card type selection logic: inputs → FREEDOM config lookup → card template
3. Batch distribution: batch ceiling is MACHINE constant (prevents queue overwhelm)
4. Priority consumer group: register SEPARATE high-priority consumer for urgent events (e.g., depletion)
5. Existing card update: batch update by entityId when state changes (e.g., Sold Out)
6. All card data as dict[str, Any] — no typed CardModel
7. Feed Redis key pattern: {namespace}:feed:{tenantId}:{userId} — namespace prevents cross-flow collision
```

**Gotchas:**
- Two consumer groups on same stream = careful consumer group naming (must be distinct)
- Card update (MarkSoldOut) must be batched by entityId, not by userId — don't iterate users
- Redis LIST LPUSH for feed injection — RPUSH would show items at bottom of feed

---

### SK-19 — State Machine Lifecycle with Durable Timer Pattern

**Category:** ORCHESTRATION
**Source:** F226 (IMarketplaceListingService, FLOW-06 T72)
**Reusable For:** Any future entity lifecycle with state transitions + time-based events

**Pattern:**
```
1. Define states + valid transitions as MACHINE constants (invalid transition = BUILD FAILURE)
2. Use optimistic locking (version field) for concurrent state change protection
3. Register durable timer through FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) — NOT cron
4. Timer fires once reliably even across pod restarts
5. Compensating actions must be idempotent (could be called multiple times on retry)
6. All state data as dict[str, Any]
```

**Gotchas:**
- State machines in distributed systems: use optimistic locking (version field) to prevent concurrent state change race conditions
- Durable timers fire ONCE reliably even across pod restarts
- Compensating actions must be idempotent (could be called multiple times)
- Never add ad-hoc states via config — state machine topology is MACHINE

---

### SK-20 — NLP/Semantic Duplicate Detection Gate Pattern

**Category:** DATA PROCESSING
**Source:** F228 (IMarketplacePostGeneratorService, FLOW-06 T73 Branch B)
**Reusable For:** Duplicate listing detection, similar content blocking, plagiarism checks

**Pattern:**
```
1. Use RAG FABRIC (IRagService.SearchAsync) with Vector strategy for semantic similarity
2. Scope search to {tenantId}:{sellerId} to prevent cross-seller blocking
3. Threshold: configurable via FREEDOM config (default 0.90 for marketplace)
4. Decision: above threshold → emit DuplicateDetected event → return failure to caller
5. Below threshold: continue pipeline → emit created event
6. Log blocked attempts to analytics index for pattern monitoring (>3 blocks/24hr → flag)
7. Return DataProcessResult with isDuplicate bool + similarity score
```

**Gotchas:**
- Character-level similarity misses synonym substitution attacks — use embedding/semantic similarity
- Threshold should be FREEDOM (configurable) — different use cases need different thresholds
- Scope check essential: don't compare across sellers (same description ≠ duplicate if different seller)

---

### SK-21 — Three-Way Parallel Enrichment Fork Pattern

**Category:** ORCHESTRATION
**Source:** T73 (FLOW-06), builds on T40 (FLOW-05)
**Reusable For:** Any future 3+ branch enrichment before aggregation or distribution

**Pattern:**
```
1. allSettled semantics: all branches start simultaneously; join regardless of individual failures
2. Timeout: configurable (default: 30s); resolve with available results after timeout
3. Branch dependency: some branches can depend on others (e.g., C depends on A's output)
4. Event: each branch emits its own completion event (partial results OK)
5. Minimum completion: configure minimum branches that must succeed for downstream to proceed
6. Traceparent: each branch carries the parent span + creates child span (DNA-7)
```

**Gotchas:**
- allResolved (Promise.all) is wrong for resilience — one branch failure kills all
- Branch C depending on Branch A: use event-driven dependency (C starts on A's completion event), NOT shared memory
- Don't pass data between branches via shared state — use the Queue FABRIC event payload

---

### SK-22 — Cross-Currency Display Pricing Pattern

**Category:** DATA PROCESSING
**Source:** F226 (FLOW-06 T72/T75), ST-24
**Reusable For:** Any future multi-currency display in marketplace, events, subscriptions

**Pattern:**
```
1. MACHINE: canonical price is always in seller's base currency
2. FX rates stored in ES index, refreshed on configurable schedule (FREEDOM)
3. Display price: informational only — labeled with "converted for reference"
4. At transaction: fetch fresh FX rate, show to buyer if rate moved > threshold (FREEDOM)
5. Discounts applied to BASE CURRENCY price only (never to FX-converted display)
6. All pricing stored: {baseCurrency, basePrice, displayCurrency, displayPrice, displayFXRate, displayRateTimestamp}
7. DataProcessResult[dict[str, Any]] — no typed PriceModel
```

**Gotchas:**
- NEVER apply discounts to FX display price — this compounds FX + discount errors
- Re-confirm threshold (>2% rate movement) prevents silent charge-more at settlement
- FX rate cache key must include {date} — daily refresh needs cache invalidation

---

## FLOW-06 NUMBERING JUSTIFICATION

| Range | Family | Flow | Rationale |
|-------|--------|------|-----------|
| F225-F233 | 25 | FLOW-06 | Follows F224 (last of Family 24). 9 factories for 9 marketplace services |
| T72-T76 | — | FLOW-06 | Follows T71 (last of FLOW-05 cont). 5 task types for 5-step marketplace flow |
| CF-42-CF-51 | — | FLOW-06 | Follows CF-41 (last of Family 24). 10 cross-flow conflict rules |
| ST-19-ST-24 | — | FLOW-06 | Follows ST-18 (last of Family 24). 6 stress tests for marketplace edge cases |
| DR-13-DR-16 | — | FLOW-06 | Follows DR-12 (last of Family 24). 4 design records for new patterns |
| SK-17-SK-22 | — | FLOW-06 | Follows SK-16 (last of Family 24). 6 reusable skill patterns |
| EP-1-EP-3 | — | FLOW-06 | NEW category — 3 engine primitives introduced by FLOW-06 |

---

## System State Update (Post FLOW-06 Skills Merge)

| Metric | Pre-FLOW-06 | Post-FLOW-06 | Delta |
|--------|-------------|--------------|-------|
| Families documented | 24 (through Family 24) | 25 (+ Family 25) | +1 |
| Skill patterns | SK-1-SK-16 | SK-1-SK-22 | +6 |
| Reuse entries | FLOW-01 through FLOW-05 | + FLOW-06 (7 reuse patterns) | +7 |
| Engine primitives | 0 | EP-1, EP-2, EP-3 | +3 |

```
SKILL PATTERNS (continuous):
  SK-1-SK-10  [FLOW-01 through FLOW-04]
  SK-11-SK-16 [FLOW-05, Family 23+24]
  SK-17-SK-22 [FLOW-06, Family 25]    ← NEW
  Next: SK-23
```

---

## MERGE:P4b STATE SAVE (SKILLS_FACTORY_RAG)
```
MERGE:P4b = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: Family 25 addendum (9 factories, reuse analysis, engine primitives)
Added: SK-17 through SK-22 (6 skill patterns with Pattern + Gotchas format)
Added: Numbering justification for all FLOW-06 ranges
Added: System state update
System: 25 families, SK-1-SK-22, EP-1-EP-3
Next: MERGE:P5 → Cross-document validation
```
# FLOW-07 SKILL PATTERNS (SK-23 through SK-28)

---

### SK-23 — Graph Edge Lifecycle Pattern

**Category:** DATA PROCESSING
**Source:** F234 (IConnectionGraphService, FLOW-07 T77)
**Reusable For:** Any future bidirectional relationship management (team membership, mentoring pairs, partnerships)

**Pattern:**
```
1. Check preconditions BEFORE edge creation (block check, rate limit, dedup)
2. Create bidirectional edges in SINGLE Neo4j transaction (A→B AND B→A)
3. Use EP-1 State Machine Registry for lifecycle transitions (BUILD FAILURE on invalid)
4. Store edge properties (strength, state, timestamps) on BOTH edges identically
5. Mutual-pending detection: distributed lock on sorted(id1,id2), check reverse, auto-accept
6. Emit domain events via DNA-8 transactional outbox (atomic with PG state write)
7. Rate limit via Redis ZSET sliding window (keyed on userId, not session/token)
8. Block detection returns generic failure — NEVER reveal block information
```

**Gotchas:**
- Bidirectional edge consistency: if one direction fails, rollback BOTH (Neo4j transaction)
- Mutual-pending lock TTL must be short (5s) to prevent deadlock on crash
- State machine transitions are MACHINE — never allow config-driven new states
- Block detection must be generic: no timing side-channel (constant-time response regardless of block status)

---

### SK-24 — Four-Way AllSettled Fork with Privacy Mask Pattern

**Category:** ORCHESTRATION
**Source:** F236 (IFeedIntegrationOrchestratorService, FLOW-07 T79)
**Reusable For:** Any future multi-branch parallel analysis with mixed trust levels (e.g., credit scoring with sensitive + public factors)

**Pattern:**
```
1. Fork N branches in parallel (all start within 100ms)
2. Register EP-2 Durable Timer as deadline (survives pod restarts)
3. allSettled semantics: proceed when ALL respond OR deadline fires (whichever first)
4. Default value for timed-out branches (MACHINE: must default; FREEDOM: value)
5. Privacy mask validation: designated branches MUST return aggregate-only output
6. Privacy mask violation = BUILD FAILURE detected at AF-8 Security gate
7. Async retry for failed/timed-out branches (MUST NOT retrigger completed branches)
8. correlationKey (integrationId) on ALL events — missing = BUILD FAILURE
9. Each branch MUST be independently idempotent (replay-safe)
```

**Gotchas:**
- allSettled ≠ allResolved — one failure must NOT block others
- EP-2 timer must be registered BEFORE branch dispatch (prevents race with fast branches)
- Privacy mask cannot be post-hoc — factory itself must enforce aggregate-only returns
- Retry isolation: track branch completion state, only retrigger incomplete branches
- Default weight affects confidence score — track how many branches defaulted

---

### SK-25 — ML-Bounded Weighted Formula Pattern

**Category:** DATA PROCESSING
**Source:** F241 (IWeightCalculationService, FLOW-07 T80)
**Reusable For:** Any future scoring formula that combines deterministic formula with ML personalization (content ranking, risk assessment, recommendation scoring)

**Pattern:**
```
1. Define N factors with FIXED coefficients (MACHINE — not configurable)
2. Compute rawWeight = sum(factor[i] × coefficient[i]) for all i
3. Call ML model via AI ENGINE FABRIC (never direct import)
4. mlAdjustment = clamp(mlPrediction, -bound, +bound)  # e.g., ±0.2
5. finalWeight = clamp(rawWeight + mlAdjustment, 0.0, 1.0)
6. confidenceScore = 1.0 - (defaultedInputs × penalty)  # e.g., 0.15 per default
7. ML unavailable → mlAdjustment = 0.0 (graceful degrade, never fail)
8. Store weight history for ML training pipeline (Redis ZSET with timestamps)
9. Return DataProcessResult[dict[str, Any]] with all components
```

**Gotchas:**
- Coefficients are MACHINE (not FREEDOM) — ML adjustment handles personalization
- ML bound must be enforced BEFORE adding to rawWeight (prevent out-of-range)
- Double-clamp: clamp ML output, THEN clamp final result
- ML timeout must be short (2s) — formula should never block on ML
- Weight history is training data — retention policy matters (FREEDOM: 365 days default)
- Coefficient sum MUST equal 1.0 — validate at service startup (fail fast)

---

### SK-26 — Tiered Zone Feed Injection Pattern

**Category:** DISTRIBUTION
**Source:** F242 (IFeedInjectionService, FLOW-07 T81)
**Reusable For:** Any future tiered content injection (recommended content, sponsored posts, featured items)

**Pattern:**
```
1. Determine tier from input score using MACHINE thresholds
2. Each tier defines: post count, zone percentage, diversity rules
3. Fetch candidate posts from source (cross-flow read), filter by: window (30 days), visibility, eligibility
4. Calculate zone positions: position = base × (1 - weight) + time_decay + engagement
5. Enforce diversity: max N consecutive from same source
6. Inject BIDIRECTIONALLY (both users' feeds in single operation)
7. Store injection metadata (integrationId → posts + positions) for rollback
8. Enforce content cap (max 30% of type) — check BEFORE injecting
9. Idempotency: same integrationId = no duplicate injection
10. Emit events via DNA-8 transactional outbox
```

**Gotchas:**
- Bidirectional injection: if one feed write fails, rollback BOTH (atomic)
- Zone placement: historical posts must stay WITHIN tier zone boundaries (never above)
- 30% cap must be checked at injection time, not just at rebalance
- Private posts must be excluded BEFORE zone calculation (not after)
- Rollback must remove ALL injected posts for an integrationId (not partial)
- Weak tier: only high-engagement posts (above median for that user)

---

### SK-27 — Connection Strength Evolution Pattern

**Category:** ORCHESTRATION
**Source:** F243 (IConnectionEvolutionService, FLOW-07 T82)
**Reusable For:** Any future temporal relationship scoring (content relevance decay, user engagement scoring, subscription health)

**Pattern:**
```
1. Register EP-2 Durable Timer as ONLY trigger (no HTTP, no event trigger)
2. Acquire distributed lock before processing (prevent overlapping runs)
3. Batch-load connections (max N per batch — backpressure)
4. For each connection: compute strength delta from interaction metrics
5. Apply delta: positive → strengthen (cap 1.0), negative → decay
6. Detect dormancy: strength < threshold → mark dormant, queue reconnection prompt
7. Respect boost windows: skip connections with active new-friend boost (TTL key)
8. Enforce content cap (30%) on every rebalance run
9. Emit ConnectionStrengthUpdated via DNA-8 transactional outbox
10. Release lock after batch completion
```

**Gotchas:**
- EP-2 is the ONLY trigger — adding HTTP endpoint enables abuse (manual rebalance spam)
- Distributed lock TTL must match expected batch duration (prevent stale locks on crash)
- Boost window check BEFORE strength evolution (don't demote recently accepted friends)
- Dormancy prompts must be QUEUED, not sent synchronously (avoid notification storm during rebalance)
- Batch size is FREEDOM — tune based on infrastructure capacity
- Neo4j edge property AND Redis cache must be updated atomically

---

### SK-28 — Privacy-Masked Analyzer Pattern

**Category:** DATA PROCESSING
**Source:** F239 (IPurchaseWeightAnalyzerService) + F240 (IQuestionnaireWeightAnalyzerService, FLOW-07 T79)
**Reusable For:** Any future cross-service analysis where raw data must not cross boundaries (medical records, financial data, private communications)

**Pattern:**
```
1. Service reads sensitive data from its OWN data source (read-only access)
2. Compute aggregate score internally (sub-weight formula, 0.0-1.0)
3. Output contains ONLY: aggregate float + opaque weightFactors (named sub-scores, not raw data)
4. Raw data fields (amounts, items, answers, scores, dates) NEVER appear in output
5. Category/ID lists allowed (e.g., "category names only, no amounts")
6. Privacy mask enforced at AF-8 Security gate — raw data in output = BUILD FAILURE
7. No domain events emitted — returns weight to orchestrator only
8. Factory capability str includes "privacy-masked" for explicit tagging
9. Return DataProcessResult[dict[str, Any]] with aggregate data only
```

**Gotchas:**
- Privacy mask is not post-hoc filtering — the factory itself must never construct output containing raw fields
- "Opaque weightFactors" means named float values (e.g., "categoryOverlap: 0.7") — NOT original data
- Even in error responses, raw data must not leak (error messages must be generic)
- Logging must exclude raw data — log aggregate scores only
- Testing: inject raw data intentionally → verify BUILD FAILURE detection at AF-8

---

## FLOW-07 NUMBERING JUSTIFICATION

### Source Index (DD-15 through DD-20)
- DD-14 was last entry (FLOW-06: DNA-8 elevated to system-wide)
- DD-15 through DD-20 = +6, continuous numbering verified

### Skill Patterns (SK-23 through SK-28)
- SK-22 was last entry (FLOW-06: Cross-Currency Display Pricing)
- SK-23 through SK-28 = +6, continuous numbering verified

### Cross-Reference Verification
| DD | Maps To | SK | Maps To |
|----|---------|-----|---------|
| DD-15 (Neo4j primary write) | DR-17, F234 | SK-23 (Graph Edge Lifecycle) | F234, T77 |
| DD-16 (4-way allSettled via EP-2) | DR-18, F236 | SK-24 (Four-Way Fork) | F236, T79 |
| DD-17 (Privacy mask aggregate only) | DR-19, F239/F240 | SK-28 (Privacy-Masked Analyzer) | F239/F240, T79 |
| DD-18 (New F242 vs reuse F173) | DR-20, F242 | SK-26 (Tiered Zone Injection) | F242, T81 |
| DD-19 (Coefficients MACHINE, not FREEDOM) | F241, T80 | SK-25 (ML-Bounded Formula) | F241, T80 |
| DD-20 (Scheduled archetype, EP-2 only) | F243, T82 | SK-27 (Strength Evolution) | F243, T82 |

---

## SAVE POINT: MERGE:P4 ✅
## Next: Phase 5 — 85-point validation → FLOW07_VALIDATION.md
## Recovery: "Continue FLOW-07 Phase 5" → generate validation checklist

---

## MERGE:P4 STATE SAVE
```
MERGE:P4 = COMPLETE
Target A: UNIFIED_SOURCE_INDEX_MERGED.md
Added: FLOW-07 concept→factory map (10 entries)
Added: FLOW-07 event chain (12 events across 6 task types)
Added: FLOW-07 domain events table (12 events)
Added: DD-15 through DD-20 (6 design decisions)
Added: FLOW-07 cross-flow dependencies (8 dependencies)
Added: FLOW-07 MACHINE (15 components) + FREEDOM (14 components)
Added: FLOW-07 anti-patterns (12 anti-patterns)
Added: FLOW-07 reuse analysis (8 reuse entries)

Target B: SKILLS_FACTORY_RAG_MERGED.md
Added: SK-23 through SK-28 (6 skill patterns)
Added: FLOW-07 numbering justification + cross-reference

System: DD-1-DD-20, SK-1-SK-28
Next: MERGE:P5 -> FLOW07_VALIDATION.md
```

---

# ═══════════════════════════════════════════════════════
# FLOW-08 MERGE — Skill Patterns SK-29 through SK-36
# Merged from: FLOW08_P4_INDEX_SKILLS.md (Phase 4)
# ═══════════════════════════════════════════════════════

## FLOW-08 SKILL PATTERNS (SK-29 through SK-36)

### SK-29 — Multi-Mode Isolation Binding Pattern

**Category:** ROUTING
**Source:** F246 (ITenantIsolationBindingService, FLOW-08 T84)
**Reusable For:** Any future multi-tenant system that supports multiple isolation strategies at runtime (DB sharding, cache partitioning, storage account routing)

**Pattern:**
```
1. Accept isolation mode from tenant config (FREEDOM: shared_schema | separate_schema | separate_db | hybrid)
2. Strategy dispatch: single factory entry point routes to mode-specific internal adapter
3. Each adapter returns binding metadata (connection str ref, schema name, shard key)
4. Binding metadata cached in Redis with TTL (cache-aside, NOT write-through)
5. Cache invalidation via TENANT_BINDING_CHANGED event subscription (CF-65)
6. Compliance gate (F266) validates mode is ALLOWED for tenant's labels BEFORE binding
7. PCI + shared_schema = BLOCKED (compliance matrix). CMK + kmsProvider required for separate_db
8. Binding is IMMUTABLE within a FlowRun — resolved once at start, never re-resolved mid-flow
```

**Gotchas:**
- Cache invalidation race: event arrives → evict cache → but in-flight request still uses stale binding → F246 must version-stamp bindings and reject stale stamps
- Compliance gate must run BEFORE binding, not after — binding to a non-compliant mode is unrecoverable without migration
- Hybrid mode (shared for reads, dedicated for writes) requires TWO connection strings per binding — both must resolve or neither
- Never cache binding without TTL — tenant migration (T91) changes binding, stale forever-cache = data loss

---

### SK-30 — Strategy-Driven Provider Adapter Pattern

**Category:** CONFIGURATION
**Source:** F252 (IIdentityProviderAdapterService, FLOW-08 T85)
**Reusable For:** Any future system with runtime-swappable external providers (SMS providers, CDN providers, storage providers, notification channels)

**Pattern:**
```
1. Single factory interface with mode field: CreateAsync resolves one factory, mode dispatches internally
2. Mode stored in tenant config (FREEDOM): local | oidc | scim (for identity); stripe | adyen | braintree (for payment)
3. Each internal adapter implements identical interface contract (same return types, same error codes)
4. Provider change emits provider.bound CloudEvent with { oldProvider, newProvider, providerType }
5. Downstream consumers (CF-67 session cache, CF-71 subscriptions) react to provider.bound event
6. Secrets stored as vaultRef only — factory resolves to vault at runtime, never config plaintext
7. Health check on provider before activation: if new provider unhealthy, change BLOCKED
8. Graceful degradation: if active provider becomes unhealthy, DO NOT auto-switch — alert and wait
```

**Gotchas:**
- Provider change is NOT atomic — there's a window where old provider is deactivated but new isn't ready. Use fence pattern (CF-71) for dependencies like active subscriptions
- Never auto-switch providers on health failure — auto-switching could cause data inconsistency (e.g., switching payment provider loses in-flight charges)
- vaultRef must resolve on every request, not at startup — key rotation in vault must be transparent
- Internal adapters must normalize errors to common error codes — caller should never see provider-specific error formats

---

### SK-31 — Monotonic State Machine with Optimistic Concurrency Pattern

**Category:** DATA PROCESSING
**Source:** F258/T86/T87 (PaymentIntent state, FLOW-08 CF-70)
**Reusable For:** Any future system where multiple async paths update the same entity (order fulfillment, shipment tracking, multi-step approval workflows)

**Pattern:**
```
1. Define stateRank: ordinal integer for each state (CREATED=0, PENDING=1, CAPTURED=2, REFUNDED=3)
2. State update: WHERE stateRank < newStateRank (monotonic — never decrease)
3. Optimistic concurrency: ES _seq_no + _primary_term (or PG row version for relational)
4. Idempotency check (F260) BEFORE state comparison — deduplicate retries at entry
5. Stale update (incoming rank ≤ current rank) → SKIP silently, return success to caller
6. Concurrent conflict (optimistic lock fails) → RETRY with fresh read (max 3 attempts)
7. Terminal states (CAPTURED, FAILED) are ABSORBING — no transition out except REFUNDED from CAPTURED
8. Every state transition emits domain event via DNA-8 outbox (atomic with state write)
```

**Gotchas:**
- stateRank must be STRICT monotonic — two states with same rank (CAPTURED=2, FAILED=2) means neither can transition to the other. Design ranks carefully.
- Silent skip on stale update MUST still return 200 to caller (especially webhooks — PSP retries on non-200)
- Optimistic retry must re-read current state — don't retry with same stale state assumption
- Ledger entries (F258) only recorded on ACTUAL transitions — skipped updates must not create ledger entries

---

### SK-32 — Compensation-Gate Saga Pattern

**Category:** ORCHESTRATION
**Source:** F249/T91 (Pool→Silo Migration, FLOW-08 CF-79)
**Reusable For:** Any future multi-step operation requiring guaranteed rollback capability (complex onboarding, data pipeline migrations, multi-service provisioning)

**Pattern:**
```
1. PHASE A (REGISTER): Write compensation action to outbox BEFORE step execution
2. Compensation + step-intent written in SAME database transaction (atomic)
3. Step executor reads step-intent only WHERE status = "COMPENSATION_REGISTERED"
4. Step executor REFUSES to run if compensation record absent (CF-79 guard)
5. On step success: mark compensation as "NOT_NEEDED" (soft — retained for audit)
6. On step failure: saga orchestrator reads compensation → execute rollback
7. Compensation actions are IDEMPOTENT (F260 key on stepId) — float-rollback = no-op
8. Timeout on compensation registration: if > 30s, cancel step, pause saga, alert admin
```

**Gotchas:**
- Compensation must be written BEFORE step, never after — if step executes and compensation write fails, you have an unrollable step
- "NOT_NEEDED" compensation records MUST be retained — they serve as proof the step completed successfully (audit trail)
- Saga orchestrator must execute compensations in REVERSE order — step 5 compensation before step 4 compensation
- Each compensation must be independently testable — mock the step failure, verify compensation restores state

---

### SK-33 — GDPR Cascade with Dependency Graph Pattern

**Category:** COMPLIANCE
**Source:** F267/T88 (GDPR Data Lifecycle, FLOW-08 CF-72/CF-73/CF-74)
**Reusable For:** Any future system requiring cross-service data deletion with dependency ordering (account closure, workspace archival, data sovereignty migration)

**Pattern:**
```
1. GetDataInventoryAsync scans ALL indices — returns map of { indexName: documentCount }
2. Deletion BLOCKED if any inventory step fails (defense against silent skip)
3. Build dependency graph: which entities reference which (User→Session, User→Content, etc.)
4. Topological sort: delete LEAF entities first (no inbound references), work UP to root
5. Shared/platform-owned entities: filter by ownership before deletion (CF-73)
6. PCI-labeled data: SOFT-DELETE with PII scrub, retain non-PII for retention period (CF-74)
7. Each cascade step emits completion event → orchestrator awaits ALL before marking COMPLETE
8. Audit data EXCLUDED from cascade — retained under legal hold (IR-88-2). NEVER deleted.
```

**Gotchas:**
- Inventory scan must be POINT-IN-TIME consistent — if new data arrives during scan, cascade may miss it. Use snapshot isolation or repeat scan after cascade
- Dependency graph must include CROSS-FLOW references (FLOW-05 gamification → FLOW-02 user) — missing edges = orphaned foreign keys
- Shared content detection: check BOTH ownership field AND shared flag — some content is tenant-created but shared (community templates)
- PCI scrub must be IRREVERSIBLE — no "undo scrub" capability. Verify scrubbing removes ALL PII fields, not just known ones (extensible PII field list)

---

### SK-34 — Tiered Rate Limiting with Operation Weighting Pattern

**Category:** POLICY
**Source:** F261/T89 (Tenant Rate Control, FLOW-08 CF-75)
**Reusable For:** Any future system with multi-tier usage limits and mixed-cost operations (API monetization, compute quota management, storage throttling)

**Pattern:**
```
1. Redis sorted set per tenant+operation: ZADD with timestamp score, ZREMRANGEBYSCORE for window
2. Sliding window: remove entries older than windowStart, ZCARD for current count
3. Tier-aware limits loaded from F251 entitlement (NEVER hardcoded): free=100, pro=1000, enterprise=configurable
4. Operation weighting: AI generation=10 units, bulk import=5, standard=1 (FREEDOM config)
5. EXEMPT classification: health checks, internal service calls, metrics endpoints → NEVER limited
6. Burst handling: pro=2× window limit, enterprise=configurable multiplier, free=0 (hard cap)
7. 429 response includes Retry-After header (calculated from oldest window entry expiry)
8. Fail-OPEN on Redis failure: allow request, log degraded rate limiting, alert operations
```

**Gotchas:**
- Atomic Redis pipeline (ZADD + ZREMRANGEBYSCORE + ZCARD) — split operations create race between check and increment
- Fail-OPEN, not fail-CLOSED: Redis timeout should allow the request through, not block the user
- Operation weight must be checked BEFORE execution, not after — charging 10 units for AI gen after the request completes doesn't prevent overload
- Sliding window minimum 60s — sub-minute windows create Redis pressure at scale

---

### SK-35 — Checkpoint-and-Replay for Long-Running Operations Pattern

**Category:** MIGRATION
**Source:** F268/T91 (TenantScopedFlowRunner + Migration, FLOW-08 CF-77)
**Reusable For:** Any future system that interrupts int-running workflows for maintenance (database maintenance windows, infrastructure migration, version upgrades)

**Pattern:**
```
1. Classify active operations: SHORT-RUNNING (< 60s) → DRAIN, LONG-RUNNING → CHECKPOINT
2. Checkpoint boundaries at safe points: after each complete phase, never mid-write
3. Checkpoint document: { flowRunId, lastCompletedPhase, intermediateResults, checkpointedAt }
4. Checkpoint document migrated WITH the data (same source → target movement)
5. PAUSE signal: next checkpoint boundary → persist state → mark MIGRATION_PAUSED
6. REPLAY after migration: load checkpoint → resume from lastCompletedPhase (not from scratch)
7. Extension window: if no safe boundary within drainTimeout, extend by configurable seconds
8. Worst case: ABORT with MIGRATION_INTERRUPTED status → notify user → manual re-trigger
```

**Gotchas:**
- Checkpoint boundaries must be BETWEEN writes, never during — a checkpoint mid-transaction creates partial state at both source and target
- Replay must be IDEMPOTENT — the last completed phase might have emitted events that were already consumed. F260 idempotency key on flowRunId+phase deduplicates
- Extension window must have a HARD limit — don't wait forever for a checkpoint boundary
- Intermediate results at checkpoint may reference stale resource IDs if migration changes them — checkpoint must include resource ID mapping table

---

### SK-36 — Canary Cohort with Metrics-Driven Decision Pattern

**Category:** DEPLOYMENT
**Source:** F265/T92 (Canary Cohort Rollout, FLOW-08 CF-76)
**Reusable For:** Any future system with gradual rollout capability (feature flags with metrics, A/B testing with auto-disable, staged configuration changes)

**Pattern:**
```
1. Create cohort: select ≤ 20% of tenants, store assignment in F245 tenant config
2. Version resolution: F268 checks tenant config → routes to canary or stable version
3. Metrics collection: F262 records error rate + p95 latency per cohort (canary vs baseline)
4. Bake time: minimum evaluation period MUST elapse before any promotion decision
5. Auto-rollback trigger: error rate > threshold × baseline → immediate revert to stable
6. Rollback is INSTANTANEOUS: config change only, no data migration needed
7. Schema validation: canary events must be ADDITIVE-ONLY vs stable schema (CF-76b)
8. Promotion sequence: canary(20%) → expand(50%) → stable(100%), each with its own bake period
```

**Gotchas:**
- Canary decision must be METRICS-DRIVEN, never manual override of metrics
- In-flight FlowRuns during rollback: let them complete on canary version, but next FlowRun goes to stable
- Schema validation must happen BEFORE deployment to cohort — discovering schema regression in production means tenants already affected
- Baseline metrics must be FRESH (from current stable version, not historical)

---

## FLOW-08 Numbering Justification

### Source Index (DD-21 through DD-30)
- DD-20 was last entry (FLOW-07: Scheduled archetype, EP-2 only)
- DD-21 through DD-30 = +10, continuous numbering verified

### Skill Patterns (SK-29 through SK-36)
- SK-28 was last entry (FLOW-07: Privacy-Masked Analyzer)
- SK-29 through SK-36 = +8, continuous numbering verified

### Cross-Reference Verification
| DD | Maps To | SK | Maps To |
|----|---------|----|---------| 
| DD-21 (CloudEvents with legacyPayload) | DR-21, F247 | — (extends SK-7 from FLOW-05) | F247, ALL |
| DD-22 (Consolidated isolation binding) | DR-22, F246 | SK-29 (Multi-Mode Isolation) | F246, T84 |
| DD-23 (Strategy-driven identity adapter) | DR-23, F252 | SK-30 (Strategy-Driven Provider) | F252, T85 |
| DD-24 (Topology-aware enforcement) | DR-24, F255 | — (covered by SK-30 pattern) | F255, T84 |
| DD-25 (Cross-cutting idempotency) | DR-25, F260 | — (covered by SK-31 retry aspect) | F260, T86/T87/T88/T91 |
| DD-26 (TenantScopedFlowRunner facade) | DR-26, F268 | SK-35 (Checkpoint-and-Replay) | F268, T91 |
| DD-27 (Monotonic stateRank) | — , F258 | SK-31 (Monotonic State Machine) | F258, T86/T87 |
| DD-28 (PII scrub for PCI GDPR) | — , F267 | SK-33 (GDPR Cascade) | F267, T88 |
| DD-29 (Canary 20% initial) | — , F265 | SK-36 (Canary Cohort) | F265, T92 |
| DD-30 (Compensation-gate pattern) | — , F249 | SK-32 (Compensation-Gate Saga) | F249, T91 |

---

## SAVE POINT: MERGE:P4-F08 ✅

## MERGE:P4-F08 STATE SAVE
```
MERGE:P4-F08 = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: SK-29 through SK-36 (8 skill patterns with Pattern + Gotchas format)
Added: FLOW-08 numbering justification + cross-reference (DD-21-DD-30 → SK-29-SK-36)

System: DD-1-DD-30, SK-1-SK-36
  SK-1-SK-10  [FLOW-01 through FLOW-04]
  SK-11-SK-16 [FLOW-05, Family 24]
  SK-17-SK-22 [FLOW-06, Family 25]
  SK-23-SK-28 [FLOW-07, Family 26]
  SK-29-SK-36 [FLOW-08, Families 27-29]   ← NEW
  Next: SK-37
```

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-10 MERGE: SKILL PATTERNS SK-44-SK-55
# 12 Reusable Patterns for AF-4 RAG Retrieval
# Merged: 2026-02-26 | Source: FLOW10_P9
# ═══════════════════════════════════════════════════════════════════

# FLOW-10 — P9: SKILL PATTERNS + SOURCE INDEX
## CMS + Commerce + Multi-Tenant Platform Engine
## SK-44–SK-55 | Save Point: FLOW10:MERGE:P9
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md (Skills section)
## Sequence: CF-96–CF-130 + ST-47–ST-58 complete (P8). This file: reusable patterns.

---

# ═══════════════════════════════════════════════════
# SKILL PATTERNS — SK-44 through SK-55
# Reusable patterns for AF-4 RAG retrieval
# Each skill: pattern name, when to use, factory composition,
# Python primary implementation sketch, DNA compliance notes
# ═══════════════════════════════════════════════════

## SK-44: Tenant Isolation Router Pattern
**DOMAIN:** Multi-Tenant Infrastructure
**REFERENCED BY:** T103, T104, T106
**PURPOSE:** Runtime resolution of tenant data isolation strategy (shared_schema, separate_schema, dedicated_db) through a single factory interface. Calling code never knows which strategy is active — F246 resolves at runtime based on tier configuration.

**PATTERN:**
```
Input:  tenantId + operation context
Step 1: F246.GetIsolationBindingAsync(tenantId) → {strategy, connectionRef, schemaName}
Step 2: Switch on strategy:
          shared_schema → inject tenantId into RLS context, use pooled connection
          separate_schema → set search_path to tenant schema, use pooled connection
          dedicated_db → resolve from dedicated connection pool
Step 3: Return resolved connection context (never raw connection str)
```

**KEY CONSTRAINT:** Generated code NEVER contains connection strings, schema names, or DB driver imports. All routing through F246. Hardcoded strategy = BUILD FAILURE (IR-104-1).

**DNA COMPLIANCE:** DNA-5 (tenantId drives routing); DNA-4 (factory resolution, not direct DB); DNA-3 (DataProcessResult on routing failure)

**COMPOSITION:** F244 (tenant identity) → F246 (isolation binding) → DATABASE FABRIC (SK-382 (ElasticsearchDatabase))

---

## SK-45: Content State Machine Pattern (EP-1)
**DOMAIN:** CMS Content Lifecycle
**REFERENCED BY:** T107, T108, T109, T114
**PURPOSE:** Manage entity state transitions through EP-1 state machine registration. All transitions are atomic with outbox event write. Concurrent modification detected via optimistic lock. Reusable for both content entities (Draft→Published) and order entities (paid→fulfilled→delivered).

**PATTERN:**
```
Input:  tenantId, entityId, targetAction (e.g., "publish_now")
Step 1: F298/F294.GetCurrentStateAsync(tenantId, entityId) → {state, version}
Step 2: Validate transition legality (EP-1 state machine definition)
          Illegal → DataProcessResult.Failure({currentState, allowedActions[]})
Step 3: BEGIN TRANSACTION
          Update entity state (with version check — optimistic lock)
          Version mismatch → DataProcessResult.Conflict
          F307.AppendEventAsync(tenantId, "{entity}.{action}", payload) — SAME transaction
        COMMIT
Step 4: Return updated entity document
```

**KEY CONSTRAINT:** State transition + outbox write MUST be in same PostgreSQL transaction. Separate writes = BUILD FAILURE (IR-107-1). Side effects (search index, CDN purge) are ENQUEUED via QUEUE FABRIC after commit — never inline.

**DNA COMPLIANCE:** DNA-1 (entity = Dictionary); DNA-3 (Failure/Conflict, not exception); DNA-5 (tenantId)

**COMPOSITION:** F298/F294 (state machine) + F307 (outbox) + EP-1 (state definition) + QUEUE FABRIC (side effects)

---

## SK-46: Transactional Outbox Pattern
**DOMAIN:** Event Reliability (Cross-cutting)
**REFERENCED BY:** T107, T108, T109, T111, T113, T114, T115, T120, T122, T124
**PURPOSE:** Guarantee atomic state change + event emission. Solves the dual-write problem: if state changes in PostgreSQL but event fails to publish to Redis Streams, system is inconsistent. Outbox writes event record in same PG transaction as business state change. Background processor publishes to QUEUE FABRIC.

**PATTERN:**
```
# WRITE PATH (in business operation)
Step 1: BEGIN TRANSACTION
          Execute business state change (order creation, content publish, etc.)
          F307.AppendEventAsync(tenantId, topic, payload) — writes to outbox TABLE, same tx
        COMMIT

# PUBLISH PATH (background processor)
Step 2: F307 processor reads undelivered events from outbox table
Step 3: Publishes each to QUEUE FABRIC (Redis Streams)
Step 4: Marks event as "delivered" in outbox table
        If crash after publish before mark → event republished (consumers idempotent via F260)
```

**KEY CONSTRAINT:** AppendEventAsync MUST be called within same PG transaction as business write. Separate transaction = dual-write bug. AF-6 Code Review validates this.

**DNA COMPLIANCE:** DNA-3 (transaction failure → DataProcessResult.Failure); DNA-5 (tenantId in event payload); DNA-4 (queue via QUEUE FABRIC)

**COMPOSITION:** F307 (outbox service) + DATABASE FABRIC (PostgreSQL) + QUEUE FABRIC (Redis Streams) + F260 (consumer idempotency)

---

## SK-47: EP-2 Durable Timer Pattern
**DOMAIN:** Scheduled Operations (Cross-cutting)
**REFERENCED BY:** T111, T116
**PURPOSE:** Schedule a future action that survives service restarts. Timer payload includes all context needed to execute. Missed timers recovered on startup. Idempotent fire via F260.

**PATTERN:**
```
# SCHEDULE (e.g., T108 schedules publish, T112 sets checkout expiry)
Step 1: F306.ScheduleTimerAsync(tenantId, {
          timerKey: "content:publish:{contentId}" or "checkout:expiry:{checkoutId}",
          fireAt: scheduledTime,
          payload: {tenantId, entityId, action, idempotencyKey},
        })
Step 2: Timer persisted in PostgreSQL (survives restart)

# FIRE (EP-2 processor)
Step 3: Timer fires at scheduledTime → enqueues event to QUEUE FABRIC
Step 4: Consumer (T111 or T116) validates current state FIRST
          Still valid → execute action
          State changed → no-op (DataProcessResult.Success with noOp flag)
Step 5: F260 idempotency key prevents float-fire on crash+replay

# MISSED TIMER RECOVERY
Step 6: On startup: F306.RecoverMissedTimersAsync()
          Finds timers with fireAt < now AND status = "pending"
          Re-enqueues all → consumers handle (idempotent)
```

**KEY CONSTRAINT:** EP-2 is the ONLY timer mechanism. cron, setTimeout, sleep, or DB TTL-only = BUILD FAILURE (IR-111-8, IR-116-3). Timer payload MUST include tenantId (IR-111-5).

**DNA COMPLIANCE:** DNA-5 (tenantId in timer payload); DNA-3 (stale timer = Success with no-op, not exception)

**COMPOSITION:** F306 (timer service) + F260 (idempotency) + QUEUE FABRIC + EP-2

---

## SK-48: Optimistic Locking for Inventory
**DOMAIN:** Commerce (Inventory)
**REFERENCED BY:** T112, T113
**PURPOSE:** Prevent float-reservation and lost updates on inventory records using PostgreSQL row versioning. Two concurrent ReserveAsync calls for last unit: one succeeds, one gets Conflict.

**PATTERN:**
```
Step 1: F290.ReserveAsync(tenantId, skuId, quantity, idempotencyKey)
Step 2: SELECT stock, version FROM inventory WHERE sku_id = @skuId AND tenant_id = @tenantId
Step 3: IF stock < quantity → DataProcessResult.Failure("insufficient_stock")
Step 4: UPDATE inventory SET stock = stock - @quantity, version = version + 1
        WHERE sku_id = @skuId AND tenant_id = @tenantId AND version = @expectedVersion
Step 5: IF rows_affected = 0 → DataProcessResult.Conflict (concurrent modification)
        IF rows_affected = 1 → DataProcessResult.Success({reservationId, remainingStock})
```

**KEY CONSTRAINT:** Row version check in WHERE clause. Stale version = 0 rows updated = Conflict. Never SELECT FOR UPDATE (deadlock risk under high concurrency). Idempotency via F260 prevents float-reserve on retry.

**DNA COMPLIANCE:** DNA-3 (Conflict result, not exception); DNA-5 (tenantId in WHERE clause)

**COMPOSITION:** F290 (inventory) + F260 (idempotency) + DATABASE FABRIC (PostgreSQL)

---

## SK-49: Idempotency Key Store Pattern
**DOMAIN:** Cross-cutting (All transactional operations)
**REFERENCED BY:** T103, T112, T113, T115, T116, T117, T118, T119, T120, T122, T124
**PURPOSE:** Ensure operations execute exactly once despite retries, crash-replays, and concurrent requests. Dual-store: Redis (fast check) + PostgreSQL (durable source of truth).

**PATTERN:**
```
Step 1: F260.CheckAndSetAsync(key, ttl) where key = "tenantId:entityId:operation"
Step 2: Redis check first (fast path):
          EXISTS → return {alreadyProcessed: true, previousResult}
Step 3: Redis miss → PostgreSQL check (durable path):
          EXISTS → update Redis cache → return previous result
Step 4: Neither exists → SET in both Redis + PostgreSQL → proceed with operation
Step 5: After operation completes → F260.SetResultAsync(key, result)
          Stores operation result for future duplicate detection

TTL tiers (from F245 config):
  - Payment operations: 48h (PSP may retry for days)
  - Inventory operations: 24h
  - Content operations: 1h
  - OTP/notification: 5 min
```

**KEY CONSTRAINT:** Check MUST happen BEFORE operation, not after. Set MUST happen AFTER success. Key format: tenantId:entityId:operation — always includes tenantId.

**DNA COMPLIANCE:** DNA-5 (tenantId in key); DNA-3 (already-processed = Success with previous result)

**COMPOSITION:** F260 (idempotency) + DATABASE FABRIC (Redis + PostgreSQL)

---

## SK-50: PSP Abstraction Pattern
**DOMAIN:** Commerce (Payments)
**REFERENCED BY:** T113, T115
**PURPOSE:** Payment Service Provider (Stripe, Braintree, Adyen) accessed ONLY through F293. Raw PSP SDK never imported in generated code. PCI scope: raw card data never touches XIIGen — tokenized only.

**PATTERN:**
```
Step 1: F293.AuthorizeAsync(tenantId, {
          checkoutId, amount, currency, paymentToken, idempotencyKey
        })
        Internally: F245.GetProviderBindingAsync("payment") → PSP adapter
        PSP adapter handles Stripe/Braintree/Adyen specifics
        idempotencyKey forwarded to PSP for their dedup

Step 2: F293.CaptureAsync(tenantId, {authorizationId, amount, idempotencyKey})
        Two-step or combined based on F245 config ("paymentMode")

Step 3: On failure: F293.VoidAsync(tenantId, authorizationId)
        Releases hold without charging

Step 4: For refunds: F293.RefundAsync(tenantId, {captureId, amount, idempotencyKey})
        Partial refund supported (amount < original)
```

**KEY CONSTRAINT:** AF-7 rejects any generated code containing `stripe`, `braintree`, `adyen`, `square` as direct imports. IR-113-2, IR-115-3. Raw card numbers NEVER in any service, log, event, or record (IR-113-3). Tokenized payment methods only.

**DNA COMPLIANCE:** DNA-4 (factory resolution); DNA-3 (decline = Failure, not exception); DNA-5 (tenantId)

**COMPOSITION:** F293 (payment orchestrator) → F245 (provider binding) → AI ENGINE FABRIC (PSP adapter) + F260 (idempotency)

---

## SK-51: allSettled Fan-Out Pattern
**DOMAIN:** Product Propagation / Event Distribution
**REFERENCED BY:** T117, T119, T123
**PURPOSE:** Dispatch an event to multiple consumers in parallel where partial failure is acceptable. Unlike Promise.all (fail-fast), allSettled attempts ALL consumers regardless of individual failures.

**PATTERN:**
```
Step 1: Read entity from authoritative source (not event payload — may be stale on retry)
Step 2: Define consumers: [{factory, method, required}]
Step 3: Execute all consumers in parallel:
          results = await Promise.allSettled(consumers.map(c => c.factory.method(tenantId, entity)))
Step 4: Collect results:
          successes = results.filter(r => r.status === "fulfilled")
          failures = results.filter(r => r.status === "rejected")
Step 5: Log failures with consumer name + error code (DO NOT throw)
Step 6: Return DataProcessResult.Success({
          consumersAttempted, consumersSucceeded, consumersFailed,
          failures: [{consumer, error}]
        })
          Even with failures → overall result is Success (partial propagation)
```

**KEY CONSTRAINT:** Promise.all = BUILD FAILURE (IR-117-1). One consumer failing MUST NOT block others. All consumers called via factory interfaces — never direct ES/Redis client.

**DNA COMPLIANCE:** DNA-3 (Success even with partial failures); DNA-5 (tenantId propagated to all consumers); DNA-4 (all via factory)

**COMPOSITION:** Multiple factories (F315, F317, F318, F319) + QUEUE FABRIC (consumer events)

---

## SK-52: App Permission Scope Validator Pattern
**DOMAIN:** App Extensibility
**REFERENCED BY:** T120, T122
**PURPOSE:** Validate that scopes requested during app installation are a subset of the app manifest's declared scopes. Prevent scope escalation attacks where an app attempts to gain unauthorized data access.

**PATTERN:**
```
Step 1: F309.GetAppAsync(appId, version) → manifest.requiredScopes[]
Step 2: Validate: requestedScopes ⊆ manifest.requiredScopes
          Extra scopes found → DataProcessResult.Failure("scope_escalation", {
            requested: requestedScopes,
            allowed: manifest.requiredScopes,
            unauthorized: requestedScopes.except(manifest.requiredScopes)
          })
Step 3: F312.ValidateScopeSetAsync(requestedScopes) → {valid[], invalid[], deprecated[]}
          Unknown scope names → Failure
Step 4: F312.GrantScopesAsync(tenantId, installationId, validatedScopes)
Step 5: On uninstall: F312.RevokeScopesAsync(tenantId, installationId, allGrantedScopes)
          Cache invalidated immediately in Redis
```

**KEY CONSTRAINT:** Scope validation MANDATORY before any scope grant. Extra scope = BUILD FAILURE (IR-120-1, CF-124). CheckScopeAsync on hot path: Redis cache (60s TTL) → PostgreSQL fallback.

**DNA COMPLIANCE:** DNA-5 (tenantId + installationId); DNA-3 (escalation = Failure)

**COMPOSITION:** F309 (manifest read) + F312 (scope service) + F314 (extension point scope gate)

---

## SK-53: Webhook HMAC Signing & Verification Pattern
**DOMAIN:** App Extensibility (Webhook Delivery)
**REFERENCED BY:** T121
**PURPOSE:** Sign every outbound webhook payload with per-installation HMAC-SHA256 key. Receiving app verifies signature to confirm payload authenticity and integrity. No shared keys across tenants or installations.

**PATTERN:**
```
# SIGNING (outbound — F311)
Step 1: Retrieve signing key: F311.getSigningKey(tenantId, webhookSubscriptionId)
          Key stored encrypted in PostgreSQL, generated at installation time
Step 2: Compute signature: HMAC-SHA256(signingKey, JSON.stringify(payload))
Step 3: Set header: X-Webhook-Signature: sha256={hexEncodedSignature}
Step 4: Set header: X-Webhook-Timestamp: {ISO8601}
Step 5: Enqueue delivery via QUEUE FABRIC (not inline HTTP)

# VERIFICATION (receiving app — documented for app developers)
Step 1: Extract X-Webhook-Signature and X-Webhook-Timestamp from headers
Step 2: Reconstruct: HMAC-SHA256(app_signing_key, request_body)
Step 3: Compare computed vs received signature (constant-time comparison)
Step 4: Reject if timestamp > 5 minutes old (replay protection)
```

**KEY CONSTRAINT:** Per-installation key (never shared across tenants/installations — IR-121-3). Key generated at install time (T120), revoked at uninstall time (T122). Signing key NEVER exposed in webhook payload or logs.

**DNA COMPLIANCE:** DNA-5 (tenantId + installationId key scope)

**COMPOSITION:** F311 (webhook delivery) + F312 (scope check before delivery) + QUEUE FABRIC

---

## SK-54: Notification Dispatch with Preference Gate Pattern
**DOMAIN:** Notification Hub
**REFERENCED BY:** T124
**PURPOSE:** Route domain events to notification channels (email/SMS/push) while respecting recipient preferences, opt-outs, and quiet hours. Opt-out check MUST precede template rendering (don't waste render on suppressed notification).

**PATTERN:**
```
Step 1: Parse domain event → extract recipientId, tenantId, eventType
Step 2: F321.GetNotificationPreferencesAsync(tenantId, recipientId)
          Check: opted out for this topic? → suppress, log in F324, return Success
          Check: quiet hours active? → defer via F306 timer, return Success
Step 3: F320.RenderTemplateAsync(tenantId, templateKey, variables, locale)
          Template resolution: tenant override → platform default → locale fallback
Step 4: Route by channel preference:
          email → F322.SendEmailAsync(tenantId, rendered, idempotencyKey)
          sms → F323.SendSmsAsync(tenantId, rendered, idempotencyKey)
Step 5: F324.RecordDeliveryEventAsync(tenantId, {messageId, channel, status, recipientId})
```

**KEY CONSTRAINT:** Opt-out check BEFORE render (IR-124-1). Send idempotent via F260 (IR-124-2). ESP/SMS via F322/F323 only — direct SDK = BUILD FAILURE (IR-124-3, IR-124-4). UnsubscribeAsync is synchronous (GDPR — DD-49).

**DNA COMPLIANCE:** DNA-5 (tenantId on all ops); DNA-3 (opt-out = Success, not error)

**COMPOSITION:** F320 (template) + F321 (dispatch + preferences) + F322/F323 (delivery) + F324 (tracking) + F260 (idempotency)

---

## SK-55: Durable Workflow with Saga Compensation Pattern
**DOMAIN:** Cross-cutting (Multi-step operations)
**REFERENCED BY:** T103, T106, T120, T122
**PURPOSE:** Execute multi-step operations as durable workflows with checkpoint-and-replay. If step N fails, compensate steps N-1...1 in reverse order. Each step and compensation idempotent.

**PATTERN:**
```
# FORWARD EXECUTION
Step 1: F305.StartExecutionAsync(tenantId, workflowId, {steps: [...]})
Step 2: For each step:
          Execute step via factory interface
          F305.CheckpointAsync(stepId, result) — persists BEFORE advancing
          If step fails → go to COMPENSATION
Step 3: All steps complete → F305.CompleteAsync(workflowId)

# COMPENSATION (on failure at step N)
Step 4: F308.CompensateAsync(workflowId, failedStepIndex)
Step 5: For step = N-1 down to 1:
          Execute compensation action (defined in workflow definition)
          F305.CheckpointAsync(compensationStepId, result)
          If compensation fails → status = "partially_compensated" + ALERT
Step 6: F305.CompleteAsync(workflowId, status: "rolled_back" | "partially_compensated")

# CRASH RECOVERY
Step 7: On startup: F305 scans for executions with status = "running"
          Reconstructs state from last checkpoint
          Resumes from next unexecuted step (idempotent steps safe to re-run)
```

**KEY CONSTRAINT:** Compensation in REVERSE order (DD-43). Each step idempotent via F260. Partial compensation = alert, not silent failure. Checkpoint persisted BEFORE advancing (never skip checkpoint — IR-103-10).

**DNA COMPLIANCE:** DNA-3 (step failure = Failure, compensation failure = partial + alert); DNA-5 (tenantId in execution context)

**COMPOSITION:** F305 (execution) + F308 (compensation) + F260 (step idempotency) + F304 (workflow definition)

---

# ═══════════════════════════════════════════════════
# SKILLS SUMMARY
# ═══════════════════════════════════════════════════

| SK# | Pattern Name | Domain | Referenced By | Key Factories |
|-----|-------------|--------|--------------|---------------|
| SK-44 | Tenant Isolation Router | Multi-Tenant | T103, T104, T106 | F244, F246 |
| SK-45 | Content State Machine (EP-1) | CMS | T107-T109, T114 | F298/F294, F307, EP-1 |
| SK-46 | Transactional Outbox | Cross-cutting | T107-T115, T120-T124 | F307 |
| SK-47 | EP-2 Durable Timer | Cross-cutting | T111, T116 | F306, F260 |
| SK-48 | Optimistic Locking (Inventory) | Commerce | T112, T113 | F290, F260 |
| SK-49 | Idempotency Key Store | Cross-cutting | 11 task types | F260 |
| SK-50 | PSP Abstraction | Commerce | T113, T115 | F293, F245 |
| SK-51 | allSettled Fan-Out | Propagation | T117, T119, T123 | F315-F319 |
| SK-52 | App Permission Scope Validator | Extensibility | T120, T122 | F309, F312 |
| SK-53 | Webhook HMAC Signing | Extensibility | T121 | F311, F312 |
| SK-54 | Notification Preference Gate | Notification | T124 | F320-F324 |
| SK-55 | Durable Workflow + Saga | Cross-cutting | T103, T106, T120, T122 | F305, F308 |

---

# ═══════════════════════════════════════════════════
# SOURCE DOCUMENT INDEX
# Maps all 20 input documents to FLOW-10 output artifacts
# ═══════════════════════════════════════════════════

## Input Documents → Output Mapping

| # | Source Document | Content | Used In Phase | Key Contribution |
|---|----------------|---------|--------------|-----------------|
| 1 | 10-shops_modules.md | Initial CMS+Commerce domain spec | P0 (planning) | Domain requirements, module list |
| 2 | 10-shops_modules_deep_research.md | Deep research: platform comparison | P0, P1-P6 | WordPress/Shopify feature parity |
| 3 | 10-shops_modules_deep_research_engine.md | Engine-first architecture analysis | P0, P7a-P7b | Task type archetype mapping |
| 4 | 10-shops_modules_deep_research_engine_multi_tenant.md | Multi-tenant isolation strategies | P0, P1 (composition with FLOW-08) | Bridge vs. dedicated DB patterns |
| 5 | 10-shops_modules_deep_research_engine_multi_tenant_master_plan.md | Master plan for multi-tenant CMS+Commerce | P0 | Phase sequencing, family allocation |
| 6 | 10-shopes_modules_FLOW10_P3_COMMERCE_ENGINE.md | Commerce engine detailed spec (P3 source) | P1 | F288-F296 factory specs |
| 7 | 10-shops_modules_FLOW10_P4_WORKFLOW_EXTENSIBILITY.md | Workflow + extensibility spec (P4 source) | P3, P4 | F304-F314 factory specs |
| 8 | 10-shops_modules_FLOW10_P5_SEARCH_NOTIFICATIONS.md | Search + notification spec (P5 source) | P5, P6 | F315-F324 factory specs |
| 9 | FLOW10_P6a_TASK_TYPES.md | Task types T83-T96 (source numbering) | P7a | T103-T116 (remapped +20) |
| 10 | FLOW10_P6b_TASK_TYPES.md | Task types T97-T104 + templates (source) | P7b | T117-T124 + Templates 20-24 |
| 11 | ENGINE_ARCHITECTURE_MERGED.md | Current engine state (F1-F287, T1-T102) | P0 (baseline) | Numbering baseline, backward compat |
| 12 | TASK_TYPES_CATALOG_MERGED.md | Current task catalog (T1-T102) | P0, P7a-P7b | Sequence continuity verification |

## Critical Remap Reference

| Source Range | Actual FLOW-10 Range | Offset | Notes |
|-------------|---------------------|--------|-------|
| F258-F287 (source P3-P6) | F288-F324 | +30 | FLOW-08/09 consumed F244-F287 |
| T83-T104 (source P6a/P6b) | T103-T124 | +20 | FLOW-08/09 consumed T83-T102 |
| Templates 18-22 (source) | Templates 20-24 | +2 | FLOW-08/09 added Templates 18-19 |
| CF-64-CF-97 (source) | CF-96-CF-130 | +32 | FLOW-08/09 consumed CF-64-CF-95 |
| F270 IIdempotencyKeyService | F260 (FLOW-08 reuse) | N/A | NOT a new factory — composition |

## Composition Dependencies (FLOW-10 uses from FLOW-08)

| FLOW-08 Factory | Used By FLOW-10 | Purpose |
|----------------|-----------------|---------|
| F244 ITenantRegistryService | T103-T106 | Tenant identity |
| F245 ITenantConfigService | T105, T108, T110, T112, T118, T119, T121, T122, T124 | Provider bindings, config |
| F246 ITenantIsolationBindingService | T103, T104, T106 | Isolation strategy |
| F250 ITenantAuditService | T103-T106, T114, T121 | Audit trail |
| F251 ITenantEntitlementService | T105, T110, T118, T119, T124 | Feature gates, quotas |
| F252 IIdentityProviderAdapterService | F312 composition | Identity for app devs |
| F260 IIdempotencyKeyService | 15+ task types | Cross-cutting dedup |
| F268 ITenantScopedFlowRunnerService | T103, T106 | EP-1/EP-2 scoped |
| F269 ITenantWebhookRegistryService | F311 composition | Base webhook infra |

---

## MERGE INSTRUCTIONS

When merging into ENGINE_ARCHITECTURE_MERGED.md:

1. Append SK-44–SK-55 after existing SK-43 in skills section
2. Update counts:
   ```
   SKILL PATTERNS: SK-1-SK-55 (55 total)
   ```

---

## PHASE 9 COMPLETE: SK-44–SK-55 (12 skill patterns) + Source Index ✅
## SAVE POINT: FLOW10:MERGE:P9 ✅
## Next: Phase 10 — Final Validation Report
## Recovery: "Continue FLOW-10 from P10" → Start P10

---

## Integration Changelog (continued)

| Date | Operation | Skills | Notes |
|------|-----------|--------|-------|
| 2026-02-26 | FLOW-08 P4 merge | SK-29-SK-36 (+8) | Multi-tenant patterns |
| 2026-02-26 | FLOW-09 P4 merge | SK-37-SK-43 (+7) | Event participation patterns |
| 2026-02-26 | FLOW-10 P9 merge | SK-44-SK-55 (+12) | CMS, Commerce, Extensibility, Notification patterns |

## System State Update (Post FLOW-10 Skills Complete)

```
SKILL PATTERNS (continuous):
  SK-1-SK-10   [FLOW-01 through FLOW-04]
  SK-11-SK-16  [FLOW-05 Gamification, Family 24]
  SK-17-SK-22  [FLOW-06 Marketplace, Family 25]
  SK-23-SK-28  [FLOW-07 Social, Families 26-27]
  SK-29-SK-36  [FLOW-08 Multi-Tenant, Families 28-29]
  SK-37-SK-43  [FLOW-09 Events, Families 30-31]
  SK-44-SK-55  [FLOW-10 CMS+Commerce, Families 32-37]   <- NEW
  Next: SK-56 (FLOW-11)
```

## FLOW-10 Skill-to-Domain Map

| Domain | Skills | Coverage |
|--------|--------|----------|
| Multi-Tenant | SK-44 (Isolation Router) | T103-T106 |
| CMS | SK-45 (State Machine EP-1) | T107-T109 |
| Cross-cutting | SK-46 (Outbox), SK-47 (Timer EP-2), SK-49 (Idempotency), SK-55 (Saga) | 20+ task types |
| Commerce | SK-48 (Optimistic Lock), SK-50 (PSP Abstraction) | T112-T116 |
| Propagation | SK-51 (allSettled Fan-Out) | T117, T119, T123 |
| Extensibility | SK-52 (Scope Validator), SK-53 (HMAC Signing) | T120-T122 |
| Notifications | SK-54 (Preference Gate) | T124 |

## SAVE POINT: FLOW-10:MERGE:SKILLS ✅
## FLOW-10 SKILLS COMPLETE: SK-44-SK-55 (12 patterns)
# ═══════════════════════════════════════════════════════
# FLOW-11 — Skills Factory & RAG Index Extension
# SK-56 through SK-68 (13 skill patterns)
# Date: 2026-02-26 | Appends after SK-55 in SKILLS_FACTORY_RAG_MERGED
# ═══════════════════════════════════════════════════════

---

## SKILL PATTERNS

### SK-56 — Social Graph Traversal
**Pattern:** Neo4j graph queries via DATABASE FABRIC with tenant-partitioned graphs
**Used by:** F325, F326, F327, F330 | **Reuses:** None (first graph pattern)
**Key insight:** Graph partition by tenantId; all Cypher includes WHERE tenantId; cache traversal results in Redis

### SK-57 — Signed URL Upload Gate
**Pattern:** Pre-authorized upload URL generation → client-direct upload → ETag confirmation → metadata store
**Used by:** F331, T127 | **Reuses:** None (first object storage pattern)
**Key insight:** Binary NEVER transits fabric; F331 manages session, not bytes

### SK-58 — Media Transcode Wait State
**Pattern:** EP-2 Durable Timer as async wait gate for external pipeline completion signal
**Used by:** F333, T127 | **Reuses:** EP-2 (new usage as wait gate vs expiry timer)

### SK-59 — Feed Candidate Generation (Parallel Sources)
**Pattern:** 3 parallel source queries (graph, interests, groups) with allSettled merge + dedup
**Used by:** F339, T131 | **Reuses:** SK-51 (allSettled Fan-Out from FLOW-10)

### SK-60 — ML Ranking Ensemble
**Pattern:** Multi-model ranking via AI ENGINE FABRIC with feature store and score aggregation
**Used by:** F341, T132 | **Reuses:** AF-5 (Multi-model orchestration — adapted for ranking vs code gen)

### SK-61 — Idempotent Reaction Write
**Pattern:** PG UNIQUE constraint + Redis dedup key for high-QPS idempotent writes
**Used by:** F346, T135 | **Reuses:** SK-49 (Idempotency from FLOW-08 — adapted for reaction domain)

### SK-62 — Trust Gate Branch
**Pattern:** Graph connectivity check → branch to trusted path vs untrusted path
**Used by:** F351, T138 | **Reuses:** None (first BRANCH_GATE pattern)

### SK-63 — NLP Query Expansion
**Pattern:** AI-powered query analysis: spelling, synonyms, intent detection via AI ENGINE FABRIC
**Used by:** F357, T142 | **Reuses:** SK-385 (IAiProvider)/07 IAiProvider (text analysis variant)

### SK-64 — Multi-Model Safety Classification
**Pattern:** Parallel safety classification across 3+ models with majority-vote consensus
**Used by:** F362, T145 | **Reuses:** AF-5 (Multi-model — adapted for safety vs generation)

### SK-65 — Human-in-Loop Review Queue
**Pattern:** Priority queue with atomic reviewer assignment, SLA timers, escalation
**Used by:** F364, T147 | **Reuses:** EP-2 Durable Timer (SLA enforcement)

### SK-66 — Real-time Transport Adapter
**Pattern:** Queue-to-WebSocket adapter via QUEUE FABRIC; presence via Redis TTL
**Used by:** F354, T140 | **Reuses:** None (first real-time transport pattern)

### SK-67 — Feed Cache-Aside
**Pattern:** Redis ZSET cache with event-driven invalidation on graph/content changes
**Used by:** F343, T134 | **Reuses:** SK-48 Optimistic Lock (adapted for read-path cache)

### SK-68 — Audience Resolution (Graph + Privacy + Blocks)
**Pattern:** 3 parallel permission checks (graph connectivity, privacy rules, block list) with INTERSECTION merge
**Used by:** F328, T126 | **Reuses:** SK-51 (allSettled — adapted for permission intersection)


---

## AF-4 RAG INDEX — FLOW-11 Skill Retrieval Keywords

| Skill | Keywords for AF-4 Retrieval |
|-------|----------------------------|
| SK-56 | neo4j, graph, cypher, traversal, tenant-partitioned, edge, node |
| SK-57 | signed url, presigned, upload, etag, binary, object storage, s3 |
| SK-58 | transcode, durable timer, EP-2, wait gate, async completion signal |
| SK-59 | feed candidates, parallel sources, allSettled, dedup, merge |
| SK-60 | ml ranking, ensemble, feature store, score aggregation, IAiProvider |
| SK-61 | idempotent write, unique constraint, dedup key, high-qps, reaction |
| SK-62 | trust gate, branch gate, graph connectivity, message request, block |
| SK-63 | nlp, query expansion, spelling, synonyms, intent detection, search |
| SK-64 | safety classification, multi-model, majority vote, consensus, content |
| SK-65 | human review, priority queue, ZPOPMIN, advisory lock, SLA timer |
| SK-66 | real-time, websocket, sse, push notification, presence, transport |
| SK-67 | cache aside, ZSET, event-driven invalidation, feed cache, TTL |
| SK-68 | audience resolution, graph check, privacy, block list, intersection |

## SKILL DEPENDENCY MAP — FLOW-11

```
SK-56 (Graph Traversal) ← SK-57, SK-58
                        ← SK-59 (parallel sources include graph)
                        ← SK-62 (trust gate uses graph)
                        ← SK-68 (audience uses graph)

SK-51 (allSettled, FLOW-10) ← SK-59 (feed candidates)
                            ← SK-68 (audience resolution)

SK-49 (Idempotency, FLOW-08) ← SK-61 (reaction idempotency)

EP-2 (Durable Timer) ← SK-58 (media wait state)
                     ← SK-65 (human review SLA)

AF-5 (Multi-model) ← SK-60 (ranking ensemble)
                   ← SK-64 (safety classification)
```

## SAVE POINT: FLOW11:SKILLS ✅
## 13 skill patterns (SK-56-SK-68), 5 reuse existing patterns, 8 new patterns
-e 
---

# FLOW-12 — SKILLS FACTORY RAG UPDATE
# SK-69–SK-78 | AF-4 RAG Index | FLOW-11 Patterns
# ═══════════════════════════════════════════════════════

## FLOW-12 AF-4 RAG Mini-Index

AF-4 (Task Context RAG) uses this index when generating FLOW-12 services.
Source documents grounded in uploaded specification files.

| Source Document | Engine Contribution | Key Patterns Retrieved |
|---|---|---|
| 12_-_ERP_systems.md | ERP module mental model, 6 value streams, document chain topology | Shared master data schema, transactional document chain, financial posting rules |
| 12_-_ERP_systems_deep_search.md | Canonical schemas (erp_document, journal_entry, process_instance, idempotency_key, outbox), reliability patterns, OAuth/RBAC | Saga orchestration, transactional outbox, idempotency key pattern, reversal-not-delete |
| 12_-_ERP_systems_deep_search_engine.md | Flow runtime requirements (state machine, approval steps, compensation), CloudEvents, SAP B1SESSION, monday.com rate limits | Durable retry/backoff, webhook challenge-response, document reversal artifact |
| multi-tenant-support.md | Three-tier isolation (shared/schema/instance), per-tenant KEK, RLS enforcement, OTLP tenant labels | TenantId propagation, object-level authorization, noisy-neighbor guardrails |
| SK-379 (MicroserviceBase) (MicroserviceBase) | 19 inherited components | ALL generated FLOW-12 services extend this — DNA-4 |
| SK-383 (RedisStreamQueue) (IQueueService) | Redis Streams consumer groups, Main→Consumed→Archive→DLQ | Saga step routing (F373), outbox relay (F376), webhook ingestion (F377) |
| SK-382 (ElasticsearchDatabase) (IDatabaseService) | 6 DB providers, build_search_filter, DataProcessResult[T] | ERP document storage (F370), ledger (F371), idempotency (F374) |
| SK-386 (AiDispatcher) (AiDispatcher + IAiProvider) | Multi-model generation, consensus | Work platform connector (F372) — GraphQL as AI ENGINE FABRIC provider |
| SK-389 (HybridRagStrategy) (IRagService Hybrid) | 7 RAG strategies, Hybrid for analytics | ERP reporting analytics index (F382) |
| SK-391 (FlowOrchestrator)/09 (IFlowDefinition + IFlowOrchestrator) | JSON DAG execution, step orchestration | Template 31 DAG execution |

**Skill Gap Analysis**: No existing skill covers SAP OData B1SESSION management or monday.com
GraphQL complexity budgets. These are modeled as config-driven connector behaviors within
DATABASE and AI ENGINE fabrics. No new core skills needed — SK-69–SK-78 are FLOW-11 skill
patterns generated on top of existing Skills 01–09.

---

## FLOW-12 Skill Patterns (SK-69–SK-78)

### SK-69: ERP Document Chain Step Pattern

```
SKILL: SK-69
NAME: ERP Document Chain Step
TASK TYPES: T149
FACTORIES: F368, F370, F374, F376, F381
ARCHETYPE: STATEFUL_ORCHESTRATION

PATTERN DESCRIPTION:
  Standard pattern for any single-step document creation in O2C or P2P chain.
  Four-component co-design: idempotency check → mutation → outbox write → audit.
  All four components required together (DR-47).

PRIMARY PYTHON IMPLEMENTATION:
  class ERPDocumentChainStep(MicroserviceBase):
  {
      private readonly IExternalServiceFactory<IDocumentChainService> _chainFactory
      private readonly IExternalServiceFactory<IIdempotencyService> _idempotencyFactory
      private readonly IExternalServiceFactory<IAuditLedgerService> _auditFactory
      private readonly IExternalServiceFactory<IOutboxPublisherService> _outboxFactory
      private readonly IExternalServiceFactory<IERPConnectorService> _erpFactory
      async def ExecuteAsync(self, 
          str tenantId, str docType, str parentDocId,
          dict[str, Any] payload, str idempotencyKey)
      {
          # Step 1: Idempotency check FIRST (DR-47)
           ctx = new FactoryResolutionContext { TenantId = tenantId }
           idempotency = await _idempotencyFactory.CreateAsync(ctx)
           check = await idempotency.CheckOrCreateAsync(tenantId, idempotencyKey,
                          ObjectProcessor.ComputeHash(payload))
          if (check.Data?["isReplay"]?.ToString() == "true")
              return DataProcessResult[dict[str, Any]].Success(
                  (dict[str, Any])check.Data["cachedResult"])
          # Step 2: Resolve factories through fabric
           chain = await _chainFactory.CreateAsync(ctx)
           erp = await _erpFactory.CreateAsync(ctx)
          # Step 3: Validate chain integrity (CF-161)
           chainValid = await chain.ValidateChainIntegrityAsync(tenantId, parentDocId)
          if (!chainValid.IsSuccess)
              return DataProcessResult[dict[str, Any]].Failure(chainValid.Error)
          # Step 4: Create document via chain service (fabric resolves to correct provider)
           docResult = await chain.CreateDocumentAsync(
              tenantId, docType, parentDocId, payload, idempotencyKey)
          if (!docResult.IsSuccess)
              return docResult
          # Step 5: Outbox in same logical unit (DR-47)
           outbox = await _outboxFactory.CreateAsync(ctx)
          await outbox.WriteToOutboxAsync(tenantId, docResult.Data["docId"].ToString(),
                                           "DocumentCreated", docResult.Data)
          # Step 6: Audit BEFORE return (Iron Rule IR-149-6)
           audit = await _auditFactory.CreateAsync(ctx)
          await audit.WriteAuditAsync(tenantId, Context.ActorId, "CREATE_DOCUMENT",
                                       docResult.Data["docId"].ToString(), payload)
          # Step 7: Store idempotency result
          await idempotency.StoreResultAsync(tenantId, idempotencyKey,
                                              docResult.Data["docId"].ToString())
          return docResult; # DNA-3: DataProcessResult, never throw
      }
  }

LANGUAGE VARIANTS:
  Node.js:  async function erpDocumentChainStep(tenantId, docType, parentDocId, payload, idempotencyKey)
  Python:   async def erp_document_chain_step(tenant_id, doc_type, parent_doc_id, payload, idempotency_key)
  Java:     CompletableFuture<DataProcessResult<Map<str,Object>>> executeAsync(...)
  Rust:     async fn erp_document_chain_step(...) -> Result<DataProcessResult<HashMap<str,Value>>, Error>
  PHP:      def executeAsync(self, str $tenantId, ...): DataProcessResult

AI AGENT IMPLEMENTATION PROMPT:
  "Generate an ERP document chain step service extending MicroserviceBase.
   Use SK-69 pattern: idempotency check first (F374), chain validation (F370, CF-161),
   document creation (F370), outbox write (F376) in same transaction, audit (F381) before return.
   All data as dict[str, Any] (DNA-1). DataProcessResult[T] on all paths (DNA-3).
   tenantId in every factory call (DNA-5). No provider imports — only fabric interfaces."
```

### SK-70: Three-Way Match Gate Pattern

```
SKILL: SK-70
NAME: Three-Way Match Gate
TASK TYPES: T150
FACTORIES: F370, F373, F378, F381
ARCHETYPE: VALIDATION_GATE

PATTERN DESCRIPTION:
  Validates PO ↔ GR ↔ Vendor Invoice before AP Invoice posting is allowed.
  Branches on FULL_MATCH / VARIANCE / MISMATCH — never silently advances.
  Chain integrity check (CF-165) runs before match logic.

KEY IMPLEMENTATION NOTES:
  - tenantId validation on all three documents BEFORE F378.MatchAsync (CF-164)
  - F370.ValidateChainIntegrityAsync for GR→PO link (CF-165)
  - Variance tolerance read from FREEDOM config (CF-166)
  - MISMATCH → ALERT_AND_BLOCK; VARIANCE → T155 approval gate
  - Match result always stored and audited even on FULL_MATCH

DNA COMPLIANCE:
  DNA-1: Match records as dict[str, Any]
  DNA-3: DataProcessResult on all branch paths
  DNA-5: tenantId validated on PO, GR, and Invoice separately
```

### SK-71: Saga Coordination + LIFO Compensation Pattern

```
SKILL: SK-71
NAME: Saga Coordination with LIFO Compensation
TASK TYPES: T149 (stepping), T153 (compensation)
FACTORIES: F373, F375, F371, F370, F374, F381
ARCHETYPE: COMPENSATION

PATTERN DESCRIPTION:
  Standard saga step pattern with automatic LIFO compensation on failure.
  Each step registered in F373 saga state for compensation tracking.
  Compensation executes in reverse order (LIFO) via T153.

KEY IMPLEMENTATION NOTES:
  - F373.StartSagaAsync with correlationId at flow entry
  - F373.AdvanceStepAsync after each T149 success
  - Permanent failure (5 retries exhausted) → F373.CompensateAsync from failed step
  - T153 executes for each completed step in reverse order
  - Each T153 execution: F375.ReverseDocumentAsync → original CANCELLED + reversal POSTED

IRON RULE REFERENCE: IR-149-5 (no delete), IR-153-1 through IR-153-4
```

### SK-72: WORM Ledger + Reversal Semantics

```
SKILL: SK-72
NAME: WORM Ledger with Reversal Semantics
TASK TYPES: T153, T152 (journal entries)
FACTORIES: F371, F375
ARCHETYPE: FINANCIAL_CORRECTNESS

PATTERN DESCRIPTION:
  All financial postings create WORM (write-once) journal entries.
  Corrections always create new reversal entries — never UPDATE/DELETE.
  F371.ReverseEntryAsync produces balancing entry: credits become debits and vice versa.

KEY IMPLEMENTATION NOTES:
  - F371.PostJournalEntryAsync always requires idempotencyKey
  - Lines must balance: sum(debit) == sum(credit) before posting
  - ReverseEntryAsync: new je_id, status=POSTED, references originalJeId
  - Both original and reversal entries always queryable
  - Period reconciliation: F371.ReconcileAsync checks debit/credit equality for period

REFERENCES: DR-46 (design decision), CF-168 (BFA enforcement)
```

### SK-73: Transactional Outbox + Idempotency Co-Design

```
SKILL: SK-73
NAME: Transactional Outbox + Idempotency Co-Design (DR-47)
TASK TYPES: T149, T152, T153, T154, T156
FACTORIES: F374, F376
ARCHETYPE: RELIABILITY_PATTERN

PATTERN DESCRIPTION:
  The four-component co-design mandatory for all state-changing FLOW-11 operations:
  (1) F374.CheckOrCreateAsync as FIRST call (idempotency gate)
  (2) DB mutation (document creation, journal entry, etc.)
  (3) F376.WriteToOutboxAsync in SAME transaction as mutation
  (4) F381.WriteAuditAsync BEFORE returning success

  If any component is absent: AF-9 Judge BUILD FAILURE.
  This pattern eliminates dual-write risk and replay duplicates simultaneously.

WHEN TO APPLY: Every method that modifies ERP state (document, ledger, saga, period)
WHEN NOT TO APPLY: Read-only queries, health checks, analytics reads
```

### SK-74: Period-End Close Routine Pattern

```
SKILL: SK-74
NAME: Period-End Close Routine (R2R)
TASK TYPES: T152
FACTORIES: F379, F371, F373, F381, F382
ARCHETYPE: SCHEDULED_WORKFLOW

PATTERN DESCRIPTION:
  Five-step idempotent saga: INIT → REVALUE → ACCRUE → VALIDATE → SEAL.
  Each step idempotent and individually restartable.
  SEAL step requires: approvalToken(finance_admin) + balance_check=PASSED + pending_outbox=0.

SEQUENCE ENFORCEMENT:
  - INIT creates saga via F373 with correlationId="period_close:{tenantId}:{periodId}"
  - REVALUE: exchange rate adjustments as journal entries via F371
  - ACCRUE: expense accruals as journal entries via F371
  - VALIDATE: F371.ReconcileAsync → balance_check=PASSED or FAILED
  - SEAL: F379.FinalizeCloseAsync — only with approvalToken + PASSED + 0 pending outbox

IRON RULES: IR-152-1 through IR-152-4
BFA RULES: CF-167, CF-168, CF-169
```

### SK-75: Multi-Tenant ERP Connection Bootstrap Pattern

```
SKILL: SK-75
NAME: Multi-Tenant ERP Connection Bootstrap
TASK TYPES: T154
FACTORIES: F380, F372, F368, F369, F377
ARCHETYPE: SETUP_WORKFLOW

PATTERN DESCRIPTION:
  Ordered bootstrap sequence with BLOCKING webhook verification.
  Connection status = ACTIVE only after all steps succeed.
  Secrets always stored as vault references — never raw credentials.

STEP ORDER (enforced, not configurable):
  1. F380.RegisterConnectionAsync → store config + vault ref
  2. F377.HandleChallengeAsync via F372 → BLOCKING — entire bootstrap halts on failure
  3. F368.ConnectAsync → ERP authentication test
  4. T151 invocation → initial master data sync (partners + items + warehouses)
  5. BFA registration → new entities/events/APIs indexed

IRON RULES: IR-154-1 through IR-154-4
BFA RULES: CF-170, CF-171
```

### SK-76: ERP Approval Gate with RBAC

```
SKILL: SK-76
NAME: ERP Approval Gate with RBAC Role Enforcement
TASK TYPES: T155
FACTORIES: F373, F372, F381, F374
ARCHETYPE: HUMAN_TASK_GATE

PATTERN DESCRIPTION:
  Suspends saga at approval-required steps. Routes to appropriate RBAC role.
  Approval token stored durably in saga state for downstream idempotency.
  High-risk operations (payment runs, period seal) bypass auto-approve regardless of config.

RBAC ROLE MAPPING (FREEDOM configurable):
  finance_admin: payment runs, period close seal, three-way match override
  ap_clerk: AP invoice posting, match exception resolution
  ar_clerk: AR invoice posting
  sales_ops: sales order creation, purchase requisition approval

IRON RULES: IR-155-1 (high-risk never auto), IR-155-2 (token stored), IR-155-3 (durable state)
```

### SK-77: OData Watermark Incremental Sync Pattern

```
SKILL: SK-77
NAME: OData Watermark Incremental Sync
TASK TYPES: T151
FACTORIES: F368, F369, F374, F380, F383
ARCHETYPE: INTEGRATION_SYNC

PATTERN DESCRIPTION:
  Page-by-page incremental sync with watermark checkpoint after each page.
  Transparent B1SESSION renewal on 401. Quota enforcement before each page.
  Deduplication via F374 using watermark-based key.

OData PATTERN:
  Query: GET /EntitySet?$filter=UpdateDate gt '{watermark}'&$orderby=UpdateDate&$skiptoken={token}
  After each page: save watermark + $skiptoken as checkpoint
  On 401: F368.ConnectAsync (re-auth) → retry from last watermark (no data loss)

KEY IRON RULES: IR-151-1 (quota first), IR-151-2 (session not logged), IR-151-3 (KEK encryption)
```

### SK-78: Derived Analytics + Reconciliation Pattern

```
SKILL: SK-78
NAME: Derived Analytics + Reconciliation (CF-172 compliance)
TASK TYPES: T156
FACTORIES: F382, F376, F381
ARCHETYPE: DERIVED_DATA_SYNC

PATTERN DESCRIPTION:
  Event-driven analytics indexing from outbox relay — never polling, never direct writes.
  All records tagged source="derived" — engine enforces this via AF-7 compliance.
  Reconciliation gaps routed to human review — never auto-corrected.

CF-172 COMPLIANCE REQUIREMENTS:
  - F382.IndexDocumentEventAsync only called from outbox relay consumer
  - F382.SearchReportsAsync result NEVER flows into F371.PostJournalEntryAsync
  - Reconciliation gaps from F382.GetReconciliationGapsAsync → T155 human review task
  - AF-9 Judge static analysis validates data flow at build time

IRON RULES: IR-156-1 (not authoritative), IR-156-2 (no auto-correct), IR-156-3 (event-driven only)
```

---

## SAVE POINT: FLOW-12:MERGE:RAG ✅
## SKILLS_FACTORY_RAG_F11 COMPLETE: AF-4 index, SK-69–SK-78 (10 new patterns)

# ═══════════════════════════════════════════════════════
# FLOW-13 — Enterprise Finance Engine
# Skill Patterns SK-79–SK-88 | AF-4 RAG Index Updates
# ═══════════════════════════════════════════════════════

# 13-finance_SKILLS_FACTORY_RAG
## XIIGen Engine — FLOW-13 Finance Skill Patterns: SK-79–SK-88
## Save Point: P4-SKILLS | Status: COMPLETE ✅
## Extends: SK-1–SK-78 | Adds: SK-79–SK-88 (10 finance skill patterns)
## Used by: AF-4 (RAG — Task Context) to search reusable finance patterns

---

## RAG STRATEGY FOR FLOW-13

All SK-79–SK-88 patterns are indexed by AF-4 (RAG station) using HYBRID strategy
(keyword + semantic). When AF-1 (Genesis) generates a finance service, AF-4 retrieves
the relevant SK pattern and injects it into the generation context.

```
Retrieval triggers:
  "three-way match"       → SK-81
  "durable saga"          → SK-79
  "period lock"           → SK-82
  "float-entry"          → SK-83
  "multi-tenant finance"  → SK-86
  "bank statement"        → SK-84
  "idempotency"           → SK-85
  "SoD"/"segregation"     → SK-86
  "subledger"/"GL sync"   → SK-87
  "fiscal calendar"       → SK-88
  "revenue recognition"   → SK-82 + SK-88
```

---

## SK-79: Finance Durable Saga Entry Pattern

**Purpose:** Entry pattern for int-running finance sagas using EP-4. Registers saga with
period check, quota check, and SoD role registration before proceeding.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Finance Durable Saga Entry
# ALL document access via dict[str, Any] — no typed models (DNA-1)
# ALL returns via DataProcessResult[T] — never throw (DNA-3)
# ALL services via factory CreateAsync() — never new() (DNA-4)

class FinanceSagaEntryService(MicroserviceBase):
{
    async def StartSagaAsync(self, 
        str tenantId, str legalEntityId, str ledgerId,
        str fiscalPeriod, str flowType, str documentId, dict[str, Any] initiatorCtx)
    {
        # 1. Quota check (F425) — fail fast before any saga creation
         quotaResult = await _quotaFactory.CreateAsync(ctx)
            .Then(s => s.CheckQuotaAsync(tenantId, flowType, 1))
        if (!quotaResult.IsSuccess) return DataProcessResult[Dictionary].Failure("QUOTA_EXCEEDED")
        # 2. Period open check (F386 → EP-5)
         periodResult = await _calendarFactory.CreateAsync(ctx)
            .Then(s => s.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, fiscalPeriod))
        if (!periodResult.IsSuccess || !periodResult.Data)
            return DataProcessResult[Dictionary].Failure("PERIOD_NOT_OPEN")
        # 3. Tenant provisioned check (F424)
         tenantConfig = await _tenantFactory.CreateAsync(ctx)
            .Then(s => s.GetTenantFinanceConfigAsync(tenantId))
        if (!tenantConfig.IsSuccess) return DataProcessResult[Dictionary].Failure("TENANT_NOT_PROVISIONED")
        # 4. SoD — register initiator role (F419)
         initiatorId = (str)initiatorCtx["actor_id"]
         sodResult = await _sodFactory.CreateAsync(ctx)
            .Then(s => s.RegisterRoleAssignmentAsync(tenantId, initiatorId, "INITIATOR", documentId))
        # 5. Build idempotency key
         idempotencyKey = $"{tenantId}.{flowType}.{documentId}.v1"
        # 6. Create EP-4 saga (DATABASE FABRIC)
         sagaDoc = new dict[str, Any]
        {
            ["saga_id"] = idempotencyKey,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod,
            ["flow_type"] = flowType,
            ["document_id"] = documentId,
            ["state"] = "INITIATED",
            ["initiator_id"] = initiatorId,
            ["created_at"] = DateTime.UtcNow,
            ["isolation_tier"] = tenantConfig.Data["isolation_tier"]
        }
         filter = build_search_filter(new { saga_id = idempotencyKey })
        # Idempotency: check if saga already exists
         existingResult = await _dbService.SearchDocuments("finance_sagas", filter)
        if (existingResult.IsSuccess && existingResult.Data.Any())
            return DataProcessResult[Dictionary].Success(existingResult.Data.First())
        return await _dbService.StoreDocument("finance_sagas", sagaDoc)
    }
}
```

**Five Language Alternatives:**
- Node.js: `async startSaga(tenantId, legalEntityId, ledgerId, period, flowType, docId, ctx)`
  Uses saga-service through factory. Returns `{success, data, error}` pattern.
- Python: `async def start_saga(tenant_id, legal_entity_id, ledger_id, period, flow_type, doc_id, ctx)`
  All dicts, no dataclasses. Returns `DataProcessResult` equivalent.
- Java: `CompletableFuture<DataProcessResult<Map<str,Object>>> startSagaAsync(...)`
  All Maps, no entity classes.
- Rust: `async fn start_saga(...) -> Result<HashMap<str, Value>, FinanceError>`
- PHP: `def startSaga(self, str $tenantId, ...) : DataProcessResult`

**Used by:** T157, T162 (payment run saga entry)
**References:** EP-4 (Durable Saga Runtime), F386, F419, F424, F425

---

## SK-80: Finance Human Approval Wait State Pattern

**Purpose:** EP-4 wait state pattern for human approvals in finance workflows.
Pause saga, emit event, wait for external signal, validate SoD on resume.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Finance Human Approval Wait State
# Extends EP-4 wait state with finance-specific SoD enforcement

class FinanceApprovalGateService(MicroserviceBase):
{
    async def RequestApprovalAsync(self, 
        str tenantId, str sagaId, str documentId, str documentType,
        str initiatorId, dict[str, Any] approvalConfig)
    {
        # 1. Update saga state to WAITING_APPROVAL in EP-4
         sagaUpdate = new dict[str, Any]
        {
            ["state"] = "WAITING_APPROVAL",
            ["approval_requested_at"] = DateTime.UtcNow,
            ["initiator_id"] = initiatorId,
            ["document_type"] = documentType,
            ["timeout_hours"] = approvalConfig["timeout_hours"] # FREEDOM config
        }
        await _dbService.StoreDocument($"finance_sagas/{sagaId}", sagaUpdate)
        # 2. Emit approval.requested event to QUEUE FABRIC (never direct HTTP)
         approvalEvent = new dict[str, Any]
        {
            ["event_type"] = "approval.requested",
            ["tenant_id"] = tenantId,
            ["saga_id"] = sagaId,
            ["document_id"] = documentId,
            ["document_type"] = documentType,
            ["flow_id"] = sagaUpdate["flow_id"],
            ["correlation_id"] = $"{tenantId}.{sagaId}.approval",
            ["timestamp_utc"] = DateTime.UtcNow
        }
        await _queueService.EnqueueAsync($"finance.approval.{documentType}.{tenantId}", approvalEvent)
        return DataProcessResult[Dictionary].Success(sagaUpdate)
    }

    async def ProcessApprovalDecisionAsync(self, 
        str tenantId, str sagaId, str approverId, str decision,
        dict[str, Any] actorCtx)
    {
        # 1. Load saga — get initiator_id for SoD check
         sagaResult = await _dbService.SearchDocuments("finance_sagas",
            build_search_filter(new { saga_id = sagaId, tenant_id = tenantId }))
         saga = sagaResult.Data.First()
         initiatorId = (str)saga["initiator_id"]
        # 2. SoD validation — approver MUST NOT equal initiator (DNA-9 IR-159-2)
        if (approverId == initiatorId)
        {
            await _sodFactory.CreateAsync(ctx)
                .Then(s => s.DetectConflictsAsync(tenantId, approverId, "APPROVER", (str)saga["document_id"]))
            return DataProcessResult[Dictionary].Failure("SOD_VIOLATION: approver == initiator")
        }

        # 3. Write audit record BEFORE resuming saga (IR-159-4)
         auditDoc = new dict[str, Any]
        {
            ["actor_id"] = approverId,
            ["decision"] = decision,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["saga_id"] = sagaId,
            ["document_id"] = saga["document_id"],
            ["tenant_id"] = tenantId
        }
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, (str)saga["legal_entity_id"], auditDoc))
        # 4. Resume saga (update EP-4 state)
         resumeState = decision == "APPROVED" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED"
         stateUpdate = new dict[str, Any]
        {
            ["state"] = resumeState,
            ["approver_id"] = approverId,
            ["decision"] = decision,
            ["decided_at"] = DateTime.UtcNow
        }
        return await _dbService.StoreDocument($"finance_sagas/{sagaId}", stateUpdate)
    }
}
```

**Used by:** T159, T160 (close approval step), T162 (payment approval)
**References:** EP-4, F397, F411, F419, F418, DNA-9

---

## SK-81: Three-Way Match Implementation Pattern

**Purpose:** Core algorithm for P2P three-way match (PO ↔ GR ↔ Invoice).
Tolerance thresholds from FREEDOM config. Exception routing to DLQ.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Three-Way Match
# Tolerance from FREEDOM config (DR-55) — never hardcoded
# Partial receipts ALWAYS route to exception — never auto-approved (IR-158-7)

class ThreeWayMatchService(MicroserviceBase):
{
    async def RunMatchAsync(self, 
        str tenantId, str legalEntityId, str invoiceId)
    {
        # 1. Fetch all three documents via fabric interfaces (all as Dictionary)
         filter = build_search_filter(new { invoice_id = invoiceId, tenant_id = tenantId, legal_entity_id = legalEntityId })
         invoiceResult = await _invoiceFactory.CreateAsync(ctx).Then(s => s.GetInvoiceAsync(tenantId, legalEntityId, invoiceId))
         invoice = invoiceResult.Data; # dict[str, Any]

         poResult = await _poFactory.CreateAsync(ctx)
            .Then(s => s.GetPOAsync(tenantId, legalEntityId, (str)invoice["po_id"]))
         grResult = await _grFactory.CreateAsync(ctx)
            .Then(s => s.SearchReceiptsForPOAsync(tenantId, legalEntityId, (str)invoice["po_id"]))
        if (!poResult.IsSuccess || !grResult.IsSuccess)
            return DataProcessResult[Dictionary].Failure("PREREQUISITE_DOCUMENTS_MISSING")
         po = poResult.Data
         gr = grResult.Data.FirstOrDefault()
        # 2. Fetch tolerance from FREEDOM config (DR-55) — never hardcoded
         tolerance = await _config.GetAsync<float>($"finance.match.price_tolerance.{tenantId}")
        # 3. Compare quantities
         invoiceQty = Convert.ToDecimal(invoice["quantity"])
         grQty = gr != null ? Convert.ToDecimal(gr["quantity_received"]) : 0m
         poQty = Convert.ToDecimal(po["quantity_ordered"])
        # Partial receipt detection — ALWAYS exception (IR-158-7)
        if (grQty < poQty)
        {
            return await RouteToExceptionAsync(tenantId, legalEntityId, invoiceId,
                "PARTIAL_RECEIPT", invoiceResult.Data, po, gr, correlation: $"{tenantId}.{invoiceId}.match")
        }

        # 4. Compare prices
         invoicePrice = Convert.ToDecimal(invoice["unit_price"])
         poPrice = Convert.ToDecimal(po["unit_price"])
         priceDelta = Math.Abs(invoicePrice - poPrice) / poPrice
        if (priceDelta > tolerance)
        {
            return await RouteToExceptionAsync(tenantId, legalEntityId, invoiceId,
                "PRICE_VARIANCE", invoiceResult.Data, po, gr, correlation: $"{tenantId}.{invoiceId}.match")
        }

        # 5. Match passed — update invoice status (append-only result doc)
         matchResult = new dict[str, Any]
        {
            ["match_id"] = $"{tenantId}.{invoiceId}.matchresult",
            ["invoice_id"] = invoiceId,
            ["po_id"] = invoice["po_id"],
            ["gr_id"] = gr?["receipt_id"],
            ["status"] = "MATCHED",
            ["price_delta_pct"] = priceDelta,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["matched_at"] = DateTime.UtcNow,
            ["correlation_id"] = $"{tenantId}.{invoiceId}.match"
        }
        return await _dbService.StoreDocument("finance_match_results", matchResult)
    }

    async def route_to_exception_async(self,
        str tenantId, str legalEntityId, str invoiceId, str exceptionType,
        dict[str, Any] invoice, dict[str, Any] po, dict[str, Any] gr,
        str correlation)
    {
         exceptionDoc = new dict[str, Any]
        {
            ["exception_id"] = $"{tenantId}.{invoiceId}.exception",
            ["exception_type"] = exceptionType,
            ["invoice_id"] = invoiceId,
            ["po_id"] = invoice["po_id"],
            ["gr_id"] = gr?["receipt_id"],
            ["correlation_id"] = correlation,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["created_at"] = DateTime.UtcNow
        }
        # Store exception + route to DLQ via QUEUE FABRIC (never direct HTTP — IR-158-4)
        await _exceptionFactory.CreateAsync(ctx).Then(s => s.CreateExceptionAsync(tenantId, legalEntityId, exceptionDoc))
        await _queueService.EnqueueAsync($"finance.match.exception.{tenantId}", exceptionDoc)
        return DataProcessResult[Dictionary].Failure(exceptionType, exceptionDoc)
    }
}
```

**Used by:** T158
**References:** F391, F392, F393, F394, DR-55

---

## SK-82: Period Lock Enforcement Pattern

**Purpose:** Check EP-5 period lock state before any posting operation.
Works with IFiscalCalendarService (F386) which bridges to EP-5.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Period Lock Enforcement
# ALWAYS call this before any posting. Never bypass EP-5.

public static class PeriodLockGuard
{
    async def assert_period_open_async(
        IFiscalCalendarService calendarService,
        str tenantId, str legalEntityId, str ledgerId, str fiscalPeriod)
    {
         result = await calendarService.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, fiscalPeriod)
        if (!result.IsSuccess)
            return DataProcessResult[bool].Failure("PERIOD_CHECK_FAILED")
        if (!result.Data)
            return DataProcessResult[bool].Failure("PERIOD_NOT_OPEN",
                new dict[str, Any]
                {
                    ["tenant_id"] = tenantId,
                    ["legal_entity_id"] = legalEntityId,
                    ["ledger_id"] = ledgerId,
                    ["fiscal_period"] = fiscalPeriod,
                    ["reason"] = "CLOSED_LOCKED_OR_CLOSING"
                })
        return DataProcessResult[bool].Success(true)
    }
}

# Usage pattern in any posting service:
# periodCheck = await PeriodLockGuard.AssertPeriodOpenAsync(calendarService, tenantId, entityId, ledgerId, period)
# if (!periodCheck.IsSuccess) return DataProcessResult[T].FromFailure(periodCheck)
# ... proceed with posting ...
```

**Used by:** T157, T158, T160, T161, T162, T163, T164, T165
**References:** EP-5 (Period Lock Registry), F386

---

## SK-83: Double-Entry Journal Guard Pattern

**Purpose:** Validate debit=credit balance, account validity, and period open
before any GL posting. Used as pre-flight by all finance flow posting steps.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Double-Entry Journal Guard
# Zero tolerance: debit MUST equal credit in base currency (IR-163-1)

class DoubleEntryValidationService(MicroserviceBase):
{
    async def ValidateJournalEntryAsync(self, 
        str tenantId, str legalEntityId, str ledgerId, str fiscalPeriod,
        List<dict[str, Any]> journalLines)
    {
        # 1. Period open check (SK-82)
         calendarService = await _calendarFactory.CreateAsync(ctx).Result
         periodCheck = await PeriodLockGuard.AssertPeriodOpenAsync(calendarService,
            tenantId, legalEntityId, ledgerId, fiscalPeriod)
        if (!periodCheck.IsSuccess) return DataProcessResult[Dictionary].FromFailure(periodCheck)
        # 2. Validate account codes (F384 — never cache account validity)
         accountService = await _accountFactory.CreateAsync(ctx).Result
        foreach ( line in journalLines)
        {
             acctCode = (str)line["account_code"]
             postingType = (str)line["posting_type"]
             acctCheck = await accountService.ValidateAccountAsync(tenantId, legalEntityId, acctCode, postingType)
            if (!acctCheck.IsSuccess || !acctCheck.Data)
                return DataProcessResult[Dictionary].Failure($"INVALID_ACCOUNT: {acctCode}")
        }

        # 3. Debit/Credit balance check — zero tolerance base currency (IR-163-1)
         debits = journalLines.Where(l => (str)l["line_type"] == "DEBIT")
                                 .Sum(l => Convert.ToDecimal(l["amount_base_currency"]))
         credits = journalLines.Where(l => (str)l["line_type"] == "CREDIT")
                                  .Sum(l => Convert.ToDecimal(l["amount_base_currency"]))
        if (debits != credits)
            return DataProcessResult[Dictionary].Failure("UNBALANCED_JOURNAL",
                new dict[str, Any]
                {
                    ["debit_total"] = debits,
                    ["credit_total"] = credits,
                    ["delta"] = debits - credits
                })
        # 4. Write pre-flight audit record (F418) BEFORE posting (IR-163-8)
         auditDoc = new dict[str, Any]
        {
            ["audit_type"] = "JOURNAL_VALIDATION",
            ["line_count"] = journalLines.Count,
            ["debit_total"] = debits,
            ["credit_total"] = credits,
            ["validated_at"] = DateTime.UtcNow,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod
        }
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, legalEntityId, auditDoc))
        return DataProcessResult[Dictionary].Success(new dict[str, Any]
        {
            ["validation_status"] = "BALANCED",
            ["debit_total"] = debits,
            ["credit_total"] = credits,
            ["line_count"] = journalLines.Count
        })
    }
}
```

**Used by:** T163 (primary), all finance flows with GL posting step
**References:** F384, F386, F418, EP-5

---

## SK-84: Bank Statement Correlation Pattern

**Purpose:** Correlate bank statement lines to payment records using BANK CONNECTIVITY
FABRIC (Skill 10). Idempotent. Never direct bank API calls.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Bank Statement Correlation
# BANK CONNECTIVITY FABRIC always — never direct bank SDK (DR-54)

class BankStatementCorrelationService(MicroserviceBase):
{
    async def CorrelateStatementAsync(self, 
        str tenantId, str legalEntityId, str bankAccountId, dict[str, Any] statementDoc)
    {
        # 1. Ingest via BANK CONNECTIVITY FABRIC (Skill 10) — not raw file parsing
         bankService = await _bankFactory.CreateAsync(ctx).Result; # IBankConnectorService
         ingestResult = await bankService.IngestStatementAsync(tenantId, legalEntityId, bankAccountId, statementDoc)
        if (!ingestResult.IsSuccess) return DataProcessResult[Dictionary].FromFailure(ingestResult)
        # 2. Store statement lines via DATABASE FABRIC (Elasticsearch)
         statementLines = (List<dict[str, Any]>)ingestResult.Data["lines"]
         storeResults = new List<dict[str, Any]>()
        foreach ( line in statementLines)
        {
            line["tenant_id"] = tenantId
            line["legal_entity_id"] = legalEntityId
            line["bank_account_id"] = bankAccountId
            line["ingested_at"] = DateTime.UtcNow
            # Idempotency: line_reference is the natural key
             existing = await _dbService.SearchDocuments("bank_statement_lines",
                build_search_filter(new { line_reference = line["line_reference"], bank_account_id = bankAccountId, tenant_id = tenantId }))
            if (!existing.Data.Any())
                storeResults.Add((await _dbService.StoreDocument("bank_statement_lines", line)).Data)
        }

        # 3. Correlation — match each line to a payment record
         correlations = new List<dict[str, Any]>()
        foreach ( line in storeResults)
        {
             matchedPayment = await _dbService.SearchDocuments("finance_payments",
                build_search_filter(new
                {
                    bank_reference = line["bank_reference"],
                    amount = line["amount"],
                    tenant_id = tenantId,
                    legal_entity_id = legalEntityId
                }))
            if (matchedPayment.IsSuccess && matchedPayment.Data.Any())
            {
                correlations.Add(new dict[str, Any]
                {
                    ["line_id"] = line["line_id"],
                    ["payment_id"] = matchedPayment.Data.First()["payment_id"],
                    ["status"] = "MATCHED",
                    ["tenant_id"] = tenantId
                })
            }
        }

        return DataProcessResult[Dictionary].Success(new dict[str, Any]
        {
            ["lines_ingested"] = storeResults.Count,
            ["lines_correlated"] = correlations.Count,
            ["correlations"] = correlations
        })
    }
}
```

**Used by:** T162, F405, F408
**References:** BANK CONNECTIVITY FABRIC (Skill 10), DR-54, F405, F408

---

## SK-85: Idempotency Key Manager Pattern

**Purpose:** Generate, validate, and enforce idempotency keys for finance operations.
Prevents duplicate postings, duplicate payments, and duplicate saga creation.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Idempotency Key Manager
# Format: tenant_id.operation_type.document_id.v{version}

public static class IdempotencyKeyManager
{
    public static str GenerateKey(str tenantId, str operationType, str documentId, int version = 1)
        => $"{tenantId}.{operationType}.{documentId}.v{version}"
    async def execute_idempotent_async(
        IDatabaseService dbService,
        str idempotencyKey,
        str collectionName,
        Func<Task<DataProcessResult[T]>> operation)
    {
        # Check for existing result
         existing = await dbService.SearchDocuments(collectionName,
            build_search_filter(new { idempotency_key = idempotencyKey }))
        if (existing.IsSuccess && existing.Data.Any())
        {
            # Return existing result — idempotent (same key = same result)
            return DataProcessResult[T].Success(
                (T)(object)existing.Data.First())
        }

        # Execute operation — store result with idempotency key
         result = await operation()
        if (result.IsSuccess)
        {
             doc = new dict[str, Any]
            {
                ["idempotency_key"] = idempotencyKey,
                ["result"] = result.Data,
                ["created_at"] = DateTime.UtcNow
            }
            await dbService.StoreDocument(collectionName, doc)
        }
        return result
    }
}
```

**Used by:** T157, T162, T163, F406
**References:** EP-4 (Durable Saga idempotency), CF-175, CF-179

---

## SK-86: SoD Policy Enforcement Pattern

**Purpose:** Enforce Segregation of Duties (DNA-9) at runtime. Register roles,
detect conflicts, emit violation events. Used by AF-7 (Compliance station).

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: SoD Policy Enforcement (DNA-9)
# Called by AF-7 (Compliance) on every finance task type

class SoDEnforcementService(MicroserviceBase):
{
    # Finance SoD role matrix — sourced from FREEDOM config
    private static readonly Dictionary<str, string[]> ConflictingRoles = new()
    {
        ["INITIATOR"] = new[] { "APPROVER", "GL_POSTER", "RECONCILER" },
        ["APPROVER"]  = new[] { "INITIATOR", "GL_POSTER" },
        ["GL_POSTER"] = new[] { "INITIATOR", "APPROVER" },
        ["RECONCILER"] = new[] { "INITIATOR", "GL_POSTER" }
    }
    async def ValidateSoDAsync(self, 
        str tenantId, str documentId, dict[str, Any] actorRoles)
    {
         violations = new List<dict[str, Any]>()
        foreach ( entry in actorRoles)
        {
             actorId = entry.Key
             role = (str)entry.Value
            # Check if this actor has a conflicting role on this document
             existingRoles = await _dbService.SearchDocuments("finance_role_assignments",
                build_search_filter(new { tenant_id = tenantId, actor_id = actorId, document_id = documentId }))
            if (existingRoles.IsSuccess)
            {
                foreach ( existingAssignment in existingRoles.Data)
                {
                     existingRole = (str)existingAssignment["role"]
                    if (ConflictingRoles.ContainsKey(role) && ConflictingRoles[role].Contains(existingRole))
                    {
                        violations.Add(new dict[str, Any]
                        {
                            ["actor_id"] = actorId,
                            ["conflicting_role"] = existingRole,
                            ["requested_role"] = role,
                            ["document_id"] = documentId,
                            ["tenant_id"] = tenantId,
                            ["detected_at"] = DateTime.UtcNow
                        })
                    }
                }
            }
        }

        if (violations.Any())
        {
            # Emit SOD violation event to QUEUE FABRIC
            foreach ( v in violations)
                await _queueService.EnqueueAsync($"finance.sod.violation.{tenantId}", v)
            return DataProcessResult[Dictionary].Failure("SOD_VIOLATIONS_DETECTED",
                new dict[str, Any] { ["violations"] = violations })
        }

        return DataProcessResult[Dictionary].Success(new dict[str, Any]
        {
            ["status"] = "SOD_VALID",
            ["document_id"] = documentId,
            ["tenant_id"] = tenantId
        })
    }
}
```

**Used by:** T157, T158, T159, T160, T162, T166 — AF-7 on all finance task types
**References:** DNA-9, CF-188, F419

---

## SK-87: Subledger-GL Sync Pattern

**Purpose:** Compare AP/AR subledger balances to GL control accounts.
Surface delta amounts. Gate period lock on sync result.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Subledger-GL Sync
# Runs as part of period close (T160) and on-demand (T161)

class SubledgerGLSyncService(MicroserviceBase):
{
    async def SyncSubledgerToGLAsync(self, 
        str tenantId, str legalEntityId, str ledgerId, str fiscalPeriod,
        str subledgerType) # "AP" or "AR"
    {
        # 1. Get subledger balance (PostgreSQL via DATABASE FABRIC)
         subledgerTotal = subledgerType == "AP"
            ? await _apReconFactory.CreateAsync(ctx).Then(s => s.RunSubledgerGLSyncAsync(tenantId, legalEntityId, fiscalPeriod))
            : await _arReconFactory.CreateAsync(ctx).Then(s => s.RunSubledgerGLSyncAsync(tenantId, legalEntityId, fiscalPeriod))
        # 2. Get GL control account balance (Elasticsearch via DATABASE FABRIC)
         controlAccountFilter = build_search_filter(new
        {
            tenant_id = tenantId,
            legal_entity_id = legalEntityId,
            ledger_id = ledgerId,
            fiscal_period = fiscalPeriod,
            account_type = subledgerType == "AP" ? "AP_CONTROL" : "AR_CONTROL"
        })
         glBalance = await _dbService.SearchDocuments("finance_gl_journals", controlAccountFilter)
        # 3. Calculate delta
         subledgerAmount = (float)subledgerTotal.Data["total_balance"]
         glAmount = glBalance.Data.Sum(d => Convert.ToDecimal(d["net_amount"]))
         delta = Math.Abs(subledgerAmount - glAmount)
        # 4. Get threshold from FREEDOM config
         threshold = await _config.GetAsync<float>($"finance.sync.gap_threshold.{subledgerType}.{tenantId}")
         syncResult = new dict[str, Any]
        {
            ["subledger_type"] = subledgerType,
            ["subledger_balance"] = subledgerAmount,
            ["gl_balance"] = glAmount,
            ["delta"] = delta,
            ["threshold"] = threshold,
            ["status"] = delta <= threshold ? "IN_SYNC" : "GAP_DETECTED",
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod,
            ["synced_at"] = DateTime.UtcNow
        }
        # Write sync audit record (DR-50)
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, legalEntityId, syncResult))
        if (delta > threshold)
            return DataProcessResult[Dictionary].Failure("SYNC_GAP_EXCEEDS_THRESHOLD", syncResult)
        return DataProcessResult[Dictionary].Success(syncResult)
    }
}
```

**Used by:** T161, T160 (close checklist step)
**References:** F396, F403, F418, CF-178

---

## SK-88: Fiscal Calendar Resolver Pattern

**Purpose:** Resolve fiscal period from calendar date. Check period open state.
Central utility for all finance services that need period context.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Fiscal Calendar Resolver
# Always resolves through IFiscalCalendarService (F386) — never hardcoded dates

class FiscalCalendarResolver(MicroserviceBase):
{
    async def ResolvePeriodContextAsync(self, 
        str tenantId, str legalEntityId, str ledgerId, DateTime transactionDate)
    {
         calendarService = await _calendarFactory.CreateAsync(ctx).Result
        # 1. Resolve period from date
         periodResult = await calendarService.ResolvePeriodForDateAsync(tenantId, legalEntityId, transactionDate)
        if (!periodResult.IsSuccess)
            return DataProcessResult[Dictionary].Failure("PERIOD_RESOLUTION_FAILED")
         period = (str)periodResult.Data["fiscal_period"]
         fiscalYear = (str)periodResult.Data["fiscal_year"]
        # 2. Check period state
         isOpen = await calendarService.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, period)
        return DataProcessResult[Dictionary].Success(new dict[str, Any]
        {
            ["fiscal_period"] = period,
            ["fiscal_year"] = fiscalYear,
            ["ledger_id"] = ledgerId,
            ["legal_entity_id"] = legalEntityId,
            ["tenant_id"] = tenantId,
            ["is_open"] = isOpen.IsSuccess && isOpen.Data,
            ["period_state"] = isOpen.Data ? "OPEN" : "CLOSED_OR_LOCKED",
            ["resolved_at"] = DateTime.UtcNow
        })
    }
}
```

**Used by:** T160, T164, T165 — any finance operation that needs period context from a date
**References:** F386, EP-5, DR-51

---

## SKILLS SUMMARY — FLOW-13

| SK | Pattern | Primary Use | Task Types |
|----|---------|-------------|-----------|
| SK-79 | Finance Durable Saga Entry | EP-4 saga creation with period/quota/SoD checks | T157, T162 |
| SK-80 | Finance Human Approval Wait State | EP-4 wait + SoD enforcement on resume | T159, T160, T162 |
| SK-81 | Three-Way Match Implementation | P2P match algorithm + DLQ routing | T158 |
| SK-82 | Period Lock Enforcement | Pre-posting guard via EP-5 | T157–T166 (all) |
| SK-83 | Double-Entry Journal Guard | Debit=credit + account validity + audit | T163 |
| SK-84 | Bank Statement Correlation | Bank fabric ingestion + payment matching | T162, F405, F408 |
| SK-85 | Idempotency Key Manager | Duplicate-safe execution for all finance ops | T157, T162, T163 |
| SK-86 | SoD Policy Enforcement | DNA-9 runtime enforcement, violation events | T157–T166 (all) |
| SK-87 | Subledger-GL Sync | AP/AR subledger vs GL delta detection | T161, T160 |
| SK-88 | Fiscal Calendar Resolver | Date → fiscal period resolution | T160, T164, T165 |

## POST-FLOW-13 SKILLS TOTALS
```
Skill Patterns: SK-1–SK-88  (53 total, +10)
```

---
## SAVE POINT: P4-SKILLS ✅
## NEXT: 13-finance_UNIFIED_SOURCE_INDEX_F11.md + AF maps + templates

## RENUMBERING NOTE
FLOW-13 skills originally SK-44-SK-53. Renumbered: SK+35, F+96, T+54, IR+54, QG+54, CF+77.

## SAVE POINT: FLOW-13:MERGE:P4 ✅
## Phase 4 COMPLETE: SK-79–SK-88 (10 patterns), AF-4 RAG index updated

---

# ═══════════════════════════════════════════════════════
# FLOW-14: DATA WAREHOUSE & INTEGRATION ENGINE — SKILL PATTERNS
# SK-89–SK-98 (10 patterns with Python 3.12 + FastAPI implementations)
# ═══════════════════════════════════════════════════════

---

## SK-89: OAuth Lifecycle Management Pattern

**Purpose:** Manage full OAuth 2.0 lifecycle for external SaaS connectors: authorization code
exchange, token storage (encrypted), proactive refresh at 80% TTL, single-use refresh token
handling (Zoho pattern), and graceful revocation. All through CORE FABRIC HTTP — never SDK.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: OAuth Lifecycle Management
# F427 (vault) + F428 (refresh) — never import provider SDK

class OAuthLifecycleManager(MicroserviceBase):
{
    async def RefreshTokenAsync(self, 
        str tenantId, str connectorId)
    {
        # 1. Load encrypted credentials from vault
         credResult = await _vaultFactory.CreateAsync(ctx)
         vault = credResult.Data
         cred = await vault.GetCredentialAsync(tenantId, connectorId)
        if (!cred.IsSuccess)
            return DataProcessResult[dict[str, Any]].Failure("CREDENTIAL_NOT_FOUND")
         tokenData = cred.Data
         expiresAt = (DateTime)tokenData["expires_at"]
         ttlRemaining = (expiresAt - DateTime.UtcNow).TotalSeconds
         ttlTotal = (float)tokenData["ttl_seconds"]
        # 2. Proactive refresh at 80% TTL expiry
        if (ttlRemaining > ttlTotal * 0.20)
            return DataProcessResult[dict[str, Any]].Success(tokenData); # still fresh

        # 3. Refresh via CORE FABRIC HTTP — never provider SDK
         refreshRequest = new dict[str, Any]
        {
            ["grant_type"] = "refresh_token",
            ["refresh_token"] = tokenData["refresh_token"],
            ["client_id"] = tokenData["client_id"],
            ["client_secret"] = tokenData["client_secret"] # decrypted in-memory only
        }
         httpResult = await _httpClient.PostAsync(
            (str)tokenData["token_endpoint"], refreshRequest)
        if (!httpResult.IsSuccess)
            return DataProcessResult[dict[str, Any]].Failure("TOKEN_REFRESH_FAILED")
        # 4. Store new tokens (Zoho: refresh_token is single-use, must store new one)
         newTokens = httpResult.Data
        newTokens["tenant_id"] = tenantId
        newTokens["connector_id"] = connectorId
        newTokens["refreshed_at"] = DateTime.UtcNow
        newTokens["expires_at"] = DateTime.UtcNow.AddSeconds((float)newTokens["expires_in"])
        newTokens["ttl_seconds"] = newTokens["expires_in"]
        await vault.StoreCredentialAsync(tenantId, connectorId, newTokens); # encrypted at rest

        return DataProcessResult[dict[str, Any]].Success(newTokens)
    }
}
```

**Used by:** T167 (connector registration), T168/T170 (sync needs valid token), T177 (activation needs token)
**References:** F427, F428, DR-59, CF-198 (auth planes), CF-210 (rate limit before external call)
**DNA compliance:** dict[str, Any] (DNA-1), DataProcessResult (DNA-3), MicroserviceBase (DNA-4), tenantId scoped (DNA-5)

---

## SK-90: Paginated API Polling Pattern

**Purpose:** Generic paginated REST polling for external SaaS APIs. Handles ClickUp 100/page
with last_page flag, Zoho If-Modified-Since incremental, cursor commit per page, rate limit
check before every HTTP call. Provider-agnostic — never imports SDK.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Paginated API Polling
# F430 (rate limit) + F434 (polling) + F433 (cursor) — CORE FABRIC HTTP only

class PaginatedPollerService(MicroserviceBase):
{
    async def PollAllPagesAsync(self, 
        str tenantId, str connectorId, str entityType,
        dict[str, Any] cursorState)
    {
         totalRecords = new List<dict[str, Any]>()
         currentCursor = cursorState
         hasMore = true
        while (hasMore)
        {
            # 1. Rate limit check BEFORE every API call (CF-210)
             rateLimitService = (await _rateLimitFactory.CreateAsync(ctx)).Data
             allowed = await rateLimitService.CheckAsync(tenantId, connectorId)
            if (!allowed.IsSuccess)
            {
                # Backoff — checkpoint what we have so far
                await CommitCursorCheckpoint(tenantId, connectorId, entityType, currentCursor)
                return DataProcessResult[dict[str, Any]].Partial(
                    new dict[str, Any]
                    {
                        ["records_polled"] = totalRecords.Count,
                        ["cursor"] = currentCursor,
                        ["reason"] = "RATE_LIMIT_BACKOFF",
                        ["retry_after_seconds"] = allowed.Data?["retry_after"] ?? 60
                    })
            }

            # 2. Build request from cursor — provider-agnostic
             pollingService = (await _pollingFactory.CreateAsync(ctx)).Data
             pageResult = await pollingService.PollPageAsync(
                tenantId, connectorId, entityType, currentCursor)
            if (!pageResult.IsSuccess)
                return DataProcessResult[dict[str, Any]].Failure(pageResult.ErrorCode)
             page = pageResult.Data
             records = (List<dict[str, Any]>)page["records"]
            totalRecords.AddRange(records)
            # 3. Advance cursor (monotonic — CF-193)
            currentCursor = (dict[str, Any])page["next_cursor"]
            hasMore = (bool)page["has_more"]
            # 4. Commit cursor per page via EP-4 checkpoint (IR-168-4)
            await CommitCursorCheckpoint(tenantId, connectorId, entityType, currentCursor)
        }

        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any]
            {
                ["records_polled"] = totalRecords.Count,
                ["cursor"] = currentCursor,
                ["status"] = "COMPLETE"
            })
    }
}
```

**Used by:** T168 (incremental sync), T170 (backfill per slice)
**References:** F430, F433, F434, CF-193 (monotonic cursor), CF-210 (rate limit), EP-4
**DNA compliance:** DNA-1 (Dictionary), DNA-3 (DataProcessResult with Partial), DNA-4 (MicroserviceBase), DNA-5 (tenantId)

---

## SK-91: HMAC Webhook Verification Pattern

**Purpose:** Verify HMAC-SHA256 signatures on incoming webhooks using timing-safe comparison.
Handle ClickUp X-Signature header, Zoho orgId validation, dedup via idempotency key (eventId),
and normalized envelope fanout to QUEUE FABRIC. Reject-then-audit for invalid signatures.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: HMAC Webhook Verification
# F429 (webhook receiver) — timing-safe comparison, never process before verify

class WebhookVerifier(MicroserviceBase):
{
    async def VerifyAndProcessAsync(self, 
        str tenantId, str connectorId,
        byte[] payload, str signatureHeader, str eventId)
    {
        # 1. Load webhook secret from vault (F427)
         vault = (await _vaultFactory.CreateAsync(ctx)).Data
         secretResult = await vault.GetWebhookSecretAsync(tenantId, connectorId)
        if (!secretResult.IsSuccess)
            return DataProcessResult[dict[str, Any]].Failure("WEBHOOK_SECRET_NOT_FOUND")
        # 2. Compute expected HMAC-SHA256
         secret = (byte[])secretResult.Data["secret"]
        using  hmac = new System.Security.Cryptography.HMACSHA256(secret)
         expectedHash = hmac.ComputeHash(payload)
         expectedSig = Convert.ToHexString(expectedHash).ToLowerInvariant()
        # 3. TIMING-SAFE comparison (IR-169-1) — prevents timing attacks
         actualSig = signatureHeader?.ToLowerInvariant() ?? ""
        if (!CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(expectedSig),
            System.Text.Encoding.UTF8.GetBytes(actualSig)))
        {
            # Reject + audit (IR-169-2) — NEVER process unverified events
            await _auditService.LogOperationAsync(tenantId, "WEBHOOK_HMAC_FAILED",
                new dict[str, Any] {
                    ["connector_id"] = connectorId, ["event_id"] = eventId,
                    ["timestamp_utc"] = DateTime.UtcNow })
            return DataProcessResult[dict[str, Any]].Failure("HMAC_VERIFICATION_FAILED")
        }

        # 4. Dedup check via eventId (IR-169-5)
         dedupKey = $"webhook:{tenantId}:{connectorId}:{eventId}"
         isDuplicate = await _cacheService.ExistsAsync(dedupKey)
        if (isDuplicate)
            return DataProcessResult[dict[str, Any]].Success(
                new dict[str, Any] { ["status"] = "DUPLICATE_SKIPPED", ["event_id"] = eventId })
        # 5. Mark as processing (24h TTL dedup window)
        await _cacheService.SetAsync(dedupKey, "1", TimeSpan.FromHours(24))
        # 6. Normalize and fanout to QUEUE FABRIC
         envelope = new dict[str, Any]
        {
            ["tenant_id"] = tenantId, ["connector_id"] = connectorId,
            ["event_id"] = eventId, ["payload"] = payload,
            ["verified_at"] = DateTime.UtcNow, ["source"] = "webhook"
        }
        await _queueService.EnqueueAsync("raw.webhook.verified", envelope)
        return DataProcessResult[dict[str, Any]].Success(envelope)
    }
}
```

**Used by:** T169 (webhook ingestion gate)
**References:** F427, F429, CF-211 (HMAC before processing), IR-169-1/2/5
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-92: Multi-Zone Warehouse Pipeline Pattern

**Purpose:** Generic zone-transition pipeline: raw→staging→core→mart. Each transition is
an event-driven step through QUEUE FABRIC. Zone promotion order enforced (CF-192). Lineage
recorded at every transition (F460). Records quarantined on failure (F445), never silently dropped.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Multi-Zone Warehouse Pipeline
# CF-192 zone order enforcement — raw(1)→staging(2)→core(3)→mart(4)

class ZoneTransitionHandler(MicroserviceBase):
{
    private static readonly dict[str, int] ZoneOrder = new()
    {
        ["raw"] = 1, ["staging"] = 2, ["core"] = 3, ["mart"] = 4
    }
    async def TransitionAsync(self, 
        str tenantId, str recordId,
        str sourceZone, str targetZone, str transformType)
    {
        # 1. Enforce zone order (CF-192) — NEVER skip zones
        if (ZoneOrder[targetZone] != ZoneOrder[sourceZone] + 1)
            return DataProcessResult[dict[str, Any]].Failure(
                $"ZONE_SKIP_VIOLATION: {sourceZone}→{targetZone} not allowed")
        # 2. Audit BEFORE mutation (CF-209)
        await _auditService.LogOperationAsync(tenantId, $"ZONE_TRANSITION_{sourceZone}_TO_{targetZone}",
            new dict[str, Any] {
                ["record_id"] = recordId, ["source_zone"] = sourceZone,
                ["target_zone"] = targetZone, ["transform_type"] = transformType,
                ["timestamp_utc"] = DateTime.UtcNow })
        # 3. Execute zone-specific write (delegated to zone factory)
        # ... zone write logic ...

        # 4. Record lineage edge (F460)
         lineageService = (await _lineageFactory.CreateAsync(ctx)).Data
        await lineageService.RecordEdgeAsync(new dict[str, Any]
        {
            ["tenant_id"] = tenantId,
            ["source_zone"] = sourceZone, ["source_record_id"] = recordId,
            ["target_zone"] = targetZone, ["target_record_id"] = recordId,
            ["transform_type"] = transformType,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["sync_run_id"] = _context.CorrelationId
        })
        # 5. Emit zone transition event
        await _queueService.EnqueueAsync($"{targetZone}.written",
            new dict[str, Any] { ["tenant_id"] = tenantId, ["record_id"] = recordId })
        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] { ["status"] = "TRANSITIONED", ["target_zone"] = targetZone })
    }
}
```

**Used by:** T171 (raw→staging), T173 (staging→core), T174 (core→mart), T176 (mart→composite)
**References:** F445, F460, CF-192, CF-209, DR-58
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-93: Schema Drift Detection Pattern

**Purpose:** Detect and categorize schema changes in source data. Compare sampled raw records
against registered schema. Categorize: FIELD_ADDED (auto-accept raw/staging, admin-gate mart),
FIELD_REMOVED (quarantine + HIGH alert), TYPE_CHANGED (quarantine + CRITICAL), ENUM_EXPANDED.
Route each category to appropriate handler per DR-60 policy.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Schema Drift Detection
# F439 (schema registry) + F445 (quarantine) — DR-60 categorization

class SchemaDriftDetector(MicroserviceBase):
{
    async def DetectDriftAsync(self, 
        str tenantId, str provider, str entityType,
        List<dict[str, Any]> sampleRecords)
    {
         schemaRegistry = (await _schemaFactory.CreateAsync(ctx)).Data
         storedSchema = await schemaRegistry.GetSchemaAsync(tenantId, provider, entityType)
        if (!storedSchema.IsSuccess)
            return DataProcessResult[dict[str, Any]].Failure("SCHEMA_NOT_REGISTERED")
         storedFields = (dict[str, str])storedSchema.Data["fields"]; # fieldName→type
         observedFields = ExtractFieldsFromSamples(sampleRecords)
         drifts = new List<dict[str, Any]>()
        # Detect FIELD_ADDED
        foreach ( field in observedFields.Keys.Except(storedFields.Keys))
            drifts.Add(new dict[str, Any] {
                ["field"] = field, ["category"] = "FIELD_ADDED",
                ["observed_type"] = observedFields[field],
                ["action"] = "AUTO_ACCEPT_RAW_STAGING" # DR-60: admin-gate for mart
            })
        # Detect FIELD_REMOVED
        foreach ( field in storedFields.Keys.Except(observedFields.Keys))
            drifts.Add(new dict[str, Any] {
                ["field"] = field, ["category"] = "FIELD_REMOVED",
                ["severity"] = "HIGH",
                ["action"] = "QUARANTINE_AND_ALERT"
            })
        # Detect TYPE_CHANGED
        foreach ( field in observedFields.Keys.Intersect(storedFields.Keys))
            if (observedFields[field] != storedFields[field])
                drifts.Add(new dict[str, Any] {
                    ["field"] = field, ["category"] = "TYPE_CHANGED",
                    ["stored_type"] = storedFields[field], ["observed_type"] = observedFields[field],
                    ["severity"] = "CRITICAL",
                    ["action"] = "QUARANTINE_ADMIN_APPROVAL"
                })
        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] {
                ["tenant_id"] = tenantId, ["provider"] = provider,
                ["entity_type"] = entityType, ["drift_count"] = drifts.Count,
                ["drifts"] = drifts, ["detected_at"] = DateTime.UtcNow })
    }
}
```

**Used by:** T172 (schema drift detection gate)
**References:** F439, F445, DR-60, CF-195 (schema approval blocks mart)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-94: Probabilistic Cross-System Identity Resolution Pattern

**Purpose:** Match entities across external SaaS systems using weighted scoring signals via
RAG FABRIC (Hybrid strategy). Produce confidence score 0.0–1.0. Route: above threshold →
auto-merge dim_user (SCD-2); below → human review queue. Track provenance per attribute.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Probabilistic Identity Resolution
# F446 + RAG FABRIC (Hybrid) — DR-61 scoring, CF-204 tenant isolation

class IdentityResolver(MicroserviceBase):
{
    private static readonly dict[str, float] DefaultWeights = new()
    {
        ["email_exact"] = 0.40, ["email_domain"] = 0.10,
        ["name_fuzzy"] = 0.20, ["org_membership"] = 0.15,
        ["temporal_overlap"] = 0.10, ["manual_override"] = 0.05
    }
    async def ResolveIdentityAsync(self, 
        str tenantId, dict[str, Any] sourceEntity, str sourceProvider)
    {
        # 1. Load FREEDOM weights (admin-tunable per tenant)
         weights = await LoadWeightsFromFreedom(tenantId) ?? DefaultWeights
         threshold = await LoadThresholdFromFreedom(tenantId) ?? 0.85
        # 2. Generate candidates via RAG FABRIC (Hybrid: vector + graph)
         ragService = (await _ragFactory.CreateAsync(ctx)).Data
         candidates = await ragService.SearchAsync(new dict[str, Any] {
            ["tenant_id"] = tenantId, # CF-204: NEVER cross-tenant
            ["query_entity"] = sourceEntity,
            ["strategy"] = "Hybrid",
            ["max_candidates"] = 20
        })
        # 3. Score each candidate
         scoredMatches = new List<dict[str, Any]>()
        foreach ( candidate in (List<dict[str, Any]>)candidates.Data["results"])
        {
             score = 0.0
             signals = new dict[str, Any]()
            if (sourceEntity.ContainsKey("email") && candidate.ContainsKey("email")
                && (str)sourceEntity["email"] == (str)candidate["email"])
            { score += weights["email_exact"]; signals["email_exact"] = true; }

            # ... additional signal calculations for each weight ...

            scoredMatches.Add(new dict[str, Any] {
                ["candidate_id"] = candidate["id"], ["score"] = score,
                ["signals"] = signals, ["source_provider"] = sourceProvider })
        }

        # 4. Classify: auto-merge / review / no-match
         bestMatch = scoredMatches.OrderByDescending(m => (float)m["score"]).FirstOrDefault()
        if (bestMatch != null && (float)bestMatch["score"] >= threshold)
            return DataProcessResult[dict[str, Any]].Success(
                new dict[str, Any] {
                    ["decision"] = "AUTO_MERGE", ["match"] = bestMatch,
                    ["threshold"] = threshold, ["tenant_id"] = tenantId })
        if (bestMatch != null && (float)bestMatch["score"] > 0.3) # non-trivial signal
            return DataProcessResult[dict[str, Any]].Success(
                new dict[str, Any] {
                    ["decision"] = "REVIEW_REQUIRED", ["match"] = bestMatch,
                    ["threshold"] = threshold, ["tenant_id"] = tenantId })
        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] { ["decision"] = "NO_MATCH", ["tenant_id"] = tenantId })
    }
}
```

**Used by:** T175 (cross-system identity join), T171 (inline identity resolution during transform)
**References:** F446, F440, F449, RAG FABRIC (Hybrid), DR-61, CF-204
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-95: SCD Type 2 Dimension Loader Pattern

**Purpose:** Load dimension records using Slowly Changing Dimension Type 2. Detect attribute
changes → close old version (set effective_end) → insert new version with effective_start = now.
Point-in-time surrogate key lookup for fact FK resolution. Single current version per business key.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: SCD Type 2 Dimension Loader
# F449 — DR-62: NEVER update dim records, only version

class Scd2DimensionLoader(MicroserviceBase):
{
    async def LoadDimensionAsync(self, 
        str tenantId, str dimType, dict[str, Any] newAttributes)
    {
         dimService = (await _dimFactory.CreateAsync(ctx)).Data
         businessKey = $"{tenantId}:{dimType}:{newAttributes["natural_key"]}"
        # 1. Find current version (effective_end == null)
         current = await dimService.FindCurrentVersionAsync(tenantId, dimType, businessKey)
        if (current.IsSuccess)
        {
             currentAttrs = current.Data
            # 2. Compare attributes — detect changes
             hasChanges = DetectAttributeChanges(currentAttrs, newAttributes)
            if (!hasChanges)
                return DataProcessResult[dict[str, Any]].Success(
                    new dict[str, Any] {
                        ["action"] = "NO_CHANGE",
                        ["surrogate_key"] = currentAttrs["surrogate_key"] })
            # 3. Close old version: set effective_end = now - 1ms
            # NOTE: This is the ONLY dim "update" — closing effective_end. NOT attribute mutation.
            await dimService.CloseVersionAsync(tenantId, (int)currentAttrs["surrogate_key"],
                DateTime.UtcNow.AddMilliseconds(-1))
        }

        # 4. Insert new version with effective_start = now, effective_end = null (current)
         newVersion = new dict[str, Any]
        {
            ["tenant_id"] = tenantId, ["dim_type"] = dimType,
            ["business_key"] = businessKey, ["effective_start"] = DateTime.UtcNow,
            ["effective_end"] = null, # null = current version
        }
        foreach ( attr in newAttributes) newVersion[attr.Key] = attr.Value
         insertResult = await dimService.InsertVersionAsync(tenantId, newVersion)
        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] {
                ["action"] = current.IsSuccess ? "VERSION_CREATED" : "NEW_DIM",
                ["surrogate_key"] = insertResult.Data["surrogate_key"],
                ["business_key"] = businessKey })
    }

    async def LookupSurrogateKeyAsync(self, 
        str tenantId, str dimType, str businessKey, DateTime asOfDate)
    {
        # Point-in-time lookup: find version where asOfDate BETWEEN effective_start AND effective_end
         dimService = (await _dimFactory.CreateAsync(ctx)).Data
        return await dimService.LookupAtPointInTimeAsync(tenantId, dimType, businessKey, asOfDate)
    }
}
```

**Used by:** T173 (dim/fact refresh), T175 (identity merge → dim_user update), T178 (dim_date seed)
**References:** F449, DR-62, IR-173-1/3, QG-173-1
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-96: KPI Registry + Semantic Query Pattern

**Purpose:** Define KPIs as metadata (formula, source tables, dimensions, aggregation grain),
execute them via semantic query layer (metric definition → SQL generation → tenant-scoped execution
→ cache → result). Invalidate cache on mart refresh. Admin-only SQL explain.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: KPI Registry + Semantic Query
# F454 (metric definitions) + F455 (query execution) — mart-only reads

class KpiQueryExecutor(MicroserviceBase):
{
    async def ExecuteKpiAsync(self, 
        str tenantId, str metricId, dict[str, Any] filters)
    {
        # 1. Load metric definition from registry (F454)
         defService = (await _metricDefFactory.CreateAsync(ctx)).Data
         metricDef = await defService.GetMetricAsync(tenantId, metricId)
        if (!metricDef.IsSuccess)
            return DataProcessResult[dict[str, Any]].Failure("METRIC_NOT_FOUND")
        # 2. Check cache first (Redis, TTL from FREEDOM)
         queryService = (await _queryFactory.CreateAsync(ctx)).Data
         cacheKey = $"kpi:{tenantId}:{metricId}:{ComputeFilterHash(filters)}"
         cached = await queryService.GetCachedResultAsync(cacheKey)
        if (cached.IsSuccess)
            return cached
        # 3. Generate SQL from metric definition + tenant filters
         formula = (str)metricDef.Data["formula"]
         sourceTables = (list[str])metricDef.Data["source_tables"]
         sql = queryService.GenerateSql(formula, sourceTables, tenantId, filters)
        # SQL always includes WHERE tenant_id = @tenantId (DNA-5)

        # 4. Execute against mart layer ONLY (CF-197)
         result = await queryService.ExecuteQueryAsync(sql, tenantId)
        # 5. Cache result
         ttl = await LoadCacheTtlFromFreedom(tenantId)
        await queryService.CacheResultAsync(cacheKey, result.Data, ttl)
        return result
    }
}
```

**Used by:** T174 (KPI refresh after mart build), T176 (cross-flow KPI computation), T177 (threshold evaluation)
**References:** F454, F455, CF-197 (mart reads only), IR-176-7 (KPIs from definitions, not hardcoded)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-97: Reverse ETL with Threshold Activation Pattern

**Purpose:** Evaluate KPI thresholds → trigger activation events → consume from QUEUE FABRIC →
rate limit check → fetch credential → build external API request → execute → audit. Cooldown
enforcement prevents rapid-fire. Idempotency key prevents duplicate external actions. DR-64: all
pushes via QUEUE FABRIC, never direct HTTP.

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Reverse ETL Activation
# F456 + F430 + F427 — DR-64: event-based, never direct HTTP

class ReverseEtlActivator(MicroserviceBase):
{
    async def EvaluateAndActivateAsync(self, 
        str tenantId, str metricId, float metricValue)
    {
         etlService = (await _etlFactory.CreateAsync(ctx)).Data
        # 1. Load activation rules (FREEDOM config)
         rules = await etlService.GetActivationRulesAsync(tenantId, metricId)
        if (!rules.IsSuccess || ((List<dict[str, Any]>)rules.Data["rules"]).Count == 0)
            return DataProcessResult[dict[str, Any]].Success(
                new dict[str, Any] { ["status"] = "NO_RULES", ["metric_id"] = metricId })
         triggered = new List<dict[str, Any]>()
        foreach ( rule in (List<dict[str, Any]>)rules.Data["rules"])
        {
             threshold = (float)rule["threshold"]
             op = (str)rule["operator"]
            if (!EvaluateThreshold(metricValue, op, threshold)) continue
            # 2. Cooldown check (IR-177-5)
             cooldownMinutes = (int)rule["cooldown_minutes"]
             idempotencyKey = $"{tenantId}.{metricId}.{rule["rule_id"]}.{DateTime.UtcNow:yyyyMMdd}"
             lastTriggered = await etlService.GetLastTriggeredAsync(tenantId, (str)rule["rule_id"])
            if (lastTriggered.IsSuccess)
            {
                 elapsed = (DateTime.UtcNow - (DateTime)lastTriggered.Data["triggered_at"]).TotalMinutes
                if (elapsed < cooldownMinutes)
                {
                    triggered.Add(new dict[str, Any] {
                        ["rule_id"] = rule["rule_id"], ["status"] = "COOLDOWN_ACTIVE" })
                    continue
                }
            }

            # 3. Audit BEFORE activation (IR-177-7, CF-209)
            await _auditService.LogOperationAsync(tenantId, "ACTIVATION_TRIGGERED",
                new dict[str, Any] {
                    ["rule_id"] = rule["rule_id"], ["metric_id"] = metricId,
                    ["metric_value"] = metricValue, ["threshold"] = threshold,
                    ["idempotency_key"] = idempotencyKey })
            # 4. Publish to QUEUE FABRIC (DR-64: NEVER direct HTTP)
            await _queueService.EnqueueAsync("activation.triggered",
                new dict[str, Any] {
                    ["tenant_id"] = tenantId, ["rule"] = rule,
                    ["metric_value"] = metricValue, ["idempotency_key"] = idempotencyKey })
            triggered.Add(new dict[str, Any] {
                ["rule_id"] = rule["rule_id"], ["status"] = "TRIGGERED" })
        }

        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] { ["activations"] = triggered, ["tenant_id"] = tenantId })
    }
}
```

**Used by:** T177 (reverse ETL activation gate)
**References:** F427, F430, F456, F459, DR-64, CF-210, CF-213, IR-177-1/5/6/7
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SK-98: Data Lineage Tracking Pattern

**Purpose:** Record end-to-end lineage edges at every zone transition. Each edge:
{sourceZone, sourceRecordId, targetZone, targetRecordId, transformType, timestamp, syncRunId}.
Support backward trace ("where did this come from?") and forward trace ("where did this go?").

**Primary Implementation (Python 3.12 + FastAPI):**
```python
# SKILL: Data Lineage Tracking
# F460 — lineage edge per zone transition

class LineageTracker(MicroserviceBase):
{
    async def RecordEdgeAsync(self, 
        str tenantId, str sourceZone, str sourceRecordId,
        str targetZone, str targetRecordId, str transformType)
    {
         lineageService = (await _lineageFactory.CreateAsync(ctx)).Data
         edge = new dict[str, Any]
        {
            ["tenant_id"] = tenantId,
            ["source_zone"] = sourceZone, ["source_record_id"] = sourceRecordId,
            ["target_zone"] = targetZone, ["target_record_id"] = targetRecordId,
            ["transform_type"] = transformType,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["sync_run_id"] = _context.CorrelationId
        }
         result = await lineageService.StoreEdgeAsync(edge)
        return result
    }

    async def TraceBackwardAsync(self, 
        str tenantId, str zone, str recordId)
    {
        # Recursive backward trace: find all upstream edges until raw zone reached
         lineageService = (await _lineageFactory.CreateAsync(ctx)).Data
         chain = new List<dict[str, Any]>()
         currentZone = zone
         currentId = recordId
        while (currentZone != "raw")
        {
             edgeResult = await lineageService.FindIncomingEdgeAsync(
                tenantId, currentZone, currentId)
            if (!edgeResult.IsSuccess) break
            chain.Add(edgeResult.Data)
            currentZone = (str)edgeResult.Data["source_zone"]
            currentId = (str)edgeResult.Data["source_record_id"]
        }

        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] {
                ["tenant_id"] = tenantId, ["target_zone"] = zone,
                ["target_record_id"] = recordId, ["lineage_chain"] = chain,
                ["chain_depth"] = chain.Count })
    }
}
```

**Used by:** T173 (staging→core lineage), T174 (core→mart lineage), T176 (mart→composite lineage), ST-103
**References:** F460, IR-173-6, IR-174-7, IR-176-6, CF-192 (zone order in lineage)
**DNA compliance:** DNA-1, DNA-3, DNA-4, DNA-5

---

## SKILLS SUMMARY — FLOW-14

| SK | Pattern | Primary Use | Task Types |
|----|---------|-------------|-----------|
| SK-89 | OAuth Lifecycle Management | Token refresh, vault storage, revocation | T167, T168, T170, T177 |
| SK-90 | Paginated API Polling | Rate-limited paginated REST polling | T168, T170 |
| SK-91 | HMAC Webhook Verification | Timing-safe signature verify + dedup | T169 |
| SK-92 | Multi-Zone Warehouse Pipeline | Zone transition: raw→staging→core→mart | T171, T173, T174, T176 |
| SK-93 | Schema Drift Detection | Drift categorization + routing per DR-60 | T172 |
| SK-94 | Probabilistic Identity Resolution | Weighted scoring + auto-merge/review | T175, T171 |
| SK-95 | SCD Type 2 Dimension Loader | Dim versioning + point-in-time lookup | T173, T175, T178 |
| SK-96 | KPI Registry + Semantic Query | Metric def → SQL → cache → result | T174, T176, T177 |
| SK-97 | Reverse ETL Threshold Activation | Threshold → event → push with cooldown | T177 |
| SK-98 | Data Lineage Tracking | Edge recording + backward/forward trace | T173, T174, T176 |


## POST-FLOW-14 SKILLS TOTALS
```
Skill Patterns: SK-1–SK-98  (98 total, +10)
  SK-89: OAuth Lifecycle Management
  SK-90: Paginated API Polling
  SK-91: HMAC Webhook Verification
  SK-92: Multi-Zone Warehouse Pipeline
  SK-93: Schema Drift Detection
  SK-94: Probabilistic Cross-System Identity Resolution
  SK-95: SCD Type 2 Dimension Loader
  SK-96: KPI Registry + Semantic Query
  SK-97: Reverse ETL with Threshold Activation
  SK-98: Data Lineage Tracking
  Next: SK-99+ (FLOW-15)
```

---
## SAVE POINT: FLOW-14:MERGE:P4 ✅
## Phase 4 COMPLETE: SK-89–SK-98 (10 patterns), AF-4 RAG index updated

---

# PART 4 — SKILL PATTERNS SK-99–SK-103

## SK-99 — Workspace-Scoped Spec Chain Pattern

**Category:** PROVISIONING
**Source:** F466-F473 (Workspace → Spec → Version chain, T179-T180)
**Reusable For:** Any future flow that needs a multi-step provision chain with intermediate validation and versioning.

**Pattern:**
```
1. Create workspace container (F466) — tenant-scoped, idempotent
2. Create app project within workspace (F467) — workspace-scoped
3. Initialize default config (F468) — from FREEDOM layer
4. Accept NLP input → parse intent (F470) via AI ENGINE FABRIC
5. Generate spec diff → validate (F471) — reject if invalid
6. Create immutable version (F473) — published version is frozen
7. Emit chain-complete event via QUEUE FABRIC
All steps return DataProcessResult; any failure stops chain + emits failure event.
```

---

## SK-100 — Visual Editor Component Resolution Pattern

**Category:** SCAFFOLDING
**Source:** F478-F484 (Visual Editor Family, T181)
**Reusable For:** Any future flow that needs dynamic component resolution with real-time collaboration.

**Pattern:**
```
1. Load component catalog from F479 (DATABASE FABRIC ES — cached in Redis)
2. Resolve spec entities → matching components (AI ENGINE FABRIC suggestion)
3. Build component tree as dict[str, Any] (DNA-1)
4. Apply theme from F481 (merge design tokens from F484)
5. Store editor state in Redis (real-time) + ES (persistent)
6. Broadcast cursor positions via Redis pub/sub
7. On component drop: validate drop target (F480) → update tree → emit event
```

---

## SK-101 — Template Quality Scoring Pattern

**Category:** TEMPLATE
**Source:** F482, F485, F489 (Template Scoring, T182)
**Reusable For:** Any future flow that needs AI-assisted quality scoring and ranking.

**Pattern:**
```
1. Load template candidates from F485 (search by category/tag)
2. For each candidate: dispatch scoring prompt to AI ENGINE FABRIC
3. Score dimensions: code quality, completeness, documentation, DNA compliance
4. Aggregate scores with configurable weights (FREEDOM layer)
5. Rank and cache top-N results in Redis
6. Return ranked list via DataProcessResult<list[Dictionary]>
```

---

## SK-102 — Scaffold Generation Pipeline Pattern

**Category:** SCAFFOLDING
**Source:** F488, F469, F250 (Scaffold Gen, T183)
**Reusable For:** Any future flow that needs multi-model code generation from a structured specification.

**Pattern:**
```
1. Load validated spec from F473 (latest published version)
2. Extract schema entities (F469) — create DB migration plan
3. For each entity: generate service scaffold via AI ENGINE FABRIC (multi-model)
4. Generate API endpoints via DynamicController pattern (DNA-6)
5. Generate UI components via component library match (F479)
6. Run AF-7 DNA compliance check on all generated code
7. Run AF-8 security scan (no secrets, no injection vectors)
8. Merge multi-model outputs via AF-10 (best-of-N)
9. Create version snapshot (F473) — immutable
10. Emit ScaffoldGenerated via QUEUE FABRIC
```

---

## SK-103 — Git Bidirectional Sync Pattern

**Category:** INTEGRATION
**Source:** F491, F492 (GitHub Sync, T185)
**Reusable For:** Any future flow that needs bidirectional sync with an external version control system.

**Pattern:**
```
1. Establish cursor: store last sync point in PG (not Redis — must survive restart)
2. PUSH PATH: watch for local AppCodeChanged events → compute delta → push to GitHub
3. PULL PATH: receive GitHub webhook → verify HMAC → compute delta → apply locally
4. CONFLICT: same file changed both sides → create conflict marker, do NOT overwrite
5. CURSOR ADVANCE: only after successful push/pull completion
6. BRANCH SUPPORT: branch creation/merge via F492, each branch has own cursor
7. All operations tenant+app scoped (DNA-5)
```

---


---

# FLOW-15 — MVP BUILDER PLATFORM
## Phase 6: Skill Patterns SK-104–SK-110 | Design Decisions DD-97–DD-99 | Design Records DR-73–DR-75
## Save Point: FLOW15:P6 | Target: SKILLS_FACTORY_RAG_MERGED.md + UNIFIED_SOURCE_INDEX_MERGED.md

---

## SK-104 — GitHub Bidirectional Sync + Standalone Export Pattern

**Category:** INTEGRATION
**Source:** F491 (IGitHubSyncService, T185) + F493 (ICodeExportService, T186)
**Reusable For:** Any future flow that needs bidirectional external system synchronization with standalone export capability (e.g., Figma design sync + export, documentation publishing, configuration sync + snapshot).

**Pattern:**
```
1. SYNC PATH (continuous):
   a. Watch for local changes via QUEUE FABRIC events
   b. Compute delta (changed files since last sync point)
   c. Push delta to external system via platform-agnostic adapter
   d. Pull external changes, merge with conflict resolution (last-writer-wins or manual)
   e. Store sync cursor in DATABASE FABRIC (PG) for resume

2. EXPORT PATH (one-shot):
   a. Resolve current app spec from F245 (complete state)
   b. Collect all build artifacts from F251
   c. Strip platform-specific fabric code → replace with standard implementations
   d. Inject standalone config (env vars, connection strings placeholders)
   e. Generate README via AI ENGINE FABRIC (documentation generation)
   f. Package into archive with hash verification
   g. Emit CodeExportCompleted via QUEUE FABRIC

3. SHARED RULES:
   - Never include secrets/credentials in export or sync (AF-8 scan mandatory)
   - All file operations via DATABASE FABRIC (never direct filesystem)
   - Tenant scope enforced on all operations (DNA-5)
```

**Gotchas:**
- Sync cursor MUST persist to PG (not Redis) — survives restarts
- Export MUST strip fabric imports and replace with direct SDK calls for standalone use
- Merge conflicts during sync MUST create conflict markers, not silently overwrite

---

## SK-105 — Plugin Sandbox Resource Quota Pattern

**Category:** PROVISIONING
**Source:** F496-F500 (Plugin Family, T187/T188)
**Reusable For:** Any future flow that needs isolated execution environments with resource limits within an existing tenant boundary (e.g., custom automation sandboxes, user script execution, third-party integration containers).

**Pattern:**
```
1. REGISTRY: Global plugin catalog (shared ES index, read-only for tenants)
   + Per-tenant install records (tenant-scoped ES index)

2. INSTALL PIPELINE:
   a. Validate plugin dependencies against installed plugins
   b. Check tenant tier allows plugin installation (paywall gate via F508)
   c. Provision sandbox: container with CPU/memory/storage limits
   d. Wire managed primitives (F252-F254) into sandbox via proxy
   e. Validate plugin config schema
   f. Run connectivity test (F252 DB + F253 Storage + F254 Auth)
   g. Activate plugin

3. SANDBOX BOUNDARY:
   - Plugin → Managed Primitive: proxied, logged, rate-limited
   - Plugin → Host filesystem: BLOCKED
   - Plugin → External network: allowlist only
   - Plugin → Other plugin data: BLOCKED
   - Plugin action timeout: enforced (default 30s, FREEDOM configurable)

4. UNINSTALL:
   - Deactivate plugin
   - Cleanup sandbox container + storage
   - Remove install record
   - MUST be idempotent (IR-187-3)
```

**Gotchas:**
- Plugin data in sandbox storage MUST be included in tenant quota calculation (CF-225)
- Plugin catalog is global but install records are tenant-scoped — different indices
- Sandbox timeout kills the plugin action, not the entire sandbox container

---

## SK-106 — Copy-on-Write Sandbox Fork Pattern

**Category:** SANDBOX
**Source:** F501-F504 (Discussion/Sandbox Family, T189)
**Reusable For:** Any future flow that needs non-destructive experimentation with atomic commit/rollback (e.g., A/B testing configuration, staging environment preview, migration dry-run, database schema change preview).

**Pattern:**
```
1. FORK:
   a. Create fork record: forkId, tenantId, sourceLiveIndices, timestamp
   b. Create sandbox-prefixed indices: sandbox_{forkId}_{originalIndex}
   c. Copy-on-Write strategy:
      - READ: check sandbox index first, fall back to live index
      - WRITE: always to sandbox index (never to live)
   d. Start TTL timer (default 48h, FREEDOM configurable)

2. EXPERIMENT:
   a. All mutations go to sandbox indices
   b. Live state completely unaffected
   c. Multiple users can read sandbox via forkId parameter
   d. AI-powered diff: compare sandbox state vs live state
      - Structural diff (added/removed/changed entities)
      - AI summary via AI ENGINE FABRIC ("Added 2 pages, changed navigation order")

3. COMMIT (atomic):
   a. Create version snapshot of live state via F257 (BEFORE any changes)
   b. Run BFA validation on proposed changes
   c. If BFA passes: apply all sandbox mutations to live indices atomically
   d. If BFA fails: abort commit, sandbox remains for correction
   e. Cleanup sandbox indices after successful commit

4. DISCARD:
   a. Delete all sandbox-prefixed indices
   b. Remove fork record
   c. No live state impact

5. AUTO-EXPIRY:
   a. TTL timer fires → auto-discard
   b. Cleanup all sandbox indices + fork record
```

**Gotchas:**
- CoW read path MUST check sandbox first, then live — reverse order causes stale reads
- Atomic commit uses PG transaction wrapping ES writes (two-phase commit pattern)
- Sandbox indices MUST inherit tenant scope from live indices (DNA-5 sandwich)

---

## SK-107 — Subscription State Machine Pattern

**Category:** BILLING
**Source:** F505 (ISubscriptionManagerService, T190)
**Reusable For:** Any future flow with lifecycle state management requiring prorated transitions, grace periods, and time-based state advancement (e.g., trial-to-paid membership, SaaS license management, content access control).

**Pattern:**
```
STATE MACHINE:
  TRIAL → ACTIVE (payment success) | EXPIRED (timer fires, no conversion)
  ACTIVE → SUSPENDED (payment failure + grace period expired)
  ACTIVE → CANCELED (user request — honor paid-through date)
  SUSPENDED → ACTIVE (payment recovered)
  SUSPENDED → CANCELED (recovery timeout)
  EXPIRED → ACTIVE (late conversion)
  CANCELED → (terminal — no transitions out)

  INVALID TRANSITIONS (MACHINE — never overrideable):
  CANCELED → ACTIVE (must create new subscription)
  TRIAL → SUSPENDED (can't suspend what hasn't paid)
  ANY → TRIAL (trial is one-time only per tenant per plan)

PRORATION:
  1. Compute remaining days in current period
  2. Compute daily rate of current plan (amount_cents / period_days)
  3. Credit = remaining_days × current_daily_rate (integer cents)
  4. New charge = new_plan_amount_cents - credit
  5. If credit > new_plan_amount: store as account credit (never negative invoice)
  ALL amounts in integer cents (IR-190-8)

ENTITLEMENT SYNC:
  1. On state change → publish SubscriptionChanged event
  2. F508 subscribes → refresh entitlement cache within 300s (IR-190-4)
  3. Trial features = plan features (no artificial limitation during trial)

TIMERS (all via EP-2):
  - Trial expiry: fires at trial_end_date
  - Grace period: fires at payment_failed_date + grace_period_days
  - Recovery timeout: fires at suspended_date + recovery_timeout_days
```

**Gotchas:**
- ALL amounts in integer cents — never floating point (financial precision)
- Grace period means user keeps access — DO NOT revoke during grace
- Proration credit can exceed new plan cost — store as credit, don't refund automatically
- EP-2 timers survive restarts — critical for trial/grace enforcement

---

## SK-108 — Usage Metering Time-Window Aggregation Pattern

**Category:** METERING
**Source:** F506 (IUsageMeteringService, T191)
**Reusable For:** Any future flow that needs time-bucketed event aggregation with tiered pricing and anomaly detection (e.g., API rate metering, resource consumption billing, bandwidth tracking, AI token usage billing).

**Pattern:**
```
1. RAW EVENT INGESTION:
   a. Usage event arrives (api_call, storage_byte, ai_token, compute_second)
   b. Append to `usage_raw_{tenantId}` (immutable, append-only — DR-58 reuse)
   c. Increment Redis counter: `meter:{tenantId}:{metric}:{period}` (atomic INCR)
   d. Check threshold: if counter > 80% limit → alert; > 100% → enforce

2. WINDOW AGGREGATION (triggered by BillingPeriodEndReached):
   a. Determine window: (tenantId, periodStart, periodEnd)
   b. Idempotency check: if aggregation record exists for this window → return cached
   c. Sum raw events in window from ES index
   d. Reconcile: |Redis counter - ES sum| must be < 0.01% (IR-191-5)
   e. Apply tiered pricing:
      - Tier 1: first N units free (or at rate_1)
      - Tier 2: next M units at rate_2
      - Tier N: remaining at rate_N
      All rates in integer microcents (1 cent = 100 microcents)
   f. Store aggregation result
   g. Feed to F507 invoicing pipeline
   h. Reset Redis quota counters for new period

3. ANOMALY DETECTION:
   a. Compare current period usage to rolling 3-period average
   b. If current > average × spike_multiplier → flag for review
   c. Flagged usage is NOT auto-billed (held for admin approval)
```

**Gotchas:**
- Window boundaries MUST be deterministic (UTC midnight for daily) — timezone drift = float-counting
- Redis counter and ES sum MUST reconcile — drift means lost events or float-counting
- Anomaly flag prevents auto-billing — critical for preventing billing shock

---

## SK-109 — Paywall Gate Enforcement Pattern

**Category:** ENFORCEMENT
**Source:** F508 (IPaywallGateService, T192)
**Reusable For:** Any future flow that needs real-time access control based on dynamic entitlements (e.g., feature flagging by subscription tier, rate limiting by plan, premium content access, API tier enforcement).

**Pattern:**
```
1. REQUEST INTERCEPT:
   a. Middleware intercepts feature access request
   b. Extract: tenantId, featureId, userId

2. ENTITLEMENT CHECK:
   a. Check Redis cache: `entitlement:{tenantId}:{featureId}`
   b. If cache HIT + not expired → use cached decision
   c. If cache MISS or expired:
      - Query F505 for current subscription tier
      - Query F506 for current usage count
      - Compute decision: ALLOW / SOFT_BLOCK / HARD_BLOCK
      - Cache decision with TTL (default 300s)

3. DECISION LOGIC:
   ALLOW:
     - Feature included in current plan
     - Usage below quota
     - Grace period active (from T190 payment failure)
   SOFT_BLOCK:
     - Feature NOT in current plan but available in upgrade
     - Return: 200 + upgrade prompt (UX hint, not HTTP error)
   HARD_BLOCK:
     - Usage quota exceeded
     - Subscription suspended/canceled
     - Return: 402 Payment Required + reason + upgrade options

4. AUDIT:
   - Log every decision: (tenantId, featureId, decision, timestamp, userId)
   - Feed to AF-11 for conversion analytics

5. CACHE INVALIDATION:
   - Subscribe to SubscriptionChanged events from F505
   - On change: invalidate all `entitlement:{tenantId}:*` keys
   - Next request triggers fresh lookup
```

**Gotchas:**
- Cache miss MUST default to DENY (never allow) — IR-192-3
- Soft-block is a UX feature, not a security boundary — client-side only
- Middleware order: Auth → Paywall → Business Logic (CF-232)
- Grace period = ALLOW (not soft-block — user has paid, payment just failed)

---

## SK-110 — AI-Powered Diff Preview Pattern

**Category:** AI TRANSFORMATION
**Source:** F503 (IDiffPreviewService, T189)
**Reusable For:** Any future flow where two states need structural comparison with human-readable AI summary (e.g., schema diff, configuration change preview, migration impact preview, A/B test result comparison).

**Pattern:**
```
1. STRUCTURAL DIFF:
   a. Fetch snapshot A (e.g., live state)
   b. Fetch snapshot B (e.g., sandbox state)
   c. Compute diff: added entities, removed entities, modified entities
   d. For each modified entity: field-level diff (before/after values)
   e. Store diff as dict[str, Any] (DNA-1)

2. AI SUMMARY:
   a. Build prompt: inject structural diff as context
   b. Call AI ENGINE FABRIC (IAiProvider.GenerateAsync) — never direct SDK
   c. Parse response: human-readable summary of changes
   d. Example output: "Added 2 new pages (Dashboard, Settings). Changed navigation order.
      Removed unused Contact form. Modified 3 API endpoints."

3. PREVIEW RESPONSE:
   a. Return: structural diff (for programmatic consumption) + AI summary (for human review)
   b. Include impact assessment: which flows/factories/indices affected
   c. Flag breaking changes (field removals, type changes)
```

**Gotchas:**
- AI summary is informational — structural diff is the source of truth for commit logic
- Diff computation must handle large state sets efficiently (batch + pagination)
- AI prompt MUST NOT include secrets from either state snapshot (sanitize before prompt)

---

## DESIGN DECISIONS — Families 64-67

### DD-97 — Plugin Sandboxes Use Container Isolation (Not Process)

**Decision:** F498 plugin sandboxes are implemented as container-level isolation (cgroups + namespaces) rather than process-level or language-level isolation.

**Rationale:** Container isolation provides the strongest guarantee against resource escape, filesystem access, and network leakage. Process-level isolation (like V8 isolates) is faster but doesn't prevent filesystem or network access without additional syscall filtering. Container isolation aligns with existing Kubernetes infrastructure (SK-379 (MicroserviceBase) MicroserviceBase) and provides measurable resource limits via cgroup metrics. The 30s default timeout and 256MB default memory limit are enforced at the container level, making them impossible to bypass from user-provided plugin code.

**Trade-off accepted:** Container startup (~1-3s) is slower than process-level (~50ms). Mitigated by pre-warming sandbox pools and keeping sandboxes warm between plugin actions (idle timeout = 5min). For interactive use cases, the first action pays the cold start; subsequent actions reuse the warm container.

**Backward compatibility:** No impact. F498 is a new factory. Existing tenant isolation (DNA-5, F260) is unchanged — plugins run inside existing tenant boundaries.

---

### DD-98 — Billing Uses Integer Cents (Never Floating Point)

**Decision:** All billing amounts across F505, F506, F507 use integer representations: cents for currencies, microcents (1 cent = 100 microcents) for sub-cent pricing. No floating-point arithmetic anywhere in the billing pipeline.

**Rationale:** IEEE 754 floating-point representation cannot exactly represent many float values (e.g., 0.1 + 0.2 ≠ 0.3). In a billing system processing millions of transactions, accumulated rounding errors lead to material discrepancies. Integer arithmetic is exact, predictable, and aligns with how payment providers (Stripe, Adyen) handle amounts internally. Using microcents for tiered pricing (e.g., $0.001 per API call = 100 microcents) avoids the need for floating-point even at sub-cent granularity.

**Trade-off accepted:** Display formatting must convert cents to display currency (cents / 100). All price configs must be entered as integers. This is a mechanical conversion, easily handled by a shared formatting utility.

**Backward compatibility:** No impact. FLOW-13 finance flows use their own amount representations. FLOW-15 billing is additive.

---

### DD-99 — Paywall Cache Miss Defaults to Deny

**Decision:** When F508's entitlement cache has a miss (key not found or expired), the system falls back to F505 PG lookup. If F505 is unreachable, the default is DENY (hard-block), not ALLOW.

**Rationale:** A cache miss with default-allow creates a trivially exploitable bypass: overwhelm the cache or poison it to force misses, then access premium features for free. Default-deny is the secure default for billing enforcement, consistent with auth systems (missing token = denied). The operational cost (brief false-negatives during F505 outages) is manageable: F505 PG is high-availability with read replicas, and the 300s cache TTL means a full outage affects only requests arriving after cache expiry.

**Trade-off accepted:** During F505 outages, legitimate premium users may see temporary blocks. Mitigated by: (a) 300s cache TTL means most users have valid cached entitlements, (b) F505 PG has HA replicas, (c) alert on F505 unreachable for rapid response.

**Backward compatibility:** No impact. F508 is new. FLOW-08 auth gates (F254) have their own independent deny-by-default policy.

---

## DESIGN RECORDS — Families 64-67

### DR-73 — Copy-on-Write for Sandbox (Not Full Clone)

**Decision:** F502 (ISandboxForkService) uses copy-on-write semantics rather than full state cloning for sandbox forks.

**Rationale:** Full cloning of an entire app state (all ES indices, PG tables, Redis cache) would be expensive in time and storage, especially for large apps with many records. Copy-on-write defers the copy cost to the actual modification: reads check sandbox first then fall back to live, writes go only to sandbox. This means a sandbox that modifies 5% of state only stores 5% additional data, not 100%.

**Backward compatibility:** F245 and F257 (FLOW-08) are consumed read-only during fork. No modifications.

---

### DR-74 — Subscription State Machine Enforced in PG (Not ES)

**Decision:** F505 subscription state transitions are enforced in PostgreSQL with ACID transactions, not in Elasticsearch.

**Rationale:** Subscription state transitions must be strictly ordered and atomic. A race condition where two concurrent upgrade requests both succeed would create billing chaos. PG transactions provide the serializable isolation needed for financial state machines. ES is used for search and analytics of subscription data (read replicas), but the authoritative state lives in PG.

**Backward compatibility:** FLOW-08 F260 (tenant lifecycle) uses PG for similar reasons. Pattern is consistent.

---

### DR-75 — Metering Raw Events Are Immutable (DR-58 Reuse)

**Decision:** F506 raw usage events in `usage_raw_{tenantId}` are append-only and immutable, reusing the same pattern as DR-58 (Immutable Raw Zone) from FLOW-14.

**Rationale:** Billing disputes require auditable, tamper-proof records of actual usage. If raw events could be modified, there would be no way to independently verify that aggregated totals are correct. The immutable raw zone pattern from FLOW-14 warehouse design is proven and reusable. Corrections are handled by appending adjustment events (negative usage), not by modifying existing records.

**Backward compatibility:** DR-58 pattern reused as-is. FLOW-14 raw zone indices are separate from FLOW-15 metering indices (CF-230 proves isolation).

---

## P6 SUMMARY

| Artifact | Count | Range |
|----------|-------|-------|
| Skill Patterns | 7 | SK-104 through SK-110 |
| Design Decisions | 3 | DD-97 through DD-99 |
| Design Records | 3 | DR-73 through DR-75 |

### Backward Compatibility
```
SK-1-SK-103:  UNCHANGED ✅
DD-1-DD-96:   UNCHANGED ✅
DR-1-DR-72:   UNCHANGED ✅
```

---

## SAVE POINT: FLOW15:P6:COMPLETE ✅
## Resume: "Continue FLOW-15 from P7 (Session State)" → Load this file + P4B + P5 + SESSION_STATE

---

# FLOW-15 — MVP BUILDER PLATFORM
## Phase P6C: Skill Patterns SK-111–SK-124 | Design Decisions DD-100–DD-106 | Design Records DR-76–DR-82
## Save Point: FLOW15:P6C:SKILLS:COMPLETE
## Prerequisite: P4C ✅ F510–F565 | P4D ✅ T193–T210 | P4E ✅ T211–T218 | P5C ✅ CF-234–CF-255
## Target canonical file: SKILLS_FACTORY_RAG_MERGED.md (append after SK-110 / DD-99 / DR-75)

---

# SCOPE

| Section | Count | ID Range |
|---------|-------|----------|
| Skill Patterns | 14 | SK-111–SK-124 |
| Design Decisions | 7 | DD-100–DD-106 |
| Design Records | 7 | DR-76–DR-82 |

---

# PART 1 — SKILL PATTERNS SK-111–SK-124

---

## SK-111 — Custom Domain + SSL Provision Pattern

**Category:** PUBLISHING
**Source:** F510 (ICustomDomainService), F511 (ISslCertService), F517 (IDomainVerificationService) — T193, T194
**Reusable For:** Any future flow that provisions external-facing identities with verification + cryptographic credentials: custom email domains (DKIM/SPF), mobile app bundle IDs, API endpoint hostnames, webhook receiver URLs requiring SSL.

**Pattern:**
```
1. REGISTRATION PHASE:
   a. Receive domain + tenantId
   b. Global uniqueness check via optimistic lock (ES domain_registry_global, if_seq_no)
   c. If collision → DataProcessResult.Failure("DomainAlreadyClaimed") — no partial state
   d. Write to BOTH per-tenant index AND global registry atomically (two-phase write)

2. VERIFICATION PHASE:
   a. Generate cryptographically random challenge token (≥ 32 bytes, base64url)
   b. Store challenge with TTL (FREEDOM: 48h default)
   c. Instruct owner to publish DNS TXT/CNAME record
   d. Poll DNS resolver via CORE FABRIC HTTP (not system resolver — bypasses cache)
   e. On verification: mark VERIFIED in both per-tenant + global index

3. CREDENTIAL ISSUANCE PHASE (SSL):
   a. MUST NOT run before VERIFIED status confirmed (ordering enforced by T193 IR-193-2)
   b. Issue cert via CORE FABRIC HTTP ACME endpoint (Let's Encrypt or configured CA)
   c. Private key stored encrypted in PG — never in ES, queue events, or logs
   d. Cert metadata (expiry, fingerprint, SANs) stored separately for querying

4. LIFECYCLE PHASE (T194):
   a. Schedule renewal at (FREEDOM: days_before_expiry) before expiry — default 30d
   b. Emergency renewal at 7-day threshold regardless of schedule
   c. Rotation: new cert issued → chain-validated → CDN updated → old cert archived (not deleted)
   d. Revocation: CDN config removal → cert revocation via ACME → archive
```

**Gotchas:**
- DNS propagation can take up to 48h — verification must be async (do NOT block the request)
- Private keys must never traverse the queue — only metadata (expiry, fingerprint)
- Zero-downtime cert rotation requires: new cert ACTIVE before CDN reference swapped
- Global registry write MUST be idempotent — use ES upsert with doc_as_upsert, version check

---

## SK-112 — Blue-Green Deploy Gate Pattern

**Category:** PUBLISHING
**Source:** F513 (IDeployPipelineService), F514 (IPublishGateService), F516 (IRollbackService), F553 (IDeployHealthService), F556 (IBlueGreenService) — T195, T213
**Reusable For:** Any future flow needing zero-downtime deployments with automatic rollback: microservice version upgrades, ML model swaps, config rollouts, A/B test activations.

**Pattern:**
```
1. PRE-DEPLOY GATE (F514):
   a. Check 5 gate conditions: domain verified, SSL active, CDN propagated,
      artifacts present, no BFA conflicts
   b. All 5 MUST pass — partial gate pass = abort (no majority-vote logic)
   c. Gate result cached in Redis (TTL: 10 min) — don't re-run during same deploy

2. SLOT PREPARATION (F556):
   a. Identify current blue slot (live production)
   b. Prepare green slot: deploy artifacts to isolated namespace
   c. Green slot has no public traffic yet — fully internal

3. CANARY RELEASE (F553 + F556):
   a. Shift 10% traffic to green slot
   b. Run smoke test suite in PARALLEL (not serial) against green slot
   c. ANY single test failure → immediate green→blue rollback (F556.RollbackToBlueAsync)
   d. On pass: shift 50% → health check → shift 100%
   e. Each increment must observe health before advancing

4. ROLLBACK POINT (F516):
   a. Record rollback point BEFORE shifting to 100% traffic
   b. Rollback point = artifacts + config snapshot stored in PG
   c. F516 + F556 coordinated: F516 restores snapshot state, F556 restores blue traffic
   d. Two-phase rollback: F516.InitiateRollbackAsync → F556.RollbackToBlueAsync (ordered)

5. COMPLETION:
   a. Blue slot deactivated (not deleted) — kept for fast rollback for 24h
   b. DeployCompleted event emitted with deployRunId + slot refs
```

**Gotchas:**
- Smoke tests MUST be parallel — serial tests exceed the deployment health window
- Rollback coordination: F516 and F556 are BOTH required — neither alone is sufficient
- "Rollback point before 100%" is the critical ordering — never promote to 100% before snapshotting
- Gate TTL (10 min) prevents gate re-evaluation during slow builds — extend if builds regularly exceed 10 min

---

## SK-113 — CDN Config Push + Field-Level Merge Pattern

**Category:** PUBLISHING
**Source:** F512 (ICdnConfigService) — T193, T195
**Reusable For:** Any future flow that manages shared configuration documents with multiple independent writers (feature flags, A/B test configs, rate limit configs, service mesh route tables).

**Pattern:**
```
1. FIELD OWNERSHIP DECLARATION:
   a. Each writer declares which fields it owns (F511 owns ssl_cert_arn; F513 owns all other CDN fields)
   b. Field ownership stored in config document metadata
   c. A writer MUST NOT update fields it does not own — BUILD FAILURE if detected

2. FIELD-LEVEL MERGE WRITE:
   a. Writer reads current document version (ES seq_no + primary_term)
   b. Writer updates ONLY its owned fields — produces a partial document
   c. Write uses ES partial update (not full document replace): {doc: {ssl_cert_arn: "..."}}
   d. Concurrent writes to DIFFERENT fields → both succeed without conflict
   e. Concurrent writes to SAME field → ES version conflict → retry with exponential backoff

3. ASYNC QUEUE SERIALIZATION:
   a. All CDN config updates go through QUEUE FABRIC consumer (not direct ES write)
   b. Consumer processes updates serially within a single partition
   c. Priority ordering: deploy updates > cert rotation updates (priority field in queue message)

4. PROPAGATION CONFIRMATION:
   a. After write: poll CDN provider's propagation status API (via CORE FABRIC HTTP)
   b. EdgePropagated event emitted only after confirmation from all configured edge regions
   c. Timeout: FREEDOM configurable (default 5 min) — after timeout emit PropagationTimeout event
```

**Gotchas:**
- CDN providers have eventual consistency for config propagation — never assume instant effect
- Field-level merge prevents cross-writer clobbering — critical for concurrent deploy + cert rotation
- Priority queue ordering (deploy > cert) ensures deploy configs are always fresh
- Never read CDN provider's edge state to validate — use the local propagation status record

---

## SK-114 — Analytics Immutable Raw Zone Pattern

**Category:** INGESTION
**Source:** F518 (IAnalyticsIngestionService), F523 (IRetentionPurgeService) — T197, T198
**Reusable For:** Any future flow requiring immutable event capture with dedup and schema validation: audit events, compliance events, user behavior capture, IoT telemetry, financial transaction logs.
**Prior Art:** Extends DR-58 (Immutable Raw Zone, FLOW-14) to app-layer analytics. Separation from FLOW-14 raw landing enforced by CF-236.

**Pattern:**
```
1. RECEIVE:
   a. Dequeue event from QUEUE FABRIC (consumer group: analytics-ingestion-cg)
   b. Validate required fields: tenantId, eventType, timestamp, eventId
   c. Missing tenantId → DLQ immediately (not retry) — never write unscoped events

2. SCHEMA VALIDATION:
   a. Look up registered schema in F525 (ICustomEventSchemaService) by eventType
   b. Validate payload structure against schema (strict or lenient per FREEDOM config)
   c. Schema miss → configurable: lenient = warn + pass, strict = reject + DLQ

3. DEDUPLICATION (Redis SETNX):
   a. Key: `analytics_dedup:{tenantId}:{eventId}` — TTL: FREEDOM configurable (default 24h)
   b. SETNX: if key exists → duplicate → acknowledge queue message (not DLQ) + skip
   c. If key does not exist → set key → proceed to write

4. IMMUTABLE WRITE:
   a. Write to `analytics_raw_{tenantId}` ES index with append semantics
   b. Index settings: `"index.blocks.write": false` (allow writes) + no update/delete perms in service
   c. Document ID = eventId — ES upsert with `if_seq_no: null` creates new only (reject update)
   d. After write: acknowledge queue message (write-first, ack-second ordering)

5. DOWNSTREAM ENQUEUE:
   a. Enqueue to rollup topic ONLY after successful ES write
   b. Use eventId as rollup message key — enables rollup idempotency
```

**Gotchas:**
- Acknowledge AFTER write — never before (at-least-once delivery + idempotent write = exactly-once effective)
- Dedup window controls memory cost: 24h covers most retry storms; 7d catches delayed retries
- Separate `analytics_raw_` indices from `raw_landing_` — enforce via BUILD FAILURE check (CF-236)
- Schema validation mode (strict/lenient) is FREEDOM — default strict for production

---

## SK-115 — Windowed Metric Rollup Pattern

**Category:** TRANSFORM
**Source:** F519 (IMetricRollupService), F520 (IDashboardQueryService) — T198
**Reusable For:** Any future flow requiring time-bucketed aggregation with multiple window granularities: performance SLIs, infrastructure metrics, feature usage trends, experiment result aggregation.
**Prior Art:** Extends SK-108 (Usage Metering Time-Window Aggregation) to operational analytics (non-billing). CF-237 enforces separation between the two.

**Pattern:**
```
1. TRIGGER:
   a. Consume from rollup topic (producer: F518 analytics ingestion)
   b. Also triggered by RollupWindowClosed scheduler (periodic, per configured windows)

2. WINDOW COMPUTATION:
   a. For each configured window (1m, 5m, 1h, 1d — FREEDOM):
      - Determine window boundaries from event timestamp (UTC — timezone-free)
      - window_start = floor(timestamp, window_size_seconds)
      - window_end = window_start + window_size_seconds
   b. Read raw events for window from F518 ES (bounded query: timestamp range + tenantId)
   c. Apply aggregation function per metric definition (F519.RegisterMetricDefinitionAsync):
      - sum: total value in window
      - count: event count in window
      - avg: sum / count
      - p95: 95th percentile using T-Digest approximation

3. IDEMPOTENT UPSERT (PG):
   a. Key: (tenantId, metricId, windowType, windowStart)
   b. SQL: INSERT ... ON CONFLICT (tenantId, metricId, windowType, windowStart) DO UPDATE SET value=EXCLUDED.value
   c. Re-processing same window produces same result — safe for retry and replay

4. REDIS COUNTER UPDATE:
   a. Atomic: HINCRBY `metric_rollup:{tenantId}:{metricId}:{windowType}` window_start value
   b. Used by F520 dashboard for real-time rolling window display (fast path)
   c. SET NX with expiry for window keys — auto-expire old windows

5. POST-ROLLUP:
   a. Invalidate F520 Redis dashboard cache for affected metrics
   b. Enqueue alert evaluation trigger for F522
   c. Emit MetricRollupCompleted with window details
   d. Acknowledge queue message only after all windows successfully written
```

**Gotchas:**
- Window boundaries MUST be deterministic — always use UTC floor, never local time
- PG upsert is the idempotency mechanism — missing the ON CONFLICT clause = float-counting on retry
- Redis counter and PG rollup can diverge during crashes — periodic reconciliation job recommended
- DO NOT re-compute p95 on partial window data — wait for window to close before committing p95

---

## SK-116 — OAuth2 PKCE Exchange Pattern

**Category:** OAUTH
**Source:** F528 (IOAuthExchangeService) — T201, T202
**Reusable For:** Any future flow requiring delegated authorization: SSO provider integration, third-party API access delegation, cross-service token relay, user-consent flows for data sharing.
**Prior Art:** Extends SK-90 (Connector Auth pattern, FLOW-14) to app-layer integration OAuth.

**Pattern:**
```
1. AUTHORIZATION REQUEST (client-side initiation):
   a. Generate code_verifier: cryptographically random 32–96 bytes, base64url encoded
   b. Compute code_challenge = BASE64URL(SHA256(code_verifier))
   c. Generate state: cryptographically random 16 bytes, base64url — store in session
   d. Redirect to provider with: response_type=code, client_id, redirect_uri,
      scope, state, code_challenge, code_challenge_method=S256

2. CALLBACK HANDLING (T202):
   a. Receive callback with code + state
   b. Validate state: EXACT match to session-stored value (CSRF protection)
   c. State mismatch → abort immediately, log to F536, emit OAuthStateMismatch
   d. Retrieve code_verifier from session (associated with this state)

3. TOKEN EXCHANGE:
   a. POST to provider's token endpoint via CORE FABRIC HTTP (never SDK)
   b. Body: grant_type=authorization_code, code, redirect_uri, code_verifier, client_id
   c. Receive: {access_token, refresh_token, expires_in, scope, token_type}
   d. NEVER log token values — log only: installId, scope, expiry, provider

4. TOKEN STORAGE (F427 delegation):
   a. Encrypt tokens via F427.StoreCredentialAsync — NOT in F528's own PG table
   b. F528 PG table stores ONLY: installId, integrationId, scope, expiry, status
   c. No token_value column exists in F528 schema — enforced at migration generation
   d. Queue event (OAuthConnected): contains installId, scope, expiry — zero token values

5. REFRESH (proactive at 90% TTL):
   a. Schedule refresh at: token_issued_at + (expires_in × 0.9)
   b. Refresh via POST to provider's token endpoint with refresh_token (from F427)
   c. On refresh success: update F427 credential, update F528 expiry metadata
   d. On refresh failure: emit TokenRefreshFailed → F535 health check triggered
```

**Gotchas:**
- PKCE is MANDATORY — implicit grant (no code_verifier) is forbidden and must be detected by AF-8 security scan
- code_verifier must be random PER flow — never reuse across authorization requests
- Proactive refresh at 90% TTL prevents the "token expired mid-operation" class of errors
- state parameter is the only CSRF protection — must be exact match, not prefix or substring

---

## SK-117 — Integration Webhook Relay + HMAC Verification Pattern

**Category:** INGESTION
**Source:** F529 (IWebhookRelayService), F537 (IIntegrationRateLimitService) — T203, T205
**Reusable For:** Any future flow receiving external push events with authenticity requirements: payment provider callbacks, CI/CD pipeline webhooks, CRM change events, IoT device telemetry with signing.
**Prior Art:** Extends SK-91 (Webhook Ingestion + HMAC, FLOW-14) to app-layer integration relay.

**Pattern:**
```
1. RECEIVE (HTTP POST, synchronous):
   a. Read raw request body as bytes — BEFORE any JSON parsing
   b. Extract signature from header (e.g., X-Hub-Signature-256, Stripe-Signature)
   c. HMAC verification: HMAC-SHA256(secret, raw_body) — compare with timing-safe equality
   d. Signature mismatch → 403 response immediately (BEFORE any processing or logging)
   e. Signature valid → 200 OK response (acknowledge to source before async processing)

2. RATE LIMIT CHECK:
   a. Check F537.CheckRateLimitAsync(tenantId, installId, operation) BEFORE dequeuing
   b. Rate exceeded → 429 response, log to F536 (not DLQ — rate limit is not an error)
   c. Per-install limit (F537) AND check F430 if connector type has platform-wide limit

3. DEDUPLICATION (Redis SETNX):
   a. Key: `webhook_dedup:{tenantId}:{installId}:{externalEventId}` — TTL: 48h
   b. SETNX: if exists → duplicate → acknowledge source (200 OK) + skip processing
   c. externalEventId from: X-Webhook-ID, X-Request-ID, or body.id field

4. RELAY TO APP QUEUE:
   a. Publish to app's QUEUE FABRIC topic (NOT direct function call)
   b. Payload: {externalEventId, sourceType, tenantId, installId, payload: Dictionary}
   c. payload stored as dict[str, Any] via parse_document (DNA-1)
   d. Queue publish failure → DLQ entry + retry (max 3 attempts)

5. AUDIT LOG:
   a. Write to F536 (IIntegrationLogService): externalEventId, source, tenantId, timestamp, status
   b. F536 write is append-only — no status update for delivered events
```

**Gotchas:**
- Raw body bytes for HMAC — NEVER verify on parsed JSON (JSON normalization changes bytes, breaks HMAC)
- Timing-safe comparison is mandatory — byte-by-byte compare leaks timing info on near-misses
- 200 OK on receive (before async processing) — prevents source retry storms from slow processing
- Do NOT expose any internal structure to the webhook source in error responses

---

## SK-118 — AI Chatbot Context Chain Pattern

**Category:** AI_ADDON
**Source:** F539 (IChatbotProvisionService), F540 (IChatbotContextService), F546 (IAiUsageTrackingService) — T206, T209
**Reusable For:** Any future flow requiring session-aware AI interactions: support bots, onboarding assistants, code review agents, document Q&A, process guidance wizards.

**Pattern:**
```
1. PROVISIONING (one-time per chatbot):
   a. Create chatbot config in F544 (FREEDOM: system_prompt, model, context_strategy, max_tokens)
   b. Index app knowledge into RAG FABRIC via F540.IndexAppKnowledgeAsync
      - Scope: tenantId + appId — no cross-tenant knowledge bleed
      - Strategy from FREEDOM config: Tiered (default), Hybrid, or Vector
   c. Provision sandbox quota via F547 (separate from plugin sandbox — CF-241)
   d. Run test inference to verify end-to-end (emit ChatbotProvisioned only on success)

2. CONTEXT ASSEMBLY (per-message):
   a. Retrieve conversation history: F540.GetConversationHistoryAsync(sessionId) — Redis, TTL-bounded
      Key: `chatbot_ctx:{tenantId}:{chatbotId}:{sessionId}` — bound to session, not user
   b. Retrieve relevant app knowledge: F540.BuildContextAsync via IRagService.SearchAsync
      - Always pass tenantId filter — enforces tenant isolation in RAG results
   c. Assemble: system_prompt + app_context_snippets + conversation_history + current_message
   d. Total tokens MUST NOT exceed max_context_window (FREEDOM) — truncate oldest history first

3. INFERENCE:
   a. Call IAiProvider.GenerateAsync(assembled_context) — NEVER openai.chat() directly
   b. Response is the raw LLM output — validate for safety before returning to user
   c. Append message+response to conversation history (F540.AppendToHistoryAsync)

4. USAGE TRACKING (mandatory):
   a. After EVERY inference: F546.RecordUsageAsync(tenantId, modelId, inputTokens, outputTokens, inferenceId)
   b. Check token budget via T210 pre-flight BEFORE inference — not after
   c. Usage event: emit TokenUsageRecorded to QUEUE FABRIC → consumed by F506 billing

5. CONTEXT WINDOW MANAGEMENT:
   a. History older than FREEDOM:max_history_turns → evict from Redis (not ES archive)
   b. Session context cleared on ClearSession — must be explicit, not time-based auto-clear
```

**Gotchas:**
- RAG context retrieval MUST pass tenantId — a query without tenantId returns cross-tenant knowledge
- Token budget check (T210) MUST happen BEFORE inference — reject at budget gate, not after spending tokens
- Conversation history in Redis (not ES) — ES is too slow for per-message context lookups
- Context truncation order: OLDEST history first — preserve system prompt and recent context

---

## SK-119 — AI Add-on Sandbox Quota Pattern

**Category:** AI_ADDON
**Source:** F547 (IAiAddonSandboxService), F551 (IResourceQuotaService) — T206, T207, T208
**Reusable For:** Any future flow requiring multi-tier resource quota enforcement with per-type isolation: data processing sandboxes, custom script execution, user-defined transformation pipelines.
**Prior Art:** Mirrors SK-105 (Plugin Sandbox Quota, FLOW-15 P4B) but for AI add-on execution. Separation enforced by CF-241.

**Pattern:**
```
1. PRE-EXECUTION QUOTA CHECK (two-level):
   Level 1 — Per-Add-on: Redis `ai_quota:{tenantId}:{addonId}:cpu` / :memory
   Level 2 — Tenant Ceiling: F551.CheckQuotaAsync(tenantId, resource_type)
   a. Check Level 1 add-on quota → if exceeds → DataProcessResult.Failure("AddonQuotaExceeded")
   b. Check Level 2 tenant ceiling → if exceeds → DataProcessResult.Failure("TenantQuotaExceeded")
   c. Both checks ATOMIC — use Redis pipeline (MULTI/EXEC) for Level 1

2. RESERVATION:
   a. F551.ReserveQuotaAsync(tenantId, resource_type, amount) — atomic increment + bounds check
   b. Redis HINCRBY on both per-addon counter and tenant aggregate
   c. If reservation fails → no execution → return failure immediately

3. EXECUTION:
   a. F547.ExecuteInSandboxAsync: enforce CPU/memory/timeout limits at execution layer
   b. Timeout: FREEDOM configurable (default 30s hard timeout)
   c. Resource usage measured during execution (CPU ms, peak memory bytes)

4. RELEASE:
   a. After execution (success or failure): F551.ReleaseQuotaAsync — decrement counters
   b. Release must happen even on timeout — use try/finally pattern
   c. Actual usage (measured) vs reserved (requested) — adjust counter to actual usage

5. QUOTA BREACH NOTIFICATION:
   a. If reservation hits 80% of ceiling → emit QuotaWarning (not block)
   b. If reservation hits 100% → block + emit QuotaBreached → F508 paywall check
   c. QuotaBreached may trigger tier upgrade prompt in UI (F508 integration)
```

**Gotchas:**
- Release MUST use try/finally — a crashed execution that doesn't release quota permanently depletes it
- Per-addon (F547) and plugin (F498) counters MUST use separate Redis key prefixes — CF-241 enforcement
- Actual usage vs reserved: always release based on measured actual, not estimated reserved
- Two-level check (addon + tenant) must both pass — either failure blocks execution

---

## SK-120 — Predictive Auto-Scale Signal Pattern

**Category:** SCALING
**Source:** F548 (IAutoScalerService), F552 (ICapacityPlannerService), F555 (IBackpressureService) — T211, T214
**Reusable For:** Any future flow requiring signal-driven infrastructure adaptation: database connection pool scaling, cache size adjustment, worker pool tuning, CDN cache warming.

**Pattern:**
```
1. SIGNAL COLLECTION:
   a. Queue depth signal: F555.GetQueueDepthAsync — consumer lag + producer rate
   b. Health signal: F549 health probe metrics — CPU%, memory%, error rate
   c. Backpressure signal: F555 throttle status — downstream pressure from services
   d. Historical trend: F557 scorecard rolling 24h/7d averages

2. SCALE DECISION (T211 reactive):
   a. Pre-check BEFORE any scale command:
      - F551.CheckQuotaAsync → quota headroom
      - F508.CheckEntitlementAsync → tier ceiling
   b. Compute target replicas from signal composite:
      - If queue_depth > threshold AND cpu > 70% → scale up by step
      - If queue_depth < low_threshold AND cpu < 30% AND error_rate == 0 → scale down by step
   c. Cool-down: suppress if last decision < cool_down_seconds (FREEDOM) ago
   d. Scale-down NEVER below 1 replica for a live service

3. SCALE COMMAND:
   a. F548.ScaleUpAsync or ScaleDownAsync via CORE FABRIC (infra API)
   b. Command idempotent: target replica count, not delta
   c. Record decision in F548 history: {signal_snapshot, decision, reason, quotaCheckPassed}

4. CAPACITY FORECAST (T214 proactive):
   a. Extract historical scale decisions from F548 history (trailing 30/60/90 days)
   b. Combine with F557 health scorecard trend data
   c. Call IAiProvider.GenerateAsync with: historical_signals + current_capacity + quota_ceiling
   d. Output: {forecast_horizon_days, predicted_peak_replicas, confidence_interval, recommendations}
   e. Recommendations must include quota upgrade notice if forecast exceeds F551 ceiling (CF-242)

5. FEEDBACK LOOP:
   a. Actual scaling events feed back into AF-11 for scale accuracy measurement
   b. Over-scale rate and under-scale rate tracked — model improves over time
```

**Gotchas:**
- Cool-down is mandatory — without it, oscillation (scale up → down → up) degrades service stability
- AI forecast (IAiProvider) supplements but does NOT replace reactive signal-based scaling
- Quota check is a hard gate — beautiful forecast is irrelevant if quota ceiling is reached
- Scale-down minimum 1 replica: never reach 0 for live services (would require re-provision, not scale)

---

## SK-121 — Circuit Breaker State Machine Pattern

**Category:** SCALING
**Source:** F550 (ICircuitBreakerService), F549 (IHealthProbeService), F554 (IIncidentService) — T212
**Reusable For:** Any future flow needing cascade failure protection: DB connection pools, external API clients, inter-service gRPC calls, message queue consumers (to prevent DLQ flooding).
**Prior Art:** Extends SK-57 (State Machine pattern, FLOW-11) to infrastructure fault tolerance.

**Pattern:**
```
STATE MACHINE: CLOSED → OPEN → HALF-OPEN → CLOSED (or HALF-OPEN → OPEN on probe failure)

STATES:
  CLOSED:    Normal operation. All calls pass through. Track failure count.
  OPEN:      All calls rejected immediately (DataProcessResult.Failure, reason: CircuitOpen).
             No timeout wait. Held for OPEN_DURATION (FREEDOM, default 60s).
  HALF-OPEN: One probe call allowed. All other calls still rejected.
             Success → CLOSED. Failure → OPEN (reset OPEN_DURATION timer).

1. CALL RECORDING (CLOSED state):
   a. F550.RecordCallResultAsync: success or failure with latency
   b. Failure rate calculation: rolling window (FREEDOM: default last 10 calls)
   c. Trip condition: failure_rate > threshold (FREEDOM: default 50%)

2. TRIP (CLOSED → OPEN):
   a. F550.TripCircuitAsync: atomically set state = OPEN in Redis
   b. Create incident via F554.CreateIncidentAsync (every trip is an incident)
   c. Update F557 scorecard (circuit state contributes to health score)
   d. Emit CircuitTripped event to QUEUE FABRIC

3. RECOVERY (OPEN → HALF-OPEN):
   a. After OPEN_DURATION expires, set state = HALF-OPEN (Redis atomic CAS)
   b. Emit CircuitHalfOpen event

4. PROBE (HALF-OPEN → CLOSED or OPEN):
   a. Allow EXACTLY ONE call: atomic Redis INCR on probe_count key, check == 1
   b. Second call attempt while HALF-OPEN → reject (CircuitOpen, probing = true)
   c. Probe success → F550.ResetCircuitAsync → CLOSED → emit CircuitReset
   d. Probe failure → F550.TripCircuitAsync → OPEN (reset OPEN_DURATION)

5. HEALTH SYNC (F549 integration — CF-243):
   a. Subscribe to ServiceUnhealthy event from F549
   b. ServiceUnhealthy → automatically trip circuit (bypass failure threshold check)
   c. ServiceRecovered → set state = HALF-OPEN (not CLOSED — still needs probe)

STATE STORAGE:
  - Current state: Redis str key `circuit:{serviceId}:{tenantId}:state` — sub-ms read
  - History: ES `circuit_breakers_{tenantId}` — for audit and trend analysis
  - probe_count: Redis key `circuit:{serviceId}:{tenantId}:probe` — TTL = HALF-OPEN_DURATION
```

**Gotchas:**
- OPEN must reject with zero latency — do NOT contact the failing service at all during OPEN
- HALF-OPEN allows exactly 1 probe — use Redis INCR + check == 1 for atomic single-probe enforcement
- Health probe sync (CF-243) creates an additional trip path — F549 can trip circuit independently of failure threshold
- Incident creation on EVERY trip — this is an operational signal, not just a debugging tool

---

## SK-122 — Silo Schema Graduation Pattern

**Category:** ENTERPRISE
**Source:** F558 (ISiloGraduationService), F559 (IRlsPolicyManagerService) — T215, T217
**Reusable For:** Any future flow moving tenant data from shared to isolated storage: database per-tenant migrations, ES index per-tenant migrations, cache namespace isolation, storage bucket isolation.
**Prior Art:** Extends SK-61 (Multi-Tenant Isolation pattern, FLOW-11) to full graduated silo creation.

**Pattern:**
```
1. INITIATION:
   a. Record graduation start in F561 WORM audit
   b. Create silo schema: PG CREATE SCHEMA tenant_{tenantId} (if not exists)
   c. Replicate table structures from pooled schema (DDL only, not data)
   d. Store graduation cursor: {tenantId, lastMigratedId: null, status: MIGRATING}

2. CURSOR-BASED BATCH MIGRATION (EP-4 pattern):
   a. Loop: read batch of N records from pooled schema WHERE id > lastMigratedId ORDER BY id
   b. Write batch to silo schema (INSERT INTO tenant_{tenantId}.table)
   c. Verify batch: count(written) == count(read) — mismatch = abort + alert
   d. Persist cursor: UPDATE graduation SET lastMigratedId = max(batch.id), batches_completed++
   e. Cursor persistence MUST precede advancing to next batch — crash safety (IR-215-1)
   f. Repeat until read returns 0 rows (all records migrated)

3. INTEGRITY VERIFICATION:
   a. Count all records in pooled schema WHERE tenantId = tenant
   b. Count all records in silo schema across all tables
   c. Compare: must be EXACTLY equal — zero tolerance (IR-215-2)
   d. Hash check on sample (10% random): field-level comparison
   e. Only on 100% pass: proceed to cutover

4. CUTOVER:
   a. Update routing config: tenant requests → silo schema (atomic config update)
   b. Record rollback point (F516 snapshot of pre-cutover config)
   c. Post-cutover: verify live traffic serves from silo schema
   d. Enable RLS (F559.EnableRlsOnTableAsync + CreateRlsPolicyAsync per table)
   e. Post-cutover: purge pooled records for this tenant (CF-245 enforcement)

5. CLEANUP + WAREHOUSE HANDOFF:
   a. Verify pooled tables contain zero records for graduated tenant
   b. Trigger FLOW-14 F461 warehouse isolation provision (step 8 in T217)
   c. Record GraduationCompleted in F561 WORM
```

**Gotchas:**
- Cutover is IRREVERSIBLE post-step-4 — rollback only valid while cursor is still running (pre-cutover)
- Integrity verification at 100% — ANY mismatch means migration is broken, not "close enough"
- Pooled records MUST be purged post-cutover — dual-write state is a data consistency hazard
- RLS must be enabled IMMEDIATELY after cutover — no window where silo tables have no RLS protection

---

## SK-123 — RLS Policy Lifecycle Pattern

**Category:** ENTERPRISE
**Source:** F559 (IRlsPolicyManagerService) — T216, T218
**Reusable For:** Any future flow requiring database-layer access control: multi-tenant SaaS data isolation, user-level row security, compliance-required data compartmentalization.
**Prior Art:** Informed by DR-65 (Warehouse Isolation inherits FLOW-08 tenant model). Separate namespace from FLOW-14 F463 enforced by CF-246.

**Pattern:**
```
1. POLICY CREATION:
   a. For each table in silo schema:
      - ALTER TABLE tenant_{tenantId}.{table} ENABLE ROW LEVEL SECURITY
      - ALTER TABLE tenant_{tenantId}.{table} FORCE ROW LEVEL SECURITY
      - CREATE POLICY app_rls_{table}_{tenantId} ON tenant_{tenantId}.{table}
          USING (tenant_id = current_setting('app.tenant_id')::uuid)
   b. Policy name prefix: MUST be `app_rls_` — never `dw_rls_` (CF-246)
   c. Setting variable: MUST be `app.tenant_id` — never `dw.tenant_id` (CF-246)
   d. All policy SQL generated via parameterized query builder — NO str concatenation

2. VERIFICATION:
   a. After creation: run cross-tenant read test
   b. SET LOCAL app.tenant_id = '{other_tenant_id}'
   c. SELECT COUNT(*) FROM tenant_{tenantId}.{table}
   d. Expected: 0 rows — any other result = POLICY FAILURE, abort + alert
   e. Verification test for EVERY table — not a sample

3. VERSIONING:
   a. Policy changes use CREATE OR REPLACE POLICY — never DROP + recreate (gap)
   b. Version stored in F559 ES policy registry: {policyId, tableId, tenantId, version, sql, actor, timestamp}
   c. No in-place mutation — new version is a new document in ES
   d. Policy rollback: re-apply prior version SQL (history in F559 ES)

4. DISABLE (ADMIN ONLY):
   a. Requires ADMIN role check before execution
   b. ALTER TABLE ... DISABLE ROW LEVEL SECURITY
   c. MUST emit to F561 WORM audit with: actor, tableId, justification (required field)
   d. Any disable without F561 entry = immediate re-enable + security alert

5. TABLE COVERAGE GUARANTEE:
   a. After provisioning: query pg_tables for schema = tenant_{tenantId}
   b. Query pg_policies for schema = tenant_{tenantId}
   c. Tables without policies = F559 reports as UNCOVERED → auto-create policy
   d. New tables added post-provision = trigger RlsPolicyProvisionRequested again (T216)
```

**Gotchas:**
- FORCE ROW LEVEL SECURITY is critical — without FORCE, table owner bypasses RLS
- current_setting('app.tenant_id') is set at request time by the connection middleware — must be in every query path
- Policy verification MUST test the cross-tenant scenario — testing own-tenant access proves nothing
- Policy naming (CF-246): `app_rls_` prefix prevents collision with FLOW-14's `dw_rls_` policies in pg_policies

---

## SK-124 — Enterprise Audit WORM Chain Pattern

**Category:** ENTERPRISE
**Source:** F561 (IEnterpriseAuditService) — T217, T218
**Reusable For:** Any future flow requiring tamper-proof audit trails: financial transaction logs, compliance evidence chains, access control change logs, regulated industry audit requirements (SOX, PCI-DSS, HIPAA).
**Prior Art:** Extends SK-96 (Audit Trail pattern, FLOW-14) to enterprise governance operations. Separate WORM tables from FLOW-14 enforced by CF-248.

**Pattern:**
```
1. ENTRY CREATION (append-only):
   a. F561.RecordAuditEntryAsync: INSERT only — no UPDATE, no DELETE ever
   b. PG table: `enterprise_audit_{tenantId}` — WORM enforced via:
      - Application layer: F561 service has INSERT permission only (no UPDATE/DELETE grants)
      - DB layer: PG trigger that blocks UPDATE/DELETE on this table
      - Revoke UPDATE/DELETE grants at schema migration time
   c. Every entry includes: entryId (UUID v7 for timestamp ordering), tenantId, actor,
      operation, resourceId, resourceType, timestamp, metadata (Dictionary)

2. CHAIN INTEGRITY:
   a. Each entry stores hash of previous entry: prev_hash = SHA256(prev_entry_canonical_json)
   b. First entry: prev_hash = SHA256(tenantId + "GENESIS")
   c. Chain allows offline verification: audit log not tampered if chain is unbroken
   d. Hash computation: canonical JSON (sorted keys, no whitespace) — deterministic

3. ES SECONDARY INDEX (for search):
   a. After PG write: async publish to ES `enterprise_audit_{tenantId}` index
   b. ES index is searchable but NOT authoritative — PG WORM is authoritative
   c. If ES and PG diverge: PG wins, ES is rebuilt from PG (not the reverse)

4. EXPORT:
   a. F561.ExportAuditLogAsync: stream PG records in append order (by entryId)
   b. Include chain hashes in export — verifier can validate chain integrity offline
   c. Export is READ-ONLY — export process has no write permissions

5. COMPLIANCE EVIDENCE SOURCING (T218):
   a. F564 compliance report reads from F561 WORM (not F459 warehouse audit — CF-248)
   b. F562 BYOK key rotation events MUST appear in F561 chain (not just F562 own log)
   c. F559 RLS policy changes MUST appear in F561 chain
   d. Every enterprise governance operation from Families 73 emits to F561
```

**Gotchas:**
- PG trigger blocking UPDATE/DELETE is belt-and-suspenders with application-layer INSERT-only permission
- UUID v7 (timestamp-prefixed) ensures entries are naturally ordered by creation time without a separate sequence
- ES secondary index divergence is recoverable (rebuild from PG) — PG WORM is the truth
- Chain hash enables compliance auditors to verify log integrity without trusting the system operator

---

# PART 2 — DESIGN DECISIONS DD-100–DD-106

---

### DD-100 — Domain Provisioning Uses Event-Driven Saga (Not Single Transaction)

**Decision:** F510/F511/F512/F517 domain provisioning (T193) is implemented as a multi-step event-driven saga coordinated through QUEUE FABRIC, not as a single distributed transaction.

**Rationale:** Domain provisioning spans three external systems (DNS resolver, ACME cert authority, CDN provider) and takes up to 48h for DNS propagation. A single transaction holding locks for 48h is architecturally impossible. Saga pattern (each step emits an event, next step subscribes) provides durability through crash recovery, observability through event history, and retryability for each individual step. The saga is idempotent — rerunning any step from the cursor position produces the same result.

**Trade-off accepted:** Eventual consistency — domain is not immediately live after registration; it becomes live only after all saga steps complete. This is the inherent nature of DNS propagation and is expected by users ("DNS can take up to 48 hours to propagate"). The saga UI reflects this with a progress indicator.

**Backward compatibility:** No impact. T193 is a new task type. Existing FLOW-08 managed primitive provisioning (T88) uses synchronous provisioning for infrastructure components that don't require DNS propagation.

---

### DD-101 — Analytics Raw Zone in Separate ES Index from FLOW-14 DWH

**Decision:** F518 analytics events are stored in `analytics_raw_{tenantId}` — a completely separate Elasticsearch index from FLOW-14's `raw_landing_{tenantId}`. No shared index, no shared alias.

**Rationale:** Analytics events (app user behavior, feature usage, errors) have different retention requirements, different consumers, and different immutability enforcement from warehouse raw data (external SaaS source records). Sharing an index would require routing by doc_type or metadata filtering, which makes queries error-prone and creates cross-pipeline contamination risk (CF-236). Separate indices allow independent index lifecycle management (ILM policies), retention, and rollover. The separation also allows the analytics pipeline to be on a different ES cluster from the warehouse if capacity requires it.

**Trade-off accepted:** Storage cost duplication — tenant data is in two raw zones if they use both analytics and FLOW-14 warehouse. Justified by operational clarity, independent scaling, and elimination of pipeline cross-contamination risk.

**Backward compatibility:** CF-236 explicitly proves isolation. FLOW-14 F438 and FLOW-15 F518 generated code verified to contain zero cross-index references.

---

### DD-102 — PKCE Is Mandatory for All OAuth Flows (Implicit Flow Forbidden)

**Decision:** All OAuth 2.0 flows via F528 (IOAuthExchangeService) MUST use PKCE (Proof Key for Code Exchange, RFC 7636). Implicit grant and authorization code without PKCE are forbidden.

**Rationale:** The OAuth 2.0 Security BCP (RFC 9700) deprecates implicit grant due to token leakage in redirect URIs. Authorization code without PKCE is vulnerable to authorization code interception attacks. PKCE binds the code challenge to the code verifier, making intercepted authorization codes useless without the verifier. As a platform generating OAuth flows for tenant apps, a security weakness here affects all tenants simultaneously. PKCE is now supported by all major OAuth providers and adds minimal implementation complexity.

**Trade-off accepted:** Some legacy OAuth providers do not support PKCE. For these providers, F527 integration catalog will NOT list them as compatible integrations. This excludes a small set of legacy SaaS tools but protects the entire tenant base from code interception attacks.

**Backward compatibility:** No impact — F528 is new. FLOW-14 F427 (credential vault) and F429 (webhook receiver) are unaffected; they don't implement OAuth exchange.

---

### DD-103 — AI Token Budget Checked Pre-Inference, Not Post-Inference

**Decision:** T210 (AI Token Budget Gate) runs as a pre-flight check BEFORE dispatching any AI inference — not as a post-inference quota enforcement.

**Rationale:** Post-inference enforcement is fundamentally broken for quota management: by the time the inference completes, tokens have already been consumed. Post-enforcement merely blocks the NEXT request, not the one that exceeded the budget. Pre-flight checks are the only way to prevent overspend. The latency cost (one Redis read per inference) is acceptable at < 10ms, far below typical inference latency (200ms–2s). The Redis atomic read is the correct tool — not a database query that would add 50–100ms to every inference.

**Trade-off accepted:** Approximate token budget — pre-flight checks use estimated token counts (input tokens known, output tokens estimated from model config). Actual token count is recorded post-inference in F546. Soft limit (80%) buffer absorbs this estimation error. Budget accuracy is ±10% for a typical output-heavy session.

**Backward compatibility:** No impact. T210 is new. FLOW-15 P4B F506 billing metering is separate (CF-240 proves separation).

---

### DD-104 — Circuit Breaker State Stored in Redis (Not Elasticsearch)

**Decision:** F550 (ICircuitBreakerService) stores circuit state (CLOSED/OPEN/HALF-OPEN) in Redis cache, not in Elasticsearch.

**Rationale:** Circuit breaker state is read on EVERY service call — potentially millions of times per minute. ES read latency (5–15ms) would add unacceptable overhead to every downstream call, defeating the purpose of a circuit breaker (which should add < 1ms overhead in the happy path). Redis reads are sub-millisecond. The circuit state is inherently ephemeral — an outage that resets all circuit states is operationally acceptable (circuits default to CLOSED on miss, services probe naturally). Historical circuit events ARE stored in ES for trend analysis and post-incident review.

**Trade-off accepted:** Redis failure resets all circuit states to CLOSED (miss = CLOSED default). This is a safe default — CLOSED means calls flow normally, which is the correct behavior when we can't verify circuit state. The rare Redis failure scenario is preferable to adding ES-level latency to the hot path.

**Backward compatibility:** No impact. F550 is new. FLOW-11 F343 uses a similar pattern for state machines.

---

### DD-105 — Silo Graduation Is Irreversible Post-Cutover

**Decision:** F558 (ISiloGraduationService) graduation is fully reversible before cutover (during migration), but completely irreversible after cutover. RollbackGraduation is only available pre-cutover.

**Rationale:** Post-cutover reversal requires: re-migrating all data back to pooled schema (potentially GB-scale), removing RLS policies, deactivating the silo schema, and re-routing all tenant traffic. This is more complex and riskier than the original graduation. More importantly, the pooled records for this tenant are DELETED post-cutover (CF-245 enforcement). There is nothing to revert to. Enterprise tenants choosing silo graduation are making a deliberate architectural decision; treating it as freely reversible would encourage operational confusion. Pre-cutover, the migration can be paused and rolled back cleanly because pooled data is unchanged.

**Trade-off accepted:** Permanent commitment requires high confidence before cutover. T215 addresses this with F558.VerifyMigrationAsync at 100% integrity threshold — the cutover gate is deliberately strict. The UI must clearly communicate the irreversible nature before CutoverToSilo is called.

**Backward compatibility:** No impact. F558 is new. Existing tenant isolation (F260 FLOW-08) is unchanged.

---

### DD-106 — Enterprise Audit PG WORM Is Authoritative Over ES Index

**Decision:** F561 (IEnterpriseAuditService) uses PostgreSQL as the authoritative WORM audit store and Elasticsearch as a secondary searchable index. In case of divergence, PG wins and ES is rebuilt from PG.

**Rationale:** WORM (Write-Once Read-Many) semantics require a storage engine that can enforce append-only at the DB layer via triggers and permission grants. PostgreSQL supports this natively via REVOKE UPDATE/DELETE grants and triggers. Elasticsearch has no native WORM enforcement — docs can always be deleted or updated by an operator with cluster access, making it unsuitable as a WORM source of truth. PG is also ACID-compliant for the audit entry write, ensuring no entry is partially written. ES provides the full-text search and aggregation capabilities that PG lacks, making it the ideal secondary index for compliance report queries (F564).

**Trade-off accepted:** Two writes per audit entry (PG + ES async). ES write failure is non-fatal (entry is in PG). ES rebuild from PG is operationally complex but rare (only after a major ES incident). The rebuild process is a documented runbook, not an automated recovery path.

**Backward compatibility:** FLOW-14 F459 (IWarehouseAuditService) uses the same dual-store pattern (DR-58 reuse). CF-248 proves index namespace isolation between F561 and F459.

---

# PART 3 — DESIGN RECORDS DR-76–DR-82

---

### DR-76 — Domain Provisioning Saga Uses Global Optimistic Lock (Not Distributed Lock)

**Decision:** CF-234 global domain uniqueness is enforced via Elasticsearch optimistic locking (`if_seq_no` + `if_primary_term` on `domain_registry_global` index), not via a distributed lock (Redis SETNX or ZooKeeper).

**Rationale:** Distributed locks have failure modes: lock holder crashes without releasing, lock TTL expires during slow operation, lock contention causes thundering herd. ES optimistic locking provides the same mutual exclusion without a lock lifecycle to manage. The domain document ID is the domain str itself — second writer's ES write returns a version conflict, which is directly translatable to DataProcessResult.Failure("DomainAlreadyClaimed"). ES is already in the critical path for domain registration, so no additional infrastructure is required.

**Backward compatibility:** No existing domain registration in prior flows. New `domain_registry_global` ES index created fresh. Domain names in this index never conflict with any prior index due to the dedicated index name.

---

### DR-77 — Analytics Pipeline Separation Proven by Index Prefix Convention

**Decision:** Analytics raw zone (F518) and FLOW-14 DWH raw landing (F438) separation (CF-236) is enforced at two layers: (1) index naming convention (`analytics_raw_` vs `raw_landing_`) checked at code generation time by AF-7, and (2) consumer group naming convention checked at QUEUE FABRIC provisioning time.

**Rationale:** Convention-only separation is fragile — a developer could accidentally write to the wrong index. AF-7 compliance check makes the convention a hard enforcement: generated code with cross-index references fails the compliance gate and is rejected before deployment. This makes the separation architectural (enforced at generation time) rather than operational (checked at runtime). The two consumer groups (`analytics-ingestion-cg` vs `dw-ingestion-cg`) provide the same enforcement at the queue layer — a consumer subscribed to the wrong group simply never sees the wrong events.

**Backward compatibility:** FLOW-14 F438 index naming predates this decision. FLOW-15 F518 adopts the `analytics_raw_` convention as the new prefix. No renaming of FLOW-14 indices required.

---

### DR-78 — OAuth Token Delegation to F427 Eliminates Dual Credential Stores

**Decision:** F528 (IOAuthExchangeService) delegates actual token storage to FLOW-14 F427 (ICredentialVaultService). F528's own PG table contains only token metadata (expiry, scope, status — no token values). This makes F427 the single credential store for all platform credentials.

**Rationale:** Two credential stores mean two BYOK rotation targets, two audit paths, and two access control policies. When F562 rotates the BYOK master key, only F427 needs re-encryption — F528 has no token values to re-encrypt. This simplifies the key rotation saga (CF-247) significantly. The platform's security posture is also improved: auditors verifying credential access can query one system (F427) for all token access events, not two.

**Backward compatibility:** F427 (FLOW-14) credential vault accepts integration tokens as a new credential type alongside existing connector credentials. The vault's ICredentialVaultService interface is generic — no interface change required.

---

### DR-79 — Circuit Breaker HALF-OPEN Uses Atomic Redis Probe Count

**Decision:** The "exactly one probe call in HALF-OPEN" guarantee (T212 IR-212-2) is implemented via Redis INCR on a per-circuit probe counter key with TTL equal to HALF_OPEN duration, not via a Lua script or distributed lock.

**Rationale:** Redis INCR is atomic and returns the new value in a single operation. INCR returns 1 for the first caller and 2+ for subsequent callers — first caller proceeds (count == 1), all others are rejected (count > 1). The probe counter key TTL (= HALF_OPEN_DURATION) automatically resets the probe count if the half-open window expires without a probe completing. This requires no lock cleanup and no explicit counter reset — TTL handles it. Lua script approach would work but adds complexity without benefit. Distributed lock approach has the same lifecycle management issues as noted in DR-76.

**Backward compatibility:** F550 (ICircuitBreakerService) is new. Existing state machine patterns (SK-57, FLOW-11 F343) are unaffected — they don't use circuit breaker semantics.

---

### DR-80 — Silo Graduation Cursor Survives Process Crash via PG Persistence

**Decision:** The graduation migration cursor (SK-122 EP-4 pattern) is persisted to PostgreSQL after each successful batch, not to Elasticsearch or Redis.

**Rationale:** Redis is ephemeral — a Redis failure or restart would lose the cursor, forcing a restart from batch 0 (risking duplicate records in silo). ES writes are eventually consistent — a crash between the ES write commit and the process acknowledging the write could produce a stale cursor. PG provides ACID commits — after F558.RunMigrationBatchAsync returns success, the cursor update is guaranteed durable. A crash between PG commit and the next batch read is safe: the next run reads the committed cursor and resumes exactly where it left off. The cursor is a single PG row update — the ACID overhead is negligible compared to batch migration throughput.

**Backward compatibility:** Cursor-based batch processing (EP-4) is an established pattern in the engine (SK-89, FLOW-14). This record documents the specific store choice rationale. No other graduation implementation in prior flows.

---

### DR-81 — BYOK Uses Envelope Encryption (Not Direct Encryption)

**Decision:** F562 (IByokService) uses envelope encryption: data is encrypted with a data encryption key (DEK), and the DEK is encrypted with the BYOK master key (KEK — Key Encryption Key) stored in the KMS. The encrypted DEK is stored alongside the data.

**Rationale:** Encrypting all data directly with the BYOK master key would require every read/write operation to call the KMS, which has latency (10–50ms per call) and rate limits. With envelope encryption, the DEK is decrypted once per session (one KMS call), then used directly for data encryption in memory. Key rotation only requires re-encrypting the DEK with the new master key (one KMS call per DEK) — not re-encrypting all data. This makes key rotation fast (minutes, not hours) and KMS-call-efficient. Envelope encryption is the standard pattern used by AWS KMS, Azure Key Vault, and Google Cloud KMS.

**Backward compatibility:** No prior BYOK implementation in the engine. F562 is new for FLOW-15 Family 73. The envelope encryption pattern does not affect any prior encryption at rest (which uses platform-managed keys, not BYOK).

---

### DR-82 — Compliance Report Defers on Stale Mart (Not Fails)

**Decision:** F564 (IComplianceReportService) adopts a deferred generation pattern (return requestId with DeferredReason: MartBuildInProgress) rather than a hard failure (DataProcessResult.Failure) when mart data is in-progress or stale (CF-250).

**Rationale:** A compliance report covering only partial data is worse than a deferred report — partial data could show misleadingly clean compliance metrics (missing violations that would appear in the complete mart). Hard failure frustrates admins who trigger reports just before mart build completes. Deferred generation: the request is accepted and queued; when MartBuildCompleted event arrives, pending reports for that tenant are triggered automatically. The admin is notified of deferral and receives an estimated completion time. This produces correct compliance evidence without requiring the admin to manually retry.

**Trade-off accepted:** Compliance report generation is not real-time — it depends on mart build cycles. For most compliance frameworks (SOC2, GDPR), reports are generated monthly or quarterly, so mart build dependency is not an operational constraint.

**Backward compatibility:** F564 is new. FLOW-14 mart building (F451, T174) is unchanged — it simply emits MartBuildCompleted which F564 now subscribes to. No changes to FLOW-14 mart pipeline.

---

# PART 4 — SUMMARY

| Section | Count | ID Range | Covers |
|---------|-------|----------|--------|
| Skill Patterns | 14 | SK-111–SK-124 | Families 68–73 core patterns |
| Design Decisions | 7 | DD-100–DD-106 | 7 architectural choices with rationale |
| Design Records | 7 | DR-76–DR-82 | 7 implementation decisions with backward compat |

## AF-4 RAG Index Update

After this P6C generation, AF-4 (RAG Task Context station) has the following new skills available for retrieval by T193–T218 task type generation:

| New Skill | Retrieved By | Reuse Anchor |
|-----------|-------------|--------------|
| SK-111 | T193, T194 | Domain saga + SSL lifecycle |
| SK-112 | T195, T213 | Blue-green gate + deploy health |
| SK-113 | T193, T195 | CDN field-merge write |
| SK-114 | T197, T198 | Analytics immutable raw zone |
| SK-115 | T198 | Windowed rollup + PG upsert |
| SK-116 | T201, T202 | PKCE exchange + token delegation |
| SK-117 | T203, T205 | HMAC relay + dedup |
| SK-118 | T206, T209 | AI context chain + usage tracking |
| SK-119 | T206, T207, T208 | AI add-on sandbox quota two-level |
| SK-120 | T211, T214 | Scale signal + AI forecast |
| SK-121 | T212 | Circuit FSM + Redis probe |
| SK-122 | T215, T217 | Silo cursor migration + cutover |
| SK-123 | T216, T218 | RLS lifecycle + FORCE + verification |
| SK-124 | T217, T218 | WORM chain + PG trigger enforcement |

---

# BACKWARD COMPATIBILITY CHECK

```
SK-1-SK-110:  UNCHANGED ✅  (this file adds SK-111–SK-124 only)
DD-1-DD-99:   UNCHANGED ✅  (this file adds DD-100–DD-106 only)
DR-1-DR-75:   UNCHANGED ✅  (this file adds DR-76–DR-82 only)
F1-F565:      UNCHANGED ✅
T1-T218:      UNCHANGED ✅
CF-1-CF-255:  UNCHANGED ✅
```

---

# DELTA SUMMARY

| Artifact | Before (Post-P5C) | After (Post-P6C) | Delta |
|----------|-------------------|-----------------|-------|
| Skill Patterns | 110 | 124 | +14 |
| Design Decisions | 99 | 106 | +7 |
| Design Records | 75 | 82 | +7 |

---

# MERGE TARGETS

- Append SK-111–SK-124 to: **SKILLS_FACTORY_RAG_MERGED.md** after SK-110
- Append DD-100–DD-106 to: **SKILLS_FACTORY_RAG_MERGED.md** Design Decisions section after DD-99
- Append DR-76–DR-82 to: **SKILLS_FACTORY_RAG_MERGED.md** Design Records section after DR-75

---

## SAVE POINT: FLOW15:P6C:SKILLS:COMPLETE ✅
## Next Phase: "Start FLOW15-P7C — session state + merge targets for canonical 7 files"


# ═══════════════════════════════════════════════════════════════════════════════
# FLOW-16 — GIANT SHOP MARKETPLACE SKILLS (SK-125–SK-132)
# Date: 2026-02-27 | Integrated from 16-files with renumbering
# ═══════════════════════════════════════════════════════════════════════════════

# XIIGen SKILLS FACTORY RAG — FLOW-16 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after FLOW-15 section in SKILLS_FACTORY_RAG_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P4b ✅

---

## PRE-FLOW-16 SKILLS STATE
```
Skill Patterns: SK-1–SK-124  (FLOW-01 through FLOW-15)
Next skill:     SK-125
```

---

# SKILL PATTERNS — SK-125 through SK-132

---

## SK-125 — Seller KYC Lifecycle Pattern

**Applicable Task Types**: T219 (Seller KYC Verification Gate)
**Primary Factories**: F566 (ISellerAccountService), F568 (IListingModerationService)
**Engine Primitive**: EP-1 (State Machine Registry) — KYC has explicit state transitions

**Pattern Description**:
KYC verification is a int-running lifecycle with external dependencies (document verification,
regulatory screening) and human review fallback. The pattern uses EP-1 State Machine to track
seller status across async steps.

**KYC State Machine**:
```
REGISTERED → PENDING_KYC → UNDER_REVIEW → APPROVED
                                        ↘ REJECTED → PENDING_KYC (resubmission allowed)
APPROVED → SUSPENDED → APPROVED (admin reinstatement)
APPROVED → CLOSED (permanent)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F566 — via IExternalServiceFactory<ISellerAccountService>.CreateAsync(ctx)
class ISellerAccountService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> RegisterSellerAsync(
        dict[str, Any] registrationPayload,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> SubmitKycDocumentsAsync(
        str sellerId,
        dict[str, Any] kycPayload, # DNA-1: no KycDocumentDto
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UpdateKycStatusAsync(
        str sellerId,
        str newStatus, # from state machine — EP-1
        str reason,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> ActivateStoreAsync(
        str sellerId,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UpdatePerformanceMetricsAsync(
        str sellerId,
        dict[str, Any] metricsPayload, # fulfillment_failure, dispute_rate, etc
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "state machine lifecycle gate" → retrieves SK-7 (EP-1 state machine pattern, FLOW-06)
- Search: "KYC document verification AI screening" → retrieves SK-129 (moderation pipeline)
- Search: "seller performance metrics update" → retrieves SK-125 (this skill)

**DNA Compliance**:
- DNA-1: All payloads are dict[str, Any] (no SellerDto, no KycDto)
- DNA-3: All methods return DataProcessResult[dict[str, Any]]
- DNA-4: RegisterSellerAsync, SubmitKycDocumentsAsync extend MicroserviceBase
- DNA-5: `tenantId` parameter on every method
- DNA-8: seller.registration_submitted event via EP-5 outbox (atomic with PG write)

---

## SK-126 — Saga Compensation Chain Pattern

**Applicable Task Types**: T221 (Cart-to-Order), T222 (Payment Escrow), T223 (Fulfillment Fork),
                           T224 (Dispute Arbitration), T225 (Payout Release)
**Primary Factories**: F569, F570, F571, F572, F574, F575, F578, F579
**Engine Primitive**: EP-4 (Idempotency Key Registry) — all compensation steps carry keys

**Pattern Description**:
The saga compensation chain is the core pattern for int-running financial transactions. Each saga
step registers a compensating action (in reverse order). If any step fails, compensations execute
LIFO. All compensation steps are idempotent via EP-4.

**Compensation Structure**:
```
SAGA STEP REGISTER ORDER (forward):
  S1: LockCart           COMPENSATION C1: UnlockCart
  S2: ValidateCoupon     COMPENSATION C2: ReleaseCoupon
  S3: HardReserveInventory COMPENSATION C3: ReleaseReservation
  S4: AuthorizePayment   COMPENSATION C4: VoidAuthorization
  S5: CreateOrder        COMPENSATION C5: CancelOrder + F579 outbox

COMPENSATION EXECUTION ORDER (LIFO on failure at step N):
  Fail at S4: execute C3 → C2 → C1 (skip C4: payment never authorized)
  Fail at S5: execute C4 → C3 → C2 → C1
```

**Key Invariants**:
1. Every compensation step calls F578.GetOrCreateAsync before executing (idempotent)
2. F579.WriteOutboxAsync used in S5 (CreateOrder) — compensations check outbox status
3. Compensation execution MUST log each step result (DataProcessResult) to audit trail
4. Compensation failure escalates to DLQ — NOT silently swallowed

**Python 3.12 + FastAPI Pattern Skeleton**:
```python
# All saga steps return DataProcessResult[SagaStepResult] (Dictionary-backed)
async def ExecuteSagaAsync(self, 
    dict[str, Any] sagaPayload,
    str tenantId,
    str correlationId)
{
     compensations = new Stack<Func<Task<DataProcessResult[dict[str, Any]]>>>()
    # S1: Lock cart
     cartKey = $"cart-lock-{correlationId}"
     idempotencyKey = await _f256.GetOrCreateAsync(cartKey, TimeSpan.FromHours(1))
    if (idempotencyKey.Value["status"]?.ToString() == "COMPLETED")
        return DataProcessResult[dict[str, Any]].Success(
            (dict[str, Any])idempotencyKey.Value["cachedResult"])
     s1 = await _f247.LockCartAsync(sagaPayload, tenantId, ct)
    if (!s1.IsSuccess) return s1; # No compensation needed — nothing executed
    compensations.Push(() => _f247.UnlockCartAsync(sagaPayload, tenantId, ct))
    # S3: Hard reserve (similar pattern)
     s3 = await _f250.PromoteToHardReservationAsync(sagaPayload, tenantId, ct)
    if (!s3.IsSuccess)
    {
        await ExecuteCompensationsAsync(compensations); # LIFO
        return s3
    }
    compensations.Push(() => _f250.ReleaseReservationAsync(
        sagaPayload, tenantId, TimeSpan.FromHours(24), ct))
    # ... S4, S5 follow same pattern
    return DataProcessResult[dict[str, Any]].Success(result)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "compensation LIFO saga pattern" → retrieves SK-126
- Search: "DataProcessResult financial flow" → retrieves SK-126
- Search: "idempotency key saga step" → retrieves SK-126 + SK-127

---

## SK-127 — Idempotency Key Gate Pattern

**Applicable Task Types**: T221, T222, T223, T224, T225 (all financial task types)
**Primary Factories**: F578 (IIdempotencyKeyRegistry — EP-4)
**Applies When**: DNA-9 violation risk — any factory method that creates, modifies, or deletes
financial state

**Pattern Description**:
The Idempotency Key Gate is a short circuit inserted BEFORE every financial operation. If the
key already exists and the operation is COMPLETED, return the cached result immediately. If
IN_PROGRESS, return 409 Conflict. Only NEW keys proceed to execution.

**State Machine**:
```
[not found] → GetOrCreateAsync → NEW → MarkInProgressAsync → [execute op]
                                                             → MarkCompletedAsync(result)
                                                             OR
                                                             → MarkFailedAsync(error)
[found] → status=IN_PROGRESS → 409 Conflict (duplicate in flight)
[found] → status=COMPLETED → return cachedResult (no-op)
[found] → status=FAILED → allow retry (create new attempt key variant)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F578 — via IExternalServiceFactory<IIdempotencyKeyRegistry>.CreateAsync(ctx)
class IIdempotencyKeyRegistry(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> GetOrCreateAsync(
        str operationKey,    # e.g. "auth-{orderId}-{attemptNum}"
        TimeSpan ttl,           # 24h for financial, 1h for inventory
        str tenantId)
    Task<DataProcessResult[bool]> MarkInProgressAsync(
        str operationKey, str tenantId)
    Task<DataProcessResult[bool]> MarkCompletedAsync(
        str operationKey,
        dict[str, Any] result, # cached for future retries
        str tenantId)
    Task<DataProcessResult[bool]> MarkFailedAsync(
        str operationKey,
        str errorCode,
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "idempotency key payment retry" → retrieves SK-127
- Search: "duplicate prevention financial" → retrieves SK-127
- Search: "EP-4 idempotency registry" → retrieves SK-127

**DNA Compliance**:
- DNA-1: dict[str, Any] for result storage (no IdempotencyResultDto)
- DNA-3: DataProcessResult[T] on all methods
- DNA-9: This skill IS the DNA-9 implementation pattern

---

## SK-128 — Transactional Outbox Write Pattern

**Applicable Task Types**: T221 (OrderPlaced), T222 (PaymentCaptured), T223 (ShipmentCreated),
                           T225 (PayoutReleased, PayoutHeld)
**Primary Factories**: F579 (ITransactionalOutboxRelay — EP-5)
**Applies When**: Any factory method that publishes a financial domain event

**Pattern Description**:
The Transactional Outbox Write Pattern guarantees that domain state changes and their associated
events are either BOTH committed or BOTH rolled back. The factory writes an outbox row in the
same PG transaction as the domain state change. F579's background relay worker polls
`outbox_events WHERE relayed_at IS NULL` and publishes to Queue Fabric.

**Outbox Table Schema**:
```sql
CREATE TABLE outbox_events (
  outbox_id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    VARCHAR(128) NOT NULL,           -- DNA-5
  event_type   VARCHAR(255) NOT NULL,           -- e.g. "order.placed"
  payload      JSONB NOT NULL,                  -- DNA-1: no typed model
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  relayed_at   TIMESTAMPTZ,                     -- NULL = not yet published
  relay_attempts INT DEFAULT 0
)
CREATE INDEX ON outbox_events (relayed_at, created_at) WHERE relayed_at IS NULL
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F579 — via IExternalServiceFactory<ITransactionalOutboxRelay>.CreateAsync(ctx)
class ITransactionalOutboxRelay(ABC):
{
    # Called WITHIN an existing PG transaction (IDbTransaction passed in)
    Task<DataProcessResult[str]> WriteOutboxEventAsync(
        str eventType,
        dict[str, Any] payload, # DNA-1
        str tenantId,
        IDbTransaction transaction,         # MUST be the same transaction as domain write)
    # Called by background relay worker — not by business logic
    Task<DataProcessResult[int]> RelayPendingEventsAsync(
        int batchSize,
        str tenantId)
}
```

**Usage Pattern (within a factory method)**:
```python
# F570.CreateOrderAsync — inside a unit of work
await using  tx = await _db.BeginTransactionAsync(ct)
# Write domain state (DNA-1: Dictionary, not OrderEntity)
 orderDoc = build_search_filter(payload); # DNA-2
 writeResult = await _db.StoreDocumentAsync("orders", orderDoc, tenantId, ct)
# Write outbox event in SAME transaction
await _f257.WriteOutboxEventAsync(
    "order.placed", orderDoc, tenantId, tx, ct)
await tx.CommitAsync(ct)
# F579 relay worker will publish to Queue Fabric asynchronously
```

**AF-4 RAG Retrieval Hints**:
- Search: "transactional outbox financial event" → retrieves SK-128
- Search: "EP-5 outbox relay pattern" → retrieves SK-128
- Search: "atomic state change event publish" → retrieves SK-128

---

## SK-129 — Listing Moderation Pipeline Pattern

**Applicable Task Types**: T220 (Listing Moderation Saga)
**Primary Factories**: F567 (IProductCatalogService), F568 (IListingModerationService)
**Engine Primitive**: AF-5 Multi-model orchestration (AI ENGINE FABRIC)

**Pattern Description**:
Listing moderation uses multi-model AI consensus for policy compliance decisions. Three models
run in parallel (AF-5 AiDispatcher). A 2/3 majority determines APPROVED or REJECTED. Split
decisions (1/3) route to human review queue.

**Moderation Pipeline**:
```
listing.submitted
  → AF-4 RAG: retrieve category policy rules (IRagService.SearchAsync)
  → AF-5 Multi-model: [Claude, GPT-4o, Gemini] in parallel
       Each model receives: listing content + category policy rules
       Each returns: {decision: APPROVE|REJECT, confidence: 0-1, violations: []}
  → AiDispatcher consensus aggregation:
       ≥ 2 APPROVE → moderation.approved
       ≥ 2 REJECT → moderation.rejected (with violations list)
       1/2 split → moderation.human_review (assign to moderation queue)
  → F567.UpdateListingStatusAsync (result stored as Dictionary)
  → F579.WriteOutboxEventAsync (moderation event — EP-5)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F568 — via IExternalServiceFactory<IListingModerationService>.CreateAsync(ctx)
class IListingModerationService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> CreateModerationCaseAsync(
        str listingId,
        dict[str, Any] listingContent, # DNA-1
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> RunModerationConsensusAsync(
        str caseId,
        dict[str, Any] policyContext, # from RAG
        str tenantId);  # internally calls IAiProvider.GenerateAsync()

    Task<DataProcessResult[dict[str, Any]]> RunKycScreeningAsync(
        str sellerId,
        dict[str, Any] kycDocuments, # DNA-1
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "multi-model consensus AI moderation" → retrieves SK-129
- Search: "listing policy compliance AI" → retrieves SK-129
- Search: "human review queue moderation" → retrieves SK-129

---

## SK-130 — Cart-to-Order State Machine Pattern

**Applicable Task Types**: T221 (Cart-to-Order Placement Saga)
**Primary Factories**: F569 (ICartStateService), F570 (IOrderManagementService)
**Engine Primitive**: EP-1 (State Machine Registry) — cart/order state transitions

**Pattern Description**:
Cart state and order state are distinct state machines with a transition gate between them.
Cart: EMPTY → ACTIVE → LOCKED (during checkout) → CONVERTED (order placed) or ABANDONED.
Order: CREATED → CONFIRMED → SHIPPED → DELIVERED → COMPLETED or CANCELED.

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F569 — Cart via IExternalServiceFactory<ICartStateService>.CreateAsync(ctx)
class ICartStateService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> AddItemAsync(
        str buyerId, dict[str, Any] item, str tenantId)
    Task<DataProcessResult[dict[str, Any]]> LockCartAsync(
        str buyerId, str correlationId, str tenantId);  # Redis SETNX

    Task<DataProcessResult[bool]> UnlockCartAsync(
        str buyerId, str tenantId);  # compensation

    Task<DataProcessResult[dict[str, Any]]> ConvertToOrderAsync(
        str buyerId, str orderId, str tenantId)
}

# F570 — Order via IExternalServiceFactory<IOrderManagementService>.CreateAsync(ctx)
class IOrderManagementService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> CreateOrderAsync(
        dict[str, Any] orderPayload, # DNA-1
        IDbTransaction transaction,              # EP-5 outbox same tx
        str tenantId)
    Task<DataProcessResult[bool]> CancelOrderAsync(
        str orderId, str reason, str idempotencyKey, str tenantId);  # compensation

    Task<DataProcessResult[dict[str, Any]]> UpdateOrderStatusAsync(
        str orderId, str newStatus, str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "cart state machine Redis lock" → retrieves SK-130
- Search: "order lifecycle OMS state" → retrieves SK-130
- Search: "cart to order conversion" → retrieves SK-130

---

## SK-131 — Dispute Evidence Collection Pattern

**Applicable Task Types**: T224 (Dispute Resolution Arbitration Gate)
**Primary Factories**: F574 (IDisputeArbitrationService), F571 (IPaymentEscrowService)
**Engine Primitive**: EP-2 (Durable Timer) — seller response SLA, evidence collection deadline

**Pattern Description**:
Dispute resolution is a multi-party structured workflow with evidence, SLA timers, AI-assisted
decision support, and protected financial outcomes. The pattern enforces: buyer evidence upload
→ seller response window (EP-2 timer) → AI review → human decision → refund/deny → payout
adjustment.

**Dispute State Machine**:
```
OPENED → SELLER_RESPONSE_PENDING (EP-2 timer: seller_response_hours)
       → [seller responds] EVIDENCE_COLLECTION (EP-2 timer: evidence_window_hours)
       → UNDER_AI_REVIEW (F574 calls IAiProvider for decision support)
       → PENDING_DECISION
       → DECIDED (with rationale + outcome)
         → [if refund] REFUND_EXECUTION → CLOSED
         → [if denied] CLOSED
       → [seller no-response timeout] ESCALATED → DECIDED (auto-favor-buyer)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F574 — via IExternalServiceFactory<IDisputeArbitrationService>.CreateAsync(ctx)
class IDisputeArbitrationService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> OpenDisputeAsync(
        dict[str, Any] disputePayload, # DNA-1
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UploadEvidenceAsync(
        str disputeId, dict[str, Any] evidence,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> GetAiDecisionSupportAsync(
        str disputeId, str tenantId); # calls IAiProvider.GenerateAsync() — AI ENGINE FABRIC

    Task<DataProcessResult[dict[str, Any]]> RecordDecisionAsync(
        str disputeId, dict[str, Any] decision, # DNA-1
        str idempotencyKey, str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "dispute evidence arbitration AI" → retrieves SK-131
- Search: "buyer protection window dispute" → retrieves SK-131
- Search: "EP-2 seller response SLA" → retrieves SK-131

---

## SK-132 — Marketplace Discovery Ranking Pattern

**Applicable Task Types**: T226 (Marketplace Discovery Ranking)
**Primary Factories**: F576 (IMarketplaceSearchService), F577 (IPromotionsRulesEngine)
**Fabric**: DATABASE FABRIC (ES — primary search engine) + RAG FABRIC (social signal retrieval)

**Pattern Description**:
Discovery ranking combines Elasticsearch relevance scoring with promotion overlays and optional
social personalization signals (read-only via RAG FABRIC — CF-268). Results are filtered to
PUBLISHED listings only (CF-267). Promotion overlays (coupons, flash deals) are applied post-search.

**Ranking Pipeline**:
```
buyer.search_request (query, filters, buyerId, tenantId)
  → [optional] IRagService.SearchAsync("social_signals", {buyerId}) → socialSignalContext
  → F576.SearchListingsAsync(query, filters, tenantId):
       ES query with mandatory filter: listing_status = PUBLISHED (CF-267)
       Relevance scoring: BM25 + conversion_rate + seller_score + recency
       Social boost: if socialSignalContext → boost listings from connected sellers (CF-268)
  → F577.ApplyPromotionOverlaysAsync(searchResults, tenantId):
       Flash deal badges
       Coupon eligibility markers
       Sponsored placement injection (FREEDOM config: sponsored_positions)
  → return ranked results (dict[str, Any][] — DNA-1)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F576 — via IExternalServiceFactory<IMarketplaceSearchService>.CreateAsync(ctx)
class IMarketplaceSearchService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> SearchListingsAsync(
        dict[str, Any] searchParams,    # DNA-1: no SearchQuery typed model
        dict[str, Any]? socialContext,  # optional — read-only from RAG (CF-268)
        str tenantId)
    Task<DataProcessResult[bool]> IndexListingAsync(
        str listingId,
        dict[str, Any] listingDoc,      # DNA-1
        str tenantId)
    Task<DataProcessResult[bool]> DeIndexListingAsync(
        str listingId, str tenantId)
}

# F577 — via IExternalServiceFactory<IPromotionsRulesEngine>.CreateAsync(ctx)
class IPromotionsRulesEngine(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> ValidateCouponAsync(
        str couponCode, str buyerId, str listingId,
        str tenantId)
    Task<DataProcessResult<dict[str, Any][]>> ApplyPromotionOverlaysAsync(
        dict[str, Any][] searchResults,
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "Elasticsearch marketplace listing ranking" → retrieves SK-132
- Search: "promotion overlay search results" → retrieves SK-132
- Search: "social signal personalization read-only" → retrieves SK-132

---


---

## MERGE:P4b STATE SAVE
```
MERGE:P4b = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: SK-125–SK-132 (8 skill patterns — FLOW-16 Giant Shop)
  SK-125: Seller KYC Lifecycle Pattern
  SK-126: Saga Compensation Chain Pattern (NEW — first in engine)
  SK-127: Idempotency Key Gate Pattern (NEW — EP-4 implementation)
  SK-128: Transactional Outbox Write Pattern (NEW — EP-5 implementation)
  SK-129: Listing Moderation Pipeline Pattern
  SK-130: Cart-to-Order State Machine Pattern
  SK-131: Dispute Evidence Collection Pattern
  SK-132: Marketplace Discovery Ranking Pattern
System: SK-1–SK-132
Next: SK-37
```
# XIIGen SKILLS FACTORY RAG — FLOW-16 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends into SKILLS_FACTORY_RAG_MERGED.md + UNIFIED_SOURCE_INDEX_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P4 ✅

---

## PRE-FLOW-16 SKILL STATE
```
Skill Patterns:   SK-1–SK-124  (FLOW-01 through FLOW-15)
Design Decisions: DD-1–DD-106  (FLOW-01 through FLOW-15)
Next skill:       SK-125
Next decision:    DD-107
```

---

# DESIGN DECISIONS — DD-107 through DD-115

## DD-107 — Bridge Tenancy as the Default Isolation Model

**Decision**: FLOW-16 marketplace entities use bridge isolation: pooled schema (shared PG tables
with `tenant_id` column + DB-enforced row-level security) by default, with a config-driven
graduation path to schema-per-tenant for enterprise sellers requiring stronger isolation.

**Context**: The 16-* multi-tenant research documents identified three models (shared schema,
separate schema, separate DB). Bridge isolation balances cost efficiency with correctness.

**Alternatives Rejected**:
- Shared schema only: blast radius too high for financial entities (payments, payouts)
- Separate DB per tenant: ops cost prohibitive at large tenant counts
- Schema per tenant as default: migration complexity without clear benefit for SMB sellers

**Consequences**:
- CF-269 enforces isolation at application layer (plus DB-layer RLS as defense-in-depth)
- F566–F577 all accept `tenantId` as first-class parameter (not optional)
- DR-84 formalizes the graduation path: pool → schema → instance based on seller tier config
- New sellers default to pool tier; enterprise sellers (config flag) use schema tier

---

## DD-108 — Saga Orchestration Over Choreography for Financial Flows

**Decision**: T221 (Cart-to-Order Saga), T222 (Payment Escrow), T223 (Fulfillment Fork), T224
(Dispute), and T225 (Payout Release) use orchestrator-centric saga coordination (not event
choreography).

**Context**: The deep research doc identified orchestrator sagas vs choreography sagas as the
key strategic choice. Financial flows require deterministic compensation and explicit rollback.

**Alternatives Rejected**:
- Choreography: harder to debug; compensation chains are implicit; retry semantics unclear
- Hybrid per-step: inconsistent behavior makes it hard to reason about failure modes

**Consequences**:
- T221 has an explicit 5-step sequence with 4 named compensation steps
- AF-2 (Planning station) must decompose each saga task type into ordered steps + compensations
- EP-4 (Idempotency Key Registry) is mandatory for all financial step invocations
- SK-126 (Saga Compensation Chain) is the canonical pattern for all financial task types

---

## DD-109 — Idempotency Key TTL = 24 Hours for Payment Operations

**Decision**: EP-4 idempotency keys for payment operations (authorize, capture, void, refund,
payout) expire after 24 hours. Non-payment operations (inventory, cart) expire after 1 hour.

**Context**: Must cover all realistic retry windows without unbounded Redis memory growth.
Payment gateway retry windows are typically 6–12 hours; 24h provides 2× headroom.

**Alternatives Rejected**:
- 1 hour for payments: too short for some gateway retry policies (network outages, bank windows)
- 7 days: Redis memory cost unjustifiable; idempotency keys accumulate faster than TTL

**Consequences**:
- F578.GetOrCreateAsync(operationKey, ttl) accepts TTL as parameter
- Financial factory methods pass `TimeSpan.FromHours(24)` to F578
- Non-financial factory methods pass `TimeSpan.FromHours(1)` to F578
- DNA-9 codifies these TTL values as FREEDOM config defaults

---

## DD-110 — Transactional Outbox as Mandatory Pattern for Financial Events

**Decision**: Any event that carries financial state (OrderPlaced, PaymentAuthorized,
PaymentCaptured, PaymentVoided, RefundExecuted, ShipmentCreated, PayoutReleased, PayoutHeld)
MUST be written to the EP-5 outbox table within the same database transaction as the domain state
change. Direct IQueueService.EnqueueAsync calls are PROHIBITED for financial events.

**Context**: The dual-write problem (DB commit succeeds, queue publish fails) is catastrophic in
payment flows. EP-5 Transactional Outbox eliminates this class of bug entirely.

**Alternatives Rejected**:
- Direct publish after commit: silently fails under pod restart, network partition
- Saga-level retry: does not help if the event was never published before the retry window
- At-least-once with deduplication downstream: shifts complexity to every consumer

**Consequences**:
- F579 (ITransactionalOutboxRelay) is a REQUIRED dependency for all financial factories
- AF-7 Compliance station validates that financial event factories use F579, not direct queue calls
- SK-128 (Transactional Outbox Write) is the canonical pattern for financial event publication
- ST-143 stress test validates crash-recovery behavior

---

## DD-111 — AI Listing Moderation Uses Parallel Multi-Model Consensus

**Decision**: T220 (Listing Moderation Saga) uses AF-5 multi-model orchestration with a 2/3
majority consensus rule. Moderation decisions require ≥ 2 of 3 AI models (Claude, GPT-4o,
Gemini) to agree. A split (1/3 or 0/3) routes to human review queue.

**Context**: F568 (IListingModerationService) uses AI ENGINE FABRIC. Single-model decisions on
policy compliance are unreliable. Multi-model consensus reduces false positive takedowns and
false negative approvals.

**Alternatives Rejected**:
- Single model: vendor-specific biases, no appeal path if model changes behavior
- Sequential fallback (not parallel): slower; first model's decision biases the second
- Unanimous (3/3): too many human review escalations for borderline content

**Consequences**:
- F568.RunModerationConsensusAsync returns consensus result + individual model votes
- Consensus stored in ModerationCase document (dict[str, Any] via DNA-1)
- Split results (1/3): ModerationCase.status = HUMAN_REVIEW, timer set for SLA response
- AF-9 Judge validates that consensus threshold is enforced (not bypassed)

---

## DD-112 — Discovery Ranking Uses Social Signals as Read-Only Input

**Decision**: T226 (Marketplace Discovery Ranking) MAY consume connection graph signals from F234
(FLOW-07) as a personalization input, but ONLY via RAG FABRIC (IRagService.SearchAsync). Zero
direct F234 factory calls from T226 generated code. CF-268 enforces this at BFA level.

**Context**: Social graph data (who is connected to whom, connection strength) is a valuable
personalization signal for marketplace search. But FLOW-07 and FLOW-16 are different domains.

**Alternatives Rejected**:
- Direct F234 factory call from T226: creates compile-time coupling between FLOW-07 and FLOW-16
- No social signals in ranking: misses significant personalization quality improvement
- Bidirectional (ranking writes social signals back): violates single responsibility; T226 would
  modify FLOW-07 state — unacceptable cross-domain write

**Consequences**:
- F576.SearchListingsAsync accepts optional `socialSignalContext` (dict[str, Any])
- Social signals retrieved via IRagService.SearchAsync before the F576 call
- CF-268 + AF-7 validate no direct F234 import in T226 generated code
- SK-132 includes the social signal RAG retrieval pattern

---

## DD-113 — Hard Inventory Reservation Uses Redis SETNX + PostgreSQL Row Lock

**Decision**: F572 implements a two-layer reservation: soft reservation in Redis (fast, eventually
consistent, TTL-backed) and hard reservation in PostgreSQL (serialized, ACID, permanent until
saga completes or compensation fires).

**Context**: Single-layer Redis reservation risks race conditions at high concurrency (two buyers
claiming same unit). Single-layer PG reservation is a latency bottleneck for browse-and-add-to-
cart (read-heavy) operations.

**Alternatives Rejected**:
- Redis-only: SETNX is fast but Redis is not ACID; hard reservations can be lost on Redis failure
- PG-only: cart add latency becomes 10–50ms instead of <1ms; poor UX for browsing
- Optimistic locking (version field): higher conflict rate at peak, harder compensation

**Consequences**:
- F572.SoftReserveAsync = Redis SETNX with TTL = `marketplace.inventory.soft_reservation.ttl`
- F572.PromoteToHardReservationAsync = Redis release + PG INSERT with SELECT FOR UPDATE
- CF-257 enforces cart TTL ≤ soft reservation TTL (aligned expiry)
- CF-260 enforces one HARD reservation per unit (PG uniqueness constraint as backstop)

---

## DD-114 — Marketplace UI Follows Fabric-First, Zero Platform-Specific Values

**Decision**: All marketplace UI components (product listing cards, checkout flow, seller
dashboard, dispute interface) are generated as fabric-first components. No hardcoded platform
values (no "Stripe" in UI, no "PostgreSQL" in UI, no hardcoded currency symbols or country codes).
All values sourced from FREEDOM config via DynamicController.

**Context**: Basic prompt requirement: "UI: Fabric-first, zero platform-specific values."
Marketplace UIs are typically the most platform-coupled part of an e-commerce system.

**Alternatives Rejected**:
- Platform-specific UI components: locks the generated system to one payment provider,
  one currency, one locale — violates the Freedom Machine philosophy
- Generic config without fabric awareness: loses ability to swap providers at runtime

**Consequences**:
- DR-86 formalizes the Marketplace UI Fabric Contract
- All payment provider logos/names sourced from `marketplace.ui.payment_providers` config
- All currency formatting sourced from `marketplace.ui.locale_config` config
- All checkout steps sourced from `marketplace.ui.checkout_steps_definition` config (DAG)
- DynamicController serves all UI configuration endpoints — no entity-specific controllers

---

## DD-115 — Seller Payout Uses Wallet Credit + Protection Window, Not Immediate Transfer

**Decision**: F575 credits seller wallet on delivery confirmation but holds actual bank transfer
until the buyer protection window (default: 15 days, configurable) expires. If no dispute opens
within the window, payout releases automatically. This is the "escrow-style" payout model.

**Context**: AliExpress escrow-style model from 16-* research. Protects buyers when sellers
have already been paid. Common in cross-border commerce.

**Alternatives Rejected**:
- Immediate payout on delivery: no protection for buyer if item arrives damaged/wrong after
  seller payout; platform must absorb refund cost
- Hold until buyer explicit confirm: most buyers never confirm; payouts never release
- Fixed 30-day window: too int for domestic commerce; too short for cross-border

**Consequences**:
- F575.CreditWalletAsync (on delivery) vs F575.ReleasePayoutAsync (after window)
- EP-2 Durable Timer registers window on delivery confirmation
- CF-262 dispute freeze overrides EP-2 timer release if dispute opens within window
- Window duration is FREEDOM config: `marketplace.payout.protection_window_days` (default: 15)
- SK-126 (Saga Compensation Chain) covers payout hold/release as named compensation step

---

# SKILL PATTERNS — SK-125 through SK-132

---

## SK-125 — Seller KYC Lifecycle Pattern

**Applicable Task Types**: T219 (Seller KYC Verification Gate)
**Primary Factories**: F566 (ISellerAccountService), F568 (IListingModerationService)
**Engine Primitive**: EP-1 (State Machine Registry) — KYC has explicit state transitions

**Pattern Description**:
KYC verification is a int-running lifecycle with external dependencies (document verification,
regulatory screening) and human review fallback. The pattern uses EP-1 State Machine to track
seller status across async steps.

**KYC State Machine**:
```
REGISTERED → PENDING_KYC → UNDER_REVIEW → APPROVED
                                        ↘ REJECTED → PENDING_KYC (resubmission allowed)
APPROVED → SUSPENDED → APPROVED (admin reinstatement)
APPROVED → CLOSED (permanent)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F566 — via IExternalServiceFactory<ISellerAccountService>.CreateAsync(ctx)
class ISellerAccountService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> RegisterSellerAsync(
        dict[str, Any] registrationPayload,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> SubmitKycDocumentsAsync(
        str sellerId,
        dict[str, Any] kycPayload, # DNA-1: no KycDocumentDto
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UpdateKycStatusAsync(
        str sellerId,
        str newStatus, # from state machine — EP-1
        str reason,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> ActivateStoreAsync(
        str sellerId,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UpdatePerformanceMetricsAsync(
        str sellerId,
        dict[str, Any] metricsPayload, # fulfillment_failure, dispute_rate, etc
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "state machine lifecycle gate" → retrieves SK-7 (EP-1 state machine pattern, FLOW-06)
- Search: "KYC document verification AI screening" → retrieves SK-129 (moderation pipeline)
- Search: "seller performance metrics update" → retrieves SK-125 (this skill)

**DNA Compliance**:
- DNA-1: All payloads are dict[str, Any] (no SellerDto, no KycDto)
- DNA-3: All methods return DataProcessResult[dict[str, Any]]
- DNA-4: RegisterSellerAsync, SubmitKycDocumentsAsync extend MicroserviceBase
- DNA-5: `tenantId` parameter on every method
- DNA-8: seller.registration_submitted event via EP-5 outbox (atomic with PG write)

---

## SK-126 — Saga Compensation Chain Pattern

**Applicable Task Types**: T221 (Cart-to-Order), T222 (Payment Escrow), T223 (Fulfillment Fork),
                           T224 (Dispute Arbitration), T225 (Payout Release)
**Primary Factories**: F569, F570, F571, F572, F574, F575, F578, F579
**Engine Primitive**: EP-4 (Idempotency Key Registry) — all compensation steps carry keys

**Pattern Description**:
The saga compensation chain is the core pattern for int-running financial transactions. Each saga
step registers a compensating action (in reverse order). If any step fails, compensations execute
LIFO. All compensation steps are idempotent via EP-4.

**Compensation Structure**:
```
SAGA STEP REGISTER ORDER (forward):
  S1: LockCart           COMPENSATION C1: UnlockCart
  S2: ValidateCoupon     COMPENSATION C2: ReleaseCoupon
  S3: HardReserveInventory COMPENSATION C3: ReleaseReservation
  S4: AuthorizePayment   COMPENSATION C4: VoidAuthorization
  S5: CreateOrder        COMPENSATION C5: CancelOrder + F579 outbox

COMPENSATION EXECUTION ORDER (LIFO on failure at step N):
  Fail at S4: execute C3 → C2 → C1 (skip C4: payment never authorized)
  Fail at S5: execute C4 → C3 → C2 → C1
```

**Key Invariants**:
1. Every compensation step calls F578.GetOrCreateAsync before executing (idempotent)
2. F579.WriteOutboxAsync used in S5 (CreateOrder) — compensations check outbox status
3. Compensation execution MUST log each step result (DataProcessResult) to audit trail
4. Compensation failure escalates to DLQ — NOT silently swallowed

**Python 3.12 + FastAPI Pattern Skeleton**:
```python
# All saga steps return DataProcessResult[SagaStepResult] (Dictionary-backed)
async def ExecuteSagaAsync(self, 
    dict[str, Any] sagaPayload,
    str tenantId,
    str correlationId)
{
     compensations = new Stack<Func<Task<DataProcessResult[dict[str, Any]]>>>()
    # S1: Lock cart
     cartKey = $"cart-lock-{correlationId}"
     idempotencyKey = await _f256.GetOrCreateAsync(cartKey, TimeSpan.FromHours(1))
    if (idempotencyKey.Value["status"]?.ToString() == "COMPLETED")
        return DataProcessResult[dict[str, Any]].Success(
            (dict[str, Any])idempotencyKey.Value["cachedResult"])
     s1 = await _f247.LockCartAsync(sagaPayload, tenantId, ct)
    if (!s1.IsSuccess) return s1; # No compensation needed — nothing executed
    compensations.Push(() => _f247.UnlockCartAsync(sagaPayload, tenantId, ct))
    # S3: Hard reserve (similar pattern)
     s3 = await _f250.PromoteToHardReservationAsync(sagaPayload, tenantId, ct)
    if (!s3.IsSuccess)
    {
        await ExecuteCompensationsAsync(compensations); # LIFO
        return s3
    }
    compensations.Push(() => _f250.ReleaseReservationAsync(
        sagaPayload, tenantId, TimeSpan.FromHours(24), ct))
    # ... S4, S5 follow same pattern
    return DataProcessResult[dict[str, Any]].Success(result)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "compensation LIFO saga pattern" → retrieves SK-126
- Search: "DataProcessResult financial flow" → retrieves SK-126
- Search: "idempotency key saga step" → retrieves SK-126 + SK-127

---

## SK-127 — Idempotency Key Gate Pattern

**Applicable Task Types**: T221, T222, T223, T224, T225 (all financial task types)
**Primary Factories**: F578 (IIdempotencyKeyRegistry — EP-4)
**Applies When**: DNA-9 violation risk — any factory method that creates, modifies, or deletes
financial state

**Pattern Description**:
The Idempotency Key Gate is a short circuit inserted BEFORE every financial operation. If the
key already exists and the operation is COMPLETED, return the cached result immediately. If
IN_PROGRESS, return 409 Conflict. Only NEW keys proceed to execution.

**State Machine**:
```
[not found] → GetOrCreateAsync → NEW → MarkInProgressAsync → [execute op]
                                                             → MarkCompletedAsync(result)
                                                             OR
                                                             → MarkFailedAsync(error)
[found] → status=IN_PROGRESS → 409 Conflict (duplicate in flight)
[found] → status=COMPLETED → return cachedResult (no-op)
[found] → status=FAILED → allow retry (create new attempt key variant)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F578 — via IExternalServiceFactory<IIdempotencyKeyRegistry>.CreateAsync(ctx)
class IIdempotencyKeyRegistry(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> GetOrCreateAsync(
        str operationKey,    # e.g. "auth-{orderId}-{attemptNum}"
        TimeSpan ttl,           # 24h for financial, 1h for inventory
        str tenantId)
    Task<DataProcessResult[bool]> MarkInProgressAsync(
        str operationKey, str tenantId)
    Task<DataProcessResult[bool]> MarkCompletedAsync(
        str operationKey,
        dict[str, Any] result, # cached for future retries
        str tenantId)
    Task<DataProcessResult[bool]> MarkFailedAsync(
        str operationKey,
        str errorCode,
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "idempotency key payment retry" → retrieves SK-127
- Search: "duplicate prevention financial" → retrieves SK-127
- Search: "EP-4 idempotency registry" → retrieves SK-127

**DNA Compliance**:
- DNA-1: dict[str, Any] for result storage (no IdempotencyResultDto)
- DNA-3: DataProcessResult[T] on all methods
- DNA-9: This skill IS the DNA-9 implementation pattern

---

## SK-128 — Transactional Outbox Write Pattern

**Applicable Task Types**: T221 (OrderPlaced), T222 (PaymentCaptured), T223 (ShipmentCreated),
                           T225 (PayoutReleased, PayoutHeld)
**Primary Factories**: F579 (ITransactionalOutboxRelay — EP-5)
**Applies When**: Any factory method that publishes a financial domain event

**Pattern Description**:
The Transactional Outbox Write Pattern guarantees that domain state changes and their associated
events are either BOTH committed or BOTH rolled back. The factory writes an outbox row in the
same PG transaction as the domain state change. F579's background relay worker polls
`outbox_events WHERE relayed_at IS NULL` and publishes to Queue Fabric.

**Outbox Table Schema**:
```sql
CREATE TABLE outbox_events (
  outbox_id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    VARCHAR(128) NOT NULL,           -- DNA-5
  event_type   VARCHAR(255) NOT NULL,           -- e.g. "order.placed"
  payload      JSONB NOT NULL,                  -- DNA-1: no typed model
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  relayed_at   TIMESTAMPTZ,                     -- NULL = not yet published
  relay_attempts INT DEFAULT 0
)
CREATE INDEX ON outbox_events (relayed_at, created_at) WHERE relayed_at IS NULL
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F579 — via IExternalServiceFactory<ITransactionalOutboxRelay>.CreateAsync(ctx)
class ITransactionalOutboxRelay(ABC):
{
    # Called WITHIN an existing PG transaction (IDbTransaction passed in)
    Task<DataProcessResult[str]> WriteOutboxEventAsync(
        str eventType,
        dict[str, Any] payload, # DNA-1
        str tenantId,
        IDbTransaction transaction,         # MUST be the same transaction as domain write)
    # Called by background relay worker — not by business logic
    Task<DataProcessResult[int]> RelayPendingEventsAsync(
        int batchSize,
        str tenantId)
}
```

**Usage Pattern (within a factory method)**:
```python
# F570.CreateOrderAsync — inside a unit of work
await using  tx = await _db.BeginTransactionAsync(ct)
# Write domain state (DNA-1: Dictionary, not OrderEntity)
 orderDoc = build_search_filter(payload); # DNA-2
 writeResult = await _db.StoreDocumentAsync("orders", orderDoc, tenantId, ct)
# Write outbox event in SAME transaction
await _f257.WriteOutboxEventAsync(
    "order.placed", orderDoc, tenantId, tx, ct)
await tx.CommitAsync(ct)
# F579 relay worker will publish to Queue Fabric asynchronously
```

**AF-4 RAG Retrieval Hints**:
- Search: "transactional outbox financial event" → retrieves SK-128
- Search: "EP-5 outbox relay pattern" → retrieves SK-128
- Search: "atomic state change event publish" → retrieves SK-128

---

## SK-129 — Listing Moderation Pipeline Pattern

**Applicable Task Types**: T220 (Listing Moderation Saga)
**Primary Factories**: F567 (IProductCatalogService), F568 (IListingModerationService)
**Engine Primitive**: AF-5 Multi-model orchestration (AI ENGINE FABRIC)

**Pattern Description**:
Listing moderation uses multi-model AI consensus for policy compliance decisions. Three models
run in parallel (AF-5 AiDispatcher). A 2/3 majority determines APPROVED or REJECTED. Split
decisions (1/3) route to human review queue.

**Moderation Pipeline**:
```
listing.submitted
  → AF-4 RAG: retrieve category policy rules (IRagService.SearchAsync)
  → AF-5 Multi-model: [Claude, GPT-4o, Gemini] in parallel
       Each model receives: listing content + category policy rules
       Each returns: {decision: APPROVE|REJECT, confidence: 0-1, violations: []}
  → AiDispatcher consensus aggregation:
       ≥ 2 APPROVE → moderation.approved
       ≥ 2 REJECT → moderation.rejected (with violations list)
       1/2 split → moderation.human_review (assign to moderation queue)
  → F567.UpdateListingStatusAsync (result stored as Dictionary)
  → F579.WriteOutboxEventAsync (moderation event — EP-5)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F568 — via IExternalServiceFactory<IListingModerationService>.CreateAsync(ctx)
class IListingModerationService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> CreateModerationCaseAsync(
        str listingId,
        dict[str, Any] listingContent, # DNA-1
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> RunModerationConsensusAsync(
        str caseId,
        dict[str, Any] policyContext, # from RAG
        str tenantId);  # internally calls IAiProvider.GenerateAsync()

    Task<DataProcessResult[dict[str, Any]]> RunKycScreeningAsync(
        str sellerId,
        dict[str, Any] kycDocuments, # DNA-1
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "multi-model consensus AI moderation" → retrieves SK-129
- Search: "listing policy compliance AI" → retrieves SK-129
- Search: "human review queue moderation" → retrieves SK-129

---

## SK-130 — Cart-to-Order State Machine Pattern

**Applicable Task Types**: T221 (Cart-to-Order Placement Saga)
**Primary Factories**: F569 (ICartStateService), F570 (IOrderManagementService)
**Engine Primitive**: EP-1 (State Machine Registry) — cart/order state transitions

**Pattern Description**:
Cart state and order state are distinct state machines with a transition gate between them.
Cart: EMPTY → ACTIVE → LOCKED (during checkout) → CONVERTED (order placed) or ABANDONED.
Order: CREATED → CONFIRMED → SHIPPED → DELIVERED → COMPLETED or CANCELED.

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F569 — Cart via IExternalServiceFactory<ICartStateService>.CreateAsync(ctx)
class ICartStateService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> AddItemAsync(
        str buyerId, dict[str, Any] item, str tenantId)
    Task<DataProcessResult[dict[str, Any]]> LockCartAsync(
        str buyerId, str correlationId, str tenantId);  # Redis SETNX

    Task<DataProcessResult[bool]> UnlockCartAsync(
        str buyerId, str tenantId);  # compensation

    Task<DataProcessResult[dict[str, Any]]> ConvertToOrderAsync(
        str buyerId, str orderId, str tenantId)
}

# F570 — Order via IExternalServiceFactory<IOrderManagementService>.CreateAsync(ctx)
class IOrderManagementService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> CreateOrderAsync(
        dict[str, Any] orderPayload, # DNA-1
        IDbTransaction transaction,              # EP-5 outbox same tx
        str tenantId)
    Task<DataProcessResult[bool]> CancelOrderAsync(
        str orderId, str reason, str idempotencyKey, str tenantId);  # compensation

    Task<DataProcessResult[dict[str, Any]]> UpdateOrderStatusAsync(
        str orderId, str newStatus, str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "cart state machine Redis lock" → retrieves SK-130
- Search: "order lifecycle OMS state" → retrieves SK-130
- Search: "cart to order conversion" → retrieves SK-130

---

## SK-131 — Dispute Evidence Collection Pattern

**Applicable Task Types**: T224 (Dispute Resolution Arbitration Gate)
**Primary Factories**: F574 (IDisputeArbitrationService), F571 (IPaymentEscrowService)
**Engine Primitive**: EP-2 (Durable Timer) — seller response SLA, evidence collection deadline

**Pattern Description**:
Dispute resolution is a multi-party structured workflow with evidence, SLA timers, AI-assisted
decision support, and protected financial outcomes. The pattern enforces: buyer evidence upload
→ seller response window (EP-2 timer) → AI review → human decision → refund/deny → payout
adjustment.

**Dispute State Machine**:
```
OPENED → SELLER_RESPONSE_PENDING (EP-2 timer: seller_response_hours)
       → [seller responds] EVIDENCE_COLLECTION (EP-2 timer: evidence_window_hours)
       → UNDER_AI_REVIEW (F574 calls IAiProvider for decision support)
       → PENDING_DECISION
       → DECIDED (with rationale + outcome)
         → [if refund] REFUND_EXECUTION → CLOSED
         → [if denied] CLOSED
       → [seller no-response timeout] ESCALATED → DECIDED (auto-favor-buyer)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F574 — via IExternalServiceFactory<IDisputeArbitrationService>.CreateAsync(ctx)
class IDisputeArbitrationService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> OpenDisputeAsync(
        dict[str, Any] disputePayload, # DNA-1
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> UploadEvidenceAsync(
        str disputeId, dict[str, Any] evidence,
        str tenantId)
    Task<DataProcessResult[dict[str, Any]]> GetAiDecisionSupportAsync(
        str disputeId, str tenantId); # calls IAiProvider.GenerateAsync() — AI ENGINE FABRIC

    Task<DataProcessResult[dict[str, Any]]> RecordDecisionAsync(
        str disputeId, dict[str, Any] decision, # DNA-1
        str idempotencyKey, str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "dispute evidence arbitration AI" → retrieves SK-131
- Search: "buyer protection window dispute" → retrieves SK-131
- Search: "EP-2 seller response SLA" → retrieves SK-131

---

## SK-132 — Marketplace Discovery Ranking Pattern

**Applicable Task Types**: T226 (Marketplace Discovery Ranking)
**Primary Factories**: F576 (IMarketplaceSearchService), F577 (IPromotionsRulesEngine)
**Fabric**: DATABASE FABRIC (ES — primary search engine) + RAG FABRIC (social signal retrieval)

**Pattern Description**:
Discovery ranking combines Elasticsearch relevance scoring with promotion overlays and optional
social personalization signals (read-only via RAG FABRIC — CF-268). Results are filtered to
PUBLISHED listings only (CF-267). Promotion overlays (coupons, flash deals) are applied post-search.

**Ranking Pipeline**:
```
buyer.search_request (query, filters, buyerId, tenantId)
  → [optional] IRagService.SearchAsync("social_signals", {buyerId}) → socialSignalContext
  → F576.SearchListingsAsync(query, filters, tenantId):
       ES query with mandatory filter: listing_status = PUBLISHED (CF-267)
       Relevance scoring: BM25 + conversion_rate + seller_score + recency
       Social boost: if socialSignalContext → boost listings from connected sellers (CF-268)
  → F577.ApplyPromotionOverlaysAsync(searchResults, tenantId):
       Flash deal badges
       Coupon eligibility markers
       Sponsored placement injection (FREEDOM config: sponsored_positions)
  → return ranked results (dict[str, Any][] — DNA-1)
```

**Python 3.12 + FastAPI Interface Skeleton**:
```python
# F576 — via IExternalServiceFactory<IMarketplaceSearchService>.CreateAsync(ctx)
class IMarketplaceSearchService(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> SearchListingsAsync(
        dict[str, Any] searchParams,    # DNA-1: no SearchQuery typed model
        dict[str, Any]? socialContext,  # optional — read-only from RAG (CF-268)
        str tenantId)
    Task<DataProcessResult[bool]> IndexListingAsync(
        str listingId,
        dict[str, Any] listingDoc,      # DNA-1
        str tenantId)
    Task<DataProcessResult[bool]> DeIndexListingAsync(
        str listingId, str tenantId)
}

# F577 — via IExternalServiceFactory<IPromotionsRulesEngine>.CreateAsync(ctx)
class IPromotionsRulesEngine(ABC):
{
    Task<DataProcessResult[dict[str, Any]]> ValidateCouponAsync(
        str couponCode, str buyerId, str listingId,
        str tenantId)
    Task<DataProcessResult<dict[str, Any][]>> ApplyPromotionOverlaysAsync(
        dict[str, Any][] searchResults,
        str tenantId)
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "Elasticsearch marketplace listing ranking" → retrieves SK-132
- Search: "promotion overlay search results" → retrieves SK-132
- Search: "social signal personalization read-only" → retrieves SK-132

---

# FLOW-16 CONCEPT MAP

```
FLOW-16 DOMAIN ENTITIES AND RELATIONSHIPS

[Seller] ─── KYC verified by ──→ [ModerationCase (KYC)]
    │                                    │ (F568 AI screening)
    │ creates                            ↓
    ↓                              [ModerationCase (Listing)]
[Listing] ─── screened by ────────────── ↑
    │                              (F568 multi-model consensus)
    │ published to
    ↓
[SearchIndex] ←── ranked by ──── [DiscoveryRanking]
    │                              (F576 + F577 overlays)
    │ discovered by
    ↓
[Cart] ─── converted to ──→ [Order] ─── triggers ──→ [Payment]
  (F569)          (T221 saga)  (F570)                    (F571)
                                │                          │
                           protected by                 captured after
                                │                          │
                           [InventoryReservation]      [Shipment] ←── fulfills
                               (F572)                    (F573)
                                                           │
                                                    delivered → starts
                                                           │
                                               [BuyerProtectionWindow] (EP-2)
                                                           │
                                            no dispute → [SellerPayout] (F575)
                                            dispute →   [DisputeCase] (F574)
                                                              │
                                                     decided → [Refund] (F571)
                                                              │
                                                         payout adjusted
```

# FLOW-16 COMPLETE EVENT CHAIN

```
1.  seller.registration_submitted    (F566 → EP-5 outbox)
2.  seller.kyc_approved              (F568 → EP-5 outbox)
3.  seller.store_activated           (F566 → EP-5 outbox)
4.  listing.draft_saved              (F567 — local, no outbox)
5.  listing.submitted                (F567 → EP-5 outbox)
6.  moderation.case_created          (F568)
7.  moderation.approved              (F568 → EP-5 outbox)
8.  listing.published                (F567 → EP-5 outbox → F576 index)
9.  inventory.soft_reserved          (F572 — local Redis)
10. inventory.hard_reserved          (F572 — PG row lock + EP-5 outbox)
11. order.placed                     (F570 → EP-5 outbox → downstream T222/T223)
12. payment.authorized               (F571 → EP-5 outbox)
13. order.confirmed                  (F570 → EP-5 outbox)
14. payment.escrowed                 (F571)
15. shipment.created                 (F573 → EP-5 outbox → triggers CF-261)
16. payment.captured                 (F571 → EP-5 outbox)
17. shipment.tracking_updated        (F573 — carrier webhook relay)
18. order.delivered                  (F573 → EP-5 outbox)
19. payout.scheduled                 (F575 → EP-2 timer: protection_window_days)
    [BRANCH A — No dispute]
20a. [EP-2 fires: protection window expired]
21a. payout.released                 (F575 → EP-5 outbox)
22a. seller.payout_released          (F575)
    [BRANCH B — Dispute opened]
20b. dispute.opened                  (F574 → Queue Fabric → CF-262 triggers)
21b. payout.held                     (F575 → EP-5 outbox → CF-265: 500ms notification)
22b. seller.payout_hold_notified     (F575)
23b. dispute.seller_responded        (F574)
24b. dispute.decided                 (F574)
25b. refund.executed                 (F571 → EP-5 outbox → CF-263: inventory check)
26b. payout.released (net of refund) (F575 → EP-5 outbox)
```

**Total domain events in FLOW-16: 26 (happy path: 22, dispute branch: +4)**
**All financial events (11–26) via EP-5 transactional outbox**
**All events carry tenantId (DNA-5)**
**Zero direct provider imports — all via fabric interfaces**

---

## MERGE:P4 STATE SAVE
```
MERGE:P4 = COMPLETE
Targets:
  SKILLS_FACTORY_RAG_MERGED.md    → SK-125–SK-132 appended
  UNIFIED_SOURCE_INDEX_MERGED.md  → DD-107–DD-115 + concept map + event chain appended
Added: DD-107–DD-115 (9 design decisions — FLOW-16)
Added: SK-125–SK-132 (8 skill patterns — FLOW-16)
Added: Concept map (8 entity types, relationships)
Added: Complete event chain (26 events, branching at dispute)
System: DD-1–DD-115, SK-1–SK-132
Next: MERGE:P5 → Validation (target: 95/95 PASS)
```


---

# ═══════════════════════════════════════════════════════
# FLOW-17 — FREELANCER MARKETPLACE PLATFORM
# Skills SK-133–SK-144 (12 patterns) | AF-4 RAG Retrieval Index
# ═══════════════════════════════════════════════════════


---

## SKILL OVERVIEW TABLE

| ID | Skill Name | Archetype | Primary Fabrics | AF-4 Trigger Keywords |
|----|-----------|-----------|-----------------|----------------------|
| SK-133 | Job Enrichment AI Pipeline | MARKETPLACE | AI ENGINE + DATABASE | job, enrich, skill extract, taxonomy |
| SK-134 | Idempotent Publish Gate | MARKETPLACE | DATABASE + QUEUE | publish, idempotent, state gate, index |
| SK-135 | RAG-Powered Talent Matching | ORCHESTRATION | RAG + DATABASE | match, rank, score, talent, discovery |
| SK-136 | Idempotent Token Spend Pattern | VALIDATION | DATABASE (ledger) + QUEUE | token, spend, wallet, connect, idempotency |
| SK-137 | Escrow Saga with Compensation | ESCROW_SAGA | DATABASE + QUEUE | escrow, fund, release, saga, compensation |
| SK-138 | Durable Money-Safe Ledger | ESCROW_SAGA | DATABASE (append-only) | ledger, journal, immutable, append |
| SK-139 | Dispute Hold & Lifecycle | VALIDATION | DATABASE + QUEUE | dispute, hold, evidence, arbitration |
| SK-140 | Work Evidence Capture Cycle | EVIDENCE_CAPTURE | DATABASE + QUEUE + CORE | work diary, time track, evidence, screenshot |
| SK-141 | KYC Gate with Policy Engine | VALIDATION | DATABASE + AI ENGINE | kyc, compliance, gate, policy, classification |
| SK-142 | Multi-Aggregate Flow Saga | DURABLE_SAGA | FLOW ENGINE + QUEUE | multi-aggregate, correlation, saga, orchestrate |
| SK-143 | Contest Handover & IP Transfer | MARKETPLACE | DATABASE + QUEUE | contest, handover, IP transfer, prize |
| SK-144 | Reputation Aggregation Engine | REPUTATION | DATABASE (immutable) + ES | reputation, score, review, tier, aggregate |

---

## SKILL DETAILS

---

### SK-133 — Job Enrichment AI Pipeline

```
PATTERN:    AI-powered enrichment of unstructured job description → normalised skill tags + category
ARCHETYPE:  MARKETPLACE
FABRICS:    AI ENGINE FABRIC (AiDispatcher, SK-386 (AiDispatcher)) + DATABASE FABRIC (ES taxonomy)

PROBLEM SOLVED:
  Raw job descriptions contain informal skill references (e.g. "React dev", "JS expert").
  Engine must normalise to taxonomy terms before indexing for accurate matching.

IMPLEMENTATION PATTERN:
  1. Receive job description as dict[str, Any] (DNA-1)
  2. Build AI prompt via AF-3 Prompt Library — extract skill list
  3. Dispatch via AiDispatcher (multi-model parallel: Claude + GPT)
  4. Merge skill outputs via AF-10 Merge (consensus: skill present in ≥2 models = confirmed)
  5. Normalise each skill via ISkillTaxonomyService.NormalizeSkillAsync()
  6. Merge normalised skills back into job Dictionary via ObjectProcessor
  7. Return DataProcessResult[dict[str, Any]] — never throw

FREEDOM CONFIG:
  ai_enrichment_model: ["claude-sonnet", "gpt-4o"]   # multi-model selection
  extraction_confidence_threshold: 0.7
  max_skill_tags: 20
  taxonomy_version: "v3"

DNA COMPLIANCE:
  ✅ DNA-1: job_data = dict[str, Any]
  ✅ DNA-2: build_search_filter on taxonomy ES lookup
  ✅ DNA-3: DataProcessResult[T] on all returns
  ✅ DNA-5: tenantId on taxonomy query

REUSABLE IN:  T227, T474, anywhere AI extracts structured fields from free text
AF-4 KEYWORDS: job enrich, skill extract, taxonomy normalise, AI pipeline
```

---

### SK-134 — Idempotent Publish Gate

```
PATTERN:    State gate that prevents duplicate publishes and handles near-real-time index lag
ARCHETYPE:  MARKETPLACE
FABRICS:    DATABASE FABRIC (PG state + ES index) + QUEUE FABRIC

PROBLEM SOLVED:
  Publish triggered twice (e.g., retry after timeout) must not create duplicate index entries
  or emit duplicate job.published events.

IMPLEMENTATION PATTERN:
  1. Check current status in F587 (PG) — if PUBLISHED, return existing result (idempotent)
  2. Update status PARSING_COMPLETE → PUBLISHED in atomic PG transaction
  3. Write to ES index via F589 (build_search_filter)
  4. Emit job.published to QUEUE FABRIC via outbox (transactional — same DB transaction as status update)
  5. Acknowledge: return DataProcessResult with published document reference

OUTBOX PATTERN:
  OutboxEvent row created in same PG transaction as status change.
  Background relay reads outbox → publishes to QUEUE FABRIC → marks delivered.
  Prevents dual-write failure between PG and QUEUE FABRIC.

DNA COMPLIANCE:
  ✅ DNA-1: All documents as dict[str, Any]
  ✅ DNA-2: build_search_filter on ES publish query
  ✅ DNA-5: tenantId in PG + ES
  ✅ DNA-3: DataProcessResult — never throw on duplicate

REUSABLE IN:  T228, any publish/activate gate in any flow
AF-4 KEYWORDS: publish gate, outbox, idempotent publish, index lag
```

---

### SK-135 — RAG-Powered Talent Matching

```
PATTERN:    Config-driven RAG strategy for scoring and ranking talent against job requirements
ARCHETYPE:  ORCHESTRATION
FABRICS:    RAG FABRIC (SK-389 (HybridRagStrategy), config-selected strategy) + DATABASE FABRIC (ES profiles)

PROBLEM SOLVED:
  Matching algorithm must be swappable (cosine similarity, keyword, hybrid, graph)
  without changing orchestration code. Strategy selected via FREEDOM config.

IMPLEMENTATION PATTERN:
  1. Build search context from job enriched skills (dict[str, Any])
  2. Call IRagService.SearchAsync(context, strategyFromConfig)
  3. RAG FABRIC resolves strategy (Vector / Hybrid / Graph) from config
  4. Score each candidate against job requirements
  5. Return ranked DataProcessResult<List<dict[str, Any]>>
  6. All candidate profiles tenantId-scoped (DNA-5)

FREEDOM CONFIG:
  matching_rag_strategy: "hybrid"     # split | fanout | tiered | hybrid | graph | vector | multi
  match_score_threshold: 0.6
  max_results: 50

DNA COMPLIANCE:
  ✅ DNA-2: build_search_filter on ES profile query (empty field skipping)
  ✅ DNA-5: tenantId on all ES queries
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T229, T476, any discovery ranking flow
AF-4 KEYWORDS: talent match, RAG scoring, rank, discovery, hybrid search
```

---

### SK-136 — Idempotent Token Spend Pattern

```
PATTERN:    Atomic token deduction with idempotency key — immutable ledger journal
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG — immutable token ledger)

PROBLEM SOLVED:
  Network retries can trigger float-spend on token wallets.
  Must guarantee exactly-once deduction regardless of retry count.

IMPLEMENTATION PATTERN:
  1. Compute idempotencyKey = hash(userId + operationId + amount)
  2. Begin PG transaction
  3. Attempt INSERT into token_ledger (userId, idempotencyKey UNIQUE, amount, type=SPEND)
  4. ON CONFLICT (idempotencyKey) → SELECT existing row → return same DataProcessResult (idempotent)
  5. Validate balance: SELECT SUM(amount) WHERE userId — if insufficient, rollback, return INSUFFICIENT
  6. COMMIT
  7. Emit token.spent event to QUEUE FABRIC via outbox

KEY CONSTRAINT:
  UNIQUE constraint on (userId, idempotencyKey) enforced at DB level — not just application level.
  This is the only safe guarantee for concurrent retry safety.

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult — never throw for business logic (balance, duplicate key)
  ✅ DNA-5: tenantId + userId scoped

REUSABLE IN:  T231, T232, F585, any tokenised spend flow
AF-4 KEYWORDS: token spend, idempotency, wallet, connect, deduct, immutable ledger
```

---

### SK-137 — Escrow Saga with Compensation

```
PATTERN:    Multi-step durable saga for escrow operations with rollback compensation
ARCHETYPE:  ESCROW_SAGA
FABRICS:    DATABASE FABRIC (PG) + QUEUE FABRIC

PROBLEM SOLVED:
  Milestone funding involves F606 escrow hold, F607 ledger entry, F610 fee calculation.
  If any step fails mid-saga, prior steps must compensate to avoid orphaned funds.

SAGA STEPS:
  Step 1: F605 CreateMilestone — compensation: F605 delete draft milestone
  Step 2: F610 CalculateFee — compensation: discard fee calculation (no side-effects)
  Step 3: F606 HoldFunds (idempotent) — compensation: F606 ReverseHold
  Step 4: F607 JournalEntry(FUND) — compensation: F607 JournalEntry(FUND_REVERSED) [append-only reversal]
  Step 5: Emit milestone.funded to QUEUE FABRIC

COMPENSATION INVARIANT:
  F607 compensation = append new FUND_REVERSED entry (never delete FUND entry).
  Immutable ledger maintained even during compensation.

FORWARD RECOVERY:
  Each saga step writes to StepInstance table before executing.
  On restart: replay from last incomplete StepInstance.
  Idempotency keys ensure replay safety.

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult on every step
  ✅ DNA-5: tenantId + contractId + milestoneId scoped
  ✅ SK-138: Uses Durable Money-Safe Ledger pattern

REUSABLE IN:  T236, T238, T241, any multi-step money saga
AF-4 KEYWORDS: escrow saga, compensation, fund release, idempotent money, saga rollback
```

---

### SK-138 — Durable Money-Safe Ledger

```
PATTERN:    Append-only float-entry journal with idempotency for all financial movements
ARCHETYPE:  ESCROW_SAGA
FABRICS:    DATABASE FABRIC (PG — append-only with UNIQUE idempotency constraint)

PROBLEM SOLVED:
  Mutable balance fields can corrupt under concurrent updates or partial failures.
  Immutable ledger journal is the only safe pattern for money tracking.

IMPLEMENTATION PATTERN:
  Table: escrow_ledger
    id             UUID PK
    tenant_id      UUID NOT NULL (DNA-5)
    contract_id    UUID NOT NULL
    milestone_id   UUID NOT NULL
    entry_type     ENUM(FUND, RELEASE, REFUND, FEE, PAYOUT, FUND_REVERSED, PRIZE_RELEASE)
    amount         DECIMAL(18,6) NOT NULL
    currency       VARCHAR(3) NOT NULL
    idempotency_key VARCHAR(255) UNIQUE NOT NULL
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO UPDATED_AT — append only, never update

  CONSTRAINTS:
    UNIQUE(idempotency_key)               -- prevents duplicate entries
    CHECK (amount != 0)                   -- zero-amount entries are logic errors
    NO DELETE GRANT on table              -- enforced at DB role level, not just app level

BALANCE QUERY:
  SELECT SUM(CASE WHEN entry_type IN ('FUND','PRIZE_RELEASE') THEN amount
                  WHEN entry_type IN ('RELEASE','REFUND','FEE','PAYOUT','FUND_REVERSED') THEN -amount
             END) AS balance
  FROM escrow_ledger
  WHERE milestone_id = :milestone_id AND tenant_id = :tenant_id

DNA COMPLIANCE:
  ✅ DNA-1: No typed EscrowLedgerEntry model — query result as dict[str, Any]
  ✅ DNA-5: tenant_id on every row
  ✅ DNA-3: DataProcessResult — duplicate idempotency key = same result, not exception

REUSABLE IN:  F607, T236, T238, T241, T244, any ledger-based financial flow
AF-4 KEYWORDS: ledger, journal, append-only, immutable, idempotency key, float-entry
```

---

### SK-139 — Dispute Hold & Lifecycle

```
PATTERN:    Atomic dispute creation + escrow hold placement; full dispute lifecycle management
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG) + QUEUE FABRIC

PROBLEM SOLVED:
  Dispute open and escrow hold must be atomic — a released-before-hold race condition
  can allow funds to escape before dispute is active.

IMPLEMENTATION PATTERN:
  1. Begin PG transaction
  2. INSERT dispute record (status=OPEN, milestoneId, tenantId)
  3. INSERT dispute_hold record (milestoneId, status=ACTIVE)
  4. UPDATE escrow_state: blocked=true (F606 checks this before any release)
  5. COMMIT
  6. Emit dispute.opened via outbox → QUEUE FABRIC
  7. F616.ReleaseFundsAsync now returns ESCROW_HOLD_ACTIVE until hold lifted

HOLD LIFT (resolution):
  1. F620 decision confirmed
  2. F607 journal RESOLVE entry
  3. UPDATE dispute_hold: status=LIFTED
  4. F606 unblocked — release/refund proceeds

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult on all dispute operations
  ✅ DNA-5: tenantId + contractId + milestoneId scoped

REUSABLE IN:  T239, T241, F616, F617
AF-4 KEYWORDS: dispute hold, escrow block, atomic hold, dispute lifecycle
```

---

### SK-140 — Work Evidence Capture Cycle

```
PATTERN:    Periodic durable timer-triggered evidence capture with privacy controls
ARCHETYPE:  EVIDENCE_CAPTURE
FABRICS:    DATABASE FABRIC (ES + PG) + QUEUE FABRIC + CORE FABRIC (object store ref)

PROBLEM SOLVED:
  Hourly billing evidence (screenshots, activity counts) must be captured periodically,
  stored with strict privacy controls, and made available for dispute evidence packaging.

IMPLEMENTATION PATTERN:
  1. Durable TimerInstance fires every N minutes (FREEDOM config)
  2. F615 captures activity counts (clicks, keystrokes count only — no content)
  3. F611 records time slot with activity summary + screenshot external ref
  4. Screenshot object stored in CORE FABRIC object store (not ES)
  5. F611 ES document: { tenantId, contractId, slotStart, slotEnd, activityCount, screenshotRef }
  6. F614 updates evidence package for this contract
  7. Access control: F611.GetWorkDiaryAsync verifies callerRole ∈ {CLIENT, FREELANCER, ADMIN}

PRIVACY RULES:
  - Screenshot = external object reference ONLY (CF-293)
  - Activity = numeric count ONLY (CF-294)
  - Access = contract parties ONLY (CF-292)
  - Retention = per F629 IDataRetentionService schedule

DNA COMPLIANCE:
  ✅ DNA-1: Slot document as Dictionary (no typed WorkDiarySlot model)
  ✅ DNA-5: tenantId + contractId on every record
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T243, F611, F612, F614, F615
AF-4 KEYWORDS: work diary, time tracking, evidence capture, screenshot ref, activity count
```

---

### SK-141 — KYC Gate with Policy Engine

```
PATTERN:    Compliance gate evaluation — KYC verification + enterprise policy + classification
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG + ES) + AI ENGINE FABRIC

PROBLEM SOLVED:
  Contract activation requires a variable set of compliance checks depending on tenant type
  and jurisdiction. Hard-coding check order breaks multi-tenant flexibility.

IMPLEMENTATION PATTERN:
  1. F625 loads tenant compliance profile (tenantId, required gates, jurisdiction)
  2. F601 evaluates gate list:
     - KYC gate: F584.GetKYCStatusAsync → must = VERIFIED + not expired
     - Policy gate: F603.EvaluatePolicyAsync (per-tenant FREEDOM config rules)
     - Classification gate (ENTERPRISE only): F602.AssessClassificationRiskAsync
  3. All gates = PASSED → return DataProcessResult IsSuccess=true
  4. Any gate FAILED → return DataProcessResult IsSuccess=false, include gate failure list
  5. All gate evaluations recorded in F626 audit log

FREEDOM CONFIG:
  compliance_gates_required: ["kyc", "policy"]          # per tenant config in ES
  enterprise_gates_required: ["kyc", "policy", "classification"]
  kyc_expiry_days: 365
  classification_risk_threshold: "LOW"

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult — never throw for compliance failure
  ✅ DNA-5: tenantId on every evaluation
  ✅ DNA-2: build_search_filter on policy rule ES query

REUSABLE IN:  T235, T242, F601, F625
AF-4 KEYWORDS: KYC gate, compliance policy, activation gate, classification, hard stop
```

---

### SK-142 — Multi-Aggregate Flow Saga

```
PATTERN:    Single flow instance coordinating multiple domain aggregates with correlation
ARCHETYPE:  DURABLE_SAGA
FABRICS:    FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) + QUEUE FABRIC

PROBLEM SOLVED:
  A contract flow spans Job → Proposal → Contract → Milestone → Escrow → Dispute.
  The flow orchestrator must correlate all aggregates in one execution narrative.

IMPLEMENTATION PATTERN:
  FlowInstance:
    id: UUID
    flow_key: "contract-escrow-v1"
    subject_refs: [
      { type: "job",      id: jobId },
      { type: "proposal", id: proposalId },
      { type: "contract", id: contractId },
      { type: "milestone",id: milestoneId }
    ]
    correlation_id: UUID         # spans all events for observability
    current_state: "MILESTONE_IN_REVIEW"
    tenant_id: UUID              # DNA-5

  Correlation:
    Every domain event includes correlation_id + tenant_id
    FlowOrchestrator (SK-392 (RagStrategyRegistry)) matches events to FlowInstance via subject_refs

  State persistence:
    StepInstance table: one row per step execution
    Each step idempotent — safe to replay from any StepInstance on restart

DNA COMPLIANCE:
  ✅ DNA-5: tenantId on FlowInstance + every StepInstance
  ✅ DNA-3: DataProcessResult on each step
  ✅ EP-4: Cursor/state persist before advancing (from FLOW-14)

REUSABLE IN:  T236–T241, any multi-aggregate saga across flows
AF-4 KEYWORDS: multi-aggregate, flow instance, correlation, saga, subject refs
```

---

### SK-143 — Contest Handover & IP Transfer

```
PATTERN:    IP ownership transfer gate — mandatory before prize release
ARCHETYPE:  MARKETPLACE
FABRICS:    DATABASE FABRIC (PG immutable) + QUEUE FABRIC

PROBLEM SOLVED:
  Contest prize must not release before intellectual property ownership is legally transferred.
  Transfer record must be immutable (certifiable for legal/compliance purposes).

IMPLEMENTATION PATTERN:
  1. F596 awards winner (contest.winner.awarded event)
  2. F597 initiates handover: creates handover_request record (status=PENDING)
  3. Both parties acknowledge transfer (winner signs off on ownership transfer)
  4. F630 records IP transfer: INSERT ip_transfer (immutable, CERTIFIED status)
  5. F630.CertifyTransferAsync → status locked, no further updates
  6. ownership.transferred event emitted to QUEUE FABRIC
  7. F606 prize release NOW permitted (CF-283 gate checks F630 status)

IMMUTABILITY:
  ip_transfer table: INSERT only. No UPDATE after status=CERTIFIED.
  Enforced via CHECK constraint: UPDATE blocked if current status = CERTIFIED.

DNA COMPLIANCE:
  ✅ DNA-1: Handover document = dict[str, Any]
  ✅ DNA-5: tenantId + contestId on every record
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T244, F597, F630
AF-4 KEYWORDS: contest handover, IP transfer, ownership transfer, prize release gate
```

---

### SK-144 — Reputation Aggregation Engine

```
PATTERN:    Immutable review journal → derived reputation score → tier evaluation
ARCHETYPE:  REPUTATION
FABRICS:    DATABASE FABRIC (PG journal + ES score index)

PROBLEM SOLVED:
  Reputation must be trustworthy — reviews immutable, score derived (not stored as mutable),
  tier computed from score with configurable thresholds.

IMPLEMENTATION PATTERN:
  1. F581 receives new review: INSERT into review_journal (immutable append)
  2. Score recomputation:
     SELECT weighted_avg(rating * weight) FROM review_journal WHERE freelancerId = :id AND tenantId = :tid
     Score weights per category from FREEDOM config (not hardcoded)
  3. Write computed score to ES profile index (upsert — this IS mutable, but derived)
  4. F586 evaluates tier: score >= tier_threshold → promote/demote tier record
  5. F589 updates profile search index with new score + tier
  6. reputation.updated event emitted

REVIEW IMMUTABILITY:
  review_journal: INSERT only. UNIQUE (contractId, reviewerId) — one review per contract per party.
  No UPDATE after insertion. Score is always recomputed, never patched.

FREEDOM CONFIG:
  tier_thresholds: { top_rated: 4.8, rising_talent: 4.5, preferred: 4.2 }
  score_weights: { quality: 0.4, communication: 0.3, deadline: 0.3 }

DNA COMPLIANCE:
  ✅ DNA-1: Review document = dict[str, Any]
  ✅ DNA-5: tenantId + freelancerId scoped
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T245, F581, F586
AF-4 KEYWORDS: reputation, review, score, tier, immutable journal, aggregation
```

---

## AF-4 RAG RETRIEVAL INDEX FOR FLOW-17

When the AF-4 station searches for patterns relevant to FLOW-17 task types, it should retrieve:

| Query Keywords | Skills Retrieved | Task Types Relevant |
|---------------|-----------------|---------------------|
| job enrich, skill extract, AI taxonomy | SK-133 | T227, T474 |
| publish, idempotent, outbox, index | SK-134 | T228 |
| match, talent, RAG, scoring | SK-135 | T229 |
| token, spend, idempotency, wallet | SK-136 | T231, T232 |
| escrow, saga, fund, release, compensation | SK-137 | T236, T238, T241 |
| ledger, append-only, immutable, float-entry | SK-138 | T236, T238, T241, T244 |
| dispute, hold, evidence, arbitration | SK-139 | T239, T240, T241 |
| work diary, time tracking, evidence, screenshot | SK-140 | T243 |
| KYC, compliance, gate, policy, activation | SK-141 | T235, T242 |
| multi-aggregate, flow correlation, saga | SK-142 | T236–T241 |
| contest, IP transfer, handover, prize | SK-143 | T244 |
| reputation, review, score, tier | SK-144 | T245 |

### Cross-Reference with Prior Flow Skills (always check before regenerating):
| Prior Skill | Reusable for FLOW-17 |
|-------------|---------------------|
| SK-37–SK-43 (FLOW-09 search patterns) | F589 ISearchIndexService — reuse, do not regenerate |
| SK-89–SK-98 (FLOW-14 warehouse patterns) | F626 audit + F627 report queries — extend, do not duplicate |
| SK-79–SK-88 (FLOW-13 patterns) | AI pipeline patterns reusable in SK-133 |

---

## BACKWARD COMPATIBILITY

```
SK-1–SK-98:    UNCHANGED ✅
SK-133–SK-144:  NEW in FLOW-17  (+12 skills)
```

---

## SAVE POINT: FLOW17:P4:SKILLS_FACTORY_RAG ✅
## Next: Load FLOW15_P5_UNIFIED_SOURCE_INDEX

---

## MERGE:P4 STATE SAVE (FLOW-17)
```
MERGE:P4 = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: SK-133–SK-144 (12 skill patterns — FLOW-17)
Added: AF-4 RAG retrieval index for freelancer marketplace domain
New patterns: Job Enrichment AI Pipeline, Idempotent Token Spend, Escrow Saga with Compensation,
  Durable Money-Safe Ledger, Dispute Hold & Lifecycle, Work Evidence Capture, KYC Gate,
  Multi-Aggregate Saga, Contest Handover, Reputation Aggregation
System: SK-1–SK-144
Next: MERGE:P5 → DD-116–DD-129 + DR-89–DR-98
```

## SAVE POINT: FLOW17:P4:SKILLS_FACTORY_RAG ✅


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-18 — SKILLS FACTORY RAG PATTERNS
# SK-145–SK-160 (16 skill patterns)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PRE-FLOW-18 STATE
```
Skills: SK-1–SK-144
```

---

## SKILL PATTERNS — FLOW-18

### SK-145: Canvas Initialization Patterns
```
DOMAIN: Visual flow creation, DAG initialization, canvas state management
TASK TYPES: T247, T250
FACTORIES: F631, F635, F636
FABRIC BINDINGS: DATABASE FABRIC (ES), CORE FABRIC
REUSABLE FROM: SK-08 (flow-definition), SK-09 (flow-orchestrator)
PATTERN:
  - Canvas state as single ES document (dict[str, Any])
  - Empty DAG with 1 START node
  - Atomic save: canvas + history stack in single transaction
  - Undo/redo via operation log (append-only in Redis, periodic ES snapshot)
AF-4 RETRIEVAL KEYWORDS: canvas, initialize, DAG, empty, start node, undo, redo, history
```

### SK-146: Node Intelligence Patterns
```
DOMAIN: Intent classification, schema inference, dependency resolution, configuration
TASK TYPES: T248, T261
FACTORIES: F637, F638, F639, F640
FABRIC BINDINGS: AI ENGINE FABRIC, RAG FABRIC, DATABASE FABRIC (ES)
REUSABLE FROM: SK-17 (code-generator), SK-06 (ai-providers)
PATTERN:
  - Intent classification via multi-model consensus (confidence > 0.7)
  - Schema inference from adjacent node schemas (input→output chain)
  - Factory dependency resolution via registry search (build_search_filter)
  - Configuration wizard as state machine (step-by-step Dictionary)
AF-4 RETRIEVAL KEYWORDS: intent, classify, schema, infer, dependency, resolve, wizard, configure
```

### SK-147: Auto-Layout & Preview Patterns
```
DOMAIN: Graph layout algorithms, execution path simulation, deadlock detection
TASK TYPES: T250
FACTORIES: F635, F642
FABRIC BINDINGS: CORE FABRIC
REUSABLE FROM: SK-08 (flow-definition DAG structure)
PATTERN:
  - Dagre/ELK layout algorithms via CORE FABRIC ObjectProcessor
  - Critical path highlighting via topological sort + weight accumulation
  - Deadlock detection via cycle detection on conditional edges
  - Preview simulation walks DAG without executing code
AF-4 RETRIEVAL KEYWORDS: layout, dagre, elk, preview, critical path, deadlock, simulation
```

### SK-148: Code Generation Pipeline Patterns
```
DOMAIN: Multi-model code generation, DNA validation, template rendering
TASK TYPES: T251
FACTORIES: F643, F644, F647, F648
FABRIC BINDINGS: AI ENGINE FABRIC, RAG FABRIC, CORE FABRIC
REUSABLE FROM: SK-17 (code-generator), SK-37 (safe-code), SK-07 (ai-dispatcher)
PATTERN:
  - Multi-model generation: Claude + GPT + Gemini parallel, consensus ≥ 2/3
  - DNA validation as AST pattern matching (9 checks per generated file)
  - Template rendering: Scriban/Liquid templates stored in ES
  - Multi-language output: single spec → Python + Node.js + Go
  - All generated code extends MicroserviceBase with dict[str, Any]
AF-4 RETRIEVAL KEYWORDS: code generation, multi-model, DNA validation, template, multi-language, MicroserviceBase
```

### SK-149: Factory Registration Patterns
```
DOMAIN: Factory registry management, fabric resolution mapping, family assignment
TASK TYPES: T252
FACTORIES: F645
FABRIC BINDINGS: DATABASE FABRIC (ES + PG)
REUSABLE FROM: SK-01 (core-interfaces — factory pattern)
PATTERN:
  - Factory interface validation: typed contract, async methods, DataProcessResult
  - Fabric resolution mapping: every factory → exactly one primary fabric
  - Family assignment: group by domain, auto-suggest via keyword matching
  - Registry indexing in ES for SearchDocuments retrieval
AF-4 RETRIEVAL KEYWORDS: factory, register, interface, fabric, mapping, family, registry
```

### SK-150: Code Injection & Promotion Patterns
```
DOMAIN: Hot injection, feature flags, canary deployment, rollback, promotion ladder
TASK TYPES: T253, T267, T268
FACTORIES: F646, F681, F682, F683, F684, F685, F686, F687
FABRIC BINDINGS: QUEUE FABRIC, DATABASE FABRIC (PG + Redis + ES)
REUSABLE FROM: SK-04 (redis-queue-service), SK-05 (database-fabric)
PATTERN:
  - Hot injection via QUEUE FABRIC event → engine reloads factory registry
  - Feature flag per injection: PG stores flag, Redis caches evaluation
  - Canary: traffic routing via queue consumer group splitting
  - Rollback: revert factory registry + toggle feature flag + drain canary
  - Promotion state machine: GENERATED→TESTED→INJECTED→MINIMAL→CORE
  - Outbox pattern (DNA-8) for injection and promotion events
AF-4 RETRIEVAL KEYWORDS: injection, feature flag, canary, rollback, promotion, ladder, outbox
```

### SK-151: BFA Auto-Registration Patterns
```
DOMAIN: Entity/event/API extraction, conflict detection, BFA index management
TASK TYPES: T254
FACTORIES: F650
FABRIC BINDINGS: DATABASE FABRIC (ES), QUEUE FABRIC
REUSABLE FROM: SK-01 (core-interfaces — BFA integration)
PATTERN:
  - Entity extraction: parse generated code for document types → register in BFA index
  - Event extraction: parse queue publish calls → register event names
  - API extraction: parse DynamicController routes → register endpoints
  - Cross-flow conflict check: search existing CF-1–CF-294 for overlapping entities
  - Duplicate merge: same entity from different flows → merge, don't reject
AF-4 RETRIEVAL KEYWORDS: BFA, entity, event, API, register, conflict, cross-flow, merge
```

### SK-152: Sandbox Environment Patterns
```
DOMAIN: Ephemeral environment creation, isolation, AI test data generation
TASK TYPES: T255
FACTORIES: F652, F653
FABRIC BINDINGS: DATABASE FABRIC (ES), AI ENGINE FABRIC, QUEUE FABRIC
REUSABLE FROM: SK-30 (e2e-testing)
PATTERN:
  - Sandbox as ES index prefix: sandbox_{tenantId}_{sandboxId}_* (complete isolation)
  - Schema cloning: production schema → sandbox (without data)
  - AI data generation: prompt AI with schema → generate realistic Dictionary documents
  - PII masking: AI generates synthetic PII (never copies production data)
  - TTL enforcement: Redis TTL key → expiry event → teardown via QUEUE FABRIC
AF-4 RETRIEVAL KEYWORDS: sandbox, ephemeral, isolation, test data, PII, synthetic, TTL
```

### SK-153: Sandbox Execution Patterns
```
DOMAIN: Step-by-step execution, breakpoints, state capture, assertion evaluation
TASK TYPES: T256
FACTORIES: F654, F655, F656
FABRIC BINDINGS: FLOW ENGINE FABRIC, CORE FABRIC, DATABASE FABRIC (ES)
REUSABLE FROM: SK-09 (flow-orchestrator), SK-30 (e2e-testing)
PATTERN:
  - Step execution via IFlowOrchestrator with breakpoint hooks
  - State capture: snapshot input/output Dictionary before/after each step
  - Assertion evaluation: JsonPath + comparison operators against state snapshots
  - Performance profiling: timestamp per step → ES time-series index
  - Debug panel streams events via QUEUE FABRIC (Redis Streams)
AF-4 RETRIEVAL KEYWORDS: step-through, breakpoint, state capture, assertion, profiling, debug
```

### SK-154: Iron Rule & Quality Gate Validation Patterns
```
DOMAIN: Comprehensive validation, AI judge, multi-model quality assessment
TASK TYPES: T257
FACTORIES: F657, F658, F644
FABRIC BINDINGS: DATABASE FABRIC (ES), AI ENGINE FABRIC, CORE FABRIC
REUSABLE FROM: SK-37 (safe-code), SK-07 (ai-dispatcher)
PATTERN:
  - Iron rule registry in ES: {ruleId, taskType, validation_function, severity}
  - Rule evaluation via ObjectProcessor (AST-level for code, JSON-level for config)
  - Quality gate evaluation: multi-model AI judges (AF-9 pattern)
  - Aggregate scoring: iron rules (binary pass/fail) + quality gates (0-100 score)
  - DNA re-validation post-execution (catch runtime violations)
AF-4 RETRIEVAL KEYWORDS: iron rule, quality gate, validation, judge, DNA, compliance, scoring
```

### SK-155: Test Report & Promotion Decision Patterns
```
DOMAIN: Report generation, AI narrative, promotion readiness scoring
TASK TYPES: T258
FACTORIES: F659, F681
FABRIC BINDINGS: DATABASE FABRIC (ES), AI ENGINE FABRIC
REUSABLE FROM: SK-07 (ai-dispatcher for narrative), SK-89 (report patterns from FLOW-14)
PATTERN:
  - Report compilation: gather iron rule results + quality gate scores + performance + DNA
  - AI narrative: prompt AI with structured results → generate human-readable summary
  - Promotion readiness: ALL iron rules pass + quality gates ≥ threshold + DNA 100%
  - Report stored as immutable ES document (append-only, no update)
  - Auto-promotion trigger: if readiness = PASS, initiate promotion pipeline
AF-4 RETRIEVAL KEYWORDS: test report, narrative, promotion, readiness, scoring, decision
```

### SK-156: UI Fabric Resolution Patterns
```
DOMAIN: Platform-agnostic UI, fabric-first rendering, DynamicController
TASK TYPES: T259, T260
FACTORIES: F660, F661, F662, F663, F664, F665, F666, F667
FABRIC BINDINGS: CORE FABRIC, DATABASE FABRIC (ES), AI ENGINE FABRIC
REUSABLE FROM: SK-26 (web-flow-editor — existing platform implementations)
PATTERN:
  - IUIComponentFabricService resolves platform via config: "ui.platform" → renderer
  - Component registry in ES: {componentId, type, schema, defaultConfig}
  - All UI endpoints via DynamicController — zero entity-specific controllers
  - Theme tokens as Dictionary in ES — platform renderer reads tokens, applies styling
  - Accessibility: keyboard navigation, ARIA attributes, screen reader announcements
  - Service code NEVER imports React/Angular/Svelte — only IUIComponentFabricService
AF-4 RETRIEVAL KEYWORDS: UI fabric, platform, renderer, DynamicController, theme, accessibility, WCAG
```

### SK-157: Debug Panel Patterns
```
DOMAIN: Live debugging, event streaming, breakpoint management, variable inspection
TASK TYPES: T260
FACTORIES: F664, F654, F655
FABRIC BINDINGS: CORE FABRIC via F660, QUEUE FABRIC
REUSABLE FROM: SK-153 (sandbox execution), SK-26 (web-flow-editor)
PATTERN:
  - Event streaming via Redis Streams consumer → WebSocket/SSE to debug panel
  - Breakpoint state in Redis: {sandboxId, stepId, condition, enabled}
  - Variable inspection: JSON tree view of step input/output Dictionary
  - Step-over/step-into via IFlowOrchestrator breakpoint hooks
  - Debug panel renders through IUIComponentFabricService (fabric-first)
AF-4 RETRIEVAL KEYWORDS: debug, breakpoint, streaming, variable, inspect, step-over
```

### SK-158: AI Assistant Flow Building Patterns
```
DOMAIN: NLP flow construction, intent-to-operation mapping, natural language commands
TASK TYPES: T261
FACTORIES: F665, F637
FABRIC BINDINGS: AI ENGINE FABRIC, RAG FABRIC
REUSABLE FROM: SK-06 (ai-providers), SK-07 (ai-dispatcher), SK-146 (intent classification)
PATTERN:
  - NLP parsing via multi-model for accuracy (Claude primary, GPT fallback)
  - Intent-to-operation mapping: "add a database step" → {op:"addNode", type:"DATABASE"}
  - Confirmation before destructive operations (delete, disconnect)
  - Operation execution goes through SAME validation as manual operations
  - Context awareness: AI sees current canvas state, suggests relevant next steps
AF-4 RETRIEVAL KEYWORDS: NLP, natural language, AI assistant, flow building, intent, command
```

### SK-159: Collaboration Patterns
```
DOMAIN: Multi-user sessions, RBAC, comments, presence, audit
TASK TYPES: T262, T264
FACTORIES: F668, F670, F671, F672, F673
FABRIC BINDINGS: DATABASE FABRIC (Redis + PG + ES), QUEUE FABRIC
REUSABLE FROM: SK-04 (redis-queue-service for real-time), SK-05 (database-fabric for persistence)
PATTERN:
  - Session state in Redis: {sessionId, canvasId, users[], lastActivity}
  - Presence broadcast via Redis Streams → all session participants
  - RBAC in PG: {canvasId, userId, role, grantedBy, grantedAt} — immutable audit
  - Permission cache in Redis with synchronous invalidation on change
  - Comments in ES: {commentId, canvasId, nodeId, text, resolved, thread}
  - Audit trail in PG WORM: {action, userId, canvasId, timestamp, delta}
AF-4 RETRIEVAL KEYWORDS: collaboration, session, presence, RBAC, comment, permission, audit
```

### SK-160: CRDT/OT Conflict Resolution Patterns
```
DOMAIN: Concurrent editing, conflict resolution, eventual consistency
TASK TYPES: T263
FACTORIES: F669
FABRIC BINDINGS: CORE FABRIC, DATABASE FABRIC (Redis)
REUSABLE FROM: New pattern — no prior CRDT in XIIGen
PATTERN:
  - CRDT data structure: Yjs or Automerge integration via CORE FABRIC
  - Operation log in Redis: {timestamp, userId, operation, data}
  - Merge strategy: commutative operations (add/remove nodes are CRDT-friendly)
  - Non-commutative operations (move node): last-write-wins with notification
  - Convergence guarantee: mathematical proof via CRDT properties
  - State snapshot periodically persisted to ES for crash recovery
AF-4 RETRIEVAL KEYWORDS: CRDT, OT, conflict, concurrent, merge, convergence, Yjs, Automerge
```

---

## AF-4 RAG RETRIEVAL INDEX — FLOW-18 DOMAIN

| Keywords | Skill | Task Types |
|----------|-------|------------|
| canvas, DAG, initialize, empty, start, undo, redo | SK-145 | T247, T250 |
| intent, classify, schema, infer, dependency, wizard | SK-146 | T248, T261 |
| layout, dagre, elk, preview, critical path, deadlock | SK-147 | T250 |
| code generation, multi-model, DNA, template, MicroserviceBase | SK-148 | T251 |
| factory, register, fabric, mapping, family, registry | SK-149 | T252 |
| injection, feature flag, canary, rollback, promotion, ladder | SK-150 | T253, T267, T268 |
| BFA, entity, event, API, register, conflict, cross-flow | SK-151 | T254 |
| sandbox, ephemeral, isolation, test data, PII, TTL | SK-152 | T255 |
| step-through, breakpoint, assertion, profiling, debug | SK-153 | T256 |
| iron rule, quality gate, judge, DNA, compliance, scoring | SK-154 | T257 |
| test report, narrative, promotion, readiness, decision | SK-155 | T258 |
| UI fabric, platform, renderer, DynamicController, theme, WCAG | SK-156 | T259, T260 |
| debug, breakpoint, streaming, variable, inspect | SK-157 | T260 |
| NLP, natural language, AI assistant, flow building, command | SK-158 | T261 |
| collaboration, session, presence, RBAC, permission, audit | SK-159 | T262, T264 |
| CRDT, OT, conflict, concurrent, merge, convergence | SK-160 | T263 |

### Cross-Reference with Prior Flow Skills (always check before regenerating):
| Prior Skill | Reusable for FLOW-18 |
|-------------|---------------------|
| SK-01 (core-interfaces) | F645 factory registration — reuse patterns, do not regenerate |
| SK-06/SK-07 (ai-providers/dispatcher) | F643, F648, F665 — AI generation patterns — extend |
| SK-08/SK-09 (flow-definition/orchestrator) | F654 sandbox execution — reuse directly |
| SK-17 (code-generator) | F643 — extend for visual-context generation |
| SK-26 (web-flow-editor) | F641, F660 — platform renderer patterns — extend |
| SK-30 (e2e-testing) | F652, F653 — sandbox patterns — extend |
| SK-37 (safe-code) | F644, F657 — security validation — reuse |
| SK-89–SK-98 (FLOW-14 warehouse) | F659 report generation — extend patterns |
| SK-134 (FLOW-17 publish) | F674 marketplace publish — reuse idempotent pattern |

---

## BACKWARD COMPATIBILITY

```
SK-1–SK-144:    UNCHANGED ✅
SK-145–SK-160:  NEW in FLOW-18  (+16 skills)
```

---

## SAVE POINT: FLOW18:P4:SKILLS_FACTORY_RAG ✅
## Next: FLOW18:P5 → UNIFIED_SOURCE_INDEX_MERGED.md

---

## MERGE:P4 STATE SAVE (FLOW-18)
```
MERGE:P4 = COMPLETE
Target: SKILLS_FACTORY_RAG_MERGED.md
Added: SK-145–SK-160 (16 skill patterns — FLOW-18)
Added: AF-4 RAG retrieval index for visual flow creation domain
New patterns: Canvas Init, Node Intelligence, Auto-Layout, Code Gen Pipeline,
  Factory Registration, Code Injection & Promotion, BFA Auto-Registration,
  Sandbox Environment, Sandbox Execution, Iron Rule Validation, Test Report,
  UI Fabric Resolution, Debug Panel, AI Assistant, Collaboration, CRDT
System: SK-1–SK-160
Next: MERGE:P5 → DD-130–DD-148 + DR-99–DR-110
```

## SAVE POINT: FLOW18:P4:SKILLS_FACTORY_RAG ✅


---

# ═══════════════════════════════════════════════════════════════════════════
# FLOW-19 — CI/CD & DevOps Control Plane — Skills SK-161-SK-174
# ═══════════════════════════════════════════════════════════════════════════

## FLOW-19 CHANGELOG
| Date | Flow | Skills | Notes |
|------|------|--------|-------|
| 2026-02-27 | FLOW-19 CI/CD & DevOps Control Plane | SK-161-SK-174 (+14) | Catalog ingestion, env lifecycle, IaC saga, pipeline contracts, DR drills, tenant onboarding |

## System State Update (Post FLOW-19)
Added: SK-161-SK-174 (14 skill patterns — FLOW-19)
System: SK-1-SK-174

---

## AF-4 RAG SEARCH INDEX — FLOW-19 ADDITIONS

These skills are indexed by AF-4 (RAG Task Context) for retrieval when generating
FLOW-19 services. Each skill includes: pattern description, DNA applicability,
primary use factories, and AF-4 query terms.

---

## SK-161: Component Descriptor Ingestion Pattern
```
SKILL: SK-161
PATTERN: Component Descriptor Ingestion — Git Webhook to ES Catalog
APPLIES TO: F697 ICatalogIngestionService, T269 CATALOG_INGESTION archetype
PRIMARY DNA: DNA-1 (Dictionary parse), DNA-2 (build_search_filter), DNA-3, DNA-5

DESCRIPTION:
  Pattern for ingesting YAML component descriptors from Git webhooks into
  Elasticsearch catalog. Core structure:
  1. Receive webhook payload → extract repo, sha, path, content
  2. Dedup check: lookup dedup_key = {repo}@{sha}:{path} in dedup table
  3. Parse YAML content → dict[str, Any] (NEVER typed models — DNA-1)
  4. Schema validation: check required fields (owner, criticality, endpoints, auth)
  5. Secret scan: AI-powered check for secret patterns in content (CF-336)
  6. Upsert to ES catalog index with tenantId scope (DNA-5)
  7. Emit component.profile_validated event via QUEUE FABRIC
  8. Return DataProcessResult[CatalogIngestionResult] (DNA-3)

KEY CODE PATTERN:
   descriptor = ObjectProcessor.parse_document(rawYamlContent);  # DNA-1
   filter = build_search_filter(new { tenant_id, component_id });  # DNA-2
   result = await _database.SearchDocumentsAsync(filter);        # never null check
  return DataProcessResult[T].Success(data) or .Failure(reason);    # DNA-3

AF-4 RETRIEVAL QUERIES: "catalog ingestion", "descriptor yaml parse",
  "component profile ingest", "git webhook catalog"
```

---

## SK-162: Dependency Graph Build Pattern
```
SKILL: SK-162
PATTERN: Neo4j Dependency Graph — Build + Refresh + Circular Detection
APPLIES TO: F699 IDependencyGraphService, T270 MODELING
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Pattern for building and maintaining a directed dependency graph in Neo4j
  using DATABASE FABRIC. Never imports Neo4j driver directly — resolves through
  DatabaseService.CreateAsync(provider=Neo4j).

  Core operations:
  - UpsertEdge: MERGE pattern — idempotent edge creation
  - GetUpstream: MATCH (a)-[*]->(b) with tenantId scope
  - Circular detection: DFS with visited set; emit circular_dependency.detected
  - Critical path: Longest path algorithm for deployment ordering

  FREEDOM config: traversal depth (default 5), circular detection mode (warn|block)

AF-4 RETRIEVAL QUERIES: "dependency graph neo4j", "circular dependency detection",
  "component dependency", "critical path graph"
```

---

## SK-163: Environment Validation Gate Pattern
```
SKILL: SK-163
PATTERN: Idempotent Environment Request Gate with Policy Check
APPLIES TO: F701, F705, F707, T271 ENV_PROVISIONING archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for validating environment requests before provisioning begins.
  Critical invariant: reserve idempotency key BEFORE emitting provision event.

  Sequence:
  1. Validate request payload → Dictionary parse (DNA-1)
  2. Check idempotency: SELECT FROM idempotency_keys WHERE key = {env_type}:{pr_number}
     → If found: return cached response (idempotent replay)
  3. Resolve ConfigBundle via F705 (T274 must have completed)
  4. Evaluate policy via F707 → PolicyDecision must be Allow
  5. INSERT idempotency key record (before any state change — EP-4 pattern)
  6. Transition env state to Validating → emit env.provision_step.queued
  7. Return DataProcessResult[EnvironmentRequestResult]

  IRON RULE: Idempotency key insert is the point-of-no-return before emit.
             If insert fails, return error. If emit fails after insert, replay is safe.

AF-4 RETRIEVAL QUERIES: "environment request gate", "idempotency env provisioning",
  "ephemeral environment validation", "policy before provision"
```

---

## SK-164: IaC Provision Saga Pattern
```
SKILL: SK-164
PATTERN: Durable IaC Provisioning Saga with Compensation
APPLIES TO: F701, F702, F703, F713, T272 DURABLE_SAGA
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for orchestrating IaC provisioning as a durable saga with compensation.
  The "store compensation before apply" rule is non-negotiable (EP-4).

  State machine steps (each persisted as StepRun before execution):
  STEP 1: Plan → validate IaC plan; store compensation (destroy) plan
  STEP 2: Apply → call IIaCRunnerService.ApplyAsync(); never direct SDK import (DR-113)
  STEP 3: Wait → poll for apply completion with timeout + backoff
  STEP 4: Sync → call IGitOpsAdapterService.SyncToRefAsync()
  STEP 5: Health → call IDeploymentHealthService.WaitForHealthyAsync()
  STEP 6: Verify → transition to Ready; emit env.ready event

  On any step failure:
  - Retrieve compensation plan from storage
  - Execute IIaCRunnerService.DestroyAsync() with compensation plan
  - Transition to Deleted terminal state
  - Emit env.provision_failed event

  CONCURRENCY: Check CF-329 concurrency lock before Step 2.

AF-4 RETRIEVAL QUERIES: "IaC saga compensation", "terraform fabric", "provision durable saga",
  "environment lifecycle state machine", "cloud provisioning saga"
```

---

## SK-165: Saga Compensation Design Pattern
```
SKILL: SK-165
PATTERN: Generic Saga Compensation Registration and Execution
APPLIES TO: F701, F722, F730, F733, all DURABLE_SAGA archetypes
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Reusable pattern for registering and executing compensation in any DURABLE_SAGA.
  Used across: Environment provisioning, Restore drills, Tenant onboarding, Offboarding.

  REGISTRATION (before each side-effect step):
  1. Build compensation payload: dict[str, Any] describing undo operation
  2. Store compensation in DATABASE FABRIC BEFORE executing side effect (EP-4)
  3. Include: step_name, compensation_type, compensation_payload, saga_id, tenant_id

  EXECUTION (on saga failure):
  1. Load all stored compensation records in REVERSE order
  2. Execute each compensation operation via original factory (never direct call)
  3. Mark each compensation as executed; update saga state
  4. Emit saga.compensation_completed when all done
  5. Transition saga to terminal Compensated state

  GUARD: Compensation operations must be idempotent (EP-4 pattern — safe re-run).

AF-4 RETRIEVAL QUERIES: "saga compensation", "rollback distributed transaction",
  "undo operation pattern", "durable saga failure handling"
```

---

## SK-166: Pipeline Contract Normalization Pattern
```
SKILL: SK-166
PATTERN: Multi-Provider CI/CD Pipeline Contract Validation
APPLIES TO: F709, F710, F711, T276 PIPELINE_CONTRACT archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-5, DNA-7 (ProviderAgnostic)

DESCRIPTION:
  Pattern for normalizing CI/CD pipeline runs from any provider into a canonical
  contract. Core principle: CI provider is an implementation detail (DNA-7).

  Canonical pipeline phases (order enforced):
  1. build — compile/build artifacts
  2. unit-test — unit tests pass
  3. security-scan — SAST/vulnerability scan
  4. package — container image / package built and pushed
  (Optional:) 5. performance-test, 6. canary, 7. human-approval

  Contract validation algorithm:
  1. Receive pipeline.run_started webhook via F710 (provider-normalized)
  2. Parse phases from pipeline run → Dictionary[] of {phase_name, status, artifacts}
  3. Check mandatory phases present: ["build", "unit-test", "security-scan", "package"]
  4. For each present phase: validate output artifacts if required
  5. Register artifacts via F711 (package phase → container image registration)
  6. Emit gate_result back to PR via F710.ReportGateResultAsync()

  FREEDOM config: optional phases, approval gate triggers per env tier

AF-4 RETRIEVAL QUERIES: "pipeline contract", "CI normalization", "multi-provider CI",
  "build unit-test security package", "pipeline phase validation"
```

---

## SK-167: Deployment Orchestration Pattern
```
SKILL: SK-167
PATTERN: GitOps Sync → Health Check → Test Suite → Readiness Gate
APPLIES TO: F713, F714, F715, F717, F718, F719, T277 ORCHESTRATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Pattern for orchestrating the complete deploy-and-verify lifecycle within a
  provisioned environment. Critical ordering: sync → healthy → test → report.

  Step sequence:
  1. F713.SyncToRefAsync(commit_sha) → wait for sync_status = Synced
  2. F714.DetectDriftAsync() → assert no unexpected drift
  3. F715.WaitForHealthyAsync(timeout=5min) → all workloads Ready/Running
  4. F717.EnqueueSuitesAsync([config, smoke, integration]) → parallel execution
  5. F718.RunSmokeAsync() → golden path verification
  6. F720.RunDBSuiteAsync(), RunQueueSuiteAsync(), RunAISuiteAsync(), RunRAGSuiteAsync()
  7. F719.GenerateReportAsync(env_id, flow_instance_id) → ReadinessReport artifact
  8. Gate: F719.IsGatePassingAsync() → only then emit env.readiness_confirmed

  IRON RULE: Steps 1-3 must complete before steps 4-6 begin.
             ReadinessReport (Step 7) is the ONLY gate for promotion.

AF-4 RETRIEVAL QUERIES: "deployment orchestration", "gitops sync health", "smoke test suite",
  "readiness report gate", "test orchestration after deploy"
```

---

## SK-168: Readiness Report Pattern
```
SKILL: SK-168
PATTERN: Immutable ReadinessReport Artifact Generation
APPLIES TO: F719 IReadinessReportService, T280 VALIDATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  ReadinessReport is an immutable artifact generated at the end of every
  test orchestration phase. It serves as the ONLY gate for promotion decisions.

  Report structure (dict[str, Any] — DNA-1):
  {
    report_id: UUID,
    env_id: ...,
    flow_instance_id: ...,
    tenant_id: ...,         ← DNA-5
    overall_pass: true/false,
    generated_at: ISO8601,
    suites: [
      { suite_id, suite_type, pass, assertions_count, failed_assertions, duration_ms }
    ],
    policy_decisions: [ { policy_id, allow, obligations[] } ],
    artifact_links: [ { artifact_id, kind, sha256, uri } ],
    config_version: ...,
    drift_status: clean|acknowledged|unacknowledged
  }

  Immutability: Once GenerateReportAsync completes, report stored in ES.
                No update operations permitted. New report requires new FlowInstance.

AF-4 RETRIEVAL QUERIES: "readiness report", "promotion gate evidence",
  "deployment verification artifact", "test suite aggregate"
```

---

## SK-169: Restore Drill Orchestration Pattern
```
SKILL: SK-169
PATTERN: Non-Negotiable DR Drill Saga with Isolated Sandbox
APPLIES TO: F721, F722, F723, F724, F718, T283 RESTORE_DRILL archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for the complete restore drill lifecycle. Two invariants:
  1. Sandbox is ALWAYS isolated from production (zero-egress NetworkPolicy — CF-343)
  2. Evidence is ALWAYS stored immutably before sandbox destruction (CF-349)

  Drill lifecycle:
  1. F721.RunBackupAsync() → verify integrity (T282 must complete first — CF-348)
  2. F724.ProvisionSandboxAsync(zero_egress=true) → namespace with NetworkPolicy
  3. F724.SeedFromBackupAsync(backup_artifact_pointer) → NEVER from production
  4. F721.RestoreAsync(sandbox_env_id, backup_id) → measure restore_start_time
  5. F718.RunSmokeAsync(env=sandbox) → golden path in isolated sandbox
  6. Capture RTO: restore_end_time - restore_start_time → DrillResult
  7. F723.StoreEvidenceAsync(DrillResult) → ES WORM append-only (CF-349)
  8. Emit restore_drill.completed event
  9. F724.DestroySandboxAsync() → MUST complete (CF-335 equivalent for sandbox)
  10. Update promotion eligibility for target component

  TIMING: Start → SandboxReady → RestoreComplete → SmokePass = measured as RTO

AF-4 RETRIEVAL QUERIES: "restore drill", "DR evidence", "sandbox restore verification",
  "backup restore smoke", "disaster recovery drill"
```

---

## SK-170: Sandbox Isolation Pattern
```
SKILL: SK-170
PATTERN: Zero-Egress Isolated Sandbox Environment for DR Drills
APPLIES TO: F724 IRestoreSandboxService, T283 RESTORE_DRILL
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Sandboxes for DR drills have STRICTER isolation than regular ephemeral envs.
  No external network egress permitted. Data source is backup artifacts ONLY.

  K8s manifest additions for sandbox namespace (generated by F716 ManifestRenderer):
  - NetworkPolicy: deny all egress except internal cluster DNS
  - ResourceQuota: stricter limits (drill is read-heavy, not write-heavy)
  - Namespace name: {tenant_id}-sandbox-drill-{drill_id} (CF-345 scoped)
  - Label: sandbox_type=dr-drill

  Seed validation:
  1. Seed source MUST be backup artifact pointer (sha256 verified — CF-340)
  2. NEVER accept direct database connection as seed source
  3. Seed is one-time operation; no live data after initial restore

AF-4 RETRIEVAL QUERIES: "sandbox isolation dr", "zero egress namespace",
  "restore sandbox", "drill environment isolation"
```

---

## SK-171: Config Layer Resolution Pattern
```
SKILL: SK-171
PATTERN: Multi-Layer Config Merge with Secret Reference Validation
APPLIES TO: F705, F706, F708, T274 VALIDATION
PRIMARY DNA: DNA-1, DNA-2, DNA-3, DNA-5

DESCRIPTION:
  Config resolution produces a ConfigBundle — never stores secret values (DR-116).
  Layer priority (highest wins): env-override > tenant-override > tier-default > global-default

  Resolution algorithm:
  1. Load all 4 layers from DATABASE FABRIC (PG)
  2. Merge: start with global, apply tier, apply tenant, apply env override
  3. Result: ConfigBundle = dict[str, Any] of {key: value|secretRef}
  4. Identify all secretRef entries: values starting with "kv/" or "arn:aws:secretsmanager"
  5. F706.ValidateRefsExistAsync(secretRefs) → existence check only, NEVER retrieve value
  6. If any ref missing → return DataProcessResult.Failure with missing ref list
  7. F708.SnapshotAsync(ConfigBundle, flow_instance_id) → immutable version snapshot
  8. Cache resolved bundle in Redis: key = {tenant_id}:{env_id}:config with TTL

  Cache invalidation: Any layer change triggers targeted invalidation (CF-344 — tenant-scoped).

AF-4 RETRIEVAL QUERIES: "config layer merge", "secret reference validation",
  "config bundle resolve", "environment config tenant config"
```

---

## SK-172: Policy-as-Code Evaluation Pattern
```
SKILL: SK-172
PATTERN: ABAC Policy Evaluation for Routing and Data Classification
APPLIES TO: F707 IPolicyEngineService, T275 VALIDATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Policies stored as documents in Elasticsearch (OPA-compatible rule format).
  Resolved via DATABASE FABRIC. AI ENGINE FABRIC used for complex ABAC reasoning.

  Evaluation sequence:
  1. Load applicable policies: filter by policy_set, tenant_id, component_id
  2. Build evaluation context: Dictionary{subject, resource, action, environment, data_classification}
  3. Evaluate routing rules: sensitive data → local_only = true
  4. Evaluate region rules: check allowed_regions list
  5. Evaluate logging rules: PII redaction requirements
  6. Collect all applicable obligations
  7. Return PolicyDecision{allow|deny, obligations[], reasoning, evaluated_at}

  CRITICAL: If data_classification=sensitive AND target=external_ai_provider → DENY (CF-343)
  FREEDOM config: policy sets per tenant tier, strictness level

AF-4 RETRIEVAL QUERIES: "policy evaluation ABAC", "data classification routing",
  "sensitive data policy", "policy engine fabric", "routing policy decision"
```

---

## SK-173: Tenant Onboarding Idempotent Saga Pattern
```
SKILL: SK-173
PATTERN: Idempotent Multi-Step Tenant Onboarding with Compensation
APPLIES TO: F728-F733, T285 DURABLE_SAGA
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Tenant onboarding is a distributed transaction that MUST be idempotent at
  every step. Uses Idempotency-Key header for the entire saga and per-step.

  Onboarding saga steps (each stored in PG as SagaStep before execution):
  1. CreateTenant → INSERT tenants with UUID; idempotent via ON CONFLICT DO NOTHING
  2. ConfigureIdentity → create tenant claim + SSO config; idempotent via upsert
  3. AllocateBinding → create storage binding per isolation tier; idempotent
  4. SeedConfig → insert tier defaults + initial overrides; idempotent via version check
  5. SetQuotas → configure rate limits and resource quotas; idempotent via upsert
  6. RunSmokeTest → F718 smoke against new tenant sandbox (isolated) → must pass
  7. ActivateTenant → UPDATE tenants SET status='active'; emit tenant.activated event

  Compensation (reverse order on failure):
  - DeleteTenant → remove tenant record if not yet activated
  - RemoveBinding → delete storage binding
  - RevokeIdentity → remove SSO config
  (Never delete audit events — DR-120)

AF-4 RETRIEVAL QUERIES: "tenant onboarding saga", "multi-tenant provision idempotent",
  "tenant creation compensation", "SaaS tenant onboarding"
```

---

## SK-174: Control Plane Audit Pattern
```
SKILL: SK-174
PATTERN: Append-Only Immutable Audit Trail for Control Plane Events
APPLIES TO: F726 IControlPlaneAuditService, all FLOW-19 saga archetypes
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Every privileged control plane action produces an audit event.
  Events are append-only (DR-119, DR-120). No update or delete.

  Audit event structure (dict[str, Any] — DNA-1):
  {
    event_id: UUID,
    tenant_id: ...,           ← DNA-5
    actor: {id, type, ip},
    action: {type, target_type, target_id},
    outcome: {success|failure|denied},
    reason: ...,
    timestamp: ISO8601,
    flow_instance_id: ...,    ← links to workflow context
    source_plane: devops|warehouse|...
  }

  Storage: PG WORM (trigger prevents UPDATE/DELETE) + ES (searchable index).
  Retention: Follow DR-120 — audit logs survive tenant offboarding.

  Categories of mandatory audit events in FLOW-19:
  - env.created, env.destroyed, env.ttl_expired
  - config.resolved, config.snapshotted
  - policy.denied, policy.allowed
  - backup.completed, drill.completed, drill.failed
  - tenant.onboarding.started/completed/failed
  - tenant.offboarding.started/completed
  - promotion.approved, promotion.rejected, promotion.rollback
  - secret_ref.validated, secret_ref.missing

AF-4 RETRIEVAL QUERIES: "audit trail append only", "control plane audit",
  "immutable audit log", "WORM audit", "compliance event log"
```

---

## SAVE POINT: FLOW19:P4a:SKILLS ✅

---

## BACKWARD COMPATIBILITY — Post FLOW-19

```
SK-1-SK-160: UNCHANGED ✅  (this file adds SK-161-SK-174 only)
FLOW-01 through FLOW-18: ALL INTACT ✅
```

## SAVE POINT: FLOW19:P4:SKILLS ✅



================================================================================
# FLOW-20 SKILLS — Sponsored Content + Graph API
# SK-175-SK-188 (14 skill patterns)
# Merged: 2026-02-27
================================================================================

## SK-175 — Graph Auth Per-Node/Field Pattern

```
SKILL:    SK-175
NAME:     Graph Auth Per-Node/Field Pattern
DOMAIN:   Graph API / Permission Engine
USED BY:  T287, T288, T299 (AF-4 RAG retrieval)
PATTERN:  IPermissionDecisionService called per node + per edge + per field.
          Returns dict[str, Any] projection mask (authorized fields only).
          Partial-error result assembled by IPartialErrorBuilderService.
          Never single per-request authorization decision.
```

**Primary (Python 3.12 + FastAPI / Python 3.12)**
```python
# SK-175: Per-node/field permission pattern
async def FilterAuthorizedFieldsAsync(self, 
    str nodeId, str nodeType,
    list[str] requestedFields,
    dict[str, Any] rawNodeData,
    ScopeContext scope)
{
     permissionService = await _permissionFactory.CreateAsync(
        new FactoryResolutionContext { TenantId = scope.TenantId, ServiceType = "permission" })
     errors = new List<dict[str, Any]>()
     authorizedData = new dict[str, Any]()
    foreach ( field in requestedFields)
    {
         decision = await permissionService.DecideAsync(
            nodeId, nodeType, field, scope);  # per-field decision

        if (decision.IsAuthorized)
            authorizedData[field] = rawNodeData.GetValueOrDefault(field)
        else if (decision.IsPartial)
            errors.Add(ObjectProcessor.BuildError("FIELD_PERMISSION_DENIED", field, nodeId))
        # unauthorized fields: silently excluded, never throw
    }

    return DataProcessResult[dict[str, Any]].Success(authorizedData, errors)
}
```

**Node.js (TypeScript)**
```typescript
# SK-175 Node.js: Per-field permission filter
async function filterAuthorizedFields(
  nodeId: str, nodeType: str,
  requestedFields: string[],
  rawData: Record<str, unknown>,
  scope: ScopeContext
): Promise<DataProcessResult<Record<str, unknown>>> {
  const permSvc = await permissionFactory.createAsync({ tenantId: scope.tenantId })
  const errors: ErrorEntry[] = []
  const authorized: Record<str, unknown> = {}
  for (const field of requestedFields) {
    const decision = await permSvc.decide(nodeId, nodeType, field, scope)
    if (decision.isAuthorized) authorized[field] = rawData[field]
    else if (decision.isPartial) errors.push(buildError('FIELD_PERMISSION_DENIED', field))
  }
  return DataProcessResult.success(authorized, errors)
}
```

**AI Agent Prompt**
```
You are implementing per-node/field graph permission filtering (SK-175).
Rules:
1. Call IPermissionDecisionService ONCE PER FIELD — never once per request.
2. Authorized fields → include in result Dictionary.
3. Unauthorized fields → silently excluded (no 403 for individual fields).
4. Partial-auth → build error entry via IPartialErrorBuilderService.
5. Return DataProcessResult[Dictionary] with data + errors array.
6. Never throw for permission denial — always DataProcessResult.
Reference: IR-287-2, DD-165, DR-124.
```

---

## SK-176 — Partial-Error Graph Response Pattern

```
SKILL:    SK-176
NAME:     Partial-Error Graph Response Pattern
DOMAIN:   Graph API / Response Assembly
USED BY:  T287, T299 (AF-4 RAG retrieval)
PATTERN:  HTTP 200 with { "data": {...}, "errors": [...] } for partial authorization.
          Never HTTP 403 for a node/field that is partially authorized.
          errors array: [{ "message": "...", "path": ["nodeId", "fieldName"], "code": "..." }]
          IPartialErrorBuilderService assembles errors (SK-175 feeds it).
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-176: Partial-error graph response builder
public DataProcessResult[GraphResponse] BuildPartialResponse(
    dict[str, Any] authorizedData,
    list[dict[str, Any]] permissionErrors,
    str requestId)
{
     response = new dict[str, Any]
    {
        ["data"] = authorizedData,
        ["errors"] = permissionErrors,       # always present, may be empty array
        ["request_id"] = requestId
    }
    # HTTP 200 even with errors — partial auth is a successful partial response
    return DataProcessResult[GraphResponse].Success(
        ObjectProcessor.parse_document<GraphResponse>(response))
}
```

**AI Agent Prompt**
```
You are building a partial-error graph response (SK-176).
Rules:
1. ALWAYS return HTTP 200 for partial authorization — never 403.
2. Response shape: { "data": {...authorized fields...}, "errors": [...error entries...] }
3. errors array: even if empty, always present in response.
4. Each error entry: { "message": str, "path": [nodeId, fieldName], "code": str }
5. Use IPartialErrorBuilderService — never hand-craft error arrays.
6. DataProcessResult.Success even when errors is non-empty.
Reference: IR-287-3, DD-165, DR-124, QG-287-2.
```

---

## SK-177 — Webhook HMAC Delivery Pattern

```
SKILL:    SK-177
NAME:     Webhook HMAC Delivery Pattern
DOMAIN:   Webhooks / Outbound Delivery
USED BY:  T288, T289 (AF-4 RAG retrieval)
PATTERN:  HMAC-SHA256 computed over canonical payload before every HTTP dispatch.
          Signature in header: X-Webhook-Signature: sha256={hex_digest}
          Key namespace: "webhook:{appId}:{subscriptionId}"
          No delivery path exists without signing. No exceptions.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-177: Webhook HMAC signing
async def DeliverWithHmacAsync(self, 
    WebhookPayload payload, str appId, str subscriptionId,
    str endpointUrl, ScopeContext scope)
{
     keyName = $"webhook:{appId}:{subscriptionId}"
     secret = await _keyVault.GetSecretAsync(keyName, scope)
    if (!secret.IsSuccess) return DataProcessResult[DeliveryOutcome].Error("HMAC_KEY_NOT_FOUND")
     canonicalBody = JsonSerializer.Serialize(payload,
        new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
     signature = ComputeHmacSha256(secret.Value, canonicalBody)
     headers = new dict[str, str]
    {
        ["X-Webhook-Signature"] = $"sha256={signature}",
        ["X-Delivery-Id"] = payload.DeliveryId,
        ["Content-Type"] = "application/json"
    }
    # deliver with signed headers — no unsigned path exists
    return await _httpClient.PostAsync(endpointUrl, canonicalBody, headers, scope)
}

private static str ComputeHmacSha256(str secret, str body)
{
    using  hmac = HMACSHA256(Encoding.UTF8.GetBytes(secret))
     hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body))
    return Convert.ToHexString(hash).ToLowerInvariant()
}
```

**Python**
```python
# SK-177 Python: HMAC webhook delivery
import hmac, hashlib, json

async def deliver_with_hmac(payload: dict, app_id: str, sub_id: str,
                             endpoint_url: str, scope: ScopeContext):
    key_name = f"webhook:{app_id}:{sub_id}"
    secret = await key_vault.get_secret(key_name, scope)
    if not secret.is_success:
        return DataProcessResult.error("HMAC_KEY_NOT_FOUND")

    body = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    sig = hmac.new(secret.value.encode(), body.encode(), hashlib.sha256).hexdigest()
    headers = {
        "X-Webhook-Signature": f"sha256={sig}",
        "X-Delivery-Id": payload["delivery_id"],
        "Content-Type": "application/json"
    }
    return await http_client.post(endpoint_url, body, headers, scope)
```

**AI Agent Prompt**
```
You are implementing HMAC-signed webhook delivery (SK-177).
Rules:
1. HMAC-SHA256 computed over canonical JSON body BEFORE every HTTP dispatch.
2. Signature header: X-Webhook-Signature: sha256={hex_digest}
3. Key namespace: "webhook:{appId}:{subscriptionId}" — never bare key.
4. No code path delivers without signing. No "if hmac_enabled" condition.
5. X-Delivery-Id header: unique delivery attempt ID (F765 dedup key).
6. Return DataProcessResult[DeliveryOutcome] — never throw on delivery failure.
Reference: IR-289-1, DD-170, DR-125, CF-358.
```

---

## SK-178 — Stateless Auction Redis-Only Pattern

```
SKILL:    SK-178
NAME:     Stateless Auction Redis-Only Pattern
DOMAIN:   Ads Delivery / Auction
USED BY:  T292 (AF-4 RAG retrieval)
PATTERN:  IAuctionEngineService is a pure stateless function. All mutable state
          (frequency caps, pacing, budget) accessed ONLY through Redis in critical path.
          No PG/ES write inside RunAuctionAsync. Budget decrement async via QUEUE.
          Target: p99 < 50ms.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-178: Stateless auction — Redis-only critical path
async def RunAuctionAsync(self, 
    AuctionContext ctx, ScopeContext scope)
{
    # All reads: Redis only (frequency caps, pacing, budget estimates)
     freqCap = await _freqCapService.GetRemainingAsync(ctx.CampaignId, ctx.UserId, scope)
     pacingSignal = await _pacingService.GetPacingMultiplierAsync(ctx.CampaignId, scope)
    # Score eligible candidates (pre-loaded from eligibility cache)
     scoredCandidates = ctx.EligibleAds
        .Where(ad => freqCap.IsWithinCap(ad.CampaignId))
        .Select(ad => new
        {
            Ad = ad,
            Score = ad.BidPrice * ad.QualityScore * pacingSignal.Multiplier
        })
        .OrderByDescending(x => x.Score)
        .ToList()
    if (!scoredCandidates.Any())
        return DataProcessResult[AuctionResult].Success(AuctionResult.NoFill())
     winner = scoredCandidates.First()
    # Async post-auction: never block auction on these
    _ = _queueService.EnqueueAsync("ads.impression.v1",
        ObjectProcessor.BuildEvent("impression_logged", winner.Ad.AdId, ctx), scope)
    _ = _queueService.EnqueueAsync("ads.budget.decrement.v1",
        ObjectProcessor.BuildEvent("budget_decrement", winner.Ad.CampaignId, ctx), scope)
    return DataProcessResult[AuctionResult].Success(
        AuctionResult.Winner(winner.Ad, winner.Score))
}
# NO PG/ES writes inside this method. NO synchronous budget decrement.
```

**AI Agent Prompt**
```
You are implementing a stateless ad auction service (SK-178).
Rules:
1. RunAuctionAsync reads from Redis ONLY. Zero PG/ES/HTTP calls in critical path.
2. Budget decrement: QUEUE FABRIC async fire-and-forget AFTER returning result.
3. Impression log: QUEUE FABRIC async — never synchronous.
4. No-fill is DataProcessResult.Success with AuctionResult.NoFill() — never error.
5. Frequency cap + pacing from Redis counters (atomic INCR/GET).
6. Approved creatives only: eligibility filter must precede auction entry.
Target: p99 < 50ms. Any non-Redis call in critical path = BUILD FAILURE.
Reference: IR-292-1, DD-166, DR-127, DR-130, CF-364.
```

---

## SK-179 — PCI Tokenization Boundary Pattern

```
SKILL:    SK-179
NAME:     PCI Tokenization Boundary Pattern
DOMAIN:   Payments / Compliance
USED BY:  T290 (AF-4 RAG retrieval)
PATTERN:  IPaymentMethodService is the ONLY service that receives raw payment data.
          Tokenize first; return token reference only. Raw PAN never stored, logged,
          or queued. Token format: "vault:{provider}:{last4}:{token_id}"
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-179: PCI tokenization — raw data never persists
async def TokenizeAndBindAsync(self, 
    # Raw payment data — handled ONLY in this method; never logged, stored, or forwarded
    str rawCardNumber, str expiryMonth, str expiryYear, str cvv,
    str billingAccountId, ScopeContext scope)
{
    # Step 1: Tokenize via external vault (raw data never leaves this method)
     tokenResult = await _vault.TokenizeAsync(rawCardNumber, expiryMonth, expiryYear, cvv)
    if (!tokenResult.IsSuccess)
    {
        # Log failure WITHOUT any card data
        await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
            "PAYMENT_TOKENIZATION_FAILED", billingAccountId, null), scope)
        return DataProcessResult[str].Error("TOKENIZATION_FAILED")
    }

    # Step 2: Store only the token reference (PCI out-of-scope data)
     tokenRef = $"vault:{tokenResult.Provider}:{tokenResult.Last4}:{tokenResult.TokenId}"
    await _billingAccountService.BindPaymentTokenAsync(billingAccountId, tokenRef, scope)
    await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
        "PAYMENT_METHOD_REGISTERED", billingAccountId, tokenRef), scope)
    return DataProcessResult[str].Success(tokenRef)
    # rawCardNumber, expiryYear, expiryMonth, cvv are now out of scope — GC'd
}
```

**AI Agent Prompt**
```
You are implementing PCI-compliant payment tokenization (SK-179).
Rules:
1. Raw card data (card_number, CVV, PAN) accepted in ONE method only.
2. Tokenize FIRST via vault. Store ONLY the token reference returned.
3. Raw card data: NEVER in any log entry, queue event, database field, or variable name.
4. Token format: "vault:{provider}:{last4}:{token_id}" — opaque reference only.
5. On tokenization failure: log failure with billingAccountId only (no card data in log).
6. Audit log: every attempt (success/fail) — WITHOUT card data.
PCI scan: any field named card_number/pan/cvv/full_card in ANY service = BUILD FAILURE.
Reference: IR-290-1, DD-171, DR-126, CF-361.
```

---

## SK-180 — Consent-Before-Evaluation Blocking Gate Pattern

```
SKILL:    SK-180
NAME:     Consent-Before-Evaluation Blocking Gate Pattern
DOMAIN:   Privacy / Targeting
USED BY:  T301, T292 (AF-4 RAG retrieval)
PATTERN:  IConsentLookupService called as FIRST step before targeting evaluation.
          No consent → skip targeting entirely (not post-filter).
          Returns ConsentContext dictionary consumed by downstream targeting steps.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-180: Consent blocking gate — must be first step before targeting
async def VerifyConsentAsync(self, 
    str userId, str tenantId, ScopeContext scope)
{
    # Fast path: Redis cache (warmed from FLOW-08 F258 authoritative store)
     cached = await _consentCache.GetAsync($"consent:{tenantId}:{userId}", scope)
     consentState = cached.IsSuccess
        ? ObjectProcessor.parse_document(cached.Value)
        : await _consentStore.GetAuthoritativeAsync(userId, tenantId, scope)  # PG fallback
            .ContinueWith(t => t.Result.IsSuccess
                ? ObjectProcessor.parse_document(t.Result.Value)
                : new dict[str, Any] { ["targeting_allowed"] = false })
    await _auditLog.AppendAsync(ObjectProcessor.BuildAuditEntry(
        "CONSENT_CHECKED", userId, consentState), scope)
     targetingAllowed = consentState.GetValueOrDefault("targeting_allowed") as bool? ?? false
    if (!targetingAllowed)
        return DataProcessResult[dict[str, Any]].Success(
            new dict[str, Any] { ["targeting_allowed"] = false, ["skip_targeting"] = true })
    return DataProcessResult[dict[str, Any]].Success(consentState)
}
# CALLER MUST CHECK skip_targeting = true BEFORE evaluating ANY targeting criteria
```

**AI Agent Prompt**
```
You are implementing a consent-before-targeting blocking gate (SK-180).
Rules:
1. ConsentLookup is STEP 1 in auction pipeline — before ANY targeting call.
2. Redis fast path first; PG fallback on cache miss (never skip PG if cache empty).
3. No consent → return { targeting_allowed: false, skip_targeting: true }.
4. Caller checks skip_targeting BEFORE calling targeting evaluation service.
5. Post-filter approach (run targeting then filter) = BUILD FAILURE.
6. Consent withdrawal event must invalidate Redis cache within 30s (IR-301-4).
7. Audit log every consent check (even cached hits).
Reference: IR-301-1, DD-167, DR-128, CF-366.
```

---

## SK-181 — Append-Only Financial Ledger Pattern

```
SKILL:    SK-181
NAME:     Append-Only Financial Ledger Pattern
DOMAIN:   Finance / Billing
USED BY:  T293, T294, T296, T303, T305 (AF-4 RAG retrieval)
PATTERN:  SpendLedger is INSERT-only. No UPDATE, no DELETE on billed records.
          Corrections use offset entries referencing original entry ID.
          Idempotency key prevents duplicate billing on queue redelivery.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-181: Append-only spend ledger
async def AppendLedgerEntryAsync(self, 
    str eventId, str campaignId, str adId,
    float amount, str currency, str entryType,
    ScopeContext scope)
{
    # Idempotency: check if this eventId already billed
     existing = await _ledgerStore.GetByEventIdAsync(eventId, scope)
    if (existing.IsSuccess)
        return DataProcessResult[str].Success(existing.Value.EntryId); # idempotent return

     entry = new dict[str, Any]
    {
        ["entry_id"] = str.NewGuid().ToString(),
        ["event_id"] = eventId,              # original event reference
        ["campaign_id"] = campaignId,
        ["ad_id"] = adId,
        ["amount"] = amount,
        ["currency"] = currency,
        ["entry_type"] = entryType,          # CHARGE | OFFSET_CORRECTION | FRAUD_REVERSAL
        ["created_at"] = DateTimeOffset.UtcNow,
        ["tenant_id"] = scope.TenantId
    }
    # INSERT ONLY — no update method exposed on ISpendLedgerService
    return await _ledgerStore.InsertAsync(entry, scope)
}

# Offset correction — references original entry
async def AppendOffsetCorrectionAsync(self, 
    str originalEntryId, float correctionAmount, str reason, ScopeContext scope)
{
    return await AppendLedgerEntryAsync(
        eventId: $"correction:{originalEntryId}",
        # originalEntryId included in entry for audit chain
        entryType: "OFFSET_CORRECTION", ...)
}
```

**AI Agent Prompt**
```
You are implementing an append-only financial spend ledger (SK-181).
Rules:
1. ISpendLedgerService exposes AppendLedgerEntryAsync ONLY. No UpdateAsync, no DeleteAsync.
2. Idempotency: check event_id before insert. Duplicate event = return existing entry_id.
3. Corrections: AppendOffsetCorrectionAsync with reference to original_entry_id.
4. Entry types: CHARGE | OFFSET_CORRECTION | FRAUD_REVERSAL — all are appends.
5. No modification to any existing ledger record under any circumstance.
6. Tenant isolation: tenant_id on every entry; build_search_filter skips empty fields.
PG schema: spend_ledger table has no update trigger; insert-only constraint enforced.
Reference: IR-293-3, DD-169, DR-131, CF-370.
```

---

## SK-182 — Edge-Only Tenant Resolution Pattern

```
SKILL:    SK-182
NAME:     Edge-Only Tenant Resolution Pattern
DOMAIN:   Multi-Tenant Security
USED BY:  All FLOW-20 task types (AF-4 RAG retrieval)
PATTERN:  TenantId resolved ONCE at API edge from validated token claims.
          All downstream services read tenantId from ScopeContext only.
          User-supplied tenantId header NEVER accepted. No re-resolution internally.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-182: Edge-only tenant resolution
# API EDGE ONLY — called once per request in middleware
async def ResolveTenantScopeAsync(self, 
    HttpContext httpContext)
{
    # Token claims are validated by auth middleware (signature, expiry)
     tenantIdClaim = httpContext.User.FindFirst("tenant_id")?.Value
    if (str.IsNullOrEmpty(tenantIdClaim))
        return DataProcessResult[ScopeContext].Error("TENANT_CLAIM_MISSING")
    # Validate against authoritative FLOW-08 tenant registry
     tenant = await _tenantRegistry.GetByIdAsync(tenantIdClaim)
    if (!tenant.IsSuccess || tenant.Value.Status == "SUSPENDED")
        return DataProcessResult[ScopeContext].Error("TENANT_INVALID_OR_SUSPENDED")
    # Build trusted scope context — propagated to ALL downstream services
     scope = new ScopeContext
    {
        TenantId = tenantIdClaim,       # from validated token only
        AppId = httpContext.User.FindFirst("app_id")?.Value,
        Scopes = httpContext.User.FindAll("scope").Select(c => c.Value).ToList(),
        RequestId = httpContext.TraceIdentifier
    }
    httpContext.Items["ScopeContext"] = scope
    return DataProcessResult[ScopeContext].Success(scope)
}

# ALL downstream services:
async def AnyServiceMethodAsync(self, ScopeContext scope, ...)
{
    # scope.TenantId is ALWAYS from edge resolution — never re-read from request headers
     filter = ObjectProcessor.build_search_filter(new dict[str, Any]
    {
        ["tenant_id"] = scope.TenantId  # always present; never from user input
    })
    ...
}
```

**AI Agent Prompt**
```
You are implementing edge-only tenant resolution (SK-182).
Rules:
1. TenantId resolved ONCE in API middleware from validated JWT claim "tenant_id".
2. All downstream service methods accept ScopeContext — read scope.TenantId only.
3. NEVER read X-Tenant-Id header, body field tenantId, or query param tenant_id.
4. Validate tenantId claim against FLOW-08 tenant registry (F244) on resolution.
5. Suspended/deleted tenant → reject at edge (HTTP 403), not propagate.
6. Every database query: build_search_filter with tenant_id = scope.TenantId.
User-supplied tenant = cross-tenant attack vector. Zero tolerance.
Reference: IR-298-8, DD-172, DR-133, CF-374.
```

---

## SK-183 — Fraud Gate Blocking Before Billing Pattern

```
SKILL:    SK-183
NAME:     Fraud Gate Blocking Before Billing Pattern
DOMAIN:   Fraud / Revenue Integrity
USED BY:  T293, T294, T305 (AF-4 RAG retrieval)
PATTERN:  Fraud scoring (IVT + click fraud + bot detection) as BLOCKING step.
          Fraudulent events → quarantine BEFORE billing event emitted.
          Billing pipeline only receives fraud-screened events.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-183: Fraud gate — blocking before billing
async def EvaluateAsync(self, 
    dict[str, Any] eventData, ScopeContext scope)
{
    # Parallel fraud signals — all evaluated, not short-circuit
     (ivtResult, clickFraudResult, botResult) = await (
        _ivtService.ScoreAsync(eventData, scope),
        _clickFraudService.ScoreAsync(eventData, scope),
        _botDetectionService.ScoreAsync(eventData, scope)
    ).WhenAll()
     maxFraudScore = new[] {
        ivtResult.Score, clickFraudResult.Score, botResult.Score
    }.Max()
     fraudThreshold = await _config.GetFraudThresholdAsync(scope)
    if (maxFraudScore >= fraudThreshold)
    {
        # QUARANTINE synchronously — billing event NOT emitted
        await _quarantineService.QuarantineAsync(eventData,
            new dict[str, Any]
            {
                ["ivt_score"] = ivtResult.Score,
                ["click_fraud_score"] = clickFraudResult.Score,
                ["bot_score"] = botResult.Score,
                ["threshold"] = fraudThreshold
            }, scope)
        return DataProcessResult[FraudGateResult].Success(FraudGateResult.Quarantined())
    }

    # ONLY clean events proceed to billing
    return DataProcessResult[FraudGateResult].Success(FraudGateResult.Clean(maxFraudScore))
}
```

**AI Agent Prompt**
```
You are implementing a fraud gate that blocks before billing (SK-183).
Rules:
1. Fraud scoring runs BEFORE billing event emission — blocking, not async filter.
2. All fraud signals evaluated in parallel (IVT + click fraud + bot detection).
3. Any signal above threshold → quarantine synchronously, return Quarantined result.
4. Billing event emitted ONLY if FraudGateResult.IsClean = true.
5. Quarantine record MUST include fraud evidence (all signal scores + threshold).
6. Empty evidence on quarantine record = BUILD FAILURE (IR-305-7).
7. Advertiser credit: offset entry emitted after quarantine (F831).
Async quarantine = billing-then-quarantine = BUILD FAILURE.
Reference: IR-293-1, IR-293-2, DD-177, CF-369.
```

---

## SK-184 — Attribution Window FREEDOM Config Pattern

```
SKILL:    SK-184
NAME:     Attribution Window FREEDOM Config Pattern
DOMAIN:   Measurement / Attribution
USED BY:  T293, T294, T304 (AF-4 RAG retrieval)
PATTERN:  Attribution windows (click 1–90d, view 0–7d) stored in Elasticsearch
          FREEDOM config per advertiser account via IAttributionConfigService.
          Attribution engine reads config before every attribution decision.
          No hardcoded window values anywhere in service code.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-184: Attribution window from FREEDOM config
async def IsWithinWindowAsync(self, 
    str advertiserId, str touchpointType,
    DateTimeOffset touchpointTime, DateTimeOffset conversionTime,
    ScopeContext scope)
{
    # Read FREEDOM config per advertiser — never hardcoded window
     config = await _attributionConfig.GetConfigAsync(advertiserId, scope)
    if (!config.IsSuccess)
        return DataProcessResult[bool].Error("ATTRIBUTION_CONFIG_NOT_FOUND")
     windowDays = touchpointType switch
    {
        "click" => config.Value.GetValueOrDefault("click_window_days") as int? ?? 7,
        "view"  => config.Value.GetValueOrDefault("view_window_days")  as int? ?? 1,
        _ => throw ArgumentException($"Unknown touchpoint type: {touchpointType}")
    }
    if (windowDays == 0 && touchpointType == "view")
        return DataProcessResult[bool].Success(false); # view attribution disabled

     elapsed = (conversionTime - touchpointTime).TotalDays
    return DataProcessResult[bool].Success(elapsed <= windowDays)
}
```

**AI Agent Prompt**
```
You are implementing attribution window evaluation from FREEDOM config (SK-184).
Rules:
1. Window values (click_window_days, view_window_days) from IAttributionConfigService per advertiser.
2. NEVER hardcode 7d, 28d, or any default window in service code.
3. view_window_days = 0 means view attribution disabled — return false, not error.
4. click_window_days valid range: 1–90. Out-of-range rejected by T304 config gate.
5. Config read before every attribution decision (not cached in service instance).
6. Attribution config changes effective within 60s (IR-304-8).
Reference: IR-293-4, DD-179, DR-133, CF-379.
```

---

## SK-185 — Graph Depth Limit FREEDOM Config Pattern

```
SKILL:    SK-185
NAME:     Graph Depth Limit FREEDOM Config Pattern
DOMAIN:   Graph API / Resource Protection
USED BY:  T287, T299 (AF-4 RAG retrieval)
PATTERN:  Max traversal depth from F734 FREEDOM config per tenant/app tier.
          Depth exceeded → partial-error (not 400, not infinite traversal).
          Depth limit enforced BEFORE domain service fan-out.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-185: Graph depth limit from FREEDOM config
async def GetEffectiveDepthLimitAsync(self, 
    str appId, int requestedDepth, ScopeContext scope)
{
     config = await _graphDepthConfig.GetAsync(scope.TenantId, appId, scope)
     maxDepth = config.IsSuccess
        ? config.Value.GetValueOrDefault("max_depth_hops") as int? ?? 3
        : 3; # safe default if config missing

    if (requestedDepth <= maxDepth)
        return DataProcessResult[int].Success(requestedDepth)
    # Exceeded: return limit with partial-error signal
    return DataProcessResult[int].Success(maxDepth,
        errors: new[] { ObjectProcessor.BuildError(
            "DEPTH_LIMIT_EXCEEDED",
            $"Requested depth {requestedDepth} exceeds limit {maxDepth}",
            "depth") })
}
# Caller uses result depth for fan-out; errors array flows into partial-error response
```

**AI Agent Prompt**
```
You are implementing graph traversal depth limiting from FREEDOM config (SK-185).
Rules:
1. Max depth from F734 IGraphDepthConfigService per tenant/app tier — never hardcoded.
2. Exceeded depth → return FREEDOM config limit with partial-error entry.
3. Return partial-error (HTTP 200 with errors), NOT HTTP 400.
4. Depth check BEFORE F757 domain service fan-out (enforce before any fan-out cost).
5. Safe default = 3 if FREEDOM config absent (never block, never throw).
6. Different app tiers may have different limits — always resolve per-request.
Reference: IR-299-1, DD-174, CF-379 (ST-208 adversarial depth test).
```

---

## SK-186 — Creative Review Gate Pattern (Approval Before Eligibility)

```
SKILL:    SK-186
NAME:     Creative Review Gate Pattern
DOMAIN:   Ads Review / Brand Safety
USED BY:  T291, T295, T292 (AF-4 RAG retrieval)
PATTERN:  Creative starts as PENDING on ingestion. T295 sets APPROVED/REJECTED.
          T292 eligibility check filters on approved status ONLY.
          No code path grants auction eligibility to PENDING or REJECTED creatives.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-186: Approval gate — creative eligibility enforced before auction
# T291: Set initial status
async def IngestCreativeAsync(self, 
    dict[str, Any] creativeData, ScopeContext scope)
{
    creativeData["approval_status"] = "PENDING";  # ALWAYS starts PENDING
    creativeData["auction_eligible"] = false;      # NEVER eligible until approved
    await _adCatalog.UpsertAsync(creativeData, scope)
    await _reviewQueue.EnqueueAsync(creativeData, scope)
    return DataProcessResult[str].Success(creativeData["creative_id"].ToString())
}

# T292 eligibility filter: only approved creatives
async def load_eligible_ads_async(self, ctx: dict, scope: dict)
{
     filter = ObjectProcessor.build_search_filter(new dict[str, Any]
    {
        ["tenant_id"] = scope.TenantId,
        ["approval_status"] = "APPROVED",   # hard filter — PENDING/REJECTED excluded
        ["auction_eligible"] = true,
        ["targeting_matches"] = ctx.ViewerSegment
    })
    return await _adCatalog.SearchAsync(filter, scope)
}
```

**AI Agent Prompt**
```
You are implementing creative approval gating before auction eligibility (SK-186).
Rules:
1. T291 ingestion: approval_status = "PENDING". Never "APPROVED" on ingestion.
2. auction_eligible = false until T295 sets "APPROVED".
3. T292 eligibility load: build_search_filter with approval_status = "APPROVED" only.
4. No override path for admin to bypass approval gate.
5. T295 decision: APPROVED/REJECTED/RESTRICTED — all are append-only F786 records.
6. Status change propagation: F801 catalog updated AFTER F786 decision recorded.
Creative in auction without APPROVED status = BUILD FAILURE (IR-291-1, IR-292-2).
Reference: DD-178, CF-368, QG-291-6, QG-292-2.
```

---

## SK-187 — Political Ad Dual-Gate Pattern

```
SKILL:    SK-187
NAME:     Political Ad Dual-Gate Pattern
DOMAIN:   Ads Review / Regulatory Compliance
USED BY:  T295, T292 (AF-4 RAG retrieval)
PATTERN:  Political ads require BOTH automated classifier (F803) AND explicit
          verification service (F806). Classifier confidence is irrelevant —
          verification is mandatory regardless. One gate is never sufficient.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-187: Political dual gate — both required, neither optional
async def EvaluatePoliticalAdAsync(self, 
    dict[str, Any] creative, ScopeContext scope)
{
    # Gate 1: Automated classifier
     classifierResult = await _contentClassifier.ClassifyAsync(creative, scope)
     isPoliticalByClassifier = classifierResult.IsSuccess &&
        classifierResult.Value.GetValueOrDefault("category") as str == "political"
    # Gate 2: Explicit political verification (ALWAYS checked, not conditional)
     verificationResult = await _politicalVerificationService
        .GetVerificationStatusAsync(creative, scope)
     hasVerification = verificationResult.IsSuccess &&
        verificationResult.Value.GetValueOrDefault("status") as str == "VERIFIED"
    if (isPoliticalByClassifier && !hasVerification)
    {
        # Political by classifier, no verification → REJECTED
        return DataProcessResult[PoliticalGateResult].Success(
            PoliticalGateResult.Rejected("POLITICAL_VERIFICATION_REQUIRED"))
    }

    if (!isPoliticalByClassifier && !hasVerification)
    {
        # Not classified as political + no verification → PASS (not political)
        return DataProcessResult[PoliticalGateResult].Success(PoliticalGateResult.Pass())
    }

    # Has verification regardless of classifier → verified political ad
    return DataProcessResult[PoliticalGateResult].Success(
        PoliticalGateResult.VerifiedPolitical())
}
```

**AI Agent Prompt**
```
You are implementing a political ad dual-gate (SK-187).
Rules:
1. Gate 1: Run F803 classifier. Gate 2: Check F806 political verification.
2. BOTH gates run — never short-circuit Gate 2 based on Gate 1 result.
3. Classifier says political + no verification → REJECT (regardless of confidence score).
4. Classifier says NOT political + has verification → VerifiedPolitical (user self-declared).
5. No verification AND not classified → Pass (truly non-political).
6. Human override of political gate = BUILD FAILURE (IR-295-1).
Classifier confidence = 99% does NOT eliminate verification requirement.
Reference: IR-295-2, DD-168, DR-129, CF-367, QG-295-1.
```

---

## SK-188 — Developer Analytics Append-Aggregate Pattern

```
SKILL:    SK-188
NAME:     Developer Analytics Append-Aggregate Pattern
DOMAIN:   Observability / Developer Platform
USED BY:  T306 (AF-4 RAG retrieval)
PATTERN:  Raw telemetry (Redis) aggregated every 5 min into append-only ES aggregate.
          Dashboard reads from aggregate only — never from raw telemetry.
          Aggregation is idempotent: same window aggregated twice = same result.
          SLO error budget updated in same aggregation run.
```

**Primary (Python 3.12 + FastAPI)**
```python
# SK-188: Append-aggregate developer analytics
async def AggregateWindowAsync(self, 
    DateTimeOffset windowStart, DateTimeOffset windowEnd, ScopeContext scope)
{
    # Idempotency: check if window already aggregated
     existing = await _analyticsStore.GetWindowAggregateAsync(windowStart, windowEnd, scope)
    if (existing.IsSuccess)
        return DataProcessResult[AggregationResult].Success(
            ObjectProcessor.parse_document<AggregationResult>(existing.Value))
    # Read raw telemetry from Redis (time-bounded)
     rawEvents = await _telemetryStore.GetEventsInWindowAsync(windowStart, windowEnd, scope)
     aggregate = new dict[str, Any]
    {
        ["window_start"] = windowStart,
        ["window_end"] = windowEnd,
        ["tenant_id"] = scope.TenantId,
        ["request_count"] = rawEvents.Count,
        ["error_count"] = rawEvents.Count(e => e["status_code"] as int? >= 400),
        ["p50_latency_ms"] = rawEvents.Percentile("latency_ms", 50),
        ["p99_latency_ms"] = rawEvents.Percentile("latency_ms", 99),
        ["quota_utilization_pct"] = rawEvents.QuotaUtilization(scope.TenantId)
    }
    # APPEND to aggregate store (not update)
    await _analyticsStore.AppendAggregateAsync(aggregate, scope)
    # Update error budget in same transaction
     errorRate = (float)(int)aggregate["error_count"] / (int)aggregate["request_count"]
    await _errorBudgetService.UpdateAsync(scope.TenantId, windowStart, errorRate, scope)
    return DataProcessResult[AggregationResult].Success(
        ObjectProcessor.parse_document<AggregationResult>(aggregate))
}
```

**AI Agent Prompt**
```
You are implementing developer analytics aggregation (SK-188).
Rules:
1. Aggregation window = 5 min (FREEDOM config default — not hardcoded).
2. Idempotency: GetWindowAggregateAsync before computing. Same window = return existing.
3. Aggregate is APPEND-ONLY (no update to historical aggregates).
4. Dashboard reads from F844 aggregate index only — never raw telemetry.
5. SLO error budget updated in same run as aggregation (same scope context).
6. Per-tenant aggregation: build_search_filter with tenant_id on all queries.
7. Aggregation window change: FREEDOM config, takes effect within 60s.
Reference: IR-306-1, IR-306-8, CF-371.
```

---

## SKILLS SUMMARY — SK-175 through SK-188

| SK | Name | Domain | Used By | Key Pattern |
|----|------|--------|---------|-------------|
| SK-175 | Graph Auth Per-Node/Field | Graph API | T287, T288, T299 | Per-field F756 call; partial-auth |
| SK-176 | Partial-Error Graph Response | Graph API | T287, T299 | HTTP 200 + errors array |
| SK-177 | Webhook HMAC Delivery | Webhooks | T288, T289 | Mandatory HMAC; scoped key |
| SK-178 | Stateless Auction Redis-Only | Ads Delivery | T292 | Redis-only; async impression/budget |
| SK-179 | PCI Tokenization Boundary | Payments | T290 | Raw PAN never persists |
| SK-180 | Consent-Before-Evaluation Gate | Privacy | T301, T292 | Blocking gate; skip not filter |
| SK-181 | Append-Only Financial Ledger | Finance | T293, T294, T296, T303, T305 | INSERT only; offset corrections |
| SK-182 | Edge-Only Tenant Resolution | Multi-Tenant | All FLOW-20 | JWT claim → ScopeContext |
| SK-183 | Fraud Gate Blocking Before Billing | Fraud | T293, T294, T305 | Blocking; quarantine before bill |
| SK-184 | Attribution Window FREEDOM Config | Measurement | T293, T294, T304 | Per-advertiser window config |
| SK-185 | Graph Depth Limit FREEDOM Config | Graph API | T287, T299 | Partial-error on exceed; before fan-out |
| SK-186 | Creative Review Gate | Ads Review | T291, T295, T292 | PENDING on ingest; eligible only if APPROVED |
| SK-187 | Political Ad Dual-Gate | Regulatory | T295, T292 | Both classifier + verification |
| SK-188 | Developer Analytics Append-Aggregate | Observability | T306 | Idempotent append; dashboard from aggregate |

---

## SAVE POINT: FLOW20:P4:SKILLS ✅
## Phase 4 COMPLETE: SK-175–SK-188 (14 skill patterns, 14 primary + alternative implementations)
## Recovery: "Continue FLOW-20 Phase P5" → FLOW20_UNIFIED_SOURCE_INDEX.md


---

# ═══════════════════════════════════════════════════════════════
# FLOW-21: Forms & Flow Automation Builder (SK-189–SK-200)
# ═══════════════════════════════════════════════════════════════

# SKILLS FACTORY RAG — FLOW-21: Forms & Flow Automation Builder
## Extends SKILLS_FACTORY_RAG_MERGED.md
## Backward Compatible: SK-1-SK-188 UNCHANGED
## Save Point: FLOW21:P6:SKILLS ✅

---

## OVERVIEW

```
NEW SKILLS:  SK-189-SK-200 (12 patterns)
DOMAIN:      Forms authoring + submission pipeline + automation recipes + connectors
AF-4 RAG:    All patterns indexed for retrieval by RAG FABRIC (IRagService.SearchAsync())
```

---

## SK-189 — Form Schema DAG Validation Pattern

```
SKILL ID:       SK-189
NAME:           Form Schema DAG Validation
CATEGORY:       Validation / Schema
ARCHETYPE:      AUTHORING (T307)
FACTORIES:      F852, F853, F854, F855
FABRIC:         DATABASE FABRIC (ES) + AI ENGINE FABRIC

PATTERN DESCRIPTION:
  Validates form schema as a directed acyclic graph (DAG) of fields, pages,
  and conditional dependencies. Ensures no circular conditional dependencies
  (Field A visible if B, Field B visible if A = cycle).

REUSABLE PATTERN:
  # DNA-1: Schema as Dictionary
   schema = await _formSchema.GetSchema(formId, tenantId)
  if (!schema.IsSuccess) return DataProcessResult[bool].Failure(schema.Error)
   fields = schema.Value["fields"] as List<dict[str, Any]>
   visited = new set[str]()
   inStack = new set[str]()
  foreach ( field in fields)
  {
       fieldId = field["fieldId"].ToString()
      if (HasCycle(fieldId, schema.Value, visited, inStack))
          return DataProcessResult[bool].Failure("CIRCULAR_DEPENDENCY:" + fieldId)
  }
  return DataProcessResult[bool].Success(true)
CYCLE DETECTION:
  DFS on field dependency graph (conditionalDependencies[] per field definition)
  O(V + E) where V = fields, E = conditional rules

AF-4 RETRIEVAL TRIGGER:
  Query: "form schema validation cycle detection DAG"
  Used by: AF-7 (Compliance check — conditional logic never compiled, DR-136)

DNA COMPLIANCE:
  DNA-1: Schema traversed as Dictionary — no FieldNode class
  DNA-3: Cycle detection returns DataProcessResult.Failure with cyclic field ID
  DNA-5: tenantId on schema retrieval
```

---

## SK-190 — Submission Pipeline Stage-Gate Pattern

```
SKILL ID:       SK-190
NAME:           Submission Pipeline Stage-Gate
CATEGORY:       Pipeline / Ordering
ARCHETYPE:      INGESTION → TRANSFORM → VALIDATION → PERSISTENCE (T308-T312)
FACTORIES:      F864, F865, F866, F867, F868
FABRIC:         QUEUE FABRIC (stage transitions) + multiple DATABASE FABRICs

PATTERN DESCRIPTION:
  Enforces strict stage ordering: intake → normalize → validate → anti-spam → persist.
  Each stage emits a completion event consumed by the next stage.
  Failure at any stage routes to DLQ — pipeline does not proceed.

STAGE-GATE SEQUENCE:
  SUBMISSION_RECEIVED
    → [T308: Intake Dedup]
  SUBMISSION_DEDUPED
    → [T309: Normalize]
  SUBMISSION_NORMALIZED
    → [T310: Validate]
  SUBMISSION_VALIDATED
    → [T311: Anti-Spam]
  SUBMISSION_CLEARED
    → [T312: Persist]
  ENTRY_PERSISTED
    → [T314: Notify | T315: Feed]

REUSABLE PATTERN:
  # DNA-3: Each stage returns DataProcessResult — never throws
  # DNA-5: tenantId flows through every stage event payload
   intakeResult = await _intake.IntakeSubmission(raw, formId, tenantId)
  if (!intakeResult.IsSuccess) return intakeResult;  # DLQ routing

  # Emit stage event — next stage consumer handles normalization
  await _queue.EnqueueAsync("submission.deduped", new dict[str, Any]
  {
      ["submissionId"] = intakeResult.Value,
      ["tenantId"] = tenantId,
      ["formId"] = formId
  })
AF-4 RETRIEVAL TRIGGER:
  Query: "submission pipeline stage gate ordering queue"
  Used by: AF-2 (Planning — decompose pipeline into ordered stages)
           AF-7 (Compliance — CF-382, CF-385, CF-386 ordering rules)

DNA COMPLIANCE:
  DNA-3: Every stage returns DataProcessResult — pipeline never blocks on exception
  DNA-5: tenantId in every queue event payload
  DNA-4: Pipeline stages extend MicroserviceBase
```

---

## SK-191 — Merge Tag Resolver with AI Fallback

```
SKILL ID:       SK-191
NAME:           Merge Tag Resolver with AI Fallback
CATEGORY:       Notification / Template
ARCHETYPE:      NOTIFICATION (T314)
FACTORIES:      F878, F879
FABRIC:         DATABASE FABRIC (ES) + AI ENGINE FABRIC

PATTERN DESCRIPTION:
  Resolves notification template merge tags at runtime. Known tags resolved from
  entry data Dictionary. Unknown/dynamic tags fall back to AI for resolution.
  Never uses str.Replace() on typed model properties.

REUSABLE PATTERN:
  # DNA-1: No typed NotificationTemplate — template is Dictionary
   template = await _templateService.GetTemplate(formId, eventType, channel, tenantId)
   templateBody = template.Value["body"].ToString()
  # Extract tags: {submitterEmail}, {formTitle}, {customField}
   tags = ExtractMergeTags(templateBody)
   resolved = new dict[str, str]()
  foreach ( tag in tags)
  {
      # Try entry data first (DNA-1: entry is Dictionary)
      if (entryData.TryGetValue(tag, out  value))
      {
          resolved[tag] = value?.ToString() ?? ""
      }
      else
      {
          # AI fallback via IAiProvider.GenerateAsync() — never direct LLM
           aiResult = await _aiProvider.GenerateAsync(
              $"Resolve tag '{tag}' from context: {JsonSerializer.Serialize(entryData)}")
          resolved[tag] = aiResult.IsSuccess ? aiResult.Value : "[unresolved]"
      }
  }

  # Replace tags in template body
   body = resolved.Aggregate(templateBody, (s, kv) => s.Replace($"{{{kv.Key}}}", kv.Value))
  return DataProcessResult[str].Success(body)
AF-4 RETRIEVAL TRIGGER:
  Query: "merge tag template resolution AI notification"
  Used by: AF-1 (Genesis — generate INotificationTemplateService)
           AF-3 (Prompt Library — notification domain prompts)

DNA COMPLIANCE:
  DNA-1: Template and entry both as Dictionary — no typed Email/Notification class
  DNA-3: AI resolution failure returns DataProcessResult.Failure with missing-tag list
  DNA-5: tenantId on template lookup
```

---

## SK-192 — Feed Executor Idempotency (Redis Key + PG Log)

```
SKILL ID:       SK-192
NAME:           Feed Executor Idempotency
CATEGORY:       Integration / Feeds
ARCHETYPE:      FEED_EXECUTION (T315, T316)
FACTORIES:      F885, F895
FABRIC:         DATABASE FABRIC (Redis dedup + PG log) + QUEUE FABRIC

PATTERN DESCRIPTION:
  Guarantees at-most-once feed execution despite at-least-once QUEUE FABRIC delivery.
  Redis idempotency key checked before execution. PG run log records all outcomes.

REUSABLE PATTERN:
  # Step 1: Check idempotency key
   idemKey = $"{tenantId}:idem:{feedId}:{entryId}"
   isDuplicate = await _idempotency.CheckIdempotency(feedId, entryHash, tenantId)
  if (isDuplicate.IsSuccess && isDuplicate.Value)
      return DataProcessResult[str].Failure("IDEMPOTENT_SKIP")
  # Step 2: Register key BEFORE execution (not after)
  await _idempotency.RegisterExecution(feedId, entryHash, runId, tenantId)
  # Step 3: Execute feed (CRM, webhook, etc.)
   execResult = await _feedAdapter.Execute(feedPayload, tenantId)
  # Step 4: Record to PG run log regardless of outcome (DNA-3)
  await _runLog.LogRun(feedId, entryId, new dict[str, Any]
  {
      ["runId"] = runId,
      ["status"] = execResult.IsSuccess ? "success" : "failure",
      ["error"] = execResult.IsSuccess ? null : execResult.Error,
      ["tenantId"] = tenantId
  }, tenantId)
  return execResult
KEY FORMAT:     SHA-256(feedId + entryId + tenantId) — not UUIDv4 (ST-226)

AF-4 RETRIEVAL TRIGGER:
  Query: "feed executor idempotency Redis key dedup at-least-once"
  Used by: AF-1 (Genesis — generate IFeedExecutorService)
           AF-9 (Judge — QG-315-1 CRM duplicate detection)

DNA COMPLIANCE:
  DNA-3: All outcomes (success, failure, idempotent skip) as DataProcessResult
  DNA-5: tenantId on Redis key and PG log
```

---

## SK-193 — Recipe DAG Execution (Adapts SK-392 (RagStrategyRegistry) Flow Orchestrator)

```
SKILL ID:       SK-193
NAME:           Recipe DAG Execution
CATEGORY:       Automation / Orchestration
ARCHETYPE:      ORCHESTRATION (T319, T320)
FACTORIES:      F890, F891, F892, F893
FABRIC:         DATABASE FABRIC (ES DAG) + FLOW ENGINE FABRIC + QUEUE FABRIC

PATTERN DESCRIPTION:
  Adapts the FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry) IFlowOrchestrator) pattern to automation
  recipes. Recipe DAG stored in ES. Each step emits a queue event.
  Execution state maintained in PG. Mirrors Template 64 step-event model.

RECIPE DAG STRUCTURE (ES document):
  {
    "recipeId": "uuid",
    "tenantId": "tenant-1",
    "trigger": {"eventType": "ENTRY_PERSISTED", "formId": "form-A"},
    "steps": [
      {"stepId": "s1", "type": "CRM_SYNC", "factory": "F887", "next": "s2"},
      {"stepId": "s2", "type": "SLACK_NOTIFY", "factory": "custom", "next": null}
    ],
    "conditions": {"s2": {"runIf": "s1.status == 'success'"}}
  }

EXECUTION PATTERN:
  # DNA-1: Recipe loaded as Dictionary
   recipe = await _recipeDef.GetRecipe(recipeId, tenantId)
   steps = recipe.Value["steps"] as List<dict[str, Any]>
   currentStepId = runState.Value["currentStepId"].ToString()
   step = steps.First(s => s["stepId"].ToString() == currentStepId)
  # Resolve factory via CreateAsync() — DNA-4 pattern
   factory = await _stepResolver.ResolveStep(step, context, tenantId)
  # Execute step, record result, advance
   result = await factory.Execute(context)
  await _execService.AdvanceExecution(runId, tenantId);  # persist-before-event

AF-4 RETRIEVAL TRIGGER:
  Query: "recipe DAG execution Elasticsearch step orchestrator"
  Used by: AF-1 (Genesis — generate IRecipeExecutionService)
           AF-4 (RAG — SK-392 (RagStrategyRegistry) pattern reference for DR-139)

DNA COMPLIANCE:
  DNA-1: Recipe and step state as Dictionary — no typed RecipeStep class
  DNA-3: Step failure returns DataProcessResult.Failure — triggers T321 (Retry)
  DNA-5: tenantId on all ES and PG operations
```

---

## SK-194 — Connector OAuth PKCE Flow via Core Fabric

```
SKILL ID:       SK-194
NAME:           Connector OAuth PKCE Flow
CATEGORY:       Connector / Authentication
ARCHETYPE:      PROVISIONING (T322)
FACTORIES:      F897, F896
FABRIC:         DATABASE FABRIC (PG encrypted) + CORE FABRIC (HTTP)

PATTERN DESCRIPTION:
  Implements OAuth 2.0 PKCE flow for connector authentication.
  Tokens stored in PG with column-level encryption. Never in ES or Redis.
  PG advisory lock prevents token refresh race.

PKCE FLOW:
  1. GenerateCodeVerifier() → cryptographic random 32-byte → base64url
  2. codeChallenge = SHA-256(codeVerifier) → base64url
  3. Redirect to OAuth provider with code_challenge + code_challenge_method=S256
  4. Provider redirects back with auth code
  5. ExchangeCode(code, codeVerifier) → access_token + refresh_token
  6. Store encrypted tokens in PG: AES-256 column encryption

TOKEN REFRESH PATTERN (ST-223 race prevention):
  # PG advisory lock prevents float-refresh race
  await _pg.ExecuteAsync("SELECT pg_advisory_xact_lock(hashtext(@lockKey))",
      new { lockKey = $"{connectorId}:{tenantId}" })
  # Re-check token freshness after acquiring lock
   current = await _tokenStore.GetToken(connectorId, tenantId)
  if (current.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(5))
      return DataProcessResult[str].Success(current.AccessToken);  # Another thread refreshed

  # Refresh with external OAuth server
   refreshResult = await _httpClient.PostAsync(tokenEndpoint, refreshPayload)
  # ... store new tokens in PG

AF-4 RETRIEVAL TRIGGER:
  Query: "OAuth PKCE connector token refresh race lock"
  Used by: AF-8 (Security — token storage validation, CF-395)
           AF-1 (Genesis — generate IOAuthConnectorService)

DNA COMPLIANCE:
  DNA-3: OAuth exchange failure returns DataProcessResult.Failure
  DNA-5: tenantId on all PG token records + RLS enforced
  DNA-4: IOAuthConnectorService extends MicroserviceBase
```

---

## SK-195 — Anti-Spam Composite Gate (Honeypot + reCAPTCHA + AI Scoring)

```
SKILL ID:       SK-195
NAME:           Anti-Spam Composite Gate
CATEGORY:       Security / Validation
ARCHETYPE:      VALIDATION (T311)
FACTORIES:      F867
FABRIC:         AI ENGINE FABRIC + DATABASE FABRIC (Redis rate limit)

PATTERN DESCRIPTION:
  Three-layer composite spam check. Rate limit first (cheapest), then honeypot,
  then reCAPTCHA, then AI scoring (most expensive last).
  Each layer returns early on block — avoids unnecessary compute.

COMPOSITE GATE PATTERN:
  # Layer 1: Rate limit (Redis — cheapest, no AI cost)
   rateLimited = await _antiSpam.IsRateLimited(visitorId, formId, tenantId)
  if (rateLimited.Value) return DataProcessResult[Dictionary].Failure("RATE_LIMITED")
  # Layer 2: Honeypot (client-side hidden field check)
   honeypot = normalized.TryGetValue("_hp_field", out  hpVal) && !str.IsNullOrEmpty(hpVal?.ToString())
  if (honeypot) return DataProcessResult[Dictionary].Failure("HONEYPOT_TRIGGERED")
  # Layer 3: reCAPTCHA token verification (external API via CORE FABRIC HTTP)
  if (normalized.TryGetValue("recaptchaToken", out  token))
  {
       captchaResult = await _captchaVerifier.Verify(token.ToString(), tenantId)
      if (!captchaResult.IsSuccess) return DataProcessResult[Dictionary].Failure("CAPTCHA_FAILED")
  }

  # Layer 4: AI spam scoring (IAiProvider.GenerateAsync — most expensive, run last)
   aiScore = await _aiProvider.GenerateAsync(spamClassificationPrompt + JsonSerializer.Serialize(normalized))
   score = ParseSpamScore(aiScore.Value);  # 0.0-1.0

  return score > spamThreshold
      ? DataProcessResult[Dictionary].Failure("SPAM_DETECTED:" + score)
      : DataProcessResult[Dictionary].Success(new dict[str, Any] { ["score"] = score, ["blocked"] = false })
AF-4 RETRIEVAL TRIGGER:
  Query: "anti-spam honeypot reCAPTCHA AI scoring composite"
  Used by: AF-3 (Prompt Library — spam classification prompts)
           AF-8 (Security — spam gate before persist, DR-135)

DNA COMPLIANCE:
  DNA-1: Spam result as Dictionary {score, blocked, reason}
  DNA-3: Every layer returns DataProcessResult — no exceptions thrown
  DNA-5: tenantId on Redis rate limit key
```

---

## SK-196 — File Upload Secure Pipeline (Upload → Scan → Sign → Store)

```
SKILL ID:       SK-196
NAME:           File Upload Secure Pipeline
CATEGORY:       Security / File Handling
ARCHETYPE:      VALIDATION (T324)
FACTORIES:      F873, F874, F875, F876
FABRIC:         DATABASE FABRIC (ES meta) + AI ENGINE FABRIC + QUEUE FABRIC + CORE FABRIC

PATTERN DESCRIPTION:
  Complete file upload security pipeline: receive → quarantine → scan → sign → store.
  Signed URLs only generated after scan clears. Retention policy applied at store.

PIPELINE STAGES:
  STAGE 1: Upload Initiation (F873)
    file status = "quarantined" (never "available" before scan)

  STAGE 2: Virus Scan Enqueue (F874)
    scan job enqueued to QUEUE FABRIC (never inline)
    scan job ID returned immediately

  STAGE 3: Scan Complete (F874 consumer)
    scan result: {status: "clean|infected", threats: []}
    if infected: F874.Quarantine() — status = "infected", file access blocked
    if clean: F874.MarkClean() — status = "clean"

  STAGE 4: Signed URL Generation (F875)
    ONLY called after MarkClean() — enforced at service boundary (DR-141)
    URL TTL = FREEDOM config (default 24h)

  STAGE 5: Retention Policy (F876)
    Schedule deletion at retentionDays from upload date

REUSABLE PATTERN:
  # Step 1: Initiate + set quarantine status
   upload = await _fileUpload.CompleteUpload(uploadId, metadata, tenantId)
  # status is "quarantined" — no URL yet

  # Step 2: Enqueue scan (QUEUE FABRIC — not inline)
   scanJob = await _virusScan.EnqueueScan(upload.Value, tenantId)
  # Step 3 happens in scan consumer (separate service/step)
  # Step 4: After MarkClean (only reachable via scan-complete consumer)
   url = await _signedUrl.GenerateSignedUrl(fileId, ttlSeconds, tenantId)
AF-4 RETRIEVAL TRIGGER:
  Query: "file upload virus scan signed URL quarantine pipeline"
  Used by: AF-8 (Security — CF-401, INV-15-6)
           AF-9 (Judge — IR-324-1, QG-324-1)

DNA COMPLIANCE:
  DNA-3: All pipeline stages return DataProcessResult — quarantine never throws
  DNA-5: tenantId on all file metadata records
```

---

## SK-197 — Fabric-First UI Spec (Render Spec in ES, Zero Platform Values)

```
SKILL ID:       SK-197
NAME:           Fabric-First UI Render Spec
CATEGORY:       UI / Fabric-First
ARCHETYPE:      AUTHORING (T307)
FACTORIES:      F857, F863
FABRIC:         DATABASE FABRIC (Elasticsearch — render spec store)

PATTERN DESCRIPTION:
  Form render specs stored in ES as platform-agnostic dictionaries.
  Zero platform-specific values: no React props, no SwiftUI modifiers,
  no HTML attributes. Client interprets abstract field types.

CORRECT RENDER SPEC (Fabric-First):
  {
    "formId": "form-A",
    "tenantId": "tenant-1",
    "pages": [
      {
        "pageId": "p1",
        "fields": [
          {
            "fieldId": "f1",
            "type": "TEXT_INPUT",          # abstract type, not <input type="text">
            "label": {"en": "Full Name"},
            "required": true,
            "maxLength": 100,
            "validation": "NON_EMPTY"      # abstract rule, not regex str
          },
          {
            "fieldId": "f2",
            "type": "EMAIL_INPUT",          # abstract, not <input type="email">
            "label": {"en": "Email"},
            "required": true
          }
        ]
      }
    ],
    "layout": "SINGLE_COLUMN",             # abstract layout token
    "theme": "DEFAULT"                     # abstract theme token
  }

VIOLATION (Platform-Specific — BUILD FAILURE):
  "component": "TextInput",          # React Native component name ← FAIL
  "style": {"marginTop": 16},        # React Native style prop ← FAIL
  "htmlAttributes": {"autocomplete": "email"}  # HTML attribute ← FAIL
  "swiftUIModifier": ".keyboardType(.emailAddress)"  # SwiftUI ← FAIL

AF-4 RETRIEVAL TRIGGER:
  Query: "fabric-first UI render spec platform-agnostic abstract"
  Used by: AF-7 (Compliance — zero platform values enforced)
           AF-1 (Genesis — generate IFormRenderSpecService)
           AF-9 (Judge — IR-307-4, QG-307-2)

DNA COMPLIANCE:
  DNA-1: Render spec as Dictionary — no typed RenderSpec<Platform> class
  DNA-5: tenantId on render spec ES document
  DNA-6: DynamicController serves render spec — no form-specific controller
```

---

## SK-198 — Partial Entry Save-and-Continue (Redis TTL → PG Promotion)

```
SKILL ID:       SK-198
NAME:           Partial Entry Save-and-Continue
CATEGORY:       Persistence / UX
ARCHETYPE:      PERSISTENCE (T313)
FACTORIES:      F870, F862
FABRIC:         DATABASE FABRIC (Redis TTL) + DATABASE FABRIC (PostgreSQL)

PATTERN DESCRIPTION:
  Two-phase partial entry storage: Redis for active session, PG on completion.
  Redis TTL ≤ 48h. Resume token is cryptographically random (not entryId).
  Promotion to PG on form complete. Deletion on TTL expiry (no orphans).

REUSABLE PATTERN:
  # SAVE: Redis with TTL
   resumeToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32))
   redisKey = $"{tenantId}:partial:{resumeToken}"
   partialData = new dict[str, Any]
  {
      ["formId"] = formId,
      ["tenantId"] = tenantId,
      ["sessionId"] = sessionId,
      ["currentStep"] = currentStep,
      ["fieldValues"] = fieldValues  # dict[str, Any]
  }
  await _redis.SetAsync(redisKey, JsonSerializer.Serialize(partialData), TimeSpan.FromHours(48))
  # LOAD: Redis lookup with TTL check
   raw = await _redis.GetAsync(redisKey)
  if (raw == null) return DataProcessResult[Dictionary].Failure("PARTIAL_EXPIRED")
  # PROMOTE: On form complete — write to PG, delete Redis
  await _pg.InsertAsync("partial_entries_completed", partialData)
  await _redis.DeleteAsync(redisKey);  # Clean up Redis after promotion

  # PG schema: partial_entries_completed (tenantId, formId, entryId, fieldValues jsonb, completedAt)

TTL RULE:       48h Redis TTL is HARD maximum — never configurable above (DR-142, IR-313-2)
RESUME TOKEN:   32-byte cryptographic random — not guessable, not sequential

AF-4 RETRIEVAL TRIGGER:
  Query: "partial entry save continue Redis TTL PG promotion"
  Used by: AF-1 (Genesis — generate IPartialEntryService)
           AF-7 (Compliance — DR-142, IR-313-1)

DNA COMPLIANCE:
  DNA-1: Partial data as Dictionary — no typed PartialEntry class
  DNA-3: TTL expiry returns DataProcessResult.Failure (not null)
  DNA-5: tenantId on Redis key namespace + PG record
```

---

## SK-199 — Conditional Logic Evaluator (ES Rule Doc → Runtime Evaluation)

```
SKILL ID:       SK-199
NAME:           Conditional Logic Evaluator
CATEGORY:       Form Runtime / Rules Engine
ARCHETYPE:      AUTHORING (T307) + INGESTION (T308)
FACTORIES:      F854, F862
FABRIC:         DATABASE FABRIC (ES — rule docs) + AI ENGINE FABRIC

PATTERN DESCRIPTION:
  Evaluates show/hide/required conditional rules from ES documents at runtime.
  Rules never compiled into service code. AI can suggest rules in authoring mode.
  Evaluator processes rule Dictionary — no typed ConditionalRule class.

RULE DOCUMENT STRUCTURE (ES):
  {
    "formId": "form-A",
    "tenantId": "tenant-1",
    "rules": [
      {
        "ruleId": "r1",
        "targetFieldId": "f3",
        "action": "SHOW",
        "condition": {
          "fieldId": "f2",
          "operator": "EQUALS",
          "value": "Yes"
        }
      },
      {
        "ruleId": "r2",
        "targetFieldId": "f4",
        "action": "REQUIRE",
        "condition": {
          "operator": "AND",
          "conditions": [
            {"fieldId": "f1", "operator": "NOT_EMPTY"},
            {"fieldId": "f2", "operator": "EQUALS", "value": "Other"}
          ]
        }
      }
    ]
  }

EVALUATOR PATTERN:
  # DNA-1: rules loaded as Dictionary, fieldValues as Dictionary
   rules = await _conditionalLogic.EvaluateRules(formId, fieldValues, tenantId)
   results = new dict[str, Any]();  # {fieldId: {visible, required}}

  foreach ( rule in rules.Value["rules"] as List<dict[str, Any]>)
  {
       matches = EvaluateCondition(rule["condition"] as dict[str, Any], fieldValues)
       fieldId = rule["targetFieldId"].ToString()
       action = rule["action"].ToString()
      # Apply action to results Dictionary
  }

VIOLATION:
  if (formData["department"] == "Finance") { field.Visible = true; }  # ← FAIL: hardcoded condition

AF-4 RETRIEVAL TRIGGER:
  Query: "conditional logic form rules evaluator ES document runtime"
  Used by: AF-7 (Compliance — DR-136 rules never compiled)
           AF-4 (RAG — SK-189 schema DAG + SK-199 evaluator combined)

DNA COMPLIANCE:
  DNA-1: All rules and evaluation results as Dictionary
  DNA-3: Evaluator returns DataProcessResult.Failure on malformed rule
  DNA-5: tenantId on ES rule lookup
```

---

## SK-200 — Multi-Tenant Forms Isolation

```
SKILL ID:       SK-200
NAME:           Multi-Tenant Forms Isolation
CATEGORY:       Multi-Tenancy / Security
ARCHETYPE:      PROVISIONING (T326)
FACTORIES:      F900, F852, F868, F897
FABRIC:         CORE FABRIC + MT ISOLATION FABRIC (Skill 11) + DATABASE FABRIC (PG RLS)

PATTERN DESCRIPTION:
  Five-plane isolation for forms platform:
  1. ES schema namespace: {tenantId}-forms-schemas
  2. ES entry namespace:  {tenantId}-forms-entries
  3. PG RLS on entry audit + partial promoted entries
  4. Redis key prefix:    {tenantId}:*
  5. PG connector credentials: RLS + column-level encryption

INHERITS FLOW-08 MT MODEL + FLOW-14 WAREHOUSE MT MODEL (DR-143).
Does not reinvent isolation — extends proven patterns.

ISOLATION VERIFICATION:
  # Test 1: Cross-tenant schema read returns Failure
   schema = await _formSchema.GetSchema(tenantBFormId, tenantAId)
  Assert.False(schema.IsSuccess);  # NOT_FOUND — no enumeration leak

  # Test 2: PG RLS blocks cross-tenant entry query
  # Simulated: SET app.current_tenant = 'tenant-A'
  # SELECT * FROM entries WHERE entry_id = '{tenantBEntryId}'  → 0 rows

  # Test 3: Redis key isolation
   partialKeys = await _redis.ScanAsync($"tenant-A:*")
  Assert.DoesNotContain(partialKeys, k => k.StartsWith("tenant-B:"))
  # Test 4: Connector credential cross-tenant
   token = await _oauthConnector.GetAccessToken(tenantBConnectorId, tenantAId)
  Assert.False(token.IsSuccess)
PROVISION CHECKLIST (T326):
  ✅ ES index aliases created: {tenantId}-forms-schemas, {tenantId}-forms-entries
  ✅ PG RLS policy: CREATE POLICY tenant_isolation ON entries USING (tenant_id = current_setting('app.current_tenant'))
  ✅ Redis prefix documented in FREEDOM config
  ✅ Connector credential table RLS policy applied
  ✅ MT ISOLATION FABRIC (Skill 11) validation called

AF-4 RETRIEVAL TRIGGER:
  Query: "multi-tenant forms isolation ES namespace PG RLS Redis prefix"
  Used by: AF-8 (Security — ST-225 cross-tenant leak test)
           AF-9 (Judge — CF-398-234, IR-326-1 through 198-8)

DNA COMPLIANCE:
  DNA-5: tenantId isolation is the entire purpose of this skill
  DNA-3: All isolation checks return DataProcessResult.Failure (not exception)
  DNA-4: F900 extends MicroserviceBase with MT isolation components
```

---

## AF-4 RAG INDEX — FLOW-21 RETRIEVAL MAP

```
QUERY PATTERN                                           → SKILLS RETRIEVED
─────────────────────────────────────────────────────────────────────────
"form schema validation cycle detection"                → SK-189, SK-199
"submission pipeline stage gate ordering"               → SK-190
"merge tag template notification AI"                    → SK-191
"feed executor idempotency Redis dedup"                 → SK-192
"recipe DAG execution Elasticsearch"                    → SK-193, SK-189
"OAuth PKCE connector token refresh"                    → SK-194
"anti-spam honeypot reCAPTCHA AI scoring"               → SK-195
"file upload virus scan signed URL"                     → SK-196
"fabric-first UI render spec platform-agnostic"         → SK-197
"partial entry save continue Redis TTL"                 → SK-198
"conditional logic rules evaluator ES"                  → SK-199
"multi-tenant forms isolation ES PG RLS"                → SK-200
"persist before emit entry event"                       → SK-190 + DR-134 (ENGINE_ARCH)
"concurrent recipe execution step state"                → SK-193
"anti-spam before persist pipeline"                     → SK-195, SK-190
"OAuth token race condition lock"                       → SK-194 (ST-223)
```

---

## BACKWARD COMPATIBILITY VERIFICATION

```
SK-1-SK-188:  UNCHANGED ✅
SK-189 starts at correct next ID (98 + 1 = 99)
SK-200 is the last new skill (99 + 12 - 1 = 110)
No modifications to existing skill patterns
```

---

## SAVE POINT: FLOW21:P6:SKILLS ✅
## Recovery: "Load 21_-_forms_and_flows_SKILLS_FACTORY_RAG — SK-189-SK-200 complete"

═══════════════════════════════════════════════════════════════════
FLOW-22 — Visual Editor & Site Builder Platform
Merged: 2026-02-27
═══════════════════════════════════════════════════════════════════

# SKILLS FACTORY RAG — FLOW-22 EXTENSION
# Visual Editor & Site Builder Platform
# Extends: SKILLS_FACTORY_RAG_MERGED.md (SK-1–SK-200)
# FLOW-22 adds: SK-201–SK-210 (10 new skills)
# Save Point: FLOW22:P4:SKILLS:COMPLETE

---

## STATE REFERENCE
```
Previous: SK-1–SK-200 — SKILLS_FACTORY_RAG_MERGED.md
This file: SK-201–SK-210 (10 new skills)
```

---

## SK-201 — Page Tree Versioned Mutation Pattern

```
SKILL:        SK-201
NAME:         Page Tree Versioned Mutation Pattern
DOMAIN:       Visual Editor / Family 128
FACTORIES:    F901 (IPageTreeService), F905 (ICollaborationLockService)
FLOW:         FLOW-22
TASK TYPES:   T327, T329

PATTERN DESCRIPTION:
  Safely mutate a hierarchical page tree with full version history,
  optimistic concurrency, and collaboration lock enforcement.
  All nodes stored as dict[str, Any] in Elasticsearch.

PRIMARY (Python 3.12 + FastAPI):
  # Extend MicroserviceBase — always
  class PageTreeMutationService(MicroserviceBase):
  {
    private readonly IExternalServiceFactory<IPageTreeService> _treeFactory
    private readonly IExternalServiceFactory<ICollaborationLockService> _lockFactory
    async def MutateNodeAsync(self, 
      dict[str, Any] request)
    {
      # DNA-5: always extract tenantId first
       tenantId = ObjectProcessor.ExtractString(request, "tenantId")
       siteId   = ObjectProcessor.ExtractString(request, "siteId")
       nodeData = ObjectProcessor.parse_document(request, "node"); # DNA-1

      # Validate lock (DNA-3: return result, never throw)
       lockService = await _lockFactory.CreateAsync(new FactoryResolutionContext
        { TenantId = tenantId })
       lockCheck = await lockService.AcquireLockAsync(
        $"{siteId}:node:{nodeData["id"]}", request["userId"].ToString(), tenantId)
      if (!lockCheck.Success) return DataProcessResult[str].Failure(lockCheck.Error)
      # Write snapshot before mutation (IR-901-1)
       treeService = await _treeFactory.CreateAsync(
        new FactoryResolutionContext { TenantId = tenantId, SiteId = siteId })
       snapshot = await treeService.GetVersionAsync(siteId, nodeData["pageId"].ToString(),
        null, tenantId)
      # Build filter — skip empty fields (DNA-2)
       filter = build_search_filter(new dict[str, Any]
      {
        ["tenantId"] = tenantId, ["siteId"] = siteId, ["nodeId"] = nodeData["id"],
        ["etag"] = ObjectProcessor.ExtractString(request, "etag") # optimistic concurrency
      })
       result = await treeService.StoreNodeAsync(siteId, nodeData, tenantId)
      return result
    }
  }

LANGUAGE VARIANTS:
  Node.js:
    class PageTreeMutationService extends MicroserviceBase {
      async mutateNode(request) {
        const { tenantId, siteId, node, userId, etag } = request
        const lockSvc = await this.lockFactory.createAsync({ tenantId })
        const lock = await lockSvc.acquireLock(`${siteId}:node:${node.id}`, userId, tenantId)
        if (!lock.success) return DataProcessResult.failure(lock.error)
        const treeSvc = await this.treeFactory.createAsync({ tenantId, siteId })
        return await treeSvc.storeNode(siteId, node, tenantId)
      }
    }

AI AGENT PROMPT:
  "Generate a page tree mutation service following SK-201.
   Rules: extend MicroserviceBase, use IPageTreeService via factory, acquire collaboration lock
   via ICollaborationLockService before any write, write version snapshot (append-only),
   use build_search_filter (DNA-2), return DataProcessResult (DNA-3), include tenantId (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "page tree mutation"  - "component drag drop"  - "editor node update"
  - "version history visual editor"  - "ETag concurrency editor"
```

---

## SK-202 — JSON Schema 2020-12 Registry Pattern

```
SKILL:        SK-202
NAME:         JSON Schema 2020-12 Registry Pattern
DOMAIN:       CMS Data Modeling / Family 129
FACTORIES:    F907 (IPostTypeRegistryService), F909 (IPostTypeSchemaService)
FLOW:         FLOW-22
TASK TYPES:   T328, T331

PATTERN DESCRIPTION:
  Schema-first content modeling using JSON Schema 2020-12.
  Validates, versions, and registers PostType schemas with additive-only
  evolution guarantee. Generates form schemas for admin UI without code changes.

PRIMARY (Python 3.12 + FastAPI):
  class PostTypeRegistrationService(MicroserviceBase):
  {
    private readonly IExternalServiceFactory<IPostTypeRegistryService> _registryFactory
    private readonly IExternalServiceFactory<IPostTypeSchemaService> _schemaFactory
    async def RegisterAsync(self, 
      dict[str, Any] request)
    {
       tenantId = ObjectProcessor.ExtractString(request, "tenantId")
       schema   = ObjectProcessor.parse_document(request, "schema"); # DNA-1

      # Validate schema is JSON Schema 2020-12 (IR-907-1 / DD-192)
       schemaService = await _schemaFactory.CreateAsync(
        new FactoryResolutionContext { TenantId = tenantId })
       validation = await schemaService.ValidateDocumentAsync(
        schema, "meta-schema-2020-12", tenantId)
      if (!validation.Success) return DataProcessResult[str].Failure(
        $"Schema must be JSON Schema 2020-12: {validation.Error}")
      # Backward compat check (IR-907-2)
       registryService = await _registryFactory.CreateAsync(
        new FactoryResolutionContext { TenantId = tenantId })
       existing = await registryService.GetPostTypeAsync(
        schema["$id"].ToString(), tenantId)
      if (existing.Success)
      {
         backwardCompatCheck = CheckAdditiveOnly(existing.Value, schema)
        if (!backwardCompatCheck.IsAdditive)
          return DataProcessResult[str].Failure("Schema changes must be additive only")
      }

      return await registryService.RegisterPostTypeAsync(schema, tenantId)
    }
  }

AI AGENT PROMPT:
  "Generate a PostType registration service following SK-202.
   Rules: validate schema is JSON Schema 2020-12 (DD-192), check additive-only
   evolution (IR-907-2), version all changes, use parse_document (DNA-1),
   extend MicroserviceBase (DNA-4), scope by tenantId (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "post type schema"  - "cms schema registry"  - "JSON Schema 2020-12"
  - "content type definition"  - "schema validation CMS"
```

---

## SK-203 — CMS Collection Relation Pattern

```
SKILL:        SK-203
NAME:         CMS Collection Relation Pattern
DOMAIN:       CMS Data Modeling / Family 129
FACTORIES:    F912 (ICollectionRelationService), F908 (IPostService)
FLOW:         FLOW-22
TASK TYPES:   T331, T334

PATTERN DESCRIPTION:
  Manages typed relationships between CMS collections (post→author, post→tags,
  post→category) using config-driven relation types. Validates referential
  integrity before writes. Detects circular relations.

AI AGENT PROMPT:
  "Generate a collection relation service following SK-203.
   Rules: relation types from FREEDOM config (not hardcoded), circular detection,
   referential integrity check before post save (CF-408), parse_document (DNA-1),
   tenantId scope (DNA-5), DataProcessResult (DNA-3)."

RAG RETRIEVAL TRIGGERS:
  - "post category relation"  - "cms collection reference"
  - "content relationship"  - "referential integrity CMS"
```

---

## SK-204 — Optimistic Concurrency Content Write Pattern

```
SKILL:        SK-204
NAME:         Optimistic Concurrency Content Write Pattern
DOMAIN:       CMS / Content Authoring
FACTORIES:    F908 (IPostService), F911 (IContentVersionService)
FLOW:         FLOW-22
TASK TYPES:   T332

PATTERN DESCRIPTION:
  Write post content with ETag-based optimistic concurrency. Snapshot version
  before every update. Return 409 Conflict result on concurrent write collision.
  Version journal is append-only (no UPDATE/DELETE).

PRIMARY (Python 3.12 + FastAPI key excerpt):
  async def UpdatePostAsync(self, 
    dict[str, Any] request)
  {
     tenantId  = ObjectProcessor.ExtractString(request, "tenantId")
     postId    = ObjectProcessor.ExtractString(request, "postId")
     version   = ObjectProcessor.ExtractString(request, "version")
     content   = ObjectProcessor.parse_document(request, "content"); # DNA-1

     postService = await _postFactory.CreateAsync(
      new FactoryResolutionContext { TenantId = tenantId })
    # Check current version (ETag/If-Match — IR-908-2)
     current = await postService.GetPostAsync(postId, tenantId)
    if (!current.Success) return DataProcessResult[dict[str, Any]].Failure("Post not found")
    if (current.Value["version"].ToString() != version)
      return DataProcessResult[dict[str, Any]].Failure("409: Concurrent modification detected")
    # Snapshot before update (IR-911-1 append-only)
     versionService = await _versionFactory.CreateAsync(
      new FactoryResolutionContext { TenantId = tenantId })
    await versionService.SnapshotAsync(postId, current.Value, tenantId)
    return await postService.UpdatePostAsync(postId, content,
      int.Parse(version) + 1, tenantId)
  }

AI AGENT PROMPT:
  "Generate post update service following SK-204.
   Rules: ETag/If-Match version check (IR-908-2), snapshot before update (IR-911-1),
   409 result on version mismatch (DNA-3), version journal append-only,
   RFC 3339 timestamps (DD-194), parse_document (DNA-1), tenantId (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "optimistic concurrency post"  - "version conflict CMS"  - "ETag content update"
  - "concurrent edit content"  - "post version history"
```

---

## SK-205 — CMS Feed Query Pattern

```
SKILL:        SK-205
NAME:         CMS Feed Query Pattern
DOMAIN:       CMS Data Modeling / Family 129
FACTORIES:    F910 (ICmsQueryService), F908 (IPostService)
FLOW:         FLOW-22
TASK TYPES:   T335

PATTERN DESCRIPTION:
  Execute tenant-scoped, status-filtered CMS content queries for feed widgets.
  Always enforces status=Published for public feeds. Supports latest/category/tag
  filter combinations using build_search_filter (DNA-2).

PRIMARY (Python 3.12 + FastAPI key excerpt):
   filter = build_search_filter(new dict[str, Any]
  {
    ["tenantId"] = tenantId,     # DNA-5 — never skip
    ["siteId"]   = siteId,
    ["status"]   = "published",  # CF-413 — always for public feeds
    ["category"] = category,     # DNA-2 — skipped if empty
    ["tag"]      = tag,          # DNA-2 — skipped if empty
  })
AI AGENT PROMPT:
  "Generate CMS feed query service following SK-205.
   Rules: always filter status=published for public feeds (CF-413), build_search_filter
   skips empty category/tag (DNA-2), tenantId + siteId mandatory (DNA-5),
   query definitions in ES not hardcoded (IR-910-2), DataProcessResult (DNA-3)."

RAG RETRIEVAL TRIGGERS:
  - "blog feed query"  - "CMS content listing"  - "post feed widget"
  - "category filter posts"  - "related posts"
```

---

## SK-206 — Publish Saga with Compensation Pattern

```
SKILL:        SK-206
NAME:         Publish Saga with Compensation Pattern
DOMAIN:       Publishing Pipeline / Family 131
FACTORIES:    F917 (IPublishJobService), F919 (IStaticBuildService),
              F918 (ICacheInvalidationService), F921 (ISitemapRssService),
              F922 (IPublishRollbackService)
FLOW:         FLOW-22
TASK TYPES:   T336, T338

PATTERN DESCRIPTION:
  Implements the full publish pipeline as a saga with compensation steps for
  partial failures. Each step is idempotent (idempotency-key enforced).
  Pipeline steps: render → CDN deploy → cache invalidate → sitemap refresh → search index.
  Compensation: if step N fails, steps N-1...1 are compensated in reverse.
  CloudEvents envelope on all job events (DD-194).

PIPELINE STEPS:
  1. SSG Build trigger (F919)
  2. CDN pointer swap (F919)
  3. Cache invalidation (F918)
  4. Sitemap + RSS refresh (F921)
  5. Search index update (F942)
  6. Audit log + completion (F940)

COMPENSATION STEPS (on failure):
  - Step 6 failure → log failure; step 5–1 already committed (partial success logged)
  - Step 3 failure → CDN still points to new artifact; re-trigger invalidation
  - Step 2 failure → rollback CDN pointer to previous version via F922

AI AGENT PROMPT:
  "Generate publish saga service following SK-206.
   Rules: idempotency-key in all job payloads (IR-917-1), CloudEvents envelope (DD-194),
   compensation steps on failure (IR-T336-4), cache invalidation confirmed before complete
   (QG-T336-3), all steps audit-logged (F940), tenantId on all ops (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "publish pipeline"  - "content deploy saga"  - "publish compensation"
  - "SSG build trigger"  - "CDN deploy event"  - "cache invalidation publish"
```

---

## SK-207 — Idempotent Scheduled Publish Pattern

```
SKILL:        SK-207
NAME:         Idempotent Scheduled Publish Pattern
DOMAIN:       Publishing Pipeline / Family 131
FACTORIES:    F941 (ISchedulerService), F908 (IPostService), F917 (IPublishJobService)
FLOW:         FLOW-22
TASK TYPES:   T337

PATTERN DESCRIPTION:
  Time-based publish trigger that is fully idempotent. Handles duplicate fire events,
  post-already-published scenarios, and clock drift. RFC 3339 timestamp mandatory.
  Deduplication via idempotency-key = siteId + postId + publishAt-epoch.

AI AGENT PROMPT:
  "Generate scheduled publish trigger following SK-207.
   Rules: RFC 3339 publishAt (DD-194 / IR-T337-3), idempotency-key = siteId+postId+epoch,
   duplicate fire = no-op DataProcessResult (IR-T337-2), trigger at-or-after publishAt
   (IR-T337-1), post already Published = no-op, DataProcessResult for all states (DNA-3)."

RAG RETRIEVAL TRIGGERS:
  - "scheduled publish"  - "time-based publish trigger"  - "publish at future time"
  - "RFC 3339 scheduler"  - "idempotent job scheduler"
```

---

## SK-208 — Asset Upload Pipeline Pattern

```
SKILL:        SK-208
NAME:         Asset Upload Pipeline Pattern
DOMAIN:       Media Library / Family 134
FACTORIES:    F932 (IAssetUploadService), F933 (IImageTransformService),
              F934 (IAssetCdnService), F935 (IMediaLibraryService)
FLOW:         FLOW-22
TASK TYPES:   T344, T345

PATTERN DESCRIPTION:
  Multi-stage asset processing pipeline: presigned URL generation → upload confirmation
  → async transform pipeline (WebP, resize, responsive set) → CDN registration.
  Transform variants are immutable (each stored as new assetId). AI alt-text generation
  included as optional pipeline step with safety validation.

PIPELINE STAGES:
  Stage 1: InitiateUploadAsync (F932) → presigned URL with tenantId namespace
  Stage 2: CompleteUploadAsync (F932) → enqueue transform events via QUEUE FABRIC
  Stage 3: GenerateResponsiveSetAsync (F933) → WebP + 3 sizes (async, QUEUE FABRIC)
  Stage 4: GenerateAltTextAsync (F933) → AI-powered, safety validated, user-confirmable
  Stage 5: GetCdnUrlAsync (F934) → register CDN URL for each variant
  Stage 6: TagAssetAsync (F935) → register in media library

AI AGENT PROMPT:
  "Generate asset upload pipeline following SK-208.
   Rules: presigned URL with tenantId namespace (IR-932-2), transform variants as new assetId
   (IR-933-1), WebP generation async via QUEUE FABRIC (IR-933-2), AI alt-text requires
   safety validation + user confirmation (CF-428), all pipeline steps idempotent,
   tenantId on all operations (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "asset upload pipeline"  - "image transform CDN"  - "responsive image generation"
  - "media library upload"  - "WebP AVIF conversion"  - "AI alt text generation"
```

---

## SK-209 — Hybrid SSR/SSG Rendering Pattern

```
SKILL:        SK-209
NAME:         Hybrid SSR/SSG Rendering Pattern
DOMAIN:       Publishing Pipeline + Visual Editor
FACTORIES:    F904 (ILivePreviewService), F919 (IStaticBuildService),
              F920 (IRenderRuntimeService)
FLOW:         FLOW-22
TASK TYPES:   T330, T339, T343

PATTERN DESCRIPTION:
  Two-mode rendering architecture enforcing DD-193:
  - PREVIEW MODE: always SSR via F920 (IRenderRuntimeService) — fresh on every request
  - PUBLISHED MODE: SSG artifact via F919 (IStaticBuildService) — CDN-cached
  
  The engine NEVER serves an SSG artifact to a preview request.
  The engine NEVER triggers an SSR render for a published production page.
  Mode selection is determined by request context (editor session vs public URL).

ROUTING LOGIC:
  if (request.HasEditorSession) {
    # CF-423: MUST NOT use F919 artifact
    return await renderRuntime.RenderPageAsync(siteId, slug, tenantId); # F920 SSR
  } else {
    # Return CDN URL pointing to F919 build artifact
    return await cdnService.GetCdnUrlAsync(assetId, variant, tenantId); # F934
  }

AI AGENT PROMPT:
  "Generate hybrid rendering service following SK-209.
   Rules: editor session = SSR via F920 ALWAYS (DD-193 / CF-423),
   published = SSG CDN artifact via F919, no SSG artifact in preview path (IR-904-1),
   mode detection from request context not URL pattern, tenantId isolation (DNA-5)."

RAG RETRIEVAL TRIGGERS:
  - "SSR SSG hybrid rendering"  - "live preview vs published"
  - "editor preview render"  - "static site generation"  - "CDN artifact rendering"
```

---

## SK-210 — SEO + Sitemap Pipeline Pattern

```
SKILL:        SK-210
NAME:         SEO + Sitemap Pipeline Pattern
DOMAIN:       Routing / SEO / Family 133-87
FACTORIES:    F921 (ISitemapRssService), F927 (ISlugService),
              F929 (ISeoMetadataService), F928 (IRedirectService)
FLOW:         FLOW-22
TASK TYPES:   T340

PATTERN DESCRIPTION:
  Generates SEO metadata, sitemap.xml, and RSS feed from published CMS content.
  Enforces: published-only URLs in sitemap (CF-413), tenantId scoping (CF-421),
  AI-generated SEO meta with user confirmation gate (CF-428),
  auto-redirect on slug change (CF-410).

AI AGENT PROMPT:
  "Generate SEO + sitemap service following SK-210.
   Rules: sitemap contains ONLY published posts (CF-413), tenantId + siteId scoped (CF-421),
   AI SEO meta requires user confirmation before write (CF-428 / IR-929-1),
   slug change creates 301 redirect (CF-410 / IR-927-1), no base64 in OG images (IR-929-2),
   build_search_filter for all ES queries (DNA-2), DataProcessResult (DNA-3)."

RAG RETRIEVAL TRIGGERS:
  - "sitemap generation"  - "SEO metadata"  - "RSS feed"  - "slug redirect"
  - "OG image"  - "meta title description CMS"  - "search engine optimization"
```

---

## AF-4 RAG INDEX — FLOW-22 ADDITIONS

| Skill | Keywords | Task Types | Domain |
|-------|----------|------------|--------|
| SK-201 | page tree, node mutation, version snapshot, editor lock | T327, T329 | Visual Editor |
| SK-202 | JSON Schema 2020-12, PostType, schema registry, additive | T328, T331 | CMS Modeling |
| SK-203 | collection relation, referential integrity, circular detection | T331, T334 | CMS |
| SK-204 | optimistic concurrency, ETag, version conflict, content write | T332 | Content Auth |
| SK-205 | feed query, published filter, build_search_filter, CMS widget | T335 | CMS |
| SK-206 | publish saga, pipeline steps, compensation, CloudEvents | T336, T338 | Publishing |
| SK-207 | scheduled publish, RFC 3339, idempotent trigger, time-based | T337 | Publishing |
| SK-208 | asset upload, image transform, CDN, WebP, responsive set | T344, T345 | Media |
| SK-209 | SSR SSG hybrid, live preview, published CDN, mode routing | T330, T339 | Rendering |
| SK-210 | sitemap, RSS, SEO meta, slug redirect, OG image | T340 | SEO/Routing |

---

## BACKWARD COMPATIBILITY
```
SK-1–SK-200:  UNCHANGED ✅
New: SK-201–SK-210 (10 skills)
```

---

## SAVE POINT: FLOW22:P4:SKILLS:COMPLETE ✅
## Recovery: "FLOW-22 P4 complete. SK-201–SK-210. Continue with P5 unified source index."


---
---

# ═══════════════════════════════════════════════════════════════
# FLOW-23 — Visual Editor Extended: Skills SK-211–SK-222
# Merged: 2026-02-27
# ═══════════════════════════════════════════════════════════════

# XIIGen SKILLS FACTORY RAG — FLOW-23: Visual Editor Extended
## Delta File — SK-211–SK-222 only (12 new skills)
## Extends: SKILLS_FACTORY_RAG_MERGED.md (SK-1–SK-210)

---

## FLOW-23 SKILLS SUMMARY

| Skill ID | Name | Factory Backed | Fabric | Task Types |
|----------|------|----------------|--------|------------|
| SK-211 | NodeTreeService | F945, F946, F951 | DATABASE FABRIC (ES + Redis) | T347, T348, T351, T366 |
| SK-212 | LayoutSolverService | F953, F956, F958 | CORE FABRIC | T349, T352, T354 |
| SK-213 | ComponentConstraintService | F957, F967 | DATABASE FABRIC (ES) + CORE FABRIC | T348, T355, T360 |
| SK-214 | DataBindingBridgeService | F960, F961, F962, F966 | DATABASE FABRIC + AI ENGINE | T356, T357, T358 |
| SK-215 | BreakpointResolverService | F954, F955 | AI ENGINE FABRIC + DATABASE FABRIC | T350, T357 |
| SK-216 | ThemeTokenService | F977, F948, F952 | DATABASE FABRIC (ES) + QUEUE FABRIC | T353, T364 |
| SK-217 | RoleLockService | F957, F967, F972 | DATABASE FABRIC + CORE FABRIC | T355, T360 |
| SK-218 | FlowStateMachineService | F949, F952, F964 | DATABASE FABRIC (PG) + QUEUE FABRIC | T351, T362, T366 |
| SK-219 | UICodeExportService | F975, F976, F978, F979 | AI ENGINE FABRIC + DATABASE FABRIC | T363, T364, T365 |
| SK-220 | TenantIsolationHardeningService | F967, F968, F969, F970, F971, F973, F974 | CORE + DATABASE + QUEUE FABRIC | T360, T361, T362 |
| SK-221 | CanvasCollaborationService | F950, F952 | QUEUE FABRIC (Redis Streams) | T347, T348 |
| SK-222 | FlowSandboxService | F946, F964, F961 | DATABASE FABRIC (Redis) + QUEUE FABRIC | T357, T366 |

---

## SKILL: SK-211 — NodeTreeService

**Purpose:** Persist, retrieve, version, and search UI node trees as dynamic `dict[str, Any]` documents in Elasticsearch. Manage canvas hot state in Redis. Expose layer tree index.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1 (Dictionary), DNA-2 (build_search_filter), DNA-3 (DataProcessResult), DNA-4 (MicroserviceBase), DNA-5 (tenantId scope)

**Key Methods:**
```
StoreNodeTree(tenantId, canvasId, nodeTree: dict[str, Any]) → DataProcessResult[str]
GetNodeTree(tenantId, canvasId) → DataProcessResult[dict[str, Any]]
SearchNodes(tenantId, filters: dict[str, Any]) → DataProcessResult<List<dict[str, Any]>>
GetLayerTree(tenantId, canvasId) → DataProcessResult[dict[str, Any]]
PutCanvasHotState(tenantId, canvasId, state: dict[str, Any]) → DataProcessResult[bool]
```

**Pattern (DNA-1 compliant):**
```python
# CORRECT — parse_document, never typed model
 nodeTree = parse_document(rawDocument); # dict[str, Any]
 filter = build_search_filter(new { tenantId, canvasId }); # empty fields skipped — DNA-2
 result = await _db.SearchDocuments(filter); # via DATABASE FABRIC
return DataProcessResult[dict[str, Any]].Success(result)
# WRONG — BUILD FAILURE
# node = new NodeTreeDocument { NodeId = "x" }; # typed model — violates DNA-1
```

**AF-4 RAG Retrieval Tags:** `#node-tree`, `#canvas-persistence`, `#elasticsearch`, `#dictionary-pattern`

**Promotion Status:** GENERATED → targeted for CORE after FLOW-23 complete

---

## SKILL: SK-212 — LayoutSolverService

**Purpose:** Deterministically compute Flex/Grid layout bounding boxes, alignment candidates, and constraint evaluations for a canvas node tree. Pure computation extending MicroserviceBase. No AI, no external provider.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
SolveLayout(tenantId, nodeTree: dict[str, Any]) → DataProcessResult[dict[str, Any]]
CalculateBoundingBox(node: dict[str, Any]) → DataProcessResult[dict[str, Any]]
EvaluateFlexConstraints(container: dict[str, Any]) → DataProcessResult[dict[str, Any]]
EvaluateGridConstraints(container: dict[str, Any]) → DataProcessResult[dict[str, Any]]
MergeLayoutResult(base: dict[str, Any], patch: dict[str, Any]) → DataProcessResult[dict[str, Any]]
```

**Pattern:**
```python
# CORRECT — pure computation, MicroserviceBase, DataProcessResult
class LayoutSolverService(MicroserviceBase):, ILayoutSolverService
{
    async def SolveLayout(self, 
        str tenantId, dict[str, Any] nodeTree)
    {
         mode = nodeTree.GetValueOrDefault("layoutMode", "FLEX_VERTICAL")
        # ... compute bounding boxes deterministically
        return DataProcessResult[dict[str, Any]].Success(resolved)
    }
}

# WRONG
# class LayoutSolver: { ... } # must extend MicroserviceBase
```

**AF-4 RAG Retrieval Tags:** `#layout-solver`, `#flex-grid`, `#bounding-box`, `#pure-computation`

---

## SKILL: SK-213 — ComponentConstraintService

**Purpose:** Evaluate `lockLayout` / `allowContentEdit` node constraints. Enforce designer vs editor role boundaries. Fetch constraint documents from Elasticsearch via DATABASE FABRIC.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-2, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
GetConstraints(tenantId, nodeId) → DataProcessResult[dict[str, Any]]
EvaluateWrite(tenantId, nodeId, role, changeType) → DataProcessResult[bool]
StoreConstraints(tenantId, nodeId, constraints: dict[str, Any]) → DataProcessResult[str]
InheritConstraints(parentNodeId, childNodeId) → DataProcessResult[dict[str, Any]]
```

**Pattern:**
```python
# CORRECT — constraint document is Dictionary, role from auth context (not request body)
 constraints = await _constraintSvc.GetConstraints(tenantId, nodeId)
 role = _authContext.GetRole(); # from MicroserviceBase auth context — DNA-4
 canWrite = constraints["lockLayout"] as bool? == true && role != "DESIGNER"
    ? DataProcessResult[bool].Failure("Layout locked")
    : DataProcessResult[bool].Success(true)
```

**AF-4 RAG Retrieval Tags:** `#constraint-evaluation`, `#role-lock`, `#lock-layout`, `#permission-gate`

---

## SKILL: SK-214 — DataBindingBridgeService

**Purpose:** Resolve JSONPath binding paths to CMS content via DATABASE FABRIC. Manage Template Mode context. Execute content fallback via AI ENGINE FABRIC. Format fields (date, clamp, truncate).

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-2, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
ResolveBinding(tenantId, bindingPath: str, contentContext: dict[str, Any]) → DataProcessResult[object]
ActivateTemplateMode(tenantId, canvasId, contentType) → DataProcessResult[dict[str, Any]]
DeactivateTemplateMode(tenantId, canvasId) → DataProcessResult[bool]
ApplyFallback(tenantId, field: str, fallbackStrategy: str) → DataProcessResult[object]
FormatField(value: object, formatRule: dict[str, Any]) → DataProcessResult[str]
```

**Pattern:**
```python
# CORRECT — binding resolution via DATABASE FABRIC, null → AI fallback
 content = await _db.SearchDocuments(build_search_filter(new { tenantId, contentId }))
 value = ResolveJsonPath(content.Data, bindingPath)
if (value == null)
    value = await _aiProvider.GenerateAsync(fallbackPrompt); # via AI ENGINE FABRIC (F962)
return DataProcessResult[object].Success(FormatValue(value, formatRule))
# WRONG
# post = db.Posts.First(p => p.TenantId == tenantId); # typed model, direct DB
```

**AF-4 RAG Retrieval Tags:** `#data-binding`, `#jsonpath`, `#template-mode`, `#cms-integration`, `#content-fallback`

---

## SKILL: SK-215 — BreakpointResolverService

**Purpose:** Store and apply per-breakpoint style patch documents. Use AiDispatcher for AI-assisted responsive suggestions. Merge base style + breakpoint overrides.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-2, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
StoreBreakpointPatch(tenantId, nodeId, breakpoint, patch: dict[str, Any]) → DataProcessResult[str]
ApplyBreakpointOverrides(tenantId, nodeId, activeBreakpoint) → DataProcessResult[dict[str, Any]]
SuggestBreakpointOverrides(tenantId, baseStyle: dict[str, Any]) → DataProcessResult<List<dict[str, Any]>>
MergeBaseAndPatch(base: dict[str, Any], patch: dict[str, Any]) → DataProcessResult[dict[str, Any]]
```

**Pattern:**
```python
# CORRECT — patch is Dictionary, merge returns DataProcessResult
 basePatch = await GetBreakpointPatch(tenantId, nodeId, "desktop")
 mobilePatch = await GetBreakpointPatch(tenantId, nodeId, "mobile")
 merged = MergeBaseAndPatch(basePatch.Data, mobilePatch.Data)
return DataProcessResult[dict[str, Any]].Success(merged.Data)
```

**AF-4 RAG Retrieval Tags:** `#breakpoint`, `#responsive-design`, `#style-patches`, `#ai-layout-suggestion`

---

## SKILL: SK-216 — ThemeTokenService

**Purpose:** Manage global design tokens (colors, fonts, spacing) in Elasticsearch. Propagate token changes to all referencing nodes via QUEUE FABRIC. Sync tokens to external applications.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-2, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
StoreToken(tenantId, tokenKey, value: dict[str, Any]) → DataProcessResult[str]
GetToken(tenantId, tokenKey) → DataProcessResult[dict[str, Any]]
GetAllTokens(tenantId) → DataProcessResult<List<dict[str, Any]>>
PropagateTokenUpdate(tenantId, tokenKey) → DataProcessResult[int] # returns affected node count
ExportTokensToFormat(tenantId, format: str) → DataProcessResult[str] # CSS/Tailwind/style-dictionary
```

**Pattern:**
```python
# CORRECT — token stored via DATABASE FABRIC, propagation via QUEUE FABRIC
await _db.StoreDocument(build_search_filter(new { tenantId, tokenKey }), tokenDoc)
await _queue.EnqueueAsync("token-updates", CloudEventsEnvelope(tenantId, "TOKEN_UPDATED", tokenDoc))
# WRONG
# const colors = { primary: "#007bff" }; # hardcoded values — BUILD FAILURE
```

**AF-4 RAG Retrieval Tags:** `#design-tokens`, `#theme-sync`, `#css-variables`, `#token-propagation`

---

## SKILL: SK-217 — RoleLockService

**Purpose:** Enforce designer/editor/admin role boundaries on canvas operations. Integrate with OIDC/SCIM tenant identity via F972. Role context comes from MicroserviceBase auth context only.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
GetUserRole(tenantId, userId) → DataProcessResult[str]
CanEditLayout(tenantId, userId, nodeId) → DataProcessResult[bool]
CanEditContent(tenantId, userId, nodeId) → DataProcessResult[bool]
CanPublish(tenantId, userId) → DataProcessResult[bool]
EnforceRoleOnWrite(tenantId, userId, nodeId, changeType) → DataProcessResult[bool]
```

**Pattern:**
```python
# CORRECT — role from auth context, never from request body
 role = _authContext.GetClaim("role"); # MicroserviceBase auth context
 constraint = await _constraintSvc.GetConstraints(tenantId, nodeId)
if ((bool)constraint["lockLayout"] && role != "DESIGNER")
    return DataProcessResult[bool].Failure("Unauthorized: layout locked")
return DataProcessResult[bool].Success(true)
```

**AF-4 RAG Retrieval Tags:** `#role-based-access`, `#lock-layout`, `#designer-editor-boundary`, `#oidc`

---

## SKILL: SK-218 — FlowStateMachineService

**Purpose:** Manage canvas flow state machine lifecycle (Designing → Review → Published). Store state in PostgreSQL via DATABASE FABRIC. Emit state transition events via QUEUE FABRIC. Enforce guard conditions.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
GetCurrentState(tenantId, flowId) → DataProcessResult[str]
TransitionState(tenantId, flowId, event: str, guards: dict[str, Any]) → DataProcessResult[str]
GetAllowedTransitions(tenantId, flowId) → DataProcessResult<list[str]>
EmitTransitionEvent(tenantId, flowId, fromState, toState) → DataProcessResult[bool]
RollbackState(tenantId, flowId) → DataProcessResult[str]
```

**Pattern:**
```python
# CORRECT — state stored via DATABASE FABRIC (PG), events via QUEUE FABRIC
 current = await _db.SearchDocuments(build_search_filter(new { tenantId, flowId }))
if (!IsTransitionAllowed(currentState, targetEvent, guards))
    return DataProcessResult[str].Failure("Transition not allowed in current state")
await _db.StoreDocument(stateDoc); # PostgreSQL via DATABASE FABRIC
await _queue.EnqueueAsync("flow-state", CloudEventsEnvelope(tenantId, "STATE_TRANSITIONED", event))
```

**AF-4 RAG Retrieval Tags:** `#state-machine`, `#flow-lifecycle`, `#transitions`, `#guard-conditions`

---

## SKILL: SK-219 — UICodeExportService

**Purpose:** Transform node tree to production-ready React/Angular/Vue/Tailwind code using AiDispatcher multi-model consensus. Run AF-6 code review and AF-7 DNA compliance. Store in artifact registry via DATABASE FABRIC.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
ExportToFramework(tenantId, canvasId, framework: str) → DataProcessResult[dict[str, Any]]
ReviewGeneratedCode(tenantId, artifactId) → DataProcessResult[dict[str, Any]]
StoreArtifact(tenantId, artifact: dict[str, Any]) → DataProcessResult[str]
RollbackArtifact(tenantId, artifactId, targetVersion) → DataProcessResult[bool]
ExportDesignTokens(tenantId, format: str) → DataProcessResult[str]
```

**Pattern:**
```python
# CORRECT — AI via IAiProvider, framework via F976 adapter (config-driven)
 codeResult = await _aiProvider.GenerateAsync(BuildExportPrompt(nodeTree, framework))
# framework = config["export.framework"], never hardcoded "React"
 reviewed = await _reviewSvc.ReviewCode(codeResult)
if (reviewed.QualityScore < 0.8)
    return DataProcessResult[dict[str, Any]].Failure("Quality gate not met")
await _db.StoreDocument(BuildArtifactDoc(tenantId, codeResult))
# WRONG
# code = OpenAI.Chat("generate react code..."); # direct provider import
```

**AF-4 RAG Retrieval Tags:** `#code-export`, `#react`, `#tailwind`, `#multi-model-generation`, `#artifact-registry`

---

## SKILL: SK-220 — TenantIsolationHardeningService

**Purpose:** Full multi-tenant hardening suite. Tenant ID validation, quota enforcement, CloudEvents envelopes, idempotency store, tier graduation (pool/silo/bridge), OIDC/SCIM, PITR restore, OTLP telemetry.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-2, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
ValidateTenantContext(tenantId, requestContext: dict[str, Any]) → DataProcessResult[bool]
EnforceQuota(tenantId, quotaType: str) → DataProcessResult[bool]
WrapInCloudEventsEnvelope(tenantId, eventType, payload: dict[str, Any]) → DataProcessResult[dict[str, Any]]
CheckIdempotencyKey(tenantId, key: str) → DataProcessResult[bool]
GraduateTenantTier(tenantId, targetTier: str) → DataProcessResult[bool]
EmitTenantTelemetry(tenantId, metric: dict[str, Any]) → DataProcessResult[bool]
```

**OWASP Compliance:**
- API1 (BOLA/IDOR): `ValidateTenantContext` checks on every object-ID endpoint
- API4 (Resource Abuse): `EnforceQuota` blocks over-limit requests
- API6 (Sensitive Flow Abuse): quota types include `CANVAS_NODES`, `FLOW_RUNS`, `EXPORTS`
- API7 (SSRF): URL-fetching steps use allowlist via MicroserviceBase config

**AF-4 RAG Retrieval Tags:** `#multi-tenant`, `#quota-enforcement`, `#cloud-events`, `#idempotency`, `#owasp`, `#tenant-tiering`

---

## SKILL: SK-221 — CanvasCollaborationService

**Purpose:** Real-time multi-user canvas collaboration via QUEUE FABRIC (Redis Streams consumer groups). Publish/subscribe to canvas operation events. Conflict resolution for concurrent edits. Presence tracking.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
JoinCanvas(tenantId, canvasId, userId) → DataProcessResult[str] # consumer group registration
PublishOperation(tenantId, canvasId, operation: dict[str, Any]) → DataProcessResult[bool]
SubscribeOperations(tenantId, canvasId) → DataProcessResult<List<dict[str, Any]>>
ResolveConflict(tenantId, op1: dict[str, Any], op2: dict[str, Any]) → DataProcessResult[dict[str, Any]]
TrackPresence(tenantId, canvasId, userId) → DataProcessResult[bool]
```

**Pattern:**
```python
# CORRECT — collaboration via QUEUE FABRIC (Redis Streams), never WebSocket directly
await _queue.EnqueueAsync($"canvas-ops-{canvasId}", CloudEventsEnvelope(tenantId, "NODE_MOVED", op))
# WRONG
# WebSocketHub.Broadcast(userId, op); # direct socket — violates QUEUE FABRIC pattern
```

**AF-4 RAG Retrieval Tags:** `#real-time-collaboration`, `#redis-streams`, `#canvas-events`, `#conflict-resolution`, `#presence`

---

## SKILL: SK-222 — FlowSandboxService

**Purpose:** Provide isolated sandbox execution for generated canvas flows. Run flows in tenant-scoped sandbox before promotion. Sandbox state in Redis hot state. Results never contaminate production canvas.

**Extends:** MicroserviceBase (DNA-4)
**Returns:** `DataProcessResult[T]` always (DNA-3)
**DNA Compliance:** DNA-1, DNA-3, DNA-4, DNA-5

**Key Methods:**
```
CreateSandbox(tenantId, canvasId) → DataProcessResult[str] # sandboxId
ExecuteInSandbox(tenantId, sandboxId, flowDefinition: dict[str, Any]) → DataProcessResult[dict[str, Any]]
GetSandboxResult(tenantId, sandboxId) → DataProcessResult[dict[str, Any]]
PromoteSandboxToProduction(tenantId, sandboxId, canvasId) → DataProcessResult[bool]
DestroySandbox(tenantId, sandboxId) → DataProcessResult[bool]
```

**Pattern:**
```python
# CORRECT — sandbox state in Redis (F946), never writes to production ES (F945)
 sandboxState = await _redis.GetAsync($"sandbox:{tenantId}:{sandboxId}")
 result = await ExecuteFlow(flowDef, sandboxState); # isolated execution
await _redis.SetAsync($"sandbox-result:{tenantId}:{sandboxId}", result)
# Production only updated on explicit promotion
```

**AF-4 RAG Retrieval Tags:** `#sandbox`, `#flow-testing`, `#isolation`, `#promotion-ladder`, `#canvas-preview`

---

## AF-4 RAG INDEX — FLOW-23 ADDITIONS

| Tag | Skills | Task Types | Use When |
|-----|--------|------------|----------|
| `#node-tree` | SK-211 | T347, T351 | Persisting or querying canvas node hierarchies |
| `#layout-solver` | SK-212 | T349, T354 | Computing Flex/Grid bounding boxes |
| `#constraint-evaluation` | SK-213 | T355 | Enforcing lock/allow constraints on nodes |
| `#data-binding` | SK-214 | T356, T358 | Binding CMS fields to canvas nodes |
| `#template-mode` | SK-214 | T357 | Design-time live content preview |
| `#breakpoint` | SK-215 | T350, T352 | Responsive style patch management |
| `#design-tokens` | SK-216 | T353, T364 | Global design token propagation |
| `#role-based-access` | SK-217 | T355, T360 | Designer/editor role enforcement |
| `#state-machine` | SK-218 | T366 | Flow lifecycle (Designing→Published) |
| `#code-export` | SK-219 | T363, T364, T365 | AI-generated frontend code from node tree |
| `#multi-tenant` | SK-220 | T360, T361, T362 | Tenant isolation, quotas, CloudEvents |
| `#real-time-collaboration` | SK-221 | T347, T348 | Multi-user canvas editing |
| `#sandbox` | SK-222 | T357, T366 | Safe flow testing before production |

---

---

# ═══════════════════════════════════════════════════════════════
# FLOW-24: Learning Calendar Extension (Personal AI Tutor)
# Factories F982–F1027 | Task Types T367–T374 | Families 140–146
# ═══════════════════════════════════════════════════════════════

## SK-223: Knowledge Map Builder
**Domain:** Knowledge Diagnosis  
**AF-4 Retrieval Tags:** `knowledge-map`, `diagnosis`, `topic-score`, `competency`, `gap-analysis`  
**Referenced By:** T367, T371 | F988, F991  

**Pattern:** Build a dynamic, schema-less topic score map using dict[str, Any]. Scores are server-computed. Map supports partial updates per topic (upsert by topicId).

```python
# ✅ POSITIVE — correct engine-generated pattern
async def UpsertTopicScoreAsync(self, 
    str studentId, str tenantId, str topicId, float score, float confidence)
{
    # DNA-1: no typed KnowledgeMapEntry model — Dictionary only
     filter = build_search_filter(new dict[str, Any]
    {
        ["student_id"] = studentId,
        ["tenant_id"] = tenantId  # DNA-5: scope isolation
    })
     existing = await _db.SearchDocumentsAsync<dict[str, Any]>(filter)
     map = existing.Data?.FirstOrDefault() ?? new dict[str, Any]()
     topics = map.ContainsKey("topics") 
        ? (dict[str, Any])map["topics"] 
        : new dict[str, Any]()
    topics[topicId] = new dict[str, Any]
    {
        ["score"] = score,          # server-computed — DNA-3
        ["confidence"] = confidence,
        ["last_seen"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        ["version"] = str.NewGuid().ToString()  # optimistic concurrency
    }
    map["topics"] = topics
    map["student_id"] = studentId
    map["tenant_id"] = tenantId
    return await _db.StoreDocumentAsync(map)
}

# ❌ NEGATIVE — DNA violations
async def UpdateScoreAsync(self, KnowledgeMapEntry entry)  # VIOLATION: typed model
{
    await _db.UpdateAsync(entry);  # VIOLATION: direct ORM, not fabric interface
    # VIOLATION: no tenantId scope
    # VIOLATION: typed model instead of Dictionary
}
```

**When AF-4 returns this skill:** Any T367 or T371 generation requesting knowledge map persistence pattern.

---

## SK-224: Consent Gate — Minor Protection
**Domain:** Student Identity & Consent  
**AF-4 Retrieval Tags:** `consent`, `minor`, `parental-gate`, `COPPA`, `blocking-gate`  
**Referenced By:** T367, T368, T369 | F983, F1002  

**Pattern:** Consent gate fires as the FIRST step in any flow touching a student. Minor=true triggers stricter policies. Consent status is READ-ONLY server-side.

```python
# ✅ POSITIVE — consent gate pattern
async def CheckAndEnforceConsentAsync(self, 
    str studentId, str tenantId, str operationType)
{
    # Always first — scope gate
     scopeResult = await _tenantGate.EnforceScopeAsync(tenantId, studentId)
    if (!scopeResult.IsSuccess) return DataProcessResult[bool].Fail("SCOPE_VIOLATION")
    # Minor check — server-computed, never from client
     consentData = await _consentService.GetConsentAsync(studentId)
    if (!consentData.IsSuccess) return DataProcessResult[bool].Fail("CONSENT_READ_FAILED")
     isMinor = (bool)consentData.Data["is_minor"];  # server truth
     consentGranted = (bool)consentData.Data["consent_granted"]
    if (isMinor && !consentGranted)
        return DataProcessResult[bool].Fail("PARENTAL_CONSENT_REQUIRED")
    # Propagate to downstream context (for ASYNC consumers)
    _context.SetConsentContext(new dict[str, Any]
    {
        ["is_minor"] = isMinor,
        ["consent_version"] = consentData.Data["consent_version"],
        ["tenant_id"] = tenantId,
        ["student_id"] = studentId
    })
    return DataProcessResult[bool].Success(true)
}

# ❌ NEGATIVE — bypass pattern
async def GenerateLessonAsync(self, str studentId, bool isMinor)  
# VIOLATION: isMinor from client parameter, not server
{
    # VIOLATION: no consent check before AI call
     lesson = await _openAiClient.CreateChatCompletionAsync(...); # VIOLATION: direct SDK
}
```

---

## SK-225: Lesson Composer — RAG + LLM Pattern
**Domain:** Lesson Generation  
**AF-4 Retrieval Tags:** `lesson-composer`, `rag-llm`, `ai-generation`, `difficulty-adapter`, `micro-lesson`  
**Referenced By:** T368, T372, T374 | F1000, F1001, F1005  

**Pattern:** Fetch RAG atoms first (no LLM without retrieval context). Compose via AiDispatcher (multi-model). Safety gate after compose, before publish.

```python
# ✅ POSITIVE — RAG-before-LLM pattern
async def ComposeLessonAsync(self, 
    str topicId, str studentId, str tenantId, float difficulty)
{
    # DNA-5: scope isolation on atom retrieval
     ragSpec = build_search_filter(new dict[str, Any]
    {
        ["topic_id"] = topicId,
        ["difficulty_min"] = difficulty - 0.15f,
        ["difficulty_max"] = difficulty + 0.15f,
        ["tenant_id"] = tenantId
    })
    # Step 1: RAG atoms BEFORE LLM (iron rule IR-368-5)
     atoms = await _ragService.SearchAsync(ragSpec)
    if (!atoms.IsSuccess) return DataProcessResult[dict[str, Any]].Fail("RAG_FAILED")
    # Step 2: Build composition spec (Dictionary — DNA-1)
     spec = new dict[str, Any]
    {
        ["topic_id"] = topicId,
        ["atoms"] = atoms.Data,
        ["difficulty"] = difficulty,
        ["locale"] = _context.Locale,
        ["is_minor"] = _context.IsMinor  # propagated from consent gate (SK-224)
    }
    # Step 3: AI Engine Fabric — never openai.chat() directly
     composed = await _aiDispatcher.GenerateAsync(spec);  # IAiProvider
    
    # Step 4: Safety gate — ALWAYS before return (CF-465)
     safetyResult = await _safetyGate.EvaluateAsync(composed.Data, _context.IsMinor)
    if (!(bool)safetyResult.Data["passed"])
        return DataProcessResult[dict[str, Any]].Fail("SAFETY_GATE_FAILED")
    composed.Data["safety_gate_token"] = safetyResult.Data["token"];  # required by F1003
    return composed
}

# ❌ NEGATIVE
 lesson = await _openAiClient.GenerateAsync(prompt);  # VIOLATION: direct SDK (IR-368-3)
# VIOLATION: no RAG atoms fetched
# VIOLATION: safety gate not called
```

---

## SK-226: Curriculum Graph-RAG
**Domain:** Curriculum & Prerequisites  
**AF-4 Retrieval Tags:** `curriculum-graph`, `prerequisites`, `graph-rag`, `neo4j`, `skill-tree`, `mastery-path`  
**Referenced By:** T367, T368, T371 | F993, F994, F995, F997  

**Pattern:** Hybrid Graph-RAG — graph traversal (Neo4j via DB Fabric) combined with vector similarity (RAG Fabric). All graph queries through IDatabaseService with Graph provider config.

```python
# ✅ POSITIVE — Graph-RAG hybrid
async def get_next_ready_topics_async(self, student_id: str, tenant_id: str)
{
    # Step 1: Get knowledge map gaps
     gapFilter = build_search_filter(new dict[str, Any]
    {
        ["student_id"] = studentId,
        ["tenant_id"] = tenantId,  # DNA-5
        ["score_max"] = 0.6f       # topics below mastery threshold
    })
     gaps = await _knowledgeMapService.GetGapsAsync(studentId, 0.6f)
    # Step 2: Graph traversal for prerequisites (DB Fabric → Neo4j provider)
     readyTopics = new List<dict[str, Any]>()
    foreach ( gap in gaps.Data)
    {
         prereqCheck = await _prereqValidator.CheckReadinessAsync(
            studentId, (str)gap["topic_id"])
        if ((bool)prereqCheck.Data["is_ready"])
            readyTopics.Add(gap)
    }
    
    # Step 3: Vector similarity for related topics (RAG Fabric)
    if (readyTopics.Count < 3)
    {
         similar = await _topicOntology.SearchTopicAsync(
            build_search_filter(new dict[str, Any]
            {
                ["pack_id"] = _context.PackId,
                ["locale"] = _context.Locale
            }), _context.PackId, _context.Locale)
        readyTopics.AddRange(similar.Data.Take(3 - readyTopics.Count))
    }
    
    return DataProcessResult<List<dict[str, Any]>>.Success(readyTopics)
}

# ❌ NEGATIVE
 neo4jDriver = GraphDatabase.Driver("bolt:# localhost");  # VIOLATION: direct Neo4j SDK
 session = neo4jDriver.AsyncSession();  # VIOLATION: not through DB Fabric
```

---

## SK-227: Difficulty Adapter
**Domain:** Lesson Personalization  
**AF-4 Retrieval Tags:** `difficulty-adapter`, `adaptive-learning`, `simplify`, `enrich`, `srs`  
**Referenced By:** T368, T371 | F1005, F1012  

**Pattern:** Adapt lesson difficulty based on studentId's recent topic score from KnowledgeMap. Two modes: Simplify (score < threshold) and Enrich (score > threshold). Both routes pass through safety gate.

```python
# ✅ POSITIVE
async def AdaptDifficultyAsync(self, 
    str lessonId, str studentId, str topicId, str tenantId)
{
     mapResult = await _knowledgeMap.GetMapAsync(studentId)
     topics = (dict[str, Any])mapResult.Data["topics"]
    float score = topics.ContainsKey(topicId) 
        ? (float)((dict[str, Any])topics[topicId])["score"]
        : 0.5f;  # default difficulty for new topics
    
    # Thresholds from FREEDOM config (F986) — no literals
     config = await _localeConfig.GetLocaleConfigAsync(_context.Locale, _context.Grade)
    float simplifyThreshold = (float)config.Data["simplify_threshold"]
    float enrichThreshold = (float)config.Data["enrich_threshold"]
    if (score < simplifyThreshold)
        return await _difficultyAdapter.SimplifyAsync(lessonId, score)
    else if (score > enrichThreshold)
        return await _difficultyAdapter.EnrichAsync(lessonId, score)
    return await _lessonStore.GetPublishedAsync(lessonId);  # no adaptation needed
}
# ❌ NEGATIVE: if (score < 0.4) # VIOLATION: literal threshold, not FREEDOM config
```

---

## SK-228: Gamification Ledger — Append-Only Pattern
**Domain:** Gamification  
**AF-4 Retrieval Tags:** `gamification`, `ledger`, `append-only`, `points`, `badges`, `anti-cheat`  
**Referenced By:** T369 | F1014, F1015, F1016, F1018  

**Pattern:** Ledger is append-only (no UPDATE/DELETE). Points sourced from server computation only. Badge evaluation is async via Queue Fabric. SYNC path returns preview; ASYNC path writes truth.

```python
# ✅ POSITIVE — hybrid pattern (same as FLOW-05, extended)
# SYNC path:
async def GetPointsPreviewAsync(self, 
    str sessionId, str studentId)
{
    # Grade server-side — never accept client points
     gradeResult = await _quizGrader.GradeAsync(sessionId, _context.Answers)
     points = await _pointsCalculator.CalculateAsync(gradeResult.Data, 
        _context.CurrentStreak, _context.BonusFlags)
    # Return preview ONLY — no ledger write in sync path (IR-369-1)
    return DataProcessResult[dict[str, Any]].Success(new dict[str, Any]
    {
        ["points_preview"] = points.Data["points_earned"],
        ["badge_preview"] = await CheckBadgePreviewAsync(studentId, points)
    })
}

# ASYNC path (via queue event):
async def ProcessGamificationAsync(self, dict[str, Any] queueEvent)
{
    # Re-validate consent in async consumer (CF-472)
     consent = (dict[str, Any])queueEvent["consent_context"]
    await _consentService.ValidateVersionAsync(
        (str)consent["student_id"], (str)consent["consent_version"])
    # Append-only — never UPDATE
    await _ledger.AppendEventAsync(new dict[str, Any]
    {
        ["student_id"] = queueEvent["student_id"],
        ["tenant_id"] = queueEvent["tenant_id"],
        ["points"] = queueEvent["server_computed_points"],  # from grader, not client
        ["source_flow"] = "FLOW-24",  # CF-467: deduplication
        ["quiz_attempt_id"] = queueEvent["quiz_attempt_id"],
        ["timestamp"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    })
}

# ❌ NEGATIVE
await _db.UpdateAsync("UPDATE ledger SET points = points + 100 WHERE student_id = ?")
# VIOLATION: UPDATE on append-only table (CF-462)
 points = request.Body["pointsEarned"];  # VIOLATION: client-submitted points (CF-463)
```

---

## SK-229: Streak Manager — Timezone-Aware
**Domain:** Gamification  
**AF-4 Retrieval Tags:** `streak`, `timezone`, `gamification`, `trust`, `grace-period`  
**Referenced By:** T369, T370 | F1017, F1027  

**Pattern:** Streak boundary computed from profile timezone (F982), never from client. Redis hot state for fast reads; PostgreSQL for durable persist. Optional streak protection via F1027.

```python
# ✅ POSITIVE
async def UpdateStreakAsync(self, 
    str studentId, str tenantId, int completionTimestampUtc)
{
    # Get timezone from PROFILE — not from client (CF-464)
     profile = await _studentProfile.GetProfileAsync(studentId, tenantId)
     timezone = (str)profile.Data["timezone"];  # e.g. "Asia/Jerusalem"
    
     tz = TimeZoneInfo.FindSystemTimeZoneById(timezone)
     completionLocal = TimeZoneInfo.ConvertTimeFromUtc(
        DateTimeOffset.FromUnixTimeMilliseconds(completionTimestampUtc).UtcDateTime, tz)
     completionDate = DateOnly.FromDateTime(completionLocal)
    # Get current streak from Redis (fast)
     currentStreak = await _cache.GetAsync($"streak:{tenantId}:{studentId}")
     streakData = currentStreak != null 
        ? System.Text.Json.JsonSerializer.Deserialize<dict[str, Any]>(currentStreak)
        : new dict[str, Any] { ["count"] = 0, ["last_date"] = null }
     lastDate = streakData["last_date"] != null 
        ? DateOnly.Parse((str)streakData["last_date"]) 
        : (DateOnly?)null
    bool extended = lastDate.HasValue && completionDate == lastDate.Value.AddDays(1)
    bool maintained = lastDate.HasValue && completionDate == lastDate.Value
     newCount = extended ? (int)streakData["count"] + 1 
                 : maintained ? (int)streakData["count"]
                 : 1;  # streak reset
    
     updated = new dict[str, Any]
    {
        ["count"] = newCount,
        ["last_date"] = completionDate.ToString("yyyy-MM-dd"),
        ["timezone"] = timezone
    }
    # Hot state in Redis + durable persist in PG (dual write)
    await _cache.SetAsync($"streak:{tenantId}:{studentId}", 
        System.Text.Json.JsonSerializer.Serialize(updated))
    await _db.StoreDocumentAsync(BuildStreakDocument(studentId, tenantId, updated))
    return DataProcessResult[dict[str, Any]].Success(updated)
}

# ❌ NEGATIVE
async def UpdateStreakAsync(self, str studentId, str timezone)  
# VIOLATION: timezone from caller, not profile (CF-464)
```

---

## SK-230: Calendar Connector — Fabric-First
**Domain:** Calendar Sync  
**AF-4 Retrieval Tags:** `calendar-sync`, `google-calendar`, `outlook`, `fabric-first`, `queue-pattern`  
**Referenced By:** T368, T370, T373 | F1022, F1023, F1024  

**Pattern:** All calendar operations enqueued via F1022 (QUEUE FABRIC). No direct SDK import in service code. Provider resolved from StudentProfile config. Connector interfaces (F1023/F1024) are the sole calendar integration points.

```python
# ✅ POSITIVE — fabric-first calendar sync
async def ScheduleLessonAsync(self, 
    str studentId, str tenantId, str lessonId, int preferredTimestampUtc)
{
    # Resolve provider from profile config — NEVER hardcoded
     profile = await _studentProfile.GetProfileAsync(studentId, tenantId)
     provider = (str)profile.Data["calendar_provider"];  # "google"|"outlook"|"caldav"
    
     calendarEvent = new dict[str, Any]
    {
        ["student_id"] = studentId,
        ["tenant_id"] = tenantId,
        ["lesson_id"] = lessonId,
        ["summary"] = "Today's Learning Session",  # FREEDOM: title from ES config
        ["start_timestamp_utc"] = preferredTimestampUtc,
        ["duration_minutes"] = _config.GetValue("lesson_duration_minutes"),  # FREEDOM
        ["source_flow"] = "FLOW-24",  # CF-460: namespace isolation
        ["namespace"] = "lesson"
    }
    # Enqueue via QUEUE FABRIC — never direct HTTP (CF-466)
    return await _calendarSyncService.EnqueueSyncAsync(studentId, calendarEvent, provider)
}

# Consumer (F1022 → F1023/F1024):
async def ProcessCalendarSyncAsync(self, dict[str, Any] queueEvent)
{
     provider = (str)queueEvent["provider"]
    # Factory resolution — never direct instantiation
     connector = provider switch
    {
        "google" => await _factory.CreateAsync<IGoogleCalendarConnector>(context),
        "outlook" => await _factory.CreateAsync<IOutlookCalendarConnector>(context),
        _ => throw NotSupportedException($"Unknown provider: {provider}")
    }
    await connector.UpsertEventAsync((dict[str, Any])queueEvent["event"])
}

# ❌ NEGATIVE
  # VIOLATION: direct SDK import (CF-466, IR-373-1)
 service = CalendarService(initializer);  # VIOLATION
await service.Events.Insert(calEvent, "primary").ExecuteAsync();  # VIOLATION
```

---

## SK-231: Reminder Orchestrator — Escalation Ladder
**Domain:** Reminders & Engagement  
**AF-4 Retrieval Tags:** `reminder`, `escalation`, `quiet-hours`, `nudge`, `push-notification`  
**Referenced By:** T368, T370 | F1025, F1026  

**Pattern:** Quiet hours check BEFORE enqueue. Escalation ladder: calendar task → push notification → "2-minute recap" fallback. All via Queue Fabric (durable). FREEDOM-configurable policy.

```python
# ✅ POSITIVE
async def EnqueueReminderAsync(self, 
    str studentId, str tenantId, str lessonId, int scheduledTimestampUtc)
{
    # Check quiet hours FIRST (CF-469)
     isQuiet = await _quietHours.IsQuietTimeNowAsync(studentId, _context.Timezone)
    if ((bool)isQuiet.Data)
    {
         nextSlot = await _quietHours.GetNextAllowedSlotAsync(studentId, scheduledTimestampUtc)
        scheduledTimestampUtc = (int)nextSlot.Data;  # defer to next allowed window
    }
    
    # Escalation config from FREEDOM (no literals)
     policy = await _localeConfig.GetLocaleConfigAsync(_context.Locale, _context.Grade)
     escalationPolicy = (str)policy.Data["reminder_escalation_policy"];  # "soft"|"hard"
    
     reminder = new dict[str, Any]
    {
        ["student_id"] = studentId,
        ["tenant_id"] = tenantId,
        ["lesson_id"] = lessonId,
        ["scheduled_utc"] = scheduledTimestampUtc,
        ["escalation_policy"] = escalationPolicy,
        ["source_flow"] = "FLOW-24",  # CF-469: dedup key
        ["steps"] = new[] { "calendar_task", "push_notification", "two_minute_recap" }
    }
    return await _reminderQueue.EnqueueAsync(reminder)
}
# ❌ NEGATIVE
if (hour >= 22 || hour < 8) return;  # VIOLATION: hardcoded quiet hours (should be FREEDOM config)
await _googleFcm.SendNotification(...);  # VIOLATION: direct FCM SDK, not Queue Fabric
```

---

## SK-232: Multi-Tenant Quota Gate
**Domain:** Multi-Tenancy  
**AF-4 Retrieval Tags:** `multi-tenant`, `quota`, `noisy-neighbor`, `rate-limit`, `isolation`  
**Referenced By:** T367, T368, T372, T374 | F985  

**Pattern:** Tenant quota check before AI-heavy operations. Quota config in ES (FREEDOM). Noisy neighbor detection. Soft throttle for education flows (defer, not hard-fail students).

```python
# ✅ POSITIVE
async def ValidateAndConsumeQuotaAsync(self, 
    str tenantId, str operationType, int estimatedTokenCost)
{
    # Scope enforcement first (DNA-5)
     scopeResult = await _tenantGate.EnforceScopeAsync(tenantId, null)
    if (!scopeResult.IsSuccess) return DataProcessResult[bool].Fail("SCOPE_VIOLATION")
    # Quota from ES FREEDOM config — no literals
     quotaConfig = await _db.SearchDocumentsAsync<dict[str, Any]>(
        build_search_filter(new dict[str, Any] 
        { ["tenant_id"] = tenantId, ["config_type"] = "ai_quota" }))
     dailyBudget = (int)quotaConfig.Data["daily_ai_token_budget"]
     currentUsage = await _cache.GetAsync($"quota:{tenantId}:daily")
    int used = currentUsage != null ? int.Parse(currentUsage) : 0
    if (used + estimatedTokenCost > dailyBudget)
    {
        # Soft throttle — defer to off-peak, not hard-fail (CF-471)
        await _queue.EnqueueAsync(new dict[str, Any]
        {
            ["tenant_id"] = tenantId,
            ["operation"] = operationType,
            ["defer_reason"] = "QUOTA_SOFT_LIMIT",
            ["retry_after_utc"] = GetOffPeakSlot()
        })
        return DataProcessResult[bool].Success(false);  # deferred, not failed
    }
    
    await _cache.IncrementAsync($"quota:{tenantId}:daily", estimatedTokenCost)
    return DataProcessResult[bool].Success(true)
}
# ❌ NEGATIVE
if (tenantId == "premium-tenant-001") return true;  # VIOLATION: hardcoded tenant ID
# VIOLATION: no quota check before AI calls
```

---

## AF-4 RETRIEVAL INDEX — FLOW-24

| Query Pattern | Returns | Task Types |
|---------------|---------|------------|
| "knowledge map persistence" | SK-223 | T367, T371 |
| "minor consent blocking" | SK-224 | T367, T368, T369 |
| "lesson composer rag llm" | SK-225 | T368, T372, T374 |
| "curriculum graph prerequisites" | SK-226 | T367, T368, T371 |
| "difficulty adaptation adaptive" | SK-227 | T368, T371 |
| "gamification ledger append-only" | SK-228 | T369 |
| "streak timezone trust" | SK-229 | T369, T370 |
| "calendar sync fabric-first" | SK-230 | T368, T370, T373 |
| "reminder escalation quiet hours" | SK-231 | T368, T370 |
| "multi-tenant quota noisy-neighbor" | SK-232 | T367, T368, T372, T374 |

---

## BACKWARD COMPATIBILITY

All SK-1–SK-222 skills remain UNCHANGED.
FLOW-24 adds SK-223–SK-232 (10 new skills).

---

## SAVE POINT: FLOW24:SKILLS_FACTORY_RAG ✅
**Next skill after FLOW-24:** SK-233

---

# ═══════════════════════════════════════════════════════════════
# FLOW-25: Business Flow Arbiter — Skill Patterns
# SK-233–SK-250 (15 core + 3 integration)
# ═══════════════════════════════════════════════════════════════

## SKILL REGISTRY (SK-233 through SK-247)

---

### SK-233: ProposedChangeParserService
```
SKILL ID:     SK-233
NAME:         ProposedChangeParserService
LAYER:        L3 (Impact Extraction)
PURPOSE:      Parse raw change payloads into canonical ProposedChange documents (dict[str, Any])
FACTORY:      F1028:IProposedChangeParserService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

IMPLEMENTATION PROMPT:
  "Generate IProposedChangeParserService that:
   1. Accepts raw input as dict[str, Any] (NEVER typed ChangeRequest model — DNA-1)
   2. Detects diff_format from input (JSON_PATCH | SCHEMA_DIFF | FLOW_DAG_DIFF | CODE_AST)
   3. Normalizes to canonical ProposedChange document with fields:
      proposed_change_id (UUID v4), change_type, diff_format, diff_blob_ref (sha256 hash),
      actor, tenant_id, created_at
   4. Returns DataProcessResult[dict[str, Any]] (never throw — DNA-3)
   5. Extends MicroserviceBase (inherits 19 components — DNA-4)"

POSITIVE EXAMPLE:
  Input: { "op": "remove", "path": "/properties/billingAddress", "actor": "user-123", "tenant_id": "t-abc" }
  Output: DataProcessResult[Dictionary] { Success=true, Data={ "proposed_change_id": "uuid-v4",
           "change_type": "ENTITY_SCHEMA", "diff_format": "JSON_PATCH", "diff_blob_ref": "sha256:...",
           "actor": "user-123", "tenant_id": "t-abc", "created_at": "2026-02-27T..." } }

NEGATIVE EXAMPLE:
  ❌ class ProposedChange { str ChangeType  }  # typed model — violates DNA-1
  ❌ throw InvalidOperationException("Unknown diff format");  # violates DNA-3
  ❌ using JsonPatch.NetCore;  # direct provider import — always through fabric

AF-4 RETRIEVAL TAGS: [proposed-change, parser, diff-format, entity-schema, flow-dag-diff]
CROSS-REFS: F1028, T375, DR-175, DNA-1, DNA-3
```

---

### SK-234: DependencyIndexService
```
SKILL ID:     SK-234
NAME:         DependencyIndexService
LAYER:        L3 (Impact Extraction)
PURPOSE:      Write and query the bfa_dependency_index: flow↔entity and flow↔API dependency records
FACTORY:      F1031:IFlowDependencyIndexWriterService, F1035:IDependencyIndexQueryService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

IMPLEMENTATION PROMPT:
  "Generate IDependencyIndexQueryService that:
   1. Queries bfa_dependency_index using build_search_filter (DNA-2: empty fields auto-skipped)
   2. ALWAYS includes tenantId in filter — DNA-5 Scope Isolation enforced
   3. Returns List<dict[str, Any]> of matching dependency records
   4. Returns DataProcessResult[T] (never throw — DNA-3)
   Generate IFlowDependencyIndexWriterService that:
   1. Writes dependency record: {flow_id, entity_name, access_type, field_paths, tenant_id, updated_at}
   2. Upserts on (flow_id, entity_name, tenant_id) composite key
   3. Called after every flow publication to keep index current"

POSITIVE EXAMPLE:
  Query: build_search_filter({ entity_name: "UserProfile", access_type: "DELETE", tenant_id: "t-abc" })
  → Skips empty fields automatically
  → Returns flows that DELETE UserProfile for tenant t-abc

NEGATIVE EXAMPLE:
  ❌  results = esClient.Search<FlowDependency>(...);  # direct ES import — use DATABASE FABRIC
  ❌ if (tenantId == null) { query all; }  # violates DNA-5

AF-4 RETRIEVAL TAGS: [dependency-index, flow-entity, blast-radius, scope-isolation, build_search_filter]
CROSS-REFS: F1031, F1035, T376, DR-172, DNA-2, DNA-5
```

---

### SK-235: StaticConflictDetector
```
SKILL ID:     SK-235
NAME:         StaticConflictDetector
LAYER:        L4 (Conflict Detection)
PURPOSE:      Deterministic CF rule application against extracted entity references and blast radius.
              100% repeatable. No AI. Returns TRUE_CONFLICT | ADDITIVE_ONLY | NO_CONFLICT per candidate.
FACTORY:      F1036:IStaticConflictRulesEngineService, F1032:ISchemaDiffClassifierService, F1033:IStateTransitionAnalyzerService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

IMPLEMENTATION PROMPT:
  "Generate IStaticConflictRulesEngineService that:
   1. Reads CF rules from bfa_rules_index as List<dict[str, Any]> (parse_document — DNA-1)
   2. For each blast radius candidate, applies all matching CF rules
   3. Returns conflict classification: TRUE_CONFLICT (with rule_id) | ADDITIVE_ONLY | NO_CONFLICT
   4. Generates ISchemaDiffClassifierService:
      - required field removal → BREAKING
      - type change → BREAKING
      - new optional field → ADDITIVE
      - constraint tightening → BREAKING
   5. All returns DataProcessResult[T] — no throws (DNA-3)"

POSITIVE EXAMPLE:
  Rule CF-477 fires on: entity_change_type=ENTITY_SCHEMA AND field_change=field_removal AND field_was_required=true
  → classification: TRUE_CONFLICT, severity: CRITICAL, rule_id: "CF-477"

NEGATIVE EXAMPLE:
  ❌ if (change.FieldName == "billingAddress") → hardcoded entity name (use CF rule config from index)
  ❌ throw ConflictException("...");  # violates DNA-3

AF-4 RETRIEVAL TAGS: [static-conflict, CF-rules, schema-diff, breaking-change, deterministic]
CROSS-REFS: F1032, F1033, F1036, T377, DR-173
```

---

### SK-236: SemanticImpactAnalyzer
```
SKILL ID:     SK-236
NAME:         SemanticImpactAnalyzer
LAYER:        L4 (Conflict Detection — AI-Powered)
PURPOSE:      AI-powered semantic conflict analysis via AiDispatcher. Parallel multi-model.
              Output constrained to ImpactReport JSON schema. Advisory only.
FACTORY:      F1039:ISemanticConflictAnalyzerService, F1040:ISemanticOutputValidatorService
FABRIC:       AI ENGINE FABRIC (SK-386 (AiDispatcher) → AiDispatcher)

IMPLEMENTATION PROMPT:
  "Generate ISemanticConflictAnalyzerService that:
   1. Calls AiDispatcher.GenerateAsync() — NEVER calls claude.chat() or openai.chat() directly
   2. System prompt: 'You are a Business Logic Arbiter. Analyze the proposed change against
      the provided context. Detect logical collisions, broken dependencies, invalid state changes.
      Respond ONLY with valid ImpactReport JSON. Include evidence_links[] for any HIGH/CRITICAL finding.'
   3. Passes context bundle as document input (flow defs + schema + docs)
   4. Validates output against ImpactReport JSON schema via F1040
   5. Returns DataProcessResult[dict[str, Any]] — AI result as parsed dict
   Generate ISemanticOutputValidatorService that:
   1. Validates AI JSON output against ImpactReport schema (severity, impacted_flows[], evidence_links[])
   2. Rejects if schema invalid → returns DataProcessResult with failure (triggers AI retry)
   3. Maximum 2 retries before returning LOW severity advisory result"

POSITIVE EXAMPLE:
  AiDispatcher runs Claude+OpenAI+Gemini in parallel.
  2/3 models return: { severity: 'HIGH', impacted_flows: [...], evidence_links: ['flow-id-123'] }
  → consensus HIGH with evidence → accepted

NEGATIVE EXAMPLE:
  ❌  resp = await openAiClient.ChatAsync(...);  # direct provider — always use AI ENGINE FABRIC
  ❌ Accepting AI output without schema validation — IR-378-1 violation
  ❌ Using AI CRITICAL finding without evidence_links — CF-481 violation

AF-4 RETRIEVAL TAGS: [semantic-analysis, AI-dispatcher, multi-model, impact-report, advisory]
CROSS-REFS: F1039, F1040, T378, DR-173, CF-480, CF-481, CF-482
```

---

### SK-237: SeverityClassifier
```
SKILL ID:     SK-237
NAME:         SeverityClassifier
LAYER:        L4 (Conflict Detection)
PURPOSE:      Aggregate static + AI results into composite severity: CRITICAL|HIGH|MEDIUM|LOW|NONE
FACTORY:      F1041:ISeverityAggregatorService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch — severity rules config)

IMPLEMENTATION PROMPT:
  "Generate ISeverityAggregatorService that:
   1. Reads severity escalation rules from ES (FREEDOM config — never hardcoded)
   2. Composite rules:
      - any static CRITICAL → composite CRITICAL (regardless of AI)
      - no static conflict + AI CRITICAL with evidence → composite HIGH (advisory promotion cap)
      - all NONE (static) + all NONE (AI) → composite NONE (fast path to publish)
   3. Returns DataProcessResult[str] with composite severity value"

POSITIVE EXAMPLE:
  Static: TRUE_CONFLICT, rule CF-477, severity CRITICAL
  AI: HIGH with evidence
  → composite: CRITICAL (static CRITICAL takes precedence — DR-173)

NEGATIVE EXAMPLE:
  ❌ if (aiResult.Severity == "CRITICAL") → block publish  # AI alone cannot block — IR-378-2
  ❌ Hardcoding severity thresholds in service code # must read from FREEDOM config

AF-4 RETRIEVAL TAGS: [severity, aggregation, static-first, AI-advisory, composite-severity]
CROSS-REFS: F1041, T379, DR-173, IR-377-2, IR-378-2
```

---

### SK-238: BlastRadiusCalculator
```
SKILL ID:     SK-238
NAME:         BlastRadiusCalculator
LAYER:        L4 (Conflict Detection)
PURPOSE:      Transitive dependency traversal: direct + N-hop impacts. BFS traversal with visited set.
FACTORY:      F1037:IBlastRadiusCalculatorService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

IMPLEMENTATION PROMPT:
  "Generate IBlastRadiusCalculatorService that:
   1. BFS traversal of bfa_dependency_index from initial entity references
   2. Tracks visited set to prevent infinite loops (circular dependency handling — DNA-3 not throw)
   3. Max depth read from FREEDOM config (default: 3 hops)
   4. Returns dict[str, Any]:
      { direct_impacts: [...], transitive_impacts: [...], total_unique_flows: N,
        max_hop_reached: 2, circular_dependency_detected: false }"

POSITIVE EXAMPLE:
  UserProfile deleted → direct: [checkout-flow, subscription-flow]
  checkout-flow also used by → [marketplace-flow]
  → transitive: [marketplace-flow]
  → total_unique_flows: 3

NEGATIVE EXAMPLE:
  ❌ Recursive depth-first without visited set → StackOverflow on circular deps
  ❌ Max depth hardcoded as 3 → must read from FREEDOM config

AF-4 RETRIEVAL TAGS: [blast-radius, transitive, BFS, circular-dependency, dependency-graph]
CROSS-REFS: F1037, T380, DR-177
```

---

### SK-239: ArbitrationStateMachine
```
SKILL ID:     SK-239
NAME:         ArbitrationStateMachine
LAYER:        L5 (Arbitration)
PURPOSE:      8-state durable state machine for BFA arbitration lifecycle. Persist-before-emit (DNA-8).
FACTORY:      F1043:IArbitrationStateMachineService, F1044:IArbitrationSessionPersistenceService
FABRIC:       QUEUE FABRIC (SK-383 (RedisStreamQueue) → Redis Streams), DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → PostgreSQL)

IMPLEMENTATION PROMPT:
  "Generate IArbitrationStateMachineService that:
   1. Implements persist-before-emit: write state to PG BEFORE emitting queue event (DNA-8)
   2. Valid states: idle|extracting|detecting|severity_aggregating|pending_resolution|
      skip_arbitration|applying_resolution|resolved|rejected|error
   3. Invalid state transitions return DataProcessResult failure (never throw — DNA-3)
   4. All state documents as dict[str, Any] (DNA-1)
   5. Idempotent transitions: same event received twice = no-op (DNA-7)
   Generate IArbitrationSessionPersistenceService:
   1. Stores session: {session_id, current_state, proposed_change_id, conflict_report_id,
      tenant_id, created_at, updated_at}
   2. Rehydration from PG in < 60s (resumability requirement)"

POSITIVE EXAMPLE:
  EXTRACTING → DETECTING:
  1. Write session state=DETECTING to PG [persist]
  2. Emit bfa.extracting.completed to Redis Streams [emit]
  3. Return DataProcessResult[T] Success=true

NEGATIVE EXAMPLE:
  ❌ Emit event THEN write to PG → loses state if PG write fails after emit
  ❌ throw InvalidStateException("Can't transition") → violates DNA-3

AF-4 RETRIEVAL TAGS: [state-machine, persist-before-emit, arbitration, durable, resumable, DNA-8]
CROSS-REFS: F1043, F1044, T381, DR-174, DNA-7, DNA-8
```

---

### SK-240: ImpactReportGenerator
```
SKILL ID:     SK-240
NAME:         ImpactReportGenerator
LAYER:        L5 (Arbitration — Human-in-Loop)
PURPOSE:      Generate human-readable structured impact report from ConflictReport.
              Fabric-first: template-driven, no hardcoded channel values.
FACTORY:      F1057:IImpactReportRendererService, F1058:IDecisionOptionBuilderService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch — impact report templates)

IMPLEMENTATION PROMPT:
  "Generate IImpactReportRendererService that:
   1. Reads report template from ES (FREEDOM: different templates per channel — Web/CLI/Chat)
   2. Populates template with: severity_badge, impacted_flows[] with descriptions,
      blast_radius_summary, evidence_links[], 4 decision options
   3. FORCE_PROCEED option only in output if actor has bfa:override permission
   4. Returns rendered report as dict[str, Any] (DNA-1)
   5. Template variables bound at render time — zero hardcoded platform values (fabric-first UI)"

POSITIVE EXAMPLE:
  Web template renders: { severity: '🚨 CRITICAL', impacted: ['checkout-flow', 'sub-flow'],
    options: [{ id: 'REFACTOR_FLOWS', label: 'Auto-refactor affected flows', ... }, ...] }
  CLI template renders: plain text version of same structure

NEGATIVE EXAMPLE:
  ❌ if (channel == "web") { return "<div>..." }  # hardcoded platform value
  ❌ Always show FORCE_PROCEED option # must check actor permission first (IR-382-2)

AF-4 RETRIEVAL TAGS: [impact-report, template, DynamicController, channel-agnostic, FORCE_PROCEED]
CROSS-REFS: F1057, F1058, T382, DR-176, DR-179
```

---

### SK-241: ResolutionApplier
```
SKILL ID:     SK-241
NAME:         ResolutionApplier
LAYER:        L5 (Arbitration)
PURPOSE:      Apply user decision: REFACTOR_FLOWS | REJECT_CHANGE | COMPAT_MODE | FORCE_PROCEED
FACTORY:      F1047:IResolutionApplierService, F1061:IAutoRefactorCoordinatorService, F1062:ICompatibilityWrapperService
FABRIC:       FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)), DATABASE FABRIC (SK-382 (ElasticsearchDatabase))

IMPLEMENTATION PROMPT:
  "Generate IResolutionApplierService that dispatches to correct resolution path:
   REJECT_CHANGE: mark proposed_change as rejected in PG (F1034). Emit rejection event.
   REFACTOR_FLOWS: call F1061.CoordinateRefactorAsync(affected_flows). Handle partial failure gracefully.
   COMPAT_MODE: call F1062.RegisterWrapperAsync(entity, field, sunset_date).
   FORCE_PROCEED: validate bfa:override permission. Write to F1070 override_log FIRST.
                  Then emit publish.approved event.
   All paths: DataProcessResult[T] (DNA-3). Scope Isolation (DNA-5)."

POSITIVE EXAMPLE:
  Decision = FORCE_PROCEED:
  1. Validate bfa:override permission ✓
  2. Write override_log { actor, rationale, session_id, ... } to PG (F1070)
  3. Emit publish.approved event
  → DataProcessResult Success=true

NEGATIVE EXAMPLE:
  ❌ Emit publish.approved THEN write override_log → IR-384-1 violation (log must precede publish)
  ❌ Ignoring partial refactor failure → IR-384-3 violation (must handle partial success)

AF-4 RETRIEVAL TAGS: [resolution, FORCE_PROCEED, REFACTOR_FLOWS, COMPAT_MODE, override-log]
CROSS-REFS: F1047, F1061, F1062, T384, DR-175, DR-176, IR-384-1
```

---

### SK-242: BFAAuditTrailService
```
SKILL ID:     SK-242
NAME:         BFAAuditTrailService
LAYER:        L6 (Governance)
PURPOSE:      Write immutable audit records for all BFA decisions. Per-field audit logging (DNA-9).
FACTORY:      F1067:IBFATenantAuditTrailService, F1070:IForceOverrideTrackerService
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → PostgreSQL)

IMPLEMENTATION PROMPT:
  "Generate IBFATenantAuditTrailService that:
   1. Writes INSERT-only to bfa_tenant_audit_log (never UPDATE/DELETE — DR-175)
   2. Record: {session_id, tenant_id, decision, actor, timestamp, rationale, affected_flows[], change_type}
   3. Per-field audit logging (DNA-9): log each field change as separate audit_field entry
   4. GDPR retention: retention_days read from FREEDOM config (F1065 tenant config)
   5. Returns DataProcessResult[str] with audit_record_id"

POSITIVE EXAMPLE:
  audit_record: { record_id: 'uuid', session_id: 's-123', tenant_id: 't-abc',
    decision: 'FORCE_PROCEED', actor: 'admin@co.com', rationale: 'Approved by CTO...',
    timestamp: '2026-02-27T...', affected_flows: ['checkout', 'subscription'] }

NEGATIVE EXAMPLE:
  ❌ UPDATE bfa_audit_log SET decision = 'REJECT' WHERE session_id = ...  # immutable — DR-175
  ❌ Storing rationale only on FORCE_PROCEED # must log rationale for all decisions

AF-4 RETRIEVAL TAGS: [audit-trail, immutable, INSERT-only, FORCE_PROCEED, DNA-9, GDPR]
CROSS-REFS: F1067, F1070, T385, DR-175, DR-180, DNA-9
```

---

### SK-243: BFAContextAggregator
```
SKILL ID:     SK-243
NAME:         BFAContextAggregator
LAYER:        L5 (Context Aggregation)
PURPOSE:      Hybrid context gathering: dependency index query + vector RAG search.
              Cache-backed (Redis, TTL: 1h). Powers AI semantic analysis (SK-236).
FACTORY:      F1050-F1055 (full context aggregation family)
FABRIC:       DATABASE FABRIC (ES+PG), RAG FABRIC (SK-389 (HybridRagStrategy)), CORE FABRIC (SK-379 (MicroserviceBase) — cache)

IMPLEMENTATION PROMPT:
  "Generate IBFAContextBundlerService that:
   1. Checks cache (F1055): key = sha256(change_id + entity_refs_sorted)
   2. On cache miss:
      a. F1050 → retrieve impacted flow definitions from flow_registry
      b. F1051 → retrieve entity schema versions (current + N-1)
      c. F1052 → vector search for semantically related docs (RAG HYBRID strategy)
      d. F1053 → retrieve relevant DR/DD entries (RAG TIERED strategy)
   3. Assembles context bundle: {flows[], schemas[], semantic_docs[], design_records[]}
   4. Writes bundle to cache (F1055, TTL: 3600s)
   5. Returns DataProcessResult[dict[str, Any]]"

POSITIVE EXAMPLE:
  change_id=c-123, entities=[UserProfile]
  Cache miss → fetch 3 flows, 2 schema versions, 5 semantic docs, 2 DRs
  → context_bundle assembled → cached → returned

NEGATIVE EXAMPLE:
  ❌ Returning cached bundle when flow_registry was updated since cache write
     → must invalidate cache on flow.published event (DR-177)
  ❌ Context bundle with 0 flows for CRITICAL change → CF-482 violation

AF-4 RETRIEVAL TAGS: [context-aggregation, RAG, cache, vector-search, context-bundle]
CROSS-REFS: F1050, F1051, F1052, F1053, F1054, F1055, T378, DR-177
```

---

### SK-244: BFAMultiTenantGuard
```
SKILL ID:     SK-244
NAME:         BFAMultiTenantGuard
LAYER:        L7 (Multi-Tenant)
PURPOSE:      Tenant-scoped BFA operations. Provision, validate, isolate. Inherits FLOW-08+FLOW-14 MT.
FACTORY:      F1063-F1068 (BFA MT Extension family)
FABRIC:       DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → ES + PG)

IMPLEMENTATION PROMPT:
  "Generate IBFATenantIsolationValidatorService that:
   1. Scans recent BFA query audit log for any query missing tenantId filter
   2. Runs every 15m (configurable via FREEDOM config)
   3. On violation: DataProcessResult with violation details + emit CRITICAL alert event
   Generate IBFATenantProvisionService that:
   1. Creates bfa_tenant_config record: {tenant_id, bfa_enabled, severity_threshold,
      resolution_channel, precedent_enabled, retention_days}
   2. BFA MUST NOT process arbitration for unconfigured tenant (IR-386-1)
   3. Inherits FLOW-08 MT provisioning pattern"

POSITIVE EXAMPLE:
  Provision: { tenant_id: 't-new', bfa_enabled: true, severity_threshold: 'HIGH',
    resolution_channel: 'web', precedent_enabled: false, retention_days: 365 }
  → BFA active for tenant t-new

NEGATIVE EXAMPLE:
  ❌ Processing arbitration for tenant with no bfa_tenant_config → IR-386-1 violation
  ❌ Isolation validator query scanning without tenantId scope on scan itself → meta-irony violation

AF-4 RETRIEVAL TAGS: [multi-tenant, tenant-isolation, BFA-provision, scope-isolation, DNA-5]
CROSS-REFS: F1063, F1064, F1065, F1066, F1067, F1068, T386, DR-178
```

---

### SK-245: BFAAnalyticsEmitter
```
SKILL ID:     SK-245
NAME:         BFAAnalyticsEmitter
LAYER:        L7 (Analytics)
PURPOSE:      Post-session analytics: tenant metrics, platform aggregates, pattern learning, telemetry.
FACTORY:      F1068, F1069, F1072, F1073
FABRIC:       DATABASE FABRIC (ES), RAG FABRIC (SK-389 (HybridRagStrategy)), QUEUE FABRIC (SK-383 (RedisStreamQueue))

IMPLEMENTATION PROMPT:
  "Generate analytics emission services that:
   1. IBFATenantMetricsService: writes to bfa_tenant_metrics ES index with tenantId (DNA-5)
   2. IBFAPlatformMetricsService: writes ONLY aggregated stats (no per-tenant data)
   3. IBFAPatternLearningService: indexes { change_type, entity_class, conflict_type, resolution, outcome }
      to RAG vector index (tenant-scoped)
   4. IBFAOpenTelemetryService: emits span bfa.session.closed with duration + final state
   All: async fire-and-forget acceptable (IR-388-1). DataProcessResult[T] (DNA-3)."

AF-4 RETRIEVAL TAGS: [analytics, telemetry, pattern-learning, metrics, OpenTelemetry]
CROSS-REFS: F1068, F1069, F1072, F1073, T388, DR-181
```

---

### SK-246: BFANotificationService
```
SKILL ID:     SK-246
NAME:         BFANotificationService
LAYER:        L5 (Human-in-Loop)
PURPOSE:      Route impact report to user's channel (Web/CLI/Chat/Webhook). Async notification.
              Channel determined by FREEDOM config per tenant.
FACTORY:      F1045:IHumanResolutionRouterService, F1060:IResolutionNotificationService
FABRIC:       QUEUE FABRIC (SK-383 (RedisStreamQueue) → Redis Streams)

IMPLEMENTATION PROMPT:
  "Generate IHumanResolutionRouterService that:
   1. Reads resolution_channel from bfa_tenant_config (FREEDOM — never hardcoded)
   2. Routes to: WEB (SSE/WebSocket event) | CLI (console stream) | CHAT (messaging fabric)
      | WEBHOOK (HTTP POST via F1060)
   3. Never blocks arbitration thread — async enqueue to QUEUE FABRIC (DNA-3, no throw)
   Generate IResolutionNotificationService:
   1. Notifies: change proposer, impacted flow owners, tenant admin
   2. Includes: outcome, decision, audit_record_id, affected_flows[]
   3. Uses QUEUE FABRIC for delivery (Redis Streams)"

AF-4 RETRIEVAL TAGS: [notification, channel-routing, async, human-in-loop, web-cli-chat]
CROSS-REFS: F1045, F1060, T382, DR-178
```

---

### SK-247: BFADecisionCaptureService
```
SKILL ID:     SK-247
NAME:         BFADecisionCaptureService
LAYER:        L5 (Human-in-Loop)
PURPOSE:      Idempotent decision capture. Validates decision schema. FORCE_PROCEED permission check.
FACTORY:      F1059:IDecisionCaptureService, F1046:IUserDecisionReceiverService
FABRIC:       QUEUE FABRIC (SK-383 (RedisStreamQueue) → Redis Streams)

IMPLEMENTATION PROMPT:
  "Generate IDecisionCaptureService that:
   1. SETNX on session_id (Redis) — prevents duplicate processing (DNA-7)
   2. Validates decision ∈ {REFACTOR_FLOWS, REJECT_CHANGE, COMPAT_MODE, FORCE_PROCEED}
   3. If FORCE_PROCEED: validate bfa:override permission (auth context from MicroserviceBase)
   4. If FORCE_PROCEED: validate rationale ≥ FREEDOM config min_length (default: 50 chars)
   5. Emits bfa.decision.captured to QUEUE FABRIC on success
   6. Returns DataProcessResult failure (not throw) on invalid decision or missing permission"

POSITIVE EXAMPLE:
  Session s-123 received REFACTOR_FLOWS from actor user-456:
  SETNX "decision:s-123" → success (first capture)
  Validate: REFACTOR_FLOWS ∈ valid set ✓
  Emit: bfa.decision.captured → success

NEGATIVE EXAMPLE:
  ❌ Second call with same session_id → SETNX fails → return DataProcessResult Success=true
     with existing decision (idempotent — not error) (DNA-7)
  ❌ FORCE_PROCEED with 30-char rationale → DataProcessResult failure (IR-383-2)

AF-4 RETRIEVAL TAGS: [decision-capture, idempotency, SETNX, FORCE_PROCEED, permission-check, DNA-7]
CROSS-REFS: F1046, F1059, T383, DR-176, DNA-7, IR-383-1, IR-383-2, IR-383-3
```

---

## AF-4 RAG RETRIEVAL INDEX (FLOW-22 SKILLS)

| Search Query | Top Skills | Key Factories |
|---|---|---|
| "parse proposed change entity schema diff" | SK-233, SK-235 | F1028, F1032 |
| "dependency index flow entity relationship" | SK-234, SK-238 | F1031, F1035, F1037 |
| "conflict detection static rules CF" | SK-235, SK-237 | F1036, F1038, F1041 |
| "semantic AI impact analysis multi-model" | SK-236, SK-243 | F1039, F1052, F1054 |
| "severity classification aggregation" | SK-237 | F1041, F1042 |
| "blast radius transitive dependency graph" | SK-238 | F1037 |
| "arbitration state machine persist-before-emit" | SK-239 | F1043, F1044 |
| "impact report human-readable template" | SK-240, SK-246 | F1057, F1058, F1045 |
| "resolution FORCE_PROCEED compat refactor" | SK-241 | F1047, F1061, F1062 |
| "audit trail immutable decision record" | SK-242 | F1067, F1070 |
| "context bundle RAG vector hybrid" | SK-243 | F1050, F1051, F1052, F1053 |
| "multi-tenant BFA isolation tenant-scoped" | SK-244 | F1063, F1064, F1065, F1066 |
| "analytics metrics pattern learning telemetry" | SK-245 | F1068, F1069, F1072, F1073 |
| "notification channel routing web CLI chat" | SK-246 | F1045, F1060 |
| "decision capture idempotency SETNX session" | SK-247 | F1046, F1059 |

---

## SKILL DEPENDENCY MAP (FLOW-22 — Reading Order for AF-4)

```
Extraction Layer:
  SK-233 (ParseChange) → SK-234 (DependencyIndex) → SK-238 (BlastRadius)

Detection Layer:
  SK-235 (StaticConflict) + SK-236 (SemanticAI) → SK-237 (SeverityClassifier)
  SK-243 (ContextAggregator) feeds SK-236

Arbitration Layer:
  SK-239 (StateMachine) orchestrates all
  SK-240 (ImpactReport) → SK-246 (Notification) → SK-247 (DecisionCapture)
  SK-241 (ResolutionApplier) executes decision
  SK-242 (AuditTrail) closes every session

Governance Layer:
  SK-244 (MTGuard) enforces tenant isolation throughout
  SK-245 (Analytics) emits post-session metrics
```

---

## SAVE POINT: FLOW22:SKILLS:COMPLETE ✅
## Next: V62_BFA_STRESS_TEST (CF-473–CF-501, ST-270–ST-291)


## INTEGRATION SKILLS (SK-248 through SK-250)

### SK-248: BFAVisualEditorGovernance
SKILL ID:     SK-248
PURPOSE:      Governance bridge between FLOW-22/23 Visual Editor and BFA arbitration
FACTORY:      F1057 (IImpactReportRendererService) + F1029 (IEntityReferenceExtractorService)
FABRIC:       DATABASE FABRIC (ES — component schema index) + AI ENGINE FABRIC (semantic diff)
REUSE:        Extends SK-233 (ProposedChangeParser) with visual-editor-specific entity extraction
PATTERN:      Extract component schema diff → Build impact report → Route to BFA pipeline
POSITIVE:     Component field addition detected, blast radius calculated across published pages
NEGATIVE:     Skip visual editor changes — BFA must govern ALL entity modifications equally

### SK-249: BFAMinorSafetyGuard
SKILL ID:     SK-249
PURPOSE:      Enforce FORCE_PROCEED block for FLOW-24 School Pack entities with minor safety
FACTORY:      F1036 (IStaticConflictRulesEngineService) + F1041 (ISeverityAggregatorService)
FABRIC:       DATABASE FABRIC (PG — consent records) + QUEUE FABRIC (audit events)
REUSE:        Extends SK-237 (SeverityClassifier) with minor-safety-specific rules
PATTERN:      Check entity domain pack → If School Pack → Block FORCE_PROCEED → Limit to REFACTOR/REJECT
POSITIVE:     School Pack entity change → FORCE_PROCEED removed from resolution menu
NEGATIVE:     Allow FORCE_PROCEED for minor-safety entities — this is a MACHINE constraint, non-configurable

### SK-250: BFAUserFlowGate
SKILL ID:     SK-250
PURPOSE:      Gate for user-created flows (FLOW-18) requiring BFA validation before activation
FACTORY:      F1028 (IProposedChangeParserService) + F1031 (IFlowDependencyIndexWriterService)
FABRIC:       DATABASE FABRIC (ES — flow definition index) + QUEUE FABRIC (activation events)
REUSE:        Extends SK-233 (ProposedChangeParser) with flow-definition-specific parsing
PATTERN:      User saves flow → Extract entity references → Route through full BFA pipeline → Gate activation
POSITIVE:     User flow referencing payment entities → BFA flags CRITICAL, blocks activation until resolved
NEGATIVE:     Skip BFA for user-created flows — ALL flows must be governed equally regardless of origin


# XIIGen SKILLS FACTORY & RAG INDEX — FLOW-26 ADDENDUM
# Self-Developing Meta-Flow: Skill Patterns
## FLOW-26 ONLY | SK-251–SK-266 (16 new skills)
## Date: 2026-02-27

---

## SAVE POINT: SK238_DEFINED ✅

---

## REUSE ANALYSIS (FLOW-26)

### Existing Assets → FLOW-26 Needs

| FLOW-26 Need | Existing Asset | Action |
|---|---|---|
| Intent parsing via AI | IAiProvider + AiDispatcher (SK-386 (AiDispatcher)) | ✅ REUSE (AI ENGINE FABRIC) |
| Capability registry (ES read/write) | IDatabaseService → Elasticsearch (SK-382 (ElasticsearchDatabase)) | ✅ REUSE (DATABASE FABRIC) |
| Distributed locking | IDatabaseService → Redis (SK-382 (ElasticsearchDatabase)) | ✅ REUSE (DATABASE FABRIC pattern) |
| Event publishing (all phases) | IQueueService → Redis Streams (SK-383 (RedisStreamQueue)) | ✅ REUSE (QUEUE FABRIC) |
| Semantic reuse scan | IRagService (SK-388/SK-389 (IRagService/HybridRag)) | ✅ REUSE (RAG FABRIC) |
| Service inheritance base | MicroserviceBase (SK-379 (MicroserviceBase)) | ✅ REUSE (CORE FABRIC) |
| Flow DAG orchestration | FlowOrchestrator (SK-392 (RagStrategyRegistry)) | ✅ REUSE (FLOW ENGINE FABRIC) |
| Multi-model code generation | AiDispatcher (SK-386 (AiDispatcher)) | ✅ REUSE — applied to genesis |
| Git/CI operations | FLOW-19 F697-F733 patterns | ✅ ADAPT (EXECUTION FABRIC) |
| Sandbox/container orchestration | FLOW-19 container patterns | ✅ ADAPT (CORE FABRIC infra) |
| Gap detection (new) | — | 🆕 SK-251 |
| Contract-first generation (new) | — | 🆕 SK-252 |
| Genesis loop with retries (new) | — | 🆕 SK-253 |
| Deterministic test harness (new) | — | 🆕 SK-254 |
| Evidence bundle assembly (new) | — | 🆕 SK-255 |
| GitOps assimilation (new) | — | 🆕 SK-256 |
| Promotion ladder governance (new) | — | 🆕 SK-257 |
| Human approval gate (new) | — | 🆕 SK-258 |
| SelfBuildRun state machine (new) | — | 🆕 SK-259 |
| Reuse decision matrix (new) | — | 🆕 SK-260 |
| Failure signature extraction (new) | — | 🆕 SK-261 |
| Capability hot-reload pattern (new) | — | 🆕 SK-262 |
| Meta-flow BFA pack generation (new) | — | 🆕 SK-263 |
| Sandbox teardown finally pattern (new) | — | 🆕 SK-264 |
| Multi-tenant SelfBuild isolation (new) | — | 🆕 SK-265 |
| Recursive sub-flow generation (new) | — | 🆕 SK-266 |

---

## AF-4 RAG RETRIEVAL INDEX (FLOW-26)

| Query Term | Skill(s) Returned |
|---|---|
| gap detection capability registry | SK-251 |
| contract-first factory interface generation | SK-252 |
| genesis loop retry bounded | SK-253 |
| deterministic test harness external call | SK-254 |
| evidence bundle assembly proof | SK-255 |
| gitops commit PR CI assimilation | SK-256 |
| promotion ladder GENERATED CORE | SK-257 |
| human approval gate CORE promotion | SK-258 |
| SelfBuildRun state machine phases | SK-259 |
| reuse decision COPY ADAPT REWRITE | SK-260 |
| failure signature extraction logs | SK-261 |
| capability hot-reload registry | SK-262 |
| BFA pack meta-flow generation | SK-263 |
| sandbox teardown finally cleanup | SK-264 |
| multi-tenant SelfBuild isolation | SK-265 |
| recursive sub-flow generation nested | SK-266 |

---

## SKILL PATTERNS (SK-251 TO SK-266)

---

### SK-251 — Gap Detection Pattern

**ID:** SK-251
**Name:** CapabilityGapDetector
**Archetype:** INVENTORY
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (Elasticsearch capability index) + AI ENGINE FABRIC (intent parsing)
**Factories Used:** F1075 ICapabilityGapDetectorService, F1076 ICapabilityRegistryService, F1077 IFlowPlannerService

**When AF-4 returns this:** Query requests gap detection, capability planning, or "what's missing" analysis against an intent description.

**Pattern:**

```
1. Parse intent via AI ENGINE FABRIC → extract required capability signatures
2. Load capability registry via DATABASE FABRIC → build_search_filter with tenantId + capabilityType
3. Diff: required signatures vs registered capabilities → gaps[]
4. For each gap: classify as MISSING_FACTORY | MISSING_OPERATION | MISSING_PROVIDER
5. Emit CapabilityGapDetected event via QUEUE FABRIC
6. Return DataProcessResult[GapDetectionResult] — never throw
```

**MACHINE (fixed):** Gap classification logic, capability signature format, event schema.
**FREEDOM (configurable):** AI model for intent parsing, registry index name, gap threshold.
**DNA Compliance:** parse_document (no typed Gap model), build_search_filter (skip empty fields), DataProcessResult[T], MicroserviceBase, tenantId scope, DynamicController.

**Positive Example:**
```
Input: intent = "text → video generation with OpenAI"
Registry: ITextAnalysisService ✅, IVideoGenerationService ❌
Output: gaps = [{ type: MISSING_FACTORY, interface: "IVideoGenerationService", fabric: "AI_ENGINE" }]
Event: CapabilityGapDetected published to QUEUE FABRIC
```

**Negative Example (FORBIDDEN):**
```python
# WRONG: Direct provider check
if (!_openAiClient.HasVideoModel()) { ... }
# WRONG: Typed gap model
 gap = new CapabilityGap { Interface = "IVideoGenerationService" }
# WRONG: Direct DB import
 conn = ElasticsearchClient(...)
```

---

### SK-252 — Contract-First Generation Pattern

**ID:** SK-252
**Name:** ContractFirstArtifactGenerator
**Archetype:** SYNTHESIS
**Flow:** FLOW-26
**Fabric:** AI ENGINE FABRIC (multi-model generation) + DATABASE FABRIC (contract storage)
**Factories Used:** F1082 IContractGeneratorService, F1083 IFactorySpecGeneratorService, F1084 ITaskTypeContractService

**When AF-4 returns this:** Need to generate factory interface spec, task type contract, fabric resolution mapping, or event schema from a detected gap.

**Pattern:**

```
1. Load gap payload from QUEUE FABRIC (DequeueAsync)
2. AF-2 Planning: decompose gap into contract artifacts needed
3. AF-4 RAG: search existing factory patterns (similarity to existing Fx families)
4. AF-1 Genesis (contract mode): emit factory spec JSON + task type contract JSON
5. Validate: contract completeness gate (all required fields present)
6. Store artifacts via DATABASE FABRIC → Elasticsearch contract-drafts index
7. Register event schemas via F1085 IEventSchemaRegistryService
8. Emit ContractDrafted event via QUEUE FABRIC
```

**MACHINE (fixed):** Contract schema format (must match TASK_TYPES_CATALOG format exactly), fabric resolution mapping structure.
**FREEDOM (configurable):** AI model selection, consensus threshold, template selection.
**DNA Compliance:** All artifacts stored as dict[str, Any], build_search_filter, DataProcessResult[T], MicroserviceBase, tenantId on every write.

**Positive Example:**
```
Gap: MISSING_FACTORY: IVideoGenerationService (AI_ENGINE)
Output contract:
{
  "factoryId": "F1102+", "interface": "IVideoGenerationService",
  "fabricResolution": "AI_ENGINE_FABRIC → AiDispatcher (SK-386 (AiDispatcher))",
  "operations": ["GenerateVideoAsync"],
  "taskTypeRef": "T411+",
  "eventSchemas": ["VideoGenerationRequested", "VideoGenerationCompleted"]
}
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Skip fabric resolution mapping
{ "factoryId": "F1102", "interface": "IVideoGenerationService" }
# WRONG: One-line stub instead of full engine contract format
T411: VideoGeneration — generates video
```

---

### SK-253 — Genesis Loop with Retries Pattern

**ID:** SK-253
**Name:** BoundedGenesisLoop
**Archetype:** SYNTHESIS + JUDGMENT
**Flow:** FLOW-26
**Fabric:** AI ENGINE FABRIC (generation + review + judge) + QUEUE FABRIC (events) + DATABASE FABRIC (code bundle storage)
**Factories Used:** F1088 IGenesisLoopService, F1089 ICodeBundleValidatorService, F1090 ITestBundleGeneratorService

**When AF-4 returns this:** Need to generate implementation code + tests with AF station loop, bounded retries, and judge feedback.

**Pattern:**

```
LOOP (maxRetries = 3):
  1. AF-4 RAG: search SK library for closest existing implementation pattern
  2. AF-1 Genesis: generate implementation + tests (fabric-first, DNA-compliant)
  3. AF-6 Code Review: automated review → reviewReport
  4. AF-7 Compliance: verify DNA-1 through DNA-9 → complianceReport
  5. AF-8 Security: scan → securityReport
  6. AF-9 Judge: evaluate all reports → pass/fail with feedback
  IF judge.pass → break
  IF judge.fail AND retries < maxRetries:
    extract failure signatures (SK-261)
    apply fix via IFixApplicationService (F1092)
    increment retry counter
  IF retries == maxRetries → escalate (emit BuildEscalated event)
```

**MACHINE (fixed):** maxRetries = 3, AF station sequence, DNA-1–DNA-9 checks, escalation on exhaustion.
**FREEDOM (configurable):** AI model per AF station, judge quality threshold (default 0.8), retry backoff.

**Positive Example:**
```
Attempt 1: Genesis generates IVideoGenerationService impl
AF-7: DNA-1 violation (typed model used)
AF-9: FAIL — "Use dict[str, Any] via parse_document"
Attempt 2: Fix applied — typed model replaced with parse_document pattern
AF-9: PASS (score 0.85)
Output: codeBundle stored in ES, TestBundle stored in ES
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Unlimited retries
while (!judge.Pass) { generate(); }
# WRONG: Skip AF-7 DNA compliance check
runAF1(); runAF6(); runAF8(); runAF9()
# WRONG: Throw on retry exhaustion
throw MaxRetriesException("Build failed")
# CORRECT: return DataProcessResult.Failure("BUILD_ESCALATED", ...)
```

---

### SK-254 — Deterministic Test Harness Pattern

**ID:** SK-254
**Name:** DeterministicTestHarness
**Archetype:** JUDGMENT
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (fixture storage) + AI ENGINE FABRIC (test data generation)
**Factories Used:** F1091 IDeterministicTestHarnessService

**When AF-4 returns this:** Need to generate deterministic, repeatable tests for externally-dependent code (AI providers, external APIs, databases) that avoid flakiness and record/replay capability.

**Pattern:**

```
1. Identify external calls in codeBundle (AF-4 RAG scans for fabric interface calls)
2. For each external call: generate fixture (recorded response)
   - AI calls: pre-recorded response fixtures (no live calls during tests)
   - DB calls: in-memory or ES testcontainer fixture
   - Queue calls: mock Redis Streams consumer group
3. Generate test harness wrapping fixtures around fabric interfaces
4. Verify: all external calls intercepted (no live provider calls in unit tests)
5. Generate E2E harness separately (uses real sandbox, not fixtures)
6. Store fixtures via DATABASE FABRIC → test-fixtures-{tenantId} index
```

**MACHINE (fixed):** All external calls must be intercepted in unit tests; E2E is separate; fixture format is dict[str, Any].
**FREEDOM (configurable):** Fixture generation AI model, fixture replay strategy.

**Positive Example:**
```
ExternalCall: IAiProvider.GenerateAsync("Generate video from prompt X")
Fixture: { "request_hash": "sha256:...", "response": { "videoUrl": "https:# ...", "duration": 5 } }
TestHarness: Inject fixture → call → assert response matches expected schema
Result: Unit test passes deterministically (no flakiness, no live AI calls)
```

**Negative Example (FORBIDDEN):**
```python
# WRONG: Live AI call in unit test
 result = await _openAi.GenerateAsync("test prompt")
# WRONG: Typed fixture model
 fixture = new VideoFixture { VideoUrl = "https:# ..." }
# WRONG: No fixture — test depends on external state
Assert.NotNull(await _videoService.GenerateAsync("test"))
```

---

### SK-255 — Evidence Bundle Assembly Pattern

**ID:** SK-255
**Name:** EvidenceBundleAssembler
**Archetype:** JUDGMENT
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (bundle storage) + QUEUE FABRIC (completion events)
**Factories Used:** F1097 IEvidenceBundleAssemblerService

**When AF-4 returns this:** Need to assemble comprehensive proof artifacts before GitOps promotion — covering gaps, contracts, implementation, tests, security, DNA compliance, sandbox results, and BFA registrations.

**Pattern:**

```
Collect from all prior phases:
  gaps[]: gap definitions with classification
  contracts[]: factory specs + task type contracts + event schemas
  codeBundle: per-gap implementation + AF review reports
  testBundle: unit fixtures + E2E harness
  unitReport: test results with pass/fail per test
  sandboxRef: ephemeral env reference
  e2eReport: E2E flow trace IDs + pass/fail
  securityReport: AF-8 scan results
  dnaMatrix: DNA-1–DNA-9 compliance per gap
  bfaRegistrations: new entities/events/APIs registered
  promotionDecision: target stage + approver (if CORE)

Assemble into evidence-bundle document (dict[str, Any])
Store via DATABASE FABRIC → evidence-bundles-{tenantId} index
Include: evidenceBundleId, tenantId, selfBuildRunId, timestamp, all collected artifacts

Emit EvidenceBundleReady event via QUEUE FABRIC
```

**MACHINE (fixed):** All sections required (no partial bundles), bundle must include DNA matrix and BFA registrations.
**FREEDOM (configurable):** Storage index prefix, bundle TTL, notification routing.

**Positive Example:**
```
Bundle for SelfBuildRun-abc123:
{
  "evidenceBundleId": "eb-xyz789",
  "tenantId": "tenant-001",
  "selfBuildRunId": "sbr-abc123",
  "gaps": [{ "type": "MISSING_FACTORY", "interface": "IVideoGenerationService" }],
  "dnaMatrix": { "DNA-1": "PASS", "DNA-2": "PASS", ..., "DNA-9": "PASS" },
  "e2eReport": { "passed": true, "traceIds": ["t1", "t2"] },
  "promotionDecision": { "stage": "INJECTED", "requiresHumanApproval": false }
}
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Missing DNA matrix in bundle
{ "gaps": [...], "codeBundle": {...} }  # incomplete — build CANNOT promote
# WRONG: Typed bundle model
 bundle = new EvidenceBundle { Gaps = gapList }
# WRONG: Missing BFA registrations
{ ..., "bfaRegistrations": null }  # null = BUILD FAILURE
```

---

### SK-256 — GitOps Assimilation Pattern

**ID:** SK-256
**Name:** GitOpsAssimilator
**Archetype:** ORCHESTRATION
**Flow:** FLOW-26
**Fabric:** EXECUTION FABRIC (Git/CI via FLOW-19 F697-F733) + QUEUE FABRIC (CI result events) + DATABASE FABRIC (registry updates)
**Factories Used:** F1098 IGitOpsAssimilationService, F1099 IPrManagementService, F1100 ICiCdGateService, F1101 IRegistryAssimilationService

**When AF-4 returns this:** Need to commit generated code, open PR, await CI, and update registries upon successful merge.

**Pattern:**

```
1. Create branch: self-build/{selfBuildRunId} via F697 ISourceControlService (EXECUTION FABRIC)
2. Commit: codeBundle + testBundle + evidence bundle summary via ISourceControlService
3. Open PR: title = "Self-Build: {gapSummary}", body = evidence bundle link
   → Assign reviewers via FREEDOM config (or auto-approve for stages below CORE)
4. Subscribe to CI events via QUEUE FABRIC (CI_RESULT queue)
5. Await CI green (timeout configurable via FREEDOM, default 30 min)
   IF CI_FAIL: extract failure signatures (SK-261) → loopback to genesis (SK-253)
   IF CI_TIMEOUT: emit CiTimeout event → escalate
6. On CI green AND PR merged:
   → Update factory registry via F1101 IRegistryAssimilationService (DATABASE FABRIC)
   → Update capability manifest via F1076 ICapabilityRegistryService
   → Emit CapabilityAssimilated event via QUEUE FABRIC
```

**MACHINE (fixed):** Branch naming convention, CI gate required before registry update, registry update only after merge (not after PR open).
**FREEDOM (configurable):** CI timeout, auto-approve threshold (stage < CORE), reviewer assignment rules, target repository.

**Positive Example:**
```
Branch: self-build/sbr-abc123
Commit: "feat(self-build): add IVideoGenerationService via AI_ENGINE_FABRIC"
PR opened → CI triggered → CI green in 12min
Registry updated: F1102 IVideoGenerationService → AI_ENGINE_FABRIC registered
Event: CapabilityAssimilated { factoryId: "F1102", tenantId: "tenant-001" }
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Direct git CLI call
Process.Start("git", "commit -m ...")
# WRONG: Update registry before CI green
await RegisterFactory(F1102);  # before merge
await OpenPr(...)
# WRONG: Skip PR for CORE promotion
await MergeDirectly();  # CORE always requires PR + human approval
```

---

### SK-257 — Promotion Ladder Governance Pattern

**ID:** SK-257
**Name:** PromotionLadderGovernance
**Archetype:** GUARDRAIL
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (promotion ledger in ES) + QUEUE FABRIC (promotion events)
**Factories Used:** F1102 IPromotionLadderService

**When AF-4 returns this:** Need to evaluate promotion stage assignment, enforce stage criteria, and record promotion decisions with full audit trail.

**Promotion Stages:**
```
DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE
```

**Stage Criteria (MACHINE — fixed):**
```
DRAFT:      Evidence bundle created, no tests required
WIRED:      Unit tests pass (harness), DNA compliance PASS
VALIDATED:  E2E tests pass in sandbox
INJECTED:   CI green, registry updated, PR merged
MINIMAL:    2+ production flows using this capability successfully
CORE:       Human approval + security review + 30-day stability window
```

**Pattern:**

```
1. Load evidence bundle via DATABASE FABRIC
2. Evaluate: which stage criteria are met
3. Assign: highest stage where ALL criteria are satisfied
4. IF target stage == CORE: set requiresHumanApproval = true → trigger SK-258
5. Record promotion decision in promotion-ledger-{tenantId} index (DATABASE FABRIC)
6. Emit PromotionDecided event via QUEUE FABRIC
```

**MACHINE (fixed):** Stage criteria are immutable (cannot be skipped), CORE always requires human approval, promotion is additive (cannot demote without explicit rollback).
**FREEDOM (configurable):** MINIMAL usage count threshold (default 2), CORE stability window duration (default 30 days).

**Positive Example:**
```
Evidence bundle: DNA PASS, E2E PASS, CI PASS, registry updated
→ Stage: INJECTED (criteria met through INJECTED, not yet MINIMAL)
Record: { stage: "INJECTED", selfBuildRunId: "sbr-abc123", timestamp: now }
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Skip stages
promotionStage = "CORE"  # when CI hasn't run yet
# WRONG: Auto-promote to CORE without human approval
if (ciGreen) promotionStage = "CORE"
# WRONG: No promotion record
# (promotion must always produce a ledger entry)
```

---

### SK-258 — Human Approval Gate Pattern

**ID:** SK-258
**Name:** HumanApprovalGate
**Archetype:** GUARDRAIL
**Flow:** FLOW-26
**Fabric:** QUEUE FABRIC (approval request/response) + DATABASE FABRIC (approval record) + AI ENGINE FABRIC (approval summary generation)
**Factories Used:** F1102 IPromotionLadderService (approval sub-flow), F1101 IRegistryAssimilationService

**When AF-4 returns this:** Need to pause automated flow, notify approvers, await human decision, and resume or abort based on response.

**Pattern:**

```
1. Generate approval summary via AI ENGINE FABRIC (concise, evidence-linked)
2. Emit ApprovalRequired event via QUEUE FABRIC:
   { approvalId, selfBuildRunId, promotionStage: "CORE", evidenceBundleId, summary }
3. Deliver to approver(s) via notification (FREEDOM: email/Slack/webhook channel)
4. Subscribe to ApprovalResponse queue (timeout: FREEDOM configurable, default 72h)
5. IF APPROVED:
   → Resume promotion → CORE
   → Record approval in approval-records-{tenantId} index
6. IF REJECTED:
   → Emit PromotionRejected event
   → Stage remains at INJECTED/MINIMAL
   → Record rejection with reason
7. IF TIMEOUT:
   → Emit ApprovalTimeout event → stage stays INJECTED
```

**MACHINE (fixed):** CORE promotion ALWAYS requires human approval — no exceptions. Timeout results in stage hold (not rejection). Approval record always stored.
**FREEDOM (configurable):** Approver list, timeout duration, notification channel.

**Positive Example:**
```
ApprovalRequired: { factoryId: "F1102", stage: "CORE", summary: "IVideoGenerationService..." }
→ Approver receives notification
→ Approver responds: APPROVED
→ Stage promoted to CORE, record stored
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Auto-approve CORE
if (approvers.Count == 0) approveCorePromotion()
# WRONG: No timeout handling
await approvalChannel.WaitForever()
# WRONG: No approval record
ApproveAndPromote();  # without storing who approved and when
```

---

### SK-259 — SelfBuildRun State Machine Pattern

**ID:** SK-259
**Name:** SelfBuildRunStateMachine
**Archetype:** ORCHESTRATION
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (run state in ES + Redis) + QUEUE FABRIC (phase transition events)
**Factories Used:** F1075-F1102 (orchestrated), F1077 IFlowPlannerService

**When AF-4 returns this:** Need to manage and persist the full lifecycle state of a SelfBuildRun across phases, including recovery from interruption.

**States:**
```
TRIGGERED → GAPS_DETECTED → CONTRACTS_DRAFTED → GENESIS_IN_PROGRESS
→ GENESIS_GREEN → SANDBOX_DEPLOYED → E2E_PASSED
→ PR_OPENED → CI_GREEN → PROMOTED → COMPLETED
(+ ESCALATED, REJECTED, AWAITING_HUMAN at any phase)
```

**Pattern:**

```
SelfBuildRun document (dict[str, Any]):
{
  "runId": "sbr-{uuid}", "tenantId": "...", "state": "TRIGGERED",
  "intent": "...", "gaps": [], "contracts": [], "codeBundle": {},
  "testBundle": {}, "sandboxRef": null, "e2eReport": null,
  "prRef": null, "ciResult": null, "promotionDecision": null,
  "retryCountByGap": {}, "phaseHistory": [], "createdAt": "...", "updatedAt": "..."
}

On each phase transition:
1. Load current run via DATABASE FABRIC (ES: self-build-runs-{tenantId})
2. Validate: transition is legal per state machine
3. Update state + append to phaseHistory
4. Store run via DATABASE FABRIC (upsert)
5. Emit PhaseTransitioned event via QUEUE FABRIC (for observability)

Recovery:
1. Load run by runId → resume from current state
2. Re-execute current phase (all phases are idempotent via Idempotency-Key)
```

**MACHINE (fixed):** State machine transitions, phaseHistory append-only, runId immutable.
**FREEDOM (configurable):** Run TTL (default 7 days), max concurrent runs per tenant.
**DNA Compliance:** dict[str, Any] for run document, tenantId on all queries, build_search_filter.

**Positive Example:**
```
State: GENESIS_GREEN → transition to SANDBOX_DEPLOYED
Load run sbr-abc123 → validate GENESIS_GREEN → SANDBOX_DEPLOYED is legal
Update: state = "SANDBOX_DEPLOYED", sandboxRef = { envId: "sb-xyz", endpoints: [...] }
phaseHistory.append({ phase: "SANDBOX_DEPLOYED", timestamp: now })
Store → emit PhaseTransitioned event
```

**Negative Example (FORBIDDEN):**
```
# WRONG: No state persistence between phases
 run = new SelfBuildRun { State = "SANDBOX_DEPLOYED" };  # in-memory only
# WRONG: Skip phase transition validation
run["state"] = "PROMOTED";  # jumping from GENESIS_GREEN to PROMOTED
# WRONG: Typed state model
class SelfBuildRun { public str State  }
```

---

### SK-260 — Reuse Decision Matrix Pattern

**ID:** SK-260
**Name:** ReuseDecisionMatrix
**Archetype:** INVENTORY
**Flow:** FLOW-26
**Fabric:** RAG FABRIC (semantic search via SK library) + AI ENGINE FABRIC (similarity scoring)
**Factories Used:** F1078 IReuseDecisionMatrixService, F1079 IReuseScannerService

**When AF-4 returns this:** Need to determine whether to COPY, ADAPT, or REWRITE a capability based on semantic similarity to existing patterns.

**Reuse Decisions:**
```
COPY:    Similarity ≥ 0.95 — existing pattern is identical; use as-is
ADAPT:   0.70 ≤ Similarity < 0.95 — existing pattern needs modification
REWRITE: Similarity < 0.70 — no close match; generate from scratch
```

**Pattern:**

```
1. For each detected gap: extract capability signature (interface + operations + fabric)
2. RAG FABRIC search: IRagService.SearchAsync(capabilitySignature, strategy: "Hybrid")
3. Score top-3 results via AI ENGINE FABRIC (semantic similarity scoring)
4. Apply matrix:
   - COPY: instruct genesis to clone + register under new factoryId
   - ADAPT: instruct genesis to use existing pattern as base template
   - REWRITE: instruct genesis with no base template
5. Record reusePlan: { gapId, decision, sourceSkill?, similarityScore }
6. Pass reusePlan to genesis loop (SK-253) as context
```

**MACHINE (fixed):** Similarity thresholds, strategy = "Hybrid" for reuse scan.
**FREEDOM (configurable):** Similarity model, top-K candidates.

**Positive Example:**
```
Gap: IVideoGenerationService (AI_ENGINE)
RAG finds: SK-143 (IImageGenerationService) → similarity 0.78
Decision: ADAPT — "Use SK-143 as base, adapt GenerateAsync for video output schema"
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Always REWRITE regardless of similarity
decision = "REWRITE";  # wastes generation tokens, breaks reuse philosophy
# WRONG: COPY without checking similarity
decision = "COPY";  # before RAG scan
# WRONG: Direct code search (not through RAG FABRIC)
 files = Directory.GetFiles("skills/", "*.cs")
```

---

### SK-261 — Failure Signature Extraction Pattern

**ID:** SK-261
**Name:** FailureSignatureExtractor
**Archetype:** JUDGMENT
**Flow:** FLOW-26
**Fabric:** AI ENGINE FABRIC (log analysis) + DATABASE FABRIC (failure signature storage)
**Factories Used:** F1096 IFailureSignatureExtractorService

**When AF-4 returns this:** Need to extract actionable repair instructions from test/CI failure logs to feed back into the genesis loop.

**Failure Signature Types:**
```
DNA_VIOLATION:       "Used typed model at line X — replace with parse_document"
MISSING_TENANTID:    "Query at line X missing tenantId filter"
PROVIDER_DIRECT:     "Direct provider import at line X — use fabric interface"
TEST_ASSERTION:      "Assert failed: expected VideoUrl != null, got null"
CI_BUILD_ERROR:      "Build error: missing package reference"
SCHEMA_MISMATCH:     "Event schema VideoGenerationCompleted missing field 'duration'"
```

**Pattern:**

```
1. Load failure report (unitReport, e2eReport, or ciResult)
2. AI ENGINE FABRIC: analyze logs → extract failure signatures[]
3. For each signature: classify type + extract line/file reference + generate fix instruction
4. Store failure signatures via DATABASE FABRIC → failure-signatures-{tenantId} index
5. Return DataProcessResult<FailureSignatures[]> to genesis loop caller
```

**MACHINE (fixed):** All 6 signature types, fix instruction always required (not just classification).
**FREEDOM (configurable):** AI model for log analysis, signature confidence threshold.

**Positive Example:**
```
Log: "System.NullReferenceException: Object reference not set — VideoGenerationService.cs:42"
AI analysis: type = "TEST_ASSERTION", line = 42
fix = "Ensure parse_document handles null video_url field with default empty str"
Output: { type: "TEST_ASSERTION", file: "VideoGenerationService.cs", line: 42, fix: "..." }
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Return raw logs without extraction
return DataProcessResult.Success(rawLogs);  # genesis can't repair from raw logs
# WRONG: No fix instruction
{ type: "DNA_VIOLATION", line: 15 }  # missing fix instruction
# WRONG: Typed FailureSignature model
 sig = new FailureSignature { Type = "DNA_VIOLATION" }
```

---

### SK-262 — Capability Hot-Reload Pattern

**ID:** SK-262
**Name:** CapabilityHotReload
**Archetype:** ORCHESTRATION
**Flow:** FLOW-26
**Fabric:** QUEUE FABRIC (hot-reload events) + DATABASE FABRIC (capability manifest) + CORE FABRIC (MicroserviceBase config reload)
**Factories Used:** F1101 IRegistryAssimilationService, F1076 ICapabilityRegistryService

**When AF-4 returns this:** Need to make a newly-assimilated capability available to the running engine without full restart, by updating registries and triggering config reload via existing MicroserviceBase mechanisms.

**Pattern:**

```
1. Receive CapabilityAssimilated event from QUEUE FABRIC
2. Update capability manifest in ES (via F1076 ICapabilityRegistryService)
3. Invalidate factory registry cache (Redis key: capability-registry-{tenantId})
4. Emit CapabilityHotReloaded event via QUEUE FABRIC
   → Flow Orchestrator listens and re-evaluates pending flows that were blocked on gap
5. Verify: re-run gap detection for pending blocked flows → gap now resolved
6. Resume previously-blocked flows via FLOW ENGINE FABRIC
```

**MACHINE (fixed):** Cache invalidation before hot-reload event emission, pending flow re-evaluation required.
**FREEDOM (configurable):** Cache TTL, max concurrent hot-reloads per tenant.
**DNA Compliance:** No direct Redis import — always via DATABASE FABRIC (Redis provider), always tenantId-scoped cache keys.

**Positive Example:**
```
Event: CapabilityAssimilated { factoryId: "F1102", interface: "IVideoGenerationService" }
→ Capability manifest updated in ES
→ Cache invalidated: capability-registry-tenant-001
→ Event: CapabilityHotReloaded emitted
→ Flow planner re-evaluates "text→video" flow: gap resolved → flow resumes
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Restart service to reload capability
Process.Start("kubectl", "rollout restart deployment/flow-orchestrator")
# WRONG: Direct Redis invalidation (not through fabric)
_redis.KeyDelete("capability-registry-tenant-001")
# WRONG: No pending flow re-evaluation
# (capability added to registry but blocked flows not notified)
```

---

### SK-263 — Meta-Flow BFA Pack Generation Pattern

**ID:** SK-263
**Name:** MetaFlowBfaPackGenerator
**Archetype:** GUARDRAIL
**Flow:** FLOW-26
**Fabric:** DATABASE FABRIC (BFA index in ES) + AI ENGINE FABRIC (conflict analysis)
**Factories Used:** F1087 IBfaDraftGeneratorService, F1085 IEventSchemaRegistryService, F1086 IApiContractRegistryService

**When AF-4 returns this:** Need to generate and register BFA conflict rules for newly-generated capabilities before they can proceed to GitOps, to prevent cross-flow conflicts with existing F1–F1102.

**Pattern:**

```
1. Load generated contracts: factory specs + event schemas + API contracts
2. Load existing BFA registrations via DATABASE FABRIC → bfa-registry-{tenantId} index
3. AI ENGINE FABRIC: analyze new contracts vs existing registrations → candidate conflicts
4. For each candidate conflict: generate CF rule in standard format:
   { cfId, description, trigger, conflictsWith, severity, resolution }
5. Validate: no new rules duplicate existing CF-1–CF-457
6. Register new BFA rules via DATABASE FABRIC → bfa-registry index
7. Register new event schemas via F1085 IEventSchemaRegistryService
8. Register new API contracts via F1086 IApiContractRegistryService
9. Emit BfaPackRegistered event via QUEUE FABRIC
```

**MACHINE (fixed):** All new events/APIs/entities must be registered before GitOps phase, CFx rules must follow standard format.
**FREEDOM (configurable):** AI model for conflict analysis, conflict sensitivity threshold.

**Positive Example:**
```
New event: VideoGenerationCompleted { videoId, tenantId, videoUrl, duration }
BFA analysis: no conflict with existing CF rules
New CF rule:
CF-543: "VideoGenerationCompleted must carry tenantId; cross-tenant video access = CRITICAL"
Registered → BfaPackRegistered event emitted
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Skip BFA registration and go directly to GitOps
await OpenPr(codeBundle);  # without BFA registration
# WRONG: Register event schema without conflict check
await RegisterEvent(VideoGenerationCompleted);  # before checking existing CF rules
# WRONG: Duplicate CF rule (same conflict already in CF-1–CF-457)
CF-544: "tenantId required on queries" # already covered by DNA-5 / CF-12
```

---

### SK-264 — Sandbox Teardown (Finally Pattern)

**ID:** SK-264
**Name:** SandboxTeardownFinally
**Archetype:** GUARDRAIL
**Flow:** FLOW-26
**Fabric:** CORE FABRIC (container orchestration via FLOW-19 F59 pattern) + QUEUE FABRIC (teardown events) + DATABASE FABRIC (sandbox registry)
**Factories Used:** F1094 IEphemeralDeployService, F1093 ISandboxOrchestratorService

**When AF-4 returns this:** Need to guarantee sandbox environment cleanup regardless of phase outcome (pass, fail, or exception), preventing resource leaks in multi-tenant environments.

**Pattern:**

```
try {
  1. Deploy sandbox (SK per SK-259 SelfBuildRun, state = SANDBOX_DEPLOYED)
  2. Run health checks
  3. Execute E2E tests
  4. Collect results
} catch (any error) {
  5. Store failure report
  6. Emit SandboxTestFailed event
} finally {
  7. ALWAYS: Teardown sandbox via IEphemeralDeployService (container stop + resource release)
  8. ALWAYS: Remove sandbox record from DATABASE FABRIC sandbox-registry-{tenantId}
  9. ALWAYS: Emit SandboxTornDown event via QUEUE FABRIC
  10. ALWAYS: Release tenant quota reservation for sandbox resources
}
```

**MACHINE (fixed):** Teardown ALWAYS runs (finally), quota release ALWAYS runs, sandbox record ALWAYS removed.
**FREEDOM (configurable):** Teardown timeout, resource quotas per tier.

**Positive Example:**
```
try {
  sandbox = await Deploy(codeBundle)
  e2eResult = await RunE2E(sandbox)
} catch (E2EException ex) {
  await StoreFailureReport(ex)
} finally {
  await _sandboxService.TeardownAsync(sandbox.envId, tenantId)
  await _quotaService.ReleaseAsync(tenantId, "sandbox")
  await EnqueueAsync("SandboxTornDown", { envId: sandbox.envId })
}
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Only teardown on success
if (e2eResult.Passed) await Teardown(sandbox);  # leaks resources on failure
# WRONG: No quota release
await TeardownContainer(sandbox);  # without releasing tenant quota
# WRONG: Direct container call
DockerClient.StopContainer(containerId);  # must go through IEphemeralDeployService
```

---

### SK-265 — Multi-Tenant SelfBuild Isolation Pattern

**ID:** SK-265
**Name:** MultiTenantSelfBuildIsolation
**Archetype:** GUARDRAIL
**Flow:** FLOW-26
**Fabric:** CORE FABRIC (MicroserviceBase scope isolation) + DATABASE FABRIC (per-tenant indices) + QUEUE FABRIC (per-tenant consumer groups)
**Factories Used:** F1075-F1102 (all must enforce tenantId), F967 ITenantIsolationEnforcerService (from FLOW-23)

**When AF-4 returns this:** Need to enforce that SelfBuildRun artifacts, generated code, capability registrations, sandbox environments, and BFA rules are strictly isolated by tenantId — a tenant's self-build cannot affect another tenant's capabilities.

**Isolation Boundaries:**
```
Capability Registry:    ES index: capability-registry-{tenantId}
Self-Build Runs:        ES index: self-build-runs-{tenantId}
Evidence Bundles:       ES index: evidence-bundles-{tenantId}
Failure Signatures:     ES index: failure-signatures-{tenantId}
Sandbox Environments:   Namespace: sandbox-{tenantId}-{runId}
Promotion Ledger:       ES index: promotion-ledger-{tenantId}
BFA Registrations:      Global BFA (shared) + tenant-specific override index
Queue Consumer Groups:  Group: self-build-{tenantId}
Git Branches:           Branch: self-build/{tenantId}/{runId}
```

**Pattern:**

```
1. Every SelfBuildRun MUST carry tenantId (extracted from Auth context via MicroserviceBase)
2. ALL DB operations: tenantId in build_search_filter — never omit
3. Sandbox deploy: create in namespace sandbox-{tenantId}-{runId}
4. Queue operations: consumer group self-build-{tenantId}
5. Git branch: self-build/{tenantId}/{runId}
6. Capability promotion: tenant-promoted capabilities go to tenant-specific registry
   (Global/CORE capabilities require separate cross-tenant promotion flow)
7. BFA rules: shared global rules (CF-1+) + tenant override rules (separate index)
```

**MACHINE (fixed):** tenantId isolation is non-negotiable at every boundary, cross-tenant capability sharing requires explicit opt-in.
**FREEDOM (configurable):** Tenant tiering (quota limits per tier, from FLOW-23 DD-210).

**Positive Example:**
```
Tenant A runs self-build → capability IVideoGenerationService registered in:
  capability-registry-tenant-A
  self-build-runs-tenant-A
  promotion-ledger-tenant-A (stage: INJECTED)

Tenant B: gap detection for IVideoGenerationService → MISSING_FACTORY
(Tenant B cannot see Tenant A's capability until cross-tenant sharing explicitly enabled)
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Global capability registry without tenantId
 capabilities = await db.SearchAsync("capability-registry", filter: {})
# WRONG: Shared sandbox namespace
sandboxNamespace = "global-sandbox";  # cross-tenant contamination
# WRONG: Tenant A code deployed to Tenant B's registry
await RegisterFactory(tenantId: "tenant-B", source: "tenant-A");  # forbidden
```

---

### SK-266 — Recursive Sub-Flow Generation Pattern

**ID:** SK-266
**Name:** RecursiveSubFlowGenerator
**Archetype:** SYNTHESIS
**Flow:** FLOW-26
**Fabric:** FLOW ENGINE FABRIC (sub-flow definition + orchestration) + AI ENGINE FABRIC (sub-flow planning) + DATABASE FABRIC (sub-flow registry)
**Factories Used:** F1077 IFlowPlannerService, F1082 IContractGeneratorService, F1084 ITaskTypeContractService

**When AF-4 returns this:** A detected gap requires not just a single factory/service, but an entire sub-flow (multiple steps, events, state transitions) to implement the capability correctly.

**Pattern:**

```
Trigger: ContractGenerator (SK-252) determines gap requires sub-flow (not just single factory)
Indicators: gap has > 3 sequential steps, gap includes polling/retry/webhook patterns

1. Sub-flow planning via AI ENGINE FABRIC:
   - Decompose gap into DAG steps
   - Identify each step's factory dependency + fabric resolution
   - Generate child flow template JSON (same format as parent flows)
2. Register child flow template via FLOW ENGINE FABRIC (DATABASE FABRIC → flow-templates index)
3. For each new factory in child flow: run SK-252 (contract-first) + SK-253 (genesis)
4. Child flow template added to childTemplates[] in parent SelfBuildRun
5. BFA check: child flow events/APIs registered via SK-263 (meta-flow BFA pack)
6. Child flow reference added to parent flow template as a nested step

Depth limit: FREEDOM-configurable (default max depth = 3)
Circular dependency check: mandatory (detect A → B → A patterns)
```

**MACHINE (fixed):** Depth limit enforced, circular dependency check mandatory, child flow must follow same engine contract format as parent.
**FREEDOM (configurable):** Max recursion depth, sub-flow naming convention.

**Positive Example:**
```
Gap: IVideoGenerationService needs polling (generation takes 30-120s)
Sub-flow: video-generation-poll-v1
  Step 1: SubmitVideoJob (IVideoGenerationService.SubmitAsync → AI_ENGINE)
  Step 2: PollJobStatus (IVideoGenerationService.PollAsync → AI_ENGINE) [loop]
  Step 3: StoreResult (IDatabaseService → DATABASE_FABRIC → S3/Blob)
  Step 4: EmitVideoReady (IQueueService → QUEUE_FABRIC)
Child flow registered → parent flow references sub-flow at step "GenerateVideo"
```

**Negative Example (FORBIDDEN):**
```
# WRONG: Inline the sub-flow in the parent (no reuse possible)
# Parent step 3 has 12 nested steps inlined instead of referencing child template
# WRONG: No depth limit
while (hasMoreSubFlows) { generateSubFlow(); }  # unbounded recursion
# WRONG: Skip BFA registration for child flow events
# VideoReady event not registered → potential conflict with existing FLOW-11 Media events
```

---

## AF-4 SKILL CROSS-REFERENCE (FLOW-26)

| AF Station | Skills Used | Purpose |
|---|---|---|
| AF-1 Genesis | SK-252, SK-253, SK-266 | Contract + code + sub-flow generation |
| AF-2 Planning | SK-251, SK-260, SK-266 | Gap + reuse + recursion planning |
| AF-3 Prompt Library | SK-252, SK-254 | Contract prompts + test harness prompts |
| AF-4 RAG | SK-260 | Reuse decision matrix |
| AF-5 Multi-model | SK-253 | Bounded genesis loop |
| AF-6 Code Review | SK-253, SK-261 | Review + failure signature |
| AF-7 Compliance | SK-253, SK-254 | DNA check + deterministic harness |
| AF-8 Security | SK-256, SK-265 | GitOps + tenant isolation |
| AF-9 Judge | SK-255, SK-257, SK-261 | Evidence bundle + promotion + failure |
| AF-10 Merge | SK-253, SK-260 | Merge genesis outputs per reuse decision |
| AF-11 Feedback | SK-259, SK-261 | SelfBuildRun history + failure learning |

---

## DNA COMPLIANCE MATRIX (FLOW-26 SKILLS)

| Skill | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-7 | DNA-8 | DNA-9 |
|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| SK-251 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — |
| SK-252 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| SK-253 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| SK-254 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
| SK-255 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| SK-256 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| SK-257 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| SK-258 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
| SK-259 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| SK-260 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| SK-261 | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — |
| SK-262 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
| SK-263 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |
| SK-264 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — |
| SK-265 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| SK-266 | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — |

DNA-1: parse_document | DNA-2: build_search_filter | DNA-3: DataProcessResult[T] | DNA-4: MicroserviceBase
DNA-5: Scope Isolation | DNA-6: DynamicController | DNA-7: Idempotency | DNA-8: Outbox | DNA-9: Audit

---

## SAVE POINT: SK238_DEFINED ✅
## FLOW-26 SKILLS FACTORY & RAG INDEX COMPLETE


================================================================================
FLOW-27 — SKILLS: SK-267–SK-277
================================================================================

# FLOW-27 — SKILLS FACTORY RAG
## Human Interaction Gate + Dependency Scheduler + Visual Runtime State + Multi-Tenant Group Tasks
## Extension of: SKILLS_FACTORY_RAG_MERGED.md (SK-1-SK-266 unchanged)
## FLOW-27 Skills: SK-267–SK-277
## Status: AUTHORITATIVE — FLOW-27 ONLY

---

## SK-267 — HumanInteractionGate Pattern (Suspend/Resume Lifecycle)

**Purpose:** Reusable pattern for any node that needs to pause execution pending human input,
then resume automatically when answered. Works for any flow, any node type.

**Reuse signal:** Any time a node must wait for human decision before downstream can proceed.

**Positive example:**
```python
# CORRECT — HIG via factory, DNA-compliant
class ArchitectureApprovalGateService(MicroserviceBase):  # DNA-4
{
    private readonly IExternalServiceFactory<IHumanInteractionGateService> _higFactory
    private readonly IExternalServiceFactory<ITaskContextSnapshotService> _snapshotFactory
    async def OpenApprovalGateAsync(self, 
        str tenantId, str runId, str nodeId,
        dict[str, Any] incomingContext)  # DNA-1: Dictionary
    {
         hig = await _higFactory.CreateAsync(new FactoryResolutionContext
        {
            TenantId = tenantId, FlowId = "architecture-flow", NodeId = nodeId
        }, ct)
        # Step 1: Capture context snapshot BEFORE opening gate (IR-T413-1)
         snapshot = await _snapshotFactory.CreateAsync(..., ct)
         snapResult = await snapshot.CaptureSnapshotAsync(tenantId, $"snap-{nodeId}",
            new ContextSnapshotRequest { IncomingVariables = incomingContext, TraceId = GetTraceId() }, ct)
        if (!snapResult.Success) return DataProcessResult[str].Failure(snapResult.Error); # DNA-3

        # Step 2: Open gate with group assignment
         gateResult = await hig.OpenGateAsync(new OpenGateRequest
        {
            TenantId = tenantId,          # DNA-5: always tenantId
            RunId = runId,
            TraceId = GetTraceId(),
            NodeId = nodeId,
            BlockingPolicy = "blocking",
            AssigneePolicy = new { type = "group", targets = new[] { "architects" } },
            QuestionSchema = new { required = new[] { "approved" }, type = "object" },
            ContextSnapshot = new { snapshotId = snapResult.Value },
            DueAt = DateTimeOffset.UtcNow.AddDays(3),
            Priority = "high"
        }, ct)
        return gateResult;  # DataProcessResult[str] — taskId  DNA-3
    }
}
```

**Negative example:**
```python
# WRONG — direct implementation, no factory, typed model
class BadApprovalGate:
{
    async def OpenGate(self, str nodeId)  # No tenantId! No DataProcessResult!
    {
         task = new UserTask  # WRONG: typed model (DNA-1 violation)
        {
            NodeId = nodeId,
            Status = "waiting"
        }
        _dbContext.UserTasks.Add(task);  # WRONG: direct DB access (SK-382 (ElasticsearchDatabase) violation)
        await _dbContext.SaveChangesAsync()
    }
}
```

**AF-4 RAG search terms:** `human gate`, `user task`, `suspend resume`, `approval wait`

---

## SK-268 — DependencyScheduler + waitFor/dependsOn Evaluator

**Purpose:** Pattern for re-evaluating node readiness after state changes. Ensures engine
keeps executing independent branches even when one is WAITING_FOR_USER.

**Positive example:**
```python
# CORRECT — Factory-first dependency evaluation, non-blocking
class NodeStateChangeHandler(MicroserviceBase):  # DNA-4
{
    private readonly IExternalServiceFactory<IDependencySchedulerService> _schedulerFactory
    private readonly IExternalServiceFactory<IBlockedNodeResolverService> _resolverFactory
    async def handle_node_completed_async(self, tenant_id: str, run_id: str, completed_node_id: str)
    {
         resolver = await _resolverFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        # Find nodes unblocked by this completion
         unblockedResult = await resolver.ResolveUnblockedNodesAsync(
            tenantId, runId, completedNodeId, ct);  # DNA-5: tenantId always

        if (!unblockedResult.Success) return DataProcessResult.Failure(unblockedResult.Error);  # DNA-3

         scheduler = await _schedulerFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        # Evaluate and enqueue newly READY nodes
         readyResult = await scheduler.EvaluateReadyNodesAsync(tenantId, runId, ct)
        if (!readyResult.Success) return DataProcessResult.Failure(readyResult.Error)
        return await scheduler.EnqueueReadyNodesAsync(tenantId, runId, readyResult.Value, ct)
    }
}
```

**Negative example:**
```python
# WRONG — Direct HTTP call between services (must use QUEUE FABRIC)
# WRONG — No tenantId on evaluation
async def CheckReady(self, str runId)
{
     response = await _httpClient.PostAsync("/nodes/evaluate", ...);  # WRONG: direct HTTP
    # Also missing tenantId scope — DNA-5 violation
}
```

**AF-4 RAG search terms:** `dependency scheduler`, `node readiness`, `waitFor`, `blocked node`, `allSettled`

---

## SK-269 — RunSnapshot + NodeSnapshot Event-Sourced Materialization

**Purpose:** Event-sourcing read model pattern. NodeEvents → immutable stream.
NodeStateProjector compacts events → NodeSnapshot for fast UI reads.

**Key principle:** Write path (emit events) and Read path (read snapshots) are separated.

**Positive example:**
```python
# CORRECT — Event emitter via QUEUE FABRIC, projector reads from stream
# Write path: emit events
class NodeEventPublisher(MicroserviceBase):
{
    private readonly IExternalServiceFactory<INodeEventEmitterService> _emitterFactory
    async def emit_node_started_async(self, tenant_id: str, run_id: str, node_id: str)
    {
         emitter = await _emitterFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        return await emitter.EmitAsync(tenantId, new NodeEvent
        {
            EventType = "NodeStarted",
            TenantId = tenantId,  # DNA-5
            RunId = runId,
            NodeId = nodeId,
            TraceId = GetTraceId(),
            Timestamp = DateTimeOffset.UtcNow,
            EventId = ComputeIdempotentId(runId, nodeId, "NodeStarted", DateTimeOffset.UtcNow)
        }, ct);  # DNA-3: DataProcessResult
    }
}

# Read path: query materialized snapshot
class RunGraphApiService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<IRunGraphQueryService> _graphFactory
    async def GetGraphAsync(self, 
        str tenantId, str runId)
    {
         query = await _graphFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        return await query.GetRunGraphAsync(tenantId, runId, ct);  # DNA-5: tenantId
    }
}
```

**Negative example:**
```python
# WRONG — Reading from event stream directly in API (not from snapshot)
# WRONG — No tenant scope on snapshot query
async def get_graph(self, run_id: str)  # ❌ WRONG — missing tenant scope
{
     events = await _redis.StreamReadAsync("node-events:*");  # WRONG: direct Redis
    return ProcessEvents(events);  # Missing tenantId, returns unscoped data
}
```

**AF-4 RAG search terms:** `node snapshot`, `run snapshot`, `event sourcing`, `progress aggregator`, `node status`

---

## SK-270 — GroupTaskAssignment With Claim Semantics

**Purpose:** Pattern for assigning UserTasks to groups/roles with single/multi claim
modes. Prevents conflicting simultaneous answers.

**Positive example:**
```python
# CORRECT — Group resolution + claim via factories
class GroupTaskWorkflowService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<ITaskAssignmentResolverService> _assignFactory
    private readonly IExternalServiceFactory<ITaskClaimService> _claimFactory
    async def ClaimTaskAsync(self, 
        str tenantId, str taskId, str userId)
    {
        # Step 1: Verify eligibility (F1106)
         assign = await _assignFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
         eligibleResult = await assign.IsEligibleToAnswerAsync(tenantId, taskId, userId, ct)
        if (!eligibleResult.Success || !eligibleResult.Value)
            return DataProcessResult[ClaimResult].Failure("User not eligible to answer this task")
        # Step 2: Attempt claim (F1107)
         claim = await _claimFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        return await claim.ClaimTaskAsync(tenantId, taskId, userId, ct)
        # Returns ClaimResult: { claimed: bool, claimId, expiresAt }
    }
}
```

**Positive example — quorum:**
```python
# CORRECT — Quorum check after each answer
async def ProcessQuorumAnswerAsync(self, 
    str tenantId, str taskId, str userId,
    dict[str, Any] answer)  # DNA-1: Dictionary answer
{
    # Record answer (idempotent by userId+taskId per IR-F1108-1)
    await _quorumService.RecordAnswerAsync(tenantId, taskId, userId, answer, ct)
    # Evaluate if quorum reached
     quorum = await _quorumService.EvaluateQuorumAsync(tenantId, taskId, ct)
    if (quorum.Value.Reached)
    {
        await _answerProcessor.CloseGateAsync(tenantId, taskId, ct)
    }
    return DataProcessResult[AnswerResult].Success(new AnswerResult
    {
        Accepted = true,
        GateStatus = quorum.Value.Reached ? "closed" : "still_open"
    })
}
```

**Negative example:**
```python
# WRONG — No claim check, direct ES write, cross-tenant group resolution
async def SubmitAnswer(self, str taskId, object answer)
{
    _esClient.Index(answer, taskId);  # WRONG: direct ES, no tenantId, no claim check
     members = _groupService.GetMembers("all-admins");  # WRONG: no tenantId scope
}
```

**AF-4 RAG search terms:** `group task`, `claim`, `quorum`, `assignment resolver`, `allOf`, `anyOf`

---

## SK-271 — CompletionGate Validation Pattern

**Purpose:** Pattern for validating ALL three run completion conditions before
marking a run as READY/SUCCEEDED.

**Positive example:**
```python
# CORRECT — All 3 checks before marking ready
class RunCompletionService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<IRunReadinessValidatorService> _validatorFactory
    private readonly IExternalServiceFactory<ICompletionGateService> _completionFactory
    async def TryCompleteRunAsync(self, 
        str tenantId, str runId)
    {
         validator = await _validatorFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        # Check 1: all required terminal nodes succeeded
         terminalOk = await validator.AllTerminalNodesSucceededAsync(tenantId, runId, ct)
        if (!terminalOk.Success || !terminalOk.Value)
            return DataProcessResult[CompletionStatus].Success(
                new CompletionStatus { Ready = false, Reason = "RequiredNodesPending" })
        # Check 2: no open required UserTasks
         noOpenTasks = await validator.HasOpenRequiredTasksAsync(tenantId, runId, ct)
        if (noOpenTasks.Value)  # Has open tasks
            return DataProcessResult[CompletionStatus].Success(
                new CompletionStatus { Ready = false, Reason = "PendingUserInput" })
        # Check 3: all judge gates approved
         judgesOk = await validator.AllJudgeGatesApprovedAsync(tenantId, runId, ct)
        if (!judgesOk.Value)
            return DataProcessResult[CompletionStatus].Success(
                new CompletionStatus { Ready = false, Reason = "JudgePending" })
        # All 3 satisfied — mark ready via CompletionGate
         completion = await _completionFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        await completion.MarkRunReadyAsync(tenantId, runId, ct);  # Idempotent (IR-T417-4)
        return DataProcessResult[CompletionStatus].Success(new CompletionStatus { Ready = true })
    }
}
```

**AF-4 RAG search terms:** `completion gate`, `run ready`, `run status`, `terminal node`, `judge gate`

---

## SK-272 — Multi-Tenant Notification Fan-Out

**Purpose:** Pattern for notifying group/role members about UserTasks with dedup,
deep links, and tenant-scoped recipient resolution.

**Positive example:**
```python
# CORRECT — Fan-out via factories, dedup, tenant-scoped
class UserTaskNotificationService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<IGroupMembershipResolverService> _groupFactory
    private readonly IExternalServiceFactory<INotificationDedupeService> _dedupeFactory
    private readonly IExternalServiceFactory<INotificationDeepLinkService> _linkFactory
    private readonly IExternalServiceFactory<INotificationOrchestratorService> _notifFactory
    # F68: INotificationProvider resolved via Management fabric

    async def notify_task_created_async(self, tenant_id: str, task_id: str, policy: dict)
    {
        # Resolve recipients WITHIN tenant only (CF-552)
         group = await _groupFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
         recipients = policy.Type == "group"
            ? await group.GetMembersAsync(tenantId, policy.Targets[0], ct)
            : await group.GetUsersWithRoleAsync(tenantId, policy.Targets[0], ct)
        if (!recipients.Success) return DataProcessResult.Failure(recipients.Error)
         dedupe = await _dedupeFactory.CreateAsync(..., ct)
         links = await _linkFactory.CreateAsync(..., ct)
        foreach ( userId in recipients.Value)
        {
            foreach ( channel in new[] { "in-app", "email" })
            {
                 dedupeKey = $"{taskId}:{channel}:{userId}"
                 isDupe = await dedupe.IsDuplicateAsync(tenantId, dedupeKey, ct)
                if (isDupe.Value) continue;  # Skip duplicate (CF-553)

                 viewUrl = await links.BuildViewContextUrlAsync(tenantId, taskId.RunId, taskId.NodeId, ct)
                 answerUrl = await links.BuildAnswerUrlAsync(tenantId, taskId, ct)
                # Send via INotificationProvider (F68 — existing Management fabric)
                await SendNotificationAsync(userId, channel, new
                {
                    TaskId = taskId, ViewContextUrl = viewUrl.Value,
                    AnswerUrl = answerUrl.Value  # IR-T421-2: always include
                })
                await dedupe.MarkSentAsync(tenantId, dedupeKey, TimeSpan.FromDays(3), ct)
            }
        }
        return DataProcessResult.Success()
    }
}
```

**AF-4 RAG search terms:** `notification fan-out`, `group notification`, `task notification`, `dedup`, `deep link`

---

## SK-273 — NodeStatus Enum + UI Chip Rendering Contract

**Purpose:** Canonical 9-state node status enum and the UI rendering rules for
each status. Fabric-first: pure data contract, zero platform-specific rendering.

**Status State Machine:**
```
PENDING → READY → RUNNING → SUCCEEDED
                 ↘ WAITING_FOR_USER → RUNNING (after answer) → SUCCEEDED
                 ↘ BLOCKED → READY (after dependency resolves)
                 ↘ FAILED
                 ↘ SKIPPED
PENDING → CANCELLED (run cancelled)
```

**Status transition rules:**
```python
# MACHINE rules (non-overridable)
PENDING     → READY:              all dependsOn satisfied
READY       → RUNNING:            orchestrator dequeues node
RUNNING     → WAITING_FOR_USER:   HIG gate opened (T413)
RUNNING     → SUCCEEDED:          execution complete
RUNNING     → FAILED:             unrecoverable error
WAITING_FOR_USER → RUNNING:       UserTaskAnswered received (F1128)
WAITING_FOR_USER → EXPIRED:       dueAt passed + blockingPolicy handled
BLOCKED     → READY:              blocking dependency resolved (T415)
ANY         → CANCELLED:          run cancellation propagated (F1122)
```

**UI Chip Data Contract (Template 91):**
```typescript
interface NodeChipData {
  id: str
  status: NodeStatus
  nodeName: str
  progress: number;           # 0.0 to 1.0
  progressPct: str;        # "67%"
  blockedBy: string[];        # nodeId list
  taskId: str | null;      # if WAITING_FOR_USER
  assigneeDisplay: str | null;  # "Architects", "Claimed by Dana", "2/3 approvals"
  subStepDisplay: str | null;   # "Step 3/7"
  childRunCount: number;      # if SubFlow
}
```

**AF-4 RAG search terms:** `node status`, `status enum`, `UI chip`, `node progress`, `waiting for user`

---

## SK-274 — SubFlowDrilldown + Breadcrumb Navigation Pattern

**Purpose:** Pattern for navigating from parent run graph → SubFlow node → child run graph.
Same API surface and status model at every level.

**Positive example:**
```python
# CORRECT — SubFlow drill-down via factories, breadcrumb from hierarchy
class SubFlowDrilldownService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<IRunGraphQueryService> _graphFactory
    private readonly IExternalServiceFactory<IRunSnapshotService> _runSnapshotFactory
    async def GetChildRunDetailsAsync(self, 
        str tenantId, str parentRunId, str subFlowNodeId)
    {
        # Get parent node snapshot to find childRunIds
         graph = await _graphFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
         nodeDetail = await graph.GetNodeDetailAsync(tenantId, parentRunId, subFlowNodeId, ct)
        if (!nodeDetail.Success) return DataProcessResult[SubFlowDrilldownResult].Failure(nodeDetail.Error)
         childRunIds = nodeDetail.Value.Snapshot["childRunIds"] as list[str]
        # Build breadcrumb
         breadcrumb = new[] {
            new { RunId = parentRunId, Label = "Parent Run" },
            new { RunId = (str)null, Label = nodeDetail.Value.Snapshot["nodeName"] as str },
        }
        # Get child run graphs (same API, scoped to SAME tenantId — IR-T419-1)
         childGraphs = new list[RunGraphResult]()
        foreach ( childRunId in childRunIds)
        {
             childGraph = await graph.GetRunGraphAsync(tenantId, childRunId, ct); # tenantId same
            if (childGraph.Success) childGraphs.Add(childGraph.Value)
        }

        return DataProcessResult[SubFlowDrilldownResult].Success(new SubFlowDrilldownResult
        {
            Breadcrumb = breadcrumb,
            ChildRunGraphs = childGraphs,
            ParentNodeStatus = nodeDetail.Value.Snapshot["status"] as str
        })
    }
}
```

**AF-4 RAG search terms:** `subflow`, `drill-down`, `breadcrumb`, `child run`, `nested flow`

---

## SK-275 — UserTask Schema (Dictionary-First, DNA-1 Compliant)

**Purpose:** Reference implementation for building and parsing UserTask documents
using dict[str, Any] (DNA-1 compliant — never typed models).

**Positive example:**
```python
# CORRECT — UserTask as Dictionary, parse_document pattern (DNA-1)
class UserTaskDocumentBuilder:  # No typed model anywhere
{
    public dict[str, Any] BuildUserTask(OpenGateRequest req, str taskId)
    {
        return new dict[str, Any]
        {
            ["taskId"] = taskId,
            ["tenantId"] = req.TenantId,              # DNA-5: always
            ["runId"] = req.RunId,
            ["traceId"] = req.TraceId,
            ["flowId"] = req.FlowId,
            ["nodeId"] = req.NodeId,
            ["nodeType"] = "HumanInteractionGate",
            ["blockingPolicy"] = req.BlockingPolicy,
            ["assigneePolicy"] = req.AssigneePolicy,   # nested Dictionary
            ["questionSchema"] = req.QuestionSchema,
            ["contextSnapshot"] = req.ContextSnapshot,
            ["resumeTargets"] = req.ResumeTargets,
            ["status"] = "waiting_for_user",
            ["createdAt"] = DateTimeOffset.UtcNow.ToString("O"),
            ["dueAt"] = req.DueAt?.ToString("O"),
            ["priority"] = req.Priority,
            ["answeredAt"] = null,
            ["answerPayload"] = null
        }
        # Note: build_search_filter skips nulls automatically (DNA-2)
    }

    def GetStatus(self, dict[str, Any] doc) =>
        doc.TryGetValue("status", out  s) ? s as str : null
    # Never create typed class like:
    # class UserTask { public str TaskId {get;set;} ... }  ← WRONG
}
```

**AF-4 RAG search terms:** `user task schema`, `parse_document`, `DNA-1`, `dictionary document`, `task document`

---

## SK-276 — allSettled + required+optional Join Policy Patterns

**Purpose:** Join gate patterns that enable non-blocking parallel branches.
Reuses FLOW-05 allSettled pattern, extends with required+optional mode.

**Positive example:**
```python
# CORRECT — Join policy via F1118, non-blocking
class JoinGateEvaluator(MicroserviceBase):
{
    private readonly IExternalServiceFactory<IJoinPolicyEnforcerService> _joinFactory
    async def CanJoinProceedAsync(self, 
        str tenantId, str runId, str joinNodeId)
    {
         join = await _joinFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
         result = await join.EvaluateJoinAsync(tenantId, runId, joinNodeId, ct)
        if (!result.Success) return DataProcessResult[bool].Failure(result.Error)
        # required+optional: can proceed if all REQUIRED are terminal
        # regardless of OPTIONAL status (CF-554: non-blocking)
        return DataProcessResult[bool].Success(result.Value.CanProceed)
    }
}

# allSettled: proceeds with partial results (FLOW-05 pattern)
# required+optional: explicit lists
# all: fail-fast on any required failure
```

**AF-4 RAG search terms:** `allSettled`, `join gate`, `join policy`, `required optional`, `non-blocking branch`

---

## SK-277 — Quorum Answer State Machine

**Purpose:** State machine pattern for managing quorum/allOf answer collection.
Ensures atomic transitions, correct quorum evaluation, and audit preservation.

**State machine:**
```
open
  → collecting_answers (first answer recorded)
  → quorum_reached (needed answers collected) → closed
  → allOf_complete (all members answered) → closed
  → expired (dueAt passed, gate force-closed)
  → cancelled (run cancelled)
```

**Positive example:**
```python
# CORRECT — Quorum state machine via F1108
class QuorumStateMachineService(MicroserviceBase):
{
    private readonly IExternalServiceFactory<ITaskQuorumService> _quorumFactory
    async def RecordAndEvaluateAsync(self, 
        str tenantId, str taskId, str userId,
        dict[str, Any] answer)  # DNA-1: Dictionary
    {
         quorum = await _quorumFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId }, ct)
        # Record answer (idempotent by userId+taskId)
         recordResult = await quorum.RecordAnswerAsync(tenantId, taskId, userId, answer, ct)
        if (!recordResult.Success) return DataProcessResult[QuorumTransition].Failure(recordResult.Error)
        # Evaluate quorum
         evalResult = await quorum.EvaluateQuorumAsync(tenantId, taskId, ct)
        if (!evalResult.Success) return DataProcessResult[QuorumTransition].Failure(evalResult.Error)
         status = evalResult.Value
        return DataProcessResult[QuorumTransition].Success(new QuorumTransition
        {
            QuorumReached = status.Reached,
            AnsweredCount = status.AnsweredCount,
            NeededCount = status.NeededCount,
            AllAnswers = status.Answers,  # Preserved even after quorum (CF-561)
            NextState = status.Reached ? "closed" : "collecting_answers"
        })
    }
}
```

**Negative example:**
```python
# WRONG — Deletes answers after quorum (violates CF-561 audit trail)
async def CloseQuorum(self, str taskId)
{
    await _db.DeleteAnswersAsync(taskId);  # WRONG: destroys audit trail
    # Also: no tenantId, direct DB, no DataProcessResult
}
```

**AF-4 RAG search terms:** `quorum`, `allOf`, `answer collection`, `state machine`, `quorum evaluation`

---

## RAG CROSS-REFERENCE: FLOW-27 → EXISTING SKILLS

| FLOW-27 Skill | Reuses / Builds On |
|--------------|-------------------|
| SK-267 | SK-001 (MicroserviceBase), SK-005 (DB Fabric), SK-004 (Queue Fabric) |
| SK-268 | SK-008 (Flow Definition), SK-009 (Flow Orchestrator), SK-004 (Queue Fabric) |
| SK-269 | SK-005 (DB Fabric / ES), SK-004 (Queue Fabric / Redis Streams) |
| SK-270 | SK-005 (DB Fabric / PG), SK-004 (Queue Fabric) |
| SK-271 | SK-009 (Flow Orchestrator), SK-005 (DB Fabric) |
| SK-272 | SK-004 (Queue Fabric), SK-005 (DB Fabric / Redis), Management fabric F68 |
| SK-273 | SK-008 (Flow Definition nodeTypes), Template 91 |
| SK-274 | SK-009 (Flow Orchestrator), SK-005 (ES) |
| SK-275 | SK-001 (parse_document DNA-1), SK-002 (build_search_filter DNA-2) |
| SK-276 | FLOW-05 allSettled pattern (existing), SK-009 |
| SK-277 | SK-267, SK-270, SK-005 (PG) |



---

## BACKWARD COMPATIBILITY CHECK — FLOW-27 SKILLS

| Check | Status |
|-------|--------|
| SK-1–SK-266 unchanged | ✅ PASS — no modifications to existing skills |
| All SK-267–SK-277 have positive AND negative examples | ✅ PASS |
| All skills reference factory interfaces, not providers | ✅ PASS |
| DNA compliance in all code examples | ✅ PASS — MicroserviceBase, DataProcessResult, parse_document |

---

## SAVE POINT: SK-267-SK-277_DEFINED ✅

---

# ═══════════════════════════════════════════════════════
# FLOW-28: Blog/CMS Modules Platform
# Date: 2026-03-01 | Merged: Post-FLOW-27 baseline
# Factories: F1129–F1175 (47) | Families: 165–174 (10)
# Task Types: T423–T440 (18) | Templates: 92–97 (6)
# BFA Rules: CF-566–CF-600 (35) | Stress Tests: ST-345–ST-368 (24)
# Skills: SK-278–SK-289 (12) | DDs: DD-272–DD-283 | DRs: DR-205–DR-212
# ═══════════════════════════════════════════════════════

# XIIGen SKILLS FACTORY & RAG — FLOW-28: Blog/CMS Modules Platform
## Skills: SK-278–SK-289 (12 new skills)
## Date: 2026-03-01 | Extends: SK-1–SK-277

---

## HOW SKILLS ARE USED IN FLOW-28

AF-4 (RAG Task Context station) searches this skill library when generating FLOW-28 services.
Each skill is a retrievable pattern that AF-1 (Genesis) uses as a starting template.
Skills reduce generation variance and enforce DNA compliance from the start.

RAG search keys for FLOW-26:
- "content repository elastic" → SK-278
- "taxonomy slug resolver" → SK-279
- "hook registry fan-out" → SK-280
- "media transform pipeline" → SK-281
- "search index cascade" → SK-282
- "comment moderation queue" → SK-283
- "ai seo content analyzer" → SK-284
- "theme renderer page cache" → SK-285
- "scheduled publishing" → SK-286
- "content permission rbac" → SK-287
- "editorial approval gate" → SK-288
- "site config freedom admin" → SK-289

---

## SK-278 — Content Repository Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Elasticsearch)
**Implements**: F1129 (IContentRepository)
**Used By**: T423, T425, T427, T430, T437, T438

### Purpose
Provides the core content CRUD operations for the CMS. All content stored as dict[str, Any] (DNA-1). build_search_filter applied for all queries (DNA-2). DataProcessResult on all returns (DNA-3). Scope isolated by tenantId (DNA-5).

### Pattern

```python
# SK-278: ContentRepositoryService
# AF-4 retrieves this when generating any content storage service

class ContentRepositoryService(MicroserviceBase): {  # DNA-4
    private readonly IDatabaseService _db;  # SK-382 (ElasticsearchDatabase) fabric
    
    # Injected via factory — no new Elasticsearch client
    public ContentRepositoryService(IExternalServiceFactory<IDatabaseService> dbFactory) {
        _db = dbFactory.CreateAsync(FactoryResolutionContext.From("content.db.provider")).GetAwaiter().GetResult()
    }
    
    async def GetAsync(self, 
        str contentId, str tenantId) {  # DNA-5: tenantId always
        
         filter = build_search_filter(new dict[str, Any] {  # DNA-2
            ["id"] = contentId,
            ["tenantId"] = tenantId
            # empty fields auto-skipped
        })
         result = await _db.SearchDocuments("content-{tenantId}", filter, limit: 1)
        if (!result.IsSuccess) return DataProcessResult[dict[str, Any]].Failure(result.Error)
        return DataProcessResult[dict[str, Any]].Success(result.Data.FirstOrDefault())
    }  # DNA-3: DataProcessResult, no throw
    
    async def StoreAsync(self, 
        dict[str, Any] document) {  # DNA-1: Dictionary
        
        # tenantId extracted from document, validated
        if (!document.ContainsKey("tenantId"))
            return DataProcessResult[str].Failure("tenantId required")
        return await _db.StoreDocument("content-{tenantId}", document)
    }
}
```

### Node.js Alternative
```javascript
# SK-278-node: ContentRepositoryService (Node.js)
class ContentRepositoryService {
    constructor(dbFactory) {
        this._db = null
        this._dbFactory = dbFactory
    }
    
    async init() {
        this._db = await this._dbFactory.createAsync({ provider: process.env.CONTENT_DB_PROVIDER })
    }
    
    async getAsync(contentId, tenantId) {
        const filter = buildSearchFilter({ id: contentId, tenantId }); # DNA-2: skip empty
        const result = await this._db.searchDocuments(`content-${tenantId}`, filter, { limit: 1 })
        return result.isSuccess
            ? DataProcessResult.success(result.data[0])
            : DataProcessResult.failure(result.error);  # DNA-3
    }
}
```

### FREEDOM Config Keys
```yaml
content.db.provider: elasticsearch  # switchable: mongodb, postgresql
content.db.index_prefix: content    # per-tenant index naming
content.db.refresh_interval: 1s     # ES index refresh rate
```

---

## SK-279 — Taxonomy Manager & Slug Resolver

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (ES + Redis)
**Implements**: F1131 (ITaxonomyService), F1132 (ISlugResolver)
**Used By**: T423, T430, T431, T432, T437

### Purpose
Manages taxonomy terms (categories, tags, custom taxonomies) and resolves slugs to content IDs with Redis caching for hot-path performance.

### Pattern

```python
class TaxonomyService(MicroserviceBase): {
    private readonly IDatabaseService _esDb;   # ES for taxonomy store
    private readonly IDatabaseService _cache;  # Redis for slug cache
    
    async def get_terms_async(self, taxonomy: str, tenant_id: str) {
        
         filter = build_search_filter(new dict[str, Any] {
            ["taxonomy"] = taxonomy,
            ["tenantId"] = tenantId
        })
        return await _esDb.SearchDocuments("taxonomy-{tenantId}", filter)
    }
    
    async def ResolveSlugAsync(self, 
        str slug, str tenantId) {
        
        # Hot path: Redis cache first
         cacheKey = $"slug:{tenantId}:{slug}"
         cached = await _cache.SearchDocuments("slug-cache", 
            build_search_filter(new dict[str, Any] { ["key"] = cacheKey }))
        if (cached.IsSuccess && cached.Data.Any())
            return DataProcessResult[str].Success(cached.Data.First()["contentId"].ToString())
        # Cold path: ES lookup + populate cache
         esFilter = build_search_filter(new dict[str, Any] {
            ["slug"] = slug, ["tenantId"] = tenantId, ["status"] = "Published"
        })
         esResult = await _esDb.SearchDocuments("content-{tenantId}", esFilter, limit: 1)
        if (!esResult.IsSuccess || !esResult.Data.Any())
            return DataProcessResult[str].Failure("slug_not_found")
         contentId = esResult.Data.First()["id"].ToString()
        await _cache.StoreDocument("slug-cache", new dict[str, Any] {
            ["key"] = cacheKey, ["contentId"] = contentId, ["ttl"] = 86400  # 24h
        })
        return DataProcessResult[str].Success(contentId)
    }
}
```

### FREEDOM Config Keys
```yaml
content.taxonomy.provider: elasticsearch
content.slug.cache: redis
content.slug.ttl_seconds: 86400
content.slug.cache_published_only: true
```

---

## SK-280 — Hook Registry & Fan-Out Engine

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + DATABASE FABRIC
**Implements**: F1144 (IHookRegistry), F1146 (IHookExecutor)
**Used By**: T425, T427, T433

### Purpose
Hook system for the CMS extension/plugin architecture. Handlers register for named hooks. Fan-out delivers hook payload to all registered handlers via queue. Handler failures isolated.

### Pattern

```python
class HookExecutorService(MicroserviceBase): {
    private readonly IDatabaseService _registry;   # F1144 - ES hook registrations
    private readonly IQueueService _queue;          # F1146 - Redis Streams fan-out
    
    async def FireHookAsync(self, 
        str hookName, 
        dict[str, Any] payload,  # DNA-1: Dictionary
        str tenantId) {                   # DNA-5: tenant scope
        
        # Load registered handlers for this hook + tenant
         filter = build_search_filter(new dict[str, Any] {
            ["hookName"] = hookName,
            ["tenantId"] = tenantId,
            ["active"] = true
        })
         handlers = await _registry.SearchDocuments("hook-registrations", filter)
        if (!handlers.IsSuccess) return DataProcessResult[str].Failure(handlers.Error)
         traceId = str.NewGuid().ToString()
        # Fan-out: one message per handler (handlers isolated)
        foreach ( handler in handlers.Data) {
             message = new dict[str, Any] {
                ["hookName"] = hookName,
                ["handlerEndpoint"] = handler["endpoint"],
                ["payload"] = payload,  # immutable — same object reference
                ["tenantId"] = tenantId,
                ["traceId"] = traceId,
                ["firedAt"] = DateTime.UtcNow
            }
            await _queue.EnqueueAsync("hook-executor", message)
        }
        
        # Fire-and-forget — caller doesn't wait for handlers
        return DataProcessResult[str].Success(traceId)
    }
}
```

### Handler Isolation Pattern
```python
# Each handler message consumed independently by hook-executor consumer group
# One handler crash = DLQ for that message only, others continue
# Handler timeout: configurable per registration (default 30s)
```

### FREEDOM Config Keys
```yaml
extensions.hooks.provider: elasticsearch
extensions.executor.queue: redis_streams
extensions.executor.consumer_group: hook-executor
extensions.handler.default_timeout_seconds: 30
extensions.handler.max_retry_count: 3
```

---

## SK-281 — Media Transform Pipeline

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + DATABASE FABRIC
**Implements**: F1135 (IMediaUploadService), F1136 (IMediaTransformer)
**Used By**: T428, T429

### Purpose
Async media upload + transform pipeline. Upload → store original → enqueue transform jobs → poll for completion → return variant URLs.

### Pattern

```python
class MediaTransformService(MicroserviceBase): {
    private readonly IDatabaseService _storage;  # blob storage via fabric
    private readonly IDatabaseService _library;  # ES media library
    private readonly IQueueService _queue;        # transform job queue
    
    async def SubmitTransformJobAsync(self, 
        str mediaId,
        dict[str, Any] spec,  # DNA-1: { width, height, format, quality }
        str tenantId) {
        
        # Validate spec against allowed transforms
         allowed = await LoadAllowedTransformsAsync(tenantId)
        # ... validation ...
        
         jobId = str.NewGuid().ToString()
         job = new dict[str, Any] {
            ["jobId"] = jobId,
            ["mediaId"] = mediaId,
            ["spec"] = spec,
            ["tenantId"] = tenantId,
            ["status"] = "QUEUED",
            ["submittedAt"] = DateTime.UtcNow
        }
        # Store job record (for polling)
        await _library.StoreDocument($"media-jobs-{tenantId}", job)
        # Enqueue transform work
        await _queue.EnqueueAsync("media-transform", job)
        return DataProcessResult[str].Success(jobId)
    }
    
    async def PollJobAsync(self, 
        str jobId, str tenantId) {
        
         filter = build_search_filter(new dict[str, Any] {
            ["jobId"] = jobId, ["tenantId"] = tenantId
        })
         result = await _library.SearchDocuments($"media-jobs-{tenantId}", filter, limit: 1)
        return result.IsSuccess && result.Data.Any()
            ? DataProcessResult[dict[str, Any]].Success(result.Data.First())
            : DataProcessResult[dict[str, Any]].Failure("job_not_found")
    }
}
```

### FREEDOM Config Keys
```yaml
media.upload.provider: s3_compat  # switchable: azure_blob, local
media.transform.queue: redis_streams
media.transform.consumer_group: media-transform
media.transform.max_file_size_mb: 50
media.transform.allowed_mime_types: [image/jpeg, image/png, image/webp, image/gif]
media.variants.default: [thumbnail_150, webp_1200, mobile_600]
```

---

## SK-282 — Search Index Updater

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Elasticsearch)
**Implements**: F1149 (IContentIndexer), F1150 (ISearchQueryBuilder)
**Used By**: T431, T437

### Purpose
Idempotent search index update triggered by CloudEvents. Enriches search document with taxonomy, author, and media thumbnail before indexing. Handles batch re-indexing for taxonomy propagation.

### Pattern

```python
class ContentIndexerService(MicroserviceBase): {
    private readonly IDatabaseService _searchDb;  # ES search index
    private readonly IDatabaseService _contentDb; # ES content store (for enrichment)
    
    async def IndexDocumentAsync(self, 
        str contentId,
        dict[str, Any] document,  # DNA-1
        str tenantId) {
        
        # Enrich with taxonomy and author (pre-join before index)
         enriched = new dict[str, Any](document)
        await EnrichWithTaxonomy(enriched, contentId, tenantId)
        await EnrichWithAuthor(enriched, tenantId)
        # Idempotent upsert (same contentId = overwrite)
        return await _searchDb.StoreDocument($"search-{tenantId}", enriched)
    }
    
    # Idempotency: ES upsert by _id = contentId
    # Re-indexing same content = same result
}
```

### FREEDOM Config Keys
```yaml
search.indexer.provider: elasticsearch
search.indexer.index_prefix: search
search.indexer.boost.title: 3.0
search.indexer.boost.body: 1.0
search.indexer.include_excerpt_chars: 300
```

---

## SK-283 — Comment Moderation Queue

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + AI ENGINE FABRIC
**Implements**: F1154 (ICommentRepository), F1155 (ISpamDetector), F1156 (IModerationQueue)
**Used By**: T435, T436

### Purpose
Comment intake with AI spam gate + human moderation queue. Spam detected automatically (AI), borderline cases go to moderation queue, ham posted directly if moderation disabled.

### Pattern

```python
class CommentService(MicroserviceBase): {
    private readonly IDatabaseService _comments;  # ES comments index
    private readonly IAiProvider _ai;              # Spam detector via AI fabric
    private readonly IQueueService _modQueue;      # Moderation queue
    
    async def SubmitAsync(self, 
        dict[str, Any] comment,  # DNA-1: { body, authorInfo, contentId, tenantId }
        str tenantId) {
        
        # Sanitize before AI analysis
        comment["body"] = SanitizeHtml(comment["body"].ToString())
        # AI spam classification (timeout-bounded)
         cts = CancellationTokenSource(TimeSpan.FromSeconds(5))
         spamResult = await _ai.GenerateAsync(
            BuildSpamPrompt(comment), cancellationToken: cts.Token)
         verdict = ParseVerdict(spamResult);  # dict[str, Any]
        
        if (verdict["verdict"].ToString() == "spam") {
            # DLQ the comment, return 202 with spam rejection message
            return DataProcessResult[dict[str, Any]].Success(
                new dict[str, Any] { ["status"] = "rejected_spam" })
        }
        
        comment["status"] = GetConfig<bool>("requiresModeration") ? "pending" : "approved"
        comment["spamScore"] = verdict["score"]
        comment["tenantId"] = tenantId
         stored = await _comments.StoreDocument($"comments-{tenantId}", comment)
        if (comment["status"].ToString() == "pending")
            await _modQueue.EnqueueAsync("moderation", comment)
        return DataProcessResult[dict[str, Any]].Success(comment)
    }
}
```

### FREEDOM Config Keys
```yaml
comments.db.provider: elasticsearch
comments.spam.aiProvider: claude  # switchable: openai
comments.spam.model: claude-haiku-4-5-20251001
comments.spam.threshold: 0.85
comments.spam.timeout_seconds: 5
comments.moderation.enabled: true
```

---

## SK-284 — AI SEO & Content Analyzer

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: AI ENGINE FABRIC + RAG FABRIC
**Implements**: F1158 (IAiSeoAnalyzer), F1159 (IAiTagSuggester), F1160 (IAiContentSummarizer)
**Used By**: T438

### Purpose
Multi-model AI analysis pipeline for CMS content. SEO analysis uses AiDispatcher (parallel Claude + Gemini, merged by AF-10). Tag suggestion and summary use single model (claude-haiku for speed).

### Pattern

```python
class AiContentAnalyzerService(MicroserviceBase): {
    private readonly AiDispatcher _dispatcher;  # SK-386 (AiDispatcher) - multi-model
    private readonly IAiProvider _ai;           # single model for fast tasks
    private readonly IRagService _rag;          # SK-389 (HybridRagStrategy) for context
    
    async def AnalyzeSeoAsync(self, 
        dict[str, Any] content,
        str tenantId) {
        
        # RAG: get site SEO context (existing top posts, keyword strategy)
         ragContext = await _rag.SearchAsync(
            "seo_strategy content_guidelines",
            strategy: RagStrategy.Hybrid,
            tenantId: tenantId)
        # Build prompt with RAG context
         prompt = BuildSeoPrompt(content, ragContext.Data)
        # Multi-model dispatch (AF-5) — Claude + Gemini parallel
         multiResult = await _dispatcher.DispatchAsync(
            prompt,
            models: new[] { "claude-sonnet-4-6", "gemini-2.5-pro" },
            mergeStrategy: MergeStrategy.BestOf);  # AF-10 merge
        
        # Store result in AF-11 feedback loop
        await RecordFeedbackAsync(content["id"].ToString(), "seo_analysis", multiResult, tenantId)
        return DataProcessResult[dict[str, Any]].Success(multiResult.MergedResult)
    }
}
```

### FREEDOM Config Keys
```yaml
ai.seo.strategy: multi_model
ai.seo.models: [claude-sonnet-4-6, gemini-2.5-pro]
ai.tags.provider: claude
ai.tags.model: claude-haiku-4-5-20251001
ai.summary.model: claude-sonnet-4-6
ai.alttext.model: claude-haiku-4-5-20251001  # vision
ai.enhancement.auto_apply: false  # suggest-only by default
```

---

## SK-285 — Theme Renderer & Page Cache

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Redis) + CORE FABRIC
**Implements**: F1139 (IThemeRenderer), F1140 (ITemplateEngine), F1141 (IPageCacheService)
**Used By**: T430, T432

### Purpose
Cache-first page rendering. Hot path: cache hit → return instantly. Cold path: resolve template → render → store in cache with Surrogate-Key tags. Tag-based cache invalidation on publish.

### Pattern

```python
class PageRenderService(MicroserviceBase): {
    private readonly IDatabaseService _cache;     # Redis page cache
    private readonly IDatabaseService _templates; # ES template store
    
    async def RenderPageAsync(self, 
        str contentId, 
        dict[str, Any] content,
        str tenantId) {
        
        # Hot path: cache check
         cacheKey = $"page:{tenantId}:{contentId}"
         cached = await _cache.SearchDocuments("page-cache", 
            build_search_filter(new dict[str, Any] { ["key"] = cacheKey }))
        if (cached.IsSuccess && cached.Data.Any())
            return DataProcessResult[dict[str, Any]].Success(cached.Data.First())
        # Cold path: load template + render
         contentType = content["type"].ToString()
         template = await LoadTemplateAsync(contentType, tenantId)
         rendered = RenderTemplate(template, content);  # no external call
        
        # Surrogate-Key tags for granular cache invalidation
         surrogateKeys = new[] {
            $"content-{contentId}",
            $"author-{content["authorId"]}",
            $"taxonomy-{content["primaryCategory"]}"
        }
         page = new dict[str, Any] {
            ["html"] = rendered,
            ["contentId"] = contentId,
            ["tenantId"] = tenantId,
            ["surrogateKeys"] = surrogateKeys,
            ["cachedAt"] = DateTime.UtcNow
        }
        # Store in cache with TTL
        await _cache.StoreDocument("page-cache", 
            new dict[str, Any](page) { 
                ["key"] = cacheKey,
                ["ttl"] = GetConfig<int>("render.cache.ttl_seconds")
            })
        return DataProcessResult[dict[str, Any]].Success(page)
    }
}
```

### FREEDOM Config Keys
```yaml
render.cache.provider: redis
render.cache.ttl_seconds: 3600
render.cache.ttl_homepage: 300  # shorter for home page
render.template.provider: elasticsearch
render.theme.default: default-blog
render.cdn.surrogate_header: Surrogate-Key
```

---

## SK-286 — Scheduled Publishing Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC (Redis Streams delayed)
**Implements**: F1163 (IScheduledPublisher)
**Used By**: T426

### Purpose
Time-gate for content publishing. Schedule stored in queue with delayed delivery. At fire time, re-verifies content status and permissions before triggering T425. Supports cancel and reschedule.

### Pattern

```python
class ScheduledPublisherService(MicroserviceBase): {
    private readonly IDatabaseService _db;    # content status re-check
    private readonly IQueueService _queue;     # scheduled message queue
    
    async def SchedulePublishAsync(self, 
        str contentId,
        DateTime scheduledAt,
        str requesterId,
        str tenantId) {
        
         scheduleId = str.NewGuid().ToString()
         message = new dict[str, Any] {
            ["scheduleId"] = scheduleId,
            ["contentId"] = contentId,
            ["scheduledAt"] = scheduledAt.ToString("O"),
            ["requesterId"] = requesterId,
            ["tenantId"] = tenantId,
            ["type"] = "SCHEDULED_PUBLISH"
        }
        # Enqueue with delayed delivery (Redis Streams + scheduler consumer)
        await _queue.EnqueueAsync("scheduled-pub", message, 
            deliverAt: scheduledAt)
        # Update content status to "Scheduled"
        await _db.StoreDocument("content-{tenantId}", new dict[str, Any] {
            ["id"] = contentId,
            ["status"] = "Scheduled",
            ["scheduledAt"] = scheduledAt,
            ["tenantId"] = tenantId
        })
        return DataProcessResult[str].Success(scheduleId)
    }
    
    # Re-verification at fire time
    async def FireScheduledPublishAsync(self, 
        dict[str, Any] message) {
        
         contentId = message["contentId"].ToString()
         tenantId = message["tenantId"].ToString()
        # Re-verify: status still "Scheduled"? (content may have been manually published/archived)
         content = await _db.SearchDocuments("content-{tenantId}",
            build_search_filter(new dict[str, Any] { ["id"] = contentId, ["status"] = "Scheduled" }))
        if (!content.IsSuccess || !content.Data.Any())
            return DataProcessResult[bool].Success(false); # silently skip — not an error
        
        # Delegate to T425 publish gate
        await _queue.EnqueueAsync("content-publish", new dict[str, Any] {
            ["contentId"] = contentId,
            ["tenantId"] = tenantId,
            ["triggeredBy"] = "scheduler"
        })
        return DataProcessResult[bool].Success(true)
    }
}
```

### FREEDOM Config Keys
```yaml
publish.schedule.queue: redis_streams
publish.schedule.consumer_group: scheduled-pub
publish.schedule.max_future_days: 365
publish.schedule.clock_skew_tolerance_seconds: 30
```

---

## SK-287 — Content Permission Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: CORE FABRIC (MicroserviceBase auth)
**Implements**: F1168 (IContentPermissionService), F1169 (IEditorialRoleService)
**Used By**: T423, T425, T427, T428, T435, T436, T440

### Purpose
RBAC for editorial operations. Roles: Admin > Editor > Author > Contributor > Subscriber. Object-level checks: author can only edit their own content; editor can edit all within tenant. BOLA prevention built in.

### Pattern

```python
class ContentPermissionService(MicroserviceBase): {
    # Built on CORE FABRIC auth context — hot path is in-memory
    
    private static readonly Dictionary<str, set[str]> RoleCapabilities = 
        new Dictionary<str, set[str]> {
            ["admin"]       = new set[str] { "read","edit","publish","delete","moderate","configure" },
            ["editor"]      = new set[str] { "read","edit","publish","moderate" },
            ["author"]      = new set[str] { "read","edit_own","submit_for_review" },
            ["contributor"] = new set[str] { "read","edit_own" },
            ["subscriber"]  = new set[str] { "read","comment" }
        }
    async def CanAsync(self, 
        str userId, str action, str contentId, str tenantId) {
        
        # BOLA check: if action is on specific content, verify ownership
        if (action == "edit_own" || action == "delete") {
             ownerResult = await VerifyOwnershipAsync(userId, contentId, tenantId)
            if (!ownerResult.IsSuccess) return DataProcessResult[bool].Success(false)
        }
        
         role = await GetUserRoleAsync(userId, tenantId)
        if (!role.IsSuccess) return DataProcessResult[bool].Success(false)
         capabilities = RoleCapabilities.GetValueOrDefault(role.Data, new set[str]())
        return DataProcessResult[bool].Success(
            capabilities.Contains(action) || capabilities.Contains($"{action}_own"))
    }
}
```

### FREEDOM Config Keys
```yaml
permissions.content.provider: core_fabric
permissions.roles.provider: elasticsearch
permissions.rbac.default_role: subscriber
permissions.rbac.require_email_verified: true
```

---

## SK-288 — Editorial Approval Gate

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC (human-in-loop)
**Implements**: F1164 (IPublishApprovalGate)
**Used By**: T425

### Purpose
Human-in-the-loop approval for content publishing. Approval request stored in queue, editor notified, waits for signal. Timeout = DLQ. Supports async decision via admin UI.

### Pattern

```python
class PublishApprovalGateService(MicroserviceBase): {
    private readonly IQueueService _queue
    async def RequestApprovalAsync(self, 
        str contentId, str requesterId, str tenantId) {
        
         approvalId = str.NewGuid().ToString()
         request = new dict[str, Any] {
            ["approvalId"] = approvalId,
            ["contentId"] = contentId,
            ["requesterId"] = requesterId,
            ["tenantId"] = tenantId,
            ["status"] = "PENDING",
            ["requestedAt"] = DateTime.UtcNow,
            ["expiresAt"] = DateTime.UtcNow.AddHours(
                GetConfig<int>("publish.approval.timeout_hours"))
        }
        await _queue.EnqueueAsync("approvals", request)
        return DataProcessResult[str].Success(approvalId)
    }
    
    async def SubmitDecisionAsync(self, 
        str approvalId, bool approved, str reviewerId, str reason, str tenantId) {
        
        # Idempotent — duplicate decisions are ignored if already decided
         decision = new dict[str, Any] {
            ["approvalId"] = approvalId,
            ["decision"] = approved ? "APPROVED" : "REJECTED",
            ["reviewerId"] = reviewerId,
            ["reason"] = reason,
            ["tenantId"] = tenantId,
            ["decidedAt"] = DateTime.UtcNow
        }
        await _queue.EnqueueAsync("approval-decisions", decision)
        return DataProcessResult[bool].Success(true)
    }
}
```

### FREEDOM Config Keys
```yaml
publish.approval.queue: redis_streams
publish.approval.timeout_hours: 72
publish.approval.notify_reviewer_roles: [editor, admin]
publish.approval.auto_approve_after_timeout: false
```

---

## SK-289 — Site Config & Permalink Manager

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (ES FREEDOM layer + Redis)
**Implements**: F1172 (ISiteConfigService), F1173 (IPermalinkConfigService)
**Used By**: T430, T440

### Purpose
FREEDOM layer for blog site configuration. Admin-editable without code deploys. Permalink structure patterns. Maintenance mode toggle (Redis fast-path for zero-latency check).

### Pattern

```python
class SiteConfigService(MicroserviceBase): {
    private readonly IDatabaseService _freedom;   # ES FREEDOM index
    private readonly IDatabaseService _cache;     # Redis for maintenance flag
    
    async def GetConfigAsync(self, 
        str tenantId) {
        
         filter = build_search_filter(new dict[str, Any] {
            ["tenantId"] = tenantId, ["type"] = "site_config"
        })
        return await _freedom.SearchDocuments("site-config", filter, limit: 1)
    }
    
    # FREEDOM: admin sets values, MACHINE: validation rules enforced
    async def SetConfigValueAsync(self, 
        str key, object value, str tenantId) {
        
        if (!AllowedConfigKeys.Contains(key))
            return DataProcessResult[bool].Failure($"config_key_not_allowed: {key}")
        # Validate value type for key
         validated = ValidateConfigValue(key, value)
        if (!validated.IsSuccess) return DataProcessResult[bool].Failure(validated.Error)
         doc = new dict[str, Any] {
            ["tenantId"] = tenantId, ["key"] = key, ["value"] = value,
            ["updatedAt"] = DateTime.UtcNow
        }
        return await _freedom.StoreDocument("site-config", doc)
    }
    
    # Maintenance mode: Redis fast-path (sub-millisecond)
    async def IsMaintenanceModeAsync(self, str tenantId) {
         result = await _cache.SearchDocuments("maintenance-flags",
            build_search_filter(new dict[str, Any] { 
                ["tenantId"] = tenantId, ["active"] = true }))
        return DataProcessResult[bool].Success(result.IsSuccess && result.Data.Any())
    }
}
```

### FREEDOM Config Keys (the config IS the freedom layer)
```yaml
# These are admin-configurable in the FREEDOM panel:
site.title: "My Blog"
site.permalink_structure: "/{year}/{month}/{slug}"
site.posts_per_page: 10
site.comments_enabled: true
site.timezone: "UTC"
site.maintenance_mode: false
site.default_category: "Uncategorized"
```

---

## SKILL SUMMARY TABLE

| SK | Name | Factories | Used By Task Types | Primary Fabric |
|----|------|-----------|--------------------|---------------|
| SK-278 | Content Repository | F1129 | T423,T425,T427,T430,T437,T438 | DB (ES) |
| SK-279 | Taxonomy & Slug Resolver | F1131,F1132 | T423,T430,T431,T432,T437 | DB (ES+Redis) |
| SK-280 | Hook Registry & Fan-Out | F1144,F1146 | T425,T427,T433 | QUEUE+DB |
| SK-281 | Media Transform Pipeline | F1135,F1136 | T428,T429 | QUEUE+DB |
| SK-282 | Search Index Updater | F1149,F1150 | T431,T437 | DB (ES) |
| SK-283 | Comment Moderation Queue | F1154,F1155,F1156 | T435,T436 | DB+AI+QUEUE |
| SK-284 | AI SEO & Content Analyzer | F1158,F1159,F1160 | T438 | AI ENGINE+RAG |
| SK-285 | Theme Renderer & Page Cache | F1139,F1140,F1141 | T430,T432 | DB (Redis)+CORE |
| SK-286 | Scheduled Publishing | F1163 | T426 | QUEUE (timer) |
| SK-287 | Content Permission Service | F1168,F1169 | T423,T425,T427,T435,T440 | CORE+DB |
| SK-288 | Editorial Approval Gate | F1164 | T425 | QUEUE (human-in-loop) |
| SK-289 | Site Config & Permalink | F1172,F1173 | T430,T440 | DB (ES FREEDOM+Redis) |

---

## STATE SAVE CHECKPOINT

```
FILE: 28-blog-modules_SKILLS_FACTORY_RAG.md
STATUS: COMPLETE ✅
SKILLS ADDED: SK-278-SK-289 (12 skills)
NEXT FILE: 28-blog-modules_V62_BFA_STRESS_TEST.md
NEXT NUMBERS:
  BFA Rule:   CF-566
  Stress Test: ST-345
```


---

## SAVE POINT: SKILLS_FACTORY_RAG_FLOW28_MERGED ✅
## Post-FLOW-28: Next skill = SK-290

---

# ═══════════════════════════════════════════════════════
# FLOW-29 — Adaptive RAG Deep Research Engine
# Skills: SK-290–SK-304 | AF-4 RAG Search Index
# ═══════════════════════════════════════════════════════

---

## OVERVIEW

15 new skills extend the existing 250-skill library. AF-4 (RAG Task Context) indexes these skills so every AF-1 Genesis code generation call can retrieve relevant patterns.

All skills follow the standard pattern:
- SKILL.md with YAML frontmatter
- Core implementation guide (fabric-first, no direct imports)
- Multi-language alternatives (Node.js, Python, Rust, PHP)
- AI agent config entries for Cursor / Claude Code / Copilot / Cline

---

## SK-290 — Adaptive RAG Router Skill

**ID:** SK-290
**Domain:** Retrieval Orchestration
**Promoted From:** FLOW-29
**Ladder Status:** GENERATED → MINIMAL (proven in FLOW-29)

**Purpose:** Guide AF-1 Genesis in generating the adaptive routing service that classifies query intent and selects retrieval mode.

**Core Pattern:**
```python
# ✅ CORRECT — through fabric interfaces
class AdaptiveRagRouterService(MicroserviceBase):
{
    private readonly IAdaptiveRagRouter _router;  # F1176 — RAG FABRIC
    private readonly ITaskClassifier _classifier;  # F1177 — AI ENGINE FABRIC

    async def RouteAsync(self, 
        str query, str tenantId, BudgetMode budget)
    {
         intentResult = await _classifier.ClassifyAsync(
            parse_document(new { query, tenantId }))
        if (!intentResult.Success) return DataProcessResult[RouteDecision].Fail(intentResult.Error)
         modeResult = await _router.SelectModeAsync(
            parse_document(new { intent = intentResult.Data, budget, tenantId }))
        await _auditLogger.EmitAsync(parse_document(new { 
            mode = modeResult.Data, confidence = intentResult.Data.Confidence, tenantId }))
        return modeResult
    }
}

# ❌ WRONG
 neo4j = Neo4jClient(...);    # never direct provider
 mode = "Vector";                  # never hard-coded mode
```

**AF-4 Retrieval Tags:** `routing, retrieval-mode-selection, task-classification, fabric-first`

**Multi-Language Alternatives:**
- Node.js: `AdaptiveRagRouter.ts` — extends MicroserviceBase JS port, same interface pattern
- Python: `adaptive_rag_router.py` — uses IRagService ABC, never LangChain direct import
- Rust: `adaptive_rag_router.rs` — trait-based IRagService, async/await

---

## SK-291 — GraphRAG Indexer Skill

**ID:** SK-291
**Domain:** Knowledge Graph Construction
**Ladder Status:** GENERATED

**Purpose:** Guide AF-1 in generating the GraphRAG indexing service — entity/relation extraction, community partition, community summary generation. ALL through fabric interfaces.

**Core Pattern:**
```python
class GraphRagIndexerService(MicroserviceBase):
{
    private readonly IKnowledgeGraphBuilder _builder; # F1185 — AI ENGINE FABRIC
    private readonly ICommunityHierarchyManager _hierarchy; # F1186 — DATABASE FABRIC
    private readonly IGraphIndexRebuildQueue _rebuildQueue; # F1190 — QUEUE FABRIC

    async def TriggerRebuildAsync(self, 
        str domainProfileId, str tenantId)
    {
        # NEVER inline rebuild — always queue
         queueResult = await _rebuildQueue.EnqueueAsync(
            parse_document(new { domainProfileId, tenantId, requestedAt = DateTime.UtcNow }))
        return queueResult
    }
}
# Community rebuild is ASYNC — never blocks query path
```

**Iron Rule Reminder:** `IGraphIndexRebuildQueue` → async queue only. Inline rebuild = BUILD FAILURE.

**AF-4 Tags:** `graphrag, knowledge-graph, community-hierarchy, async-rebuild, fabric-first`

---

## SK-292 — Hybrid Retrieval Fusion Skill

**ID:** SK-292
**Domain:** Retrieval Post-Processing
**Ladder Status:** GENERATED

**Purpose:** Fuse vector results + GraphRAG community context; unified reranking; context budget enforcement before returning to generator.

**Core Pattern:**
```python
class HybridFusionService(MicroserviceBase):
{
    async def FuseAsync(self, 
        List<dict[str, Any]> vectorPassages,
        List<dict[str, Any]> graphContext,
        str tenantId, float budgetCap)
    {
         fusionRatio = _config.Get<float>("rag.fusion.vector_weight", 0.6m)
         merged = MergeWithRatio(vectorPassages, graphContext, fusionRatio)
         reranked = await _reranker.RerankAsync(parse_document(new { passages = merged, tenantId }))
         tokenCount = reranked.Data.Sum(p => (int)p["token_count"])
        if (tokenCount > budgetCap)
            return await _pruner.PruneAsync(parse_document(new { passages = reranked.Data, budgetCap }))
        return DataProcessResult[dict[str, Any]].Ok(
            parse_document(new { passages = reranked.Data, fusionRatio, tokenCount }))
    }
}
# fusionRatio MUST come from config — never hard-coded
```

**AF-4 Tags:** `hybrid-retrieval, fusion, reranking, context-budget, fabric-first`

---

## SK-293 — Contextual Bandit Router Skill

**ID:** SK-293
**Domain:** Self-Learning Routing
**Ladder Status:** GENERATED

**Purpose:** Implement the contextual bandit arm selection — (modelId, promptVersionId, flowVariantId) — with epsilon-greedy or UCB exploration. Policy updates are always async.

**Core Pattern:**
```python
class BanditRouterService(MicroserviceBase):
{
    async def SelectArmAsync(self, 
        dict[str, Any] context, str tenantId)
    {
         policy = await _policyReader.GetAsync(
            build_search_filter(new { tenantId }))
         budgetMode = await _budgetReader.GetModeAsync(tenantId)
        # Exploration vs exploitation
         explorationRate = _config.Get<float>("bandit.exploration_rate", 0.1)
         arm = Random.NextDouble() < explorationRate
            ? SelectRandomArm(policy.Data.Arms)
            : SelectBestArm(policy.Data.Arms, budgetMode)
        await _auditLog.EmitAsync(
            parse_document(new { arm, tenantId, budgetMode, explorationRate }))
        return DataProcessResult[BanditArm].Ok(arm)
    }

    # Policy update — ALWAYS async
    async def QueuePolicyUpdateAsync(self, 
        dict[str, Any] feedbackBatch, str tenantId)
    {
        return await _policyUpdater.EnqueueAsync(
            parse_document(new { feedbackBatch, tenantId, queuedAt = DateTime.UtcNow }))
    }
}
```

**AF-4 Tags:** `bandit-routing, contextual-bandit, model-selection, self-learning, async-policy-update`

---

## SK-294 — Trace Span Capture Skill

**ID:** SK-294
**Domain:** Observability
**Ladder Status:** GENERATED

**Purpose:** Wrap every step with OTel-compatible span emission via QUEUE FABRIC. Never direct OTel SDK. Propagate traceId across all child spans.

**Core Pattern:**
```python
class TraceSpanService(MicroserviceBase):, ITraceSpanService
{
    async def StartSpanAsync(self, 
        str spanName, str traceId, str parentSpanId, str tenantId)
    {
         spanId = str.NewGuid().ToString()
        await _queue.EnqueueAsync("trace-spans",
            parse_document(new {
                traceId, spanId, parentSpanId, spanName, tenantId,
                startedAt = DateTime.UtcNow, status = "OPEN"
            }))
        return DataProcessResult[str].Ok(spanId)
    }

    async def EndSpanAsync(self, 
        str traceId, str spanId, dict[str, Any] metrics)
    {
        # Outbox pattern — persist before acknowledge
         stored = await _db.StoreDocumentAsync(
            parse_document(new { traceId, spanId, metrics, endedAt = DateTime.UtcNow }))
        if (!stored.Success) return DataProcessResult[bool].Fail(stored.Error)
        await _queue.AcknowledgeAsync(spanId)
        return DataProcessResult[bool].Ok(true)
    }
}
# NEVER: ActivitySource("...").StartActivity() — always through QUEUE FABRIC
```

**AF-4 Tags:** `observability, trace, opentelemetry, queue-fabric, outbox, idempotency`

---

## SK-295 — User Feedback Ingest Skill

**ID:** SK-295
**Domain:** Self-Learning
**Ladder Status:** GENERATED

**Purpose:** Ingest user feedback linked to exact (traceId, runId, modelId, promptVersionId, retrievalMode). Feed bandit router. Idempotent.

**Core Pattern:**
```python
async def IngestAsync(self, 
    str traceId, str runId, int rating, str correctionText,
    str userId, str tenantId)
{
     idempotencyKey = $"{userId}:{runId}:{traceId}"
     existing = await _db.SearchDocumentsAsync(
        build_search_filter(new { idempotencyKey, tenantId }))
    if (existing.Data?.Any() == true)
        return DataProcessResult[bool].Ok(true); # idempotent

     feedback = parse_document(new {
        traceId, runId, rating, correctionText, userId, tenantId,
        idempotencyKey, ingestedAt = DateTime.UtcNow })
    await _feedbackLinker.LinkAsync(feedback)
    await _banditStore.RecordFeedbackAsync(feedback)
    await _aggregator.AddToWindowAsync(feedback)
    return DataProcessResult[bool].Ok(true)
}
```

**AF-4 Tags:** `feedback, self-learning, trace-linkage, idempotency, bandit-feedback`

---

## SK-296 — Eval Quality Arbiter Skill

**ID:** SK-296
**Domain:** Quality Control
**Ladder Status:** GENERATED

**Purpose:** Per-run quality evaluation — faithfulness check, context coverage, hallucination detection (multi-model consensus), quality rubric validation.

**Core Pattern:**
```python
async def EvaluateAsync(self, 
    str answer, List<dict[str, Any]> retrievedPassages,
    str tenantId)
{
     faithfulness = await _faithfulnessChecker.CheckAsync(
        parse_document(new { answer, passages = retrievedPassages, tenantId }))
     hallucinationCheck = await _hallucinationDetector.CheckAsync(
        parse_document(new { answer, tenantId })); # multi-model via AiDispatcher

     rubric = await _rubricStore.GetAsync(
        build_search_filter(new { tenantId })); # tenant-scoped rubric

     report = parse_document(new {
        faithfulness_score = faithfulness.Data,
        hallucination_detected = hallucinationCheck.Data.Detected,
        consensus_models = hallucinationCheck.Data.Models,
        rubric_applied = rubric.Data.Id,
        passed = faithfulness.Data >= 0.8m && !hallucinationCheck.Data.Detected
    })
    await _publisher.PublishAsync(parse_document(new { report, tenantId }))
    return DataProcessResult[EvalReport].Ok(MapReport(report))
}
# Hallucination: ALWAYS AiDispatcher multi-model — never single model
```

**AF-4 Tags:** `eval, quality-gate, hallucination-detection, faithfulness, multi-model-consensus`

---

## SK-297 — Prompt Version Registry Skill

**ID:** SK-297
**Domain:** Prompt Governance
**Ladder Status:** GENERATED

**Purpose:** Immutable prompt versioning — create, promote, rollback. Never edit existing version document. Full promotion ladder with quality gate enforcement.

**Core Pattern:**
```python
async def CreateVersionAsync(self, 
    str promptContent, str domain, str taskType,
    string[] modelAffinity, str tenantId)
{
     versionId = str.NewGuid().ToString()
     doc = parse_document(new {
        versionId, promptContent, domain, taskType, modelAffinity,
        tenantId, status = "DRAFT", createdAt = DateTime.UtcNow,
        # NEVER update this document — create new version for changes
    })
    return await _db.StoreDocumentAsync(doc)
}

async def PromoteAsync(self, 
    str versionId, str targetStatus, str tenantId)
{
    # Archive current ACTIVE version first
     current = await GetActiveVersionAsync(tenantId)
    if (current.Success)
        await _db.StoreDocumentAsync(
            parse_document(new { current.Data.versionId, status = "ARCHIVED" }))
    # Create promotion event (not inline mutation)
    await _promoter.EmitAsync(parse_document(new { versionId, targetStatus, tenantId }))
    return DataProcessResult[bool].Ok(true)
}
```

**AF-4 Tags:** `prompt-versioning, immutable, promotion-ladder, rollback, governance`

---

## SK-298 — Domain Profile Compiler Skill

**ID:** SK-298
**Domain:** Knowledge Compiler
**Ladder Status:** GENERATED

**Purpose:** Compile domain knowledge profiles (entity types, relation types, extraction prompts) — trigger async graph rebuild via QUEUE FABRIC.

**AF-4 Tags:** `domain-compiler, graphrag-profile, entity-types, async-rebuild, tenant-scoped`

**Core Pattern (abbreviated):**
```python
# Profile is always tenant-scoped
 profile = parse_document(new { 
    tenantId, domainId, entityTypes, relationTypes, 
    extractionPromptVersionId, summaryStrategy, compiledAt = DateTime.UtcNow })
await _profileStore.StoreDocumentAsync(profile); # DATABASE FABRIC
await _rebuildPublisher.EnqueueAsync(profile);   # QUEUE FABRIC — async rebuild
```

---

## SK-299 — RAG Asset Version Manager Skill

**ID:** SK-299
**Domain:** Asset Governance
**Ladder Status:** GENERATED

**Purpose:** Version all RAG artifacts (embeddings, index configs, chunk params, strategies). Safe rollback via pointer swap. Block promotion on regression.

**AF-4 Tags:** `rag-versioning, asset-governance, rollback, pointer-swap, regression-check`

---

## SK-300 — Context Efficiency Monitor Skill

**ID:** SK-300
**Domain:** Cost Optimization
**Ladder Status:** GENERATED

**Purpose:** Track retrieved_token_count per step. Enforce budget_cap. Emit efficiency score. Feed penalty to bandit router.

**Core insight:** Higher accuracy can coincide with fewer retrieved tokens. Monitor and enforce.

**AF-4 Tags:** `context-efficiency, token-budget, cost-optimization, noise-detection`

---

## SK-301 — Reranker Service Skill

**ID:** SK-301
**Domain:** Retrieval Post-Processing
**Ladder Status:** GENERATED

**Purpose:** Rerank retrieved passages via AI ENGINE FABRIC (rerank model). Exclude passages below relevance_threshold. Always runs before generator receives context.

**AF-4 Tags:** `reranking, passage-relevance, noise-reduction, ai-engine-fabric`

---

## SK-302 — A/B Test Allocator Skill

**ID:** SK-302
**Domain:** Experimentation
**Ladder Status:** GENERATED

**Purpose:** Deterministic allocation of (tenantId + userId + experimentId) to flow variant. No shared mutable state between branches. Results via QUEUE FABRIC.

**AF-4 Tags:** `ab-testing, deterministic-allocation, flow-variants, experimentation`

---

## SK-303 — Routing Policy Updater Skill

**ID:** SK-303
**Domain:** Self-Learning
**Ladder Status:** GENERATED

**Purpose:** Update bandit routing policy weights from aggregated feedback window. ALWAYS async. Archive previous policy before activating new one.

**AF-4 Tags:** `policy-update, bandit-weights, async-learning, policy-versioning`

---

## SK-304 — Visual Control Plane Canvas Skill

**ID:** SK-304
**Domain:** UI — Fabric-First
**Ladder Status:** GENERATED

**Purpose:** React Flow canvas for the self-learning control plane. Renders tasks→subtasks→flows→prompts→models→evaluators as editable graph. ZERO platform-specific values hardcoded. All node types, model names, strategy names from FREEDOM config.

**Core Pattern:**
```tsx
# ✅ CORRECT — fabric-first React Flow canvas
const { data: graphConfig } = useFreedomConfig('control-plane.graph')
const nodeTypes = graphConfig.nodeTypes; # from config, not hard-coded

const ControlPlaneCanvas = () => (
  <ReactFlow
    nodeTypes={nodeTypes}  # from FREEDOM config
    nodes={nodes.map(n => ({ ...n, type: n.nodeType }))} # never hardcode type
    onNodeChange={async (change) => {
      await routerService.CreateAsync(factoryCtx); # F1227 via CreateAsync
      await graphService.EditAsync(change, tenantId); # T462 gate
    }}
  />
)
# ❌ WRONG
const nodeTypes = { 'gpt4': GPT4Node, 'claude': ClaudeNode }; # never hardcode models
```

**AF-4 Tags:** `visual-ui, react-flow, fabric-first, control-plane, freedom-config, zero-hardcode`

---

## AF-4 RAG SEARCH INDEX UPDATE (FLOW-29)

New skills added to IRagService search index with tags:

```json
{
  "flow": "FLOW-29",
  "newSkills": [
    { "id": "SK-290", "tags": ["routing","retrieval-mode","adaptive","rag"] },
    { "id": "SK-291", "tags": ["graphrag","knowledge-graph","community","indexing"] },
    { "id": "SK-292", "tags": ["hybrid","fusion","reranking","context-budget"] },
    { "id": "SK-293", "tags": ["bandit","routing","self-learning","model-selection"] },
    { "id": "SK-294", "tags": ["trace","observability","opentelemetry","queue"] },
    { "id": "SK-295", "tags": ["feedback","ingest","trace-link","idempotency"] },
    { "id": "SK-296", "tags": ["eval","quality","hallucination","faithfulness","multi-model"] },
    { "id": "SK-297", "tags": ["prompt-versioning","immutable","promotion","rollback"] },
    { "id": "SK-298", "tags": ["domain-compiler","graphrag-profile","entity-types"] },
    { "id": "SK-299", "tags": ["rag-versioning","asset-governance","rollback"] },
    { "id": "SK-300", "tags": ["context-efficiency","token-budget","cost"] },
    { "id": "SK-301", "tags": ["reranking","noise-reduction","relevance"] },
    { "id": "SK-302", "tags": ["ab-test","allocation","experimentation","variants"] },
    { "id": "SK-303", "tags": ["policy-update","bandit","async","learning"] },
    { "id": "SK-304", "tags": ["visual","react-flow","fabric-first","control-plane","ui"] }
  ]
}
```

## SKILL DEPENDENCY MAP (FLOW-29)

```
SK-290 (Router) ──depends──► SK-293 (Bandit) ──depends──► SK-303 (Policy)
SK-291 (GraphRAG) ──depends──► SK-298 (Domain Compiler)
SK-292 (Hybrid) ──depends──► SK-301 (Reranker) ──depends──► SK-300 (Efficiency)
SK-294 (Trace) ──feeds──► SK-295 (Feedback) ──feeds──► SK-303 (Policy)
SK-296 (Eval) ──gates──► SK-297 (Prompt Version Promote)
SK-299 (RAG Version) ──gates──► SK-302 (A/B Test)
SK-304 (UI) ──reads──► SK-290, SK-291, SK-292, SK-293 (all routing skills)
```
-e 
---

## SAVE POINT: SKILLS_FACTORY_RAG_FLOW29_MERGED ✅

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-30 — PromptOps: Self-Learning Prompt Engineering
# Skills: SK-305 to SK-314 (10 new skills)
# Date: 2026-03-01
# ═══════════════════════════════════════════════════════════════════

# FLOW-30 SKILLS FACTORY RAG
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Skills: SK-305 to SK-314 (10 new skills)
## Date: 2026-03-01

---

## SKILL SUMMARY TABLE

| Skill | Name | Pattern | Key Factories | Promotion Level |
|-------|------|---------|---------------|-----------------|
| SK-305 | Prompt Version Asset Management | CQRS + Immutable Versioning | F1248, F1249 | CORE |
| SK-306 | PromptOps Hybrid RAG Retrieval | Hybrid Vector+Graph | F1253, F1254 | INJECTED |
| SK-307 | Candidate Prompt Generation Pipeline | Critic→Editor→Guard | F1257, F1258, F1259 | INJECTED |
| SK-308 | Eval Suite Construction & Harvest | Harvest + Dedup | F1255, F1256 | INJECTED |
| SK-309 | Canary Promotion Pipeline | Multi-Gate Promotion | F1261, F1262, F1264 | CORE |
| SK-310 | Bandit-Based Prompt Routing | Thompson Sampling | F1263, F1266 | INJECTED |
| SK-311 | Multi-Tenant Prompt Safety | MACHINE/FREEDOM Guard | F1268, F1270 | CORE |
| SK-312 | Prompt Injection Guard Pattern | Data/Instruction Separation | F1259, F1253 | CORE |
| SK-313 | TextGrad-Style Prompt Critique | Structured Critique | F1257, F1252 | INJECTED |
| SK-314 | PromptOps Observability | Trace+Metrics+Audit | F1265, F1266, F1267 | CORE |

---

## SK-305 — Prompt Version Asset Management

PROMOTION_LEVEL: CORE
PATTERN: CQRS + Immutable Versioning
KEY_FACTORIES: F1248 (IPromptTemplateService), F1249 (IPromptVersionService), F1250 (IPromptPolicyService)
PRIMARY_FABRIC: DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

PURPOSE:
  Manages prompt templates and their versioned children as immutable assets.
  Templates define the contract (schemas, guardrails). Versions are immutable revisions.
  Status transitions: candidate → canary → active → deprecated.
  No UPDATE on text field ever. Policy document routes (taskType,nodeType,tenant,budgetMode) to version.

PATTERN IMPLEMENTATION (DNA-compliant):
  # Store new prompt version (candidate)
   doc = new dict[str, Any] {
    ["promptId"] = promptId,
    ["version"] = nextVersion,
    ["parentVersion"] = currentActiveVersion,
    ["templateId"] = templateId,
    ["text"] = candidateText,
    ["status"] = "candidate",
    ["changeSummary"] = changeSummary,
    ["expectedImpact"] = expectedImpact,
    ["createdAt"] = DateTime.UtcNow,
    ["tenantId"] = context.TenantId
  }
   result = await _promptVersionService.StoreDocument(tenantId, doc)
  # Status transition only (text never changes):
   update = new dict[str, Any] { ["status"] = "canary" }
   transition = await _promptVersionService.UpdateStatus(versionId, update)
DNA_PATTERNS_APPLIED:
  DNA-1: parse_document — dict[str, Any] for all prompt assets
  DNA-2: build_search_filter — empty fields skipped on policy lookup
  DNA-3: DataProcessResult[T] — all operations return result wrapper
  DNA-5: Scope Isolation — tenantId on every ES query

IRON_RULES:
  Text field is immutable after initial store. UpdateStatus() only accepts status field.
  parentVersion is mandatory. Orphaned versions (no parent) = BUILD FAILURE.
  status enum: [candidate, canary, active, deprecated]. No freeform values.

REUSE_GUIDANCE:
  Use when: any flow needs versioned asset tracking with lineage and status lifecycle.
  Do NOT use for: typed DTOs, mutable documents, documents without parent lineage.

---

## SK-306 — PromptOps Hybrid RAG Retrieval

PROMOTION_LEVEL: INJECTED
PATTERN: Hybrid Vector+Graph Retrieval over Meta-Memory
KEY_FACTORIES: F1253 (IPromptOpsRagService), F1254 (ITraceIndexService)
PRIMARY_FABRIC: RAG FABRIC (SK-389 (HybridRagStrategy) → Hybrid strategy)

PURPOSE:
  Retrieves evidence packs for the optimization loop from the PromptOps RAG (meta-memory).
  Two retrieval modes: (a) vector — similar failure traces by embedding similarity
  (b) graph — common failure patterns across traces via typed relationship traversal.
  Results merged as local UNION global patterns before returning to optimizer.
  CRITICAL: Always targets promptops_rag_{tenantId}, never operational_rag_{tenantId}.

PATTERN IMPLEMENTATION:
   vectorResults = await _promptOpsRag.SearchAsync(query, strategy: "Vector", topK: 5)
   graphResults  = await _promptOpsRag.SearchAsync(query, strategy: "Graph", depth: 2)
   evidencePack  = MergeEvidencePack(vectorResults, graphResults)
  # MergeEvidencePack: deduplicate by traceId, rank by combined score, cap at maxEvidence

INDEX_NAMESPACE_ENFORCEMENT:
  # Correct:
   idx = $"promptops_rag_{tenantId}"
  # WRONG — BUILD FAILURE:
   idx = $"operational_rag_{tenantId}";  # NEVER cross this boundary

GRAPH_SCHEMA (typed edges):
  (TASK_TYPE) --HAS_FAILURE--> (FAILURE_MODE)
  (FAILURE_MODE) --FIXED_BY--> (PROMPT_PATCH)
  (PROMPT_PATCH) --PRODUCED--> (PROMPT_VERSION)
  (PROMPT_VERSION) --EVALUATED_BY--> (EVAL_SUITE)

DNA_PATTERNS_APPLIED:
  DNA-1: All retrieved documents as dict[str, Any]
  DNA-3: DataProcessResult[EvidencePack]
  DNA-5: tenantId enforced on every RAG query

IRON_RULES:
  Cross-index query (promptops + operational) = BUILD FAILURE
  Empty evidence pack must not block optimization (log warning, continue)
  Graph traversal depth capped at configurable maxDepth (default 3)

---

## SK-307 — Candidate Prompt Generation Pipeline

PROMOTION_LEVEL: INJECTED
PATTERN: Sequential Critic → Editor → Guard with Fabric Calls
KEY_FACTORIES: F1257 (IPromptCriticService), F1258 (IPromptEditorService), F1259 (IPromptGuardService)
PRIMARY_FABRIC: AI ENGINE FABRIC (SK-385/SK-386 (IAiProvider/AiDispatcher) → IAiProvider + AiDispatcher)

PURPOSE:
  Three-stage pipeline to generate a validated candidate prompt version from a judge verdict:
  Stage 1 (Critic): analyzes verdict+evidence → structured critique
  Stage 2 (Editor): generates new prompt text from critique
  Stage 3 (Guard): validates candidate before storage — blocks MACHINE violations, schema breaks, safety regressions

STAGE 1 — CRITIC (multi-model parallel):
   critiqueRequest = new dict[str, Any] {
    ["promptText"] = activeVersionText,
    ["judgeVerdict"] = verdict,
    ["evidencePack"] = evidencePack,
    ["rubric"] = rubricDoc
  }
   critiqueResult = await _aiFabric.GenerateAsync(
    prompt: BuildCritiquePrompt(critiqueRequest),
    strategy: "Multi",       # AiDispatcher: Claude+GPT-4+Gemini parallel
    outputSchema: CritiqueSchema
  )
  # CritiqueSchema enforces: failureModes[], missingConstraints[], ambiguityPoints[], contextEfficiencyScore

STAGE 2 — EDITOR (single primary model):
   editRequest = new dict[str, Any] {
    ["critique"] = mergedCritique,
    ["activePromptText"] = activeVersionText,
    ["templateConstraints"] = templateDoc  # MACHINE fields as constraints
  }
   candidateText = await _aiFabric.GenerateAsync(
    prompt: BuildEditorPrompt(editRequest),
    strategy: "Primary",
    outputSchema: CandidateTextSchema
  )
STAGE 3 — GUARD (required before storage):
   guardResult = await _promptGuardService.ValidateCandidate(candidateText, templateDoc, policyDoc)
  if (!guardResult.IsSuccess) return DataProcessResult[str].Failure("GuardRejected", guardResult.Reason)
  # Only store if guard passes
  await _promptVersionService.StoreDocument(tenantId, BuildCandidateDoc(candidateText, parentVersion))
DNA_PATTERNS_APPLIED:
  DNA-1: All inputs/outputs as dict[str, Any]
  DNA-3: DataProcessResult at every stage — failure propagates cleanly
  DNA-5: tenantId in every AI call context

IRON_RULES:
  Guard (Stage 3) MUST run before storage — skipping = BUILD FAILURE
  IAiProvider.GenerateAsync() only — no direct SDK calls = BUILD FAILURE
  Typed critique schema required — freetext critique cannot feed Stage 2

---

## SK-308 — Eval Suite Construction & Harvest

PROMOTION_LEVEL: INJECTED
PATTERN: Automatic Test Asset Harvest from Production Failures
KEY_FACTORIES: F1255 (IEvalCaseService), F1256 (IEvalSuiteService), F1265 (IPromptTraceService)
PRIMARY_FABRIC: DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

PURPOSE:
  Continuously harvests failed production traces into eval cases that form regression test suites.
  Deduplication prevents suite bloat. PII guard prevents sensitive data in test assets.
  Suite grows automatically as the system encounters new failure patterns.
  Max suite size enforced (default 50 cases); oldest cases pruned.

HARVEST PATTERN:
  # Step 1: PII check (MANDATORY before harvest)
  if (trace["sensitivityClass"] == "private" || trace["sensitivityClass"] == "sensitive")
    return DataProcessResult.Failure("PIIGuard", "Trace too sensitive to harvest")
  # Step 2: Deduplication check
   similar = await _evalCaseService.SearchDocuments(tenantId, build_search_filter(new {
    taskType = trace["taskType"],
    failureModes = trace["failureModes"],  # build_search_filter skips if empty
    inputHash = ComputeHash(trace["inputs"])
  }))
  if (similar.Count > 0) return DataProcessResult.Success("Duplicate", similar[0])
  # Step 3: Build eval case
   evalCase = new dict[str, Any] {
    ["caseId"] = str.NewGuid(),
    ["sourceTraceId"] = trace["traceId"],
    ["taskType"] = trace["taskType"],
    ["nodeType"] = trace["nodeType"],
    ["inputs"] = trace["inputs"],
    ["expectedConstraints"] = ExtractConstraints(rubricDoc),
    ["scoringRubricRef"] = trace["rubricVersionId"],
    ["failureLabels"] = trace["failureModes"],
    ["tenantId"] = tenantId,
    ["harvestedAt"] = DateTime.UtcNow
  }
  # Step 4: Enforce suite size cap
   suite = await _evalSuiteService.GetSuite(tenantId, taskType, nodeType)
  if (suite["caseCount"] >= policy["maxCasesPerSuite"])
    await _evalCaseService.PruneOldest(tenantId, taskType)
  await _evalCaseService.StoreDocument(tenantId, evalCase)
DNA_PATTERNS_APPLIED:
  DNA-1: dict[str, Any] for eval cases
  DNA-2: build_search_filter for deduplication query
  DNA-3: DataProcessResult — PII rejection is a clean Failure, not exception
  DNA-5: tenantId on all queries

IRON_RULES:
  PII check MANDATORY before harvest — failure to check = BUILD FAILURE
  Suite cap enforced: prune before exceed, not after
  Harvested cases must include failureLabels[] (not just "failed")

---

## SK-309 — Canary Promotion Pipeline

PROMOTION_LEVEL: CORE
PATTERN: Multi-Gate Gated Promotion with Deterministic Cohort Assignment
KEY_FACTORIES: F1261 (ICanaryAssignmentService), F1262 (IPromotionDecisionService), F1264 (IRollbackService)
PRIMARY_FABRIC: QUEUE FABRIC (SK-383 (RedisStreamQueue)) + DATABASE FABRIC (SK-382 (ElasticsearchDatabase))

PURPOSE:
  Manages safe rollout of candidate prompt versions to production.
  Deterministic cohort assignment (hash-based) ensures reproducibility.
  Monitors canary metrics vs control; auto-triggers rollback on regression.
  Multi-gate before production: eval PASS + guard clearance + canary success.

CANARY ASSIGNMENT PATTERN:
  # Deterministic — same tenantId always maps to same cohort
   cohortId = HashToCohort(tenantId, seed: candidateId, buckets: 10)
   isCanary = cohortId <= (rolloutPercent / 10)
   assignment = new dict[str, Any] {
    ["tenantId"] = tenantId,
    ["candidateId"] = candidateId,
    ["cohortId"] = cohortId,
    ["isCanary"] = isCanary,
    ["assignedAt"] = DateTime.UtcNow
  }
  await _queueService.EnqueueAsync("canary_assignment_stream", assignment)
REGRESSION MONITORING:
  # Check at each monitoring interval
   canaryMetrics = await _metricsService.GetWindow(candidateId, windowMinutes: 60)
   controlMetrics = await _metricsService.GetWindow(activeVersionId, windowMinutes: 60)
   qualityDelta = canaryMetrics["avgQuality"] - controlMetrics["avgQuality"]
  if (qualityDelta < -0.05) {
    await _queueService.EnqueueAsync("rollback_stream", BuildRegressionEvent(candidateId, qualityDelta))
    return; # IRollbackService handles the rest
  }

PROMOTION GATES (all required):
  Gate 1: eval suite PASS verdict from T476
  Gate 2: IPromptGuardService clearance (no MACHINE violation)
  Gate 3: canary metrics non-regressive (qualityDelta >= -0.02)
  Gate 4: multi-judge agreement (2-of-3 models agree quality >= threshold)
  SINGLE gate failing = REJECTED, not just delayed

IRON_RULES:
  Non-deterministic cohort assignment = BUILD FAILURE
  rolloutPercent > 50 requires explicit override + audit entry
  Auto-rollback must complete within 30 seconds
  Failed candidate archived (not deleted) always

---

## SK-310 — Bandit-Based Prompt Routing

PROMOTION_LEVEL: INJECTED
PATTERN: Thompson Sampling with Reward Decay and Variant Cap
KEY_FACTORIES: F1263 (IPromptRoutingService), F1266 (IPromptMetricsService)
PRIMARY_FABRIC: AI ENGINE FABRIC (SK-386 (AiDispatcher)) + DATABASE FABRIC (SK-382 (ElasticsearchDatabase))

PURPOSE:
  Explores among active prompt variants using Thompson sampling.
  Each variant has a Beta distribution over quality reward; sampling determines which to serve.
  Reward table updated after each node execution. Variants auto-pruned if consistently losing.
  Cap: max 3 variants per (taskType, nodeType, tenant, budgetMode).

THOMPSON SAMPLING PATTERN:
  # Sample from each variant's Beta distribution
   variants = await GetActiveVariants(context); # max 3
   scores = variants.Select(v => SampleBeta(v["alpha"], v["beta"])).ToList()
   selectedIndex = scores.IndexOf(scores.Max())
   selectedVersionId = variants[selectedIndex]["versionId"]
  # Update reward after execution (called from T485 feedback):
   quality = executionResult["judgeScore"]
   reward = quality >= policy["minAcceptableScore"] ? 1 : 0
  await _metricsService.UpdateReward(selectedVersionId, reward)
  # Bayesian update: alpha += reward, beta += (1 - reward)

VARIANT CAP ENFORCEMENT:
  if (activeVariants.Count >= 3) {
    # Prune variant with lowest (alpha / (alpha + beta)) = lowest expected quality
     loser = activeVariants.OrderBy(v => v["alpha"] / (v["alpha"] + v["beta"])).First()
    await DeprecateVariant(loser["versionId"])
    await EmitEvent("VARIANT_PRUNED", loser)
  }

DNA_PATTERNS_APPLIED:
  DNA-1: Reward table as dict[str, Any]
  DNA-3: DataProcessResult for all routing calls
  DNA-5: tenantId scopes variant selection

IRON_RULES:
  Selected version must be ACTIVE or CANARY — DEPRECATED = stale table = BUILD FAILURE
  Variant cap (3) enforced before adding new variant, not after
  explorationRate config cannot exceed 0.20

---

## SK-311 — Multi-Tenant Prompt Safety

PROMOTION_LEVEL: CORE
PATTERN: MACHINE/FREEDOM Boundary Enforcement via Scope Guard
KEY_FACTORIES: F1268 (ITenantPromptProfileService), F1269 (ICrossTenantLearningService), F1270 (IPromptScopeGuardService)
PRIMARY_FABRIC: CORE FABRIC (SK-379 (MicroserviceBase)) + DATABASE FABRIC (SK-382 (ElasticsearchDatabase))

PURPOSE:
  Enforces that tenants can customize FREEDOM fields (style, verbosity, domain hints)
  but cannot modify MACHINE fields (schemas, safety rules, output format contracts).
  Prevents cross-tenant data leakage in the learning aggregation pipeline.
  IPromptScopeGuardService runs in-process (CORE FABRIC) — no remote call for boundary check.

MACHINE/FREEDOM CHECK PATTERN:
   machineFields = templateDoc["machineFields"] as list[str]; # from IPromptTemplateService
  foreach ( field in overrideRequest.Keys) {
    if (machineFields.Contains(field)) {
      await _auditService.LogMachineAccessAttempt(tenantId, field)
      return DataProcessResult[bool].Failure("MachineViolation", $"Field '{field}' is MACHINE-classified")
    }
  }
  # Atomic apply of all FREEDOM fields
   profile = BuildProfileDoc(overrideRequest.Where(f => !machineFields.Contains(f.Key)))
  await _tenantPromptProfileService.StoreDocument(tenantId, profile)
CROSS-TENANT SAFETY:
  # Only include non-sensitive traces in global learning
   eligibleTraces = traces.Where(t =>
    t["sensitivityClass"] == "public" || t["sensitivityClass"] == "internal-aggregated"
  )
  # Global candidate always requires platform-admin approval
   globalCandidate = await _crossTenantService.ProposeGlobalVersion(eligibleTraces)
  globalCandidate["status"] = "pending-admin-review"; # never auto-promote global

DNA_PATTERNS_APPLIED:
  DNA-4: MicroserviceBase — IPromptScopeGuardService inherits 19 components
  DNA-5: tenantId scope on all profile storage
  DNA-3: DataProcessResult — MACHINE violation is Failure, not exception

IRON_RULES:
  Any MACHINE field in override payload = reject entire request (no partial apply)
  Global cross-tenant candidate = pending-admin-review status always
  Private/sensitive traces excluded from all aggregation — no exceptions

---

## SK-312 — Prompt Injection Guard Pattern

PROMOTION_LEVEL: CORE
PATTERN: Data/Instruction Separation with Typed Delimiters
KEY_FACTORIES: F1259 (IPromptGuardService), F1253 (IPromptOpsRagService)
PRIMARY_FABRIC: AI ENGINE FABRIC (SK-385 (IAiProvider) → validator)

PURPOSE:
  Prevents prompt injection attacks in the self-learning loop.
  Retrieved PromptOps RAG content is marked as [DATA] before injection into any prompt.
  Known injection patterns (control-plane keywords, instruction overrides) are blocked.
  Detected injections trigger SECURITY_ALERT event — never silently skipped.

INJECTION GUARD PATTERN:
   blockedPatterns = new[] {
    "PROMOTE", "OVERRIDE MACHINE", "IGNORE PREVIOUS", "NEW INSTRUCTION",
    "SET STATUS", "DEPRECATE", "FORCE PROMOTE"
  }
  foreach ( chunk in retrievedChunks) {
     text = chunk["text"].ToString()
    # Block known injection patterns
    if (blockedPatterns.Any(p => text.Contains(p, StringComparison.OrdinalIgnoreCase))) {
      await _queueService.EnqueueAsync("security_alerts", BuildSecurityAlert(chunk))
      return DataProcessResult.Failure("InjectionDetected", $"Chunk blocked: contains control-plane pattern")
    }

    # Mark as DATA (not INSTRUCTION)
    chunk["role"] = "data"
    chunk["delimiter"] = "<retrieved_context>"
  }

PROMPT CONSTRUCTION (safe injection):
  # Correct:
   prompt = $"Task: {taskInstruction}\n<retrieved_context>\n{markedChunks}\n</retrieved_context>"
  # WRONG — BUILD FAILURE (no delimiter):
   prompt = $"Task: {taskInstruction}\n{rawChunks}"
DNA_PATTERNS_APPLIED:
  DNA-3: DataProcessResult — injection detection is Failure, not exception
  DNA-5: tenantId scopes injection patterns per tenant if custom patterns configured

IRON_RULES:
  Raw chunk injection (no DATA marking) = BUILD FAILURE
  Injection detection → SECURITY_ALERT must fire — silent skip = BUILD FAILURE
  Control-plane keyword list is MACHINE (not configurable by tenant)

---

## SK-313 — TextGrad-Style Prompt Critique

PROMOTION_LEVEL: INJECTED
PATTERN: Structured Critique with Targeted Edit Recommendations
KEY_FACTORIES: F1257 (IPromptCriticService), F1252 (IJudgeRubricService)
PRIMARY_FABRIC: AI ENGINE FABRIC (SK-386 (AiDispatcher) → multi-model via AiDispatcher)

PURPOSE:
  Implements TextGrad-inspired structured critique: models analyze the "gradient" of the
  judge verdict relative to the prompt, producing specific edit recommendations rather
  than vague improvement suggestions. Outputs typed arrays for each failure category.
  Multi-model parallel critique; outputs merged before passing to editor.

CRITIQUE PROMPT STRUCTURE:
  SystemPrompt:
    You are a prompt optimization critic. Analyze the prompt and judge verdict.
    Return ONLY valid JSON matching the CritiqueSchema. No preamble, no markdown.

  CritiqueSchema (required output):
    {
      "failureModes": [{"category": str, "severity": "high|medium|low", "evidence": str}],
      "missingConstraints": [{"constraint": str, "whyNeeded": str}],
      "ambiguityPoints": [{"location": str, "ambiguity": str, "suggestion": str}],
      "formattingIssues": [{"issue": str, "fix": str}],
      "contextEfficiencyScore": float (0.0-1.0),
      "editRecommendations": [{"targetSection": str, "currentText": str, "proposedText": str, "rationale": str}]
    }

MERGE PATTERN (multi-model critiques):
  # Take union of failureModes, deduplicate by category+severity
  # Take intersection of editRecommendations where 2+ models agree
  # contextEfficiencyScore: average across models
   merged = new dict[str, Any] {
    ["failureModes"] = UnionDedup(critiques.Select(c => c["failureModes"])),
    ["editRecommendations"] = IntersectByAgreement(critiques, minAgreement: 2),
    ["contextEfficiencyScore"] = critiques.Average(c => (float)c["contextEfficiencyScore"])
  }
IRON_RULES:
  Critique must use CritiqueSchema — freetext output = BUILD FAILURE
  editRecommendations must include currentText and proposedText (diff-able)
  contextEfficiencyScore required (tracks over-stuffed context)

---

## SK-314 — PromptOps Observability

PROMOTION_LEVEL: CORE
PATTERN: Three-Layer Observability (Trace / Metrics / Audit) with Separate Concerns
KEY_FACTORIES: F1265 (IPromptTraceService), F1266 (IPromptMetricsService), F1267 (IPromptAuditService)
PRIMARY_FABRIC: DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → Elasticsearch)

PURPOSE:
  Three distinct observability layers, each with different retention, query pattern, and mutability:
  - Trace (F1265): per-run, raw, replayable, 30-day retention, mutable (verdict added after judging)
  - Metrics (F1266): time-windowed aggregates, 90-day retention, overwritten per window
  - Audit (F1267): append-only governance trail, 7-year retention, IMMUTABLE

TRACE DOCUMENT SCHEMA:
  {traceId, promptVersionId, ragProfileId, modelId, taskType, nodeType,
   inputTokens, outputTokens, latencyMs, judgeScore, retrievedChunks[],
   failureModes[], ragIngested, tenantId, executedAt}

METRICS DOCUMENT SCHEMA:
  {windowStart, windowEnd, taskType, nodeType, promptVersionId, tenantId, budgetMode,
   avgQuality, p50Latency, p95Latency, p99Latency, avgCost, sampleCount, modelDistribution{}}

AUDIT ENTRY SCHEMA:
  {auditId, eventType, actorId, targetId, beforeState, afterState, evidenceRef, timestamp, tenantId}
  eventType enum: [CANDIDATE_CREATED, CANARY_STARTED, PROMOTED, ROLLBACK, POLICY_CHANGED,
                   MACHINE_ACCESS_BLOCKED, INJECTION_DETECTED, GLOBAL_CANDIDATE_PROPOSED]

INDEX OPERATIONS:
  # Trace: StoreDocument + UpdateDocument (verdict fields added post-judging)
  # Metrics: StoreDocument per window (overwrites previous window for same key)
  # Audit: StoreDocument ONLY — no UpdateDocument, no DeleteDocument
   auditOps = await _auditService.AllowedOperations(); # returns: ["store"]

DNA_PATTERNS_APPLIED:
  DNA-1: All three layers use dict[str, Any]
  DNA-2: build_search_filter on all query paths
  DNA-3: DataProcessResult for all operations
  DNA-5: tenantId on every index operation

IRON_RULES:
  prompt_audit_{tenantId} index: StoreDocument only — any UPDATE or DELETE = BUILD FAILURE
  Trace must be written before optimization loop fires — missing trace = optimization blocked
  Metrics window must have windowStart and windowEnd (no unbounded aggregations)


# ═══════════════════════════════════════════════════════════════
# FLOW-31 — Design Intelligence: Figma Screen Understanding,
#            GraphRAG Module Mapping, Gap Completion
# Skills: SK-315–SK-329 (15 skill patterns)
# ═══════════════════════════════════════════════════════════════

# FLOW-31 — SKILLS FACTORY RAG
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Skills: SK-315–SK-329 (15 skills)

---

## SKILL FORMAT
```
SKILL: SK-### — Name
PATTERN TYPE: [INGESTION|EXTRACTION|ANALYSIS|SYNTHESIS|RETRIEVAL|VALIDATION|LEARNING]
PURPOSE: What problem this skill solves
FABRIC INTERFACES USED: Which fabrics the skill leverages
REUSABLE IN: Other task types / flows that can use this pattern
IMPLEMENTATION PATTERN: Core algorithm / approach
DNA COMPLIANCE: Which DNA patterns enforced
ALTERNATIVE IMPLEMENTATIONS: Node.js / Python / Rust variants
STATE SAVE TRIGGER: When to checkpoint
```

---

## SK-315 — FigmaIngestSkill

```
SKILL: SK-315 — FigmaIngestSkill
PATTERN TYPE: INGESTION
PURPOSE: Authenticated, rate-limited, version-aware ingestion of Figma design files via REST API + plugin events
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (cache layer, version tracking)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (rate-limit token bucket, plugin events)
TASK TYPES USING: T489, T491, T492
REUSABLE IN: Any flow requiring external API ingestion with rate limiting + version tracking (pattern applies to Storybook, Zeroheight, Lottie sources)
IMPLEMENTATION PATTERN:
  1. Check version cache (F1277) → skip if unchanged
  2. Acquire rate-limit token from token bucket (F1278) → block if budget exhausted
  3. Fetch file JSON via REST (F1271) → store in cache with version + tenantId
  4. Fire plugin extraction event to QUEUE FABRIC (F1272) for prototype reactions
  5. Emit ingestion-ready event to QUEUE FABRIC
  KEY: Never fetch without token. Never store without tenantId.
DNA COMPLIANCE:
  - DNA-4 (MicroserviceBase): F1271–F1278 all extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on ALL cache entries + version records
  - DNA-3 (DataProcessResult): all methods return DataProcessResult[T]
  - DNA-1 (parse_document): all Figma JSON stored as dict[str, Any]
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: Same pattern, axios + ioredis token bucket + @elastic/elasticsearch
  Python: requests + redis-py + elasticsearch-py
  Rust: reqwest + fred (redis) + elasticsearch-rs
STATE SAVE TRIGGER: After step 3 (file cached) — resumable from cache on failure
```

---

## SK-316 — DesignIRBuilderSkill

```
SKILL: SK-316 — DesignIRBuilderSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Transform raw Figma JSON node tree into canonical DesignIR (screens[], components[], designTokens, screenMap, prototypeLinks) with no typed models
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (designir_screens, design_ir, component_catalog, token_map indices)
TASK TYPES USING: T490, T492, T493, T494
REUSABLE IN: Any flow requiring structured extraction from hierarchical JSON without typed models (pattern applies to OpenAPI spec parsing, GraphQL schema extraction)
IMPLEMENTATION PATTERN:
  1. Parse raw JSON → dict[str, Any] via parse_document (DNA-1)
  2. Traverse node tree → extract screens[], text layers, component instances
  3. Resolve component instances → main component IDs via F1275
  4. Resolve variable bindings → semantic token roles via F1276
  5. Extract prototype reactions → navigation edges via F1272
  6. Assemble master DesignIR document → F1285
  7. Validate completeness → F1286; emit DesignIR-ready event
  KEY: parse_document at every step. build_search_filter on all ES queries (DNA-2). Zero typed models.
DNA COMPLIANCE:
  - DNA-1 (parse_document): ALL node tree parsing via dict[str, Any]
  - DNA-2 (build_search_filter): ALL Elasticsearch queries skip empty fields
  - DNA-3 (DataProcessResult): no exceptions thrown for business logic errors
  - DNA-5 (Scope Isolation): tenantId + fileKey on all documents
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: JSON tree traversal with Map<str,object>
  Python: dict-based traversal, pydantic disabled for this layer
  PHP: array-based (associative arrays as Dictionary equivalent)
STATE SAVE TRIGGER: After each screen processed (incremental — resumable mid-file on large files)
```

---

## SK-317 — ScreenSemanticsExtractionSkill

```
SKILL: SK-317 — ScreenSemanticsExtractionSkill
PATTERN TYPE: ANALYSIS
PURPOSE: Multimodal AI-powered per-screen semantic extraction: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[] using rendered image + pruned node tree + RAG context
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (SK-386 (AiDispatcher)) → AiDispatcher (parallel Claude Vision + GPT-4o)
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (Hybrid: module signatures + archetype exemplars)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (multiple semantic indices)
TASK TYPES USING: T498, T499, T500
REUSABLE IN: Any flow requiring multimodal AI analysis of visual + structural content with evidence requirement (medical imaging analysis, document understanding, diagram parsing)
IMPLEMENTATION PATTERN:
  1. Render frame image (F1274) → get imageUrl
  2. Build multimodal prompt: pruned node tree + text layers + component names + image + RAG context (F1288)
  3. Dispatch to AiDispatcher → Claude Vision + GPT-4o compete (F1287)
  4. Parse each model output → dict[str, Any] (DNA-1)
  5. Classify archetype (F1289), extract entities (F1290), detect actions (F1291)
  6. Build evidence map — every claim linked to nodeId/text/component (F1292)
  7. Validate evidence coverage gate (F1334) → PASS or HUMAN_REVIEW
  8. Generate intent summary (F1293)
  9. Store ScreenSemanticsIR + emit ready event
  KEY: Evidence gate is non-negotiable. Every claim needs evidence.
DNA COMPLIANCE:
  - DNA-1 (parse_document): all AI outputs stored as dict[str, Any]
  - DNA-4 (MicroserviceBase): all orchestrating services extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on all semantic indices
  - DNA-3 (DataProcessResult): pipeline never throws; all failures → DataProcessResult.Failure
EVIDENCE REQUIREMENT PATTERN (critical):
  Every claim in output MUST have evidence[]:
  { claimType: "module|action|entity", claim: "Cart", evidence: [{nodeId:"5:32", text:"Add to Cart", componentName:"Button/Primary"}] }
  Claims with no evidence → stripped from output and flagged in validation log
ALTERNATIVE IMPLEMENTATIONS:
  Node.js: Same via Anthropic SDK + OpenAI SDK through IAiProvider abstraction
  Python: anthropic + openai clients through IAiProvider
STATE SAVE TRIGGER: After each screen's evidence map validated (per-screen checkpoint)
```

---

## SK-318 — UIGraphBuildSkill

```
SKILL: SK-318 — UIGraphBuildSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Build property graph from DesignIR + SemanticsIRs: Screen/Component/ControlType/Action/Entity nodes with typed edges (CONTAINS, USES, HAS_ACTION, OPERATES_ON, NAVIGATES_TO, VARIANT_OF)
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (ui_graph_nodes, ui_graph_edges, navigation_flows, merged_screen_graph indices)
TASK TYPES USING: T501, T502, T504
REUSABLE IN: Any flow requiring property graph construction from structured documents (BOM graph, API dependency graph, knowledge graph from documents)
IMPLEMENTATION PATTERN:
  1. For each screen: create Screen node with embedding + metadata (F1295, F1296)
  2. For each component instance: create Component node; link CONTAINS edge + VARIANT_OF edge to main component
  3. For each control type: create ControlType node; link USES edge from Screen
  4. For each action: create Action node; link HAS_ACTION edge from Screen
  5. For each entity: create Entity node; link OPERATES_ON edge from Action
  6. For each NAVIGATES_TO prototype reaction: create directed edge Screen→Screen
  7. Merge cross-screen entities (same Order = same node) via F1303
  8. Index all nodes with embeddings for hybrid retrieval
  KEY: TenantId on every node. Entity deduplication across screens.
DNA COMPLIANCE:
  - DNA-1: all node properties as dict[str, Any]
  - DNA-5: tenantId + fileKey on all nodes
  - DNA-2: build_search_filter on all graph queries
GRAPH NODE SCHEMA:
  { nodeId, nodeType, tenantId, fileKey, screenId?, label, properties: dict[str, Any], embedding: float[] }
GRAPH EDGE SCHEMA:
  { edgeId, edgeType, sourceNodeId, targetNodeId, tenantId, fileKey, weight?, properties: dict[str, Any] }
ALTERNATIVE IMPLEMENTATIONS:
  Neo4j: Cypher CREATE nodes + relationships (still through DATABASE FABRIC IDatabaseService)
  Python: networkx for in-memory graph + ES for persistence
STATE SAVE TRIGGER: After each batch of 50 nodes indexed
```

---

## SK-319 — GraphRAGRetrievalSkill

```
SKILL: SK-319 — GraphRAGRetrievalSkill
PATTERN TYPE: RETRIEVAL
PURPOSE: Multi-hop graph retrieval: vector similarity → graph traversal → constraint pull — combining RAG FABRIC (Graph strategy) with DATABASE FABRIC traversal for architecture-level answers
FABRIC INTERFACES USED:
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (Graph strategy + Vector strategy)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (graph traversal, module signature lookup)
TASK TYPES USING: T506, T509, T512
REUSABLE IN: Any flow requiring relational retrieval beyond flat similarity (knowledge graph QA, impact analysis, dependency chain lookup)
IMPLEMENTATION PATTERN:
  STEP 1 — Vector similarity (F1307):
    kNN search on screen_embeddings → top-K similar screens
  STEP 2 — Graph traversal from similar screens (F1302):
    For each similar screen: traverse MAPS_TO_MODULE edges → get module candidates
    Traverse REQUIRES_MODULE edges from system_type_graph → get constraints
  STEP 3 — Module signature pull (F1298):
    For each candidate module: retrieve signature subgraph (component types, action types)
  STEP 4 — Constraint validation (F1313):
    Check candidate module set against dependency constraints
  STEP 5 — Aggregate and rank:
    Score = (vector_sim × 0.3) + (graph_hop_score × 0.2) + (evidence_match × 0.5)
  KEY: Never return cross-tenant graph results. build_search_filter(tenantId) always.
DNA COMPLIANCE:
  - DNA-2 (build_search_filter): tenantId filter on every graph query
  - DNA-3 (DataProcessResult): retrieval failures → empty result, never throw
RETRIEVAL RESULT SCHEMA:
  { queryScreenId, results: [{moduleId, confidence, evidence[], graphPath[], vectorSimilarity}] }
ALTERNATIVE IMPLEMENTATIONS:
  Neo4j: native MATCH traversal (still through IDatabaseService)
  Python: graph-tool + ES for hybrid retrieval
STATE SAVE TRIGGER: After vector step complete (expensive); graph traversal checkpointed per hop
```

---

## SK-320 — VectorEmbeddingSkill

```
SKILL: SK-320 — VectorEmbeddingSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Multi-signal vector embedding for screens, components, archetypes; with caching by (id + version + modelId) to prevent redundant embedding
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (SK-385 (IAiProvider)) → IAiProvider (embedding endpoint)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (dense_vector indices), Redis (embedding cache)
TASK TYPES USING: T505, T506
REUSABLE IN: Any flow requiring embedding generation with deduplication (document similarity, code similarity, entity matching)
IMPLEMENTATION PATTERN:
  1. Check embedding cache (F1309) by key = {entityId}_{version}_{modelId}
  2. If cache hit → return cached embedding
  3. If cache miss:
     a. Build embedding text: concatenate text content + component names + layout type + intent summary
     b. Call IAiProvider.EmbedAsync() → returns float[] (DNA: never call openai.embeddings.create() directly)
     c. Store in Elasticsearch dense_vector field (F1304/F1305/F1306)
     d. Cache in Redis with TTL (F1309)
  4. Return DataProcessResult[dict[str, Any]] with embeddingId
  KEY: Cache key must include modelId — different models produce incompatible embeddings.
DNA COMPLIANCE:
  - DNA-4 (MicroserviceBase): F1304–F1309 all extend MicroserviceBase
  - DNA-5 (Scope Isolation): tenantId on all embedding documents
  - DNA-3 (DataProcessResult): embedding failures → DataProcessResult.Failure with reason
CACHE KEY PATTERN: "{entityType}:{entityId}:{version}:{modelId}"
ALTERNATIVE IMPLEMENTATIONS:
  Python: sentence-transformers for local embedding (through IAiProvider abstraction)
  Node.js: OpenAI SDK embedding endpoint (through IAiProvider)
STATE SAVE TRIGGER: After every 100 embeddings generated (batch checkpoint)
```

---

## SK-321 — ModuleMappingSkill

```
SKILL: SK-321 — ModuleMappingSkill
PATTERN TYPE: CLASSIFICATION
PURPOSE: Map each screen to Genie DNA modules using scoring formula: evidence_weight×0.5 + vector_sim×0.3 + graph_hop_score×0.2; validate against module matrix constraints
FABRIC INTERFACES USED:
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (Hybrid strategy)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (module_candidates, constraint_checks, wiring_plans)
TASK TYPES USING: T508, T509, T511
REUSABLE IN: Any flow requiring constraint-satisfaction classification against a known ontology (product category classification, content type routing, service routing)
IMPLEMENTATION PATTERN:
  1. Load module matrix constraints (F1310) from cache or ES
  2. Execute vector similarity search for screen (SK-319 step 1)
  3. Execute graph traversal for module signatures (SK-319 steps 2-4)
  4. Calculate deterministic evidence match score: count evidence items matching module signature
  5. Combine scores: total = (evidence × 0.5) + (vector_sim × 0.3) + (graph × 0.2)
  6. Filter by confidence floor (admin-configurable FREEDOM)
  7. Run constraint satisfaction check (F1313): dependency rules from module matrix
  8. Store candidates as dict[str, Any] in module_candidates index
  9. On full-file completion: build wiring plan (F1314) + config doc requirements (F1315)
  KEY: Scoring formula weights must sum to 1.0. Constraint check is mandatory.
  MODULE MATRIX SCORING EXAMPLE:
    Screen has: ProductCard (component), "Add to Cart" (text), price badge (widget)
    → Cart module: evidence=3 items, vector_sim=0.87 to "Store Checkout" archetype, graph=Cart signature match
    → Cart confidence = (3/5 × 0.5) + (0.87 × 0.3) + (1.0 × 0.2) = 0.30 + 0.26 + 0.20 = 0.76 ✅
DNA COMPLIANCE:
  - DNA-1: all candidate documents as dict[str, Any]
  - DNA-2: build_search_filter on all module lookups (tenantId always)
  - DNA-5: scope isolation on all candidate indices
  - DNA-6 (DynamicController): module wiring plan does NOT create entity-specific controllers
WIRING PLAN OUTPUT SCHEMA:
  { fileKey, tenantId, version, screenAssignments: [{ screenId, modules: [{ moduleName, confidence, configDocs: string[] }] }] }
ALTERNATIVE IMPLEMENTATIONS:
  Python: scikit-learn for scoring; Neo4j for constraint graph
STATE SAVE TRIGGER: After each screen's candidates validated (per-screen checkpoint)
```

---

## SK-322 — SystemTypeInferenceSkill

```
SKILL: SK-322 — SystemTypeInferenceSkill
PATTERN TYPE: CLASSIFICATION
PURPOSE: Aggregate per-screen module evidence across all screens to infer system type (shop/social/events/hotel/dashboard/etc.) with calibrated confidence and rationale
FABRIC INTERFACES USED:
  - AI ENGINE FABRIC (SK-386 (AiDispatcher)) → AiDispatcher (multi-model competition)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (system_type_inferences, module_evidence_aggregate, site_type_signatures)
TASK TYPES USING: T510
REUSABLE IN: Any flow requiring multi-signal classification at a document/portfolio level by aggregating sub-document classifications (document type inference, project category classification)
IMPLEMENTATION PATTERN:
  1. Aggregate module evidence across all screens (F1318):
     - Count: how many screens show each module?
     - Weight: entry-screen modules weighted 1.5× (they define system intent)
  2. Load site-type signatures (F1319): canonical module sets per system type
  3. Match signatures: cosine similarity between observed module set and each system type signature
  4. Multi-model classification (F1317): Claude + GPT-4o both see aggregated evidence → each votes on top-2 system types
  5. Consistency check (F1320): does inferred system type's required modules match observed?
  6. Rank candidates (F1321): by match_score × consistency_score; flag ambiguous if top < 0.7
  7. Build SystemModelIR (F1322): system_type_candidates, module_map, flows[], entity_map
  KEY: Never "definitive" label if confidence < 0.7. Always include rationale with module evidence.
DNA COMPLIANCE:
  - DNA-3 (DataProcessResult): classification failures never throw
  - DNA-5: tenantId on all inference documents
SYSTEM TYPE SIGNATURES (from module-architecture matrix):
  store: Catalog + Cart + Checkout + Pricing (required); Promotions + Inventory (typical)
  social: Feed + Profile + Engagement (required); Messaging + Events (typical)
  events: Events + Booking + Availability + Cancellation (required); Invoices (typical)
  hotel: Availability + Booking + Cancellation + Invoices (required); Reviews (typical)
  dashboard/report: EntityViewer + Analytics (required); Financial (conditional)
  freelancer: Profile + Marketplace + Messaging + Invoices (required)
ALTERNATIVE IMPLEMENTATIONS:
  Python: sklearn for multiclass scoring + custom signature matching
STATE SAVE TRIGGER: After aggregation step (before multi-model competition)
```

---

## SK-323 — GapCompletionSkill

```
SKILL: SK-323 — GapCompletionSkill
PATTERN TYPE: ANALYSIS
PURPOSE: Detect missing modules/screens/flows by comparing inferred system type + wiring plan against module matrix expectations + flow completeness rules; generate Genie DNA stubs for critical gaps
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (gap_reports, missing_modules, missing_screens, flow_gaps)
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (Graph strategy, dependency traversal)
  - AI ENGINE FABRIC (SK-386 (AiDispatcher)) → AiDispatcher (stub generation for critical gaps)
  - FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) → IFlowOrchestrator (stub injection)
TASK TYPES USING: T512, T513
REUSABLE IN: Any flow requiring completeness analysis against an ontology (API surface coverage check, test coverage analysis, schema coverage validation)
IMPLEMENTATION PATTERN:
  GAP DETECTION (T512):
  1. Load system type constraints: required modules for detected system type (F1310)
  2. Compare: wiring plan modules vs required modules → missing modules[]
  3. Load module dependency map (F1301): if Cart exists, Checkout must exist OR "cart-only" declared
  4. Check screen completeness: if Checkout module present, Order Confirmation screen must exist
  5. Check flow completeness: all NAVIGATES_TO paths must terminate at a known terminal (not dead-end)
  6. Assign severity: CRITICAL (required module missing), HIGH (dependency violation), MEDIUM (screen missing), LOW (optional recommended)
  7. Build gap report (F1327) → emit gap-found events
  STUB GENERATION (T513 — CRITICAL + HIGH only):
  8. For each critical gap: load module stub template from RAG (SK-319)
  9. Generate config doc stub using AiDispatcher (AF-1): uses module template + system type context
  10. Validate stub: DNA-1 (no typed models), DNA-6 (DynamicController)
  11. Inject as GENERATED-tier artifact into FlowOrchestrator
  12. Run BFA check on stubs before injection (CF-706)
  KEY: NEVER auto-inject stubs without BFA check. CRITICAL gaps block promotion.
DNA COMPLIANCE:
  - All stubs: DNA-1 (parse_document), DNA-4 (MicroserviceBase), DNA-6 (DynamicController)
  - GENERATED tier — not CORE or MINIMAL
SEVERITY TAXONOMY:
  CRITICAL: Required module for detected system type is absent
  HIGH: Module dependency constraint violated
  MEDIUM: Complementary screen missing (e.g., empty state, confirmation screen)
  LOW: Optional module recommended by matrix
STATE SAVE TRIGGER: After gap detection complete (before stub generation starts)
```

---

## SK-324 — LearningLoopSkill

```
SKILL: SK-324 — LearningLoopSkill
PATTERN TYPE: LEARNING
PURPOSE: Continuous improvement: corrections → exemplar injection → benchmark evaluation → calibration update; implements AF-11 (Feedback) for FLOW-31
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (feedback_corrections, label_benchmark, confidence_scores)
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (exemplar injection to retrieval corpus)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (correction events, learning cycle events)
  - AI ENGINE FABRIC (SK-386 (AiDispatcher)) → AiDispatcher (benchmark re-scoring)
TASK TYPES USING: T514, T515
REUSABLE IN: Any AI-powered flow requiring continuous improvement from user feedback (AI content pipeline quality improvement, code generation calibration, recommendation refinement)
IMPLEMENTATION PATTERN:
  SINGLE CORRECTION (T514 — AF-11):
  1. Store correction (F1329): screenId, before, after, reason, userId, tenantId, timestamp
  2. Determine exemplar type:
     - Correction says "was wrong" → inject negative exemplar (F1330) tagged with original model output
     - User confirms mapping is correct → inject positive exemplar (F1331)
  3. Queue calibration update event to QUEUE FABRIC
  4. Log to audit trail
  LEARNING CYCLE (T515 — scheduled):
  5. Aggregate all corrections since last cycle
  6. Batch inject accumulated exemplars into RAG corpus (negative + positive)
  7. Run benchmark: score current model against labeled ground truth (F1332)
  8. Compare metrics: accuracy/precision/recall per module; calibration curve
  9. If accuracy drop > 5% → HUMAN_REVIEW required before applying
  10. If pass → update confidence scoring model (F1312)
  11. Store cycle results with modelVersions + timestamp
  KEY: Never apply learning results without benchmark validation. Human review for accuracy drops.
DNA COMPLIANCE:
  - DNA-5: tenantId on all correction + benchmark documents
  - DNA-3: learning failures → DataProcessResult.Failure, never corrupt confidence scores
CORRECTION SCHEMA:
  { correctionId, screenId, fileKey, tenantId, userId, correctionType, before: {}, after: {}, reason, modelOutput: {}, judgeVerdict: {}, timestamp }
BENCHMARK METRICS SCHEMA:
  { cycleId, tenantId, timestamp, modelVersions: {}, metrics: { accuracy, precisionPerModule: {}, recallPerModule: {}, calibrationError }, vsLastCycle: { delta, regressions: [] } }
STATE SAVE TRIGGER: After exemplar injection; before benchmark run (expensive)
```

---

## SK-325 — EvidenceCoverageGateSkill

```
SKILL: SK-325 — EvidenceCoverageGateSkill
PATTERN TYPE: VALIDATION
PURPOSE: Hard quality gate — every AI-inferred claim must reference ≥1 evidence item; implements Evidence Coverage Gate (CF-675); separates AI generation from validation concerns
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (evidence_maps, gate_results)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (gate events — PASS/FAIL/HUMAN_REVIEW)
TASK TYPES USING: T499, all AF-9 calls in FLOW-31
REUSABLE IN: Any AI generation flow requiring grounded outputs (medical diagnosis must cite symptoms, legal analysis must cite precedents, code generation must cite requirements)
IMPLEMENTATION PATTERN:
  1. Load ScreenSemanticsIR from ES
  2. For each claim in output (module/action/entity):
     a. Check claim has evidence[] array
     b. Check evidence[] has ≥1 item
     c. Check each evidence item has: nodeId OR textLayer OR componentName
  3. Count: claimsWithEvidence / totalClaims → coverage ratio
  4. Apply policy:
     - coverage = 1.0 → PASS
     - 0.8 ≤ coverage < 1.0 → WARN (non-critical claims allowed without evidence)
     - coverage < 0.8 → FAIL → screen queued for HUMAN_REVIEW
  5. Store gate result in gate_results index
  6. Emit gate event to QUEUE FABRIC
  KEY: CRITICAL claims (module/entity) require coverage = 1.0. Actions can be WARN.
DNA COMPLIANCE:
  - DNA-3: gate failures never throw — always DataProcessResult.Failure with details
  - DNA-5: gate results scoped by tenantId + screenId
GATE RESULT SCHEMA:
  { gateId, screenId, tenantId, verdict: PASS|WARN|FAIL|HUMAN_REVIEW, coverageRatio, failedClaims: [], timestamp }
STATE SAVE TRIGGER: Stateless gate — no save needed per run; results written to ES atomically
```

---

## SK-326 — MultimodalPromptSkill

```
SKILL: SK-326 — MultimodalPromptSkill
PATTERN TYPE: SYNTHESIS
PURPOSE: Build structured multimodal prompts combining pruned node tree + text layers + component names + rendered image URL + RAG-retrieved context for AI screen analysis
FABRIC INTERFACES USED:
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (Hybrid — retrieves module signatures + archetype exemplars as context)
  - AI ENGINE FABRIC (SK-385 (IAiProvider)) → IAiProvider (prompt dispatch)
TASK TYPES USING: T498
REUSABLE IN: Any flow combining structured data + visual data for AI analysis (document + scan analysis, data sheet + product image analysis)
IMPLEMENTATION PATTERN:
  1. Prune node tree: remove decoration nodes (text="", fills only, no component name, bounding box < 10px)
  2. Extract: text layers[], component instance names[], auto-layout labels[]
  3. Retrieve RAG context (F1288):
     - Vector: top-3 similar screens from archetype embeddings
     - Graph: module signatures for top-3 candidate modules (from deterministic features)
  4. Build prompt XML structure:
     <screen_analysis>
       <node_tree_pruned>{pruned JSON}</node_tree_pruned>
       <text_layers>{text[]}</text_layers>
       <component_instances>{names[]}</component_instances>
       <layout_semantics>{auto-layout labels}</layout_semantics>
       <image_url>{rendered frame URL}</image_url>
       <rag_context>
         <similar_screens>{top-3}</similar_screens>
         <module_signatures>{candidate module signatures}</module_signatures>
       </rag_context>
       <output_schema>{ScreenSemanticsIR JSON schema}</output_schema>
     </screen_analysis>
  5. Add output constraint: "Return ONLY valid ScreenSemanticsIR JSON. Every claim MUST have evidence[]."
  KEY: Include output schema in prompt. Inject evidence requirement explicitly.
DNA COMPLIANCE:
  - DNA-1: prompt construction never creates typed model objects
  - DNA-3: prompt build failures → DataProcessResult.Failure
PROMPT TEMPLATE VARIANTS (FREEDOM):
  technical: verbose node tree, detailed module names
  user-facing: simplified descriptions, business module names
STATE SAVE TRIGGER: After RAG context retrieved (expensive step); prompt build is fast
```

---

## SK-327 — DesignTokenSkill

```
SKILL: SK-327 — DesignTokenSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Resolve Figma variable bindings to semantic token roles (color-primary, spacing-md, heading-1); enable token-aware module matching
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (design_token_map index)
TASK TYPES USING: T492
REUSABLE IN: Any flow processing design system tokens (Storybook token extraction, CSS variable semantic mapping, design-to-code token generation)
IMPLEMENTATION PATTERN:
  1. Fetch all variables/modes from Figma API (F1271)
  2. Build alias resolution chain: variableId → aliasTarget → ... → primitiveValue
  3. Detect cycle (max depth 5): if cycle found → DataProcessResult.Warning
  4. Map resolved value to semantic role via taxonomy:
     - Color tokens: brand.primary, brand.secondary, semantic.success, semantic.error, neutral.XXX
     - Spacing tokens: spacing.xs(4), spacing.sm(8), spacing.md(16), spacing.lg(24), spacing.xl(48)
     - Typography: heading.1-6, body.large/regular/small, label.large/small, caption
  5. Store token map as dict[str, Any] in ES (scope: tenant + fileKey)
  6. Return: tokenMap{variableId → {semanticRole, resolvedValue, mode}}
  KEY: Never hardcode resolved values in output (DNA-2 pattern: always reference by semantic role)
DNA COMPLIANCE:
  - DNA-1: token map stored as Dictionary, never as TokenModel
  - DNA-5: token map scoped to tenant + fileKey
SEMANTIC ROLE TAXONOMY (extensible by admin):
  Color: brand.*, semantic.*, neutral.*, elevation.*, on.*
  Spacing: spacing.xs through spacing.xxl
  Typography: heading.*, body.*, label.*, caption.*
STATE SAVE TRIGGER: After alias chain resolution complete; mapping is fast from that point
```

---

## SK-328 — PrototypeFlowExtractionSkill

```
SKILL: SK-328 — PrototypeFlowExtractionSkill
PATTERN TYPE: EXTRACTION
PURPOSE: Extract Figma prototype reactions (triggers + actions) via plugin, build navigation flow graph DAG, detect entry points and flow boundaries
FABRIC INTERFACES USED:
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (plugin→server event pipeline)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (navigation_flows index)
TASK TYPES USING: T493, T504
REUSABLE IN: Any flow requiring user journey extraction from prototype tools (InVision flow extraction, Marvel prototype parsing, Axure interaction extraction)
IMPLEMENTATION PATTERN:
  1. Listen for plugin extraction event on QUEUE FABRIC (F1272)
  2. Parse reactions per frame: trigger{type, delay} + action{type, destinationId, transition}
  3. Normalize reaction → canonical edge:
     {sourceFrameId, targetFrameId, trigger: "TAP|DRAG|HOVER|KEY|TIMER", actionType: "NAVIGATE_TO|OPEN_OVERLAY|SWAP_STATE|CLOSE|SCROLL_TO"}
  4. Detect entry points: frames with no incoming NAVIGATE_TO edge AND marked as flow starting point
  5. Detect terminals: frames with no outgoing NAVIGATE_TO edges (or explicitly marked terminal)
  6. Build DAG: validate acyclic (BFS cycle detection); if cycle → flag as REVIEW
  7. Store navigation_flow as dict[str, Any] in ES: {fileKey, tenantId, flows:[{flowId, entryFrameId, edges:[], terminalFrameIds:[]}]}
  KEY: NEVER direct HTTP to plugin. Always via QUEUE FABRIC. DAG must be validated before storage.
DNA COMPLIANCE:
  - DNA-1: all reaction data as Dictionary
  - DNA-5: flows scoped to tenant + fileKey
  - DNA-4: F1272 extends MicroserviceBase
REACTION TAXONOMY:
  Triggers: ON_CLICK, ON_DRAG, ON_HOVER_IN/OUT, ON_KEY_DOWN, AFTER_TIMEOUT, ON_COMPONENT_ACTION
  Actions: NAVIGATE, OVERLAY (open/close), SCROLL_TO, SWAP (variant), SET_VARIABLE, CONDITIONAL
STATE SAVE TRIGGER: After DAG validation; before ES storage
```

---

## SK-329 — FeedbackCorrectionSkill

```
SKILL: SK-329 — FeedbackCorrectionSkill
PATTERN TYPE: LEARNING
PURPOSE: Structured capture, validation, and routing of user corrections for design intelligence outputs; implements AF-11 feedback loop with audit trail
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (feedback_corrections index)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (correction events for async processing)
  - RAG FABRIC (SK-389 (HybridRagStrategy)) → IRagService (exemplar injection)
TASK TYPES USING: T514
REUSABLE IN: Any AI flow requiring structured human feedback capture with audit trail (content moderation feedback, recommendation correction, classification improvement)
IMPLEMENTATION PATTERN:
  1. Receive correction payload: {screenId, correctionType, before:{}, after:{}, reason, userId}
  2. Validate correction:
     - correctionType ∈ [WRONG_ARCHETYPE, WRONG_MODULE, WRONG_SYSTEM_TYPE, MISSING_GAP, FALSE_GAP]
     - before{} references valid screenId + version in ES
     - after{} is valid ScreenSemanticsIR fragment (schema check)
  3. Enrich correction: add {tenantId, timestamp, modelOutput, judgeVerdict} from ES lookup
  4. Store in feedback_corrections index (scope: tenant)
  5. Emit correction event to QUEUE FABRIC → async processing
  6. On processing:
     a. Determine exemplar type: before was wrong → negative; after is confirmed → positive
     b. Route to F1330 (negative) or F1331 (positive) exemplar injector
     c. Check if correction count threshold crossed → queue T515 learning cycle
  7. Acknowledge correction to caller with DataProcessResult.Success
  KEY: Audit trail is mandatory (userId + timestamp always). Never silently drop corrections.
DNA COMPLIANCE:
  - DNA-5: corrections scoped to tenant
  - DNA-3: correction failures → DataProcessResult.Failure with reason
  - DNA-4: F1329–F1331 extend MicroserviceBase
CORRECTION TYPE ROUTING:
  WRONG_ARCHETYPE → negative on archetype classification output → positive on correct archetype
  WRONG_MODULE → negative on module candidate → positive on correct module + update evidence map
  WRONG_SYSTEM_TYPE → negative on system type inference → positive on correct type
  MISSING_GAP → positive exemplar: "this gap IS critical for this system type"
  FALSE_GAP → negative exemplar: "this gap is NOT critical for this system type"
STATE SAVE TRIGGER: After step 4 (stored to ES) — correction is durable; async processing can retry
```

---

## SKILL DEPENDENCY MAP

```
SK-315 (FigmaIngest) → SK-316 (DesignIRBuilder)
SK-316 → SK-317 (ScreenSemantics) + SK-327 (DesignToken) + SK-328 (PrototypeFlow)
SK-317 → SK-325 (EvidenceCoverageGate) + SK-326 (MultimodalPrompt)
SK-325 → SK-318 (UIGraphBuild)
SK-318 → SK-319 (GraphRAGRetrieval) + SK-320 (VectorEmbedding)
SK-319 + SK-320 → SK-321 (ModuleMapping)
SK-321 → SK-322 (SystemTypeInference)
SK-322 → SK-323 (GapCompletion)
SK-323 → SK-324 (LearningLoop)
SK-324 → SK-329 (FeedbackCorrection) [bidirectional — corrections feed SK-324]
```

---

## AF STATION MAPPING FOR FLOW-31

| AF Station | Role in FLOW-31 |
|-----------|-----------------|
| AF-1 Genesis | Generates ScreenSemanticsIR (T498), stub config docs (T513), intent summaries (T500) |
| AF-2 Planning | Decomposes large files into screen batches (T489), identifies user flows (T504) |
| AF-3 Prompt Library | Retrieves module signature prompts for T498 multimodal prompt |
| AF-4 RAG Task Context | Hybrid retrieval for T498 (archetype exemplars + module signatures), T509 (GraphRAG) |
| AF-5 Multi-model | Competing models for T498 (Claude Vision + GPT-4o), T510 (system type), T515 (benchmark) |
| AF-6 Code Review | Validates generated stubs (T513) — structure review |
| AF-7 Compliance | DNA-1 check (no typed models) everywhere; DNA-5 (scope isolation) |
| AF-8 Security | PII check in Figma file metadata (T489); image URL policy (T491); stub security (T513) |
| AF-9 Judge | Evidence coverage gate (T499), schema validity, constraint satisfaction, gap severity |
| AF-10 Merge | Combines competing ScreenSemanticsIR outputs (T498), system type votes (T510) |
| AF-11 Feedback | T514 single correction injection; T515 learning cycle orchestration |


---

## BACKWARD COMPATIBILITY STATEMENT

All previously defined skills (SK-1–SK-314) are unchanged. FLOW-31 is additive only.
-e 

---

# ═══════════════════════════════════════════════════════
# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE
# Added: 2026-03-03 | SK-330-SK-345
# ═══════════════════════════════════════════════════════

# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE — SKILLS FACTORY RAG
## Date: 2026-03-03 | Skills: SK-330-SK-345 (16 skills)
## Extends: SKILLS_FACTORY_RAG_MERGED.md (SK-1-SK-329)

---

## SK-330 — TemplatePackagingSkill

```
SKILL: SK-330 — TemplatePackagingSkill
PATTERN TYPE: PACKAGING
PURPOSE: Create immutable, versioned template packages from flow definitions with manifest, semver, parameter schemas, and content-addressable artifact storage
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (template_packages, template_manifests, template_artifacts indices)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (semver logic, hash computation)
TASK TYPES USING: T516, T517, T518
REUSABLE IN: Any flow requiring immutable artifact packaging with dependency declaration and versioning (plugin systems, module registries, configuration package distribution)
IMPLEMENTATION PATTERN:
  1. Receive flow definition(s) + metadata as dict[str, Any]
  2. Validate manifest: declared factories exist, parameters typed, deps acyclic
  3. Compute content-addressable hash (SHA-256) for each artifact
  4. Create package document: {packageId, version, manifest, artifactHashes, tenantId, createdAt}
  5. Store in template_packages index via DATABASE FABRIC
  6. Version immutability: published versions NEVER modified (new version = new document)
  7. Return DataProcessResult.Success with packageId + version
  KEY: Immutability is non-negotiable. Test by attempting to overwrite — must fail.
DNA COMPLIANCE:
  - DNA-1: All package data as dict[str, Any], no TemplatePackage class
  - DNA-3: DataProcessResult[T] for all operations
  - DNA-5: tenantId on every package document
STATE SAVE TRIGGER: After step 5 (stored to ES) — package is durable
```

---

## SK-331 — ManifestValidationSkill

```
SKILL: SK-331 — ManifestValidationSkill
PATTERN TYPE: VALIDATION
PURPOSE: Deep-validate template manifests against factory registry, parameter type system, and dependency graph acyclicity
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (factory registry cross-reference)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (graph cycle detection)
TASK TYPES USING: T517, T521
REUSABLE IN: Any dependency manifest validation (plugin dependency resolution, module compatibility checking)
IMPLEMENTATION PATTERN:
  1. Parse manifest via parse_document (DNA-1)
  2. Extract declared factory references → cross-check against factory registry (F1-F1418)
  3. Extract parameter schemas → validate types ∈ {str, number, enum, secret_ref, connection_ref, dataset_ref}
  4. Build dependency graph → topological sort → detect cycles (cycle = REJECT)
  5. Validate engine version requirement against current engine version (semver range)
  6. Store validation result in template_manifests index
  7. Return DataProcessResult with validation summary
  KEY: secret_ref parameters must NEVER have default values (references only)
DNA COMPLIANCE:
  - DNA-1: Manifest as dict[str, Any]
  - DNA-2: build_search_filter for factory registry lookups (skip empty fields)
  - DNA-3: Validation failures returned as DataProcessResult.Failure, not exceptions
```

---

## SK-332 — MarketplaceDiscoverySkill

```
SKILL: SK-332 — MarketplaceDiscoverySkill
PATTERN TYPE: SEARCH
PURPOSE: Full-text search with faceted filtering for marketplace listings; composite ranking (relevance + quality score); visibility enforcement
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (marketplace_listings, quality_scores indices)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (ranking computation)
TASK TYPES USING: T519, T520
REUSABLE IN: Any marketplace search requiring faceted navigation with quality-based ranking (product catalogs, service directories)
IMPLEMENTATION PATTERN:
  1. Receive search query + facets as dict[str, Any]
  2. Apply build_search_filter — auto-skip empty facets (DNA-2)
  3. Execute full-text search against marketplace_listings via DATABASE FABRIC
  4. For each result, fetch quality_score from quality_scores index
  5. Compute composite rank = (relevance * 0.6) + (quality_score * 0.4) — weights FREEDOM-configurable
  6. Filter results by visibility: private → only owner+allowlist; unlisted → only direct link; public → all
  7. Return ranked, filtered results as DataProcessResult<List<dict[str, Any]>>
  KEY: Visibility enforcement is MACHINE (non-configurable). Ranking weights are FREEDOM.
DNA COMPLIANCE:
  - DNA-2: build_search_filter for empty facet handling
  - DNA-5: Visibility check enforces tenant-level access control
  - DNA-6: DynamicController (no MarketplaceController class)
```

---

## SK-333 — DependencyResolutionSkill

```
SKILL: SK-333 — DependencyResolutionSkill
PATTERN TYPE: ORCHESTRATION
PURPOSE: Resolve template dependency trees against consumer tenant's available factories and connectors; identify gaps and binding requirements
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (installation_records, connector_bindings)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (dependency resolver)
TASK TYPES USING: T521, T522
REUSABLE IN: Any multi-component installation requiring dependency resolution (plugin systems, module composition)
IMPLEMENTATION PATTERN:
  1. Load manifest dependency tree from template_manifests
  2. For each required factory, check consumer's available factory set
  3. For each required connector_ref, check consumer's connector registry
  4. Classify each dependency: AVAILABLE | MISSING_REQUIRED | MISSING_OPTIONAL | INCOMPATIBLE
  5. Generate resolution report with bindings needed
  6. Return DataProcessResult with dependency status map
  KEY: Missing required dependency = BLOCK. Missing optional = WARN.
DNA COMPLIANCE:
  - DNA-1: Dependencies as dict[str, Any], not typed DependencyNode class
  - DNA-3: Resolution failures as DataProcessResult.Failure with detailed reasons
```

---

## SK-334 — InstallModePatternSkill

```
SKILL: SK-334 — InstallModePatternSkill
PATTERN TYPE: ORCHESTRATION
PURPOSE: Execute three installation modes (Snapshot/Linked/Fork) with correct data isolation, metering, and lifecycle management
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (installation_records, installed_flow_definitions, installed_config_docs)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (template.installed, metering events)
TASK TYPES USING: T522, T525
REUSABLE IN: Any template/plugin installation requiring multiple install strategies with lifecycle tracking
IMPLEMENTATION PATTERN:
  SNAPSHOT mode:
    1. Deep-clone flow definitions into consumer tenant's namespace
    2. Deep-clone FREEDOM config docs with consumer's tenantId
    3. No link to publisher — consumer owns all cloned assets
    4. Installation record: {mode: "snapshot", sourcePackage, sourceVersion, consumerTenantId, installedAt}
  LINKED mode:
    1. Create reference document pointing to publisher+version (pinned semver)
    2. Clone FREEDOM config only (consumer can customize parameters)
    3. Flow execution resolves from publisher's artifacts at runtime
    4. Installation record: {mode: "linked", sourcePackage, pinnedVersion, publisherTenantId, consumerTenantId}
  FORK mode:
    1. Take existing LINKED installation → convert to SNAPSHOT
    2. Deep-clone publisher's artifacts into consumer namespace
    3. Sever link — one-way, irreversible
    4. Update installation record: {mode: "fork", forkedFrom: previousLinkedRecord}
  ALL modes: Emit template.installed metering event (F1390)
  KEY: Installed assets ALWAYS carry consumer's tenantId, NEVER publisher's.
DNA COMPLIANCE:
  - DNA-5: All installed assets scoped to consumer tenant
  - DNA-7: Idempotency key on installation (prevent duplicate installs)
  - DNA-8: Metering event via outbox pattern
```

---

## SK-335 — ConnectorRebindingSkill

```
SKILL: SK-335 — ConnectorRebindingSkill
PATTERN TYPE: CONFIGURATION
PURPOSE: Map abstract connector_ref parameters from template to consumer's actual connections with type validation and secret_ref indirection
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (connector_bindings, consumer_connector_registry, template_parameter_schemas)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (type validator)
TASK TYPES USING: T523
REUSABLE IN: Any system requiring abstract connection mapping with secret indirection (multi-cloud connector binding, service mesh rebinding)
IMPLEMENTATION PATTERN:
  1. Load template's declared connector_ref parameters from manifest
  2. Load consumer's registered connections from consumer_connector_registry
  3. For each connector_ref: propose matching by type → consumer approves or selects alternative
  4. Validate type compatibility (e.g., PostgreSQL connector cannot bind to Redis connector_ref)
  5. Store binding as {connectorRef, boundTo: secretRefId, type, validatedAt}
  6. secret_ref stored as REFERENCE ID only — never actual secret value
  7. Emit binding.completed event
  KEY: secret_ref = pointer to secret vault entry. Actual value NEVER in binding document.
DNA COMPLIANCE:
  - DNA-1: Bindings as dict[str, Any]
  - DNA-5: Bindings scoped to consumer tenant
  - DNA-3: Type mismatch returns DataProcessResult.Failure
```

---

## SK-336 — VersionMigrationSkill

```
SKILL: SK-336 — VersionMigrationSkill
PATTERN TYPE: TRANSFORMATION
PURPOSE: Compute structural diff between template versions and execute atomic migration with rollback data preservation
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (migration_plans, migration_history, installed_flow_definitions)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (diff engine)
TASK TYPES USING: T525, T526, T527
REUSABLE IN: Any versioned artifact migration requiring atomic upgrade with rollback (schema migrations, config upgrades)
IMPLEMENTATION PATTERN:
  1. Load current installed version artifacts
  2. Load target version artifacts from publisher
  3. Compute structural diff: added/removed/modified nodes, changed parameters, new connectors
  4. Generate migration plan as dict[str, Any]
  5. Store pre-migration snapshot (rollback data)
  6. Execute migration atomically: all-or-nothing
  7. If any step fails → restore from snapshot → emit rollback event
  8. Store migration history for audit
  KEY: Consumer FREEDOM overrides PRESERVED during migration. Never silently overwrite.
DNA COMPLIANCE:
  - DNA-1: Migration plan as dict[str, Any]
  - DNA-3: Migration failure = DataProcessResult.Failure + auto-rollback
  - DNA-7: Idempotency key prevents duplicate migration execution
```

---

## SK-337 — RagBlueprintSkill

```
SKILL: SK-337 — RagBlueprintSkill
PATTERN TYPE: PACKAGING
PURPOSE: Export and install RAG strategy configurations as shareable blueprints; separates HOW to retrieve (strategy/config) from WHAT was retrieved (data/embeddings)
FABRIC INTERFACES USED:
  - RAG FABRIC (SK-388/SK-389 (IRagService/HybridRag)) → IRagService (strategy config extraction/application)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (rag_blueprints, rag_metadata_schemas)
TASK TYPES USING: T528, T529, T530
REUSABLE IN: Any system requiring portable RAG configuration sharing (research template sharing, knowledge base template distribution)
IMPLEMENTATION PATTERN:
  EXPORT:
    1. Read current RAG strategy config from IRagService for publisher tenant
    2. Extract: strategy type, chunking rules, routing config, ranking weights, prompt IDs (refs only)
    3. Extract metadata schema (what fields are indexed, their types)
    4. Strip all data: no documents, no embeddings, no query logs, no user data
    5. Package as blueprint document → store in rag_blueprints index
  INSTALL:
    1. Load blueprint from rag_blueprints
    2. Validate strategy type ∈ {Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi}
    3. Apply strategy config to consumer's IRagService via RAG FABRIC
    4. Register metadata schema in consumer's namespace
    5. Consumer populates their own data (blueprint provides structure, not content)
  KEY: Blueprint = STRUCTURE. Data = tenant-owned. Never mix.
DNA COMPLIANCE:
  - DNA-1: Blueprint as dict[str, Any]
  - DNA-5: Blueprint stored per tenant; data stays per tenant
```

---

## SK-338 — TemplateMeteringSkill

```
SKILL: SK-338 — TemplateMeteringSkill
PATTERN TYPE: EVENT-DRIVEN
PURPOSE: Emit bounded metering events for template actions (install, execute, upgrade) with dimensions suitable for revenue attribution and analytics
FABRIC INTERFACES USED:
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (metering event emission)
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (usage_aggregations)
TASK TYPES USING: T531, T532
REUSABLE IN: Any usage-based metering system requiring bounded-cardinality dimensions and revenue attribution (SaaS billing, API usage tracking)
IMPLEMENTATION PATTERN:
  1. Receive action event (install, execute, upgrade) with context
  2. Construct metering event with bounded dimensions:
     - packageId, publisherTenantId, consumerTenantId, actionType, version
     - Max 10 dimensions (IRON RULE: no cardinality explosion)
  3. Emit to QUEUE FABRIC via EnqueueAsync
  4. Aggregation (T532): read events → group by period → compute revenue per publisher
  5. Settlement: apply pricing model → generate settlement record → idempotency check (DNA-7)
  KEY: Dimensions BOUNDED. No per-user or per-request unbounded dimensions.
DNA COMPLIANCE:
  - DNA-3: DataProcessResult for emission confirmation
  - DNA-7: Idempotency key on settlement (prevent float-billing)
  - DNA-8: Outbox pattern for event delivery guarantee
```

---

## SK-339 — TemplateQualityScoreSkill

```
SKILL: SK-339 — TemplateQualityScoreSkill
PATTERN TYPE: COMPUTATION
PURPOSE: Compute composite quality scores for templates from execution success rate, latency percentiles, rollback rate, rating average, and fraud signals
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (funnel_events, quality_scores)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (score computation)
TASK TYPES USING: T533, T534
REUSABLE IN: Any quality scoring system requiring bounded metric aggregation (service health scores, vendor ratings)
IMPLEMENTATION PATTERN:
  1. Aggregate per-package metrics from funnel_events:
     - success_rate = successful_executions / total_executions
     - avg_latency_p95 (95th percentile execution time)
     - rollback_rate = rollbacks / total_upgrades
     - avg_rating (from marketplace_ratings)
  2. Compute composite: score = Σ(weight_i × metric_i), bounded [0.0, 1.0]
  3. Weights configurable (FREEDOM): default {success: 0.4, latency: 0.2, rollback: 0.2, rating: 0.2}
  4. Store quality_score document per package
  5. Feed into marketplace ranking (SK-332)
  KEY: Metrics aggregated per-package, NEVER per-user.
DNA COMPLIANCE:
  - DNA-1: Scores as dict[str, Any]
  - DNA-2: build_search_filter for metric queries
```

---

## SK-340 — FraudDetectionSkill

```
SKILL: SK-340 — FraudDetectionSkill
PATTERN TYPE: ANALYSIS
PURPOSE: Detect marketplace fraud patterns: fake reviews, install farming, template plagiarism, revenue manipulation via self-install loops
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (trust_incidents, fraud_patterns)
  - AI ENGINE FABRIC (SK-385/SK-386 (IAiProvider/AiDispatcher)) → AiDispatcher (similarity detection, anomaly analysis)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (fraud.detected events)
TASK TYPES USING: T534
REUSABLE IN: Any marketplace fraud detection (product review fraud, vendor trust scoring)
IMPLEMENTATION PATTERN:
  1. Analyze rating patterns: detect burst ratings from single IP/tenant (fake reviews)
  2. Analyze install patterns: detect publisher→consumer self-loops (install farming)
  3. Run AI similarity detection on template artifacts (plagiarism — using AiDispatcher)
  4. Check revenue patterns: circular install-execute-settle loops
  5. Classify: NO_FRAUD | SUSPICIOUS | CONFIRMED_FRAUD
  6. SUSPICIOUS/CONFIRMED: store trust_incident, emit fraud.detected event
  7. CONFIRMED: requires HUMAN REVIEW before action (IRON RULE)
  KEY: Never auto-suspend without human review. Evidence trail mandatory.
DNA COMPLIANCE:
  - DNA-3: Fraud analysis returns DataProcessResult with evidence
  - DNA-9: AI fraud claims must have evidence (evidence-based AI claims)
```

---

## SK-341 — SandboxExecutionSkill

```
SKILL: SK-341 — SandboxExecutionSkill
PATTERN TYPE: EXECUTION
PURPOSE: Provision isolated sandbox environments for template testing with synthetic data, stubbed connectors, network restrictions, and auto-destruction
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (sandbox_envs, synthetic_datasets, sandbox_results)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (sandbox.execute, sandbox.complete events)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (provisioner, destroyer)
TASK TYPES USING: T535
REUSABLE IN: Any isolated execution environment (CI/CD testing, demo environments, security sandboxes)
IMPLEMENTATION PATTERN:
  1. Provision sandbox: create isolated tenant context with synthetic tenantId
  2. Inject synthetic data (configurable size: small/medium/large)
  3. Stub connectors: replace all connector_ref bindings with mock implementations
  4. Apply network egress allowlist (block production endpoints)
  5. Execute template flow in sandbox context
  6. Collect execution metrics: success/failure, latency, resource usage
  7. Generate execution report → store in sandbox_results
  8. Auto-destroy sandbox after retention period (configurable, max 60 minutes)
  KEY: Sandbox NEVER connects to production. Auto-destruction is mandatory.
DNA COMPLIANCE:
  - DNA-5: Sandbox uses synthetic tenantId, never consumer's real tenantId
  - DNA-3: Execution results as DataProcessResult
```

---

## SK-342 — TemplateSupplyChainSkill

```
SKILL: SK-342 — TemplateSupplyChainSkill
PATTERN TYPE: SECURITY
PURPOSE: Implement supply chain security for template artifacts: cosign signing, SBOM generation, SLSA provenance attestation, verification on install
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (artifact_signatures, sbom_records, attestations)
  - CORE FABRIC (SK-379 (MicroserviceBase)) → MicroserviceBase (signing, verification)
TASK TYPES USING: T518
REUSABLE IN: Any artifact supply chain security (container image signing, deployment artifact verification)
IMPLEMENTATION PATTERN:
  1. Compute SHA-256 hash of all template artifacts
  2. Generate cosign signature over artifact hashes
  3. Create SBOM: list all factory dependencies, their versions, their fabrics
  4. Create SLSA provenance attestation: who built, when, from what sources
  5. Store signature + SBOM + attestation in respective indices
  ON INSTALL (verification):
  6. Fetch artifact from content-addressable storage
  7. Recompute hash → compare with stored hash
  8. Verify cosign signature
  9. Hash mismatch = IMMEDIATE BLOCK (tampered artifact)
  KEY: Integrity verification is mandatory on every install. No bypass.
DNA COMPLIANCE:
  - DNA-1: All records as dict[str, Any]
  - DNA-3: Verification failure = DataProcessResult.Failure
```

---

## SK-343 — DataPackExportSkill

```
SKILL: SK-343 — DataPackExportSkill
PATTERN TYPE: DATA-TRANSFER
PURPOSE: Optional tenant data sharing with explicit opt-in, PII scanning, content hashing, and provenance tracking (higher isolation tier)
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (data_packs, provenance)
  - AI ENGINE FABRIC (SK-385/SK-386 (IAiProvider/AiDispatcher)) → AiDispatcher (PII detection in data content)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (data_pack.exported event)
TASK TYPES USING: T516 (when data pack included with template)
REUSABLE IN: Any data export with PII scanning and provenance (compliance data exports, cross-tenant data sharing)
IMPLEMENTATION PATTERN:
  1. Publisher explicitly opts in to share data alongside template
  2. Run PII scanner (AI ENGINE FABRIC) on data content
  3. PII found → either redact or REJECT (based on policy)
  4. Compute content hash for each data item
  5. Create provenance record: {sourceTenanId, exportedAt, contentHashes, piiScanResult}
  6. Package data_pack document with provenance
  7. On import: verify content hashes, apply higher isolation tier
  KEY: Data packs are OPTIONAL (opt-in only). Higher isolation tier mandatory.
DNA COMPLIANCE:
  - DNA-5: Source tenantId tracked in provenance (never hidden)
  - DNA-9: PII detection results are evidence-based (AI claims with confidence)
```

---

## SK-344 — UpgradePolicyEnforcementSkill

```
SKILL: SK-344 — UpgradePolicyEnforcementSkill
PATTERN TYPE: POLICY
PURPOSE: Evaluate and enforce upgrade policies (notify-only, auto-patch, auto-minor, forced-security) for linked template installations
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (upgrade_policies, installation_records)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (upgrade.detected, upgrade.forced events)
TASK TYPES USING: T524, T526
REUSABLE IN: Any version management system requiring configurable upgrade policies (software update management, dependency update policies)
IMPLEMENTATION PATTERN:
  1. On new version published: detect all linked installations (T524)
  2. For each installation: load consumer's upgrade policy
  3. Evaluate:
     - NOTIFY_ONLY → emit notification event, do nothing else
     - AUTO_PATCH → if semver change is patch (x.x.PATCH) → trigger T525 auto
     - AUTO_MINOR → if semver change is patch or minor → trigger T525 auto
     - FORCED_SECURITY → if publisher marks version as security-critical → force regardless of policy
  4. Store upgrade detection record with applied policy
  KEY: FORCED_SECURITY bypasses consumer preferences (IRON RULE for critical CVEs)
DNA COMPLIANCE:
  - DNA-3: Policy evaluation returns DataProcessResult
  - DNA-5: Policies stored per consumer tenant
```

---

## SK-345 — BFARevalidationSkill

```
SKILL: SK-345 — BFARevalidationSkill
PATTERN TYPE: VALIDATION
PURPOSE: Re-run BFA conflict detection after template upgrade to ensure new version doesn't introduce cross-flow conflicts in consumer's tenant
FABRIC INTERFACES USED:
  - DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Elasticsearch (bfa_revalidation_results, installation_records)
  - QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams (revalidation.complete event)
TASK TYPES USING: T526
REUSABLE IN: Any post-change conflict detection (schema migration validation, deployment compatibility checks)
IMPLEMENTATION PATTERN:
  1. After T525 migration completes: trigger revalidation
  2. Load consumer's full flow inventory (all installed flows + custom flows)
  3. Load upgraded template's entities/events/APIs from BFA registration
  4. Run BFA conflict detection: check entity name collisions, event schema incompatibilities, API path conflicts
  5. Classify conflicts: CRITICAL | WARNING | INFO
  6. CRITICAL → trigger auto-rollback (T527) if policy allows
  7. WARNING → flag for consumer review
  8. Store revalidation result, emit event
  KEY: Revalidation is MANDATORY after every upgrade. Cannot be skipped.
DNA COMPLIANCE:
  - DNA-3: Conflict detection returns DataProcessResult with severity map
  - DNA-5: Revalidation scoped to consumer tenant's flow set
```

---

## FLOW-32 RAG CONCEPT MAP

### Core Concepts (searchable by AF-4)
| Concept | Related Skills | Task Types | Factories |
|---------|---------------|------------|-----------|
| template-packaging | SK-330, SK-342 | T516-T519 | F1339-F1347, F1416-F1418 |
| manifest-validation | SK-331 | T517, T521 | F1340, F1341, F1343 |
| marketplace-discovery | SK-332 | T519, T520 | F1356-F1364 |
| dependency-resolution | SK-333 | T521, T522 | F1365-F1367 |
| install-modes | SK-334 | T522, T525 | F1365-F1370 |
| connector-binding | SK-335 | T523 | F1367-F1373 |
| version-migration | SK-336, SK-344 | T524-T527 | F1374-F1381 |
| rag-blueprint | SK-337 | T528-T530 | F1382-F1389 |
| template-metering | SK-338 | T531, T532 | F1390-F1397 |
| quality-scoring | SK-339 | T533 | F1398-F1400 |
| fraud-detection | SK-340 | T534 | F1401-F1404 |
| sandbox-execution | SK-341 | T535 | F1405-F1410 |
| supply-chain-security | SK-342 | T518 | F1416-F1418 |
| data-pack-export | SK-343 | T516 | F1411-F1415 |
| upgrade-policy | SK-344, SK-345 | T524, T526 | F1374, F1380 |
| bfa-revalidation | SK-345 | T526 | F1380, F1381 |

---

## BACKWARD COMPATIBILITY STATEMENT
All skills SK-1–SK-329 are UNCHANGED. FLOW-32 adds SK-330–SK-345 only.
$

# ════════════════════════════════════════════════════════════
# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
# Added: 2026-03-03 | Post FLOW-32 state
# ════════════════════════════════════════════════════════════

# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
## SKILLS, FACTORY PATTERNS & RAG — Extension

**FLOW Reference:** FLOW-33  
**Backward Compatibility:** SK-1 through SK-144 UNCHANGED  
**New Skills:** SK-346 through SK-354  

---

## SK-346 — Platform Bootstrap Pattern

**Name:** Platform Bootstrap — Idempotent Sentinel-Gated Init  
**Pattern Type:** ORCHESTRATION  
**Used by:** T536, F1419, F1420  
**Reuses:** SK-01 (MicroserviceBase), SK-04 (Queue Fabric), SK-05 (Database Fabric)  

**When to use:** When you need a system-scoped initialization flow that must be safe to rerun, self-checkpointing, and exit immediately if already complete.

**Pattern Steps:**
1. **Read sentinel from ES** via IDatabaseService.SearchDocuments (filter: `{ docType: 'bootstrap-sentinel', version: N }`)
2. **If sentinel ≥ desired version → exit immediately** (no-op, idempotent)
3. **Write phase state BEFORE each step** (outbox: write to ES, then emit queue event — never reverse)
4. **Each phase advances via AdvanceBootstrapPhase** — reads current phase, validates transition is allowed, writes new phase
5. **Set final sentinel** only after smoke test passes — `{ version, completedAt, coverage, smokeResult }`
6. **All operations via fabric** — IDatabaseService for ES reads/writes, IQueueService for events

**DNA Notes:**
- DNA-1: Sentinel doc = dict[str, Any] — not typed BootstrapSentinel class
- DNA-3: All phase methods return DataProcessResult[T] — catch and handle, never throw
- DNA-5: tenantId = 'SYSTEM' on all bootstrap docs — never omit scope

**Gotchas:**
- Phase state MUST be written before event emission — if process dies mid-phase, rerun detects correct phase from ES
- debounce window on trigger (30s) prevents float-bootstrap from rapid restarts
- Do NOT use in-memory state for phase tracking — ES only (resumable requirement)

**Example (DNA-compliant skeleton):**
```python
# CORRECT — sentinel read via DATABASE FABRIC
 sentinel = await _db.SearchDocuments(build_search_filter(new dict[str, Any] {
    ["docType"] = "bootstrap-sentinel",
    ["scope"] = "SYSTEM"
}))
if (sentinel.IsSuccess && sentinel.Data?.Any() == true) return DataProcessResult[bool].Success(true)
# CORRECT — phase write before event
 phaseWrite = await _db.StoreDocument("bootstrap-phases", phaseDoc)
if (!phaseWrite.IsSuccess) return DataProcessResult[bool].Failure(phaseWrite.Error)
await _queue.EnqueueAsync("BootstrapPhaseAdvanced", phaseEvent)
# WRONG — do NOT call Neo4j driver directly
# session = _neo4jDriver.AsyncSession(); ← DNA VIOLATION
```

---

## SK-347 — GraphRAG Catalog Initialization Pattern

**Name:** GraphRAG Two-Layer Catalog + Impact Graph Bootstrap  
**Pattern Type:** INFRASTRUCTURE_INIT  
**Used by:** T538, F1423, T536  
**Reuses:** SK-05 (Database Fabric — via F65 GraphAI), SK-00b (RAG Fabric)

**When to use:** When seeding the structural knowledge graph from compiled registries. Creates the Catalog Graph (plan connectivity) and Impact Graph (runtime provider-test-flow links).

**Pattern Steps (Phase A — Catalog Graph):**
1. **Initialize schema** via F1423 — unique constraints on `id` per label, index on `(scope, tenantId)`
2. **Upsert Family nodes** from family_registry (ES scan): `{ id, name, flowSource, scope }`
3. **Upsert Factory nodes** from factory_registry: `{ id, interface, familyId, scope }`
4. **Derive Method nodes** from factory method lists: `{ id: F1419_checkBootstrapStatus, factoryId, name, sigHash, scope }`
5. **Upsert TaskType/Skill/Template/BfaRule nodes** from their registries
6. **Wire edges** (process in order — all source nodes must exist before edges): HAS_FACTORY → HAS_METHOD → DEPENDS_ON → USES_SKILL → IMPLEMENTS_TASK → APPLIES_TO
7. **Validate**: F1423:ValidateGraphIntegrity — counts match oracle, no dangling edges

**Pattern Steps (Phase B — Impact Graph):**
1. **Register ProviderImpl nodes** when implementations are registered in F1421
2. **Create TestSuite nodes** when test suites are registered
3. **Wire impact edges**: (ProviderImpl)-[:IMPLEMENTS]->(Method), (TestSuite)-[:COVERS]->(Method), (FlowDef)-[:USES_FACTORY]->(Factory)
4. **Update on change**: when FactoryContractChanged → re-wire impact edges for changed factory

**Multi-Tenant Partitioning (non-negotiable):**
```
EVERY node: { ..., scope: 'SYSTEM' | 'TENANT', tenantId?: str }
EVERY graph query: WHERE n.scope = $scope AND ($tenantId IS NULL OR n.tenantId = $tenantId)
NEVER: cross-scope edge creation
```

**Stored Query Templates (store in prompt_registry via F1428):**
```cypher
-- Q1: GetFamilyContext
MATCH (fam:Family {id: $familyId, scope: $scope})
      -[:HAS_FACTORY]->(f:Factory)
      -[:HAS_METHOD]->(m:Method)
WITH fam, f, m
MATCH (t:TaskType {scope: $scope})-[:DEPENDS_ON]->(f)
MATCH (t)-[:USES_SKILL]->(sk:Skill)
MATCH (tmpl:Template)-[:IMPLEMENTS_TASK]->(t)
RETURN fam, collect(DISTINCT f) AS factories, collect(DISTINCT m) AS methods,
       collect(DISTINCT t) AS tasks, collect(DISTINCT sk) AS skills, 
       collect(DISTINCT tmpl) AS templates

-- Q2: GetFactoryImpact
MATCH (f:Factory {id: $factoryId, scope: $scope})
OPTIONAL MATCH (t:TaskType)-[:DEPENDS_ON]->(f)
OPTIONAL MATCH (tmpl:Template)-[:USES_FACTORY]->(f)
OPTIONAL MATCH (pi:ProviderImpl)-[:IMPLEMENTS]->(m:Method {factoryId: $factoryId})
OPTIONAL MATCH (ts:TestSuite)-[:COVERS]->(m)
RETURN f, collect(DISTINCT t) AS tasks, collect(DISTINCT tmpl) AS templates,
       collect(DISTINCT pi) AS providers, collect(DISTINCT ts) AS testSuites

-- Q3: GetTaskBuildContext
MATCH (t:TaskType {id: $taskTypeId, scope: $scope})-[:DEPENDS_ON]->(f:Factory)
MATCH (t)-[:USES_SKILL]->(sk:Skill)
OPTIONAL MATCH (bfa:BfaRule)-[:APPLIES_TO]->(t)
OPTIONAL MATCH (tmpl:Template)-[:IMPLEMENTS_TASK]->(t)
RETURN t, collect(DISTINCT f) AS factories, collect(DISTINCT sk) AS skills,
       collect(DISTINCT bfa) AS bfaRules, collect(DISTINCT tmpl) AS templates
```

**DNA Notes:**
- DNA-5: scope filter on EVERY query — never omit
- MUST use F1423:ExecuteGraphQuery — never embed Cypher strings in service code

**Gotchas:**
- Wire edges AFTER all source nodes exist — node upsert before edge creation is mandatory
- Graph integrity check MUST fail loud if counts deviate >5% from registry oracle

---

## SK-348 — Implementation Registry Pattern

**Name:** Factory Implementation Status Registry — Full Lifecycle Tracking  
**Pattern Type:** DATA_MODEL  
**Used by:** F1421, T539, T541, T540  
**Reuses:** SK-05 (Database Fabric)

**When to use:** When tracking which factory methods have been implemented, by which providers, tested by which suites, and used by which flows. Enables status-gated promotion and regression impact.

**Registry Record Structure (all dict[str, Any]):**

*Factory Record:*
```json
{
  "factoryId": "F1419",
  "interfaceName": "IBootstrapService",
  "familyId": "84",
  "scope": "SYSTEM",
  "methods": [
    { "name": "CheckBootstrapStatus", "sigHash": "sha256-abc", "status": "CORE" }
  ],
  "fabricResolution": [{ "fabric": "DATABASE", "provider": "Elasticsearch" }],
  "status": "PLANNED|GENERATED|INJECTED|MINIMAL|CORE",
  "evidence": { "commitHash": "", "ciRunId": "", "judgeScore": 0 },
  "promotedAt": null
}
```

*Provider Implementation Record:*
```json
{
  "providerId": "F1419_ElasticProvider",
  "factoryId": "F1419",
  "providerType": "Elasticsearch",
  "methods": [{ "name": "CheckBootstrapStatus", "sigHash": "sha256-abc", "implementedAt": "..." }],
  "repoPath": "src/backend/Factories/Family_84/F1419_IBootstrapService/Providers/Elastic/",
  "testSuiteIds": ["TS-F1419-CONTRACT-01"],
  "status": "PLANNED|GENERATED|INJECTED|MINIMAL|CORE",
  "lastTestedAt": null,
  "lastTestResult": null
}
```

*Test Suite Record:*
```json
{
  "suiteId": "TS-F1419-CONTRACT-01",
  "suiteType": "contract",
  "coversMethods": ["CheckBootstrapStatus", "AdvanceBootstrapPhase"],
  "factoryId": "F1419",
  "repoPath": "src/backend/Factories/Family_84/F1419_IBootstrapService/Tests/Contract/",
  "lastRunStatus": null,
  "lastRunAt": null
}
```

**Promotion Gate (MACHINE — cannot skip steps):**
```
PLANNED → GENERATED:  code file exists at repoPath
GENERATED → INJECTED: at least 1 contract test registered + passing
INJECTED → MINIMAL:   all methods have contract tests + integration test passing
MINIMAL → CORE:       E2E smoke flow passes + judge score ≥ threshold + evidence recorded
```

**DNA Notes:**
- DNA-1: All records are dict[str, Any] — build_search_filter on all queries
- DNA-5: scope on every record
- Repo paths MUST be verified via F54:ISourceControlProvider before status promotion

**Gotchas:**
- Evidence (commitHash + ciRunId) MUST be stored BEFORE status change — not after
- "Tested at" timestamp only updates when the test run is complete — partial runs don't count

---

## SK-349 — ContextPack Hybrid RAG Pattern

**Name:** ContextPack Assembly — Graph-First Hybrid Retrieval  
**Pattern Type:** RETRIEVAL  
**Used by:** T542, F1426, T539, T540, T541  
**Reuses:** SK-00a (RAG Fabric), SK-00b (IRagService strategies), SK-347 (GraphRAG)

**When to use:** Before any AI generation node that needs structured, deterministic context. The pattern ensures generation uses ONLY relevant, graph-linked content — not unfiltered semantic search.

**Retrieval Algorithm:**
```
1. GRAPH QUERY (F1423:ExecuteGraphQuery):
   - Pick query template: Q1 (family), Q2 (factory), Q3 (task), or custom
   - Returns: set of node IDs relevant to the target scope

2. VECTOR SEARCH (IRagService, Hybrid strategy):
   - filter: { nodeIds: [...from graph query] }  ← MANDATORY filter
   - query: goal description + family name + factory names
   - topK: controlled by tokenBudget estimate
   - Returns: chunks from skills, task contracts, code snippets, prior judgments

3. MERGE + DEDUPLICATE:
   - combine graph node data + vector chunks
   - rank by: (graph_centrality × 0.4) + (vector_score × 0.4) + (recency × 0.2)
   - trim to tokenBudget

4. ATTACH:
   - prompt template from F1428 (node-type specific)
   - graphLinkedIds (for traceability)
```

**ContextPack Schema (dict[str, Any]):**
```
skills[]:          { skillId, name, patternSteps, dnaNotes, citedFrom }
taskContracts[]:   { taskTypeId, archetype, ironRules[], qualityGates[] }
bfaRules[]:        { cfId, severity, conflict, resolution }
codeSnippets[]:    { factoryId, providerId, repoPath, method, snippet }
priorJudgments[]:  { runId, arbiterId, score, failureTrace }
providerMatrix[]:  { fabricType, providers[{ id, status }] }
graphLinkedIds:    { families[], factories[], tasks[], skills[] }
tokenUsed:         int
```

**DNA Notes:**
- MUST filter vector search by graph node IDs — unfiltered semantic search is NOT allowed
- ContextPack MUST include graphLinkedIds for traceability
- tokenBudget MUST be respected — trim, do not exceed

**Gotchas:**
- If graph returns 0 nodes (new factory not yet seeded), fall back to vector-only with explicit warning in ContextPack
- Prior judgments rank higher if they're from the same family — boost by family match

---

## SK-350 — Implement-Family Meta-Loop Pattern

**Name:** Implement-Family — Multi-Model Generation + 5-Arbiter Loop  
**Pattern Type:** GENERATION_ORCHESTRATION  
**Used by:** T539, F1424, F1425  
**Reuses:** SK-349 (ContextPack), SK-06 (AI Fabric), SK-07 (AiDispatcher)

**When to use:** When generating an entire factory family implementation from a spec. Handles multi-model parallel generation, candidate merging, and the 5-arbiter validation loop with retry.

**Loop Pattern (pseudocode, no typed models):**
```
iteration = 0
maxIterations = (from FREEDOM config)

while iteration < maxIterations:
  # Step 1: Build prompt
  contextPack = F1426.BuildForFamily(familyId, opts)
  prompt = F1428.BuildNodePrompt('AF1', contextPack, { iteration, priorFailures })
  
  # Step 2: Multi-model parallel generation (AF-5)
  candidates = AiDispatcher.RunParallel(prompt, modelProviders)
  
  # Step 3: Merge (AF-10)
  candidate = AF10Merge(candidates)  # select best or ensemble
  
  # Step 4: Run all 5 arbiters (AF-9 via F1425)
  result = F1425.RunArbiters(runId, candidate, contextPack)
  
  if result.allPassed:
    break
  
  # Step 5: Feed failures back — exact trace, not summary
  priorFailures.append(result.results.filter(r => !r.passed))
  iteration++

if iteration == maxIterations:
  emit FamilyImplementationFailed
  return

# Step 6: Deploy + smoke + publish
F55.LocalDeploy(candidate)
F192.SmokeRun(smokeFlowId)
F1421.UpdateImplementationStatus(familyId, 'INJECTED', evidence)
AF11.StoreFeedback(runId, result, contextPack)
```

**Failure Trace Propagation (critical — MACHINE rule):**
```
# CORRECT — verbatim failure trace in next prompt
priorFailure = { 
  arbiterId: 'DNA',
  failureTrace: "Line 47 of IBootstrapService.cs: typed model BootstrapSentinel used instead of dict[str, Any]",
  suggestedFix: "Replace BootstrapSentinel with Dictionary and use parse_document pattern"
}
# WRONG — summary loses information
priorFailure = { arbiterId: 'DNA', failureTrace: "DNA violation found" }  # ← loses location/detail
```

**DNA Notes:**
- DNA-4: IImplementFamilyOrchestrator MUST extend MicroserviceBase
- AF-5 runs in parallel — candidates MUST be isolated (no shared mutable state)
- AF-10 merge strategy is config-driven (select_best / ensemble) — not hardcoded

**Gotchas:**
- maxIterations = 10 is a MACHINE rule — cannot be config-overridden
- All arbiter results collected even if early arbiters fail (collect ALL failures per iteration)
- Smoke run uses a pre-configured flow — it MUST touch the newly generated factory

---

## SK-351 — 5-Arbiter Prompt Templates

**Name:** Arbiter Prompt Construction — Deterministic Validation Prompts  
**Pattern Type:** PROMPT_ENGINEERING  
**Used by:** F1425, F1428, T540  
**Reuses:** SK-349 (ContextPack), SK-07 (AI Fabric)

**When to use:** When constructing the prompt for any of the 5 arbiters. Must be structured, cite ContextPack, include prior failures, and demand JSON output.

**Base Arbiter Prompt Structure:**
```
[XIIGEN ARBITER: {ARBITER_ID}]
Run ID: {runId}
Iteration: {iteration}

TARGET:
  Family: {familyId}
  Factories: {factoryIds}
  Scope: {tenantId}

ARBITER MANDATE:
  {arbiterMandate}  ← specific to each arbiter (see below)

CONTEXT_PACK_CITATIONS (you MUST reference which of these you checked):
  Skills checked: {skills[].skillId}
  BFA rules in scope: {bfaRules[].cfId}
  DNA checklist applied: {dnaNotes[]}

CANDIDATE_SUMMARY:
  Files generated: {candidate.files[].path}
  Methods implemented: {candidate.methods[]}
  Test suites generated: {candidate.testSuites[]}

PRIOR_FAILURES (from previous iterations — address each):
  {priorFailures[].arbiterId}: {priorFailures[].failureTrace}

OUTPUT FORMAT (strictly JSON, no markdown, no preamble):
{
  "arbiterId": "{ARBITER_ID}",
  "passed": true|false,
  "score": 0-100,
  "failureTrace": "exact location + rule violated + fix suggestion",
  "citedSkills": ["SK-xxx"],
  "citedRules": ["CF-xxx", "DNA-x"]
}
```

**Arbiter-Specific Mandates:**
```
COVERAGE: Verify every method in the interface contract is implemented. 
  Check: method names, parameter types (Dictionary not typed), return type (DataProcessResult[T]).
  Iron rule: 0% methods missing = PASS. Score = (implemented/total × 100).

SECURITY: Verify no hardcoded secrets, authZ on all mutating methods, 
  tenantId scoping on all DB calls, no injection vectors, no PII in logs.
  Iron rule: ANY violation = FAIL (score 0). No partial pass.

DNA_COMPLIANCE: Verify DNA-1 (no typed models), DNA-2 (build_search_filter), 
  DNA-3 (DataProcessResult), DNA-4 (MicroserviceBase), DNA-5 (tenantId), DNA-6 (DynamicController).
  Iron rule: ANY DNA pattern violation = FAIL (BUILD FAILURE marker in trace).

TESTING: Verify contract tests exist for every method, unit tests present,
  integration tests use fabric stubs (no direct provider imports in test code),
  test suite registered in Implementation Registry.
  Iron rule: 0 contract tests = FAIL.

BFA: Verify all entities/events/APIs declared in BFA registration doc,
  CF rules in scope satisfied, schema registry updated, propagation indices written.
  Iron rule: any entity appearing in existing CF rules but not registered = FAIL.
```

**DNA Notes:**
- Arbiter output MUST be parseable JSON (F1425 uses JSON.Deserialize into Dictionary)
- citedSkills and citedRules in output enable AF-11 to score prompt effectiveness

---

## SK-352 — Regression Impact Graph Pattern

**Name:** Change-Triggered Regression — Graph Impact + Retest  
**Pattern Type:** CHANGE_DETECTION  
**Used by:** T541, F1427  
**Reuses:** SK-347 (GraphRAG), SK-348 (Implementation Registry)

**When to use:** When a factory interface changes (new method, modified signature) or a provider adds a method. Determines the blast radius and triggers retesting of ALL impacted artifacts.

**Impact Computation Algorithm:**
```
Input: { factoryId, changedMethods[], type: 'INTERFACE_CHANGED'|'PROVIDER_CHANGED' }

Step 1 — Graph query (Q2: GetFactoryImpact):
  impactedProviders = [all ProviderImpl nodes that IMPLEMENT any Method of this factory]
  impactedFlows     = [all FlowDef nodes that USE_FACTORY this factory]
  impactedTestSuites = [all TestSuite nodes that COVER any Method of this factory]

Step 2 — Compatibility check (for INTERFACE_CHANGED with new methods):
  for each provider in impactedProviders:
    if provider.methods does NOT include changedMethods[] → compatibilityPatch needed
  emit CompatibilityPatchRequired per missing provider → triggers T539 loop for that provider

Step 3 — Regression trigger:
  for each provider in impactedProviders:
    F55.TriggerContractTests(provider.testSuiteIds)
  for each flow in impactedFlows:
    F192.StartRun(flow.id, mode: 'regression-smoke')
  
Step 4 — Collect + Report:
  wait for all test runs (correlationId based)
  emit RegressionPassed OR RegressionFailed with structured list
```

**Key Rule (from spec point #5):**
> If we implement another DB connector for Mongo and we already used this code → test again all we used  
> If we add another method in the interface → implement it in Elastic too + cover with test

Implementation: The compatibility check in Step 2 catches exactly this — if IBootstrapService gets a new method, ALL providers (Elastic, Mongo, etc.) are flagged for CompatibilityPatch.

**DNA Notes:**
- DNA-5: Regression scope NEVER crosses tenant boundaries
- Impact queries use F1423:ExecuteGraphQuery (Q2) — not raw Cypher in service code

**Gotchas:**
- A change to a shared fabric interface (IDatabaseService) cascades to ALL factories using that fabric — scope the trigger carefully to the specific factory, not the base interface
- CompatibilityPatch = new T539 run for the specific provider — not a full family reimplementation

---

## SK-353 — Family Skill Pack Structure

**Name:** SK-FAM Pattern — Family Skill Pack Construction  
**Pattern Type:** KNOWLEDGE_ORGANIZATION  
**Used by:** F1422, T542, AF-4 (RAG retrieval)  
**Reuses:** SK-347, SK-348, SK-349

**When to use:** When building or retrieving the pre-assembled knowledge bundle for a factory family. One SkillPack per family, referenced by AF-4 during all generation tasks for that family.

**Family Skill Pack Schema (dict[str, Any]):**
```json
{
  "packId": "SK-FAM-84",
  "familyId": "84",
  "familyName": "Platform Bootstrap Fabric",
  "version": 1,
  "scope": "SYSTEM",
  "factories": [
    {
      "factoryId": "F1419",
      "interfaceName": "IBootstrapService",
      "fabricResolution": "DATABASE(ES)+QUEUE(Redis)",
      "methods": ["CheckBootstrapStatus", "AdvanceBootstrapPhase", "SetBootstrappedSentinel"],
      "skillRefs": ["SK-346", "SK-348"]
    }
  ],
  "events": ["PlatformBootRequested", "BootstrapPhaseAdvanced", "BootstrapCompleted"],
  "bfaHooks": ["CF-739", "CF-740", "CF-741"],
  "testMatrix": {
    "contractTests": ["all methods per factory"],
    "integrationTests": ["phase advancement with stub queue", "sentinel sentinel round-trip"],
    "e2eFlows": ["FLOW-SMOKE-BOOTSTRAP-01"]
  },
  "promptTemplates": {
    "af1": "SK-351:COVERAGE mandate + DNA checklist for bootstrap",
    "af4": "retrieve SK-346, SK-348, SK-347",
    "af9": "judge against CF-739-CF-745"
  },
  "regressionMap": {
    "providersByInterface": {
      "IBootstrapService": ["F1419_ElasticProvider"]
    },
    "flowsUsingFamily": ["FLOW-BOOTSTRAP-PLATFORM"]
  }
}
```

**Auto-Generation Rule:**
- FamilySkillPacks are auto-generated by F1420:GenerateFamilySkillPacks during plan bundle install
- Skills are assigned to families by matching their `usedByFactories[]` lists against the family's factory IDs
- Prompt templates are derived from the base template (SK-351) + family-specific additions

**DNA Notes:**
- SkillPack = dict[str, Any] — no typed FamilySkillPack class
- All `skillRefs[]` must resolve to existing SK IDs in the skill_registry

---

## SK-354 — Prompt Pack + Feedback Loop Pattern

**Name:** Prompt Versioning + AF-11 Feedback Loop — Self-Improving Prompts  
**Pattern Type:** FEEDBACK_SYSTEM  
**Used by:** F1428, T539, AF-11  
**Reuses:** SK-06 (AI Fabric), SK-07 (AiDispatcher)

**When to use:** When storing prompt performance data and evolving prompts based on arbiter outcomes and judge scores. Implements the "continuous improvement" loop from the system initiation spec.

**Feedback Storage Pattern:**
```
# After each T539 run, AF-11 calls F1428:RecordPromptFeedback
feedback = {
  "promptId": "IMPLEMENT_FAMILY",
  "version": 3,
  "runId": "run-abc-123",
  "familyId": "84",
  "arbiterId": "DNA",        # null if overall run feedback
  "score": 62,
  "passed": false,
  "failureTrace": "Line 47: typed model used...",
  "improvementSuggestion": "Strengthen DNA-1 examples in prompt"
}
```

**Prompt Evolution Rule:**
- After N runs with score < threshold → flag prompt version for review
- Human or AF-1 proposes new prompt version → stored as version N+1
- Old versions preserved — never deleted (auditable)
- New version is A/B tested against old for 10 runs before promotion

**Performance Report Schema (returned by F1428:GetPromptPerformanceReport):**
```
{
  "promptId": "IMPLEMENT_FAMILY",
  "versions": [
    { "version": 1, "avgScore": 71, "runCount": 20, "failurePatterns": ["DNA-1 violations"] },
    { "version": 2, "avgScore": 84, "runCount": 15, "failurePatterns": ["BFA registration missing"] },
    { "version": 3, "avgScore": 91, "runCount": 8,  "failurePatterns": [] }
  ],
  "trendDirection": "improving",
  "suggestedImprovements": []
}
```

**DNA Notes:**
- DNA-1: Feedback records = dict[str, Any]
- DNA-3: All F1428 methods return DataProcessResult[T]
- Prompt improvement suggestions MUST be stored — never applied automatically without review gate

---

## SKILLS SUMMARY — FLOW-33

| Skill ID | Name | Pattern Type | Primary Consumers |
|----------|------|--------------|-------------------|
| SK-346 | Platform Bootstrap Pattern | ORCHESTRATION | T536, F1419 |
| SK-347 | GraphRAG Catalog Init | INFRASTRUCTURE_INIT | T538, F1423 |
| SK-348 | Implementation Registry Pattern | DATA_MODEL | F1421, T539, T541 |
| SK-349 | ContextPack Hybrid RAG | RETRIEVAL | T542, F1426 |
| SK-350 | Implement-Family Meta-Loop | GENERATION_ORCHESTRATION | T539, F1424 |
| SK-351 | 5-Arbiter Prompt Templates | PROMPT_ENGINEERING | F1425, F1428 |
| SK-352 | Regression Impact Graph | CHANGE_DETECTION | T541, F1427 |
| SK-353 | Family Skill Pack Structure | KNOWLEDGE_ORGANIZATION | F1422, AF-4 |
| SK-354 | Prompt Pack + Feedback Loop | FEEDBACK_SYSTEM | F1428, AF-11 |

---

## STATE CHECKPOINT

```yaml
FLOW_33_SKILLS_CHECKPOINT:
  status: COMPLETE
  new_skills: SK-346 through SK-354
  next_skill: SK-154
  backward_compatibility: SK-1-SK-345 unchanged
  key_patterns_covered:
    - Idempotent bootstrap (SK-346)
    - GraphRAG two-layer init (SK-347)
    - Implementation status registry (SK-348)
    - Hybrid RAG ContextPack (SK-349)
    - Implement-family meta-loop (SK-350)
    - 5-arbiter prompts (SK-351)
    - Regression blast radius (SK-352)
    - Family skill pack (SK-353)
    - Prompt evolution (SK-354)
  next_doc: BFA_STRESS_TEST (CF-739-CF-750, ST-455-ST-462)
```

---

# ═══════════════════════════════════════════════════════════════
# FLOW-34: SKILL MULTI-TARGET TRANSLATION — SKILLS FACTORY RAG
# Skills SK-355–SK-378
# ═══════════════════════════════════════════════════════════════

# FLOW-34 SKILLS FACTORY RAG — Skill Multi-Target Translation
## Skills SK-355–SK-378

> All skills follow the established XIIGen skill format.
> LANGUAGE VARIANTS pattern extended with CLIENT VARIANTS block (new for FLOW-34).
> DNA patterns enforced in all variants.

---

## SK-355 — CANONICAL SKILL SPEC FORMAT
```
SKILL: SK-355
NAME: Canonical Skill Spec Format
TASK TYPES: T543, T544
FACTORIES: F1429, F1430, F1433, F1434
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
    "sourceSkillId": "SK-{n}",     # original source
    "archetype": "...",            # STATEFUL_ORCHESTRATION / EXTRACTION / etc.

    "contractSurface": {
      "inputs": {"key": {"type": "str|int|bool|map", "required": true}},
      "outputs": {"key": {"type": "str|int|bool|map"}},
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
  "You are extracting a Canonical Skill Spec from a Python or React Native skill definition.
   Output ONLY a Dictionary-format spec (no typed classes).
   All inputs and outputs must be dictionary key-value pairs.
   Define min 3 golden test vectors.
   Define CloudEvents envelope for all async events.
   Do NOT include any language-specific syntax."
```

---

## SK-356 — VARIANT DESCRIPTOR BLOCK SCHEMA
```
SKILL: SK-356
NAME: Variant Descriptor Block Schema
TASK TYPES: T544
FACTORIES: F1436, F1439
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
      - resultEnvelope: "DataProcessResult[T] equivalent"
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

## SK-357 — MICROSERVICEBASE-NODE SDK PATTERN
```
SKILL: SK-357
NAME: MicroserviceBase-Node SDK Pattern
TASK TYPES: T546
FACTORIES: F1460
ARCHETYPE: SERVER_SDK

PURPOSE:
  Node.js runtime equivalent of MicroserviceBase (Python). Enforces all 5 DNA behaviors
  for generated Node.js adapters.

REQUIRED SDK COMPONENTS:
  1. DataProcessResult envelope:
     { isSuccess: boolean, data: object|null, error: str|null }
     Never throw for business logic. Catch all → return { isSuccess: false, error: message }

  2. parse_document: all payload as plain {} (object), never class instance
     const doc = JSON.parse(body) # Object literal only

  3. Tenant scope: extract tenantId from JWT or route param; attach to ALL DB/Queue/Cache calls
     const tenantId = ctx.auth.tenantId # never from body

  4. DynamicRouter: single express Router with param-based routing
     router.all('/:tenantId/dynamic/:action', handler) # no route per entity

  5. Trace propagation: OpenTelemetry compatible
     Extract W3C traceparent; propagate to all downstream calls

FABRIC INTERFACE PATTERN (Node):
  # CORRECT — through fabric
  const result = await databaseService.searchDocuments({ tenantId, filter })
  # WRONG — direct driver import
  const { Pool } = require('pg') # BUILD FAILURE

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

## SK-358 — MICROSERVICEBASE-GO SDK PATTERN
```
SKILL: SK-358
NAME: MicroserviceBase-Go SDK Pattern
TASK TYPES: T547
FACTORIES: F1460
ARCHETYPE: SERVER_SDK

PURPOSE: Go runtime MicroserviceBase equivalent. Optimized for event workers and high-throughput consumers.

REQUIRED SDK COMPONENTS:
  1. ResultEnvelope:
     type Result struct { IsSuccess bool; Data map[str]interface{}; Error str }
     Return (Result, error) — never panic() for business logic

  2. parse_document: all payloads as map[str]interface{}
      doc map[str]interface{} — never typed domain structs

  3. Tenant scope: from context.Context
     tenantId := ctx.Value("tenantId").(str)

  4. DynamicRouter (chi or gin):
     r.HandleFunc("/{tenantId}/dynamic/{action}", handler)

  5. CloudEvents SDK for event publishing:
     Use cloudevents-go SDK; required attrs: id, source, specversion, type

FABRIC INTERFACE PATTERN (Go):
  # CORRECT
  result := dbService.SearchDocuments(ctx, SearchFilter{TenantId: tenantId})
  # WRONG — direct driver
  db, _ := pgx.Connect(ctx, dsn) # BUILD FAILURE

AI AGENT PROMPT:
  "Generate a Go adapter. Payloads MUST be map[str]interface{} — no domain structs.
   Return (ResultEnvelope, error) — never panic.
   tenantId from context.Context always.
   Fabric calls only — no pgx, go-redis, or other direct driver imports."
```

---

## SK-359 — MICROSERVICEBASE-JAVA SDK PATTERN
```
SKILL: SK-359
NAME: MicroserviceBase-Java SDK Pattern
TASK TYPES: T548
FACTORIES: F1460
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. DataProcessResult[T]:
     record DataProcessResult[T](boolean isSuccess, T data, str error) {}
     Never throw for business logic. Wrap in try-catch → return failure result.

  2. parse_document: Map<str,Object> for all documents
     No @Entity, no @Document, no @JsonProperty domain POJOs

  3. Tenant scope: from SecurityContextHolder or request attribute
     str tenantId = (str) request.getAttribute("tenantId")

  4. Single @RestController:
     @RestController @RequestMapping("/{tenantId}/dynamic")
     No per-entity @RestController classes

  5. Fabric via @Autowired:
     @Autowired IDatabaseService databaseService — never JdbcTemplate()

AI AGENT PROMPT:
  "Generate Java Spring Boot adapter. Documents are Map<str,Object> — no @Entity.
   Single @RestController with path variables — no per-entity controllers.
   Return DataProcessResult[T] — no throw for business logic.
   All DB/Queue/AI via @Autowired fabric interfaces — never direct instantiation."
```

---

## SK-360 — MICROSERVICEBASE-RUST SDK PATTERN
```
SKILL: SK-360
NAME: MicroserviceBase-Rust SDK Pattern
TASK TYPES: T549
FACTORIES: F1460
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. ResultEnvelope:
     struct ResultEnvelope { is_success: bool, data: Option<serde_json::Value>, error: Option<str> }
     Return Result<ResultEnvelope, AppError> — never panic! in business logic

  2. parse_document: HashMap<str, serde_json::Value>
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
  "Generate Rust adapter (Axum). Payloads are HashMap<str, serde_json::Value> — no domain structs.
   Return ResultEnvelope — never panic! for business logic.
   Fabric through trait objects Box<dyn IDatabaseService> — no direct sqlx or redis-rs.
   No unsafe blocks in service code."
```

---

## SK-361 — MICROSERVICEBASE-PHP SDK PATTERN
```
SKILL: SK-361
NAME: MicroserviceBase-PHP SDK Pattern
TASK TYPES: T550
FACTORIES: F1460
ARCHETYPE: SERVER_SDK

REQUIRED SDK COMPONENTS:
  1. DataProcessResult:
     return ['isSuccess' => true, 'data' => [...], 'error' => null]
     Catch exceptions → return ['isSuccess' => false, 'error' => $e->getMessage()]

  2. parse_document: PHP array (not class/object)
     $doc = json_decode($body, true) — associative array only

  3. Tenant scope: from JWT or route param
     $tenantId = $request->get('tenantId') # from validated auth layer

  4. DynamicRouter (when used as standalone API):
     Single route handler: /api/{tenantId}/dynamic/{action}
     No per-entity route files

  5. WordPress context rules:
     register_rest_route with permission_callback required
     No eval(), no extract(), no variable variables

FABRIC:
  Use IFabric interface injection — never PDO(), never wpdb()
  In WP context: REST API calls go to XIIGen gateway, not direct to DB

AI AGENT PROMPT:
  "Generate PHP adapter. Documents are PHP arrays (json_decode with true) — no classes for domain data.
   Return DataProcessResult array — catch exceptions.
   In WordPress context: register_rest_route with permission_callback.
   No eval(), no direct PDO/MySQLi creation, no secrets in PHP files."
```

---

## SK-362 — REACTJS CLIENT VARIANT ADAPTER
```
SKILL: SK-362
NAME: ReactJS Client Variant Adapter
TASK TYPES: T552
FACTORIES: F1445
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN:
  Hook: use{SkillName}()
    - Generates idempotencyKey (UUID v4) per submit attempt
    - Re-uses SAME key on retry (stable across retries)
    - tenantId from auth context (useAuth hook or context provider)
    - API base URL from config (env  or context) — never hardcoded
    - Returns: { submit, isLoading, result, error }

  Component: <{SkillName}Form />
    - Controlled inputs with validation
    - Submit → calls hook.submit(payload)
    - Retry button re-uses same idempotencyKey (does not generate new one)
    - Error display with retry affordance

IDEMPOTENCY PATTERN (MACHINE — always this way):
  const [idempotencyKey] = useState(() => uuidv4()) # generated once
  const handleRetry = () => submit({ ...payload, idempotencyKey }) # SAME key

FABRIC-FIRST PATTERN:
  const { apiClient } = useFabricClient() # platform-resolved via config
  # NEVER: import axios from 'axios' with hardcoded URL

DNA-5 EQUIVALENT (CLIENT):
  const { tenantId } = useAuth() # ALWAYS from auth context
  # NEVER: <input name="tenantId" /> — never from form field

AI AGENT PROMPT:
  "Generate React hook + component. idempotencyKey generated once per submit sequence — same key on retry.
   tenantId from useAuth() — never from form field.
   API calls via useFabricClient() with config-driven base URL — never hardcoded URL.
   Use plain object {} for all API payloads — no class instances."
```

---

## SK-363 — VUE CLIENT VARIANT ADAPTER
```
SKILL: SK-363
NAME: Vue Client Variant Adapter
TASK TYPES: T553
FACTORIES: F1445
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN (Composition API):
  composable: use{SkillName}()
    const idempotencyKey = ref(uuidv4()) # generated once; NEVER reset on retry
    const tenantId = inject('tenantId') # or useAuth composable
    const submit = async (payload) => {
      # idempotencyKey.value stays the same on retry — do not replace
      const result = await apiClient.post(endpoint, { ...payload, idempotencyKey: idempotencyKey.value })
      return parseResult(result) # DataProcessResult[object]
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

## SK-364 — ANGULAR CLIENT VARIANT ADAPTER
```
SKILL: SK-364
NAME: Angular Client Variant Adapter
TASK TYPES: T554
FACTORIES: F1445
ARCHETYPE: CLIENT_ADAPTER

CANONICAL PATTERN:
  Service: {SkillName}Service
    constructor(private apiClient: FabricApiClient, private authService: AuthService) {}
    submit(payload: object): Observable<DataProcessResult> {
      const idempotencyKey = this.currentIdempotencyKey # preserved across retries
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

## SK-365 — WORDPRESS PLUGIN ADAPTER PATTERN
```
SKILL: SK-365
NAME: WordPress Plugin Adapter Pattern
TASK TYPES: T556
FACTORIES: F1450, F1451, F1452, F1453, F1454
ARCHETYPE: WORDPRESS_HOST_TARGET

PURPOSE: Template for generating a WordPress plugin variant of any XIIGen skill.
         Plugin = behaviors + admin + blocks. NOT business logic.

PLUGIN STRUCTURE (generated):
  xiigen-{skill-name}/
    xiigen-{skill-name}.php      # main plugin file with header
    includes/
      class-settings.php         # Settings API registration
      class-rest-proxy.php       # REST endpoint → XIIGen API proxy
    blocks/
      {skill-name}/
        block.json               # block metadata + registration
        index.php                # server-side registration
        src/index.js             # client-side registerBlockType
        build/                   # wp-scripts output
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
  # NO SECRETS stored in WP options

BLOCK REGISTRATION (MACHINE — BOTH server and client):
  # PHP (server):
  register_block_type(__DIR__ . '/blocks/{skill-name}')
  # JS (client):
  registerBlockType('xiigen/{skill-name}', { ...settings })

REST PROXY PATTERN (MACHINE — permission_callback required):
  register_rest_route('xiigen/v1', '/{skill-name}', [
    'methods' => 'POST',
    'callback' => [$this, 'proxy_to_xiigen'],
    'permission_callback' => [$this, 'check_permission'] # NEVER omit
  ])
  # proxy_to_xiigen calls XIIGen API gateway — NOT direct DB

IRON RULES (same as T556):
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

## SK-366 — WORDPRESS THEME ADAPTER PATTERN
```
SKILL: SK-366
NAME: WordPress Theme Adapter Pattern
TASK TYPES: T557
FACTORIES: F1455, F1456, F1457, F1458, F1459
ARCHETYPE: WORDPRESS_HOST_TARGET

PURPOSE: Template for generating WordPress block theme variant. Styling + templates ONLY.

THEME STRUCTURE (generated):
  xiigen-{skill-name}-theme/
    theme.json           # global settings + styles (ONLY global style mechanism)
    templates/
      index.html         # main template
      single.html        # optional: single post template
    parts/
      header.html        # template parts
      footer.html
    patterns/
      {skill-pattern}.php # optional: block patterns
    style.css            # theme identification header only
    README.md

THEME.JSON PATTERN (from design tokens — MACHINE):
  {
    "version": 2,
    "settings": {
      "color": { "palette": [...] },    # from design token export (F1459)
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
   Design tokens mapped from canonical design system via F1459."
```

---

## SK-367 — WORDPRESS REST INTEGRATION PATTERN
```
SKILL: SK-367
NAME: WordPress REST Integration Pattern
TASK TYPES: T556, T558
FACTORIES: F1454
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

## SK-368 — CLOUDEVENTS ENVELOPE PATTERN
```
SKILL: SK-368
NAME: CloudEvents Envelope Pattern
TASK TYPES: T543, T545, T559
FACTORIES: F1470
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

## SK-369 — OPENAPI CANONICAL CONTRACT PATTERN
```
SKILL: SK-369
NAME: OpenAPI Canonical Contract Pattern
TASK TYPES: T543, T271
FACTORIES: F1432, F1469
ARCHETYPE: CONTRACT

PURPOSE: Defines how canonical skill HTTP contracts are expressed in OpenAPI 3.1.

OPENAPI 3.1 DOCUMENT REQUIREMENTS:
  openapi: "3.1.0"    # required field
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

## SK-370 — JSON SCHEMA PAYLOAD VALIDATOR
```
SKILL: SK-370
NAME: JSON Schema Payload Validator
TASK TYPES: T545, T559
FACTORIES: F1432, F1470
ARCHETYPE: CONTRACT / VALIDATION

PURPOSE: Cross-language payload validation using JSON Schema draft 2020-12.

CANONICAL SCHEMA (per skill, in canonical spec):
  {
    "$schema": "https:# json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "tenantId": {"type": "str", "minLength": 1},
      "idempotencyKey": {"type": "str", "format": "uuid"},
      # ... skill-specific fields
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

## SK-371 — CROSS-VARIANT GOLDEN TEST SUITE
```
SKILL: SK-371
NAME: Cross-Variant Golden Test Suite
TASK TYPES: T545, T559
FACTORIES: F1466, F1467, F1468
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
        "tolerance": "exact|semantic" # semantic = same logical meaning, not byte-equal
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
  1. Queue test runs for all variants (F1466 → QUEUE FABRIC)
  2. Replay each scenario against each variant (F1467)
  3. Compare output: DataProcessResult semantics must match canonical
  4. Store results in F1468; flag any variant that fails
```

---

## SK-372 — GRAPH RAG INGESTION PATTERN
```
SKILL: SK-372
NAME: Graph RAG Ingestion Pattern
TASK TYPES: T561, T562
FACTORIES: F1471, F1472
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

## SK-373 — GRAPH RAG VARIANT SELECTION
```
SKILL: SK-373
NAME: Graph RAG Variant Selection
TASK TYPES: T563
FACTORIES: F1473, F1437
ARCHETYPE: GRAPH_RAG (Phase B / P4)

PURPOSE: AF-4 upgrade: hybrid retrieval → graph expansion to select best variant.

SELECTION ALGORITHM:
  1. Hybrid retrieve: semantic + keyword search finds top-K skill families
  2. For each family: graph-traverse HAS_VARIANT edges
  3. Filter by requested target (targetClient, targetServer)
  4. Rank by: maturity (CORE > MINIMAL > INJECTED > GENERATED) then conformanceScore
  5. Return: best matching variant + rationale
  6. If no matching variant: return canonical spec + adapter recipe (via F1442)

FALLBACK STRATEGY:
  No exact variant → F1442:IVariantFallbackService returns:
    { variantExists: false, canonicalSpec: {...}, adapterRecipe: "Generate using T546/T552..." }
```

---

## SK-374 — VARIANT PACKAGING MANIFEST
```
SKILL: SK-374
NAME: Variant Packaging Manifest
TASK TYPES: T556, T557, T560
FACTORIES: F1453, F1458
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

## SK-375 — NO-SECRETS GATE PATTERN
```
SKILL: SK-375
NAME: No-Secrets Gate Pattern
TASK TYPES: T558, T556, T552–T554
FACTORIES: F1447
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

## SK-376 — TENANT SCOPE PROPAGATION — MULTI-LANGUAGE
```
SKILL: SK-376
NAME: Tenant Scope Propagation — Multi-Language
TASK TYPES: T546–T550
FACTORIES: F1463
ARCHETYPE: MULTI-LANG / DNA-5

PURPOSE: Reference implementation of DNA-5 (tenant scope) for all supported languages.

PER-LANGUAGE EXTRACTION PATTERNS:
  Python:  tenant_id = request.state.tenant_id  # FastAPI middleware injection
  Node: const tenantId = req.auth?.tenantId || req.params.tenantId
  Go: tenantId := ctx.Value("tenantId").(str)
  Java: str tenantId = (str) request.getAttribute("tenantId")
  Rust: let tenant_id = req.extensions().get::<TenantId>().cloned()
  PHP: $tenantId = $request->get('tenantId') # from validated JWT middleware

IRON RULE: tenantId on EVERY DB/Queue/Cache call — never query without it
```

---

## SK-377 — IDEMPOTENCY KEY STABILITY PATTERN
```
SKILL: SK-377
NAME: Idempotency Key Stability Pattern
TASK TYPES: T552–T554, T559
FACTORIES: F1467
ARCHETYPE: QUALITY / CLIENT

PURPOSE: Ensures idempotency key is stable across retries in all client variants.

RULE: idempotencyKey is generated ONCE per "user submission intent" — NOT per network call.
      Retry = same intent → same key. New submission = new key.

PER-FRAMEWORK PATTERNS:
  React: const [key] = useState(() => uuidv4()) # created once in state
  Vue: const key = ref(uuidv4()) # created once in composable setup
  Angular: private key = uuidv4() # private field on service instance; reset only on explicit "start over"
  WordPress: PHP stores key in session/transient on form init; re-uses on retry

CONFORMANCE TEST (GT-03 in every canonical suite):
  Submit → capture response
  Submit SAME key again → response MUST be identical (server idempotency)
  Submit with NEW key → treated as new request
```

---

## SK-378 — CANONICAL TEST REPLAY RUNNER
```
SKILL: SK-378
NAME: Canonical Test Replay Runner
TASK TYPES: T559, T551
FACTORIES: F1466, F1467, F1468
ARCHETYPE: TESTING

PURPOSE: Execution engine for replaying canonical golden test scenarios against variants.

EXECUTION FLOW:
  1. Load canonical test suite from F1434
  2. For each variant in scope: queue a test run (F1466 → QUEUE FABRIC)
  3. For each scenario: call variant endpoint with golden input
  4. Compare response to expected output:
     - isSuccess semantics must match
     - data structure must satisfy JSON Schema
     - error messages must be non-empty when expected
  5. Record pass/fail + conformanceScore in F1468
  6. Publish test completion event (CloudEvents envelope via SK-368)

QUEUE PATTERN (Fan-out):
  TestSuiteStarted → [TestVariantRequested per variant] → [ScenarioReplayed per scenario per variant]
  All fan-out via IQueueService.EnqueueAsync — never direct HTTP between test runner and variants
```


---

# ═══════════════════════════════════════════════════════
# FLOW-35 SKILLS: SK-402–SK-404
# Added: 2026-03-05
# ═══════════════════════════════════════════════════════

## SK-402 — SECRETS FABRIC PATTERNS
```
SKILL: SK-402
NAME: Secrets Fabric Patterns
TASK TYPES: T565
FACTORIES: F1484, F1485, F1486
ARCHETYPE: FABRIC / INFRASTRUCTURE

PURPOSE: Reference implementation of the Secrets Fabric — the 7th fabric interface in XIIGen.

PATTERN — Interface (ISecretsService):
  get_secret(tenant_id, secret_path) → DataProcessResult[dict]
  list_secrets(tenant_id, prefix) → DataProcessResult[list[dict]]
  store_secret(tenant_id, secret_path, value) → DataProcessResult[dict]
  delete_secret(tenant_id, secret_path) → DataProcessResult[dict]
  health_check() → DataProcessResult[bool]

PATTERN — Provider Registry:
  SecretsProviderType enum: AWS_SECRETS_MANAGER | ENV_VAR | IN_MEMORY
  SecretsProviderRegistry.register(type, provider_instance)
  SecretsProviderRegistry.resolve(type) → ISecretsService

PATTERN — Fabric Resolver:
  SecretsFabricResolver.resolve(config: dict) → ISecretsService
  Config-first: reads config["secrets"]["provider"] → resolves from registry
  Fallback chain: primary → secondary → InMemory (test safety net)

PATTERN — AWS Secrets Manager Provider:
  Uses aiobotocore (async) — NEVER boto3 (sync)
  Session created per-call with scope isolation
  Response parsed to dict (DNA-1: no typed models)
  All errors → DataProcessResult.failure (DNA-3)
  Tenant-scoped paths: {prefix}/{tenant_id}/{secret_name}

IRON RULE: Service code NEVER imports boto3/aiobotocore directly.
  Resolution: factory_registry.create_async("ISecretsService", ctx)

FORBIDDEN IMPORTS (outside secrets/ directory):
  boto3, aiobotocore, botocore — only allowed in aws_provider.py
```

---

## SK-403 — CONFIGBUILDER RESOLUTION PATTERNS
```
SKILL: SK-403
NAME: ConfigBuilder Resolution Patterns
TASK TYPES: T565, T566
FACTORIES: F1487
ARCHETYPE: INFRASTRUCTURE / CONFIG

PURPOSE: Reference implementation of config reference resolution through secrets fabric.

PATTERN — Reference Syntax:
  $secret:path/to/key     → resolves through ISecretsService.get_secret()
  $env:VARIABLE_NAME      → resolves through os.environ (shortcut for local dev)
  plain text              → passed through unchanged

PATTERN — ConfigBuilder:
  async resolve(scope_id, config: dict) → DataProcessResult[dict]
  - Recursively walks all dict values
  - Detects $secret: and $env: prefixes
  - Resolves through ISecretsService or os.environ
  - Caches resolved values with configurable TTL
  - Returns fully-resolved plain dict

PATTERN — Cache Strategy:
  Key: (scope_id, reference_string)
  TTL: configurable (default 300s) — MACHINE: must have TTL, FREEDOM: TTL duration
  Eviction: time-based only — no manual invalidation
  Thread safety: asyncio.Lock per cache key

PATTERN — Error Handling:
  Missing secret → DataProcessResult.failure("SECRET_NOT_FOUND", path)
  Provider down → DataProcessResult.failure("PROVIDER_ERROR", details)
  Partial resolution → report which refs failed, resolved refs still cached

IRON RULE: No plaintext secrets in ANY log output.
  ConfigBuilder masks resolved values in debug logs: $secret:path → [RESOLVED]
```

---

## SK-404 — NATIVE XAI SDK INTEGRATION PATTERNS
```
SKILL: SK-404
NAME: Native xAI SDK Integration Patterns
TASK TYPES: T566
FACTORIES: F1488
ARCHETYPE: AI_ENGINE / PROVIDER

PURPOSE: Reference implementation of xAI Grok provider using native xai_sdk (NOT OpenAI wrapper).

PATTERN — Provider Init:
  from xai_sdk import AsyncClient
  from xai_sdk.chat import user, system
  client = AsyncClient(api_key=key)  # or reads XAI_API_KEY env

PATTERN — Generate:
  chat = client.chat.create(model="grok-4")
  if system_prompt: chat.append(system(system_prompt))
  chat.append(user(prompt))
  response = await chat.sample()
  text = response.content

PATTERN — Structured Output:
  system_prompt includes JSON schema instruction
  response.content parsed as JSON
  Fallback: DataProcessResult.failure("PARSE_ERROR")

PATTERN — Health Check:
  Small generate call ("ping") with max_tokens=1
  Success → DataProcessResult.success(True)
  Failure → DataProcessResult.failure("UNHEALTHY")

DD-358: Native xai_sdk over OpenAI-compatible wrapper because:
  - No cross-provider SDK dependency (fabric-pure)
  - Access to xAI-specific features (streaming, telemetry)
  - Proper xAI error types, not OpenAI error classes
  - Future-proof for xAI features not in OpenAI-compat layer

FORBIDDEN: import openai in grok_provider.py — verified by test_no_openai_import
```
