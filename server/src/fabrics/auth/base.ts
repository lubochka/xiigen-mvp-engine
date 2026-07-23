/**
 * Auth fabric — internal provider types + constants.
 *
 * Not exported through fabrics/interfaces barrel — external consumers use
 * ITokenService / IPasswordHasherService + their result types only.
 */

/** Supported JWT signing algorithms. */
export enum SignAlg {
  HS256 = 'HS256',
  RS256 = 'RS256',
}

/**
 * Shape of the signing-key payload stored in ISecretsService at
 * `xiigen/auth/jwt_signing_key/${tenantId}`.
 *
 * `value` = key material (raw string for HS256, PEM-encoded private key for RS256).
 * `algorithm` = HS256 (symmetric, default) or RS256 (asymmetric, future).
 */
export interface SigningKeyPayload {
  readonly value: string;
  readonly algorithm: SignAlg;
}

/** Default access-token TTL — 3600s per Luba decision #3 (2026-04-24). */
export const DEFAULT_TOKEN_TTL_SECONDS = 3600;

/** In-memory cache TTL for fetched signing keys, per tenantId. */
export const SIGNING_KEY_CACHE_TTL_MS = 60 * 1000;

/** Per-tenant signing key secret path template. */
export const signingKeySecretPath = (tenantId: string): string =>
  `xiigen/auth/jwt_signing_key/${tenantId}`;

/** bcrypt cost parameter (Auth Plan v3.0 line 355). */
export const BCRYPT_ROUNDS = 12;

/** Matches any bcrypt hash prefix ($2a$ / $2b$ / $2y$) with a 2-digit cost. */
export const BCRYPT_HASH_PATTERN = /^\$2[aby]\$(\d{2})\$/;

/** Reserved top-level JWT claims never copied into the `custom` bucket on verify. */
export const RESERVED_TOP_CLAIMS: ReadonlySet<string> = new Set([
  'sub',
  'iss',
  'aud',
  'exp',
  'iat',
  'jti',
  'tenantId',
  'roles',
]);
