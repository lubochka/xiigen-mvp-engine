/**
 * FLOW-47 Module Lifecycle — Fork Flow contracts.
 *
 * Task types T671..T673 implement the atomic "fork this flow" operation
 * triggered by the marketplace UI.
 *
 * Event chain:
 *   1. Marketplace UI → FlowForkRequested (T671 handler)
 *   2. T671 orchestrates assembler + docker-env-gen + fork-provisioner
 *      under DNA-8 outbox discipline (storeDocument BEFORE enqueue)
 *   3. Success → FlowForkCompleted (T672) → marketplace dashboard flips to ACTIVE
 *   4. Failure → FlowForkFailed (T673) carries rollbackState for the
 *      ForkFlowRollbackHandler to compensate
 *
 * DNA-1 compliance: business data is `Record<string, unknown>`; tenantId is
 *   NOT in the input schema — handler reads it from AsyncLocalStorage.
 * DNA-5: tenant scope is automatic; no tenantId parameters on fabric calls.
 * Rule 16: all files + services use the `module-lifecycle` slug.
 *
 * T-numbers assigned from next-available window (T670 was highest pre-session).
 * BFA rule tags: CF-826 (bundle activation DRY_RUN gate applies before fork completes).
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 2.
 */

/**
 * FlowForkRequested — marketplace publishes this event when a tenant clicks
 * "fork this flow" in the UI. Handler is ForkFlowHandlerService (T671).
 *
 * ⚠️ tenantId is NOT in this payload. It comes from AsyncLocalStorage at
 * handler execution time. The marketplace controller that publishes this
 * event has already bound the tenant context via CLS.
 */
export interface FlowForkRequestedPayload {
  flowSlug: string;        // e.g. "user-registration"
  flowId: string;          // e.g. "FLOW-01"
  targetOrgName: string;   // GitHub org where the tenant's repo will live
  /** Optional override for the repo name. Default: `xiigen-{flowSlug}-{tenantId}`. */
  repoNameOverride?: string;
  /** Optional version tag for the first release (default '1.0.0'). */
  initialVersion?: string;
}

/**
 * FlowForkCompleted — fired by T671 on success. Consumed by marketplace
 * dashboard to flip the UI status to ACTIVE.
 */
export interface FlowForkCompletedPayload {
  flowSlug: string;
  flowId: string;
  repoUrl: string;
  repoFullName: string;
  initialCommitSha: string;
  originVersion: string;
  forkId: string;
  forkedAt: string;
}

/**
 * FlowForkFailed — fired when any step fails. `rollbackState` tells
 * ForkFlowRollbackHandlerService exactly what to compensate:
 *   - PREFLIGHT: connection-health check failed BEFORE any side-effect
 *                (Phase C12) — nothing to clean up. Tenant has missing/
 *                invalid GitHub or Docker credentials.
 *   - NOTHING: no external side-effects yet (assembly/env-gen failed)
 *   - REPO_CREATED: GitHub repo exists but push/CI did not complete
 *                   → rollback must delete the repo
 */
export interface FlowForkFailedPayload {
  flowSlug: string;
  flowId: string;
  forkId: string;
  failedStep:
    | 'CONNECTION_PREFLIGHT'
    | 'ASSEMBLE'
    | 'GENERATE_ENV'
    | 'SECRETS_READ'
    | 'CREATE_REPO'
    | 'PUSH'
    | 'REGISTER';
  errorCode: string;
  errorMessage: string;
  rollbackState: 'PREFLIGHT' | 'NOTHING' | 'REPO_CREATED';
  /** Included when rollbackState=REPO_CREATED so the rollback handler
   *  can call IForkProvisioner.deleteRepo without re-resolving. */
  orgName?: string;
  repoName?: string;
}

/** Task contract task-IDs for FLOW-47 fork orchestration. */
export const FORK_FLOW_TASK_TYPES = {
  FORK_FLOW_REQUESTED: 'T671',
  FORK_FLOW_COMPLETED: 'T672',
  FORK_FLOW_FAILED: 'T673',
} as const;

/** CloudEvents type strings. */
export const FORK_FLOW_EVENT_TYPES = {
  REQUESTED: 'xiigen.flow.fork.requested',
  COMPLETED: 'xiigen.flow.fork.completed',
  FAILED: 'xiigen.flow.fork.failed',
  ROLLBACK: 'xiigen.flow.fork.rollback',
} as const;

/**
 * Phase C12 (DEV-115, 2026-04-26): canonical Vault key names.
 *
 * These are the per-tenant secret KEY names. The full Vault path is
 * constructed by the secrets manager as
 * `xiigen/tenants/{tenantId}/{KEY}` where {tenantId} is read from the
 * AsyncLocalStorage TenantContext (DNA-5). Service code never builds
 * Vault paths manually — it calls `secrets.get(KEY)` and the manager
 * handles per-tenant scoping.
 *
 * Defined per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §VAULT KEY SCHEMA.
 */
/** Tenant's GitHub PAT or App token (`repo` + `delete_repo` scopes required). */
export const TENANT_GITHUB_TOKEN_KEY = 'github_token';
/** Tenant's GitHub org or user account name (e.g. "acme-corp"). */
export const TENANT_GITHUB_ORG_KEY = 'github_org_name';
/** Tenant's Docker registry URL (e.g. "ghcr.io" or "acme.azurecr.io"). */
export const TENANT_DOCKER_REGISTRY_URL = 'docker_registry_url';
/** Tenant's Docker registry token (read/write:packages or equivalent). */
export const TENANT_DOCKER_REGISTRY_KEY = 'docker_registry_token';

/** Index where fork records live (read by marketplace dashboard). */
export const MODULE_LIFECYCLE_FORKS_INDEX = 'xiigen-module-lifecycle-forks';
