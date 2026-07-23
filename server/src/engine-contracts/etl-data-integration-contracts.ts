/**
 * FLOW-14 — Data Pipeline & ETL Engine Contracts
 *
 * Business purpose: Raw→curated→mart zone promotion pipeline with strict security
 * controls. Covers connector registration, EP-4 durable sync saga, webhook ingestion
 * with HMAC timing-safe verification, SCD-2 dimensional modeling, PII-gated mart
 * writes, cross-tenant join guards, reverse ETL via queue fabric only, and
 * tenant warehouse provisioning.
 *
 * T213: ConnectorRegistrationHandler [provisioning] — register connector, vault credentials
 * T214: EtlSyncSagaHandler           [ingestion]    — EP-4 durable sync: rate→poll→land→commit
 * T215: WebhookIngestionHandler      [ingestion]    — HMAC-safe webhook landing
 * T216: BackfillCoordinator          [ingestion]    — gap-detecting backfill with EP-4 cycle
 * T217: RawToStagingTransformer      [transform]    — raw→staging with quarantine-on-failure
 * T218: SchemaDriftDetector          [transform]    — schema drift scoring + approval gate
 * T219: DimensionalModelBuilder      [modeling]     — SCD-2 version-only dim builds
 * T220: MartKpiBuilder               [modeling]     — PII-gated mart KPI computation
 * T221: IdentityJoinResolver         [modeling]     — cross-tenant guarded identity join
 * T222: CrossFlowAnalyticsExecutor   [activation]   — FLOW-13 peer-dependent analytics
 * T223: ReverseEtlPushHandler        [activation]   — queue-fabric-only reverse ETL push
 * T224: WarehouseProvisioningHandler [provisioning] — zone + RLS provisioning
 *
 * Artifact numbers: T213–T224, F427/F430/F459/F462/F463 (platform-only)
 * CF rules: CF-192, CF-193, CF-204, CF-211, DR-62, DR-63, DR-64
 */

import { FabricType } from '../factories/fabric-type';
import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling ──────────────────────────────────────────────────

const FLOW14_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces (Rule 1)',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
        'CloudEvents envelope via createCloudEvent() on all emits (DNA-9)',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

// ── Shared quality gates ─────────────────────────────────────────────────────

const FLOW14_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-14-00',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-14-01',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-14-02',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-14-03',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-14-04',
    description: 'storeDocument() BEFORE enqueue() on every transition (DNA-8)',
    severity: 'error' as const,
    checkType: 'outbox_ordering',
  },
  {
    gateId: 'QG-14-05',
    description: 'CloudEvents envelope via createCloudEvent() on all emits (DNA-9)',
    severity: 'error' as const,
    checkType: 'cloudevents',
  },
];

// ── Shared iron rules ────────────────────────────────────────────────────────

const FLOW14_IRON_RULES_CORE = [
  'NEVER import database/queue client directly — use fabric interfaces only (Rule 1)',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
  'storeDocument() MUST happen BEFORE enqueue() on every state transition (DNA-8)',
  'CloudEvents envelope MUST be used for all inter-service events (DNA-9)',
  'tenantId is read from AsyncLocalStorage — never passed as parameter',
];

// ── T213 — ConnectorRegistrationHandler ─────────────────────────────────────

/**
 * T213 — ConnectorRegistrationHandler [provisioning]
 *
 * PURPOSE: Register a new connector, vault its credentials via F427
 * (ICredentialVaultService), run health probe, and emit ConnectorRegistered.
 * Credentials MUST NOT appear in any event payload — only opaque connectorId.
 *
 * F427: ICredentialVaultService → CORE FABRIC (platform-only credential vault)
 * F430: IRateLimitGuardService  → CORE FABRIC (platform-only rate limit)
 */
export function createT213Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T213',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'ConnectorRegistrationHandler',
    archetype: 'provisioning' as ContractArchetype,
    entry: 'Triggered when a tenant requests registration of a new data connector',
    purpose:
      'Validate connector config, vault credentials via ICredentialVaultService (F427), run health probe via IRateLimitGuardService (F430), store connector record via outbox, emit ConnectorRegistered. On failure emit ConnectorRegistrationFailed.',
    distinctFrom:
      'T214 EtlSyncSagaHandler (T213 registers the connector; T214 runs sync jobs on already-registered connectors)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F427',
        interfaceName: 'ICredentialVaultService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Platform-only credential vault — stores and retrieves connector credentials as opaque references. NEVER put raw credentials in events.',
      },
      {
        factoryId: 'F430',
        interfaceName: 'IRateLimitGuardService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Platform-only rate limit guard — validates external call budget before health probe.',
      },
      {
        factoryId: 'F459',
        interfaceName: 'IWarehouseAuditService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Platform-only audit trail — records connector registration event for compliance.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'provisioning', max_tokens: 3000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.connector-registration.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-10',
        description: 'credentials_not_in_event_payload — connectorId only in events (F427)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-11',
        description:
          'rate_limit_check_before_external_call — IRateLimitGuardService called before health probe (F430)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['connector', 'credential_vault_reference'],
      events: ['ConnectorRegistered', 'ConnectorRegistrationFailed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'Credentials MUST NOT appear in event payload — only opaque connectorId (F427)',
      'Health probe MUST be called before emit (rate limit guard via F430)',
      'ICredentialVaultService (F427) MUST resolve via factory — never direct instantiation',
      'ConnectorRegistrationFailed MUST be emitted on any registration failure',
      'idempotencyKey MUST be set before queue dispatch (DNA-7)',
    ],

    machineComponents: [
      'Credential vault factory resolution (F427)',
      'Rate limit guard before health probe (F430)',
      'Outbox pattern — connector record stored before event',
      'CloudEvents envelope for ConnectorRegistered/ConnectorRegistrationFailed',
      'Idempotency key enforcement',
    ],

    freedomComponents: [
      'flow14_rate_limit_window_ms — rate limit check window in milliseconds',
      'flow14_health_probe_timeout_ms — connector health probe timeout',
      'flow14_connector_retry_max_attempts — max registration retry attempts',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    etlExecutionOrder: [
      'health_probe',
      'register_connector',
      'store_document',
      'emit_ConnectorRegistered',
    ],
  });
}

// ── T214 — EtlSyncSagaHandler ────────────────────────────────────────────────

/**
 * T214 — EtlSyncSagaHandler [ingestion]
 *
 * PURPOSE: EP-4 durable sync saga: rate_check → poll_page → land_raw → commit_cursor.
 * Cursor MUST be monotonically increasing (CF-193 via ICursorCheckpointService).
 * Raw zone is append-only (CF-192). On normalization error → quarantine, emit RecordQuarantined.
 */
export function createT214Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T214',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'EtlSyncSagaHandler',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered by sync schedule or ConnectorRegistered event for initial sync',
    purpose:
      'Execute EP-4 durable sync saga: rate_check → poll_page → land_raw → commit_cursor. Each page committed atomically. Cursor monotonic validation (CF-193). Raw zone append-only (CF-192). Quarantine records on normalization error.',
    distinctFrom:
      'T216 BackfillCoordinator (T214 is incremental sync via cursor; T216 is gap-detecting backfill over historical ranges)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F430',
        interfaceName: 'IRateLimitGuardService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Rate limit guard — checks quota before each external page poll.',
      },
      {
        factoryId: 'F427',
        interfaceName: 'ICredentialVaultService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Resolves connector credentials for polling.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion-saga', max_tokens: 4000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.etl-sync-saga.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-20',
        description:
          'cursor_monotonically_increasing — ICursorCheckpointService validates on each commit (CF-193)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-21',
        description: 'raw_zone_append_only_enforced — no UPDATE/DELETE on raw zone (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-22',
        description: 'rate_limit_check_before_external_call — F430 called before each poll_page',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['sync_job', 'cursor_checkpoint', 'raw_record'],
      events: [
        'SyncJobCompleted',
        'SyncJobFailed',
        'RecordQuarantined',
        'DuplicateIngestionDetected',
        'RateLimitExhausted',
      ],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'EP-4 cycle order MUST be rate_check → poll_page → land_raw → commit_cursor (EP-4)',
      'Cursor MUST be validated monotonic before commit — ICursorCheckpointService (CF-193)',
      'Raw zone is append-only — no UPDATE/DELETE (CF-192)',
      'Rate check via IRateLimitGuardService (F430) MUST precede each external call',
      'On normalization error → quarantine record, emit RecordQuarantined — never silent drop',
      'SyncJobFailed MUST include lastCursorPosition for crash recovery',
    ],

    machineComponents: [
      'EP-4 saga cycle order enforcement',
      'Cursor checkpoint via ICursorCheckpointService',
      'Raw zone append-only enforcement',
      'Rate limit guard before each poll',
      'Quarantine on normalization failure',
    ],

    freedomComponents: [
      'flow14_sync_page_size — records per page (default: 100)',
      'flow14_rate_limit_window_ms — rate limit window',
      'flow14_backfill_blackout_cron — cron expression for blackout windows',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    ep4SagaCycle: {
      cycleOrder: ['rate_check', 'poll_page', 'land_raw', 'commit_cursor'],
      cursorMonotonic: true,
      crashRecoverable: true,
    },

    quarantineOnFailure: {
      triggerOnAnyNormalizationError: true,
      emitRecordQuarantined: true,
    },

    etlExecutionOrder: ['rate_check', 'poll_page', 'land_raw', 'commit_cursor'],
  });
}

// ── T215 — WebhookIngestionHandler ───────────────────────────────────────────

/**
 * T215 — WebhookIngestionHandler [ingestion]
 *
 * PURPOSE: Ingest webhook events with HMAC timing-safe verification (CF-211).
 * On invalid HMAC → return 200 with no event (prevents replay probing).
 * Idempotency via idempotencyKey before raw write (DNA-7).
 */
export function createT215Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T215',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'WebhookIngestionHandler',
    archetype: ContractArchetype.INGESTION,
    entry: 'HTTP POST to webhook endpoint from external connector',
    purpose:
      'Verify HMAC signature using constant-time comparison (CF-211, timingSafeEqual). On invalid HMAC return HTTP 200 with no event emitted. Check idempotency key. Append to raw zone. Emit WebhookEventIngested.',
    distinctFrom:
      'T214 EtlSyncSagaHandler (T215 is push-based webhook; T214 is pull-based polling sync)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F427',
        interfaceName: 'ICredentialVaultService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Resolves HMAC signing secret for verification.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion-webhook', max_tokens: 3000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.webhook-ingestion.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-30',
        description: 'hmac_timing_safe_comparison — timingSafeEqual used for HMAC verify (CF-211)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-31',
        description: 'credentials_not_in_event_payload — connectorId only, no raw credentials',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-32',
        description: 'raw_zone_append_only_enforced — no UPDATE/DELETE on raw zone (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['webhook_event', 'raw_record'],
      events: ['WebhookEventIngested', 'RecordQuarantined', 'DuplicateIngestionDetected'],
      apiRoutes: ['/api/webhooks/:connectorId'],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'HMAC verification MUST use constant-time comparison — timingSafeEqual (CF-211)',
      'On invalid HMAC → return HTTP 200 with no event emitted (prevents replay probing)',
      'Idempotency check via idempotencyKey BEFORE raw zone write (DNA-7)',
      'Raw zone is append-only (CF-192)',
      'ConnectorId in payload — never raw credentials (F427)',
      'On normalization error → quarantine, emit RecordQuarantined',
    ],

    machineComponents: [
      'HMAC constant-time verification (timingSafeEqual)',
      'Invalid HMAC silent 200 response',
      'Idempotency key deduplication',
      'Raw zone append-only enforcement',
      'Quarantine on normalization failure',
    ],

    freedomComponents: [
      'flow14_webhook_timeout_ms — webhook request processing timeout',
      'flow14_webhook_max_payload_bytes — maximum webhook payload size',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    hmacVerification: {
      algorithm: 'sha256',
      timingSafe: true,
      onInvalid: 'return_200_no_event',
    },

    quarantineOnFailure: {
      triggerOnAnyNormalizationError: true,
      emitRecordQuarantined: true,
    },

    etlExecutionOrder: [
      'verify_hmac',
      'check_idempotency',
      'land_raw',
      'emit_WebhookEventIngested',
    ],
  });
}

// ── T216 — BackfillCoordinator ───────────────────────────────────────────────

/**
 * T216 — BackfillCoordinator [ingestion]
 *
 * PURPOSE: Gap-detecting backfill over historical ranges using EP-4 durable cycle.
 * Scans for cursor discontinuities before dispatch. Honors blackout window (FREEDOM config).
 * BackfillFailed MUST include failedSlice for targeted replay.
 */
export function createT216Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T216',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'BackfillCoordinator',
    archetype: ContractArchetype.INGESTION,
    entry: 'Triggered by operator request or automated gap detection scan',
    purpose:
      'Detect cursor gaps in historical data range. Dispatch slices via EP-4 durable cycle (rate_check → poll_page → land_raw → commit_cursor). Honor FREEDOM blackout window. Emit BackfillCompleted or BackfillFailed with failedSlice.',
    distinctFrom:
      'T214 EtlSyncSagaHandler (T216 is historical gap backfill; T214 is incremental forward sync)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F430',
        interfaceName: 'IRateLimitGuardService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Rate limit guard — checks quota before each slice dispatch.',
      },
      {
        factoryId: 'F427',
        interfaceName: 'ICredentialVaultService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Resolves connector credentials for backfill polling.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'ingestion-backfill', max_tokens: 4000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.backfill-coordinator.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-40',
        description:
          'cursor_monotonically_increasing — cursor monotonic validation on each slice commit (CF-193)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-41',
        description: 'raw_zone_append_only_enforced — no UPDATE/DELETE on raw zone (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-42',
        description: 'rate_limit_check_before_external_call — F430 before each slice (F430)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['backfill_job', 'backfill_slice', 'cursor_checkpoint'],
      events: ['BackfillCompleted', 'BackfillFailed', 'RecordQuarantined'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'EP-4 cycle order identical to T214: rate_check → poll_page → land_raw → commit_cursor',
      'Gap detection MUST scan for cursor discontinuities before slice dispatch',
      'Backfill MUST honor blackout window (FREEDOM: flow14_backfill_blackout_cron)',
      'BackfillFailed MUST include failedSlice for targeted replay',
      'Raw zone append-only (CF-192)',
      'Rate check before each slice (F430)',
      'Cursor monotonic validation on each slice commit (CF-193)',
    ],

    machineComponents: [
      'Cursor gap detection algorithm',
      'EP-4 saga cycle per slice',
      'Blackout window enforcement',
      'Slice-level cursor monotonic validation',
      'Quarantine on normalization failure',
    ],

    freedomComponents: [
      'flow14_backfill_blackout_cron — cron for backfill blackout windows',
      'flow14_backfill_slice_size — records per backfill slice',
      'flow14_backfill_max_parallel_slices — max concurrent slice dispatches',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    ep4SagaCycle: {
      cycleOrder: ['rate_check', 'poll_page', 'land_raw', 'commit_cursor'],
      cursorMonotonic: true,
      crashRecoverable: true,
    },

    backfillGapDetection: {
      detectCursorGaps: true,
      replayGapRange: true,
    },

    quarantineOnFailure: {
      triggerOnAnyNormalizationError: true,
      emitRecordQuarantined: true,
    },

    etlExecutionOrder: ['detect_gaps', 'rate_check', 'poll_page', 'land_raw', 'commit_cursor'],
  });
}

// ── T217 — RawToStagingTransformer ───────────────────────────────────────────

/**
 * T217 — RawToStagingTransformer [transform]
 *
 * PURPOSE: Promote records from raw zone to staging zone (CF-192 zone promotion order).
 * Normalize, validate schema, write to staging, emit StagingRecordWritten.
 * On any normalization error → quarantine record, emit RecordQuarantined.
 */
export function createT217Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T217',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'RawToStagingTransformer',
    archetype: ContractArchetype.TRANSFORM,
    entry: 'Triggered by SyncJobCompleted or BackfillCompleted event',
    purpose:
      'Load from raw zone, normalize fields, validate schema, idempotent upsert to staging zone. On normalization error quarantine record and emit RecordQuarantined. Emit StagingRecordWritten on success.',
    distinctFrom:
      'T219 DimensionalModelBuilder (T217 promotes raw→staging; T219 builds staging→core dimensional model)',
    familyId: 'Family-14',

    factoryDependencies: [],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'transform-pipeline', max_tokens: 3500 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.raw-to-staging.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-50',
        description: 'zone_promotion_order_enforced — raw→staging only, no zone skipping (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-51',
        description: 'raw_zone_append_only_enforced — raw zone read-only during transform (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['staging_record', 'quarantine_record'],
      events: ['StagingRecordWritten', 'RecordQuarantined', 'SchemaDriftDetected'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'Zone promotion raw→staging only (CF-192)',
      'On any normalization error → quarantine record, emit RecordQuarantined',
      'Idempotent upsert via idempotencyKey (DNA-7)',
      'Schema validation MUST run before staging write',
      'No UPDATE/DELETE on raw zone (CF-192 read-only access)',
    ],

    machineComponents: [
      'Zone promotion order enforcement (raw→staging)',
      'Quarantine-on-normalization-failure',
      'Idempotency key upsert',
      'Schema validation gate',
    ],

    freedomComponents: [
      'flow14_normalization_rules — field normalization config (dates, enums, etc.)',
      'flow14_schema_drift_quarantine_threshold — drift score above which records are quarantined',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    zonePromotionOrder: {
      order: ['raw', 'staging', 'core', 'mart'],
      skipProhibited: true,
    },

    quarantineOnFailure: {
      triggerOnAnyNormalizationError: true,
      emitRecordQuarantined: true,
    },

    etlExecutionOrder: [
      'load_raw',
      'normalize',
      'validate_schema',
      'write_staging',
      'emit_StagingRecordWritten',
    ],
  });
}

// ── T218 — SchemaDriftDetector ───────────────────────────────────────────────

/**
 * T218 — SchemaDriftDetector [transform]
 *
 * PURPOSE: Compare incoming schema against baseline, score drift, quarantine or
 * proceed to approval. Drift threshold from FREEDOM config. Pipeline paused until
 * SchemaApproved received.
 */
export function createT218Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T218',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'SchemaDriftDetector',
    archetype: ContractArchetype.TRANSFORM,
    entry: 'Triggered during raw→staging promotion when field count or types change',
    purpose:
      'Load schema baseline, compare with incoming record schema, score drift. If score exceeds FREEDOM threshold emit SchemaDriftDetected and halt pipeline. Emit SchemaApproved after operator approval. Resume pipeline.',
    distinctFrom:
      'T217 RawToStagingTransformer (T218 handles schema evolution approval; T217 is the core normalization pipeline)',
    familyId: 'Family-14',

    factoryDependencies: [],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'schema-drift', max_tokens: 3000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.schema-drift.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-60',
        description:
          'Drift threshold read from FREEDOM config (flow14_schema_drift_quarantine_threshold)',
        severity: 'error' as const,
        checkType: 'freedom_config',
      },
    ],

    bfaRegistration: {
      entities: ['schema_baseline', 'schema_version'],
      events: ['SchemaDriftDetected', 'SchemaApproved'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'Drift score threshold MUST come from FREEDOM config (flow14_schema_drift_quarantine_threshold)',
      'SchemaDriftDetected emitted for any drift above threshold',
      'SchemaApproved emitted after operator approval',
      'Pipeline paused until SchemaApproved received',
      'Drift detection runs on staging zone only',
      'Schema version tracked on approval',
    ],

    machineComponents: [
      'Schema baseline comparison algorithm',
      'Drift score computation',
      'Pipeline halt on drift threshold breach',
      'Schema version tracking on approval',
    ],

    freedomComponents: [
      'flow14_schema_drift_quarantine_threshold — drift score above which pipeline halts (default: 0.3)',
      'flow14_schema_approval_timeout_ms — max time to wait for operator approval',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    etlExecutionOrder: [
      'load_schema_baseline',
      'compare_incoming',
      'score_drift',
      'quarantine_or_approve',
    ],
  });
}

// ── T219 — DimensionalModelBuilder ──────────────────────────────────────────

/**
 * T219 — DimensionalModelBuilder [modeling]
 *
 * PURPOSE: SCD-2 version-only dimensional modeling (DR-62). close_old_version +
 * open_new_version MUST be atomic. Orphaned dim records prohibited.
 * Emit DimensionVersionCreated after atomic commit.
 */
export function createT219Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T219',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'DimensionalModelBuilder',
    archetype: ContractArchetype.MODELING,
    entry: 'Triggered by StagingRecordWritten for a dimension entity',
    purpose:
      'Check existing dim version. Close old (set effectiveTo). Open new (set effectiveFrom). Both operations MUST be atomic in a single transaction. Append fact records only — no UPDATE. Emit DimensionVersionCreated after atomic commit.',
    distinctFrom:
      'T220 MartKpiBuilder (T219 builds dimensional models in core zone; T220 computes KPIs from core for mart)',
    familyId: 'Family-14',

    factoryDependencies: [],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'dimensional-modeling', max_tokens: 4000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.dimensional-modeling.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-70',
        description: 'scd2_no_dimension_update — direct UPDATE on dim records prohibited (DR-62)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-71',
        description: 'Atomic close+open — both in single transaction',
        severity: 'error' as const,
        checkType: 'atomicity',
      },
    ],

    bfaRegistration: {
      entities: ['dimension_version', 'fact_record'],
      events: ['DimensionVersionCreated', 'FactAppended'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'SCD-2 strategy is version-only — direct UPDATE on dim records prohibited (DR-62)',
      'close_old + open_new MUST be atomic — both in single transaction',
      'Orphaned dimension records (open old with no close) are prohibited',
      'effectiveFrom/effectiveTo dates MUST be set on all version records',
      'Fact records are append-only',
      'DimensionVersionCreated emitted after atomic commit',
    ],

    machineComponents: [
      'SCD-2 version-only strategy enforcement',
      'Atomic close_old + open_new transaction',
      'Orphaned dimension guard',
      'Append-only fact enforcement',
    ],

    freedomComponents: [
      'flow14_dimension_table_names — configurable dimension table name map',
      'flow14_version_retention_count — max retained versions per dimension member',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    scdVersioningPolicy: {
      strategy: 'version_only',
      atomicCloseOpen: true,
      appendOnlyFacts: true,
    },

    atomicDimVersioning: {
      closeOldAndOpenNewAtomic: true,
      orphanedDimProhibited: true,
    },

    etlExecutionOrder: [
      'check_existing_dim',
      'close_old_version',
      'open_new_version',
      'emit_DimensionVersionCreated',
    ],
  });
}

// ── T220 — MartKpiBuilder ────────────────────────────────────────────────────

/**
 * T220 — MartKpiBuilder [modeling]
 *
 * PURPOSE: PII-gated mart KPI computation (DR-63). IPiiClassificationService (F462)
 * MUST classify all fields before mart write. Mart write blocked if piiFieldsDetected > 0
 * without masking. RLS policies (F463) applied to all mart results.
 */
export function createT220Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T220',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'MartKpiBuilder',
    archetype: ContractArchetype.MODELING,
    entry: 'Triggered by MartRefreshed schedule or FactAppended for mart entities',
    purpose:
      'Load core facts. Classify PII on all fields via IPiiClassificationService (F462). Block mart write if piiFieldsDetected > 0 without masking. Compute KPIs. Write to mart zone. Apply RLS (F463). Emit PiiClassificationCompleted, KPIComputationCompleted, MartRefreshed.',
    distinctFrom:
      'T219 DimensionalModelBuilder (T220 computes mart KPIs from core; T219 builds core dimensional model from staging)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F462',
        interfaceName: 'IPiiClassificationService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Platform-only PII classification — scans all fields before mart write. Mart write blocked if PII detected without masking.',
      },
      {
        factoryId: 'F463',
        interfaceName: 'IRlsPolicyService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Platform-only RLS policy service — enforces row-level security on mart query results.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'mart-kpi', max_tokens: 4000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.mart-kpi-builder.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-80',
        description:
          'pii_gate_before_mart_write — IPiiClassificationService (F462) called before every mart write (DR-63)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-81',
        description: 'PiiClassificationCompleted emitted before MartRefreshed',
        severity: 'error' as const,
        checkType: 'event_ordering',
      },
    ],

    bfaRegistration: {
      entities: ['mart_kpi', 'pii_classification_result'],
      events: ['PiiClassificationCompleted', 'KPIComputationCompleted', 'MartRefreshed'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'IPiiClassificationService (F462) MUST classify ALL fields before mart write (DR-63)',
      'Mart write is blocked if piiFieldsDetected > 0 without masking',
      'PiiClassificationCompleted event emitted before MartRefreshed',
      'RLS policies (F463) applied to all mart results',
      'MartRefreshed includes piiGateApplied: true',
      'KPIComputationCompleted emitted after KPI aggregation',
    ],

    machineComponents: [
      'PII gate position enforcement (before mart write)',
      'RLS enforcement via F463',
      'PiiClassificationCompleted ordering before MartRefreshed',
    ],

    freedomComponents: [
      'flow14_kpi_definitions — KPI formula config per mart entity',
      'flow14_mart_refresh_schedule — cron schedule for mart refresh jobs',
      'flow14_identity_confidence_threshold — confidence floor for identity join (T221)',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    piiGate: {
      factory: 'F462',
      requiredBeforeMartWrite: true,
      allowedOnlyIfZeroPiiFields: true,
    },

    etlExecutionOrder: [
      'load_core_facts',
      'classify_pii',
      'compute_kpis',
      'write_mart',
      'emit_MartRefreshed',
    ],
  });
}

// ── T221 — IdentityJoinResolver ──────────────────────────────────────────────

/**
 * T221 — IdentityJoinResolver [modeling]
 *
 * PURPOSE: Resolve identity joins with cross-tenant guard (CF-204).
 * All join inputs MUST carry tenantId. Cross-tenant joins rejected immediately.
 * Confidence threshold from FREEDOM config.
 */
export function createT221Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T221',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'IdentityJoinResolver',
    archetype: ContractArchetype.MODELING,
    entry: 'Triggered when cross-entity identity resolution is required in core zone',
    purpose:
      'Validate all join inputs carry tenantId (CF-204). Reject cross-tenant join attempts immediately. Resolve identities with confidence score. Filter results via RLS (F463). Emit IdentityJoinCompleted with crossTenantGuardPassed: true.',
    distinctFrom:
      'T222 CrossFlowAnalyticsExecutor (T221 is single-flow identity resolution; T222 requires FLOW-13 peer)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F463',
        interfaceName: 'IRlsPolicyService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'RLS policy service — filters identity join results by tenant.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'identity-join', max_tokens: 3500 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.identity-join.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-90',
        description: 'cross_tenant_join_blocked — all join inputs must carry tenantId (CF-204)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['identity_join_result'],
      events: ['IdentityJoinCompleted'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'All join inputs MUST carry tenantId (CF-204)',
      'Cross-tenant join MUST be rejected with CrossTenantJoinAttempted error',
      'Confidence score threshold from FREEDOM config (flow14_identity_confidence_threshold)',
      'IdentityJoinCompleted includes crossTenantGuardPassed: true',
      'Results filtered by RLS (F463) before returning',
      'No direct HTTP between services (use queue fabric)',
    ],

    machineComponents: [
      'Cross-tenant join guard (CF-204)',
      'RLS result filtering (F463)',
      'Confidence score computation',
    ],

    freedomComponents: [
      'flow14_identity_confidence_threshold — minimum confidence for identity resolution',
      'flow14_identity_max_join_inputs — max join inputs per resolution request',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    crossTenantJoinGuard: { enforceOnAllInputs: true },

    etlExecutionOrder: [
      'validate_join_inputs',
      'cross_tenant_guard',
      'resolve_identities',
      'emit_IdentityJoinCompleted',
    ],
  });
}

// ── T222 — CrossFlowAnalyticsExecutor ───────────────────────────────────────

/**
 * T222 — CrossFlowAnalyticsExecutor [activation]
 *
 * PURPOSE: Cross-flow analytics requiring FLOW-13 peer to be ACTIVE (BFA peerFlowMustBeActive).
 * RLS applied before returning results. Results include rlsApplied: true.
 */
export function createT222Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T222',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'CrossFlowAnalyticsExecutor',
    archetype: ContractArchetype.ACTIVATION,
    entry: 'Triggered by analytic query requiring FLOW-13 warehouse data',
    purpose:
      'Verify FLOW-13 is ACTIVE (BFA peerFlowMustBeActive check). Execute cross-flow analytics query. Apply RLS (F463) to all results before returning. Emit CrossFlowQueryCompleted with sourceFlows: ["FLOW-13"] and rlsApplied: true.',
    distinctFrom:
      'T221 IdentityJoinResolver (T222 requires FLOW-13 peer and cross-flow data; T221 is single-flow identity resolution)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F463',
        interfaceName: 'IRlsPolicyService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'RLS policy service — applies row-level security to all cross-flow query results.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'cross-flow-analytics', max_tokens: 4000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.cross-flow-analytics.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-100',
        description: 'FLOW-13 peer ACTIVE check — peerFlowMustBeActive BFA rule',
        severity: 'error' as const,
        checkType: 'peer_flow_active',
      },
      {
        gateId: 'QG-14-101',
        description: 'RLS applied to all cross-flow results (F463)',
        severity: 'error' as const,
        checkType: 'rls_enforcement',
      },
    ],

    bfaRegistration: {
      entities: ['cross_flow_query_result'],
      events: ['CrossFlowQueryCompleted'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'FLOW-13 MUST be ACTIVE before T222 executes (peerFlowMustBeActive BFA check)',
      'RLS (F463) MUST be applied before returning cross-flow results',
      'tenantId isolation enforced on all cross-flow data',
      'CrossFlowQueryCompleted includes sourceFlows: ["FLOW-13"] and rlsApplied: true',
      'No direct HTTP to FLOW-13 services — queue fabric only (Rule 11)',
    ],

    machineComponents: [
      'Peer flow active check (FLOW-13 dependency)',
      'RLS enforcement on cross-flow results',
      'Queue fabric only transport',
    ],

    freedomComponents: [
      'flow14_cross_flow_query_timeout_ms — cross-flow query timeout',
      'flow14_cross_flow_max_result_rows — max rows returned from cross-flow query',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    etlExecutionOrder: [
      'verify_flow13_active',
      'execute_cross_flow_query',
      'apply_rls',
      'emit_CrossFlowQueryCompleted',
    ],
  });
}

// ── T223 — ReverseEtlPushHandler ─────────────────────────────────────────────

/**
 * T223 — ReverseEtlPushHandler [activation]
 *
 * PURPOSE: Queue-fabric-only reverse ETL push to external SaaS (DR-64).
 * No direct HTTP to external systems. Rate limit before lock check.
 * RateLimitExhausted emitted on throttle — never silent drop.
 */
export function createT223Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T223',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'ReverseEtlPushHandler',
    archetype: ContractArchetype.ACTIVATION,
    entry: 'Triggered by mart refresh or scheduled reverse ETL job',
    purpose:
      'Check rate limit via IRateLimitGuardService (F430). Check connector lock to prevent overlapping pushes. Enqueue push via QUEUE FABRIC — no direct HTTP to SaaS. Emit ReverseETLPushed with transport: "queue_fabric". On throttle emit RateLimitExhausted.',
    distinctFrom:
      'T214 EtlSyncSagaHandler (T223 pushes OUT to SaaS via reverse ETL; T214 pulls IN from source via sync)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F430',
        interfaceName: 'IRateLimitGuardService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Rate limit guard — checks quota before reverse ETL push dispatch.',
      },
      {
        factoryId: 'F427',
        interfaceName: 'ICredentialVaultService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'Resolves destination connector credentials — opaque reference only in events.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'reverse-etl', max_tokens: 3500 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.reverse-etl.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-110',
        description: 'reverse_etl_queue_fabric_only — no direct HTTP to SaaS (DR-64)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-111',
        description: 'rate_limit_check_before_external_call — F430 before lock check (F430)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-112',
        description: 'credentials_not_in_event_payload — connectorId only in events (F427)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
    ],

    bfaRegistration: {
      entities: ['reverse_etl_push', 'push_lock'],
      events: ['ReverseETLPushed', 'RateLimitExhausted'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'ALL external SaaS pushes MUST go via QUEUE_FABRIC — no direct HTTP (DR-64)',
      'Rate limit check via IRateLimitGuardService (F430) BEFORE lock check',
      'Lock check prevents overlapping pushes for same connector',
      'ReverseETLPushed includes transport: "queue_fabric"',
      'ConnectorId only — no credentials in event payload (F427)',
      'RateLimitExhausted emitted on throttle — never silent drop',
    ],

    machineComponents: [
      'Queue fabric transport enforcement (no direct HTTP)',
      'Rate check before lock check ordering',
      'Connector push lock',
    ],

    freedomComponents: [
      'flow14_reverse_etl_rate_limit_window_ms — rate limit window for reverse ETL',
      'flow14_reverse_etl_push_batch_size — records per reverse ETL push',
      'flow14_reverse_etl_lock_timeout_ms — push lock TTL',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    reverseEtlMode: {
      transport: 'queue_fabric_only',
      directHttpProhibited: true,
    },

    etlExecutionOrder: ['check_rate_limit', 'check_lock', 'enqueue_push', 'emit_ReverseETLPushed'],
  });
}

// ── T224 — WarehouseProvisioningHandler ──────────────────────────────────────

/**
 * T224 — WarehouseProvisioningHandler [provisioning]
 *
 * PURPOSE: Provision tenant warehouse zones in raw→staging→core→mart order (CF-192).
 * Zone skipping is prohibited. RLS policies (F463) registered for all zones.
 * Emit WarehouseTenantProvisioned.
 */
export function createT224Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T224',
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'WarehouseProvisioningHandler',
    archetype: 'provisioning' as ContractArchetype,
    entry: 'Triggered when a new tenant is onboarded and requires warehouse zone provisioning',
    purpose:
      'Provision all four zones in raw→staging→core→mart order. Skipping zones is prohibited (CF-192). Register RLS policies (F463) for all zones. Record provisioning via IWarehouseAuditService (F459). Emit WarehouseTenantProvisioned.',
    distinctFrom:
      'T213 ConnectorRegistrationHandler (T224 provisions the warehouse zones; T213 registers data connectors)',
    familyId: 'Family-14',

    factoryDependencies: [
      {
        factoryId: 'F463',
        interfaceName: 'IRlsPolicyService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description:
          'RLS policy service — registers row-level security policies for all provisioned zones.',
      },
      {
        factoryId: 'F459',
        interfaceName: 'IWarehouseAuditService',
        fabricType: FabricType.CORE,
        providerHint: 'platform',
        description: 'Warehouse audit service — records provisioning event for compliance trail.',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'warehouse-provisioning', max_tokens: 3000 },
      },
      { stationId: 'AF-4', role: 'review', modelHint: MODEL_HINT_FROM_FREEDOM, config: {} },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { promptKey: 'flow14.warehouse-provisioning.genesis' },
      },
    ],

    qualityGates: [
      ...FLOW14_QUALITY_GATES_CORE,
      {
        gateId: 'QG-14-120',
        description:
          'zone_promotion_order_enforced — zones provisioned raw→staging→core→mart (CF-192)',
        severity: 'error' as const,
        checkType: 'named_check',
      },
      {
        gateId: 'QG-14-121',
        description: 'RLS policies registered for all zones (F463)',
        severity: 'error' as const,
        checkType: 'rls_enforcement',
      },
    ],

    bfaRegistration: {
      entities: ['warehouse_tenant', 'warehouse_zone', 'rls_policy'],
      events: ['WarehouseTenantProvisioned'],
      apiRoutes: [],
    },

    ironRules: [
      ...FLOW14_IRON_RULES_CORE,
      'Zone provisioning MUST follow raw→staging→core→mart order (CF-192)',
      'Skipping zones is prohibited (e.g., raw→core without staging)',
      'RLS policies (F463) MUST be registered for all zones on provisioning',
      'WarehouseTenantProvisioned includes zonesProvisioned and rlsPoliciesRegistered: true',
      'IWarehouseAuditService (F459) records provisioning event',
      'Tenant isolation enforced at provisioning — separate index namespaces per tenant',
    ],

    machineComponents: [
      'Zone provisioning order enforcement',
      'RLS policy registration for all zones',
      'Audit event via IWarehouseAuditService',
      'Tenant namespace isolation',
    ],

    freedomComponents: [
      'flow14_zone_naming_convention — naming template for zone indexes per tenant',
      'flow14_default_rls_policy_type — default RLS policy type for new zones',
    ],

    stackCoupling: FLOW14_STACK_COUPLING,

    zonePromotionOrder: {
      order: ['raw', 'staging', 'core', 'mart'],
      skipProhibited: true,
    },

    etlExecutionOrder: [
      'provision_zones',
      'register_rls_policies',
      'emit_WarehouseTenantProvisioned',
    ],
  });
}

// ── Export array ─────────────────────────────────────────────────────────────

export const FLOW14_CONTRACTS: EngineContract[] = [
  createT213Contract(),
  createT214Contract(),
  createT215Contract(),
  createT216Contract(),
  createT217Contract(),
  createT218Contract(),
  createT219Contract(),
  createT220Contract(),
  createT221Contract(),
  createT222Contract(),
  createT223Contract(),
  createT224Contract(),
];
