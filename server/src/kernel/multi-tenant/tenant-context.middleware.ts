/**
 * TenantContextMiddleware — Sets TenantContext into AsyncLocalStorage
 * so any service in the call chain can read currentTenant() without
 * passing it as a parameter.
 *
 * P26 FIX-6: strict 403 enforcement.
 *
 * Behaviour:
 *   - Engine-internal paths (health, docs, openapi) → skip validation entirely.
 *   - X-Tenant-Id header missing → 403 TENANT_MISSING.
 *   - Tenant not found → 403 TENANT_NOT_FOUND.
 *   - Tenant suspended or inactive → 403 TENANT_INACTIVE.
 *   - Tenant active → set TenantContext in CLS, call next().
 */

import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { TenantRegistry } from './tenant-registry.service';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';
import { TENANT_HEADER } from './tenant.guard';
import { ByokKeyStoreService } from './byok-key-store.service';

/** Paths that bypass tenant validation entirely. */
const BYPASS_PATHS = ['/api/docs', '/api/health', '/api/ready', '/api/live', '/api/openapi.json'];

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly cls: ClsService,
    private readonly registry: TenantRegistry,
    @Optional() private readonly byokStore: ByokKeyStoreService | null = null,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip validation for internal/public endpoints
    const path = req.path ?? req.url ?? '';
    if (BYPASS_PATHS.some((bp) => path === bp || path.startsWith(bp + '/'))) {
      return next();
    }

    const rawHeader = req.headers[TENANT_HEADER] as string | undefined;
    const tenantId = rawHeader?.trim();

    // FIX-6: missing header → 403 immediately
    if (!tenantId) {
      res.status(403).json({
        is_success: false,
        error_code: 'TENANT_MISSING',
        error_message: `Header '${TENANT_HEADER}' is required`,
      });
      return;
    }

    const result = await this.registry.findById(tenantId);

    // FIX-6: not found → 403
    if (!result.isSuccess || !result.data) {
      res.status(403).json({
        is_success: false,
        error_code: 'TENANT_NOT_FOUND',
        error_message: `Tenant '${tenantId}' not found`,
      });
      return;
    }

    const tenant = result.data;

    // FIX-6: suspended or inactive → 403
    if (tenant.status === 'suspended' || tenant.status === 'inactive') {
      res.status(403).json({
        is_success: false,
        error_code: 'TENANT_INACTIVE',
        error_message: `Tenant '${tenantId}' is ${tenant.status}`,
      });
      return;
    }

    // Phase B-2: enrich apiKeys from xiigen-byok-keys (survives restarts).
    // In-memory apiKeys from registry take precedence — byok-keys fill in the rest.
    let apiKeys = { ...tenant.apiKeys };
    if (this.byokStore) {
      const byokResult = await this.byokStore.readKeys(tenant.id); // UUID-keyed — matches BootstrapSeeder storage
      if (byokResult.isSuccess && byokResult.data) {
        // byok-keys provide the persistent copy; in-memory overlay wins if both present
        apiKeys = { ...byokResult.data, ...apiKeys };
      }
    }

    // Happy path: set context and continue.
    // cls.run() ensures a CLS context exists even if ClsMiddleware hasn't initialized one.
    const enrichedTenant = { ...tenant, apiKeys };
    const context = new TenantContext(enrichedTenant);
    return this.cls.run(() => {
      this.cls.set(TENANT_CONTEXT_KEY, context);
      return next();
    });
  }
}
