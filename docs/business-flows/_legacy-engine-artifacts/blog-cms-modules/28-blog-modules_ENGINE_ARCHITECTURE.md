# XIIGen ENGINE ARCHITECTURE — FLOW-26: Blog/CMS Modules Platform
## Date: 2026-03-01 | Extends: Post-FLOW-25 State
## Factories: F1075–F1121 | Families: 154–163 | 47 factories, 10 families

---

## EXTENSION CONTEXT

FLOW-26 adds a Blog/CMS Modules Platform to the XIIGen engine. It generates services
for 14 CMS domains (Content Model, Editor, Taxonomy, IAM, Routing, Rendering,
Extensions, Media, Comments, Search, Workflow, API, Config, Infra) through 10 new
factory families. All services extend MicroserviceBase. All factories resolve through
existing fabric interfaces. No new fabrics are introduced.

---

## FACTORY REGISTRY EXTENSION — FLOW-26

### FAMILY 154 — Content Management Core
**Domain**: Core content entity persistence, revision tracking, taxonomy, slug resolution, publishing events
**Fabric Zone**: DATABASE FABRIC (Skill 05) + QUEUE FABRIC (Skill 04)

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1075 | IContentRepository | DATABASE FABRIC → Elasticsearch | ES 8 (blog index) | content.db.provider |
| F1076 | IRevisionService | DATABASE FABRIC → PostgreSQL | PG (JSONB columns) | content.revision.provider |
| F1077 | ITaxonomyService | DATABASE FABRIC → Elasticsearch | ES 8 (taxonomy index) | content.taxonomy.provider |
| F1078 | ISlugResolver | DATABASE FABRIC → Redis | Redis (slug:→contentId cache) | content.slug.cache |
| F1079 | IContentPublisher | QUEUE FABRIC → Redis Streams | consumer group: content-publish | content.publish.queue |

**Factory Contract (F1075 — IContentRepository)**
```csharp
// Resolved via IExternalServiceFactory<IContentRepository>.CreateAsync(ctx)
// NEVER imported directly. DNA-1: returns Dictionary<string,object>

interface IContentRepository {
    Task<DataProcessResult<Dictionary<string,object>>> GetAsync(string contentId, string tenantId);
    Task<DataProcessResult<IList<Dictionary<string,object>>>> SearchAsync(ContentFilter filter);
    Task<DataProcessResult<string>> StoreAsync(Dictionary<string,object> document);
    Task<DataProcessResult<bool>> DeleteAsync(string contentId, string tenantId);
}
// filter built via BuildSearchFilter — empty fields auto-skipped (DNA-2)
// all methods return DataProcessResult<T> — never throw (DNA-3)
```

**Factory Contract (F1079 — IContentPublisher)**
```csharp
interface IContentPublisher {
    Task<DataProcessResult<string>> EnqueuePublishAsync(string contentId, string tenantId, PublishOptions opts);
    Task<DataProcessResult<PublishStatus>> PollStatusAsync(string traceId, string tenantId);
    Task<DataProcessResult<bool>> AcknowledgeAsync(string messageId);
}
// Routes through IQueueService — never Redis client directly
```

---

### FAMILY 155 — Editor & Media Services
**Domain**: Rich text editor sessions, media upload, transformation jobs, media library
**Fabric Zone**: DATABASE FABRIC (Redis for sessions, blob for storage) + QUEUE FABRIC

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1080 | IEditorSessionService | DATABASE FABRIC → Redis | Redis (draft autosave TTL) | editor.session.provider |
| F1081 | IMediaUploadService | DATABASE FABRIC → Redis + blob | Redis job tracking + S3-compat | media.upload.provider |
| F1082 | IMediaTransformer | QUEUE FABRIC → Redis Streams | consumer group: media-transform | media.transform.queue |
| F1083 | IMediaLibraryService | DATABASE FABRIC → Elasticsearch | ES 8 (media index) | media.library.provider |
| F1084 | IMediaVariantService | DATABASE FABRIC → PostgreSQL | PG (variant records) | media.variant.provider |

**Factory Contract (F1082 — IMediaTransformer)**
```csharp
// Async job via queue — never blocks the request thread
interface IMediaTransformer {
    Task<DataProcessResult<string>> SubmitTransformJobAsync(string mediaId, TransformSpec spec, string tenantId);
    Task<DataProcessResult<TransformJobStatus>> PollJobAsync(string jobId, string tenantId);
    Task<DataProcessResult<IList<string>>> GetVariantUrlsAsync(string mediaId, string tenantId);
}
// TransformSpec = Dictionary<string,object> (DNA-1)
// Routes through IQueueService (Skill 04)
```

---

### FAMILY 156 — Rendering & Theming
**Domain**: Server-side/hybrid page rendering, theme templates, page cache, route resolution, layout composition
**Fabric Zone**: DATABASE FABRIC (Redis cache, ES templates) + CORE FABRIC (MicroserviceBase)

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1085 | IThemeRenderer | CORE FABRIC → MicroserviceBase | Built-in template engine | render.theme.provider |
| F1086 | ITemplateEngine | DATABASE FABRIC → Elasticsearch + Redis | ES (templates) + Redis (compiled cache) | render.template.provider |
| F1087 | IPageCacheService | DATABASE FABRIC → Redis | Redis (page fragment cache) | render.cache.provider |
| F1088 | IRouteResolver | DATABASE FABRIC → Redis + Elasticsearch | Redis (slug→route map) + ES fallback | routing.resolver.provider |
| F1089 | ILayoutComposer | CORE FABRIC → MicroserviceBase | Built-in layout engine | render.layout.provider |

**Factory Contract (F1087 — IPageCacheService)**
```csharp
interface IPageCacheService {
    Task<DataProcessResult<Dictionary<string,object>>> GetCachedPageAsync(string cacheKey, string tenantId);
    Task<DataProcessResult<bool>> SetCachedPageAsync(string cacheKey, Dictionary<string,object> page, TimeSpan ttl, string tenantId);
    Task<DataProcessResult<int>> InvalidateByTagAsync(IList<string> tags, string tenantId);
    Task<DataProcessResult<int>> InvalidateByPatternAsync(string pattern, string tenantId);
}
// tenantId on EVERY call — scope isolation (DNA-5)
```

---

### FAMILY 157 — Extension System (Hooks & Plugins)
**Domain**: Plugin lifecycle, hook registration, hook execution fan-out, webhook dispatch, execution sandboxing
**Fabric Zone**: QUEUE FABRIC (Redis Streams fan-out) + DATABASE FABRIC (ES plugin registry)

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1090 | IHookRegistry | DATABASE FABRIC → Elasticsearch | ES 8 (hook-registrations index) | extensions.hooks.provider |
| F1091 | IPluginLoader | DATABASE FABRIC → Elasticsearch | ES 8 (plugin-catalog index) | extensions.plugins.provider |
| F1092 | IHookExecutor | QUEUE FABRIC → Redis Streams | consumer group: hook-executor, fan-out pattern | extensions.executor.queue |
| F1093 | IWebhookDispatcher | QUEUE FABRIC → Redis Streams | consumer group: webhook-dispatch | extensions.webhooks.queue |
| F1094 | IExtensionSandbox | CORE FABRIC → MicroserviceBase | Isolation wrapper | extensions.sandbox.provider |

**Factory Contract (F1092 — IHookExecutor)**
```csharp
// Fan-out: one hook event → N registered handlers via queue
interface IHookExecutor {
    Task<DataProcessResult<string>> FireHookAsync(string hookName, Dictionary<string,object> payload, string tenantId);
    Task<DataProcessResult<IList<HookResult>>> PollHookResultsAsync(string traceId, string tenantId);
    Task<DataProcessResult<bool>> RegisterHandlerAsync(string hookName, string handlerEndpoint, string tenantId);
}
// HookResult = Dictionary<string,object> (DNA-1)
// Routes through IQueueService — never direct Redis pub/sub
```

---

### FAMILY 158 — Search & Indexing
**Domain**: Content indexing, query building, cache invalidation on publish, sitemap, related content via RAG
**Fabric Zone**: DATABASE FABRIC (Elasticsearch) + QUEUE FABRIC + RAG FABRIC

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1095 | IContentIndexer | DATABASE FABRIC → Elasticsearch | ES 8 (content-search index) | search.indexer.provider |
| F1096 | ISearchQueryBuilder | DATABASE FABRIC → Elasticsearch | ES 8 query DSL | search.query.provider |
| F1097 | ICacheInvalidator | DATABASE FABRIC → Redis | Redis (invalidate by tag/pattern) | search.cache.invalidator |
| F1098 | ISitemapGenerator | QUEUE FABRIC → Redis Streams | consumer group: sitemap-gen | search.sitemap.queue |
| F1099 | IRelatedContentFinder | RAG FABRIC → Vector strategy | Hybrid (ES + vector) | search.related.strategy |

**Factory Contract (F1095 — IContentIndexer)**
```csharp
interface IContentIndexer {
    Task<DataProcessResult<bool>> IndexDocumentAsync(string contentId, Dictionary<string,object> document, string tenantId);
    Task<DataProcessResult<bool>> DeleteFromIndexAsync(string contentId, string tenantId);
    Task<DataProcessResult<bool>> ReindexTenantAsync(string tenantId);
}
// Uses IDatabaseService.StoreDocument under the hood — never esClient directly
// BuildSearchFilter applied: empty fields skipped (DNA-2)
```

---

### FAMILY 159 — Comments & Moderation
**Domain**: Comment persistence, AI spam detection, moderation queue, comment notifications
**Fabric Zone**: DATABASE FABRIC + QUEUE FABRIC + AI ENGINE FABRIC

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1100 | ICommentRepository | DATABASE FABRIC → Elasticsearch | ES 8 (comments index) | comments.db.provider |
| F1101 | ISpamDetector | AI ENGINE FABRIC → IAiProvider | Claude (spam classification) | comments.spam.aiProvider |
| F1102 | IModerationQueue | QUEUE FABRIC → Redis Streams | consumer group: moderation | comments.moderation.queue |
| F1103 | ICommentNotifier | QUEUE FABRIC → Redis Streams | consumer group: comment-notify | comments.notify.queue |

**Factory Contract (F1101 — ISpamDetector)**
```csharp
// Routes through IAiProvider.GenerateAsync() — never openai.chat() or anthropic.messages()
interface ISpamDetector {
    Task<DataProcessResult<Dictionary<string,object>>> AnalyzeAsync(Dictionary<string,object> comment, string tenantId);
    // Returns: { score: 0.0-1.0, verdict: "spam"|"ham"|"review", reasoning: "..." }
}
// AI provider resolved via IExternalServiceFactory<IAiProvider>.CreateAsync(ctx)
// Model config key: comments.spam.model (default: claude-haiku)
```

---

### FAMILY 160 — AI Content Enhancement
**Domain**: AI-powered SEO analysis, tag suggestion, content summarization, image alt text, related post ranking
**Fabric Zone**: AI ENGINE FABRIC (Skill 07 AiDispatcher) + RAG FABRIC (Skill 00b)

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1104 | IAiSeoAnalyzer | AI ENGINE FABRIC + RAG FABRIC | AiDispatcher → Claude/Gemini parallel | ai.seo.strategy |
| F1105 | IAiTagSuggester | AI ENGINE FABRIC → IAiProvider | Claude-haiku (fast suggestions) | ai.tags.provider |
| F1106 | IAiContentSummarizer | AI ENGINE FABRIC → IAiProvider | Claude-sonnet | ai.summary.provider |
| F1107 | IAiImageAltTextGenerator | AI ENGINE FABRIC → IAiProvider | Claude-haiku (vision) | ai.alttext.provider |
| F1108 | IAiRelatedPostsRanker | RAG FABRIC → Hybrid strategy | ES vector + keyword hybrid | ai.related.strategy |

**Factory Contract (F1104 — IAiSeoAnalyzer)**
```csharp
// Multi-model parallel via AiDispatcher (Skill 07)
interface IAiSeoAnalyzer {
    Task<DataProcessResult<Dictionary<string,object>>> AnalyzeAsync(
        Dictionary<string,object> content,
        Dictionary<string,object> ragContext,
        string tenantId);
    // Returns: { title_suggestions, meta_description, keyword_density, readability_score, improvement_hints }
}
// ragContext retrieved via IRagService.SearchAsync() — RAG FABRIC
// Multi-model results merged via AF-10 (Merge station)
```

---

### FAMILY 161 — Publishing Pipeline
**Domain**: Scheduled publishing, editorial approval gate, publish event emission, RSS/Atom feeds, canonical URLs
**Fabric Zone**: QUEUE FABRIC (Redis Streams, human-in-loop) + DATABASE FABRIC

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1109 | IScheduledPublisher | QUEUE FABRIC → Redis Streams | consumer group: scheduled-pub, timer-based | publish.schedule.queue |
| F1110 | IPublishApprovalGate | QUEUE FABRIC → Redis Streams | consumer group: approvals, human-in-loop signal | publish.approval.queue |
| F1111 | IPublishEventEmitter | QUEUE FABRIC → Redis Streams | consumer group: publish-events (CloudEvents envelope) | publish.events.queue |
| F1112 | IFeedGenerator | DATABASE FABRIC → Elasticsearch | ES 8 query + RSS/Atom serialization | publish.feed.provider |
| F1113 | ICanonicalUrlService | DATABASE FABRIC → Redis | Redis (contentId→canonical URL map) | publish.canonical.cache |

**Factory Contract (F1110 — IPublishApprovalGate)**
```csharp
// Human-in-loop: emits event → waits for APPROVAL or REJECT signal
interface IPublishApprovalGate {
    Task<DataProcessResult<string>> RequestApprovalAsync(string contentId, string requesterId, string tenantId);
    Task<DataProcessResult<ApprovalDecision>> WaitForDecisionAsync(string approvalId, TimeSpan timeout, string tenantId);
    Task<DataProcessResult<bool>> SubmitDecisionAsync(string approvalId, bool approved, string reviewerId, string reason, string tenantId);
}
// ApprovalDecision = Dictionary<string,object> (DNA-1)
// If timeout → DLQ with APPROVAL_TIMEOUT status
```

---

### FAMILY 162 — Users, Roles & Content Permissions
**Domain**: Content-level permission checks, editorial roles (Admin/Editor/Author/Subscriber), author profiles, ownership
**Fabric Zone**: CORE FABRIC (MicroserviceBase auth context) + DATABASE FABRIC

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1114 | IContentPermissionService | CORE FABRIC → MicroserviceBase auth | Built-in RBAC via auth context | permissions.content.provider |
| F1115 | IEditorialRoleService | DATABASE FABRIC → Elasticsearch | ES 8 (editorial-roles index) | permissions.roles.provider |
| F1116 | IAuthorProfileService | DATABASE FABRIC → Elasticsearch | ES 8 (author-profiles index) | permissions.authors.provider |
| F1117 | IContentOwnershipService | DATABASE FABRIC → PostgreSQL | PG (ownership + RBAC join table) | permissions.ownership.provider |

**Factory Contract (F1114 — IContentPermissionService)**
```csharp
interface IContentPermissionService {
    Task<DataProcessResult<bool>> CanAsync(string userId, string action, string contentId, string tenantId);
    // action: "read"|"edit"|"publish"|"delete"|"moderate"
    Task<DataProcessResult<Dictionary<string,object>>> GetUserCapabilitiesAsync(string userId, string tenantId);
}
// Built on CORE FABRIC auth context — no direct DB for hot path
// Falls back to IEditorialRoleService (F1115) for role lookup
```

---

### FAMILY 163 — Config & Admin
**Domain**: Site-wide config (FREEDOM layer), permalink structure, plugin config, maintenance mode
**Fabric Zone**: DATABASE FABRIC (Elasticsearch FREEDOM layer + Redis for fast-path)

| Factory ID | Interface | Fabric Resolution | Provider Default | Config Key |
|------------|-----------|-------------------|-----------------|------------|
| F1118 | ISiteConfigService | DATABASE FABRIC → Elasticsearch | ES 8 (site-config FREEDOM index) | admin.siteconfig.provider |
| F1119 | IPermalinkConfigService | DATABASE FABRIC → Redis | Redis (permalink pattern cache) | admin.permalink.provider |
| F1120 | IPluginConfigService | DATABASE FABRIC → Elasticsearch | ES 8 (plugin-config index) | admin.pluginconfig.provider |
| F1121 | IMaintenanceModeService | DATABASE FABRIC → Redis | Redis (maintenance flag, instant toggle) | admin.maintenance.provider |

**Factory Contract (F1118 — ISiteConfigService)**
```csharp
// FREEDOM layer: admin-configurable values without code changes
interface ISiteConfigService {
    Task<DataProcessResult<Dictionary<string,object>>> GetConfigAsync(string tenantId);
    Task<DataProcessResult<bool>> SetConfigValueAsync(string key, object value, string tenantId);
    Task<DataProcessResult<bool>> ValidateConfigAsync(Dictionary<string,object> config, string tenantId);
}
// Config stored as ES documents — admin edits via FREEDOM panel, never code deploys
// MACHINE: validation rules, allowed keys. FREEDOM: values, toggles.
```

---

## FABRIC RESOLUTION SUMMARY TABLE

| Family | Primary Fabric | Secondary Fabric | Pattern |
|--------|---------------|-----------------|---------|
| 154 Content Core | DATABASE (ES) | QUEUE (Redis Streams) | Store+Event |
| 155 Editor & Media | DATABASE (Redis+blob) | QUEUE (async jobs) | Session+Transform |
| 156 Rendering | DATABASE (Redis cache) | CORE (MicroserviceBase) | Cache+Render |
| 157 Extensions | QUEUE (fan-out) | DATABASE (ES registry) | Fan-out+Registry |
| 158 Search | DATABASE (ES) | RAG (vector) | Index+RAG |
| 159 Comments | DATABASE (ES) | AI ENGINE + QUEUE | AI+Queue |
| 160 AI Enhancement | AI ENGINE (AiDispatcher) | RAG (hybrid) | MultiModel+RAG |
| 161 Publishing | QUEUE (human-in-loop) | DATABASE (ES+Redis) | Approval+Event |
| 162 Permissions | CORE (auth context) | DATABASE (ES) | RBAC+DB |
| 163 Config/Admin | DATABASE (ES FREEDOM) | DATABASE (Redis fast-path) | FREEDOM+Cache |

---

## DNA COMPLIANCE ENFORCEMENT

ALL generated services for FLOW-26 must pass:

| DNA Pattern | FLOW-26 Enforcement |
|-------------|---------------------|
| DNA-1: ParseDocument | All content = Dictionary<string,object>. No Post, Page, Comment typed models. |
| DNA-2: BuildQueryFilters | ContentFilter, TaxonomyFilter, CommentFilter — all skip empty fields. |
| DNA-3: DataProcessResult<T> | No exceptions thrown for business logic across all 47 factories. |
| DNA-4: MicroserviceBase | All 10 service classes extend MicroserviceBase (19 components). |
| DNA-5: Scope Isolation | tenantId required on EVERY method of EVERY factory. |
| DNA-6: DynamicController | No IContentController, ICommentController. Single DynamicController routes all. |

---

## BACKWARD COMPATIBILITY

| Artifact | Range | Status |
|----------|-------|--------|
| Existing factories | F1–F1074 | UNCHANGED ✅ |
| Existing task types | T1–T388 | UNCHANGED ✅ |
| Existing families | 1–153 | UNCHANGED ✅ |
| Existing skills | SK-1–SK-250 | UNCHANGED ✅ |
| Existing BFA rules | CF-1–CF-509 | UNCHANGED ✅ |

---

## GENIE DNA APPLIED EXAMPLE

```
// ENGINE GENERATES THIS — service code never imports specific providers

public class ContentPublishingService : MicroserviceBase {  // DNA-4
    private readonly IContentRepository _content;  // F1075 via factory
    private readonly IContentPublisher _publisher;  // F1079 via factory
    private readonly IHookExecutor _hooks;          // F1092 via factory
    private readonly IContentIndexer _indexer;      // F1095 via factory
    
    // Injected via IExternalServiceFactory<T>.CreateAsync() at startup
    
    public async Task<DataProcessResult<string>> PublishAsync(  // DNA-3
        string contentId,
        string tenantId) {  // DNA-5 — tenantId always present
        
        // DNA-1 — Dictionary, never typed model
        var filter = BuildSearchFilter(new Dictionary<string,object> {  // DNA-2
            ["contentId"] = contentId,
            ["tenantId"] = tenantId
            // empty fields auto-skipped
        });
        
        var content = await _content.GetAsync(contentId, tenantId);
        if (!content.IsSuccess) return DataProcessResult<string>.Failure(content.Error);
        
        // Fire onBeforePublish hooks via queue fan-out (not direct call)
        await _hooks.FireHookAsync("onBeforePublish", content.Data, tenantId);
        
        var publishResult = await _publisher.EnqueuePublishAsync(contentId, tenantId, opts);
        // ... cascade: index, cache invalidate, sitemap — all through fabrics
        
        return DataProcessResult<string>.Success(publishResult.Data);
    }
}
```

---

## STATE SAVE CHECKPOINT

```
FILE: 28-blog-modules_ENGINE_ARCHITECTURE.md
STATUS: COMPLETE ✅
FACTORIES ADDED: F1075-F1121 (47 factories)
FAMILIES ADDED: 154-163 (10 families)
NEXT FILE: 28-blog-modules_TASK_TYPES_CATALOG.md
NEXT NUMBERS:
  Task Type: T389
  BFA Rule:  CF-510
  Skill:     SK-251
  Template:  83
```
