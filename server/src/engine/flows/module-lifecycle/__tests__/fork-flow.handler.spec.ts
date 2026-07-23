/**
 * ForkFlowHandlerService unit tests (XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 step 6).
 *
 * Covers the three canonical cases from the plan:
 *   - Missing functional spec → failure (Phase 1 AI adaptation blocker)
 *   - Push fails after repo created → rollback event carries REPO_CREATED
 *   - tenantId comes from AsyncLocalStorage, NEVER from input (DNA-5)
 *   - Service extends MicroserviceBase (DNA-4 / Finding 5 review assertion)
 */

import { ClsService, ClsModule } from 'nestjs-cls';
import { Test, TestingModule } from '@nestjs/testing';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ForkFlowHandlerService } from '../fork-flow.handler';
import { DataProcessResult } from '../../../../kernel/data-process-result';
import { MicroserviceBase } from '../../../../kernel/microservice-base';
import { DATABASE_SERVICE } from '../../../../fabrics/interfaces/database.interface';
import { QUEUE_SERVICE } from '../../../../fabrics/interfaces/queue.interface';
import { FLOW_ASSEMBLER_SERVICE } from '../../../../fabrics/interfaces/flow-assembler.fabric.interface';
import { DOCKER_ENV_SERVICE } from '../../../../fabrics/interfaces/docker-env.fabric.interface';
import { FORK_PROVISIONER_SERVICE } from '../../../../fabrics/interfaces/fork-provisioner.fabric.interface';
import { DOCKER_REGISTRY_SERVICE } from '../../../../fabrics/interfaces/docker-registry.fabric.interface';
import { SECRETS_MANAGER_SERVICE } from '../../../../fabrics/interfaces/secrets-manager.fabric.interface';
import {
  FORK_FLOW_EVENT_TYPES,
  MODULE_LIFECYCLE_FORKS_INDEX,
  TENANT_GITHUB_TOKEN_KEY,
  TENANT_GITHUB_ORG_KEY,
  TENANT_DOCKER_REGISTRY_URL,
  TENANT_DOCKER_REGISTRY_KEY,
} from '../../../../engine-contracts/fork-flow-contracts';
import { TENANT_CONTEXT_KEY } from '../../../../kernel/multi-tenant/tenant-context';

const TEST_TENANT = 'test-tenant-001';

jest.setTimeout(60_000);

function okAssemble(overrides: Partial<{ includesFunctionalSpec: boolean; includesStepOneInvariants: boolean }> = {}) {
  return DataProcessResult.success({
    stagingDir: '/tmp/fork-test',
    fileCount: 10,
    includesFunctionalSpec: overrides.includesFunctionalSpec ?? true,
    includesStepOneInvariants: overrides.includesStepOneInvariants ?? true,
    manifest: [],
  });
}

describe('ForkFlowHandlerService', () => {
  let handler: ForkFlowHandlerService;
  let cls: ClsService;
  let mockAssembler: { assemble: jest.Mock };
  let mockDockerEnv: { generate: jest.Mock };
  let mockProvisioner: {
    createRepo: jest.Mock;
    pushInitialCommit: jest.Mock;
    deleteRepo: jest.Mock;
    checkConnection: jest.Mock;
    renameRepo: jest.Mock;
    setRepoSecrets: jest.Mock;
    exportRepoContents: jest.Mock;
  };
  let mockDockerRegistry: { checkConnection: jest.Mock };
  let mockSecrets: { get: jest.Mock; set: jest.Mock; rotate: jest.Mock; revoke: jest.Mock };
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };

  beforeEach(async () => {
    mockAssembler = { assemble: jest.fn().mockResolvedValue(okAssemble()) };
    mockDockerEnv = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          composeFile: '/tmp/fork-test/docker-compose.tenant.yml',
          envFile: '/tmp/fork-test/.env.tenant',
          portMap: { elasticsearch: 29200, redis: 29300, app: 29400, postgres: 29500 },
          secretsToStore: [{ key: 'tenant_test_es_password', value: 'xxx' }],
        }),
      ),
    };
    mockProvisioner = {
      createRepo: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ repoUrl: 'https://github.com/acme-corp/test-tenant-001--user-registration', repoId: '123' }),
        ),
      pushInitialCommit: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ commitSha: 'abc123' })),
      deleteRepo: jest.fn().mockResolvedValue(DataProcessResult.success(undefined)),
      // Phase C12 (DEV-115, 2026-04-26) — new IForkProvisioner.checkConnection
      // signature per TENANT-CICD-CONNECTION-GUIDANCE-v1.0: { token, orgName }
      // -> { reachable, login, hasRepoScope, rateLimit }. Default = healthy.
      checkConnection: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          reachable: true,
          login: 'test-bot',
          hasRepoScope: true,
          rateLimit: 5000,
        }),
      ),
      renameRepo: jest.fn().mockResolvedValue(
        DataProcessResult.success({ newRepoUrl: 'https://github.com/acme-corp/renamed' }),
      ),
      // Per Rule F-5: setRepoSecrets failure is NON-FATAL. Default mock returns
      // success; tests asserting the deferred path can override per-test.
      setRepoSecrets: jest.fn().mockResolvedValue(DataProcessResult.success(undefined)),
      exportRepoContents: jest.fn(),
    };
    // Phase C12: IDockerRegistryService mock. Default = reachable + authenticated.
    mockDockerRegistry = {
      checkConnection: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          reachable: true,
          authenticated: true,
          authChallenge: '',
          latencyMs: 35,
        }),
      ),
    };
    // Phase C12: secrets manager now must serve 4 keys at Step 0 preflight:
    //   github_token, github_org_name, docker_registry_url, docker_registry_token.
    // Default = all configured. Per-test overrides via mockImplementationOnce.
    mockSecrets = {
      get: jest.fn().mockImplementation(async (key: string) => {
        switch (key) {
          case TENANT_GITHUB_TOKEN_KEY:
            return DataProcessResult.success('ghp_test_token');
          case TENANT_GITHUB_ORG_KEY:
            return DataProcessResult.success('acme-corp');
          case TENANT_DOCKER_REGISTRY_URL:
            return DataProcessResult.success('ghcr.io');
          case TENANT_DOCKER_REGISTRY_KEY:
            return DataProcessResult.success('ghp_docker_test_token');
          default:
            return DataProcessResult.failure('NOT_FOUND', `unknown key ${key}`);
        }
      }),
      set: jest.fn().mockResolvedValue(DataProcessResult.success(undefined)),
      rotate: jest.fn().mockResolvedValue(DataProcessResult.success('new-token')),
      revoke: jest.fn().mockResolvedValue(DataProcessResult.success(undefined)),
    };
    mockDb = { storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
    mockQueue = { enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-1')) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [
        ForkFlowHandlerService,
        { provide: FLOW_ASSEMBLER_SERVICE, useValue: mockAssembler },
        { provide: DOCKER_ENV_SERVICE, useValue: mockDockerEnv },
        { provide: FORK_PROVISIONER_SERVICE, useValue: mockProvisioner },
        { provide: DOCKER_REGISTRY_SERVICE, useValue: mockDockerRegistry },
        { provide: SECRETS_MANAGER_SERVICE, useValue: mockSecrets },
        { provide: DATABASE_SERVICE, useValue: mockDb },
        { provide: QUEUE_SERVICE, useValue: mockQueue },
      ],
    }).compile();

    handler = moduleRef.get(ForkFlowHandlerService);
    cls = moduleRef.get(ClsService);
  });

  /**
   * Run the handler inside a CLS scope with a test tenant — matches the
   * real controller-bound tenant context (DNA-5). No tenantId in input.
   */
  async function runWithTenant(input: Record<string, unknown>) {
    return await cls.runWith({ [TENANT_CONTEXT_KEY]: { tenantId: TEST_TENANT } } as never, () =>
      handler.execute(input),
    );
  }

  // ── DNA-4 / Finding 5 ──────────────────────────────────────────────────
  it('extends MicroserviceBase (DNA-4)', () => {
    expect(handler).toBeInstanceOf(MicroserviceBase);
    expect(handler.serviceName).toBe('ForkFlowHandlerService');
    expect(handler.descriptor.flowId).toBe('FLOW-47');
  });

  // ── Functional-spec gate (plan Step 6) ─────────────────────────────────
  it('returns failure MISSING_FUNCTIONAL_SPEC when assembler reports spec absent', async () => {
    mockAssembler.assemble.mockResolvedValueOnce(okAssemble({ includesFunctionalSpec: false }));
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FUNCTIONAL_SPEC');
    expect(result.errorMessage).toContain('Phase 1 AI adaptation');
    // No external side effects — no repo create, no push
    expect(mockProvisioner.createRepo).not.toHaveBeenCalled();
    expect(mockProvisioner.pushInitialCommit).not.toHaveBeenCalled();
  });

  // ── Push failure → REPO_CREATED rollback (plan test #2) ────────────────
  it('enqueues FlowForkFailed with rollbackState=REPO_CREATED when push fails after repo created', async () => {
    mockProvisioner.pushInitialCommit.mockResolvedValueOnce(
      DataProcessResult.failure('PUSH_FAILED', 'network timeout'),
    );
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PUSH_FAILED');
    const failEnqueue = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === FORK_FLOW_EVENT_TYPES.FAILED,
    );
    expect(failEnqueue).toBeDefined();
    const envelope = failEnqueue![1] as Record<string, unknown>;
    const envData = envelope['data'] as Record<string, unknown>;
    expect(envData['rollbackState']).toBe('REPO_CREATED');
    // Phase C12: orgName comes from Vault (TENANT_GITHUB_ORG_KEY=acme-corp),
    // not from the input arg targetOrgName. Tenant's vault config wins.
    expect(envData['orgName']).toBe('acme-corp');
    // Phase C11 (DEV-115, 2026-04-26): repo naming convention is now
    // {tenantId}--{moduleName} (FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 line 744).
    // For TEST_TENANT='test-tenant-001' + flowSlug='user-registration', the
    // expected repoName is 'test-tenant-001--user-registration'.
    expect(envData['repoName']).toBe(`${TEST_TENANT}--user-registration`);
    expect(envData['repoName']).toContain('--');
  });

  // ── DNA-5: tenantId from CLS, never from input (plan test #3) ──────────
  it('scopes all writes to tenantId from AsyncLocalStorage — never from input', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    // Every storeDocument call must carry the tenantId sourced from CLS
    const callsWithBody = mockDb.storeDocument.mock.calls.map((c: unknown[]) => c[1] as Record<string, unknown>);
    expect(callsWithBody.length).toBeGreaterThan(0);
    for (const body of callsWithBody) {
      expect(body['tenantId']).toBe(TEST_TENANT);
    }
  });

  it('returns MISSING_TENANT when no AsyncLocalStorage context is set (no input fallback)', async () => {
    // Call execute() without runWithTenant — CLS context is empty
    const result = await handler.execute({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
      // Intentionally including tenantId in input to verify it is IGNORED
      tenantId: 'sneaky-tenant',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  // ── DNA-8: storeDocument before enqueue ────────────────────────────────
  it('stores fork record IN_PROGRESS before any external side-effect (DNA-8 outbox)', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    // storeDocument called at least twice: initial IN_PROGRESS + final FORKED
    expect(mockDb.storeDocument.mock.calls.length).toBeGreaterThanOrEqual(2);
    const inProgressDoc = mockDb.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(inProgressDoc['status']).toBe('IN_PROGRESS');
  });

  // ── Happy-path success ─────────────────────────────────────────────────
  it('returns FORKED status + repoUrl + commitSha on success', async () => {
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('FORKED');
    expect(result.data?.['repoUrl']).toContain('github.com');
    expect(result.data?.['initialCommitSha']).toBe('abc123');
    // Secrets were stored (per-tenant, via ISecretsManager)
    expect(mockSecrets.set).toHaveBeenCalled();
    // Completion event emitted via CloudEvents envelope
    const completeEnqueue = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === FORK_FLOW_EVENT_TYPES.COMPLETED,
    );
    expect(completeEnqueue).toBeDefined();
  });

  // ── Index is semantic slug (Rule 16) ───────────────────────────────────
  it('writes to semantic-slug index (no flow-NN- prefix)', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    const indexUsed = mockDb.storeDocument.mock.calls[0][0] as string;
    expect(indexUsed).toBe(MODULE_LIFECYCLE_FORKS_INDEX);
    expect(indexUsed).not.toMatch(/flow-?\d+/i);
  });

  // ── Secret read uses canonical key (DNA-5 + Rule 2) ────────────────────
  it('reads GitHub token from ISecretsManager using tenant_github_token key', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(mockSecrets.get).toHaveBeenCalledWith(TENANT_GITHUB_TOKEN_KEY);
  });

  // ── Phase C12 (DEV-115): Step 0 connection-health preflight ────────────
  // Per TENANT-CICD-CONNECTION-GUIDANCE-v1.0 §"THE TWO NON-NEGOTIABLE PRECONDITIONS":
  // GitHub + Docker checked BEFORE any side-effect (assemble / docker-env /
  // store / repo-create). Failure → rollbackState='PREFLIGHT'.

  it('Phase C12 Step 0: runs GitHub + Docker preflight BEFORE assemble', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(mockProvisioner.checkConnection).toHaveBeenCalledTimes(1);
    const checkArgs = mockProvisioner.checkConnection.mock.calls[0][0] as {
      token: string;
      orgName: string;
    };
    expect(checkArgs.token).toBe('ghp_test_token');
    expect(checkArgs.orgName).toBe('acme-corp');

    expect(mockDockerRegistry.checkConnection).toHaveBeenCalledTimes(1);

    // Preflight runs BEFORE assemble (Step 1)
    const ghPreflightOrder = mockProvisioner.checkConnection.mock.invocationCallOrder[0];
    const assembleOrder = mockAssembler.assemble.mock.invocationCallOrder[0];
    expect(ghPreflightOrder).toBeLessThan(assembleOrder);
  });

  it('Phase C12: GITHUB_CREDENTIALS_MISSING when Vault has no github_token (rollbackState=PREFLIGHT)', async () => {
    mockSecrets.get.mockImplementation(async (key: string) => {
      if (key === TENANT_GITHUB_TOKEN_KEY) {
        return DataProcessResult.failure('NOT_FOUND', 'github_token not in Vault');
      }
      if (key === TENANT_GITHUB_ORG_KEY) {
        return DataProcessResult.success('acme-corp');
      }
      return DataProcessResult.success('any');
    });
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_CREDENTIALS_MISSING');
    expect(mockProvisioner.checkConnection).not.toHaveBeenCalled();
    expect(mockAssembler.assemble).not.toHaveBeenCalled();
    expect(mockProvisioner.createRepo).not.toHaveBeenCalled();

    // Failure event has rollbackState=PREFLIGHT, failedStep=CONNECTION_PREFLIGHT
    const failEnqueue = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === FORK_FLOW_EVENT_TYPES.FAILED,
    );
    const envelope = failEnqueue![1] as Record<string, unknown>;
    const envData = envelope['data'] as Record<string, unknown>;
    expect(envData['rollbackState']).toBe('PREFLIGHT');
    expect(envData['failedStep']).toBe('CONNECTION_PREFLIGHT');
  });

  it('Phase C12: GITHUB_CONNECTION_FAILED when checkConnection returns failure', async () => {
    mockProvisioner.checkConnection.mockResolvedValueOnce(
      DataProcessResult.failure(
        'GITHUB_AUTH_FAILED',
        'GitHub token invalid: HTTP 401 Unauthorized',
      ),
    );
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_AUTH_FAILED');
    expect(mockAssembler.assemble).not.toHaveBeenCalled();
    expect(mockProvisioner.createRepo).not.toHaveBeenCalled();
  });

  it('Phase C12: GITHUB_INSUFFICIENT_SCOPE when hasRepoScope=false', async () => {
    mockProvisioner.checkConnection.mockResolvedValueOnce(
      DataProcessResult.success({
        reachable: true,
        login: 'test-bot',
        hasRepoScope: false,
        rateLimit: 5000,
      }),
    );
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GITHUB_INSUFFICIENT_SCOPE');
    expect(mockAssembler.assemble).not.toHaveBeenCalled();
  });

  it('Phase C12: DOCKER_AUTH_FAILED preflight failure aborts before assemble', async () => {
    mockDockerRegistry.checkConnection.mockResolvedValueOnce(
      DataProcessResult.failure(
        'DOCKER_AUTH_FAILED',
        'Docker registry returned 401 — token cannot authenticate',
      ),
    );
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DOCKER_AUTH_FAILED');
    expect(mockAssembler.assemble).not.toHaveBeenCalled();
    expect(mockProvisioner.createRepo).not.toHaveBeenCalled();
  });

  it('Phase C12: Docker preflight skipped when Vault has no docker_registry_url (success path)', async () => {
    mockSecrets.get.mockImplementation(async (key: string) => {
      if (key === TENANT_GITHUB_TOKEN_KEY) return DataProcessResult.success('ghp_test_token');
      if (key === TENANT_GITHUB_ORG_KEY) return DataProcessResult.success('acme-corp');
      // No docker config — preflight should skip Docker check and proceed.
      return DataProcessResult.failure('NOT_FOUND', 'not configured');
    });
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(result.isSuccess).toBe(true);
    expect(mockDockerRegistry.checkConnection).not.toHaveBeenCalled();
  });

  it('Phase C12: setRepoSecrets called after pushInitialCommit (Rule F-5: non-fatal on failure)', async () => {
    await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    expect(mockProvisioner.setRepoSecrets).toHaveBeenCalledTimes(1);
    const args = mockProvisioner.setRepoSecrets.mock.calls[0][0] as {
      orgName: string;
      repoName: string;
      secrets: Array<{ name: string; value: string }>;
    };
    expect(args.orgName).toBe('acme-corp');
    expect(args.repoName).toBe(`${TEST_TENANT}--user-registration`);
    // XIIGEN_TENANT_ID always set; DOCKER_REGISTRY_TOKEN set when configured.
    const names = args.secrets.map((s) => s.name);
    expect(names).toContain('XIIGEN_TENANT_ID');
    expect(names).toContain('DOCKER_REGISTRY_TOKEN');

    // setRepoSecrets runs AFTER pushInitialCommit
    const pushOrder = mockProvisioner.pushInitialCommit.mock.invocationCallOrder[0];
    const secretsOrder = mockProvisioner.setRepoSecrets.mock.invocationCallOrder[0];
    expect(pushOrder).toBeLessThan(secretsOrder);
  });

  it('Phase C12 Rule F-5: setRepoSecrets failure does NOT block fork completion', async () => {
    mockProvisioner.setRepoSecrets.mockResolvedValueOnce(
      DataProcessResult.failure(
        'SET_SECRETS_DEFERRED',
        'sealed-box encryption pending (libsodium integration carry-forward)',
      ),
    );
    const result = await runWithTenant({
      flowSlug: 'user-registration',
      flowId: 'FLOW-01',
      targetOrgName: 'acme',
    });
    // Fork still completes successfully despite the setRepoSecrets failure.
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('FORKED');
  });

  it('rewrites cascade-fork package tests to the installing tenant before push', async () => {
    let pushedStagingDir = '';
    mockProvisioner.exportRepoContents.mockImplementation(
      async ({ stagingDir }: { stagingDir: string }) => {
        await fs.mkdir(join(stagingDir, '__tests__'), { recursive: true });
        await fs.mkdir(join(stagingDir, 'settings'), { recursive: true });
        await fs.writeFile(
          join(stagingDir, 'tenant.config.json'),
          JSON.stringify(
            {
              tenantId: 'northwind',
              flowId: 'FLOW-01',
              flowSlug: 'user-registration-northwind-guild',
              moduleName: 'user-registration-northwind-guild',
              repoName: 'northwind--user-registration-northwind-guild',
              repoFullName: 'lubochka/northwind--user-registration-northwind-guild',
            },
            null,
            2,
          ),
          'utf-8',
        );
        await fs.writeFile(
          join(stagingDir, '__tests__', 'user-registration-adaptation.spec.ts'),
          [
            "expect(tenantConfig.tenantId).toBe('northwind');",
            "expect(tenantConfig.repoName).toBe('northwind--user-registration-northwind-guild');",
            "expect(tenantConfig.repoFullName).toBe('lubochka/northwind--user-registration-northwind-guild');",
            "expect(tenantConfig.repoUrl).toBe('https://github.com/lubochka/northwind--user-registration-northwind-guild');",
            '',
          ].join('\n'),
          'utf-8',
        );
        await fs.writeFile(
          join(stagingDir, '__tests__', 'data-warehouse-analytics-acme-adaptation.spec.ts'),
          [
            "expect(tenantConfig.tenantId).toBe('acme-corp');",
            "expect(tenantConfig.repoName).toBe('acme-corp--acme-enterprise-warehouse-analytics');",
            "expect(tenantConfig.repoFullName).toBe('lubochka/acme-corp--acme-enterprise-warehouse-analytics');",
            "expect(tenantConfig.repoUrl).toBe('https://github.com/lubochka/acme-corp--acme-enterprise-warehouse-analytics');",
            '',
          ].join('\n'),
          'utf-8',
        );
        await fs.writeFile(
          join(stagingDir, 'settings', 'module.settings.json'),
          JSON.stringify(
            {
              flowId: 'FLOW-01',
              flowSlug: 'user-registration-northwind-guild',
              tenantId: 'northwind',
              adaptation: {
                tenantId: 'northwind',
              },
            },
            null,
            2,
          ),
          'utf-8',
        );
        return DataProcessResult.success({
          stagingDir,
          fileCount: 5,
          defaultBranch: 'main',
          sourceCommitSha: 'source-sha',
          manifest: [
            'tenant.config.json',
            '__tests__/user-registration-adaptation.spec.ts',
            '__tests__/data-warehouse-analytics-acme-adaptation.spec.ts',
            'settings/module.settings.json',
            'docs/FUNCTIONAL-SPEC.md',
            'package.json',
            'tsconfig.json',
            'jest.config.js',
          ],
        });
      },
    );
    mockProvisioner.pushInitialCommit.mockImplementation(
      async ({ stagingDir }: { stagingDir: string }) => {
        pushedStagingDir = stagingDir;
        return DataProcessResult.success({ commitSha: 'abc123' });
      },
    );

    const result = await runWithTenant({
      flowSlug: 'user-registration-northwind-guild',
      flowId: 'FLOW-01',
      targetOrgName: 'lubochka',
      sourceRepoFullName: 'lubochka/northwind--user-registration-northwind-guild',
    });

    expect(result.isSuccess).toBe(true);
    const spec = await fs.readFile(
      join(pushedStagingDir, '__tests__', 'user-registration-adaptation.spec.ts'),
      'utf-8',
    );
    expect(spec).toContain(`expect(tenantConfig.tenantId).toBe('${TEST_TENANT}');`);
    expect(spec).toContain(
      `expect(tenantConfig.repoName).toBe('${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    expect(spec).toContain(
      `expect(tenantConfig.repoFullName).toBe('acme-corp/${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    expect(spec).toContain(
      `expect(tenantConfig.repoUrl).toBe('https://github.com/acme-corp/${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    const genericSpec = await fs.readFile(
      join(pushedStagingDir, '__tests__', 'data-warehouse-analytics-acme-adaptation.spec.ts'),
      'utf-8',
    );
    expect(genericSpec).toContain(`expect(tenantConfig.tenantId).toBe('${TEST_TENANT}');`);
    expect(genericSpec).toContain(
      `expect(tenantConfig.repoName).toBe('${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    expect(genericSpec).toContain(
      `expect(tenantConfig.repoFullName).toBe('acme-corp/${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    expect(genericSpec).toContain(
      `expect(tenantConfig.repoUrl).toBe('https://github.com/acme-corp/${TEST_TENANT}--user-registration-northwind-guild');`,
    );
    const tenantConfig = JSON.parse(
      await fs.readFile(join(pushedStagingDir, 'tenant.config.json'), 'utf-8'),
    ) as Record<string, unknown>;
    expect(tenantConfig['repoName']).toBe(`${TEST_TENANT}--user-registration-northwind-guild`);
    expect(tenantConfig['repoFullName']).toBe(
      `acme-corp/${TEST_TENANT}--user-registration-northwind-guild`,
    );
    expect(tenantConfig['repoUrl']).toBe(
      `https://github.com/acme-corp/${TEST_TENANT}--user-registration-northwind-guild`,
    );
    const settings = JSON.parse(
      await fs.readFile(join(pushedStagingDir, 'settings', 'module.settings.json'), 'utf-8'),
    ) as Record<string, unknown>;
    const adaptation = settings['adaptation'] as Record<string, unknown>;
    expect(settings['tenantId']).toBe(TEST_TENANT);
    expect(adaptation['tenantId']).toBe(TEST_TENANT);
  });
});
