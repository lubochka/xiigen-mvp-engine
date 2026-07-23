/**
 * JwtTokenProvider — ITokenService concrete using jsonwebtoken + per-tenant signing keys.
 *
 * Per-tenant signing isolation (Luba decision #1, 2026-04-24):
 *   - Signing key fetched from ISecretsService.getSecret('xiigen/auth/jwt_signing_key/${tenantId}').
 *   - Per-tenant in-memory cache, 60s TTL.
 *   - Wrong-tenant-key verification fails structurally (JsonWebTokenError invalid signature)
 *     — this IS the V-16 cross-tenant JWT guarantee.
 *
 * JWT TTL default 3600s (Luba decision #3, 2026-04-24). HS256 default (RS256 forward-compat).
 *
 * Iron Rules:
 *   - Never log token strings or signing keys.
 *   - Never take tenantId as a parameter — read TenantContext from CLS.
 *   - Never throw for business logic — return DataProcessResult.failure() or .error().
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import {
  ITokenService,
  TokenIssueResult,
  TokenVerifyResult,
} from '../interfaces/token.service.interface';
import { ISecretsService, SECRETS_SERVICE } from '../interfaces/secrets.interface';
import {
  SignAlg,
  DEFAULT_TOKEN_TTL_SECONDS,
  SIGNING_KEY_CACHE_TTL_MS,
  signingKeySecretPath,
  RESERVED_TOP_CLAIMS,
} from './base';

interface CachedKey {
  readonly value: string;
  readonly algorithm: SignAlg;
  readonly fetchedAt: number;
}

@Injectable()
export class JwtTokenProvider extends ITokenService {
  /** Per-tenant signing-key cache. Key: tenantId → CachedKey. */
  private readonly keyCache = new Map<string, CachedKey>();

  /** Non-sensitive issuer claim — safe from env. */
  private readonly issuer: string;

  constructor(
    private readonly cls: ClsService,
    @Inject(SECRETS_SERVICE) private readonly secrets: ISecretsService,
  ) {
    super();
    this.issuer = process.env['JWT_ISSUER'] ?? 'xiigen';
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private async fetchSigningKey(tenantId: string): Promise<DataProcessResult<CachedKey>> {
    const cached = this.keyCache.get(tenantId);
    if (cached && Date.now() - cached.fetchedAt < SIGNING_KEY_CACHE_TTL_MS) {
      return DataProcessResult.success(cached);
    }

    const path = signingKeySecretPath(tenantId);
    const secretResult = await this.secrets.getSecret(path);
    if (!secretResult.isSuccess || !secretResult.data) {
      return DataProcessResult.failure(
        'SIGNING_KEY_UNAVAILABLE',
        `Signing key at '${path}' not available: ${secretResult.errorCode ?? 'UNKNOWN'}`,
      );
    }

    const payload = secretResult.data;
    const value = payload['value'];
    const algorithmRaw = payload['algorithm'] as SignAlg | undefined;
    const algorithm = algorithmRaw ?? SignAlg.HS256;

    if (typeof value !== 'string' || value.length === 0) {
      return DataProcessResult.failure(
        'SIGNING_KEY_MALFORMED',
        `Signing key at '${path}' has invalid 'value' field`,
      );
    }
    if (algorithm !== SignAlg.HS256 && algorithm !== SignAlg.RS256) {
      return DataProcessResult.failure(
        'SIGNING_KEY_MALFORMED',
        `Signing key at '${path}' has unsupported algorithm '${String(algorithm)}'`,
      );
    }

    const entry: CachedKey = { value, algorithm, fetchedAt: Date.now() };
    this.keyCache.set(tenantId, entry);
    return DataProcessResult.success(entry);
  }

  async issue(
    subject: string,
    claims: { roles: readonly string[]; custom?: Record<string, unknown> },
    options?: { ttlSeconds?: number; audience?: string },
  ): Promise<DataProcessResult<TokenIssueResult>> {
    if (typeof subject !== 'string' || subject.length === 0) {
      return DataProcessResult.failure('INVALID_SUBJECT', 'subject cannot be empty');
    }

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return DataProcessResult.failure(
        tenantResult.errorCode ?? 'NO_TENANT',
        tenantResult.errorMessage ?? 'tenant unavailable',
      );
    }
    const tenantId = tenantResult.data;

    const keyResult = await this.fetchSigningKey(tenantId);
    if (!keyResult.isSuccess || !keyResult.data) {
      return DataProcessResult.failure(
        keyResult.errorCode ?? 'SIGNING_KEY_UNAVAILABLE',
        keyResult.errorMessage ?? 'signing key unavailable',
      );
    }
    const { value: signingKey, algorithm } = keyResult.data;

    const ttlSeconds = options?.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + ttlSeconds;
    const jti = randomUUID();
    const audience = options?.audience ?? tenantId;

    // Merge custom claims first, then fixed top-level claims — top-level wins.
    const basePayload: Record<string, unknown> = { ...(claims.custom ?? {}) };
    for (const reserved of RESERVED_TOP_CLAIMS) {
      delete basePayload[reserved];
    }
    const payload: Record<string, unknown> = {
      ...basePayload,
      sub: subject,
      iss: this.issuer,
      aud: audience,
      exp,
      iat: now,
      jti,
      tenantId,
      roles: [...claims.roles],
    };

    try {
      const token = jwt.sign(payload, signingKey, { algorithm });
      return DataProcessResult.success({ token, expiresAt: exp, jti });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('TOKEN_SIGN_FAILED', err.message, err);
    }
  }

  async verify(token: string): Promise<DataProcessResult<TokenVerifyResult>> {
    if (typeof token !== 'string' || token.length === 0) {
      return DataProcessResult.failure('INVALID_TOKEN', 'token cannot be empty');
    }

    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess || !tenantResult.data) {
      return DataProcessResult.failure(
        tenantResult.errorCode ?? 'NO_TENANT',
        tenantResult.errorMessage ?? 'tenant unavailable',
      );
    }
    const clsTenantId = tenantResult.data;

    const keyResult = await this.fetchSigningKey(clsTenantId);
    if (!keyResult.isSuccess || !keyResult.data) {
      return DataProcessResult.failure(
        keyResult.errorCode ?? 'SIGNING_KEY_UNAVAILABLE',
        keyResult.errorMessage ?? 'signing key unavailable',
      );
    }
    const { value: signingKey, algorithm } = keyResult.data;

    let decoded: jwt.JwtPayload;
    try {
      const raw = jwt.verify(token, signingKey, { algorithms: [algorithm] });
      if (typeof raw === 'string') {
        return DataProcessResult.failure('TOKEN_INVALID', 'token payload is not an object');
      }
      decoded = raw;
    } catch (e) {
      if (e instanceof jwt.TokenExpiredError) {
        return DataProcessResult.failure('TOKEN_EXPIRED', 'token has expired');
      }
      if (e instanceof jwt.JsonWebTokenError) {
        return DataProcessResult.failure('TOKEN_INVALID', 'token signature or payload invalid');
      }
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('TOKEN_VERIFY_FAILED', err.message, err);
    }

    const tokenTenantId = decoded['tenantId'];
    if (tokenTenantId !== clsTenantId) {
      return DataProcessResult.failure(
        'TENANT_MISMATCH',
        `token tenant '${String(tokenTenantId)}' does not match CLS tenant '${clsTenantId}'`,
      );
    }

    const subject = decoded.sub;
    const jti = decoded['jti'];
    const exp = decoded.exp;
    const rolesRaw = decoded['roles'];

    if (typeof subject !== 'string' || typeof jti !== 'string' || typeof exp !== 'number') {
      return DataProcessResult.failure(
        'TOKEN_INVALID',
        'token missing required claims (sub/jti/exp)',
      );
    }
    if (!Array.isArray(rolesRaw) || !rolesRaw.every((r) => typeof r === 'string')) {
      return DataProcessResult.failure('TOKEN_INVALID', 'token roles claim malformed');
    }

    const customClaims: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(decoded)) {
      if (!RESERVED_TOP_CLAIMS.has(k)) {
        customClaims[k] = v;
      }
    }

    return DataProcessResult.success({
      subject,
      tenantId: clsTenantId,
      roles: rolesRaw as string[],
      claims: customClaims,
      expiresAt: exp,
      jti,
    });
  }

  async refresh(
    token: string,
    options?: { ttlSeconds?: number },
  ): Promise<DataProcessResult<TokenIssueResult>> {
    const verifyResult = await this.verify(token);
    if (!verifyResult.isSuccess || !verifyResult.data) {
      return DataProcessResult.failure(
        verifyResult.errorCode ?? 'TOKEN_INVALID',
        verifyResult.errorMessage ?? 'token verification failed',
      );
    }

    const { subject, roles, claims } = verifyResult.data;
    return this.issue(subject, { roles, custom: claims }, options);
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }

  // ── Testing helpers ─────────────────────────────────────────────────────────

  /** Invalidate cached signing key for a tenant. Test-only. */
  invalidateKey(tenantId: string): void {
    this.keyCache.delete(tenantId);
  }

  /** Clear all cached signing keys. Test-only. */
  clearKeyCache(): void {
    this.keyCache.clear();
  }
}
