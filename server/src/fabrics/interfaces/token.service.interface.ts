/**
 * FABRIC 11: ITokenService (FLOW-01 Phase A0.5 — Fabric Auth Foundation)
 *
 * Token-signing fabric. JWT concrete default; per-tenant signing keys fetched from
 * ISecretsService — never from process.env. Closes AM-9 (Rule 1 Fabric First).
 *
 * Per-tenant signing isolation (Luba decision #1, 2026-04-24):
 *   Signing key path = 'xiigen/auth/jwt_signing_key/${tenantId}'.
 *   A token minted for tenant A is unverifiable under tenant B's key — cross-tenant
 *   signature mismatch is the STRUCTURAL V-16 guarantee, not a runtime check.
 *
 * Iron Rules:
 *   - Never log token strings or signing keys.
 *   - No tenantId parameter — read TenantContext from CLS internally.
 *   - Never throw for business logic — always return DataProcessResult.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

/** Output of issue() / refresh() — opaque token + expiry + jti. */
export interface TokenIssueResult {
  /** JWT string. */
  readonly token: string;
  /** Expiry as epoch seconds. */
  readonly expiresAt: number;
  /** Unique token id (for revocation / audit). */
  readonly jti: string;
}

/** Output of verify() — validated subject + tenant + roles + custom claims. */
export interface TokenVerifyResult {
  readonly subject: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  /** Custom claims supplied at issue time (excludes sub/iss/aud/exp/iat/jti/tenantId/roles). */
  readonly claims: Record<string, unknown>;
  readonly expiresAt: number;
  readonly jti: string;
}

export abstract class ITokenService {
  /**
   * Issue a signed token for `subject` with `claims.roles` + optional `claims.custom`.
   * Reads current tenantId from CLS; signs with that tenant's key.
   */
  abstract issue(
    subject: string,
    claims: { roles: readonly string[]; custom?: Record<string, unknown> },
    options?: { ttlSeconds?: number; audience?: string },
  ): Promise<DataProcessResult<TokenIssueResult>>;

  /**
   * Verify a token against the CLS tenant's key.
   * Failure codes: TOKEN_EXPIRED, TOKEN_INVALID, TENANT_MISMATCH, SIGNING_KEY_UNAVAILABLE.
   */
  abstract verify(token: string): Promise<DataProcessResult<TokenVerifyResult>>;

  /**
   * Re-issue a token by verifying the old one and minting a fresh one with new jti + exp.
   * Preserves subject, roles, and custom claims.
   */
  abstract refresh(
    token: string,
    options?: { ttlSeconds?: number },
  ): Promise<DataProcessResult<TokenIssueResult>>;

  /** Check provider connectivity + signing-key reachability. */
  abstract healthCheck(): Promise<DataProcessResult<boolean>>;
}

/** Injection token for ITokenService. */
export const TOKEN_SERVICE = Symbol('ITokenService');
