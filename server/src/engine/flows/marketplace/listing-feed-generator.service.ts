// T85 ListingFeedGenerator [DATA_PIPELINE]
//
// Generates listing feed events for buyers.
// ListingFeedGenerated payload: { count: N } ONLY — no listing IDs, no reference IDs.
// count-only is the PII safety boundary (IR-1).
//
// Iron rules:
//   IR-1: ListingFeedGenerated payload = { count: N } only — no IDs of any kind
//   IR-2: storeDocument BEFORE enqueue (DNA-8)
//
// Factories:
//   F244: IDatabaseService  — feed record storage (DATABASE FABRIC)
//   F246: IFeedService — feed generation (QUEUE FABRIC)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface ListingFeedRequest {
  tenantId: string;
  buyerId: string;
  categoryId?: string;
  maxCount?: number;
}

export interface ListingFeedResult {
  tenantId: string;
  count: number;
  generatedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, listing feeds through fabric interfaces
 * @className ListingFeedGeneratorService
 */
@Injectable()
export class ListingFeedGeneratorService extends MicroserviceBase {
  constructor(
    /** F244: IDatabaseService — feed record storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F246: IFeedService — feed queue (QUEUE FABRIC) */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T85',
        serviceName: 'ListingFeedGeneratorService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async generateFeed(request: ListingFeedRequest): Promise<DataProcessResult<ListingFeedResult>> {
    const generatedAt = new Date().toISOString();

    // Query available listings for this tenant
    const listingsResult = await this.dbFabric.searchDocuments('listings', {
      tenantId: request.tenantId,
      status: 'PUBLISHED',
      ...(request.categoryId ? { categoryId: request.categoryId } : {}),
    });

    const listings = (listingsResult.isSuccess ? listingsResult.data : []) as unknown[];
    const maxCount = request.maxCount ?? 20;
    const count = Math.min((listings as unknown[]).length, maxCount);

    // IR-2: storeDocument BEFORE enqueue (DNA-8)
    const feedRecordId = `feed-${request.tenantId}-${Date.now()}`;
    const storeResult = await this.dbFabric.storeDocument(
      'listing-feeds',
      {
        feedId: feedRecordId,
        tenantId: request.tenantId,
        buyerId: request.buyerId,
        count,
        generatedAt,
      },
      feedRecordId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store feed record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // IR-1: ListingFeedGenerated payload = { count: N } only — no IDs of any kind
    await this.queueFabric.enqueue('marketplace.listing_feed.generated', {
      tenantId: request.tenantId,
      count,
      generatedAt,
      // NO listingId, NO ids, NO referenceIds — PII boundary
    });

    return DataProcessResult.success({
      tenantId: request.tenantId,
      count,
      generatedAt,
    });
  }
}
