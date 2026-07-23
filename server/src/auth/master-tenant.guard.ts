/**
 * MasterTenantGuard — FLOW-01 Phase A3 (V-05, feeds R6).
 *
 * Enforces two conjoined properties on routes that operate the platform
 * itself (cross-tenant governance, BFA, DNA scans, plugin adapter, etc.):
 *
 *   1. Caller is in the master tenant's CLS context
 *      (ScopeContext.tenantId ∈ { MASTER_TENANT_ID, MASTER_TENANT_NAME }).
 *
 *   2. Caller carries ROLE_PLATFORM_ADMIN.
 *
 * Routes opt in by decoration:
 *
 *     @MasterTenantOnly()
 *     @Controller('api/governance')
 *     export class GovernanceController { ... }
 *
 * When the metadata flag is absent the guard is a PASS-THROUGH — it never
 * blocks a request that didn't ask for master-tenant protection. This is
 * critical for APP_GUARD wiring in Phase A4: the guard runs on EVERY
 * request but only enforces where declared.
 *
 * Failure taxonomy (all 403 FORBIDDEN — never reveals WHY to the caller
 * beyond a stable error_code):
 *
 *   - NO_SCOPE           — ScopeEnrichmentInterceptor didn't populate CLS.
 *                           Usually means the route lacks AuthGuard('jwt')
 *                           while still being @MasterTenantOnly() — a wiring
 *                           bug, not a user error.
 *   - NOT_MASTER_TENANT  — ScopeContext present but tenantId isn't the
 *                           master tenant.
 *   - NOT_PLATFORM_ADMIN — Master tenant but principal lacks the platform-
 *                           admin role claim.
 *
 * The guard reads the scope from CLS via ClsService; it does NOT accept an
 * `@Inject(SCOPE_CONTEXT_KEY)` shortcut (CLS is the source of truth; a
 * constructor injection would break when the guard executes before any
 * interceptor can populate it).
 *
 * @connectionType PROTOCOL_PERIPHERAL
 * @flowId FLOW-01
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';

import { ScopeContext, SCOPE_CONTEXT_KEY } from '../kernel/scope-isolation';
import { ROLE_PLATFORM_ADMIN } from '../kernel/role-strings';
import {
  MASTER_TENANT_ID,
  MASTER_TENANT_NAME,
} from '../bootstrap/bootstrap-seeder.service';

/** Reflector metadata key set by `@MasterTenantOnly()`. */
export const MASTER_TENANT_ONLY_KEY = 'auth::master-tenant-only';

/**
 * Controller / handler decorator — marks a route as requiring master-tenant
 * context AND platform-admin privileges. Without this decorator the guard
 * is a no-op for the route.
 */
export const MasterTenantOnly = (): MethodDecorator & ClassDecorator =>
  SetMetadata(MASTER_TENANT_ONLY_KEY, true);

/** True iff `tenantId` matches either the well-known master ID or its name alias. */
export function isMasterTenant(tenantId: string | undefined | null): boolean {
  if (typeof tenantId !== 'string' || tenantId.length === 0) return false;
  return tenantId === MASTER_TENANT_ID || tenantId === MASTER_TENANT_NAME;
}

/** Produce a 403 payload with stable error_code shape. */
function forbidden(code: string, message: string): HttpException {
  return new HttpException(
    { is_success: false, error_code: code, error_message: message },
    HttpStatus.FORBIDDEN,
  );
}

@Injectable()
export class MasterTenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const masterOnly = this.reflector.getAllAndOverride<boolean>(
      MASTER_TENANT_ONLY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!masterOnly) {
      // Route didn't ask for master-tenant protection — pass through.
      return true;
    }

    const scope = this.cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    if (!scope) {
      throw forbidden(
        'NO_SCOPE',
        'master-tenant route reached without a verified principal',
      );
    }

    if (!isMasterTenant(scope.tenantId)) {
      throw forbidden(
        'NOT_MASTER_TENANT',
        `tenant '${scope.tenantId}' is not the master tenant`,
      );
    }

    if (!scope.hasRole(ROLE_PLATFORM_ADMIN)) {
      throw forbidden(
        'NOT_PLATFORM_ADMIN',
        'platform-admin role required for master-tenant operations',
      );
    }

    return true;
  }
}
