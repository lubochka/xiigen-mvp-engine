# XIIGen — SOCIAL NETWORK MODULES: FLOW-08 → FLOW-13
## Master Extension Plan | Date: 2026-02-26 | Status: PLANNING ✅
## Save Point: PLAN:MASTER

---

## ═══════════════════════════════════════
## PART 0 — RAG MINI-INDEX (Quick Reference)
## ═══════════════════════════════════════

### Current System Anchor State
```
SYSTEM STATE (Post FLOW-07):
  Families:        F1-F243  (26 families)
  Task Types:      T1-T82
  BFA Rules:       CF-1-CF-63
  Stress Tests:    ST-1-ST-30
  Design Records:  DR-1-DR-20
  Design Decisions: DD-1-DD-20
  Skill Patterns:  SK-1-SK-28
  Flow Templates:  Template 1-17
  DNA Patterns:    DNA-1 through DNA-8

NEXT AVAILABLE NUMBERS:
  Factory:         F244
  Task Type:       T83
  BFA Rule:        CF-64
  Stress Test:     ST-31
  Design Record:   DR-21
  Design Decision: DD-21
  Skill Pattern:   SK-29
  Flow Template:   Template 18
  Family:          Family 27
```

### Source Document → Flow Mapping
| 11-* Source | Required Flows | Priority |
|-------------|----------------|----------|
| 11-social_network_modules.md §3 Flow 3 | FLOW-08: Post + Media Publish Pipeline | HIGH |
| 11-social_network_modules.md §3 Flow 4 | FLOW-09: Home Feed Pipeline | HIGH |
| 11-social_network_modules.md §3 Flow 5 | FLOW-10: Engagement (React/Comment) | MEDIUM |
| 11-social_network_modules.md §3 Flow 6 | FLOW-11: Real-time Messaging | HIGH |
| 11-social_network_modules.md §3 Flow 7 | FLOW-12: Social Search | MEDIUM |
| 11-social_network_modules.md §3 Flow 8 | FLOW-13: Content Moderation | HIGH |
| 11-social_network_modules_deep_research_engine_multi_tenant.md | DNA-9: Multi-Tenant Isolation Layer | CROSS-CUTTING |

### Key Fabrics Used Per Flow
| Flow | Database Fabric | Queue Fabric | AI Fabric | RAG Fabric |
|------|-----------------|--------------|-----------|------------|
| FLOW-08 | PG + Object Storage | Redis Streams | LLM (caption/tag) | — |
| FLOW-09 | ES (feed index) + Redis | Redis Streams | ML ranking | Hybrid RAG |
| FLOW-10 | PG + Redis | Redis Streams | — | — |
| FLOW-11 | PG + Redis | Redis Streams | — | — |
| FLOW-12 | ES (search index) | Redis Streams | NLP query understanding | Vector RAG |
| FLOW-13 | PG + ES | Redis Streams | LLM classifier | Multi-strategy RAG |

---

## ═══════════════════════════════════════
## PART 1 — NO-CODE EXPLANATION
## ═══════════════════════════════════════

### What We Are Building (Plain Language)

We are NOT building a social network. We are teaching the XIIGen ENGINE how to generate
the services that power a social network — on demand, from a config document.

The 11-* documents describe 6 critical flows that any Facebook/LinkedIn-class platform needs:
publishing content with media, serving a ranked home feed, reacting to content, messaging,
searching, and moderating. Each of these is a multi-step, cross-service process that involves
waiting for events, branching on conditions, fanning out to many recipients, and applying
privacy rules. The engine currently cannot generate these patterns.

We will extend the engine so that when given a spec for "home feed pipeline," it can generate
all the services, factory interfaces, queue event chains, and DAG configuration needed — 
without a developer writing a single line of orchestration code.

The multi-tenant document adds one more requirement: every flow the engine generates must work
for multiple tenant organizations without any data leaking between them. This is a cross-cutting
change captured as a new DNA pattern (DNA-9).

### The Six New Flows in Plain Language

**FLOW-08: Post + Media Publish Pipeline**
A user writes a post and uploads a photo/video. The media must be transcoded before the post
goes live. The engine must handle: signed upload URL → transcode worker → MediaReady event →
post becomes visible → feed notified → notifications dispatched. This is an async wait pattern
the engine has never handled before for media.

**FLOW-09: Home Feed Pipeline**
When a user opens their app, the feed must be assembled: pull candidate posts from their graph,
filter out hidden/blocked content, run ML ranking, re-rank for diversity, then serve paginated.
This is a multi-stage sequential pipeline with configurable ML models and a cache layer.

**FLOW-10: Engagement Pipeline**
A user taps Like or writes a Comment. This must be idempotent, update counters, emit events,
and trigger notifications. High QPS (many concurrent users reacting to the same post). The
engine needs to know how to generate idempotent write patterns.

**FLOW-11: Real-time Messaging**
A user sends a message to another. Trust gating checks if they're connected (if not: message
request queue). Message persists, fans out to all participants, pushes to real-time transport,
attaches media if present. First flow to use WebSocket-adjacent patterns.

**FLOW-12: Social Search**
A user types a search query. Engine retrieves from ES index, applies permissions filtering
(can this viewer see each result?), ranks by text relevance + social proximity + recency.
First flow to use the NLP / query-understanding layer.

**FLOW-13: Content Moderation**
A report comes in (or a post triggers automated scan). Safety classifier runs. High-confidence
violations auto-hide. Borderline cases go to human review queue. Enforcement action applied.
Audit log created. Appeal path available. First flow with human-in-the-loop branching.

**DNA-9: Multi-Tenant Isolation Layer (Cross-cutting)**
Every factory interface generated by the engine must propagate tenantId through all fabric
calls. A new DNA pattern codifies the control plane / data plane split pattern described in
the multi-tenant document: tenant registry lookup → isolation binding resolution → all
downstream calls scoped to that binding.

---

## ═══════════════════════════════════════
## PART 2 — PHASED EXECUTION PLAN
## ═══════════════════════════════════════

Each phase is designed to complete in one focused session with a clear save point.
Recovery from any save point takes < 60 seconds.

---

### PHASE 0 — DNA-9 + Engine Primitive EP-4 (Cross-cutting prerequisite)
**Duration estimate:** 30–45 min  
**Save point:** PLAN:P0

**What:** Before any new flow can be generated, the engine must know about multi-tenant isolation.
This phase adds DNA-9 (Multi-Tenant Control/Data Plane Split) as the 9th mandatory DNA pattern
and EP-4 (Tenant Routing Engine) as a new engine primitive. Every factory in FLOW-08 onward
will reference DNA-9 compliance and use EP-4 for tenant binding resolution.

**Produces:**
- DNA-9 pattern definition (added to ENGINE_ARCHITECTURE_MERGED)
- EP-4: Tenant Routing Engine primitive (silo/pool/bridge config-driven)
- DD-21: Design decision — why DNA-9 is a new pattern vs extending DNA-5 (Scope Isolation)
- Updated DNA compliance checklist: now 9×N

**Why this first:** Every factory in FLOW-08 → FLOW-13 will be DNA-9 compliant. If we add
DNA-9 after, we'd need to retrofit all 6 flows.

---

### PHASE 1 — FLOW-08: Post + Media Publish Pipeline
**Duration estimate:** 45–60 min  
**Save point:** MERGE:P1_FLOW08

**What:** Register 8 new factory interfaces (Family 27), define 4 new task types (T83–T86),
map AF stations, create BFA conflict rules, and generate flow template 18.

**New Factories (F244–F251, Family 27):**
- F244: IMediaUploadService → DATABASE FABRIC (Object Storage via ES metadata) + QUEUE FABRIC
- F245: ITranscodeOrchestrationService → QUEUE FABRIC (Redis Streams async worker)
- F246: IMediaReadyGateService → FLOW ENGINE FABRIC (event wait state — EP-2 Durable Timer)
- F247: IPostPublicationService → DATABASE FABRIC (PG) + QUEUE FABRIC (PostPublished event)
- F248: IMediaCDNService → DATABASE FABRIC (ES metadata index)
- F249: IAiMediaTaggingService → AI ENGINE FABRIC (LLM captioning/tagging)
- F250: IFeedEligibilityService → DATABASE FABRIC (ES feed index) + QUEUE FABRIC
- F251: INotificationDispatchService → QUEUE FABRIC (fan-out to notification queue)

**New Task Types (T83–T86):**
- T83: MEDIA_UPLOAD_GATE — ARCHETYPE: WAIT_STATE — waits for signed URL + upload completion
- T84: TRANSCODE_PIPELINE — ARCHETYPE: ASYNC_WORKER — transcodes, tags via AI, stores in CDN
- T85: POST_PUBLICATION_GATE — ARCHETYPE: CONVERGENCE — waits for MediaReady before publishing
- T86: AUDIENCE_FANOUT — ARCHETYPE: DISTRIBUTION — pushes PostPublished to feed + notifications

**First-time capabilities:**
- First WAIT_STATE archetype with MediaReady event trigger (extends EP-2)
- First AI-tagged media pipeline (F249 → AI ENGINE FABRIC)
- Signed URL pattern (pre-auth object storage, never through fabric)

**BFA rules:** CF-64 through CF-69 (post/media entity conflicts with FLOW-03 content services)
**Stress tests:** ST-31 through ST-34
**Design records:** DR-21 (async media wait), DR-22 (AI tagging opt-in)
**Skills:** SK-29 (Media Upload Gate pattern), SK-30 (Async Transcode Worker pattern)

---

### PHASE 2 — FLOW-09: Home Feed Pipeline
**Duration estimate:** 60–75 min  
**Save point:** MERGE:P1_FLOW09

**What:** The most complex new flow. 6-stage sequential ML pipeline. Register 10 factory
interfaces (Family 28), define 5 task types (T87–T91), create detailed AF station mapping
showing how AF-5 (multi-model) orchestrates competing ML rankers.

**New Factories (F252–F261, Family 28):**
- F252: ICandidateGenerationService → DATABASE FABRIC (Neo4j graph traversal + ES)
- F253: IPrivacyFilterService → DATABASE FABRIC (PG — block/mute/restriction rules)
- F254: IMLRankingService → AI ENGINE FABRIC (AiDispatcher — competing rankers)
- F255: IDiversityReRankService → AI ENGINE FABRIC (diversity + anti-monotony ML)
- F256: IFeedCacheService → DATABASE FABRIC (Redis — pre-computed feed slots)
- F257: IPaginationCursorService → DATABASE FABRIC (ES cursor state)
- F258: ISeenStateService → DATABASE FABRIC (Redis — which posts viewer has seen)
- F259: IAudienceRuleService → DATABASE FABRIC (PG — audience/privacy settings)
- F260: IFreshnessScoringService → DATABASE FABRIC (ES — recency decay index)
- F261: IFeedExperimentService → FLOW ENGINE FABRIC (A/B routing via BFA)

**New Task Types (T87–T91):**
- T87: CANDIDATE_GENERATION — ARCHETYPE: PARALLEL_FANOUT — pulls from graph, groups, interests
- T88: PRIVACY_PERMISSION_FILTER — ARCHETYPE: SEQUENTIAL_FILTER — applies blocks/mutes/audience rules
- T89: ML_RANKING_ENSEMBLE — ARCHETYPE: MULTI_MODEL_CONSENSUS — AF-5 runs 3 competing models
- T90: DIVERSITY_RERANK — ARCHETYPE: REORDER — enforces content mix quotas
- T91: FEED_SERVE_WITH_CACHE — ARCHETYPE: CACHE_ASIDE — cache hit: serve; miss: assemble + cache

**First-time capabilities:**
- First MULTI_MODEL_CONSENSUS archetype (ML ensemble — extends AF-5)
- First CACHE_ASIDE archetype (F256 Redis pre-computed feed)
- First A/B routing at feed level (F261 → FLOW ENGINE FABRIC)
- First time Neo4j is used as READ source for candidate generation (vs FLOW-07 where it was write)

**BFA rules:** CF-70 through CF-77
**Stress tests:** ST-35 through ST-38
**Design records:** DR-23 (ML ensemble via AF-5), DR-24 (fan-out write vs read-time assembly)
**Skills:** SK-31 (Candidate Generation from Graph), SK-32 (ML Ranking Ensemble pattern)

---

### PHASE 3 — FLOW-10: Engagement (React + Comment) Pipeline
**Duration estimate:** 30–40 min  
**Save point:** MERGE:P1_FLOW10

**What:** Idempotent high-QPS reaction/comment flow. Simpler than FLOW-09 but introduces the
IDEMPOTENT_WRITE archetype and counter aggregation pattern. 5 factory interfaces (Family 29),
3 task types (T92–T94).

**New Factories (F262–F266, Family 29):**
- F262: IReactionService → DATABASE FABRIC (PG idempotent upsert) + QUEUE FABRIC
- F263: ICommentThreadService → DATABASE FABRIC (PG nested threads)
- F264: ICounterAggregationService → DATABASE FABRIC (Redis counters → async PG flush)
- F265: IEngagementNotifyService → QUEUE FABRIC (ReactionAdded/CommentAdded events)
- F266: IMentionExtractionService → AI ENGINE FABRIC (NLP mention detection)

**New Task Types (T92–T94):**
- T92: IDEMPOTENT_REACTION_WRITE — ARCHETYPE: IDEMPOTENT_WRITE — upsert + counter
- T93: COMMENT_THREAD_APPEND — ARCHETYPE: SEQUENTIAL_WRITE — nested comment + mention extract
- T94: ENGAGEMENT_EVENT_FANOUT — ARCHETYPE: DISTRIBUTION — notify author + mentioned + followers

**First-time capabilities:**
- First IDEMPOTENT_WRITE archetype (critical for high-QPS reactions)
- Redis counter → async PG flush pattern (F264) — new dual-write pattern
- Mention extraction via AI ENGINE FABRIC (NLP inline in write path)

**BFA rules:** CF-78 through CF-83
**Stress tests:** ST-39 through ST-41
**Design records:** DR-25 (idempotent counter pattern)
**Skills:** SK-33 (Idempotent High-QPS Write), SK-34 (Counter Aggregation Dual-Write)

---

### PHASE 4 — FLOW-11: Real-time Messaging
**Duration estimate:** 45–60 min  
**Save point:** MERGE:P1_FLOW11

**What:** Trust-gated message flow with fanout to real-time transport. 7 factory interfaces
(Family 30), 4 task types (T95–T98). First flow with MESSAGE_REQUEST gate pattern.

**New Factories (F267–F273, Family 30):**
- F267: ITrustGatingService → DATABASE FABRIC (PG — connection status lookup)
- F268: IMessagePersistService → DATABASE FABRIC (PG ordered by sequence)
- F269: IConversationService → DATABASE FABRIC (PG conversation threads)
- F270: IMessageFanoutService → QUEUE FABRIC (Redis Streams → per-participant topics)
- F271: IRealtimePushService → QUEUE FABRIC (WebSocket push adapter via queue boundary)
- F272: IMessageMediaService → DATABASE FABRIC (Object Storage ref) — reuses F244 pattern
- F273: IMessageRequestService → DATABASE FABRIC (PG message request queue)

**New Task Types (T95–T98):**
- T95: TRUST_GATE_CHECK — ARCHETYPE: BRANCH_GATE — connected → direct; unconnected → request queue
- T96: MESSAGE_PERSIST_SEQUENCE — ARCHETYPE: SEQUENTIAL_WRITE — ordered persist with gap detection
- T97: MESSAGE_PARTICIPANT_FANOUT — ARCHETYPE: PARALLEL_FANOUT — fan to each participant stream
- T98: REALTIME_PUSH_DISPATCH — ARCHETYPE: FIRE_AND_FORGET — push to WS, degrade gracefully if offline

**First-time capabilities:**
- First BRANCH_GATE archetype (connect status → route decision)
- First FIRE_AND_FORGET archetype (real-time push degrades to queue)
- First message sequence ordering with gap detection (T96)
- WebSocket transport at queue boundary (F271 — queue-mediated, never direct)

**BFA rules:** CF-84 through CF-89
**Stress tests:** ST-42 through ST-44
**Design records:** DR-26 (message request gating), DR-27 (WS at queue boundary)
**Skills:** SK-35 (Trust Gate Branch), SK-36 (Realtime Push via Queue Boundary)

---

### PHASE 5 — FLOW-12: Social Search
**Duration estimate:** 40–50 min  
**Save point:** MERGE:P1_FLOW12

**What:** Query understanding + ES retrieval + permission filter + social proximity ranking.
6 factory interfaces (Family 31), 3 task types (T99–T101). First NLP query pipeline.

**New Factories (F274–F279, Family 31):**
- F274: IQueryUnderstandingService → AI ENGINE FABRIC (NLP — intent/synonym/spell)
- F275: ISearchIndexService → DATABASE FABRIC (ES full-text + ranking features)
- F276: ISearchPermissionsService → DATABASE FABRIC (PG — visibility + block lookup)
- F277: ISocialProximityRanker → DATABASE FABRIC (Neo4j — graph distance scoring)
- F278: ITypeaheadService → DATABASE FABRIC (ES suggest + Redis cache)
- F279: ISearchResultAssembler → DATABASE FABRIC (ES — multi-entity result merge)

**New Task Types (T99–T101):**
- T99: NLP_QUERY_EXPAND — ARCHETYPE: TRANSFORM — intent detection, synonym expansion, spell-correct
- T100: SEARCH_RETRIEVE_FILTER — ARCHETYPE: SEQUENTIAL_FILTER — ES retrieval → permission gate
- T101: SOCIAL_PROXIMITY_RANK — ARCHETYPE: COMPUTATION — blend text score + graph distance + recency

**First-time capabilities:**
- First NLP TRANSFORM archetype (query expansion before retrieval)
- First multi-entity search result (people + posts + groups merged — F279)
- Social proximity scoring uses Neo4j graph distance (F277 → DATABASE FABRIC Neo4j)

**BFA rules:** CF-90 through CF-94
**Stress tests:** ST-45 through ST-47
**Design records:** DR-28 (NLP query understanding layer)
**Skills:** SK-37 (NLP Query Expansion), SK-38 (Social Proximity Rank Blend)

---

### PHASE 6 — FLOW-13: Content Moderation
**Duration estimate:** 45–60 min  
**Save point:** MERGE:P1_FLOW13

**What:** Safety classification + conditional routing + human review queue + enforcement +
audit log + appeal flow. 8 factory interfaces (Family 32), 5 task types (T102–T106).
First flow with HUMAN_REVIEW archetype.

**New Factories (F280–F287, Family 32):**
- F280: ISafetyClassifierService → AI ENGINE FABRIC (LLM + safety model ensemble)
- F281: IEnforcementActionService → DATABASE FABRIC (PG — action registry)
- F282: IHumanReviewQueueService → QUEUE FABRIC (Redis Streams human review topic)
- F283: IReportCaseService → DATABASE FABRIC (PG — case management)
- F284: IAuditLogService → DATABASE FABRIC (ES append-only audit index)
- F285: IAppealService → DATABASE FABRIC (PG — appeal case + status)
- F286: IContentScoringService → AI ENGINE FABRIC (multi-model score ensemble via AF-5)
- F287: IEnforcementNotifyService → QUEUE FABRIC (notify reporter + reported user)

**New Task Types (T102–T106):**
- T102: SAFETY_CLASSIFY_BRANCH — ARCHETYPE: BRANCH_GATE — high-confidence → auto; borderline → human
- T103: AUTO_ENFORCEMENT — ARCHETYPE: SEQUENTIAL_WRITE — hide/downrank/remove + counter update
- T104: HUMAN_REVIEW_ENQUEUE — ARCHETYPE: HUMAN_IN_LOOP — assigns case, SLA timer starts (EP-2)
- T105: AUDIT_LOG_APPEND — ARCHETYPE: FIRE_AND_FORGET — append to immutable audit log (DNA-1 doc)
- T106: APPEAL_LIFECYCLE — ARCHETYPE: LIFECYCLE — appeal intake → review → decision → notify

**First-time capabilities:**
- First HUMAN_IN_LOOP archetype (moderation review queue)
- First HUMAN_IN_LOOP SLA timer via EP-2 (escalation if not reviewed in N hours)
- First truly immutable audit log target (DNA-1: Dictionary → ES append-only)
- AI safety ensemble (F286 → AF-5 multi-model, most sensitive content decisions use consensus)

**BFA rules:** CF-95 through CF-102
**Stress tests:** ST-48 through ST-51
**Design records:** DR-29 (human-in-the-loop SLA), DR-30 (safety ensemble consensus)
**Skills:** SK-39 (Safety Classify Branch), SK-40 (Human Review Queue + SLA Escalation)

---

### PHASE 7 — DNA-9 Retrofit Validation + Cross-Flow BFA
**Duration estimate:** 30–40 min  
**Save point:** MERGE:VALIDATION

**What:** Confirm DNA-9 (multi-tenant isolation) is correctly referenced in ALL new factories
F244–F287. Run cross-flow BFA conflict checks: do any new entities/events conflict with
FLOW-01 through FLOW-07? Generate comprehensive validation report.

**Produces:**
- DNA-9 compliance table: 44 factories × 9 DNA patterns = 396 checks
- Cross-flow BFA matrix: FLOW-08–13 vs FLOW-01–07
- FLOW-08_13_VALIDATION.md (pass/fail per check)
- SESSION_STATE_FLOW08_13_FINAL.md

---

### PHASE 8 — Document Merge into Unified Files
**Duration estimate:** 45–60 min (can be split into 8a–8d)  
**Save point:** MERGE:FINAL

**What:** Append all phase outputs into the 5 unified merged docs.

Sub-phases:
- 8a: ENGINE_ARCHITECTURE_MERGED ← F244–F287 + DNA-9 + DR-21–DR-30 + EP-4
- 8b: TASK_TYPES_CATALOG_MERGED ← T83–T106 + AF Maps + Templates 18–23
- 8c: V62_BFA_STRESS_TEST_MERGED ← CF-64–CF-102 + ST-31–ST-51 + BFA registration
- 8d: UNIFIED_SOURCE_INDEX + SKILLS_FACTORY_RAG ← DD-21+ + SK-29–SK-40

---

## ═══════════════════════════════════════
## PART 3 — REQUIREMENTS VALIDATION
## ═══════════════════════════════════════

### Does the plan cover ALL requirements from the basic prompt and 11-* documents?

| Requirement | Covered By | Status |
|-------------|-----------|--------|
| NEW FACTORY INTERFACES (each resolves through an existing FABRIC) | F244–F287, each with explicit fabricHint | ✅ |
| NEW ENGINE CONTRACTS (full format — not stubs) | T83–T106 full format with IR + QG | ✅ |
| AF STATION MAPPING for each new flow | Each phase includes 11×N AF station cells | ✅ |
| BFA CROSS-FLOW VALIDATION | CF-64–CF-102 + cross-flow matrix in Phase 7 | ✅ |
| FLOW TEMPLATE (DAG the engine generates) | Template 18–23 (one per FLOW) | ✅ |
| GENIE DNA COMPLIANCE (all 6 + DNA-9 new) | DNA-9 cross-cut + Phase 7 validation | ✅ |
| No standalone implementations (engine on fabrics) | All factories reference fabric via CreateAsync | ✅ |
| No specific provider imports | fabricHint only — never hard import | ✅ |
| No typed models (Dictionary via ParseDocument) | DNA-1 enforced, SK patterns show Dictionary | ✅ |
| Backward compatibility (F1–F243, T1–T82 unchanged) | Additive only, no existing numbers touched | ✅ |
| 11-* Flow 3: Post + Media Publish | FLOW-08 (Phase 1) | ✅ |
| 11-* Flow 4: Home Feed | FLOW-09 (Phase 2) | ✅ |
| 11-* Flow 5: React/Comment | FLOW-10 (Phase 3) | ✅ |
| 11-* Flow 6: Messaging | FLOW-11 (Phase 4) | ✅ |
| 11-* Flow 7: Search | FLOW-12 (Phase 5) | ✅ |
| 11-* Flow 8: Moderation | FLOW-13 (Phase 6) | ✅ |
| Multi-tenant isolation (deep_research_engine_multi_tenant.md) | DNA-9 + EP-4 (Phase 0) | ✅ |
| UI: Fabric-first, zero platform-specific values | All UI config through FREEDOM layer | ✅ |
| Event-driven (no direct HTTP between services) | All inter-service = queue events | ✅ |
| Async wait states (MediaReady, human review) | T83 WAIT_STATE, T104 HUMAN_IN_LOOP | ✅ |
| Trust gating for messaging | T95 BRANCH_GATE | ✅ |
| Permissions filtering (search + feed) | T88, T100 SEQUENTIAL_FILTER | ✅ |

**All 22 requirements: ✅ COVERED**

### What is NOT covered (deferred by design)
| Item | Reason for deferral | Future flow |
|------|---------------------|-------------|
| FLOW-01 equivalent: Onboarding | Already partly covered by FLOW-07 (connect/suggest) | FLOW-14 if needed |
| Real-time WebSocket protocol details | Infrastructure concern — queue boundary is the fabric | Infra task |
| CDN provider-specific config | FREEDOM layer config — not engine contracts | Admin config |
| Per-tenant billing/metering | EP-4 covers tenant routing; metering is a separate flow | FLOW-14 |
| ActivityPub federation | Optional extension — no current spec | Future |

---

## ═══════════════════════════════════════
## PART 4 — POSITIVE AND NEGATIVE EXAMPLES
## ═══════════════════════════════════════

### POSITIVE EXAMPLE — Correct Factory Definition (F252: ICandidateGenerationService)

```
FACTORY INTERFACE: F252 — ICandidateGenerationService
FAMILY: 28 (Home Feed Pipeline)
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Neo4j provider (graph traversal)
                    DATABASE FABRIC (Skill 05) → Elasticsearch provider (interest index)
RESOLUTION: CreateAsync(FactoryResolutionContext) → Task<ICandidateGenerationService>
DNA-9: tenantId propagated in FactoryResolutionContext → isolation binding resolved before query
METHODS:
  GenerateCandidatesAsync(viewerId, limit, cursor) → DataProcessResult<List<Dictionary<string,object>>>
  GetGraphEdgeCandidatesAsync(viewerId, edgeTypes) → DataProcessResult<List<Dictionary<string,object>>>
  GetInterestCandidatesAsync(viewerId, topicIds) → DataProcessResult<List<Dictionary<string,object>>>
MACHINE: Edge traversal depth (max 2 hops), candidate limit ceiling (1000)
FREEDOM: topicIds per tenant, edge weight thresholds, candidate count target (admin-configurable)
IRON RULE: NEVER import Neo4j driver directly. NEVER merge candidates from different tenants.
```

**Why this is correct:**
- Explicit fabric resolution (Neo4j + ES, both through DATABASE FABRIC Skill 05)
- CreateAsync — never `new CandidateGenerationService()`
- DNA-1: `Dictionary<string,object>` return type, never a typed `CandidatePost` model
- DNA-5 + DNA-9: tenantId in context, isolation binding resolved first
- MACHINE/FREEDOM split is explicit

---

### NEGATIVE EXAMPLE — Wrong Factory Definition (the kind the engine must REJECT)

```
// ❌ WRONG — Multiple violations
public class HomeFeedException {
    private readonly Neo4jClient _neo4j; // ❌ Direct driver import — violates FABRIC
    private readonly OpenAIClient _ai;   // ❌ Direct AI import — use IAiProvider

    public async Task<List<CandidatePost>> GetCandidates(string viewerId) {
        // ❌ Typed model — must be Dictionary<string,object>
        // ❌ No tenantId — violates DNA-5 + DNA-9
        // ❌ BuildSearchFilter not used — violates DNA-2
        var results = await _neo4j.Query("MATCH (u:User {id:$id})-[:FRIEND]-(c)"); // ❌
        return results.Select(r => new CandidatePost(r)).ToList(); // ❌
    }
}
```

**Why this fails validation (AF-7 Compliance would REJECT at BUILD TIME):**
- `Neo4jClient` imported directly → must be `IDatabaseService` via `IExternalServiceFactory<IDatabaseService>`
- `OpenAIClient` imported directly → must be `IAiProvider` via `IAiProviderFactory`
- Return type `List<CandidatePost>` → must be `DataProcessResult<List<Dictionary<string,object>>>`
- No `tenantId` parameter → violates DNA-5 (scope isolation) and DNA-9 (tenant routing)
- No `BuildSearchFilter` → violates DNA-2 (empty fields not skipped)

---

### POSITIVE EXAMPLE — Correct Task Type Contract (T87: CANDIDATE_GENERATION)

```
TASK TYPE: T87 — Candidate Generation Fork
ARCHETYPE: PARALLEL_FANOUT
ENTRY: HTTP trigger from Feed API (viewer_id, cursor, limit in context envelope)
PURPOSE: Pull candidate posts from 3 parallel sources: graph friends, interest topics, group memberships
DISTINCT FROM: T79 (Four-Way Weight Fork — that's for scoring; this is source aggregation with different allSettled policy)
FACTORY DEPENDENCIES: F252 (ICandidateGenerationService), F259 (IAudienceRuleService)
FABRIC RESOLUTION:
  F252 → DATABASE FABRIC (Skill 05) → Neo4j provider (graph traversal) + ES provider (interests)
  F259 → DATABASE FABRIC (Skill 05) → PostgreSQL provider (audience rules per tenant)
AF CONFIGURATION:
  AF-1 (Genesis): Generates 3 parallel goroutines/tasks with allSettled, result merge with dedup
  AF-4 (RAG): Retrieves SK-31 (Candidate Generation from Graph) pattern
  AF-7 (Compliance): Validates DNA-9 tenant isolation in all 3 parallel branches
  AF-9 (Judge): Validates candidate count is within MACHINE ceiling (1000), dedup ratio < 40%
BFA VALIDATION:
  Check: Does candidate set include posts from blocked users? (CF-70)
  Check: Does tenant boundary hold across all 3 sources? (CF-71)
MACHINE: Max candidate limit = 1000, fanout = 3 parallel branches, dedup = hash-based
FREEDOM: Per-tenant source weights (graph 40%/interests 35%/groups 25% default), configurable per tenant admin
IRON RULES:
  IR-83: ALL three branches must use separate CreateAsync calls per source (never one service for all)
  IR-84: NEVER merge candidates across tenant boundaries (DNA-9)
  IR-85: ALWAYS apply audience rules (F259) before returning candidates — never return raw graph results
  IR-86: allSettled semantics required — partial result preferred over full failure
QUALITY GATES:
  QG-83: Candidate count ≥ min_feed_size (configurable, default 20)
  QG-84: Dedup ratio ≤ 40% of raw candidates
  QG-85: No blocked/muted user content in output
  QG-86: latency p95 ≤ 150ms (candidate gen is on feed critical path)
```

---

### NEGATIVE EXAMPLE — Wrong Task Type Definition (stub format, REJECTED by engine)

```
// ❌ WRONG — One-line stub, engine cannot generate from this
T87: Candidate Generation
  - Uses Neo4j and Elasticsearch
  - Returns list of posts
  - Parallel
```

**Why this fails:** No ARCHETYPE, no FABRIC RESOLUTION mapping, no AF CONFIGURATION, no
IRON RULES, no QUALITY GATES. AF-1 (Genesis) has nothing to generate from. AF-9 (Judge) has
no criteria to validate against. BFA has no entities to register conflicts for.

---

## ═══════════════════════════════════════
## PART 5 — SYSTEM TOTALS AFTER COMPLETION
## ═══════════════════════════════════════

```
PROJECTED SYSTEM STATE (Post FLOW-08 through FLOW-13):

Factory interfaces: F1-F287  (44 new: F244-F287)
Factory families:   27-32     (6 new families)
Task types:         T1-T106   (24 new: T83-T106)
Flow templates:     Template 1-23  (6 new: 18-23)
BFA conflict rules: CF-1-CF-102   (39 new: CF-64-CF-102)
Stress tests:       ST-1-ST-51    (21 new: ST-31-ST-51)
Design records:     DR-1-DR-30    (10 new: DR-21-DR-30)
Design decisions:   DD-1-DD-21+   (varies per phase)
Skill patterns:     SK-1-SK-40    (12 new: SK-29-SK-40)
DNA patterns:       DNA-1 through DNA-9 (+1 new: DNA-9)
Engine primitives:  EP-1-EP-4    (+1 new: EP-4 Tenant Routing)

New archetypes introduced:
  WAIT_STATE         (T83 — MediaReady event wait)
  MULTI_MODEL_CONSENSUS (T89 — ML ranking ensemble)
  CACHE_ASIDE        (T91 — Feed cache)
  IDEMPOTENT_WRITE   (T92 — High-QPS reactions)
  BRANCH_GATE        (T95, T102 — trust/safety routing)
  FIRE_AND_FORGET    (T98, T105 — real-time push + audit)
  NLP_TRANSFORM      (T99 — query expansion)
  HUMAN_IN_LOOP      (T104 — moderation review)
```

---

## ═══════════════════════════════════════
## PART 6 — RECOVERY COMMANDS
## ═══════════════════════════════════════

```
"Start Phase 0"       → Generate DNA-9 + EP-4 (prerequisite)
"Start Phase 1"       → Generate FLOW-08 factories + task types
"Start Phase 2"       → Generate FLOW-09 factories + task types
"Start Phase 3"       → Generate FLOW-10 factories + task types
"Start Phase 4"       → Generate FLOW-11 factories + task types
"Start Phase 5"       → Generate FLOW-12 factories + task types
"Start Phase 6"       → Generate FLOW-13 factories + task types
"Start Phase 7"       → Cross-flow BFA validation + DNA-9 compliance check
"Start Phase 8a"      → Merge into ENGINE_ARCHITECTURE_MERGED
"Start Phase 8b"      → Merge into TASK_TYPES_CATALOG_MERGED
"Start Phase 8c"      → Merge into V62_BFA_STRESS_TEST_MERGED
"Start Phase 8d"      → Merge into UNIFIED_SOURCE_INDEX + SKILLS_FACTORY_RAG
"Show plan"           → This file
"Show system state"   → Session state file
"Validate coverage"   → Part 3 of this document
```

---

## ═══════════════════════════════════════
## SAVE POINT: PLAN:MASTER ✅
## Next Command: "Start Phase 0" → DNA-9 + EP-4
## ═══════════════════════════════════════
