/**
 * Tenant test helpers — creates isolated tenant contexts for testing.
 * Used across all test suites that need tenant awareness.
 */

import { TenantRecord, TenantContext, DEFAULT_PLAN, TenantPlan } from '../../src/kernel';
import { randomUUID } from 'crypto';

/** Create a test TenantRecord with sensible defaults. */
export function makeTenantRecord(overrides?: Partial<TenantRecord>): TenantRecord {
  const now = new Date().toISOString();
  return {
    id: overrides?.id ?? randomUUID(),
    name: overrides?.name ?? 'Test Tenant',
    status: overrides?.status ?? 'active',
    plan: overrides?.plan ?? { ...DEFAULT_PLAN },
    configOverrides: overrides?.configOverrides ?? {},
    apiKeys: overrides?.apiKeys ?? {},
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}

/** Create an active TenantContext for testing. */
export function makeActiveTenant(id?: string, overrides?: Partial<TenantRecord>): TenantContext {
  return new TenantContext(
    makeTenantRecord({ id: id ?? randomUUID(), status: 'active', ...overrides }),
  );
}

/** Create an inactive TenantContext for testing. */
export function makeInactiveTenant(id?: string): TenantContext {
  return new TenantContext(
    makeTenantRecord({ id: id ?? randomUUID(), status: 'inactive', name: 'Inactive Tenant' }),
  );
}

/** Create a pro-plan TenantContext with custom keys and config. */
export function makeProTenant(
  id?: string,
  apiKeys?: Record<string, string>,
  configOverrides?: Record<string, unknown>,
): TenantContext {
  const proPlan: TenantPlan = {
    name: 'pro',
    maxApiCallsPerMinute: 300,
    maxTokensPerDay: 1_000_000,
    maxStorageMb: 5_000,
  };
  return new TenantContext(
    makeTenantRecord({
      id: id ?? randomUUID(),
      name: 'Pro Tenant',
      status: 'active',
      plan: proPlan,
      apiKeys: apiKeys ?? { anthropic: 'sk-pro-ant', openai: 'sk-pro-oai' },
      configOverrides: configOverrides ?? { 'ai.defaultModel': 'claude-sonnet' },
    }),
  );
}
