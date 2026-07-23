/**
 * FLOW-21 Engine Contracts — Dynamic Forms & Workflows
 *
 * T629  FormSchemaPublisher           archetype: VALIDATION (OCC DRAFT→PUBLISHED, immutable schema)
 * T630  FormSubmissionProcessor       archetype: DATA_PIPELINE (BOLA check, validation against schema)
 * T631  AutomationDispatcher          archetype: ORCHESTRATION (SETNX rule locks, conditional dispatch)
 * T632  SubmissionAnalyticsCollector  archetype: DATA_PIPELINE (append-only, PII exclusion, tenant scope)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-5: Tenant scope via AsyncLocalStorage. Fabric providers read TenantContext internally. No tenantId parameter.
 * DNA-8: Outbox pattern — storeDocument() BEFORE enqueue().
 *
 * T-number note: Remapped to T629-T632 per CLAUDE.md artifact boundary to avoid collision.
 * Factory note: F1569-F1576 per CLAUDE.md boundary.
 *
 * CF-21-1: T629 schema publishing via OCC with immutable published version
 * CF-21-2: T630 BOLA check + validation against published schema only
 * CF-21-3: T631 SETNX rule locks + conditional branching + outbox pattern
 * CF-21-4: T632 append-only analytics with PII exclusion + tenant scope
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const DYNAMIC_FORMS_WORKFLOWS_NEW_TASK_TYPES = ['T629', 'T630', 'T631', 'T632'] as const;

// ── T629: FormSchemaPublisher ──────────────────────────────────────────────

export function createFormSchemaPublisherContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T629',
    flowId: 'FLOW-21',
    flowName: 'Dynamic Forms & Workflows',
    name: 'FormSchemaPublisher',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by SchemaPublishRequested event (form builder publishes schema)',
    purpose:
      'Form schema publishing via Optimistic Concurrency Control (OCC). Transitions schema from DRAFT to PUBLISHED state. ' +
      'Published schemas are immutable — field structure cannot change. Field-level validation rules must exist in schema before publish. ' +
      'New schema versions created as separate documents (version=N+1, status=DRAFT). OCC prevents concurrent publishes of same schema. ' +
      'Prevents client-server schema drift.',
    distinctFrom:
      'T630 FormSubmissionProcessor (T629 publishes schema; T630 validates submissions against published schema). ' +
      'T631 AutomationDispatcher (T629 publishes rules; T631 executes rules on submissions).',

    ironRules: [
      'IR-1: OCC via storeDocumentWithOCC(schema, version, expectedVersion). ' +
        'Expected version must match current schema version before publish. CF-21-1.',
      'IR-2: Schema DRAFT state: field structure mutable, rules editable. ' +
        'Schema PUBLISHED state: schema.fields immutable, no updates to published version. CF-21-1.',
      'IR-3: All field validation rules must exist in schema before DRAFT→PUBLISHED transition. ' +
        'Empty validation rule set blocks publish (emit SchemaPublishFailed). CF-21-1.',
      'IR-4: On successful publish: emit SchemaPublished with schemaId, version, publishedAt, fieldCount. CF-21-1.',
      'IR-5: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'FetchSchemaWithVersion',
          description: 'Retrieve current schema draft using getDocumentWithVersion()',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ValidateFieldRules',
          description: 'Ensure all fields have validation rules defined; reject if empty',
          ironRuleRef: 'IR-3',
        },
        {
          order: 3,
          name: 'TransitionToPUBLISHED',
          description: 'Update schema status DRAFT→PUBLISHED via storeDocumentWithOCC',
          ironRuleRef: 'IR-2',
        },
        {
          order: 4,
          name: 'EmitSchemaPublished',
          description: 'Queue SchemaPublished event; store publish audit record',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1569',
        interfaceName: 'IFormSchemaRepository',
        fabricType: FabricType.DATABASE,
        description:
          'Schema document storage with OCC support — getDocumentWithVersion, storeDocumentWithOCC',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SchemaPublished / SchemaPublishFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-21-01',
        description: 'OCC on schema publish — concurrent publishes prevented (CF-21-1)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-02',
        description: 'All field validation rules exist before DRAFT→PUBLISHED (IR-3)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-03',
        description: 'Published schema is immutable — no updates to published version (IR-2)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['form_schema'],
      events: ['schema.published', 'schema.publish.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'OCC on schema publish — expectedVersion must match current version (CF-21-1)',
      'DRAFT→PUBLISHED state transition via storeDocumentWithOCC (IR-2)',
      'All field validation rules must exist before publish (IR-3)',
      'Published schemas are immutable (IR-2)',
      'tenantId from ALS only (DNA-5)',
    ],

    freedomComponents: [
      'schema_publish_timeout_ms — max time for schema fetch + publish operation',
      'schema_validation_rule_required — if true, publish blocked if rules empty (IR-3)',
    ],
  });
}

// ── T630: FormSubmissionProcessor ──────────────────────────────────────────

export function createFormSubmissionProcessorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T630',
    flowId: 'FLOW-21',
    flowName: 'Dynamic Forms & Workflows',
    name: 'FormSubmissionProcessor',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by FormSubmitted event (user submits form)',
    purpose:
      'Form submission processing with BOLA (Broken Object Level Authorization) check. ' +
      'Submitter tenantId (from ALS) MUST match form.tenantId — prevents submission to forms in other tenants. ' +
      'Validates submission data against the published (immutable) form schema. Each field in submission must match schema definition ' +
      '(type, required, constraints). Validation failures returned as DataProcessResult.success with error array (never failure). ' +
      'Outbox pattern: store submission before emitting downstream events.',
    distinctFrom:
      'T629 FormSchemaPublisher (T630 reads published schema; T629 publishes schema). ' +
      'T631 AutomationDispatcher (T630 validates submission; T631 dispatches automation rules).',

    ironRules: [
      'IR-1: BOLA check at ORDER 1: submitterTenantId from ALS === form.tenantId. ' +
        'Mismatch → emit SubmissionRejected with UNAUTHORIZED. CF-21-2.',
      'IR-2: Validate submission against published schema only (immutable version). ' +
        'Schema validation rules must exist and be applied field-by-field. CF-21-2.',
      'IR-3: Validation failures returned as DataProcessResult.success({valid: false, errors: [...]}) — never failure(). ' +
        'Allows client to display validation errors without exception flow. DNA-4.',
      'IR-4: tenantId from ALS only — never from event or form payload. DNA-5.',
      'IR-5: Store submission before emitting SubmissionProcessed or SubmissionRejected (outbox pattern). DNA-8.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'BolaMCheck',
          description: 'Compare submitterTenantId (from ALS) with form.tenantId',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'FetchPublishedSchema',
          description: 'Retrieve published (PUBLISHED status) schema version',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'ValidateFields',
          description: 'Validate each submission field against schema field definition',
          ironRuleRef: 'IR-2',
        },
        {
          order: 4,
          name: 'StoreSubmission',
          description: 'Store submission record before emitting downstream events (outbox)',
          ironRuleRef: 'IR-5',
        },
        {
          order: 5,
          name: 'EmitEvent',
          description:
            'Emit SubmissionProcessed (valid) or SubmissionRejected (invalid/unauthorized)',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1570',
        interfaceName: 'IFormSchemaRepository',
        fabricType: FabricType.DATABASE,
        description: 'Fetch published schema for validation',
      },
      {
        factoryId: 'F1571',
        interfaceName: 'IFormSubmissionRepository',
        fabricType: FabricType.DATABASE,
        description: 'Store validated submission with status (ACCEPTED|REJECTED)',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SubmissionProcessed / SubmissionRejected emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-21-04',
        description: 'BOLA check at ORDER 1 — submitterTenantId === form.tenantId (CF-21-2)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-05',
        description: 'Validation against published schema only (IR-2)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-06',
        description: 'Validation errors returned as success, never failure (IR-3)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-07',
        description: 'Submission stored before events emitted (outbox, DNA-8)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['form_submission'],
      events: ['submission.processed', 'submission.rejected'],
      apiRoutes: [],
    },

    machineComponents: [
      'BOLA check at ORDER 1: submitterTenantId === form.tenantId (CF-21-2)',
      'Validate against published schema only (CF-21-2)',
      'Validation errors as success response with error array (IR-3)',
      'Store submission before emitting events (DNA-8)',
      'tenantId from ALS only (DNA-5)',
    ],

    freedomComponents: [
      'submission_validation_timeout_ms — max time for schema fetch + validation',
      'submission_max_field_count — reject if submission has more fields than schema',
    ],
  });
}

// ── T631: AutomationDispatcher ─────────────────────────────────────────────

export function createAutomationDispatcherContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T631',
    flowId: 'FLOW-21',
    flowName: 'Dynamic Forms & Workflows',
    name: 'AutomationDispatcher',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by SubmissionProcessed event (valid submission ready for automation)',
    purpose:
      'Automation rule engine dispatch with atomicity guarantees. Rules are conditionally executed based on submission data. ' +
      'SETNX(rule-exec-lock:{submissionId}:{ruleId}) ensures only one concurrent execution per rule per submission (idempotency). ' +
      'Rule conditions evaluate submission fields (e.g., if amount > 100, dispatch action-A; else action-B). ' +
      'Supports multi-path branching and conditional event emission. Outbox pattern: submission stored before rule dispatch.',
    distinctFrom:
      'T630 FormSubmissionProcessor (T630 validates; T631 dispatches on valid submission). ' +
      'T632 SubmissionAnalyticsCollector (T631 executes automation; T632 collects metrics).',

    ironRules: [
      'IR-1: SETNX(rule-exec-lock:{submissionId}:{ruleId}) at ORDER 1. ' +
        'Lock held → return idempotency response (rule already executed). Lock acquired → execute rule. CF-21-3.',
      'IR-2: Rule condition evaluated against submission data fields. Condition: {field, operator, value}. ' +
        'True → execute action-A; False → execute action-B (multi-path). CF-21-3.',
      'IR-3: Rule actions: emit event, call webhook, transform data, store record. ' +
        'Actions are queued; execution order per rule definition. CF-21-3.',
      'IR-4: Store submission before dispatching any rules (outbox pattern). ' +
        'If dispatch fails, submission record still exists for replay/audit. DNA-8.',
      'IR-5: tenantId from ALS only. Rule.tenantId must match submitterTenantId. CF-21-3.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'AcquireRuleExecLock',
          description: 'SETNX(rule-exec-lock:{submissionId}:{ruleId})',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'EvaluateCondition',
          description: 'Evaluate rule.condition against submission data (field, operator, value)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'DispatchAction',
          description: 'Queue rule actions (emit event, webhook, transform, store)',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'StoreRuleExecution',
          description: 'Record rule execution with condition result + action outcomes',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'ReleaseRuleExecLock',
          description: 'DELETE rule-exec-lock (or let TTL expire)',
          ironRuleRef: 'IR-1',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1572',
        interfaceName: 'IRuleEngineRepository',
        fabricType: FabricType.DATABASE,
        description: 'Rule definitions — fetch rules for given formId',
      },
      {
        factoryId: 'F1573',
        interfaceName: 'IRedisLockService',
        fabricType: FabricType.DATABASE,
        description: 'SETNX rule execution locks with TTL',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'Rule action events (conditional emission)',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-21-08',
        description: 'SETNX rule exec locks prevent duplicate execution (CF-21-3)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-09',
        description: 'Rule conditions evaluated for multi-path branching (IR-2)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-10',
        description: 'Rule actions queued after submission stored (outbox, DNA-8)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['automation_rule'],
      events: ['rule.executed', 'rule.condition.true', 'rule.condition.false'],
      apiRoutes: [],
    },

    machineComponents: [
      'SETNX(rule-exec-lock) at ORDER 1 for idempotency (CF-21-3)',
      'Rule condition evaluation for multi-path dispatch (IR-2)',
      'Conditional event emission based on condition result (IR-3)',
      'Rule execution stored before lock release (IR-4)',
      'tenantId from ALS; rule.tenantId must match (CF-21-3)',
    ],

    freedomComponents: [
      'rule_exec_lock_ttl_seconds — TTL for rule execution locks (default 60s)',
      'rule_condition_timeout_ms — max time for condition evaluation',
      'rule_max_action_count — max actions per rule',
    ],
  });
}

// ── T632: SubmissionAnalyticsCollector ─────────────────────────────────────

export function createSubmissionAnalyticsCollectorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T632',
    flowId: 'FLOW-21',
    flowName: 'Dynamic Forms & Workflows',
    name: 'SubmissionAnalyticsCollector',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by SubmissionProcessed event (submission available for metrics)',
    purpose:
      'Append-only submission analytics aggregation. Collects metrics: submission count, average field count, validation error rate. ' +
      'Tenant-scoped aggregation — each tenant can only see its own metrics. PII exclusion: email, phone, ssn, password NEVER indexed. ' +
      'Records are immutable (insert only, no updates). Date-windowed partitioning (daily, hourly) for efficient time-series queries. ' +
      'No cross-tenant data visibility.',
    distinctFrom:
      'T630 FormSubmissionProcessor (T630 validates; T632 analyzes after validation). ' +
      'T631 AutomationDispatcher (T631 executes rules; T632 collects metrics).',

    ironRules: [
      'IR-1: Append-only storage — analytics records inserted once, never updated. ' +
        'Aggregation windows (daily, hourly) partition data by tenantId, formId, dateWindow. CF-21-4.',
      'IR-2: PII exclusion — email, phone, ssn, password, creditCard NEVER stored in analytics index. ' +
        'Only analytics-safe fields indexed: status, fieldCount, validationErrors, submittedAt, formId. CF-21-4.',
      'IR-3: Tenant-scoped aggregation: all queries filtered by tenantId from ALS. ' +
        'Cross-tenant query attempt blocked at query layer. DNA-5.',
      'IR-4: Aggregation: count submissions per formId per day, avg field count, error rate %. ' +
        'Stored as separate aggregate document (not per-submission). CF-21-4.',
      'IR-5: Date partitioning: xiigen-submission-analytics-{DATE}. Query windows (TODAY, WEEK, MONTH) map to date ranges. CF-21-4.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ExtractAnalyticFields',
          description: 'Filter analytics-safe fields from submission; exclude PII',
          ironRuleRef: 'IR-2',
        },
        {
          order: 2,
          name: 'DetermineAggregationWindow',
          description: 'Calculate dateWindow (TODAY, WEEK, MONTH) and partition date',
          ironRuleRef: 'IR-5',
        },
        {
          order: 3,
          name: 'AppendAnalyticsRecord',
          description: 'Insert analytics record (append only, no update)',
          ironRuleRef: 'IR-1',
        },
        {
          order: 4,
          name: 'UpdateAggregateMetrics',
          description: 'Fetch aggregate doc for dateWindow; increment count, update avg',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'StoreAggregateDocument',
          description: 'Store updated aggregate (or insert new if first submission in window)',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1574',
        interfaceName: 'IAnalyticsRepository',
        fabricType: FabricType.DATABASE,
        description:
          'Analytics record storage with append-only semantics and date partitioning. searchDocuments with tenant + date filters.',
      },
      {
        factoryId: 'F1575',
        interfaceName: 'IAggregateMetricsService',
        fabricType: FabricType.DATABASE,
        description: 'Aggregate metric fetch + update for count, avg, error-rate',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-21-11',
        description: 'Append-only analytics — no updates to analytics records (CF-21-4)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-12',
        description: 'PII exclusion — email, phone, ssn, password never in analytics (CF-21-4)',
        severity: 'error',
        checkType: 'named_check',
      },
      {
        gateId: 'QG-21-13',
        description: 'Tenant-scoped aggregation — all queries filtered by tenantId (DNA-5)',
        severity: 'error',
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['submission_analytics'],
      events: ['analytics.recorded', 'metrics.aggregated'],
      apiRoutes: [],
    },

    machineComponents: [
      'Append-only storage — insert only, no updates (CF-21-4)',
      'PII exclusion — email, phone, ssn, password, creditCard not indexed (CF-21-4)',
      'Tenant-scoped queries via tenantId from ALS (DNA-5)',
      'Date-windowed partitioning for efficient time-series (CF-21-4)',
      'Aggregate metrics: count, avg field count, error rate % (IR-4)',
    ],

    freedomComponents: [
      'analytics_pii_fields — comma-separated list of fields to exclude from analytics (email,phone,ssn,password,creditCard)',
      'analytics_aggregation_window — default window for metrics (day|week|month)',
      'analytics_storage_retention_days — how long to keep analytics records',
    ],
  });
}

/**
 * Contract factories — return functions that create contracts on demand.
 * Used by engine-bootstrapper.ts to populate ENGINE_CONTRACTS array.
 */
export const DYNAMIC_FORMS_WORKFLOWS_NEW_CONTRACT_FACTORIES = [
  () => createFormSchemaPublisherContract(),
  () => createFormSubmissionProcessorContract(),
  () => createAutomationDispatcherContract(),
  () => createSubmissionAnalyticsCollectorContract(),
] as const;

/**
 * Contract descriptors for registry seeding.
 * Maps task type ID → name + flowId for FlowRegistryService.
 */
export const DYNAMIC_FORMS_WORKFLOWS_NEW_CONTRACT_DESCRIPTORS = [
  { taskTypeId: 'T629', name: 'FormSchemaPublisher', flowId: 'FLOW-21', version: 'v1' },
  { taskTypeId: 'T630', name: 'FormSubmissionProcessor', flowId: 'FLOW-21', version: 'v1' },
  { taskTypeId: 'T631', name: 'AutomationDispatcher', flowId: 'FLOW-21', version: 'v1' },
  { taskTypeId: 'T632', name: 'SubmissionAnalyticsCollector', flowId: 'FLOW-21', version: 'v1' },
];
