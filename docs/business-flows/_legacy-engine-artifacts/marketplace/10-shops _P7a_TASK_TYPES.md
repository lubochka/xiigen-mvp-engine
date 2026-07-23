# FLOW-10 — P7a: TASK TYPE ENGINE CONTRACTS (T103–T116)
## CMS + Commerce + Multi-Tenant Platform Engine
## Save Point: FLOW10:MERGE:P7a
## Merge Target: TASK_TYPES_CATALOG_MERGED.md
## Sequence: T1–T102 in catalog (FLOW-01 through FLOW-09). This file: T103–T116 (Part 1 of 2).

---

# FACTORY REFERENCE REMAP (source → actual)
# Source documents (P6a/P6b) used stale numbers. Correct FLOW-10 actual numbers:
#
# FLOW-08 REUSE (same in both):
#   F244 ITenantRegistryService, F245 ITenantConfigService,
#   F246 ITenantIsolationBindingService, F250 ITenantAuditService,
#   F251 ITenantEntitlementService, F260 IIdempotencyKeyService,
#   F268 ITenantScopedFlowRunnerService (EP-1/EP-2)
#
# FLOW-10 ACTUAL (remapped from source):
#   F288 IProductCatalogService, F289 IPriceRuleService,
#   F290 IInventoryService, F291 ICartService, F292 ICheckoutService,
#   F293 IPaymentOrchestratorService, F294 IOrderService,
#   F295 IShippingService, F296 ITaxService,
#   F297 IContentEntityService, F298 IContentWorkflowService,
#   F299 IMediaAssetService, F300 ITaxonomyService, F301 IRevisionService,
#   F302 ISeoMetaService, F303 IContentSchedulerService,
#   F304 IWorkflowDefinitionService, F305 IWorkflowExecutionService,
#   F306 IWorkflowTimerService, F307 IOutboxEventService,
#   F308 IDurableCompensationService,
#   F309 IAppRegistryService, F310 IAppInstallationService,
#   F311 IWebhookDeliveryService, F312 IScopePermissionService,
#   F313 IMetafieldService, F314 IExtensionPointService,
#   F315 ISearchIndexService, F316 ISearchQueryService,
#   F317 IFacetService, F318 ICachePurgeService, F319 IRecommendationService,
#   F320 INotificationTemplateService, F321 INotificationDispatchService,
#   F322 IEmailDeliveryService, F323 ISmsDeliveryService,
#   F324 IDeliveryTrackingService
#
# BFA CONFLICT RULES: CF-96 through CF-117 (FLOW-10 range)
# TASK TYPE OFFSET: source T83 → actual T103 (+20)

---

# ═══════════════════════════════════════════════════
# DOMAIN: TENANT CONTROL PLANE — T103–T106
# Archetypes: PROVISION, ORCHESTRATION
# ═══════════════════════════════════════════════════

## TASK TYPE: T103 — Tenant Onboarding Orchestrator

**ARCHETYPE:** PROVISION
**ENTRY:** HTTP POST to /tenants/provision with tenant registration payload, OR admin-triggered provisioning event via QUEUE FABRIC
**PURPOSE:** Execute the full idempotent multi-step tenant onboarding pipeline: validate payload → register tenant identity → determine isolation binding → provision data resources → initialize config defaults + entitlements → bootstrap identity mappings → activate tenant → emit tenant.onboarded event. Entire pipeline is a generated flow (Template 22) executed via F305:IWorkflowExecutionService.
**DISTINCT FROM:**
- T73 (FLOW-06 four-way parallel fork): T73 branches into parallel streams and merges. T103 is strictly sequential with rollback — no parallel branching.
- T77 (FLOW-07 friend request): T77 is two-party social confirmation. T103 is single-actor infrastructure provision.

**FACTORY DEPENDENCIES:** F244, F245, F246, F250, F251, F260, F268, F305
**FABRIC RESOLUTION:**
- F244 (ITenantRegistryService) → DATABASE FABRIC (Skill 05) → Elasticsearch
- F245 (ITenantConfigService) → DATABASE FABRIC (Skill 05) → Elasticsearch
- F246 (ITenantIsolationBindingService) → DATABASE FABRIC (Skill 05) → PostgreSQL
- F250 (ITenantAuditService) → DATABASE FABRIC (Skill 05) → Elasticsearch
- F251 (ITenantEntitlementService) → DATABASE FABRIC (Skill 05) → Elasticsearch
- F260 (IIdempotencyKeyService) → DATABASE FABRIC (Skill 05) → Redis + PostgreSQL
- F268 (ITenantScopedFlowRunnerService) → FLOW ENGINE FABRIC (Skill 08/09) → EP-1/EP-2
- F305 (IWorkflowExecutionService) → DATABASE FABRIC (Skill 05) → PostgreSQL + FLOW ENGINE FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: Generate onboarding service implementing Template 22 DAG steps via factory interfaces
- AF-2 Planning: 8 sequential steps: validatePayload → registerIdentity → determineIsolation → provisionResources → initConfig → initEntitlements → bootstrapIdentity → activateTenant
- AF-3 Prompt Library: "tenant onboarding", "idempotent provisioning", "infrastructure-as-flow"
- AF-4 RAG: SK-44 (Tenant Isolation Router), F246 isolation binding pattern
- AF-5 Multi-model: N/A — provisioning is deterministic
- AF-6 Code Review: Each step is factory call; no direct DB driver; rollback path exists
- AF-7 Compliance: DNA-1 through DNA-9; tenantId from step 1; all DataProcessResult<T>
- AF-8 Security: Encryption key provisioning; no plaintext secrets; audit every step
- AF-9 Judge: 10 quality gates
- AF-10 Merge: N/A
- AF-11 Feedback: Onboarding duration + step failure distribution

**BFA VALIDATION:**
- CF-96 (Cross-tenant data exposure — new tenant MUST get isolated resources)
- CF-97 (Duplicate tenant registration — idempotency prevents double-onboard)

**MACHINE:**
- Step order FIXED (validate first, activate last)
- Rollback: if any step fails after step 3, reverse all completed steps via F308
- All 8 steps via F305 (not inline code)
- Idempotency: F260 on provisionResources and activateTenant
- Audit: F250.RecordAuditEventAsync after EVERY step
- Status: pending → provisioning → configuring → activating → active

**FREEDOM:**
- Isolation binding (shared_schema | separate_schema | dedicated_db) — from F246, tier-driven
- Default entitlement set (starter | pro | enterprise) — from payload
- Provisioning timeout per step (default: 30s, max: 5 min total)
- Welcome notification on activation (default: true)

**IRON RULES:**
- IR-103-1: Registration MUST be idempotent via F260 — same payload twice → same tenantId
- IR-103-2: Isolation binding from F246 based on tier, not hardcoded = BUILD FAILURE
- IR-103-3: Each step MUST emit audit via F250 — missing = BUILD FAILURE
- IR-103-4: Status MUST reach "active" before tenant.onboarded event
- IR-103-5: Step failure → rollback all completed steps in reverse via F308
- IR-103-6: Tenant = Dictionary<string,object> — no typed class (DNA-1)
- IR-103-7: tenantId from step 1 propagated to all downstream (DNA-5)
- IR-103-8: Resource provisioning MUST use F260 idempotency — double-creation = BUILD FAILURE
- IR-103-9: No direct HTTP between services — all via factory (DNA-4)
- IR-103-10: Workflow tracked in F305 — manual orchestration = BUILD FAILURE

**QUALITY GATES (AF-9):**
- QG-103-1: Same payload twice → same result, no duplicate tenant
- QG-103-2: Step 5 failure → rollback steps 4,3,2,1
- QG-103-3: F250 has one audit entry per step
- QG-103-4: Starter tier → shared_schema; enterprise → dedicated_db (via F246)
- QG-103-5: Tenant NOT queryable until status="active"
- QG-103-6: F305 execution record shows all 8 steps with timing
- QG-103-7: tenantId in all factory calls from step 2 onward
- QG-103-8: No typed model — Dictionary<string,object> throughout
- QG-103-9: Validation error → DataProcessResult.Failure (not exception)
- QG-103-10: tenant.onboarded via QUEUE FABRIC, not direct HTTP

---

## TASK TYPE: T104 — Tenant Isolation Router Activation

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** tenant.onboarded event from QUEUE FABRIC (fired by T103)
**PURPOSE:** Activate runtime isolation binding in F246. For shared_schema: register in pooled routing + configure RLS. For separate_schema: create schema + run migrations + register route. For dedicated_db: verify DB ready + register connection pool. Emit tenant.isolation_activated event.
**DISTINCT FROM:**
- T103: provisions resources and records binding decision. T104 ACTIVATES runtime routing.
- T106: tears down what T104 activates.

**FACTORY DEPENDENCIES:** F244, F245, F246, F250
**FABRIC RESOLUTION:**
- F244 (ITenantRegistryService) → DATABASE FABRIC → Elasticsearch
- F245 (ITenantConfigService) → DATABASE FABRIC → Elasticsearch
- F246 (ITenantIsolationBindingService) → DATABASE FABRIC → PostgreSQL
- F250 (ITenantAuditService) → DATABASE FABRIC → Elasticsearch

**AF CONFIGURATION:**
- AF-1 Genesis: Generate isolation activation handler for 3 strategies via F246
- AF-2 Planning: readBinding → selectStrategy → executeStrategy → verify → registerRoute → emit
- AF-4 RAG: SK-44 (Tenant Isolation Router)
- AF-7 Compliance: DNA-5 (scope isolation enabled by this task)
- AF-8 Security: Schema creation must not leak adjacent schema data; verify RLS active
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:**
- CF-96 (Cross-tenant data exposure — routing must not map to existing tenant's scope)
- CF-98 (Isolation binding conflict — two tenants MUST NOT share same schema unless pooled)

**MACHINE:** Strategy from F246 (not hardcoded); all 3 strategies as factory-backed handlers; verified by smoke test
**FREEDOM:** Migration script set for separate_schema; connection pool size for dedicated_db; smoke test queries

**IRON RULES:**
- IR-104-1: Strategy from F246 — hardcoded = BUILD FAILURE
- IR-104-2: Smoke test MUST pass before event emitted
- IR-104-3: separate_schema: CREATE IF NOT EXISTS (idempotent)
- IR-104-4: dedicated_db: connection test before route registration
- IR-104-5: F250 audit on success AND failure
- IR-104-6: Routing entry: tenantId + isolationModel + activatedAt
- IR-104-7: DataProcessResult.Failure on smoke test failure
- IR-104-8: No tenantId collisions in routing table

**QUALITY GATES (AF-9):**
- QG-104-1: Shared_schema → tenantId in routing, RLS configured
- QG-104-2: Separate_schema → schema exists, migrations applied, route registered
- QG-104-3: Dedicated_db → connection successful, route registered
- QG-104-4: Smoke test via F315.ValidateTenantScopingAsync
- QG-104-5: No existing route modified during activation
- QG-104-6: Event payload: tenantId, isolationModel, activatedAt
- QG-104-7: DataProcessResult.Failure if smoke fails
- QG-104-8: F250 audit trail present

---

## TASK TYPE: T105 — Tenant Entitlement Provisioner

**ARCHETYPE:** PROVISION
**ENTRY:** tenant.isolation_activated event (from T104), OR admin plan change event
**PURPOSE:** Initialize/update entitlement set for tenant. Read plan tier from F244, resolve template from F251, store entitlements (feature flags, rate limits, quotas, provider bindings) in F245. Handle mid-lifecycle plan upgrades/downgrades. Emit tenant.entitlements_configured.
**DISTINCT FROM:**
- T103: triggers provisioning. T105 is distinct entitlement-only step.
- T104: activates data routing. T105 activates feature/limit routing. Sequential: T104 → T105.

**FACTORY DEPENDENCIES:** F244, F245, F250, F251
**FABRIC RESOLUTION:**
- F244 → DATABASE FABRIC → Elasticsearch
- F245 → DATABASE FABRIC → Elasticsearch
- F250 → DATABASE FABRIC → Elasticsearch
- F251 → DATABASE FABRIC → Elasticsearch

**AF CONFIGURATION:**
- AF-1 Genesis: Generate entitlement provisioner resolving plan template → config
- AF-2 Planning: readPlan → resolveTemplate → applyOverrides → storeConfig → emitEvent
- AF-4 RAG: F251 entitlement pattern; F245 config pattern
- AF-7 Compliance: DNA-5 on all entitlement records
- AF-8 Security: Downgrade cannot leave higher-tier features enabled
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:**
- CF-99 (Entitlement bleed — downgraded tenant retains enterprise features)
- CF-100 (Quota enforcement — limits enforced atomically)

**MACHINE:** Template per plan from F251 (not hardcoded); downgrade immediately disables above-tier features; all Dictionary<string,object> in F245
**FREEDOM:** Per-tenant entitlement overrides; metering baseline initialization

**IRON RULES:**
- IR-105-1: Template from F251 — hardcoded plan limits = BUILD FAILURE
- IR-105-2: Downgrade disables above-tier features BEFORE event emitted
- IR-105-3: All entitlements as Dictionary<string,object> (DNA-1)
- IR-105-4: tenantId scoped (DNA-5)
- IR-105-5: F250 audit on every change
- IR-105-6: DataProcessResult.Failure if plan template missing
- IR-105-7: Idempotent — same plan twice → same state

**QUALITY GATES (AF-9):**
- QG-105-1: Starter → starter features only
- QG-105-2: Enterprise → all features, higher quotas
- QG-105-3: Downgrade → enterprise features disabled immediately
- QG-105-4: Event has tenantId, plan, featureCount
- QG-105-5: Idempotent — same plan yields same count
- QG-105-6: F245 entries tenantId-scoped
- QG-105-7: F250 audit present
- QG-105-8: Unknown plan → DataProcessResult.Failure

---

## TASK TYPE: T106 — Tenant Offboarding Orchestrator

**ARCHETYPE:** PROVISION
**ENTRY:** Admin tenant.offboard_requested event OR scheduled offboarding (contract expiry)
**PURPOSE:** Full offboarding in reverse of onboarding: suspend sessions → disable webhooks → export data (if requested) → apply retention/legal hold → remove entitlements → deactivate routing → delete/archive per compliance → emit tenant.offboarded. Uses F305 for step tracking.
**DISTINCT FROM:**
- T103: creates. T106 destroys. Both multi-step provision flows via F305.
- T122 (App Uninstall): removes one app from one tenant. T106 removes entire tenant.

**FACTORY DEPENDENCIES:** F244, F245, F246, F250, F251, F260, F268, F305, F308, F310, F311
**FABRIC RESOLUTION:**
- F244 → DATABASE FABRIC → Elasticsearch
- F246 → DATABASE FABRIC → PostgreSQL
- F305 → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC
- F308 → DATABASE FABRIC → PostgreSQL (compensation)
- F310 → DATABASE FABRIC → PostgreSQL (app removal)
- F311 → QUEUE FABRIC (webhook disable)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate offboarding pipeline with legal hold check + GDPR compliance
- AF-2 Planning: 10 steps: confirm → legalHoldCheck → suspendSessions → disableWebhooks → removeApps → exportData → removeEntitlements → deactivateRouting → archiveData → emitOffboarded
- AF-4 RAG: T103 pattern (reverse), SK-44
- AF-7 Compliance: GDPR erasure path verified; legal hold blocks physical delete
- AF-8 Security: Physical delete evidence; legal hold enforcement
- AF-9 Judge: 10 quality gates

**BFA VALIDATION:**
- CF-101 (Offboarding active tenant without confirmation)
- CF-102 (Data deleted while under legal hold)

**MACHINE:** Confirmation token required; legal hold pauses offboarding at "suspended" status; each step idempotent via F260; tracked in F305
**FREEDOM:** Retention period; export format; whether to auto-offboard on contract expiry

**IRON RULES:**
- IR-106-1: Confirmation token MUST be validated
- IR-106-2: Legal hold → DataProcessResult.Failure, status stays "suspended"
- IR-106-3: All apps uninstalled before data archive (F310.UninstallAppAsync)
- IR-106-4: Data export before delete if requested
- IR-106-5: Isolation routing deactivated via F246
- IR-106-6: F250 audit per step (minimum 10 entries)
- IR-106-7: tenantId present on all operations (DNA-5)
- IR-106-8: Status = "offboarded" after completion
- IR-106-9: All steps tracked in F305
- IR-106-10: Physical delete ONLY if legal hold cleared

**QUALITY GATES (AF-9):**
- QG-106-1: Confirmation token validated
- QG-106-2: Legal hold → F305 shows pause at "suspended"
- QG-106-3: All app installations removed (F310 returns empty)
- QG-106-4: All webhooks disabled (F311 count = 0)
- QG-106-5: Export artifact location in audit log
- QG-106-6: F246 returns no route after deactivation
- QG-106-7: F250 audit trail ≥10 entries
- QG-106-8: Status = "offboarded" in F244
- QG-106-9: Legal hold → DataProcessResult.Failure
- QG-106-10: Event payload: tenantId, offboardedAt, dataStatus

---

# ═══════════════════════════════════════════════════
# DOMAIN: CONTENT LIFECYCLE — T107–T111
# Archetypes: STATE_MACHINE, COMPUTATION, SCHEDULED
# ═══════════════════════════════════════════════════

## TASK TYPE: T107 — Content Publish Gate

**ARCHETYPE:** STATE_MACHINE
**ENTRY:** Author/admin triggers publish_now on content entity via F298.TransitionAsync(contentId, "publish_now")
**PURPOSE:** Validate transition legality (from Draft or InReview only), execute atomic transition + outbox write via F307, fan-out side effects through QUEUE FABRIC: search re-index (F315), CDN cache purge (F318), SEO sitemap update (via F320 notification). Return updated content document.
**DISTINCT FROM:**
- T111 (Scheduled Publisher): T111 is timer-driven. T107 is human-action-driven. Both share fan-out.
- T77 (FLOW-07 Friend Request): two-party consent vs. single-actor transition.

**FACTORY DEPENDENCIES:** F260, F297, F298, F301, F307, F315, F318, F320
**FABRIC RESOLUTION:**
- F298 (IContentWorkflowService) → FLOW ENGINE FABRIC → EP-1 State Machine
- F301 (IRevisionService) → DATABASE FABRIC → Elasticsearch
- F307 (IOutboxEventService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F315 (ISearchIndexService) → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F318 (ICachePurgeService) → DATABASE FABRIC → Redis + QUEUE FABRIC
- F320 (INotificationTemplateService) → DATABASE FABRIC → Elasticsearch
- F260 (IIdempotencyKeyService) → DATABASE FABRIC → Redis + PostgreSQL

**AF CONFIGURATION:**
- AF-1 Genesis: Generate publish gate with atomic transition + outbox fan-out
- AF-2 Planning: validateTransition → createRevision → atomicTransitionWithOutbox → enqueueSearchReindex → enqueueCachePurge → enqueueSeoNotification → returnUpdated
- AF-4 RAG: SK-45 (Content State Machine), SK-46 (Transactional Outbox), EP-1 pattern
- AF-7 Compliance: DNA-1,3,5; no direct ES client
- AF-8 Security: Author authorization via CORE FABRIC permission
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:**
- CF-103 (Concurrent publish — two editors publish same content)
- CF-104 (Publish from archived state)

**MACHINE:** Legal sources: Draft, InReview only; transition + outbox in same PG transaction; side effects MUST be enqueued; revision snapshot before transition; concurrent detect via optimistic lock
**FREEDOM:** Active side effects per tenant (F245 config); notification template; purge strategy

**IRON RULES:**
- IR-107-1: Transition + outbox atomic — separate writes = BUILD FAILURE
- IR-107-2: Side effects via QUEUE FABRIC — direct call = BUILD FAILURE
- IR-107-3: tenantId on all downstream (DNA-5)
- IR-107-4: Invalid transition → DataProcessResult.Failure (not exception)
- IR-107-5: Content = Dictionary<string,object> (DNA-1)
- IR-107-6: Concurrent conflict → DataProcessResult.Conflict
- IR-107-7: Revision snapshot immutable, created before transition
- IR-107-8: Author permission validated before state change

**QUALITY GATES (AF-9):**
- QG-107-1: Draft→Published succeeds; Archived→Published fails
- QG-107-2: content.published in outbox after success
- QG-107-3: Search reindex enqueued (not inline)
- QG-107-4: CDN purge enqueued
- QG-107-5: Revision snapshot with publishedAt
- QG-107-6: tenantId in all fan-out events
- QG-107-7: Concurrent → DataProcessResult.Conflict
- QG-107-8: Updated document with status="published"

---

## TASK TYPE: T108 — Content Review Gate

**ARCHETYPE:** STATE_MACHINE
**ENTRY:** Author submits for review (Draft→InReview), OR reviewer approves/rejects (InReview→Draft|Scheduled|Published)
**PURPOSE:** Manage editorial review lifecycle. On submit: assign reviewer(s) via F298, notify via F321. On approve: transition to Scheduled (if date) or Published (publish_now). On reject: back to Draft with review notes. Emit appropriate events.
**DISTINCT FROM:**
- T107: handles direct publish_now. T108 manages review workflow that may result in T107 execution.
- T111: fires from timer. T108 may schedule content for T111.

**FACTORY DEPENDENCIES:** F245, F297, F298, F301, F307, F321
**FABRIC RESOLUTION:**
- F298 → FLOW ENGINE FABRIC → EP-1
- F301 → DATABASE FABRIC → Elasticsearch
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F321 → QUEUE FABRIC → Redis Streams

**AF CONFIGURATION:**
- AF-1 Genesis: Multi-path state machine (submit→InReview, approve→Published|Scheduled, reject→Draft)
- AF-2 Planning: validateTransition → validateActorRole → transitionWithOutbox → notify → return
- AF-4 RAG: SK-45, EP-1, T107
- AF-8 Security: Only reviewer role can approve/reject
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-103 (concurrent review), CF-105 (self-review blocked when configured)

**MACHINE:** Legal transitions: Draft→InReview, InReview→Draft|Scheduled|Published; atomic with outbox; review notes appended (immutable); role check via CORE FABRIC
**FREEDOM:** Self-review allowed (default: false); review notification template; reviewer assignment strategy

**IRON RULES:**
- IR-108-1: Role validated — non-reviewer approving = BUILD FAILURE
- IR-108-2: Self-review enforced when configured
- IR-108-3: Transitions atomic with outbox (DNA-3 + outbox pattern)
- IR-108-4: Review notes appended to F301 — not overwritten
- IR-108-5: tenantId on all ops (DNA-5)
- IR-108-6: Notification via F321 (QUEUE-based)
- IR-108-7: Invalid transition → DataProcessResult.Failure
- IR-108-8: All state as Dictionary<string,object> (DNA-1)

**QUALITY GATES (AF-9):**
- QG-108-1: Draft→InReview succeeds for author
- QG-108-2: InReview→Published requires reviewer role
- QG-108-3: Rejection notes in revision history
- QG-108-4: Review notification enqueued
- QG-108-5: Self-review blocked when configured
- QG-108-6: InReview→Scheduled creates timer in F306
- QG-108-7: Concurrent review → DataProcessResult.Conflict
- QG-108-8: Outbox events tenantId-scoped

---

## TASK TYPE: T109 — Content Archive Gate

**ARCHETYPE:** STATE_MACHINE
**ENTRY:** Admin/editor triggers archive on Published content (Published→Archived)
**PURPOSE:** Move to Archived. Remove from live search index (F315.DeleteFromIndexAsync). Purge CDN (F318). Update sitemap. Preserve revision history. Content stays in DB as Archived (not deleted). Emit content.archived.
**DISTINCT FROM:**
- T107: makes content live. T109 takes offline. Same pattern, opposite direction.
- T106: deletes all tenant data. T109 archives one entity preserving history.

**FACTORY DEPENDENCIES:** F298, F301, F307, F315, F318
**FABRIC RESOLUTION:**
- F298 → FLOW ENGINE FABRIC → EP-1
- F301 → DATABASE FABRIC → Elasticsearch
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F315 → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F318 → DATABASE FABRIC → Redis + QUEUE FABRIC

**AF CONFIGURATION:**
- AF-1: Archive handler with transition + index deletion + cache purge
- AF-2: validateTransition → atomicTransitionWithOutbox → enqueueIndexDelete → enqueueCachePurge → return
- AF-7: GDPR — archive ≠ delete; physical delete is separate GDPR flow
- AF-9 Judge: 6 quality gates

**BFA VALIDATION:** CF-104 (archive from non-Published), CF-106 (re-publish archived — blocked or explicit)

**MACHINE:** Source: Published only; archive ≠ delete (status="archived", record preserved); index entry MUST be deleted; CDN MUST be purged; revision history immutable
**FREEDOM:** Re-publish allowed (configurable); archive notification (default: no)

**IRON RULES:**
- IR-109-1: Archive ONLY from Published — other states = DataProcessResult.Failure
- IR-109-2: Content NOT deleted from DB — status "archived" only
- IR-109-3: Search index entry MUST be deleted
- IR-109-4: CDN purge via QUEUE FABRIC
- IR-109-5: Transition atomic with outbox
- IR-109-6: tenantId (DNA-5)
- IR-109-7: Revision history append-only
- IR-109-8: Archived→Archived = DataProcessResult.Failure

**QUALITY GATES (AF-9):**
- QG-109-1: Published→Archived succeeds; Draft→Archived fails
- QG-109-2: content.archived outbox in same transaction
- QG-109-3: Index delete enqueued
- QG-109-4: CDN purge enqueued
- QG-109-5: DB record exists with status="archived"
- QG-109-6: Revision has archive entry with archivedAt

---

## TASK TYPE: T110 — Media Asset Processor

**ARCHETYPE:** COMPUTATION
**ENTRY:** media.upload_requested event from QUEUE FABRIC after file upload, OR admin re-process
**PURPOSE:** Process uploaded media: validate file type + size, generate derivatives (thumbnails, responsive sizes, format conversions), extract metadata (dimensions, EXIF), store via F299, update CDN bindings, emit media.processed. AI alt-text generation via AI ENGINE FABRIC (opt-in).
**DISTINCT FROM:**
- T107: transitions content state. T110 processes raw media files. Prerequisite for T107 when content has media.
- T117 (Product Update Fan-Out): propagates data changes. T110 transforms binary assets.

**FACTORY DEPENDENCIES:** F245, F251, F299, F318
**FABRIC RESOLUTION:**
- F299 (IMediaAssetService) → DATABASE FABRIC → Elasticsearch + object storage binding
- F318 (ICachePurgeService) → DATABASE FABRIC → Redis + QUEUE FABRIC
- F251 (ITenantEntitlementService) → DATABASE FABRIC → Elasticsearch
- F245 (ITenantConfigService) → DATABASE FABRIC → Elasticsearch

**AF CONFIGURATION:**
- AF-1: Generate media processor with validation, derivatives, metadata extraction
- AF-2: validateFileType → validateQuota(F251) → generateDerivatives → extractMetadata → storeAssetRecord(F299) → updateCdn → emit
- AF-5 Multi-model: AI alt-text generation (optional, gated by F251)
- AF-8 Security: Magic-byte file validation (not just MIME/extension); no executable upload
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-107 (storage quota exceeded — media upload denied after quota), CF-108 (malicious file type — executable disguised as image)

**MACHINE:** Derivative sizes from F245 config; storage quota from F251; magic-byte validation MANDATORY; AI alt-text via AI ENGINE FABRIC when enabled; storage provider (S3/R2/Azure) via F245 binding
**FREEDOM:** Derivative sizes; AI alt-text (opt-in); max file size per plan; CDN path format

**IRON RULES:**
- IR-110-1: File type validated by magic bytes — MIME trust = BUILD FAILURE
- IR-110-2: Quota checked via F251 before processing
- IR-110-3: Storage provider via F245 binding — direct S3 SDK = BUILD FAILURE
- IR-110-4: Asset record as Dictionary<string,object> (DNA-1)
- IR-110-5: tenantId on all assets and derivatives (DNA-5)
- IR-110-6: AI alt-text only when F251.IsFeatureEnabledAsync("ai_alt_text")
- IR-110-7: DataProcessResult.Failure on invalid file type or quota exceeded
- IR-110-8: No executable content accepted regardless of extension

**QUALITY GATES (AF-9):**
- QG-110-1: Valid image → derivatives generated (thumbnail, responsive)
- QG-110-2: Executable disguised as image → DataProcessResult.Failure
- QG-110-3: Quota exceeded → DataProcessResult.Failure before processing
- QG-110-4: AI alt-text generated when feature enabled
- QG-110-5: Asset record in F299 with tenantId + all derivative URLs
- QG-110-6: CDN binding updated after processing
- QG-110-7: Storage via F245 provider binding (no direct SDK)
- QG-110-8: media.processed event with assetId, tenantId, derivativeCount

---

## TASK TYPE: T111 — Scheduled Content Publisher

**ARCHETYPE:** SCHEDULED
**ENTRY:** EP-2 timer fires for content where state=Scheduled and scheduledAt has passed. Timer set by T108 (InReview→Scheduled) or direct schedule action.
**PURPOSE:** Execute time-delayed publish. Validate content still Scheduled (may have been manually changed). If still Scheduled: execute identical fan-out as T107 (search index, CDN purge, notification). If no longer Scheduled: no-op. Idempotent via F260. Missed timer recovery on startup.
**DISTINCT FROM:**
- T107: human-triggered publish_now. T111 is timer-triggered. Same side effects, different entry.
- T82 (FLOW-07 Connection Rebalancer): also SCHEDULED but operates on graph weights, not content.

**FACTORY DEPENDENCIES:** F260, F297, F298, F301, F303, F306, F307, F315, F318, F320
**FABRIC RESOLUTION:**
- F298 → FLOW ENGINE FABRIC → EP-1
- F303 (IContentSchedulerService) → FLOW ENGINE FABRIC → EP-2 Durable Timer
- F306 (IWorkflowTimerService) → FLOW ENGINE FABRIC → EP-2
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F260 → DATABASE FABRIC → Redis + PostgreSQL
- F315 → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F318 → DATABASE FABRIC → Redis + QUEUE FABRIC

**AF CONFIGURATION:**
- AF-1: Generate scheduled publisher invoked by EP-2 timer event
- AF-2: validateStillScheduled → executePublishFanOut (T107 reuse) → markTimerFired → emit
- AF-4 RAG: SK-47 (Scheduled Publish with EP-2), SK-46 (Outbox), T107 fan-out reuse
- AF-8 Security: Timer payload must be signed/validated (no arbitrary tenantId injection)
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:**
- CF-103 (Concurrent — timer fires while human publishes manually)
- CF-109 (Missed timer — content not published during scheduler downtime)

**MACHINE:** Timer payload: tenantId, contentId, scheduledAt, idempotencyKey; validate state=Scheduled first; stale timer = no-op (Success, no transition); missed recovery via F306.RecoverMissedTimersAsync on startup
**FREEDOM:** Max missed-timer latency before alert (default: 5 min); auto vs. manual recovery

**IRON RULES:**
- IR-111-1: Validate state=Scheduled at fire time — stale timer = no-op (not error)
- IR-111-2: Timer fire idempotent via F260 — double-fire = same result
- IR-111-3: Missed timer recovery MUST be implemented
- IR-111-4: Transition + outbox atomic (same as IR-107-1)
- IR-111-5: Timer payload: tenantId + contentId + scheduledAt
- IR-111-6: Side effects via QUEUE FABRIC (same as IR-107-2)
- IR-111-7: DataProcessResult.Failure only on actual error, not stale no-op
- IR-111-8: EP-2 is ONLY timer mechanism — cron/sleep = BUILD FAILURE

**QUALITY GATES (AF-9):**
- QG-111-1: Timer fires at scheduled time → Published
- QG-111-2: Timer fires after manual publish → no-op (already Published)
- QG-111-3: Timer fires twice (crash+replay) → idempotent, published once
- QG-111-4: Missed timer on startup → delayed publish executed
- QG-111-5: All side effects (index, purge, notify) enqueued
- QG-111-6: Timer record in F306 marked "fired"
- QG-111-7: Timer payload includes tenantId (DNA-5)
- QG-111-8: Stale timer (archived before fire) → Success with no-op flag

---

# ═══════════════════════════════════════════════════
# DOMAIN: COMMERCE CHECKOUT — T112–T116
# Archetypes: ORCHESTRATION, TRANSACTIONAL, STATE_MACHINE, SCHEDULED
# ═══════════════════════════════════════════════════

## TASK TYPE: T112 — Cart-to-Checkout Converter

**ARCHETYPE:** ORCHESTRATION
**ENTRY:** HTTP POST to checkout creation — shopper converts active cart into checkout session
**PURPOSE:** Validate cart ≥1 item, verify inventory (non-reserving), freeze cart snapshot into checkout (F292), reserve inventory (F290 with idempotency key), set checkout expiry timer (F306). Return session with line items, subtotal, shipping options.
**DISTINCT FROM:**
- T113: handles payment + order creation. T112 creates checkout that T113 completes. Sequential.
- First cart-freeze + inventory-reservation gate in the engine.

**FACTORY DEPENDENCIES:** F260, F289, F290, F291, F292, F306
**FABRIC RESOLUTION:**
- F290 (IInventoryService) → DATABASE FABRIC → PostgreSQL
- F291 (ICartService) → DATABASE FABRIC → Redis + PostgreSQL
- F292 (ICheckoutService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F306 (IWorkflowTimerService) → FLOW ENGINE FABRIC → EP-2
- F260 (IIdempotencyKeyService) → DATABASE FABRIC → Redis + PostgreSQL
- F289 (IPriceRuleService) → DATABASE FABRIC → Elasticsearch + AI ENGINE FABRIC

**AF CONFIGURATION:**
- AF-1: Cart-to-checkout handler with atomic cart freeze + reservation
- AF-2: validateCart → recalculatePrices(F289) → checkAvailability → createCheckout(F292) → reserveInventory(F290) → setExpiryTimer(F306) → return
- AF-4 RAG: SK-48 (Optimistic Locking), SK-49 (Idempotency), F290/F292 patterns
- AF-8 Security: Price MUST be server-computed (never trust client price)
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:**
- CF-110 (Last-unit conflict — two carts checkout same SKU)
- CF-111 (Stale price — changed between add-to-cart and checkout)

**MACHINE:** Price server-recomputed at checkout (F289); reservation via F290 with F260 key; expiry timer 10 min (EP-2 via F306); concurrent reservation conflict → DataProcessResult.Conflict
**FREEDOM:** Expiry duration (default: 10 min, per tenant F245); price rule context (web|mobile|pos)

**IRON RULES:**
- IR-112-1: Price server-computed — client price ignored
- IR-112-2: Reservation via F260 idempotency key
- IR-112-3: Reservation failure → Conflict, no checkout created
- IR-112-4: Expiry timer via EP-2 (F306) — not DB TTL only
- IR-112-5: Cart frozen at checkout — mutations don't affect checkout
- IR-112-6: tenantId (DNA-5)
- IR-112-7: No typed Cart/Checkout class (DNA-1)
- IR-112-8: Concurrent checkout from same cart → idempotent (returns existing)

**QUALITY GATES (AF-9):**
- QG-112-1: Server price differs from cart → server price used
- QG-112-2: Inventory reserved for all items before return
- QG-112-3: Expiry timer set in F306 with checkoutId + tenantId
- QG-112-4: Concurrent checkout → idempotent, one session
- QG-112-5: Last-unit conflict → one Success, one Conflict
- QG-112-6: Checkout has expiresAt field
- QG-112-7: Cart frozen (mutations rejected)
- QG-112-8: Empty cart → DataProcessResult.Failure

---

## TASK TYPE: T113 — Checkout Payment Orchestrator

**ARCHETYPE:** TRANSACTIONAL
**ENTRY:** HTTP POST to checkout confirm — shopper submits payment method
**PURPOSE:** Most critical transaction in commerce pipeline. Steps (all idempotent): lock checkout → compute tax (F296) → authorize payment (F293) → capture payment (F293) → commit inventory (F290) → create order (F294) → emit order.created via F307 outbox → release lock → return confirmation. Double-charge prevention via F260. Concurrent confirms serialized.
**DISTINCT FROM:**
- T112: creates session and reserves inventory. T113 finalizes payment and creates order. Irreversible step.
- T115: handles post-purchase returns. T113 handles initial capture. Both use F293 but opposite.

**FACTORY DEPENDENCIES:** F260, F290, F292, F293, F294, F295, F296, F307
**FABRIC RESOLUTION:**
- F290 (IInventoryService) → DATABASE FABRIC → PostgreSQL (ACID)
- F292 (ICheckoutService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F293 (IPaymentOrchestratorService) → AI ENGINE FABRIC → PSP via provider binding
- F294 (IOrderService) → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC
- F295 (IShippingService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F296 (ITaxService) → DATABASE FABRIC → PostgreSQL + AI ENGINE FABRIC
- F260 (IIdempotencyKeyService) → DATABASE FABRIC → Redis + PostgreSQL
- F307 (IOutboxEventService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC

**AF CONFIGURATION:**
- AF-1: Checkout confirm with payment capture + order creation + double-charge prevention
- AF-2: validateActive → lockSession → computeTax(F296) → authorize(F293) → capture(F293) → commitInventory(F290) → createOrder(F294) → outboxOrderCreated(F307) → releaseLock → return
- AF-4 RAG: SK-49 (Idempotency), SK-48 (Optimistic Locking), SK-46 (Outbox), SK-50 (PSP Abstraction)
- AF-7 Compliance: DNA-3 payment failure = DataProcessResult.Failure; PCI — raw card NEVER in logs
- AF-8 Security: Raw card data MUST NOT appear in any generated service (DR-30, tokenized only)
- AF-9 Judge: 10 quality gates

**BFA VALIDATION:**
- CF-112 (Double-charge — concurrent confirm same checkout)
- CF-113 (Inventory committed after payment failure — must release)
- CF-114 (Order created without successful capture — must not happen)

**MACHINE:** Session locked during confirm; idempotencyKey = tenantId:checkoutId:confirm; authorize+capture combined or separate (F245 config); capture fails → void auth + release inventory; order via F307 outbox
**FREEDOM:** Single vs. two-step payment (F245); tax provider (F296 config); order number format

**IRON RULES:**
- IR-113-1: Payment uses F260 idempotency keys — no key = BUILD FAILURE
- IR-113-2: PSP ONLY via F293 — direct Stripe/Braintree = BUILD FAILURE (DR-30)
- IR-113-3: Raw card data NEVER in any service, log, or event payload
- IR-113-4: Inventory committed only after successful capture
- IR-113-5: Capture fails → void auth + release reservation
- IR-113-6: Order via F294, not direct DB insert
- IR-113-7: order.created via F307 outbox (same transaction as order)
- IR-113-8: Session locked during confirm — prevents double-charge
- IR-113-9: Payment decline → DataProcessResult.Failure (not exception)
- IR-113-10: All ops scoped to tenantId (DNA-5)

**QUALITY GATES (AF-9):**
- QG-113-1: Concurrent confirms → one order, no double charge
- QG-113-2: Declined → Failure; inventory NOT committed; order NOT created
- QG-113-3: Capture fails after auth → void auth, release inventory
- QG-113-4: Order created ONLY after capture success
- QG-113-5: order.created in outbox same transaction as order record
- QG-113-6: No raw card number in any generated record
- QG-113-7: Tax included in order total
- QG-113-8: Checkout status="completed" after success
- QG-113-9: PSP call via F293 (no SDK import)
- QG-113-10: tenantId on all PG records

---

## TASK TYPE: T114 — Order Fulfillment Gate

**ARCHETYPE:** STATE_MACHINE
**ENTRY:** order.paid event from QUEUE FABRIC (emitted by T113 outbox)
**PURPOSE:** Transition order from paid→fulfillment_pending. Trigger fulfillment: select location, create shipment (F295), assign tracking, notify customer (F321). On fulfillment_created: transition to fulfilled→delivery_pending. On delivered_confirmed: transition to delivered. Emit lifecycle events.
**DISTINCT FROM:**
- T113: creates order. T114 fulfills it. T114 begins where T113 ends.
- T115: handles returns after delivery. T114 handles progression toward delivery.

**FACTORY DEPENDENCIES:** F250, F260, F294, F295, F307, F321
**FABRIC RESOLUTION:**
- F294 (IOrderService) → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC (EP-1)
- F295 (IShippingService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F321 → QUEUE FABRIC → Redis Streams

**AF CONFIGURATION:**
- AF-1: Fulfillment state machine for order lifecycle
- AF-2: readOrder → transitionToPending → selectLocation → createShipment(F295) → transitionFulfilled → notify(F321) → emit
- AF-4 RAG: SK-45 adapted for order states, EP-1, T107 atomic transition
- AF-8 Security: Carrier via F295 only — no direct carrier SDK
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-115 (Double fulfillment), CF-116 (Fulfillment of cancelled order)

**MACHINE:** Transitions via EP-1 through F294; shipping via F295 only; notifications via F321 (QUEUE)
**FREEDOM:** Fulfillment location selection strategy; carrier preference; tracking notification template

**IRON RULES:**
- IR-114-1: State transitions via F294 + EP-1 only
- IR-114-2: Shipment via F295 — carrier SDK = BUILD FAILURE
- IR-114-3: Notifications via F321 (QUEUE) — direct email = BUILD FAILURE
- IR-114-4: Fulfilled state requires shipment creation confirmation
- IR-114-5: Delivered state requires carrier delivery confirmation
- IR-114-6: tenantId on all operations (DNA-5)
- IR-114-7: Order as Dictionary<string,object> (DNA-1)
- IR-114-8: Double fulfillment check via F260 idempotency

**QUALITY GATES (AF-9):**
- QG-114-1: order.paid → fulfillment_pending transition
- QG-114-2: Shipment created via F295 with tracking number
- QG-114-3: fulfilled→delivery_pending after F295 confirms
- QG-114-4: Customer notification dispatched via F321
- QG-114-5: delivered after carrier confirmation
- QG-114-6: Double fulfillment → idempotent (existing shipment returned)
- QG-114-7: Cancelled order → DataProcessResult.Failure
- QG-114-8: All order lifecycle events in outbox

---

## TASK TYPE: T115 — Order Return & Refund Gate

**ARCHETYPE:** TRANSACTIONAL
**ENTRY:** HTTP POST to /orders/{orderId}/return — customer or admin initiates return
**PURPOSE:** Validate return eligibility (order delivered, within return window), create return record, optionally restock inventory (F290), process refund via F293, transition order state, emit order.returned event via F307 outbox, notify customer via F321. Idempotent via F260.
**DISTINCT FROM:**
- T113: initial payment capture. T115: post-purchase refund. Both use F293, opposite direction.
- T114: progression toward delivery. T115: reversal after delivery.

**FACTORY DEPENDENCIES:** F260, F290, F293, F294, F307, F321
**FABRIC RESOLUTION:**
- F290 → DATABASE FABRIC → PostgreSQL
- F293 → AI ENGINE FABRIC → PSP via binding
- F294 → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC (EP-1)
- F260 → DATABASE FABRIC → Redis + PostgreSQL
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F321 → QUEUE FABRIC → Redis Streams

**AF CONFIGURATION:**
- AF-1: Return/refund handler with eligibility check, restock, idempotent refund
- AF-2: validateEligibility → createReturn → optionalRestock(F290) → refund(F293) → transitionState(F294) → outboxReturn(F307) → notify(F321)
- AF-4 RAG: SK-49 (Idempotency), SK-50 (PSP), T113 shared F293 pattern
- AF-8 Security: PSP refund via F293 only; raw payment data never in return record
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-117 (Double-refund prevention), CF-118 (Return window exceeded)

**MACHINE:** Refund key: tenantId:orderId:returnId:refund; eligibility: delivered state + return window from F245; restock optional (restockable flag); partial refund via F293
**FREEDOM:** Return window (default: 30 days, per tenant); auto-restock vs. manual; refund method (PSP/credit)

**IRON RULES:**
- IR-115-1: Refund idempotent via F260 — double = BUILD FAILURE
- IR-115-2: Eligibility checked — out-of-window = DataProcessResult.Failure
- IR-115-3: Refund via F293 only — direct PSP SDK = BUILD FAILURE
- IR-115-4: Order transitions via F294 + EP-1
- IR-115-5: order.returned via F307 outbox
- IR-115-6: Notification via F321 (QUEUE)
- IR-115-7: PSP refund decline → DataProcessResult.Failure
- IR-115-8: tenantId on all ops (DNA-5)

**QUALITY GATES (AF-9):**
- QG-115-1: Return within window → refund processed
- QG-115-2: Out of window → DataProcessResult.Failure
- QG-115-3: Double refund → idempotent (existing result)
- QG-115-4: Inventory restocked when restockable=true
- QG-115-5: Order → returned→refunded via EP-1
- QG-115-6: order.returned outbox event
- QG-115-7: Customer notification via F321
- QG-115-8: Partial refund: correct amount (not full total)

---

## TASK TYPE: T116 — Inventory Reservation Expiry Handler

**ARCHETYPE:** SCHEDULED
**ENTRY:** EP-2 timer fires for checkout whose expiresAt has passed (timer set by T112)
**PURPOSE:** Release inventory reservation held by expired/abandoned checkout. Release via F290 with F260 idempotency key. Transition checkout to "abandoned". Emit checkout.abandoned for remarketing pipeline (F321 abandoned cart sequence). Clear Redis cart.
**DISTINCT FROM:**
- T111: SCHEDULED to publish content. T116: SCHEDULED to release resources. Different domain.
- T112: reserves inventory and sets expiry. T116 fires on expiry. Compensating pair.

**FACTORY DEPENDENCIES:** F260, F290, F291, F292, F306, F321
**FABRIC RESOLUTION:**
- F290 → DATABASE FABRIC → PostgreSQL
- F291 → DATABASE FABRIC → Redis + PostgreSQL
- F292 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F306 → FLOW ENGINE FABRIC → EP-2
- F260 → DATABASE FABRIC → Redis + PostgreSQL
- F321 → QUEUE FABRIC → Redis Streams

**AF CONFIGURATION:**
- AF-1: Expiry handler triggered by EP-2 timer
- AF-2: validateExpired → releaseReservation(F290) → abandonCheckout(F292) → clearCart(F291) → emitAbandoned → scheduleRemarketing(F321)
- AF-4 RAG: SK-47 (EP-2 Timer), SK-49 (Idempotency), T112 pair
- AF-8 Security: Timer not spoofable (EP-2 signed)
- AF-9 Judge: 6 quality gates

**BFA VALIDATION:**
- CF-119 (Release after successful checkout — timer fires after order → no-op)
- CF-110 (Double-release — timer fires twice due to crash)

**MACHINE:** Status check FIRST: completed = no-op; release key: tenantId:checkoutId:release; remarketing via F321 (opt-in)
**FREEDOM:** Remarketing sequence (template + timing); whether to fire remarketing (default: true)

**IRON RULES:**
- IR-116-1: Release checks checkout status — release after completed = BUILD FAILURE
- IR-116-2: Release idempotent via F260 — double-release = BUILD FAILURE
- IR-116-3: EP-2 is ONLY timer — other timer = BUILD FAILURE
- IR-116-4: Release via F290 only — direct DB update = BUILD FAILURE
- IR-116-5: checkout.abandoned event MUST be emitted
- IR-116-6: tenantId (DNA-5)
- IR-116-7: DataProcessResult.Success even on no-op (completed checkout)
- IR-116-8: Cart cleared from Redis after abandonment

**QUALITY GATES (AF-9):**
- QG-116-1: Checkout expires → inventory released, status="abandoned"
- QG-116-2: Timer after completed → no-op, inventory NOT released
- QG-116-3: Timer twice → idempotent, released once
- QG-116-4: checkout.abandoned event emitted
- QG-116-5: Remarketing notification via F321 (when enabled)
- QG-116-6: Cart cleared from Redis

---

## P7a SAVE POINT ✅

**Contents:** T103–T116 (14 task types)
- Tenant Control Plane: T103 (Onboarding), T104 (Isolation Activation), T105 (Entitlement), T106 (Offboarding)
- Content Lifecycle: T107 (Publish), T108 (Review), T109 (Archive), T110 (Media), T111 (Scheduled Publish)
- Commerce Checkout: T112 (Cart-to-Checkout), T113 (Payment Orchestrator), T114 (Fulfillment), T115 (Return/Refund), T116 (Reservation Expiry)

**Archetypes covered:** PROVISION (T103,T105,T106), ORCHESTRATION (T104,T112), STATE_MACHINE (T107,T108,T109,T114), COMPUTATION (T110), TRANSACTIONAL (T113,T115), SCHEDULED (T111,T116)

**Iron rules:** 14 task types × 8 avg = ~112 iron rules
**Quality gates:** 14 task types × 8 avg = ~112 quality gates
**BFA conflict rules referenced:** CF-96 through CF-119

**Next:** P7b → T117–T124 + AF Station Map + Flow Templates 20–24
**Recovery:** "Continue FLOW-10 from P7b" → Start P7b
