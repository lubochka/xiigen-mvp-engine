/**
 * @Roles() decorator — FLOW-01 Phase A4 role-based access control.
 *
 * Marks a controller or handler as requiring the caller to hold at least
 * one of the listed roles. Consumed by RolesGuard, which reads ScopeContext
 * from CLS and verifies via ScopeContext.hasRole().
 *
 * Usage
 * -----
 * ```ts
 * @Roles('tenant-admin', 'platform-admin')
 * @Post('flow/execute')
 * async executeFlow(...) { ... }
 * ```
 *
 * When the @Roles() decorator is absent the RolesGuard is a pass-through —
 * it does not block routes that haven't declared role requirements. This
 * mirrors the @MasterTenantOnly() pass-through pattern from master-tenant.guard.ts.
 *
 * @connectionType PURE_UTILITY
 * @flowId FLOW-01
 */

import { SetMetadata } from '@nestjs/common';

/** Reflector metadata key read by RolesGuard. */
export const ROLES_KEY = 'auth::roles';

/**
 * Controller / handler decorator — declares which roles the caller must hold.
 * At least one matching role is required (OR semantics, not AND).
 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
