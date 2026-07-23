/**
 * T431 SearchIndexCascade [INDEX_CASCADE]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentChangeDetected event (published content is created/updated/deleted)
 *
 * Execution order is MACHINE (CF-28-9):
 *   ORDER 1: Fetch content metadata and searchable fields
 *   ORDER 2: Build search index document (title, excerpt, category, tags, author)
 *   ORDER 3: storeDocument(search-index)
 *   ORDER 4: enqueue(IndexUpdated) — notify search consumers
 *
 * Iron rules:
 *   IR-1: Index includes: title, excerpt, body (for full-text), category, tags, author
 *   IR-2: Indexing triggered on PUBLISHED state only (not DRAFT)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SEARCH_INDEX = 'xiigen-search-index';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class SearchIndexCascadeService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T431',
        serviceName: 'SearchIndexCascadeService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Update search index when content changes (published only).
   */
  async updateSearchIndex(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const contentState = event['contentState'] as string;
    const contentData = event['contentData'] as Record<string, unknown>;

    if (!contentId || !contentState || !contentData) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'contentId, contentState, and contentData are required',
      );
    }

    // ── ORDER 1: Fetch content metadata ──────────────────────────────────
    // If contentState is not PUBLISHED, skip indexing
    if (contentState !== 'PUBLISHED') {
      return DataProcessResult.success({
        contentId,
        indexed: false,
        reason: `Content in ${contentState} state; only PUBLISHED content is indexed`,
      });
    }

    // ── ORDER 2: Build search index document ────────────────────────────
    const indexDoc: Record<string, unknown> = {
      contentId,
      tenantId,
      title: contentData['title'] as string,
      excerpt: contentData['excerpt'] as string,
      body: contentData['body'] as string,
      category: contentData['category'] as string,
      tags: contentData['tags'] ?? [],
      author: contentData['author'] as string,
      slug: contentData['slug'] as string,
      indexedAt: new Date().toISOString(),
    };

    // ── ORDER 3: storeDocument(search-index) ────────────────────────────
    await this.dbFabric.storeDocument(SEARCH_INDEX, indexDoc, contentId);

    // ── ORDER 4: enqueue(IndexUpdated) ──────────────────────────────────
    await this.queueFabric.enqueue('IndexUpdated', {
      contentId,
      tenantId,
      indexedAt: new Date().toISOString(),
      status: 'INDEXED',
    });

    return DataProcessResult.success({
      contentId,
      indexed: true,
      indexedAt: new Date().toISOString(),
      status: 'INDEXED',
    });
  }
}
