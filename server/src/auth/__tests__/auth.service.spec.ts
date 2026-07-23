/**
 * AuthService tests — FLOW-01 Phase A1.
 *
 * Focus:
 *   - extends MicroserviceBase (V-02 contract)
 *   - validateCredentials: not-found, unverified, cross-tenant, wrong password, success
 *   - login: delegates to token service, propagates roles
 *   - refresh: re-issues token while preserving subject + roles
 *   - DNA-3: never throws; all paths return DataProcessResult
 */

import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase } from '../../kernel/microservice-base';
import { TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import {
  TokenIssueResult,
  TokenVerifyResult,
  ITokenService,
} from '../../fabrics/interfaces/token.service.interface';
import {
  CompareResult,
  HashResult,
  IPasswordHasherService,
} from '../../fabrics/interfaces/password-hasher.service.interface';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';
import { DEFAULT_ROLE, RoleString } from '../../kernel/role-strings';
import { UserRolesService } from '../user-roles.service';
import { AuthService, USERS_INDEX } from '../auth.service';

// ── Fakes ────────────────────────────────────────────────────────────────────

class FakeCls {
  private readonly store = new Map<string, unknown>();
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
}

class FakeDatabase implements Partial<IDatabaseService> {
  public searchCalls: Array<{ index: string; filters: Record<string, unknown> }> = [];
  public records: Array<Record<string, unknown>> = [];
  public searchOverride?: () => Promise<
    DataProcessResult<Array<Record<string, unknown>>>
  >;

  async searchDocuments(
    index: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    this.searchCalls.push({ index, filters });
    if (this.searchOverride) return this.searchOverride();
    const email = filters['email'];
    const hits = this.records.filter((r) => r['email'] === email);
    return DataProcessResult.success(hits);
  }
}

class FakeTokens implements Partial<ITokenService> {
  public issueCalls: Array<{
    subject: string;
    roles: readonly string[];
  }> = [];
  public lastRefreshInput?: string;
  public verifyResponse: DataProcessResult<TokenVerifyResult> = DataProcessResult.success({
    subject: 'u-1',
    tenantId: 'acme',
    roles: ['tenant-user'],
    claims: {},
    expiresAt: Math.floor(Date.now() / 1000) + 1000,
    jti: 'jti-verify',
  });
  public issueResponse: DataProcessResult<TokenIssueResult> = DataProcessResult.success({
    token: 'jwt.stub',
    expiresAt: Math.floor(Date.now() / 1000) + 1000,
    jti: 'jti-issue',
  });
  public refreshResponse: DataProcessResult<TokenIssueResult> = DataProcessResult.success({
    token: 'jwt.refreshed',
    expiresAt: Math.floor(Date.now() / 1000) + 2000,
    jti: 'jti-refreshed',
  });

  async issue(
    subject: string,
    claims: { roles: readonly string[] },
  ): Promise<DataProcessResult<TokenIssueResult>> {
    this.issueCalls.push({ subject, roles: claims.roles });
    return this.issueResponse;
  }
  async verify(_token: string): Promise<DataProcessResult<TokenVerifyResult>> {
    return this.verifyResponse;
  }
  async refresh(token: string): Promise<DataProcessResult<TokenIssueResult>> {
    this.lastRefreshInput = token;
    return this.refreshResponse;
  }
  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

/**
 * FakeUserRolesService — mirrors the prior inline `extractRoles()` placeholder:
 * read roles (or role_list) off the first matching user record and fall back to
 * DEFAULT_ROLE. Good enough for AuthService unit tests — the real merge
 * semantics (platform + tenant) are exercised in user-roles.service.spec.ts
 * and in the Phase B1 42-cell matrix.
 */
class FakeUserRoles implements Partial<UserRolesService> {
  public lastUserId?: string;
  public override?: (
    userId: string,
  ) => Promise<DataProcessResult<readonly RoleString[]>>;

  constructor(private readonly database: FakeDatabase) {}

  async resolveRolesForUser(
    userId: string,
  ): Promise<DataProcessResult<readonly RoleString[]>> {
    this.lastUserId = userId;
    if (this.override) return this.override(userId);
    const hit = this.database.records.find((r) => r['user_id'] === userId);
    if (!hit) return DataProcessResult.success([DEFAULT_ROLE] as readonly RoleString[]);
    const raw = hit['roles'] ?? hit['role_list'];
    if (Array.isArray(raw) && raw.every((x) => typeof x === 'string')) {
      return DataProcessResult.success(raw as readonly RoleString[]);
    }
    return DataProcessResult.success([DEFAULT_ROLE] as readonly RoleString[]);
  }
}

class FakeHasher implements Partial<IPasswordHasherService> {
  public expectedPlaintext?: string;
  public expectedHash?: string;
  public compareResult: DataProcessResult<CompareResult> = DataProcessResult.success({
    matches: true,
  });

  async compare(
    plaintext: string,
    hashed: string,
  ): Promise<DataProcessResult<CompareResult>> {
    this.expectedPlaintext = plaintext;
    this.expectedHash = hashed;
    return this.compareResult;
  }
  async hash(_plaintext: string): Promise<DataProcessResult<HashResult>> {
    return DataProcessResult.success({ hash: 'h', algorithm: 'bcrypt', rounds: 12 });
  }
  async needsRehash(_hashed: string): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(false);
  }
  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTenantContext(tenantId = 'acme') {
  return {
    tenantId,
    tenantName: tenantId,
    status: 'active' as const,
    plan: { name: 'pro', maxApiCallsPerMinute: 60, maxTokensPerDay: 1000, maxStorageMb: 100 },
    configOverrides: {},
    apiKeys: {},
    get isActive() {
      return true;
    },
    getConfigOverride: () => undefined,
    getApiKey: () => undefined,
    toSafeDict: () => ({}),
  };
}

function verifiedUserRecord(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'u-1',
    email: 'alice@acme.test',
    credentials_hash: 'bcrypt-hash',
    status: 'verified',
    tenant_id: 'acme',
    ...overrides,
  };
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let cls: FakeCls;
  let database: FakeDatabase;
  let tokens: FakeTokens;
  let hasher: FakeHasher;
  let userRoles: FakeUserRoles;
  let service: AuthService;

  beforeEach(() => {
    cls = new FakeCls();
    cls.set(TENANT_CONTEXT_KEY, makeTenantContext('acme'));
    database = new FakeDatabase();
    tokens = new FakeTokens();
    hasher = new FakeHasher();
    userRoles = new FakeUserRoles(database);
    service = new AuthService(
      database as unknown as IDatabaseService,
      tokens as unknown as ITokenService,
      hasher as unknown as IPasswordHasherService,
      userRoles as unknown as UserRolesService,
      cls as unknown as ClsService,
    );
  });

  it('extends MicroserviceBase (V-02 DNA-4 contract)', () => {
    expect(service).toBeInstanceOf(MicroserviceBase);
    expect(service.serviceName).toBe('AuthService');
    expect(service.descriptor.flowId).toBe('FLOW-01');
  });

  describe('validateCredentials', () => {
    it('returns INVALID_CREDENTIALS on empty email or password', async () => {
      const a = await service.validateCredentials('', 'pw');
      const b = await service.validateCredentials('x@y', '');
      expect(a.isSuccess).toBe(false);
      expect(a.errorCode).toBe('INVALID_CREDENTIALS');
      expect(b.isSuccess).toBe(false);
      expect(b.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('returns NO_TENANT when CLS is empty', async () => {
      cls = new FakeCls(); // no tenant set
      service = new AuthService(
        database as unknown as IDatabaseService,
        tokens as unknown as ITokenService,
        hasher as unknown as IPasswordHasherService,
        userRoles as unknown as UserRolesService,
        cls as unknown as ClsService,
      );
      const result = await service.validateCredentials('a@b', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });

    it('returns INVALID_CREDENTIALS when email not found (uniform shape)', async () => {
      database.records = [];
      const result = await service.validateCredentials('missing@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('queries the correct xiigen-user-registrations index by email', async () => {
      database.records = [verifiedUserRecord()];
      await service.validateCredentials('alice@acme.test', 'pw');
      expect(database.searchCalls[0]).toEqual({
        index: USERS_INDEX,
        filters: { email: 'alice@acme.test' },
      });
    });

    it('rejects cross-tenant records even if email matches (V-16 insurance)', async () => {
      database.records = [verifiedUserRecord({ tenant_id: 'northwind' })];
      const result = await service.validateCredentials('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('rejects unverified accounts (status != verified)', async () => {
      database.records = [verifiedUserRecord({ status: 'unverified' })];
      const result = await service.validateCredentials('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('rejects when hasher.compare returns matches=false', async () => {
      database.records = [verifiedUserRecord()];
      hasher.compareResult = DataProcessResult.success({ matches: false });
      const result = await service.validateCredentials('alice@acme.test', 'wrong-pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('returns DB_ERROR on search failure', async () => {
      database.searchOverride = async () =>
        DataProcessResult.failure('CLUSTER_DOWN', 'ES down');
      const result = await service.validateCredentials('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
    });

    it('returns AuthenticatedUser with default role tenant-user when record has no roles', async () => {
      database.records = [verifiedUserRecord()];
      const result = await service.validateCredentials('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual({
        userId: 'u-1',
        email: 'alice@acme.test',
        tenantId: 'acme',
        roles: ['tenant-user'],
      });
    });

    it('propagates record.roles when present', async () => {
      database.records = [
        verifiedUserRecord({ roles: ['tenant-admin', 'marketplace-admin'] }),
      ];
      const result = await service.validateCredentials('alice@acme.test', 'pw');
      expect(result.data?.roles).toEqual(['tenant-admin', 'marketplace-admin']);
    });
  });

  describe('login', () => {
    it('issues a token with the resolved roles', async () => {
      database.records = [verifiedUserRecord({ roles: ['tenant-admin'] })];
      const result = await service.login('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.token).toBe('jwt.stub');
      expect(result.data?.userId).toBe('u-1');
      expect(result.data?.roles).toEqual(['tenant-admin']);
      expect(tokens.issueCalls).toHaveLength(1);
      expect(tokens.issueCalls[0]).toEqual({ subject: 'u-1', roles: ['tenant-admin'] });
    });

    it('propagates INVALID_CREDENTIALS without calling tokens.issue', async () => {
      database.records = [];
      const result = await service.login('missing@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
      expect(tokens.issueCalls).toHaveLength(0);
    });

    it('returns token error when tokens.issue fails', async () => {
      database.records = [verifiedUserRecord()];
      tokens.issueResponse = DataProcessResult.failure('SIGNING_KEY_UNAVAILABLE', 'boom');
      const result = await service.login('alice@acme.test', 'pw');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SIGNING_KEY_UNAVAILABLE');
    });
  });

  describe('refresh', () => {
    it('verifies the token then issues a refreshed one', async () => {
      const result = await service.refresh('old.jwt');
      expect(result.isSuccess).toBe(true);
      expect(tokens.lastRefreshInput).toBe('old.jwt');
      expect(result.data?.token).toBe('jwt.refreshed');
      expect(result.data?.userId).toBe('u-1');
      expect(result.data?.roles).toEqual(['tenant-user']);
    });

    it('returns INVALID_TOKEN on empty input without calling verify/refresh', async () => {
      const result = await service.refresh('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_TOKEN');
      expect(tokens.lastRefreshInput).toBeUndefined();
    });

    it('returns verify error when tokens.verify fails', async () => {
      tokens.verifyResponse = DataProcessResult.failure('TOKEN_EXPIRED', 'expired');
      const result = await service.refresh('dead.jwt');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });
  });

  describe('checkHealth', () => {
    it('aggregates provider health', async () => {
      const result = await service.checkHealth();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual({
        service: 'AuthService',
        tokens_healthy: true,
        hasher_healthy: true,
      });
    });
  });
});
