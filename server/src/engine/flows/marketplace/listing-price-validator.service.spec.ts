// T88 ListingPriceValidatorService — unit tests (INLINE_ONLY)
// Validates: price < 0 fails, price = 0 accepted (free listing), max cap from FREEDOM config

import { ListingPriceValidatorService } from './listing-price-validator.service';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';

function makeFreedomConfig(maxCap: number | null = null): IFreedomConfigService {
  return {
    get: jest.fn().mockResolvedValue(maxCap !== null ? { value: maxCap } : null),
  };
}

describe('ListingPriceValidatorService — T88 (INLINE_ONLY)', () => {
  it('T88-1: price < 0 → failure (IR-1)', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig());
    const result = await service.validate({ price: -1, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_PRICE');
  });

  it('T88-2: price = 0 → success (free listing accepted — IR-1)', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig());
    const result = await service.validate({ price: 0, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.freeListingAllowed).toBe(true);
  });

  it('T88-3: price > 0 → success', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig());
    const result = await service.validate({ price: 29.99, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.valid).toBe(true);
  });

  it('T88-4: price > max cap from FREEDOM config → failure (IR-2)', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig(100));
    const result = await service.validate({ price: 150, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PRICE_EXCEEDS_CAP');
  });

  it('T88-5: price = max cap → success (exact cap is allowed)', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig(100));
    const result = await service.validate({ price: 100, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(true);
  });

  it('T88-6: no FREEDOM config → no max cap applied', async () => {
    const service = new ListingPriceValidatorService(makeFreedomConfig(null));
    const result = await service.validate({ price: 999999, tenantId: 'tenant-alpha' });

    expect(result.isSuccess).toBe(true); // no cap configured
  });
});
