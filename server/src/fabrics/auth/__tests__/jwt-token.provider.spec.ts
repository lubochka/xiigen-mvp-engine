/**
 * JwtTokenProvider tests — FLOW-01 Phase A0.5.
 *
 * Validates ITokenService contract including per-tenant signing-key isolation:
 *   - Tenant A and Tenant B with DIFFERENT signing keys → cross-tenant token
 *     verification fails on signature (V-16 STRUCTURAL guarantee).
 *   - Tenant A and Tenant B with SAME signing key → cross-tenant token
 *     verification fails on tenantId claim mismatch (defense-in-depth).
 */

import * as jwt from 'jsonwebtoken';
import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  TenantRecord,
} from '../../../kernel/multi-tenant/tenant-context';
import { ISecretsService } from '../../interfaces/secrets.interface';
import { JwtTokenProvider } from '../jwt-token.provider';
import { SignAlg, signingKeySecretPath } from '../base';

// ── Test harness ─────────────────────────────────────────────────────────────

class FakeClsService {
  private store: Record<string, unknown> = {};
  setTenant(ctx: TenantContext): void {
    this.store[TENANT_CONTEXT_KEY] = ctx;
  }
  clearTenant(): void {
    delete this.store[TENANT_CONTEXT_KEY];
  }
  get<T>(key: string): T | undefined {
    return this.store[key] as T | undefined;
  }
}

class FakeSecretsService implements Partial<ISecretsService> {
  private readonly store = new Map<string, { value: string; algorithm: SignAlg }>();

  setKey(tenantId: string, value: string, algorithm: SignAlg = SignAlg.HS256): void {
    this.store.set(signingKeySecretPath(tenantId), { value, algorithm });
  }

  async getSecret(path: string): Promise<DataProcessResult<Record<string, unknown>>> {
    const key = this.store.get(path);
    if (!key) {
      return DataProcessResult.failure('SECRET_NOT_FOUND', `secret at '${path}' not found`);
    }
    return DataProcessResult.success({ value: key.value, algorithm: key.algorithm });
  }

  async setSecret(): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.failure('NOT_IMPL', 'not implemented');
  }
  async deleteSecret(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.failure('NOT_IMPL', 'not implemented');
  }
  async listSecrets(): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    return DataProcessResult.failure('NOT_IMPL', 'not implemented');
  }
  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

function makeTenant(tenantId: string): TenantContext {
  const record: TenantRecord = {
    id: tenantId,
    name: `tenant-${tenantId}`,
    status: 'active',
    plan: {
      name: 'free',
      maxApiCallsPerMinute: 60,
      maxTokensPerDay: 100_000,
      maxStorageMb: 500,
    },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return new TenantContext(record);
}

const KEY_TENANT_A = 'test-signing-key-tenant-a-super-secret-32bytes';
const KEY_TENANT_B = 'test-signing-key-tenant-b-super-secret-32bytes';

// ── Suite ────────────────────────────────────────────────────────────────────

describe('JwtTokenProvider (ITokenService)', () => {
  let cls: FakeClsService;
  let secrets: FakeSecretsService;
  let provider: JwtTokenProvider;

  beforeEach(() => {
    cls = new FakeClsService();
    secrets = new FakeSecretsService();
    secrets.setKey('tenantA', KEY_TENANT_A);
    secrets.setKey('tenantB', KEY_TENANT_B);
    provider = new JwtTokenProvider(
      cls as unknown as ClsService,
      secrets as unknown as ISecretsService,
    );
  });

  // ── issue/verify round-trip ────────────────────────────────────────────────

  it('issue → verify preserves subject, tenantId, and roles', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-42', {
      roles: ['admin', 'tenant_owner'],
      custom: { scope: 'registration' },
    });
    expect(issued.isSuccess).toBe(true);
    const token = issued.data!.token;

    const verified = await provider.verify(token);
    expect(verified.isSuccess).toBe(true);
    expect(verified.data!.subject).toBe('user-42');
    expect(verified.data!.tenantId).toBe('tenantA');
    expect(verified.data!.roles).toEqual(['admin', 'tenant_owner']);
    expect(verified.data!.claims['scope']).toBe('registration');
    expect(verified.data!.jti).toBe(issued.data!.jti);
  });

  it('issued token contains iss/sub/aud/exp/iat/jti claims decodable via jwt.decode', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-1', { roles: [] });
    expect(issued.isSuccess).toBe(true);

    const decoded = jwt.decode(issued.data!.token) as jwt.JwtPayload;
    expect(decoded).not.toBeNull();
    expect(decoded.iss).toBe('xiigen');
    expect(decoded.sub).toBe('user-1');
    expect(decoded.aud).toBe('tenantA');
    expect(typeof decoded.exp).toBe('number');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded['jti']).toBe('string');
    expect(decoded['tenantId']).toBe('tenantA');
  });

  // ── expiry ─────────────────────────────────────────────────────────────────

  it('expired token → verify returns TOKEN_EXPIRED', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-x', { roles: [] }, { ttlSeconds: -60 });
    expect(issued.isSuccess).toBe(true);

    const verified = await provider.verify(issued.data!.token);
    expect(verified.isSuccess).toBe(false);
    expect(verified.errorCode).toBe('TOKEN_EXPIRED');
  });

  // ── tampering ──────────────────────────────────────────────────────────────

  it('tampered signature → verify returns TOKEN_INVALID', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-x', { roles: [] });
    const parts = issued.data!.token.split('.');
    // Flip one char in the signature segment.
    parts[2] = parts[2]!.slice(0, -1) + (parts[2]!.slice(-1) === 'A' ? 'B' : 'A');
    const tampered = parts.join('.');

    const verified = await provider.verify(tampered);
    expect(verified.isSuccess).toBe(false);
    expect(verified.errorCode).toBe('TOKEN_INVALID');
  });

  it('tampered payload (re-encoded) → verify returns TOKEN_INVALID', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-x', { roles: ['reader'] });
    const parts = issued.data!.token.split('.');
    // Forge payload with elevated role but keep original signature — signature should mismatch.
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sub: 'user-x',
        iss: 'xiigen',
        aud: 'tenantA',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'forged-jti',
        tenantId: 'tenantA',
        roles: ['admin'],
      }),
    ).toString('base64url');
    parts[1] = forgedPayload;
    const tampered = parts.join('.');

    const verified = await provider.verify(tampered);
    expect(verified.isSuccess).toBe(false);
    expect(verified.errorCode).toBe('TOKEN_INVALID');
  });

  // ── missing signing key ────────────────────────────────────────────────────

  it('missing signing key → issue returns SIGNING_KEY_UNAVAILABLE', async () => {
    cls.setTenant(makeTenant('tenantC')); // no key seeded for tenantC
    const issued = await provider.issue('user-x', { roles: [] });
    expect(issued.isSuccess).toBe(false);
    expect(issued.errorCode).toBe('SIGNING_KEY_UNAVAILABLE');
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  it('refresh of valid token issues a new jti with same subject and later/equal exp', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const first = await provider.issue('user-r', { roles: ['r1'] });
    // Wait 1.1s to guarantee a later exp timestamp (jwt's iat is seconds-resolution).
    await new Promise((r) => setTimeout(r, 1100));

    const refreshed = await provider.refresh(first.data!.token);
    expect(refreshed.isSuccess).toBe(true);
    expect(refreshed.data!.jti).not.toBe(first.data!.jti);
    expect(refreshed.data!.expiresAt).toBeGreaterThanOrEqual(first.data!.expiresAt);

    const verified = await provider.verify(refreshed.data!.token);
    expect(verified.isSuccess).toBe(true);
    expect(verified.data!.subject).toBe('user-r');
    expect(verified.data!.roles).toEqual(['r1']);
  });

  it('refresh of expired token returns TOKEN_EXPIRED', async () => {
    cls.setTenant(makeTenant('tenantA'));
    const issued = await provider.issue('user-z', { roles: [] }, { ttlSeconds: -60 });
    const refreshed = await provider.refresh(issued.data!.token);
    expect(refreshed.isSuccess).toBe(false);
    expect(refreshed.errorCode).toBe('TOKEN_EXPIRED');
  });

  // ── cross-tenant isolation ─────────────────────────────────────────────────

  it('CLS tenant A, token minted under DIFFERENT tenant B key → TOKEN_INVALID (V-16 STRUCTURAL)', async () => {
    // Issue a token manually under tenant B's key, tenantId claim = 'tenantB'.
    const bToken = jwt.sign(
      {
        sub: 'impersonator',
        iss: 'xiigen',
        aud: 'tenantB',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'cross-tenant-jti',
        tenantId: 'tenantB',
        roles: ['admin'],
      },
      KEY_TENANT_B,
      { algorithm: 'HS256' },
    );

    // Switch CLS to tenant A (whose key is different).
    cls.setTenant(makeTenant('tenantA'));
    const verified = await provider.verify(bToken);
    expect(verified.isSuccess).toBe(false);
    // Verifying under tenant A's key fails at the signature step.
    expect(verified.errorCode).toBe('TOKEN_INVALID');
  });

  it('CLS tenant A, token minted under SAME key but tenantId claim = B → TENANT_MISMATCH (defense-in-depth)', async () => {
    // Seed same key for both tenants (simulating a misconfig).
    secrets.setKey('tenantA', KEY_TENANT_A);
    secrets.setKey('tenantB', KEY_TENANT_A); // intentional collision
    provider.clearKeyCache();

    // Hand-craft a token with tenantId=B, signed with the (shared) key.
    const forged = jwt.sign(
      {
        sub: 'impersonator',
        iss: 'xiigen',
        aud: 'tenantB',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        jti: 'dfd-jti',
        tenantId: 'tenantB',
        roles: ['admin'],
      },
      KEY_TENANT_A,
      { algorithm: 'HS256' },
    );

    cls.setTenant(makeTenant('tenantA'));
    const verified = await provider.verify(forged);
    expect(verified.isSuccess).toBe(false);
    expect(verified.errorCode).toBe('TENANT_MISMATCH');
  });

  // ── no tenant ──────────────────────────────────────────────────────────────

  it('issue without CLS tenant context → NO_TENANT', async () => {
    // intentionally do not setTenant
    const issued = await provider.issue('user-x', { roles: [] });
    expect(issued.isSuccess).toBe(false);
    expect(issued.errorCode).toBe('NO_TENANT');
  });

  // ── healthCheck ────────────────────────────────────────────────────────────

  it('healthCheck returns success=true', async () => {
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBe(true);
  });
});
