/**
 * @Public() decorator — FLOW-01 Phase A4 (V-06).
 *
 * Opt-out marker for the global JwtAuthGuard (jwt-auth.guard.ts). When
 * GlobalJwtAuthGuard executes as an APP_GUARD, any controller/handler
 * decorated with `@Public()` is allowed to proceed without a verified
 * Bearer token.
 *
 * Rationale
 * ---------
 * Phase A4 flips the auth posture from "unauthenticated by default,
 * authenticated where a route explicitly uses @UseGuards(AuthGuard('jwt'))"
 * to "authenticated by default, with explicit @Public() opt-out on routes
 * that genuinely don't need a token (login, refresh, health probes,
 * legacy controllers migrated from the pre-A4 era)".
 *
 * This aligns with RFC 6749 § 3.2 and XIIGEN-AUTH-ROLES-GROUPS-PLAN-v3.0 §
 * "global guard policy" — security-by-default, with an auditable list of
 * public endpoints materialised in code (not buried in an allow-list file).
 *
 * Usage
 * -----
 * ```ts
 * @Public()                 // method-level — only this route is public
 * @Post('login')
 * async login(...) { ... }
 *
 * @Public()                 // class-level — ALL routes on this controller are public
 * @Controller('api/health')
 * export class HealthController { ... }
 * ```
 *
 * Read by GlobalJwtAuthGuard via Reflector.getAllAndOverride(IS_PUBLIC_KEY,
 * [handler, class]). Handler-level @Public() overrides class-level so you
 * can whitelist one method on an otherwise-guarded controller (rare, but
 * useful for e.g. OAuth callback endpoints nested in a protected resource).
 *
 * @connectionType PURE_UTILITY
 * @flowId FLOW-01
 */

import { SetMetadata } from '@nestjs/common';

/** Reflector metadata key read by GlobalJwtAuthGuard. */
export const IS_PUBLIC_KEY = 'auth::is-public';

/**
 * Controller / handler decorator — marks a route (or entire controller) as
 * NOT requiring JWT authentication. Without this decorator, the global
 * JwtAuthGuard enforces a verified Bearer token on every request.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
