/**
 * ApiClient — Unit Tests
 *
 * Tests: X-Tenant-Id header injection (DNA-5), DataProcessResult unwrapping,
 * HTTP error handling, retry on 5xx, NETWORK_ERROR on fetch failure,
 * URL building, configure().
 *
 * Uses jest global.fetch mock — no network calls.
 */

import { ApiClient } from '../../src/api/client';

// ── fetch mock setup ──────────────────────────────────

function mockFetch(status: number, body: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

beforeAll(() => { (global as any).fetch = jest.fn(); });
beforeEach(() => { (global.fetch as jest.Mock).mockReset(); });

// ══════════════════════════════════════════════════════
// Header injection — DNA-5
// ══════════════════════════════════════════════════════

describe('ApiClient — header injection (DNA-5)', () => {
  it('should include X-Tenant-Id on every request', async () => {
    mockFetch(200, { isSuccess: true, data: {}, error: null, metadata: {} });
    const client = new ApiClient();
    await client.get('healthLive', { tenantId: 'my-tenant' });

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Tenant-Id']).toBe('my-tenant');
  });

  it('should use defaultTenantId when request has no tenantId', async () => {
    mockFetch(200, { isSuccess: true, data: {}, error: null, metadata: {} });
    const client = new ApiClient({ defaultTenantId: 'default-t' });
    await client.get('healthLive');

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['X-Tenant-Id']).toBe('default-t');
  });

  it('should always include Content-Type: application/json', async () => {
    mockFetch(200, { isSuccess: true, data: {}, error: null, metadata: {} });
    await new ApiClient().get('healthLive', { tenantId: 't1' });

    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(headers['Content-Type']).toBe('application/json');
  });
});

// ══════════════════════════════════════════════════════
// DataProcessResult handling
// ══════════════════════════════════════════════════════

describe('ApiClient — DataProcessResult handling', () => {
  it('should pass through backend DataProcessResult directly', async () => {
    const backendResult = { isSuccess: true, data: { count: 42 }, error: null, metadata: {} };
    mockFetch(200, backendResult);
    const result = await new ApiClient().get<{ count: number }>('healthLive', { tenantId: 't1' });
    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ count: 42 });
  });

  it('should wrap plain JSON in successResult when no isSuccess field', async () => {
    mockFetch(200, { value: 'hello' });
    const result = await new ApiClient().get('healthLive', { tenantId: 't1' });
    expect(result.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// HTTP error codes
// ══════════════════════════════════════════════════════

describe('ApiClient — HTTP error handling', () => {
  it('should return HTTP_404 failureResult on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const result = await new ApiClient({ retryAttempts: 0 }).get('healthLive', { tenantId: 't1' });
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('HTTP_404');
  });

  it('should return HTTP_403 failureResult on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const result = await new ApiClient({ retryAttempts: 0 }).get('healthLive', { tenantId: 't1' });
    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('HTTP_403');
  });
});

// ══════════════════════════════════════════════════════
// Retry on 5xx
// ══════════════════════════════════════════════════════

describe('ApiClient — retry on 5xx', () => {
  it('should retry on 500 and succeed on second attempt', async () => {
    mockFetch(500, { message: 'Error' });
    mockFetch(200, { isSuccess: true, data: { ok: true }, error: null, metadata: {} });

    const result = await new ApiClient({ retryAttempts: 1, retryDelay: 0 })
      .get('healthLive', { tenantId: 't1' });

    expect(result.isSuccess).toBe(true);
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(2);
  });

  it('should fail after exhausting retries', async () => {
    mockFetch(500, { message: 'Still down' });
    mockFetch(500, { message: 'Still down' });

    const result = await new ApiClient({ retryAttempts: 1, retryDelay: 0 })
      .get('healthLive', { tenantId: 't1' });

    expect(result.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Network error
// ══════════════════════════════════════════════════════

describe('ApiClient — network error', () => {
  it('should return NETWORK_ERROR on fetch rejection', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await new ApiClient({ retryAttempts: 0 })
      .get('healthLive', { tenantId: 't1' });

    expect(result.isSuccess).toBe(false);
    expect(result.error?.code).toBe('NETWORK_ERROR');
    expect(result.error?.message).toContain('ECONNREFUSED');
  });
});

// ══════════════════════════════════════════════════════
// URL building
// ══════════════════════════════════════════════════════

describe('ApiClient — URL building', () => {
  it('should use /api base URL by default', async () => {
    mockFetch(200, { isSuccess: true, data: {}, error: null, metadata: {} });
    await new ApiClient().get('healthLive', { tenantId: 't1' });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/api');
    expect(url).toContain('/health/live');
  });

  it('should support a custom base URL', async () => {
    mockFetch(200, { isSuccess: true, data: {}, error: null, metadata: {} });
    const client = new ApiClient({ baseUrl: 'http://engine:3000/api' });
    await client.get('healthLive', { tenantId: 't1' });

    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('http://engine:3000');
  });
});

// ══════════════════════════════════════════════════════
// configure()
// ══════════════════════════════════════════════════════

describe('ApiClient — configure()', () => {
  it('should update defaultTenantId', () => {
    const client = new ApiClient();
    client.configure({ defaultTenantId: 'new-tenant' });
    expect(client.getConfig().defaultTenantId).toBe('new-tenant');
  });

  it('should preserve unrelated config fields', () => {
    const client = new ApiClient({ retryAttempts: 3 });
    client.configure({ defaultTenantId: 'x' });
    expect(client.getConfig().retryAttempts).toBe(3);
  });
});
