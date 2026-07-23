/**
 * FABRIC: IForkProvisioner
 *
 * Provisions a tenant-owned private repository for a forked XIIGen flow.
 * Boundary: GitHub API (or any other repo-hosting provider).
 *
 * Per CLAUDE.md Rule 1 (Fabric First): no GitHub SDK import lives outside
 * this fabric's concrete implementation. Handlers inject the interface only.
 *
 * All methods return DataProcessResult (DNA-3). Token passed per-call —
 * the caller reads it from ISecretsManager before invocation. Never stored
 * as a constructor parameter on this service.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 1 — fabric interface.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const FORK_PROVISIONER_SERVICE = Symbol('IForkProvisioner');

export interface CreateRepoParams {
  orgName: string;
  repoName: string;
  token: string; // read by handler from ISecretsManager, passed per-call
}

export interface PushCommitParams {
  repoUrl: string;
  stagingDir: string;
  message: string;
  token: string;
}

export interface ExportRepoContentsParams {
  sourceFullName: string;
  token: string;
  stagingDir: string;
  ref?: string;
}

export interface ExportRepoContentsResult {
  stagingDir: string;
  fileCount: number;
  defaultBranch: string;
  sourceCommitSha: string;
  manifest: string[];
}

export interface DeleteRepoParams {
  orgName: string;
  repoName: string;
  token: string;
}

/**
 * Phase C12 (DEV-115, 2026-04-26): connection-health check params + result.
 *
 * Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §IForkProvisioner.
 *
 * Used by ForkFlowHandlerService as the Step-0 preflight before ANY
 * destructive action. Verifies that the tenant's configured GitHub
 * connection is reachable AND that the supplied PAT carries the `repo`
 * scope required for createRepo. Non-destructive — single read-only
 * `GET /user` call.
 */
export interface CheckConnectionParams {
  /** PAT under test. Resolved by the handler from ISecretsManager. */
  token: string;
  /** Tenant's GitHub org or user account name (audit/diagnostic only). */
  orgName: string;
}

export interface CheckConnectionResult {
  /** TRUE when GitHub responded 200 to GET /user. */
  reachable: boolean;
  /** GitHub login that owns the token (audit). Empty string when reachable=false. */
  login: string;
  /** TRUE when the token's X-OAuth-Scopes header includes `repo`. */
  hasRepoScope: boolean;
  /** Remaining GitHub API calls (warn if < 100). 0 when reachable=false. */
  rateLimit: number;
}

/** Phase C12: rename an existing fork repo (e.g. after AI adaptation changes module name). */
export interface RenameRepoParams {
  orgName: string;
  oldRepoName: string;
  newRepoName: string;
  token: string;
}

/**
 * Phase C12: set GitHub Actions secrets in the fork repo. Called after
 * `pushInitialCommit` so the injected `flow-ci.yml` workflow can read
 * `XIIGEN_TENANT_ID`, `DOCKER_REGISTRY_TOKEN`, etc. when it runs.
 *
 * Implementation must encrypt secret values with the repo's public key
 * (libsodium sealed-box) per GitHub REST API contract.
 */
export interface SetRepoSecretsParams {
  orgName: string;
  repoName: string;
  token: string;
  secrets: ReadonlyArray<{ name: string; value: string }>;
}

export interface IForkProvisioner {
  /**
   * Phase C12: connection-health preflight. Verifies the tenant's GitHub
   * token is valid AND has `repo` scope. Read-only — never mutates GitHub
   * state. Returns isSuccess=false with errorCode `GITHUB_AUTH_FAILED` when
   * GitHub returns non-2xx, or `GITHUB_UNREACHABLE` when fetch throws.
   */
  checkConnection(
    params: CheckConnectionParams,
  ): Promise<DataProcessResult<CheckConnectionResult>>;

  /** Create a private repo in the target organisation. */
  createRepo(
    params: CreateRepoParams,
  ): Promise<DataProcessResult<{ repoUrl: string; repoId: string }>>;

  /** Push the staging directory as the initial commit on `main`. */
  pushInitialCommit(
    params: PushCommitParams,
  ): Promise<DataProcessResult<{ commitSha: string }>>;

  /** Export an existing GitHub repo into a staging directory for cascade forks. */
  exportRepoContents(
    params: ExportRepoContentsParams,
  ): Promise<DataProcessResult<ExportRepoContentsResult>>;

  /**
   * Delete a repo — used by ForkFlowRollbackHandler when repo was created
   * but subsequent step (push / CI wire-up) failed.
   */
  deleteRepo(params: DeleteRepoParams): Promise<DataProcessResult<void>>;

  /** Phase C12: rename an existing repo (AI-adaptation module-name change). */
  renameRepo(params: RenameRepoParams): Promise<DataProcessResult<{ newRepoUrl: string }>>;

  /**
   * Phase C12: set GitHub Actions secrets in the fork repo. Called after
   * pushInitialCommit. Per Rule F-5: failure is non-fatal — log a warning
   * but allow the fork-completion event to fire.
   */
  setRepoSecrets(params: SetRepoSecretsParams): Promise<DataProcessResult<void>>;
}
