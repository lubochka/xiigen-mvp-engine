/**
 * P7.4 Tests — ConfigBuilder
 *
 * Tests: resolve plain dict (no refs), resolve $secret, resolve $env,
 * resolve mixed, resolve nested, cache hit, invalidateCache,
 * missing secret → failure, missing env → failure, deep copy,
 * missing secrets service, DNA-5 scope check.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { ConfigBuilder, IConfigSecretsProvider } from '../../src/freedom/config-builder';

// ── Mock Secrets Provider ────────────────────────────

function createMockSecrets(store: Record<string, string> = {}): IConfigSecretsProvider {
  return {
    getSecret: jest.fn(
      async (
        _tenantId: string,
        path: string,
        _version?: string,
      ): Promise<DataProcessResult<Record<string, unknown>>> => {
        const value = store[path];
        if (value !== undefined) {
          return DataProcessResult.success<Record<string, unknown>>({ value });
        }
        return DataProcessResult.failure<Record<string, unknown>>(
          'NOT_FOUND',
          `Secret '${path}' not found`,
        );
      },
    ),
  };
}

describe('ConfigBuilder', () => {
  // ── Plain config (no refs) ─────────────────────────

  describe('resolve plain config', () => {
    it('should return unchanged dict when no references', async () => {
      const builder = new ConfigBuilder();
      const config = { name: 'test', count: 5 };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual({ name: 'test', count: 5 });
    });

    it('should not mutate original config (deep copy)', async () => {
      const builder = new ConfigBuilder({ environ: { MY_VAR: 'resolved' } });
      const config = { key: '$env:MY_VAR', other: 'keep' };
      const original = JSON.parse(JSON.stringify(config));
      await builder.resolve('tenant-A', config);
      expect(config).toEqual(original); // not mutated
    });
  });

  // ── $env: resolution ───────────────────────────────

  describe('resolve $env:', () => {
    it('should resolve $env: from environment', async () => {
      const builder = new ConfigBuilder({ environ: { DB_URL: 'postgres://localhost' } });
      const config = { url: '$env:DB_URL' };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.url).toBe('postgres://localhost');
    });

    it('should fail on missing env var', async () => {
      const builder = new ConfigBuilder({ environ: {} });
      const config = { key: '$env:MISSING_VAR' };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_INCOMPLETE');
    });
  });

  // ── $secret: resolution ────────────────────────────

  describe('resolve $secret:', () => {
    it('should resolve $secret: through secrets service', async () => {
      const secrets = createMockSecrets({ 'xiigen/ai/key': 'sk-12345' });
      const builder = new ConfigBuilder({ secretsService: secrets });
      const config = { api_key: '$secret:xiigen/ai/key' };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.api_key).toBe('sk-12345');
    });

    it('should fail on missing secret', async () => {
      const secrets = createMockSecrets({});
      const builder = new ConfigBuilder({ secretsService: secrets });
      const config = { key: '$secret:nonexistent/path' };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_INCOMPLETE');
    });

    it('should fail when no secrets service configured', async () => {
      const builder = new ConfigBuilder();
      const config = { key: '$secret:some/path' };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_INCOMPLETE');
    });
  });

  // ── Mixed resolution ───────────────────────────────

  describe('resolve mixed', () => {
    it('should resolve mix of $secret, $env, and plain values', async () => {
      const secrets = createMockSecrets({ 'ai/key': 'sk-abc' });
      const builder = new ConfigBuilder({
        secretsService: secrets,
        environ: { NODE_ENV: 'prod' },
      });
      const config = {
        api_key: '$secret:ai/key',
        env: '$env:NODE_ENV',
        name: 'plain',
        count: 42,
      };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.api_key).toBe('sk-abc');
      expect(result.data!.env).toBe('prod');
      expect(result.data!.name).toBe('plain');
      expect(result.data!.count).toBe(42);
    });
  });

  // ── Nested resolution ──────────────────────────────

  describe('resolve nested', () => {
    it('should resolve refs in nested objects', async () => {
      const builder = new ConfigBuilder({ environ: { DB_PASS: 'secret123' } });
      const config = {
        db: {
          connection: {
            password: '$env:DB_PASS',
            host: 'localhost',
          },
        },
      };
      const result = await builder.resolve('tenant-A', config);
      expect(result.isSuccess).toBe(true);
      expect((result.data!.db as any).connection.password).toBe('secret123');
      expect((result.data!.db as any).connection.host).toBe('localhost');
    });
  });

  // ── Caching ────────────────────────────────────────

  describe('caching', () => {
    it('should cache resolved values', async () => {
      const secrets = createMockSecrets({ 'ai/key': 'sk-abc' });
      const builder = new ConfigBuilder({ secretsService: secrets, cacheTtl: 60 });

      await builder.resolve('tenant-A', { key: '$secret:ai/key' });
      await builder.resolve('tenant-A', { key: '$secret:ai/key' });

      const stats = builder.getStats();
      expect(stats.resolved).toBe(1);
      expect(stats.cached).toBe(1);
    });

    it('should invalidate cache per tenant', async () => {
      const secrets = createMockSecrets({ 'ai/key': 'sk-abc' });
      const builder = new ConfigBuilder({ secretsService: secrets, cacheTtl: 60 });

      await builder.resolve('tenant-A', { key: '$secret:ai/key' });
      expect(builder.cacheSize).toBe(1);

      const removed = builder.invalidateCache('tenant-A');
      expect(removed).toBe(1);
      expect(builder.cacheSize).toBe(0);
    });

    it('should invalidate all cache', async () => {
      const secrets = createMockSecrets({ 'ai/key': 'sk-abc' });
      const builder = new ConfigBuilder({ secretsService: secrets, cacheTtl: 60 });

      await builder.resolve('tenant-A', { key: '$secret:ai/key' });
      await builder.resolve('tenant-B', { key: '$secret:ai/key' });
      expect(builder.cacheSize).toBe(2);

      const removed = builder.invalidateCache();
      expect(removed).toBe(2);
    });
  });

  // ── DNA-5: Scope check ─────────────────────────────

  describe('DNA-5 scope check', () => {
    it('should reject empty tenantId', async () => {
      const builder = new ConfigBuilder();
      const result = await builder.resolve('', { key: 'value' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_MISSING');
    });
  });

  // ── Invalid config ─────────────────────────────────

  describe('invalid config', () => {
    it('should reject non-object config', async () => {
      const builder = new ConfigBuilder();
      const result = await builder.resolve('tenant-A', null as any);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_CONFIG');
    });
  });

  // ── Stats ──────────────────────────────────────────

  describe('stats', () => {
    it('should track resolved count', async () => {
      const builder = new ConfigBuilder({ environ: { X: 'val' } });
      await builder.resolve('tenant-A', { a: '$env:X' });
      expect(builder.getStats().resolved).toBe(1);
    });

    it('should track failed count', async () => {
      const builder = new ConfigBuilder({ environ: {} });
      await builder.resolve('tenant-A', { a: '$env:MISSING' });
      expect(builder.getStats().failed).toBe(1);
    });

    it('should reset stats', async () => {
      const builder = new ConfigBuilder({ environ: { X: 'val' } });
      await builder.resolve('tenant-A', { a: '$env:X' });
      builder.resetStats();
      expect(builder.getStats().resolved).toBe(0);
    });
  });
});
