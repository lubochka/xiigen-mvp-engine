/**
 * FABRIC: IDockerEnvGenerator
 *
 * Generates a tenant-isolated Docker environment for a forked flow. Each
 * tenant gets unique ports, generated credentials, named volumes. The
 * compose file is safe to commit; the .env file contains secrets and is
 * added to .gitignore + returned separately for the secrets manager path.
 *
 * Per CLAUDE.md Rule 1 (Fabric First): file system / docker SDK imports
 * stay inside the concrete implementation.
 *
 * Per CLAUDE.md Rule 2 (Safe Configs): generated passwords / tokens go
 * through ISecretsManager — never written into the committable compose file.
 *
 * All methods return DataProcessResult (DNA-3).
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-26 step 1 — fabric interface.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const DOCKER_ENV_SERVICE = Symbol('IDockerEnvGenerator');

export interface GenerateEnvParams {
  flowSlug: string;
  outputDir: string;
  /** @deprecated DNA-5: tenantId is now read from AsyncLocalStorage inside
   *  the concrete provider. This field is kept optional for backwards
   *  compatibility but is NOT consulted — the value from CLS always wins.
   *  Will be removed in a later revision. */
  tenantId?: string;
}

export interface GenerateEnvResult {
  /** Path to docker-compose.tenant.yml — safe to commit. */
  composeFile: string;
  /** Path to .env.tenant — NEVER committed; handed to tenant via secrets. */
  envFile: string;
  /** Port allocations per service (es, redis, app, db). */
  portMap: Record<string, number>;
  /** Generated secrets to store in ISecretsManager (not returned as plaintext
   *  in the handler log). Keys are the secrets-manager key names; values are
   *  the raw generated strings ready for secrets.set(). */
  secretsToStore: Array<{ key: string; value: string; ttlSeconds?: number }>;
}

export interface IDockerEnvGenerator {
  generate(params: GenerateEnvParams): Promise<DataProcessResult<GenerateEnvResult>>;
}
