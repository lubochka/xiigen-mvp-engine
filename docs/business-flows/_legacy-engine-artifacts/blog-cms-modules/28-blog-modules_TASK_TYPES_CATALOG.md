# XIIGen TASK TYPES CATALOG — FLOW-26: Blog/CMS Modules Platform
## Task Types: T389–T406 (18 engine contracts)
## Date: 2026-03-01 | Status: COMPLETE

---

## ENGINE CONTRACT FORMAT REMINDER
Every task type is a FULL CONTRACT. No stubs. Fields required:
ARCHETYPE | ENTRY | PURPOSE | DISTINCT FROM | FACTORY DEPENDENCIES |
FABRIC RESOLUTION | AF CONFIGURATION | BFA VALIDATION |
MACHINE/FREEDOM | IRON RULES | QUALITY GATES

---

## T389 — Content Lifecycle Orchestrator

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: ContentLifecycleRequest with {contentId, tenantId, fromStatus, toStatus} confirmed by AF-2 planning
**PURPOSE**: Top-level orchestrator for all content status transitions. Routes to specialized gates (T391 for publish, T392 for scheduled, T393 for archive). Maintains audit trail of all transitions.
**DISTINCT FROM**: T391 (publish-specific gate), T393 (archive flow), T347 (visual editor canvas — different domain)

**FACTORY DEPENDENCIES**: F1075, F1076, F1079, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — load content document
- F1076 → DATABASE FABRIC (PostgreSQL) — create revision snapshot
- F1079 → QUEUE FABRIC (Redis Streams) — enqueue status transition event
- F1114 → CORE FABRIC (MicroserviceBase auth) — permission gate before transition

**AF CONFIGURATION**:
- AF-2 (Planning): Decompose status transition into steps, verify transition is valid per state machine
- AF-7 (Compliance): Confirm DNA-5 scope isolation on all DB calls
- AF-9 (Judge): Validates transition logic, audit record completeness, permission check presence

**BFA VALIDATION**: CF-510 (content entity ownership with FLOW-02), CF-511 (status event conflicts with FLOW-04 notification pipeline)

**MACHINE/FREEDOM**:
- MACHINE: Status state machine rules (Draft→Review→Published, not Draft→Archived direct). Audit log format.
- FREEDOM: Required reviewers per content type, auto-transition rules, notification triggers.

**IRON RULES**:
1. EVERY transition requires tenantId — BUILD FAILURE if missing
2. Transition must be validated against allowed state machine paths — no arbitrary status jumps
3. Revision snapshot MUST be created before status change
4. Permission check MUST precede all status changes

**QUALITY GATES (AF-9)**:
- [ ] Valid fromStatus→toStatus path per state machine
- [ ] Revision created before transition committed
- [ ] Audit event persisted to queue before returning success
- [ ] tenantId present on all fabric calls

---

## T390 — Draft Autosave Loop

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: AutosaveEvent {contentId, draftPayload, sessionId, tenantId} — triggered every N seconds by editor client
**PURPOSE**: Persist draft state in session store (Redis TTL) without creating formal revisions. Debounces rapid saves. On session end, promotes to revision.
**DISTINCT FROM**: T389 (full lifecycle), T391 (formal publish). T390 handles the sub-second autosave loop only.

**FACTORY DEPENDENCIES**: F1075, F1076, F1080 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — read current content for diff
- F1076 → DATABASE FABRIC (PostgreSQL) — create formal revision on session end
- F1080 → DATABASE FABRIC (Redis) — store draft autosave (TTL: configurable, default 1h)

**AF CONFIGURATION**:
- AF-6 (Code Review): Ensure debounce logic is correct, no tight loops
- AF-8 (Security): Validate draft payload against XSS patterns before storing
- AF-9 (Judge): Verifies TTL is set, session isolation enforced

**BFA VALIDATION**: CF-512 (editor session conflicts with FLOW-22/23 visual editor sessions)

**MACHINE/FREEDOM**:
- MACHINE: Autosave TTL capped at 24h. Draft stored as Dictionary<string,object>.
- FREEDOM: Autosave interval (5s–120s), max draft history kept per session.

**IRON RULES**:
1. Draft payload stored as Dictionary — never typed model (DNA-1)
2. Session store keyed by {tenantId}:{sessionId}:{contentId} — scope isolation (DNA-5)
3. Autosave NEVER creates a formal revision — only explicit save/publish does

**QUALITY GATES (AF-9)**:
- [ ] Redis key includes tenantId prefix
- [ ] TTL is always set (never persist forever)
- [ ] Payload sanitized (no script injection) before storage

---

## T391 — Content Publish Gate

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: PublishIntent {contentId, requesterId, tenantId, requiresApproval?} — fired by T389 when toStatus=Published
**PURPOSE**: Formal publish gate. Checks permissions, optionally routes through approval workflow (T391 waits for F1110 signal), fires onBeforePublish hooks, publishes content, triggers cascade (T397 search index, T398 cache invalidation, T405 sitemap).
**DISTINCT FROM**: T389 (parent orchestrator), T392 (scheduled — time-gated publish), T399 (hook executor called BY T391)

**FACTORY DEPENDENCIES**: F1075, F1079, F1090, F1110, F1111, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — fetch content to publish
- F1079 → QUEUE FABRIC (Redis Streams) — publish status event
- F1090 → DATABASE FABRIC (Elasticsearch) — load registered onBeforePublish hooks
- F1110 → QUEUE FABRIC (Redis Streams, human-in-loop) — optional approval gate signal
- F1111 → QUEUE FABRIC (Redis Streams, CloudEvents) — emit ContentPublished event
- F1114 → CORE FABRIC (MicroserviceBase) — permission check: user can publish?

**AF CONFIGURATION**:
- AF-1 (Genesis): Generates ContentPublishingService.PublishAsync() on top of fabrics
- AF-4 (RAG): Retrieves SK-251 (ContentRepository), SK-261 (Editorial Approval Gate) patterns
- AF-7 (Compliance): Verifies no direct ES/Redis calls, all through fabric
- AF-9 (Judge): Validates hook ordering, approval path, event emission

**BFA VALIDATION**:
- CF-510 (content entity with FLOW-02 content management)
- CF-513 (ContentPublished event collision with FLOW-04 notifications)
- CF-514 (search index update triggering FLOW-09 search conflicts)

**MACHINE/FREEDOM**:
- MACHINE: publish = atomic (content stored + event emitted, or both rolled back). Hook order: onBefore → store → onAfter.
- FREEDOM: requiresApproval toggle, approver roles, max approval wait time, which hooks are active.

**IRON RULES**:
1. ContentPublished CloudEvent MUST be emitted — downstream index/cache depend on it
2. If requiresApproval=true AND no approver available after timeout → DLQ with APPROVAL_TIMEOUT
3. No publish without CanAsync("publish", contentId, tenantId) returning true
4. Hook execution failure MUST NOT block publish (hooks are fire-and-forget)

**QUALITY GATES (AF-9)**:
- [ ] CloudEvents envelope complete (specversion, type, source, tenantId, contentId)
- [ ] Permission check precedes all mutations
- [ ] Approval wait is bounded by configurable timeout
- [ ] Hook failures logged but non-blocking

---

## T392 — Scheduled Publish Timer Gate

**ARCHETYPE**: ORCHESTRATION + EVENT_PROCESSING
**ENTRY**: ScheduledPublishRequest {contentId, scheduledAt, tenantId} stored → timer fires at scheduledAt
**PURPOSE**: Time-gate the T391 publish flow. Stores schedule in queue with delayed delivery. At scheduled time, fires T391. Supports reschedule and cancel.
**DISTINCT FROM**: T391 (immediate publish), T389 (status orchestrator). T392 adds the time-delay dimension.

**FACTORY DEPENDENCIES**: F1075, F1079, F1109, F1111, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — verify content still in Scheduled status
- F1079 → QUEUE FABRIC (Redis Streams) — scheduled message with delayed delivery
- F1109 → QUEUE FABRIC (Redis Streams) — timer consumer group: scheduled-pub
- F1111 → QUEUE FABRIC (Redis Streams) — emit ScheduledPublishFired event
- F1114 → CORE FABRIC — permission re-check at fire time (requester may have lost permission)

**AF CONFIGURATION**:
- AF-2 (Planning): Decomposes into: store-schedule → wait → re-check → fire-T391
- AF-6 (Code Review): Verify timer precision, clock skew handling
- AF-9 (Judge): Confirm content re-verified at fire time, not only at schedule time

**BFA VALIDATION**: CF-515 (scheduled publish conflicts with FLOW-04 notification scheduling)

**MACHINE/FREEDOM**:
- MACHINE: Content status must be "Scheduled" at fire time. If content deleted → DLQ.
- FREEDOM: Max schedule-ahead window, time zones, notification on schedule (email/push).

**IRON RULES**:
1. Re-verify content status AND permissions at timer-fire time (not just at schedule-save time)
2. Cancellation MUST be idempotent
3. Clock skew tolerance: accept fires within ±30s of scheduledAt

**QUALITY GATES (AF-9)**:
- [ ] Status re-verified at fire time
- [ ] Cancel path is idempotent
- [ ] Timer stored with tenantId scope

---

## T393 — Content Archive & Unpublish Flow

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: ArchiveIntent {contentId, reason, tenantId} — toStatus=Archived or Unpublished
**PURPOSE**: Reverse of T391. Removes from public access (updates status, removes from search index, invalidates page cache, updates sitemap). Does NOT delete content — revision history preserved.
**DISTINCT FROM**: T391 (publish direction), T398 (cache invalidation — called BY T393)

**FACTORY DEPENDENCIES**: F1075, F1079, F1095, F1097, F1111, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — update content status
- F1079 → QUEUE FABRIC — enqueue archive status event
- F1095 → DATABASE FABRIC (Elasticsearch) — remove from search index
- F1097 → DATABASE FABRIC (Redis) — invalidate cached pages for this content
- F1111 → QUEUE FABRIC (CloudEvents) — emit ContentArchived event
- F1114 → CORE FABRIC — permission check: user can archive?

**AF CONFIGURATION**:
- AF-7 (Compliance): Confirm delete-from-index does NOT delete the content document itself
- AF-9 (Judge): Verifies cascade completeness (index + cache + event)

**BFA VALIDATION**: CF-516 (archive event conflicts with FLOW-09 search state)

**MACHINE/FREEDOM**:
- MACHINE: Archive = status change + index removal + cache invalidation (must all succeed).
- FREEDOM: Grace period before cache invalidation, notification on archive.

**IRON RULES**:
1. Archive NEVER deletes content — only changes status and removes from public index
2. Cache invalidation MUST be attempted even if index removal fails

**QUALITY GATES (AF-9)**:
- [ ] Content document still exists in DB after archive
- [ ] Search index document removed
- [ ] Page cache invalidated for affected URLs
- [ ] ContentArchived CloudEvent emitted

---

## T394 — Media Upload & Transform Pipeline

**ARCHETYPE**: ORCHESTRATION (async multi-step)
**ENTRY**: MediaUploadRequest {file, contentType, tenantId, variants?} — multipart upload
**PURPOSE**: Upload media → persist metadata → enqueue async transform jobs (thumbnail, responsive variants, WebP) → track job status → associate variants with original.
**DISTINCT FROM**: T395 (variant-request gate for on-demand transforms). T394 is the primary upload flow.

**FACTORY DEPENDENCIES**: F1081, F1082, F1083, F1084, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1081 → DATABASE FABRIC (Redis + blob/S3-compat) — upload tracking + blob storage
- F1082 → QUEUE FABRIC (Redis Streams) — transform job queue (async)
- F1083 → DATABASE FABRIC (Elasticsearch) — media library index entry
- F1084 → DATABASE FABRIC (PostgreSQL) — variant records (after transform)
- F1114 → CORE FABRIC — upload permission check

**AF CONFIGURATION**:
- AF-1 (Genesis): Generates MediaUploadService.UploadAsync() + transform fan-out
- AF-4 (RAG): Retrieves SK-254 (Media Transform Pipeline) pattern
- AF-8 (Security): Validates content-type whitelist, scans for malware signatures
- AF-9 (Judge): Verifies async job tracking, blob reference integrity

**BFA VALIDATION**: CF-517 (media entity conflicts with FLOW-11 media processing pipeline)

**MACHINE/FREEDOM**:
- MACHINE: Supported mime types, max file size, variant generation spec (thumbnail 150×150, webp quality 80).
- FREEDOM: Max upload size per tier, CDN domain, transform queue concurrency, storage provider.

**IRON RULES**:
1. File type MUST be validated against allowlist — reject unknown types
2. Original file MUST be stored before transform jobs are enqueued
3. Transform failure MUST NOT fail the upload — original remains accessible
4. Media library entry keyed by {tenantId}:{mediaId} (DNA-5)

**QUALITY GATES (AF-9)**:
- [ ] Original stored successfully before job enqueue
- [ ] Transform jobs idempotent (retry-safe)
- [ ] Variant URLs not returned until transform confirmed complete
- [ ] tenantId in every blob storage path prefix

---

## T395 — Media Variant Request Gate

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: VariantRequest {mediaId, variantSpec, tenantId} — on-demand transform for unlisted variant
**PURPOSE**: Check if variant exists. If yes, return URL immediately. If no, enqueue transform job and return polling token. Short-circuit for cached variants.
**DISTINCT FROM**: T394 (bulk upload + standard variants). T395 is the on-demand single-variant gate.

**FACTORY DEPENDENCIES**: F1082, F1083, F1084, F1087 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1082 → QUEUE FABRIC — submit on-demand transform job
- F1083 → DATABASE FABRIC (Elasticsearch) — check media library for existing variant
- F1084 → DATABASE FABRIC (PostgreSQL) — persist new variant record
- F1087 → DATABASE FABRIC (Redis) — cache resolved variant URL (TTL: 7d)

**AF CONFIGURATION**:
- AF-6 (Code Review): Short-circuit path verified (cache hit returns immediately)
- AF-9 (Judge): Confirms cache key includes tenantId + variantSpec hash

**BFA VALIDATION**: CF-518 (variant URL conflicts with FLOW-11 CDN edge caching)

**MACHINE/FREEDOM**:
- MACHINE: Variant spec validated against allowed dimensions/formats. Cache TTL minimum 1h.
- FREEDOM: Allowed variant dimensions, WebP quality settings, CDN cache-control headers.

**IRON RULES**:
1. Never re-transform if variant already exists — check before enqueue
2. Cache keys MUST include tenantId for scope isolation (DNA-5)

**QUALITY GATES (AF-9)**:
- [ ] Existing variant check before enqueue
- [ ] Cache key includes tenantId + variantSpec hash
- [ ] Polling token includes jobId + tenantId

---

## T396 — Public Page Request Pipeline

**ARCHETYPE**: HYBRID_SYNC_ASYNC (fast sync path with async cache warming)
**ENTRY**: PublicPageRequest {slug, tenantId, headers} — inbound HTTP GET to public blog
**PURPOSE**: High-performance public page rendering. Hot path: slug→cache hit→return. Cold path: slug→resolve→permission check→fetch content+taxonomy+media refs→render→cache→return. Cache-first always.
**DISTINCT FROM**: T388 (route→permission in admin). T396 is the public read path — no auth required for public content.

**FACTORY DEPENDENCIES**: F1075, F1077, F1083, F1085, F1086, F1087, F1088, F1099 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — fetch content document
- F1077 → DATABASE FABRIC (Elasticsearch) — fetch taxonomy terms for content
- F1083 → DATABASE FABRIC (Elasticsearch) — fetch associated media refs
- F1085 → CORE FABRIC — render HTML from content + template + theme
- F1086 → DATABASE FABRIC (Elasticsearch + Redis) — resolve template for content type
- F1087 → DATABASE FABRIC (Redis) — page cache (hit returns immediately, miss populates after render)
- F1088 → DATABASE FABRIC (Redis + ES) — slug→contentId resolution
- F1099 → RAG FABRIC (Hybrid strategy) — related content for sidebar

**AF CONFIGURATION**:
- AF-1 (Genesis): Generates PublicPageService with cache-first pattern
- AF-4 (RAG): Retrieves SK-258 (Theme Renderer & Page Cache) pattern
- AF-6 (Code Review): Verifies cache-first path, N+1 query prevention for taxonomy/media
- AF-8 (Security): XSS prevention in rendered output, visibility check (published status)
- AF-9 (Judge): Response time budget: p99 < 200ms cache hit, p99 < 500ms cache miss

**BFA VALIDATION**: CF-519 (public page cache conflicts with FLOW-09 search index invalidation)

**MACHINE/FREEDOM**:
- MACHINE: Only Published content served to public. cache-first path always attempted.
- FREEDOM: Cache TTL per content type, CDN headers (Cache-Control, Surrogate-Key), related content count.

**IRON RULES**:
1. NEVER serve non-Published content on public path — visibility check is non-negotiable
2. Cache key MUST include tenantId (even if tenant serves custom domain)
3. Related content (F1099 RAG) failure MUST NOT fail page render — graceful degradation

**QUALITY GATES (AF-9)**:
- [ ] Published status verified before render
- [ ] Cache populated on every cold path render
- [ ] Related content is non-blocking (background or timeout-bounded)
- [ ] Response includes Surrogate-Key header for CDN tag-based invalidation

---

## T397 — Search Index Cascade

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: ContentPublished CloudEvent from T391/T392 (F1111 event stream)
**PURPOSE**: Consume ContentPublished events and update Elasticsearch search index. Idempotent — safe to re-deliver. Also indexes taxonomy associations and author info in the same document.
**DISTINCT FROM**: T396 (reads from index), T398 (cache invalidation — separate cascade). T397 is the index-write path only.

**FACTORY DEPENDENCIES**: F1077, F1083, F1095, F1096, F1116 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1077 → DATABASE FABRIC (Elasticsearch) — fetch taxonomy terms for enrichment
- F1083 → DATABASE FABRIC (Elasticsearch) — fetch media thumbnail for index enrichment
- F1095 → DATABASE FABRIC (Elasticsearch) — write/update search index document
- F1096 → DATABASE FABRIC (Elasticsearch) — query builder for percolator update
- F1116 → DATABASE FABRIC (Elasticsearch) — fetch author profile for index enrichment

**AF CONFIGURATION**:
- AF-7 (Compliance): Confirm index document is Dictionary<string,object> — not typed
- AF-9 (Judge): Idempotency verified (re-indexing same contentId is safe)

**BFA VALIDATION**: CF-514, CF-520 (FLOW-09 search index schema conflicts)

**MACHINE/FREEDOM**:
- MACHINE: Index document schema (fixed set of searchable fields + dynamic extra fields). Idempotent upsert.
- FREEDOM: Index refresh interval, searchable field boosting, which fields included in summary.

**IRON RULES**:
1. MUST be idempotent — re-delivering ContentPublished MUST NOT corrupt index
2. Taxonomy and author enrichment fetched BEFORE indexing (no lazy joins in search)
3. Index failure MUST retry via DLQ — not silently dropped

**QUALITY GATES (AF-9)**:
- [ ] Duplicate ContentPublished messages produce same index state (idempotent)
- [ ] Enrichment fetches are retried independently of index write
- [ ] DLQ entry created on persistent failure with full event envelope

---

## T398 — Cache Invalidation Cascade

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: ContentPublished OR ContentArchived CloudEvent (from F1111 event stream)
**PURPOSE**: Invalidate all page cache entries affected by a content change. Uses Surrogate-Key / tag-based invalidation. Invalidates: the content's own page, archive/category pages, author page, tag pages, home page (if featured). Idempotent.
**DISTINCT FROM**: T397 (search index — separate concern). T398 invalidates only the page cache layer.

**FACTORY DEPENDENCIES**: F1077, F1087, F1097, F1113 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1077 → DATABASE FABRIC (Elasticsearch) — fetch taxonomy terms to find affected archive pages
- F1087 → DATABASE FABRIC (Redis) — direct page cache invalidation
- F1097 → DATABASE FABRIC (Redis) — bulk invalidation by tag pattern
- F1113 → DATABASE FABRIC (Redis) — canonical URL lookup for invalidation key building

**AF CONFIGURATION**:
- AF-6 (Code Review): Verify invalidation scope is tight (not over-invalidating all cache)
- AF-9 (Judge): Confirm invalidation is bounded, not unbounded wildcard deletes

**BFA VALIDATION**: CF-521 (cache invalidation conflicts with FLOW-22 visual editor preview caches)

**MACHINE/FREEDOM**:
- MACHINE: Invalidation granularity: by Surrogate-Key tags. Never full cache flush on single publish.
- FREEDOM: Which page types included (home page, category pages), CDN purge API endpoint.

**IRON RULES**:
1. NEVER invalidate the entire cache for a single content event — tag-based only
2. CDN purge API call (if configured) MUST be async and non-blocking

**QUALITY GATES (AF-9)**:
- [ ] Invalidation scope limited to tags for affected content + taxonomy
- [ ] Idempotent (multiple events for same contentId produce same cache state)
- [ ] CDN purge failure does NOT block cache invalidation

---

## T399 — Hook Fan-Out Executor

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: HookFireRequest {hookName, payload, tenantId, traceId} — fired by T391, T393, T402
**PURPOSE**: Load all registered handlers for hookName from F1090 (IHookRegistry). Fan out to N handlers via queue. Collect results. Return aggregate success/failure. Failures are isolated — one handler failure does not cancel others.
**DISTINCT FROM**: T400 (external webhook dispatch — subset of T399 flow). T399 is the internal hook system.

**FACTORY DEPENDENCIES**: F1090, F1092, F1094 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1090 → DATABASE FABRIC (Elasticsearch) — load registered handlers for hookName + tenantId
- F1092 → QUEUE FABRIC (Redis Streams) — fan-out to handler queue (one message per handler)
- F1094 → CORE FABRIC (MicroserviceBase) — execution sandbox isolation per handler

**AF CONFIGURATION**:
- AF-2 (Planning): Decomposes fan-out strategy, determines max handler concurrency
- AF-6 (Code Review): Verify handler isolation — one handler crash cannot affect others
- AF-9 (Judge): Hook result aggregation, timeout bounds per handler

**BFA VALIDATION**: CF-522 (hook events conflicts with FLOW-21 form automation hooks)

**MACHINE/FREEDOM**:
- MACHINE: Handler timeout max 30s. Hook payload immutable (passed as-is to all handlers).
- FREEDOM: Per-hook max concurrency, timeout per handler, retry policy, which hooks are active.

**IRON RULES**:
1. Handler failures MUST be isolated — never propagate to sibling handlers
2. Hook payload MUST NOT be mutated between handlers
3. Hook execution MUST be fire-and-forget for the caller (T391 does not wait for all hooks)

**QUALITY GATES (AF-9)**:
- [ ] All handlers receive identical payload
- [ ] Handler failure logged with handler endpoint + traceId
- [ ] Total hook execution time capped at configurable max

---

## T400 — Webhook Dispatch Gate

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: WebhookDispatchRequest {endpointUrl, payload, secret, tenantId} — triggered by T399 for external URL handlers
**PURPOSE**: Deliver webhook POST to external URL with HMAC-signed payload. Retry with exponential backoff. Record delivery status. Support signature verification by receiver.
**DISTINCT FROM**: T399 (internal hook fan-out). T400 handles only the external HTTP delivery.

**FACTORY DEPENDENCIES**: F1093, F1090 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1093 → QUEUE FABRIC (Redis Streams) — webhook delivery queue with retry
- F1090 → DATABASE FABRIC (Elasticsearch) — record delivery attempt + status

**AF CONFIGURATION**:
- AF-8 (Security): HMAC-SHA256 signing, SSRF prevention (block private IP ranges), TLS required
- AF-9 (Judge): Retry policy correctness, idempotency header on re-delivery

**BFA VALIDATION**: CF-523 (external webhook delivery conflicts with FLOW-04 notification external delivery)

**MACHINE/FREEDOM**:
- MACHINE: HMAC-SHA256 signing always required. Private IP ranges blocked. TLS required.
- FREEDOM: Retry count (max 10), backoff multiplier, timeout per attempt, delivery log retention.

**IRON RULES**:
1. NEVER deliver to private IP ranges (10.x, 172.16.x, 192.168.x, localhost)
2. HMAC signature MUST be included in X-Signature-256 header
3. Add Idempotency-Key header on retry deliveries

**QUALITY GATES (AF-9)**:
- [ ] SSRF protection active (IP range validation)
- [ ] HMAC header present on all deliveries
- [ ] Retry schedule follows exponential backoff
- [ ] Delivery log records all attempts with timestamps + HTTP response codes

---

## T401 — Comment Submission & Spam Gate

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: CommentSubmitRequest {contentId, parentCommentId?, body, authorInfo, tenantId}
**PURPOSE**: Accept comment submission → AI spam analysis (F1101) → if spam: reject/DLQ → if ham: persist to moderation queue (if requiresModeration=true) or publish directly. Idempotent on duplicate submissions.
**DISTINCT FROM**: T402 (moderation queue — the human review step AFTER T401 accepts comment). T401 is the intake gate.

**FACTORY DEPENDENCIES**: F1100, F1101, F1102, F1103, F1114 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1100 → DATABASE FABRIC (Elasticsearch) — persist comment document
- F1101 → AI ENGINE FABRIC → IAiProvider — spam classification
- F1102 → QUEUE FABRIC (Redis Streams) — moderation queue if requiresModeration=true
- F1103 → QUEUE FABRIC (Redis Streams) — notify author of pending moderation
- F1114 → CORE FABRIC — rate limit check (comment flood protection)

**AF CONFIGURATION**:
- AF-1 (Genesis): Generates CommentSubmissionService with spam gate
- AF-4 (RAG): Retrieves SK-256 (Comment Moderation Queue) pattern
- AF-8 (Security): Validates body for XSS, SQLi patterns before AI analysis
- AF-9 (Judge): Spam model threshold calibration, false-positive handling path

**BFA VALIDATION**: CF-524 (comment entity conflicts with FLOW-12 chat/messaging)

**MACHINE/FREEDOM**:
- MACHINE: Body sanitized before storage. Spam score threshold checked. Author rate limit enforced.
- FREEDOM: Spam threshold (0.0–1.0), requiresModeration toggle, max comments per hour per author.

**IRON RULES**:
1. Body MUST be sanitized before AI analysis and storage
2. AI spam analysis timeout MUST NOT block submission — if timeout, treat as "review" status
3. Rate limit check MUST precede AI analysis (cheaper gate first)

**QUALITY GATES (AF-9)**:
- [ ] Body sanitized (XSS/script tags removed)
- [ ] AI analysis timeout bounded (default 5s max)
- [ ] Spam → DLQ path logged with score + reasoning
- [ ] Rate limit gate precedes AI gate

---

## T402 — Comment Moderation Queue Gate

**ARCHETYPE**: ORCHESTRATION (human-in-loop)
**ENTRY**: CommentAwaitingModeration event (from T401 via F1102)
**PURPOSE**: Present comment to moderator via admin UI. Wait for APPROVE/REJECT decision. On approve: publish comment + notify commenter. On reject: notify commenter with reason. Supports bulk moderation.
**DISTINCT FROM**: T401 (spam intake — automated). T402 is the human moderation step.

**FACTORY DEPENDENCIES**: F1100, F1102, F1103, F1115 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1100 → DATABASE FABRIC (Elasticsearch) — update comment status on decision
- F1102 → QUEUE FABRIC (Redis Streams) — consume from moderation queue, acknowledge on decision
- F1103 → QUEUE FABRIC (Redis Streams) — notify commenter of decision
- F1115 → DATABASE FABRIC (Elasticsearch) — verify moderator has moderation role

**AF CONFIGURATION**:
- AF-9 (Judge): Decision is idempotent (multiple approve signals for same comment = same result)

**BFA VALIDATION**: CF-525 (moderation decision conflicts with FLOW-25 BFA governance decisions)

**MACHINE/FREEDOM**:
- MACHINE: Comment can only transition: Pending → Approved | Rejected. Approved = visible to public.
- FREEDOM: Auto-approve after N days if no moderator action, notification templates.

**IRON RULES**:
1. Moderator MUST have "moderate" capability — verified via F1115
2. Approved comments immediately visible (no additional queue step)
3. Decision MUST be idempotent

**QUALITY GATES (AF-9)**:
- [ ] Moderator capability verified before accepting decision
- [ ] Comment status updated atomically with notification enqueue
- [ ] Decision logged with moderator userId + timestamp

---

## T403 — Taxonomy Term Propagation

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: TaxonomyChangeEvent {termId, action: "create"|"update"|"delete"|"merge", tenantId}
**PURPOSE**: When taxonomy terms change, propagate impact: update all content referencing the term, rebuild affected archive pages in cache, update search index taxonomy facets, invalidate sitemap.
**DISTINCT FROM**: T397 (single content index update), T398 (cache invalidation). T403 is taxonomy-change-driven cascade.

**FACTORY DEPENDENCIES**: F1075, F1077, F1095, F1097, F1098 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — find all content with this term → batch update
- F1077 → DATABASE FABRIC (Elasticsearch) — update taxonomy document
- F1095 → DATABASE FABRIC (Elasticsearch) — re-index affected content documents
- F1097 → DATABASE FABRIC (Redis) — invalidate archive page caches for term
- F1098 → QUEUE FABRIC — trigger sitemap rebuild job

**AF CONFIGURATION**:
- AF-2 (Planning): Decomposes batch size for large term usage (content using popular tags)
- AF-9 (Judge): Batch completeness — all content updated, not only first page

**BFA VALIDATION**: CF-526 (taxonomy entity conflicts with FLOW-02 category management)

**MACHINE/FREEDOM**:
- MACHINE: "merge" action: all content from source term reassigned to target term, source deleted.
- FREEDOM: Batch size per propagation job, delay before cascade.

**IRON RULES**:
1. Term delete MUST propagate to all associated content before deleting the term document
2. Batch propagation MUST be resumable (store cursor between batches)

**QUALITY GATES (AF-9)**:
- [ ] All content with term updated (not just first page)
- [ ] Cursor-based batching verified
- [ ] Cache invalidation covers all archive URLs for term

---

## T404 — AI Content Enhancement Gate

**ARCHETYPE**: AI_GENERATION
**ENTRY**: ContentEnhancementRequest {contentId, requestedEnhancements[], tenantId} — triggered post-save or on-demand
**PURPOSE**: Run selected AI enhancements (SEO analysis, tag suggestions, content summary, image alt text) via AiDispatcher (multi-model). Results stored back to content document as enhancement metadata. Non-blocking — failures degrade gracefully.
**DISTINCT FROM**: T391 (publish flow — T404 can run pre-publish). T404 is AI analysis, not orchestration.

**FACTORY DEPENDENCIES**: F1075, F1104, F1105, F1106, F1107, F1108 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — fetch content + store enhancement results
- F1104 → AI ENGINE FABRIC + RAG FABRIC — SEO analysis (multi-model via AiDispatcher)
- F1105 → AI ENGINE FABRIC → IAiProvider — tag suggestions
- F1106 → AI ENGINE FABRIC → IAiProvider — content summary
- F1107 → AI ENGINE FABRIC → IAiProvider — image alt text (vision model)
- F1108 → RAG FABRIC (Hybrid) — related post ranking

**AF CONFIGURATION**:
- AF-3 (Prompt Library): Retrieves domain-specific CMS SEO prompts
- AF-4 (RAG): Searches SK-257 (AI SEO Analyzer) + existing content for context
- AF-5 (Multi-model): Claude + Gemini parallel for SEO; Claude-haiku alone for tags/alts
- AF-10 (Merge): Aggregates multi-model SEO outputs into single recommendation set
- AF-11 (Feedback): Stores author acceptance rate of AI suggestions for model improvement

**BFA VALIDATION**: CF-527 (AI content analysis conflicts with FLOW-13 AI content pipeline)

**MACHINE/FREEDOM**:
- MACHINE: Enhancement results stored in content.aiEnhancements{} field. Never overwrites author-written fields.
- FREEDOM: Which enhancements enabled, model tier per enhancement type, auto-apply vs suggest-only.

**IRON RULES**:
1. AI enhancements MUST NOT overwrite author-written fields — stored in separate aiEnhancements sub-document
2. Each enhancement is independent — one failure does not cancel others
3. Author acceptance/rejection feeds AF-11 feedback loop

**QUALITY GATES (AF-9)**:
- [ ] AI results stored in aiEnhancements{} — original fields untouched
- [ ] Each enhancement independently retryable
- [ ] AF-11 feedback record created for each author decision

---

## T405 — Sitemap Rebuild Trigger

**ARCHETYPE**: EVENT_PROCESSING
**ENTRY**: SitemapRebuildRequest event (from T391, T393, T403) OR scheduled cron trigger
**PURPOSE**: Rebuild XML sitemap for tenant. Query all Published content with canonical URLs. Generate sitemap XML. Store to blob/S3. Notify CDN to purge old sitemap. Respect sitemap size limits (50k URLs / 50MB).
**DISTINCT FROM**: T398 (page cache invalidation). T405 handles only the sitemap artifact.

**FACTORY DEPENDENCIES**: F1075, F1098, F1113 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1075 → DATABASE FABRIC (Elasticsearch) — query all Published content (cursor-based, for scale)
- F1098 → QUEUE FABRIC (Redis Streams) — sitemap job queue (debounced: max 1 rebuild per 5 min)
- F1113 → DATABASE FABRIC (Redis) — resolve canonical URLs for each content item

**AF CONFIGURATION**:
- AF-6 (Code Review): Debounce logic verified, sitemap size limit enforced
- AF-9 (Judge): Generated sitemap validates against sitemap.org schema

**BFA VALIDATION**: CF-528 (sitemap generation conflicts with FLOW-19 CI/CD deployment events)

**MACHINE/FREEDOM**:
- MACHINE: Max 50k URLs per sitemap file. Sitemap index used if > 50k URLs.
- FREEDOM: Include/exclude content types, priority/changefreq per content type, CDN upload path.

**IRON RULES**:
1. Debounce: max one rebuild per 5 minutes per tenant (queue deduplication)
2. Sitemap MUST validate against sitemap.org XML schema before upload
3. Old sitemap NOT deleted until new one successfully uploaded

**QUALITY GATES (AF-9)**:
- [ ] Debounce verified (rapid publishes produce single rebuild job)
- [ ] Sitemap passes XML schema validation
- [ ] Old sitemap preserved until new upload confirmed

---

## T406 — Multi-Tenant Content Scope Enforcer

**ARCHETYPE**: ORCHESTRATION
**ENTRY**: Any FLOW-26 service call — applied as middleware gate before all fabric calls
**PURPOSE**: Cross-cutting tenant isolation enforcer for FLOW-26. Verifies tenantId present and valid. Enforces scope on DB queries. Applies per-tenant quota checks (storage, media, publish rate). Prevents cross-tenant data access.
**DISTINCT FROM**: T389–T405 (business flows). T406 is the governance wrapper applied to all of them.

**FACTORY DEPENDENCIES**: F1114, F1117, F1118, F1121 — resolved via CreateAsync()
**FABRIC RESOLUTION**:
- F1114 → CORE FABRIC (MicroserviceBase auth) — extract + validate tenantId from context
- F1117 → DATABASE FABRIC (PostgreSQL) — verify resource ownership (content belongs to tenant)
- F1118 → DATABASE FABRIC (Elasticsearch) — load per-tenant quotas from FREEDOM config
- F1121 → DATABASE FABRIC (Redis) — check maintenance mode flag (fast path)

**AF CONFIGURATION**:
- AF-7 (Compliance): Verifies DNA-5 applied to every factory in FLOW-26
- AF-8 (Security): BOLA prevention — contentId always validated against tenantId
- AF-9 (Judge): Scope enforcement completeness — zero cross-tenant queries possible

**BFA VALIDATION**: CF-529 (multi-tenant scope conflicts with FLOW-25 BFA tenant isolation rules)

**MACHINE/FREEDOM**:
- MACHINE: tenantId in every query is non-negotiable. Quota enforcement is synchronous (checked before action).
- FREEDOM: Per-tenant quotas (max posts, max media storage, max API calls), maintenance mode messages.

**IRON RULES**:
1. ANY service call without valid tenantId → immediate 401 — no fallback, no default tenant
2. Resource ownership MUST be verified for all mutations (contentId → tenantId match)
3. Quota exceeded → 429 with Retry-After header, not silent failure

**QUALITY GATES (AF-9)**:
- [ ] Zero queries without tenantId filter (scanned by AF-7)
- [ ] BOLA check on all ID-based endpoints
- [ ] Quota enforcement tested at boundary conditions (exactly at limit, 1 over limit)

---

## TASK TYPE SUMMARY TABLE

| ID | Name | Archetype | Factories | Primary Fabric |
|----|------|-----------|-----------|---------------|
| T389 | Content Lifecycle Orchestrator | ORCHESTRATION | F1075,F1076,F1079,F1114 | DB+QUEUE |
| T390 | Draft Autosave Loop | EVENT_PROCESSING | F1075,F1076,F1080 | DB (Redis) |
| T391 | Content Publish Gate | ORCHESTRATION | F1075,F1079,F1090,F1110,F1111,F1114 | DB+QUEUE+CORE |
| T392 | Scheduled Publish Timer Gate | ORCH+EVENT | F1075,F1079,F1109,F1111,F1114 | QUEUE (timer) |
| T393 | Content Archive & Unpublish Flow | ORCHESTRATION | F1075,F1079,F1095,F1097,F1111,F1114 | DB+QUEUE |
| T394 | Media Upload & Transform Pipeline | ORCHESTRATION | F1081,F1082,F1083,F1084,F1114 | DB+QUEUE (async) |
| T395 | Media Variant Request Gate | EVENT_PROCESSING | F1082,F1083,F1084,F1087 | QUEUE+DB |
| T396 | Public Page Request Pipeline | HYBRID_SYNC_ASYNC | F1075,F1077,F1083,F1085,F1086,F1087,F1088,F1099 | DB+CORE+RAG |
| T397 | Search Index Cascade | EVENT_PROCESSING | F1077,F1083,F1095,F1096,F1116 | DB (Elasticsearch) |
| T398 | Cache Invalidation Cascade | EVENT_PROCESSING | F1077,F1087,F1097,F1113 | DB (Redis) |
| T399 | Hook Fan-Out Executor | ORCHESTRATION | F1090,F1092,F1094 | QUEUE (fan-out) |
| T400 | Webhook Dispatch Gate | EVENT_PROCESSING | F1093,F1090 | QUEUE+DB |
| T401 | Comment Submission & Spam Gate | ORCHESTRATION | F1100,F1101,F1102,F1103,F1114 | DB+AI ENGINE+QUEUE |
| T402 | Comment Moderation Queue Gate | ORCH (human-in-loop) | F1100,F1102,F1103,F1115 | QUEUE (human) |
| T403 | Taxonomy Term Propagation | EVENT_PROCESSING | F1075,F1077,F1095,F1097,F1098 | DB+QUEUE |
| T404 | AI Content Enhancement Gate | AI_GENERATION | F1075,F1104,F1105,F1106,F1107,F1108 | AI ENGINE+RAG |
| T405 | Sitemap Rebuild Trigger | EVENT_PROCESSING | F1075,F1098,F1113 | QUEUE+DB |
| T406 | Multi-Tenant Content Scope Enforcer | ORCHESTRATION | F1114,F1117,F1118,F1121 | CORE+DB |

---

## TEMPLATE REFERENCES (Flow-26)

| Template | Flow | Entry | Description |
|----------|------|-------|-------------|
| Template 83 | Content Lifecycle | T389→T391 or T392 or T393 | Standard publish/archive flow |
| Template 84 | Media Pipeline | T394→T395 | Upload + on-demand variant |
| Template 85 | Public Page | T396 | Cache-first page rendering |
| Template 86 | Publish Cascade | T391→T397→T398→T405 | Post-publish cascade |
| Template 87 | Comment Flow | T401→T402 | Submission + moderation |
| Template 88 | AI Enhancement | T404 (standalone) | On-demand AI enrichment |

---

## STATE SAVE CHECKPOINT

```
FILE: 28-blog-modules_TASK_TYPES_CATALOG.md
STATUS: COMPLETE ✅
TASK TYPES ADDED: T389-T406 (18 contracts)
TEMPLATES ADDED: 83-88 (6 templates)
NEXT FILE: 28-blog-modules_SKILLS_FACTORY_RAG.md
NEXT NUMBERS:
  Skill:      SK-251
  BFA Rule:   CF-510
  Stress Test: ST-300
```
