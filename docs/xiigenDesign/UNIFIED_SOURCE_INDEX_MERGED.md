# XIIGen — UNIFIED SOURCE INDEX & CROSS-REFERENCE (Python + React Native)
## Consolidated: All 32 Flows Merged
## Date: 2026-03-01 | Status: AUTHORITATIVE POST-FLOW-31 REFERENCE
## Scope: F1–F1338, T1–T515, DD-1–DD-322, DR-1–DR-239, 31 flows
## Stack: Python 3.12 + FastAPI | React Native + Expo + TypeScript
## Supersedes: UNIFIED_SOURCE_INDEX_MERGED.md (.NET/C# reference — archived)

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
> | Factories | F1–F1338 | F1–F1600+ (highest: F1592) |
> | Task Types | T1–T515 | T1–T649 (398 unique, incl. T605-T649 remapped) |
> | BFA Rules | CF-1–CF-714 | CF-1–CF-809+ |
> | Skills | SK-1–SK-329 | SK-1–SK-527 (138 skill .md files) |
> | Design Decisions | DD-1–DD-322 | DD-1–DD-322 + 124 extracted from history RAG |
> | Flows | 31 | 45 flow directories (FLOW-01..40 + FLOW-45) |
> | Next Factory | F1339 | **F1601** |
> | Next Task Type | T516 | **T650** |
>
> **Live cross-reference sources:**
> - `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` — current flow implementation state
> - `docs/state/STATE-FINAL.json` — final artifact state
> - `docs/sessions/historyRag/` — 124 extracted design decisions (pass1..pass5)
> - `server/src/engine-contracts/` — all task type contracts by semantic slug
>
> **The cross-reference mappings between factories, task types, and flows remain architecturally valid.**
> Numbers above the design-phase maximums reflect FLOW-15..24 additions and infrastructure flows.

---

# ═══ CONSOLIDATED MASTER INDEX (Updated 2026-04-14) ═══

## System State

| Artifact | Design (Post-31) | Actual (2026-04-14) |
|----------|-------------------|---------------------|
| Factories | 1,338 (F1–F1338) | 1,600+ (F1–F1592) |
| Task Types | 515 (T1–T515) | 398 unique (T1–T649 + T367–T374) |
| BFA Conflict Rules | 714 (CF-1–CF-714) | 94+ unique (CF-1–CF-809) |
| Skill Patterns | 329 (SK-1–SK-329) | 138 files (SK-1–SK-527) |
| Design Decisions | 322 (DD-1–DD-322) | 322 + 124 from history RAG |
| Flows Complete | 31 (FLOW-01–FLOW-31) | 45 directories |
| Services | ~200 | 378 .service.ts files |

## Next Available Numbers

```
Factory:          F1601    Family: 209
Task Type:        T650
BFA Rule:         CF-809
Skill:            SK-529
```

## Fabric Interfaces (Layer 0) — Updated 2026-04-14

| Fabric | Interface | Actual Providers |
|--------|-----------|-----------------|
| DATABASE | IDatabaseService | Elasticsearch (primary), in-memory (test) |
| QUEUE | IQueueService | In-memory queue (current), Redis Streams (planned) |
| AI ENGINE | IAiProvider + AiDispatcher | Anthropic, OpenAI, Gemini, MockAiProvider |
| RAG | IRagService | InMemoryRagProvider, LightRAG, NanoGraphRAG |
| SECRETS | ISecretsService | Environment-based (added in P26) |
| FLOW ENGINE | IFlowOrchestrator | CycleChainService + AF pipeline |

> **Note:** Design listed 6 providers for DATABASE (ES/Mongo/PG/Redis/MySQL/SQL Server).
> Actual implementation uses Elasticsearch + in-memory test provider only.
> SECRETS fabric was added in P26 (MT Foundation), not in original design.

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
| FLOW-41..44 | Platform Adapters | — | — | EXTERNAL_REPO |
| FLOW-45 | History Bootstrap | F1576-F1592 | T601-T604 | — |

## Factory Ranges by Flow (Quick Lookup)

| Flow | Factory Range | Family Range | Primary Fabric |
|------|--------------|-------------|----------------|
| Base V39/V40/V43 | F1–F165 | 1–16 | All fabrics |
| FLOW-05 | F166–F173 | 17 | DATABASE |
| FLOW-01 | F174–F181 | 18 | DATABASE + QUEUE |
| FLOW-02 | F182–F189 | 19 | DATABASE |
| FLOW-04 | F190–F196 | 20 | QUEUE + DATABASE |
| FLOW-03 | F197–F204 | 21 | DATABASE + AI ENGINE |
| FLOW-06 | F225–F233 | 25 | DATABASE + AI ENGINE |
| FLOW-07 | F234–F243 | 26 | DATABASE + QUEUE |
| FLOW-08 | F244–F271 | 27–29 | DATABASE + QUEUE |
| FLOW-09 | F272–F287 | 30–31 | DATABASE + QUEUE |
| FLOW-10 | F288–F367 | 32–37 | ALL |
| FLOW-11 | F325–F367 | 38–44 | DATABASE + AI ENGINE |
| FLOW-12 | F368–F383 | 45 | DATABASE + QUEUE |
| FLOW-13 | F384–F425 | 46–51 | DATABASE |
| FLOW-14 | F426–F495 | 52–59 | DATABASE + QUEUE |
| FLOW-15 | F496–F565 | 60–73 | ALL |
| FLOW-16 | F566–F579 | 74 | DATABASE + AI ENGINE |
| FLOW-17 | F580–F630 | 75–83 | DATABASE + QUEUE |
| FLOW-18 | F631–F696 | 84–93 | ALL |
| FLOW-19 | F697–F727 | 94–101 | DATABASE + QUEUE |
| FLOW-20 | F728–F851 | 102–118 | ALL |
| FLOW-21 | F852–F900 | 119–127 | DATABASE + QUEUE |
| FLOW-22 | F901–F944 | 128–134 | DATABASE + AI ENGINE |
| FLOW-23 | F945–F981 | 135–139 | DATABASE |
| FLOW-24 | F982–F1027 | 140–146 | DATABASE + RAG + AI ENGINE |
| FLOW-25 | F1028–F1074 | 147–153 | DATABASE + AI ENGINE |
| FLOW-26 | F1075–F1102 | 154–159 | ALL |
| FLOW-27 | F1103–F1128 | 160–164 | DATABASE + QUEUE + FLOW ENGINE |
| FLOW-28 | F1129–F1175 | 165–174 | DATABASE + AI ENGINE |
| FLOW-29 | F1176–F1247 | 175–184 | DATABASE + RAG + AI ENGINE |
| FLOW-30 | F1248–F1270 | 185–190 | DATABASE + RAG + AI ENGINE |
| FLOW-31 | F1271–F1338 | 191–199 | DATABASE + AI ENGINE + RAG |
| FLOW-32 | F1339–F1400 | 200–205 | DATABASE + QUEUE + RAG + SECRETS |
| FLOW-33 | F1401–F1420 | 206 | DATABASE + QUEUE + AI ENGINE |
| FLOW-35 | F1484–F1490 | 207 | DATABASE + AI ENGINE + SECRETS |
| FLOW-36 | F1491–F1510 | 208 | DATABASE + AI ENGINE + RAG + QUEUE |
| FLOW-37 | F1511–F1530 | — | DATABASE + QUEUE |
| FLOW-38 | F1531–F1545 | — | DATABASE + QUEUE |
| FLOW-39 | F1546–F1560 | — | DATABASE + QUEUE |
| FLOW-40 | F1561–F1575 | — | DATABASE + SSE_POOL |
| FLOW-45 | F1576–F1592 | — | DATABASE + QUEUE + SECRETS |

## Flow Section Navigation

| Flow | Line | Section |
|------|------|---------|
| FLOW-01 | ~2 | User Registration & Onboarding |
| FLOW-02 | ~219 | Content Management |
| FLOW-03 | ~4 | Event Creation & Promotion |
| FLOW-04 | ~334 | Post Publishing & Feed Distribution |
| FLOW-05 | ~128 | Lesson Completion & Gamification |
| FLOW-06 | ~593 | Marketplace Publishing & Distribution |
| FLOW-07 | ~772 | Friend Request & Social Feed |
| FLOW-08 | ~972 | Multi-Tenant Payment Processing |
| FLOW-09 | ~1168 | Transactional Event Participation |
| FLOW-10 | ~1401 | Social Platform (Post/Feed/Chat/Search) |
| FLOW-11 | ~1604 | Content Moderation & Social Graph |
| FLOW-12 | ~1689 | Chat & Messaging Platform |
| FLOW-13 | ~1839 | Data Warehouse & Analytics |
| FLOW-14 | ~2357 | Data Pipeline & ETL |
| FLOW-15 | ~2583 | MVP Builder & App Platform |
| FLOW-16 | ~2915 | Giant Shop (E-Commerce Platforms) |
| FLOW-17 | ~3224 | Freelancer Marketplace |
| FLOW-18 | ~3752 | Visual Flow Creation & Code Injection |
| FLOW-19 | ~3890 | CI/CD & DevOps Control Plane |
| FLOW-20 | ~4210 | Sponsored Content + Graph API + Ads |
| FLOW-21 | ~4516 | Forms & Flow Automation Builder |
| FLOW-22 | ~4989 | Visual Editor & Site Builder |
| FLOW-23 | ~5553 | Visual Editor Extended (Canvas/Layout) |
| FLOW-24 | ~5800 | Learning Calendar (AI Tutor) |
| FLOW-25 | ~5993 | BFA Cross-Flow Governance & Impact |
| FLOW-26 | ~6434 | Self-Developing Meta-Flow Engine |
| FLOW-27 | ~6737 | Human Interaction Gate + Scheduling |
| FLOW-28 | ~6978 | Blog/CMS Modules Platform |
| FLOW-29 | ~7265 | Adaptive RAG Deep Research Engine |
| FLOW-30 | ~7521 | PromptOps — Self-Learning Prompts |

# ═══ END CONSOLIDATED MASTER INDEX ═══

---


# LAYER 0: FABRIC INTERFACES

| Concept | Source | Section | Key Detail |
|---------|--------|---------|------------|
| IDatabaseService (6 providers) | basic_prompt.txt | LAYER 0 — DATABASE FABRIC | ES, Mongo, PG, Redis, MySQL, SQLServer |
| IQueueService | basic_prompt.txt | LAYER 0 — QUEUE FABRIC | Redis Streams, Main→Consumed→Archive→DLQ |
| IAiProvider + AiDispatcher | basic_prompt.txt | LAYER 0 — AI ENGINE FABRIC | Claude, OpenAI, Gemini, DeepSeek |
| IRagService (7 strategies) | basic_prompt.txt | LAYER 0 — RAG FABRIC | Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi |
| MicroserviceBase (19 components) | basic_prompt.txt | LAYER 0 — CORE FABRIC | ALL services inherit |
| IFlowDefinition + IFlowOrchestrator | basic_prompt.txt | LAYER 0 — FLOW ENGINE FABRIC | JSON DAGs in ES |

# LAYER 1: FACTORY PATTERN

| Concept | Source | Section | Key Detail |
|---------|--------|---------|------------|
| IExternalServiceFactory<T> | V39_ENGINE_DESIGN | PART 0-1 | CreateAsync(ctx), config-first routing |
| Universal Factory Base Contract | V39_ENGINE_DESIGN | PART 1 | 7-step resolution: config→registry→validate→health→fallback→escalate |
| Factory Resolution Context | V40_MASTER_PLAN | PART 0 (DB1/DB2) | Async creation, config-first routing |
| F1-F53 (original V39/V40 range) | V40_MASTER_PLAN | Family Registry | 14 families, 41 catalog + 12 new |
| F54-F68 (V43 extension) | V43_FABRIC_EXTENSION | PART 0 | Execution + Infrastructure + Management |
| F69-F165 (V40 expansion) | V40_MASTER_PLAN | Full registry | Task type dependency maps |
| **F166-F173 (FLOW-05)** | **FLOW05_MERGED_FINAL** | **Phase 1** | **8 factories, 31 methods, FACTORY CREATION blocks, FREEDOM:None on F170/F172** |
| **F174-F181 (FLOW-01)** | **FLOW01_ENGINE_EXTENSION** | **Phase 1** | **8 new user registration factories** |
| **F197-F204 (FLOW-03)** | **FLOW03_ENGINE_EXTENSION_COMBINED** | **Phase P1** | **8 factories (Family 21: Event Promotion), ~30 methods, CQRS write path F201** |

# LAYER 2: ENGINE CONTRACTS

| Concept | Source | Section | Key Detail |
|---------|--------|---------|------------|
| Task Types T1-T7 (full format) | TASK_TYPES_CATALOG.md | All sections | Reference for format |
| T1: Media Transformation | TASK_TYPES_CATALOG | Section 1 | voice-to-video, 3 phases |
| T2: Content Pipeline | TASK_TYPES_CATALOG | Section 2 | blog→TikTok, 4 phases |
| T3: Figma to System | TASK_TYPES_CATALOG | Section 3 | 8 phase-gated steps |
| T4: Coaching & Tracking | TASK_TYPES_CATALOG | Section 4 | 7 phases, multi-session |
| T5: Text to System | TASK_TYPES_CATALOG | Section 5 | 5 phases |
| T6: Design Integration | TASK_TYPES_CATALOG | Section 6 | 5 phases |
| T7: Legacy Migration | TASK_TYPES_CATALOG | Section 7 | Multi-session, sub-flows |
| Required fields per contract | basic_prompt.txt | LAYER 2 | ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, QUALITY GATES |
| Family Registry (16→21) | TASK_TYPES_CATALOG + FLOW05 + FLOW01 + FLOW02 + FCE + FLOW03 | FAMILY REGISTRY | 21 families after FLOW-03 |
| Flow Template Registry (8→13) | TASK_TYPES_CATALOG + FLOW05 + FLOW01 + FLOW02 + FCE + FLOW03 | FLOW TEMPLATE | 13 templates after FLOW-03 |
| **T44: Fan-Out Scoring** | **FLOW05_MERGED_FINAL** | **Phase 2** | **Gamification branch, 8 IRs, 6 QGs** |
| **T45: ML Adaptation Gate** | **FLOW05_MERGED_FINAL** | **Phase 2** | **Learning branch, 8 IRs, 7 QGs, 10s ML budget** |
| **T46: Social Learning Dist** | **FLOW05_MERGED_FINAL** | **Phase 2** | **Social branch, 8 IRs, 7 QGs, T46 MUST NOT award points directly** |
| **T47: Multi-Path Auth Gate** | **FLOW01_ENGINE_EXTENSION** | **Phase 2** | **SSO + Email routing, account merge** |
| **T48: Deferred Verification** | **FLOW01_ENGINE_EXTENSION** | **Phase 2** | **Email verify with wait state** |
| **T49: Onboarding Orchestration** | **FLOW01_ENGINE_EXTENSION** | **Phase 2** | **Questionnaire + completion → GATE for all flows** |
| **T59: Event Processing Pipeline** | **FLOW03_ENGINE_EXTENSION_COMBINED** | **Phase P2** | **Fork-join (index+analyze+status), outbox, moderation gate, 8 IRs, 5 QGs** |
| **T60: Multi-Factor Audience Scoring** | **FLOW03_ENGINE_EXTENSION_COMBINED** | **Phase P2** | **5-factor weighted scoring, 3-tier segmentation, GDPR location, 8 IRs, 6 QGs** |
| **T61: Multi-Channel Delivery** | **FLOW03_ENGINE_EXTENSION_COMBINED** | **Phase P2** | **Feed injection + notification with backpressure, 4 channels, 8 IRs, 7 QGs** |
| **T62: Promotion Campaign Aggregation** | **FLOW03_ENGINE_EXTENSION_COMBINED** | **Phase P2** | **Async 7-day window, ROI calculation, billing sequence, 7 IRs, 6 QGs** |

# LAYER 3: AF STATIONS

| Station | Role | Source | FLOW-05 Role |
|---------|------|--------|-------------|
| AF-1 Genesis | Generate code from spec | basic_prompt.txt LAYER 3 | Generates gamification services on fabrics |
| AF-2 Planning | Decompose into steps | basic_prompt.txt LAYER 3 | 3 parallel branches + join |
| AF-3 Prompt Library | Domain-specific prompts | basic_prompt.txt LAYER 3 | Gamification scoring, ML adaptation |
| AF-4 RAG (Task Context) | Reusable patterns | basic_prompt.txt LAYER 3 | SK-383 (RedisStreamQueue), SK-382 (ElasticsearchDatabase), FLOW-04 pipeline |
| AF-5 Multi-model | Competing models | basic_prompt.txt LAYER 3 | ML adaptation: Claude vs GPT vs Gemini |
| AF-6 Code Review | Automated review | basic_prompt.txt LAYER 3 | Overflow, timezone, race conditions |
| AF-7 Compliance | DNA check | basic_prompt.txt LAYER 3 | All 6 patterns |
| AF-8 Security | Security scan | basic_prompt.txt LAYER 3 | Client-side injection, privacy, rate limits |
| AF-9 Judge | Iron rules + quality gates | basic_prompt.txt LAYER 3 | T44/T45/T46 specific rules |
| AF-10 Merge | Multi-model merge | basic_prompt.txt LAYER 3 | Best ML adaptation result |
| AF-11 Feedback | Quality storage | basic_prompt.txt LAYER 3 | Future gamification improvements |
| 3 sub-engines | INVENTORY/SYNTHESIS/JUDGMENT | V40_MASTER_PLAN PART 1 | See FLOW-05 Appendix B |

# LAYER 4: GUARDRAILS

| Concept | Source | Section | Key Detail |
|---------|--------|---------|------------|
| BFA — Business Flow Arbiter | V62_BFA_STRESS_TEST.md | Full doc | 6-step T32 engine |
| BFA Gaps G1-G7 | V62_BFA_STRESS_TEST.md | POST-FLOW-03 STATUS | ENFORCED (FCE) + REINFORCED (FLOW-03) = 0 open |
| BFA Conflict Rules CF-1–CF-17 | V62_BFA_STRESS_TEST + FLOW03 | CF rules | CF-1–CF-9 (pre-FLOW-03) + CF-10–CF-17 (FLOW-03) |
| 7 DNA Patterns | basic_prompt.txt + ENGINE_ARCHITECTURE | LAYER 4 + DNA-7 | parse_document, build_search_filter, DataProcessResult, MicroserviceBase, Scope Isolation, DynamicController, W3C Trace |
| Promotion Ladder | basic_prompt.txt | LAYER 4 | GENERATED→INJECTED→MINIMAL→CORE |

# FLOW SPECIFICATIONS

| Flow | Source | Key Dependencies |
|------|--------|-----------------|
| FLOW-01 (User Registration) | Referenced in V62 stress test | Prerequisite for all other flows |
| FLOW-02 (Matching) | Referenced in flow specs | Prerequisite for FLOW-05 (active learning program) |
| FLOW-04 (Feed Distribution) | Referenced in flow specs | Reused by FLOW-05 social branch |
| **FLOW-05 (Lesson Gamification)** | **05-lesson-completion-gamification.md** | **Depends on FLOW-01, FLOW-02; reuses FLOW-04** |
| FLOW-05 deep research | 05-lesson-completion-gamification_deep_research.md | Architecture risks, CloudEvents, sync+async pattern |

# FLOW-01 SPECIFICATION DETAIL

| Concept | Source | Section |
|---------|--------|---------|
| 7 services involved | 01-user-registration.md | Services Involved |
| 10 domain events | 01-user-registration.md | Event Definitions |
| 2 registration paths (SSO + Email) | 01-user-registration.md | event_chain |
| Account merge logic | 01-user-registration.md | Business Logic |
| Email verification (24hr token) | 01-user-registration.md | Business Logic |
| Onboarding completion criteria | 01-user-registration.md | Business Logic |
| 10 edge cases | 01-user-registration.md | Edge Cases |
| Security (OAuth, JWT, CSRF, rate limiting) | 01-user-registration.md | IT Security Manager |
| SLAs (p99 < 2s, email < 60s, questionnaire < 5s) | 01-user-registration.md | DevOps |
| Deep research findings | 01-user-registration_deep_search.md | CloudEvents, durable messaging, saga hooks |
| 8 new factory interfaces (F174-F181) | FLOW01_ENGINE_EXTENSION.md | Phase 1 |
| 3 engine contracts (T47-T49) | FLOW01_ENGINE_EXTENSION.md | Phase 2 |
| Flow template (user-registration-v1) | FLOW01_ENGINE_EXTENSION.md | Phase 3 |
| BFA: 10 events, 9 entities, 3 APIs, 4 business rules | FLOW01_ENGINE_EXTENSION.md | Phase 4 |
| V62 gaps G4+G7 addressed (ALL 7 now closed) | FLOW01_ENGINE_EXTENSION.md | Phase 4 |
| DNA compliance 48/48 | FLOW01_ENGINE_EXTENSION.md | Phase 5 |

# FLOW-01 CROSS-FLOW IMPACT (FOUNDATION FLOW)

| Downstream Flow | Depends On | Gate Event |
|----------------|-----------|------------|
| FLOW-02 (Matching) | UserOnboardingCompleted.onboardingSteps | E10 |
| FLOW-03 (Events) | UserOnboardingCompleted.completedAt | E10 |
| FLOW-04 (Feed Distribution) | UserOnboardingCompleted (user preferences) | E10 |
| FLOW-05 (Lesson Gamification) | UserOnboardingCompleted + QuestionnaireCompleted | E10, E9 |

**FLOW-01 is the FOUNDATION — if UserOnboardingCompleted doesn't fire, no other flow can start.**

# FLOW-05 SPECIFICATION DETAIL

| Concept | Source | Section |
|---------|--------|---------|
| 9 services involved | 05-lesson-completion-gamification.md | Services Involved |
| 11 domain events | 05-lesson-completion-gamification.md | Event Definitions |
| 3 parallel branches | 05-lesson-completion-gamification.md | event_chain |
| Gamification business logic | 05-lesson-completion-gamification.md | Business Logic |
| Learning adaptation rules | 05-lesson-completion-gamification.md | Learning Plan Adaptation |
| Social distribution weights | 05-lesson-completion-gamification.md | social_distribution |
| Edge cases (6) | 05-lesson-completion-gamification.md | Edge Cases |
| Security/privacy requirements | 05-lesson-completion-gamification.md | IT Security Manager |
| 8 factories (F166-F173) with FACTORY CREATION | FLOW05_MERGED_FINAL.md | Phase 1 |
| 31 factory methods across 8 interfaces | FLOW05_MERGED_FINAL.md | Phase 1 |
| FREEDOM:None on F170 (ledger) and F172 (grading) | FLOW05_MERGED_FINAL.md | Phase 1 F170/F172 |
| G6 transactional rule (partial writes = BFA ALERT) | FLOW05_MERGED_FINAL.md | Phase 1 entity registry |
| Multi-DB entity registry (Primary/Cache/History) | FLOW05_MERGED_FINAL.md | Phase 1 + Phase 4 |
| 3 engine contracts (T44-T46) full format | FLOW05_MERGED_FINAL.md | Phase 2 |
| T46: MUST NOT award points directly → T44 via F166 | FLOW05_MERGED_FINAL.md | Phase 2 T46 BFA |
| Flow template (lesson-gamification-v1) | FLOW05_MERGED_FINAL.md | Phase 3 |
| Detailed flow JSON with BFA pre-validation node | FLOW05_MERGED_FINAL.md | Appendix D |
| Sub-engine routing table | FLOW05_MERGED_FINAL.md | Appendix B |
| Promotion ladder per contract (test milestones) | FLOW05_MERGED_FINAL.md | Appendix C |
| 6 BFA stress tests (T9-T14) | FLOW05_MERGED_FINAL.md | Appendix E |
| T45: Python/FastAPI, 10s ML budget | FLOW05_MERGED_FINAL.md | Appendix F |
| DNA compliance 48/48 | FLOW05_MERGED_FINAL.md | Phase 5 |

# ARCHITECTURE EVOLUTION

| Version | Source | Key Contribution |
|---------|--------|-----------------|
| V39 | XIIGEN_V39_ENGINE_DESIGN.md | Factory-first philosophy, 12 factory interfaces |
| V40 | XIIGEN_V40_MASTER_PLAN_v2.md | Engine-Fabric-First, AF stations, 41 families, task types |
| V43 | V43_MASTER_PLAN.md | Unified Flow Factory, 53 factories, flow schemas |
| V43 EXT | V43_FABRIC_EXTENSION.md | Execution/Infra/Mgmt fabrics, F54-F68 |
| V40-V69 Audit | V40_V69_ARCHITECTURE_AUDIT.md | Compliance audit, keep/discard/salvage |
| V62 BFA | V62_BFA_STRESS_TEST.md | BFA stress test, 7 gaps identified |

# ANTI-PATTERNS (MUST NOT)

1. ❌ Describe services as standalone implementations
2. ❌ Skip fabric resolution mapping
3. ❌ Use one-line task type stubs
4. ❌ Forget AF station mapping
5. ❌ Import specific providers (PostgreSQL, Redis, OpenAI)
6. ❌ Create typed models (use dict[str, Any])
7. ❌ Break backward compatibility (T1-T43, F1-F165)

# REUSE ANALYSIS (FLOW-05)

| Need | Existing Asset | Action |
|------|---------------|--------|
| Answer storage | IDatabaseService → MongoDB | ✅ REUSE |
| Event publishing | IQueueService → Redis Streams | ✅ REUSE |
| ML inference | IAiProvider → model inference | ✅ REUSE |
| Similarity matching | IRagService → scoring | ✅ REUSE |
| Feed distribution | FLOW-04 pipeline | ✅ REUSE |
| Notifications | Existing pattern | ✅ REUSE |
| Gamification scoring | — | 🆕 F166 |
| Learning adaptation | — | 🆕 F167 |
| Achievement registry | — | 🆕 F168 |
| Streak tracking | — | 🆕 F169 |
| Point ledger | — | 🆕 F170 |
| Questionnaire post | — | 🆕 F171 |
| Grade calculation | — | 🆕 F172 |
| Learning audience | — | 🆕 F173 |

# REUSE ANALYSIS (FLOW-01)

| Need | Existing Asset | Action |
|------|---------------|--------|
| Event publishing (all 10) | IQueueService → Redis Streams | ✅ REUSE |
| Credential storage | IDatabaseService → PostgreSQL | ✅ REUSE |
| Profile storage | IDatabaseService → MongoDB | ✅ REUSE |
| Session cache | IDatabaseService → Redis | ✅ REUSE |
| Analytics indexing | IDatabaseService → Elasticsearch | ✅ REUSE |
| AI questionnaire personalization | IAiProvider → multi-model | ✅ REUSE |
| RAG for onboarding patterns | IRagService → scoring | ✅ REUSE |
| Flow orchestration | IFlowOrchestrator | ✅ REUSE |
| SSO/OAuth authentication | — | 🆕 F174 |
| User profile + state machine | — | 🆕 F175 |
| Email delivery (verification) | — | 🆕 F176 |
| Questionnaire generation/mgmt | — | 🆕 F177 |
| Chat-based message delivery | — | 🆕 F178 |
| Registration analytics/funnel | — | 🆕 F179 |
| Compliance audit trail | — | 🆕 F180 |
| Token lifecycle management | — | 🆕 F181 |

# PHASE 6 — UNIFIED_SOURCE_INDEX ADDITIONS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-02 SPECIFICATION DETAIL (append to UNIFIED_SOURCE_INDEX.md)

| Concept | Source | Section |
|---------|--------|---------|
| 9 services involved | 02-business-onboarding.md | services YAML block |
| 11 domain events | 02-business-onboarding.md | event_chain |
| 3 parallel branches | 02-business-onboarding.md | event_chain parallel_branch_1/2/3 |
| Matching algorithm weights | 02-business-onboarding.md | matching_algorithm.compatibility_score |
| 4 cache TTL patterns | 02-business-onboarding.md | caching_strategy |
| 4 data stores | 02-business-onboarding.md | data_stores |
| Graceful degradation rules | 02-business-onboarding.md | Failure Modes section |
| Privacy: k-anonymity, match score TTL | 02-business-onboarding.md | IT Security Manager |
| GDPR cascade | 02-business-onboarding.md | Privacy Considerations |
| DevOps: tech stacks, SLAs | 02-business-onboarding.md | DevOps section |
| Fork/join semantics, CloudEvents, debounce | 02-business-onboarding_deep_search_engine.md | Flow shape section |
| DSL shape example (JSON) | 02-business-onboarding_deep_search_engine.md | Proposed flow definition DSL |
| 8 factories F182–F189 | FCE_EXEC_P2_F182_F189.md (this session) | Family 19 |
| 3 engine contracts T50–T52 | FCE_EXEC_P1_T50_T52.md (this session) | Task types |
| Flow template business-onboarding-v1.json | FCE_EXEC_P1_T50_T52.md (this session) | Flow template |
| BFA: 11 events, 8 entities, CF-1 to CF-9 | FCE_EXEC_P1_T50_T52.md | BFA Validation sections |

## FLOW-02 CROSS-FLOW IMPACT

| Downstream Flow | Depends On | Gate Event |
|----------------|-----------|------------|
| FLOW-03 (Event Suggestions) | OnboardingCompleted | T52 output |
| FLOW-04 (Feed Distribution) | UserFeedPersonalized + OnboardingCompleted | T51 + T52 output |
| FLOW-05 (Lesson Gamification) | LearningProgramGenerated + OnboardingCompleted | T50 + T52 output |
| FLOW-07 (Friend Requests) | ConnectionSuggestionsReady | T51 output |

## FLOW_CREATION ENGINE SECTION (append to UNIFIED_SOURCE_INDEX.md)

| Concept | Source | Section |
|---------|--------|---------|
| FCE plan source | XIIGEN_FCE_MERGED_v2.md | Full document |
| T53–T59 engine contracts | FCE_EXEC_P3_T53_T59.md (this session) | 7 contracts |
| F190–F196 factory interfaces | FCE_EXEC_P4_F190_F196.md (this session) | Family 20 |
| Queue Fabric +3 methods | FCE_EXEC_P4_F190_F196.md | Queue Fabric Extension section |
| DNA-7 W3C Trace Context | FCE_EXEC_P4_F190_F196.md | DNA Pattern 7 section |
| BFA G1–G7 enforcement indexes | FCE_EXEC_P4_F190_F196.md | BFA Enforcement section |
| AF 11×7 mapping table | FCE_EXEC_P3_T53_T59.md | AF Station Mapping section |
| Fabric-first UI component model | FCE_EXEC_P3_T53_T59.md | T56 Component Model |
| Self-extension pipeline (T58) | FCE_EXEC_P3_T53_T59.md | T58 contract |
| Flow migration pattern (T59) | FCE_EXEC_P3_T53_T59.md | T59 contract |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-03 SPECIFICATION DETAIL (Event Creation & Promotion)

| Concept | Source | Section |
|---------|--------|---------|
| 8 services involved | 03-event-creation-promotion.md | Services Involved |
| 8 domain events | 03-event-creation-promotion.md | Event Definitions |
| Parallel pipeline (index + analyze + status) | 03-event-creation-promotion.md | event_chain |
| Multi-factor matching (5 weights) | 03-event-creation-promotion.md | Business Logic (matching_algorithm) |
| 3-tier segmentation (strong/medium/weak) | 03-event-creation-promotion.md | Business Logic (tier_assignment) |
| Feed placement rules (score-based) | 03-event-creation-promotion.md | Business Logic (feed_placement) |
| Multi-channel notifications (4 channels) | 03-event-creation-promotion.md | Business Logic (notification_routing) |
| Campaign analytics (reach/CTR/ROI) | 03-event-creation-promotion.md | Business Logic (campaign_metrics) |
| Event status machine (6 states) | 03-event-creation-promotion.md | Business Logic (status_machine) |
| Edge cases (timezone, capacity, zero-match) | 03-event-creation-promotion.md | Edge Cases |
| Security (rate limit, moderation, organizer controls) | 03-event-creation-promotion.md | IT Security Manager |
| Deep research (outbox, idempotency, backpressure) | 03-event-creation-promotion_deep_research.md | DR-1 through DR-8 |
| 8 factories F197–F204 | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P1 |
| 4 engine contracts T59–T62 | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P2 |
| 31 iron rules + 24 quality gates | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P2 |
| Flow template event-promotion-v1 | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P3 |
| BFA: CF-10–CF-17, V62 G1-G7 REINFORCED | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P4 |
| AF station mapping 11×4 = 44 cells | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P5 |
| DNA compliance 56/56 | FLOW03_ENGINE_EXTENSION_COMBINED.md | Phase P6 |
| CQRS decision: F201 (write) vs F188/F189 (read) | FLOW03_ENGINE_EXTENSION_COMBINED.md | Why F201 Exists |
| T62 async window justification | FLOW03_ENGINE_EXTENSION_COMBINED.md | Why 4 Contracts |

## FLOW-03 CROSS-FLOW IMPACT

| Upstream Flow | Depends On | Gate Event |
|--------------|-----------|------------|
| FLOW-01 (User Registration) | UserOnboardingCompleted (E10) | Organizer must be onboarded |
| FLOW-02 (Business Onboarding) | BusinessProfileCompleted | Organizer needs business profile |
| FLOW-02 (Business Onboarding) | F182 IBusinessProfileService | User profiles for scoring input |

| Downstream Flow | Depends On | FLOW-03 Provides |
|----------------|-----------|------------------|
| FLOW-08 (Event Participation) | EventCreated, TargetAudienceIdentified | Event data + audience segments |

**FLOW-03 depends on FLOW-01 + FLOW-02 completion. FLOW-08 depends on FLOW-03 output.**

## FLOW-03 REUSE ANALYSIS

| Need | Existing Asset | Action |
|------|---------------|--------|
| Event storage | IDatabaseService → PG | ✅ REUSE fabric |
| Domain events (8) | IQueueService → Redis Streams | ✅ REUSE fabric |
| ML predictions | IAiProvider / AiDispatcher | ✅ REUSE fabric |
| Interest similarity | IRagService → Vector | ✅ REUSE fabric |
| Flow orchestration | IFlowOrchestrator (SK-392 (RagStrategyRegistry)) | ✅ REUSE fabric |
| Feed READ path | F188/F189 (FLOW-02) | ✅ REUSE (read-only) |
| Business profiles | F182 (FLOW-02) | ✅ REUSE (matching input) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| Event CRUD + state machine | — | 🆕 F197 |
| Event-user matching | — | 🆕 F198 |
| Audience tiers | — | 🆕 F199 |
| Search indexing write | — | 🆕 F200 |
| Feed write/inject (CQRS) | — | 🆕 F201 |
| Notification dispatch | — | 🆕 F202 |
| Payment/billing | — | 🆕 F203 |
| Campaign analytics | — | 🆕 F204 |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-04: POST PUBLISHING & FEED DISTRIBUTION
# Merged: 2026-02-25 | Source: FLOW04_ENGINE_EXTENSION_v2.md
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-04 Quick Lookup

| Concept | Location | Key Detail |
|---------|----------|------------|
| FLOW-04 spec | 04-post-publishing.md | 10 events, 8 services, 6-factor ranking |
| FLOW-04 deep research | 04-post-publishing_deep_search.md | Join semantics, ER diagrams |
| Family 22 factories | ENGINE_ARCHITECTURE_MERGED.md → F205-F212 | 8 factories, 34 methods |
| Engine contracts | TASK_TYPES_CATALOG_MERGED.md → T63-T66 | 4 contracts, 34 IR, 28 QG |
| BFA conflict rules | V62_BFA_STRESS_TEST_MERGED.md → CF-18-CF-25 | 8 rules, all PASS |
| Flow template 14 | TASK_TYPES_CATALOG_MERGED.md → post-publishing-v1 | 10 nodes, 12 edges |

## FLOW-04 Concept → Factory Map

| Concept | Factory | Fabric |
|---------|---------|--------|
| Post storage + media | F205 IPostContentService | DATABASE(MongoDB) + QUEUE(Redis Streams) |
| NLP analysis (topics, sentiment, entities) | F206 INlpAnalysisService | AI ENGINE(Claude/Gemini) + DATABASE(Redis, ES) |
| Business-content matching | F207 IContentMatchingService | DATABASE(PG+ES) + AI ENGINE(Claude) |
| Social graph (friends, followers) | F208 ISocialGraphService | DATABASE(Neo4j+PG) + DATABASE(Redis) |
| Group membership resolution | F209 IGroupMembershipService | DATABASE(PG+MongoDB) + DATABASE(Redis) |
| 6-factor composite ranking + join | F210 ICompositeRankingService | DATABASE(Redis) + AI ENGINE(Claude/Gemini) |
| Tiered feed distribution + diversity | F211 IPostFeedDistributionService | DATABASE(Redis Cluster+ES) + QUEUE |
| Distribution analytics + completion | F212 IDistributionAnalyticsService | DATABASE(ES) + QUEUE |

## FLOW-04 Event Chain

```
PostCreated → [NLP(F206), Connection(F208), Group(F209), Analytics(F212)]
PostAnalyzed → [Matching(F207), Ranking(F210)]
BusinessMatchesFound → Ranking(F210) join wait
FriendConnectionsFound → Ranking(F210) join wait
GroupConnectionsFound → Ranking(F210) join wait
RecipientListCompiled → Feed(F211)
RankingScoresCalculated → Feed(F211)
FeedsUpdated → Analytics(F212)
FeedsReordered → Analytics(F212)
PostDistributionCompleted → [Post(F205), Notification]
```

## FLOW-04 Cross-Flow Dependencies

| Dependency | Type | Detail |
|------------|------|--------|
| FLOW-01 | Prerequisite | UserOnboardingCompleted required |
| FLOW-02 F182 | Read reuse | Business profiles consumed by F207 (read-only) |
| FLOW-02 F188 | Read reuse | FeedPersonalization consumed by F211 (read path) |
| FLOW-03 F201 | Pattern reference | F211 uses different write pattern; key isolation enforced |
| FLOW-05 | Downstream | Gamification can award points for post engagement |

## FLOW-04 Anti-Patterns (MUST NOT)

| # | Anti-Pattern | Correct Pattern |
|---|-------------|-----------------|
| 1 | Import StackExchange.Redis directly | DATABASE FABRIC → Redis via IDatabaseService |
| 2 | Create class RankedRecipient | dict[str, Any] via parse_document |
| 3 | Call matching service over HTTP | IQueueService → Redis Streams events |
| 4 | Skip diversity controls | Always apply via F211.ApplyDiversityControls |
| 5 | Fire PostDistributionCompleted before FeedsReordered | Both events required (IR-1 T66) |
| 6 | Store plain userId in analytics | Hash userId before writing to F212 |

## FLOW-04 Reuse Analysis

| FLOW-04 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Event publishing (10 events) | IQueueService → Redis Streams (SK-383 (RedisStreamQueue)) | ✅ REUSE (Fabric Layer 0) |
| Outbox pattern | Queue Fabric → OutboxWriteAsync (FCE +3) | ✅ REUSE |
| Business profile read | F182 IBusinessProfileService (FLOW-02) | ✅ REUSE (read-only) |
| Feed READ path | F188 IFeedPersonalizationService (FLOW-02) | ✅ REUSE (read-only) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| ML inference | IAiProvider → AiDispatcher (SK-385 (IAiProvider)/07) | ✅ REUSE (Fabric Layer 0) |
| Flow orchestration | IFlowOrchestrator (SK-392 (RagStrategyRegistry)) | ✅ REUSE (Fabric Layer 0) |
| Document storage | IDatabaseService (SK-382 (ElasticsearchDatabase)) | ✅ REUSE (Fabric Layer 0) |
| Post content storage | — | 🆕 F205 |
| NLP content analysis | — | 🆕 F206 |
| Post-content matching | — | 🆕 F207 |
| Social graph queries | — | 🆕 F208 |
| Group membership | — | 🆕 F209 |
| Composite ranking (6-factor) | — | 🆕 F210 |
| Feed distribution + diversity | — | 🆕 F211 |
| Distribution analytics | — | 🆕 F212 |

## FLOW-04 Key Design Decisions (Locked)

| Decision | Rationale |
|----------|-----------|
| 4 contracts (not 5) | Reorder is inseparable from distribution — same service, same Redis writes, same diversity logic. Analytics+completion = one aggregation contract. |
| F211 new (not reuse F201) | CQRS: F201=simple ZADD event injection; F211=diversity+tiered+reorder. Different scaling profiles, different business logic. |
| Neo4j for social graph | Graph traversals (2nd-degree connections) are inherently graph-DB operations. PG fallback for HA. |
| 6-factor ranking (vs FLOW-03's 5) | Added engagement prediction. Posts need predicted engagement probability; events don't. |
| visibility=connections_only skips matching | MACHINE gate: no business matching for restricted posts. Saves compute, preserves privacy intent. |

## MERGE04:P3 STATE SAVE
```
MERGE04:P3 = COMPLETE
Target: UNIFIED_SOURCE_INDEX_MERGED.md
Added: FLOW-04 quick lookup, concept→factory map, event chain, cross-flow deps, anti-patterns
Next: MERGE04:P4 → SKILLS_FACTORY_RAG_MERGED.md
```


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-05 — UNIFIED SOURCE INDEX ADDENDUM (Family 23 + 24)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-05 Complete: Lesson Completion & Gamification

### Overview
FLOW-05 spans 3 families (17, 23, 24) and covers the full lifecycle from lesson
questionnaire completion through gamification rewards, social distribution, peer
engagement, and operational integrity monitoring.

### RAG Lookup Table — Family 23 (Hardening)

| Concept | Look Here | Key IDs |
|---------|-----------|---------|
| Periodic reconciliation audit | ENGINE_ARCH F213 | F213, T67, CF-26 |
| Anomaly detection (async patterns) | ENGINE_ARCH F214 | F214, T67, CF-27, DR-7 |
| CloudEvents schema governance | ENGINE_ARCH F215 | F215, T68, CF-29, CF-30 |
| A/B testing / feature flags | ENGINE_ARCH F216 | F216, T69, CF-31, CF-32, DR-8 |
| DLQ event recovery | ENGINE_ARCH F217 | F217, T67, CF-28 |
| Adaptive difficulty scoring | ENGINE_ARCH F218 | F218, T69, CF-33 |
| Read-only reconciliation principle | DR-6, CF-26, T67 IR-1/IR-2 | F213 read_only capability |
| One-directional telemetry flow | DR-7, CF-27 | F219/F221 → telemetry → F214 |
| Experiment safety guardrails | DR-8, CF-31 | F216 FREEDOM-only targeting |

### RAG Lookup Table — Family 24 (Engagement)

| Concept | Look Here | Key IDs |
|---------|-----------|---------|
| Peer grading with pseudonymity | ENGINE_ARCH F219 | F219, T70 IR-1..IR-4, CF-35 |
| Categorized comments | ENGINE_ARCH F220 | F220, T70 IR-7, CF-40 |
| Anti-abuse gate (real-time blocking) | ENGINE_ARCH F221 | F221, T71 IR-2, CF-38, DR-9 |
| Timezone-aware streaks | ENGINE_ARCH F222 | F222, T71 IR-3, CF-39, DR-10 |
| Social points feedback loop | ENGINE_ARCH F223 | F223, T70, CF-34, CF-41, DR-11 |
| Hybrid sync+async compute | ENGINE_ARCH F224 | F224, T71, CF-37, DR-5 |
| Idempotency for sync+async dedup | CF-37, ST-14 | F221, F224, T71 IR-6 |
| Social vs completion points isolation | CF-34, DR-11 | F223 vs F166, T70 vs T44 |
| Comment XSS prevention | ST-18, F220 MACHINE | F220, T68/F215 cross-reference |
| Pseudonymity leak prevention | ST-16, T70 IR-2 | F219, pseudonymity floor ≥ 2 |

### Concept → Factory Map (Complete FLOW-05)

```
FLOW-05 Concept                → Factory           → Task Type    → Family
─────────────────────────────────────────────────────────────────────────────
Gamification scoring (happy)   → F166              → T44          → 17
Learning plan adaptation       → F167              → T45          → 17
Social distribution           → F173 + FLOW-04    → T46          → 17
Point ledger (time-series)    → F168              → T44          → 17
Streak tracking (UTC)         → F169              → T44          → 17
Achievement system            → F170              → T44          → 17
Grade calculation (math only) → F172              → T46          → 17
Reconciliation audit          → F213              → T67          → 23
Anomaly detection (async)     → F214              → T67          → 23
Event schema governance       → F215              → T68          → 23
Feature flags / A/B testing   → F216              → T69          → 23
DLQ recovery                  → F217              → T67          → 23
Adaptive difficulty           → F218              → T69          → 23
Peer grading (with rules)     → F219 (wraps F172) → T70          → 24
Comment management            → F220              → T70          → 24
Real-time abuse blocking      → F221              → T70, T71     → 24
Timezone streak tracking      → F222 (wraps F169) → T71          → 24
Social points feedback        → F223              → T70          → 24
Sync compute gateway          → F224              → T71          → 24
```

### Cross-Family Dependency Map

```
Family 24 → Family 17:
  F219 → calls F172 via CreateAsync() (grade calculation math)
  F222 → calls F169 via CreateAsync() (streak storage with timezone)
  F223 → routes to F166 via QUEUE FABRIC (social points → gamification)
  T71  → uses F166 via CreateAsync() (sync compute scoring)

Family 24 → Family 23:
  F221 → feeds F214 via telemetry stream (gate → analyst)
  T70  → events validated by F215 (schema governance)
  T70  → engagement parameters from F216 (A/B variants)

Family 23 → Family 17:
  F213 → reads F166 data (read-only, CF-26)
  F214 → consumes telemetry from F219/F221 events
  F218 → feeds into F167 adaptation loop
```

### Event Chain (Complete FLOW-05)

```
QuestionnaireAnswered (trigger)
  ├─ BRANCH 1: Gamification (SYNC via T71)
  │   → F221 CheckPointFarming (BLOCKING gate)
  │   → F222 RecordActivity (timezone-aware streak)
  │   → F166 CalculatePoints (MACHINE formula)
  │   → F224 CacheResult + EmitDurable
  │   → GamificationPointsAwarded
  │   → [conditional] UserLeveledUp → notifications
  │   → [conditional] AchievementUnlocked → notifications
  │
  ├─ BRANCH 2: Learning (ASYNC via T45)
  │   → F167 AdaptLearningPlan (ML-based)
  │   → F218 CalculateDifficulty (adaptive)
  │   → LearningPlanAdapted → notifications
  │
  ├─ BRANCH 3: Social (ASYNC via T46)
  │   → F173 consent check → QuestionnairePostCreated
  │   → Connection + Group + Matching (parallel audience discovery)
  │   → Ranking → Feed Distribution
  │   → QuestionnairePostDistributed
  │
  └─ BRANCH 4: Engagement Loop (ASYNC via T70, after distribution)
      → Community learner actions:
        → F221 CheckAbuseGate → F219 SubmitGrade (pseudonymity)
        → F221 CheckAbuseGate → F220 PostComment (categorized)
        → F223 AccumulateEngagement (tumbling window)
        → [window flush] F223 RouteToGamification → QUEUE → F166
        → GamificationSocialPointsAwarded (SEPARATE from completion)

BACKGROUND OPERATIONS:
  → T67 Integrity: F213 reconcile + F214 anomaly + F217 DLQ recovery
  → T68 Governance: F215 schema validation on all events
  → T69 Experimentation: F216 A/B variants + F218 difficulty adaptation
```

### Key Design Decisions (All Locked)

| # | Decision | Rule | Family |
|---|----------|------|--------|
| DD-1 | Hybrid sync+async for 1s gamification SLA | DR-5 | 23 |
| DD-2 | Read-only reconciliation (never auto-correct) | DR-6 | 23 |
| DD-3 | One-directional telemetry flow (gates → analyst) | DR-7 | 23 |
| DD-4 | Experiments target FREEDOM only (never MACHINE) | DR-8 | 23 |
| DD-5 | Anti-abuse gate before gamification on every write path | DR-9 | 24 |
| DD-6 | Wrap-don't-replace for backward compatibility | DR-10 | 24 |
| DD-7 | Social and completion points are separate event types | DR-11 | 24 |
| DD-8 | Tumbling window for engagement aggregation | DR-12 | 24 |

### Anti-Patterns (Complete FLOW-05)

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Auto-correcting reconciliation discrepancies | Log and alert (DR-6, CF-26) |
| Circular telemetry (F214 writes back to F219) | One-directional only (DR-7, CF-27) |
| A/B experiment on anti-abuse threshold | FREEDOM params only (DR-8, CF-31) |
| DLQ replay bypassing anti-abuse | Replay to main queue (CF-28) |
| Running F166 before F221 | F221 → F166 always (DR-9, CF-38) |
| Replacing F169/F172 with F222/F219 | Wrap via CreateAsync() (DR-10, CF-39) |
| Conflating social and completion points | Separate event types + streams (DR-11, CF-34) |
| Individual engagement event routing | Tumbling window aggregation (DR-12) |
| Setting pseudonymity threshold to 1 | Floor is 2 (T70 IR-2, MACHINE) |
| Client submitting point values | Server-side compute only (T71 IR-10) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-06 — MARKETPLACE PUBLISHING & DISTRIBUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-06 Concept → Factory Map

| FLOW-06 Concept | Factory | Fabric | Notes |
|----------------|---------|--------|-------|
| Create marketplace item | F225 IMarketplaceInventoryService | DB(PG) + Queue | Inventory CRUD + depletion events |
| Listing lifecycle + state machine | F226 IMarketplaceListingService | DB(PG+Redis+ES) + Flow Engine | Draft→Active→SoldOut state machine |
| Audience profiling + buyer personas | F227 IMarketplaceAnalyticsService | DB(ES) + AI Engine + RAG | LLM-assisted persona analysis |
| Auto-generate social marketplace post | F228 IMarketplacePostGeneratorService | DB(MongoDB) + AI Engine (multi-model) + Queue | Multi-model post with duplicate check |
| Synergy scoring (5-factor algorithm) | F229 ICooperatorMatchingService | DB(PG+Redis) + AI Engine + RAG | MACHINE formula, FREEDOM weights |
| Friend audience + purchase affinity | F230 IMarketplaceConnectionService | DB(Neo4j+PG) | Graph traversal + affinity score |
| Group marketplace sections | F231 IMarketplaceGroupService | DB(PG+MongoDB) | marketplace_enabled filter mandatory |
| Multi-format feed card distribution | F232 IMarketplaceFeedService | Queue + DB(Redis Cluster+ES) | product/partnership/service card types |
| Partnership opportunity notifications | F233 ICooperatorNotificationService | Queue + DB(Redis) | 5/day rate limit, sliding window |

## FLOW-06 Event Chain

```
POST /marketplace/items
    │
    ▼
[T72] F225:CreateItemAsync + F226:CreateListingAsync
    │
    ├──► [MarketplaceItemCreated]
    └──► [ListingPublished]
              │
              ▼
[T73] Three-Way Enrichment Fork (allSettled, 30s timeout)
    │
    ├─ Branch A: F227:ProfileTargetAudienceAsync → [TargetAudienceAnalyzed]
    ├─ Branch B: F228:GenerateMarketplacePostAsync → duplicate check → [MarketplacePostCreated]
    └─ Branch C: (depends on Branch A) F229:FindCooperatorsAsync
                    │
                    ▼
              [T74] F229+F227+F230 Synergy Scoring
                    │
                    └──► [CooperatorsIdentified]
              │
              ▼ (all 3 branches join — allSettled)
              │
         ┌────┴────────────────────────────────────┐
         │ [T75] Multi-Audience Distribution Gate  │
         │                                         │
         ├─ Channel A: F230 friends → F232 PRODUCT_CARDs → [FriendAudienceIdentified]
         ├─ Channel B: F231 groups → F232 PRODUCT_CARDs auto-post → [GroupAudienceIdentified]
         └─ Channel C: F229 cooperators → F232 PARTNERSHIP_CARDs → F233 notifications
                    │
                    ├──► [MarketplaceFeedDistributed]
                    └──► [CooperatorNotificationsSent]
                              │
                              ▼ (async)
              [T76] F227+F232+F229 Intelligence Gate
                    └──► [MarketplaceIntelligenceUpdated] → RAG fabric updated
```

## FLOW-06 Domain Events

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| MarketplaceItemCreated | F225 | F227, F228, F229 | itemId, sellerId, itemDetails, pricing, inventory, targetAudience, media |
| ListingPublished | F226 | F228, F227 | listingId, itemId, sellerId, status=Active, visibility, listingUrl |
| TargetAudienceAnalyzed | F227 | F229 | itemId, audienceProfile, buyerPersonas |
| MarketplacePostCreated | F228 | F230, F231, F232 | postId, itemId, sellerId, postContent (headline, highlights, media, CTA) |
| FriendAudienceIdentified | F230 | F232 | postId, friends[]{userId, relevanceScore, purchaseAffinity} |
| GroupAudienceIdentified | F231 | F232 | postId, groups[]{groupId, memberCount, marketplaceEnabled, groupRelevance} |
| CooperatorsIdentified | F229 | F232, F233 | itemId, cooperators[]{businessId, synergyScore, cooperationType, complementaryProducts} |
| MarketplaceFeedDistributed | F232 | F227 | postId, distribution stats by channel |
| MarketplacePostRanked | F232 | F227 | postId, rankingMetrics |
| MarketplacePostDistributed | F232 | F227 | postId, distributionStats |
| CooperatorNotificationsSent | F233 | F227 | itemId, notifications sent count, channels |
| InventoryDepleted | F225 | F232, F226 | itemId, tenantId — triggers card SoldOut + listing state change |
| InventoryRestored | F225 | F232, F226 | itemId, tenantId — triggers card reactivation |

## FLOW-06 Key Design Decisions (Locked)

| # | Decision | Rationale | DR |
|---|----------|-----------|-----|
| DD-9 | Synergy scoring uses AI ENGINE FABRIC for product complementarity, NOT Python ML | Fabric-first; model swappable via config; no language coupling | DR-15 |
| DD-10 | InventoryDepleted uses transactional outbox, NOT best-effort pub | Guarantee: no stale "Available" cards without a guaranteed depletion event | DR-13 |
| DD-11 | Listing expiry timers use FLOW ENGINE FABRIC, NOT cron | Resume-ability across pod restarts; durable checkpoints | DR-14 |
| DD-12 | F232 has TWO consumer groups on same stream (HIGH-PRIORITY + normal) | Ensures InventoryDepleted never queued behind card distribution; 30s SLA | DR-16 |
| DD-13 | Cooperator rate limit keyed on cooperatorId, NOT listingId | Prevents listing-cycling rate limit bypass attack (CF-51, ST-20) | — |
| DD-14 | DNA-8 (Transactional Outbox) elevated to system-wide pattern | Universal pattern for financial/inventory flows; AF-7 checks automatically | — |

## FLOW-06 Cross-Flow Dependencies

| FLOW-06 Feature | Depends On | Dependency Type |
|----------------|-----------|-----------------|
| Seller verification prerequisite | FLOW-02 (business profiles) | HARD: seller must have business profile |
| Friend audience via purchase affinity | FLOW-07 (friend connections) | HARD: connection graph required |
| Cooperator relationship lookup | F170 (ICooperatorService, FLOW-05) | SOFT: F229 extends; F170 is lookup layer |
| Feed card distribution patterns | F173 (FLOW-05) feed distribution | PATTERN: adapted feed distribution approach |
| Post generation patterns | F208 (FLOW-04) post generation | PATTERN: multi-model post generation reference |
| Analytics base patterns | F197 (FLOW-03) analytics | PATTERN: different analytics domain |
| Anti-abuse rate limit patterns | F221 (FLOW-05) anti-abuse | PATTERN: different key space (cooperatorId) |

## FLOW-06 MACHINE vs FREEDOM Classification

### MACHINE (non-negotiable, violations = BUILD FAILURE)

| Component | Why MACHINE |
|-----------|-------------|
| Synergy formula structure (5 factors, weighted sum) | Mathematical formula — changing factor count breaks model |
| Competing products → synergy=0 | Business rule: competitors NEVER shown as partners |
| Listing state transitions (Draft→Active→SoldOut→Expired→Deactivated) | State machine: invalid transitions = data corruption |
| InventoryDepleted event on stock=0 | Safety: oversell prevention requires immediate event |
| Rate limit: 5 partnership requests/day/user | Security: anti-spam |
| Rate limit: 10 listings/hour/seller | Security: anti-listing-spam |
| Duplicate detection: >90% similarity = block | Content quality: prevents marketplace spam |
| Discount bounds: friend 5-10%, group 10-15% | Business: prevents pricing exploitation |
| Privacy: seller's raw inventory never exposed to buyers | Security: competitive intelligence protection |
| Event ordering: InventoryDepleted overrides feed distribution | Safety: prevents stale availability |
| 48-hour grace period after price change | Business: cooperator protection (non-negotiable) |
| Transactional Outbox for domain events (DNA-8) | Consistency: event IFF DB commit (never fire-and-forget) |

### FREEDOM (admin-configurable via ES, no code change)

| Component | Default | Why FREEDOM |
|-----------|---------|-------------|
| Synergy weight VALUES | 0.30/0.25/0.20/0.15/0.10 | Business may emphasize different factors |
| Cooperation type thresholds | cross=0.5, bundle=0.7, ref=0.4, dist=0.6 | Partnership stringency tuning |
| Max cooperators per listing | 20 | Scale tuning |
| LLM model for complementarity | claude-sonnet | AI model selection |
| Synergy cache TTL | 3600s | Performance tuning |
| Friend discount range within bounds | 5-10% | Pricing flexibility |
| Group discount range within bounds | 10-15% | Pricing flexibility |
| Marketplace search facets | category, price, location, availability | UX customization |
| Notification channel preferences | in-app + email | User preference |
| FX rate update frequency | daily | Operations |
| Card visual properties | default theme | UX experimentation |
| Post generation prompt template | default | Content A/B testing |

## FLOW-06 Anti-Patterns to Avoid

| Anti-Pattern | Why Wrong | Correct Approach |
|-------------|-----------|-----------------|
| Hardcoding synergy weights in service code | Cannot A/B test; violates FREEDOM principle | Weights in ES config document; MACHINE enforces sum=1.0 |
| Direct HTTP between inventory and feed services | Breaks QUEUE FABRIC rule | InventoryDepleted event through Redis Streams |
| Using typed `MarketplaceItem` model | Violates DNA-1 (parse_document) | dict[str, Any] via parse_document |
| Importing `pg` or `neo4j-driver` in service code | Violates fabric-first | Resolve through DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) |
| Shared ES index between marketplace and gamification | CF-44 violation | Separate indices: marketplace-* vs gamification-* |
| Cooperator matching synchronous in API path | 20s latency; blocks seller | Async via event; status endpoint for progress |
| Client-side discount calculation | Security: client manipulation | Server-side only via F226.ApplyPricingRulesAsync |
| Cron for listing expiry | Not resume-able; inconsistent | Durable timer in FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) |
| Timer-based expiry per entity (item controller) | Violates DNA-6 | DynamicController + Flow Engine timer |
| Single consumer group for inventory + content events | SLA violation risk | Separate HIGH-PRIORITY consumer group (DR-16) |

## FLOW-06 Reuse Analysis

| FLOW-06 Factory | Reuses From | Reuse Type | What's Different |
|----------------|------------|------------|-----------------|
| F228 IMarketplacePostGeneratorService | F208 (FLOW-04) post generation | PATTERN | Different content domain (marketplace vs social) |
| F229 ICooperatorMatchingService | F170 (FLOW-05) cooperator lookup | EXTENDS | F229 adds 5-factor scoring layer on top of F170 data |
| F232 IMarketplaceFeedService | F173 (FLOW-05) feed distribution | ADAPTS | Different card types + dual consumer group (DR-16) |
| F233 ICooperatorNotificationService | F221 (FLOW-05) rate limit patterns | PATTERN | Different key space (cooperatorId vs userId) |
| F227 IMarketplaceAnalyticsService | F197 (FLOW-03) analytics patterns | PATTERN | Different analytics domain (marketplace vs events) |
| F230 IMarketplaceConnectionService | F150 DATABASE FABRIC(Neo4j) | DIRECT USE | Same fabric, new query patterns for purchase affinity |
| F228 AF-5 multi-model | F208 (FLOW-04) AF-5 config | PATTERN | Same consensus approach, marketplace-specific prompts |

---

## MERGE:P4a STATE SAVE (UNIFIED_SOURCE_INDEX)
```
MERGE:P4a = COMPLETE
Target: UNIFIED_SOURCE_INDEX_MERGED.md
Added: FLOW-06 concept→factory map (9 entries)
Added: FLOW-06 event chain (ASCII flowchart)
Added: FLOW-06 domain events (13 events with publishers/consumers/payloads)
Added: FLOW-06 key design decisions DD-9 through DD-14
Added: FLOW-06 cross-flow dependencies (7 entries)
Added: FLOW-06 MACHINE/FREEDOM classification
Added: FLOW-06 anti-patterns (10 entries)
Added: FLOW-06 reuse analysis (7 entries)
System: FLOW-01 through FLOW-06 fully indexed
Next: MERGE:P4b → SKILLS_FACTORY_RAG_MERGED.md
```

# FLOW-07 MERGE — Source Index + Skills Factory RAG
# Merged from: FLOW07_UNIFIED_EXECUTION_PLAN.md Phase 4
# Date: 2026-02-26 | Save Point: MERGE:P4
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


# FLOW-07 — FRIEND REQUEST & FEED INTEGRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-07 Concept → Factory Map

| FLOW-07 Concept | Factory | Fabric | Notes |
|----------------|---------|--------|-------|
| Friend request lifecycle + block + mutual-pending | F234 IConnectionGraphService | DB(Neo4j+PG+Redis) + Queue | Bidirectional graph edges, EP-1 state machine, DNA-8 outbox |
| AI-powered pairwise profile compatibility | F235 IMatchScoringService | DB(PG+ES+Redis) + AI Engine | Symmetric scoring, sorted cache key, multi-model |
| 4-way parallel weight orchestration | F236 IFeedIntegrationOrchestratorService | Queue + DB(Redis+PG) + Flow Engine | allSettled + EP-2 deadline timer, privacy mask enforcement |
| Group membership overlap analysis | F237 IGroupWeightAnalyzerService | DB(PG+MongoDB) | Read-only, 4-factor sub-weight formula |
| Event co-attendance analysis | F238 IEventWeightAnalyzerService | DB(PG) | Read-only, 4-factor sub-weight formula |
| Purchase overlap analysis (privacy-masked) | F239 IPurchaseWeightAnalyzerService | DB(PG) | Read-only, IRON RULE: aggregate only, raw data NEVER exposed |
| Questionnaire similarity analysis (privacy-masked) | F240 IQuestionnaireWeightAnalyzerService | DB(MongoDB) | Read-only, IRON RULE: aggregate only, raw data NEVER exposed |
| ML-bounded weight convergence | F241 IWeightCalculationService | DB(Redis) + AI Engine (ML) | Fixed coefficients 0.25/0.20/0.20/0.15/0.20, ML ±0.2 clamped |
| Bidirectional tiered feed injection | F242 IFeedInjectionService | DB(Redis Cluster+PG+Redis) + Queue | Zone placement (top/mid/bottom), rollback capability, DNA-8 outbox |
| Scheduled connection strength evolution | F243 IConnectionEvolutionService | DB(PG+Redis) + Flow Engine + Queue | FIRST scheduled-only service, EP-2 timer, batch + dormancy |

## FLOW-07 Event Chain

```
POST /relations/connect
    │
    ▼
[T77] F234:CheckBlockStatusAsync → F234:SendRequestAsync
    │
    ├──► [FriendRequestSent]
    │         │
    │         ▼ (async, non-blocking)
    │    [T78] F235:CalculateMatchScoreAsync
    │         └──► [InitialMatchCalculated] (cached for later use)
    │
    └──► (recipient accepts OR mutual-pending auto-accept)
         F234:AcceptRequestAsync → F234:CreateBidirectionalEdge
              │
              ├──► [FriendRequestAccepted]
              └──► F236:InitiateIntegrationAsync
                        │
                        └──► [FeedIntegrationStarted]
                                   │
                                   ▼
                        [T79] Four-Way Weight Analysis Fork (allSettled, EP-2 10s timer)
                              │
                              ├─ Branch G: F237:AnalyzeGroupOverlapAsync ──► [GroupWeightCalculated]
                              ├─ Branch E: F238:AnalyzeEventOverlapAsync ──► [EventWeightCalculated]
                              ├─ Branch P: F239:AnalyzePurchaseOverlapAsync ──► [PurchaseWeightCalculated] 🔒
                              └─ Branch Q: F240:AnalyzeQuestionnaireSimilarityAsync ──► [QuestionnaireWeightCalculated] 🔒
                                   │
                                   │  (🔒 = privacy-masked aggregate only)
                                   │  (timeout → default 0.5 + async retry)
                                   │
                                   ▼ (all 4 branches settled)
                        [T80] F241:CalculateFinalWeightAsync
                              │  rawWeight = base×0.25 + G×0.20 + E×0.20 + P×0.15 + Q×0.20
                              │  finalWeight = clamp(rawWeight + clamp(ML, -0.2, +0.2), 0, 1)
                              │
                              └──► [FinalWeightCalculated]
                                        │
                                        ▼
                              [T81] F242:InjectHistoricalPostsAsync (bidirectional)
                                   │  Strong >0.8: 20 posts, top 20%
                                   │  Medium 0.5-0.8: 10 posts, middle 40%
                                   │  Weak <0.5: 5 posts, bottom 40%
                                   │
                                   ├──► [HistoricalPostsIntegrated]
                                   └──► [FeedIntegrationCompleted]

═══════ SCHEDULED (no event trigger) ═══════

              [T82] EP-2 Durable Timer → every 6h
                    │
                    └──► F243:RebalanceConnectionsAsync (batch)
                              │  Strength evolution, dormancy detection, 30% cap
                              │
                              └──► [ConnectionStrengthUpdated]
```

## FLOW-07 Domain Events

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| FriendRequestSent | F234 | F235 (match scoring) | requestId, senderId, recipientId, tenantId |
| InitialMatchCalculated | F235 | F241 (weight calc, cached) | matchScore (0.0-1.0), factors, userId1, userId2 |
| FriendRequestAccepted | F234 | F236 (orchestrator) | requestId, connectionId, userId1, userId2, integrationId |
| FeedIntegrationStarted | F236 | F237, F238, F239, F240 | integrationId, connectionId, userId1, userId2, baseMatchScore |
| GroupWeightCalculated | F237 | F236 (orchestrator) | integrationId, groupWeight (0.0-1.0), weightFactors |
| EventWeightCalculated | F238 | F236 (orchestrator) | integrationId, eventWeight (0.0-1.0), weightFactors |
| PurchaseWeightCalculated | F239 | F236 (orchestrator) | integrationId, purchaseWeight (0.0-1.0), weightFactors (OPAQUE — no raw data) |
| QuestionnaireWeightCalculated | F240 | F236 (orchestrator) | integrationId, questionnaireWeight (0.0-1.0), weightFactors (OPAQUE — no raw data) |
| FinalWeightCalculated | F241 (via F236) | F242 (feed injection) | integrationId, finalWeight, componentWeights, mlAdjustment, confidenceScore |
| HistoricalPostsIntegrated | F242 | analytics | integrationId, userIds[2], postCounts, zones, tier |
| FeedIntegrationCompleted | F242 | analytics, notification | integrationId, connectionId, finalWeight, tier, injectedCounts |
| ConnectionStrengthUpdated | F243 | F242 (reposition), analytics | connectionId, newStrength, previousStrength, delta, isDormant |

## FLOW-07 Key Design Decisions (Locked)

| # | Decision | Rationale | DR |
|---|----------|-----------|-----|
| DD-15 | Neo4j is PRIMARY write store for social graph (F234), not just read-only like F230 | Graph operations (bidirectional edges, traversals, strength-weighted discovery) naturally fit graph DB; PG is secondary for relational request lifecycle | DR-17 |
| DD-16 | Four-way allSettled fork uses EP-2 Durable Timer for deadline, NOT new EP-4 primitive | EP-2 + allSettled pattern covers the requirement entirely; no new infrastructure needed; reuses proven FLOW-06 timer mechanism | DR-18 |
| DD-17 | F239/F240 return ONLY aggregate float + opaque factors — raw data NEVER crosses service boundary | ICO data minimisation; purchase/questionnaire data is sensitive; aggregate weights serve integration purpose without individual behavior exposure | DR-19 |
| DD-18 | New F242 (bidirectional + zones) instead of reusing F173 (unidirectional distribution) | F173 is one-to-many unidirectional; F242 is many-to-two bidirectional with zone placement + rollback — fundamentally different patterns | DR-20 |
| DD-19 | Weight formula coefficients are MACHINE (fixed), not FREEDOM (configurable) | Formula represents validated business model; changing coefficients affects ALL users; A/B testing happens via ML adjustment (bounded ±0.2), not coefficient changes | — |
| DD-20 | T82 is SCHEDULED archetype with EP-2 timer only — no HTTP endpoint or event trigger | Rebalancing is system maintenance, not user-triggered; timer-only prevents abuse (no manual rebalance spam); EP-2 survives pod restarts | — |

## FLOW-07 Cross-Flow Dependencies

| FLOW-07 Feature | Depends On | Dependency Type |
|----------------|-----------|-----------------|
| Historical post retrieval for feed injection | F208 (ISocialPostService, FLOW-04) | HARD: posts from last 30 days read via F208 |
| Feed write patterns and zone calculation | F173 (IFeedDistributionService, FLOW-05) | PATTERN: adapted unidirectional→bidirectional |
| Neo4j graph patterns for social graph | F230 (IMarketplaceConnectionService, FLOW-06) | PATTERN: extended read-only→full CRUD |
| State machine for connection lifecycle | EP-1 State Machine Registry (FLOW-06) | DIRECT USE: reuses EP-1 for connection states |
| Durable timers for deadlines + rebalancing | EP-2 Durable Timer Service (FLOW-06) | DIRECT USE: 10s deadline, 6h rebalance, 24h boost |
| Transactional outbox for domain events | DNA-8 (FLOW-06) | DIRECT USE: 4 factories use outbox pattern |
| Three-way join pattern extended to four-way | T40 (FLOW-04/V39) | PATTERN: allSettled semantics extended with privacy mask |
| Cooperator synergy formula structure | F229 (ICooperatorMatchingService, FLOW-06) | PATTERN: adapted 5-factor formula + ML adjustment |

## FLOW-07 MACHINE vs FREEDOM Classification

### MACHINE (non-negotiable, violations = BUILD FAILURE)

| Component | Why MACHINE |
|-----------|-------------|
| Block check BEFORE request creation | Security: no request should exist for blocked pairs |
| Mutual-pending auto-accept logic | UX consistency: simultaneous requests = automatic friendship |
| Bidirectional graph edges (A↔B, never A→B only) | Data integrity: friendship is always mutual |
| Weight formula coefficients (0.25/0.20/0.20/0.15/0.20) | Business model: validated coefficient balance; ML adjustment handles personalization |
| ML adjustment bounded ±0.2 | Safety: ML cannot override formula by more than 20% |
| Feed tier thresholds (Strong>0.8, Medium 0.5-0.8, Weak<0.5) | UX: tier definitions are product-level decisions |
| Feed tier post counts (Strong:20, Medium:10, Weak:5) | UX: content volume per tier is product-level |
| Max 30% friend content in any user's feed | UX: feed diversity guarantee |
| Rate limit enforcement via Redis ZSET sliding window | Security: prevents friend request spam |
| Privacy mask on F239/F240 (aggregate only) | Privacy: raw purchase/questionnaire data never crosses boundary |
| Request deduplication (same pair within 24h) | UX: prevents duplicate pending requests |
| EP-1 state machine for connection lifecycle | Architecture: invalid transitions = data corruption |
| DNA-8 transactional outbox on F234, F236, F242, F243 | Consistency: event IFF DB commit |
| EP-2 Durable Timer for rebalancer (not cron) | Reliability: timer must survive pod restarts |
| Generic failure on block detection (no block info leaked) | Privacy: blocked user cannot learn they are blocked |

### FREEDOM (admin-configurable via ES, no code change)

| Component | Default | Config Key | Why FREEDOM |
|-----------|---------|-----------|-------------|
| Friend request rate limit/day | 20 (range: 5-50) | `freedom_connection_{tenantId}` | Scale tuning per community size |
| Weight timeout deadline | 10s (range: 5s-30s) | `freedom_connection_{tenantId}` | Performance tuning per infrastructure |
| Default missing weight value | 0.5 (range: 0.3-0.7) | `freedom_connection_{tenantId}` | Business tuning for degraded-mode behavior |
| ML model selection | gradient-boost-v1 | `freedom_weight_{tenantId}` | ML model swapping without code change |
| Score cache TTL | 3600s (range: 600s-86400s) | `freedom_match_{tenantId}` | Performance vs freshness tradeoff |
| Rebalance interval | 6h (range: 1h-24h) | `freedom_feed_{tenantId}` | Operations tuning per tenant load |
| New friend boost duration | 24h (range: 6h-72h) | `freedom_feed_{tenantId}` | UX experimentation |
| Dormancy threshold | 0.2 (range: 0.1-0.3) | `freedom_feed_{tenantId}` | Community engagement tuning |
| Retry delay for missing branches | 30s (range: 10s-5min) | `freedom_connection_{tenantId}` | Infrastructure tuning |
| Max retry attempts | 3 (range: 1-10) | `freedom_connection_{tenantId}` | Reliability vs resource tradeoff |
| Feed integration level per user | Full/Selective/Minimal | `freedom_privacy_{tenantId}` | User privacy preference |
| Post types to share per user | All/Public/Selected | `freedom_privacy_{tenantId}` | User privacy preference |
| Reconnection prompt threshold | 0.15 (range: 0.1-0.2) | `freedom_feed_{tenantId}` | UX tuning for re-engagement |
| Rebalance batch size | 500 (range: 100-1000) | `freedom_feed_{tenantId}` | Infrastructure tuning |

## FLOW-07 Anti-Patterns to Avoid

| Anti-Pattern | Why Wrong | Correct Approach |
|-------------|-----------|-----------------|
| Creating unidirectional graph edges (A→B only) | Friendship is mutual; breaks traversals, causes inconsistency | Always create bidirectional edges (FRIEND_OF A→B AND B→A) in single transaction |
| Exposing raw purchase/questionnaire data across service boundary | Privacy violation; violates IRON RULE IR-79-5; BUILD FAILURE | F239/F240 return aggregate float + opaque weightFactors ONLY |
| Using Thread.Sleep or non-durable timeout for fork deadline | Pod restart loses timer; branches hang indefinitely | EP-2 Durable Timer via FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) |
| Making weight formula coefficients configurable (FREEDOM) | Coefficient changes affect ALL users unpredictably | Coefficients are MACHINE; ML adjustment (±0.2) handles personalization |
| Sequential execution of 4 analyzer branches | 4× latency amplification; violates parallel requirement | Fork all 4 branches simultaneously; allSettled collects |
| Using cron for 6h rebalancer | Not resume-able; inconsistent; won't survive pod restart | EP-2 Durable Timer registered through Flow Engine Fabric |
| Revealing block status to blocked user | Privacy violation; enables block enumeration attack | Generic DataProcessResult(IsSuccess=false, "Request could not be sent") |
| Injecting private posts into other user's feed | Privacy violation; visibility rules broken | Check post visibility BEFORE injection; skip private posts |
| Reusing F173 for bidirectional feed injection | Single Responsibility violation; F173 is unidirectional | New F242 with bidirectional + zone + rollback capabilities |
| Applying typed FriendRequest or Connection models | Violates DNA-1 (parse_document) | dict[str, Any] via parse_document — no typed models |
| Hardcoding rate limit value in code | Cannot tune per tenant; violates FREEDOM principle | Rate limit in ES config: `freedom_connection_{tenantId}` |
| Importing neo4j-driver directly in service code | Violates fabric-first | Resolve through DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) |

## FLOW-07 Reuse Analysis

| FLOW-07 Factory | Reuses From | Reuse Type | What's Different |
|----------------|------------|------------|-----------------|
| F234 IConnectionGraphService | F230 (FLOW-06) Neo4j graph patterns | EXTENDS | F230 is read-only; F234 adds full CRUD + bidirectional edges + state machine |
| F235 IMatchScoringService | F229 (FLOW-06) synergy formula structure | PATTERN | Different domain (personal vs business); F235 adds symmetric caching + multi-model |
| F236 IFeedIntegrationOrchestratorService | T40/T73 allSettled patterns | EXTENDS | 3-way → 4-way; adds privacy mask enforcement + default weights + EP-2 timer |
| F237 IGroupWeightAnalyzerService | F227 (FLOW-06) group data reading | PATTERN | Different scope (all groups vs marketplace-enabled); pairwise comparison |
| F241 IWeightCalculationService | F229 (FLOW-06) weighted formula | EXTENDS | Adds ML adjustment bounded ±0.2; different coefficients; history tracking |
| F242 IFeedInjectionService | F173 (FLOW-05) feed write patterns | ADAPTS | Unidirectional→bidirectional; adds zone placement + rollback + 30% cap |
| F243 IConnectionEvolutionService | EP-2 (FLOW-06) durable timer | DIRECT USE | First scheduled-only service using EP-2 timer mechanism |
| T79 Four-Way Fork | T40 Three-Way Join Gate | EXTENDS | Adds 4th branch + privacy mask + default weights + EP-2 deadline |

---

---

# ═══════════════════════════════════════════════════════
# FLOW-08 MERGE — Source Index
# Merged from: FLOW08_P4_INDEX_SKILLS.md (Phase 4, Section C)
# ═══════════════════════════════════════════════════════

## FLOW-08 Concept → Factory Map

| Concept | Factory | Family | Task Type |
|---------|---------|--------|-----------|
| Tenant entity CRUD + lifecycle state | F244 ITenantRegistryService | 27 | T83 |
| Tenant configuration + provider registry | F245 ITenantConfigService | 27 | T85 |
| Isolation binding (RLS/schema/shard) | F246 ITenantIsolationBindingService | 27 | T84 |
| CloudEvents context propagation | F247 ITenantContextPropagatorService | 27 | ALL |
| Onboarding 8-state orchestrator | F248 ITenantOnboardingOrchestratorService | 27 | T83 |
| Pool→silo graduation migration | F249 ITenantGraduationService | 27 | T91 |
| Append-only audit trail | F250 ITenantAuditService | 27 | ALL |
| Entitlements (SLA + quotas + usage) | F251 ITenantEntitlementService | 27 | T89, T90 |
| Identity provider adapter (local/OIDC/SCIM) | F252 IIdentityProviderAdapterService | 28 | T85 |
| Authentication policy (MFA, session, step-up) | F253 IAuthenticationPolicyService | 28 | T85 |
| Authorization policy (RBAC/ABAC/hybrid) | F254 IAuthorizationPolicyService | 28 | T85 |
| Access enforcement (gateway + mesh topology) | F255 IAccessEnforcementTopologyService | 28 | T84 |
| Payment provider adapter (Stripe/Adyen/Braintree) | F256 IPaymentProviderAdapterService | 28 | T86 |
| Payment webhook ingestion | F257 IPaymentWebhookService | 28 | T87 |
| Double-entry payment ledger | F258 IPaymentLedgerService | 28 | T86 |
| Encryption key management (CMK/DEK) | F259 IEncryptionKeyManagementService | 28 | T83, T88, T91 |
| Cross-cutting idempotency | F260 IIdempotencyKeyService | 29 | T86, T87, T88, T91 |
| Per-tenant rate limiting | F261 ITenantRateLimitingService | 29 | T89 |
| Operational metrics (OTel + ES) | F262 ITenantMetricsService | 29 | T90, T92 |
| Billing metering events | F263 ITenantBillingMeteringService | 29 | T90 |
| Per-tenant backup/restore | F264 ITenantBackupRestoreService | 29 | — |
| Canary deployment (% rollout) | F265 ITenantCanaryDeploymentService | 29 | T92 |
| Compliance label enforcement | F266 IComplianceLabelEnforcementService | 29 | T83, T84, T85, T88, T91 |
| GDPR data export/deletion/retention | F267 ITenantDataExportService | 29 | T88 |
| Tenant-scoped flow runner (D9 facade) | F268 ITenantScopedFlowRunnerService | 29 | T91, T92 |
| Outbound webhook registry + delivery | F269 ITenantWebhookRegistryService | 29 | — |
| Multi-channel notification dispatch | F270 ITenantNotificationRouterService | 29 | T89, T92 |
| Config promotion pipeline (dev→staging→prod) | F271 ITenantConfigPromotionService | 29 | — |

## FLOW-08 Event Chain

```
POST /api/tenants
  │
  ├── T83: tenant.registered ─→ tenant.domain-verified ─→ tenant.isolation-provisioned
  │        ─→ tenant.idp-configured ─→ tenant.authz-configured ─→ tenant.payment-configured
  │        ─→ tenant.webhook-verified ─→ tenant.activated
  │
  ├── T84: [middleware] binding.resolved (every request)
  │
  ├── T85: config.changed ─→ provider.bound { providerType, oldProvider, newProvider }
  │        ├── CF-67: provider.bound(identity) ─→ session.bulk-invalidated (FLOW-03 F197)
  │        └── CF-71: provider.bound(payment) ─→ subscription.migration-started (FLOW-06 F225)
  │
  ├── T86: payment.intent-created ─→ payment.captured | payment.failed ─→ payment.refunded
  │        ├── CF-68: payment.captured ─→ FLOW-06 F225 billing consumer
  │        ├── CF-69: payment.refunded ─→ FLOW-06 F225 order.refund-applied
  │        └── CF-70: [monotonic stateRank resolves webhook vs sync race]
  │
  ├── T87: webhook.received ─→ webhook.signature-verified ─→ webhook.normalized (CloudEvents)
  │
  ├── T88: gdpr.deletion-requested ─→ gdpr.data-inventory-scanned ─→ gdpr.deletion-cascade
  │        ├── CF-72: cascade ─→ FLOW-02 F105 (user PII deleted, leaf-first)
  │        ├── CF-73: cascade ─→ FLOW-04 F166 (tenant content, not shared templates)
  │        ├── CF-74: cascade ─→ FLOW-06 F225 (PCI: soft-delete + PII scrub)
  │        └── gdpr.deletion-completed
  │
  ├── T89: [middleware] rate.checked ─→ rate.limit-exceeded (429) | rate.allowed
  ├── T90: metering.usage-recorded (fire-and-forget, dedicated stream)
  │
  ├── T91: migration.plan-created ─→ migration.started ─→ migration.data-migrated
  │        ─→ migration.binding-updated ─→ migration.completed
  │
  └── T92: canary.cohort-created ─→ canary.deployed ─→ canary.evaluating
           ─→ canary.promoted | canary.rolled-back
```

## FLOW-08 Domain Events

| Event | Publisher | Consumer(s) | Payload Key Fields |
|-------|-----------|-------------|-------------------|
| tenant.registered | F244 via F247 | F248 onboarding, F105 (CF-64) | tenantId, tier, complianceLabels |
| tenant.activated | F248 via F247 | F246, F252, F256 | tenantId, isolationMode, tier |
| tenant.deactivated | F244 via F247 | F250 audit, F261 | tenantId, reason |
| config.changed | F245 via F247 | T85 provider strategy | tenantId, changedKeys |
| provider.bound | F245 via F247 | F197 (CF-67), F225 (CF-71) | tenantId, providerType, old, new |
| binding.updated | F246 via F247 | ALL services (CF-65) | tenantId, oldMode, newMode |
| payment.captured | F258 via F247 | F225 (CF-68) | tenantId, paymentId, amount, currency |
| payment.refunded | F258 via F247 | F225 (CF-69) | tenantId, paymentId, refundAmount, orderId |
| webhook.normalized | F257 via F247 | F258 state update, F225 (CF-68) | tenantId, providerHint, cloudEventsEnvelope |
| gdpr.deletion-cascade | F267 via F247 | F105 (CF-72), F166 (CF-73), F225 (CF-74) | tenantId, cascadeId, userId? |
| rate.limit-exceeded | F261 via F247 | F262 metrics, F270 (SLA breach) | tenantId, operation, limit, current |
| migration.started | F249 via F247 | F268, ALL (CF-65) | tenantId, sourceMode, targetMode |
| migration.completed | F249 via F247 | ALL (CF-65), F268 | tenantId, newMode, duration |
| canary.promoted | F265 via F247 | F250 audit, F270 notification | cohortId, version, tenantCount |
| canary.rolled-back | F265 via F247 | F250 audit, F270 notification | cohortId, version, errorRate |

## FLOW-08 Key Design Decisions (DD-21 through DD-30)

| # | Decision | Rationale | DR |
|---|----------|-----------|-----|
| DD-21 | CloudEvents 1.0 with data.legacyPayload — NOT breaking migration | Zero code changes in FLOW-01-07 consumers; ~200 bytes/event cost | DR-21 |
| DD-22 | 4 isolation factories → 1 F246 with strategy dispatch | Runtime config decision, not build-time; follows F252 pattern | DR-22 |
| DD-23 | 3 identity factories → 1 F252 with mode dispatch | Single CreateAsync for runtime provider switching | DR-23 |
| DD-24 | Gateway + mesh → 1 F255 topology-aware | Prevents split-brain enforcement | DR-24 |
| DD-25 | Cross-cutting idempotency F260 — NOT payment-only | Eliminates 4 separate implementations | DR-25 |
| DD-26 | F268 wraps FlowOrchestrator — NOT replacement | D9 facade: inject tenant context without modifying core engine | DR-26 |
| DD-27 | Monotonic stateRank — NOT distributed locks | Zero-lock, zero-regression payment state | — |
| DD-28 | PII scrub for PCI GDPR — NOT hard-delete-all | GDPR satisfied + PCI satisfied simultaneously | — |
| DD-29 | 20% initial canary — NOT gradual 1%→5%→20% | Statistical significance in single bake period | — |
| DD-30 | Compensation-gate — NOT compensation-after-failure | Worst case: step doesn't run. Never: partial state. | — |

## FLOW-08 Cross-Flow Dependencies

| FLOW-08 Feature | Depends On | Dependency Type |
|-----------------|-----------|-----------------|
| Tenant-scoped user registration (CF-64) | FLOW-02 F105 (IUserRegistrationService) | HARD |
| Session invalidation on OIDC change (CF-67) | FLOW-03 F197 (IPermissionService) | HARD |
| Payment billing integration (CF-68) | FLOW-06 F225 (IBillingService) | HARD |
| Refund → order status (CF-69) | FLOW-06 F225 (IBillingService) | HARD |
| Subscription migration fence (CF-71) | FLOW-06 F225 (IBillingService) | HARD |
| GDPR cascade to users (CF-72) | FLOW-02 F105 (IUserRegistrationService) | HARD |
| GDPR cascade to content (CF-73) | FLOW-04 F166 (IInventoryService) | HARD |
| GDPR cascade to billing (CF-74) | FLOW-06 F225 (IBillingService) | HARD |
| Rate limiting all flows (CF-75) | MicroserviceBase (SK-379 (MicroserviceBase)) | SOFT |
| In-flight content checkpoint (CF-77) | FLOW-04 AF pipeline | SOFT |

## FLOW-08 MACHINE Components (15 fixed)

| # | Component | Enforced By |
|---|-----------|-------------|
| M1 | tenantId format: ^[a-z0-9_-]{3,64}$ | F244, IR-83-1 |
| M2 | Tier enum: [free, pro, enterprise] | F244, IR-83-2 |
| M3 | 8-state onboarding sequence | F248, IR-83-3 |
| M4 | PCI + shared_schema = BLOCKED | F266, IR-84-5 |
| M5 | RLS session set before every shared_schema query | F246, IR-84-4 |
| M6 | Secrets as vaultRef only | F259, IR-85-5 |
| M7 | Idempotency check before PSP call | F260, IR-86-1 |
| M8 | Amount in minor currency units (integer) | F258, IR-86-4 |
| M9 | HMAC signature verification before webhook processing | F257, IR-87-4 |
| M10 | Audit log entries never deleted by GDPR cascade | F250, IR-88-2 |
| M11 | Metering never blocks main execution path | F263, IR-90-1 |
| M12 | Bounded cardinality metric dimensions | F262, IR-90-2 |
| M13 | Saga compensation registered BEFORE step | F249, IR-91-2 |
| M14 | Canary max 20% initial cohort | F265, IR-92-1 |
| M15 | Auto-rollback at 5× baseline error rate | F265, IR-92-2 |

## FLOW-08 FREEDOM Components (15 configurable)

| # | Component | Default | Config Path |
|---|-----------|---------|-------------|
| FR1 | Isolation mode | shared_schema | tenantConfig.isolationMode |
| FR2 | Identity provider mode | local | tenantConfig.identityProvider.mode |
| FR3 | Payment provider | stripe | tenantConfig.paymentProvider.mode |
| FR4 | MFA policy | optional | tenantConfig.authenticationPolicy.mfaRequirement |
| FR5 | Rate limit per tier | free:100, pro:1000 | tenantConfig.rateLimits.maxRequestsPerWindow |
| FR6 | Burst multiplier | pro:2.0, enterprise:5.0 | tenantConfig.rateLimits.burstMultiplier |
| FR7 | Operation weights | ai_gen:10, standard:1 | tenantConfig.rateLimits.operationTypeWeights |
| FR8 | Billing period | monthly | tenantConfig.billing.periodType |
| FR9 | Metrics retention | hot:7, warm:30, cold:90 | tenantConfig.metrics.retentionDays |
| FR10 | GDPR deletion SLA | 720h (30 days) | tenantConfig.gdpr.deletionSlaHours |
| FR11 | Export format | json | tenantConfig.gdpr.exportFormatType |
| FR12 | Canary bake time | 60 min | deployment.canaryDurationMinutes |
| FR13 | Migration drain timeout | 300s | migration.drainTimeoutSeconds |
| FR14 | Graduation approval | required | migration.graduationApprovalRequired |
| FR15 | Config promotion pipeline | dev→staging→prod | tenantConfig.promotion.stages |

## FLOW-08 Anti-Patterns (12)

| # | Anti-Pattern | Correct Pattern |
|---|-------------|-----------------|
| AP-1 | Import Npgsql directly | DATABASE FABRIC via CreateAsync |
| AP-2 | Typed ITenant model | dict[str, Any] (DNA-1) |
| AP-3 | Hardcode rate limits | FREEDOM config from F251 |
| AP-4 | Direct HTTP between services | QUEUE FABRIC events |
| AP-5 | Delete audit in GDPR | F250 audit retained (IR-88-2) |
| AP-6 | Auto-switch provider on failure | Alert and wait; manual switch |
| AP-7 | Compensation after step | Compensation-gate: BEFORE (CF-79) |
| AP-8 | Last-write-wins payment state | Monotonic stateRank (CF-70) |
| AP-9 | Metering on business stream | Dedicated metering stream (CF-76) |
| AP-10 | Canary removes fields | Additive-only schema (CF-76) |
| AP-11 | Rate limit health checks | EXEMPT classification (CF-75) |
| AP-12 | Hard-delete PCI data | PII scrub soft-delete (CF-74) |

## FLOW-08 Reuse Analysis

| Reuse Source | Reused In FLOW-08 | Adaptation |
|-------------|-------------------|------------|
| EP-1 State Machine (FLOW-05) | T83 onboarding 8-state | Extended to 8 states (was 5) |
| EP-2 Durable Timer (FLOW-05) | T88, T91, T92 | Unchanged — direct reuse |
| DNA-8 Outbox (FLOW-06) | ALL 28 factories | Extended with compensation-gate (SK-32) |
| F234 rate limit (FLOW-07) | F261 tenant rate limiting | Per-user → per-tenant; added tier-awareness |
| SK-7 CloudEvents (FLOW-05) | F247 context propagation | Extended with legacyPayload wrapper |
| F173 feed distribution (FLOW-05) | F270 notification router | Feed cards → multi-channel notifications |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-09: SOURCE INDEX + SKILL PATTERNS
# DD-31–DD-37, SK-37–SK-43, Concept Map, MACHINE/FREEDOM
# Date: 2026-02-26 | Save Point: MERGE:FINAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---

## DESIGN DECISIONS (DD-31 through DD-37)

### DD-31 — Dual-Write Reservation (Redis + PostgreSQL)
Redis for sub-second TTL enforcement, PostgreSQL for crash recovery and audit.
Redis is source of truth for "is hold active?" PostgreSQL for "what happened?"
Outbox pattern ensures consistency between the two stores.

### DD-32 — Webhook as Source of Truth (Not Synchronous Confirmation)
Stripe payment confirmation exclusively via webhook (not synchronous API response).
This eliminates the "client confirms but webhook fails" split-brain scenario.
All ticket issuance triggered by PaymentCompleted event from webhook handler.

### DD-33 — Sampling for Large Events (>2000 Attendees)
Full O(n²) cartesian is 12.5M pairs for 5000 attendees — impractical for real-time.
Sampling uses top-K by profile similarity (pre-computed embeddings) to reduce to ≤500K.
Quality within 5% of full cartesian (verified by ST-42). FREEDOM toggle per tenant.

### DD-34 — Weight Dimension Isolation (FLOW-09 vs FLOW-04)
FLOW-09 writes to event_participation_weight, FLOW-04 reads connection_weight.
Prevents event boost from inflating non-event content ranking.
Composite weight = connection_weight × event_participation_weight (for FLOW-09 only).

### DD-35 — XP Delegation to FLOW-05 (Single Source of Truth)
FLOW-09 does NOT award gamification XP. It emits EventParticipationAnalyzed with metadata.
FLOW-05 owns all XP awards. Prevents float-award on cross-flow event consumption.

### DD-36 — Saga Compensation with Optimistic Locking
EP-4 uses optimistic lock (version column) on saga status to prevent concurrent
compensation races (CF-91). LIFO order ensures refund before capacity restore.

### DD-37 — Calendar Overlap as Warning (Not Blocker by Default)
FLOW-09 defaults to lenient mode: create calendar entry with conflict_flag=true.
Strict mode (reject on overlap) is FREEDOM configurable per tenant.
FLOW-06 calendar entries are read-only from FLOW-09's perspective.

---

## CONCEPT MAP: FLOW-09 Event Chains

```
POST /participate
    ↓
  [T93] CheckAvailability → ReserveSpot → StartSaga
    ↓ (available)          ↓ (full)
  [T94] PaymentIntent    [T100] JoinWaitlist → OfferUpgrade
    ↓ (webhook)             ↓ (accept)
  [T95] IssueTicket ← ─ ─ AcceptUpgrade
    ↓ (TicketIssued)
  ╔═══════════════╗
  ║ PARALLEL       ║
  ║ [T96] Calendar ║     [T97] Scoring (4-component)
  ║  + Reminders   ║        ↓
  ║                ║     [T98] FeedIntegration
  ╚════════╦═══════╝        ↓
           ╚════════════════╗
                            ↓
                    [T102] Analytics → EventParticipationAnalyzed → FLOW-05 XP
                            ↓
                         END

  [T99] WeightEvolution (independent, durable timers)
    T-7d: 1.5× → T-1d: 2.0× → T-0: 3.0× → T+1d..T+7d: decay → permanent +0.05

  [T101] Compensation (on failure at any step)
    LIFO: RemoveFeed → CancelReminders → RemoveCalendar → RestoreCapacity → CancelTicket → Refund → ReleaseReservation
```

---

## MACHINE vs FREEDOM Configuration

### MACHINE (fixed by engine, not configurable)
- Reservation state machine: ACTIVE → COMPLETED | EXPIRED | CANCELLED
- Webhook signature verification order (sig BEFORE dedup)
- QR encryption algorithm: AES-256-GCM
- Ticket state machine: ISSUED → SCANNED → USED | CANCELLED
- Saga compensation order: LIFO (reverse of completion)
- Capacity invariant: total = available + sold + reserved
- Weight dimension isolation: event_participation_weight separate from connection_weight
- XP delegation: FLOW-05 only (FLOW-09 never awards XP)
- Scoring formula: (history + questionnaire + group + audience) / 4
- Feed diversity enforcement: runs AFTER each batch injection

### FREEDOM (admin-configurable via Elasticsearch config documents)
- Reservation TTL (default 5 min)
- Reservation expiry check interval (default 30s)
- Payment provider (Stripe/PayPal via FLOW-08 F252)
- Supported currencies and payment methods
- QR encryption key scope (per-event vs per-tenant)
- QR key rotation interval
- Calendar provider (Google/Apple/ICS)
- Calendar overlap mode (strict/lenient)
- Reminder milestones (default T-7d/T-1d/T-1h/T-15m)
- Catch-up job interval (default 15min)
- Late reminder messaging templates
- Scoring batch size (default 500 pairs)
- Sampling threshold (default 2000 attendees)
- Per-tenant queue ceiling
- Queue backpressure threshold (default 10,000)
- Consumer auto-scale range (default 2-16)
- Feed diversity cap (default 40%)
- Feed spacing window (default 3 posts)
- Weight multiplier values (default 1.5×/2.0×/3.0×)
- Decay tau (default 2.0)
- Permanent bonus (default +0.05)
- Waitlist max size
- Upgrade offer TTL (default 10min)
- Compensation retry policy and max attempts
- XP amounts per participation_type (paid=100, free=50, upgrade=75)

---

## ANTI-PATTERNS (AP-79 through AP-86)

| # | Anti-Pattern | Violation | Correct Pattern |
|---|-------------|-----------|-----------------|
| AP-79 | Importing Stripe SDK directly in F273 | Layer 1 violated | Resolve through FLOW-08 F252 via CreateAsync() |
| AP-80 | Using typed ReservationModel class | DNA-1 violated | dict[str, Any] via parse_document |
| AP-81 | Checking capacity without row lock | CF-81 violated | F277 SELECT FOR UPDATE inside transaction |
| AP-82 | Awarding XP in FLOW-09 service code | CF-94 violated | Emit EventParticipationAnalyzed, let FLOW-05 award |
| AP-83 | Writing to connection_weight from F285 | CF-93 violated | Write to event_participation_weight only |
| AP-84 | Processing webhook before signature verify | IR-94-1 violated | Sig verify FIRST, then dedup, then process |
| AP-85 | Full cartesian for 5000+ attendees | CF-92 violated | Sampling mode with top-K heuristic |
| AP-86 | Compensation in random order | DNA-9 violated | LIFO order via EP-4 saga coordinator |

---

## SKILL PATTERNS (SK-37 through SK-43)

### SK-37 — Redis TTL Hold Pattern
```
PATTERN: Redis SET NX with TTL for short-lived reservation holds.
USE: F272 ReserveSpotAsync, F278 upgrade offer TTL
KEY FORMAT: reservation:{tenantId}:{eventId}:{userId}
TTL: Configurable (FREEDOM), enforced by Redis (not application timer)
FALLBACK: If Redis unavailable, use PostgreSQL column + scheduled cleanup
DUAL-WRITE: Redis SET + PostgreSQL INSERT via outbox
```

### SK-38 — Webhook Dedup Pattern (EP-5)
```
PATTERN: Idempotent webhook processing with signature-first, dedup-second.
USE: F273 HandleWebhookAsync (Stripe), any external webhook handler
STEPS: 1) Verify HMAC signature → reject if invalid
       2) Check EP-5 dedup store (key=provider_event_id)
       3) If exists → return 200, no processing
       4) If new → process, store in dedup, emit domain event
TTL: 72h minimum (matches Stripe retry window)
```

### SK-39 — Encrypted QR Payload Pattern
```
PATTERN: AES-256-GCM encrypted payload for secure ticket validation.
USE: F274 IssueTicketAsync, ValidateTicketAsync
PAYLOAD: eventId|ticketId|tenantId|issuedAt
KEY: From KMS (per-tenant or per-event, FREEDOM configurable)
NONCE: Unique per encryption (12 bytes, crypto-random)
VALIDATION: Decrypt → verify fields → check ticket status in DB
```

### SK-40 — Redis Sorted Set Scheduling Pattern
```
PATTERN: Use Redis sorted sets (ZADD/ZRANGEBYSCORE) for time-based dispatch.
USE: F276 ScheduleRemindersAsync, ProcessDueRemindersAsync
SCORE: Unix epoch seconds of target dispatch time
DISPATCH: ZRANGEBYSCORE -inf {now} with LIMIT for batch processing
CATCH-UP: On restart, process ALL scores ≤ now (handles engine downtime)
DEDUP: By reminder_schedule_id (prevents float-send on catch-up)
```

### SK-41 — Bounded Fan-Out with Backpressure
```
PATTERN: O(n²) pair emission with queue depth monitoring and tenant isolation.
USE: T97 ScoringBatchEmitted, any large fan-out scenario
STEPS: 1) Check queue depth BEFORE each batch
       2) If > threshold → backoff (exponential, max 30s)
       3) Per-tenant ceiling (no single tenant starves others)
       4) For n > sampling_threshold → top-K heuristic
QUALITY: Sampling within 5% of full cartesian (spot-check)
```

### SK-42 — Feed Diversity Cap Pattern
```
PATTERN: Cross-source feed diversity enforcement with spacing rules.
USE: F284 EnforceDiversityCapsAsync, any multi-source feed
STEPS: 1) Count posts per source_flow_id
       2) If any source > cap% → demote excess (not delete)
       3) Check spacing window (same author not within N posts)
       4) Re-order demoted posts to lower positions
NAMESPACE: feed:{tenantId}:{userId}:{sourceFlow}
CAP: Combined across all sources (not per-source)
```

### SK-43 — Exponential Weight Decay Pattern
```
PATTERN: Time-based weight evolution with milestones and permanent bonus.
USE: F285 ApplyMultiplierAsync, ApplyDecayAsync
FORMULA: weight = base × (1 + (peak_multiplier - 1) × e^(-days/tau))
MILESTONES: Pre-event amplification at configurable intervals
DECAY: Post-event exponential with tau (FREEDOM)
BONUS: Permanent additive after decay completes
ISOLATION: Writes to dedicated dimension (never base weight)
```

---

## DEPENDENCY MAP

### FLOW-09 → Existing Flow Dependencies

| Dependency | Direction | What | CF Rule |
|-----------|-----------|------|---------|
| FLOW-01 → FLOW-09 | Auth | JWT validation before participation | CF-86 |
| FLOW-02 → FLOW-09 | Read | Business profile for audience scoring | CF-87 |
| FLOW-03 → FLOW-09 | Read | Event existence + status check | CF-88 |
| FLOW-04 ← FLOW-09 | Isolated | Weight dimensions (no bleed) | CF-93 |
| FLOW-05 ← FLOW-09 | Event | EventParticipationAnalyzed → XP award | CF-94 |
| FLOW-06 ← FLOW-09 | Read | Calendar overlap check | CF-95 |
| FLOW-07 ↔ FLOW-09 | Shared | Feed namespace with combined caps | CF-84, CF-89 |
| FLOW-08 → FLOW-09 | Factory | F252 payment adapter, F245 tenant config | CF-90 |

**Zero writes to prior flow entities. All dependencies are reads or event emissions.**

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-10 MERGE: DESIGN DECISIONS DD-38-DD-49, SOURCE INDEX, DEPENDENCY MAP
# Merged: 2026-02-26 | Source: FLOW10_P1-P9
# ═══════════════════════════════════════════════════════════════════

## Design Decisions DD-38 through DD-49

### DD-38 — Cart Storage in Redis (Ephemeral Commerce)
```
DECISION: Shopping carts stored in Redis with configurable TTL (default 72h).
RATIONALE: Carts are high-frequency, low-durability. Redis provides sub-millisecond access.
           Abandoned cart TTL prevents storage bloat. Cart-to-order conversion (T112) freezes
           cart state before PG write. No cart persistence guarantee needed.
TRADE-OFF: Cart lost on Redis failure → acceptable (user recreates), vs order loss → unacceptable.
REFERENCES: F288 ICartService, DR-31
```

### DD-39 — Two-Phase Payment (Authorize then Capture)
```
DECISION: Checkout uses authorize → fulfill → capture flow, not single-step charge.
RATIONALE: Authorize holds funds without charging. If fulfillment fails, void the auth (no refund needed).
           Capture only after confirmed fulfillment. Reduces refund rate and PSP fees.
TRADE-OFF: Slightly more complex flow vs significantly fewer refunds and disputes.
REFERENCES: F293 IPaymentOrchestratorService, T113, SK-50
```

### DD-40 — Content Versioning (Append-Only History)
```
DECISION: Content entity modifications create version records (append-only), not in-place updates.
RATIONALE: Enables audit trail, diff comparison, rollback to prior version.
           Published content always references a specific version ID.
TRADE-OFF: Storage growth (mitigated by configurable max versions per F245).
REFERENCES: F298 IContentEntityService, T107-T109
```

### DD-41 — Media Processing as Async Pipeline
```
DECISION: Media uploads trigger async processing (derivatives, metadata, AI alt-text) via queue.
RATIONALE: Image/video processing can take 2-30 seconds. Synchronous = blocked UI.
           Queue allows retry, backpressure, and parallel processing.
TRADE-OFF: User sees placeholder until processing completes (acceptable with progress indicator).
REFERENCES: F300 IMediaAssetService, T110
```

### DD-42 — Template Engine with Tenant Override Chain
```
DECISION: Notification templates resolve: tenant-specific → platform default → locale fallback.
RATIONALE: Platform provides sensible defaults. Tenants customize for branding.
           Locale fallback ensures no blank notifications for unsupported locales.
TRADE-OFF: Three-level lookup adds latency (~5ms) → mitigated by Redis cache on resolved templates.
REFERENCES: F320 INotificationTemplateService, T124, SK-54
```

### DD-43 — Saga Compensation in Reverse Order
```
DECISION: Durable workflow compensation executes steps in REVERSE order (LIFO).
RATIONALE: Step N may depend on resources created by step N-1.
           Forward compensation could fail on missing resources.
           Reverse order ensures each compensation step has its dependencies intact.
TRADE-OFF: Longer compensation time vs correctness guarantee.
REFERENCES: F308 ICompensationService, SK-55, T103, T106, T120, T122
```

### DD-44 — Push Webhooks with HMAC (Not Pull / Polling)
```
DECISION: Webhook delivery is push (XIIGen initiates) with HMAC-SHA256 signature.
RATIONALE: Push = lower latency, no polling overhead. HMAC prevents forgery.
           Per-installation signing key (not per-tenant) enables fine-grained revocation.
TRADE-OFF: XIIGen bears delivery cost → mitigated by retry budget (5 attempts, 24h max).
REFERENCES: F311 IWebhookDeliveryService, SK-53, T121
```

### DD-45 — Sync vs Async Extension Points
```
DECISION: Extension points support two modes: SYNC (response-modifying, 5s timeout) and ASYNC (fire-and-forget).
RATIONALE: Checkout discount = SYNC (must modify response before user sees price).
           Analytics = ASYNC (no user-visible impact).
           Hard timeout on SYNC prevents malicious/slow apps from blocking checkout.
TRADE-OFF: 5s timeout may be too short for complex computations → apps should pre-compute.
REFERENCES: F314 IExtensionPointService, T120
```

### DD-46 — CDN/ESP Provider Abstraction
```
DECISION: CDN purge (Cloudflare/Fastly/CloudFront) and ESP (SendGrid/SES/Postmark) use same factory abstraction.
RATIONALE: Consistent pattern: F245 binding → provider adapter → fabric interface.
           Tenant A on Cloudflare + SendGrid. Tenant B on CloudFront + SES. Same code.
TRADE-OFF: Adapter per provider → development cost. Justified by tenant freedom.
REFERENCES: F318 ICachePurgeService, F322 IEmailDeliveryService
```

### DD-47 — Tenant Filter Auto-Inject on Search
```
DECISION: F316 auto-injects tenantId into every search query. Developers cannot bypass.
RATIONALE: Manual tenant filtering is error-prone. One missed filter = cross-tenant data exposure.
           Auto-inject makes it impossible to forget.
TRADE-OFF: No "global" search across tenants → platform admin uses separate privileged path.
REFERENCES: F316 ISearchQueryService, DR-35, CF-96
```

### DD-48 — Notifications Eventually Consistent
```
DECISION: Notification delivery is eventually consistent (1-5s acceptable delay).
RATIONALE: Domain operations (order creation, content publish) must not be blocked by notification latency.
           Queue-based delivery isolates domain from notification provider failures.
TRADE-OFF: User may see order confirmation before receiving email → acceptable UX.
REFERENCES: F321 INotificationDispatchService, DR-36
```

### DD-49 — GDPR Synchronous Unsubscribe Exception
```
DECISION: UnsubscribeAsync is the ONE synchronous operation in the notification pipeline.
RATIONALE: GDPR requires immediate opt-out enforcement. Async unsubscribe + in-flight notification = violation.
           One synchronous operation is acceptable price for legal compliance.
TRADE-OFF: Increased latency on unsubscribe path (~50ms). Negligible.
REFERENCES: F321, F324, DR-36, SK-54
```

---

## FLOW-10 → Existing Flow Dependencies

| Dependency | Direction | What | CF Rule |
|-----------|-----------|------|---------| 
| FLOW-01 → FLOW-10 | Auth | JWT validation for all FLOW-10 operations | — (standard) |
| FLOW-02 → FLOW-10 | Read | Business profile for tenant context | — (standard) |
| FLOW-05 → FLOW-10 | Event | Content gamification (XP for publishing) | — (optional, via event) |
| FLOW-06 → FLOW-10 | Read | Marketplace listing references product entities | CF-120 (search index) |
| FLOW-07 → FLOW-10 | Feed | Social feed includes content entities | CF-123 (fan-out) |
| FLOW-08 → FLOW-10 | Compose | F244-F271 tenant infrastructure (10 factories) | CF-96-CF-102 |
| FLOW-09 → FLOW-10 | Event | Event content references CMS entities | CF-103 (concurrent mod) |

**Zero writes to prior flow entities. All dependencies are reads, compositions, or event emissions.**

---

## FLOW-10 Design Decision Cross-Reference

| DD# | Decision | DR# | SK# | Key Factories |
|-----|----------|-----|-----|---------------|
| DD-38 | Cart in Redis (ephemeral) | DR-31 | — | F288 |
| DD-39 | Two-phase payment | — | SK-50 | F293, T113 |
| DD-40 | Content versioning (append-only) | — | SK-45 | F298, T107-T109 |
| DD-41 | Media async pipeline | — | — | F300, T110 |
| DD-42 | Template override chain | — | SK-54 | F320, T124 |
| DD-43 | Saga compensation (reverse order) | DR-33 | SK-55 | F308, T103/T106/T120/T122 |
| DD-44 | Push webhooks + HMAC | DR-34 | SK-53 | F311, T121 |
| DD-45 | Sync vs async extension points | DR-34 | SK-52 | F314, T120 |
| DD-46 | CDN/ESP abstraction | — | — | F318, F322 |
| DD-47 | Tenant filter auto-inject | DR-35 | — | F316, CF-96 |
| DD-48 | Notification eventually consistent | DR-36 | SK-54 | F321 |
| DD-49 | GDPR sync unsubscribe | DR-36 | SK-54 | F321, F324 |

---

## Source Document Index (FLOW-10)

| # | Source Document | Used In | Key Contribution |
|---|----------------|---------|-----------------|
| 1 | 10-shops_modules.md | P0 | Domain requirements, module list |
| 2 | 10-shops_modules_deep_research.md | P0, P1-P6 | WordPress/Shopify feature parity |
| 3 | 10-shops_modules_deep_research_engine.md | P0, P7a-P7b | Task type archetype mapping |
| 4 | 10-shops_modules_deep_research_engine_multi_tenant.md | P0, P1 | Bridge vs. dedicated DB patterns |
| 5 | 10-shops_modules_deep_research_engine_multi_tenant_master_plan.md | P0 | Phase sequencing |
| 6 | 10-shopes_modules_FLOW10_P3_COMMERCE_ENGINE.md | P1 | F288-F296 specs |
| 7 | 10-shops_modules_FLOW10_P4_WORKFLOW_EXTENSIBILITY.md | P3, P4 | F304-F314 specs |
| 8 | 10-shops_modules_FLOW10_P5_SEARCH_NOTIFICATIONS.md | P5, P6 | F315-F324 specs |
| 9 | FLOW10_P6a_TASK_TYPES.md | P7a | T103-T116 contracts (remapped +20) |
| 10 | FLOW10_P6b_TASK_TYPES.md | P7b | T117-T124 + Templates 20-24 (remapped) |
| 11 | ENGINE_ARCHITECTURE_MERGED.md | P0 | Numbering baseline |
| 12 | TASK_TYPES_CATALOG_MERGED.md | P0, P7a-P7b | Sequence continuity |

## Critical Remap Reference (FLOW-10)

| Source Range | Actual Range | Offset | Reason |
|-------------|-------------|--------|--------|
| F258-F287 (source P3-P6) | F288-F324 | +30 | FLOW-08/09 consumed F244-F287 |
| T83-T104 (source P6a/P6b) | T103-T124 | +20 | FLOW-08/09 consumed T83-T102 |
| Templates 18-22 (source) | Templates 20-24 | +2 | FLOW-08/09 added Templates 18-19 |
| CF-64-CF-97 (source) | CF-96-CF-130 | +32 | FLOW-08/09 consumed CF-64-CF-95 |

---

## Integration Changelog (continued)

| Date | Operation | DDs | SKs | Notes |
|------|-----------|-----|-----|-------|
| 2026-02-26 | FLOW-08 P4 merge | DD-21-DD-30 (+10) | SK-29-SK-36 (+8) | Multi-tenant patterns |
| 2026-02-26 | FLOW-09 P4 merge | DD-31-DD-37 (+7) | SK-37-SK-43 (+7) | Event participation patterns |
| 2026-02-26 | FLOW-10 merge | DD-38-DD-49 (+12) | SK-44-SK-55 (+12) | CMS+Commerce+Extensibility |

```
DESIGN DECISIONS (continuous):
  DD-1-DD-10   [FLOW-01 through FLOW-04]
  DD-11-DD-16  [FLOW-05]
  DD-17-DD-20  [FLOW-06 + FLOW-07]
  DD-21-DD-30  [FLOW-08]
  DD-31-DD-37  [FLOW-09]
  DD-38-DD-49  [FLOW-10]                <- NEW
  Next: DD-50 (FLOW-11)
```

## SAVE POINT: FLOW-10:MERGE:INDEX ✅
# ═══════════════════════════════════════════════════════
# FLOW-11 — Unified Source Index Extension
# DD-50 through DD-56 (7 design decisions) | Concept Maps
# Date: 2026-02-26 | Appends after DD-49 in UNIFIED_SOURCE_INDEX_MERGED
# ═══════════════════════════════════════════════════════

---

## DESIGN DECISIONS — FLOW-11

### DD-50 — FLOW-11 encompasses 6 sub-flows under one flow ID (not FLOW-11 through FLOW-16)
**Rationale:** The 6 social network flows are tightly coupled (shared graph, shared audience, shared moderation). Single flow ID with 6 templates maintains cohesion.

### DD-51 — Neo4j added as 7th DATABASE FABRIC provider (not new fabric)
**Rationale:** Consistent with fabric-first philosophy; no new abstraction layer needed.

### DD-52 — Ad injection (F345) as placeholder in feed pipeline (not full ad system)
**Rationale:** Full ad system (auction, targeting, measurement) is a separate flow (deferred). F345 provides the injection point.

### DD-53 — Communities/Pages/Events deferred to FLOW-12
**Rationale:** Core social flows (post, feed, engagement, messaging, search, moderation) must work first. Communities add group-level permissions complexity.

### DD-54 — WebSocket transport via QUEUE FABRIC adapter (F354), not direct WebSocket server
**Rationale:** F354 publishes to `realtime.push` queue; separate WebSocket gateway service (outside flow engine) consumes and delivers. Keeps engine boundary clean.

### DD-55 — Feed cache invalidation event-driven (not TTL-only)
**Rationale:** TTL-only means users see stale blocked content until expiry. Event-driven invalidation on EdgeCreated(BLOCK) provides immediate consistency.

### DD-56 — Moderation appeal as state machine step (T148), not separate flow
**Rationale:** Appeal is the continuation of the enforcement lifecycle, not a separate process. Keeping it in the same template enables: same audit trail, same factory dependencies, same tenant context.

---

## FLOW-11 CONCEPT → SOURCE MAP

### New Concepts Introduced by FLOW-11

| Concept | Factory | Source | Key Detail |
|---------|---------|--------|------------|
| Social Graph (Neo4j) | F325-F330 | 11-social_network_modules | 7th DATABASE FABRIC provider |
| Signed URL Upload | F331 | 11-social_network_deep_research | Binary never transits fabric |
| EP-2 Media Wait Gate | F333 | basic_prompt LAYER 0 (EP-2) | Durable timer as wait gate |
| AI Media Tagging | F336 | 11-social_network_deep_research_engine | Non-blocking parallel track |
| Feed Eligibility Gate | F337 | basic_prompt LAYER 4 (guardrails) | Safety-before-feed invariant |
| Feed Ranking (ML) | F341 | 11-social_network_deep_research_engine | AI ENGINE FABRIC for ranking |
| BRANCH_GATE | T138 (Trust) | New archetype | Flow step with path branching |
| HUMAN_IN_LOOP | T147 (Review) | New archetype | Flow pauses for human decision |
| NLP_TRANSFORM | T142 (Search) | New archetype | AI query expansion |
| MULTI_MODEL_CONSENSUS | T132/T145 | AF-5 extended | Parallel models with voting |
| CACHE_ASIDE | T134 (Feed) | New archetype | Check cache → miss → pipeline → store |
| IDEMPOTENT_WRITE | T135 (Reaction) | New archetype | PG UNIQUE + Redis dedup |

### Cross-Flow Factory Composition

| FLOW-11 Factory | Composes From | Via |
|-----------------|---------------|-----|
| F328 (Audience Resolver) | F325 (Graph Edge), F329 (Privacy) | Direct call within fabric |
| F339 (Feed Candidates) | F327 (Graph Query), F328 (Audience) | Factory resolution |
| F340 (Privacy Filter) | F325 (Block check), F329 (Privacy) | Factory resolution |
| F341 (Feed Ranking) | F330 (Relationship Strength) | Feature input |
| F351 (Trust Gate) | F325 (Connection check) | Factory resolution |
| F359 (Search Filter) | F328 (Audience), F329 (Privacy) | Factory resolution |
| F360 (Proximity Rank) | F327 (Graph), F330 (Strength) | Factory resolution |
| F362 (Safety) | AF-5 Multi-model | Fabric delegation |
| F365 (Enforcement) | F334 (Post), F337 (Eligibility) | Factory resolution |

### FLOW-11 Event Stream Namespace

| Family | Stream Prefix | Events |
|--------|--------------|--------|
| 44 Graph | `graph.*` | EdgeCreated, EdgeRemoved, SuggestionRefreshed |
| 38 Post | `media.*`, `post.*`, `feed.eligibility.*` | MediaUploadCompleted, TranscodeCompleted, PostPublished, FeedEligibilityGranted |
| 39 Feed | `feed.*` | FeedGenerated, FeedCacheInvalidated |
| 40 Engagement | `engagement.*` | ReactionAdded, CommentCreated, MentionDetected |
| 41 Messaging | `messaging.*`, `realtime.*` | MessageSent, MessageRead, PresenceUpdated |
| 42 Search | `search.*` | SearchExecuted, TypeaheadQueried |
| 43 Moderation | `moderation.*` | ContentReported, SafetyClassified, EnforcementApplied, AppealSubmitted |

---

## SAVE POINT: FLOW11:SOURCE_INDEX ✅
## 7 design decisions (DD-50-DD-56)
## Concept map, composition map, event namespace map
-e 
---

# FLOW-12 — UNIFIED SOURCE INDEX UPDATE
# DD-57–DD-60 | Concept Map Extension | SK additions
# ═══════════════════════════════════════════════════════

## Design Decisions — FLOW-11 (DD-57–DD-60)

### DD-57

```
DECISION DOMAIN: ERP Connector Abstraction
DECISION: External ERP APIs (SAP B1 OData, monday.com GraphQL) are exposed through
          fabric interfaces only (F368, F372). Service code never imports ERP vendor SDKs.
TRADEOFFS CONSIDERED:
  Option A (chosen): Fabric wrapper — higher initial abstraction cost, full provider swap via config
  Option B: Direct SDK import — faster initial dev, permanent provider lock-in
  Option C: OpenAPI codegen — automatic but typed models violate DNA-1
REASONING: Freedom Machine philosophy. Config-first routing (DNA-8). Enables future ERP
           provider swap without code change. Consistent with all prior fabric decisions.
IMPACT: F368 and F372 implement OData v3/v4 + B1SESSION management internally.
        All consuming services see only DataProcessResult[dict[str, Any]].
REFERENCES: basic_prompt.txt (LAYER 0 fabric interfaces), DR-48 (tenant isolation)
```

### DD-58

```
DECISION DOMAIN: Financial Correctness Pattern Selection
DECISION: ERP documents use reversal-not-delete semantics (F375) + WORM journal (F371) +
          transactional outbox (F376) + idempotency key (F374) as a mandatory four-component
          co-design pattern (DR-47).
TRADEOFFS CONSIDERED:
  Option A (chosen): All four components mandatory on every state change — consistent correctness
  Option B: Idempotency only — simpler but no outbox guarantee; dual-write risk remains
  Option C: Saga rollback via delete — simpler compensation, destroys audit trail
REASONING: Financial systems require complete audit trail. Reversal-not-delete preserves it.
           Outbox eliminates dual-write. Idempotency eliminates retry duplicates.
           All four are needed together — partial adoption defeats correctness guarantee.
IMPACT: T149 Iron Rules mandate all four. AF-9 Judge validates presence at build time.
        CF-162 (idempotency) enforced by BFA.
REFERENCES: 12_-_ERP_systems_deep_search.md (reliability patterns), DR-47
```

### DD-59

```
DECISION DOMAIN: Multi-Tenant Isolation Tier Selection
DECISION: FLOW-11 uses three-tier isolation (SHARED/SCHEMA/INSTANCE) selectable per
          tenant via FactoryResolutionContext, with tier upgrades requiring config change only.
TRADEOFFS CONSIDERED:
  Option A (chosen): Three tiers, config-driven selection, Freedom Machine approach
  Option B: Single tier (all SCHEMA) — simpler but over-provisions SMB tenants
  Option C: Single tier (all SHARED) — cost-efficient but cannot satisfy regulated tenants
REASONING: ERP data has a unique risk gradient. Financial records for enterprise tenants
           require complete physical isolation. SMB tenants cannot absorb that cost.
           Config-driven tier selection is the Freedom Machine answer.
IMPACT: F380 (connection registry) stores tier per tenant. FactoryResolutionContext carries
        IsolationTier. All F368–F383 factories branch on IsolationTier.
        Per-tenant KEK required for SCHEMA and INSTANCE tiers (PII: tax_id, addresses).
REFERENCES: multi-tenant-support.md (hybrid isolation model), DR-48
```

### DD-60

```
DECISION DOMAIN: Analytics vs Ledger Separation
DECISION: F382 (analytics index) and F371 (authoritative ledger) are permanently separated.
          Analytics is always derived (fed by outbox relay). Ledger is always authoritative.
          No system may use analytics data as input to a financial posting.
TRADEOFFS CONSIDERED:
  Option A (chosen): Strict separation + CF-172 BFA enforcement + AF-9 static analysis check
  Option B: Single store for both analytics and ledger — simpler, but mixes authoritative
            and derived data; SAP universal journal design explicitly rejects this
  Option C: Analytics-first (derive ledger from analytics) — inverts the dependency
            creates risk of approximations becoming authoritative
REASONING: SAP S/4HANA "universal journal" is explicitly the "book of original entry."
           Analytics over it are secondary. Mixing them creates SOC 2 / GAAP violation risk.
           CF-172 enforces at engine level — no service can accidentally break this.
IMPACT: T156 always event-driven from outbox relay. F382 records always tagged source="derived".
        AF-9 Judge static analysis validates no data flow from F382 → F371.
REFERENCES: 12_-_ERP_systems_deep_search.md (analytics vs authoritative), DR-49
```

---

## Concept Map Extension — FLOW-11

```
FLOW-11 DEPENDENCY MAP:

  O2C VALUE STREAM:
  Quote──►SO──►Delivery──►AR_Invoice──►IncomingPayment
   T149   T149    T149        T149           T149
   F370   F370    F370        F370           F370+F371
  [Each step: F374(idempotency)+F376(outbox)+F381(audit)]
  [Each step: CF-161(chain)+CF-162(idempotency)+CF-163(tenant)]
  [Approval gates: T155 on SO + AR_Invoice]
  [Compensation: T153 on any step failure → LIFO]

  P2P VALUE STREAM:
  PReq──►PO──►GR──►T150──►AP_Invoice──►OutgoingPayment
  T149   T149  T149 T150    T149           T149
  F370   F370  F370 F378    F370           F370+F371
  [T150: CF-164+CF-165+CF-166 enforced]
  [Variance → T155, Mismatch → ALERT_AND_BLOCK]
  [Approval gates: T155 on PReq + AP_Invoice + OutgoingPayment]

  R2R VALUE STREAM:
  Initiate──►Revalue──►Accrue──►Validate──►Seal
    T152      T152      T152     T152       T152
   F379+F373  F379+F371 F379+F371 F371      F379
  [Pre-conditions: CF-167+CF-168+CF-169]
  [Seal requires: approvalToken(finance_admin)]

  SUPPORTING FLOWS:
  Bootstrap (T154): F380+F372+F368+F369+F377 → status=ACTIVE
  Sync (T151):      F368+F369+F374+F380+F383 → watermark checkpoint
  Analytics (T156): F382+F376+F381 → source="derived" tagged
  Compensation (T153): F375+F371+F370+F381+F374 → reversal-not-delete

  CROSS-CUTTING:
  All steps → F374 (idempotency first)
  All steps → F376 (outbox in same transaction)
  All steps → F381 (audit before return)
  All steps → F373 (saga state machine)
  All steps → F383 (quota check before ERP API call)
```

---

## Skills Index Update — FLOW-11 Additions

| SK-ID | Skill Name | Source Pattern | FLOW-12 Usage |
|-------|-----------|----------------|---------------|
| SK-69 | ERP Document Chain Step | F370 + F374 + F376 co-design | T149 generation template |
| SK-70 | Three-Way Match Gate | F378 + F370 + CF-165 + CF-166 | T150 generation template |
| SK-71 | Saga Coordination with Compensation | F373 + T153 + LIFO compensation | T149/T153 generation |
| SK-72 | WORM Ledger + Reversal Semantics | F371 + F375 + DR-46 | T153 generation template |
| SK-73 | Transactional Outbox + Idempotency | F374 + F376 + DR-47 | All T149-T156 co-design |
| SK-74 | Period-End Close Routine | F379 + CF-167-104 | T152 generation template |
| SK-75 | Multi-Tenant ERP Connection Bootstrap | F380 + F377 + T154 | T154 generation template |
| SK-76 | ERP Approval Gate with RBAC | F372 + F373 + RBAC roles | T155 generation template |
| SK-77 | OData Watermark Sync Pattern | F368 + F369 + F383 | T151 generation template |
| SK-78 | Derived Analytics + Reconciliation | F382 + CF-172 + DR-49 | T156 generation template |

---

## SAVE POINT: FLOW-12:MERGE:P4 ✅
## Phase 4 COMPLETE: DD-57–DD-60, Concept Map FLOW-11, SK-69–SK-78

# ═══════════════════════════════════════════════════════
# FLOW-13 — Enterprise Finance Engine
# Design Decisions DD-61–DD-73 | Concept Maps | DNA Compliance
# ═══════════════════════════════════════════════════════

# 13-finance_UNIFIED_SOURCE_INDEX_F11
## XIIGen Engine — FLOW-13 Source Index: AF Maps, Flow Templates 20–24, DD-61–DD-70
## Save Point: P5-INDEX | Status: COMPLETE ✅

---

## AF STATION MAPPING — FLOW-13 (T157–T166)
## 11 stations × 10 task types = 110 cells

| Task | AF-1 Genesis | AF-2 Plan | AF-3 Prompts | AF-4 RAG | AF-5 Multi | AF-6 Review | AF-7 Compliance | AF-8 Security | AF-9 Judge | AF-10 Merge | AF-11 Feedback |
|------|-------------|-----------|-------------|---------|-----------|------------|---------------|-------------|-----------|------------|--------------|
| T157 | FinanceSagaEntryService | period→quota→SoD→create | fin-saga-entry | SK-79, SK-82 | Claude+GPT | saga-state init | DNA-1–9; SoD reg | tenant isolation | IR-157-1–8 QG-157-1–6 | merge outputs | saga creation score |
| T158 | ThreeWayMatchService | fetch-PO→GR→Inv→compare→route | p2p-match | SK-81 | Claude+GPT | tolerance-from-config | DNA-1–9; DR-55 | SoD: submit≠approve | IR-158-1–8 QG-158-1–6 | merge outputs | match quality score |
| T159 | FinanceApprovalGateService | emit→wait-EP4→SoD→audit→resume | finance-approval | SK-80, SK-86 | single model | EP-4 no blocking thread | DNA-9: approve≠initiate | no self-approval | IR-159-1–8 QG-159-1–6 | N/A | approval latency |
| T160 | PeriodCloseOrchestratorService | 8-step close sequence | fin-period-close | SK-82, SK-79, SK-87 | Claude+Gemini | all 8 steps DataProcessResult | DNA-9: close≠lock | privileged actor for lock | IR-160-1–8 QG-160-1–6 | merge close steps | close duration |
| T161 | SubledgerGLSyncService | subledger→GL→delta→gate | fin-subledger-sync | SK-87 | single model | gap threshold from config | DNA-1–9; DR-51 | N/A | IR-161-1–8 QG-161-1–6 | N/A | sync gap metrics |
| T162 | PaymentRunOrchestratorService | propose→approve-dual→execute→EP4-wait→recon | fin-payment-run | SK-84, SK-85 | Claude+GPT | bank fabric only | DNA-9: 4-role separation | bank fabric no direct SDK | IR-162-1–8 QG-162-1–6 | merge outputs | payment run SLA |
| T163 | DoubleEntryValidationService | period→accounts→debit=credit→audit | float-entry-guard | SK-83 | single model | DR-52: new entry only | DNA-1–9; zero tolerance | N/A | IR-163-1–8 QG-163-1–6 | N/A | validation accuracy |
| T164 | RevenueRecognitionGateService | delivery→IFRS15→defer-or-recognize→audit | rev-rec-gate | SK-82, SK-88 | Claude | delivery check sync | DNA-1–9; DR-57 | delivery confirmed before revenue | IR-164-1–8 QG-164-1–6 | N/A | recognition accuracy |
| T165 | ProjectMilestoneBillingService | milestone→billing-doc→rev-rec→invoice→post | milestone-billing | SK-88 | Claude+GPT | new invoice per milestone | DNA-9: PM≠finance | period open before billing | IR-165-1–8 QG-165-1–6 | merge outputs | milestone billing SLA |
| T166 | TenantFinanceProvisionService | tier→CoA→calendar→quota→SoD-policy | fin-tenant-provision | SK-82 | single model | idempotent re-provision | DR-56: 3 tiers config | cross-tenant isolation | IR-166-1–8 QG-166-1–6 | N/A | provision success rate |

---

## FLOW TEMPLATES 20–24

### Template 32: fin-procure-to-pay-v1 (FIN-01)

```json
{
  "flow_id": "fin-procure-to-pay-v1",
  "flow_name": "Procure-to-Pay (P2P)",
  "version": "1.0",
  "description": "Requisition → PO → Goods Receipt → Vendor Invoice → Three-Way Match → Approval → GL Post → Payment → Bank Reconciliation",
  "entry_task": "T157",
  "steps": [
    {
      "step_id": "p2p-saga-entry",
      "task_type": "T157",
      "factory": "F386:IFiscalCalendarService + F425:IFinanceQuotaService + F424:ITenantFinanceProvisionService + F419:ISoDValidationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Redis + MT_ISOLATION_FABRIC",
      "on_success": "p2p-three-way-match",
      "on_failure": "p2p-saga-failed",
      "idempotency_key": "{{tenant_id}}.p2p.{{invoice_id}}.v1",
      "timeout_ms": 5000
    },
    {
      "step_id": "p2p-three-way-match",
      "task_type": "T158",
      "factory": "F391:IVendorInvoiceService + F392:IPurchaseOrderService + F393:IGoodsReceiptService + F394:IMatchExceptionService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-invoice-approval",
      "on_failure": "p2p-match-exception",
      "timeout_ms": 30000,
      "idempotency_key": "{{tenant_id}}.p2p.{{invoice_id}}.match"
    },
    {
      "step_id": "p2p-match-exception",
      "task_type": "T158",
      "note": "Routes to DLQ via F394 — human resolves, re-enters at p2p-three-way-match",
      "factory": "F394:IMatchExceptionService",
      "fabric": "QUEUE_FABRIC/Redis-Streams-DLQ",
      "on_resolve": "p2p-three-way-match"
    },
    {
      "step_id": "p2p-invoice-approval",
      "task_type": "T159",
      "factory": "F397:IAPWorkflowService + F419:ISoDValidationService + F418:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-float-entry-validation",
      "on_reject": "p2p-invoice-rejected",
      "on_timeout": "p2p-approval-escalate",
      "wait_state": "WAITING_APPROVAL",
      "timeout_hours": "{{freedom.approval.p2p.timeout_hours}}"
    },
    {
      "step_id": "p2p-float-entry-validation",
      "task_type": "T163",
      "factory": "F384:IChartOfAccountsService + F386:IFiscalCalendarService + F418:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "p2p-payment-run",
      "on_failure": "p2p-posting-failed"
    },
    {
      "step_id": "p2p-payment-run",
      "task_type": "T162",
      "factory": "F395:IAPPaymentService + F406:IPaymentRunService + F411:ITreasuryWorkflowService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + BANK_CONNECTIVITY_FABRIC/configured-provider + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-bank-reconciliation",
      "on_failure": "p2p-payment-failed",
      "wait_state": "WAITING_BANK_EVENT"
    },
    {
      "step_id": "p2p-bank-reconciliation",
      "task_type": "T161",
      "factory": "F396:IAPReconciliationService + F408:IBankReconciliationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "p2p-complete",
      "on_failure": "p2p-recon-exception"
    }
  ],
  "bfa_entities": ["vendor_invoice", "purchase_order", "goods_receipt", "ap_payment", "bank_statement"],
  "bfa_events": ["invoice.submitted", "match.exception", "approval.requested", "payment.executed", "payment.settled"],
  "conflict_rules": ["CF-173", "CF-174", "CF-175", "CF-177", "CF-179", "CF-188"]
}
```

---

### Template 21: fin-order-to-cash-v1 (FIN-02)

```json
{
  "flow_id": "fin-order-to-cash-v1",
  "flow_name": "Order-to-Cash (O2C)",
  "version": "1.0",
  "description": "Quote/Order → Delivery Confirmation → Revenue Recognition → Customer Invoice → Cash Application → AR Reconciliation",
  "entry_task": "T157",
  "steps": [
    {
      "step_id": "o2c-saga-entry",
      "task_type": "T157",
      "factory": "F386+F425+F424+F419",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "o2c-credit-limit-check"
    },
    {
      "step_id": "o2c-credit-limit-check",
      "task_type": "T157",
      "note": "Uses F399:ICustomerMasterService — credit limit validation sub-step",
      "factory": "F399:ICustomerMasterService",
      "fabric": "DATABASE_FABRIC/PostgreSQL",
      "on_success": "o2c-revenue-recognition",
      "on_failure": "o2c-credit-blocked"
    },
    {
      "step_id": "o2c-revenue-recognition",
      "task_type": "T164",
      "factory": "F400:IRevenueRecognitionService + F398:ICustomerInvoiceService + F386:IFiscalCalendarService + F418:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC/Redis-Streams",
      "on_success": "o2c-invoice-approval",
      "on_deferred": "o2c-revenue-deferred"
    },
    {
      "step_id": "o2c-invoice-approval",
      "task_type": "T159",
      "factory": "F398:ICustomerInvoiceService + F419:ISoDValidationService + F418:IFinanceAuditTrailService",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "o2c-float-entry-validation"
    },
    {
      "step_id": "o2c-float-entry-validation",
      "task_type": "T163",
      "factory": "F384+F386+F418",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "o2c-cash-application"
    },
    {
      "step_id": "o2c-cash-application",
      "task_type": "T157",
      "note": "Uses F401:ICashApplicationService — apply customer payment",
      "factory": "F401:ICashApplicationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "o2c-ar-reconciliation"
    },
    {
      "step_id": "o2c-ar-reconciliation",
      "task_type": "T161",
      "factory": "F403:IARReconciliationService + F421:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch",
      "on_success": "o2c-complete"
    }
  ],
  "bfa_entities": ["customer_invoice", "revenue_recognition", "cash_application", "ar_subledger"],
  "bfa_events": ["invoice.sent", "revenue.recognized", "payment.received", "cash.applied"],
  "conflict_rules": ["CF-173", "CF-178", "CF-182", "CF-183", "CF-188", "CF-190"]
}
```

---

### Template 22: fin-record-to-report-v1 (FIN-03)

```json
{
  "flow_id": "fin-record-to-report-v1",
  "flow_name": "Record-to-Report (R2R)",
  "version": "1.0",
  "description": "Period-end: Subledger Sync → Depreciation → Revaluation → Allocations → Reconciliation → Period Lock → Financial Statements",
  "entry_task": "T160",
  "steps": [
    {
      "step_id": "r2r-subledger-sync",
      "task_type": "T161",
      "factory": "F396:IAPReconciliationService + F403:IARReconciliationService + F421:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "r2r-depreciation",
      "on_failure": "r2r-sync-gap-exception"
    },
    {
      "step_id": "r2r-depreciation",
      "task_type": "T160",
      "note": "Close step: depreciation sub-step",
      "factory": "F412:IFixedAssetService + F413:IDepreciationEngineService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch",
      "on_success": "r2r-revaluation"
    },
    {
      "step_id": "r2r-revaluation",
      "task_type": "T160",
      "note": "Close step: FX revaluation",
      "factory": "F409:IForeignExchangeService",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-cost-allocation"
    },
    {
      "step_id": "r2r-cost-allocation",
      "task_type": "T160",
      "note": "Close step: cost allocation cycle",
      "factory": "F414:ICostAllocationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-float-entry-validation"
    },
    {
      "step_id": "r2r-float-entry-validation",
      "task_type": "T163",
      "factory": "F384+F386+F418",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-period-lock-approval"
    },
    {
      "step_id": "r2r-period-lock-approval",
      "task_type": "T159",
      "note": "Privileged approval required to lock period (DR-53: lock approver ≠ close initiator)",
      "factory": "F420:IPeriodCloseOrchestrationService + F419:ISoDValidationService + F418",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "r2r-period-lock"
    },
    {
      "step_id": "r2r-period-lock",
      "task_type": "T160",
      "note": "Final step: lock period in EP-5",
      "factory": "F420:IPeriodCloseOrchestrationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-5)",
      "on_success": "r2r-financial-statements"
    },
    {
      "step_id": "r2r-financial-statements",
      "task_type": "T160",
      "note": "Post-lock: generate financial statements",
      "factory": "F421:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/Elasticsearch + AI_ENGINE_FABRIC(commentary)",
      "on_success": "r2r-complete"
    }
  ],
  "bfa_entities": ["fiscal_period_state", "gl_journal", "depreciation_posting", "revaluation_posting", "allocation_posting"],
  "bfa_events": ["period.close.started", "subledger.synced", "depreciation.posted", "period.locked"],
  "conflict_rules": ["CF-173", "CF-176", "CF-177", "CF-178", "CF-180", "CF-183"]
}
```

---

### Template 23: fin-project-to-profit-v1 (FIN-04)

```json
{
  "flow_id": "fin-project-to-profit-v1",
  "flow_name": "Project-to-Profit",
  "version": "1.0",
  "description": "Project Plan → Cost Tracking → Milestone Confirmation → Billing → Revenue Recognition → Cost Settlement → Profitability Report",
  "entry_task": "T157",
  "steps": [
    {
      "step_id": "p2p-saga-entry",
      "task_type": "T157",
      "factory": "F386+F425+F424+F419",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "p2p-milestone-billing"
    },
    {
      "step_id": "p2p-milestone-billing",
      "task_type": "T165",
      "factory": "F404:IBillingService + F416:IProjectControllingService + F400:IRevenueRecognitionService + F398:ICustomerInvoiceService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-revenue-recognition",
      "on_failure": "p2p-milestone-not-confirmed"
    },
    {
      "step_id": "p2p-revenue-recognition",
      "task_type": "T164",
      "factory": "F400+F398+F386+F418",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-billing-approval"
    },
    {
      "step_id": "p2p-billing-approval",
      "task_type": "T159",
      "factory": "F398+F419+F418",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "p2p-float-entry-validation"
    },
    {
      "step_id": "p2p-float-entry-validation",
      "task_type": "T163",
      "factory": "F384+F386+F418",
      "fabric": "DATABASE_FABRIC",
      "on_success": "p2p-cost-settlement"
    },
    {
      "step_id": "p2p-cost-settlement",
      "task_type": "T165",
      "note": "Cost settlement sub-step",
      "factory": "F416:IProjectControllingService",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-profitability"
    },
    {
      "step_id": "p2p-profitability",
      "task_type": "T160",
      "note": "Profitability reporting sub-step",
      "factory": "F415:IProfitCenterService + F416:IProjectControllingService",
      "fabric": "DATABASE_FABRIC/Elasticsearch",
      "on_success": "p2p-complete"
    }
  ],
  "bfa_entities": ["project_milestone", "billing_document", "revenue_recognition", "cost_settlement"],
  "bfa_events": ["milestone.completed", "billing.created", "revenue.recognized", "project.settled"],
  "conflict_rules": ["CF-173", "CF-182", "CF-183", "CF-184", "CF-188"]
}
```

---

### Template 24: fin-treasury-cash-v1 (FIN-05)

```json
{
  "flow_id": "fin-treasury-cash-v1",
  "flow_name": "Treasury & Cash Management",
  "version": "1.0",
  "description": "Cash Forecast → Payment Proposal → Dual Approval → Bank Execution → EP-4 Wait → Settlement Callback → Reconciliation",
  "entry_task": "T157",
  "steps": [
    {
      "step_id": "treas-saga-entry",
      "task_type": "T157",
      "factory": "F386+F425+F424+F419",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "treas-cash-forecast"
    },
    {
      "step_id": "treas-cash-forecast",
      "task_type": "T157",
      "note": "Cash position check sub-step",
      "factory": "F407:ICashForecastService",
      "fabric": "DATABASE_FABRIC/Elasticsearch",
      "on_success": "treas-payment-run"
    },
    {
      "step_id": "treas-payment-run",
      "task_type": "T162",
      "factory": "F395:IAPPaymentService + F406:IPaymentRunService + F411:ITreasuryWorkflowService + F408:IBankReconciliationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4)+PostgreSQL + BANK_CONNECTIVITY_FABRIC/configured + QUEUE_FABRIC",
      "on_success": "treas-bank-reconciliation",
      "on_failure": "treas-payment-failed",
      "wait_state": "WAITING_BANK_EVENT",
      "idempotency_key": "{{tenant_id}}.payment_run.{{run_id}}.v1"
    },
    {
      "step_id": "treas-bank-reconciliation",
      "task_type": "T161",
      "factory": "F408:IBankReconciliationService + F405:IBankStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "treas-gl-validation"
    },
    {
      "step_id": "treas-gl-validation",
      "task_type": "T163",
      "factory": "F384+F386+F418",
      "fabric": "DATABASE_FABRIC",
      "on_success": "treas-complete"
    }
  ],
  "bfa_entities": ["payment_run", "bank_statement", "bank_reconciliation", "treasury_payment"],
  "bfa_events": ["payment.run.created", "payment.executed", "payment.settled", "bank.statement.received"],
  "conflict_rules": ["CF-173", "CF-177", "CF-179", "CF-188", "CF-189"]
}
```

---

## DESIGN DECISIONS DD-61–DD-70

### DD-61: EP-4 Durable Saga as Finance Backbone
**Decision:** ALL finance flows (FIN-01 through FIN-05) MUST use EP-4 (Durable Saga) as
the execution backbone. No finance flow uses synchronous HTTP orchestration.
**Rationale:** Finance flows can pause for days (payment approval, period close sign-off, bank settlement).
HTTP-based orchestration cannot survive process restarts. EP-4 provides durable, replay-safe execution.
**Alternatives considered:** Temporal.io (external dependency — rejected: fabric-first requires
swappable runtime), Choreography only (rejected: no reliable wait state for human approvals).

### DD-62: FREEDOM Config for All Finance Business Rules
**Decision:** ALL thresholds (match tolerance, reconciliation gap, approval timeout, quota limits)
MUST be stored in Elasticsearch FREEDOM index, not in code or fixed config files.
**Rationale:** Finance business rules change frequently (different tenants, different risk policies,
regulatory updates). Code changes require deployments; FREEDOM changes are instant.
**Enforcement:** AF-9 rejects generated services with hardcoded threshold numbers.

### DD-63: AI Commentary as Optional Finance Enhancement
**Decision:** AI-generated financial statement narrative (F421.GenerateStatementCommentaryAsync)
is OPTIONAL and consent-gated. Financial data goes to AI ENGINE FABRIC only if tenant
has explicitly enabled ai_commentary_enabled=true in FREEDOM config.
**Rationale:** Financial data is sensitive. Not all tenants consent to AI processing.
Fabric-first means the provider can be swapped; consent controls WHEN the fabric is invoked.
**Privacy impact:** Financial statement figures never included in AI prompt without consent flag.

### DD-64: Bank Connectivity Fabric Abstraction Level
**Decision:** BANK CONNECTIVITY FABRIC (Skill 10) abstracts at the PROTOCOL level, not the BANK level.
Providers: ISO 20022, SWIFT, OpenBanking, Plaid, Mock.
A single tenant CAN have multiple bank accounts using different protocols simultaneously.
**Rationale:** Enterprise finance tenants use multiple banks. Each bank may use a different protocol.
Provider selection is per-bank-account, not per-tenant.
**Implementation:** FactoryResolutionContext includes bank_account_id → resolves to correct provider.

### DD-65: Double-Entry Enforcement at Task-Type Level
**Decision:** T163 (Double-Entry Validation Gate) is a MANDATORY intermediate step in ALL
finance flow templates that include GL posting. It is NOT an optional validation.
**Rationale:** Unbalanced GL postings are a catastrophic accounting error. Pre-flight
validation prevents data corruption that would require manual correction.
**Template rule:** AF-9 validates every finance template includes T163 before any PostToGLAsync step.

### DD-66: Period Lock Scope Definition
**Decision:** EP-5 Period Lock Registry scope key = tenant_id + legal_entity_id + ledger_id + fiscal_period.
A lock on one scope MUST NOT affect any other scope.
**Rationale:** Multi-entity tenants (parent company + subsidiaries) close periods on different schedules.
Shared-scope locking would serialize all entity closes unnecessarily.
**Implementation:** EP-5 uses composite key hash(tenant_id + entity_id + ledger_id + period) as lock key.

### DD-67: SoD Enforcement at Code Generation Time + Runtime
**Decision:** SoD is enforced at TWO layers:
  1. CODE GENERATION TIME: AF-7 (Compliance) rejects generated services without SoD checks
  2. RUNTIME: F419.ISoDValidationService called at every role assignment
**Rationale:** Code-generation-time enforcement prevents developer bypass; runtime enforcement
prevents configuration bypass. Both layers required for finance-grade internal controls.
**Exception:** Read-only operations (GET, search, report) are exempt from SoD (no data mutation).

### DD-68: Compensation-Only Corrections for Posted Documents
**Decision:** Once a financial document is POSTED (status = POSTED), it is IMMUTABLE.
ALL corrections MUST be new documents (credit memo, reversal journal entry, void payment).
Direct update or delete of posted documents is a BUILD FAILURE condition.
**Rationale:** Double-entry accounting integrity requires a complete audit trail of all
transactions, including corrections. Mutation destroys the audit chain.
**Enforcement:** T163 IRON RULE IR-163-4. AF-7 validates no update/delete on posted docs.

### DD-69: Multi-Tenant Finance Isolation Tier Migration Path
**Decision:** Tenants CAN migrate between isolation tiers (POOLED → BRIDGE → SILO) via a
finance DBA-only operation. Migration requires:
  1. Period must be CLOSED_LOCKED (no active sagas)
  2. Full data export + re-import under new tier
  3. New tenant_id registration with MT Isolation Fabric (Skill 11)
  4. Old tenant_id decommissioned after validation
**Rationale:** Enterprise tenants sometimes outgrow shared isolation as compliance requirements
increase. Migration path prevents vendor lock-in to initial tier choice.
**Implementation:** T166 (Tenant Provision Gate) handles new registration; F424.DecommissionTenantAsync handles old.

### DD-70: Financial Statement AI Commentary Data Boundary
**Decision:** AI ENGINE FABRIC (SK-386 (AiDispatcher)) receives ONLY computed aggregates (variance %, YoY change %)
for commentary generation — NEVER individual transaction records, vendor names, customer names.
**Rationale:** Individual transaction data is PII/commercially sensitive. Aggregate trends are
sufficient for AI-generated narrative and carry lower privacy risk.
**Data minimization:** F421.GenerateStatementCommentaryAsync pre-processes to aggregates before
calling IAiProvider.GenerateAsync(). AF-8 (Security) validates this data boundary.

---

## DESIGN RECORDS CROSS-REFERENCE

| DR | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DR-50 | Immutable Finance Audit Trail | F418 | AF-7, T163 IR-163-8, DD-68 |
| DR-51 | Fiscal Period Scope on Every Query | F386, all posting factories | DNA-5 extension, T161 IR-161-6 |
| DR-52 | Compensation-Only Error Handling | F391, F398, F412, F409 | AF-7, DD-68 |
| DR-53 | SoD Four-Role Separation for Payments | F395, F406, F411 | DNA-9, CF-188, DD-67 |
| DR-54 | Fabric-First Bank Connectivity | F405, F406, F408, F409 | AF-8, T162 IR-162-1 |
| DR-55 | Three-Way Match Tolerance as FREEDOM | F391, F392, F393 | AF-9, T158 QG-158-5, DD-62 |
| DR-56 | Multi-Tenant Finance Isolation Tiers | F424, T166 | AF-7, DD-69 |
| DR-57 | Revenue Recognition Gate Mandatory | F400, F398 | T164 IR-164-1, CF-182, DD-65 |

---
## SAVE POINT: P5-INDEX ✅
## NEXT: 13-finance_MASTER_EXECUTION_PLAN_F11.md + SESSION_STATE

## RENUMBERING NOTE
FLOW-13 unified source index originally DD-38-DD-50. Renumbered: DD+23, F+96, T+54, SK+35, DR+21, CF+77.

## SAVE POINT: FLOW-13:MERGE:P5 ✅
## Phase 5 COMPLETE: DD-61–DD-73, Concept Map FLOW-13, SK-79–SK-88

---

# ═══════════════════════════════════════════════════════
# FLOW-14: DATA WAREHOUSE & INTEGRATION ENGINE — DESIGN DECISIONS
# DD-74–DD-85 (12 decisions) + DR cross-reference
# ═══════════════════════════════════════════════════════

---

### DD-74: Warehouse Storage Target — Hybrid PostgreSQL + Elasticsearch
**Decision:** Core warehouse (staging, dims, facts, marts) uses PostgreSQL via DATABASE FABRIC.
Raw zone uses Elasticsearch for schema-flexible append-only JSON. Lineage + search indices in ES.
**Rationale:** PG provides SQL analytics, RLS policies, SCD-2 with ACID guarantees. ES provides
schema-free ingestion for heterogeneous source data. Both accessed via DATABASE FABRIC — swap
any time via config.
**Alternatives considered:** Snowflake (external dependency — rejected: fabric-first),
All-ES (rejected: no native RLS, no ACID for dim versioning), All-PG (rejected: rigid schema
for raw zone where source formats are unpredictable).

### DD-75: Ingestion Orchestration — Dual Mode (Poll + Webhook)
**Decision:** Both polling (T168) and webhook (T169) ingestion modes supported simultaneously
per connector. Polling handles scheduled/backfill. Webhooks handle near-real-time events.
**Rationale:** ClickUp and Zoho both support webhooks AND REST APIs. Webhooks provide immediacy
polling provides completeness (gap filling). Dual mode gives maximum freshness with guaranteed
consistency.
**Coordination:** CF-203 prevents backfill/sync overlap. Webhook events use same raw landing
(F438), same source object map (F440), same dedup logic.

### DD-76: Raw Zone Format — Immutable JSON, Monthly Partitioned
**Decision:** Raw zone records are append-only JSON in ES, partitioned by
raw_{tenantId}_{provider}_{entityType}_YYYYMM. Records NEVER updated or deleted (DR-58)
except via retention policy after expiry.
**Rationale:** Immutability enables replay (F441), audit trail, debugging, and gap detection.
Monthly partitions enable efficient retention cleanup and index lifecycle management.
**Enforcement:** AF-7 rejects any UpdateDocument/DeleteDocument call targeting raw zone indices.

### DD-77: Identity Resolution Approach — Probabilistic with Human Review
**Decision:** Cross-system identity resolution uses weighted probabilistic scoring (DR-61), NOT
deterministic exact-match. High-confidence auto-merge, low-confidence human review queue.
**Rationale:** External SaaS systems have inconsistent user data. Exact email match catches ~60%
of cases; probabilistic scoring with name fuzzy, org membership, temporal overlap catches 85%+.
Human review handles the remaining ambiguous cases.
**Alternatives considered:** Deterministic email-only (rejected: too many false negatives —
users have multiple emails), MDM vendor integration (rejected: external dependency, fabric-first).

### DD-78: Mart Refresh Strategy — Incremental with Full Rebuild Option
**Decision:** Default mart refresh is incremental (process only facts since last refresh timestamp).
Full rebuild available as admin-triggered operation for schema changes or data corrections.
**Rationale:** Incremental refresh is O(new facts) vs O(all facts) for full rebuild. For tenants
with millions of facts, full rebuild can take hours; incremental takes minutes.
**Implementation:** F451.RefreshMartIncrementalAsync (default) vs F451.RebuildMartFullAsync (admin).
AF-9 validates incremental refresh covers all facts since last refresh — no gaps (QG-174-4).

### DD-79: External API Authentication — OAuth 2.0 + PAT Dual Support
**Decision:** Connectors support BOTH OAuth 2.0 (authorization code flow) and Personal Access
Tokens (PAT). OAuth preferred for production; PAT supported for development/testing.
**Rationale:** Enterprise customers typically use OAuth with admin consent. Developers and small
teams prefer PAT for quick setup. Both stored encrypted in F427 vault.
**Provider specifics:** ClickUp supports both. Zoho supports OAuth (PKCE) and server tokens.
Token type is FREEDOM config per connector instance.

### DD-80: Rate Limit Strategy — Centralized Per-Token Sliding Window
**Decision:** Rate limiting centralized in F430 (IRateLimitGuardService) using sliding window
per (tenantId, connectorId, tokenId). Per-provider rules: ClickUp = per-token per-minute,
Zoho = credit-based with concurrency cap. All connectors call F430 — none implement own rate logic.
**Rationale:** Centralized rate limiting prevents noisy-neighbor (one connector exhausting quota
for all), provides single observability point, and enables fair distribution across tenants.
**Enforcement:** CF-210 (rate limit before every external call). AF-7 rejects services that
make external HTTP calls without prior F430.CheckAsync.

### DD-81: Schema Drift Handling — Tiered Auto-Accept/Admin-Gate per Zone
**Decision:** Schema drift response varies by zone (DR-60): raw + staging = auto-accept new fields,
mart = admin-gate for FIELD_ADDED, quarantine for FIELD_REMOVED and TYPE_CHANGED at all zones.
**Rationale:** Raw/staging benefit from flexibility (new fields don't break ingestion). Mart layer
has downstream consumers (KPIs, dashboards) that depend on stable schema. Admin gate prevents
surprise breakage.
**Alternatives considered:** Always auto-accept (rejected: breaks KPI formulas), Always admin-gate
(rejected: blocks ingestion for harmless new fields), Reject unknown fields (rejected: data loss).

### DD-82: Cross-System Time Alignment — UTC Storage with EP-5 Fiscal Mapping
**Decision:** ALL timestamps in warehouse stored as UTC. Display timezone is a presentation
concern, never stored. Fiscal period mapping uses FLOW-13 EP-5 IFiscalCalendarService.
**Rationale:** UTC eliminates timezone ambiguity in multi-timezone organizations. ClickUp stores
UTC natively; Zoho stores in user timezone (converted during T171 normalization). EP-5 maps
UTC dates to fiscal periods for financial analytics.
**Implementation:** F448 (ITimezoneNormalizerService) converts all source timestamps to UTC
during raw→staging transform (T171). F386 resolves UTC date → fiscal period.

### DD-83: Reverse ETL Trigger — Threshold-Based via QUEUE FABRIC
**Decision:** Reverse ETL activation uses threshold-based triggers (metric > threshold →
event to QUEUE FABRIC → consumer pushes to external SaaS). NOT scheduled batch push.
**Rationale:** Threshold-based activation is reactive (push only when action needed) vs scheduled
(push everything on a timer, even if nothing changed). Reduces unnecessary external API calls,
enables near-real-time alerts, respects rate limits via F430.
**DR-64:** All pushes via QUEUE FABRIC event, never direct HTTP from threshold evaluator.
**Alternatives considered:** Scheduled batch export (rejected: latency + wasted API calls),
Direct HTTP push (rejected: no DLQ, no retry, no audit, breaks DR-64).

### DD-84: PII Handling — Classify Before Mart, Mask Per Tenant Config
**Decision:** Every record classified for PII by F462 before entering mart layer (DR-63).
Masking strategy (HASH/REDACT/TOKENIZE/EXCLUDE) is FREEDOM config per tenant per field type.
**Rationale:** PII handling requirements vary by regulation (GDPR, CCPA) and by tenant data
sensitivity preference. Classification is mandatory; masking strategy is configurable.
**AI + Rule hybrid:** F462 uses regex rules for known patterns (email, phone, SSN) + LLM semantic
detection for context-dependent PII (e.g., free-text fields mentioning addresses). AI ENGINE FABRIC
call is tenant-consent-gated (similar to DD-63 for finance AI commentary).

### DD-85: Backfill Strategy — Date-Range Slicing with EP-4 Saga
**Decision:** Historical backfill uses date-range slicing: divide total range into configurable
day-size slices (FREEDOM), each slice is an EP-4 saga step with checkpoint. Crash recovery
resumes from last completed slice.
**Rationale:** Full-range backfill is too large for single API call and too risky for single
saga step. Slicing enables: progress tracking, crash recovery at slice boundary, rate limit
distribution across time, gap detection per slice.
**Peak blackout:** CF-212 prevents slice dispatch during peak hours (FREEDOM config per tenant).
**Alternatives considered:** Single API dump (rejected: not supported by ClickUp/Zoho APIs),
Streaming export (rejected: no API support), Full-range saga without slicing (rejected: no
intermediate recovery points, single failure = restart entire backfill).

---

## DESIGN DECISIONS CROSS-REFERENCE

| DD | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DD-74 | Hybrid PG + ES Storage | F438, F444, F449-F453 | DATABASE FABRIC, AF-7 |
| DD-75 | Dual-Mode Ingestion | F432, F434, F435 | T168, T169, CF-203 |
| DD-76 | Immutable Raw Zone | F438, F441 | DR-58, AF-7 |
| DD-77 | Probabilistic Identity | F446, F440, F449 | DR-61, CF-204, T175 |
| DD-78 | Incremental Mart Refresh | F451, F454, F455 | T174, QG-174-4 |
| DD-79 | OAuth + PAT Dual Auth | F427, F428 | T167, CF-198 |
| DD-80 | Centralized Rate Limit | F430 | DR-59, CF-210, AF-7 |
| DD-81 | Tiered Schema Drift | F439, F445, F451 | DR-60, CF-195, T172 |
| DD-82 | UTC + EP-5 Fiscal | F448, F386 | T171, FLOW-13 EP-5 |
| DD-83 | Threshold Reverse ETL | F456, F459 | DR-64, CF-213, T177 |
| DD-84 | PII Classify + Mask | F462, F451 | DR-63, CF-207, T174 |
| DD-85 | Date-Range Backfill | F436, F434, F430 | EP-4, CF-212, T170 |

---


---

## POST-FLOW-14 UNIFIED SOURCE INDEX TOTALS
```
Design Decisions: DD-1–DD-85 (85 total, +12)
  DD-74-DD-85: Data Warehouse (storage, ingestion, raw format, identity, mart refresh,
               auth, rate limit, schema drift, time alignment, reverse ETL, PII, backfill)
  Next: DD-86+ (FLOW-15)
```

## SAVE POINT: FLOW-14:MERGE:P5 ✅
## Phase 5 COMPLETE: DD-74–DD-85, DR-58–DR-65 cross-reference

---

# PART 5 — DESIGN DECISIONS DD-86–DD-96

### DD-86: Workspace as First-Class Container
Apps live inside workspaces. Workspaces are the billing and collaboration boundary. This aligns with Lovable's project model and enables multi-app scenarios.

### DD-87: NLP Spec Uses Multi-Model Consensus
Spec generation dispatches to 3+ AI models (like T85 research consensus) because spec quality directly determines scaffold quality. Single-model spec = single point of failure for entire app generation.

### DD-88: Visual Editor State Split (Redis + ES)
Redis for real-time cursor/collaboration (low latency), ES for persistent editor state (durable). This split mirrors FLOW-08 conversation session pattern.

### DD-89: Template Scoring is AI-Assisted, Not Rule-Based
Human-defined scoring rules cannot capture template quality nuances. AI scoring via AI ENGINE FABRIC enables dynamic quality assessment that improves with feedback.

### DD-90: Scaffold Generation Follows AF-7/8/9 Triple Gate
All generated code passes compliance (AF-7), security (AF-8), and quality (AF-9) before promotion. No shortcut path. This is the engine's judgment pipeline applied to scaffold output.

### DD-91: Preview Slots Use EP-2 Durable Timer for TTL
Preview TTL managed by EP-2 (durable timer) — survives service restarts. Same pattern as T89 rollback window. Prevents orphaned preview resources.

### DD-92: GitHub Sync Cursor in PostgreSQL
Sync cursor stored in PG (not Redis) because cursor loss = re-sync entire repo. PG provides ACID durability. Redis cache is for performance, not correctness.

### DD-93: Plugin Sandbox Uses Container Isolation
Plugin code runs in sandboxed containers with CPU/memory limits. Managed primitives accessed through proxy (never direct). This prevents plugin code from accessing host resources.

### DD-94: Discussion Threads Linked to Spec Versions
Discussion threads reference specific spec version IDs, so context is preserved even after spec changes. This enables "what were we discussing when the spec looked like X?" queries.

### DD-95: Billing Webhooks Must Be Idempotent
Payment provider webhooks can be replayed. Idempotency key per event prevents float-processing. Same pattern as FLOW-08 F256 (ManagedPaymentsService) idempotency.

### DD-96: Code Export Strips Fabric Code
Exported code replaces fabric interfaces with direct SDK calls for standalone use. This means the exported app works without XIIGen infrastructure. Trade-off: exported apps lose swappability.

---

# PART 6 — DESIGN RECORDS DR-66–DR-72

### DR-66 — Workspace Provision Before App Creation (Order Dependency)
**Decision:** F466 workspace MUST exist before F467 can create an app. Workspace is the scope container.
**Rationale:** Workspace establishes the billing boundary, collaboration context, and quota enforcement. App creation without workspace = unscoped resource.
**Backward compatibility:** FLOW-08 builder sessions (F244) are separate from workspaces — no change to existing sessions.

### DR-67 — NLP Spec is Append-Only Diff Chain
**Decision:** Each NLP interaction produces a spec diff appended to the version chain. Specs are never overwritten in-place.
**Rationale:** Append-only enables rollback to any prior spec state. Aligns with DR-24 (immutable snapshots).

### DR-68 — Component Library is Global, Editor State is Tenant-Scoped
**Decision:** F479 component catalog is shared across all tenants (read-only). F478 editor state is tenant+app scoped.
**Rationale:** Components are reusable assets; editor state is private. Same pattern as plugin catalog (global) vs plugin config (tenant-scoped).

### DR-69 — Template Marketplace Ratings are Anonymous Aggregates
**Decision:** Individual ratings are tenant-scoped, but the aggregate score shown in marketplace is anonymous.
**Rationale:** Prevents rating manipulation by identifying individual raters. Aggregate only reveals trend.

### DR-70 — Sandbox Fork Uses Copy-on-Write
**Decision:** F502 sandbox fork does NOT duplicate all data. It creates sandbox-prefixed indices and uses CoW: reads check sandbox first then fall back to live.
**Rationale:** Full copy would be expensive for large apps. CoW minimizes storage while providing full isolation for writes.

### DR-71 — Subscription State Machine Has No Backward Transitions
**Decision:** Subscription can move: free→trial→paid→enterprise. No downgrade path below current tier within billing period.
**Rationale:** Downgrade mid-period complicates prorating and feature revocation. Downgrade takes effect at next billing period.

### DR-72 — GitHub Sync Conflicts Create Markers, Never Auto-Resolve
**Decision:** When the same file is changed both in app and in GitHub, F491 creates a conflict marker and halts sync for that file. It never auto-resolves.
**Rationale:** Auto-resolution risks data loss. User must explicitly choose which version to keep. This is safer than git's merge behavior for non-developer users.

---


---

# FLOW-15 P4B Design Decisions DD-97–DD-99 and Design Records DR-73–DR-75
(Sourced from FLOW15_P6_SKILLS_DD_DR.md)

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
--
### DD-97 — Plugin Sandboxes Use Container Isolation (Not Process)

**Decision:** F498 plugin sandboxes are implemented as container-level isolation (cgroups + namespaces) rather than process-level or language-level isolation.

**Rationale:** Container isolation provides the strongest guarantee against resource escape, filesystem access, and network leakage. Process-level isolation (like V8 isolates) is faster but doesn't prevent filesystem or network access without additional syscall filtering. Container isolation aligns with existing Kubernetes infrastructure (SK-379 (MicroserviceBase) MicroserviceBase) and provides measurable resource limits via cgroup metrics. The 30s default timeout and 256MB default memory limit are enforced at the container level, making them impossible to bypass from user-provided plugin code.

**Trade-off accepted:** Container startup (~1-3s) is slower than process-level (~50ms). Mitigated by pre-warming sandbox pools and keeping sandboxes warm between plugin actions (idle timeout = 5min). For interactive use cases, the first action pays the cold start; subsequent actions reuse the warm container.

**Backward compatibility:** No impact. F498 is a new factory. Existing tenant isolation (DNA-5, F260) is unchanged — plugins run inside existing tenant boundaries.

---

### DD-98 — Billing Uses Integer Cents (Never Floating Point)

**Decision:** All billing amounts across F505, F506, F507 use integer representations: cents for currencies, microcents (1 cent = 100 microcents) for sub-cent pricing. No floating-point arithmetic anywhere in the billing pipeline.

**Rationale:** IEEE 754 floating-point representation cannot exactly represent many float values (e.g., 0.1 + 0.2 ≠ 0.3). In a billing system processing millions of transactions, accumulated rounding errors lead to material discrepancies. Integer arithmetic is exact, predictable, and aligns with how payment providers (Stripe, Adyen) handle amounts internally. Using microcents for tiered pricing (e.g., $0.001 per API call = 100 microcents) avoids the need for floating-point even at sub-cent granularity.


---

# FLOW-15 P4C Design Decisions DD-100–DD-106 and Design Records DR-76–DR-82
(Sourced from FLOW15_P6C_SKILLS_DD_DR.md)

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

--
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


# ═══════════════════════════════════════════════════════════════════════════════
# FLOW-16 — GIANT SHOP MARKETPLACE DD-107–DD-115, DR-83–DR-88
# Date: 2026-02-27 | Integrated from 16-files with renumbering
# ═══════════════════════════════════════════════════════════════════════════════

# XIIGen UNIFIED SOURCE INDEX — FLOW-16 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after FLOW-15 section in UNIFIED_SOURCE_INDEX_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P4a ✅

---

## PRE-FLOW-16 INDEX STATE
```
Design Decisions: DD-1–DD-106  (FLOW-01 through FLOW-15)
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



---

# ═══════════════════════════════════════════════════════
# FLOW-17 — FREELANCER MARKETPLACE PLATFORM
# Design Decisions DD-116–DD-129 | Design Records DR-89–DR-98
# ═══════════════════════════════════════════════════════


---

## DESIGN DECISIONS: DD-116–DD-129

---

### DD-116 — Token Economy: Immutable Ledger vs Mutable Balance Field

```
DECISION:  Token wallet implemented as immutable ledger journal (SK-136 pattern)
           NOT as a mutable balance column

RATIONALE: Mutable balance is vulnerable to lost updates under concurrent retries.
           Immutable ledger + derived balance is the only pattern safe for distributed systems.
           Idempotency key on every spend = exactly-once guarantee regardless of retries.

ALTERNATIVES CONSIDERED:
  - Mutable balance column + optimistic lock: rejected — race condition window exists
  - Redis atomic DECR: rejected — not durable across restarts, not fabric-first

CONSEQUENCES:
  Balance query = aggregate over ledger (slightly slower, fully consistent)
  Audit trail = free (every spend logged with idempotency key)

FREEDOM CONFIG: token_cost_per_proposal, boost_multiplier (per tenant)
IRON RULES:  CF-277, CF-278 enforce this decision
```

---

### DD-117 — Escrow Model: Separate Ledger Service from State Machine

```
DECISION:  F606 IEscrowService manages state machine (FUNDED/RELEASED/etc)
           F607 IEscrowLedgerService manages immutable financial journal
           These are TWO separate factory interfaces, not one

RATIONALE: State machine and financial journal have different access patterns and
           consistency requirements. State machine must respond fast; ledger must be
           append-only with idempotency key constraint.
           Merging them creates coupling that makes ledger immutability harder to enforce.

ALTERNATIVES CONSIDERED:
  - Single EscrowService: rejected — mixing mutable state + immutable journal in one factory
    creates inconsistent DNA-1/DNA-3 enforcement surface

CONSEQUENCES:
  T236/T238/T241 always call both F606 and F607
  F606 state check before F607 journal entry (never journal before state validation)

ENFORCEMENT:  SK-137, SK-138, CF-271
```

---

### DD-118 — Dispute Atomicity: Hold Must Be Placed in Same Transaction as Dispute Creation

```
DECISION:  F616 dispute creation and F617 escrow hold placement are in ONE DB transaction.
           No separation, no async hold.

RATIONALE: A window between dispute creation and hold placement allows a concurrent release
           to escape (funds gone, dispute open). This is an existential correctness requirement.
           The atomic transaction is the only safe design (CF-275, ST-150).

ALTERNATIVES CONSIDERED:
  - QUEUE FABRIC event: dispute.opened → async hold: rejected — async = race condition window
  - Two-phase with compensate: rejected — hold failure after dispute creation = stuck state

CONSEQUENCES:
  F616 and F617 share same DB connection context for this operation
  QUEUE FABRIC event emitted AFTER transaction commits (outbox pattern)

ENFORCEMENT:  CF-275, IR-239-1
```

---

### DD-119 — KYC: External Vendor Routed Through AI ENGINE FABRIC

```
DECISION:  KYC document analysis (OCR, liveness) is treated as an AI ENGINE FABRIC call,
           not a hardcoded vendor SDK import.

RATIONALE: KYC vendor changes are common in regulated environments.
           Routing through IAiProvider.GenerateAsync() enables vendor swap via config.
           This is DNA-4 (MicroserviceBase) + fabric-first principle applied to identity verification.

ALTERNATIVES CONSIDERED:
  - Direct KYC SDK import: rejected — violates fabric-first, locks to one vendor
  - Separate "KYC Fabric": rejected — AI ENGINE FABRIC covers this via model selection config

CONSEQUENCES:
  F584 passes KYC document as base64 + prompt to IAiProvider
  KYC provider config: kyc_provider = "vendor_A_via_claude_tool" or custom model endpoint

FREEDOM CONFIG: kyc_provider_model, required_document_types, expiry_days
ENFORCEMENT:  IR-242-5
```

---

### DD-120 — Multi-Aggregate Correlation: Subject References on FlowInstance

```
DECISION:  FlowInstance carries subject_refs[] array linking all domain aggregates
           (Job, Proposal, Contract, Milestone, Dispute).
           All domain events include correlation_id for cross-service tracing.

RATIONALE: A marketplace contract flow spans 5+ domain aggregates across multiple services.
           Without explicit correlation, distributed traces are unreadable and
           "which dispute belongs to which milestone" requires expensive cross-service queries.

ALTERNATIVES CONSIDERED:
  - Denormalise all IDs into every event: rejected — fragile to schema additions
  - Graph DB for correlation (Neo4j): deferred — viable for analytics, not required for correctness

CONSEQUENCES:
  FlowInstance table has subject_refs JSONB column
  All domain events include correlation_id field (compatible with FLOW-14 F460 lineage tracker)

ENFORCEMENT:  SK-142, T236–T241 step definitions
```

---

### DD-121 — Work Diary Screenshots: External Reference Only, Never Inline

```
DECISION:  F611 stores screenshot as { screenshotRef: "object-store:# bucket/key" }
           Never stores base64 or binary inline in ES or PG.

RATIONALE: Inline binary in ES indices degrades search performance and index size dramatically.
           External object store handles binary efficiently.
           Privacy: object store can have separate access policies (signed URLs, expiry).

ALTERNATIVES CONSIDERED:
  - Base64 in ES metadata field: rejected — ES not designed for large binary
  - PostgreSQL BYTEA column: rejected — not fabric-first, locks to PG, huge row sizes

CONSEQUENCES:
  Separate access control layer on object store (signed URL expiry per F611 access check)
  Screenshot ref = opaque str — consuming service resolves via object store API

PRIVACY NOTE:  Access to screenshot ref must go through F611 which enforces CF-292 object-level auth

ENFORCEMENT:  CF-293, DR-93, IR-243-1
```

---

### DD-122 — Reputation: Score is Always Derived, Never Stored as Authoritative Value

```
DECISION:  F581 reputation score is recomputed from review_journal on each update.
           The ES profile index caches the computed score (mutable), but it is DERIVED.
           The review_journal is the single source of truth.

RATIONALE: Mutable reputation scores can be tampered with or drift from the review record.
           Immutable journal + derived score ensures the displayed score is always reconcilable.
           Audit: at any time, score can be recomputed from journal to verify integrity.

ALTERNATIVES CONSIDERED:
  - Store score as primary value, update on each review: rejected — no audit trail, corruption risk
  - Event sourcing with full replay: overkill — simple weighted average from journal is sufficient

ENFORCEMENT:  SK-144, IR-245-2, DR-96
```

---

### DD-123 — Auto-Release Timer: Durable TimerInstance, Not Polling

```
DECISION:  Milestone auto-release (when client does not respond within review window)
           is implemented as a durable TimerInstance entry, not a polling background job.

RATIONALE: Polling jobs are stateless — they don't know which milestones need checking.
           They scale poorly and produce N queries per poll interval.
           Durable timer = one record per pending action, fires exactly once, cancellable.

ALTERNATIVES CONSIDERED:
  - Cron job scanning milestone table: rejected — O(N) scan, race condition on cancellation
  - Redis TTL key: rejected — not durable across Redis restart

CONSEQUENCES:
  TimerInstance table: { fires_at, transition_key, deduplication_key UNIQUE }
  On client approval: TimerInstance.status = CANCELLED (prevents float-release)

ENFORCEMENT:  IR-238-4, IR-230-1, T238 step definition
```

---

### DD-124 — Proposal Ranking: AI Ranking via AI ENGINE FABRIC, Not Hardcoded Score Formula

```
DECISION:  F595 IProposalRankingService uses AI ENGINE FABRIC for relevance scoring
           when boost + signal weighting requires semantic understanding.

RATIONALE: Purely rule-based ranking degrades quickly as job descriptions become varied.
           AI-powered ranking (via AiDispatcher) enables relevance signals beyond keyword match.
           Config-driven model selection allows A/B testing ranking models.

FREEDOM CONFIG: ranking_model: "claude-sonnet", boost_weight: 0.3, recency_decay: 0.1
ENFORCEMENT:  F595 fabric resolution, SK-135
```

---

### DD-125 — Enterprise Compliance Gates: Stored as FREEDOM Config, Not Hardcoded

```
DECISION:  The list of required compliance gates per tenant is stored in Elasticsearch
           as FREEDOM configuration, not hardcoded in F601 or F625.

RATIONALE: Enterprise tenants have different compliance requirements (some need classification,
           some KYC only, some add jurisdiction-specific gates).
           Hardcoding would require code changes per enterprise customer.

CONSEQUENCES:
  F603.EvaluatePolicyAsync loads gate list from ES config per tenantId
  New gate = new ES document, no code deployment

ENFORCEMENT:  IR-242-2, CF-282, DD-125
```

---

### DD-126 — Contest Handover: Separate IP Transfer Service from Escrow

```
DECISION:  F630 IIPTransferService is a separate factory from F606 IEscrowService.
           Certification of IP ownership is a distinct domain from financial escrow.

RATIONALE: IP transfer may have its own legal/compliance requirements independent of payment.
           Separating them allows IP transfer to be enhanced (digital signatures, blockchain ref)
           without changing escrow logic.

CONSEQUENCES:
  T244 calls F597 → F630 → F606 in sequence (IP transfer certify before escrow release)
  F630 record is permanently immutable after CERTIFIED status

ENFORCEMENT:  CF-283, IR-244-1, SK-143
```

---

### DD-127 — Notifications: Reuse FLOW-10 Notification Patterns via F621

```
DECISION:  F621 INotificationService extends/reuses FLOW-10 notification fabric patterns
           rather than building a new notification service from scratch.

RATIONALE: FLOW-10 (F288+) already established notification patterns.
           Building parallel notification infrastructure creates CF-289 conflict risk.
           AF-4 RAG check verifies no duplicate implementation before generating F621 code.

CONSEQUENCES:
  AF-4 MUST search SK-44–SK-55 (FLOW-10 skills) before generating F621 code
  F621 adds marketplace-specific notification types (proposal.received, dispute.opened)
  to existing notification template registry

ENFORCEMENT:  CF-289, IR-245-3 (see AF-4 cross-reference in SK-133-SK-144)
```

---

### DD-128 — Audit Log Compatibility with FLOW-14 DWH

```
DECISION:  F626 IAuditLogService audit event schema is designed to be compatible with
           FLOW-14 F459 IWarehouseAuditService for downstream warehousing.

RATIONALE: Enterprise reporting (T246) relies on DWH analytics.
           Incompatible schemas break F459 ingestion (CF-290).
           Shared event envelope format (tenantId, actorId, action, target, timestamp, correlationId)
           enables zero-transform DWH ingestion.

CONSEQUENCES:
  F626 emits events to QUEUE FABRIC using the F459-compatible schema
  F459 subscribes and ingests without transformation

ENFORCEMENT:  CF-290, DR-98
```

---

### DD-129 — Multi-Tenant Work Diary Isolation: Bridge Model Inherited from FLOW-08

```
DECISION:  Work diary isolation follows the bridge model established in FLOW-08:
           most tenants share schema with RLS enforcement.
           Enterprise tenants can graduate to schema-per-tenant via isolation binding.

RATIONALE: Work diary contains privacy-sensitive evidence — isolation is critical.
           Re-implementing tenant isolation in FLOW-17 would duplicate FLOW-08 patterns.
           Bridge model + FLOW-08 MT ISOLATION FABRIC handles this uniformly.

CONSEQUENCES:
  F611 uses MT ISOLATION FABRIC (Skill 11) for all work diary queries
  Enterprise tenants can have dedicated schema for work diary data

ENFORCEMENT:  DNA-5, FLOW-08 tenant model, SK-140
```

---

## DESIGN RECORDS: DR-89–DR-98

---

### DR-89 — Immutable Escrow Ledger with Idempotency Key as Primary Safety Mechanism

```
DECISION:  All escrow movements are journaled in an append-only table.
           Idempotency key is the UNIQUE constraint at DB level — not application-level check.

RATIONALE: Application-level idempotency checks can fail under concurrent retry.
           DB-level UNIQUE constraint on idempotency_key is the only race-condition-safe guarantee.
           Without this, a network timeout + retry can create duplicate ledger entries.

IRON RULES DERIVED:
  IR-236-1, IR-238-2, IR-241-1, IR-244-4, CF-272
```

---

### DR-90 — Token Wallet: Same Idempotency Pattern as Escrow Ledger

```
DECISION:  F585 token wallet uses identical DB-level idempotency pattern to F607 ledger.
           UNIQUE(userId, idempotencyKey) on token_ledger table.

RATIONALE: Token spend under retry should never float-deduct.
           Same pattern proven by escrow ledger (DR-89) — apply universally to any money/credit operation.

IRON RULES DERIVED: CF-277, CF-278, SK-136
```

---

### DR-91 — Audit Log: DB-Level Append-Only Enforcement (No DELETE Grant on Role)

```
DECISION:  F626 audit log table has NO DELETE or UPDATE grant on the application DB role.
           Enforced at DB GRANT level, not just application code level.

RATIONALE: Application-code-only enforcement can be bypassed by bugs or malicious code.
           DB-level grant revocation is the only guarantee.
           Required for enterprise compliance and dispute defensibility.

IRON RULES DERIVED: CF-271 (extended to audit), ST-163, IR (DR-91)
```

---

### DR-92 — KYC Expiry: Durable Timer on All Verification Records

```
DECISION:  Every F584 KYC verification record has a durable TimerInstance for expiry.
           Timer fires kyc.expired event, which triggers T242 re-evaluation.

RATIONALE: KYC verifications expire (typically 12 months).
           Without expiry enforcement, a verified KYC from 2 years ago could unblock contract activation.
           Durable timer = deterministic, single-fire, cancellable on renewal.

IRON RULES DERIVED: CF-284, IR-242-1
```

---

### DR-93 — Screenshot Storage: External Object Reference Mandatory

```
DECISION:  Work diary screenshots MUST be stored as opaque external object references.
           F611 ES document contains { screenshotRef: "objectstore:# ..." } only.

RATIONALE: Inline binary in ES degrades index performance dramatically.
           External object store + signed URL access provides both performance and privacy control.
           Signed URL expiry = automatic access revocation for evidence after retention period.

IRON RULES DERIVED: CF-293, IR-243-1, DD-121
```

---

### DR-94 — Deliverable Immutability: No Update After Submission

```
DECISION:  F613 deliverables are immutable after submission.
           UPDATE operations on deliverable records are blocked at application level.
           Reason: deliverables are legal evidence in disputes — tampering must be impossible.

IRON RULES DERIVED: IR-237-1, IR-499
```

---

### DR-95 — IP Transfer Certification: State Locked After CERTIFIED

```
DECISION:  F630 IP transfer records have a CHECK constraint: if current status = CERTIFIED,
           UPDATE is blocked. Enforced at DB level.

RATIONALE: IP transfer certification is a legal act. Post-certification mutation would
           undermine its legal standing and audit integrity.

IRON RULES DERIVED: IR-244-2, CF-283, SK-143
```

---

### DR-96 — Reputation Score: Always Recomputed from Journal, Never Patched

```
DECISION:  F581 reputation score in ES profile index is always replaced by a fresh computation
           from the review_journal. No incremental patch/update formula.

RATIONALE: Incremental patch formulas drift under concurrent reviews.
           Full recompute from immutable journal guarantees score = weighted avg of all reviews.
           Cost: acceptable (review journals are small per user).

IRON RULES DERIVED: IR-245-2, DD-122, SK-144
```

---

### DR-97 — Marketplace Flow Correlation: OpenTelemetry correlation_id on Every Event

```
DECISION:  All FLOW-17 domain events include correlation_id compatible with OpenTelemetry
           distributed tracing. Event envelope: { tenantId, correlationId, eventType, timestamp, payload }.

RATIONALE: A single contract flow spans 20+ events across 7 services.
           Without correlation, distributed trace reconstruction is impossible.
           OpenTelemetry compatibility ensures traces work with existing FLOW-14 observability stack.

IRON RULES DERIVED: DD-120, CF-290, T236–T241 event definitions
```

---

### DR-98 — Audit Schema Compatibility: FLOW-17 Events Must Match FLOW-14 DWH Schema

```
DECISION:  F626 audit events emitted to QUEUE FABRIC must satisfy the FLOW-14 F459 schema contract.
           Required fields: tenant_id, actor_id, action, target_type, target_id, timestamp, correlation_id.
           Any additional FLOW-17 fields are additive (backwards-compatible).

RATIONALE: Enterprise reports (T246) aggregate data from both FLOW-14 DWH and FLOW-17 audit.
           Schema incompatibility would break the F459 ingestion pipeline (CF-290).

ENFORCEMENT: CF-290, DD-128
```

---

## CONCEPT MAP FOR FLOW-17

```
MONEY SAFETY CHAIN:
  SK-136 (Token Ledger) → SK-137 (Escrow Saga) → SK-138 (Durable Ledger)
  → F585 → F606 → F607 → DR-89 → DR-90

COMPLIANCE CHAIN:
  SK-141 (KYC Gate) → T242 → T235 → CF-281/226
  → F584 → F601 → F603 → F625 → DR-92

EVIDENCE CHAIN:
  SK-140 (Work Evidence) → T243 → T237 → T240
  → F611 → F612 → F613 → F614 → DR-93 → DR-94

DISPUTE CHAIN:
  SK-139 (Dispute Hold) → T239 → T240 → T241
  → F616 → F617 → F618 → F619 → F620 → DR-91

REPUTATION CHAIN:
  SK-144 (Reputation) → T245
  → F581 → F586 → F589 → DR-96

MARKETPLACE CHAIN:
  SK-133 (Job Enrich) → SK-134 (Publish Gate) → SK-135 (Talent Match)
  → T227 → T228 → T229 → T230 → T231 → T232 → T233
  → F587 → F588 → F589 → F590 → F591 → F593 → F594 → F595
```

---

## BACKWARD COMPATIBILITY

```
DD-1–DD-85:    UNCHANGED ✅
DD-116–DD-129:   NEW in FLOW-17  (+14 decisions)

DR-1–DR-65:    UNCHANGED ✅
DR-89–DR-98:   NEW in FLOW-17  (+10 records)
```

---

## SAVE POINT: FLOW17:P5:UNIFIED_SOURCE_INDEX ✅
## Next: Load FLOW15_P6_MASTER_EXECUTION_PLAN

---

## MERGE:P5 STATE SAVE (FLOW-17)
```
MERGE:P5 = COMPLETE
Targets:
  UNIFIED_SOURCE_INDEX_MERGED.md → DD-116–DD-129 + DR-89–DR-98 appended
Added: DD-116–DD-129 (14 design decisions — FLOW-17)
Added: DR-89–DR-98 (10 design records — FLOW-17)
Key decisions: Token Economy as Immutable Ledger (DD-116), Escrow Separate from Ledger (DD-117),
  Saga Forward Recovery (DD-118), Dispute Atomic Hold (DD-119), Work Evidence References Only (DD-120)
System: DD-1–DD-129, DR-1–DR-98
Next: MERGE:P6 → MASTER_EXECUTION_PLAN_MERGED.md
```

## SAVE POINT: FLOW17:P5:UNIFIED_SOURCE_INDEX ✅


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-18 — UNIFIED SOURCE INDEX
# DD-130–DD-148 (19 decisions) | DR-99–DR-110 (12 records)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PRE-FLOW-18 STATE
```
Design Decisions: DD-1–DD-129
Design Records:   DR-1–DR-98
```

---

## DESIGN DECISIONS — FLOW-18 (DD-130 through DD-148)

| DD | Decision | Alternatives Considered | Rationale |
|----|----------|------------------------|-----------|
| DD-130 | Canvas state in ES (not relational DB) | PG with JSONB, MongoDB | ES offers full-text search + nested object querying + real-time indexing for complex DAG structures |
| DD-131 | Node palette backed by RAG search | Static palette, manual curation | 63+ skills and growing → dynamic discovery essential, RAG provides semantic matching |
| DD-132 | Edge conditions in JSON Logic (not CEL/JEXL) | CEL, JEXL, JavaScript expressions | JSON Logic is: sandboxable, parseable without runtime, serializable as Dictionary, portable |
| DD-133 | Multi-model code generation with consensus | Single model, sequential retry | Consensus reduces hallucination risk, catches model-specific bugs, improves quality |
| DD-134 | DNA validation as AST pattern matching | Regex-based, AI-only review | AST matching is deterministic (zero false negatives), fast, language-independent |
| DD-135 | Hot injection via QUEUE FABRIC event | Direct DB update, API call | Queue event allows: rollback, replay, audit trail, decoupled injection |
| DD-136 | Feature flag per injection (mandatory) | Optional flags, direct deploy | Mandatory flags ensure zero-risk deployment, canary support, instant rollback |
| DD-137 | Sandbox as ES index prefix isolation | Separate cluster, Docker containers | ES index prefix: zero infra overhead, instant creation, TTL via index lifecycle |
| DD-138 | AI-generated test data (not production copy) | Production data mask, manual fixtures | AI generation: zero PII risk, realistic distribution, schema-aware |
| DD-139 | CRDT over OT for collaboration | OT (Google Docs model), lock-based | CRDT: mathematical convergence guarantee, handles disconnected editing, no central server |
| DD-140 | Marketplace requires sandbox pass | Optional testing, manual review | Automated quality gate prevents broken flows from reaching marketplace |
| DD-141 | Fork lineage tracking (immutable) | No lineage, optional attribution | Immutable lineage: license compliance, upstream sync, community contribution tracking |
| DD-142 | Promotion ladder = 5 stages | 3 stages, direct deploy, AB test only | 5 stages (GENERATED→TESTED→INJECTED→MINIMAL→CORE) provides gradual confidence building |
| DD-143 | Canary via queue consumer group splitting | Load balancer rules, DNS routing | Queue splitting: fabric-native (no external infra), precise % control, instant adjustment |
| DD-144 | External git sync via generic HTTP | Octokit SDK, LibGit2, git CLI | Generic HTTP: fabric-first (no SDK import), works with any git provider, maintainable |
| DD-145 | UI fabric with platform config resolution | Multi-repo per platform, abstraction layer | Config resolution: single codebase, swap platform without code change, testable |
| DD-146 | DynamicController for ALL UI endpoints | Separate controllers per panel | DNA-6 mandate: DynamicController eliminates entity-specific controllers |
| DD-147 | Pattern mining feeds back to skill library | Manual skill creation only | Automated mining: discovers emergent patterns, reduces manual effort, self-improving |
| DD-148 | All generated services extend MicroserviceBase | Composition over inheritance | DNA-4 mandate: MicroserviceBase provides 19 components, consistency across all services |

---

## DESIGN RECORDS — FLOW-18 (DR-99 through DR-110)

| DR | Record | Impact | Enforcement |
|----|--------|--------|-------------|
| DR-99 | Canvas state in ES — nested DAG as Dictionary | F631, T247 | INV-18-7 |
| DR-100 | Node palette backed by RAG | F633, T248 | SK-146 |
| DR-101 | JSON Logic for edge conditions | F634, T249 | IR-249-2 |
| DR-102 | Generated code extends MicroserviceBase | F643, T251 | IR-251-1, DNA-4 |
| DR-103 | Sandbox ephemeral with TTL | F652, T255 | IR-255-3, CF-310 |
| DR-104 | Iron rule validation before registration | F644, F645, T251, T252 | IR-252-1, CF-302 |
| DR-105 | UI fabric resolves via config | F660, F641, T259 | INV-18-5, IR-259-1 |
| DR-106 | DynamicController for all UI | F660–F667, T259 | IR-259-2, DNA-6 |
| DR-107 | CRDT for collaboration | F669, T263 | IR-263-2, CF-322 |
| DR-108 | Marketplace requires sandbox pass | F674, T265 | IR-265-1, CF-326 |
| DR-109 | Promotion requires feature flag | F682, T267 | IR-267-2, CF-307 |
| DR-110 | Git sync via HTTP (no SDKs) | F692 | INV-18-6, DR-110 |

---

## CROSS-REFERENCE CHAINS — FLOW-18

```
CANVAS CHAIN:
  SK-145 (Canvas Init) → T247 → T249 → T250
  → F631 → F634 → F635 → F636 → DR-99

NODE INTELLIGENCE CHAIN:
  SK-146 (Node Intelligence) → T248 → T261
  → F637 → F638 → F639 → F640 → DR-100

CODE GENERATION CHAIN:
  SK-148 (Code Gen Pipeline) → T251 → T252 → T253 → T254
  → F643 → F644 → F645 → F646 → F650 → F651 → DR-102 → DR-104

SANDBOX CHAIN:
  SK-152 (Sandbox) → SK-153 (Execution) → SK-154 (Validation)
  → T255 → T256 → T257 → T258
  → F652 → F653 → F654 → F655 → F657 → F658 → F659 → DR-103

UI FABRIC CHAIN:
  SK-156 (UI Fabric) → T259 → T260 → T261
  → F660 → F661 → F662 → F663 → F664 → F665 → F666 → F667 → DR-105 → DR-106

COLLABORATION CHAIN:
  SK-159 (Collaboration) → SK-160 (CRDT) → T262 → T263 → T264
  → F668 → F669 → F670 → F671 → F672 → F673 → DR-107

MARKETPLACE CHAIN:
  SK-134 (Idempotent Publish — reused) → T265 → T266
  → F674 → F675 → F676 → F677 → F678 → F679 → F680 → DR-108 → DR-141

PROMOTION CHAIN:
  SK-150 (Injection & Promotion) → T267 → T268
  → F681 → F682 → F683 → F684 → F685 → F686 → F687 → DR-109 → DR-142

GIT CHAIN:
  T267 (promotion) → F688 → F689 → F690 → F691 → F692 → F693 → DR-110

SELF-IMPROVEMENT CHAIN:
  SK-148 (Code Gen) → F694 → F695 → F696 → AF-11
```

---

## BACKWARD COMPATIBILITY

```
DD-1–DD-129:    UNCHANGED ✅
DD-130–DD-148:  NEW in FLOW-18  (+19 decisions)

DR-1–DR-98:    UNCHANGED ✅
DR-99–DR-110:  NEW in FLOW-18  (+12 records)
```

---

## SAVE POINT: FLOW18:P5:UNIFIED_SOURCE_INDEX ✅
## Next: FLOW18:P6 → MASTER_EXECUTION_PLAN_MERGED.md

---

## MERGE:P5 STATE SAVE (FLOW-18)
```
MERGE:P5 = COMPLETE
Targets:
  UNIFIED_SOURCE_INDEX_MERGED.md → DD-130–DD-148 + DR-99–DR-110 appended
Added: DD-130–DD-148 (19 design decisions — FLOW-18)
Added: DR-99–DR-110 (12 design records — FLOW-18)
Key decisions: Canvas ES Storage (DD-130), Multi-Model Consensus (DD-133),
  CRDT over OT (DD-139), Mandatory Feature Flags (DD-136), Pattern Mining (DD-147)
System: DD-1–DD-148, DR-1–DR-110
Next: MERGE:P6 → MASTER_EXECUTION_PLAN_MERGED.md
```

## SAVE POINT: FLOW18:P5:UNIFIED_SOURCE_INDEX ✅


---

# ═══════════════════════════════════════════════════════════════════════════
# FLOW-19 — CI/CD & DevOps Control Plane — Design Decisions DD-149-DD-163
# ═══════════════════════════════════════════════════════════════════════════

## FLOW-19 CHANGELOG
| Date | Flow | DDs | DRs | Notes |
|------|------|-----|-----|-------|
| 2026-02-27 | FLOW-19 CI/CD & DevOps Control Plane | DD-149-DD-163 (+15) | DR-111-DR-121 (+11) | Catalog-as-code, namespace-per-PR, IaC fabric, config governance, DR drills non-negotiable, multi-tenant control plane |

## System State Update (Post FLOW-19)
Added: DD-149-DD-163 (15 design decisions — FLOW-19)
Cross-referenced: DR-111-DR-121 (in ENGINE_ARCHITECTURE)
System: DD-1-DD-163, DR-1-DR-121

---

## DESIGN DECISIONS — DD-149-DD-163

```
DD-149: Component Profile as YAML in Git (Backstage-style)
  CONTEXT: Need a "single source of truth" for all platform components.
  DECISION: Component descriptors stored as catalog-info.yaml in each repo.
            Ingested via Git webhook to ES catalog (F697). Not a UI-first form.
  RATIONALE: Git-native version history, PR review, branch-based drafts.
             Webhook-driven keeps catalog always current with code changes.
             Pattern aligns with Backstage entity descriptor approach.
  ALTERNATIVES REJECTED:
    - CMDB UI form entry: no version history, not co-located with code
    - Auto-discovery only: misses ownership/policy metadata
  IMPLICATIONS: Descriptor schema is versioned; F697 supports v1/v2 with migration.

DD-150: Namespace-per-PR as Default Ephemeral Isolation Tier
  CONTEXT: Multiple isolation options for ephemeral environments.
  DECISION: Default = K8s namespace per PR with ResourceQuota + NetworkPolicy.
            Cluster-per-PR is reserved for tier-1 sensitive only.
  RATIONALE: Namespace creation is near-instant vs cluster creation (~10 min).
             Combined with NetworkPolicy, isolation is sufficient for standard tier.
             Cost: namespace is free; cluster adds per-cluster overhead.
  ALTERNATIVES REJECTED:
    - Cluster-per-PR for all: too slow, too expensive
    - Single shared namespace: insufficient isolation
  IMPLICATIONS: DR-112 documents this. Naming: {tenant_id}-{env_type}-{pr_number}.

DD-151: IaC Provider Is a Fabric Implementation Detail
  CONTEXT: Platform must be IaC-provider-agnostic (Terraform, Pulumi, Crossplane).
  DECISION: IIaCRunnerService (F702) wraps IaC tool behind CORE FABRIC HTTP adapter.
            Engine-generated services never import IaC SDKs (DR-113).
  RATIONALE: Preserves vendor agnosticism — switching from Terraform to Crossplane
             is a config change, not a code rewrite.
  ALTERNATIVES REJECTED:
    - Direct Terraform SDK import: violates DNA-7, locks to provider
  IMPLICATIONS: A thin IaC API server (or exec wrapper) required per IaC tool.

DD-152: Compensation Plan Stored Before IaC Apply (EP-4 Pattern)
  CONTEXT: IaC apply can partially succeed, leaving orphaned cloud resources.
  DECISION: Before F702.ApplyAsync(), store compensation (destroy) plan in
            DATABASE FABRIC. If apply fails, compensation plan is always available.
  RATIONALE: Prevents orphaned resources. Compensation plan is the undo operation
             for each created resource. Aligns with EP-4 (cursor persist before advance).
  ALTERNATIVES REJECTED:
    - "Best effort cleanup on failure": unreliable, loses resource list on crash
  IMPLICATIONS: Every resource created in apply must be enumerable in compensation plan.

DD-153: ConfigBundle Contains Only Secret References, Never Values
  CONTEXT: Config resolution must be safe for storage and transmission.
  DECISION: F705 produces ConfigBundle with secret reference paths only.
            F706 validates reference existence. Applications resolve at runtime.
  RATIONALE: Prevents secret sprawl. Reduces blast radius of config store compromise.
             Aligns with vault-native secret lifecycle (rotation, revocation).
  ALTERNATIVES REJECTED:
    - Resolved secret values in ConfigBundle: catastrophic if config store compromised
  IMPLICATIONS: Applications must inject vault SDK at startup to resolve references.
                Engine cannot validate secret VALUE validity (DR-116).

DD-154: Policy Decisions as First-Class Artifacts with Obligations
  CONTEXT: Policy enforcement must be auditable and actionable.
  DECISION: F707 returns PolicyDecision{allow|deny, obligations[], reasoning}
            with full detail. PolicyDecisions are stored as audit events.
  RATIONALE: Obligations make policy decisions actionable (e.g., "route-to-local-only"
             is an obligation, not just a deny). Enables debugging and compliance review.
  ALTERNATIVES REJECTED:
    - Boolean allow/deny only: insufficient for ABAC obligation enforcement

DD-155: Readiness Report Is the Sole Promotion Gate
  CONTEXT: Multiple sources of evidence for deployment readiness.
  DECISION: A passing ReadinessReport (F719) is the ONLY gate for promotion.
            All evidence (config, smoke, integration, policy, drift) is aggregated.
  RATIONALE: Single gate eliminates "some gates are bypassed" problem.
             Immutable report provides audit trail per deployment.
  ALTERNATIVES REJECTED:
    - Multiple independent gates: can be bypassed individually under pressure
  IMPLICATIONS: DR-117 enforces this. F712 PromotionGateService hard-blocks without report.

DD-156: DR Drills Are Non-Negotiable and Evidence Is Immutable
  CONTEXT: DR drills are often deferred or faked.
  DECISION: Tier-1 components require passing drill evidence within 7 days for
            production promotion. Evidence stored in ES WORM — append-only.
  RATIONALE: Un-tested restores are un-tested DR. Immutability prevents evidence tampering.
             Aligns with 19-* document: "restore drills: non-negotiable".
  ALTERNATIVES REJECTED:
    - Voluntary drills: deferred under deadline pressure
    - Mutable evidence: can be "fixed" to show passing
  IMPLICATIONS: DR-118, DR-119 enforce this. T284 gate is mandatory for tier-1.

DD-157: W3C TraceContext for Cross-Service Trace Propagation
  CONTEXT: Control plane spans multiple services and environments.
  DECISION: F725 IOtelCollectorAdapterService propagates trace IDs using W3C traceparent.
            All FlowInstance and StepRun operations emit spans.
  RATIONALE: Vendor-agnostic; supported by all modern observability backends.
             Enables end-to-end trace from API request → worker → IaC runner → test suite.
  ALTERNATIVES REJECTED:
    - Proprietary trace headers: vendor lock-in

DD-158: Idempotency Keys Required on All Provisioning and Onboarding
  CONTEXT: Webhooks and retries cause duplicate processing.
  DECISION: Every "create" endpoint in FLOW-19 requires Idempotency-Key header.
            Dedup table with (key, source, expires_at) per operation type.
  RATIONALE: PR webhooks fire multiple times. Network retries during provisioning
             create duplicate environments/tenants without idempotency (DR-114).
  ALTERNATIVES REJECTED:
    - At-most-once delivery: unacceptable data loss risk

DD-159: Tenant Storage Isolation Follows Pool/Bridge/Silo Model
  CONTEXT: Different tenants have different isolation requirements.
  DECISION: Three isolation modes (FREEDOM config per tenant tier):
            - pooled: shared schema + RLS (standard tier)
            - schema: schema-per-tenant (premium tier)
            - db: database-per-tenant (enterprise/regulated tier)
  RATIONALE: Matches SaaS pool/bridge/silo pattern. Isolation can be upgraded
             (ITenantBindingResolverService F729 supports MigrateIsolationAsync).
  IMPLICATIONS: F729 binding resolver maps tenant_id → isolation mode at runtime.
                RLS enforced at DB level for pooled (PostgreSQL CREATE POLICY).

DD-160: Tenant Config Layering Uses FREEDOM Config
  CONTEXT: Tenants need customization without code forks.
  DECISION: Config priority order (global → tier → tenant → env override).
            Tenant overrides stored in ITenantConfigLayerService (F732).
            Feature flags stored alongside config for staged tenant activation.
  RATIONALE: Single codebase serves all tenants via config differentiation.
             Matches 19-MT document: "solve customization via config, not forks".
  IMPLICATIONS: Cache must be tenant+env scoped (CF-344). Never shared cache keys.

DD-161: Audit Logs Survive Tenant Offboarding (Regulatory Requirement)
  CONTEXT: Tenant offboarding includes data purge, creating tension with audit log retention.
  DECISION: Audit logs and DR evidence are owned by the control plane audit service,
            not the tenant data namespace. They are explicitly excluded from tenant purge.
  RATIONALE: Regulatory requirement (DR-120). Forensics access post-offboarding.
             Compliance audits may occur years after tenant leaves.
  IMPLICATIONS: F733 offboarding saga has explicit step: "preserve audit logs — DO NOT delete".

DD-162: Hallucination Drift Monitoring Feeds AF-11 Feedback Loop
  CONTEXT: RAG pipeline quality can degrade over time without detection.
  DECISION: F727 IHallucinationDriftService computes drift score continuously.
            Scores feed AF-11 (Feedback) to improve future code generation quality.
  RATIONALE: Closes the quality feedback loop. DNA pattern violations in generated
             code are caught early before reaching production.
  ALTERNATIVES REJECTED:
    - One-time quality check: misses drift over time

DD-163: Local-Sensitive Profile Enforces Zero External Egress
  CONTEXT: Some development scenarios require working with sensitive data locally.
  DECISION: local-sensitive environment profile enforces K8s NetworkPolicy with
            zero external egress (CF-343). Only local AI providers respond.
            Profile selection triggers policy evaluation T275 automatically.
  RATIONALE: Sensitive data must never leave local environment boundary.
             Network enforcement is more reliable than application-layer enforcement.
  ALTERNATIVES REJECTED:
    - Application-layer routing only: bypassable under bugs
  IMPLICATIONS: F704 ILocalK8sBootstrapService applies egress-deny NetworkPolicy
                when local-sensitive profile selected.
```

---

## CONCEPT MAP — FLOW-19

```
FLOW-19: CI/CD & DevOps Control Plane
├── CATALOG LAYER
│   ├── F697 Ingestion → F698 Profile → F699 Graph → F700 Query
│   ├── T269 Descriptor Gate → T270 Graph Refresh
│   └── Skills: SK-161, SK-162
│
├── ENVIRONMENT FACTORY
│   ├── F701 Provisioner → F702 IaC Runner → F703 Ephemeral → F704 Local
│   ├── T271 Request Gate → T272 IaC Saga → T273 TTL Expiry
│   └── Skills: SK-163, SK-164, SK-165
│
├── CONFIG & POLICY
│   ├── F705 Config Resolver → F706 Secret Validator → F707 Policy → F708 Config Version
│   ├── T274 Config Gate → T275 Policy Gate
│   └── Skills: SK-171, SK-172
│
├── PIPELINE CONTRACT
│   ├── F709 Contract → F710 Adapter → F711 Artifact Registry → F712 Promotion Gate
│   ├── T276 Contract Gate → T281 Promotion Ladder
│   └── Skills: SK-166
│
├── GITOPS & DEPLOY
│   ├── F713 GitOps → F714 Drift → F715 Health → F716 Manifest Renderer
│   ├── T277 Deploy+Smoke → T278 GitOps Gate → T279 Integration Orchestration → T280 Readiness
│   └── Skills: SK-167, SK-168
│
├── BACKUP & DR
│   ├── F721 Backup → F722 Restore Drill → F723 Evidence → F724 Sandbox
│   ├── T282 Backup Run → T283 Restore Drill Saga → T284 DR Evidence Gate
│   └── Skills: SK-169, SK-170
│
├── OBSERVABILITY & AUDIT
│   ├── F725 OTel → F726 Audit → F727 Hallucination Drift
│   └── Skills: SK-174
│
└── MULTI-TENANT CONTROL PLANE
    ├── F728 Registry → F729 Binding Resolver → F730 Onboarding →
    │   F731 Metering → F732 Config Layer → F733 Lifecycle
    ├── T285 Onboarding Saga → T286 Offboarding Saga
    └── Skills: SK-173
```

---

## FLOW-19 CROSS-FLOW DEPENDENCY MAP

```
FLOW-19 DEPENDS ON:
  FLOW-08 (F461 ITenantWarehouseIsolationService) → tenant isolation primitives
  FLOW-14 (F463 IRowLevelSecurityService) → RLS for pooled tenants
  FLOW-14 (F459 IWarehouseAuditService) → separate audit plane (CF-339)
  FLOW-05 (F176-F224) → gamification event contract tests in pipeline (CF-342)

FLOW-19 PROVIDES TO FUTURE FLOWS:
  F697 ICatalogIngestionService → any future flow can register as catalog component
  F726 IControlPlaneAuditService → available to all future flows for audit events
  F729 ITenantBindingResolverService → all future flows use for tenant routing
  ReadinessReport pattern (SK-168) → reusable by any flow with deployment steps
  DR Drill evidence pattern (SK-169) → reusable by any flow with critical data
```

---

## SAVE POINT: FLOW19:P4b:SOURCE_INDEX ✅
## Next: FLOW19_MASTER_EXECUTION_PLAN.md

---

## FLOW-19 CROSS-FLOW DEPENDENCY MAP

```
FLOW-19 depends on:
  FLOW-05 (Gamification):   CF-342 — pipeline must test FLOW-05 event contracts
  FLOW-08 (Payments):       CF-341 — tenant isolation uses FLOW-08 primitives (F461, F463)
  FLOW-14 (Warehouse):      CF-339 — audit planes separated; CF-340 — DR sandbox ≠ warehouse data

FLOW-19 extends:
  CORE FABRIC (SK-379 (MicroserviceBase)):   F701, F702, F704, F706, F710, F713, F718, F720, F725
  DATABASE FABRIC (SK-382 (ElasticsearchDatabase)): F697, F698, F699, F700, F701, F702, F703, F705, F707, F708,
                               F709, F711, F712, F714, F715, F717, F719, F721, F722, F723,
                               F724, F725, F726, F728, F729, F730, F731, F732, F733
  QUEUE FABRIC (SK-383 (RedisStreamQueue)):  F697, F703, F710, F712, F715, F717, F720, F721, F722, F724,
                             F730, F731, F733
  AI ENGINE FABRIC (SK-386 (AiDispatcher)): F707, F716, F727
  RAG FABRIC (SK-389 (HybridRagStrategy)):   F699
  FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)): Templates 56-58
```

## FLOW-19 CONCEPT MAP

```
                                  ┌──────────────────┐
                    Git Webhook → │ F697 Catalog      │ → ES Catalog Index
                                  │ Ingestion         │ → Profile Validated Event
                                  └───────┬──────────┘
                                          │
                                  ┌───────▼──────────┐
                                  │ F699 Dependency   │ → Neo4j Graph
                                  │ Graph             │ → Critical Path
                                  └───────┬──────────┘
                                          │
              ┌───────────────────────────▼──────────────────────────┐
              │                  PIPELINE FLOW                       │
              │                                                      │
    PR Open → │ F709 Contract → F705 Config → F707 Policy → F701 Env │
              │ Validation      Resolution    Evaluation    Request   │
              │                                                      │
              │ F702 IaC Saga → F713 GitOps → F717 Tests → F719 Report│
              │ (Compensation)  Sync+Drift    Smoke+Integ  Readiness │
              │                                                      │
              │ F712 Promotion Gate ← ReadinessReport + DrillEvidence │
              └──────────────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────▼──────────────────────────┐
              │                  DR DRILL FLOW                       │
              │                                                      │
    Schedule →│ F721 Backup → F724 Sandbox → F722 Restore → F723    │
              │ Run             Provision     Drill          Evidence │
              │                                                      │
              └──────────────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────▼──────────────────────────┐
              │              MULTI-TENANT CONTROL PLANE               │
              │                                                      │
              │ F728 Registry → F729 Binding → F730 Onboarding Saga  │
              │ F731 Metering → F732 Config   → F733 Lifecycle       │
              └──────────────────────────────────────────────────────┘
```

---

## BACKWARD COMPATIBILITY — Post FLOW-19

```
DD-1-DD-148: UNCHANGED ✅  (this file adds DD-149-DD-163 only)
DR-1-DR-110: UNCHANGED ✅  (DR-111-DR-121 in ENGINE_ARCHITECTURE)
FLOW-01 through FLOW-18: ALL INTACT ✅
```

## SAVE POINT: FLOW19:P5:UNIFIED_INDEX ✅



================================================================================
# FLOW-20 SOURCE INDEX — Sponsored Content + Graph API
# DD-164-DD-179 (16 design decisions) | DR-122-DR-133
# Merged: 2026-02-27
================================================================================

## Design Decisions: DD-164–DD-179 (16 decisions)

---

## DELTA FROM FLOW-14

| Artifact | Before | After | Delta |
|----------|--------|-------|-------|
| Factories | 465 | 575 | +110 |
| Families | 59 | 75 | +16 |
| Task Types | 178 | 198 | +20 |
| Flow Templates | 35 | 40 | +5 |
| BFA Rules | 213 | 237 | +24 |
| Stress Tests | 103 | 119 | +16 |
| Skills | 98 | 112 | +14 |
| Design Decisions | 85 | 101 | +16 |
| Design Records | 65 | 77 | +12 |

---

## DESIGN DECISIONS — DD-164 through DD-179

### DD-164 — Graph API Style: REST Graph Paths (Not GraphQL Public Surface)
```
DECISION:    Expose Graph API as REST-style graph paths (/{nodeId}/{edge}?fields=...)
             with server-side field projection rather than exposing GraphQL directly.
RATIONALE:   REST graph paths are simpler to version, quota, and audit-log per endpoint
             GraphQL execution is used internally in F742 QueryPlanner but not exposed.
ALTERNATIVES: GraphQL as public surface — rejected: schema introspection leaks object model
              rate limiting per-query is harder; persisted queries add management overhead.
ENFORCED BY: F735 (ApiVersionService), F736 (RequestNormalizerService), Template 59
AFFECTS:     T287, T288, T299, DR-122
```

### DD-165 — Permission Engine: Per-Node/Edge/Field, Not Per-Request
```
DECISION:    IPermissionDecisionService (F756) is called per node, per edge, and per field —
             not once per API request; partial results returned for partially-authorized responses.
RATIONALE:   Per-request authorization misses field-level privacy rules; OWASP BFLA/BOLA
             require granular checks; partial errors more informative than all-or-nothing.
ALTERNATIVES: Per-request single decision — rejected: misses field-level privacy; over-blocks.
ENFORCED BY: SK-175, SK-176, IR-287-2, CF-356
AFFECTS:     T287, T288, T299, DR-124
```

### DD-166 — Auction Architecture: Stateless Function, Redis-Only Hot State
```
DECISION:    IAuctionEngineService (F810) is a pure stateless function; all mutable state
             (pacing, frequency, budget) accessed exclusively through Redis in the auction path.
RATIONALE:   <50ms p99 latency budget cannot tolerate synchronous PG writes
             Redis INCR is atomic and fast; decoupled budget decrement via queue event.
ALTERNATIVES: Stateful auction with PG — rejected: lock contention at scale
              budget decrement in-path — rejected: latency budget violated (DR-127).
ENFORCED BY: DR-130, SK-178, IR-292-1, IR-292-5, CF-364, CF-365
AFFECTS:     T292, T293
```

### DD-167 — Targeting Consent: Blocking Gate, Not Async Filter
```
DECISION:    Consent check via F793 is a BLOCKING step before F787 targeting evaluation
             not an async post-filter on results.
RATIONALE:   Post-filter approach means targeting evaluation runs on non-consented users
             before filtering — privacy regulation requires consent-before-evaluation.
ALTERNATIVES: Async post-filter — rejected: evaluation still processes non-consented data.
ENFORCED BY: DR-128, SK-180, IR-292-3, CF-366
AFFECTS:     T292, T301
```

### DD-168 — Political Ad: Two-Gate Mandatory (Classifier + Verification)
```
DECISION:    Political ads require BOTH automated classifier (F803) AND explicit
             political verification service (F806); classifier alone is insufficient.
RATIONALE:   Classifier confidence is probabilistic; regulatory requirements for political
             ads demand explicit verification regardless of confidence score.
ALTERNATIVES: Classifier-only with high threshold — rejected: false negatives = regulatory violation.
ENFORCED BY: DR-129, SK-187, CF-367, IR-295-2
AFFECTS:     T295, T292
```

### DD-169 — Spend Ledger: Append-Only with Offset Corrections
```
DECISION:    All billing events are append-only; financial corrections use offset entries,
             never UPDATE/DELETE on billed records.
RATIONALE:   Append-only preserves audit trail; billing disputes require original events
             plus correction chain; financial compliance (SOC2, ISO 27001) requires immutable audit.
ALTERNATIVES: In-place corrections — rejected: destroys audit trail; billing dispute resolution impossible.
ENFORCED BY: DR-131, SK-181, CF-370, IR-294-4, IR-296-1
AFFECTS:     T293, T294, T296, T303
```

### DD-170 — Webhook HMAC: Mandatory on All Outbound Deliveries
```
DECISION:    All webhook deliveries from F764 include HMAC-SHA256 signature
             no delivery path exists without signing.
RATIONALE:   Unsigned webhooks allow spoofing; developer app cannot verify payload authenticity
             HMAC is industry standard (Stripe, GitHub, Shopify all require HMAC).
ALTERNATIVES: Optional HMAC per app config — rejected: security as opt-in = security theater.
ENFORCED BY: DR-125, SK-177, CF-358, IR-289-1
AFFECTS:     T289
```

### DD-171 — Payment Method: Tokenization-Only Storage
```
DECISION:    IPaymentMethodService (F773) accepts payment data and returns a tokenized
             reference; raw card data never persists in any service store.
RATIONALE:   PCI-DSS Level 1 compliance requires raw PAN to be out-of-scope
             tokenization delegates PCI scope to payment vault.
ALTERNATIVES: Encrypted PAN storage — rejected: still in-scope for PCI audit
              complexity without eliminating audit burden.
ENFORCED BY: DR-126, CF-361, IR-290-1
AFFECTS:     T290
```

### DD-172 — Tenant Resolution: Edge-Only, Trusted Context Propagation
```
DECISION:    Tenant identity resolved ONCE at API edge (F846) from validated token claims
             or subdomain; all internal services read tenantId from trusted scope context
             (never from user-supplied headers or request body).
RATIONALE:   User-supplied tenant = cross-tenant attack vector
             single resolution point = single enforcement boundary
             consistent with FLOW-08 tenant model (DR-65 extended to Graph+Ads).
ALTERNATIVES: Internal tenant re-resolution per service — rejected: attack surface multiplication.
ENFORCED BY: DR-133, SK-182, CF-374, IR-298-1
AFFECTS:     T287, T292, T298, all FLOW-20 task types
```

### DD-173 — Flow Spec Versioning: Immutable Snapshots
```
DECISION:    Published FlowVersion is an immutable snapshot; any change creates a new version
             published versions are never modified.
RATIONALE:   Incident replay, rollback, and audit require stable version history
             mutable specs make root cause analysis impossible.
ALTERNATIVES: In-place spec update — rejected: destroys version history.
ENFORCED BY: DR-132, CF-372, IR-297-2
AFFECTS:     T297
```

### DD-174 — Graph Traversal: Depth Limit via FREEDOM Config
```
DECISION:    Field projection depth limit (max nested traversal hops) is a FREEDOM config
             value per tenant/app tier; not hardcoded; violating requests get partial errors.
RATIONALE:   Fan-out amplification risk; different app tiers may have different depth allowances
             hardcoding = cannot evolve without code change.
ALTERNATIVES: Hardcoded depth limit — rejected: violates Freedom Machine philosophy.
ENFORCED BY: F734 (FREEDOM config), SK-185, QG-287-1, ST-208
AFFECTS:     T287, T299
```

### DD-175 — Multi-Model Auction Quality Score: Conservative on Divergence
```
DECISION:    When AF-5 multi-model quality scores diverge > 10%, AF-10 uses the lower
             (more conservative) score rather than average or maximum.
RATIONALE:   Optimistic score on divergence = potential overspend vs quality
             conservative approach protects advertiser value
             divergence is signal to improve model alignment.
ALTERNATIVES: Average — rejected: dilutes high-confidence negative signal
              Maximum — rejected: optimistic bias.
ENFORCED BY: QG-292-6, ST-210
AFFECTS:     T292
```

### DD-176 — Noisy Neighbor Guard: Per-Tenant Quota Isolation
```
DECISION:    Rate limits and quotas are enforced per tenant (not shared pool)
             F851 NoiseNeighborGuard prevents single tenant burst from affecting others.
RATIONALE:   Shared pool = noisy neighbor problem; enterprise tenants cannot tolerate
             degradation from other tenants; per-tenant isolation = predictable SLAs.
ALTERNATIVES: Shared quota pool with fair queuing — rejected: complex to implement fairly
              per-tenant isolation simpler and more predictable.
ENFORCED BY: F849, F851, CF-362, ST-213
AFFECTS:     T298, T300 and all FLOW-20 flows
```

### DD-177 — Fraud Gate: Blocking Before Billing (Not Async Quarantine)
```
DECISION:    Fraud scoring (F823/F831) is a BLOCKING step before billing event emission
             fraudulent events quarantined synchronously in delivery/attribution path.
RATIONALE:   Async quarantine means fraudulent events briefly enter billing pipeline
             revenue integrity requires fraud gate before any billable record is created.
ALTERNATIVES: Async fraud quarantine + billing reversal — rejected: reversal complexity
              downstream billing system must handle reversals which is operationally fragile.
ENFORCED BY: SK-183, CF-369, IR-293-2, IR-294-2
AFFECTS:     T293, T294, T305
```

### DD-178 — Creative Review: Approval Required Before Auction Eligibility
```
DECISION:    Ad creative must have IAdReviewService (F802) "approved" status stored in
             IAdCatalogService (F801) before F809 EligibilityCheckerService includes it
             in any auction; "pending" or "rejected" creatives are hard-filtered at eligibility.
RATIONALE:   Allowing unapproved creatives into auction — even briefly — risks brand safety
             violations appearing in live placements; hard eligibility filter is simpler
             and safer than post-auction creative swap; audit trail cleaner when
             approval state is immutable checkpoint (consistent with DD-169 append-only).
ALTERNATIVES: Post-auction creative substitution — rejected: race condition between auction
              result and creative swap; brand safety incident window exists
              Soft filter (warn but allow) — rejected: warnings ignored at scale; regulatory
              exposure for prohibited content categories.
ENFORCED BY: DR-129, SK-186, CF-368, IR-291-1, IR-291-3, QG-291-2
AFFECTS:     T291, T292, T295
```

### DD-179 — Attribution Windows: FREEDOM Config Per Advertiser Account, Not Platform-Wide
```
DECISION:    Click-through and view-through attribution windows (e.g., 1d/7d/28d click,
             1d view) are FREEDOM config values settable per advertiser account by
             IAttributionConfigService (F829); no platform-wide hardcoded default window.
RATIONALE:   Different campaign objectives have different natural conversion latencies
             (e-commerce click → purchase: hours; B2B lead → close: weeks)
             one-size window over-attributes short cycles or under-attributes int ones
             advertiser-level config preserves measurement accuracy per vertical.
             Platform-wide default was rejected because it creates systematic mis-attribution
             for non-standard conversion cycles, leading to advertiser churn.
ALTERNATIVES: Platform-wide hardcoded window — rejected: systematic mis-attribution across
              verticals; cannot be corrected without code change (Freedom Machine violation)
              Per-campaign window — considered; too granular for initial scope; add as
              future extension from per-account baseline.
ENFORCED BY: F829 (IAttributionConfigService → FREEDOM config), SK-184, DR-133,
             QG-304-1, CF-379
AFFECTS:     T304, T293, T294, T305
```

---

## DESIGN DECISIONS CROSS-REFERENCE TABLE

| DD | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DD-164 | Graph API REST Graph Paths | F735, F736 | T287, T288, T299, DR-122 |
| DD-165 | Per-Node/Edge/Field Permission | F756 | T287, T288, T299, DR-124, CF-356 |
| DD-166 | Stateless Auction, Redis Hot State | F810 | T292, T293, DR-130, CF-364 |
| DD-167 | Targeting Consent Blocking Gate | F793, F787 | T292, T301, DR-128, CF-366 |
| DD-168 | Political Ad Two-Gate Mandatory | F803, F806 | T295, T292, DR-129, CF-367 |
| DD-169 | Spend Ledger Append-Only | F832 | T293, T294, T296, T303, DR-131 |
| DD-170 | Webhook HMAC Mandatory | F764 | T289, DR-125, CF-358 |
| DD-171 | Payment Tokenization-Only | F773 | T290, DR-126, CF-361 |
| DD-172 | Tenant Resolution Edge-Only | F846 | All FLOW-20, DR-133, CF-374 |
| DD-173 | Flow Spec Immutable Snapshots | F839 | T297, DR-132, CF-372 |
| DD-174 | Graph Depth Limit FREEDOM Config | F734 | T287, T299, SK-185, ST-208 |
| DD-175 | Auction Score Conservative Diverge | F810, AF-5/AF-10 | T292, QG-292-6 |
| DD-176 | Per-Tenant Quota Isolation | F849, F851 | T298, T300, CF-362 |
| DD-177 | Fraud Gate Blocking Before Billing | F823, F831 | T293, T294, T305, CF-369 |
| DD-178 | Creative Approval Before Eligibility | F801, F802, F809 | T291, T292, T295, CF-368 |
| DD-179 | Attribution Windows FREEDOM Config | F829 | T304, T293, T294, T305, DR-133 |

---

## DESIGN RECORDS SUMMARY — DR-122 through DR-133

| DR | Title | Type | Enforced By |
|----|-------|------|-------------|
| DR-122 | REST graph path versioning contract | API_CONTRACT | F735, DD-164 |
| DR-123 | App OAuth scope catalog | SECURITY | F747, F748 |
| DR-124 | Field-level partial-auth response format | PROTOCOL | F756, DD-165 |
| DR-125 | HMAC-SHA256 webhook signature spec | SECURITY | F764, DD-170 |
| DR-126 | PCI tokenization boundary | COMPLIANCE | F773, DD-171 |
| DR-127 | Auction p99 latency budget (50ms) | SLO | F810, DD-166 |
| DR-128 | Consent-before-evaluation ordering | PRIVACY | F793, DD-167 |
| DR-129 | Political ad dual-gate protocol | REGULATORY | F803, F806, DD-168 |
| DR-130 | Redis-only mutable auction state | ARCHITECTURE | F810, F811, DD-166 |
| DR-131 | Append-only spend ledger schema | COMPLIANCE | F832, DD-169 |
| DR-132 | Immutable flow version snapshot | VERSIONING | F839, DD-173 |
| DR-133 | Attribution window FREEDOM config schema | MEASUREMENT | F829, DD-179 |

---

## FULL CATALOG TOTALS — POST FLOW-20

```
FACTORIES:        F1-F843     (851 total, Families 1-75)
  F734-F851       [FLOW-20 Graph API + Sponsored Content + Deep Search, Families 103-118]
TASK TYPES:       T1-T306     (306 total)
  T287-T306       [FLOW-20, 20 new task types]
FLOW TEMPLATES:   1-40        (63 total)
  Templates 59-63 [FLOW-20, 5 new templates]
BFA CONFLICTS:    CF-1-CF-379 (379 total)
  CF-356-CF-379   [FLOW-20, 24 new conflict rules]
STRESS TESTS:     ST-1-ST-214 (214 total)
  ST-199-ST-214   [FLOW-20, 16 new stress tests]
SKILL PATTERNS:   SK-1-SK-188 (188 total)
  SK-175-SK-188    [FLOW-20, 14 new skill patterns]
DESIGN DECISIONS: DD-1-DD-179 (179 total)
  DD-164-DD-179    [FLOW-20, 16 new design decisions]
DESIGN RECORDS:   DR-1-DR-133  (133 total)
  DR-122-DR-133     [FLOW-20, 12 new design records]
IRON RULES:       ~1,564      (+160 from FLOW-20: 8 per T × 20 task types)
QUALITY GATES:    ~1,340      (+120 from FLOW-20: 6 per T × 20 task types)
AF STATION CELLS: ~2,178      (+220 from FLOW-20: 11 stations × 20 task types)
DNA COMPLIANCE:   ~2,320 checks, all pass (+200 from FLOW-20)
```

---

## SAVE POINT: FLOW20:P5:INDEX ✅
## Phase 5 COMPLETE: DD-164–DD-179, DR-122–DR-133, full cross-reference table
## Recovery Command: "Continue FLOW-20 from Phase P6" (SESSION_STATE update)


---

# ═══════════════════════════════════════════════════════════════
# FLOW-21: Forms & Flow Automation Builder (DD-180–DD-191, DR-134–DR-143)
# ═══════════════════════════════════════════════════════════════

# UNIFIED SOURCE INDEX — FLOW-21: Forms & Flow Automation Builder
## Extends UNIFIED_SOURCE_INDEX_MERGED.md
## Backward Compatible: DD-1-DD-85, all prior concept maps UNCHANGED
## Save Point: FLOW21:P6:UNIFIED_INDEX ✅

---

## OVERVIEW

```
NEW DESIGN DECISIONS:  DD-180-DD-191 (12 decisions)
CONCEPT MAPS:          Forms platform, submission pipeline, recipe engine, connector SDK
DOMAIN:                Forms authoring + submission + automation + connectors + MT
STARTING IDs:          DD-180, SK-189 (see SKILLS_FACTORY_RAG for full SK list)
```

---

## DESIGN DECISIONS (DD-180–DD-191)

### DD-180 — Why Form Schemas Stored in Elasticsearch (Not PostgreSQL)
```
DECISION ID:    DD-180
QUESTION:       Should FormSchema definitions be stored in ES or PG?
DECISION:       Elasticsearch (DATABASE FABRIC, ES provider)
RATIONALE:
  1. Dynamic field catalog: forms have variable numbers of fields with schema-per-form.
     PG requires ALTER TABLE for schema changes — ES handles arbitrary JSON natively.
  2. Full-text search: form builder needs to search schemas by field label, type, tags.
  3. DNA-1 alignment: FormSchema is a Dictionary — ES stores it without schema migration.
  4. Nested conditional rules: ES handles nested JSON objects efficiently.
  5. Render spec generation: AF-4 RAG searches form schemas — ES is the RAG fabric backend.

TRADE-OFF:
  ES is not ACID transactional. PG is used for version history (F855) where
  sequence guarantees matter. ES for current schema + PG for audit = hybrid approach.

ALTERNATIVE CONSIDERED:
  PG with JSONB — rejected because schema search complexity and AI indexing requirements
  favor ES. Version history specifically uses PG (DR-134 pattern).

DNA COMPLIANCE:
  DNA-1: Stored as Dictionary — ES natively handles this
  DNA-5: tenantId as ES routing key for tenant isolation
```

### DD-181 — Why Submission Pipeline Uses Stage-Gate Queue Pattern
```
DECISION ID:    DD-181
QUESTION:       Should submission processing be synchronous (inline) or stage-gate queue?
DECISION:       Stage-gate queue pattern via QUEUE FABRIC (Redis Streams)
RATIONALE:
  1. Decoupling: Each stage (intake, normalize, validate, spam, persist) can fail
     and retry independently without blocking the HTTP response.
  2. Throughput: 10k concurrent submissions (ST-216) cannot be handled synchronously.
     Queue backpressure manages load without dropping submissions.
  3. Idempotency: Stage gates with dedup keys (F864) handle at-least-once delivery.
  4. Observability: Each stage emits events — full pipeline visibility in QUEUE FABRIC.
  5. Recovery: DLQ per stage — submission stuck at validation can be replayed
     after admin fixes the form schema, without losing other submissions.

TRADE-OFF:
  Latency: End-to-end pipeline is 100-500ms vs 10ms synchronous.
  Acceptable: user sees 202 Accepted immediately (IR-308-3).

ALTERNATIVE CONSIDERED:
  Synchronous pipeline — rejected because ST-216 throughput and resilience
  requirements cannot be met with blocking request/response.
```

### DD-182 — Why Anti-Spam Is a Fabric Service (Not Middleware)
```
DECISION ID:    DD-182
QUESTION:       Should anti-spam be middleware in the HTTP request pipeline or a fabric service?
DECISION:       Dedicated QUEUE FABRIC service stage (IAntiSpamService via F867)
RATIONALE:
  1. DR-135: Anti-spam is a composite gate (honeypot + reCAPTCHA + AI scoring).
     Each layer has different latency characteristics — inline middleware blocks the thread.
  2. AI scoring (IAiProvider.GenerateAsync) has variable latency (100ms-2s).
  3. Rate limiting state (Redis) needs to be shared across all instances.
  4. Testability: Fabric service is independently testable + replaceable (DNA-4 pattern).
  5. FREEDOM config: Spam threshold, AI model, reCAPTCHA key — all admin-configurable
     in ES FREEDOM layer, not in middleware config files.

ALTERNATIVE CONSIDERED:
  FastAPI middleware filter — rejected because AI scoring latency + shared state
  requirements cannot be met in synchronous middleware pattern.
```

### DD-183 — Why Partial Entries Use Redis→PG Two-Phase Store
```
DECISION ID:    DD-183
QUESTION:       Should partial entries (save & continue) go directly to PG or Redis first?
DECISION:       Redis with TTL for active partial entries → PG on completion (DR-142)
RATIONALE:
  1. Performance: Save-and-continue happens on every wizard step advance.
     ES/PG writes on every step = unnecessary I/O for most forms that complete in session.
     Redis writes are sub-millisecond.
  2. Memory efficiency: Incomplete forms that are never completed should not
     permanently occupy PG. Redis TTL (48h) automatically evicts abandoned partials.
  3. Isolation: Active session state (Redis) vs completed entry data (PG/ES) are
     different operational concerns with different access patterns.
  4. PG as source of truth: Promoted entries in PG are immutable — edit collisions prevented.

TRADE-OFF:
  Redis TTL expiry loses partially filled forms. Mitigated by 48h window + notification
  to user. Default TTL configurable via FREEDOM config.
```

### DD-184 — Why Notification Templates Use Merge Tags + AI Resolver (Not Handlebars)
```
DECISION ID:    DD-184
QUESTION:       Should notification templates use Handlebars/Mustache or a custom merge-tag resolver?
DECISION:       Custom merge-tag resolver (IMergeTagResolverService F879) with AI fallback (DR-137)
RATIONALE:
  1. DNA-1 alignment: Handlebars compiles templates into typed model accessors.
     {{entry.submitterName}} requires typed object — violates DNA-1.
     Merge tag resolver works with dict[str, Any] natively.
  2. Extensibility: New form fields = new merge tags at runtime, no recompile needed.
  3. AI fallback: Novel tags handled by IAiProvider.GenerateAsync() — Handlebars cannot.
  4. FREEDOM config: Template bodies stored in ES — admin can add new templates
     without deployment.

ALTERNATIVE CONSIDERED:
  Handlebars (dotnet port, Python-incompatible) — also rejected: DNA-1 typed model requirement + AI extension requirement.
  Liquid templates — same rejection reason.
```

### DD-185 — Why Feed Execution Is Idempotent-First (vs At-Most-Once)
```
DECISION ID:    DD-185
QUESTION:       Should feed execution be at-most-once (skip duplicates) or at-least-once with idempotency?
DECISION:       At-least-once delivery + idempotency key guard (DR-138, SK-192)
RATIONALE:
  1. QUEUE FABRIC (Redis Streams) guarantees at-least-once delivery by design.
  2. At-most-once loses messages on consumer crash — data loss unacceptable for CRM feeds.
  3. CRM, webhook, and mailing list integrations are naturally idempotent with a dedup key.
  4. Redis idempotency key is cheap (single GET) vs cost of lost CRM contacts
     or duplicate invoices.

TRADE-OFF:
  Redis key TTL window: if event replayed after key TTL expiry, feed executes again.
  Default: 30-day TTL configurable via FREEDOM config.
```

### DD-186 — Why Recipe DAG Is an ES Document (Reuses Flow Engine Pattern)
```
DECISION ID:    DD-186
QUESTION:       Should automation recipes be stored as PG records, code, or ES documents?
DECISION:       ES document — same pattern as FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry), DR-139)
RATIONALE:
  1. Admin-configurable: Recipes are FREEDOM layer constructs. No deployment to add/modify.
  2. Pattern consistency: Flow orchestrator (SK-392 (RagStrategyRegistry)) already reads DAG from ES.
     Recipes follow identical pattern — code reuse, consistent mental model.
  3. Search: Admin needs to find recipes by trigger event, step type, connector.
  4. Versioning: F855 versioning service reused for recipe version history.

ALTERNATIVE CONSIDERED:
  PG with JSONB DAG — rejected in favor of ES pattern consistency with SK-392 (RagStrategyRegistry).
  Code-generated recipes — rejected (violates FREEDOM principle, requires deployment).
```

### DD-187 — Why Connector OAuth Tokens Are PG-Only (Encryption at Rest Requirement)
```
DECISION ID:    DD-187
QUESTION:       Where should OAuth access/refresh tokens be stored?
DECISION:       PostgreSQL with column-level encryption exclusively (DR-140, CF-395)
RATIONALE:
  1. ES stores plaintext by default — tokens in ES = searchable secrets = security failure.
  2. Redis is ephemeral — token loss on eviction = broken integration.
  3. PG supports column-level AES-256 encryption (pgcrypto) + TLS at rest.
  4. Combined with RLS (CF-400), provides strongest isolation in stack.
  5. PG audit log tracks token lifecycle (created, refreshed, revoked).

ALTERNATIVE CONSIDERED:
  HashiCorp Vault — valid for enterprise, adds external dependency.
  Available as FREEDOM config override — default remains PG encrypted.
```

### DD-188 — Why File Scan Is a QUEUE FABRIC Step (Not Inline)
```
DECISION ID:    DD-188
QUESTION:       Should virus scanning run inline during upload or as async queue step?
DECISION:       Async QUEUE FABRIC step (SK-196, T324)
RATIONALE:
  1. Scan latency: External scan services (ClamAV, VirusTotal) have variable latency
     (100ms-10s). Inline scan blocks upload response for full scan duration.
  2. Throughput: ST-224 — 1,000 simultaneous uploads. Queue-based = controlled concurrency.
  3. Quarantine-first: Files quarantined on upload regardless of scan result.
     No race condition — scan cannot complete before quarantine is set.
  4. Retry: QUEUE FABRIC retries automatically on scan service unavailability.

ALTERNATIVE CONSIDERED:
  Inline synchronous scan — rejected due to latency + throughput (ST-224).
  Hash-based known-malware check (fast, inline) as pre-filter — valid FREEDOM config option.
```

### DD-189 — Why Conditional Logic Is an ES Rule Document (Admin-Configurable FREEDOM)
```
DECISION ID:    DD-189
QUESTION:       Should form conditional logic (show/hide/require) be in code or configuration?
DECISION:       ES rule documents evaluated at runtime (DR-136, SK-199)
RATIONALE:
  1. FREEDOM principle: Conditional logic must be admin-configurable without deployment.
  2. AI assist: F854 can suggest conditional rules during authoring — AI-generated rules
     stored in ES, not compiled into service code.
  3. DNA-1: Conditions as Dictionary — typed ConditionalRule class violates DNA-1.
  4. Testability: ES rule documents testable without running full service.
  5. Versioning: Rule versions tracked in ES — rollback available (F855 pattern).

ALTERNATIVE CONSIDERED:
  Expression language (JEXL) compiled into service — rejected. Dynamic expression eval
  has security implications. Rule Dictionary with supported operators is safer.
```

### DD-190 — Why Forms MT Isolation Inherits FLOW-08 Model (Not Reinvented)
```
DECISION ID:    DD-190
QUESTION:       Should FLOW-21 define its own MT isolation model or inherit from FLOW-08?
DECISION:       Inherit FLOW-08 MT model + FLOW-14 warehouse MT extensions (DR-143)
RATIONALE:
  1. Consistency: Tenants expect identical isolation guarantees across all features.
  2. Proven: FLOW-08 MT model stress-tested — proven patterns should be reused.
  3. Complexity: Building new MT isolation introduces new failure modes.
     F900 as thin adaptation layer on Skill 11 = minimal safe approach.
  4. FLOW-14 warehouse MT (F461) provides PG RLS patterns directly applicable
     to forms entry tables — reuse DR-65 patterns.

TRADE-OFF:
  Inheritance means forms MT is constrained by FLOW-08 design decisions.
  If FLOW-08 MT model changes, forms isolation must be reviewed.
  Mitigated by explicit DR-143 reference in F900 documentation.
```

### DD-191 — Why AI-Assisted Form Authoring Goes Through AI ENGINE FABRIC
```
DECISION ID:    DD-191
QUESTION:       Should F860 (IAiFormAssistService) call OpenAI/Claude directly or via fabric?
DECISION:       AI ENGINE FABRIC (IAiProvider + AiDispatcher via SK-385/SK-386 (IAiProvider/AiDispatcher))
RATIONALE:
  1. Provider agnosticism: operator may use Claude, GPT-4, or Gemini — direct import = lock-in.
  2. Cost control: AiDispatcher routes to cheapest model meeting quality threshold.
  3. Multi-model consensus: F860.GenerateSchema() benefits from AF-5 multi-model comparison.
  4. Rate limiting: IAiProvider manages rate limits, retries, fallbacks.
  5. AF station integration: AF-1 (Genesis) and AF-11 (Feedback) track usage for cost/quality.

VIOLATION:
   client = OpenAIClient(apiKey);                         # ← FAIL: direct import
   result = await client.GetChatCompletions(model, messages); # ← FAIL

CORRECT:
   result = await _aiProvider.GenerateAsync(prompt);          # via IAiProvider (fabric)
```

---

## CONCEPT MAPS

### Concept Map 1 — Forms Platform Architecture (FLOW-21 Full View)
```
FORMS PLATFORM OVERVIEW

  ┌─────────────────────────────────────────────────────────────────┐
  │  FORM BUILDER UI (fabric-first render spec — SK-197)            │
  │  Platform-agnostic: web / mobile / admin = same ES render spec  │
  │  F857: IFormRenderSpecService → ES                              │
  └──────────────────────┬──────────────────────────────────────────┘
                         │ FORM_SCHEMA_PUBLISHED (QUEUE FABRIC)
  ┌──────────────────────▼──────────────────────────────────────────┐
  │  FORM SCHEMA LAYER (Family 119)                                  │
  │  F852 IFormSchemaService    → ES (current schema)               │
  │  F853 IFieldDefinitionService → ES (field catalog)              │
  │  F854 IConditionalLogicService → ES rules + AI ENGINE FABRIC    │
  │  F855 IFormVersioningService → PG (version history)             │
  │  F856 IFormPublishService   → QUEUE FABRIC + ES                 │
  │  F860 IAiFormAssistService  → AI ENGINE FABRIC (SK-385 (IAiProvider)/07)    │
  └──────────────────────┬──────────────────────────────────────────┘
                         │ FORM_SUBMITTED (QUEUE FABRIC)
  ┌──────────────────────▼──────────────────────────────────────────┐
  │  SUBMISSION PIPELINE (Families 121-63, Template 64)              │
  │  Stage 1: F864 ISubmissionIntakeService → QUEUE + Redis dedup   │
  │  Stage 2: F865 IFieldNormalizerService  → CORE (ObjectProcessor)│
  │  Stage 3: F866 ISubmissionValidatorService → ES rules + RAG     │
  │  Stage 4: F867 IAntiSpamService         → AI + Redis RL         │
  │  Stage 5: F868 IEntryPersistenceService → ES primary + PG audit │
  │  Stage 6: F869 IConfirmationService     → QUEUE + ES templates  │
  │  Alt:     F870 IPartialEntryService     → Redis TTL → PG        │
  └──────┬────────────────────────────────────┬───────────────────-─┘
         │ ENTRY_PERSISTED                    │ ENTRY_PERSISTED
  ┌──────▼──────────┐              ┌──────────▼──────────────────────┐
  │ NOTIFICATIONS   │              │  INTEGRATION FEEDS              │
  │ (Family 123)     │              │  (Family 124)                    │
  │ F878 Templates  │              │  F883 Feed Definition           │
  │ F879 MergeTag   │              │  F884 Feed Conditions           │
  │ F880 Router     │              │  F885 Feed Executor (idempotent)│
  │ F881 Delivery   │              │  F886 Webhook Feed              │
  │   → email/SMS   │              │  F887 CRM Feed                  │
  │   → push        │              │  F888 Mailing List Feed         │
  └─────────────────┘              │  F889 Payment Feed              │
                                   └─────────────────────────────────┘
```

### Concept Map 2 — Automation Recipe Engine
```
RECIPE ENGINE FLOW (FLOW-21, Families 125-67, Template 65)

  EVENT SOURCE (any fabric event)
         │
  ┌──────▼────────────────────────────┐
  │  F891 IRecipeTriggerService       │
  │  QUEUE FABRIC + ES trigger index  │
  │  → evaluates: which recipe fires? │
  └──────┬────────────────────────────┘
         │ RECIPE_TRIGGERED
  ┌──────▼────────────────────────────┐
  │  F890 IRecipeDefinitionService    │
  │  DATABASE FABRIC (ES — DAG doc)   │
  │  → loads recipe DAG (DD-186)       │
  │  → same pattern as SK-392 (RagStrategyRegistry)       │
  └──────┬────────────────────────────┘
         │ steps[]
  ┌──────▼────────────────────────────┐
  │  F892 IRecipeStepResolverService  │
  │  ES + FLOW ENGINE FABRIC          │
  │  → resolves each step to factory  │
  └──────┬────────────────────────────┘
         │ STEP_EXECUTE
  ┌──────▼────────────────────────────┐
  │  F893 IRecipeExecutionService     │
  │  QUEUE FABRIC + PG run state      │
  │  → executes step                  │
  │  → if fail → DLQ → F894 retry     │
  │  → idempotency: F895 Redis key    │
  └──────┬────────────────────────────┘
         │ RECIPE_COMPLETED / RECIPE_FAILED
  ┌──────▼────────────────────────────┐
  │  F899 IRunHistoryService          │
  │  DATABASE FABRIC (ES — immutable) │
  └───────────────────────────────────┘
```

### Concept Map 3 — Connector SDK & OAuth Flow
```
CONNECTOR INTEGRATION (Family 126, Template 66)

  ADMIN                  F896                   F897
  connects    ──────►  IConnectorDefinition  ──►  IOAuthConnectorService
  OAuth app            (ES catalog)               (PG encrypted tokens — DD-187)
                                                   ↓
                                             PKCE flow via CORE FABRIC
                                             (SK-194 pattern)
                                                   ↓
                                             TOKEN_STORED (PG, RLS-protected)

  RECIPE STEP    ──────► F898 IDataMappingService  (ES mapping + AI ENGINE FABRIC)
  (e.g., CRM push)            ↓
                       mapped dict[str, Any]
                              ↓
                       F887/F886/F888 Feed Service → QUEUE FABRIC → external API
                              ↓
                       F895 IRecipeIdempotencyService → Redis dedup key check
                              ↓
                       F899 IRunHistoryService → ES run log (immutable — CF-395)
```

### Concept Map 4 — Submission Pipeline Stage Gates
```
SUBMISSION PIPELINE DETAIL (Template 64, DR-134)

  HTTP POST /submit
       │ 202 Accepted (immediate)
       ↓
  [Stage 1] F864 Intake ────── Redis dedup key: hash(formId+fingerprint)
       │ INTAKE_COMPLETE
       ↓
  [Stage 2] F865 Normalize ─── CORE FABRIC ObjectProcessor
       │                        → dict[str, Any] (DNA-1)
       │ NORMALIZED
       ↓
  [Stage 3] F866 Validate ──── ES rule docs (SK-199)
       │                        + RAG FABRIC (similar form patterns)
       │ VALIDATED              → if FAIL → DLQ → admin review
       ↓
  [Stage 4] F867 Anti-Spam ─── honeypot check (fast, no I/O)
       │                        + reCAPTCHA verify (CORE FABRIC HTTP)
       │                        + AI scoring (AI ENGINE FABRIC)
       │ SPAM_CLEARED           → if SPAM → quarantine entry
       ↓
  [Stage 5] F868 Persist ───── ES primary index (searchable)
       │                        + PG audit log (immutable)
       │                        INV-15-1: PERSIST BEFORE EMIT
       │ ENTRY_PERSISTED ──────────────────────────────────────┐
       ↓                                                        ↓
  [Stage 6] F869 Confirm ──── email/redirect              F880 Router
                               to submitter               → feeds + notifications
```

### Concept Map 5 — Multi-Tenant Forms Isolation
```
MT ISOLATION FOR FORMS (Family 127, SK-200, DR-143)

  INHERITS:
  ├── FLOW-08 MT Model (tenant provisioning + scope isolation)
  ├── FLOW-14 PG RLS pattern (F461, F463 → reused for form entry tables)
  └── Skill 11: MT ISOLATION FABRIC

  F900 IFormTenantIsolationService

  Per-Tenant Isolated Artifacts:
  ├── Form Schemas          → ES: tenantId routing key (DNA-5)
  ├── Form Entries          → ES: tenantId field + PG RLS (CF-398)
  ├── Connector Credentials → PG: RLS row filter + column encryption (CF-400)
  ├── Notification Templates → ES: tenantId scope
  ├── Recipe DAGs            → ES: tenantId scope
  └── Partial Entries        → Redis: tenantId-prefixed keys

  Cross-Tenant Violations (= BUILD FAILURE):
  CF-398: Schema queries without tenantId filter
  CF-399: Entry reads without RLS policy active
  CF-400: Connector credentials accessed from wrong tenantId context
```

---

## SKILL INDEX (FLOW-21 additions — full patterns in SKILLS_FACTORY_RAG)

| Skill | Name | Pattern | AF-4 Trigger |
|-------|------|---------|--------------|
| SK-189 | Form Schema DAG Validation | ES schema integrity check | "form schema", "field validation" |
| SK-190 | Submission Pipeline Stage-Gate | Intake→validate→persist via queue | "submission", "pipeline", "stage gate" |
| SK-191 | Merge-Tag Resolver with AI Fallback | Dictionary-based template eval + AI | "merge tags", "notifications", "templates" |
| SK-192 | Feed Executor Idempotency | Redis key + PG run log | "feed", "idempotent", "integration" |
| SK-193 | Recipe DAG Execution | Adapts SK-392 (RagStrategyRegistry) for recipe context | "recipe", "automation", "DAG" |
| SK-194 | Connector OAuth PKCE Flow | PKCE via Core Fabric | "OAuth", "connector", "auth" |
| SK-195 | Anti-Spam Composite Gate | Honeypot + reCAPTCHA + AI scoring | "spam", "security gate", "captcha" |
| SK-196 | File Upload Secure Pipeline | Upload→scan→sign→store | "file upload", "virus scan" |
| SK-197 | Fabric-First UI Spec | Render spec in ES, zero platform values | "UI spec", "fabric-first", "render" |
| SK-198 | Partial Entry Save-and-Continue | Redis TTL → PG promotion | "partial entry", "save continue", "wizard" |
| SK-199 | Conditional Logic Evaluator | ES rule doc → runtime eval | "conditional", "show/hide", "logic rules" |
| SK-200 | Multi-Tenant Forms Isolation | Schema + entry + connector scope | "multi-tenant", "forms isolation" |

---

## CONCEPT CROSS-REFERENCE TABLE

| Concept | Defined In | Used By | Related DRs |
|---------|-----------|---------|-------------|
| FormSchema | F852, DD-180 | F853-F857, T307, SK-189 | DR-136 |
| SubmissionPipeline | F864-F868, DD-181 | T308-T312, SK-190 | DR-134, DR-135 |
| AntiSpam Gate | F867, DD-182 | T311, SK-195 | DR-135 |
| PartialEntry | F870, DD-183 | T313, SK-198 | DR-142 |
| MergeTagResolver | F879, DD-184 | T314, SK-191 | DR-137 |
| FeedIdempotency | F885/F895, DD-185 | T315-T316, SK-192 | DR-138 |
| RecipeDAG | F890-F895, DD-186 | T318-T321, SK-193 | DR-139 |
| OAuthTokenStore | F897, DD-187 | T322, SK-194 | DR-140 |
| FileScanQueue | F874, DD-188 | T324, SK-196 | DR-141 |
| ConditionalLogicDoc | F854, DD-189 | T307, SK-199 | DR-136 |
| FormsMTIsolation | F900, DD-190 | T326, SK-200 | DR-143 |
| AIFormAssist | F860, DD-191 | T307 (AF-1), SK-189 | DR-136 |

---

## SAVE POINT: FLOW21:P6:UNIFIED_INDEX ✅
## Next: FLOW-16 DD-98+ | Reference this file for all FLOW-21 design decisions

═══════════════════════════════════════════════════════════════════
FLOW-22 — Visual Editor & Site Builder Platform
Merged: 2026-02-27
═══════════════════════════════════════════════════════════════════

# UNIFIED SOURCE INDEX — FLOW-22 EXTENSION
# Visual Editor & Site Builder Platform
# Extends: UNIFIED_SOURCE_INDEX_MERGED.md (DD-1–DD-191, DR-1–DR-143)
# FLOW-22 adds: DD-192–DD-203 (12 design decisions) | DR-144–DR-151 (8 design records)
# Save Point: FLOW22:P5:INDEX:COMPLETE

---

## STATE REFERENCE
```
Previous: DD-1–DD-191 | DR-1–DR-143 — UNIFIED_SOURCE_INDEX_MERGED.md
This file: DD-192–DD-203 (12 new) | DR-144–DR-151 (8 new)
Next: SESSION_STATE (global tracker update)
```

---

## DESIGN DECISIONS — FLOW-22

Design Decisions record WHY a significant architectural choice was made.
Format: ID | Decision | Alternatives considered | Rationale | Enforcing artifacts

---

### DD-192 — JSON Schema 2020-12 for Post Type Schema Registry

```
ID:           DD-192
DOMAIN:       CMS & Content (Family 129)
DECISION:     Post Type schemas (F907 IPostTypeRegistryService, F909 IPostTypeSchemaService)
              use JSON Schema 2020-12 as the canonical contract for content validation
              and admin form generation.
ALTERNATIVES:
  A) TypeScript interface (code-as-schema): tight coupling to runtime; requires code deploy
     for schema changes; not readable by non-technical admins. REJECTED.
  B) Custom schema format: no ecosystem tooling; must write custom validator. REJECTED.
  C) GraphQL SDL: strong for API contracts; not designed for form generation or admin UIs. REJECTED.
  D) JSON Schema 2020-12 (CHOSEN): published spec; wide tooling; supports $ref,
     unevaluatedProperties, vocabulary extensibility; readable by admins; version-tracked.
RATIONALE:    Schema changes must not require code deployment (FREEDOM principle).
              Admins must configure new PostTypes without developer involvement.
              JSON Schema 2020-12 is the current released version with broadest tooling.
SOURCES:      22-visual-editor-deep-search.md (schema validation requirement)
              basic_prompt.txt (FREEDOM: admin-configurable values)
ENFORCING:    F907, F909, T328, T331, SK-202, CF-404, CF-420
```

---

### DD-193 — Hybrid SSR/SSG Rendering (Not Pure SSG)

```
ID:           DD-193
DOMAIN:       Publishing Pipeline (Family 131)
DECISION:     Rendering uses hybrid SSR+SSG:
              PREVIEW/EDITOR: always SSR via F920 IRenderRuntimeService (always fresh)
              PUBLISHED CONTENT: SSG via F919 IStaticBuildService (CDN-cached, fast)
ALTERNATIVES:
  A) Pure SSG: simplest for publishing; but live preview impossible without rebuild. REJECTED.
  B) Pure SSR: live preview works; but prohibitive runtime cost at high traffic. REJECTED.
  C) Hybrid SSR/SSG (CHOSEN): preview via SSR (always fresh); published via SSG (fast, CDN).
     Satisfies both 22-*-deep-search-engine.md requirements: live preview + high-performance pages.
RATIONALE:    22-* specs require both live preview (needs SSR) and high-performance published
              pages (needs SSG/CDN). Hybrid is the only approach satisfying both.
              CF-423 enforces preview-always-SSR invariant.
SOURCES:      22-visual-editor-deep-search.md (SSR/SSG alternatives table)
              22-visual-editor-deep-search-engine.md (live preview requirement)
ENFORCING:    F904, F919, F920, T330, T339, CF-423, SK-209
```

---

### DD-194 — CloudEvents Envelope for All Pipeline Events

```
ID:           DD-194
DOMAIN:       Publishing Pipeline (Family 131) + QUEUE FABRIC
DECISION:     All inter-service events in FLOW-22 use CloudEvents-compatible envelope:
              {source, type, subject, time, datacontenttype, data, id (idempotency-key)}
ALTERNATIVES:
  A) Raw JSON payload: fast; no standard metadata; custom correlation IDs required. REJECTED.
  B) Custom engine envelope: consistent within engine; creates another non-standard format. REJECTED.
  C) CloudEvents (CHOSEN): CNCF-backed open spec; standardized metadata; supports correlation IDs
     (source+id); works with existing QUEUE FABRIC consumers unchanged; tracing-ready.
RATIONALE:    22-*-deep-search-engine.md explicitly recommends CloudEvents for event envelopes.
              Aligns with BFA cross-flow rules (CF-418–CF-425) requiring cross-service tracing.
SOURCES:      22-visual-editor-deep-search-engine.md (CloudEvents recommendation)
ENFORCING:    CF-425, T336, T337, AF-7 Compliance check, IR-917-3
```

---

### DD-195 — Elasticsearch as Primary Store with PostgreSQL State Journal

```
ID:           DD-195
DOMAIN:       Visual Editor + CMS (Families 128, 85)
DECISION:     Page trees (F901) and post content (F908) use Elasticsearch as primary
              queryable store. PostgreSQL used for state machine records (post lifecycle
              transitions) and append-only version journals (content history).
ALTERNATIVES:
  A) MongoDB: good for documents; but adds a DB provider not currently primary in the engine. REJECTED.
  B) Pure PostgreSQL: strong ACID; but CMS full-text search and tree diffing are ES strengths
     JSONB less flexible for dynamic document queries. REJECTED.
  C) ES + PG (CHOSEN): ES for flexible document queries, full-text, aggregations
     PG for state machine records, append-only journals, strict ACID transactions.
RATIONALE:    Both are already in DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) — zero new provider dependencies.
              ES handles dynamic dict[str, Any] documents natively (DNA-1).
              PG append-only tables provide tamper-evident version history (IR-911-1).
SOURCES:      22-visual-editor-deep-search-engine.md (persistence strategy)
              22-visual-editor-deep-search.md (CMS requirements)
ENFORCING:    F901, F908, F911, F922, F937, T332, T333
```

---

### DD-196 — Optimistic Concurrency for Content Editing (No Pessimistic Locks)

```
ID:           DD-196
DOMAIN:       Content Authoring (Family 130) + CMS (Family 129)
DECISION:     Content writes (F908, F901) use ETag/If-Match optimistic concurrency.
              Concurrent update without matching version = 409 DataProcessResult.
              No pessimistic locking for content edits.
ALTERNATIVES:
  A) Pessimistic locking: guarantees one writer at a time; but blocks parallel editing; deadlock
     risk; poor UX for collaborative editing. REJECTED.
  B) Last-write-wins: simple; but silently loses data — unacceptable for CMS. REJECTED.
  C) Optimistic concurrency (CHOSEN): writer must prove their version matches current
     conflicts surface as 409 for user-visible merge resolution; no blocked threads.
RATIONALE:    Collaborative multi-author editing is a core FLOW-22 requirement
              (22-visual-editor.md). Pessimistic locks block collaboration.
              ETag/If-Match is a proven HTTP-level pattern; implementable in DATABASE FABRIC.
SOURCES:      22-visual-editor.md (multi-author editing); 22-visual-editor-deep-search.md
ENFORCING:    F908, F911, T332, CF-409, SK-204, IR-912-1
```

---

### DD-197 — Workspace = Unit of Multi-Tenancy Isolation

```
ID:           DD-197
DOMAIN:       Multi-Tenant Support (Family 134)
DECISION:     All FLOW-22 resources are scoped to a workspaceId (≡ tenantId in prior flows).
              workspaceId is present on every DB query, queue event, and API endpoint.
              Workspace provisioning is an atomic transaction (F941 IWorkspaceProvisionService).
ALTERNATIVES:
  A) Global namespace (no workspace isolation): ignores multi-tenancy requirement. REJECTED.
  B) Per-table tenant column: works but doesn't prevent cross-tenant query bugs without
     enforcement at the fabric level. REJECTED.
  C) Workspace ≡ tenantId (CHOSEN): reuses DNA-5 Scope Isolation pattern already in MicroserviceBase
     workspaceId flows from AuthContext.TenantId; zero additional infrastructure.
RATIONALE:    22-visual-editor-deep_search_engine_multi_tenant.md mandates per-workspace isolation.
              Reusing tenantId pattern avoids adding a new isolation dimension.
              DNA-5 enforcement catches any query missing workspaceId at compliance scan time.
SOURCES:      22-visual-editor-deep_search_engine_multi_tenant.md
              basic_prompt.txt (DNA-5: Scope Isolation)
ENFORCING:    F941, F942, F943, T346, CF-414, CF-429, SK-201 (note), AF-7
```

---

### DD-198 — Design Token Inheritance Tree (CSS Custom Properties + Build-Time Resolution)

```
ID:           DD-198
DOMAIN:       Design Tokens (Family 133)
DECISION:     Design tokens stored as inheritance trees in ES (F926 IDesignTokenService).
              Parent → child token resolution happens at build time (F919 IStaticBuildService).
              Runtime: CSS Custom Properties injected; no server-side resolution per request.
ALTERNATIVES:
  A) Runtime server-side token resolution per request: flexible but high latency. REJECTED.
  B) Flat token map (no inheritance): simple; but prevents theming/variant systems. REJECTED.
  C) CSS Custom Properties + build-time resolution (CHOSEN): inheritance tree stored in ES
     build pipeline resolves and outputs :root { --token: value } CSS; CDN-cached.
RATIONALE:    Admins need to create theme variants without code (FREEDOM).
              Build-time resolution gives CDN-cached zero-latency output.
              CSS Custom Properties are browser-native — no JS runtime dependency.
SOURCES:      22-visual-editor-deep-search-engine.md (design token system)
ENFORCING:    F926, F903, T341, T342, SK-202 (extended), CF-410
```

---

### DD-199 — Component Registry is Immutable + Append-Only (Version-Tagged)

```
ID:           DD-199
DOMAIN:       Visual Editor (Family 128)
DECISION:     Component registry entries (F902 IComponentRegistryService) are immutable
              after publication. Updates create a new version; old versions remain active
              for backward compatibility until explicitly deprecated.
ALTERNATIVES:
  A) Mutable registry: simple; but existing pages referencing old version silently break. REJECTED.
  B) Replace on update: breaks live pages that use the previous component version. REJECTED.
  C) Append-only versioned registry (CHOSEN): new version = new registry entry; pages
     reference component@version; old pages continue to work; deprecation is explicit.
RATIONALE:    Sites in production must not break when a component is updated
              (backward compatibility = a core engine principle from basic_prompt.txt).
              22-visual-editor.md requires component versioning.
SOURCES:      basic_prompt.txt (backward compatibility); 22-visual-editor.md
ENFORCING:    F902, T327, T328, CF-402, CF-408, IR-901-1
```

---

### DD-200 — AI Content Assist is Non-Blocking (Fire-and-Suggest Pattern)

```
ID:           DD-200
DOMAIN:       AI Assist (Family 132)
DECISION:     AI content assistance (F928 IAiContentAssistService) is non-blocking:
              user writes freely; AI suggestions arrive asynchronously via QUEUE FABRIC
              user accepts/rejects; AI output never blocks the save path.
ALTERNATIVES:
  A) Blocking AI call on save: simple integration; but adds latency to every save. REJECTED.
  B) Inline autocomplete (synchronous): good UX; but ties every keystroke to AI latency. REJECTED.
  C) Fire-and-suggest async (CHOSEN): user initiates save immediately; AI suggestion arrives
     via event; UI shows suggestion overlay; user action required to apply. Non-blocking save path.
RATIONALE:    AI latency (100ms–5s) must not gate content saves (basic_prompt.txt: DataProcessResult
              never throws for business logic — DNA-3). Non-blocking preserves author flow.
              22-visual-editor.md requires AI assist without blocking authoring.
SOURCES:      22-visual-editor.md (AI assist); basic_prompt.txt (DNA-3)
ENFORCING:    F928, F929, T343, SK-205 (extended), CF-416
```

---

### DD-201 — Single-Pass Media Transform Pipeline (No Re-Origination)

```
ID:           DD-201
DOMAIN:       Media Pipeline (Family 133)
DECISION:     All media transforms (F931 IMediaTransformService) operate from the
              original upload only. Transformed variants are never re-transformed.
              Originals are stored immutably in CDN cold storage (F932 ICdnStorageService).
ALTERNATIVES:
  A) Re-transform from previous variant: allows chained transforms; but quality degrades
     (lossy formats); provenance lost. REJECTED.
  B) Store all intermediate variants: full provenance; but exponential storage growth. REJECTED.
  C) Single-pass from original (CHOSEN): original immutable; all variants derived from original
     re-derive on demand; predictable quality; storage = original + named variants only.
RATIONALE:    22-visual-editor-deep-search.md (media pipeline requirements).
              Single-pass from original is the industry standard (imgix, Cloudinary model).
              Aligns with QUEUE FABRIC async processing (F933 IMediaProcessingQueueService).
SOURCES:      22-visual-editor-deep-search.md; 22-visual-editor-deep-search-engine.md
ENFORCING:    F931, F932, F933, T344, T345, CF-426, SK-208
```

---

### DD-202 — SEO Outputs are Engine-Generated (Not Handwritten)

```
ID:           DD-202
DOMAIN:       SEO & Routing (Family 131 extension)
DECISION:     Sitemap XML, RSS feeds, OG images, structured data (JSON-LD), and canonical
              redirects are generated by the engine at publish time (F927 ISeoMetaService,
              F930 ISitemapService). Admins configure rules; engine generates output.
ALTERNATIVES:
  A) Manual SEO markup: error-prone; requires developer per-page. REJECTED.
  B) Plugin/third-party SEO tool: external dependency; breaks FREEDOM architecture. REJECTED.
  C) Engine-generated SEO outputs (CHOSEN): admins configure SEO rules as FREEDOM config
     engine generates canonical sitemap/RSS/OG at publish time via T340; zero manual markup.
RATIONALE:    FREEDOM principle: admins configure, engine generates.
              SEO outputs must be consistent, complete, and not require developer intervention.
SOURCES:      22-visual-editor-deep-search.md (SEO requirements); basic_prompt.txt (FREEDOM)
ENFORCING:    F927, F930, T340, CF-417, SK-210
```

---

### DD-203 — BFA Registers FLOW-22 Entities Against All Prior Flows at Provision Time

```
ID:           DD-203
DOMAIN:       BFA Cross-Flow Validation
DECISION:     On workspace provisioning (F941), the BFA automatically registers all
              FLOW-22 entity types, event topics, and API paths against the global
              BFA index. Conflict checks run at provision time before any content is created.
ALTERNATIVES:
  A) Lazy registration (register on first use): defers conflicts to runtime; too late. REJECTED.
  B) Manual BFA registration by developers: error-prone; easily forgotten. REJECTED.
  C) Provision-time auto-registration (CHOSEN): F941 provisioning step includes BFA index
     update; conflicts with FLOW-01–FLOW-17 detected before workspace is activated.
RATIONALE:    22-visual-editor-deep_search_engine_multi_tenant.md: workspace provisioning
              must be atomic and validated. BFA must catch conflicts before users encounter them.
              Aligns with "BFA detects conflicts BEFORE code ships" (basic_prompt.txt).
SOURCES:      basic_prompt.txt (BFA guardrails); 22-visual-editor-multi-tenant-support.md
ENFORCING:    F941, CF-414, CF-429, T346, AF-9 quality gate
```

---

## DESIGN RECORDS — FLOW-22

Design Records document WHAT was built and PROVE it conforms to requirements.
Format: ID | Requirement → Implementation traceability | Validation evidence

---

### DR-144 — Visual Editor Canvas: Requirement Traceability

```
ID:           DR-144
REQUIREMENT:  22-visual-editor.md: "drag-and-drop visual editor for page composition
              with component library, undo/redo, and live preview"
IMPLEMENTATION:
  F901 IPageTreeService          → page tree storage + snapshot for undo/redo
  F902 IComponentRegistryService → component library (versioned, append-only per DD-199)
  F903 IEditorCanvasService      → drag-and-drop canvas orchestration
  F904 ILivePreviewService       → SSR live preview per DD-193
  T327 (Visual Edit Node)        → engine contract for canvas mutation
  T329 (Canvas Snapshot)         → undo/redo snapshot management
  T330 (Live Preview Render)     → SSR preview rendering contract
VALIDATION:
  CF-402 (component version locked at placement)
  CF-407 (snapshot before mutation)
  CF-423 (preview always SSR)
  SK-201 (RAG: page tree mutation patterns)
STATUS:       COMPLETE ✅
```

---

### DR-145 — CMS Post Lifecycle: Requirement Traceability

```
ID:           DR-145
REQUIREMENT:  22-visual-editor.md: "headless CMS with post types, editorial workflow
              (draft/review/published), and scheduled publishing"
IMPLEMENTATION:
  F907 IPostTypeRegistryService  → admin-defined post types (JSON Schema 2020-12, DD-192)
  F908 IPostContentService       → content authoring + optimistic concurrency (DD-196)
  F911 IEditorialWorkflowService → draft→review→published state machine
  F916 IContentSchedulerService  → scheduled publish (RFC 3339, T337)
  F917 IPublishGatekeeperService → pre-publish validation gate
  T332 (Draft Content)           → content authoring engine contract
  T333 (Publish Gate)            → gatekeeper + schedule branch
  T336 (Publish Saga)            → async publish pipeline with compensation
  T337 (Scheduled Publish)       → time-triggered publish contract
VALIDATION:
  CF-404 (PostType changes additive only)
  CF-405 (publication state machine transitions)
  CF-412 (no direct-to-published without review gate)
  SK-202 (RAG: schema patterns), SK-204 (RAG: concurrency patterns)
STATUS:       COMPLETE ✅
```

---

### DR-146 — Publishing Pipeline: Requirement Traceability

```
ID:           DR-146
REQUIREMENT:  22-visual-editor-deep-search.md: "static site generation pipeline with
              CDN invalidation, sitemap, RSS, and structured data output"
IMPLEMENTATION:
  F918 IPublishEventBusService   → CloudEvents envelope (DD-194) for pipeline steps
  F919 IStaticBuildService       → SSG build pipeline
  F920 IRenderRuntimeService     → SSR for preview (hybrid DD-193)
  F921 ICdnInvalidationService   → CDN cache invalidation post-build
  F927 ISeoMetaService           → structured data / OG image generation (DD-202)
  F930 ISitemapService           → sitemap XML + RSS feed generation (DD-202)
  T336 (Publish Saga)            → coordinated pipeline with compensation
  T339 (SSR/SSG Render Gate)     → routing to correct render mode
  T340 (SEO Build Gate)          → SEO outputs at publish time
VALIDATION:
  CF-413 (CDN invalidation before new content visible)
  CF-423 (preview always SSR)
  CF-425 (CloudEvents envelope on all events)
  SK-206 (RAG: publish saga patterns), SK-210 (RAG: SEO patterns)
STATUS:       COMPLETE ✅
```

---

### DR-147 — Design Token System: Requirement Traceability

```
ID:           DR-147
REQUIREMENT:  22-visual-editor-deep-search-engine.md: "design token system with
              inheritance tree, theme variants, and build-time CSS variable resolution"
IMPLEMENTATION:
  F926 IDesignTokenService        → token inheritance tree storage + resolution (DD-198)
  F903 IEditorCanvasService       → token-aware canvas rendering
  F919 IStaticBuildService        → build-time CSS Custom Property injection (DD-198)
  F923 IThemeVariantService       → admin-configurable theme variants
  T341 (Token Propagation)        → engine contract for token change → rebuild trigger
  T342 (Theme Variant Switch)     → variant activation contract
VALIDATION:
  CF-410 (design token changes trigger rebuild)
  CF-422 (tokens resolved before build outputs)
  SK-202 (extended: token inheritance patterns)
  DD-198 (architectural rationale)
STATUS:       COMPLETE ✅
```

---

### DR-148 — Media Pipeline: Requirement Traceability

```
ID:           DR-148
REQUIREMENT:  22-visual-editor-deep-search.md: "asset management with image transforms
              (WebP, responsive sets), CDN storage, and async processing queue"
IMPLEMENTATION:
  F931 IMediaTransformService      → single-pass transforms from original (DD-201)
  F932 ICdnStorageService          → immutable cold storage for originals
  F933 IMediaProcessingQueueService → async transform queue via QUEUE FABRIC
  F934 IMediaMetadataService       → EXIF, alt-text, dimensions metadata
  T344 (Asset Upload)              → upload + original storage contract
  T345 (Image Transform)           → WebP + responsive set generation contract
  T346 (Asset Replace)             → replace original + re-derive all variants
VALIDATION:
  CF-426 (originals immutable after upload)
  CF-427 (transforms queue-async, not blocking upload response)
  SK-208 (RAG: asset pipeline patterns)
  DD-201 (single-pass rationale)
STATUS:       COMPLETE ✅
```

---

### DR-149 — AI Content Assist: Requirement Traceability

```
ID:           DR-149
REQUIREMENT:  22-visual-editor.md: "AI-powered content suggestions, auto-tagging,
              and SEO recommendations integrated into the editor"
IMPLEMENTATION:
  F928 IAiContentAssistService     → non-blocking AI suggestions via AI ENGINE FABRIC (DD-200)
  F929 IAiTaggingService           → auto-tagging via IAiProvider.GenerateAsync()
  F935 ISeoRecommendationService   → SEO recommendations via AI + rule engine hybrid
  T343 (AI Content Suggestion)     → fire-and-suggest async contract
  T334 (Editorial Review + AI Assist) → AI assist in review workflow
VALIDATION:
  CF-416 (AI assist non-blocking on save path)
  CF-419 (AI provider resolved via AI ENGINE FABRIC only)
  SK-205 (extended: feed query + AI assist patterns)
  DD-200 (non-blocking rationale)
STATUS:       COMPLETE ✅
```

---

### DR-150 — Multi-Tenant Workspace Isolation: Requirement Traceability

```
ID:           DR-150
REQUIREMENT:  22-visual-editor-deep-search-engine-multi-tenant.md: "per-workspace
              isolation for all resources, users, sites, and content"
IMPLEMENTATION:
  F941 IWorkspaceProvisionService  → atomic workspace creation + BFA registration (DD-203)
  F942 IWorkspaceRoleService       → RBAC within workspace boundary
  F943 IWorkspaceBillingService    → per-workspace usage tracking + limits
  F944 IWorkspaceAnalyticsService  → per-workspace analytics (scope-isolated)
  T346 (Workspace Provision)       → provision + BFA register contract
  DNA-5 Scope Isolation            → workspaceId on every query (≡ tenantId)
VALIDATION:
  CF-414 (workspaceId on all FLOW-22 queries)
  CF-429 (workspace provision atomic + BFA validated)
  DD-197 (workspace = tenantId rationale)
  AF-7 compliance scan: workspaceId presence
STATUS:       COMPLETE ✅
```

---

### DR-151 — Genie DNA Full Compliance Audit: FLOW-22

```
ID:           DR-151
AUDIT TYPE:   Full DNA compliance check — all 6 patterns vs FLOW-22 factories
SCOPE:        F901–F944 (44 factories), T327–T346 (20 task types)

DNA-1 parse_document (Dictionary, not typed models):
  STATUS: ✅ ALL 44 factories use dict[str, Any] via ObjectProcessor
  EVIDENCE: T327 IR: "content payload must be parsed via parse_document — no typed models"
            CF-402, CF-408, SK-201 all enforce Dictionary-first patterns

DNA-2 build_search_filter (empty fields auto-skipped):
  STATUS: ✅ ALL DATABASE FABRIC calls in FLOW-22 use build_search_filter
  EVIDENCE: F901, F908, F911, F922, F925, F937 all reference build_search_filter in IRON RULES

DNA-3 DataProcessResult[T] (never throw for business logic):
  STATUS: ✅ ALL task types return DataProcessResult; iron rules prohibit throws
  EVIDENCE: All T327–T346 IRON RULES include "return DataProcessResult on all errors"
            CF-415 prohibits exceptions in publish pipeline

DNA-4 MicroserviceBase (19 components inherited):
  STATUS: ✅ ALL generated services extend MicroserviceBase (IRON RULES enforce)
  EVIDENCE: T327 IR-1: "all services extend MicroserviceBase"; repeated in every task type
            AF-7 Compliance station validates this at generation time

DNA-5 Scope Isolation (workspaceId ≡ tenantId on every query):
  STATUS: ✅ workspaceId present on all F901–F944 queries per DD-197
  EVIDENCE: CF-414 enforces workspaceId; AF-7 compliance scan flags any missing workspaceId

DNA-6 DynamicController (no entity-specific controllers):
  STATUS: ✅ All FLOW-22 APIs route through DynamicController
  EVIDENCE: No entity-specific controller created in F901–F944 definitions
            CF-402 (component), CF-404 (post type) both enforce DynamicController routing

OVERALL DNA COMPLIANCE: ✅ 6/6 — ZERO VIOLATIONS
PROMOTION LADDER:       GENERATED → INJECTED (after AF-6/AF-7 pass) → MINIMAL → CORE
STATUS:       COMPLETE ✅
```

---

## CROSS-REFERENCE MAP — FLOW-22

```
22-visual-editor.md                            → Families 128, 85, 86, 88
22-visual-editor-deep-search.md                → Families 129, 86, 87, 89 (media)
22-visual-editor-deep-search-engine.md         → Families 128, 87, 88, 89 (tokens)
22-visual-editor-deep-search-engine-multi-tenant.md → Family 134

DD-192  → F907, F909, SK-202
DD-193  → F904, F919, F920, SK-209
DD-194  → F918, CF-425
DD-195  → F901, F908, F922
DD-196  → F908, F911, SK-204
DD-197  → F941–F944, CF-414
DD-198  → F926, F919, F923
DD-199  → F902, CF-402
DD-200  → F928, F929, CF-416
DD-201  → F931, F932, F933
DD-202  → F927, F930, CF-417
DD-203  → F941, CF-429

DR-144   → F901–F904, T327, T329, T330
DR-145  → F907, F908, F911, F916, F917, T332, T333, T336, T337
DR-146  → F918–F921, F927, F930, T336, T339, T340
DR-147  → F919, F923, F926, T341, T342
DR-148  → F931–F934, T344–T346
DR-149  → F928, F929, F935, T334, T343
DR-150  → F941–F944, T346
DR-151  → All F901–F944, all T327–T346 (DNA audit)
```

---

## BACKWARD COMPATIBILITY
```
DD-1–DD-191:  UNCHANGED ✅
DR-1–DR-143:   UNCHANGED ✅
New: DD-192–DD-203 (12 design decisions)
New: DR-144–DR-151 (8 design records)
System total: DD-1–DD-203 | DR-1–DR-151
```

---

## SAVE POINT: FLOW22:P5:INDEX:COMPLETE ✅
## Recovery: "FLOW-22 P5 complete. DD-192–DD-203 / DR-144–DR-151. Continue with P6 session state."


---
---

# ═══════════════════════════════════════════════════════════════
# FLOW-23 — Visual Editor Extended: DD-204–DD-218, DR-152–DR-163
# Merged: 2026-02-27
# ═══════════════════════════════════════════════════════════════

# XIIGen UNIFIED SOURCE INDEX — FLOW-23: Visual Editor Extended
## Delta File — DD-204–DD-218 (15 design decisions), DR-152–DR-163 (12 design records)
## Extends: UNIFIED_SOURCE_INDEX_MERGED.md (DD-1–DD-203, DR-1–DR-151)

---

## DESIGN DECISIONS — FLOW-23 (DD-204–DD-218)

### DD-204 — UI Fabric-First: Zero Platform-Specific Values in Canvas Layer
**Decision:** The canvas UI layer contains no platform-specific values. All database providers, queue endpoints, AI model names, and framework identifiers are resolved through fabric interfaces via config. The canvas service never imports `ElasticsearchClient`, `StackExchange.Redis`, `OpenAI`, or `ReactDOM` directly.
**Alternatives Considered:**
- Platform-specific: faster initial dev, but locks architecture to single provider stack
- Partial abstraction: some direct imports for "known" providers
**Rationale:** Consistent with V39/V40 engine philosophy. Any canvas deployment swaps providers via config without code change. UI = fabric-first, no exceptions.
**Impact:** All 37 FLOW-23 factories resolve via `IExternalServiceFactory<TService>.CreateAsync()`. No direct imports anywhere.
**Binding Sources:** basic_prompt.txt Layer 0; V39 ENGINE DESIGN; DR-152
**Status:** APPROVED ✅

---

### DD-205 — Node Tree Storage: Elasticsearch + Redis Tiered Architecture
**Decision:** Canvas node trees stored in two tiers: Redis (hot state, sub-100ms writes/reads for active editing) and Elasticsearch (durable cold state, full-text search across node properties).
**Alternatives Considered:**
- ES only: simpler, but too slow for real-time collaborative editing (target: < 50ms round-trip)
- PostgreSQL only: ACID but poor search performance for node property queries
- Redis only: too volatile; no durability guarantee for published canvas states
**Rationale:** Redis hot path enables interactive editing latency. ES provides searchable, durable, versioned node tree storage. Pattern matches FLOW-12 (Chat) hot/cold architecture.
**Impact:** F945 (ES) + F946 (Redis) — two factory interfaces, both through DATABASE FABRIC (SK-382 (ElasticsearchDatabase))
**Binding Sources:** DR-153; 23-visual-editor-extended-deep-search-engine.md
**Status:** APPROVED ✅

---

### DD-206 — Canvas Collaboration: Queue Fabric, Not WebSocket Direct
**Decision:** All real-time collaborative canvas events (node moves, edits, presence) are published through QUEUE FABRIC (SK-383 (RedisStreamQueue) Redis Streams consumer groups). Canvas clients subscribe to their stream. No direct WebSocket connections between canvas service instances.
**Alternatives Considered:**
- Direct WebSocket hub: lower latency for single-instance, but breaks at multi-instance scale
- Server-Sent Events: one-way; not suitable for bidirectional collaboration
**Rationale:** DNA compliance — inter-service communication via Queue Fabric only. Redis Streams consumer groups provide fan-out, replay, consumer group isolation per tenant.
**Impact:** F950 + F952 handle all collaboration events. SK-221 implements consumer group pattern.
**Binding Sources:** basic_prompt.txt Layer 0 (QUEUE FABRIC); DR-154
**Status:** APPROVED ✅

---

### DD-207 — Layout Solver: Pure Computation on MicroserviceBase, No AI
**Decision:** The layout solver (F953) is deterministic pure computation extending MicroserviceBase. It does not call any AI provider. Flex/Grid bounding box math is algorithmically stable and must produce identical output for identical input.
**Alternatives Considered:**
- AI-assisted layout solving: would introduce non-determinism; breaks idempotency requirement
- External layout engine library: breaks fabric-first philosophy; direct import
**Rationale:** Layout correctness requires determinism. AI is used for advisory suggestions only (T352) — never for the deterministic solve. Designers need confidence that re-running layout produces the same result.
**Impact:** F953 → CORE FABRIC (MicroserviceBase), not AI ENGINE FABRIC. AF-5 (multi-model) not used in T349.
**Binding Sources:** basic_prompt.txt Layer 2 (MACHINE/FREEDOM); DR-155
**Status:** APPROVED ✅

---

### DD-208 — Data Binding: JSONPath `$.skill_XX.field` Convention
**Decision:** All canvas data bindings use JSONPath convention `$.skill_XX.field` where XX is the skill number that produces the content. This creates explicit cross-skill dependency declarations on every canvas node.
**Alternatives Considered:**
- Custom binding DSL: more expressive but requires custom parser
- Template str interpolation `{{skill_05.post.title}}`: less standard, harder to validate
**Rationale:** JSONPath is industry-standard; parseable by existing libraries; binding validator (F965) can cross-reference against skill output schemas registered in BFA.
**Impact:** All binding paths in node documents use `$.skill_XX.field`. SK-214 implements resolution. CF-446 enforces cross-flow skill schema validation.
**Binding Sources:** 23-visual-editor-extended.md node schema; DR-157
**Status:** APPROVED ✅

---

### DD-209 — Template Mode: Read-Only Against Production Content
**Decision:** Template Mode (F961) is strictly read-only against FLOW-02 production content indices. Preview state is stored in Redis session-isolated keys. No preview write ever reaches production Elasticsearch.
**Alternatives Considered:**
- Draft copies in separate ES index: adds index management overhead; risks stale data
- In-memory only: not recoverable on browser refresh; poor UX
**Rationale:** Designers must see real production content to validate layouts. But preview interactions must never corrupt live content. Redis TTL-based preview state is self-cleaning.
**Impact:** CF-442, CF-444 BFA rules enforce this. ST-246 stress test verifies.
**Binding Sources:** 23-visual-editor-extended-deep-search-engine.md Template Mode section; DR-158
**Status:** APPROVED ✅

---

### DD-210 — Multi-Tenant Model: Hybrid Pool/Silo/Bridge
**Decision:** FLOW-23 implements the hybrid isolation portfolio. Default = shared schema (pool) with `tenantId` on every row. Enterprise tenants graduate to separate schema (bridge) or separate database (silo) based on compliance and contractual criteria.
**Alternatives Considered:**
- Pool only: insufficient for regulated enterprise tenants
- Silo only: too expensive for small tenants; poor unit economics
- Fixed two-tier: not flexible enough for varying compliance needs
**Rationale:** Industry SaaS guidance recommends bridge model for flow engines serving mixed-compliance tenant bases. Pool for SMB, bridge/silo for enterprise.
**Impact:** F971 (ITenantTieringService) manages graduation. T362 orchestrates migration. CF-447 enforces isolation gate.
**Binding Sources:** 23-visual-editor-extended-engine-multi-tenant.md §Tenant storage models; DR-160
**Status:** APPROVED ✅

---

### DD-211 — CloudEvents Envelopes Required for All Async Canvas Events
**Decision:** Every asynchronous canvas event published to QUEUE FABRIC must be wrapped in a CloudEvents v1.0 envelope with `tenantId` as an extension attribute.
**Alternatives Considered:**
- Raw JSON payload: simpler but no standard tenant propagation mechanism
- Custom envelope: non-standard; harder to integrate with observability tools
**Rationale:** CloudEvents provides standardized event metadata. OTLP trace context can be carried in envelope. Tenant context propagation across async boundaries is explicitly solved by CloudEvents extension attributes.
**Impact:** F969 wraps all events. CF-433, CF-435, CF-449 verify stream key namespacing. SK-220 implements envelope creation.
**Binding Sources:** 23-multi-tenant.md §CloudEvents; IETF Idempotency-Key; DR-161
**Status:** APPROVED ✅

---

### DD-212 — Code Export: Multi-Model Consensus via AiDispatcher
**Decision:** UI code export (T363) uses AiDispatcher (F975) to run 3+ competing AI models in parallel and merge outputs via AF-10. No single model generates the final code. AF-9 quality gate (score ≥ 0.8) required before export available to designer.
**Alternatives Considered:**
- Single best model: faster but less robust; model updates can silently degrade quality
- Sequential refinement: slower; better for complex code but insufficient for canvas export latency
**Rationale:** Consistent with V40 ENGINE-FABRIC-FIRST multi-model pattern. Framework adapter (F976) via IAiProvider ensures no model is hardcoded. AF-11 feedback loop improves model selection over time.
**Impact:** T363 AF CONFIGURATION includes AF-1, AF-5, AF-6, AF-7, AF-9, AF-10, AF-11.
**Binding Sources:** basic_prompt.txt Layer 3 (AF Stations); DR-162
**Status:** APPROVED ✅

---

### DD-213 — Design Tokens: Elasticsearch Single Source of Truth
**Decision:** Design tokens (colors, fonts, spacing, radii, shadows) are stored in a dedicated Elasticsearch index per tenant via F977. All canvas nodes, component variants, and exported code reference token keys, never raw values.
**Alternatives Considered:**
- Hardcoded in component definitions: violates FREEDOM principle; requires code deploy to change
- Per-canvas token sets: causes token divergence across canvases; admin nightmare
**Rationale:** Single ES index = single source of truth. Token updates propagate via QUEUE FABRIC to all referencing nodes without code deployment. This is the Freedom Machine philosophy applied to design.
**Impact:** F977, F948, F952 implement token sync. T353, T364 execute propagation. CF-439 prevents stream collision.
**Binding Sources:** 23-visual-editor-extended.md §Theme tokens; Freedom Machine philosophy; DR-163
**Status:** APPROVED ✅

---

### DD-214 — Canvas State Machine: Designing → Review → Published
**Decision:** Every canvas flow has an explicit state machine with states: `Designing`, `Review`, `Published`. Transitions guarded by: designer approval (Designing→Review), AF-9 quality gate pass (Review→Published). Rollback supported from any state.
**Alternatives Considered:**
- No state machine: ad-hoc publish buttons; no audit trail; no approval workflow
- More states (Draft/Beta/Staging/Prod): valuable for enterprise but increases complexity
**Rationale:** Three-state machine captures the essential design lifecycle. FREEDOM layer allows extending states via config (e.g., adding `Staging` for enterprise tenants) without changing MACHINE logic.
**Impact:** SK-218 (FlowStateMachineService), F949 (PostgreSQL state store), T366 orchestrates transitions.
**Binding Sources:** 23-visual-editor-extended-deep-search-engine.md §State Machine Engine; DR-160
**Status:** APPROVED ✅

---

### DD-215 — Idempotency: IETF Idempotency-Key Semantics
**Decision:** Canvas "start flow run" and all external side-effect steps use `Idempotency-Key` header semantics via F970. Duplicate keys within TTL return cached result without re-executing side effects.
**Alternatives Considered:**
- At-least-once semantics only: simpler but requires all consumers to be idempotent
- Transaction IDs only: similar but not standardized; harder for external integrators
**Rationale:** IETF Idempotency-Key draft provides standard semantics. Critical for canvas operations under network retry (CF-190 pattern). OWASP API6 sensitive flow abuse defense.
**Impact:** F970 implements idempotency store (Redis). T360 checks key before every canvas operation.
**Binding Sources:** 23-multi-tenant.md §Idempotency; IETF draft; DR-161
**Status:** APPROVED ✅

---

### DD-216 — Role Extraction: Auth Context Only, Never Request Body
**Decision:** User role in canvas constraint enforcement is always extracted from MicroserviceBase auth context (`_authContext.GetClaim("role")`). Never from request body, URL parameter, or client-provided header.
**Alternatives Considered:**
- Role in request body: simpler client code but trivially exploitable (OWASP API1)
- Role in X-Custom-Header: non-standard; not protected by auth middleware
**Rationale:** OWASP API1 (BOLA) requires server-side role validation. MicroserviceBase auth context is JWT-validated. Prevents privilege escalation by forged request body.
**Impact:** SK-217 (RoleLockService), F972 (OIDC/SCIM), T355 (Constraint Gate). CF-441 verifies FLOW-01 role alignment.
**Binding Sources:** basic_prompt.txt Layer 4 (DNA-5 scope isolation); OWASP API1; DR-160
**Status:** APPROVED ✅

---

### DD-217 — Sandbox Isolation: Redis Hot State, Never ES Production
**Decision:** Canvas sandbox execution uses Redis hot state (F946) exclusively. Sandbox results never reach production Elasticsearch (F945) until explicit promotion via `PromoteSandboxToProduction`.
**Alternatives Considered:**
- Separate ES index for sandbox: ES overhead for transient execution state is too high
- In-memory only: not persistent; browser refresh loses sandbox
**Rationale:** Redis TTL-based sandbox state is ephemeral by default. Only explicit promotion writes to ES. This provides a safe preview environment matching Promotion Ladder pattern (GENERATED → INJECTED → MINIMAL → CORE).
**Impact:** SK-222 (FlowSandboxService), F946 (Redis), T357 (Template Mode), T366 (Full DAG).
**Binding Sources:** basic_prompt.txt Layer 4 (Promotion Ladder); DR-153
**Status:** APPROVED ✅

---

### DD-218 — OTLP Telemetry: Tenant Labels at Controlled Cardinality
**Decision:** All FLOW-23 telemetry (metrics, traces, logs) emitted with `tenantId` label via F974 OTLP pipeline. Cardinality controlled: `tenantId` used as label, not individual user IDs, to keep metrics cardinality manageable.
**Alternatives Considered:**
- No tenant labels: cheaper but impossible to diagnose per-tenant performance issues
- User-level labels: full observability but cardinality explosion at scale (millions of users)
**Rationale:** `tenantId` label enables per-tenant SLA monitoring, noisy-neighbor detection, and billing metering without cardinality explosion. W3C trace context propagated through all async events.
**Impact:** F974 (OTLP MicroserviceBase wrapper), SK-220 (TenantIsolationHardeningService), T361 (CloudEvents envelope carries trace context).
**Binding Sources:** 23-multi-tenant.md §Observability; W3C Trace Context; DR-161
**Status:** APPROVED ✅

---

## DESIGN RECORDS — FLOW-23 (DR-152–DR-163)
*(Referenced in ENGINE_ARCHITECTURE — repeated here for unified index completeness)*

| DR # | Decision | Source DD |
|------|----------|-----------|
| DR-152 | Node tree stored as `dict[str, Any]` in Elasticsearch | DD-204 |
| DR-153 | Canvas hot state Redis + cold state ES tiered architecture | DD-205, DD-217 |
| DR-154 | Collaboration events via Redis Streams consumer groups | DD-206 |
| DR-155 | Layout solver pure computation, no AI | DD-207 |
| DR-156 | AI-assisted breakpoint resolution via AiDispatcher | DD-207 (AI for suggestions only) |
| DR-157 | Binding paths use `$.skill_XX.field` JSONPath convention | DD-208 |
| DR-158 | Template Mode READ-ONLY against production content | DD-209 |
| DR-159 | Content fallback via AiDispatcher when CMS field null | DD-209 |
| DR-160 | Multi-tenant hybrid pool/silo/bridge model | DD-210, DD-214, DD-216 |
| DR-161 | CloudEvents + idempotency + OTLP telemetry | DD-211, DD-215, DD-218 |
| DR-162 | Code export multi-model consensus + AF-9 gate | DD-212 |
| DR-163 | Design tokens in Elasticsearch, single source of truth | DD-213 |

---

## CROSS-REFERENCE INDEX — FLOW-23

| Artifact | FLOW-23 Range | Source Files |
|----------|---------------|-------------|
| Factories | F945–F981 | ENGINE_ARCHITECTURE delta |
| Families | 94–98 | ENGINE_ARCHITECTURE delta |
| Task Types | T347–T366 | TASK_TYPES_CATALOG delta |
| Templates | 56–61 | TASK_TYPES_CATALOG delta |
| BFA Rules | CF-430–CF-457 | V62_BFA_STRESS_TEST delta |
| Stress Tests | ST-242–ST-259 | V62_BFA_STRESS_TEST delta |
| Skills | SK-211–SK-222 | SKILLS_FACTORY_RAG delta |
| Design Decisions | DD-204–DD-218 | This file |
| Design Records | DR-152–DR-163 | This file + ENGINE_ARCHITECTURE |
| DNA Patterns | DNA-1–DNA-9 | Unchanged (stable) |
| Engine Primitives | EP-1–EP-5 | Unchanged (stable) |

---

## SOURCE INPUT DOCUMENTS — FLOW-23

| File | Domain | Key Contributions |
|------|--------|-------------------|
| 23 - visual editor extended.md | Canvas editor, layout, data binding | Node tree schema, layout primitives, binding bridge, role constraints |
| 23 - visual editor extended deep search engine.md | Flow engine for visual composition | State machine, event bus, API contracts, node graph, DAG orchestration |
| 23 - visual editor extended engine multi tenant.md | Multi-tenant hardening | Pool/silo/bridge model, CloudEvents, idempotency, quotas, OIDC/SCIM, OTLP |
| basic_prompt.txt | Engine architecture invariants | Fabric-first, factory pattern, DNA compliance, AF stations, promotion ladder |
| SESSION_STATE_MERGE.md | System state post FLOW-18 | Starting numbers: F945, T347, CF-430, SK-211, etc. |

---

---

# ═══════════════════════════════════════════════════════════════
# FLOW-24: Learning Calendar Extension (Personal AI Tutor)
# Factories F982–F1027 | Task Types T367–T374 | Families 140–146
# ═══════════════════════════════════════════════════════════════

### DD-220: Hybrid Sync/Async Quiz Completion Contract
**Decision:** Quiz submission uses the same hybrid contract as FLOW-05 (FLOW-05 gamification precedent). SYNC path ≤1s returns points_preview + badge_preview. All persistence (ledger, attempts, streak, plan adaptation) is ASYNC via Queue Fabric.  
**Rationale:** UX requires instant feedback (student sees points immediately). Data integrity requires durable events (no points lost if downstream fails). Same proven pattern from FLOW-05 reduces risk.  
**Pattern:** SYNC → compute only → return preview. ASYNC → enqueue all state mutations → consumer processes with retry + DLQ.  
**Cross-refs:** T369, Template 78, SK-228, CF-459, DR-165  
**Trade-off:** Eventual consistency — leaderboard may lag by seconds. Acceptable for educational context.

---

### DD-221: Graph-RAG for Curriculum Prerequisites
**Decision:** Curriculum prerequisite navigation uses Graph-RAG — a hybrid of graph DB traversal (F994, F996 → Neo4j via DB Fabric) combined with vector similarity search (F995 → RAG Fabric Hybrid strategy).  
**Rationale:** Pure vector search cannot model prerequisite dependency chains (e.g., "you must understand fractions before algebra"). Graph models the dependency; vector finds semantically similar concepts. Combining both gives correct ordering AND topic discovery.  
**Pattern:** F993 checks readiness via graph traversal. F995 finds semantically related topics via vector. Both contribute to topic selection in T368.  
**Cross-refs:** F993, F994, F995, F996, SK-226, T368  
**Alternatives rejected:** Linear vector search only (misses prerequisite ordering); Graph only (misses semantic similarity for enrichment).

---

### DD-222: Append-Only Ledger + Immutable Attempts
**Decision:** GamificationLedgerEvent (F1014) and QuizAttempt (F1010) tables are APPEND-ONLY. No UPDATE or DELETE ever. BigInt running totals maintained separately.  
**Rationale:** Anti-cheat (cannot retroactively modify points history), auditability (complete event trail), SOC2/ISO-27001 alignment, same pattern as DD-169 (Spend Ledger) from FLOW-20.  
**Pattern:** Every quiz completion appends a new ledger row. Totals derived from aggregation. Correction = compensating append event (negative points with reason).  
**Cross-refs:** F1014, F1010, SK-228, CF-462, IR-369-2 through IR-369-4  

---

### DD-223: Timezone Sovereignty for Streaks
**Decision:** Streak boundaries computed using the timezone stored in StudentProfile (F982), never from client request headers or client-supplied parameters.  
**Rationale:** Client timezone is untrusted (trivially spoofed to maintain streaks across midnight boundaries). Profile timezone is server-stored truth. This is "trust-critical" — identified explicitly in the product specification.  
**Pattern:** F1017.UpdateStreakAsync(studentId, tenantId, completionTimestampUtc) — timezone resolved internally from F982. No timezone parameter.  
**Cross-refs:** F1017, F982, SK-229, CF-464, ST-266  

---

### DD-224: Safety Gate as Non-Bypassable Blocking Step
**Decision:** ILessonSafetyGate (F1002) is a blocking step in every content generation pipeline. It issues a SafetyGateToken that F1003 (publish) requires. No publish path exists without a valid token.  
**Rationale:** Protects minors (age-appropriate content guarantee). Prevents LLM hallucination or unsafe content reaching students. Brand safety for enterprise tenants.  
**Pattern:** F1000 compose → F1002 evaluate → token issued → F1003 PublishAsync(content, safetyGateToken) — token is required parameter.  
**Cross-refs:** F1002, F1003, SK-225, CF-465, ST-267, IR-368-1, IR-368-2  
**Minor-specific:** isMinor=true → stricter moderation policy. No admin override for minor policy.

---

### DD-225: Calendar Connectors Behind Fabric Interface
**Decision:** Google Calendar (F1023) and Outlook Calendar (F1024) are implemented as fabric-backed connectors behind ICalendarConnector interface. Service code never imports calendar provider SDKs. Calendar operations are always queued via F1022 (QUEUE FABRIC) for durability.  
**Rationale:** "Fabric-first, zero platform-specific values" (basic prompt requirement). Calendar API failures must not fail the lesson generation flow. Queue provides retry + DLQ.  
**Pattern:** Service → F1022.EnqueueSyncAsync() → queue consumer resolves F1023 or F1024 via factory. No direct HTTP to Google/Outlook in service code.  
**Cross-refs:** F1022, F1023, F1024, F1025, SK-230, CF-466, IR-373-1 through IR-373-3  
**Supports:** New calendar providers (CalDAV, Apple Calendar) added via new connector factory without changing service code.

---

### DD-226: Server-Side Grading Only
**Decision:** IQuizGraderService (F1011) is the exclusive source of quiz scores and points. Client-submitted scores are rejected (not parsed, not logged as valid input).  
**Rationale:** Gamification integrity (prevents cheating). Consistent with FLOW-05 pattern. Required for educational certification contexts.  
**Pattern:** F1011.GradeAsync(sessionId, serverStoredAnswers) — answers retrieved from F1009 server-stored session, not from request body.  
**Cross-refs:** F1011, F1018, SK-228, CF-463, ST-265, IR-369-2  

---

### DD-227: FREEDOM Config for All Lesson + Gamification Parameters
**Decision:** All configurable lesson and gamification parameters are stored in Elasticsearch as FREEDOM config documents, accessible via F986/F987. Zero literal values in generated service code.  
**Rationale:** Freedom Machine principle — business admin or tenant admin changes lesson length, points values, badge thresholds, reminder policy without code changes or redeploys.  
**FREEDOM parameters list:**
- lesson_length_minutes, include_story, include_example_count, composition_model
- base_points_per_correct, streak_multiplier_cap, bonus_thresholds
- badge_thresholds, badge_names, badge_icons
- reminder_escalation_policy, quiet_hours_start, quiet_hours_end
- quiz_frequency, difficulty_ramp_rate
- curriculum_pack, subject_weights, sources_whitelist (developer pack)
- leaderboard_scope, refresh_interval  
**Cross-refs:** F986, F987, F1015, F1017, F1018, F1025, F1026, SK-227, SK-231, DD-219  

---

### DD-228: Consent Propagation in Async Event Chain
**Decision:** All FLOW-24 queue events include a consent_context envelope: { studentId, tenantId, isMinor, consentVersion }. ASYNC consumers re-validate consent at start. If consent was revoked between SYNC and ASYNC processing, the ASYNC consumer aborts and emits ConsentRevokedDuringProcessing event.  
**Rationale:** ASYNC consumers run independently; they cannot assume the SYNC path's consent check is still valid (user may revoke consent between milliseconds). GDPR/COPPA compliance requires consent to be valid at time of processing.  
**Pattern:** All T369 ASYNC path events carry consent_context. F983 called again at start of each async consumer.  
**Cross-refs:** F983, CF-472, T369, T371, SK-224  

---

## DESIGN RECORDS — FLOW-24

### DR-164: Calendar Connector Abstraction
**Context:** Students may use Google Calendar, Outlook, or CalDAV. Service code must not contain provider-specific logic.  
**Record:** All calendar operations route through: service code → F1022 queue → async consumer → ICalendarConnector factory resolution → F1023 or F1024 connector.  
**Effect:** Adding CalDAV or Apple Calendar support = new connector factory. Zero changes to lesson generation service.  
**Status:** DECIDED — implemented in T368, T373 templates.

---

### DR-165: Hybrid Sync/Async Boundary Definition
**Context:** Student UX requires instant quiz result feedback. Data integrity requires durable persistence.  
**Record:** SYNC path ends at: grade (F1011) + calculate preview (F1018) → return {points_preview, badge_preview}. ASYNC path begins after sync returns: all persistence steps via queue.  
**Effect:** Points preview shown immediately. Confirmed ledger event follows async. Eventual consistency gap is ≤2 seconds in normal operation.  
**Status:** DECIDED — implemented in Template 78, T369.

---

### DR-166: Append-Only Tables — DDL Constraints
**Context:** Append-only guarantee must be enforced at database level, not just application level.  
**Record:** PostgreSQL tables GamificationLedgerEvent and QuizAttempt have DDL-level triggers that RAISE EXCEPTION on UPDATE/DELETE operations. Migration CI gate checks for prohibited operations.  
**Effect:** Even if service code contains a bug or malicious migration is deployed, DB rejects modification attempts.  
**Status:** DECIDED — BFA migration scanner validates this.

---

### DR-167: Timezone Storage in StudentProfile
**Context:** Streak computation requires reliable timezone. Client headers are untrusted.  
**Record:** StudentProfile (F982) stores timezone as IANA timezone str (e.g., "Asia/Jerusalem"). Set during onboarding (T367). Updated only via authenticated profile update flow, not via any runtime request header.  
**Effect:** F1017 resolves timezone via F982 lookup. No parameter passing for timezone.  
**Status:** DECIDED — implemented in SK-229, CF-464.

---

### DR-168: SafetyGateToken Protocol
**Context:** To enforce that safety gate cannot be bypassed, publish must require proof of gate evaluation.  
**Record:** F1002.EvaluateAsync() returns a SafetyGateToken (signed str) on pass. F1003.PublishAsync(content, safetyGateToken) has token as required non-nullable parameter. Token validation includes: timestamp (expires in 60s), contentHash, isMinorPolicy flag.  
**Effect:** Reordering DAG steps so F1003 runs before F1002 fails at runtime (expired or missing token). AF-9 validates this at code-generation time.  
**Status:** DECIDED — implemented in Template 77, SK-225, CF-465.

---

### DR-169: Domain Pack Versioning
**Context:** Curriculum packs evolve (new topics added, removed, reweighted). Students mid-plan must not be disrupted.  
**Record:** ICurriculumPackService (F987) stores pack documents with version field. StudentProfile references pack_id + pack_version. Plan adaptation (F1021) reads from pinned pack_version unless student opts into latest version. Pack upgrades are non-breaking (additive only in same major version).  
**Effect:** Pack v2 can be deployed without affecting students on v1. Tenant admins can migrate cohorts on schedule.  
**Status:** DECIDED — implemented in F987, F1021.

---

### DR-170: Research Atom Citation Policy
**Context:** Developer pack (T372) ingests external content. Citations are required to prevent hallucinated facts.  
**Record:** F1002 extended with citation_validation_mode for T372. Every claim in a research digest must have sourceRef pointing to a URL in the whitelist. F1002 validates sourceRef resolves (HTTP HEAD check) and matches whitelist pattern. Uncertain claims must be tagged with { "certainty": "speculative" }.  
**Effect:** Research digests cannot be published with uncited claims. Students get reliable content with sources.  
**Status:** DECIDED — implemented in SK-225, T372, CF-470.

---

### DR-171: Multi-Tenant Soft Throttle for Education Flows
**Context:** AI quota management for education SaaS. Hard failures (quota exceeded → error) are unacceptable for students mid-lesson.  
**Record:** F985 ValidateAndConsumeQuotaAsync returns Success(false) on soft limit — this means "deferred to off-peak" not "failed". Lesson generation is enqueued for next off-peak window. Student sees "Your lesson is being prepared — check back in a few minutes." No error state.  
**Effect:** Students never see quota errors. Tenant admins see deferred count in analytics. Revenue signal for quota tier upgrade.  
**Status:** DECIDED — implemented in SK-232, CF-471.

---

## CROSS-REFERENCE INDEX — FLOW-24

| Artifact | Referenced By |
|----------|--------------|
| DD-219 (Domain Pack Config) | F987, T367, SK-226 |
| DD-220 (Hybrid Contract) | T369, Template 78, SK-228 |
| DD-221 (Graph-RAG) | F993, F994, F995, T368, SK-226 |
| DD-222 (Append-Only Ledger) | F1014, F1010, CF-462, SK-228 |
| DD-223 (Timezone Sovereignty) | F1017, F982, CF-464, SK-229 |
| DD-224 (Safety Gate Blocking) | F1002, F1003, CF-465, SK-225 |
| DD-225 (Calendar Fabric-First) | F1022, F1023, F1024, CF-466, SK-230 |
| DD-226 (Server-Side Grading) | F1011, CF-463, SK-228 |
| DD-227 (FREEDOM Config) | F986, F987, F1015–F1018, F1025–F1026 |
| DD-228 (Consent Propagation) | F983, CF-472, T369, SK-224 |
| DR-164 (Calendar Connector) | T368, T373, F1022–F1024 |
| DR-165 (Hybrid Boundary) | T369, Template 78 |
| DR-166 (DDL Constraints) | F1010, F1014, CF-462 |
| DR-167 (Timezone Storage) | F982, F1017, CF-464 |
| DR-168 (SafetyGateToken) | F1002, F1003, CF-465 |
| DR-169 (Pack Versioning) | F987, F1021 |
| DR-170 (Citation Policy) | T372, F1002, CF-470 |
| DR-171 (Soft Throttle) | F985, CF-471, SK-232 |

---

## BACKWARD COMPATIBILITY

All DD-1–DD-218 remain UNCHANGED.
All DR-1–DR-163 remain UNCHANGED.
FLOW-24 adds DD-219–DD-228 (10 new design decisions) and DR-164–DR-171 (8 new design records).

---

## SAVE POINT: FLOW24:UNIFIED_SOURCE_INDEX ✅
**Next design decision after FLOW-24:** DD-229
**Next design record after FLOW-24:** DR-172

---

# ═══════════════════════════════════════════════════════════════
# FLOW-25: Business Flow Arbiter — Design Decisions & Records
# DD-229–DD-244 | DR-172–DR-183
# ═══════════════════════════════════════════════════════════════

# Business Flow Arbiter — Design Decisions DD-229 through DD-241, Cross-References
# Extends: UNIFIED_SOURCE_INDEX_MERGED.md (DD-1–DD-228, DR-1–DR-171)
# Status: FLOW-22 NEW ARTIFACTS ONLY

---

## SAVE POINT: FLOW22:UNIFIED_INDEX:START
## Entering at DD-229 (next after DD-228 — Forms MT inherits FLOW-08+FLOW-14)

---

## DESIGN DECISIONS (DD-229 through DD-241)

---

### DD-229: BFA as Cross-Flow Governance, Not a Business Domain
```
DECISION:   The Business Flow Arbiter is classified as an ENGINE EXTENSION (meta-layer),
            not a business domain flow like FLOW-05 (Gamification) or FLOW-12 (Chat).
            It sits between the engine's code generation pipeline and flow publication,
            acting as a governance gate.

ALTERNATIVES CONSIDERED:
  A. Standalone microservice — REJECTED: Creates tight coupling to engine; not fabric-first
  B. Plugin to existing flow orchestrator — REJECTED: Conflates orchestration with governance
  C. Engine extension (chosen): 7 factory families extending existing fabrics

RATIONALE:  BFA must be fabric-first and provider-agnostic. Implementing it as engine extension
            means the same DATABASE, QUEUE, AI ENGINE, and RAG fabrics serve it — no new
            infrastructure. Future engine versions can swap providers without touching BFA logic.

IMPACT:     47 new factories (F1028-F1074) all resolve through existing fabric interfaces.
            Zero new fabric interfaces introduced in FLOW-22.

CROSS-REFS: DR-172, basic_prompt.txt Layer 0, Layer 1
```

---

### DD-230: Hybrid Conflict Detection Architecture
```
DECISION:   BFA uses a two-layer detection architecture:
            Layer 1 (Primary): Static deterministic rules (CF rules engine — F1036)
            Layer 2 (Advisory): AI semantic analysis via AiDispatcher (F1039)
            CRITICAL severity can only come from Layer 1 or Layer 1 + Layer 2 with evidence.
            Layer 2 alone cannot block a publish.

ALTERNATIVES CONSIDERED:
  A. Pure static rules only — misses implicit semantic conflicts
  B. Pure AI analysis — probabilistic, non-deterministic; cannot be sole gate
  C. Hybrid (chosen): deterministic safety + semantic coverage

RATIONALE:  A publish-blocking governance gate requires 100% repeatability for CRITICAL blocks.
            AI output is probabilistic; same input may yield different severity on different calls.
            Static rules provide the reliable safety net; AI provides the semantic safety net.

IMPACT:     T377 (static) always runs first. T378 (AI) is advisory.
            IR-378-2: AI CRITICAL without static backing → composite = HIGH max.

CROSS-REFS: DR-173, T377, T378, T379, SK-235, SK-236, SK-237
```

---

### DD-231: Change Type Taxonomy (4 Types)
```
DECISION:   BFA supports exactly 4 proposed change types:
            1. ENTITY_SCHEMA — entity field additions, removals, type changes, constraint changes
            2. FLOW_DAG — flow definition modifications (step additions, removals, re-ordering)
            3. API_CONTRACT — API endpoint additions, removals, signature changes
            4. CODE_AST — direct code changes with AST diff (lower-level; used for generated services)

ALTERNATIVES CONSIDERED:
  - INFRA_CONFIG as 5th type — DEFERRED: infrastructure changes require separate governance model
  - FREE_TEXT as a type — REJECTED: unstructured changes cannot be analyzed deterministically

RATIONALE:  4 types covers >95% of business logic change scenarios. INFRA_CONFIG deferred because
            infrastructure governance requires a separate framework (security posture, not flow logic).

IMPACT:     CF-473 enforces the 4-type constraint. Any change outside this taxonomy is rejected at intake.

CROSS-REFS: T375, CF-473, SK-233, F1028
```

---

### DD-232: ImpactReport as Output Contract (JSON Schema)
```
DECISION:   The ImpactReport is a formally defined JSON schema that ALL analysis outputs
            (both static and AI) must conform to before entering the arbitration pipeline.
            The schema is stored in Elasticsearch and versioned. Schema version is referenced
            in every ConflictReport document.

SCHEMA FIELDS (required):
  - proposed_change_id: str (UUID)
  - severity: enum [CRITICAL, HIGH, MEDIUM, LOW, NONE]
  - impacted_flows: array of { flow_id, flow_name, impact_type, details }
  - conflict_rules: array of { rule_id, rule_description, severity }
  - evidence_links: array of { doc_id, doc_type, excerpt_ref }
  - blast_radius: { direct: int, transitive: int, total: int }
  - analysis_method: enum [STATIC, SEMANTIC_AI, HYBRID]

RATIONALE:  Without a formal output schema, AI analysis can return free-text that is difficult
            to render consistently and impossible to validate programmatically. The schema
            constraint prevents hallucinated impact reports.

IMPACT:     F1040 (SemanticOutputValidatorService) validates all AI output against this schema.
            F1042 (ConflictReportAssemblerService) validates static output against same schema.

CROSS-REFS: T378, T379, SK-236, F1040, CF-479, IR-378-1
```

---

### DD-233: 4-Option Decision Menu (MACHINE)
```
DECISION:   The user-facing decision menu always contains exactly 4 options:
            1. REFACTOR_FLOWS — auto-refactor dependent flows to accommodate the change
            2. REJECT_CHANGE — cancel the proposed change; keep existing flows intact
            3. COMPAT_MODE — keep old field/endpoint + mark obsolete + set sunset date
            4. FORCE_PROCEED — apply the change regardless (elevated permission + mandatory rationale)

            This set is MACHINE (not FREEDOM-configurable). Administrators cannot add or remove options.
            FORCE_PROCEED rendering is gated by bfa:override permission (FREEDOM: who gets the permission).

RATIONALE:  A fixed decision set enables consistent audit records, unambiguous resolution code paths,
            and clear user mental model. The 4 options cover the full decision space
            (fix forward, cancel, backward compat, override).

IMPACT:     F1058 always builds exactly 4 options. CF-491 rejects any decision value outside this set.

CROSS-REFS: DD-234, T382, T383, F1058, CF-491, DR-176
```

---

### DD-234: FORCE_PROCEED Accountability Model
```
DECISION:   FORCE_PROCEED is available but requires:
            1. Actor must have bfa:override permission (tenant admin or platform admin assigns)
            2. Rationale text: mandatory, minimum 50 chars (FREEDOM: configurable minimum)
            3. Both bfa_tenant_audit_log AND bfa_override_log must be written before publish unblocks
            4. Override alert triggered if same actor overrides same entity_class > 3 times / 30 days
               (FREEDOM: threshold configurable)
            5. FORCE_PROCEED audit is permanent and cannot be deleted (DR-175)

RATIONALE:  Complete prohibition of FORCE_PROCEED creates workflow deadlocks when business requires
            urgent deployment. But unlimited force-proceed erodes governance. The accountability model
            allows it but makes misuse visible and costly.

IMPACT:     CF-492, CF-494, CF-498. DR-176, DR-180.
            F1070 (ForceOverrideTracker) monitors for threshold breaches.

CROSS-REFS: DD-233, T382, T383, T384, T385, SK-241, SK-242, F1070, DR-176, DR-180
```

---

### DD-235: Arbitration Session as First-Class Durable Entity
```
DECISION:   Every BFA arbitration run is a "session" (not a transient in-memory operation).
            Sessions are persisted to PostgreSQL with full state machine state.
            Sessions support interruption and resumption in < 60 seconds.
            Sessions have a lifecycle: IDLE → ... → RESOLVED/REJECTED/ERROR (terminal states).
            Completed sessions are retained for 90 days (FREEDOM: GDPR-configurable per tenant).

ALTERNATIVES CONSIDERED:
  A. Stateless REST request/response — REJECTED: cannot support int human-in-loop pauses (hours/days)
  B. In-memory state machine — REJECTED: not resumable across service restarts
  C. Durable session (chosen): supports multi-hour/multi-day pending resolution windows

RATIONALE:  Human resolution requires the system to wait indefinitely for a decision.
            This is fundamentally a int-running workflow, not a request-response operation.
            Durable session pattern (from DR-174) enables all orchestration and recovery requirements.

IMPACT:     F1043 + F1044. T381. All state transitions use persist-before-emit (DNA-8).
            Session rehydration < 60 seconds enables fast recovery (DR-174).

CROSS-REFS: DR-174, DR-175, T381, T383, F1043, F1044, SK-239
```

---

### DD-236: Dependency Index as Source of Truth for Blast Radius
```
DECISION:   The bfa_dependency_index (Elasticsearch) is the primary source of truth for
            determining which flows are potentially impacted by a proposed change.
            The index is populated by F1031 (IFlowDependencyIndexWriterService) after every
            flow publication. RAG vector search is supplementary — it may find implicit
            semantic dependencies not in the index, but the index determines the candidate set.

INDEX STRUCTURE:
  - flow_id: str
  - entity_name: str
  - access_type: enum [READ, WRITE, DELETE, CREATE]
  - field_paths: array of str (dot-notation paths: "profile.billing.address")
  - api_endpoints: array of str
  - tenant_id: str
  - updated_at: datetime
  - flow_version: int

RATIONALE:  A dependency index enables O(1) blast radius queries instead of O(n) full flow scans.
            Index freshness maintained by F1031 on every flow publish event.
            CF-475 detects staleness and triggers async re-index.

IMPACT:     F1031, F1035, F1037. T376, T380. SK-234, SK-238.

CROSS-REFS: DD-230, T376, T380, F1031, F1035, CF-475
```

---

### DD-237: Context Bundle Hybrid Retrieval Strategy
```
DECISION:   Context bundle for AI semantic analysis (T378) uses a hybrid retrieval approach:
            1. Deterministic: F1035 dependency index query → direct impacted flows (high recall, exact)
            2. Semantic: F1052 vector search over documentation → implicit related flows (high precision for
               business-meaning conflicts not captured in dependency index)
            3. Historical: F1056 decision history → precedent context for AI
            4. Design constraints: F1053 DR/DD entries → architectural constraints for AI reasoning

            All 4 retrieval paths run in parallel (AF-2 Planning decomposes them concurrently).

RATIONALE:  Dependency index alone misses "conceptually related" flows not linked by direct entity use.
            Vector search alone misses deterministic dependencies.
            Historical precedents help AI recognize patterns.
            Design records constrain AI from suggesting solutions that violate existing ADRs.

IMPACT:     F1050-F1054. T378. SK-243. Context bundle is the input to F1039 (SemanticConflictAnalyzer).

CROSS-REFS: DD-230, DD-236, T378, F1039, SK-243
```

---

### DD-238: COMPAT_MODE and Sunset Lifecycle
```
DECISION:   COMPAT_MODE decision creates a "compatibility wrapper" entry in bfa_compat_registry.
            The wrapper:
            1. Marks old field/endpoint as [Obsolete] in schema registry
            2. Creates mapping: old_field → new_field (or old_endpoint → new_endpoint)
            3. Sets sunset_date (default: now + 90 days, FREEDOM: configurable per tenant)
            4. Schedules sunset alert at sunset_date (via F1048/F1049 escalation mechanism)
            5. On sunset_date: triggers re-arbitration to force final resolution

            COMPAT_MODE is NOT permanent. It is a time-bounded backward compatibility bridge.

RATIONALE:  Allowing indefinite compatibility wrappers creates "compatibility debt" that becomes
            impossible to clean up. Mandatory sunset date ensures the debt is resolved.

IMPACT:     F1062. T384. CF-496. SK-241.

CROSS-REFS: DD-233, T384, F1062, CF-496
```

---

### DD-239: Multi-Tenant BFA Architecture
```
DECISION:   BFA multi-tenancy follows FLOW-08 (Payment Processing) + FLOW-14 (Warehouse) MT models.
            Three key isolation principles:
            1. Tenant conflict index: each tenant's dependency index is tenant-scoped (F1063)
            2. Tenant audit trail: per-tenant immutable audit log with GDPR retention (F1067)
            3. Tenant config: per-tenant BFA settings (F1065) — enable/disable, thresholds, channels
            
            Cross-tenant guard (F1064) operates at platform level — platform_admin role only.
            Never exposes per-tenant data across tenants (CF-501).

RATIONALE:  BFA deals with potentially sensitive business logic (entities, flows, data shapes).
            Strict tenant isolation prevents tenant-A from discovering tenant-B's flow architecture
            through conflict analysis outputs.

IMPACT:     F1063-F1068 (Family 152). T386, T387. SK-244.

CROSS-REFS: DR-178, T386, T387, F1063, F1064, F1065, FLOW-08 MT, FLOW-14 MT
```

---

### DD-240: BFA Analytics and Pattern Learning
```
DECISION:   After every resolved arbitration session, BFA emits:
            1. Tenant metrics (F1068) — arbitration KPIs per tenant
            2. Platform aggregates (F1069) — cross-tenant aggregated only
            3. Learnable patterns (F1072) — indexed to RAG for precedent suggestions
            4. OpenTelemetry spans (F1073) — end-to-end trace correlation
            5. Decision quality retrospective (F1071) — AI-powered post-decision quality scoring

            Retrospective quality scoring (F1071): 30 days after resolution, check if the chosen
            resolution held (no regressions, no emergency overrides on same entity).
            Score stored and fed back to AF-11 for generation quality improvement.

RATIONALE:  BFA without feedback is a one-way gate. With analytics and learning, BFA becomes
            self-improving: common patterns get precedent suggestions, quality scores
            improve AI calibration, and platform metrics surface systemic issues.

IMPACT:     F1068-F1074 (Family 153). T388. SK-245.

CROSS-REFS: DR-181, T388, F1071, F1072, AF-11
```

---

### DD-241: BFA Backward Compatibility Guarantee
```
DECISION:   FLOW-22 (BFA) is purely additive. The following guarantees are maintained:
            1. F1-F1027 factories: unchanged, no modifications
            2. T1-T374 task types: unchanged, no modifications
            3. CF-1-CF-472 BFA rules: unchanged, no modifications
            4. SK-1-SK-232 skills: unchanged, no modifications
            5. FLOW-01 through FLOW-24 DAGs: unchanged, no modifications
            6. DNA-1 through DNA-9: stable, no new DNA patterns in FLOW-22
            7. EP-1 through EP-5: stable, no new engine primitives

            BFA gate fires ONLY on proposed change submissions (event type: proposed_change.submitted).
            Normal flow execution (FLOW-01 through FLOW-24 task types) is NOT intercepted.

RATIONALE:  A governance gate that breaks existing flows contradicts its own purpose.
            BFA gates changes TO flows, not the execution of established flows.

IMPACT:     ST-291 (backward compatibility stress test) verifies this guarantee.

CROSS-REFS: SESSION_STATE_MERGE.md backward compatibility section, ST-291
```

---

## CROSS-REFERENCE INDEX (FLOW-22 NEW ARTIFACTS)

### Factory → Skill Cross-Reference
| Factory | Skill | Task Type |
|---------|-------|-----------|
| F1028 | SK-233 | T375 |
| F1029, F1030 | SK-233, SK-234 | T376 |
| F1031, F1035 | SK-234 | T376 |
| F1032, F1033, F1036, F1037, F1038 | SK-235, SK-238 | T377, T380 |
| F1039, F1040 | SK-236 | T378 |
| F1041 | SK-237 | T379 |
| F1042 | SK-237 | T379 |
| F1043, F1044, F1048 | SK-239 | T381 |
| F1045, F1046 | SK-246, SK-247 | T383 |
| F1047, F1061, F1062 | SK-241 | T384 |
| F1050, F1051, F1052, F1053, F1054, F1055, F1056 | SK-243 | T378 |
| F1057, F1058 | SK-240 | T382 |
| F1059, F1060 | SK-246, SK-247 | T383 |
| F1063–F1068 | SK-244 | T386 |
| F1067, F1070 | SK-242 | T385 |
| F1068–F1074 | SK-245 | T388 |

### CF Rule → Task Type Cross-Reference
| CF Rule | Task Type | Severity |
|---------|-----------|----------|
| CF-473 | T375 | CRITICAL |
| CF-474 | T375 | HIGH |
| CF-475, CF-476 | T376 | MEDIUM / CRITICAL |
| CF-477, CF-478, CF-479, CF-480 | T377 | CRITICAL / HIGH |
| CF-481, CF-482 | T378 | HIGH |
| CF-483, CF-484 | T379 | CRITICAL / HIGH |
| CF-485, CF-486 | T380 | MEDIUM / LOW |
| CF-487, CF-488 | T381 | CRITICAL / HIGH |
| CF-489, CF-490 | T382 | CRITICAL / MEDIUM |
| CF-491, CF-492, CF-493 | T383 | CRITICAL / INFO |
| CF-494, CF-495, CF-496 | T384 | CRITICAL / HIGH |
| CF-497, CF-498 | T385 | CRITICAL |
| CF-499, CF-500 | T386 | CRITICAL / HIGH |
| CF-501 | T387 | CRITICAL |

### Design Decision → Design Record Cross-Reference
| Design Decision | Design Record(s) | Theme |
|----------------|-----------------|-------|
| DD-229 | DR-172 | BFA as engine extension |
| DD-230 | DR-173 | Hybrid detection |
| DD-235 | DR-174, DR-175 | Durable sessions + immutability |
| DD-234 | DR-175, DR-176, DR-180 | FORCE_PROCEED accountability |
| DD-236 | DR-177 | Dependency index + cache |
| DD-239 | DR-178 | Multi-tenant inheritance |
| DD-241 | DR-179 | Precedent fast path (opt-in) |
| DD-240 | DR-181 | Analytics read-only |

### Skill → DNA Pattern Cross-Reference
| Skill | DNA Patterns Enforced |
|-------|----------------------|
| SK-233 (ParseChange) | DNA-1, DNA-3, DNA-4 |
| SK-234 (DependencyIndex) | DNA-1, DNA-2, DNA-3, DNA-5 |
| SK-235 (StaticConflict) | DNA-1, DNA-2, DNA-3 |
| SK-236 (SemanticAI) | DNA-1, DNA-3, DNA-4 |
| SK-237 (SeverityClassifier) | DNA-1, DNA-3 |
| SK-238 (BlastRadius) | DNA-1, DNA-3 |
| SK-239 (StateMachine) | DNA-1, DNA-3, DNA-7, DNA-8 |
| SK-240 (ImpactReport) | DNA-1, DNA-3, DNA-6 |
| SK-241 (ResolutionApplier) | DNA-1, DNA-3, DNA-5 |
| SK-242 (AuditTrail) | DNA-1, DNA-3, DNA-5, DNA-9 |
| SK-243 (ContextAggregator) | DNA-1, DNA-2, DNA-3, DNA-5 |
| SK-244 (MTGuard) | DNA-1, DNA-3, DNA-5 |
| SK-245 (Analytics) | DNA-1, DNA-3, DNA-5 |
| SK-246 (Notification) | DNA-1, DNA-3 |
| SK-247 (DecisionCapture) | DNA-1, DNA-3, DNA-7 |

---

## SAVE POINT: FLOW22:UNIFIED_INDEX:COMPLETE ✅
## Next: MASTER_EXECUTION_PLAN (P0–P7)


## ADDITIONAL DESIGN DECISIONS (DD-242 through DD-244)

DD-242: BFA GOVERNANCE OF VISUAL EDITOR COMPONENTS
  Context: FLOW-22/23 Visual Editor generates components with schemas that are entities in BFA's model
  Decision: All visual editor component schema changes must route through BFA arbitration
  Pattern: Fabric-First — BFA treats editor components as entities, no special-casing
  Evidence: CF-502, CF-503, SK-248

DD-243: FORCE_PROCEED BLOCKED FOR MINOR-SAFETY FLOWS
  Context: FLOW-24 School Pack has SafetyGateToken (DD-224) protecting minors
  Decision: FORCE_PROCEED resolution is permanently blocked for entities tagged with minor-safety
  Pattern: MACHINE — this is non-configurable, even admin cannot override
  Evidence: CF-504, SK-249, FLOW-24 DD-224

DD-244: USER-CREATED FLOWS MUST PASS BFA GATE
  Context: FLOW-18 allows users to visually create flows that reference existing entities
  Decision: User-created flows must pass full BFA arbitration before activation
  Pattern: MACHINE — governance applies equally regardless of flow origin
  Evidence: CF-508, SK-250

## ADDITIONAL DESIGN RECORDS (DR-182 through DR-183)

DR-182: BFA CROSS-FLOW INTEGRATION VERIFICATION
  Scope: Verified BFA governance covers FLOW-22/23/24 entity interactions
  Evidence: CF-502–CF-509, ST-292–ST-299, SK-248–SK-250
  Status: VERIFIED — all cross-flow integration points governed

DR-183: BFA BACKWARD COMPATIBILITY WITH FLOW-01–FLOW-24
  Scope: Verified FLOW-25 adds no modifications to existing FLOW-01–FLOW-24 artifacts
  Evidence: Zero changes to F1–F1027, T1–T374, CF-1–CF-472
  Status: VERIFIED — append-only merge


# XIIGen UNIFIED SOURCE INDEX — FLOW-26 ADDENDUM
# Self-Developing Meta-Flow: Design Decisions & Cross-References
## FLOW-26 ONLY | DD-245–DD-261 | DR-184–DR-195 (in ENGINE_ARCHITECTURE)
## Date: 2026-02-27

---

## SAVE POINT: DD235_DEFINED ✅

---

## DESIGN DECISIONS (FLOW-26 | DD-245–DD-261)

---

### DD-245 — Self-Build = Engine Extension, Not Standalone Automation
**Decision:** The self-build capability is implemented as a Meta-Flow running on top of all existing fabric interfaces — not as a separate automation script or CI/CD plugin.
**Rationale:** Using the engine's own fabric infrastructure for self-extension maintains the Fabric-First principle, enables reuse of all existing AF stations, and keeps the system coherent (the engine uses itself to grow itself).
**Pattern:** Freedom Machine — the Meta-Flow DAG is a JSON document stored in Elasticsearch, orchestrated by FlowOrchestrator (SK-392 (RagStrategyRegistry)).
**Affects:** F1075–F1102, all task types T411–T393, all templates 83–89.
**Cross-Ref:** DR-184, SK-259

---

### DD-246 — CapabilityGapDetected is the Universal Self-Build Trigger
**Decision:** `CapabilityGapDetected` is the canonical event that initiates any self-build run. It is always emitted via QUEUE FABRIC (Redis Streams), never triggered by direct function call.
**Rationale:** Event-driven trigger ensures the meta-flow can be triggered from any context (planner, operator command, scheduled gap scan) without coupling.
**Pattern:** Event-driven microservices — every inter-service trigger = event through queue.
**Affects:** F1075 ICapabilityGapDetectorService, T411 (Capability Gap Detection Gate).
**Cross-Ref:** DR-185, SK-251

---

### DD-247 — Fabric Resolution is Declared in Every Factory Spec
**Decision:** Every factory spec generated by the meta-flow MUST include a `fabricResolution` field declaring which fabric(s) it resolves through.
**Rationale:** Core engine contract requirement. Factory specs without fabric resolution are incomplete and will fail the contract completeness gate (F1084).
**Pattern:** Contract-first — fabric resolution declared before implementation.
**Affects:** F1082 IContractGeneratorService, F1083 IFactorySpecGeneratorService, all generated factory specs.
**Cross-Ref:** DR-187, SK-252, IR-990-1

---

### DD-248 — Genesis Loop Uses All 11 AF Stations in Order
**Decision:** The genesis loop (F1088) runs AF-1 → AF-2 → AF-3 → AF-4 → AF-5 → AF-6 → AF-7 → AF-8 → AF-9 → AF-10 → AF-11 in full. Skipping any AF station is forbidden.
**Rationale:** Each AF station serves a specific purpose. AF-7 (DNA compliance) and AF-8 (security) are non-negotiable. AF-4 (RAG) prevents wasteful rewrites. Skipping stations creates unverified code.
**Pattern:** Full AF pipeline for all generated code.
**Affects:** F1088 IGenesisLoopService, T397 (AF Station Pipeline Gate).
**Cross-Ref:** DR-186, SK-253, IR-995-1

---

### DD-249 — Deterministic Harness is Mandatory for All Generated Tests
**Decision:** Every test bundle generated by F1090 MUST include a deterministic harness that intercepts all fabric interface calls with pre-recorded fixtures.
**Rationale:** Generated code calls AI providers, databases, and queues. Live calls in tests = flaky tests. Deterministic harness enables reliable re-runs, offline testing, and CI stability.
**Pattern:** Record/replay testing pattern applied to fabric interfaces.
**Affects:** F1090 ITestBundleGeneratorService, F1091 IDeterministicTestHarnessService, all generated test bundles.
**Cross-Ref:** DR-190, SK-254, IR-998-1

---

### DD-250 — Evidence Bundle is the Single Source of Truth for Promotion
**Decision:** The promotion stage evaluation (F1102) uses ONLY the evidence bundle as input. No other signals or manual overrides affect stage assignment.
**Rationale:** Prevents gaming the promotion system. If evidence is complete and passing, stage is assigned deterministically. Subjective overrides create governance gaps.
**Pattern:** Evidence-based governance.
**Affects:** F1097 IEvidenceBundleAssemblerService, F1102 IPromotionLadderService.
**Cross-Ref:** DR-187, DR-193, SK-255, SK-257

---

### DD-251 — CORE Promotion Has No Config Override
**Decision:** The human approval gate for CORE promotion (IR-1009-1) cannot be bypassed via FREEDOM config, tenant settings, or operator commands.
**Rationale:** Documented risk: automated self-modification of production brain. The human gate is the architectural safety mechanism. No config should ever disable it.
**Pattern:** MACHINE component — fixed business logic.
**Affects:** F1102 IPromotionLadderService, T393 (Human Approval Gate).
**Cross-Ref:** DR-188, SK-258, IR-1009-1

---

### DD-252 — SelfBuildRun is Idempotent by RunId + PhaseId
**Decision:** Every phase of a SelfBuildRun is idempotent. Re-executing any phase with the same (runId, phaseId) produces the same result without side effects.
**Rationale:** Long-running meta-flows must survive interruption. Idempotency enables recovery by simply re-running from the current phase state.
**Pattern:** Idempotency-Key pattern (DNA-7). SelfBuildRunId + phaseId = idempotency key.
**Affects:** F1075–F1102 (all), SK-259 SelfBuildRun state machine.
**Cross-Ref:** DR-184, SK-259, DNA-7

---

### DD-253 — Reuse-First: RAG Scan Before Every Genesis Call
**Decision:** AF-4 RAG scan (SK-260 Reuse Decision Matrix) MUST complete before AF-1 Genesis begins. Genesis receives reuse decision (COPY/ADAPT/REWRITE) as context.
**Rationale:** Without reuse scanning, the engine regenerates existing patterns from scratch, wasting tokens and diverging from established conventions.
**Pattern:** Reuse-first AI generation philosophy.
**Affects:** F1078 IReuseDecisionMatrixService, F1079 IReuseScannerService, F1088 IGenesisLoopService.
**Cross-Ref:** DR-192, SK-260, SK-253

---

### DD-254 — Failure Signatures Drive All Repair Cycles
**Decision:** All retry loops (genesis, CI loopback, E2E loopback) are driven by failure signatures extracted by F1096. Raw logs are never passed directly to genesis.
**Rationale:** Raw logs contain irrelevant noise. Failure signatures provide targeted fix instructions that AF-1 can act on. Structured input → structured repair.
**Pattern:** Structured feedback loop.
**Affects:** F1092 IFixApplicationService, F1096 IFailureSignatureExtractorService, F1088 IGenesisLoopService.
**Cross-Ref:** SK-253, SK-261, IR-1003-1

---

### DD-255 — E2E Test Validates Original User Intent, Not Synthetic Test
**Decision:** The E2E test (F1095) executes the original flow that triggered the self-build (e.g., "text → video"), not a synthetic test constructed separately.
**Rationale:** Only by executing the user's original intent can we confirm the generated capability actually solves the stated need. Synthetic tests can pass while the real use case fails.
**Pattern:** Intent-first validation.
**Affects:** F1095 IE2EFlowTestService, T403 (E2E Flow Validation Gate).
**Cross-Ref:** DR-190, SK-254, IR-1002-1

---

### DD-256 — GitOps Branch Naming Encodes Tenant + RunId
**Decision:** All self-build branches follow the convention `self-build/{tenantId}/{runId}`. This is MACHINE (fixed).
**Rationale:** Branch naming enables: tenant isolation in CI systems, traceability from PR back to SelfBuildRun, automated cleanup by tenant.
**Pattern:** Convention-over-configuration for traceability.
**Affects:** F1098 IGitOpsAssimilationService, DR-191.
**Cross-Ref:** DR-191, SK-256, IR-1005-1

---

### DD-257 — Registry Update Only After PR Merge (Not PR Open)
**Decision:** F1101 IRegistryAssimilationService is only invoked after the PR has been merged and CI is green. Opening the PR does not register the factory.
**Rationale:** Pre-merge registration would make unvalidated capabilities available to the engine. Registry = production contract. Only validated, merged code enters the registry.
**Pattern:** Merge-gate-first registry writes.
**Affects:** F1101 IRegistryAssimilationService, F1099 IPrManagementService.
**Cross-Ref:** SK-256, IR-1008-1

---

### DD-258 — Capability Hot-Reload Unblocks Pending Flows
**Decision:** Upon CapabilityAssimilated event, F1076 triggers hot-reload which notifies FlowOrchestrator to re-evaluate all flows that were blocked on the gap.
**Rationale:** Without hot-reload notification, newly-assimilated capabilities remain unused until the next orchestration cycle. Immediate notification delivers the value of self-build to the requesting flow.
**Pattern:** Event-driven hot-reload + pending flow re-evaluation.
**Affects:** F1076 ICapabilityRegistryService, F1077 IFlowPlannerService, SK-262.
**Cross-Ref:** SK-262, DR-194

---

### DD-259 — BFA Registration is Mandatory Before GitOps Phase
**Decision:** The self-build flow has an explicit gate: BFA rules + event schemas + API contracts MUST be registered before the GitOps phase can begin.
**Rationale:** PR reviewers and CI tools need access to BFA conflict rules to validate the new code. Post-merge BFA registration means conflicts are discovered too late.
**Pattern:** Pre-commit safety gates.
**Affects:** F1087 IBfaDraftGeneratorService, F1085 IEventSchemaRegistryService, F1086 IApiContractRegistryService.
**Cross-Ref:** DR-194, SK-263, IR-994-2

---

### DD-260 — Recursive Sub-Flows Are First-Class Engine Templates
**Decision:** Sub-flows generated by SK-266 are stored as first-class flow templates in Elasticsearch (same format as parent flows). They are not embedded within their parent flow's DAG definition.
**Rationale:** Reusability. A polling sub-flow generated for video generation should be reusable for any other int-running async capability without re-generating it.
**Pattern:** Reusable flow template registry.
**Affects:** F1081 ICapabilityGraphService, F1077 IFlowPlannerService, SK-266.
**Cross-Ref:** DR-195, SK-266, IR-984-2

---

### DD-261 — Multi-Tenant Capability Sharing Requires Explicit Opt-In
**Decision:** Capabilities promoted by Tenant A are NEVER automatically available to Tenant B. Cross-tenant capability sharing requires an explicit sharing flow with separate BFA validation.
**Rationale:** Tenant data isolation (DNA-5). One tenant's self-built capability may use tenant-specific business logic or data patterns that are not safe or applicable for other tenants.
**Pattern:** Tenant-isolated capability registry; global sharing as an opt-in extension.
**Affects:** F1076 ICapabilityRegistryService, F1102 IPromotionLadderService, SK-265.
**Cross-Ref:** DR-189, SK-265, IR-983-1

---

## CROSS-REFERENCE MAP (FLOW-26)

### Factory → Task Type → Skill → Design Decision

| Factory | Task Type(s) | Primary Skill(s) | Design Decision(s) |
|---------|-------------|-----------------|-------------------|
| F1075 ICapabilityGapDetectorService | T411, T412 | SK-251 | DD-245, DD-246 |
| F1076 ICapabilityRegistryService | T412, T391 | SK-251, SK-262 | DD-246, DD-258 |
| F1077 IFlowPlannerService | T411, T393 | SK-259, SK-266 | DD-245, DD-260 |
| F1078 IReuseDecisionMatrixService | T392 | SK-260 | DD-253 |
| F1079 IReuseScannerService | T392 | SK-260 | DD-253 |
| F1080 ICapabilityManifestService | T412 | SK-251 | DD-247 |
| F1081 ICapabilityGraphService | T392, T393 | SK-266 | DD-260 |
| F1082 IContractGeneratorService | T393, T394 | SK-252 | DD-247 |
| F1083 IFactorySpecGeneratorService | T393 | SK-252 | DD-247 |
| F1084 ITaskTypeContractService | T394 | SK-252 | DD-247 |
| F1085 IEventSchemaRegistryService | T395 | SK-263 | DD-259 |
| F1086 IApiContractRegistryService | T395 | SK-263 | DD-259 |
| F1087 IBfaDraftGeneratorService | T396 | SK-263 | DD-259 |
| F1088 IGenesisLoopService | T397, T398 | SK-253 | DD-248, DD-254 |
| F1089 ICodeBundleValidatorService | T398 | SK-253 | DD-248 |
| F1090 ITestBundleGeneratorService | T399 | SK-254 | DD-249 |
| F1091 IDeterministicTestHarnessService | T399, T400 | SK-254 | DD-249 |
| F1092 IFixApplicationService | T398 | SK-253, SK-261 | DD-254 |
| F1093 ISandboxOrchestratorService | T401, T402 | SK-264, SK-265 | DD-252 |
| F1094 IEphemeralDeployService | T402 | SK-264 | DD-252 |
| F1095 IE2EFlowTestService | T403 | SK-254 | DD-255 |
| F1096 IFailureSignatureExtractorService | T398, T403 | SK-261 | DD-254 |
| F1097 IEvidenceBundleAssemblerService | T404 | SK-255 | DD-250 |
| F1098 IGitOpsAssimilationService | T405, T406 | SK-256 | DD-256, DD-257 |
| F1099 IPrManagementService | T406, T407 | SK-256 | DD-257 |
| F1100 ICiCdGateService | T407 | SK-256 | DD-254 |
| F1101 IRegistryAssimilationService | T408 | SK-256, SK-262 | DD-257, DD-258 |
| F1102 IPromotionLadderService | T409–T393 | SK-257, SK-258 | DD-250, DD-251, DD-261 |

---

### BFA Rule → Factory → Skill

| BFA Rule Range | Domain | Primary Factories | Skills |
|----------------|--------|------------------|--------|
| CF-510–CF-517 | Gap Detection vs Existing Capability Registries | F1075, F1076 | SK-251 |
| CF-518–CF-524 | Contract Generation vs Existing Task Types (no T-number clash) | F1082–F1084 | SK-252 |
| CF-525–CF-530 | Genesis Loop vs Existing Fabric Providers (no direct imports) | F1088–F1092 | SK-253 |
| CF-531–CF-536 | Sandbox vs Multi-Tenant Isolation (namespace collision) | F1093, F1094 | SK-264, SK-265 |
| CF-537–CF-540 | GitOps vs Existing CI/CD Pipelines (FLOW-19) | F1098–F1100 | SK-256 |
| CF-541–CF-544 | Promotion vs Cross-Tenant Capability Sharing | F1102 | SK-257, SK-265 |

*(Full CF rules in 26-self-developing_V62_BFA_STRESS_TEST.md)*

---

### Skill → Design Record Mapping

| Skill | Primary DR(s) | Pattern |
|-------|--------------|---------|
| SK-251 | DR-184, DR-185 | Gap detection + capability registry |
| SK-252 | DR-185, DR-187 | Contract-first + completeness gate |
| SK-253 | DR-186 | Bounded genesis loop |
| SK-254 | DR-190 | Deterministic harness |
| SK-255 | DR-187 | Evidence bundle 12-section requirement |
| SK-256 | DR-191, DR-194 | GitOps branch convention + pre-commit BFA |
| SK-257 | DR-193 | Six-stage promotion ladder |
| SK-258 | DR-188 | Human gate non-negotiable |
| SK-259 | DR-184 | SelfBuildRun as persistent entity |
| SK-260 | DR-192 | Reuse thresholds |
| SK-261 | — | Failure signature → fix loop |
| SK-262 | — | Hot-reload pattern |
| SK-263 | DR-194 | BFA before GitOps |
| SK-264 | DR-189 | Sandbox isolation + teardown finally |
| SK-265 | DR-189 | Multi-tenant isolation boundaries |
| SK-266 | DR-195 | Sub-flow max depth |

---

## PROMOTION LADDER CRITERIA (FLOW-26)

| Stage | Required Evidence | Automated? |
|-------|------------------|-----------|
| DRAFT | Evidence bundle created | ✅ Auto |
| WIRED | Unit tests PASS + DNA compliance PASS | ✅ Auto |
| VALIDATED | E2E PASS in sandbox | ✅ Auto |
| INJECTED | CI green + PR merged + registry updated | ✅ Auto |
| MINIMAL | 2+ production flows using capability | ✅ Auto (metric-based) |
| CORE | Human approval + security review + 30-day stability | ❌ Human gate |

---

## IRON RULES SUMMARY (FLOW-26)

| Rule | Factory | Severity | Violation Action |
|------|---------|----------|-----------------|
| IR-982-1 | F1075 | BUILD_FAILURE | AI required for intent parsing |
| IR-982-2 | F1075 | BUILD_FAILURE | Gap must be classified |
| IR-983-1 | F1076 | BUILD_FAILURE | tenantId required on all registry reads |
| IR-983-2 | F1076 | BUILD_FAILURE | Cache invalidate before hot-reload event |
| IR-989-1 | F1082 | BUILD_FAILURE | Full contract format required |
| IR-989-2 | F1082 | BUILD_FAILURE | One-line stubs forbidden |
| IR-991-2 | F1084 | BUILD_FAILURE | Contract completeness gate mandatory |
| IR-992-1 | F1085 | BUILD_FAILURE | Event schemas before GitOps |
| IR-993-1 | F1086 | BUILD_FAILURE | API contracts before GitOps |
| IR-994-1 | F1087 | BUILD_FAILURE | No duplicate CF rules |
| IR-995-1 | F1088 | BUILD_FAILURE | maxRetries enforced (3–5) |
| IR-995-2 | F1088 | BUILD_FAILURE | Judge score ≥ 0.8 |
| IR-995-3 | F1088 | BUILD_FAILURE | BuildEscalated on retry exhaustion |
| IR-996-1 | F1089 | BUILD_FAILURE | All DNA-1–DNA-9 checked |
| IR-996-2 | F1089 | BUILD_FAILURE | Direct provider imports forbidden |
| IR-997-1 | F1090 | BUILD_FAILURE | Unit tests + E2E harness both required |
| IR-998-1 | F1091 | BUILD_FAILURE | 100% external call interception |
| IR-999-1 | F1092 | RETRY | Fix must address all signatures |
| IR-1000-1 | F1093 | BUILD_FAILURE | Tenant namespace isolation required |
| IR-1000-2 | F1093 | CRITICAL | Teardown always runs (finally) |
| IR-1002-1 | F1095 | BUILD_FAILURE | E2E validates original user intent |
| IR-1002-2 | F1095 | BUILD_FAILURE | Idempotency + tenant isolation asserted |
| IR-1003-1 | F1096 | RETRY | Fix instruction required per signature |
| IR-1004-1 | F1097 | BUILD_FAILURE | All 12 bundle sections required |
| IR-1004-2 | F1097 | BUILD_FAILURE | Missing DNA matrix = BUILD FAILURE |
| IR-1005-1 | F1098 | BUILD_FAILURE | Branch naming convention enforced |
| IR-1006-1 | F1099 | BUILD_FAILURE | CORE PRs require reviewers |
| IR-1007-1 | F1100 | LOOPBACK | CI fail → failure signatures → genesis |
| IR-1008-1 | F1101 | BUILD_FAILURE | Registry update only after merge |
| IR-1009-1 | F1102 | BUILD_FAILURE | CORE always requires human approval |
| IR-1009-2 | F1102 | BUILD_FAILURE | Stage criteria MACHINE fixed |
| IR-1009-3 | F1102 | AUDIT | Promotion always recorded |
| IR-1009-4 | F1102 | HOLD | Timeout = stage hold at INJECTED |

---

## SAVE POINT: DD235_DEFINED ✅ | CROSS-REFERENCES COMPLETE ✅


================================================================================
FLOW-27 — UNIFIED SOURCE INDEX: Cross-References for F1103–F1128, T413–T422, CF-545–CF-565, SK-267–SK-277
================================================================================

# FLOW-27 — UNIFIED SOURCE INDEX
## Human Interaction Gate + Dependency Scheduler + Visual Runtime State + Multi-Tenant Group Tasks
## Extension of: UNIFIED_SOURCE_INDEX_MERGED.md
## Status: AUTHORITATIVE — FLOW-27 artifacts only

---

## ARTIFACT CROSS-REFERENCE MAP

### Factories → Task Types → BFA Rules → Skills

| Factory | Interface | Used By Task Types | BFA Rules | Skills |
|---------|-----------|-------------------|-----------|--------|
| F1103 | IHumanInteractionGateService | T413, T420 | CF-546, CF-550, CF-555, CF-558 | SK-267, SK-275 |
| F1104 | IUserTaskRegistryService | T413, T414, T420, T422 | CF-545, CF-546, CF-557 | SK-275 |
| F1105 | ITaskContextSnapshotService | T413 | CF-546 | SK-267 |
| F1106 | ITaskAssignmentResolverService | T414, T420, T421, T422 | CF-552, CF-565 | SK-270 |
| F1107 | ITaskClaimService | T414, T420 | CF-548, CF-556 | SK-270 |
| F1108 | ITaskQuorumService | T414 | CF-547, CF-561, CF-565 | SK-277 |
| F1109 | IRunSnapshotService | T416, T417, T418, T419 | CF-551, CF-559 | SK-269, SK-274 |
| F1110 | INodeSnapshotService | T416, T418, T419, T422 | CF-549, CF-557, CF-559 | SK-269, SK-273 |
| F1111 | INodeEventEmitterService | T416, T418, T421 | CF-551 | SK-269 |
| F1112 | IFlowProgressAggregatorService | T416, T419 | CF-559 | SK-269 |
| F1113 | IRunGraphQueryService | T416, T419 | CF-549 | SK-274 |
| F1114 | INodeDebugSurfaceService | T419 | — | SK-274 |
| F1115 | IDependencySchedulerService | T415, T420, T421 | CF-550, CF-562 | SK-268 |
| F1116 | INodeReadinessEvaluatorService | T415 | CF-550, CF-554 | SK-268 |
| F1117 | IBlockedNodeResolverService | T415 | CF-550 | SK-268 |
| F1118 | IJoinPolicyEnforcerService | T415 | CF-554 | SK-276 |
| F1119 | IDagWalkerService | T415 | CF-562, CF-564 | SK-268 |
| F1120 | ICompletionGateService | T417 | CF-555, CF-563 | SK-271 |
| F1121 | IRunReadinessValidatorService | T417 | CF-555, CF-563 | SK-271 |
| F1122 | IRunTerminalStateService | T417, T418 | CF-551 | SK-271 |
| F1123 | IPendingGateResolverService | T417 | CF-555 | SK-271 |
| F1124 | ITaskNotificationOrchestratorService | T421, T420 | CF-553 | SK-272 |
| F1125 | IGroupMembershipResolverService | T414, T421 | CF-552, CF-553 | SK-272 |
| F1126 | INotificationDedupeService | T421 | CF-553 | SK-272 |
| F1127 | INotificationDeepLinkService | T421 | — | SK-272 |
| F1128 | IUserTaskAnswerProcessorService | T413, T414 | CF-547, CF-548, CF-558 | SK-267, SK-270 |

---

### Task Types → Factories → BFA Rules → Stress Tests

| Task Type | Name | Factories | Key BFA Rules | Key Stress Tests |
|-----------|------|-----------|---------------|-----------------|
| T413 | HumanInteractionGate Node | F1103, F1104, F1105, F1106, F1115, F1128 | CF-546, CF-550, CF-555 | ST-325, ST-326, ST-327, ST-343 |
| T414 | GroupUserTask Assignment Gate | F1106, F1107, F1108, F1125, F1128 | CF-547, CF-548, CF-552, CF-565 | ST-328, ST-329, ST-330, ST-339 |
| T415 | DependencyAwareScheduler | F1115, F1116, F1117, F1118, F1119 | CF-550, CF-554, CF-562 | ST-331, ST-336, ST-343 |
| T416 | RunProgressAggregator | F1109, F1110, F1111, F1112, F1113 | CF-549, CF-551, CF-559 | ST-341, ST-344 |
| T417 | RunCompletionGate | F1120, F1121, F1122, F1123 | CF-551, CF-555, CF-563 | ST-332, ST-333 |
| T418 | VisualNodeStateEmitter | F1109, F1110, F1111, F1122 | CF-549, CF-551 | ST-334, ST-335 |
| T419 | NodeDebugSurface | F1110, F1113, F1114 | CF-549, CF-559 | ST-340, ST-342 |
| T420 | NotificationFanOut | F1103, F1104, F1106, F1107, F1115, F1124, F1125, F1126, F1127 | CF-553, CF-558 | ST-337, ST-338 |
| T421 | GroupTaskNotificationRouter | F1111, F1124, F1125, F1126, F1127 | CF-552, CF-553 | ST-337, ST-338 |
| T422 | MultiTenantGroupTaskResolver | F1106, F1110, F1125 | CF-557, CF-565 | ST-339, ST-344 |

---

### BFA Rules → Task Types → Stress Tests

| BFA Rule | Description (short) | Applies To | Stress Tests |
|----------|---------------------|------------|--------------|
| CF-545 | UserTask must have valid tenantId | T413, T414 | ST-325 |
| CF-546 | HIG node cannot resume without UserTask answer record | T413 | ST-325, ST-326 |
| CF-547 | Quorum count must not exceed assignee count | T414 | ST-328, ST-329 |
| CF-548 | Claimed task cannot be answered by non-claimer | T414 | ST-330 |
| CF-549 | NodeSnapshot.runId + nodeId must be unique within tenant | T416, T418, T419 | ST-341 |
| CF-550 | Scheduler must not enqueue node with unresolved dependencies | T413, T415 | ST-331, ST-343 |
| CF-551 | RunTerminalState must be final — no further events after COMPLETED/FAILED | T417, T418 | ST-333 |
| CF-552 | Group membership resolution must be tenant-scoped (DNA-5) | T414, T421, T422 | ST-339 |
| CF-553 | Notification dedup must prevent same recipient receiving same task notification twice | T420, T421 | ST-337, ST-338 |
| CF-554 | JoinPolicy allOf must wait for ALL required upstream nodes | T415 | ST-331, ST-336 |
| CF-555 | CompletionGate must verify no open HIG gates before marking run COMPLETED | T417 | ST-332, ST-333 |
| CF-556 | Claim TTL expiry must auto-release and emit ClaimExpired event | T414 | ST-330 |
| CF-557 | NodeSnapshot must include tenantId on every document (DNA-5) | T414, T416 | ST-344 |
| CF-558 | UserTask contextSnapshot must include exact incomingVariables at gate time | T413, T420 | ST-325, ST-343 |
| CF-559 | RunSnapshot progress must equal weighted average of NodeSnapshot progress values | T416, T419 | ST-341, ST-344 |
| CF-560 | DependencyScheduler must not duplicate-enqueue a node already in READY state | T415 | ST-331 |
| CF-561 | Quorum answer must be idempotent (same responderId cannot count twice) | T414 | ST-328 |
| CF-562 | DAGWalker cycle detection must fail BUILD if circular dependency found | T415 | ST-334 |
| CF-563 | RunReadinessValidator must reject start if flow JSON has no terminal node | T417 | ST-332 |
| CF-564 | IDagWalkerService must traverse all reachable nodes from root | T415 | ST-334 |
| CF-565 | Group assignment must validate group exists in tenant before task creation | T414, T422 | ST-339 |

---

### Skills → Factories → Task Types

| Skill | Name | Covers Factories | Used By Task Types |
|-------|------|-----------------|-------------------|
| SK-267 | HumanInteractionGate Implementation | F1103, F1105, F1128 | T413 |
| SK-268 | DependencyAwareScheduler Implementation | F1115, F1116, F1117, F1119 | T415 |
| SK-269 | RunProgressAggregator + NodeSnapshot | F1109, F1110, F1111, F1112 | T416, T418 |
| SK-270 | TaskClaimService + AssignmentResolver | F1106, F1107, F1128 | T414 |
| SK-271 | CompletionGate + RunTerminalState | F1120, F1121, F1122, F1123 | T417 |
| SK-272 | GroupTaskNotificationRouter | F1124, F1125, F1126, F1127 | T420, T421 |
| SK-273 | NodeDebugSurface Pattern | F1110, F1114 | T419 |
| SK-274 | RunGraphQuery API | F1113, F1114 | T416, T419 |
| SK-275 | UserTaskRegistry CRUD | F1103, F1104 | T413, T414 |
| SK-276 | JoinPolicyEnforcer (allOf/anyOf/quorum) | F1118 | T415 |
| SK-277 | TaskQuorumService (Redis counter pattern) | F1108 | T414 |

---

### Design Records → Task Types

| DR | Decision | Impacts |
|----|---------|---------|
| DR-198 | HumanInteractionGate is EP-6 (engine primitive) | T413, T414, all flows |
| DR-199 | UserTask in Elasticsearch (durable, queryable) | T413, T414, T420 |
| DR-200 | DependencyScheduler uses `waitFor[]` — no schema change | T415 |
| DR-201 | Event-sourced NodeEvents → materialized NodeSnapshots | T416, T418 |
| DR-202 | Claim uses Redis SETNX atomic op | T414, SK-270 |
| DR-203 | Quorum uses Redis INCR + threshold | T414, SK-277 |
| DR-204 | Notification routes through existing INotificationProvider F68 | T420, T421 |

---

### Design Decisions → Architectural Impact

| DD | Decision | Components Impacted |
|----|---------|---------------------|
| DD-262 | Blocking policy is per-node config | T413, T415, flow JSON schema |
| DD-263 | WAITING_FOR_USER doesn't stop other branches | T415, T416 |
| DD-264 | Events immutable, snapshots are materialized views | T416, T418, SK-269 |
| DD-265 | Redis SETNX for single-claim guarantee | T414, SK-270 |
| DD-266 | Redis INCR for quorum completion | T414, SK-277 |
| DD-267 | SubFlow drill-down uses same graph API (childRunId scope) | T419, UI |
| DD-268 | Notification dedup = taskId+channel+recipientId | T420, T421, SK-272 |
| DD-269 | tenantId mandatory on all new documents | T413–T422, DNA-5 |
| DD-270 | Progress% formula: (done + 0.5*running) / total | T416, T418, SK-269 |
| DD-271 | EP-6 is engine-level — all flows inherit | All flows, EP-6 |

---

## FABRIC RESOLUTION MAP

| Factories | Fabric | Provider | ES Index / Redis Key |
|-----------|--------|----------|----------------------|
| F1103, F1104, F1105 | DATABASE FABRIC (ES) | Elasticsearch | user-tasks, task-context-snapshots |
| F1103 (events) | QUEUE FABRIC | Redis Streams | hig-events |
| F1106 | DATABASE FABRIC (PG) | PostgreSQL | assignment-policies, group-members |
| F1107 | DATABASE FABRIC (Redis) | Redis SETNX | task-claims:{taskId} |
| F1108 | DATABASE FABRIC (Redis+ES) | Redis INCR + ES | task-quorum:{taskId}, task-answers |
| F1109, F1110, F1112, F1113, F1114 | DATABASE FABRIC (ES) | Elasticsearch | run-snapshots, node-snapshots |
| F1111 | QUEUE FABRIC | Redis Streams | node-events |
| F1115, F1117 | QUEUE FABRIC | Redis Streams | scheduler-ready-queue, resume-events |
| F1116, F1118, F1119 | DATABASE FABRIC (ES/Redis) | Elasticsearch + Redis | node-snapshots, join-policy |
| F1120, F1121, F1122, F1123 | DATABASE FABRIC (ES) | Elasticsearch | run-snapshots, user-tasks |
| F1124 | AI ENGINE FABRIC | INotificationProvider (F68) | notification-events |
| F1125 | DATABASE FABRIC (PG) | PostgreSQL | group-members |
| F1126 | DATABASE FABRIC (Redis) | Redis | notif-dedup-cache |
| F1127 | CORE FABRIC | Config-driven (SK-379 (MicroserviceBase)) | — |
| F1128 | DATABASE FABRIC (ES) + QUEUE FABRIC | ES + Redis Streams | user-tasks + hig-events |

---

## UI CONTRACT — UNIVERSAL APIs

```http
# Visual runtime state (fabric-first, platform-agnostic)
GET  /api/runs/{runId}/graph
  tenant-scoped via auth context (DNA-5)
  → nodes[] (id, type, status, progress, blockedBy[], taskId?, childRunIds?)
  → edges[] (from, to, label?)
  → summary { done, running, waitingUser, blocked, failed, total }

GET  /api/runs/{runId}/nodes/{nodeId}
  → snapshot { status, progress%, startedAt, endedAt }
  → subSteps[] { id, title, status, startedAt, endedAt, retryCount }
  → timings { queuedAt, startedAt, endedAt, durationMs }
  → debugLinks { traceId, phaseLink, judgeLink }
  → childRunIds[] (if nodeType = SubFlow)

# Human task lifecycle
GET  /api/user-tasks?runId={runId}          (tenant-scoped)
GET  /api/user-tasks/{taskId}
  → task { questionType, expectedAnswerSchema, contextSnapshot }
  → contextSnapshot { incomingVariables, decisionNeeded, suggestedOptions[] }
  → assignee { type, targets[], quorum? }
  → currentClaim { claimerId, expiresAt } | null
POST /api/user-tasks/{taskId}/claim          (atomic via Redis SETNX)
POST /api/user-tasks/{taskId}/answer         (triggers resume event)
```

---

## FLOW-27 vs Existing Flows: Backward Compatibility

| Existing Artifact | Impact from FLOW-27 |
|------------------|---------------------|
| FLOW-01 to FLOW-26 | No impact — EP-6 adds beneath all flows |
| T1–T388 | Unchanged. New factories F1103+ injectable via DI |
| CF-1–CF-509 | Unchanged. CF-545+ are additive |
| SK-1–SK-250 | Unchanged. SK-267+ are additive |
| Existing HumanApprovalGate concept | Formalized as T413/T414 — same semantics |
| FLOW-05 allSettled pattern | Reused and extended in T415 / SK-276 |
| F68 INotificationProvider | Reused by T420/T421 — no interface changes |
| `waitFor[]` / `dependsOn[]` in flow JSON | Interpreted by T415 — no schema migration |
| FlowOrchestrator (SK-392 (RagStrategyRegistry)) | New HIG node type recognized — additive handler |

---

## FLOW-27 TEMPLATE SUMMARY

### Template 50: Human-Gated Flow with Visual Runtime State

```json
{
  "templateId": "TPL-90",
  "name": "HumanGatedFlowTemplate",
  "version": "1.0",
  "description": "Universal template: any flow step can be a HIG node. Engine manages dependency scheduling, progress tracking, and notification fan-out automatically.",
  "nodeTypes": ["HumanInteractionGate", "GroupUserTaskGate", "SubFlow", "AutoStep"],
  "requiredCapabilities": ["EP-6:HumanInteractionGate", "T415:DependencyAwareScheduler", "T416:RunProgressAggregator"],
  "fabricDependencies": {
    "database": "IDatabaseService (SK-382 (ElasticsearchDatabase))",
    "queue": "IQueueService (SK-383 (RedisStreamQueue))",
    "notification": "INotificationProvider (F68)",
    "core": "MicroserviceBase (SK-379 (MicroserviceBase))"
  },
  "afStations": {
    "generator": "AF-1",
    "ragContext": "AF-4",
    "compliance": "AF-7",
    "judge": "AF-9"
  },
  "dnaPatternsEnforced": ["DNA-1", "DNA-2", "DNA-3", "DNA-4", "DNA-5", "DNA-6"]
}
```



---

## SAVE POINT: FLOW-27_CROSS_REFERENCES_MERGED ✅

---

# ═══════════════════════════════════════════════════════
# FLOW-28: Blog/CMS Modules Platform
# Date: 2026-03-01 | Merged: Post-FLOW-27 baseline
# Factories: F1129–F1175 (47) | Families: 165–174 (10)
# Task Types: T423–T440 (18) | Templates: 92–97 (6)
# BFA Rules: CF-566–CF-600 (35) | Stress Tests: ST-345–ST-368 (24)
# Skills: SK-278–SK-289 (12) | DDs: DD-272–DD-283 | DRs: DR-205–DR-212
# ═══════════════════════════════════════════════════════

# XIIGen UNIFIED SOURCE INDEX — FLOW-28: Blog/CMS Modules Platform
## Date: 2026-03-01 | Status: COMPLETE ✅
## Purpose: Cross-reference of ALL FLOW-28 artifacts for RAG retrieval and session recovery

---

## HOW TO USE THIS INDEX

This document is the **single lookup table** for all FLOW-28 artifacts. When recovering a session
or when AF-4 (RAG Task Context) searches for relevant patterns, this index provides:
- Which document contains a given artifact
- Which artifacts belong to a given functional domain
- Cross-references between factories, task types, skills, and BFA rules
- Fabric resolution quick-lookup

---

## SECTION 1: FACTORY QUICK-LOOKUP (F1129–F1175)

| Factory | Interface | Family | Document | Skill Pattern | BFA Rules |
|---------|-----------|--------|----------|---------------|-----------|
| F1129 | IContentRepository | 165 | ENGINE_ARCH §Family154 | SK-278 | CF-566, CF-569, CF-578, CF-581, CF-590 |
| F1130 | IRevisionService | 165 | ENGINE_ARCH §Family154 | SK-278 | CF-582 |
| F1131 | ITaxonomyService | 165 | ENGINE_ARCH §Family154 | SK-279 | CF-573, CF-584 |
| F1132 | ISlugResolver | 165 | ENGINE_ARCH §Family154 | SK-279 | CF-573, CF-589 |
| F1133 | IContentPublisher | 165 | ENGINE_ARCH §Family154 | SK-286 | CF-567, CF-571, CF-582 |
| F1134 | IEditorSessionService | 166 | ENGINE_ARCH §Family155 | SK-278 | CF-568 |
| F1135 | IMediaUploadService | 166 | ENGINE_ARCH §Family155 | SK-281 | CF-569, CF-579, CF-599 |
| F1136 | IMediaTransformer | 166 | ENGINE_ARCH §Family155 | SK-281 | CF-588 |
| F1137 | IMediaLibraryService | 166 | ENGINE_ARCH §Family155 | SK-281 | CF-569 |
| F1138 | IMediaVariantService | 166 | ENGINE_ARCH §Family155 | SK-281 | CF-588 |
| F1139 | IThemeRenderer | 167 | ENGINE_ARCH §Family156 | SK-285 | — |
| F1140 | ITemplateEngine | 167 | ENGINE_ARCH §Family156 | SK-285 | — |
| F1141 | IPageCacheService | 167 | ENGINE_ARCH §Family156 | SK-282, SK-285 | CF-580, CF-581 |
| F1142 | IRouteResolver | 167 | ENGINE_ARCH §Family156 | SK-279, SK-285 | CF-573, CF-586 |
| F1143 | ILayoutComposer | 167 | ENGINE_ARCH §Family156 | SK-285 | — |
| F1144 | IHookRegistry | 168 | ENGINE_ARCH §Family157 | SK-280 | CF-571 |
| F1145 | IPluginLoader | 168 | ENGINE_ARCH §Family157 | SK-280 | CF-583, CF-593 |
| F1146 | IHookExecutor | 168 | ENGINE_ARCH §Family157 | SK-280 | CF-571, CF-583 |
| F1147 | IWebhookDispatcher | 168 | ENGINE_ARCH §Family157 | SK-280 | CF-576, CF-591 |
| F1148 | IExtensionSandbox | 168 | ENGINE_ARCH §Family157 | SK-280 | CF-583 |
| F1149 | IContentIndexer | 169 | ENGINE_ARCH §Family158 | SK-278 | CF-574, CF-590 |
| F1150 | ISearchQueryBuilder | 169 | ENGINE_ARCH §Family158 | — | CF-574 |
| F1151 | ICacheInvalidator | 169 | ENGINE_ARCH §Family158 | SK-282 | CF-580 |
| F1152 | ISitemapGenerator | 169 | ENGINE_ARCH §Family158 | — | CF-575, CF-586 |
| F1153 | IRelatedContentFinder | 169 | ENGINE_ARCH §Family158 | SK-284 | — |
| F1154 | ICommentRepository | 170 | ENGINE_ARCH §Family159 | — | CF-577 |
| F1155 | ISpamDetector | 170 | ENGINE_ARCH §Family159 | SK-283 | CF-570, CF-577 |
| F1156 | IModerationQueue | 170 | ENGINE_ARCH §Family159 | SK-288 | CF-592 |
| F1157 | ICommentNotifier | 170 | ENGINE_ARCH §Family159 | SK-286 | — |
| F1158 | IAiSeoAnalyzer | 171 | ENGINE_ARCH §Family160 | SK-284 | CF-585 |
| F1159 | IAiTagSuggester | 171 | ENGINE_ARCH §Family160 | SK-284 | CF-585 |
| F1160 | IAiContentSummarizer | 171 | ENGINE_ARCH §Family160 | SK-284 | CF-585 |
| F1161 | IAiImageAltTextGenerator | 171 | ENGINE_ARCH §Family160 | SK-284 | CF-585 |
| F1162 | IAiRelatedPostsRanker | 171 | ENGINE_ARCH §Family160 | SK-284 | — |
| F1163 | IScheduledPublisher | 172 | ENGINE_ARCH §Family161 | SK-286 | CF-575, CF-582 |
| F1164 | IPublishApprovalGate | 172 | ENGINE_ARCH §Family161 | SK-288 | CF-572, CF-592 |
| F1165 | IPublishEventEmitter | 172 | ENGINE_ARCH §Family161 | SK-286 | CF-567 |
| F1166 | IFeedGenerator | 172 | ENGINE_ARCH §Family161 | — | CF-580 |
| F1167 | ICanonicalUrlService | 172 | ENGINE_ARCH §Family161 | — | CF-589 |
| F1168 | IContentPermissionService | 173 | ENGINE_ARCH §Family162 | SK-287 | CF-581, CF-316 |
| F1169 | IEditorialRoleService | 173 | ENGINE_ARCH §Family162 | SK-287 | CF-594 |
| F1170 | IAuthorProfileService | 173 | ENGINE_ARCH §Family162 | SK-287 | CF-594 |
| F1171 | IContentOwnershipService | 173 | ENGINE_ARCH §Family162 | SK-287 | — |
| F1172 | ISiteConfigService | 174 | ENGINE_ARCH §Family163 | SK-289 | CF-578 |
| F1173 | IPermalinkConfigService | 174 | ENGINE_ARCH §Family163 | SK-289 | CF-589 |
| F1174 | IPluginConfigService | 174 | ENGINE_ARCH §Family163 | SK-289 | CF-593 |
| F1175 | IMaintenanceModeService | 174 | ENGINE_ARCH §Family163 | SK-289 | — |

---

## SECTION 2: TASK TYPE QUICK-LOOKUP (T423–T440)

| Task Type | Name | Archetype | Document | Primary Skill | BFA Rules | Stress Tests |
|-----------|------|-----------|----------|---------------|-----------|--------------|
| T423 | Content Lifecycle Orchestrator | ORCHESTRATION | TASK_TYPES §T423 | SK-278, SK-287 | CF-566, CF-567 | ST-345, ST-352 |
| T424 | Draft Autosave Loop | EVENT_PROCESSING | TASK_TYPES §T424 | SK-278 | CF-568 | ST-346 |
| T425 | Content Publish Gate | ORCHESTRATION | TASK_TYPES §T425 | SK-286, SK-287 | CF-571, CF-572, CF-581, CF-582 | ST-345, ST-353 |
| T426 | Scheduled Content Publisher | ORCHESTRATION | TASK_TYPES §T426 | SK-286 | CF-582 | ST-365 |
| T427 | Content Archive Flow | EVENT_PROCESSING | TASK_TYPES §T427 | SK-278 | CF-600 | — |
| T428 | Media Upload Pipeline | ORCHESTRATION | TASK_TYPES §T428 | SK-281 | CF-569, CF-579, CF-599 | ST-347, ST-359 |
| T429 | Media Variant Generator | EVENT_PROCESSING | TASK_TYPES §T429 | SK-281 | CF-588 | ST-347 |
| T430 | Public Page Request | READ_PATTERN | TASK_TYPES §T430 | SK-285, SK-287 | CF-581, CF-590 | ST-348, ST-352 |
| T431 | Search Index Cascade | EVENT_PROCESSING | TASK_TYPES §T431 | SK-278 | CF-574, CF-590 | ST-351, ST-363 |
| T432 | Page Cache Invalidation | EVENT_PROCESSING | TASK_TYPES §T432 | SK-282 | CF-580 | ST-348, ST-351 |
| T433 | Hook Fan-Out Executor | ORCHESTRATION | TASK_TYPES §T433 | SK-280 | CF-571, CF-583 | ST-349, ST-357 |
| T434 | Webhook Dispatcher | EVENT_PROCESSING | TASK_TYPES §T434 | SK-280 | CF-576, CF-591 | ST-354 |
| T435 | Comment Submission Gateway | ORCHESTRATION | TASK_TYPES §T435 | SK-283, SK-287 | CF-570, CF-577, CF-587 | ST-350 |
| T436 | Comment Moderation Flow | ORCHESTRATION | TASK_TYPES §T436 | SK-288 | CF-592 | ST-350, ST-366 |
| T437 | Taxonomy Propagation | EVENT_PROCESSING | TASK_TYPES §T437 | SK-279 | CF-584 | ST-355 |
| T438 | AI Content Enhancement | ORCHESTRATION | TASK_TYPES §T438 | SK-284 | CF-585, CF-595 | ST-356 |
| T439 | Sitemap Rebuild Service | EVENT_PROCESSING | TASK_TYPES §T439 | — | CF-575, CF-586 | ST-351 |
| T440 | Rate Limiting Pre-Gate | PATTERN | TASK_TYPES §T440 | SK-287 | CF-587 | ST-350 |

---

## SECTION 3: SKILL QUICK-LOOKUP (SK-278–SK-289)

| Skill | Name | Promotion | Factories | Task Types | Document |
|-------|------|-----------|-----------|------------|---------|
| SK-278 | Content Repository Pattern | MINIMAL | F1129, F1130, F1149 | T423, T424, T427, T431 | SKILLS §SK-278 |
| SK-279 | Taxonomy & Slug Resolver | INJECTED | F1131, F1132 | T430, T437 | SKILLS §SK-279 |
| SK-280 | Hook Fan-Out Executor | MINIMAL | F1144, F1145, F1146, F1147, F1148 | T433, T434 | SKILLS §SK-280 |
| SK-281 | Media Upload & Transform | INJECTED | F1135, F1136, F1137, F1138 | T428, T429 | SKILLS §SK-281 |
| SK-282 | Page Cache Service | INJECTED | F1141, F1151 | T430, T432 | SKILLS §SK-282 |
| SK-283 | AI Spam Detection Gate | INJECTED | F1155 | T435 | SKILLS §SK-283 |
| SK-284 | AI Content Enhancement | INJECTED | F1158–F1162 | T438 | SKILLS §SK-284 |
| SK-285 | Cache-First Read Pattern | MINIMAL → CORE candidate | F1139–F1143 | T430 | SKILLS §SK-285 |
| SK-286 | CloudEvent Publisher | INJECTED | F1133, F1163, F1165 | T425, T426 | SKILLS §SK-286 |
| SK-287 | Content Permission Service | MINIMAL | F1168–F1171 | T423, T425, T428, T430, T435, T440 | SKILLS §SK-287 |
| SK-288 | Human-In-Loop Approval | INJECTED | F1164, F1156 | T425, T436 | SKILLS §SK-288 |
| SK-289 | Site Config & Permalink Manager | INJECTED | F1172–F1175 | — (config layer) | SKILLS §SK-289 |

---

## SECTION 4: BFA CONFLICT RULE QUICK-LOOKUP (CF-566–CF-600)

| Rule | Severity | Domain | Flows Involved | Key Iron Rule | Document |
|------|----------|--------|----------------|---------------|---------|
| CF-566 | ERROR | Entity collision | FLOW-28 vs FLOW-02 | `blog.*` namespace mandatory | BFA §CF-566 |
| CF-567 | WARNING | Event namespace | FLOW-28 vs FLOW-04 | Fine-grained event names | BFA §CF-567 |
| CF-568 | WARNING | Redis session keys | FLOW-28 vs FLOW-22/23 | `blog:session:` prefix | BFA §CF-568 |
| CF-569 | ERROR | Media entity | FLOW-28 vs FLOW-11 | `blog_media_asset` distinct | BFA §CF-569 |
| CF-570 | WARNING | AI budget | FLOW-28 vs FLOW-07 | Budget pre-check before AI call | BFA §CF-570 |
| CF-571 | WARNING | Queue saturation | FLOW-28 vs FLOW-04 | maxFanout iron rule | BFA §CF-571 |
| CF-572 | ERROR | DLQ ownership | FLOW-28 vs FLOW-04 | No auto-retry for approvals | BFA §CF-572 |
| CF-573 | ERROR | URL routing | FLOW-28 vs FLOW-08 | Blog base path prefix | BFA §CF-573 |
| CF-574 | WARNING | ES index writes | FLOW-28 vs FLOW-09 | Separate index names | BFA §CF-574 |
| CF-575 | WARNING | Sitemap rate | FLOW-28 vs FLOW-13 | Debounce iron rule | BFA §CF-575 |
| CF-576 | ERROR-SEC | SSRF webhook | FLOW-28 vs FLOW-08 | URL allowlist before dispatch | BFA §CF-576 |
| CF-577 | ERROR-SEC | XSS comment | FLOW-28 vs FLOW-08 | Sanitize before storage | BFA §CF-577 |
| CF-578 | ERROR | Config tenant bleed | FLOW-28 vs FLOW-05 | tenantId on every config read | BFA §CF-578 |
| CF-579 | WARNING | Storage quota | FLOW-28 vs FLOW-12 | Quota check pre-upload | BFA §CF-579 |
| CF-580 | WARNING | RSS/page cache | FLOW-28 internal | Same invalidation tag set | BFA §CF-580 |
| CF-581 | ERROR-SEC | BOLA content | FLOW-28 vs FLOW-01 | Status filter mandatory | BFA §CF-581 |
| CF-582 | WARNING | Publish race | FLOW-28 internal | Optimistic lock mandatory | BFA §CF-582 |
| CF-583 | ERROR-SEC | Plugin sandbox | FLOW-28 vs FLOW-08 | Restricted execution | BFA §CF-583 |
| CF-584 | WARNING | Taxonomy orphan | FLOW-28 internal | Idempotency key required | BFA §CF-584 |
| CF-585 | WARNING | AI feedback runaway | FLOW-28 vs FLOW-07 | Circuit breaker per model | BFA §CF-585 |
| CF-586 | WARNING | Sitemap routing | FLOW-28 vs FLOW-08 | Register sitemap with FLOW-08 | BFA §CF-586 |
| CF-587 | WARNING | Rate limit float | FLOW-28 vs FLOW-01 | userId OR IP, never both | BFA §CF-587 |
| CF-588 | WARNING | CDN URL signing | FLOW-28 vs FLOW-12 | Check signing policy | BFA §CF-588 |
| CF-589 | ERROR | Canonical cache | FLOW-28 internal | Flush on permalink change | BFA §CF-589 |
| CF-590 | ERROR-SEC | Draft in search | FLOW-28 internal | Publish event filter strict | BFA §CF-590 |
| CF-591 | WARNING | Webhook retry storm | FLOW-28 vs FLOW-04 | Exponential backoff + cap | BFA §CF-591 |
| CF-592 | ERROR | Moderation deadlock | FLOW-28 internal | Separate reviewer pools | BFA §CF-592 |
| CF-593 | WARNING | Plugin namespacing | FLOW-28 internal | `{pluginId}:` prefix required | BFA §CF-593 |
| CF-594 | WARNING | SCIM conflict | FLOW-28 vs FLOW-05 | FLOW-05 authoritative | BFA §CF-594 |
| CF-595 | WARNING | Per-tenant AI model | FLOW-28 internal | Per-tenant config resolution | BFA §CF-595 |
| CF-596 | WARNING | Comment threading | FLOW-28 internal | maxDepth enforced | BFA §CF-596 |
| CF-597 | WARNING | Schema evolution | FLOW-28 internal | Dictionary ensures readability | BFA §CF-597 |
| CF-598 | WARNING | Editor takeover | FLOW-28 internal | Active session owner tracked | BFA §CF-598 |
| CF-599 | WARNING | Virus scan | FLOW-28 internal | Optional hook before commit | BFA §CF-599 |
| CF-600 | WARNING | Archive retention | FLOW-28 internal | Retention period FREEDOM config | BFA §CF-600 |

---

## SECTION 5: STRESS TEST QUICK-LOOKUP (ST-345–ST-368)

| Test | Name | Task Types | Key Success Criteria | Severity |
|------|------|------------|---------------------|----------|
| ST-345 | 1000 Concurrent Publishes | T425, T423 | All complete in 30s; zero cross-tenant bleed | HIGH |
| ST-346 | High-Frequency Autosave | T424 | P99 < 50ms; no session key collisions | MEDIUM |
| ST-347 | 500 Concurrent Media Uploads | T428, T429 | All accepted in 5s (async); all variants in 120s | HIGH |
| ST-348 | Page Cache Hit Rate | T430, T432 | >95% cache hit for repeat URLs; P99 cached < 10ms | HIGH |
| ST-349 | Hook Handler Isolation | T433 | Buggy handler terminated; others unaffected | HIGH |
| ST-350 | Comment Spam Throughput | T435, T436 | 2000 comments/60s; AI budget checked; XSS blocked | HIGH |
| ST-351 | Cache Invalidation Cascade | T431, T432 | 500 bulk publish invalidations in 30s; 1 sitemap job | HIGH |
| ST-352 | Cross-Tenant Isolation | T423, T425, T430 | Zero cross-tenant data in 10,000 operations | CRITICAL |
| ST-353 | Approval Timeout & DLQ | T425, F1164 | 100 timeouts → approval DLQ; no auto-retry | HIGH |
| ST-354 | Webhook Retry Storm | T434 | Exponential backoff; no storm on recovery | MEDIUM |
| ST-355 | Taxonomy Propagation Scale | T437 | 10,000 docs updated in 5 min; no orphans | MEDIUM |
| ST-356 | AI Parallel Models | T438 | 100 analyses in 20s; circuit breaker triggers | MEDIUM |
| ST-357 | Plugin Load Test | T433, F1148 | 50 plugins, 1000 events; sandbox isolation | HIGH |
| ST-358 | Permalink Migration | F1173, F1167 | 10,000 canonicals flushed; zero stale served | HIGH |
| ST-359 | Media Security Gauntlet | T428 | ZERO adversarial files accepted | CRITICAL |
| ST-360 | Maintenance Mode Toggle | F1175 | In-flight complete; new → 503 immediately | MEDIUM |
| ST-361 | Permission Cache Invalidation | F1168 | Role change reflected in < 5s | HIGH |
| ST-362 | RSS Under Load | F1166 | 100K req/min; >99% cache hit | MEDIUM |
| ST-363 | Full Tenant Reindex | F1149 | 100K posts reindexed < 30 min; no read downtime | MEDIUM |
| ST-364 | Comment Threading Depth | T435 | Depth > maxDepth rejected; no DB write | LOW |
| ST-365 | Scheduled Publish Backlog | T426 | 1000 posts same time; all within 10 min; fair | MEDIUM |
| ST-366 | Concurrent Moderation + Appeal | T436 | Optimistic lock prevents float-decision | MEDIUM |
| ST-367 | FREEDOM Config Hot Reload | F1172, F1175 | Config change propagated within 30s | MEDIUM |
| ST-368 | Plugin Hook Priority Race | T433 | Deterministic order; stable across restarts | LOW |

---

## SECTION 6: FABRIC RESOLUTION MATRIX

| Fabric | FLOW-28 Factories | Default Provider |
|--------|------------------|-----------------|
| DATABASE FABRIC (ES) | F1129, F1131, F1137, F1140, F1142, F1144, F1145, F1149, F1150, F1154, F1166, F1169, F1170, F1172, F1174 | Elasticsearch 8 |
| DATABASE FABRIC (PG) | F1130, F1138, F1171 | PostgreSQL (JSONB) |
| DATABASE FABRIC (Redis) | F1132, F1134, F1135, F1141, F1151, F1167, F1173, F1175 | Redis 7+ |
| QUEUE FABRIC | F1133, F1136, F1146, F1147, F1152, F1156, F1157, F1163, F1164, F1165 | Redis Streams |
| AI ENGINE FABRIC | F1155, F1158, F1159, F1160, F1161, F1162 | Claude (haiku/sonnet) + Gemini |
| RAG FABRIC | F1153, F1158, F1162 | Hybrid (ES vector + keyword) |
| CORE FABRIC | F1139, F1140, F1143, F1148, F1168 | MicroserviceBase |

---

## SECTION 7: DOCUMENT MAP

| Document | Contains | Lines (approx) |
|----------|---------|----------------|
| 28-blog-modules_ENGINE_ARCHITECTURE.md | F1129–F1175, Families 165–174, DNA compliance, example generated code | ~580 |
| 28-blog-modules_TASK_TYPES_CATALOG.md | T423–T440 full contracts (18 × full format), Templates 83–88 | ~750 |
| 28-blog-modules_SKILLS_FACTORY_RAG.md | SK-278–SK-289 (12 skills with code patterns, promotion status) | ~850 |
| 28-blog-modules_V62_BFA_STRESS_TEST.md | CF-566–CF-600 (35 rules), ST-345–ST-368 (24 tests) | ~500 |
| 28-blog-modules_SESSION_STATE.md | All counters, recovery instructions, flow history | ~230 |
| 28-blog-modules_MASTER_EXECUTION_PLAN.md | P0–P3 full execution plan, risk register, design decisions | ~380 |
| 28-blog-modules_UNIFIED_SOURCE_INDEX.md | Cross-reference tables (this file) | ~250 |

---

## SECTION 8: DNA PATTERN CROSS-REFERENCE

| DNA | Pattern Name | Applied In FLOW-28 | Enforced By | BFA Rules |
|-----|-------------|-------------------|-------------|-----------|
| DNA-1 | parse_document (Dictionary) | All 47 factory return types | AF-7 scan | CF-597 |
| DNA-2 | build_search_filter (empty skip) | ContentFilter, TaxonomyFilter, CommentFilter, MediaFilter | AF-7 scan | CF-578 |
| DNA-3 | DataProcessResult[T] | All 47 factory method signatures | AF-9 judge | — |
| DNA-4 | MicroserviceBase | All 10 generated service classes | AF-7 compliance | — |
| DNA-5 | Scope Isolation (tenantId) | Every factory method, every ES/Redis query | AF-7 + CF-578, CF-568 | CF-568, CF-578, CF-507 |
| DNA-6 | DynamicController | No IContentController, ICommentController etc. | AF-7 scan | — |

---

## SECTION 9: CLOUDFLOWS → TEMPLATES MAPPING

| Template | Name | Trigger Event | Steps | Generated Services |
|----------|------|---------------|-------|--------------------|
| Template-92 | Content Lifecycle DAG | ContentLifecycleRequest | T423→[T425/T426/T427] | ContentLifecycleService, ContentPublishingService |
| Template-93 | Public Page Render DAG | HTTP GET /{blogBasePath}/{slug} | T430 + async(T431, T432) | PublicPageService, SearchIndexCascadeService, PageCacheInvalidationService |
| Template-94 | Media Upload DAG | MediaUploadRequest | T428→T429 | MediaUploadService, MediaVariantService |
| Template-95 | Extension Hook DAG | HookFireEvent | T433→T434 | HookExecutorService, WebhookDispatcherService |
| Template-96 | Comment Flow DAG | CommentSubmitRequest | T435→T436 | CommentSubmissionGateway, CommentModerationFlow |
| Template-97 | AI Enhancement DAG | ContentEnhancementRequest | T438 + async(T437, T439) | AiContentEnhancementService, TaxonomyPropagationService, SitemapRebuildService |

---

## SECTION 10: AF STATION USAGE SUMMARY

| AF Station | Used For | Primary Task Types |
|------------|----------|--------------------|
| AF-1 Genesis | Generates all 10 service classes | T423–T440 |
| AF-2 Planning | Decomposes T423, T425, T428, T433 orchestration steps | T423, T425, T428, T433 |
| AF-3 Prompt Library | Retrieves CMS-domain prompts (content lifecycle, CMS patterns) | T423, T425, T430 |
| AF-4 RAG Task Context | Retrieves SK-278–SK-289 patterns; reuse-first | All |
| AF-5 Multi-model | Claude-sonnet + Gemini-2.5-Pro parallel for complex orchestration | T423, T425, T430, T438 |
| AF-6 Code Review | State machine edge cases, debounce logic review | T423, T424, T426 |
| AF-7 Compliance | DNA-1 through DNA-6 scan on all generated code | All (mandatory) |
| AF-8 Security | BOLA (CF-581), XSS (CF-577), SSRF (CF-576), sandbox (CF-583) | T428, T430, T434, T435 |
| AF-9 Judge | Iron rules, quality gates for all 18 task types | All (mandatory) |
| AF-10 Merge | Multi-model output combination for T425 and T438 | T425, T438 |
| AF-11 Feedback | Generation quality stored; seeded during P1/P2 | T423, T425, T430, T438 (priority) |

---

## STATE SAVE CHECKPOINT

```
FILE: 28-blog-modules_UNIFIED_SOURCE_INDEX.md
STATUS: COMPLETE ✅
ALL 7 FLOW-28 DOCUMENTS: COMPLETE ✅

FLOW-28 SESSION COMPLETE. NEXT: FLOW-27
Next factory: F1122 | Next task type: T407 | Next family: 164
```


---

## SAVE POINT: UNIFIED_SOURCE_INDEX_FLOW28_MERGED ✅

---

# ═══════════════════════════════════════════════════════
# FLOW-29 — Adaptive RAG Deep Research Engine
# Full cross-reference of all FLOW-29 artifacts + backward-compat links
# ═══════════════════════════════════════════════════════

---

## ARTIFACT REGISTRY — FLOW-29

### Factory Index (F1176–F1247)

| Factory | Interface                       | Family | Task Types Used In    | Skills Referenced |
|---------|---------------------------------|--------|-----------------------|-------------------|
| F1176   | IAdaptiveRagRouter              | 175    | T441, T444, T459      | SK-290, SK-292    |
| F1177   | ITaskClassifier                 | 175    | T441                  | SK-290            |
| F1178   | IRetrievalModeSelector          | 175    | T441, T459            | SK-290            |
| F1179   | IQueryRewriter                  | 175    | T442                  | SK-290            |
| F1180   | IQueryDecomposer                | 175    | T442                  | SK-290            |
| F1181   | IRetrievalModeRegistry          | 175    | T441                  | SK-290            |
| F1182   | IRoutingPolicyReader            | 175    | T441                  | SK-290, SK-303    |
| F1183   | IRoutingAuditLogger             | 175    | T441, T459            | SK-290            |
| F1184   | IGraphRagService                | 176    | T443, T444, T463      | SK-291            |
| F1185   | IKnowledgeGraphBuilder          | 176    | T451 (via domain)     | SK-291, SK-298    |
| F1186   | ICommunityHierarchyManager      | 176    | T443, T463            | SK-291            |
| F1187   | ICommunitySummaryGenerator      | 176    | T443, T464            | SK-291            |
| F1188   | IEntityDeduplicator             | 176    | T451                  | SK-298            |
| F1189   | IGraphEditGate                  | 176    | T452, T462            | SK-291            |
| F1190   | IGraphIndexRebuildQueue         | 176    | T452, T464, T465      | SK-291, SK-298    |
| F1191   | IDomainGraphProfileStore        | 176    | T451                  | SK-298            |
| F1192   | ITraceSpanService               | 177    | T443, T448, T449, T456| SK-294, SK-295    |
| F1193   | ITokenCostTracker               | 177    | T446, T448            | SK-294            |
| F1194   | ILatencyProfiler                | 177    | T448                  | SK-294            |
| F1195   | IRunSessionStore                | 177    | T448, T449            | SK-294            |
| F1196   | IFeedbackLinker                 | 177    | T449                  | SK-295            |
| F1197   | IObservabilityExporter          | 177    | T448                  | SK-294            |
| F1198   | ICostBudgetEnforcer             | 178    | T446                  | SK-300            |
| F1199   | IBanditRouter                   | 178    | T445                  | SK-293            |
| F1200   | IBanditFeedbackStore            | 178    | T445, T449            | SK-293, SK-295    |
| F1201   | IBudgetPreferenceReader         | 178    | T445, T446            | SK-293            |
| F1202   | IBanditPolicyUpdater            | 178    | T445, T447            | SK-293, SK-303    |
| F1203   | IExplorationController          | 178    | T445                  | SK-293            |
| F1204   | IBanditAuditLog                 | 178    | T445, T460            | SK-293            |
| F1205   | IMultiObjectiveScorer           | 178    | T445, T447            | SK-293            |
| F1206   | IRetrievalFaithfulnessChecker   | 179    | T454                  | SK-296            |
| F1207   | IContextCoverageScorer          | 179    | T454                  | SK-296            |
| F1208   | IIronRuleValidator              | 179    | T454, T455            | SK-296            |
| F1209   | IQualityRubricStore             | 179    | T454                  | SK-296            |
| F1210   | IEvalResultPublisher            | 179    | T454                  | SK-296            |
| F1211   | IHallucinationDetector          | 179    | T454                  | SK-296            |
| F1212   | IQualityGateEnforcer            | 179    | T450, T453, T454, T455| SK-296, SK-297    |
| F1213   | IPromptVersionRegistry          | 180    | T450, T451, T523      | SK-297            |
| F1214   | IPromptVersionPromoter          | 180    | T450                  | SK-297            |
| F1215   | IPromptVariantTester            | 180    | T450, T456            | SK-297, SK-302    |
| F1216   | IPromptRollbackManager          | 180    | T450, T466            | SK-297, SK-299    |
| F1217   | IPromptTaggingService           | 180    | T450                  | SK-297            |
| F1218   | IPromptInjectionBuilder         | 180    | T445                  | SK-297            |
| F1219   | IPromptAuditTrail               | 180    | T450                  | SK-297            |
| F1220   | IDomainProfileStore             | 181    | T451, T465            | SK-298            |
| F1221   | IDomainEntityTypeRegistry       | 181    | T451                  | SK-298            |
| F1222   | IDomainExtractionPrompter       | 181    | T451                  | SK-298            |
| F1223   | IDomainSummaryStrategyPicker    | 181    | T451                  | SK-298            |
| F1224   | IDomainDeduplicationRules       | 181    | T451                  | SK-298            |
| F1225   | IDomainCompilerProfilePublisher | 181    | T451, T465            | SK-298            |
| F1226   | IDomainMetricsTracker           | 181    | T451, T465            | SK-298            |
| F1227   | IControlPlaneGraphStore         | 182    | T462, T467            | SK-304            |
| F1228   | IAssetVersionManager            | 182    | T455, T462            | SK-299            |
| F1229   | IFlowVariantRegistry            | 182    | T456, T467            | SK-302            |
| F1230   | IImprovementSuggestionEngine    | 182    | T461                  | SK-303            |
| F1231   | IControlPlaneABAllocator        | 182    | T456                  | SK-302            |
| F1232   | IPromotionPipelineOrchestrator  | 182    | T455                  | SK-299            |
| F1233   | ISelfLearningFeedbackAggregator | 182    | T447, T449, T460      | SK-295, SK-303    |
| F1234   | IGraphAnalyticsRunner           | 182    | T461                  | SK-303            |
| F1235   | IRagIndexVersionStore           | 183    | T442, T453            | SK-299            |
| F1236   | IEmbeddingVersionRegistry       | 183    | T453                  | SK-299            |
| F1237   | IChunkParameterVersioner        | 183    | T442, T453            | SK-299            |
| F1238   | IRagStrategyVersioner           | 183    | T453, T466            | SK-299            |
| F1239   | IRagRollbackManager             | 183    | T466                  | SK-299            |
| F1240   | IRagVersionComparator           | 183    | T453                  | SK-299            |
| F1241   | IRagAssetPromotionGate          | 183    | T453, T455            | SK-299            |
| F1242   | IContextEfficiencyMonitor       | 184    | T442, T443, T444, T457| SK-300            |
| F1243   | INoiseRetrievalDetector         | 184    | T457, T459            | SK-300, SK-301    |
| F1244   | IRerankerService                | 184    | T442, T444, T458      | SK-301            |
| F1245   | IBudgetCapPolicyStore           | 184    | T446, T457            | SK-300            |
| F1246   | IEfficiencyPenaltyCalculator    | 184    | T446, T457            | SK-300            |
| F1247   | IContextPruner                  | 184    | T444, T457            | SK-300            |

---

### Task Type Index (T441–T467)

| Task Type | Name                             | Family | Templates  | BFA Rules           | Skills         |
|-----------|----------------------------------|--------|------------|---------------------|----------------|
| T441      | Adaptive RAG Route Gate          | 175    | 83         | CF-601, CF-602      | SK-290         |
| T442      | Vector Retrieval Step            | 175/183| 83         | CF-603              | SK-290, SK-299 |
| T443      | GraphRAG Community Query         | 176    | 83         | CF-604, CF-605      | SK-291         |
| T444      | Hybrid Retrieval Fusion          | 175-184| 83         | CF-606              | SK-292         |
| T445      | Contextual Bandit Model Select   | 178    | 83, 84     | CF-607, CF-608      | SK-293         |
| T446      | Budget Enforcement Gate          | 178/184| 83         | CF-622              | SK-300         |
| T447      | Routing Policy Update            | 178/182| 84         | CF-608              | SK-303         |
| T448      | Trace Span Capture               | 177    | 83, 84–89  | CF-621              | SK-294         |
| T449      | User Feedback Ingest             | 177/178| 84         | CF-611              | SK-295         |
| T450      | Prompt Version Promote           | 180    | 85         | CF-609, CF-610      | SK-297         |
| T451      | Domain Profile Compile           | 181    | 86         | CF-613, CF-614      | SK-298         |
| T452      | Knowledge Graph Edit Gate        | 176    | 86, 88     | CF-616              | SK-291         |
| T453      | RAG Asset Version Compare        | 183    | 85, 89     | CF-615              | SK-299         |
| T454      | Eval Quality Gate                | 179    | 83, 89     | CF-612              | SK-296         |
| T455      | Promotion Pipeline Gate          | 182    | 104         | CF-620              | SK-299         |
| T456      | A/B Test Allocation              | 182    | 87         | CF-618              | SK-302         |
| T457      | Context Efficiency Check         | 184    | 83         | CF-617              | SK-300         |
| T458      | Reranker Step                    | 184    | 83         | —                   | SK-301         |
| T459      | Self-Reflection Retrieval Check  | 175    | 83         | CF-617              | SK-290         |
| T460      | Feedback Aggregation Window      | 182    | 84         | CF-626              | SK-295, SK-303 |
| T461      | Improvement Suggestion Engine    | 182    | —          | —                   | SK-303         |
| T462      | Control Plane Graph Edit         | 182    | 88         | CF-619              | SK-304         |
| T463      | Knowledge Graph Multi-Hop        | 176    | 88         | CF-604, CF-623      | SK-291         |
| T464      | Community Summary Generation     | 176    | 86         | CF-605              | SK-291         |
| T465      | Domain GraphRAG Index Rebuild    | 181    | 86         | CF-605, CF-613      | SK-298         |
| T466      | RAG Strategy Version Rollback    | 183    | —          | CF-615              | SK-299         |
| T467      | Visual Control Plane Node Render | 182    | —          | CF-625              | SK-304         |

---

### BFA Rules Index (CF-601–CF-626)

| Rule   | Severity | Trigger Domain              | Affected Flows          | Action     |
|--------|----------|-----------------------------|-------------------------|------------|
| CF-601 | HIGH     | RAG routing strategy rename | FLOW-09, FLOW-13        | COMPAT_WRAPPER |
| CF-602 | CRITICAL | Route gate bypasses BFA     | FLOW-25                 | REJECT     |
| CF-603 | MEDIUM   | Index version rolling update| FLOW-09, FLOW-13        | REQUIRE PLAN|
| CF-604 | CRITICAL | Cross-tenant graph query    | ALL                     | REJECT     |
| CF-605 | HIGH     | Sync community rebuild      | ALL GraphRAG consumers  | REJECT     |
| CF-606 | HIGH     | Hybrid fusion schema change | FLOW-09, FLOW-13        | HALT       |
| CF-607 | HIGH     | Bandit overrides FLOW-13    | FLOW-13                 | WARN       |
| CF-608 | HIGH     | Sync bandit policy update   | ALL                     | REJECT     |
| CF-609 | CRITICAL | Prompt version mutation     | ALL prompt consumers    | REJECT     |
| CF-610 | CRITICAL | Promotion without quality gate | ALL                  | REJECT     |
| CF-611 | HIGH     | Orphan feedback (no trace)  | Self-learning layer     | REJECT     |
| CF-612 | HIGH     | Single-model hallucination check | FLOW-13           | REJECT     |
| CF-613 | CRITICAL | Domain profile cross-tenant | ALL                     | REJECT     |
| CF-614 | HIGH     | Extraction prompts not versioned | Knowledge compiler | HALT   |
| CF-615 | HIGH     | RAG regression > 3%         | FLOW-09, FLOW-13        | BLOCK + HUMAN APPROVAL |
| CF-616 | CRITICAL | Graph edit without BFA gate | FLOW-25                 | REJECT     |
| CF-617 | MEDIUM   | Self-reflection token expansion | Self-learning       | REJECT     |
| CF-618 | HIGH     | Non-deterministic A/B alloc | A/B experiments         | REJECT     |
| CF-619 | CRITICAL | Control plane asset mutation| FLOW-25, asset governance| REJECT    |
| CF-620 | CRITICAL | Promotion ladder step skip  | All promoted assets     | REJECT     |
| CF-621 | HIGH     | Direct OTel SDK in service  | Observability layer     | REJECT     |
| CF-622 | CRITICAL | Budget cap silent truncation| ALL                     | REJECT     |
| CF-623 | HIGH     | Max hops hard-coded         | GraphRAG consumers      | REJECT     |
| CF-624 | HIGH     | Bandit arm dimension change without migration | All | HALT |
| CF-625 | HIGH     | Hard-coded node types in UI | Visual control plane    | REJECT     |
| CF-626 | MEDIUM   | Premature policy update     | Self-learning layer     | WARN       |

---

### Skill Index (SK-290–SK-304)

| Skill  | Name                          | Ladder Status | Depends On          | Used By Tasks               |
|--------|-------------------------------|---------------|---------------------|-----------------------------|
| SK-290 | Adaptive RAG Router           | MINIMAL       | —                   | T441, T442, T459            |
| SK-291 | GraphRAG Indexer              | GENERATED     | —                   | T443, T452, T463, T464      |
| SK-292 | Hybrid Retrieval Fusion       | GENERATED     | SK-290, SK-301      | T444                        |
| SK-293 | Contextual Bandit Router      | GENERATED     | SK-303              | T445, T447                  |
| SK-294 | Trace Span Capture            | GENERATED     | —                   | T448 (all tasks)            |
| SK-295 | User Feedback Ingest          | GENERATED     | SK-294              | T449, T460                  |
| SK-296 | Eval Quality Arbiter          | GENERATED     | —                   | T454                        |
| SK-297 | Prompt Version Registry       | GENERATED     | SK-296              | T450, T451                  |
| SK-298 | Domain Profile Compiler       | GENERATED     | SK-291, SK-297      | T451, T465                  |
| SK-299 | RAG Asset Version Manager     | GENERATED     | —                   | T453, T455, T466            |
| SK-300 | Context Efficiency Monitor    | GENERATED     | —                   | T446, T457                  |
| SK-301 | Reranker Service              | GENERATED     | SK-300              | T442, T444, T458            |
| SK-302 | A/B Test Allocator            | GENERATED     | SK-299              | T456                        |
| SK-303 | Routing Policy Updater        | GENERATED     | SK-295              | T447, T460, T461            |
| SK-304 | Visual Control Plane Canvas   | GENERATED     | SK-290–254 (all)    | T467, T462                  |

---

## BACKWARD COMPATIBILITY INDEX

### FLOW-29 → Existing Flows — Interaction Map

| Existing Flow | Interaction Type | FLOW-29 Impact | Protection |
|---|---|---|---|
| FLOW-09 Search & Discovery | IRagService consumer | RAG strategy extension adds strategies, never renames existing | CF-601, CF-603 |
| FLOW-13 AI Content Pipeline | Prompt library consumer, model consumer | Bandit router advisory only; FLOW-13 explicit config takes precedence | CF-607, CF-609 |
| FLOW-15 MVP Builder | Flow definition consumer | New FLOW-29 flow templates (98–104) are additive, not modifying FLOW-15 templates | None |
| FLOW-25 BFA Governance | Governance provider | FLOW-29 EXTENDS BFA with CF-601–535; FLOW-25 rules CF-1–509 unchanged | CF-602, CF-616 |
| ALL flows | Multi-tenant scope | FLOW-29 adds CF-604, CF-613 for stronger tenant isolation enforcement | CF-604, CF-613 |
| ALL flows | Trace observability | FLOW-29 adds ITraceSpanService — existing flows optionally adopt SK-294 | CF-621 |

### What Is NOT Changed by FLOW-29

```
F1–F1074:     UNCHANGED — all 153 existing families untouched
T1–T388:      UNCHANGED — all existing task types unchanged  
CF-1–CF-509:  UNCHANGED — existing BFA rules unchanged (new rules are additive)
SK-1–SK-250:  UNCHANGED — existing 250 skills unchanged
Templates 1–82: UNCHANGED
IRagService (existing 7 strategies): UNCHANGED — 4 new strategies are additive
```

---

## ANCHOR DOCUMENT MAP (FLOW-29)

| Anchor Document | FLOW-29 Reference |
|---|---|
| TASK_TYPES_CATALOG (current) | T1–T467 — T441–T467 are FLOW-29 additions |
| V39 ENGINE DESIGN (factory-first) | All FLOW-29 factories follow CreateAsync() pattern |
| V40 ENGINE-FABRIC-FIRST (AF+factory+task type deps) | AF-1→AF-11 mapping in each FLOW-29 task type |
| V17/V18 skill library (Skills 01-09) | SK-290–265 extend existing skill library |
| Genie DNA RULES (9 patterns) | Enforced by CF-604, CF-609, CF-619, CF-622 etc. |
| SESSION_STATE_MERGE (post-FLOW-28) | FLOW-29 builds on F1074/T388/CF-509/SK-250 baseline |

---

## DESIGN DECISIONS INDEX (DD-284–DD-297)

| ID     | Decision Summary                                    | Enforced By        |
|--------|-----------------------------------------------------|-------------------|
| DD-284 | Adaptive RAG = IRagService extension, not new fabric| Architecture     |
| DD-285 | GraphRAG community rebuild always async             | CF-605, SK-291    |
| DD-286 | Bandit router reads FREEDOM config only             | CF-608, SK-293    |
| DD-287 | Traces via QUEUE FABRIC (not direct OTel SDK)       | CF-621, SK-294    |
| DD-288 | Prompt versions immutable — promote by new version  | CF-609, SK-297    |
| DD-289 | Domain profiles are tenant-scoped                   | CF-613, SK-298    |
| DD-290 | budget_cap is FREEDOM config, admin-adjustable      | CF-622, SK-300    |
| DD-291 | A/B test results collected via QUEUE FABRIC         | CF-618, SK-302    |
| DD-292 | Self-reflection can only reduce tokens, never expand| CF-617, SK-290    |
| DD-293 | Knowledge graph edits require BFA approval          | CF-616, T452      |
| DD-294 | Feedback aggregation window is configurable         | CF-626, SK-295    |
| DD-295 | Promotion pipeline follows existing GENERATED→CORE  | CF-620, T455      |
| DD-296 | Multi-hop traversal depth is FREEDOM config (max 4) | CF-623, T463      |
| DD-297 | Visual control plane: React Flow, zero hard-coded   | CF-625, SK-304    |

## DESIGN RECORDS INDEX (DR-213–DR-222)

| ID     | Design Record Summary                                  |
|--------|--------------------------------------------------------|
| DR-213 | Why bandit routing is async policy-only (not real-time)|
| DR-214 | Why GraphRAG is a "mode" not the default strategy      |
| DR-215 | Why context efficiency is a first-class metric         |
| DR-216 | Why prompt versions are immutable (not editable)       |
| DR-217 | Why domain compiler profiles are tenant-scoped         |
| DR-218 | Why hallucination detection requires multi-model       |
| DR-219 | Why self-reflection can only reduce (never expand)     |
| DR-220 | Why A/B allocation must be deterministic               |
| DR-221 | Why traces go via QUEUE FABRIC (not direct OTel)       |
| DR-222 | Why promotion pipeline steps cannot be skipped         |
-e 
---

## SAVE POINT: UNIFIED_SOURCE_INDEX_FLOW29_MERGED ✅

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-30 — PromptOps: Self-Learning Prompt Engineering — Cross-Reference
# Date: 2026-03-01
# ═══════════════════════════════════════════════════════════════════

# FLOW-30 UNIFIED SOURCE INDEX
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Date: 2026-03-01

---

## ARTIFACT CROSS-REFERENCE

### FACTORIES (F1248–F1270)

| ID | Interface | Family | Task Types Using | Skills | BFA Rules |
|----|-----------|--------|-----------------|--------|-----------|
| F1248 | IPromptTemplateService | 185 | T475, T483 | SK-305, SK-311 | CF-629, CF-637 |
| F1249 | IPromptVersionService | 185 | T468, T469, T475, T479, T480, T483 | SK-305, SK-309 | CF-629, CF-630, CF-644 |
| F1250 | IPromptPolicyService | 185 | T468, T472 | SK-305 | CF-636 |
| F1251 | IPromptPatchService | 185 | T471, T475, T481 | SK-305, SK-307 | CF-630 |
| F1252 | IJudgeRubricService | 185 | T471, T474, T477 | SK-313 | CF-650 |
| F1253 | IPromptOpsRagService | 186 | T473, T481, T484, T488 | SK-306, SK-312 | CF-627, CF-633 |
| F1254 | ITraceIndexService | 186 | T469, T481 | SK-306, SK-314 | CF-627 |
| F1255 | IEvalCaseService | 186 | T473, T476, T482 | SK-308 | CF-634, CF-641 |
| F1256 | IEvalSuiteService | 186 | T476, T482 | SK-308 | CF-641 |
| F1257 | IPromptCriticService | 187 | T470, T474, T484 | SK-307, SK-313 | CF-647 |
| F1258 | IPromptEditorService | 187 | T475 | SK-307 | CF-629 |
| F1259 | IPromptGuardService | 187 | T475, T477, T483, T488 | SK-307, SK-312 | CF-632, CF-633, CF-637 |
| F1260 | ICandidateEvaluatorService | 187 | T476 | SK-308 | CF-641, CF-650 |
| F1261 | ICanaryAssignmentService | 188 | T472, T478 | SK-309 | CF-640, CF-642 |
| F1262 | IPromotionDecisionService | 188 | T477, T479 | SK-309 | CF-628 |
| F1263 | IPromptRoutingService | 188 | T468, T478, T479, T485 | SK-310 | CF-635, CF-636 |
| F1264 | IRollbackService | 188 | T480 | SK-309 | CF-643, CF-644 |
| F1265 | IPromptTraceService | 189 | T469, T471, T482, T486 | SK-314 | CF-645, CF-648 |
| F1266 | IPromptMetricsService | 189 | T478, T485, T486 | SK-310, SK-314 | CF-649 |
| F1267 | IPromptAuditService | 189 | T479, T480, T487 | SK-314 | CF-631 |
| F1268 | ITenantPromptProfileService | 190 | T483 | SK-311 | CF-637 |
| F1269 | ICrossTenantLearningService | 190 | T484 | SK-311 | CF-638, CF-639 |
| F1270 | IPromptScopeGuardService | 190 | T483 | SK-311 | CF-637 |

---

### TASK TYPES (T468–T488)

| ID | Name | Archetype | Factories | Template | BFA Checks |
|----|------|-----------|-----------|----------|-----------|
| T468 | Prompt Version Selection Gate | ORCHESTRATION | F1249, F1250, F1263 | 90 | CF-636, CF-651 |
| T469 | Node Execution with Trace Capture | AI_GENERATION | F1265, F1254, F1249 | 90 | CF-645, CF-648 |
| T470 | Multi-Model Prompt Run | ORCHESTRATION | F1249, F1257, F1265 | 90 | CF-627 |
| T471 | Judge Verdict Capture & Scoring | JUDGMENT | F1252, F1265, F1251 | 90 | CF-650 |
| T472 | Prompt Improvement Trigger Gate | ORCHESTRATION | F1250, F1261 | 90 | CF-646 |
| T473 | Evidence Pack Retrieval | ORCHESTRATION | F1253, F1254, F1255 | 91 | CF-627 |
| T474 | Prompt Critique Sub-Flow | AI_GENERATION | F1257, F1252 | 91 | CF-647, CF-648 |
| T475 | Candidate Prompt Generation | AI_GENERATION | F1258, F1248, F1249, F1259 | 91 | CF-629, CF-630 |
| T476 | Candidate Evaluation on Eval Suite | JUDGMENT | F1256, F1260, F1255 | 91 | CF-641, CF-650 |
| T477 | Promotion Decision Gate | ORCHESTRATION | F1259, F1262, F1252 | 91 | CF-628 |
| T478 | Canary Rollout Coordinator | ORCHESTRATION | F1261, F1266, F1263 | 91 | CF-640, CF-642 |
| T479 | Production Promotion Gate | ORCHESTRATION | F1249, F1262, F1267, F1263 | 91 | CF-628 |
| T480 | Rollback Trigger | EVENT_PROCESSING | F1264, F1249, F1267 | 91 | CF-643, CF-644 |
| T481 | PromptOps RAG Ingestion | EVENT_PROCESSING | F1253, F1254, F1251 | 90 | CF-627 |
| T482 | Eval Suite Harvest from Failure | EVENT_PROCESSING | F1255, F1256, F1265 | 90 | CF-634 |
| T483 | Tenant Prompt Override Application | ORCHESTRATION | F1268, F1270, F1249 | 92 | CF-637 |
| T484 | Cross-Tenant Learning Aggregation | AI_GENERATION | F1269, F1253, F1257 | 92 | CF-638, CF-639 |
| T485 | Prompt Policy Router | ORCHESTRATION | F1263, F1266 | 90 | CF-635, CF-636 |
| T486 | Prompt Metrics Snapshot | EVENT_PROCESSING | F1266, F1265 | 90 | CF-649 |
| T487 | Prompt Audit Log Entry | EVENT_PROCESSING | F1267 | 90 | CF-631 |
| T488 | Prompt Injection Guard | COMPLIANCE | F1259, F1253 | 90 | CF-632, CF-633 |

---

### SKILLS (SK-305–SK-314)

| ID | Name | Level | Task Types | Factories | BFA Enforced |
|----|------|-------|-----------|-----------|-------------|
| SK-305 | Prompt Version Asset Management | CORE | T468, T469, T475, T479 | F1248, F1249, F1250 | CF-629, CF-630 |
| SK-306 | PromptOps Hybrid RAG Retrieval | INJECTED | T473, T481 | F1253, F1254 | CF-627 |
| SK-307 | Candidate Prompt Generation Pipeline | INJECTED | T474, T475 | F1257, F1258, F1259 | CF-647 |
| SK-308 | Eval Suite Construction & Harvest | INJECTED | T476, T482 | F1255, F1256, F1260 | CF-634, CF-641 |
| SK-309 | Canary Promotion Pipeline | CORE | T477, T478, T479, T480 | F1261, F1262, F1264 | CF-628, CF-640, CF-643, CF-644 |
| SK-310 | Bandit-Based Prompt Routing | INJECTED | T468, T485 | F1263, F1266 | CF-635, CF-636 |
| SK-311 | Multi-Tenant Prompt Safety | CORE | T483, T484 | F1268, F1269, F1270 | CF-637, CF-638, CF-639 |
| SK-312 | Prompt Injection Guard Pattern | CORE | T488 | F1259, F1253 | CF-632, CF-633 |
| SK-313 | TextGrad-Style Prompt Critique | INJECTED | T474 | F1257, F1252 | CF-647, CF-648 |
| SK-314 | PromptOps Observability | CORE | T469, T471, T479, T486, T487 | F1265, F1266, F1267 | CF-631, CF-649 |

---

### BFA RULES (CF-627–CF-651)

| ID | Severity | Applies To | Stress Test |
|----|----------|-----------|-------------|
| CF-627 | CRITICAL | RAG index isolation | ST-390 |
| CF-628 | CRITICAL | Single-judge promotion | ST-391 |
| CF-629 | CRITICAL | Version text mutation | ST-392 |
| CF-630 | HIGH | Missing lineage | ST-392 |
| CF-631 | CRITICAL | Audit log mutation | ST-402 |
| CF-632 | CRITICAL | Injection silent skip | ST-396 |
| CF-633 | HIGH | Raw chunk injection | ST-396 |
| CF-634 | CRITICAL | PII in eval suite | ST-394 |
| CF-635 | HIGH | Variant cap | ST-395 |
| CF-636 | MEDIUM | Exploration rate cap | ST-395 |
| CF-637 | CRITICAL | MACHINE override | ST-398 |
| CF-638 | CRITICAL | Global auto-promotion | ST-397 |
| CF-639 | CRITICAL | Cross-tenant leakage | ST-397 |
| CF-640 | HIGH | Non-deterministic canary | ST-401 |
| CF-641 | HIGH | Insufficient eval evidence | ST-394 |
| CF-642 | HIGH | Unsafe canary rollout | ST-393 |
| CF-643 | HIGH | Rollback timeout | ST-393 |
| CF-644 | HIGH | Failed candidate deletion | ST-393 |
| CF-645 | HIGH | Missing trace | ST-400 |
| CF-646 | MEDIUM | Duplicate optimization | ST-400 |
| CF-647 | HIGH | Unstructured critique | ST-403 |
| CF-648 | MEDIUM | Missing context efficiency | ST-403 |
| CF-649 | MEDIUM | Unbounded metrics query | ST-403 |
| CF-650 | HIGH | Rubric version mismatch | ST-403 |
| CF-651 | CRITICAL | Backward compat break | ST-404 |

---

### DESIGN DECISIONS (DD-298–DD-302)

| ID | Title | Affects |
|----|-------|---------|
| DD-298 | PromptOps RAG must be separate from Operational RAG | F1253, CF-627, SK-306 |
| DD-299 | Promotion requires multi-gate (not single judge) | F1262, CF-628, SK-309 |
| DD-300 | Prompt Versions are immutable after creation | F1249, CF-629, SK-305 |
| DD-301 | Bandit routing for explore/exploit (cap: 3 variants) | F1263, CF-635, SK-310 |
| DD-302 | Cross-tenant learning requires non-sensitive gate | F1269, CF-639, SK-311 |

---

### DESIGN RECORDS (DR-223–DR-225)

| ID | Title | Affects |
|----|-------|---------|
| DR-223 | ES Index Structure for FLOW-30 | All F1248–F1270 |
| DR-224 | Optimization Sub-Flow Trigger Conditions | T472, CF-646 |
| DR-225 | Backward Compatibility Contract | CF-651, All FLOW-01–FLOW-29 |

---

### TEMPLATES (105–107)

| ID | Name | Task Types |
|----|------|-----------|
| 90 | Standard PromptOps Execution Wrapper | T468→T469→T471→T472 (+ T485, T486, T487, T488) |
| 91 | Optimization Sub-Flow | T473→T474→T475→T476→T477→T478→T479 (+ T480 rollback branch) |
| 92 | Multi-Tenant PromptOps | T483→T484 with T488 guard |

---

### FLOW-30 DEPENDENCY GRAPH

```
[Execution Path]
T468 (Select Version) → T469 (Execute + Trace) → T471 (Judge Verdict)
                                                      ↓
                                                T472 (Trigger Gate)
                                                      ↓ if triggered
                                          [Optimization Sub-Flow]
T473 (Evidence Pack) → T474 (Critique) → T475 (Generate Candidate) → T476 (Eval Suite)
                                                                           ↓
                                                               T477 (Promotion Gate)
                                                                     ↓ APPROVED
                                                               T478 (Canary Rollout)
                                                                     ↓ success
                                                               T479 (Production Promote)
                                                                     ↓ regression
                                                               T480 (Rollback)

[Supporting Services — fire on every execution]
T481 (RAG Ingestion) ← T469
T482 (Harvest) ← T471 (when score < threshold)
T486 (Metrics) — scheduled
T487 (Audit) — on every state transition
T488 (Guard) — before T473→T474 context injection

[Multi-Tenant Path]
T483 (Override) → T484 (Cross-Tenant Learn, scheduled)
T488 (Guard) — wraps T484 input
```

---

### FABRIC RESOLUTION MAP (FLOW-30)

| Service | → Fabric | → Provider |
|---------|----------|-----------|
| F1248–F1252 (Control Plane) | DATABASE FABRIC | Elasticsearch |
| F1253 (PromptOps RAG) | RAG FABRIC | Hybrid (vector+graph) |
| F1254–F1256 (Trace/Eval) | DATABASE FABRIC | Elasticsearch |
| F1257–F1260 (Optimization Engine) | AI ENGINE FABRIC | AiDispatcher (multi-model) |
| F1261, F1264 (Canary/Rollback) | QUEUE FABRIC | Redis Streams |
| F1262 (Promotion Decisions) | DATABASE FABRIC | Elasticsearch |
| F1263 (Routing) | AI ENGINE FABRIC | Bandit engine |
| F1265–F1267 (Observability) | DATABASE FABRIC | Elasticsearch |
| F1268–F1269 (MT Profiles) | DATABASE FABRIC | Elasticsearch |
| F1270 (Scope Guard) | CORE FABRIC | MicroserviceBase (in-process) |

---

### INTERACTION WITH PRIOR FLOWS

| Prior Flow | Interaction with FLOW-30 | BFA Rule |
|-----------|-------------------------|----------|
| FLOW-01–FLOW-25 | Opt-in only (promptOpsEnabled=false default) | CF-651 |
| FLOW-15 (MVP Builder) | PromptOps can wrap generated nodes when enabled | CF-651 |
| FLOW-18 (Visual Flow Creation) | User-created flows can enable PromptOps per node | CF-651 |
| FLOW-25 (BFA Governance) | PromptOps sub-flows registered in BFA conflict index | CF-651 |

---

### NEXT AVAILABLE NUMBERS (FLOW-31 starts here)

```
Factory:         F1271    Family: 191
Task Type:       T489
BFA Rule:        CF-652
Stress Test:     ST-405
Skill:           SK-315
Design Decision: DD-303
Design Record:   DR-226
Template:        108
```


# ═══════════════════════════════════════════════════════════════
# FLOW-31 — Design Intelligence: Figma Screen Understanding,
#            GraphRAG Module Mapping, Gap Completion
# Design Decisions: DD-303–DD-322 (20), Design Records: DR-226–DR-239 (14), Templates: 108–115 (8)
# ═══════════════════════════════════════════════════════════════

# FLOW-31 — UNIFIED SOURCE INDEX
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Design Decisions: DD-303–DD-322 (20)
## Design Records: DR-226–DR-239 (14)
## Templates: 108–115 (8 JSON DAG flow definitions)
## Date: 2026-03-01

---

## STARTING NUMBERS (FLOW-31)
```
Design Decision: DD-303   (ends DD-322)
Design Record:   DR-226   (ends DR-239)
Template: 108       (ends 90)
```

---

## SECTION 1 — DESIGN DECISIONS (DD-303–DD-322)

### Zone A — Ingestion & IR Architecture Decisions (DD-303–DD-308)

```
DD-303 : FIGMA_REST_PLUS_PLUGIN_DUAL_INGESTION
  DECISION: Use BOTH Figma REST API (F1271) AND Figma Plugin (F1272) for ingestion.
  RATIONALE: REST API provides node tree + component library but misses prototype reactions,
             local variables, and auto-layout details only accessible via plugin bridge.
             Plugin fills REST gaps. Dual ingestion = complete DesignIR.
  ALTERNATIVES CONSIDERED:
    A) REST only — loses prototype reactions (critical for flow detection)
    B) Plugin only — unreliable in CI/server environments
  SELECTED: REST-primary + Plugin-supplement (plugin events queued via Redis Streams F1272)
  TRADE-OFFS: Extra complexity of plugin event pipeline vs completeness of DesignIR
  MACHINE IMPACT: Both paths always active; plugin results merged into REST output
  FREEDOM IMPACT: Admin can disable plugin supplement if plugin deployment not feasible
  REFERENCES: F1271, F1272, T489, T492, T493

DD-304 : DESIGNIR_AS_DICTIONARY_ONLY
  DECISION: DesignIR, ScreenSemanticsIR, SystemModelIR are all dict[str, Any].
            Zero typed model classes at any IR layer.
  RATIONALE: DNA-1 (parse_document) is non-negotiable. Figma schema evolves constantly
             typed models break on schema changes. Dictionary approach is schema-forward compatible.
  ALTERNATIVES CONSIDERED:
    A) Typed models with [JsonExtensionData] for unknown fields — still breaks on rename
    B) Partial typing with dict[str, Any] for unknown fields — adds complexity
  SELECTED: Pure dict[str, Any] throughout all IR layers
  TRADE-OFFS: Less IntelliSense in generated service code vs permanent schema resilience
  IRON RULE: CF-658 enforces this; AF-7 gate validates
  REFERENCES: F1273, F1279–F1286, T490, T495–T497, CF-658

DD-305 : THREE_LAYER_IR_ARCHITECTURE
  DECISION: DesignIR (structural) → ScreenSemanticsIR (per-screen functional) → SystemModelIR (global)
            is the canonical IR pipeline. No shortcutting from DesignIR to SystemModelIR.
  RATIONALE: Each layer produces independently queryable artifacts stored in Elasticsearch.
             Skipping ScreenSemanticsIR means no per-screen evidence maps — makes hallucination
             detection (CF-670) impossible.
  ALTERNATIVES CONSIDERED:
    A) One-shot: DesignIR → SystemModelIR directly (cheaper but no per-screen auditability)
    B) Two layers: DesignIR → ScreenSemanticsIR → SystemModelIR (selected)
  SELECTED: Three-layer (as designed). Middle layer is mandatory.
  REFERENCES: F1279–F1286, F1287–F1294, F1317–F1322, T495–T515

DD-306 : SCREEN_FINGERPRINT_FOR_CHANGE_DETECTION
  DECISION: F1283 (IScreenFingerprintService) computes a hash of component composition
            per screen. Used as cheap change-detection mechanism before re-processing.
  RATIONALE: Avoids expensive AI re-processing for screens that haven't materially changed.
             Component composition hash is deterministic and fast to compute.
  HASH INPUTS: sorted list of (componentId, instanceCount) tuples + layout primitive set
  STABILITY: Stable for visual restyling (color/font changes); unstable for structural changes
  TRADE-OFFS: May miss purely textual content changes — acceptable since text changes
             don't change module mapping (unless new action-triggering text added)
  REFERENCES: F1283, T494, CF-668

DD-307 : PROTOTYPE_LINKS_AS_FIRST_CLASS_FLOW_EDGES
  DECISION: Figma prototype reactions (navigate, overlay, swap) are treated as FLOW EDGES
            in the UI graph, not as optional metadata.
  RATIONALE: Navigation flows are the primary signal for "does this system have a checkout flow?",
             "is there a profile→settings path?", etc. Without flow edges, gap detection
             for missing screens is impossible.
  EXTRACTION: F1272 (plugin) extracts reactions; F1284 (interaction semantics) classifies
              trigger type (tap→navigate vs tap→overlay vs drag→swap)
  REFERENCES: F1272, F1284, F1296, F1300, T492, T493, CF-664

DD-308 : VERSIONED_INGESTION_AS_IMMUTABLE_SNAPSHOTS
  DECISION: Each ingestion run creates an IMMUTABLE snapshot indexed by (tenantId, fileKey, version).
            Re-runs don't overwrite; they create new snapshot documents.
  RATIONALE: Enables comparison between design versions; enables learning loop to track how
             design evolved and how module mappings changed over time.
  STORAGE IMPACT: Higher ES storage but enables historical queries
  FREEDOM: Admin configures snapshot retention policy (e.g., keep last 10 versions)
  REFERENCES: F1277, T489, CF-656
```

---

### Zone B — AI & RAG Architecture Decisions (DD-309–DD-314)

```
DD-309 : HYBRID_RAG_MANDATORY
  DECISION: Both Vector RAG (Family 195) and GraphRAG (Family 194) are ALWAYS run during
            module mapping. Neither is optional.
  RATIONALE: Vector RAG catches "this looks like X we've seen before" (similarity).
             GraphRAG enforces "if Cart exists, Checkout should exist" (constraints).
             Either alone misses critical signals. Hybrid = complementary coverage.
  RAG FABRIC STRATEGY: IRagService routes to "Multi" strategy which internally invokes
                       both Graph and Vector sub-strategies.
  TRADE-OFFS: Higher cost per analysis vs lower hallucination rate, better gap detection
  REFERENCES: SK-388/SK-389 (IRagService/HybridRag), F1295–F1309, T501–T506, CF-678

DD-310 : EVIDENCE_BASED_CONFIDENCE_SCORING
  DECISION: Module candidate confidence scores are COMPUTED from evidence count + quality,
            NOT from LLM self-reported confidence.
  RATIONALE: LLMs consistently over-report confidence. Evidence-based scoring anchors
             confidence to verifiable artifacts (nodeId, component name, text).
  FORMULA: confidence = (distinct_evidence_count × 0.4) + (evidence_quality_score × 0.4)
           + (llm_self_confidence × 0.2)
  Evidence quality score: "component name match" > "text label match" > "layout pattern match"
  REFERENCES: F1312, T509, CF-688, CF-670

DD-311 : MULTIMODAL_REQUIRED_FOR_COMPLEX_SCREENS
  DECISION: Any screen with estimated height ≥500px OR > 20 nodes requires multimodal
            (image + node tree) analysis. Text-only analysis is forbidden for these screens.
  RATIONALE: Complex screens have spatial relationships (sidebar vs main content, tab vs
             modal, hero vs grid) that are ambiguous from node tree alone.
             Image provides spatial context LLMs cannot infer from tree structure.
  COST IMPACT: Vision models cost ~3x text models per token
  FREEDOM: Threshold (500px / 20 nodes) configurable by admin
  REFERENCES: F1288, F1274, T498, CF-672

DD-312 : GRAPHRAG_PROJECT_VS_ONTOLOGY_SPLIT
  DECISION: Two types of graphs with different access modes:
            (A) PROJECT GRAPHS (tenant-scoped, read-write): ui_graph, navigation_flows, module_candidates
            (B) ONTOLOGY GRAPHS (global, read-only): system_type_graph, module_dependency_graph
  RATIONALE: Project graphs are tenant-specific analysis artifacts.
             Ontology graphs encode universal knowledge (module dependencies, system type signatures)
             shared across all tenants. Mixing write permissions is a data integrity risk.
  IRON RULE: CF-681 enforces read-only on ontology graphs at runtime
  REFERENCES: F1295–F1303, CF-681, ST-430

DD-313 : UNCLASSIFIED_SCREENS_NEVER_GUESSED
  DECISION: Screens where ALL archetype candidates score below 0.4 confidence are tagged
            UNCLASSIFIED. They are NEVER assigned the highest-scoring candidate as default.
  RATIONALE: Forcing a classification below confidence floor introduces false evidence into
             the system type inference → cascades into wrong gap detection.
             "Don't know" is better than "wrong confidence."
  UX: UNCLASSIFIED screens surfaced to user for manual classification. Suggestions provided
      as "weak signals" but not auto-applied.
  REFERENCES: F1289, T498, CF-671, ST-412

DD-314 : THREE_SCREEN_MINIMUM_FOR_SYSTEM_TYPE
  DECISION: System type inference (T512) requires minimum 3 classified screens.
            Single-screen and 2-screen projects return INSUFFICIENT_DATA.
  RATIONALE: System type signatures (store, social, hotel, etc.) require multi-screen evidence.
             Single screen "ProductCard" could be a shop, a marketplace, a directory, or even
             a dashboard widget. Multi-screen cooccurrence removes ambiguity.
  REFERENCES: F1317, T512, CF-684, ST-421
```

---

### Zone C — Module Mapping & Gap Completion Decisions (DD-315–DD-319)

```
DD-315 : MODULE_MATRIX_AS_GROUND_TRUTH_ONTOLOGY
  DECISION: The module-architecture matrix (DEFINITIVE_MODULE_ARCHITECTURE.md,
            GENERIC_MODULE_ANALYSIS_COMPLETE.md) is the canonical ontology for:
            (a) which modules exist per system type
            (b) module dependency rules
            (c) required vs optional modules per system type
  RATIONALE: Using an external ontology (not LLM-generated) ensures stable, auditable
             module definitions. LLMs retrieve from this ontology — they don't define it.
  LOADING: F1310 (IModuleMatrixLoaderService) loads matrix into ES on startup; versioned.
  REFERENCES: F1310, F1301, T507, CF-683

DD-316 : FABRIC_FIRST_WIRING_PLAN
  DECISION: Module wiring plan output (F1314) contains ONLY references to config document
            IDs in Elasticsearch. Never hardcoded site-type values, module names, or
            platform-specific strings.
  RATIONALE: DNA-6 (DynamicController/fabric-first). Wiring plan is the "code" that
             the engine injects — it must be free of any hardcoded decisions.
             All values flow from FREEDOM layer config docs.
  EXAMPLES:
    WRONG: { "system_type": "shop", "cart_module": "enabled" }
    RIGHT: { "config_doc_ref": "figma31::tenant1::wiring::abc123" }
  REFERENCES: F1314, CF-686, ST-423

DD-317 : GAP_SEVERITY_TAXONOMY
  DECISION: Four severity levels for detected gaps:
            CRITICAL — dependency constraint violated (Cart without Checkout)
            HIGH     — system-type required module missing (Shop without ProductList)
            MEDIUM   — common module absent (EmptyState, ErrorState, Loading screens)
            LOW      — nice-to-have (404 page, Onboarding flow)
  RATIONALE: Flat severity leads to alert fatigue. Tiered severity lets users triage.
  AUTO-STUB: Only CRITICAL gaps get auto-stub generation by default (CF-690).
  REFERENCES: F1323, T513, CF-690, DD-318

DD-318 : AUTO_STUB_OPT_IN_FOR_NON_CRITICAL
  DECISION: Auto-stub generation for MEDIUM and LOW severity gaps requires explicit
            admin opt-in via FREEDOM config (auto_stub_severities array).
            Default = ["CRITICAL"] only.
  RATIONALE: Medium/Low gaps may reflect intentional design decisions (e.g., "no 404 page
             because we handle all routes"). Auto-generating stubs for these would create
             noise and waste developer review time.
  REFERENCES: F1328, T513, CF-690, ST-425

DD-319 : AMBIGUOUS_SYSTEM_TYPE_USER_GATE
  DECISION: When top-2 system type candidates are within 0.1 confidence of each other,
            pipeline PAUSES and presents both to user for selection. Does NOT auto-resolve.
  RATIONALE: System type choice propagates through ALL gap detection. Wrong auto-selection
             generates wrong gap report (e.g., detecting "missing Stories screen" on a
             marketplace that happens to have a feed).
  UX: Both candidates shown with supporting evidence. User picks one. Pipeline continues.
  REFERENCES: F1321, T512, T513, CF-689, ST-422
```

---

### Zone D — Learning Loop Decisions (DD-320–DD-322)

```
DD-320 : NEGATIVE_EXEMPLAR_INJECTION_THRESHOLD
  DECISION: A correction is only injected as a negative exemplar into the RAG corpus
            after it has been validated by a human reviewer (or after 3 identical corrections
            from different users on the same screen type).
  RATIONALE: Single incorrect corrections (user error, misunderstanding) should not
             corrupt the training corpus. Threshold prevents noise injection.
  FREEDOM: Threshold configurable (default: 1 human-validated OR 3 unvalidated identical)
  REFERENCES: F1330, T514, CF-691

DD-321 : BENCHMARK_AS_REGRESSION_GATE
  DECISION: The label benchmark (F1332) is run AFTER every learning cycle application.
            If accuracy drops >5%, changes are ROLLED BACK and HUMAN_REVIEW triggered.
  RATIONALE: Learning loops can cause regression (feedback poisoning, adversarial corrections).
             Automated rollback + human gate protects system accuracy.
  METRICS TRACKED: accuracy per module type, precision/recall per module, calibration curve
  REFERENCES: F1332, F1333, T515, CF-693, ST-428

DD-322 : CROSS_TENANT_EXEMPLAR_PRIVACY
  DECISION: Positive and negative exemplars are stored with tenantId scope.
            No cross-tenant exemplar sharing by default (even if exemplars would benefit all).
  RATIONALE: Figma designs may contain proprietary UX patterns. Sharing exemplars cross-tenant
             creates IP leakage risk.
  EXCEPTION: Tenants may opt-in to anonymized global exemplar pool (admin config).
             Anonymization strips all tenant-specific text/component names, keeping only
             structural patterns (layout primitives, module signature hash).
  REFERENCES: F1330, F1331, CF-678
```

---

## SECTION 2 — DESIGN RECORDS (DR-226–DR-239)

```
DR-226 : FIGMA_API_RATE_LIMIT_ARCHITECTURE
  DATE: 2026-03-01
  DECISION MADE: Use Redis token bucket (F1278) as rate-limit guard for all Figma API calls.
  CONTEXT: Figma REST API has per-seat rate limits (60 req/min for editor seats, 30 for viewer).
           Multiple tenant pipelines sharing same API key can exhaust quota.
  IMPLEMENTATION:
    - F1278 maintains per-(tenantId, apiKeyTier) token buckets in Redis
    - Token refill: 60/min for editor, 30/min for viewer
    - T489 acquires token via QUEUE FABRIC before each API batch
    - Failure to acquire token = exponential backoff, max 3 retries, then QUEUE event for retry later
  STATUS: ACCEPTED
  REFERENCES: F1278, CF-654, ST-405

DR-227 : DESIGNIR_ELASTICSEARCH_INDEXING_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: Each DesignIR layer (structural, semantic, system model) gets dedicated ES indices.
                 No co-mingling of IR layers in same index.
  CONTEXT: Co-mingled indices cause query performance degradation when filtering by IR type.
           Dedicated indices allow per-type retention policies and independent scaling.
  INDICES DEFINED:
    designir_screens (F1279), ui_controls (F1280), layout_semantics (F1281),
    component_signatures (F1282), screen_fingerprints (F1283), interaction_semantics (F1284),
    design_ir (F1285), ir_validation_log (F1286)
  STATUS: ACCEPTED
  REFERENCES: F1279–F1286, DD-305

DR-228 : GRAPHRAG_NEO4J_VS_ELASTICSEARCH
  DATE: 2026-03-01
  DECISION MADE: Use DATABASE FABRIC (IDatabaseService) with Elasticsearch as initial graph store
                 for UI graphs. Neo4j available as optional provider via FREEDOM config.
  CONTEXT: Neo4j provides native graph traversal (Cypher) but adds operational complexity.
           Elasticsearch with nested documents + parent-join handles the graph traversal needs
           for FLOW-31's query patterns (module dependency traversal, navigation flow queries).
           Factory F1301 (IModuleDependencyGraphService) resolves through DATABASE FABRIC.
  TRADE-OFFS: ES graph queries slower than Cypher for deep traversal (>5 hops) but sufficient
              for the module dependency graph (max 3 hops in practice).
  ESCALATION: If graph query performance becomes a bottleneck, swap to Neo4j provider via
              FREEDOM config without code change (IDatabaseService fabric).
  STATUS: ACCEPTED — ES first, Neo4j as escalation path
  REFERENCES: F1295–F1303, DD-312

DR-229 : VECTOR_EMBEDDING_PROVIDER
  DATE: 2026-03-01
  DECISION MADE: Use IAiProvider (AI ENGINE FABRIC) for all embedding generation.
                 OpenAI text-embedding-3-large as default; configurable via FREEDOM.
  CONTEXT: Embedding generation must be provider-agnostic for same reasons as text generation.
           All embedding calls go through IAiProvider.EmbedAsync() — same fabric as generation.
  EMBEDDING DIMENSIONS: 3072 (text-embedding-3-large); stored in ES with knn index
  FREEDOM: Admin can configure embedding model (e.g., Cohere, Voyage AI, local Ollama) via fabric
  STATUS: ACCEPTED
  REFERENCES: F1304–F1309, T505, T506

DR-230 : SCREEN_SIMILARITY_SEARCH_KNN
  DATE: 2026-03-01
  DECISION MADE: Screen similarity search (F1307) uses Elasticsearch kNN vector search.
                 k=10 nearest neighbors; score floor 0.6 (CF-680).
  CONTEXT: kNN in ES 8.x supports HNSW index with efficient approximate nearest neighbor search.
           No separate vector database needed — embedded in existing ES fabric.
  INDEX: screen_embeddings with knn mapping { dims: 3072, similarity: cosine }
  FILTER: tenantId applied as pre-filter (exact match) before kNN — ES 8.x native pre-filter support
  STATUS: ACCEPTED
  REFERENCES: F1307, CF-679, CF-680, DR-229

DR-231 : MODULE_MATRIX_LOADING_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: Module matrix loaded from Elasticsearch at service startup by F1310.
                 Cached in-memory (Redis) with 1-hour TTL. Version tracked per cache entry.
  CONTEXT: Module matrix is large (~20 modules × 15 site types = 300 cells with configuration).
           Loading per-request is too expensive. Caching is required.
  VERSION TRACKING: Each matrix document has schema_version field.
                    F1310 invalidates cache if matrix version changes (admin-triggered).
  STATUS: ACCEPTED
  REFERENCES: F1310, CF-683, DD-315

DR-232 : EVIDENCE_GATE_MINIMUM_THRESHOLDS
  DATE: 2026-03-01
  DECISION MADE: Evidence coverage gate (F1334) minimum thresholds by claim type:
    module_candidate: ≥2 distinct evidence items required (nodeId + text OR component name)
    user_action: ≥1 evidence item required (text label minimum)
    data_entity: ≥1 evidence item required (text label minimum)
    archetype: ≥3 evidence items required (layout pattern + widget + text minimum)
  CONTEXT: Archetype claims have highest downstream impact (gates system type inference).
           Higher threshold prevents confident hallucination on archetypes.
  STATUS: ACCEPTED
  REFERENCES: F1334, CF-670, DD-310

DR-233 : FLOW_TEMPLATE_DAG_STRUCTURE
  DATE: 2026-03-01
  DECISION MADE: 8 flow templates (Templates 108–115) map to 8 sub-pipelines.
                 Main orchestration template (Template: 108) calls sub-pipeline templates.
                 Each step in DAG references factory interface via CreateAsync().
  STRUCTURE:
    Template: 108 (figma-ingestion-v1.json):        T489→T490→T491→T492→T493→T494
    Template: 109 (designir-processing-v1.json):     T495→T496→T497 (per-screen batch)
    Template: 110 (screen-semantics-v1.json):        T498→T499→T500 (per-screen, parallelizable)
    Template: 111 (graph-build-v1.json):             T501→T502→T503→T504
    Template: 112 (vector-embedding-v1.json):        T505→T506
    Template: 113 (module-mapping-v1.json):          T507→T508→T509→T510→T511
    Template: 114 (gap-completion-v1.json):          T512→T513
    Template: 115 (learning-loop-v1.json):           T514→T515
  STATUS: ACCEPTED
  REFERENCES: Templates 108–115, SK-391/SK-392 (FlowOrchestrator/RagStrategyRegistry)

DR-234 : PER_SCREEN_PARALLELIZATION_STRATEGY
  DATE: 2026-03-01
  DECISION MADE: ScreenSemanticsIR extraction (Template: 110, T498–T500) runs per-screen in parallel,
                 limited to max 10 concurrent screens per tenant.
  CONTEXT: A file with 200 screens cannot be processed sequentially (would take hours at ~10s/screen).
           Parallelization is required but must be bounded to prevent AI provider quota exhaustion.
  ORCHESTRATION: FlowOrchestrator (SK-392 (RagStrategyRegistry)) spawns parallel sub-flows, one per screen.
                 Redis Streams tracks completion; main flow waits on allSettled.
  FREEDOM: max_concurrent_screens configurable (default 10)
  STATUS: ACCEPTED
  REFERENCES: F1287–F1294, T498, Templates 85, DR-235

DR-235 : ALLSETTLED_PATTERN_FOR_SCREEN_BATCH
  DATE: 2026-03-01
  DECISION MADE: Screen batch processing uses allSettled (not allResolved) pattern.
                 Failed screens are collected; pipeline continues with succeeded screens.
  CONTEXT: A single screen failing multimodal extraction should not block all 199 other screens.
           Partial success is acceptable; full failure is escalated.
  PARTIAL_COMPLETE: CF-669 defines PARTIAL_COMPLETE state handling.
  REFERENCES: T497, CF-669, DR-234

DR-236 : LEARNING_LOOP_ISOLATION_FROM_ANALYSIS_PIPELINE
  DATE: 2026-03-01
  DECISION MADE: Learning loop (Template: 115, T514–T515) runs on a SEPARATE queue consumer group
                 from the analysis pipeline (Templates 83–89).
  CONTEXT: Learning loop is background, non-urgent. Analysis pipeline is user-facing, urgent.
           Shared consumer group = learning loop starves analysis pipeline during high-load periods.
  QUEUE SEPARATION: Analysis: consumer group "figma31-{tenantId}-analysis"
                    Learning: consumer group "figma31-{tenantId}-learning"
  STATUS: ACCEPTED
  REFERENCES: F1333, CF-691, Template: 115

DR-237 : UNCLASSIFIED_SCREEN_HANDLING
  DATE: 2026-03-01
  DECISION MADE: UNCLASSIFIED screens are stored in ES with status="unclassified" and surfaced
                 to admin UI in "Review Queue" section. They are excluded from system type inference
                 but included in gap detection as "unknown" (in case they were supposed to be
                 a specific screen type).
  CONTEXT: UNCLASSIFIED screens may represent genuinely novel UX patterns not in ontology.
           They should be visible for human classification, which feeds the learning loop.
  REFERENCES: F1289, T498, CF-671, DD-313

DR-238 : BFA_REGISTRATION_SCOPE
  DATE: 2026-03-01
  DECISION MADE: FLOW-31 registers in BFA:
    ENTITIES: DesignFile, FigmaScreen, ScreenSemantics, UIGraph, ModuleCandidate, SystemModel, GapReport
    EVENTS: ingestion.completed, semantics.extracted, module.mapped, system-type.inferred, gap.detected,
            correction.submitted, learning-cycle.completed
    APIs: /api/flow31/ingest, /api/flow31/status/{fileKey}, /api/flow31/results/{fileKey},
          /api/flow31/corrections, /api/flow31/gaps/{fileKey}
  CONFLICT CHECKS AGAINST: FLOW-15, FLOW-16, FLOW-17, FLOW-18, FLOW-22, FLOW-23, FLOW-25
  STATUS: ACCEPTED
  REFERENCES: T489, T511, T513, CF-652–CF-693

DR-239 : FLOW31_PROMOTION_LADDER_ENTRY
  DATE: 2026-03-01
  DECISION MADE: FLOW-31 generated services enter at GENERATED level.
                 Promotion path: GENERATED → INJECTED (after benchmark passes) → MINIMAL (after
                 3 projects successfully processed) → CORE (after cross-tenant validation complete).
  PROMOTION GATES:
    GENERATED→INJECTED: All 26 stress tests passing; CF-652–CF-693 all green
    INJECTED→MINIMAL: 3 real projects analyzed, learning loop cycle completed once
    MINIMAL→CORE: Cross-tenant isolation validated; accuracy benchmark ≥0.85
  STATUS: ACCEPTED
  REFERENCES: CF-693, DD-321
```

---

## SECTION 3 — FLOW TEMPLATES (108–115)

### Template: 108 — figma-ingestion-v1.json
```json
{
  "id": "figma-ingestion-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Figma file ingestion gate — structural extraction and DesignIR preparation",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T489",
      "factory": "F1271",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC",
      "description": "Figma full-file ingestion gate — rate-limit token acquisition + API fetch + version check",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T490",
      "factory": "F1273",
      "fabric": "DATABASE_FABRIC",
      "description": "Node tree normalization — parse raw JSON → canonical Dictionary node tree",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T491",
      "factory": "F1274",
      "fabric": "AI_ENGINE_FABRIC + DATABASE_FABRIC",
      "description": "Image rendering — render frames to PNG for multimodal AI input",
      "onSuccess": "step-4",
      "onFailure": "retry-3"
    },
    {
      "id": "step-4",
      "taskType": "T492",
      "factory": "F1272",
      "fabric": "QUEUE_FABRIC",
      "description": "Plugin data extraction — prototype reactions + local variables via plugin bridge",
      "onSuccess": "step-5",
      "onFailure": "warn-continue"
    },
    {
      "id": "step-5",
      "taskType": "T493",
      "factory": "F1284",
      "fabric": "DATABASE_FABRIC",
      "description": "Prototype flow mapping — build navigation graph from reactions",
      "onSuccess": "step-6",
      "onFailure": "DLQ"
    },
    {
      "id": "step-6",
      "taskType": "T494",
      "factory": "F1283",
      "fabric": "DATABASE_FABRIC",
      "description": "Screen fingerprinting — compute component composition hashes for change detection",
      "onSuccess": "EMIT:ingestion.completed",
      "onFailure": "DLQ"
    }
  ],
  "parallelism": "sequential",
  "errorPolicy": "DataProcessResult[T] — never throw, always return Failure state"
}
```

### Template: 109 — designir-processing-v1.json
```json
{
  "id": "designir-processing-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "DesignIR assembly per screen — layout semantics, component signatures, IR validation",
  "trigger": "EVENT:ingestion.completed",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T495",
      "factory": "F1279, F1280, F1281, F1282",
      "fabric": "DATABASE_FABRIC",
      "description": "Per-screen DesignIR extraction — layout primitives, widget detection, component signatures",
      "parallelism": "per-screen, max 10 concurrent",
      "onSuccess": "step-2",
      "onFailure": "PARTIAL_COMPLETE"
    },
    {
      "id": "step-2",
      "taskType": "T496",
      "factory": "F1284, F1285",
      "fabric": "DATABASE_FABRIC",
      "description": "DesignIR assembly — merge screen-level artifacts into file-level DesignIR",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T497",
      "factory": "F1286",
      "fabric": "DATABASE_FABRIC",
      "description": "IR validation gate — completeness check (screens[], components[], designTokens, screenMap, prototypeLinks)",
      "onSuccess": "EMIT:designir.ready",
      "onFailure": "BLOCK:incomplete-IR"
    }
  ]
}
```

### Template: 110 — screen-semantics-v1.json
```json
{
  "id": "screen-semantics-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Per-screen semantic extraction — multimodal AI → ScreenSemanticsIR with evidence",
  "trigger": "EVENT:designir.ready",
  "parallelism": "per-screen, max 10 concurrent (allSettled)",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T498",
      "factory": "F1287, F1288, F1289",
      "fabric": "AI_ENGINE_FABRIC + DATABASE_FABRIC",
      "description": "ScreenSemanticsIR extraction — multimodal prompt → archetype + controls + actions + entities + evidence",
      "requires": ["imageUrl from T491", "nodeTree from T490"],
      "onSuccess": "step-2",
      "onFailure": "UNCLASSIFIED"
    },
    {
      "id": "step-2",
      "taskType": "T499",
      "factory": "F1290, F1291, F1292",
      "fabric": "DATABASE_FABRIC",
      "description": "Entity + action mapping — normalize entities/actions; build evidence map",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T500",
      "factory": "F1293, F1294",
      "fabric": "DATABASE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Semantic IR validation — evidence coverage gate + schema completeness check",
      "onSuccess": "EMIT:semantics.extracted",
      "onFailure": "BLOCK:evidence-gate-fail"
    }
  ]
}
```

### Template: 111 — graph-build-v1.json
```json
{
  "id": "graph-build-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "UI graph construction — nodes, edges, module signatures, GraphRAG retrieval",
  "trigger": "EVENT:semantics.extracted (all screens complete)",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T501",
      "factory": "F1295, F1296",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC (distributed lock)",
      "description": "UI graph construction — screens as nodes; prototype links + semantic relations as edges",
      "distributedLock": "{tenantId}::{fileKey}::graph-build",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T502",
      "factory": "F1297, F1298",
      "fabric": "DATABASE_FABRIC",
      "description": "Module signature graph enrichment — overlay module candidate signals onto UI graph",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T503",
      "factory": "F1299, F1300, F1301",
      "fabric": "DATABASE_FABRIC (read-only for F1299, F1301)",
      "description": "System-type graph alignment — check project graph against global ontology graphs",
      "onSuccess": "step-4",
      "onFailure": "DLQ"
    },
    {
      "id": "step-4",
      "taskType": "T504",
      "factory": "F1302, F1303",
      "fabric": "RAG_FABRIC (Graph strategy)",
      "description": "GraphRAG retrieval — retrieve module dependency constraints + similar navigation patterns",
      "onSuccess": "EMIT:graph.built",
      "onFailure": "warn-continue"
    }
  ]
}
```

### Template: 112 — vector-embedding-v1.json
```json
{
  "id": "vector-embedding-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Vector embedding generation and similarity retrieval for screens and components",
  "trigger": "EVENT:semantics.extracted",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T505",
      "factory": "F1304, F1305, F1306",
      "fabric": "AI_ENGINE_FABRIC (EmbedAsync) + DATABASE_FABRIC (kNN index)",
      "description": "Embed screens, components, archetypes — generate 3072-dim vectors, store in kNN index",
      "parallelism": "per-screen, max 10 concurrent",
      "onSuccess": "step-2",
      "onFailure": "DLQ"
    },
    {
      "id": "step-2",
      "taskType": "T506",
      "factory": "F1307, F1308, F1309",
      "fabric": "DATABASE_FABRIC (kNN search) + RAG_FABRIC (Vector strategy)",
      "description": "Similarity search — find nearest known archetypes/module compositions, score floor 0.6",
      "onSuccess": "EMIT:embeddings.ready",
      "onFailure": "warn-continue"
    }
  ]
}
```

### Template: 113 — module-mapping-v1.json
```json
{
  "id": "module-mapping-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Module mapping — candidate resolution, confidence scoring, wiring plan, config doc requirements",
  "trigger": "EVENT:graph.built AND EVENT:embeddings.ready",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T507",
      "factory": "F1310",
      "fabric": "DATABASE_FABRIC + CORE_FABRIC (cache)",
      "description": "Module matrix loading — load versioned module matrix from ES; validate version",
      "onSuccess": "step-2",
      "onFailure": "BLOCK:matrix-load-fail"
    },
    {
      "id": "step-2",
      "taskType": "T508",
      "factory": "F1311, F1312",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC (Multi: Graph+Vector)",
      "description": "Module candidate resolution — per screen, merge graph+vector signals into ranked candidates with confidence",
      "onSuccess": "step-3",
      "onFailure": "DLQ"
    },
    {
      "id": "step-3",
      "taskType": "T509",
      "factory": "F1311, F1313",
      "fabric": "DATABASE_FABRIC",
      "description": "Cross-flow BFA check — validate inferred entities against existing FLOW-16/17/18+ BFA registrations",
      "onSuccess": "step-4",
      "onFailure": "BLOCK:bfa-conflict"
    },
    {
      "id": "step-4",
      "taskType": "T510",
      "factory": "F1314, F1315",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC",
      "description": "Wiring plan generation — produce fabric-first config doc references; generate config doc requirements list",
      "onSuccess": "step-5",
      "onFailure": "DLQ"
    },
    {
      "id": "step-5",
      "taskType": "T511",
      "factory": "F1316, F1337, F1336",
      "fabric": "DATABASE_FABRIC",
      "description": "Module mapping validation gate — DNA compliance + dependency constraint + evidence coverage checks",
      "onSuccess": "EMIT:module.mapped",
      "onFailure": "BLOCK:mapping-gate-fail"
    }
  ]
}
```

### Template: 114 — gap-completion-v1.json
```json
{
  "id": "gap-completion-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "System type inference + gap detection + gap report + optional stub generation",
  "trigger": "EVENT:module.mapped",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T512",
      "factory": "F1317, F1318, F1319, F1320, F1321, F1322",
      "fabric": "DATABASE_FABRIC + RAG_FABRIC (Graph strategy)",
      "description": "System type inference — aggregate module evidence → rank system type candidates → ambiguity gate → SystemModelIR",
      "minimumScreens": 3,
      "onSuccess": "step-2",
      "onAmbiguous": "PAUSE:user-selection",
      "onInsufficient": "EMIT:insufficient-data"
    },
    {
      "id": "step-2",
      "taskType": "T513",
      "factory": "F1323, F1324, F1325, F1326, F1327, F1328, F1338",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Gap completion — detect missing modules/screens/flows → gap report → CRITICAL auto-stubs → judge gate",
      "onSuccess": "EMIT:gap.detected",
      "onFailure": "DLQ"
    }
  ]
}
```

### Template: 115 — learning-loop-v1.json
```json
{
  "id": "learning-loop-v1",
  "version": "1.0.0",
  "flow": "FLOW-31",
  "description": "Feedback correction injection and learning loop orchestration",
  "consumerGroup": "figma31-{tenantId}-learning",
  "trigger": "EVENT:correction.submitted OR SCHEDULE:daily",
  "steps": [
    {
      "id": "step-1",
      "taskType": "T514",
      "factory": "F1329, F1330, F1331",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + RAG_FABRIC",
      "description": "Correction injection — store correction in audit log → inject as negative/positive exemplar into RAG corpus",
      "onSuccess": "step-2",
      "onFailure": "BLOCK:audit-incomplete"
    },
    {
      "id": "step-2",
      "taskType": "T515",
      "factory": "F1332, F1333, F1312",
      "fabric": "DATABASE_FABRIC + QUEUE_FABRIC + AI_ENGINE_FABRIC",
      "description": "Learning loop orchestration — benchmark → accuracy check → human gate if drop >5% → update confidence model",
      "trigger": "SCHEDULE:daily OR correction_count >= 10",
      "onSuccess": "EMIT:learning-cycle.completed",
      "onAccuracyDrop": "BLOCK:human-review-required"
    }
  ]
}
```

---

## SECTION 4 — ARTIFACT NUMBER CROSS-REFERENCE (FLOW-31 COMPLETE)

| Artifact Type | Range | Count | Status |
|--------------|-------|-------|--------|
| Factories | F1271–F1338 | 68 | ✅ Phase 2 |
| Families | 191–199 | 9 | ✅ Phase 2 |
| Task Types | T489–T515 | 27 | ✅ Phase 3 |
| Templates | 108–115 | 8 | ✅ Phase 6 |
| Skills | SK-315–SK-329 | 15 | ✅ Phase 4 |
| BFA Rules | CF-652–CF-693 | 42 | ✅ Phase 5 |
| Stress Tests | ST-405–ST-430 | 26 | ✅ Phase 5 |
| Design Decisions | DD-303–DD-322 | 20 | ✅ Phase 6 |
| Design Records | DR-226–DR-239 | 14 | ✅ Phase 6 |

### NEXT AVAILABLE (FLOW-32 starts here)
```
Factory:         F1143
Family:          163
Task Type:       T416
Template:        91
BFA Rule:        CF-694
Stress Test:     ST-326
Skill:           SK-266
Design Decision: DD-265
Design Record:   DR-198
```


---

## BACKWARD COMPATIBILITY STATEMENT

All previously defined artifacts are unchanged. FLOW-31 is additive only.
-e 

---

# ═══════════════════════════════════════════════════════
# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE
# Added: 2026-03-03
# ═══════════════════════════════════════════════════════

# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE — UNIFIED SOURCE INDEX
## Date: 2026-03-03
## Extends: UNIFIED_SOURCE_INDEX_MERGED.md

---

## SECTION 1 — FLOW-32 ARTIFACT SUMMARY

| Artifact Type | Range | Count |
|---------------|-------|-------|
| Factory Interfaces | F1339–F1418 | 80 |
| Factory Families | 200–210 | 11 |
| Task Types | T516–T535 | 20 |
| Templates | 116–119 | 4 |
| Skills | SK-330–SK-345 | 16 |
| BFA Conflict Rules | CF-715–CF-738 | 24 |
| Stress Tests | ST-431–ST-454 | 24 |
| Design Decisions | DD-323–DD-335 | 13 |
| Design Records | DR-240–DR-249 | 10 |

---

## SECTION 2 — FACTORY FAMILY CROSS-REFERENCE

| Family | Name | Factories | Primary Fabric |
|--------|------|-----------|---------------|
| 200 | Template Package Registry | F1339–F1347 | DATABASE FABRIC |
| 201 | Template Sanitizer & DLP Scanner | F1348–F1355 | AI ENGINE + DATABASE FABRIC |
| 202 | Marketplace Listing & Discovery | F1356–F1364 | DATABASE FABRIC |
| 203 | Template Installation & Binding | F1365–F1373 | DATABASE + QUEUE FABRIC |
| 204 | Version Upgrade & Migration | F1374–F1381 | DATABASE + QUEUE FABRIC |
| 205 | RAG Blueprint Packaging | F1382–F1389 | RAG + DATABASE FABRIC |
| 206 | Affiliate & Revenue Share | F1390–F1397 | QUEUE + DATABASE FABRIC |
| 207 | Template Analytics & Quality | F1398–F1404 | DATABASE + AI ENGINE FABRIC |
| 208 | Template Sandbox & Testing | F1405–F1410 | DATABASE + QUEUE + CORE FABRIC |
| 209 | Data Pack Export & Import | F1411–F1415 | DATABASE + AI ENGINE FABRIC |
| 210 | Template Supply Chain Security | F1416–F1418 | DATABASE + CORE FABRIC |

---

## SECTION 3 — TASK TYPE TO FACTORY DEPENDENCY MAP

| Task Type | Purpose | Factory Dependencies |
|-----------|---------|---------------------|
| T516 | Template Publish Gate | F1339, F1348, F1349, F1350, F1351, F1416 |
| T517 | Manifest Validation | F1340, F1341, F1343, F1339 |
| T518 | Artifact Signing | F1416, F1417, F1418, F1342 |
| T519 | Marketplace Listing | F1356, F1357, F1358, F1345, F1346 |
| T520 | Discovery & Search | F1356, F1360, F1361, F1346, F1399 |
| T521 | Dependency Resolution | F1340, F1365, F1366, F1367 |
| T522 | Installation Executor | F1365, F1368, F1369, F1370, F1390 |
| T523 | Connector Rebinding | F1367, F1371, F1372, F1373, F1343 |
| T524 | Upgrade Detection | F1374, F1375, F1365, F1344, F1347 |
| T525 | Diff & Migration | F1376, F1377, F1378, F1379 |
| T526 | BFA Revalidation | F1380, F1381, F1365 |
| T527 | Rollback Gate | F1379, F1378, F1365, F1381 |
| T528 | RAG Blueprint Export | F1382, F1383, F1384, F1385 |
| T529 | RAG Blueprint Validation | F1386, F1387, F1382 |
| T530 | RAG Blueprint Installation | F1388, F1389, F1383, F1367 |
| T531 | Usage Metering | F1390, F1391, F1392 |
| T532 | Revenue Settlement | F1391, F1392, F1393, F1394, F1345 |
| T533 | Analytics & Quality | F1398, F1399, F1400, F1401 |
| T534 | Fraud Detection | F1401, F1402, F1403, F1404 |
| T535 | Sandbox Execution | F1405, F1406, F1407, F1408, F1409, F1410 |

---

## SECTION 4 — SKILL TO TASK TYPE MAPPING

| Skill | Name | Used By Task Types |
|-------|------|-------------------|
| SK-330 | TemplatePackagingSkill | T516, T517, T518 |
| SK-331 | ManifestValidationSkill | T517, T521 |
| SK-332 | MarketplaceDiscoverySkill | T519, T520 |
| SK-333 | DependencyResolutionSkill | T521, T522 |
| SK-334 | InstallModePatternSkill | T522, T525 |
| SK-335 | ConnectorRebindingSkill | T523 |
| SK-336 | VersionMigrationSkill | T525, T526, T527 |
| SK-337 | RagBlueprintSkill | T528, T529, T530 |
| SK-338 | TemplateMeteringSkill | T531, T532 |
| SK-339 | TemplateQualityScoreSkill | T533, T534 |
| SK-340 | FraudDetectionSkill | T534 |
| SK-341 | SandboxExecutionSkill | T535 |
| SK-342 | TemplateSupplyChainSkill | T518 |
| SK-343 | DataPackExportSkill | T516 |
| SK-344 | UpgradePolicyEnforcementSkill | T524, T526 |
| SK-345 | BFARevalidationSkill | T526 |

---

## SECTION 5 — BFA RULE TO TASK TYPE MAPPING

| BFA Rule | Severity | Primary Task Types | Cross-Flow |
|----------|----------|-------------------|------------|
| CF-715 | CRITICAL | T516, T519 | FLOW-16, FLOW-17 |
| CF-716 | HIGH | T519, T520 | FLOW-17 |
| CF-717 | CRITICAL | T522, T525 | FLOW-18 |
| CF-718 | CRITICAL | T517 | All (factory registry) |
| CF-719 | HIGH | T518 | FLOW-19 |
| CF-720 | HIGH | T519 | FLOW-16 |
| CF-721 | MEDIUM | T519, T520 | FLOW-17 |
| CF-722 | HIGH | T520 | FLOW-16 |
| CF-723 | HIGH | T521 | Dynamic (consumer) |
| CF-724 | CRITICAL | T522 | Dynamic (consumer) |
| CF-725 | HIGH | T531, T532 | FLOW-08 |
| CF-726 | CRITICAL | T523 | FLOW-15 |
| CF-727 | HIGH | T524 | FLOW-18 |
| CF-728 | CRITICAL | T525, T526 | Dynamic (consumer) |
| CF-729 | CRITICAL | T526 | Dynamic (consumer) |
| CF-730 | CRITICAL | T527 | Snapshot integrity |
| CF-731 | HIGH | T528, T530 | FLOW-29 |
| CF-732 | HIGH | T530 | Dynamic (consumer) |
| CF-733 | HIGH | T530 | Dynamic (consumer) |
| CF-734 | CRITICAL | T532 | FLOW-08 |
| CF-735 | MEDIUM | T533 | FLOW-13 |
| CF-736 | MEDIUM | T534 | FLOW-17 |
| CF-737 | CRITICAL | T535 | FLOW-18, FLOW-19 |
| CF-738 | HIGH | T535 | FLOW-19 |

---

## SECTION 6 — DESIGN DECISIONS (DD-323–DD-335)

| DD | Decision | Rationale |
|----|----------|-----------|
| DD-323 | Logic/Data Plane Separation | Template marketplace shares LOGIC (flow DAGs, configs), NEVER DATA (documents, embeddings, secrets). This is the foundational isolation principle. |
| DD-324 | Three Install Modes (Snapshot/Linked/Fork) | Different use cases require different ownership models. Snapshot = full ownership. Linked = track publisher updates. Fork = escape linked to snapshot. |
| DD-325 | Immutable Versions | Published versions never modified. New content = new version. Prevents supply chain confusion. |
| DD-326 | Content-Addressable Storage | Artifacts stored by hash, not by path. Enables deduplication and tamper detection. |
| DD-327 | Secret_Ref Indirection | Connector bindings store reference IDs, never actual secrets. Prevents credential leaks in template sharing. |
| DD-328 | Forced Security Patches | Security-critical updates bypass consumer upgrade policies. Platform-level safety takes precedence over tenant preferences. |
| DD-329 | Mandatory BFA Revalidation | Every upgrade triggers BFA revalidation against consumer's full flow set. Cannot skip. Prevents silent conflicts. |
| DD-330 | RAG Blueprint = Structure Only | RAG blueprints share retrieval strategy, never actual data. Consumer populates their own indices. |
| DD-331 | Bounded Metering Dimensions | Max 10 dimensions per metering event. Prevents cardinality explosion in analytics. |
| DD-332 | Human Review for Fraud Action | No auto-suspension based on fraud detection alone. Human review required to prevent false positives. |
| DD-333 | Sandbox with Synthetic TenantId | Sandbox uses synthetic tenantId to prevent any accidental production data access. |
| DD-334 | Revenue Share Cap (50%) | Platform retains minimum 50% on all template revenue. Prevents unsustainable pricing. |
| DD-335 | SLSA-Aligned Supply Chain | Template artifacts follow SLSA framework for provenance. Builds trust in marketplace. |

---

## SECTION 7 — DESIGN RECORDS (DR-240–DR-249)

| DR | Record | Details |
|----|--------|---------|
| DR-240 | Template Package Schema | {packageId, title, description, publisherTenantId, versions: [{semver, manifestHash, artifactHashes, publishedAt}], visibility, license, deprecated} |
| DR-241 | Installation Record Schema | {installId, packageId, version, mode: snapshot|linked|fork, consumerTenantId, publisherTenantId, installedAt, status, bindings} |
| DR-242 | Metering Event Schema | {eventId, eventType: template.*, packageId, publisherTenantId, consumerTenantId, version, timestamp, dimensions: dict[str, Any]} |
| DR-243 | Migration Plan Schema | {migrationId, installId, fromVersion, toVersion, diff: {added, removed, modified}, rollbackData, status, executedAt} |
| DR-244 | RAG Blueprint Schema | {blueprintId, strategyType, chunkingRules, routingConfig, rankingWeights, promptIds: [], metadataSchema, publisherTenantId} |
| DR-245 | Quality Score Schema | {packageId, successRate, avgLatencyP95, rollbackRate, avgRating, compositeScore, computedAt} |
| DR-246 | Trust Incident Schema | {incidentId, packageId, incidentType, evidence: [], severity, status: pending_review|confirmed|dismissed, createdAt} |
| DR-247 | Settlement Record Schema | {settlementId, period, publisherTenantId, totalEvents, revenueAmount, sharePercent, payoutAmount, idempotencyKey, status} |
| DR-248 | Sandbox Environment Schema | {sandboxId, syntheticTenantId, templateId, version, createdAt, expiresAt, status, executionResult} |
| DR-249 | Connector Binding Schema | {bindingId, installId, connectorRef, boundTo: secretRefId, connectorType, validatedAt, consumerTenantId} |

---

## SECTION 8 — TEMPLATE DAG DEFINITIONS

### Template 116: template-publish-v1.json
```
DAG: T516 (sanitize) → T517 (validate manifest) → T518 (sign) → T519 (list)
Entry: Publisher submits package
Exit: Listed on marketplace
Branching: T516 FAIL → reject; T517 FAIL → reject; T518 FAIL → reject
```

### Template 117: template-install-v1.json
```
DAG: T520 (discover) → T521 (resolve deps) → T522 (install) → T523 (bind connectors)
Entry: Consumer selects template
Exit: Template installed and bound
Branching: T521 BLOCK → show blockers; T522 FAIL → rollback; T523 WARN → manual binding
```

### Template 118: template-upgrade-v1.json
```
DAG: T524 (detect) → T525 (migrate) → T526 (BFA revalidate) → T527 (rollback if needed)
Entry: New version published by publisher
Exit: Consumer installation upgraded OR rolled back
Branching: T525 FAIL → auto-rollback; T526 CRITICAL → T527 rollback; T526 OK → complete
```

### Template 119: rag-blueprint-v1.json
```
DAG: T528 (export) → T529 (validate) → T530 (install)
Entry: Publisher exports RAG blueprint
Exit: Consumer's RAG configured
Branching: T529 FAIL → reject blueprint; T530 with merge strategy
```

---

## BACKWARD COMPATIBILITY STATEMENT
All previously defined artifacts unchanged. FLOW-32 is additive only.
$

# ════════════════════════════════════════════════════════════
# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
# Added: 2026-03-03 | Post FLOW-32 state
# ════════════════════════════════════════════════════════════

# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
## UNIFIED SOURCE INDEX — Cross-Reference of All FLOW-33 Artifacts

**FLOW Reference:** FLOW-33  
**Domain:** System Initiation — Platform Bootstrap + Implement-Family Meta-Engine  
**Backward Compatibility:** All F1-F1418, T1-T535, SK-1-SK-345, CF-1-CF-738, ST-1-ST-454, DR-1-DR-249, DD-1-DD-335 UNCHANGED  

---

## ARTIFACT COUNT SUMMARY

| Artifact Type | Prior State | FLOW-33 Adds | New Total |
|---------------|-------------|--------------|-----------|
| Factories | F1-F1418 | F1419-F1428 (+10) | F1428 |
| Families | 1-83 | 211-212 (+2) | 85 |
| Task Types | T1-T535 | T536-T542 (+7) | T542 |
| Templates | 1-49 | 50-55 (+6) | 55 |
| BFA Rules | CF-1-CF-738 | CF-739-CF-750 (+12) | CF-750 |
| Stress Tests | ST-1-ST-454 | ST-455-ST-462 (+8) | ST-462 |
| Skills | SK-1-SK-345 | SK-346-SK-354 (+9) | SK-354 |
| Design Decisions | DD-1-DD-335 | DD-336-DD-341 (+6) | DD-341 |
| Design Records | DR-1-DR-249 | DR-250-DR-254 (+5) | DR-254 |
| DNA Patterns | DNA-1-DNA-9 | (none new) | DNA-9 |
| Engine Primitives | EP-1-EP-5 | (none new) | EP-5 |

---

## FACTORY INDEX — FLOW-33

### Family 211 — Platform Bootstrap Fabric

| Factory ID | Interface | Fabric Resolution | Task Types | Skills |
|------------|-----------|------------------|------------|--------|
| F1419 | IBootstrapService | DATABASE FABRIC (ES) + QUEUE FABRIC (Redis) | T536 | SK-346 |
| F1420 | IPlanBundleImportService | DATABASE FABRIC (ES) + RAG FABRIC (Vector) | T536, T537 | SK-347 |
| F1421 | IImplementationRegistryService | DATABASE FABRIC (PG + ES) | T538, T539, T541 | SK-348 |
| F1422 | IFamilySkillPackService | RAG FABRIC (Hybrid) + DATABASE FABRIC (ES) | T537, T542 | SK-349, SK-353 |
| F1423 | IGraphRAGSeedService | DATABASE FABRIC (Neo4j/GraphAI via F65) + RAG FABRIC (Graph) | T536, T537 | SK-347 |

### Family 212 — Implement-Family Meta-Engine

| Factory ID | Interface | Fabric Resolution | Task Types | Skills |
|------------|-----------|------------------|------------|--------|
| F1424 | IImplementFamilyOrchestrator | FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) + AI ENGINE FABRIC (SK-386 (AiDispatcher)) | T539 | SK-350 |
| F1425 | IMultiArbiterService | AI ENGINE FABRIC (SK-386 (AiDispatcher) — AiDispatcher) | T539, T540 | SK-351 |
| F1426 | IContextPackService | RAG FABRIC (Hybrid — SK-389 (HybridRagStrategy)) | T542 | SK-349 |
| F1427 | IRegressionImpactService | DATABASE FABRIC (ES graph index) + AI ENGINE FABRIC | T541 | SK-352 |
| F1428 | IPromptEvolutionService | AI ENGINE FABRIC + DATABASE FABRIC (ES feedback index) | T540, T542 | SK-351, SK-354 |

---

## TASK TYPE INDEX — FLOW-33

| Task Type | Name | Archetype | Key Factories | Template | AF Config |
|-----------|------|-----------|---------------|----------|-----------|
| T536 | Platform Bootstrap Orchestration | ORCHESTRATION | F1419, F1420, F1421, F1423 | 50 | AF-2, AF-9 |
| T537 | GraphRAG Two-Layer Seeding | DATA_PIPELINE | F1420, F1422, F1423 | 51 | AF-4, AF-9 |
| T538 | Implementation Status Registry | STATE_MACHINE | F1421 | 52 | AF-7, AF-9 |
| T539 | Implement-Family Meta-Loop | AI_GENERATION_LOOP | F1424, F1425, F1421 | 53 | AF-1, AF-5, AF-9 |
| T540 | 5-Arbiter Consensus Gate | AI_CONSENSUS | F1425, F1428 | 54 | AF-5, AF-10, AF-9 |
| T541 | Regression Impact Analysis | CHANGE_DETECTION | F1427, F1421 | 55 | AF-4, AF-9 |
| T542 | ContextPack Assembly | RAG_ORCHESTRATION | F1422, F1426, F1428 | — | AF-3, AF-4 |

---

## SKILL INDEX — FLOW-33

| Skill ID | Name | Category | Primary Factories | Task Types |
|----------|------|----------|------------------|------------|
| SK-346 | Idempotent Bootstrap Protocol | SYSTEM_INIT | F1419 | T536 |
| SK-347 | GraphRAG Two-Layer Init | GRAPH_DATA | F1420, F1423 | T537 |
| SK-348 | Implementation Registry Pattern | DATA_MODEL | F1421 | T538, T539, T541 |
| SK-349 | ContextPack Hybrid RAG | RETRIEVAL | F1422, F1426 | T542 |
| SK-350 | Implement-Family Meta-Loop | GENERATION_ORCHESTRATION | F1424 | T539 |
| SK-351 | 5-Arbiter Prompt Templates | PROMPT_ENGINEERING | F1425, F1428 | T539, T540 |
| SK-352 | Regression Impact Graph | CHANGE_DETECTION | F1427 | T541 |
| SK-353 | Family Skill Pack Structure | KNOWLEDGE_ORGANIZATION | F1422 | T537 |
| SK-354 | Prompt Pack + Feedback Loop | FEEDBACK_SYSTEM | F1428 | T540, T542 |

---

## BFA RULES INDEX — FLOW-33

| Rule ID | Name | Severity | Entities | Key Factories |
|---------|------|----------|----------|---------------|
| CF-739 | Plan Bundle Oracle Validation Before Registry Writes | CRITICAL | PlanBundle, FactoryRegistry | F1420 |
| CF-740 | Outbox Ordering: Phase State Before Event Emission | CRITICAL | BootstrapPhase, BootstrapSentinel | F1419 |
| CF-741 | Schema-Before-Event: Schema Registry Before First Use | HIGH | SchemaRegistry, EventSchema | F194 |
| CF-742 | Atomic Registry Compilation: No Partial Updates on Failure | CRITICAL | FactoryRegistry, TaskTypeRegistry | F1420 |
| CF-743 | GraphRAG Consistency: Layer 2 After Layer 1 | HIGH | GraphCatalog, SkillNodes | F1423 |
| CF-744 | Implementation Idempotency: Family Not Re-Executed If Complete | CRITICAL | ImplementationRegistry, FamilyStatus | F1421, F1424 |
| CF-745 | 5-Arbiter Quorum Before Code Promotion | CRITICAL | ArbiterConsensus, PromotionGate | F1425 |
| CF-746 | Regression Impact Must Precede Promotion | HIGH | RegressionImpact, PromotionRequest | F1427, F1421 |
| CF-747 | ContextPack TTL: No Stale Packs Supplied to Arbiters | HIGH | ContextPack, ArbitersInput | F1426 |
| CF-748 | Backward Compatibility Fence: F1-F1418 Read-Only | CRITICAL | FactoryRegistry (existing) | F1420 |
| CF-749 | Smoke Test Gate: No BootstrapCompleted Without Passing T54 | HIGH | SmokeTestResult, BootstrapSentinel | F1419, F192 |
| CF-750 | Prompt Evolution Feedback Not Applied to In-Flight Generations | MEDIUM | PromptPack, ActiveGeneration | F1428 |

---

## STRESS TEST INDEX — FLOW-33

| Test ID | Name | BFA Rules | Scenario |
|---------|------|-----------|----------|
| ST-455 | Corrupt Plan Bundle Attack | CF-739, CF-742 | Upload bundle with wrong factory count range |
| ST-456 | Bootstrap Sentinel Race | CF-740 | Two bootstrap processes start simultaneously |
| ST-457 | Schema Chicken-And-Egg | CF-741 | Consumer validates schema before it is registered |
| ST-458 | Family Already Implemented Re-Run | CF-744 | Re-trigger implement-family on completed family |
| ST-459 | 3-of-5 Arbiter Deadlock | CF-745 | Two arbiters time out, three disagree |
| ST-460 | Stale ContextPack in Long Session | CF-747 | 24hr session with cached ContextPack |
| ST-461 | Backward Compatibility Overwrite | CF-748 | F1420 compiles new registry overlapping F630 |
| ST-462 | Regression Blast Radius Cascade | CF-746 | 200-family change triggers full regression scan |

---

## DESIGN DECISIONS — FLOW-33

| ID | Decision | Rationale |
|----|----------|-----------|
| DD-336 | Bootstrap uses sentinel document in Elasticsearch | ES is first available store; sentinel checked before any phase runs |
| DD-337 | Plan bundle validated against oracle before registry compilation | Prevents range collision with F1-F1418, T1-T535 |
| DD-338 | GraphRAG seeded in two layers: concept graph first, skill embeddings second | Layer 1 graph topology must exist for Layer 2 nodes to attach |
| DD-339 | 5-arbiter consensus uses AiDispatcher parallel execution | Leverages existing AF-5 multi-model fabric; no new infrastructure |
| DD-340 | ContextPack TTL set to 4 hours; arbiters reject packs older than TTL | Prevents stale context poisoning int-running implement-family sessions |
| DD-341 | Regression impact computed via ES graph index, not full re-analysis | Graph traversal O(affected families) vs O(all families) for large deployments |

---

## DESIGN RECORDS — FLOW-33

| ID | Record | Links |
|----|--------|-------|
| DR-250 | Idempotent Bootstrap State Machine (7-phase) | DD-336, F1419, T536 |
| DR-251 | Plan Bundle Oracle Validation Protocol | DD-337, CF-739, CF-742, F1420 |
| DR-252 | GraphRAG Two-Layer Seeding Sequence | DD-338, CF-743, F1423, T537 |
| DR-253 | 5-Arbiter Consensus + Promotion Gate | DD-339, CF-745, F1425, T540 |
| DR-254 | ContextPack TTL and Stale-Pack Detection | DD-340, CF-747, F1426, T542 |

---

## CROSS-FLOW DEPENDENCY MAP

### FLOW-33 → Reads From (backward compatibility required)
| Source Flow | Artifacts Read | Purpose |
|-------------|----------------|---------|
| FLOW-01 to FLOW-32 | F1-F1418 (read-only) | Populate bootstrap factory registry |
| FLOW-01 to FLOW-32 | T1-T535 (read-only) | Populate bootstrap task type registry |
| FLOW-15 (DevOps) | F466-F508, F483-F492 | Multi-tenant identity, flow control plane |
| FLOW-16/17 | F509-F630 | Marketplace/freelancer factory patterns |

### FLOW-33 → Writes To (new additions only)
| Target | New Artifacts | Guard |
|--------|---------------|-------|
| Factory Registry | F1419-F1428 | CF-739, CF-748 |
| Task Type Registry | T536-T542 | CF-739 |
| ES: bootstrap-sentinel | BootstrapSentinel doc | CF-740 |
| ES: bfa-install-gate | Bundle validation states | CF-739 |
| ES: graph-catalog | GraphRAG nodes/edges | CF-743 |
| ES: implementation-registry | FamilyStatus per tenant | CF-744 |

### FLOW-33 → Triggers (outbound)
| Event | Consumer | Trigger Condition |
|-------|----------|-------------------|
| BootstrapCompleted | All flows (ready signal) | All 7 bootstrap phases pass |
| FamilyImplementationCompleted | Client dashboard | Each family successfully promoted |
| CapabilityGapDetected | Admin notification | GraphRAG gap analysis finds missing skill |
| RegressionViolationDetected | CI gate | CF-746 blast radius exceeds threshold |

---

## FILE MANIFEST

| File | Description | Status |
|------|-------------|--------|
| `33-system initiation ENGINE_ARCHITECTURE.md` | Factory registry: F1419-F1428, Families 211-212 | ✅ COMPLETE |
| `33-system initiation TASK_TYPES_CATALOG.md` | Engine contracts: T536-T542, Templates 120-125 | ✅ COMPLETE |
| `33-system initiation SKILLS_FACTORY_RAG.md` | Skill patterns: SK-346-SK-354 | ✅ COMPLETE |
| `33-system initiation V62_BFA_STRESS_TEST.md` | BFA rules: CF-739-CF-750, Stress tests: ST-455-ST-462 | ✅ COMPLETE |
| `33-system initiation UNIFIED_SOURCE_INDEX.md` | This file — cross-reference of all artifacts | ✅ COMPLETE |
| `33-system initiation SESSION_STATE.md` | Global tracker + next available numbers | ✅ COMPLETE |
| `33-system initiation MASTER_EXECUTION_PLAN.md` | Phased execution plan P0-P5 | ✅ COMPLETE |

---

## NEXT AVAILABLE NUMBERS (Post FLOW-33)

```yaml
FLOW_34_STARTS_AT:
  Factory: F641
  Family: 86
  Task_Type: T254
  Template: 56
  BFA_Rule: CF-307
  Stress_Test: ST-172
  Skill: SK-154
  Design_Decision: DD-136
  Design_Record: DR-104
```

---

# ═══════════════════════════════════════════════════════════════
# FLOW-34: SKILL MULTI-TARGET TRANSLATION — UNIFIED SOURCE INDEX
# Cross-Reference: All Artifacts → Source Documents → Fabric Resolutions
# ═══════════════════════════════════════════════════════════════

# FLOW-34 UNIFIED SOURCE INDEX — Skill Multi-Target Translation
## "Translate to Alternatives"
## Cross-Reference: All Artifacts → Source Documents → Fabric Resolutions

---

## INDEX SUMMARY

| Artifact Type | FLOW-34 Range | Count | Source Document |
|---------------|--------------|-------|----------------|
| Factory Families | 213–222 | 10 | ENGINE_ARCHITECTURE |
| Factories | F1429–F1483 | 55 | ENGINE_ARCHITECTURE |
| Task Types | T543–T564 | 22 | TASK_TYPES_CATALOG |
| Templates | 50–57 | 8 | MASTER_EXECUTION_PLAN |
| Skills | SK-355–SK-378 | 24 | SKILLS_FACTORY_RAG |
| BFA Rules | CF-751–CF-788 | 38 | V62_BFA_STRESS_TEST |
| Stress Tests | ST-463–ST-497 | 35 | V62_BFA_STRESS_TEST |
| Design Decisions | DD-342–DD-357 | 16 | SESSION_STATE |
| Design Records | DR-255–DR-266 | 12 | SESSION_STATE |

---

## FACTORY INDEX (F1429–F1483)

### Family 213 — Canonical Skill Store & Spec Management
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1429 | ICanonicalSkillSpecService | DATABASE FABRIC (ES) | T543, T544, T564 |
| F1430 | ISkillFamilyRegistryService | DATABASE FABRIC (ES) | T543, T544 |
| F1431 | ISkillSpecVersioningService | DATABASE FABRIC (ES) | T543, T559 |
| F1432 | ISkillContractValidatorService | AI ENGINE FABRIC | T543, T545 |
| F1433 | ISkillMetadataIndexService | DATABASE FABRIC (ES) | T543, T561 |
| F1434 | ISkillGoldenTestStoreService | DATABASE FABRIC (ES) | T545, T559 |
| F1435 | ISkillLineageTrackerService | DATABASE FABRIC (ES) | T543 |

### Family 214 — Variant Registry & Selection Engine
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1436 | IVariantRegistryService | DATABASE FABRIC (ES) | T544, T560 |
| F1437 | IVariantSelectorService | DATABASE FABRIC (ES) + AI ENGINE | T563 |
| F1438 | IVariantMaturityService | DATABASE FABRIC (ES) | T560 |
| F1439 | IVariantDependencyService | DATABASE FABRIC (ES) | T561, T562 |
| F1440 | IVariantConformanceStatusService | DATABASE FABRIC (ES) | T559, T560 |
| F1441 | IVariantEventPublisherService | QUEUE FABRIC (Redis Streams) | T560, T564 |
| F1442 | IVariantFallbackService | DATABASE FABRIC (ES) | T563 |

### Family 215 — Target Adapter Code Generation
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1443 | IAdapterGenerationOrchestratorService | AI ENGINE FABRIC | T564 |
| F1444 | IServerAdapterGeneratorService | AI ENGINE FABRIC | T546–T550 |
| F1445 | IClientAdapterGeneratorService | AI ENGINE FABRIC | T552–T554 |
| F1446 | IAdapterPromptLibraryService | RAG FABRIC | T546–T554 |
| F1447 | IAdapterDNAComplianceService | CORE FABRIC | T551, T555 |
| F1448 | IAdapterBundleStoreService | DATABASE FABRIC (ES) | T546–T554 |
| F1449 | IAdapterRetryOrchestratorService | QUEUE FABRIC (Redis Streams) | T564 |

### Family 216 — WordPress Plugin Packaging
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1450 | IWordPressPluginScaffoldService | AI ENGINE FABRIC | T556 |
| F1451 | IWordPressBlockGeneratorService | AI ENGINE FABRIC | T556 |
| F1452 | IWordPressAdminConfigService | AI ENGINE FABRIC | T556 |
| F1453 | IWordPressSecurityGateService | CORE FABRIC | T558 |
| F1454 | IWordPressPluginPackagerService | DATABASE FABRIC (ES) | T556 |

### Family 217 — WordPress Theme Packaging
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1455 | IWordPressThemeScaffoldService | AI ENGINE FABRIC | T557 |
| F1456 | IWordPressThemeJsonService | AI ENGINE FABRIC | T557 |
| F1457 | IWordPressTemplatePartService | AI ENGINE FABRIC | T557 |
| F1458 | IWordPressThemeSecurityGateService | CORE FABRIC | T558 |
| F1459 | IWordPressThemePackagerService | DATABASE FABRIC (ES) | T557 |

### Family 218 — Server Language SDK Scaffolding
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1460 | INodeSdkScaffoldService | AI ENGINE FABRIC | T546 |
| F1461 | IGoSdkScaffoldService | AI ENGINE FABRIC | T547 |
| F1462 | IJavaSdkScaffoldService | AI ENGINE FABRIC | T548 |
| F1463 | IRustSdkScaffoldService | AI ENGINE FABRIC | T549 |
| F1464 | IPhpSdkScaffoldService | AI ENGINE FABRIC | T550 |
| F1465 | ISdkTraceContextService | CORE FABRIC | T546–T550 |

### Family 219 — Cross-Variant Conformance Testing
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1466 | IConformanceRunnerService | CORE FABRIC | T559 |
| F1467 | IGoldenTestReplayService | CORE FABRIC | T545, T559 |
| F1468 | ICrossLanguageJudgeService | AI ENGINE FABRIC | T551 |
| F1469 | IConformanceReportService | DATABASE FABRIC (ES) | T559 |
| F1470 | IConformanceEventPublisherService | QUEUE FABRIC | T559 |

### Family 220 — Graph RAG Skill Index
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1471 | IGraphSkillIndexService | RAG FABRIC (Graph) | T561 |
| F1472 | IGraphEdgeLinkingService | RAG FABRIC (Graph) | T562 |
| F1473 | IGraphVariantSearchService | RAG FABRIC (Graph) | T563 |
| F1474 | IGraphCoverageReportService | RAG FABRIC (Graph) | T563 |
| F1475 | IGraphCommunityService | RAG FABRIC (Graph) | T562 |

### Family 221 — Variant Promotion Pipeline
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1476 | IPromotionGateService | DATABASE FABRIC (ES) | T560 |
| F1477 | IPromotionAuditService | DATABASE FABRIC (ES) | T560 |
| F1478 | IHumanApprovalGateService | QUEUE FABRIC | T560 |
| F1479 | IPromotionEventService | QUEUE FABRIC | T560 |

### Family 222 — Multi-Target Orchestration Control
| Factory | Interface | Fabric | Task Type Users |
|---------|-----------|--------|-----------------|
| F1480 | IMultiTargetTranslationOrchestratorService | FLOW ENGINE FABRIC | T564 |
| F1481 | ITranslationTraceService | DATABASE FABRIC (ES) | T564 |
| F1482 | ITranslationFeedbackInjectorService | AI ENGINE FABRIC (AF-11) | T564 |
| F1483 | ITranslationConfigResolverService | DATABASE FABRIC (ES) | T564 |

---

## TASK TYPE INDEX (T543–T564)

| Task Type | Name | Phase | Factories | Templates |
|-----------|------|-------|-----------|-----------|
| T543 | Canonical Skill Extraction Gate | P0 | F1429–F1435 | — |
| T544 | Skill Variant Descriptor Attach | P0 | F1436, F1439 | — |
| T545 | Canonical Spec Conformance Seed | P0 | F1434, F1467 | — |
| T546 | Server Variant Generation — Node | P1 | F1460, F1444, F1446, F1465 | Template 127 |
| T547 | Server Variant Generation — Go | P1 | F1461, F1444, F1446, F1465 | Template 127 |
| T548 | Server Variant Generation — Java | P1 | F1462, F1444, F1446, F1465 | Template 127 |
| T549 | Server Variant Generation — Rust | P1 | F1463, F1444, F1446, F1465 | Template 127 |
| T550 | Server Variant Generation — PHP | P1 | F1464, F1444, F1446, F1465 | Template 127 |
| T551 | Server Variant Cross-Language Judge | P1 | F1468, F1447 | — |
| T552 | Client Variant Generation — ReactJS | P2 | F1445, F1446, F1447 | Template 128 |
| T553 | Client Variant Generation — Vue | P2 | F1445, F1446, F1447 | Template 128 |
| T554 | Client Variant Generation — Angular | P2 | F1445, F1446, F1447 | Template 128 |
| T555 | Client Variant Fabric Compliance Gate | P2 | F1447, F1448 | — |
| T556 | WordPress Plugin Packaging Gate | P3 | F1450–F1454 | Template 129 |
| T557 | WordPress Theme Packaging Gate | P3 | F1455–F1459 | Template 130 |
| T558 | WordPress Security & Auth Gate | P3 | F1453, F1458 | — |
| T559 | Cross-Variant Conformance Runner | P4 | F1466–F1470 | Template 131 |
| T560 | Variant Promotion Ladder Gate | P4 | F1476–F1479 | — |
| T561 | Graph RAG Node Ingestion | P4B | F1471, F1472, F1433 | Template 132 |
| T562 | Graph RAG Edge Linking | P4B | F1472, F1475 | Template 132 |
| T563 | Graph RAG Variant Selection Query | P4B | F1473, F1437 | Template 133 |
| T564 | Multi-Target Translation Orchestrator | All | F1480–F1483 | Template 126 |

---

## SKILL INDEX (SK-355–SK-378)

| Skill | Name | Category | Used By Task Types | Source Prompt |
|-------|------|----------|--------------------|---------------|
| SK-355 | Canonical Skill Spec Format | Spec | T543, T544, T545 | AF-4 |
| SK-356 | Variant Descriptor Block Schema | Spec | T544 | AF-4 |
| SK-357 | MicroserviceBase-Node SDK Pattern | Server | T546 | AF-4 |
| SK-358 | MicroserviceBase-Go SDK Pattern | Server | T547 | AF-4 |
| SK-359 | MicroserviceBase-Java SDK Pattern | Server | T548 | AF-4 |
| SK-360 | MicroserviceBase-Rust SDK Pattern | Server | T549 | AF-4 |
| SK-361 | MicroserviceBase-PHP SDK Pattern | Server | T550 | AF-4 |
| SK-362 | ReactJS Client Variant Adapter | Client | T552 | AF-4 |
| SK-363 | Vue Client Variant Adapter | Client | T553 | AF-4 |
| SK-364 | Angular Client Variant Adapter | Client | T554 | AF-4 |
| SK-365 | WordPress Plugin Adapter Pattern | WordPress | T556 | AF-4 |
| SK-366 | WordPress Theme Adapter Pattern | WordPress | T557 | AF-4 |
| SK-367 | WordPress REST Integration Pattern | WordPress | T556, T558 | AF-4 |
| SK-368 | CloudEvents Envelope Pattern | Events | T543, T546–T554 | AF-3 |
| SK-369 | OpenAPI Canonical Contract Pattern | Contracts | T543 | AF-3 |
| SK-370 | JSON Schema Payload Validator | Contracts | T543, T545 | AF-4 |
| SK-371 | Cross-Variant Golden Test Suite | Testing | T545, T559 | AF-4 |
| SK-372 | Graph RAG Ingestion Pattern | GraphRAG | T561 | AF-4 |
| SK-373 | Graph RAG Variant Selection | GraphRAG | T563 | AF-4 |
| SK-374 | Variant Packaging Manifest | Packaging | T560 | AF-4 |
| SK-375 | No-Secrets Gate Pattern | Security | T555, T558, T560 | AF-8 |
| SK-376 | Tenant Scope Propagation — Multi-Language | Multi-lang | T546–T550 | AF-7 |
| SK-377 | Idempotency Key Stability Pattern | Quality | T546–T554 | AF-9 |
| SK-378 | Canonical Test Replay Runner | Testing | T559 | AF-4 |

---

## BFA RULES INDEX (CF-751–CF-788)

### P0 — Canonical Foundation Rules
| Rule | Description | Phase | Trigger |
|------|-------------|-------|---------|
| CF-751 | Source lineage required (canonical traces to source skill) | P0 | T543 |
| CF-752 | No duplicate canonical families (one canonical per skill ID) | P0 | T543 |
| CF-753 | API route isolation between canonical skills | P0 | T543 |
| CF-754 | OpenAPI + CloudEvents + JSON Schema all required before variant generation | P0 | T544 |
| CF-755 | Canonical spec version frozen before variant generation starts | P0 | T544 |

### P1 — Server Variant Rules
| Rule | Description | Phase | Trigger |
|------|-------------|-------|---------|
| CF-756 | Server variant MUST implement language-native result envelope | P1 | T546–T550 |
| CF-757 | No provider imports in server adapters | P1 | T546–T550 |
| CF-758 | tenantId from auth context only (never request body) | P1 | T546–T550 |
| CF-759 | idempotencyKey stable across retries | P1 | T546–T550 |
| CF-760 | Golden test suite must pass before GENERATED→INJECTED promotion | P1 | T551 |
| CF-761 | W3C TraceContext propagation required in all variants | P1 | T546–T550 |
| CF-762 | Go variant must use context.Context for cancellation propagation | P1 | T547 |
| CF-763 | Rust variant must use Result<T,E> mapping to DataProcessResult semantics | P1 | T549 |
| CF-764 | PHP variant must not use global state; DI required | P1 | T550 |
| CF-765 | Java variant must use immutable value objects for MACHINE config | P1 | T548 |
| CF-766 | 100% conformance matrix before promotion to MINIMAL | P1 | T551 |

### P2 — Client Variant Rules
| Rule | Description | Phase | Trigger |
|------|-------------|-------|---------|
| CF-767 | No secrets in any client variant bundle | P2 | T552–T554, T555 |
| CF-768 | No hardcoded backend URLs in client variants | P2 | T552–T554 |
| CF-769 | Client variant MUST use same CloudEvents type strings as canonical spec | P2 | T552–T554 |
| CF-770 | idempotencyKey must not regenerate on re-render | P2 | T552–T554 |
| CF-771 | tenantId from auth token only | P2 | T552–T554 |
| CF-772 | Error states must map to canonical DataProcessResult failure structure | P2 | T552–T554 |
| CF-773 | Client variant MUST NOT implement business logic | P2 | T555 |
| CF-774 | All API calls use fabric-compatible abstraction layer | P2 | T555 |

### P3 — WordPress Rules
| Rule | Description | Phase | Trigger |
|------|-------------|-------|---------|
| CF-775 | permission_callback REQUIRED on every register_rest_route — BUILD FAILURE | P3 | T558 |
| CF-776 | WordPress plugin MUST NOT contain business logic | P3 | T556 |
| CF-777 | WordPress theme MUST NOT contain REST endpoints or business logic | P3 | T557 |
| CF-778 | No secrets in wp_options | P3 | T558 |
| CF-779 | Block editor assets built via @wordpress/scripts only | P3 | T556 |
| CF-780 | nonce verification required on all AJAX handlers | P3 | T558 |
| CF-781 | Application Passwords for XIIGen API calls (not hardcoded tokens) | P3 | T558 |
| CF-782 | Theme template parts must not nest recursively | P3 | T557 |

### P4 — Conformance, Promotion & Graph RAG Rules
| Rule | Description | Phase | Trigger |
|------|-------------|-------|---------|
| CF-783 | Conformance runner MUST use golden test vectors from F1434 only | P4 | T559 |
| CF-784 | Graph RAG ingestion MUST NOT run until all variants reach INJECTED | P4B | T561 |
| CF-785 | Promotion to CORE requires human approval gate | P4 | T560 |
| CF-786 | Graph RAG ALTERNATIVE_OF edges must be bidirectional | P4B | T562 |
| CF-787 | Variant packaging manifest required before distribution | P4 | T560 |
| CF-788 | T564 orchestrator trace ID must persist across all sub-task executions | All | T564 |

---

## STRESS TEST INDEX (ST-463–ST-497)

| Stress Test | Scenario | BFA Rules Tested | Phase |
|-------------|----------|-----------------|-------|
| ST-463 | Duplicate canonical family injection attempt | CF-752 | P0 |
| ST-464 | Variant generation before canonical spec frozen | CF-755 | P0 |
| ST-465 | Missing CloudEvents definition in canonical spec | CF-754 | P0 |
| ST-466 | Missing OpenAPI contract before variant generation | CF-754 | P0 |
| ST-467 | Node variant with direct pg import | CF-757 | P1 |
| ST-468 | Go variant without context.Context cancellation | CF-762 | P1 |
| ST-469 | Rust variant without Result<T,E> envelope | CF-763 | P1 |
| ST-470 | PHP variant with global state ($GLOBALS abuse) | CF-764 | P1 |
| ST-471 | Java variant with mutable config POJO | CF-765 | P1 |
| ST-472 | tenantId from request body (server variant) | CF-758 | P1 |
| ST-473 | idempotencyKey regenerated per request attempt | CF-759 | P1 |
| ST-474 | Missing W3C TraceContext propagation in Go variant | CF-761 | P1 |
| ST-475 | Golden test suite skipped — direct promotion attempt | CF-760 | P1 |
| ST-476 | Conformance matrix < 100% — MINIMAL promotion attempt | CF-766 | P1 |
| ST-477 | Secret in ReactJS client bundle (API key in source) | CF-767 | P2 |
| ST-478 | Hardcoded backend URL in Vue component | CF-768 | P2 |
| ST-479 | CloudEvents type str mismatch between client and canonical | CF-769 | P2 |
| ST-480 | idempotencyKey reset on component re-render | CF-770 | P2 |
| ST-481 | tenantId read from URL param in Angular component | CF-771 | P2 |
| ST-482 | Business logic (validation rules) in ReactJS adapter | CF-773 | P2 |
| ST-483 | Direct axios call without abstraction layer in Vue | CF-774 | P2 |
| ST-484 | WordPress REST route without permission_callback | CF-775 | P3 |
| ST-485 | Secret in wp_options (raw API key stored) | CF-778 | P3 |
| ST-486 | AJAX handler without nonce verification | CF-780 | P3 |
| ST-487 | Hardcoded token instead of Application Passwords | CF-781 | P3 |
| ST-488 | Theme template with REST endpoint registration | CF-777 | P3 |
| ST-489 | Theme template part recursive nesting | CF-782 | P3 |
| ST-490 | WordPress plugin with order processing logic | CF-776 | P3 |
| ST-491 | Non-wp-scripts build pipeline for block assets | CF-779 | P3 |
| ST-492 | Graph RAG ingestion before variants reach INJECTED | CF-784 | P4B |
| ST-493 | ALTERNATIVE_OF edge created without bidirectional counterpart | CF-786 | P4B |
| ST-494 | CORE promotion without human approval gate | CF-785 | P4 |
| ST-495 | Conformance runner using ad-hoc tests (not from F1434) | CF-783 | P4 |
| ST-496 | Distribution without variant packaging manifest | CF-787 | P4 |
| ST-497 | T564 orchestrator loses trace ID on restart | CF-788 | All |

---

## TEMPLATE INDEX (50–57)

| Template | Name | Used By | Source |
|----------|------|---------|--------|
| Template 126 | Multi-Target Translation DAG | T564 | MASTER_EXECUTION_PLAN |
| Template 127 | Server Variant Generation | T546–T550 | MASTER_EXECUTION_PLAN |
| Template 128 | Client Variant Generation | T552–T554 | MASTER_EXECUTION_PLAN |
| Template 129 | WordPress Plugin Packaging | T556 | MASTER_EXECUTION_PLAN |
| Template 130 | WordPress Theme Packaging | T557 | MASTER_EXECUTION_PLAN |
| Template 131 | Cross-Variant Conformance Runner | T559 | MASTER_EXECUTION_PLAN |
| Template 132 | Graph RAG Ingestion Pipeline | T561–T562 | MASTER_EXECUTION_PLAN |
| Template 133 | Variant Selection Query | T563 | MASTER_EXECUTION_PLAN |

---

## FABRIC RESOLUTION SUMMARY

| Fabric | FLOW-34 Factories Resolved Through It |
|--------|--------------------------------------|
| DATABASE FABRIC (ES/IDatabaseService) | F1429–F1435, F1436–F1440, F1442, F1448, F1454, F1459, F1469, F1477, F1481, F1483 |
| QUEUE FABRIC (Redis/IQueueService) | F1441, F1449, F1470, F1479 |
| AI ENGINE FABRIC (IAiProvider/AiDispatcher) | F1432, F1437, F1443–F1445, F1450–F1452, F1455–F1457, F1460–F1464, F1468, F1482 |
| RAG FABRIC (IRagService) | F1446, F1471–F1475 |
| CORE FABRIC (MicroserviceBase) | F1447, F1453, F1458, F1466–F1467 |
| FLOW ENGINE FABRIC (IFlowOrchestrator) | F1480 |

---

## DESIGN DECISIONS INDEX (DD-342–DD-357)

| ID | Decision | Source Artifact |
|----|----------|----------------|
| DD-342 | Canonical Skill Spec is single source of truth; variants are adapters not reimplementations | SESSION_STATE |
| DD-343 | CLIENT VARIANTS block mirrors existing LANGUAGE VARIANTS format | SESSION_STATE |
| DD-344 | WordPress plugin = behaviors+admin+blocks; WordPress theme = styling+templates. Separate targets. | SESSION_STATE |
| DD-345 | MicroserviceBase per language = SDK enforcing 5 invariants (envelope, dict I/O, tenant, dynamic routing, trace) | SESSION_STATE |
| DD-346 | Graph RAG is Phase B (P4); regular alternatives library (P0–P3) is system of record | SESSION_STATE |
| DD-347 | OpenAPI 3.1 + JSON Schema + CloudEvents as canonical contract formats | SESSION_STATE |
| DD-348 | WordPress variants must NOT contain business logic | SESSION_STATE |
| DD-349 | No secrets in any client bundle or WP options (MACHINE rule, always enforced) | SESSION_STATE |
| DD-350 | idempotencyKey must be stable across retries in ALL client variants | SESSION_STATE |
| DD-351 | Graph RAG uses local search for per-skill queries, global search for coverage reports | SESSION_STATE |
| DD-352 | WordPress plugin uses @wordpress/scripts (wp-scripts) build pipeline exclusively | MASTER_EXECUTION_PLAN |
| DD-353 | WordPress REST endpoints require Application Passwords; never hardcoded tokens | MASTER_EXECUTION_PLAN |
| DD-354 | Graph RAG ALTERNATIVE_OF edge is bidirectional within same canonical family only | MASTER_EXECUTION_PLAN |
| DD-355 | W3C TraceContext (OpenTelemetry) is the cross-language tracing invariant | SKILLS_FACTORY_RAG |
| DD-356 | Go variant uses context.Context throughout (cancellation propagation standard) | SKILLS_FACTORY_RAG |
| DD-357 | Rust variant uses Result<T,E> as natural DataProcessResult equivalent | SKILLS_FACTORY_RAG |

---

## DESIGN RECORDS INDEX (DR-255–DR-266)

| ID | Record | Source |
|----|--------|--------|
| DR-255 | Chosen: OpenAPI 3.1 with additionalProperties:true as canonical API contract format (rejected: typed DTOs) | ENGINE_ARCHITECTURE |
| DR-256 | Chosen: CloudEvents 1.0 spec for canonical event envelope (rejected: custom event format) | ENGINE_ARCHITECTURE |
| DR-257 | Chosen: JSON Schema 2020-12 for payload validation (complements OpenAPI) | ENGINE_ARCHITECTURE |
| DR-258 | Chosen: W3C TraceContext / OpenTelemetry for multi-language trace propagation | SKILLS_FACTORY_RAG |
| DR-259 | Chosen: @wordpress/scripts (wp-scripts) build pipeline for WP block assets (rejected: custom webpack) | MASTER_EXECUTION_PLAN |
| DR-260 | Chosen: Application Passwords for WP→XIIGen auth (rejected: stored API keys in wp_options) | MASTER_EXECUTION_PLAN |
| DR-261 | Chosen: permission_callback = BUILD FAILURE if missing (rejected: warning only) | V62_BFA_STRESS_TEST |
| DR-262 | Chosen: Graph RAG after P3 (regular library first), not alongside (rejected: parallel Graph RAG) | SESSION_STATE |
| DR-263 | Chosen: local Graph search for per-skill, global for coverage (from research: local/global split) | SKILLS_FACTORY_RAG |
| DR-264 | Chosen: ALTERNATIVE_OF bidirectional edges for symmetric discovery (rejected: directional only) | MASTER_EXECUTION_PLAN |
| DR-265 | Chosen: T564 orchestrator resumable via trace ID (F1481) (rejected: stateless re-run) | TASK_TYPES_CATALOG |
| DR-266 | Chosen: parallel P1 (server) + P2 (client) generation (sequential P0 first, P3 WordPress conditional) | MASTER_EXECUTION_PLAN |

---

## CROSS-FLOW COMPATIBILITY TABLE

FLOW-34 artifacts must not conflict with existing flows. Verification:

| Existing Flow | FLOW-34 Interaction | Status |
|--------------|---------------------|--------|
| FLOW-01 through FLOW-17 | No factory ID overlap (F1429+ vs F1–F630) | ✅ SAFE |
| FLOW-15 (DevOps, F466–F508) | FLOW-34 uses F1429+, no overlap | ✅ SAFE |
| T1–T246 (existing task types) | FLOW-34 starts at T543 | ✅ SAFE |
| CF-1–CF-294 (existing BFA rules) | FLOW-34 starts at CF-751 | ✅ SAFE |
| SK-1–SK-144 (existing skills) | FLOW-34 starts at SK-355 | ✅ SAFE |
| Existing Python + React Native skills | Become dotnet/react_native variants; unchanged behavior | ✅ SAFE |
| T363 (UI Code Export Gate) | T552–T554 extend/reuse T363 pipeline; don't duplicate | ✅ SAFE |
| F1439 (existing IFlowDesignerService) | Different ID range; F1439 here is IVariantDependencyService | ⚠️ NOTE: F1439 in FLOW-34 is IVariantDependencyService — does not conflict with pre-F630 F1439 as FLOW-34 starts at F1429 |

---

## BACKWARD COMPATIBILITY CONFIRMATION

| Artifact | Before FLOW-34 | FLOW-34 Adds | Conflict |
|----------|---------------|--------------|---------|
| Factories | F1–F630 | F1429–F1483 | None — sequential |
| Task Types | T1–T246 | T543–T564 | None — sequential |
| BFA Rules | CF-1–CF-294 | CF-751–CF-788 | None — sequential |
| Stress Tests | ST-1–ST-163 | ST-463–ST-497 | None — sequential |
| Skills | SK-1–SK-144 | SK-355–SK-378 | None — sequential |
| Templates | 1–49 | 50–57 | None — sequential |
| DNA Patterns | DNA-1–DNA-9 | No new patterns | None |
| Engine Primitives | EP-1–EP-5 | No new primitives | None |

---

## NEXT FLOW STARTING NUMBERS

```
FLOW-35 (or next extension) starts at:
  Factory:     F686   (Family 94)
  Task Type:   T269
  BFA Rule:    CF-333
  Stress Test: ST-199
  Skill:       SK-169
  Template:    58
  DD:          DD-146
  DR:          DR-111
```


---

# ═══════════════════════════════════════════════════════
# FLOW-35: SECRETS FABRIC + CONFIGBUILDER + GROK PROVIDER — UNIFIED SOURCE INDEX
# Added: 2026-03-05
# ═══════════════════════════════════════════════════════

## SECTION 1 — DESIGN DECISIONS (DD-358–DD-359)

| DD | Decision | Rationale | Type |
|----|----------|-----------|------|
| DD-358 | Native `xai_sdk` over OpenAI-compatible wrapper for Grok | Fabric purity — no cross-provider SDK dependency. OpenAI error types would leak. xAI-specific features (streaming, telemetry) inaccessible via wrapper. | MACHINE |
| DD-359 | Migrate from deprecated `google-generativeai` to `google-genai` SDK | `google-generativeai` EOL'd November 30, 2025. Package repo renamed to `deprecated-generative-ai-python`. No security patches. Must use `google-genai` (GA since May 2025). | MACHINE (bug fix) |

## SECTION 2 — DESIGN RECORDS (DR-267–DR-268)

| DR | Record | Key Architecture Choice |
|----|--------|------------------------|
| DR-267 | Secrets Fabric Design Rationale | 7th fabric follows identical pattern: ABC → providers → registry → resolver → factory. Three providers cover production (AWS SM), dev (env vars), and test (in-memory). Tenant-scoped paths mandatory. |
| DR-268 | ConfigBuilder TTL Cache Strategy | Cache keyed by (scope_id, reference_string). TTL-based eviction only — no manual invalidation. asyncio.Lock per key for thread safety. Partial resolution reports which refs failed. |

## SECTION 3 — FACTORY CROSS-REFERENCE

| Factory | Interface | Family | Fabric | Phase |
|---------|-----------|--------|--------|-------|
| F1484 | ISecretsService | 223 | SECRETS FABRIC | P1 |
| F1485 | AWSSecretsManagerProvider | 223 | SECRETS FABRIC → AWS SM | P1 |
| F1486 | EnvVarSecretsProvider | 223 | SECRETS FABRIC → os.environ | P1 |
| F1487 | ConfigBuilder | 224 | CORE FABRIC + SECRETS FABRIC | P2 |
| F1488 | GrokProvider | 224 | AI ENGINE FABRIC → xai_sdk | P3 |
| F1489 | BootstrapSequence | 224 | CORE FABRIC | P4 |
| F1490 | HealthAggregator | 224 | CORE FABRIC | P4 |

## SECTION 4 — TASK TYPE CROSS-REFERENCE

| Task Type | Name | Archetype | Factories | Template |
|-----------|------|-----------|-----------|----------|
| T565 | Secret Resolution Gate | INFRASTRUCTURE | F1484, F1487 | 134 |
| T566 | Provider Health Cascade | INFRASTRUCTURE | F1489, F1490, F1484, F1488 | 134 |

## SECTION 5 — SKILL CROSS-REFERENCE

| Skill | Name | Task Types | Factories |
|-------|------|-----------|-----------|
| SK-402 | Secrets Fabric Patterns | T565 | F1484, F1485, F1486 |
| SK-403 | ConfigBuilder Resolution Patterns | T565, T566 | F1487 |
| SK-404 | Native xAI SDK Integration Patterns | T566 | F1488 |

## SECTION 6 — BFA CROSS-REFERENCE

| Rule | Name | Severity | Factories | Task Types |
|------|------|----------|-----------|-----------|
| CF-789 | Secret Path Collision Across Tenants | CRITICAL | F1484, F1485 | T565 |
| CF-790 | Config Resolution Failure Cascade | HIGH | F1487, F1489 | T565, T566 |

| Stress Test | Name | Rule | Factories |
|-------------|------|------|-----------|
| ST-498 | Secret Resolution Under Concurrent Load | CF-789 | F1484, F1485, F1487 |
| ST-499 | Bootstrap With Partial Secret Failure | CF-790 | F1489, F1490, F1484, F1487 |

## SECTION 7 — CROSS-FLOW IMPACT

| Existing Flow | FLOW-35 Impact | Integration Point |
|---------------|---------------|-------------------|
| FLOW-01–FLOW-34 | No impact — backward compatible | Existing flows don't use $secret: refs yet |
| FLOW-33 (Bootstrap) | ENHANCED — bootstrap now uses 7-phase sequence with secrets | F1489 extends FLOW-33 bootstrap concept |
| FLOW-26 (Self-Dev) | COMPATIBLE — generated code can use ConfigBuilder | New factory interfaces available for gap detection |
| FLOW-30 (PromptOps) | COMPATIBLE — prompt templates can use $secret: for AI keys | ConfigBuilder resolves before PromptOps init |

## SECTION 8 — SDK AUDIT (March 2026)

| Provider | Old SDK | New SDK | Status | Phase |
|----------|---------|---------|--------|-------|
| Anthropic | `anthropic` | `anthropic` | ✅ No change needed | — |
| OpenAI | `openai` | `openai` | ✅ No change needed | — |
| Gemini | `google-generativeai` (EOL) | `google-genai` | ✅ Fixed in P0 (DD-359) | P0 |
| Grok/xAI | N/A (new) | `xai-sdk` v1.7.0 | ✅ Native SDK (DD-358) | P3 |
