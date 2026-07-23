/**
 * BootstrapSeeder unit tests.
 *
 * Verifies: idempotency, 3-provider seeding, encryption (no plaintext stored),
 * single-key warning, no-keys no-op, DNA-8 (store before event), DNA-3 (no throw).
 */

import 'reflect-metadata';
import { createHash } from 'crypto';
import { BootstrapSeeder, MASTER_TENANT_ID } from './bootstrap-seeder.service';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeDb() {
  const store = new Map<string, Record<string, unknown>>();
  const callOrder: string[] = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push(`store:${index}`);
      store.set(id, { ...doc, id });
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = store.get(id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `${id} not in ${index}`);
    }),
    _store: store,
    _callOrder: callOrder,
  };
}

function makeIdempotency() {
  const keys = new Set<string>();
  return {
    checkAndSet: jest.fn(async ({ tenantId, key }: { tenantId: string; key: string }) => {
      const full = `${tenantId}:${key}`;
      if (keys.has(full)) return DataProcessResult.failure('DUPLICATE_REQUEST', 'already set');
      keys.add(full);
      return DataProcessResult.success(true);
    }),
    release: jest.fn(async ({ tenantId, key }: { tenantId: string; key: string }) => {
      keys.delete(`${tenantId}:${key}`);
      return DataProcessResult.success(undefined);
    }),
    _keys: keys,
  };
}

const TEST_SECRET = 'test-secret-32-bytes-long-enough-!';
const secretKey = createHash('sha256').update(TEST_SECRET).digest();

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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BootstrapSeeder', () => {
  // ── POSITIVE ──────────────────────────────────────────────────────────────

  it('reads all 3 BOOTSTRAP_* keys and writes 3-provider pool to byok-keys', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-test',
        BOOTSTRAP_OPENAI_KEY: 'sk-openai-test',
        BOOTSTRAP_GEMINI_KEY: 'AIza-test',
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        const result = await seeder.run();
        expect(result.isSuccess).toBe(true);
        expect(result.data!.providerCount).toBe(3);
        expect(result.data!.skipped).toBe(false);
      },
    );

    const stored = db._store.get(`${MASTER_TENANT_ID}::byok`);
    expect(stored).toBeDefined();
    const providers = stored!['providers'] as any[];
    expect(providers).toHaveLength(3);
    const types = providers.map((p) => p.type);
    expect(types).toContain('anthropic');
    expect(types).toContain('openai');
    expect(types).toContain('gemini');
  });

  it('idempotent: running twice creates 1 byok-keys entry, not 2', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-test',
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        await seeder.run();
        const result2 = await seeder.run();
        expect(result2.isSuccess).toBe(true);
        expect(result2.data!.skipped).toBe(true);
      },
    );

    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });

  it('encryption: stored encryptedKey is NOT the plaintext BOOTSTRAP_* value', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    const plainKey = 'sk-ant-plaintext-key';
    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: plainKey,
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        await seeder.run();
      },
    );

    const stored = db._store.get(`${MASTER_TENANT_ID}::byok`);
    const providers = stored!['providers'] as any[];
    expect(providers[0]!['encryptedKey']).not.toBe(plainKey);
    expect(JSON.stringify(stored)).not.toContain(plainKey);
  });

  it('encrypt/decrypt round-trip returns original plaintext', () => {
    const seeder = new BootstrapSeeder();
    const plain = 'sk-ant-super-secret-key-value';
    const enc = seeder.encrypt(plain, secretKey);
    expect(enc.isSuccess).toBe(true);
    const dec = seeder.decrypt(enc.data!, secretKey);
    expect(dec.isSuccess).toBe(true);
    expect(dec.data).toBe(plain);
  });

  it('each encrypt call produces different ciphertext (randomised IV)', () => {
    const seeder = new BootstrapSeeder();
    const e1 = seeder.encrypt('same-value', secretKey);
    const e2 = seeder.encrypt('same-value', secretKey);
    expect(e1.data).not.toBe(e2.data);
  });

  it('DNA-8: byok-keys stored BEFORE run() returns success', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);
    let storeCalledBeforeReturn = false;

    db.storeDocument.mockImplementationOnce(
      async (index: string, doc: Record<string, unknown>, id: string) => {
        storeCalledBeforeReturn = true;
        db._store.set(id, { ...doc, id });
        db._callOrder.push(`store:${index}`);
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

    expect(storeCalledBeforeReturn).toBe(true);
  });

  // ── NEGATIVE ──────────────────────────────────────────────────────────────

  it('no BOOTSTRAP_* keys: seeder is no-op, logs warning, DNA-3 compliant', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: undefined,
        BOOTSTRAP_OPENAI_KEY: undefined,
        BOOTSTRAP_GEMINI_KEY: undefined,
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        const result = await seeder.run();
        expect(result.isSuccess).toBe(true);
        expect(result.data!.providerCount).toBe(0);
        expect(result.data!.warning).toBeDefined();
      },
    );

    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('single key set: 1-provider pool created, result has providerCount=1', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-only',
        BOOTSTRAP_OPENAI_KEY: undefined,
        BOOTSTRAP_GEMINI_KEY: undefined,
        TENANT_KEY_ENCRYPTION_SECRET: TEST_SECRET,
      },
      async () => {
        const result = await seeder.run();
        expect(result.isSuccess).toBe(true);
        expect(result.data!.providerCount).toBe(1);
      },
    );
  });

  it('missing TENANT_KEY_ENCRYPTION_SECRET: returns failure, DNA-3 compliant', async () => {
    const db = makeDb();
    const idempotency = makeIdempotency();
    const seeder = new BootstrapSeeder(db as any, idempotency as any);

    await withEnvAsync(
      {
        BOOTSTRAP_ANTHROPIC_KEY: 'sk-ant-test',
        TENANT_KEY_ENCRYPTION_SECRET: undefined,
      },
      async () => {
        const result = await seeder.run();
        expect(result.isSuccess).toBe(false);
        expect(result.errorCode).toBe('MISSING_ENCRYPTION_SECRET');
      },
    );

    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('DNA-3: decrypt failure never throws', () => {
    const seeder = new BootstrapSeeder();
    let threw = false;
    try {
      seeder.decrypt('not-valid-base64-at-all!!!', secretKey);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it('decrypt with wrong key returns DataProcessResult.failure', () => {
    const seeder = new BootstrapSeeder();
    const enc = seeder.encrypt('secret', secretKey);
    const wrongKey = createHash('sha256').update('wrong-secret').digest();
    const dec = seeder.decrypt(enc.data!, wrongKey);
    expect(dec.isSuccess).toBe(false);
    expect(dec.errorCode).toBe('DECRYPT_FAILED');
  });
});
