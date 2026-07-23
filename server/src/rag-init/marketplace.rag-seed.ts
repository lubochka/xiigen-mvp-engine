/**
 * Flow08MarketplaceRagSeed — RAG patterns for FLOW-08 Marketplace Listings & Catalog.
 *
 * Key patterns:
 *   - audit-outbox-first (T83 — audit write before ALL business logic)
 *   - moderation-to-draft-not-failure (T83 — DRAFT on reject, not failure())
 *   - zero-price-valid (T83 — price=0 is free listing)
 *   - cross-flow-factory-dependency (T84 — F227 from FLOW-07)
 *   - count-only-feed-payload (T85 — { count: N } only)
 *   - machine-formula-not-freedom-config (T86 — conversionRate literal code)
 *
 * DNA-3: All methods return DataProcessResult.
 * Rule 1: No SDK imports.
 */
import { Injectable } from '@nestjs/common';
import { FlowRagSeedBase } from './flow-rag-seed.base';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class Flow08MarketplaceRagSeed extends FlowRagSeedBase {
  readonly domainId = 'flow-08-marketplace-listings-catalog';

  async indexPatterns(): Promise<DataProcessResult<number>> {
    const patterns = [
      // ── audit-outbox-first (T83 — stricter than DNA-8) ───────────────────────

      {
        patternId: 'audit-outbox-first',
        name: 'AUDIT_OUTBOX_FIRST',
        namespace: 'marketplace',
        pattern: 'audit-write-before-all-business-logic',
        title: 'Audit Outbox First Pattern (T83 — stricter than DNA-8)',
        version: '1.0.0',
        description:
          'T83 ListingPublisher has a stricter order than DNA-8: ' +
          'audit write (F251) must happen BEFORE moderation, price check, everything. ' +
          'DNA-8 says storeDocument before enqueue. T83 says audit before any business logic at all. ' +
          'Order: F251 audit → F249 moderation → F247 price → F244 persist → storeDocument → enqueue. ' +
          'Moderation before audit = BUILD_FAILURE.',
        useCase:
          'Listing publication pipeline where audit trail is the absolute first step regardless of other checks',
        dnaCompliance:
          'DNA-3 (DataProcessResult) — DNA-8 (storeDocument before enqueue, but audit is even earlier)',
        codeExample:
          '// T83 STRICT execution order\n' +
          'const audit = await this.auditService.writeAudit({ listingId, action: "publish_attempted" });\n' +
          'if (!audit.isSuccess) return audit;\n' +
          'const modResult = await this.moderationService.check(listingData);\n' +
          'if (modResult.data.decision === "REJECTED") return DataProcessResult.success({ status: "DRAFT" });\n' +
          'const priceResult = await this.priceValidator.validate(listingData.price);\n' +
          'if (!priceResult.isSuccess) return priceResult;\n' +
          'const persisted = await this.listingService.persist(listingData);\n' +
          'await this.db.storeDocument("listings", persisted.data, listingId);\n' +
          'await this.queue.enqueue("listing.published", { listingId });',
        negativeExample:
          'const modResult = await this.moderationService.check(listingData);\n' +
          'const audit = await this.auditService.writeAudit(...);\n' +
          '// WRONG — moderation before audit',
        negativeReason:
          'Audit must be first. Even if moderation rejects, the audit exists. Ordering violation = BUILD_FAILURE.',
        factories: [
          {
            factoryId: 'F251',
            interfaceName: 'IListingAuditService',
            role: 'Audit write — absolutely first step',
          },
          {
            factoryId: 'F249',
            interfaceName: 'IModerationService',
            role: 'Content moderation — second step',
          },
          {
            factoryId: 'F247',
            interfaceName: 'IPriceValidationService',
            role: 'Price check — third step',
          },
          {
            factoryId: 'F244',
            interfaceName: 'IListingService',
            role: 'Listing persistence — fourth step',
          },
        ],
        taskTypesTargeted: ['T83'],
        antiPatterns: [
          'Moderation before audit write',
          'Price check before audit write',
          'Persist before audit write',
          'Any business logic before F251 audit',
        ],
        tags: ['T83', 'audit-first', 'strict-ordering', 'F251', 'CF-813'],
      },

      // ── moderation-to-draft-not-failure (T83) ────────────────────────────────

      {
        patternId: 'moderation-to-draft-not-failure',
        name: 'MODERATION_TO_DRAFT_NOT_FAILURE',
        namespace: 'marketplace',
        pattern: 'moderation-draft-on-reject',
        title: 'Moderation Rejection → DRAFT (Not Failure) (T83)',
        version: '1.0.0',
        description:
          'When content moderation rejects a listing, the result is DataProcessResult.success({ status: "DRAFT" }). ' +
          'NOT DataProcessResult.failure(). NOT deletion. ' +
          'Seller corrects and resubmits. This is a valid business outcome, not an error condition. ' +
          'Generated code that returns failure() on moderation rejection = score-0.',
        useCase:
          'Listing moderation where rejection is a business state transition to DRAFT, not an error',
        dnaCompliance:
          'DNA-3 (DataProcessResult) — failure() reserved for system errors, not business outcomes',
        codeExample:
          'const modResult = await this.moderationService.check(listingData);\n' +
          'if (modResult.data.decision === "REJECTED") {\n' +
          '  return DataProcessResult.success({ status: "DRAFT", moderationReason: modResult.data.reason });\n' +
          '}',
        negativeExample:
          'if (modResult.data.decision === "REJECTED") {\n' +
          '  return DataProcessResult.failure("MODERATION_REJECTED", "Content rejected by moderation");\n' +
          '}',
        negativeReason:
          'Moderation rejection is a business outcome (DRAFT state), not a system failure. Use success({ status: "DRAFT" }).',
        factories: [
          {
            factoryId: 'F249',
            interfaceName: 'IModerationService',
            role: 'Content moderation with PASS/REJECT/UNCERTAIN outcome',
          },
        ],
        taskTypesTargeted: ['T83', 'T87'],
        antiPatterns: [
          'DataProcessResult.failure() on moderation rejection',
          'Auto-deletion on moderation rejection',
          'HTTP 4xx on moderation rejection',
        ],
        tags: ['T83', 'T87', 'moderation', 'draft', 'CF-814'],
      },

      // ── zero-price-valid (T83 / T88) ─────────────────────────────────────────

      {
        patternId: 'zero-price-valid',
        name: 'ZERO_PRICE_VALID',
        namespace: 'marketplace',
        pattern: 'free-listing-allowed',
        title: 'Zero Price is a Valid Free Listing (T83 / T88)',
        version: '1.0.0',
        description:
          'price < 0 → reject. price = 0 → accept (free listing). ' +
          'The check is price < 0, NOT price <= 0. ' +
          'Generated code that rejects zero price = score-0.',
        useCase:
          'Price validation for marketplace listings where price=0 is a free listing (valid)',
        dnaCompliance: 'DNA-3 (DataProcessResult)',
        codeExample:
          'if (listing.price < 0) {\n' +
          '  return DataProcessResult.failure("INVALID_PRICE", "Price cannot be negative");\n' +
          '}\n' +
          '// price === 0 is fine — free listing',
        negativeExample:
          'if (listing.price <= 0) {\n' +
          '  return DataProcessResult.failure("INVALID_PRICE", "Price must be positive"); // WRONG\n' +
          '}',
        negativeReason: 'price=0 is a valid free listing. Only negative prices are invalid.',
        factories: [
          {
            factoryId: 'F247',
            interfaceName: 'IPriceValidationService',
            role: 'Price range validation',
          },
        ],
        taskTypesTargeted: ['T83', 'T88'],
        antiPatterns: [
          'Rejecting price === 0',
          'Requiring price > 0',
          'Using <= 0 check instead of < 0',
        ],
        tags: ['T83', 'T88', 'price', 'free-listing', 'zero-price', 'CF-815'],
      },

      // ── cross-flow-factory-dependency (T84) ──────────────────────────────────

      {
        patternId: 'cross-flow-factory-dependency',
        name: 'CROSS_FLOW_FACTORY_DEPENDENCY',
        namespace: 'marketplace',
        pattern: 'cross-flow-factory-injection',
        title: 'Cross-Flow Factory Dependency (T84 → FLOW-07 F227)',
        version: '1.0.0',
        description:
          'T84 CatalogIndexer depends on F227 ISearchIndexService registered by FLOW-07. ' +
          'Phase A gate: if FLOW-07 is not yet ACTIVE, this flow self-registers F227. ' +
          'T84 EngineContract must carry crossFlowFactoryDependencies field.',
        useCase: 'Catalog indexer that uses a search service registered by a parallel flow',
        dnaCompliance: 'DNA-3 (DataProcessResult) — Rule 1 (fabric-first, no SDK imports)',
        codeExample:
          '@Inject("F227") private readonly searchIndex: ISearchIndexService,\n\n' +
          '// Phase A gate check:\n' +
          '// if FLOW-07 not active → self-register F227 before use',
        negativeExample:
          'import { ElasticsearchService } from "@nestjs/elasticsearch"; // WRONG — violates Rule 1',
        negativeReason:
          'All infrastructure access through fabric interfaces. F227 is the registered search service.',
        factories: [
          {
            factoryId: 'F227',
            interfaceName: 'ISearchIndexService',
            role: 'Search catalog indexing — registered by FLOW-07',
          },
        ],
        taskTypesTargeted: ['T84'],
        antiPatterns: [
          'Direct ES client import',
          'Skipping F227 gate check when FLOW-07 not active',
          'Hardcoding ES index name',
        ],
        tags: ['T84', 'F227', 'cross-flow', 'factory-dependency', 'CF-816'],
      },

      // ── count-only-feed-payload (T85) ─────────────────────────────────────────

      {
        patternId: 'count-only-feed-payload',
        name: 'COUNT_ONLY_FEED_PAYLOAD',
        namespace: 'marketplace',
        pattern: 'count-only-payload',
        title: 'Count-Only Feed Payload (T85)',
        version: '1.0.0',
        description:
          'ListingFeedGenerated payload must be { count: N } ONLY. ' +
          'No listing IDs. Not even reference IDs. ' +
          'This is the PII safety boundary for bulk feed events.',
        useCase: 'Feed generation event where the payload carries only a count for PII safety',
        dnaCompliance: 'DNA-3 (DataProcessResult)',
        codeExample:
          'await this.queue.enqueue("listing.feed.generated", { count: listings.length });',
        negativeExample:
          'await this.queue.enqueue("listing.feed.generated", { count: listings.length, ids: listings.map(l => l.id) });\n' +
          '// WRONG — listingIds in payload',
        negativeReason:
          '{ count: N } only. Adding IDs to the payload violates the count-only PII boundary.',
        factories: [],
        taskTypesTargeted: ['T85'],
        antiPatterns: [
          'listingId in ListingFeedGenerated payload',
          'sellerId in ListingFeedGenerated payload',
          'Any reference IDs in count-only feed event',
        ],
        tags: ['T85', 'count-only', 'feed', 'PII-safety', 'CF-817'],
      },

      // ── machine-formula-not-freedom-config (T86) ──────────────────────────────

      {
        patternId: 'machine-formula-not-freedom-config',
        name: 'MACHINE_FORMULA_NOT_FREEDOM_CONFIG',
        namespace: 'marketplace',
        pattern: 'machine-formula-literal-code',
        title: 'Machine Formula in Code (T86 — conversionRate)',
        version: '1.0.0',
        description:
          'T86 conversionRate = inquiries / (views || 1) is a MACHINE formula, not a FREEDOM config value. ' +
          'It must appear as a literal computation in code. ' +
          'config.get("conversion_formula") = score-0. ' +
          'This is the first MACHINE formula in any flow (FLOW-04 T65 had a MACHINE constant).',
        useCase:
          'Analytics aggregation where the conversion formula is a fixed algorithmic computation',
        dnaCompliance:
          'DNA-14 (Config Over Code) — the formula IS fixed logic, so it belongs in MACHINE code',
        codeExample:
          'const conversionRate = inquiries / (views || 1);\n' +
          'return DataProcessResult.success({ conversionRate, views, inquiries });',
        negativeExample:
          'const formulaStr = await this.configService.get("conversion_formula"); // WRONG — not FREEDOM\n' +
          'const conversionRate = eval(formulaStr);',
        negativeReason:
          'conversionRate formula is fixed logic (MACHINE), not a business parameter (FREEDOM). ' +
          'Rule 14: Config Over Code applies to business parameters — not algorithmic formulas.',
        factories: [],
        taskTypesTargeted: ['T86'],
        antiPatterns: [
          'config.get("conversion_formula")',
          'Dynamic formula evaluation',
          'FREEDOM config for fixed algorithmic expression',
        ],
        tags: ['T86', 'machine-formula', 'conversionRate', 'analytics', 'CF-818'],
      },
    ];

    let count = 0;
    for (const pattern of patterns) {
      const result = await this.upsertPattern(pattern);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexBfaRules(): Promise<DataProcessResult<number>> {
    const rules = [
      {
        patternId: 'bfa-cf-813-audit-first',
        ruleId: 'CF-813',
        flowId: 'FLOW-08',
        title: 'Audit write must be the absolute first operation in T83',
        description:
          'F251 audit write precedes moderation, price check, everything. Moderation before audit = BUILD_FAILURE.',
        violationClass: 'BUILD_FAILURE',
        tags: ['CF-813', 'FLOW-08', 'audit-first', 'T83'],
      },
      {
        patternId: 'bfa-cf-814-moderation-to-draft',
        ruleId: 'CF-814',
        flowId: 'FLOW-08',
        title: 'Moderation rejection must produce DRAFT state, not failure',
        description: 'DataProcessResult.failure() on moderation rejection = score-0.',
        violationClass: 'SCORE_ZERO',
        tags: ['CF-814', 'FLOW-08', 'moderation', 'draft', 'T83'],
      },
      {
        patternId: 'bfa-cf-818-machine-formula',
        ruleId: 'CF-818',
        flowId: 'FLOW-08',
        title: 'conversionRate must be a literal MACHINE formula in T86',
        description:
          'conversionRate = inquiries / (views || 1) — must appear as literal code, not FREEDOM config lookup.',
        violationClass: 'SCORE_ZERO',
        tags: ['CF-818', 'FLOW-08', 'machine-formula', 'T86'],
      },
    ];

    let count = 0;
    for (const rule of rules) {
      const result = await this.upsertPattern(rule);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }

  async indexDesignRecords(): Promise<DataProcessResult<number>> {
    const records = [
      {
        patternId: 'dd-flow08-001-strict-execution-order',
        ddRef: 'DD-F08-001',
        flowId: 'FLOW-08',
        title: 'T83 Strict Execution Order',
        description:
          'T83 ListingPublisher follows a strict 6-step order: ' +
          '(1) F251 audit → (2) F249 moderation → (3) F247 price → ' +
          '(4) F244 persist → (5) storeDocument → (6) enqueue. ' +
          'Each step is a gate; failure at any step (except moderation REJECTED → DRAFT) halts.',
        tags: ['FLOW-08', 'T83', 'execution-order', 'audit-first'],
      },
    ];

    let count = 0;
    for (const record of records) {
      const result = await this.upsertPattern(record);
      if (result.isSuccess) count++;
    }
    return DataProcessResult.success(count);
  }
}
