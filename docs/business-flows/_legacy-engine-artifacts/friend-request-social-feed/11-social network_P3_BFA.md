# FLOW-08 — Post + Media Publish Pipeline
# Phase 3: BFA Conflict Rules CF-64–CF-69 + Stress Tests ST-31–ST-34
# Date: 2026-02-26 | Save Point: MERGE:P3_FLOW08

---

# FLOW-08 BFA CONFLICT RULES

**Flow**: FLOW-08
**Conflict Rules**: CF-64 through CF-69 (6 rules)
**Stress Tests**: ST-31 through ST-34 (4 tests)
**Primary conflicts checked**: FLOW-08 vs FLOW-04 (post content), FLOW-05 (feed distribution), FLOW-07 (feed injection), FLOW-06 (notification events), FLOW-13 (safety signals)

---

## BFA CONFLICT RULES

### CF-64 — Media Upload State (F244) ≠ Post Content State (F247)

**CONFLICT:** Both F244 (IMediaUploadService) and F247 (IPostPublicationService) write to Elasticsearch indices within the same tenant scope. Risk of upload metadata (`media-assets-{tenantId}`) and post content (`posts_{tenantId}`) using overlapping document IDs, or one service's search query accidentally spanning both indices. Secondary risk: MediaUploadCompleted event and PostPublished event are both on Redis Streams — consumer groups could be mis-configured to consume the wrong stream.

| Dimension | Media Upload (F244) | Post Publication (F247) |
|-----------|---------------------|-------------------------|
| ES index | `media-assets-{tenantId}` | `post-drafts-{tenantId}` (drafts) / PG `posts_{tenantId}` (published) |
| Redis key prefix | `upload:session:{tenantId}:{uploadId}` | `cache:post:{tenantId}:{postId}` |
| Queue stream | `media.upload.events` | `post.lifecycle.events` |
| Event names | MediaUploadCompleted, MediaUploadFailed | PostPublished, PostDeleted |
| Primary key type | uploadId (UUID) | postId (UUID) / draftId (UUID) |
| Lifecycle owner | F244 owns upload session | F247 owns post/draft state |

**PROOF OF ISOLATION:**
1. Different ES indices: `media-assets-{tenantId}` vs `post-drafts-{tenantId}` — no shared index; BuildSearchFilter (DNA-2) scopes queries to the declared index
2. Different Redis key patterns: `upload:session:*` vs `cache:post:*` — structurally different prefix, cannot collide
3. Different queue streams: `media.upload.events` vs `post.lifecycle.events` — separate consumer groups, no cross-consumption
4. Event names are disjoint — no event exists in both streams
5. Primary key types: uploadId references asset lifecycle; postId references post content — different ID domains

**RUNTIME ENFORCEMENT:**
- F244 MUST only write to `media-assets-{tenantId}` — any write to `post-drafts-*` or `posts_*` = BUILD FAILURE
- F247 MUST only write to `post-drafts-{tenantId}` / PG `posts_{tenantId}` — any write to `media-assets-*` = BUILD FAILURE
- Consumer groups: `media-main` (F244 stream), `post-main` (F247 stream) — mis-configuration detected by AF-7 Compliance

**RESULT: ✅ ISOLATED — index + key + stream namespace separation enforced**

---

### CF-65 — Safety Flag (F249) Must Gate Feed Eligibility (F250) — Ordering Invariant

**CONFLICT:** F249 (IAiMediaTaggingService) emits MediaSafetyFlagged on the `media.tagging.events` stream. F250 (IFeedEligibilityService) emits FeedEligibilityGranted on the `feed.eligibility.events` stream. These are separate async streams with no inherent ordering guarantee. Risk: F250 could grant eligibility BEFORE F249 completes safety classification, allowing unsafe content into the feed index before the safety flag arrives.

| Dimension | Safety Tagging (F249) | Feed Eligibility (F250) |
|-----------|----------------------|-------------------------|
| Trigger | TranscodeCompleted (async parallel) | PostPublished (after T85 convergence) |
| Output event | MediaTagged / MediaSafetyFlagged | FeedEligibilityGranted / FeedEligibilityRevoked |
| Queue stream | `media.tagging.events` | `feed.eligibility.events` |
| Redis key | `cache:tags:{tenantId}:{assetId}` | `feed:eligible:{tenantId}:{postId}` |
| Ordering requirement | MUST complete before eligibility | MUST NOT grant until safety=CLEAR |

**PROOF OF ISOLATION (Ordering Enforced):**
1. T85 (Post Publication Gate) pre-checks safety flag status before calling F250.GrantEligibilityAsync — F249's ClassifyContentSafety result stored in Redis `cache:tags:{tenantId}:{assetId}` read at T85 convergence time
2. F250.GrantEligibilityAsync checks safety status as MACHINE rule — if `cache:tags:{tenantId}:{assetId}` is absent or safety=FLAGGED, GrantEligibilityAsync returns DataProcessResult(IsSuccess=false)
3. The parallel async track (T84 step-2) ensures F249 completes before T85 can complete convergence: T84 emits MediaTagged/MediaSafetyFlagged → only THEN is it safe for T85's convergence to proceed
4. MediaSafetyFlagged triggers F250.RevokeEligibilityAsync even if F250 had already granted eligibility (race condition defense)

**RUNTIME ENFORCEMENT:**
- F250.GrantEligibilityAsync MUST check Redis safety status key — absent key = treat as PENDING, return DataProcessResult(IsSuccess=false)
- AF-7 Compliance MUST verify that F250.GrantEligibilityAsync includes the safety key check — absence = BUILD FAILURE
- MediaSafetyFlagged consumer in F250 MUST invoke RevokeEligibilityAsync atomically — flag with no revoke = BUILD FAILURE (CF-65 violation)

**RESULT: ✅ ORDERING ENFORCED — safety-before-eligibility invariant enforced by MACHINE rule + Redis gate + event consumer**

---

### CF-66 — Media Events (F244/F245/F249) ≠ Engagement Events (FLOW-10 F262/F265)

**CONFLICT:** FLOW-08 introduces three new event-producing services on Redis Streams (F244, F245, F249). FLOW-10 (Engagement, planned) will introduce F262 (IReactionService) and F265 (IEngagementNotifyService) on separate streams. Risk: `media.upload.events` and future `engagement.events` consumer groups collide if they share a stream name, or if a notification service subscribes to both expecting different payloads.

| Dimension | Media Events (FLOW-08) | Engagement Events (FLOW-10) |
|-----------|------------------------|------------------------------|
| Stream names | `media.upload.events`, `media.tagging.events`, `transcode.jobs`, `transcode.results` | `engagement.reactions`, `engagement.comments` (planned) |
| Payload schema | assetId, uploadId, mimeType, fileSize | postId, reactorId, reactionType, commentId |
| Consumer groups | `media-main`, `tagging-main`, `transcode-workers` | `engagement-main`, `notify-main` (planned) |
| Downstream consumers | F245 (transcode), F246 (gate), F249 (tagging), F250 (eligibility) | F265 (notifications), analytics |

**PROOF OF ISOLATION:**
1. All stream names are prefixed with domain: `media.*` vs `engagement.*` — no shared stream name
2. Consumer group names are domain-scoped: `media-main` vs future `engagement-main` — registered separately in Redis Streams
3. Event payload schemas are structurally incompatible — a consumer expecting `assetId` will not find it in a reaction event
4. Downstream consumers are different services in different factory families — no accidental cross-subscription

**RUNTIME ENFORCEMENT:**
- All new FLOW-08 consumer group names MUST use `media-` prefix — any `engagement-` or generic name = BUILD FAILURE
- AF-7 Compliance verifies consumer group registration matches declared stream in factory contract

**RESULT: ✅ ISOLATED — stream namespace + consumer group naming convention enforced**

---

### CF-67 — Feed Eligibility (F250) ≠ Lesson Feed Distribution (F173, FLOW-05) ≠ Feed Injection (F242, FLOW-07)

**CONFLICT:** FLOW-08 introduces `feed-eligible-{tenantId}` ES index (F250) and `feed:eligible:{tenantId}:{postId}` Redis keys. FLOW-05 uses `lesson-feed:{tenantId}:{userId}` Redis (F173). FLOW-07 uses `feed:{tenantId}:{userId}` Redis ZSET for injection (F242). Three separate feed-related patterns operating in the same tenant scope with similar key structures.

| Dimension | Feed Eligibility (F250) | Lesson Feed (F173, FLOW-05) | Feed Injection (F242, FLOW-07) |
|-----------|-------------------------|------------------------------|-------------------------------|
| ES index | `feed-eligible-{tenantId}` | N/A | N/A |
| Redis key pattern | `feed:eligible:{tenantId}:{postId}` | `lesson-feed:{tenantId}:{userId}` | `feed:{tenantId}:{userId}` ZSET |
| Content type | Social post candidacy flag | Lesson content cards | Social post injection entries |
| Write direction | Post-centric (postId as key) | User-centric (userId as key) | User-centric (userId as key) |
| Queue stream | `feed.eligibility.events` | `lesson.feed.distribution` | `feed.injection.events` |

**PROOF OF ISOLATION:**
1. F250 key is POST-CENTRIC: `feed:eligible:{tenantId}:{postId}` — different structural shape from user-centric keys
2. F173 key: `lesson-feed:{tenantId}:{userId}` — `lesson-feed:` prefix separates from `feed:eligible:` and `feed:` completely
3. F242 key: `feed:{tenantId}:{userId}` ZSET — closest to F250 but different suffix structure: F250 uses `{postId}`, F242 uses `{userId}`. Different Redis data type: F250 is STRING (flag); F242 is ZSET (sorted feed)
4. All three use different queue streams with domain-specific prefixes
5. F250 ES index `feed-eligible-{tenantId}` vs F242 having no ES index (Redis-only) — no ES namespace collision

**RUNTIME ENFORCEMENT:**
- F250 MUST use `feed:eligible:{tenantId}:{postId}` pattern — any `feed:{tenantId}:{userId}` or `lesson-feed:*` write = BUILD FAILURE
- AF-7 Compliance validates Redis key pattern matches factory fabric resolution table declaration

**RESULT: ✅ ISOLATED — post-centric vs user-centric key structure + stream prefix separation**

---

### CF-68 — Notification Dispatch (F251) ≠ Engagement Notifications (FLOW-10 F265) ≠ Cooperator Notifications (F233, FLOW-06)

**CONFLICT:** F251 (INotificationDispatchService, FLOW-08) dispatches PostPublished fan-out notifications. FLOW-10 will introduce F265 (IEngagementNotifyService) for reaction/comment notifications. FLOW-06 has F233 (ICooperatorNotificationService) for marketplace cooperation. All three use `notifications.dispatch` or similar stream names. Risk: consumer groups for different notification types could overlap and cause wrong-template notification delivery.

| Dimension | Post Publish Notif (F251) | Engagement Notif (F265, FLOW-10) | Cooperator Notif (F233, FLOW-06) |
|-----------|--------------------------|----------------------------------|----------------------------------|
| Queue stream | `notifications.dispatch` | `engagement.notifications` (planned) | `cooperator.notifications` (FLOW-06) |
| Consumer group | `notif-main` | `engagement-notif-main` (planned) | `cooperator-notif-main` |
| Rate limit key | `notif:rate:{tenantId}:{userId}` | `eng-notif:rate:{tenantId}:{userId}` (planned) | `coop-notif:rate:{tenantId}:{userId}` |
| Trigger | PostPublished | ReactionAdded / CommentAdded | CooperatorsIdentified |
| Audience | Post audience (followers) | Post author + mentioned | Cooperator pairs |

**PROOF OF ISOLATION:**
1. F251 uses `notifications.dispatch` stream — FLOW-10's F265 will use `engagement.notifications` — different stream names required by CF-68
2. F233 uses `cooperator.notifications` — already isolated by FLOW-06 design
3. Rate limit Redis keys are domain-prefixed: `notif:rate:`, `coop-notif:rate:` — no collision; FLOW-10 must use `eng-notif:rate:`
4. Consumer group names are scoped to domain: `notif-main` vs `cooperator-notif-main`
5. Event payload schemas differ: PostPublished carries postId+audienceRule; ReactionAdded carries postId+reactorId+reactionType — structurally incompatible

**RUNTIME ENFORCEMENT:**
- F251 stream name `notifications.dispatch` is RESERVED for PostPublished fan-out — any other domain writing to this stream = BUILD FAILURE
- FLOW-10 (F265) MUST register on `engagement.notifications`, NOT `notifications.dispatch` — BFA pre-flight check enforces this
- CF-68 BFA check runs at FLOW-10 registration time to enforce stream name separation

**RESULT: ✅ ISOLATED — stream name reservation + consumer group domain separation**

---

### CF-69 — Search Index Events (PostIndexed, T86) ≠ Feed Eligibility Events (F250) ≠ FLOW-04 Content Index

**CONFLICT:** T86 emits a PostIndexed event intended for the FLOW-12 search indexer. F250 emits FeedEligibilityGranted for the FLOW-09 feed candidate pool. FLOW-04 (lesson content, existing) also maintains an ES content index `lesson-content-{tenantId}`. Risk: PostIndexed consumers and FeedEligibilityGranted consumers could be confused, or PostIndexed could cause social posts to appear in FLOW-04's lesson content search results.

| Dimension | PostIndexed (T86/FLOW-08) | FeedEligibilityGranted (F250) | FLOW-04 Content Index |
|-----------|--------------------------|-------------------------------|----------------------|
| Event name | PostIndexed | FeedEligibilityGranted | ContentIndexed (existing) |
| Target consumer | FLOW-12 search indexer | FLOW-09 candidate generator | FLOW-04 lesson pipeline |
| ES index target | `social-search-{tenantId}` (FLOW-12) | `feed-eligible-{tenantId}` (F250) | `lesson-content-{tenantId}` (FLOW-04) |
| Content category | Social post (UGC) | Social post candidacy | Lesson / educational content |
| Queue stream | `search.index.events` | `feed.eligibility.events` | `content.index.events` (existing) |

**PROOF OF ISOLATION:**
1. Three distinct queue streams with domain prefixes: `search.*`, `feed.*`, `content.*` — no overlap
2. Three distinct ES indices: `social-search-`, `feed-eligible-`, `lesson-content-` — different prefix prevents cross-index search
3. Consumer of PostIndexed (FLOW-12 search service) only reads from `search.index.events`
4. Consumer of FeedEligibilityGranted (FLOW-09 candidate generator) only reads from `feed.eligibility.events`
5. Social posts with category=UGC are structurally incompatible with lesson content schema

**RUNTIME ENFORCEMENT:**
- T86 MUST emit PostIndexed to `search.index.events` — writing to `feed.eligibility.events` or `content.index.events` = BUILD FAILURE
- FLOW-12 search indexer MUST consume ONLY `search.index.events` — cross-stream consumption = BUILD FAILURE
- ES index query scope enforced by BuildSearchFilter (DNA-2): `social-search-*` queries MUST specify index explicitly

**RESULT: ✅ ISOLATED — event name + stream + ES index triple-separation enforced**

---

# STRESS TESTS

### ST-31 — Upload Confirm Race + Gate Timeout (EP-2 Fires During ETag Validation)

**SCENARIO:**
User uploads a 500MB video. Upload takes 12 minutes. The signed URL was configured with a 15-minute expiry. At T+13:55 minutes, the client sends ConfirmUploadCompleted with a valid ETag. F244 begins ETag validation (takes ~2s). At T+14:00 minutes exactly, EP-2 fires the gate timeout in F246. Two concurrent operations: F244.ConfirmUploadCompleted (in progress) vs F246.CloseGateOnTimeoutAsync (just fired).

**Attack Vector:**
- Race condition: confirmation and timeout fire within 2 seconds of each other
- If timeout wins: gate transitions to TIMED_OUT, MediaGateTimedOut emitted — but F244 confirmation is still in progress
- If confirmation wins: gate transitions to RESOLVED — but EP-2 already fired and emitted timeout event
- Duplicate event scenario: both MediaUploadCompleted AND MediaGateTimedOut emitted for same uploadId
- T85 convergence receives both signals: which one drives the publish decision?

**Defense Layers:**
- Layer 1: IR-83-7 — F246.OpenGateAsync uses an atomic Redis operation to register gate. Gate state key `gate:media:{tenantId}:{uploadId}` uses Redis SET NX with TTL. CloseGateOnTimeoutAsync uses Redis SETNX on status field — if already RESOLVED (from F244 confirmation), SETNX fails silently.
- Layer 2: F246 gate state machine transitions are atomic via Redis Lua script: `IF gate.status == OPEN THEN SET gate.status = RESOLVED; RETURN 1; ELSE RETURN 0; END`. Only one transition wins; the other gets return code 0 and takes no action.
- Layer 3: F246.CloseGateOnTimeoutAsync checks status before emitting MediaGateTimedOut — if status is already RESOLVED, no event emitted.
- Layer 4: EP-2 timer registration uses the same gate correlationKey. Once F246.SignalMediaReadyAsync sets status=RESOLVED and cancels the EP-2 checkpoint, a subsequent EP-2 fire sees a cancelled checkpoint and no-ops.
- Layer 5: T85 convergence tracks by correlationKey=draftId. If both MediaReady and MediaGateTimedOut arrive for the same draftId (race window), the first one to transition draftId's convergence state wins (Redis CAS). FREEDOM config `publishWithoutMediaOnTimeout=false` means timeout wins only if no MediaReady has been received.

**BFA CHECKS:** CF-64 (upload events separate from post events), CF-65 (safety check ordering not affected by race)
**CROSS-FLOW:** None — FLOW-08 internal race condition

**RESULT: ✅ PASS — Redis atomic gate state + EP-2 checkpoint cancellation + convergence CAS prevent double-event processing**

---

### ST-32 — AI Safety Flag Arrives After Feed Eligibility Granted (Async Race Window)

**SCENARIO:**
Post is published (T85 convergence completes). F250.GrantEligibilityAsync runs and at that exact moment F249's ClassifyContentSafetyAsync is still in progress (AI model call taking 4s, post had no media — image was text-only, safety check was still running). F250 checks Redis safety key `cache:tags:{tenantId}:{assetId}` — key is ABSENT (F249 hasn't written it yet). The safety check lookup finds ABSENT → treats as PENDING → blocks eligibility. But then F249 completes with safety=CLEAR and writes to Redis. Now F250 is stuck: eligibility was blocked, safety is now clear, but no event triggers F250 to retry.

**Attack Vector:**
- Window where safety key is absent and eligibility is blocked — valid posts never become eligible
- Alternatively: safety key absent is treated as CLEAR (wrong default) → unsafe content becomes eligible before flag arrives

**Defense Layers:**
- Layer 1: IR-84-6 — MediaTagged / MediaSafetyFlagged MUST be emitted BEFORE FeedEligibilityGranted is even attempted. T84 emits MediaTagged to `media.tagging.events` stream. F250 subscribes to `media.tagging.events` consumer group `tagging-eligibility-bridge` — on MediaTagged: calls GrantEligibilityAsync. This means eligibility is DRIVEN BY the tagging event, not by T85 convergence directly.
- Layer 2: The ordering contract: T84 sets `cache:tags:{tenantId}:{assetId}` (Redis) BEFORE emitting MediaTagged. F250 reads this key when handling MediaTagged. The key is guaranteed present when the consumer processes MediaTagged.
- Layer 3: ABSENT key DEFAULT is PENDING (blocked), not CLEAR — IR-83-5 equivalent for eligibility. This means worst case is a false-negative (eligible post blocked briefly), not a false-positive (unsafe post visible). QG-85-5 validates this behavior.
- Layer 4: For text-only posts (no media), F249 does not run. F247.PublishPostAsync sets a `safety:cleared:{tenantId}:{postId}` flag in Redis for text-only posts. F250.GrantEligibilityAsync checks this flag. Text-only posts bypass the F249 pipeline.
- Layer 5: If somehow eligibility was already granted and MediaSafetyFlagged arrives later, F250 subscribes to MediaSafetyFlagged and calls RevokeEligibilityAsync — revocation is immediate and atomic (CF-65).

**BFA CHECKS:** CF-65 (safety ordering enforced), CF-64 (tagging events separate from post events)
**CROSS-FLOW:** FLOW-13 receives MediaSafetyFlagged via `media.tagging.events` and starts moderation pipeline independently

**RESULT: ✅ PASS — event-driven eligibility grant (driven by MediaTagged, not T85) + absent=PENDING default + text-only bypass flag**

---

### ST-33 — Transcode Worker Pod Restart Mid-Job (Checkpoint Recovery with In-Flight F249 AI Call)

**SCENARIO:**
Transcode worker picks up a `transcode.jobs` message, starts processing a 1GB video. At T+4min, the worker pod is killed (node drain in Kubernetes). At this point: F245 has submitted 2 of 3 format jobs (mp4-720p complete, mp4-1080p in-progress, webm not started). F249 AI tagging call to IAiProvider is in-flight (4s average, was at 2s when pod died). The queue message has NOT been acknowledged (per IR-84-1, ACK happens after TranscodeCompleted). The gate (F246) is still OPEN with EP-2 timer running.

**Attack Vector:**
- New worker pod picks up the same message (redelivered by Redis Streams because no ACK)
- Double-processing: mp4-720p format job re-submitted even though it completed
- F249 AI call orphaned — the AI provider may have already charged tokens and cached a result
- EP-2 gate timer has been running — is there enough time left for the redelivered job?
- If F249 is re-called and returns a different safety score, do we use the first or second result?

**Defense Layers:**
- Layer 1: IR-84-1 + F245 idempotency — job submission is idempotent: `SubmitTranscodeJobAsync` checks if a jobId for the same `assetId+spec` already exists in ES `transcode-jobs-{tenantId}`. mp4-720p is found as COMPLETED → skip, not re-submitted.
- Layer 2: F245 job state in ES is the source of truth: which formats are in which state. New worker pod calls `GetJobStatusAsync` first → sees mp4-720p=COMPLETED, mp4-1080p=Processing (with heartbeat timeout) → marks mp4-1080p as RETRY → continues from checkpoint.
- Layer 3: F249 idempotency — AI tagging result is cached in Redis `cache:tags:{tenantId}:{assetId}`. If the AI call completed before the pod died (result cached), new pod reads from cache, no re-call. If not cached (call was in-flight), new pod re-calls IAiProvider. Re-call result is stored over the (non-existent) cache key — idempotent because there's nothing to overwrite.
- Layer 4: EP-2 timer — the gate timeout is relative to the ORIGINAL gate open time (stored in ES checkpoint), not the pod restart time. New worker correctly reads remaining gate time. If time remaining < `freedom_media_{tenantId}.minimumTimeRequired`, worker emits MediaGateTimedOut proactively rather than attempting to beat the clock.
- Layer 5: Redis Streams XACK-based ACK ensures exactly-once delivery semantics at the consumer group level. Even if the message is redelivered 3 times, only the first successful TranscodeCompleted emission + ACK combination commits.

**BFA CHECKS:** CF-64 (transcode stream isolation), CF-65 (safety ordering preserved on retry)
**CROSS-FLOW:** FLOW-13 may receive duplicate MediaSafetyFlagged — CF-65 RevokeEligibilityAsync is idempotent

**RESULT: ✅ PASS — ES job state checkpoint + F245 idempotent submission + F249 Redis cache + EP-2 absolute timer + XACK delivery**

---

### ST-34 — Cross-Tenant PostPublished Fan-out (Tenant B Recipient in Tenant A Notification Batch)

**SCENARIO:**
Tenant A publishes a post. T86 resolves audience: 10,000 followers. F251.DispatchPostPublishedAsync batches them into 10 batches of 1,000. During batch assembly, a bug in audience resolution (hypothetical: userId from tenantB appears in tenantA follower graph due to data migration artifact) results in userId=`user-tenant-b-456` appearing in batch 3 of tenantA's notification dispatch. F251 enqueues the batch. The notification consumer processes it and delivers a notification to a tenantB user about a tenantA post.

**Attack Vector:**
- Cross-tenant data leakage via notification delivery (tenantB user receiving tenantA content notification)
- Privacy violation: tenantB user learns that tenantA's content exists
- Potential content exposure if the notification consumer constructs a deep link to tenantA's post

**Defense Layers:**
- Layer 1: F251.DispatchPostPublishedAsync validates each recipient's tenantId against the dispatch tenantId — any recipient with non-matching tenantId is filtered out (IR-86-7 equivalent). The `tenantId` field is mandatory on every recipient dictionary entry (DNA-5).
- Layer 2: T86 audience resolution queries use BuildSearchFilter (DNA-2) with explicit tenantId filter — the follower graph query MUST include `tenantId=scope.TenantId` in every lookup. A cross-tenant userId in the graph can only arrive if the graph index was contaminated; this is caught by the F251 recipient validation as second line of defense.
- Layer 3: The notification consumer (downstream, separate service) re-validates tenantId before delivery. It resolves the recipient's profile via their own tenant context — if user-tenant-b-456 is resolved against tenantA's user store, it returns DataProcessResult(IsSuccess=false, NotFound). The notification is dropped without delivery.
- Layer 4: F251 audit log (`notification-log-{tenantId}`) records all dispatched recipients. Cross-tenant dispatch attempts (if somehow they pass validation) are logged with severity=CRITICAL. Monitoring alert fires on any `tenantId_mismatch` log entry.
- Layer 5: Rate limit key `notif:rate:{tenantId}:{userId}` uses the SENDING tenant's tenantId. A cross-tenant userId would have a rate limit key in the wrong namespace — this would be flagged by the rate limit key format validator.

**BFA CHECKS:** CF-68 (notification dispatch isolation), CF-64 (post events tenant-scoped)
**CROSS-FLOW:** FLOW-09 (candidate generation) — F252 must also have tenantId filter on graph queries (CF-71 will cover when FLOW-09 merges)

**RESULT: ✅ PASS — recipient tenantId validation in F251 + audience query tenantId filter + downstream re-validation + audit log alert**

---

## COMPLETE BFA CONFLICT RULES SUMMARY (CF-64 to CF-69)

| Rule | Description | Services Involved | Isolation Mechanism | Status |
|------|-------------|-------------------|---------------------|--------|
| CF-64 | Media upload state ≠ Post content state | F244 vs F247 | Separate ES indices + Redis key prefixes + queue streams | ✅ ISOLATED |
| CF-65 | Safety flag (F249) must gate feed eligibility (F250) | F249 vs F250 | Redis atomic gate + event-driven eligibility + MediaSafetyFlagged revocation | ✅ ORDERING ENFORCED |
| CF-66 | Media events ≠ engagement events | F244/F245/F249 vs FLOW-10 F262/F265 | `media.*` stream prefix reservation + consumer group naming | ✅ ISOLATED |
| CF-67 | Feed eligibility (F250) ≠ lesson feed (F173) ≠ feed injection (F242) | F250 vs F173 vs F242 | Post-centric vs user-centric key structure + stream prefix separation | ✅ ISOLATED |
| CF-68 | PostPublished notifications (F251) ≠ engagement notifications ≠ cooperator notifications (F233) | F251 vs F265 vs F233 | Stream name reservation + consumer group domain separation | ✅ ISOLATED |
| CF-69 | PostIndexed (T86) ≠ FeedEligibilityGranted (F250) ≠ FLOW-04 content index | T86 vs F250 vs FLOW-04 | Three distinct streams + three distinct ES indices + event name uniqueness | ✅ ISOLATED |

---

## BFA REGISTRATION — FLOW-08

### Entity Registry

| Entity | Owner | ES Index / PG Table | Cross-Flow Risk |
|--------|-------|---------------------|-----------------|
| Draft | F247 | `post-drafts-{tenantId}` (ES) | None — new entity |
| Post | F247 | `posts_{tenantId}` (PG) | Conflicts with FLOW-04 ISocialPostService (F208) — different content category; CF-64 isolates |
| MediaAsset | F244 | `media-assets-{tenantId}` (ES) | None — new entity |
| TranscodeJob | F245 | `transcode-jobs-{tenantId}` (ES) | None — new entity |
| FeedEligibility | F250 | `feed-eligible-{tenantId}` (ES) | Adjacent to F242 feed injection (FLOW-07) — CF-67 isolates |

### Event Registry

| Event | Producer | Stream | Downstream Consumers |
|-------|----------|--------|---------------------|
| MediaUploadInitiated | F244 | `media.upload.events` | F245 (transcode submission) |
| MediaUploadCompleted | F244 | `media.upload.events` | F245 (transcode job), F246 (gate open) |
| MediaUploadFailed | F244 | `media.upload.events` | F246 (gate failure signal) |
| TranscodeCompleted | F245 | `transcode.results` | F246 (SignalMediaReadyAsync), F248 (CDN confirm) |
| TranscodeFailed | F245 | `transcode.results` | F246 (SignalMediaFailedAsync) |
| MediaTagged | F249 | `media.tagging.events` | F250 (eligibility bridge consumer) |
| MediaSafetyFlagged | F249 | `media.tagging.events` | F250 (RevokeEligibilityAsync), FLOW-13 (moderation pipeline) |
| MediaGateTimedOut | F246 | `media.ready.signals` | T85 convergence (timeout path) |
| PostPublished | F247 (outbox) | `post.lifecycle.events` | T86 (audience fanout), FLOW-09 (candidate feed), FLOW-13 (auto-scan) |
| PostDeleted | F247 (outbox) | `post.lifecycle.events` | F250 (revoke eligibility), FLOW-12 (remove from search index) |
| FeedEligibilityGranted | F250 (outbox) | `feed.eligibility.events` | FLOW-09 candidate pool refresh |
| FeedEligibilityRevoked | F250 (outbox) | `feed.eligibility.events` | FLOW-09 candidate pool refresh |
| PostIndexed | T86 | `search.index.events` | FLOW-12 search indexer |
| NotificationsBatched | F251 | `notifications.dispatch` | Notification delivery service (downstream) |

### API Registry

| Endpoint | Owner | Auth Required | Cross-Flow Conflict Check |
|----------|-------|---------------|--------------------------|
| POST /posts/draft | F247 (DynamicController) | YES — session + tenantId | CF-64 (no overlap with media API) |
| POST /posts/{draftId}/media | F244 (DynamicController) | YES — author only | CF-64 |
| GET /posts/{draftId}/upload-url | F244 (DynamicController) | YES — author only | CF-64 |
| POST /posts/{draftId}/publish | F247 (DynamicController) | YES — author BOLA | CF-64, CF-65 |
| GET /posts/{postId} | F247 (DynamicController) | YES — viewer scope | CF-64 |
| DELETE /posts/{postId} | F247 (DynamicController) | YES — author + admin | CF-64 |
| GET /media/{assetId} | F248 (DynamicController) | YES — viewer scope | CF-64 |
| GET /media/{assetId}/cdn | F248 (DynamicController) | YES — viewer scope | CF-64 |

---

## SAVE POINT: MERGE:P3_FLOW08 ✅

```
MERGE:P3_FLOW08 = COMPLETE
Target: V62_BFA_STRESS_TEST_MERGED.md
Added: CF-64 through CF-69 (6 conflict rules with proof of isolation)
Added: ST-31 through ST-34 (4 stress tests, all PASS)
Added: BFA entity registry (5 entities)
Added: BFA event registry (14 events)
Added: BFA API registry (8 endpoints)
System: CF-1-CF-69, ST-1-ST-34
Next: Phase 4 → UNIFIED_SOURCE_INDEX + SK-29-SK-30 Skill Patterns
```

## Recovery: "Start FLOW-08 Phase 4" → generate SK-29-SK-30 + DD entries + session state
