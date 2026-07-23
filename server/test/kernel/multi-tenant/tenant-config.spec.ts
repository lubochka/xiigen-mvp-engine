/**
 * Tests for TenantConfigResolver — per-tenant FREEDOM config resolution.
 */

import { TenantConfigResolver } from '../../../src/kernel/multi-tenant/tenant-config.resolver';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../../src/kernel/multi-tenant/tenant-context';
import { makeProTenant, makeActiveTenant } from '../../helpers/tenant-test.helper';

function mockCls(tenant?: TenantContext) {
  const store = new Map<string, unknown>();
  if (tenant) store.set(TENANT_CONTEXT_KEY, tenant);
  return {
    get: jest.fn().mockImplementation((key: string) => store.get(key)),
    set: jest.fn().mockImplementation((key: string, val: unknown) => store.set(key, val)),
  } as any;
}

describe('TenantConfigResolver', () => {
  describe('get() — resolution order', () => {
    it('should return tenant override when present', () => {
      const tenant = makeProTenant('t1', {}, { 'ai.defaultModel': 'claude-opus' });
      const resolver = new TenantConfigResolver(mockCls(tenant));

      expect(resolver.get('ai.defaultModel')).toBe('claude-opus');
    });

    it('should fall back to system default when no tenant override', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantConfigResolver(mockCls(tenant));
      resolver.setSystemDefault('ai.defaultModel', 'gpt-4o');

      expect(resolver.get('ai.defaultModel')).toBe('gpt-4o');
    });

    it('should return fallback when no tenant override and no system default', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantConfigResolver(mockCls(tenant));

      expect(resolver.get('ai.defaultModel', 'fallback-model')).toBe('fallback-model');
    });

    it('should return undefined when no value at any level', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantConfigResolver(mockCls(tenant));

      expect(resolver.get('nonexistent.key')).toBeUndefined();
    });

    it('should prioritize tenant override over system default', () => {
      const tenant = makeProTenant('t1', {}, { 'ai.defaultModel': 'claude-opus' });
      const resolver = new TenantConfigResolver(mockCls(tenant));
      resolver.setSystemDefault('ai.defaultModel', 'gpt-4o');

      expect(resolver.get('ai.defaultModel')).toBe('claude-opus');
    });

    it('should work without tenant context (no CLS)', () => {
      const resolver = new TenantConfigResolver(mockCls(undefined));
      resolver.setSystemDefault('key', 'system-val');

      expect(resolver.get('key')).toBe('system-val');
    });
  });

  describe('getWithSource()', () => {
    it('should report tenant_override source', () => {
      const tenant = makeProTenant('t1', {}, { key: 'val' });
      const resolver = new TenantConfigResolver(mockCls(tenant));

      const result = resolver.getWithSource('key');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.value).toBe('val');
      expect(result.data!.source).toBe('tenant_override');
      expect(result.data!.tenantId).toBe('t1');
    });

    it('should report system_default source', () => {
      const tenant = makeActiveTenant('t1');
      const resolver = new TenantConfigResolver(mockCls(tenant));
      resolver.setSystemDefault('key', 'sys-val');

      const result = resolver.getWithSource('key');
      expect(result.data!.source).toBe('system_default');
    });

    it('should report fallback source', () => {
      const resolver = new TenantConfigResolver(mockCls(undefined));
      const result = resolver.getWithSource('key', 'fb');
      expect(result.data!.source).toBe('fallback');
    });

    it('should report none source', () => {
      const resolver = new TenantConfigResolver(mockCls(undefined));
      const result = resolver.getWithSource('key');
      expect(result.data!.source).toBe('none');
    });
  });

  describe('setSystemDefaults()', () => {
    it('should set multiple defaults', () => {
      const resolver = new TenantConfigResolver(mockCls(undefined));
      resolver.setSystemDefaults({ a: 1, b: 2, c: 3 });

      expect(resolver.get('a')).toBe(1);
      expect(resolver.get('b')).toBe(2);
      expect(resolver.get('c')).toBe(3);
    });
  });

  describe('multi-tenant isolation', () => {
    it('should resolve different values for different tenants', () => {
      const tenantA = makeProTenant('tA', {}, { 'ai.model': 'claude' });
      const tenantB = makeProTenant('tB', {}, { 'ai.model': 'gpt-4o' });

      const resolverA = new TenantConfigResolver(mockCls(tenantA));
      const resolverB = new TenantConfigResolver(mockCls(tenantB));

      expect(resolverA.get('ai.model')).toBe('claude');
      expect(resolverB.get('ai.model')).toBe('gpt-4o');
    });
  });
});
