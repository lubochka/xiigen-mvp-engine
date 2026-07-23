/**
 * FLOW-15 — MVP Builder & App Platform Engine Contracts
 *
 * 40 task types covering:
 * - MVP Builder Core (workspace, scaffold, template, preview, GitHub sync, code export)
 * - Plugin Marketplace (install, review, sandbox)
 * - Billing & Metering (subscription, usage)
 * - Publishing Infrastructure (domain, SSL, blue-green, CDN)
 * - Observability (analytics, metrics, error tracking, alerts)
 * - Integration Hub (connectors, OAuth PKCE, webhooks)
 * - AI Add-ons (chatbot, prediction, automation, insights, token budget)
 * - Scaling & Reliability (autoscale, circuit breaker, health, capacity)
 * - Enterprise Platform (silo graduation, RLS, onboarding, data residency, BYOK)
 *
 * W1-1_F15 (R8): SESSION-GAP-R8
 *
 * EC-4 spec fields used:
 *   cryptographicExchange  — T_START+23 (OAuth PKCE Exchanger)
 *   securityComparisons    — T_START+24 (Webhook Relayer)
 *   eventSourcedState      — T_START+33 (Circuit Breaker Manager)
 *   storageConstraints     — T_START+5 (GitHub Syncer: cursor → postgresql)
 *   keyVersioning          — T_END / T_START+39 (BYOK Key Vault Manager)
 *   durableSaga            — T_START+16 (Blue-Green Deployer), T_START+34, T_START+38
 *   previewIsolation       — T_START+4 (Preview Deployer), T_START+17
 *   quotaCoordination      — T_START+27, T_START+31
 */

import { ContractArchetype } from './archetypes';
import type {
  CryptographicExchangeSpec,
  SecurityComparisonSpec,
  EventSourcedStateSpec,
  StorageConstraintSpec,
  KeyVersioningSpec,
  DurableSagaSpec,
  PreviewIsolationSpec,
  QuotaCoordinationSpec,
} from './contract-schema';

/** Lightweight contract descriptor for FLOW-15 task types. */
export interface Flow15ContractDescriptor {
  taskType: string;
  archetype: ContractArchetype | string;
  namespace: string;
  threshold: number;
  ironRules?: string[];
  qualityGates?: string[];
  stackCoupling?: string[];
  machineFreedom?: { machine: string[]; freedom: string[] };
  // EC-4 spec fields
  cryptographicExchange?: CryptographicExchangeSpec;
  securityComparisons?: SecurityComparisonSpec[];
  eventSourcedState?: EventSourcedStateSpec;
  storageConstraints?: StorageConstraintSpec[];
  keyVersioning?: KeyVersioningSpec;
  durableSaga?: DurableSagaSpec;
  previewIsolation?: PreviewIsolationSpec;
  quotaCoordination?: QuotaCoordinationSpec;
}

const T_START = parseInt(process.env['FLOW15_T_START'] ?? '201', 10);

export const FLOW15_CONTRACTS: Record<string, Flow15ContractDescriptor> = {
  // ── Batch B: MVP Builder Core + Plugin + Billing (T_START+0 to T_START+13) ──

  // T_START+0: Workspace Provision
  [`T${T_START + 0}`]: {
    taskType: `T${T_START + 0}`,
    archetype: ContractArchetype.SCAFFOLDING,
    namespace: 'workspace-provision',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'uses IDatabaseService',
      'returns DataProcessResult',
      'tenant isolation enforced',
    ],
    qualityGates: ['workspace scoped to tenant', 'IDatabaseService.ensureIndex called'],
    stackCoupling: ['FLOW-01'],
    machineFreedom: {
      machine: ['tenant isolation', 'storage scoping'],
      freedom: ['workspace name format', 'workspace metadata fields'],
    },
  },

  // T_START+1: App Spec Parser
  [`T${T_START + 1}`]: {
    taskType: `T${T_START + 1}`,
    archetype: ContractArchetype.SCAFFOLDING,
    namespace: 'app-spec-parser',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'returns DataProcessResult', 'no entity classes'],
    qualityGates: ['NLP spec parsed to archetype', 'intent extraction validated'],
  },

  // T_START+2: App Scaffolder
  [`T${T_START + 2}`]: {
    taskType: `T${T_START + 2}`,
    archetype: ContractArchetype.SCAFFOLDING,
    namespace: 'app-scaffolder',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'template-driven generation', 'idempotent'],
    qualityGates: [
      'scaffolded service extends MicroserviceBase',
      'template resolved from FREEDOM config',
    ],
  },

  // T_START+3: Template Scorer
  [`T${T_START + 3}`]: {
    taskType: `T${T_START + 3}`,
    archetype: ContractArchetype.TEMPLATE_ARCHETYPE,
    namespace: 'template-scorer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'score weight from FREEDOM config',
      'returns DataProcessResult',
    ],
    qualityGates: ['score weight read from flow15_template_score_weight FREEDOM key'],
  },

  // T_START+4: Preview Deployer — previewIsolation required
  [`T${T_START + 4}`]: {
    taskType: `T${T_START + 4}`,
    archetype: ContractArchetype.SANDBOX,
    namespace: 'preview-deployer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'preview separate from production',
      'ephemeral URL',
      'TTL from FREEDOM config',
    ],
    qualityGates: ['preview isolated from production', 'TTL enforced via flow15_sandbox_ttl_hours'],
    previewIsolation: {
      separateFromProduction: true,
      ephemeralUrl: true,
      ttlConfigKey: 'flow15_sandbox_ttl_hours',
    },
  },

  // T_START+5: GitHub Syncer — storageConstraints (cursor in PostgreSQL)
  [`T${T_START + 5}`]: {
    taskType: `T${T_START + 5}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'github-syncer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'syncCursor stored in PostgreSQL only',
      'never Redis for cursor',
    ],
    storageConstraints: [
      {
        field: 'syncCursor',
        requiredStorage: 'postgresql',
        prohibitedStorage: ['redis'],
        reason: 'GitHub sync cursor must survive service restarts — Redis is ephemeral',
        violation: 'score-0',
      },
    ],
  },

  // T_START+6: Code Exporter
  [`T${T_START + 6}`]: {
    taskType: `T${T_START + 6}`,
    archetype: ContractArchetype.BUILD,
    namespace: 'code-exporter',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'returns DataProcessResult',
      'storeDocument before enqueue',
    ],
  },

  // T_START+7: Plugin Installer
  [`T${T_START + 7}`]: {
    taskType: `T${T_START + 7}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'plugin-installer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'sandbox isolation required',
      'returns DataProcessResult',
    ],
    qualityGates: ['plugin isolated in sandbox', 'IPluginSandboxService F523 used'],
  },

  // T_START+8: Plugin Reviewer
  [`T${T_START + 8}`]: {
    taskType: `T${T_START + 8}`,
    archetype: ContractArchetype.MODERATION,
    namespace: 'plugin-reviewer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'three-path moderation: PASS/REJECT/UNCERTAIN',
      'returns DataProcessResult',
    ],
  },

  // T_START+9: Sandbox Manager
  [`T${T_START + 9}`]: {
    taskType: `T${T_START + 9}`,
    archetype: ContractArchetype.SANDBOX,
    namespace: 'sandbox-manager',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'uses IPluginSandboxService F523', 'tenant scoped'],
  },

  // T_START+10: Subscription Manager
  [`T${T_START + 10}`]: {
    taskType: `T${T_START + 10}`,
    archetype: ContractArchetype.BILLING,
    namespace: 'subscription-manager',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'state machine forward only',
      'no backward transitions',
      'returns DataProcessResult',
    ],
    qualityGates: ['TRIAL→ACTIVE→CANCELLED only', 'no CANCELLED→ACTIVE transition'],
  },

  // T_START+11: Usage Meter
  [`T${T_START + 11}`]: {
    taskType: `T${T_START + 11}`,
    archetype: ContractArchetype.METERING,
    namespace: 'usage-meter',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'append-only ledger',
      'quota-enforced',
      'returns DataProcessResult',
    ],
  },

  // T_START+12: Paywall Gate
  [`T${T_START + 12}`]: {
    taskType: `T${T_START + 12}`,
    archetype: ContractArchetype.GUARD,
    namespace: 'paywall-gate',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'feature check before execution',
      'returns PAYMENT_REQUIRED failure',
    ],
  },

  // T_START+13: Analytics Ingester
  [`T${T_START + 13}`]: {
    taskType: `T${T_START + 13}`,
    archetype: ContractArchetype.INGESTOR,
    namespace: 'analytics-ingester',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'append-only insert', 'returns DataProcessResult'],
  },

  // ── Batch C: Publishing + Observability + Integration Hub (T_START+14..+26) ──

  // T_START+14: Domain Provisioner
  [`T${T_START + 14}`]: {
    taskType: `T${T_START + 14}`,
    archetype: ContractArchetype.PUBLISHING,
    namespace: 'domain-provisioner',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'DNS verified before SSL', 'returns DataProcessResult'],
    qualityGates: ['dns_before_ssl_ordering named check passes'],
  },

  // T_START+15: SSL Cert Manager — PLATFORM-ONLY F511
  [`T${T_START + 15}`]: {
    taskType: `T${T_START + 15}`,
    archetype: ContractArchetype.PUBLISHING,
    namespace: 'ssl-cert-manager',
    threshold: 0.92,
    ironRules: [
      'extends MicroserviceBase',
      'uses ISslCertificateService F511',
      'PLATFORM-ONLY',
      'DNS verified before SSL',
    ],
    qualityGates: [
      'dns_before_ssl_ordering named check passes',
      'ISslCertificateService injected via PLATFORM factory',
    ],
  },

  // T_START+16: Blue-Green Deployer — durableSaga EP4
  [`T${T_START + 16}`]: {
    taskType: `T${T_START + 16}`,
    archetype: ContractArchetype.PUBLISHING,
    namespace: 'blue-green-deployer',
    threshold: 0.9,
    ironRules: ['extends MicroserviceBase', 'checkpoint per step', 'EP-4 saga pattern'],
    durableSaga: {
      sagaType: 'EP4',
      steps: [
        { name: 'prepare-green', order: 1, checkpoint: true, onFailure: 'abort' },
        { name: 'health-check-green', order: 2, checkpoint: true, onFailure: 'rollback-green' },
        { name: 'switch-traffic', order: 3, checkpoint: true, onFailure: 'rollback-to-blue' },
        { name: 'decommission-blue', order: 4, checkpoint: true, onFailure: 'manual-review' },
      ],
      checkpointStore: 'xiigen-saga-checkpoints',
      crashRecoveryTest: 'saga-crash-test-harness.spec.ts',
    },
  },

  // T_START+17: Preview Environment Manager — previewIsolation
  [`T${T_START + 17}`]: {
    taskType: `T${T_START + 17}`,
    archetype: ContractArchetype.SANDBOX,
    namespace: 'preview-environment-manager',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'TTL from FREEDOM config', 'ephemeral URL'],
    previewIsolation: {
      separateFromProduction: true,
      ephemeralUrl: true,
      ttlConfigKey: 'flow15_sandbox_ttl_hours',
    },
  },

  // T_START+18: Metric Rollup
  [`T${T_START + 18}`]: {
    taskType: `T${T_START + 18}`,
    archetype: ContractArchetype.ANALYTICS_ENGINE,
    namespace: 'metric-rollup',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'time-windowed aggregation',
      'returns DataProcessResult',
    ],
  },

  // T_START+19: Error Tracker
  [`T${T_START + 19}`]: {
    taskType: `T${T_START + 19}`,
    archetype: ContractArchetype.OBSERVABILITY,
    namespace: 'error-tracker',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'returns DataProcessResult', 'never throws'],
  },

  // T_START+20: Alert Evaluator
  [`T${T_START + 20}`]: {
    taskType: `T${T_START + 20}`,
    archetype: ContractArchetype.OBSERVABILITY,
    namespace: 'alert-evaluator',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'cooldown from FREEDOM config flow15_alert_cooldown_ms',
      'returns DataProcessResult',
    ],
    qualityGates: ['alert cooldown read from flow15_alert_cooldown_ms FREEDOM key'],
  },

  // T_START+21: Integration Installer
  [`T${T_START + 21}`]: {
    taskType: `T${T_START + 21}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'integration-installer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'rate-limit check via F537',
      'returns DataProcessResult',
    ],
  },

  // T_START+22: Webhook Ingestion Manager
  [`T${T_START + 22}`]: {
    taskType: `T${T_START + 22}`,
    archetype: ContractArchetype.INGESTION,
    namespace: 'webhook-ingestion-manager',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'idempotency-gated', 'returns DataProcessResult'],
  },

  // T_START+23: OAuth PKCE Exchanger — cryptographicExchange
  [`T${T_START + 23}`]: {
    taskType: `T${T_START + 23}`,
    archetype: ContractArchetype.OAUTH,
    namespace: 'oauth-pkce',
    threshold: 0.92,
    ironRules: [
      'extends MicroserviceBase',
      'crypto.randomBytes per exchange',
      'never reuse verifier',
      'separate token vault from FLOW-14',
    ],
    qualityGates: [
      'oauth_pkce_per_exchange_verifier named check passes',
      'vault_isolation_flow15 named check passes',
    ],
    cryptographicExchange: {
      protocol: 'OAUTH_PKCE',
      ephemeralSecret: {
        name: 'codeVerifier',
        generatedPer: 'exchange',
        neverReuse: true,
        storageScope: 'transient_session',
      },
      tokenVault: {
        factory: 'F_OAUTH_TOKEN_SERVICE',
        separateFrom: 'FLOW-14-SECRETS-VAULT',
        encrypted: true,
      },
    },
  },

  // T_START+24: Webhook Relayer — securityComparisons HMAC
  [`T${T_START + 24}`]: {
    taskType: `T${T_START + 24}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'webhook-relayer',
    threshold: 0.9,
    ironRules: ['extends MicroserviceBase', 'timing_safe HMAC comparison only'],
    qualityGates: ['timing_safe_hmac_comparison named check passes'],
    securityComparisons: [
      {
        field: 'webhookSignature',
        method: 'timing_safe',
        requiredApi: 'crypto.timingSafeEqual',
        prohibitedPatterns: ['sig1 === sig2', 'sig1 == sig2', '.compare('],
        violation: 'score-0',
      },
    ],
  },

  // T_START+25: External Trigger Handler
  [`T${T_START + 25}`]: {
    taskType: `T${T_START + 25}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'external-trigger-handler',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'idempotency key required',
      'returns DataProcessResult',
    ],
  },

  // T_START+26: Integration Health Checker
  [`T${T_START + 26}`]: {
    taskType: `T${T_START + 26}`,
    archetype: ContractArchetype.SERVICE,
    namespace: 'integration-health-checker',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'returns DataProcessResult',
      'uses IIntegrationRateLimitService F537',
    ],
  },

  // ── Batch D: AI Add-ons + Scaling + Enterprise Platform (T_START+27..T_END) ──

  // T_START+27: AI Chatbot Provisioner — quotaCoordination
  [`T${T_START + 27}`]: {
    taskType: `T${T_START + 27}`,
    archetype: ContractArchetype.AI_ADDON,
    namespace: 'ai-chatbot-provisioner',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'AI ENGINE FABRIC only',
      'separate metering from platform',
      'returns DataProcessResult',
    ],
    qualityGates: [
      'AI_ADDON_METERING_SEPARATION: never use FLOW-14 platform metering',
      'token budget from flow15_ai_token_budget_limit',
    ],
    quotaCoordination: {
      quotaService: 'flow15_ai_token_budget_limit',
      checkBeforeScale: true,
      overQuotaAction: 'reject',
    },
  },

  // T_START+28: Prediction Model Deployer
  [`T${T_START + 28}`]: {
    taskType: `T${T_START + 28}`,
    archetype: ContractArchetype.AI_ADDON,
    namespace: 'prediction-model-deployer',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'AI ENGINE FABRIC only',
      'separate metering from platform',
      'returns DataProcessResult',
    ],
    qualityGates: ['AI_ADDON_METERING_SEPARATION: never use FLOW-14 platform metering'],
  },

  // T_START+29: Automation Runner
  [`T${T_START + 29}`]: {
    taskType: `T${T_START + 29}`,
    archetype: ContractArchetype.AI_ADDON,
    namespace: 'automation-runner',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'AI ENGINE FABRIC only',
      'separate metering from platform',
      'returns DataProcessResult',
    ],
    qualityGates: ['AI_ADDON_METERING_SEPARATION: never use FLOW-14 platform metering'],
  },

  // T_START+30: Insight Generator
  [`T${T_START + 30}`]: {
    taskType: `T${T_START + 30}`,
    archetype: ContractArchetype.AI_ADDON,
    namespace: 'insight-generator',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'AI ENGINE FABRIC only',
      'separate metering from platform',
      'returns DataProcessResult',
    ],
    qualityGates: ['AI_ADDON_METERING_SEPARATION: never use FLOW-14 platform metering'],
  },

  // T_START+31: AI Token Budget Manager — quotaCoordination
  [`T${T_START + 31}`]: {
    taskType: `T${T_START + 31}`,
    archetype: ContractArchetype.AI_ADDON,
    namespace: 'ai-token-budget-manager',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'AI ENGINE FABRIC only',
      'separate metering from platform',
      'budget limit from FREEDOM config',
    ],
    qualityGates: [
      'AI_ADDON_METERING_SEPARATION: never use FLOW-14 platform metering',
      'budget limit from flow15_ai_token_budget_limit',
    ],
    quotaCoordination: {
      quotaService: 'flow15_ai_token_budget_limit',
      checkBeforeScale: true,
      overQuotaAction: 'reject',
    },
  },

  // T_START+32: Auto Scaler
  [`T${T_START + 32}`]: {
    taskType: `T${T_START + 32}`,
    archetype: ContractArchetype.SCALING,
    namespace: 'auto-scaler',
    threshold: 0.88,
    ironRules: ['extends MicroserviceBase', 'event-log driven', 'returns DataProcessResult'],
  },

  // T_START+33: Circuit Breaker Manager — eventSourcedState (Conflict 3)
  [`T${T_START + 33}`]: {
    taskType: `T${T_START + 33}`,
    archetype: ContractArchetype.SCALING,
    namespace: 'circuit-breaker',
    threshold: 0.9,
    ironRules: [
      'extends MicroserviceBase',
      'state derived from event replay only',
      'no mutable state store',
    ],
    qualityGates: [
      'circuit_breaker_state_from_event_log named check passes',
      'Conflict 3 domain tag: circuit_breaker',
    ],
    eventSourcedState: {
      eventType: 'CircuitBreakerStateChanged',
      stateField: 'circuitState',
      initialState: 'CLOSED',
      prohibits: 'mutable_state_store',
      derivationMethod: 'replay_events',
    },
  },

  // T_START+34: Deploy Health Checker — durableSaga
  [`T${T_START + 34}`]: {
    taskType: `T${T_START + 34}`,
    archetype: ContractArchetype.SCALING,
    namespace: 'deploy-health-checker',
    threshold: 0.9,
    ironRules: [
      'extends MicroserviceBase',
      'checkpoint per check step',
      'returns DataProcessResult',
    ],
    durableSaga: {
      sagaType: 'EP4',
      steps: [
        { name: 'probe-health', order: 1, checkpoint: true, onFailure: 'alert-ops' },
        { name: 'evaluate-result', order: 2, checkpoint: true, onFailure: 'rollback' },
      ],
      checkpointStore: 'xiigen-saga-checkpoints',
      crashRecoveryTest: 'saga-crash-test-harness.spec.ts',
    },
  },

  // T_START+35: Capacity Plan Generator
  [`T${T_START + 35}`]: {
    taskType: `T${T_START + 35}`,
    archetype: ContractArchetype.SCALING,
    namespace: 'capacity-plan-generator',
    threshold: 0.88,
    ironRules: [
      'extends MicroserviceBase',
      'event-log driven recommendations',
      'returns DataProcessResult',
    ],
  },

  // T_START+36: Silo Graduation Manager
  [`T${T_START + 36}`]: {
    taskType: `T${T_START + 36}`,
    archetype: ContractArchetype.ENTERPRISE,
    namespace: 'enterprise-silo',
    threshold: 0.92,
    ironRules: [
      'extends MicroserviceBase',
      'graduation one-way only',
      'no reversal path',
      'uses IRlsPolicyProvisionService F559',
    ],
    qualityGates: ['silo_graduation_one_way named check passes'],
  },

  // T_START+37: RLS Policy Provisioner
  [`T${T_START + 37}`]: {
    taskType: `T${T_START + 37}`,
    archetype: ContractArchetype.ENTERPRISE,
    namespace: 'rls-policy-provisioner',
    threshold: 0.92,
    ironRules: [
      'extends MicroserviceBase',
      'uses IRlsPolicyProvisionService F559',
      'PLATFORM-ONLY',
      'returns DataProcessResult',
    ],
    qualityGates: ['IRlsPolicyProvisionService F559 injected via PLATFORM factory'],
  },

  // T_START+38: Enterprise Onboarder — EP4 durable saga
  [`T${T_START + 38}`]: {
    taskType: `T${T_START + 38}`,
    archetype: ContractArchetype.ENTERPRISE,
    namespace: 'enterprise-onboarding',
    threshold: 0.92,
    ironRules: ['extends MicroserviceBase', 'checkpoint per step', 'EP-4 saga pattern'],
    durableSaga: {
      sagaType: 'EP4',
      steps: [
        { name: 'provision-silo', order: 1, checkpoint: true, onFailure: 'abort-and-notify' },
        { name: 'configure-rls', order: 2, checkpoint: true, onFailure: 'rollback-silo' },
        { name: 'setup-byok', order: 3, checkpoint: true, onFailure: 'rollback-rls' },
        { name: 'activate-worm-audit', order: 4, checkpoint: true, onFailure: 'manual-review' },
        { name: 'graduate-silo', order: 5, checkpoint: true, onFailure: 'notify-ops' },
      ],
      checkpointStore: 'xiigen-saga-checkpoints',
      crashRecoveryTest: 'saga-crash-test-harness.spec.ts',
    },
  },

  // T_END (T_START+39): BYOK Key Vault Manager — keyVersioning
  [`T${T_START + 39}`]: {
    taskType: `T${T_START + 39}`,
    archetype: ContractArchetype.ENTERPRISE,
    namespace: 'byok-key-vault-manager',
    threshold: 0.92,
    ironRules: [
      'extends MicroserviceBase',
      'createVersion only — never overwrite',
      'uses IByokKeyVaultService F562',
    ],
    qualityGates: ['byok_rotation_creates_new_version_not_overwrites named check passes'],
    keyVersioning: {
      strategy: 'CREATE_NEW_VERSION',
      prohibitedStrategies: ['overwrite', 'update', 'upsert'],
      versionField: 'keyVersion',
      incrementalVersion: true,
      violation: 'score-0',
    },
  },
};

/** Total count of FLOW-15 contracts. */
export const FLOW15_CONTRACT_COUNT = Object.keys(FLOW15_CONTRACTS).length;
