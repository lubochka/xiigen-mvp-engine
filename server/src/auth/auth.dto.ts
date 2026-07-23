/**
 * Auth DTOs — FLOW-01 Phase A1.
 *
 * Plain-shape request/response objects used by AuthController + strategies.
 * No class-validator decorators (project convention: validation lives in AuthService).
 */

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RefreshRequestDto {
  token: string;
}

export interface LoginResponseDto {
  /** Opaque JWT string. Never logged. */
  token: string;
  /** Expiry as epoch seconds. */
  expiresAt: number;
  /** Unique token id (audit / revocation). */
  jti: string;
  /** Stable user identifier. */
  userId: string;
  /** Authoritative role list at issue time. */
  roles: readonly string[];
}

/**
 * Shape returned by local.strategy validate() and attached to req.user after
 * AuthGuard('local'). Never contains the password hash.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string;
  roles: readonly string[];
}

/**
 * Shape returned by jwt.strategy validate() and attached to req.user after
 * AuthGuard('jwt'). Mirrors ITokenService.verify() output without custom claims.
 */
export interface JwtVerifiedPrincipal {
  userId: string;
  tenantId: string;
  roles: readonly string[];
  jti: string;
  expiresAt: number;
}
