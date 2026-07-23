# FLOW-20 ENGINE ARCHITECTURE
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Factory Families 60–75 | F466–F575 | DR-66–DR-77
## Save Point: FLOW20:P1:ARCH ✅

---

```
Pre-FLOW-20 State:
  Factories:   F1–F465     (465 total, Families 1–59)
  Task Types:  T1–T178     (178 total)
  BFA Rules:   CF-1–CF-213 (213 total)
  Skills:      SK-1–SK-98  (98 total)
  DDs:         DD-1–DD-85  (85 total)
  DRs:         DR-1–DR-65  (65 total)

Post-FLOW-20 State:
  Factories:   F1–F575     (575 total, Families 1–75)  +110
  Task Types:  T1–T198     (198 total)                 +20
  BFA Rules:   CF-1–CF-237 (237 total)                 +24
  Skills:      SK-1–SK-112 (112 total)                 +14
  DDs:         DD-1–DD-101 (101 total)                 +16
  DRs:         DR-1–DR-77  (77 total)                  +12
```

---

# FAMILY 60 — Graph Gateway & Versioning
## F466–F471 | Scope: API edge, versioning, request normalization, abuse prevention

Every external developer call enters the platform through this family. The Gateway
is responsible for routing, version negotiation, request normalization, pagination,
batch request assembly, and abuse prevention. No domain service ever accepts raw
external calls directly — they receive only pre-validated, scope-resolved, tenant-
resolved events from this family.

```
F466  IGraphDepthConfigService
      FABRIC:  DATABASE FABRIC → Elasticsearch (FREEDOM config index)
      PURPOSE: Reads per-tenant, per-app-tier maximum traversal depth limit from
               FREEDOM config at runtime. Never hardcoded. Violation requests
               receive partial-error responses, not 400 rejections, so valid
               subsets of the query are still served. (DD-96)
      METHODS: GetDepthLimitAsync(tenantId, appTier) → DataProcessResult<int>
               UpdateDepthLimitAsync(tenantId, appTier, limit) → DataProcessResult<bool>
      DNA:     ParseDocument — depth config stored as Dictionary<string,object>
               MicroserviceBase — scope isolation on tenantId

F467  IApiVersionService
      FABRIC:  DATABASE FABRIC → Elasticsearch (version manifest index)
      PURPOSE: Manages API version lifecycle (active, deprecated, sunset).
               Resolves incoming request version → internal routing version.
               Emits deprecation warnings in response headers when app uses
               a version within 90 days of sunset. (DD-86, DR-66)
      METHODS: ResolveVersionAsync(requestedVersion) → DataProcessResult<VersionRoute>
               GetDeprecationWarningAsync(version) → DataProcessResult<string?>
               ListActiveVersionsAsync() → DataProcessResult<List<object>>
      DNA:     DynamicController — routes version-aware without entity-specific logic
               DataProcessResult<T> — never throw on unknown version; return 404-result

F468  IRequestNormalizerService
      FABRIC:  CORE FABRIC (MicroserviceBase ObjectProcessor)
      PURPOSE: Normalises incoming graph path requests to internal canonical form:
               /{nodeId}/{edge}?fields=... → NormalisedGraphRequest (Dictionary).
               Parses field projection tokens, validates pagination cursors, extracts
               batch IDs. Output feeds F474 QueryPlanner. (DD-86)
      METHODS: NormalizeAsync(rawRequest) → DataProcessResult<Dictionary<string,object>>
               ValidatePaginationCursorAsync(cursor) → DataProcessResult<bool>
      DNA:     ParseDocument — NormalisedGraphRequest is Dictionary, never typed class
               BuildSearchFilter — empty fields (empty field set, null cursor) skipped

F469  IPaginationService
      FABRIC:  DATABASE FABRIC → Elasticsearch (cursor state index)
      PURPOSE: Manages opaque cursor-based pagination for graph result sets.
               Cursors encode: nodeId + edge + offset + sort key + expiry.
               Cursors are tenant-scoped; cross-tenant cursor use returns empty result.
      METHODS: EncodeCursorAsync(context) → DataProcessResult<string>
               DecodeCursorAsync(cursor, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsExpiredAsync(cursor) → DataProcessResult<bool>
      DNA:     Scope Isolation — tenantId embedded in cursor and verified on decode

F470  IBatchRequestService
      FABRIC:  QUEUE FABRIC → Redis Streams (batch assembly stream)
      PURPOSE: Accepts up to N sub-requests in a single API call, fans them out
               to the queue as individual events, collects results within timeout,
               returns array of sub-responses with per-item success/error.
               N limit is FREEDOM config (F466 depth config extended to batch).
      METHODS: SubmitBatchAsync(batchItems, tenantId) → DataProcessResult<string> (batchId)
               AwaitBatchResultAsync(batchId, timeout) → DataProcessResult<List<object>>
      DNA:     DataProcessResult<T> — partial batch failures are results, not exceptions
               QUEUE FABRIC — batch fan-out is via EnqueueAsync, never direct call

F471  IAbusePreventionService
      FABRIC:  DATABASE FABRIC → Redis (token-bucket counters) + ES (pattern index)
      PURPOSE: Detects token sharing, scraping patterns, and coordinated abuse before
               requests reach domain services. Checks velocity per token, IP, and
               app ID. Flags suspicious patterns to F573 AbuseDetectionService
               for deeper analysis. Returns allow/rate-limit/block decision.
      METHODS: CheckAbuseSignalsAsync(requestContext) → DataProcessResult<AbuseDecision>
               RecordRequestAsync(requestContext) → DataProcessResult<bool>
               ReportSuspiciousPatternAsync(pattern) → DataProcessResult<bool>
      DNA:     DataProcessResult<AbuseDecision> — AbuseDecision is Dictionary
               Scope Isolation — counters keyed by tenantId + tokenId
```

---

# FAMILY 61 — Schema & Field Projection
## F472–F474 | Scope: Object type registry, field selection, query planning

```
F472  ISchemaRegistryService
      FABRIC:  DATABASE FABRIC → Elasticsearch (schema manifest index)
      PURPOSE: Stores the platform's object model: node types (User, Post, Page,
               Campaign, AdAccount…), their fields, edge definitions, and field-level
               permission scope requirements. Schema changes are versioned and immutable
               once published (DD-95 extends to schema as well as flow specs).
      METHODS: GetNodeSchemaAsync(nodeType, schemaVersion) → DataProcessResult<Dictionary<string,object>>
               GetEdgeDefinitionAsync(nodeType, edgeName) → DataProcessResult<Dictionary<string,object>>
               ListFieldsAsync(nodeType, callerScopes) → DataProcessResult<List<object>>
      DNA:     ParseDocument — schema stored as Dictionary; no typed NodeSchema class
               Scope Isolation — tenant custom fields scoped by tenantId

F473  IFieldProjectionService
      FABRIC:  DATABASE FABRIC → Elasticsearch (schema + field-permission index)
      PURPOSE: Given a requested field set (from F468 normalised request) and caller
               scopes, produces the authorized projection: fields the caller may receive.
               Fields requiring elevated scopes are silently excluded (not errored) unless
               the caller explicitly requested them (then included in partial-error list).
               Depth limit enforced via F466. (DD-87, DD-96)
      METHODS: ProjectFieldsAsync(nodeType, requestedFields, callerScopes, tenantId)
                 → DataProcessResult<FieldProjectionResult>
               GetPartialErrorsAsync(excluded, callerScopes) → DataProcessResult<List<object>>
      DNA:     DataProcessResult<FieldProjectionResult> — FieldProjectionResult is Dictionary

F474  IQueryPlannerService
      FABRIC:  AI ENGINE FABRIC (plan optimisation) + DATABASE FABRIC → ES (service registry)
      PURPOSE: Decomposes a normalised graph request into an execution plan: which internal
               domain service handles each node type, which edges require joins, which sub-
               requests can be parallelised via F489 DomainFederator, and which can be
               served from F490/F491 cache. AI ENGINE FABRIC used for plan optimisation
               heuristics (not for data fetch). Results are deterministic plans (Dictionaries).
      METHODS: BuildPlanAsync(normalisedRequest, tenantId) → DataProcessResult<Dictionary<string,object>>
               EstimateCostAsync(plan) → DataProcessResult<Dictionary<string,object>>
      DNA:     ParseDocument — plan is Dictionary<string,object>
               DataProcessResult<T> — unresolvable node types return partial-error result
```

---

# FAMILY 62 — Identity & OAuth for Developer Apps
## F475–F480 | Scope: App registration, token lifecycle, scope enforcement

```
F475  IAppRegistryService
      FABRIC:  DATABASE FABRIC → PostgreSQL (app registry, stable relational data)
      PURPOSE: Stores developer app registrations: clientId, clientSecret hash,
               redirect URIs, allowed scopes, review status, rate limit tier.
               App secrets are never stored plaintext — SHA-256 hash only.
      METHODS: RegisterAppAsync(appSpec, tenantId) → DataProcessResult<string> (clientId)
               GetAppAsync(clientId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateAppStatusAsync(clientId, status, tenantId) → DataProcessResult<bool>
      DNA:     Scope Isolation — every app is tenant-scoped
               ParseDocument — app record is Dictionary

F476  ITokenIssuanceService
      FABRIC:  DATABASE FABRIC → PG (token records) + Redis (active token cache)
      PURPOSE: Issues OAuth 2.0 access tokens (short-lived, signed JWT), refresh tokens
               (longer-lived, stored in PG), and system tokens (for internal service-to-
               service calls). Token claims include: sub, tenantId, appId, scopes,
               exp, iat. (DR-67)
      METHODS: IssueAccessTokenAsync(subject, scopes, tenantId, appId) → DataProcessResult<Dictionary<string,object>>
               IssueRefreshTokenAsync(subject, tenantId) → DataProcessResult<string>
               RefreshAccessTokenAsync(refreshToken) → DataProcessResult<Dictionary<string,object>>
      DNA:     DataProcessResult<T> — token issuance failures are results, not exceptions
               ParseDocument — token record is Dictionary

F477  ITokenRevocationService
      FABRIC:  DATABASE FABRIC → Redis (revocation blocklist) + PG (refresh token table)
      PURPOSE: Revokes access and refresh tokens immediately. Access token revocations
               stored in Redis blocklist (fast lookup on every request). Refresh token
               revocation cascades to all derived access tokens. GDPR deletion requests
               trigger revocation of all tokens for the subject.
      METHODS: RevokeAccessTokenAsync(tokenId, reason) → DataProcessResult<bool>
               RevokeAllTokensForSubjectAsync(subjectId, tenantId) → DataProcessResult<int>
               IsRevokedAsync(tokenId) → DataProcessResult<bool>
      DNA:     Scope Isolation — revocation list keyed by tenantId + tokenId

F478  IScopeConsentService
      FABRIC:  DATABASE FABRIC → PG (consent records) + QUEUE FABRIC (consent-event stream)
      PURPOSE: Records user consent grants for OAuth scopes. Each grant is an append-only
               consent record (DD-91 principle applied to consent trail). Consent withdrawal
               triggers queue event → downstream systems (ads targeting F525) must purge
               consent-derived data. Consent status is the authoritative gate for F525.
      METHODS: RecordConsentAsync(subjectId, appId, scopes, tenantId) → DataProcessResult<string> (consentId)
               WithdrawConsentAsync(subjectId, appId, scopes, tenantId) → DataProcessResult<bool>
               GetConsentStatusAsync(subjectId, appId, scope, tenantId) → DataProcessResult<Dictionary<string,object>>
      DNA:     Scope Isolation — consent records tenant-scoped
               QUEUE FABRIC — withdrawal events for downstream purge cascade

F479  IAppReviewService
      FABRIC:  AI ENGINE FABRIC (review scoring) + DATABASE FABRIC → ES (review queue + decisions)
      PURPOSE: Reviews developer app applications for sensitive scope access. AF-5
               multi-model scoring evaluates app description, use case, data handling
               policy. Human review escalation for score below threshold. Review decisions
               are append-only (DD-91). (DR-67)
      METHODS: SubmitForReviewAsync(appId, reviewSpec) → DataProcessResult<string> (reviewId)
               GetReviewDecisionAsync(reviewId) → DataProcessResult<Dictionary<string,object>>
               EscalateToHumanAsync(reviewId, reason) → DataProcessResult<bool>
      DNA:     ParseDocument — review decision is Dictionary (no typed ReviewDecision class)

F480  IScopeEnforcementService
      FABRIC:  DATABASE FABRIC → Redis (scope cache, fast-path) + ES (scope rules)
      PURPOSE: On every API request, validates that caller token scopes satisfy the
               scope requirements for the requested fields/edges (from F473). Provides
               the authoritative scope-check called by F488 PermissionDecisionService.
               Scope rules are cached per app tier in Redis for sub-millisecond checks.
      METHODS: EnforceScopeAsync(tokenScopes, requiredScopes) → DataProcessResult<ScopeResult>
               GetRequiredScopesAsync(nodeType, fieldName) → DataProcessResult<List<string>>
      DNA:     DataProcessResult<ScopeResult> — ScopeResult is Dictionary
               Scope Isolation — scope enforcement is tenant-aware
```

---

# FAMILY 63 — Permission Engine (Policy Decision Point)
## F481–F488 | Scope: Per-node/edge/field authorization decisions

This is the platform's Policy Decision Point (PDP). Every node, edge, and field
in a graph response passes through this family before being included. Partial
authorization produces partial results, not failures. (DD-87)

```
F481  IPrivacyRuleService
      FABRIC:  DATABASE FABRIC → Elasticsearch (privacy rule index, FREEDOM config)
      PURPOSE: Evaluates platform-level privacy rules for a given node/field/edge:
               public, friends-only, connections-only, restricted, private.
               Rules are FREEDOM config — admin-configurable per content type
               without code change.
      METHODS: EvaluatePrivacyAsync(nodeId, nodeType, viewerContext, tenantId)
                 → DataProcessResult<Dictionary<string,object>>
      DNA:     BuildSearchFilter — empty viewer context fields skipped in rule query

F482  IBlockListService
      FABRIC:  DATABASE FABRIC → Redis (active block cache) + ES (block history)
      PURPOSE: Checks whether the requesting user is blocked by the target node owner
               or vice versa. Block checks are bidirectional. Redis cache for hot-path
               performance (<2ms); ES for full block history and audit.
      METHODS: IsBlockedAsync(requesterId, targetId, tenantId) → DataProcessResult<bool>
               GetBlockedEntitiesAsync(userId, tenantId) → DataProcessResult<List<object>>

F483  IAudienceControlService
      FABRIC:  DATABASE FABRIC → PostgreSQL (audience settings)
      PURPOSE: Resolves content-level audience settings set by the owner (everyone /
               connections / specific lists / only me). Returns effective visibility
               decision for a given viewer in the context of the requesting app.
      METHODS: GetAudienceAsync(nodeId, ownerId, tenantId) → DataProcessResult<Dictionary<string,object>>
               CheckViewerAccessAsync(nodeId, viewerId, tenantId) → DataProcessResult<bool>

F484  IMinorProtectionService
      FABRIC:  DATABASE FABRIC → PostgreSQL (age-verified accounts)
      PURPOSE: Applies minor-protection rules: restricts adult content, enforces
               age-gated node/field access, prevents targeting of minors by ads.
               Returns viewer age classification (minor/adult/unknown) for downstream
               enforcement (F519 targeting, F539 brand safety).
      METHODS: GetAgeClassificationAsync(viewerId, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsAgeGatedContentAsync(nodeId, tenantId) → DataProcessResult<bool>

F485  ICountryRuleService
      FABRIC:  DATABASE FABRIC → Elasticsearch (geo-rule FREEDOM config index)
      PURPOSE: Applies country-specific content rules: availability restrictions,
               legal holds, local regulatory requirements. Rules are FREEDOM config —
               legal team updates without code deployment.
      METHODS: GetCountryRulesAsync(countryCode, contentType, tenantId)
                 → DataProcessResult<Dictionary<string,object>>
               IsRestrictedInCountryAsync(nodeId, countryCode, tenantId) → DataProcessResult<bool>

F486  IRestrictedContentService
      FABRIC:  DATABASE FABRIC → Elasticsearch (content restriction index)
      PURPOSE: Checks if a node/content is under a restriction flag: DMCA takedown,
               legal hold, policy violation pending review, spam quarantine.
               Restricted content returns empty field set (not error) to avoid leaking
               restriction status to non-authorized callers.
      METHODS: GetRestrictionStatusAsync(nodeId, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsRestrictedAsync(nodeId, tenantId) → DataProcessResult<bool>

F487  IPartialErrorBuilderService
      FABRIC:  CORE FABRIC (MicroserviceBase ObjectProcessor)
      PURPOSE: Assembles the partial-error list included in graph API responses when
               some nodes/fields/edges were excluded due to permission, restriction,
               or scope. Each partial error contains: path (the excluded field/edge),
               code (PERMISSION_DENIED / SCOPE_INSUFFICIENT / RESTRICTED / AGE_GATED),
               and a user-visible message. Caller can use this to request additional
               permissions or inform the end-user.
      METHODS: BuildPartialErrorsAsync(exclusions) → DataProcessResult<List<object>>
               FormatForResponseAsync(partialErrors) → DataProcessResult<Dictionary<string,object>>

F488  IPermissionDecisionService
      FABRIC:  RAG FABRIC (policy retrieval strategy) + DATABASE FABRIC → ES (decision log)
      PURPOSE: The PDP orchestrator. Called per node, per edge, per field. Coordinates
               F480 (scope), F481 (privacy), F482 (blocks), F483 (audience), F484
               (minor), F485 (country), F486 (restricted) into a single allow/deny/
               partial decision. Decisions logged to ES for audit. RAG FABRIC used to
               retrieve applicable policy rules from the skill library. (DD-87, DR-68)
      METHODS: MakeDecisionAsync(evaluationContext) → DataProcessResult<Dictionary<string,object>>
               GetDecisionAuditAsync(nodeId, requestId, tenantId) → DataProcessResult<Dictionary<string,object>>
      DNA:     RAG FABRIC for policy retrieval (IRagService.SearchAsync)
               DataProcessResult<T> — never throw on deny; return deny-result
```

---

# FAMILY 64 — Query Planner & Federation
## F489–F492 | Scope: Fan-out execution, node/edge caching, cursor pagination

```
F489  IDomainFederatorService
      FABRIC:  QUEUE FABRIC → Redis Streams (internal federation stream)
      PURPOSE: Executes the plan from F474 by fanning out sub-requests to internal
               domain services via QUEUE FABRIC. Collects results with Promise.allSettled
               semantics — partial failures do not block the response; they contribute
               to the partial-error list via F487. Results are merged by F490/F491 cache layer.
      METHODS: FanOutAsync(executionPlan, tenantId) → DataProcessResult<Dictionary<string,object>>
               CollectResultsAsync(fanOutId, timeout) → DataProcessResult<List<object>>
      DNA:     QUEUE FABRIC — fan-out events via EnqueueAsync, never direct HTTP
               DataProcessResult<T> — allSettled: partial failures are results

F490  INodeCacheService
      FABRIC:  DATABASE FABRIC → Redis (node cache, TTL-managed)
      PURPOSE: Caches hot graph nodes (popular Pages, viral Posts, shared User profiles).
               Cache key: tenantId:nodeType:nodeId:schemaVersion. TTL is FREEDOM config
               per node type. Cache invalidation triggered by node mutation events via
               QUEUE FABRIC (write-through invalidation, not lazy eviction on miss).
      METHODS: GetNodeAsync(nodeId, nodeType, tenantId) → DataProcessResult<Dictionary<string,object>?>
               SetNodeAsync(nodeId, nodeType, value, tenantId) → DataProcessResult<bool>
               InvalidateNodeAsync(nodeId, tenantId) → DataProcessResult<bool>

F491  IEdgeCacheService
      FABRIC:  DATABASE FABRIC → Redis (edge cache, TTL-managed)
      PURPOSE: Caches hot graph edges (user→friends, page→followers, post→comments first page).
               Same invalidation pattern as F490. Edge caches are invalidated on relationship
               mutation events. High-cardinality edges (>10k members) cached with
               cursor-position-keyed slices, not full lists.
      METHODS: GetEdgeAsync(nodeId, edgeName, cursor, tenantId) → DataProcessResult<Dictionary<string,object>?>
               SetEdgeAsync(nodeId, edgeName, cursor, value, tenantId) → DataProcessResult<bool>
               InvalidateEdgeAsync(nodeId, edgeName, tenantId) → DataProcessResult<bool>

F492  ICursorPaginationService
      FABRIC:  DATABASE FABRIC → Elasticsearch (pagination index)
      PURPOSE: Manages stateless cursor-based pagination across graph edge result sets.
               Cursors encode sort key + offset + TTL. Cross-page consistency is
               best-effort (new items may appear on subsequent pages); this is declared
               in the API contract. Consistent pagination mode (snapshot-based) available
               as FREEDOM config for compliance use cases.
      METHODS: CreateCursorAsync(context, tenantId) → DataProcessResult<string>
               ResolveCursorAsync(cursor, tenantId) → DataProcessResult<Dictionary<string,object>>
               ValidateCursorAsync(cursor, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 65 — Webhooks & Subscriptions
## F493–F497 | Scope: Event subscription, delivery, retry, dedup, HMAC signing

All webhook deliveries are signed with HMAC-SHA256. No unsigned delivery path exists.
(DD-92, DR-69)

```
F493  ISubscriptionRegistryService
      FABRIC:  DATABASE FABRIC → PostgreSQL (subscription records)
      PURPOSE: Stores webhook subscriptions: app, target URL, event types subscribed,
               verification token, active/paused/failed status, and tenant scope.
               Subscriptions are tenant-scoped. App can subscribe to platform events
               (post.created, lead.submitted, etc.) for their authorized scope.
      METHODS: CreateSubscriptionAsync(spec, tenantId) → DataProcessResult<string> (subscriptionId)
               GetSubscriptionAsync(subscriptionId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateStatusAsync(subscriptionId, status, tenantId) → DataProcessResult<bool>
               ListByAppAsync(appId, tenantId) → DataProcessResult<List<object>>

F494  IEventFilterService
      FABRIC:  DATABASE FABRIC → Elasticsearch (subscription filter index)
      PURPOSE: Given an outbound platform event, resolves which subscriptions should
               receive it by matching event type, node type, and any filter expressions
               configured by the app (e.g., "only post.created where author.id=X").
               Filter expressions are FREEDOM config per subscription.
      METHODS: ResolveSubscribersAsync(eventType, eventPayload, tenantId)
                 → DataProcessResult<List<object>>
               ValidateFilterExpressionAsync(expression) → DataProcessResult<bool>

F495  IDeliveryRetryService
      FABRIC:  QUEUE FABRIC → Redis Streams (retry queue, DLQ after max attempts)
      PURPOSE: Manages retry schedule for failed webhook deliveries: exponential
               backoff with jitter (1s → 2s → 4s → 8s → … → max 24h). After
               max attempts (FREEDOM config), moves to DLQ and sets subscription status
               to FAILED. App must re-enable subscription after fixing endpoint.
      METHODS: ScheduleRetryAsync(deliveryId, attemptNumber) → DataProcessResult<bool>
               GetRetryScheduleAsync(deliveryId) → DataProcessResult<Dictionary<string,object>>
               MoveToDLQAsync(deliveryId, reason) → DataProcessResult<bool>

F496  IWebhookDeliveryService
      FABRIC:  QUEUE FABRIC (delivery queue) + CORE FABRIC (HMAC signing via ObjectProcessor)
      PURPOSE: Executes outbound HTTP delivery of signed webhook payloads. Signs each
               delivery with HMAC-SHA256 using per-subscription secret. Includes headers:
               X-Platform-Signature (HMAC), X-Delivery-ID (idempotency key),
               X-Event-Type. Delivery result (success/failure/HTTP status) logged for
               developer dashboard (F576). (DD-92, DR-69)
      METHODS: DeliverAsync(subscriptionId, eventPayload, tenantId) → DataProcessResult<Dictionary<string,object>>
               VerifyHmacAsync(payload, signature, secret) → DataProcessResult<bool>
      DNA:     QUEUE FABRIC — delivery dispatched via EnqueueAsync; HTTP call inside consumer
               DataProcessResult<T> — HTTP errors are results, never exceptions

F497  IDeduplicationService
      FABRIC:  DATABASE FABRIC → Redis (SETNX dedup key, TTL 24h)
      PURPOSE: Prevents duplicate webhook deliveries caused by retry-after-success races.
               Each delivery assigned an idempotency key (deliveryId). Before delivery,
               SETNX on the key; if already set, delivery is skipped. Key TTL = 24h.
               Also used to deduplicate incoming events before subscription fan-out (F494).
      METHODS: MarkDeliveredAsync(deliveryId, tenantId) → DataProcessResult<bool>
               IsDeliveredAsync(deliveryId, tenantId) → DataProcessResult<bool>
               MarkEventProcessedAsync(eventId, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 66 — Advertiser Identity & Accounts
## F498–F502 | Scope: Ad account management, roles, billing accounts, business verification

```
F498  IAdAccountService
      FABRIC:  DATABASE FABRIC → PostgreSQL (ad account registry)
      PURPOSE: Manages advertiser ad accounts: creation, binding to business/page,
               account status (active/paused/suspended), spend limits, and account
               hierarchy (business account → ad accounts). Each ad account is tenant-
               scoped and tied to a billing account (F501).
      METHODS: CreateAdAccountAsync(spec, tenantId) → DataProcessResult<string> (accountId)
               GetAdAccountAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               SuspendAccountAsync(accountId, reason, tenantId) → DataProcessResult<bool>

F499  IAdvertiserRoleService
      FABRIC:  DATABASE FABRIC → PostgreSQL (role assignments)
      PURPOSE: Manages roles on ad accounts: Admin, Analyst, Finance, Editor, and
               Agency Access (limited to specific campaigns). Role assignments are
               append-only audit records; revocation adds a revocation record
               (consistent with DD-91 append-only pattern applied to access records).
      METHODS: AssignRoleAsync(userId, accountId, role, tenantId) → DataProcessResult<string>
               RevokeRoleAsync(userId, accountId, role, tenantId) → DataProcessResult<bool>
               GetRolesAsync(accountId, tenantId) → DataProcessResult<List<object>>

F500  IAgencyAccessService
      FABRIC:  DATABASE FABRIC → PostgreSQL (agency-client access links)
      PURPOSE: Manages agency access to client ad accounts: agency can act on behalf
               of clients with explicit authorization records. Access is scoped to
               specific accounts, not the agency's full client list. Revocation
               immediately removes access (checked by F499 on each operation).
      METHODS: GrantAgencyAccessAsync(agencyId, clientAccountId, scope, tenantId)
                 → DataProcessResult<string>
               RevokeAgencyAccessAsync(agencyId, clientAccountId, tenantId) → DataProcessResult<bool>
               ListAgencyClientsAsync(agencyId, tenantId) → DataProcessResult<List<object>>

F501  IBillingAccountService
      FABRIC:  DATABASE FABRIC → PostgreSQL (billing records)
      PURPOSE: Stores billing account details: billing country, currency, tax ID,
               payment method references (tokenized — F505), invoice email, billing
               thresholds. Billing account is the financial entity for invoicing.
               PCI scope managed via F505 tokenization (DD-93).
      METHODS: GetBillingAccountAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateBillingDetailsAsync(accountId, updates, tenantId) → DataProcessResult<bool>
               SetPaymentMethodAsync(accountId, paymentToken, tenantId) → DataProcessResult<bool>

F502  IBusinessVerificationService
      FABRIC:  AI ENGINE FABRIC (document + business classification) + DATABASE FABRIC → PG
      PURPOSE: Verifies advertiser business identity for: (a) political ad eligibility
               (required by DD-90), (b) regulated industry access (financial services,
               healthcare, alcohol), (c) elevated spend tier unlocks. AI ENGINE FABRIC
               analyses submitted documentation; human review escalation for borderline cases.
      METHODS: SubmitVerificationAsync(accountId, documents, tenantId) → DataProcessResult<string>
               GetVerificationStatusAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               EscalateToHumanReviewAsync(verificationId, reason) → DataProcessResult<bool>
```

---

# FAMILY 67 — Campaign Hierarchy
## F503–F507 | Scope: Campaign, ad set, budget, bid strategy management

```
F503  ICampaignService
      FABRIC:  DATABASE FABRIC → PostgreSQL (campaign records) + ES (campaign search index)
      PURPOSE: Manages campaign lifecycle: creation, objective setting (awareness /
               consideration / conversion), status (draft/active/paused/completed/
               archived), budget assignment, scheduling. Campaign is the top-level
               container in the account → campaign → ad set → ad hierarchy.
      METHODS: CreateCampaignAsync(spec, accountId, tenantId) → DataProcessResult<string>
               GetCampaignAsync(campaignId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateCampaignStatusAsync(campaignId, status, tenantId) → DataProcessResult<bool>
               SearchCampaignsAsync(filters, tenantId) → DataProcessResult<List<object>>

F504  IAdSetService
      FABRIC:  DATABASE FABRIC → PostgreSQL (ad set records)
      PURPOSE: Manages ad sets within campaigns: targeting definition, placement selection,
               budget at ad-set level (daily/lifetime), bid override, flight dates,
               audience exclusions. Each ad set links to F507 bid strategy and F520
               audience segments.
      METHODS: CreateAdSetAsync(spec, campaignId, tenantId) → DataProcessResult<string>
               GetAdSetAsync(adSetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateTargetingAsync(adSetId, targeting, tenantId) → DataProcessResult<bool>

F505  IPaymentMethodService
      FABRIC:  DATABASE FABRIC → PostgreSQL (token references only — PCI out-of-scope)
      PURPOSE: Tokenizes payment instruments via external payment vault. Raw card data
               is sent directly to vault; this service stores only the vault-issued token
               reference. Supports: credit card, wire transfer pre-authorization, invoice
               (credit terms). Token references are tenant-scoped. (DD-93, DR-70)
      METHODS: TokenizePaymentMethodAsync(rawPaymentData, accountId, tenantId)
                 → DataProcessResult<string> (token)
               GetTokenizedMethodAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               RemovePaymentMethodAsync(accountId, tenantId) → DataProcessResult<bool>
      DNA:     DataProcessResult<T> — vault errors are results; never expose raw card data

F506  IBudgetAllocationService
      FABRIC:  DATABASE FABRIC → PostgreSQL (budget records) + Redis (live spend counter)
      PURPOSE: Manages budget at campaign and ad-set levels. PG stores authoritative
               budgets and thresholds; Redis tracks live spend counters (updated on each
               billing event from F543). Budget exhaustion triggers status update via
               QUEUE FABRIC event → F503 pauses campaign automatically.
      METHODS: SetBudgetAsync(entityId, entityType, budget, tenantId) → DataProcessResult<bool>
               GetRemainingBudgetAsync(entityId, entityType, tenantId) → DataProcessResult<Dictionary<string,object>>
               CheckBudgetAsync(entityId, entityType, spendAmount, tenantId) → DataProcessResult<bool>

F507  IBidStrategyService
      FABRIC:  DATABASE FABRIC → Elasticsearch (bid strategy FREEDOM config)
      PURPOSE: Manages bid strategies: manual CPC/CPM, automated target CPA, target ROAS,
               lowest-cost without cap, and highest-value. Strategy parameters are
               FREEDOM config — admin-configurable thresholds per account tier.
               Strategy selection feeds F529 PricingModel in the auction path.
      METHODS: GetBidStrategyAsync(adSetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               SetBidStrategyAsync(adSetId, strategy, tenantId) → DataProcessResult<bool>
               ValidateBidAsync(bidAmount, strategy, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 68 — Creative Management
## F508–F513 | Scope: Creative ingestion, variants, quality scoring, tagging

```
F508  ICreativeAssetService
      FABRIC:  DATABASE FABRIC → ES (asset metadata) + Object Store (binary assets)
      PURPOSE: Manages creative asset lifecycle: upload, transcoding dispatch (F512),
               format validation, storage in object store with ES metadata index.
               Supports: image (JPEG/PNG/WebP), video (MP4/MOV), carousel (multi-asset),
               and dynamic creative templates. Asset binary in object store; metadata
               (dimensions, duration, format, hash, status) in ES.
      METHODS: IngestAssetAsync(assetData, spec, tenantId) → DataProcessResult<string> (assetId)
               GetAssetAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               ListAssetsAsync(filters, tenantId) → DataProcessResult<List<object>>

F509  ICreativeVariantService
      FABRIC:  AI ENGINE FABRIC (generative variants) + DATABASE FABRIC → ES
      PURPOSE: Generates multiple creative variants from a base creative using AI ENGINE
               FABRIC (headline variations, CTA copy variations, colour palette shifts).
               Variants are stored as linked assets in ES. AF-5 multi-model used for
               variant quality scoring to select the top N variants for delivery.
      METHODS: GenerateVariantsAsync(baseAssetId, variantSpec, tenantId) → DataProcessResult<List<object>>
               SelectTopVariantsAsync(variants, qualityCriteria, tenantId) → DataProcessResult<List<object>>

F510  ICreativeQualityService
      FABRIC:  AI ENGINE FABRIC (quality classification) + DATABASE FABRIC → ES (quality scores)
      PURPOSE: Scores creative quality across: visual clarity, text-to-image ratio,
               brand safety signals, engagement prediction. Score used by F528
               QualityScoreService in auction. Quality scores cached in ES; re-scored
               when creative is updated. Low-quality creatives flagged to F517 review queue.
      METHODS: ScoreCreativeAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetQualityScoreAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>

F511  ITextVariantService
      FABRIC:  AI ENGINE FABRIC (LLM text generation)
      PURPOSE: Generates headline, body copy, and CTA text variants for ads. Uses
               AI ENGINE FABRIC (IAiProvider.GenerateAsync). Variants are tenant-scoped
               and stored as creative component records. Respects character limits per
               placement type (FREEDOM config via F532 AdSlotResolver).
      METHODS: GenerateHeadlinesAsync(context, count, tenantId) → DataProcessResult<List<object>>
               GenerateBodyCopyAsync(context, limits, tenantId) → DataProcessResult<List<object>>

F512  IMediaTranscodeService
      FABRIC:  CORE FABRIC (async job dispatch via MicroserviceBase)
      PURPOSE: Dispatches media transcoding jobs for video assets: MP4→WebM, resolution
               variants (1080p/720p/480p), thumbnail extraction, duration validation.
               Transcoding is async; status updates via QUEUE FABRIC event → F508
               updates asset status. Transcode failures trigger F517 review flag.
      METHODS: DispatchTranscodeAsync(assetId, profiles, tenantId) → DataProcessResult<string> (jobId)
               GetTranscodeStatusAsync(jobId, tenantId) → DataProcessResult<Dictionary<string,object>>

F513  ICreativeTaggingService
      FABRIC:  AI ENGINE FABRIC + RAG FABRIC (category taxonomy retrieval)
      PURPOSE: Auto-tags creatives with IAB content categories, product categories,
               and sensitive topic flags using AI ENGINE FABRIC. RAG FABRIC retrieves
               the current IAB taxonomy for classification grounding. Tags feed F514
               ContentPolicyService and F519 TargetingEvaluator (contextual targeting).
      METHODS: TagCreativeAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetTagsAsync(assetId, tenantId) → DataProcessResult<List<object>>
```

---

# FAMILY 69 — Ad Review
## F514–F518 | Scope: Policy classification, review queue, decision records

All review decisions are append-only. No UPDATE or DELETE on review records. (DD-91)
Creative must be "approved" before auction eligibility. (DD-100)

```
F514  IContentPolicyService
      FABRIC:  DATABASE FABRIC → Elasticsearch (policy rules index, FREEDOM config)
      PURPOSE: Evaluates creative content against platform content policies: prohibited
               categories (weapons, tobacco, etc.), restricted categories (alcohol,
               gambling — require verification), and sensitive topics. Policy rules are
               FREEDOM config — legal/policy team updates without code deployment.
      METHODS: EvaluatePolicyAsync(assetId, tags, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetProhibitedCategoriesAsync(tenantId) → DataProcessResult<List<object>>

F515  IProhibitedCategoryService
      FABRIC:  DATABASE FABRIC → Elasticsearch (prohibited category registry)
      PURPOSE: Maintains the authoritative list of prohibited advertising categories
               per jurisdiction. Categories mapped to IAB taxonomy codes. Jurisdiction
               rules are FREEDOM config (DR-73). Hard-blocked categories never reach
               auction regardless of any other approval state.
      METHODS: IsProhibitedAsync(categoryCode, jurisdictionCode, tenantId) → DataProcessResult<bool>
               GetProhibitedListAsync(jurisdictionCode, tenantId) → DataProcessResult<List<object>>

F516  ISensitiveTopicService
      FABRIC:  DATABASE FABRIC → Elasticsearch (sensitive topic index)
      PURPOSE: Identifies sensitive ad topics requiring additional review: political,
               social issues, health and medical, financial services, housing.
               Sensitive topic detection triggers mandatory human review escalation
               regardless of automated classifier confidence. (DD-90)
      METHODS: DetectSensitiveTopicsAsync(assetId, tags, tenantId) → DataProcessResult<List<object>>
               RequiresEscalationAsync(topics) → DataProcessResult<bool>

F517  IReviewQueueService
      FABRIC:  QUEUE FABRIC → Redis Streams (review queue with priority lanes)
      PURPOSE: Manages the ad creative review queue with priority lanes: expedited
               (political + sensitive), standard, and bulk. Consumer groups for
               human reviewers and automated classifiers. DLQ for review timeouts.
               Priority is FREEDOM config per advertiser tier.
      METHODS: EnqueueForReviewAsync(assetId, priority, tenantId) → DataProcessResult<string>
               DequeueForReviewAsync(reviewerId, lane) → DataProcessResult<Dictionary<string,object>?>
               AcknowledgeReviewAsync(reviewId) → DataProcessResult<bool>

F518  IReviewDecisionService
      FABRIC:  DATABASE FABRIC → PostgreSQL (review decision records, append-only)
      PURPOSE: Records review decisions as append-only audit records: approved/rejected/
               restricted (with conditions). Each decision: reviewId, assetId, decision,
               reasons (list), reviewer (human userId or system classifier), timestamp.
               Decision is the gate checked by F541 EligibilityChecker before auction.
               No decision record can be modified — corrections use new override decision.
      METHODS: RecordDecisionAsync(decision, tenantId) → DataProcessResult<string> (decisionId)
               GetLatestDecisionAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               ListDecisionHistoryAsync(assetId, tenantId) → DataProcessResult<List<object>>
```

---

# FAMILY 70 — Targeting Engine
## F519–F526 | Scope: Targeting evaluation, audience segments, consent, exclusions

Consent check (F525) is a BLOCKING gate before targeting evaluation (F519). (DD-89)

```
F520  IAudienceSegmentService
      FABRIC:  DATABASE FABRIC → Elasticsearch (segment definitions + member index)
      PURPOSE: Manages reusable audience segments: custom audiences (CRM list upload),
               lookalike audiences (seeded from F521), interest segments (built from
               engagement signals), and behavioural segments. Segments are tenant-scoped.
               Member inclusion requires valid consent (checked by F525 upstream).
      METHODS: CreateSegmentAsync(spec, tenantId) → DataProcessResult<string>
               GetSegmentMembersAsync(segmentId, tenantId) → DataProcessResult<List<object>>
               AddMembersAsync(segmentId, memberIds, tenantId) → DataProcessResult<int>

F521  ILookalikeModelService
      FABRIC:  AI ENGINE FABRIC (similarity model) + DATABASE FABRIC → ES (model results)
      PURPOSE: Builds lookalike audiences from a seed audience by finding users with
               similar engagement patterns, interests, and demographics. AI ENGINE FABRIC
               runs the similarity model; results stored in ES as a segment.
               Model refresh is FREEDOM config (daily/weekly per account tier).
      METHODS: BuildLookalikeAsync(seedSegmentId, expansionRate, tenantId) → DataProcessResult<string>
               RefreshModelAsync(lookalikeSegmentId, tenantId) → DataProcessResult<bool>

F522  IKeywordContextService
      FABRIC:  AI ENGINE FABRIC (contextual classification) + RAG FABRIC (taxonomy)
      PURPOSE: Provides contextual keyword and topic targeting: matches ad to page/content
               context. AI ENGINE FABRIC classifies the page context; RAG FABRIC retrieves
               IAB taxonomy for accurate category matching. Used in keyword bid multiplier
               for contextual relevance boost in auction.
      METHODS: ClassifyContextAsync(pageContext, tenantId) → DataProcessResult<Dictionary<string,object>>
               MatchKeywordsAsync(pageContext, keywords, tenantId) → DataProcessResult<List<object>>

F523  ILocationTargetService
      FABRIC:  DATABASE FABRIC → Elasticsearch (geo index with geopoint/geoshape mapping)
      PURPOSE: Resolves geographic targeting: country, region, city, DMA, radius around
               point, polygon. Viewer location derived from IP (F557 device fingerprint)
               or explicit location (profile). Radius targeting with configurable precision
               (FREEDOM config — coarser radius for privacy compliance).
      METHODS: IsInTargetAsync(viewerLocation, locationTarget, tenantId) → DataProcessResult<bool>
               ResolveViewerLocationAsync(viewerContext, tenantId) → DataProcessResult<Dictionary<string,object>>

F524  IDemographicTargetService
      FABRIC:  DATABASE FABRIC → PostgreSQL (demographic profile)
      PURPOSE: Evaluates demographic targeting: age range, gender, language, education,
               employment. All demographic targeting subject to consent gate (F525)
               and minor protection (F484). Demographic data from user profile, not
               inferred — inference is treated as a sensitive topic requiring consent.
      METHODS: EvaluateDemographicAsync(viewerId, target, tenantId) → DataProcessResult<bool>

F525  IConsentLookupService
      FABRIC:  DATABASE FABRIC → Redis (consent cache, fast-path) + PG (authoritative)
      PURPOSE: The consent gate. Called BEFORE any targeting evaluation. Returns
               effective consent status for a viewer for a given targeting context
               (personalised ads, interest targeting, location targeting). If consent
               absent, targeting evaluation is SKIPPED entirely (not filtered post-eval).
               (DD-89, DR-72)
      METHODS: GetConsentAsync(viewerId, consentType, tenantId) → DataProcessResult<Dictionary<string,object>>
               HasConsentAsync(viewerId, consentType, tenantId) → DataProcessResult<bool>
      DNA:     Scope Isolation — consent always tenantId-scoped
               DataProcessResult<T> — consent lookup failure → conservative deny-result

F526  IExclusionListService
      FABRIC:  DATABASE FABRIC → Elasticsearch (exclusion segment index)
      PURPOSE: Manages audience exclusions at campaign and ad-set level: exclude existing
               customers, exclude converters, competitor exclusions. Exclusion check is
               applied AFTER consent gate and AFTER audience inclusion — exclusion has
               higher priority than inclusion.
      METHODS: IsExcludedAsync(viewerId, adSetId, tenantId) → DataProcessResult<bool>
               AddExclusionAsync(adSetId, segmentId, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 71 — Auction & Delivery
## F527–F543 | Scope: Eligibility, quality score, pricing, frequency cap, pacing, insertion

Auction engine (F542) is STATELESS. All mutable state in Redis only. <50ms p99. (DD-88)

```
F527  IEligibleAdsLoaderService
      FABRIC:  DATABASE FABRIC → ES (ad catalog) + Redis (eligibility cache)
      PURPOSE: Retrieves the candidate set of eligible ads for a given ad slot and
               viewer context. Pre-filters by: slot placement, review approval status
               (F518 "approved" only — DD-100), targeting match (F519), budget
               availability (F506), flight dates (F504). Returns ordered candidate list.
      METHODS: LoadEligibleAdsAsync(slotContext, viewerContext, tenantId) → DataProcessResult<List<object>>
               IsEligibleAsync(adId, slotContext, viewerContext, tenantId) → DataProcessResult<bool>

F528  IQualityScoreService
      FABRIC:  AI ENGINE FABRIC (relevance scoring) + DATABASE FABRIC → ES (score cache)
      PURPOSE: Computes quality score for each candidate ad in the auction. Combines:
               predicted click-through rate (pCTR), creative quality score (F510),
               ad relevance to viewer context (F522), and historical performance.
               AF-5 multi-model scoring; conservative on divergence > 10% (DD-97).
      METHODS: ScoreAsync(adId, viewerContext, slotContext, tenantId) → DataProcessResult<Dictionary<string,object>>

F529  IPricingModelService
      FABRIC:  DATABASE FABRIC → Elasticsearch (pricing model FREEDOM config)
      PURPOSE: Applies the pricing model for ranking: eCPM = bid × quality score for
               CPM, eCPC = bid × pCTR × quality for CPC. Pricing model variant
               (GSP / first-price / hybrid) is FREEDOM config per placement type.
               Generalised Second Price (GSP) is the default for most placements.
      METHODS: ComputeRankScoreAsync(ad, pricingContext, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetPricingModelAsync(placementType, tenantId) → DataProcessResult<Dictionary<string,object>>

F530  IFrequencyCapService
      FABRIC:  DATABASE FABRIC → Redis (INCR atomic counters, TTL-managed)
      PURPOSE: Enforces frequency caps per viewer per ad/campaign/ad-set over rolling
               windows (1h/24h/7d). Redis INCR is atomic and sub-millisecond.
               Counter key: tenantId:viewerId:entityId:window. TTL = window duration.
               Cap values are FREEDOM config per campaign.
      METHODS: CheckFrequencyAsync(viewerId, entityId, window, tenantId) → DataProcessResult<bool>
               IncrementAsync(viewerId, entityId, window, tenantId) → DataProcessResult<int>

F531  IPacingService
      FABRIC:  DATABASE FABRIC → Redis (pacing state, sub-millisecond read/write)
      PURPOSE: Manages pacing of ad spend against time budget. Even pacing: spend ~1/N
               of daily budget in each 1/N time slice. Pacing state (target_rate,
               current_rate, adjustment_factor) read from Redis in auction path.
               Spend-too-fast → throttle; spend-too-slow → boost. State updated via
               async QUEUE FABRIC event after each impression. (DD-88)
      METHODS: GetPacingSignalAsync(adSetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdatePacingStateAsync(adSetId, impressionEvent, tenantId) → DataProcessResult<bool>

F532  IAdSlotResolverService
      FABRIC:  DATABASE FABRIC → Elasticsearch (slot definition FREEDOM config)
      PURPOSE: Resolves ad slot specifications for a given placement context: slot size,
               allowed creative formats, frequency cap defaults, max ads per page.
               Slot definitions are FREEDOM config — product team can add/modify slots
               without code deployment. Feeds F527 (eligibility) and F536 (insertion).
      METHODS: ResolveSlotAsync(placementContext, tenantId) → DataProcessResult<Dictionary<string,object>>
               ListSlotsAsync(surface, tenantId) → DataProcessResult<List<object>>

F533  IAdCatalogService
      FABRIC:  DATABASE FABRIC → Elasticsearch (ad index with approval status)
      PURPOSE: The ad catalog is the indexed store of all ads with their current
               approval state, targeting, bid, quality scores, and creative refs.
               F541 EligibilityChecker queries this catalog as the first filter.
               Catalog updates are event-driven: review decisions (F518), budget
               changes (F506), and status changes (F503/F504) each trigger catalog
               update via QUEUE FABRIC.
      METHODS: GetAdAsync(adId, tenantId) → DataProcessResult<Dictionary<string,object>>
               SearchAdsAsync(filters, tenantId) → DataProcessResult<List<object>>
               UpdateApprovalStatusAsync(adId, status, tenantId) → DataProcessResult<bool>

F534  IAdReviewService
      FABRIC:  AI ENGINE FABRIC (automated review classifier) + DATABASE FABRIC → ES
      PURPOSE: Orchestrates the ad review pipeline: (1) auto-classify via AI ENGINE
               FABRIC, (2) check F514 content policy, (3) detect political content
               via F535 + F538 dual-gate (DD-90), (4) queue for human review if
               auto-review insufficient, (5) record decision in F518. "Approved"
               status recorded in F533 catalog. (DD-100)
      METHODS: SubmitForReviewAsync(adId, tenantId) → DataProcessResult<string> (reviewId)
               GetReviewStatusAsync(adId, tenantId) → DataProcessResult<Dictionary<string,object>>

F535  IContentClassifierService
      FABRIC:  AI ENGINE FABRIC (multi-class content classifier)
      PURPOSE: AI-powered content classifier for ad creative: detects political content,
               violence, adult content, hate speech, deceptive claims. Returns confidence
               scores per class. For political detection, classifier result is ONLY the
               first gate — explicit verification via F538 is always required. (DD-90)
      METHODS: ClassifyAsync(assetId, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetClassificationScoresAsync(assetId, tenantId) → DataProcessResult<List<object>>

F536  ISponsoredInsertionService
      FABRIC:  QUEUE FABRIC → Redis Streams (feed injection event stream)
      PURPOSE: Inserts the auction winner into the feed/search results/placement surface.
               Emits insertion event to QUEUE FABRIC — downstream feed assembly service
               consumes and injects ad at designated slot position. Insertion is async;
               fallback (no ad) if consumer timeout exceeded. Impression logged via F537.
      METHODS: InsertSponsoredAdAsync(auctionResult, slotContext, tenantId) → DataProcessResult<string>
               GetInsertionStatusAsync(insertionId, tenantId) → DataProcessResult<Dictionary<string,object>>

F537  IImpressionLogService
      FABRIC:  QUEUE FABRIC → Redis Streams (impression event stream, high throughput)
      PURPOSE: Logs ad impressions to QUEUE FABRIC for downstream processing: attribution
               (F550), billing trigger (F564), frequency cap increment (F530), pacing
               update (F531). High-throughput write — impression events never block the
               render path. Consumer acknowledges after processing.
      METHODS: LogImpressionAsync(impressionEvent, tenantId) → DataProcessResult<string>

F538  IPoliticalVerificationService
      FABRIC:  DATABASE FABRIC → PostgreSQL (political verification records)
      PURPOSE: Explicit political advertiser verification. Required for any ad classified
               as political by F535, regardless of confidence score. Stores verification
               status, legal entity name, jurisdiction, and authorising officer. Verification
               is required per jurisdiction — US/EU/UK have different requirements.
               (DD-90, DR-73)
      METHODS: GetVerificationStatusAsync(advertiserId, jurisdiction, tenantId)
                 → DataProcessResult<Dictionary<string,object>>
               RecordVerificationAsync(advertiserId, verificationData, tenantId) → DataProcessResult<string>

F539  IBrandSafetyService
      FABRIC:  AI ENGINE FABRIC + DATABASE FABRIC → ES (brand safety rules)
      PURPOSE: Evaluates brand safety for ad placement: is the surrounding content context
               appropriate for this ad? Checks content category of the page/post against
               advertiser brand safety settings (FREEDOM config). Advertisers can set
               blocking categories (e.g., "do not appear next to news about violence").
               Minor protection (F484) feeds into brand safety for youth-targeted placements.
      METHODS: EvaluateBrandSafetyAsync(adId, contentContext, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetBlockingCategoriesAsync(adId, tenantId) → DataProcessResult<List<object>>

F540  IPlacementAuditService
      FABRIC:  DATABASE FABRIC → Elasticsearch (placement audit log, append-only)
      PURPOSE: Append-only audit log of every ad placement decision: auction winner,
               runner-up prices, quality scores, targeting match factors, brand safety
               decision. Used for: advertiser reporting, regulatory audit, dispute
               resolution. Consistent with DD-91 append-only principle.
      METHODS: LogPlacementAsync(placementDecision, tenantId) → DataProcessResult<string>
               GetPlacementAuditAsync(adId, dateRange, tenantId) → DataProcessResult<List<object>>

F541  IEligibilityCheckerService
      FABRIC:  DATABASE FABRIC → ES (ad catalog) + Redis (eligibility cache, TTL 5min)
      PURPOSE: Hard eligibility filter. Checks before any auction calculation:
               (1) Creative approval status = "approved" (DD-100) — hard block if not
               (2) Budget available (F506)
               (3) Flight dates active (F504)
               (4) Account not suspended (F498)
               (5) Political verification where required (F538)
               (6) Not on exclusion list (F526)
               Cached per ad per slot for 5 min to avoid repeated ES reads in hot path.
      METHODS: CheckEligibilityAsync(adId, slotContext, viewerContext, tenantId)
                 → DataProcessResult<Dictionary<string,object>>

F542  IAuctionEngineService
      FABRIC:  DATABASE FABRIC → Redis ONLY (stateless, all mutable state in Redis)
      PURPOSE: Pure stateless auction function. Takes eligible candidate ads from F527,
               quality scores from F528, pricing from F529. Runs eCPM ranking.
               Applies pacing signal from F531 (Redis). Applies frequency cap from F530
               (Redis). Winner determined. All state reads: Redis ONLY. No PG call in
               auction path. <50ms p99 SLO. (DD-88, DR-71)
      METHODS: RunAuctionAsync(candidates, slotContext, viewerContext, tenantId)
                 → DataProcessResult<Dictionary<string,object>>
      DNA:     DATABASE FABRIC → Redis ONLY in auction critical path
               DataProcessResult<T> — no-fill (empty auction) is a valid result

F543  IBudgetDecrementService
      FABRIC:  QUEUE FABRIC (async event consumer) + DATABASE FABRIC → Redis (INCR)
      PURPOSE: Consumes billing events from QUEUE FABRIC and atomically decrements
               the Redis spend counter for the campaign/ad set. Never in the auction
               critical path — decrement is async after impression log. If Redis
               counter reaches budget limit, emits QUEUE FABRIC event → F506 to pause
               campaign. (DD-88 — decrement decoupled from auction)
      METHODS: ProcessBillingEventAsync(billingEvent, tenantId) → DataProcessResult<bool>
               GetCurrentSpendAsync(entityId, entityType, tenantId) → DataProcessResult<Dictionary<string,object>>
```

---

# FAMILY 72 — Measurement & Attribution
## F544–F553 | Scope: Impression/click tracking, conversion, attribution engine

```
F544  IImpressionTrackerService
      FABRIC:  QUEUE FABRIC → Redis Streams (impression stream) + DATABASE FABRIC → ES
      PURPOSE: Processes raw impression events from F537. Enriches with viewability
               signals (F549), fraud signals (F554–F556), and device context.
               Emits enriched impression event to attribution engine (F550) after
               fraud gate (F555 — blocking, DD-99).
      METHODS: ProcessImpressionAsync(impressionEvent, tenantId) → DataProcessResult<Dictionary<string,object>>

F545  IClickTrackerService
      FABRIC:  QUEUE FABRIC + DATABASE FABRIC → ES (click log)
      PURPOSE: Processes click events: validates click is on a served impression (anti-
               fraud correlation), deduplicates (F497 pattern applied to clicks),
               enriches with device and context, routes to F550 attribution engine
               after fraud gate (F555 — blocking, DD-99).
      METHODS: ProcessClickAsync(clickEvent, tenantId) → DataProcessResult<Dictionary<string,object>>

F546  IConversionPixelService
      FABRIC:  DATABASE FABRIC → PostgreSQL (pixel registry)
      PURPOSE: Manages web conversion pixel (JavaScript snippet) registrations: pixel ID,
               event types (page_view, add_to_cart, purchase, lead), value mapping,
               and deduplication window. Pixel fires POST to the server event endpoint
               (F547) for each conversion event.
      METHODS: CreatePixelAsync(spec, accountId, tenantId) → DataProcessResult<string>
               GetPixelAsync(pixelId, tenantId) → DataProcessResult<Dictionary<string,object>>
               ValidatePixelFireAsync(pixelId, eventData, tenantId) → DataProcessResult<bool>

F547  IServerConversionService
      FABRIC:  QUEUE FABRIC → Redis Streams (server event ingestion stream)
      PURPOSE: Server-side conversion API endpoint: accepts POST from advertiser server
               with conversion event (purchase, lead, subscription). Validates signature,
               deduplicates (by advertiser-provided event_id), routes to F550 attribution.
               Server events have higher attribution weight than pixel events (less lossy).
      METHODS: IngestServerEventAsync(serverEvent, tenantId) → DataProcessResult<string>
               DeduplicateEventAsync(eventId, tenantId) → DataProcessResult<bool>

F548  IAppEventService
      FABRIC:  QUEUE FABRIC (mobile event stream)
      PURPOSE: Ingests mobile app events from platform SDK: app_install, app_open,
               in_app_purchase, level_complete, subscription. Validates SDK token,
               routes to F550 attribution engine. App events are deduplicated by
               install_id + event_name + timestamp window.
      METHODS: IngestAppEventAsync(appEvent, tenantId) → DataProcessResult<string>

F549  IViewabilityService
      FABRIC:  DATABASE FABRIC → Elasticsearch (viewability log)
      PURPOSE: Records viewability signals from client-side measurement: percent in
               viewport, time-in-view, MRC viewability standard (50% pixels for 1 second
               continuous for display). Viewability data feeds quality reporting (F566)
               and quality score refresh (F528). Viewability below threshold triggers
               "not viewable" flag — not billed for some pricing models.
      METHODS: RecordViewabilityAsync(viewabilityEvent, tenantId) → DataProcessResult<bool>
               GetViewabilityStatsAsync(adId, dateRange, tenantId) → DataProcessResult<Dictionary<string,object>>

F550  IAttributionEngineService
      FABRIC:  AI ENGINE FABRIC (attribution model scoring) + DATABASE FABRIC → PG
      PURPOSE: Assigns conversion credit to ad touchpoints. Applies attribution model
               from F552 (last-click / first-click / linear / data-driven). Respects
               attribution window from F561 (FREEDOM config per advertiser — DD-101).
               Cross-device attribution via F551. Fraud-screened events only (DD-99).
      METHODS: AttributeConversionAsync(conversionEvent, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetAttributionPathAsync(conversionId, tenantId) → DataProcessResult<List<object>>

F551  ICrossDeviceService
      FABRIC:  DATABASE FABRIC → PostgreSQL (identity graph)
      PURPOSE: Resolves cross-device identity: same user on mobile + desktop + tablet.
               Identity graph built from deterministic signals (login) and probabilistic
               (device graph, IP household). Required for accurate cross-device attribution
               and frequency cap enforcement across devices.
      METHODS: ResolveDeviceClusterAsync(deviceId, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetLinkedDevicesAsync(userId, tenantId) → DataProcessResult<List<object>>

F552  IAttributionModelService
      FABRIC:  DATABASE FABRIC → Elasticsearch (model definition FREEDOM config)
      PURPOSE: Stores and resolves attribution model definitions per advertiser account:
               last-click, first-click, linear (equal weight), time-decay, position-based,
               and data-driven (AI-powered based on historical conversion data). Model
               selection is FREEDOM config per account.
      METHODS: GetModelAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               SetModelAsync(accountId, model, tenantId) → DataProcessResult<bool>

F553  IAttributionWindowService
      FABRIC:  DATABASE FABRIC → Elasticsearch (window config FREEDOM config)
      PURPOSE: Resolves click-through and view-through attribution windows per advertiser
               account. Default: 7d click, 1d view; customisable per account (DD-101).
               Window config is FREEDOM config — advertiser can adjust for their
               conversion cycle without platform code change.
      METHODS: GetWindowAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               SetWindowAsync(accountId, clickWindow, viewWindow, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 73 — Fraud Detection & Revenue Integrity
## F554–F561 | Scope: Invalid traffic, click fraud, bot detection, fraud gate

Fraud gate (F555/F563) is BLOCKING before billing event emission. (DD-99)

```
F554  IInvalidTrafficService
      FABRIC:  AI ENGINE FABRIC + DATABASE FABRIC → ES (IVT log)
      PURPOSE: General-purpose invalid traffic (IVT) detector: covers both general
               invalid traffic (GIVT: bots, crawlers, data centres) and sophisticated
               invalid traffic (SIVT: spoofed user agents, falsified referrers). Uses
               AI ENGINE FABRIC for pattern analysis; Redis cache for known-bad signatures.
      METHODS: EvaluateTrafficAsync(event, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetIVTSignalsAsync(event) → DataProcessResult<List<object>>

F555  IClickFraudService
      FABRIC:  AI ENGINE FABRIC + DATABASE FABRIC → ES (fraud signals)
      PURPOSE: Click fraud scoring: velocity-based (same user clicking same ad repeatedly),
               coordinate-based (geographic clustering of clicks), and behavioural
               (no dwell time after click, no scroll). Fraud score above threshold →
               quarantine event (F560) BEFORE billing emission. (DD-99)
      METHODS: ScoreClickAsync(clickEvent, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsFraudulentAsync(clickEvent, tenantId) → DataProcessResult<bool>

F556  IBotDetectionService
      FABRIC:  AI ENGINE FABRIC (bot fingerprint classifier) + DATABASE FABRIC → Redis
      PURPOSE: Detects bot traffic from: headless browser signals, abnormal interaction
               patterns, missing browser APIs, mouse movement entropy, touch event
               analysis. Bot confidence score; above threshold → quarantine (F560).
      METHODS: ScoreBotLikelihoodAsync(interactionContext, tenantId) → DataProcessResult<Dictionary<string,object>>

F557  IIPReputationService
      FABRIC:  DATABASE FABRIC → Redis (IP reputation cache) + ES (reputation index)
      PURPOSE: Evaluates IP address reputation: data-centre IP, known proxy/VPN,
               Tor exit node, known-bad actor list. Used by F555 (fraud signal) and
               F523 (location targeting enrichment). Reputation data updated via
               external threat feed integration (QUEUE FABRIC consumer).
      METHODS: GetIPReputationAsync(ipAddress, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsDataCentreIPAsync(ipAddress) → DataProcessResult<bool>

F558  IDeviceFingerprintService
      FABRIC:  DATABASE FABRIC → Redis (fingerprint store)
      PURPOSE: Stores and matches device fingerprints: canvas fingerprint, WebGL hash,
               font list, screen resolution, timezone. Used for cross-device linking
               (F551 probabilistic) and fraud detection (repeated visits from same
               fingerprint with different claimed user IDs).
      METHODS: StoreFingerprint(fingerprint, deviceId, tenantId) → DataProcessResult<bool>
               MatchFingerprintAsync(fingerprint, tenantId) → DataProcessResult<Dictionary<string,object>?>

F559  IBehaviorAnomalyService
      FABRIC:  AI ENGINE FABRIC (anomaly detection model) + DATABASE FABRIC → ES
      PURPOSE: Detects behavioural anomalies in ad interaction sequences: unnatural
               dwell times, programmatic scrolling patterns, click-then-immediate-back,
               and coordinated amplification patterns (same content clicked by group
               at suspiciously similar intervals). Feeds F555 and F560.
      METHODS: AnalyzeSequenceAsync(interactionSequence, tenantId) → DataProcessResult<Dictionary<string,object>>

F560  IFraudQuarantineService
      FABRIC:  QUEUE FABRIC → DLQ (fraud quarantine queue) + DATABASE FABRIC → ES (audit)
      PURPOSE: Quarantines fraudulent events synchronously before billing. Quarantined
               events sent to DLQ for human review and reporting to IAB TechLab fraud
               reporting pipeline. Quarantine is blocking — billing event never emitted
               for quarantined impression/click. (DD-99)
      METHODS: QuarantineEventAsync(event, fraudSignals, tenantId) → DataProcessResult<string>
               GetQuarantineAuditAsync(dateRange, tenantId) → DataProcessResult<List<object>>

F561  IAttributionConfigService
      FABRIC:  DATABASE FABRIC → Elasticsearch (attribution config FREEDOM config)
      PURPOSE: Stores and resolves attribution window configuration per advertiser account.
               Separate from F553 (which reads the window) — this service owns the
               FREEDOM config document: {clickWindow_days, viewWindow_days, attributionModel,
               crossDeviceEnabled}. Admin or advertiser can update via dashboard.
               (DD-101, DR-77)
      METHODS: GetConfigAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>>
               UpdateConfigAsync(accountId, config, tenantId) → DataProcessResult<bool>
```

---

# FAMILY 74 — Billing, Reporting & Finance
## F562–F569 | Scope: Spend ledger, billing events, invoicing, reporting, forecasting

All spend ledger entries are APPEND-ONLY. No UPDATE or DELETE on billing records. (DD-91)

```
F562  ISpendLedgerService
      FABRIC:  DATABASE FABRIC → PostgreSQL (append-only spend ledger table)
      PURPOSE: Authoritative append-only ledger of all advertising spend events.
               Each entry: eventId, adId, accountId, eventType (impression/click/
               conversion), billableAmount, currency, timestamp, pricingModel.
               Financial corrections use offset entries, never modification. (DD-91, DR-75)
      METHODS: AppendLedgerEntryAsync(entry, tenantId) → DataProcessResult<string> (entryId)
               GetLedgerAsync(accountId, dateRange, tenantId) → DataProcessResult<List<object>>
               AppendOffsetEntryAsync(originalEntryId, reason, tenantId) → DataProcessResult<string>

F563  IFraudReversalService
      FABRIC:  DATABASE FABRIC → PostgreSQL (reversal records, append-only offset entries)
      PURPOSE: Processes fraud-detected post-billing reversals (rare path — DD-99 prevents
               most fraud at gate). Creates offset entries in F562 spend ledger.
               Reversal triggers credit to advertiser account. Reversals are append-only
               records — they never delete the original billing entry.
      METHODS: ProcessReversalAsync(originalEntryId, fraudEvidence, tenantId) → DataProcessResult<string>
               GetReversalHistoryAsync(accountId, tenantId) → DataProcessResult<List<object>>

F564  IBillingEventService
      FABRIC:  QUEUE FABRIC (billing event consumer) + DATABASE FABRIC → PG
      PURPOSE: Consumes billing-eligible events from QUEUE FABRIC (fraud-screened
               impressions/clicks from F544/F545), evaluates billability (viewability
               threshold, engagement minimum), writes billable entries to F562 ledger,
               and emits budget-decrement event to F543. Central billing choke point.
      METHODS: ProcessBillingEventAsync(event, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsBillableAsync(event, tenantId) → DataProcessResult<bool>

F565  IInvoiceGeneratorService
      FABRIC:  AI ENGINE FABRIC (invoice narrative generation) + DATABASE FABRIC → PG
      PURPOSE: Generates monthly/threshold invoices from F562 spend ledger. AI ENGINE
               FABRIC produces human-readable invoice narrative and line-item descriptions.
               Invoice stored in PG; PDF generated on demand. Supports multiple currencies
               and tax jurisdictions (tax rate from FREEDOM config).
      METHODS: GenerateInvoiceAsync(accountId, billingPeriod, tenantId) → DataProcessResult<string>
               GetInvoiceAsync(invoiceId, tenantId) → DataProcessResult<Dictionary<string,object>>

F566  IReportingService
      FABRIC:  DATABASE FABRIC → Elasticsearch (reporting aggregate index) + DW (long retention)
      PURPOSE: Aggregated campaign performance reporting: impressions, clicks, spend,
               conversions, CPM/CPC/CPA, ROAS, reach, frequency. Aggregations computed
               by background jobs and stored in ES reporting index. Near-real-time
               (10-minute lag for dashboard); daily aggregates in DW for 24+ month retention.
      METHODS: GetPerformanceReportAsync(filters, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetReachFrequencyAsync(campaignId, dateRange, tenantId) → DataProcessResult<Dictionary<string,object>>

F567  IDeveloperAnalyticsService
      FABRIC:  DATABASE FABRIC → Elasticsearch (developer analytics index)
      PURPOSE: Provides developer-facing API usage analytics: requests per endpoint,
               error rates by code, latency percentiles, quota consumption vs limit.
               Data aggregated from F471 abuse prevention and gateway logs. Available
               in developer dashboard (F576). Near-real-time with 5-minute aggregation lag.
      METHODS: GetApiUsageAsync(appId, dateRange, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetErrorBreakdownAsync(appId, dateRange, tenantId) → DataProcessResult<List<object>>

F568  IInsightService
      FABRIC:  AI ENGINE FABRIC (insight generation) + DATABASE FABRIC → ES
      PURPOSE: AI-generated actionable insights for advertisers: "Your CPM is 40% above
               benchmark — consider adjusting targeting"; "Click-through rate dropped 12%
               — creative fatigue detected." AI ENGINE FABRIC analyses performance trends;
               insights stored in ES with expiry. Insight generation is async background job.
      METHODS: GenerateInsightsAsync(accountId, tenantId) → DataProcessResult<List<object>>
               GetInsightsAsync(accountId, tenantId) → DataProcessResult<List<object>>

F569  ISpendForecastService
      FABRIC:  AI ENGINE FABRIC (time-series forecasting model) + DATABASE FABRIC → ES
      PURPOSE: Projects spend trajectory for the billing period based on: current pacing
               (F531), historical spend patterns, campaign objective, and remaining budget.
               Forecast alerts triggered when on-track to overspend or underspend by > 20%.
      METHODS: ForecastSpendAsync(accountId, billingPeriod, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetSpendAlertAsync(accountId, tenantId) → DataProcessResult<Dictionary<string,object>?>
```

---

# FAMILY 75 — Multi-Tenant Isolation & Governance
## F570–F583 | Scope: Audit logs, abuse detection, tenant edge resolution, quota isolation

Tenant identity resolved ONCE at edge (F578). No internal service re-resolves. (DD-94)
Per-tenant quota isolation via F581/F583. No shared quota pool. (DD-98)

```
F570  IAuditLogService
      FABRIC:  DATABASE FABRIC → Elasticsearch (audit log index, append-only)
      PURPOSE: Platform-wide audit log: "who accessed what, when, from which app."
               Every API read/write on sensitive nodes (user profile, ad accounts,
               payment methods) generates an audit entry. Audit log is append-only,
               immutable, tenant-scoped. Retention: 7 years (compliance requirement).
      METHODS: LogAccessAsync(auditEvent, tenantId) → DataProcessResult<string>
               QueryAuditAsync(filters, tenantId) → DataProcessResult<List<object>>

F571  IFlowVersionService
      FABRIC:  DATABASE FABRIC → Elasticsearch (flow version index, immutable snapshots)
      PURPOSE: Stores immutable flow version snapshots. Published FlowVersion can never
               be modified — any change creates a new version. Supports: publish, list,
               compare, rollback (rollback = publish previous version as new current).
               (DD-95, DR-76)
      METHODS: PublishVersionAsync(flowId, specSnapshot, tenantId) → DataProcessResult<string>
               GetVersionAsync(flowId, version, tenantId) → DataProcessResult<Dictionary<string,object>>
               ListVersionsAsync(flowId, tenantId) → DataProcessResult<List<object>>
               RollbackAsync(flowId, targetVersion, tenantId) → DataProcessResult<string>

F572  IGovernancePolicyService
      FABRIC:  DATABASE FABRIC → Elasticsearch (governance policy index, FREEDOM config)
      PURPOSE: Stores and enforces platform governance policies: data retention rules,
               GDPR deletion propagation requirements, privacy policy versions accepted,
               and audit log retention thresholds. FREEDOM config — compliance team
               updates policies without code deployment.
      METHODS: GetPolicyAsync(policyType, tenantId) → DataProcessResult<Dictionary<string,object>>
               EvaluateComplianceAsync(context, tenantId) → DataProcessResult<Dictionary<string,object>>

F573  IAbuseDetectionService
      FABRIC:  AI ENGINE FABRIC (pattern analysis) + DATABASE FABRIC → ES (abuse signals)
      PURPOSE: Deeper abuse analysis downstream of F471 (fast-path signal detection).
               Analyses: token sharing (same token used from many IPs), scraping
               patterns (systematic enumeration of user IDs), coordinated inauthentic
               behaviour (bulk actions from multiple accounts with same fingerprint).
               Findings fed back to F471 for future fast-path blocking.
      METHODS: AnalyzeAbusePatternAsync(signals, tenantId) → DataProcessResult<Dictionary<string,object>>
               FlagAccountAsync(accountId, abuseType, tenantId) → DataProcessResult<bool>

F574  ITokenSharingDetectorService
      FABRIC:  AI ENGINE FABRIC + DATABASE FABRIC → ES (token-IP correlation log)
      PURPOSE: Detects access tokens being shared across multiple IP ranges or geolocations
               inconsistent with legitimate use. Flags tokens used from >N distinct
               ASNs within a sliding time window. Flagged tokens queued for F477
               revocation review.
      METHODS: AnalyzeTokenUsageAsync(tokenId, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsTokenSharedAsync(tokenId, tenantId) → DataProcessResult<bool>

F575  IScrapingDetectorService
      FABRIC:  AI ENGINE FABRIC + DATABASE FABRIC → ES (request pattern log)
      PURPOSE: Detects systematic scraping: sequential node ID enumeration, high-volume
               field extraction on many distinct nodes within a short window, absence
               of human browsing patterns (no re-fetches, no variation in field
               selection). Findings reported to F471 (fast-path block) and F570 (audit log).
      METHODS: AnalyzeRequestPatternAsync(appId, window, tenantId) → DataProcessResult<Dictionary<string,object>>
               IsScraping Async(appId, tenantId) → DataProcessResult<bool>

F576  IDeveloperDashboardService
      FABRIC:  DATABASE FABRIC → Elasticsearch (dashboard aggregation index)
      PURPOSE: Aggregates and serves developer-facing operational data: API usage metrics
               (F567), webhook delivery rates (F496), error breakdown by endpoint,
               quota utilisation vs limit, recent audit entries for their app.
               Read-only aggregation layer; no writes through this service.
      METHODS: GetDashboardAsync(appId, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetWebhookHealthAsync(appId, tenantId) → DataProcessResult<Dictionary<string,object>>

F577  IErrorBudgetService
      FABRIC:  DATABASE FABRIC → Elasticsearch (SLO / error budget index)
      PURPOSE: Tracks SLO error budget consumption per API endpoint per tenant.
               Budget consumption = (1 - success_rate) × observation_window.
               Alerts when budget burn rate exceeds 2× sustainable rate (fast burn).
               Feeds developer dashboard (F576) and on-call alerting pipeline.
      METHODS: RecordOutcomeAsync(endpoint, success, latencyMs, tenantId) → DataProcessResult<bool>
               GetErrorBudgetAsync(endpoint, tenantId) → DataProcessResult<Dictionary<string,object>>

F578  ITenantEdgeResolverService
      FABRIC:  CORE FABRIC (token claim extraction via MicroserviceBase auth context)
      PURPOSE: Resolves tenant identity ONCE at API edge from validated JWT claims or
               subdomain. Result placed in trusted scope context propagated to all
               downstream services. Internal services read tenantId from scope context
               ONLY — never from user-supplied headers or request body. (DD-94, DR-77)
      METHODS: ResolveTenantAsync(requestContext) → DataProcessResult<Dictionary<string,object>>
               ValidateTenantContextAsync(scopeContext) → DataProcessResult<bool>
      DNA:     MicroserviceBase — scope context propagation standard component
               DataProcessResult<T> — unresolvable tenant = deny result, not exception

F579  ICrossFlowConflictService
      FABRIC:  DATABASE FABRIC → Elasticsearch (BFA index)
      PURPOSE: Registers FLOW-20 entities, events, and APIs in BFA indices for conflict
               detection against FLOW-01 through FLOW-14. Checks new ad entities against
               existing social graph entities (FLOW-01/02), content pipeline (FLOW-03/04),
               and finance engine (FLOW-13). Flags conflicts before code ships.
      METHODS: RegisterEntitiesAsync(entities, flowId, tenantId) → DataProcessResult<bool>
               CheckConflictsAsync(flowId, tenantId) → DataProcessResult<List<object>>

F580  IVersionCompatService
      FABRIC:  DATABASE FABRIC → Elasticsearch (compatibility matrix index)
      PURPOSE: Validates that new factory interfaces (F466–F583) are backward-compatible
               with existing flows (FLOW-01 through FLOW-14). Checks: no existing
               interface method signatures changed, no shared ES index schemas modified
               without migration, no QUEUE FABRIC event schema breaks.
      METHODS: ValidateCompatibilityAsync(flowId, factories, tenantId) → DataProcessResult<Dictionary<string,object>>
               GetCompatibilityMatrixAsync(tenantId) → DataProcessResult<List<object>>

F581  IQuotaEnforcementService
      FABRIC:  DATABASE FABRIC → Redis (per-tenant quota counters)
      PURPOSE: Enforces per-tenant API quotas: requests per minute, requests per day,
               concurrent connections. Quota counters are per-tenant in Redis (not shared
               pool — DD-98). Quota limits are FREEDOM config per tenant tier.
               Quota exhaustion returns 429 result (not exception), with Retry-After header.
      METHODS: CheckQuotaAsync(tenantId, quotaType) → DataProcessResult<Dictionary<string,object>>
               IncrementQuotaAsync(tenantId, quotaType) → DataProcessResult<bool>
               GetQuotaStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>

F582  IRateLimitRouterService
      FABRIC:  CORE FABRIC (MicroserviceBase cache component + Redis)
      PURPOSE: Routes rate limit enforcement decisions to the correct per-tenant quota
               enforcer (F581). Sits between F471 (fast-path abuse) and F581 (per-tenant
               quota). Provides: token bucket per endpoint, sliding window per app,
               global platform rate limit as backstop. All limits FREEDOM config.
      METHODS: CheckRateLimitAsync(requestContext, tenantId) → DataProcessResult<Dictionary<string,object>>
               RecordRequestAsync(requestContext, tenantId) → DataProcessResult<bool>

F583  INoisyNeighborGuardService
      FABRIC:  DATABASE FABRIC → Redis (burst detection) + ES (metrics)
      PURPOSE: Detects and throttles noisy-neighbor tenants whose burst traffic is
               degrading queue/database shared-infrastructure performance for others.
               Detection: per-tenant throughput vs fair-share baseline over 60s window.
               Mitigation: soft throttle (inject backpressure token), hard throttle
               (queue events to overflow), alert on-call. (DD-98)
      METHODS: DetectBurstAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
               ApplyThrottleAsync(tenantId, level) → DataProcessResult<bool>
               GetNeighborMetricsAsync() → DataProcessResult<List<object>>
```

---

## DESIGN RECORDS DR-66–DR-77

### DR-66: REST Graph Paths — API Contract and Versioning Standard
```
DECISION: All public Graph API endpoints follow the pattern /{version}/{nodeId}/{edge}?fields=...
          Version prefix (v1, v2...) is mandatory. No unversioned endpoints.
          Internal query planning uses GraphQL-style federation (F474) but is NEVER
          exposed as the public API surface.
RATIONALE: Versioned graph paths enable per-endpoint rate limiting, quota tracking, and
           deprecation with sunset headers (DD-86). GraphQL introspection leaks schema.
ENFORCEMENT: F467 (version resolution), F468 (normalisation), AF-7 compliance check
             rejects any generated controller that exposes GraphQL endpoint publicly.
SCOPE:     Family 60 — all gateway services (F466–F471)
AFFECTS:   T179, T180, T191
```

### DR-67: OAuth Scope Catalog and App Review Gates
```
DECISION: Platform OAuth scopes are categorised as: basic (no review required),
          sensitive (automated review via F479), and restricted (human review mandatory,
          e.g., manage_ads, pages_manage_posts). Sensitive scope applications must pass
          AI ENGINE FABRIC review with confidence > 0.85; restricted scopes require
          human approval regardless.
RATIONALE: Sensitive scopes grant access to user data and publishing capabilities.
           Without review gates, fraudulent apps can harvest data or abuse publishing.
ENFORCEMENT: F479 (review service), F480 (scope enforcement), iron rule IR-194-1.
SCOPE:     Family 62 — Identity & OAuth (F475–F480)
AFFECTS:   T194
```

### DR-68: Partial Authorization Response Format
```
DECISION: Graph API responses for partially-authorized requests return:
          { data: { ...authorized fields }, errors: [ { path, code, message } ] }
          "errors" array contains only PERMISSION_DENIED / SCOPE_INSUFFICIENT /
          RESTRICTED / AGE_GATED codes. HTTP status: 200 (not 403) when any data returned.
RATIONALE: 403 on partial auth forces callers to implement retry with reduced field sets.
           200 with partial errors follows Graph API industry convention (DD-87, F487).
ENFORCEMENT: F487 (partial error builder), AF-9 validates response format in generated code.
SCOPE:     Family 63 — Permission Engine (F481–F488)
AFFECTS:   T179, T180, T191
```

### DR-69: HMAC-SHA256 Webhook Signature Specification
```
DECISION: All webhook deliveries include header X-Platform-Signature: sha256={hex}.
          Signature computed as HMAC-SHA256(secret, payload_bytes) where secret is
          per-subscription, stored hashed in F493, and never returned in API responses.
          Signature computed by F496 BEFORE dispatch. No unsigned delivery path exists.
RATIONALE: DD-92. HMAC allows app to verify payload authenticity without a separate
           verification API call. Industry standard across major webhook providers.
ENFORCEMENT: F496 (delivery service IRON RULE IR-181-1: DeliverAsync MUST call
             ComputeHmacAsync before any HTTP dispatch).
SCOPE:     Family 65 — Webhooks (F493–F497)
AFFECTS:   T181
```

### DR-70: PCI Tokenization Boundary
```
DECISION: IPaymentMethodService (F505) is the ONLY service that accepts raw payment
          instrument data. F505 immediately forwards to external payment vault and
          stores only the vault-issued token. No other service EVER receives or stores
          raw PAN, CVV, or full card data. All internal references use the token.
RATIONALE: DD-93. Tokenization removes the platform from PCI-DSS Level 1 scope.
           Encrypted PAN storage still requires PCI audit scope.
ENFORCEMENT: AF-8 security scan rejects any generated service that stores fields named
             "card_number", "pan", "cvv", or any pattern matching card data.
SCOPE:     Family 67 — F505 only
AFFECTS:   T182
```

### DR-71: Auction p99 Latency SLO — 50ms Budget
```
DECISION: IAuctionEngineService (F542) has a p99 latency SLO of 50ms for the
          critical-path auction execution (from EligibleAdsLoader result to winner
          determination). This SLO is enforced by architectural constraint: F542
          may ONLY read from Redis (no PG, no ES) in the auction path.
RATIONALE: DD-88. Feed render latency budget is 200ms total; ad auction cannot consume
           more than 50ms. Redis reads are sub-millisecond; PG reads would violate budget.
ENFORCEMENT: AF-7 compliance check rejects any F542 implementation that calls
             DATABASE FABRIC with provider != Redis in the RunAuctionAsync method.
SCOPE:     Family 71 — F542
AFFECTS:   T184
```

### DR-72: Consent-Before-Evaluation Protocol
```
DECISION: The targeting evaluation pipeline MUST execute in this exact order:
          1. F525 ConsentLookup → if no consent: SKIP all targeting evaluation
          2. F519 TargetingEvaluator → only runs if consent confirmed
          3. F526 ExclusionList → post-evaluation exclusion filter
          Swapping steps 1 and 2 is a BUILD FAILURE (iron rule IR-184-3).
RATIONALE: DD-89. GDPR/CCPA require that no targeting evaluation processes personal
           data without consent. Post-filter approach still processes non-consented data.
ENFORCEMENT: IR-184-3 iron rule; AF-7 checks targeting pipeline ordering in generated code.
SCOPE:     Family 70 — F519, F525, F526
AFFECTS:   T184, T193
```

### DR-73: Political Ad Dual-Gate Protocol
```
DECISION: An ad is treated as "political" if EITHER: (a) F535 classifier returns
          political confidence ≥ 0.3 OR (b) ad category explicitly set to political
          by advertiser. For political ads: BOTH F535 classifier AND F538 political
          verification MUST pass before creative is eligible for auction.
          F538 checks: advertiser has political verification for the target jurisdiction.
          Missing verification = BUILD FAILURE regardless of campaign budget or reach.
RATIONALE: DD-90. Regulatory requirements (US FICA, EU DSA) mandate explicit verification.
           Classifier confidence is probabilistic; regulatory exposure is binary.
ENFORCEMENT: IR-187-2 iron rule; AF-9 validates dual-gate in generated review pipeline.
SCOPE:     Families 69–71 — F534, F535, F538, F541
AFFECTS:   T187, T184
```

### DR-74: Redis-Only Mutable Auction State Contract
```
DECISION: The following state types MUST be sourced from Redis (not PG, not ES)
          within the IAuctionEngineService (F542) RunAuctionAsync method:
          - Frequency cap counters (F530 → Redis INCR)
          - Pacing signals (F531 → Redis hash)
          - Budget remaining (F543 counter → Redis INCR)
          - Eligibility cache (F541 → Redis TTL 5min)
          Any other state source in the auction critical path = BUILD FAILURE.
RATIONALE: DD-88. 50ms p99 SLO (DR-71) requires all hot-path reads to be Redis.
           PG/ES reads in auction path would add 5–50ms per read.
ENFORCEMENT: AF-7 compliance rejects generated code with non-Redis fabric calls in
             RunAuctionAsync. IR-184-1 iron rule.
SCOPE:     Family 71 — F527–F543
AFFECTS:   T184, T185
```

### DR-75: Append-Only Spend Ledger Schema Contract
```
DECISION: The spend ledger table (F562) schema enforces append-only at the database level:
          - PG table has no UPDATE or DELETE grants for application users
          - Application-level: AppendLedgerEntryAsync and AppendOffsetEntryAsync only
          - Schema includes: entryId (UUID), originalEntryId (FK, for offsets), entryType
            (ORIGINAL/OFFSET), billableAmount, correctionAmount (for offsets), auditReason
          - entryId is immutable (PG primary key with no update trigger)
RATIONALE: DD-91. SOC2 Type II and ISO 27001 require immutable financial records.
           Billing dispute resolution requires the original event chain plus corrections.
ENFORCEMENT: AF-8 security scan rejects any generated code calling UPDATE/DELETE on
             ledger indices. IR-186-4 iron rule.
SCOPE:     Family 74 — F562, F563
AFFECTS:   T185, T186, T188, T195
```

### DR-76: Immutable Flow Version Snapshot Contract
```
DECISION: FlowVersion documents in ES have the following immutability contract:
          - Document ID = {flowId}:{semver} (version embedded in ID — prevents overwrite)
          - ES index mapping has dynamic: false (no new fields added to existing versions)
          - IFlowVersionService (F571): no UpdateVersionAsync method exists
          - "Rollback" = PublishVersionAsync with previous spec as new current version
          - Status transitions: DRAFT → REVIEW → PUBLISHED → DEPRECATED (unidirectional)
RATIONALE: DD-95. Incident root cause analysis requires stable version history.
           Mutable specs make before/after comparison impossible.
ENFORCEMENT: AF-7 rejects generated code that calls any update/delete on flow version index.
             IR-189-2 iron rule.
SCOPE:     Family 75 — F571
AFFECTS:   T189
```

### DR-77: Attribution Window and Tenant Resolution FREEDOM Config Schemas
```
DECISION: Two canonical FREEDOM config schemas defined for FLOW-20:

          Attribution Window Config (F561 / F553):
          {
            "tenantId": "...",
            "accountId": "...",
            "clickWindowDays": 7,          // 1–90
            "viewWindowDays": 1,           // 0–7 (0 = view attribution disabled)
            "attributionModel": "last_click", // last_click|first_click|linear|data_driven
            "crossDeviceEnabled": true
          }

          Tenant Edge Resolution Context (F578):
          {
            "tenantId": "...",              // resolved from JWT claim "tid" or subdomain
            "resolvedAt": "ISO8601",
            "source": "jwt_claim|subdomain",
            "propagatedTo": ["downstream services via scope context only"]
          }

          Both schemas stored in ES FREEDOM config index; admin-editable via dashboard.
RATIONALE: DD-101 (attribution windows per advertiser), DD-94 (tenant edge-only resolution).
ENFORCEMENT: AF-7 validates FREEDOM config doc structure in generated admin services.
SCOPE:     Families 70–75 — F553, F561, F578
AFFECTS:   T190, T196, all FLOW-20 task types
```

---

## POST-FLOW-20 ENGINE ARCHITECTURE TOTALS

```
FACTORIES (continuous):
  F1–F465     [FLOW-01 through FLOW-14]
  F466–F575   [FLOW-20 Graph API + Sponsored Content + Multi-Tenant, Families 60–75]  ← NEW
  Next: F576+ (FLOW-21)

Note: F576–F583 are the final 8 factories of Family 75 (Governance), included above.
      Next flow starts at F584.

DESIGN RECORDS: DR-1–DR-77 (77 total)
  DR-1–DR-65  [FLOW-01 through FLOW-14]
  DR-66–DR-77 [FLOW-20 Graph API + Sponsored Content]  ← NEW
```

## SAVE POINT: FLOW20:P1:ARCH ✅
## Phase 1 COMPLETE: Families 60–75 (F466–F575/F583), DR-66–DR-77
## Recovery: "Continue FLOW-20 Phase P2" → FLOW20_TASK_TYPES_CATALOG.md
