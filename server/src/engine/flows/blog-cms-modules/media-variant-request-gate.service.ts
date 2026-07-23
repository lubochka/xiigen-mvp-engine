/**
 * T429 MediaVariantRequestGate [VARIANT_SELECTION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: MediaVariantRequested event (client requests appropriate variant)
 *
 * Execution order is MACHINE (CF-28-7):
 *   ORDER 1: Detect device/context (mobile, tablet, desktop, print)
 *   ORDER 2: Select optimal variant based on context
 *   ORDER 3: storeDocument(variant-request-audit)
 *   ORDER 4: enqueue(VariantServed) — log for analytics/cache optimization
 *
 * Iron rules:
 *   IR-1: Variant selection algorithm: thumbnail for mobile, web for tablet, hires for desktop
 *   IR-2: tenantId from ALS only (DNA-5)
 *   IR-3: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const VARIANT_AUDIT_INDEX = 'xiigen-variant-requests';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class MediaVariantRequestGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T429',
        serviceName: 'MediaVariantRequestGateService',
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
   * Select appropriate media variant based on device and context.
   */
  async selectVariant(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const mediaId = event['mediaId'] as string;
    const deviceType = event['deviceType'] as string;
    const variants = event['variants'] as Record<string, string>[];

    if (!mediaId || !deviceType || !variants) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'mediaId, deviceType, and variants are required',
      );
    }

    // ── ORDER 1: Detect device/context ───────────────────────────────────
    const context = this.detectContext(deviceType);

    // ── ORDER 2: Select optimal variant ──────────────────────────────────
    const selectedVariant = this.selectOptimalVariant(variants, context);

    if (!selectedVariant) {
      return DataProcessResult.failure(
        'NO_SUITABLE_VARIANT',
        `No suitable variant found for device type ${deviceType}`,
      );
    }

    // ── ORDER 3: storeDocument(variant-request-audit) ────────────────────
    const auditRecord: Record<string, unknown> = {
      mediaId,
      tenantId,
      deviceType,
      context,
      selectedVariant: selectedVariant.name,
      requestedAt: new Date().toISOString(),
      userAgent: event['userAgent'] ?? 'unknown',
    };

    await this.dbFabric.storeDocument(VARIANT_AUDIT_INDEX, auditRecord, `${mediaId}:${deviceType}`);

    // ── ORDER 4: enqueue(VariantServed) ─────────────────────────────────
    await this.queueFabric.enqueue('VariantServed', {
      mediaId,
      tenantId,
      deviceType,
      selectedVariant: selectedVariant.name,
      url: selectedVariant.url,
      servedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      mediaId,
      selectedVariant: selectedVariant.name,
      url: selectedVariant.url,
      context,
    });
  }

  private detectContext(deviceType: string): string {
    const type = deviceType.toLowerCase();
    if (type.includes('mobile')) return 'mobile';
    if (type.includes('tablet')) return 'tablet';
    if (type.includes('print')) return 'print';
    return 'desktop';
  }

  private selectOptimalVariant(
    variants: Record<string, string>[],
    context: string,
  ): Record<string, string> | null {
    const variantsByName = new Map(variants.map((v) => [v['name'] as string, v]));

    switch (context) {
      case 'mobile':
        return variantsByName.get('thumbnail') ?? variantsByName.get('web') ?? null;
      case 'tablet':
        return variantsByName.get('web') ?? variantsByName.get('hires') ?? null;
      case 'desktop':
      case 'print':
        return variantsByName.get('hires') ?? variantsByName.get('web') ?? null;
      default:
        return variantsByName.get('web') ?? null;
    }
  }
}
