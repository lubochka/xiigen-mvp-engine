/**
 * FLOW-23 Engine Contracts — Form Builder Templates (new services T637-T640)
 *
 * T637  TemplateSchemaValidator        archetype: VALIDATION       (JSON Schema validation + required field enforcement + type compatibility)
 * T638  TemplateVersionPublisher       archetype: VALIDATION       (OCC DRAFT→PUBLISHED + version immutability + schema evolution check)
 * T639  TemplateInstantiationEngine    archetype: ORCHESTRATION    (template instantiation + variable binding + SETNX lock + merge defaults)
 * T640  TemplateUsageAnalytics         archetype: DATA_PIPELINE    (append-only usage metrics + template popularity scoring + PII exclusion)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * CF-23-1: T637 JSON Schema validation ORDER 1 + required field enforcement ORDER 2 + type compatibility ORDER 3
 * CF-23-2: T638 OCC DRAFT→PUBLISHED ORDER 1 + version immutability ORDER 2 + schema evolution check ORDER 3
 * CF-23-3: T639 SETNX instantiation lock ORDER 1 + variable binding ORDER 2 + default merge ORDER 3
 * CF-23-4: T640 Append-only metrics storeDocument + PII exclusion + popularity scoring
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const FORM_BUILDER_TEMPLATES_NEW_TASK_TYPES = ['T637', 'T638', 'T639', 'T640'] as const;

// ── T637: TemplateSchemaValidator ─────────────────────────────────────────────

export function createTemplateSchemaValidatorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T637',
    flowId: 'FLOW-23',
    flowName: 'Form Builder Templates',
    name: 'TemplateSchemaValidator',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by TemplateValidationRequested event (user submits form template)',
    purpose:
      'Three-gate JSON Schema validation pipeline. JSON Schema validation at ORDER 1 — ' +
      'template.schema must be valid JSON Schema document (draft-07 or draft-2020-12). ' +
      'Required field enforcement at ORDER 2 — all fields marked as required must exist in schema ' +
      'required array; required fields cannot be empty. Type compatibility at ORDER 3 — ' +
      'field types must match compatible primitive types (string, number, boolean, etc). ' +
      'SchemaInvalid emitted on validation failure at any ORDER. CF-23-1.',
    distinctFrom:
      'T638 TemplateVersionPublisher (T637 validates schema structure; T638 manages publication with immutability)',

    ironRules: [
      'IR-1: JSON Schema structure validation at ORDER 1 — template.schema must be valid JSON Schema. ' +
        'SchemaInvalid emitted immediately on parse failure or non-conforming schema. CF-23-1.',
      'IR-2: Required field enforcement at ORDER 2 — required fields marked in template.requiredFields ' +
        'must exist in schema.required array; cannot be empty. RequiredFieldMissing emitted. CF-23-1.',
      'IR-3: Type compatibility at ORDER 3 — each field type must be compatible: string, number, boolean, ' +
        'object, array, null. TypeMismatchError emitted on incompatibility. CF-23-1.',
      'IR-4: storeDocument(validation audit) at ORDER 4 BEFORE enqueue(TemplateValidated or SchemaInvalid). DNA-8. CF-23-1.',
      'IR-5: TemplateValidated emitted at ORDER 5 only after all three gates pass.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ValidateJsonSchema',
          description: 'Validate template.schema is valid JSON Schema document',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'EnforceRequiredFields',
          description: 'Verify required fields exist in schema.required array; cannot be empty',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'CheckTypeCompatibility',
          description:
            'Validate field types match compatible primitives (string, number, boolean, etc)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(validation audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitValidationResult',
          description: 'enqueue(TemplateValidated) — only after all gates pass',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1585',
        interfaceName: 'ITemplateSchemaService',
        fabricType: FabricType.DATABASE,
        description: 'Template schema validation + storage',
      },
      {
        factoryId: 'F1586',
        interfaceName: 'IValidationAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Validation audit trail — PRIVATE per tenant',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'TemplateValidated / SchemaInvalid / RequiredFieldMissing event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-23-01',
        description: 'JSON Schema validation at ORDER 1 before required field check (IR-1)',
        severity: 'error',
        checkType: 'json_schema_validation_first',
      },
      {
        gateId: 'QG-23-02',
        description: 'Required field enforcement at ORDER 2 before type compatibility (IR-2)',
        severity: 'error',
        checkType: 'required_fields_before_type_check',
      },
      {
        gateId: 'QG-23-03',
        description: 'storeDocument(audit) before enqueue(TemplateValidated) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'ALLOWED_FIELD_TYPES',
        value: ['string', 'number', 'boolean', 'object', 'array', 'null'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['form_template', 'validation_audit'],
      events: ['template.validated', 'template.validation.failed', 'schema.invalid'],
      apiRoutes: [],
    },

    machineComponents: [
      'JSON Schema structure validation at ORDER 1 (CF-23-1)',
      'ALLOWED_FIELD_TYPES = [string, number, boolean, object, array, null] — compile-time constant (CF-23-1)',
      'Required field enforcement at ORDER 2 — fields in requiredFields must exist in schema.required (CF-23-1)',
      'Type compatibility check at ORDER 3 — field types match ALLOWED_FIELD_TYPES (CF-23-1)',
      'Outbox: storeDocument(audit) before TemplateValidated enqueue (DNA-8)',
      'SchemaInvalid emitted on any validation gate failure',
    ],

    freedomComponents: [
      'template_max_fields — maximum number of fields allowed in a single template',
      'template_schema_version — supported JSON Schema version (draft-07, draft-2020-12)',
      'required_field_min_count — minimum number of required fields',
    ],
  });
}

// ── T638: TemplateVersionPublisher ───────────────────────────────────────────

export function createTemplateVersionPublisherContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T638',
    flowId: 'FLOW-23',
    flowName: 'Form Builder Templates',
    name: 'TemplateVersionPublisher',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by TemplatePublicationRequested event (user publishes template)',
    purpose:
      'Template publication with OCC version locking and immutability enforcement. ' +
      'OCC DRAFT→PUBLISHED state transition at ORDER 1 — optimistic concurrency updateDocument ' +
      'with expectedVersion prevents double-publication race. Version immutability at ORDER 2 — ' +
      'once PUBLISHED, template schema cannot be modified; only DRAFT templates accept schema changes. ' +
      'Schema evolution check at ORDER 3 — published version schema must be a forward-compatible ' +
      'superset of all previous published versions (additive only, no field removals). ' +
      'VersionPublished emitted only after all gates pass. CF-23-2.',
    distinctFrom:
      'T637 TemplateSchemaValidator (T637 validates schema structure; T638 publishes with version control)',

    ironRules: [
      'IR-1: OCC DRAFT→PUBLISHED updateDocument(status:PUBLISHED, expectedVersion) at ORDER 1. ' +
        'OCC_CONFLICT → emit TemplatePublicationConflict, no further processing. CF-23-2.',
      'IR-2: Version immutability check at ORDER 2 — template.status === PUBLISHED cannot have schema changes. ' +
        'VersionImmutableRejected emitted on published template modification attempt. CF-23-2.',
      'IR-3: Schema evolution check at ORDER 3 — new schema must be forward-compatible superset of all ' +
        'previous published versions. No field removals allowed. SchemaEvolutionInvalid emitted. CF-23-2.',
      'IR-4: storeDocument(publication audit) at ORDER 4 BEFORE enqueue(VersionPublished or conflict event). DNA-8. CF-23-2.',
      'IR-5: VersionPublished emitted at ORDER 5 only after all validation and OCC write succeed.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'OccPublish',
          description:
            'updateDocument(status:PUBLISHED, expectedVersion) with OCC to prevent double-publication',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'VersionImmutabilityGuard',
          description: 'Verify published template schema cannot be modified',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'SchemaEvolutionCheck',
          description:
            'Validate new schema is forward-compatible superset of previous published versions',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(publication audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitVersionPublished',
          description:
            'enqueue(VersionPublished) — only after all validation and OCC write succeed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1587',
        interfaceName: 'ITemplateVersionService',
        fabricType: FabricType.DATABASE,
        description: 'Template version management + OCC publication',
      },
      {
        factoryId: 'F1588',
        interfaceName: 'IPublicationAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Publication audit trail — PRIVATE per tenant',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'VersionPublished / VersionImmutableRejected / TemplatePublicationConflict event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-23-04',
        description: 'OCC DRAFT→PUBLISHED at ORDER 1 before immutability check (IR-1)',
        severity: 'error',
        checkType: 'occ_publish_before_immutable_check',
      },
      {
        gateId: 'QG-23-05',
        description: 'Version immutability guard at ORDER 2 before schema evolution check (IR-2)',
        severity: 'error',
        checkType: 'immutability_before_evolution',
      },
      {
        gateId: 'QG-23-06',
        description: 'storeDocument(audit) before enqueue(VersionPublished) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'TEMPLATE_IMMUTABLE_STATES',
        value: ['PUBLISHED'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['template_version', 'publication_audit'],
      events: [
        'template.version.published',
        'template.publication.failed',
        'version.immutable.rejected',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'OCC updateDocument(status:PUBLISHED, version:+1) at ORDER 1 (CF-23-2)',
      'TEMPLATE_IMMUTABLE_STATES = [PUBLISHED] — compile-time constant (CF-23-2)',
      'Version immutability guard at ORDER 2 — published templates cannot change schema (CF-23-2)',
      'Schema evolution check at ORDER 3 — new schema is forward-compatible superset (CF-23-2)',
      'Outbox: storeDocument(audit) before VersionPublished enqueue (DNA-8)',
      'TemplatePublicationConflict emitted on OCC failure, VersionImmutableRejected on published modify attempt',
    ],

    freedomComponents: [
      'evolution_check_enabled — enable/disable schema forward-compatibility enforcement',
      'publication_timeout_ms — maximum time allowed for publication operation',
    ],
  });
}

// ── T639: TemplateInstantiationEngine ─────────────────────────────────────────

export function createTemplateInstantiationEngineContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T639',
    flowId: 'FLOW-23',
    flowName: 'Form Builder Templates',
    name: 'TemplateInstantiationEngine',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by TemplateInstantiationRequested event (user creates form from template)',
    purpose:
      'Template instantiation with atomic SETNX lock and variable binding. SETNX instantiation lock ' +
      'at ORDER 1 prevents concurrent instantiations from the same template with same context. ' +
      'Variable binding at ORDER 2 — template variables are substituted with provided bindings ' +
      '(e.g., ${user.name} → "Alice"). Default values merged at ORDER 3 — fields with default ' +
      'specified in template schema are pre-populated. FormInstantiated emitted only after all ' +
      'steps complete and lock released. CF-23-3.',
    distinctFrom:
      'T640 TemplateUsageAnalytics (T639 creates instances; T640 records usage metrics)',

    ironRules: [
      'IR-1: SETNX instantiation lock at ORDER 1 before any variable binding. ' +
        'Lock key format: template-instantiate-lock:{templateId}:{contextId}. ' +
        'InstantiationAlreadyInProgress emitted if lock is held. CF-23-3.',
      'IR-2: Variable binding substitution at ORDER 2 — resolve ${variable} patterns using bindings map. ' +
        'UnresolvedVariableError emitted if binding required but not provided. CF-23-3.',
      'IR-3: Default value merge at ORDER 3 — populate fields with template-defined defaults ' +
        'after variable binding. User-provided values override template defaults. CF-23-3.',
      'IR-4: storeDocument(form instance) at ORDER 4 BEFORE enqueue(FormInstantiated). DNA-8. CF-23-3.',
      'IR-5: redis.del(lockKey) MUST be called in finally block after all steps complete or fail.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'AcquireInstantiationLock',
          description: 'SETNX lock with key template-instantiate-lock:{templateId}:{contextId}',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'BindVariables',
          description: 'Substitute template variables using provided bindings map',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'MergeDefaults',
          description: 'Populate fields with template defaults; user values override',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'StoreInstance',
          description: 'storeDocument(form instance) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'ReleaseLockAndEmit',
          description: 'redis.del(lockKey) in finally block; enqueue(FormInstantiated)',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1589',
        interfaceName: 'ITemplateInstantiationService',
        fabricType: FabricType.DATABASE,
        description: 'Form instance creation + variable binding',
      },
      {
        factoryId: 'F1590',
        interfaceName: 'IRedisLockService',
        fabricType: FabricType.QUEUE,
        description: 'SETNX lock acquisition + redis.del release',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'FormInstantiated / InstantiationAlreadyInProgress / UnresolvedVariableError event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-23-07',
        description: 'SETNX lock at ORDER 1 before variable binding (IR-1)',
        severity: 'error',
        checkType: 'setnx_lock_before_binding',
      },
      {
        gateId: 'QG-23-08',
        description: 'Variable binding at ORDER 2 before default merge (IR-2)',
        severity: 'error',
        checkType: 'binding_before_defaults',
      },
      {
        gateId: 'QG-23-09',
        description: 'redis.del(lockKey) in finally block (IR-5)',
        severity: 'error',
        checkType: 'redis_del_in_finally',
      },
      {
        gateId: 'QG-23-10',
        description: 'storeDocument(instance) before enqueue(FormInstantiated) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'INSTANTIATION_LOCK_PREFIX',
        value: 'template-instantiate-lock',
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['form_instance', 'instantiation_lock'],
      events: ['form.instantiated', 'instantiation.failed', 'instantiation.already.in.progress'],
      apiRoutes: [],
    },

    machineComponents: [
      'SETNX lock at ORDER 1 with key template-instantiate-lock:{templateId}:{contextId} (CF-23-3)',
      'INSTANTIATION_LOCK_PREFIX = template-instantiate-lock — compile-time constant (CF-23-3)',
      'Variable binding substitution at ORDER 2 — resolve ${variable} patterns (CF-23-3)',
      'Default value merge at ORDER 3 — populate fields from template schema defaults (CF-23-3)',
      'Atomic form instance creation: storeDocument before FormInstantiated enqueue (DNA-8)',
      'redis.del(lockKey) MUST be called in finally block to release lock on any outcome',
    ],

    freedomComponents: [
      'instantiation_timeout_ms — maximum time allowed for instantiation operation',
      'max_unresolved_variables — maximum number of unresolved variables before failure',
    ],
  });
}

// ── T640: TemplateUsageAnalytics ──────────────────────────────────────────────

export function createTemplateUsageAnalyticsContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T640',
    flowId: 'FLOW-23',
    flowName: 'Form Builder Templates',
    name: 'TemplateUsageAnalytics',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by FormInstantiated event (form created from template)',
    purpose:
      'Append-only usage metrics pipeline with PII exclusion and popularity scoring. ' +
      'Metrics storeDocument at ORDER 1 (append-only, never updateDocument) to track template usage: ' +
      'instantiation count, form submission count, avg response time. PII exclusion at ORDER 2 — ' +
      'user input values are NOT stored; only metadata (field types, submission success/failure) recorded. ' +
      'Popularity scoring at ORDER 3 — templates are ranked by instantiation+submission frequency ' +
      'relative to age. Analytics data remains PRIVATE per tenant. UsageMetricsRecorded emitted ' +
      'at ORDER 4 to enable downstream analytics queries. CF-23-4.',
    distinctFrom: 'T639 TemplateInstantiationEngine (T639 creates instances; T640 records metrics)',

    ironRules: [
      'IR-1: Append-only metrics storeDocument at ORDER 1 — never updateDocument on usage records. ' +
        'Each instantiation/submission creates a new metrics record. CF-23-4.',
      'IR-2: PII exclusion at ORDER 2 — user form input values NOT stored in metrics. ' +
        'Only metadata recorded: field types, submission status, response time, success/failure. CF-23-4.',
      'IR-3: Popularity scoring at ORDER 3 — rank templates by (instantiation_count + submission_count) ' +
        '/ template_age_days. Recent high-usage templates score higher. CF-23-4.',
      'IR-4: All metrics remain PRIVATE knowledgeScope per tenant — no cross-tenant leakage. CF-23-4.',
      'IR-5: enqueue(UsageMetricsRecorded) at ORDER 4 after all metrics stored — enables downstream ' +
        'analytics pipelines to process usage data. CF-23-4.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'StoreUsageMetrics',
          description: 'Append-only storeDocument(usage metrics) — never updateDocument',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ExcludePiiValues',
          description: 'Filter user input values from metrics; store only metadata',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'ComputePopularityScore',
          description: 'Rank template by (instantiation+submission) / age_days',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'EmitUsageMetricsRecorded',
          description: 'enqueue(UsageMetricsRecorded) to enable downstream analytics',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1591',
        interfaceName: 'ITemplateAnalyticsService',
        fabricType: FabricType.DATABASE,
        description: 'Usage metrics storage + popularity scoring',
      },
      {
        factoryId: 'F1592',
        interfaceName: 'IPiiFilterService',
        fabricType: FabricType.DATABASE,
        description: 'PII exclusion + metadata extraction',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'UsageMetricsRecorded event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-23-11',
        description: 'Append-only metrics: storeDocument only, never updateDocument (IR-1)',
        severity: 'error',
        checkType: 'append_only_metrics',
      },
      {
        gateId: 'QG-23-12',
        description: 'PII exclusion: user form values NOT stored, only metadata (IR-2)',
        severity: 'error',
        checkType: 'pii_exclusion',
      },
      {
        gateId: 'QG-23-13',
        description: 'Popularity scoring computed from instantiation+submission counts (IR-3)',
        severity: 'warning',
        checkType: 'popularity_score_computed',
      },
    ],

    machineConstants: [
      {
        key: 'PII_EXCLUDED_FIELDS',
        value: ['formData', 'userInput', 'values', 'responseData'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['usage_metrics', 'popularity_scores'],
      events: ['metrics.recorded', 'popularity.updated'],
      apiRoutes: [],
    },

    machineComponents: [
      'Append-only metrics: storeDocument(usage record) per instantiation/submission — never update (CF-23-4)',
      'PII_EXCLUDED_FIELDS = [formData, userInput, values, responseData] — compile-time constant (CF-23-4)',
      'PII exclusion at ORDER 2: filter user input values, retain only metadata (CF-23-4)',
      'Popularity score at ORDER 3: (instantiation_count + submission_count) / age_days (CF-23-4)',
      'Metrics PRIVATE knowledgeScope per tenant — no cross-tenant analytics leakage (CF-23-4)',
      'UsageMetricsRecorded emitted to enable downstream analytics pipelines',
    ],

    freedomComponents: [
      'popularity_recompute_interval_hours — how often to recompute popularity scores',
      'min_instantiations_for_analytics — minimum instantiations before template appears in analytics',
      'age_weighting_factor — how much template age affects popularity score',
    ],
  });
}

/**
 * Contract descriptors for engine-bootstrapper.ts injection
 */
export const FORM_BUILDER_TEMPLATES_NEW_CONTRACT_DESCRIPTORS = [
  createTemplateSchemaValidatorContract(),
  createTemplateVersionPublisherContract(),
  createTemplateInstantiationEngineContract(),
  createTemplateUsageAnalyticsContract(),
];
