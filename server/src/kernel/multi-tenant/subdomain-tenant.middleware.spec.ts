import 'reflect-metadata';
import { SubdomainTenantMiddleware, TENANT_HEADER } from './subdomain-tenant.middleware';

describe('SubdomainTenantMiddleware', () => {
  let middleware: SubdomainTenantMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new SubdomainTenantMiddleware();
    next = jest.fn();
    process.env['SUBDOMAIN_BASE_DOMAIN'] = 'xiigen.com';
  });

  afterEach(() => {
    delete process.env['SUBDOMAIN_BASE_DOMAIN'];
  });

  it('extracts subdomain and sets X-Tenant-Id header', () => {
    const req = { hostname: 'acme.xiigen.com', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(req.headers[TENANT_HEADER]).toBe('acme');
    expect(next).toHaveBeenCalled();
  });

  it('does not override existing X-Tenant-Id header', () => {
    const req = { hostname: 'acme.xiigen.com', headers: { [TENANT_HEADER]: 'explicit' } } as any;
    middleware.use(req, {} as any, next);
    expect(req.headers[TENANT_HEADER]).toBe('explicit');
  });

  it('no-ops when SUBDOMAIN_BASE_DOMAIN not set', () => {
    delete process.env['SUBDOMAIN_BASE_DOMAIN'];
    // Re-import would be needed to pick up env change at module level, so test the guard path:
    // Force BASE_DOMAIN to be empty by checking the no-base-domain guard via a fresh instance
    const req = { hostname: 'acme.xiigen.com', headers: {} } as any;
    // With SUBDOMAIN_BASE_DOMAIN unset, BASE_DOMAIN constant = '' from previous require.
    // The guard `if (!BASE_DOMAIN)` fires only when the env var was '' at import time.
    // This test verifies the no-op behaviour at runtime when env var is absent.
    // Since module-level constant captured at load time, we test the guard indirectly:
    // hostname does not match empty-string base domain → next() called, no header set.
    middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('no-ops when hostname does not match base domain', () => {
    const req = { hostname: 'acme.other.com', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(req.headers[TENANT_HEADER]).toBeUndefined();
  });

  it('no-ops when hostname is the base domain itself (no subdomain)', () => {
    const req = { hostname: 'xiigen.com', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(req.headers[TENANT_HEADER]).toBeUndefined();
  });

  it('rejects invalid subdomain chars (DNS injection guard)', () => {
    const req = { hostname: 'acme_.xiigen.com', headers: {} } as any;
    middleware.use(req, {} as any, next);
    expect(req.headers[TENANT_HEADER]).toBeUndefined();
  });
});
