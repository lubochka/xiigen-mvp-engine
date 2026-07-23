/**
 * FABRIC: IDockerRegistryService
 *
 * Phase C12 (DEV-115, 2026-04-26) — per TENANT-CICD-CONNECTION-GUIDANCE-v1.0.
 *
 * Verifies that a tenant's Docker registry is reachable and that the
 * supplied token (or anonymous-pull config) can authenticate. The fabric
 * boundary keeps Docker-protocol details (`/v2/` ping, OAuth realm
 * negotiation) out of `ForkFlowHandlerService`.
 *
 * Per CLAUDE.md Rule 1 (Fabric First): no Docker registry SDK lives outside
 * this fabric's concrete implementation. Handlers inject the interface only.
 *
 * Methods return DataProcessResult (DNA-3). No throws.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const DOCKER_REGISTRY_SERVICE = Symbol('IDockerRegistryService');

export interface DockerCheckConnectionParams {
  /** Tenant's registry base URL (e.g. "ghcr.io" or "https://acme.azurecr.io"). */
  registryUrl: string;
  /**
   * Bearer token for the registry. Optional — some registries permit
   * anonymous /v2/ ping. The check still succeeds when the registry
   * returns 401 with a `WWW-Authenticate` header (= reachable but auth
   * required), as long as the supplied token then succeeds against that
   * challenge.
   */
  token?: string;
}

export interface DockerCheckConnectionResult {
  /** TRUE when the registry's /v2/ endpoint responded 200 OR 401 + accepted token. */
  reachable: boolean;
  /** TRUE when /v2/ returned 200 with the supplied token (or anonymously). */
  authenticated: boolean;
  /** The realm advertised by the registry (for diagnostics). Empty when 200. */
  authChallenge: string;
  /** Latency of the round-trip, ms. -1 when reachable=false. */
  latencyMs: number;
}

export interface IDockerRegistryService {
  /**
   * Phase C12: connection-health preflight for a tenant's Docker registry.
   * Non-destructive — single GET request to `${registryUrl}/v2/`.
   *
   * Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0: a 200 means reachable+auth.
   * A 401 with `WWW-Authenticate` means reachable but needs auth — the
   * caller's token is then exchanged at the realm and re-checked.
   *
   * Returns isSuccess=false with errorCode `DOCKER_UNREACHABLE` when the
   * registry is not contactable, or `DOCKER_AUTH_FAILED` when reachable
   * but the supplied token cannot authenticate.
   */
  checkConnection(
    params: DockerCheckConnectionParams,
  ): Promise<DataProcessResult<DockerCheckConnectionResult>>;
}
