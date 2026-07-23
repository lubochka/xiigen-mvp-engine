/**
 * FLOW-28 Engine Contracts — Blog/CMS Modules Platform
 *
 * T423  ContentLifecycleOrchestrator    ORCHESTRATION    Family-165
 * T424  DraftAutosaveLoop               STATE_MACHINE    Family-165
 * T425  ContentPublishGate              GUARD            Family-165
 * T426  ScheduledPublishTimerGate       ORCHESTRATION    Family-166
 * T427  ContentArchiveUnpublishFlow     PROCESSING       Family-166
 * T428  MediaUploadTransformPipeline    PROCESSING       Family-167
 * T429  MediaVariantRequestGate         GUARD            Family-167
 * T430  PublicPageRequestPipeline       PROCESSING       Family-168
 * T431  SearchIndexCascade              DATA_PIPELINE    Family-168
 * T432  CacheInvalidationCascade        PROCESSING       Family-168
 * T433  HookFanOutExecutor              ORCHESTRATION    Family-169
 * T434  WebhookDispatchGate             GUARD            Family-169
 * T435  CommentSubmissionSpamGate       GUARD            Family-170
 * T436  CommentModerationQueueGate      PROCESSING       Family-170
 * T437  TaxonomyTermPropagation         DATA_PIPELINE    Family-171
 * T438  AiContentEnhancementGate        AI_GENERATION_LOOP  Family-171
 * T439  SitemapRebuildTrigger           ORCHESTRATION    Family-172
 * T440  MultiTenantContentScopeEnforcer STATE_MACHINE    Family-172
 *
 * Namespace: F1129–F1175 (factories), T423–T440 (task types)
 * Named checks: t440_scope_enforcer_step_one, extension_sandbox_no_network_no_env,
 *               ssrf_check_on_every_webhook_retry, xss_sanitization_before_storage,
 *               spam_detector_budget_precheck, cache_first_read_pattern,
 *               published_only_search_index
 *
 * CF-590: T440 MUST be step[0] in ALL FLOW-28 DAG templates.
 * CF-577: XSS sanitize before store.
 * DD-280 / CF-586: SSRF check on every webhook retry with skipCache:true.
 *
 * DNA-1: All toDict() produce Record<string, unknown>.
 * DNA-3: All service methods return DataProcessResult.
 * DNA-8: storeDocument() before enqueue().
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── Shared quality gates ───────────────────────────────────────────────────

const FLOW28_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-01',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-03',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-04',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
];

const FLOW28_IRON_RULES_CORE = [
  'NEVER import Elasticsearch/DB client directly — use IDatabaseService via DATABASE FABRIC',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() BEFORE enqueue() — outbox pattern (DNA-8)',
];

// ── T423 — ContentLifecycleOrchestrator ───────────────────────────────────

/**
 * T423 — ContentLifecycleOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Orchestrates the full content lifecycle: draft → review → publish → archive.
 *          T440 MUST be step[0] in every DAG template (CF-590).
 *          Outbox ordering: content record stored before ContentCreated emitted.
 */
export function createT423Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T423',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'ContentLifecycleOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by content.lifecycle.requested CloudEvent',
    purpose:
      'Orchestrate multi-step content lifecycle: validate author permissions, store content record, progress through draft → review → publish → archive states. T440 scope enforcer runs first (CF-590). Outbox: store before emit.',
    distinctFrom:
      'T424 (draft autosave — T423 orchestrates the lifecycle, T424 manages draft state transitions)',
    familyId: 'Family-165',

    factoryDependencies: [
      {
        factoryId: 'F1129',
        interfaceName: 'IContentStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Store and retrieve content records with lifecycle status tracking',
      },
      {
        factoryId: 'F1130',
        interfaceName: 'IContentLifecycleQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for content lifecycle events',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-01',
        description: 'T440 MUST be step[0] in ALL FLOW-28 DAG templates (CF-590)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-02',
        description: 'storeDocument() before ContentCreated emit (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['content', 'content_lifecycle'],
      events: ['content.lifecycle.requested', 'content.created', 'content.lifecycle.failed'],
      apiRoutes: ['/api/dynamic/content'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'T440 MUST be step[0] in ALL FLOW-28 DAG templates (CF-590)',
      'Content record MUST be stored in DATABASE FABRIC before ContentCreated is enqueued (DNA-8)',
    ],

    machineComponents: [
      'T440 scope enforcer as first step in DAG (CF-590)',
      'Lifecycle state machine: DRAFT → REVIEW → PUBLISHED → ARCHIVED',
      'Outbox ordering: store before emit (DNA-8)',
      'Author permission validation gate',
    ],

    freedomComponents: [
      'Max content items per author per month (FREEDOM config key: flow28_max_content_per_author)',
      'Default content visibility (public/private)',
      'Allowed content categories',
    ],
  });
}

// ── T424 — DraftAutosaveLoop ───────────────────────────────────────────────

/**
 * T424 — DraftAutosaveLoop [STATE_MACHINE].
 *
 * PURPOSE: Manages continuous autosave of draft content.
 *          Idempotent by (contentId, revisionId).
 *          Draft revisions stored before AutosaveTick emitted.
 */
export function createT424Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T424',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'DraftAutosaveLoop',
    archetype: ContractArchetype.STATE_MACHINE,
    version: '1.0.0',
    entry: 'Triggered by draft.autosave.tick CloudEvent',
    purpose:
      'Continuously autosave draft content revisions. Idempotent by (contentId, revisionId) — duplicate tick returns existing revision. Revision stored before AutosaveTick emitted. Autosave interval from FREEDOM config.',
    distinctFrom: 'T423 (lifecycle orchestrator — T424 handles draft-state autosave only)',
    familyId: 'Family-165',

    factoryDependencies: [
      {
        factoryId: 'F1131',
        interfaceName: 'IDraftRevisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Store and retrieve draft content revisions with idempotency',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-03',
        description: 'Idempotent by (contentId, revisionId) — no duplicate revisions',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['draft_revision'],
      events: ['draft.autosave.tick', 'draft.revision.stored', 'draft.autosave.failed'],
      apiRoutes: ['/api/dynamic/draft-revisions'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Duplicate (contentId, revisionId) MUST return existing revision — SETNX pattern',
      'Autosave interval from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'setIfAbsent idempotency key: (contentId, revisionId)',
      'Persist-before-emit: revision stored before AutosaveTick emitted (DNA-8)',
    ],

    freedomComponents: [
      'Autosave interval seconds (FREEDOM config key: flow28_autosave_interval_seconds)',
      'Max revisions per content item',
    ],
  });
}

// ── T425 — ContentPublishGate ──────────────────────────────────────────────

/**
 * T425 — ContentPublishGate [GUARD].
 *
 * PURPOSE: Hard-stop gate validating content is ready for publication.
 *          Thresholds from FREEDOM config — never hardcoded.
 *          Returns failure if content fails quality/moderation checks.
 */
export function createT425Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T425',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'ContentPublishGate',
    archetype: ContractArchetype.GUARD,
    version: '1.0.0',
    entry: 'Triggered by content.publish.requested CloudEvent',
    purpose:
      'Validate content ready for publication: check moderation approval, content quality score, author eligibility. All thresholds from FREEDOM config. Returns DataProcessResult.failure on any check failure — never throws.',
    distinctFrom: 'T423 (lifecycle orchestrator — T425 is the publish-specific guard gate only)',
    familyId: 'Family-165',

    factoryDependencies: [
      {
        factoryId: 'F1132',
        interfaceName: 'IContentPublishValidator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Validate content eligibility for publication with threshold checks',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-04',
        description: 'All publish thresholds from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['content_publish_gate'],
      events: ['content.publish.requested', 'content.publish.approved', 'content.publish.rejected'],
      apiRoutes: ['/api/dynamic/content-publish'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'All publish thresholds from FREEDOM config — never hardcoded',
      'Gate returns DataProcessResult.failure — never throws',
    ],

    machineComponents: [
      'Moderation approval check ordering gate',
      'Content quality score threshold check',
    ],

    freedomComponents: [
      'Minimum quality score (FREEDOM config key: flow28_min_publish_quality_score)',
      'Moderation approval required flag',
    ],
  });
}

// ── T426 — ScheduledPublishTimerGate ──────────────────────────────────────

/**
 * T426 — ScheduledPublishTimerGate [ORCHESTRATION].
 *
 * PURPOSE: Orchestrates time-triggered content publication.
 *          Scheduled publish time from content record — never hardcoded.
 *          Idempotent by contentId.
 */
export function createT426Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T426',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'ScheduledPublishTimerGate',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by scheduled.publish.timer CloudEvent',
    purpose:
      'Time-triggered publication: read scheduled_publish_at from content record, validate time has passed, trigger ContentPublishGate. Idempotent by contentId — duplicate timer fires return existing published state.',
    distinctFrom:
      'T425 (publish gate — T426 is the time-trigger orchestrator, T425 validates publish eligibility)',
    familyId: 'Family-166',

    factoryDependencies: [
      {
        factoryId: 'F1133',
        interfaceName: 'IScheduledPublishService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Read and update scheduled publish records',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-05',
        description: 'Scheduled time read from content record — never hardcoded',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['scheduled_publish'],
      events: [
        'scheduled.publish.timer',
        'content.scheduled.published',
        'scheduled.publish.skipped',
      ],
      apiRoutes: ['/api/dynamic/scheduled-publish'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Scheduled publish time read from content record — never hardcoded',
      'Duplicate timer fires for same contentId return existing state',
    ],

    machineComponents: ['setIfAbsent idempotency key: contentId', 'Scheduled time comparison gate'],

    freedomComponents: [
      'Timer check interval (FREEDOM config key: flow28_scheduled_publish_check_interval)',
    ],
  });
}

// ── T427 — ContentArchiveUnpublishFlow ────────────────────────────────────

/**
 * T427 — ContentArchiveUnpublishFlow [PROCESSING].
 *
 * PURPOSE: Handles content archiving and unpublishing.
 *          Content record updated before SearchIndexCascade triggered.
 *          Archive/unpublish reason required in audit trail.
 */
export function createT427Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T427',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'ContentArchiveUnpublishFlow',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by content.archive.requested or content.unpublish.requested CloudEvent',
    purpose:
      'Archive or unpublish content: update content status, record audit reason, trigger search index removal. Outbox: content record updated before SearchIndexCascade enqueued.',
    distinctFrom: 'T423 (lifecycle orchestrator — T427 handles archive/unpublish specifically)',
    familyId: 'Family-166',

    factoryDependencies: [
      {
        factoryId: 'F1134',
        interfaceName: 'IContentArchiveService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Archive and unpublish content records with audit trail',
      },
      {
        factoryId: 'F1135',
        interfaceName: 'IArchiveAuditQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for archive/unpublish audit events',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-06',
        description: 'Content record updated before SearchIndexCascade enqueued (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['content_archive'],
      events: ['content.archive.requested', 'content.archived', 'content.unpublished'],
      apiRoutes: ['/api/dynamic/content-archive'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Archive reason MUST be present in audit trail',
      'Content record MUST be updated before SearchIndexCascade is enqueued (DNA-8)',
    ],

    machineComponents: [
      'Archive reason validation',
      'Persist-before-emit: content updated before cascade triggered (DNA-8)',
    ],

    freedomComponents: [
      'Archive retention period days (FREEDOM config key: flow28_archive_retention_days)',
      'Allowed archive reasons',
    ],
  });
}

// ── T428 — MediaUploadTransformPipeline ───────────────────────────────────

/**
 * T428 — MediaUploadTransformPipeline [PROCESSING].
 *
 * PURPOSE: Handles media upload and transformation pipeline.
 *          Media stored before transform enqueued.
 *          Transform variants from FREEDOM config — never hardcoded.
 */
export function createT428Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T428',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'MediaUploadTransformPipeline',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by media.upload.requested CloudEvent',
    purpose:
      'Process media upload and trigger transformation variants. Media record stored before transform enqueued. Transform variants (thumbnail, webp, etc.) from FREEDOM config. Tenant-scoped storage path.',
    distinctFrom:
      'T429 (media variant gate — T428 handles upload and transform, T429 validates variant requests)',
    familyId: 'Family-167',

    factoryDependencies: [
      {
        factoryId: 'F1136',
        interfaceName: 'IMediaStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Store media records and transform job status',
      },
      {
        factoryId: 'F1137',
        interfaceName: 'IMediaTransformQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for media transformation jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-07',
        description: 'Media record stored before transform enqueued (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-28-08',
        description: 'Transform variants from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['media_upload', 'media_transform'],
      events: ['media.upload.requested', 'media.uploaded', 'media.transform.enqueued'],
      apiRoutes: ['/api/dynamic/media-uploads'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Media record MUST be stored before transform is enqueued (DNA-8)',
      'Transform variant types from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Media upload validation and storage',
      'Persist-before-emit: media stored before transform enqueued (DNA-8)',
    ],

    freedomComponents: [
      'Transform variant types (FREEDOM config key: flow28_media_transform_variants)',
      'Max media file size bytes',
      'Allowed media MIME types',
    ],
  });
}

// ── T429 — MediaVariantRequestGate ────────────────────────────────────────

/**
 * T429 — MediaVariantRequestGate [GUARD].
 *
 * PURPOSE: Hard-stop gate validating media variant requests.
 *          Allowed variants from FREEDOM config — never hardcoded.
 *          Returns failure if variant type or dimensions are invalid.
 */
export function createT429Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T429',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'MediaVariantRequestGate',
    archetype: ContractArchetype.GUARD,
    version: '1.0.0',
    entry: 'Triggered by media.variant.requested CloudEvent',
    purpose:
      'Validate media variant request: check variant type is allowed, dimensions within limits, requestor has access to source media. All limits from FREEDOM config. Returns DataProcessResult.failure on any check failure.',
    distinctFrom: 'T428 (upload pipeline — T429 is the variant-request validation gate only)',
    familyId: 'Family-167',

    factoryDependencies: [
      {
        factoryId: 'F1138',
        interfaceName: 'IMediaVariantValidator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Validate media variant requests against allowed types and dimensions',
      },
      {
        factoryId: 'F1139',
        interfaceName: 'IMediaVariantQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for validated media variant generation jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-09',
        description: 'Allowed variant types from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['media_variant'],
      events: ['media.variant.requested', 'media.variant.approved', 'media.variant.rejected'],
      apiRoutes: ['/api/dynamic/media-variants'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Allowed variant types and dimension limits from FREEDOM config — never hardcoded',
      'Gate returns DataProcessResult.failure — never throws',
    ],

    machineComponents: ['Variant type allowlist check', 'Dimension bounds validation'],

    freedomComponents: [
      'Allowed variant types (FREEDOM config key: flow28_allowed_media_variants)',
      'Max dimension limits per variant type',
    ],
  });
}

// ── T430 — PublicPageRequestPipeline ──────────────────────────────────────

/**
 * T430 — PublicPageRequestPipeline [PROCESSING].
 *
 * PURPOSE: Serves public content pages with cache-first read (SK-285).
 *          Cache miss populates cache synchronously before returning.
 *          Only PUBLISHED content served — status filter mandatory.
 */
export function createT430Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T430',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'PublicPageRequestPipeline',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by public.page.requested CloudEvent or HTTP GET /api/dynamic/public-pages',
    purpose:
      'Serve public content pages using SK-285 cache-first read pattern. Cache miss synchronously populates cache with DB result. Only PUBLISHED content returned — status filter mandatory (published_only_search_index named check).',
    distinctFrom:
      'T431 (search index cascade — T430 serves individual pages, T431 manages search index)',
    familyId: 'Family-168',

    factoryDependencies: [
      {
        factoryId: 'F1140',
        interfaceName: 'IPublicPageCacheReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Cache reader for public pages — tenant-scoped, non-fatal on failure',
      },
      {
        factoryId: 'F1141',
        interfaceName: 'IPublicPageCacheWriter',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Cache writer for public pages — non-fatal on failure',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-10',
        description: 'SK-285 cache-first read pattern — cache miss populates cache synchronously',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-11',
        description:
          'Only PUBLISHED content served — status filter mandatory (published_only_search_index)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['public_page_cache'],
      events: ['public.page.requested', 'public.page.served', 'public.page.cache.miss'],
      apiRoutes: ['/api/dynamic/public-pages'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'SK-285 cache-first read pattern MUST be used — no inline cache logic',
      'Cache miss MUST populate cache synchronously (not fire-and-forget)',
      'Only PUBLISHED status content MUST be served (cache_first_read_pattern + published_only_search_index)',
    ],

    machineComponents: [
      'SK-285 cache-first read pattern (injectable)',
      'PUBLISHED status filter (published_only_search_index check)',
      'Tenant-scoped cache key building',
    ],

    freedomComponents: [
      'Page cache TTL seconds (FREEDOM config key: flow28_page_cache_ttl_seconds)',
    ],
  });
}

// ── T431 — SearchIndexCascade ─────────────────────────────────────────────

/**
 * T431 — SearchIndexCascade [DATA_PIPELINE].
 *
 * PURPOSE: Cascades content changes to search index.
 *          Only PUBLISHED content indexed — never drafts or archived.
 *          Idempotent by (contentId, indexVersion).
 */
export function createT431Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T431',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'SearchIndexCascade',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by content.published or content.updated CloudEvent',
    purpose:
      'Cascade content changes to search index. Only PUBLISHED content indexed. Idempotent by (contentId, indexVersion). Index record stored before SearchIndexed event emitted.',
    distinctFrom:
      'T432 (cache invalidation — T431 manages search index, T432 invalidates page cache)',
    familyId: 'Family-168',

    factoryDependencies: [
      {
        factoryId: 'F1142',
        interfaceName: 'ISearchIndexService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Search index writer for content — PUBLISHED filter mandatory',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-12',
        description: 'Only PUBLISHED content indexed — status filter mandatory',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['search_index_record'],
      events: ['content.published', 'search.index.updated', 'search.index.failed'],
      apiRoutes: ['/api/dynamic/search-index'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Only PUBLISHED status content MUST be indexed — never draft or archived',
      'Idempotent by (contentId, indexVersion)',
    ],

    machineComponents: [
      'PUBLISHED status filter (published_only_search_index check)',
      'Idempotency key: (contentId, indexVersion)',
      'Index record persist-before-emit (DNA-8)',
    ],

    freedomComponents: ['Indexed content fields (FREEDOM config key: flow28_search_index_fields)'],
  });
}

// ── T432 — CacheInvalidationCascade ───────────────────────────────────────

/**
 * T432 — CacheInvalidationCascade [PROCESSING].
 *
 * PURPOSE: Invalidates page cache on content change.
 *          Tag-based invalidation — never wildcard flush.
 *          Non-fatal: cache invalidation failure never surfaces to caller.
 */
export function createT432Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T432',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'CacheInvalidationCascade',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by content.updated or content.archived CloudEvent',
    purpose:
      'Invalidate page cache using tag-based invalidation on content change. Tag-based only — never wildcard flush. Non-fatal: entire handler in try/catch, cache failure returns success({ invalidated: false }).',
    distinctFrom:
      'T431 (search index cascade — T432 handles cache invalidation, T431 handles search index)',
    familyId: 'Family-168',

    factoryDependencies: [
      {
        factoryId: 'F1143',
        interfaceName: 'ICacheInvalidationService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Tag-based cache invalidation service — non-fatal on failure',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-13',
        description: 'Tag-based invalidation only — never wildcard flush',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-14',
        description: 'Entire handler in try/catch — cache failure non-fatal',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['cache_invalidation'],
      events: ['content.updated', 'cache.invalidated', 'cache.invalidation.skipped'],
      apiRoutes: ['/api/dynamic/cache-invalidation'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Cache invalidation MUST be tag-based — never wildcard flush',
      'Entire handler body MUST be in try/catch — cache failure returns success({ invalidated: false })',
    ],

    machineComponents: [
      'try/catch wrapping entire handler body (best-effort)',
      'Tag-based invalidation (never wildcard)',
      'success({ invalidated: false }) on any cache error',
    ],

    freedomComponents: [
      'Cache invalidation batch size (FREEDOM config key: flow28_cache_invalidation_batch_size)',
    ],
  });
}

// ── T433 — HookFanOutExecutor ──────────────────────────────────────────────

/**
 * T433 — HookFanOutExecutor [ORCHESTRATION].
 *
 * PURPOSE: Fan-out content lifecycle events to registered hooks.
 *          Hook execution in isolated sandbox (extension_sandbox_no_network_no_env).
 *          Hook list from FREEDOM config — never hardcoded.
 */
export function createT433Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T433',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'HookFanOutExecutor',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by content.published or content.event.hook.requested CloudEvent',
    purpose:
      'Fan-out content events to registered webhook hooks. Each hook executed in isolated sandbox — no network, no env access (extension_sandbox_no_network_no_env). Hook results stored before HookExecuted emitted. Hook list from FREEDOM config.',
    distinctFrom:
      'T434 (webhook dispatch gate — T433 orchestrates fan-out, T434 validates individual webhook dispatch)',
    familyId: 'Family-169',

    factoryDependencies: [
      {
        factoryId: 'F1144',
        interfaceName: 'IHookRegistryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Hook registry — lists registered hooks per tenant and event type',
      },
      {
        factoryId: 'F1145',
        interfaceName: 'IHookExecutionQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for async hook execution jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-15',
        description:
          'Hook execution in isolated sandbox — no network, no env (extension_sandbox_no_network_no_env)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['hook_execution'],
      events: ['content.published', 'hook.executed', 'hook.execution.failed'],
      apiRoutes: ['/api/dynamic/hook-executions'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Hook execution MUST be in isolated sandbox — no network, no env access (extension_sandbox_no_network_no_env)',
      'Hook list from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Isolated sandbox execution for each hook',
      'Fan-out with allSettled — partial failure tolerant',
      'Persist-before-emit: hook results stored before HookExecuted emitted (DNA-8)',
    ],

    freedomComponents: [
      'Registered hooks per event type (FREEDOM config key: flow28_hook_registry)',
      'Hook execution timeout ms',
    ],
  });
}

// ── T434 — WebhookDispatchGate ────────────────────────────────────────────

/**
 * T434 — WebhookDispatchGate [GUARD].
 *
 * PURPOSE: Hard-stop gate validating webhook dispatch.
 *          SSRF check on EVERY retry with skipCache:true (DD-280, CF-586).
 *          Webhook URL validated before every dispatch attempt.
 */
export function createT434Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T434',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'WebhookDispatchGate',
    archetype: ContractArchetype.GUARD,
    version: '1.0.0',
    entry: 'Triggered by webhook.dispatch.requested CloudEvent',
    purpose:
      'Validate and dispatch webhooks. SSRF check on EVERY retry with skipCache:true (DD-280, CF-586) — cached IP resolution is not safe across retries. Returns DataProcessResult.failure if SSRF detected.',
    distinctFrom:
      'T433 (hook fan-out — T434 is the SSRF-safe dispatch gate for individual webhooks)',
    familyId: 'Family-169',

    factoryDependencies: [
      {
        factoryId: 'F1146',
        interfaceName: 'ISsrfValidatorService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'SSRF validator — resolves and validates webhook URLs, skipCache on every retry',
      },
      {
        factoryId: 'F1147',
        interfaceName: 'IWebhookDispatchQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for validated webhook dispatch jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-16',
        description: 'SSRF check on EVERY retry with skipCache:true (DD-280, CF-586)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['webhook_dispatch'],
      events: ['webhook.dispatch.requested', 'webhook.dispatched', 'webhook.dispatch.blocked'],
      apiRoutes: ['/api/dynamic/webhook-dispatches'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'SSRF check on EVERY retry with skipCache:true (DD-280, CF-586)',
      'Gate returns DataProcessResult.failure on SSRF detection — never throws',
    ],

    machineComponents: [
      'SSRF validation with skipCache:true on every retry (DD-280)',
      'Private IP range block (RFC1918)',
      'Metadata service URL block',
    ],

    freedomComponents: [
      'Webhook allowlist (FREEDOM config key: flow28_webhook_allowlist_id)',
      'Max retry count',
    ],
  });
}

// ── T435 — CommentSubmissionSpamGate ──────────────────────────────────────

/**
 * T435 — CommentSubmissionSpamGate [GUARD].
 *
 * PURPOSE: Hard-stop gate for comment submission: XSS sanitize, then spam check.
 *          XSS sanitize via F1150 BEFORE store (CF-577).
 *          Budget pre-check before AI spam detection call.
 */
export function createT435Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T435',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'CommentSubmissionSpamGate',
    archetype: ContractArchetype.GUARD,
    version: '1.0.0',
    entry: 'Triggered by comment.submit.requested CloudEvent',
    purpose:
      'Validate comment submission: XSS sanitize via F1150 BEFORE store (CF-577), budget pre-check before AI spam detection, spam probability gate. Order: XSS sanitize → budget check → spam detect → store. Returns DataProcessResult.failure if XSS or spam detected.',
    distinctFrom:
      'T436 (moderation queue — T435 is the submission spam gate, T436 handles moderation workflow)',
    familyId: 'Family-170',

    factoryDependencies: [
      {
        factoryId: 'F1148',
        interfaceName: 'ICommentXssFilter',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'XSS sanitization filter — runs BEFORE comment is stored (CF-577)',
      },
      {
        factoryId: 'F1149',
        interfaceName: 'ISpamDetector',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'openai',
        description: 'AI-based spam detection — budget pre-check required before call',
      },
      {
        factoryId: 'F1150',
        interfaceName: 'IBudgetService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Budget check service — validates AI call budget before spam detection',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-17',
        description: 'XSS sanitize via F1150 BEFORE store (CF-577)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-18',
        description:
          'Budget pre-check before AI spam detection call (spam_detector_budget_precheck)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['comment_submission'],
      events: ['comment.submit.requested', 'comment.spam.detected', 'comment.submit.approved'],
      apiRoutes: ['/api/dynamic/comment-submissions'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'XSS sanitize via F1150 BEFORE store (CF-577)',
      'Budget check MUST run before AI spam detection call (spam_detector_budget_precheck)',
      'Gate returns DataProcessResult.failure on XSS/spam — never throws',
    ],

    machineComponents: [
      'XSS sanitization ordering gate (before store, CF-577)',
      'Budget pre-check gate (before AI call)',
      'Spam probability threshold gate',
    ],

    freedomComponents: [
      'Spam probability threshold (FREEDOM config key: flow28_spam_probability_threshold)',
      'XSS filter strictness level',
      'AI spam detection budget limit',
    ],
  });
}

// ── T436 — CommentModerationQueueGate ─────────────────────────────────────

/**
 * T436 — CommentModerationQueueGate [PROCESSING].
 *
 * PURPOSE: Routes comments to moderation queue after spam gate.
 *          Three-path: PASS / REJECT / HUMAN_REVIEW.
 *          Comment stored before ModerationQueued emitted.
 */
export function createT436Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T436',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'CommentModerationQueueGate',
    archetype: ContractArchetype.PROCESSING,
    version: '1.0.0',
    entry: 'Triggered by comment.moderation.requested CloudEvent',
    purpose:
      'Route comments through moderation: PASS (auto-approve), REJECT (auto-reject with reason), HUMAN_REVIEW (queue for human). Comment record stored before ModerationQueued emitted. Moderation thresholds from FREEDOM config.',
    distinctFrom:
      'T435 (spam gate — T436 handles moderation routing, T435 is the submission spam gate)',
    familyId: 'Family-170',

    factoryDependencies: [
      {
        factoryId: 'F1151',
        interfaceName: 'ICommentStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Comment storage with moderation status tracking',
      },
      {
        factoryId: 'F1152',
        interfaceName: 'IModerationQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Moderation queue for human review routing',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-19',
        description: 'Comment stored before ModerationQueued emitted (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['comment_moderation'],
      events: [
        'comment.moderation.requested',
        'comment.moderation.queued',
        'comment.approved',
        'comment.rejected',
      ],
      apiRoutes: ['/api/dynamic/comment-moderation'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Comment record MUST be stored before ModerationQueued is emitted (DNA-8)',
      'Three-path moderation: PASS / REJECT / HUMAN_REVIEW only',
    ],

    machineComponents: [
      'Three-path moderation router (PASS/REJECT/HUMAN_REVIEW)',
      'Persist-before-emit: comment stored before ModerationQueued emitted (DNA-8)',
    ],

    freedomComponents: [
      'Auto-approve confidence threshold (FREEDOM config key: flow28_moderation_auto_approve_threshold)',
      'Auto-reject confidence threshold',
    ],
  });
}

// ── T437 — TaxonomyTermPropagation ────────────────────────────────────────

/**
 * T437 — TaxonomyTermPropagation [DATA_PIPELINE].
 *
 * PURPOSE: Propagates taxonomy term changes to all content using the term.
 *          Batch processing — never unbounded scan.
 *          Term update record stored before propagation enqueued.
 */
export function createT437Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T437',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'TaxonomyTermPropagation',
    archetype: ContractArchetype.DATA_PIPELINE,
    version: '1.0.0',
    entry: 'Triggered by taxonomy.term.updated CloudEvent',
    purpose:
      'Propagate taxonomy term changes to all affected content records. Batch processing with FREEDOM-configured batch size — never unbounded scan. Term update stored before batch propagation enqueued.',
    distinctFrom:
      'T431 (search index cascade — T437 propagates taxonomy changes, T431 updates search index)',
    familyId: 'Family-171',

    factoryDependencies: [
      {
        factoryId: 'F1153',
        interfaceName: 'ITaxonomyStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Taxonomy term storage and content association queries',
      },
      {
        factoryId: 'F1154',
        interfaceName: 'ITaxonomyPropagationQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for taxonomy propagation batch jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-20',
        description: 'Batch size from FREEDOM config — never unbounded scan',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['taxonomy_term', 'taxonomy_propagation'],
      events: [
        'taxonomy.term.updated',
        'taxonomy.propagation.enqueued',
        'taxonomy.propagation.completed',
      ],
      apiRoutes: ['/api/dynamic/taxonomy-propagation'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Batch size from FREEDOM config — never unbounded scan',
      'Term update record stored before propagation batch enqueued (DNA-8)',
    ],

    machineComponents: [
      'Batch cursor-based pagination (no unbounded scan)',
      'Persist-before-emit: term update stored before batch enqueued (DNA-8)',
    ],

    freedomComponents: [
      'Propagation batch size (FREEDOM config key: flow28_taxonomy_propagation_batch_size)',
      'Propagation max depth',
    ],
  });
}

// ── T438 — AiContentEnhancementGate ──────────────────────────────────────

/**
 * T438 — AiContentEnhancementGate [AI_GENERATION_LOOP].
 *
 * PURPOSE: AI-assisted content enhancement with bounded retry loop.
 *          Budget pre-check before every AI call.
 *          Retry count from FREEDOM config — never hardcoded.
 */
export function createT438Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T438',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'AiContentEnhancementGate',
    archetype: ContractArchetype.AI_GENERATION_LOOP,
    version: '1.0.0',
    entry: 'Triggered by content.enhance.requested CloudEvent',
    purpose:
      'AI-assisted content enhancement: budget pre-check → AI enhancement → quality assessment → retry if needed. Retry count from FREEDOM config. Enhancement stored before EnhancementCompleted emitted.',
    distinctFrom: 'T423 (lifecycle orchestrator — T438 handles AI enhancement step only)',
    familyId: 'Family-171',

    factoryDependencies: [
      {
        factoryId: 'F1155',
        interfaceName: 'IAiContentEnhancer',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'openai',
        description: 'AI content enhancement service',
      },
      {
        factoryId: 'F1156',
        interfaceName: 'IEnhancementBudgetService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Budget validation for AI enhancement calls',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-21',
        description: 'Budget pre-check before every AI call',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-22',
        description: 'Retry count from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['content_enhancement'],
      events: [
        'content.enhance.requested',
        'content.enhancement.completed',
        'content.enhancement.failed',
      ],
      apiRoutes: ['/api/dynamic/content-enhancements'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Budget pre-check MUST run before every AI enhancement call',
      'Retry count from FREEDOM config — never hardcoded',
    ],

    machineComponents: [
      'Budget pre-check gate (before AI call)',
      'Bounded retry loop with arbiter feedback',
      'Persist-before-emit: enhancement stored before EnhancementCompleted emitted (DNA-8)',
    ],

    freedomComponents: [
      'AI enhancement retry count (FREEDOM config key: flow28_ai_enhancement_retry_count)',
      'Enhancement quality threshold',
      'AI model selection per content type',
    ],
  });
}

// ── T439 — SitemapRebuildTrigger ──────────────────────────────────────────

/**
 * T439 — SitemapRebuildTrigger [ORCHESTRATION].
 *
 * PURPOSE: Triggers sitemap rebuild on content change.
 *          Idempotent by (tenantId, rebuildToken).
 *          Only PUBLISHED content included in sitemap.
 */
export function createT439Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T439',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'SitemapRebuildTrigger',
    archetype: ContractArchetype.ORCHESTRATION,
    version: '1.0.0',
    entry: 'Triggered by content.published or sitemap.rebuild.requested CloudEvent',
    purpose:
      'Trigger sitemap rebuild on content publication. Idempotent by (tenantId, rebuildToken) — rapid publish events coalesce. Only PUBLISHED content in sitemap. Rebuild record stored before SitemapRebuildQueued emitted.',
    distinctFrom: 'T431 (search index cascade — T439 manages sitemap, T431 manages search index)',
    familyId: 'Family-172',

    factoryDependencies: [
      {
        factoryId: 'F1157',
        interfaceName: 'ISitemapStoreService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Sitemap record storage and rebuild status tracking',
      },
      {
        factoryId: 'F1158',
        interfaceName: 'ISitemapRebuildQueue',
        fabricType: FabricType.QUEUE,
        providerHint: 'rabbitmq',
        description: 'Queue for sitemap rebuild jobs',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-23',
        description: 'Only PUBLISHED content in sitemap',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['sitemap_rebuild'],
      events: ['content.published', 'sitemap.rebuild.queued', 'sitemap.rebuild.completed'],
      apiRoutes: ['/api/dynamic/sitemap-rebuild'],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'Only PUBLISHED content MUST be included in sitemap',
      'Idempotent by (tenantId, rebuildToken)',
    ],

    machineComponents: [
      'PUBLISHED status filter for sitemap entries',
      'setIfAbsent idempotency key: (tenantId, rebuildToken)',
      'Persist-before-emit: rebuild record stored before SitemapRebuildQueued emitted (DNA-8)',
    ],

    freedomComponents: [
      'Sitemap rebuild debounce ms (FREEDOM config key: flow28_sitemap_rebuild_debounce_ms)',
      'Max sitemap entries per tenant',
    ],
  });
}

// ── T440 — MultiTenantContentScopeEnforcer ────────────────────────────────

/**
 * T440 — MultiTenantContentScopeEnforcer [STATE_MACHINE].
 *
 * PURPOSE: Enforces multi-tenant content isolation — MUST be step[0] in ALL FLOW-28 DAGs (CF-590).
 *          Validates caller tenant matches content tenant before any operation.
 *          Returns failure on cross-tenant attempt.
 */
export function createT440Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T440',
    flowId: 'FLOW-28',
    flowName: 'Blog/CMS Modules Platform',
    name: 'MultiTenantContentScopeEnforcer',
    archetype: ContractArchetype.STATE_MACHINE,
    version: '1.0.0',
    entry: 'Step[0] in ALL FLOW-28 DAG templates — mandatory first step (CF-590)',
    purpose:
      'Enforce multi-tenant content scope isolation. MUST be step[0] in ALL FLOW-28 DAG templates (CF-590). Validates caller tenant from AsyncLocalStorage matches content tenant scope. Returns DataProcessResult.failure on cross-tenant access attempt.',
    distinctFrom:
      'T423–T439 — T440 is the mandatory scope guard, not a content operation. All other FLOW-28 task types execute after T440 passes.',
    familyId: 'Family-172',

    factoryDependencies: [
      {
        factoryId: 'F1159',
        interfaceName: 'IContentScopeValidator',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'Validates content belongs to caller tenant scope — reads tenantId from AsyncLocalStorage',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', modelHint: undefined, config: {} },
      { stationId: 'AF-4', role: 'review', modelHint: undefined, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: undefined,
        config: { enforceQualityGates: true },
      },
    ],

    qualityGates: [
      ...FLOW28_QUALITY_GATES_CORE,
      {
        gateId: 'QG-28-24',
        description: 'T440 MUST be step[0] in ALL FLOW-28 DAG templates (CF-590)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-28-25',
        description: 'Cross-tenant access returns failure — never throws',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['content_scope_enforcement'],
      events: ['content.scope.validated', 'content.scope.violation'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW28_IRON_RULES_CORE,
      'T440 MUST be step[0] in ALL FLOW-28 DAG templates (CF-590)',
      'Cross-tenant content access MUST return DataProcessResult.failure — never throws',
      'Tenant context read from AsyncLocalStorage — no tenantId parameter (DNA-5)',
    ],

    machineComponents: [
      'AsyncLocalStorage tenant context read',
      'Content-to-tenant ownership validation',
      'Cross-tenant block with CROSS_TENANT_BLOCKED error code',
    ],

    freedomComponents: [
      'Cross-tenant sharing policy (FREEDOM config key: flow28_cross_tenant_sharing_policy)',
    ],
  });
}

// ── All FLOW-28 contracts ──────────────────────────────────────────────────

export const FLOW28_BLOG_CMS_CONTRACT_FACTORIES: Array<() => EngineContract> = [
  createT423Contract,
  createT424Contract,
  createT425Contract,
  createT426Contract,
  createT427Contract,
  createT428Contract,
  createT429Contract,
  createT430Contract,
  createT431Contract,
  createT432Contract,
  createT433Contract,
  createT434Contract,
  createT435Contract,
  createT436Contract,
  createT437Contract,
  createT438Contract,
  createT439Contract,
  createT440Contract,
];

export const FLOW28_BLOG_CMS_CONTRACTS = FLOW28_BLOG_CMS_CONTRACT_FACTORIES.map((f) => f());
