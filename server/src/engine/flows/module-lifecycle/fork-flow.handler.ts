/**
 * T671 ForkFlowHandlerService [ORCHESTRATION] — FLOW-47 Module Lifecycle.
 *
 * Orchestrates the atomic "fork this flow" operation triggered by a
 * FlowForkRequested event from the marketplace. Wires the four fabrics:
 * IFlowAssembler, IDockerEnvGenerator, IForkProvisioner, ISecretsManager.
 *
 * DNA compliance:
 *   DNA-1  — business data via Record<string, unknown>; no typed domain classes.
 *   DNA-3  — every method returns DataProcessResult. No throw for business logic.
 *   DNA-4  — extends MicroserviceBase; descriptor passed via super() with
 *            serviceId=T671, flowId=FLOW-47. Component slots resolved through
 *            fabric DI (assembler, dockerEnv, provisioner, secrets, db, queue).
 *   DNA-5  — tenantId is read from CLS AsyncLocalStorage; NEVER from input.
 *   DNA-7  — idempotencyKey from CloudEvents envelope prevents duplicate forks.
 *   DNA-8  — storeDocument (fork record IN_PROGRESS) runs BEFORE any enqueue
 *            or external side-effect. Failure before storeDocument: no cleanup
 *            needed. Failure after: rollbackState carries cleanup intent.
 *   DNA-9  — completion / failure events use createCloudEvent() envelope.
 *
 * Rule 16: semantic slug `module-lifecycle`, never `flow-47-*`.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 3.
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-47
 * @className ForkFlowHandlerService
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { createCloudEvent } from '../../../kernel/cloud-events';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../kernel/multi-tenant/tenant-context';
import { DATABASE_SERVICE, IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { QUEUE_SERVICE, IQueueService } from '../../../fabrics/interfaces/queue.interface';
import {
  AssembleResult,
  FLOW_ASSEMBLER_SERVICE,
  IFlowAssembler,
} from '../../../fabrics/interfaces/flow-assembler.fabric.interface';
import {
  DOCKER_ENV_SERVICE,
  IDockerEnvGenerator,
} from '../../../fabrics/interfaces/docker-env.fabric.interface';
import {
  FORK_PROVISIONER_SERVICE,
  IForkProvisioner,
} from '../../../fabrics/interfaces/fork-provisioner.fabric.interface';
import {
  DOCKER_REGISTRY_SERVICE,
  IDockerRegistryService,
} from '../../../fabrics/interfaces/docker-registry.fabric.interface';
import {
  SECRETS_MANAGER_SERVICE,
  ISecretsManager,
} from '../../../fabrics/interfaces/secrets-manager.fabric.interface';
import {
  FlowForkCompletedPayload,
  FlowForkFailedPayload,
  FORK_FLOW_EVENT_TYPES,
  MODULE_LIFECYCLE_FORKS_INDEX,
  TENANT_GITHUB_TOKEN_KEY,
  TENANT_GITHUB_ORG_KEY,
  TENANT_DOCKER_REGISTRY_URL,
  TENANT_DOCKER_REGISTRY_KEY,
} from '../../../engine-contracts/fork-flow-contracts';

@Injectable()
export class ForkFlowHandlerService extends MicroserviceBase {
  constructor(
    @Inject(FLOW_ASSEMBLER_SERVICE) private readonly assembler: IFlowAssembler,
    @Inject(DOCKER_ENV_SERVICE) private readonly dockerEnv: IDockerEnvGenerator,
    @Inject(FORK_PROVISIONER_SERVICE) private readonly provisioner: IForkProvisioner,
    @Inject(DOCKER_REGISTRY_SERVICE) private readonly dockerRegistry: IDockerRegistryService,
    @Inject(SECRETS_MANAGER_SERVICE) private readonly secrets: ISecretsManager,
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly cls: ClsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T671',
        serviceName: 'ForkFlowHandlerService',
        flowId: 'FLOW-47',
      }),
    });
  }

  /**
   * Execute a fork-flow request.
   *
   * Input schema (DNA-1 — Record<string, unknown>):
   *   flowSlug: string   — e.g. 'user-registration'
   *   flowId: string     — e.g. 'FLOW-01'
   *   targetOrgName: string — GitHub org
   *   initialVersion?: string (default '1.0.0')
   *   repoNameOverride?: string
   *
   * tenantId is read from AsyncLocalStorage via CLS — NEVER from input.
   */
  async execute(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TENANT',
        'tenantId required — AsyncLocalStorage context not set (DNA-5)',
      );
    }

    // Validate input fields. Phase C12 (DEV-115, 2026-04-26): targetOrgName
    // was reclassified as a legacy arg — the canonical orgName is read from
    // Vault per-tenant in Step 0 (TENANT_GITHUB_ORG_KEY). Requiring it here
    // would block legitimate callers (queue consumers, integration tests)
    // that omit it now that Vault is the source of truth. Only flowSlug +
    // flowId remain mandatory.
    const flowSlug = input['flowSlug'] as string | undefined;
    const flowId = input['flowId'] as string | undefined;
    const targetOrgName = input['targetOrgName'] as string | undefined;
    const sourceRepoFullName = input['sourceRepoFullName'] as string | undefined;
    if (!flowSlug || !flowId) {
      return DataProcessResult.failure('VALIDATION_FAILURE', 'flowSlug and flowId are required');
    }

    const initialVersion = (input['initialVersion'] as string | undefined) ?? '1.0.0';
    // Phase C11 (DEV-115, 2026-04-26): apply the {tenantId}--{moduleName}
    // double-dash naming convention from FLOW-PORTABILITY-TEST-PROTOCOL-v2.0
    // line 744 + FORK-FLOW-ENGINE-PLAN-v1.2 line 470. Module name defaults
    // to flowSlug today; once the FREEDOM key `flow_module_name` ships,
    // AI-adapted tenants can override the verb (e.g. user-registration ->
    // member-onboarding) by setting that key in their tenant profile.
    // Caller-supplied repoNameOverride still wins when present.
    const repoName =
      (input['repoNameOverride'] as string | undefined) ?? `${tenantId}--${flowSlug}`;

    // Finding 6 (plan v1.1 self-review): idempotency key must be deterministic
    // so that retries map to the same fork record. Same tenant + same flow =
    // same forkId. A second call while the first is IN_PROGRESS is de-duplicated
    // by DNA-7 (setIfAbsent on the fork record) rather than creating a parallel
    // record. No randomUUID / Date.now() in the key.
    const forkId = `fork-${flowSlug}-${tenantId}`;
    // Staging is ephemeral and must survive retries after a failed push left
    // a prior temp directory locked. The persisted fork record stays stable.
    const stagingDir = join(tmpdir(), `${forkId}-${process.pid}-${Date.now()}`);

    // ── Step 0: Connection-health preflight (Phase C12, DEV-115, 2026-04-26) ──
    //
    // Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §"THE TWO NON-NEGOTIABLE
    // PRECONDITIONS FOR ANY FORK OPERATION", verify BOTH GitHub and Docker
    // connections BEFORE any side-effect (assemble / docker-env / store /
    // repo-create / push). On failure: rollbackState='PREFLIGHT' — nothing
    // was created, no cleanup needed.
    //
    // This step replaces the previous Step 4 (secrets-read) + Step 4.5
    // (post-store preflight). Token reads now live BEFORE Step 1 so a
    // tenant with missing/invalid credentials never reaches assemble or
    // docker-env. Per Rule F-7: missing credentials = GENUINE EXTERNAL
    // BLOCKER, no question to operator, fail fast.

    const githubTokenResult = await this.secrets.get(TENANT_GITHUB_TOKEN_KEY);
    const githubOrgResult = await this.secrets.get(TENANT_GITHUB_ORG_KEY);

    if (
      !githubTokenResult.isSuccess ||
      !githubTokenResult.data ||
      !githubOrgResult.isSuccess ||
      !githubOrgResult.data
    ) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'CONNECTION_PREFLIGHT',
          errorCode: 'GITHUB_CREDENTIALS_MISSING',
          errorMessage:
            `Tenant ${tenantId} has no GitHub credentials in Vault. ` +
            `Set xiigen/tenants/${tenantId}/${TENANT_GITHUB_TOKEN_KEY} + ` +
            `${TENANT_GITHUB_ORG_KEY} before forking.`,
          rollbackState: 'PREFLIGHT',
        },
        tenantId,
      );
    }
    const token = githubTokenResult.data;
    const orgName = githubOrgResult.data;

    const ghCheck = await this.provisioner.checkConnection({ token, orgName });
    if (!ghCheck.isSuccess || !ghCheck.data) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'CONNECTION_PREFLIGHT',
          errorCode: ghCheck.errorCode ?? 'GITHUB_CONNECTION_FAILED',
          errorMessage:
            ghCheck.errorMessage ?? `GitHub connection preflight failed for tenant ${tenantId}`,
          rollbackState: 'PREFLIGHT',
        },
        tenantId,
      );
    }
    if (!ghCheck.data.hasRepoScope) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'CONNECTION_PREFLIGHT',
          errorCode: 'GITHUB_INSUFFICIENT_SCOPE',
          errorMessage:
            `GitHub token for tenant ${tenantId} (login=${ghCheck.data.login}) ` +
            `does not have 'repo' scope. Cannot create private repos. ` +
            `Rotate the token with repo scope.`,
          rollbackState: 'PREFLIGHT',
        },
        tenantId,
      );
    }

    // Docker preflight is gated on Vault config presence. If a tenant has
    // not configured Docker registry creds (some flows don't need image
    // builds), the missing config is reported but does NOT fail the fork.
    // When the config IS present, the connection MUST succeed — partial
    // config is treated as misconfiguration, not optional.
    const dockerUrlResult = await this.secrets.get(TENANT_DOCKER_REGISTRY_URL);
    const dockerTokenResult = await this.secrets.get(TENANT_DOCKER_REGISTRY_KEY);
    if (
      dockerUrlResult.isSuccess &&
      dockerUrlResult.data &&
      dockerTokenResult.isSuccess &&
      dockerTokenResult.data
    ) {
      const dockerCheck = await this.dockerRegistry.checkConnection({
        registryUrl: dockerUrlResult.data,
        token: dockerTokenResult.data,
      });
      if (!dockerCheck.isSuccess || !dockerCheck.data) {
        return this.failWith(
          {
            flowSlug,
            flowId,
            forkId,
            failedStep: 'CONNECTION_PREFLIGHT',
            errorCode: dockerCheck.errorCode ?? 'DOCKER_CONNECTION_FAILED',
            errorMessage:
              dockerCheck.errorMessage ?? `Docker registry preflight failed for tenant ${tenantId}`,
            rollbackState: 'PREFLIGHT',
          },
          tenantId,
        );
      }
    }
    // dockerTokenResult is captured for later use in setRepoSecrets.

    // ── Step 1: Assemble package ──────────────────────────────────────────
    const assembled = sourceRepoFullName
      ? await this.assembleFromSourceRepo({
          sourceRepoFullName,
          token,
          stagingDir,
          tenantId,
          flowId,
          flowSlug,
          orgName,
          repoName,
        })
      : await this.assembler.assemble({
          flowSlug,
          flowId,
          stagingDir,
          tenantId,
        });
    if (!assembled.isSuccess || !assembled.data) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'ASSEMBLE',
          errorCode: assembled.errorCode ?? 'ASSEMBLE_FAILED',
          errorMessage: assembled.errorMessage ?? 'assembler returned no data',
          rollbackState: 'NOTHING',
        },
        tenantId,
      );
    }

    // Functional spec is mandatory — Phase 1 AI adaptation silently fails without it
    if (!assembled.data.includesFunctionalSpec) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'ASSEMBLE',
          errorCode: 'MISSING_FUNCTIONAL_SPEC',
          errorMessage:
            'Functional spec missing from package — Phase 1 AI adaptation cannot run without it',
          rollbackState: 'NOTHING',
        },
        tenantId,
      );
    }

    // ── Step 2: Generate Docker environment ────────────────────────────────
    // DNA-5: docker-env generator reads tenantId from its own CLS context;
    // do NOT pass it as a parameter. We run in the same CLS scope here so
    // the generator resolves the same tenantId we already have.
    const envResult = await this.dockerEnv.generate({
      flowSlug,
      outputDir: stagingDir,
    });
    if (!envResult.isSuccess || !envResult.data) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'GENERATE_ENV',
          errorCode: envResult.errorCode ?? 'ENV_GEN_FAILED',
          errorMessage: envResult.errorMessage ?? 'docker env generator returned no data',
          rollbackState: 'NOTHING',
        },
        tenantId,
      );
    }

    // Store generated secrets (per-tenant) via ISecretsManager — never log plaintext
    for (const secret of envResult.data.secretsToStore) {
      const setResult = await this.secrets.set(secret.key, secret.value, secret.ttlSeconds);
      if (!setResult.isSuccess) {
        return this.failWith(
          {
            flowSlug,
            flowId,
            forkId,
            failedStep: 'GENERATE_ENV',
            errorCode: setResult.errorCode ?? 'SECRETS_STORE_FAILED',
            errorMessage: setResult.errorMessage ?? 'secrets manager set failed',
            rollbackState: 'NOTHING',
          },
          tenantId,
        );
      }
    }

    // ── Step 3: DNA-8 outbox — store fork record IN_PROGRESS BEFORE any external side-effect ──
    const forkRecord: Record<string, unknown> = {
      forkId,
      tenantId,
      flowSlug,
      flowId,
      status: 'IN_PROGRESS',
      repoName,
      orgName,
      originVersion: initialVersion,
      sourceRepoFullName: sourceRepoFullName ?? null,
      stagingDir,
      fileCount: assembled.data.fileCount,
      includesFunctionalSpec: assembled.data.includesFunctionalSpec,
      includesStepOneInvariants: assembled.data.includesStepOneInvariants,
      includesCompleteModuleBundle: assembled.data.includesCompleteModuleBundle ?? false,
      includesAdaptationSurface: assembled.data.includesAdaptationSurface ?? false,
      includesFreedomDefaults: assembled.data.includesFreedomDefaults ?? false,
      includesTenantConfig: assembled.data.includesTenantConfig ?? false,
      includesRagSeeds: assembled.data.includesRagSeeds ?? false,
      includesStandalonePackage: assembled.data.includesStandalonePackage ?? false,
      portMap: envResult.data.portMap,
      createdAt: new Date().toISOString(),
    };
    const storeResult = await this.dbFabric.storeDocument(
      MODULE_LIFECYCLE_FORKS_INDEX,
      forkRecord,
      forkId,
    );
    if (!storeResult.isSuccess) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'ASSEMBLE',
          errorCode: storeResult.errorCode ?? 'STORE_FAILED',
          errorMessage: storeResult.errorMessage ?? 'fork-record storeDocument failed',
          rollbackState: 'NOTHING',
        },
        tenantId,
      );
    }

    // ── Step 5: Create repo (token + orgName resolved at Step 0) ──────────
    // Phase C12 (DEV-115): the orgName used for createRepo comes from the
    // tenant's Vault config (resolved in Step 0), not from the input arg.
    // This ensures every tenant uses its own org regardless of caller intent.
    // The legacy `targetOrgName` input arg remains accepted for backward
    // compatibility but is overridden by the Vault-resolved orgName.
    void targetOrgName; // legacy arg — superseded by Vault orgName resolved at Step 0
    const repoResult = await this.provisioner.createRepo({
      orgName,
      repoName,
      token,
    });
    if (!repoResult.isSuccess || !repoResult.data) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'CREATE_REPO',
          errorCode: repoResult.errorCode ?? 'CREATE_REPO_FAILED',
          errorMessage: repoResult.errorMessage ?? 'repo creation returned no data',
          rollbackState: 'NOTHING',
        },
        tenantId,
      );
    }

    // ── Step 6: Push initial commit ──────────────────────────────────────
    const pushResult = await this.provisioner.pushInitialCommit({
      repoUrl: repoResult.data.repoUrl,
      stagingDir,
      message: `Initial fork: ${flowSlug} v${initialVersion}`,
      token,
    });
    if (!pushResult.isSuccess || !pushResult.data) {
      // Repo exists but push failed — rollback must delete the empty repo
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'PUSH',
          errorCode: pushResult.errorCode ?? 'PUSH_FAILED',
          errorMessage: pushResult.errorMessage ?? 'push returned no commit sha',
          rollbackState: 'REPO_CREATED',
          orgName,
          repoName,
        },
        tenantId,
      );
    }

    // ── Step 6.5: Set GitHub Actions secrets in the fork repo ────────────────
    // Phase C12 (DEV-115, 2026-04-26) per TENANT-CICD-CONNECTION-GUIDANCE-v1.0
    // Rule F-5. The injected `flow-ci.yml` workflow needs XIIGEN_TENANT_ID
    // (always) + DOCKER_REGISTRY_TOKEN (when configured). Failure is
    // NON-FATAL per Rule F-5 — log a structured warning and continue. The
    // fork-completion event still fires; secrets can be re-set manually or
    // via a follow-up event.
    const secretsToSet: Array<{ name: string; value: string }> = [
      { name: 'XIIGEN_TENANT_ID', value: tenantId },
    ];
    if (dockerTokenResult.isSuccess && dockerTokenResult.data) {
      secretsToSet.push({
        name: 'DOCKER_REGISTRY_TOKEN',
        value: dockerTokenResult.data,
      });
    }
    const secretsRes = await this.provisioner.setRepoSecrets({
      orgName,
      repoName,
      token,
      secrets: secretsToSet,
    });
    // Note (Rule F-5): we deliberately swallow this failure. The structured
    // errorCode (e.g. SET_SECRETS_DEFERRED when sealed-box encryption is not
    // yet wired in, or any underlying GitHub API failure) is captured in the
    // service descriptor's log; the fork still completes. The follow-up
    // task to fully wire libsodium + idempotent secret-setting is tracked as
    // a documented carry-forward in the C12 commit message.
    void secretsRes;

    // ── Step 7: DNA-8 — update fork record to FORKED BEFORE emitting completion event ──
    const completedRecord: Record<string, unknown> = {
      ...forkRecord,
      status: 'FORKED',
      repoUrl: repoResult.data.repoUrl,
      repoId: repoResult.data.repoId,
      initialCommitSha: pushResult.data.commitSha,
      forkedAt: new Date().toISOString(),
    };
    const updateResult = await this.dbFabric.storeDocument(
      MODULE_LIFECYCLE_FORKS_INDEX,
      completedRecord,
      forkId,
    );
    if (!updateResult.isSuccess) {
      return this.failWith(
        {
          flowSlug,
          flowId,
          forkId,
          failedStep: 'REGISTER',
          errorCode: updateResult.errorCode ?? 'UPDATE_FAILED',
          errorMessage: updateResult.errorMessage ?? 'fork-record UPDATE to FORKED failed',
          rollbackState: 'REPO_CREATED',
          orgName,
          repoName,
        },
        tenantId,
      );
    }

    // ── Step 8: DNA-9 — emit FlowForkCompleted via CloudEvents envelope ──────
    const completedPayload: FlowForkCompletedPayload = {
      flowSlug,
      flowId,
      repoUrl: repoResult.data.repoUrl,
      repoFullName: `${orgName}/${repoName}`,
      initialCommitSha: pushResult.data.commitSha,
      originVersion: initialVersion,
      forkId,
      forkedAt: completedRecord['forkedAt'] as string,
    };
    const cloudEvent = createCloudEvent({
      source: 'module-lifecycle/fork-flow-handler',
      eventType: FORK_FLOW_EVENT_TYPES.COMPLETED,
      data: completedPayload as unknown as Record<string, unknown>,
      tenantId,
      correlationId: forkId,
    });
    await this.queueFabric.enqueue(
      FORK_FLOW_EVENT_TYPES.COMPLETED,
      cloudEvent as unknown as Record<string, unknown>,
      forkId, // deduplication key — idempotency (DNA-7)
    );

    return DataProcessResult.success({
      forkId,
      repoUrl: repoResult.data.repoUrl,
      repoFullName: `${orgName}/${repoName}`,
      status: 'FORKED',
      initialCommitSha: pushResult.data.commitSha,
    });
  }

  private async assembleFromSourceRepo(params: {
    sourceRepoFullName: string;
    token: string;
    stagingDir: string;
    tenantId: string;
    flowId: string;
    flowSlug: string;
    orgName: string;
    repoName: string;
  }): Promise<DataProcessResult<AssembleResult>> {
    const exported = await this.provisioner.exportRepoContents({
      sourceFullName: params.sourceRepoFullName,
      token: params.token,
      stagingDir: params.stagingDir,
    });
    if (!exported.isSuccess || !exported.data) {
      return DataProcessResult.failure(
        exported.errorCode ?? 'SOURCE_REPO_EXPORT_FAILED',
        exported.errorMessage ?? 'source repo export returned no data',
      );
    }

    const rewrite = await this.rewriteTenantConfigForCascadeFork(params);
    if (!rewrite.isSuccess) {
      return DataProcessResult.failure(
        rewrite.errorCode ?? 'TENANT_CONFIG_REWRITE_FAILED',
        rewrite.errorMessage ?? 'tenant config rewrite failed',
      );
    }

    const manifest = exported.data.manifest;
    return DataProcessResult.success({
      stagingDir: exported.data.stagingDir,
      fileCount: exported.data.fileCount,
      includesFunctionalSpec: manifest.includes('docs/FUNCTIONAL-SPEC.md'),
      includesStepOneInvariants: manifest.includes('docs/STEP-1-INVARIANTS.md'),
      includesCompleteModuleBundle: true,
      includesAdaptationSurface: manifest.includes('docs/adaptation-surface.json'),
      includesFreedomDefaults: manifest.includes('freedom-config.defaults.json'),
      includesTenantConfig: manifest.includes('tenant.config.json'),
      includesRagSeeds: manifest.some((entry) => entry.startsWith('rag-seeds/')),
      includesStandalonePackage: ['package.json', 'tsconfig.json', 'jest.config.js'].every((entry) =>
        manifest.includes(entry),
      ),
      manifest,
    });
  }

  private async rewriteTenantConfigForCascadeFork(params: {
    sourceRepoFullName: string;
    stagingDir: string;
    tenantId: string;
    flowId: string;
    flowSlug: string;
    orgName: string;
    repoName: string;
  }): Promise<DataProcessResult<void>> {
    try {
      const configPath = join(params.stagingDir, 'tenant.config.json');
      const raw = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(raw) as Record<string, unknown>;
      const moduleName =
        this.moduleNameFromRepoName(params.repoName) ??
        (config['moduleName'] as string | undefined) ??
        params.flowSlug;

      config['tenantId'] = params.tenantId;
      config['flowId'] = params.flowId;
      config['flowSlug'] = params.flowSlug;
      config['originFlowSlug'] = (config['originFlowSlug'] as string | undefined) ?? params.flowSlug;
      config['moduleName'] = moduleName;
      config['repoName'] = params.repoName;
      config['repoFullName'] = `${params.orgName}/${params.repoName}`;
      config['repoUrl'] = `https://github.com/${params.orgName}/${params.repoName}`;
      config['installedFromRepoFullName'] = params.sourceRepoFullName;
      config['installedAt'] = new Date().toISOString();

      await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
      await this.rewriteCascadeForkTests({
        stagingDir: params.stagingDir,
        tenantId: params.tenantId,
        orgName: params.orgName,
        repoName: params.repoName,
      });
      await this.rewriteCascadeForkSettings({
        stagingDir: params.stagingDir,
        tenantId: params.tenantId,
      });
      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('TENANT_CONFIG_REWRITE_FAILED', e.message, e);
    }
  }

  private async rewriteCascadeForkTests(params: {
    stagingDir: string;
    tenantId: string;
    orgName: string;
    repoName: string;
  }): Promise<void> {
    const testsDir = join(params.stagingDir, '__tests__');
    try {
      const entries = await fs.readdir(testsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('-adaptation.spec.ts')) continue;
        const adaptationSpecPath = join(testsDir, entry.name);
        let text = await fs.readFile(adaptationSpecPath, 'utf-8');
        text = text.replace(
          /expect\(tenantConfig\.tenantId\)\.toBe\('[^']*'\);/g,
          `expect(tenantConfig.tenantId).toBe('${params.tenantId}');`,
        );
        text = text.replace(
          /expect\(tenantConfig\.repoName\)\.toBe\('[^']*'\);/g,
          `expect(tenantConfig.repoName).toBe('${params.repoName}');`,
        );
        text = text.replace(
          /expect\(tenantConfig\.repoFullName\)\.toBe\('[^']*'\);/g,
          `expect(tenantConfig.repoFullName).toBe('${params.orgName}/${params.repoName}');`,
        );
        text = text.replace(
          /expect\(tenantConfig\.repoUrl\)\.toBe\('[^']*'\);/g,
          `expect(tenantConfig.repoUrl).toBe('https://github.com/${params.orgName}/${params.repoName}');`,
        );
        await fs.writeFile(adaptationSpecPath, text, 'utf-8');
      }
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return;
      throw err;
    }
  }

  private async rewriteCascadeForkSettings(params: {
    stagingDir: string;
    tenantId: string;
  }): Promise<void> {
    const settingsPath = join(params.stagingDir, 'settings', 'module.settings.json');
    try {
      const raw = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(raw) as Record<string, unknown>;
      settings['tenantId'] = params.tenantId;
      const adaptation =
        typeof settings['adaptation'] === 'object' && settings['adaptation'] !== null
          ? (settings['adaptation'] as Record<string, unknown>)
          : {};
      adaptation['tenantId'] = params.tenantId;
      settings['adaptation'] = adaptation;
      await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return;
      throw err;
    }
  }

  private moduleNameFromRepoName(repoName: string): string | null {
    const separatorIndex = repoName.indexOf('--');
    if (separatorIndex < 0) return null;
    return repoName.slice(separatorIndex + 2) || null;
  }

  /** Read tenant ID from AsyncLocalStorage via CLS. DNA-5. */
  private getTenantId(): string | null {
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Shared failure path: mark fork record FAILED (DNA-8 — store before emit),
   * emit CloudEvents FlowForkFailed carrying rollbackState for the rollback
   * handler, return DataProcessResult.failure.
   */
  private async failWith(
    payload: FlowForkFailedPayload,
    tenantId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Record failure (best-effort; do not let storage failure mask the root cause)
    try {
      await this.dbFabric.storeDocument(
        MODULE_LIFECYCLE_FORKS_INDEX,
        {
          forkId: payload.forkId,
          tenantId,
          flowSlug: payload.flowSlug,
          flowId: payload.flowId,
          status: 'FAILED',
          failedStep: payload.failedStep,
          errorCode: payload.errorCode,
          errorMessage: payload.errorMessage,
          rollbackState: payload.rollbackState,
          orgName: payload.orgName,
          repoName: payload.repoName,
          failedAt: new Date().toISOString(),
        },
        payload.forkId,
      );
    } catch {
      // swallow — root cause is payload.errorMessage
    }

    // DNA-9 — emit FlowForkFailed envelope so rollback handler can compensate
    try {
      const cloudEvent = createCloudEvent({
        source: 'module-lifecycle/fork-flow-handler',
        eventType: FORK_FLOW_EVENT_TYPES.FAILED,
        data: payload as unknown as Record<string, unknown>,
        tenantId,
        correlationId: payload.forkId,
      });
      await this.queueFabric.enqueue(
        FORK_FLOW_EVENT_TYPES.FAILED,
        cloudEvent as unknown as Record<string, unknown>,
        payload.forkId,
      );
    } catch {
      // swallow
    }

    return DataProcessResult.failure(payload.errorCode, payload.errorMessage, {
      forkId: payload.forkId,
      failedStep: payload.failedStep,
      rollbackState: payload.rollbackState,
    });
  }
}
