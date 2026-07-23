/**
 * GitHubProvisionerService — checkConnection unit tests.
 *
 * Phase C12 (DEV-115, 2026-04-26) per TENANT-CICD-CONNECTION-GUIDANCE-v1.0.
 *
 * checkConnection signature:
 *   { token, orgName }
 *   → DataProcessResult<{ reachable, login, hasRepoScope, rateLimit }>
 *
 *   - 200 + 'repo' in X-OAuth-Scopes  → success(reachable=true, hasRepoScope=true)
 *   - 200 + 'repo' missing             → success(reachable=true, hasRepoScope=false)
 *                                        (caller decides if this is fatal)
 *   - non-2xx                          → failure('GITHUB_AUTH_FAILED')
 *   - fetch throws                     → failure('GITHUB_UNREACHABLE')
 *
 * No real GitHub calls. The createRepo / pushInitialCommit / deleteRepo /
 * setRepoSecrets / renameRepo methods continue to be exercised by the
 * integration test (fork-flow.integration.spec.ts) under INTEGRATION_TEST=true.
 */
import { GitHubProvisionerService } from './github-provisioner';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(30_000);

describe('GitHubProvisionerService.checkConnection (Phase C12 preflight)', () => {
  let service: GitHubProvisionerService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new GitHubProvisionerService();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects empty token with VALIDATION_FAILURE (no HTTP call)', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: '',
      orgName: 'acme-corp',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns reachable=true, hasRepoScope=true on 200 + repo scope present', async () => {
    const headers = new Headers();
    headers.set('x-oauth-scopes', 'repo, delete_repo, read:user');
    headers.set('x-ratelimit-remaining', '4987');
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers,
      json: async () => ({ login: 'octocat', id: 1 }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: 'ghp_valid',
      orgName: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.reachable).toBe(true);
    expect(result.data!.hasRepoScope).toBe(true);
    expect(result.data!.login).toBe('octocat');
    expect(result.data!.rateLimit).toBe(4987);
  });

  it('returns hasRepoScope=false (not failure) when scope is missing', async () => {
    const headers = new Headers();
    headers.set('x-oauth-scopes', 'read:user, gist'); // no `repo`
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers,
      json: async () => ({ login: 'octocat' }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: 'ghp_no_repo',
      orgName: 'acme-corp',
    });

    // Per the guidance: success returns the result envelope; the caller
    // (handler) decides whether hasRepoScope=false is fatal — for fork it is.
    expect(result.isSuccess).toBe(true);
    expect(result.data!.reachable).toBe(true);
    expect(result.data!.hasRepoScope).toBe(false);
    expect(result.data!.login).toBe('octocat');
  });

  it('returns GITHUB_AUTH_FAILED on 401 (dead/expired token)', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers(),
      json: async () => ({}),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: 'ghp_expired',
      orgName: 'acme-corp',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_AUTH_FAILED');
    expect(result.errorMessage).toContain('401');
  });

  it('returns GITHUB_UNREACHABLE when fetch throws (network error)', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('ENOTFOUND api.github.com')) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: 'ghp_any',
      orgName: 'acme-corp',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_UNREACHABLE');
    expect(result.errorMessage).toContain('ENOTFOUND');
  });

  it('defaults rateLimit to 5000 when X-RateLimit-Remaining header is absent', async () => {
    const headers = new Headers();
    headers.set('x-oauth-scopes', 'repo');
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers,
      json: async () => ({ login: 'octocat' }),
    } as unknown as Response;
    global.fetch = jest.fn().mockResolvedValueOnce(mockResponse) as unknown as typeof global.fetch;

    const result = await service.checkConnection({
      token: 'ghp_no_ratelimit_header',
      orgName: 'acme-corp',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.rateLimit).toBe(5000);
  });
});

describe('GitHubProvisionerService.setRepoSecrets (Phase C12, Rule F-5 deferred)', () => {
  let service: GitHubProvisionerService;

  beforeEach(() => {
    service = new GitHubProvisionerService();
  });

  it('rejects missing required params with VALIDATION_FAILURE', async () => {
    const result = await service.setRepoSecrets({
      orgName: '',
      repoName: 'r',
      token: 't',
      secrets: [{ name: 'X', value: 'y' }],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns success when secrets array is empty (vacuously success)', async () => {
    const result = await service.setRepoSecrets({
      orgName: 'acme',
      repoName: 'acme--user-registration',
      token: 'ghp_test',
      secrets: [],
    });
    expect(result.isSuccess).toBe(true);
  });

  it('Rule F-5: returns SET_SECRETS_DEFERRED for non-empty secrets (carry-forward = libsodium integration)', async () => {
    const result = await service.setRepoSecrets({
      orgName: 'acme',
      repoName: 'acme--user-registration',
      token: 'ghp_test',
      secrets: [
        { name: 'XIIGEN_TENANT_ID', value: 'acme-corp' },
        { name: 'DOCKER_REGISTRY_TOKEN', value: 'ghp_docker' },
      ],
    });
    // Per Rule F-5 the call MUST return failure with errorCode SET_SECRETS_DEFERRED
    // so the handler can log a warning and continue (non-fatal).
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SET_SECRETS_DEFERRED');
    expect(result.errorMessage).toContain('libsodium');
  });
});

describe('GitHubProvisionerService.createRepo / push retry hardening', () => {
  let service: GitHubProvisionerService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    service = new GitHubProvisionerService();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reuses an already-created repo after a previous push failure', async () => {
    const createConflict = {
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      text: async () => 'name already exists on this account',
    } as unknown as Response;
    const existingRepo = {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        html_url: 'https://github.com/lubochka/acme-corp--profile-enrichment',
        id: 12345,
      }),
    } as unknown as Response;
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(createConflict)
      .mockResolvedValueOnce(existingRepo) as unknown as typeof global.fetch;

    const result = await service.createRepo({
      orgName: 'lubochka',
      repoName: 'acme-corp--profile-enrichment',
      token: 'ghp_valid',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({
      repoUrl: 'https://github.com/lubochka/acme-corp--profile-enrichment',
      repoId: '12345',
    });
    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://api.github.com/repos/lubochka/acme-corp--profile-enrichment',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates the initial commit through the contents API, skips .env.tenant, and writes CI last', async () => {
    const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-provisioner-'));
    await fs.mkdir(path.join(stagingDir, '.github', 'workflows'), { recursive: true });
    await fs.writeFile(path.join(stagingDir, 'package.json'), '{"name":"fork"}\n');
    await fs.writeFile(path.join(stagingDir, '.env.tenant'), 'SECRET=do-not-commit\n');
    await fs.writeFile(
      path.join(stagingDir, '.github', 'workflows', 'flow-ci.yml'),
      'name: flow\n',
    );

    const writtenPaths: string[] = [];
    const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
      if (String(url).includes('/contents/')) {
        writtenPaths.push(String(url).split('/contents/')[1]);
        expect(init.method).toBe('PUT');
        expect(body['message']).toBe('Initial fork');
        expect(typeof body['content']).toBe('string');
        return {
          ok: true,
          status: 201,
          json: async () => ({ commit: { sha: `commit-${writtenPaths.length}` } }),
        } as unknown as Response;
      }
      throw new Error(`unexpected fetch URL: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await service.pushInitialCommit({
      repoUrl: 'https://github.com/lubochka/acme-corp--profile-enrichment',
      stagingDir,
      message: 'Initial fork',
      token: 'ghp_valid',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ commitSha: 'commit-2' });
    expect(writtenPaths).toEqual([
      'package.json',
      '.github/workflows/flow-ci.yml',
    ]);
    await fs.rm(stagingDir, { recursive: true, force: true });
  });

  it('retries transient GitHub content write failures before failing the fork push', async () => {
    const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-provisioner-'));
    await fs.writeFile(path.join(stagingDir, 'docs-evidence.png'), 'png bytes');

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 504,
        text: async () => 'gateway timeout',
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ commit: { sha: 'commit-after-retry' } }),
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await service.pushInitialCommit({
      repoUrl: 'https://github.com/lubochka/northwind--user-registration-acme-pro-members',
      stagingDir,
      message: 'Initial fork',
      token: 'ghp_valid',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual({ commitSha: 'commit-after-retry' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await fs.rm(stagingDir, { recursive: true, force: true });
  });
});

describe('GitHubProvisionerService.exportRepoContents', () => {
  let service: GitHubProvisionerService;
  let originalFetch: typeof global.fetch;
  let stagingDir: string;

  beforeEach(async () => {
    service = new GitHubProvisionerService();
    originalFetch = global.fetch;
    stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'github-export-'));
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    await fs.rm(stagingDir, { recursive: true, force: true });
  });

  it('exports an existing repo tree into a staging directory', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ default_branch: 'main' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ commit: { sha: 'source-sha' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tree: [
            { path: 'tenant.config.json', type: 'blob', sha: 'blob-config' },
            { path: 'docs/FUNCTIONAL-SPEC.md', type: 'blob', sha: 'blob-doc' },
          ],
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          encoding: 'base64',
          content: Buffer.from('{"tenantId":"acme-corp"}').toString('base64'),
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          encoding: 'base64',
          content: Buffer.from('# Functional spec\n').toString('base64'),
        }),
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await service.exportRepoContents({
      sourceFullName: 'lubochka/acme-corp--user-registration-acme-pro-members',
      token: 'ghp_valid',
      stagingDir,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toMatchObject({
      stagingDir,
      fileCount: 2,
      defaultBranch: 'main',
      sourceCommitSha: 'source-sha',
      manifest: ['tenant.config.json', 'docs/FUNCTIONAL-SPEC.md'],
    });
    await expect(fs.readFile(path.join(stagingDir, 'tenant.config.json'), 'utf-8')).resolves.toBe(
      '{"tenantId":"acme-corp"}',
    );
    await expect(
      fs.readFile(path.join(stagingDir, 'docs', 'FUNCTIONAL-SPEC.md'), 'utf-8'),
    ).resolves.toBe('# Functional spec\n');
  });

  it('rejects unsafe paths from the source repo tree', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ default_branch: 'main' }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ commit: { sha: 'source-sha' } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tree: [{ path: '../escape.txt', type: 'blob', sha: 'blob-escape' }],
        }),
      } as unknown as Response);
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await service.exportRepoContents({
      sourceFullName: 'lubochka/acme-corp--user-registration-acme-pro-members',
      token: 'ghp_valid',
      stagingDir,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_TREE_UNSAFE_PATH');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
