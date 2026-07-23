/**
 * SubdomainTenantMiddleware — extracts tenant from subdomain.
 *
 * When request arrives at acme.xiigen.com, extracts 'acme' and writes
 * it to X-Tenant-Id header before TenantContextMiddleware reads it.
 *
 * Only fires when hostname has ≥ 3 labels (subdomain present).
 * Does NOT override an already-present X-Tenant-Id header (API calls
 * with explicit header take precedence over subdomain).
 *
 * Config: SUBDOMAIN_BASE_DOMAIN env var (e.g. "xiigen.com").
 * When absent or hostname doesn't match base domain: no-op.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const TENANT_HEADER = 'x-tenant-id';

@Injectable()
export class SubdomainTenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Skip if header already explicitly set (API clients pass header directly)
    if (req.headers[TENANT_HEADER]) {
      return next();
    }

    // Read env var at request time so tests can set it in beforeEach
    const baseDomain = process.env['SUBDOMAIN_BASE_DOMAIN'] ?? '';

    // Skip if no base domain configured — subdomain routing is opt-in
    if (!baseDomain) {
      return next();
    }

    const hostname = req.hostname ?? '';

    // Must match *.baseDomain pattern
    if (!hostname.endsWith(`.${baseDomain}`)) {
      return next();
    }

    // Extract leftmost label: 'acme.xiigen.com' → 'acme'
    const subdomain = hostname.slice(0, hostname.length - baseDomain.length - 1);

    // Guard: subdomain must be non-empty and contain only valid tenant chars
    if (!subdomain || !/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(subdomain)) {
      return next();
    }

    req.headers[TENANT_HEADER] = subdomain;
    next();
  }
}
