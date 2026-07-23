/**
 * FreedomConfigManager unit tests — P26 FIX-7.
 *
 * 3-tier resolution: tenant override → global default → NOT_FOUND.
 * DNA-3: never throws.
 */

import 'reflect-metadata';
import { FreedomConfigManager } from './config-manager';
import { DataProcessResult } from '../kernel/data-process-result';

function makeDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
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
        : DataProcessResult.failure('NOT_FOUND', `${id} not found`);
    }),
    _store: store,
  };
}

describe('FreedomConfigManager', () => {
  // ── TIER 1: tenant override ───────────────────────────────────────────────

  it('tier 1: returns tenant-specific config when exists (sync path)', () => {
    const mgr = new FreedomConfigManager();
    mgr.setConfig('acme', {
      config_key: 'model.generator',
      task_type: 'engine',
      value: 'claude-sonnet-4-6',
    });
    const result = mgr.getConfig('acme', 'model.generator');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['value']).toBe('claude-sonnet-4-6');
  });

  it('tier 1 async: db override shadows in-memory default', async () => {
    const db = makeDb();
    const mgr = new FreedomConfigManager(db as any);
    mgr.setDefault('model.generator', 'mock');

    // Seed db directly
    await db.storeDocument(
      'freedom_configs',
      {
        tenant_id: 'acme',
        config_key: 'model.generator',
        value: 'gpt-4o',
      },
      'acme::model.generator',
    );

    const result = await mgr.getConfigAsync('acme', 'model.generator');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['value']).toBe('gpt-4o');
  });

  // ── TIER 2: global default ────────────────────────────────────────────────

  it('tier 2: falls back to global default when no tenant entry', () => {
    const mgr = new FreedomConfigManager();
    mgr.setDefault('model.generator', 'mock-model');
    const result = mgr.getConfig('acme', 'model.generator');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['value']).toBe('mock-model');
    expect(result.data!['is_default']).toBe(true);
  });

  // ── TIER 3: NOT_FOUND ─────────────────────────────────────────────────────

  it('tier 3: returns NOT_FOUND failure when no entry and no default', () => {
    const mgr = new FreedomConfigManager();
    const result = mgr.getConfig('acme', 'nonexistent.key');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  // ── WRITE + DELETE ────────────────────────────────────────────────────────

  it('set: stores document with correct tenantId and configKey', () => {
    const mgr = new FreedomConfigManager();
    const result = mgr.setConfig('acme', {
      config_key: 'quota.tokens',
      task_type: 'engine',
      value: 1000,
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe('acme');
    expect(result.data!['config_key']).toBe('quota.tokens');
  });

  it('tenant A config not visible to tenant B', () => {
    const mgr = new FreedomConfigManager();
    mgr.setConfig('acme', { config_key: 'model.generator', task_type: 'engine', value: 'claude' });
    const betaResult = mgr.getConfig('beta', 'model.generator');
    // no default set, so NOT_FOUND
    expect(betaResult.isSuccess).toBe(false);
  });

  // ── DNA-3 ─────────────────────────────────────────────────────────────────

  it('DNA-3: returns failure — never throws — when db is unavailable', async () => {
    const badDb = {
      storeDocument: jest.fn().mockRejectedValue(new Error('db down')),
      searchDocuments: jest.fn().mockRejectedValue(new Error('db down')),
      getDocument: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const mgr = new FreedomConfigManager(badDb as any);
    let threw = false;
    try {
      await mgr.setConfigAsync('acme', { config_key: 'x', value: 1 });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('DNA-3: getConfig with empty tenantId returns MISSING_TENANT failure', () => {
    const mgr = new FreedomConfigManager();
    const result = mgr.getConfig('', 'any.key');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });
});
