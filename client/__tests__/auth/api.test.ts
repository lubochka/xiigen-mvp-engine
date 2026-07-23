/**
 * auth/api — Unit tests (FLOW-01 Phase A6, V-08).
 *
 * Exercises the three endpoint wrappers against a mocked `fetch`:
 *
 *   login()   — POST /api/auth/login with JSON body
 *   refresh() — POST /api/auth/refresh with { token }
 *   me()      — GET /api/auth/me with Authorization: Bearer <token>
 *
 * Asserts:
 *   - Correct URL, method, and headers on each call
 *   - camelCase DPR envelope passes through unchanged
 *   - snake_case DPR envelope is translated (is_success → isSuccess)
 *   - Non-2xx non-enveloped JSON surfaces as HTTP_<status>
 *   - Network failures surface as NETWORK_ERROR (the thrown Error.message)
 *   - Non-JSON response body is tolerated without crashing
 */

import { login, me, refresh } from '../../src/auth/api';

function jsonResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

function textResponse(status: number, text: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  } as unknown as Response;
}

describe('auth/api — login', () => {
  it('posts JSON body to /api/auth/login', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        isSuccess: true,
        data: {
          token: 'jwt.abc',
          expiresAt: 123,
          jti: 'j1',
          userId: 'u1',
          roles: ['tenant-user'],
        },
        error: null,
        metadata: {},
      }),
    );
    const result = await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data?.token).toBe('jwt.abc');

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c', password: 'pw' });
  });

  it('respects a custom baseUrl', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, { isSuccess: true, data: {}, error: null, metadata: {} }),
    );
    await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: 'https://gateway.xiigen.test' },
    );
    const [url] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gateway.xiigen.test/api/auth/login');
  });

  it('propagates an INVALID_CREDENTIALS failure envelope', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        isSuccess: false,
        data: null,
        error: { code: 'INVALID_CREDENTIALS', message: 'credentials rejected' },
        metadata: {},
      }),
    );
    const result = await login(
      { email: 'nope@x.y', password: 'bad' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('INVALID_CREDENTIALS');
  });

  it('translates a snake_case DPR envelope to the camelCase shape', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        is_success: false,
        data: null,
        error_code: 'NO_TENANT',
        error_message: 'tenant unavailable',
      }),
    );
    const result = await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('NO_TENANT');
    expect(result.error?.message).toBe('tenant unavailable');
  });

  it('reports HTTP_<status> on a non-enveloped 500 JSON response', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse(500, { message: 'boom' }));
    const result = await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('HTTP_500');
    expect(result.error?.message).toBe('boom');
  });

  it('surfaces NETWORK_ERROR when fetch throws', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toBe('offline');
  });

  it('tolerates non-JSON response bodies (e.g. gateway HTML)', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(textResponse(502, '<html><body>Bad Gateway</body></html>'));
    const result = await login(
      { email: 'a@b.c', password: 'pw' },
      { fetchFn: fetchFn as unknown as typeof fetch, baseUrl: '' },
    );
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('HTTP_502');
  });
});

describe('auth/api — refresh', () => {
  it('posts { token } to /api/auth/refresh', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        isSuccess: true,
        data: {
          token: 'jwt.new',
          expiresAt: 999,
          jti: 'j2',
          userId: 'u1',
          roles: ['tenant-user'],
        },
        error: null,
        metadata: {},
      }),
    );
    const result = await refresh('jwt.old', {
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: '',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.token).toBe('jwt.new');
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/refresh');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ token: 'jwt.old' });
  });

  it('propagates a TOKEN_EXPIRED failure', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        isSuccess: false,
        data: null,
        error: { code: 'TOKEN_EXPIRED', message: 'token expired' },
        metadata: {},
      }),
    );
    const result = await refresh('jwt.stale', {
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: '',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('TOKEN_EXPIRED');
  });
});

describe('auth/api — me', () => {
  it('sends Authorization: Bearer <token> and no body', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        isSuccess: true,
        data: {
          userId: 'u1',
          tenantId: 'acme',
          roles: ['tenant-user'],
          jti: 'j1',
          expiresAt: 123,
        },
        error: null,
        metadata: {},
      }),
    );
    const result = await me('jwt.abc', {
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: '',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.userId).toBe('u1');
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/me');
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer jwt.abc');
    expect(init.body).toBeUndefined();
  });

  it('surfaces NETWORK_ERROR on fetch throw', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('disconnected'));
    const result = await me('jwt.abc', {
      fetchFn: fetchFn as unknown as typeof fetch,
      baseUrl: '',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toBe('disconnected');
  });
});
