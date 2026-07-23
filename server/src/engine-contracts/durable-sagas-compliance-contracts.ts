/**
 * FLOW-19 Engine Contracts — Durable Sagas & Compliance
 *
 * T621  SagaOrchestrator           archetype: ORCHESTRATION (persist-before-dispatch, storeDocumentWithOCC versionPin:-1, SETNX step lock)
 * T622  CompensationEngine         archetype: ORCHESTRATION (serial LIFO compensation, stop-on-first-failure, idempotent restart)
 * T623  ComplianceAuditWriter      archetype: DATA_PIPELINE (immutability, retentionExpiresAt at write time, append-only PLATFORM_ONLY)
 * T624  DataRetentionEnforcer      archetype: DATA_PIPELINE (dual-gate retention purge, archive-before-delete, dynamic CRON)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * T-number note: Design documents reference T237-T240, remapped to T621-T624
 *   per CLAUDE.md artifact boundary to avoid collision with FLOW-14 and FLOW-17.
 * Factory note: Design documents reference F265-F271, remapped to F1554-F1560
 *   per CLAUDE.md artifact boundary.
 *
 * CF-19-1: T621 storeDocumentWithOCC versionPin:-1 ORDER 1; SETNX step lock before step body; DNA-8
 * CF-19-2: T622 serial LIFO compensation; stop-on-first-failure; SETNX comp-lock per step
 * CF-19-3: T623 append-only compliance records; retentionExpiresAt at write time; PLATFORM_ONLY
 * CF-19-4: T624 dual-gate purge; archive-before-delete; CRON from FREEDOM config
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const DURABLE_SAGAS_COMPLIANCE_TASK_TYPES = ['T621', 'T622', 'T623', 'T624'] as const;

// ── T621: SagaOrchestrator ───────────────────────────────────────────────────

export function createSagaOrchestratorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T621',
    flowId: 'FLOW-19',
    flowName: 'Durable Sagas & Compliance',
    name: 'SagaOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry:
      'Triggered by SagaExecutionRequested event (saga coordinator initiates multi-step transaction)',
    purpose:
      'Persist-before-dispatch durable saga execution. storeDocumentWithOCC(versionPin:-1) at ORDER 1 ' +
      'ensures saga record exists before any step fires. SETNX step lock acquired at ORDER 2 before ' +
      'step body executes — prevents duplicate concurrent step execution. Compensation strategy ' +
      'registered at ORDER 3. Step body executes at ORDER 4. storeDocument(checkpoint) BEFORE ' +
      'enqueue(SagaStepExecuted) at ORDER 5 per DNA-8. On crash replay, OCC conflict returns ' +
      'SagaAlreadyRunning (idempotent). SagaCompleted emitted after final step.',
    distinctFrom:
      'T622 CompensationEngine (T621 executes forward steps; T622 reverses them on failure)',

    ironRules: [
      'IR-1: storeDocumentWithOCC(sagaState, {sagaId, status:RUNNING}, sagaId, {versionPin:-1}) at ORDER 1. ' +
        'OCC conflict → emit SagaAlreadyRunning, return success (idempotent). CF-19-1.',
      'IR-2: SETNX(step-lock:{sagaId}:{stepIndex}) at ORDER 2 BEFORE step body executes. ' +
        'Lock acquired → no concurrent duplicate step execution. CF-19-1.',
      'IR-3: Register compensation strategy at ORDER 3 BEFORE step body — ensures rollback available ' +
        'even if step body crashes. CF-19-1.',
      'IR-4: Execute step body at ORDER 4 — after lock and compensation registration confirmed.',
      'IR-5: storeDocument(checkpoint) at ORDER 5 BEFORE enqueue(SagaStepExecuted). DNA-8. CF-19-1.',
      'IR-6: SagaFailed emitted on step body failure with sagaId, failedStep, compensationStrategy.',
      'IR-7: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'OccInitSaga',
          description:
            'storeDocumentWithOCC(sagaState, {status:RUNNING, versionPin:-1}) — idempotent init',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'AcquireStepLock',
          description: 'SETNX(step-lock:{sagaId}:{stepIndex}) — prevent concurrent step execution',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'RegisterCompensation',
          description: 'Register compensation strategy for this step before body executes',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'ExecuteStepBody',
          description: 'Execute step business logic',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'PersistCheckpoint',
          description: 'storeDocument(checkpoint) BEFORE enqueue(SagaStepExecuted) — DNA-8',
          ironRuleRef: 'IR-5',
        },
        {
          order: 6,
          name: 'EmitStepEvent',
          description:
            'enqueue(SagaStepExecuted) or enqueue(SagaCompleted) after checkpoint confirmed',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1554',
        interfaceName: 'ISagaStateRepository',
        fabricType: FabricType.DATABASE,
        description:
          'Saga state persistence with OCC support — storeDocumentWithOCC(versionPin) for atomic saga init. PLATFORM_ONLY.',
      },
      {
        factoryId: 'F1555',
        interfaceName: 'ISagaStepLockService',
        fabricType: FabricType.DATABASE,
        description:
          'SETNX step-lock provider — acquire step-lock:{sagaId}:{stepIndex} before step body execution.',
      },
      {
        factoryId: 'F1556',
        interfaceName: 'ICompensationRegistry',
        fabricType: FabricType.DATABASE,
        description:
          'Compensation strategy registry — register and retrieve compensation handlers per step.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: { template: 'orchestration', max_tokens: 3200 },
      },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow19.saga-orchestrator.genesis' },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-19-00',
        description: 'All services extend MicroserviceBase (DNA-4)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-19-01',
        description: 'storeDocumentWithOCC versionPin:-1 at ORDER 1 — OCC init guard (CF-19-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-02',
        description: 'SETNX step-lock at ORDER 2 before step body (CF-19-1)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-03',
        description: 'storeDocument BEFORE enqueue on every transition (DNA-8)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['saga_state', 'saga_checkpoint', 'saga_step_lock'],
      events: ['SagaStepExecuted', 'SagaCompleted', 'SagaFailed', 'SagaAlreadyRunning'],
      apiRoutes: [],
    },

    machineComponents: [
      'OCC versionPin:-1 idempotency guard for saga init (CF-19-1)',
      'SETNX step-lock — concurrent step execution prevention',
      'Compensation registration before step body (crash-safe rollback)',
      'Checkpoint persist-before-dispatch (DNA-8 outbox)',
    ],

    freedomComponents: [
      'flow19_saga_max_retries — maximum retry attempts per step',
      'flow19_saga_rto_threshold_ms — RTO compliance threshold in milliseconds',
    ],
  });
}

// ── T622: CompensationEngine ─────────────────────────────────────────────────

export function createCompensationEngineContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T622',
    flowId: 'FLOW-19',
    flowName: 'Durable Sagas & Compliance',
    name: 'CompensationEngine',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by SagaFailed event (saga orchestrator delegates compensation dispatch)',
    purpose:
      'Serial LIFO compensation execution with idempotent restart. Iterates compensationStack in ' +
      'reverse order. SETNX(comp-lock:{sagaId}:{stepIndex}) per step before executing compensation body. ' +
      'stop-on-first-failure: if step N fails, emit CompensationFailed with failedStep, halt. ' +
      'storeDocument(compensationRecord) BEFORE enqueue(CompensationStepExecuted) per DNA-8. ' +
      'compensationStack is immutable after registration. CompensationCompleted emitted after all ' +
      'steps succeed. Idempotent restart: SETNX prevents double-execution on crash replay.',
    distinctFrom:
      'T621 SagaOrchestrator (T621 runs forward steps; T622 runs reverse compensations on failure)',

    ironRules: [
      'IR-1: compensationStack executed in REVERSE order (LIFO) — not insertion order. CF-19-2.',
      'IR-2: Serial execution — no Promise.all, no parallel compensation. CF-19-2.',
      'IR-3: SETNX(comp-lock:{sagaId}:{stepIndex}) BEFORE compensation body — idempotent crash restart. CF-19-2.',
      'IR-4: stop-on-first-failure — emit CompensationFailed with failedStep on ANY step failure. ' +
        'Do NOT continue to remaining compensation steps. CF-19-2.',
      'IR-5: storeDocument(compensationRecord) BEFORE enqueue(CompensationStepExecuted). DNA-8.',
      'IR-6: compensationStack is immutable — no modifications after registration.',
      'IR-7: tenantId from ALS only — never from event payload. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ValidateCompensationStack',
          description:
            'Validate compensationStack is non-empty and all steps have registered strategies',
          ironRuleRef: 'IR-6',
        },
        {
          order: 2,
          name: 'SerialLIFOLoop',
          description: 'Iterate reversed compensationStack serially (LIFO)',
          ironRuleRef: 'IR-1',
        },
        {
          order: 3,
          name: 'AcquireCompLock',
          description: 'SETNX(comp-lock:{sagaId}:{stepIndex}) per step — idempotency guard',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'ExecuteCompensationBody',
          description: 'Execute compensation logic for this step',
          ironRuleRef: 'IR-2',
        },
        {
          order: 5,
          name: 'PersistCompensationRecord',
          description: 'storeDocument(compensationRecord) BEFORE emit per step — DNA-8',
          ironRuleRef: 'IR-5',
        },
        {
          order: 6,
          name: 'EmitOrFail',
          description:
            'enqueue(CompensationStepExecuted) on success; emit CompensationFailed and halt on failure',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1556',
        interfaceName: 'ICompensationRegistry',
        fabricType: FabricType.DATABASE,
        description:
          'Compensation strategy registry — retrieve registered handlers per step for LIFO execution.',
      },
      {
        factoryId: 'F1555',
        interfaceName: 'ISagaStepLockService',
        fabricType: FabricType.DATABASE,
        description:
          'SETNX comp-lock provider — acquire comp-lock:{sagaId}:{stepIndex} before compensation body.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: { template: 'orchestration', max_tokens: 3200 },
      },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow19.compensation-engine.genesis' },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-19-10',
        description: 'Compensation stack executes in LIFO reverse order (CF-19-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-11',
        description: 'Serial execution — no parallel compensation (CF-19-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-12',
        description: 'SETNX comp-lock per step before compensation body (CF-19-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-13',
        description:
          'stop-on-first-failure: halt and emit CompensationFailed on any step failure (CF-19-2)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['saga_compensation', 'saga_comp_lock'],
      events: ['CompensationStepExecuted', 'CompensationCompleted', 'CompensationFailed'],
      apiRoutes: [],
    },

    machineComponents: [
      'LIFO reverse-order iteration over compensationStack (CF-19-2)',
      'Serial execution loop — no Promise.all or parallel dispatch',
      'SETNX comp-lock per step — idempotent crash restart',
      'stop-on-first-failure halt semantics',
    ],

    freedomComponents: ['flow19_compensation_timeout_ms — per-step compensation timeout'],
  });
}

// ── T623: ComplianceAuditWriter ──────────────────────────────────────────────

export function createComplianceAuditWriterContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T623',
    flowId: 'FLOW-19',
    flowName: 'Durable Sagas & Compliance',
    name: 'ComplianceAuditWriter',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by ComplianceAuditRequested event (saga step emits compliance requirement)',
    purpose:
      'Immutable compliance record persistence with tamper-detection hash and retention window. ' +
      'retentionExpiresAt = writtenAt + flow19_compliance_retention_days (FREEDOM config, never hardcoded). ' +
      'auditHash = SHA-256(tenantId + sagaId + eventType + writtenAt) for tamper detection. ' +
      'Records stored in xiigen-compliance-records (PLATFORM_ONLY, append-only). ' +
      'No updateDocument or deleteDocument on compliance index. ' +
      'storeDocument at ORDER 3 BEFORE enqueue(ComplianceRecordWritten) per DNA-8.',
    distinctFrom:
      'T624 DataRetentionEnforcer (T623 writes compliance records; T624 purges expired records after dual-gate)',

    ironRules: [
      'IR-1: retentionExpiresAt computed at write time from FREEDOM config key ' +
        'flow19_compliance_retention_days — NEVER hardcoded, NEVER deferred. CF-19-3.',
      "IR-2: auditHash = SHA-256([tenantId, sagaId, eventType, writtenAt].join(':')) at ORDER 2. CF-19-3.",
      'IR-3: storeDocument(xiigen-compliance-records, record, auditId) at ORDER 3 — append-only, ' +
        'PLATFORM_ONLY. NO updateDocument ever on compliance index. CF-19-3.',
      'IR-4: storeDocument at ORDER 3 BEFORE enqueue(ComplianceRecordWritten) at ORDER 4. DNA-8.',
      'IR-5: knowledgeScope: PLATFORM_ONLY in every stored compliance record. CF-19-3.',
      'IR-6: ComplianceWriteFailed emitted on storeDocument failure — never silent drop.',
      'IR-7: tenantId from ALS only. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ComputeRetentionExpiry',
          description:
            'retentionExpiresAt = writtenAt + FREEDOM config flow19_compliance_retention_days',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'ComputeAuditHash',
          description: 'auditHash = SHA-256(tenantId:sagaId:eventType:writtenAt)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'AppendComplianceRecord',
          description:
            'storeDocument(xiigen-compliance-records, record, auditId) — PLATFORM_ONLY, append-only',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'EmitComplianceWritten',
          description: 'enqueue(ComplianceRecordWritten) — after store confirmed',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1557',
        interfaceName: 'IComplianceRetentionConfig',
        fabricType: FabricType.DATABASE,
        description:
          'FREEDOM config accessor for compliance_retention_days — PLATFORM_ONLY, immutable after bootstrap.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: { template: 'data_pipeline', max_tokens: 2800 },
      },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow19.compliance-audit-writer.genesis' },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-19-20',
        description: 'retentionExpiresAt computed at write time from FREEDOM config (CF-19-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-21',
        description: 'auditHash = SHA-256(tenantId+sagaId+eventType+writtenAt) (CF-19-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-22',
        description: 'Append-only: no updateDocument on xiigen-compliance-records (CF-19-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-23',
        description: 'knowledgeScope PLATFORM_ONLY on all compliance records (CF-19-3)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['compliance_record'],
      events: ['ComplianceRecordWritten', 'ComplianceWriteFailed'],
      apiRoutes: [],
    },

    machineComponents: [
      'SHA-256 audit hash computation (tamper detection) (CF-19-3)',
      'retentionExpiresAt at write time — no deferred computation',
      'Append-only compliance store (PLATFORM_ONLY)',
    ],

    freedomComponents: ['flow19_compliance_retention_days — retention window in days'],
  });
}

// ── T624: DataRetentionEnforcer ──────────────────────────────────────────────

export function createDataRetentionEnforcerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T624',
    flowId: 'FLOW-19',
    flowName: 'Durable Sagas & Compliance',
    name: 'DataRetentionEnforcer',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Triggered by CRON schedule (flow19_retention_cron_schedule from FREEDOM config)',
    purpose:
      'Dual-gate retention purge with archive-before-delete safety pattern. ' +
      'Gate 1: retentionExpiresAt < now. Gate 2: legalHoldActive === false. ' +
      'BOTH gates must pass. On legalHold active, emit RetentionHoldActive and skip. ' +
      'archive-before-delete: storeDocument(xiigen-retention-archive) BEFORE deleteDocument. ' +
      'PurgeCompleted includes archiveRef for audit trail. ' +
      'CRON schedule from FREEDOM config key flow19_retention_cron_schedule — never hardcoded.',
    distinctFrom:
      'T623 ComplianceAuditWriter (T623 writes audit records; T624 purges expired data after dual-gate approval)',

    ironRules: [
      'IR-1: Dual gate — retentionExpiresAt < now AND legalHoldActive === false. ' +
        'BOTH gates required. legalHold supersedes expiry. CF-19-4.',
      'IR-2: On legalHoldActive = true, emit RetentionHoldActive and skip record entirely. CF-19-4.',
      'IR-3: archive-before-delete — storeDocument(xiigen-retention-archive, archivedRecord, archiveRef) ' +
        'MUST complete before deleteDocument(sourceIndex, id). CF-19-4.',
      'IR-4: PurgeCompleted includes archiveRef for audit trail. CF-19-4.',
      'IR-5: CRON schedule from FREEDOM config key flow19_retention_cron_schedule — NEVER hardcoded. CF-19-4.',
      'IR-6: PurgeFailed emitted on deleteDocument failure after archive confirms.',
      'IR-7: tenantId from ALS only. DNA-5.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'LoadRetentionConfig',
          description:
            'Load CRON schedule and legal hold config from FREEDOM (flow19_retention_cron_schedule)',
          ironRuleRef: 'IR-5',
        },
        {
          order: 2,
          name: 'GateOne_ExpiryCheck',
          description: 'Check retentionExpiresAt < now — first gate',
          ironRuleRef: 'IR-1',
        },
        {
          order: 3,
          name: 'GateTwo_LegalHoldCheck',
          description: 'Check legalHoldActive === false — second gate (supersedes expiry)',
          ironRuleRef: 'IR-1',
        },
        {
          order: 4,
          name: 'ArchiveRecord',
          description:
            'storeDocument(xiigen-retention-archive, archivedRecord, archiveRef) — archive first',
          ironRuleRef: 'IR-3',
        },
        {
          order: 5,
          name: 'DeleteOriginal',
          description: 'deleteDocument(sourceIndex, id) — ONLY after archive confirmed',
          ironRuleRef: 'IR-3',
        },
        {
          order: 6,
          name: 'EmitPurgeCompleted',
          description: 'enqueue(PurgeCompleted, {archiveRef}) — after delete confirmed',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1558',
        interfaceName: 'IRetentionArchiveService',
        fabricType: FabricType.DATABASE,
        description:
          'Archive storage provider — storeDocument to xiigen-retention-archive before original delete.',
      },
      {
        factoryId: 'F1559',
        interfaceName: 'ILegalHoldService',
        fabricType: FabricType.DATABASE,
        description:
          'Legal hold status provider — checks legalHoldActive for the record before purge gate.',
      },
      {
        factoryId: 'F1560',
        interfaceName: 'IRetentionCronConfig',
        fabricType: FabricType.DATABASE,
        description:
          'FREEDOM config accessor for retention_cron_schedule — dynamic CRON, never hardcoded.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        config: { template: 'data_pipeline', max_tokens: 2800 },
      },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { strict_mode: true } },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow19.data-retention-enforcer.genesis' },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-19-30',
        description: 'Dual gate: both retentionExpired AND !legalHold before purge (CF-19-4)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-31',
        description:
          'archive-before-delete: storeDocument(archive) before deleteDocument (CF-19-4)',
        severity: 'error' as const,
        checkType: 'outbox_ordering',
      },
      {
        gateId: 'QG-19-32',
        description: 'RetentionHoldActive emitted when legalHold = true (CF-19-4)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-19-33',
        description: 'CRON schedule from FREEDOM config — never hardcoded (CF-19-4)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['retention_record', 'retention_archive'],
      events: ['PurgeCompleted', 'RetentionHoldActive', 'PurgeFailed'],
      apiRoutes: [],
    },

    machineComponents: [
      'Dual-gate expiry + legal-hold check (CF-19-4)',
      'Archive-before-delete safety ordering',
      'Dynamic CRON from FREEDOM config — no @Cron decorator',
    ],

    freedomComponents: [
      'flow19_retention_cron_schedule — cron expression for retention scan',
      'flow19_retention_batch_size — max records per CRON run',
    ],
  });
}

// ── Contract factories array (for bootstrapper wiring) ──────────────────────

export const DURABLE_SAGAS_COMPLIANCE_NEW_CONTRACT_FACTORIES = [
  createSagaOrchestratorContract,
  createCompensationEngineContract,
  createComplianceAuditWriterContract,
  createDataRetentionEnforcerContract,
];

export const DURABLE_SAGAS_COMPLIANCE_NEW_CONTRACT_DESCRIPTORS =
  DURABLE_SAGAS_COMPLIANCE_NEW_CONTRACT_FACTORIES.map((f) => {
    const c = f();
    return {
      taskTypeId: c.taskTypeId,
      name: c.name,
      flowId: c.flowId,
      version: 'v1',
    };
  });
