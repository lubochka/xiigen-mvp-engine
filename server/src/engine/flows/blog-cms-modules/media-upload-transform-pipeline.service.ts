/**
 * T428 MediaUploadTransformPipeline [MEDIA_PIPELINE]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: MediaUploadRequested event (user uploads image/video/document)
 *
 * Execution order is MACHINE (CF-28-6):
 *   ORDER 1: Validate file type and size (max 50MB, allowed types)
 *   ORDER 2: Transform media to variants (thumbnail, web, hi-res for images)
 *   ORDER 3: storeDocument(media-record + variant-urls)
 *   ORDER 4: enqueue(MediaProcessed) — notify content editor of ready variants
 *
 * Iron rules:
 *   IR-1: File size limit enforced at upload
 *   IR-2: Variant generation: 150x150 thumbnail, 800x600 web, 2400x1800 hi-res
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const MEDIA_INDEX = 'xiigen-media-assets';
const MAX_FILE_SIZE_MB = 50;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];

interface MediaVariant {
  name: string;
  dimensions?: string;
  sizeMb: number;
  url: string;
}

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class MediaUploadTransformPipelineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T428',
        serviceName: 'MediaUploadTransformPipelineService',
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
   * Upload and transform media with variant generation.
   */
  async uploadAndTransform(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const mediaId = event['mediaId'] as string;
    const fileName = event['fileName'] as string;
    const mimeType = event['mimeType'] as string;
    const fileSizeMb = event['fileSizeMb'] as number;
    const originalUrl = event['originalUrl'] as string;

    if (!mediaId || !fileName || !mimeType || fileSizeMb === undefined || !originalUrl) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'mediaId, fileName, mimeType, fileSizeMb, and originalUrl are required',
      );
    }

    // ── ORDER 1: Validate file type and size ──────────────────────────────
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return DataProcessResult.failure(
        'INVALID_FILE_TYPE',
        `File type ${mimeType} not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      );
    }

    if (fileSizeMb > MAX_FILE_SIZE_MB) {
      return DataProcessResult.failure(
        'FILE_TOO_LARGE',
        `File size ${fileSizeMb}MB exceeds max ${MAX_FILE_SIZE_MB}MB`,
      );
    }

    // ── ORDER 2: Transform media to variants ──────────────────────────────
    const variants: MediaVariant[] = [];

    if (mimeType.startsWith('image/')) {
      variants.push(
        {
          name: 'thumbnail',
          dimensions: '150x150',
          sizeMb: 0.1,
          url: `${originalUrl}?w=150&h=150&fit=thumb`,
        },
        {
          name: 'web',
          dimensions: '800x600',
          sizeMb: 0.3,
          url: `${originalUrl}?w=800&h=600&fit=max`,
        },
        {
          name: 'hires',
          dimensions: '2400x1800',
          sizeMb: fileSizeMb,
          url: originalUrl,
        },
      );
    } else {
      // Non-image: single variant
      variants.push({
        name: 'original',
        sizeMb: fileSizeMb,
        url: originalUrl,
      });
    }

    // ── ORDER 3: storeDocument(media-record + variant-urls) ───────────────
    const mediaRecord: Record<string, unknown> = {
      mediaId,
      tenantId,
      fileName,
      mimeType,
      fileSizeMb,
      originalUrl,
      variants,
      uploadedAt: new Date().toISOString(),
      uploadedBy: event['uploadedBy'] ?? 'system',
      status: 'PROCESSED',
    };

    await this.dbFabric.storeDocument(MEDIA_INDEX, mediaRecord, mediaId);

    // ── ORDER 4: enqueue(MediaProcessed) ─────────────────────────────────
    await this.queueFabric.enqueue('MediaProcessed', {
      mediaId,
      tenantId,
      fileName,
      variants: variants.map((v) => ({ name: v.name, url: v.url })),
      processedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      mediaId,
      fileName,
      variants,
      status: 'PROCESSED',
      processedAt: new Date().toISOString(),
    });
  }
}
