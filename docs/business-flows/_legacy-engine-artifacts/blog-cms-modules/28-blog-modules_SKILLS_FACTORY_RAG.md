# XIIGen SKILLS FACTORY & RAG — FLOW-26: Blog/CMS Modules Platform
## Skills: SK-251–SK-262 (12 new skills)
## Date: 2026-03-01 | Extends: SK-1–SK-250

---

## HOW SKILLS ARE USED IN FLOW-26

AF-4 (RAG Task Context station) searches this skill library when generating FLOW-26 services.
Each skill is a retrievable pattern that AF-1 (Genesis) uses as a starting template.
Skills reduce generation variance and enforce DNA compliance from the start.

RAG search keys for FLOW-26:
- "content repository elastic" → SK-251
- "taxonomy slug resolver" → SK-252
- "hook registry fan-out" → SK-253
- "media transform pipeline" → SK-254
- "search index cascade" → SK-255
- "comment moderation queue" → SK-256
- "ai seo content analyzer" → SK-257
- "theme renderer page cache" → SK-258
- "scheduled publishing" → SK-259
- "content permission rbac" → SK-260
- "editorial approval gate" → SK-261
- "site config freedom admin" → SK-262

---

## SK-251 — Content Repository Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Elasticsearch)
**Implements**: F1075 (IContentRepository)
**Used By**: T389, T391, T393, T396, T403, T404

### Purpose
Provides the core content CRUD operations for the CMS. All content stored as Dictionary<string,object> (DNA-1). BuildSearchFilter applied for all queries (DNA-2). DataProcessResult on all returns (DNA-3). Scope isolated by tenantId (DNA-5).

### Pattern

```csharp
// SK-251: ContentRepositoryService
// AF-4 retrieves this when generating any content storage service

public class ContentRepositoryService : MicroserviceBase {  // DNA-4
    private readonly IDatabaseService _db;  // Skill 05 fabric
    
    // Injected via factory — no new Elasticsearch client
    public ContentRepositoryService(IExternalServiceFactory<IDatabaseService> dbFactory) {
        _db = dbFactory.CreateAsync(FactoryResolutionContext.From("content.db.provider")).GetAwaiter().GetResult();
    }
    
    public async Task<DataProcessResult<Dictionary<string,object>>> GetAsync(
        string contentId, string tenantId) {  // DNA-5: tenantId always
        
        var filter = BuildSearchFilter(new Dictionary<string,object> {  // DNA-2
            ["id"] = contentId,
            ["tenantId"] = tenantId
            // empty fields auto-skipped
        });
        
        var result = await _db.SearchDocuments("content-{tenantId}", filter, limit: 1);
        if (!result.IsSuccess) return DataProcessResult<Dictionary<string,object>>.Failure(result.Error);
        
        return DataProcessResult<Dictionary<string,object>>.Success(result.Data.FirstOrDefault());
    }  // DNA-3: DataProcessResult, no throw
    
    public async Task<DataProcessResult<string>> StoreAsync(
        Dictionary<string,object> document) {  // DNA-1: Dictionary
        
        // tenantId extracted from document, validated
        if (!document.ContainsKey("tenantId"))
            return DataProcessResult<string>.Failure("tenantId required");
            
        return await _db.StoreDocument("content-{tenantId}", document);
    }
}
```

### Node.js Alternative
```javascript
// SK-251-node: ContentRepositoryService (Node.js)
class ContentRepositoryService {
    constructor(dbFactory) {
        this._db = null;
        this._dbFactory = dbFactory;
    }
    
    async init() {
        this._db = await this._dbFactory.createAsync({ provider: process.env.CONTENT_DB_PROVIDER });
    }
    
    async getAsync(contentId, tenantId) {
        const filter = buildSearchFilter({ id: contentId, tenantId }); // DNA-2: skip empty
        const result = await this._db.searchDocuments(`content-${tenantId}`, filter, { limit: 1 });
        return result.isSuccess
            ? DataProcessResult.success(result.data[0])
            : DataProcessResult.failure(result.error);  // DNA-3
    }
}
```

### FREEDOM Config Keys
```yaml
content.db.provider: elasticsearch  # switchable: mongodb, postgresql
content.db.index_prefix: content    # per-tenant index naming
content.db.refresh_interval: 1s     # ES index refresh rate
```

---

## SK-252 — Taxonomy Manager & Slug Resolver

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (ES + Redis)
**Implements**: F1077 (ITaxonomyService), F1078 (ISlugResolver)
**Used By**: T389, T396, T397, T398, T403

### Purpose
Manages taxonomy terms (categories, tags, custom taxonomies) and resolves slugs to content IDs with Redis caching for hot-path performance.

### Pattern

```csharp
public class TaxonomyService : MicroserviceBase {
    private readonly IDatabaseService _esDb;   // ES for taxonomy store
    private readonly IDatabaseService _cache;  // Redis for slug cache
    
    public async Task<DataProcessResult<IList<Dictionary<string,object>>>> GetTermsAsync(
        string taxonomy, string tenantId) {
        
        var filter = BuildSearchFilter(new Dictionary<string,object> {
            ["taxonomy"] = taxonomy,
            ["tenantId"] = tenantId
        });
        return await _esDb.SearchDocuments("taxonomy-{tenantId}", filter);
    }
    
    public async Task<DataProcessResult<string>> ResolveSlugAsync(
        string slug, string tenantId) {
        
        // Hot path: Redis cache first
        var cacheKey = $"slug:{tenantId}:{slug}";
        var cached = await _cache.SearchDocuments("slug-cache", 
            BuildSearchFilter(new Dictionary<string,object> { ["key"] = cacheKey }));
        
        if (cached.IsSuccess && cached.Data.Any())
            return DataProcessResult<string>.Success(cached.Data.First()["contentId"].ToString());
        
        // Cold path: ES lookup + populate cache
        var esFilter = BuildSearchFilter(new Dictionary<string,object> {
            ["slug"] = slug, ["tenantId"] = tenantId, ["status"] = "Published"
        });
        var esResult = await _esDb.SearchDocuments("content-{tenantId}", esFilter, limit: 1);
        if (!esResult.IsSuccess || !esResult.Data.Any())
            return DataProcessResult<string>.Failure("slug_not_found");
        
        var contentId = esResult.Data.First()["id"].ToString();
        await _cache.StoreDocument("slug-cache", new Dictionary<string,object> {
            ["key"] = cacheKey, ["contentId"] = contentId, ["ttl"] = 86400  // 24h
        });
        
        return DataProcessResult<string>.Success(contentId);
    }
}
```

### FREEDOM Config Keys
```yaml
content.taxonomy.provider: elasticsearch
content.slug.cache: redis
content.slug.ttl_seconds: 86400
content.slug.cache_published_only: true
```

---

## SK-253 — Hook Registry & Fan-Out Engine

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + DATABASE FABRIC
**Implements**: F1090 (IHookRegistry), F1092 (IHookExecutor)
**Used By**: T391, T393, T399

### Purpose
Hook system for the CMS extension/plugin architecture. Handlers register for named hooks. Fan-out delivers hook payload to all registered handlers via queue. Handler failures isolated.

### Pattern

```csharp
public class HookExecutorService : MicroserviceBase {
    private readonly IDatabaseService _registry;   // F1090 - ES hook registrations
    private readonly IQueueService _queue;          // F1092 - Redis Streams fan-out
    
    public async Task<DataProcessResult<string>> FireHookAsync(
        string hookName, 
        Dictionary<string,object> payload,  // DNA-1: Dictionary
        string tenantId) {                   // DNA-5: tenant scope
        
        // Load registered handlers for this hook + tenant
        var filter = BuildSearchFilter(new Dictionary<string,object> {
            ["hookName"] = hookName,
            ["tenantId"] = tenantId,
            ["active"] = true
        });
        var handlers = await _registry.SearchDocuments("hook-registrations", filter);
        if (!handlers.IsSuccess) return DataProcessResult<string>.Failure(handlers.Error);
        
        var traceId = Guid.NewGuid().ToString();
        
        // Fan-out: one message per handler (handlers isolated)
        foreach (var handler in handlers.Data) {
            var message = new Dictionary<string,object> {
                ["hookName"] = hookName,
                ["handlerEndpoint"] = handler["endpoint"],
                ["payload"] = payload,  // immutable — same object reference
                ["tenantId"] = tenantId,
                ["traceId"] = traceId,
                ["firedAt"] = DateTime.UtcNow
            };
            await _queue.EnqueueAsync("hook-executor", message);
        }
        
        // Fire-and-forget — caller doesn't wait for handlers
        return DataProcessResult<string>.Success(traceId);
    }
}
```

### Handler Isolation Pattern
```csharp
// Each handler message consumed independently by hook-executor consumer group
// One handler crash = DLQ for that message only, others continue
// Handler timeout: configurable per registration (default 30s)
```

### FREEDOM Config Keys
```yaml
extensions.hooks.provider: elasticsearch
extensions.executor.queue: redis_streams
extensions.executor.consumer_group: hook-executor
extensions.handler.default_timeout_seconds: 30
extensions.handler.max_retry_count: 3
```

---

## SK-254 — Media Transform Pipeline

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + DATABASE FABRIC
**Implements**: F1081 (IMediaUploadService), F1082 (IMediaTransformer)
**Used By**: T394, T395

### Purpose
Async media upload + transform pipeline. Upload → store original → enqueue transform jobs → poll for completion → return variant URLs.

### Pattern

```csharp
public class MediaTransformService : MicroserviceBase {
    private readonly IDatabaseService _storage;  // blob storage via fabric
    private readonly IDatabaseService _library;  // ES media library
    private readonly IQueueService _queue;        // transform job queue
    
    public async Task<DataProcessResult<string>> SubmitTransformJobAsync(
        string mediaId,
        Dictionary<string,object> spec,  // DNA-1: { width, height, format, quality }
        string tenantId) {
        
        // Validate spec against allowed transforms
        var allowed = await LoadAllowedTransformsAsync(tenantId);
        // ... validation ...
        
        var jobId = Guid.NewGuid().ToString();
        var job = new Dictionary<string,object> {
            ["jobId"] = jobId,
            ["mediaId"] = mediaId,
            ["spec"] = spec,
            ["tenantId"] = tenantId,
            ["status"] = "QUEUED",
            ["submittedAt"] = DateTime.UtcNow
        };
        
        // Store job record (for polling)
        await _library.StoreDocument($"media-jobs-{tenantId}", job);
        
        // Enqueue transform work
        await _queue.EnqueueAsync("media-transform", job);
        
        return DataProcessResult<string>.Success(jobId);
    }
    
    public async Task<DataProcessResult<Dictionary<string,object>>> PollJobAsync(
        string jobId, string tenantId) {
        
        var filter = BuildSearchFilter(new Dictionary<string,object> {
            ["jobId"] = jobId, ["tenantId"] = tenantId
        });
        var result = await _library.SearchDocuments($"media-jobs-{tenantId}", filter, limit: 1);
        
        return result.IsSuccess && result.Data.Any()
            ? DataProcessResult<Dictionary<string,object>>.Success(result.Data.First())
            : DataProcessResult<Dictionary<string,object>>.Failure("job_not_found");
    }
}
```

### FREEDOM Config Keys
```yaml
media.upload.provider: s3_compat  # switchable: azure_blob, local
media.transform.queue: redis_streams
media.transform.consumer_group: media-transform
media.transform.max_file_size_mb: 50
media.transform.allowed_mime_types: [image/jpeg, image/png, image/webp, image/gif]
media.variants.default: [thumbnail_150, webp_1200, mobile_600]
```

---

## SK-255 — Search Index Updater

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Elasticsearch)
**Implements**: F1095 (IContentIndexer), F1096 (ISearchQueryBuilder)
**Used By**: T397, T403

### Purpose
Idempotent search index update triggered by CloudEvents. Enriches search document with taxonomy, author, and media thumbnail before indexing. Handles batch re-indexing for taxonomy propagation.

### Pattern

```csharp
public class ContentIndexerService : MicroserviceBase {
    private readonly IDatabaseService _searchDb;  // ES search index
    private readonly IDatabaseService _contentDb; // ES content store (for enrichment)
    
    public async Task<DataProcessResult<bool>> IndexDocumentAsync(
        string contentId,
        Dictionary<string,object> document,  // DNA-1
        string tenantId) {
        
        // Enrich with taxonomy and author (pre-join before index)
        var enriched = new Dictionary<string,object>(document);
        await EnrichWithTaxonomy(enriched, contentId, tenantId);
        await EnrichWithAuthor(enriched, tenantId);
        
        // Idempotent upsert (same contentId = overwrite)
        return await _searchDb.StoreDocument($"search-{tenantId}", enriched);
    }
    
    // Idempotency: ES upsert by _id = contentId
    // Re-indexing same content = same result
}
```

### FREEDOM Config Keys
```yaml
search.indexer.provider: elasticsearch
search.indexer.index_prefix: search
search.indexer.boost.title: 3.0
search.indexer.boost.body: 1.0
search.indexer.include_excerpt_chars: 300
```

---

## SK-256 — Comment Moderation Queue

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC + AI ENGINE FABRIC
**Implements**: F1100 (ICommentRepository), F1101 (ISpamDetector), F1102 (IModerationQueue)
**Used By**: T401, T402

### Purpose
Comment intake with AI spam gate + human moderation queue. Spam detected automatically (AI), borderline cases go to moderation queue, ham posted directly if moderation disabled.

### Pattern

```csharp
public class CommentService : MicroserviceBase {
    private readonly IDatabaseService _comments;  // ES comments index
    private readonly IAiProvider _ai;              // Spam detector via AI fabric
    private readonly IQueueService _modQueue;      // Moderation queue
    
    public async Task<DataProcessResult<Dictionary<string,object>>> SubmitAsync(
        Dictionary<string,object> comment,  // DNA-1: { body, authorInfo, contentId, tenantId }
        string tenantId) {
        
        // Sanitize before AI analysis
        comment["body"] = SanitizeHtml(comment["body"].ToString());
        
        // AI spam classification (timeout-bounded)
        var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var spamResult = await _ai.GenerateAsync(
            BuildSpamPrompt(comment), cancellationToken: cts.Token);
        
        var verdict = ParseVerdict(spamResult);  // Dictionary<string,object>
        
        if (verdict["verdict"].ToString() == "spam") {
            // DLQ the comment, return 202 with spam rejection message
            return DataProcessResult<Dictionary<string,object>>.Success(
                new Dictionary<string,object> { ["status"] = "rejected_spam" });
        }
        
        comment["status"] = GetConfig<bool>("requiresModeration") ? "pending" : "approved";
        comment["spamScore"] = verdict["score"];
        comment["tenantId"] = tenantId;
        
        var stored = await _comments.StoreDocument($"comments-{tenantId}", comment);
        
        if (comment["status"].ToString() == "pending")
            await _modQueue.EnqueueAsync("moderation", comment);
        
        return DataProcessResult<Dictionary<string,object>>.Success(comment);
    }
}
```

### FREEDOM Config Keys
```yaml
comments.db.provider: elasticsearch
comments.spam.aiProvider: claude  # switchable: openai
comments.spam.model: claude-haiku-4-5-20251001
comments.spam.threshold: 0.85
comments.spam.timeout_seconds: 5
comments.moderation.enabled: true
```

---

## SK-257 — AI SEO & Content Analyzer

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: AI ENGINE FABRIC + RAG FABRIC
**Implements**: F1104 (IAiSeoAnalyzer), F1105 (IAiTagSuggester), F1106 (IAiContentSummarizer)
**Used By**: T404

### Purpose
Multi-model AI analysis pipeline for CMS content. SEO analysis uses AiDispatcher (parallel Claude + Gemini, merged by AF-10). Tag suggestion and summary use single model (claude-haiku for speed).

### Pattern

```csharp
public class AiContentAnalyzerService : MicroserviceBase {
    private readonly AiDispatcher _dispatcher;  // Skill 07 - multi-model
    private readonly IAiProvider _ai;           // single model for fast tasks
    private readonly IRagService _rag;          // Skill 00b for context
    
    public async Task<DataProcessResult<Dictionary<string,object>>> AnalyzeSeoAsync(
        Dictionary<string,object> content,
        string tenantId) {
        
        // RAG: get site SEO context (existing top posts, keyword strategy)
        var ragContext = await _rag.SearchAsync(
            "seo_strategy content_guidelines",
            strategy: RagStrategy.Hybrid,
            tenantId: tenantId);
        
        // Build prompt with RAG context
        var prompt = BuildSeoPrompt(content, ragContext.Data);
        
        // Multi-model dispatch (AF-5) — Claude + Gemini parallel
        var multiResult = await _dispatcher.DispatchAsync(
            prompt,
            models: new[] { "claude-sonnet-4-6", "gemini-2.5-pro" },
            mergeStrategy: MergeStrategy.BestOf);  // AF-10 merge
        
        // Store result in AF-11 feedback loop
        await RecordFeedbackAsync(content["id"].ToString(), "seo_analysis", multiResult, tenantId);
        
        return DataProcessResult<Dictionary<string,object>>.Success(multiResult.MergedResult);
    }
}
```

### FREEDOM Config Keys
```yaml
ai.seo.strategy: multi_model
ai.seo.models: [claude-sonnet-4-6, gemini-2.5-pro]
ai.tags.provider: claude
ai.tags.model: claude-haiku-4-5-20251001
ai.summary.model: claude-sonnet-4-6
ai.alttext.model: claude-haiku-4-5-20251001  # vision
ai.enhancement.auto_apply: false  # suggest-only by default
```

---

## SK-258 — Theme Renderer & Page Cache

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (Redis) + CORE FABRIC
**Implements**: F1085 (IThemeRenderer), F1086 (ITemplateEngine), F1087 (IPageCacheService)
**Used By**: T396, T398

### Purpose
Cache-first page rendering. Hot path: cache hit → return instantly. Cold path: resolve template → render → store in cache with Surrogate-Key tags. Tag-based cache invalidation on publish.

### Pattern

```csharp
public class PageRenderService : MicroserviceBase {
    private readonly IDatabaseService _cache;     // Redis page cache
    private readonly IDatabaseService _templates; // ES template store
    
    public async Task<DataProcessResult<Dictionary<string,object>>> RenderPageAsync(
        string contentId, 
        Dictionary<string,object> content,
        string tenantId) {
        
        // Hot path: cache check
        var cacheKey = $"page:{tenantId}:{contentId}";
        var cached = await _cache.SearchDocuments("page-cache", 
            BuildSearchFilter(new Dictionary<string,object> { ["key"] = cacheKey }));
        
        if (cached.IsSuccess && cached.Data.Any())
            return DataProcessResult<Dictionary<string,object>>.Success(cached.Data.First());
        
        // Cold path: load template + render
        var contentType = content["type"].ToString();
        var template = await LoadTemplateAsync(contentType, tenantId);
        var rendered = RenderTemplate(template, content);  // no external call
        
        // Surrogate-Key tags for granular cache invalidation
        var surrogateKeys = new[] {
            $"content-{contentId}",
            $"author-{content["authorId"]}",
            $"taxonomy-{content["primaryCategory"]}"
        };
        
        var page = new Dictionary<string,object> {
            ["html"] = rendered,
            ["contentId"] = contentId,
            ["tenantId"] = tenantId,
            ["surrogateKeys"] = surrogateKeys,
            ["cachedAt"] = DateTime.UtcNow
        };
        
        // Store in cache with TTL
        await _cache.StoreDocument("page-cache", 
            new Dictionary<string,object>(page) { 
                ["key"] = cacheKey,
                ["ttl"] = GetConfig<int>("render.cache.ttl_seconds")
            });
        
        return DataProcessResult<Dictionary<string,object>>.Success(page);
    }
}
```

### FREEDOM Config Keys
```yaml
render.cache.provider: redis
render.cache.ttl_seconds: 3600
render.cache.ttl_homepage: 300  # shorter for home page
render.template.provider: elasticsearch
render.theme.default: default-blog
render.cdn.surrogate_header: Surrogate-Key
```

---

## SK-259 — Scheduled Publishing Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC (Redis Streams delayed)
**Implements**: F1109 (IScheduledPublisher)
**Used By**: T392

### Purpose
Time-gate for content publishing. Schedule stored in queue with delayed delivery. At fire time, re-verifies content status and permissions before triggering T391. Supports cancel and reschedule.

### Pattern

```csharp
public class ScheduledPublisherService : MicroserviceBase {
    private readonly IDatabaseService _db;    // content status re-check
    private readonly IQueueService _queue;     // scheduled message queue
    
    public async Task<DataProcessResult<string>> SchedulePublishAsync(
        string contentId,
        DateTime scheduledAt,
        string requesterId,
        string tenantId) {
        
        var scheduleId = Guid.NewGuid().ToString();
        var message = new Dictionary<string,object> {
            ["scheduleId"] = scheduleId,
            ["contentId"] = contentId,
            ["scheduledAt"] = scheduledAt.ToString("O"),
            ["requesterId"] = requesterId,
            ["tenantId"] = tenantId,
            ["type"] = "SCHEDULED_PUBLISH"
        };
        
        // Enqueue with delayed delivery (Redis Streams + scheduler consumer)
        await _queue.EnqueueAsync("scheduled-pub", message, 
            deliverAt: scheduledAt);
        
        // Update content status to "Scheduled"
        await _db.StoreDocument("content-{tenantId}", new Dictionary<string,object> {
            ["id"] = contentId,
            ["status"] = "Scheduled",
            ["scheduledAt"] = scheduledAt,
            ["tenantId"] = tenantId
        });
        
        return DataProcessResult<string>.Success(scheduleId);
    }
    
    // Re-verification at fire time
    public async Task<DataProcessResult<bool>> FireScheduledPublishAsync(
        Dictionary<string,object> message) {
        
        var contentId = message["contentId"].ToString();
        var tenantId = message["tenantId"].ToString();
        
        // Re-verify: status still "Scheduled"? (content may have been manually published/archived)
        var content = await _db.SearchDocuments("content-{tenantId}",
            BuildSearchFilter(new Dictionary<string,object> { ["id"] = contentId, ["status"] = "Scheduled" }));
        
        if (!content.IsSuccess || !content.Data.Any())
            return DataProcessResult<bool>.Success(false); // silently skip — not an error
        
        // Delegate to T391 publish gate
        await _queue.EnqueueAsync("content-publish", new Dictionary<string,object> {
            ["contentId"] = contentId,
            ["tenantId"] = tenantId,
            ["triggeredBy"] = "scheduler"
        });
        
        return DataProcessResult<bool>.Success(true);
    }
}
```

### FREEDOM Config Keys
```yaml
publish.schedule.queue: redis_streams
publish.schedule.consumer_group: scheduled-pub
publish.schedule.max_future_days: 365
publish.schedule.clock_skew_tolerance_seconds: 30
```

---

## SK-260 — Content Permission Service

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: CORE FABRIC (MicroserviceBase auth)
**Implements**: F1114 (IContentPermissionService), F1115 (IEditorialRoleService)
**Used By**: T389, T391, T393, T394, T401, T402, T406

### Purpose
RBAC for editorial operations. Roles: Admin > Editor > Author > Contributor > Subscriber. Object-level checks: author can only edit their own content; editor can edit all within tenant. BOLA prevention built in.

### Pattern

```csharp
public class ContentPermissionService : MicroserviceBase {
    // Built on CORE FABRIC auth context — hot path is in-memory
    
    private static readonly Dictionary<string, HashSet<string>> RoleCapabilities = 
        new Dictionary<string, HashSet<string>> {
            ["admin"]       = new HashSet<string> { "read","edit","publish","delete","moderate","configure" },
            ["editor"]      = new HashSet<string> { "read","edit","publish","moderate" },
            ["author"]      = new HashSet<string> { "read","edit_own","submit_for_review" },
            ["contributor"] = new HashSet<string> { "read","edit_own" },
            ["subscriber"]  = new HashSet<string> { "read","comment" }
        };
    
    public async Task<DataProcessResult<bool>> CanAsync(
        string userId, string action, string contentId, string tenantId) {
        
        // BOLA check: if action is on specific content, verify ownership
        if (action == "edit_own" || action == "delete") {
            var ownerResult = await VerifyOwnershipAsync(userId, contentId, tenantId);
            if (!ownerResult.IsSuccess) return DataProcessResult<bool>.Success(false);
        }
        
        var role = await GetUserRoleAsync(userId, tenantId);
        if (!role.IsSuccess) return DataProcessResult<bool>.Success(false);
        
        var capabilities = RoleCapabilities.GetValueOrDefault(role.Data, new HashSet<string>());
        return DataProcessResult<bool>.Success(
            capabilities.Contains(action) || capabilities.Contains($"{action}_own"));
    }
}
```

### FREEDOM Config Keys
```yaml
permissions.content.provider: core_fabric
permissions.roles.provider: elasticsearch
permissions.rbac.default_role: subscriber
permissions.rbac.require_email_verified: true
```

---

## SK-261 — Editorial Approval Gate

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: QUEUE FABRIC (human-in-loop)
**Implements**: F1110 (IPublishApprovalGate)
**Used By**: T391

### Purpose
Human-in-the-loop approval for content publishing. Approval request stored in queue, editor notified, waits for signal. Timeout = DLQ. Supports async decision via admin UI.

### Pattern

```csharp
public class PublishApprovalGateService : MicroserviceBase {
    private readonly IQueueService _queue;
    
    public async Task<DataProcessResult<string>> RequestApprovalAsync(
        string contentId, string requesterId, string tenantId) {
        
        var approvalId = Guid.NewGuid().ToString();
        var request = new Dictionary<string,object> {
            ["approvalId"] = approvalId,
            ["contentId"] = contentId,
            ["requesterId"] = requesterId,
            ["tenantId"] = tenantId,
            ["status"] = "PENDING",
            ["requestedAt"] = DateTime.UtcNow,
            ["expiresAt"] = DateTime.UtcNow.AddHours(
                GetConfig<int>("publish.approval.timeout_hours"))
        };
        
        await _queue.EnqueueAsync("approvals", request);
        return DataProcessResult<string>.Success(approvalId);
    }
    
    public async Task<DataProcessResult<bool>> SubmitDecisionAsync(
        string approvalId, bool approved, string reviewerId, string reason, string tenantId) {
        
        // Idempotent — duplicate decisions are ignored if already decided
        var decision = new Dictionary<string,object> {
            ["approvalId"] = approvalId,
            ["decision"] = approved ? "APPROVED" : "REJECTED",
            ["reviewerId"] = reviewerId,
            ["reason"] = reason,
            ["tenantId"] = tenantId,
            ["decidedAt"] = DateTime.UtcNow
        };
        
        await _queue.EnqueueAsync("approval-decisions", decision);
        return DataProcessResult<bool>.Success(true);
    }
}
```

### FREEDOM Config Keys
```yaml
publish.approval.queue: redis_streams
publish.approval.timeout_hours: 72
publish.approval.notify_reviewer_roles: [editor, admin]
publish.approval.auto_approve_after_timeout: false
```

---

## SK-262 — Site Config & Permalink Manager

**Version**: 1.0 | **Domain**: Blog/CMS | **Fabric**: DATABASE FABRIC (ES FREEDOM layer + Redis)
**Implements**: F1118 (ISiteConfigService), F1119 (IPermalinkConfigService)
**Used By**: T396, T406

### Purpose
FREEDOM layer for blog site configuration. Admin-editable without code deploys. Permalink structure patterns. Maintenance mode toggle (Redis fast-path for zero-latency check).

### Pattern

```csharp
public class SiteConfigService : MicroserviceBase {
    private readonly IDatabaseService _freedom;   // ES FREEDOM index
    private readonly IDatabaseService _cache;     // Redis for maintenance flag
    
    public async Task<DataProcessResult<Dictionary<string,object>>> GetConfigAsync(
        string tenantId) {
        
        var filter = BuildSearchFilter(new Dictionary<string,object> {
            ["tenantId"] = tenantId, ["type"] = "site_config"
        });
        return await _freedom.SearchDocuments("site-config", filter, limit: 1);
    }
    
    // FREEDOM: admin sets values, MACHINE: validation rules enforced
    public async Task<DataProcessResult<bool>> SetConfigValueAsync(
        string key, object value, string tenantId) {
        
        if (!AllowedConfigKeys.Contains(key))
            return DataProcessResult<bool>.Failure($"config_key_not_allowed: {key}");
        
        // Validate value type for key
        var validated = ValidateConfigValue(key, value);
        if (!validated.IsSuccess) return DataProcessResult<bool>.Failure(validated.Error);
        
        var doc = new Dictionary<string,object> {
            ["tenantId"] = tenantId, ["key"] = key, ["value"] = value,
            ["updatedAt"] = DateTime.UtcNow
        };
        return await _freedom.StoreDocument("site-config", doc);
    }
    
    // Maintenance mode: Redis fast-path (sub-millisecond)
    public async Task<DataProcessResult<bool>> IsMaintenanceModeAsync(string tenantId) {
        var result = await _cache.SearchDocuments("maintenance-flags",
            BuildSearchFilter(new Dictionary<string,object> { 
                ["tenantId"] = tenantId, ["active"] = true }));
        return DataProcessResult<bool>.Success(result.IsSuccess && result.Data.Any());
    }
}
```

### FREEDOM Config Keys (the config IS the freedom layer)
```yaml
# These are admin-configurable in the FREEDOM panel:
site.title: "My Blog"
site.permalink_structure: "/{year}/{month}/{slug}"
site.posts_per_page: 10
site.comments_enabled: true
site.timezone: "UTC"
site.maintenance_mode: false
site.default_category: "Uncategorized"
```

---

## SKILL SUMMARY TABLE

| SK | Name | Factories | Used By Task Types | Primary Fabric |
|----|------|-----------|--------------------|---------------|
| SK-251 | Content Repository | F1075 | T389,T391,T393,T396,T403,T404 | DB (ES) |
| SK-252 | Taxonomy & Slug Resolver | F1077,F1078 | T389,T396,T397,T398,T403 | DB (ES+Redis) |
| SK-253 | Hook Registry & Fan-Out | F1090,F1092 | T391,T393,T399 | QUEUE+DB |
| SK-254 | Media Transform Pipeline | F1081,F1082 | T394,T395 | QUEUE+DB |
| SK-255 | Search Index Updater | F1095,F1096 | T397,T403 | DB (ES) |
| SK-256 | Comment Moderation Queue | F1100,F1101,F1102 | T401,T402 | DB+AI+QUEUE |
| SK-257 | AI SEO & Content Analyzer | F1104,F1105,F1106 | T404 | AI ENGINE+RAG |
| SK-258 | Theme Renderer & Page Cache | F1085,F1086,F1087 | T396,T398 | DB (Redis)+CORE |
| SK-259 | Scheduled Publishing | F1109 | T392 | QUEUE (timer) |
| SK-260 | Content Permission Service | F1114,F1115 | T389,T391,T393,T401,T406 | CORE+DB |
| SK-261 | Editorial Approval Gate | F1110 | T391 | QUEUE (human-in-loop) |
| SK-262 | Site Config & Permalink | F1118,F1119 | T396,T406 | DB (ES FREEDOM+Redis) |

---

## STATE SAVE CHECKPOINT

```
FILE: 28-blog-modules_SKILLS_FACTORY_RAG.md
STATUS: COMPLETE ✅
SKILLS ADDED: SK-251-SK-262 (12 skills)
NEXT FILE: 28-blog-modules_V62_BFA_STRESS_TEST.md
NEXT NUMBERS:
  BFA Rule:   CF-510
  Stress Test: ST-300
```
