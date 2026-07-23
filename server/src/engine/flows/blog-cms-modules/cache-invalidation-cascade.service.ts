/**
 * T432 CacheInvalidationCascade [CACHE_INVALIDATION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentPublishedOrUpdated event (content state change or update)
 *
 * Execution order is MACHINE (CF-28-10):
 *   ORDER 1: Identify affected cache keys (page cache, list pages, search results)
 *   ORDER 2: Build invalidation manifest (CDN purge URLs, edge cache headers)
 *   ORDER 3: storeDocument(cache-invalidation-log)
 *   ORDER 4: enqueue(CacheInvalidated) — CDN provider purges edges
 *
 * Iron rules:
 *   IR-1: Cache keys include: page/{slug}, list/{category}, search/{query}
 *   IR-2: Invalidation triggered on PUBLISHED transitions only
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CACHE_INVALIDATION_LOG_INDEX = 'xiigen-cache-invalidation-log';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class CacheInvalidationCascadeService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T432',
        serviceName: 'CacheInvalidationCascadeService',
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
   * Invalidate CDN and edge caches when content is published or updated.
   */
  async invalidateCache(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const slug = event['slug'] as string;
    const category = event['category'] as string;
    const _previousState = event['previousState'] as string;
    const currentState = event['currentState'] as string;

    if (!contentId || !slug) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and slug are required');
    }

    // ── ORDER 1: Identify affected cache keys ────────────────────────────
    // Only invalidate if transitioning TO PUBLISHED
    if (currentState !== 'PUBLISHED') {
      return DataProcessResult.success({
        contentId,
        invalidated: false,
        reason: `Content transitioning to ${currentState}; cache invalidation skipped`,
      });
    }

    const cacheKeysToInvalidate: string[] = [
      `/blog/${slug}`, // Page cache
      `/api/page/${slug}`,
      `/api/posts`, // List pages (affected by new/updated post)
    ];

    if (category) {
      cacheKeysToInvalidate.push(`/api/posts/category/${category}`);
    }

    // ── ORDER 2: Build invalidation manifest ────────────────────────────
    const invalidationManifest: Record<string, unknown> = {
      contentId,
      tenantId,
      cacheKeysToInvalidate,
      timestamp: new Date().toISOString(),
    };

    // ── ORDER 3: storeDocument(cache-invalidation-log) ──────────────────
    await this.dbFabric.storeDocument(
      CACHE_INVALIDATION_LOG_INDEX,
      invalidationManifest,
      `${contentId}:cache-invalidation`,
    );

    // ── ORDER 4: enqueue(CacheInvalidated) ──────────────────────────────
    await this.queueFabric.enqueue('CacheInvalidated', {
      contentId,
      tenantId,
      cacheKeysToInvalidate,
      invalidatedAt: new Date().toISOString(),
      status: 'INVALIDATION_QUEUED',
    });

    return DataProcessResult.success({
      contentId,
      invalidated: true,
      cacheKeysCount: cacheKeysToInvalidate.length,
      invalidatedAt: new Date().toISOString(),
      status: 'INVALIDATION_QUEUED',
    });
  }
}
