/**
 * Tests for TenantGuard — NestJS Guard that enforces tenant validation.
 */

import { HttpException } from '@nestjs/common';
import { TenantGuard } from '../../../src/kernel/multi-tenant/tenant.guard';
import {
  TenantContext,
  DEFAULT_PLAN,
  TENANT_CONTEXT_KEY,
} from '../../../src/kernel/multi-tenant/tenant-context';

// Mock CLS service
function mockCls(tenantContext?: TenantContext) {
  return {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === TENANT_CONTEXT_KEY) return tenantContext;
      return undefined;
    }),
    set: jest.fn(),
  } as any;
}

// Mock execution context
function mockExecutionContext(headers: Record<string, string> = {}) {
  const request: Record<string, unknown> = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    _request: request, // expose for assertions
  } as any;
}

function activeTenantContext(id = 'tenant-abc'): TenantContext {
  return new TenantContext({
    id,
    name: 'Test Corp',
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function inactiveTenantContext(id = 'tenant-xyz'): TenantContext {
  return new TenantContext({
    id,
    name: 'Dead Corp',
    status: 'inactive',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

describe('TenantGuard', () => {
  describe('missing header', () => {
    it('should throw 400 when X-Tenant-Id header is missing', () => {
      const guard = new TenantGuard(mockCls());
      const ctx = mockExecutionContext({});

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
      try {
        guard.canActivate(ctx);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(400);
        const body = (e as HttpException).getResponse() as any;
        expect(body.error_code).toBe('TENANT_MISSING');
      }
    });

    it('should throw 400 when X-Tenant-Id is empty string', () => {
      const guard = new TenantGuard(mockCls());
      const ctx = mockExecutionContext({ 'x-tenant-id': '' });

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });

    it('should throw 400 when X-Tenant-Id is whitespace', () => {
      const guard = new TenantGuard(mockCls());
      const ctx = mockExecutionContext({ 'x-tenant-id': '   ' });

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });
  });

  describe('tenant not resolved', () => {
    it('should throw 403 when CLS has no tenant context', () => {
      const guard = new TenantGuard(mockCls(undefined));
      const ctx = mockExecutionContext({ 'x-tenant-id': 'unknown-tenant' });

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
      try {
        guard.canActivate(ctx);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(403);
        const body = (e as HttpException).getResponse() as any;
        expect(body.error_code).toBe('TENANT_NOT_RESOLVED');
      }
    });
  });

  describe('inactive tenant', () => {
    it('should throw 403 when tenant is inactive', () => {
      const tenant = inactiveTenantContext();
      const guard = new TenantGuard(mockCls(tenant));
      const ctx = mockExecutionContext({ 'x-tenant-id': 'tenant-xyz' });

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
      try {
        guard.canActivate(ctx);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(403);
        const body = (e as HttpException).getResponse() as any;
        expect(body.error_code).toBe('TENANT_INACTIVE');
      }
    });

    it('should throw 403 when tenant is suspended', () => {
      const tenant = new TenantContext({
        id: 'tenant-s',
        name: 'Suspended Corp',
        status: 'suspended',
        plan: { ...DEFAULT_PLAN },
        configOverrides: {},
        apiKeys: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const guard = new TenantGuard(mockCls(tenant));
      const ctx = mockExecutionContext({ 'x-tenant-id': 'tenant-s' });

      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });
  });

  describe('active tenant — success', () => {
    it('should return true for active tenant', () => {
      const tenant = activeTenantContext();
      const guard = new TenantGuard(mockCls(tenant));
      const ctx = mockExecutionContext({ 'x-tenant-id': 'tenant-abc' });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should attach tenantContext to request', () => {
      const tenant = activeTenantContext();
      const guard = new TenantGuard(mockCls(tenant));
      const ctx = mockExecutionContext({ 'x-tenant-id': 'tenant-abc' });

      guard.canActivate(ctx);

      const request = ctx._request;
      expect(request['tenantContext']).toBe(tenant);
    });
  });
});
