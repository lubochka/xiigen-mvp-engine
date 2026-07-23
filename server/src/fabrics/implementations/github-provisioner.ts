/**
 * GitHubProvisionerService — concrete IForkProvisioner.
 *
 * Rule 1 boundary: GitHub-specific calls live only in this file. Handlers
 * inject `IForkProvisioner` and receive `DataProcessResult` — no Octokit
 * types, no HTTP status codes, no GitHub API URLs leak upstream.
 *
 * Token: passed per-call (the handler reads it from ISecretsManager on each
 * invocation). Never stored in this service.
 *
 * Uses native `fetch` for repo CRUD and initial commits (no Octokit dependency).
 *
 * All methods return DataProcessResult (DNA-3). No throws.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 4.
 */

import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../kernel/microservice-base';
import {
  CheckConnectionParams,
  CheckConnectionResult,
  CreateRepoParams,
  DeleteRepoParams,
  ExportRepoContentsParams,
  ExportRepoContentsResult,
  IForkProvisioner,
  PushCommitParams,
  RenameRepoParams,
  SetRepoSecretsParams,
} from '../interfaces/fork-provisioner.fabric.interface';

const GITHUB_API_BASE = 'https://api.github.com';

@Injectable()
export class GitHubProvisionerService
  extends MicroserviceBase
  implements IForkProvisioner
{
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'fabric.fork.github',
        serviceName: 'GitHubProvisionerService',
        flowId: 'FLOW-47',
      }),
    });
  }
  async createRepo(
    params: CreateRepoParams,
  ): Promise<DataProcessResult<{ repoUrl: string; repoId: string }>> {
    const { orgName, repoName, token } = params;
    if (!orgName || !repoName || !token) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'orgName, repoName, and token are required',
      );
    }

    try {
      // First try org-scoped endpoint
      let response = await fetch(`${GITHUB_API_BASE}/orgs/${orgName}/repos`, {
        method: 'POST',
        headers: this.githubHeaders(token),
        body: JSON.stringify({
          name: repoName,
          private: true,
          auto_init: false,
          description: `XIIGen tenant fork — ${repoName}`,
        }),
      });

      // If orgName is actually a user account, fall back to user-scoped endpoint
      if (response.status === 404) {
        response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
          method: 'POST',
          headers: this.githubHeaders(token),
          body: JSON.stringify({
            name: repoName,
            private: true,
            auto_init: false,
            description: `XIIGen tenant fork — ${repoName}`,
          }),
        });
      }

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 422) {
          const existing = await this.getExistingRepo(orgName, repoName, token);
          if (existing.isSuccess && existing.data) {
            return existing;
          }
        }
        return DataProcessResult.failure(
          `GITHUB_CREATE_${response.status}`,
          `GitHub repo creation failed (${response.status}): ${body.slice(0, 200)}`,
        );
      }

      const data = (await response.json()) as { html_url: string; id: number };
      return DataProcessResult.success({
        repoUrl: data.html_url,
        repoId: String(data.id),
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_NETWORK_ERROR', e.message, e);
    }
  }

  async deleteRepo(params: DeleteRepoParams): Promise<DataProcessResult<void>> {
    const { orgName, repoName, token } = params;
    if (!orgName || !repoName || !token) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'orgName, repoName, and token are required',
      );
    }

    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${orgName}/${repoName}`,
        { method: 'DELETE', headers: this.githubHeaders(token) },
      );

      if (response.status === 204) {
        return DataProcessResult.success(undefined as unknown as void);
      }
      if (response.status === 404) {
        // Already gone — treat as success (idempotent)
        return DataProcessResult.success(undefined as unknown as void);
      }

      const body = await response.text();
      return DataProcessResult.failure(
        `GITHUB_DELETE_${response.status}`,
        `GitHub repo deletion failed (${response.status}): ${body.slice(0, 200)}`,
      );
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_NETWORK_ERROR', e.message, e);
    }
  }

  async pushInitialCommit(
    params: PushCommitParams,
  ): Promise<DataProcessResult<{ commitSha: string }>> {
    const { repoUrl, stagingDir, message, token } = params;
    if (!repoUrl || !stagingDir || !message || !token) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'repoUrl, stagingDir, message, and token are required',
      );
    }

    try {
      // Use the contents API so an empty repo can receive its first branch.
      const parsedRepo = this.parseRepoUrl(repoUrl);
      if (!parsedRepo.isSuccess || !parsedRepo.data) {
        return DataProcessResult.failure(
          parsedRepo.errorCode ?? 'REPO_URL_INVALID',
          parsedRepo.errorMessage ?? 'repoUrl could not be parsed',
        );
      }

      const files = await this.collectCommitFiles(stagingDir);
      if (files.length === 0) {
        return DataProcessResult.failure('EMPTY_COMMIT', 'No commit-safe files found in stagingDir');
      }

      let commitSha: string | null = null;
      for (const file of this.workflowFilesLast(files)) {
        const content = await fs.readFile(file.absolutePath);
        const contentResult = await this.putContentFile({
          ...parsedRepo.data,
          token,
          path: file.relativePath,
          message,
          content,
        });
        if (!contentResult.isSuccess || !contentResult.data) {
          return DataProcessResult.failure(
            contentResult.errorCode ?? 'GITHUB_CONTENT_FAILED',
            contentResult.errorMessage ?? `content upload failed for ${file.relativePath}`,
          );
        }
        commitSha = contentResult.data;
      }

      if (!commitSha) return DataProcessResult.failure('EMPTY_COMMIT', 'No commit sha returned');
      return DataProcessResult.success({ commitSha });

    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_INITIAL_COMMIT_FAILED', e.message, e);
    }
  }

  async exportRepoContents(
    params: ExportRepoContentsParams,
  ): Promise<DataProcessResult<ExportRepoContentsResult>> {
    const { sourceFullName, token, stagingDir } = params;
    if (!sourceFullName || !token || !stagingDir) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'sourceFullName, token, and stagingDir are required',
      );
    }

    const parsed = this.parseFullName(sourceFullName);
    if (!parsed.isSuccess || !parsed.data) {
      return DataProcessResult.failure(
        parsed.errorCode ?? 'SOURCE_REPO_INVALID',
        parsed.errorMessage ?? 'sourceFullName could not be parsed',
      );
    }

    try {
      const repoResp = await fetch(
        `${GITHUB_API_BASE}/repos/${parsed.data.owner}/${parsed.data.repo}`,
        { method: 'GET', headers: this.githubHeaders(token) },
      );
      if (!repoResp.ok) {
        const body = await repoResp.text();
        return DataProcessResult.failure(
          `GITHUB_SOURCE_${repoResp.status}`,
          `GitHub source repo read failed (${repoResp.status}): ${body.slice(0, 200)}`,
        );
      }

      const repoData = (await repoResp.json()) as { default_branch?: string };
      const branch = params.ref ?? repoData.default_branch ?? 'main';
      const branchResp = await fetch(
        `${GITHUB_API_BASE}/repos/${parsed.data.owner}/${parsed.data.repo}/branches/${encodeURIComponent(branch)}`,
        { method: 'GET', headers: this.githubHeaders(token) },
      );
      if (!branchResp.ok) {
        const body = await branchResp.text();
        return DataProcessResult.failure(
          `GITHUB_BRANCH_${branchResp.status}`,
          `GitHub branch read failed (${branchResp.status}): ${body.slice(0, 200)}`,
        );
      }

      const branchData = (await branchResp.json()) as { commit?: { sha?: string } };
      const sourceCommitSha = branchData.commit?.sha;
      if (!sourceCommitSha) {
        return DataProcessResult.failure('GITHUB_BRANCH_INVALID', 'source branch has no commit sha');
      }

      const treeResp = await fetch(
        `${GITHUB_API_BASE}/repos/${parsed.data.owner}/${parsed.data.repo}/git/trees/${sourceCommitSha}?recursive=1`,
        { method: 'GET', headers: this.githubHeaders(token) },
      );
      if (!treeResp.ok) {
        const body = await treeResp.text();
        return DataProcessResult.failure(
          `GITHUB_TREE_${treeResp.status}`,
          `GitHub tree read failed (${treeResp.status}): ${body.slice(0, 200)}`,
        );
      }

      const treeData = (await treeResp.json()) as {
        tree?: Array<{ path?: string; type?: string; sha?: string }>;
      };
      const blobs = (treeData.tree ?? []).filter(
        (entry) => entry.type === 'blob' && entry.path && entry.sha,
      );

      await fs.rm(stagingDir, { recursive: true, force: true });
      await fs.mkdir(stagingDir, { recursive: true });

      const manifest: string[] = [];
      for (const blob of blobs) {
        const relativePath = blob.path!;
        if (!this.isSafeRepoPath(relativePath)) {
          return DataProcessResult.failure(
            'GITHUB_TREE_UNSAFE_PATH',
            `Source repo contains unsafe path: ${relativePath}`,
          );
        }

        const blobResp = await fetch(
          `${GITHUB_API_BASE}/repos/${parsed.data.owner}/${parsed.data.repo}/git/blobs/${blob.sha}`,
          { method: 'GET', headers: this.githubHeaders(token) },
        );
        if (!blobResp.ok) {
          const body = await blobResp.text();
          return DataProcessResult.failure(
            `GITHUB_BLOB_${blobResp.status}`,
            `GitHub blob read failed for ${relativePath} (${blobResp.status}): ${body.slice(0, 200)}`,
          );
        }

        const blobData = (await blobResp.json()) as { content?: string; encoding?: string };
        if (blobData.encoding !== 'base64' || !blobData.content) {
          return DataProcessResult.failure(
            'GITHUB_BLOB_ENCODING',
            `Unsupported blob encoding for ${relativePath}`,
          );
        }

        const absolutePath = path.join(stagingDir, relativePath);
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(
          absolutePath,
          Buffer.from(blobData.content.replace(/\s/g, ''), 'base64'),
        );
        manifest.push(relativePath.replace(/\\/g, '/'));
      }

      return DataProcessResult.success({
        stagingDir,
        fileCount: manifest.length,
        defaultBranch: branch,
        sourceCommitSha,
        manifest,
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_EXPORT_FAILED', e.message, e);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Phase C12 (DEV-115, 2026-04-26): connection-health preflight.
   *
   * Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §IForkProvisioner —
   * non-destructive `GET /user` to verify the token is alive AND has
   * `repo` scope.
   *
   * - 200 + scopes header includes 'repo' → success(reachable=true,hasRepoScope=true)
   * - 200 + scopes header missing 'repo'  → success(hasRepoScope=false)
   *   (caller decides if this is fatal — for fork it is)
   * - non-2xx                             → failure('GITHUB_AUTH_FAILED')
   * - fetch throws                        → failure('GITHUB_UNREACHABLE')
   */
  async checkConnection(
    params: CheckConnectionParams,
  ): Promise<DataProcessResult<CheckConnectionResult>> {
    const { token } = params;
    if (!token) {
      return DataProcessResult.failure('VALIDATION_FAILURE', 'token required');
    }
    try {
      const resp = await fetch(`${GITHUB_API_BASE}/user`, {
        method: 'GET',
        headers: this.githubHeaders(token),
      });
      if (!resp.ok) {
        return DataProcessResult.failure(
          'GITHUB_AUTH_FAILED',
          `GitHub token invalid: HTTP ${resp.status} ${resp.statusText}`,
        );
      }
      const user = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      const scopeHeader = resp.headers.get('x-oauth-scopes') ?? '';
      const scopes = scopeHeader.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
      const hasRepoScope = scopes.includes('repo');
      const rateLimit = parseInt(resp.headers.get('x-ratelimit-remaining') ?? '5000', 10);

      return DataProcessResult.success({
        reachable: true,
        login: (user['login'] as string | undefined) ?? '',
        hasRepoScope,
        rateLimit,
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.failure(
        'GITHUB_UNREACHABLE',
        `GitHub API unreachable: ${e.message}`,
      );
    }
  }

  /**
   * Phase C12 (DEV-115, 2026-04-26): rename an existing repo.
   * Used when AI adaptation changes the module verb after fork creation.
   * Implementation: PATCH /repos/{owner}/{old}  body={ name: new }.
   */
  async renameRepo(
    params: RenameRepoParams,
  ): Promise<DataProcessResult<{ newRepoUrl: string }>> {
    const { orgName, oldRepoName, newRepoName, token } = params;
    if (!orgName || !oldRepoName || !newRepoName || !token) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'orgName, oldRepoName, newRepoName, token required',
      );
    }
    try {
      const resp = await fetch(`${GITHUB_API_BASE}/repos/${orgName}/${oldRepoName}`, {
        method: 'PATCH',
        headers: this.githubHeaders(token),
        body: JSON.stringify({ name: newRepoName }),
      });
      if (!resp.ok) {
        return DataProcessResult.failure(
          'RENAME_REPO_FAILED',
          `GitHub /repos/${orgName}/${oldRepoName} PATCH returned ${resp.status}`,
        );
      }
      const body = (await resp.json().catch(() => ({}))) as Record<string, unknown>;
      const newRepoUrl =
        (body['html_url'] as string | undefined) ??
        `https://github.com/${orgName}/${newRepoName}`;
      return DataProcessResult.success({ newRepoUrl });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('RENAME_REPO_FAILED', e.message, e);
    }
  }

  /**
   * Phase C12 (DEV-115, 2026-04-26): set GitHub Actions secrets in the
   * fork repo. Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §setRepoSecrets:
   *
   *   - Sealed-box (libsodium) encryption of secret values is REQUIRED by
   *     the GitHub REST API.
   *   - The repo's public key is fetched via
   *     `GET /repos/{owner}/{repo}/actions/secrets/public-key` first.
   *   - Each secret is encrypted client-side and PUT to
   *     `/repos/{owner}/{repo}/actions/secrets/{name}` body
   *     `{ encrypted_value, key_id }`.
   *
   * Per Rule F-5: failure is NON-FATAL — the handler logs a warning and
   * the fork-completion event still fires. Secrets can be re-set via a
   * follow-up event or manually. We surface that policy in the error
   * envelope so the handler can log without aborting.
   *
   * The full sealed-box encryption requires `libsodium-wrappers` (or
   * Node's `crypto.box.seal` once stable). This implementation returns
   * a structured PARTIAL_SUCCESS result that the handler treats as a
   * warning rather than a fork-blocker. A follow-up commit can wire in
   * libsodium and elevate this to a real implementation.
   */
  async setRepoSecrets(
    params: SetRepoSecretsParams,
  ): Promise<DataProcessResult<void>> {
    const { orgName, repoName, token, secrets } = params;
    if (!orgName || !repoName || !token) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'orgName, repoName, token required',
      );
    }
    if (!secrets || secrets.length === 0) {
      // Nothing to set — vacuously success.
      return DataProcessResult.success(undefined);
    }
    // Per Rule F-5: log a structured warning indicating the call was
    // attempted but sealed-box encryption is not yet wired in. The
    // handler reads errorCode='SET_SECRETS_DEFERRED' and treats it as
    // non-fatal. This is the "documented partial-success" the guidance
    // describes; closing it requires libsodium-wrappers integration.
    return DataProcessResult.failure(
      'SET_SECRETS_DEFERRED',
      `setRepoSecrets called for ${orgName}/${repoName} with ${secrets.length} secret(s) — ` +
        'sealed-box encryption pending (libsodium integration carry-forward). ' +
        'Per Rule F-5 this is non-fatal: the handler should log a warning and continue. ' +
        'Secrets can be set manually at GitHub repo Settings -> Secrets -> Actions.',
    );
  }

  private githubHeaders(token: string): Record<string, string> {
    return {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  private async getExistingRepo(
    orgName: string,
    repoName: string,
    token: string,
  ): Promise<DataProcessResult<{ repoUrl: string; repoId: string }>> {
    try {
      const response = await fetch(
        `${GITHUB_API_BASE}/repos/${encodeURIComponent(orgName)}/${encodeURIComponent(repoName)}`,
        { method: 'GET', headers: this.githubHeaders(token) },
      );
      if (!response.ok) {
        return DataProcessResult.failure(
          `GITHUB_LOOKUP_${response.status}`,
          `GitHub repo lookup failed (${response.status})`,
        );
      }

      const data = (await response.json()) as { html_url?: string; id?: number | string };
      if (!data.html_url || data.id === undefined || data.id === null) {
        return DataProcessResult.failure(
          'GITHUB_LOOKUP_MALFORMED',
          'GitHub repo lookup response missing html_url or id',
        );
      }

      return DataProcessResult.success({
        repoUrl: data.html_url,
        repoId: String(data.id),
      });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_LOOKUP_FAILED', e.message, e);
    }
  }

  private parseRepoUrl(
    repoUrl: string,
  ): DataProcessResult<{ owner: string; repo: string }> {
    try {
      const parsed = new URL(repoUrl);
      const [owner, repoRaw] = parsed.pathname.replace(/^\/|\/$/g, '').split('/');
      const repo = repoRaw?.replace(/\.git$/, '');
      if (!owner || !repo) {
        return DataProcessResult.failure('REPO_URL_INVALID', `Invalid repoUrl: ${repoUrl}`);
      }
      return DataProcessResult.success({ owner, repo });
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('REPO_URL_INVALID', e.message, e);
    }
  }

  private parseFullName(
    fullName: string,
  ): DataProcessResult<{ owner: string; repo: string }> {
    const parts = fullName.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return DataProcessResult.failure(
        'SOURCE_REPO_INVALID',
        'sourceFullName must be owner/repo',
      );
    }
    return DataProcessResult.success({ owner: parts[0], repo: parts[1] });
  }

  private isSafeRepoPath(relativePath: string): boolean {
    return (
      !path.isAbsolute(relativePath) &&
      !relativePath.split('/').includes('..') &&
      !relativePath.split('\\').includes('..') &&
      !relativePath.startsWith('.git/')
    );
  }

  private async collectCommitFiles(
    stagingDir: string,
  ): Promise<Array<{ absolutePath: string; relativePath: string }>> {
    const collected: Array<{ absolutePath: string; relativePath: string }> = [];

    const visit = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const absolutePath = path.join(dir, entry.name);
        const relativePath = path.relative(stagingDir, absolutePath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          await visit(absolutePath);
          continue;
        }
        if (!entry.isFile()) continue;
        if (entry.name === '.env.tenant') continue;
        collected.push({ absolutePath, relativePath });
      }
    };

    await visit(stagingDir);
    collected.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    return collected;
  }

  private workflowFilesLast(
    files: Array<{ absolutePath: string; relativePath: string }>,
  ): Array<{ absolutePath: string; relativePath: string }> {
    return [...files].sort((a, b) => {
      const aWorkflow = a.relativePath.startsWith('.github/workflows/') ? 1 : 0;
      const bWorkflow = b.relativePath.startsWith('.github/workflows/') ? 1 : 0;
      if (aWorkflow !== bWorkflow) return aWorkflow - bWorkflow;
      return a.relativePath.localeCompare(b.relativePath);
    });
  }

  private async putContentFile(params: {
    owner: string;
    repo: string;
    token: string;
    path: string;
    message: string;
    content: Buffer;
  }): Promise<DataProcessResult<string>> {
    const created = await this.putContentFileRequest(params);
    if (created.isSuccess || !['GITHUB_CONTENT_409', 'GITHUB_CONTENT_422'].includes(created.errorCode ?? '')) {
      return created;
    }

    const existingSha = await this.getContentSha(params);
    if (!existingSha.isSuccess || !existingSha.data) {
      return created;
    }

    return this.putContentFileRequest({ ...params, existingSha: existingSha.data });
  }

  private async putContentFileRequest(params: {
    owner: string;
    repo: string;
    token: string;
    path: string;
    message: string;
    content: Buffer;
    existingSha?: string;
  }): Promise<DataProcessResult<string>> {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(
          this.contentsUrl(params.owner, params.repo, params.path),
          {
            method: 'PUT',
            headers: this.githubHeaders(params.token),
            body: JSON.stringify({
              message: params.message,
              content: params.content.toString('base64'),
              ...(params.existingSha ? { sha: params.existingSha } : {}),
            }),
          },
        );

        if (!response.ok) {
          const body = await response.text();
          if (this.isTransientGitHubStatus(response.status) && attempt < maxAttempts) {
            await this.waitBeforeTransientRetry(attempt);
            continue;
          }
          return DataProcessResult.failure(
            `GITHUB_CONTENT_${response.status}`,
            `GitHub content write failed for ${params.path} (${response.status}): ${body.slice(0, 200)}`,
          );
        }

        const data = (await response.json()) as { commit?: { sha?: string } };
        if (!data.commit?.sha) {
          return DataProcessResult.failure('GITHUB_CONTENT_MALFORMED', 'Content response missing commit sha');
        }
        return DataProcessResult.success(data.commit.sha);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxAttempts) {
          await this.waitBeforeTransientRetry(attempt);
          continue;
        }
        return DataProcessResult.error('GITHUB_CONTENT_FAILED', e.message, e);
      }
    }

    return DataProcessResult.failure(
      'GITHUB_CONTENT_FAILED',
      `GitHub content write failed for ${params.path}`,
    );
  }

  private isTransientGitHubStatus(status: number): boolean {
    return status === 500 || status === 502 || status === 503 || status === 504;
  }

  private async waitBeforeTransientRetry(attempt: number): Promise<void> {
    const delayMs = process.env['NODE_ENV'] === 'test' ? 0 : attempt * 1000;
    if (delayMs <= 0) return;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private async getContentSha(params: {
    owner: string;
    repo: string;
    token: string;
    path: string;
  }): Promise<DataProcessResult<string>> {
    try {
      const response = await fetch(
        this.contentsUrl(params.owner, params.repo, params.path),
        { method: 'GET', headers: this.githubHeaders(params.token) },
      );
      if (!response.ok) {
        const body = await response.text();
        return DataProcessResult.failure(
          `GITHUB_CONTENT_LOOKUP_${response.status}`,
          `GitHub content lookup failed for ${params.path} (${response.status}): ${body.slice(0, 200)}`,
        );
      }
      const data = (await response.json()) as { sha?: string };
      if (!data.sha) return DataProcessResult.failure('GITHUB_CONTENT_LOOKUP_MALFORMED', 'Content lookup missing sha');
      return DataProcessResult.success(data.sha);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('GITHUB_CONTENT_LOOKUP_FAILED', e.message, e);
    }
  }

  private contentsUrl(owner: string, repo: string, filePath: string): string {
    const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
    return `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
  }

}
