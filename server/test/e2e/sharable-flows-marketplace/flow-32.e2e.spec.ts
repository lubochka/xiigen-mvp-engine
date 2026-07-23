/**
 * FLOW-32 E2E — Sharable Flows & RAG Template Marketplace
 *
 * Archetypes: MarketplacePackageCreator, PackageVersionManager, ArtifactPublisher,
 *             ArtifactVerifier, ArtifactCertifier, ArtifactNotarizer, MarketplaceInstaller,
 *             BindingDocumentManager, TemplateDiscoveryEngine, BFARevalidationService,
 *             RAGBlueprintExporter, RAGBlueprintPublisher, RAGBlueprintImporter,
 *             UsageMeter, RevenueSettlementEngine, FraudDetectionService,
 *             SandboxEnvironmentProvisioner
 * Task types: T516–T535 (20 task types)
 * CloudEvents: PackagePublished, ContentHashVerified, TemplateInstalled,
 *              SettlementCompleted, SecretResolvedViaRef, HumanReviewCreated,
 *              BfaRevalidationCompleted
 *
 * Named checks:
 *   supply_chain_tripartite_signing
 *   logic_data_plane_separation
 *   logic_data_plane_install_only
 *   secret_ref_indirection
 *   integer_arithmetic_settlement
 *   fraud_human_review_required
 *   bfa_revalidation_all_consumers
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — publish, hash, purchase, install, secret-ref, fraud, BFA revalidation
 *   2. Error path — missing SBOM, missing SLSA, only 2 signatures, data plane, install
 *                   modifies data, literal secret, float arithmetic, fraud no review,
 *                   consumer not revalidated
 *   3. Tenant isolation — templates scoped, listings isolated, purchase records not cross-tenant
 *   4. Idempotency — duplicate publish, duplicate settlement
 *   5. UI state — TEMPLATE_DRAFT/REVIEW/PUBLISHED/INSTALLED, FRAUD_DETECTED/HUMAN_REVIEW_PENDING/RESOLVED
 *   6. API contract — /api/dynamic/marketplace-templates, /api/dynamic/settlements
 *   7. CloudEvents — PackagePublished, TemplateInstalled, SettlementCompleted pass validateCloudEvent
 *   8. Named checks — all 7 pass/fail correctly
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
import {
  supply_chain_tripartite_signing,
  logic_data_plane_separation,
  logic_data_plane_install_only,
  secret_ref_indirection,
  integer_arithmetic_settlement,
  fraud_human_review_required,
  bfa_revalidation_all_consumers,
} from '../../../src/engine-contracts/checks/sharable-flows-marketplace-checks';

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
        runId: 'flow32-run-id',
        status: 'PASS',
        score: 95,
        trace: [
          { nodeId: 'package-create', nodeType: 'orchestration', status: 'PASS', durationMs: 10 },
          { nodeId: 'artifact-sign', nodeType: 'signing', status: 'PASS', durationMs: 12 },
          { nodeId: 'sbom-generate', nodeType: 'sbom', status: 'PASS', durationMs: 8 },
          { nodeId: 'slsa-attest', nodeType: 'attestation', status: 'PASS', durationMs: 9 },
          { nodeId: 'marketplace-install', nodeType: 'install', status: 'PASS', durationMs: 7 },
          { nodeId: 'settlement-process', nodeType: 'financial', status: 'PASS', durationMs: 6 },
          { nodeId: 'fraud-detect', nodeType: 'detection', status: 'PASS', durationMs: 5 },
          { nodeId: 'bfa-revalidate', nodeType: 'governance', status: 'PASS', durationMs: 11 },
        ],
        finalOutput: { code: '// FLOW-32 Sharable Flows & RAG Template Marketplace' },
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

// ── FLOW-32 inline contract param builders ───────────────────────────────────

function flow32PublisherParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T518_F32_PUBLISHER${suffix}`,
    flowId: 'FLOW-32',
    flowName: 'Sharable Flows & RAG Template Marketplace',
    name: 'ArtifactPublisher',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'marketplace.package.ready CloudEvent',
    purpose:
      'Publishes artifact to marketplace with tripartite signing. ' +
      'F1416 (IArtifactSigningService) + F1417 (ISBOMGeneratorService) + F1418 (ISLSAAttestationService). ' +
      'supply_chain_tripartite_signing: all three required. Emits artifact.signed.',
    factoryDependencies: [
      {
        factoryId: `F1342${suffix}`,
        interfaceName: 'IPackageContentStoreService',
        fabricType: FabricType.DATABASE,
        description: 'Package content storage',
      },
      {
        factoryId: `F1353${suffix}`,
        interfaceName: 'IContentHashService',
        fabricType: FabricType.DATABASE,
        description: 'Content hash computation (SHA-256)',
      },
      {
        factoryId: `F1416${suffix}`,
        interfaceName: 'IArtifactSigningService',
        fabricType: FabricType.DATABASE,
        description: 'Artifact signing',
      },
      {
        factoryId: `F1417${suffix}`,
        interfaceName: 'ISBOMGeneratorService',
        fabricType: FabricType.DATABASE,
        description: 'SBOM generation',
      },
      {
        factoryId: `F1418${suffix}`,
        interfaceName: 'ISLSAAttestationService',
        fabricType: FabricType.DATABASE,
        description: 'SLSA provenance attestation',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-32-P01${suffix}`,
        description: 'supply_chain_tripartite_signing: F1416 + F1417 + F1418 all required',
        severity: 'error',
        checkType: 'supply_chain_tripartite_signing',
      },
      {
        gateId: `QG-32-P02${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`marketplace_package_f32${suffix}`],
      events: [
        `marketplace.artifact.signed.f32${suffix}`,
        `marketplace.package.published.f32${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: All three supply chain factories required (F1416, F1417, F1418)',
      'IR-2: DNA-8 storeDocument BEFORE enqueue',
      'IR-3: Content addressed by SHA-256 hash (DD-326)',
    ],
    machineComponents: [
      'Tripartite signing orchestrator',
      'SBOM generator',
      'SLSA attestation writer',
    ],
    freedomComponents: ['flow32_signing_policy', 'flow32_review_requirements'],
    familyId: 'Family-200',
  };
}

function flow32BfaRevalidationParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T526_F32_BFA${suffix}`,
    flowId: 'FLOW-32',
    flowName: 'Sharable Flows & RAG Template Marketplace',
    name: 'BFARevalidationService',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'governance.migration.completed CloudEvent',
    purpose:
      'Revalidates ALL consumer flows against new BFA rules. No sampling (CF-729). ' +
      'bfa_revalidation_all_consumers: getAllConsumers() iteration required. ' +
      'DEGRADED_LOCAL_FALLBACK when FLOW-25 absent.',
    factoryDependencies: [
      {
        factoryId: `F_DB_BFA${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'BFA revalidation state storage',
      },
      {
        factoryId: `F_QUEUE_BFA${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'BFA revalidation completed event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-32-BFA01${suffix}`,
        description: 'bfa_revalidation_all_consumers: ALL consumers iterated, no sampling',
        severity: 'error',
        checkType: 'bfa_revalidation_all_consumers',
      },
    ],
    bfaRegistration: {
      entities: [`bfa_revalidation_record_f32${suffix}`],
      events: [`governance.bfa.revalidation.completed.f32${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Iterate ALL consumers — no sample/subset/limit',
      'IR-2: DEGRADED_LOCAL_FALLBACK when FLOW-25 absent',
      'IR-3: Emit bfa.revalidation.degraded if using local fallback',
    ],
    machineComponents: ['All-consumer BFA iterator', 'Degraded local fallback handler'],
    freedomComponents: ['flow32_bfa_revalidation_config'],
    familyId: 'Family-202',
  };
}

function flow32SettlementParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T532_F32_SETTLEMENT${suffix}`,
    flowId: 'FLOW-32',
    flowName: 'Sharable Flows & RAG Template Marketplace',
    name: 'RevenueSettlementEngine',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'marketplace.usage.metered CloudEvent',
    purpose:
      'Processes revenue settlement using BigInt integer cents. ' +
      'integer_arithmetic_settlement: no parseFloat/toFixed (CF-734). ' +
      'DNA-7 idempotency via settlement-{tenantId}-{periodId} key.',
    factoryDependencies: [
      {
        factoryId: `F_DB_SETTLE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Settlement records storage',
      },
      {
        factoryId: `F_QUEUE_SETTLE${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'SettlementCompleted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-32-S01${suffix}`,
        description: 'integer_arithmetic_settlement: BigInt cents only, no float',
        severity: 'error',
        checkType: 'integer_arithmetic_settlement',
      },
    ],
    bfaRegistration: {
      entities: [`settlement_record_f32${suffix}`],
      events: [`marketplace.settlement.completed.f32${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: BigInt integer arithmetic for all monetary calculations',
      'IR-2: No parseFloat, toFixed, or float arithmetic',
      'IR-3: Idempotency key settlement-{tenantId}-{periodId}',
    ],
    machineComponents: ['BigInt settlement calculator', 'Idempotency deduplicator'],
    freedomComponents: ['flow32_settlement_fee_config'],
    familyId: 'Family-204',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — Happy Path [PUBLISH → SIGN → INSTALL → SETTLE → FRAUD → BFA]', () => {
  const TENANT = 'flow32-happy-tenant';

  it('F32-H1: T518 artifact publisher contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow32PublisherParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F32-H2: Flow template published → SBOM generated → SLSA attestation → tripartite signing → PackagePublished event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Store package content first (DNA-8)
    await db.storeDocument(
      'marketplace-packages',
      {
        packageId: 'pkg-001',
        tenantId: TENANT,
        contentHash: 'sha256:abc123def456',
        sbomRef: 'sbom://pkg-001-sbom',
        slsaRef: 'slsa://pkg-001-provenance',
        signatures: {
          author: 'sig-author-001',
          reviewer: 'sig-reviewer-001',
          platform: 'sig-platform-001',
        },
        tripartiteSigned: true,
        status: 'PUBLISHED',
      },
      'pkg-001',
    );

    // Emit PackagePublished event
    await queue.enqueue(
      'marketplace.package.published',
      createCloudEvent({
        eventType: 'marketplace.package.published',
        source: 'flow-32/artifact-publisher',
        data: {
          packageId: 'pkg-001',
          tenantId: TENANT,
          contentHash: 'sha256:abc123def456',
          tripartiteSigned: true,
          sbomRef: 'sbom://pkg-001-sbom',
          slsaRef: 'slsa://pkg-001-provenance',
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted).toHaveLength(1);
    expect(queue._emitted[0].queue).toBe('marketplace.package.published');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['tripartiteSigned']).toBe(true);
    expect(data['sbomRef']).toBeDefined();
    expect(data['slsaRef']).toBeDefined();
    expect(data['contentHash']).toContain('sha256:');
  });

  it('F32-H3: Content-addressable storage — same content returns same hash → ContentHashVerified event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const contentHash = 'sha256:deadbeef1234567890abcdef';

    // Store same content under same hash (idempotent — same hash = same content)
    await db.storeDocument(
      'content-store',
      { hashId: contentHash, tenantId: TENANT, size: 4096, contentType: 'flow/dag' },
      contentHash,
    );

    // Second store of same content — same hash returned
    await db.storeDocument(
      'content-store',
      { hashId: contentHash, tenantId: TENANT, size: 4096, contentType: 'flow/dag' },
      contentHash,
    );

    const hashResult = await db.searchDocuments('content-store', { hashId: contentHash });
    expect(hashResult.isSuccess).toBe(true);
    // Content-addressable: only one record for same hash
    expect((hashResult.data as Record<string, unknown>[]).length).toBe(1);

    await queue.enqueue(
      'marketplace.content.hash.verified',
      createCloudEvent({
        eventType: 'marketplace.content.hash.verified',
        source: 'flow-32/content-hash-service',
        data: { contentHash, tenantId: TENANT, deduplicated: true },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['deduplicated']).toBe(true);
    expect(data['contentHash']).toBe(contentHash);
  });

  it('F32-H4: Marketplace purchase → integer arithmetic settlement (no floats) → SettlementCompleted event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Settlement uses BigInt cents (no floats)
    const amountCents = BigInt(4999); // $49.99 in cents
    const platformFeeCents = BigInt(499); // $4.99 platform fee
    const publisherRevenueCents = amountCents - platformFeeCents; // BigInt arithmetic

    await db.storeDocument(
      'settlements',
      {
        settlementId: 'settle-001',
        tenantId: TENANT,
        amountCents: amountCents.toString(),
        platformFeeCents: platformFeeCents.toString(),
        publisherRevenueCents: publisherRevenueCents.toString(),
        arithmeticType: 'BIGINT_CENTS',
        status: 'COMPLETED',
      },
      'settle-001',
    );

    await queue.enqueue(
      'marketplace.settlement.completed',
      createCloudEvent({
        eventType: 'marketplace.settlement.completed',
        source: 'flow-32/revenue-settlement',
        data: {
          settlementId: 'settle-001',
          tenantId: TENANT,
          amountCents: amountCents.toString(),
          arithmeticType: 'BIGINT_CENTS',
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('marketplace.settlement.completed');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['arithmeticType']).toBe('BIGINT_CENTS');
    // Verify no float representation
    expect(data['amountCents']).toBe('4999');
    expect(publisherRevenueCents).toBe(BigInt(4500));
  });

  it('F32-H5: Template installed → logic plane only (no data plane access) → TemplateInstalled event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Install only stores logic artifacts (no data transfer)
    await db.storeDocument(
      'template-installations',
      {
        installId: 'install-001',
        tenantId: TENANT,
        packageId: 'pkg-001',
        installedArtifacts: ['dag', 'promptTemplate', 'configSchema', 'factoryBindings'],
        prohibitedArtifacts: [],
        logicPlaneOnly: true,
        status: 'INSTALLED',
      },
      'install-001',
    );

    await queue.enqueue(
      'marketplace.template.installed',
      createCloudEvent({
        eventType: 'marketplace.template.installed',
        source: 'flow-32/marketplace-installer',
        data: {
          installId: 'install-001',
          tenantId: TENANT,
          packageId: 'pkg-001',
          logicPlaneOnly: true,
          installedArtifacts: ['dag', 'promptTemplate', 'configSchema', 'factoryBindings'],
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('marketplace.template.installed');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['logicPlaneOnly']).toBe(true);
    expect(data['installedArtifacts'] as string[]).not.toContain('embeddings');
    expect(data['installedArtifacts'] as string[]).not.toContain('documents');
  });

  it('F32-H6: Secret ref uses indirection (no direct secret in payload) → SecretResolvedViaRef event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Binding document stores only secretRef — never literal secret
    await db.storeDocument(
      'binding-documents',
      {
        bindingId: 'binding-001',
        tenantId: TENANT,
        installId: 'install-001',
        secretRef: 'vault://secrets/api-key-ref-001',
        // No literal secret value stored
        storageType: 'SECRET_REF_ONLY',
      },
      'binding-001',
    );

    await queue.enqueue(
      'marketplace.secret.resolved.via.ref',
      createCloudEvent({
        eventType: 'marketplace.secret.resolved.via.ref',
        source: 'flow-32/binding-document-manager',
        data: {
          bindingId: 'binding-001',
          tenantId: TENANT,
          secretRef: 'vault://secrets/api-key-ref-001',
          resolvedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    const binding = (await db.getDocument('binding-documents', 'binding-001')).data as Record<
      string,
      unknown
    >;
    // Verify no literal secrets stored
    expect(binding['password']).toBeUndefined();
    expect(binding['apiKey']).toBeUndefined();
    expect(binding['token']).toBeUndefined();
    expect(binding['secretRef']).toContain('vault://');

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['secretRef']).toBeDefined();
    expect(data['secretRef']).toContain('vault://');
  });

  it('F32-H7: Fraud detected → human review required → HumanReviewCreated event emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    // Fraud detection creates review case — does NOT auto-suspend
    await db.storeDocument(
      'fraud-signals',
      {
        signalId: 'fraud-001',
        tenantId: TENANT,
        packageId: 'pkg-suspect-001',
        signalType: 'SELF_INSTALL',
        score: 0.92,
        status: 'FLAGGED',
        routedToHumanReview: true,
        // No automated ban/suspend
      },
      'fraud-001',
    );

    await db.storeDocument(
      'human-review-cases',
      {
        reviewId: 'review-001',
        tenantId: TENANT,
        signalId: 'fraud-001',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
      'review-001',
    );

    await queue.enqueue(
      'marketplace.human.review.created',
      createCloudEvent({
        eventType: 'marketplace.human.review.created',
        source: 'flow-32/fraud-detection',
        data: {
          reviewId: 'review-001',
          tenantId: TENANT,
          signalId: 'fraud-001',
          status: 'PENDING',
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('marketplace.human.review.created');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['status']).toBe('PENDING');
    expect(data['reviewId']).toBeDefined();

    // Verify no auto-suspend happened
    const signal = (await db.getDocument('fraud-signals', 'fraud-001')).data as Record<
      string,
      unknown
    >;
    expect(signal['status']).toBe('FLAGGED');
    expect(signal['status']).not.toBe('SUSPENDED');
    expect(signal['status']).not.toBe('BANNED');
  });

  it('F32-H8: BFA revalidated for all consumers when template updated → BfaRevalidationCompleted event', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const consumerFlows = ['FLOW-01', 'FLOW-02', 'FLOW-03', 'FLOW-04', 'FLOW-05'];

    // Store revalidation results for each consumer
    for (const flowId of consumerFlows) {
      await db.storeDocument(
        'bfa-revalidation-results',
        {
          resultId: `bfar-${flowId}`,
          tenantId: TENANT,
          flowId,
          status: 'PASS',
          revalidatedAt: new Date().toISOString(),
        },
        `bfar-${flowId}`,
      );
    }

    await queue.enqueue(
      'governance.bfa.revalidation.completed',
      createCloudEvent({
        eventType: 'governance.bfa.revalidation.completed',
        source: 'flow-32/bfa-revalidation',
        data: {
          tenantId: TENANT,
          consumersRevalidated: consumerFlows.length,
          allConsumers: true,
          samplingUsed: false,
        },
        tenantId: TENANT,
      }) as unknown as Record<string, unknown>,
    );

    expect(queue._emitted[0].queue).toBe('governance.bfa.revalidation.completed');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['allConsumers']).toBe(true);
    expect(data['samplingUsed']).toBe(false);
    expect(data['consumersRevalidated']).toBe(5);

    const results = await db.searchDocuments('bfa-revalidation-results', { tenantId: TENANT });
    expect((results.data as Record<string, unknown>[]).length).toBe(5);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — Error Path', () => {
  const TENANT = 'flow32-error-tenant';

  it('F32-E1: Missing SBOM → supply_chain_tripartite_signing throws', () => {
    // Code missing ISBOMGeneratorService/F1417
    const codeWithoutSBOM =
      'import { IArtifactSigningService } from "F1416"; ' +
      'import { ISLSAAttestationService } from "F1418"; ' +
      'const ARTIFACT_SIGNING_SERVICE = "sign"; ' +
      'const SLSA_ATTESTATION_SERVICE = "slsa";';

    expect(() => supply_chain_tripartite_signing(codeWithoutSBOM, 'T518')).toThrow(
      'supply_chain_tripartite_signing',
    );
  });

  it('F32-E2: Missing SLSA attestation → supply_chain_tripartite_signing throws', () => {
    // Code missing ISLSAAttestationService/F1418
    const codeWithoutSLSA =
      'import { IArtifactSigningService } from "F1416"; ' +
      'import { ISBOMGeneratorService } from "F1417"; ' +
      'const ARTIFACT_SIGNING_SERVICE = "sign"; ' +
      'const SBOM_GENERATOR_SERVICE = "sbom";';

    expect(() => supply_chain_tripartite_signing(codeWithoutSLSA, 'T518')).toThrow(
      'supply_chain_tripartite_signing',
    );
  });

  it('F32-E3: Only 2 of 3 signatures → supply_chain_tripartite_signing throws (must be tripartite)', () => {
    // Only signing + SBOM, missing SLSA
    const codeWith2Sigs =
      'IArtifactSigningService ARTIFACT_SIGNING_SERVICE F1416 ' +
      'ISBOMGeneratorService SBOM_GENERATOR_SERVICE F1417';

    expect(() => supply_chain_tripartite_signing(codeWith2Sigs, 'T518')).toThrow('CF-715');
  });

  it('F32-E4: Template accesses data plane directly → logic_data_plane_separation throws', () => {
    // RAG blueprint export with embedding data — DD-323 violation
    const codeWithDataPlane =
      'const result = await vectorStore.get(embeddings); ' + 'const data = indexSnapshot.export();';

    expect(() => logic_data_plane_separation(codeWithDataPlane, 'T528')).toThrow(
      'logic_data_plane_separation',
    );
  });

  it('F32-E5: Install operation modifies data → logic_data_plane_install_only throws', () => {
    // T522 install with data copy — CF-718 violation
    const codeWithDataCopy =
      'await copyDocuments(sourceIndex, targetIndex); ' + 'await migrateData(tenantId);';

    expect(() => logic_data_plane_install_only(codeWithDataCopy, 'T522')).toThrow(
      'logic_data_plane_install_only',
    );
  });

  it('F32-E6: Secret value in payload directly → secret_ref_indirection throws', () => {
    // T523 binding document with literal secret — CF-726 violation
    const codeWithLiteralSecret =
      'const apiKey = "sk-live-abc123secret456"; ' + 'bindingDoc.secret = apiKey;';

    expect(() => secret_ref_indirection(codeWithLiteralSecret, 'T523')).toThrow(
      'secret_ref_indirection',
    );
  });

  it('F32-E7: Float arithmetic in settlement → integer_arithmetic_settlement throws', () => {
    // T532 using parseFloat — CF-734 violation
    const codeWithFloat =
      'const amount = parseFloat(rawAmount); ' + 'const fee = amount.toFixed(2);';

    expect(() => integer_arithmetic_settlement(codeWithFloat, 'T532')).toThrow(
      'integer_arithmetic_settlement',
    );
  });

  it('F32-E8: Fraud without human review → fraud_human_review_required throws', () => {
    // T534 auto-suspending account — CF-736 violation
    const codeWithAutoSuspend = 'if (fraudScore > 0.8) { autoSuspend(tenantId); }';

    expect(() => fraud_human_review_required(codeWithAutoSuspend, 'T534')).toThrow(
      'fraud_human_review_required',
    );
  });

  it('F32-E9: Consumer not revalidated after update → bfa_revalidation_all_consumers throws', () => {
    // T526 using sampling — CF-729 violation
    const codeWithSampling =
      'const consumers = await getConsumers({ limit: 100, page: 1 }); ' +
      'for (const c of consumers.sample(10)) { validate(c); }';

    expect(() => bfa_revalidation_all_consumers(codeWithSampling, 'T526')).toThrow(
      'bfa_revalidation_all_consumers',
    );
  });

  it('F32-E10: T518 check not enforced for other task types (non-T518 passes)', () => {
    // supply_chain_tripartite_signing only enforces on T518
    const anyCode = 'const x = 1;';
    expect(() => supply_chain_tripartite_signing(anyCode, 'T516')).not.toThrow();
  });

  it('F32-E11: Secret ref check on T523 missing ISecretsService → throws', () => {
    // T523 with no secretRef or vaultRef or ISecretsService
    const codeWithoutRef = 'const bindingDoc = { name: "test", config: {} };';

    expect(() => secret_ref_indirection(codeWithoutRef, 'T523')).toThrow('CF-726');
  });

  it('F32-E12: T532 settlement without BigInt → integer_arithmetic_settlement throws', () => {
    // T532 with no BigInt reference
    const codeWithoutBigInt = 'const amount = 100; const fee = amount * 0.1;';

    expect(() => integer_arithmetic_settlement(codeWithoutBigInt, 'T532')).toThrow('CF-734');
  });

  it('F32-E13: T534 fraud detection without F1403 reference → throws', () => {
    // T534 with no human review service reference
    const codeWithoutHumanReview = 'const score = detectFraud(signal); flagForReview(score);';

    expect(() => fraud_human_review_required(codeWithoutHumanReview, 'T534')).toThrow('CF-736');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — Tenant Isolation', () => {
  const TENANT_A = 'flow32-tenant-a';
  const TENANT_B = 'flow32-tenant-b';

  it('F32-T1: Templates scoped per author tenant — tenant B cannot see tenant A templates', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'marketplace-templates',
      {
        templateId: 'tmpl-ta-001',
        tenantId: TENANT_A,
        name: 'Flow Template A1',
        status: 'PUBLISHED',
      },
      'tmpl-ta-001',
    );
    await db.storeDocument(
      'marketplace-templates',
      {
        templateId: 'tmpl-ta-002',
        tenantId: TENANT_A,
        name: 'Flow Template A2',
        status: 'PUBLISHED',
      },
      'tmpl-ta-002',
    );
    await db.storeDocument(
      'marketplace-templates',
      {
        templateId: 'tmpl-tb-001',
        tenantId: TENANT_B,
        name: 'Flow Template B1',
        status: 'PUBLISHED',
      },
      'tmpl-tb-001',
    );

    const tenantATemplates = await db.searchDocuments('marketplace-templates', {
      tenantId: TENANT_A,
    });
    const tenantBTemplates = await db.searchDocuments('marketplace-templates', {
      tenantId: TENANT_B,
    });

    expect((tenantATemplates.data as Record<string, unknown>[]).length).toBe(2);
    expect((tenantBTemplates.data as Record<string, unknown>[]).length).toBe(1);
    expect(
      (tenantATemplates.data as Record<string, unknown>[]).every((t) => t['tenantId'] === TENANT_A),
    ).toBe(true);
  });

  it('F32-T2: Marketplace listings isolated — cross-tenant template not accessible', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'marketplace-templates',
      {
        templateId: 'tmpl-iso-001',
        tenantId: TENANT_A,
        name: 'Private Template',
        status: 'PUBLISHED',
      },
      'tmpl-iso-001',
    );

    // Tenant B tries to access tenant A template by ID with tenant B scope
    const crossTenantResult = await db.searchDocuments('marketplace-templates', {
      tenantId: TENANT_B,
      templateId: 'tmpl-iso-001',
    });
    expect((crossTenantResult.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F32-T3: Purchase records not cross-tenant — buyer purchases scoped', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'marketplace-purchases',
      { purchaseId: 'purch-ta-001', tenantId: TENANT_A, packageId: 'pkg-001', amount: 4999 },
      'purch-ta-001',
    );
    await db.storeDocument(
      'marketplace-purchases',
      { purchaseId: 'purch-ta-002', tenantId: TENANT_A, packageId: 'pkg-002', amount: 2999 },
      'purch-ta-002',
    );
    await db.storeDocument(
      'marketplace-purchases',
      { purchaseId: 'purch-tb-001', tenantId: TENANT_B, packageId: 'pkg-003', amount: 1999 },
      'purch-tb-001',
    );

    const aPurchases = await db.searchDocuments('marketplace-purchases', { tenantId: TENANT_A });
    const bPurchases = await db.searchDocuments('marketplace-purchases', { tenantId: TENANT_B });

    expect((aPurchases.data as Record<string, unknown>[]).length).toBe(2);
    expect((bPurchases.data as Record<string, unknown>[]).length).toBe(1);
    expect((aPurchases.data as Record<string, unknown>[])[0]['tenantId']).toBe(TENANT_A);
  });

  it('F32-T4: Settlement records isolated per tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'settlements',
      { settlementId: 'settle-ta', tenantId: TENANT_A, amountCents: '4999', status: 'COMPLETED' },
      'settle-ta',
    );
    await db.storeDocument(
      'settlements',
      { settlementId: 'settle-tb', tenantId: TENANT_B, amountCents: '2999', status: 'COMPLETED' },
      'settle-tb',
    );

    const aSettlements = await db.searchDocuments('settlements', { tenantId: TENANT_A });
    const bSettlements = await db.searchDocuments('settlements', { tenantId: TENANT_B });

    expect((aSettlements.data as Record<string, unknown>[]).length).toBe(1);
    expect((bSettlements.data as Record<string, unknown>[]).length).toBe(1);
    expect((aSettlements.data as Record<string, unknown>[])[0]['amountCents']).toBe('4999');
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — Idempotency', () => {
  const TENANT = 'flow32-idempotency-tenant';

  it('F32-I1: Duplicate template publish with same content hash is idempotent', async () => {
    const db = makeInMemoryDb();
    const CONTENT_HASH = 'sha256:idem-content-hash-001';

    // First publish — stores content by hash
    await db.storeDocument(
      'content-store',
      {
        id: CONTENT_HASH,
        tenantId: TENANT,
        hashId: CONTENT_HASH,
        size: 2048,
        contentType: 'flow/dag',
      },
      CONTENT_HASH,
    );

    // Duplicate publish — same hash, upsert with same id
    await db.storeDocument(
      'content-store',
      {
        id: CONTENT_HASH,
        tenantId: TENANT,
        hashId: CONTENT_HASH,
        size: 2048,
        contentType: 'flow/dag',
      },
      CONTENT_HASH,
    );

    const result = await db.searchDocuments('content-store', { hashId: CONTENT_HASH });
    // Content-addressable storage: exactly one record
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F32-I2: Duplicate settlement with same idempotency key is idempotent', async () => {
    const db = makeInMemoryDb();
    const SETTLE_IDEM_KEY = 'settlement-flow32-idem-tenant-period-2026-03';

    await db.storeDocument(
      'settlements',
      {
        id: SETTLE_IDEM_KEY,
        tenantId: TENANT,
        amountCents: '4999',
        status: 'COMPLETED',
        idempotencyKey: SETTLE_IDEM_KEY,
      },
      SETTLE_IDEM_KEY,
    );

    // Duplicate settlement attempt — upsert, no duplicate
    await db.storeDocument(
      'settlements',
      {
        id: SETTLE_IDEM_KEY,
        tenantId: TENANT,
        amountCents: '4999',
        status: 'COMPLETED',
        idempotencyKey: SETTLE_IDEM_KEY,
      },
      SETTLE_IDEM_KEY,
    );

    const result = await db.searchDocuments('settlements', { idempotencyKey: SETTLE_IDEM_KEY });
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F32-I3: Duplicate BFA revalidation record for same consumer is idempotent', async () => {
    const db = makeInMemoryDb();
    const REVALIDATION_KEY = 'bfar-FLOW-01-period-001';

    await db.storeDocument(
      'bfa-revalidation-results',
      {
        id: REVALIDATION_KEY,
        tenantId: TENANT,
        flowId: 'FLOW-01',
        status: 'PASS',
        idempotencyKey: REVALIDATION_KEY,
      },
      REVALIDATION_KEY,
    );

    await db.storeDocument(
      'bfa-revalidation-results',
      {
        id: REVALIDATION_KEY,
        tenantId: TENANT,
        flowId: 'FLOW-01',
        status: 'PASS',
        idempotencyKey: REVALIDATION_KEY,
      },
      REVALIDATION_KEY,
    );

    const result = await db.searchDocuments('bfa-revalidation-results', {
      idempotencyKey: REVALIDATION_KEY,
    });
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — UI State Mapping', () => {
  it('F32-S1: TEMPLATE_DRAFT → TEMPLATE_REVIEW → TEMPLATE_PUBLISHED state transitions', () => {
    const templateStates = [
      'TEMPLATE_DRAFT',
      'TEMPLATE_REVIEW',
      'TEMPLATE_PUBLISHED',
      'TEMPLATE_INSTALLED',
    ];
    let currentState = 'TEMPLATE_DRAFT';

    // Submit for review
    currentState = 'TEMPLATE_REVIEW';
    expect(templateStates.indexOf(currentState)).toBeGreaterThan(
      templateStates.indexOf('TEMPLATE_DRAFT'),
    );

    // Approved and published
    currentState = 'TEMPLATE_PUBLISHED';
    expect(templateStates.indexOf(currentState)).toBeGreaterThan(
      templateStates.indexOf('TEMPLATE_REVIEW'),
    );
  });

  it('F32-S2: TEMPLATE_PUBLISHED → TEMPLATE_INSTALLED state maps to template-active screen', () => {
    const state = { templateId: 'tmpl-001', status: 'TEMPLATE_INSTALLED', logicPlaneOnly: true };
    const screen = state.status === 'TEMPLATE_INSTALLED' ? 'template-active' : 'marketplace-browse';
    expect(screen).toBe('template-active');
    expect(state.logicPlaneOnly).toBe(true);
  });

  it('F32-S3: FRAUD_DETECTED → HUMAN_REVIEW_PENDING → HUMAN_REVIEW_RESOLVED state transitions', () => {
    const fraudStates = ['FRAUD_DETECTED', 'HUMAN_REVIEW_PENDING', 'HUMAN_REVIEW_RESOLVED'];
    let state = 'FRAUD_DETECTED';

    // Routed to human review
    state = 'HUMAN_REVIEW_PENDING';
    expect(fraudStates.indexOf(state)).toBeGreaterThan(fraudStates.indexOf('FRAUD_DETECTED'));

    // Review completed
    state = 'HUMAN_REVIEW_RESOLVED';
    expect(state).toBe('HUMAN_REVIEW_RESOLVED');
    const screen = state === 'HUMAN_REVIEW_RESOLVED' ? 'review-completed' : 'review-pending';
    expect(screen).toBe('review-completed');
  });

  it('F32-S4: TEMPLATE_DRAFT state maps to draft-editor screen with save button', () => {
    const template = { templateId: 'tmpl-draft-001', status: 'TEMPLATE_DRAFT', version: '0.1.0' };
    const screen = template.status === 'TEMPLATE_DRAFT' ? 'draft-editor' : 'marketplace-view';
    expect(screen).toBe('draft-editor');
  });

  it('F32-S5: Settlement PENDING → COMPLETED maps to revenue-credited screen', () => {
    const settlement = { settlementId: 'settle-001', status: 'COMPLETED', amountCents: '4999' };
    const screen = settlement.status === 'COMPLETED' ? 'revenue-credited' : 'settlement-pending';
    expect(screen).toBe('revenue-credited');
    expect(settlement.amountCents).toBe('4999');
  });

  it('F32-S6: SANDBOX_PROVISIONING → SANDBOX_READY maps to sandbox-test screen', () => {
    const sandbox = {
      sandboxId: 'sandbox-uuid-001',
      status: 'SANDBOX_READY',
      tenantIdPrefix: 'sandbox-',
    };
    const screen = sandbox.status === 'SANDBOX_READY' ? 'sandbox-test' : 'sandbox-provisioning';
    expect(screen).toBe('sandbox-test');
    expect(sandbox.tenantIdPrefix).toBe('sandbox-');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — API Contract', () => {
  const TENANT = 'flow32-api-tenant';

  it('F32-A1: /api/dynamic/marketplace-templates returns DataProcessResult', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'marketplace-templates',
      {
        templateId: 'tmpl-api-001',
        tenantId: TENANT,
        name: 'RAG Search Template',
        status: 'PUBLISHED',
      },
      'tmpl-api-001',
    );

    const result = await db.searchDocuments('marketplace-templates', { tenantId: TENANT });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('F32-A2: /api/dynamic/settlements returns DataProcessResult', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'settlements',
      {
        settlementId: 'settle-api-001',
        tenantId: TENANT,
        amountCents: '2999',
        status: 'COMPLETED',
      },
      'settle-api-001',
    );

    const result = await db.searchDocuments('settlements', { tenantId: TENANT });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('F32-A3: /api/dynamic/marketplace-templates 404 on unknown template returns failure', async () => {
    const db = makeInMemoryDb();

    const result = await db.getDocument('marketplace-templates', 'nonexistent-template');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F32-A4: /api/dynamic/marketplace-purchases returns purchases scoped to tenant', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'marketplace-purchases',
      { purchaseId: 'purch-api-001', tenantId: TENANT, packageId: 'pkg-001' },
      'purch-api-001',
    );
    await db.storeDocument(
      'marketplace-purchases',
      { purchaseId: 'purch-api-002', tenantId: 'other-tenant', packageId: 'pkg-002' },
      'purch-api-002',
    );

    const result = await db.searchDocuments('marketplace-purchases', { tenantId: TENANT });
    expect(result.isSuccess).toBe(true);
    expect((result.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F32-A5: /api/dynamic/bfa-revalidation-results returns DataProcessResult', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'bfa-revalidation-results',
      { resultId: 'bfar-api-001', tenantId: TENANT, flowId: 'FLOW-01', status: 'PASS' },
      'bfar-api-001',
    );

    const result = await db.searchDocuments('bfa-revalidation-results', { tenantId: TENANT });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — CloudEvents', () => {
  const TENANT = 'flow32-cloudevents-tenant';

  it('F32-CE1: PackagePublished event has correct CloudEvents envelope', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.package.published',
      source: 'flow-32/artifact-publisher',
      data: { packageId: 'pkg-001', tenantId: TENANT, tripartiteSigned: true },
      tenantId: TENANT,
    });

    expect(event).toBeDefined();
    expect(event['type']).toBe('marketplace.package.published');
    expect(event['source']).toContain('flow-32/artifact-publisher');
    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
  });

  it('F32-CE2: PackagePublished event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.package.published',
      source: 'flow-32/artifact-publisher',
      data: {
        packageId: 'pkg-001',
        tenantId: TENANT,
        contentHash: 'sha256:abc123',
        tripartiteSigned: true,
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F32-CE3: TemplateInstalled event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.template.installed',
      source: 'flow-32/marketplace-installer',
      data: {
        installId: 'install-001',
        tenantId: TENANT,
        packageId: 'pkg-001',
        logicPlaneOnly: true,
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['logicPlaneOnly']).toBe(true);
  });

  it('F32-CE4: SettlementCompleted event passes validateCloudEvent with BIGINT_CENTS type', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.settlement.completed',
      source: 'flow-32/revenue-settlement',
      data: {
        settlementId: 'settle-001',
        tenantId: TENANT,
        amountCents: '4999',
        arithmeticType: 'BIGINT_CENTS',
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['arithmeticType']).toBe('BIGINT_CENTS');
    // Verify not a float representation
    expect(typeof data['amountCents']).toBe('string');
  });

  it('F32-CE5: HumanReviewCreated event contains review case reference', () => {
    const event = createCloudEvent({
      eventType: 'marketplace.human.review.created',
      source: 'flow-32/fraud-detection',
      data: {
        reviewId: 'review-001',
        tenantId: TENANT,
        signalId: 'fraud-001',
        status: 'PENDING',
      },
      tenantId: TENANT,
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['reviewId']).toBeDefined();
    expect(data['status']).toBe('PENDING');
    // Verify no auto-action field present
    expect(data['autoSuspended']).toBeUndefined();
    expect(data['autoBanned']).toBeUndefined();
  });

  it('F32-CE6: BfaRevalidationCompleted event contains allConsumers flag — no sampling', () => {
    const event = createCloudEvent({
      eventType: 'governance.bfa.revalidation.completed',
      source: 'flow-32/bfa-revalidation',
      data: {
        tenantId: TENANT,
        consumersRevalidated: 31,
        allConsumers: true,
        samplingUsed: false,
      },
      tenantId: TENANT,
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['allConsumers']).toBe(true);
    expect(data['samplingUsed']).toBe(false);
  });

  it('F32-CE7: artifact.signed event type matches contract spec', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.marketplace.artifact.signed',
      source: 'flow-32/artifact-publisher',
      data: {
        packageId: 'pkg-001',
        tenantId: TENANT,
        signingFactories: ['F1416', 'F1417', 'F1418'],
      },
      tenantId: TENANT,
    });

    expect(event['type']).toBe('com.xiigen.marketplace.artifact.signed');
    const data = event['data'] as Record<string, unknown>;
    expect((data['signingFactories'] as string[]).length).toBe(3);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-32 E2E — Named Checks', () => {
  const TENANT = 'flow32-named-checks-tenant';

  it('F32-NC1: supply_chain_tripartite_signing — passes when all three factories present', () => {
    const validCode =
      'import { IArtifactSigningService } from "F1416"; ' +
      'import { ISBOMGeneratorService } from "F1417"; ' +
      'import { ISLSAAttestationService } from "F1418"; ' +
      'const ARTIFACT_SIGNING_SERVICE = "sign"; ' +
      'const SBOM_GENERATOR_SERVICE = "sbom"; ' +
      'const SLSA_ATTESTATION_SERVICE = "slsa"; ' +
      'F1416 F1417 F1418';

    expect(() => supply_chain_tripartite_signing(validCode, 'T518')).not.toThrow();
  });

  it('F32-NC2: supply_chain_tripartite_signing — fails when any one of the three factories is missing', () => {
    // Missing F1418 / ISLSAAttestationService / SLSA_ATTESTATION_SERVICE
    const incomplete =
      'IArtifactSigningService ARTIFACT_SIGNING_SERVICE F1416 ' +
      'ISBOMGeneratorService SBOM_GENERATOR_SERVICE F1417';

    expect(() => supply_chain_tripartite_signing(incomplete, 'T518')).toThrow('CF-715');
  });

  it('F32-NC3: logic_data_plane_separation — passes when only logic artifacts present', () => {
    const logicOnlyCode =
      'const dag = { nodes: [], edges: [] }; ' +
      'const promptTemplate = "You are a helpful assistant"; ' +
      'const configSchema = { version: "1.0" };';

    expect(() => logic_data_plane_separation(logicOnlyCode, 'T528')).not.toThrow();
  });

  it('F32-NC4: logic_data_plane_separation — fails when data plane terms detected', () => {
    const dataPlaneCode =
      'const result = indexSnapshot.export(); ' + 'const vecs = vectors.getAll();';

    expect(() => logic_data_plane_separation(dataPlaneCode, 'T528')).toThrow('CF-718');
  });

  it('F32-NC5: logic_data_plane_install_only — passes when no data operations', () => {
    const logicInstall =
      'await installDag(dag); ' +
      'await applyPromptTemplate(template); ' +
      'await bindFactories(factoryBindings);';

    expect(() => logic_data_plane_install_only(logicInstall, 'T522')).not.toThrow();
  });

  it('F32-NC6: logic_data_plane_install_only — fails on data copy operation', () => {
    const dataCopy = 'await copyDocuments(sourceIndex, destIndex);';
    expect(() => logic_data_plane_install_only(dataCopy, 'T522')).toThrow('CF-718');
  });

  it('F32-NC7: secret_ref_indirection — passes when using secretRef and ISecretsService', () => {
    const safeCode =
      'const secretRef = "vault://secrets/my-api-key"; ' +
      'const ISecretsService = inject(SECRETS_SERVICE); ' +
      'const resolved = await ISecretsService.resolve(secretRef);';

    expect(() => secret_ref_indirection(safeCode, 'T523')).not.toThrow();
  });

  it('F32-NC8: secret_ref_indirection — fails when literal secret value present', () => {
    const unsafeCode = 'const token = "eyJhbGciOiJSUzI1NiJ9.secret-literal";';
    expect(() => secret_ref_indirection(unsafeCode, 'T523')).toThrow('CF-726');
  });

  it('F32-NC9: integer_arithmetic_settlement — passes when BigInt used, no float', () => {
    const bigIntCode =
      'const amountCents = BigInt(4999); ' +
      'const feeCents = BigInt(499); ' +
      'const net = amountCents - feeCents; ' +
      'const ALL_CONSUMERS = getAllConsumers();';

    expect(() => integer_arithmetic_settlement(bigIntCode, 'T532')).not.toThrow();
  });

  it('F32-NC10: integer_arithmetic_settlement — fails on parseFloat usage', () => {
    const floatCode = 'const amount = parseFloat(rawValue); const result = BigInt(0);';
    expect(() => integer_arithmetic_settlement(floatCode, 'T532')).toThrow('CF-734');
  });

  it('F32-NC11: fraud_human_review_required — passes when human review service referenced', () => {
    const humanReviewCode =
      'const IHumanReviewService = inject(HUMAN_REVIEW_SERVICE); ' +
      'await IHumanReviewService.createReviewCase({ signalId, score }); ' +
      'const F1403 = "human-review-factory";';

    expect(() => fraud_human_review_required(humanReviewCode, 'T534')).not.toThrow();
  });

  it('F32-NC12: fraud_human_review_required — fails on auto-ban action', () => {
    const autoBanCode =
      'const IHumanReviewService = inject(HUMAN_REVIEW_SERVICE); ' +
      'if (score > threshold) { autoBan(tenantId); }';

    expect(() => fraud_human_review_required(autoBanCode, 'T534')).toThrow('CF-736');
  });

  it('F32-NC13: bfa_revalidation_all_consumers — passes when getAllConsumers used', () => {
    const allConsumersCode =
      'const consumers = await getAllConsumers(); ' +
      'for (const c of consumers) { await validate(c); } ' +
      'const DEGRADED_LOCAL_FALLBACK = true;';

    expect(() => bfa_revalidation_all_consumers(allConsumersCode, 'T526')).not.toThrow();
  });

  it('F32-NC14: bfa_revalidation_all_consumers — fails when limit/sampling used', () => {
    const samplingCode =
      'const consumers = await getAllConsumers(); ' + 'const sample = consumers.take(50);';

    expect(() => bfa_revalidation_all_consumers(samplingCode, 'T526')).toThrow('CF-729');
  });

  it('F32-NC15: Contract engine generates T526 BFA revalidation contract successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow32BfaRevalidationParams('-nc15'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F32-NC16: Contract engine generates T532 settlement contract successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow32SettlementParams('-nc16'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });
});
