/**
 * UserRolesService — FLOW-01 Phase A2 (V-03).
 *
 * Resolves the full role set for a given user, combining:
 *   1. Tenant-scoped roles   — stored on the user registration record
 *                               (index: `xiigen-user-registrations`,
 *                                field: `roles` | `role_list`).
 *   2. Platform-scoped roles — cross-tenant elevated privilege, stored in a
 *                               dedicated index (`xiigen-platform-roles`),
 *                               readable only within the master tenant's CLS
 *                               context. When the current tenant is NOT the
 *                               master tenant, the platform lookup silently
 *                               returns an empty set (by design — cross-tenant
 *                               isolation is enforced by DNA-5 at the fabric
 *                               provider, not by this service).
 *
 * Architecture contracts honoured here:
 *
 *   - Rule 1 (Fabric First)  : accesses ES only via IDatabaseService.
 *   - Rule 2 (No Typed Models): records stay as `Record<string, unknown>`.
 *   - Rule 4 (DataProcessResult): every method returns DPR; no throws for
 *                                 business conditions.
 *   - Rule 5 (MicroserviceBase) : extends MicroserviceBase (DNA-4).
 *   - Rule 6 (Scope Isolation) : reads tenantId from CLS via ClsService.
 *   - Rule 14 (Config over Code): role STRINGS are constants in
 *                                 `kernel/role-strings.ts`, not literals.
 *
 * API surface (per V-03):
 *   - resolveRolesForUser(userId)                  — full role set for user.
 *   - attachPlatformRoles(userId, tenantRoles)     — merge + dedupe with
 *                                                    platform-role index.
 *
 * AuthService (A1) currently uses an inline `extractRoles()` placeholder;
 * Phase A2.5 swaps that call for `UserRolesService.resolveRolesForUser()`.
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-01
 * @className UserRolesService
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../kernel/microservice-base';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
} from '../kernel/multi-tenant/tenant-context';
import {
  DATABASE_SERVICE,
  IDatabaseService,
} from '../fabrics/interfaces/database.interface';
import {
  DEFAULT_ROLE,
  RoleString,
  isRoleString,
} from '../kernel/role-strings';
import { USERS_INDEX } from './auth.service';

/**
 * Platform-role assignment index (cross-tenant elevated privilege registry).
 * Records: `{ user_id, roles: string[], granted_at, granted_by, tenant_id }`.
 * Stored under `tenant_id = 'master'` — visible only to master-tenant callers.
 */
export const PLATFORM_ROLES_INDEX = 'xiigen-platform-roles';

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Extract a clean role array from a user record. Unknown/bad values are
 * dropped silently — the UI doesn't need to know which stale role string
 * was ignored. Returns empty array when no recognisable roles present (so
 * callers can distinguish "no roles found" from "default applied").
 */
export function normaliseRoles(
  raw: unknown,
): readonly RoleString[] {
  if (!Array.isArray(raw)) {
    return Object.freeze([]) as readonly RoleString[];
  }
  const roles: RoleString[] = [];
  for (const entry of raw) {
    if (isRoleString(entry) && !roles.includes(entry)) {
      roles.push(entry);
    }
  }
  return Object.freeze(roles) as readonly RoleString[];
}

/** Merge two role arrays, preserving order of the first and de-duplicating. */
export function mergeRoles(
  primary: readonly RoleString[],
  extra: readonly RoleString[],
): readonly RoleString[] {
  const out: RoleString[] = [...primary];
  for (const role of extra) {
    if (!out.includes(role)) out.push(role);
  }
  return Object.freeze(out) as readonly RoleString[];
}

// ── service ────────────────────────────────────────────────────────────────

@Injectable()
export class UserRolesService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly database: IDatabaseService,
    private readonly cls: ClsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'auth.user-roles',
        serviceName: 'UserRolesService',
        flowId: 'FLOW-01',
      }),
    });
  }

  // ── tenant helper ────────────────────────────────────────────────────────

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure(
          'NO_TENANT',
          'TenantContext not found in CLS',
        );
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  // ── resolveRolesForUser ──────────────────────────────────────────────────

  /**
   * Return the full role set for `userId` inside the current CLS tenant.
   *
   * Flow:
   *   1. Look up user record in `xiigen-user-registrations` filtered by
   *      user_id. Fabric applies tenant scoping automatically (DNA-5).
   *   2. Extract tenant-scoped roles via `normaliseRoles()`.
   *   3. Attach any platform-level roles via `attachPlatformRoles()`.
   *   4. If the union is empty, return `[DEFAULT_ROLE]` so guards never see
   *      an un-roled principal.
   *
   * Failure codes:
   *   - NO_TENANT          — CLS has no tenant context
   *   - USER_NOT_FOUND     — no record for userId inside current tenant
   *   - DB_ERROR           — fabric lookup errored (bubbled message)
   */
  async resolveRolesForUser(
    userId: string,
  ): Promise<DataProcessResult<readonly RoleString[]>> {
    if (typeof userId !== 'string' || userId.length === 0) {
      return DataProcessResult.failure(
        'INVALID_USER_ID',
        'userId must be a non-empty string',
      );
    }

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return DataProcessResult.failure(
        tenantResult.errorCode ?? 'NO_TENANT',
        tenantResult.errorMessage ?? 'tenant unavailable',
      );
    }

    const lookup = await this.database.searchDocuments(USERS_INDEX, {
      user_id: userId,
    });
    if (!lookup.isSuccess) {
      return DataProcessResult.failure(
        'DB_ERROR',
        lookup.errorMessage ?? 'user lookup failed',
      );
    }
    const records = lookup.data ?? [];
    if (records.length === 0) {
      return DataProcessResult.failure(
        'USER_NOT_FOUND',
        `user ${userId} not found in tenant`,
      );
    }

    const record = records[0]!;
    const tenantRolesRaw = record['roles'] ?? record['role_list'];
    const tenantRoles = normaliseRoles(tenantRolesRaw);

    const attachResult = await this.attachPlatformRoles(userId, tenantRoles);
    if (!attachResult.isSuccess || !attachResult.data) {
      // Preserve the original tenant roles on platform-lookup failure —
      // never 500 auth because a platform index is temporarily unavailable.
      const fallback = tenantRoles.length > 0 ? tenantRoles : [DEFAULT_ROLE];
      return DataProcessResult.success(fallback);
    }

    const merged = attachResult.data;
    const finalRoles = merged.length > 0 ? merged : [DEFAULT_ROLE];
    return DataProcessResult.success(finalRoles);
  }

  // ── attachPlatformRoles ──────────────────────────────────────────────────

  /**
   * Merge any platform-scoped role assignments for `userId` into `tenantRoles`.
   *
   * The platform-role index is tenant-scoped to the master tenant. When the
   * caller is inside a non-master tenant CLS, the fabric's automatic scope
   * filter returns 0 records — this is the intended isolation boundary and
   * this method simply returns the input roles unchanged.
   *
   * Failure codes:
   *   - DB_ERROR — fabric lookup errored (bubbled). Caller may treat as a
   *                fall-through and keep `tenantRoles`.
   */
  async attachPlatformRoles(
    userId: string,
    tenantRoles: readonly RoleString[],
  ): Promise<DataProcessResult<readonly RoleString[]>> {
    if (typeof userId !== 'string' || userId.length === 0) {
      return DataProcessResult.failure(
        'INVALID_USER_ID',
        'userId must be a non-empty string',
      );
    }

    const lookup = await this.database.searchDocuments(PLATFORM_ROLES_INDEX, {
      user_id: userId,
    });
    if (!lookup.isSuccess) {
      return DataProcessResult.failure(
        'DB_ERROR',
        lookup.errorMessage ?? 'platform role lookup failed',
      );
    }
    const records = lookup.data ?? [];
    if (records.length === 0) {
      return DataProcessResult.success(tenantRoles);
    }

    const platformRoles: RoleString[] = [];
    for (const record of records) {
      const raw = record['roles'] ?? record['role_list'];
      for (const role of normaliseRoles(raw)) {
        if (!platformRoles.includes(role)) platformRoles.push(role);
      }
    }

    return DataProcessResult.success(mergeRoles(tenantRoles, platformRoles));
  }

  // ── health ───────────────────────────────────────────────────────────────

  async checkHealth(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({
      service: 'UserRolesService',
      users_index: USERS_INDEX,
      platform_roles_index: PLATFORM_ROLES_INDEX,
    });
  }
}
