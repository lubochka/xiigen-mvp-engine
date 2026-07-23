/**
 * T430 PublicPageRequestPipeline [PAGE_ASSEMBLY]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: PublicPageRequested event (reader requests published content)
 *
 * Execution order is MACHINE (CF-28-8):
 *   ORDER 1: Check cache (CDN/edge cache)
 *   ORDER 2: Fetch published content, theme, and layout from database
 *   ORDER 3: Assemble page (inject content into template)
 *   ORDER 4: enqueue(PageServed) — log for analytics
 *
 * Iron rules:
 *   IR-1: Cache hit short-circuits database fetch (performance)
 *   IR-2: Theme and layout injected dynamically per tenant
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: 404 handling for unpublished or archived content
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const PUBLISHED_CONTENT_INDEX = 'xiigen-published-content';
const PAGE_SERVED_INDEX = 'xiigen-page-served';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class PublicPageRequestPipelineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T430',
        serviceName: 'PublicPageRequestPipelineService',
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
   * Assemble and serve published content with caching and theme injection.
   */
  async servePage(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const slug = event['slug'] as string;
    const cacheKey = event['cacheKey'] as string;

    if (!slug) {
      return DataProcessResult.failure('INVALID_INPUT', 'slug is required');
    }

    // ── ORDER 1: Check cache ─────────────────────────────────────────────
    if (cacheKey) {
      const cachedResult = await this.dbFabric.searchDocuments('xiigen-cache', { cacheKey });
      if (cachedResult.isSuccess && (cachedResult.data ?? []).length > 0) {
        const cached = cachedResult.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          slug,
          cached: true,
          html: cached['html'],
          servedAt: new Date().toISOString(),
        });
      }
    }

    // ── ORDER 2: Fetch published content, theme, and layout ──────────────
    const contentResult = await this.dbFabric.searchDocuments(PUBLISHED_CONTENT_INDEX, { slug });
    if (!contentResult.isSuccess || (contentResult.data ?? []).length === 0) {
      return DataProcessResult.failure('NOT_FOUND', `Content with slug "${slug}" not found`);
    }

    const content = contentResult.data![0] as Record<string, unknown>;
    const theme = (content['theme'] as string) ?? 'default';
    const layout = (content['layout'] as string) ?? 'standard';

    // ── ORDER 3: Assemble page ───────────────────────────────────────────
    const html = this.assembleHtml(content, theme, layout);

    // ── ORDER 4: enqueue(PageServed) ────────────────────────────────────
    const serveRecord: Record<string, unknown> = {
      slug,
      tenantId,
      servedAt: new Date().toISOString(),
      userAgent: event['userAgent'] ?? 'unknown',
      ipAddress: event['ipAddress'] ?? 'unknown',
    };

    await this.dbFabric.storeDocument(PAGE_SERVED_INDEX, serveRecord, `${slug}:${Date.now()}`);

    await this.queueFabric.enqueue('PageServed', {
      slug,
      tenantId,
      theme,
      layout,
      servedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      slug,
      cached: false,
      html,
      theme,
      layout,
      servedAt: new Date().toISOString(),
    });
  }

  private assembleHtml(content: Record<string, unknown>, theme: string, layout: string): string {
    const title = content['title'] as string;
    const body = content['body'] as string;
    const excerpt = content['excerpt'] as string;

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <meta name="description" content="${excerpt}">
  <link rel="stylesheet" href="/themes/${theme}/style.css">
</head>
<body class="layout-${layout}">
  <header>Header</header>
  <main>
    <h1>${title}</h1>
    <article>${body}</article>
  </main>
  <footer>Footer</footer>
</body>
</html>
    `.trim();
  }
}
