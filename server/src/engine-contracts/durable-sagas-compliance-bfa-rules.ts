/**
 * FLOW-19 BFA Rules — Durable Sagas & Compliance
 *
 * CF-19-1: T621 persist-before-dispatch (storeDocumentWithOCC versionPin:-1) + SETNX step lock
 * CF-19-2: T622 serial LIFO compensation + stop-on-first-failure + SETNX comp-lock
 * CF-19-3: T623 compliance record immutability + retentionExpiresAt at write time + PLATFORM_ONLY
 * CF-19-4: T624 dual-gate retention purge + archive-before-delete + dynamic CRON
 */

export const DURABLE_SAGAS_COMPLIANCE_BFA_RULES = [
  {
    ruleId: 'CF-19-1',
    flowId: 'FLOW-19',
    description:
      'T621 SagaOrchestrator: persist-before-dispatch is MACHINE-FIXED. ' +
      'storeDocumentWithOCC(sagaState, {sagaId, status:RUNNING}, sagaId, {versionPin:-1}) at ORDER 1 ' +
      'before any step fires — OCC conflict returns SagaAlreadyRunning (idempotent, not error). ' +
      'SETNX(step-lock:{sagaId}:{stepIndex}) at ORDER 2 BEFORE step body executes — ' +
      'prevents concurrent duplicate step execution on crash replay. ' +
      'Compensation strategy registered at ORDER 3 BEFORE step body (crash-safe rollback available). ' +
      'storeDocument(checkpoint) BEFORE enqueue(SagaStepExecuted) at every transition — DNA-8. ' +
      'tenantId from ALS only — never from event payload (DNA-5). ' +
      'SF-SAGA-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-19-2',
    flowId: 'FLOW-19',
    description:
      'T622 CompensationEngine: serial LIFO compensation is MACHINE-FIXED. ' +
      'compensationStack MUST execute in reverse (LIFO) order — not insertion order, not parallel. ' +
      'Serial execution only — no Promise.all, no concurrent compensation steps. ' +
      'SETNX(comp-lock:{sagaId}:{stepIndex}) BEFORE compensation body per step — ' +
      'idempotent restart on crash replay prevents double-execution (double-refund risk). ' +
      'stop-on-first-failure: any compensation step failure → emit CompensationFailed with failedStep, HALT. ' +
      'Do NOT continue to remaining steps after a failure. ' +
      'storeDocument(compensationRecord) BEFORE enqueue(CompensationStepExecuted) per step — DNA-8. ' +
      'compensationStack immutable after registration — no modifications during execution. ' +
      'SF-SAGA-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-19-3',
    flowId: 'FLOW-19',
    description:
      'T623 ComplianceAuditWriter: compliance record immutability is MACHINE-FIXED. ' +
      'retentionExpiresAt MUST be computed at write time from FREEDOM config key ' +
      'flow19_compliance_retention_days — NEVER hardcoded, NEVER deferred to a batch job. ' +
      'If retention policy changes after write, the stored retentionExpiresAt is authoritative. ' +
      "auditHash = SHA-256([tenantId, sagaId, eventType, writtenAt].join(':')) — " +
      'deterministic tamper-detection fingerprint included on every record. ' +
      'ONLY storeDocument on xiigen-compliance-records — updateDocument and deleteDocument are ' +
      'BUILD_FAILURE violations on this index. knowledgeScope PLATFORM_ONLY on all records. ' +
      'storeDocument BEFORE enqueue(ComplianceRecordWritten) — DNA-8. ' +
      'SF-COMPLIANCE-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-961..CF-964) — edge-case coverage from docs/flow-coverage/durable-sagas-compliance/P10-server-specs.md
  {
    ruleId: 'CF-961',
    flowId: 'FLOW-19',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/durable-sagas-compliance — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-962',
    flowId: 'FLOW-19',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-963',
    flowId: 'FLOW-19',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-964',
    flowId: 'FLOW-19',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-19-4',
    flowId: 'FLOW-19',
    description:
      'T624 DataRetentionEnforcer: dual-gate retention purge is MACHINE-FIXED. ' +
      'BOTH gates must pass before any deleteDocument: ' +
      '(1) retentionExpiresAt < now — record has passed its retention window; ' +
      '(2) legalHoldActive === false — no legal hold in place. ' +
      'legalHold supersedes expiry — if legalHoldActive = true, emit RetentionHoldActive and skip record. ' +
      'archive-before-delete: storeDocument(xiigen-retention-archive, archivedRecord, archiveRef) ' +
      'MUST complete before deleteDocument — data permanently lost if delete-before-archive on crash. ' +
      'PurgeCompleted includes archiveRef for audit trail. ' +
      'CRON schedule MUST come from FREEDOM config key flow19_retention_cron_schedule — ' +
      'no hardcoded cron expressions. ' +
      'SF-RETENTION-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
