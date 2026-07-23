/**
 * Role Strings — central registry of role identifiers used by the Auth Fabric,
 * guards, interceptors, and every service that calls `scope.hasRole(...)`.
 *
 * FLOW-01 Phase A2 (V-03).
 *
 * Motivation
 * ----------
 * Every protocol document (XIIGEN-AUTH-ROLES-GROUPS-PLAN-v3.0 § roles,
 * FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 § LAYER 2 per-role cell matrix)
 * references the same handful of role strings:
 *
 *     platform-admin   — "master tenant" operator (owns the platform itself)
 *     tenant-admin     — owner/operator of a single tenant
 *     tenant-user      — regular end-user inside a tenant
 *     service-account  — machine-to-machine caller inside a tenant
 *     anonymous        — unauthenticated request (no JWT)
 *
 * Placing them here (in kernel — sibling to scope-isolation.ts) means:
 *   1. Zero stringly-typed constants scattered across services.
 *   2. Any typo blocks at compile-time via ROLE_STRING union.
 *   3. Seed scripts, guards, interceptors, and tests import the *same* token.
 *   4. Bundle activation (FLOW-00) resolves role decorators symbolically.
 *
 * This file is deliberately 100 % passive — no imports from Nest, no DI, no
 * side-effects. It's a pure declaration consumed by auth + kernel code.
 *
 * @connectionType PURE_UTILITY
 * @flowId FLOW-01
 */

// ── Canonical role identifiers ────────────────────────────────────────────

/** Platform administrator — master tenant; runs governance + cross-tenant tools. */
export const ROLE_PLATFORM_ADMIN = 'platform-admin' as const;

/** Tenant administrator — owns a single tenant, configures flows + users. */
export const ROLE_TENANT_ADMIN = 'tenant-admin' as const;

/** Standard end-user inside a tenant. Default role for new registrations. */
export const ROLE_TENANT_USER = 'tenant-user' as const;

/** Non-human automation principal inside a tenant (M2M). */
export const ROLE_SERVICE_ACCOUNT = 'service-account' as const;

/** Anonymous caller — no JWT presented. Pinned here so interceptors can assert it. */
export const ROLE_ANONYMOUS = 'anonymous' as const;

// ── Union + arrays (single source of truth) ───────────────────────────────

/**
 * Discriminated union of all legal role strings. Authenticated callers MUST
 * have at least one of these; unauthenticated callers report `ROLE_ANONYMOUS`.
 */
export type RoleString =
  | typeof ROLE_PLATFORM_ADMIN
  | typeof ROLE_TENANT_ADMIN
  | typeof ROLE_TENANT_USER
  | typeof ROLE_SERVICE_ACCOUNT
  | typeof ROLE_ANONYMOUS;

/** Platform roles that imply cross-tenant privilege. */
export const PLATFORM_ROLES: readonly RoleString[] = Object.freeze([
  ROLE_PLATFORM_ADMIN,
]);

/** Roles that scope exclusively inside a single tenant. */
export const TENANT_ROLES: readonly RoleString[] = Object.freeze([
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
  ROLE_SERVICE_ACCOUNT,
]);

/** All recognised roles (platform + tenant + anonymous). */
export const ALL_ROLES: readonly RoleString[] = Object.freeze([
  ROLE_PLATFORM_ADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
  ROLE_SERVICE_ACCOUNT,
  ROLE_ANONYMOUS,
]);

/**
 * Default role assigned to a brand-new registration when the user record
 * carries no explicit `roles[]` claim. AuthService.extractRoles() + seeding
 * script both read this.
 */
export const DEFAULT_ROLE: RoleString = ROLE_TENANT_USER;

// ── Type guards / predicates ──────────────────────────────────────────────

/**
 * True when `value` is one of the five canonical role strings.
 * Used by UserRolesService to filter stored role claims before enriching
 * the ScopeContext (drops bad data instead of trusting a DB record blindly).
 */
export function isRoleString(value: unknown): value is RoleString {
  return typeof value === 'string' && (ALL_ROLES as readonly string[]).includes(value);
}

/** True iff `role` implies cross-tenant/platform privilege. */
export function isPlatformRole(role: RoleString): boolean {
  return (PLATFORM_ROLES as readonly string[]).includes(role);
}

/** True iff `role` is tenant-scoped. */
export function isTenantRole(role: RoleString): boolean {
  return (TENANT_ROLES as readonly string[]).includes(role);
}
