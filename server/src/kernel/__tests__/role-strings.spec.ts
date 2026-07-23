/**
 * role-strings tests — FLOW-01 Phase A2 (V-03 support).
 *
 * Locks the canonical role constants + type guards. Any future mis-refactor
 * that changes a role string breaks this suite immediately, preventing
 * silent drift between guards, seeding scripts, and auth services.
 */

import {
  ROLE_PLATFORM_ADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
  ROLE_SERVICE_ACCOUNT,
  ROLE_ANONYMOUS,
  ALL_ROLES,
  PLATFORM_ROLES,
  TENANT_ROLES,
  DEFAULT_ROLE,
  isRoleString,
  isPlatformRole,
  isTenantRole,
} from '../role-strings';

describe('role-strings constants', () => {
  it('holds the exact wire-format strings the protocols reference', () => {
    expect(ROLE_PLATFORM_ADMIN).toBe('platform-admin');
    expect(ROLE_TENANT_ADMIN).toBe('tenant-admin');
    expect(ROLE_TENANT_USER).toBe('tenant-user');
    expect(ROLE_SERVICE_ACCOUNT).toBe('service-account');
    expect(ROLE_ANONYMOUS).toBe('anonymous');
  });

  it('exposes exactly 5 canonical roles in ALL_ROLES', () => {
    expect(ALL_ROLES).toHaveLength(5);
    expect([...ALL_ROLES]).toEqual(
      expect.arrayContaining([
        ROLE_PLATFORM_ADMIN,
        ROLE_TENANT_ADMIN,
        ROLE_TENANT_USER,
        ROLE_SERVICE_ACCOUNT,
        ROLE_ANONYMOUS,
      ]),
    );
  });

  it('partitions platform vs tenant roles without overlap', () => {
    for (const platform of PLATFORM_ROLES) {
      expect(TENANT_ROLES).not.toContain(platform);
    }
    expect(PLATFORM_ROLES).toEqual([ROLE_PLATFORM_ADMIN]);
  });

  it('freezes the role arrays so downstream cannot mutate them', () => {
    expect(Object.isFrozen(ALL_ROLES)).toBe(true);
    expect(Object.isFrozen(PLATFORM_ROLES)).toBe(true);
    expect(Object.isFrozen(TENANT_ROLES)).toBe(true);
  });

  it('DEFAULT_ROLE points at ROLE_TENANT_USER', () => {
    expect(DEFAULT_ROLE).toBe(ROLE_TENANT_USER);
  });
});

describe('isRoleString', () => {
  it('accepts every canonical role', () => {
    for (const role of ALL_ROLES) {
      expect(isRoleString(role)).toBe(true);
    }
  });

  it('rejects unknown strings, non-strings, and empty values', () => {
    expect(isRoleString('bogus')).toBe(false);
    expect(isRoleString('')).toBe(false);
    expect(isRoleString(42)).toBe(false);
    expect(isRoleString(null)).toBe(false);
    expect(isRoleString(undefined)).toBe(false);
    expect(isRoleString({})).toBe(false);
    expect(isRoleString(['tenant-user'])).toBe(false);
  });
});

describe('isPlatformRole / isTenantRole', () => {
  it('classifies platform-admin as platform-only', () => {
    expect(isPlatformRole(ROLE_PLATFORM_ADMIN)).toBe(true);
    expect(isTenantRole(ROLE_PLATFORM_ADMIN)).toBe(false);
  });

  it('classifies tenant-admin / tenant-user / service-account as tenant-only', () => {
    for (const role of [ROLE_TENANT_ADMIN, ROLE_TENANT_USER, ROLE_SERVICE_ACCOUNT]) {
      expect(isTenantRole(role)).toBe(true);
      expect(isPlatformRole(role)).toBe(false);
    }
  });

  it('classifies anonymous as neither platform nor tenant', () => {
    expect(isPlatformRole(ROLE_ANONYMOUS)).toBe(false);
    expect(isTenantRole(ROLE_ANONYMOUS)).toBe(false);
  });
});
