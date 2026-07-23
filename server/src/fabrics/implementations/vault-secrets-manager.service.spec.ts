/**
 * VaultSecretsManagerService unit tests.
 *
 * Verifies DNA compliance + per-tenant Vault config resolution:
 *   DNA-4 — extends MicroserviceBase (review Finding 5).
 *   DNA-5 — tenantId from AsyncLocalStorage only; no method parameter.
 *   DNA-3 — all failure paths return DataProcessResult.failure; no throw.
 *   Finding 1 — vault_address + vault_token resolved per-call from FREEDOM
 *               config, NEVER from process.env.
 *   Finding 5 — rotate('tenant_github_token') returns failure (cannot
 *               machine-rotate PATs).
 */

import { ClsService, ClsModule } from 'nestjs-cls';
import { Test, TestingModule } from '@nestjs/testing';
import { VaultSecretsManagerService } from './vault-secrets-manager.service';
import { MicroserviceBase } from '../../kernel/microservice-base';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  FREEDOM_CONFIG_SERVICE,
  IFreedomConfigService,
} from '../../freedom/freedom-config.interface';
import { TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

const TEST_TENANT = 'tenant-abc';

describe('VaultSecretsManagerService', () => {
  let service: VaultSecretsManagerService;
  let cls: ClsService;
  let mockFreedom: { get: jest.Mock };
  let originalFetch: typeof fetch;
  let mockFetch: jest.Mock;

  beforeEach(async () => {
    mockFreedom = {
      get: jest.fn(async (key: string) => {
        // Per-tenant config via FREEDOM — no process.env anywhere
        const table: Record<string, Record<string, unknown>> = {
          vault_address: { value: 'http://localhost:8200' },
          vault_token: { value: 'tenant-vault-token-001' },
        };
        return table[key] ?? null;
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [
        VaultSecretsManagerService,
        { provide: FREEDOM_CONFIG_SERVICE, useValue: mockFreedom },
      ],
    }).compile();

    service = moduleRef.get(VaultSecretsManagerService);
    cls = moduleRef.get(ClsService);

    // Stub global fetch — D-HIST-001: fetch is the only HTTP primitive used
    originalFetch = global.fetch;
    mockFetch = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
  });

  afterEach(() => {
    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  });

  async function withTenant<T>(fn: () => Promise<T>): Promise<T> {
    return cls.runWith(
      { [TENANT_CONTEXT_KEY]: { tenantId: TEST_TENANT } } as never,
      fn,
    );
  }

  it('DNA-4: extends MicroserviceBase', () => {
    expect(service).toBeInstanceOf(MicroserviceBase);
    expect(service.serviceName).toBe('VaultSecretsManagerService');
  });

  it('DNA-5: get() accepts only the key parameter — no tenantId', () => {
    expect(service.get.length).toBe(1);
  });

  it('DNA-5: get() returns MISSING_TENANT when AsyncLocalStorage context empty', async () => {
    const result = await service.get('some_key');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('scopes Vault path to tenantId from AsyncLocalStorage', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: { data: { tenant_github_token: 'ghp_real' } } }),
    });
    await withTenant(() => service.get('tenant_github_token'));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`/secret/data/${TEST_TENANT}/tenant_github_token`);
  });

  it('resolves vault_address and vault_token from FREEDOM — never process.env', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: { data: { k: 'v' } } }),
    });
    await withTenant(() => service.get('k'));
    const addrsCalled = mockFreedom.get.mock.calls.map((c: unknown[]) => c[0]);
    expect(addrsCalled).toContain('vault_address');
    expect(addrsCalled).toContain('vault_token');
  });

  it('DNA-3: returns failure NOT_FOUND on 404 — no throw', async () => {
    mockFetch.mockResolvedValueOnce({ status: 404, ok: false });
    const result = await withTenant(() => service.get('missing'));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('DNA-3: returns failure VAULT_UNREACHABLE on network error — no throw', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await withTenant(() => service.get('anything'));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VAULT_UNREACHABLE');
  });

  it('returns VAULT_TOKEN_MISSING when vault_token not configured for tenant', async () => {
    mockFreedom.get.mockImplementation(async (key: string) =>
      key === 'vault_token' ? null : { value: 'http://localhost:8200' },
    );
    const result = await withTenant(() => service.get('any_key'));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VAULT_TOKEN_MISSING');
  });

  it('Finding 5: rotate(tenant_github_token) returns UNSUPPORTED_ROTATION', async () => {
    const result = await withTenant(() => service.rotate('tenant_github_token'));
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSUPPORTED_ROTATION');
    expect(result.errorMessage).toContain('cannot be rotated');
  });

  it('rotate() on engine-managed secret generates new value via randomBytes', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true });
    const result = await withTenant(() => service.rotate('db_password'));
    expect(result.isSuccess).toBe(true);
    expect(typeof result.data).toBe('string');
    expect((result.data as string).length).toBeGreaterThan(20);
  });

  it('revoke() is idempotent — 404 treated as success', async () => {
    mockFetch.mockResolvedValueOnce({ status: 404, ok: false });
    const result = await withTenant(() => service.revoke('already-gone'));
    expect(result.isSuccess).toBe(true);
  });

  it('set() stores at tenant-scoped path with proper Vault KV v2 envelope', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true, text: async () => '' });
    await withTenant(() => service.set('my_secret', 's3cret'));
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain(`/secret/data/${TEST_TENANT}/my_secret`);
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown>;
    expect(data['my_secret']).toBe('s3cret');
  });
});
