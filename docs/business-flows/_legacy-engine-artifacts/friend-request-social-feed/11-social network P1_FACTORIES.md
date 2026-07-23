# FLOW-08 — Post + Media Publish Pipeline
# Phase 1: Factory Interfaces F244–F251 (Family 27)
# Source: 11-social_network_modules.md §3 Flow 3 — "Publish a post (with media)"
# Date: 2026-02-26 | Save Point: MERGE:P1_FLOW08

---

## FAMILY 27 — POST + MEDIA PUBLISH PIPELINE

**Flow**: FLOW-08
**Family**: 27
**Factories**: F244–F251 (8 interfaces)
**Primary flow**: F244→F245→F246→F247→[F249 async]→F250→F251
**Cross-flow reads**: None (FLOW-08 is additive; downstream flows read from it)
**Cross-flow writes**: F250 writes to feed index read by FLOW-09 (F252); F251 dispatches events consumed by FLOW-10 (engagement) and FLOW-13 (moderation auto-scan)

### First-time capabilities introduced by Family 27

| Capability | Artifact | Why First |
|-----------|----------|-----------|
| WAIT_STATE archetype — MediaReady event hold | F246, T83 | All prior task types are triggered/computed/distributed; this is first to wait for an external async signal |
| Signed URL pre-auth object storage | F244 | First time object storage enters the factory model — upload is pre-auth, metadata tracked via ES through fabric |
| AI-tagged media pipeline inline | F249 | First time AI ENGINE FABRIC (captioning/tagging) sits in a write path rather than scoring/generation |
| EP-2 Durable Timer for async media gate | F246 | EP-2 was previously used for expiry timers; first use as an async _wait_ gate on an external pipeline |
| Two-stage publish gate (media + post convergence) | F247, T85 | First CONVERGENCE archetype — step fires only when BOTH upload completion AND explicit publish intent arrive |

---

## F244 — IMediaUploadService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| DATABASE FABRIC | Skill 05 | Elasticsearch | `media-assets-{tenantId}` (index) | Media metadata: assetId, uploadStatus, signedUrlExpiry, assetKey, mimeType, fileSize, uploadedBy |
| DATABASE FABRIC | Skill 05 | Redis | `upload:session:{tenantId}:{uploadId}` HASH (TTL = signedUrlExpirySeconds) | In-progress upload session tracking (status, chunkCount, etag) |
| QUEUE FABRIC | Skill 04 | Redis Streams | `media.upload.events` consumer group `media-main` | Emit MediaUploadInitiated, MediaUploadCompleted, MediaUploadFailed |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var mediaUploadService = await _factory.CreateAsync<IMediaUploadService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "signed-url-generation", "upload-tracking", "metadata-store" },
        FabricHint = "database:es+redis,queue:redis-streams"
    });
```

### Methods

1. `GenerateSignedUploadUrlAsync(tenantId, userId, fileMetadata: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — returns `{ uploadId, signedUrl, expiresAt, maxSizeBytes }`
2. `TrackUploadProgressAsync(tenantId, uploadId, progressData: Dictionary<string,object>) → DataProcessResult<bool>` — updates Redis session state
3. `ConfirmUploadCompletedAsync(tenantId, uploadId, completionData: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — stores metadata to ES, emits MediaUploadCompleted
4. `GetUploadSessionAsync(tenantId, uploadId) → DataProcessResult<Dictionary<string,object>>` — returns current session state
5. `ExpireUploadSessionAsync(tenantId, uploadId) → DataProcessResult<bool>` — called by EP-2 timer on signed URL expiry
6. `GetMediaAssetAsync(tenantId, assetId) → DataProcessResult<Dictionary<string,object>>` — full asset metadata from ES

### Signed URL Protocol (MACHINE — non-negotiable)

```
Client         F244                 Object Storage (External)
  │─GenerateSignedUploadUrl──►│
  │◄──{signedUrl, uploadId}───│  F244 stores session in Redis only
  │                            │  (NO fabric call to object storage — pre-auth URL)
  │──────────PUT {signedUrl}──────────────────────────────►│
  │◄─────────────────────────────────────── 200 OK ETag────│
  │──ConfirmUploadCompleted───►│  Client confirms with ETag
  │                            │──ES.StoreDocument(metadata)──► media-assets-{tenantId}
  │                            │──Queue.EnqueueAsync(MediaUploadCompleted)
  │◄──{assetId, uploadId}──────│
```

**⚠️ CRITICAL: The signed URL is generated client-side with pre-auth credentials resolved via FREEDOM config. F244 NEVER acts as proxy for the binary upload stream. Binary bytes NEVER pass through the fabric.**

### DISTINCT FROM

- **F248 (IMediaCDNService, FLOW-08 same family)**: F244 handles the UPLOAD path (signed URL generation, session tracking, completion confirmation). F248 handles the CDN DELIVERY path (transcoded output URLs, CDN invalidation, playback token generation). Different lifecycle stage, different storage patterns, different methods.
- **F272 (IMessageMediaService, FLOW-11)**: F272 attaches pre-uploaded media references to messages. F244 owns the upload session lifecycle. F272 reads F244's output (assetId) — it does not perform uploads.

### MACHINE (non-negotiable)

- Signed URL expiry MUST be enforced — expired sessions automatically invalidated via EP-2 timer
- `ConfirmUploadCompleted` MUST verify ETag matches pre-agreed checksum — no confirmation without ETag validation
- MediaUploadCompleted event MUST be emitted via transactional outbox (DNA-8) — atomic with ES metadata write
- Upload session Redis TTL MUST equal signedUrlExpirySeconds + 30s buffer — expired before TTL = client error only
- Binary upload bytes MUST NOT transit F244 — signed URL delegates directly to object storage

### FREEDOM (admin-configurable via ES)

- Signed URL expiry duration (default: 15min, range: 5min–60min) — `freedom_media_{tenantId}`
- Max upload file size bytes (default: 100MB, range: 1MB–2GB) — `freedom_media_{tenantId}`
- Allowed MIME types (default: image/jpeg,image/png,image/webp,video/mp4,video/webm) — `freedom_media_{tenantId}`
- Upload session cache TTL multiplier (default: 1.0, range: 1.0–2.0, adds buffer to signed URL expiry) — `freedom_media_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | fileMetadata, progressData, completionData = Dictionary<string,object>; no MediaAsset typed class |
| DNA-2 | BuildSearchFilter | ✅ | GetMediaAssetAsync uses BuildSearchFilter, skips null assetId/status fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 6 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every ES index, Redis key, queue event |
| DNA-6 | DynamicController | ✅ | No MediaController — DynamicController routes /media/* |
| DNA-7 | Trace Context | ✅ | traceparent propagated to all downstream fabric calls |
| DNA-8 | Transactional Outbox | ✅ | MediaUploadCompleted atomic with ES metadata write |

---

## F245 — ITranscodeOrchestrationService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| QUEUE FABRIC | Skill 04 | Redis Streams | `transcode.jobs` consumer group `transcode-workers` | Submit transcode jobs; workers dequeue and process |
| QUEUE FABRIC | Skill 04 | Redis Streams | `transcode.results` consumer group `transcode-result-main` | Receive TranscodeCompleted / TranscodeFailed results |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `transcode-jobs-{tenantId}` | Job state persistence: jobId, assetId, status, formats, attempts, error |
| DATABASE FABRIC | Skill 05 | Redis | `transcode:status:{tenantId}:{jobId}` STRING (TTL 24h) | Hot job status for polling |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var transcodeService = await _factory.CreateAsync<ITranscodeOrchestrationService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "job-submit", "job-track", "result-consume" },
        FabricHint = "queue:redis-streams,database:es+redis"
    });
```

### Methods

1. `SubmitTranscodeJobAsync(tenantId, assetId, transcodeSpec: Dictionary<string,object>) → DataProcessResult<string>` — returns jobId
2. `GetJobStatusAsync(tenantId, jobId) → DataProcessResult<Dictionary<string,object>>` — status + progress from Redis
3. `HandleTranscodeResultAsync(tenantId, jobId, resultData: Dictionary<string,object>) → DataProcessResult<bool>` — called by worker on completion; updates ES, emits TranscodeCompleted
4. `RetryFailedJobAsync(tenantId, jobId) → DataProcessResult<string>` — re-enqueues with backoff increment
5. `CancelJobAsync(tenantId, jobId, reason: string) → DataProcessResult<bool>` — marks cancelled, emits TranscodeCancelled

### Transcode Job State Machine (MACHINE)

```
Pending → Processing → Completed
    │           │
    └─►Failed──►(retry if attempts < maxRetries) ──► PermanentFail
    └─►Cancelled (explicit cancel only)
```

### DISTINCT FROM

- **F246 (IMediaReadyGateService, FLOW-08)**: F245 manages the transcode WORKER pipeline and job lifecycle. F246 is the flow-level WAIT GATE that holds the publish step until F245 signals completion. Different responsibilities: pipeline management vs flow synchronisation.

### MACHINE (non-negotiable)

- TranscodeCompleted / TranscodeFailed events MUST be emitted via transactional outbox (DNA-8)
- Max retry attempts MUST be enforced — permanent failure after configurable limit, NOT infinite retry
- Job submission MUST be idempotent — same assetId+spec within 1h returns existing jobId, not duplicate
- transcode.jobs stream MUST use Dead Letter Queue pattern on PermanentFail — never silently drop

### FREEDOM (admin-configurable via ES)

- Output video formats (default: `["mp4-720p","mp4-1080p","webm-720p"]`, admin adds/removes) — `freedom_media_{tenantId}`
- Transcode max retry attempts (default: 3, range: 1–5) — `freedom_media_{tenantId}`
- Transcode job timeout seconds (default: 300, range: 60–1800) — `freedom_media_{tenantId}`
- Worker concurrency per tenant (default: 2, range: 1–10) — `freedom_media_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | transcodeSpec, resultData = Dictionary<string,object>; no TranscodeJob typed class |
| DNA-2 | BuildSearchFilter | ✅ | GetJobStatusAsync uses BuildSearchFilter for ES fallback query |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every ES index, Redis key, queue consumer group |
| DNA-6 | DynamicController | ✅ | No TranscodeController — DynamicController routes /media/transcode/* |
| DNA-7 | Trace Context | ✅ | traceparent propagated to worker queue events |
| DNA-8 | Transactional Outbox | ✅ | TranscodeCompleted/Failed atomic with ES job state write |

---

## F246 — IMediaReadyGateService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| FLOW ENGINE FABRIC | Skill 09 | IFlowOrchestrator | correlationKey: `media-gate:{tenantId}:{uploadId}` | Register wait state; receive MediaReady signal; resume flow |
| FLOW ENGINE FABRIC | Skill 09 + EP-2 | Durable Timer | EP-2 checkpoint: `media-gate-timeout:{tenantId}:{uploadId}` | Gate timeout enforcement (survives pod restarts) |
| DATABASE FABRIC | Skill 05 | Redis | `gate:media:{tenantId}:{uploadId}` HASH | Gate state: waitingSince, gateStatus, transcodeJobId |
| QUEUE FABRIC | Skill 04 | Redis Streams | `media.ready.signals` consumer group `gate-main` | Receive MediaReady signal from transcode pipeline |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var gateService = await _factory.CreateAsync<IMediaReadyGateService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "wait-state", "gate-resume", "timeout-enforcement" },
        FabricHint = "flow-engine:orchestrator+ep-2,queue:redis-streams,database:redis"
    });
```

### Methods

1. `OpenGateAsync(tenantId, uploadId, gateConfig: Dictionary<string,object>) → DataProcessResult<string>` — registers wait state with IFlowOrchestrator + EP-2 timer; returns gateId
2. `SignalMediaReadyAsync(tenantId, uploadId, mediaData: Dictionary<string,object>) → DataProcessResult<bool>` — called when TranscodeCompleted arrives; resumes flow
3. `SignalMediaFailedAsync(tenantId, uploadId, errorData: Dictionary<string,object>) → DataProcessResult<bool>` — called on TranscodeFailed; triggers gate failure path
4. `GetGateStatusAsync(tenantId, uploadId) → DataProcessResult<Dictionary<string,object>>` — returns gateStatus, waitDurationMs
5. `CloseGateOnTimeoutAsync(tenantId, uploadId) → DataProcessResult<bool>` — called by EP-2 timer; transitions to TIMED_OUT, emits MediaGateTimedOut

### Gate State Machine (MACHINE)

```
OPEN (waiting) ──MediaReady──► RESOLVED (flow resumes)
    │
    ├──TranscodeFailed──► FAILED (flow takes failure path)
    │
    └──EP-2 Timer Fires──► TIMED_OUT (flow takes timeout path)
```

**⚠️ THIS IS THE FIRST WAIT_STATE ARCHETYPE IN XIIGen.** The flow pauses execution at this gate until a MediaReady signal arrives OR the EP-2 timer fires. The IFlowOrchestrator persists the wait state checkpoint in Elasticsearch (Skill 09 pattern). If a pod restarts while the gate is OPEN, EP-2 resumes the timeout countdown from the persisted checkpoint.

### DISTINCT FROM

- **F245 (ITranscodeOrchestrationService, FLOW-08)**: F245 runs the transcode worker pipeline and produces the TranscodeCompleted event. F246 RECEIVES that event and decides whether to resume the publish flow. F246 does NOT know about transcode internals — it only watches for the MediaReady signal.
- **EP-2 (Engine Primitive — Durable Timer)**: EP-2 is the timer mechanism. F246 is the GATE SERVICE that EP-2 arms and that responds when EP-2 fires. F246 registers the gate with EP-2 on OpenGateAsync; EP-2 calls CloseGateOnTimeoutAsync if the signal never arrives.

### MACHINE (non-negotiable)

- Gate wait state MUST be persisted to IFlowOrchestrator (Skill 09) before returning from OpenGateAsync — if the orchestrator persist fails, OpenGateAsync MUST fail (no ghost gates)
- EP-2 timer MUST be registered atomically with gate open — gate without timer = BUILD FAILURE
- Gate timeout is configurable (FREEDOM) but MUST have a ceiling — no unbounded waits
- On TIMED_OUT: flow orchestrator MUST receive the timeout signal within 1 retry attempt — escalate to DLQ if undeliverable
- MediaReady signal MUST carry matching uploadId and tenantId — mismatched signal = discard + log, NEVER resume wrong gate

### FREEDOM (admin-configurable via ES)

- Media gate timeout seconds (default: 600 / 10min, range: 60–3600) — `freedom_media_{tenantId}`
- Gate timeout action: `FAIL_POST` or `PUBLISH_WITHOUT_MEDIA` (default: FAIL_POST) — `freedom_media_{tenantId}`
- MediaReady signal retry window seconds (default: 30, range: 5–120) — `freedom_media_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | gateConfig, mediaData, errorData = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | GetGateStatusAsync skips null fields in ES checkpoint query |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every gate key, orchestrator correlationKey, queue signal |
| DNA-6 | DynamicController | ✅ | No GateController — internal flow service, no HTTP surface |
| DNA-7 | Trace Context | ✅ | traceparent forwarded into orchestrator checkpoint + queue events |
| DNA-8 | Transactional Outbox | ✅ | MediaGateTimedOut + MediaReady flow resume atomic with Redis gate state write |

---

## F247 — IPostPublicationService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| DATABASE FABRIC | Skill 05 | PostgreSQL | `posts_{tenantId}` | Post metadata: postId, authorId, status, mediaAssetIds, content, audienceRule, publishedAt |
| DATABASE FABRIC | Skill 05 | Redis | `cache:post:{tenantId}:{postId}` HASH (TTL configurable) | Hot post cache for read acceleration |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `post-drafts-{tenantId}` | Draft storage (pre-publish): title, body, scheduledAt, mediaRefs |
| QUEUE FABRIC | Skill 04 | Redis Streams | `post.lifecycle.events` consumer group `post-main` | Emit PostPublished, PostDraftCreated, PostDeleted events |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var postService = await _factory.CreateAsync<IPostPublicationService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "draft-create", "publish", "schedule", "delete" },
        FabricHint = "database:pg+redis+es,queue:redis-streams"
    });
```

### Methods

1. `CreateDraftAsync(tenantId, authorId, draftData: Dictionary<string,object>) → DataProcessResult<string>` — returns draftId; stores to ES drafts index
2. `AttachMediaAsync(tenantId, draftId, assetIds: List<string>) → DataProcessResult<bool>` — links assetIds to draft
3. `PublishPostAsync(tenantId, draftId, publishContext: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — CONVERGENCE gate: requires media ready signal; stores to PG posts; emits PostPublished via outbox
4. `SchedulePostAsync(tenantId, draftId, scheduledAt: DateTimeOffset) → DataProcessResult<string>` — registers EP-2 timer for future publish
5. `DeletePostAsync(tenantId, postId, reason: Dictionary<string,object>) → DataProcessResult<bool>` — soft-delete in PG; emits PostDeleted; cache eviction
6. `GetPostAsync(tenantId, postId) → DataProcessResult<Dictionary<string,object>>` — cache-first, PG fallback

### Post Publication State Machine (MACHINE)

```
DRAFT ──attach-media──► MEDIA_PENDING ──MediaReady──► READY_TO_PUBLISH
  │                                                          │
  │──publish-direct (no media)────────────────────────────►─┘
                                                             │
                                                       PUBLISHING
                                                             │
                                            ┌────────────────┘
                                      PUBLISHED ──delete──► DELETED
                                      SCHEDULED ──timer──► PUBLISHING
```

### DISTINCT FROM

- **F208 (ISocialPostService, FLOW-04, cross-flow read)**: F208 handles lesson/educational post types. F247 handles user-generated social posts with media, drafts, and audience rules. Different post types, different schemas, different publish semantics. F209 is a cross-flow READ source for FLOW-07 historical backfill — it does not write social posts.
- **F250 (IFeedEligibilityService, FLOW-08)**: F247 PUBLISHES the post (state: PUBLISHED in PG + event). F250 makes the published post ELIGIBLE in the feed index (ES). Different concerns: post record vs feed candidacy.

### MACHINE (non-negotiable)

- `PublishPostAsync` MUST verify media gate status before publish — PostPublished MUST NOT emit if any attached media is in PENDING/FAILED state (unless FREEDOM allows publish without media)
- PostPublished event MUST use transactional outbox (DNA-8) — atomic with PG post write
- Soft-delete only — physical delete = BUILD FAILURE (audit trail required)
- Scheduled posts MUST use EP-2 timer — cron-based scheduling = BUILD FAILURE

### FREEDOM (admin-configurable via ES)

- Allow publish without media if media fails (default: false) — `freedom_post_{tenantId}`
- Max media attachments per post (default: 10, range: 1–20) — `freedom_post_{tenantId}`
- Draft expiry days (default: 30, range: 7–365) — `freedom_post_{tenantId}`
- Post cache TTL (default: 5min, range: 1min–1h) — `freedom_post_{tenantId}`
- Max scheduled posts per user (default: 25, range: 5–100) — `freedom_post_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | draftData, publishContext, reason = Dictionary<string,object>; no Post typed class |
| DNA-2 | BuildSearchFilter | ✅ | GetPostAsync ES fallback uses BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 6 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every PG query, ES index, Redis key, queue event |
| DNA-6 | DynamicController | ✅ | No PostController — DynamicController routes /posts/* |
| DNA-7 | Trace Context | ✅ | traceparent propagated to all downstream fabric calls |
| DNA-8 | Transactional Outbox | ✅ | PostPublished, PostDeleted atomic with PG state write |

---

## F248 — IMediaCDNService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| DATABASE FABRIC | Skill 05 | Elasticsearch | `media-cdn-{tenantId}` | CDN asset registry: assetId, cdnUrls per format, signedPlaybackToken, cdnStatus, invalidatedAt |
| DATABASE FABRIC | Skill 05 | Redis | `cdn:url:{tenantId}:{assetId}:{format}` STRING (TTL = signedTokenExpiry) | CDN URL cache |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var cdnService = await _factory.CreateAsync<IMediaCDNService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "cdn-register", "url-resolve", "token-generate", "invalidate" },
        FabricHint = "database:es+redis"
    });
```

### Methods

1. `RegisterCDNAssetsAsync(tenantId, assetId, cdnData: Dictionary<string,object>) → DataProcessResult<bool>` — called by transcode worker on completion; stores CDN URLs + formats to ES
2. `GetCDNUrlAsync(tenantId, assetId, format: string) → DataProcessResult<Dictionary<string,object>>` — cache-first (Redis); returns URL + isSignedToken flag
3. `GeneratePlaybackTokenAsync(tenantId, assetId, viewerContext: Dictionary<string,object>) → DataProcessResult<string>` — short-lived signed playback token for private/tenant-restricted video
4. `InvalidateCDNAssetAsync(tenantId, assetId, reason: string) → DataProcessResult<bool>` — marks CDN asset invalidated in ES; cache eviction
5. `ListAssetFormatsAsync(tenantId, assetId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>` — all available formats and their CDN status

### DISTINCT FROM

- **F244 (IMediaUploadService, FLOW-08)**: F244 handles binary upload session (pre-asset). F248 handles CDN delivery of transcoded output (post-asset). F248 is created AFTER F245 completes transcode; F244 is used BEFORE transcoding begins.

### MACHINE (non-negotiable)

- CDN URLs MUST be tenant-scoped — cross-tenant CDN URL serving = BUILD FAILURE
- Signed playback tokens MUST use FREEDOM-configured expiry — no hardcoded expiry values in generated code
- InvalidateCDNAssetAsync MUST cascade to Redis cache eviction — stale cache after invalidation = BUILD FAILURE

### FREEDOM (admin-configurable via ES)

- Signed playback token expiry (default: 1h, range: 5min–24h) — `freedom_media_{tenantId}`
- CDN URL cache TTL (default: 30min, range: 5min–6h) — `freedom_media_{tenantId}`
- Enabled formats subset (default: all transcoded formats) — `freedom_media_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | cdnData, viewerContext = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | ListAssetFormatsAsync skips null format filter |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every ES index + Redis key |
| DNA-6 | DynamicController | ✅ | No CDNController — DynamicController routes /media/cdn/* |
| DNA-7 | Trace Context | ✅ | traceparent propagated to ES + Redis calls |
| DNA-8 | Transactional Outbox | N/A | CDN registration is a read-adjacent write; no domain event emitted |

---

## F249 — IAiMediaTaggingService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| AI ENGINE FABRIC | Skill 07 | IAiProvider via AiDispatcher | model selected by FREEDOM config | Image captioning + object tagging + content classification |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `media-tags-{tenantId}` | AI-generated tags, captions, classification scores per assetId |
| DATABASE FABRIC | Skill 05 | Redis | `cache:tags:{tenantId}:{assetId}` HASH (TTL configurable) | Hot tag cache |
| QUEUE FABRIC | Skill 04 | Redis Streams | `media.tagging.events` consumer group `tagging-main` | Emit MediaTagged, MediaSafetyFlagged events |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var taggingService = await _factory.CreateAsync<IAiMediaTaggingService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "image-caption", "object-detection", "content-classify", "safety-screen" },
        FabricHint = "ai:llm-vision,database:es+redis,queue:redis-streams"
    });
```

### Methods

1. `GenerateCaptionAsync(tenantId, assetId, assetMetadata: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — calls IAiProvider.GenerateAsync() with vision prompt; returns `{ caption, language, confidence }`
2. `ExtractTagsAsync(tenantId, assetId, assetMetadata: Dictionary<string,object>) → DataProcessResult<IEnumerable<Dictionary<string,object>>>` — object detection tags with confidence scores
3. `ClassifyContentSafetyAsync(tenantId, assetId, assetMetadata: Dictionary<string,object>) → DataProcessResult<Dictionary<string,object>>` — returns `{ safetyScore, categories, actionRequired }` — feeds FLOW-13 moderation
4. `StoreTagsAsync(tenantId, assetId, taggingResult: Dictionary<string,object>) → DataProcessResult<bool>` — writes consolidated tagging result to ES + Redis cache
5. `GetTagsAsync(tenantId, assetId) → DataProcessResult<Dictionary<string,object>>` — cache-first retrieval

### AI Tagging Pipeline (MACHINE — execution order fixed)

```
F249.GenerateCaptionAsync → F249.ExtractTagsAsync → F249.ClassifyContentSafetyAsync
                                                             │
                                               safetyScore > threshold?
                                                    YES           NO
                                                    │              │
                                        MediaSafetyFlagged   MediaTagged
                                         → FLOW-13 (queue)   (proceed to publish)
```

**⚠️ FIRST TIME AI ENGINE FABRIC IS IN THE WRITE PATH.** Prior uses (F235 match scoring, F229 synergy) were async background computations. F249 runs in the post-publish pipeline and its safety classification output gates the MediaTagged event — if safety threshold is exceeded, MediaSafetyFlagged is emitted to FLOW-13's moderation queue instead.

### DISTINCT FROM

- **IAiProvider (AI ENGINE FABRIC, Skill 06/07)**: F249 is a PURPOSE-BUILT tagging service resolved through the factory pattern. Service code calls `IAiProvider.GenerateAsync()` through the AI ENGINE FABRIC — never calls a vision model SDK directly.
- **F280 (ISafetyClassifierService, FLOW-13)**: F280 is the full moderation safety classifier used for all content types. F249's ClassifyContentSafetyAsync is a LIGHTWEIGHT preliminary screen during media ingestion — it uses fewer tokens and lower latency. F280 receives the result via MediaSafetyFlagged event and runs the full classification pipeline.

### MACHINE (non-negotiable)

- MUST call IAiProvider.GenerateAsync() — NEVER call vision API SDK directly
- ClassifyContentSafetyAsync MUST run on EVERY media upload — opt-out = BUILD FAILURE
- MediaSafetyFlagged MUST be emitted via transactional outbox (DNA-8) when safety threshold exceeded — atomic with ES tag write
- Tagging runs ASYNC after TranscodeCompleted — does NOT block the MediaReady gate signal (F246 receives MediaReady; tagging enriches the asset in parallel)

### FREEDOM (admin-configurable via ES)

- AI vision model (default: `claude-sonnet-4`, swappable) — `freedom_ai_{tenantId}`
- Caption language (default: `en`, admin sets per tenant) — `freedom_media_{tenantId}`
- Safety classification threshold for flagging (default: 0.75, range: 0.5–0.99) — `freedom_moderation_{tenantId}`
- Tag confidence threshold (default: 0.6, range: 0.3–0.9) — `freedom_media_{tenantId}`
- Max tags per asset (default: 20, range: 5–50) — `freedom_media_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | assetMetadata, taggingResult = Dictionary<string,object>; no MediaTag class |
| DNA-2 | BuildSearchFilter | ✅ | GetTagsAsync ES query uses BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 5 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on every ES index, Redis key, AI prompt context |
| DNA-6 | DynamicController | ✅ | No TaggingController — internal async service, no HTTP surface |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to IAiProvider.GenerateAsync() |
| DNA-8 | Transactional Outbox | ✅ | MediaSafetyFlagged atomic with ES tag write |

---

## F250 — IFeedEligibilityService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| DATABASE FABRIC | Skill 05 | Elasticsearch | `feed-eligible-{tenantId}` | Feed candidacy index: postId, authorId, audienceRule, publishedAt, mediaTypes, tagIds, engagementSeed |
| DATABASE FABRIC | Skill 05 | Redis | `feed:eligible:{tenantId}:{postId}` STRING (TTL 24h) | Hot eligibility flag — fast existence check |
| QUEUE FABRIC | Skill 04 | Redis Streams | `feed.eligibility.events` consumer group `eligibility-main` | Emit FeedEligibilityGranted, FeedEligibilityRevoked |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var feedEligibilityService = await _factory.CreateAsync<IFeedEligibilityService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "eligibility-grant", "eligibility-revoke", "eligibility-query" },
        FabricHint = "database:es+redis,queue:redis-streams"
    });
```

### Methods

1. `GrantEligibilityAsync(tenantId, postId, eligibilityData: Dictionary<string,object>) → DataProcessResult<bool>` — indexes post into `feed-eligible-{tenantId}`; sets Redis flag; emits FeedEligibilityGranted
2. `RevokeEligibilityAsync(tenantId, postId, reason: string) → DataProcessResult<bool>` — removes from ES index; evicts Redis flag; emits FeedEligibilityRevoked (used by FLOW-13 enforcement)
3. `IsPostEligibleAsync(tenantId, postId) → DataProcessResult<bool>` — Redis-first fast check
4. `SearchEligiblePostsAsync(tenantId, filters: Dictionary<string,object>) → DataProcessResult<IEnumerable<Dictionary<string,object>>>` — used by FLOW-09 candidate generation

### DISTINCT FROM

- **F252 (ICandidateGenerationService, FLOW-09)**: F250 WRITES eligibility into the feed index (after publish). F252 READS from the feed index to generate candidates for a specific viewer's feed. Different direction: write/index vs read/query.
- **F173 (IFeedDistributionService, FLOW-05)**: F173 distributes lesson content to feeds. F250 manages social post eligibility — a completely different content category with different audience rules.

### MACHINE (non-negotiable)

- FeedEligibilityGranted MUST use transactional outbox (DNA-8) — atomic with ES eligibility write
- MUST check F249 safety classification status before granting eligibility — if MediaSafetyFlagged is active, eligibility MUST be withheld
- RevokeEligibilityAsync MUST cascade to Redis eviction — stale eligibility flag after revocation = BUILD FAILURE

### FREEDOM (admin-configurable via ES)

- Feed eligibility delay after publish (default: 0s, range: 0s–3600s for anti-spam holds) — `freedom_feed_{tenantId}`
- Eligibility Redis flag TTL (default: 24h, range: 1h–7d) — `freedom_feed_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | eligibilityData, filters = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | SearchEligiblePostsAsync skips empty filter fields |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on ES index name, Redis key prefix, queue events |
| DNA-6 | DynamicController | ✅ | No EligibilityController — internal service, routes via DynamicController |
| DNA-7 | Trace Context | ✅ | traceparent propagated to ES + queue |
| DNA-8 | Transactional Outbox | ✅ | FeedEligibilityGranted/Revoked atomic with ES write |

---

## F251 — INotificationDispatchService

**Family:** 27 (POST + MEDIA PUBLISH PIPELINE)
**Promotion Ladder:** GENERATED

### Fabric Resolution Table

| Fabric | Skill | Provider | Index / Key Pattern | Purpose |
|--------|-------|----------|---------------------|---------| 
| QUEUE FABRIC | Skill 04 | Redis Streams | `notifications.dispatch` consumer group `notif-main` | Fan-out notification events to notification pipeline |
| DATABASE FABRIC | Skill 05 | Redis | `notif:rate:{tenantId}:{userId}` ZSET (TTL 3600s) | Per-user notification rate limit sliding window |
| DATABASE FABRIC | Skill 05 | Elasticsearch | `notification-log-{tenantId}` | Notification dispatch audit log |
| CORE FABRIC | Skill 01 | MicroserviceBase | scope: tenantId isolation | 19 inherited components |

### Factory Creation

```csharp
var notifService = await _factory.CreateAsync<INotificationDispatchService>(
    new FactoryResolutionContext {
        TenantId = scope.TenantId,
        Capabilities = new[] { "fanout", "rate-limit", "dedup", "audit" },
        FabricHint = "queue:redis-streams,database:redis+es"
    });
```

### Methods

1. `DispatchPostPublishedAsync(tenantId, postId, authorId, audienceContext: Dictionary<string,object>) → DataProcessResult<int>` — enqueues notification events to `notifications.dispatch` stream; returns recipient count estimate
2. `CheckNotificationRateLimitAsync(tenantId, userId) → DataProcessResult<bool>` — Redis ZSET sliding window; returns false if over limit
3. `DeduplicateNotificationAsync(tenantId, recipientId, notificationKey: string) → DataProcessResult<bool>` — prevents duplicate notifications for same event
4. `LogDispatchAsync(tenantId, dispatchData: Dictionary<string,object>) → DataProcessResult<bool>` — appends to ES audit log

### DISTINCT FROM

- **F265 (IEngagementNotifyService, FLOW-10)**: F265 dispatches engagement-specific notifications (ReactionAdded, CommentAdded). F251 dispatches post publication fan-out notifications — different trigger event, different recipient audience (followers vs commenters).
- **F233 (ICooperatorNotificationService, FLOW-06)**: F233 sends marketplace cooperation notifications. F251 sends social content notifications. Different domain, different delivery channels, different rate limit contexts.

### MACHINE (non-negotiable)

- MUST check CheckNotificationRateLimitAsync per recipient BEFORE enqueuing — bypassing rate limit = BUILD FAILURE
- PostPublished fan-out MUST use QUEUE FABRIC — direct HTTP calls to notification service = BUILD FAILURE
- Deduplication MUST run on every notification — same postId+recipientId within 1h = discard, log only

### FREEDOM (admin-configurable via ES)

- Notification rate limit per user per hour (default: 50, range: 10–200) — `freedom_notification_{tenantId}`
- Notification dedup window seconds (default: 3600, range: 300–86400) — `freedom_notification_{tenantId}`
- PostPublished fanout max recipients per batch (default: 1000, range: 100–5000) — `freedom_notification_{tenantId}`

### DNA Compliance Matrix

| DNA | Pattern | Applied | How |
|-----|---------|---------|-----|
| DNA-1 | ParseDocument | ✅ | audienceContext, dispatchData = Dictionary<string,object> |
| DNA-2 | BuildSearchFilter | ✅ | LogDispatchAsync ES audit query uses BuildSearchFilter |
| DNA-3 | DataProcessResult<T> | ✅ | All 4 methods return DataProcessResult<T> |
| DNA-4 | MicroserviceBase | ✅ | Inherits MicroserviceBase (19 components) |
| DNA-5 | Scope Isolation | ✅ | tenantId on queue stream keys, Redis rate limit keys, ES log index |
| DNA-6 | DynamicController | ✅ | No NotificationController — queue-only service |
| DNA-7 | Trace Context | ✅ | traceparent forwarded to queue events |
| DNA-8 | Transactional Outbox | N/A | Notification dispatch is already the outbox consumer — it IS the relay |

---

## FAMILY 27 — DESIGN RECORDS

### DR-21 — Async Media Wait Gate via FLOW ENGINE FABRIC

**Decision**: Media publish pipeline MUST pause at a WAIT_STATE gate (F246) until TranscodeCompleted arrives, using EP-2 Durable Timer for timeout enforcement rather than polling.

**Context**: Media upload (F244) → transcode (F245) is an async worker pipeline. The post cannot be published until at least one transcoded format is ready. A polling approach (F247 checking F245 status every 5s) would couple F247 to transcode pipeline timing and create wasted fabric calls on every poll.

**Rationale**: The FLOW ENGINE FABRIC (Skill 09 IFlowOrchestrator) already supports durable wait states via checkpoint persistence in Elasticsearch. EP-2 Durable Timer (introduced in FLOW-06) provides the timeout guarantee. Using these existing engine primitives avoids new infrastructure and keeps the wait state visible to flow observability tooling.

**Alternatives rejected**:
- Polling loop in F247: creates N fabric calls per upload; does not survive pod restarts; couples post publication to transcode latency
- Callback webhook from transcode worker: requires F247 to expose HTTP; violates "no direct HTTP between services" rule
- Synchronous transcode (blocking): unacceptable for video assets that can take minutes

**Impact**: F246 is the first WAIT_STATE service in the engine. The IFlowOrchestrator checkpoint format now requires a `waitType: "MediaReady"` node type in the flow DAG.

---

### DR-22 — AI Tagging in the Write Path (F249 Async Parallel Track)

**Decision**: F249 AI media tagging runs on a PARALLEL ASYNC TRACK after TranscodeCompleted — it does NOT block the MediaReady signal to F246 and does NOT gate post publication.

**Context**: AI captioning and safety classification take 1–5 seconds per asset depending on model. If F249 ran synchronously before F246 received MediaReady, every post with media would have 1–5s of AI latency added to the visible publish time.

**Rationale**: Safety classification results (MediaSafetyFlagged vs MediaTagged) arrive asynchronously. F250 (IFeedEligibilityService) checks the safety flag before granting feed eligibility. This means:
- Post is PUBLISHED (status in PG) once media is ready
- Post enters feed ELIGIBILITY only after tags are complete AND safety check passes
- The window between published and feed-eligible is < 5s under normal conditions; auto-moderation handles edge cases

**Safety guarantee**: A post is never visible in any user's feed (F250 eligibility check blocks) until F249's ClassifyContentSafetyAsync completes. The only window where published ≠ eligible is during the tagging async track.

**Alternatives rejected**:
- Block publication on tagging: adds AI latency to every post publish; poor UX for image posts
- No tagging in pipeline: removes the auto-safety screen; forces FLOW-13 to handle ALL content retrospectively

**Impact**: F250.GrantEligibilityAsync MUST check AI tagging status (safety clear) before indexing. CF-65 codifies the conflict rule: MediaSafetyFlagged and FeedEligibilityGranted MUST NOT both be active for the same assetId.

---

## FABRIC RESOLUTION SUMMARY — Family 27

| Factory | Database Fabric | Queue Fabric | AI Fabric | Flow Engine |
|---------|----------------|--------------|-----------|-------------|
| F244 IMediaUploadService | ES + Redis | Redis Streams ✅ | — | — |
| F245 ITranscodeOrchestrationService | ES + Redis | Redis Streams ✅ | — | — |
| F246 IMediaReadyGateService | Redis | Redis Streams ✅ | — | IFlowOrchestrator + EP-2 ✅ |
| F247 IPostPublicationService | PG + Redis + ES | Redis Streams ✅ | — | EP-2 (scheduled posts) |
| F248 IMediaCDNService | ES + Redis | — | — | — |
| F249 IAiMediaTaggingService | ES + Redis | Redis Streams ✅ | IAiProvider ✅ | — |
| F250 IFeedEligibilityService | ES + Redis | Redis Streams ✅ | — | — |
| F251 INotificationDispatchService | Redis + ES | Redis Streams ✅ | — | — |

---

## DNA-8 (Transactional Outbox) Applicability — Family 27

| Factory | DNA-8 Applicable? | Evidence |
|---------|-------------------|----------|
| F244 IMediaUploadService | ✅ YES | MediaUploadCompleted must be atomic with ES metadata write |
| F245 ITranscodeOrchestrationService | ✅ YES | TranscodeCompleted/Failed must be atomic with ES job state write |
| F246 IMediaReadyGateService | ✅ YES | MediaGateTimedOut must be atomic with Redis gate state transition |
| F247 IPostPublicationService | ✅ YES | PostPublished/PostDeleted must be atomic with PG post state write |
| F248 IMediaCDNService | N/A | CDN registration is read-adjacent write; no domain event published |
| F249 IAiMediaTaggingService | ✅ YES | MediaSafetyFlagged must be atomic with ES tag write |
| F250 IFeedEligibilityService | ✅ YES | FeedEligibilityGranted/Revoked must be atomic with ES eligibility write |
| F251 INotificationDispatchService | N/A | Is the outbox consumer/relay — does not produce domain events requiring outbox |

**DNA-8 compliance: 6/6 applicable PASS, 2 N/A**

---

## Integration Changelog (FLOW-08)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-08 Post+Media Publish merge | F244-F251 (+8) | T83-T86 (+4) | CF-64-CF-69 (+6) | Family 27, Template 18, DR-21-DR-22 |

---

## System State Update (Post Family 27 / FLOW-08)

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F243 | F1-F251 | +8 |
| Factory families | 26 | 27 | +1 |
| Task types | T1-T82 | T1-T86 | +4 |
| BFA conflict rules | CF-1-CF-63 | CF-1-CF-69 | +6 |
| Stress tests | ST-1-ST-30 | ST-1-ST-34 | +4 |
| Design records | DR-1-DR-20 | DR-1-DR-22 | +2 |
| Skill patterns | SK-1-SK-28 | SK-1-SK-30 | +2 |
| Flow templates | 1-17 | 1-18 | +1 |

```
FACTORIES (continuous, no gaps):
  F1-F243   [Families 1-26]
  F244-F251 [Family 27 — FLOW-08 Post + Media Publish] ← NEW
  Next: F252

TASK TYPES (continuous, no gaps):
  T1-T82  [FLOW-01 through FLOW-07]
  T83-T86 [FLOW-08 Post + Media Publish] ← NEW
  Next: T87
```

---

## SAVE POINT: MERGE:P1_FLOW08 ✅
## Next: Phase 2 — T83-T86 Task Types + AF Map + Flow Template 18
## Recovery: "Start FLOW-08 Phase 2" → generate FLOW08_P2_TASK_TYPES.md
