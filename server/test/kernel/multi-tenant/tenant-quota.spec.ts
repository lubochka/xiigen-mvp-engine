/**
 * Tests for TenantQuotaService — per-tenant rate limits.
 */

import { TenantQuotaService } from '../../../src/kernel/multi-tenant/tenant-quota.service';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../src/kernel/multi-tenant/tenant-context';
import { makeProTenant, makeActiveTenant } from '../../helpers/tenant-test.helper';

function mockCls(tenant?: TenantContext) {
  const store = new Map<string, unknown>();
  if (tenant) store.set(TENANT_CONTEXT_KEY, tenant);
  return {
    get: jest.fn().mockImplementation((key: string) => store.get(key)),
    set: jest.fn(),
  } as any;
}

describe('TenantQuotaService', () => {
  describe('checkAndConsume()', () => {
    it('should allow consumption within limit', async () => {
      // Pro plan: maxApiCallsPerMinute = 300
      const tenant = makeProTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      const result = await service.checkAndConsume('api.calls', 1);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.remaining).toBe(299);
      expect(result.data!.limit).toBe(300);
    });

    it('should track cumulative consumption', async () => {
      const tenant = makeProTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      await service.checkAndConsume('api.calls', 100);
      await service.checkAndConsume('api.calls', 100);
      const result = await service.checkAndConsume('api.calls', 50);

      expect(result.isSuccess).toBe(true);
      expect(result.data!.remaining).toBe(50); // 300 - 100 - 100 - 50
    });

    it('should reject when quota exceeded', async () => {
      // Free plan: maxApiCallsPerMinute = 60
      const tenant = makeActiveTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      // Consume most of the quota
      await service.checkAndConsume('api.calls', 55);
      // Try to consume more than remaining
      const result = await service.checkAndConsume('api.calls', 10);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('QUOTA_EXCEEDED');
      expect(result.metadata['remaining']).toBe(5);
      expect(result.metadata['requested']).toBe(10);
    });

    it('should reject when exact limit hit', async () => {
      const tenant = makeActiveTenant('t1'); // 60 api.calls/min
      const service = new TenantQuotaService(mockCls(tenant));

      await service.checkAndConsume('api.calls', 60); // exactly at limit
      const result = await service.checkAndConsume('api.calls', 1);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('QUOTA_EXCEEDED');
    });

    it('should allow unknown metrics (no limit)', async () => {
      const tenant = makeActiveTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      const result = await service.checkAndConsume('custom.metric', 9999);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.limit).toBe(Infinity);
    });

    it('should fail without tenant context', async () => {
      const service = new TenantQuotaService(mockCls(undefined));
      const result = await service.checkAndConsume('api.calls', 1);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });

    it('should accept explicit tenantId', async () => {
      const service = new TenantQuotaService(mockCls(undefined));
      // With explicit tenantId but no tenant context, limits aren't resolved
      // so it should allow (no limit = Infinity)
      const result = await service.checkAndConsume('api.calls', 1, 'explicit-tenant');
      expect(result.isSuccess).toBe(true);
    });

    it('should track ai.tokens quota separately', async () => {
      // Pro plan: maxTokensPerDay = 1_000_000
      const tenant = makeProTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      const result = await service.checkAndConsume('ai.tokens', 500_000);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.remaining).toBe(500_000);

      const r2 = await service.checkAndConsume('ai.tokens', 500_001);
      expect(r2.isSuccess).toBe(false);
      expect(r2.errorCode).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('check() — read-only', () => {
    it('should report current usage without consuming', async () => {
      const tenant = makeActiveTenant('t1'); // 60/min
      const service = new TenantQuotaService(mockCls(tenant));

      await service.checkAndConsume('api.calls', 20);
      const result = await service.check('api.calls');

      expect(result.isSuccess).toBe(true);
      expect(result.data!.current).toBe(20);
      expect(result.data!.limit).toBe(60);
      expect(result.data!.remaining).toBe(40);
    });

    it('should report zero usage for fresh window', async () => {
      const tenant = makeActiveTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      const result = await service.check('api.calls');
      expect(result.data!.current).toBe(0);
      expect(result.data!.remaining).toBe(60);
    });
  });

  describe('reset()', () => {
    it('should reset specific metric', async () => {
      const tenant = makeActiveTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      await service.checkAndConsume('api.calls', 50);
      service.reset('t1', 'api.calls');

      const result = await service.check('api.calls');
      expect(result.data!.current).toBe(0);
    });

    it('should reset all metrics for a tenant', async () => {
      const tenant = makeProTenant('t1');
      const service = new TenantQuotaService(mockCls(tenant));

      await service.checkAndConsume('api.calls', 50);
      await service.checkAndConsume('ai.tokens', 100_000);
      service.reset('t1');

      expect((await service.check('api.calls')).data!.current).toBe(0);
      expect((await service.check('ai.tokens')).data!.current).toBe(0);
    });
  });

  describe('multi-tenant isolation', () => {
    it('should track quotas independently per tenant', async () => {
      const tenantA = makeActiveTenant('tA');
      const tenantB = makeActiveTenant('tB');

      const serviceA = new TenantQuotaService(mockCls(tenantA));
      const serviceB = new TenantQuotaService(mockCls(tenantB));

      // Tenant A consumes 50/60
      await serviceA.checkAndConsume('api.calls', 50);

      // Tenant B should still have full quota
      const resultB = await serviceB.checkAndConsume('api.calls', 1);
      expect(resultB.isSuccess).toBe(true);
      expect(resultB.data!.remaining).toBe(59);
    });

    it('should allow tenant-A at limit while tenant-B unaffected', async () => {
      const tenantA = makeActiveTenant('tA');
      const tenantB = makeActiveTenant('tB');

      const serviceA = new TenantQuotaService(mockCls(tenantA));
      const serviceB = new TenantQuotaService(mockCls(tenantB));

      // Exhaust tenant A
      await serviceA.checkAndConsume('api.calls', 60);
      const failA = await serviceA.checkAndConsume('api.calls', 1);
      expect(failA.isSuccess).toBe(false);

      // Tenant B unaffected
      const okB = await serviceB.checkAndConsume('api.calls', 30);
      expect(okB.isSuccess).toBe(true);
    });
  });
});
