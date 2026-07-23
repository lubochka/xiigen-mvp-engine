/**
 * T427 ContentArchiveUnpublishFlow [ARCHIVE_FLOW]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: ContentArchiveRequested event (editor unpublishes or archives content)
 *
 * Execution order is MACHINE (CF-28-5):
 *   ORDER 1: Fetch existing published content metadata
 *   ORDER 2: Generate redirect rules (old URL → 301 redirect or tombstone)
 *   ORDER 3: storeDocument(archived-content + redirect-rules)
 *   ORDER 4: enqueue(ContentArchived) — notify cache and index handlers
 *
 * Iron rules:
 *   IR-1: Archive preserves content for historical access/SEO
 *   IR-2: 301 redirect rules created for all external references
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const ARCHIVED_CONTENT_INDEX = 'xiigen-archived-content';
const REDIRECT_RULES_INDEX = 'xiigen-redirect-rules';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentArchiveUnpublishFlowService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T427',
        serviceName: 'ContentArchiveUnpublishFlowService',
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
   * Archive content and set up redirects for unpublished URLs.
   */
  async archiveAndRedirect(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const archiveReason = event['archiveReason'] as string;
    const redirectTarget = event['redirectTarget'] as string;

    if (!contentId || !archiveReason) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and archiveReason are required');
    }

    // ── ORDER 1: Fetch existing published content metadata ───────────────
    const contentSearchResult = await this.dbFabric.searchDocuments('xiigen-published-content', {
      contentId,
    });
    const publishedContent = contentSearchResult.data?.[0] as Record<string, unknown> | undefined;

    if (!publishedContent) {
      return DataProcessResult.failure('CONTENT_NOT_FOUND', 'Published content not found');
    }

    const slug = publishedContent['slug'] as string;
    const originalUrl = `/blog/${slug}`;

    // ── ORDER 2: Generate redirect rules ─────────────────────────────────
    const redirectTarget_final = redirectTarget ?? '/blog';
    const redirectRule: Record<string, unknown> = {
      fromUrl: originalUrl,
      toUrl: redirectTarget_final,
      statusCode: 301,
      createdAt: new Date().toISOString(),
    };

    // ── ORDER 3: storeDocument(archived-content + redirect-rules) ────────
    const archivedRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      originalContent: publishedContent,
      archivedReason: archiveReason,
      archivedAt: new Date().toISOString(),
      archivedBy: event['editor'] ?? 'system',
    };

    await this.dbFabric.storeDocument(ARCHIVED_CONTENT_INDEX, archivedRecord, `${contentId}:archived`);

    await this.dbFabric.storeDocument(REDIRECT_RULES_INDEX, redirectRule, `${contentId}:redirect`);

    // ── ORDER 4: enqueue(ContentArchived) ────────────────────────────────
    await this.queueFabric.enqueue('ContentArchived', {
      contentId,
      tenantId,
      originalUrl,
      redirectTarget: redirectTarget_final,
      archivedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      contentId,
      status: 'ARCHIVED',
      originalUrl,
      redirectTarget: redirectTarget_final,
      archivedAt: new Date().toISOString(),
    });
  }
}
