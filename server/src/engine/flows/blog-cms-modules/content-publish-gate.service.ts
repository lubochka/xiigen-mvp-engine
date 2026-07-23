/**
 * T425 ContentPublishGate [VALIDATION_GATE]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: PublishContentRequested event (editor initiates publish)
 *
 * Execution order is MACHINE (CF-28-3):
 *   ORDER 1: Validate required fields (title, slug, excerpt, body, category)
 *   ORDER 2: Check moderation status (content must be approved if requires_review)
 *   ORDER 3: storeDocument(publish-validation-record) — append audit trail
 *   ORDER 4: enqueue(ContentValidated) or enqueue(ContentValidationFailed)
 *
 * Iron rules:
 *   IR-1: All required fields must be present and non-empty
 *   IR-2: SEO validation: slug must match pattern /^[a-z0-9\-]+$/
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const PUBLISH_AUDIT_INDEX = 'xiigen-publish-audit';

const REQUIRED_FIELDS = ['title', 'slug', 'excerpt', 'body', 'category'];
const SLUG_PATTERN = /^[a-z0-9-]+$/;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class ContentPublishGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T425',
        serviceName: 'ContentPublishGateService',
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
   * Gate content before publish with comprehensive validation.
   */
  async validateBeforePublish(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const contentId = event['contentId'] as string;
    const content = event['content'] as Record<string, unknown>;
    const requiresModeration = event['requiresModeration'] as boolean;
    const moderationStatus = event['moderationStatus'] as string;

    if (!contentId || !content) {
      return DataProcessResult.failure('INVALID_INPUT', 'contentId and content are required');
    }

    // ── ORDER 1: Validate required fields ─────────────────────────────────
    const missingFields = REQUIRED_FIELDS.filter((field) => !content[field]);
    if (missingFields.length > 0) {
      return DataProcessResult.failure(
        'REQUIRED_FIELDS_MISSING',
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    const slug = content['slug'] as string;
    if (!SLUG_PATTERN.test(slug)) {
      return DataProcessResult.failure(
        'INVALID_SLUG',
        'Slug must contain only lowercase letters, numbers, and hyphens',
      );
    }

    // ── ORDER 2: Check moderation status ───────────────────────────────────
    if (requiresModeration && moderationStatus !== 'APPROVED') {
      return DataProcessResult.failure(
        'MODERATION_REQUIRED',
        `Content requires moderation; current status: ${moderationStatus}`,
      );
    }

    // ── ORDER 3: storeDocument(publish-validation-record) ──────────────────
    const auditRecord: Record<string, unknown> = {
      contentId,
      tenantId,
      validatedAt: new Date().toISOString(),
      status: 'VALIDATED',
      requiredFieldsPresent: true,
      slugValid: true,
      moderationApproved: !requiresModeration || moderationStatus === 'APPROVED',
    };

    await this.dbFabric.storeDocument(PUBLISH_AUDIT_INDEX, auditRecord, `${contentId}:publish-audit`);

    // ── ORDER 4: enqueue(ContentValidated) ───────────────────────────────
    await this.queueFabric.enqueue('ContentValidated', {
      contentId,
      tenantId,
      validatedAt: new Date().toISOString(),
      status: 'VALIDATED',
    });

    return DataProcessResult.success({
      contentId,
      status: 'VALIDATED',
      validatedAt: new Date().toISOString(),
    });
  }
}
