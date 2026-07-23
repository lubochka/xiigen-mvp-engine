import { ClsService } from 'nestjs-cls';
import { VaultSecretsProvider } from './vault.provider';
import { TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

function clsForTenant(tenantId: string): ClsService {
  return {
    get: <T>(key: string): T | undefined => {
      if (key !== TENANT_CONTEXT_KEY) return undefined;
      return { tenantId } as unknown as T;
    },
  } as unknown as ClsService;
}

function response(status: number, body: Record<string, unknown>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('VaultSecretsProvider', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('reads auth signing keys from the tenant Vault path', async () => {
    process.env['VAULT_ADDR'] = 'http://vault:8200';
    process.env['VAULT_TOKEN'] = 'test-token';
    const calls: Array<{ url: string; init: RequestInit }> = [];
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return response(200, {
        data: {
          data: { value: 'tenant-signing-key', algorithm: 'HS256' },
          metadata: { version: 3 },
        },
      });
    }) as typeof fetch;

    const provider = new VaultSecretsProvider(clsForTenant('acme-corp'));
    const result = await provider.getSecret('xiigen/auth/jwt_signing_key/acme-corp');

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        value: 'tenant-signing-key',
        algorithm: 'HS256',
        provider: 'vault',
        version: '3',
      }),
    );
    expect(calls[0]?.url).toBe(
      'http://vault:8200/v1/secret/data/xiigen/tenants/acme-corp/auth/jwt_signing_key',
    );
    expect(calls[0]?.init.headers).toEqual(
      expect.objectContaining({ 'X-Vault-Token': 'test-token' }),
    );
  });

  it('rejects signing-key paths for a different tenant context', async () => {
    process.env['VAULT_TOKEN'] = 'test-token';
    let called = false;
    global.fetch = (async () => {
      called = true;
      return response(200, {});
    }) as typeof fetch;

    const provider = new VaultSecretsProvider(clsForTenant('acme-corp'));
    const result = await provider.getSecret('xiigen/auth/jwt_signing_key/northwind');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TENANT_PATH_MISMATCH');
    expect(called).toBe(false);
  });

  it('writes tenant secrets under secret/xiigen/tenants/{tenantId}', async () => {
    process.env['VAULT_ADDR'] = 'http://vault:8200/';
    process.env['VAULT_TOKEN'] = 'test-token';
    const calls: Array<{ url: string; init: RequestInit }> = [];
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return response(200, { data: { metadata: { version: 4 } } });
    }) as typeof fetch;

    const provider = new VaultSecretsProvider(clsForTenant('northwind'));
    const result = await provider.setSecret('auth/jwt_signing_key', 'northwind-key', {
      algorithm: 'HS256',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({ path: 'auth/jwt_signing_key', version: '4', provider: 'vault' }),
    );
    expect(calls[0]?.url).toBe(
      'http://vault:8200/v1/secret/data/xiigen/tenants/northwind/auth/jwt_signing_key',
    );
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.init.body).toBe(
      JSON.stringify({ data: { algorithm: 'HS256', value: 'northwind-key' } }),
    );
  });

  it('fails closed when VAULT_TOKEN is not configured', async () => {
    delete process.env['VAULT_TOKEN'];
    const provider = new VaultSecretsProvider(clsForTenant('tessera-collective'));
    const result = await provider.healthCheck();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VAULT_TOKEN_MISSING');
  });
});
