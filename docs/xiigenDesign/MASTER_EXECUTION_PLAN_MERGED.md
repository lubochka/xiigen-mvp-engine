# XIIGen — MASTER EXECUTION PLAN
## Consolidated: All 32 Flows Merged
## Date: 2026-03-01 | Status: AUTHORITATIVE POST-FLOW-31 REFERENCE
## Scope: P0–P7 phases per flow, 31 flows

---

> ### ⚠️ IMPLEMENTATION UPDATE (2026-04-14)
>
> This document was written during the Python/FastAPI design phase (31 flows).
> The live codebase now runs **Node.js 22 + NestJS 11 + TypeScript 5** with **45 flow directories**.
>
> **Key differences:**
> - Flows FLOW-01..24 are fully implemented as domain flows
> - Flows FLOW-25..40 + FLOW-45 are infrastructure/meta flows (BFA governance, meta-flow engine, etc.)
> - FLOW-41..44 are EXTERNAL_REPO platform adapters (Canva/Miro/Webflow/Framer)
> - Execution phases described here (P0–P7) map to the actual implementation phases:
>   Phase 0 (corpus seed) → Phase 1A-1D (services) → Phase 2A-2B (integration) → Phase 3 (topology/BFA) → Phase 4 (client) → Phase 5 (TEACH-QA)
> - Per-flow session documents live in `docs/sessions/FLOW-XX/`
> - Implementation plans: `docs/sessions/FLOW-XX/FLOW-XX-IMPLEMENTATION-PLAN-v2.md`
> - TEACH-QA specs: `docs/sessions/FLOW-XX/FLOW-XX-TEACH-QA-R0-v2.md`
>
> **Artifact boundaries now:** F1601 / T650 / CF-809 / SK-529

---

# ═══ CONSOLIDATED MASTER INDEX (Updated 2026-04-14) ═══

## System State

| Artifact | Design (Post-31) | Actual (2026-04-14) |
|----------|-------------------|---------------------|
| Factories | 1,338 (F1–F1338) | 1,600+ (F1–F1592) |
| Task Types | 515 (T1–T515) | 398 unique (T1–T649 + T367–T374) |
| BFA Rules | 714 (CF-1–CF-714) | 94+ unique (CF-1–CF-809) |
| Skills | 329 (SK-1–SK-329) | 138 files (SK-1–SK-527) |
| Flows | 31 (FLOW-01–FLOW-31) | 45 directories |

## Next Available Numbers

```
Factory:          F1601    Family: 209
Task Type:        T650
BFA Rule:         CF-809
Skill:            SK-529
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
| FLOW-41..44 | Platform Adapters | — | — | EXTERNAL_REPO |
| FLOW-45 | History Bootstrap | F1576-F1592 | T601-T604 | — |

## Execution Plan Summary

| Flow | Phases | Key Deliverables |
|------|--------|-----------------|
| FLOW-01–07 | P0–P7 each | Registration, Content, Events, Notifications, Gamification, Marketplace, Social |
| FLOW-08 | P0–P8 | Multi-tenant payment processing, provider adapters, tenant-aware ops |
| FLOW-09–10 | P0–P7 each | Participation, Social platform (post/feed/chat/search) |
| FLOW-11–12 | P0–P6 each | Moderation, Chat & messaging |
| FLOW-13–14 | P0–P7 each | Data warehouse, ETL pipeline |
| FLOW-15 | P0–P9 | MVP builder (largest: 14 families) |
| FLOW-16–17 | P0–P6 each | E-commerce, Freelancer marketplace |
| FLOW-18 | P0–P8 | Visual flow creation, code injection, 10 families |
| FLOW-19 | P0–P6 | CI/CD & DevOps control plane |
| FLOW-20 | P0–P8 | Sponsored content, Graph API, ads platform |
| FLOW-21 | P0–P7 | Forms & flow automation builder |
| FLOW-22–23 | P0–P6 each | Visual editor & site builder |
| FLOW-24 | P0–P6 | AI tutor & learning calendar |
| FLOW-25 | P0–P6 | BFA cross-flow governance |
| FLOW-26 | P0–P6 | Self-developing meta-flow engine |
| FLOW-27 | P0–P6 | Human interaction gate + scheduling (EP-6) |
| FLOW-28 | P0–P6 | Blog/CMS modules platform |
| FLOW-29 | P0–P6 | Adaptive RAG deep research engine |
| FLOW-30 | P0–P6 | PromptOps — self-learning prompt engineering |
| FLOW-31 | P0–P7 | Design intelligence: Figma→GraphRAG→module mapping→gap completion |
| FLOW-32 | Implemented | Sharable flows marketplace — 20 services (NestJS) |
| FLOW-33 | Implemented | Generation loop — 10 services (NestJS) |
| FLOW-35 | Implemented | Meta-arbitration — 8 services (NestJS) |
| FLOW-36 | Implemented | Feature registry — 7 services (NestJS) |
| FLOW-37 | Implemented | Engine self-awareness — 5 services (NestJS) |
| FLOW-38 | Implemented | RAG quality feedback — 5 services (NestJS) |
| FLOW-39 | Implemented | OSS curriculum — 4 services (NestJS) |
| FLOW-40 | Implemented | Client push SSE — 3 services (NestJS) |
| FLOW-41..44 | EXTERNAL_REPO | Platform adapters (Canva/Miro/Webflow/Framer) |
| FLOW-45 | Implemented | History bootstrap — 5 services (NestJS) |

## Flow Section Navigation

| Flow | Line | Section |
|------|------|---------|
| FLOW-01 | ~3888 | User Registration & Onboarding |
| FLOW-08 | ~1 | Multi-Tenant Payment Processing |
| FLOW-09 | ~612 | Transactional Event Participation |
| FLOW-10 | ~671 | Social Platform (Post/Feed/Chat/Search) |
| FLOW-11 | ~759 | Content Moderation & Social Graph |
| FLOW-12 | ~882 | Chat & Messaging Platform |
| FLOW-13 | ~1072 | Data Warehouse & Analytics |
| FLOW-14 | ~1435 | Data Pipeline & ETL |
| FLOW-15 | ~1494 | MVP Builder & App Platform |
| FLOW-16 | ~1985 | Giant Shop (E-Commerce Platforms) |
| FLOW-17 | ~2066 | Freelancer Marketplace |
| FLOW-18 | ~2537 | Visual Flow Creation & Code Injection |
| FLOW-19 | ~2786 | CI/CD & DevOps Control Plane |
| FLOW-20 | ~3155 | Sponsored Content + Graph API + Ads |
| FLOW-21 | ~3380 | Forms & Flow Automation Builder |
| FLOW-22 | ~3886 | Visual Editor & Site Builder |
| FLOW-23 | ~4315 | Visual Editor Extended (Canvas/Layout) |
| FLOW-24 | ~4582 | Learning Calendar (AI Tutor) |
| FLOW-25 | ~4809 | BFA Cross-Flow Governance & Impact |
| FLOW-26 | ~5295 | Self-Developing Meta-Flow Engine |
| FLOW-27 | ~5767 | Human Interaction Gate + Scheduling |
| FLOW-28 | ~6317 | Blog/CMS Modules Platform |
| FLOW-29 | ~6947 | Adaptive RAG Deep Research Engine |
| FLOW-30 | ~7229 | PromptOps — Self-Learning Prompts |

# ═══ END CONSOLIDATED MASTER INDEX ═══

---


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 0 — NO-CODE EXPLANATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Big Picture (Plain English)

XIIGen is a **factory that builds other factories**. It already knows how to generate 7
types of business flows (registration, onboarding, events, posts, marketplace, gamification,
friend networks) across 26 factory families, 243 factory interfaces, and 82 task types.

**FLOW-08 teaches the engine something fundamentally different: how to serve MANY customers
at once, where each customer can have completely different identity, payment, compliance,
and data isolation requirements.**

### Before FLOW-08
The engine is a single workshop producing one customer's products. Every flow assumes
"there's one customer" — one database, one auth system, one set of rules.

### After FLOW-08
The engine becomes an **industrial park** — multiple workshops, each with their own security
system, loading dock, and compliance certifications, but sharing the same power grid and
road network (the FABRIC INTERFACES). Customer A (enterprise, OIDC login, Stripe payments,
GDPR+PCI compliance) runs safely next door to Customer B (free tier, local auth, no
payments, no compliance labels).

### The Three Layers (What The Engine Learns)

**Layer A — Tenant Control Plane (Family 27: F244-F251)**
"Who are the tenants and what are they allowed to do?"
Tenant CRUD, config validation, isolation binding, context propagation,
onboarding lifecycle, graduation, audit, and entitlements.

**Layer B — Pluggable Provider Adapters (Family 28: F252-F259)**
"Which external systems does each tenant use?"
Identity adapters, auth policies, payment providers, webhook verification,
ledger, encryption — all resolved at runtime through FABRIC interfaces.

**Layer C — Tenant-Aware Operations (Family 29: F260-F271)**
"How do we operate the engine per-tenant?"
Idempotency, rate limiting, metrics, billing, backup, canary deployment,
compliance gates, data export, tenant-scoped flow execution, webhooks,
notification routing, config promotion.

### What We ARE Doing
- ✅ F244-F271: **28 new factory interface contracts** (Families 27-29)
- ✅ T83-T92: **10 full engine contracts** (ARCHETYPE, Iron Rules, Quality Gates)
- ✅ **110 cells**: AF Station Map (11 stations × 10 task types)
- ✅ **Template 18**: multi-tenant-engine-v1 JSON DAG
- ✅ CF-64-CF-79: **16 BFA conflict rules** preventing cross-flow collisions
- ✅ ST-31-ST-38: **8 stress tests** covering isolation failures and race conditions
- ✅ DR-21-DR-26: **6 design records** + SK-29-SK-36: **8 skill patterns**
- ✅ DD-21-DD-30: **10 design decisions** locked into the index
- ✅ **224/224** DNA compliance checkpoints (8 DNA patterns × 28 factories)
- ✅ Backward compatibility: **0 breaks**

### What We Are NOT Doing
- ❌ Not writing tenant management services directly (engine generates them on top of FABRIC)
- ❌ Not creating typed Python dataclasses (Tenant, TenantConfig, ProviderBinding) — use dict[str, Any]
- ❌ Not making HTTP calls between services (all events through QUEUE FABRIC)
- ❌ Not importing Stripe SDK, OIDC libraries, or PostgreSQL drivers
- ❌ Not breaking anything: F1-F243, T1-T82, CF-1-CF-63 stay untouched
- ❌ Not adding new DNA patterns or Engine Primitives (reuse existing)
- ❌ Not hand-coding UI (engine generates it on fabric interfaces)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — PLAN VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Validation A: basic_prompt.txt — 12 Required Deliverables

| # | Requirement | Covered | Where | Phase |
|---|-------------|---------|-------|-------|
| R1 | New FACTORY INTERFACES through FABRICS | ✅ | F244-F271 (28), each with Fabric Resolution Table | P1a/P1b/P1c |
| R2 | New ENGINE CONTRACTS (full format) | ✅ | T83-T92 (10), 12+ sections each | P2a/P2b |
| R3 | AF STATION MAPPING | ✅ | 11×10 = 110 cells | P2b |
| R4 | BFA CROSS-FLOW VALIDATION | ✅ | CF-64-CF-79, entities+events+APIs | P3a/P3b |
| R5 | FLOW TEMPLATE (JSON DAG) | ✅ | Template 18 multi-tenant-engine-v1 | P2b |
| R6 | GENIE DNA COMPLIANCE | ✅ | 224/224 (8 DNA × 28 factories) | P1a/P1b/P1c |
| R7 | Factory resolves through FABRIC | ✅ | Every factory has Fabric Resolution Table | P1a/P1b/P1c |
| R8 | CreateAsync() with config-first routing | ✅ | Code blocks for all 28 | P1a/P1b/P1c |
| R9 | MicroserviceBase inheritance | ✅ | All 28 confirm DNA-4 | P1a/P1b/P1c |
| R10 | DataProcessResult[T] on all methods | ✅ | All methods return DataProcessResult[T] | P1a/P1b/P1c |
| R11 | dict[str, Any] (no typed models) | ✅ | All 28 confirm DNA-1 | P1a/P1b/P1c |
| R12 | Backward compatibility | ✅ | Numbering continuity + validation | P5 |

## Validation B: basic_prompt.txt — 7 Anti-Requirements

| # | MUST NOT | Verification | Status |
|---|----------|-------------|--------|
| N1 | Describe services as standalone implementations | All 28 are engine contracts on FABRICS | ✅ |
| N2 | Skip fabric resolution mapping | All 28 have Fabric Resolution Tables | ✅ |
| N3 | One-line task type stubs | T83-T92 have 12+ sections (8 IR + 6 QG each) | ✅ |
| N4 | Forget AF station mapping | 11×10 = 110 cells, all populated | ✅ |
| N5 | Import specific providers | No stripe/oidc/pg/neo4j — always through fabric | ✅ |
| N6 | Create typed models | DNA-1 confirmed 28/28 (TenantConfig = Dictionary!) | ✅ |
| N7 | Break backward compatibility | F1-F243, T1-T82, CF-1-CF-63 unchanged | ✅ |

## Validation C: 28-Report Coverage (20 Findings)

| # | Finding | Addressed | Where |
|---|---------|-----------|-------|
| 1 | Control plane / data plane separation | ✅ | Family 27 (control) vs 29 (operations) |
| 2 | Hybrid bridge isolation strategy | ✅ | D1, F246, T83 |
| 3 | Typed tenant configuration | ✅ | D2, F245 JSON Schema validation |
| 4 | OIDC/SCIM pluggable identity | ✅ | F252, F253, T85 |
| 5 | RBAC/ABAC authorization model | ✅ | F254, T86 |
| 6 | Gateway + mesh enforcement topology | ✅ | F255, T86 |
| 7 | Payment provider abstraction | ✅ | F256, F257, F258, T87 |
| 8 | PCI scope minimization / tokenization | ✅ | D6, F266, CF-75 |
| 9 | GDPR data minimization / deletion | ✅ | F267, T92 |
| 10 | W3C trace-context propagation | ✅ | D3, F247, DNA-7 |
| 11 | CloudEvents envelope for events | ✅ | D3, F247 |
| 12 | Saga + transactional outbox | ✅ | D5, F260, DNA-8 |
| 13 | Idempotency keys (IETF draft) | ✅ | F260, T90 |
| 14 | Tenant onboarding state machine | ✅ | D7, F248, T89, EP-1 |
| 15 | Pool→silo graduation | ✅ | F249, T90 |
| 16 | Per-tenant metrics + SLO tracking | ✅ | F262, SK-34 |
| 17 | Per-tenant rate limiting (HTTP 429) | ✅ | F261, ST-36 |
| 18 | Canary deployment by tenant cohort | ✅ | F265, SK-36 |
| 19 | Dependent flow version pinning | ✅ | F268 tenant-scoped flow runner |
| 20 | Webhook signature verification | ✅ | F257, F269 webhook registry |

**RESULT: 12/12 deliverables ✅ | 7/7 anti-requirements ✅ | 20/20 findings ✅**

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — POSITIVE & NEGATIVE EXAMPLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Example 1: Factory Specification

### ✅ POSITIVE (correct — fabric-first, DNA-compliant)
```
FACTORY: F246
NAME: ITenantIsolationBindingService
FAMILY: 27 — Tenant Control Plane
FABRIC RESOLUTION:
  PRIMARY   → DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → PostgreSQL provider
              Table: tenant_bindings_{region} (ACID binding records)
  SECONDARY → DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → Redis provider
              Key: binding:cache:{tenantId} HASH (resolved binding cache)
  TERTIARY  → QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams
              Stream: tenant.binding.events (binding change notifications)
INTERFACE METHODS:
  ResolveBindingAsync(tenantId) → DataProcessResult[dict[str, Any]]
  SetBindingAsync(tenantId, bindingConfig) → DataProcessResult[dict[str, Any]]
DNA COMPLIANCE: 8/8 ✅
MACHINE: Binding resolution at EVERY request boundary
FREEDOM: Cache TTL (1min-1hr), default isolation per tier
```

### ❌ NEGATIVE (violates everything)
```
## F246 — TenantIsolationService          ← no "I" prefix
  opt.UseNpgsql("Host=pg;Database=tenants")  ← direct Npgsql import
  class TenantBinding: { ... }          ← typed model (DNA-1 violation)
  async def resolve(self) -> TenantBinding  ← typed return (DNA-3 violation)
  No Fabric Resolution Table                  ← required by basic_prompt
  No DNA compliance block                     ← 8/8 checkpoints required
```

## Example 2: Engine Contract (Task Type)

### ✅ POSITIVE (full format)
```
TASK TYPE: T89 — Tenant Onboarding Orchestration
ARCHETYPE: ORCHESTRATION
ENTRY: TenantCreated event → OnboardingStarted emission
PURPOSE: Orchestrate 8-state tenant lifecycle from creation to activation
DISTINCT FROM: T40 (3-way parallel join; T89 is sequential with gates)
FACTORY DEPENDENCIES: F248, F244, F245, F246, F252, F254, F256, F266
FABRIC RESOLUTION: (each factory → specific fabric)
AF CONFIGURATION: (all 11 stations populated)
MACHINE: State transitions are non-negotiable
FREEDOM: Timeout per gate, skip gates for free tier
IRON RULES: IR-89-1 through IR-89-8
QUALITY GATES: QG-89-1 through QG-89-6
```

### ❌ NEGATIVE (one-liner stub)
```
T89: Orchestrate tenant onboarding with multiple steps.
← WRONG: no ARCHETYPE, FABRIC RESOLUTION, IR, QG
```

## Example 3: BFA Conflict Rule

### ✅ POSITIVE
```
CF-64 — Tenant Isolation Binding (F246) ≠ DNA-5 Scope Isolation (core)
PROOF: F246 is routing-level (WHICH database), DNA-5 is query-level (tenantId filter)
  Layers are complementary: F246 routes → then DNA-5 filters within route
RESULT: ✅ COMPLEMENTARY (not conflicting)
```

### ❌ NEGATIVE
```
CF-64: Isolation binding and scope isolation both use tenantId. They're different.
← WRONG: no proof layers, no runtime enforcement analysis
```

## Example 4: Stress Test

### ✅ POSITIVE
```
ST-31: Cross-Tenant Data Leak — Shared Schema Missing Filter
SCENARIO: Tenant A's flow step with corrupted context (tenantId=null)
DEFENSE LAYERS: 5 layers (context propagator, binding resolution, DNA-5, PG RLS, BFA)
RESULT: ✅ PASS (5 layers of defense)
```

### ❌ NEGATIVE
```
ST-31: Test cross-tenant isolation. Expected: Should not leak data.
← WRONG: no scenario, attack vector, defense layers
```

## Example 5: UI — Fabric-First

### ✅ POSITIVE
```
Tenant dashboard → reads/writes through F245/F246/F262 via FABRIC
All forms use DynamicController (DNA-6) — no entity-specific controllers
No Stripe.js, Auth0 widget, or provider-specific UI
```

### ❌ NEGATIVE
```
<script src="https:# js.stripe.com/v3/"></script>     ← platform-specific
import { Auth0Provider } from '@auth0/auth0-react'     ← provider-specific
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — DESIGN DECISIONS (D1-D10, Locked)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Decision | Resolution | Source |
|---|----------|-----------|--------|
| D1 | Default Isolation Strategy | Hybrid bridge: shared_schema default, support separate/silo | Both 28-reports |
| D2 | Tenant Config Format | dict[str, Any] in ES, validated via JSON Schema | DNA-1 |
| D3 | Context Propagation | W3C traceparent + OTel baggage + CloudEvents | Both 28-reports |
| D4 | Provider Adapter Pattern | Same as V39/V40 IExternalServiceFactory pattern | AiDispatcher |
| D5 | Payment Safety | DNA-8 outbox + F260 idempotency keys + saga | Both 28-reports |
| D6 | Compliance Labels | F266 label→constraint gates at runtime | 28-report-1 §PCI |
| D7 | Onboarding as Flow | EP-1 state machine + SK-392 (RagStrategyRegistry) FlowOrchestrator | Both 28-reports |
| D8 | Three Families | 28 factories: 8/8/12 across control/providers/operations | 28-report 3-layer |
| D9 | Tenant-Scoped Flow Execution | F268 wraps FlowOrchestrator with tenant binding | NEW (improved) |
| D10 | Config Promotion Pipeline | F271 staged rollout: draft→canary→promoted | 28-report-2 §config |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — RAG MINI-INDEX
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Source Document Map

| # | Document | Key Content | Use During |
|---|----------|-------------|------------|
| 1 | 28-multi_tenant_deep-research-report_1.md | Control/data plane, isolation, OIDC/SCIM, payment, PCI/GDPR | D-decisions, Factory design |
| 2 | 28-multi_tenant_deep-research-report_2.md | Tenant config, CloudEvents, OTel, canary, rate limit, metrics | D-decisions, Factory design |
| 3 | multi-tenant-support.md | Cross-file implications, roadmap, security controls | Validation |
| 4 | ENGINE_ARCHITECTURE_MERGED.md (4426 lines) | F1-F243, Families 1-26, DNA tables, DR-1-DR-20 | P1 merge target |
| 5 | TASK_TYPES_CATALOG_MERGED.md (4490 lines) | T1-T82, AF Maps, Templates 1-17 | P2 merge target |
| 6 | V62_BFA_STRESS_TEST_MERGED.md (2588 lines) | CF-1-CF-63, ST-1-ST-30 | P3 merge target |
| 7 | UNIFIED_SOURCE_INDEX_MERGED.md (967 lines) | DD-1-DD-20, concept maps, event chains | P4 merge target |
| 8 | SKILLS_FACTORY_RAG_MERGED.md (1229 lines) | SK-1-SK-28, Families 1-26 | P4 merge target |
| 9 | SESSION_STATE_MERGE.md (238 lines) | Post FLOW-07 totals, sequence proof | Baseline numbers |
| 10 | FLOW08_P1_FACTORIES.md (2378 lines) | v3 P1 output: 32 factories complete specs | Reuse/adapt (~70%) |

## P1 Factory Remapping Table (v3 → Improved)

| v3 Factory | Improved Factory | Action |
|------------|-----------------|--------|
| F244 ITenantRegistryService | F244 ITenantRegistryService | KEEP |
| F245 ITenantConfigService | F245 ITenantConfigService | KEEP |
| F246 IProviderRegistryService | → MERGED into F245 | MERGE |
| F247 ITenantAuditService | F250 ITenantAuditService | RENUMBER |
| F248-F250 (3 identity factories) | F252 IIdentityProviderAdapterService | MERGE 3→1 |
| F251 IAuthorizationPolicyService | F254 IAuthorizationPolicyService | RENUMBER |
| F252+F253 (gateway+mesh) | F255 IAccessEnforcementTopologyService | MERGE 2→1 |
| F254 IPaymentPspAdapter | F256 IPaymentProviderAdapterService | RENUMBER |
| F255 IPaymentIdempotencyStore | F260 IIdempotencyKeyService | RENUMBER (cross-cutting) |
| F256 IPaymentWebhookIngestion | F257 IPaymentWebhookService | RENUMBER |
| F257 IPaymentLedgerService | F258 IPaymentLedgerService | RENUMBER |
| F258-F261 (4 isolation factories) | F246 ITenantIsolationBindingService | MERGE 4→1 |
| F262+F263 (CloudEvents+OTel) | F247 ITenantContextPropagatorService | MERGE 2→1 |
| F264 IGdprRetentionService | F267 ITenantDataExportService | RENUMBER |
| F265 ICmkKeyManagementService | F259 IEncryptionKeyManagementService | RENUMBER |
| F266 IComplianceLabelGateService | F266 IComplianceLabelEnforcementService | KEEP NUMBER |
| F267 ITenantRateLimiterService | F261 ITenantRateLimitingService | RENUMBER |
| F268 IUsageMeteringService | F263 ITenantBillingMeteringService | RENUMBER |
| F269 ITenantOnboardingService | F248 ITenantOnboardingOrchestratorService | RENUMBER |
| F270 IDependentFlowInvokerService | DROPPED (SK-392 (RagStrategyRegistry) covers) | DROP |
| F271 ISubflowVersionPinService | DROPPED (flow registry covers) | DROP |
| F272 ISagaCompensationService | → DNA-8 + F260 idempotency | ABSORBED |
| F273 IOutboxRelayService | → DNA-8 outbox pattern | ABSORBED |
| F274 ITenantGraduationService | F249 ITenantGraduationService | RENUMBER |
| F275 ITenantSlaPolicyService | F251 ITenantEntitlementService | MERGE |
| — | F253 IAuthenticationPolicyService | NEW |
| — | F262 ITenantMetricsService | NEW |
| — | F264 ITenantBackupRestoreService | NEW |
| — | F265 ITenantCanaryDeploymentService | NEW |
| — | F268 ITenantScopedFlowRunnerService | NEW (D9) |
| — | F269 ITenantWebhookRegistryService | NEW |
| — | F270 ITenantNotificationRouterService | NEW |
| — | F271 ITenantConfigPromotionService | NEW (D10) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 5 — FACTORY & TASK TYPE INVENTORY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 27 — TENANT CONTROL PLANE (F244-F251)

| Factory | Interface | Primary Fabric | Purpose | P1 Source |
|---------|-----------|---------------|---------|-----------|
| F244 | ITenantRegistryService | DATABASE (ES+PG) | Tenant CRUD, tier, lifecycle | P1:F244 (1:1) |
| F245 | ITenantConfigService | DATABASE (ES) | Config validation, versioning | P1:F245+F246 |
| F246 | ITenantIsolationBindingService | DATABASE (PG+Redis) | Isolation routing + RLS | P1:F258-F261 |
| F247 | ITenantContextPropagatorService | QUEUE+CORE | traceparent+baggage+CloudEvents | P1:F262+F263 |
| F248 | ITenantOnboardingOrchestratorService | FLOW ENGINE | 8-state lifecycle | P1:F269 |
| F249 | ITenantGraduationService | DATABASE+QUEUE | Pool→silo migration | P1:F274 |
| F250 | ITenantAuditService | DATABASE (ES) | Config change audit trail | P1:F247 |
| F251 | ITenantEntitlementService | DATABASE (ES+Redis) | Feature flags, quotas | P1:F275 |

## Family 28 — PLUGGABLE PROVIDER ADAPTERS (F252-F259)

| Factory | Interface | Primary Fabric | Purpose | P1 Source |
|---------|-----------|---------------|---------|-----------|
| F252 | IIdentityProviderAdapterService | DATABASE+AI ENGINE | Local/OIDC/SCIM per tenant | P1:F248-F250 |
| F253 | IAuthenticationPolicyService | DATABASE (ES+Redis) | Token validation, MFA | NEW |
| F254 | IAuthorizationPolicyService | DATABASE (ES+PG) | RBAC/ABAC, object-level | P1:F251 |
| F255 | IAccessEnforcementTopologyService | DATABASE (ES) | Gateway/mesh config | P1:F252+F253 |
| F256 | IPaymentProviderAdapterService | QUEUE+DATABASE | PSP strategy | P1:F254 |
| F257 | IPaymentWebhookService | QUEUE (Redis Streams) | Signature verify, dedup | P1:F256 |
| F258 | IPaymentLedgerService | DATABASE (PG) | Tenant accounting | P1:F257 |
| F259 | IEncryptionKeyManagementService | DATABASE (PG+Redis) | KEK/DEK, CMK, rotation | P1:F265 |

## Family 29 — TENANT-AWARE OPERATIONS (F260-F271)

| Factory | Interface | Primary Fabric | Purpose | P1 Source |
|---------|-----------|---------------|---------|-----------|
| F260 | IIdempotencyKeyService | DATABASE (Redis) | Cross-cutting key storage | P1:F255 |
| F261 | ITenantRateLimitingService | DATABASE (Redis) | Per-tenant quotas, 429 | P1:F267 |
| F262 | ITenantMetricsService | DATABASE (ES) | Per-tenant SLO | NEW |
| F263 | ITenantBillingMeteringService | QUEUE+DATABASE | Usage events | P1:F268 partial |
| F264 | ITenantBackupRestoreService | DATABASE (PG+ES) | Per-isolation strategy | NEW |
| F265 | ITenantCanaryDeploymentService | DATABASE+FLOW | Cohort rollout | NEW |
| F266 | IComplianceLabelEnforcementService | DATABASE (ES) | Label→constraint gates | P1:F266 (1:1) |
| F267 | ITenantDataExportService | DATABASE (PG+ES+Redis) | GDPR portability | P1:F264 |
| F268 | ITenantScopedFlowRunnerService | FLOW ENGINE+QUEUE | Tenant-aware execution | NEW (D9) |
| F269 | ITenantWebhookRegistryService | DATABASE+QUEUE | Per-tenant endpoints | NEW |
| F270 | ITenantNotificationRouterService | QUEUE (Redis Streams) | Tenant-scoped events | NEW |
| F271 | ITenantConfigPromotionService | DATABASE (ES) | Staged config rollout | NEW (D10) |

## Task Types (T83-T92)

| Task | Name | Archetype | Key Dependencies | DISTINCT FROM |
|------|------|-----------|-----------------|---------------|
| T83 | Tenant Provisioning Gate | LIFECYCLE | F244, F245, F246, F250 | T47 (user reg) |
| T84 | Tenant Config Validation Gate | VALIDATION | F245, F266, F251 | T53 (single entity) |
| T85 | Identity Provider Binding Gate | INTEGRATION | F252, F253, F248 | NEW archetype |
| T86 | Authorization & Access Setup Gate | CONFIGURATION | F254, F255, F248 | T47 (user roles) |
| T87 | Payment Provider Binding Gate | INTEGRATION | F256, F257, F258, F260 | NEW |
| T88 | Compliance Constraint Activation Gate | VALIDATION | F266, F259, F246 | NEW |
| T89 | Tenant Onboarding Orchestration | ORCHESTRATION | F248, all F244-F271 | T40 (3-way join) |
| T90 | Pool-to-Silo Graduation Gate | MIGRATION | F249, F246, F264, F250 | NEW archetype |
| T91 | Tenant Context Injection Gate | COMPUTATION | F247, F261, F262, F268 | T65 (single-flow) |
| T92 | Tenant Data Lifecycle Gate | LIFECYCLE | F267, F266, F250, F264 | NEW (GDPR) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 6 — PHASED EXECUTION PLAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase 1a: Family 27 (F244-F251) → ENGINE_ARCHITECTURE_MERGED

**Recovery**: "Continue FLOW-08 from Phase 1a"
**Input**: Adapt P1:F244, P1:F245+F246, P1:F258-F261→F246, P1:F262+F263→F247, P1:F269→F248, P1:F274→F249, P1:F247→F250, P1:F275→F251
**Output**: 8 complete factory specs + DR-21/DR-22 + 64/64 DNA
**Save point**: MERGE:P1a

## Phase 1b: Family 28 (F252-F259) → ENGINE_ARCHITECTURE_MERGED

**Recovery**: "Continue FLOW-08 from Phase 1b"
**Input**: Adapt P1:F248-F250→F252, NEW→F253, P1:F251→F254, P1:F252+F253→F255, P1:F254→F256, P1:F256→F257, P1:F257→F258, P1:F265→F259
**Output**: 8 factory specs + DR-23/DR-24 + 64/64 DNA
**Save point**: MERGE:P1b

## Phase 1c: Family 29 (F260-F271) → ENGINE_ARCHITECTURE_MERGED

**Recovery**: "Continue FLOW-08 from Phase 1c"
**Input**: P1 adaptations + 8 NEW factories (F262-F265, F268-F271)
**Output**: 12 factory specs + DR-25/DR-26 + 96/96 DNA + Integration Changelog
**Save point**: MERGE:P1c (All 224/224 DNA complete)

## Phase 2a: T83-T87 → TASK_TYPES_CATALOG_MERGED

**Recovery**: "Continue FLOW-08 from Phase 2a"
**Output**: 5 full engine contracts (8 IR + 6 QG each = 40 IR + 30 QG)
**Save point**: MERGE:P2a

## Phase 2b: T88-T92 + AF Map + Template 18 → TASK_TYPES_CATALOG_MERGED

**Recovery**: "Continue FLOW-08 from Phase 2b"
**Output**: 5 contracts + 110-cell AF map + Template 18 JSON DAG
**Save point**: MERGE:P2b

## Phase 3a: CF-64-CF-71 + ST-31-ST-34 → V62_BFA_STRESS_TEST_MERGED

**Recovery**: "Continue FLOW-08 from Phase 3a"
**Output**: 8 conflict rules with proofs + 4 stress tests with defense layers
**Save point**: MERGE:P3a

## Phase 3b: CF-72-CF-79 + ST-35-ST-38 → V62_BFA_STRESS_TEST_MERGED

**Recovery**: "Continue FLOW-08 from Phase 3b"
**Output**: 8 conflict rules + 4 stress tests + BFA entity/event/API registration
**Save point**: MERGE:P3b

## Phase 4: DD-21-DD-30 + SK-29-SK-36 → INDEX + SKILLS_RAG

**Recovery**: "Continue FLOW-08 from Phase 4"
**Output**: 10 design decisions + 8 skill patterns + concept map + event chain
**Save point**: MERGE:P4

## Phase 5: 105-Point Validation → FLOW08_VALIDATION.md

**Recovery**: "Continue FLOW-08 from Phase 5"
**Output**: Comprehensive validation (105 checks across 12 categories)
**Save point**: MERGE:P5

## Phase 6: Session State → SESSION_STATE_MERGE (final)

**Recovery**: "Continue FLOW-08 from Phase 6"
**Output**: Post-FLOW-08 totals + sequence proof + recovery commands
**Save point**: MERGE:FINAL ✅

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 7 — MACHINE / FREEDOM CLASSIFICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## MACHINE (Non-Negotiable — Engine-Enforced)

| Component | Reason |
|-----------|--------|
| tenantId on every request/event | Security — breach if missing |
| Isolation binding at ingress | Data routing — wrong DB = catastrophic |
| Compliance label → constraint gates | Regulatory — PCI/GDPR violations |
| Onboarding state transitions | State machine — invalid = corruption |
| Payment idempotency key required | Financial — duplicate charges |
| Webhook signature verification | Security — forged webhooks |
| Audit trail on config changes | Compliance — audit gap = risk |
| AuthZ re-evaluation at boundaries | Security — stale tokens |
| RLS defense-in-depth | Data isolation — last defense |
| DNA-1 through DNA-8 on all factories | Architectural integrity |
| Config promotion gate before activation | Safety — untested config |

## FREEDOM (Admin-Configurable at Runtime)

| Component | Default | Range |
|-----------|---------|-------|
| Tenant tier | "free" | free/pro/enterprise |
| Isolation mode | "shared_schema" | shared/separate/silo/hybrid |
| Identity provider | "local" | local/oidc_federation |
| Authorization model | "rbac" | rbac/abac/hybrid |
| Payment provider | "none" | none/stripe/adyen/braintree/invoice |
| Compliance labels | [] | [gdpr,pci,cmk,data_residency_eu] |
| Rate limit quotas | 100/min | 10-10000/min |
| Cache TTLs | 5min | 1min-1hr |
| Canary rollout steps | [5,25,50,100] | configurable |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 8 — PROJECTED POST-FLOW-08 TOTALS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F243 | F1-F271 | +28 |
| Factory families | 26 | 29 | +3 |
| Task type contracts | T1-T82 | T1-T92 | +10 |
| Flow templates | 17 | 18 | +1 |
| BFA conflict rules | CF-1-CF-63 | CF-1-CF-79 | +16 |
| Stress tests | ST-1-ST-30 | ST-1-ST-38 | +8 |
| Design records | DR-1-DR-20 | DR-1-DR-26 | +6 |
| Design decisions | DD-1-DD-20 | DD-1-DD-30 | +10 |
| Skill patterns | SK-1-SK-28 | SK-1-SK-36 | +8 |
| DNA patterns | DNA-1-DNA-8 | DNA-1-DNA-8 | +0 (reuse) |
| DNA compliance | 604/604 | 828/828 | +224 (8×28) |
| Engine primitives | EP-1/2/3 | EP-1/2/3 | +0 (reuse) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 9 — RECOVERY COMMANDS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Navigation
```
"Show FLOW-08 master plan"     → This file
"Show FLOW-08 factories"      → Phase 1 output in ENGINE_ARCHITECTURE_MERGED
"Show FLOW-08 task types"     → Phase 2 output in TASK_TYPES_CATALOG_MERGED
"Show FLOW-08 BFA"            → Phase 3 output in V62_BFA_STRESS_TEST_MERGED
"Show FLOW-08 index"          → Phase 4 output in INDEX + SKILLS_RAG
"Show FLOW-08 validation"     → Phase 5 output (FLOW08_VALIDATION.md)
"Show FLOW-08 session state"  → Phase 6 output (SESSION_STATE_MERGE)
```

## Resume Commands
```
"Continue FLOW-08 from Phase 1a"  → Family 27 (F244-F251)
"Continue FLOW-08 from Phase 1b"  → Family 28 (F252-F259)
"Continue FLOW-08 from Phase 1c"  → Family 29 (F260-F271)
"Continue FLOW-08 from Phase 2a"  → Task types T83-T87
"Continue FLOW-08 from Phase 2b"  → T88-T92 + AF Map + Template 18
"Continue FLOW-08 from Phase 3a"  → CF-64-CF-71 + ST-31-ST-34
"Continue FLOW-08 from Phase 3b"  → CF-72-CF-79 + ST-35-ST-38
"Continue FLOW-08 from Phase 4"   → DD-21-30 + SK-29-36
"Continue FLOW-08 from Phase 5"   → 105-point validation
"Continue FLOW-08 from Phase 6"   → Session state (final)
```

## PLAN:P0 — COMPLETE ✅
## Next: "Approve plan" → Phase 1a (Family 27 factories)

---

# ═══════════════════════════════════════════════════════
# FLOW-08 MULTI-TENANT SUPPORT — EXECUTION PLAN
# ═══════════════════════════════════════════════════════
# Status: COMPLETE ✅ | Validated: 105/105 PASS
# Families: 27-29 | Factories: F244-F271 | Tasks: T83-T92

## Phases Executed

| Phase | Deliverable | Lines | Duration |
|-------|------------|-------|----------|
| 0 | Plan + RAG Index + Positive/Negative Examples | ~800 | Session 1 |
| 1a | Family 27: Tenant Control Plane (F244-F251) | 710 | Session 2 |
| 1b | Family 28: Pluggable Provider Adapters (F252-F259) | 631 | Session 2 |
| 1c | Family 29: Tenant-Aware Operations (F260-F271) | 960 | Session 2 |
| 2a | Task Types T83-T87 (5 engine contracts) | 432 | Session 3 |
| 2b | Task Types T88-T92 + AF Map 11×10 + Template 18 | 594 | Session 3 |
| 3a | BFA CF-64-CF-71 + Stress Tests ST-31-ST-34 | 790 | Session 4 |
| 3b | BFA CF-72-CF-79 + Stress Tests ST-35-ST-38 | 914 | Session 4 |
| 4 | DD-21-DD-30, SK-29-SK-36, Source Index | 476 | Session 5 |
| 5 | Validation Checklist (105/105 PASS) | 296 | Session 5 |
| 6 | Final Delivery + Merged Files | ~200 | Session 6 |

## P1 Source Consolidation

FLOW-08 consolidated P1 source (32 factories) → 28 factories:
- F245+F246 → F245 (config+provider merged)
- F258-F261 → F246 (4 isolation → 1 strategy)
- F248-F250 → F252 (3 identity → 1 strategy)
- F252-F253 → F255 (gateway+mesh → 1 topology)
- F262-F263 → F247 (context+OTel → 1 propagator)
All consolidations justified with Design Records DR-21-DR-26.

## Artifact Counts

| Artifact | Count | Range |
|----------|-------|-------|
| Factories | 28 | F244-F271 |
| Methods | 135 | across 28 factories |
| Families | 3 | 27-29 |
| Task Types | 10 | T83-T92 (10 unique archetypes) |
| Iron Rules | 80 | IR-83 through IR-92 |
| Quality Gates | 60 | QG-83 through QG-92 |
| AF Cells | 110 | 11×10 |
| Flow Template | 1 | Template 18 |
| Design Records | 6 | DR-21-DR-26 |
| BFA Rules | 16 | CF-64-CF-79 (6 CRIT, 8 HIGH, 2 MED) |
| BFA Checks | 64 | 4 per rule |
| Stress Tests | 8 | ST-31-ST-38 |
| Assertions | 66 | across 8 tests |
| Design Decisions | 10 | DD-21-DD-30 |
| Skill Patterns | 8 | SK-29-SK-36 |
| DNA Compliance | 224/224 | 28×8 |
| Domain Events | 15 | unique types |
| API Endpoints | 25 | registered in BFA |
| MACHINE Components | 15 | fixed behaviors |
| FREEDOM Components | 15 | configurable |
| Anti-Patterns | 12 | documented avoidances |
| Validation Checks | 105 | V-001-V-105 (105/105 PASS) |

## FIRST TIME Capabilities
- T91: Live pool→silo migration (no prior flow had isolation mode change)
- T92: Canary cohort rollout (no prior flow had deployment awareness)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-09: EVENT PARTICIPATION & SOCIAL INTEGRATION
# Execution Plan
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-09 Execution Summary

| Phase | Content | Lines | Status |
|-------|---------|-------|--------|
| Phase 1 | F272-F287 (Families 30-31), EP-4, EP-5, DNA-9, DR-27-28 | ~695 | ✅ COMPLETE |
| Phase 2 | T93-T102, 72 IR, 45 QG, 110 AF cells, Template 19 | ~646 | ✅ COMPLETE |
| Phase 3 | CF-80-CF-95 (16 rules), ST-39-ST-46 (8 tests, 76 assertions) | ~732 | ✅ COMPLETE |
| Phase 4 | Merge into 7 output files + session state | — | ✅ COMPLETE |

## FLOW-09 Artifact Counts

| Artifact | Count | Range |
|----------|-------|-------|
| Factories | 16 | F272-F287 |
| Families | 2 | 30-31 |
| Task Types | 10 | T93-T102 |
| Iron Rules | 72 | IR-93-1 through IR-102-6 |
| Quality Gates | 45 | QG-93-1 through QG-102-3 |
| AF Station Cells | 110 | 11 × 10 |
| Flow Template | 1 | Template 19 |
| BFA Conflict Rules | 16 | CF-80 through CF-95 |
| Stress Tests | 8 | ST-39 through ST-46 |
| Stress Assertions | 76 | A-ST39-1 through A-ST46-12 |
| Engine Primitives | 2 | EP-4, EP-5 |
| DNA Patterns | 1 | DNA-9 |
| Design Records | 2 | DR-27, DR-28 |
| Design Decisions | 7 | DD-31 through DD-37 |
| Skill Patterns | 7 | SK-37 through SK-43 |
| Anti-Patterns | 8 | AP-79 through AP-86 |

## FIRST TIME Capabilities

| Capability | Task/Rule | Description |
|-----------|-----------|-------------|
| Webhook dedup with EP-5 | T94 | External PSP webhook idempotency |
| O(n²) bounded fan-out with sampling | T97/CF-92 | Cartesian scoring with backpressure |
| Durable timer weight evolution | T99 | Multi-milestone exponential decay |
| 7-step LIFO saga compensation | T101/CF-91 | Full participation unwind chain |
| Cross-flow feed diversity | T98/CF-84 | Combined caps across FLOW-07+FLOW-09 |
| Weight dimension isolation | CF-93 | Per-flow weight without cross-bleed |
| XP delegation pattern | CF-94 | Single-source gamification ownership |

## Recovery

```
"Show FLOW-09 factories F272-F287"    → ENGINE_ARCHITECTURE_MERGED.md
"Show FLOW-09 tasks T93-T102"         → TASK_TYPES_CATALOG_MERGED.md
"Show FLOW-09 BFA CF-80-CF-95"        → FLOW09_P3_BFA_STRESS_TEST.md
"Show FLOW-09 decisions DD-31-DD-37"  → UNIFIED_SOURCE_INDEX_MERGED.md
"Extend to FLOW-10"                   → Start from F288/T103/CF-96/ST-47
```

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-10 MERGE: EXECUTION PLAN + RECOVERY COMMANDS
# CMS + Commerce + Multi-Tenant Platform Engine
# Merged: 2026-02-26 | Source: FLOW10_MASTER_PLAN + FLOW10_VALIDATION
# ═══════════════════════════════════════════════════════════════════

## FLOW-10 Execution Plan (13 Phases — ALL COMPLETE ✅)

| Phase | Scope | Status | Output File | Save Point |
|-------|-------|--------|-------------|------------|
| P0 | Master Plan + RAG Index + Session State | ✅ COMPLETE | FLOW10_MASTER_PLAN.md, FLOW10_RAG_INDEX.md | FLOW10:MERGE:P0 |
| P1 | Commerce Engine (Fam 32, F288-F296) | ✅ COMPLETE | FLOW10_P1_COMMERCE_ENGINE.md | FLOW10:MERGE:P1 |
| P2 | CMS Engine (Fam 33, F297-F303) | ✅ COMPLETE | FLOW10_P2_CMS_ENGINE.md | FLOW10:MERGE:P2 |
| P3 | Workflow Lifecycle (Fam 34, F304-F308) | ✅ COMPLETE | FLOW10_P3_WORKFLOW_LIFECYCLE.md | FLOW10:MERGE:P3 |
| P4 | Extensibility Platform (Fam 35, F309-F314) | ✅ COMPLETE | FLOW10_P4_EXTENSIBILITY.md | FLOW10:MERGE:P4 |
| P5 | Search & Discovery (Fam 36, F315-F319) | ✅ COMPLETE | FLOW10_P5_SEARCH_DISCOVERY.md | FLOW10:MERGE:P5 |
| P6 | Notification Hub (Fam 37, F320-F324) | ✅ COMPLETE | FLOW10_P6_NOTIFICATION_HUB.md | FLOW10:MERGE:P6 |
| P7a | Task Types T103-T116 (14 contracts) | ✅ COMPLETE | FLOW10_P7a_TASK_TYPES.md | FLOW10:MERGE:P7a |
| P7b | Task Types T117-T124 + AF Map + Templates | ✅ COMPLETE | FLOW10_P7b_TASK_TYPES.md | FLOW10:MERGE:P7b |
| P8 | BFA CF-96-CF-130 + Stress Tests ST-47-ST-58 | ✅ COMPLETE | FLOW10_P8_BFA.md | FLOW10:MERGE:P8 |
| P9 | Skills SK-44-SK-55 + Source Index | ✅ COMPLETE | FLOW10_P9_SKILLS_INDEX.md | FLOW10:MERGE:P9 |
| P10 | Final Validation Report | ✅ COMPLETE | FLOW10_VALIDATION.md | FLOW10:MERGE:FINAL |

## FLOW-10 Recovery Commands

```
"Show FLOW-10 factories F288-F324"         → ENGINE_ARCHITECTURE_MERGED.md
"Show FLOW-10 tasks T103-T124"             → TASK_TYPES_CATALOG_MERGED.md
"Show FLOW-10 BFA CF-96-CF-130"            → V62_BFA_STRESS_TEST_MERGED.md
"Show FLOW-10 skills SK-44-SK-55"          → SKILLS_FACTORY_RAG_MERGED.md
"Show FLOW-10 decisions DD-38-DD-49"       → UNIFIED_SOURCE_INDEX_MERGED.md
"Show FLOW-10 validation"                  → FLOW10_VALIDATION.md
"Extend to FLOW-11"                        → Start from F325/T125/CF-131/ST-59/SK-56/DD-50/Template 25
```

## FLOW-10 Key Metrics

| Metric | Added | Cumulative |
|--------|-------|-----------|
| Factory Interfaces | +37 (F288-F324) | 324 |
| Factory Families | +6 (32-37) | 37 |
| Task Types | +22 (T103-T124) | 124 |
| Flow Templates | +5 (20-24) | 24 |
| BFA Conflict Rules | +35 (CF-96-CF-130) | 130 |
| Stress Tests | +12 (ST-47-ST-58) | 58 |
| Skill Patterns | +12 (SK-44-SK-55) | 55 |
| Design Decisions | +12 (DD-38-DD-49) | 49 |
| Design Records | +8 (DR-29-DR-36) | 36 |
| Iron Rules | +192 | ~992 |
| Quality Gates | +172 | ~872 |
| DNA Compliance Checks | +333 | ~1,289 |

## FLOW-10 Domain Coverage Matrix

| Domain | Families | Factories | Tasks | Templates | BFA | Stress | Skills |
|--------|---------|----------|-------|-----------|-----|--------|--------|
| Commerce | Fam 32 | F288-F296 (9) | T112-T116 (5) | Tpl 21 | CF-110-119 (10) | ST-49,50 | SK-48,49,50 |
| CMS | Fam 33 | F297-F303 (7) | T107-T111 (5) | Tpl 20 | CF-103-109 (7) | ST-48 | SK-45,46,47 |
| Workflow | Fam 34 | F304-F308 (5) | — (infra) | — | — | — | SK-46,47,55 |
| Extensibility | Fam 35 | F309-F314 (6) | T120-T122 (3) | Tpl 23 | CF-124-128 (5) | ST-53,54 | SK-52,53 |
| Search | Fam 36 | F315-F319 (5) | T117-T119,T123 (4) | Tpl 22 | CF-120-123 (4) | ST-51,52,57 | SK-51 |
| Notifications | Fam 37 | F320-F324 (5) | T124 (1) | — | CF-129-130 (2) | ST-55 | SK-54 |
| Tenant CP | — (F08) | — | T103-T106 (4) | Tpl 24 | CF-96-102 (7) | ST-47,56 | SK-44 |
| End-to-End | — | — | — | — | — | ST-58 | — |

---

## All Flow Execution Summary

| Flow | Phase Range | Status | Factories | Tasks | Templates |
|------|-----------|--------|-----------|-------|-----------|
| FLOW-01 | — | ✅ | F1-F41 | T1-T12 | 1-3 |
| FLOW-02 | — | ✅ | F42-F89 | T13-T24 | 4-6 |
| FLOW-03 | — | ✅ | F90-F132 | T25-T36 | 7-8 |
| FLOW-04 | — | ✅ | F133-F175 | T37-T48 | 9-10 |
| FLOW-05 | — | ✅ | F176-F224 | T49-T71 | 11-14 |
| FLOW-06 | — | ✅ | F225-F233 | T72-T76 | 15 |
| FLOW-07 | — | ✅ | F234-F243 | T77-T82 | 16 |
| FLOW-08 | P1-P4 | ✅ | F244-F271 | T83-T92 | 17-18 |
| FLOW-09 | P1-P4 | ✅ | F272-F287 | T93-T102 | 19 |
| **FLOW-10** | **P0-P10** | **✅** | **F288-F324** | **T103-T124** | **20-24** |
| FLOW-11 | — | 🔲 | F325+ | T125+ | 25+ |

## SAVE POINT: FLOW-10:MERGE:PLAN ✅
## NEXT FLOW STARTING POINTS
```
FLOW-11: F325+ | T125+ | CF-131+ | ST-59+ | SK-56+ | DD-50+ | DR-37+ | Template 25+ | Family 38+
```
# ═══════════════════════════════════════════════════════
# FLOW-11 — Master Execution Plan
# Social Networking Engine Extension
# Date: 2026-02-26 | Appends after FLOW-10 plan
# ═══════════════════════════════════════════════════════

---

## ONE SENTENCE

> We taught the engine how to generate social networking flows (graph, posts, feed, engagement, messaging, search, moderation) by registering 43 factory interfaces across 7 families, 24 task type contracts, 6 flow templates, 30 BFA rules, and 14 stress tests — all on top of existing fabrics with 6 new archetypes.

---

## FLOW-11 KEY METRICS

| Metric | Added | Cumulative |
|--------|-------|-----------| 
| Factory Interfaces | +43 (F325-F367) | 367 |
| Factory Families | +7 (38-44) | 44 |
| Task Types | +24 (T125-T148) | 148 |
| Flow Templates | +6 (25-30) | 30 |
| BFA Conflict Rules | +30 (CF-131-CF-160) | 160 |
| Stress Tests | +14 (ST-59-ST-72) | 72 |
| Skill Patterns | +13 (SK-56-SK-68) | 68 |
| Design Decisions | +7 (DD-50-DD-56) | 56 |
| Design Records | +9 (DR-37-DR-45) | 45 |
| Iron Rules | +192 (24×8) | ~1,184 |
| Quality Gates | +188 (24×~8) | ~1,060 |
| AF Station Cells | +264 (24×11) | ~1,628 |
| DNA Compliance Checks | +387 (43×9) | ~1,676 |
| Methods | +~172 | ~1,794 |

---

## PHASE EXECUTION SUMMARY

| Phase | Duration | Families | Artifacts | Save Point |
|-------|----------|----------|-----------|------------|
| P0 | 15 min | — | RAG index, skills factory, plan | FLOW11:P0 ✅ |
| P1 | 45 min | 44 (Graph) | F325-F330, T125-T126 | FLOW11:P1 ✅ |
| P2 | 40 min | 38 (Post+Media) | F331-F338, T127-T130, Tpl 25 | FLOW11:P2 ✅ |
| P3 | 35 min | 39 (Feed) | F339-F345, T131-T134, Tpl 26 | FLOW11:P3 ✅ |
| P4 | 25 min | 40 (Engagement) | F346-F350, T135-T137, Tpl 27 | FLOW11:P4 ✅ |
| P5 | 35 min | 41 (Messaging) | F351-F356, T138-T141, Tpl 28 | FLOW11:P5 ✅ |
| P6 | 30 min | 42 (Search) | F357-F361, T142-T144, Tpl 29 | FLOW11:P6 ✅ |
| P7 | 30 min | 43 (Moderation) | F362-F367, T145-T148, Tpl 30 | FLOW11:P7 ✅ |
| P8 | 35 min | — (BFA) | CF-131-CF-160, ST-59-ST-72 | FLOW11:P8 ✅ |
| P9 | 25 min | — (Skills) | SK-56-SK-68, DR-37-DR-45, DD-50-DD-56 | FLOW11:P9 ✅ |
| P10 | 30 min | — (Merge) | 7 output files | FLOW11:MERGE ✅ |

---

## FIRST-TIME CAPABILITIES INTRODUCED

| Capability | Task Type | Family | Why New |
|-----------|-----------|--------|---------|
| BRANCH_GATE archetype | T138, T146 | 41, 43 | Flow step with conditional path branching |
| HUMAN_IN_LOOP archetype | T147 | 43 | Execution pauses for human decision |
| NLP_TRANSFORM archetype | T142 | 42 | AI-powered query expansion |
| MULTI_MODEL_CONSENSUS | T132, T145 | 39, 43 | Parallel models with majority voting |
| CACHE_ASIDE archetype | T134 | 39 | Cache check → miss → pipeline → store |
| IDEMPOTENT_WRITE archetype | T135 | 40 | PG UNIQUE + Redis dedup for high QPS |
| Neo4j as 7th DB FABRIC provider | F325-F330 | 44 | Graph database via existing fabric |
| Signed URL upload (no binary transit) | F331 | 38 | Object storage without fabric proxy |
| Real-time transport adapter | F354 | 41 | Queue-to-WebSocket via fabric boundary |
| Multi-model safety consensus | F362 | 43 | 3+ model voting for content safety |
| Human review as flow step | F364 | 43 | EP-2 SLA timer + atomic assignment |

---

## DOMAIN COVERAGE MATRIX

| Domain | Families | Factories | Tasks | Templates | BFA | Stress | Skills |
|--------|---------|----------|-------|-----------|-----|--------|--------|
| Social Graph | Fam 44 | F325-F330 (6) | T125-T126 (2) | — | CF-131-132 (2) | ST-59 | SK-56,68 |
| Post+Media | Fam 38 | F331-F338 (8) | T127-T130 (4) | Tpl 25 | CF-134,137 (2) | ST-60 | SK-57,58 |
| Feed | Fam 39 | F339-F345 (7) | T131-T134 (4) | Tpl 26 | CF-133,135,136 (3) | ST-66 | SK-59,60,67 |
| Engagement | Fam 40 | F346-F350 (5) | T135-T137 (3) | Tpl 27 | CF-132 (1) | ST-61 | SK-61 |
| Messaging | Fam 41 | F351-F356 (6) | T138-T141 (4) | Tpl 28 | CF-139,141 (2) | ST-62 | SK-62,66 |
| Search | Fam 42 | F357-F361 (5) | T142-T144 (3) | Tpl 29 | CF-140 (1) | ST-63,67 | SK-63 |
| Moderation | Fam 43 | F362-F367 (6) | T145-T148 (4) | Tpl 30 | CF-142,143 (2) | ST-64,65 | SK-64,65 |
| Cross-cutting | — | — | — | — | CF-138,144-160 (18) | ST-68-72 | — |

---

## BACKWARD COMPATIBILITY

- F1-F324 UNCHANGED (all FLOW-01 through FLOW-10 factories)
- T1-T124 UNCHANGED (all prior task types)
- Templates 1-24 UNCHANGED
- CF-1-CF-130 UNCHANGED
- ST-1-ST-58 UNCHANGED
- SK-1-SK-55 UNCHANGED
- DD-1-DD-49 UNCHANGED
- DR-1-DR-36 UNCHANGED
- DNA-1-DNA-9 STABLE (FLOW-11 adds no new DNA patterns)
- EP-1-EP-5 STABLE (FLOW-11 reuses EP-2 for media wait + moderation SLA)

---

## RECOVERY COMMANDS

```
"Continue FLOW-11 from Phase P{N}"     → Load plan + state + previous phase
"Show FLOW-11 factories F325-F367"     → ENGINE_ARCHITECTURE_MERGED.md
"Show FLOW-11 tasks T125-T148"         → TASK_TYPES_CATALOG_MERGED.md
"Show FLOW-11 BFA CF-131-CF-160"       → V62_BFA_STRESS_TEST_MERGED.md
"Show FLOW-11 skills SK-56-SK-68"      → SKILLS_FACTORY_RAG_MERGED.md
"Show FLOW-11 decisions DD-50-DD-56"   → UNIFIED_SOURCE_INDEX_MERGED.md
"Show FLOW-11 validation"              → This file
"Extend to FLOW-12"                    → Start from F368/T149/CF-161/ST-73/SK-69/DD-57/Template 31
```

---

## FLOW-11 MASTER PLAN SAVE POINT ✅
## NEXT FLOW STARTING POINTS
```
FLOW-12: F368+ | T149+ | CF-161+ | ST-73+ | SK-69+ | DD-57+ | DR-46+ | Template 31+ | Family 45+
```
-e 
---

# FLOW-12 — MASTER EXECUTION PLAN
# ERP Systems Engine Extension
# ═══════════════════════════════════════════════════════

## FLOW-12 EXECUTION SUMMARY

```
FLOW: FLOW-12 — ERP Systems Integration
STATUS: PLAN COMPLETE ✅
DATE: 2026-02-26
VALUE STREAMS: O2C, P2P, R2R, Master Data Sync, Bootstrap, Derived Analytics
```

## Phase Execution Record

| Phase | Name | Status | Artifacts | Save Point |
|-------|------|--------|-----------|------------|
| P0 | RAG Mini-Index | ✅ | AF-4 source map, skill gap analysis | FLOW-12:MERGE:P0 |
| P1 | Factory Interfaces (F368–F383) | ✅ | 16 factories, Family 45, DR-46–DR-49 | FLOW-12:MERGE:P1 |
| P2 | Engine Contracts (T149–T156) | ✅ | 8 task types, 44 IR, 28 QG, Template 31 | FLOW-12:MERGE:P2 |
| P3 | BFA + Stress Tests | ✅ | CF-161–CF-172, ST-73–ST-79 | FLOW-12:MERGE:P3 |
| P4 | Source Index + Skills | ✅ | DD-57–DD-60, SK-69–SK-78 | FLOW-12:MERGE:P4 |
| P5 | Multi-Tenant Layer | ✅ | 3-tier isolation, FREEDOM config, RBAC | FLOW-12:MERGE:P5 |
| P6 | Flow Template DAG | ✅ | Template 31 JSON, UI contract | FLOW-12:MERGE:P6 |
| P7 | DNA Compliance + State | ✅ | All 9 DNA patterns, backward compat | FLOW-12:MERGE:P7 |

## FLOW-12 Recovery Commands

```
Resume from any phase using save point:
  FLOW-12:MERGE:P0 — Re-generate from RAG index
  FLOW-12:MERGE:P1 — Re-generate from F368 (Engine Architecture file)
  FLOW-12:MERGE:P2 — Re-generate from T149 (Task Types Catalog file)
  FLOW-12:MERGE:P3 — Re-generate from CF-161 (BFA Stress Test file)
  FLOW-12:MERGE:P4 — Re-generate from DD-57 (Unified Source Index file)
  FLOW-12:MERGE:RAG — Re-generate from SK-69 (Skills Factory RAG file)

Validation commands (run after recovery):
  grep "F383" ENGINE_ARCHITECTURE_F11.md     → verify last factory present
  grep "T156" TASK_TYPES_CATALOG_F11.md     → verify last task type present
  grep "CF-172" V62_BFA_STRESS_TEST_F11.md  → verify last BFA rule present
  grep "ST-79" V62_BFA_STRESS_TEST_F11.md   → verify last stress test present
  grep "SK-78" SKILLS_FACTORY_RAG_F11.md    → verify last skill pattern present
  grep "DD-60" UNIFIED_SOURCE_INDEX_F11.md  → verify last design decision present
  grep "FLOW-12 COMPLETE" SESSION_STATE_F11.md → verify session state updated
```

## FLOW-12 Artifact Inventory

### New Factory Interfaces (16)
```
F368 IERPConnectorService         → DATABASE FABRIC   Family 45
F369 IMasterDataService           → DATABASE FABRIC   Family 45
F370 IDocumentChainService        → DATABASE FABRIC   Family 45
F371 ILedgerService               → DATABASE FABRIC   Family 45
F372 IWorkPlatformConnectorService → AI ENGINE FABRIC  Family 45
F373 ISagaCoordinatorService      → QUEUE FABRIC      Family 45
F374 IIdempotencyService          → DATABASE FABRIC   Family 45
F375 IReversalService             → DATABASE FABRIC   Family 45
F376 IOutboxPublisherService      → QUEUE FABRIC      Family 45
F377 IWebhookGatewayService       → QUEUE FABRIC      Family 45
F378 IThreeWayMatchService        → DATABASE FABRIC   Family 45
F379 IPeriodCloseService          → DATABASE FABRIC   Family 45
F380 IERPTenantConnectionRegistry → DATABASE FABRIC   Family 45
F381 IAuditLedgerService          → DATABASE FABRIC   Family 45
F382 IERPReportingService         → RAG FABRIC        Family 45
F383 ITenantQuotaEnforcerService  → DATABASE FABRIC   Family 45
```

### New Task Type Contracts (8)
```
T149 ERP Document Chain Step        STATEFUL_ORCHESTRATION  F368+F370+F374+F376+F381
T150 Three-Way Match Gate           VALIDATION_GATE         F370+F373+F378+F381
T151 Master Data Sync Step          INTEGRATION_SYNC        F368+F369+F374+F380+F383
T152 Period-End Close Routine       SCHEDULED_WORKFLOW      F371+F373+F379+F381+F382
T153 Reversal/Compensation Step     COMPENSATION            F370+F371+F374+F375+F381
T154 ERP Connection Bootstrap       SETUP_WORKFLOW          F368+F369+F372+F377+F380
T155 ERP Approval Gate              HUMAN_TASK_GATE         F372+F373+F374+F381
T156 ERP Analytics Sync Step        DERIVED_DATA_SYNC       F376+F381+F382
```

### New BFA Conflict Rules (12)
```
CF-161  ERP Document Chain Parent Check       CRITICAL  FLOW-12 internal
CF-162  Idempotency Key Uniqueness            CRITICAL  FLOW-12 internal
CF-163  Cross-Factory Tenant Consistency      CRITICAL  cross-flow
CF-164  P2P Three-Way Match Tenant Isolation  CRITICAL  FLOW-12 P2P
CF-165 GR Must Reference PO in Chain        HIGH      FLOW-12 P2P
CF-166 Match Variance Tolerance Enforcement  HIGH      FLOW-12 P2P
CF-167 Period Close: All Docs Terminal       CRITICAL  cross-flow R2R
CF-168 Journal Balance Enforcement          CRITICAL  FLOW-12 R2R
CF-169 No Pending Outbox Before Seal        HIGH      FLOW-12 R2R
CF-170 Tenant Connection Deduplication      HIGH      FLOW-12 bootstrap
CF-171 Webhook Verification Before Active   CRITICAL  FLOW-12 bootstrap
CF-172 Analytics Never Used as Ledger       CRITICAL  cross-flow (future)
```

### New Design Records (4)
```
DR-46 Reversal-Not-Delete Pattern
DR-47 Transactional Outbox + Idempotency Co-Design
DR-48 Three-Tier ERP Tenant Isolation
DR-49 Analytics-vs-Ledger Separation
```

### New Stress Tests (7)
```
ST-73 Double-Post Idempotency              8 assertions
ST-74 O2C Saga Compensation Path          10 assertions
ST-75 P2P Three-Way Match Block            9 assertions
ST-76 Period Close with Pending Outbox     8 assertions
ST-77 Cross-Tenant Document Reference      7 assertions
ST-78 B1SESSION Expiry Mid-Sync            8 assertions
ST-79 Full E2E FLOW-11 Integration        42 assertions
      Total:                              92 assertions
```

### New Skill Patterns (10)
```
SK-69 ERP Document Chain Step Pattern
SK-70 Three-Way Match Gate Pattern
SK-71 Saga Coordination + LIFO Compensation
SK-72 WORM Ledger + Reversal Semantics
SK-73 Transactional Outbox + Idempotency Co-Design (DR-47)
SK-74 Period-End Close Routine
SK-75 Multi-Tenant ERP Connection Bootstrap
SK-76 ERP Approval Gate with RBAC
SK-77 OData Watermark Incremental Sync
SK-78 Derived Analytics + Reconciliation (CF-172)
```

### New Flow Template
```
Template 31: erp-integration-v1 (FLOW-11)
  Entry: ERPFlowRequested
  Routes: BOOTSTRAP | SYNC | O2C | P2P | R2R
  Steps: 20 total (including sub-DAG steps)
  Compensation: LIFO, max 5 retries, exponential backoff, DLQ
```

### New Design Decisions (4)
```
DD-57 ERP Connector Abstraction
DD-58 Financial Correctness Pattern Selection
DD-59 Multi-Tenant Isolation Tier Selection
DD-60 Analytics vs Ledger Separation
```

## FLOW-12 FREEDOM Config Map

```
flow12.{tenantId}.isolation_tier            → SHARED | SCHEMA | INSTANCE
flow12.{tenantId}.erp_provider_type         → SAP_B1_ODATA | GENERIC_REST
flow12.{tenantId}.sync_frequency_minutes    → 60 (default)
flow12.{tenantId}.sync_entities             → partners,items,warehouses
flow12.{tenantId}.match_variance_tolerance  → 0.5 (%)
flow12.{tenantId}.approval_timeout_hours    → 24
flow12.{tenantId}.approval_auto_threshold   → 0 (disabled)
flow12.{tenantId}.ledger_kek_ref            → vault:# tenants/{id}/kek
flow12.{tenantId}.quota.erp_calls_per_hour  → 1000
flow12.{tenantId}.quota.sync_pages_per_job  → 100
```

## FLOW-12 RBAC Roles

```
finance_admin → FinalizeCloseAsync, payment runs, match override, period re-open
ap_clerk      → AP invoice posting, match exception resolution
ar_clerk      → AR invoice posting, incoming payment recording
sales_ops     → Sales order creation, purchase requisition approval
approver      → T155 general approval tasks
sync_operator → T151 master data sync triggering
viewer        → Read-only: chains, reports, audit log
```

## Backward Compatibility Verification

```
F1–F367:    UNCHANGED — FLOW-12 adds F368–F383 (new range, zero conflicts)
T1–T148:    UNCHANGED — FLOW-12 adds T149–T156 (new range, zero conflicts)
CF-1–CF-160: UNCHANGED — FLOW-12 adds CF-161–CF-172 (new range, zero conflicts)
Templates 1–30: UNCHANGED — FLOW-12 adds Template 31
Families 1–44: UNCHANGED — FLOW-12 adds Family 45
SK-1–SK-68: UNCHANGED — FLOW-12 adds SK-69–SK-78
DD-1–DD-56: UNCHANGED — FLOW-12 adds DD-57–DD-60
DR-1–DR-45: UNCHANGED — FLOW-12 adds DR-46–DR-49
```

## ══════════════════════════════════════════
## FLOW-12 COMPLETE ✅
## Next: FLOW-13 starting at F384+ | T111+ | CF-108+ | ST-54+ | Family 33+
## ══════════════════════════════════════════

# ═══════════════════════════════════════════════════════
# FLOW-13 — Enterprise Finance Engine — Execution Plan
# ═══════════════════════════════════════════════════════

# XIIGen — FLOW-13 MASTER EXECUTION PLAN
## "Enterprise Finance Engine — AP, AR, GL, Treasury, Period Close, Multi-Tenant"
## Date: 2026-02-26 | Status: ALL PHASES COMPLETE ✅
## Resumes from: SESSION_STATE_MERGE.md (FLOW-12 complete, F1-F383, T1-T156)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 0 — NO-CODE EXPLANATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Big Picture (Plain English)

FLOW-13 teaches the XIIGen engine how to generate **enterprise-grade finance flows**.
These are the flows that run SAP-level operations: processing invoices, running payroll
batches, reconciling bank statements, locking fiscal periods, recognizing revenue, and
maintaining the ledger — all across multiple legal entities and tenants.

### Before FLOW-13
The engine knew how to build social flows (posts, events, friends), marketplace flows,
gamification, and multi-tenant control planes. It had no concept of:
- Double-entry accounting constraints (every debit must equal a credit)
- Fiscal period locking (you cannot post to a locked period — ever)
- Three-way match (PO ↔ GR ↔ Invoice must agree before payment)
- Segregation of Duties (the person who initiates cannot approve)
- Durable finance sagas (a payment run takes hours, must survive crashes)

### After FLOW-13
The engine can generate services that:
- **Run AP flows**: vendor invoice → three-way match → approval gate → payment run
- **Run AR flows**: customer invoice → revenue recognition → receipt application → aging
- **Run Period Close**: subledger sync → intercompany → lock → trial balance sign-off
- **Handle Treasury**: bank statement ingestion → payment matching → cash position
- **Enforce Compliance**: SoD checks, immutable audit trails, multi-tenant isolation tiers

### The Six Families (What The Engine Learns)

**Family 46 — Finance Master Data & Organization (F384–F390)**
"What is the chart of accounts, which legal entities exist, what exchange rates apply?"
CoA management, legal entity setup, ledger config, exchange rates, fiscal calendar,
tax authority gateway, and finance master data service.

**Family 47 — Accounts Payable (F391–F397)**
"Invoice received. Is it valid? Does it match the PO? Does it match the goods receipt?
Who approves? When does it pay?"
Invoice processing, PO matching, GR matching, AP subledger, vendor payment, exception
handling, AP approval workflow.

**Family 48 — Accounts Receivable (F398–F404)**
"Customer owes us money. Did they pay? Did we recognize the revenue correctly?
What is the aging? What milestones trigger billing?"
Revenue recognition, AR subledger, customer receipt, AR collector, deferred revenue,
AR aging, project billing.

**Family 49 — Cash & Treasury (F405–F411)**
"Money arrived in the bank. Which payment does it match? What is our cash position?
Can we release this payment batch?"
Bank statement ingestion, payment execution, bank reconciliation, cash position,
treasury workflow, forex settlement, payment validation.

**Family 50 — Asset & Controlling (F412–F417)**
"What assets do we own? How are they depreciating? What does the GL say vs. the subledger?
Which intercompany transactions need elimination?"
Asset accounting, cost center allocation, intercompany clearing, GL journal entry,
period close orchestration, trial balance.

**Family 51 — Compliance, Audit & Multi-Tenant Finance (F418–F425)**
"Is this transaction compliant? Who did what? Are two tenants' data leaking?
Are we running out of quota?"
Audit trail (immutable), approval workflow, document archive, SoD enforcement,
financial reporting, tax compliance, tenant finance config, quota management.

### What We ARE Doing
- ✅ **F384–F425**: 42 new factory interface contracts (Families 46–51) — ENGINE_ARCHITECTURE_F11.md
- ✅ **T157–T166**: 10 full engine contracts (ARCHETYPE, Iron Rules, Quality Gates) — TASK_TYPES_CATALOG_F13.md
- ✅ **110 cells**: AF Station Map (11 stations × 10 task types) — embedded in TASK_TYPES_CATALOG_F13.md
- ✅ **Template 32**: finance-engine-v1 JSON DAG — embedded in TASK_TYPES_CATALOG_F13.md
- ✅ **CF-173–CF-191**: 19 BFA conflict rules (finance-internal + cross-flow) — V62_BFA_STRESS_TEST_F11.md
- ✅ **ST-80–ST-91**: 12 stress tests (period race, SoD bypass, bank mismatch, quota) — V62_BFA_STRESS_TEST_F11.md
- ✅ **DR-50–DR-57**: 8 design records (audit, SoD, tolerance, isolation) — ENGINE_ARCHITECTURE_F11.md
- ✅ **SK-79–SK-88**: 10 skill patterns (saga entry, approval gate, 3-way match...) — SKILLS_FACTORY_RAG.md
- ✅ **DD-61–DD-73**: 13 design decisions — UNIFIED_SOURCE_INDEX_F11.md
- ✅ **EP-4 + EP-5 usage**: Durable Saga Runtime and Period Lock Primitive — both consumed (not redefined)
- ✅ **DNA-9 (SoD)** enforced on all 10 task types — new finance-specific pattern
- ✅ Backward compatibility: **0 breaks** (F1–F383, T1–T156, CF-1–CF-172 untouched)

### What We Are NOT Doing
- ❌ Not writing GL or AP services directly (the ENGINE generates them on fabrics)
- ❌ Not creating typed Python dataclasses (Invoice, Payment, JournalEntry) — use dict[str, Any] (DNA-1)
- ❌ Not making HTTP calls between finance services — all events through QUEUE FABRIC (DNA-4)
- ❌ Not importing database drivers (PostgreSQL, Oracle) — always through DATABASE FABRIC (SK-382 (ElasticsearchDatabase))
- ❌ Not hardcoding tolerance thresholds, tax rates, or approval limits — FREEDOM config (DR-55)
- ❌ Not redefining EP-4/EP-5 — they are consumed by T157/T160, not invented here
- ❌ Not breaking F1–F383 or T1–T156

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — PLAN VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Validation A: basic_prompt.txt — 12 Required Deliverables

| # | Requirement | Covered By | Status |
|---|-------------|-----------|--------|
| 1 | New factory interfaces registered in factory registry | ENGINE_ARCHITECTURE_F11.md F384–F425 | ✅ |
| 2 | Each factory resolves through an existing FABRIC | ENGINE_ARCHITECTURE_F11.md — FABRIC RESOLUTION column on all 42 | ✅ |
| 3 | New engine contracts (full format) for each task type | TASK_TYPES_CATALOG_F13.md T157–T166 | ✅ |
| 4 | ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION on each T | TASK_TYPES_CATALOG_F13.md | ✅ |
| 5 | AF CONFIGURATION on each task type (all 11 stations mapped) | TASK_TYPES_CATALOG_F13.md — 110 AF cells | ✅ |
| 6 | BFA VALIDATION section on each task type | TASK_TYPES_CATALOG_F13.md — CF refs per T | ✅ |
| 7 | QUALITY GATES / IRON RULES per task type | TASK_TYPES_CATALOG_F13.md — 8 IR + 6 QG per T | ✅ |
| 8 | BFA cross-flow validation (new entities/events registered) | V62_BFA_STRESS_TEST_F11.md CF-173–CF-191 | ✅ |
| 9 | Flow template (JSON DAG for FlowOrchestrator) | TASK_TYPES_CATALOG_F13.md Template-32 | ✅ |
| 10 | Genie DNA compliance on all generated services | UNIFIED_SOURCE_INDEX_F11.md DNA section | ✅ |
| 11 | Skill patterns for AF-4 RAG retrieval | SKILLS_FACTORY_RAG.md SK-79–SK-88 | ✅ |
| 12 | Backward compatibility — T1–T156, F1–F383, CF-1–CF-172 unchanged | Save point checks across all files | ✅ |

## Validation B: Finance Domain Requirements

| Requirement | Task Type | Factory | Design Record |
|-------------|-----------|---------|---------------|
| Three-way match (PO/GR/Invoice) | T158 | F391, F392, F393 | DR-55 |
| Human approval with SoD | T159 | F397, F411, F419 | DNA-9 |
| Period locking (no post to closed) | T160 | F386 + EP-5 | DR-51 |
| Durable saga for int-running ops | T157, T162 | EP-4 | — |
| Double-entry validation | T163 | F384, F389 | — |
| Revenue recognition gate | T164 | F400, F398 | DR-57 |
| Bank reconciliation | T162 | F405, F408 | DR-54 |
| Immutable audit trail | All T (IR-x-4 on every T) | F418 | DR-50 |
| Multi-tenant finance isolation tiers | T166 | F424, F425 | DR-56 |
| Subledger-GL sync validation | T161 | F396, F403, F421 | — |

## Validation C: No Gaps

| Check | Result |
|-------|--------|
| Factory numbering: F287 was last, F384 is first FLOW-13 factory | ✅ No gap |
| Task type numbering: T102 was last, T157 is first FLOW-13 task type | ✅ No gap |
| BFA numbering: CF-95 was last, CF-173 is first FLOW-13 CF rule | ✅ No gap |
| Stress test numbering: ST-46 was last, ST-80 is first FLOW-13 ST | ✅ No gap |
| Design record numbering: DR-28 was last, DR-50 is first FLOW-13 DR | ✅ No gap |
| Skill numbering: SK-43 was last, SK-79 is first FLOW-13 SK | ✅ No gap |
| Design decision numbering: DD-37 was last, DD-61 is first FLOW-13 DD | ✅ No gap |
| Family numbering: Family 31 was last, Family 46 is first FLOW-13 family | ✅ No gap |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — POSITIVE AND NEGATIVE EXAMPLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## POSITIVE EXAMPLE: Correct Engine-Generated AP Invoice Service

**Scenario:** The engine generates a vendor invoice processing service for tenant "acme-corp".

```python
# ✅ CORRECT — Fabric-first, DNA-compliant, engine-generated service

class VendorInvoiceProcessingService(MicroserviceBase):  # DNA-4: extends MicroserviceBase
{
    async def ProcessInvoiceAsync(self, 
        str tenantId, str legalEntityId, dict[str, Any] invoicePayload)  # DNA-1: Dictionary
    {
        # DNA-5: scope isolation — tenantId on ALL queries
         filter = build_search_filter(new {    # DNA-2: build_search_filter skips empty fields
            tenant_id = tenantId,
            legal_entity_id = legalEntityId,
            invoice_id = invoicePayload["invoice_id"]
        })
        # ✅ Factory resolution through DATABASE FABRIC (F391 → SK-382 (ElasticsearchDatabase))
         invoiceService = await _invoiceFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId })
        # ✅ Period lock check via FABRIC (F386 → EP-5) — BEFORE any write
         periodCheck = await _calendarFactory.CreateAsync(ctx)
            .Then(s => s.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, period))
        if (!periodCheck.IsSuccess || !periodCheck.Data)
            return DataProcessResult[Dictionary].Failure("PERIOD_NOT_OPEN");  # DNA-3: no throw

        # ✅ Queue event through QUEUE FABRIC (never direct HTTP)
        await _queueService.EnqueueAsync($"finance.invoice.received.{tenantId}", invoicePayload)
        return DataProcessResult[Dictionary].Success(result);  # DNA-3: DataProcessResult
    }
}
```

**Why this is CORRECT:**
- Extends `MicroserviceBase` (DNA-4) ✅
- Uses `dict[str, Any]` not `InvoiceEntity` class (DNA-1) ✅
- Uses `build_search_filter` (DNA-2) ✅
- Returns `DataProcessResult[T]` never throws (DNA-3) ✅
- `tenantId` on every query (DNA-5) ✅
- Factory `CreateAsync()` never `VendorInvoiceProcessingService()` ✅
- Period lock checked via fabric before posting ✅
- Events through QUEUE FABRIC, not HTTP ✅

---

## NEGATIVE EXAMPLE: What The Engine Must NEVER Generate

```python
# ❌ WRONG — Multiple violations, would fail AF-7 Compliance + AF-9 Judge

class InvoiceService:  # ❌ Does NOT extend MicroserviceBase
{
    private readonly NpgsqlConnection _db;  # ❌ Imports specific DB driver (PostgreSQL)
    private readonly OpenAIClient _ai;       # ❌ Imports specific AI provider

    async def process_invoice(self, invoice: Invoice)  # ❌ Typed model, not dict[str, Any]
    {
        # ❌ No tenantId scope — will cross-contaminate tenants (CF-186 violation)
         existing = await _db.QueryAsync<Invoice>("SELECT * FROM invoices WHERE id = @id",
            new { id = invoice.Id })
        # ❌ No period lock check — will post to locked period (CF-177 violation)
        # ❌ No three-way match — will pay without validation (IR-158-1 violation)

        try {
            await _db.ExecuteAsync("INSERT INTO invoices...");  # ❌ Direct DB, not fabric
        } catch (Exception ex) {
            throw InvoiceException("Failed", ex);  # ❌ Throws — violates DNA-3
        }

        # ❌ HTTP call between services — not through QUEUE FABRIC
        await _httpClient.PostAsync("http:# approval-service/approve", content)
        return invoice;  # ❌ Returns typed model, not DataProcessResult[Dictionary]
    }
}
```

**Why this FAILS (build failure — AF-7 + AF-9 reject):**
- Missing `MicroserviceBase` → CF-190 CONFLICT: missing 19 architectural components
- Direct `NpgsqlConnection` → DR-54 violation + AF-8 security rejection
- `Invoice` typed model → DNA-1 violation
- No `tenantId` → CF-186 CONFLICT: tenant data leak
- No period lock → CF-177 CONFLICT: posting to locked period
- `throw` instead of `DataProcessResult` → DNA-3 violation
- HTTP between services → DNA-4 violation (should be QUEUE FABRIC)
- No SoD check → DNA-9 violation

---

## EXAMPLE: Correct vs Wrong Factory Registration

**✅ CORRECT — F391 with fabric resolution declared:**
```
F391: IInvoiceProcessingService
FABRIC RESOLUTION: DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) → PostgreSQL provider
RESOLVES VIA: CreateAsync(FactoryResolutionContext { TenantId, LegalEntityId })
CONFIG KEY: finance.invoice.db.provider.{tenantId}
FALLBACK: Elasticsearch read-only replica
```

**❌ WRONG — Missing fabric resolution:**
```
F391: InvoiceProcessingService  # ❌ Class name not interface name
# No fabric resolution declared — engine cannot route at runtime
# Creates new() directly — not via CreateAsync()
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — PHASE EXECUTION PLAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase Structure (designed for 15–45 min windows with save points)

| Phase | File | Content | Save Point | Status |
|-------|------|---------|-----------|--------|
| P1 | ENGINE_ARCHITECTURE_F11.md | F384–F425, Families 46–51, DR-50–DR-57 | P1-FACTORIES | ✅ |
| P2 | 13-finance_TASK_TYPES_CATALOG_F13.md | T157–T166, AF maps, Template-32 | P2-TASKS | ✅ |
| P3 | 13-finance_V62_BFA_STRESS_TEST_F11.md | CF-173–CF-191, ST-80–ST-91 | P3-BFA | ✅ |
| P4 | 13-finance_SKILLS_FACTORY_RAG.md | SK-79–SK-88 + RAG index | P4-SKILLS | ✅ |
| P5 | 13-finance_UNIFIED_SOURCE_INDEX_F11.md | DD-61–DD-73, concept maps, DNA compliance | P5-INDEX | ✅ |
| P6 | 13-finance_MASTER_EXECUTION_PLAN_F11.md | This file — plan, validation, examples | P6-PLAN | ✅ |
| P7 | 13-finance_SESSION_STATE_F13.md | Updated global state for post-FLOW-13 | P7-STATE | ✅ |

## Recovery Commands

```
Resume from P1: "Continue FLOW-13 from P1-FACTORIES — generate ENGINE_ARCHITECTURE_F11.md (F384–F425)"
Resume from P2: "Continue FLOW-13 from P2-TASKS — generate TASK_TYPES_CATALOG F13 (T157–T166)"
Resume from P3: "Continue FLOW-13 from P3-BFA — generate BFA stress tests (CF-173–CF-191, ST-80–ST-91)"
Resume from P4: "Continue FLOW-13 from P4-SKILLS — generate Skills Factory RAG (SK-79–SK-88)"
Resume from P5: "Continue FLOW-13 from P5-INDEX — generate Unified Source Index (DD-61–DD-73)"
Resume from P6: "Continue FLOW-13 from P6-PLAN — generate Master Execution Plan"
Resume from P7: "Continue FLOW-13 from P7-STATE — generate Session State file"
ALL COMPLETE:    "FLOW-13 complete. Load SESSION_STATE_F13.md and continue with FLOW-14"
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — FLOW-13 SUMMARY METRICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Engine State After FLOW-13

```
Factory Interfaces:  F1–F425    (+42 from FLOW-13)
Factory Families:    1–37       (+6 from FLOW-13)
Task Types:          T1–T166    (+10 from FLOW-13)
Flow Templates:      1–20       (+1: Template-32 finance-engine-v1)
BFA Conflict Rules:  CF-1–CF-191  (+19 from FLOW-13)
Stress Tests:        ST-1–ST-91   (+12 from FLOW-13)
DNA Patterns:        DNA-1–DNA-9  (unchanged — DNA-9 SoD consumed)
Engine Primitives:   EP-1–EP-5    (unchanged — EP-4/EP-5 consumed)
Design Records:      DR-1–DR-57   (+8 from FLOW-13)
Skill Patterns:      SK-1–SK-88   (+10 from FLOW-13)
Design Decisions:    DD-1–DD-73   (+13 from FLOW-13)
Iron Rules:          +80          (8 per task type × 10)
Quality Gates:       +60          (6 per task type × 10)
AF Station Cells:    +110         (11 × 10)
```

## New Archetypes Introduced in FLOW-13

| Archetype | First Used | Description |
|-----------|-----------|-------------|
| DURABLE_SAGA | T157 | Long-running saga with EP-4 crash recovery |
| HUMAN_GATE | T159 | Wait state for human approval with SoD validation |
| PROVISIONING | T166 | Tenant onboarding / setup orchestration |

Note: All three may have been registered in prior flows. FLOW-13 uses them; if new, they
are registered here. Existing archetypes (VALIDATION, ORCHESTRATION) continue unchanged.

## Key Finance Invariants Locked In (non-negotiable engine rules)

1. **No post to locked period** — T160 EP-5 + CF-177 enforced by AF-9
2. **Three-way match before payment** — T158 required before T162 (CF-175)
3. **SoD: initiator ≠ approver** — DNA-9 enforced on T157, T159, T162 (CF-188)
4. **Audit trail written BEFORE saga resumes** — IR-159-4 on all approval gates
5. **Double-entry must balance** — T163 IR-163-1, debit = credit always
6. **Tolerance from FREEDOM config** — DR-55, never hardcoded (CF-180)
7. **Immutable audit records** — DR-50, delete = IRON_RULE_VIOLATION
8. **Multi-tenant finance isolation** — DR-56, T166 F424/F425

---
## SAVE POINT: P6-PLAN ✅
## NEXT: 13-finance_SESSION_STATE_F13.md

## RENUMBERING NOTE
FLOW-13 execution plan originally referenced F288-F329, T103-T112. All renumbered for merge.
F+96, T+54, CF+77, ST+33, SK+35, DD+23, DR+21, Template 20→32, Families 32-37→46-51.

## SAVE POINT: FLOW-13:MERGE:P6 ✅
## Phase 6 COMPLETE: FLOW-13 execution plan merged

---

# ═══════════════════════════════════════════════════════
# FLOW-14: DATA WAREHOUSE & INTEGRATION ENGINE — EXECUTION PLAN
# 9 Phases (P0-P8) | 40 factories | 12 task types | 3 templates
# ═══════════════════════════════════════════════════════

## FLOW-14 EXECUTION PHASES

| Phase | Deliverable | Lines | Status |
|-------|-------------|-------|--------|
| P0 | Plan + validation matrix + positive/negative examples | 827 | ✅ |
| P1 | F426-F443 (Families 52-54), DR-58/59 | 682 | ✅ |
| P2 | F444-F465 (Families 55-59), DR-60-65 | 929 | ✅ |
| P3 | T167-T172 (6 contracts, 48 IRs, 36 QGs, 66 AF cells) | 597 | ✅ |
| P4 | T173-T178 (6 contracts, 48 IRs, 36 QGs, 66 AF cells) + Templates 33-35 | 834 | ✅ |
| P5 | CF-192-CF-213 (22 BFA rules) + ST-92-ST-103 (12 stress tests) | 575 | ✅ |
| P6 | SK-89-SK-98 (10 skills) + DD-74-DD-85 (12 design decisions) | 914 | ✅ |
| P7 | Merge into 7 canonical files | — | ✅ |
| P8 | Validation (26/26 PASS) + SESSION_STATE update | 452 | ✅ |

## FLOW-14 RECOVERY COMMANDS

```
Load full engine state:      "Load SESSION_STATE — engine is at F465/T178/CF-213"
Load FLOW-14 plan:           "Load FLOW14_PLAN_P0.md"
Load DWH factories:          "Load FLOW14_P1_FACTORIES.md + FLOW14_P2_FACTORIES.md"
Load DWH task types:         "Load FLOW14_P3_TASK_TYPES.md + FLOW14_P4_TASK_TYPES.md"
Load DWH BFA rules:          "Load FLOW14_P5_BFA.md"
Load DWH skills:             "Load FLOW14_P6_SKILLS.md"
Load DWH validation:         "Load FLOW14_P8_VALIDATION.md"
Start FLOW-15:               "Start FLOW-15 from F466, T179, CF-214"
```

## FLOW-14 KEY INVARIANTS

1. **Raw zone immutable** — DR-58, AF-7, never update/delete raw records
2. **Rate limit before every external call** — DR-59, CF-210, F430.CheckAsync mandatory
3. **Credentials never cross tenant** — CF-204, F427 AES-256-GCM, DNA-5
4. **Zone promotion order** — CF-192: raw→staging→core→mart, no skipping
5. **PII classification before mart** — DR-63, CF-207, F462 classification gate
6. **Cursor checkpoint via EP-4** — CF-193, monotonic advancement, crash recovery
7. **Webhook HMAC before processing** — CF-211, timing-safe comparison
8. **Identity never cross-tenant** — CF-204, IR-175-1, absolute violation
9. **Reverse ETL via QUEUE FABRIC** — DR-64, never direct HTTP
10. **All queries include tenantId** — DNA-5, CF-205/206, F463 RLS

## FLOW-14 RENUMBERING NOTE

FLOW-14 content originally authored at F243/T82/Family-26 (post-FLOW-07 state).
FLOW-08 through FLOW-13 subsequently consumed number ranges F244-F425, T83-T166.
Offsets applied during P0 planning: F+182, T+84, CF+128, ST+61, SK+60, DD+53, DR+37.
Templates 18-20 → 33-35, Families 26-33 → 52-59.
All internal cross-references updated consistently in P0.

---
## SAVE POINT: FLOW-14:MERGE:P6 ✅
## Phase 6 COMPLETE: FLOW-14 execution plan merged

---

# ═══════════════════════════════════════════════════════════════
# FLOW-15 — MVP BUILDER PLATFORM
# Families 60–73 | F466–F565 | T179–T218 | CF-214–CF-255
# Templates 36–44 | SK-99–SK-124 | DD-86–DD-106 | DR-66–DR-82
# ST-104–ST-140 | 10 New Archetypes
# ═══════════════════════════════════════════════════════════════

## FLOW-15 OVERVIEW

FLOW-15 extends the engine to generate complete MVP builder platforms — the engine's
largest single extension at 100 factories, 40 task types, and 14 new families.

### Domain Coverage

| Family Group | Families | Factories | Task Types | Templates |
|-------------|----------|-----------|------------|-----------|
| App Creation & Workspace | 60 (F466-F477) | 12 | T179-T180 | 36 |
| Visual Editor & Components | 61 (F478-F484) | 7 | T181-T182 | — |
| Template Engine & Scaffold | 62 (F485-F490) | 6 | T183-T184 | 37 |
| GitHub Integration | 63 (F491-F492) | 2 | T185 | — |
| Code Export | 64 (F493-F495) | 3 | T186 | 38 |
| Plugin Marketplace | 65 (F496-F500) | 5 | T187-T188 | — |
| Discussion & Sandbox | 66 (F501-F504) | 4 | T189-T190 | — |
| Monetization & Billing | 67 (F505-F509) | 5 | T191-T192 | — |
| Custom Domains & Publishing | 68 (F510-F517) | 8 | T193-T196 | 39 |
| Analytics & Observability | 69 (F518-F526) | 9 | T197-T200 | 40 |
| External Integrations | 70 (F527-F537) | 11 | T201-T205 | 41 |
| AI Add-ons | 71 (F538-F547) | 10 | T206-T210 | 42 |
| Infrastructure Scaling | 72 (F548-F557) | 10 | T211-T214 | 43 |
| Enterprise Multi-Tenant | 73 (F558-F565) | 8 | T215-T218 | 44 |

### New Archetypes Introduced

| Archetype | First Task Type | Description |
|-----------|----------------|-------------|
| TEMPLATE | T180 | NLP-driven spec generation via AI ENGINE + RAG |
| SCAFFOLDING | T181, T183 | AI-powered code/component generation |
| SPEC | T183 | Multi-rule validation of structured specs |
| SANDBOX | T189 | Fork-commit isolated environments |
| BILLING | T191 | Subscription lifecycle management |
| METERING | T192 | Usage aggregation and threshold enforcement |
| ENFORCEMENT | T192 | Paywall gate real-time checks |
| PUBLISHING | T193 | Domain provisioning + deployment pipeline |
| OBSERVABILITY | T197 | Analytics ingestion + metric rollup |
| OAUTH | T201 | Third-party OAuth2 PKCE exchange |
| AI_ADDON | T206 | AI feature injection into generated apps |
| SCALING | T211 | Auto-scale + health probe orchestration |
| ENTERPRISE | T215 | Silo graduation + RLS enforcement |

## FLOW-15 PHASE EXECUTION PLAN

### Phase P4A: Factories F466–F509 + Task Types T179–T185 (Families 60–63)

```
DELIVERABLES:
  1. FLOW15_P4A_FACTORIES_RECONSTRUCTED.md  — F466-F509 (44 factories, Families 60-67)
  2. FLOW15_P4A_ALL_RECONSTRUCTED.md        — T179-T185, Templates 36-37
                                              CF-214-CF-223, ST-104-ST-117
                                              SK-99-SK-103, DD-86-DD-96, DR-66-DR-72

FACTORY BREAKDOWN:
  Family 60 — App Creation & Workspace (F466-F477, 12 factories)
    F466 IAppWorkspaceService           → DATABASE FABRIC (ES+PG) + QUEUE FABRIC
    F467 IAppProjectService             → DATABASE FABRIC (ES+PG)
    F468 IAppConfigService              → DATABASE FABRIC (ES) — FREEDOM layer
    F469 IAppSchemaService              → DATABASE FABRIC (PG)
    F470 INlpSpecIntakeService          → AI ENGINE FABRIC + RAG FABRIC
    F471 ISpecValidationService         → DATABASE FABRIC (ES)
    F472 ISpecDiffService               → DATABASE FABRIC (ES)
    F473 IVersioningService             → DATABASE FABRIC (PG)
    F474 IAppPreviewService             → DATABASE FABRIC (Redis) + QUEUE FABRIC
    F475 IAppDeployService              → QUEUE FABRIC + DATABASE FABRIC (PG)
    F476 IAppStatusService              → DATABASE FABRIC (ES)
    F477 ICollaborationService          → DATABASE FABRIC (Redis) + QUEUE FABRIC

  Family 61 — Visual Editor & Component Library (F478-F484, 7 factories)
    F478 IVisualEditorService           → DATABASE FABRIC (Redis+ES) + QUEUE FABRIC
    F479 IComponentLibraryService       → DATABASE FABRIC (ES)
    F480 IDragDropLayoutService         → DATABASE FABRIC (Redis)
    F481 IStyleThemeService             → AI ENGINE FABRIC + DATABASE FABRIC (ES)
    F482 ITemplateScoringService        → AI ENGINE FABRIC + RAG FABRIC
    F483 IResponsivePreviewService      → CORE FABRIC
    F484 IDesignTokenService            → DATABASE FABRIC (ES)

  Family 62 — Template Engine & Scaffold (F485-F490, 6 factories)
    F485 ITemplateRegistryService       → DATABASE FABRIC (ES)
    F486 ITemplateVersionService        → DATABASE FABRIC (PG)
    F487 ITemplateCloneService          → DATABASE FABRIC (ES+PG) + QUEUE FABRIC
    F488 IScaffoldGeneratorService      → AI ENGINE FABRIC + RAG FABRIC
    F489 ITemplateMarketplaceService    → DATABASE FABRIC (ES) + RAG FABRIC
    F490 ITemplatePreviewService        → CORE FABRIC + DATABASE FABRIC (Redis)

  Family 63 — GitHub Integration (F491-F492, 2 factories)
    F491 IGitHubSyncService             → DATABASE FABRIC (PG) + QUEUE FABRIC
    F492 IGitBranchService              → DATABASE FABRIC (PG)

  Families 64-67 — Code Export, Plugins, Discussion, Billing (F493-F509, 17 factories)
    Family 64: F493-F495 (3 factories — code export, format, package)
    Family 65: F496-F500 (5 factories — plugin registry, sandbox, review, install, analytics)
    Family 66: F501-F504 (4 factories — thread, sandbox fork, sandbox commit, vote)
    Family 67: F505-F509 (5 factories — subscription, metering, paywall, invoice, trial)

TASK TYPES P4A:
  T179 App Workspace Provision Gate     PROVISIONING     F466,F467,F468,F477
  T180 NLP Spec Intake Gate             TEMPLATE (NEW)   F470,F471,F472,F473,F469
  T181 Visual Editor Render Gate        SCAFFOLDING(NEW) F478,F479,F480,F481,F484
  T182 Template Scoring & Selection     TEMPLATE         F482,F485,F489,F470
  T183 Scaffold Generation Gate         SCAFFOLDING      F488,F469,F471,F473,F250
  T184 App Preview Deploy Gate          PROVISIONING     F474,F475,F476
  T185 GitHub Sync Gate                 INTEGRATION      F491,F492,F473,F475

BFA RULES P4A: CF-214–CF-223 (10 rules)
  CF-214: App Workspace vs FLOW-08 Builder Session (index isolation)
  CF-215: NLP Spec vs FLOW-08 Intent Compiler (prompt template prefixes)
  CF-216: Editor State vs FLOW-08 Session State (Redis key prefixes)
  CF-217: Template Search vs FLOW-08 Spec Search (different ES indices)
  CF-218: Scaffold Artifacts vs FLOW-08 Build Artifacts (index prefixes)
  CF-219: Preview Slots vs FLOW-08 Managed Primitives (separate pools)
  CF-220: GitHub Webhooks vs FLOW-14 Webhook Ingestion (endpoint paths)
  CF-221: App Schema vs FLOW-14 Schema Registry (domain separation)
  CF-222: App Version DAG vs Flow Engine DAGs (key patterns)
  CF-223: Collaboration Redis vs FLOW-08 Conversation Redis (key prefixes)

STRESS TESTS P4A: ST-104–ST-117 (14 tests)
SKILLS P4A: SK-99–SK-103 (5 patterns)
DESIGN DECISIONS P4A: DD-86–DD-96 (11 decisions)
DESIGN RECORDS P4A: DR-66–DR-72 (7 records)

SAVE POINT: FLOW15:P4A:COMPLETE
RECOVERY: "Load FLOW15_P4A_ALL_RECONSTRUCTED.md"
```

### Phase P4B: Task Types T186–T192 + BFA CF-224–CF-233 + Skills SK-104–SK-110 (Families 64–67)

```
DELIVERABLES:
  1. FLOW15_P4B_TASK_TYPES.md           — T186-T192, Template 38
  2. FLOW15_P5_BFA_STRESS.md            — CF-224-CF-233, ST-118-ST-128
  3. FLOW15_P6_SKILLS_DD_DR.md          — SK-104-SK-110, DD-97-DD-99, DR-73-DR-75

TASK TYPES P4B:
  T186 Code Export Gate                 PUBLISHING       F493,F494,F495
  T187 Plugin Install Gate              PROVISIONING     F496,F497,F498,F499
  T188 Plugin Review Gate               VALIDATION       F498,F500,F497
  T189 Discussion Sandbox Fork          SANDBOX (NEW)    F501,F502,F503
  T190 Sandbox Commit Gate              VALIDATION       F502,F503,F504
  T191 Subscription Lifecycle Gate      BILLING (NEW)    F505,F506,F507,F508
  T192 Usage Metering & Paywall Gate    METERING (NEW)   F506,F508,F509

BFA RULES P4B: CF-224–CF-233 (10 rules)
  CF-224: Code export vs scaffold artifacts (index separation)
  CF-225: Plugin sandbox vs preview sandbox (container namespaces)
  CF-226: Plugin review vs AF-6 code review (different AI prompts)
  CF-227: Discussion threads vs FLOW-10 chat threads (index prefixes)
  CF-228: Sandbox fork vs Git branch (different state stores)
  CF-229: Subscription state vs trial state (state machine isolation)
  CF-230: Usage metering vs FLOW-14 metrics (aggregation separation)
  CF-231: Paywall gate vs rate limit gate (enforcement layers)
  CF-232: Invoice generation vs FLOW-13 i18n (currency handling)
  CF-233: Plugin analytics vs app analytics (metric namespace)

STRESS TESTS P4B: ST-118–ST-128 (11 tests)
SKILLS P4B: SK-104–SK-110 (7 patterns)
  SK-104: Code Export Sanitization
  SK-105: Plugin Sandbox Quota
  SK-106: Discussion Thread Linking
  SK-107: Sandbox Fork-Commit Pattern
  SK-108: Usage Metering Aggregation
  SK-109: Paywall Gate Enforcement
  SK-110: Subscription State Machine

SAVE POINT: FLOW15:P4B-P6:COMPLETE
RECOVERY: "Load FLOW15_P4B_TASK_TYPES.md + FLOW15_P5_BFA_STRESS.md + FLOW15_P6_SKILLS_DD_DR.md"
```

### Phase P4C: Factories F510–F565 (Families 68–73)

```
DELIVERABLES:
  1. FLOW15_P4C_PLAN_P0.md              — Plan, validation, examples, RAG index
  2. FLOW15_P4C_FACTORIES.md            — F510-F565 (56 factories across 6 families)

FACTORY BREAKDOWN:
  Family 68 — Custom Domains & Publishing (F510-F517, 8 factories)
    F510 IDomainRegistryService         → DATABASE FABRIC (ES+PG) + QUEUE FABRIC
    F511 ISslCertManagerService         → DATABASE FABRIC (PG) + QUEUE FABRIC
    F512 IDnsVerificationService        → DATABASE FABRIC (PG)
    F513 ICdnConfigService              → DATABASE FABRIC (ES) + QUEUE FABRIC
    F514 IPublishPipelineService        → QUEUE FABRIC + DATABASE FABRIC (PG)
    F515 IRollbackSnapshotService       → DATABASE FABRIC (PG)
    F516 IPreviewUrlService             → DATABASE FABRIC (Redis)
    F517 IDeploymentHistoryService      → DATABASE FABRIC (ES)

  Family 69 — Analytics & Observability (F518-F526, 9 factories)
    F518 IEventIngestionService         → QUEUE FABRIC + DATABASE FABRIC (ES raw)
    F519 IMetricRollupService           → DATABASE FABRIC (PG) + QUEUE FABRIC
    F520 IDashboardQueryService         → DATABASE FABRIC (PG+Redis cache)
    F521 IErrorTrackingService          → DATABASE FABRIC (ES) + QUEUE FABRIC
    F522 IAlertingService               → QUEUE FABRIC + DATABASE FABRIC (ES)
    F523 IRetentionPurgeService         → QUEUE FABRIC + DATABASE FABRIC (PG)
    F524 ITenantUsageSummaryService     → DATABASE FABRIC (PG)
    F525 ICustomEventSchemaService      → DATABASE FABRIC (ES)
    F526 IFunnelAnalyticsService        → DATABASE FABRIC (PG) + AI ENGINE FABRIC

  Family 70 — External Integrations (F527-F537, 11 factories)
    F527 IIntegrationCatalogService     → DATABASE FABRIC (ES)
    F528 IOAuthExchangeService          → DATABASE FABRIC (PG encrypted) + CORE FABRIC
    F529 IWebhookRelayService           → QUEUE FABRIC + DATABASE FABRIC (Redis)
    F530 IZapierConnectorService        → QUEUE FABRIC + DATABASE FABRIC (PG)
    F531 IGDriveConnectorService        → DATABASE FABRIC (PG) + CORE FABRIC
    F532 ISalesforceConnectorService    → DATABASE FABRIC (PG) + CORE FABRIC
    F533 IEmailNotificationService      → QUEUE FABRIC + DATABASE FABRIC (ES)
    F534 ISlackConnectorService         → QUEUE FABRIC + CORE FABRIC
    F535 IIntegrationHealthService      → DATABASE FABRIC (ES)
    F536 IIntegrationLogService         → DATABASE FABRIC (ES)
    F537 IIntegrationRateLimitService   → CORE FABRIC (cache)

  Family 71 — AI Add-ons (F538-F547, 10 factories)
    F538 IAiAddonRegistryService        → DATABASE FABRIC (ES)
    F539 IChatbotProvisionService       → AI ENGINE FABRIC + DATABASE FABRIC (PG)
    F540 IChatbotContextService         → RAG FABRIC + DATABASE FABRIC (ES)
    F541 IPredictionModelService        → AI ENGINE FABRIC + DATABASE FABRIC (PG)
    F542 IAutomationTriggerService      → QUEUE FABRIC + DATABASE FABRIC (ES)
    F543 IInsightGeneratorService       → AI ENGINE FABRIC + RAG FABRIC
    F544 IAiAddonConfigService          → DATABASE FABRIC (ES) — FREEDOM layer
    F545 IPromptTemplateService         → DATABASE FABRIC (ES) + AI ENGINE FABRIC
    F546 IAiUsageTrackingService        → DATABASE FABRIC (PG+Redis)
    F547 IAiAddonSandboxService         → DATABASE FABRIC (Redis) + QUEUE FABRIC

  Family 72 — Infrastructure Scaling & Health (F548-F557, 10 factories)
    F548 IAutoScalerService             → QUEUE FABRIC + DATABASE FABRIC (ES+Redis)
    F549 IHealthProbeService            → DATABASE FABRIC (ES) + QUEUE FABRIC
    F550 ICircuitBreakerService         → DATABASE FABRIC (Redis) + QUEUE FABRIC
    F551 IResourceQuotaService          → DATABASE FABRIC (PG+Redis)
    F552 ICapacityPlannerService        → AI ENGINE FABRIC + DATABASE FABRIC (PG)
    F553 ILoadBalancerConfigService     → DATABASE FABRIC (ES) + QUEUE FABRIC
    F554 IIncidentService               → DATABASE FABRIC (ES+PG) + QUEUE FABRIC
    F555 IBackpressureService           → QUEUE FABRIC + DATABASE FABRIC (Redis)
    F556 IGracefulDrainService          → QUEUE FABRIC + DATABASE FABRIC (PG)
    F557 ITenantHealthScorecardService  → DATABASE FABRIC (PG) + AI ENGINE FABRIC

  Family 73 — Enterprise Multi-Tenant (F558-F565, 8 factories)
    F558 ISiloGraduationService         → DATABASE FABRIC (PG) + QUEUE FABRIC
    F559 IRlsPolicyManagerService       → DATABASE FABRIC (PG)
    F560 ISlaMonitorService             → DATABASE FABRIC (ES) + QUEUE FABRIC
    F561 IEnterpriseAuditService        → DATABASE FABRIC (PG WORM + ES)
    F562 IByokService                   → DATABASE FABRIC (PG encrypted)
    F563 IDataResidencyService          → DATABASE FABRIC (PG) + CORE FABRIC
    F564 IComplianceReportService       → DATABASE FABRIC (PG) + AI ENGINE FABRIC
    F565 IEnterpriseOnboardingService   → QUEUE FABRIC + DATABASE FABRIC (PG)

SAVE POINT: FLOW15:P4C:FACTORIES:COMPLETE
RECOVERY: "Load FLOW15_P4C_FACTORIES.md"
```

### Phase P4D: Task Types T193–T210 (Families 68–71) + Templates 39–42

```
DELIVERABLES:
  1. FLOW15_P4D_TASK_TYPES.md           — T193-T210 (18 task types), Templates 39-42

TASK TYPES P4D:
  --- Family 68: Custom Domains & Publishing ---
  T193 Domain Provision Gate            PUBLISHING (NEW)  F510,F511,F512,F513
  T194 SSL Certificate Lifecycle Gate   PROVISIONING      F511,F510,F514,F517
  T195 Blue-Green Deploy Gate           PROVISIONING      F514,F515,F516,F513
  T196 CDN Invalidation Gate            PROVISIONING      F513,F510,F514

  --- Family 69: Analytics & Observability ---
  T197 Analytics Event Ingestion Gate   OBSERVABILITY(NEW) F518,F519,F525
  T198 Metric Rollup & Dashboard Gate   OBSERVABILITY      F519,F520,F522,F524
  T199 Error Tracking & Alert Gate      OBSERVABILITY      F521,F522,F533,F534
  T200 Analytics Retention & Purge Gate OBSERVABILITY      F523,F520,F522

  --- Family 70: External Integrations ---
  T201 Integration Catalog Registration PROVISIONING      F527,F535,F536
  T202 OAuth2 PKCE Exchange Gate        OAUTH (NEW)       F528,F527,F535,F536
  T203 Webhook Relay Ingestion Gate     INGESTION         F529,F535,F536,F537
  T204 Integration Token Refresh Cycle  DURABLE_SAGA      F528,F535,F537
  T205 Multi-Connector Sync Gate        ORCHESTRATION     F530,F531,F532,F536,F537

  --- Family 71: AI Add-ons ---
  T206 AI Chatbot Provision Gate        AI_ADDON (NEW)    F538,F539,F540,F544,F546,F547
  T207 Prediction Model Deploy Gate     AI_ADDON          F538,F541,F544,F546,F547
  T208 Automation Trigger Setup Gate    AI_ADDON          F538,F542,F544,F545,F546,F547
  T209 Insight Generation Gate          AI_ADDON          F538,F543,F544,F546
  T210 AI Usage Metering Gate           METERING          F546,F506,F508

FLOW TEMPLATES P4D:
  Template 39: custom-domain-publish-v1 (T193→T194→T195→T196)
  Template 40: analytics-observe-v1     (T197→T198→T199→T200)
  Template 41: integration-connect-v1   (T201→T202→T203→T204→T205)
  Template 42: ai-addon-inject-v1       (T206→T207→T208→T209→T210)

SAVE POINT: FLOW15:P4D:TASK_TYPES:COMPLETE
RECOVERY: "Load FLOW15_P4D_TASK_TYPES.md"
```

### Phase P4E: Task Types T211–T218 (Families 72–73) + Templates 43–44

```
DELIVERABLES:
  1. FLOW15_P4E_TASK_TYPES.md           — T211-T218 (8 task types), Templates 43-44

TASK TYPES P4E:
  --- Family 72: Infrastructure Scaling & Health ---
  T211 Auto-Scale Orchestrator Gate     SCALING (NEW)     F548,F549,F551,F555,F557
  T212 Circuit Breaker Lifecycle Gate   SCALING           F550,F549,F554,F557
  T213 Blue-Green Rollback Saga         DURABLE_SAGA      F514,F515,F554,F556
  T214 Capacity Planning Gate           SCALING           F552,F548,F551,F553,F557

  --- Family 73: Enterprise Multi-Tenant ---
  T215 Silo Graduation Gate             ENTERPRISE (NEW)  F558,F559,F561
  T216 RLS Policy Enforcement Gate      ENTERPRISE        F559,F561
  T217 Enterprise Onboarding Saga       DURABLE_SAGA      F558,F559,F561,F562,F563,F565,F505
  T218 Compliance & Audit Report Gate   ENTERPRISE        F561,F562,F563,F564

FLOW TEMPLATES P4E:
  Template 43: infra-scale-health-v1    (T211→T212→T213→T214)
  Template 44: enterprise-tenant-v1     (T215→T216→T217→T218)

SAVE POINT: FLOW15:P4E:TASK_TYPES:COMPLETE
RECOVERY: "Load FLOW15_P4E_TASK_TYPES.md"
```

### Phase P5C: BFA Rules CF-234–CF-255 + Stress Tests ST-129–ST-140

```
DELIVERABLES:
  1. FLOW15_P5C_BFA_STRESS.md           — CF-234-CF-255 (22 rules), ST-129-ST-140 (12 tests)

BFA RULES P5C:
  CF-234: Domain global uniqueness (custom domains vs existing DNS)
  CF-235: SSL renewal vs deploy pipeline (certificate rotation timing)
  CF-236: Analytics raw zone vs DWH raw zone (index namespace isolation)
  CF-237: Analytics rollup vs billing metering (aggregation separation)
  CF-238: OAuth tokens vs FLOW-14 credential vault (storage isolation)
  CF-239: Integration webhooks vs DWH webhooks (endpoint discrimination)
  CF-240: AI token usage vs billing metering (consumption tracking)
  CF-241: AI sandbox vs plugin sandbox (container namespace isolation)
  CF-242: Auto-scaler vs resource quota (threshold coordination)
  CF-243: Circuit breaker vs health probe (state machine synchronization)
  CF-244: Blue-green deploy vs snapshot rollback (deployment pipeline)
  CF-245: Silo graduation vs tenant isolation (schema migration safety)
  CF-246: App RLS vs warehouse RLS (policy scope separation)
  CF-247: BYOK rotation vs PII re-encrypt (key rotation coordination)
  CF-248: Enterprise audit vs warehouse audit (log stream separation)
  CF-249: Data residency vs CDN caching (geographic compliance)
  CF-250: Compliance report vs mart build (data freshness)
  CF-251: Enterprise onboarding vs warehouse isolation (provision order)
  CF-252: Plugin AI vs AI add-on registry (feature boundary)
  CF-253: SLA monitor vs health scorecard (metric attribution)
  CF-254: Integration rate limit vs FLOW-14 rate limit (limit pools)
  CF-255: Custom event schema vs FLOW-14 schema registry (namespace)

STRESS TESTS P5C: ST-129–ST-140 (12 tests)
  ST-129: 100 concurrent domain provisions with DNS race conditions
  ST-130: SSL cert renewal during active deploy
  ST-131: Analytics burst 10K events/sec with rollup lag
  ST-132: 50 simultaneous OAuth exchanges + token refresh
  ST-133: AI chatbot token exhaustion during conversation
  ST-134: Auto-scale trigger during circuit breaker open
  ST-135: Silo graduation with active user sessions
  ST-136: RLS policy change during active queries
  ST-137: BYOK rotation during data export
  ST-138: Cross-flow BFA validation (all 15 flows)
  ST-139: Enterprise onboarding full pipeline (workspace→silo→audit)
  ST-140: Multi-tenant isolation verification (all 73 families)

SAVE POINT: FLOW15:P5C:BFA:COMPLETE
RECOVERY: "Load FLOW15_P5C_BFA_STRESS.md"
```

### Phase P6C: Skills SK-111–SK-124 + DD-100–DD-106 + DR-76–DR-82

```
DELIVERABLES:
  1. FLOW15_P6C_SKILLS_DD_DR.md         — SK-111-SK-124, DD-100-DD-106, DR-76-DR-82

SKILL PATTERNS P6C:
  SK-111: Custom Domain + SSL Provision (DNS verify → cert issue → CDN push)
  SK-112: Blue-Green Deploy Gate (snapshot → switch → health verify → rollback)
  SK-113: CDN Config Push (invalidation → propagation → verification)
  SK-114: Analytics Immutable Raw Zone (append-only events → retention purge)
  SK-115: Windowed Metric Rollup (time-bucket aggregation → dashboard refresh)
  SK-116: OAuth2 PKCE Exchange (authorization → token exchange → secure storage)
  SK-117: Integration Webhook Relay + HMAC (verify → relay → acknowledge)
  SK-118: AI Chatbot Context Chain (RAG retrieval → context assembly → generation)
  SK-119: AI Add-on Sandbox Quota (resource allocation → usage tracking → enforcement)
  SK-120: Predictive Auto-Scale Signal (metrics → prediction → scale decision)
  SK-121: Circuit Breaker State Machine (closed → open → half-open transitions)
  SK-122: Silo Schema Graduation (shared → dedicated → migration → verify)
  SK-123: RLS Policy Lifecycle (define → apply → verify → audit)
  SK-124: Enterprise Audit WORM Chain (capture → hash → store → verify chain)

DESIGN DECISIONS P6C:
  DD-100: Custom domains use DNS TXT verification (not CNAME)
  DD-101: Analytics events are immutable, same as DWH raw zone (DR-58 reuse)
  DD-102: OAuth tokens encrypted at rest, separate from FLOW-14 vault
  DD-103: AI add-ons metered separately from platform AI (AF stations)
  DD-104: Auto-scaler uses predictive signals, not just reactive thresholds
  DD-105: Silo graduation is one-way (shared→dedicated, never back)
  DD-106: Enterprise audit uses WORM (Write Once Read Many) append-only

DESIGN RECORDS P6C:
  DR-76: Custom domain provision before SSL (DNS must resolve first)
  DR-77: Analytics raw zone inherits FLOW-14 immutability pattern
  DR-78: Integration webhooks use distinct HMAC keys per connector
  DR-79: AI sandbox containers inherit plugin sandbox isolation model
  DR-80: Circuit breaker transitions are event-sourced via QUEUE FABRIC
  DR-81: RLS policies are tenant-scoped, never cross-tenant
  DR-82: BYOK rotation creates new key version, never overwrites

SAVE POINT: FLOW15:P6C:SKILLS:COMPLETE
RECOVERY: "Load FLOW15_P6C_SKILLS_DD_DR.md"
```

### Phase P7C: Session State Update + Canonical Merge

```
DELIVERABLES:
  1. FLOW15_P7C_SESSION_STATE.md         — Updated global state, validation matrix
  2. 7 canonical merged files (this merge operation)

MERGE OPERATIONS:
  ENGINE_ARCHITECTURE_MERGED.md    ← +F466-F565 (Families 60-73)     = 17,990 lines
  TASK_TYPES_CATALOG_MERGED.md     ← +T179-T218, Templates 36-44     = 14,815 lines
  V62_BFA_STRESS_TEST_MERGED.md    ← +CF-214-CF-255, ST-104-ST-140   = 8,636 lines
  SKILLS_FACTORY_RAG_MERGED.md     ← +SK-99-SK-124                   = 5,410 lines
  UNIFIED_SOURCE_INDEX_MERGED.md   ← +DD-86-DD-106, DR-66-DR-82      = 2,911 lines
  MASTER_EXECUTION_PLAN_MERGED.md  ← +FLOW-15 execution plan         = this file
  SESSION_STATE_MERGE.md           ← +FLOW-15 complete state         = updated

SAVE POINT: FLOW15:MERGE:COMPLETE ✅
```

## FLOW-15 KEY INVARIANTS

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-15-1 | App workspace scoped per tenantId | DNA-5, CF-214, F466 |
| INV-15-2 | NLP spec stored as Dictionary (DNA-1) | DNA-1, IR-180-1, F470 |
| INV-15-3 | All generated scaffold extends MicroserviceBase | DNA-4, IR-183-1 |
| INV-15-4 | GitHub sync cursor in PostgreSQL (never Redis) | DR-92, IR-185-1 |
| INV-15-5 | Plugin sandbox containers isolated per tenant | CF-225, DR-79, F497 |
| INV-15-6 | Subscription state machine has no backward transitions | DR-71, IR-191-2 |
| INV-15-7 | Custom domain DNS verified before SSL issuance | DR-76, CF-234, IR-193-1 |
| INV-15-8 | Analytics events immutable (append-only, like DWH raw) | DR-77, CF-236, SK-114 |
| INV-15-9 | OAuth tokens encrypted at rest, separate vault | DD-102, CF-238, F528 |
| INV-15-10 | AI add-on metering separate from platform metering | DD-103, CF-240, F546 |
| INV-15-11 | Auto-scaler coordinates with resource quotas | CF-242, IR-211-3, F548+F551 |
| INV-15-12 | Silo graduation one-way (shared→dedicated) | DD-105, CF-245, IR-215-1 |
| INV-15-13 | RLS policies never cross tenant boundaries | DR-81, CF-246, DNA-5 |
| INV-15-14 | BYOK rotation creates new version, never overwrites | DR-82, CF-247, IR-218-3 |
| INV-15-15 | All queries include tenantId (DNA-5) | DNA-5, all CF rules, global |

## FLOW-15 BACKWARD COMPATIBILITY CHECK

```
F1-F465:     UNCHANGED ✅ (565 - 100 = 465 pre-existing)
T1-T178:     UNCHANGED ✅ (218 - 40 = 178 pre-existing)
Tpl 1-35:    UNCHANGED ✅ (44 - 9 = 35 pre-existing)
CF-1-213:    UNCHANGED ✅ (255 - 42 = 213 pre-existing)
ST-1-103:    UNCHANGED ✅ (140 - 37 = 103 pre-existing)
SK-1-98:     UNCHANGED ✅ (124 - 26 = 98 pre-existing)
DD-1-85:     UNCHANGED ✅ (106 - 21 = 85 pre-existing)
DR-1-65:     UNCHANGED ✅ (82 - 17 = 65 pre-existing)
DNA-1-9:     STABLE ✅ (no new patterns)
EP-1-5:      STABLE ✅ (EP-4 reused in T215, T217)
```

## FLOW-15 RECOVERY COMMANDS

```
Load full FLOW-15 state:      "Load FLOW15_P7C_SESSION_STATE.md"
Resume from P4A:              "Load FLOW15_P4A_ALL_RECONSTRUCTED.md"
Resume from P4B:              "Load FLOW15_P4B_TASK_TYPES.md"
Resume from P4C:              "Load FLOW15_P4C_FACTORIES.md"
Resume from P4D:              "Load FLOW15_P4D_TASK_TYPES.md"
Resume from P4E:              "Load FLOW15_P4E_TASK_TYPES.md"
Resume from P5C:              "Load FLOW15_P5C_BFA_STRESS.md"
Resume from P6C:              "Load FLOW15_P6C_SKILLS_DD_DR.md"
Review plan:                  "Load FLOW15_P4C_PLAN_P0.md"
Start FLOW-16:                "Start FLOW-16 from F566, T219, CF-256"
```

---
## SAVE POINT: FLOW15:MERGE:P7C ✅
## Phase 7c COMPLETE: FLOW-15 execution plan merged


# ═══════════════════════════════════════════════════════════════════════════════
# FLOW-16 — GIANT SHOP MARKETPLACE PLATFORMS — EXECUTION PLAN
# Date: 2026-02-27 | Status: COMPLETE ✅
# ═══════════════════════════════════════════════════════════════════════════════

## FLOW-16 OVERVIEW

**Domain**: Amazon/AliExpress-class Multi-Sided Marketplace
**Family**: Family 74 — Giant Shop Marketplace Core
**Factories**: F566–F579 (14 new)
**Task Types**: T219–T226 (8 new)
**Template**: Template 45 (giant-shop-marketplace-v1)
**BFA Rules**: CF-256–CF-269 (14 new)
**Stress Tests**: ST-141–ST-148 (8 new)
**Skills**: SK-125–SK-132 (8 new)
**Design Decisions**: DD-107–DD-115 (9 new)
**Design Records**: DR-83–DR-88 (6 new)

## KEY INNOVATIONS IN FLOW-16

1. **Saga-Grade Transactions**: First flow with explicit multi-day compensation chains
   (T221: Cart→Order, T222: Payment Escrow, T223: Fulfillment, T225: Payout)
2. **Two-Actor BFA Rules**: First buyer/seller conflict rules (CF-262, CF-265)
3. **Financial Event Durability**: Mandates EP-5 outbox for all financial events
4. **AI Policy Enforcement**: First use of AI ENGINE FABRIC for compliance (not content gen)
5. **Idempotency-First Financial Ops**: EP-4 reuse with marketplace-specific TTL policies

## PHASE EXECUTION LOG

| Phase | Content | Artifacts | Status |
|-------|---------|-----------|--------|
| P0 | Plan + RAG + validation + examples | FLOW16_P0_PLAN.md | ✅ |
| P1 | Engine Architecture (F566-F579) | → ENGINE_ARCHITECTURE_MERGED.md | ✅ |
| P2 | Task Types (T219-T226, Template 45) | → TASK_TYPES_CATALOG_MERGED.md | ✅ |
| P3 | BFA + Stress (CF-256-269, ST-141-148) | → V62_BFA_STRESS_TEST_MERGED.md | ✅ |
| P4 | Skills + DD + DR | → SKILLS + UNIFIED_SOURCE_INDEX | ✅ |
| P5 | Session State + Exec Plan | → SESSION_STATE + MASTER_PLAN | ✅ |
| P6 | Validation + Final Assembly | All 7 merged files | ✅ |

## CROSS-FLOW DEPENDENCIES

| FLOW-16 Artifact | Depends On | Relationship |
|-----------------|------------|--------------|
| T226 (Discovery Ranking) | FLOW-07 F234 | Read-only via RAG FABRIC (CF-268) |
| T219-T226 (all) | FLOW-08 EP-4/EP-5 | Reuses engine primitives |
| F566-F579 (all) | FLOW-08 Tenant Control Plane | tenantId scoping via DNA-5 |
| T220 (Listing Moderation) | FLOW-15 AI Add-ons | Shares AI ENGINE FABRIC patterns |
| CF-256-CF-269 | FLOW-01 through FLOW-15 | Cross-flow conflict checks |

## BACKWARD COMPATIBILITY

```
F1–F565:     UNCHANGED ✅
T1–T218:     UNCHANGED ✅
CF-1–CF-255: UNCHANGED ✅
ST-1–ST-140: UNCHANGED ✅
SK-1–SK-124: UNCHANGED ✅
DD-1–DD-106: UNCHANGED ✅
DR-1–DR-82:  UNCHANGED ✅
Tpl 1–44:    UNCHANGED ✅
DNA-1–DNA-9: STABLE ✅ (DNA-9 extended to marketplace domain)
EP-1–EP-5:   STABLE ✅ (EP-4, EP-5 reused, not modified)
```

## RECOVERY COMMANDS

```
Load FLOW-16 state:     "Load SESSION_STATE — engine is at F579/T226/CF-269"
Resume from Phase X:    "Load FLOW16_P0_PLAN.md — resume from Phase X"
Check marketplace BFA:  "Load CF-256–CF-269 for marketplace conflict rules"
Check marketplace skills: "Load SK-125–SK-132 for marketplace patterns"
Full reload:           "Load all 7 merged files — FLOW-01 through FLOW-16 complete"
```

---

## SAVE POINT: FLOW16:EXEC_PLAN_COMPLETE ✅


---

# ═══════════════════════════════════════════════════════
# FLOW-17 — FREELANCER MARKETPLACE PLATFORM
# Master Execution Plan + AF Station Mapping + BFA Registration
# ═══════════════════════════════════════════════════════


---

## PHASE MAP (Recovery Reference)

| Phase | File | Save Point | Content |
|-------|------|------------|---------|
| P1 | 17_freelancers_platforms_ENGINE_ARCHITECTURE.md | FLOW17:P1:ENGINE_ARCHITECTURE ✅ | F580–F630, Families 75–83, DNA checks |
| P2 | 17_freelancers_platforms_TASK_TYPES_CATALOG.md | FLOW17:P2:TASK_TYPES ✅ | T227–T246, AF maps, Templates 46–49 |
| P3 | 17_freelancers_platforms_V62_BFA_STRESS_TEST.md | FLOW17:P3:BFA_STRESS_TEST ✅ | CF-270–CF-294, ST-149–ST-163 |
| P4 | 17_freelancers_platforms_SKILLS_FACTORY_RAG.md | FLOW17:P4:SKILLS_FACTORY_RAG ✅ | SK-133–SK-144, AF-4 RAG index |
| P5 | 17_freelancers_platforms_UNIFIED_SOURCE_INDEX.md | FLOW17:P5:UNIFIED_SOURCE_INDEX ✅ | DD-116–DD-129, DR-89–DR-98 |
| **P6** | **17_freelancers_platforms_MASTER_EXECUTION_PLAN.md** | **FLOW17:P6:MASTER_PLAN ✅** | **This file** |

---

## FLOW-17 DELTA SUMMARY

```
BEFORE (Post-FLOW-16):
  Factories:      F1–F579     (579 total)
  Families:       1–74        (74 total)
  Task Types:     T1–T226     (226 total)
  Templates:      1–45        (45 total)
  BFA Rules:      CF-1–CF-269 (269 total)
  Stress Tests:   ST-1–ST-148 (148 total)
  Skill Patterns: SK-1–SK-132 (132 total)
  Design Decs:    DD-1–DD-115 (115 total)
  Design Records: DR-1–DR-88  (88 total)

AFTER (Post-FLOW-17):
  Factories:      F1–F630     (+51)   → Families 75–83 (F580–F630)
  Task Types:     T1–T246     (+20)   → T227–T246
  Templates:      1–39        (+4)    → Templates 46–49
  BFA Rules:      CF-1–CF-294 (+25)   → CF-270–CF-294
  Stress Tests:   ST-1–ST-163 (+15)   → ST-149–ST-163
  Skill Patterns: SK-1–SK-144 (+12)   → SK-133–SK-144
  Design Decs:    DD-1–DD-129 (+14)   → DD-116–DD-129
  Design Records: DR-1–DR-98  (+10)   → DR-89–DR-98
```

---

## FLOW-17 NEW ARCHETYPES

| Archetype | First Task Type | Description |
|-----------|----------------|-------------|
| ESCROW_SAGA | T236 | Multi-step durable saga with financial compensation |
| EVIDENCE_CAPTURE | T243 | Periodic durable timer-triggered evidence harvest |
| REPUTATION | T245 | Aggregated signal computation from immutable review journals |
| ENTERPRISE_COMPLIANCE | T242, T246 | Multi-gate policy + KYC + classification validation |

---

## AF STATION MAPPING — FLOW-17 OPERATION

### How each AF station operates on FLOW-17 task types

---

#### AF-1 (Genesis) — Code Generation from Spec

For every FLOW-17 task type (T227–T246), AF-1 generates services that:
- Extend `MicroserviceBase` (SK-379 (MicroserviceBase) — CORE FABRIC, DNA-4)
- Call factories via `CreateAsync(FactoryResolutionContext)`, never direct imports
- Return `DataProcessResult[dict[str, Any]]` — never throw for business logic (DNA-3)
- Use `parse_document` for all incoming payloads (DNA-1)
- Scope every DB query with `tenantId` (DNA-5)
- Never emit to queue directly — always through `IQueueService.EnqueueAsync()` (QUEUE FABRIC)

Key generation patterns by domain:
```
T227–T233 (Marketplace):    AF-1 generates JobService, ProposalService on DATABASE + AI ENGINE + RAG FABRIC
T234–T241 (Contract/Escrow): AF-1 generates saga orchestrators on DATABASE + QUEUE FABRIC (SK-137, SK-142)
T242–T244 (Compliance/IP):   AF-1 generates gate services on DATABASE + AI ENGINE FABRIC (SK-141)
T245–T246 (Analytics):       AF-1 generates aggregation services on DATABASE FABRIC append-only patterns (SK-144)
```

---

#### AF-2 (Planning) — Step Decomposition

AF-2 decomposes each FLOW-17 task type into execution steps, paying special attention to:

| Task Type | Planning Note |
|-----------|--------------|
| T231 (Proposal Submission) | Split: token balance check → deduct (idempotent) → proposal store → index |
| T234 (Contract Offer) | Split: contract create → BFA check → KYC gate → terms lock |
| T236 (Milestone Funding) | Split saga: create → fee calc → hold (idempotent) → ledger journal → emit |
| T239 (Dispute Open) | Split: atomic dispute + hold in one transaction → notify → evidence init |
| T243 (Work Evidence) | Split: timer tick → capture → store ref → evidence package → access check |

For ESCROW_SAGA archetypes, AF-2 generates explicit compensation steps for each forward step.

---

#### AF-3 (Prompt Library) — Domain-Specific Prompts

FLOW-17 prompt categories registered in AF-3:

| Category | Trigger | Example Prompts |
|----------|---------|-----------------|
| `marketplace.job_enrich` | T227, SK-133 | "Extract skill taxonomy from: {job_description}" |
| `marketplace.proposal_rank` | T233, SK-135 | "Score proposal fit for job requirements: {requirements}, {proposal}" |
| `compliance.kyc_assess` | T242, SK-141 | "Evaluate worker classification risk for contract: {contract_details}" |
| `reputation.review_extract` | T245, SK-144 | "Identify sentiment signals from review text: {review_text}" |

All prompts stored as `dict[str, Any]` in ES prompt index — no hardcoded strings.

---

#### AF-4 (RAG — Task Context) — Skill Pattern Retrieval

FLOW-17 AF-4 retrieval table (new SK-133–SK-144 + most relevant prior skills):

| Generating Task | Top AF-4 Results | Rationale |
|----------------|-----------------|-----------|
| T227 (Job Enrich) | SK-133, SK-37 (FLOW-09 search) | Multi-model AI enrichment + ES taxonomy search |
| T228 (Publish Gate) | SK-134, SK-38 | Idempotent outbox publish + search index |
| T229 (Talent Match) | SK-135, SK-44 (FLOW-10) | RAG strategy matching + scoring |
| T231 (Proposal Sub.) | SK-136, SK-56 (FLOW-11 payment) | Idempotent token spend + wallet |
| T234–T238 (Contract) | SK-137, SK-138, SK-142 | Escrow saga + ledger + multi-aggregate |
| T239–T241 (Dispute) | SK-139, SK-138 | Dispute hold + immutable ledger |
| T242–T243 (Compliance) | SK-141, SK-140 | KYC gate + work evidence capture |
| T244 (Contest) | SK-143, SK-138 | IP transfer + immutable record |
| T245 (Reputation) | SK-144, SK-37 | Reputation aggregation + ES index |

---

#### AF-5 (Multi-Model Orchestration) — Competing Models

For FLOW-17 AI-intensive steps, AF-5 dispatches parallel models via AiDispatcher (SK-386 (AiDispatcher)):

| Task Type | Models Dispatched | Consensus Strategy |
|-----------|------------------|-------------------|
| T227 (Job Enrich) | Claude + GPT-4o | Skill present in ≥2 models = confirmed |
| T229 (Talent Match scores) | Claude + Gemini | Average score across providers |
| T242 (Classification risk) | Claude + GPT-4o | Conservative: take higher risk rating |
| T233 (Proposal rank) | Claude + GPT-4o | Weighted average with feedback loop (AF-11) |

Non-AI steps (T231 token spend, T236 escrow saga) bypass AF-5 — deterministic, not AI-generated.

---

#### AF-6 (Code Review) — Automated Review

AF-6 checks FLOW-17 generated services for:
- All factory calls use `CreateAsync()`, no direct provider instantiation
- No direct `throw` for business logic (DataProcessResult wraps all errors)
- All DB queries include `tenantId` filter
- No typed model classes (only `dict[str, Any]`)
- Saga steps each have compensation handler registered before execution

FLOW-17-specific review gates:
- `IEscrowLedgerService`: No UPDATE/DELETE allowed — INSERT only (SK-138)
- `IReviewJournalService`: UNIQUE constraint on (contractId, reviewerId) enforced
- `IIPTransferService`: No UPDATE after CERTIFIED status

---

#### AF-7 (Compliance) — DNA Pattern Enforcement

DNA compliance checks for every FLOW-17 generated file:

| DNA Law | FLOW-17 Application |
|---------|-------------------|
| DNA-1 (parse_document) | Job docs, proposal docs, contract docs — all Dictionary, no typed models |
| DNA-2 (build_search_filter) | Profile search, job search, talent match — all empty-field-skipping |
| DNA-3 (DataProcessResult) | Insufficient tokens, KYC failed, escrow conflict — all Result, never throw |
| DNA-4 (MicroserviceBase) | Every new service (F580–F630) extends MicroserviceBase |
| DNA-5 (Scope Isolation) | tenantId on every ES query, PG query, ledger row |
| DNA-6 (DynamicController) | No IJobController, IContractController — all via DynamicController |

Additional FLOW-17 DNA patterns (from DD-116–DD-126):
- Immutable ledger pattern (SK-138): no UPDATE on financial tables
- Idempotency key pattern (SK-136, SK-134): all financial + publish operations

---

#### AF-8 (Security) — Security Scan

FLOW-17 security gates:

| Gate | Enforcement |
|------|------------|
| Token wallet float-spend | Idempotency key UNIQUE at DB level (SK-136) |
| Escrow fund release | CF-276 requires milestone status = COMPLETED |
| Work diary access | Restricted to contract parties only (CF-292) |
| Screenshot content | External ref only — no raw binary in ES (CF-293) |
| KYC expiry | KYC status checked at contract activation, not just at KYC submission |
| IP transfer | No prize release without F630 CERTIFIED status (CF-283) |

---

#### AF-9 (Judge — Quality Context) — Iron Rule Validation

AF-9 validates FLOW-17 generated code against all applicable Iron Rules.
Key quality gates by domain:

| Domain | Critical QG | Failure = |
|--------|------------|-----------|
| Marketplace | QG-227-1: Skill confidence ≥ threshold before publish | BUILD FAILURE |
| Token economy | QG-231-1: Balance check before deduction, idempotency key present | BUILD FAILURE |
| Escrow | QG-236-1: Compensation handler for every saga step | BUILD FAILURE |
| Compliance | QG-235-1: KYC status = VERIFIED before contract activation | BUILD FAILURE |
| Dispute | QG-239-1: Dispute + hold in single DB transaction (atomic) | BUILD FAILURE |
| Reputation | QG-245-1: Review journal append-only, score derived not stored | BUILD FAILURE |

---

#### AF-10 (Merge) — Multi-Model Output Combination

For FLOW-17 AI outputs:
- Job enrichment: consensus merge — skill present in ≥2 models = confirmed tag
- Proposal ranking: weighted average merge — weights from FREEDOM config
- Classification risk: conservative merge — use highest risk rating across models
- Review sentiment: majority vote — signal present in ≥2 models

All merge results stored in ES via AiDispatcher result store, linked to traceId for AF-11 feedback loop.

---

#### AF-11 (Feedback) — Generation Quality Storage

FLOW-17 feedback signals stored for continuous improvement:

| Signal | Source | Injected Into |
|--------|--------|--------------|
| Proposal acceptance rate | Contract created after proposal | T233 ranking quality score |
| Job fill rate | Contract created within N days | T227 enrichment quality score |
| Dispute rate per contract | Dispute opened | T234 contract quality |
| Review volume and score | T245 reviews | T229 matching quality |

AF-11 stores feedback as `dict[str, Any]` in ES feedback index.
AiDispatcher (SK-386 (AiDispatcher)) injects top-scoring patterns into future prompts via PromptContextBuilder.

---

## BFA REGISTRATION — FLOW-17 NEW ENTITIES, EVENTS, APIS

These must be indexed in BFA registry before FLOW-17 services deploy:

### New Entity Types (BFA index: `bfa_entities`)
```
job              tenantId, jobId, status, skills[], clientId
proposal         tenantId, proposalId, jobId, freelancerId, tokens_spent
contract         tenantId, contractId, jobId, proposalId, status
milestone        tenantId, milestoneId, contractId, status, escrow_state
escrow_ledger    tenantId, milestoneId, entry_type, amount (append-only)
dispute          tenantId, disputeId, contractId, milestoneId, status
work_diary_slot  tenantId, contractId, slotStart, slotEnd, activityCount
review_journal   tenantId, contractId, freelancerId, rating, created_at
ip_transfer      tenantId, contestId, winnerId, status (CERTIFIED = immutable)
```

### New Domain Events (BFA index: `bfa_events`)
```
job.created              → T227 output
job.enriched             → T227 output → T228 trigger
job.published            → T228 output → T229 trigger
talent.matched           → T229 output
invite.sent              → T230 output
proposal.submitted       → T231 output
proposal.boosted         → T232 output (optional)
proposal.shortlisted     → T233 output → contract flow trigger
contract.offered         → T234 output
contract.activated       → T235 output
milestone.funded         → T236 output → T243 trigger (periodic)
milestone.submitted      → T237 output → T238 trigger
milestone.released       → T238 output
milestone.refunded       → T238 output (alternate path)
dispute.opened           → T239 output
evidence.packaged        → T240 output
dispute.resolved         → T241 output
kyc.verified             → T242 output
work_diary.slot.captured → T243 output (periodic)
contest.winner.awarded   → T244 output
ownership.transferred    → T244 output → prize release trigger
reputation.updated       → T245 output
compliance.report.ready  → T246 output
```

### New API Surfaces (BFA index: `bfa_apis`)
```
POST /jobs                   → F587 CreateJobAsync
PUT  /jobs/{id}/publish      → F587 PublishJobAsync (gate: T228)
GET  /jobs/match             → F590 MatchTalentAsync
POST /proposals              → F593 SubmitProposalAsync (gate: T231 — token check)
POST /proposals/{id}/boost   → F594 BoostProposalAsync
POST /contracts              → F599 CreateContractAsync
PUT  /contracts/{id}/activate → F601 ActivateContractAsync (gate: T235)
POST /milestones/{id}/fund   → F606 FundMilestoneAsync (gate: T236)
POST /milestones/{id}/submit → F613 SubmitDeliverableAsync (gate: T237)
POST /milestones/{id}/release → F606 ReleaseFundsAsync (gate: T238)
POST /disputes               → F616 OpenDisputeAsync (gate: T239 — atomic hold)
POST /disputes/{id}/resolve  → F620 ResolveDisputeAsync (gate: T241)
GET  /work-diary/{contractId} → F611 GetWorkDiaryAsync (access: contract parties only)
POST /contests/{id}/handover → F597 InitiateHandoverAsync (gate: T244)
GET  /reputation/{freelancerId} → F581 GetReputationSummaryAsync
```

---

## CROSS-FLOW DEPENDENCY MAP

### FLOW-17 depends on:

| Flow | Dependency | Gate Event |
|------|-----------|------------|
| FLOW-01 (User Registration) | User must be onboarded before creating freelancer/client profile | UserOnboardingCompleted |
| FLOW-08 (Multi-tenant) | Tenant isolation fabric — F461 ITenantWarehouseIsolationService pattern | TenantProvisioned |
| FLOW-11 (Commerce) | Payment processing for escrow funding — F606 calls underlying payment fabric | PaymentMethodActive |
| FLOW-14 (DWH) | Compliance reports (T246) pull data from warehouse marts — F627 IEnterpriseReportService | WarehouseReady |

### Downstream flows that depend on FLOW-17:

| Downstream | What It Needs | Provided By |
|-----------|--------------|-------------|
| Any future review aggregation | Immutable review_journal | T245 / F581 |
| Any future compliance audit | KYC records + audit log | T242 / F626 |
| Any future analytics flow | Job/contract/reputation events | All T227–T246 events |

---

## FLOW-17 IRON RULES SUMMARY (Non-negotiable across all task types)

| ID | Rule | Enforcement |
|----|------|-------------|
| IR-15-1 | No contract activation without KYC = VERIFIED | T235, T242, CF-275 |
| IR-15-2 | No proposal without sufficient token balance | T231, CF-277 |
| IR-15-3 | No escrow release without milestone status = COMPLETED | T238, CF-276 |
| IR-15-4 | No prize release without F630 CERTIFIED IP transfer | T244, CF-283 |
| IR-15-5 | Dispute open + escrow hold = single atomic transaction | T239, CF-284 |
| IR-15-6 | All ledger writes append-only — no UPDATE/DELETE | SK-138, CF-278 |
| IR-15-7 | Work diary: screenshot = external ref only (no inline binary) | T243, CF-293 |
| IR-15-8 | Work diary: access restricted to contract parties | T243, CF-292 |
| IR-15-9 | Token spend always idempotency-key protected | SK-136, CF-278 |
| IR-15-10 | All financial entries include tenantId (DNA-5) | DNA-5, CF-294 |

---

## FLOW TEMPLATE EXECUTION PATHS

### Template 46 — marketplace-v1 (Job → Shortlist)
```
T227 (enrich) → T228 (publish) → T229 (match) → T230 (invite) →
T231 (propose) → T232 (boost, optional) → T233 (shortlist) → [contract-escrow-v1]
```

### Template 47 — contract-escrow-v1 (Contract → Release)
```
T234 (offer) → T242 (KYC gate) → T235 (activate) → T236 (fund milestone) →
T243 (work evidence, periodic) → T237 (submit deliverable) →
T238 (review + release) → [dispute-resolution-v1 if disputed]
```

### Template 48 — dispute-resolution-v1
```
T239 (open + hold) → T240 (evidence package) → T241 (arbitrate + resolve)
```

### Template 49 — enterprise-compliance-v1
```
T242 (KYC + classification) → T245 (reputation update) → T246 (compliance report)
```

---

## BACKWARD COMPATIBILITY CHECK

```
F1–F465:    UNCHANGED ✅  (pre-FLOW-17 factories, all families 1–74        intact)
T1–T178:    UNCHANGED ✅  (pre-FLOW-17 task types, all AF maps preserved)
Tpl 1–35:   UNCHANGED ✅  (pre-FLOW-17 flow templates)
CF-1–CF-213: UNCHANGED ✅ (pre-FLOW-17 BFA conflict rules)
ST-1–ST-103: UNCHANGED ✅ (pre-FLOW-17 stress tests)
SK-1–SK-98:  UNCHANGED ✅ (pre-FLOW-17 skill patterns)
DD-1–DD-85:  UNCHANGED ✅ (pre-FLOW-17 design decisions)
DR-1–DR-65:  UNCHANGED ✅ (pre-FLOW-17 design records)
DNA-1–DNA-9: STABLE ✅   (no new DNA laws — FLOW-17 adds immutable ledger as named pattern, not new law)
EP-1–EP-5:   STABLE ✅   (EP-4 cursor/state persist consumed again by T236 saga; no new EPs)
```

---

## UPDATED SESSION STATE — POST FLOW-17

```
FACTORIES:        F1–F630     (516 total, Families 1–68)
TASK TYPES:       T1–T246     (198 total)
FLOW TEMPLATES:   1–39        (39 total)
BFA CONFLICT:     CF-1–CF-294 (238 rules)
STRESS TESTS:     ST-1–ST-163 (118 total)
SKILL PATTERNS:   SK-1–SK-144 (110 total)
DESIGN DECISIONS: DD-1–DD-129  (99 total)
DESIGN RECORDS:   DR-1–DR-98  (75 total)
IRON RULES:       ~1,564      (+160: 8 per T × 20 task types)
QUALITY GATES:    ~1,340      (+120: 6 per T × 20 task types)
AF STATION CELLS: ~2,178      (+220: 11 stations × 20 task types)
DNA COMPLIANCE:   ~2,320      (+200 from FLOW-17)
METHODS:          ~2,430      (+200 from FLOW-17)
```

---

## RECOVERY COMMANDS

```
Resume FLOW-17 review:       "All FLOW-17 phases complete. Load SESSION_STATE and review FLOW-17"
Reload marketplace skills:   "Load SK-133–SK-144 for freelancer marketplace patterns"
Check escrow rules:          "Load CF-270–CF-294 for marketplace conflict rules"
Load FLOW-17 task types:     "Load T227–T246 engine contracts"
Load FLOW-17 factories:      "Load F580–F630 factory definitions, Families 75–83"
Check design records:        "Load DR-89–DR-98 for marketplace design records"
Start FLOW-16:               "Start FLOW-16 from F517, T199, CF-239 — see SESSION_STATE"
Merge FLOW-17 into canonical: "Start P7 — merge 17_freelancers_platforms_*.md into 7 canonical files"
```

---

## NEXT FLOW STARTING POINTS

```
FLOW-16: F517+ | T199+ | CF-239+ | ST-119+ | SK-111+ | DD-100+ | DR-76+ | Template 40+ | Family 69+
```

---

## SAVE POINT: FLOW17:P6:MASTER_PLAN ✅
## FLOW-17 COMPLETE ✅
## Next: Merge into canonical 7 files (P7), OR start FLOW-16

---

## BACKWARD COMPATIBILITY — FLOW-17

```
F1-F579:     UNCHANGED ✅ (630 - 51 = 579 pre-existing)
T1-T226:     UNCHANGED ✅ (246 - 20 = 226 pre-existing)
Tpl 1-45:    UNCHANGED ✅ (49 - 4 = 45 pre-existing)
CF-1-269:    UNCHANGED ✅ (294 - 25 = 269 pre-existing)
ST-1-148:    UNCHANGED ✅ (163 - 15 = 148 pre-existing)
SK-1-132:    UNCHANGED ✅ (144 - 12 = 132 pre-existing)
DD-1-115:    UNCHANGED ✅ (129 - 14 = 115 pre-existing)
DR-1-88:     UNCHANGED ✅ (98 - 10 = 88 pre-existing)
DNA-1-9:     STABLE ✅ (no new DNA patterns — token ledger/escrow use existing patterns)
EP-1-5:      STABLE ✅ (EP-2/EP-4/EP-5 reused in FLOW-17, not modified)
```

## RECOVERY COMMANDS

```
Load FLOW-17 state:     "Load SESSION_STATE — engine is at F630/T246/CF-294"
Resume from Phase X:    "Load FLOW17_P0_PLAN.md — resume from Phase X"
Check freelancer BFA:   "Load CF-270–CF-294 for freelancer conflict rules"
Check freelancer skills:"Load SK-133–SK-144 for freelancer marketplace patterns"
Check escrow patterns:  "Load SK-137 (Escrow Saga with Compensation)"
Check token economy:    "Load SK-136 (Idempotent Token Spend Pattern)"
Full reload:            "Load all 7 merged files — FLOW-01 through FLOW-17 complete"
```

---

## SAVE POINT: FLOW17:P6:MASTER_PLAN ✅


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FLOW-18 — MASTER EXECUTION PLAN
# Visual Flow Creation & Code Injection Engine
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## FLOW-18 EXECUTIVE SUMMARY

**What**: User-facing visual flow designer + AI code generation + sandbox testing + marketplace + promotion pipeline
**Why**: FLOW-15 built the engine room (machinery that CAN create flows). FLOW-18 builds the driver's seat (interface where users ACTUALLY create flows).
**Size**: 66 factories (F631-F696), 22 task types (T247-T268), 10 families (84-93), 6 templates (50-55), 34 BFA rules, 20 stress tests, 16 skills

## NUMBERING SUMMARY

| Artifact | Range | Count |
|----------|-------|-------|
| Factories | F631–F696 | 66 |
| Families | 84–93 | 10 |
| Task Types | T247–T268 | 22 |
| Templates | 50–55 | 6 |
| BFA Rules | CF-295–CF-328 | 34 |
| Stress Tests | ST-164–ST-183 | 20 |
| Skills | SK-145–SK-160 | 16 |
| Design Decisions | DD-130–DD-148 | 19 |
| Design Records | DR-99–DR-110 | 12 |
| Iron Rules | IR-247 through IR-268 | ~88 (4 avg per task type) |
| Quality Gates | QG-247 through QG-268 | ~66 (3 avg per task type) |
| AF Station Cells | 22 × 11 | 242 |
| DNA Compliance Checks | 66 × 9 | 594 |

## NEW ARCHETYPES
- VISUAL_CREATION (T247-T250, T259-T261, T265-T266)
- CODE_INJECTION (T251-T254, T267-T268)
- SANDBOX_TEST (T255-T258)
- COLLABORATION (T262-T264)

---

## EXECUTION PHASES

### P0 — Flow Canvas & Node Palette (Families 84–85, ~30 min)
```
Factories: F631–F642 (12)
Task Types: T247–T250 (4)
Skills: SK-145, SK-146, SK-147
Design Decisions: DD-130, DD-131, DD-132, DD-133
Design Records: DR-99, DR-100, DR-101
BFA Rules: CF-295–CF-301 (7)
Stress Tests: ST-164–ST-166 (3)

Save: "Resume FLOW-18 from P1 — F631-F642 complete, T247-T250 done, start F643"
```

### P1 — Node Code Generation Pipeline (Family 86, ~30 min)
```
Factories: F643–F651 (9)
Task Types: T251–T254 (4)
Skills: SK-148, SK-149, SK-150, SK-151
Design Decisions: DD-133, DD-134, DD-135, DD-136
Design Records: DR-102, DR-104
BFA Rules: CF-302–CF-309 (8)
Stress Tests: ST-167–ST-169 (3)

Save: "Resume FLOW-18 from P2 — F631-F651 complete, T247-T254 done, start F652"
```

### P2 — Sandbox Execution & Testing (Family 87, ~30 min)
```
Factories: F652–F659 (8)
Task Types: T255–T258 (4)
Skills: SK-152, SK-153, SK-154, SK-155
Design Decisions: DD-137, DD-138
Design Records: DR-103
BFA Rules: CF-310–CF-316 (7)
Stress Tests: ST-170–ST-172 (3)

Save: "Resume FLOW-18 from P3 — F631-F659 complete, T247-T258 done, start F660"
```

### P3 — Fabric-First UI Layer (Family 88, ~25 min)
```
Factories: F660–F667 (8)
Task Types: T259–T261 (3)
Skills: SK-156, SK-157, SK-158
Design Decisions: DD-145, DD-146
Design Records: DR-105, DR-106
BFA Rules: CF-317–CF-319 (3)
Stress Tests: None (UI tested via integration in P9)

Save: "Resume FLOW-18 from P4 — F631-F667 complete, T247-T261 done, start F668"
```

### P4 — Collaborative Editing (Family 89, ~25 min)
```
Factories: F668–F673 (6)
Task Types: T262–T264 (3)
Skills: SK-159, SK-160
Design Decisions: DD-139
Design Records: DR-107
BFA Rules: CF-320–CF-325 (6)
Stress Tests: ST-173–ST-175 (3)

Save: "Resume FLOW-18 from P5 — F631-F673 complete, T247-T264 done, start F674"
```

### P5 — Flow Marketplace & Templates (Family 90, ~25 min)
```
Factories: F674–F680 (7)
Task Types: T265–T266 (2)
Skills: reuse SK-134 (Idempotent Publish)
Design Decisions: DD-140, DD-141
Design Records: DR-108
BFA Rules: CF-326–CF-328 (3)
Stress Tests: ST-176–ST-178 (3)

Save: "Resume FLOW-18 from P6 — F631-F680 complete, T247-T266 done, start F681"
```

### P6 — Promotion Pipeline (Family 91, ~25 min)
```
Factories: F681–F687 (7)
Task Types: T267–T268 (2)
Skills: SK-150 (extended from P1)
Design Decisions: DD-142, DD-143
Design Records: DR-109
BFA Rules: CF-306, CF-307, CF-315 (reused from earlier groups)
Stress Tests: ST-179–ST-181 (3)

Save: "Resume FLOW-18 from P7 — F631-F687 complete, T247-T268 done, start F688"
```

### P7 — Version Control & Git Integration (Family 92, ~20 min)
```
Factories: F688–F693 (6)
Task Types: None new (VC operations are sub-tasks of existing types)
Skills: None new (extends SK-150)
Design Decisions: DD-144
Design Records: DR-110
BFA Rules: None new
Stress Tests: ST-182 (1)

Save: "Resume FLOW-18 from P8 — F631-F693 complete, start F694"
```

### P8 — Self-Improvement & Analytics (Family 93, ~15 min)
```
Factories: F694–F696 (3)
Task Types: None new (analytics are sub-tasks)
Skills: None new (extends SK-148, SK-154)
Design Decisions: DD-147
Design Records: None new
BFA Rules: None new
Stress Tests: None new

Save: "Resume FLOW-18 from P9 — F631-F696 ALL COMPLETE, start integration testing"
```

### P9 — Integration & Stress Testing (~20 min)
```
Stress Tests: ST-164–ST-183 (20 tests — full sweep)
Special Test: ST-183 DNA Compliance Sweep (66 factories × 9 DNA = 594 checks)
Cross-Flow Validation: BFA conflict check against FLOW-01 through FLOW-17
Backward Compatibility: Verify F1–F630 and T1–T246 unchanged

Save: "Resume FLOW-18 from P10 — stress tests verified, start template execution"
```

### P10 — Template Execution & Final Gate (~15 min)
```
Templates: 50–55 (6 end-to-end DAG tests)
  50: visual-flow-creation-v1 (T247→T248→T249→T250)
  51: code-injection-pipeline-v1 (T251→T252→T253→T254)
  52: sandbox-test-cycle-v1 (T255→T256→T257→T258)
  53: collaborative-editing-v1 (T262→T263→T264)
  54: marketplace-publish-v1 (T265→T266)
  55: full-promotion-v1 (T267→T268)

Save: "FLOW-18 PRODUCTION READY ✅"
```

---

## DELTA SUMMARY

| Artifact | Before FLOW-18 | After FLOW-18 | Delta |
|----------|---------------|---------------|-------|
| Factories | 630 | 696 | +66 |
| Families | 83 | 93 | +10 |
| Task Types | 246 | 268 | +22 |
| Templates | 49 | 55 | +6 |
| BFA Rules | 294 | 328 | +34 |
| Stress Tests | 163 | 183 | +20 |
| Skills | 144 | 160 | +16 |
| Design Decisions | 129 | 148 | +19 |
| Design Records | 98 | 110 | +12 |
| DNA Patterns | 9 | 9 | +0 |
| Engine Primitives | 5 | 5 | +0 |

---

## RECOVERY COMMANDS

```
Load FLOW-18 state:          "Load SESSION_STATE — engine is at F696/T268/CF-328"
Resume from Phase X:         "Resume FLOW-18 P[X] — see MASTER_EXECUTION_PLAN"
Check canvas patterns:       "Load SK-145–SK-147 for canvas/layout/preview patterns"
Check code gen patterns:     "Load SK-148–SK-151 for generation/registration/injection patterns"
Check sandbox patterns:      "Load SK-152–SK-155 for sandbox/execution/validation/report patterns"
Check UI patterns:           "Load SK-156–SK-158 for UI fabric/debug/AI assistant patterns"
Check collab patterns:       "Load SK-159–SK-160 for collaboration/CRDT patterns"
Check promotion patterns:    "Load SK-150 for injection/promotion/rollback patterns"
Full reload:                 "Load all 7 merged files — FLOW-01 through FLOW-18 complete"
Start FLOW-19:               "Start FLOW-19 from F697, T269, CF-329, ST-184, SK-161, DD-149, DR-111, Template 56, Family 94"
```

---

## NEXT FLOW STARTING POINTS

```
FLOW-19: F697+ | T269+ | CF-329+ | ST-184+ | SK-161+ | DD-149+ | DR-111+ | Template 56+ | Family 94+
```

---

## BACKWARD COMPATIBILITY — FLOW-18

```
F1-F630:     UNCHANGED ✅ (696 - 66 = 630 pre-existing)
T1-T246:     UNCHANGED ✅ (268 - 22 = 246 pre-existing)
Tpl 1-49:    UNCHANGED ✅ (55 - 6 = 49 pre-existing)
CF-1-294:    UNCHANGED ✅ (328 - 34 = 294 pre-existing)
ST-1-163:    UNCHANGED ✅ (183 - 20 = 163 pre-existing)
SK-1-144:    UNCHANGED ✅ (160 - 16 = 144 pre-existing)
DD-1-129:    UNCHANGED ✅ (148 - 19 = 129 pre-existing)
DR-1-98:     UNCHANGED ✅ (110 - 12 = 98 pre-existing)
DNA-1-9:     STABLE ✅ (no new DNA patterns)
EP-1-5:      STABLE ✅ (no new engine primitives)
```

---

## SAVE POINT: FLOW18:P6:MASTER_PLAN ✅
## FLOW-18 COMPLETE ✅

## SAVE POINT: FLOW18:P6:MASTER_PLAN ✅


---

# ═══════════════════════════════════════════════════════════════════════════
# FLOW-19 — CI/CD & DevOps Control Plane — Execution Plan
# ═══════════════════════════════════════════════════════════════════════════

## FLOW-19 CHANGELOG
| Date | Flow | Phases | Notes |
|------|------|--------|-------|
| 2026-02-27 | FLOW-19 CI/CD & DevOps Control Plane | P0-P7 | System catalog, env factory, pipeline contracts, DR drills, multi-tenant |

---

## FLOW-19 OVERVIEW

```
FLOW NAME:    CI/CD & DevOps Control Plane
FLOW NUMBER:  FLOW-19
STARTING:     F697, T269, CF-329, ST-184, SK-161, DD-149, DR-111, Template 56, Family 94
ENDING:       F733, T286, CF-355, ST-198, SK-174, DD-163, DR-121, Template 58, Family 102
FACTORIES:    +37 (F697-F733) across 9 families (60-68)
TASK TYPES:   +18 (T269-T286) with 4 new archetypes
NEW ARCHETYPES: CATALOG_INGESTION, ENV_PROVISIONING, PIPELINE_CONTRACT, RESTORE_DRILL
BFA RULES:    +27 (CF-329-CF-355)
STRESS TESTS: +15 (ST-184-ST-198)
SKILLS:       +14 (SK-161-SK-174)
DESIGN DDs:   +15 (DD-149-DD-163)
DESIGN DRs:   +11 (DR-111-DR-121)
TEMPLATES:    +3 (36-38)
```

---

## EXECUTION PHASES

### PHASE 0: Pre-Flight Validation
```
OBJECTIVE: Confirm engine state and starting points before FLOW-19 work begins
DURATION:  15 minutes
STEPS:
  1. Load SESSION_STATE — confirm current state is F465/T178/CF-213/post-FLOW-18
  2. Confirm backward compatibility: F1-F696, T1-T268, CF-1-CF-328 all intact
  3. Confirm DNA patterns DNA-1-DNA-9 stable
  4. Confirm EP-1-EP-5 stable
  5. Load basic_prompt.txt — confirm fabric-first requirements understood
  6. Verify no naming conflicts in F697-F733 range against existing registry

SAVE POINT: FLOW19:P0:PREFLIGHT ✅
RECOVERY: "Load SESSION_STATE and verify F465 is last factory"
```

---

### PHASE 1: Factory Interfaces + Design Records
```
OBJECTIVE: Define all 37 factory interfaces (F697-F733, Families 94-102) and DR-111-DR-121
DURATION:  35-45 minutes
OUTPUT FILE: FLOW19_ENGINE_ARCHITECTURE.md ✅

DELIVERABLES:
  [ ] Family 94: F697-F700 — System Catalog & CMDB
  [ ] Family 95: F701-F704 — Environment Factory
  [ ] Family 96: F705-F708 — Config & Secrets Governance
  [ ] Family 97: F709-F712 — Pipeline Contract Engine
  [ ] Family 98: F713-F716 — GitOps & Deployment
  [ ] Family 99: F717-F720 — Test Orchestration & Readiness
  [ ] Family 100: F721-F724 — Backup & DR Drills
  [ ] Family 101: F725-F727 — Observability & Audit
  [ ] Family 102: F728-F733 — Multi-Tenant Control Plane
  [ ] DR-111 through DR-121 (11 design records)

FABRIC RESOLUTION CHECK (every factory must declare fabric):
  DATABASE FABRIC:  F697✅ F698✅ F699✅ F700✅ F701✅ F702✅ F703✅ F705✅
                    F708✅ F709✅ F711✅ F712✅ F714✅ F715✅ F717✅ F719✅
                    F721✅ F722✅ F723✅ F724✅ F725✅ F726✅ F728✅ F729✅
                    F730✅ F731✅ F732✅ F733✅
  QUEUE FABRIC:     F697✅ F703✅ F710✅ F712✅ F715✅ F717✅ F720✅ F721✅
                    F722✅ F724✅ F730✅ F731✅ F733✅
  CORE FABRIC:      F701✅ F702✅ F704✅ F706✅ F710✅ F713✅ F718✅ F720✅ F725✅
  AI ENGINE FABRIC: F707✅ F716✅ F727✅
  RAG FABRIC:       F699✅

DNA COMPLIANCE CHECK:
  All F697-F733: DNA-1 (Dictionary) ✅, DNA-3 (DataProcessResult) ✅, DNA-5 (tenantId) ✅
  Saga factories: DNA-4 (MicroserviceBase) ✅ — F701, F712, F722, F730, F733
  All generated: DNA-6 (DynamicController) ✅, DNA-7 (ProviderAgnostic) ✅

SAVE POINT: FLOW19:P1:FACTORIES ✅
RECOVERY: "Load FLOW19_ENGINE_ARCHITECTURE.md — F697-F733 defined, resume from task types"
```

---

### PHASE 2: Task Types Catalog
```
OBJECTIVE: Define 18 engine contracts (T269-T286) with full format + 3 flow templates
DURATION:  40-50 minutes
OUTPUT FILE: FLOW19_TASK_TYPES_CATALOG.md ✅

DELIVERABLES:
  [ ] T269 Component Descriptor Ingestion Gate    (CATALOG_INGESTION — NEW)
  [ ] T270 Dependency Graph Refresh Cycle         (MODELING)
  [ ] T271 Environment Request Gate               (ENV_PROVISIONING — NEW)
  [ ] T272 IaC Provision Saga                     (DURABLE_SAGA)
  [ ] T273 Ephemeral Env TTL Expiry Gate          (VALIDATION)
  [ ] T274 Config Layer Resolution Gate           (VALIDATION)
  [ ] T275 Policy Evaluation Gate                 (VALIDATION)
  [ ] T276 Pipeline Contract Normalization Gate   (PIPELINE_CONTRACT — NEW)
  [ ] T277 Ephemeral Deploy + Smoke Suite         (ORCHESTRATION)
  [ ] T278 GitOps Sync & Drift Detection Gate     (VALIDATION)
  [ ] T279 Integration Test Orchestration         (ORCHESTRATION)
  [ ] T280 Readiness Report Gate                  (VALIDATION)
  [ ] T281 Promotion Ladder Gate                  (ORCHESTRATION)
  [ ] T282 Backup Run Orchestrator                (DURABLE_SAGA)
  [ ] T283 Restore Drill Saga                     (RESTORE_DRILL — NEW)
  [ ] T284 DR Evidence Gate                       (VALIDATION)
  [ ] T285 Tenant Onboarding Saga                 (DURABLE_SAGA)
  [ ] T286 Tenant Offboarding Saga                (DURABLE_SAGA)
  [ ] Template 56: catalog-inventory-v1
  [ ] Template 57: ephemeral-env-pipeline-v1
  [ ] Template 58: dr-drill-pipeline-v1

ENGINE CONTRACT COMPLETENESS CHECK (every task type must have):
  ARCHETYPE ✅, ENTRY ✅, PURPOSE ✅, DISTINCT FROM ✅, FACTORY DEPENDENCIES ✅,
  FABRIC RESOLUTION ✅, AF CONFIGURATION ✅, MACHINE/FREEDOM ✅,
  IRON RULES ✅, QUALITY GATES ✅

SAVE POINT: FLOW19:P2:TASK_TYPES ✅
RECOVERY: "Load FLOW19_TASK_TYPES_CATALOG.md — T269-T286 defined, resume from BFA"
```

---

### PHASE 3: BFA Conflict Rules + Stress Tests
```
OBJECTIVE: Define 27 BFA rules (CF-329-CF-355) and 15 stress tests (ST-184-ST-198)
DURATION:  30-40 minutes
OUTPUT FILE: FLOW19_V62_BFA_STRESS_TEST.md ✅

DELIVERABLES:
  [ ] Group A: CF-329-CF-335 (DevOps Internal Ordering — 7 rules)
  [ ] Group B: CF-336-CF-342 (DevOps vs Prior Flows — 7 rules)
  [ ] Group C: CF-343-CF-347 (Multi-Tenant DevOps Isolation — 5 rules)
  [ ] Group D: CF-348-CF-351 (Backup/DR Constraints — 4 rules)
  [ ] Group E: CF-352-CF-355 (GitOps/Deploy Safety — 4 rules)
  [ ] ST-184-ST-198 (15 stress tests covering all major conflict scenarios)

CROSS-FLOW CONFLICT CHECK:
  FLOW-05: CF-342 (gamification event tests in pipeline)
  FLOW-08: CF-341 (tenant isolation primitives)
  FLOW-14: CF-339 (audit planes), CF-340 (sandbox ≠ warehouse data)

SAVE POINT: FLOW19:P3:BFA ✅
RECOVERY: "Load FLOW19_V62_BFA_STRESS_TEST.md — CF-329-CF-355 defined"
```

---

### PHASE 4: Skills + Unified Source Index
```
OBJECTIVE: Define 14 skill patterns (SK-161-SK-174) and 15 design decisions (DD-149-DD-163)
DURATION:  30-35 minutes
OUTPUT FILES: FLOW19_SKILLS_FACTORY_RAG.md ✅, FLOW19_UNIFIED_SOURCE_INDEX.md ✅

DELIVERABLES:
  [ ] SK-161  Catalog Ingestion Pattern
  [ ] SK-162 Dependency Graph Build Pattern
  [ ] SK-163 Environment Validation Gate Pattern
  [ ] SK-164 IaC Provision Saga Pattern
  [ ] SK-165 Saga Compensation Design Pattern
  [ ] SK-166 Pipeline Contract Normalization Pattern
  [ ] SK-167 Deployment Orchestration Pattern
  [ ] SK-168 Readiness Report Pattern
  [ ] SK-169 Restore Drill Orchestration Pattern
  [ ] SK-170 Sandbox Isolation Pattern
  [ ] SK-171 Config Layer Resolution Pattern
  [ ] SK-172 Policy-as-Code Evaluation Pattern
  [ ] SK-173 Tenant Onboarding Idempotent Saga Pattern
  [ ] SK-174 Control Plane Audit Pattern
  [ ] DD-149 through DD-163 (15 design decisions)
  [ ] FLOW-19 Concept Map
  [ ] FLOW-19 Cross-Flow Dependency Map

SAVE POINT: FLOW19:P4:SKILLS_DDS ✅
RECOVERY: "Load FLOW19_SKILLS_FACTORY_RAG.md and FLOW19_UNIFIED_SOURCE_INDEX.md"
```

---

### PHASE 5: Master Execution Plan (this file)
```
OBJECTIVE: Document FLOW-19 execution plan, recovery commands, and anti-patterns
DURATION:  20 minutes
OUTPUT FILE: FLOW19_MASTER_EXECUTION_PLAN.md ✅ (this file)

SAVE POINT: FLOW19:P5:EXECUTION_PLAN ✅
```

---

### PHASE 6: Session State Update
```
OBJECTIVE: Update SESSION_STATE to post-FLOW-19 state
DURATION:  15 minutes
OUTPUT FILE: FLOW19_SESSION_STATE.md ✅

SAVE POINT: FLOW19:P6:SESSION_STATE ✅
RECOVERY: "Load FLOW19_SESSION_STATE.md — engine is at F733/T286/CF-355"
```

---

## ANTI-PATTERN REGISTRY — FLOW-19

These patterns have been encountered in prior flows and must never appear in FLOW-19:

```
❌ ANTI-PATTERN 1: Direct Provider Import
   BAD:  using Terraform.Cloud.SDK;  stack = TerraformStack()
   GOOD: await _iacRunner.ApplyAsync(context)  # F702 via CORE FABRIC HTTP adapter

❌ ANTI-PATTERN 2: Typed Descriptor Models
   BAD:   profile = JsonSerializer.Deserialize<ComponentProfile>(yaml)
   GOOD:  profile = ObjectProcessor.parse_document(yaml);  # DNA-1

❌ ANTI-PATTERN 3: One-Line Task Type Stub
   BAD:  T271 — Environment Request Gate: validates environment requests
   GOOD: Full engine contract with ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION,
         AF CONFIGURATION, MACHINE, FREEDOM, IRON RULES (6+), QUALITY GATES (4+)

❌ ANTI-PATTERN 4: Missing Fabric Resolution
   BAD:  F701 → "handles environment state"
   GOOD: F701 → CORE FABRIC (SK-379 (MicroserviceBase), MicroserviceBase) + DATABASE FABRIC (SK-382 (ElasticsearchDatabase) → PG)

❌ ANTI-PATTERN 5: Secret Values in ConfigBundle
   BAD:  bundle["REDIS_PASSWORD"] = "abc123"
   GOOD: bundle["REDIS_PASSWORD"] = "kv/prod/svc/redis_password";  # reference only (DR-116)

❌ ANTI-PATTERN 6: Missing Idempotency on Provisioning
   BAD:  await ProvisionEnvironmentAsync(envType, prNumber);  # no dedup
   GOOD: await ProvisionEnvironmentAsync(envType, prNumber, idempotencyKey);  # DR-114

❌ ANTI-PATTERN 7: Mutable Audit/Evidence Records
   BAD:  await _evidence.UpdateAsync(drillId, { pass = true })
   GOOD: await _evidence.StoreEvidenceAsync(DrillResult);  # append-only (DR-119)

❌ ANTI-PATTERN 8: Cross-Tenant Cache Pollution
   BAD:  cache.Set("config:env_id", bundle);  # shared cache key
   GOOD: cache.Set($"{tenantId}:config:{envId}", bundle);  # DNA-5 + CF-344

❌ ANTI-PATTERN 9: Sandbox Seeded from Production
   BAD:  await sandbox.SeedFromDatabase(productionConnectionString)
   GOOD: await sandbox.SeedFromBackupAsync(backupArtifactPointer);  # CF-340, DR-118

❌ ANTI-PATTERN 10: Apply Without Stored Compensation
   BAD:  await _iac.ApplyAsync(plan);  # no compensation stored
   GOOD: await _iac.StoreCompensationPlanAsync(destroyPlan)
         await _iac.ApplyAsync(plan);  # compensation always precedes apply (DD-152, EP-4)
```

---

## FLOW-19 IRON RULES MASTER LIST

Total iron rules: 87 (across T269-T286, ~5 per task type on average)

Key highest-severity rules (BUILD FAILURE — immediate):
- Never advance IaC state without storing compensation plan (IR-272-1)
- Never provision without PolicyDecision.Allow for sensitive profiles (IR-271-1)
- Never skip idempotency key reservation (IR-271-3, IR-285-2)
- Never allow tier-1 promotion without fresh drill evidence (IR-284-1, IR-281-2)
- Never delete audit logs during offboarding (IR-286-1)
- Never mutate drill evidence (CF-349, DR-119)
- Never allow sensitive data to external AI providers (CF-343, IR-275-1)
- Never cross-tenant cache keys (CF-344, IR-285-6)
- Never seed sandbox from production (CF-340, IR-283-2)
- Never skip ReadinessReport as promotion gate (IR-281-1, DR-117)

---

## FLOW-19 QUALITY GATE MATRIX

| Gate | Task Type | Factory | Check |
|------|-----------|---------|-------|
| Catalog completeness | T269 | F697, F698 | All required profile fields present |
| Graph consistency | T270 | F699 | No circular deps, no orphans |
| Policy cleared | T275 | F707 | PolicyDecision.Allow + obligations |
| Config resolved | T274 | F705, F706, F708 | All keys + all refs exist |
| Env ready | T272 | F701 | State machine reaches Ready |
| Pipeline conformant | T276 | F709 | All 4 mandatory phases present |
| Smoke passing | T277 | F718, F719 | Golden path verified |
| Integration passing | T279 | F720 | DB, Queue, AI, RAG suites pass |
| Readiness confirmed | T280 | F719 | overall_pass = true, immutable |
| Drift clean | T278 | F714 | No unacknowledged drift |
| Backup integrity | T282 | F721 | sha256 verified |
| Drill passing + RTO met | T283 | F722, F723 | rto_actual ≤ rto_target |
| Tier-1 evidence fresh | T284 | F723 | Within 7 days |
| Promotion approved | T281 | F712 | All 5 gates pass |
| Onboarding complete | T285 | F730 | Smoke passes + tenant activated |
| Offboarding safe | T286 | F733 | Audit preserved, billing closed |

---

## RECOVERY COMMANDS

```
Load FLOW-19 state:         "Load FLOW19_SESSION_STATE.md — engine at F733/T286/CF-355"
Resume from factories:      "Load FLOW19_ENGINE_ARCHITECTURE.md — F697-F733 defined"
Resume from task types:     "Load FLOW19_TASK_TYPES_CATALOG.md — T269-T286 defined"
Resume from BFA:            "Load FLOW19_V62_BFA_STRESS_TEST.md — CF-329-CF-355"
Resume from skills:         "Load FLOW19_SKILLS_FACTORY_RAG.md — SK-161-SK-174"
Resume from DDs:            "Load FLOW19_UNIFIED_SOURCE_INDEX.md — DD-149-DD-163"
Start FLOW-20:              "Start FLOW-20 from F734, T287, CF-356 — see FLOW19_SESSION_STATE"
Reload DevOps skills:       "Load SK-161-SK-174 for CI/CD and DevOps patterns"
Check DR constraints:       "Load DR-111-DR-121 for DevOps design records"
Check MT constraints:       "Load CF-343-CF-347 for multi-tenant DevOps BFA rules"
Load template 37:           "Load Template 57 — ephemeral-env-pipeline-v1"
Load template 38:           "Load Template 58 — dr-drill-pipeline-v1"
```

---

## SAVE POINT: FLOW19:P5:EXECUTION_PLAN ✅
## Next: FLOW19_SESSION_STATE.md

---

## FLOW-19 ANTI-PATTERNS (what NOT to do)

```
❌ Import Terraform/Pulumi SDK directly
   → Use CORE FABRIC HTTP adapter (F702 IIaCRunnerService wraps IaC tools)

❌ Store secret values in ConfigBundle
   → Store only vault reference paths (DR-111, F706 validates existence only)

❌ Create typed ComponentProfile classes
   → dict[str, Any] via parse_document (DNA-1)

❌ Allow promotion without ReadinessReport
   → ReadinessReport is the SOLE gate (DR-112, F712, T281)

❌ Skip restore drill evidence for tier-1
   → Drill evidence within 7 days is MANDATORY (DR-113, F723, T283)

❌ Share cache keys across tenants
   → All cache keys MUST include tenantId (CF-344, DNA-5)

❌ Route sensitive data to external AI
   → local-sensitive profile = zero-egress (CF-343, DR-111)

❌ Delete audit logs during tenant offboarding
   → Audit logs survive offboarding (DR-115, F733, T286)

❌ Seed DR sandbox from production data
   → Sandbox seeded ONLY from backup artifacts (CF-340, F724)

❌ Direct HTTP between services
   → All inter-service calls through QUEUE FABRIC events
```

## BACKWARD COMPATIBILITY — Post FLOW-19

```
All prior execution plans (FLOW-01 through FLOW-18): UNCHANGED ✅
```

## SAVE POINT: FLOW19:P6:EXECUTION_PLAN ✅



================================================================================
# FLOW-20 EXECUTION PLAN — Sponsored Content + Graph API
# 6 Zones, 16 Families, 20 Task Types, 5 Templates
# Merged: 2026-02-27
================================================================================

# FLOW-20 MASTER EXECUTION PLAN
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Save Point: FLOW20:P0:MASTER ✅
## Status: ALL PHASES COMPLETE ✅

---

# PART 1 — NO-CODE EXPLANATION (What FLOW-20 Actually Builds)

## The Big Picture

FLOW-20 extends the XIIGen engine with two massive platform capabilities that Facebook, LinkedIn, and Twitter all share: **a Graph API** (how external developers query your platform's data as a graph of nodes and edges) and a **full Ads platform** (how sponsored content is managed, reviewed, auctioned, delivered, measured, and billed). Layered on top is **deep search** (graph-aware querying) and **multi-tenant isolation** (ensuring that no tenant's data, quotas, or secrets ever touch another's).

The engine does NOT write these services. It **generates** them — as factory-backed services sitting on fabric interfaces, assembled into flow DAGs stored in Elasticsearch, with all business logic configurable through FREEDOM config rather than code changes.

---

## What the Engine Generates for FLOW-20

**16 new factory families (F734–F851) across 6 zones:**

**Zone A — Graph API Plane:** Developer-facing REST graph paths, schema + field projection, OAuth 2.0 identity + scopes, policy decision point (per-node/field/edge), query planner/federation, webhooks with HMAC delivery.

**Zone B — Ads Management:** Advertiser accounts + roles + billing, campaign hierarchy (campaign → ad set → ad), creative asset ingestion + transcoding + AI quality scoring, ad review with political dual-gate and brand safety scoring.

**Zone C — Ads Delivery:** Targeting with consent-before-evaluation blocking gate, stateless auction engine (Redis-only, <50ms p99), frequency caps, pacing, feed slot injection.

**Zone D — Measurement:** Impression + click attribution with fraud blocking gate, cross-device, server-side conversion, attribution windows per advertiser via FREEDOM config.

**Zone E — Revenue Integrity:** Fraud detection (IVT, click fraud, bot detection), quarantine before billing, append-only spend ledger, financial reconciliation bridge to FLOW-13 general ledger.

**Zone F — Multi-Tenant Isolation + Governance:** Per-tenant quota counters, noisy neighbor guard, immutable flow version snapshots, audit logging, OAuth app developer analytics.

---

## Phase Plan (No Code, Plain English)

### Phase 0 — Master Plan + RAG Bootstrap (~20 min) ✅
Read all anchor documents. Build the 7-file delivery structure. Identify all 16 new factory families (F734–F851) and 20 task types (T287–T306). Map every factory to its fabric. Validate backward compatibility against FLOW-01 through FLOW-19.

**Save point:** `FLOW20:P0:MASTER`

### Phase 1 — Engine Architecture (~45 min) ✅
Full factory registry for F734–F851 across 16 families. Design Records DR-122–DR-133. Flow templates 36–40. AF Station mapping for all zones. GENIE DNA compliance declaration.

**Save point:** `FLOW20:P1:ENGINE`

### Phase 2 — Task Types Catalog (~45 min) ✅
20 full engine contracts (T287–T306), each with: ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES (8 each), QUALITY GATES (5–7 each).

**Save point:** `FLOW20:P2:TASKS`

### Phase 3 — BFA Stress Tests (~40 min) ✅
24 conflict rules (CF-356–CF-379) cross-validating FLOW-20 entities/events against FLOW-01–FLOW-19. 16 stress tests (ST-199–ST-214) covering auction latency, consent propagation, fraud flood, noisy neighbor, PCI scan, end-to-end pipeline.

**Save point:** `FLOW20:P3:BFA`

### Phase 4 — Skills Factory RAG (~40 min) ✅
14 skill patterns (SK-175–SK-188): per-node/field graph auth, partial-error response, HMAC delivery, stateless auction, PCI tokenization, consent gate, append-only ledger, edge tenant resolution, fraud gate, attribution window config, graph depth limit, creative review gate, political dual-gate, analytics aggregation. Each with primary Python 3.12 + FastAPI + alternative language implementations + AI agent prompt.

**Save point:** `FLOW20:P4:SKILLS`

### Phase 5 — Unified Source Index (~30 min) ✅
16 design decisions (DD-164–DD-179): REST graph paths, per-field permissions, stateless auction, consent-before-targeting, political dual gate, append-only ledger, HMAC mandatory, PCI tokenization, edge-only tenant, immutable snapshots, depth limit FREEDOM, conservative multi-model score, per-tenant quota, fraud gate before billing, creative approval gate, attribution windows FREEDOM. Full DR/DD cross-reference table.

**Save point:** `FLOW20:P5:INDEX`

---

## Validation: Does the Plan Cover All Requirements?

| Requirement | Coverage | Evidence |
|-------------|----------|----------|
| Graph API (nodes, edges, field projection) | ✅ | Families 60–64, T287, T288, T299, SK-175, SK-176 |
| Developer OAuth + scopes + app review | ✅ | Family 105, T302, DR-123, CF-359, CF-376 |
| Webhooks with HMAC | ✅ | Family 108, T289, SK-177, DD-170, DR-125 |
| Advertiser accounts + campaign hierarchy | ✅ | Families 66–67, T290 |
| Creative ingestion + review | ✅ | Families 68–69, T291, T295, SK-186, SK-187 |
| Targeting + consent | ✅ | Family 113, T301, T292 S1, SK-180, DD-167 |
| Auction + delivery (<50ms) | ✅ | Family 114, T292, SK-178, DD-166, DR-127, ST-202 |
| Measurement + attribution | ✅ | Family 115, T293, T294, T304, SK-184, DD-179 |
| Fraud detection + revenue integrity | ✅ | Family 116, T293–T294 gate, T305, SK-183, DD-177 |
| Billing + reconciliation | ✅ | Family 117, T296, T303, SK-181, DD-169 |
| Multi-tenant isolation + quota | ✅ | Family 118, T298, T300, SK-182, DD-172, DD-176 |
| Governance + audit | ✅ | F838–F845, T297, T306, CF-373 |
| Fabric-first (all factories via CreateAsync) | ✅ | Every IR-X-6 enforces CreateAsync() |
| DNA compliance (all 6 patterns) | ✅ | Every AF-7 entry; ST-214 end-to-end scan |
| Backward compatibility (FLOW-01–14) | ✅ | CF-356–CF-379; ST-214 re-runs FLOW-01–14 tests |

---

## Positive and Negative Examples

### ✅ POSITIVE EXAMPLE — Engine-Generated Ad Auction Service

**What the engine produces (correct):**
```
AuctionOrchestratorService extends MicroserviceBase
  → registered in factory registry as F810
  → resolves through DATABASE FABRIC (Redis) for all hot state
  → RunAuctionAsync: reads Redis ONLY (F798 freq cap, F799 pacing)
  → impression log: QUEUE FABRIC async (non-blocking)
  → budget decrement: QUEUE FABRIC async (non-blocking)
  → consent gate (F793): BLOCKING step 1
  → eligibility filter: approval_status = "APPROVED" only
  → all results: DataProcessResult[AuctionResult]
  → no typed model: dict[str, Any] throughout
  → p99 < 50ms verified in ST-202
  → tenant isolation: scope.TenantId on every Redis key
```

**What the developer sees (correct):**
```
Admin configures: frequency_cap_per_user=3, auction_quality_threshold=0.7
Engine generates: AuctionOrchestratorService reading these from FREEDOM config
No code change needed when admin changes thresholds — FREEDOM Machine works.
```

### ❌ NEGATIVE EXAMPLE 1 — Direct Provider Import (IRON RULE VIOLATION)

```python
# WRONG — violates fabric-first
class AuctionService:
{
    private readonly IDatabase _redis = ConnectionMultiplexer.Connect("localhost").GetDatabase()
    # ↑ BUILD FAILURE: imports Redis driver directly. Must use DATABASE FABRIC via CreateAsync().
}
```

### ❌ NEGATIVE EXAMPLE 2 — Typed Model for Graph Node (DNA-1 VIOLATION)

```python
# WRONG — violates DNA-1 parse_document
class GraphNode:  # ← BUILD FAILURE: typed model
{
    public str Id 
    public str Name 
}
# CORRECT: dict[str, Any] via ObjectProcessor.parse_document()
```

### ❌ NEGATIVE EXAMPLE 3 — Consent Post-Filter (DD-167 VIOLATION)

```python
# WRONG — targeting runs first, then consent filtered
 ads = await targetingService.EvaluateAsync(userId, scope);  # ← targeting without consent
 filtered = ads.Where(a => consentStore.HasConsent(userId)).ToList(); # ← post-filter
# BUILD FAILURE: consent gate must be BLOCKING STEP BEFORE targeting evaluation
```

### ❌ NEGATIVE EXAMPLE 4 — Synchronous Auction Budget Decrement (DR-130 VIOLATION)

```python
# WRONG — synchronous PG write in auction critical path
async def run_auction(self, ...)  # ❌ typed return AuctionResult, not DataProcessResult[dict[str, Any]]
{
     winner = SelectWinner(candidates)
    await _budgetRepository.DecrementAsync(winner.CampaignId, winner.Bid); # ← PG in critical path
    # BUILD FAILURE: budget decrement must be async via QUEUE FABRIC
}
```

### ❌ NEGATIVE EXAMPLE 5 — Raw PAN in Log (PCI VIOLATION)

```python
# WRONG — card data in log
_logger.LogInformation($"Processing card: {cardNumber}")
# BUILD FAILURE: raw card data in ANY log/queue/store = IR-290-1
```

---

## Recovery Map

| Phase | Save Point | File | Recovery Command |
|-------|-----------|------|-----------------|
| P0 | FLOW20:P0:MASTER | 20 - sponsored content MASTER_EXECUTION_PLAN.md | "Continue FLOW-20 Phase P0" |
| P1 | FLOW20:P1:ENGINE | 20 - sponsored content ENGINE_ARCHITECTURE.md | "Continue FLOW-20 Phase P1" |
| P2 | FLOW20:P2:TASKS | 20 - sponsored content TASK_TYPES_CATALOG.md | "Continue FLOW-20 Phase P2" |
| P3 | FLOW20:P3:BFA | 20 - sponsored content V62_BFA_STRESS_TEST.md | "Continue FLOW-20 Phase P3" |
| P4 | FLOW20:P4:SKILLS | 20 - sponsored content SKILLS_FACTORY_RAG.md | "Continue FLOW-20 Phase P4" |
| P5 | FLOW20:P5:INDEX | 20 - sponsored content UNIFIED_SOURCE_INDEX.md | "Continue FLOW-20 Phase P5" |

---

## FLOW-20 Deliverable Checklist

- [x] ENGINE_ARCHITECTURE — F734–F851 (16 families), DR-122–DR-133, Templates 36–40
- [x] TASK_TYPES_CATALOG — T287–T306 (20 full engine contracts)
- [x] V62_BFA_STRESS_TEST — CF-356–CF-379 (24 rules), ST-199–ST-214 (16 tests)
- [x] SKILLS_FACTORY_RAG — SK-175–SK-188 (14 patterns + AI agent prompts)
- [x] UNIFIED_SOURCE_INDEX — DD-164–DD-179 (16 decisions), full cross-reference
- [x] SESSION_STATE — Global tracker updated to F843/T306/DD-179/DR-133
- [x] MASTER_EXECUTION_PLAN — This file

---

## Global Engine State After FLOW-20

```
FACTORIES:        F1-F843     (851 total, Families 1-75)
TASK TYPES:       T1-T306     (306 total)
FLOW TEMPLATES:   1-40        (63 total)
BFA CONFLICT:     CF-1-CF-379 (379 total)
STRESS TESTS:     ST-1-ST-214 (214 total)
SKILL PATTERNS:   SK-1-SK-188 (188 total)
DESIGN DECISIONS: DD-1-DD-179 (179 total)
DESIGN RECORDS:   DR-1-DR-133  (133 total)

Next flow starts at: F584 / Family 76 / T199 / CF-238 / SK-113 / DD-102 / DR-78
```

## Checksum: FLOW20-575F-75FAM-T306-CF237-ST119-SK112-DD101-DR77-5T-7FILES

## SAVE POINT: FLOW20:P0:MASTER ✅ | FLOW20:COMPLETE ✅


---

# ═══════════════════════════════════════════════════════════════
# FLOW-21: Forms & Flow Automation Builder — Execution Plan
# ═══════════════════════════════════════════════════════════════

# MASTER EXECUTION PLAN — FLOW-21: Forms & Flow Automation Builder
## Extends MASTER_EXECUTION_PLAN_MERGED.md
## Backward Compatible: All prior flow execution plans UNCHANGED
## Save Point: FLOW21:P7:MASTER_EXEC ✅

---

## FLOW-21 OVERVIEW

```
DOMAIN:       Forms authoring + submission pipeline + automation recipes + connectors
SPEC SOURCE:  21_-_forms_and_flows.md (architecture overview)
              21_-_forms_and_flows_deep_search.md (submission pipeline patterns)
              21_-_forms_and_flows_deep_search_engine.md (engine design)
              21_-_forms_and_flows_deep_search_engine_multi_tenant.md (MT model)

STARTING IDs:
  Factories:    F852  (Families 119–68)
  Task Types:   T307
  Templates:    64
  BFA Rules:    CF-380
  Stress Tests: ST-215
  Skills:       SK-189
  Design Decs:  DD-180
  Design Recs:  DR-134

FINAL IDs (FLOW-21):
  Factories:    F900  (49 new, Families 119–68, 9 new families)
  Task Types:   T326  (20 new, 4 new archetypes)
  Templates:    66    (3 new: 36, 37, 38)
  BFA Rules:    CF-401 (22 new)
  Stress Tests: ST-226 (12 new)
  Skills:       SK-200 (12 new)
  Design Decs:  DD-191  (12 new)
  Design Recs:  DR-143  (10 new)
```

---

## PLAN VALIDATION MATRIX (Phase 0)

| Spec Requirement | Engine Coverage | Status |
|-----------------|----------------|--------|
| Form schema authoring (drag/drop fields, conditional logic) | F852, F854, T307 | ✅ |
| Multi-step wizard support | SK-197, F862 wizard state | ✅ |
| Submission pipeline (intake→validate→antispam→persist) | F864–F868, T308–T311 | ✅ |
| Entry storage + lifecycle management | F871, F877, T312 | ✅ |
| Notification engine (email/SMS/push with merge tags) | F878–F881, T314 | ✅ |
| Integration feeds (CRM, mailing list, webhook) | F883–F889, T315–T316 | ✅ |
| Payment states + triggers | F889, T317, CF-389 | ✅ |
| File uploads with security scanning | F873–F877, T324, SK-196 | ✅ |
| Save & continue (partial entries) | F870, F871, T313 | ✅ |
| Automation recipe builder | F890–F895, T318–T320 | ✅ |
| Recipe execution + retry + replay | F893–F895, T321, SK-192 | ✅ |
| Connector SDK (OAuth, CRM, Slack, etc.) | F896–F899, T322–T323 | ✅ |
| Multi-tenant isolation | F900, T326, SK-200 | ✅ |
| Fabric-first UI (zero platform-specific values) | F857, SK-197 | ✅ |
| AI-assisted form authoring | F860, T307 AF-1, DD-191 | ✅ |
| Backward compatibility F1-F851, T1-T306 | All pre-existing IDs unchanged | ✅ |

---

## POSITIVE EXAMPLE (expected correct output)

```python
# ✅ CORRECT — FLOW-21 service: F868 IEntryPersistenceService
# - Extends MicroserviceBase (DNA-4)
# - Uses Dictionary only (DNA-1)
# - Returns DataProcessResult[T] (DNA-3)
# - tenantId on every write (DNA-5)
# - Goes through DATABASE FABRIC, never direct ES client (Fabric law)
# - Emits event AFTER persist (INV-15-1 / DR-134)

class EntryPersistenceService(MicroserviceBase):, IEntryPersistenceService
{
    async def PersistEntryAsync(self, 
        dict[str, Any] payload,
        str tenantId,
        str formId)
    {
        # DNA-1: Dictionary only, no typed Entry class
         document = _objectProcessor.ProcessDocument(payload)
        document["tenantId"] = tenantId;              # DNA-5
        document["formId"]   = formId
        document["entryId"]  = Ulid.NewUlid().ToString()
        document["persistedAt"] = DateTimeOffset.UtcNow.ToString("O")
        document["status"]   = "active"
        # DNA-2: build_search_filter skips empty fields automatically
         filter = _objectProcessor.build_search_filter(new dict[str, Any]
        {
            ["tenantId"] = tenantId,
            ["formId"]   = formId
        })
        # Fabric: DATABASE FABRIC, never ElasticsearchClient()
         result = await _database.StoreDocument("entries", document)
        if (!result.IsSuccess)
            # DNA-3: return DataProcessResult, never throw
            return DataProcessResult[str].Failure(result.Error)
        # INV-15-1: Emit AFTER persist — never before
        await _queue.EnqueueAsync("entry.persisted", new dict[str, Any]
        {
            ["entryId"]  = document["entryId"],
            ["tenantId"] = tenantId,
            ["formId"]   = formId
        })
        return DataProcessResult[str].Success(document["entryId"].ToString())
    }
}
```

---

## NEGATIVE EXAMPLE (violations = BUILD FAILURE)

```python
# ❌ VIOLATION 1: Typed model (DNA-1 violation)
class EntryPersistenceService:
{
    async def persist_entry(self, submission: EntrySubmission)  # FAIL: typed models, not dict[str, Any]
    { ... }
}

# ❌ VIOLATION 2: Direct ES SDK (Fabric violation)
 client = ElasticsearchClient(settings);          # FAIL: direct provider import
await client.IndexAsync(entry, "entries")
# ❌ VIOLATION 3: Emit before persist (CF-386 / DR-134 / INV-15-1 violation)
await _eventPublisher.Publish(submissionEvent);          # FAIL: event before persistence
await _entryRepo.Save(entry);                           # FAIL: persist after emit

# ❌ VIOLATION 4: Missing tenantId (DNA-5 violation)
 result = await _database.StoreDocument("entries", payload); # FAIL: no tenantId

# ❌ VIOLATION 5: throw instead of DataProcessResult (DNA-3 violation)
throw ValidationException("Form not found");         # FAIL: never throw for business logic

# ❌ VIOLATION 6: Direct AI call without fabric (DD-191 violation)
 openai = OpenAIClient(apiKey);                   # FAIL: direct provider import
 schema = await openai.GetChatCompletions(...)
```

---

## EXECUTION PHASES

---

### Phase 0: Plan & Validation ✅
**Duration:** 15–30 minutes
**Goal:** Confirm FLOW-21 scope covers all spec requirements from 21_-_forms_and_flows*.md
**Output:** Plan validation matrix (above)

SAVE POINT: FLOW21:P0:PLAN ✅

---

### Phase 1: Engine Architecture (Factories F852–F900 + Design Records DR-134–DR-143)
**Duration:** 30–45 minutes
**Goal:** Define all 49 factory interfaces across 9 families + 10 design records
**Output file:** 21_-_forms_and_flows_ENGINE_ARCHITECTURE.md ✅

SCOPE:
- Family 119: Form Schema & Authoring (F852-F859)
- Family 120: Form Runtime Engine (F860-F863)
- Family 121: Submission Pipeline (F864-F870)
- Family 122: Entry Lifecycle & Storage (F871-F877)
- Family 123: Notification Engine (F878-F882)
- Family 124: Integration Feeds (F883-F889)
- Family 125: Automation Recipe Engine (F890-F895)
- Family 126: Connector SDK (F896-F899)
- Family 127: Forms Multi-Tenant Isolation (F900)
- Design Records: DR-134 through DR-143

KEY DECISIONS MADE:
- DR-134: Persist-Before-Emit (INV-15-1)
- DR-135: Anti-Spam as Fabric Gate
- DR-136: Conditional Logic as ES Document
- DR-137: Merge Tags as Runtime Resolver (AI-assisted)
- DR-138: Feed Execution Idempotent via Redis Key
- DR-139: Recipe DAG stored in ES (SK-392 (RagStrategyRegistry) pattern reuse)
- DR-140: Connector OAuth Tokens in PG Encrypted Only
- DR-141: File Virus Scan Before Signed URL Generation
- DR-142: Partial Entry Preserved in Redis with TTL → PG
- DR-143: Forms Tenant Isolation Inherits FLOW-08 + FLOW-14 MT Models

RECOVERY COMMAND:
  "Resume FLOW-21 P1: Load SESSION_STATE. Generate F852–F900.
   Start at Family 119 (Form Schema)."

SAVE POINT: FLOW21:P1:FACTORIES ✅

---

### Phase 2: Task Types Catalog (T307–T326 + Templates 64–66)
**Duration:** 45–60 minutes
**Goal:** 20 full engine contracts in exact T40 format + 3 flow templates
**Output file:** 21_-_forms_and_flows_TASK_TYPES_CATALOG.md ✅

TASK TYPES DEFINED:
```
T307  Form Schema Authoring Gate        AUTHORING   (new archetype)
T308  Submission Intake Gate            INGESTION
T309  Field Normalization Step          TRANSFORM
T310  Submission Validation Gate        VALIDATION
T311  Anti-Spam Security Gate           VALIDATION
T312  Entry Persistence Gate            PERSISTENCE (new archetype)
T313  Partial Entry Save Gate           PERSISTENCE
T314  Notification Dispatch Gate        NOTIFICATION (new archetype)
T315  Integration Feed Execution Gate   FEED_EXECUTION (new archetype)
T316  Webhook Feed Dispatch Gate        FEED_EXECUTION
T317  Payment Feed Processing Gate      ORCHESTRATION
T318  Recipe Definition Gate            AUTHORING
T319  Recipe Trigger Evaluation Gate    ORCHESTRATION
T320  Recipe Step Execution Gate        ORCHESTRATION
T321  Recipe Retry Gate                 DURABLE_SAGA
T322  Connector Auth Gate               PROVISIONING
T323  Data Mapping Transform Gate       TRANSFORM
T324  File Upload Security Gate         VALIDATION
T325  Entry Export Gate                 ACTIVATION
T326  Form Tenant Provision Gate        PROVISIONING
```

TEMPLATES:
```
Template 64: form-submission-pipeline-v1  (T307→T308→T309→T310→T311→T312→T314→T315)
Template 65: recipe-execution-v1          (T318→T319→T320→T321)
Template 66: connector-auth-integration-v1 (T322→T323→T316)
```

FIRST-TIME ARCHETYPES:
- AUTHORING: T307, T318 — form/recipe schema creation with AI assist + versioning
- PERSISTENCE: T312, T313 — entry save with dedup, idempotency, Redis→PG two-phase
- NOTIFICATION: T314 — multi-channel dispatch with merge tag resolution + routing
- FEED_EXECUTION: T315, T316 — integration feed: condition check → map → push → idempotency

RECOVERY COMMAND:
  "Resume FLOW-21 P2: T307-T326 task types. Start at T307.
   Follow T40 engine contract format exactly."

SAVE POINT: FLOW21:P2:TASK_TYPES ✅

---

### Phase 3: BFA Conflict Rules (CF-380–CF-401) + Stress Tests (ST-215–ST-226)
**Duration:** 30–40 minutes
**Goal:** 22 BFA rules + 12 stress tests covering forms-specific conflicts
**Output file:** 21_-_forms_and_flows_V62_BFA_STRESS_TEST.md ✅

BFA RULE GROUPS:
```
CF-380-CF-383: Forms Internal (4 rules)
  CF-380: schema must be published before submission accepted
  CF-381: validation rules loaded before anti-spam gate
  CF-382: anti-spam gate before persistence (INV-15-2)
  CF-383: wizard state isolated per session + tenantId

CF-384-CF-387: Submission Pipeline (4 rules)
  CF-384: intake dedup key prevents float-processing
  CF-385: validate before persist (no skipping stages)
  CF-386: emit AFTER persist only (INV-15-1)
  CF-387: no partial entry progresses to feed execution

CF-388-CF-391: Feeds & Notifications (4 rules)
  CF-388: feed executes after notification dispatch
  CF-389: payment feed is last in fan-out chain
  CF-390: webhook retry must carry idempotency key
  CF-391: CRM feed must check for duplicate contact before create

CF-392-CF-394: Recipe Engine (3 rules)
  CF-392: trigger evaluation before step execution
  CF-393: retry only via DLQ (never inline re-execute)
  CF-394: each recipe step atomic (no partial completion)

CF-395-CF-397: Connector Safety (3 rules)
  CF-395: OAuth tokens stored in PG encrypted only (DD-187)
  CF-396: data mapping executed before any outbound push
  CF-397: run history immutable (no updates, only appends)

CF-398-CF-400: MT Forms Isolation (3 rules)
  CF-398: all schema queries include tenantId filter
  CF-399: entry reads require PG RLS policy active
  CF-400: connector credentials never cross tenant boundary

CF-401: Cross-Flow (1 rule)
  CF-401: forms entries never write to DWH raw zone directly
          (must go through FLOW-14 ingestion pipeline)
```

STRESS TESTS:
```
ST-215: Form schema publish under concurrent edit (race condition)
ST-216: 10k simultaneous submissions (intake dedup + queue backpressure)
ST-217: Anti-spam false positive under load
ST-218: Partial entry TTL expiry during active session
ST-219: Notification routing fan-out (1 submission → 50 recipients)
ST-220: CRM feed duplicate detection (same entry replayed 3x)
ST-221: Webhook retry storm (DLQ overflow scenario)
ST-222: Recipe chain 20+ steps (executor timeout / saga rollback)
ST-223: OAuth token refresh race (2 threads, 1 expiry window)
ST-224: File upload virus scan queue saturation
ST-225: Cross-tenant form schema leak attempt
ST-226: Recipe idempotency key collision under UUID-v4 birthday paradox
```

RECOVERY COMMAND:
  "Resume FLOW-21 P3: BFA rules CF-380+. Generate conflict rules then stress tests."

SAVE POINT: FLOW21:P3:BFA ✅

---

### Phase 4: Skills Factory RAG (SK-189–SK-200)
**Duration:** 25–35 minutes
**Goal:** 12 reusable skill patterns for AF-4 RAG retrieval
**Output file:** 21_-_forms_and_flows_SKILLS_FACTORY_RAG.md ✅

SKILLS DEFINED:
```
SK-189:  Form Schema DAG validation pattern
SK-190: Submission pipeline stage-gate pattern (intake→validate→persist)
SK-191: Merge-tag resolver with AI fallback
SK-192: Feed executor idempotency (Redis key + PG log)
SK-193: Recipe DAG execution (adapts SK-392 (RagStrategyRegistry) Flow Orchestrator)
SK-194: Connector OAuth PKCE flow via Core Fabric
SK-195: Anti-spam composite gate (honeypot + reCAPTCHA + AI scoring)
SK-196: File upload secure pipeline (upload→scan→sign→store)
SK-197: Fabric-first UI spec (render spec in ES, zero platform values)
SK-198: Partial entry save-and-continue (Redis TTL → PG promotion)
SK-199: Conditional logic evaluator (ES rule doc → runtime evaluation)
SK-200: Multi-tenant forms isolation (schema + entry + connector scope)
```

AF-4 RAG TRIGGER PATTERNS:
- "form schema", "field validation" → SK-189
- "submission", "pipeline", "stage gate" → SK-190
- "merge tags", "notifications", "templates" → SK-191
- "feed", "idempotent", "integration" → SK-192
- "recipe", "automation", "DAG" → SK-193
- "OAuth", "connector", "auth" → SK-194
- "spam", "security gate", "captcha" → SK-195
- "file upload", "virus scan" → SK-196
- "UI spec", "fabric-first", "render" → SK-197
- "partial entry", "save continue", "wizard" → SK-198
- "conditional", "show/hide", "logic rules" → SK-199
- "multi-tenant", "forms isolation" → SK-200

RECOVERY COMMAND:
  "Resume FLOW-21 P4: Skills SK-189–SK-200. Generate each in SK standard format."

SAVE POINT: FLOW21:P4:SKILLS ✅

---

### Phase 5: Unified Source Index (DD-180–DD-191 + Concept Maps)
**Duration:** 25–35 minutes
**Goal:** 12 design decisions + 5 concept maps
**Output file:** 21_-_forms_and_flows_UNIFIED_SOURCE_INDEX.md ✅

DESIGN DECISIONS:
  DD-180: Why FormSchema in ES (not PG)
  DD-181: Why submission pipeline uses stage-gate queue pattern
  DD-182: Why anti-spam is a fabric service (not middleware)
  DD-183: Why partial entries use Redis→PG two-phase store
  DD-184: Why notification templates use merge tags + AI resolver
  DD-185: Why feed execution is idempotent-first
  DD-186: Why recipe DAG is an ES document
  DD-187: Why connector OAuth tokens are PG-only
  DD-188: Why file scan is a QUEUE FABRIC step (not inline)
  DD-189: Why conditional logic is an ES rule document
  DD-190: Why forms MT isolation inherits FLOW-08 model
  DD-191: Why AI-assisted form authoring goes through AI ENGINE FABRIC

CONCEPT MAPS:
  Map 1: Forms Platform Architecture (full stack view)
  Map 2: Automation Recipe Engine (trigger→execute→history)
  Map 3: Connector SDK & OAuth Flow
  Map 4: Submission Pipeline Stage Gates (detailed)
  Map 5: Multi-Tenant Forms Isolation

RECOVERY COMMAND:
  "Resume FLOW-21 P5: Design decisions DD-180+. Then concept maps."

SAVE POINT: FLOW21:P5:UNIFIED_INDEX ✅

---

### Phase 6: Session State (Global Tracker Update)
**Duration:** 15 minutes
**Goal:** Update global tracker with FLOW-21 delta, backward compat check, starting IDs for FLOW-16
**Output file:** 21_-_forms_and_flows_SESSION_STATE.md ✅

DELTA RECORDED:
  Factories: 465 → 514 (+49)
  Task Types: 178 → 198 (+20)
  Templates: 35 → 38 (+3)
  BFA Rules: 213 → 235 (+22)
  Stress Tests: 103 → 115 (+12)
  Skills: 98 → 110 (+12)
  DDs: 85 → 97 (+12)
  DRs: 65 → 75 (+10)

BACKWARD COMPAT: F1-F851 UNCHANGED ✅ | T1-T306 UNCHANGED ✅ | DNA-1-9 STABLE ✅

NEXT FLOW STARTS: F515 | T199 | CF-236 | ST-116 | SK-111 | DD-98 | DR-76 | Template 39 | Family 69

RECOVERY COMMAND:
  "Resume FLOW-21 P6: Generate SESSION_STATE.
   Record delta, backward compat, FLOW-16 starting IDs."

SAVE POINT: FLOW21:P6:SESSION_STATE ✅

---

### Phase 7: Master Execution Plan (This File)
**Duration:** 15 minutes
**Goal:** Compile all phases into single execution plan with recovery commands
**Output file:** 21_-_forms_and_flows_MASTER_EXECUTION_PLAN.md ✅

SAVE POINT: FLOW21:P7:MASTER_EXEC ✅

---

## COMPLETE FILE REGISTRY — FLOW-21

| # | File | Content | Save Point |
|---|------|---------|-----------|
| 1 | 21_-_forms_and_flows_ENGINE_ARCHITECTURE.md | F852-F900, Families 119-68, DR-134-DR-143 | P1 ✅ |
| 2 | 21_-_forms_and_flows_TASK_TYPES_CATALOG.md | T307-T326, Templates 64-66, AF maps | P2 ✅ |
| 3 | 21_-_forms_and_flows_V62_BFA_STRESS_TEST.md | CF-380-CF-401, ST-215-ST-226 | P3 ✅ |
| 4 | 21_-_forms_and_flows_SKILLS_FACTORY_RAG.md | SK-189-SK-200, AF-4 RAG patterns | P4 ✅ |
| 5 | 21_-_forms_and_flows_UNIFIED_SOURCE_INDEX.md | DD-180-DD-191, 5 concept maps | P5 ✅ |
| 6 | 21_-_forms_and_flows_MASTER_EXECUTION_PLAN.md | All phases + recovery (this file) | P7 ✅ |
| 7 | 21_-_forms_and_flows_SESSION_STATE.md | Global state tracker, FLOW-16 start | P6 ✅ |

---

## MASTER RECOVERY COMMANDS

```
Load FLOW-21 state:
  "Load 21_-_forms_and_flows_SESSION_STATE.md — engine at F900/T326/CF-401"

Start FLOW-16:
  "Start FLOW-16 from F515, T199, CF-236 — load 21_-_forms_and_flows_SESSION_STATE"

Review submission pipeline:
  "Load 21_-_forms_and_flows_ENGINE_ARCHITECTURE.md Family 121 + SK-190 + CF-384-CF-387"

Review recipe engine:
  "Load 21_-_forms_and_flows_ENGINE_ARCHITECTURE.md Family 125 + SK-193 + CF-392-CF-394"

Review connector SDK:
  "Load 21_-_forms_and_flows_ENGINE_ARCHITECTURE.md Family 126 + SK-194 + CF-395-CF-397"

Review MT forms isolation:
  "Load F900 + SK-200 + CF-398-CF-400 + DR-143 for multi-tenant forms model"

Reload skills for AF-4:
  "Load SK-189–SK-200 from 21_-_forms_and_flows_SKILLS_FACTORY_RAG.md"

Check all BFA rules:
  "Load CF-380–CF-401 from 21_-_forms_and_flows_V62_BFA_STRESS_TEST.md"

Run full validation:
  "Run FLOW-21 validation matrix from 21_-_forms_and_flows_MASTER_EXECUTION_PLAN.md Phase 0"

Merge FLOW-21 into canonical 7:
  "Merge all 21_-_forms_and_flows_* files into FLOW-14 canonical merged files"
```

---

## KEY INVARIANTS (Quick Reference)

| ID | Rule | Enforcement |
|----|------|-------------|
| INV-15-1 | Persist BEFORE emit — always | DR-134, CF-386 |
| INV-15-2 | Anti-spam BEFORE persist — never after | DR-135, CF-382 |
| INV-15-3 | Conditional logic = ES doc, never code | DR-136, DNA-1 |
| INV-15-4 | Feed execution idempotent via Redis key | DR-138, CF-388 |
| INV-15-5 | OAuth tokens = PG encrypted only | DR-140, CF-395 |
| INV-15-6 | File virus scan before signed URL | DR-141 |
| INV-15-7 | Partial entry Redis TTL ≤ 48h, then promote/expire | DR-142 |
| INV-15-8 | Recipe DAG = ES document (SK-392 (RagStrategyRegistry) pattern) | DR-139, SK-193 |
| INV-15-9 | All form queries include tenantId (DNA-5) | DNA-5, CF-398 |
| INV-15-10 | Connector credentials never cross tenant | CF-400, F897 |

---

## SAVE POINT: FLOW21:COMPLETE ✅
## All 7 files generated. Ready for FLOW-16.
## Resume: "Continue from FLOW-16" → Load 21_-_forms_and_flows_SESSION_STATE.md + basic_prompt.txt

═══════════════════════════════════════════════════════════════════
FLOW-22 — Visual Editor & Site Builder Platform
Merged: 2026-02-27
═══════════════════════════════════════════════════════════════════

# MASTER EXECUTION PLAN — FLOW-22 EXTENSION
# Visual Editor & Site Builder Platform
# Extends: MASTER_EXECUTION_PLAN_MERGED.md (FLOW-01 through FLOW-21)
# Save Point: FLOW22:P7:PLAN:COMPLETE

---

## PLAN IDENTITY

```
FLOW:         FLOW-22 — Visual Editor & Site Builder Platform
SCOPE:        Extend XIIGen engine to generate Visual Editor + Headless CMS flows
INPUTS:       22-visual-editor.md, 22-visual-editor-deep-search.md,
              22-visual-editor-deep-search-engine.md,
              22-visual-editor-deep-search-engine-multi-tenant.md,
              multi-tenant-support.md
OUTPUTS:      7 engine extension documents (all complete ✅)
APPROACH:     Fabric-first, engine-extends (not standalone implementations)
```

---

## EXECUTION PHASES — COMPLETED

### PHASE 1 — ENGINE ARCHITECTURE (P1) ✅
```
GOAL:         Define all factory interfaces for FLOW-22 (44 factories, 7 families)
DURATION:     ~25 min (within 45-min recovery window)
OUTPUT:       22_-_visual_editor_ENGINE_ARCHITECTURE.md
DELIVERED:
  - Family 128: Visual Editor Canvas     (F901–F906)
  - Family 129: CMS & Content Modeling   (F907–F915)
  - Family 130: Content Authoring        (F913–F918)
  - Family 131: Publishing Pipeline      (F918–F930)
  - Family 132: AI Content Assist        (F928–F930)
  - Family 133: Design Tokens & Media    (F923–F935)
  - Family 134: Multi-Tenant Workspaces  (F941–F944)
  - All factories mapped to FABRIC RESOLUTION
  - All extend IExternalServiceFactory<TService> via CreateAsync()
VERIFICATION: No standalone DB/Queue/AI imports; all via fabric
SAVE POINT:   FLOW22:P1:ENGINE_ARCH:COMPLETE ✅
```

### PHASE 2 — TASK TYPES CATALOG (P2) ✅
```
GOAL:         Full engine contracts for T327–T346 (20 task types, 3 flow templates)
DURATION:     ~30 min
OUTPUT:       22_-_visual_editor_TASK_TYPES_CATALOG.md
DELIVERED:
  - T327–T330: Page Builder archetypes (canvas, component, snapshot, preview)
  - T331–T335: CMS Lifecycle archetypes (post type, draft, publish gate, review, feed)
  - T336–T340: Publish Saga archetypes (async pipeline, schedule, rollback, SSR/SSG, SEO)
  - T341–T342: Design Propagation archetypes (token propagation, theme switch)
  - T343:      AI Content Suggestion (fire-and-suggest)
  - T344–T346: Media Pipeline + Workspace Provision
  - Templates 67–69: visual-editor-v1, cms-authoring-v1, design-token-rebuild-v1
FORMAT:       Full engine contract (ARCHETYPE/ENTRY/PURPOSE/FACTORY DEPS/FABRIC RESOLUTION/
              AF CONFIGURATION/BFA VALIDATION/MACHINE-FREEDOM/IRON RULES/QUALITY GATES)
SAVE POINT:   FLOW22:P2:TASK_TYPES:COMPLETE ✅
```

### PHASE 3 — BFA STRESS TESTS (P3) ✅
```
GOAL:         28 conflict rules (CF-402–CF-429) + 15 stress tests (ST-227–ST-241)
DURATION:     ~20 min
OUTPUT:       22_-_visual_editor_V62_BFA_STRESS_TEST.md
DELIVERED:
  CF-402–CF-408: Visual editor component/canvas rules
  CF-409–CF-420: CMS content lifecycle rules
  CF-421–CF-427: Publishing pipeline + media rules
  CF-428–CF-429: Multi-tenant workspace rules
  ST-227–ST-238: Per-domain stress tests (editor, CMS, publish, design, media, AI, multi-tenant)
  ST-239–ST-241: Cross-flow conflict stress tests (vs FLOW-05, FLOW-14, FLOW-16)
  Cross-flow conflict matrix (FLOW-22 vs FLOW-01–FLOW-17)
SAVE POINT:   FLOW22:P3:BFA:COMPLETE ✅
```

### PHASE 4 — SKILLS FACTORY RAG (P4) ✅
```
GOAL:         10 new skills (SK-201–SK-210) for AF-4 RAG retrieval
DURATION:     ~15 min
OUTPUT:       22_-_visual_editor_SKILLS_FACTORY_RAG.md
DELIVERED:
  SK-201: Page tree mutation patterns (T327, T329)
  SK-202: JSON Schema 2020-12 / PostType patterns (T328, T331)
  SK-203: Collection relation + referential integrity (T331, T334)
  SK-204: Optimistic concurrency / ETag patterns (T332)
  SK-205: Content feed query / build_search_filter (T335)
  SK-206: Publish saga + compensation + CloudEvents (T336, T338)
  SK-207: Scheduled publish / RFC 3339 (T337)
  SK-208: Asset upload / image transform / CDN (T344, T345)
  SK-209: SSR/SSG hybrid + live preview (T330, T339)
  SK-210: Sitemap / RSS / SEO meta / slug redirect (T340)
AF-4 RAG INDEX updated with keyword → skill → task type mapping
SAVE POINT:   FLOW22:P4:SKILLS:COMPLETE ✅
```

### PHASE 5 — UNIFIED SOURCE INDEX (P5) ✅
```
GOAL:         12 design decisions (DD-192–DD-203) + 8 design records (DR-144–DR-151)
DURATION:     ~20 min
OUTPUT:       22_-_visual_editor_UNIFIED_SOURCE_INDEX.md
DELIVERED:
  DD-192: JSON Schema 2020-12 (vs TypeScript interface, custom schema, GraphQL SDL)
  DD-193: Hybrid SSR/SSG (vs pure SSG, pure SSR)
  DD-194: CloudEvents envelope (vs raw JSON, custom envelope)
  DD-195: ES + PG persistence (vs MongoDB, pure PG)
  DD-196: Optimistic concurrency (vs pessimistic locks, last-write-wins)
  DD-197: workspaceId ≡ tenantId (reuse DNA-5)
  DD-198: Design token inheritance + build-time CSS (vs runtime resolution, flat map)
  DD-199: Component registry append-only (vs mutable, replace-on-update)
  DD-200: AI assist non-blocking / fire-and-suggest (vs blocking, inline autocomplete)
  DD-201: Media transforms single-pass from original
  DD-202: SEO outputs engine-generated at publish time
  DD-203: BFA workspace registration at provision time
  DR-144–DR-151: Full requirement traceability for all 7 FLOW-22 domains
SAVE POINT:   FLOW22:P5:INDEX:COMPLETE ✅
```

### PHASE 6 — SESSION STATE (P6) ✅
```
GOAL:         Update global system state tracker with all FLOW-22 additions
DURATION:     ~10 min
OUTPUT:       22_-_visual_editor_SESSION_STATE.md
DELIVERED:
  Global counters updated: F1–F944, T1–T346, CF-1–CF-429, SK-1–SK-210,
                           DD-1–DD-203, DR-1–DR-151, FLOW-01 through FLOW-22
  Family registry: Families 128–134
  Factory registry: F901–F944 with FABRIC RESOLUTION
  Task type registry: T327–T346 with ARCHETYPE + FAMILY
  BFA cross-flow registration: entities, events, API paths
  DNA compliance summary: 6/6 ✅
  Promotion ladder status
  Recovery instructions
SAVE POINT:   FLOW22:P6:SESSION_STATE:COMPLETE ✅
```

### PHASE 7 — MASTER EXECUTION PLAN (P7) ✅
```
GOAL:         This document — execution plan + integration guide + next-flow template
DURATION:     ~10 min
OUTPUT:       22_-_visual_editor_MASTER_EXECUTION_PLAN.md
SAVE POINT:   FLOW22:P7:PLAN:COMPLETE ✅
```

---

## REQUIREMENT COVERAGE MATRIX

| Source Document | Requirements | Covered By | Status |
|---|---|---|---|
| 22-visual-editor.md | Drag-drop canvas, component library, undo/redo | T327, T328, T329, F901-F906 | ✅ |
| 22-visual-editor.md | Live preview | T330, F904, DD-193 | ✅ |
| 22-visual-editor.md | Headless CMS + post types | T331, T332, F907-F915 | ✅ |
| 22-visual-editor.md | Editorial workflow (draft/review/publish) | T333, T334, F911, F917 | ✅ |
| 22-visual-editor.md | Scheduled publishing | T337, F916 | ✅ |
| 22-visual-editor.md | AI content assist + auto-tagging | T343, T334, F928, F929 | ✅ |
| 22-visual-editor-deep-search.md | SSR/SSG pipeline | T336, T339, F919, F920 | ✅ |
| 22-visual-editor-deep-search.md | CDN invalidation | T336, F921 | ✅ |
| 22-visual-editor-deep-search.md | Sitemap, RSS, SEO structured data | T340, F927, F930 | ✅ |
| 22-visual-editor-deep-search.md | Media pipeline (WebP, responsive) | T344, T345, F931-F934 | ✅ |
| 22-visual-editor-deep-search-engine.md | Design token inheritance | T341, T342, F926, DD-198 | ✅ |
| 22-visual-editor-deep-search-engine.md | Theme variants | T342, F923 | ✅ |
| 22-visual-editor-deep-search-engine.md | CloudEvents event envelopes | DD-194, CF-425 | ✅ |
| 22-visual-editor-multi-tenant.md | Per-workspace isolation | T346, F941-F944, DD-197 | ✅ |
| 22-visual-editor-multi-tenant.md | Workspace RBAC | F942 | ✅ |
| 22-visual-editor-multi-tenant.md | Workspace billing + analytics | F943, F944 | ✅ |
| basic_prompt.txt | All 6 DNA patterns | DR-151 (full audit) | ✅ |
| basic_prompt.txt | Fabric-first (no direct provider imports) | All F901–F944 | ✅ |
| basic_prompt.txt | BFA cross-flow validation | CF-414, CF-429, DD-203 | ✅ |
| basic_prompt.txt | Backward compatibility T1–T326 | UNCHANGED confirmed | ✅ |
| basic_prompt.txt | Full engine contract format for task types | T327–T346 all full format | ✅ |

**COVERAGE: 100% ✅ — ZERO GAPS**

---

## ENGINE INTEGRATION GUIDE

### How FLOW-22 Integrates with the Existing Engine

```
1. FACTORY REGISTRY UPDATE
   Register F901–F944 in the engine's global factory registry.
   Each factory registered with:
     - Interface name (e.g., IPageTreeService)
     - FABRIC RESOLUTION (e.g., DATABASE FABRIC → ES)
     - CreateAsync() resolver function
     - Health check endpoint
     - Fallback strategy

2. TASK TYPE CATALOG UPDATE
   Append T327–T346 to TASK_TYPES_CATALOG.
   Engine uses catalog entries to:
     - Route AF station configuration per task type
     - Validate factory dependencies at flow generation time
     - Apply iron rules during AF-7 Compliance scan
     - Configure AF-9 Judge quality gates

3. FLOW TEMPLATE REGISTRATION
   Register Templates 67–69 in FlowOrchestrator (SK-392 (RagStrategyRegistry)):
     Template 67: visual-editor-v1
     Template 68: cms-authoring-v1
     Template 69: design-token-rebuild-v1
   Each template stored as JSON DAG in Elasticsearch.

4. BFA INDEX UPDATE
   Register FLOW-22 entities, events, and API paths.
   Run cross-flow conflict check against FLOW-01–FLOW-17 before activation.

5. RAG SKILL INDEX UPDATE
   Add SK-201–SK-210 to AF-4 RAG search index.
   Keyword mappings registered for all 10 new skills.

6. FREEDOM CONFIG DOCUMENTS
   Create admin-configurable FREEDOM layer ES documents for:
     - PostType schema registry configuration
     - Design token inheritance rules
     - Theme variant definitions
     - Workspace role permission templates
     - AI assist model selection (per workspaceId)
     - CDN provider config (per deployment)
     - SSG vs SSR routing rules
```

### AF Station Routing for FLOW-22

```
AF-1 Genesis:     Generates service code from T327–T346 contracts
                  Uses F901–F944 interface definitions as generation targets
                  All generated code extends MicroserviceBase (DNA-4)

AF-2 Planning:    Decomposes new flow requests into T327–T346 sequences
                  Uses Templates 67–69 as starting DAG structures

AF-3 Prompt Lib:  Retrieves FLOW-22-specific prompts for:
                  - JSON Schema 2020-12 generation (DD-192)
                  - CloudEvents envelope construction (DD-194)
                  - Optimistic concurrency ETag patterns (DD-196)

AF-4 RAG:         Searches SK-201–SK-210 for reusable patterns
                  Keywords: page tree, CMS, publish saga, design token,
                            media transform, workspace provision

AF-5 Multi-model: Runs competing models for complex T336 Publish Saga
                  and T346 Workspace Provision (highest complexity tasks)

AF-6 Code Review: Reviews generated service code for correctness
                  Checks: fabric interface usage, Dictionary types, no direct DB imports

AF-7 Compliance:  Validates ALL 6 DNA patterns on every generated service:
                  - dict[str, Any] (DNA-1)
                  - build_search_filter (DNA-2)
                  - DataProcessResult[T] (DNA-3)
                  - MicroserviceBase extension (DNA-4)
                  - workspaceId present (DNA-5)
                  - DynamicController routing (DNA-6)

AF-8 Security:    Scans for: workspaceId bypass, CDN path traversal,
                  media upload injection, PostType schema injection,
                  AI provider key exposure, webhook SSRF

AF-9 Judge:       Validates against iron rules (all T327–T346 iron rules)
                  Quality gates:
                  - Canvas: snapshot before mutation, component version locked
                  - CMS: PostType changes additive only, editorial gate enforced
                  - Publish: CDN invalidated after build, SEO artifacts generated
                  - Media: originals immutable, transforms queue-async
                  - Workspace: BFA registered before activation

AF-10 Merge:      Combines multi-model outputs for publish saga and workspace provision

AF-11 Feedback:   Stores generation quality metrics keyed by T327–T346
                  Improves future generation quality for FLOW-22 task types
```

---

## NEXT FLOW TEMPLATE

When creating FLOW-21 or any future flow, use this template:

```
FLOW EXTENSION TEMPLATE
========================
FLOW ID:      FLOW-21 (or next)
NEW FAMILIES: [N+1 to N+X] — [Domain names]
NEW FACTORIES: F[next] to F[next+Y]
  Each factory:
    F[id] I[Name]Service → [FABRIC NAME] ([Provider])
NEW TASK TYPES: T[next] to T[next+Z]
  Each task type (FULL FORMAT):
    TASK TYPE, ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM,
    FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION,
    BFA VALIDATION, MACHINE/FREEDOM, IRON RULES, QUALITY GATES
NEW TEMPLATES: Template [next+1] to Template [next+M]
NEW CF RULES: CF-[next] to CF-[next+P]
NEW STRESS TESTS: ST-[next] to ST-[next+Q]
NEW SKILLS: SK-[next] to SK-[next+R]
NEW DESIGN DECISIONS: DD-[next] to DD-[next+S]
NEW DESIGN RECORDS: DR-[next] to DR-[next+T]

7 DOCUMENTS TO GENERATE:
  [FLOW_ID]_ENGINE_ARCHITECTURE
  [FLOW_ID]_TASK_TYPES_CATALOG
  [FLOW_ID]_V62_BFA_STRESS_TEST
  [FLOW_ID]_SKILLS_FACTORY_RAG
  [FLOW_ID]_UNIFIED_SOURCE_INDEX
  [FLOW_ID]_SESSION_STATE
  [FLOW_ID]_MASTER_EXECUTION_PLAN

CHECKPOINTS:
  P1: ENGINE_ARCH → verify fabric resolution for all factories
  P2: TASK_TYPES  → verify full engine contract format (not stubs)
  P3: BFA         → verify cross-flow conflict checks vs FLOW-01 through FLOW-[current]
  P4: SKILLS      → verify AF-4 RAG index updated
  P5: INDEX       → verify design decisions include alternatives + rationale
  P6: SESSION     → verify global counters accurate
  P7: PLAN        → verify 100% requirement coverage

BACKWARD COMPATIBILITY CHECK:
  T1–T[prev]:   UNCHANGED ✅
  F1–F[prev]:   UNCHANGED ✅
  CF-1–CF[prev]: UNCHANGED ✅
  SK-1–SK[prev]: UNCHANGED ✅
```

---

## POSITIVE EXAMPLE — Correct FLOW-22 Extension Pattern

```python
# ✅ CORRECT: Factory resolved through DATABASE FABRIC — never direct
class PageTreeService(MicroserviceBase):, IPageTreeService
{
    private readonly IDatabaseService _db
    public PageTreeService(IDatabaseService db, ...) : base(...)
    {
        _db = db; # DATABASE FABRIC — resolved via config, not ElasticsearchClient()
    }

    async def GetTreeAsync(self, 
        str siteId, str workspaceId)
    {
         filter = build_search_filter(new {
            siteId = siteId,           # DNA-2: empty fields auto-skipped
            workspaceId = workspaceId  # DNA-5: scope isolation
        })
        return await _db.SearchDocumentsAsync("page_trees", filter); # DNA-3: returns Result<T>
    }
}
```

## NEGATIVE EXAMPLE — Violations That Trigger BUILD FAILURE

```python
# ❌ WRONG: Direct Elasticsearch import — violates FABRIC principle


# ❌ WRONG: Typed model — violates DNA-1
class PageTreeDto: { public str SiteId  ... }

# ❌ WRONG: Throws instead of DataProcessResult — violates DNA-3
throw InvalidOperationException("Tree not found")
# ❌ WRONG: Missing workspaceId on query — violates DNA-5
 filter = build_search_filter(new { siteId = siteId }); # workspaceId absent

# ❌ WRONG: Direct AI provider call — violates AI ENGINE FABRIC
 result = await openAIClient.Chat.CompletionsAsync(...)
# ❌ WRONG: Entity-specific controller — violates DNA-6
[ApiController]
[Route("page-trees")]
class PageTreeController(ControllerBase): { ... }
```

---

## BACKWARD COMPATIBILITY VERIFICATION

```
FLOW-01 through FLOW-21:  ✅ UNCHANGED
T1–T326:                  ✅ UNCHANGED
F1–F900:                  ✅ UNCHANGED
CF-1–CF-401:              ✅ UNCHANGED
ST-1–ST-226:              ✅ UNCHANGED
SK-1–SK-200:              ✅ UNCHANGED
DD-1–DD-191:              ✅ UNCHANGED
DR-1–DR-143:               ✅ UNCHANGED

NEW (ADDITIVE ONLY):
T327–T346:                ✅ NEW — no modification to existing task types
F901–F944:                ✅ NEW — no modification to existing factories
CF-402–CF-429:            ✅ NEW — no modification to existing conflict rules
ST-227–ST-241:            ✅ NEW — no modification to existing stress tests
SK-201–SK-210:            ✅ NEW — no modification to existing skills
DD-192–DD-203:            ✅ NEW — no modification to existing decisions
DR-144–DR-151:             ✅ NEW — no modification to existing records
```

---

## FINAL STATUS

```
FLOW-22:              COMPLETE ✅
ALL 7 DOCUMENTS:      GENERATED AND SAVED ✅
DNA COMPLIANCE:       6/6 — ZERO VIOLATIONS ✅
BFA REGISTRATION:     COMPLETE ✅
BACKWARD COMPAT:      FULLY PRESERVED ✅
REQUIREMENT COVERAGE: 100% — ZERO GAPS ✅

System: F1–F944 | T1–T346 | Families 1–90 | FLOW-01 through FLOW-22
```

---

## SAVE POINT: FLOW22:P7:PLAN:COMPLETE ✅
## SAVE POINT: FLOW22:ALL_PHASES:COMPLETE ✅
## Recovery: "All 7 FLOW-22 documents complete. System: F1-F944, T1-T346, Families 1-90, 0 gaps."


---
---

# ═══════════════════════════════════════════════════════════════
# FLOW-23 — Visual Editor Extended: Execution Plan P0–P7
# Merged: 2026-02-27
# ═══════════════════════════════════════════════════════════════

# XIIGen MASTER EXECUTION PLAN — FLOW-23: Visual Editor Extended
## Delta File — P0–P7 execution phases for FLOW-23 only
## Extends: MASTER_EXECUTION_PLAN_MERGED.md (FLOW-01–FLOW-22 plans)

---

## FLOW-23 EXECUTION OVERVIEW

**Goal:** Extend the XIIGen engine to generate visual UI composition flows — a fabric-first Wix/Webflow-style canvas engine — built on top of the existing skill library and fabric interfaces.

**Output:** 7 canonical delta files (this set)
**Starting Numbers:** F945, T347, CF-430, ST-242, SK-211, DD-204, DR-152, Template 70, Family 135
**Ending Numbers:** F981, T366, CF-449, ST-256, SK-222, DD-218, DR-163, Template 75, Family 139

---

## P0 — RAG ORIENTATION & ANCHOR ESTABLISHMENT ✅
**Duration:** ~5 minutes
**Goal:** Read all source documents; extract system state; lock FLOW-23 starting numbers

**Steps:**
1. Read SESSION_STATE_MERGE.md → confirm F945/T347/CF-430 starting anchors
2. Read basic_prompt.txt → internalize DNA rules, factory pattern, AF stations
3. Read 23-visual-editor-extended.md → extract canvas editor, layout, binding requirements
4. Read 23-visual-editor-extended-deep-search-engine.md → extract state machine, API, DAG architecture
5. Read 23-visual-editor-extended-engine-multi-tenant.md → extract tenant isolation requirements
6. Build RAG index: map requirements to existing skills SK-1–SK-210 for reuse candidates
7. Identify reuse: SK-26 (WebFlowEditor), SK-17 (CodeGenerator), SK-21 (Permissions) as integration points

**Save Point:** P0_ANCHORS_LOCKED
```
Anchors confirmed:
  Factory: F945  Family: 94
  Task Type: T347
  Template: 56
  BFA Rule: CF-430
  Stress Test: ST-242
  Skill: SK-211
  Design Decision: DD-204
  Design Record: DR-152
```
**Recovery:** "Load SESSION_STATE_MERGE.md — confirm F945/T347/CF-430 anchors"

---

## P1 — ENGINE_ARCHITECTURE DELTA ✅
**Duration:** ~20 minutes
**Goal:** Define 5 new factory families (94–98), 37 factories (F945–F981), fabric resolution map, design records

**Steps:**
1. Define Family 135 (Visual Canvas Core): F945–F952, fabric mappings, DNA compliance notes
2. Define Family 136 (Layout Engine): F953–F959, pure computation vs AI-assisted distinction
3. Define Family 137 (Data Binding Bridge): F960–F966, JSONPath binding, CMS integration
4. Define Family 138 (Multi-Tenant Hardening): F967–F974, CloudEvents, idempotency, OTLP
5. Define Family 139 (Code Export & Deployment): F975–F981, multi-model export, artifact registry
6. Write full fabric resolution map (37 entries)
7. Write node tree schema contract (Dictionary pattern)
8. Write DR-152–DR-163 design records
9. Write promotion ladder for FLOW-23 services

**Deliverable:** `23_visual_editor_extended_ENGINE_ARCHITECTURE.md`
**Save Point:** FLOW19:ENGINE_ARCHITECTURE ✅
**Recovery:** "Load 23_visual_editor_extended_ENGINE_ARCHITECTURE.md — F945–F981 defined"

---

## P2 — TASK_TYPES_CATALOG DELTA ✅
**Duration:** ~25 minutes
**Goal:** Define T347–T366 (20 task types) with full engine contract format; 6 flow templates (56–61)

**Steps:**
1. T347–T351: Visual Canvas Core task types (node tree, symbols, layout, breakpoints, versioning)
2. T352–T354: Layout Engine orchestration (multi-model advisor, token sync, alignment gate)
3. T355–T359: Data Binding + Constraints (constraint gate, CMS binding, template mode, repeater, validator)
4. T360–T362: Multi-Tenant Guardrails (isolation gate, CloudEvents envelope, tier graduation)
5. T363–T366: Code Export + Full DAG (UI export, token export, artifact registry, full orchestration)
6. For each task type: ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES, QUALITY GATES
7. Templates 70–75: DAG JSON flow definitions for each flow variant

**Deliverable:** `23_visual_editor_extended_TASK_TYPES_CATALOG.md`
**Save Point:** FLOW19:TASK_TYPES_CATALOG ✅
**Recovery:** "Load 23_visual_editor_extended_TASK_TYPES_CATALOG.md — T347–T366 defined"

---

## P3 — SKILLS_FACTORY_RAG DELTA ✅
**Duration:** ~15 minutes
**Goal:** Define SK-211–SK-222 (12 new skills) with full method signatures, DNA-compliant patterns, AF-4 RAG index

**Steps:**
1. SK-211: NodeTreeService — Dictionary persistence, ES + Redis tiered
2. SK-212: LayoutSolverService — pure computation, MicroserviceBase
3. SK-213: ComponentConstraintService — lockLayout/allowContentEdit evaluation
4. SK-214: DataBindingBridgeService — JSONPath resolution, Template Mode, fallback
5. SK-215: BreakpointResolverService — patch management, AI suggestions
6. SK-216: ThemeTokenService — ES token store, QUEUE FABRIC propagation
7. SK-217: RoleLockService — OIDC role, auth context extraction
8. SK-218: FlowStateMachineService — Designing→Review→Published, guard conditions
9. SK-219: UICodeExportService — AiDispatcher, AF-9 gate, artifact registry
10. SK-220: TenantIsolationHardeningService — full OWASP compliance suite
11. SK-221: CanvasCollaborationService — Redis Streams consumer groups
12. SK-222: FlowSandboxService — Redis sandbox, promotion to production
13. Build AF-4 RAG Index table for all 12 skills

**Deliverable:** `23_visual_editor_extended_SKILLS_FACTORY_RAG.md`
**Save Point:** FLOW19:SKILLS_FACTORY_RAG ✅
**Recovery:** "Load 23_visual_editor_extended_SKILLS_FACTORY_RAG.md — SK-211–SK-222 defined"

---

## P4 — V62_BFA_STRESS_TEST DELTA ✅
**Duration:** ~15 minutes
**Goal:** Define CF-430–CF-457 (20 BFA conflict rules) and ST-242–ST-259 (15 stress tests)

**Steps:**
1. Map all cross-flow risk points: FLOW-23 vs FLOW-01, 02, 04, 09, 12, 13, 15, 18
2. CF-430–CF-434: Node ID/stream key namespacing collisions (FLOW-02, 04, 09, 12, 13)
3. CF-435–CF-441: Layout, constraint, token, role conflicts (FLOW-12, 13, 18, 01)
4. CF-442–CF-446: Data binding, Template Mode, repeater, skill schema (FLOW-02, 13, 09)
5. CF-447–CF-449: Tenant isolation gate ordering, quota namespacing, artifact IDs (FLOW-15, 18)
6. ST-242–ST-259: One stress test per major risk scenario
   - Concurrent multi-tenant, node ID collision, layout determinism, breakpoint stack
   - Template Mode isolation, quota enforcement, CloudEvents dedup, role lock
   - Symbol propagation, code export quality gate, tenant tier graduation
   - Binding path validation, collaborative conflict, sandbox isolation, token cascade

**Deliverable:** `23_visual_editor_extended_V62_BFA_STRESS_TEST.md`
**Save Point:** FLOW19:BFA_STRESS_TEST ✅
**Recovery:** "Load 23_visual_editor_extended_V62_BFA_STRESS_TEST.md — CF-430–CF-457, ST-242–ST-259"

---

## P5 — UNIFIED_SOURCE_INDEX DELTA ✅
**Duration:** ~10 minutes
**Goal:** Define DD-204–DD-218 (15 design decisions), DR-152–DR-163 (cross-reference), full source document map

**Steps:**
1. DD-204: UI Fabric-First (zero platform-specific values)
2. DD-205: Node tree tiered storage (ES + Redis)
3. DD-206: Collaboration via QUEUE FABRIC only
4. DD-207: Layout solver pure computation (no AI)
5. DD-208: JSONPath binding convention
6. DD-209: Template Mode read-only
7. DD-210: Multi-tenant hybrid pool/silo/bridge
8. DD-211: CloudEvents envelopes required
9. DD-212: Code export multi-model consensus
10. DD-213: Design tokens ES single source of truth
11. DD-214: Canvas state machine (Designing→Review→Published)
12. DD-215: IETF Idempotency-Key semantics
13. DD-216: Role from auth context only (never request body)
14. DD-217: Sandbox Redis isolation
15. DD-218: OTLP tenant labels at controlled cardinality
16. Cross-reference index table (all FLOW-23 artifact ranges)
17. Source input document map

**Deliverable:** `23_visual_editor_extended_UNIFIED_SOURCE_INDEX.md`
**Save Point:** FLOW19:UNIFIED_SOURCE_INDEX ✅
**Recovery:** "Load 23_visual_editor_extended_UNIFIED_SOURCE_INDEX.md — DD-204–DD-218 defined"

---

## P6 — MASTER_EXECUTION_PLAN DELTA ✅
**Duration:** ~10 minutes
**Goal:** Document this execution plan with all phases, save points, and recovery commands

**Steps:**
1. Write P0–P7 phase descriptions with goals, steps, durations
2. Document all save points and recovery commands
3. Write implementation readiness checklist
4. Write engine state verification procedure for FLOW-23

**Deliverable:** `23_visual_editor_extended_MASTER_EXECUTION_PLAN.md`
**Save Point:** FLOW19:MASTER_EXECUTION_PLAN ✅
**Recovery:** "Load 23_visual_editor_extended_MASTER_EXECUTION_PLAN.md — all 7 phases documented"

---

## P7 — SESSION_STATE DELTA ✅
**Duration:** ~5 minutes
**Goal:** Create SESSION_STATE delta with updated number anchors, FLOW-23 registry entry, next-flow anchors

**Steps:**
1. Confirm final counts: F981, T366, CF-449, ST-256, SK-222, DD-218, DR-163, Template 75, Family 139
2. Write FLOW-23 registry entry
3. Write FLOW-20 starting anchors
4. Write recovery commands for FLOW-23 reload

**Deliverable:** `23_visual_editor_extended_SESSION_STATE.md`
**Save Point:** FLOW19:ALL_DELTA_FILES_COMPLETE ✅

---

## IMPLEMENTATION READINESS CHECKLIST

Before any generated code ships, verify all of the following pass:

### Engine Contract Verification
- [ ] All 37 factories (F945–F981) registered in factory registry
- [ ] All 37 factories have fabric resolution declared (no "TBD" entries)
- [ ] All 20 task types (T347–T366) have complete engine contract (all 9 fields)
- [ ] All 6 templates (56–61) have valid DAG JSON with step 1 = T360

### DNA Compliance Verification
- [ ] DNA-1: All node documents use `dict[str, Any]` — no typed DTO classes
- [ ] DNA-2: All ES queries use `build_search_filter` — empty fields auto-skipped
- [ ] DNA-3: All methods return `DataProcessResult[T]` — no business logic exceptions thrown
- [ ] DNA-4: All services extend MicroserviceBase — no standalone classes
- [ ] DNA-5: tenantId on every database query — verified by AF-7 compliance check
- [ ] DNA-6: DynamicController used — no canvas-entity-specific controllers
- [ ] DNA-7–9: Check against extended DNA patterns in SK-1–SK-210

### BFA Conflict Clearance
- [ ] CF-430–CF-457 all checked against existing FLOW-01–FLOW-22 artifacts
- [ ] No node ID / stream key / artifact ID collisions detected
- [ ] T360 (Tenant Isolation Gate) is step 1 in all Templates 70–75
- [ ] CF-442/CF-444 (Template Mode read-only) verified by AF-8 security scan

### AF Station Coverage
- [ ] AF-1 (Genesis): FLOW-23 services generated by AF-1 on top of F945–F981
- [ ] AF-4 (RAG): SK-211–SK-222 indexed in AF-4 retrieval index
- [ ] AF-7 (Compliance): DNA-1/2/3/4/5 compliance on all generated code
- [ ] AF-8 (Security): OWASP API1/4/6/7 checks on T360/T361/T363
- [ ] AF-9 (Judge): all quality gates defined; T363 export requires score ≥ 0.8
- [ ] AF-11 (Feedback): quality scores stored for SK-215 (breakpoint), SK-219 (code export)

### Backward Compatibility
- [ ] FLOW-01–FLOW-22 factory interfaces F1–F944 unchanged
- [ ] FLOW-01–FLOW-22 task types T1–T346 unchanged
- [ ] FLOW-01–FLOW-22 templates 1–55 unchanged
- [ ] BFA rules CF-1–CF-429 unchanged
- [ ] All stress tests ST-1–ST-241 still pass

---

## RECOVERY COMMANDS — FLOW-23

```bash
# Full FLOW-23 reload
"Load all 7 FLOW-23 delta files — Visual Editor Extended complete"

# Load specific delta
"Load 23_visual_editor_extended_ENGINE_ARCHITECTURE — F945–F981"
"Load 23_visual_editor_extended_TASK_TYPES_CATALOG — T347–T366"
"Load 23_visual_editor_extended_SKILLS_FACTORY_RAG — SK-211–SK-222"
"Load 23_visual_editor_extended_V62_BFA_STRESS_TEST — CF-430–CF-457"
"Load 23_visual_editor_extended_UNIFIED_SOURCE_INDEX — DD-204–DD-218"
"Load 23_visual_editor_extended_MASTER_EXECUTION_PLAN"
"Load 23_visual_editor_extended_SESSION_STATE"

# Continue from specific save point
"Resume FLOW-23 from FLOW19:ENGINE_ARCHITECTURE — all factories defined"
"Resume FLOW-23 from FLOW19:TASK_TYPES_CATALOG — T347–T366 complete"
"Resume FLOW-23 from FLOW19:BFA_STRESS_TEST — CF-430–CF-457 complete"

# Start next flow
"Start FLOW-20 from F734, T289, CF-349, SK-173, DD-164, DR-123, Template 62, Family 99"
```

---

---

# ═══════════════════════════════════════════════════════════════
# FLOW-24: Learning Calendar Extension (Personal AI Tutor)
# Factories F982–F1027 | Task Types T367–T374 | Families 140–146
# ═══════════════════════════════════════════════════════════════

## EXECUTION ZONES

### ZONE A — Student Identity & Consent Foundation
**Factories:** F982–F987 (Family 140)  
**Task Types:** T367 (partial — identity/consent steps)  
**Phase duration:** ~30 min  

**Deliverables:**
1. IStudentProfileService (F982) — PostgreSQL, tenant-scoped
2. IConsentProfileService (F983) — minor gate, GDPR/COPPA, append-style consent log
3. IStudentAuthService (F984) — MicroserviceBase auth context passthrough
4. IMultiTenantTutorGate (F985) — quota + noisy-neighbor + scope enforcement
5. ILocaleConfigService (F986) — ES FREEDOM config for locale/curriculum settings
6. ICurriculumPackService (F987) — domain pack registry (school/biz/dev)

**Save point:** `FLOW24:ZONE_A:F982-F987`  
**Recovery:** "Load ENGINE_ARCHITECTURE_MERGED — FLOW-24 Zone A — Family 140"

---

### ZONE B — Knowledge Diagnosis Engine
**Factories:** F988–F993 (Family 141)  
**Task Types:** T367 (diagnosis steps), T371  
**Phase duration:** ~30 min  

**Deliverables:**
1. IKnowledgeMapService (F988) — ES, optimistic concurrency, tenant-scoped
2. IQuestionnaireService (F989) — PG, domain-pack-driven questionnaire definitions
3. IBaselineQuizService (F990) — PG append-only attempts
4. IDiagnosticScoreService (F991) — AI Engine Fabric, multi-model conservative consensus
5. IKnowledgeGapAnalyzer (F992) — RAG Vector strategy, gap pattern retrieval
6. IPrerequisiteValidator (F993) — DB Fabric → Neo4j, graph readiness check

**Key integration:** T367 orchestrates: consent gate (Zone A) → questionnaire → baseline quiz → F991 diagnostic score → F988 knowledge map build → F993 prerequisite validation  

**Save point:** `FLOW24:ZONE_B:F988-F993`  
**Recovery:** "Load ENGINE_ARCHITECTURE_MERGED — FLOW-24 Zone B — Family 141"

---

### ZONE C — Curriculum Graph & RAG
**Factories:** F994–F999 (Family 142)  
**Task Types:** T368, T371 (curriculum selection steps)  
**Phase duration:** ~30 min  

**Deliverables:**
1. ICurriculumGraphService (F994) — Neo4j via DB Fabric, path traversal
2. ITopicOntologyService (F995) — RAG Hybrid (graph + vector), topic search
3. IPrerequisiteEdgeService (F996) — Neo4j, edge management
4. IMasteryPathService (F997) — AI Engine Fabric, int-horizon path planning
5. ILearningAtomService (F998) — RAG Vector, atom storage + retrieval
6. ITopicProgressService (F999) — PG, per-topic session history

**Key integration:** SK-226 (Curriculum Graph-RAG) documents the hybrid traversal pattern. F993 + F994 + F995 combine for topic selection in T368 Step S02–S03.

**Save point:** `FLOW24:ZONE_C:F994-F999`  
**Recovery:** "Load ENGINE_ARCHITECTURE_MERGED — FLOW-24 Zone C — Family 142"

---

### ZONE D — Lesson Composer + Safety Gate
**Factories:** F1000–F1007 (Family 143)  
**Task Types:** T368 (lesson generation pipeline), T372, T374  
**Phase duration:** ~35 min  

**Deliverables:**
1. ILessonComposerService (F1000) — AI Engine Fabric, AiDispatcher multi-model
2. IRAGAtomFetcherService (F1001) — RAG Vector, pre-composition atom retrieval
3. ILessonSafetyGate (F1002) — AI Engine Fabric moderation, SafetyGateToken protocol
4. ILessonPublishService (F1003) — MongoDB, requires SafetyGateToken
5. ILessonLocalizationService (F1004) — AI Engine Fabric, locale variants
6. IDifficultyAdapterService (F1005) — AI Engine Fabric, simplify/enrich branches
7. ILessonCatalogService (F1006) — ES index, searchable catalog
8. ILessonContentStore (F1007) — MongoDB, multi-variant content

**Critical path:** F1001 (RAG) → F1000 (compose) → F1005 (adapt) → F1002 (safety gate) → F1003 (publish). ORDER IS IRON RULE.  

**Template 77 validated in this zone.**

**Save point:** `FLOW24:ZONE_D:F1000-F1007`  
**Recovery:** "Load TASK_TYPES_CATALOG_MERGED — T368 + Template 77"

---

### ZONE E — Quiz Engine & Gamification Ledger
**Factories:** F1008–F1019 (Families 144–124)  
**Task Types:** T369 (hybrid quiz → gamification), T371  
**Phase duration:** ~35 min  

**Deliverables:**
1. IQuizGeneratorService (F1008) — AI Engine Fabric, topic-aware quiz generation
2. IQuizRunnerService (F1009) — PG, session management
3. IQuizAttemptStore (F1010) — PG append-only, immutable attempts
4. IQuizGraderService (F1011) — AI Engine Fabric (server-side, MACHINE)
5. IQuizAdaptationService (F1012) — AI Engine Fabric, difficulty recommendations
6. IQuizTemplateService (F1013) — RAG FanOut, template retrieval
7. IGamificationLedgerService (F1014) — PG append-only ledger
8. IBadgeDefinitionService (F1015) — ES FREEDOM config
9. IBadgeUnlockService (F1016) — Queue Fabric Redis Streams, async badge eval
10. IStreakManagerService (F1017) — Redis hot + PG persist, timezone-correct
11. IPointsCalculatorService (F1018) — CORE Fabric MACHINE compute
12. ILeaderboardService (F1019) — Redis sorted sets

**Critical patterns:** SK-228 (ledger), SK-229 (streak), Template 78 (hybrid contract)  
**BFA rules activated:** CF-462, CF-463, CF-464, CF-467 all verified in this zone.

**Save point:** `FLOW24:ZONE_E:F1008-F1019`  
**Recovery:** "Load TASK_TYPES_CATALOG_MERGED — T369 + Template 78"

---

### ZONE F — Adaptive Planner & Calendar Sync
**Factories:** F1020–F1027 (Family 146)  
**Task Types:** T370, T371, T373, T374  
**Phase duration:** ~30 min  

**Deliverables:**
1. ILessonPlanService (F1020) — PG, 30-day plan storage
2. IAdaptivePlannerService (F1021) — AI Engine Fabric, plan adaptation
3. ICalendarSyncService (F1022) — Queue Fabric Redis Streams, durable sync
4. IGoogleCalendarConnector (F1023) — CORE Fabric external connector
5. IOutlookCalendarConnector (F1024) — CORE Fabric external connector
6. IQuietHoursService (F1025) — PG FREEDOM config
7. IReminderOrchestratorService (F1026) — Queue Fabric Redis Streams, escalation
8. IStreakProtectionService (F1027) — PG, uses-per-month enforcement

**Templates 79 (missed lesson recovery) and T373 (conflict resolution) validated in this zone.**

**Save point:** `FLOW24:ZONE_F:F1020-F1027`  
**Recovery:** "Load ENGINE_ARCHITECTURE_MERGED — FLOW-24 Zone F — Family 146"

---

### ZONE G — Integration, BFA Validation & DNA Lock
**Task Types:** T367–T374 full validation  
**BFA Rules:** CF-458–CF-472 all active  
**Stress Tests:** ST-260–ST-269 all run  
**Phase duration:** ~30 min  

**Deliverables:**
1. Full flow integration tests — all 4 templates (76–79) exercised end-to-end
2. BFA conflict detection — all 15 rules triggered and handled
3. DNA compliance scan — AF-7 validates all 46 factories against DNA-1 through DNA-9
4. Security scan — AF-8 validates: consent gate, server-side grading, no SDK imports, timezone trust
5. Multi-tenant isolation test — ST-260 (cross-tenant), ST-263 (minor consent), ST-268 (SDK check)
6. Backward compatibility verification — F1–F981, T1–T366, CF-1–CF-457 unchanged
7. SESSION_STATE updated — canonical state document updated to FLOW-24

**Save point:** `FLOW24:ZONE_G:COMPLETE`

---

## EXECUTION SEQUENCING

```
ZONE A → ZONE B → ZONE C → ZONE D → ZONE E → ZONE F → ZONE G
  ↓          ↓          ↓         ↓          ↓          ↓         ↓
 F982–F987  F988–F993  F994–F999 F1000–F1007  F1008–F1019  F1020–F1027  VALIDATE
 ~30min     ~30min     ~30min    ~35min     ~35min     ~30min     ~30min
```

**Parallelization opportunities:** Zone C (curriculum graph) can run parallel to Zone B after F988 (knowledge map) is ready. Zone E (quiz) can run parallel to Zone D (lesson) — they share no factory dependencies.

---

## DOMAIN PACK SUPPORT MATRIX

| Flow / Zone | School Pack | Business Owner Pack | Developer Pack |
|-------------|-------------|---------------------|----------------|
| Onboarding (T367) | ✅ | ✅ | ✅ |
| Daily Lesson (T368) | ✅ | ✅ | ✅ |
| Quiz + Gamification (T369) | ✅ | ✅ | ✅ |
| Missed Lesson Recovery (T370) | ✅ | ✅ | ✅ |
| Knowledge Map Update (T371) | ✅ | ✅ | ✅ |
| Weekly Research Digest (T372) | ❌ | ❌ | ✅ (FREEDOM enabled) |
| Calendar Conflict Resolution (T373) | ✅ | ✅ | ✅ |
| Monthly Capstone (T374) | ❌ | ✅ | ✅ |

---

## FREEDOM vs MACHINE — QUICK REFERENCE

| Parameter | MACHINE (fixed) | FREEDOM (ES config) |
|-----------|----------------|---------------------|
| Minor status | ✅ Server READ-ONLY | — |
| Consent gate | ✅ Blocking — no bypass | — |
| Quiz grading | ✅ Server-side F1011 | — |
| Points formula structure | ✅ F1018 computes | Values configurable |
| Ledger append-only | ✅ DDL + app enforced | — |
| Streak timezone | ✅ From F982 profile | — |
| Safety gate blocking | ✅ F1002 required | Threshold configurable |
| Lesson length | — | ✅ 5/7/10 min |
| Badge thresholds | — | ✅ ES config via F1015 |
| Reminder policy | — | ✅ soft/hard/none |
| Quiet hours | — | ✅ Per-student in F1025 |
| Quiz frequency | — | ✅ Configurable |
| AI model selection | — | ✅ Per tenant in F986 |
| Calendar provider | — | ✅ From F982 profile |
| Sources whitelist (dev) | — | ✅ ES config F986 |
| Domain pack | — | ✅ F987 config |

---

## RECOVERY COMMANDS

```
Load full FLOW-24:            "Load all 7 FLOW-24 files — Learning Calendar Extension"
Resume from Zone A:           "Load FLOW-24 ENGINE_ARCHITECTURE — F982-F987 defined"
Resume from Zone D:           "Load FLOW-24 TASK_TYPES_CATALOG — T368 + Template 77"
Resume from Zone E:           "Load FLOW-24 TASK_TYPES_CATALOG — T369 + Template 78"
Resume from BFA:              "Load FLOW-24 V62_BFA_STRESS_TEST — CF-458-CF-472"
Resume from skills:           "Load FLOW-24 SKILLS_FACTORY_RAG — SK-223-SK-232"
Check specific pattern:       "Load FLOW-24 SKILLS_FACTORY_RAG — search for SK-[N]"
Start FLOW-25:                "Start FLOW-25 from F1028, T375, CF-473, SK-233"
```

---

## SAVE POINT: FLOW24:MASTER_EXECUTION_PLAN ✅

---

# ═══════════════════════════════════════════════════════════════
# FLOW-25: Business Flow Arbiter — Execution Plan
# 7 Zones (A–G) | 3 Templates (80–82) | Recovery Commands
# ═══════════════════════════════════════════════════════════════

## EXECUTION ZONES

### ZONE A — Change Intake & Entity Extraction (Family 147, F1028–F1034)

**Purpose:** Receive proposed change → parse → extract entity/API/field references → persist canonical document → write to dependency index.

**Execution sequence:**
```
1. IProposedChangeParserService (F1028)
   INPUT:  Raw change payload (JSON Patch | schema diff | flow DAG diff | code AST)
   OUTPUT: Canonical ProposedChange document → DATABASE FABRIC (ES)
   GATE:   CF-473 (change_type must be in valid enum)

2. IEntityReferenceExtractorService (F1029)
   INPUT:  ProposedChange document
   OUTPUT: Entity references with access_type (READ|WRITE|DELETE|CREATE)
   GATE:   CF-474 (uniqueness check — dedup by changeId + entityName)

3. IApiSurfaceExtractorService (F1030)
   INPUT:  ProposedChange document
   OUTPUT: API route/method/contract change references
   RUNS-IN-PARALLEL: with F1029 (both extract from same change doc)

4. IFlowDependencyIndexWriterService (F1031)
   INPUT:  Entity refs + API refs from F1029/F1030
   OUTPUT: Written to bfa-entity-dependency-index (ES)
   GATE:   CF-475 (index must not be stale — health check on last update)

5. ISchemaDiffClassifierService (F1032)
   INPUT:  ProposedChange (for SCHEMA_DIFF type)
   OUTPUT: BreakingChangeType classification → FIELD_REMOVAL | FIELD_RENAME | TYPE_CHANGE | etc.
   GATE:   CF-477 (FIELD_REMOVAL on required field = CRITICAL, no override without T384 FORCE_PROCEED)

6. IStateTransitionAnalyzerService (F1033)
   INPUT:  ProposedChange (for STATE_MACHINE type)
   OUTPUT: List of removed/changed transitions → cross-referenced against FLOW-01–FLOW-24
   GATE:   CF-478 (removed transition used by another flow = CRITICAL)

7. IChangeDocumentPersistenceService (F1034)
   INPUT:  Assembled extraction results
   OUTPUT: Immutable change document written to PG (DNA-8: persist before emit)
   GATE:   DNA-8 enforced — state persisted BEFORE queue event emitted
```

**Phase completion check:**
- [ ] ProposedChange document in ES with canonical form
- [ ] Entity/API refs extracted with access_type
- [ ] BreakingChangeType classified
- [ ] Change document persisted (PG, append-only)
- [ ] CF-473 through CF-478 validated

---

### ZONE B — Conflict Detection Engine (Family 148, F1035–F1042)

**Purpose:** Query dependency index → run static conflict rules → run semantic AI analysis → aggregate severity score.

**Execution sequence:**
```
1. IDependencyIndexQueryService (F1035)
   INPUT:  Entity names from Zone A extraction
   OUTPUT: All flows (FLOW-01–FLOW-24) that reference these entities
   GATE:   CF-476 (every query must carry tenantId)
   NOTE:   Returns dict[str, Any][] — never typed models (DNA-1)

2. IStaticConflictRulesEngineService (F1036)
   INPUT:  Entity refs + classified change type + dependent flows list
   OUTPUT: StaticConflictList (severity per conflict, evidence refs)
   RULES:  CF-477, CF-478, CF-479 evaluated here
   GATE:   IR-378-1: Static rules MUST complete before semantic analysis starts
   NOTE:   DETERMINISTIC — same input always yields same output

3. IBlastRadiusCalculatorService (F1037)
   INPUT:  StaticConflictList + dependent flows
   OUTPUT: BlastRadiusReport {directlyImpacted[], transitivelyImpacted[], affectedTaskTypes[]}
   GATE:   IR-380-1: Circular dependency → log and continue, never throw

4. IBreakingChangeValidatorService (F1038)
   INPUT:  ISchemaDiffClassifier output + BlastRadiusReport
   OUTPUT: BreakingChangeValidation {isBreaking, severity, requiredActions[]}
   TRIGGERS: If CRITICAL → skip to Zone D immediately (no semantic needed for highest severity)

5. ISemanticConflictAnalyzerService (F1039)
   INPUT:  ProposedChange + ContextBundle (from Zone C) + StaticConflictList
   OUTPUT: SemanticImpactAssessment {conflicts[], severity, evidence[], explanation}
   GATE:   CF-480 (semantic MUST NOT run before static — IR-378-1)
   AI:     AF-5 (Multi-model) — Claude + OpenAI + Gemini in parallel via AiDispatcher
   PROMPT: "You are a Business Logic Arbiter. Analyze the proposed change against provided
            flow definitions, schemas, and documentation. Identify logical collisions,
            broken state transitions, and downstream cascades. Output structured JSON only.
            Evidence must be real references — hallucinated references = analysis failure."
   GATE:   CF-481 (AI CRITICAL claim requires ≥1 static evidence link)

6. ISemanticOutputValidatorService (F1040)
   INPUT:  SemanticImpactAssessment
   OUTPUT: ValidatedAssessment (schema-validated, evidence verified)
   GATE:   If output fails JSON schema → re-run F1039 once, then fall back to static-only

7. ISeverityAggregatorService (F1041)
   INPUT:  StaticConflictList + ValidatedAssessment
   OUTPUT: FinalSeverity (CRITICAL | HIGH | MEDIUM | LOW | NONE)
   RULE:   Static CRITICAL → always CRITICAL (semantic cannot downgrade)
           Semantic HIGH without static corroboration → escalate to human review, not auto-CRITICAL

8. IConflictReportAssemblerService (F1042)
   INPUT:  All conflict analysis outputs
   OUTPUT: ConflictReport document → ES (searchable, tenant-scoped)
   GATE:   CF-482 (empty context bundle → fail, not silently pass)
```

**Phase completion check:**
- [ ] Dependency index queried with tenantId scope
- [ ] Static conflict rules evaluated (deterministic)
- [ ] Blast radius calculated
- [ ] Semantic analysis run and validated (if not CRITICAL-from-static)
- [ ] Severity aggregated
- [ ] ConflictReport assembled and persisted

---

### ZONE C — Context Aggregation Service (Family 150, F1050–F1056)

**Purpose:** RAG-based retrieval of all relevant flow definitions, schemas, design records, and documentation for semantic analysis input.

**Runs in parallel with Zone B static analysis (feeds Zone B step 5):**
```
1. IFlowRegistryReaderService (F1050)
   INPUT:  Entity names, flow IDs from dependency query
   OUTPUT: FlowDefinition documents from FLOW-01–FLOW-24
   FABRIC: DATABASE FABRIC (ES) → flow-definitions index

2. ISchemaRegistryReaderService (F1051)
   INPUT:  Entity names
   OUTPUT: Schema snapshots (current + prior versions)
   FABRIC: DATABASE FABRIC (PG) → ISchemaSnapshotService

3. IDocumentationVectorSearchService (F1052)
   INPUT:  Entity names + change type + search keywords
   OUTPUT: Relevant documentation chunks (vector similarity search)
   FABRIC: RAG FABRIC (SK-389 (HybridRagStrategy)) → Hybrid strategy (admin-configurable)

4. IDesignRecordContextService (F1053)
   INPUT:  Entity names, flow IDs
   OUTPUT: Relevant DRs and DDs from UNIFIED_SOURCE_INDEX
   FABRIC: DATABASE FABRIC (ES)

5. IBFAContextBundlerService (F1054)
   INPUT:  Outputs from F1050–F1053
   OUTPUT: ContextBundle {relevantFlows[], entitySchemas[], docs[], designRecords[]}
   GATE:   CF-482 (ContextBundle.relevantFlows must not be empty if entity has dependencies)

6. IBFAContextCacheService (F1055)
   INPUT:  ContextBundle + changeId
   OUTPUT: Cached bundle with 10-minute TTL (DR-177)
   NOTE:   Cache invalidated on flow registry update

7. IBFAHistoricalDecisionService (F1056)
   INPUT:  Entity names + change type
   OUTPUT: Prior decisions on similar changes (precedent fast-path, DR-179)
   NOTE:   Optional — if identical pattern found with APPROVED precedent → fast-path suggestion
           Human still decides; precedent is advisory only
```

---

### ZONE D — Arbitration Orchestrator (Family 149, F1043–F1049)

**Purpose:** State machine for the full arbitration lifecycle — pause, route to human, receive decision, apply resolution.

**State machine (DR-174):**
```
Idle → CollectingContext → AnalyzingImpact → [Approved | PendingUserResolution]
PendingUserResolution → [ApplyingResolution | TimedOut]
ApplyingResolution → [Approved | Rejected | PartialRefactor]
TimedOut → Escalated (never auto-approved)
```

**Execution sequence:**
```
1. IArbitrationStateMachineService (F1043)
   FABRIC: QUEUE FABRIC (SK-383 (RedisStreamQueue)) → Redis Streams
   Methods: TransitionState(changeId, from, to), GetCurrentState(changeId)
   DNA-8: State persisted to PG BEFORE queue event emitted
   GATE:   CF-484 (PendingUserResolution state must persist to PG before routing)

2. IArbitrationSessionPersistenceService (F1044)
   FABRIC: DATABASE FABRIC (PG)
   Methods: SaveSession(changeId, sessionData), ResumeSession(changeId)
   Recovery: Session rehydration < 60 seconds (IR-381-3)

3. IHumanResolutionRouterService (F1045)
   INPUT:  ImpactReport + tenant notification config
   OUTPUT: Notification dispatched to configured channels (CLI | Web | Chat | Email)
   FREEDOM: Admin configures channels per tenant + per severity level
   Impact Report presented includes:
     - Summary of proposed change
     - List of directly impacted flows (with task type references)
     - List of transitively impacted flows
     - Breaking change classification
     - Recommended resolution option (advisory)
   Decision options:
     [A] REFACTOR    — AI generates refactoring for dependent flows
     [B] REJECT      — Cancel change, keep existing logic
     [C] COMPAT      — Keep change but add backward-compat wrapper (must include sunset date CF-496)
     [D] FORCE_PROCEED — Override (requires elevated permission + rationale ≥50 chars + CF-492)

4. IUserDecisionReceiverService (F1046)
   FABRIC: DATABASE FABRIC (PG)
   INPUT:  User-submitted decision + rationale
   GATE:   CF-493 (SETNX dedup — only one decision per changeId)
   GATE:   CF-492 (FORCE_PROCEED must have rationale ≥50 chars)
   GATE:   IR-383-3 (Actor re-validated at capture time — not from cached session)

5. IResolutionApplierService (F1047)
   INPUT:  Captured decision
   REFACTOR: Calls AI (AF-1 Genesis + AF-5 Multi-model) to generate flow update tasks
   COMPAT:   Generates backward-compat wrapper spec → queued for code generation
   REJECT:   Emits change.rejected event; unblocks original pipeline with rejection result
   FORCE_PROCEED: Calls F1070 (override tracker) first; THEN proceeds
   GATE:   CF-494 (FORCE_PROCEED: override log MUST be written before publish unblocked)
   GATE:   CF-495 (REFACTOR: refactor tasks must be queued, not fire-and-forget)

6. IArbitrationTimeoutService (F1048)
   FABRIC: QUEUE FABRIC (Redis Streams)
   FREEDOM: Admin configures timeout TTL per severity (CRITICAL: 4h, HIGH: 24h, MEDIUM: 72h)
   On expiry: escalate to admin role (never auto-approve)
   GATE:   CF-486 (timeout must not auto-approve — escalate only)

7. IArbitrationEscalationService (F1049)
   FABRIC: QUEUE FABRIC (Redis Streams)
   On escalation: notify configured admin users, create incident record
```

**Phase completion check:**
- [ ] Arbitration state machine running with PG-backed state
- [ ] Impact report routed to human via configured channel
- [ ] Decision captured with idempotency guard
- [ ] Resolution applied (refactor | reject | compat | force-proceed)
- [ ] Timeout/escalation configured per severity

---

### ZONE E — Human-in-Loop Resolution UI Fabric (Family 151, F1057–F1062)

**Purpose:** UI render spec for impact report, decision capture UX, and refactor/compat coordination. Fabric-first: zero platform-specific values.

```
F1057: IImpactReportRendererService
  OUTPUT: ImpactReportRenderSpec document (JSON stored in ES)
  Render spec includes: severity badge, impacted flow list, diff viewer hint, decision buttons
  FABRIC-FIRST: All UI specs as ES documents. DynamicController routes. No entity controllers.

F1058: IDecisionOptionBuilderService
  OUTPUT: DecisionOptionSpec — 4 options with visibility rules (FORCE_PROCEED hidden unless bfa:override role)
  FREEDOM: Admin can add/hide options per tenant via ES config

F1059: IDecisionCaptureService
  INPUT:  Rendered decision + user identity (re-validated, not cached)
  OUTPUT: CaptureResult → routed to F1046 (IUserDecisionReceiverService)
  DNA-7: Idempotency via SETNX on (changeId, sessionId)

F1060: IResolutionNotificationService
  OUTPUT: Notification to user confirming decision applied + audit reference
  CHANNELS: CLI | Web toast | Chat message | Email — FREEDOM per tenant

F1061: IAutoRefactorCoordinatorService
  INPUT:  REFACTOR decision
  OUTPUT: List of flow-update tasks queued in Redis Streams (one per impacted flow)
  AF-1 (Genesis): Generates the actual refactoring steps for each affected flow
  AF-9 (Judge): Validates refactoring output does not introduce new conflicts

F1062: ICompatibilityWrapperService
  INPUT:  COMPAT decision
  OUTPUT: Backward-compat wrapper spec for each breaking change
  RULE:   Must include sunset date (CF-496)
```

---

### ZONE F — BFA Multi-Tenant Extension (Family 152, F1063–F1068)

**Purpose:** Tenant-scoped arbiter execution — every conflict check, decision, and audit record is tenant-isolated. Inherits FLOW-08 (Payment MT) and FLOW-21 (Forms MT) patterns.

```
F1063: IBFATenantConflictIndexService
  Every conflict detection query carries tenantId (DNA-5)
  Tenant-specific conflict rules can override global rules (FREEDOM: ES config per tenant)

F1064: ICrossTenantConflictGuardService
  Prevents cross-tenant data leaks in arbiter output
  IR-387-1: Guard output must be aggregated only — no per-tenant data in cross-tenant reports

F1065: IBFATenantProvisionService
  Provisions BFA for new tenant: creates tenant-scoped ES indices, PG schemas
  IR-386-1: Arbiter must not run for unprovisioned tenant (fail-safe, not silent pass)

F1066: IBFATenantIsolationValidatorService
  Validates all arbiter queries carry tenantId before execution
  CF-499 (BFA_TENANT_NOT_PROVISIONED), CF-500 (health gap in isolation validator)

F1067: IBFATenantAuditTrailService
  Per-tenant audit trail (separate from global audit at F1070)
  DNA-9: Per-field audit logging for all tenant-scoped decisions

F1068: IBFATenantMetricsService
  Per-tenant metrics: arbitration rate, block rate, override rate
  IR-388-2: All metrics must include tenantId
```

---

### ZONE G — BFA Analytics & Observability (Family 153, F1069–F1074)

**Purpose:** Platform-level metrics, force-override tracking, pattern learning, and OpenTelemetry instrumentation.

```
F1069: IBFAPlatformMetricsService
  Platform-wide metrics: total arbitrations, severity distribution, avg decision time
  Read-only aggregations (DR-181): no write operations on arbiter records

F1070: IForceOverrideTrackerService
  Tracks FORCE_PROCEED events globally across tenants (platform safety dashboard)
  CF-498: Each force-proceed appears in BOTH tenant audit (F1067) AND global tracker

F1071: IBFADecisionQualityService
  Stores quality signal per arbitration (was the decision correct?)
  AF-11 (Feedback): Uses these signals to improve semantic analysis prompts

F1072: IBFAPatternLearningService
  Identifies recurring change patterns that consistently result in conflicts
  Feeds DR-179 (precedent fast-path): if pattern seen ≥3 times with same severity, suggest precedent

F1073: IBFAOpenTelemetryService
  FABRIC: All metrics/traces via MicroserviceBase observability hooks (SK-379 (MicroserviceBase))
  Emits: trace per arbitration lifecycle, span per zone, metric per decision type
  All cross-service traces carry correlationId for end-to-end debugging

F1074: IBFAReportExportService
  Compliance reports (F1055 data) → exportable as JSON | Markdown | CSV
  FREEDOM: Admin configures export format and retention window
```

---

## FLOW TEMPLATES

### Template 80: bfa-entity-change-arbitration-v1
**Trigger:** Entity change detected (WRITE | DELETE on indexed entity)
```json
{
  "flow_id": "bfa-entity-change-arbitration-v1",
  "trigger": "entity.change.detected",
  "steps": [
    { "id": "s1", "task_type": "T375", "factory": "F1028", "fabric": "DATABASE_FABRIC" },
    { "id": "s2", "task_type": "T376", "factory": "F1035", "fabric": "DATABASE_FABRIC", "depends_on": ["s1"] },
    { "id": "s3", "task_type": "T377", "factory": "F1054", "fabric": "RAG_FABRIC", "parallel_with": "s2" },
    { "id": "s4", "task_type": "T378", "factory": "F1036", "fabric": "DATABASE_FABRIC", "depends_on": ["s2"] },
    { "id": "s5", "task_type": "T379", "factory": "F1039", "fabric": "AI_ENGINE_FABRIC", "depends_on": ["s3", "s4"] },
    { "id": "s6", "task_type": "T380", "factory": "F1042", "fabric": "DATABASE_FABRIC", "depends_on": ["s5"] },
    { "id": "s7", "task_type": "T381", "factory": "F1043", "fabric": "QUEUE_FABRIC", "depends_on": ["s6"] },
    { "id": "s8", "task_type": "T382", "factory": "F1046", "fabric": "DATABASE_FABRIC", "depends_on": ["s7"] },
    { "id": "s9", "task_type": "T383", "factory": "F1052", "fabric": "DATABASE_FABRIC", "depends_on": ["s8"] },
    { "id": "s10","task_type": "T384", "factory": "F1067", "fabric": "DATABASE_FABRIC", "depends_on": ["s8"] }
  ]
}
```

### Template 81: bfa-flow-publication-gate-v1
**Trigger:** Flow publish requested (any FLOW-01 through FLOW-24 + new flows)
```json
{
  "flow_id": "bfa-flow-publication-gate-v1",
  "trigger": "flow.publish.requested",
  "gate_mode": true,
  "steps": [
    { "id": "s1", "task_type": "T375", "factory": "F1028", "fabric": "DATABASE_FABRIC" },
    { "id": "s2", "task_type": "T376", "factory": "F1035", "fabric": "DATABASE_FABRIC", "depends_on": ["s1"] },
    { "id": "s3", "task_type": "T377", "factory": "F1054", "fabric": "RAG_FABRIC", "depends_on": ["s1"] },
    { "id": "s4", "task_type": "T378", "factory": "F1036", "fabric": "DATABASE_FABRIC", "depends_on": ["s2"] },
    { "id": "s5", "task_type": "T379", "factory": "F1039", "fabric": "AI_ENGINE_FABRIC", "depends_on": ["s3", "s4"] },
    { "id": "s6", "task_type": "T380", "factory": "F1042", "fabric": "DATABASE_FABRIC", "depends_on": ["s5"] },
    { "id": "s7", "task_type": "T381", "factory": "F1043", "fabric": "QUEUE_FABRIC", "depends_on": ["s6"] },
    { "id": "s8", "task_type": "T382", "factory": "F1059", "fabric": "DATABASE_FABRIC", "depends_on": ["s7"] },
    { "id": "s9", "task_type": "T385", "factory": "F1067", "fabric": "DATABASE_FABRIC", "depends_on": ["s8"] },
    { "id": "s10","task_type": "T388", "factory": "F1069", "fabric": "DATABASE_FABRIC", "depends_on": ["s9"] }
  ],
  "gate_result_path": "s7.state_output.gate_decision"
}
```

### Template 82: bfa-cross-tenant-platform-guard-v1
**Trigger:** Platform-level change affecting multiple tenants (admin operation)
```json
{
  "flow_id": "bfa-cross-tenant-platform-guard-v1",
  "trigger": "platform.entity.change.admin",
  "tenant_scope": "ALL",
  "steps": [
    { "id": "s1", "task_type": "T375", "factory": "F1028", "fabric": "DATABASE_FABRIC" },
    { "id": "s2", "task_type": "T376", "factory": "F1035", "fabric": "DATABASE_FABRIC", "depends_on": ["s1"] },
    { "id": "s3", "task_type": "T378", "factory": "F1036", "fabric": "DATABASE_FABRIC", "depends_on": ["s2"] },
    { "id": "s4", "task_type": "T381", "factory": "F1043", "fabric": "QUEUE_FABRIC", "depends_on": ["s3"] },
    { "id": "s5", "task_type": "T387", "factory": "F1064", "fabric": "DATABASE_FABRIC", "depends_on": ["s4"] },
    { "id": "s6", "task_type": "T385", "factory": "F1067", "fabric": "DATABASE_FABRIC", "depends_on": ["s5"] },
    { "id": "s7", "task_type": "T388", "factory": "F1069", "fabric": "DATABASE_FABRIC", "depends_on": ["s6"] }
  ]
}
```

---

## PHASE SUMMARY TABLE

| Phase | Zone | Families | Factories | Key Outputs |
|-------|------|----------|-----------|-------------|
| P0-INTAKE | A | 128 | F1028–F1034 | Parsed change, entity refs, schema classification |
| P1-CONTEXT | C | 131 | F1050–F1056 | ContextBundle (parallel with P2) |
| P2-CONFLICTS | B | 129 | F1035–F1042 | StaticConflictList + SemanticAssessment + BlastRadius |
| P3-ARBITRATE | D | 130 | F1043–F1049 | State machine, PendingUserResolution, timeout |
| P4-RESOLVE | E | 132 | F1057–F1062 | Impact report UI, decision capture, resolution application |
| P5-MT | F | 133 | F1063–F1068 | Tenant-scoped isolation, per-tenant audit |
| P6-OBS | G | 134 | F1069–F1074 | Metrics, override tracking, OTel, pattern learning |

---

## RECOVERY COMMANDS

```
Full FLOW-22 reload:      "Load all 7 FLOW-22 files — BFA complete (F1028-F1074, T375-T388)"
Resume from factories:    "Load 25_-_Business_flow_arbitr_ENGINE_ARCHITECTURE — F1028-F1074, Families 147-153"
Resume from task types:   "Load 25_-_Business_flow_arbitr_TASK_TYPES_CATALOG — T375-T388, Templates 80-82"
Resume from BFA rules:    "Load 25_-_Business_flow_arbitr_V62_BFA_STRESS_TEST — CF-473-CF-501, ST-270-ST-291"
Resume from skills:       "Load 25_-_Business_flow_arbitr_SKILLS_FACTORY_RAG — SK-233-SK-247"
Resume from index:        "Load 25_-_Business_flow_arbitr_UNIFIED_SOURCE_INDEX — DD-229-DD-241, DR-172-DR-181"
Check specific rule:      "Load 25_-_Business_flow_arbitr_V62_BFA_STRESS_TEST — search CF-[N]"
Check specific skill:     "Load 25_-_Business_flow_arbitr_SKILLS_FACTORY_RAG — search SK-[N]"
Start FLOW-23:            "Start FLOW-23 from F948, T341, CF-431"
```

---

## DNA COMPLIANCE SUMMARY (FLOW-22)

| DNA Pattern | Enforcement in FLOW-22 | Key Factory |
|------------|------------------------|-------------|
| DNA-1 parse_document | All 47 factories: dict[str, Any]. Zero typed models. | F1028 ProposedChange |
| DNA-2 build_search_filter | All ES queries: empty fields auto-skipped | F1035 DependencyIndexQuery |
| DNA-3 DataProcessResult[T] | All factory methods return DPR<T>. Zero business-logic throws. | F1041 SeverityAggregator |
| DNA-4 MicroserviceBase | All generated services extend MicroserviceBase (19 components) | All 47 factories |
| DNA-5 Scope Isolation | tenantId on every tenant-scoped query (F1066 validates) | F1066 TenantIsolationValidator |
| DNA-6 DynamicController | All UI endpoints via DynamicController (F1057 render spec) | F1057 ImpactReportRenderer |
| DNA-7 Idempotency | SETNX dedup on (changeId, sessionId) in F1046, F1059 | F1046 UserDecisionReceiver |
| DNA-8 Outbox | Persist-before-emit on every state transition (F1043, DR-174) | F1043 ArbitrationStateMachine |
| DNA-9 Extended | Per-field audit logging on all decisions and overrides (F1052, F1067) | F1052 AuditTrailService |

---

## BACKWARD COMPATIBILITY VERIFICATION

| Check | Status |
|-------|--------|
| F1–F1027 unchanged | ✅ PASS |
| T1–T374 unchanged | ✅ PASS |
| CF-1–CF-472 unchanged | ✅ PASS |
| SK-1–SK-232 unchanged | ✅ PASS |
| DD-1–DD-228 unchanged | ✅ PASS |
| DR-1–DR-171 unchanged | ✅ PASS |
| DNA-1–DNA-9 stable | ✅ PASS |
| EP-1–EP-5 stable | ✅ PASS |
| FLOW-01–FLOW-24 intact | ✅ PASS |

---
## SAVE POINT: FLOW22:EXECUTION_PLAN:COMPLETE ✅
## Next: SESSION_STATE (global tracker update — FLOW-22 complete)


---

═══════════════════════════════════════════════════════
FLOW-26 — SELF-DEVELOPING META-FLOW ENGINE EXTENSION
═══════════════════════════════════════════════════════

# XIIGen MASTER EXECUTION PLAN — FLOW-26
# Self-Developing Meta-Flow: Phased Execution Plan
## FLOW-26 ONLY | 7 Phases | 6 Zones
## Date: 2026-02-27

---

## SAVE POINT: PLAN_COMPLETE ✅

---

## EXECUTION OVERVIEW

| Phase | Scope | Duration | Save Point |
|-------|-------|----------|-----------|
| P0 | RAG Index & Reuse Analysis | 15 min | P0_COMPLETE |
| P1 | Gap Detection Zone (Family 154) | 30 min | P1_F1081_COMPLETE |
| P2 | Contract & Artifact Generator Zone (Family 155) | 30 min | P2_F1087_COMPLETE |
| P3 | Genesis & Validation Loop Zone (Family 156) | 35 min | P3_F1092_COMPLETE |
| P4 | Sandbox & E2E Execution Zone (Family 157) | 30 min | P4_F1097_COMPLETE |
| P5 | GitOps Assimilation Zone (Family 158) | 25 min | P5_F1101_COMPLETE |
| P6 | Promotion Ladder & Human Gate Zone (Family 159) + Templates | 25 min | P6_COMPLETE |

**Total estimated:** ~3 hours (each phase is independently recoverable)

---

## RECOVERY COMMANDS

```
Resume from P0:  "Load 26-self-developing_SKILLS_FACTORY_RAG — SK-251-SK-266 defined"
Resume from P1:  "Load 26-self-developing_ENGINE_ARCHITECTURE — F1075-F1081 Family 154 defined"
Resume from P2:  "Load 26-self-developing_ENGINE_ARCHITECTURE — F1082-F1087 Family 155 defined"
Resume from P3:  "Load 26-self-developing_ENGINE_ARCHITECTURE — F1088-F1092 Family 156 defined"
Resume from P4:  "Load 26-self-developing_ENGINE_ARCHITECTURE — F1093-F1097 Family 157 defined"
Resume from P5:  "Load 26-self-developing_ENGINE_ARCHITECTURE — F1098-F1101 Family 158 defined"
Resume from P6:  "Load 26-self-developing_SESSION_STATE — FLOW-26 complete"
Full reload:     "Load SESSION_STATE — engine at F1102/T412/CF-544, FLOW-26 complete"
```

---

## PHASE 0 — RAG INDEX & REUSE ANALYSIS
**Duration:** 15 min
**Output:** Reuse decision matrix for FLOW-26; AF-4 retrieval index
**Save Point:** P0_COMPLETE ✅ (see SKILLS_FACTORY_RAG)

### What Was Done
- Mapped all 16 new skills (SK-251–SK-266) against existing SK-1–SK-250
- Identified 9 existing assets to REUSE vs 16 new patterns to create
- Built AF-4 RAG retrieval index for FLOW-26 queries
- Confirmed: DATABASE FABRIC, QUEUE FABRIC, AI ENGINE FABRIC, RAG FABRIC, CORE FABRIC, FLOW ENGINE FABRIC — all reused from existing SK-379 (MicroserviceBase)–09

### Reuse Decisions
| Gap | Existing Asset | Decision |
|-----|---------------|---------|
| Intent parsing | IAiProvider + AiDispatcher (SK-386 (AiDispatcher)) | COPY |
| ES read/write | IDatabaseService (SK-382 (ElasticsearchDatabase)) | COPY |
| Redis lock | IDatabaseService Redis provider | COPY |
| Event pub/sub | IQueueService (SK-383 (RedisStreamQueue)) | COPY |
| RAG search | IRagService (SK-388/SK-389 (IRagService/HybridRag)) | COPY |
| Service base | MicroserviceBase (SK-379 (MicroserviceBase)) | COPY |
| DAG orchestration | FlowOrchestrator (SK-392 (RagStrategyRegistry)) | COPY |
| Multi-model gen | AiDispatcher (SK-386 (AiDispatcher)) | ADAPT |
| Git/CI operations | FLOW-19 F697-F733 | ADAPT |
| Container deploy | FLOW-19 F59 container | ADAPT |

---

## PHASE 1 — GAP DETECTION ZONE (Family 154: F1075–F1081)
**Duration:** 30 min
**Artifacts:** 7 factories, 3 design records (DR-184, DR-185, DR-189), 4 task types (T389–T392)
**Save Point:** P1_F1081_COMPLETE

### Step 1.1 — Define SelfBuildRun Runtime Entity (DR-184)
**Time:** 5 min
```
Action: Define SelfBuildRun document schema (dict[str, Any])
States: TRIGGERED → GAPS_DETECTED → ... → COMPLETED
Key fields: runId, tenantId, state, intent, gaps[], phaseHistory[], retryCountByGap{}
Storage: ES index self-build-runs-{tenantId}
Save point: SelfBuildRunSchema_v1 defined
```

### Step 1.2 — F1075 ICapabilityGapDetectorService
**Time:** 5 min
```
Action: Define factory interface + fabric resolution + operations + iron rules
Fabric: AI ENGINE FABRIC (intent parsing) + DATABASE FABRIC (registry diff)
Events: CapabilityGapDetected
Iron Rules: IR-1075-1 (AI required), IR-1075-2 (gap classified)
```

### Step 1.3 — F1076 ICapabilityRegistryService + F1077 IFlowPlannerService
**Time:** 5 min
```
Action: Define both factories
F1076 Fabric: DATABASE FABRIC (ES: capability-registry-{tenantId})
F1077 Fabric: AI ENGINE FABRIC + DATABASE FABRIC
F1076 Events: CapabilityRegistered, CapabilityHotReloaded
F1077 Events: FlowPlanned, SubFlowRequired
```

### Step 1.4 — F1078–F1081 (Reuse + Graph)
**Time:** 10 min
```
F1078 IReuseDecisionMatrixService: RAG FABRIC + AI ENGINE FABRIC
F1079 IReuseScannerService: RAG FABRIC
F1080 ICapabilityManifestService: DATABASE FABRIC (ES)
F1081 ICapabilityGraphService: DATABASE FABRIC (ES/Neo4j) + circular dependency check
```

### Step 1.5 — Task Types T389–T392
**Time:** 5 min
```
T389: Capability Gap Detection Gate (INVENTORY archetype)
T390: Capability Registry Hydration Gate (INTEGRATION archetype)
T391: Flow Planning with Gap Awareness Gate (ORCHESTRATION archetype)
T392: Reuse Decision Matrix Gate (INVENTORY archetype)
(Full engine contract format — see TASK_TYPES_CATALOG)
```

**Gate:** All 7 factories have fabric resolution mapping. All 4 task types have full format. ✅

---

## PHASE 2 — CONTRACT & ARTIFACT GENERATOR ZONE (Family 155: F1082–F1087)
**Duration:** 30 min
**Artifacts:** 6 factories, 3 design records (DR-185, DR-187, DR-194), 4 task types (T393–T396)
**Save Point:** P2_F1087_COMPLETE

### Step 2.1 — F1082 IContractGeneratorService
**Time:** 5 min
```
Action: Define factory — multi-model contract generation via AiDispatcher
Fabric: AI ENGINE FABRIC (multi-model) + DATABASE FABRIC (contract-drafts-{tenantId})
Event: ContractDrafted
Iron Rules: IR-1082-1 (full format required), IR-1082-2 (no stubs)
```

### Step 2.2 — F1083 IFactorySpecGeneratorService + F1084 ITaskTypeContractService
**Time:** 8 min
```
F1083: Generate factory spec (interface, operations, fabric mapping, events)
F1084: Generate task type contract + validate completeness
Iron Rule: IR-1084-2 — contract completeness gate is MANDATORY before genesis
```

### Step 2.3 — F1085 IEventSchemaRegistryService + F1086 IApiContractRegistryService
**Time:** 8 min
```
F1085: Register new event schemas (ES: event-schema-registry)
  Iron Rule: IR-1085-1 — ALL events registered before GitOps phase
F1086: Register API contracts + backward compatibility check
  Iron Rule: IR-1086-1 — breaking changes require explicit DR
```

### Step 2.4 — F1087 IBfaDraftGeneratorService
**Time:** 5 min
```
Fabric: AI ENGINE FABRIC (conflict analysis) + DATABASE FABRIC (bfa-registry)
Operation: GenerateBfaDraftAsync — check new rules vs CF-1–CF-509 for duplicates
Event: BfaPackRegistered
Iron Rule: IR-1087-1 (no duplicates), IR-1087-2 (standard CF format)
```

### Step 2.5 — Task Types T393–T396
**Time:** 4 min
```
T393: Factory Spec Generation Gate (SYNTHESIS archetype)
T394: Task Type Contract Generation Gate (SYNTHESIS archetype)
T395: Schema & Contract Registration Gate (GUARDRAIL archetype)
T396: BFA Draft Generation Gate (GUARDRAIL archetype)
```

**Gate:** Contract completeness gate defined. BFA registration before GitOps documented (DD-259). ✅

---

## PHASE 3 — GENESIS & VALIDATION LOOP ZONE (Family 156: F1088–F1092)
**Duration:** 35 min
**Artifacts:** 5 factories, 2 design records (DR-186, DR-190), 4 task types (T397–T400)
**Save Point:** P3_F1092_COMPLETE

### Step 3.1 — F1088 IGenesisLoopService (Core of the Meta-Flow)
**Time:** 10 min
```
Action: Define bounded AF-1→AF-9 loop
Fabric: AI ENGINE FABRIC (AiDispatcher orchestrating all 11 AF stations)
Events: GenesisStarted, GenesisIterating, GenesisGreen, BuildEscalated
Iron Rules:
  IR-1088-1: maxRetries = 3–5 (FREEDOM-configurable, MACHINE default 3)
  IR-1088-2: Judge score ≥ 0.8
  IR-1088-3: BuildEscalated on exhaustion (never silent)
AF Station sequence: AF-4 (RAG/reuse) → AF-1 (genesis) → AF-6 (review) 
  → AF-7 (DNA) → AF-8 (security) → AF-9 (judge) → repeat or pass
```

### Step 3.2 — F1089 ICodeBundleValidatorService
**Time:** 5 min
```
Fabric: AI ENGINE FABRIC (AF-6/AF-7/AF-8)
DNA Checks: DNA-1 through DNA-9 all mandatory
Iron Rule: IR-1089-2 — direct provider imports = BUILD FAILURE
Positive: dict[str, Any] + build_search_filter + DataProcessResult[T]
Negative: ElasticsearchClient(), OpenAiClient(), typed models
```

### Step 3.3 — F1090 ITestBundleGeneratorService + F1091 IDeterministicTestHarnessService
**Time:** 10 min
```
F1090: Generate unit tests + E2E harness
  Iron Rule: IR-1090-1 — both required (no unit-only or E2E-only bundles)
F1091: Generate fixture-based harness for all fabric interface calls
  Iron Rule: IR-1091-1 — 100% external call interception
  Pattern: Record/replay (SK-254)
```

### Step 3.4 — F1092 IFixApplicationService
**Time:** 5 min
```
Fabric: AI ENGINE FABRIC (fix from signatures) + DATABASE FABRIC (patched bundle storage)
Input: codeBundle + failureSignatures[] (from F1096)
Output: PatchedBundle (new version — immutable, no in-place patching)
Iron Rule: IR-1092-1 — fix must address ALL signatures
```

### Step 3.5 — Task Types T397–T400
**Time:** 5 min
```
T397: AF Station Pipeline Gate (SYNTHESIS + JUDGMENT archetype)
T398: Code Bundle Validation Gate (JUDGMENT archetype)
T399: Deterministic Test Bundle Gate (JUDGMENT archetype)
T400: Fix Application Gate (SYNTHESIS archetype)
```

**Gate:** maxRetries defined, DNA compliance mandatory, deterministic harness 100% coverage. ✅

---

## PHASE 4 — SANDBOX & E2E EXECUTION ZONE (Family 157: F1093–F1097)
**Duration:** 30 min
**Artifacts:** 5 factories, 2 design records (DR-189, DR-190), 4 task types (T401–T404)
**Save Point:** P4_F1097_COMPLETE

### Step 4.1 — F1093 ISandboxOrchestratorService
**Time:** 7 min
```
Fabric: CORE FABRIC (FLOW-19 F59 container orchestration pattern)
Namespace: sandbox-{tenantId}-{runId} (IR-1093-1)
Events: SandboxCreated, SandboxTornDown
CRITICAL: TeardownSandboxAsync in finally block (IR-1093-2) — SK-264
TTL: FREEDOM-configurable (default 60 min)
```

### Step 4.2 — F1094 IEphemeralDeployService
**Time:** 5 min
```
Fabric: CORE FABRIC (K8s/Docker — FLOW-19 pattern)
Operations: DeployAsync + HealthCheckAsync
Iron Rule: IR-1094-1 — health check before E2E
Iron Rule: IR-1094-2 — quota check before deploy
```

### Step 4.3 — F1095 IE2EFlowTestService
**Time:** 8 min
```
Fabric: FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry) FlowOrchestrator)
Key: E2E executes ORIGINAL requested flow (DD-255, IR-1095-1)
Assertions:
  - Output schema matches declared event schema (F1085)
  - Idempotency: run twice → same result (IR-1095-2)
  - TenantId isolation: other tenant data not accessible
Events: E2EStarted, E2EPassed, E2EFailed
```

### Step 4.4 — F1096 IFailureSignatureExtractorService + F1097 IEvidenceBundleAssemblerService
**Time:** 7 min
```
F1096: AI ENGINE FABRIC log analysis → failure signatures with fix instructions
  Iron Rule: IR-1096-1 — type + file + line + fixInstruction all required
F1097: Assemble 12-section evidence bundle
  Iron Rule: IR-1097-1 — all 12 sections required
  Iron Rule: IR-1097-2 — DNA matrix + BFA registrations mandatory
  Event: EvidenceBundleReady
```

### Step 4.5 — Task Types T401–T404
**Time:** 3 min
```
T401: Sandbox Creation Gate (ORCHESTRATION archetype)
T402: Ephemeral Deploy & Health Gate (ORCHESTRATION archetype)
T403: E2E Flow Validation Gate (JUDGMENT archetype)
T404: Evidence Bundle Assembly Gate (JUDGMENT archetype)
```

**Gate:** Finally pattern documented. E2E validates original intent. 12-section bundle required. ✅

---

## PHASE 5 — GITOPS ASSIMILATION ZONE (Family 158: F1098–F1101)
**Duration:** 25 min
**Artifacts:** 4 factories, 2 design records (DR-191, DR-194), 4 task types (T405–T408)
**Save Point:** P5_F1101_COMPLETE

### Step 5.1 — F1098 IGitOpsAssimilationService
**Time:** 6 min
```
Fabric: EXECUTION FABRIC (FLOW-19: F697 ISourceControlService)
Branch: self-build/{tenantId}/{runId} (DD-256, IR-1098-1)
Commit: codeBundle + testBundle + evidence summary
Events: BranchCreated, CodeCommitted
```

### Step 5.2 — F1099 IPrManagementService
**Time:** 6 min
```
Fabric: EXECUTION FABRIC (FLOW-19: F699 IPrManagementService pattern)
Operations: OpenPrAsync, AwaitCiResultAsync
CORE promotion: required reviewers from FREEDOM config (IR-1099-1)
Timeout: FREEDOM-configurable (default 30 min), emit CiTimeout → escalate (IR-1099-2)
Events: PrOpened, CiGreen, CiFailed, CiTimeout
```

### Step 5.3 — F1100 ICiCdGateService
**Time:** 5 min
```
Fabric: EXECUTION FABRIC (FLOW-19: F698 ICiCdService)
CI gate includes: security scan + DNA compliance + backward compatibility check
CI failure → extract failure signatures (F1096) → loopback to genesis (IR-1100-1)
```

### Step 5.4 — F1101 IRegistryAssimilationService
**Time:** 5 min
```
Fabric: DATABASE FABRIC (ES: factory-registry, capability-registry-{tenantId})
ONLY after PR merged (DD-257, IR-1101-1)
Triggers hot-reload via F1076 (DD-258, IR-1076-2)
Events: FactoryAssimilated, CapabilityAssimilated
```

### Step 5.5 — Task Types T405–T408
**Time:** 3 min
```
T405: GitOps Branch & Commit Gate (ORCHESTRATION archetype)
T406: PR Open & Await CI Gate (ORCHESTRATION archetype)
T407: CI Green Validation Gate (GUARDRAIL archetype)
T408: Registry Assimilation Gate (INTEGRATION archetype)
```

**Gate:** Registry update only after merge. Branch convention enforced. CI loopback to genesis. ✅

---

## PHASE 6 — PROMOTION LADDER, HUMAN GATE & TEMPLATES
**Duration:** 25 min
**Artifacts:** 1 factory (F1102), 2 design records (DR-188, DR-193), 4 task types (T409–T412), 7 templates (83–89)
**Save Point:** P6_COMPLETE

### Step 6.1 — F1102 IPromotionLadderService (Full)
**Time:** 10 min
```
Fabric: DATABASE FABRIC (ES: promotion-ledger-{tenantId}) + QUEUE FABRIC
Stages: DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE
Stage evaluation: uses evidence bundle only (DD-250)
Human gate: CORE always requires approval (DD-251, IR-1102-1)
Timeout: hold at INJECTED (IR-1102-4) — no auto-promote on timeout
Iron Rules: IR-1102-1 through IR-1102-4
Events: PromotionDecided, ApprovalRequired, ApprovalReceived, PromotionCompleted, PromotionRejected
```

### Step 6.2 — Task Types T409–T412
**Time:** 6 min
```
T409: Promotion Stage Evaluation Gate (JUDGMENT archetype)
  — Evaluates all stages DRAFT→WIRED→VALIDATED→INJECTED→MINIMAL; CORE → T410
T410: Human Approval Gate — CORE Promotion (JUDGMENT archetype)
  — CORE-only human gate; security review + 30-day stability required
T411: Promotion Record Persistence & Ledger (ORCHESTRATION archetype)
  — Persists promotion: runId, tenantId, capability, fromStage, toStage, evidence hash
T412: Meta-Flow Completion & Registry Notification (ORCHESTRATION archetype)
  — Finalizes SelfBuildRun, notifies requestor, triggers original flow if all gaps filled
```

### Step 6.3 — Flow Templates (83–89)
**Time:** 9 min

| Template | Name | Trigger | Key Zones |
|----------|------|---------|-----------|
| 83 | Simple Gap Fill — Single Factory | CapabilityGapDetected (single gap) | P1 → P3 → P4 → P5 → P6 |
| 84 | Multi-Gap Flow with Reuse | CapabilityGapDetected (multiple gaps) | P1 → P2 → P3 × N → P4 → P5 → P6 |
| 85 | Sub-Flow Recursive Generation | SubFlowRequired event | P1 → P2 → SK-266 → P3 → P4 → P5 → P6 |
| 86 | CI Failure Loopback Template | CiFailed event | P5.CI_FAIL → P3 (genesis retry) → P4 → P5 |
| 87 | Human Approval Gate Template | PromotionDecided (stage=CORE) | P6 approval sub-flow |
| 88 | Multi-Tenant Capability Sharing Flow | SharingRequested event | SK-265 + explicit cross-tenant BFA |
| 89 | Full Self-Build Meta-Flow (All Zones) | CapabilityGapDetected (any) | P0 → P1 → P2 → P3 → P4 → P5 → P6 |

**Gate:** All 7 templates cover all loopback paths. Template 82 is the master template. ✅

---

## FLOW-26 DNA COMPLIANCE VERIFICATION

| DNA Pattern | Enforcement Point | Evidence |
|-------------|------------------|---------|
| DNA-1 parse_document | All 28 factories use dict[str, Any] | IR-1089-2, IR-1091-2, IR-1092-1 |
| DNA-2 build_search_filter | All ES queries skip empty fields | F1075, F1076, F1080, F1097 build_search_filter |
| DNA-3 DataProcessResult[T] | All factory operations return DPR<T> | Never throw for business logic |
| DNA-4 MicroserviceBase | All generated services extend MSB | IR-1089-1 (AF-7 checks) |
| DNA-5 Scope Isolation | tenantId on every query | IR-1076-1, SK-265, all families |
| DNA-6 DynamicController | No entity-specific controllers | DynamicController for all routes |
| DNA-7 Idempotency | SelfBuildRunId + phaseId = idempotency key | DD-252, F1088 Idempotency-Key |
| DNA-8 Outbox | CloudEvents transactional outbox for async | F1088, F1095, F1101 events |
| DNA-9 Audit | Per-field audit on capability promotions | F1102 promotion-ledger + DR-193 |

---

## CROSS-FLOW CONFLICT VERIFICATION (FLOW-26 vs FLOW-01–FLOW-25)

| Risk | Existing Flow | Mitigation |
|------|--------------|-----------|
| GitOps branch collision | FLOW-19 CI/CD pipelines | self-build/{tenantId}/{runId} namespace (DD-256) |
| Capability registry vs FLOW-15 flow registry | FLOW-15 F466 IFlowDefinitionRegistryService | Separate ES indices; CF-537 rule |
| Sandbox container vs FLOW-19 build agents | FLOW-19 F697-F733 | Separate K8s namespaces; CF-531 rule |
| CORE promotion event vs FLOW-13 AI pipeline | FLOW-13 F351-F380 | PromotionCompleted schema distinct; CF-541 rule |
| Sub-flow DAG vs FLOW-18 visual editor | FLOW-18 F631-F696 | Sub-flows stored in separate index; CF-539 rule |
| Multi-tenant hardening vs FLOW-23 | FLOW-23 F967-F974 | F967 ITenantIsolationEnforcerService reused; no conflict |

---

## POST-FLOW-26 NEXT STEPS

```
Next factory:       F1103    Family: 160
Next task type:     T413
Next template:      90
Next BFA rule:      CF-545
Next skill:         SK-267
Next DD:            DD-262
Next DR:            DR-198
Next flow:          FLOW-27
```

---

## SAVE POINT: P6_COMPLETE ✅ | FLOW-26 MASTER EXECUTION PLAN COMPLETE ✅

---

## BACKWARD COMPATIBILITY VERIFICATION (Post FLOW-26)

| Check | Status |
|-------|--------|
| F1–F1074 unchanged | ✅ PASS |
| T1–T388 unchanged | ✅ PASS |
| CF-1–CF-509 unchanged | ✅ PASS |
| SK-1–SK-250 unchanged | ✅ PASS |
| DD-1–DD-244 unchanged | ✅ PASS |
| DR-1–DR-183 unchanged | ✅ PASS |
| DNA-1–DNA-9 stable | ✅ PASS |
| EP-1–EP-5 stable | ✅ PASS |
| FLOW-01–FLOW-25 intact | ✅ PASS |

---
## SAVE POINT: FLOW26:EXECUTION_PLAN:COMPLETE ✅
## Next: Cross-validation (all 7 canonical files updated with FLOW-26)


================================================================================
FLOW-27 — MASTER EXECUTION PLAN: P0–P6 (Human Interaction Gate + Dependency Scheduler + Visual Runtime State)
================================================================================

# FLOW-27 — MASTER EXECUTION PLAN
## Human Interaction Gate + Dependency Scheduler + Visual Runtime State + Multi-Tenant Group Tasks
## Extension of: MASTER_EXECUTION_PLAN_MERGED.md
## Status: AUTHORITATIVE — FLOW-27 only

---

## OVERVIEW

FLOW-27 extends the XIIGen engine with an **Engine-Level Primitive (EP-6)**: the Human Interaction Gate (HIG) + Visual Runtime State + Dependency-Aware Scheduling + Multi-Tenant Group Tasks. This is NOT a flow-specific implementation — it is a capability that sits beneath ALL flow templates.

**What gets built**: 26 factory interfaces (F1103–F1128), 10 task type engine contracts (T413–T422), 21 BFA rules (CF-545–CF-565), 20 stress tests (ST-325–ST-344), 11 skills (SK-267–SK-277), 1 engine primitive (EP-6), 1 template (TPL-90).

**Why phased**: Each phase has clear SAVE STATE, is completable in 15–45 minutes, produces independently verifiable deliverables, and enables recovery in under 60 seconds.

---

## PHASE DEPENDENCY CHAIN

```
P0 (Foundation Schemas) 
  → P1 (HumanInteractionGate + UserTask Registry)
  → P2 (DependencyAwareScheduler)
  → P3 (Visual Runtime State + Progress Aggregation)
  → P4 (Completion Gate + Terminal State)
  → P5 (Multi-Tenant Group Tasks + Notification)
  → P6 (BFA Validation + Stress Tests + DNA Compliance)
```

P0 and P1 can be delivered in parallel with P2.
P3 depends on P1 (needs NodeSnapshot event types established by HIG).
P4 depends on P2+P3.
P5 can be delivered after P1.
P6 validates everything — must come last.

---

## P0 — FOUNDATION: FABRIC SCHEMAS + ES INDICES
**Duration**: 20 min | **Save State**: FLOW27-P0-COMPLETE

### What we build
Elasticsearch index schemas for all FLOW-27 durable documents. These are registered in the DATABASE FABRIC (SK-382 (ElasticsearchDatabase)) via config — no code written here.

### Deliverables

**ES Index: `user-tasks`**
```json
{
  "mappings": {
    "properties": {
      "taskId":         { "type": "keyword" },
      "tenantId":       { "type": "keyword" },
      "runId":          { "type": "keyword" },
      "traceId":        { "type": "keyword" },
      "flowId":         { "type": "keyword" },
      "flowVersion":    { "type": "keyword" },
      "nodeId":         { "type": "keyword" },
      "nodeType":       { "type": "keyword" },
      "questionType":   { "type": "keyword" },
      "blockingPolicy": { "type": "keyword" },
      "status":         { "type": "keyword" },
      "assignee":       { "type": "object" },
      "contextSnapshot":{ "type": "object", "enabled": false },
      "resumeTargets":  { "type": "keyword" },
      "createdAt":      { "type": "date" },
      "dueAt":          { "type": "date" },
      "answeredAt":     { "type": "date" },
      "answerPayload":  { "type": "object", "enabled": false }
    }
  }
}
```

**ES Index: `run-snapshots`**
```json
{
  "mappings": {
    "properties": {
      "runId":       { "type": "keyword" },
      "tenantId":    { "type": "keyword" },
      "flowId":      { "type": "keyword" },
      "status":      { "type": "keyword" },
      "progress":    { "type": "float" },
      "nodeCount":   { "type": "integer" },
      "doneCount":   { "type": "integer" },
      "runningCount":{ "type": "integer" },
      "waitingCount":{ "type": "integer" },
      "blockedCount":{ "type": "integer" },
      "startedAt":   { "type": "date" },
      "updatedAt":   { "type": "date" },
      "completedAt": { "type": "date" }
    }
  }
}
```

**ES Index: `node-snapshots`**
```json
{
  "mappings": {
    "properties": {
      "snapshotId":  { "type": "keyword" },
      "nodeId":      { "type": "keyword" },
      "runId":       { "type": "keyword" },
      "tenantId":    { "type": "keyword" },
      "nodeType":    { "type": "keyword" },
      "status":      { "type": "keyword" },
      "progress":    { "type": "float" },
      "blockedBy":   { "type": "keyword" },
      "taskId":      { "type": "keyword" },
      "childRunIds": { "type": "keyword" },
      "subSteps":    { "type": "nested" },
      "startedAt":   { "type": "date" },
      "updatedAt":   { "type": "date" },
      "completedAt": { "type": "date" }
    }
  }
}
```

**Redis Streams**: `hig-events`, `node-events`, `scheduler-ready-queue` — standard consumer group pattern (SK-383 (RedisStreamQueue)).

**PostgreSQL tables**: `assignment_policies`, `task_claims`, `group_members` — tenant-scoped, RLS-enabled.

### SAVE STATE: FLOW27-P0-COMPLETE
```
Schemas defined: user-tasks, run-snapshots, node-snapshots, task-claims, group-members
Redis streams: hig-events, node-events, scheduler-ready-queue
Resume: Continue from P1
```

---

## P1 — HUMANINTERACTIONGATE + USERTASK REGISTRY
**Duration**: 35 min | **Save State**: FLOW27-P1-COMPLETE
**Factories**: F1103, F1104, F1105, F1128
**Task Types**: T413

### What we build
The EP-6 primitive: `IHumanInteractionGateService` creates a UserTask when a HIG node is reached. `IUserTaskRegistryService` provides CRUD for UserTasks. `ITaskContextSnapshotService` captures exact incomingVariables + trace at gate time. `IUserTaskAnswerProcessorService` validates and records answers, emits `UserTaskAnswered` event.

### Engine Contract T413 (HumanInteractionGate Node)
```
TASK TYPE: T413 — HumanInteractionGate Node
ARCHETYPE: HUMAN_GATE
ENGINE PRIMITIVE: EP-6
ENTRY: FlowOrchestrator reaches a node with nodeType=HumanInteractionGate
PURPOSE: Suspend flow execution, create UserTask, resume dependents on answer
DISTINCT FROM: Old HumanApprovalGate (concept only); T414 (group assignment)

FACTORY DEPENDENCIES: F1103, F1104, F1105, F1115, F1128 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1103 → DATABASE FABRIC (Elasticsearch) — user-tasks index
  F1104 → DATABASE FABRIC (Elasticsearch) — user-tasks index
  F1105 → DATABASE FABRIC (Elasticsearch) — task-context-snapshots index
  F1115 → QUEUE FABRIC (Redis Streams) — scheduler-ready-queue
  F1128 → DATABASE FABRIC (ES) + QUEUE FABRIC (Redis) — user-tasks + hig-events

AF CONFIGURATION:
  AF-1 (Genesis): generates HIG service code from spec (extends MicroserviceBase)
  AF-4 (RAG): retrieves SK-267 (HIG pattern) + SK-275 (UserTaskRegistry pattern)
  AF-7 (Compliance): validates DNA-1 (no typed models), DNA-5 (tenantId present)
  AF-9 (Judge): validates iron rules below

BFA VALIDATION:
  CF-545: UserTask must include tenantId
  CF-546: Flow cannot resume until UserTask.status=answered (or skipped via policy)
  CF-550: Downstream nodes not enqueued until answer received (blocking policy)
  CF-558: contextSnapshot must capture incomingVariables at gate time

MACHINE (fixed logic):
  - Create UserTask document in ES via F1104
  - Capture contextSnapshot via F1105
  - Emit UserTaskCreated event via QUEUE FABRIC
  - Block downstream scheduler via F1115 (blocking policy only)
  - On answer: validate via F1128, emit UserTaskAnswered, unblock scheduler

FREEDOM (admin configurable):
  - blockingPolicy: blocking | non_blocking | optional
  - dueAt duration (task SLA)
  - questionType and expectedAnswerSchema
  - suggestedOptions[]

IRON RULES:
  1. UserTask document MUST include tenantId (CF-545) → BUILD FAILURE if missing
  2. Blocking HIG MUST NOT allow downstream nodes to run before answer (CF-546)
  3. contextSnapshot MUST capture exact incomingVariables at gate time (CF-558)
  4. Answer processor MUST emit UserTaskAnswered to QUEUE FABRIC before unblocking (CF-550)

QUALITY GATES (AF-9):
  - UserTask stored before any downstream unblocking occurs
  - Idempotency: duplicate UserTaskCreated for same nodeId+runId is rejected
  - Non_blocking HIG proceeds with defaults + records "assumption" flag
  - Optional HIG records skip if no answer after dueAt
```

### SAVE STATE: FLOW27-P1-COMPLETE
```
T413 engine contract: complete
Factories: F1103, F1104, F1105, F1128 registered
Skills: SK-267, SK-275 defined
Resume: Continue from P2 or P5 (parallel)
```

---

## P2 — DEPENDENCY-AWARE SCHEDULER
**Duration**: 30 min | **Save State**: FLOW27-P2-COMPLETE
**Factories**: F1115, F1116, F1117, F1118, F1119
**Task Types**: T415

### What we build
Generic DAG scheduler that keeps executing READY nodes while others are BLOCKED or WAITING_FOR_USER. Reads `waitFor[]` from flow JSON (no schema migration). Implements JoinPolicy (allOf/anyOf/quorum). Cycle detection via IDagWalkerService.

### Engine Contract T415 (DependencyAwareScheduler)
```
TASK TYPE: T415 — DependencyAwareScheduler
ARCHETYPE: ORCHESTRATION
ENTRY: FlowOrchestrator starts a run; also triggered by UserTaskAnswered event
PURPOSE: Evaluate DAG, enqueue READY nodes, block on dependencies, resume after human answers
DISTINCT FROM: T13 (static orchestration); T415 is dynamic, event-driven, human-gate-aware

FACTORY DEPENDENCIES: F1115, F1116, F1117, F1118, F1119 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1115 → QUEUE FABRIC (Redis Streams) — scheduler-ready-queue (producer)
  F1116 → DATABASE FABRIC (Elasticsearch) — node-snapshots (read)
  F1117 → DATABASE FABRIC (Elasticsearch) — node-snapshots (read/write)
  F1118 → DATABASE FABRIC (Redis) — join-policy:{nodeId} atomic check
  F1119 → CORE FABRIC (in-memory) — flow-definition DAG traversal

AF CONFIGURATION:
  AF-1 (Genesis): generates scheduler service code
  AF-4 (RAG): retrieves SK-268 (DependencyScheduler pattern) + SK-276 (JoinPolicy)
  AF-7 (Compliance): DNA-4 (MicroserviceBase), DNA-5 (tenantId on all queries)
  AF-9 (Judge): validates CF-550, CF-554, CF-560, CF-562, CF-564

BFA VALIDATION:
  CF-550: No node enqueued with unresolved waitFor dependencies
  CF-554: allOf join waits for ALL required upstream nodes
  CF-560: No duplicate enqueue of already-READY node
  CF-562: IDagWalkerService must detect + reject circular dependencies at BUILD time
  CF-564: DAGWalker must traverse all reachable nodes from root

MACHINE (fixed):
  - On run start: traverse DAG via F1119, enqueue all root nodes via F1115
  - On NodeCompleted event: re-evaluate blocked nodes via F1116
  - On UserTaskAnswered event: re-evaluate HIG-dependent nodes
  - JoinPolicy check via F1118 (allOf/anyOf/quorum) before marking parent READY
  - Cycle detection at BUILD time via F1119

FREEDOM (admin configurable):
  - JoinPolicy per edge (allOf | anyOf | quorum)
  - degradedOk flag (allows SKIPPED upstream to satisfy dependency)
  - maxConcurrentNodes per run (throttle)

IRON RULES:
  1. Never enqueue node with unresolved dependencies (CF-550)
  2. allOf join must wait for ALL required nodes (CF-554)
  3. Circular dependency = BUILD FAILURE, not runtime error (CF-562)
  4. No duplicate enqueue (CF-560)

QUALITY GATES (AF-9):
  - Scheduler handles UserTaskAnswered event within 500ms SLA
  - allSettled pattern: one BLOCKED branch does not freeze sibling branches
  - Race condition safety: F1118 uses Redis atomic check for join policy
```

### SAVE STATE: FLOW27-P2-COMPLETE
```
T415 engine contract: complete
Factories: F1115, F1116, F1117, F1118, F1119 registered
Skills: SK-268, SK-276 defined
Resume: Continue from P3
```

---

## P3 — VISUAL RUNTIME STATE + PROGRESS AGGREGATION
**Duration**: 35 min | **Save State**: FLOW27-P3-COMPLETE
**Factories**: F1109, F1110, F1111, F1112, F1113, F1114
**Task Types**: T416, T418, T419

### What we build
Event-sourced NodeEvents → materialized RunSnapshot + NodeSnapshot. Universal graph API. Node Inspector API. Progress calculation formula. SubFlow drill-down (via childRunId scoping of same API — no new API needed).

### Engine Contracts T416, T418, T419

**T416 — RunProgressAggregator**
```
ARCHETYPE: AGGREGATION
ENTRY: Fired on every NodeStarted / NodeCompleted / NodeFailed / NodeProgress event
PURPOSE: Maintain materialized RunSnapshot + NodeSnapshot for fast UI reads
FACTORY DEPENDENCIES: F1109, F1110, F1111, F1112, F1113 via CreateAsync()
FABRIC RESOLUTION:
  F1109, F1110, F1112, F1113 → DATABASE FABRIC (ES) — run/node-snapshots
  F1111 → QUEUE FABRIC (Redis Streams) — node-events consumer
IRON RULES:
  CF-549: NodeSnapshot (runId+nodeId) unique within tenant
  CF-557: NodeSnapshot MUST include tenantId (DNA-5)
  CF-559: RunSnapshot progress = weighted avg of NodeSnapshot progress values
PROGRESS FORMULA: progress = (doneCount + 0.5*runningCount) / totalNodeCount
```

**T418 — VisualNodeStateEmitter**
```
ARCHETYPE: PROJECTION
ENTRY: Fired on any node status transition event
PURPOSE: Emit NodeStatusChanged events for real-time UI subscription (WebSocket/SSE)
FACTORY DEPENDENCIES: F1109, F1110, F1111, F1122 via CreateAsync()
IRON RULES: CF-549 (snapshot uniqueness), CF-551 (no events after terminal state)
```

**T419 — NodeDebugSurface**
```
ARCHETYPE: INSPECTION
ENTRY: API call GET /runs/{runId}/nodes/{nodeId}
PURPOSE: Serve node inspector data: status, subSteps, inputs/outputs, judge verdicts, childRunIds
FACTORY DEPENDENCIES: F1110, F1113, F1114 via CreateAsync()
SubFlow drill-down: if nodeType=SubFlow, return childRunIds[] — UI calls same graph API with childRunId
IRON RULES: CF-549, CF-559
```

### SAVE STATE: FLOW27-P3-COMPLETE
```
T416, T418, T419 engine contracts: complete
Factories: F1109–F1114 registered
Skills: SK-269, SK-273, SK-274 defined
APIs: /runs/{runId}/graph, /runs/{runId}/nodes/{nodeId} contracts defined
Resume: Continue from P4
```

---

## P4 — COMPLETION GATE + TERMINAL STATE
**Duration**: 20 min | **Save State**: FLOW27-P4-COMPLETE
**Factories**: F1120, F1121, F1122, F1123
**Task Types**: T417

### What we build
ICompletionGateService checks that ALL required nodes are terminal AND no open HIG gates remain before marking a run COMPLETED. IRunTerminalStateService writes the final state and prevents further event processing.

### Engine Contract T417 (RunCompletionGate)
```
TASK TYPE: T417 — RunCompletionGate
ARCHETYPE: TERMINAL
ENTRY: Fired when all root-level terminal nodes complete
PURPOSE: Validate no open human gates, no failed required nodes → mark run COMPLETED or FAILED
FACTORY DEPENDENCIES: F1120, F1121, F1122, F1123 via CreateAsync()
FABRIC RESOLUTION: All → DATABASE FABRIC (Elasticsearch) — run-snapshots, user-tasks
IRON RULES:
  CF-551: Once COMPLETED/FAILED, no further status events accepted
  CF-555: COMPLETED status forbidden while any blocking HIG gate is open
  CF-563: Run cannot start if flow JSON has no terminal node
QUALITY GATES (AF-9):
  - CompletionGate queries user-tasks index for open blocking tasks (tenantId scoped)
  - RunReadinessValidator runs at flow START to detect missing terminal node early
```

### SAVE STATE: FLOW27-P4-COMPLETE
```
T417 engine contract: complete
Factories: F1120, F1121, F1122, F1123 registered
Skill: SK-271 defined
Resume: Continue from P5
```

---

## P5 — MULTI-TENANT GROUP TASKS + NOTIFICATION FAN-OUT
**Duration**: 35 min | **Save State**: FLOW27-P5-COMPLETE
**Factories**: F1106, F1107, F1108, F1124, F1125, F1126, F1127
**Task Types**: T414, T420, T421, T422

### What we build
Group-assignable tasks with claim/quorum semantics. Notification fan-out through existing INotificationProvider (F68). GroupMembership resolution (tenant-scoped). DeepLink generation for "open task in context".

### Engine Contracts T414, T420, T421, T422

**T414 — GroupUserTask Assignment Gate**
```
TASK TYPE: T414 — GroupUserTask Assignment Gate
ARCHETYPE: HUMAN_GATE
ENTRY: HIG node with assignee.type = group | role | anyOf | allOf | quorum
PURPOSE: Assign UserTask to a group/role within tenant; manage claim, multi-approver, quorum
FACTORY DEPENDENCIES: F1106, F1107, F1108, F1125, F1128 via CreateAsync()
FABRIC RESOLUTION:
  F1106, F1125 → DATABASE FABRIC (PostgreSQL) — assignment-policies, group-members
  F1107 → DATABASE FABRIC (Redis SETNX) — task-claims:{taskId}
  F1108 → DATABASE FABRIC (Redis INCR + ES) — task-quorum:{taskId}, task-answers
  F1128 → DATABASE FABRIC (ES) + QUEUE FABRIC — user-tasks + hig-events
IRON RULES:
  CF-547: quorum count ≤ assignee count
  CF-548: Only claimer (or admin) may answer a claimed task
  CF-552: Group membership must be resolved within tenant scope (DNA-5)
  CF-556: Claim TTL expiry auto-releases + emits ClaimExpired
  CF-561: Same responderId counts only once toward quorum (idempotent)
  CF-565: Group must exist in tenant before task creation
```

**T420 — NotificationFanOut**
```
TASK TYPE: T420 — NotificationFanOut
ARCHETYPE: NOTIFICATION
ENTRY: UserTaskCreated event
PURPOSE: Resolve recipients from group/role within tenant, dedupe, send via INotificationProvider
FACTORY DEPENDENCIES: F1103, F1104, F1106, F1107, F1115, F1124, F1125, F1126, F1127 via CreateAsync()
FABRIC RESOLUTION:
  F1124 → AI ENGINE FABRIC (INotificationProvider F68) — notification-events
  F1125 → DATABASE FABRIC (PG) — group-members
  F1126 → DATABASE FABRIC (Redis) — notif-dedup-cache
  F1127 → CORE FABRIC (config) — deep link templates
IRON RULES:
  CF-553: Same recipient must not receive duplicate notification for same task (dedup key: taskId+channel+recipientId)
  CF-558: Notification payload must include traceId + incomingVariables reference
```

**T421 — GroupTaskNotificationRouter**
```
TASK TYPE: T421 — GroupTaskNotificationRouter
ARCHETYPE: NOTIFICATION
ENTRY: Called by T420; handles group expansion
PURPOSE: Expand group to individual members within tenant, apply visibility rules, route per channel
IRON RULES: CF-552 (tenant-scoped), CF-553 (dedup)
```

**T422 — MultiTenantGroupTaskResolver**
```
TASK TYPE: T422 — MultiTenantGroupTaskResolver
ARCHETYPE: RESOLUTION
ENTRY: Task assignment creation for group/role assignee type
PURPOSE: Validate group exists in tenant, resolve membership, return eligible answerers
IRON RULES: CF-565 (group must exist), CF-552 (tenant scope), CF-557 (tenantId on NodeSnapshot)
```

### SAVE STATE: FLOW27-P5-COMPLETE
```
T414, T420, T421, T422 engine contracts: complete
Factories: F1106, F1107, F1108, F1124, F1125, F1126, F1127 registered
Skills: SK-270, SK-272, SK-277 defined
Resume: Continue from P6
```

---

## P6 — BFA VALIDATION + STRESS TESTS + DNA COMPLIANCE
**Duration**: 30 min | **Save State**: FLOW27-P6-COMPLETE
**BFA Rules**: CF-545–CF-565
**Stress Tests**: ST-325–ST-344

### What we build
Full BFA cross-flow validation matrix: all 21 new rules verified against FLOW-01 through FLOW-26. 20 stress tests covering edge cases identified in requirements (race conditions, TTL expiry, quorum conflicts, duplicate answers, circular dependencies).

### Key Stress Tests Summary

| ST | Scenario | Validates | Expected Outcome |
|----|---------|-----------|-----------------|
| ST-325 | User answers HIG 7 days after creation | CF-546, CF-558 | Answer accepted if within dueAt; rejected if expired |
| ST-326 | Duplicate UserTaskCreated for same nodeId+runId | CF-546 | Second creation rejected (idempotency) |
| ST-327 | Non-blocking HIG: downstream starts before answer | CF-550, DD-263 | Downstream runs with defaults; assumption flagged |
| ST-328 | Two users simultaneously answer quorum=1 task | CF-561 | Only first answer counted; second rejected (idempotent) |
| ST-329 | Quorum=3 task receives 4 answers | CF-547 | First 3 counted; 4th ignored; UserTaskQuorumReached emitted |
| ST-330 | User answers task claimed by another user | CF-548 | Rejected with 403; audit logged |
| ST-331 | Node B depends on Node A; A fails | CF-550, CF-554 | B transitions to BLOCKED; non-dependent C continues |
| ST-332 | Flow has no terminal node | CF-563 | RunReadinessValidator rejects at start time |
| ST-333 | Event received after RunTerminalState=COMPLETED | CF-551 | Event discarded; warning logged |
| ST-334 | Circular dependency in flow JSON (A→B→C→A) | CF-562 | IDagWalkerService → BUILD FAILURE |
| ST-335 | SubFlow node drill-down | DD-267 | Same /graph API with childRunId returns child graph |
| ST-336 | allOf join: one upstream fails | CF-554 | Join not satisfied; downstream BLOCKED; escalation path |
| ST-337 | Notification for 50-member group | CF-553 | All 50 notified; dedup prevents float-send on retry |
| ST-338 | Notification retry after provider failure | CF-553 | Dedup key prevents duplicate; retry succeeds once |
| ST-339 | Group task assigned to non-existent group | CF-565 | Task creation fails with validation error; run not started |
| ST-340 | Node Inspector query for completed subflow | — | childRunIds returned; child graph queryable by runId |
| ST-341 | Progress aggregation with 100 nodes | CF-559 | RunSnapshot progress accurate; batch update within 1s |
| ST-342 | NodeDebugSurface query for failed node | — | Returns inputs, outputs, judge verdicts, error trace |
| ST-343 | Blocking HIG + 5 parallel independent branches | CF-546, CF-550 | HIG branch blocked; 5 other branches continue |
| ST-344 | NodeSnapshot missing tenantId | CF-557, DNA-5 | BUILD FAILURE — rejected at compliance check AF-7 |

### DNA Compliance Matrix (FLOW-27 Services)

| DNA Pattern | How FLOW-27 Complies |
|-------------|---------------------|
| DNA-1: parse_document | All UserTask, RunSnapshot, NodeSnapshot use dict[str, Any]. No typed DTOs |
| DNA-2: build_search_filter | All ES queries via IDatabaseService.build_search_filter — empty fields auto-skipped |
| DNA-3: DataProcessResult[T] | All factory methods return DataProcessResult[T] — no exceptions for business logic |
| DNA-4: MicroserviceBase | All FLOW-27 services extend MicroserviceBase (19 components inherited) |
| DNA-5: Scope Isolation | tenantId on EVERY query, EVERY document, EVERY Redis key — CF-545, CF-552, CF-557 |
| DNA-6: DynamicController | No entity-specific controllers — universal /runs/{runId}/graph + /user-tasks/{taskId} only |

### BFA Cross-Flow Conflict Register (FLOW-27 new entities vs existing flows)

| New Entity | Potential Conflict With | BFA Check | Resolution |
|-----------|------------------------|-----------|-----------|
| user-tasks ES index | Existing ES indices (FLOW-01 to FLOW-26) | Index name uniqueness | Confirmed unique — no conflict |
| node-events Redis Stream | Existing Redis streams | Stream name uniqueness | Confirmed unique |
| UserTaskCreated event | Existing event types | Event type registry | Confirmed unique |
| INotificationProvider (F68) | Reused by FLOW-27 (T420) | Interface unchanged | No conflict — additive caller |
| tenantId on all docs | Existing multi-tenant pattern | DNA-5 compliance | Aligned — no conflict |
| HumanInteractionGate nodeType | FlowOrchestrator (SK-392 (RagStrategyRegistry)) | Node type registry | New type handler — additive |

### SAVE STATE: FLOW27-P6-COMPLETE
```
All 21 BFA rules: CF-545–CF-565 registered and cross-validated
All 20 stress tests: ST-325–ST-344 defined
DNA compliance matrix: PASSED (all 6 patterns)
Cross-flow conflicts: NONE detected
Promotion ladder: GENERATED → ready for INJECTED phase
FLOW-27: COMPLETE
```

---

## SUMMARY: WHAT FLOW-27 ENABLES

After FLOW-27, every flow in the engine (FLOW-01 through FLOW-27 and all future flows) automatically gains:

1. **"Leave and come back"** — any node can be a HumanInteractionGate. Run survives user absence. UserTask stores exact context needed to resume.

2. **Non-blocking execution** — DependencyScheduler keeps all non-dependent branches running while human gates are open. One waiting node never freezes the whole flow.

3. **Visual progress** — every run has `/graph` API returning per-node status + progress%. Click any node → Node Inspector. Click SubFlow → drill into child run. Click WAITING_FOR_USER → answer modal with exact context.

4. **Group tasks** — tasks assignable to groups, roles, or quorum within tenant. Claim prevents conflicting answers. Quorum collects N approvals. All tenant-scoped.

5. **Notifications** — fan-out to group members via existing INotificationProvider (F68). Deep links back to task context. Dedup prevents duplicate notifications on retry.

6. **Complete audit trail** — immutable NodeEvents + materialized snapshots. All queryable by traceId. All tenant-scoped. All compliant with 9 DNA patterns.

---

## RECOVERY COMMANDS

```
"Continue FLOW-27 from P0"  → Foundation schemas + ES indices
"Continue FLOW-27 from P1"  → HumanInteractionGate + UserTask Registry
"Continue FLOW-27 from P2"  → DependencyAwareScheduler
"Continue FLOW-27 from P3"  → Visual Runtime State + Progress
"Continue FLOW-27 from P4"  → Completion Gate + Terminal State
"Continue FLOW-27 from P5"  → Multi-Tenant Group Tasks + Notifications
"Continue FLOW-27 from P6"  → BFA Validation + Stress Tests
```



---

## SAVE POINT: FLOW-27_EXECUTION_PLAN_MERGED ✅

---

# ═══════════════════════════════════════════════════════
# FLOW-28: Blog/CMS Modules Platform
# Date: 2026-03-01 | Merged: Post-FLOW-27 baseline
# Factories: F1129–F1175 (47) | Families: 165–174 (10)
# Task Types: T423–T440 (18) | Templates: 92–97 (6)
# BFA Rules: CF-566–CF-600 (35) | Stress Tests: ST-345–ST-368 (24)
# Skills: SK-278–SK-289 (12) | DDs: DD-272–DD-283 | DRs: DR-205–DR-212
# ═══════════════════════════════════════════════════════

# XIIGen MASTER EXECUTION PLAN — FLOW-28: Blog/CMS Modules Platform
## Date: 2026-03-01 | Status: COMPLETE ✅
## Phase: P0 → P3 | Duration: 16 weeks
## Factories: F1129–F1175 | Task Types: T423–T440 | Skills: SK-278–SK-289

---

## FLOW-28 OVERVIEW

**Domain**: Blog/CMS Modules Platform — 14 CMS modules, 6 core flows
**Engine Extension**: 47 factories (F1129–F1175), 18 task types (T423–T440), 12 skills (SK-278–SK-289)
**Approach**: Fabric-first. Engine generates services on top of existing fabrics. No new fabrics introduced.
**BFA Rules**: CF-566–CF-600 (35 rules), Stress Tests: ST-345–ST-368 (24 scenarios)

**Key Flows Generated by Engine**:
1. Content Lifecycle (Draft → Review → Published → Archived)
2. Public Page Request Pipeline (Route → Cache-first → Render)
3. Media Upload & Transform Pipeline
4. Search Index Cascade (post-publish)
5. Hook Fan-Out System (CMS extensions)
6. Comment Moderation Queue

**AF Pipeline**: All code generated via AF-1 (Genesis) → reviewed via AF-6/AF-7/AF-8 → judged via AF-9 → AF-11 feedback stored.
**RAG References**: AF-4 retrieves SK-278–SK-289 patterns. Reuse-first approach.

---

## ANCHOR DOCUMENT REFERENCES

| Document | Key Content | Use |
|----------|-------------|-----|
| 28-blog-modules_ENGINE_ARCHITECTURE.md | F1129–F1175, Families 165–174 | Factory contracts, fabric resolution |
| 28-blog-modules_TASK_TYPES_CATALOG.md | T423–T440, 18 engine contracts | Iron rules, quality gates |
| 28-blog-modules_SKILLS_FACTORY_RAG.md | SK-278–SK-289 | Reusable patterns for AF-4 |
| 28-blog-modules_V62_BFA_STRESS_TEST.md | CF-566–CF-600, ST-345–ST-368 | Conflict detection, test criteria |
| TASK_TYPES_CATALOG_MERGED.md | T1–T388 (existing) | Backward compat reference |
| ENGINE_ARCHITECTURE_MERGED.md | F1–F1074 (existing) | Backward compat reference |

---

## P0 — FOUNDATION (Weeks 1–4)

**Goal**: Engine can generate content storage services with DNA compliance. All factories registered. BFA rules active.

---

### P0.1 — Factory Registry Extension (Week 1)

**What the engine must do**:
- Register F1129–F1175 in the IExternalServiceFactory<T> global registry
- Define FactoryResolutionContext for all 10 families (165–174)
- Add config keys to FREEDOM layer config schema (all `content.*`, `media.*`, `render.*`, etc.)
- AF-7 (Compliance) rules updated to check FLOW-28 factories for all 6 DNA patterns

**Implementation steps**:
1. Add F1129–F1175 to factory-registry.json (ENGINE_ARCHITECTURE.md as source of truth)
2. Register FactoryResolutionContext with config-first routing for each family
3. Run factory health check suite: each CreateAsync() call resolves and returns healthy instance
4. Add FREEDOM config keys to site-config schema (Elasticsearch `freedom-config` index)

**AF STATIONS**:
- AF-2 (Planning): Decompose registry work into per-family tasks
- AF-7 (Compliance): Scan factory registrations for DNA-1 (Dictionary return types) and DNA-5 (tenantId params)

**Save Point P0.1**:
```
✅ F1129–F1175 registered in factory registry
✅ FactoryResolutionContext defined for families 165–174
✅ FREEDOM config keys added
✅ AF-7 DNA check enabled for new factories
NEXT: P0.2 Core Skills Injection
```

---

### P0.2 — Core Skills Injection (Weeks 1–2)

**What the engine must do**:
- Inject 4 foundational skills into skill library at INJECTED status
- These are referenced immediately by AF-4 when generating P1 flows

**Skills to inject**:
- SK-278 (Content Repository) → INJECTED
- SK-279 (Taxonomy & Slug Resolver) → INJECTED
- SK-287 (Content Permission Service) → INJECTED
- SK-289 (Site Config & Permalink Manager) → INJECTED

**AF STATIONS**:
- AF-4 (RAG): Index SK-278, SK-279, SK-287, SK-289 in skill search index
- AF-9 (Judge): Validate each skill passes all 6 DNA patterns before INJECTED promotion

**Save Point P0.2**:
```
✅ SK-278, SK-279, SK-287, SK-289 → INJECTED status in skill library
✅ AF-4 search index updated (skills discoverable)
✅ AF-9 validation pass for all 4 skills
NEXT: P0.3 BFA Registration
```

---

### P0.3 — BFA Registration (Week 2)

**What the engine must do**:
- Register FLOW-28 entities in BFA global entity registry
- Register FLOW-28 CloudEvents in BFA event registry
- Activate CF-566–CF-600 in BFA rule engine

**Entities registered**:
`blog_content`, `blog_revision`, `taxonomy_term`, `media_asset` (→ `blog_media_asset` per CF-569),
`hook_registration`, `editor_session`, `publish_approval`, `blog_comment`

**CloudEvents registered**:
`blog.content.published`, `blog.content.archived`, `blog.content.scheduled`,
`blog.content.status_changed`, `blog.comment.submitted`, `blog.comment.approved`,
`blog.media.uploaded`, `blog.media.variants_ready`, `blog.hook.fired`, `blog.search.indexed`

**BFA rules activated**: CF-566–CF-600 (35 rules)
**Security-critical rules active from Day 1**: CF-576 (SSRF), CF-577 (XSS), CF-581 (BOLA), CF-583 (sandbox), CF-590 (draft in search)

**AF STATIONS**:
- AF-7 (Compliance): Register BFA entity/event checks in compliance scanner
- AF-8 (Security): Enable CF-576, CF-577, CF-583 security rule scans

**Save Point P0.3**:
```
✅ 8 FLOW-28 entities registered in BFA global registry
✅ 10 CloudEvents registered in BFA event registry
✅ CF-566–CF-600 activated and producing conflict detections
✅ Security rules CF-576, CF-577, CF-581, CF-583, CF-590 enabled
NEXT: P0.4 DNA Compliance Baseline
```

---

### P0.4 — DNA Compliance Baseline (Week 3)

**What the engine must do**:
- Run AF-7 scan on all SK-278–SK-289 skills
- Run AF-8 security scan on all planned code paths
- Configure AF-9 judge quality gates for T423–T440

**DNA checks (AF-7)**:
- DNA-1: All factory interfaces return dict[str, Any] — verified
- DNA-2: All filters built via build_search_filter (empty field skip) — verified
- DNA-3: All factory methods return DataProcessResult[T] — verified
- DNA-4: All generated services extend MicroserviceBase — verified
- DNA-5: tenantId parameter present on all 47 factory methods — verified
- DNA-6: No typed controllers (DynamicController only) — verified

**Security checks (AF-8)**:
- XSS pattern: comment body sanitization path (CF-577)
- BOLA: content visibility check before serve (CF-581)
- SSRF: webhook URL validation before dispatch (CF-576)
- Plugin sandbox: execution restrictions enforced (CF-583)

**Quality gates (AF-9) configured for**: T423, T425, T428, T430, T433, T435 (highest-risk contracts)

**Save Point P0.4**:
```
✅ AF-7 compliance scan passes for SK-278–SK-289 (0 DNA violations)
✅ AF-8 security scan configured for all critical paths
✅ AF-9 quality gates configured for T423–T440
✅ Zero DNA violations in initial scan
NEXT: P0.5 Task Type Contract Registration
```

---

### P0.5 — Task Type Contract Registration (Week 4)

**What the engine must do**:
- Register T423–T440 in engine task type catalog
- Add Templates 83–88 to flow definition store (Elasticsearch `flow-templates` index)
- Promote SK-278–SK-289 from GENERATED to INJECTED (AF-9 validated)

**Templates added to ES**:
- Template-92: Content Lifecycle DAG (T423→T425/T426/T427)
- Template-93: Public Page Render DAG (T430 + async T431/T432)
- Template-94: Media Upload DAG (T428→T429)
- Template-95: Extension Hook DAG (T433→T434)
- Template-96: Comment Flow DAG (T435→T436)
- Template-97: AI Enhancement DAG (T438→T439)

**P0 EXIT CRITERIA**:
- [ ] All 47 factories resolve correctly via CreateAsync() in integration test
- [ ] AF-7 compliance scan passes for all 12 skills (DNA-1 through DNA-6): 0 violations
- [ ] BFA CF-566–CF-600 registered and producing correct conflict detections
- [ ] Zero backward compatibility regressions (T1–T388, F1–F1074 tests pass unchanged)
- [ ] Templates 83–88 stored in Elasticsearch flow-templates index
- [ ] SK-278–SK-289 at INJECTED status in skill library

**Save Point P0 COMPLETE**:
```
✅ P0.1 Factory Registry — DONE
✅ P0.2 Core Skills Injection — DONE
✅ P0.3 BFA Registration — DONE
✅ P0.4 DNA Compliance Baseline — DONE
✅ P0.5 Task Type Contract Registration — DONE
PHASE P0: COMPLETE ✅
NEXT PHASE: P1 (Week 5)
```

---

## P1 — CORE FLOWS (Weeks 5–10)

**Goal**: Engine generates working Content Lifecycle + Public Page + Media flows. All primary BFA rules tested.

---

### P1.1 — Content Lifecycle Flow (Weeks 5–6)

**Engine generates** (via AF-1 Genesis):

**ContentLifecycleService (T423)**:
- AF-4 retrieves SK-278 (Content Repository) and SK-287 (Content Permission) patterns
- AF-5 runs Claude-sonnet + Gemini-2.5-Pro parallel generation
- AF-10 merges outputs (prefer Claude for orchestration logic, Gemini for state machine validation)
- AF-9 validates: state machine correctness, audit trail completeness, all iron rules

**ContentPublishingService (T425)**:
- Approval gate wired (F1164 human-in-loop) — ST-353 tested
- CloudEvents emission verified (F1165 via SK-286)
- Hook fan-out integrated (F1144, F1146 via SK-280)
- Six iron rules validated by AF-9:
  1. Permission check before publish
  2. Revision snapshot before status change
  3. Optimistic lock on revision (CF-582)
  4. Approval required if tenant config demands it
  5. Hook fan-out bounded by maxFanout (CF-571)
  6. CloudEvent emitted before returning success

**ContentSchedulerService (T426)**:
- Timer-based queue events (F1163 IScheduledPublisher)
- Race prevention with T425 (CF-582 optimistic lock pattern)

**ContentArchiveService (T427)**:
- Retention policy respected (CF-600 FREEDOM config)
- Cache invalidation triggered via F1151

**Stress tests run**: ST-345 (1000 concurrent publishes), ST-352 (cross-tenant isolation),
ST-353 (approval timeout), ST-358 (permalink change), ST-365 (scheduled backlog)

**AF STATIONS**:
- AF-1: Generate all 4 services
- AF-4: SK-278, SK-279, SK-286, SK-287 retrieved
- AF-5: Claude + Gemini parallel, DeepSeek for review logic
- AF-6: Code review pass (state machine edge cases)
- AF-7: DNA compliance (all 6 patterns, 0 violations)
- AF-8: BOLA check (CF-581), draft-in-search check (CF-590)
- AF-9: Iron rules verified, quality gates passed
- AF-10: Multi-model merge
- AF-11: Generation quality stored for T423/T425 (seed for future improvements)

**Save Point P1.1**:
```
✅ ContentLifecycleService (T423) generated, AF-9 passed
✅ ContentPublishingService (T425) generated, 6 iron rules verified
✅ ContentSchedulerService (T426) generated
✅ ContentArchiveService (T427) generated
✅ ST-345, ST-352, ST-353 PASS
NEXT: P1.2 Public Page Request Pipeline
```

---

### P1.2 — Public Page Request Pipeline (Weeks 7–8)

**Engine generates** (via AF-1 Genesis):

**PublicPageService (T430)**:
- Cache-first pattern from SK-285 (IPageCacheService via F1141)
- Slug resolution from SK-279 (F1132)
- Related content RAG from F1153 (IRelatedContentFinder → RAG FABRIC Hybrid strategy)
- BOLA check: content must be `status=published AND visibility=public` (CF-581 iron rule)
- AF-8 validates draft-content filter present in build_search_filter

**PageCacheInvalidationService (T432)**:
- Triggered by `blog.content.published` event
- Tag-based invalidation via F1151 (ICacheInvalidator)
- RSS feed cache invalidated via same tag set (CF-580)
- ST-351: bulk publish 500 posts, all caches invalidated within 30s

**SearchIndexCascadeService (T431)**:
- Triggered ONLY by `blog.content.published` (not autosave — CF-590 iron rule)
- Calls F1149 (IContentIndexer → DATABASE FABRIC ES)
- Eventual consistency window: 60s target

**Stress tests run**: ST-348 (page cache hit rate >95%), ST-351 (bulk invalidation),
ST-352 (cross-tenant), ST-360 (maintenance mode toggle), ST-362 (RSS under load)

**Save Point P1.2**:
```
✅ PublicPageService (T430) generated, BOLA/draft checks verified
✅ PageCacheInvalidationService (T432) generated
✅ SearchIndexCascadeService (T431) generated — draft exclusion verified (CF-590)
✅ ST-348 (cache hit rate >95%): PASS
✅ ST-351 (bulk invalidation): PASS
NEXT: P1.3 Media Upload & Transform Pipeline
```

---

### P1.3 — Media Upload & Transform Pipeline (Weeks 9–10)

**Engine generates** (via AF-1 Genesis):

**MediaUploadService (T428)**:
- AF-8 validates: content-type allowlist enforced, quota pre-checked (CF-579), virus scan hook (CF-599)
- AF-4 retrieves SK-281 (Media Upload & Transform pattern)
- Async job pattern: immediate traceId returned, poll for status
- F1135 (IMediaUploadService → DATABASE FABRIC Redis+blob)
- URL signing per CDN policy (CF-588)

**MediaVariantService (T429)**:
- Processes transform queue (F1136 IMediaTransformer → QUEUE FABRIC Redis Streams)
- Generates thumb/medium/large variants
- Variant records persisted via F1138 (DATABASE FABRIC PG)
- `blog.media.variants_ready` emitted only when ALL variants complete

**Stress tests run**: ST-347 (500 concurrent uploads), ST-359 (security gauntlet), ST-361 (permission cache invalidation)

**P1 EXIT CRITERIA**:
- [ ] ST-345 (1000 concurrent publishes): PASS ✅
- [ ] ST-348 (page cache hit rate >95%): PASS ✅
- [ ] ST-347 (500 concurrent media uploads): PASS ✅
- [ ] All 6 iron rules in T425 verified by AF-9 ✅
- [ ] BFA cross-flow conflicts CF-566–CF-577 producing correct detections ✅
- [ ] ST-359 (media security gauntlet): ZERO adversarial files accepted ✅

**Save Point P1 COMPLETE**:
```
✅ P1.1 Content Lifecycle Flow — DONE
✅ P1.2 Public Page Request Pipeline — DONE
✅ P1.3 Media Upload & Transform Pipeline — DONE
PHASE P1: COMPLETE ✅
NEXT PHASE: P2 (Week 11)
```

---

## P2 — ADVANCED FLOWS (Weeks 11–13)

**Goal**: Engine generates Extension System, Comment Moderation, AI Enhancement, and Sitemap flows.

---

### P2.1 — Extension System (Hooks & Webhooks) (Week 11)

**Engine generates** (via AF-1 Genesis):

**HookExecutorService (T433)**:
- Fan-out pattern from SK-280 (F1146 IHookExecutor → QUEUE FABRIC Redis Streams)
- maxFanout enforced BEFORE FireHookAsync (CF-571 iron rule — BUILD FAILURE if missing)
- IExtensionSandbox (F1148) applied to all handler executions
- Sandbox: no direct network, no env vars, timeout enforced (CF-583)
- `blog.hook.fired` CloudEvent emitted for each fan-out batch

**WebhookDispatcherService (T434)**:
- URL validation BEFORE dispatch (CF-576 SSRF iron rule)
- Allowlist check via `extensions.webhooks.allowedHosts` (FREEDOM)
- Exponential backoff retry (CF-591): base 2s, 5 max retries, then DLQ
- `WEBHOOK_DELIVERY_FAILED` status on DLQ entry with admin notification

**Stress tests run**: ST-349 (buggy handler isolation), ST-354 (webhook retry storm), ST-357 (50 plugins load), ST-368 (hook priority race)

**Save Point P2.1**:
```
✅ HookExecutorService (T433) — fan-out bounded, sandbox enforced
✅ WebhookDispatcherService (T434) — SSRF validated, retry policy applied
✅ ST-349 (buggy handler isolation): PASS
✅ ST-354 (webhook retry storm): PASS
NEXT: P2.2 Comment Moderation Flow
```

---

### P2.2 — Comment Moderation Flow (Week 12)

**Engine generates** (via AF-1 Genesis):

**CommentSubmissionGateway (T435)**:
- AI spam gate from SK-283 (F1155 ISpamDetector → AI ENGINE FABRIC Claude-haiku)
- Budget pre-check before AI call (CF-570 iron rule)
- XSS sanitization BEFORE storage (CF-577 iron rule — BUILD FAILURE if missing)
- Rate limiting pre-gate (T440): userId-based if authenticated, IP-based if anonymous (CF-587)
- Routing: high-confidence spam (>0.9) → auto-reject; borderline (0.4–0.9) → T436 queue; ham (<0.4) → approved

**CommentModerationFlow (T436)**:
- Human-in-loop pattern from SK-288 (F1156 IModerationQueue → QUEUE FABRIC Redis Streams)
- Concurrent moderation + author appeal handled with optimistic lock (CF-592, ST-366)
- `blog.comment.approved` / `blog.comment.rejected` CloudEvents emitted
- F1157 ICommentNotifier fires on approval (QUEUE FABRIC → notification)

**Stress tests run**: ST-350 (2000 comments/60s), ST-364 (threading depth limit), ST-366 (concurrent moderation + appeal)

**Save Point P2.2**:
```
✅ CommentSubmissionGateway (T435) — XSS sanitized, AI budget checked, rate limited
✅ CommentModerationFlow (T436) — human-in-loop, optimistic lock
✅ ST-350 (spam throughput): PASS
✅ ST-366 (concurrent moderation): PASS
NEXT: P2.3 AI Content Enhancement
```

---

### P2.3 — AI Content Enhancement (Week 13)

**Engine generates** (via AF-1 Genesis):

**AiContentEnhancementService (T438)**:
- Multi-model via AiDispatcher (SK-284): Claude-sonnet + Gemini-2.5-Pro parallel (F1158 IAiSeoAnalyzer)
- RAG context from IRagService (SK-279 patterns + existing content) — F1153 Hybrid strategy
- AF-11 feedback loop wired: generation quality stored per model per tenant
- Circuit breaker per provider (CF-585): if score < 0.3 for 10+ consecutive calls → fall back to next model
- Sub-services: IAiTagSuggester (F1159), IAiContentSummarizer (F1160), IAiImageAltTextGenerator (F1161 vision)

**TaxonomyPropagationService (T437)**:
- Event-sourced updates with idempotency key (CF-584): `taxonomy-prop:{termId}:{contentId}:{revision}`
- Queue-based propagation (QUEUE FABRIC) — non-blocking to reads
- Orphan cleanup job scheduled after propagation complete

**SitemapRebuildService (T439)**:
- Debounce: 1 job per tenant per 30s window (CF-575 — sitemap rate limit)
- Idempotency key: `sitemap:{tenantId}:{windowTimestamp}`
- Routes `/sitemap.xml` registered with FLOW-08 (CF-586)

**Stress tests run**: ST-355 (10K taxonomy propagation), ST-356 (parallel AI models + circuit breaker), ST-363 (100K reindex), ST-367 (FREEDOM config hot reload)

**P2 EXIT CRITERIA**:
- [ ] ST-349 (handler isolation): PASS ✅
- [ ] ST-350 (comment spam throughput): PASS ✅
- [ ] ST-354 (webhook retry storm): PASS ✅
- [ ] ST-356 (AI parallel models, circuit breaker): PASS ✅
- [ ] CF-577 (XSS) and CF-576 (SSRF): ZERO violations in all generated code ✅
- [ ] AF-11 feedback quality stored for T438 (seed data for model improvement) ✅

**Save Point P2 COMPLETE**:
```
✅ P2.1 Extension System — DONE
✅ P2.2 Comment Moderation — DONE
✅ P2.3 AI Content Enhancement — DONE
PHASE P2: COMPLETE ✅
NEXT PHASE: P3 (Week 14)
```

---

## P3 — STABILIZATION & PROMOTION (Weeks 14–16)

**Goal**: Promote stable skills to MINIMAL/CORE. Full backward compat test. Admin UI config complete. AF-11 learning seeded.

---

### P3.1 — Skill Promotion (Week 14)

**Skills promoted to MINIMAL** (battle-tested across P1/P2):
- SK-278 (Content Repository) → MINIMAL
- SK-280 (Hook Fan-Out Executor) → MINIMAL
- SK-285 (Cache-First Read Pattern) → MINIMAL
- SK-287 (Content Permission Service) → MINIMAL

**Skills remain at INJECTED** (await more production validation):
- SK-279, SK-281, SK-282, SK-283, SK-284, SK-286, SK-288, SK-289

**Skills considered for CORE** (reused in 3+ flows, fully stable):
- SK-285 (Cache-First Read) — used in T430, applicable to ALL read flows → CORE candidate after 2 more flows

**AF STATIONS**:
- AF-9 (Judge): Re-run quality gates on MINIMAL-candidate skills
- AF-11 (Feedback): Aggregate feedback scores from P1/P2 generation runs

**Save Point P3.1**:
```
✅ SK-278, SK-280, SK-285, SK-287 → MINIMAL status
✅ AF-11 feedback aggregated, quality scores stored
NEXT: P3.2 Full System Test
```

---

### P3.2 — Full System Integration Test (Week 15)

**Scenarios**:
1. End-to-end: Author drafts → autosaves → requests publish → approval gate → publish → search indexed → page cached → hook fired → webhook dispatched
2. Cross-tenant isolation: 100 tenants, mixed operations, zero bleed
3. Failure recovery: Restart services mid-flow, verify all checkpoints resume correctly
4. Backward compat: Run full T1–T388 regression suite — zero regressions

**Stress tests re-run (final validation)**:
- ST-345 (concurrent publishes), ST-348 (cache hit rate), ST-352 (cross-tenant), ST-359 (security gauntlet)

**P3.2 EXIT CRITERIA**:
- [ ] End-to-end scenario: complete in < 60s
- [ ] Cross-tenant isolation: 0 bleed events in 100-tenant test
- [ ] Backward compat regression: 0 failures in T1–T388 suite
- [ ] Security gauntlet (ST-359): ZERO adversarial files accepted

**Save Point P3.2**:
```
✅ Full end-to-end scenario: PASS
✅ Cross-tenant isolation: 0 bleed events
✅ Backward compat: 0 regressions
✅ ST-359 security gauntlet: PASS
NEXT: P3.3 Admin UI & FREEDOM Config
```

---

### P3.3 — Admin UI & FREEDOM Config Verification (Week 16)

**FREEDOM config keys verified in admin panel**:

| Config Key | Default | Admin Can Change | Machine Rule |
|------------|---------|------------------|--------------|
| `content.db.provider` | es | Yes (any of 6 providers) | Cannot be empty |
| `extensions.hooks.maxFanout` | 20 | Yes (1–100) | Cannot exceed 100 |
| `extensions.sandbox.timeoutMs` | 3000 | Yes (500–10000) | Cannot be 0 |
| `comments.spam.model` | claude-haiku | Yes (any AI model) | Cannot be disabled entirely |
| `comments.spam.fallback` | rule-based | Yes | Cannot be "none" |
| `publish.approval.required` | false | Yes (per content type) | Boolean only |
| `search.sitemap.debounceMs` | 30000 | Yes (5000–300000) | Cannot be < 1000 |
| `media.upload.maxTenantGb` | 10 | Yes (per plan) | Cannot exceed platform limit |
| `routing.blogBasePath` | /blog/ | Yes | Must start and end with / |
| `content.archive.retentionDays` | 365 | Yes | Cannot be < 30 |

**Fabric-first UI principles enforced**:
- Zero hardcoded provider names in UI
- All config values from FREEDOM ES index via ISiteConfigService (F1172)
- Admin changes propagate via `site.config.updated` event — all services refresh within 30s (ST-367)
- UI works regardless of which underlying provider is active (database, queue, AI)

**P3 EXIT CRITERIA**:
- [ ] SK-278, SK-280, SK-285, SK-287 promoted to MINIMAL ✅
- [ ] AF-11 feedback baseline stored for all T423–T440 ✅
- [ ] FREEDOM config hot-reload verified (ST-367): PASS ✅
- [ ] Full regression suite (T1–T388): 0 failures ✅
- [ ] All 10 FREEDOM config keys accessible via admin panel ✅

**Save Point P3 COMPLETE**:
```
✅ P3.1 Skill Promotion — DONE
✅ P3.2 Full System Test — DONE
✅ P3.3 Admin UI & FREEDOM Config — DONE
PHASE P3: COMPLETE ✅
FLOW-26: COMPLETE ✅
```

---

## RISK REGISTER

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ES index contention during bulk publish (ST-351) | Medium | High | Sitemap debounce (CF-575), separate write queues |
| AI budget exhaustion under comment load (CF-570) | Medium | Medium | Rule-based fallback mandatory, budget pre-check |
| Plugin sandbox escape (CF-583) | Low | Critical | AF-8 enforces at build time; zero tolerance |
| Cross-tenant config bleed (CF-578) | Low | Critical | AF-7 enforces tenantId on every FREEDOM read |
| Approval gate soft deadlock (CF-592) | Low | High | Separate reviewer pools; timeout → DLQ |
| Permalink migration breaks canonical URLs (CF-589) | High | High | Flush trigger mandatory at build time |

---

## DESIGN DECISIONS (FLOW-28)

| ID | Decision | Rationale |
|----|----------|-----------|
| DD-272 | Blog entities use `blog_` prefix in BFA (not generic `content`) | Prevents FLOW-02 entity collision (CF-566) |
| DD-273 | Draft autosave uses Redis TTL, never PostgreSQL | Reduces DB write load; drafts are ephemeral |
| DD-274 | Publish approval gate uses human-in-loop queue pattern (not synchronous call) | Decouples approval wait time from request thread; enables async resume |
| DD-275 | Hook fan-out bounded at MACHINE level (maxFanout = iron rule) | Prevents queue saturation; plugin growth cannot silently degrade performance |
| DD-276 | Comment XSS sanitization applied BEFORE storage (not at render time) | Defense in depth; stored data is always safe regardless of render context |
| DD-277 | Sitemap uses debounce window, not per-publish trigger | Prevents storm on bulk publish; eventual consistency acceptable for sitemap |
| DD-278 | Media entity named `blog_media_asset` to distinguish from FLOW-11 DAM | Prevents entity collision; both systems can coexist |
| DD-279 | AI model selection per-tenant via FREEDOM config, not global default | Enterprise requirement: tenants may have different AI contracts |
| DD-280 | Webhook SSRF check runs on EVERY dispatch including retries | Security: allowlist state may change between original attempt and retry |
| DD-281 | FREEDOM permalink config change triggers mandatory canonical flush | Data integrity: no window where old and new canonical URLs coexist |
| DD-282 | Cache-first pattern (SK-285) promoted to CORE candidate after 2 more flows | Pattern proven in T430; universally applicable to all read-heavy flows |
| DD-283 | AF-11 baseline seeded during P1/P2 generation (not post-production) | Earlier seed data = faster model quality improvement cycle |

---

## COMPLETE ARTIFACT SUMMARY

| Artifact Type | Range | Count | Status |
|---------------|-------|-------|--------|
| Factories | F1129–F1175 | 47 | ✅ Registered |
| Factory Families | 165–174 | 10 | ✅ Registered |
| Task Types | T423–T440 | 18 | ✅ Full contracts |
| Flow Templates | 83–88 | 6 | ✅ ES stored |
| Skills | SK-278–SK-289 | 12 | ✅ INJECTED+ |
| BFA Rules | CF-566–CF-600 | 35 | ✅ Active |
| Stress Tests | ST-345–ST-368 | 24 | ✅ Defined |
| Design Decisions | DD-272–DD-283 | 12 | ✅ Recorded |

---

## FLOW-27 READINESS

**Next available numbers**:
```
Factory:    F1122 | Family: 164 | Task Type: T407
Template:   89    | BFA Rule: CF-545 | Stress Test: ST-324
Skill:      SK-263 | Design Decision: DD-142 | Design Record: DR-107
```

**Recommended anchors for FLOW-27**:
- SK-285 (Cache-First Read) — reuse in any read-heavy domain
- SK-286 (CloudEvent Publisher) — reuse for any event-emitting flow
- SK-287 (Content Permission) — adaptable RBAC pattern
- Template-93 (Public Page Render DAG) — baseline for any content-serving flow


---

## SAVE POINT: MASTER_EXECUTION_PLAN_FLOW28_MERGED ✅

---

# ═══════════════════════════════════════════════════════
# FLOW-29 — Adaptive RAG Deep Research Engine
# Execution Plan
# ═══════════════════════════════════════════════════════

---

## EXECUTION OVERVIEW

| Phase | Name                              | Artifacts                          | Duration Est. | Save Point           |
|-------|-----------------------------------|------------------------------------|---------------|----------------------|
| P0    | Factory Registration              | F1176–F1247, Families 175–184      | 30 min        | All factories locked |
| P1    | Knowledge & Retrieval Fabrics     | T441–T444, SK-290–253              | 45 min        | Retrieval layer done |
| P2    | Trace + Feedback + Budget         | T445–T449, SK-293–256              | 45 min        | Learning signals done|
| P3    | Eval + Prompt + Domain            | T450–T455, SK-296–259              | 45 min        | Quality layer done   |
| P4    | Asset Versioning + A/B            | T456–T462, SK-299–263              | 45 min        | Governance done      |
| P5    | Self-Learning + Efficiency        | T463–T467, SK-303–265              | 30 min        | All tasks complete   |
| P6    | BFA + Validation + Integration    | CF-601–535, ST-369–320, Templates  | 30 min        | FLOW-29 COMPLETE     |

---

## P0 — Factory Registration (Save Point: All 72 factories declared in registry)

**Objective:** Register all 72 new factory interfaces in the engine's factory registry. No implementation code yet — interfaces only.

**Steps:**
1. Add Families 175–184 to ENGINE_ARCHITECTURE factory registry
2. Register each IExternalServiceFactory<TService> binding:
   - IAdaptiveRagRouter → RagFabricAdapter (resolves to IRagService via AdaptiveBandit strategy)
   - IGraphRagService → DatabaseFabricAdapter (resolves to IDatabaseService — graph provider config)
   - ITraceSpanService → QueueFabricAdapter (resolves to IQueueService — Redis Streams)
   - IBanditRouter → AiFabricAdapter (resolves to IAiProvider — routing model config)
   - [all 72 mappings as documented in ENGINE_ARCHITECTURE]
3. Add factory capability declarations to factory capability matrix
4. Add health check probes for new factory endpoints
5. Update factory registry document checksum

**Validation:** `factory_registry.Validate()` — all 72 factories have:
- Interface declared ✅
- Fabric resolution mapping ✅
- Health check probe ✅
- CreateAsync() registration ✅

**SAVE POINT:** Factory registry locked. Proceed to P1.

---

## P1 — Knowledge & Retrieval Fabrics (Save Point: T441–T444, SK-290–253 complete)

**Objective:** Implement the retrieval layer — adaptive routing, vector retrieval, GraphRAG community query, hybrid fusion. All through fabric interfaces.

### P1.1 — Adaptive Route Gate (T441)
1. AF-1 Genesis: generate AdaptiveRagRouterService extending MicroserviceBase
2. Inject: F1176 (IAdaptiveRagRouter), F1177 (ITaskClassifier), F1178 (IRetrievalModeSelector), F1183 (IRoutingAuditLogger)
3. AF-7 Compliance: verify no direct provider import; all via CreateAsync()
4. AF-9 Judge: routing_confidence_score ≥ 0.7; audit event emitted before return
5. Save SK-290 pattern to skill library

### P1.2 — Vector Retrieval Step (T442)
1. AF-1 Genesis: generate VectorRetrievalService extending MicroserviceBase
2. Inject: F1179 (query rewrite), F1180 (decompose), F1235 (index version), F1244 (reranker), F1242 (efficiency monitor)
3. Key: parallel sub-query execution (IQueryDecomposer splits → parallel calls → merge)
4. AF-9 Judge: reranker applied; retrieved_token_count recorded; no typed Passage models

### P1.3 — GraphRAG Community Query (T443)
1. AF-1 Genesis: generate GraphRagQueryService extending MicroserviceBase
2. Critical: F1190 (IGraphIndexRebuildQueue) is ASYNC only — BFA CF-605 enforced at compile
3. AF-7 Compliance: tenantId on every graph query (DNA-5)
4. AF-9 Judge: community_level_selected; rebuild_not_blocking; tenant_scope verified
5. Save SK-291 pattern

### P1.4 — Hybrid Retrieval Fusion (T444)
1. AF-1 Genesis: generate HybridFusionService
2. fusionRatio from FREEDOM config (never hard-coded)
3. IContextPruner (F1247) runs if total > budget_cap — never silent truncation
4. Save SK-292 pattern

**SAVE POINT:** Retrieval layer (T441–T444, SK-290–253) complete. All patterns in skill library.

---

## P2 — Trace + Feedback + Budget (Save Point: T445–T449, SK-293–256 complete)

**Objective:** Implement the self-learning signals — bandit routing, budget enforcement, trace capture, user feedback ingestion.

### P2.1 — Contextual Bandit Model Select (T445)
1. AF-1 Genesis: generate BanditRouterService extending MicroserviceBase
2. Arm = (modelId, promptVersionId, flowVariantId) — structure is MACHINE (invariant)
3. Exploration rate from FREEDOM config; policy read is synchronous; policy update is async via QUEUE
4. AF-9 Judge: arm declared in trace; budget_mode respected; audit emitted before generation call
5. Save SK-293 pattern

### P2.2 — Budget Enforcement Gate (T446)
1. AF-1 Genesis: generate BudgetEnforcementService
2. Hard rule: if token_count > budget_cap → DataProcessResult.Fail(BudgetExceeded); NEVER truncate silently
3. CF-622 BFA rule active — any silent truncation = BUILD FAILURE on next BFA scan

### P2.3 — Routing Policy Update (T447)
1. AF-1 Genesis: generate PolicyUpdateWorker (background service extending MicroserviceBase)
2. ALWAYS async — triggered by QUEUE FABRIC event from T460 (feedback aggregation window close)
3. Previous policy archived before new version activates

### P2.4 — Trace Span Capture (T448)
1. AF-1 Genesis: generate TraceSpanService
2. OTel-compatible span format, emitted via IQueueService (never direct OTel SDK)
3. Outbox pattern: persist to DATABASE FABRIC before acknowledging span
4. traceId propagated via MicroserviceBase auth context (not per-call parameter)
5. Save SK-294 pattern

### P2.5 — User Feedback Ingest (T449)
1. AF-1 Genesis: generate FeedbackIngestService
2. Idempotency key: (userId + runId + traceId)
3. Links feedback to bandit store, feedback aggregator, AND trace
4. All fields as dict[str, Any] — no typed FeedbackModel
5. Save SK-295 pattern

**SAVE POINT:** Learning signals layer (T445–T449, SK-293–256) complete.

---

## P3 — Eval + Prompt + Domain (Save Point: T450–T455, SK-296–259 complete)

**Objective:** Implement the quality + governance layer — evaluation, prompt versioning, domain profiles.

### P3.1 — Eval Quality Gate (T454)
1. AF-1 Genesis: generate EvalQualityGateService
2. Hallucination detection via AiDispatcher (F1211) — multi-model consensus required (CF-612)
3. Quality rubric from DATABASE FABRIC, tenant-scoped (CF-613)
4. Eval result published via QUEUE FABRIC before response returned
5. Save SK-296 pattern

### P3.2 — Prompt Version Promote (T450)
1. AF-1 Genesis: generate PromptVersionRegistryService
2. CREATE new document on promote — never UPDATE existing (CF-609 enforced)
3. Ladder: DRAFT → CANDIDATE → TESTED → ACTIVE → ARCHIVED
4. Rollback = pointer swap to previous ACTIVE, never delete (CF-610)
5. Save SK-297 pattern

### P3.3 — Domain Profile Compile (T451)
1. AF-1 Genesis: generate DomainCompilerService
2. Profile is always tenant-scoped (CF-613)
3. Auto-generated extraction prompts → versioned via F1213 before activation (CF-614)
4. Rebuild triggered async via F1225 (QUEUE FABRIC)
5. Save SK-298 pattern

### P3.4 — Knowledge Graph Edit Gate (T452) + Promotion Pipeline Gate (T455)
1. T452: IGraphEditGate (F1189) — permissions layer check before ANY structural graph change
2. T455: IPromotionPipelineOrchestrator (F1232) — FLOW ENGINE FABRIC — executes promotion steps in order, resumable

**SAVE POINT:** Quality & governance layer (T450–T455, SK-296–259) complete.

---

## P4 — Asset Versioning + A/B + Efficiency (Save Point: T456–T462, SK-299–263 complete)

**Objective:** Implement RAG asset versioning, A/B experimentation, context efficiency enforcement, control plane governance.

### P4.1 — RAG Asset Version Compare (T453)
1. Comparator (F1240) runs on same eval dataset for both versions
2. Block promotion if regression > 3% (F1241)
3. Save SK-299 pattern

### P4.2 — A/B Test Allocation (T456)
1. Deterministic allocation: hash(tenantId + userId + experimentId) → variant index
2. No shared mutable state between variant branches
3. Results via QUEUE FABRIC (CF-618)
4. Save SK-302 pattern

### P4.3 — Context Efficiency Check (T457) + Reranker Step (T458)
1. T457: Monitor token_count → emit efficiency_score → feed penalty to bandit async
2. T458: Reranker always runs before generator sees context; relevance_threshold from FREEDOM
3. Save SK-300, SK-301 patterns

### P4.4 — Self-Reflection Check (T459) + Control Plane Governance (T462)
1. T459: Self-reflection can ONLY reduce tokens — if expansion detected → skip (CF-617)
2. T462: Control plane graph edits require IGraphEditGate + BFA approval (CF-619)

**SAVE POINT:** Asset versioning + experimentation layer (T456–T462, SK-299–263) complete.

---

## P5 — Self-Learning + Communities + Visual UI (Save Point: T463–T467, SK-303–265 complete)

### P5.1 — Community & Domain Tasks (T463–T465)
1. T463 Multi-Hop Traversal: tenantId on every hop; max_hops from FREEDOM config (CF-623)
2. T464 Community Summary: ALWAYS async via IGraphIndexRebuildQueue (CF-605)
3. T465 Domain Index Rebuild: async, metrics tracked via F1226

### P5.2 — Rollback + Policy Tasks (T466–T467)
1. T466 RAG Rollback: pointer swap to previous version — never delete history
2. T467 Visual Control Plane: React Flow canvas reading FREEDOM config for node types (CF-625)

### P5.3 — Learning Loop Tasks (T460–T461)
1. T460 Feedback Aggregation: window = min(100 runs, 24h) from FREEDOM config; triggers T447
2. T461 Improvement Suggestions: graph analytics over failure clusters → suggestions via QUEUE, never auto-applied

### P5.4 — Save SK-303 (Policy Updater) + SK-304 (Visual Canvas)

**SAVE POINT:** All 27 task types complete. All 15 skills complete.

---

## P6 — BFA + Stress Tests + Integration (Save Point: FLOW-29 COMPLETE)

### P6.1 — Register BFA Rules CF-601–CF-626
1. Add 26 rules to BFA conflict detection engine (FLOW-25 engine, F1028–F1074)
2. Priority order: CRITICAL rules first, then HIGH, then MEDIUM
3. CRITICAL rules execute on every code generation pass (AF-7 Compliance + AF-9 Judge)
4. HIGH rules execute on every deployment manifest check
5. MEDIUM rules execute on scheduled BFA scan (configurable interval)

### P6.2 — Run Stress Tests ST-369–ST-389
Execute in priority order:
1. CRITICAL security tests first: ST-370 (cross-tenant), ST-372 (mutation), ST-373 (truncation)
2. HIGH integrity tests: ST-371 (sync rebuild), ST-374 (ladder skip), ST-377 (direct import)
3. MEDIUM signal quality tests: ST-378 (premature window), ST-379 (hard-coded UI)
4. Integration test: ST-389 (full system load — 5 concurrent paths)

Resolution for each test:
- PASS: log to BFA validation report
- FAIL CRITICAL: HALT, patch, rerun
- FAIL HIGH: log, queue fix, continue other tests
- FAIL MEDIUM: warn, continue

### P6.3 — Register Templates 98–104
Add 7 new flow templates to FlowOrchestrator template registry (FLOW ENGINE FABRIC).

### P6.4 — AF Station Mapping Verification
For each of the 27 task types, verify:
- AF-1 (Genesis): generates service extending MicroserviceBase ✅
- AF-4 (RAG): retrieves relevant SK from SK-290–265 ✅
- AF-7 (Compliance): DNA-1 through DNA-9 checked ✅
- AF-9 (Judge): all quality gates validated ✅
- AF-11 (Feedback): generation quality stored ✅

### P6.5 — Backward Compatibility Final Check
- Run FLOW-01 through FLOW-25 task type contracts against new BFA rules
- Confirm: zero existing task types break under CF-601–535
- Confirm: F1–F1074 unchanged in factory registry
- Confirm: IRagService existing 7 strategies still resolve correctly

### P6.6 — Update SESSION_STATE
- Mark FLOW-29 as COMPLETE ✅
- Update all counters to post-FLOW-29 totals
- Set FLOW-30 start numbers

**SAVE POINT: FLOW-29 COMPLETE ✅**

---

## RECOVERY PROTOCOL (any phase)

To recover from a session break at any phase:
1. Open `29-adaptive_rag_SESSION_STATE.md` → check Phase Completion Tracker
2. Open `29-adaptive_rag_ENGINE_ARCHITECTURE.md` → confirm last factory registered (F1176–F1247)
3. Open `29-adaptive_rag_TASK_TYPES_CATALOG.md` → find last T### completed
4. Resume from next incomplete task type or step
5. All artifacts are additive — no rollback needed for incomplete phases

**Critical rule:** If stopped mid-task-type, complete the full ENGINE CONTRACT format before starting next one. Partial task types = BUILD FAILURE when BFA runs.

---

## SELF-LEARNING IMPROVEMENT TARGETS

FLOW-29 establishes measurable improvement targets (tracked via IContextEfficiencyMonitor + IBanditFeedbackStore):

| Metric                          | Baseline (Pre-FLOW-29) | Target (Post FLOW-29 90 days) |
|---------------------------------|------------------------|-------------------------------|
| First-try success rate          | Measured baseline      | +20–30% improvement           |
| Average retrieved tokens/task   | Measured baseline      | -15% (context efficiency)     |
| Model cost per solved task      | Measured baseline      | -10% (bandit routing)         |
| Hallucination detection rate    | Single model           | Multi-model consensus (3+)    |
| Prompt rollback incidents       | Untracked              | <2/month (versioning)         |
| Cross-tenant data leaks         | Undetected             | 0 (CF-604, CF-613 enforcement)|

These targets feed back into T461 (Improvement Suggestion Engine) and T447 (Routing Policy Update) for continuous improvement beyond FLOW-29.
-e 
## SAVE POINT: MASTER_EXECUTION_PLAN_FLOW29_MERGED ✅

---

# ═══════════════════════════════════════════════════════════════════
# FLOW-30 — PromptOps: Self-Learning Prompt Engineering — Execution Plan
# Date: 2026-03-01
# ═══════════════════════════════════════════════════════════════════

# FLOW-30 MASTER EXECUTION PLAN
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Date: 2026-03-01 | Status: READY FOR IMPLEMENTATION
---

## STARTING NUMBERS (FLOW-30)
```
Factory:         F1248    Family: 185
Task Type:       T468
BFA Rule:        CF-627
Stress Test:     ST-390
Skill:           SK-305
Design Decision: DD-298
Design Record:   DR-223
Template:        90
```

## ENDING NUMBERS (FLOW-30)
```
Factory:         F1270    Family: 190
Task Type:       T488
BFA Rule:        CF-651
Stress Test:     ST-404
Skill:           SK-314
Design Decision: DD-302
Design Record:   DR-225
Template:        92
```

## NEXT FLOW STARTS AT
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

---

## WHAT FLOW-30 ADDS (SUMMARY)

| Artifact | Count | Range |
|----------|-------|-------|
| Factories | 23 | F1248–F1270 |
| Families | 6 | 185–190 |
| Task Types | 21 | T468–T488 |
| BFA Rules | 25 | CF-627–CF-651 |
| Stress Tests | 15 | ST-390–ST-404 |
| Skills | 10 | SK-305–SK-314 |
| Design Decisions | 5 | DD-298–DD-302 |
| Design Records | 3 | DR-223–DR-225 |
| Templates | 3 | 105–107 |

---

## PHASE PLAN

### PHASE 0 — Validate & Anchor (15 min)
Goal: Confirm starting numbers from RAG_INDEX_UPDATED.md. Confirm FLOW-25 ended at F1074/T508/CF-509.
Confirm FLOW-26–29 consumed F1075–F1274, T389–T444 (per session notes).
FLOW-30 starts: F1248 / T468 / CF-627 / SK-305 / Family 185 / Template 105.
Backward compat check: FLOW-30 is opt-in (promptOpsEnabled config flag). All existing flows default to false.
SAVE POINT: Numbers confirmed, backward compat strategy locked.

### PHASE 1 — Factory Registry (45 min)
Deliverable: ENGINE_ARCHITECTURE document (DONE — 30-prompt_improvements_ENGINE_ARCHITECTURE.md)
Content: 6 families (185–190), 23 factories (F1248–F1270)
  - Family 185: Prompt Asset Control Plane (F1248–F1252) → DATABASE FABRIC (ES)
  - Family 186: PromptOps RAG Meta-Memory (F1253–F1256) → RAG FABRIC + DATABASE FABRIC
  - Family 187: Prompt Optimization Engine (F1257–F1260) → AI ENGINE FABRIC
  - Family 188: Canary Promotion Pipeline (F1261–F1264) → QUEUE + DATABASE FABRIC
  - Family 189: PromptOps Observability (F1265–F1267) → DATABASE FABRIC
  - Family 190: Multi-Tenant Safety (F1268–F1270) → CORE + DATABASE FABRIC
Key design decisions: DD-298 through DD-302. ES index structure: DR-223.
VALIDATION: Every factory has fabric resolution declared. No factory imports provider directly.
STATUS: ✅ COMPLETE

### PHASE 2 — Task Types Catalog (60 min)
Deliverable: TASK_TYPES_CATALOG document (DONE — 30-prompt_improvements_TASK_TYPES_CATALOG.md)
Content: 21 task types (T468–T488), 3 templates (105–107)

Execution Path task types (Template 105):
  T468 — Prompt Version Selection Gate (ORCHESTRATION)
  T469 — Node Execution with Trace Capture (AI_GENERATION)
  T470 — Multi-Model Prompt Run (ORCHESTRATION)
  T471 — Judge Verdict Capture & Scoring (JUDGMENT)
  T472 — Prompt Improvement Trigger Gate (ORCHESTRATION)
  T485 — Prompt Policy Router (ORCHESTRATION)
  T486 — Prompt Metrics Snapshot (EVENT_PROCESSING)
  T487 — Prompt Audit Log Entry (EVENT_PROCESSING)
  T488 — Prompt Injection Guard (COMPLIANCE)

Optimization Sub-Flow task types (Template 106):
  T473 — Evidence Pack Retrieval
  T474 — Prompt Critique Sub-Flow
  T475 — Candidate Prompt Generation
  T476 — Candidate Evaluation on Eval Suite
  T477 — Promotion Decision Gate
  T478 — Canary Rollout Coordinator
  T479 — Production Promotion Gate
  T480 — Rollback Trigger

Supporting event task types (Template 105):
  T481 — PromptOps RAG Ingestion
  T482 — Eval Suite Harvest from Failure

Multi-Tenant task types (Template 107):
  T483 — Tenant Prompt Override Application
  T484 — Cross-Tenant Learning Aggregation

VALIDATION: Every task type has full engine contract format (no one-line stubs).
Every factory dependency declared with FABRIC RESOLUTION.
AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES all present.
STATUS: ✅ COMPLETE

### PHASE 3 — Skills Factory RAG (45 min)
Deliverable: SKILLS_FACTORY_RAG document (DONE — 30-prompt_improvements_SKILLS_FACTORY_RAG.md)
Content: 10 skills (SK-305–SK-314)

CORE promotion (required in all generated services):
  SK-305 — Prompt Version Asset Management (CQRS + Immutable Versioning)
  SK-309 — Canary Promotion Pipeline (Multi-Gate Gated Promotion)
  SK-311 — Multi-Tenant Prompt Safety (MACHINE/FREEDOM Guard)
  SK-312 — Prompt Injection Guard Pattern (Data/Instruction Separation)
  SK-314 — PromptOps Observability (Trace+Metrics+Audit)

INJECTED (engine generates as needed):
  SK-306 — PromptOps Hybrid RAG Retrieval
  SK-307 — Candidate Prompt Generation Pipeline
  SK-308 — Eval Suite Construction & Harvest
  SK-310 — Bandit-Based Prompt Routing
  SK-313 — TextGrad-Style Prompt Critique

VALIDATION: Each skill includes DNA compliance notes, iron rules, reuse guidance.
All code patterns use dict[str, Any], DataProcessResult, fabric calls.
STATUS: ✅ COMPLETE

### PHASE 4 — BFA Rules & Stress Tests (45 min)
Deliverable: V62_BFA_STRESS_TEST document (DONE — 30-prompt_improvements_V62_BFA_STRESS_TEST.md)
Content: 25 BFA rules (CF-627–CF-651), 15 stress tests (ST-390–ST-404)

CRITICAL severity rules (9):
  CF-627 (RAG index isolation), CF-628 (single-judge promotion),
  CF-629 (version text mutation), CF-631 (audit log mutation),
  CF-632 (injection silent skip), CF-634 (PII in eval suite),
  CF-637 (MACHINE override), CF-638 (global auto-promotion),
  CF-639 (cross-tenant leakage), CF-651 (backward compat)

HIGH severity rules (11):
  CF-630, CF-633, CF-635, CF-640, CF-641, CF-642, CF-643, CF-644, CF-645, CF-647, CF-650

MEDIUM severity rules (4):
  CF-636, CF-646, CF-648, CF-649

Key stress tests:
  ST-390 — RAG isolation under 100-tenant concurrent load
  ST-393 — Cascade rollback under canary regression (30s SLA)
  ST-396 — Prompt injection in RAG content (100% detection required)
  ST-403 — End-to-end optimization cycle (happy path)
  ST-404 — Backward compatibility (FLOW-01–25 unaffected)

VALIDATION: Every CRITICAL rule has a corresponding stress test.
Detection method specified (Static or AI_SCAN). BUILD_FAILURE_CODE assigned.
STATUS: ✅ COMPLETE

### PHASE 5 — Unified Source Index (30 min)
Deliverable: UNIFIED_SOURCE_INDEX document (DONE — 30-prompt_improvements_UNIFIED_SOURCE_INDEX.md)
Content: Cross-reference tables for all FLOW-30 artifacts, dependency graph, fabric resolution map.
VALIDATION: Every factory appears in task type tables. Every BFA rule has a stress test mapped.
STATUS: ✅ COMPLETE

### PHASE 6 — Session State (20 min)
Deliverable: SESSION_STATE document (DONE — 30-prompt_improvements_SESSION_STATE.md)
Content: Current state tracker, merge instructions for main documents, recovery protocol.
STATUS: ✅ COMPLETE

### PHASE 7 — Master Execution Plan (this document)
Deliverable: MASTER_EXECUTION_PLAN document (this file)
STATUS: ✅ COMPLETE (in progress)

---

## FLOW DAG (JSON Template — for FlowOrchestrator SK-392 (RagStrategyRegistry))

```json
{
  "flowId": "FLOW-30-PromptOps",
  "version": "1.0",
  "promptOpsEnabled": true,
  "description": "Self-Learning Prompt Optimization Engine",
  "templates": {
    "template-90": {
      "name": "Standard PromptOps Execution Wrapper",
      "steps": [
        { "stepId": "step-1", "taskType": "T468", "factory": "F1250,F1249,F1263", "nextOnSuccess": "step-2" },
        { "stepId": "step-2", "taskType": "T469", "factory": "F1265,F1254,F1249", "nextOnSuccess": "step-3" },
        { "stepId": "step-3", "taskType": "T471", "factory": "F1252,F1265,F1251", "nextOnSuccess": "step-4" },
        { "stepId": "step-4", "taskType": "T472", "factory": "F1250,F1261",
          "nextOnSuccess": "step-5", "nextOnTrigger": "template-91" },
        { "stepId": "step-5", "taskType": "T481", "factory": "F1253,F1254,F1251", "async": true },
        { "stepId": "step-6", "taskType": "T482", "factory": "F1255,F1256,F1265",
          "condition": "judgeScore < harvestThreshold", "async": true },
        { "stepId": "step-7", "taskType": "T486", "factory": "F1266,F1265", "scheduled": "*/15 * * * *" },
        { "stepId": "step-8", "taskType": "T487", "factory": "F1267", "onEvent": "any_state_transition" },
        { "stepId": "step-9", "taskType": "T488", "factory": "F1259,F1253", "beforeStep": "step-2" }
      ]
    },
    "template-91": {
      "name": "Optimization Sub-Flow",
      "trigger": "StartOptimizationFlow event from T472",
      "steps": [
        { "stepId": "opt-1", "taskType": "T473", "factory": "F1253,F1254,F1255", "nextOnSuccess": "opt-2" },
        { "stepId": "opt-2", "taskType": "T474", "factory": "F1257,F1252", "nextOnSuccess": "opt-3" },
        { "stepId": "opt-3", "taskType": "T475", "factory": "F1258,F1248,F1249,F1259", "nextOnSuccess": "opt-4" },
        { "stepId": "opt-4", "taskType": "T476", "factory": "F1256,F1260,F1255",
          "nextOnPass": "opt-5", "nextOnFail": "opt-reject" },
        { "stepId": "opt-5", "taskType": "T477", "factory": "F1259,F1262,F1252",
          "nextOnApproved": "opt-6", "nextOnMarginal": "opt-human-review" },
        { "stepId": "opt-6", "taskType": "T478", "factory": "F1261,F1266,F1263",
          "nextOnSuccess": "opt-7", "nextOnRegression": "opt-rollback" },
        { "stepId": "opt-7", "taskType": "T479", "factory": "F1249,F1262,F1267,F1263" },
        { "stepId": "opt-rollback", "taskType": "T480", "factory": "F1264,F1249,F1267" },
        { "stepId": "opt-reject", "taskType": "T487", "factory": "F1267", "note": "archive rejected candidate" }
      ]
    },
    "template-92": {
      "name": "Multi-Tenant PromptOps",
      "steps": [
        { "stepId": "mt-1", "taskType": "T483", "factory": "F1268,F1270,F1249" },
        { "stepId": "mt-2", "taskType": "T484", "factory": "F1269,F1253,F1257", "scheduled": "0 2 * * *" }
      ],
      "guard": { "taskType": "T488", "wraps": ["mt-2"] }
    }
  }
}
```

---

## MERGE INSTRUCTIONS (for main merged documents)

When merging FLOW-30 into the main document set:

### 1. ENGINE_ARCHITECTURE_MERGED.md
- Append Families 185–190 (F1248–F1270)
- Update FLOW registry: add FLOW-30 entry
- Update artifact counts: Factories → 1297 total, Families → 180

### 2. TASK_TYPES_CATALOG_MERGED.md
- Append T468–T488 (21 task types)
- Append Templates 105–107

### 3. SKILLS_FACTORY_RAG_MERGED.md
- Append SK-305–SK-314 (10 skills)

### 4. V62_BFA_STRESS_TEST_MERGED.md (or UNIFIED_SOURCE_INDEX)
- Append CF-627–CF-651 (25 rules)
- Append ST-390–ST-404 (15 tests)

### 5. UNIFIED_SOURCE_INDEX_MERGED.md
- Append FLOW-30 cross-reference tables
- Append design decisions DD-298–DD-302
- Append design records DR-223–DR-225

### 6. SESSION_STATE_MERGE.md (global tracker)
- Register FLOW-30 in flow registry
- Update ALL artifact counts
- Set NEXT AVAILABLE: F1271 / T489 / CF-652 / ST-405 / SK-315 / DD-303 / DR-226 / Template 93 / Family 181

---

## POST-MERGE GLOBAL ARTIFACT COUNTS

| Artifact | Pre-FLOW-30 | FLOW-30 Adds | Post-FLOW-30 |
|----------|-------------|--------------|--------------|
| Factories | ~1074 (F1–F1274 incl. FLOW-26–29) | 23 | ~1297 |
| Families | ~174 | 6 | ~180 |
| Task Types | ~508 (T1–T444 incl. FLOW-26–29) | 21 | ~529 |
| Templates | ~89 | 3 | ~92 |
| BFA Rules | ~569 | 25 | ~594 |
| Stress Tests | ~339 | 15 | ~354 |
| Skills | ~260 | 10 | ~270 |
| Design Decisions | ~264 | 5 | ~269 |
| Design Records | ~199 | 3 | ~202 |
| Flows Defined | 29 | 1 | 30 |

---

## DNA COMPLIANCE SUMMARY (FLOW-30)

All FLOW-30 generated services comply with all 9 DNA patterns:

| DNA | Pattern | How FLOW-30 complies |
|-----|---------|---------------------|
| DNA-1 | parse_document (Dictionary) | All prompt assets, traces, eval cases stored as dict[str, Any] |
| DNA-2 | build_search_filter | Policy lookups, trace queries, eval case dedup — all skip empty fields |
| DNA-3 | DataProcessResult[T] | Every operation returns DataProcessResult — no thrown exceptions for business logic |
| DNA-4 | MicroserviceBase | All 6 FLOW-30 service families inherit MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | tenantId on every ES index operation; separate promptops_rag_{tenantId} per tenant |
| DNA-6 | DynamicController | No IPromptVersionController — DynamicController routes all prompt version endpoints |
| DNA-7 | Idempotency | traceId as idempotency key; Redis SETNX for optimization trigger dedup (CF-646) |
| DNA-8 | Outbox | Promotion events (CANARY_APPROVED, PROMOTED, ROLLED_BACK) via QUEUE FABRIC outbox |
| DNA-9 | (Extended) | Audit log is append-only (immutability enforcement — CF-631) |

---

## AF STATION MAPPING (FLOW-30)

How the AI pipeline generates and validates FLOW-30 services:

| AF Station | Role in FLOW-30 |
|-----------|----------------|
| AF-1 Genesis | Generates services for F1248–F1270 from engine contracts (T468–T488) |
| AF-2 Planning | Decomposes PromptOps optimization sub-flow into steps (Template 106) |
| AF-3 Prompt Library | Retrieves active prompt version via IPromptVersionService (F1249) for each node |
| AF-4 RAG Context | Retrieves similar failure evidence via IPromptOpsRagService (F1253) — hybrid vector+graph |
| AF-5 Multi-model | Runs Critic (T474) across Claude+GPT-4+Gemini in parallel via AiDispatcher |
| AF-6 Code Review | Reviews IPromptEditorService (F1258) candidate output for structural quality |
| AF-7 Compliance | IPromptGuardService (F1259) — validates no MACHINE violation, no schema break |
| AF-8 Security | IPromptGuardService injection scan (T488) — detects control-plane pattern injection |
| AF-9 Judge | ICandidateEvaluatorService (F1260) — eval suite delta scoring; promotion gate validation |
| AF-10 Merge | Merges multi-model critiques (T474) — union failureModes, intersect editRecommendations |
| AF-11 Feedback | Writes traces (T469), patches (T475), audit entries (T487), metrics (T486) |

---

## BACKWARD COMPATIBILITY CONTRACT

FLOW-30 is additive and opt-in. The engine behavior for FLOW-01–FLOW-29 is unchanged.

Activation: `promptOpsEnabled: true` in flow config (or per-node config).
Default: `false` for all existing flows and all new flows unless explicitly set.

What changes when promptOpsEnabled = false (default):
  - T468 (selection gate) does NOT fire — nodes use their existing prompt injection
  - T469 (trace capture) does NOT fire — no PromptOps traces written
  - All F1248–F1270 services are deployed but dormant
  - No performance impact on existing flows

What changes when promptOpsEnabled = true:
  - T468 wraps node execution → selects versioned prompt
  - T469 captures execution trace
  - T471 applies structured verdict
  - T472 conditionally triggers optimization sub-flow

BFA rule CF-651 enforces backward compat as a BUILD FAILURE check in CI.
ST-404 validates behavioral equivalence for all 25 existing flows.


# ═══════════════════════════════════════════════════════════════
# FLOW-31 — Design Intelligence: Figma Screen Understanding,
#            GraphRAG Module Mapping, Gap Completion
# Execution Plan: P0–P7 (8 phases)
# ═══════════════════════════════════════════════════════════════

# FLOW-31 — MASTER EXECUTION PLAN
## Domain: Design Intelligence — Figma Screen Understanding, GraphRAG Module Mapping, Gap Completion
## Status: COMPLETE ✅
## Date: 2026-03-01

---

## OVERVIEW

FLOW-31 extends the XIIGen engine to understand Figma designs as structured functional artifacts.
The engine ingests screens, produces DesignIR → ScreenSemanticsIR → SystemModelIR, maps screens
to Genie DNA modules, infers system type, detects gaps, and continuously improves via a learning loop.

**9 Fabric Families: 191–199 | 68 Factories: F1271–F1338 | 27 Task Types: T489–T515 | 8 Templates: 108–115**

---

## PHASE SUMMARY TABLE

| Phase | Name | Factories | Duration | Save Point |
|-------|------|-----------|----------|-----------|
| P0 | Foundation + Rate Limit Infrastructure | F1271–F1278 | 30 min | ES indices created, rate-limit bucket active |
| P1 | DesignIR Processing Pipeline | F1279–F1286 | 45 min | DesignIR flowing end-to-end for test file |
| P2 | AI Semantic Extraction | F1287–F1294 | 45 min | ScreenSemanticsIR with evidence maps for test screens |
| P3 | Graph Index + Vector Embedding | F1295–F1309 | 45 min | UI graph built + kNN embeddings indexed |
| P4 | Module Mapping + BFA Validation | F1310–F1316 | 45 min | Module candidates + wiring plan for test file |
| P5 | System Type + Gap Completion | F1317–F1328 | 30 min | Gap report generated for test file |
| P6 | Learning Loop + Quality Gates | F1329–F1338 | 30 min | Correction stored; benchmark running |
| P7 | Integration + Promotion Validation | All | 30 min | All 26 stress tests passing; GENERATED→INJECTED promotion |

---

## PHASE P0 — FOUNDATION + RATE LIMIT INFRASTRUCTURE
**Duration: 30 minutes**
**Factories: F1271–F1278 (Family 191)**

### Objective
Stand up all Figma ingestion factories with rate-limit protection. No AI calls yet.

### Steps

**P0-1: Elasticsearch Index Creation (10 min)**
Create all FLOW-31 ES indices with mappings:
- figma_ingestion_cache (F1271): tenant + fileKey, TTL-enabled
- figma_plugin_events (F1272): tenant + fileKey, Redis Streams consumer group
- figma_node_tree (F1273): tenant + fileKey, nested dict[str, Any]
- figma_image_cache (F1274): tenant + fileKey, includes expiresAt field
- figma_component_catalog (F1275): tenant (prefix "figma31_component_catalog")
- design_token_map (F1276): tenant + fileKey
- figma_version_history (F1277): tenant + fileKey, immutable snapshot per version
- rate_limit_buckets (F1278): tenant, Redis token bucket config

**Validation:** `GET /_cat/indices/figma31*` returns all 8 indices.

**P0-2: Rate Limit Guard Activation (10 min)**
Configure F1278 (IFigmaRateLimitGuardService):
- Token buckets: editor tier = 60/min, viewer tier = 30/min
- Bucket scope: per (tenantId, apiKeyTier)
- Redis key pattern: "figma31::ratelimit::{tenantId}::{tier}"
- Backoff: exponential, max 3 retries, then DLQ event

**Validation:** Simulate 65 API token requests from same tenant in 1 minute.
Expected: 60 succeed immediately, 5 queued/retried. No 429 propagated to caller.

**P0-3: Version Check Flow (10 min)**
Activate F1277 (IFigmaVersionManagerService):
- GET /files/{key} fetched once → version stored in figma_version_history
- Second call: version comparison → cache hit → no API call

**Validation:** Same fileKey submitted twice. Assert API call count = 1.

**Save Point:** `SESSION_STATE.phases.P0 = COMPLETE`. All ingestion indices active, rate limit operational.

---

## PHASE P1 — DESIGNIR PROCESSING PIPELINE
**Duration: 45 minutes**
**Factories: F1279–F1286 (Family 192)**

### Objective
Transform raw Figma JSON (from P0) into structured DesignIR stored in Elasticsearch.
All processing is DETERMINISTIC — no AI calls in this phase.

### Steps

**P1-1: Node Tree Processing (15 min)**
Activate F1273 (IFigmaNodeParserService) + F1275 (IFigmaComponentCatalogService):
- Parse raw Figma JSON → dict[str, Any] node tree
- Resolve all INSTANCE nodes → main component IDs via component catalog
- Extract all TEXT layer content with nodeId tags
- Validate: no typed model classes (DNA-1); all nodes have nodeId + type + parentId + frameId

**Validation:** Feed 10-screen test file. Assert:
- All screens have ≥1 node in node tree
- All INSTANCE nodes have resolved main_component_id
- Zero typed NodeModel classes in codebase (AF-7 gate)

**P1-2: DesignIR Feature Extraction (15 min)**
Activate F1279–F1284:
- F1279: DesignIR compiler — produces per-screen IR with all subcomponents
- F1280: UI controls detector — list/grid/table/tabs/modal/sidebar/nav-bar/input/button/badge
- F1281: Layout semantics — infer layout primitive per screen
- F1282: Component signatures — compute (componentId → instanceCount) map per screen
- F1283: Screen fingerprints — hash component composition for change detection
- F1284: Interaction semantics — classify prototype reactions as action types

**Validation:** For test file, every screen has:
- ≥1 layout primitive (or tagged "indeterminate")
- component_signature (even if empty for screens with no components)
- fingerprint_hash (deterministic — same input = same hash)

**P1-3: DesignIR Assembly + Validation Gate (15 min)**
Activate F1285 (IDesignIRAssemblerService) + F1286 (IDesignIRValidatorService):
- Assemble all screen-level artifacts into file-level DesignIR document
- Validate: screens[], components[], designTokens, screenMap, prototypeLinks all present
- Store in design_ir index with tenantId + fileKey + version

**Validation:** DesignIR document query returns complete document with all required fields.
T497 validation gate passes for well-formed test file; rejects intentionally incomplete test file.

**Save Point:** `SESSION_STATE.phases.P1 = COMPLETE`. DesignIR flowing end-to-end.

---

## PHASE P2 — AI SEMANTIC EXTRACTION
**Duration: 45 minutes**
**Factories: F1287–F1294 (Family 193)**

### Objective
For each screen, run multimodal AI analysis → produce ScreenSemanticsIR with evidence maps.
This is the first phase with AI ENGINE FABRIC calls.

### Steps

**P2-1: Prompt Template Library (10 min)**
Activate F1288 (IPromptTemplateLibraryService):
- Load prompt templates for: archetype classification, entity extraction, action pattern detection
- Each template includes: strict JSON output schema, evidence requirement instructions,
  multimodal input format (node tree excerpt + image URL)
- Store templates in RAG FABRIC for AF-3 retrieval

**Validation:** AF-3 (Prompt Library) retrieves correct template for "archetype_classification" task.

**P2-2: Multimodal Semantic Extraction (20 min)**
Activate F1287 (IMultimodalPromptOrchestratorService) + F1289–F1293:
- For each screen: check imageUrl from F1274 (re-render if expired — CF-660)
- Check screen height ≥500px → multimodal mode required (CF-672)
- Call IAiProvider.GenerateAsync() with: system prompt + node tree + image URL
- Parse response → ScreenSemanticsIR (dict[str, Any], never typed)
- Validate schema completeness: screen_archetype, ui_controls[], user_actions[], data_entities[], evidence[]

**Parallelism:** max 10 screens concurrent per tenant. allSettled pattern (DR-235).

**P2-3: Evidence Coverage Gate + Semantic Validation (15 min)**
Activate F1294 (ISemanticIRValidatorService) + F1334 (pre-wire):
- Evidence coverage gate: every module/action/entity claim must have ≥1 evidence item
- Archetype claims require ≥3 evidence items (DR-232)
- Confidence floor: any archetype with max confidence < 0.4 → UNCLASSIFIED (CF-671)
- Schema validation: AF-9 validates required fields before downstream use

**Validation:** 
- Intentionally-hallucinated claim (no nodeId/text evidence) → EVIDENCE_COVERAGE_GATE_FAIL ✅
- Low-confidence screen → UNCLASSIFIED (not forced-classified) ✅
- Complete valid screen → EMIT:semantics.extracted ✅

**Save Point:** `SESSION_STATE.phases.P2 = COMPLETE`. ScreenSemanticsIR with evidence maps operational.

---

## PHASE P3 — GRAPH INDEX + VECTOR EMBEDDING
**Duration: 45 minutes**
**Factories: F1295–F1309 (Families 157–158)**

### Objective
Build UI graph (screens as nodes, prototype links as edges) and generate vector embeddings.
Enables GraphRAG + vector similarity retrieval for module mapping.

### Steps

**P3-1: UI Graph Construction (15 min)**
Activate F1295 (IUIGraphNodeBuilderService) + F1296 (IUIGraphEdgeBuilderService):
- Screens → graph nodes (tenantId + fileKey scoped)
- Prototype links + semantic relations → graph edges
- Distributed lock: "{tenantId}::{fileKey}::graph-build" (CF-682)
- Orphan node check: screens with no edges → NAVIGATION_ISOLATION flag (CF-677)

**Validation:** Graph built for test file. Assert: no duplicate nodes/edges; concurrent run test shows lock working.

**P3-2: Module Signature + System Type Graph Enrichment (15 min)**
Activate F1297–F1301:
- F1297: Navigation flow extractor — extract multi-step flows from graph (browse→detail→checkout)
- F1298: Module signature graph — overlay module candidate signals as graph annotations
- F1299: System type graph — READ-ONLY query against global system-type ontology (CF-681)
- F1300: Navigation flow index — store detected flows in navigation_flows index
- F1301: Module dependency graph — READ-ONLY query (CF-681)

**GraphRAG Retrieval (F1302, F1303):**
- F1302: GraphRAG retrieval — query graph for module dependency constraints + similar patterns
- Tenant isolation: project graphs filtered by tenantId; ontology graphs are global read-only
- F1303: Navigation pattern matching — compare project flows against canonical flow patterns

**P3-3: Vector Embedding Generation + kNN Indexing (15 min)**
Activate F1304–F1309:
- F1304: Screen embeddings — embed per-screen ScreenSemanticsIR summary (3072-dim)
- F1305: Component embeddings — embed component signatures for cross-project similarity
- F1306: Archetype embeddings — embed screen archetypes for canonical archetype retrieval
- Index type: kNN with HNSW, similarity: cosine, pre-filter: tenantId
- F1307: Screen similarity search — kNN query, k=10, score floor 0.6 (CF-680)
- F1308: Component composition search — find screens with similar component patterns
- F1309: Archetype retrieval — retrieve canonical archetype examples for prompt injection

**Validation:** 
- Global write attempt to system_type_graph → rejected 403 ✅
- Cross-tenant graph query returns zero results ✅
- kNN search returns correct k=10 neighbors with cosine score ✅

**Save Point:** `SESSION_STATE.phases.P3 = COMPLETE`. Graph built + kNN embeddings indexed.

---

## PHASE P4 — MODULE MAPPING + BFA VALIDATION
**Duration: 45 minutes**
**Factories: F1310–F1316 (Family 196)**

### Objective
Map each screen to Genie DNA modules. Check against BFA for cross-flow conflicts.
Produce fabric-first wiring plan and config document requirements.

### Steps

**P4-1: Module Matrix Loading (10 min)**
Activate F1310 (IModuleMatrixLoaderService):
- Load module matrix from Elasticsearch (from module-architecture docs)
- Cache in Redis with 1-hour TTL (DR-231)
- Version tracking: if matrix version changes → invalidate all project mappings (CF-683)

**Matrix Contents:** 20 modules × 15 system types. Per-cell: enabled/typical_behaviors/config_knobs.

**P4-2: Module Candidate Resolution (20 min)**
Activate F1311 (IModuleCandidateResolverService) + F1312 (IConfidenceScoringService):
- Per screen: merge signals from GraphRAG (F1302) + vector similarity (F1307) + DesignIR features
- Compute evidence-based confidence (not LLM self-rating) — formula from DD-310
- Rank candidates; apply confidence floor (0.4 minimum to count as candidate)
- BFA cross-flow check: F1313 (IConstraintCheckExecutorService) queries BFA entity registry
  for conflicts with FLOW-16 Product, FLOW-17 JobPosting, etc. (CF-675)

**P4-3: Wiring Plan + Config Doc Requirements (15 min)**
Activate F1314 (IModuleWiringPlanService) + F1315 (IConfigDocumentRequirementsService):
- Wiring plan: NEVER hardcode system type strings — always produce config doc references (CF-686)
- Config doc requirements: for each required module, specify which Genie DNA config docs needed
  (view_definitions, detail_definitions, form_definitions, cart_rules, etc.)
- Reference canonical schema from module-architecture registry (CF-687)

**Module Mapping Validation Gate (F1316 + F1336 + F1337):**
- F1316: Module validation log — record validation result per screen
- F1336: Dependency constraint gate — Cart without Checkout = DEPENDENCY_VIOLATION → gap (CF-685)
- F1337: Genie DNA module gate — no hardcoded site-type values in wiring plan (CF-686)

**Validation:**
- Hardcoded "system_type = 'shop'" in wiring plan → AF-7 detects + blocks ✅
- Module candidate with 0 evidence → rejected by evidence gate ✅
- FLOW-16 entity collision → BFA_CONFLICT result ✅

**Save Point:** `SESSION_STATE.phases.P4 = COMPLETE`. Module candidates + wiring plan for test file.

---

## PHASE P5 — SYSTEM TYPE INFERENCE + GAP COMPLETION
**Duration: 30 minutes**
**Factories: F1317–F1328 (Families 160–161)**

### Objective
Infer system type (shop / social / hotel / etc.) from aggregate module evidence.
Detect missing modules, screens, and flows. Generate gap report.

### Steps

**P5-1: System Type Inference (15 min)**
Activate F1317–F1322:
- F1317: System type inference — aggregate module evidence across all screens
- F1318: Module evidence aggregator — count + weight module signals per system type
- F1319: Site type signature matcher — compare evidence to system type signatures (global ontology)
- F1320: System type confidence calculator — compute per-candidate confidence
- Minimum 3 classified screens required (CF-684); else INSUFFICIENT_DATA
- Ambiguity check: top-2 candidates within 0.1 confidence → PAUSE for user selection (CF-689)
- F1321: System type ranker — final ranking with ambiguity detection
- F1322: SystemModelIR assembler — compile full SystemModelIR with all screen mappings + evidence

**P5-2: Gap Completion (15 min)**
Activate F1323–F1328:
- F1323: Gap detector — compare inferred modules against module matrix requirements for system type
- F1324: Missing module resolver — for each gap, identify specific missing module + config docs needed
- F1325: Missing screen detector — detect missing screens (Cart exists but no Cart Empty State)
- F1326: Flow gap analyzer — detect broken navigation flows (dead-end paths in UI graph)
- F1327: Gap report builder — compile unified gap report with priorities
- F1328: Stub generation orchestrator — auto-generate DNA-compliant stubs for CRITICAL gaps only (CF-690)

Judge gate (F1338 — pre-wire): evidence → consistency → dependency → DNA gates all run before gap report finalized.

**Validation:**
- 3-screen shop file: correctly identifies system_type=store with confidence >0.7 ✅
- Cart + Product without Checkout: DEPENDENCY_VIOLATION gap = CRITICAL in gap report ✅
- 1-screen file: INSUFFICIENT_DATA (not guessed) ✅
- Ambiguous confidence (social 0.71 vs marketplace 0.68): PAUSE for user input ✅

**Save Point:** `SESSION_STATE.phases.P5 = COMPLETE`. Gap report generated for test file.

---

## PHASE P6 — LEARNING LOOP + ALL QUALITY GATES
**Duration: 30 minutes**
**Factories: F1329–F1338 (Family 199)**

### Objective
Activate feedback correction pipeline and learning loop. Wire all 4 quality gates (F1334–F1338).

### Steps

**P6-1: Feedback Correction Pipeline (10 min)**
Activate F1329–F1331:
- F1329: Feedback correction store — validate audit fields (screenId, before, after, reason, userId, tenantId, timestamp)
  Reject if any field missing (CF-692)
- F1330: Negative exemplar injector — inject corrected mappings as anti-examples into RAG corpus
- F1331: Positive exemplar injector — inject confirmed-correct mappings as positive examples

Consumer group: "figma31-{tenantId}-learning" (separate from analysis pipeline — DR-236)

**P6-2: Benchmark + Learning Loop (10 min)**
Activate F1332–F1333:
- F1332: Label benchmark manager — maintain labeled benchmark set; run accuracy/precision/recall evaluation
- F1333: Learning loop orchestrator — benchmark FIRST, then exemplar injection (CF-691)
  Accuracy drop > 5% → HUMAN_REVIEW_REQUIRED + rollback (CF-693)
- F1312 (confidence scoring): updated with learning cycle results

**P6-3: Quality Gate Wiring (10 min)**
Wire all 4 gates in judgment pipeline (F1338 — IJudgeOrchestrator31Service):
- Gate 1: F1334 (evidence coverage) — every claim has ≥1 evidence item
- Gate 2: F1335 (cross-screen consistency) — entity naming consistent across screens
- Gate 3: F1336 (module dependency constraint) — dependency violations flagged
- Gate 4: F1337 (Genie DNA module gate) — no hardcoded values in wiring plan

Gate sequence: G1 → G2 → G3 → G4. Any CRITICAL failure → build stopped.
Verdict aggregation → promote (GENERATED) or block.

**Validation:**
- Correction missing "reason" field → REJECT ✅
- Benchmark run shows 7% accuracy drop → HUMAN_REVIEW_REQUIRED ✅
- All 4 gates fire correctly on intentional violations ✅
- Benchmark-first sequence enforced (no injection before benchmark completes) ✅

**Save Point:** `SESSION_STATE.phases.P6 = COMPLETE`. All quality gates wired; learning loop active.

---

## PHASE P7 — INTEGRATION + PROMOTION VALIDATION
**Duration: 30 minutes**
**All Factories**

### Objective
Run all 26 stress tests (ST-405–ST-430). Validate end-to-end pipeline on 3 test files.
Promote from GENERATED to INJECTED if all gates pass.

### Steps

**P7-1: Full Pipeline Integration Test (10 min)**
End-to-end run on 3 test Figma files:
1. e-commerce file (3 screens: ProductGrid, ProductDetail, Checkout)
   Expected: system_type=store, Invoices gap detected, confidence >0.85
2. social file (5 screens: Feed, Profile, Post, Chat, Notifications)
   Expected: system_type=social, all core modules detected
3. Ambiguous file (mixed signals — could be marketplace or social)
   Expected: AMBIGUOUS_SYSTEM_TYPE → user pause

**P7-2: Stress Test Execution (15 min)**
Run all 26 stress tests (ST-405–ST-430). Required: 26/26 PASS.
Critical stress tests:
- ST-407 (cross-tenant isolation) — CRITICAL
- ST-411 (hallucination evidence gate) — CRITICAL
- ST-418 (concurrent graph build) — CRITICAL
- ST-428 (accuracy drop human gate) — CRITICAL
- ST-430 (global graph write prevention) — CRITICAL

**P7-3: Promotion Gate (5 min)**
Promotion: GENERATED → INJECTED
Criteria:
- 26/26 stress tests PASS ✅
- CF-652–CF-693: all 42 BFA rules green ✅
- 3 test files processed correctly ✅
- Backward compatibility: T1–T488, F1–F1270 unchanged ✅

**Save Point:** `SESSION_STATE.phases.P7 = COMPLETE`. FLOW-31 promoted to INJECTED.

---

## BACKWARD COMPATIBILITY STATEMENT

All prior artifacts UNCHANGED:
- Task Types T1–T488: ✅ UNCHANGED
- Factories F1–F1270: ✅ UNCHANGED  
- Families 1–153: ✅ UNCHANGED
- Templates 1–82: ✅ UNCHANGED
- BFA Rules CF-1–CF-651: ✅ UNCHANGED
- Stress Tests ST-1–ST-404: ✅ UNCHANGED
- Skills SK-1–SK-314: ✅ UNCHANGED
- Design Decisions DD-1–DD-302: ✅ UNCHANGED
- Design Records DR-1–DR-225: ✅ UNCHANGED

FLOW-31 ADDS ONLY: F1271–F1338, T489–T515, Templates 108–115, CF-652–CF-693, ST-405–ST-430,
                    SK-315–SK-329, DD-303–DD-322, DR-226–DR-239

---

## DEPENDENCY MAP

```
P0 (Ingestion) 
  ↓
P1 (DesignIR)
  ↓
P2 (AI Semantics)  ──────────────┐
  ↓                               │
P3 (Graph + Vectors) ◄────────────┘
  ↓
P4 (Module Mapping + BFA)
  ↓
P5 (System Type + Gap)
  ↓
P6 (Learning Loop + Gates)
  ↓
P7 (Integration + Promotion)
```

P2 and P3 share triggers (both fire after P1 complete). P4 waits for BOTH P2 and P3 (EVENT:graph.built AND EVENT:embeddings.ready per Template: 113).


---

## BACKWARD COMPATIBILITY STATEMENT

All previously defined artifacts are unchanged. FLOW-31 is additive only.
-e 

---

# ═══════════════════════════════════════════════════════
# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE
# Added: 2026-03-03
# ═══════════════════════════════════════════════════════

# FLOW-32: SHARABLE FLOWS & RAG TEMPLATE MARKETPLACE — MASTER EXECUTION PLAN
## Date: 2026-03-03
## Extends: MASTER_EXECUTION_PLAN_MERGED.md

---

## EXECUTION PHASES (4 Weeks)

### P0 — FOUNDATION (Week 1, Days 1-5)
**Goal:** Template package registry, manifest validation, signing pipeline

**Tasks:**
- Family 200 (F1339-F1347): Template Package Registry
  - Implement ITemplatePackageRegistryService on DATABASE FABRIC
  - Immutable versioning with semver enforcement
  - Content-addressable artifact storage
- Family 210 (F1416-F1418): Supply Chain Security
  - Implement ITemplateArtifactSigningService
  - SBOM generation, cosign signatures, SLSA attestation
- Task Types: T516 (Publish Gate), T517 (Manifest Validation), T518 (Signing)
- Skills: SK-330 (TemplatePackaging), SK-331 (ManifestValidation), SK-342 (SupplyChain)
- BFA Rules: CF-715, CF-718, CF-719
- Stress Tests: ST-431–ST-435 (publish pipeline safety)

**DNA Checkpoints:**
- All package documents: dict[str, Any] (DNA-1)
- All methods: DataProcessResult[T] (DNA-3)
- All documents: tenantId required (DNA-5)
- Published versions: immutable (IRON RULE)

**Exit Criteria:**
- Template can be created, validated, signed, stored
- Secret detection blocks packages with credentials (ST-431)
- Invalid manifest rejected (ST-432, ST-433)
- Unsigned artifacts cannot publish (ST-434)

---

### P1 — MARKETPLACE & DISCOVERY (Week 1-2, Days 4-8)
**Goal:** Marketplace listing, search, visibility, sanitizer/DLP

**Tasks:**
- Family 201 (F1348-F1355): Template Sanitizer & DLP Scanner
  - AI ENGINE FABRIC for deep PII/secret detection
  - Export allowlist enforcement
- Family 202 (F1356-F1364): Marketplace Listing & Discovery
  - Full-text search with faceted filtering
  - Quality score composite ranking
  - Visibility enforcement (public/unlisted/private)
- Task Types: T519 (Marketplace Listing), T520 (Discovery & Search)
- Skills: SK-332 (MarketplaceDiscovery)
- BFA Rules: CF-716, CF-720, CF-721, CF-722
- Stress Tests: ST-436 (PII detection)

**DNA Checkpoints:**
- build_search_filter auto-skips empty facets (DNA-2)
- DynamicController routes by entity type (DNA-6)
- Private templates never in public results (IRON RULE)

**Exit Criteria:**
- Templates listed on marketplace with categories
- Search returns filtered, ranked results
- Visibility rules enforced (private not in public)
- PII detection blocks templates with hardcoded personal data

---

### P2 — INSTALLATION & BINDING (Week 2, Days 6-10)
**Goal:** Three install modes, dependency resolution, connector rebinding, metering

**Tasks:**
- Family 203 (F1365-F1373): Template Installation & Binding
  - Snapshot / Linked / Fork install modes
  - Dependency resolution and blocking
  - Connector rebinding wizard with secret_ref indirection
- Family 206 (F1390-F1397): Affiliate & Revenue Share
  - Metering event emission on install/execute
  - Usage aggregation and settlement
- Task Types: T521 (Deps), T522 (Install), T523 (Bind), T531 (Meter), T532 (Settle)
- Skills: SK-333 (DependencyResolution), SK-334 (InstallModes), SK-335 (ConnectorRebinding), SK-338 (Metering)
- BFA Rules: CF-723, CF-724, CF-725, CF-726, CF-734
- Stress Tests: ST-437–ST-443 (installation safety), ST-451 (float-billing)

**DNA Checkpoints:**
- Installed assets carry consumer's tenantId ONLY (DNA-5)
- Metering with bounded dimensions (max 10, DNA-2 inspired)
- Idempotency on settlement (DNA-7)
- Outbox pattern for metering events (DNA-8)

**Exit Criteria:**
- Templates install in all 3 modes with correct data isolation (ST-437)
- Linked mode pins version (ST-438)
- Missing dependencies block install (ST-439)
- Type mismatch in connector binding rejected (ST-440)
- No secret values in binding docs (ST-441)
- BFA conflict blocks conflicting install (ST-442)
- Metering events fire with both tenant IDs (ST-443)
- Settlement idempotency prevents float-billing (ST-451)

---

### P3 — UPGRADE, RAG & SAFETY (Week 3, Days 11-15)
**Goal:** Version upgrade pipeline, RAG blueprints, BFA revalidation, rollback

**Tasks:**
- Family 204 (F1374-F1381): Version Upgrade & Migration
  - Upgrade detection for linked installations
  - Diff engine and atomic migration
  - BFA revalidation post-upgrade
  - Rollback gate
- Family 205 (F1382-F1389): RAG Blueprint Packaging
  - Blueprint export (strategy, not data)
  - Validation and installation
- Task Types: T524-T530 (upgrade pipeline + RAG blueprint)
- Skills: SK-336 (VersionMigration), SK-337 (RagBlueprint), SK-344 (UpgradePolicy), SK-345 (BFARevalidation)
- BFA Rules: CF-727, CF-728, CF-729, CF-730, CF-731, CF-732, CF-733
- Stress Tests: ST-444–ST-450 (upgrade + RAG safety)

**DNA Checkpoints:**
- Atomic migration — all-or-nothing (DNA-3 for failure handling)
- Consumer FREEDOM preserved during migration
- RAG blueprint = structure only, never data
- Forced security patches override preferences (IRON RULE)

**Exit Criteria:**
- Forced security patches bypass consumer policy (ST-444)
- Failed migration fully rolls back (ST-445)
- Consumer FREEDOM values preserved on upgrade (ST-446)
- BFA revalidation covers all consumer flows (ST-447)
- Rollback restores exact pre-upgrade state (ST-448)
- RAG blueprint contains zero data content (ST-449)
- RAG install preserves consumer's existing data (ST-450)

---

### P4 — ANALYTICS, FRAUD & SANDBOX (Week 4, Days 16-20)
**Goal:** Quality scoring, fraud detection, sandbox testing, data packs

**Tasks:**
- Family 207 (F1398-F1404): Template Analytics & Quality
  - Quality score computation (bounded metrics)
  - Fraud detection with AI similarity
- Family 208 (F1405-F1410): Template Sandbox & Testing
  - Isolated sandbox with synthetic data
  - Stubbed connectors, network restrictions
  - Auto-destruction
- Family 209 (F1411-F1415): Data Pack Export & Import
  - Optional data sharing with PII scanning
  - Provenance tracking
- Task Types: T533-T535 (analytics + fraud + sandbox)
- Skills: SK-339 (QualityScore), SK-340 (FraudDetection), SK-341 (SandboxExecution), SK-343 (DataPackExport)
- BFA Rules: CF-735, CF-736, CF-737, CF-738
- Stress Tests: ST-452–ST-454 (sandbox + fraud safety)

**DNA Checkpoints:**
- Metrics per-package, never per-user (bounded cardinality)
- Human review required for fraud action (DNA-9 evidence-based)
- Sandbox uses synthetic tenantId (DNA-5)
- Evidence trail for all fraud signals

**Exit Criteria:**
- Sandbox cannot access production (ST-452)
- Self-install fraud loop detected (ST-453)
- No false-positive auto-suspension (ST-454)
- Quality scores bounded [0.0, 1.0]
- Data pack PII scanning works

---

## RESOURCE REQUIREMENTS

| Resource | Quantity | Notes |
|----------|---------|-------|
| AF-1 Genesis cycles | 80 | One per factory interface |
| AF-4 RAG searches | 20 | One per task type (SK lookup) |
| AF-5 Multi-model runs | 3 | T525 migration, T534 fraud, T518 signing |
| AF-9 Judge validations | 20 | One per task type |
| BFA conflict scans | 24 | One per CF rule |
| Stress test executions | 24 | One per ST |

---

## PROMOTION LADDER

| Phase | Status |
|-------|--------|
| P0-P4 Generated | GENERATED (engine outputs code) |
| After ST passes | INJECTED (code injected into test environment) |
| After integration test | MINIMAL (running with minimal traffic) |
| After production bake | CORE (full production) |

---

## BACKWARD COMPATIBILITY STATEMENT
All existing flows (FLOW-01 through FLOW-31) and their execution plans are UNCHANGED.
FLOW-32 execution plan is additive only.
$

# ════════════════════════════════════════════════════════════
# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
# Added: 2026-03-03 | Post FLOW-32 state
# ════════════════════════════════════════════════════════════

# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
## MASTER EXECUTION PLAN

**FLOW Reference:** FLOW-33  
**Domain:** System Initiation — Platform Bootstrap + Implement-Family Meta-Engine  
**Status:** EXECUTION PLAN COMPLETE  
**Artifact Scope:** F1419-F1428, T536-T542, SK-346-SK-354, CF-739-CF-750, ST-455-ST-462  

---

## STRATEGIC OBJECTIVE

FLOW-33 extends the XIIGen engine to support a **self-building bootstrap capability**: the engine can now install itself from a plan bundle, seed its own GraphRAG catalog, then autonomously implement family-by-family using a 5-arbiter consensus loop. This closes the loop from "engine that generates flows" to "engine that generates its own components."

---

## PHASE MAP OVERVIEW

```
P0: Foundation Research & Gap Analysis (RAG setup)
P1: Factory Registry Extension (F1419-F1428, Families 211-212)
P2: Engine Contracts / Task Types (T536-T542, Templates 120-125)
P3: Skills & RAG Patterns (SK-346-SK-354)
P4: BFA Rules & Stress Tests (CF-739-CF-750, ST-455-ST-462)
P5: Cross-Reference & Indexes (UNIFIED_SOURCE_INDEX, SESSION_STATE)
```

Each phase targets 20-40 minutes. Save state checkpoints are embedded in each phase.

---

## PHASE P0 — FOUNDATION RESEARCH & GAP ANALYSIS

**Duration:** 20 min  
**Goal:** Understand what the 33-* source documents describe; map to existing engine artifacts.

### Input Documents
- `33-system initiation.md` — vision: self-bootstrapping meta-engine
- `33-system initiation deep research 2.md` — bootstrap state machine details
- `33-system initiation deep research 3.md` — plan bundle format, oracle validation
- `33-system initiation deep research 4.md` — GraphRAG seeding protocol
- `33-system initiation deep research 5.md` — implement-family loop design
- `33-system initiation deep research 6.md` — 5-arbiter consensus mechanism
- `33-system initiation deep research 7.md` — regression impact analysis
- `33-system initiation deep research 8.md` — ContextPack assembly + prompt evolution

### Gap Analysis vs Existing System (Post FLOW-32)
| Capability | Prior State | FLOW-33 Adds |
|------------|-------------|--------------|
| Bootstrap sentinel | None | F1419:IBootstrapService (7-phase state machine) |
| Plan bundle import | None | F1420:IPlanBundleImportService + oracle validation |
| Implementation tracking | None | F1421:IImplementationRegistryService |
| GraphRAG seeding | Partial (F65 graph) | F1423:IGraphRAGSeedService (two-layer protocol) |
| Implement-family loop | Manual | F1424:IImplementFamilyOrchestrator |
| Multi-arbiter consensus | AiDispatcher (general) | F1425:IMultiArbiterService (5-arbiter domain-specific) |
| ContextPack assembly | Ad-hoc RAG calls | F1426:IContextPackService (TTL-managed packs) |
| Regression impact | None | F1427:IRegressionImpactService (graph traversal) |
| Prompt evolution | AF-11 feedback (general) | F1428:IPromptEvolutionService (prompt-specific) |

### P0 Save State
```yaml
P0_CHECKPOINT:
  status: COMPLETE
  gap_analysis: done
  existing_system: F1-F1418, T1-T535, SK-1-SK-345, CF-1-CF-738
  new_factories_identified: F1419-F1428 (10 factories, 2 new families)
  next_phase: P1
```

---

## PHASE P1 — FACTORY REGISTRY EXTENSION

**Duration:** 30 min  
**Output:** `33-system initiation ENGINE_ARCHITECTURE.md`

### Family 211 — Platform Bootstrap Fabric (F1419-F1423)

**F1419 — IBootstrapService**
- Fabric: DATABASE FABRIC (ES sentinel) + QUEUE FABRIC (Redis Streams)
- Implements 7-phase bootstrap state machine
- Idempotent: reads sentinel before executing any phase
- Phases: INIT → SCHEMAS_REGISTERED → BUNDLE_IMPORTED → REGISTRIES_COMPILED → GRAPH_SEEDED → SMOKE_TESTED → COMPLETE

**F1420 — IPlanBundleImportService**
- Fabric: DATABASE FABRIC (ES) + RAG FABRIC (Vector)
- Validates uploaded plan bundle against oracle (F1-F1418 ranges)
- Atomic compilation: all-or-nothing via ES bulk transaction
- Methods: ValidatePlanBundle, CompileRegistry, RollbackRegistry

**F1421 — IImplementationRegistryService**
- Fabric: DATABASE FABRIC (PG + ES)
- Tracks per-family implementation status: NOT_STARTED → IN_PROGRESS → PROMOTED → VERIFIED
- Provides idempotency lock: prevents duplicate family execution
- Scope: tenantId + familyId composite key

**F1422 — IFamilySkillPackService**
- Fabric: RAG FABRIC (Hybrid) + DATABASE FABRIC (ES)
- Assembles skill packs per family from existing SK-1-SK-354
- Provides structured ContextPacks to implement-family loop

**F1423 — IGraphRAGSeedService**
- Fabric: DATABASE FABRIC (Neo4j/GraphAI via F65) + RAG FABRIC (Graph strategy)
- Layer 1: seed concept graph (factory→family→task type relationships)
- Layer 2: embed skill nodes into vector space with graph edges
- Validates Layer 1 complete before starting Layer 2

### Family 212 — Implement-Family Meta-Engine (F1424-F1428)

**F1424 — IImplementFamilyOrchestrator**
- Fabric: FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) + AI ENGINE FABRIC (SK-386 (AiDispatcher))
- Reads ImplementationRegistry → finds next NOT_STARTED family
- Assembles ContextPack via F1426, calls 5-arbiter loop (F1425)
- On consensus: triggers promotion pipeline via F1421

**F1425 — IMultiArbiterService**
- Fabric: AI ENGINE FABRIC (SK-386 (AiDispatcher) — AiDispatcher)
- 5 specialized arbiters run in parallel via AiDispatcher
- Arbiters: Architecture, Security, DNA Compliance, Business Logic, Integration
- Consensus: ≥4/5 required for promotion; <3/5 = rejection with feedback loop

**F1426 — IContextPackService**
- Fabric: RAG FABRIC (Hybrid — SK-389 (HybridRagStrategy))
- Assembles context: family spec + related skills + BFA rules + prior implementations
- TTL: 4 hours. Arbiters reject packs older than TTL.
- Invalidated on: new family completion, BFA rule update, skill addition

**F1427 — IRegressionImpactService**
- Fabric: DATABASE FABRIC (ES graph index) + AI ENGINE FABRIC
- Graph traversal: finds all families downstream of changed factory
- Returns blast radius: list of affected T-types and SK patterns
- Must complete before any promotion gate (CF-746)

**F1428 — IPromptEvolutionService**
- Fabric: AI ENGINE FABRIC + DATABASE FABRIC (ES feedback index)
- Stores arbiter feedback → extracts patterns → improves future prompt packs
- Never applies evolved prompts to in-flight sessions (CF-750)
- Links to AF-11 (Feedback station) for quality tracking

### P1 Save State
```yaml
P1_CHECKPOINT:
  status: COMPLETE
  output_file: "33-system initiation ENGINE_ARCHITECTURE.md"
  factories: F1419-F1428
  families: 211-212
  next_phase: P2
```

---

## PHASE P2 — ENGINE CONTRACTS / TASK TYPES

**Duration:** 35 min  
**Output:** `33-system initiation TASK_TYPES_CATALOG.md`

### T536 — Platform Bootstrap Orchestration (Template 120)
- Archetype: ORCHESTRATION
- Entry: `PlatformBootRequested` or missing/outdated bootstrap sentinel
- DAG nodes: check_sentinel → register_core_schemas → import_plan_bundle → compile_registries → seed_graph_rag → run_smoke_test → set_bootstrap_complete
- Key dependency ordering enforced by CF-739, CF-740, CF-741
- Iron Rules: sentinel must precede BootstrapCompleted; schemas must precede events

### T537 — GraphRAG Two-Layer Seeding (Template 121)
- Archetype: DATA_PIPELINE
- Entry: `RegistriesCompiled` event from T536 step 4
- Layer 1: concept graph (factory families, task type arches, skill categories)
- Layer 2: vector embeddings attached to Layer 1 nodes
- CF-743 enforces Layer 1 completion before Layer 2 starts

### T538 — Implementation Status Registry (Template 122)
- Archetype: STATE_MACHINE
- Entry: Queried by T539 before each family loop iteration
- States: NOT_STARTED → IN_PROGRESS → PROMOTED → VERIFIED → FAILED
- Provides idempotency lock preventing duplicate family execution

### T539 — Implement-Family Meta-Loop (Template 123)
- Archetype: AI_GENERATION_LOOP
- Entry: `FamilyImplementationRequested` from F1424 orchestrator
- Loop: select_family → assemble_context_pack → run_5_arbiters → evaluate_consensus → promote_or_retry
- Max retries: 3 per family; on failure → FamilyImplementationFailed → human review queue
- AF Stations: AF-1 (Genesis), AF-5 (Multi-model), AF-9 (Judge), AF-10 (Merge), AF-11 (Feedback)

### T540 — 5-Arbiter Consensus Gate (Template 124)
- Archetype: AI_CONSENSUS
- Entry: Called as sub-task from T539 step 3
- 5 arbiters run in parallel: Architecture, Security, DNA, Business, Integration
- Quorum: ≥4/5 = APPROVED; 3/5 = NEEDS_REVISION (feedback injected); <3/5 = REJECTED
- AF Stations: AF-5 (Multi-model orchestration), AF-10 (Merge), AF-9 (Judge)

### T541 — Regression Impact Analysis (Template 125)
- Archetype: CHANGE_DETECTION
- Entry: Before any promotion gate for any family
- Graph traversal from changed node → downstream families
- Returns blast radius report; blocks promotion if impact exceeds threshold (CF-746)

### T542 — ContextPack Assembly
- Archetype: RAG_ORCHESTRATION (no template — reusable sub-task)
- Entry: Called by T539 step 2 and T540 initialization
- Assembles: family spec, related SK patterns, BFA rules, prior family implementations
- TTL validation via CF-747; stale packs rejected before arbiter call

### P2 Save State
```yaml
P2_CHECKPOINT:
  status: COMPLETE
  output_file: "33-system initiation TASK_TYPES_CATALOG.md"
  task_types: T536-T542
  templates: 50-55
  next_phase: P3
```

---

## PHASE P3 — SKILLS & RAG PATTERNS

**Duration:** 25 min  
**Output:** `33-system initiation SKILLS_FACTORY_RAG.md`

### Skill Summary
| Skill | Pattern | Reuse Target |
|-------|---------|--------------|
| SK-346 | Idempotent Bootstrap: read sentinel → gate → advance → write sentinel | All future bootstrap extensions |
| SK-347 | GraphRAG Two-Layer Init: concept graph → embedding attachment | Any flow needing GraphRAG seeding |
| SK-348 | Implementation Registry: composite key, state machine, idempotency lock | Any multi-family orchestration |
| SK-349 | ContextPack Hybrid RAG: structured assembly + TTL validation | All implement-family sessions |
| SK-350 | Implement-Family Meta-Loop: select → assemble → arbitrate → promote | Core meta-engine pattern |
| SK-351 | 5-Arbiter Prompt Templates: role-specific system prompts per arbiter | Any multi-model consensus task |
| SK-352 | Regression Impact Graph: ES graph traversal for blast radius | Pre-promotion impact checks |
| SK-353 | Family Skill Pack Structure: how to package skills per family | AF-4 RAG retrieval |
| SK-354 | Prompt Pack + Feedback Loop: evolve prompts from arbiter feedback | Continuous improvement loop |

### AF Station Mapping for FLOW-33
| AF Station | Role in FLOW-33 |
|------------|-----------------|
| AF-1 Genesis | Generates service code for F1419-F1428 based on engine contracts |
| AF-2 Planning | Decomposes bootstrap into 7-phase DAG; decompose family loop into 5 steps |
| AF-3 Prompt Library | Retrieves SK-351 (5-arbiter prompts) for implement-family calls |
| AF-4 RAG | Retrieves SK-346 through SK-354; assembles ContextPacks via F1426 |
| AF-5 Multi-model | Runs 5 specialized arbiters in parallel via AiDispatcher (T540) |
| AF-6 Code Review | Reviews generated factory implementations against MicroserviceBase |
| AF-7 Compliance | Enforces all 9 DNA patterns on generated service code |
| AF-8 Security | Scans for direct provider imports, missing tenantId isolation |
| AF-9 Judge | Validates: ≥4/5 arbiter quorum, sentinel written, smoke test passing |
| AF-10 Merge | Combines 5-arbiter outputs into consensus implementation |
| AF-11 Feedback | Stores arbiter feedback into ES; F1428 reads for prompt evolution |

### P3 Save State
```yaml
P3_CHECKPOINT:
  status: COMPLETE
  output_file: "33-system initiation SKILLS_FACTORY_RAG.md"
  skills: SK-346-SK-354
  next_phase: P4
```

---

## PHASE P4 — BFA RULES & STRESS TESTS

**Duration:** 25 min  
**Output:** `33-system initiation V62_BFA_STRESS_TEST.md`

### Critical Rules (BUILD FAILURE if violated)
- CF-739: Plan bundle oracle validation must precede registry compilation
- CF-740: Bootstrap sentinel written BEFORE BootstrapCompleted event emitted
- CF-742: Registry compilation atomic — all-or-nothing
- CF-744: Family not re-executed if already PROMOTED in registry
- CF-745: 5-arbiter quorum (≥4/5) required before any code promotion
- CF-748: F1-F1418 read-only — FLOW-33 may not overwrite existing factories

### High Severity Rules
- CF-741: Schema-before-event ordering in bootstrap DAG
- CF-743: GraphRAG Layer 2 only after Layer 1 confirmed
- CF-746: Regression impact analysis must precede promotion gate
- CF-747: ContextPack TTL (4hr) enforced; stale packs rejected
- CF-749: Smoke test (T54 execution) must pass before BootstrapCompleted

### Stress Tests Summary
- ST-455: Corrupt bundle with wrong factory count range → CF-739 blocks
- ST-456: Two bootstrap processes race → CF-740 sentinel lock wins
- ST-457: Consumer validates unregistered schema → CF-741 blocks
- ST-458: Re-run implement-family on PROMOTED family → CF-744 idempotency lock
- ST-459: 2 arbiters timeout, 3 disagree → CF-745 requires retry
- ST-460: 24hr session with stale ContextPack → CF-747 TTL rejection
- ST-461: New compilation overlaps F630 → CF-748 fence blocks
- ST-462: 200-family change triggers cascade → CF-746 blast radius gate

### P4 Save State
```yaml
P4_CHECKPOINT:
  status: COMPLETE
  output_file: "33-system initiation V62_BFA_STRESS_TEST.md"
  bfa_rules: CF-739-CF-750
  stress_tests: ST-455-ST-462
  next_phase: P5
```

---

## PHASE P5 — CROSS-REFERENCE, SESSION STATE, EXECUTION PLAN

**Duration:** 20 min  
**Output:** UNIFIED_SOURCE_INDEX + SESSION_STATE + MASTER_EXECUTION_PLAN (this file)

### Deliverables
1. `33-system initiation UNIFIED_SOURCE_INDEX.md` — factory/task/skill/BFA cross-reference tables
2. `33-system initiation SESSION_STATE.md` — global registry with all artifact ranges post-FLOW-33
3. `33-system initiation MASTER_EXECUTION_PLAN.md` — this file

### P5 Save State
```yaml
P5_CHECKPOINT:
  status: COMPLETE
  all_7_files: GENERATED
  next_flow: FLOW-34
  next_numbers:
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

## POSITIVE EXAMPLE — Correct FLOW-33 Engine Extension

```
Request: Bootstrap XIIGen v2.0 on a fresh Elasticsearch cluster

1. F1419:CheckBootstrapStatus → reads sentinel → returns BOOTSTRAP_NEEDED
2. F194:RegisterSchema → registers all FLOW-33 event schemas
3. F1420:ValidatePlanBundle → oracle confirms F1-F1418/T1-T535/SK-1-SK-345
4. F1420:CompileRegistry → atomic bulk insert F1419-F1428/T536-T542 into ES
5. F1423:SeedGraphRAG → Layer 1 concept graph, Layer 2 embeddings
6. F192:RunFlow(T54) → smoke test passes
7. F1419:SetBootstrappedSentinel → sentinel written, status=committed
8. Queue.Emit(BootstrapCompleted) → all consumers now active

→ RESULT: Engine ready. All F1-F1428 available. No existing artifacts overwritten.
```

## NEGATIVE EXAMPLE — What FLOW-33 Must NOT Do

```
BAD: Skip oracle validation before registry compilation
  F1420:CompileRegistry runs immediately after bundle upload
  → CF-739 violation: registries may contain overlapping factory IDs
  → PRODUCTION RISK: F1420 might overwrite an existing F450 definition

BAD: Direct ES driver import in BootstrapService
  using Elasticsearch.Net; # ← DNA VIOLATION
  → Must use: IDatabaseService.StoreDocument() via DATABASE FABRIC
  → AF-7 Compliance scan catches this; build fails

BAD: Emit BootstrapCompleted before writing sentinel
  Queue.Emit("BootstrapCompleted"); # line 1
  ES.Index("bootstrap-sentinel"); # line 2 — too late!
  → CF-740 violation: crash between lines 1 and 2 = float bootstrap on restart

BAD: Re-implement existing family F450 as a typed model
  class MarketplacePostServiceImpl { ... } # ← typed class, DNA-1 violation
  → Must use: dict[str, Any] via parse_document
  → AF-7 blocks promotion; T540 arbiter Architecture rejects
```

---

## GENIE DNA COMPLIANCE CHECKLIST — FLOW-33

All generated services for F1419-F1428 must pass:

| DNA Pattern | Check | How Enforced |
|-------------|-------|--------------|
| DNA-1 parse_document | No typed models in generated code | AF-7, T540 Architecture Arbiter |
| DNA-2 build_search_filter | Empty field skipping in all ES queries | AF-7 compliance scan |
| DNA-3 DataProcessResult | No throw for business logic | AF-6 code review |
| DNA-4 MicroserviceBase | All 10 new factories extend MicroserviceBase | AF-7, CF-748 |
| DNA-5 Scope Isolation | tenantId on every query in F1421, F1426 | AF-8 security scan |
| DNA-6 DynamicController | No entity-specific controllers | AF-7 compliance scan |
| DNA-7 Idempotency | Bootstrap sentinel + registry atomic writes | CF-739, CF-740, CF-742 |
| DNA-8 Outbox | Phase state before event emission | CF-740 |
| DNA-9 Schema-First | Schemas registered before first event use | CF-741 |

---

## PROMOTION LADDER — FLOW-33 GENERATED CODE

```
GENERATED  → F1419-F1428 initial code from AF-1 Genesis
             (stored in ES, not yet deployed)

INJECTED   → After T540 5-arbiter consensus (≥4/5 quorum)
             + T541 regression impact analysis passes
             (code injected into service mesh)

MINIMAL    → After CF-749 smoke test passes
             + CF-740 sentinel written
             + All BFA rules green

CORE       → After 30-day stability period
             + Zero BFA violations in production
             + SK patterns extracted and promoted to SK library
```

---

## FINAL ARTIFACT SUMMARY

```
FLOW-33 COMPLETE

New Factories:      F1419-F1428 (10 factories)
New Families:       211-212 (2 families)
New Task Types:     T536-T542 (7 types)
New Templates:      50-55 (6 templates)
New BFA Rules:      CF-739-CF-750 (12 rules)
New Stress Tests:   ST-455-ST-462 (8 tests)
New Skills:         SK-346-SK-354 (9 skills)
New Design Decisions: DD-336-DD-341 (6 decisions)
New Design Records: DR-250-DR-254 (5 records)

Backward Compatibility: ALL F1-F1418, T1-T535, SK-1-SK-345,
                        CF-1-CF-738, ST-1-ST-454 UNCHANGED ✅

Next Flow Starts At:
  F641 / Family 86 / T254 / Template 56 / CF-307 / ST-172 / SK-154
```

---

# ═══════════════════════════════════════════════════════════════
# FLOW-34: SKILL MULTI-TARGET TRANSLATION — MASTER EXECUTION PLAN
# "Translate to Alternatives"
# ═══════════════════════════════════════════════════════════════

# FLOW-34 MASTER EXECUTION PLAN — Skill Multi-Target Translation
## "Translate to Alternatives"
## Save Point: FLOW34_PLAN_COMPLETE

---

## EXECUTIVE SUMMARY

**Goal:** Extend the XIIGen engine to translate any existing skill from Python/React Native into multi-stack implementations across 5 server languages (Node.js, Go, Java, Rust, PHP) and 5 client targets (ReactJS, Vue, Angular, WordPress Plugin, WordPress Theme) — without duplicating business logic.

**Strategy:** Extract Canonical Skill Spec (language-neutral truth) → variant adapters generated through existing AF pipeline → fabric-first throughout → Graph RAG for Phase B (P4) discovery.

**Key Principle (from basic prompt):**
> We are NOT writing service code. We ARE extending the ENGINE. Every generated adapter sits on existing FABRIC interfaces. No provider imports in service code. No typed models. All DNA patterns enforced.

**Starting Numbers:**
```
Factory:     F1429   (Family 213)
Task Type:   T543
BFA Rule:    CF-751
Stress Test: ST-463
Skill:       SK-355
Template:    50
DD:          DD-342
DR:          DR-255
```

**Ending Numbers (FLOW-34 complete):**
```
Factory:     F1483   (Family 222, 10 new families)
Task Type:   T564   (22 new task types)
BFA Rule:    CF-788 (38 new rules)
Stress Test: ST-497 (35 new stress tests)
Skill:       SK-378 (24 new skills)
Template:    57     (8 new templates)
DD:          DD-357 (16 new design decisions)
DR:          DR-266 (12 new design records)
```

---

## PHASES OVERVIEW

| Phase | Name | Duration | Deliverable |
|-------|------|----------|-------------|
| P0 | Canonical Foundation | 1–2 sessions | Families 213-85, T543-T545, SK-355-SK-356, CF-751-CF-755 |
| P1 | Server Language Variants | 1–2 sessions | Families 218-90-92, T546-T551, SK-357-SK-361, CF-756-CF-766 |
| P2 | Client Framework Variants | 1–2 sessions | Families 215, T552-T555, SK-362-SK-364, CF-767-CF-774 |
| P3 | WordPress Targets | 1 session | Families 216-88, T556-T558, SK-365-SK-367, CF-775-CF-782 |
| P4 | Graph RAG & Orchestration | 1 session | Families 220-93, T559-T564, SK-372-SK-378, CF-783-CF-788 |

---

## PHASE P0 — CANONICAL FOUNDATION
**Save Point: P0_COMPLETE**

### Objective
Define the Canonical Skill Spec format and register the factories and task types that extract and store this spec from existing Python/React Native skills.

### P0-1: Factory Registration
- Families 213 (F1429–F1435): Canonical Skill Store
- Families 214 (F1436–F1442): Variant Registry & Selection
- All resolve through DATABASE FABRIC (ES) or QUEUE FABRIC

### P0-2: Task Types T543–T545
- **T543** — Canonical Skill Extraction Gate: extracts behavioral contract from source skill
- **T544** — Skill Variant Descriptor Attach: adds per-target descriptors
- **T545** — Canonical Spec Conformance Seed: seeds golden test vectors

### P0-3: Skills SK-355–SK-356, SK-368–SK-370
- SK-355: Canonical Skill Spec Format (master schema)
- SK-356: Variant Descriptor Block Schema
- SK-368: CloudEvents Envelope Pattern
- SK-369: OpenAPI Canonical Contract Pattern
- SK-370: JSON Schema Payload Validator

### P0-4: BFA Rules CF-751–CF-755
- CF-751: Source lineage required (canonical must trace to source skill)
- CF-752: No duplicate canonical families (one canonical per skill ID)
- CF-753: API route isolation (canonicals cannot share DynamicController routes with other flows)
- CF-754: OpenAPI + CloudEvents + JSON Schema must all be present before variant generation allowed
- CF-755: Canonical spec version frozen before variant generation starts

### P0 Validation Gates
```
✅ F1429–F1435 resolve through DATABASE FABRIC (ES)
✅ F1436–F1442 resolve through DATABASE FABRIC + QUEUE FABRIC
✅ No factory ID conflict with F1–F630
✅ T543 has full engine contract (ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES)
✅ SK-355 CLIENT VARIANTS block mirrors LANGUAGE VARIANTS format
✅ CloudEvents required attributes: id, source, specversion, type
✅ OpenAPI 3.1 with additionalProperties:true (never fixed typed schema)
```

**Save Point P0_COMPLETE:**
```
Confirmed artifacts:
  Families: 84, 85
  Factories: F1429–F1442
  Task Types: T543–T545
  Skills: SK-355, SK-356, SK-368–SK-370
  BFA Rules: CF-751–CF-755
```

---

## PHASE P1 — SERVER LANGUAGE VARIANTS
**Save Point: P1_COMPLETE**

### Objective
Generate server-side adapters for Node.js, Go, Java, Rust, and PHP — each implementing MicroserviceBase semantics for their language (result envelope, dict I/O, tenant scope, dynamic routing, trace propagation) through fabric interfaces.

### P1-1: Factory Registration
- Family 218 (F1460–F1465): Server Language SDK Scaffolding
- Family 219 (F1466–F1470): Cross-Variant Conformance Testing
- Family 221 (F1476–F1479): Variant Promotion Pipeline

### P1-2: Task Types T546–T551
- **T546** — Server Variant Generation — Node.js
- **T547** — Server Variant Generation — Go
- **T548** — Server Variant Generation — Java
- **T549** — Server Variant Generation — Rust
- **T550** — Server Variant Generation — PHP
- **T551** — Server Variant Cross-Language Judge

Each T546–T550 follows identical full engine contract format, differing only in target language and SDK pattern. AF pipeline for each:
```
AF-2 (Planning) → AF-3 (Prompt Library, language-specific) → AF-4 (RAG: SK-357/148/149/150/151)
→ AF-1 (Genesis: generate adapter) → AF-6 (Code review) → AF-7 (DNA compliance)
→ AF-8 (Security) → AF-9 (Judge: validate against golden tests) → AF-11 (Feedback)
```

### P1-3: Skills SK-357–SK-361, SK-371, SK-376–SK-378
Per-language MicroserviceBase SDK patterns. Each skill pattern MUST include:
- DataProcessResult equivalent (result envelope, never throw for business logic)
- parse_document → language-native map/dict only (no typed domain classes)
- tenantId extraction from auth context
- DynamicRouter equivalent (no entity-specific route handlers)
- W3C TraceContext propagation (traceparent/tracestate via OpenTelemetry)
- Fabric call pattern (never direct driver import)
- AI Agent Prompt (for AF-1 generation)

### P1-4: BFA Rules CF-756–CF-766
- CF-756: Every server variant MUST implement language-native result envelope
- CF-757: No provider imports (no `pg`, no `redis`, no `openai` packages imported directly)
- CF-758: tenantId must be extracted from auth context, never from request body
- CF-759: Idempotency key must be stable across retries (same input → same key)
- CF-760: Golden test suite MUST pass before GENERATED→INJECTED promotion
- CF-761: W3C TraceContext propagation required in all variants
- CF-762: Go variant must use context.Context for cancellation propagation
- CF-763: Rust variant must use Result<T,E> envelope mapping to DataProcessResult semantics
- CF-764: PHP variant must not use global state; dependency injection required
- CF-765: Java variant must use immutable value objects for config (MACHINE values only)
- CF-766: Cross-language conformance matrix must show 100% test coverage before promotion to MINIMAL

### P1 Validation Gates
```
✅ Each T546–T550 has FABRIC RESOLUTION mapping for all factory dependencies
✅ SK-357–SK-361 each show: zero provider imports, dict I/O, tenant scope, trace propagation
✅ CF-756–CF-766 registered in BFA indices
✅ Conformance runner (F1466–F1470) verifies all 5 server variants against shared golden suite
```

**Save Point P1_COMPLETE:**
```
Confirmed artifacts:
  Families: 89, 90, 92 (partial)
  Factories: F1460–F1479
  Task Types: T546–T551
  Skills: SK-357–SK-361, SK-371, SK-376–SK-378
  BFA Rules: CF-756–CF-766
```

---

## PHASE P2 — CLIENT FRAMEWORK VARIANTS
**Save Point: P2_COMPLETE**

### Objective
Generate client-side adapters for ReactJS, Vue, and Angular using the existing T363 (UI Code Export Gate) + FREEDOM config approach. Platform selection stays config-driven, not code-forked.

### Key Architectural Note
> The existing engine already resolves UI platform via `"ui.platform"` config (react/angular/vue/react_native). Client "translation" = feed the same canonical UI intent model into the existing code export pipeline with different target config. No new business logic. Only packaging.

### P2-1: Factory Registration
- Family 215 (F1443–F1449): Target Adapter Code Generation
- Factories F1443–F1449 resolve through AI ENGINE FABRIC for generation, DATABASE FABRIC for storage

### P2-2: Task Types T552–T555
- **T552** — Client Variant Generation — ReactJS
- **T553** — Client Variant Generation — Vue
- **T554** — Client Variant Generation — Angular
- **T555** — Client Variant Fabric Compliance Gate

AF pipeline for T552–T554:
```
AF-2 (Planning) → AF-4 (RAG: SK-362/153/154) → AF-1 (Genesis: generate adapter)
→ AF-6 (Code review) → AF-7 (DNA compliance — client DNA rules)
→ AF-9 (Judge: no secrets check, no hardcoded endpoints, idempotency key in state)
→ AF-11 (Feedback)
```

### P2-3: Skills SK-362–SK-364
- SK-362: ReactJS Client Variant Adapter
- SK-363: Vue Client Variant Adapter
- SK-364: Angular Client Variant Adapter

Client DNA Rules (enforced by AF-7 + AF-9):
- No secrets in client bundle (API keys, DB passwords — BUILD FAILURE)
- No hardcoded endpoints (must use config/environment resolution)
- State management through fabric-compatible abstraction (never direct localStorage without abstraction)
- idempotencyKey stable in component state (not regenerated on re-render)
- tenantId from auth context only (never from URL params or form fields)

### P2-4: BFA Rules CF-767–CF-774
- CF-767: No secrets in any client variant bundle
- CF-768: No hardcoded backend URLs (must use FREEDOM config resolution)
- CF-769: Client variant MUST use same CloudEvents type strings as canonical spec
- CF-770: idempotencyKey must not be regenerated on re-render
- CF-771: tenantId extracted from auth token only (never from user input)
- CF-772: Error states must map to canonical DataProcessResult failure structure
- CF-773: Client variant MUST NOT implement business logic (orchestration, validation logic → server only)
- CF-774: All API calls use fabric-compatible abstraction layer (never direct fetch/axios without wrapper)

### P2 Validation Gates
```
✅ F1443–F1449 all resolve through AI ENGINE FABRIC (generation) or DATABASE FABRIC (storage)
✅ T552–T554 reuse existing T363 pipeline where possible (extend, don't duplicate)
✅ SK-362–SK-364 show zero secrets, no hardcoded endpoints, idempotencyKey stable
✅ CF-767–CF-774 registered in BFA indices
```

**Save Point P2_COMPLETE:**
```
Confirmed artifacts:
  Family: 86
  Factories: F1443–F1449
  Task Types: T552–T555
  Skills: SK-362–SK-364
  BFA Rules: CF-767–CF-774
```

---

## PHASE P3 — WORDPRESS TARGETS
**Save Point: P3_COMPLETE**

### Objective
Add WordPress Plugin and WordPress Theme as first-class client targets. Both are packaging+runtime integration problems. Neither contains business logic (only presentation + configuration + API proxy to XIIGen control plane).

### WordPress Architecture Decision (DD-344, DD-348)
```
WordPress Plugin  = behaviors + admin config + blocks + optional REST proxy
WordPress Theme   = styling + templates + theme.json + no business logic whatsoever
```

Both call XIIGen via REST through Application Passwords (WP Core) or OAuth2 proxy. Neither imports a database driver directly. Server-side logic stays in XIIGen services.

### P3-1: Factory Registration
- Family 216 (F1450–F1454): WordPress Plugin Packaging
- Family 217 (F1455–F1459): WordPress Theme Packaging

### P3-2: Task Types T556–T558
- **T556** — WordPress Plugin Packaging Gate
- **T557** — WordPress Theme Packaging Gate
- **T558** — WordPress Security & Auth Gate

T556 AF pipeline:
```
AF-2 (Planning: decompose into plugin skeleton + blocks + admin) 
→ AF-4 (RAG: SK-365 Plugin Pattern, SK-367 REST Integration)
→ AF-1 (Genesis: generate plugin skeleton, block.json, admin settings PHP, JS assets)
→ AF-7 (Compliance: permission_callback present, no global state, nonce verification)
→ AF-8 (Security: SQL injection, CSRF, XSS checks on REST endpoints)
→ AF-9 (Judge: plugin passes WP 5.5+ REST rules, no secrets in plugin options)
→ AF-11 (Feedback)
```

### P3-3: Skills SK-365–SK-367
- SK-365: WordPress Plugin Adapter Pattern
  - plugin skeleton (PHP), block.json registration, `wp-scripts` build pipeline
  - `register_rest_route` with `permission_callback` required (WP 5.5+)
  - Admin config via Settings API (`register_setting`, `add_settings_section`)
  - Application Passwords for XIIGen API auth
- SK-366: WordPress Theme Adapter Pattern
  - theme.json schema, /templates, /parts structure
  - Non-nesting template part rules
  - No business logic; pure presentation + template configuration
- SK-367: WordPress REST Integration Pattern
  - How WP REST proxy calls XIIGen control plane endpoints
  - CloudEvents envelope forwarding
  - nonce + Application Password auth patterns

### P3-4: BFA Rules CF-775–CF-782
- CF-775: `permission_callback` REQUIRED on every `register_rest_route` call — omission = BUILD FAILURE
- CF-776: WordPress plugin MUST NOT contain business logic (orchestration, validation → XIIGen services only)
- CF-777: WordPress theme MUST NOT contain REST endpoints or business logic
- CF-778: No secrets in `wp_options` (API keys stored via XIIGen encrypted config, not WP DB)
- CF-779: Block editor assets MUST be built via `@wordpress/scripts` (wp-scripts) only
- CF-780: nonce verification required on all AJAX handlers (`check_ajax_referer`)
- CF-781: WordPress variant MUST use Application Passwords for XIIGen API calls (not hardcoded tokens)
- CF-782: Theme template parts must not nest recursively (WP block theme rule)

### P3 Validation Gates
```
✅ F1450–F1459 resolve through AI ENGINE FABRIC (generation) — never call WP DB directly
✅ T556 IRON RULE includes: permission_callback required, no global state, no secrets in WP options
✅ SK-365 shows register_rest_route + permission_callback + nonce pattern
✅ CF-775 is a BUILD FAILURE trigger (not a warning)
```

**Save Point P3_COMPLETE:**
```
Confirmed artifacts:
  Families: 87, 88
  Factories: F1450–F1459
  Task Types: T556–T558
  Skills: SK-365–SK-367
  BFA Rules: CF-775–CF-782
```

---

## PHASE P4 — GRAPH RAG, CONFORMANCE & ORCHESTRATION
**Save Point: P4_COMPLETE (= FLOW34_COMPLETE)**

### Objective
Complete the engine with: cross-variant conformance runner, promotion ladder gate, Graph RAG ingestion + querying, variant packaging manifest, and the master multi-target orchestrator (T564).

### Why Graph RAG After Regular Library
Design Decision DD-346: Graph RAG is Phase B. The structured alternatives library (P0–P3) is the authoritative system of record. Graph RAG adds discovery-by-traversal AFTER variants have conformance evidence. Never before.

### P4-1: Factory Registration
- Family 220 (F1471–F1475): Graph RAG Skill Index
- Family 222 (F1480–F1483): Multi-Target Orchestration Control
- Family 221 remaining (F1476–F1479): Variant Promotion Pipeline

### P4-2: Task Types T559–T564
- **T559** — Cross-Variant Conformance Runner
- **T560** — Variant Promotion Ladder Gate
- **T561** — Graph RAG Node Ingestion
- **T562** — Graph RAG Edge Linking
- **T563** — Graph RAG Variant Selection Query
- **T564** — Multi-Target Translation Orchestrator (master DAG)

### P4-3: Skills SK-372–SK-375
- SK-372: Graph RAG Ingestion Pattern
- SK-373: Graph RAG Variant Selection
- SK-374: Variant Packaging Manifest
- SK-375: No-Secrets Gate Pattern

### P4-4: BFA Rules CF-783–CF-788
- CF-783: Conformance runner (T559) MUST use golden test vectors from canonical spec (F1434), never ad-hoc tests
- CF-784: Graph RAG ingestion (T561) MUST NOT run until all variants reach INJECTED status
- CF-785: Promotion to CORE requires human approval gate in T560
- CF-786: Graph RAG edges ALTERNATIVE_OF must be bidirectional (if A alt B, then B alt A)
- CF-787: Variant packaging manifest (SK-374) required before any variant is distributed
- CF-788: T564 orchestrator trace ID must persist across all sub-task executions (resumable)

### P4 Validation Gates
```
✅ F1471–F1475 resolve through RAG FABRIC (Graph strategy — SK-389 (HybridRagStrategy))
✅ F1480–F1483 resolve through FLOW ENGINE FABRIC (SK-392 (RagStrategyRegistry)) + DATABASE FABRIC + AI ENGINE FABRIC
✅ T564 IRON RULES enforce: T543 before T546-T554, T545 before T559, T561-T563 after INJECTED
✅ Graph RAG uses local search for per-skill queries, global search for coverage reports (from deep research)
✅ CF-788 ensures T564 is resumable from any checkpoint
```

**Save Point P4_COMPLETE = FLOW34_COMPLETE:**
```
Confirmed artifacts:
  Families: 91, 92 (complete), 93
  Factories: F1471–F1483
  Task Types: T559–T564
  Skills: SK-372–SK-375
  BFA Rules: CF-783–CF-788
  Templates: 50–57
```

---

## TEMPLATE 50 — MULTI-TARGET TRANSLATION DAG (Flow Definition)

This is the JSON DAG template stored in Elasticsearch that T564 orchestrates. It is NOT the flow itself — it is what the ENGINE stores and reads via IFlowOrchestrator.

```json
{
  "templateId": "template-50-multi-target-translation",
  "version": "1.0.0",
  "name": "Multi-Target Skill Translation Flow",
  "description": "Translates a source skill into all requested target stacks via Canonical Skill Spec",
  "fabricResolution": {
    "orchestrator": "FLOW_ENGINE_FABRIC",
    "canonicalStore": "DATABASE_FABRIC",
    "variantRegistry": "DATABASE_FABRIC",
    "adapterGeneration": "AI_ENGINE_FABRIC",
    "conformanceTesting": "CORE_FABRIC",
    "graphRag": "RAG_FABRIC"
  },
  "phases": [
    {
      "phaseId": "P0_CANONICAL",
      "sequential": true,
      "steps": [
        { "stepId": "extract-canonical", "taskType": "T543", "factory": "F1429", "fabricResolution": "DATABASE_FABRIC(ES)" },
        { "stepId": "attach-variants", "taskType": "T544", "factory": "F1436", "fabricResolution": "DATABASE_FABRIC(ES)" },
        { "stepId": "seed-conformance", "taskType": "T545", "factory": "F1434", "fabricResolution": "DATABASE_FABRIC(ES)" }
      ]
    },
    {
      "phaseId": "P1_SERVER_VARIANTS",
      "sequential": false,
      "condition": "P0_CANONICAL == SUCCESS",
      "steps": [
        { "stepId": "gen-node", "taskType": "T546", "factory": "F1444", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetLanguage": "node"} },
        { "stepId": "gen-go", "taskType": "T547", "factory": "F1444", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetLanguage": "go"} },
        { "stepId": "gen-java", "taskType": "T548", "factory": "F1444", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetLanguage": "java"} },
        { "stepId": "gen-rust", "taskType": "T549", "factory": "F1444", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetLanguage": "rust"} },
        { "stepId": "gen-php", "taskType": "T550", "factory": "F1444", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetLanguage": "php"} }
      ],
      "gate": { "stepId": "judge-server", "taskType": "T551", "factory": "F1468", "fabricResolution": "CORE_FABRIC" }
    },
    {
      "phaseId": "P2_CLIENT_VARIANTS",
      "sequential": false,
      "condition": "P0_CANONICAL == SUCCESS",
      "steps": [
        { "stepId": "gen-react", "taskType": "T552", "factory": "F1445", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetFramework": "reactjs"} },
        { "stepId": "gen-vue", "taskType": "T553", "factory": "F1445", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetFramework": "vue"} },
        { "stepId": "gen-angular", "taskType": "T554", "factory": "F1445", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"targetFramework": "angular"} }
      ],
      "gate": { "stepId": "judge-client", "taskType": "T555", "factory": "F1447", "fabricResolution": "CORE_FABRIC" }
    },
    {
      "phaseId": "P3_WORDPRESS",
      "sequential": true,
      "condition": "config.includeWordPress == true",
      "steps": [
        { "stepId": "gen-wp-plugin", "taskType": "T556", "factory": "F1450", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"target": "wordpress_plugin"} },
        { "stepId": "gen-wp-theme", "taskType": "T557", "factory": "F1455", "fabricResolution": "AI_ENGINE_FABRIC", "config": {"target": "wordpress_theme"} },
        { "stepId": "wp-security-gate", "taskType": "T558", "factory": "F1453", "fabricResolution": "CORE_FABRIC" }
      ]
    },
    {
      "phaseId": "P4_CONFORMANCE_AND_PROMOTION",
      "sequential": true,
      "condition": "P1_SERVER_VARIANTS == SUCCESS || P2_CLIENT_VARIANTS == SUCCESS",
      "steps": [
        { "stepId": "run-conformance", "taskType": "T559", "factory": "F1466", "fabricResolution": "CORE_FABRIC" },
        { "stepId": "promotion-gate", "taskType": "T560", "factory": "F1476", "fabricResolution": "DATABASE_FABRIC(ES)" }
      ]
    },
    {
      "phaseId": "P4B_GRAPH_RAG",
      "sequential": true,
      "condition": "config.enableGraphRag == true && P4_CONFORMANCE_AND_PROMOTION == SUCCESS",
      "steps": [
        { "stepId": "ingest-nodes", "taskType": "T561", "factory": "F1471", "fabricResolution": "RAG_FABRIC(Graph)" },
        { "stepId": "link-edges", "taskType": "T562", "factory": "F1472", "fabricResolution": "RAG_FABRIC(Graph)" }
      ]
    }
  ],
  "resumable": true,
  "traceFactory": "F1481",
  "feedbackFactory": "F1482",
  "freedomConfig": {
    "skill.target.client": ["reactjs", "vue", "angular", "wordpress_plugin", "wordpress_theme"],
    "skill.target.server": ["dotnet", "node", "go", "java", "rust", "php"],
    "skill.variant.maturityThreshold": "INJECTED",
    "includeWordPress": false,
    "enableGraphRag": false
  }
}
```

---

## TEMPLATE 51 — SERVER VARIANT GENERATION (T546–T550)

Shared template for all server language variants. The `targetLanguage` FREEDOM config differentiates.

```json
{
  "templateId": "template-51-server-variant-generation",
  "version": "1.0.0",
  "name": "Server Language Variant Generation",
  "afPipeline": [
    { "station": "AF-2", "role": "Planning — decompose into routes, handlers, data access, tests" },
    { "station": "AF-3", "role": "Prompt Library — retrieve language-specific implementation prompts" },
    { "station": "AF-4", "role": "RAG — retrieve MicroserviceBase SDK pattern for target language (SK-357..151)" },
    { "station": "AF-1", "role": "Genesis — generate adapter code (never provider imports)" },
    { "station": "AF-6", "role": "Code Review — syntax, dependencies, test coverage" },
    { "station": "AF-7", "role": "Compliance — DNA patterns: dict I/O, result envelope, tenant scope, dynamic routing, trace" },
    { "station": "AF-8", "role": "Security — no secrets, injection-safe, no global state" },
    { "station": "AF-9", "role": "Judge — run golden test suite; fail if any test fails" },
    { "station": "AF-11", "role": "Feedback — store generation quality for next iteration" }
  ],
  "ironRules": [
    "No provider imports (no pg, redis, openai packages imported directly)",
    "All I/O as language-native map/dict (no typed domain classes)",
    "Result envelope required (DataProcessResult equivalent per language)",
    "tenantId from auth context only",
    "W3C TraceContext propagation via OpenTelemetry",
    "Golden test suite must pass 100% before promotion"
  ],
  "freedomConfig": {
    "targetLanguage": "{node|go|java|rust|php}",
    "generationModel": "claude|openai|gemini|deepseek",
    "minTestCoverage": 90
  }
}
```

---

## TEMPLATE 52 — CLIENT VARIANT GENERATION (T552–T554)

```json
{
  "templateId": "template-52-client-variant-generation",
  "version": "1.0.0",
  "name": "Client Framework Variant Generation",
  "afPipeline": [
    { "station": "AF-2", "role": "Planning — decompose into components, state management, API calls, event handlers" },
    { "station": "AF-4", "role": "RAG — retrieve client adapter pattern for target framework (SK-362..154)" },
    { "station": "AF-1", "role": "Genesis — generate adapter components using config-resolved platform" },
    { "station": "AF-6", "role": "Code Review" },
    { "station": "AF-7", "role": "Compliance — client DNA: no secrets, no hardcoded URLs, idempotencyKey stable" },
    { "station": "AF-8", "role": "Security — no secrets in bundle, XSS protection, no eval()" },
    { "station": "AF-9", "role": "Judge — visual regression, E2E test pass, CloudEvents type match" },
    { "station": "AF-11", "role": "Feedback" }
  ],
  "ironRules": [
    "No secrets in bundle",
    "No hardcoded backend URLs",
    "idempotencyKey must not regenerate on re-render",
    "tenantId from auth token only",
    "No business logic in client (orchestration → server only)",
    "CloudEvents type strings must match canonical spec"
  ],
  "freedomConfig": {
    "targetFramework": "{reactjs|vue|angular}",
    "stateLibrary": "config-resolved per framework"
  }
}
```

---

## TEMPLATE 53 — WORDPRESS PLUGIN PACKAGING (T556)

```json
{
  "templateId": "template-53-wp-plugin-packaging",
  "version": "1.0.0",
  "name": "WordPress Plugin Packaging Gate",
  "outputs": [
    "plugin-main.php (registration, hooks, activation/deactivation)",
    "block.json + src/ (Gutenberg block with @wordpress/scripts build)",
    "admin/ (Settings API: register_setting + add_settings_section)",
    "includes/rest-proxy.php (register_rest_route with permission_callback)",
    "package.json (wp-scripts build pipeline)"
  ],
  "ironRules": [
    "permission_callback REQUIRED on every register_rest_route (WP 5.5+) — BUILD FAILURE if missing",
    "No secrets in wp_options or plugin files",
    "nonce verification on all AJAX handlers",
    "No global state — dependency injection",
    "Application Passwords for XIIGen API auth (not hardcoded tokens)"
  ],
  "afPipeline": [
    "AF-2 → AF-4 (SK-365, SK-367) → AF-1 → AF-7 → AF-8 → AF-9 → AF-11"
  ]
}
```

---

## TEMPLATE 54 — WORDPRESS THEME PACKAGING (T557)

```json
{
  "templateId": "template-54-wp-theme-packaging",
  "version": "1.0.0",
  "name": "WordPress Theme Packaging Gate",
  "outputs": [
    "theme.json (design tokens, settings, styles)",
    "templates/ (page.html, single.html, archive.html)",
    "parts/ (header.html, footer.html — no recursive nesting)",
    "style.css (theme header comments only)",
    "functions.php (minimal: enqueue scripts, no business logic)"
  ],
  "ironRules": [
    "No REST endpoints in theme",
    "No business logic in functions.php",
    "Template parts must not nest recursively",
    "theme.json must define design tokens (not hardcoded hex values in CSS)"
  ],
  "afPipeline": [
    "AF-4 (SK-366) → AF-1 → AF-7 → AF-9 → AF-11"
  ]
}
```

---

## TEMPLATE 55 — CROSS-VARIANT CONFORMANCE RUNNER (T559)

```json
{
  "templateId": "template-55-conformance-runner",
  "version": "1.0.0",
  "name": "Cross-Variant Conformance Runner",
  "testInputSource": "F1434 (ISkillGoldenTestStoreService) → DATABASE FABRIC (ES)",
  "testMatrix": "all requested server variants × all client variants × golden test vectors",
  "outputs": [
    "ConformanceMatrixDocument (ES): variant → test → pass/fail/coverage%",
    "FailureReport (ES): which variants failed which golden tests",
    "PromotionReadiness (ES): GENERATED|INJECTED|MINIMAL per variant"
  ],
  "promotionThresholds": {
    "INJECTED": "100% golden test pass",
    "MINIMAL": "100% golden + 90% unit coverage + human review",
    "CORE": "all MINIMAL criteria + security audit + human approval"
  }
}
```

---

## TEMPLATE 56 — GRAPH RAG INGESTION PIPELINE (T561–T562)

```json
{
  "templateId": "template-56-graph-rag-ingestion",
  "version": "1.0.0",
  "name": "Graph RAG Skill Index Ingestion",
  "nodeTypes": ["Skill", "CanonicalSpec", "Variant", "Factory", "TestSuite", "TaskType"],
  "edgeTypes": [
    "HAS_VARIANT (Skill → Variant)",
    "ALTERNATIVE_OF (Variant ↔ Variant, bidirectional, same canonical family only)",
    "DEPENDS_ON (Variant → Factory)",
    "VALIDATED_BY (Variant → TestSuite)",
    "SKILL_REFERENCED_BY_TASKTYPE (Skill → TaskType)"
  ],
  "searchStrategies": {
    "local": "Per-skill: entity → variant traversal (target selection)",
    "global": "Portfolio: coverage reports, gap analysis, community detection"
  },
  "condition": "All variants MUST be at INJECTED or above before ingestion"
}
```

---

## TEMPLATE 57 — VARIANT SELECTION QUERY (T563)

```json
{
  "templateId": "template-57-variant-selection",
  "version": "1.0.0",
  "name": "Graph RAG Variant Selection Query",
  "inputs": {
    "skillFamilyId": "str",
    "targetClient": "reactjs|vue|angular|wordpress_plugin|wordpress_theme|react_native",
    "targetServer": "dotnet|node|go|java|rust|php",
    "minMaturity": "INJECTED|MINIMAL|CORE"
  },
  "searchFlow": [
    "1. Graph local search: Skill node → HAS_VARIANT edges → filter by target + maturity",
    "2. If exact match: return ranked by maturity + test coverage",
    "3. If no exact match: traverse ALTERNATIVE_OF edges; return near matches",
    "4. If still no match: return canonical spec + adapter recipe (F1442 fallback)"
  ],
  "outputDocument": "dict[str, Any] via DATABASE FABRIC (ES) — never typed model"
}
```

---

## POSITIVE EXAMPLE — Successful FLOW-34 Execution

**Input:** Admin triggers translation of SK-69 (Python source skill) with targets: server=[go, node], client=[reactjs, vue], WordPress=false, GraphRag=true.

**T543 runs:** AF-1 extracts capability contract, CloudEvents schema, golden tests from SK-69. Stores Canonical Skill Spec in ES via F1429 (DATABASE FABRIC). Returns `DataProcessResult[Dictionary]` with `canonicalId: "SK-69-canonical-v1"`. AF-9 confirms: OpenAPI present, CloudEvents present, min 3 golden tests present. ✅

**T544 runs:** F1436 registers variant descriptors for {server/go, server/node, client/reactjs, client/vue}. Stored as `dict[str, Any]`. tenantId on all writes. ✅

**T546 (Node), T547 (Go) run in parallel:** AF-4 retrieves SK-357 (Node SDK), SK-358 (Go SDK). AF-1 generates adapters — zero provider imports, all I/O as maps, result envelopes present. AF-7 confirms DNA compliance. AF-9 replays golden tests: 100% pass. Variants promoted to GENERATED. ✅

**T552 (ReactJS), T553 (Vue) run in parallel:** AF-4 retrieves SK-362, SK-363. AF-1 generates components with config-resolved platform. No secrets in bundle. idempotencyKey stable. AF-9 passes. ✅

**T559 (Conformance) runs:** F1466 replays 5 golden test vectors against all 4 variants. Matrix: 4 variants × 5 tests = 20 passes. ConformanceMatrix stored in ES. ✅

**T560 (Promotion) runs:** All variants promoted to INJECTED. Human review triggered for MINIMAL gate. ✅

**T561–T562 (Graph RAG) run:** Skill, Variants, Factories, TestSuites ingested as nodes. HAS_VARIANT and ALTERNATIVE_OF (Node↔Go within server family) edges created. ✅

**End state:** SK-69 now has 4 variants at INJECTED, Graph RAG discoverable, full audit trail in F1481. ✅

---

## NEGATIVE EXAMPLE — Build Failure Triggered

**Engine draft for Go variant:** Generates `import "database/sql"; db, _ := sql.Open("postgres", dsn)` — **BUILD FAILURE (CF-757, IRON-215-1):** Direct provider import. Go variant must call through fabric interface equivalent. AF-7 catches at DNA-4 compliance check. AF-9 refuses promotion. Feedback stored in AF-11. Generation retried with corrected prompt.

**Engine draft for WordPress plugin:** Generates `register_rest_route('my-plugin/v1', '/data', ['callback' => 'my_data_handler'])` with no `permission_callback` — **BUILD FAILURE (CF-775):** WP 5.5+ REST route without permission_callback. T558 (WordPress Security Gate) catches this before any promotion. Plugin remains at GENERATED, not promoted.

---

## RECOVERY PROTOCOL

If session interrupted, recover with:
1. Load RAG_INDEX.md → confirm ceilings: F1483, T564, SK-378, CF-788, ST-497
2. Load SESSION_STATE → check P0/P1/P2/P3/P4 phase status flags
3. Load ENGINE_ARCHITECTURE → confirm families 213–222 registered
4. Resume from last IN_PROGRESS phase
5. Use T564 trace ID (F1481) to resume orchestration from checkpoint

**Next numbers after FLOW-34:**
```
Factory:     F686
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
# FLOW-35 EXECUTION PLAN — Secrets Fabric + ConfigBuilder + Grok Provider
# Added: 2026-03-05 | Status: P0–P4 COMPLETE, P5 IN PROGRESS
# ═══════════════════════════════════════════════════════

## EXECUTION PHASES

| Phase | Name | Status | Tests Added | Cumulative |
|-------|------|--------|-------------|------------|
| P0 | Gemini SDK Migration (bug fix, DD-359) | ✅ COMPLETE | +2 | 670 |
| P1 | Secrets Fabric Interface + 3 Providers (Family 223) | ✅ COMPLETE | +66 | 736 |
| P2 | ConfigBuilder + Secret Reference Resolution (F1487) | ✅ COMPLETE | +41 | 777 |
| P3 | Grok/xAI AI Provider — native xai_sdk (F1488, DD-358) | ✅ COMPLETE | +22 | 799 |
| P4 | Config Template + Bootstrap Wiring + Integration (Family 224) | ✅ COMPLETE | +43 | 842 |
| P5 | Canonical Document Updates | 🔄 IN PROGRESS | 0 | 842 |

## PHASE DETAILS

### P0 — Gemini SDK Migration
**Files modified:** 4 (gemini_provider.py rewritten, test_gemini_provider.py, test_ai_fabric_resolver.py, pyproject.toml)
**Key change:** `google-generativeai` (EOL Nov 2025) → `google-genai` (GA since May 2025)
**Backward compat:** All 668 original tests pass unchanged
**Recovery:** `FLOW35_STATE_P0.json` + `flow35_P0_gemini_sdk_fix.zip`

### P1 — Secrets Fabric
**Files created:** 11 (8 source in `fabrics/secrets/` + 3 test files)
**Artifacts:** Family 223, F1484–F1486, T565, CF-789, ST-498, SK-402, DR-267
**Key pattern:** Identical to existing 6 fabrics: interface → providers → registry → resolver → factory
**Recovery:** `FLOW35_STATE_P1.json` + `flow35_P1_secrets_fabric.zip`

### P2 — ConfigBuilder
**Files created:** 4 (2 source in `freedom/` + 2 test files)
**Artifacts:** F1487, CF-790, SK-403, DR-268
**Key pattern:** Walks config dicts, resolves $secret:/$env: refs, caches with TTL
**Recovery:** `FLOW35_STATE_P2.json` + `flow35_P2_config_builder.zip`

### P3 — Grok Provider
**Files created/modified:** 5 (1 new source + 1 new test + 3 modified)
**Artifacts:** F1488, SK-404, DD-358
**Key pattern:** Native `xai_sdk.AsyncClient` — NOT `openai.AsyncOpenAI(base_url=...)`
**Recovery:** `FLOW35_STATE_P3.json` + `flow35_P3_grok_provider.zip`

### P4 — Bootstrap Wiring
**Files created:** 9 (3 config + 3 source in `bootstrap/` + 3 test files)
**Artifacts:** Family 224, F1489, F1490, T566, Template 134, ST-499
**Key pattern:** 7-phase bootstrap: Secrets→Config→DB→Queue→AI→RAG→Flow
**Recovery:** `FLOW35_STATE_P4.json` + final ZIP

### P5 — Canonical Document Updates
**Files modified:** 7 canonical merged documents
**No new code or tests — documentation merge only**
**Recovery:** N/A (this is the final phase)

## DEPENDENCY DAG

```
P0 (Gemini fix) ──┐
                   ├──→ P1 (Secrets Fabric) ──→ P2 (ConfigBuilder) ──┐
                   │                                                    ├──→ P4 (Bootstrap) ──→ P5 (Docs)
                   └──→ P3 (Grok Provider) ─────────────────────────────┘
```

## RECOVERY COMMANDS

```
Full reload:              "Load FLOW33_WITH_FLOW35_P0_P4.zip + install deps + pytest"
Resume from P0:           "Extract flow35_P0_gemini_sdk_fix.zip into FLOW33_FINAL_COMPLETE"
Resume from P1:           "Extract flow35_P1_secrets_fabric.zip into P0 state"
Resume from P2:           "Extract flow35_P2_config_builder.zip into P1 state"
Resume from P3:           "Extract flow35_P3_grok_provider.zip into P2 state"
Resume from P4:           "Extract flow35_P4_bootstrap_wiring.zip into P3 state"
Verify any checkpoint:    "python -m pytest tests/ -q --tb=line"
Install all deps:         "pip install fastapi uvicorn pydantic httpx aiohttp openai anthropic google-genai xai-sdk pytest pytest-asyncio --break-system-packages"
```

## BACKWARD COMPATIBILITY ASSERTION

```
FLOW-35 BACKWARD COMPATIBILITY REPORT
Date: 2026-03-05
Result: PASS ✅

Unchanged artifacts:
  F1–F1483:         1483 factories — NO modifications (FLOW-01 through FLOW-34)
  T1–T564:          564 task types — NO modifications
  Families 1–222:   222 families — NO modifications
  SK-1–SK-401:      401 skills — NO modifications
  CF-1–CF-788:      788 BFA rules — NO modifications
  ST-1–ST-497:      497 stress tests — NO modifications
  Templates 1–133:  133 templates — NO modifications
  DD-1–DD-357:      357 design decisions — NO modifications
  DR-1–DR-266:      266 design records — NO modifications
  EP-1–EP-6:        6 engine primitives — NO modifications
  DNA-1–DNA-9:      9 patterns — NO modifications

Existing code changes (bug fixes only):
  gemini_provider.py:       Rewritten for current SDK (DD-359) — same IAiProvider contract
  test_gemini_provider.py:  Mock patterns updated — same assertions
  base.py:                  Added GROK enum + GROK_4 profile (additive only)
  pyproject.toml:           google-generativeai → google-genai; added xai-sdk (additive)

New artifact ranges (FLOW-35 only):
  F1484–F1490 (7 new factories)
  T565–T566 (2 new task types)
  Families 223–224 (2 new families)
  SK-402–SK-404 (3 new skills)
  CF-789–CF-790 (2 new BFA rules)
  ST-498–ST-499 (2 new stress tests)
  Template 134 (1 new flow template)
  DD-358–DD-359 (2 new design decisions)
  DR-267–DR-268 (2 new design records)

Test verification:
  FLOW-33 base: 668 passed, 36 skipped, 0 failed
  After P0-P4:  842 passed, 36 skipped, 0 failed
  Regressions:  ZERO
```
