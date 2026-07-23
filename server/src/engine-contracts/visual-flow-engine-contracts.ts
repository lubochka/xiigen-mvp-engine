/**
 * FLOW-18 Engine Contracts — Visual Flow Creation & Code Injection Engine (new services T617-T620)
 *
 * T617  FlowCanvasWriter              archetype: VISUAL_CREATION  (BOLA + FLOW_IMMUTABLE guard on published state)
 * T618  FlowPublicationOrchestrator   archetype: ORCHESTRATION    (DFS cycle detection + type compatibility + OCC DRAFT→PUBLISHED)
 * T619  NodeTypeRegistrar             archetype: VALIDATION       (atomic dual-write + SETNX before both + redis.del in catch)
 * T620  CodeInjectionProcessor        archetype: CODE_INJECTION   (version lock + pre-write audit + append-only)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * T-number note: Original design documents reference T233-T236, but those collide with
 *   FLOW-14 etl-data-integration-contracts.ts (T213-T224). Remapped to T617-T620.
 * Factory note: Design documents reference F258-F264, but those collide with FLOW-07.
 *   Remapped to F1547-F1553 per CLAUDE.md boundary.
 *
 * CF-18-1: T617 BOLA ORDER 1 + FLOW_IMMUTABLE ORDER 2 — DRAFT→PUBLISHED one-way guard
 * CF-18-2: T618 DFS cycle detection ORDER 1 + type compatibility ORDER 2 + OCC DRAFT→PUBLISHED
 * CF-18-3: T619 SETNX before both writes + redis.del in catch on failure
 * CF-18-4: T620 version lock ORDER 1 + pre-write audit ORDER 2 + append-only injection audit
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const VISUAL_FLOW_ENGINE_NEW_TASK_TYPES = ['T617', 'T618', 'T619', 'T620'] as const;

// ── T617: FlowCanvasWriter ────────────────────────────────────────────────────

export function createFlowCanvasWriterContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T617',
    flowId: 'FLOW-18',
    flowName: 'Visual Flow Creation & Code Injection Engine',
    name: 'FlowCanvasWriter',
    archetype: ContractArchetype.VISUAL_CREATION,
    entry: 'Triggered by FlowCanvasUpdateRequested event (user edits a visual flow canvas)',
    purpose:
      'Two-guard canvas write gate. BOLA at ORDER 1 verifies the requesting tenant owns this flow canvas ' +
      '(flow.tenantId === ALS.tenantId). FLOW_IMMUTABLE guard at ORDER 2 ensures the flow is still in DRAFT ' +
      'state — published flows cannot be modified. DRAFT→PUBLISHED is a one-way state transition. ' +
      'CF-18-1.',
    distinctFrom:
      'T618 FlowPublicationOrchestrator (T617 writes canvas content; T618 orchestrates publication with cycle detection)',

    ironRules: [
      'IR-1: BOLA check (flow.tenantId === ALS.tenantId) at ORDER 1 — before any state check or write. ' +
        'Cross-tenant canvas hijacking rejected immediately. CF-18-1.',
      'IR-2: FLOW_IMMUTABLE guard (flow.status !== PUBLISHED) at ORDER 2 — after BOLA, before write. ' +
        'FlowImmutableRejected emitted on published flow write attempt. CF-18-1.',
      'IR-3: Canvas write (storeDocument or updateDocument) at ORDER 3 — only if DRAFT state confirmed. ' +
        'No write attempt on PUBLISHED flows. CF-18-1.',
      'IR-4: storeDocument(audit) at ORDER 4 BEFORE enqueue(FlowCanvasUpdated). DNA-8. CF-18-1.',
      'IR-5: FlowCanvasUpdated emitted at ORDER 5 only after all guards pass.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'BolaCheck',
          description: 'Validate flow.tenantId === ALS.tenantId — BOLA guard',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'FlowImmutableGuard',
          description: 'Check flow.status !== PUBLISHED — FLOW_IMMUTABLE guard',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'CanvasWrite',
          description: 'storeDocument or updateDocument canvas — only if DRAFT confirmed',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitFlowCanvasUpdated',
          description: 'enqueue(FlowCanvasUpdated) — only after all guards pass',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1547',
        interfaceName: 'IFlowCanvasService',
        fabricType: FabricType.DATABASE,
        description: 'Flow canvas read for BOLA + state check + canvas CRUD',
      },
      {
        factoryId: 'F1548',
        interfaceName: 'ICanvasAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Canvas write audit trail — PRIVATE per tenant',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'FlowCanvasUpdated / FlowCanvasUpdateFailed / FlowImmutableRejected event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-18-01',
        description: 'BOLA at ORDER 1 before FLOW_IMMUTABLE (IR-1)',
        severity: 'error',
        checkType: 'bola_before_immutable_guard',
      },
      {
        gateId: 'QG-18-02',
        description: 'FLOW_IMMUTABLE at ORDER 2 before any write (IR-2)',
        severity: 'error',
        checkType: 'immutable_guard_before_write',
      },
      {
        gateId: 'QG-18-03',
        description: 'storeDocument(audit) before enqueue(FlowCanvasUpdated) (IR-4, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'FLOW_IMMUTABLE_STATES',
        value: ['PUBLISHED'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['flow_canvas', 'canvas_audit'],
      events: ['flow.canvas.updated', 'flow.canvas.update.failed', 'flow.immutable.rejected'],
      apiRoutes: [],
    },

    machineComponents: [
      'BOLA check at ORDER 1 — flow.tenantId === ALS.tenantId (CF-18-1)',
      'FLOW_IMMUTABLE_STATES = [PUBLISHED] — compile-time constant (CF-18-1)',
      'FLOW_IMMUTABLE guard at ORDER 2 — no write to PUBLISHED flows (CF-18-1)',
      'Canvas write (storeDocument/updateDocument) at ORDER 3 — DRAFT only (CF-18-1)',
      'Outbox: storeDocument(audit) before FlowCanvasUpdated enqueue (DNA-8)',
      'FlowImmutableRejected emitted on published flow write attempt',
    ],

    freedomComponents: [
      'flow_canvas_max_nodes — maximum number of nodes allowed in a single flow canvas',
      'flow_canvas_max_edges — maximum number of edges allowed in a single flow canvas',
    ],
  });
}

// ── T618: FlowPublicationOrchestrator ─────────────────────────────────────────

export function createFlowPublicationOrchestratorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T618',
    flowId: 'FLOW-18',
    flowName: 'Visual Flow Creation & Code Injection Engine',
    name: 'FlowPublicationOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by FlowPublicationRequested event (user initiates flow publication)',
    purpose:
      'Flow publication orchestrator with DFS cycle detection and type compatibility per-edge. ' +
      'DFS cycle detection (WHITE/GRAY/BLACK coloring) at ORDER 1 — cyclic graphs cannot be deployed. ' +
      'Type compatibility per-edge at ORDER 2 — source output schema must match target input schema. ' +
      'OCC DRAFT→PUBLISHED state transition at ORDER 3 — prevents double-publication race. ' +
      'CycleDetected emitted on cycle. TypeMismatch emitted on edge incompatibility. CF-18-2.',
    distinctFrom:
      'T617 FlowCanvasWriter (T617 writes canvas content; T618 orchestrates the publication pipeline with validation)',

    ironRules: [
      'IR-1: DFS cycle detection (WHITE/GRAY/BLACK) at ORDER 1 — before any type check or write. ' +
        'GRAY node re-visit = cycle. CycleDetected emitted, no further processing. CF-18-2.',
      'IR-2: Type compatibility per-edge at ORDER 2 — source output schema compatible with target input schema. ' +
        'TypeMismatch emitted with edge details on incompatibility. CF-18-2.',
      'IR-3: OCC updateDocument(status:PUBLISHED, expectedVersion) at ORDER 3 — NOT plain storeDocument. ' +
        'OCC_CONFLICT → emit FlowPublicationConflict. CF-18-2.',
      'IR-4: storeDocument(audit) at ORDER 4 BEFORE FlowPublished emit. DNA-8. CF-18-2.',
      'IR-5: FlowPublished emitted at ORDER 5 only after all validation and OCC write succeed.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'DfsCycleDetection',
          description: 'DFS WHITE/GRAY/BLACK cycle detection — CycleDetected on cycle found',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'TypeCompatibilityCheck',
          description: 'Per-edge type compatibility — source output schema vs target input schema',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'OccPublish',
          description:
            'OCC updateDocument(status:PUBLISHED, expectedVersion) — FlowPublicationConflict on conflict',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before emit',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'EmitFlowPublished',
          description: 'enqueue(FlowPublished) — only after all validation and OCC write succeed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1547',
        interfaceName: 'IFlowCanvasService',
        fabricType: FabricType.DATABASE,
        description: 'Flow canvas read for cycle detection + type check + OCC publish write',
      },
      {
        factoryId: 'F1549',
        interfaceName: 'IFlowPublicationAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Publication audit trail — PRIVATE per tenant',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'FlowPublished / CycleDetected / TypeMismatch / FlowPublicationConflict emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-18-04',
        description: 'DFS cycle detection at ORDER 1 before type check (IR-1)',
        severity: 'error',
        checkType: 'dfs_before_type_check',
      },
      {
        gateId: 'QG-18-05',
        description: 'Type compatibility per-edge at ORDER 2 (IR-2)',
        severity: 'error',
        checkType: 'type_compatibility_per_edge',
      },
      {
        gateId: 'QG-18-06',
        description: 'OCC updateDocument not plain storeDocument (IR-3)',
        severity: 'error',
        checkType: 'occ_publish',
      },
    ],

    machineConstants: [
      {
        key: 'DFS_COLORS',
        value: ['WHITE', 'GRAY', 'BLACK'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['flow_canvas', 'publication_audit'],
      events: [
        'flow.published',
        'flow.cycle.detected',
        'flow.type.mismatch',
        'flow.publication.conflict',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'DFS cycle detection WHITE/GRAY/BLACK at ORDER 1 — GRAY re-visit = cycle (CF-18-2)',
      'Type compatibility per-edge at ORDER 2 — schema-driven validation (CF-18-2)',
      'OCC updateDocument(status:PUBLISHED) at ORDER 3 — not plain storeDocument (CF-18-2)',
      'CycleDetected emitted with cycleNodes payload on cycle found',
      'TypeMismatch emitted with edge + schema details on incompatibility',
      'Outbox: storeDocument(audit) before FlowPublished enqueue (DNA-8)',
    ],

    freedomComponents: [
      'flow_max_node_depth — maximum DFS depth before aborting cycle detection',
      'flow_type_compatibility_strict — whether strict schema matching is enforced',
    ],
  });
}

// ── T619: NodeTypeRegistrar ───────────────────────────────────────────────────

export function createNodeTypeRegistrarContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T619',
    flowId: 'FLOW-18',
    flowName: 'Visual Flow Creation & Code Injection Engine',
    name: 'NodeTypeRegistrar',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by NodeTypeRegistrationRequested event (operator registers a new node type)',
    purpose:
      'Atomic dual-write node type registrar. SETNX(node-type-reg-lock:{nodeTypeId}) at ORDER 1 prevents ' +
      'concurrent duplicate registrations. Both writes (node type record + capability index entry) must ' +
      'succeed in sequence at ORDER 2 and ORDER 3. If either write fails, redis.del(lockKey) is called in ' +
      'the catch block to release the lock — prevents hung lock state. CF-18-3.',
    distinctFrom:
      'T617 FlowCanvasWriter (T617 writes canvas content; T619 registers reusable node type definitions)',

    ironRules: [
      'IR-1: SETNX(node-type-reg-lock:{nodeTypeId}) at ORDER 1 before either write. ' +
        'NodeTypeAlreadyExists emitted on lock held. CF-18-3.',
      'IR-2: storeDocument(nodeType, GLOBAL) at ORDER 2 — first of the dual write. ' +
        'If this fails, redis.del(lockKey) in catch. CF-18-3.',
      'IR-3: storeDocument(capabilityIndex) at ORDER 3 — second of the dual write. ' +
        'If this fails, redis.del(lockKey) in catch. CF-18-3.',
      'IR-4: redis.del(lockKey) MUST be called in catch block on any write failure. ' +
        'Missing redis.del = hung lock = future registrations permanently blocked. CF-18-3.',
      'IR-5: storeDocument(audit) at ORDER 4 BEFORE NodeTypeRegistered emit. DNA-8.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'SetnxRegistrationLock',
          description:
            'SETNX(node-type-reg-lock:{nodeTypeId}) — NodeTypeAlreadyExists on lock held',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'WriteNodeTypeRecord',
          description: 'storeDocument(nodeType, GLOBAL) — first of dual write',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'WriteCapabilityIndex',
          description: 'storeDocument(capabilityIndex) — second of dual write; redis.del in catch',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-5',
        },
        {
          order: 5,
          name: 'EmitNodeTypeRegistered',
          description: 'enqueue(NodeTypeRegistered) — only after dual write succeeds',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1550',
        interfaceName: 'INodeTypeService',
        fabricType: FabricType.DATABASE,
        description: 'Node type CRUD + capability index dual write',
      },
      {
        factoryId: 'F1551',
        interfaceName: 'INodeTypeAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Node type registration audit trail',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'NodeTypeRegistered / NodeTypeAlreadyExists / NodeTypeRegistrationFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-18-07',
        description: 'SETNX at ORDER 1 before either write (IR-1)',
        severity: 'error',
        checkType: 'setnx_before_writes',
      },
      {
        gateId: 'QG-18-08',
        description: 'redis.del(lockKey) in catch block on write failure (IR-4)',
        severity: 'error',
        checkType: 'redis_del_in_catch',
      },
      {
        gateId: 'QG-18-09',
        description: 'storeDocument(audit) before NodeTypeRegistered enqueue (IR-5, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'NODE_TYPE_LOCK_PREFIX',
        value: 'node-type-reg-lock',
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['node_type', 'capability_index', 'node_type_audit'],
      events: ['node.type.registered', 'node.type.already.exists', 'node.type.registration.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'NODE_TYPE_LOCK_PREFIX = node-type-reg-lock — compile-time constant (CF-18-3)',
      'SETNX(node-type-reg-lock:{nodeTypeId}) at ORDER 1 before either write (CF-18-3)',
      'Dual write: storeDocument(nodeType) at ORDER 2, storeDocument(capabilityIndex) at ORDER 3 (CF-18-3)',
      'redis.del(lockKey) in catch block — prevents hung lock on failure (CF-18-3)',
      'Outbox: storeDocument(audit) before NodeTypeRegistered enqueue (DNA-8)',
    ],

    freedomComponents: [
      'node_type_max_capabilities — maximum capabilities per node type',
      'node_type_lock_ttl_ms — TTL for node type registration lock',
    ],
  });
}

// ── T620: CodeInjectionProcessor ──────────────────────────────────────────────

export function createCodeInjectionProcessorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T620',
    flowId: 'FLOW-18',
    flowName: 'Visual Flow Creation & Code Injection Engine',
    name: 'CodeInjectionProcessor',
    archetype: ContractArchetype.CODE_INJECTION,
    entry: 'Triggered by CodeInjectionRequested event (AI-generated code ready for injection)',
    purpose:
      'Code injection processor with version lock and append-only audit. ' +
      'Version lock at ORDER 1 — InjectionConflict on concurrent injection of same version. ' +
      'Pre-write audit (rollback pointer) storeDocument at ORDER 2 BEFORE injection. ' +
      'Inject code at ORDER 3. Append-only injection result audit at ORDER 4. ' +
      'No updateDocument on any injection audit record — NON-REPUDIATION trail. ' +
      'Extends NON-REPUDIATION-AUDIT-001 from FLOW-16. CF-18-4.',
    distinctFrom:
      'T618 FlowPublicationOrchestrator (T618 publishes flow definitions; T620 injects AI-generated code into nodes)',

    ironRules: [
      'IR-1: Version lock acquisition at ORDER 1 — InjectionConflict on version already locked. ' +
        'Lock key = injection-version-lock:{nodeId}:{version}. CF-18-4.',
      'IR-2: Pre-write audit storeDocument at ORDER 2 — BEFORE injection code runs. ' +
        'This record is the rollback pointer — audit exists even if injection fails. CF-18-4.',
      'IR-3: Inject code at ORDER 3 — after lock and pre-write audit confirmed. ' +
        'Injection payload applied to node target. CF-18-4.',
      'IR-4: Append-only audit: never updateDocument on injection audit records. ' +
        'Each phase (PRE_WRITE, COMPLETE, FAILED) creates a new storeDocument. CF-18-4.',
      'IR-5: storeDocument(result audit) at ORDER 4 BEFORE enqueue(CodeInjected). DNA-8.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'AcquireVersionLock',
          description: 'injection-version-lock:{nodeId}:{version} — InjectionConflict on lock held',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'PreWriteAudit',
          description:
            'storeDocument(preWriteAudit, phase:PRE_WRITE) — rollback pointer before injection',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'InjectCode',
          description: 'Apply injection payload to node target',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'ResultAuditWrite',
          description:
            'storeDocument(resultAudit, phase:COMPLETE) — append-only; DNA-8 before emit',
          ironRuleRef: 'IR-5',
        },
        {
          order: 5,
          name: 'EmitCodeInjected',
          description: 'enqueue(CodeInjected) — only after result audit confirmed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1552',
        interfaceName: 'ICodeInjectionService',
        fabricType: FabricType.DATABASE,
        description: 'Code injection CRUD + version lock management',
      },
      {
        factoryId: 'F1553',
        interfaceName: 'IInjectionAuditService',
        fabricType: FabricType.DATABASE,
        description: 'Append-only injection audit trail — NON-REPUDIATION',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CodeInjected / InjectionConflict / InjectionFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-18-10',
        description: 'Version lock at ORDER 1 before any write (IR-1)',
        severity: 'error',
        checkType: 'version_lock_before_write',
      },
      {
        gateId: 'QG-18-11',
        description: 'Pre-write audit at ORDER 2 BEFORE injection (IR-2)',
        severity: 'error',
        checkType: 'pre_write_audit_before_injection',
      },
      {
        gateId: 'QG-18-12',
        description: 'No updateDocument on injection audit records (IR-4)',
        severity: 'error',
        checkType: 'append_only_audit',
      },
    ],

    machineConstants: [
      {
        key: 'INJECTION_LOCK_PREFIX',
        value: 'injection-version-lock',
        type: 'constant',
        neverFromConfig: true,
      },
      {
        key: 'INJECTION_AUDIT_PHASES',
        value: ['PRE_WRITE', 'COMPLETE', 'FAILED'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['code_injection', 'injection_lock', 'injection_audit'],
      events: ['code.injected', 'injection.conflict', 'injection.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'INJECTION_LOCK_PREFIX = injection-version-lock — compile-time constant (CF-18-4)',
      'INJECTION_AUDIT_PHASES = [PRE_WRITE, COMPLETE, FAILED] — compile-time (CF-18-4)',
      'Version lock at ORDER 1 — concurrent injection of same version blocked (CF-18-4)',
      'Pre-write audit (rollback pointer) at ORDER 2 BEFORE injection (CF-18-4)',
      'Append-only audit: no updateDocument on injection audit records (CF-18-4)',
      'Extends NON-REPUDIATION-AUDIT-001 from FLOW-16',
      'Outbox: storeDocument(result audit) before CodeInjected enqueue (DNA-8)',
    ],

    freedomComponents: [
      'injection_lock_ttl_ms — TTL for injection version lock',
      'injection_max_payload_size_kb — maximum injection payload size in kilobytes',
    ],
  });
}

// ── Contract factories array (for bootstrapper wiring) ──────────────────────

export const VISUAL_FLOW_ENGINE_NEW_CONTRACT_FACTORIES = [
  createFlowCanvasWriterContract,
  createFlowPublicationOrchestratorContract,
  createNodeTypeRegistrarContract,
  createCodeInjectionProcessorContract,
];

export const VISUAL_FLOW_ENGINE_NEW_CONTRACT_DESCRIPTORS =
  VISUAL_FLOW_ENGINE_NEW_CONTRACT_FACTORIES.map((f) => {
    const c = f();
    return {
      taskTypeId: c.taskTypeId,
      name: c.name,
      flowId: c.flowId,
      version: 'v1',
    };
  });
