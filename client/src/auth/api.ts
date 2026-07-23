/**
 * Auth API — FLOW-01 Phase A6 (V-08).
 *
 * Thin client wrapper around the three server endpoints shipped in Phase A1:
 *
 *   POST /api/auth/login    — { email, password }            → LoginResponseDto
 *   POST /api/auth/refresh  — { token }                      → LoginResponseDto
 *   GET  /api/auth/me       — Authorization: Bearer <token>  → JwtVerifiedPrincipal
 *
 * The server wraps every response in a `DataProcessResult<T>` envelope
 * (`{ isSuccess, data, error, metadata }`). This module preserves that shape
 * end-to-end so the AuthContext layer can pattern-match cleanly.
 *
 * Why not reuse the shared `ApiClient` (src/api/client.ts)?
 *   - That client injects `X-Tenant-Id` on every request. Login establishes
 *     the tenant — we can't inject it before the token is issued.
 *   - It also retries 5xx errors; for auth we want a single clean failure
 *     surface the UI can render without a stale "still trying" state.
 *   - It doesn't know about Authorization headers. `me()` + `refresh()` need
 *     bearer-token injection directly.
 *
 * Token lifecycle (persisted in AuthContext, not here):
 *   login()   returns a fresh token + expiry.
 *   refresh() accepts a still-valid token and returns a fresh one.
 *   me()      is a probe: a 2xx DPR.success means the token is live.
 *
 * Every function returns `DataProcessResult<T>` — never throws for business
 * failures (DNA-3). Network errors surface as `NETWORK_ERROR` with the
 * underlying message.
 */

import type { DataProcessResult } from '../api/types';
import { failureResult, successResult } from '../api/types';

// ── Shared types (mirror server/src/auth/auth.dto.ts) ──────────────────────

export interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

export interface LoginResponseDto {
  readonly token: string;
  readonly expiresAt: number;
  readonly jti: string;
  readonly userId: string;
  readonly roles: readonly string[];
}

export interface JwtVerifiedPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly jti: string;
  readonly expiresAt: number;
}

// ── Config ─────────────────────────────────────────────────────────────────

export interface AuthApiConfig {
  /** Base URL for the auth endpoints. Defaults to `''` (same-origin `/api/auth`). */
  readonly baseUrl: string;
  /** fetch implementation (dependency injection for tests). */
  readonly fetchFn: typeof fetch;
}

const DEFAULT_CONFIG: AuthApiConfig = {
  baseUrl: '',
  fetchFn:
    typeof fetch === 'function'
      ? fetch.bind(globalThis)
      : (() => {
          throw new Error('fetch is not available — inject fetchFn explicitly');
        }),
};

// ── Internal helpers ───────────────────────────────────────────────────────

/** Unwrap a server response into a DataProcessResult<T>, accepting both envelope casings. */
async function parseDprResponse<T>(
  response: Response,
): Promise<DataProcessResult<T>> {
  const text = await response.text();
  let body: unknown;
  try {
    body = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // Non-JSON — probably an HTML error page from the gateway.
    return failureResult<T>(
      `HTTP_${response.status}`,
      `Server returned non-JSON (HTTP ${response.status}).`,
    );
  }

  if (typeof body === 'object' && body !== null) {
    const envelope = body as Record<string, unknown>;

    // camelCase (primary shape)
    if ('isSuccess' in envelope) {
      return envelope as unknown as DataProcessResult<T>;
    }

    // snake_case (legacy compatibility, matches ApiClient behaviour)
    if ('is_success' in envelope) {
      if (envelope['is_success'] === true) {
        return successResult<T>(envelope['data'] as T);
      }
      return failureResult<T>(
        (envelope['error_code'] as string | undefined) ?? 'SERVER_ERROR',
        (envelope['error_message'] as string | undefined) ??
          'The server reported a failure. Please try again.',
        envelope,
      );
    }

    // Non-enveloped 2xx — wrap as success (e.g. if controller returns raw DTO).
    if (response.ok) {
      return successResult<T>(body as T);
    }

    // Non-enveloped error — extract best available message.
    const humanMessage =
      (envelope['message'] as string | undefined) ??
      (envelope['error'] as string | undefined) ??
      `The server returned an error (HTTP ${response.status}).`;
    return failureResult<T>(`HTTP_${response.status}`, humanMessage);
  }

  if (response.ok) {
    return successResult<T>(body as T);
  }
  return failureResult<T>(
    `HTTP_${response.status}`,
    `The server returned an error (HTTP ${response.status}).`,
  );
}

function networkFailure<T>(err: unknown): DataProcessResult<T> {
  const message = err instanceof Error ? err.message : String(err);
  return failureResult<T>('NETWORK_ERROR', message);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login.
 *
 * Calls the server login endpoint with email + password. On success the
 * returned token is the caller's bearer credential — persist it on the
 * client (AuthContext writes it to localStorage) and inject it as
 * `Authorization: Bearer <token>` on subsequent requests.
 *
 * Failure codes the server is known to return (non-exhaustive):
 *   INVALID_CREDENTIALS, NO_TENANT, DB_ERROR, TOKEN_SIGN_FAILED.
 */
export async function login(
  request: LoginRequestDto,
  config?: Partial<AuthApiConfig>,
): Promise<DataProcessResult<LoginResponseDto>> {
  const cfg: AuthApiConfig = { ...DEFAULT_CONFIG, ...config };
  try {
    const response = await cfg.fetchFn(`${cfg.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return parseDprResponse<LoginResponseDto>(response);
  } catch (err) {
    return networkFailure<LoginResponseDto>(err);
  }
}

/**
 * POST /api/auth/refresh.
 *
 * Exchange a still-valid token for a freshly issued one with new `jti` and
 * `expiresAt`. Subject + roles + custom claims are preserved by the server.
 * A call with an already-expired token returns `TOKEN_EXPIRED` (not
 * INVALID_CREDENTIALS).
 */
export async function refresh(
  token: string,
  config?: Partial<AuthApiConfig>,
): Promise<DataProcessResult<LoginResponseDto>> {
  const cfg: AuthApiConfig = { ...DEFAULT_CONFIG, ...config };
  try {
    const response = await cfg.fetchFn(`${cfg.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return parseDprResponse<LoginResponseDto>(response);
  } catch (err) {
    return networkFailure<LoginResponseDto>(err);
  }
}

/**
 * GET /api/auth/me.
 *
 * Probe the current token — a DPR.success means the backend accepts it. The
 * returned principal carries `userId`, `tenantId`, and `roles` for UI-side
 * role-based rendering.
 */
export async function me(
  token: string,
  config?: Partial<AuthApiConfig>,
): Promise<DataProcessResult<JwtVerifiedPrincipal>> {
  const cfg: AuthApiConfig = { ...DEFAULT_CONFIG, ...config };
  try {
    const response = await cfg.fetchFn(`${cfg.baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return parseDprResponse<JwtVerifiedPrincipal>(response);
  } catch (err) {
    return networkFailure<JwtVerifiedPrincipal>(err);
  }
}
