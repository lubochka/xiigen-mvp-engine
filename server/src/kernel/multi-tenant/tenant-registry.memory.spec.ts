/**
 * InMemoryTenantRegistry — P26 FIX-4 Tests
 *
 * All ITenantRegistry methods return DataProcessResult — never throw.
 */

import { InMemoryTenantRegistry } from './tenant-registry.memory';

describe('InMemoryTenantRegistry', () => {
  let registry: InMemoryTenantRegistry;

  beforeEach(() => {
    registry = new InMemoryTenantRegistry();
  });

  // ── provisionTenant ────────────────────────────────────────────────────

  describe('provisionTenant', () => {
    it('creates a new tenant record', async () => {
      const result = await registry.provisionTenant('acme', {});
      expect(result.isSuccess).toBe(true);
      expect(result.data!.id).toBe('acme');
      expect(result.data!.status).toBe('active');
    });

    it('returns the existing record when tenant already exists', async () => {
      await registry.provisionTenant('acme', {});
      const r2 = await registry.provisionTenant('acme', {});
      expect(r2.isSuccess).toBe(true);
      expect(r2.data!.id).toBe('acme');
    });

    it('returns failure for empty tenantId', async () => {
      const result = await registry.provisionTenant('', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
    });
  });

  // ── getTenant ──────────────────────────────────────────────────────────

  describe('getTenant', () => {
    it('retrieves a provisioned tenant', async () => {
      await registry.provisionTenant('acme', {});
      const result = await registry.getTenant('acme');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.id).toBe('acme');
    });

    it('returns failure(TENANT_NOT_FOUND) for unknown tenant', async () => {
      const result = await registry.getTenant('unknown');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });
  });

  // ── validateTenantExists ───────────────────────────────────────────────

  describe('validateTenantExists', () => {
    it('returns success for provisioned tenant', async () => {
      await registry.provisionTenant('acme', {});
      const result = await registry.validateTenantExists('acme');
      expect(result.isSuccess).toBe(true);
    });

    it('returns failure(TENANT_NOT_FOUND) for unknown tenant', async () => {
      const result = await registry.validateTenantExists('ghost');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });
  });

  // ── suspendTenant ──────────────────────────────────────────────────────

  describe('suspendTenant', () => {
    it('sets status to suspended', async () => {
      await registry.provisionTenant('acme', {});
      const result = await registry.suspendTenant('acme', 'abuse');
      expect(result.isSuccess).toBe(true);

      const tenant = await registry.getTenant('acme');
      expect(tenant.data!.status).toBe('suspended');
    });

    it('returns failure for unknown tenant', async () => {
      const result = await registry.suspendTenant('ghost', 'abuse');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });
  });

  // ── deleteTenant ───────────────────────────────────────────────────────

  describe('deleteTenant', () => {
    it('removes the tenant', async () => {
      await registry.provisionTenant('acme', {});
      const del = await registry.deleteTenant('acme');
      expect(del.isSuccess).toBe(true);

      const after = await registry.getTenant('acme');
      expect(after.isSuccess).toBe(false);
    });

    it('returns failure for unknown tenant', async () => {
      const result = await registry.deleteTenant('ghost');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TENANT_NOT_FOUND');
    });
  });

  // ── checkQuota ─────────────────────────────────────────────────────────

  describe('checkQuota', () => {
    it('returns ok:true when within limits', async () => {
      await registry.provisionTenant('acme', { maxApiCallsPerMinute: 60 });
      const result = await registry.checkQuota('acme', 'api_calls', 10);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.ok).toBe(true);
      expect(result.data!.remaining).toBe(50);
    });

    it('returns ok:false when limit exceeded', async () => {
      await registry.provisionTenant('acme', { maxApiCallsPerMinute: 5 });
      const result = await registry.checkQuota('acme', 'api_calls', 100);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.ok).toBe(false);
      expect(result.data!.remaining).toBe(0);
    });

    it('returns failure for unknown tenant', async () => {
      const result = await registry.checkQuota('ghost', 'api_calls', 1);
      expect(result.isSuccess).toBe(false);
    });
  });

  // ── All methods return DataProcessResult — never throw ─────────────────

  it('all methods return DataProcessResult — none throw', async () => {
    let threw = false;
    try {
      await registry.provisionTenant('', {});
      await registry.getTenant('none');
      await registry.validateTenantExists('none');
      await registry.suspendTenant('none', 'test');
      await registry.deleteTenant('none');
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
