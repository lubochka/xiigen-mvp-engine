/**
 * MT Foundation — Logic/E2E tests.
 *
 * Tests full component chains with in-memory fabric (no real HTTP, ES, or Redis).
 * Covers: TenantKeyGenerator, ScopeEnforcer, InMemoryTenantRegistry, QuotaEnforcer,
 *         InMemoryIdempotencyStore, FreedomConfigManager, BootstrapSeeder.
 *
 * Phase A-0 DoD: 10 tests.
 */

import 'reflect-metadata';
import { createHash } from 'crypto';
import { TenantKeyGenerator } from '../../src/kernel/multi-tenant/tenant-key-generator';
import { ScopeEnforcer } from '../../src/kernel/multi-tenant/scope-enforcer';
import { InMemoryTenantRegistry } from '../../src/kernel/multi-tenant/tenant-registry.memory';
import { QuotaEnforcer } from '../../src/kernel/multi-tenant/quota-enforcer';
import { InMemoryIdempotencyStore } from '../../src/kernel/multi-tenant/idempotency-store.memory';
import { FreedomConfigManager } from '../../src/freedom/config-manager';
import { BootstrapSeeder } from '../../src/bootstrap/bootstrap-seeder.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── In-memory DB helper ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  const callOrder: string[] = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push(`store:${index}`);
      const b = store.get(index) ?? [];
      const i = b.findIndex((d) => d['id'] === id);
      if (i >= 0) b[i] = { ...doc, id };
      else b.push({ ...doc, id });
      store.set(index, b);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const results = (store.get(index) ?? []).filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = (store.get(index) ?? []).find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `${id} not in ${index}`);
    }),
    _store: store,
    _callOrder: callOrder,
  };
}

async function withEnvAsync(
  vars: Record<string, string | undefined>,
  fn: () => Promise<void>,
): Promise<void> {
  const original: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    original[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    await fn();
  } finally {
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const TEST_SECRET = 'mt-e2e-test-secret-32-bytes-pad!';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MT Foundation — Logic/E2E', () => {
  it('MT isolation: same hint → different docIds with correct tenant prefixes', () => {
    const id1 = TenantKeyGenerator.generateDocId('acme', 'form');
    const id2 = TenantKeyGenerator.generateDocId('corp', 'form');
    expect(id1.startsWith('acme::')).toBe(true);
    expect(id2.startsWith('corp::')).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it('MT isolation: tenant-A document cannot be scope-validated by tenant-B', () => {
    const id = TenantKeyGenerator.generateDocId('acme', 'res');
    const check = ScopeEnforcer.enforceScope('corp', 'acme', id);
    expect(check.isSuccess).toBe(false);
    expect(check.errorCode).toBe('SCOPE_VIOLATION');
  });

  it('quota: QUOTA_EXCEEDED returned before any AI call when quota is exhausted', async () => {
    const registry = new InMemoryTenantRegistry();
    await registry.provisionTenant('acme', { maxApiCallsPerMinute: 5 });
    const enforcer = new QuotaEnforcer(registry);
    const result = await enforcer.guardQuota('acme', 'api_calls', 100);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('QUOTA_EXCEEDED');
  });

  it('idempotency: same key twice → second call is DUPLICATE_REQUEST', async () => {
    const store = new InMemoryIdempotencyStore();
    const key = { tenantId: 'acme', key: 'op::abc' };
    await store.checkAndSet(key);
    const second = await store.checkAndSet(key);
    expect(second.isSuccess).toBe(false);
    expect(second.errorCode).toBe('DUPLICATE_REQUEST');
  });

  it('idempotency: different tenants same key — both succeed (no cross-tenant collision)', async () => {
    const store = new InMemoryIdempotencyStore();
    const r1 = await store.checkAndSet({ tenantId: 'acme', key: 'op::abc' });
    const r2 = await store.checkAndSet({ tenantId: 'corp', key: 'op::abc' });
    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });

  it('FreedomConfig: tenant A override not visible to tenant B', () => {
    const mgr = new FreedomConfigManager();
    mgr.setConfig('acme', { config_key: 'model', value: 'claude-sonnet-4-6' });
    const beta = mgr.getConfig('beta', 'model');
    expect(beta.isSuccess).toBe(false);
  });

  it('BootstrapSeeder: after seeder runs, byok-keys record exists with 3 providers', async () => {
    const db = makeInMemoryDb();
    const idempotency = new InMemoryIdempotencyStore();
    const seeder = new BootstrapSeeder(db as any, idempotency);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-test',
        BOOTSTRAP_OPENAI_KEY: 'sk-openai-test',
        BOOTSTRAP_GEMINI_KEY: 'AIza-test',
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        await seeder.run();
      },
    );

    const stored = db._store.get('xiigen-byok-keys') ?? [];
    expect(stored).toHaveLength(1);
    const providers = stored[0]!['providers'] as any[];
    expect(providers).toHaveLength(3);
  });

  it('BootstrapSeeder: no BOOTSTRAP_* value appears in any stored field (plaintext)', async () => {
    const db = makeInMemoryDb();
    const idempotency = new InMemoryIdempotencyStore();
    const seeder = new BootstrapSeeder(db as any, idempotency);

    const plainKey = 'sk-ant-very-secret-key-value';
    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: plainKey,
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        await seeder.run();
      },
    );

    const allDocs = [...db._store.values()].flat();
    expect(JSON.stringify(allDocs)).not.toContain(plainKey);
  });

  it('BootstrapSeeder: DNA-8 — storeDocument called before run() returns', async () => {
    const db = makeInMemoryDb();
    const idempotency = new InMemoryIdempotencyStore();
    const seeder = new BootstrapSeeder(db as any, idempotency);
    let storeCalledDuringRun = false;

    db.storeDocument.mockImplementationOnce(
      async (index: string, doc: Record<string, unknown>, id: string) => {
        storeCalledDuringRun = true;
        db._store.set(index, [{ ...doc, id }]);
        return DataProcessResult.success({ ...doc, id });
      },
    );

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-test',
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        const result = await seeder.run();
        expect(result.isSuccess).toBe(true);
      },
    );

    expect(storeCalledDuringRun).toBe(true);
  });

  it('InMemoryTenantRegistry: provision → suspend → TENANT_INACTIVE visible in status', async () => {
    const registry = new InMemoryTenantRegistry();
    await registry.provisionTenant('acme', {});
    await registry.suspendTenant('acme', 'violation');
    const tenant = await registry.getTenant('acme');
    expect(tenant.isSuccess).toBe(true);
    expect(tenant.data!.status).toBe('suspended');
  });
});
