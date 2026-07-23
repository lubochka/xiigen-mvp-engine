/**
 * FLOW-13 — Data Warehouse & Analytics Engine
 * Task Types: T169–T188 (20 task types)
 *
 * CRITICAL CONSTRAINTS FOR THIS ENTIRE FILE:
 *   1. F426 does NOT exist. T187 is an INLINE service (inlineInvokes: ["T187"]).
 *      Never reference F426. Never inject T187 via factory.
 *   2. PLATFORM-ONLY factories — tenants CANNOT disable:
 *      F392, F394, F411, F412, F422, F423, F424, F425
 *   3. Task type range: T169–T188 exactly. No T189+, no T168-.
 *
 * DNA-1: No typed business models — Record<string,unknown>.
 * DNA-3: Returns DataProcessResult.
 */

import {
  SecurityGateSpec,
  IrreversibleOperationSpec,
  BackpressureSpec,
  SchemaEvolutionPolicySpec,
} from './contract-schema';

/**
 * Lightweight FLOW-13 contract descriptor.
 * These contracts capture the essential metadata and constraints for
 * data warehouse task types. Full EngineContract scaffolding is deferred
 * until Wave 3 task-type ID pre-allocation is complete.
 */
export interface Flow13Contract {
  taskTypeId: string;
  flowId: string;
  name: string;
  archetype: string;
  version: string;
  ironRules: string[];
  emits: string[];
  inlineInvokes?: string[];
  multiLayerSecurityGate?: SecurityGateSpec;
  irreversibleOperation?: IrreversibleOperationSpec;
  backpressure?: BackpressureSpec;
  schemaEvolutionPolicy?: SchemaEvolutionPolicySpec;
  crossFlowReadDependencies?: string[];
}

export const T169Contract: Flow13Contract = {
  taskTypeId: 'T169',
  flowId: 'FLOW-13',
  name: 'WarehouseIngestionOrchestrator',
  archetype: 'ingestor',
  version: 'v1.0.0',
  backpressure: {
    service: 'IBatchQueueService',
    method: 'getDepth',
    depthConfigKey: 'warehouse.ingestion.maxQueueDepth',
    onThresholdExceeded: {
      action: 'reject',
      emit: 'warehouse.ingestion.backpressure_rejected',
      reason: 'Queue depth threshold exceeded. Batch rejected.',
    },
  },
  ironRules: [
    'batchId MUST be derived from hash of: tenantId + sourceFlowId + eventWindowStart + eventWindowEnd',
    'IBatchQueueService.getDepth() MUST be called BEFORE IBatchQueueService.enqueue()',
    'If depth >= threshold: call IBatchQueueService.reject() + emit backpressure event + return',
    'DNA-7: Deduplicate on batchId before processing',
    'DNA-8: storeDocument() BEFORE enqueue()',
    'IWarehouseAuditService (F425) MUST record every ingestion operation',
    'PLATFORM-ONLY: F425 IWarehouseAuditService cannot be disabled',
  ],
  emits: [
    'warehouse.event.normalised',
    'warehouse.ingestion.duplicate',
    'warehouse.ingestion.backpressure_rejected',
  ],
};

export const T170Contract: Flow13Contract = {
  taskTypeId: 'T170',
  flowId: 'FLOW-13',
  name: 'EventNormalizationPipeline',
  archetype: 'ingestor',
  version: 'v1.0.0',
  ironRules: [
    'Normalize raw events into canonical warehouse format',
    'Emit EventNormalised on completion',
    'tenantId must be preserved through normalization — never stripped',
    'Failed normalization must emit a dead-letter event, not throw',
  ],
  emits: ['warehouse.event.normalised'],
};

export const T171Contract: Flow13Contract = {
  taskTypeId: 'T171',
  flowId: 'FLOW-13',
  name: 'SchemaRegistryManager',
  archetype: 'schema_registry',
  version: 'v1.0.0',
  schemaEvolutionPolicy: {
    additive: {
      changes: ['add_optional_field', 'add_new_type', 'expand_enum'],
      approval: 'auto_approved',
    },
    breaking: {
      changes: ['remove_field', 'change_field_type', 'rename_field', 'restrict_enum'],
      approval: 'explicit_tenant_required',
      onRejected: 'warehouse.schema.evolution.rejected',
    },
  },
  ironRules: [
    'classifyEvolution() MUST be called before any schema mutation',
    'ADDITIVE changes: auto-approved, emit SchemaRegistered with changeType=ADDITIVE',
    'BREAKING changes: block until explicit tenant approval received',
    'On tenant rejection of breaking change: emit SchemaEvolutionRejected',
    'Never apply a breaking change without tenant approval',
  ],
  emits: ['warehouse.schema.registered', 'warehouse.schema.evolution.rejected'],
};

export const T172Contract: Flow13Contract = {
  taskTypeId: 'T172',
  flowId: 'FLOW-13',
  name: 'DeduplicationEngine',
  archetype: 'ingestor',
  version: 'v1.0.0',
  ironRules: [
    'DNA-7: All deduplication uses idempotency keys',
    'On duplicate detected: emit DuplicateIngestionDetected and return — do not process',
    'Idempotency key includes batchId + tenantId',
  ],
  emits: ['warehouse.ingestion.duplicate'],
};

export const T173Contract: Flow13Contract = {
  taskTypeId: 'T173',
  flowId: 'FLOW-13',
  name: 'QueryExecutionEngine',
  archetype: 'query_engine',
  version: 'v1.0.0',
  /**
   * T187 QuotaManager is an INLINE service. F426 does NOT exist.
   * T187 is instantiated directly in T173's constructor — NOT via @Inject().
   * Do not generate factory injection for T187. Never reference F426.
   */
  inlineInvokes: ['T187'],
  multiLayerSecurityGate: {
    appliedBeforeAction: 'executeQuery',
    layers: [
      {
        order: 1,
        service: 'T187',
        type: 'INLINE_SERVICE',
        action: 'QuotaManager.check()',
        onFail: {
          emit: 'query.failed',
          reason: 'quota_exceeded',
          returnImmediately: true,
        },
        note: 'T187 is INLINE — not factory injected. F426 does NOT exist.',
      },
      {
        order: 2,
        service: 'IRowLevelSecurityService',
        type: 'PLATFORM_ONLY_FACTORY',
        action: 'F422.apply()',
        onFail: {
          emit: 'query.failed',
          reason: 'rls_denied',
          returnImmediately: true,
        },
        canBeDisabled: false,
        noOptOut: true,
      },
      {
        order: 3,
        service: 'IPIIMaskingService',
        type: 'PLATFORM_ONLY_FACTORY',
        action: 'F423.mask()',
        onFail: {
          emit: 'query.failed',
          reason: 'masking_error',
          returnImmediately: true,
        },
        canBeDisabled: false,
        noOptOut: true,
        note: 'PII masking MUST run BEFORE result serialization. No skipMasking flags accepted.',
      },
    ],
  },
  ironRules: [
    'GATE ORDER IS MANDATORY: T187 quota (layer 1) → F422 RLS (layer 2) → F423 PII masking (layer 3)',
    'T187 is INLINE — instantiated in T173 constructor. NOT factory-injected. F426 does NOT exist.',
    'F422 IRowLevelSecurityService is PLATFORM-ONLY — cannot be disabled by tenant',
    'F423 IPIIMaskingService is PLATFORM-ONLY — PII masking runs BEFORE serialization, no opt-out',
    'All joins must be tenant-scoped: include tenantId in every cross-flow join predicate',
    'IWarehouseAuditService (F425) records every query operation',
    'On any gate failure: emit QueryFailed with correct reason enum, return immediately',
  ],
  emits: ['query.failed'],
};

export const T174Contract: Flow13Contract = {
  taskTypeId: 'T174',
  flowId: 'FLOW-13',
  name: 'MetricAggregationEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Aggregation windows must include eventWindowStart and eventWindowEnd',
    'All metric aggregations are tenant-scoped — never cross-tenant',
    'Emit MetricAggregated on completion',
  ],
  emits: ['warehouse.metric.aggregated'],
};

export const T175Contract: Flow13Contract = {
  taskTypeId: 'T175',
  flowId: 'FLOW-13',
  name: 'KPIDashboardGenerator',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'KPI values are tenant-scoped',
    'alertFired must be computed based on configured thresholds (FREEDOM config)',
    'Emit KPISnapshotGenerated on completion',
  ],
  emits: ['warehouse.kpi.snapshot'],
};

export const T176Contract: Flow13Contract = {
  taskTypeId: 'T176',
  flowId: 'FLOW-13',
  name: 'CohortAnalysisEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Cohort definitions are tenant-scoped — no cross-tenant cohort membership',
    'All cross-flow data joins must include tenantId predicate',
    'Emit CohortAnalysisGenerated on completion',
  ],
  emits: ['warehouse.cohort.analysis'],
};

export const T177Contract: Flow13Contract = {
  taskTypeId: 'T177',
  flowId: 'FLOW-13',
  name: 'FunnelAnalysisEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Funnel steps must be ordered and tenant-scoped',
    'conversionRate is computed as converted / entered, bounded [0, 1]',
    'Emit FunnelAnalysisGenerated on completion',
  ],
  emits: ['warehouse.funnel.analysis'],
};

export const T178Contract: Flow13Contract = {
  taskTypeId: 'T178',
  flowId: 'FLOW-13',
  name: 'RetentionCohortAnalyzer',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Retention cohorts are tenant-scoped',
    'periodDays must match configured retention window (FREEDOM config)',
    'Emit RetentionCohortGenerated on completion',
  ],
  emits: ['warehouse.retention.cohort'],
};

export const T179Contract: Flow13Contract = {
  taskTypeId: 'T179',
  flowId: 'FLOW-13',
  name: 'ReportScheduler',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'scheduleAt must be in the future at time of scheduling',
    'Report configurations are FREEDOM config — tenant-editable',
    'DNA-8: storeDocument() BEFORE enqueue() for scheduled report jobs',
    'Emit ReportScheduled on successful scheduling',
  ],
  emits: ['warehouse.report.scheduled'],
};

export const T180Contract: Flow13Contract = {
  taskTypeId: 'T180',
  flowId: 'FLOW-13',
  name: 'CrossFlowCorrelationEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Cross-flow joins MUST include tenantId in every predicate — no cross-tenant correlation',
    'sourceFlows must list all flows contributing data (minimum 2)',
    'All cross-flow reads must be read-only — never mutate source flow data',
    'Emit CrossFlowCorrelationReported on completion',
  ],
  emits: ['warehouse.crossflow.correlation'],
};

export const T181Contract: Flow13Contract = {
  taskTypeId: 'T181',
  flowId: 'FLOW-13',
  name: 'DataExportEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'F411 IExportEncryptionService (PLATFORM-ONLY) — all exports encrypted, no bypass',
    'F412 IExportAuditService (PLATFORM-ONLY) — every export logged, no bypass',
    'F423 IPIIMaskingService (PLATFORM-ONLY) — PII masked before export, no opt-out',
    'downloadUrl in DataExportReady must have an expiry (expiresAt)',
    'Emit DataExportReady on completion',
  ],
  emits: ['warehouse.export.ready'],
};

export const T182Contract: Flow13Contract = {
  taskTypeId: 'T182',
  flowId: 'FLOW-13',
  name: 'TrainingDatasetBuilder',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Training datasets are tenant-scoped — no cross-tenant data leakage',
    'F423 IPIIMaskingService (PLATFORM-ONLY) runs before dataset export',
    'featureCount and rowCount must be accurate — validated before emitting',
    'Emit TrainingDatasetReady on completion',
  ],
  emits: ['warehouse.training.dataset'],
};

export const T183Contract: Flow13Contract = {
  taskTypeId: 'T183',
  flowId: 'FLOW-13',
  name: 'AlertingRulesEngine',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Alert rules are FREEDOM config — tenant-configurable',
    'Alert evaluation is tenant-scoped',
    'Alert emission must include tenantId',
  ],
  emits: [],
};

export const T184Contract: Flow13Contract = {
  taskTypeId: 'T184',
  flowId: 'FLOW-13',
  name: 'QueryOptimizationAdvisor',
  archetype: 'query_engine',
  version: 'v1.0.0',
  ironRules: [
    'Optimization suggestions are read-only — no query execution',
    'Suggestions scoped to tenant query patterns only',
    'T187 quota check is NOT required for advisor (read-only, no warehouse execution)',
  ],
  emits: [],
};

export const T185Contract: Flow13Contract = {
  taskTypeId: 'T185',
  flowId: 'FLOW-13',
  name: 'DataLineageTracker',
  archetype: 'schema_registry',
  version: 'v1.0.0',
  ironRules: [
    'Lineage records are immutable — never update, only append',
    'All lineage records include tenantId',
    'Cross-flow lineage entries must identify source flow explicitly',
  ],
  emits: [],
};

export const T186Contract: Flow13Contract = {
  taskTypeId: 'T186',
  flowId: 'FLOW-13',
  name: 'DataRetentionEnforcer',
  archetype: 'retention',
  version: 'v1.0.0',
  crossFlowReadDependencies: ['FLOW-11'],
  irreversibleOperation: {
    action: 'purgeContent',
    requiresApprovalToken: true,
    tokenValidationService: 'IApprovalService',
    onMissingToken: 'REJECT_WITHOUT_PURGING',
    payloadConstraint: {
      emit: 'DataPurged',
      allowedFields: ['tombstoneRef', 'tenantId', 'contentId', 'purgedAt', 'policyId'],
      prohibitedFields: ['rawContent', 'content', 'payload', 'body', 'data'],
    },
  },
  ironRules: [
    'EXECUTION ORDER IS MANDATORY AND INVIOLABLE:',
    '  1. ILegalHoldService.check() — if holdStatus.active === true: emit ContentRetentionExtended, return',
    '  2. IApprovalService.validate() — if token missing/invalid/expired: reject without purging, return',
    '  3. IDataGovernanceService (F424) enforceRetention() — get purge decision',
    '  4. Execute purge — emit DataPurged with tombstoneRef ONLY',
    'DataPurged event MUST contain tombstoneRef. PROHIBITED fields: rawContent, content, payload',
    'F424 IDataGovernanceService is PLATFORM-ONLY — governance policies not tenant-editable',
    'Cross-flow read from FLOW-11: ILegalHoldService reads FLOW-11 legal hold records',
    'IWarehouseAuditService (F425) MUST record every purge attempt (including rejected ones)',
    'Emit ContentRetentionExtended when legal hold blocks purge',
  ],
  emits: ['warehouse.content.retention.extended'],
};

export const T187Contract: Flow13Contract = {
  taskTypeId: 'T187',
  flowId: 'FLOW-13',
  name: 'QuotaManager',
  archetype: 'query_engine',
  version: 'v1.0.0',
  ironRules: [
    'T187 is an INLINE SERVICE — it has no factory ID. F426 does NOT exist.',
    'T187 is instantiated directly in T173 QueryExecutionEngine constructor',
    'Do NOT generate @Inject() or factory resolution for T187',
    'quota check must run BEFORE warehouse read (enforced by T173 multiLayerSecurityGate layer 1)',
    'recordUsage() must be called AFTER successful query execution',
    'Emit QueryQuotaUpdated when quota limits change',
  ],
  emits: ['warehouse.quota.updated'],
};

export const T188Contract: Flow13Contract = {
  taskTypeId: 'T188',
  flowId: 'FLOW-13',
  name: 'WarehouseHealthMonitor',
  archetype: 'analytics_engine',
  version: 'v1.0.0',
  ironRules: [
    'Health monitoring is read-only — no mutations',
    'Health checks are tenant-scoped',
    'IWarehouseAuditService (F425) is NOT required for health check reads (audit for write ops only)',
  ],
  emits: [],
};

/** Export array for registration in engine-bootstrapper.ts */
export const FLOW13_CONTRACTS: Flow13Contract[] = [
  T169Contract,
  T170Contract,
  T171Contract,
  T172Contract,
  T173Contract,
  T174Contract,
  T175Contract,
  T176Contract,
  T177Contract,
  T178Contract,
  T179Contract,
  T180Contract,
  T181Contract,
  T182Contract,
  T183Contract,
  T184Contract,
  T185Contract,
  T186Contract,
  T187Contract,
  T188Contract,
];
