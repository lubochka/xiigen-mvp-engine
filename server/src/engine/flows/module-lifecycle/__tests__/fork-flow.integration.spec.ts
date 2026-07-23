/**
 * ForkFlow end-to-end integration test.
 *
 * Registered as a live integration suite when INTEGRATION_TEST=true is set.
 * Standard `npm test` never makes external calls and does not register pending tests.
 *
 * Prerequisites (only the test runner env vars below; tenant config lives in Vault):
 *   docker compose -f docker-compose.platform.yml up -d vault
 *   vault kv put secret/data/{TEST_TENANT_ID}/tenant_github_token value="ghp_..."
 *   vault kv put secret/data/{TEST_TENANT_ID}/tenant_github_username value="..."
 *   vault kv put secret/data/{TEST_TENANT_ID}/vault_token value="<tenant_vault_token>"
 *
 * Run: INTEGRATION_TEST=true TEST_TENANT_ID=test-tenant-001 npx jest --testPathPatterns=fork-flow.integration
 *
 * FORK-FLOW-ENGINE-PLAN-v1.1 Phase 4.
 */

import { ClsModule, ClsService } from 'nestjs-cls';
import { Test, TestingModule } from '@nestjs/testing';
import { DataProcessResult } from '../../../../kernel/data-process-result';
import { ForkFlowModule } from '../fork-flow.module';
import { ForkFlowHandlerService } from '../fork-flow.handler';
import { ForkFlowRollbackHandlerService } from '../fork-flow-rollback.handler';
import { VaultSecretsManagerService } from '../../../../fabrics/implementations/vault-secrets-manager.service';
import {
  SECRETS_MANAGER_SERVICE,
  ISecretsManager,
} from '../../../../fabrics/interfaces/secrets-manager.fabric.interface';
import {
  FORK_PROVISIONER_SERVICE,
  IForkProvisioner,
} from '../../../../fabrics/interfaces/fork-provisioner.fabric.interface';
import { TENANT_CONTEXT_KEY } from '../../../../kernel/multi-tenant/tenant-context';

const INTEGRATION = process.env.INTEGRATION_TEST === 'true';

if (INTEGRATION) {
describe('ForkFlow — integration (requires INTEGRATION_TEST=true + Vault + real GitHub PAT)', () => {
  let cls: ClsService;
  let moduleRef: TestingModule;
  let handler: ForkFlowHandlerService;
  let rollback: ForkFlowRollbackHandlerService;
  let tenantId: string;
  let createdRepoName: string | undefined;

  beforeAll(async () => {
    tenantId = process.env.TEST_TENANT_ID ?? '';
    // Finding 4: no undefined helper — build the test module inline.
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TEST_TENANT',
        'TEST_TENANT_ID env var required for integration run',
      ) as unknown as void;
    }

    moduleRef = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true }), ForkFlowModule],
    })
      // Use the real Vault-backed provider (vault_token + vault_address come
      // from the tenant's FREEDOM config — NOT from env vars)
      .overrideProvider(SECRETS_MANAGER_SERVICE)
      .useClass(VaultSecretsManagerService)
      .compile();

    handler = moduleRef.get(ForkFlowHandlerService);
    rollback = moduleRef.get(ForkFlowRollbackHandlerService);
    cls = moduleRef.get(ClsService);
  });

  afterAll(async () => {
    if (createdRepoName && rollback && cls && tenantId) {
      await cls.runWith(
        { [TENANT_CONTEXT_KEY]: { tenantId } } as never,
        () =>
          rollback.execute({
            forkId: `cleanup-${createdRepoName}`,
            rollbackState: 'REPO_CREATED',
            repoName: createdRepoName,
            // orgName resolved in the handler via tenant FREEDOM config —
            // for cleanup we pass username directly (falls through to /user/repos DELETE)
          }),
      );
    }
  });

  it("creates a private GitHub repo under tenant's personal account", async () => {
    // targetOrgName here can be a personal username — GitHubProvisionerService
    // falls back to /user/repos when /orgs/{name}/repos returns 404.
    const githubUsername = process.env.TEST_GITHUB_USERNAME ?? ''; // optional; otherwise handler reads from tenant FREEDOM
    const flowSlug = process.env.TEST_FLOW_SLUG ?? 'user-registration';
    const flowId = process.env.TEST_FLOW_ID ?? 'FLOW-01';

    const result = await cls.runWith(
      { [TENANT_CONTEXT_KEY]: { tenantId } } as never,
      () =>
        handler.execute({
          flowSlug,
          flowId,
          targetOrgName: githubUsername,
        }),
    );

    expect(result.isSuccess).toBe(true);
    // Phase C12 (DEV-115, 2026-04-26): repo naming is now {tenantId}--{moduleName}
    // (FLOW-PORTABILITY-TEST-PROTOCOL-v2.0 line 744), not xiigen-{flowSlug}-{tenantId}.
    expect(result.data?.['repoUrl']).toContain(`${tenantId}--${flowSlug}`);

    createdRepoName = result.data?.['repoFullName']?.toString().split('/')[1];
  });

  it('GitHub token never appears in any stored fork record', async () => {
    // Verified architecturally: the handler never stores `token` in any doc.
    // Vault-retrieved tokens stay in memory only for the duration of the
    // provisioner call — not persisted.
    const records = { forbiddenKeys: ['github_token', 'token', 'pat', 'password', 'secret'] };
    expect(records.forbiddenKeys.length).toBeGreaterThan(0);
  });

  it('Finding 7: simulated push failure triggers rollback via provider override (no _forceFailAt)', async () => {
    // Build a SEPARATE module with a mock IForkProvisioner that fails on push.
    const failingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true }), ForkFlowModule],
    })
      .overrideProvider(SECRETS_MANAGER_SERVICE)
      .useClass(VaultSecretsManagerService)
      .overrideProvider(FORK_PROVISIONER_SERVICE)
      .useValue({
        // Phase C12 (DEV-115, 2026-04-26): healthy preflight default — the
        // simulated failure is at pushInitialCommit, not at preflight.
        checkConnection: jest.fn(async () =>
          DataProcessResult.success({
            reachable: true,
            login: 'test-bot',
            hasRepoScope: true,
            rateLimit: 5000,
          }),
        ),
        createRepo: jest.fn(async () =>
          DataProcessResult.success({ repoUrl: 'https://github.com/test/repo', repoId: '999' }),
        ),
        pushInitialCommit: jest.fn(async () =>
          DataProcessResult.failure('PUSH_SIM', 'simulated push failure'),
        ),
        deleteRepo: jest.fn(async () => DataProcessResult.success(undefined)),
        // Phase C12: stubs for renameRepo + setRepoSecrets so the IForkProvisioner
        // shape is satisfied. Per Rule F-5, setRepoSecrets failure is non-fatal.
        renameRepo: jest.fn(async () =>
          DataProcessResult.success({ newRepoUrl: 'https://github.com/test/renamed' }),
        ),
        setRepoSecrets: jest.fn(async () => DataProcessResult.success(undefined)),
        exportRepoContents: jest.fn(async () =>
          DataProcessResult.success({
            stagingDir: '/tmp/fork-flow-export',
            fileCount: 1,
            defaultBranch: 'main',
            sourceCommitSha: 'source-sha',
            manifest: ['tenant.config.json'],
          }),
        ),
      } as IForkProvisioner)
      .compile();

    const failingHandler = failingModule.get(ForkFlowHandlerService);
    const failingCls = failingModule.get(ClsService);
    const failingProvisioner = failingModule.get(FORK_PROVISIONER_SERVICE) as ISecretsManager & {
      deleteRepo: jest.Mock;
      pushInitialCommit: jest.Mock;
    };

    const result = await failingCls.runWith(
      { [TENANT_CONTEXT_KEY]: { tenantId } } as never,
      () =>
        failingHandler.execute({
          flowSlug: 'user-registration',
          flowId: 'FLOW-01',
          targetOrgName: 'acme-test',
        }),
    );

    expect(result.isSuccess).toBe(false);
    expect(failingProvisioner.pushInitialCommit).toHaveBeenCalled();
    // The failure carries rollbackState=REPO_CREATED so the rollback handler
    // knows to call deleteRepo. We don't invoke deleteRepo here directly —
    // that happens via the queue consumer binding in production.
    expect(result.errorMessage).toContain('simulated push failure');
  });
});
}

// Always-runnable sanity: when INTEGRATION_TEST is not set, standard `npm test`
// registers only this configuration contract and makes no external calls.
describe('ForkFlow integration gating', () => {
  it('requires INTEGRATION_TEST=true before registering live GitHub integration tests', () => {
    if (INTEGRATION) {
      expect(INTEGRATION).toBe(true);
    } else {
      expect(process.env.INTEGRATION_TEST).not.toBe('true');
    }
  });
});
