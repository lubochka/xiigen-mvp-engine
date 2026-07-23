/**
 * Tests for TenantKeyResolver — per-tenant API key resolution.
 */

import { TenantKeyResolver } from '../../../src/kernel/multi-tenant/tenant-key.resolver';
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

describe('TenantKeyResolver', () => {
  describe('getKey()', () => {
    it('should return tenant key when present', () => {
      const tenant = makeProTenant('t1', { anthropic: 'sk-tenant-ant' });
      const resolver = new TenantKeyResolver(mockCls(tenant));

      expect(resolver.getKey('anthropic')).toBe('sk-tenant-ant');
    });

    it('should fall back to system key when tenant has none', () => {
      const tenant = makeActiveTenant('t1'); // no API keys
      const resolver = new TenantKeyResolver(mockCls(tenant));
      resolver.setSystemKey('anthropic', 'sk-system-ant');

      expect(resolver.getKey('anthropic')).toBe('sk-system-ant');
    });

    it('should return undefined when no key at any level', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantKeyResolver(mockCls(tenant));

      expect(resolver.getKey('deepseek')).toBeUndefined();
    });

    it('should prioritize tenant key over system key', () => {
      const tenant = makeProTenant('t1', { anthropic: 'sk-tenant' });
      const resolver = new TenantKeyResolver(mockCls(tenant));
      resolver.setSystemKey('anthropic', 'sk-system');

      expect(resolver.getKey('anthropic')).toBe('sk-tenant');
    });

    it('should work without tenant context', () => {
      const resolver = new TenantKeyResolver(mockCls(undefined));
      resolver.setSystemKey('openai', 'sk-system-oai');

      expect(resolver.getKey('openai')).toBe('sk-system-oai');
    });
  });

  describe('getKeyWithSource()', () => {
    it('should report tenant source', () => {
      const tenant = makeProTenant('t1', { openai: 'sk-t' });
      const resolver = new TenantKeyResolver(mockCls(tenant));

      const result = resolver.getKeyWithSource('openai');
      expect(result.data!.key).toBe('sk-t');
      expect(result.data!.source).toBe('tenant');
    });

    it('should report system source', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantKeyResolver(mockCls(tenant));
      resolver.setSystemKey('openai', 'sk-s');

      const result = resolver.getKeyWithSource('openai');
      expect(result.data!.source).toBe('system');
    });

    it('should report none source', () => {
      const resolver = new TenantKeyResolver(mockCls(undefined));
      const result = resolver.getKeyWithSource('openai');
      expect(result.data!.source).toBe('none');
    });
  });

  describe('requireKey()', () => {
    it('should return success when key exists', () => {
      const tenant = makeProTenant('t1', { anthropic: 'sk-ant' });
      const resolver = new TenantKeyResolver(mockCls(tenant));

      const result = resolver.requireKey('anthropic');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('sk-ant');
    });

    it('should return failure when no key', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantKeyResolver(mockCls(tenant));

      const result = resolver.requireKey('anthropic');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_API_KEY');
      expect(result.errorMessage).toContain('anthropic');
      expect(result.errorMessage).toContain('t1');
    });

    it('should return failure without tenant context', () => {
      const resolver = new TenantKeyResolver(mockCls(undefined));
      const result = resolver.requireKey('anthropic');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_API_KEY');
    });
  });

  describe('setSystemKeys()', () => {
    it('should set multiple system keys', () => {
      const resolver = new TenantKeyResolver(mockCls(undefined));
      resolver.setSystemKeys({ anthropic: 'sk-a', openai: 'sk-o', gemini: 'sk-g' });

      expect(resolver.getKey('anthropic')).toBe('sk-a');
      expect(resolver.getKey('openai')).toBe('sk-o');
      expect(resolver.getKey('gemini')).toBe('sk-g');
    });
  });

  describe('listSystemProviders()', () => {
    it('should list configured system providers', () => {
      const resolver = new TenantKeyResolver(mockCls(undefined));
      resolver.setSystemKeys({ anthropic: 'k1', openai: 'k2' });

      const providers = resolver.listSystemProviders();
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
      expect(providers.length).toBe(2);
    });
  });

  describe('multi-tenant isolation', () => {
    it('should resolve different keys for different tenants', () => {
      const tenantA = makeProTenant('tA', { anthropic: 'sk-A' });
      const tenantB = makeProTenant('tB', { anthropic: 'sk-B' });

      const resolverA = new TenantKeyResolver(mockCls(tenantA));
      const resolverB = new TenantKeyResolver(mockCls(tenantB));

      expect(resolverA.getKey('anthropic')).toBe('sk-A');
      expect(resolverB.getKey('anthropic')).toBe('sk-B');
    });
  });
});
