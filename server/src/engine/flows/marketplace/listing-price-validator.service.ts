// T88 ListingPriceValidator [GUARD] (INLINE_ONLY)
//
// Price validation guard — inline execution only (not a queue consumer).
// price < 0 → reject with DataProcessResult.failure.
// price = 0 → accept (free listing).
// price validation max cap from FREEDOM config.
//
// Iron rules:
//   IR-1: price < 0 → failure; price >= 0 → success
//   IR-2: max price cap from FREEDOM config (not hardcoded)
//
// Factories:
//   F247: IPriceValidatorService — price validation config (FREEDOM config + inline logic)
//
// executionModel: INLINE_ONLY — must NOT have @EventPattern or @MessagePattern decorators.
// Injected into T83 ListingPublisher and called synchronously.

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';

export interface PriceValidationRequest {
  price: number;
  tenantId: string;
  listingId?: string;
}

export interface PriceValidationResult {
  price: number;
  valid: boolean;
  freeListingAllowed: boolean;
  maxPriceCap?: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, price validation through fabric interfaces
 * @className ListingPriceValidatorService
 */
@Injectable()
export class ListingPriceValidatorService extends MicroserviceBase {
  constructor(
    /** FREEDOM config service — max price cap (IR-2) */
    private readonly freedomConfig: IFreedomConfigService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T88',
        serviceName: 'ListingPriceValidatorService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async validate(
    request: PriceValidationRequest,
  ): Promise<DataProcessResult<PriceValidationResult>> {
    // IR-1: price < 0 → failure
    if (request.price < 0) {
      return DataProcessResult.failure('INVALID_PRICE', 'Price cannot be negative');
    }

    // IR-2: max price cap from FREEDOM config — not hardcoded
    const maxPriceCapDoc = await this.freedomConfig
      .get(`flow08_marketplace_max_price_cap.${request.tenantId}`)
      .catch(() => null);
    const rawMaxPriceCap =
      maxPriceCapDoc?.['value'] ??
      maxPriceCapDoc?.['maxPriceCap'] ??
      maxPriceCapDoc?.['max_price_cap'] ??
      null;
    let effectiveMaxPriceCap: number | undefined;
    if (typeof rawMaxPriceCap === 'number') {
      effectiveMaxPriceCap = rawMaxPriceCap;
    } else if (typeof rawMaxPriceCap === 'string' && rawMaxPriceCap.trim() !== '') {
      effectiveMaxPriceCap = Number(rawMaxPriceCap);
    }
    if (effectiveMaxPriceCap !== undefined && !Number.isFinite(effectiveMaxPriceCap)) {
      effectiveMaxPriceCap = undefined;
    }

    if (effectiveMaxPriceCap !== undefined && request.price > effectiveMaxPriceCap) {
      return DataProcessResult.failure(
        'PRICE_EXCEEDS_CAP',
        `Price ${request.price} exceeds tenant max cap ${effectiveMaxPriceCap}`,
      );
    }

    // price = 0 → free listing → accepted (IR-1)
    return DataProcessResult.success({
      price: request.price,
      valid: true,
      freeListingAllowed: request.price === 0,
      maxPriceCap: effectiveMaxPriceCap,
    });
  }
}
