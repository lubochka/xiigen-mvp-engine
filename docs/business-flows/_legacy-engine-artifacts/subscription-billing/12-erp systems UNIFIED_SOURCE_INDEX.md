# XIIGen — Unified Source Document Index (RAG)
## Consolidated from: SOURCE_INDEX.md + SKILLS_FACTORY_RAG.md + FLOW-01 Extension
## Purpose: Quick lookup — concept → source file → section
## Date: 2026-02-25 | Post FLOW-03 Integration

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
| AF-4 RAG (Task Context) | Reusable patterns | basic_prompt.txt LAYER 3 | Skill 04, Skill 05, FLOW-04 pipeline |
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
| 7 DNA Patterns | basic_prompt.txt + ENGINE_ARCHITECTURE | LAYER 4 + DNA-7 | ParseDocument, BuildQueryFilters, DataProcessResult, MicroserviceBase, Scope Isolation, DynamicController, W3C Trace |
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
6. ❌ Create typed models (use Dictionary<string,object>)
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
| Flow orchestration | IFlowOrchestrator (Skill 09) | ✅ REUSE fabric |
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
| 2 | Create class RankedRecipient | Dictionary<string,object> via ParseDocument |
| 3 | Call matching service over HTTP | IQueueService → Redis Streams events |
| 4 | Skip diversity controls | Always apply via F211.ApplyDiversityControls |
| 5 | Fire PostDistributionCompleted before FeedsReordered | Both events required (IR-1 T66) |
| 6 | Store plain userId in analytics | Hash userId before writing to F212 |

## FLOW-04 Reuse Analysis

| FLOW-04 Need | Existing Asset | Action |
|-------------|---------------|--------|
| Event publishing (10 events) | IQueueService → Redis Streams (Skill 04) | ✅ REUSE (Fabric Layer 0) |
| Outbox pattern | Queue Fabric → OutboxWriteAsync (FCE +3) | ✅ REUSE |
| Business profile read | F182 IBusinessProfileService (FLOW-02) | ✅ REUSE (read-only) |
| Feed READ path | F188 IFeedPersonalizationService (FLOW-02) | ✅ REUSE (read-only) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| ML inference | IAiProvider → AiDispatcher (Skill 06/07) | ✅ REUSE (Fabric Layer 0) |
| Flow orchestration | IFlowOrchestrator (Skill 09) | ✅ REUSE (Fabric Layer 0) |
| Document storage | IDatabaseService (Skill 05) | ✅ REUSE (Fabric Layer 0) |
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
| Using typed `MarketplaceItem` model | Violates DNA-1 (ParseDocument) | Dictionary<string,object> via ParseDocument |
| Importing `pg` or `neo4j-driver` in service code | Violates fabric-first | Resolve through DATABASE FABRIC (Skill 05) |
| Shared ES index between marketplace and gamification | CF-44 violation | Separate indices: marketplace-* vs gamification-* |
| Cooperator matching synchronous in API path | 20s latency; blocks seller | Async via event; status endpoint for progress |
| Client-side discount calculation | Security: client manipulation | Server-side only via F226.ApplyPricingRulesAsync |
| Cron for listing expiry | Not resume-able; inconsistent | Durable timer in FLOW ENGINE FABRIC (Skill 09) |
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
| Using Thread.Sleep or non-durable timeout for fork deadline | Pod restart loses timer; branches hang indefinitely | EP-2 Durable Timer via FLOW ENGINE FABRIC (Skill 09) |
| Making weight formula coefficients configurable (FREEDOM) | Coefficient changes affect ALL users unpredictably | Coefficients are MACHINE; ML adjustment (±0.2) handles personalization |
| Sequential execution of 4 analyzer branches | 4× latency amplification; violates parallel requirement | Fork all 4 branches simultaneously; allSettled collects |
| Using cron for 6h rebalancer | Not resume-able; inconsistent; won't survive pod restart | EP-2 Durable Timer registered through Flow Engine Fabric |
| Revealing block status to blocked user | Privacy violation; enables block enumeration attack | Generic DataProcessResult(IsSuccess=false, "Request could not be sent") |
| Injecting private posts into other user's feed | Privacy violation; visibility rules broken | Check post visibility BEFORE injection; skip private posts |
| Reusing F173 for bidirectional feed injection | Single Responsibility violation; F173 is unidirectional | New F242 with bidirectional + zone + rollback capabilities |
| Applying typed FriendRequest or Connection models | Violates DNA-1 (ParseDocument) | Dictionary<string,object> via ParseDocument — no typed models |
| Hardcoding rate limit value in code | Cannot tune per tenant; violates FREEDOM principle | Rate limit in ES config: `freedom_connection_{tenantId}` |
| Importing neo4j-driver directly in service code | Violates fabric-first | Resolve through DATABASE FABRIC (Skill 05) |

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
| Rate limiting all flows (CF-75) | MicroserviceBase (Skill 01) | SOFT |
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
| AP-2 | Typed ITenant model | Dictionary<string,object> (DNA-1) |
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
FLOW-05 owns all XP awards. Prevents double-award on cross-flow event consumption.

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
| AP-80 | Using typed ReservationModel class | DNA-1 violated | Dictionary<string,object> via ParseDocument |
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
DEDUP: By reminder_schedule_id (prevents double-send on catch-up)
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

# ═══════════════════════════════════════════════════════
# FLOW-11 — UNIFIED SOURCE INDEX UPDATE
# DD-38–DD-41 | Concept Map Extension | SK additions
# ═══════════════════════════════════════════════════════

## Design Decisions — FLOW-11 (DD-38–DD-41)

### DD-38

```
DECISION DOMAIN: ERP Connector Abstraction
DECISION: External ERP APIs (SAP B1 OData, monday.com GraphQL) are exposed through
          fabric interfaces only (F288, F292). Service code never imports ERP vendor SDKs.
TRADEOFFS CONSIDERED:
  Option A (chosen): Fabric wrapper — higher initial abstraction cost, full provider swap via config
  Option B: Direct SDK import — faster initial dev, permanent provider lock-in
  Option C: OpenAPI codegen — automatic but typed models violate DNA-1
REASONING: Freedom Machine philosophy. Config-first routing (DNA-8). Enables future ERP
           provider swap without code change. Consistent with all prior fabric decisions.
IMPACT: F288 and F292 implement OData v3/v4 + B1SESSION management internally.
        All consuming services see only DataProcessResult<Dictionary<string,object>>.
REFERENCES: basic_prompt.txt (LAYER 0 fabric interfaces), DR-31 (tenant isolation)
```

### DD-39

```
DECISION DOMAIN: Financial Correctness Pattern Selection
DECISION: ERP documents use reversal-not-delete semantics (F295) + WORM journal (F291) +
          transactional outbox (F296) + idempotency key (F294) as a mandatory four-component
          co-design pattern (DR-30).
TRADEOFFS CONSIDERED:
  Option A (chosen): All four components mandatory on every state change — consistent correctness
  Option B: Idempotency only — simpler but no outbox guarantee; dual-write risk remains
  Option C: Saga rollback via delete — simpler compensation, destroys audit trail
REASONING: Financial systems require complete audit trail. Reversal-not-delete preserves it.
           Outbox eliminates dual-write. Idempotency eliminates retry duplicates.
           All four are needed together — partial adoption defeats correctness guarantee.
IMPACT: T103 Iron Rules mandate all four. AF-9 Judge validates presence at build time.
        CF-97 (idempotency) enforced by BFA.
REFERENCES: 12_-_ERP_systems_deep_search.md (reliability patterns), DR-30
```

### DD-40

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
IMPACT: F300 (connection registry) stores tier per tenant. FactoryResolutionContext carries
        IsolationTier. All F288–F303 factories branch on IsolationTier.
        Per-tenant KEK required for SCHEMA and INSTANCE tiers (PII: tax_id, addresses).
REFERENCES: multi-tenant-support.md (hybrid isolation model), DR-31
```

### DD-41

```
DECISION DOMAIN: Analytics vs Ledger Separation
DECISION: F302 (analytics index) and F291 (authoritative ledger) are permanently separated.
          Analytics is always derived (fed by outbox relay). Ledger is always authoritative.
          No system may use analytics data as input to a financial posting.
TRADEOFFS CONSIDERED:
  Option A (chosen): Strict separation + CF-107 BFA enforcement + AF-9 static analysis check
  Option B: Single store for both analytics and ledger — simpler, but mixes authoritative
            and derived data; SAP universal journal design explicitly rejects this
  Option C: Analytics-first (derive ledger from analytics) — inverts the dependency;
            creates risk of approximations becoming authoritative
REASONING: SAP S/4HANA "universal journal" is explicitly the "book of original entry."
           Analytics over it are secondary. Mixing them creates SOC 2 / GAAP violation risk.
           CF-107 enforces at engine level — no service can accidentally break this.
IMPACT: T110 always event-driven from outbox relay. F302 records always tagged source="derived".
        AF-9 Judge static analysis validates no data flow from F302 → F291.
REFERENCES: 12_-_ERP_systems_deep_search.md (analytics vs authoritative), DR-32
```

---

## Concept Map Extension — FLOW-11

```
FLOW-11 DEPENDENCY MAP:

  O2C VALUE STREAM:
  Quote──►SO──►Delivery──►AR_Invoice──►IncomingPayment
   T103   T103    T103        T103           T103
   F290   F290    F290        F290           F290+F291
  [Each step: F294(idempotency)+F296(outbox)+F301(audit)]
  [Each step: CF-96(chain)+CF-97(idempotency)+CF-98(tenant)]
  [Approval gates: T109 on SO + AR_Invoice]
  [Compensation: T107 on any step failure → LIFO]

  P2P VALUE STREAM:
  PReq──►PO──►GR──►T104──►AP_Invoice──►OutgoingPayment
  T103   T103  T103 T104    T103           T103
  F290   F290  F290 F298    F290           F290+F291
  [T104: CF-99+CF-100+CF-101 enforced]
  [Variance → T109, Mismatch → ALERT_AND_BLOCK]
  [Approval gates: T109 on PReq + AP_Invoice + OutgoingPayment]

  R2R VALUE STREAM:
  Initiate──►Revalue──►Accrue──►Validate──►Seal
    T106      T106      T106     T106       T106
   F299+F293  F299+F291 F299+F291 F291      F299
  [Pre-conditions: CF-102+CF-103+CF-104]
  [Seal requires: approvalToken(finance_admin)]

  SUPPORTING FLOWS:
  Bootstrap (T108): F300+F292+F288+F289+F297 → status=ACTIVE
  Sync (T105):      F288+F289+F294+F300+F303 → watermark checkpoint
  Analytics (T110): F302+F296+F301 → source="derived" tagged
  Compensation (T107): F295+F291+F290+F301+F294 → reversal-not-delete

  CROSS-CUTTING:
  All steps → F294 (idempotency first)
  All steps → F296 (outbox in same transaction)
  All steps → F301 (audit before return)
  All steps → F293 (saga state machine)
  All steps → F303 (quota check before ERP API call)
```

---

## Skills Index Update — FLOW-11 Additions

| SK-ID | Skill Name | Source Pattern | FLOW-11 Usage |
|-------|-----------|----------------|---------------|
| SK-44 | ERP Document Chain Step | F290 + F294 + F296 co-design | T103 generation template |
| SK-45 | Three-Way Match Gate | F298 + F290 + CF-100 + CF-101 | T104 generation template |
| SK-46 | Saga Coordination with Compensation | F293 + T107 + LIFO compensation | T103/T107 generation |
| SK-47 | WORM Ledger + Reversal Semantics | F291 + F295 + DR-29 | T107 generation template |
| SK-48 | Transactional Outbox + Idempotency | F294 + F296 + DR-30 | All T103-T110 co-design |
| SK-49 | Period-End Close Routine | F299 + CF-102-104 | T106 generation template |
| SK-50 | Multi-Tenant ERP Connection Bootstrap | F300 + F297 + T108 | T108 generation template |
| SK-51 | ERP Approval Gate with RBAC | F292 + F293 + RBAC roles | T109 generation template |
| SK-52 | OData Watermark Sync Pattern | F288 + F289 + F303 | T105 generation template |
| SK-53 | Derived Analytics + Reconciliation | F302 + CF-107 + DR-32 | T110 generation template |

---

## SAVE POINT: FLOW-11:MERGE:P4 ✅
## Phase 4 COMPLETE: DD-38–DD-41, Concept Map FLOW-11, SK-44–SK-53
