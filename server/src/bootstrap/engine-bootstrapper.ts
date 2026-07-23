/**
 * EngineBootstrapper — reads fixtures/ directory and ensures ES indices exist.
 * Run on startup after fabric phases.
 * Creates indices if missing; does NOT delete or overwrite existing data.
 *
 * Phase 9b: seeds flow registry from engine contract descriptors so
 * GenericNodeExecutor can look up task types at runtime. Idempotent.
 *
 * S1: Pre-FLOW-01 engine build — bootstraps 8 core engine indices.
 * WRITE-TIME-2 fix: FlowRegistryService.seedFromContracts() wired here.
 */
import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { FlowRegistryService } from '../engine/flow-registry.service';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  TenantRecord,
} from '../kernel/multi-tenant/tenant-context';
import { TenantRegistry } from '../kernel/multi-tenant/tenant-registry.service';
// Track 0 Turn 4: seed GLOBAL topology templates from contracts/topologies/
import {
  TenantTopologyStore,
  TenantTopology,
  TenantNode,
  TenantEdge,
} from '../engine/tenant-topology-store';
import { MASTER_TENANT_ID } from './bootstrap-seeder.service';
// v27 Finding OO — use canonical constant, not string literal
import { CONNECTION_TYPES } from '../rag-init/connection-types';
import { makeXiigenFreedomConfigDocs, XIIGEN_FREEDOM_KEYS } from '../freedom/config-schema';
import { FLOW13_CONTRACTS } from '../engine-contracts/data-warehouse-analytics-contracts';
import { FLOW14_CONTRACTS } from '../engine-contracts/etl-data-integration-contracts';
import { FLOW_17_CONTRACTS } from '../engine-contracts/freelancer-marketplace-ip-contracts';
import { FLOW_18_CONTRACTS } from '../engine-contracts/visual-flow-engine-visual-flow-contracts';
import { FLOW_20_CONTRACTS } from '../engine-contracts/ads-platform-ads-contracts';
import { FLOW_24_CONTRACTS } from '../engine-contracts/ai-safety-moderation-learning-contracts';
import { FLOW_32_CONTRACTS } from '../engine-contracts/sharable-flows-marketplace-contracts';
import { FLOW_06_CONTRACTS } from '../engine-contracts/user-groups-communities-user-groups-contracts';
import { FLOW_07_CONTRACTS } from '../engine-contracts/friend-request-social-feed-social-feed-contracts';
import { FLOW_08_CONTRACTS } from '../engine-contracts/marketplace-contracts';
import { FLOW03_CONTRACTS } from '../engine-contracts/event-management-contracts';
import { FLOW04_CONTRACTS } from '../engine-contracts/event-attendance-contracts';
import { FLOW09_CONTRACTS } from '../engine-contracts/transactional-event-participation-transactional-event-contracts';
import { FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES } from '../engine-contracts/flow-extension-engine-contracts';
import { HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES } from '../engine-contracts/human-approval-gate-contracts';
import { RAG_OPTIMIZATION_CONTRACT_FACTORIES } from '../engine-contracts/rag-optimization-contracts';
import { TENANT_LIFECYCLE_CONTRACT_FACTORIES } from '../engine-contracts/tenant-lifecycle-contracts';
import { DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES } from '../engine-contracts/design-system-governance-contracts';
import { FLOW28_BLOG_CMS_CONTRACT_FACTORIES } from '../engine-contracts/blog-cms-modules-contracts';
import { CLIENT_PUSH_BFA_RULES } from '../engine-contracts/client-push-contracts';
import { FEATURE_REGISTRY_BFA_RULES } from '../engine-contracts/feature-registry-bfa-rules';
import { RAG_QUALITY_BFA_RULES } from '../engine-contracts/rag-quality-contracts';
import { HISTORY_BOOTSTRAP_BFA_RULES } from '../engine-contracts/history-bootstrap-contracts';
import { STACK_COUPLING_BFA_RULES } from '../engine-contracts/stack-coupling-contracts';
import { OSS_CURRICULUM_BFA_RULES } from '../engine-contracts/oss-curriculum-contracts';
import { FLOW_01_BFA_RULES } from '../engine-contracts/user-registration-bfa-rules';
import { FLOW_02_BFA_RULES } from '../engine-contracts/profile-enrichment-bfa-rules';
import { FLOW_03_BFA_RULES } from '../engine-contracts/event-management-bfa-rules';
import { FLOW_04_BFA_RULES } from '../engine-contracts/event-attendance-bfa-rules';
import { FLOW_05_BFA_RULES } from '../engine-contracts/completion-gamification-bfa-rules';
import { FLOW_06_BFA_RULES } from '../engine-contracts/user-groups-communities-bfa-rules';
import { FLOW_07_BFA_RULES } from '../engine-contracts/friend-request-social-feed-bfa-rules';
import { FLOW_08_BFA_RULES } from '../engine-contracts/marketplace-bfa-rules';
import { FLOW_09_BFA_RULES } from '../engine-contracts/transactional-event-participation-bfa-rules';
import { REVIEWS_REPUTATION_BFA_RULES } from '../engine-contracts/reviews-reputation-bfa-rules';
import { SCHEMA_REGISTRY_DAG_BFA_RULES } from '../engine-contracts/schema-registry-dag-bfa-rules';
import { SCHEMA_REGISTRY_DAG_CONTRACT_DESCRIPTORS } from '../engine-contracts/schema-registry-dag-contracts';
import { SUBSCRIPTION_BILLING_BFA_RULES } from '../engine-contracts/subscription-billing-bfa-rules';
import { SUBSCRIPTION_BILLING_CONTRACT_DESCRIPTORS } from '../engine-contracts/subscription-billing-contracts';
import { ETL_DATA_INTEGRATION_BFA_RULES } from '../engine-contracts/etl-data-integration-bfa-rules';
import { SAAS_MULTI_TENANCY_BFA_RULES } from '../engine-contracts/saas-multi-tenancy-bfa-rules';
import { SAAS_MULTI_TENANCY_CONTRACT_DESCRIPTORS } from '../engine-contracts/saas-multi-tenancy-contracts';
import { MARKETPLACE_PAYMENTS_BFA_RULES } from '../engine-contracts/marketplace-payments-bfa-rules';
import { MARKETPLACE_PAYMENTS_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/marketplace-payments-contracts';
import { FREELANCER_MARKETPLACE_BFA_RULES } from '../engine-contracts/freelancer-marketplace-bfa-rules';
import { FREELANCER_MARKETPLACE_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/freelancer-marketplace-contracts';
import { VISUAL_FLOW_ENGINE_BFA_RULES } from '../engine-contracts/visual-flow-engine-bfa-rules';
import { VISUAL_FLOW_ENGINE_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/visual-flow-engine-contracts';
import { DURABLE_SAGAS_COMPLIANCE_BFA_RULES } from '../engine-contracts/durable-sagas-compliance-bfa-rules';
import { DURABLE_SAGAS_COMPLIANCE_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/durable-sagas-compliance-contracts';
import { ADS_PLATFORM_BFA_RULES } from '../engine-contracts/ads-platform-bfa-rules';
import { ADS_PLATFORM_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/ads-platform-contracts';
import { DYNAMIC_FORMS_WORKFLOWS_BFA_RULES } from '../engine-contracts/dynamic-forms-workflows-bfa-rules';
import { DYNAMIC_FORMS_WORKFLOWS_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/dynamic-forms-workflows-contracts';
import { CMS_PUBLISHING_BFA_RULES } from '../engine-contracts/cms-publishing-bfa-rules';
import { CMS_PUBLISHING_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/cms-publishing-contracts';
import { FORM_BUILDER_TEMPLATES_BFA_RULES } from '../engine-contracts/form-builder-templates-bfa-rules';
import { AI_SAFETY_MODERATION_BFA_RULES } from '../engine-contracts/ai-safety-moderation-bfa-rules';
import { FLOW_46_BFA_RULES } from '../engine-contracts/platform-agent-bfa-rules';
import { FORM_BUILDER_TEMPLATES_NEW_CONTRACT_DESCRIPTORS } from '../engine-contracts/form-builder-templates-contracts';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
// FLOW-47 Turn 1: design corpus seeding + AF-4 rehydration
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { RagContextStation } from '../af-stations/af4-rag-context';
// FLOW-47 Turn 2: auto-publish GLOBAL templates under MASTER_TENANT_ID
import {
  MarketplacePackageService,
  MARKETPLACE_PACKAGES_INDEX,
} from '../engine/marketplace-package.service';

/** Minimal contract descriptor for registry seeding. */
interface ContractDescriptor {
  taskTypeId: string;
  name: string;
  flowId: string;
  version: string;
}

/**
 * All engine contract descriptors (T1-T542+).
 * Maintained here as the authoritative seed list for bootstrap.
 * GenericNodeExecutor requires these entries in xiigen-flow-registry
 * to resolve task types at runtime.
 */
const ENGINE_CONTRACTS: ContractDescriptor[] = [
  // FLOW-02: Profile Enrichment & Matching (T50-T52)
  { taskTypeId: 'T50', name: 'ProfileEnrichmentFanIn', flowId: 'FLOW-02', version: 'v1' },
  { taskTypeId: 'T51', name: 'MatchingConvergenceGate', flowId: 'FLOW-02', version: 'v1' },
  { taskTypeId: 'T52', name: 'OnboardingCompletionBroadcast', flowId: 'FLOW-02', version: 'v1' },
  // FLOW-11: Schema Registry & DAG (T189-T208)
  ...SCHEMA_REGISTRY_DAG_CONTRACT_DESCRIPTORS,
  // FLOW-12: Subscription & Recurring Billing (T209-T212)
  ...SUBSCRIPTION_BILLING_CONTRACT_DESCRIPTORS,
  // FLOW-10: Reviews + Reputation (T169-T172)
  { taskTypeId: 'T169', name: 'ReviewSubmissionGateway', flowId: 'FLOW-10', version: 'v1' },
  { taskTypeId: 'T170', name: 'ReviewModerationEngine', flowId: 'FLOW-10', version: 'v1' },
  { taskTypeId: 'T171', name: 'ReputationScoreAggregator', flowId: 'FLOW-10', version: 'v1' },
  { taskTypeId: 'T172', name: 'ReviewResponseOrchestrator', flowId: 'FLOW-10', version: 'v1' },
  // FLOW-25: BFA Cross-Flow Governance (T375-T388)
  { taskTypeId: 'T375', name: 'BfaConflictDetector', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T376', name: 'BfaConflictNormalizer', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T377', name: 'BfaImpactScorer', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T378', name: 'BfaBlastRadiusTracer', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T379', name: 'BfaArbitrationOrchestrator', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T380', name: 'BfaConflictReporter', flowId: 'FLOW-25', version: 'v1' },
  { taskTypeId: 'T381', name: 'BfaGovernanceAuditTrail', flowId: 'FLOW-25', version: 'v1' },
  // FLOW-26: Self-Developing Meta-Flow Engine (T389-T412)
  ...FLOW_EXTENSION_ENGINE_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-27: Human Interaction Gate (T413-T422)
  ...HUMAN_APPROVAL_GATE_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-28: Blog/CMS Modules Platform (T423-T440)
  ...FLOW28_BLOG_CMS_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-29: Adaptive RAG Deep Research (T441-T467)
  ...RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-30: PromptOps — Self-Learning Prompts (T468-T488)
  ...TENANT_LIFECYCLE_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-31: Design Intelligence Engine (T489-T515)
  ...DESIGN_SYSTEM_GOVERNANCE_CONTRACT_FACTORIES.map((f) => f()).map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: 'v1',
  })),
  // FLOW-33: Code Generation Loop Bootstrap (T536-T542)
  { taskTypeId: 'T536', name: 'BootstrapOrchestrator', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T537', name: 'GraphRAGTwoLayerSeeder', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T538', name: 'ImplementationStatusRegistry', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T539', name: 'ImplementFamilyMetaLoop', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T540', name: 'FiveArbiterConsensusGate', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T541', name: 'RegressionImpactAnalyzer', flowId: 'FLOW-33', version: 'v1' },
  { taskTypeId: 'T542', name: 'ContextPackAssembler', flowId: 'FLOW-33', version: 'v1' },
  // FLOW-13: Data Warehouse & Analytics (T169-T188) — registered from contracts array
  ...FLOW13_CONTRACTS.map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: c.version,
  })),
  // FLOW-14: ETL & Data Integration (T213-T224) - registered from contracts array
  ...FLOW14_CONTRACTS.map((c) => ({
    taskTypeId: c.taskTypeId,
    name: c.name,
    flowId: c.flowId,
    version: c.version,
  })),
  // FLOW-17: Freelancer Marketplace Platform (T227-T246)
  ...Object.values(FLOW_17_CONTRACTS).map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-18: Visual Flow Creation & Code Injection Engine (T247-T268)
  ...FLOW_18_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-20: Sponsored Content + Graph API + Ads Platform (T287-T306)
  ...FLOW_20_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-24: Learning Calendar (Personal AI Tutor) (T367-T374)
  ...FLOW_24_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-32: Sharable Flows & RAG Template Marketplace (T516-T535)
  ...FLOW_32_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-06: User Groups & Communities (T71-T72, T89-T90)
  ...FLOW_06_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-07: Friend Request & Social Feed (T73-T82)
  ...FLOW_07_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-08: Marketplace Listings & Catalog (T83-T88)
  ...FLOW_08_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-03: Event Management Platform (T59-T62)
  ...FLOW03_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-04: Event Attendance & Management (T63-T66)
  ...FLOW04_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-09: Transactional Event Participation (T99-T118)
  ...FLOW09_CONTRACTS.map((c) => ({
    taskTypeId: String(c['taskTypeId']),
    name: String(c['name']),
    flowId: String(c['flowId']),
    version: 'v1',
  })),
  // FLOW-15: SaaS Multi-Tenancy (T605-T608)
  ...SAAS_MULTI_TENANCY_CONTRACT_DESCRIPTORS,
  // FLOW-16: Marketplace Payments (T609-T612)
  ...MARKETPLACE_PAYMENTS_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-17: Freelancer Marketplace new services (T613-T616)
  ...FREELANCER_MARKETPLACE_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-18: Visual Flow Engine new services (T617-T620)
  ...VISUAL_FLOW_ENGINE_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-19: Durable Sagas & Compliance (T621-T624)
  ...DURABLE_SAGAS_COMPLIANCE_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-20: Ads Platform (T625-T628)
  ...ADS_PLATFORM_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-21: Dynamic Forms & Workflows (T629-T632)
  ...DYNAMIC_FORMS_WORKFLOWS_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-22: CMS Publishing (T633-T636)
  ...CMS_PUBLISHING_NEW_CONTRACT_DESCRIPTORS,
  // FLOW-23: Form Builder Templates (T637-T640)
  ...FORM_BUILDER_TEMPLATES_NEW_CONTRACT_DESCRIPTORS,
];

/**
 * GAP-34-06: Fixture routing table — maps fixture subdirectory names to target ES indices.
 * EngineBootstrapper's seedIndices() seeds documents from these named fixture subdirectories.
 * Add new entries when a FLOW introduces a new fixture subdirectory type.
 *
 * FLOW-47 Turn 8 (T664): extended routing for three pre-existing fixture directories
 * that were never reaching ES:
 *   - 'rag-patterns'     (single-doc JSON per file, 90 pre-existing files)
 *   - 'design-reasoning' (JSON array per file — array-expanded at write time, 44 files)
 *   - 'arbiters'         (ES bulk NDJSON format — handled via FIXTURE_ROUTING_NDJSON)
 */
const FIXTURE_ROUTING: Record<string, string> = {
  'platform-registry': 'xiigen-platform-registry', // FLOW-34: platform registry documents
  'bfa-rules': 'xiigen-decision-graph', // FLOW-34: CF-[+0..11] BFA rules
  // FLOW-47 Turn 8 (T664)
  'rag-patterns': 'xiigen-rag-patterns', // 90 ARCH_PATTERN single-doc JSON files
  'design-reasoning': 'xiigen-planning-decisions', // 44 DESIGN_REASONING array-valued files (CF-838)
};

/**
 * FLOW-47 Turn 8 (T664) — NDJSON routing for ES bulk-format files.
 * Each file alternates `{"index":...}` action headers with document lines.
 * CF-837: action header lines MUST be skipped (writing them as docs corrupts the index).
 */
const FIXTURE_ROUTING_NDJSON: Record<string, string> = {
  arbiters: 'xiigen-arbiter-configs', // 45 *.bulk.ndjson files with arbiter configurations
};

/**
 * FLOW-47 Turn 8 (T664) — mappings for the new xiigen-arbiter-configs index.
 * Index created before NDJSON seeding. Keyword fields enable exact-match filters.
 */
const ARBITER_CONFIG_MAPPINGS = {
  properties: {
    arbiterId: { type: 'keyword' },
    flowId: { type: 'keyword' },
    cfId: { type: 'keyword' },
    arbiterType: { type: 'keyword' },
    connectionType: { type: 'keyword' },
    knowledgeScope: { type: 'keyword' },
  },
};

/**
 * FLOW-47 Turn 7 (T663) — empty canonical topology slugs that need backfill.
 * Each slug has per-task-type fixture files in fixtures/flow-definitions/.
 * CanonicalTopologyBackfillService aggregates these into canonical node lists
 * and writes via storeGlobalTemplate() to xiigen-flow-templates.
 */
/**
 * FLOW-47 Turn 7 + Defect-6/7 — raw-slug canonical topology backfill.
 *
 * Each slug maps to its canonical FLOW-NN identifier. That identifier is
 * stamped into `metadata.canonicalFlowId` on the backfilled template so
 * MarketplacePackageService.assembleDesignBundleRefs() can resolve pattern /
 * arbiter / decision-graph records seeded under the canonical FLOW-NN key.
 * Without this mapping, raw-slug packages end up with empty designBundleRefs
 * since the engine seeds knowledge artifacts keyed by FLOW-NN, not slug.
 */
const CANONICAL_SLUG_TO_FLOW_ID: Record<string, string> = {
  'bundle-activation': 'FLOW-00',
  'completion-gamification': 'FLOW-05',
  'event-attendance': 'FLOW-04',
  'event-management': 'FLOW-03',
  'friend-request-social-feed': 'FLOW-07',
  marketplace: 'FLOW-08',
  'profile-enrichment': 'FLOW-02',
  'reviews-reputation': 'FLOW-10',
  'schema-registry-dag': 'FLOW-11',
  'subscription-billing': 'FLOW-12',
  'transactional-event-participation': 'FLOW-09',
  'user-groups-communities': 'FLOW-06',
  'user-registration': 'FLOW-01',
};
const EMPTY_TOPOLOGY_SLUGS = Object.keys(CANONICAL_SLUG_TO_FLOW_ID);

@Injectable()
export class EngineBootstrapper {
  private readonly logger = new Logger(EngineBootstrapper.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    @Optional() private readonly flowRegistry?: FlowRegistryService,
    @Optional() private readonly tenantRegistry?: TenantRegistry,
    // Track 0 Turn 4: @Optional() so existing bootstrapper tests (many 4-arg constructions) still compile.
    @Optional() private readonly tenantTopologyStore?: TenantTopologyStore,
    // FLOW-47 Turn 1 (T657): seeds 46 design-corpus files → xiigen-rag-patterns + xiigen-planning-decisions
    @Optional() private readonly fromDocuments?: BootstrapFromDocumentsService,
    // FLOW-47 Turn 1b (T657b): rehydrate AF-4's in-memory this.patterns from freshly-seeded ES records
    @Optional() private readonly af4Station?: RagContextStation,
    // FLOW-47 Turn 2 (T658): auto-publish GLOBAL templates under MASTER_TENANT_ID CLS context
    @Optional() private readonly marketplace?: MarketplacePackageService,
  ) {}

  async bootstrap(): Promise<void> {
    await this.seedIndices();
    await this.seedFlowRegistry();
    await this.seedFreedomConfig(); // Phase 9c (SESSION-G3A)
    await this.seedFlowMobilityVaultConfig(); // FLOW-47 live fork protocol harness
    await this.seedShadowRunPlaceholders(); // Phase 9d (SESSION-G5)
    await this.seedGenesisPromptPlaceholders(); // Phase 9e (FLOW-02 genesis prompts)
    await this.seedBfaRules(); // FLOW-36/38/40: BFA rules
    await this.seedGlobalTopologies(); // Track 0 Turn 4: GLOBAL templates from contracts/topologies/
    // FLOW-47 Turn 1 (T657): seed 46 design-corpus files to xiigen-rag-patterns + xiigen-planning-decisions
    await this.seedAllDesignCorpora();
    // FLOW-47 Turn 7 (T663): fill in 10 empty canonical topology slugs from per-task-type fixtures
    await this.seedCanonicalTopologyBackfill();
    // FLOW-47 Turn 2 (T658): auto-publish all GLOBAL templates as marketplace packages (MASTER_TENANT CLS)
    await this.autoPublishGlobalTemplates();
  }

  /** Phase 9a: ensure ES indices exist from fixtures/indices/ */
  private async seedIndices(): Promise<void> {
    // FLOW-47 Defect-2 fix: wrap all storeDocument/ensureIndex calls below in
    // MASTER_TENANT CLS context. Without this, arbiter NDJSON records land in
    // the raw xiigen-arbiter-configs index while assembleDesignBundleRefs()
    // queries the tenant-prefixed index → arbiterConfigIds empty for every
    // package (matches seedAllDesignCorpora + autoPublishGlobalTemplates
    // pattern).
    const masterTenant = this.makeMasterTenantContext();
    return this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
      await this.doSeedIndices();
    });
  }

  private async doSeedIndices(): Promise<void> {
    // FLOW-47 fix: do NOT short-circuit when fixtures/indices/ is missing.
    // The FIXTURE_ROUTING + FIXTURE_ROUTING_NDJSON loops below seed repo-root
    // fixture dirs (rag-patterns, design-reasoning, arbiters) which are
    // independent of the indices dir. Returning early here skipped them.
    const indicesDir = path.join(process.cwd(), 'fixtures', 'indices');
    const indicesDirExists = fs.existsSync(indicesDir);
    if (!indicesDirExists) {
      this.logger.warn(
        'No fixtures/indices/ directory found — skipping index-mapping creation (FIXTURE_ROUTING seeding still runs)',
      );
    }
    const files = indicesDirExists
      ? fs.readdirSync(indicesDir).filter((f) => f.endsWith('.json'))
      : [];
    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(indicesDir, file), 'utf-8')) as Record<
          string,
          unknown
        >;
        const indexName = content['index'] as string | undefined;
        if (!indexName) continue;
        // Attempt to create index (idempotent — fails silently if exists)
        const ensureIndex = (this.db as unknown as Record<string, unknown>)['ensureIndex'];
        if (typeof ensureIndex === 'function') {
          await (ensureIndex as (index: string, mappings: unknown) => Promise<void>)
            .call(this.db, indexName, content['mappings'])
            .catch(() => {
              // Index already exists or provider doesn't support ensureIndex — OK
            });
        }
        this.logger.debug(`Index ready: ${indexName}`);
      } catch (e) {
        this.logger.warn(`Failed to process fixture ${file}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`EngineBootstrapper: ${files.length} index fixtures processed`);

    // GAP-34-06: Process FIXTURE_ROUTING directories (platform-registry, bfa-rules, etc.)
    // Each file in the directory is stored as a document in the mapped target index.
    // FLOW-47 Turn 8 (T664): the three new routes (rag-patterns, design-reasoning, arbiters)
    // live in the repo-root fixtures/ directory. Try server/fixtures/ first, then fall back
    // to ../fixtures/ (repo root from server/), so both legacy dirs and the new routes resolve.
    for (const [fixtureDir, targetIndex] of Object.entries(FIXTURE_ROUTING)) {
      const routedDir = this.resolveFixtureDir(fixtureDir);
      if (!routedDir) continue;
      const routedFiles = fs.readdirSync(routedDir).filter((f: string) => f.endsWith('.json'));
      let written = 0;
      for (const file of routedFiles) {
        try {
          const parsed = JSON.parse(fs.readFileSync(path.join(routedDir, file), 'utf-8')) as
            | Record<string, unknown>
            | Array<Record<string, unknown>>;

          // FLOW-47 Turn 8 CF-838 — JSON arrays are array-expanded: each element
          // is written as a separate document keyed by its patternId (or fallback).
          // ALSO CF-838: wrapper-object files with a `records` array (e.g. FLOW-09
          // design-decisions with shape `{ flowId, records: [...] }`) get each
          // `records[i]` written individually using its `id` or `patternId`.
          const expandToElements = Array.isArray(parsed)
            ? parsed
            : Array.isArray((parsed as Record<string, unknown>)['records'])
              ? ((parsed as Record<string, unknown>)['records'] as Array<Record<string, unknown>>)
              : null;

          if (expandToElements) {
            for (let i = 0; i < expandToElements.length; i++) {
              const element = expandToElements[i];
              const docId =
                (element['patternId'] as string | undefined) ??
                (element['id'] as string | undefined) ??
                (element['docId'] as string | undefined) ??
                `${file.replace('.json', '')}-${i}`;
              await this.db.storeDocument(targetIndex, element, docId).catch(() => {
                /* idempotent */
              });
              written++;
            }
          } else {
            const p = parsed as Record<string, unknown>;
            const docId = (p['docId'] as string | undefined) ?? file.replace('.json', '');
            await this.db.storeDocument(targetIndex, p, docId).catch(() => {
              /* idempotent */
            });
            written++;
          }
          this.logger.debug(`Routed fixture ${fixtureDir}/${file} → ${targetIndex}`);
        } catch (e) {
          this.logger.warn(
            `Failed to process routed fixture ${fixtureDir}/${file}: ${(e as Error).message}`,
          );
        }
      }
      if (routedFiles.length > 0) {
        this.logger.log(
          `EngineBootstrapper: ${routedFiles.length} ${fixtureDir} fixtures → ${targetIndex} (${written} docs)`,
        );
      }
    }

    // FLOW-47 Turn 8 (T664) — NDJSON routing for ES bulk-format files.
    // First ensure the target index exists with ARBITER_CONFIG_MAPPINGS, then
    // line-by-line: skip `{"index":...}` action headers (CF-837), write documents
    // keyed by `arbiterId` (or `docId` fallback).
    for (const [fixtureDir, targetIndex] of Object.entries(FIXTURE_ROUTING_NDJSON)) {
      const routedDir = this.resolveFixtureDir(fixtureDir);
      if (!routedDir) continue;

      // Ensure index exists before bulk seeding
      const ensureIndex = (this.db as unknown as Record<string, unknown>)['ensureIndex'];
      if (typeof ensureIndex === 'function') {
        await (ensureIndex as (index: string, mappings: unknown) => Promise<void>)
          .call(this.db, targetIndex, ARBITER_CONFIG_MAPPINGS)
          .catch(() => {
            /* already exists */
          });
      }

      const ndjsonFiles = fs
        .readdirSync(routedDir)
        .filter((f: string) => f.endsWith('.bulk.ndjson') || f.endsWith('.ndjson'));
      let written = 0;
      for (const file of ndjsonFiles) {
        try {
          const content = fs.readFileSync(path.join(routedDir, file), 'utf-8');
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
          for (const line of lines) {
            const doc = JSON.parse(line) as Record<string, unknown>;
            // CF-837: skip `{"index":...}` action header lines. Action headers
            // have a single top-level 'index' key (value is an object with
            // _index/_id). Skip by structure, not by string match.
            const keys = Object.keys(doc);
            if (keys.length === 1 && keys[0] === 'index') continue;
            const docId =
              (doc['arbiterId'] as string | undefined) ??
              (doc['docId'] as string | undefined) ??
              `${file.replace(/\.(bulk\.)?ndjson$/, '')}-${written}`;
            await this.db.storeDocument(targetIndex, doc, docId).catch(() => {
              /* idempotent */
            });
            written++;
          }
        } catch (e) {
          this.logger.warn(
            `Failed to process NDJSON fixture ${fixtureDir}/${file}: ${(e as Error).message}`,
          );
        }
      }
      if (written > 0) {
        this.logger.log(
          `EngineBootstrapper: ${ndjsonFiles.length} ${fixtureDir} NDJSON fixtures → ${targetIndex} (${written} docs)`,
        );
      }
    }
  }

  /**
   * FLOW-47 Turn 8 (T664) — resolve a fixture subdirectory by trying server/fixtures/
   * first, then falling back to the repo-root fixtures/ (one level up from server/).
   * The pre-existing routes (platform-registry, bfa-rules) land in server/fixtures;
   * the new routes (rag-patterns, design-reasoning, arbiters) live at repo root.
   */
  private resolveFixtureDir(fixtureDir: string): string | null {
    const candidates = [
      path.join(process.cwd(), 'fixtures', fixtureDir),
      path.join(process.cwd(), '..', 'fixtures', fixtureDir),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return null;
  }

  /**
   * Phase 9c: seed XIIGen FREEDOM config keys with defaults.
   * Idempotent — only writes keys that don't already exist in 'freedom_configs'.
   * Keys land in the same index as all other FREEDOM config — readable via FreedomConfigManager.
   */
  async seedFreedomConfig(): Promise<void> {
    const docs = makeXiigenFreedomConfigDocs();
    let seeded = 0;
    for (const doc of docs) {
      const key = doc['config_key'] as string;
      const existing = await this.db.searchDocuments('freedom_configs', {
        config_key: key,
        task_type: 'xiigen-engine',
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) continue;
      const result = await this.db.storeDocument('freedom_configs', doc, `xiigen-engine::${key}`);
      if (result.isSuccess) seeded++;
      else this.logger.warn(`Failed to seed FREEDOM key ${key}: ${result.errorMessage}`);
    }
    if (seeded > 0) this.logger.log(`Phase 9c: seeded ${seeded} XIIGen FREEDOM config keys`);
  }

  /**
   * FLOW-47 live fork protocol harness.
   *
   * VaultSecretsManagerService reads `vault_token` from per-tenant FREEDOM config
   * before it can fetch GitHub and Docker credentials from Vault. The Docker
   * portability protocol supplies the platform Vault token as an environment
   * variable; this gated seed copies that connection token into the in-memory
   * FREEDOM fabric for the named test tenants without logging the value.
   */
  private async seedFlowMobilityVaultConfig(): Promise<void> {
    if (process.env['FLOW_MOBILITY_BOOTSTRAP_VAULT_CONFIG'] !== 'true') return;

    const vaultToken = process.env['VAULT_TOKEN'];
    if (!vaultToken) {
      this.logger.warn('FLOW-47 Vault FREEDOM seed requested but VAULT_TOKEN is missing');
      return;
    }

    const tenants = (
      process.env['FLOW_MOBILITY_TEST_TENANTS'] ??
      'acme-corp,northwind,tessera-collective'
    )
      .split(',')
      .map((tenant) => tenant.trim())
      .filter((tenant) => tenant.length > 0);
    const vaultAddress = process.env['VAULT_ADDR'] ?? 'http://vault:8200';
    let seeded = 0;

    for (const tenantId of tenants) {
      seeded += await this.storeTenantFreedomConfig(
        tenantId,
        XIIGEN_FREEDOM_KEYS.VAULT_TOKEN,
        vaultToken,
        'FLOW-47 live fork Vault token for tenant credential reads',
      );
      seeded += await this.storeTenantFreedomConfig(
        tenantId,
        XIIGEN_FREEDOM_KEYS.VAULT_ADDRESS,
        vaultAddress,
        'FLOW-47 live fork Vault address for tenant credential reads',
      );
    }

    if (seeded > 0) {
      this.logger.log(
        `FLOW-47: seeded Vault FREEDOM connection config for ${tenants.length} tenant(s)`,
      );
    }
  }

  private async storeTenantFreedomConfig(
    tenantId: string,
    configKey: string,
    value: string,
    description: string,
  ): Promise<number> {
    const docId = `${tenantId}::${configKey}`;
    const now = Date.now();
    const tenant = await this.ensureFlowMobilityTenant(tenantId);
    const tenantContext = new TenantContext(tenant);

    const result = await this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, tenantContext);
      const existing = await this.db.getDocument('freedom_configs', docId);
      const previous = existing.isSuccess && existing.data ? existing.data : {};
      const doc: Record<string, unknown> = {
        ...previous,
        config_key: configKey,
        task_type: 'FLOW-47',
        value,
        value_type: 'string',
        description,
        editable_by: 'platform-admin',
        tenant_id: tenantId,
        created_at: previous['created_at'] ?? now,
        updated_at: now,
      };
      return this.db.storeDocument('freedom_configs', doc, docId);
    });
    if (!result.isSuccess) {
      this.logger.warn(
        `FLOW-47: failed to seed FREEDOM config ${configKey} for tenant ${tenantId}: ` +
          `${result.errorMessage ?? result.errorCode ?? 'unknown error'}`,
      );
      return 0;
    }
    return 1;
  }

  private async ensureFlowMobilityTenant(tenantId: string): Promise<TenantRecord> {
    if (this.tenantRegistry) {
      const existing = await this.tenantRegistry.findById(tenantId);
      if (existing.isSuccess && existing.data) return existing.data;

      const created = await this.tenantRegistry.provisionTenant(tenantId, {
        name: 'enterprise',
        maxApiCallsPerMinute: 10000,
        maxTokensPerDay: 100_000_000,
        maxStorageMb: 100_000,
      });
      if (created.isSuccess && created.data) return created.data;
      this.logger.warn(
        `FLOW-47: failed to provision flow-mobility tenant ${tenantId}: ` +
          `${created.errorMessage ?? created.errorCode ?? 'unknown error'}`,
      );
    }

    const now = new Date().toISOString();
    return {
      id: tenantId,
      name: tenantId,
      status: 'active',
      plan: {
        name: 'enterprise',
        maxApiCallsPerMinute: 10000,
        maxTokensPerDay: 100_000_000,
        maxStorageMb: 100_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Phase 9d: seed T50/T51/T52 shadow run placeholders.
   * Idempotent — skips task types that already have a placeholder.
   * Placeholder status: PENDING_LOCAL_MODEL (ossScore=null).
   * Purpose: V11 SHADOW RUN HEALTH gate has records to check from day 1.
   * Independence timeline (P21) moves from UNKNOWN to PENDING_LOCAL_MODEL.
   */
  async seedShadowRunPlaceholders(): Promise<void> {
    const placeholders: Array<{
      taskTypeId: string;
      flowId: string;
      archetypeTier: number;
      curriculumTier: number;
      expensiveModel: string;
    }> = [
      // T50 ProfileEnrichmentFanIn — FAN_IN (ORCHESTRATION tier 4)
      {
        taskTypeId: 'T50',
        flowId: 'FLOW-02',
        archetypeTier: 4,
        curriculumTier: 4,
        expensiveModel: 'claude-sonnet',
      },
      // T51 MatchingConvergenceGate — CONVERGENCE (ORCHESTRATION tier 4)
      {
        taskTypeId: 'T51',
        flowId: 'FLOW-02',
        archetypeTier: 4,
        curriculumTier: 4,
        expensiveModel: 'claude-sonnet',
      },
      // T52 OnboardingCompletionBroadcast — BROADCAST (TRANSACTION tier 3)
      {
        taskTypeId: 'T52',
        flowId: 'FLOW-02',
        archetypeTier: 3,
        curriculumTier: 3,
        expensiveModel: 'claude-sonnet',
      },
    ];

    let seeded = 0;
    for (const p of placeholders) {
      const existing = await this.db.searchDocuments('xiigen-shadow-runs', {
        taskTypeId: p.taskTypeId,
        flowId: p.flowId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) continue;

      const shadowRunId = randomUUID();
      const now = new Date().toISOString();
      const doc: Record<string, unknown> = {
        shadowRunId: shadowRunId,
        taskTypeId: p.taskTypeId,
        flowId: p.flowId,
        tenantId: 'system',
        runId: 'bootstrap-placeholder',
        archetypeTier: p.archetypeTier,
        curriculumTier: p.curriculumTier,
        expensiveModelScore: null,
        ossScore: null,
        gapScore: null,
        expensiveModel: p.expensiveModel,
        ossModel: null,
        shadowStatus: 'PENDING_LOCAL_MODEL',
        createdAt: now,
        updatedAt: now,
      };
      const result = await this.db.storeDocument(
        'xiigen-shadow-runs',
        doc,
        `${p.taskTypeId}::${p.flowId}::bootstrap`,
      );
      if (result.isSuccess) seeded++;
      else
        this.logger.warn(
          `Failed to seed shadow run placeholder for ${p.taskTypeId}: ${result.errorMessage}`,
        );
    }
    if (seeded > 0) this.logger.log(`Phase 9d: seeded ${seeded} shadow run placeholders (T50–T52)`);
  }

  /**
   * Phase 9b: seed xiigen-flow-registry from ENGINE_CONTRACTS so
   * GenericNodeExecutor can resolve task types at runtime.
   * Skipped gracefully if FlowRegistryService is not available.
   */
  private async seedFlowRegistry(): Promise<void> {
    if (!this.flowRegistry) {
      this.logger.debug('FlowRegistryService not available — skipping contract seeding');
      return;
    }
    // Wrap in system tenant CLS context — bootstrapper runs outside HTTP request,
    // so no TenantContext is set. We inject a system tenant for seeding only.
    const systemTenant = new TenantContext({
      id: 'system',
      name: 'XIIGen System',
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const result = await this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, systemTenant);
      return await this.flowRegistry!.seedFromContracts(ENGINE_CONTRACTS);
    });
    if (result.isSuccess) {
      const { seeded, skipped } = result.data!;
      if (seeded > 0) {
        this.logger.log(`Phase 9b: seeded ${seeded} contracts, skipped ${skipped} existing`);
      }
    } else {
      this.logger.warn(`Phase 9b: seedFromContracts failed: ${result.errorMessage}`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Track 0 Turn 4: seed GLOBAL topology templates
  // ────────────────────────────────────────────────────────────────────────────
  /**
   * normalizeTopology — transforms contracts/topologies/**\/*.json into TenantTopology records.
   *
   * Iron rules (v26 Finding MM):
   *   IR-SEED-1: All GLOBAL templates get status: 'PUBLISHED' (platform reference, not drafts). CF-POLICY-01.
   *   IR-SEED-2: connectionType: 'FLOW_SCOPED' on every record. Required by rag-query.handler + warehouse analytics.
   *   IR-SEED-3: flowId disambiguated with filename slug (v21 Finding AA). originalFlowId preserved in metadata.
   *
   * Handles two JSON schemas (v10 Finding K):
   *   - Array-style: nodes = [{ id, name, archetype/type }]
   *   - Dict-style:  nodes = { "n1": { handler, nodeType }, ... }
   *
   * Filters terminal edges where to=null/undefined (v11 Finding L: ReactFlow would crash).
   * Returns null for files with no nodes (v10 Finding K trailing else).
   */
  private normalizeTopology(
    data: Record<string, unknown>,
    filePath: string,
  ): TenantTopology | null {
    const fileSlug = path.basename(filePath, '.topology.json');

    // v21 Finding AA: always suffix filename to guarantee uniqueness
    // (3 pairs of files in prereq-* share the same flowId in their JSON).
    const originalFlowId = (data['flowId'] as string | undefined) ?? fileSlug;
    const storedFlowId = `${originalFlowId}-${fileSlug}`;

    // v10 Finding K — two-format node normalizer
    const rawNodes = data['nodes'];
    let nodes: TenantNode[] = [];
    if (Array.isArray(rawNodes)) {
      nodes = rawNodes.map((n: Record<string, unknown>) => ({
        nodeId: String(n['id'] ?? n['nodeId'] ?? ''),
        name: String(n['name'] ?? n['id'] ?? 'unnamed'),
        archetype: String(n['archetype'] ?? n['type'] ?? 'unknown'),
        taskTypeId: n['taskTypeId'] as string | undefined,
        entry: n['entry'] as string | undefined,
        config: (n['config'] as Record<string, unknown>) ?? {},
      }));
    } else if (typeof rawNodes === 'object' && rawNodes !== null) {
      nodes = Object.entries(rawNodes).map(([key, val]) => {
        const v = val as Record<string, unknown>;
        return {
          nodeId: key,
          name: String(v['handler'] ?? v['name'] ?? key),
          archetype: String(v['nodeType'] ?? v['archetype'] ?? 'unknown'),
          config: (v['params'] ?? v['config']) as Record<string, unknown> | undefined,
        };
      });
    } else {
      return null; // No nodes field at all — skip
    }

    if (nodes.length === 0) return null;

    // v11 Finding L — filter terminal edges with null to/from to prevent ReactFlow crash
    const rawEdges = (data['edges'] as Array<Record<string, unknown>> | undefined) ?? [];
    const edges: TenantEdge[] = rawEdges
      .map((e) => ({
        from: e['from'] as string,
        to: e['to'] as string,
        event: e['event'] as string | undefined,
        condition: e['condition'] as string | undefined,
      }))
      .filter((e) => Boolean(e.from) && Boolean(e.to));

    const now = new Date().toISOString();
    const record: TenantTopology = {
      flowId: storedFlowId,
      tenantId: MASTER_TENANT_ID,
      connectionType: CONNECTION_TYPES.FLOW_SCOPED, // v24 Finding GG + v27 Finding OO
      knowledgeScope: 'GLOBAL',
      // v22 Finding DD + v23 Arbiter 9 — human-readable name fallback chain
      name: String(data['name'] ?? data['flowName'] ?? originalFlowId ?? fileSlug),
      version: String(data['version'] ?? 'v1'), // v18 Finding W — default when missing
      status: 'PUBLISHED', // v18 Finding W — GLOBAL templates always PUBLISHED
      nodes,
      edges,
      metadata: {
        originalFlowId,
        sourceFile: fileSlug,
        ...(data['wave'] !== undefined ? { wave: data['wave'] } : {}),
        ...(data['parallelWave'] !== undefined ? { parallelWave: data['parallelWave'] } : {}),
        ...(data['description'] !== undefined ? { description: data['description'] } : {}),
      },
      clientArchitecture: data['clientArchitecture'] as Record<string, unknown> | undefined,
      createdAt: now,
      updatedAt: now,
    };
    return record;
  }

  /**
   * Phase 9f: seed GLOBAL topology templates from contracts/topologies/.
   *
   * v11 Finding N: base path is `contracts/topologies/` (project root, not under fixtures/).
   * v11 Finding J: recursive walk picks up prereq-01/prereq-02/prereq-03 subdirectories.
   * v23 Finding FF: per-file try/catch — one malformed file does not abort the whole seed.
   *
   * Skipped gracefully if TenantTopologyStore is not available.
   */
  private async seedGlobalTopologies(): Promise<void> {
    if (!this.tenantTopologyStore) {
      this.logger.debug('TenantTopologyStore not available — skipping topology seeding');
      return;
    }

    const topologiesDir = path.join(process.cwd(), 'contracts', 'topologies');
    if (!fs.existsSync(topologiesDir)) {
      this.logger.warn(`No ${topologiesDir}/ directory found — skipping topology seeding`);
      return;
    }

    // v11 Finding J — recursive walk for prereq-* subdirectories
    const topologyFiles = this.listTopologyFiles(topologiesDir);
    if (topologyFiles.length === 0) {
      this.logger.warn('No *.topology.json files found — skipping topology seeding');
      return;
    }

    // Wrap in MASTER_TENANT_ID CLS context (matches seedFlowRegistry pattern at line 488).
    // v25 Arbiter 7 correction: use MASTER_TENANT_ID (full UUID) NOT 'system'.
    const masterTenant = new TenantContext({
      id: MASTER_TENANT_ID,
      name: 'XIIGen Master',
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let seeded = 0;
    let skipped = 0;
    for (const filePath of topologyFiles) {
      // v23 Finding FF — per-file try/catch for resilience
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        const normalized = this.normalizeTopology(raw, filePath);
        if (!normalized) {
          skipped++;
          continue;
        }

        const result = await this.cls.run(async () => {
          this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
          return await this.tenantTopologyStore!.storeGlobalTemplate(normalized);
        });

        if (result.isSuccess) {
          seeded++;
        } else {
          this.logger.warn(
            `Topology seed failed: ${filePath} — ${result.errorCode} ${result.errorMessage ?? ''}`,
          );
          skipped++;
        }
      } catch (err) {
        this.logger.warn(`Topology seed skip: ${filePath} — ${(err as Error).message}`);
        skipped++;
      }
    }

    this.logger.log(
      `Phase 9f: seeded ${seeded} global topology templates (${skipped} skipped of ${topologyFiles.length})`,
    );
  }

  /**
   * v11 Finding J — recursive file discovery for prereq-* subdirectories.
   */
  private listTopologyFiles(dir: string): string[] {
    const out: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        out.push(...this.listTopologyFiles(full));
      } else if (ent.name.endsWith('.topology.json')) {
        out.push(full);
      }
    }
    return out;
  }

  /**
   * Phase 9e: seed T50/T51/T52 genesis prompt placeholders.
   * Idempotent — skips task types that already have a genesis prompt doc.
   * Purpose: feedback.handler Z-1.4 searches {taskTypeId, promptType: 'genesis'}.
   * Without these docs, prompt.system is null and Phase E DPO capture is blocked.
   * AF-30 (PromptOps) will overwrite these with evolved prompts during session execution.
   */
  private async seedGenesisPromptPlaceholders(): Promise<void> {
    const prompts: Array<{
      taskTypeId: string;
      flowId: string;
      promptKey: string;
      content: string;
    }> = [
      {
        taskTypeId: 'T50',
        flowId: 'FLOW-02',
        promptKey: 'flow02.profile-enrichment-fan-in.genesis',
        content:
          'Generate ProfileEnrichmentFanIn service using Promise.allSettled() for parallel GitHub, portfolio, and skills enrichment branches. FAIL_OPEN per branch. Store aggregate result before emitting EnrichmentCompleted.',
      },
      {
        taskTypeId: 'T51',
        flowId: 'FLOW-02',
        promptKey: 'flow02.matching-convergence-gate.genesis',
        content:
          'Generate MatchingConvergenceGate service. Read confidence threshold from FREEDOM config — never hardcode. Degraded terminal: below min_confidence emits MatchingDeferred (DataProcessResult.success), never failure(). Store match result before emitting MatchingConverged.',
      },
      {
        taskTypeId: 'T52',
        flowId: 'FLOW-02',
        promptKey: 'flow02.onboarding-completion-broadcast.genesis',
        content:
          'Generate OnboardingCompletionBroadcast service. Check consent per channel before each emit (F1514). Channel delivery is best-effort — failure returns DataProcessResult.success. Store broadcast record before emitting OnboardingBroadcastSent.',
      },
    ];

    let seeded = 0;
    for (const p of prompts) {
      const existing = await this.db.searchDocuments('xiigen-prompts', {
        taskTypeId: p.taskTypeId,
        promptType: 'genesis',
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) continue;

      const now = new Date().toISOString();
      const doc: Record<string, unknown> = {
        taskTypeId: p.taskTypeId,
        flowId: p.flowId,
        promptType: 'genesis',
        promptKey: p.promptKey,
        version: 'v1-placeholder',
        content: p.content,
        systemPrompt: p.content,
        active: true,
        createdAt: now,
      };
      const result = await this.db.storeDocument(
        'xiigen-prompts',
        doc,
        `${p.taskTypeId}::genesis::v1`,
      );
      if (result.isSuccess) seeded++;
      else
        this.logger.warn(
          `Failed to seed genesis prompt placeholder for ${p.taskTypeId}: ${result.errorMessage}`,
        );
    }
    if (seeded > 0)
      this.logger.log(`Phase 9e: seeded ${seeded} genesis prompt placeholders (T50/T51/T52)`);
  }

  /**
   * FLOW-40: Seed CF-797 and CF-798 BFA rules to xiigen-decision-graph.
   * Idempotent — uses ruleId as document ID.
   */
  private async seedBfaRules(): Promise<void> {
    const allRules = [
      ...FEATURE_REGISTRY_BFA_RULES,
      ...CLIENT_PUSH_BFA_RULES,
      ...RAG_QUALITY_BFA_RULES,
      ...HISTORY_BOOTSTRAP_BFA_RULES,
      ...STACK_COUPLING_BFA_RULES,
      ...OSS_CURRICULUM_BFA_RULES,
      ...FLOW_01_BFA_RULES,
      ...FLOW_02_BFA_RULES,
      ...FLOW_03_BFA_RULES,
      ...FLOW_04_BFA_RULES,
      ...FLOW_05_BFA_RULES,
      ...FLOW_06_BFA_RULES,
      ...FLOW_07_BFA_RULES,
      ...FLOW_08_BFA_RULES,
      ...FLOW_09_BFA_RULES,
      ...REVIEWS_REPUTATION_BFA_RULES,
      ...SCHEMA_REGISTRY_DAG_BFA_RULES,
      ...SUBSCRIPTION_BILLING_BFA_RULES,
      ...ETL_DATA_INTEGRATION_BFA_RULES,
      ...SAAS_MULTI_TENANCY_BFA_RULES,
      ...MARKETPLACE_PAYMENTS_BFA_RULES,
      ...FREELANCER_MARKETPLACE_BFA_RULES,
      ...VISUAL_FLOW_ENGINE_BFA_RULES,
      ...DURABLE_SAGAS_COMPLIANCE_BFA_RULES,
      ...ADS_PLATFORM_BFA_RULES,
      ...DYNAMIC_FORMS_WORKFLOWS_BFA_RULES,
      ...CMS_PUBLISHING_BFA_RULES,
      ...FORM_BUILDER_TEMPLATES_BFA_RULES,
      ...AI_SAFETY_MODERATION_BFA_RULES,
      ...FLOW_46_BFA_RULES,
    ];
    let seeded = 0;
    for (const rule of allRules) {
      const ruleId = rule['ruleId'] as string;
      const result = await this.db
        .storeDocument('xiigen-decision-graph', rule, ruleId)
        .catch(() => ({ isSuccess: false, errorMessage: 'storeDocument threw' }));
      if ((result as { isSuccess: boolean }).isSuccess) seeded++;
      else
        this.logger.warn(
          `Failed to seed BFA rule ${ruleId}: ${(result as { errorMessage?: string }).errorMessage}`,
        );
    }
    if (seeded > 0) this.logger.log(`FLOW-40: seeded ${seeded} BFA rules to xiigen-decision-graph`);
  }

  /**
   * FLOW-47 helper — produce a MASTER_TENANT TenantContext for CLS wrapping
   * in bootstrap methods. Used by Turn 1/2/7 since onModuleInit runs without
   * any default CLS and the in-memory db provider enforces tenantId on every
   * read/write.
   */
  private makeMasterTenantContext(): TenantContext {
    return new TenantContext({
      id: MASTER_TENANT_ID,
      name: 'XIIGen Master',
      status: 'active',
      plan: {
        name: 'free',
        maxApiCallsPerMinute: 1000,
        maxTokensPerDay: 10_000_000,
        maxStorageMb: 10_000,
      },
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FLOW-47 Turn 1 (T657) — DesignCorpusBootstrapper + AF-4 rehydration (T657b)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * FLOW-47 Turn 1 — Seed 46 design-corpus files from history-seeds/ into
   * xiigen-rag-patterns + xiigen-planning-decisions, then rehydrate AF-4's
   * in-memory `this.patterns` array so keyword search reflects seeded records.
   *
   * CF-832: log coverage count BEFORE first seedFlowCorpus() — no silent partial seeding.
   * CF-833: the AF-4 rehydration step populates the searchable in-memory index.
   *          Without it, GE-1 and GE-8 fail silently: ES is populated but AF-4 returns empty.
   *
   * Idempotent — second call redundantly writes same records (patternId as docId).
   */
  private async seedAllDesignCorpora(): Promise<void> {
    if (!this.fromDocuments) {
      this.logger.debug('BootstrapFromDocumentsService not available — skipping corpus seeding');
      return;
    }

    const seedsDir = path.join(__dirname, 'history-seeds');
    if (!fs.existsSync(seedsDir)) {
      this.logger.warn('No history-seeds/ directory found — skipping corpus seeding');
      return;
    }

    // CLS context required for all storeDocument + searchDocuments calls.
    // Bootstrap runs during onModuleInit where no CLS is set by default, so wrap
    // the whole seeding block in MASTER_TENANT context (same pattern as
    // seedGlobalTopologies). Callers that already set CLS pass through this
    // wrapper idempotently via cls.runWith's snapshot-and-restore semantics.
    const masterTenant = this.makeMasterTenantContext();
    return this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
      await this.doSeedAllDesignCorpora(seedsDir);
    });
  }

  private async doSeedAllDesignCorpora(seedsDir: string): Promise<void> {
    // CF-832 — discover corpus files, log count before any seeding
    const corpusFiles = fs
      .readdirSync(seedsDir)
      .filter((f: string) => f.endsWith('-design-corpus.json'));
    this.logger.log(
      `FLOW-47 Turn 1: seeding ${corpusFiles.length} design-corpus files → xiigen-rag-patterns + xiigen-planning-decisions`,
    );

    let totalArch = 0;
    let totalDr = 0;
    let totalFailed = 0;
    let slugsSeeded = 0;
    let slugsFailed = 0;

    for (const file of corpusFiles) {
      // slug == flowId argument to seedFlowCorpus; matches filename stem
      const slug = file.replace(/-design-corpus\.json$/, '');
      try {
        // Guarded in the public caller seedAllDesignCorpora().
        const result = await this.fromDocuments!.seedFlowCorpus(slug);
        if (!result.isSuccess || !result.data) {
          this.logger.warn(
            `FLOW-47 Turn 1: seedFlowCorpus(${slug}) failed: ${result.errorMessage ?? 'unknown'}`,
          );
          slugsFailed++;
          continue;
        }
        totalArch += result.data.archPatternCount;
        totalDr += result.data.designReasoningCount;
        totalFailed += result.data.failedCount;
        slugsSeeded++;

        // Turn 1b (CF-833) — AF-4 rehydration: pull the just-seeded ARCH_PATTERN
        // records back from ES and push them into AF-4's in-memory searchable array.
        // Without this step, AF-4 keyword search returns empty even though ES is populated.
        if (this.af4Station) {
          await this.rehydrateAf4FromSlug(slug);
        }
      } catch (err) {
        this.logger.warn(
          `FLOW-47 Turn 1: seedFlowCorpus(${slug}) threw: ${(err as Error).message}`,
        );
        slugsFailed++;
      }
    }

    this.logger.log(
      `FLOW-47 Turn 1: complete — slugs seeded=${slugsSeeded} failed=${slugsFailed} ` +
        `archPatterns=${totalArch} designReasoning=${totalDr} recordsFailed=${totalFailed}`,
    );
  }

  /**
   * FLOW-47 Turn 1b — Rehydrate AF-4's in-memory `this.patterns` for one slug.
   * Queries xiigen-rag-patterns for records with matching flowId/slug and calls
   * af4Station.indexPattern() per record. Non-blocking: AF-4 remains functional
   * with just core patterns if rehydration fails.
   */
  private async rehydrateAf4FromSlug(slug: string): Promise<void> {
    if (!this.af4Station) return;
    try {
      // Corpus records are tagged with either the flowId or domainId. Query on both
      // because fixture files use different shapes (FLOW-XX vs domain slug).
      const byFlowId = await this.db.searchDocuments('xiigen-rag-patterns', { flowId: slug }, 500);
      const byDomain = await this.db.searchDocuments(
        'xiigen-rag-patterns',
        { domainId: slug },
        500,
      );
      const records: Array<Record<string, unknown>> = [];
      if (byFlowId.isSuccess && byFlowId.data) {
        records.push(...(byFlowId.data as Array<Record<string, unknown>>));
      }
      if (byDomain.isSuccess && byDomain.data) {
        records.push(...(byDomain.data as Array<Record<string, unknown>>));
      }
      // De-dupe by patternId
      const seen = new Set<string>();
      for (const record of records) {
        const pid = String(record['patternId'] ?? '');
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);
        this.af4Station.indexPattern(record);
      }
    } catch {
      /* best-effort rehydration — AF-4 still works with core patterns */
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FLOW-47 Turn 7 (T663) — CanonicalTopologyBackfillService
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * For each of the 10 empty canonical topology slugs, read per-task-type
   * fixture files, aggregate them into a canonical node list, build sequential
   * edges, and write via storeGlobalTemplate() to xiigen-flow-templates.
   *
   * CF-836: log each enriched slug BEFORE writing — no silent partial backfill.
   * Idempotent: skip if an ES record already has nodes for this slug.
   */
  private async seedCanonicalTopologyBackfill(): Promise<void> {
    if (!this.tenantTopologyStore) {
      this.logger.debug('TenantTopologyStore not available — skipping canonical backfill');
      return;
    }

    const fixturesDir = this.resolveFixtureDir('flow-definitions');
    if (!fixturesDir) {
      this.logger.debug('No fixtures/flow-definitions directory — skipping canonical backfill');
      return;
    }

    // CLS wrapping — see note on seedAllDesignCorpora. Search/storeDocument
    // calls inside this method need a tenant in CLS; bootstrap runs in
    // onModuleInit where none is set.
    const masterTenant = this.makeMasterTenantContext();
    return this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
      await this.doSeedCanonicalTopologyBackfill(fixturesDir, masterTenant);
    });
  }

  private async doSeedCanonicalTopologyBackfill(
    fixturesDir: string,
    masterTenant: TenantContext,
  ): Promise<void> {
    let backfilled = 0;
    let skipped = 0;
    for (const slug of EMPTY_TOPOLOGY_SLUGS) {
      try {
        // Idempotency check: does ES already have a populated record for this slug?
        const existing = await this.db.searchDocuments(
          'xiigen-flow-templates',
          { flowId: slug },
          5,
        );
        if (existing.isSuccess && existing.data) {
          const records = existing.data as Array<{ nodes?: unknown[] }>;
          const hasNodes = records.some((r) => Array.isArray(r.nodes) && r.nodes.length > 0);
          if (hasNodes) {
            skipped++;
            continue;
          }
        }

        const slugFiles = fs
          .readdirSync(fixturesDir)
          .filter((f: string) => f.startsWith(`${slug}-t`) && f.endsWith('.topology.json'))
          .map((f: string) => path.join(fixturesDir, f));

        const aggregatedNodes: TenantNode[] = [];
        const nodeIdsSeen = new Set<string>();
        for (const filePath of slugFiles) {
          try {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
            const rawNodes = raw['nodes'];
            if (Array.isArray(rawNodes)) {
              for (const n of rawNodes) {
                const nodeObj = n as Record<string, unknown>;
                const id = String(nodeObj['id'] ?? nodeObj['nodeId'] ?? '');
                if (!id || nodeIdsSeen.has(id)) continue;
                nodeIdsSeen.add(id);
                aggregatedNodes.push({
                  nodeId: id,
                  name: String(nodeObj['name'] ?? id),
                  archetype: String(nodeObj['archetype'] ?? nodeObj['type'] ?? 'unknown'),
                  taskTypeId: (nodeObj['taskTypeId'] as string | undefined) ?? id,
                  entry: nodeObj['entry'] as string | undefined,
                  config: (nodeObj['config'] as Record<string, unknown>) ?? {},
                });
              }
            }
          } catch {
            /* skip malformed file */
          }
        }

        // FLOW-47 Defect-6: if no per-task-type fixtures exist (e.g.
        // bundle-activation), fall back to cloning the composite template
        // `FLOW-NN-<slug>` that seedGlobalTopologies just wrote. Every
        // canonical slug in CANONICAL_SLUG_TO_FLOW_ID has exactly one
        // contracts/topologies/<slug>.topology.json that produced a composite
        // template — reuse its nodes/edges rather than duplicating content.
        if (aggregatedNodes.length === 0) {
          const canonicalFlowId = CANONICAL_SLUG_TO_FLOW_ID[slug];
          if (canonicalFlowId) {
            const compositeFlowId = `${canonicalFlowId}-${slug}`;
            const compositeResult = await this.db.searchDocuments(
              'xiigen-flow-templates',
              { flowId: compositeFlowId },
              1,
            );
            if (compositeResult.isSuccess && compositeResult.data) {
              const composite = (compositeResult.data as Array<Record<string, unknown>>)[0];
              const compositeNodes = (composite?.['nodes'] as TenantNode[] | undefined) ?? [];
              for (const node of compositeNodes) {
                if (nodeIdsSeen.has(node.nodeId)) continue;
                nodeIdsSeen.add(node.nodeId);
                aggregatedNodes.push(node);
              }
            }
          }
        }

        if (aggregatedNodes.length === 0) {
          skipped++;
          continue;
        }

        // Sort nodes by T-number (extract numeric suffix from 'T123' or 'n1')
        aggregatedNodes.sort(
          (a, b) => this.extractTNumber(a.nodeId) - this.extractTNumber(b.nodeId),
        );

        // Build sequential edges: T[n] → T[n+1]
        const edges: TenantEdge[] = [];
        for (let i = 0; i < aggregatedNodes.length - 1; i++) {
          edges.push({
            from: aggregatedNodes[i].nodeId,
            to: aggregatedNodes[i + 1].nodeId,
          });
        }

        const now = new Date().toISOString();
        const canonicalFlowId = CANONICAL_SLUG_TO_FLOW_ID[slug];
        const topology: TenantTopology = {
          flowId: slug,
          tenantId: MASTER_TENANT_ID,
          connectionType: CONNECTION_TYPES.FLOW_SCOPED,
          knowledgeScope: 'GLOBAL',
          name: this.slugToHumanName(slug),
          version: 'v1',
          status: 'PUBLISHED',
          nodes: aggregatedNodes,
          edges,
          metadata: {
            originalFlowId: slug,
            // FLOW-47 Defect-6: canonicalFlowId enables MarketplacePackageService
            // to look up rag-patterns / arbiter-configs / decision-graph records
            // seeded under FLOW-NN when the package's sourceFlowId is a raw slug.
            ...(canonicalFlowId ? { canonicalFlowId } : {}),
            sourceFile: 'backfill-from-fixtures',
            backfillOrigin: 'FLOW-47-Turn-7',
          },
          createdAt: now,
          updatedAt: now,
        };

        // CF-836: log slug + node count BEFORE writing
        this.logger.log(
          `FLOW-47 Turn 7: backfilling canonical topology ${slug} with ${aggregatedNodes.length} nodes, ${edges.length} edges`,
        );

        const result = await this.cls.run(async () => {
          this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
          return await this.tenantTopologyStore!.storeGlobalTemplate(topology);
        });

        if (result.isSuccess) {
          backfilled++;
        } else {
          this.logger.warn(
            `FLOW-47 Turn 7: backfill failed for ${slug}: ${result.errorCode} ${result.errorMessage ?? ''}`,
          );
          skipped++;
        }
      } catch (err) {
        this.logger.warn(`FLOW-47 Turn 7: backfill threw for ${slug}: ${(err as Error).message}`);
        skipped++;
      }
    }

    this.logger.log(
      `FLOW-47 Turn 7: canonical backfill complete — backfilled=${backfilled} skipped=${skipped} total=${EMPTY_TOPOLOGY_SLUGS.length}`,
    );
  }

  /** Extract numeric T-suffix from a node ID like "T123" or "n1". Returns 0 if none. */
  private extractTNumber(nodeId: string): number {
    const match = nodeId.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  /** Convert 'event-management' to 'Event Management' for template name. */
  private slugToHumanName(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // ────────────────────────────────────────────────────────────────────────────
  // FLOW-47 Turn 2 (T658) — autoPublishGlobalTemplates under MASTER_TENANT CLS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * For each GLOBAL topology seeded in xiigen-flow-templates, call
   * MarketplacePackageController.publish() under MASTER_TENANT_ID CLS context.
   *
   * Turn 0 (pre-flight guard): skip any template where nodes.length === 0 —
   * never publish a skeleton. Log a warning for each skipped flow.
   *
   * Idempotent: the publish() gate check already rejects duplicate publishes
   * via the NOT_PUBLISHED / FLOW_NOT_FOUND paths. We additionally skip in advance
   * when a package with the same sourceFlowId already exists in MARKETPLACE_PACKAGES_INDEX.
   */
  private async autoPublishGlobalTemplates(): Promise<void> {
    if (!this.marketplace || !this.tenantTopologyStore) {
      this.logger.debug(
        'MarketplacePackageService or TenantTopologyStore not available — skipping auto-publish',
      );
      return;
    }

    // CLS wrapping — see note on seedAllDesignCorpora. The outer search for
    // global templates also needs tenant CLS.
    const masterTenant = this.makeMasterTenantContext();
    return this.cls.run(async () => {
      this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
      await this.doAutoPublishGlobalTemplates(masterTenant);
    });
  }

  private async doAutoPublishGlobalTemplates(masterTenant: TenantContext): Promise<void> {
    // Fetch all GLOBAL templates from ES
    const templatesResult = await this.db.searchDocuments(
      'xiigen-flow-templates',
      { knowledgeScope: 'GLOBAL' },
      500,
    );
    if (!templatesResult.isSuccess || !templatesResult.data) {
      this.logger.warn('FLOW-47 Turn 2: listGlobalTemplates failed — skipping auto-publish');
      return;
    }
    const templates = templatesResult.data as Array<Record<string, unknown>>;

    let published = 0;
    let skippedEmpty = 0;
    let skippedExisting = 0;
    let failed = 0;

    for (const template of templates) {
      const flowId = String(template['flowId'] ?? '');
      const nodes = (template['nodes'] as unknown[]) ?? [];
      const name = String(template['name'] ?? flowId);

      // Turn 0 pre-flight guard (F-1 from R1): skip empty-topology templates
      if (!flowId || nodes.length === 0) {
        this.logger.warn(
          `FLOW-47 Turn 0: skipping auto-publish for empty-topology flow '${flowId}' — nodes.length=0`,
        );
        skippedEmpty++;
        continue;
      }

      // Idempotency — check for existing package with same sourceFlowId
      const existing = await this.db.searchDocuments(
        MARKETPLACE_PACKAGES_INDEX,
        { sourceFlowId: flowId },
        5,
      );
      if (existing.isSuccess && existing.data && existing.data.length > 0) {
        skippedExisting++;
        continue;
      }

      try {
        const result = await this.cls.run(async () => {
          this.cls.set(TENANT_CONTEXT_KEY, masterTenant);
          return await this.marketplace!.publish({
            flowId,
            title: name,
            description: `Auto-published GLOBAL template ${flowId}`,
            tags: ['platform', 'auto-published'],
            // FLOW-47 Defect-7: bootstrap-time auto-publish should skip
            // packages that would have empty designBundleRefs (no canonical
            // design data seeded for this flow — e.g. FLOW-PREREQ-*).
            requireDesignBundle: true,
          });
        });

        if ('packageId' in (result as Record<string, unknown>)) {
          published++;
        } else {
          // publish() returned { error, code } — treat NOT_PUBLISHABLE/NOT_PUBLISHED gracefully
          const errObj = result as { error?: string; code?: string };
          this.logger.debug(
            `FLOW-47 Turn 2: auto-publish skipped ${flowId}: ${errObj.code} ${errObj.error ?? ''}`,
          );
          failed++;
        }
      } catch (err) {
        this.logger.warn(
          `FLOW-47 Turn 2: auto-publish failed for ${flowId}: ${(err as Error).message}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `FLOW-47 Turn 2: auto-publish complete — published=${published} skippedEmpty=${skippedEmpty} skippedExisting=${skippedExisting} failed=${failed} total=${templates.length}`,
    );
  }
}
