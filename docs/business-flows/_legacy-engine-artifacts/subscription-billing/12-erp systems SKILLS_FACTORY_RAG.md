# FLOW-05 Engine Extension — Skills Factory & RAG Index
## Quick-lookup for all concepts, patterns, and source references
## Date: 2026-02-25

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
| AF-4 RAG | Reusable patterns | Skill 04 (Queue), Skill 05 (DB), FLOW-04 pipeline |
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
| 6 DNA Patterns | basic_prompt LAYER 4 | ParseDocument, BuildQueryFilters, DataProcessResult, MicroserviceBase, Scope Isolation, DynamicController |
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
6. ❌ Create typed models (use Dictionary<string,object>)
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

### Queue Fabric Additions (not a new factory — extends existing Skill 04)
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
| Flow orchestration | IFlowOrchestrator (Skill 09) | ✅ REUSE (Fabric Layer 0) |
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
| Event publishing (10 events) | IQueueService → Redis Streams (Skill 04) | ✅ REUSE (Fabric Layer 0) |
| Outbox pattern | Queue Fabric → OutboxWriteAsync (FCE +3) | ✅ REUSE |
| Multi-model NLP | IAiProvider + AiDispatcher (Skill 06/07) | ✅ REUSE (Fabric Layer 0) |
| Business profiles | F182 IBusinessProfileService (FLOW-02) | ✅ REUSE (read-only) |
| Feed READ path | F188 IFeedPersonalizationService (FLOW-02) | ✅ REUSE (read-only) |
| Feed WRITE reference | F201 IFeedInjectionService (FLOW-03) | ⚠️ PATTERN REFERENCE only (different logic) |
| Onboarding gate | F175 (FLOW-01) | ✅ REUSE (BFA prerequisite) |
| Flow orchestration | IFlowOrchestrator (Skill 09) | ✅ REUSE (Fabric Layer 0) |
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
Step 3: Window key is idempotent on replay (prevents double-aggregation on consumer restart)
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
| F219 IGradingService | Skill 05 (DB Fabric) | MongoDB unique index + Redis ZSET |
| F220 ICommentService | Skill 04 (Queue Fabric) | Dual-stream emit (engagement + moderation) |
| F221 IAntiAbuseGateService | Skill 05 (DB Fabric) | Redis idempotency keys + ES audit log |
| F221 IAntiAbuseGateService | F214 (Family 23) | Telemetry stream consumer relationship |
| F222 IStreakTimezoneService | F169 (Family 17) | CreateAsync delegation for streak storage |
| F222 IStreakTimezoneService | Skill 05 (DB Fabric) | PostgreSQL timezone store |
| F223 IEngagementFeedbackService | Skill 04 (Queue Fabric) | EnqueueAsync to gamification stream |
| F223 IEngagementFeedbackService | F166 (Family 17) | Downstream gamification consumer |
| F224 ISyncComputeGatewayService | Skill 04 (Queue Fabric) | Durable emit after sync compute |

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
| 26 | No typed models (Dictionary\<string,object\> everywhere) | ✅ PASS |
| 27 | All methods return DataProcessResult\<T\> | ✅ PASS |
| 28 | All factories inherit MicroserviceBase (DNA-4) | ✅ PASS |
| 29 | tenantId on every query (DNA-5, scope isolation) | ✅ PASS |
| 30 | GamificationSocialPointsAwarded ≠ GamificationPointsAwarded (CF-34, DR-11) | ✅ PASS |
| 31 | F221 runs BEFORE F166 on all write paths (CF-38, DR-9) | ✅ PASS |
| 32 | F222 wraps F169 via CreateAsync (CF-39, DR-10) | ✅ PASS |
| 33 | F219 wraps F172 via CreateAsync (DR-10) | ✅ PASS |
| 34 | F223 routes to F166 via QUEUE only (CF-41) | ✅ PASS |
| 35 | Idempotency key prevents sync+async double-count (CF-37, ST-8) | ✅ PASS |
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
"What prevents double-counting?"       → CF-37, F221 idempotency, ST-8
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
8. Return DataProcessResult<Dictionary<string,object>> — never typed model
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
6. All card data as Dictionary<string,object> — no typed CardModel
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
3. Register durable timer through FLOW ENGINE FABRIC (Skill 09) — NOT cron
4. Timer fires once reliably even across pod restarts
5. Compensating actions must be idempotent (could be called multiple times on retry)
6. All state data as Dictionary<string,object>
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
7. DataProcessResult<Dictionary<string,object>> — no typed PriceModel
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
4. mlAdjustment = clamp(mlPrediction, -bound, +bound)  // e.g., ±0.2
5. finalWeight = clamp(rawWeight + mlAdjustment, 0.0, 1.0)
6. confidenceScore = 1.0 - (defaultedInputs × penalty)  // e.g., 0.15 per default
7. ML unavailable → mlAdjustment = 0.0 (graceful degrade, never fail)
8. Store weight history for ML training pipeline (Redis ZSET with timestamps)
9. Return DataProcessResult<Dictionary<string,object>> with all components
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
8. Factory capability string includes "privacy-masked" for explicit tagging
9. Return DataProcessResult<Dictionary<string,object>> with aggregate data only
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
3. Each adapter returns binding metadata (connection string ref, schema name, shard key)
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
7. Compensation actions are IDEMPOTENT (F260 key on stepId) — double-rollback = no-op
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
**Reusable For:** Any future system that interrupts long-running workflows for maintenance (database maintenance windows, infrastructure migration, version upgrades)

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

# ═══════════════════════════════════════════════════════
# FLOW-11 — SKILLS FACTORY RAG UPDATE
# SK-44–SK-53 | AF-4 RAG Index | FLOW-11 Patterns
# ═══════════════════════════════════════════════════════

## FLOW-11 AF-4 RAG Mini-Index

AF-4 (Task Context RAG) uses this index when generating FLOW-11 services.
Source documents grounded in uploaded specification files.

| Source Document | Engine Contribution | Key Patterns Retrieved |
|---|---|---|
| 12_-_ERP_systems.md | ERP module mental model, 6 value streams, document chain topology | Shared master data schema, transactional document chain, financial posting rules |
| 12_-_ERP_systems_deep_search.md | Canonical schemas (erp_document, journal_entry, process_instance, idempotency_key, outbox), reliability patterns, OAuth/RBAC | Saga orchestration, transactional outbox, idempotency key pattern, reversal-not-delete |
| 12_-_ERP_systems_deep_search_engine.md | Flow runtime requirements (state machine, approval steps, compensation), CloudEvents, SAP B1SESSION, monday.com rate limits | Durable retry/backoff, webhook challenge-response, document reversal artifact |
| multi-tenant-support.md | Three-tier isolation (shared/schema/instance), per-tenant KEK, RLS enforcement, OTLP tenant labels | TenantId propagation, object-level authorization, noisy-neighbor guardrails |
| Skill 01 (MicroserviceBase) | 19 inherited components | ALL generated FLOW-11 services extend this — DNA-4 |
| Skill 04 (IQueueService) | Redis Streams consumer groups, Main→Consumed→Archive→DLQ | Saga step routing (F293), outbox relay (F296), webhook ingestion (F297) |
| Skill 05 (IDatabaseService) | 6 DB providers, BuildSearchFilter, DataProcessResult<T> | ERP document storage (F290), ledger (F291), idempotency (F294) |
| Skill 07 (AiDispatcher + IAiProvider) | Multi-model generation, consensus | Work platform connector (F292) — GraphQL as AI ENGINE FABRIC provider |
| Skill 00b (IRagService Hybrid) | 7 RAG strategies, Hybrid for analytics | ERP reporting analytics index (F302) |
| Skill 08/09 (IFlowDefinition + IFlowOrchestrator) | JSON DAG execution, step orchestration | Template 20 DAG execution |

**Skill Gap Analysis**: No existing skill covers SAP OData B1SESSION management or monday.com
GraphQL complexity budgets. These are modeled as config-driven connector behaviors within
DATABASE and AI ENGINE fabrics. No new core skills needed — SK-44–SK-53 are FLOW-11 skill
patterns generated on top of existing Skills 01–09.

---

## FLOW-11 Skill Patterns (SK-44–SK-53)

### SK-44: ERP Document Chain Step Pattern

```
SKILL: SK-44
NAME: ERP Document Chain Step
TASK TYPES: T103
FACTORIES: F288, F290, F294, F296, F301
ARCHETYPE: STATEFUL_ORCHESTRATION

PATTERN DESCRIPTION:
  Standard pattern for any single-step document creation in O2C or P2P chain.
  Four-component co-design: idempotency check → mutation → outbox write → audit.
  All four components required together (DR-30).

PRIMARY .NET IMPLEMENTATION:
  public class ERPDocumentChainStep : MicroserviceBase
  {
      private readonly IExternalServiceFactory<IDocumentChainService> _chainFactory;
      private readonly IExternalServiceFactory<IIdempotencyService> _idempotencyFactory;
      private readonly IExternalServiceFactory<IAuditLedgerService> _auditFactory;
      private readonly IExternalServiceFactory<IOutboxPublisherService> _outboxFactory;
      private readonly IExternalServiceFactory<IERPConnectorService> _erpFactory;

      public async Task<DataProcessResult<Dictionary<string,object>>> ExecuteAsync(
          string tenantId, string docType, string parentDocId,
          Dictionary<string,object> payload, string idempotencyKey)
      {
          // Step 1: Idempotency check FIRST (DR-30)
          var ctx = new FactoryResolutionContext { TenantId = tenantId };
          var idempotency = await _idempotencyFactory.CreateAsync(ctx);
          var check = await idempotency.CheckOrCreateAsync(tenantId, idempotencyKey,
                          ObjectProcessor.ComputeHash(payload));
          if (check.Data?["isReplay"]?.ToString() == "true")
              return DataProcessResult<Dictionary<string,object>>.Success(
                  (Dictionary<string,object>)check.Data["cachedResult"]);

          // Step 2: Resolve factories through fabric
          var chain = await _chainFactory.CreateAsync(ctx);
          var erp = await _erpFactory.CreateAsync(ctx);

          // Step 3: Validate chain integrity (CF-96)
          var chainValid = await chain.ValidateChainIntegrityAsync(tenantId, parentDocId);
          if (!chainValid.IsSuccess)
              return DataProcessResult<Dictionary<string,object>>.Failure(chainValid.Error);

          // Step 4: Create document via chain service (fabric resolves to correct provider)
          var docResult = await chain.CreateDocumentAsync(
              tenantId, docType, parentDocId, payload, idempotencyKey);
          if (!docResult.IsSuccess)
              return docResult;

          // Step 5: Outbox in same logical unit (DR-30)
          var outbox = await _outboxFactory.CreateAsync(ctx);
          await outbox.WriteToOutboxAsync(tenantId, docResult.Data["docId"].ToString(),
                                           "DocumentCreated", docResult.Data);

          // Step 6: Audit BEFORE return (Iron Rule IR-103-6)
          var audit = await _auditFactory.CreateAsync(ctx);
          await audit.WriteAuditAsync(tenantId, Context.ActorId, "CREATE_DOCUMENT",
                                       docResult.Data["docId"].ToString(), payload);

          // Step 7: Store idempotency result
          await idempotency.StoreResultAsync(tenantId, idempotencyKey,
                                              docResult.Data["docId"].ToString());

          return docResult; // DNA-3: DataProcessResult, never throw
      }
  }

LANGUAGE VARIANTS:
  Node.js:  async function erpDocumentChainStep(tenantId, docType, parentDocId, payload, idempotencyKey)
  Python:   async def erp_document_chain_step(tenant_id, doc_type, parent_doc_id, payload, idempotency_key)
  Java:     CompletableFuture<DataProcessResult<Map<String,Object>>> executeAsync(...)
  Rust:     async fn erp_document_chain_step(...) -> Result<DataProcessResult<HashMap<String,Value>>, Error>
  PHP:      public function executeAsync(string $tenantId, ...): DataProcessResult

AI AGENT IMPLEMENTATION PROMPT:
  "Generate an ERP document chain step service extending MicroserviceBase.
   Use SK-44 pattern: idempotency check first (F294), chain validation (F290, CF-96),
   document creation (F290), outbox write (F296) in same transaction, audit (F301) before return.
   All data as Dictionary<string,object> (DNA-1). DataProcessResult<T> on all paths (DNA-3).
   tenantId in every factory call (DNA-5). No provider imports — only fabric interfaces."
```

### SK-45: Three-Way Match Gate Pattern

```
SKILL: SK-45
NAME: Three-Way Match Gate
TASK TYPES: T104
FACTORIES: F290, F293, F298, F301
ARCHETYPE: VALIDATION_GATE

PATTERN DESCRIPTION:
  Validates PO ↔ GR ↔ Vendor Invoice before AP Invoice posting is allowed.
  Branches on FULL_MATCH / VARIANCE / MISMATCH — never silently advances.
  Chain integrity check (CF-100) runs before match logic.

KEY IMPLEMENTATION NOTES:
  - tenantId validation on all three documents BEFORE F298.MatchAsync (CF-99)
  - F290.ValidateChainIntegrityAsync for GR→PO link (CF-100)
  - Variance tolerance read from FREEDOM config (CF-101)
  - MISMATCH → ALERT_AND_BLOCK; VARIANCE → T109 approval gate
  - Match result always stored and audited even on FULL_MATCH

DNA COMPLIANCE:
  DNA-1: Match records as Dictionary<string,object>
  DNA-3: DataProcessResult on all branch paths
  DNA-5: tenantId validated on PO, GR, and Invoice separately
```

### SK-46: Saga Coordination + LIFO Compensation Pattern

```
SKILL: SK-46
NAME: Saga Coordination with LIFO Compensation
TASK TYPES: T103 (stepping), T107 (compensation)
FACTORIES: F293, F295, F291, F290, F294, F301
ARCHETYPE: COMPENSATION

PATTERN DESCRIPTION:
  Standard saga step pattern with automatic LIFO compensation on failure.
  Each step registered in F293 saga state for compensation tracking.
  Compensation executes in reverse order (LIFO) via T107.

KEY IMPLEMENTATION NOTES:
  - F293.StartSagaAsync with correlationId at flow entry
  - F293.AdvanceStepAsync after each T103 success
  - Permanent failure (5 retries exhausted) → F293.CompensateAsync from failed step
  - T107 executes for each completed step in reverse order
  - Each T107 execution: F295.ReverseDocumentAsync → original CANCELLED + reversal POSTED

IRON RULE REFERENCE: IR-103-5 (no delete), IR-107-1 through IR-107-4
```

### SK-47: WORM Ledger + Reversal Semantics

```
SKILL: SK-47
NAME: WORM Ledger with Reversal Semantics
TASK TYPES: T107, T106 (journal entries)
FACTORIES: F291, F295
ARCHETYPE: FINANCIAL_CORRECTNESS

PATTERN DESCRIPTION:
  All financial postings create WORM (write-once) journal entries.
  Corrections always create new reversal entries — never UPDATE/DELETE.
  F291.ReverseEntryAsync produces balancing entry: credits become debits and vice versa.

KEY IMPLEMENTATION NOTES:
  - F291.PostJournalEntryAsync always requires idempotencyKey
  - Lines must balance: sum(debit) == sum(credit) before posting
  - ReverseEntryAsync: new je_id, status=POSTED, references originalJeId
  - Both original and reversal entries always queryable
  - Period reconciliation: F291.ReconcileAsync checks debit/credit equality for period

REFERENCES: DR-29 (design decision), CF-103 (BFA enforcement)
```

### SK-48: Transactional Outbox + Idempotency Co-Design

```
SKILL: SK-48
NAME: Transactional Outbox + Idempotency Co-Design (DR-30)
TASK TYPES: T103, T106, T107, T108, T110
FACTORIES: F294, F296
ARCHETYPE: RELIABILITY_PATTERN

PATTERN DESCRIPTION:
  The four-component co-design mandatory for all state-changing FLOW-11 operations:
  (1) F294.CheckOrCreateAsync as FIRST call (idempotency gate)
  (2) DB mutation (document creation, journal entry, etc.)
  (3) F296.WriteToOutboxAsync in SAME transaction as mutation
  (4) F301.WriteAuditAsync BEFORE returning success

  If any component is absent: AF-9 Judge BUILD FAILURE.
  This pattern eliminates dual-write risk and replay duplicates simultaneously.

WHEN TO APPLY: Every method that modifies ERP state (document, ledger, saga, period)
WHEN NOT TO APPLY: Read-only queries, health checks, analytics reads
```

### SK-49: Period-End Close Routine Pattern

```
SKILL: SK-49
NAME: Period-End Close Routine (R2R)
TASK TYPES: T106
FACTORIES: F299, F291, F293, F301, F302
ARCHETYPE: SCHEDULED_WORKFLOW

PATTERN DESCRIPTION:
  Five-step idempotent saga: INIT → REVALUE → ACCRUE → VALIDATE → SEAL.
  Each step idempotent and individually restartable.
  SEAL step requires: approvalToken(finance_admin) + balance_check=PASSED + pending_outbox=0.

SEQUENCE ENFORCEMENT:
  - INIT creates saga via F293 with correlationId="period_close:{tenantId}:{periodId}"
  - REVALUE: exchange rate adjustments as journal entries via F291
  - ACCRUE: expense accruals as journal entries via F291
  - VALIDATE: F291.ReconcileAsync → balance_check=PASSED or FAILED
  - SEAL: F299.FinalizeCloseAsync — only with approvalToken + PASSED + 0 pending outbox

IRON RULES: IR-106-1 through IR-106-4
BFA RULES: CF-102, CF-103, CF-104
```

### SK-50: Multi-Tenant ERP Connection Bootstrap Pattern

```
SKILL: SK-50
NAME: Multi-Tenant ERP Connection Bootstrap
TASK TYPES: T108
FACTORIES: F300, F292, F288, F289, F297
ARCHETYPE: SETUP_WORKFLOW

PATTERN DESCRIPTION:
  Ordered bootstrap sequence with BLOCKING webhook verification.
  Connection status = ACTIVE only after all steps succeed.
  Secrets always stored as vault references — never raw credentials.

STEP ORDER (enforced, not configurable):
  1. F300.RegisterConnectionAsync → store config + vault ref
  2. F297.HandleChallengeAsync via F292 → BLOCKING — entire bootstrap halts on failure
  3. F288.ConnectAsync → ERP authentication test
  4. T105 invocation → initial master data sync (partners + items + warehouses)
  5. BFA registration → new entities/events/APIs indexed

IRON RULES: IR-108-1 through IR-108-4
BFA RULES: CF-105, CF-106
```

### SK-51: ERP Approval Gate with RBAC

```
SKILL: SK-51
NAME: ERP Approval Gate with RBAC Role Enforcement
TASK TYPES: T109
FACTORIES: F293, F292, F301, F294
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

IRON RULES: IR-109-1 (high-risk never auto), IR-109-2 (token stored), IR-109-3 (durable state)
```

### SK-52: OData Watermark Incremental Sync Pattern

```
SKILL: SK-52
NAME: OData Watermark Incremental Sync
TASK TYPES: T105
FACTORIES: F288, F289, F294, F300, F303
ARCHETYPE: INTEGRATION_SYNC

PATTERN DESCRIPTION:
  Page-by-page incremental sync with watermark checkpoint after each page.
  Transparent B1SESSION renewal on 401. Quota enforcement before each page.
  Deduplication via F294 using watermark-based key.

OData PATTERN:
  Query: GET /EntitySet?$filter=UpdateDate gt '{watermark}'&$orderby=UpdateDate&$skiptoken={token}
  After each page: save watermark + $skiptoken as checkpoint
  On 401: F288.ConnectAsync (re-auth) → retry from last watermark (no data loss)

KEY IRON RULES: IR-105-1 (quota first), IR-105-2 (session not logged), IR-105-3 (KEK encryption)
```

### SK-53: Derived Analytics + Reconciliation Pattern

```
SKILL: SK-53
NAME: Derived Analytics + Reconciliation (CF-107 compliance)
TASK TYPES: T110
FACTORIES: F302, F296, F301
ARCHETYPE: DERIVED_DATA_SYNC

PATTERN DESCRIPTION:
  Event-driven analytics indexing from outbox relay — never polling, never direct writes.
  All records tagged source="derived" — engine enforces this via AF-7 compliance.
  Reconciliation gaps routed to human review — never auto-corrected.

CF-107 COMPLIANCE REQUIREMENTS:
  - F302.IndexDocumentEventAsync only called from outbox relay consumer
  - F302.SearchReportsAsync result NEVER flows into F291.PostJournalEntryAsync
  - Reconciliation gaps from F302.GetReconciliationGapsAsync → T109 human review task
  - AF-9 Judge static analysis validates data flow at build time

IRON RULES: IR-110-1 (not authoritative), IR-110-2 (no auto-correct), IR-110-3 (event-driven only)
```

---

## SAVE POINT: FLOW-11:MERGE:RAG ✅
## SKILLS_FACTORY_RAG_F11 COMPLETE: AF-4 index, SK-44–SK-53 (10 new patterns)
