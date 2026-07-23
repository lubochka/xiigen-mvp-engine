/**
 * T437 TaxonomyTermPropagation [TAXONOMY_PROPAGATION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: TaxonomyTermUpdated event (category, tag, or other taxonomy term changes)
 *
 * Execution order is MACHINE (CF-28-15):
 *   ORDER 1: Query all content using old term identifier
 *   ORDER 2: Build propagation manifest (content IDs, update fields)
 *   ORDER 3: storeDocument(taxonomy-update-log)
 *   ORDER 4: enqueue(TaxonomyPropagated) — async bulk update handler
 *
 * Iron rules:
 *   IR-1: Propagation applies to: category, tags, custom taxonomies
 *   IR-2: Only affects PUBLISHED content (not DRAFT)
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const TAXONOMY_UPDATE_LOG_INDEX = 'xiigen-taxonomy-update-log';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class TaxonomyTermPropagationService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T437',
        serviceName: 'TaxonomyTermPropagationService',
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
   * Propagate taxonomy term changes to all content using the term.
   */
  async propagateTerm(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const taxonomyType = event['taxonomyType'] as string;
    const oldTermId = event['oldTermId'] as string;
    const newTermId = event['newTermId'] as string;
    const newTermName = event['newTermName'] as string;

    if (!taxonomyType || !oldTermId || !newTermId || !newTermName) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'taxonomyType, oldTermId, newTermId, and newTermName are required',
      );
    }

    // ── ORDER 1: Query all content using old term ───────────────────────
    const searchFilter: Record<string, unknown> = {
      tenantId,
      status: 'PUBLISHED',
    };

    // Add taxonomyType-specific search filter
    if (taxonomyType === 'category') {
      searchFilter['category'] = oldTermId;
    } else if (taxonomyType === 'tag') {
      searchFilter['tags'] = oldTermId;
    }

    const contentSearchResult = await this.dbFabric.searchDocuments(
      'xiigen-published-content',
      searchFilter,
    );
    const affectedContent = (contentSearchResult.data ?? []) as Record<string, unknown>[];

    if (affectedContent.length === 0) {
      return DataProcessResult.success({
        taxonomyType,
        oldTermId,
        newTermId,
        affectedContentCount: 0,
        status: 'NO_CONTENT_AFFECTED',
      });
    }

    // ── ORDER 2: Build propagation manifest ──────────────────────────────
    const contentIdsToPropate = affectedContent.map((c) => c['contentId'] as string);

    const propagationManifest: Record<string, unknown> = {
      tenantId,
      taxonomyType,
      oldTermId,
      newTermId,
      newTermName,
      affectedContentIds: contentIdsToPropate,
      affectedContentCount: contentIdsToPropate.length,
      timestamp: new Date().toISOString(),
    };

    // ── ORDER 3: storeDocument(taxonomy-update-log) ────────────────────
    await this.dbFabric.storeDocument(
      TAXONOMY_UPDATE_LOG_INDEX,
      propagationManifest,
      `${taxonomyType}:${oldTermId}:${newTermId}`,
    );

    // ── ORDER 4: enqueue(TaxonomyPropagated) ────────────────────────────
    await this.queueFabric.enqueue('TaxonomyPropagated', {
      tenantId,
      taxonomyType,
      oldTermId,
      newTermId,
      newTermName,
      affectedContentIds: contentIdsToPropate,
      affectedContentCount: contentIdsToPropate.length,
      propagatedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      taxonomyType,
      oldTermId,
      newTermId,
      newTermName,
      affectedContentCount: contentIdsToPropate.length,
      status: 'PROPAGATION_QUEUED',
      propagatedAt: new Date().toISOString(),
    });
  }
}
