/**
 * DockerRegistryService - checkConnection unit tests.
 *
 * Single read-only registry check:
 * - direct `/v2/` 200 succeeds
 * - 401/403 can succeed after registry-token exchange
 * - failed token exchange is an auth failure
 * - other non-2xx is unreachable/misconfigured
 */
import { DockerRegistryService } from './docker-registry.service';

describe('DockerRegistryService.checkConnection (Phase C12 preflight)', () => {
  let service: DockerRegistryService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new DockerRegistryService();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects empty registryUrl with VALIDATION_FAILURE (no HTTP call)', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const result = await service.checkConnection({ registryUrl: '', token: 'tok' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns reachable=true, authenticated=true on /v2/ 200', async () => {
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'ghp_docker_test',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.reachable).toBe(true);
    expect(result.data!.authenticated).toBe(true);
    expect(result.data!.authChallenge).toBe('');
  });

  it('exchanges a GitHub-style token when GHCR rejects the raw bearer token', async () => {
    const rejectedRawBearer = {
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers(),
    } as unknown as Response;
    const tokenExchange = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ token: 'registry-bearer-token' }),
    } as unknown as Response;
    const acceptedRegistryBearer = {
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    } as unknown as Response;
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce(rejectedRawBearer)
      .mockResolvedValueOnce(tokenExchange)
      .mockResolvedValueOnce(acceptedRegistryBearer);
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'github_pat_test',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.reachable).toBe(true);
    expect(result.data!.authenticated).toBe(true);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://ghcr.io/token?service=ghcr.io',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'https://ghcr.io/v2/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer registry-bearer-token',
        }),
      }),
    );
  });

  it('uses WWW-Authenticate challenge parameters for token exchange', async () => {
    const headers = new Headers();
    headers.set(
      'www-authenticate',
      'Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:lubochka/demo:pull"',
    );
    const rejectedRawBearer = {
      status: 401,
      statusText: 'Unauthorized',
      headers,
    } as unknown as Response;
    const tokenExchange = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ token: 'scoped-registry-token' }),
    } as unknown as Response;
    const acceptedRegistryBearer = {
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    } as unknown as Response;
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce(rejectedRawBearer)
      .mockResolvedValueOnce(tokenExchange)
      .mockResolvedValueOnce(acceptedRegistryBearer);
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'github_pat_test',
    });

    expect(result.isSuccess).toBe(true);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://ghcr.io/token?service=ghcr.io&scope=repository%3Alubochka%2Fdemo%3Apull',
      expect.any(Object),
    );
  });

  it('returns DOCKER_AUTH_FAILED when token exchange is rejected', async () => {
    const headers = new Headers();
    headers.set('www-authenticate', 'Bearer realm="https://ghcr.io/token",service="ghcr.io"');
    const rejectedRawBearer = {
      status: 401,
      statusText: 'Unauthorized',
      headers,
    } as unknown as Response;
    const rejectedExchange = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
    } as unknown as Response;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(rejectedRawBearer)
      .mockResolvedValueOnce(rejectedExchange) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'invalid',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DOCKER_AUTH_FAILED');
    const md = result.metadata as Record<string, unknown>;
    expect(md['reachable']).toBe(true);
    expect(md['authenticated']).toBe(false);
    expect(md['authChallenge']).toContain('Bearer realm');
  });

  it('returns DOCKER_UNREACHABLE on 503 (registry misconfigured)', async () => {
    const mockResponse = {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers(),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'tok',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DOCKER_UNREACHABLE');
  });

  it('returns DOCKER_UNREACHABLE when fetch throws', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('ENOTFOUND ghcr.io')) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      registryUrl: 'ghcr.io',
      token: 'tok',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DOCKER_UNREACHABLE');
    expect(result.errorMessage).toContain('ENOTFOUND');
  });

  it('normalises registryUrl: bare host gets https:// prepended; trailing slash stripped', async () => {
    const captured: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      captured.push(url);
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as unknown as Response;
    }) as unknown as typeof global.fetch;

    await service.checkConnection({ registryUrl: 'ghcr.io', token: 't' });
    await service.checkConnection({ registryUrl: 'https://ghcr.io/', token: 't' });
    await service.checkConnection({ registryUrl: 'http://localhost:5000', token: 't' });

    expect(captured[0]).toBe('https://ghcr.io/v2/');
    expect(captured[1]).toBe('https://ghcr.io/v2/');
    expect(captured[2]).toBe('http://localhost:5000/v2/');
  });

  it('omits Authorization header when no token provided (anonymous /v2/ ping)', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    global.fetch = jest.fn(async (_url: string, init: RequestInit) => {
      capturedHeaders = init.headers as Record<string, string>;
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      } as unknown as Response;
    }) as unknown as typeof global.fetch;

    await service.checkConnection({ registryUrl: 'ghcr.io' });

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders!['Authorization']).toBeUndefined();
  });
});
