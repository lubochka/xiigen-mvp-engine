import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const CMS_PUBLISHING_NEW_TASK_TYPES = ['T633', 'T634', 'T635', 'T636'] as const;

export function createContentVersionPublisherContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T633',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    name: 'ContentVersionPublisher',
    archetype: ContractArchetype.STATE_MACHINE,
    entry: 'Triggered by ContentPublishRequested event',
    purpose: 'Atomic OCC state transition from DRAFT or PENDING_REVIEW to PUBLISHED.',
    distinctFrom: 'T634 ContentApprovalWorkflow',
    ironRules: ['IR-1: OCC enabled via versionNumber field. CF-22-1.'],
    executionOrder: { steps: [] },
    factoryDependencies: [
      {
        factoryId: 'F1577',
        interfaceName: 'IContentVersionService',
        fabricType: FabricType.DATABASE,
        description: 'Versioned content repository',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-22-01',
        description: 'OCC via versionNumber',
        severity: 'error',
        checkType: 'named_check',
      },
    ],
    bfaRegistration: {
      entities: ['content_version'],
      events: ['content.published'],
      apiRoutes: [],
    },
    machineComponents: ['OCC state transition via versionNumber field'],
    freedomComponents: ['publish.schema.pinned_on_draft'],
  });
}

export function createContentApprovalWorkflowContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T634',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    name: 'ContentApprovalWorkflow',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by ContentVersionDraft event',
    purpose: 'Orchestrate 4 sequential approval stages with role-based gates.',
    distinctFrom: 'T633 ContentVersionPublisher',
    ironRules: ['IR-1: Sequential stage execution — stages never execute in parallel. CF-22-2.'],
    executionOrder: { steps: [] },
    factoryDependencies: [
      {
        factoryId: 'F1580',
        interfaceName: 'IApprovalOrchestrationService',
        fabricType: FabricType.DATABASE,
        description: 'Approval saga orchestration',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-22-05',
        description: 'Sequential stage execution',
        severity: 'error',
        checkType: 'named_check',
      },
    ],
    bfaRegistration: {
      entities: ['approval_gate'],
      events: ['content.approval.complete'],
      apiRoutes: [],
    },
    machineComponents: ['Sequential stage orchestration'],
    freedomComponents: ['approval.stage.validation.roles'],
  });
}

export function createContentScheduleDispatcherContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T635',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    name: 'ContentScheduleDispatcher',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by ContentScheduleRequested event',
    purpose: 'CRON-based future publishing with exactly-once semantics via SETNX lock.',
    distinctFrom: 'T633 ContentVersionPublisher',
    ironRules: ['IR-1: SETNX lock per schedule entry. CF-22-3.'],
    executionOrder: { steps: [] },
    factoryDependencies: [
      {
        factoryId: 'F1581',
        interfaceName: 'IContentScheduleService',
        fabricType: FabricType.DATABASE,
        description: 'Schedule saga storage',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-22-09',
        description: 'SETNX idempotency lock',
        severity: 'error',
        checkType: 'named_check',
      },
    ],
    bfaRegistration: {
      entities: ['publish_schedule'],
      events: ['content.schedule.confirmed'],
      apiRoutes: [],
    },
    machineComponents: ['SETNX lock per schedule entry'],
    freedomComponents: ['publish.schedule.ttl_minutes'],
  });
}

export function createContentAnalyticsAggregatorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T636',
    flowId: 'FLOW-22',
    flowName: 'CMS Publishing',
    name: 'ContentAnalyticsAggregator',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by ContentViewed and ContentEngaged events',
    purpose: 'Append-only content analytics without user PII exposure.',
    distinctFrom: 'T633–T635',
    ironRules: ['IR-1: Append-only metric records — no update or delete path. CF-22-4.'],
    executionOrder: { steps: [] },
    factoryDependencies: [
      {
        factoryId: 'F1583',
        interfaceName: 'IContentAnalyticsService',
        fabricType: FabricType.DATABASE,
        description: 'Append-only analytics storage',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-22-12',
        description: 'Append-only analytics',
        severity: 'error',
        checkType: 'named_check',
      },
    ],
    bfaRegistration: { entities: ['analytics_metric'], events: ['metric.recorded'], apiRoutes: [] },
    machineComponents: ['Append-only metric records'],
    freedomComponents: ['analytics.metric.retention_days'],
  });
}

export const CMS_PUBLISHING_NEW_CONTRACT_DESCRIPTORS = [
  createContentVersionPublisherContract(),
  createContentApprovalWorkflowContract(),
  createContentScheduleDispatcherContract(),
  createContentAnalyticsAggregatorContract(),
] as const;
