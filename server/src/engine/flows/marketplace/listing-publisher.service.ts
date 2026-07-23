// T83 ListingPublisher [SUBMISSION_GATEWAY]
//
// Publishes marketplace listings. Execution order (STRICT — T83 IR-1):
//   1. F251 audit write FIRST (stricter than DNA-8 — before moderation, price, everything)
//   2. F249 moderation check
//   3. F247 price validation
//   4. F244 persist listing
//   5. storeDocument() (DNA-8)
//   6. enqueue ListingPublished (DNA-8 — after store)
//
// Moderation rejection → DataProcessResult.success({ status: "DRAFT" }) — never failure().
// price < 0 → reject; price = 0 → accept (free listing).
// Moderation before audit = BUILD_FAILURE.
//
// Factories:
//   F244: IDatabaseService  — listing record storage (DATABASE FABRIC)
//   F247: IPriceValidatorService — price validation (INLINE, FREEDOM config threshold)
//   F249: IModerationService — moderation check (AI_ENGINE FABRIC)
//   F251: IListingAuditService — audit outbox writer (DATABASE FABRIC)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IPriceValidatorService {
  validate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IModerationService {
  check(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IAuditService {
  writeAudit(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; errorCode?: string; errorMessage?: string }>;
}

export interface ListingPublishRequest {
  listingId: string;
  tenantId: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
  sellerId: string;
}

export interface ListingPublishResult {
  listingId: string;
  tenantId: string;
  status: 'PUBLISHED' | 'DRAFT';
  moderationReason?: string;
  auditId: string;
  publishedAt?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, listing publication through fabric interfaces
 * @className ListingPublisherService
 */
@Injectable()
export class ListingPublisherService extends MicroserviceBase {
  constructor(
    /** F244: IDatabaseService — listing record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F247: IPriceValidatorService — price validation (INLINE) */
    private readonly priceValidator: IPriceValidatorService,
    /** F249: IModerationService — moderation check (AI_ENGINE FABRIC) */
    private readonly moderationService: IModerationService,
    /** F251: IListingAuditService — audit outbox writer (DATABASE FABRIC) */
    private readonly auditService: IAuditService,
    /** QUEUE FABRIC — ListingPublished / ListingDrafted event emission */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T83',
        serviceName: 'ListingPublisherService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async publishListing(
    request: ListingPublishRequest,
  ): Promise<DataProcessResult<ListingPublishResult>> {
    // ── STEP 1: F251 audit write FIRST (IR-1 — stricter than DNA-8) ──────────────
    const auditId = `audit-${request.listingId}-${Date.now()}`;
    const auditResult = await this.auditService.writeAudit({
      auditId,
      listingId: request.listingId,
      tenantId: request.tenantId,
      action: 'publish_attempted',
      createdAt: new Date().toISOString(),
    });
    if (!auditResult.isSuccess) {
      return DataProcessResult.failure(
        'AUDIT_WRITE_FAILED',
        `Audit write failed: ${auditResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 2: F249 moderation check ───────────────────────────────────────────
    const moderationResult = await this.moderationService.check({
      listingId: request.listingId,
      title: request.title,
      description: request.description,
      tenantId: request.tenantId,
    });

    if (moderationResult.isSuccess && moderationResult.data?.['decision'] === 'REJECTED') {
      // IR-2: moderation failure → success({ status: 'DRAFT' }) — never failure()
      await this.dbFabric.storeDocument(
        'listings',
        {
          ...request,
          status: 'DRAFT',
          moderationReason: moderationResult.data?.['reason'] ?? 'CONTENT_POLICY',
          draftedAt: new Date().toISOString(),
        },
        request.listingId,
      );
      await this.queueFabric.enqueue('marketplace.listing.drafted', {
        listingId: request.listingId,
        tenantId: request.tenantId,
        status: 'DRAFT',
        moderationReason: moderationResult.data?.['reason'] ?? 'CONTENT_POLICY',
      });
      return DataProcessResult.success({
        listingId: request.listingId,
        tenantId: request.tenantId,
        status: 'DRAFT',
        moderationReason: moderationResult.data?.['reason'] as string | undefined,
        auditId,
      });
    }

    // ── STEP 3: F247 price validation ────────────────────────────────────────────
    if (request.price < 0) {
      // IR-3: price < 0 → reject; price = 0 → accept (free listing)
      return DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
    }
    const priceResult = await this.priceValidator.validate({
      price: request.price,
      tenantId: request.tenantId,
    });
    if (!priceResult.isSuccess) {
      return DataProcessResult.failure(
        'PRICE_VALIDATION_FAILED',
        priceResult.errorMessage ?? 'Price validation failed',
      );
    }

    // ── STEP 4 + 5: persist listing + storeDocument (DNA-8) ─────────────────────
    const publishedAt = new Date().toISOString();
    const storeResult = await this.dbFabric.storeDocument(
      'listings',
      { ...request, status: 'PUBLISHED', publishedAt },
      request.listingId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store listing: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 6: enqueue ListingPublished (DNA-8 — after store) ──────────────────
    await this.queueFabric.enqueue('marketplace.listing.published', {
      listingId: request.listingId,
      tenantId: request.tenantId,
      status: 'PUBLISHED',
      price: request.price,
      publishedAt,
    });

    return DataProcessResult.success({
      listingId: request.listingId,
      tenantId: request.tenantId,
      status: 'PUBLISHED',
      auditId,
      publishedAt,
    });
  }
}
