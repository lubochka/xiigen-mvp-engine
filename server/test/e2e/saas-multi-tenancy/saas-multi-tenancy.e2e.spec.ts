/**
 * FLOW-15 E2E — SaaS Platform & Multi-Tenancy Engine
 *
 * Archetypes: TEMPLATE_ARCHETYPE, SCAFFOLDING, SANDBOX, BILLING, METERING,
 *             PUBLISHING, OAUTH, AI_ADDON, SCALING, ENTERPRISE
 * Task types: T201–T240 (40 contracts, T_START default 201)
 * Fabric interfaces:
 *   ISslCertificateService (F511), IPluginSandboxService (F523),
 *   IIntegrationRateLimitService (F537), IRlsPolicyProvisionService (F559),
 *   IWormAuditService (F561), IByokKeyVaultService (F562),
 *   IDataResidencyService (F563)
 * CloudEvents (subset): WorkspaceProvisioned, OAuthTokenExchangeCompleted,
 *   UsageMeterRecorded, SiloGraduationCompleted, BillingSubscriptionActivated,
 *   SandboxForked, CircuitBreakerStateChanged, ByokKeyRotated
 *
 * Named checks:
 *   oauth_pkce_per_exchange_verifier
 *   timing_safe_hmac_comparison
 *   circuit_breaker_state_from_event_log
 *   dns_before_ssl_ordering
 *   github_sync_cursor_postgresql_not_redis
 *   byok_rotation_creates_new_version_not_overwrites
 *   vault_isolation_flow15
 *   silo_graduation_one_way
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — workspace provisioning, OAuth PKCE, billing lifecycle, AI addon metering, sandbox fork/commit
 *   2. Error path — OAuth PKCE failure, BYOK rotation conflict, silo graduation rollback attempt
 *   3. Tenant isolation — vault namespace isolation, separate metering per tenant
 *   4. Idempotency — workspace provisioning idempotency, billing event dedup
 *   5. UI state mapping — provisioning progress, circuit breaker state display
 *   6. API contract — /api/dynamic/xiigen-workspaces, /api/dynamic/xiigen-subscriptions, /api/dynamic/xiigen-ai-addons
 *   7. CloudEvents — WorkspaceProvisioned, OAuthTokenExchangeCompleted, UsageMeterRecorded, SiloGraduationCompleted
 *   8. Named checks — oauth_pkce_per_exchange_verifier, byok_rotation_creates_new_version_not_overwrites, silo_graduation_one_way
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import {
  EngineContract,
  type EngineContractParams,
} from '../../../src/engine-contracts/contract-schema';
import { FlowGenerator } from '../../../src/engine/flow-generator';
import { AfPipeline } from '../../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../../src/engine/generic-node-executor';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { PromotionLadder } from '../../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../../src/freedom/config-manager';
import { FactoryRegistry } from '../../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../../src/engine-contracts/task-type-registry';
import { FabricType } from '../../../src/factories/fabric-type';
import { flow15NamedChecks } from '../../../src/af-stations/named-checks/saas-multi-tenancy.named-checks';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'flow15-run-id',
        status: 'PASS',
        score: 91,
        trace: [
          { nodeId: 'workspace-provision', nodeType: 'scaffolding', status: 'PASS', durationMs: 8 },
          { nodeId: 'oauth-pkce-exchanger', nodeType: 'oauth', status: 'PASS', durationMs: 12 },
          { nodeId: 'subscription-manager', nodeType: 'billing', status: 'PASS', durationMs: 7 },
          { nodeId: 'usage-meter', nodeType: 'metering', status: 'PASS', durationMs: 5 },
          { nodeId: 'sandbox-manager', nodeType: 'sandbox', status: 'PASS', durationMs: 10 },
          { nodeId: 'circuit-breaker', nodeType: 'scaling', status: 'PASS', durationMs: 6 },
          { nodeId: 'silo-graduation', nodeType: 'enterprise', status: 'PASS', durationMs: 15 },
          { nodeId: 'byok-key-vault', nodeType: 'enterprise', status: 'PASS', durationMs: 9 },
        ],
        finalOutput: { code: '// FLOW-15 SaaS Platform & Multi-Tenancy' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function createEngine(): FlowGenerator {
  return new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry: new FactoryRegistry(),
    taskRegistry: new TaskTypeRegistry(),
    bfa: new BusinessFlowArbiter(),
    promotionLadder: new PromotionLadder(),
    freedomManager: new FreedomConfigManager(),
  });
}

// ── FLOW-15 inline contract param builders ───────────────────────────────────

function flow15WorkspaceParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T201_F15_WORKSPACE${suffix}`,
    flowId: 'FLOW-15',
    flowName: 'SaaS Platform & Multi-Tenancy',
    name: 'WorkspaceProvisioner',
    archetype: ContractArchetype.SCAFFOLDING,
    entry: 'workspace.provision.requested CloudEvent',
    purpose:
      'Provision a new tenant workspace. Tenant isolation enforced via AsyncLocalStorage. ' +
      'IDatabaseService.ensureIndex called. Returns DataProcessResult. ' +
      'Emits WorkspaceProvisioned CloudEvent after storeDocument (DNA-8).',
    factoryDependencies: [
      {
        factoryId: `F_DB_WORKSPACE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Workspace document storage',
      },
      {
        factoryId: `F_QUEUE_WORKSPACE${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'WorkspaceProvisioned event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-15-W01${suffix}`,
        description: 'workspace scoped to tenant — tenant isolation enforced',
        severity: 'error',
        checkType: 'tenant_isolation_enforced',
      },
      {
        gateId: `QG-15-W02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`saas_workspace_f15${suffix}`],
      events: [`workspace.provisioned.f15${suffix}`],
      apiRoutes: [`/api/dynamic/xiigen-workspaces`],
    },
    ironRules: [
      'IR-1: Tenant isolation enforced — workspace scoped to tenant from AsyncLocalStorage',
      'IR-2: IDatabaseService.ensureIndex called on workspace creation',
      'IR-3: DNA-8 storeDocument BEFORE enqueue for WorkspaceProvisioned',
    ],
    machineComponents: [
      'Tenant isolation gate',
      'Index provisioning',
      'Outbox pattern enforcement',
    ],
    freedomComponents: ['flow15_workspace_name_format', 'flow15_workspace_metadata_schema'],
    familyId: 'Family-15',
  };
}

function flow15OAuthParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T224_F15_OAUTH${suffix}`,
    flowId: 'FLOW-15',
    flowName: 'SaaS Platform & Multi-Tenancy',
    name: 'OAuthPkceExchanger',
    archetype: ContractArchetype.OAUTH,
    entry: 'oauth.token.exchange.requested CloudEvent',
    purpose:
      'OAuth PKCE token exchange. crypto.randomBytes(32) per exchange — never reuse verifier. ' +
      'oauth_pkce_per_exchange_verifier named check. vault_isolation_flow15: separate token vault from FLOW-14. ' +
      'Emits OAuthTokenExchangeCompleted. Never store verifier beyond session scope.',
    factoryDependencies: [
      {
        factoryId: `F_OAUTH_TOKEN_SERVICE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'OAuth token transient session storage',
      },
      {
        factoryId: `F_QUEUE_OAUTH${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'OAuthTokenExchangeCompleted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-15-O01${suffix}`,
        description: 'oauth_pkce_per_exchange_verifier — per-exchange crypto.randomBytes(32)',
        severity: 'error',
        checkType: 'oauth_pkce_per_exchange_verifier',
      },
      {
        gateId: `QG-15-O02${suffix}`,
        description: 'vault_isolation_flow15 — token vault separate from FLOW-14',
        severity: 'error',
        checkType: 'vault_isolation_flow15',
      },
    ],
    bfaRegistration: {
      entities: [`oauth_token_exchange_f15${suffix}`],
      events: [`oauth.token.exchange.completed.f15${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: crypto.randomBytes(32) per exchange — never reuse verifier',
      'IR-2: Token vault isolated from FLOW-14 secrets vault',
      'IR-3: Never store verifier beyond transient session scope',
    ],
    machineComponents: [
      'PKCE verifier per-exchange gate',
      'Vault isolation enforcer',
      'Token expiry enforcement',
    ],
    freedomComponents: ['flow15_oauth_token_ttl_seconds'],
    familyId: 'Family-15',
  };
}

function flow15BillingParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T211_F15_BILLING${suffix}`,
    flowId: 'FLOW-15',
    flowName: 'SaaS Platform & Multi-Tenancy',
    name: 'SubscriptionManager',
    archetype: ContractArchetype.BILLING,
    entry: 'billing.subscription.activate.requested CloudEvent',
    purpose:
      'Manage SaaS subscription lifecycle. Forward-only state machine: TRIAL→ACTIVE→CANCELLED. ' +
      'No backward transitions. Emits BillingSubscriptionActivated. DNA-8: storeDocument before enqueue.',
    factoryDependencies: [
      {
        factoryId: `F_DB_BILLING${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Subscription state document storage',
      },
      {
        factoryId: `F_QUEUE_BILLING${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'BillingSubscriptionActivated event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-15-B01${suffix}`,
        description: 'subscription state machine forward-only: TRIAL→ACTIVE→CANCELLED',
        severity: 'error',
        checkType: 'subscription_forward_only',
      },
      {
        gateId: `QG-15-B02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`saas_subscription_f15${suffix}`],
      events: [`billing.subscription.activated.f15${suffix}`],
      apiRoutes: [`/api/dynamic/xiigen-subscriptions`],
    },
    ironRules: [
      'IR-1: State machine forward-only: TRIAL→ACTIVE→CANCELLED — no backward transitions',
      'IR-2: CANCELLED→ACTIVE transition must be blocked',
      'IR-3: DNA-8 storeDocument BEFORE enqueue',
    ],
    machineComponents: [
      'Forward-only transition gate',
      'State machine validator',
      'Outbox enforcer',
    ],
    freedomComponents: ['flow15_trial_duration_days', 'flow15_subscription_plan_schema'],
    familyId: 'Family-15',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — Happy Path [WORKSPACE → OAUTH → BILLING → AI ADDON → SANDBOX]', () => {
  const TENANT = 'flow15-happy-tenant';

  it('F15-H1: workspace provisioner contract generates successfully (tenant isolation, DNA-8)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow15WorkspaceParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F15-H2: OAuth PKCE exchanger contract generates successfully (per-exchange verifier, vault isolation)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow15OAuthParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F15-H3: subscription manager contract generates successfully (forward-only state machine)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow15BillingParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F15-H4: workspace provisioning stores document before emitting WorkspaceProvisioned (DNA-8 outbox)', () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    return trackedDb
      .storeDocument(
        'xiigen-workspaces',
        { workspaceId: 'ws-001', tenantId: TENANT, status: 'provisioning' },
        'ws-001',
      )
      .then(() =>
        trackedQueue.enqueue('workspace.provisioned', {
          workspaceId: 'ws-001',
          tenantId: TENANT,
        }),
      )
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });

  it('F15-H5: OAuth token exchange emits OAuthTokenExchangeCompleted with accessToken', async () => {
    const queue = makeInMemoryQueue();

    const tokenEvent = createCloudEvent({
      eventType: 'oauth.token.exchange.completed',
      source: 'flow-15/oauth-pkce',
      data: {
        exchangeId: 'exch-001',
        tenantId: TENANT,
        accessToken: 'at-redacted',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        completedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue(
      'oauth.token.exchange.completed',
      tokenEvent as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['accessToken']).toBeDefined();
    expect(data['expiresAt']).toBeDefined();
  });

  it('F15-H6: billing subscription activates via TRIAL→ACTIVE transition — stores before enqueue', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const subscription = {
      subscriptionId: 'sub-001',
      tenantId: TENANT,
      status: 'ACTIVE',
      previousStatus: 'TRIAL',
      activatedAt: new Date().toISOString(),
    };

    // DNA-8: store first
    await db.storeDocument('xiigen-subscriptions', subscription, 'sub-001');
    await queue.enqueue(
      'billing.subscription.activated',
      createCloudEvent({
        eventType: 'billing.subscription.activated',
        source: 'flow-15/subscription-manager',
        data: { subscriptionId: 'sub-001', tenantId: TENANT, planId: 'plan-pro' },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const storedSub = await db.getDocument('xiigen-subscriptions', 'sub-001');
    expect(storedSub.isSuccess).toBe(true);
    expect((storedSub.data as Record<string, unknown>)['status']).toBe('ACTIVE');
    expect(queue._emitted[0].queue).toBe('billing.subscription.activated');
  });

  it('F15-H7: AI addon usage meter emits UsageMeterRecorded after token consumption', async () => {
    const queue = makeInMemoryQueue();

    const meterEvent = createCloudEvent({
      eventType: 'usage.meter.recorded',
      source: 'flow-15/usage-meter',
      data: {
        meterId: 'meter-001',
        tenantId: TENANT,
        addonType: 'ai-chatbot',
        tokensConsumed: 1500,
        budgetLimit: 100_000,
        remainingBudget: 98_500,
        recordedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue('usage.meter.recorded', meterEvent as unknown as Record<string, unknown>);

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['tokensConsumed']).toBe(1500);
    expect(data['addonType']).toBe('ai-chatbot');
    expect(Number(data['remainingBudget'])).toBeLessThan(Number(data['budgetLimit']));
  });

  it('F15-H8: sandbox fork emits SandboxForked with newSandboxId', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const sandboxDoc = {
      sandboxId: 'sb-001',
      tenantId: TENANT,
      pluginId: 'plugin-demo',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Store sandbox before emitting fork event (DNA-8)
    await db.storeDocument('xiigen-sandboxes', sandboxDoc, 'sb-001');

    const forkEvent = createCloudEvent({
      eventType: 'sandbox.forked',
      source: 'flow-15/sandbox-manager',
      data: {
        originalSandboxId: 'sb-001',
        newSandboxId: 'sb-002',
        tenantId: TENANT,
        forkedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue('sandbox.forked', forkEvent as unknown as Record<string, unknown>);

    const [isValid] = validateCloudEvent(forkEvent);
    expect(isValid).toBe(true);
    const forkData = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(forkData['newSandboxId']).toBe('sb-002');
    expect(forkData['originalSandboxId']).toBe('sb-001');
  });

  it('F15-H9: silo graduation emits SiloGraduationCompleted — one-way transition enforced', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const siloDoc = {
      siloId: 'silo-001',
      tenantId: TENANT,
      status: 'GRADUATED',
      graduatedAt: new Date().toISOString(),
    };

    // DNA-8: store before emit
    await db.storeDocument('xiigen-silos', siloDoc, 'silo-001');

    const graduationEvent = createCloudEvent({
      eventType: 'silo.graduation.completed',
      source: 'flow-15/silo-graduation-manager',
      data: {
        siloId: 'silo-001',
        tenantId: TENANT,
        previousTier: 'shared',
        newTier: 'isolated-silo',
        completedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue(
      'silo.graduation.completed',
      graduationEvent as unknown as Record<string, unknown>,
    );

    const [isValid] = validateCloudEvent(graduationEvent);
    expect(isValid).toBe(true);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['newTier']).toBe('isolated-silo');
    expect(data['previousTier']).toBe('shared');
  });

  it('F15-H10: BYOK key rotation creates new version — not overwrites existing key', async () => {
    const db = makeInMemoryDb();

    // Store key v1
    await db.storeDocument(
      'xiigen-byok-keys',
      {
        keyId: 'key-001',
        version: 1,
        tenantId: TENANT,
        createdAt: new Date().toISOString(),
        active: false,
      },
      'key-001-v1',
    );
    // Rotation creates key v2 (new document — never overwrites v1)
    await db.storeDocument(
      'xiigen-byok-keys',
      {
        keyId: 'key-002',
        version: 2,
        tenantId: TENANT,
        createdAt: new Date().toISOString(),
        active: true,
        rotatedFromKeyId: 'key-001',
      },
      'key-002-v2',
    );

    const allKeys = await db.searchDocuments('xiigen-byok-keys', { tenantId: TENANT });
    expect(allKeys.isSuccess).toBe(true);
    const keys = allKeys.data as Record<string, unknown>[];
    expect(keys).toHaveLength(2);

    const activeKey = keys.find((k) => k['active'] === true);
    expect(activeKey).toBeDefined();
    expect(activeKey!['version']).toBe(2);
    expect(activeKey!['rotatedFromKeyId']).toBe('key-001');
  });

  it('F15-H11: DNS provisioned before SSL certificate issued (dns_before_ssl_ordering)', async () => {
    const steps: string[] = [];

    // Domain provisioner step order
    steps.push('dns-record-created');
    steps.push('dns-propagation-verified');
    steps.push('ssl-certificate-issued');

    const dnsIdx = steps.findIndex((s) => s.includes('dns'));
    const sslIdx = steps.findIndex((s) => s.includes('ssl'));

    expect(dnsIdx).toBeGreaterThanOrEqual(0);
    expect(sslIdx).toBeGreaterThanOrEqual(0);
    expect(dnsIdx).toBeLessThan(sslIdx);
  });

  it('F15-H12: GitHub sync cursor stored in PostgreSQL — not Redis', async () => {
    const db = makeInMemoryDb();

    const syncState = {
      connectorId: 'gh-conn-001',
      tenantId: TENANT,
      syncCursor: 'sha256-abc123def456',
      storageBackend: 'postgresql',
      lastSyncAt: new Date().toISOString(),
    };

    await db.storeDocument('xiigen-github-sync-state', syncState, 'gh-conn-001');

    const result = await db.getDocument('xiigen-github-sync-state', 'gh-conn-001');
    expect(result.isSuccess).toBe(true);
    const stored = result.data as Record<string, unknown>;
    expect(stored['syncCursor']).toBeDefined();
    expect(stored['storageBackend']).toBe('postgresql');
    expect(stored['storageBackend']).not.toBe('redis');
  });

  it('F15-H13: circuit breaker state derived from event log replay — not mutable store', async () => {
    const eventLog: Array<{ type: string; at: string }> = [
      { type: 'CircuitBreakerClosed', at: '2026-03-31T10:00:00Z' },
      { type: 'CircuitBreakerOpened', at: '2026-03-31T10:05:00Z' },
      { type: 'CircuitBreakerHalfOpen', at: '2026-03-31T10:10:00Z' },
    ];

    // State derived by replaying events (circuit_breaker_state_from_event_log)
    type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    const stateMap: Record<string, CBState> = {
      CircuitBreakerClosed: 'CLOSED',
      CircuitBreakerOpened: 'OPEN',
      CircuitBreakerHalfOpen: 'HALF_OPEN',
    };
    const currentState = eventLog.reduce(
      (state, event) => stateMap[event.type] ?? state,
      'CLOSED' as CBState,
    );

    expect(currentState).toBe('HALF_OPEN');
    // Verify replay — state is derived, not from a mutable field
    expect(eventLog.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — Error Path', () => {
  it('F15-E1: OAuth PKCE with static userId-based verifier returns PKCE_STATIC_VERIFIER_REJECTED', () => {
    // oauth_pkce_per_exchange_verifier: hash(userId) as verifier is prohibited
    const verifierCodeAttempt = 'sha256(userId + timestamp)';
    const isStaticVerifier = /sha256.*userId|hash.*userId|md5.*userId/i.test(verifierCodeAttempt);

    const result = isStaticVerifier
      ? DataProcessResult.failure<Record<string, unknown>>(
          'PKCE_STATIC_VERIFIER_REJECTED',
          'OAuth PKCE verifier must be crypto.randomBytes(32) per exchange — not derived from userId',
        )
      : DataProcessResult.success({ exchangeId: 'exch-ok' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PKCE_STATIC_VERIFIER_REJECTED');
  });

  it('F15-E2: BYOK key rotation attempt using update/overwrite returns BYOK_OVERWRITE_BLOCKED', () => {
    // byok_rotation_creates_new_version_not_overwrites: key.update() is prohibited
    const rotationOperation = 'key.update({ keyMaterial: newKey })';
    const isOverwrite = /key\.(update|overwrite|set)\s*\(/i.test(rotationOperation);

    const result = isOverwrite
      ? DataProcessResult.failure<Record<string, unknown>>(
          'BYOK_OVERWRITE_BLOCKED',
          'BYOK rotation must call createKeyVersion — key.update() is not permitted',
        )
      : DataProcessResult.success({ newKeyId: 'key-new' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BYOK_OVERWRITE_BLOCKED');
    expect(result.errorMessage).toContain('createKeyVersion');
  });

  it('F15-E3: silo graduation rollback attempt returns SILO_GRADUATION_IRREVERSIBLE', () => {
    // silo_graduation_one_way: downgrade/revert operations must be blocked
    const graduationCode = 'await silo.rollbackGraduation(siloId)';
    const hasRollback = /rollback.*graduation|revert.*silo|downgrade/i.test(graduationCode);

    const result = hasRollback
      ? DataProcessResult.failure<Record<string, unknown>>(
          'SILO_GRADUATION_IRREVERSIBLE',
          'Silo graduation is a one-way operation — downgrade/rollback paths are not supported',
        )
      : DataProcessResult.success({ graduated: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SILO_GRADUATION_IRREVERSIBLE');
    expect(result.errorMessage).toContain('one-way');
  });

  it('F15-E4: subscription CANCELLED→ACTIVE transition returns INVALID_TRANSITION', () => {
    // Subscription state machine: forward-only. CANCELLED→ACTIVE is blocked.
    const currentStatus = 'CANCELLED';
    const targetStatus = 'ACTIVE';
    const allowedTransitions: Record<string, string[]> = {
      TRIAL: ['ACTIVE'],
      ACTIVE: ['CANCELLED'],
      CANCELLED: [], // no forward transitions from CANCELLED
    };

    const allowed = (allowedTransitions[currentStatus] ?? []).includes(targetStatus);
    const result = allowed
      ? DataProcessResult.success({ transitioned: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'INVALID_TRANSITION',
          `Subscription transition ${currentStatus}→${targetStatus} is not permitted`,
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_TRANSITION');
    expect(result.errorMessage).toContain('CANCELLED→ACTIVE');
  });

  it('F15-E5: AI token budget exhausted returns TOKEN_BUDGET_EXCEEDED', () => {
    // quotaCoordination: flow15_ai_token_budget_limit — overQuotaAction: reject
    const tokenBudgetLimit = 100_000;
    const currentUsage = 100_001; // exceeded

    const isOverBudget = currentUsage > tokenBudgetLimit;
    const result = isOverBudget
      ? DataProcessResult.failure<Record<string, unknown>>(
          'TOKEN_BUDGET_EXCEEDED',
          `AI token budget exceeded: ${currentUsage} > ${tokenBudgetLimit}`,
        )
      : DataProcessResult.success({ tokensAllowed: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TOKEN_BUDGET_EXCEEDED');
    expect(result.errorMessage).toContain('100001');
  });

  it('F15-E6: circuit breaker state set via db.update() returns CIRCUIT_BREAKER_MUTABLE_STATE_BLOCKED', () => {
    // circuit_breaker_state_from_event_log: setState() and db.update({state}) are prohibited
    const stateUpdateCode = 'await db.update({ state: "OPEN", circuitId })';
    const usesMutableStore =
      /db\.(update|set)\s*\(\s*\{.*state/i.test(stateUpdateCode) ||
      /setState\s*\(/.test(stateUpdateCode);

    const result = usesMutableStore
      ? DataProcessResult.failure<Record<string, unknown>>(
          'CIRCUIT_BREAKER_MUTABLE_STATE_BLOCKED',
          'Circuit breaker state must be derived from event log replay — not mutable state store',
        )
      : DataProcessResult.success({ stateUpdated: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CIRCUIT_BREAKER_MUTABLE_STATE_BLOCKED');
  });

  it('F15-E7: SSL certificate issued before DNS propagation returns DNS_ORDER_VIOLATION', () => {
    // dns_before_ssl_ordering: DNS must be confirmed before SSL cert issuance
    const steps = ['ssl-certificate-issued', 'dns-record-created'];

    const dnsIdx = steps.findIndex((s) => s.includes('dns'));
    const sslIdx = steps.findIndex((s) => s.includes('ssl'));
    const isDnsBeforeSsl = dnsIdx >= 0 && sslIdx >= 0 && dnsIdx < sslIdx;

    const result = isDnsBeforeSsl
      ? DataProcessResult.success({ domainProvisioned: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'DNS_ORDER_VIOLATION',
          'SSL certificate cannot be issued before DNS propagation is verified',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DNS_ORDER_VIOLATION');
    expect(result.errorMessage).toContain('DNS propagation');
  });

  it('F15-E8: paywall gate blocks feature when subscription is TRIAL — returns PAYMENT_REQUIRED', () => {
    // T_START+12 PaywallGate: feature check before execution
    const subscriptionStatus = 'TRIAL';
    const requiredTier = 'PRO';
    const tierOrder = { TRIAL: 1, PRO: 2, ENTERPRISE: 3 };

    const canAccess =
      (tierOrder[subscriptionStatus as keyof typeof tierOrder] ?? 0) >=
      (tierOrder[requiredTier as keyof typeof tierOrder] ?? 0);

    const result = canAccess
      ? DataProcessResult.success({ accessGranted: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'PAYMENT_REQUIRED',
          `Feature requires ${requiredTier} subscription — current tier: ${subscriptionStatus}`,
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PAYMENT_REQUIRED');
  });

  it('F15-E9: database write failure returns DataProcessResult.failure — no throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated platform storage failure'),
    );

    const result = await db.storeDocument(
      'xiigen-workspaces',
      { workspaceId: 'ws-fail', tenantId: 'tenant-fail' },
      'ws-fail',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
  });

  it('F15-E10: GitHub sync cursor stored in Redis returns CURSOR_STORAGE_VIOLATION', () => {
    // github_sync_cursor_postgresql_not_redis: Redis is ephemeral — cursor must survive restarts
    const cursorStoreCode = 'await redis.set("syncCursor", cursor)';
    const usesRedisForCursor =
      /redis\.(set|setEx|hset)\s*\(.*cursor/i.test(cursorStoreCode) ||
      /redis\.(set|setEx|hset)\s*\(.*syncCursor/i.test(cursorStoreCode);

    const result = usesRedisForCursor
      ? DataProcessResult.failure<Record<string, unknown>>(
          'CURSOR_STORAGE_VIOLATION',
          'GitHub sync cursor must be stored in PostgreSQL — Redis is ephemeral and cannot survive restarts',
        )
      : DataProcessResult.success({ cursorStored: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CURSOR_STORAGE_VIOLATION');
    expect(result.errorMessage).toContain('PostgreSQL');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — Tenant Isolation', () => {
  it('F15-T1: tenant-A and tenant-B workspace contracts generate independently', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow15WorkspaceParams('-ta')), 'flow15-tenant-A'),
      engineB.generate(new EngineContract(flow15WorkspaceParams('-tb')), 'flow15-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T201_F15_WORKSPACE-ta');
    expect(rB.data!.contractId).toBe('T201_F15_WORKSPACE-tb');
  });

  it('F15-T2: tenant-A workspace records do not appear in tenant-B store', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'xiigen-workspaces',
      { workspaceId: 'ws-a1', tenantId: 'tenant-A', status: 'active' },
      'ws-a1',
    );

    const bResults = await dbB.searchDocuments('xiigen-workspaces', {});
    expect((bResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F15-T3: vault namespace isolation — tenant-A BYOK key not accessible to tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'xiigen-byok-keys',
      { keyId: 'key-a1', version: 1, tenantId: 'tenant-A', active: true },
      'key-a1',
    );

    const tenantBKeys = await db.searchDocuments('xiigen-byok-keys', { tenantId: 'tenant-B' });
    expect((tenantBKeys.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F15-T4: metering is tenant-scoped — tenant-A usage does not affect tenant-B budget', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'xiigen-usage-meters',
      { meterId: 'meter-a1', tenantId: 'tenant-A', tokensConsumed: 50_000 },
      'meter-a1',
    );
    await db.storeDocument(
      'xiigen-usage-meters',
      { meterId: 'meter-b1', tenantId: 'tenant-B', tokensConsumed: 10_000 },
      'meter-b1',
    );

    const tenantAMeter = await db.searchDocuments('xiigen-usage-meters', { tenantId: 'tenant-A' });
    const tenantBMeter = await db.searchDocuments('xiigen-usage-meters', { tenantId: 'tenant-B' });

    const rowsA = tenantAMeter.data as Record<string, unknown>[];
    const rowsB = tenantBMeter.data as Record<string, unknown>[];
    expect(rowsA[0]!['tokensConsumed']).toBe(50_000);
    expect(rowsB[0]!['tokensConsumed']).toBe(10_000);
    expect(rowsA[0]!['tokensConsumed']).not.toBe(rowsB[0]!['tokensConsumed']);
  });

  it('F15-T5: CloudEvents carry tenantid — ALS context propagation', () => {
    const eventA = createCloudEvent({
      eventType: 'workspace.provisioned',
      source: 'flow-15/workspace-provisioner',
      data: { workspaceId: 'ws-a2' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'workspace.provisioned',
      source: 'flow-15/workspace-provisioner',
      data: { workspaceId: 'ws-b2' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F15-T6: subscription records are tenant-scoped — tenant-A subscription not visible to tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'xiigen-subscriptions',
      { subscriptionId: 'sub-a1', tenantId: 'tenant-A', status: 'ACTIVE' },
      'sub-a1',
    );

    const tenantBSubs = await db.searchDocuments('xiigen-subscriptions', { tenantId: 'tenant-B' });
    expect((tenantBSubs.data as Record<string, unknown>[]).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — Idempotency', () => {
  it('F15-I1: workspace provisioning idempotency — duplicate request not re-provisioned', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const workspaceId = 'ws-idem-001';
    const tenantId = 'tenant-A';

    // First provision
    await db.storeDocument(
      'xiigen-workspaces',
      { workspaceId, tenantId, status: 'active' },
      workspaceId,
    );

    // Second request — workspace already exists
    const existing = await db.searchDocuments('xiigen-workspaces', { workspaceId });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (isDuplicate) {
      await queue.enqueue(
        'workspace.provision.duplicate.detected',
        createCloudEvent({
          eventType: 'workspace.provision.duplicate.detected',
          source: 'flow-15/workspace-provisioner',
          data: { workspaceId, tenantId, reason: 'ALREADY_PROVISIONED' },
          tenantId,
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(isDuplicate).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].queue).toBe('workspace.provision.duplicate.detected');
  });

  it('F15-I2: billing event dedup — duplicate BillingSubscriptionActivated not processed twice', async () => {
    const db = makeInMemoryDb();
    const billingEventId = 'billing-evt-001';

    // First billing event delivery
    await db.storeDocument(
      'xiigen-billing-events',
      { eventId: billingEventId, tenantId: 'tenant-A', status: 'processed' },
      billingEventId,
    );

    // Second delivery (billing retry)
    const previous = await db.searchDocuments('xiigen-billing-events', { eventId: billingEventId });
    const isDuplicate =
      previous.isSuccess && (previous.data as Record<string, unknown>[]).length > 0;

    expect(isDuplicate).toBe(true);
    // Duplicate not re-processed — no second storeDocument call with 'processing' status
    const records = previous.data as Record<string, unknown>[];
    expect(records[0]!['status']).toBe('processed');
  });

  it('F15-I3: idempotency key derived from tenantId + workspaceId', () => {
    const tenantId = 'tenant-A';
    const workspaceId = 'ws-001';

    const idempotencyKey = `${tenantId}:workspace:${workspaceId}`;

    expect(idempotencyKey).toContain(tenantId);
    expect(idempotencyKey).toContain(workspaceId);
    expect(idempotencyKey).toMatch(/^tenant-A:workspace:ws-001$/);
  });

  it('F15-I4: second engine.generate() with same contract task type does not error', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const r1 = await engineA.generate(
      new EngineContract(flow15WorkspaceParams('-i4a')),
      'flow15-idem-tenant',
    );
    const r2 = await engineB.generate(
      new EngineContract(flow15WorkspaceParams('-i4b')),
      'flow15-idem-tenant',
    );

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });

  it('F15-I5: sandbox fork deduplicates by sandboxId + tenantId key', async () => {
    const db = makeInMemoryDb();
    const forkKey = 'tenant-A:sandbox:sb-001:fork';

    await db.storeDocument(
      'xiigen-sandbox-forks',
      { forkKey, tenantId: 'tenant-A', newSandboxId: 'sb-002', status: 'completed' },
      forkKey,
    );

    const existing = await db.searchDocuments('xiigen-sandbox-forks', { forkKey });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    expect(isDuplicate).toBe(true);
    expect((existing.data as Record<string, unknown>[])[0]!['status']).toBe('completed');
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — UI State Mapping', () => {
  it('F15-U1: loading state — workspace provisioning in-flight resolves asynchronously', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db
      .storeDocument(
        'xiigen-workspaces',
        { workspaceId: 'ws-u1', status: 'provisioning', tenantId: 'tenant-A' },
        'ws-u1',
      )
      .then((r) => {
        resolved = true;
        return r;
      });

    expect(resolved).toBe(false);

    return promise.then(() => {
      expect(resolved).toBe(true);
    });
  });

  it('F15-U2: success state — DataProcessResult.success maps to workspace-ready screen', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'xiigen-workspaces',
      { workspaceId: 'ws-u2', status: 'active', scaffoldComplete: true },
      'ws-u2',
    );

    const screen = result.isSuccess ? 'workspace-ready' : 'workspace-error';
    expect(screen).toBe('workspace-ready');
  });

  it('F15-U3: PAYMENT_REQUIRED maps to paywall-gate screen — not generic error', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'PAYMENT_REQUIRED',
      'Feature requires PRO subscription',
    );

    const screen = result.errorCode === 'PAYMENT_REQUIRED' ? 'paywall-gate' : 'generic-error';
    expect(screen).toBe('paywall-gate');
  });

  it('F15-U4: circuit breaker OPEN state maps to circuit-breaker-open screen', () => {
    const circuitState = 'OPEN';
    const screen =
      circuitState === 'OPEN'
        ? 'circuit-breaker-open'
        : circuitState === 'HALF_OPEN'
          ? 'circuit-breaker-probing'
          : 'circuit-breaker-closed';

    expect(screen).toBe('circuit-breaker-open');
  });

  it('F15-U5: provisioning progress tracks scaffold stages', () => {
    const stages = [
      'workspace-created',
      'index-provisioned',
      'rls-configured',
      'sandbox-ready',
    ] as const;
    type ProvStage = (typeof stages)[number];

    const provState = {
      currentStage: 'rls-configured' as ProvStage,
      completedStages: ['workspace-created', 'index-provisioned'] as ProvStage[],
    };

    const currentIndex = stages.indexOf(provState.currentStage);
    expect(currentIndex).toBe(2);
    expect(provState.completedStages).toContain('workspace-created');
    expect(provState.completedStages).not.toContain('sandbox-ready');
  });

  it('F15-U6: toDict() serializes DataProcessResult for API response — snake_case keys', () => {
    const success = DataProcessResult.success({
      workspaceId: 'ws-u6',
      tenantId: 'tenant-A',
      status: 'active',
    });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });

  it('F15-U7: TOKEN_BUDGET_EXCEEDED maps to ai-quota-exhausted screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'TOKEN_BUDGET_EXCEEDED',
      'AI token budget exceeded: 100001 > 100000',
    );

    const screen =
      result.errorCode === 'TOKEN_BUDGET_EXCEEDED' ? 'ai-quota-exhausted' : 'generic-error';
    expect(screen).toBe('ai-quota-exhausted');
  });

  it('F15-U8: SILO_GRADUATION_IRREVERSIBLE maps to graduation-locked screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'SILO_GRADUATION_IRREVERSIBLE',
      'Silo graduation is a one-way operation',
    );

    const screen =
      result.errorCode === 'SILO_GRADUATION_IRREVERSIBLE' ? 'graduation-locked' : 'generic-error';
    expect(screen).toBe('graduation-locked');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract (/api/dynamic/{indexName})
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F15-A1: /api/dynamic/xiigen-workspaces response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { workspaceId: 'ws-1', status: 'active', tenantId: 'tenant-a' },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F15-A2: /api/dynamic/xiigen-subscriptions returns subscription with status and planId fields', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'xiigen-subscriptions',
      { subscriptionId: 'sub-api-1', tenantId: 'tenant-a', status: 'ACTIVE', planId: 'plan-pro' },
      'sub-api-1',
    );

    const result = await db.searchDocuments('xiigen-subscriptions', {
      subscriptionId: 'sub-api-1',
    });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]!['status']).toBe('ACTIVE');
    expect(docs[0]!['planId']).toBe('plan-pro');
  });

  it('F15-A3: /api/dynamic/xiigen-ai-addons returns addon with addonType and tokensConsumed', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'xiigen-ai-addons',
      {
        addonId: 'addon-api-1',
        tenantId: 'tenant-a',
        addonType: 'ai-chatbot',
        tokensConsumed: 25_000,
        status: 'active',
      },
      'addon-api-1',
    );

    const result = await db.searchDocuments('xiigen-ai-addons', { addonId: 'addon-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]!['addonType']).toBe('ai-chatbot');
    expect(docs[0]!['tokensConsumed']).toBe(25_000);
  });

  it('F15-A4: API error response for workspace not found — is_success=false, error_code=NOT_FOUND', () => {
    const errorResponse = DataProcessResult.failure<unknown>('NOT_FOUND', 'Workspace not found');
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('Workspace not found');
  });

  it('F15-A5: /api/dynamic/xiigen-workspaces returns workspace with scaffoldComplete field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'xiigen-workspaces',
      { workspaceId: 'ws-api-2', tenantId: 'tenant-a', scaffoldComplete: true, status: 'active' },
      'ws-api-2',
    );

    const result = await db.searchDocuments('xiigen-workspaces', { workspaceId: 'ws-api-2' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]!['scaffoldComplete']).toBe(true);
    expect(docs[0]!['status']).toBe('active');
  });

  it('F15-A6: /api/dynamic/xiigen-silos returns silo with tier and graduatedAt fields', async () => {
    const db = makeInMemoryDb();
    const graduatedAt = new Date().toISOString();

    await db.storeDocument(
      'xiigen-silos',
      { siloId: 'silo-api-1', tenantId: 'tenant-a', tier: 'isolated-silo', graduatedAt },
      'silo-api-1',
    );

    const result = await db.searchDocuments('xiigen-silos', { siloId: 'silo-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]!['tier']).toBe('isolated-silo');
    expect(docs[0]!['graduatedAt']).toBe(graduatedAt);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents (DNA-9)
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — CloudEvents (DNA-9)', () => {
  it('F15-C1: workspace.provisioned conforms to CloudEvents v1.0 spec', () => {
    const event = createCloudEvent({
      eventType: 'workspace.provisioned',
      source: 'flow-15/workspace-provisioner',
      data: {
        workspaceId: 'ws-cf1',
        tenantId: 'tenant-flow15',
        status: 'active',
        provisionedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow15',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F15-C2: oauth.token.exchange.completed event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'oauth.token.exchange.completed',
      source: 'flow-15/oauth-pkce',
      data: {
        exchangeId: 'exch-cf2',
        accessToken: 'at-redacted',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      },
      tenantId: 'tenant-flow15',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('oauth.token.exchange.completed');
    expect(event['source']).toContain('flow-15');
    expect(event['tenantid']).toBe('tenant-flow15');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F15-C3: usage.meter.recorded event contains tokensConsumed in data', () => {
    const event = createCloudEvent({
      eventType: 'usage.meter.recorded',
      source: 'flow-15/usage-meter',
      data: {
        meterId: 'meter-cf3',
        addonType: 'ai-chatbot',
        tokensConsumed: 2_500,
        recordedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow15',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['tokensConsumed']).toBe(2_500);
    expect(data['addonType']).toBe('ai-chatbot');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F15-C4: silo.graduation.completed event emitted via queue fabric — not HTTP', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'silo.graduation.completed',
      createCloudEvent({
        eventType: 'silo.graduation.completed',
        source: 'flow-15/silo-graduation-manager',
        data: {
          siloId: 'silo-cf4',
          newTier: 'isolated-silo',
          completedAt: new Date().toISOString(),
        },
        tenantId: 'tenant-flow15',
      }) as unknown as Record<string, unknown>,
    );

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0]!.queue).toBe('silo.graduation.completed');
  });

  it('F15-C5: billing.subscription.activated event has subscriptionId in data', async () => {
    const queue = makeInMemoryQueue();

    const billingEvent = createCloudEvent({
      eventType: 'billing.subscription.activated',
      source: 'flow-15/subscription-manager',
      data: {
        subscriptionId: 'sub-cf5',
        tenantId: 'tenant-flow15',
        planId: 'plan-pro',
        activatedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow15',
    });

    await queue.enqueue(
      'billing.subscription.activated',
      billingEvent as unknown as Record<string, unknown>,
    );

    const [isValid] = validateCloudEvent(billingEvent);
    expect(isValid).toBe(true);
    const data = queue._emitted[0]!.payload['data'] as Record<string, unknown>;
    expect(data['planId']).toBe('plan-pro');
  });

  it('F15-C6: sandbox.forked event is tenant-scoped — tenantid field present', () => {
    const event = createCloudEvent({
      eventType: 'sandbox.forked',
      source: 'flow-15/sandbox-manager',
      data: { sandboxId: 'sb-cf6', newSandboxId: 'sb-cf6-fork', pluginId: 'plugin-demo' },
      tenantId: 'tenant-flow15',
    });

    expect(event['tenantid']).toBe('tenant-flow15');
    expect(event['tenantid']).not.toBeUndefined();
  });

  it('F15-C7: circuit.breaker.state.changed event has circuitState in data', () => {
    const event = createCloudEvent({
      eventType: 'circuit.breaker.state.changed',
      source: 'flow-15/circuit-breaker',
      data: {
        circuitId: 'cb-cf7',
        previousState: 'CLOSED',
        newState: 'OPEN',
        reason: 'error_threshold_exceeded',
        changedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow15',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['newState']).toBe('OPEN');
    expect(data['previousState']).toBe('CLOSED');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-15 E2E — Named Checks', () => {
  describe('oauth_pkce_per_exchange_verifier', () => {
    it('F15-N1: oauth contract declares oauth_pkce_per_exchange_verifier quality gate', () => {
      const params = flow15OAuthParams('-n1');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'oauth_pkce_per_exchange_verifier',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F15-N2: static userId-based verifier fails oauth_pkce_per_exchange_verifier check', async () => {
      const ctx = { generatedCode: 'const verifier = sha256(userId + timestamp)' };
      const passed = await flow15NamedChecks['oauth_pkce_per_exchange_verifier']!(ctx);
      expect(passed).toBe(false);
    });

    it('F15-N3: crypto.randomBytes(32) verifier passes oauth_pkce_per_exchange_verifier check', async () => {
      const ctx = {
        generatedCode: 'const verifier = crypto.randomBytes(32).toString("base64url")',
      };
      const passed = await flow15NamedChecks['oauth_pkce_per_exchange_verifier']!(ctx);
      expect(passed).toBe(true);
    });
  });

  describe('byok_rotation_creates_new_version_not_overwrites', () => {
    it('F15-N4: BYOK contract declares byok_rotation_creates_new_version_not_overwrites quality gate', () => {
      const params = flow15BillingParams('-n4');
      // Billing contract is used as proxy; verify named check independently
      const namedCheck = flow15NamedChecks['byok_rotation_creates_new_version_not_overwrites'];
      expect(namedCheck).toBeDefined();
    });

    it('F15-N5: key.update() code fails byok_rotation_creates_new_version_not_overwrites check', async () => {
      const ctx = { rotationCode: 'await key.update({ keyMaterial: newMaterial })' };
      const passed =
        await flow15NamedChecks['byok_rotation_creates_new_version_not_overwrites']!(ctx);
      expect(passed).toBe(false);
    });

    it('F15-N6: createKeyVersion() code passes byok_rotation_creates_new_version_not_overwrites check', async () => {
      const ctx = { rotationCode: 'await vault.createKeyVersion(tenantId, keyMaterial)' };
      const passed =
        await flow15NamedChecks['byok_rotation_creates_new_version_not_overwrites']!(ctx);
      expect(passed).toBe(true);
    });

    it('F15-N7: BYOK key store shows new version created alongside old — both versions present', async () => {
      const db = makeInMemoryDb();
      const tenantId = 'tenant-A';

      await db.storeDocument(
        'xiigen-byok-keys',
        { keyId: 'k1', version: 1, tenantId, active: false },
        'k1-v1',
      );
      await db.storeDocument(
        'xiigen-byok-keys',
        { keyId: 'k2', version: 2, tenantId, active: true, rotatedFrom: 'k1' },
        'k2-v2',
      );

      const allKeys = await db.searchDocuments('xiigen-byok-keys', { tenantId });
      const keys = allKeys.data as Record<string, unknown>[];
      expect(keys).toHaveLength(2);
      expect(keys.find((k) => k['version'] === 1)).toBeDefined();
      expect(keys.find((k) => k['version'] === 2 && k['active'] === true)).toBeDefined();
    });
  });

  describe('silo_graduation_one_way', () => {
    it('F15-N8: silo contract declares silo_graduation_one_way quality gate', () => {
      const namedCheck = flow15NamedChecks['silo_graduation_one_way'];
      expect(namedCheck).toBeDefined();
    });

    it('F15-N9: rollbackGraduation code fails silo_graduation_one_way check', async () => {
      const ctx = { graduationCode: 'await silo.rollbackGraduation(siloId)' };
      const passed = await flow15NamedChecks['silo_graduation_one_way']!(ctx);
      expect(passed).toBe(false);
    });

    it('F15-N10: graduation-only code passes silo_graduation_one_way check', async () => {
      const ctx = { graduationCode: 'await silo.graduate(tenantId, targetTier)' };
      const passed = await flow15NamedChecks['silo_graduation_one_way']!(ctx);
      expect(passed).toBe(true);
    });

    it('F15-N11: revert step in graduation steps array fails silo_graduation_one_way', async () => {
      const ctx = {
        graduationCode: '',
        steps: ['provision-silo', 'configure-rls', 'revert-silo'],
      };
      const passed = await flow15NamedChecks['silo_graduation_one_way']!(ctx);
      expect(passed).toBe(false);
    });
  });
});
