import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * Sample Engine Contracts — T44 + T45.
 *
 * T44: Inventory Management (DATA_PIPELINE)
 *   - 4 factory dependencies: F166–F169 → DATABASE + QUEUE fabrics
 *   - Demonstrates multi-fabric data pipeline pattern
 *
 * T45: Marketplace Listing Generator (ORCHESTRATION)
 *   - 4 factory dependencies: F170–F173 → AI_ENGINE + DATABASE + QUEUE fabrics
 *   - Demonstrates AI-powered orchestration pattern
 *
 * Phase 6.3: Sample contracts for validation and testing.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const SAMPLE_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

/**
 * T44 — Inventory Management Data Pipeline.
 *
 * ARCHETYPE: DATA_PIPELINE
 * ENTRY: Fires on inventory.update event
 * PURPOSE: ETL pipeline for inventory across multiple storage backends
 * FACTORY DEPENDENCIES:
 *   F166:IInventoryService → DATABASE FABRIC (PostgreSQL)
 *   F167:IStockLevelService → DATABASE FABRIC (Elasticsearch)
 *   F168:IInventoryAuditService → DATABASE FABRIC (PostgreSQL)
 *   F169:IInventoryEventService → QUEUE FABRIC (Redis Streams)
 */
export function createT44Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T44',
    name: 'Inventory Management Data Pipeline',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'Fires on inventory.update event via QUEUE FABRIC',
    purpose: 'ETL pipeline for inventory data across multiple storage backends with audit trail',
    distinctFrom: 'T12 (single-entity CRUD), T33 (2-way convergence)',
    familyId: 'Family-25',

    factoryDependencies: [
      {
        factoryId: 'F166',
        interfaceName: 'IInventoryService',
        fabricType: FabricType.DATABASE,
        providerHint: 'postgresql',
        description: 'Primary inventory storage — relational model for stock items',
      },
      {
        factoryId: 'F167',
        interfaceName: 'IStockLevelService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stock level index — fast search/aggregation for stock queries',
      },
      {
        factoryId: 'F168',
        interfaceName: 'IInventoryAuditService',
        fabricType: FabricType.DATABASE,
        providerHint: 'postgresql',
        description: 'Audit trail — append-only log of all inventory changes',
      },
      {
        factoryId: 'F169',
        interfaceName: 'IInventoryEventService',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Event bus — publishes inventory.updated, stock.low, stock.replenished events',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'data_pipeline', max_tokens: 4000 },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['database_service', 'queue_publish', 'audit_trail'],
        },
      },
      {
        stationId: 'AF-6',
        role: 'review',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { focus: ['dna_compliance', 'fabric_usage'] },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-01',
        description: 'All services extend MicroserviceBase (DNA-4)',
        severity: 'error',
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-02',
        description: 'No direct provider imports — only fabric interfaces (DNA fabric rule)',
        severity: 'error',
        checkType: 'fabric_usage',
      },
      {
        gateId: 'QG-03',
        description: 'All methods return DataProcessResult (DNA-3)',
        severity: 'error',
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-04',
        description: 'Scope isolation: tenantId on every query (DNA-5)',
        severity: 'error',
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-05',
        description: 'Outbox-before-queue pattern enforced (DNA-8)',
        severity: 'warning',
        checkType: 'code_structure',
      },
    ],

    bfaRegistration: {
      entities: ['inventory_item', 'stock_level', 'inventory_audit'],
      events: ['inventory.updated', 'stock.low', 'stock.replenished'],
      apiRoutes: ['/api/inventory', '/api/stock-levels', '/api/inventory-audit'],
    },

    ironRules: [
      'NEVER import PostgreSQL client directly — use IDatabaseService via DATABASE FABRIC',
      'NEVER import Redis client directly — use IQueueService via QUEUE FABRIC',
      'ALL inventory mutations MUST write to audit trail BEFORE publishing event',
      'ALL queries MUST include tenantId in the filter (scope isolation)',
      'Stock level updates MUST be idempotent (DNA-7)',
    ],

    machineComponents: [
      'Audit trail write ordering (always before event publish)',
      'Scope isolation enforcement (tenantId injection)',
      'Idempotency key generation for stock updates',
      'DataProcessResult wrapping on all methods',
    ],

    freedomComponents: [
      'Low stock threshold (configurable per tenant)',
      'Audit retention period (days)',
      'Event batch size for stock level sync',
      'Preferred database provider per index',
    ],
    stackCoupling: SAMPLE_STACK_COUPLING,
  });
}

/**
 * T45 — Marketplace Listing Generator.
 *
 * ARCHETYPE: ORCHESTRATION
 * ENTRY: Fires when admin triggers listing generation from product catalog
 * PURPOSE: AI-powered generation of marketplace listings with multi-model selection
 * FACTORY DEPENDENCIES:
 *   F170:IListingGeneratorService → AI_ENGINE FABRIC (LLM provider)
 *   F171:IProductCatalogService → DATABASE FABRIC (Elasticsearch)
 *   F172:IListingStorageService → DATABASE FABRIC (PostgreSQL)
 *   F173:IListingEventService → QUEUE FABRIC (Redis Streams)
 */
export function createT45Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T45',
    name: 'Marketplace Listing Generator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Fires on admin trigger or scheduled batch from FLOW ENGINE',
    purpose:
      'AI-powered generation of marketplace listings with multi-model orchestration and quality scoring',
    distinctFrom: 'T44 (data pipeline, no AI), T40 (three-way join, no generation)',
    familyId: 'Family-26',

    factoryDependencies: [
      {
        factoryId: 'F170',
        interfaceName: 'IListingGeneratorService',
        fabricType: FabricType.AI_ENGINE,
        providerHint: 'anthropic',
        description: 'AI listing generator — uses LLM to create product descriptions',
      },
      {
        factoryId: 'F171',
        interfaceName: 'IProductCatalogService',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Product catalog — searchable index of products to generate listings for',
      },
      {
        factoryId: 'F172',
        interfaceName: 'IListingStorageService',
        fabricType: FabricType.DATABASE,
        providerHint: 'postgresql',
        description: 'Listing storage — persists generated listings with metadata',
      },
      {
        factoryId: 'F173',
        interfaceName: 'IListingEventService',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description:
          'Event bus — publishes listing.generated, listing.approved, listing.rejected events',
      },
    ],

    afStations: [
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 8000 },
      },
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'marketplace', categories: ['listing', 'product_description'] },
      },
      {
        stationId: 'AF-4',
        role: 'rag_context',
        config: {
          namespace: 'skills',
          patterns: ['ai_orchestration', 'multi_model', 'content_generation'],
        },
      },
      {
        stationId: 'AF-5',
        role: 'multi_model',
        config: { models: [MODEL_HINT_FROM_FREEDOM, 'gpt-5'], aggregation: 'best_score' },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, min_score: 0.7 },
      },
    ],

    qualityGates: [
      {
        gateId: 'QG-01',
        description: 'All services extend MicroserviceBase (DNA-4)',
        severity: 'error',
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-02',
        description: 'No direct AI SDK imports — only IAiProvider via AI_ENGINE FABRIC',
        severity: 'error',
        checkType: 'fabric_usage',
      },
      {
        gateId: 'QG-03',
        description: 'All methods return DataProcessResult (DNA-3)',
        severity: 'error',
        checkType: 'dna_compliance',
      },
      {
        gateId: 'QG-04',
        description: 'Multi-model output selection uses scoring, not hardcoded preference',
        severity: 'error',
        checkType: 'spec_adherence',
      },
      {
        gateId: 'QG-05',
        description: 'Generated listings must pass content quality check',
        severity: 'warning',
        checkType: 'test_quality',
      },
    ],

    bfaRegistration: {
      entities: ['product', 'listing', 'listing_version'],
      events: ['listing.generated', 'listing.approved', 'listing.rejected', 'listing.published'],
      apiRoutes: ['/api/listings', '/api/listings/generate', '/api/products'],
    },

    ironRules: [
      'NEVER call OpenAI/Anthropic SDK directly — use IAiProvider via AI_ENGINE FABRIC',
      'NEVER import PostgreSQL/ES client directly — use IDatabaseService via DATABASE FABRIC',
      'Multi-model results MUST be scored and compared, not blindly selected',
      'ALL generated content MUST be stored with version tracking',
      'ALL queries MUST include tenantId in the filter (scope isolation)',
    ],

    machineComponents: [
      'Multi-model dispatch orchestration via AiDispatcher',
      'Score comparison and selection logic',
      'Listing version tracking (immutable append)',
      'Scope isolation enforcement',
      'DataProcessResult wrapping on all methods',
    ],

    freedomComponents: [
      'Preferred AI model for listing generation (configurable per tenant)',
      'Minimum quality score threshold',
      'Auto-approve listings above threshold (boolean)',
      'Listing template/style per marketplace',
    ],
    stackCoupling: SAMPLE_STACK_COUPLING,

    // FC-26: ORCHESTRATION archetype requires structured arbiter panel
    arbiterConfig: {
      minPanel: {
        required: ['dna', 'fabric', 'business_logic', 'key_principles', 'iron_rules'],
        quorum: 5,
      },
      blockSemantics: {
        blockOnFail: ['iron_rules', 'key_principles'],
      },
      escalationGate: {
        minAggregateScore: 0.7,
        onFail: 'RETRY',
      },
    },
  });
}
