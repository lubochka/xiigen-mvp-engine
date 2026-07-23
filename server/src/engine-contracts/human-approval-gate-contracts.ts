import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-27 Engine Contracts — Human Interaction Gate.
 * T413–T422 — 10 task types across 5 archetypes.
 *
 * T413: ApprovalRequestCreator    [ORCHESTRATION] — create + route approval request to human reviewer
 * T414: ApprovalDecisionCapture   [ARBITRATION]   — idempotent setIfAbsent capture of approve/reject decision
 * T415: ApprovalTimeoutHandler    [GOVERNANCE]    — escalation on timeout (thresholds from FREEDOM config)
 * T416: HumanTaskAssigner         [ORCHESTRATION] — assign task to user/group with deadline + priority
 * T417: TaskCompletionTracker     [LEARNING]      — track SLA metrics via queue — never on live path
 * T418: ScheduledTaskTrigger      [BUILD]         — schedule async task trigger (non-blocking, idempotent)
 * T419: ApprovalChainOrchestrator [ORCHESTRATION] — multi-level approval chain (sequential/parallel)
 * T420: ApprovalGateEnforcer       [GUARD]         — hard stop until human approval (no bypass)
 * T421: HumanTaskAuditTrail       [GOVERNANCE]    — insert-only immutable audit trail for all decisions
 * T422: TaskDelegationOrchestrator [ORCHESTRATION] — delegation + reassignment with history preserved
 *
 * Families: 160 (ORCHESTRATION), 161 (ARBITRATION), 162 (GOVERNANCE),
 *           163 (GUARD), 164 (BUILD+LEARNING)
 * Factories: F1103–F1128
 * CF rules:  CF-625–CF-650
 *
 * DNA-1: toDict() via EngineContract.toDict() — Record<string,unknown>.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const HUMAN_APPROVAL_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ───────────────────────────────────────────────────

const HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE = [
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

const HUMAN_APPROVAL_GATE_IRON_RULES_CORE = [
  'NEVER import database/queue client directly — use fabric interfaces',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

// ── ORCHESTRATION — Family-160 ─────────────────────────────────────────────

/**
 * T413 — ApprovalRequestCreator [ORCHESTRATION].
 *
 * PURPOSE: Create and route an approval request to the designated reviewer.
 *          Returns QUEUED immediately — human notification via queue event.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1103: IApprovalRequestStore → DATABASE FABRIC (insert-only approval request)
 * F1104: IApprovalNotifier → QUEUE FABRIC (notifies reviewer via queue event)
 */
export function createT413Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T413',
    flowId: 'FLOW-27',
    name: 'ApprovalRequestCreator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when a workflow step requires human approval before proceeding',
    purpose:
      'Create approval request document and route notification to reviewer via queue; returns QUEUED immediately',
    distinctFrom:
      'T420 (gate enforcement — T413 creates the request, T420 blocks the workflow until decision)',
    familyId: 'Family-160',
    factoryDependencies: [
      {
        factoryId: 'F1103',
        interfaceName: 'IApprovalRequestStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only approval request store — CF-476 tenant scope',
      },
      {
        factoryId: 'F1104',
        interfaceName: 'IApprovalNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Routes reviewer notification after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T413', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['orchestration', 'approval_routing', 'human_gate'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'build::idempotent-trigger'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'returns QUEUED immediately — never blocks for human response',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['approval_request'],
      events: ['human.approval.requested'],
      apiRoutes: ['/api/approvals/request'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
      'Returns QUEUED immediately — NEVER block waiting for human response',
    ],
    machineComponents: ['insert-only request creation', 'outbox ordering'],
    freedomComponents: ['approval_request_ttl_hours', 'reviewer_notification_topic'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

/**
 * T416 — HumanTaskAssigner [ORCHESTRATION].
 *
 * PURPOSE: Assign a human task to a user or group with a deadline and priority.
 *          Assignment stored in DATABASE FABRIC — notification via QUEUE FABRIC.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1107: IHumanTaskStore → DATABASE FABRIC (task assignment store)
 * F1108: ITaskNotifier → QUEUE FABRIC (assignment notification)
 */
export function createT416Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T416',
    flowId: 'FLOW-27',
    name: 'HumanTaskAssigner',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when a workflow creates a human task requiring assignment',
    purpose:
      'Assign human task to user or group with deadline + priority; store in DB first; notify via queue',
    distinctFrom:
      'T413 (approval request — T416 assigns actionable tasks, T413 creates approval checkpoints)',
    familyId: 'Family-160',
    factoryDependencies: [
      {
        factoryId: 'F1107',
        interfaceName: 'IHumanTaskStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Task assignment store — deadline + priority tracked',
      },
      {
        factoryId: 'F1108',
        interfaceName: 'ITaskNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Assignment notification after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T416', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['orchestration', 'task_assignment', 'deadline'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'deadline from FREEDOM config — not hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['human_task'],
      events: ['human.task.assigned'],
      apiRoutes: ['/api/tasks/assign'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
      'Default deadline MUST come from FREEDOM config — not hardcoded',
    ],
    machineComponents: ['task assignment store', 'outbox ordering'],
    freedomComponents: [
      'default_task_deadline_hours',
      'task_notification_topic',
      'priority_levels',
    ],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

/**
 * T419 — ApprovalChainOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Orchestrate multi-level approval chains (sequential or parallel).
 *          Chain config from FREEDOM config — not hardcoded per flow.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1111: IChainStateStore → DATABASE FABRIC (multi-level chain state)
 * F1112: IChainEventEmitter → QUEUE FABRIC (chain step events)
 */
export function createT419Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T419',
    flowId: 'FLOW-27',
    name: 'ApprovalChainOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when a workflow requires multi-level approval (e.g., manager then director)',
    purpose:
      'Orchestrate sequential or parallel approval chains; chain topology from FREEDOM config; persist chain state before events',
    distinctFrom:
      'T413 (single request — T419 coordinates multi-level chains, T413 creates individual requests)',
    familyId: 'Family-160',
    factoryDependencies: [
      {
        factoryId: 'F1111',
        interfaceName: 'IChainStateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Multi-level chain state store — one doc per chain',
      },
      {
        factoryId: 'F1112',
        interfaceName: 'IChainEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits chain step events after state store (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T419', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['orchestration', 'approval_chain', 'multi_level'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 5000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'build::idempotent-trigger'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'chain topology from FREEDOM config — not hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['approval_chain'],
      events: ['human.chain.step.triggered', 'human.chain.completed'],
      apiRoutes: [],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Chain topology MUST come from FREEDOM config — never hardcoded',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['chain state machine', 'sequential/parallel routing'],
    freedomComponents: ['chain_topology_config', 'chain_event_topics', 'parallel_threshold'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

/**
 * T422 — TaskDelegationOrchestrator [ORCHESTRATION].
 *
 * PURPOSE: Handle task delegation and reassignment.
 *          Original assignment preserved — delegation history tracked (insert-only).
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1117: IDelegationStore → DATABASE FABRIC (delegation history store — insert-only)
 * F1118: IDelegationNotifier → QUEUE FABRIC (notifies new assignee)
 */
export function createT422Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T422',
    flowId: 'FLOW-27',
    name: 'TaskDelegationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when an assignee delegates or is reassigned from an approval task',
    purpose:
      'Record delegation with history preserved; notify new assignee via queue; original assignment never deleted',
    distinctFrom:
      'T416 (initial assignment — T422 manages post-assignment delegation, T416 makes initial assignments)',
    familyId: 'Family-160',
    factoryDependencies: [
      {
        factoryId: 'F1117',
        interfaceName: 'IDelegationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only delegation history — original assignment preserved',
      },
      {
        factoryId: 'F1118',
        interfaceName: 'IDelegationNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'New assignee notification after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T422', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['orchestration', 'delegation', 'insert_only'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'delegation history insert-only — original assignment preserved',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['delegation_record'],
      events: ['human.task.delegated'],
      apiRoutes: ['/api/tasks/delegate'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Delegation history MUST be insert-only — original assignment preserved',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['insert-only delegation history'],
    freedomComponents: ['delegation_notification_topic', 'max_delegation_depth'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── ARBITRATION — Family-161 ──────────────────────────────────────────────

/**
 * T414 — ApprovalDecisionCapture [ARBITRATION].
 *
 * PURPOSE: Capture a human approve/reject decision with atomic set-if-not-exists idempotency.
 *          Decision is immutable once captured — no updates allowed.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1105: IDecisionStore → DATABASE FABRIC (setIfAbsent idempotent decision store)
 * F1106: IDecisionEventEmitter → QUEUE FABRIC (emits decision event)
 */
export function createT414Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T414',
    flowId: 'FLOW-27',
    name: 'ApprovalDecisionCapture',
    archetype: ContractArchetype.ARBITRATION,
    entry: 'Triggered when a human submits an approve/reject decision on an approval request',
    purpose:
      'Capture approve/reject decision with atomic set-if-not-exists idempotency (IScopedMemoryService.setIfAbsent()); immutable once written; emit decision event',
    distinctFrom:
      'T421 (audit trail — T414 captures the decision, T421 records it immutably to the audit log)',
    familyId: 'Family-161',
    factoryDependencies: [
      {
        factoryId: 'F1105',
        interfaceName: 'IDecisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description:
          'setIfAbsent idempotent decision store — duplicate calls return existing (IScopedMemoryService.setIfAbsent())',
      },
      {
        factoryId: 'F1106',
        interfaceName: 'IDecisionEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits decision event after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T414', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['arbitration', 'idempotent_decision', 'immutable'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'arbitration', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description:
          'setIfAbsent idempotency — duplicate decisions return existing without re-write (IScopedMemoryService.setIfAbsent())',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'decision immutable once captured — no update path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['approval_decision'],
      events: ['human.decision.captured', 'human.decision.approved', 'human.decision.rejected'],
      apiRoutes: ['/api/approvals/decide'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Decision capture MUST be idempotent — duplicate calls return existing decision. Mechanism: IScopedMemoryService.setIfAbsent() — atomic, no separate check + write',
      'Decision MUST be immutable once captured — no update or delete',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: [
      'setIfAbsent idempotency (IScopedMemoryService)',
      'immutability enforcement',
    ],
    freedomComponents: ['decision_event_topics', 'valid_decision_values'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── GOVERNANCE — Family-162 ───────────────────────────────────────────────

/**
 * T415 — ApprovalTimeoutHandler [GOVERNANCE].
 *
 * PURPOSE: Handle timeout and escalation when no decision is made within the deadline.
 *          Timeout threshold from FREEDOM config — not hardcoded.
 *          Escalation path from FREEDOM config.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1109: ITimeoutEscalationStore → DATABASE FABRIC (escalation records)
 * F1110: IEscalationNotifier → QUEUE FABRIC (escalation notification)
 */
export function createT415Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T415',
    flowId: 'FLOW-27',
    name: 'ApprovalTimeoutHandler',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered by scheduled check when approval deadline is exceeded',
    purpose:
      'Detect overdue approvals, escalate to configured escalation path; threshold + path from FREEDOM config',
    distinctFrom:
      'T420 (gate enforcement — T415 handles escalation on timeout, T420 blocks the workflow)',
    familyId: 'Family-162',
    factoryDependencies: [
      {
        factoryId: 'F1109',
        interfaceName: 'ITimeoutEscalationStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Escalation record store — insert-only timeout events',
      },
      {
        factoryId: 'F1110',
        interfaceName: 'IEscalationNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Sends escalation notification after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T415', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['governance', 'timeout_escalation', 'freedom_config'],
        },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::threshold-freedom'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'timeout threshold from FREEDOM config — not hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'escalation path from FREEDOM config — not hardcoded',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['timeout_escalation'],
      events: ['human.approval.timed_out', 'human.approval.escalated'],
      apiRoutes: [],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Timeout threshold MUST come from FREEDOM config — NEVER hardcoded',
      'Escalation path MUST come from FREEDOM config — NEVER hardcoded',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['overdue detection', 'outbox ordering'],
    freedomComponents: [
      'timeout_threshold_hours',
      'escalation_path_config',
      'escalation_event_topic',
    ],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

/**
 * T421 — HumanTaskAuditTrail [GOVERNANCE].
 *
 * PURPOSE: Insert-only immutable audit trail for all human approval decisions and task events.
 *          Every write is a new document — no updates, no deletes.
 *          CF-476: tenantId required.
 *
 * F1115: IAuditTrailStore → DATABASE FABRIC (insert-only audit log)
 * F1116: IAuditEventEmitter → QUEUE FABRIC (analytics emit)
 */
export function createT421Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T421',
    flowId: 'FLOW-27',
    name: 'HumanTaskAuditTrail',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered on every human task event: assignment, decision, escalation, delegation',
    purpose:
      'Insert-only immutable audit log for all human interaction events; tenant-isolated; analytics emit via queue',
    distinctFrom:
      'T414 (decision capture — T421 records audit entries, T414 captures the decision itself)',
    familyId: 'Family-162',
    factoryDependencies: [
      {
        factoryId: 'F1115',
        interfaceName: 'IAuditTrailStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only audit log — no update or delete paths',
      },
      {
        factoryId: 'F1116',
        interfaceName: 'IAuditEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Analytics event after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T421', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['governance', 'audit_trail', 'immutable'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'audit entries insert-only — no update or delete paths',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: { entities: ['audit_entry'], events: ['human.audit.recorded'], apiRoutes: [] },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Audit entries MUST be insert-only — NEVER update or delete',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['insert-only enforcement', 'tenant isolation'],
    freedomComponents: ['audit_index_name', 'audit_analytics_topic'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── GUARD — Family-163 ────────────────────────────────────────────────────

/**
 * T420 — ApprovalGateEnforcer [GUARD].
 *
 * PURPOSE: Hard gate — workflow is blocked until human approval is captured.
 *          AWAITING_APPROVAL returned if no decision exists.
 *          No bypass mechanism — GATE_BLOCKED is final unless T414 captures a decision.
 *
 * F1113: IDecisionReader → DATABASE FABRIC (reads captured decision)
 * F1114: IGateEventEmitter → QUEUE FABRIC (gate state events)
 */
export function createT420Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T420',
    flowId: 'FLOW-27',
    name: 'ApprovalGateEnforcer',
    archetype: ContractArchetype.GUARD,
    entry: 'Called by workflow to check if a required human approval has been captured',
    purpose:
      'Hard gate: returns GATE_OPEN if approval captured, GATE_BLOCKED/AWAITING_APPROVAL if pending — no bypass',
    distinctFrom:
      'T413 (request creation — T420 enforces the gate, T413 creates the approval request)',
    familyId: 'Family-163',
    factoryDependencies: [
      {
        factoryId: 'F1113',
        interfaceName: 'IDecisionReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads captured approval decision — CF-476 tenant scope',
      },
      {
        factoryId: 'F1114',
        interfaceName: 'IGateEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits gate state event (OPEN/BLOCKED)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T420', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['guard', 'hard_stop', 'approval_gate'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'guard::hard-stop'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'GATE_BLOCKED is hard stop — no bypass mechanism',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'AWAITING_APPROVAL returned when decision not yet captured',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['gate_state'],
      events: ['human.gate.opened', 'human.gate.blocked'],
      apiRoutes: ['/api/approvals/gate-check'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'GATE_BLOCKED is a hard stop — NO bypass mechanism exists on this service',
      'AWAITING_APPROVAL returned when decision document not yet captured by T414',
    ],
    machineComponents: ['hard-stop enforcement', 'decision lookup'],
    freedomComponents: ['gate_event_topics'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── BUILD — Family-164 ────────────────────────────────────────────────────

/**
 * T418 — ScheduledTaskTrigger [BUILD].
 *
 * PURPOSE: Schedule an async task trigger for a future time.
 *          Non-blocking — returns SCHEDULED immediately.
 *          Idempotent: duplicate (tenantId, taskId, scheduledFor) returns existing.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1119: IScheduleStore → DATABASE FABRIC (schedule records)
 * F1120: IScheduleEventEmitter → QUEUE FABRIC (schedule trigger event)
 */
export function createT418Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T418',
    flowId: 'FLOW-27',
    name: 'ScheduledTaskTrigger',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered when a human task needs to fire at a future scheduled time',
    purpose:
      'Schedule async task trigger; idempotent by (tenantId, taskId, scheduledFor); returns SCHEDULED immediately',
    distinctFrom:
      'T416 (immediate assignment — T418 schedules future triggers, T416 assigns tasks now)',
    familyId: 'Family-164',
    factoryDependencies: [
      {
        factoryId: 'F1119',
        interfaceName: 'IScheduleStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Schedule record store — idempotent by compound key',
      },
      {
        factoryId: 'F1120',
        interfaceName: 'IScheduleEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Schedule trigger event after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T418', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['build', 'scheduled_trigger', 'idempotent'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric', 'build::idempotent-trigger'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'idempotent by (tenantId, taskId, scheduledFor) — duplicate returns existing',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'returns SCHEDULED immediately — never blocks',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    bfaRegistration: {
      entities: ['schedule'],
      events: ['human.task.scheduled'],
      apiRoutes: ['/api/tasks/schedule'],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Idempotent by (tenantId, taskId, scheduledFor) — duplicate returns existing SCHEDULED',
      'Returns SCHEDULED immediately — NEVER blocks for trigger time',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['idempotency check', 'outbox ordering'],
    freedomComponents: ['schedule_event_topic', 'max_schedule_horizon_days'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── LEARNING — Family-164 ─────────────────────────────────────────────────

/**
 * T417 — TaskCompletionTracker [LEARNING].
 *
 * PURPOSE: Track SLA compliance and task completion metrics via queue — NEVER on live path.
 *          Metrics emitted to queue only — no inline aggregation.
 *          storeDocument() BEFORE enqueue() (DNA-8).
 *
 * F1121: ICompletionMetricStore → DATABASE FABRIC (completion metric store)
 * F1122: IMetricEventEmitter → QUEUE FABRIC (metrics event — never on live path)
 */
export function createT417Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T417',
    flowId: 'FLOW-27',
    name: 'TaskCompletionTracker',
    archetype: ContractArchetype.LEARNING,
    entry: 'Triggered when a human task is completed or closed',
    purpose:
      'Record task completion with SLA metrics; emit metrics to queue for async aggregation; never computed on live request path',
    distinctFrom:
      'T421 (audit trail — T417 tracks SLA metrics, T421 records all events for compliance audit)',
    familyId: 'Family-164',
    factoryDependencies: [
      {
        factoryId: 'F1121',
        interfaceName: 'ICompletionMetricStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Completion metric store — SLA delta tracked',
      },
      {
        factoryId: 'F1122',
        interfaceName: 'IMetricEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Metrics event after storeDocument — never on live path',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow27', taskType: 'T417', tier: 2 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: { namespace: 'skills', patterns: ['learning', 'sla_metrics', 'async_only'] },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['dna', 'fabric'] },
      },
    ],
    qualityGates: [
      ...HUMAN_APPROVAL_GATE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'metrics via queue only — NEVER aggregated on live path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-06',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    bfaRegistration: {
      entities: ['completion_metric'],
      events: ['human.task.completion.tracked'],
      apiRoutes: [],
    },
    ironRules: [
      ...HUMAN_APPROVAL_GATE_IRON_RULES_CORE,
      'Metrics MUST be emitted to QUEUE only — NEVER aggregated on live request path',
      'storeDocument() MUST be called BEFORE enqueue() (DNA-8)',
    ],
    machineComponents: ['SLA delta calculation', 'outbox ordering'],
    freedomComponents: ['sla_threshold_hours', 'metrics_event_topic'],
    stackCoupling: HUMAN_APPROVAL_STACK_COUPLING,
  });
}

// ── Registry exports ────────────────────────────────────────────────────────

/** All 10 FLOW-27 contract factory functions. */
export const HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES = [
  createT413Contract,
  createT414Contract,
  createT415Contract,
  createT416Contract,
  createT417Contract,
  createT418Contract,
  createT419Contract,
  createT420Contract,
  createT421Contract,
  createT422Contract,
];
