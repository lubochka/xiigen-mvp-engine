/**
 * UserRolesService tests — FLOW-01 Phase A2 (V-03).
 *
 * Covers the two core surface methods (`resolveRolesForUser`,
 * `attachPlatformRoles`) + the two helpers (`normaliseRoles`, `mergeRoles`).
 * V-03 accept criterion: UserRolesService committed with both methods +
 * ≥ 6 tests green. This file ships 14.
 */

import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';
import {
  ROLE_PLATFORM_ADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
  DEFAULT_ROLE,
  RoleString,
} from '../../kernel/role-strings';
import { TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import {
  UserRolesService,
  PLATFORM_ROLES_INDEX,
  normaliseRoles,
  mergeRoles,
} from '../user-roles.service';
import { USERS_INDEX } from '../auth.service';

// ── fakes ────────────────────────────────────────────────────────────────

type DbRecord = Record<string, unknown>;

class FakeDatabase implements Partial<IDatabaseService> {
  public userRecords: DbRecord[] = [];
  public platformRecords: DbRecord[] = [];
  public searchErrorIndex: string | null = null;
  public searchErrorMessage = 'boom';
  public calls: Array<{ index: string; filters: DbRecord }> = [];

  async searchDocuments(
    index: string,
    filters: DbRecord,
  ): Promise<DataProcessResult<DbRecord[]>> {
    this.calls.push({ index, filters });
    if (this.searchErrorIndex === index) {
      return DataProcessResult.failure('DB_ERROR', this.searchErrorMessage);
    }
    const userId = filters['user_id'];
    if (index === USERS_INDEX) {
      const hits = this.userRecords.filter((r) => r['user_id'] === userId);
      return DataProcessResult.success(hits);
    }
    if (index === PLATFORM_ROLES_INDEX) {
      const hits = this.platformRecords.filter((r) => r['user_id'] === userId);
      return DataProcessResult.success(hits);
    }
    return DataProcessResult.success([]);
  }
}

class FakeCls {
  private readonly store = new Map<string, unknown>();
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
  clear(key: string): void {
    this.store.delete(key);
  }
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
}

function makeTenantContext(tenantId = 'acme'): Record<string, unknown> {
  return {
    tenantId,
    tenantName: tenantId,
    status: 'active' as const,
    plan: {
      name: 'pro',
      maxApiCallsPerMinute: 60,
      maxTokensPerDay: 1000,
      maxStorageMb: 100,
    },
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

function makeService(): {
  service: UserRolesService;
  db: FakeDatabase;
  cls: FakeCls;
} {
  const db = new FakeDatabase();
  const cls = new FakeCls();
  cls.set(TENANT_CONTEXT_KEY, makeTenantContext('acme'));
  const service = new UserRolesService(
    db as unknown as IDatabaseService,
    cls as unknown as ClsService,
  );
  return { service, db, cls };
}

// ── normaliseRoles ───────────────────────────────────────────────────────

describe('normaliseRoles', () => {
  it('keeps only canonical role strings, dedupes, and drops unknown values', () => {
    const got = normaliseRoles([
      ROLE_TENANT_USER,
      ROLE_TENANT_ADMIN,
      ROLE_TENANT_USER,
      'bogus',
      42,
      null,
    ]);
    expect(got).toEqual([ROLE_TENANT_USER, ROLE_TENANT_ADMIN]);
  });

  it('returns an empty frozen array when input is not an array', () => {
    const got = normaliseRoles('nope');
    expect(got).toEqual([]);
    expect(() => {
      (got as unknown as RoleString[]).push(ROLE_TENANT_USER);
    }).toThrow();
  });
});

// ── mergeRoles ───────────────────────────────────────────────────────────

describe('mergeRoles', () => {
  it('preserves primary order and appends distinct extras', () => {
    const merged = mergeRoles(
      [ROLE_TENANT_USER],
      [ROLE_TENANT_USER, ROLE_PLATFORM_ADMIN],
    );
    expect(merged).toEqual([ROLE_TENANT_USER, ROLE_PLATFORM_ADMIN]);
  });

  it('returns a frozen array', () => {
    const merged = mergeRoles([ROLE_TENANT_USER], [ROLE_PLATFORM_ADMIN]);
    expect(() => {
      (merged as unknown as RoleString[]).push(ROLE_TENANT_ADMIN);
    }).toThrow();
  });
});

// ── resolveRolesForUser ──────────────────────────────────────────────────

describe('UserRolesService.resolveRolesForUser', () => {
  it('fails with NO_TENANT when CLS has no tenant context', async () => {
    const { service, cls } = makeService();
    cls.clear(TENANT_CONTEXT_KEY);

    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
  });

  it('fails with INVALID_USER_ID when userId is empty', async () => {
    const { service } = makeService();
    const result = await service.resolveRolesForUser('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_USER_ID');
  });

  it('fails with USER_NOT_FOUND when no record exists in tenant', async () => {
    const { service } = makeService();
    const result = await service.resolveRolesForUser('u-ghost');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('USER_NOT_FOUND');
  });

  it('fails with DB_ERROR when users index lookup errors', async () => {
    const { service, db } = makeService();
    db.searchErrorIndex = USERS_INDEX;
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('returns [DEFAULT_ROLE] when user record has no recognisable roles', async () => {
    const { service, db } = makeService();
    db.userRecords.push({ user_id: 'u-1', tenant_id: 'acme', roles: [] });
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([DEFAULT_ROLE]);
  });

  it('returns the user record roles filtered through normaliseRoles', async () => {
    const { service, db } = makeService();
    db.userRecords.push({
      user_id: 'u-1',
      tenant_id: 'acme',
      roles: [ROLE_TENANT_ADMIN, 'bogus', ROLE_TENANT_USER],
    });
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_ADMIN, ROLE_TENANT_USER]);
  });

  it('supports legacy `role_list` field as an alias', async () => {
    const { service, db } = makeService();
    db.userRecords.push({
      user_id: 'u-1',
      tenant_id: 'acme',
      role_list: [ROLE_TENANT_USER],
    });
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_USER]);
  });

  it('merges platform roles into tenant roles when found', async () => {
    const { service, db } = makeService();
    db.userRecords.push({
      user_id: 'u-1',
      tenant_id: 'acme',
      roles: [ROLE_TENANT_ADMIN],
    });
    db.platformRecords.push({
      user_id: 'u-1',
      tenant_id: 'master',
      roles: [ROLE_PLATFORM_ADMIN],
    });
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN]);
  });

  it('falls back to tenant roles when platform lookup fails (never 500 auth)', async () => {
    const { service, db } = makeService();
    db.userRecords.push({
      user_id: 'u-1',
      tenant_id: 'acme',
      roles: [ROLE_TENANT_USER],
    });
    db.searchErrorIndex = PLATFORM_ROLES_INDEX;
    const result = await service.resolveRolesForUser('u-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_USER]);
  });
});

// ── attachPlatformRoles ──────────────────────────────────────────────────

describe('UserRolesService.attachPlatformRoles', () => {
  it('returns tenantRoles unchanged when no platform assignments exist', async () => {
    const { service } = makeService();
    const result = await service.attachPlatformRoles('u-1', [ROLE_TENANT_USER]);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_USER]);
  });

  it('queries the platform-role index with the user_id filter', async () => {
    const { service, db } = makeService();
    await service.attachPlatformRoles('u-42', [ROLE_TENANT_USER]);
    const call = db.calls.find((c) => c.index === PLATFORM_ROLES_INDEX);
    expect(call).toBeDefined();
    expect(call?.filters).toEqual({ user_id: 'u-42' });
  });

  it('merges multiple platform role records + dedupes against tenant roles', async () => {
    const { service, db } = makeService();
    db.platformRecords.push({ user_id: 'u-1', roles: [ROLE_PLATFORM_ADMIN] });
    db.platformRecords.push({ user_id: 'u-1', roles: [ROLE_TENANT_ADMIN] });
    const result = await service.attachPlatformRoles('u-1', [ROLE_TENANT_ADMIN]);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual([ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN]);
  });

  it('fails with DB_ERROR when platform lookup errors', async () => {
    const { service, db } = makeService();
    db.searchErrorIndex = PLATFORM_ROLES_INDEX;
    const result = await service.attachPlatformRoles('u-1', [ROLE_TENANT_USER]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('fails with INVALID_USER_ID for empty userId', async () => {
    const { service } = makeService();
    const result = await service.attachPlatformRoles('', [ROLE_TENANT_USER]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_USER_ID');
  });
});

// ── health ───────────────────────────────────────────────────────────────

describe('UserRolesService.checkHealth', () => {
  it('reports both index names', async () => {
    const { service } = makeService();
    const result = await service.checkHealth();
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({
      service: 'UserRolesService',
      users_index: USERS_INDEX,
      platform_roles_index: PLATFORM_ROLES_INDEX,
    });
  });
});
