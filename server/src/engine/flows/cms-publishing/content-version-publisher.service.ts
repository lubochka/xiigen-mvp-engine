/**
 * T633 ContentVersionPublisher [VALIDATION]
 * FLOW-22: CMS Publishing
 *
 * Entry: ContentPublishRequested event
 *
 * Execution order is MACHINE (CF-22-1):
 *   ORDER 1: BOLA check — content.tenantId === ALS.tenantId
 *   ORDER 2: FLOW_IMMUTABLE guard — status !== PUBLISHED
 *   ORDER 3: OCC DRAFT→PUBLISHED via storeDocumentWithOCC with versionPin
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(ContentPublished)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const CONTENT_INDEX = 'xiigen-content';
const CONTENT_AUDIT_INDEX = 'xiigen-content-audit';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentVersionPublisherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T633',
        serviceName: 'ContentVersionPublisherService',
        flowId: 'FLOW-22',
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

  async publishContent(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;

    if (!contentId) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId is required');
    }

    // ── ORDER 1: BOLA check — CF-22-1 ───────────────────────────────────────
    const contentResult = await this.dbFabric.searchDocuments(CONTENT_INDEX, { contentId });
    if (!contentResult.isSuccess || (contentResult.data ?? []).length === 0) {
      return DataProcessResult.failure('CONTENT_NOT_FOUND', `Content not found: ${contentId}`);
    }

    const content = contentResult.data![0] as Record<string, unknown>;
    const contentTenantId = content['tenantId'] as string;

    if (contentTenantId !== tenantId) {
      return DataProcessResult.failure('BOLA_VIOLATION', 'Tenant does not own this content');
    }

    // ── ORDER 2: FLOW_IMMUTABLE guard — CF-22-1 ─────────────────────────────
    const status = content['status'] as string;
    if (status === 'PUBLISHED') {
      await this.queueFabric.enqueue('ContentImmutableRejected', {
        tenantId,
        contentId,
        reason: 'ALREADY_PUBLISHED',
      });
      return DataProcessResult.failure('CONTENT_IMMUTABLE', 'Published content cannot be modified');
    }

    // ── ORDER 3: OCC DRAFT→PUBLISHED — CF-22-1 ─────────────────────────────
    const publishedAt = new Date().toISOString();
    const versionPin = content['_version'] as string | undefined;
    const occOpts = versionPin
      ? {
          ifSeqNo: parseInt(versionPin.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(versionPin.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };

    const writeResult = await this.dbFabric.storeDocumentWithOCC(
      CONTENT_INDEX,
      {
        ...content,
        status: 'PUBLISHED',
        publishedAt,
        immutabilityLocked: true,
        knowledgeScope: 'PRIVATE',
      },
      contentId,
      occOpts,
    );

    if (!writeResult.isSuccess) {
      return DataProcessResult.failure(
        'PUBLISH_CONFLICT',
        `OCC conflict: ${writeResult.errorMessage}`,
      );
    }

    // ── ORDER 4: Audit write — DNA-8 ────────────────────────────────────────
    await this.dbFabric.storeDocument(CONTENT_AUDIT_INDEX, {
      tenantId,
      contentId,
      action: 'CONTENT_PUBLISHED',
      publishedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit ContentPublished ──────────────────────────────────────
    await this.queueFabric.enqueue('ContentPublished', {
      tenantId,
      contentId,
      publishedAt,
    });

    return DataProcessResult.success({ tenantId, contentId, status: 'PUBLISHED', publishedAt });
  }
}
