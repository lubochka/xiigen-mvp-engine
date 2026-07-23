/**
 * Flow14EtlRagSeed — RAG patterns for FLOW-14 ETL & Data Integration domain.
 * Extends FlowRagSeedBase; provides 5 domain groups:
 *   1. connector-registration
 *   2. etl-ingestion (EP-4 saga, cursor checkpoint, rate-limit)
 *   3. etl-transform (zone promotion, quarantine, idempotent upsert)
 *   4. dimensional-modeling (SCD-2 version-only, PII gate)
 *   5. reverse-etl (queue-fabric-only, rate-check ordering)
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow14EtlRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-14-etl-data-integration';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── Domain 1: Connector Registration ──────────────────────────────
      {
        patternId: 'F14-CR-PAT-001',
        namespace: 'connector-registration',
        pattern: 'oauth-flow-credential-vault',
        description:
          'OAuth connector registration with ICredentialVaultService (F427). ' +
          'Only opaque connectorId appears in events — never raw credentials. ' +
          'Health probe via IRateLimitGuardService (F430) before emitting ConnectorRegistered.',
        codeExample:
          'const vaultRef = await this.credentialVault.storeCredential(oauthToken);\n' +
          'const connector = { connectorId, credentialVaultRef: vaultRef.ref };\n' +
          "await this.db.storeDocument('connectors', connector, connectorId);\n" +
          "await this.queue.enqueue('connector.registered', createCloudEvent({ connectorId }));",
        tags: ['F427', 'credential-vault', 'connector-registration', 'T189', 'oauth'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-CR-PAT-002',
        namespace: 'connector-registration',
        pattern: 'credential-vault-platform-only',
        description:
          'ICredentialVaultService (F427) is PLATFORM-ONLY — resolves through ' +
          'IExternalServiceFactory.createAsync(). Never instantiated directly. ' +
          'storeCredential/retrieveCredential/rotateCredential — all via factory resolution.',
        codeExample:
          "const vault = await this.factory.createAsync<ICredentialVaultService>('F427');\n" +
          "const vaultRef = await vault.storeCredential({ type: 'oauth', token });\n" +
          '// vaultRef.ref is the only thing stored in events',
        tags: ['F427', 'platform-only', 'factory-resolution', 'credential-vault'],
        flowId: 'FLOW-14',
      },
      // ── Domain 2: ETL Ingestion ────────────────────────────────────────
      {
        patternId: 'F14-EI-PAT-001',
        namespace: 'etl-ingestion',
        pattern: 'ep4-saga-cycle',
        description:
          'EP-4 durable sync saga: rate_check → poll_page → land_raw → commit_cursor. ' +
          'Crash-recoverable. CF-193: cursor MUST be monotonically increasing. ' +
          'Each page committed atomically with ICursorCheckpointService.',
        codeExample:
          'await this.rateLimitGuard.checkRateLimit(connectorId);\n' +
          'const page = await this.connector.pollPage(cursor);\n' +
          "await this.db.storeDocument('raw', page.records);\n" +
          'const validated = await this.cursorCheckpoint.validateMonotonic(cursor, page.nextCursor);\n' +
          "if (!validated.isSuccess) return DataProcessResult.failure('CURSOR_REGRESSION', ...);\n" +
          'await this.cursorCheckpoint.saveCheckpoint(jobId, page.nextCursor);',
        tags: ['EP-4', 'saga', 'cursor', 'T190', 'T192', 'rate-limit', 'raw-zone'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-EI-PAT-002',
        namespace: 'etl-ingestion',
        pattern: 'cursor-checkpoint-pattern',
        description:
          'ICursorCheckpointService for durable cursor storage. saveCheckpoint after each ' +
          'successful page. loadCheckpoint on job startup for crash recovery. ' +
          'validateMonotonic before every save — backward cursors are BUILD_FAILURE.',
        codeExample:
          'const checkpoint = await this.cursorCheckpoint.loadCheckpoint(jobId);\n' +
          'const startCursor = checkpoint.data ?? initialCursor;\n' +
          '// ... after successful page landing:\n' +
          'await this.cursorCheckpoint.validateMonotonic(startCursor, nextCursor);\n' +
          'await this.cursorCheckpoint.saveCheckpoint(jobId, nextCursor);',
        tags: ['cursor-checkpoint', 'CF-193', 'crash-recovery', 'T190', 'T192'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-EI-PAT-003',
        namespace: 'etl-ingestion',
        pattern: 'rate-limit-before-external-call',
        description:
          'IRateLimitGuardService (F430) checkRateLimit must be the first step before any ' +
          'external API call. On throttle: emit RateLimitExhausted — never silent skip.',
        codeExample:
          'const rateResult = await this.rateLimitGuard.checkRateLimit(connectorId);\n' +
          'if (!rateResult.isSuccess) {\n' +
          "  await this.queue.enqueue('rate-limit.exhausted', createCloudEvent({ connectorId, retryAfterMs }));\n" +
          "  return DataProcessResult.failure('RATE_LIMIT_EXHAUSTED', ...);\n" +
          '}\n' +
          '// Only now proceed with external API call',
        tags: ['F430', 'rate-limit', 'external-call', 'T190', 'T191', 'T192', 'T199'],
        flowId: 'FLOW-14',
      },
      // ── Domain 3: ETL Transform ────────────────────────────────────────
      {
        patternId: 'F14-ET-PAT-001',
        namespace: 'etl-transform',
        pattern: 'zone-promotion-order',
        description:
          'Zone promotion order: raw → staging → core → mart. Skip is prohibited (CF-192). ' +
          'Each zone boundary is a separate event emit. T193 covers raw→staging, T195 staging→core, T196 core→mart.',
        codeExample:
          '// T193: raw → staging only\n' +
          "const rawRecord = await this.db.searchDocuments('raw', filter);\n" +
          '// transform + validate\n' +
          "await this.db.storeDocument('staging', normalized, idempotencyKey);\n" +
          "await this.queue.enqueue('staging.record.written', createCloudEvent(event));\n" +
          '// NEVER skip to core or mart from raw',
        tags: ['CF-192', 'zone-promotion', 'raw-staging', 'T193', 'append-only'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-ET-PAT-002',
        namespace: 'etl-transform',
        pattern: 'quarantine-on-failure',
        description:
          'Any normalization error triggers quarantine — never silent drop. ' +
          'RecordQuarantined event emitted with quarantineReason and sourceZone.',
        codeExample:
          'try {\n' +
          '  const normalized = normalize(rawRecord);\n' +
          '  // ... proceed with staging write\n' +
          '} catch (normErr) {\n' +
          "  await this.db.storeDocument('quarantine', { recordId, reason: normErr.message, sourceZone: 'raw' });\n" +
          "  await this.queue.enqueue('record.quarantined', createCloudEvent({ recordId, quarantineReason: normErr.message }));\n" +
          "  return DataProcessResult.failure('QUARANTINE', ...);\n" +
          '}',
        tags: ['quarantine', 'normalization-error', 'RecordQuarantined', 'T193', 'T190', 'T191'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-ET-PAT-003',
        namespace: 'etl-transform',
        pattern: 'idempotent-upsert-transform',
        description:
          'Staging writes use idempotency keys (DNA-7). DuplicateIngestionDetected emitted ' +
          'if key already exists.',
        codeExample:
          'const idempotencyKey = `staging:${connectorId}:${recordId}`;\n' +
          "const existing = await this.db.searchDocuments('staging', { idempotencyKey });\n" +
          'if (existing.isSuccess && existing.data.length > 0) {\n' +
          "  await this.queue.enqueue('duplicate.ingestion.detected', createCloudEvent({ recordId, idempotencyKey }));\n" +
          '  return DataProcessResult.success({ deduplicated: true });\n' +
          '}\n' +
          "await this.db.storeDocument('staging', { ...record, idempotencyKey });",
        tags: ['DNA-7', 'idempotency', 'staging', 'DuplicateIngestionDetected', 'T193'],
        flowId: 'FLOW-14',
      },
      // ── Domain 4: Dimensional Modeling ────────────────────────────────
      {
        patternId: 'F14-DM-PAT-001',
        namespace: 'dimensional-modeling',
        pattern: 'scd2-version-only',
        description:
          'SCD-2 strategy: version-only (DR-62). Never UPDATE dimension records directly. ' +
          'Always close old version (effectiveTo = now) and open new version (effectiveFrom = now) ' +
          'in a single atomic transaction.',
        codeExample:
          '// DR-62: version-only — never db.updateDocument on dim table\n' +
          "await this.db.storeDocument('dim_customer', {\n" +
          '  ...dimRecord,\n' +
          '  effectiveTo: new Date().toISOString(),\n' +
          '  isCurrent: false,\n' +
          '}, `${dimRecord.customerId}_v${dimRecord.version}`);\n' +
          "await this.db.storeDocument('dim_customer', {\n" +
          '  ...newDimRecord,\n' +
          '  effectiveFrom: new Date().toISOString(),\n' +
          '  isCurrent: true,\n' +
          '}, `${newDimRecord.customerId}_v${newDimRecord.version}`);\n' +
          '// Both in same transaction — atomic',
        tags: ['SCD-2', 'DR-62', 'version-only', 'T195', 'dimensional-modeling', 'atomic'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-DM-PAT-002',
        namespace: 'dimensional-modeling',
        pattern: 'pii-gate-before-mart',
        description:
          'IPiiClassificationService (F462, PLATFORM-ONLY, DR-63) MUST classify ALL fields ' +
          'before any mart write. Blocked if piiFieldsDetected > 0 without masking. ' +
          'PiiClassificationCompleted event emitted BEFORE MartRefreshed.',
        codeExample:
          'const piiResult = await this.piiClassifier.classifyFields(Object.keys(record));\n' +
          'if (piiResult.data.piiFieldsDetected.length > 0) {\n' +
          "  return DataProcessResult.failure('PII_MART_BLOCKED', 'PII fields detected — mart write blocked');\n" +
          '}\n' +
          "await this.queue.enqueue('pii.classification.completed', createCloudEvent({ piiFieldsDetected: [], martWriteApproved: true }));\n" +
          '// Only now write to mart\n' +
          "await this.db.storeDocument('mart', record);",
        tags: ['F462', 'PII-gate', 'DR-63', 'T196', 'mart-write', 'PiiClassificationCompleted'],
        flowId: 'FLOW-14',
      },
      // ── Domain 5: Reverse ETL ──────────────────────────────────────────
      {
        patternId: 'F14-RE-PAT-001',
        namespace: 'reverse-etl',
        pattern: 'reverse-etl-queue-fabric',
        description:
          'All reverse ETL pushes via QUEUE_FABRIC only (DR-64). No direct HTTP calls to ' +
          'external SaaS. ReverseETLPushed event includes transport: "queue_fabric".',
        codeExample:
          '// DR-64: queue fabric only — NEVER axios/fetch to SaaS\n' +
          '// WRONG: await axios.post(saasSyncUrl, data);\n' +
          '// RIGHT:\n' +
          "await this.queue.enqueue('reverse-etl.push', createCloudEvent({\n" +
          '  connectorId,\n' +
          "  transport: 'queue_fabric',\n" +
          '  payload: marshaledData,\n' +
          '}));\n' +
          "await this.queue.enqueue('reverse-etl.pushed', createCloudEvent({ connectorId, transport: 'queue_fabric' }));",
        tags: ['DR-64', 'queue-fabric', 'reverse-etl', 'T199', 'ReverseETLPushed'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-RE-PAT-002',
        namespace: 'reverse-etl',
        pattern: 'rate-check-before-reverse-etl',
        description:
          'IRateLimitGuardService.checkRateLimit (F430) called before lock check, which is ' +
          'called before enqueue. Order: rate_check → lock_check → enqueue.',
        codeExample:
          '// Step 1: rate check\n' +
          'const rateResult = await this.rateLimitGuard.checkRateLimit(connectorId);\n' +
          'if (!rateResult.isSuccess) {\n' +
          "  await this.queue.enqueue('rate-limit.exhausted', createCloudEvent({ connectorId }));\n" +
          "  return DataProcessResult.failure('RATE_LIMIT_EXHAUSTED', ...);\n" +
          '}\n' +
          '// Step 2: lock check (prevents overlapping pushes)\n' +
          "const lock = await this.db.searchDocuments('push_locks', { connectorId, active: true });\n" +
          "if (lock.data.length > 0) return DataProcessResult.failure('PUSH_LOCKED', ...);\n" +
          '// Step 3: enqueue push\n' +
          "await this.queue.enqueue('reverse-etl.push', createCloudEvent({ connectorId }));",
        tags: ['F430', 'rate-check', 'lock-check', 'T199', 'reverse-etl-order'],
        flowId: 'FLOW-14',
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'F14-BFA-001',
        ruleId: 'CF-FLOW14-PEER-001',
        rule: 'T198 CrossFlowAnalyticsExecutor: FLOW-13 MUST be ACTIVE before T198 executes. peerFlowMustBeActive BFA check required.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T198',
      },
      {
        patternId: 'F14-BFA-002',
        ruleId: 'CF-192',
        rule: 'Zone promotion order MUST be raw → staging → core → mart. Skipping any zone is a BUILD_FAILURE. T193 (raw→staging), T195 (staging→core), T196 (core→mart).',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T193',
      },
      {
        patternId: 'F14-BFA-003',
        ruleId: 'CF-193',
        rule: 'T190/T192: ICursorCheckpointService.validateMonotonic MUST be called before each cursor commit. Backward cursor movement = BUILD_FAILURE.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T190',
      },
      {
        patternId: 'F14-BFA-004',
        ruleId: 'CF-204',
        rule: 'T197: All join inputs MUST carry tenantId. Cross-tenant join detected MUST return CrossTenantJoinAttempted error immediately.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T197',
      },
      {
        patternId: 'F14-BFA-005',
        ruleId: 'CF-211',
        rule: 'T191: HMAC webhook verification MUST use crypto.timingSafeEqual — never string equality. Invalid HMAC → HTTP 200, no event emitted.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T191',
      },
      {
        patternId: 'F14-BFA-006',
        ruleId: 'DR-62',
        rule: 'T195: Direct UPDATE on dimension records is PROHIBITED. SCD-2 version-only strategy required. close_old + open_new MUST be atomic.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T195',
      },
      {
        patternId: 'F14-BFA-007',
        ruleId: 'DR-63',
        rule: 'T196: IPiiClassificationService (F462) MUST classify ALL fields BEFORE mart write. Mart write blocked if piiFieldsDetected > 0 without masking.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T196',
      },
      {
        patternId: 'F14-BFA-008',
        ruleId: 'DR-64',
        rule: 'T199: ALL reverse ETL pushes MUST go via QUEUE_FABRIC only. Direct HTTP to external SaaS is PROHIBITED.',
        severity: 'ERROR',
        flowId: 'FLOW-14',
        taskType: 'T199',
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'F14-DR-001',
        namespace: 'etl-security',
        designRecord: 'credentials-never-in-events',
        description:
          'FLOW-14 design decision: connector credentials MUST be stored in ICredentialVaultService (F427). ' +
          'Only opaque connectorId references appear in queue events and API responses. ' +
          'Rationale: queue events are observable by multiple consumers — credentials must not travel via queue.',
        impactedTaskTypes: ['T189', 'T190', 'T191', 'T192', 'T199'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-DR-002',
        namespace: 'etl-security',
        designRecord: 'pii-classification-mandatory-before-mart',
        description:
          'FLOW-14 design decision (DR-63): Mart zone contains aggregated KPIs visible to analytics users. ' +
          'PII in mart outputs creates GDPR/CCPA exposure. IPiiClassificationService (F462) classification ' +
          'is non-negotiable before any mart write. This is a hard stop, not a warning.',
        impactedTaskTypes: ['T196'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-DR-003',
        namespace: 'etl-integrity',
        designRecord: 'scd2-version-only-immutability',
        description:
          'FLOW-14 design decision (DR-62): Direct UPDATE on dimension records breaks historical query integrity. ' +
          'SCD-2 version-only ensures all historical states are queryable. ' +
          'Atomic close+open prevents orphaned open records.',
        impactedTaskTypes: ['T195'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-DR-004',
        namespace: 'etl-security',
        designRecord: 'reverse-etl-queue-fabric-only',
        description:
          'FLOW-14 design decision (DR-64): Direct HTTP from reverse ETL handler to SaaS creates tight coupling, ' +
          'bypasses queue observability, and makes replay/retry impossible. ' +
          'Queue fabric transport enables retry, dead-letter, and rate-limit without code changes.',
        impactedTaskTypes: ['T199'],
        flowId: 'FLOW-14',
      },
      {
        patternId: 'F14-DR-005',
        namespace: 'etl-reliability',
        designRecord: 'ep4-durable-saga-crash-recovery',
        description:
          'FLOW-14 design decision: EP-4 saga with ICursorCheckpointService ensures sync jobs resume ' +
          'from last committed cursor after crash. SyncJobFailed MUST include lastCursorPosition so operators ' +
          'can replay from exact failure point.',
        impactedTaskTypes: ['T190', 'T192'],
        flowId: 'FLOW-14',
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      count++;
    }
    return DataProcessResult.success(count);
  }
}
