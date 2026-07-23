// T84 CatalogIndexer [DATA_PIPELINE]
//
// Indexes marketplace listings into the search catalog.
// Cross-flow factory dependency: F227 ISearchIndexService (registered by FLOW-07,
//   self-registered by FLOW-08 Phase A when FLOW-07 not ACTIVE).
//
// Iron rules:
//   IR-1: inject F227 ISearchIndexService — never instantiate directly
//   IR-2: version-keyed idempotency — same listingId+version always produces same doc
//   IR-3: storeDocument BEFORE enqueue (DNA-8)
//
// Factories:
//   F244: IDatabaseService — listing record storage (DATABASE FABRIC)
//   F227: ISearchIndexService — catalog search index (cross-flow, FLOW-07 registered)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface ISearchIndexService {
  index(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; errorCode?: string; errorMessage?: string }>;
}

export interface CatalogIndexRequest {
  listingId: string;
  tenantId: string;
  title: string;
  description: string;
  price: number;
  categoryId: string;
  sellerId: string;
  indexVersion: string;
}

export interface CatalogIndexResult {
  listingId: string;
  tenantId: string;
  indexVersion: string;
  indexedAt: string;
  indexDocId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, catalog indexing through fabric interfaces
 * @className CatalogIndexerService
 */
@Injectable()
export class CatalogIndexerService extends MicroserviceBase {
  constructor(
    /** F244: IDatabaseService — catalog-index storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F227: ISearchIndexService — cross-flow search index (FLOW-07/self-registered) */
    private readonly searchIndex: ISearchIndexService,
    /** QUEUE FABRIC — CatalogIndexed event emission */

    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T84',
        serviceName: 'CatalogIndexerService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async indexListing(request: CatalogIndexRequest): Promise<DataProcessResult<CatalogIndexResult>> {
    // IR-2: version-keyed idempotency — deterministic doc ID
    const indexDocId = `idx-${request.listingId}-${request.indexVersion}`;
    const indexedAt = new Date().toISOString();

    // Index into search catalog via F227 ISearchIndexService
    const searchResult = await this.searchIndex.index({
      docId: indexDocId,
      listingId: request.listingId,
      tenantId: request.tenantId,
      title: request.title,
      description: request.description,
      price: request.price,
      categoryId: request.categoryId,
      indexVersion: request.indexVersion,
    });
    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        'INDEX_FAILED',
        `Search indexing failed: ${searchResult.errorMessage ?? 'unknown'}`,
      );
    }

    // IR-3: storeDocument BEFORE enqueue (DNA-8)
    const storeResult = await this.dbFabric.storeDocument(
      'catalog-index',
      {
        listingId: request.listingId,
        tenantId: request.tenantId,
        indexVersion: request.indexVersion,
        indexDocId,
        indexedAt,
      },
      indexDocId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store catalog index record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queueFabric.enqueue('marketplace.catalog.indexed', {
      listingId: request.listingId,
      tenantId: request.tenantId,
      indexVersion: request.indexVersion,
      indexDocId,
      indexedAt,
    });

    return DataProcessResult.success({
      listingId: request.listingId,
      tenantId: request.tenantId,
      indexVersion: request.indexVersion,
      indexedAt,
      indexDocId,
    });
  }
}
