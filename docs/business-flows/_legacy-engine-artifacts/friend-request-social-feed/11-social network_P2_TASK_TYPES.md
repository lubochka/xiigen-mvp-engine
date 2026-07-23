# FLOW-08 — Post + Media Publish Pipeline
# Phase 2: Task Types T83–T86 + AF Station Map + Flow Template 18
# Source: 11-social_network_modules.md §3 Flow 3
# Date: 2026-02-26 | Save Point: MERGE:P2_FLOW08

---

## TASK TYPE: T83 — Media Upload Gate

**ARCHETYPE:** WAIT_STATE
**ENTRY:** POST /posts/draft → attachMedia → client uploads via signed URL → client confirms completion
**PURPOSE:** Manage the signed upload URL lifecycle: generate pre-auth URL (F244), track upload session in Redis, confirm upload completion (ETag validation), emit MediaUploadCompleted via transactional outbox, open the MediaReady wait gate (F246) registered with EP-2 durable timer. First WAIT_STATE archetype — execution pauses until TranscodeCompleted signal or gate timeout fires.
**DISTINCT FROM:**
- T77 (Connection Lifecycle Gate, FLOW-07): T77 is a LIFECYCLE gate managing human-initiated state transitions. T83 is a WAIT_STATE gate holding the publish pipeline pending an external async system signal (transcode worker). Different cardinality: T77 waits for human, T83 waits for infrastructure signal.
- T84 (Transcode Pipeline, FLOW-08): T83 manages the client-side upload session and opens the gate. T84 runs the server-side transcode worker that sends the signal that closes the gate. Sequential, not concurrent — T84 starts after T83 emits MediaUploadCompleted.

**FACTORY DEPENDENCIES:** F244, F246
**FABRIC RESOLUTION:**
- F244 → DATABASE FABRIC(ES) + DATABASE FABRIC(Redis) + QUEUE FABRIC(Redis Streams)
- F246 → FLOW ENGINE FABRIC(IFlowOrchestrator + EP-2) + DATABASE FABRIC(Redis) + QUEUE FABRIC(Redis Streams)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate upload session service extending MicroserviceBase; signed URL generation delegates to FREEDOM-configured pre-auth credential provider (never hardcoded); ETag validation before session close; gate open call to F246 after confirmed upload
- AF-2 Planning: Decompose into: validateMimeType → checkFileSizeLimit → generateSignedUrl → storeSession → [await client PUT to object storage] → receiveConfirm → validateETag → storeMetadata → openGate(F246) → emitMediaUploadCompleted
- AF-3 Prompt Library: media-upload-gate-v1 prompt for signed URL + wait state pattern
- AF-4 RAG: Search SK-29 (Media Upload Gate pattern) for signed URL + EP-2 wait gate patterns; Skill 09 for WAIT_STATE orchestrator registration; Skill 04 for transactional outbox on MediaUploadCompleted
- AF-5 Multi-model: N/A — deterministic upload lifecycle, no AI generation
- AF-6 Code Review: Verify ETag validation before session close; signed URL expiry enforced; gate opened atomically with upload completion; binary bytes never transit service; MIME type validation against FREEDOM allow-list
- AF-7 Compliance: DNA-1 through DNA-8; no UploadSession typed class; DataProcessResult on all paths; DNA-8 outbox on MediaUploadCompleted; DNA-5 tenantId on all Redis keys and ES index
- AF-8 Security: Signed URL pre-auth — credential never exposed in response beyond the URL itself; ETag prevents upload substitution attack; file size check enforced before URL generation (not just on completion); MIME type server-side validation (don't trust client-declared type); upload session Redis key scoped to tenantId+uploadId — no cross-tenant key access possible
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store upload completion rate, ETag validation failure rate, gate open latency, signed URL expiry rate

**BFA VALIDATION:** CF-64 (media upload ≠ post content), CF-66 (media upload events ≠ engagement events)

**MACHINE:**
- MIME type MUST be validated against FREEDOM allow-list BEFORE URL generation — rejected type = DataProcessResult(IsSuccess=false), no URL generated
- File size MUST be checked against FREEDOM max BEFORE URL generation
- ETag MUST be validated on ConfirmUploadCompleted — no ETag = reject confirmation
- Signed URL MUST expire per FREEDOM config — hardcoded expiry = BUILD FAILURE
- Gate MUST be opened atomically with upload confirmation — confirmed-but-no-gate = broken state, BUILD FAILURE
- Binary bytes MUST NOT transit F244 — any proxy pattern = BUILD FAILURE
- MediaUploadCompleted MUST use transactional outbox (DNA-8)

**FREEDOM:**
- Signed URL expiry duration (default: 15min, range: 5min–60min) — `freedom_media_{tenantId}`
- Max upload file size (default: 100MB, range: 1MB–2GB) — `freedom_media_{tenantId}`
- Allowed MIME types — `freedom_media_{tenantId}`
- Gate timeout seconds (default: 600, range: 60–3600) — `freedom_media_{tenantId}`

**IRON RULES:**
- IR-83-1: MIME type validation MUST precede signed URL generation — any code path generating a URL without MIME check = BUILD FAILURE
- IR-83-2: ETag validation MUST precede session close — ConfirmUploadCompleted without ETag parameter = BUILD FAILURE
- IR-83-3: Binary bytes MUST NOT pass through F244 — service acting as upload proxy = BUILD FAILURE
- IR-83-4: Signed URL expiry MUST come from FREEDOM config — `new TimeSpan(0, 15, 0)` hardcoded in generated code = BUILD FAILURE
- IR-83-5: Gate open (F246.OpenGateAsync) MUST succeed before MediaUploadCompleted is emitted — emit-without-gate = broken pipeline state, BUILD FAILURE
- IR-83-6: Upload session Redis key MUST include tenantId — `upload:session:{uploadId}` without tenantId = BUILD FAILURE (DNA-5)
- IR-83-7: EP-2 timer registration via F246 MUST be confirmed — OpenGateAsync returning failure must abort the entire T83 step (no orphan gate)
- IR-83-8: No typed UploadSession model — Dictionary<string,object> only (DNA-1)

**QUALITY GATES (AF-9):**
- QG-83-1: MIME type rejection — disallowed type returns DataProcessResult(IsSuccess=false), no URL generated
- QG-83-2: File size rejection — oversized request returns HTTP 422 before URL generation
- QG-83-3: ETag validation — confirm without matching ETag returns DataProcessResult(IsSuccess=false)
- QG-83-4: Expiry enforcement — expired session: ConfirmUploadCompleted returns DataProcessResult(IsSuccess=false, Message="Upload session expired")
- QG-83-5: Gate open atomicity — simulated F246.OpenGateAsync failure causes T83 to roll back session and return failure (no orphan confirmed-but-no-gate state)
- QG-83-6: EP-2 timer proof — gate opened without EP-2 timer registration is detected by AF-7 compliance scan
- QG-83-7: Tenant isolation — upload session for tenantA is invisible to tenantB query
- QG-83-8: Binary proxy detection — AF-7 compliance scan rejects any F244 method that accepts binary stream parameter

---

## TASK TYPE: T84 — Transcode Pipeline

**ARCHETYPE:** ASYNC_WORKER
**ENTRY:** MediaUploadCompleted event — queued to `transcode.jobs` stream; picked up by transcode worker consumer
**PURPOSE:** Dequeue MediaUploadCompleted, submit transcode job (F245) to worker pool, orchestrate per-format rendering jobs, register CDN assets (F248) after each format completes, run AI media tagging in parallel track (F249 — does not block MediaReady signal), emit TranscodeCompleted once at least one format is ready, emit MediaReady signal to F246 gate
**DISTINCT FROM:**
- T83 (Media Upload Gate, FLOW-08): T83 manages client upload session and opens the gate. T84 processes the uploaded file after the gate is open. T84 is triggered by T83's output event (MediaUploadCompleted), not by HTTP.
- T85 (Post Publication Gate, FLOW-08): T84 produces the signal (MediaReady via TranscodeCompleted) that T85 waits for. Producer vs consumer of the same signal.

**FACTORY DEPENDENCIES:** F245, F248, F249
**FABRIC RESOLUTION:**
- F245 → QUEUE FABRIC(Redis Streams — transcode.jobs + transcode.results) + DATABASE FABRIC(ES + Redis)
- F248 → DATABASE FABRIC(ES + Redis)
- F249 → AI ENGINE FABRIC(IAiProvider via AiDispatcher) + DATABASE FABRIC(ES + Redis) + QUEUE FABRIC(Redis Streams)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate async worker consumer extending MicroserviceBase; dequeue from `transcode.jobs`; spawn per-format sub-tasks; parallel track for F249 tagging without blocking CDN registration; emit TranscodeCompleted after first format ready; acknowledge queue message after TranscodeCompleted emitted
- AF-2 Planning: Decompose into: dequeue(F245) → submitTranscodeJob → [parallel: per-format render → registerCDN(F248)] + [parallel-async: F249.GenerateCaption → F249.ExtractTags → F249.ClassifySafety] → onFirstFormatReady: emitTranscodeCompleted → signalGate(F246.SignalMediaReadyAsync) → onAllFormatsReady: updateJobStatusComplete
- AF-3 Prompt Library: transcode-async-worker-v1 prompt for queue worker + parallel-track pattern
- AF-4 RAG: Search SK-30 (Async Transcode Worker pattern) for consumer group + retry + DLQ patterns; Skill 04 for dead letter queue; Skill 07 for parallel AI track pattern
- AF-5 Multi-model: N/A — transcode is deterministic; F249 uses single AI model per FREEDOM config (not ensemble)
- AF-6 Code Review: Verify message acknowledgment happens AFTER TranscodeCompleted emit (not before); verify F249 tagging does not block MediaReady signal; verify per-format retry stays within maxRetries; DLQ routing for permanent failures
- AF-7 Compliance: DNA-1 through DNA-8; no TranscodeJob typed class; DataProcessResult on all paths; DNA-8 outbox on TranscodeCompleted; DNA-5 tenantId on all job keys
- AF-8 Security: Worker processes MUST NOT expose raw asset URLs in events — CDN URLs only (F248 registered). Asset storage path MUST NOT be logged in plain text. Tagging result with safety flag MUST trigger MediaSafetyFlagged before MediaReady — no race condition allowing unsafe content into feed.
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A (single worker pipeline, no model merge)
- AF-11 Feedback: Store transcode success rate per format, p95 transcode latency, AI tagging latency, DLQ rate

**BFA VALIDATION:** CF-64 (transcode events ≠ post events), CF-65 (safety flag vs eligibility grant ordering)

**MACHINE:**
- MUST acknowledge queue message AFTER TranscodeCompleted is emitted — pre-ACK = message loss risk
- F249 tagging MUST run on PARALLEL async track — tagging failure MUST NOT block MediaReady signal (TranscodeCompleted fires on first-format-ready regardless of tagging status)
- Safety classification (F249.ClassifyContentSafetyAsync) MUST complete before FeedEligibilityGranted is permitted — MediaSafetyFlagged gate enforced by F250
- Per-format job failures: retry up to maxRetries; if ALL formats fail = TranscodeFailed event + F246.SignalMediaFailedAsync
- Dead Letter Queue: any job exceeding maxRetries goes to DLQ; monitoring alert required

**FREEDOM:**
- Output video formats (default: `["mp4-720p","mp4-1080p","webm-720p"]`) — `freedom_media_{tenantId}`
- Transcode max retry attempts (default: 3, range: 1–5) — `freedom_media_{tenantId}`
- AI tagging model (default: `claude-sonnet-4`) — `freedom_ai_{tenantId}`
- Safety threshold for MediaSafetyFlagged (default: 0.75, range: 0.5–0.99) — `freedom_moderation_{tenantId}`

**IRON RULES:**
- IR-84-1: Queue message MUST NOT be acknowledged until TranscodeCompleted event is emitted and persisted — pre-ACK = BUILD FAILURE
- IR-84-2: F249 tagging MUST be on parallel async track — tagging blocking TranscodeCompleted = BUILD FAILURE
- IR-84-3: Raw asset storage path MUST NOT appear in any event payload — CDN URLs (F248) only
- IR-84-4: TranscodeCompleted MUST fire on FIRST format ready — waiting for all formats before signaling gate = post publish delay violation
- IR-84-5: PermanentFail (all retries exhausted) MUST route to DLQ — silent drop = BUILD FAILURE
- IR-84-6: MediaSafetyFlagged MUST be emitted BEFORE FeedEligibilityGranted is possible — race condition allowing unsafe content into feed = CRITICAL BUILD FAILURE
- IR-84-7: All transcode job state mutations MUST use DataProcessResult<T> — throws = BUILD FAILURE (DNA-3)
- IR-84-8: No typed TranscodeJob model in generated code — Dictionary<string,object> only (DNA-1)

**QUALITY GATES (AF-9):**
- QG-84-1: Parallel format jobs — 3 format jobs run concurrently; none blocks another
- QG-84-2: First-format-ready signal — TranscodeCompleted emitted after first format completes, not waiting for all
- QG-84-3: F249 parallel track — tagging runs concurrently with CDN registration; tagging delay does not delay MediaReady signal
- QG-84-4: Safety-before-eligibility proof — test sequence: TranscodeCompleted → F249 safety FLAGGED → FeedEligibilityGranted blocked. Test: TranscodeCompleted → F249 safety CLEAR → FeedEligibilityGranted allowed
- QG-84-5: DLQ routing — job with 3 consecutive failures routed to DLQ, not silently dropped
- QG-84-6: Post-ACK confirmation — queue acknowledgment occurs AFTER TranscodeCompleted; pod restart between emit and ACK replays correctly
- QG-84-7: Raw path protection — no storage path appears in `transcode.results` stream payload
- QG-84-8: Tenant isolation — worker only processes jobs for configured tenantId; cross-tenant job dequeue = rejected

---

## TASK TYPE: T85 — Post Publication Gate

**ARCHETYPE:** CONVERGENCE
**ENTRY:** CONVERGENCE of two independent signals: (1) MediaReady signal via F246 gate resolution, (2) User submits publish intent (POST /posts/{draftId}/publish)
**PURPOSE:** Wait for BOTH upload/transcode completion (MediaReady via F246) AND explicit user publish intent before executing publication. Validates draft state (media attached, content valid, audience rule set), calls F247.PublishPostAsync which atomically writes PG post + emits PostPublished via outbox, then calls F250.GrantEligibilityAsync. This is the FIRST CONVERGENCE archetype — a step that requires two independent streams to both arrive before proceeding.
**DISTINCT FROM:**
- T83 (Media Upload Gate, FLOW-08): T83 manages the upload/transcode half of the convergence. T85 is the gate that waits for BOTH halves. Different scope: T83 is one tributary; T85 is the confluence.
- T86 (Audience Fanout, FLOW-08): T85 PUBLISHES the post. T86 distributes it to feeds and notifications AFTER publication. Sequential.

**FACTORY DEPENDENCIES:** F246, F247, F250
**FABRIC RESOLUTION:**
- F246 → FLOW ENGINE FABRIC(IFlowOrchestrator + EP-2) + DATABASE FABRIC(Redis) + QUEUE FABRIC(Redis Streams)
- F247 → DATABASE FABRIC(PG + Redis + ES) + QUEUE FABRIC(Redis Streams)
- F250 → DATABASE FABRIC(ES + Redis) + QUEUE FABRIC(Redis Streams)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate convergence service extending MicroserviceBase; dual-trigger state machine (mediaReady=false, publishIntent=false → both must become true); correlation by draftId; call F247.PublishPostAsync only when both signals received; immediate F250.GrantEligibilityAsync after successful publication
- AF-2 Planning: Decompose into: [track-1: await F246.GateStatus=RESOLVED(mediaReady=true)] + [track-2: await HTTP POST /posts/{draftId}/publish(publishIntent=true)] → CONVERGENCE: validateDraft → F247.PublishPostAsync → F250.GrantEligibilityAsync → emitPostPublished
- AF-3 Prompt Library: convergence-gate-v1 prompt for dual-signal convergence pattern
- AF-4 RAG: Search SK-29 for dual-signal convergence; Skill 09 for IFlowOrchestrator wait state management; Skill 05 for PG atomic publish write
- AF-5 Multi-model: N/A — deterministic convergence gate
- AF-6 Code Review: Verify both signals tracked independently; convergence triggers only once (idempotent); partial arrival (one signal only) stays pending; F247.PublishPostAsync called exactly once per convergence
- AF-7 Compliance: DNA-1 through DNA-8; DNA-8 on PostPublished event (via F247 outbox); DNA-5 on all fabric calls
- AF-8 Security: BOLA check — only the post author can send publish intent; MUST verify authorId matches session; check that media safety flag is not active (F250 enforces this, but T85 should pre-check)
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store publish latency (from draft creation to published), convergence wait time, media-ready-before-intent ratio

**BFA VALIDATION:** CF-64 (post publish ≠ media upload state), CF-66 (PostPublished event ≠ media events), CF-67 (feed eligibility ≠ lesson feed distribution)

**MACHINE:**
- Both signals MUST arrive before F247.PublishPostAsync — partial convergence = pending, never partial publish
- F247.PublishPostAsync MUST be called exactly once per draftId — duplicate convergence detection via draftId idempotency key
- F250.GrantEligibilityAsync MUST be called immediately after successful publish — published-but-not-eligible = acceptable transient; published-never-eligible = BUILD FAILURE
- Safety flag check MUST gate eligibility — published post with active MediaSafetyFlagged MUST NOT receive FeedEligibilityGranted (CF-65)
- Author MUST match session identity — cross-user publish = CRITICAL BUILD FAILURE

**FREEDOM:**
- Convergence timeout (default: 7 days from draft creation, range: 1–90 days) — `freedom_post_{tenantId}` (after which draft expires and both signals are discarded)
- Allow publish without media (default: false) — `freedom_post_{tenantId}` (if true, T83/T84 path is optional)

**IRON RULES:**
- IR-85-1: F247.PublishPostAsync MUST only execute when BOTH mediaReady=true AND publishIntent=true — calling with either signal false = BUILD FAILURE
- IR-85-2: Convergence MUST be idempotent per draftId — second publish intent for same draftId after convergence returns cached PostPublished result
- IR-85-3: Author BOLA check MUST precede convergence — publish intent from non-author = BUILD FAILURE
- IR-85-4: Safety flag pre-check MUST occur before GrantEligibilityAsync — F250 enforces, but T85 generated code MUST also validate (defense in depth)
- IR-85-5: F250.GrantEligibilityAsync failure MUST NOT roll back publish — post is published; eligibility retry is a separate concern
- IR-85-6: PostPublished event sourced from F247 transactional outbox — T85 must not emit its own PostPublished event (single source of truth)
- IR-85-7: Draft expiry (convergence timeout) MUST use EP-2 timer — cron-based expiry = BUILD FAILURE
- IR-85-8: No typed DraftState or PublishContext model — Dictionary<string,object> only (DNA-1)

**QUALITY GATES (AF-9):**
- QG-85-1: Convergence gate — single signal alone does not trigger publish (mediaReady alone: stays pending; publishIntent alone: stays pending)
- QG-85-2: Both signals: F247.PublishPostAsync called exactly once; PostPublished event emitted exactly once
- QG-85-3: Idempotency — second publishIntent for same converged draftId returns success without re-executing publish
- QG-85-4: BOLA test — publish intent from userId ≠ authorId returns HTTP 403
- QG-85-5: Safety gate — MediaSafetyFlagged active → GrantEligibilityAsync returns DataProcessResult(IsSuccess=false); post remains published but not feed-eligible
- QG-85-6: Convergence with FREEDOM allow-no-media=true — draft with no media and publish intent alone triggers publication (T83/T84 path skipped)
- QG-85-7: Draft expiry — draft with no signals after convergence timeout emits DraftExpired; no orphan pending gates
- QG-85-8: Tenant isolation — convergence state for tenantA not visible to tenantB

---

## TASK TYPE: T86 — Audience Fanout

**ARCHETYPE:** DISTRIBUTION
**ENTRY:** PostPublished event from `post.lifecycle.events` stream
**PURPOSE:** On PostPublished, determine the audience (followers + group members + mentioned users) applying audience rule and privacy settings, enqueue FeedEligibilityGranted confirmation to FLOW-09 candidate pool (via F250 if not already granted), dispatch fan-out notifications to eligible recipients (F251) with rate limiting and deduplication, index post into search (emits PostIndexed event for FLOW-12 search indexer). First distribution step to operate across three downstream systems simultaneously (feed, notification, search).
**DISTINCT FROM:**
- T81 (Tiered Historical Feed Backfill, FLOW-07): T81 injects historical posts bidirectionally for a newly connected friend pair. T86 distributes a NEW post to all current followers/audience at publish time. Different trigger: T81 fires on connection acceptance; T86 fires on post publication.
- T75 (Audience Distribution, FLOW-06): T75 distributes marketplace content using dual consumer groups. T86 distributes social posts using audience rules + privacy checks + notification fanout. Different audience calculation, different content type.

**FACTORY DEPENDENCIES:** F250, F251
**FABRIC RESOLUTION:**
- F250 → DATABASE FABRIC(ES feed-eligible index + Redis) + QUEUE FABRIC(Redis Streams)
- F251 → QUEUE FABRIC(Redis Streams notifications.dispatch) + DATABASE FABRIC(Redis rate limit + ES audit)

**AF CONFIGURATION:**
- AF-1 Genesis: Generate fanout consumer service extending MicroserviceBase; dequeue PostPublished; resolve audience from post audienceRule (FREEDOM); apply privacy/block filters; batch enqueue notification events to F251; confirm feed eligibility via F250; emit PostIndexed event for search pipeline
- AF-2 Planning: Decompose into: dequeuePostPublished → resolveAudience(audienceRule) → applyPrivacyFilters → [parallel: F250.confirm-eligibility + F251.DispatchPostPublished(batched) + emit-PostIndexed]
- AF-3 Prompt Library: audience-fanout-v1 prompt for batch distribution with rate limiting
- AF-4 RAG: Search SK-30 for distribution patterns; Skill 04 for batch enqueue; F251 for notification rate limit pattern
- AF-5 Multi-model: N/A — rule-based audience resolution
- AF-6 Code Review: Verify audience resolution respects audience rule; privacy/block filter applied before notification; batch size within FREEDOM limit; PostIndexed event emitted for FLOW-12
- AF-7 Compliance: DNA-1 through DNA-8; tenantId on all audience lookups and notification keys
- AF-8 Security: Audience must not include blocked users; MUST NOT expose post content in notification event payload (reference by postId only); audience resolution must apply privacy settings per field
- AF-9 Judge: 8 quality gates (see below)
- AF-10 Merge: N/A
- AF-11 Feedback: Store fanout recipient count, notification dispatch rate, batch throughput, rate-limit rejection rate

**BFA VALIDATION:** CF-67 (feed fanout ≠ lesson feed), CF-68 (notification fanout ≠ engagement notifications), CF-69 (search index ≠ feed eligibility index)

**MACHINE:**
- Audience resolution MUST apply privacy/block rules — blocked user in audience = BUILD FAILURE
- Notification fan-out MUST use F251 (QUEUE FABRIC) — direct HTTP to notification service = BUILD FAILURE
- PostIndexed event MUST be emitted for FLOW-12 search indexer — distribution without search indexing = content invisible to search
- Batch size MUST be respected — single giant enqueue exceeding batch limit = BUILD FAILURE

**FREEDOM:**
- Audience rule per post type (default: FOLLOWERS, options: PUBLIC/FOLLOWERS/CONNECTIONS/CUSTOM) — `freedom_post_{tenantId}`
- Max notification batch size (default: 1000, range: 100–5000) — `freedom_notification_{tenantId}`
- Post fanout delay after publish (default: 0s) — `freedom_feed_{tenantId}`

**IRON RULES:**
- IR-86-1: Audience resolution MUST include privacy filter and block list check — unfiltered audience = BUILD FAILURE
- IR-86-2: Notification dispatch MUST go through F251.DispatchPostPublishedAsync — direct HTTP to notification service = BUILD FAILURE
- IR-86-3: PostIndexed event MUST be emitted — absence = content not discoverable via FLOW-12 search
- IR-86-4: Post content MUST NOT appear in notification event payload — postId reference only; consumer resolves content independently
- IR-86-5: Fan-out is best-effort for notifications — notification failure MUST NOT roll back post publication
- IR-86-6: Feed eligibility (F250) is NOT re-confirmed in T86 — T85 already granted it; T86 reads existing eligibility state only
- IR-86-7: All audience resolution queries MUST include tenantId (DNA-5)
- IR-86-8: No typed Recipient model — Dictionary<string,object> only (DNA-1)

**QUALITY GATES (AF-9):**
- QG-86-1: Blocked user exclusion — audience resolution test: blocked user in follower list is NOT included in notification batch
- QG-86-2: Privacy filter — post with audienceRule=CONNECTIONS only notifies connections, not general followers
- QG-86-3: Notification batch sizing — 5000 followers enqueued in batches of ≤1000; 5 batches, not 1 giant enqueue
- QG-86-4: PostIndexed emission — PostPublished for any post emits PostIndexed event within T86 execution
- QG-86-5: Notification failure isolation — F251.DispatchPostPublishedAsync returning failure does not roll back post publish status
- QG-86-6: Content privacy — notification event payload contains only postId and authorId, not post body
- QG-86-7: Rate limit respect — F251 rate limit check per recipient; over-limit recipient not notified but not logged as error
- QG-86-8: Tenant isolation — PostPublished from tenantA not dispatched to tenantB recipients

---

## AF STATION MAP — FLOW-08 (4 Task Types × 11 Stations = 44 Cells)

| AF Station | T83 MEDIA_UPLOAD_GATE | T84 TRANSCODE_PIPELINE | T85 POST_PUBLICATION_GATE | T86 AUDIENCE_FANOUT |
|---|---|---|---|---|
| **AF-1 Genesis** | Upload session service + signed URL generator + gate open on ETag confirm | Async worker consumer + per-format sub-jobs + parallel AI track (F249) | Dual-signal convergence state machine + author BOLA check + F247 publish call | Audience resolution service + privacy filter + batch notification enqueue |
| **AF-2 Planning** | validateMIME → checkSize → genSignedUrl → storeSession → confirm → validateETag → openGate → emitCompleted | dequeue → submitJob → [parallel formats] + [parallel: caption+tags+safety] → onFirstReady: signalGate | [track-1: mediaReady] + [track-2: publishIntent] → convergence → publish → grantEligibility | dequeue PostPublished → resolveAudience → applyPrivacy → [parallel: fanout notif + confirm eligibility + emit PostIndexed] |
| **AF-3 Prompt Library** | media-upload-gate-v1 | transcode-async-worker-v1 | convergence-gate-v1 | audience-fanout-v1 |
| **AF-4 RAG** | SK-29 (Media Upload Gate) + Skill 09 (WAIT_STATE) + Skill 04 (outbox) | SK-30 (Async Transcode Worker) + Skill 04 (DLQ) + Skill 07 (parallel AI) | SK-29 (dual-signal convergence) + Skill 09 (gate status check) + Skill 05 (PG publish) | SK-30 (distribution batch) + Skill 04 (fan-out queue) + F251 rate limit |
| **AF-5 Multi-model** | N/A — deterministic | N/A — F249 single model per FREEDOM | N/A — deterministic | N/A — rule-based |
| **AF-6 Code Review** | ETag before close; gate opens atomically; binary bytes never transit | ACK after emit; F249 non-blocking; all formats retry; DLQ routing | Both signals required; idempotent per draftId; F247 called once | Audience filter before batch; batch size ≤ FREEDOM limit; PostIndexed emitted |
| **AF-7 Compliance** | DNA-1-8; no UploadSession class; DNA-8 on MediaUploadCompleted | DNA-1-8; no TranscodeJob class; DNA-8 on TranscodeCompleted | DNA-1-8; no DraftState class; DNA-8 via F247; DNA-5 on all calls | DNA-1-8; no Recipient class; DNA-5 on all audience queries |
| **AF-8 Security** | Pre-auth URL only; ETag prevents substitution; MIME server-validate; session key scoped | Worker scoped to tenantId; raw path never in event; safety-before-eligibility | Author BOLA; safety flag pre-check; no post content in events | Blocked user excluded; post content not in notification payload; audience scoped to tenantId |
| **AF-9 Judge** | 8 QGs: MIME reject, size reject, ETag validate, expiry, gate atomicity, EP-2 proof, tenant isolation, binary proxy detection | 8 QGs: parallel formats, first-format signal, F249 parallel, safety-before-eligibility, DLQ routing, post-ACK, raw path, tenant isolation | 8 QGs: single-signal pending, dual-signal publish, idempotency, BOLA, safety gate, no-media mode, expiry, tenant isolation | 8 QGs: blocked exclusion, privacy filter, batch size, PostIndexed emit, failure isolation, content privacy, rate limit, tenant isolation |
| **AF-10 Merge** | N/A | N/A | N/A | N/A |
| **AF-11 Feedback** | Upload completion rate, ETag failure rate, gate open latency, expiry rate | Transcode success per format, p95 latency, AI tagging latency, DLQ rate | Publish latency, convergence wait, media-before-intent ratio | Fanout recipient count, notification dispatch rate, batch throughput, rate-limit rejection |

---

## FLOW TEMPLATE 18 — post-media-publish-v1

```json
{
  "flow_id": "FLOW-08",
  "flow_name": "post-media-publish-v1",
  "version": "1.0.0",
  "status": "PUBLISHED",
  "family": 27,
  "description": "Full post + media publish pipeline: signed upload → async transcode → wait gate → convergence publish → feed eligibility → audience fanout",

  "triggers": [
    {
      "type": "HTTP",
      "binding": "POST /posts/draft",
      "produces": "DraftCreated"
    },
    {
      "type": "HTTP",
      "binding": "POST /posts/{draftId}/publish",
      "produces": "PublishIntentReceived"
    }
  ],

  "machineConstants": {
    "binaryBytesNeverTransitService": true,
    "mediaGateRequiredBeforePublish": true,
    "convergenceRequiresBothSignals": true,
    "postPublishedViaOutboxOnly": true,
    "safetyCheckBeforeFeedEligibility": true
  },

  "freedomConfigIndices": [
    "freedom_media_{tenantId}",
    "freedom_post_{tenantId}",
    "freedom_notification_{tenantId}",
    "freedom_moderation_{tenantId}",
    "freedom_ai_{tenantId}",
    "freedom_feed_{tenantId}"
  ],

  "steps": [
    {
      "id": "step-1",
      "name": "Media Upload Gate",
      "taskType": "T83",
      "archetype": "WAIT_STATE",
      "factories": [
        {"id": "F244", "interface": "IMediaUploadService", "createVia": "CreateAsync", "fabricHint": "database:es+redis,queue:redis-streams"},
        {"id": "F246", "interface": "IMediaReadyGateService", "createVia": "CreateAsync", "fabricHint": "flow-engine:orchestrator+ep-2,queue:redis-streams,database:redis"}
      ],
      "entry": {"event": "HTTP:POST /posts/{draftId}/attachMedia + client-upload-confirmation"},
      "exit": {"event": "MediaUploadCompleted"},
      "preChecks": ["validateMIMEType:F244.FREEDOM", "checkFileSize:F244.FREEDOM"],
      "waitGate": {
        "factory": "F246",
        "gateType": "MediaReady",
        "timer": "EP-2",
        "timeoutConfigKey": "freedom_media_{tenantId}.gateTimeoutSeconds",
        "onTimeout": "FREEDOM:freedom_post_{tenantId}.publishWithoutMediaOnTimeout"
      },
      "onSuccess": "emit:MediaUploadCompleted",
      "onFailure": "emit:MediaUploadFailed"
    },
    {
      "id": "step-2",
      "name": "Transcode Pipeline",
      "taskType": "T84",
      "archetype": "ASYNC_WORKER",
      "factories": [
        {"id": "F245", "interface": "ITranscodeOrchestrationService", "createVia": "CreateAsync", "fabricHint": "queue:redis-streams,database:es+redis"},
        {"id": "F248", "interface": "IMediaCDNService", "createVia": "CreateAsync", "fabricHint": "database:es+redis"},
        {"id": "F249", "interface": "IAiMediaTaggingService", "createVia": "CreateAsync", "fabricHint": "ai:llm-vision,database:es+redis,queue:redis-streams"}
      ],
      "entry": {"event": "MediaUploadCompleted"},
      "exit": {"events": ["TranscodeCompleted", "MediaTagged", "MediaSafetyFlagged"]},
      "parallel": {
        "cdnTrack": ["F245.SubmitTranscodeJob", "F248.RegisterCDNAssets"],
        "aiTagTrack": ["F249.GenerateCaption", "F249.ExtractTags", "F249.ClassifyContentSafety"],
        "trackStrategy": "PARALLEL_INDEPENDENT",
        "firstReadySignal": "TranscodeCompleted"
      },
      "onFirstFormatReady": "signal:F246.SignalMediaReadyAsync",
      "onAllFormatsReady": "update:F245.jobStatus=Completed",
      "onPermanentFail": "dlq:transcode.dlq",
      "note": "F249 tagging runs on parallel async track — does not block MediaReady signal"
    },
    {
      "id": "step-3",
      "name": "Post Publication Gate",
      "taskType": "T85",
      "archetype": "CONVERGENCE",
      "factories": [
        {"id": "F246", "interface": "IMediaReadyGateService", "createVia": "CreateAsync", "fabricHint": "flow-engine:orchestrator+ep-2,queue:redis-streams,database:redis"},
        {"id": "F247", "interface": "IPostPublicationService", "createVia": "CreateAsync", "fabricHint": "database:pg+redis+es,queue:redis-streams"},
        {"id": "F250", "interface": "IFeedEligibilityService", "createVia": "CreateAsync", "fabricHint": "database:es+redis,queue:redis-streams"}
      ],
      "entry": {
        "convergence": ["MediaReady:F246.GateStatus=RESOLVED", "PublishIntent:HTTP:POST /posts/{draftId}/publish"],
        "strategy": "BOTH_REQUIRED",
        "correlationKey": "draftId"
      },
      "exit": {"events": ["PostPublished", "FeedEligibilityGranted"]},
      "preChecks": ["authorBOLA:session.userId==post.authorId", "safetyFlagCheck:F249.ClassifyStatus!=FLAGGED"],
      "publish": {"factory": "F247", "method": "PublishPostAsync", "outbox": true},
      "grantEligibility": {"factory": "F250", "method": "GrantEligibilityAsync", "safetyGated": true},
      "onFailure": "compensate:F247.DeletePostAsync(reason=convergence-failure)"
    },
    {
      "id": "step-4",
      "name": "Audience Fanout",
      "taskType": "T86",
      "archetype": "DISTRIBUTION",
      "factories": [
        {"id": "F250", "interface": "IFeedEligibilityService", "createVia": "CreateAsync", "fabricHint": "database:es+redis,queue:redis-streams"},
        {"id": "F251", "interface": "INotificationDispatchService", "createVia": "CreateAsync", "fabricHint": "queue:redis-streams,database:redis+es"}
      ],
      "entry": {"event": "PostPublished"},
      "exit": {"events": ["NotificationsBatched", "PostIndexed"]},
      "parallel": {
        "notificationTrack": "F251.DispatchPostPublishedAsync",
        "searchIndexTrack": "emit:PostIndexed",
        "trackStrategy": "PARALLEL_BEST_EFFORT"
      },
      "audienceResolution": {
        "rule": "FREEDOM:freedom_post_{tenantId}.audienceRule",
        "privacyFilter": true,
        "blockListFilter": true,
        "maxBatchSize": "FREEDOM:freedom_notification_{tenantId}.maxBatchSize"
      },
      "note": "Notification failure MUST NOT roll back post publication. PostIndexed consumed by FLOW-12 search indexer."
    }
  ],

  "bfaRegistration": {
    "entities": ["Draft", "Post", "MediaAsset", "TranscodeJob", "FeedEligibility"],
    "events": [
      "MediaUploadInitiated",
      "MediaUploadCompleted",
      "MediaUploadFailed",
      "TranscodeCompleted",
      "TranscodeFailed",
      "MediaTagged",
      "MediaSafetyFlagged",
      "MediaGateTimedOut",
      "PostPublished",
      "PostDeleted",
      "FeedEligibilityGranted",
      "FeedEligibilityRevoked",
      "PostIndexed",
      "NotificationsBatched"
    ],
    "apis": [
      "/posts/draft",
      "/posts/{draftId}/media",
      "/posts/{draftId}/publish",
      "/posts/{postId}",
      "/media/upload",
      "/media/{assetId}",
      "/media/{assetId}/cdn"
    ],
    "conflictRules": ["CF-64", "CF-65", "CF-66", "CF-67", "CF-68", "CF-69"]
  }
}
```

---

## FLOW-08 TASK TYPE SUMMARY

| Task | Name | Archetype | IRs | QGs | Factories |
|------|------|-----------|-----|-----|-----------|
| T83 | Media Upload Gate | WAIT_STATE | 8 | 8 | F244, F246 |
| T84 | Transcode Pipeline | ASYNC_WORKER | 8 | 8 | F245, F248, F249 |
| T85 | Post Publication Gate | CONVERGENCE | 8 | 8 | F246, F247, F250 |
| T86 | Audience Fanout | DISTRIBUTION | 8 | 8 | F250, F251 |

**Totals: 4 task types, 32 iron rules, 32 quality gates, 44 AF cells, 1 flow template**

---

## SAVE POINT: MERGE:P2_FLOW08 ✅
## Next: Phase 3 — CF-64–CF-69 BFA Conflict Rules + ST-31–ST-34 Stress Tests
## Recovery: "Start FLOW-08 Phase 3" → generate FLOW08_P3_BFA.md
