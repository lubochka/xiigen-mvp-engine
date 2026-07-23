# XIIGen — FLOW-08 MASTER PLAN
## CMS + Commerce + Multi-Tenant Engine Extension
## Date: 2026-02-26 | Status: PLAN READY ✅ | Save Point: PLAN:P0

---

# ═══════════════════════════════════════════════════
# SECTION 0 — PRE-FLIGHT STATE SNAPSHOT
# ═══════════════════════════════════════════════════

## Continuity from FLOW-07 (SESSION_STATE_MERGE.md)

| Sequence | Current Last | Next |
|----------|-------------|------|
| Factory interfaces (F) | F243 | **F244** |
| Factory families | 26 | **27** |
| Task types (T) | T82 | **T83** |
| BFA conflict rules (CF) | CF-63 | **CF-64** |
| Stress tests (ST) | ST-30 | **ST-31** |
| Design records (DR) | DR-20 | **DR-21** |
| Design decisions (DD) | DD-20 | **DD-21** |
| Skill patterns (SK) | SK-28 | **SK-29** |
| Flow templates | 17 | **18** |
| DNA patterns | DNA-8 | (stable unless FLOW-08 introduces new) |

---

# ═══════════════════════════════════════════════════
# SECTION 1 — WHAT IS FLOW-08?
# ═══════════════════════════════════════════════════

## Plain Language Description (No Code)

FLOW-08 is the **CMS + Commerce + Multi-Tenant Platform Engine**.

It extends XIIGen to be capable of generating complete, production-ready
CMS (WordPress-like) and Commerce (Shopify-like) platforms with
multi-tenant isolation — all through the engine's existing fabric interfaces,
factory patterns, and DNA compliance rules.

The 10-* research documents define four mandatory end-to-end flows
the engine must be able to generate:

**Flow A — Content Publishing Pipeline**
An author creates a blog post. It moves through draft → in-review →
scheduled → published → archived. Each state transition triggers
side effects through fabric: search re-index, cache purge, SEO ping,
subscriber notifications. All driven by queue events, never direct HTTP.

**Flow B — Browse & Buy (Checkout)**
A shopper adds products to a cart, proceeds to checkout, pays.
The engine generates: cart management, inventory reservation, payment
orchestration, order creation, fulfillment trigger, post-purchase messaging.
Concurrency-safe: two simultaneous checkouts never double-charge or
double-reserve. All via factory interfaces resolved through fabric.

**Flow C — Product Update Propagation**
An admin updates a product (price, inventory, description). The engine
generates: validation, save, then fan-out — search index update, CDN
cache purge, merchant feed update, webhook delivery to subscribers.
Admin bulk import triggers batch version of the same pipeline.

**Flow D — Plugin/App Extensibility**
A tenant installs a plugin. The engine generates: permission scope grant,
webhook registration, metafield binding on entities, and runtime extension
point activation. All within the tenant's isolation boundary.

**Cross-cutting: Multi-Tenant Control Plane**
Every generated service is tenant-scoped. The engine adds a Tenant Control
Plane family of factory interfaces: tenant registry, isolation router,
entitlement service, provisioning pipeline. Bridge/hybrid isolation model
(shared schema for small tenants, separate schema/DB for enterprise).
DNA-5 (Scope Isolation) is the enforcement mechanism already in place.

---

# ═══════════════════════════════════════════════════
# SECTION 2 — WHAT THE ENGINE ADDS (No Code Inventory)
# ═══════════════════════════════════════════════════

## New Factory Families (7 families, ~42 factory interfaces)

**Family 27 — Tenant Control Plane** (F244–F250) ~7 interfaces
  Purpose: Multi-tenant infrastructure layer. Every FLOW-08 service
  resolves tenant context through this family before any business logic.
  Fabrics: DATABASE (ES + PG), QUEUE (Redis Streams), CORE (MicroserviceBase)

  Interfaces:
  - ITenantRegistryService — tenant identity, status, tier
  - ITenantIsolationRouter — routes to shared/schema/dedicated DB
  - ITenantEntitlementService — feature flags, quotas, limits per tenant
  - ITenantProvisioningService — idempotent onboarding/offboarding pipeline
  - ITenantConfigService — per-tenant configuration and provider bindings
  - ITenantAuditService — all cross-tenant actions logged
  - ITenantMeteringService — usage tracking for billing

**Family 28 — Content/CMS Engine** (F251–F257) ~7 interfaces
  Purpose: Blog/CMS lifecycle. Generates content-type services for any tenant.
  Fabrics: DATABASE (ES full-text), AI ENGINE (content generation/review),
  QUEUE (state transition events), RAG (content similarity)

  Interfaces:
  - IContentEntityService — post/page CRUD with revision history
  - IContentWorkflowService — state machine: draft→review→scheduled→published
  - IMediaAssetService — upload, transform, CDN binding
  - ITaxonomyService — categories, tags, hierarchical classification
  - IRevisionService — immutable revision snapshots, diff, rollback
  - ISeoMetaService — structured metadata, sitemap, canonical URLs
  - IContentSchedulerService — time-triggered publish via durable timer

**Family 29 — Commerce Engine** (F258–F266) ~9 interfaces
  Purpose: Full commerce lifecycle. Cart → order → payment → fulfillment.
  Fabrics: DATABASE (PG for transactional), QUEUE (all transitions),
  AI ENGINE (pricing/recommendation), RAG (product similarity)

  Interfaces:
  - IProductCatalogService — product, variant, collection management
  - IInventoryService — stock levels, reservations (idempotent)
  - IPriceRuleService — price lists, discounts, dynamic pricing rules
  - ICartService — session cart with conflict-safe add/remove/reserve
  - ICheckoutService — checkout session, address, shipping selection
  - IPaymentOrchestratorService — PSP abstraction, capture, refund
  - IOrderService — order lifecycle: created→paid→fulfilled→delivered
  - IShippingService — carrier selection, label creation, tracking
  - ITaxService — tax rule computation per jurisdiction

**Family 30 — Workflow Lifecycle Engine** (F267–F271) ~5 interfaces
  Purpose: The durable state machine runner. Makes all lifecycle state
  transitions safe, retriable, and idempotent across all domains.
  Fabrics: DATABASE (ES for DAG storage), QUEUE (step triggers),
  ENGINE PRIMITIVES (EP-1 State Machine Registry, EP-2 Durable Timer)

  Interfaces:
  - IWorkflowDefinitionService — store/version/activate flow DAGs
  - IWorkflowExecutionService — start/resume/cancel/query executions
  - IWorkflowTimerService — schedule-based trigger (EP-2 reuse)
  - IIdempotencyKeyService — deduplication store for retryable actions
  - IOutboxEventService — transactional outbox: write + event as one

**Family 31 — Extensibility/App Platform** (F272–F277) ~6 interfaces
  Purpose: Plugin/App ecosystem. Tenant-isolated extension points.
  Fabrics: DATABASE (PG), QUEUE (webhook delivery), CORE (permissions)

  Interfaces:
  - IAppRegistryService — app catalog, manifest validation, versioning
  - IAppInstallationService — per-tenant install/uninstall lifecycle
  - IWebhookDeliveryService — reliable delivery: retry, HMAC signing, DLQ
  - IScopePermissionService — fine-grained scope grant/revoke per install
  - IMetafieldService — custom fields attached to any entity per tenant
  - IExtensionPointService — runtime hooks (UI + backend) for installed apps

**Family 32 — Search & Discovery** (F278–F282) ~5 interfaces
  Purpose: Cross-domain search, facets, recommendations. Swappable
  between ES native, Algolia-style external, or vector search.
  Fabrics: DATABASE (ES), AI ENGINE (embeddings), RAG (strategy)

  Interfaces:
  - ISearchIndexService — index entity documents (content + products)
  - ISearchQueryService — full-text + faceted + filtered queries
  - IFacetService — dynamic facet computation from index
  - IRecommendationService — "related posts", "you may also like" (AI-backed)
  - ICachePurgeService — CDN/cache invalidation on entity updates

**Family 33 — Notification Hub** (F283–F287) ~5 interfaces
  Purpose: All outbound notifications. Event-driven, template-based.
  Fabrics: QUEUE (trigger events), AI ENGINE (template personalization)

  Interfaces:
  - INotificationTemplateService — store/version email/SMS/push templates
  - INotificationDispatchService — route notification by channel + tenant config
  - IEmailDeliveryService — transactional email via fabric (swappable ESP)
  - ISmsDeliveryService — SMS via fabric (swappable SMS provider)
  - IDeliveryTrackingService — delivery status, bounce handling, analytics

## New Task Types (T83–T104, ~22 task types across 6 archetypes)

See Section 4 for full engine contract format per task type.
Summary of archetypes and counts:

| Domain | Task Types | Archetype |
|--------|-----------|-----------|
| Tenant Control Plane | T83–T86 (4) | PROVISION, ORCHESTRATION |
| Content Lifecycle | T87–T91 (5) | STATE_MACHINE, SCHEDULED |
| Commerce Checkout | T92–T96 (5) | ORCHESTRATION, TRANSACTIONAL |
| Product Propagation | T97–T99 (3) | FAN_OUT, BATCH |
| App Extensibility | T100–T102 (3) | PROVISION, EVENT |
| Search/Notification | T103–T104 (2) | FAN_OUT, ASYNC |

## New BFA Conflict Rules (CF-64–CF-85, ~22 rules)
  - Tenant isolation: cross-tenant data access prevention
  - Inventory: double-reservation prevention
  - Payment: double-charge prevention
  - Content: concurrent publish conflict
  - App: scope escalation detection
  - Search index: version skew during propagation

## New Skill Patterns (SK-29–SK-40, ~12 patterns)
  - SK-29: Transactional Outbox Pattern
  - SK-30: Idempotency Key Store
  - SK-31: Tenant Isolation Router
  - SK-32: Optimistic Locking for Commerce
  - SK-33: Content State Machine with EP-1
  - SK-34: Webhook HMAC Signing & Verification
  - SK-35: Bridge Tenancy Model Router
  - SK-36: Fan-Out with Cache Purge
  - SK-37: Scheduled Publish with EP-2 Timer
  - SK-38: PSP Abstraction via Payment Fabric
  - SK-39: App Permission Scope Validator
  - SK-40: Search Index Consistency Checker

## New Flow Templates (Templates 18–22, 5 templates)
  - Template 18: content-publishing-pipeline-v1
  - Template 19: commerce-checkout-pipeline-v1
  - Template 20: product-propagation-pipeline-v1
  - Template 21: app-installation-pipeline-v1
  - Template 22: tenant-onboarding-pipeline-v1

---

# ═══════════════════════════════════════════════════
# SECTION 3 — PHASES (Phased Execution Plan)
# ═══════════════════════════════════════════════════

## Phase Design Principles
- Each phase = one save-point file + one target merged doc
- Each phase is completable in 15–45 minutes
- Each phase has a clear RECOVERY command
- Phases are sequential but independent once started
- Total: 10 phases (P0=this doc, P1–P9 execution)

---

## PHASE 0 — RAG Index + Master Plan (THIS DOCUMENT)
**Save Point:** PLAN:P0
**Output:** FLOW08_MASTER_PLAN.md (this file)
**Contents:** Phase breakdown, inventory, examples, validation checklist
**Duration:** ~20 min (analysis and planning)
**Recovery:** "Show FLOW-08 plan" → Read FLOW08_MASTER_PLAN.md

---

## PHASE 1 — Tenant Control Plane Factories (Family 27)
**Save Point:** MERGE:P1
**Output:** FLOW08_P1_TENANT_CONTROL_PLANE.md
**Merges into:** ENGINE_ARCHITECTURE_MERGED.md
**Contents:**
  - F244–F250 full factory interface specs
  - Fabric resolution per interface
  - Methods with DataProcessResult<T> signatures
  - DNA compliance grid (8×7 = 56 checks)
  - DR-21 (Tenant Isolation Design Record)
  - DD-21 (Bridge vs. Shared Schema Decision)
**Why standalone:** Tenant CP is a prerequisite — all other families
  resolve their tenant context through Family 27. Must exist first.
**Recovery:** "Show FLOW-08 P1" → FLOW08_P1_TENANT_CONTROL_PLANE.md
**Checkpoint:** F244–F250 numbered, all resolve through fabric, DNA 56/56 ✓

---

## PHASE 2 — Content/CMS Engine Factories (Family 28)
**Save Point:** MERGE:P2
**Output:** FLOW08_P2_CONTENT_ENGINE.md
**Merges into:** ENGINE_ARCHITECTURE_MERGED.md
**Contents:**
  - F251–F257 full factory interface specs
  - Content state machine transitions (Draft→Published)
  - Integration with EP-1 (State Machine Registry) for lifecycle
  - Integration with EP-2 (Durable Timer) for scheduled publish
  - DNA compliance grid (8×7 = 56 checks)
  - DR-22 (Content Revision Immutability)
  - DD-22 (ES full-text vs. vector for content search)
**Recovery:** "Show FLOW-08 P2" → FLOW08_P2_CONTENT_ENGINE.md
**Checkpoint:** F251–F257 numbered, all state transitions event-driven ✓

---

## PHASE 3 — Commerce Engine Factories (Family 29)
**Save Point:** MERGE:P3
**Output:** FLOW08_P3_COMMERCE_ENGINE.md
**Merges into:** ENGINE_ARCHITECTURE_MERGED.md
**Contents:**
  - F258–F266 full factory interface specs
  - Idempotency contracts on ICartService, IPaymentOrchestratorService
  - Optimistic locking design on IInventoryService
  - PSP abstraction pattern — no Stripe/Braintree in service code
  - DNA compliance grid (8×9 = 72 checks)
  - DR-23 (Payment Fabric Design — PCI scope isolation)
  - DD-23 (Single-phase vs. two-phase inventory reservation)
  - DD-24 (PSP adapter vs. direct provider contract)
**Recovery:** "Show FLOW-08 P3" → FLOW08_P3_COMMERCE_ENGINE.md
**Checkpoint:** F258–F266 numbered, idempotency contracts defined ✓

---

## PHASE 4 — Workflow Lifecycle + Extensibility Factories (Families 30–31)
**Save Point:** MERGE:P4
**Output:** FLOW08_P4_WORKFLOW_EXTENSIBILITY.md
**Merges into:** ENGINE_ARCHITECTURE_MERGED.md
**Contents:**
  - F267–F277 (Families 30 + 31) full factory specs
  - Transactional outbox pattern (IOutboxEventService)
  - Idempotency key store (IIdempotencyKeyService)
  - Webhook HMAC signing + delivery guarantee design
  - App sandbox isolation: each installed app is tenant-scoped
  - DNA compliance grid (8×11 = 88 checks)
  - DR-24 (Outbox Pattern for Event Reliability)
  - DR-25 (App Sandbox: Extension Point Isolation)
  - DD-25 (Pull vs. push webhook delivery model)
**Recovery:** "Show FLOW-08 P4" → FLOW08_P4_WORKFLOW_EXTENSIBILITY.md
**Checkpoint:** F267–F277 numbered, outbox + idempotency contracts ✓

---

## PHASE 5 — Search, Notifications, Discovery Factories (Families 32–33)
**Save Point:** MERGE:P5
**Output:** FLOW08_P5_SEARCH_NOTIFICATIONS.md
**Merges into:** ENGINE_ARCHITECTURE_MERGED.md
**Contents:**
  - F278–F287 (Families 32 + 33) full factory specs
  - Cache purge integration with ICachePurgeService
  - Recommendation engine AI ENGINE FABRIC binding
  - Notification template versioning
  - DNA compliance grid (8×10 = 80 checks)
  - DR-26 (Search Tenant Scoping — mandatory tenant_id on all queries)
  - DD-26 (ESP abstraction: sendgrid vs. SES vs. SMTP)
**Recovery:** "Show FLOW-08 P5" → FLOW08_P5_SEARCH_NOTIFICATIONS.md
**Checkpoint:** F278–F287 numbered, all search queries tenant-scoped ✓

---

## PHASE 6 — Task Type Engine Contracts (T83–T104)
**Save Point:** MERGE:P6
**Output:** FLOW08_P6_TASK_TYPES.md
**Merges into:** TASK_TYPES_CATALOG_MERGED.md
**Contents:**
  Each of T83–T104 in FULL ENGINE CONTRACT FORMAT:
    ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES,
    FABRIC RESOLUTION, AF CONFIGURATION (11 stations), BFA VALIDATION,
    MACHINE/FREEDOM, IRON RULES (≥8 per type), QUALITY GATES (≥6 per type)
  - AF station map: 11 × 22 = 242 cells
  - Flow templates 18–22 (DAG JSON structure)
**Recovery:** "Show FLOW-08 P6" → FLOW08_P6_TASK_TYPES.md
**Checkpoint:** T83–T104 all full-format, 0 one-line stubs, 0 gaps ✓

---

## PHASE 7 — BFA Conflict Rules + Stress Tests (CF-64–CF-85, ST-31–ST-42)
**Save Point:** MERGE:P7
**Output:** FLOW08_P7_BFA.md
**Merges into:** V62_BFA_STRESS_TEST_MERGED.md
**Contents:**
  - CF-64–CF-85 (22 conflict rules) with PROOF field
  - ST-31–ST-42 (12 stress tests) — all must PASS
  - BFA entity registration: all new entities indexed
  - BFA event registration: all new event types indexed
  - BFA API registration: all new API surfaces indexed
  - Cross-flow validation vs. FLOW-01 through FLOW-07
    (especially: inventory conflicts with FLOW-06, tenant scoping
    conflicts with all prior flows)
**Recovery:** "Show FLOW-08 P7" → FLOW08_P7_BFA.md
**Checkpoint:** CF-64–CF-85 proofed, ST-31–ST-42 all PASS ✓

---

## PHASE 8 — Skill Patterns + Source Index (SK-29–SK-40)
**Save Point:** MERGE:P8
**Output:** FLOW08_P8_SKILLS_INDEX.md
**Merges into:** SKILLS_FACTORY_RAG_MERGED.md + UNIFIED_SOURCE_INDEX_MERGED.md
**Contents:**
  - SK-29–SK-40 (12 skill patterns) each with:
    - Pattern Name + Category
    - When to Use
    - .NET 9 primary implementation sketch
    - 5-language alternatives (Node, Python, Java, Rust, PHP)
    - AI agent implementation prompt
  - DD-27 through DD-30 (design decisions for FLOW-08)
  - Source index section: concept map + event chain for FLOW-08
  - RAG retrieval hints for each new factory family
**Recovery:** "Show FLOW-08 P8" → FLOW08_P8_SKILLS_INDEX.md
**Checkpoint:** SK-29–SK-40 complete, AI prompts included ✓

---

## PHASE 9 — Validation Report + Session State
**Save Point:** MERGE:FINAL
**Output:** FLOW08_VALIDATION.md + SESSION_STATE_FLOW08_FINAL.md
**Contents:**
  Validation report with ≥90 checks across 12 sections:
  1. Sequence continuity (no gaps in F/T/CF/ST/DR/DD/SK)
  2. Fabric resolution (every factory maps to a fabric)
  3. DNA compliance (all new factories: 8 patterns each)
  4. Full task type format (no stubs)
  5. AF station coverage (all 11 stations mapped for each flow)
  6. BFA registration completeness
  7. Backward compatibility (FLOW-01 through FLOW-07 unchanged)
  8. Multi-tenant compliance (tenant_id on every generated query)
  9. Idempotency contracts (all commerce + workflow actions)
  10. Iron rules enforcement (all build failures documented)
  11. DNA-8 new compliance check if any
  12. Template DAG validity (all steps resolve through factory)
**Recovery:** "Show FLOW-08 validation" → FLOW08_VALIDATION.md
**Final State:** MERGE:FINAL = COMPLETE ✅

---

# ═══════════════════════════════════════════════════
# SECTION 4 — PLAN VALIDATION
# ═══════════════════════════════════════════════════

## Does this plan cover ALL basic_prompt.txt requirements?

| Requirement | Covered By | Status |
|-------------|-----------|--------|
| New factory interfaces registered | P1–P5 (F244–F287) | ✅ |
| Each resolves through existing FABRIC | P1–P5 (fabric resolution per interface) | ✅ |
| Full engine contract format (no stubs) | P6 (T83–T104 all full format) | ✅ |
| AF station mapping (all 11 stations) | P6 (AF map 11×22 = 242 cells) | ✅ |
| BFA cross-flow validation | P7 (CF-64–CF-85) | ✅ |
| Flow templates (DAG JSON) | P6 (Templates 18–22) | ✅ |
| DNA compliance all 6 patterns | P1–P5 (per-family grids) | ✅ |
| No typed models (DNA-1) | Enforced via ParseDocument in all factories | ✅ |
| BuildSearchFilter on all queries (DNA-2) | Enforced via ObjectProcessor | ✅ |
| DataProcessResult<T> everywhere (DNA-3) | All factory method signatures | ✅ |
| MicroserviceBase inheritance (DNA-4) | All generated services | ✅ |
| Scope isolation (DNA-5) | tenant_id on every query — Family 27 enforces | ✅ |
| DynamicController (DNA-6) | No entity-specific controllers in gen code | ✅ |
| Backward compatibility | P7 validation vs FLOW-01–FLOW-07 | ✅ |
| Multi-tenant support | Family 27 (P1) + DNA-5 + DR-21/22 | ✅ |
| Fabric-first UI | All UI values resolve through ITenantConfigService | ✅ |

## Does this plan cover ALL 10-* document requirements?

| Requirement | Document Source | Covered By |
|-------------|----------------|-----------|
| Content lifecycle (draft→archived) | 10-shops_modules | T87–T91, Family 28 |
| Order lifecycle (created→refunded) | 10-shops_modules | T92–T96, Family 29 |
| Product update fan-out | 10-shops_modules_deep_research | T97–T99, Family 32 |
| Plugin/App extensibility | 10-shops_modules | T100–T102, Family 31 |
| Multi-tenant isolation | 28-multi_tenant, multi-tenant-support | Family 27, SK-31/35 |
| Bridge isolation model | 28-multi_tenant | DD-21, DR-21 |
| Idempotency contracts | 10-shops engine doc | SK-30, Family 30 |
| Transactional outbox | 10-shops engine doc | SK-29, F271 |
| Webhook HMAC security | 10-shops engine doc | SK-34, F274 |
| Optimistic locking (inventory) | 10-shops engine doc | SK-32, F260 |
| Scheduled publish | 10-shops engine doc | T91, F257, SK-37 |
| Search indexing + cache purge | 10-shops_modules | T103, Family 32 |
| Notification hub | 10-shops_modules | T104, Family 33 |
| Tenant onboarding pipeline | multi-tenant docs | T83–T86, Template 22 |
| Per-tenant config/entitlements | multi-tenant docs | F248, F249 |

## Plan Violations Check (from basic_prompt.txt "THE PLAN MUST NOT")

| Violation | Prevention in this plan |
|-----------|------------------------|
| Describe services as standalone | Every service is "engine generates on top of fabric" |
| Skip fabric resolution | Every factory in P1–P5 includes FABRIC RESOLUTION line |
| One-line task type stubs | P6: all T83–T104 in full engine contract format |
| Forget AF station mapping | P6: 11×22 AF station map = 242 cells |
| Import specific providers in service code | All providers resolved via CreateAsync() |
| Create typed models | DNA-1 enforced: ParseDocument everywhere |
| Break backward compatibility | P7: explicit validation vs FLOW-01 through FLOW-07 |

---

# ═══════════════════════════════════════════════════
# SECTION 5 — POSITIVE AND NEGATIVE EXAMPLES
# ═══════════════════════════════════════════════════

## Positive Examples (What CORRECT output looks like)

### Example 1: Correct Factory Interface Spec (Family 27)

```
F244: ITenantRegistryService
  DESCRIPTION: Resolves tenant identity, status, tier, and isolation binding.
    Called first by every generated service before any business logic.
  FABRIC: DATABASE FABRIC (Skill 05) → Elasticsearch provider
  RESOLUTION: CreateAsync(FactoryResolutionContext{tenantId, environment})
  METHODS:
    GetTenantAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
    RegisterTenantAsync(payload) → DataProcessResult<Dictionary<string,object>>
    UpdateTenantStatusAsync(tenantId, status) → DataProcessResult<bool>
    GetIsolationBindingAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
  DNA COMPLIANCE:
    DNA-1: ParseDocument — tenant record returned as Dictionary<string,object> ✓
    DNA-2: BuildSearchFilter — tenantId filter never skipped ✓
    DNA-3: DataProcessResult<T> — all methods return wrapped result ✓
    DNA-4: MicroserviceBase — resolving service extends MicroserviceBase ✓
    DNA-5: Scope Isolation — tenantId on ALL queries (self-referential: this IS the scope anchor) ✓
    DNA-6: DynamicController — no TenantController generated ✓
    DNA-7: [if applicable] ✓
    DNA-8: [if applicable] ✓
```

### Example 2: Correct Task Type Contract (T87 — Content State Transition)

```
TASK TYPE: T87 — Content Publish Gate
ARCHETYPE: STATE_MACHINE
ENTRY: Fires when IContentWorkflowService.TransitionAsync(postId, "publish_now") is called
PURPOSE: Validate, transition, and fan-out side effects for content publish
DISTINCT FROM: T77 (friend request — two-party confirmation); T91 (scheduled publish — timer-driven)
FACTORY DEPENDENCIES: F252, F278, F280, F283 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F252 (IContentWorkflowService) → FLOW ENGINE FABRIC (Skill 09) → EP-1 State Machine Registry
  F278 (ISearchIndexService) → DATABASE FABRIC (Skill 05) → Elasticsearch provider
  F280 (IFacetService) → DATABASE FABRIC (Skill 05) → Elasticsearch provider
  F283 (INotificationTemplateService) → QUEUE FABRIC (Skill 04) → Redis Streams
AF CONFIGURATION:
  AF-1 (Genesis): Generate state transition handler + side-effect dispatcher
  AF-2 (Planning): Decompose into: validate→transition→fan-out(index+purge+notify)
  AF-4 (RAG): Retrieve SK-33 (Content State Machine) + SK-29 (Outbox)
  AF-7 (Compliance): Verify DNA-5 (tenantId on all downstream calls)
  AF-9 (Judge): Validate iron rules — no direct HTTP between services
BFA VALIDATION:
  Check CF-65 (concurrent publish by two editors)
  Check CF-66 (publish while archive in progress)
MACHINE/FREEDOM:
  MACHINE: State transition order (draft→published not skippable), fan-out sequence
  FREEDOM: Notification template, index update delay, side effect list (configurable per tenant)
IRON RULES:
  IR-83: State transition MUST be atomic with outbox event write (DNA-3 via IOutboxEventService)
  IR-84: Side effects MUST fire through QUEUE FABRIC — never direct HTTP (Skill 04)
  IR-85: tenantId MUST be present on all downstream factory calls
  IR-86: Invalid state transitions (published→draft) MUST return DataProcessResult.Failure
  IR-87: No typed Post model — content record is Dictionary<string,object>
  IR-88: Concurrent publish conflict MUST trigger CF-65 check before transition
QUALITY GATES (AF-9):
  QG-83: State machine follows defined DAG (no skip transitions)
  QG-84: All side effects enqueued before HTTP response returned (outbox pattern)
  QG-85: tenantId verified on IndexAsync call
  QG-86: Failure result returned (not exception thrown) for invalid transition
  QG-87: No IContentService reference via direct import
  QG-88: DataProcessResult<T> on all method return paths
```

### Example 3: Correct BFA Conflict Rule

```
CF-65: CONCURRENT CONTENT PUBLISH
  DOMAIN: Content lifecycle (FLOW-08 Flow A)
  TRIGGER: Two editor sessions call TransitionAsync(postId, "publish_now") concurrently
  CONFLICT: Race condition — both see "InReview" state, both attempt transition
  DETECTION: BFA checks optimistic lock version on content entity before transition
  RESOLUTION: First writer wins; second receives DataProcessResult.Conflict with retry hint
  AFFECTED FLOWS: FLOW-08 (Flow A — Content Publishing)
  PROOF: Without this rule, two published versions of the same post can exist,
    breaking search index (duplicate documents), sitemap (duplicate URLs),
    and subscriber notifications (double-sent emails)
  IRON RULES ENFORCED: IR-86 (invalid transitions return Failure, not exception)
```

---

## Negative Examples (What WRONG output looks like — ENGINE REJECTS)

### ❌ Negative Example 1: Standalone Service Description (VIOLATION)

```
// WRONG — describes implementation directly, not engine contract
class TenantService : ITenantService {
    private readonly PostgresContext _db;   // ← IMPORT VIOLATION: DNA-1, DNA-4
    public async Task<Tenant> GetTenant(string id) {  // ← TYPED MODEL VIOLATION: DNA-1
        return await _db.Tenants.FindAsync(id);  // ← DIRECT DB VIOLATION: not through fabric
    }
}
```

Why it fails:
- Imports PostgresContext directly (must use DATABASE FABRIC via IDatabaseService)
- Returns typed `Tenant` model (must return `Dictionary<string,object>` via ParseDocument)
- Does not extend MicroserviceBase (DNA-4)
- No DataProcessResult<T> return type (DNA-3)
- No tenantId scope isolation (DNA-5)

### ❌ Negative Example 2: One-Line Task Type Stub (VIOLATION)

```
// WRONG — one-line stub with no engine contract
T87: Content Publish Gate — publishes content when author requests it
```

Why it fails: Missing ARCHETYPE, ENTRY, FACTORY DEPENDENCIES, FABRIC RESOLUTION,
AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES, QUALITY GATES.
Engine cannot generate a service from this — it has no contracts to enforce.

### ❌ Negative Example 3: Direct Provider Import in Service Code (VIOLATION)

```
// WRONG — direct provider calls in generated service
var stripe = new StripeClient(apiKey);  // ← PROVIDER IMPORT: must use IPaymentOrchestratorService
var result = await stripe.Charges.CreateAsync(chargeOptions);  // ← direct call violation
```

Why it fails:
- Must use F263:IPaymentOrchestratorService resolved via AI ENGINE FABRIC through CreateAsync()
- No provider (Stripe, Braintree, Square) is ever imported directly
- Cannot swap PSP via config if provider is hardcoded

### ❌ Negative Example 4: Missing Tenant Scope on Query (VIOLATION — DNA-5)

```
// WRONG — search query without tenant isolation
var results = await _db.SearchDocuments(BuildSearchFilter(new {
    contentType = "post",
    status = "published"
    // ← MISSING tenantId — every tenant's published posts returned to everyone
}));
```

Why it fails: DNA-5 (Scope Isolation) requires tenantId on EVERY query.
This would expose cross-tenant data — BOLA violation (OWASP API1:2023).
CF-XX (Cross-Tenant Data Exposure) would flag this at BFA validation.

### ❌ Negative Example 5: Missing Fabric Resolution in Task Type (VIOLATION)

```
// WRONG — factory deps listed without fabric mapping
FACTORY DEPENDENCIES: F252, F278, F283
FABRIC RESOLUTION: (omitted)  // ← VIOLATION: basic_prompt.txt requires this
```

Why it fails: The engine cannot resolve these factories at runtime without knowing
which fabric each one resolves through. The AF-7 (Compliance) station would fail this.

---

# ═══════════════════════════════════════════════════
# SECTION 6 — SMALL RAG FACTORY FOR FLOW-08
# ═══════════════════════════════════════════════════

## Purpose
This RAG index allows AF-4 (Task Context) to quickly locate reusable
patterns from existing skills when generating FLOW-08 services.

## FLOW-08 RAG Retrieval Index

| New Need | Existing Skill/Pattern | Retrieval Key |
|----------|----------------------|---------------|
| Durable state machine | EP-1 (State Machine Registry) | "state machine", "lifecycle", "transition" |
| Timer-triggered tasks | EP-2 (Durable Timer Service) | "timer", "scheduled", "publish now" |
| Fan-out with allSettled | T73 (four-way parallel fork in FLOW-07) | "parallel", "fan-out", "allSettled" |
| Multi-model AI judgment | T75 (FLOW-06 AI quality gate) | "judge", "quality gate", "multi-model" |
| Queue event dispatch | SK-4 (Queue Fabric) | "enqueue", "Redis Streams", "consumer group" |
| DB search with tenant filter | SK-5 (Database Fabric) | "search", "BuildSearchFilter", "tenantId" |
| Connection strength scoring | F243 (FLOW-07) | "scoring", "weight", "temporal decay" |
| Bidirectional merge | F242 (FLOW-07) | "merge", "bidirectional", "zone" |
| Neo4j graph traversal | F234 (FLOW-07) | "graph", "Neo4j", "relationship" |
| Webhook delivery | SK-8/09 (Flow Engine Fabric) | "webhook", "delivery", "retry" |
| Multi-tenant scoping | DNA-5 + SK pattern | "tenant", "scope", "isolation" |
| Idempotency | Not yet in skill library | → **New SK-30** (to be created in P8) |
| Transactional outbox | Not yet in skill library | → **New SK-29** (to be created in P8) |
| PSP abstraction | Not yet in skill library | → **New SK-38** (to be created in P8) |

## AF-4 Retrieval Prompt Template for FLOW-08

```
For task type [T##], search skill library for:
  1. DNA patterns matching: ParseDocument, BuildSearchFilter, DataProcessResult
  2. Factory patterns: IExternalServiceFactory<TService>.CreateAsync()
  3. State machine patterns: EP-1 for [lifecycle_domain]
  4. Timer patterns: EP-2 for scheduled triggers
  5. FLOW-08 specific: SK-29 (outbox), SK-30 (idempotency), SK-32 (optimistic lock)
  Strategy: HYBRID (Tiered + Vector for code similarity)
  Scope: Families 27-33, plus existing SK-1-SK-28 for reuse
```

---

# ═══════════════════════════════════════════════════
# SECTION 7 — SYSTEM TOTALS PROJECTION (Post FLOW-08)
# ═══════════════════════════════════════════════════

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F243 | F287 | +44 |
| Factory families | 26 | 33 | +7 |
| Task types | T82 | T104 | +22 |
| Flow templates | 17 | 22 | +5 |
| BFA conflict rules | CF-63 | CF-85 | +22 |
| Stress tests | ST-30 | ST-42 | +12 |
| Design records | DR-20 | DR-28 | +8 |
| Design decisions | DD-20 | DD-30 | +10 |
| Skill patterns | SK-28 | SK-40 | +12 |
| DNA patterns | 8 | 8 (stable) | 0 |
| DNA compliance cells | 604 | 604 + 352 = 956 | +352 |
| Iron rules (FLOW-08) | — | 176+ | +176 |
| Quality gates (FLOW-08) | — | 132+ | +132 |

---

# ═══════════════════════════════════════════════════
# SECTION 8 — RECOVERY COMMANDS
# ═══════════════════════════════════════════════════

```
"Show FLOW-08 plan"                  → Read FLOW08_MASTER_PLAN.md (this file)
"Start FLOW-08 P1"                   → Generate FLOW08_P1_TENANT_CONTROL_PLANE.md
"Start FLOW-08 P2"                   → Generate FLOW08_P2_CONTENT_ENGINE.md
"Start FLOW-08 P3"                   → Generate FLOW08_P3_COMMERCE_ENGINE.md
"Start FLOW-08 P4"                   → Generate FLOW08_P4_WORKFLOW_EXTENSIBILITY.md
"Start FLOW-08 P5"                   → Generate FLOW08_P5_SEARCH_NOTIFICATIONS.md
"Start FLOW-08 P6"                   → Generate FLOW08_P6_TASK_TYPES.md
"Start FLOW-08 P7"                   → Generate FLOW08_P7_BFA.md
"Start FLOW-08 P8"                   → Generate FLOW08_P8_SKILLS_INDEX.md
"Start FLOW-08 P9"                   → Generate validation + session state final
"Show FLOW-08 state"                 → Show current completion status
"Validate FLOW-08 plan"              → Run Section 4 validation checklist
"Show FLOW-08 examples"              → Section 5 (positive + negative examples)
"Show FLOW-08 RAG"                   → Section 6 (RAG retrieval index)
"Show FLOW-08 totals"                → Section 7 (system totals projection)
```

---

# ═══════════════════════════════════════════════════
# SECTION 9 — FIRST-TIME CAPABILITIES IN FLOW-08
# ═══════════════════════════════════════════════════

These capabilities are NEW to the XIIGen engine — not present in FLOW-01 through FLOW-07:

| Capability | Artifact | Why First |
|-----------|----------|-----------|
| Multi-tenant isolation as a factory family | Family 27 | Prior flows had DNA-5 but no dedicated CP family |
| Bridge/hybrid tenancy model routing | F245:ITenantIsolationRouter | No prior flow had multi-tenancy tier routing |
| Content state machine (Draft→Archived) | F252, T87–T90, EP-1 reuse | Prior state machines were social (friends/connections) |
| Commerce PSP abstraction | F263:IPaymentOrchestratorService | First payment/financial flow in XIIGen |
| Transactional Outbox pattern | F271:IOutboxEventService, SK-29 | No prior flow needed atomic write+event guarantee |
| Idempotency key store | F270:IIdempotencyKeyService, SK-30 | First explicit retry-safe deduplication |
| Optimistic locking for inventory | F260:IInventoryService, SK-32 | First "double-reservation prevention" |
| Scheduled content publish | T91, F257, SK-37, EP-2 reuse | First content-domain scheduled task |
| Plugin/App sandboxed extensibility | Family 31, T100–T102 | First app-platform extension point system |
| Webhook HMAC security | F274:IWebhookDeliveryService, SK-34 | First webhook with signed delivery guarantee |
| Per-tenant config and entitlements | F248, F249 | First factory for per-tenant runtime config variation |
| Tenant onboarding as a generated flow | Template 22, T83–T86 | First infrastructure provisioning flow |

---

# PLAN:P0 SAVE POINT ✅
# Status: MASTER PLAN COMPLETE
# Next: "Start FLOW-08 P1" → Generate Tenant Control Plane factories
# Prerequisite numbers: F244, Family 27, T83 available
