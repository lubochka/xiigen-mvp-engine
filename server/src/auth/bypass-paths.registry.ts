/**
 * Bypass-paths registry — auth plan v3.0 §BYPASS-MAP.
 *
 * Documents every route that is exempt from JWT enforcement.
 * Two exemption mechanisms:
 *
 *   1. @Public() decorator on a NestJS @Controller handler or class.
 *      GlobalJwtAuthGuard reads IS_PUBLIC_KEY metadata via Reflector and
 *      returns true immediately, skipping passport verification.
 *
 *   2. Raw Express routes registered in main.ts via the Router instance.
 *      These never pass through the NestJS guard pipeline at all.
 *
 * This file is documentation-only — it does not change runtime behaviour.
 * Update it whenever a new @Public() route is added or a raw Express route
 * is promoted into the NestJS controller layer.
 */

/**
 * Routes exempted via @Public() on a NestJS controller handler.
 * These go through the guard pipeline but are short-circuited by GlobalJwtAuthGuard.
 */
export const NESTJS_PUBLIC_ROUTES = [
  { method: 'POST', path: '/api/auth/login', reason: 'credential submission — no prior JWT' },
  {
    method: 'POST',
    path: '/api/auth/refresh',
    reason: 'token refresh — token supplied in body, not header',
  },
] as const;

/**
 * Routes exempted via raw Express registration in main.ts.
 * These bypass the NestJS guard pipeline entirely.
 */
export const EXPRESS_BYPASS_ROUTES = [
  {
    method: 'GET',
    path: '/health/live',
    reason: 'liveness probe — infrastructure, not application',
  },
  {
    method: 'GET',
    path: '/health/ready',
    reason: 'readiness probe — infrastructure, not application',
  },
  {
    method: 'GET',
    path: '/health/status',
    reason: 'fabric health report — infrastructure, not application',
  },
  {
    method: 'POST',
    path: '/tenants',
    reason: 'platform bootstrap — tenant creation before any JWT exists',
  },
  { method: 'GET', path: '/tenants', reason: 'platform bootstrap — tenant listing' },
  {
    method: 'GET',
    path: '/dynamic/:indexName',
    reason: 'DNA-6 generic CRUD — tenant-scoped via X-Tenant-Id header',
  },
  {
    method: 'POST',
    path: '/dynamic/:indexName',
    reason: 'DNA-6 generic CRUD — tenant-scoped via X-Tenant-Id header',
  },
] as const;
