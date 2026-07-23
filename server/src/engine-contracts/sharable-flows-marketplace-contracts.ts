/**
 * FLOW-32: Sharable Flows & RAG Template Marketplace
 * Task types: T516–T535 (20 task types)
 * Families: 200–210 (11 families)
 * BFA rules: CF-715–CF-738 (24 rules)
 * Factories: F1339–F1418 (~80 factories, 17 PLATFORM-ONLY)
 * Wave: 5
 *
 * GAP-32-01: Supply chain signing infrastructure — F1416/F1417/F1418 (CF-715)
 * GAP-32-02: Content-addressable storage — F1342/F1353 (CF-717 / DD-326)
 * GAP-32-03: Logic/data plane separation — DD-323 for T522/T528/T529/T530 (CF-718)
 * GAP-32-04: Secret-ref indirection — T523 (CF-726 / DD-327)
 * GAP-32-05: Float-billing prevention — T532 BigInt (CF-734 / ST-451)
 * GAP-32-06: Fraud human review required — T534 F1403 (CF-736 / ST-454)
 * GAP-32-07: BFA revalidation all consumers — T526 (CF-729)
 */

// ── T516 — MarketplacePackageCreator ─────────────────────────────────────────

export const T516_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T516',
  name: 'MarketplacePackageCreator',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Creates a new marketplace package. Stores content by SHA-256 hash (DD-326). Sanitizes data — logic plane only.',
  requiredFactories: ['F1342', 'F1353'],
  bfaRules: ['CF-715', 'CF-717'],
  ragPatterns: ['content-addressable-storage-dd326'],
  contentAddressableStorage: {
    required: true,
    hashAlgorithm: 'SHA-256',
    ddRef: 'DD-326',
    cfRef: 'CF-717',
  },
};

// ── T517 — PackageVersionManager ─────────────────────────────────────────────

export const T517_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T517',
  name: 'PackageVersionManager',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Manages package versions. Immutable versions (DD-325). Forced security patches create new versions (DD-328 / CREATE_NEW_VERSION).',
  requiredFactories: ['F1342', 'F1353'],
  bfaRules: ['CF-717'],
  ragPatterns: ['content-addressable-storage-dd326'],
  versionImmutability: {
    mechanism: 'CREATE_NEW_VERSION',
    ddRefs: ['DD-325', 'DD-328'],
    forcedSecurityPatchPolicy: { mechanism: 'CREATE_NEW_VERSION' },
  },
};

// ── T518 — ArtifactPublisher ──────────────────────────────────────────────────

export const T518_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T518',
  name: 'ArtifactPublisher',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Publishes artifact to marketplace. Tripartite signing required: F1416 (sign) + F1417 (SBOM) + F1418 (SLSA). Emits artifact.signed.',
  requiredFactories: ['F1342', 'F1353', 'F1416', 'F1417', 'F1418'],
  requiredNamedChecks: ['supply_chain_tripartite_signing'],
  bfaRules: ['CF-715', 'CF-717'],
  ragPatterns: ['content-addressable-storage-dd326'],
  emitsEvents: [
    {
      event: 'artifact.signed',
      cloudEventType: 'com.xiigen.marketplace.artifact.signed',
      via: 'QUEUE_FABRIC',
    },
  ],
  supplyChainTripartite: {
    required: true,
    factories: ['F1416', 'F1417', 'F1418'],
    cfRef: 'CF-715',
  },
};

// ── T519 — ArtifactVerifier ───────────────────────────────────────────────────

export const T519_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T519',
  name: 'ArtifactVerifier',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Verifies artifact signature. Consumes artifact.signed. Emits artifact.verified.',
  requiredFactories: ['F1416'],
  bfaRules: ['CF-715'],
  consumesEvents: ['artifact.signed'],
  emitsEvents: [
    {
      event: 'artifact.verified',
      cloudEventType: 'com.xiigen.marketplace.artifact.verified',
      via: 'QUEUE_FABRIC',
    },
  ],
};

// ── T520 — ArtifactCertifier ──────────────────────────────────────────────────

export const T520_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T520',
  name: 'ArtifactCertifier',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description: 'Certifies artifact using SBOM. Consumes artifact.signed. Emits artifact.certified.',
  requiredFactories: ['F1417'],
  bfaRules: ['CF-715'],
  consumesEvents: ['artifact.signed'],
  emitsEvents: [
    {
      event: 'artifact.certified',
      cloudEventType: 'com.xiigen.marketplace.artifact.certified',
      via: 'QUEUE_FABRIC',
    },
  ],
};

// ── T521 — ArtifactNotarizer ──────────────────────────────────────────────────

export const T521_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T521',
  name: 'ArtifactNotarizer',
  family: 200,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Creates SLSA provenance attestation. Consumes artifact.signed. Emits artifact.notarized.',
  requiredFactories: ['F1418'],
  bfaRules: ['CF-715'],
  consumesEvents: ['artifact.signed'],
  emitsEvents: [
    {
      event: 'artifact.notarized',
      cloudEventType: 'com.xiigen.marketplace.artifact.notarized',
      via: 'QUEUE_FABRIC',
    },
  ],
};

// ── T522 — MarketplaceInstaller ───────────────────────────────────────────────

export const T522_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T522',
  name: 'MarketplaceInstaller',
  family: 201,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Installs flow template from marketplace. Logic artifacts only — no data transfer (DD-323/CF-718). Consumes artifact.notarized.',
  requiredNamedChecks: ['logic_data_plane_install_only'],
  bfaRules: ['CF-718'],
  consumesEvents: ['artifact.notarized'],
  installModel: {
    planeRestriction: 'LOGIC_ONLY',
    installationScope: ['dag', 'promptTemplate', 'configSchema', 'factoryBindings'],
    prohibited: ['dataTransfer', 'indexCopy', 'embeddingMigration'],
    ddRef: 'DD-323',
  },
};

// ── T523 — BindingDocumentManager ────────────────────────────────────────────

export const T523_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T523',
  name: 'BindingDocumentManager',
  family: 201,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Manages binding documents for installed templates. Stores only secretRef/vaultRef — never literal secrets (CF-726/DD-327).',
  requiredNamedChecks: ['secret_ref_indirection'],
  bfaRules: ['CF-726'],
  secretModel: {
    storageType: 'SECRET_REF_ONLY',
    literalSecretsProhibited: true,
    ddRef: 'DD-327',
    cfRef: 'CF-726',
    requiredInterface: 'ISecretsService',
  },
};

// ── T524 — TemplateDiscoveryEngine ────────────────────────────────────────────

export const T524_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T524',
  name: 'TemplateDiscoveryEngine',
  family: 202,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Discovers marketplace templates matching tenant capability profile. Uses RAG search for semantic discovery.',
  bfaRules: ['CF-715'],
};

// ── T525 — GovernanceMigrationOrchestrator ────────────────────────────────────

export const T525_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T525',
  name: 'GovernanceMigrationOrchestrator',
  family: 202,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Orchestrates governance migrations. Inline invokes T526 for BFA revalidation after each migration step.',
  inlineInvokes: ['T526'],
  bfaRules: ['CF-729'],
};

// ── T526 — BFARevalidationService ────────────────────────────────────────────

export const T526_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T526',
  name: 'BFARevalidationService',
  family: 202,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Revalidates ALL consumer flows against new BFA rules. No sampling. DEGRADED_LOCAL_FALLBACK when FLOW-25 absent.',
  requiredNamedChecks: ['bfa_revalidation_all_consumers'],
  bfaRules: ['CF-729'],
  allConsumerValidation: true,
  softDependencies: [
    {
      flowId: 'FLOW-25',
      description: 'Governance infrastructure — provides authoritative consumer flow list',
      onAbsent: 'DEGRADED_LOCAL_FALLBACK',
      fallbackNote:
        'If FLOW-25 absent, validate against local BFA registry. Emit bfa.revalidation.degraded.',
      degradedModePermitted: true,
    },
  ],
  revalidationModel: {
    iterationScope: 'ALL_CONSUMERS',
    samplingProhibited: true,
    paginationStrategy: 'FULL_SCAN_NO_LIMIT',
    onGovernanceAbsent: 'DEGRADED_LOCAL_FALLBACK',
    mustEmitDegradedEvent: true,
  },
};

// ── T527 — MigrationRollbackHandler ──────────────────────────────────────────

export const T527_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T527',
  name: 'MigrationRollbackHandler',
  family: 202,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Handles migration rollback. Two distinct paths: migration_failure (snapshot restore only) vs bfa_revalidation_failure (reverse migration then restore).',
  bfaRules: ['CF-729'],
  rollbackPaths: [
    {
      trigger: 'migration_failure',
      action: 'snapshot_restore_only',
    },
    {
      trigger: 'bfa_revalidation_failure',
      action: 'reverse_migration_then_restore',
    },
  ],
};

// ── T528 — RAGBlueprintExporter ───────────────────────────────────────────────

export const T528_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T528',
  name: 'RAGBlueprintExporter',
  family: 203,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Exports RAG blueprint for sharing. Logic plane only — no embeddings/documents (DD-323/CF-718).',
  requiredNamedChecks: ['logic_data_plane_separation'],
  bfaRules: ['CF-718', 'CF-731'],
  sharingModel: {
    planeRestriction: 'LOGIC_ONLY',
    dataPlaneProhibited: true,
    permittedArtifacts: ['dag', 'promptTemplate', 'configSchema', 'bfaRules', 'factoryRefs'],
    prohibitedArtifacts: ['embeddings', 'documents', 'secrets', 'tenantData', 'vectorStore'],
    ddRef: 'DD-323',
  },
};

// ── T529 — RAGBlueprintPublisher ──────────────────────────────────────────────

export const T529_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T529',
  name: 'RAGBlueprintPublisher',
  family: 203,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Publishes RAG blueprint to marketplace. Logic plane only — no embeddings/documents (DD-323/CF-718).',
  requiredNamedChecks: ['logic_data_plane_separation'],
  bfaRules: ['CF-718', 'CF-731'],
  sharingModel: {
    planeRestriction: 'LOGIC_ONLY',
    dataPlaneProhibited: true,
    ddRef: 'DD-323',
  },
};

// ── T530 — RAGBlueprintImporter ───────────────────────────────────────────────

export const T530_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T530',
  name: 'RAGBlueprintImporter',
  family: 203,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Imports RAG blueprint from marketplace. Logic plane only — no embeddings/documents (DD-323/CF-718).',
  requiredNamedChecks: ['logic_data_plane_separation'],
  bfaRules: ['CF-718', 'CF-731'],
  sharingModel: {
    planeRestriction: 'LOGIC_ONLY',
    dataPlaneProhibited: true,
    ddRef: 'DD-323',
  },
};

// ── T531 — UsageMeter ─────────────────────────────────────────────────────────

export const T531_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T531',
  name: 'UsageMeter',
  family: 204,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Records usage metering events. Dual-tenant write (DNA-5): publisherTenantId and consumerTenantId both scoped.',
  bfaRules: ['CF-729'],
  dualTenantEvent: {
    tenantIds: ['publisherTenantId', 'consumerTenantId'],
    storageStrategy: 'DUAL_WRITE',
    dnaNotes: 'DNA-5: Two scoped records written — one per tenant context',
  },
};

// ── T532 — RevenueSettlementEngine ────────────────────────────────────────────

export const T532_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T532',
  name: 'RevenueSettlementEngine',
  family: 204,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Processes revenue settlement. BigInt integer cents only — no parseFloat/toFixed (CF-734). DNA-7 idempotency via SETNX.',
  requiredNamedChecks: ['integer_arithmetic_settlement'],
  bfaRules: ['CF-734'],
  ragPatterns: ['idempotent-settlement-integer-arithmetic'],
  settlementModel: {
    arithmeticType: 'BIGINT_CENTS',
    floatArithmeticProhibited: true,
    idempotencyRequired: true,
    idempotencyKeyPattern: 'settlement-{tenantId}-{periodId}',
    storageType: 'STRING_SERIALIZED_BIGINT',
    stRef: 'ST-451',
    cfRef: 'CF-734',
  },
};

// ── T533 — MarketplaceAnalyticsAggregator ─────────────────────────────────────

export const T533_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T533',
  name: 'MarketplaceAnalyticsAggregator',
  family: 205,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Aggregates marketplace analytics. Reads from usage events for publisher dashboards.',
  bfaRules: ['CF-729'],
};

// ── T534 — FraudDetectionService ─────────────────────────────────────────────

export const T534_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T534',
  name: 'FraudDetectionService',
  family: 205,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Detects marketplace fraud. Routes ALL fraud signals to human review via F1403. No auto-suspend/ban (CF-736).',
  requiredFactories: ['F1403'],
  requiredNamedChecks: ['fraud_human_review_required'],
  bfaRules: ['CF-736'],
  humanReviewRequired: true,
  crossTaskReadDependencies: [
    {
      taskTypeId: 'T531',
      event: 'usage.metered',
      readFor: 'self_install_detection',
      description: 'Read T531 usage.metered events to detect publisher self-installs',
      via: 'ES_QUERY',
      filter: 'publisherTenantId == consumerTenantId',
      cfRef: 'CF-736',
    },
  ],
  fraudModel: {
    automatedActionsProhibited: true,
    requiredPath: 'detect_flag_route_to_human',
    permittedAutomatedActions: ['flag', 'score', 'alert', 'createReviewCase'],
    prohibitedAutomatedActions: ['suspend', 'ban', 'revoke', 'terminate', 'disable'],
    stRef: 'ST-454',
    cfRef: 'CF-736',
  },
};

// ── T535 — SandboxEnvironmentProvisioner ─────────────────────────────────────

export const T535_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T535',
  name: 'SandboxEnvironmentProvisioner',
  family: 205,
  flowId: 'FLOW-32',
  archetype: 'orchestration',
  version: 'v1',
  executionModel: 'async',
  description:
    'Provisions isolated sandbox environments for template testing. Synthetic tenantId with "sandbox-" prefix for production isolation.',
  bfaRules: ['CF-715'],
  syntheticTenantId: {
    strategy: 'PREFIXED_UUID',
    prefix: 'sandbox-',
    note: 'Middleware isolation requires sandbox- prefix to block production resource access',
  },
};

// ── FLOW_32_CONTRACTS export ──────────────────────────────────────────────────

export const FLOW_32_CONTRACTS: Record<string, unknown>[] = [
  T516_CONTRACT,
  T517_CONTRACT,
  T518_CONTRACT,
  T519_CONTRACT,
  T520_CONTRACT,
  T521_CONTRACT,
  T522_CONTRACT,
  T523_CONTRACT,
  T524_CONTRACT,
  T525_CONTRACT,
  T526_CONTRACT,
  T527_CONTRACT,
  T528_CONTRACT,
  T529_CONTRACT,
  T530_CONTRACT,
  T531_CONTRACT,
  T532_CONTRACT,
  T533_CONTRACT,
  T534_CONTRACT,
  T535_CONTRACT,
];
