/**
 * T439 SitemapRebuildTrigger [SITEMAP_GENERATION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentPublishStateChanged event (content published or unpublished)
 *
 * Execution order is MACHINE (CF-28-17):
 *   ORDER 1: Detect if state change affects sitemap (PUBLISHED/ARCHIVED only)
 *   ORDER 2: Query all published content for sitemap manifest
 *   ORDER 3: storeDocument(sitemap-manifest)
 *   ORDER 4: enqueue(SitemapRebuildRequested) — async sitemap generator
 *
 * Iron rules:
 *   IR-1: Sitemap includes only PUBLISHED content with lastmod timestamps
 *   IR-2: Sitemap split into chunks if >50k URLs (per Google spec)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const SITEMAP_MANIFEST_INDEX = 'xiigen-sitemap-manifest';
const URLS_PER_SITEMAP = 50000;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class SitemapRebuildTriggerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T439',
        serviceName: 'SitemapRebuildTriggerService',
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
   * Trigger sitemap rebuild when published content changes.
   */
  async triggerRebuild(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const previousState = event['previousState'] as string;
    const currentState = event['currentState'] as string;

    if (!contentId || !previousState || !currentState) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'contentId, previousState, and currentState are required',
      );
    }

    // ── ORDER 1: Detect if state change affects sitemap ──────────────────
    const affectsSitemap =
      (previousState === 'PUBLISHED' && currentState === 'ARCHIVED') ||
      (previousState !== 'PUBLISHED' && currentState === 'PUBLISHED');

    if (!affectsSitemap) {
      return DataProcessResult.success({
        contentId,
        rebuildTriggered: false,
        reason: `State change from ${previousState} to ${currentState} does not affect sitemap`,
      });
    }

    // ── ORDER 2: Query all published content for sitemap ─────────────────
    const publishedSearchResult = await this.dbFabric.searchDocuments('xiigen-published-content', {
      tenantId,
      status: 'PUBLISHED',
    });

    const publishedContent = (publishedSearchResult.data ?? []) as Record<string, unknown>[];

    // Build sitemap URLs
    const sitemapUrls = publishedContent.map((c) => ({
      url: `/blog/${c['slug'] as string}`,
      lastmod: (c['updatedAt'] as string) || new Date().toISOString(),
      priority: this.calculatePriority(c),
    }));

    // ── ORDER 3: storeDocument(sitemap-manifest) ───────────────────────
    const sitemapChunks = this.chunkSitemap(sitemapUrls);
    const manifestRecord: Record<string, unknown> = {
      tenantId,
      totalUrls: sitemapUrls.length,
      sitemapChunks: sitemapChunks.length,
      rebuiltAt: new Date().toISOString(),
      urls: sitemapUrls,
    };

    await this.dbFabric.storeDocument(SITEMAP_MANIFEST_INDEX, manifestRecord, `${tenantId}:sitemap`);

    // ── ORDER 4: enqueue(SitemapRebuildRequested) ───────────────────────
    await this.queueFabric.enqueue('SitemapRebuildRequested', {
      tenantId,
      totalUrls: sitemapUrls.length,
      sitemapChunks: sitemapChunks.length,
      urls: sitemapUrls,
      rebuiltAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      rebuildTriggered: true,
      totalUrls: sitemapUrls.length,
      sitemapChunks: sitemapChunks.length,
      status: 'REBUILD_QUEUED',
      rebuiltAt: new Date().toISOString(),
    });
  }

  private calculatePriority(content: Record<string, unknown>): number {
    // Higher priority for recent, popular content
    const updatedAt = new Date(content['updatedAt'] as string);
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate < 7) return 0.8;
    if (daysSinceUpdate < 30) return 0.6;
    return 0.4;
  }

  private chunkSitemap(urls: Record<string, unknown>[]): Record<string, unknown>[][] {
    const chunks: Record<string, unknown>[][] = [];
    for (let i = 0; i < urls.length; i += URLS_PER_SITEMAP) {
      chunks.push(urls.slice(i, i + URLS_PER_SITEMAP));
    }
    return chunks;
  }
}
