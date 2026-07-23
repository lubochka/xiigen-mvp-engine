/**
 * FLOW-11 Engine Contracts — Schema Registry & DAG
 *
 * T189  SchemaRegistrationGateway     archetype: TRANSACTION
 * T190  SchemaVersionManager          archetype: VALIDATION (inline)
 * T191  DagCycleDetector              archetype: VALIDATION (inline)
 * T192  DagDependencyTracker          archetype: DATA_PIPELINE (@EventPattern)
 * T193  SchemaCompatibilityChecker    archetype: VALIDATION (inline)
 * T194  SchemaPublisher               archetype: TRANSACTION (OCC)
 * T195  SchemaIndexManager            archetype: SCHEDULED
 * T196  SchemaVersionReader           archetype: VALIDATION
 * T197  DagTopologyBuilder            archetype: DATA_PIPELINE
 * T198  SchemaSearchService           archetype: DATA_PIPELINE
 * T199  DagRenderGateway              archetype: DATA_PIPELINE
 * T200  SchemaDeprecationManager      archetype: ORCHESTRATION
 * T201  SchemaHistoryTracker          archetype: DATA_PIPELINE
 * T202  SchemaApprovalWorkflow        archetype: ORCHESTRATION
 * T203  SchemaMigrationOrchestrator   archetype: ORCHESTRATION
 * T204  DagConflictDetector           archetype: VALIDATION (inline)
 * T205  SchemaValidationService       archetype: VALIDATION
 * T206  SchemaQualityAnalyzer         archetype: SCHEDULED
 * T207  SchemaExportService           archetype: DATA_PIPELINE
 * T208  DagVisualizationGateway       archetype: ROUTING
 *
 * Ownership model: NAMESPACE_ISOLATION
 *   - Schema records:        knowledgeScope = 'PRIVATE'
 *   - Training corpus:       knowledgeScope = 'GLOBAL'
 */

export const SCHEMA_REGISTRY_DAG_TASK_TYPES = [
  'T189',
  'T190',
  'T191',
  'T192',
  'T193',
  'T194',
  'T195',
  'T196',
  'T197',
  'T198',
  'T199',
  'T200',
  'T201',
  'T202',
  'T203',
  'T204',
  'T205',
  'T206',
  'T207',
  'T208',
] as const;

/** NAMESPACE_ISOLATION: schema records are tenant-private; training corpus is global. */
export const SCHEMA_REGISTRY_DAG_OWNERSHIP_MODEL = 'NAMESPACE_ISOLATION' as const;

/** All T189-T208 contract descriptors for engine-bootstrapper registration. */
export const SCHEMA_REGISTRY_DAG_CONTRACT_DESCRIPTORS: Array<{
  taskTypeId: string;
  name: string;
  flowId: string;
  version: string;
}> = [
  { taskTypeId: 'T189', name: 'SchemaRegistrationGateway', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T190', name: 'SchemaVersionManager', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T191', name: 'DagCycleDetector', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T192', name: 'DagDependencyTracker', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T193', name: 'SchemaCompatibilityChecker', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T194', name: 'SchemaPublisher', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T195', name: 'SchemaIndexManager', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T196', name: 'SchemaVersionReader', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T197', name: 'DagTopologyBuilder', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T198', name: 'SchemaSearchService', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T199', name: 'DagRenderGateway', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T200', name: 'SchemaDeprecationManager', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T201', name: 'SchemaHistoryTracker', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T202', name: 'SchemaApprovalWorkflow', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T203', name: 'SchemaMigrationOrchestrator', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T204', name: 'DagConflictDetector', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T205', name: 'SchemaValidationService', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T206', name: 'SchemaQualityAnalyzer', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T207', name: 'SchemaExportService', flowId: 'FLOW-11', version: 'v1' },
  { taskTypeId: 'T208', name: 'DagVisualizationGateway', flowId: 'FLOW-11', version: 'v1' },
];
