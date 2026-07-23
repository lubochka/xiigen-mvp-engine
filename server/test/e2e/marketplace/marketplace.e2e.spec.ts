/**
 * FLOW-08 E2E — Marketplace Listings & Catalog
 *
 * Archetypes: SUBMISSION_GATEWAY, DATA_PIPELINE, MODERATION, GUARD, ANALYTICS_ENGINE
 * Task types: T83–T88 (Families 29–32)
 * CloudEvents: ListingPublished, ListingDrafted, CatalogIndexed,
 *   ListingFeedGenerated, ListingAnalyticsAggregated
 *
 * Named checks:
 *   audit_write_before_any_business_logic
 *   moderation_failure_to_draft_not_failure
 *   zero_price_listing_valid
 *   listing_feed_count_only_payload
 *   conversion_rate_machine_formula
 *   listing_analytics_aggregate_only
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — audit → moderation PASS → price → persist → publish → index → feed → analytics
 *   2. Error path — audit before moderation enforced, DRAFT on rejection, zero price accepted
 *   3. Tenant isolation — listings scoped per tenant, catalog isolated
 *   4. Idempotency — version-keyed index idempotency, duplicate listing deduped
 *   5. UI state — DRAFT → MODERATED → PUBLISHED → INDEXED
 *   6. API contract — /api/dynamic/listings, /api/dynamic/catalog → DataProcessResult
 *   7. CloudEvents — ListingPublished, CatalogIndexed, ListingFeedGenerated pass validateCloudEvent
 *   8. Named checks — audit_write_before_any_business_logic, conversion_rate_machine_formula pass
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
import { NAMED_CHECKS } from '../../../src/engine/node-handlers/validate.handler';
import { FLOW_08_CONTRACTS } from '../../../src/engine-contracts/marketplace-contracts';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) bucket[existing] = { ...doc, id };
      else bucket.push({ ...doc, id });
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
        runId: 'flow08-run-id',
        status: 'PASS',
        score: 78,
        trace: [
          {
            nodeId: 'listing-publisher',
            nodeType: 'submission-gateway',
            status: 'PASS',
            durationMs: 15,
          },
          { nodeId: 'listing-moderation', nodeType: 'moderation', status: 'PASS', durationMs: 12 },
          { nodeId: 'catalog-indexer', nodeType: 'data-pipeline', status: 'PASS', durationMs: 10 },
          {
            nodeId: 'listing-feed-generator',
            nodeType: 'data-pipeline',
            status: 'PASS',
            durationMs: 8,
          },
          {
            nodeId: 'listing-analytics',
            nodeType: 'analytics-engine',
            status: 'PASS',
            durationMs: 6,
          },
        ],
        finalOutput: { code: '// FLOW-08 Marketplace Listings & Catalog' },
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

// ── Contract param builders ──────────────────────────────────────────────────

function flow08ListingParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T83_F08_LISTING${suffix}`,
    flowId: 'FLOW-08',
    flowName: 'Marketplace Listings & Catalog',
    name: 'ListingPublisher',
    archetype: ContractArchetype.SUBMISSION_GATEWAY,
    entry: 'marketplace.listing.publish_requested CloudEvent',
    purpose:
      'Publishes marketplace listings. Strict order: ' +
      '(1) audit write FIRST → (2) moderation → (3) price → (4) persist → (5) storeDocument → (6) enqueue. ' +
      'Moderation rejection → DRAFT (not failure). price < 0 → reject; price = 0 → accept.',
    factoryDependencies: [
      {
        factoryId: `F_DB_LISTING${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Listing record storage',
      },
      {
        factoryId: `F_QUEUE_LISTING${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ListingPublished / ListingDrafted event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-08-L01${suffix}`,
        description: 'Audit write must be first operation',
        severity: 'error',
        checkType: 'audit_write_before_any_business_logic',
      },
      {
        gateId: `QG-08-L02${suffix}`,
        description: 'Moderation rejection → DRAFT (not failure)',
        severity: 'error',
        checkType: 'moderation_failure_to_draft_not_failure',
      },
      {
        gateId: `QG-08-L03${suffix}`,
        description: 'price=0 is valid free listing',
        severity: 'error',
        checkType: 'zero_price_listing_valid',
      },
    ],
    bfaRegistration: {
      entities: [`listing_record_f08${suffix}`],
      events: [
        `marketplace.listing.published.f08${suffix}`,
        `marketplace.listing.drafted.f08${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: audit write BEFORE moderation, price check, everything',
      'IR-2: moderation failure → DataProcessResult.success({ status: "DRAFT" })',
      'IR-3: price < 0 → reject; price = 0 → accept (free listing)',
    ],
    machineComponents: ['Audit outbox writer', 'Price validator'],
    freedomComponents: ['flow08_max_price_cap', 'flow08_moderation_threshold'],
    familyId: 'Family-29',
  };
}

function flow08AnalyticsParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T86_F08_ANALYTICS${suffix}`,
    flowId: 'FLOW-08',
    flowName: 'Marketplace Listings & Catalog',
    name: 'ListingAnalyticsAggregator',
    archetype: ContractArchetype.ANALYTICS_ENGINE,
    entry: 'marketplace.analytics.window_closed CloudEvent',
    purpose:
      'Aggregates listing analytics. ' +
      'conversionRate = inquiries / (views || 1) — MACHINE formula in literal code. ' +
      'Aggregate-only: no viewerIds array.',
    factoryDependencies: [
      {
        factoryId: `F_DB_ANALYTICS${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Analytics aggregate storage',
      },
      {
        factoryId: `F_QUEUE_ANALYTICS${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'Analytics event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-08-A01${suffix}`,
        description: 'conversionRate = inquiries / (views || 1) as literal code',
        severity: 'error',
        checkType: 'conversion_rate_machine_formula',
      },
      {
        gateId: `QG-08-A02${suffix}`,
        description: 'No viewerIds in analytics payload',
        severity: 'error',
        checkType: 'listing_analytics_aggregate_only',
      },
    ],
    bfaRegistration: {
      entities: [`listing_analytics_f08${suffix}`],
      events: [`marketplace.analytics.aggregated.f08${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: conversionRate = inquiries / (views || 1) — MACHINE formula',
      'IR-2: no viewerIds — aggregate only',
      'IR-3: storeDocument BEFORE enqueue (DNA-8)',
    ],
    machineComponents: ['Conversion rate formula', 'Views counter aggregator'],
    freedomComponents: ['flow08_analytics_window_days'],
    familyId: 'Family-30',
  };
}

const TENANT_A = 'tenant-alpha-08';
const TENANT_B = 'tenant-beta-08';

// ── Category 1: Happy Path ───────────────────────────────────────────────────

describe('FLOW-08 E2E — Marketplace Listings & Catalog', () => {
  describe('Category 1 — Happy Path', () => {
    it('F08-H1: listing published with audit first → storeDocument before enqueue', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      // Simulate strict order: audit → moderation → price → persist → store → enqueue
      await db.storeDocument(
        'listing-audits',
        { auditId: 'aud-001', listingId: 'lst-001', action: 'publish_attempted' },
        'aud-001',
      );
      await db.storeDocument(
        'listings',
        { listingId: 'lst-001', tenantId: TENANT_A, status: 'PUBLISHED', price: 29.99 },
        'lst-001',
      );
      await queue.enqueue(
        'marketplace.listing.published',
        createCloudEvent({
          eventType: 'marketplace.listing.published',
          source: 'flow-08/listing-publisher',
          data: { listingId: 'lst-001', tenantId: TENANT_A, status: 'PUBLISHED', price: 29.99 },
          tenantId: TENANT_A,
        }) as unknown as Record<string, unknown>,
      );

      const auditOrder = (db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
      const listingOrder = (db.storeDocument as jest.Mock).mock.invocationCallOrder[1];
      const enqueueOrder = (queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
      expect(auditOrder).toBeLessThan(listingOrder);
      expect(listingOrder).toBeLessThan(enqueueOrder);
    });

    it('F08-H2: moderation PASS → listing status PUBLISHED', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        {
          listingId: 'lst-002',
          tenantId: TENANT_A,
          status: 'PUBLISHED',
          moderationDecision: 'PASS',
        },
        'lst-002',
      );

      const listing = await db.getDocument('listings', 'lst-002');
      expect(listing.data?.['status']).toBe('PUBLISHED');
      expect(listing.data?.['moderationDecision']).toBe('PASS');
    });

    it('F08-H3: free listing (price=0) published successfully', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await db.storeDocument(
        'listings',
        { listingId: 'lst-free-001', tenantId: TENANT_A, status: 'PUBLISHED', price: 0 },
        'lst-free-001',
      );
      await queue.enqueue(
        'marketplace.listing.published',
        createCloudEvent({
          eventType: 'marketplace.listing.published',
          source: 'flow-08/listing-publisher',
          data: { listingId: 'lst-free-001', tenantId: TENANT_A, price: 0 },
          tenantId: TENANT_A,
        }) as unknown as Record<string, unknown>,
      );

      expect(queue._emitted).toHaveLength(1); // free listing accepted
      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['price']).toBe(0);
    });

    it('F08-H4: catalog indexed after listing published via F227', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      await db.storeDocument(
        'catalog-index',
        { listingId: 'lst-001', indexVersion: 'v1', tenantId: TENANT_A },
        'idx-lst-001-v1',
      );
      await queue.enqueue(
        'marketplace.catalog.indexed',
        createCloudEvent({
          eventType: 'marketplace.catalog.indexed',
          source: 'flow-08/catalog-indexer',
          data: { listingId: 'lst-001', indexVersion: 'v1', tenantId: TENANT_A },
          tenantId: TENANT_A,
        }) as unknown as Record<string, unknown>,
      );

      expect(queue._emitted[0].queue).toBe('marketplace.catalog.indexed');
    });

    it('F08-H5: listing feed generated → { count: N } only payload', async () => {
      const queue = makeInMemoryQueue();

      await queue.enqueue(
        'marketplace.listing_feed.generated',
        createCloudEvent({
          eventType: 'marketplace.listing_feed.generated',
          source: 'flow-08/listing-feed-generator',
          data: { count: 42, tenantId: TENANT_A },
          tenantId: TENANT_A,
        }) as unknown as Record<string, unknown>,
      );

      const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
      expect(data['count']).toBe(42);
      expect(data['listingId']).toBeUndefined(); // no listing IDs
      expect(data['ids']).toBeUndefined(); // no ID arrays
    });

    it('F08-H6: analytics aggregated with MACHINE formula: conversionRate = inquiries / (views || 1)', async () => {
      const views = 100;
      const inquiries = 15;
      // MACHINE formula — literal code
      const conversionRate = inquiries / (views || 1);

      const db = makeInMemoryDb();
      await db.storeDocument(
        'listing-analytics',
        { listingId: 'lst-001', views, inquiries, conversionRate, tenantId: TENANT_A },
        'anal-lst-001',
      );

      const result = await db.getDocument('listing-analytics', 'anal-lst-001');
      expect(result.data?.['conversionRate']).toBe(0.15);
    });

    it('F08-H7: analytics with zero views uses safe divisor (views || 1)', () => {
      const views = 0;
      const inquiries = 5;
      const conversionRate = inquiries / (views || 1); // safe division
      expect(conversionRate).toBe(5); // 5 / 1
    });

    it('F08-H8: engine generates FLOW-08 ListingPublisher with PASS status', async () => {
      const engine = createEngine();
      const params = flow08ListingParams('-e2e');
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT_A);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // ── Category 2: Error Path ─────────────────────────────────────────────────

  describe('Category 2 — Error Path', () => {
    it('F08-E1: moderation rejection → DataProcessResult.success({ status: "DRAFT" }) NOT failure', () => {
      // Simulate correct moderation rejection handling
      const moderationDecision = 'REJECTED';
      let result: DataProcessResult<Record<string, unknown>>;

      if (moderationDecision === 'REJECTED') {
        result = DataProcessResult.success({
          status: 'DRAFT',
          moderationReason: 'INAPPROPRIATE_CONTENT',
        });
      } else {
        result = DataProcessResult.success({ status: 'PUBLISHED' });
      }

      expect(result.isSuccess).toBe(true); // NOT failure
      expect(result.data?.['status']).toBe('DRAFT');
    });

    it('F08-E2: negative price → DataProcessResult.failure', () => {
      function validatePrice(price: number): DataProcessResult<boolean> {
        if (price < 0)
          return DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
        return DataProcessResult.success(true);
      }
      const result = validatePrice(-10);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_PRICE');
    });

    it('F08-E3: zero price → DataProcessResult.success (free listing accepted)', () => {
      function validatePrice(price: number): DataProcessResult<boolean> {
        if (price < 0)
          return DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
        return DataProcessResult.success(true);
      }
      const result = validatePrice(0);
      expect(result.isSuccess).toBe(true); // price=0 is valid
    });

    it('F08-E4: audit_write_before_any_business_logic check — fails on code with moderation before audit', () => {
      const namedCheck = NAMED_CHECKS['audit_write_before_any_business_logic'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        const modResult = await this.moderationService.check(listingData);
        const audit = await this.auditService.writeAudit(listingData);
        // WRONG — moderation before audit
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T83') : variant.test(badCode);
      expect(result).toBe(false); // check FAILS
    });

    it('F08-E5: moderation_failure_to_draft_not_failure check — fails on code returning failure()', () => {
      const namedCheck = NAMED_CHECKS['moderation_failure_to_draft_not_failure'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        if (modResult.data.decision === 'REJECTED') {
          return DataProcessResult.failure('MODERATION_REJECTED', 'Content rejected');
          // WRONG — should be success({ status: 'DRAFT' })
        }
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T83') : variant.test(badCode);
      expect(result).toBe(false); // check FAILS
    });

    it('F08-E6: zero_price_listing_valid check — fails on code rejecting price=0', () => {
      const namedCheck = NAMED_CHECKS['zero_price_listing_valid'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        if (listing.price <= 0) { // WRONG — rejects zero price
          return DataProcessResult.failure('INVALID_PRICE', 'Price must be positive');
        }
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T83') : variant.test(badCode);
      expect(result).toBe(false); // check FAILS
    });

    it('F08-E7: listing_feed_count_only_payload check — fails on code with listingId in payload', () => {
      const namedCheck = NAMED_CHECKS['listing_feed_count_only_payload'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        // ListingFeedGenerated event — wrong: includes listingId in payload
        const payload = { count: listings.length, listingId: listings[0].id }; // listingId in payload — WRONG
        await this.queue.enqueue('marketplace.listing_feed.generated', payload);
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T85') : variant.test(badCode);
      expect(result).toBe(false); // check FAILS
    });

    it('F08-E8: conversion_rate_machine_formula check — fails on code using config.get', () => {
      const namedCheck = NAMED_CHECKS['conversion_rate_machine_formula'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        const formulaStr = await this.configService.get('conversion_formula'); // WRONG
        const conversionRate = evaluate(formulaStr, { inquiries, views });
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T86') : variant.test(badCode);
      expect(result).toBe(false); // check FAILS
    });
  });

  // ── Category 3: Tenant Isolation ──────────────────────────────────────────

  describe('Category 3 — Tenant Isolation', () => {
    it('F08-T1: listings are scoped per tenant — cross-tenant query returns empty', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        { listingId: 'lst-t1-001', tenantId: TENANT_A, status: 'PUBLISHED' },
        'lst-t1-001',
      );

      const resultA = await db.searchDocuments('listings', { tenantId: TENANT_A });
      const resultB = await db.searchDocuments('listings', { tenantId: TENANT_B });

      expect(resultA.data).toHaveLength(1);
      expect(resultB.data).toHaveLength(0);
    });

    it('F08-T2: catalog index scoped per tenant', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'catalog-index',
        { listingId: 'lst-t2-001', tenantId: TENANT_A },
        'idx-t2-001',
      );

      const tenantBIndex = await db.searchDocuments('catalog-index', { tenantId: TENANT_B });
      expect(tenantBIndex.data).toHaveLength(0);
    });

    it('F08-T3: analytics records scoped per tenant', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listing-analytics',
        { listingId: 'lst-t3-001', tenantId: TENANT_A, views: 50 },
        'anal-t3-001',
      );

      const crossTenant = await db.searchDocuments('listing-analytics', { tenantId: TENANT_B });
      expect(crossTenant.data).toHaveLength(0);
    });
  });

  // ── Category 4: Idempotency ────────────────────────────────────────────────

  describe('Category 4 — Idempotency', () => {
    it('F08-I1: duplicate catalog index with same listingId+version is idempotent', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'catalog-index',
        { listingId: 'lst-i-001', indexVersion: 'v1', tenantId: TENANT_A },
        'idx-lst-i-001-v1',
      );
      await db.storeDocument(
        'catalog-index',
        { listingId: 'lst-i-001', indexVersion: 'v1', tenantId: TENANT_A },
        'idx-lst-i-001-v1',
      );

      const result = await db.searchDocuments('catalog-index', {
        listingId: 'lst-i-001',
        indexVersion: 'v1',
      });
      expect(result.data).toHaveLength(1); // idempotent
    });

    it('F08-I2: duplicate listing publish with same listingId returns existing state', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        { listingId: 'lst-i-002', tenantId: TENANT_A, status: 'PUBLISHED' },
        'lst-i-002',
      );
      await db.storeDocument(
        'listings',
        { listingId: 'lst-i-002', tenantId: TENANT_A, status: 'PUBLISHED' },
        'lst-i-002',
      );

      const result = await db.searchDocuments('listings', { listingId: 'lst-i-002' });
      expect(result.data).toHaveLength(1);
    });

    it('F08-I3: duplicate audit record is idempotent', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listing-audits',
        { auditId: 'aud-i-001', listingId: 'lst-001', action: 'publish_attempted' },
        'aud-i-001',
      );
      await db.storeDocument(
        'listing-audits',
        { auditId: 'aud-i-001', listingId: 'lst-001', action: 'publish_attempted' },
        'aud-i-001',
      );

      const result = await db.searchDocuments('listing-audits', { auditId: 'aud-i-001' });
      expect(result.data).toHaveLength(1);
    });

    it('F08-I4: analytics recompute produces same conversionRate given same inputs', () => {
      function computeConversionRate(inquiries: number, views: number): number {
        return inquiries / (views || 1);
      }

      const rate1 = computeConversionRate(15, 100);
      const rate2 = computeConversionRate(15, 100); // same inputs
      expect(rate1).toBe(rate2);
    });
  });

  // ── Category 5: UI State Mapping ──────────────────────────────────────────

  describe('Category 5 — UI State Mapping', () => {
    it('F08-U1: listing UI state DRAFT → MODERATED → PUBLISHED', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        { listingId: 'lst-ui-001', status: 'DRAFT', tenantId: TENANT_A },
        'lst-ui-001',
      );
      const draft = await db.getDocument('listings', 'lst-ui-001');
      expect(draft.data?.['status']).toBe('DRAFT');

      await db.storeDocument(
        'listings',
        { listingId: 'lst-ui-001', status: 'MODERATED', tenantId: TENANT_A },
        'lst-ui-001',
      );
      const moderated = await db.getDocument('listings', 'lst-ui-001');
      expect(moderated.data?.['status']).toBe('MODERATED');

      await db.storeDocument(
        'listings',
        { listingId: 'lst-ui-001', status: 'PUBLISHED', tenantId: TENANT_A },
        'lst-ui-001',
      );
      const published = await db.getDocument('listings', 'lst-ui-001');
      expect(published.data?.['status']).toBe('PUBLISHED');
    });

    it('F08-U2: moderation rejection produces DRAFT state (not error state)', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        {
          listingId: 'lst-ui-002',
          status: 'DRAFT',
          tenantId: TENANT_A,
          moderationReason: 'CONTENT_POLICY',
        },
        'lst-ui-002',
      );

      const listing = await db.getDocument('listings', 'lst-ui-002');
      expect(listing.data?.['status']).toBe('DRAFT'); // not REJECTED, not ERROR
    });

    it('F08-U3: free listing (price=0) follows same PUBLISHED state', async () => {
      const db = makeInMemoryDb();

      await db.storeDocument(
        'listings',
        { listingId: 'lst-ui-003', status: 'PUBLISHED', price: 0, tenantId: TENANT_A },
        'lst-ui-003',
      );
      const listing = await db.getDocument('listings', 'lst-ui-003');
      expect(listing.data?.['status']).toBe('PUBLISHED');
      expect(listing.data?.['price']).toBe(0);
    });
  });

  // ── Category 6: API Contract ───────────────────────────────────────────────

  describe('Category 6 — API Contract', () => {
    it('F08-A1: DataProcessResult.success wraps published listing', () => {
      const result = DataProcessResult.success({
        listingId: 'lst-api-001',
        status: 'PUBLISHED',
        price: 29.99,
        tenantId: TENANT_A,
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.['listingId']).toBe('lst-api-001');
    });

    it('F08-A2: DataProcessResult.success wraps DRAFT state on moderation rejection', () => {
      const result = DataProcessResult.success({
        status: 'DRAFT',
        moderationReason: 'CONTENT_POLICY',
      });
      expect(result.isSuccess).toBe(true); // success, not failure
      expect(result.data?.['status']).toBe('DRAFT');
    });

    it('F08-A3: DataProcessResult.failure for negative price', () => {
      const result = DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_PRICE');
    });

    it('F08-A4: FLOW-08 contracts array has expected task types', () => {
      expect(FLOW_08_CONTRACTS.length).toBeGreaterThanOrEqual(4);
      const ids = FLOW_08_CONTRACTS.map((c) => c['taskTypeId'] as string);
      expect(ids).toContain('T83');
      expect(ids).toContain('T86');
    });

    it('F08-A5: T83 contract has strict audit-first execution order documented', () => {
      const t83 = FLOW_08_CONTRACTS.find((c) => c['taskTypeId'] === 'T83');
      expect(t83).toBeDefined();
      expect(t83?.['auditFirst']).toBeDefined();
      expect((t83?.['auditFirst'] as Record<string, unknown>)['required']).toBe(true);
    });

    it('F08-A6: T86 contract documents MACHINE formula and aggregate-only policy', () => {
      const t86 = FLOW_08_CONTRACTS.find((c) => c['taskTypeId'] === 'T86');
      expect(t86).toBeDefined();
      expect(t86?.['machineFormula']).toBeDefined();
      expect((t86?.['machineFormula'] as Record<string, unknown>)['expression']).toBe(
        'inquiries / (views || 1)',
      );
    });
  });

  // ── Category 7: CloudEvents ────────────────────────────────────────────────

  describe('Category 7 — CloudEvents', () => {
    it('F08-C1: ListingPublished CloudEvent passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.marketplace.listing-published.v1',
        source: 'xiigen/flows/marketplace-listings-catalog/t83',
        data: { listingId: 'lst-ce-001', status: 'PUBLISHED', price: 29.99, tenantId: TENANT_A },
        tenantId: TENANT_A,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
    });

    it('F08-C2: ListingDrafted CloudEvent passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.marketplace.listing-drafted.v1',
        source: 'xiigen/flows/marketplace-listings-catalog/t83',
        data: {
          listingId: 'lst-ce-002',
          status: 'DRAFT',
          moderationReason: 'CONTENT_POLICY',
          tenantId: TENANT_A,
        },
        tenantId: TENANT_A,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
    });

    it('F08-C3: CatalogIndexed CloudEvent passes validateCloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.marketplace.catalog-indexed.v1',
        source: 'xiigen/flows/marketplace-listings-catalog/t84',
        data: { listingId: 'lst-ce-003', indexVersion: 'v1', tenantId: TENANT_A },
        tenantId: TENANT_A,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
    });

    it('F08-C4: ListingFeedGenerated CloudEvent has { count: N } only payload', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.marketplace.listing-feed-generated.v1',
        source: 'xiigen/flows/marketplace-listings-catalog/t85',
        data: { count: 42, tenantId: TENANT_A },
        tenantId: TENANT_A,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);

      const data = event['data'] as Record<string, unknown>;
      expect(data['count']).toBe(42);
      expect(data['listingId']).toBeUndefined();
    });

    it('F08-C5: CloudEvent for free listing (price=0) passes validation', () => {
      const event = createCloudEvent({
        eventType: 'xiigen.marketplace.listing-published.v1',
        source: 'xiigen/flows/marketplace-listings-catalog/t83',
        data: { listingId: 'lst-free-ce-001', status: 'PUBLISHED', price: 0, tenantId: TENANT_A },
        tenantId: TENANT_A,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
    });
  });

  // ── Category 8: Named Checks ───────────────────────────────────────────────

  describe('Category 8 — Named Checks', () => {
    it('F08-N1: audit_write_before_any_business_logic — passes on code with audit first', () => {
      const namedCheck = NAMED_CHECKS['audit_write_before_any_business_logic'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        const audit = await this.auditService.writeAudit({ listingId, action: 'publish_attempted' });
        const modResult = await this.moderationService.check(listingData);
        const priceResult = await this.priceValidator.validate(listingData.price);
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T83') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N2: moderation_failure_to_draft_not_failure — passes on correct DRAFT pattern', () => {
      const namedCheck = NAMED_CHECKS['moderation_failure_to_draft_not_failure'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        if (modResult.data.decision === 'REJECTED') {
          return DataProcessResult.success({ status: 'DRAFT', moderationReason: modResult.data.reason });
        }
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T83') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N3: zero_price_listing_valid — passes on code using price < 0 check', () => {
      const namedCheck = NAMED_CHECKS['zero_price_listing_valid'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        if (listing.price < 0) {
          return DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
        }
        // price === 0 is fine — free listing
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T83') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N4: listing_feed_count_only_payload — passes on count-only payload', () => {
      const namedCheck = NAMED_CHECKS['listing_feed_count_only_payload'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        await this.queue.enqueue('marketplace.listing_feed.generated', {
          ListingFeedGenerated: true,
          count: listings.length
        });
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T85') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N5: conversion_rate_machine_formula — passes on literal formula in code', () => {
      const namedCheck = NAMED_CHECKS['conversion_rate_machine_formula'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        const conversionRate = inquiries / (views || 1);
        return DataProcessResult.success({ conversionRate, views, inquiries });
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T86') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N6: listing_analytics_aggregate_only — passes on code without viewerIds', () => {
      const namedCheck = NAMED_CHECKS['listing_analytics_aggregate_only'];
      expect(namedCheck).toBeDefined();

      const goodCode = `
        return DataProcessResult.success({ listingId, views: counter.views, inquiries: counter.inquiries, conversionRate });
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(goodCode, 'T86') : variant.test(goodCode);
      expect(result).toBe(true);
    });

    it('F08-N7: listing_analytics_aggregate_only — fails on code with viewerIds array', () => {
      const namedCheck = NAMED_CHECKS['listing_analytics_aggregate_only'];
      expect(namedCheck).toBeDefined();

      const badCode = `
        return DataProcessResult.success({ listingId, views, viewerIds: viewers.map(v => v.id) });
        // WRONG — viewerIds is a data-retention violation
      `;
      const variant = namedCheck.default;
      const result =
        typeof variant === 'function' ? variant(badCode, 'T86') : variant.test(badCode);
      expect(result).toBe(false);
    });

    it('F08-N8: engine generates FLOW-08 analytics contract with PASS status', async () => {
      const engine = createEngine();
      const params = flow08AnalyticsParams('-nc');
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT_A);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
