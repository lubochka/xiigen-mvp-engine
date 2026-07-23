/**
 * ForkFlowModule — DI wiring for FLOW-47 fork-flow engine infrastructure.
 *
 * FORK-FLOW-ENGINE-PLAN-v1.1 Phase 2.
 *
 * Binds:
 *   SECRETS_MANAGER_SERVICE   → VaultSecretsManagerService (OSS Vault default)
 *   FORK_PROVISIONER_SERVICE  → GitHubProvisionerService
 *   DOCKER_ENV_SERVICE        → DockerEnvGeneratorService
 *   FLOW_ASSEMBLER_SERVICE    → FlowFileAssemblerService
 *
 * To swap the secrets provider (e.g. for AWS Secrets Manager in production),
 * change ONE line below — nothing else in the codebase moves.
 *
 * DNA-6: no ForkFlowController in this module — DynamicController handles
 * routing; the marketplace POST endpoint publishes FlowForkRequested events
 * that this module's handler consumes.
 */

import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { FreedomModule } from '../../../freedom/freedom.module';
import { FabricsModule } from '../../../fabrics/fabrics.module';

// Handlers (extend MicroserviceBase — DNA-4)
import { ForkFlowHandlerService } from './fork-flow.handler';
import { ForkFlowRollbackHandlerService } from './fork-flow-rollback.handler';

// Fabric implementations (D-HIST-001: SDKs isolated to these files)
import { FlowFileAssemblerService } from '../../../fabrics/implementations/flow-file-assembler';
import { DockerEnvGeneratorService } from '../../../fabrics/implementations/docker-env-generator';
import { GitHubProvisionerService } from '../../../fabrics/implementations/github-provisioner';
import { DockerRegistryService } from '../../../fabrics/implementations/docker-registry.service';
import { VaultSecretsManagerService } from '../../../fabrics/implementations/vault-secrets-manager.service';

// Fabric DI tokens
import { SECRETS_MANAGER_SERVICE } from '../../../fabrics/interfaces/secrets-manager.fabric.interface';
import { FORK_PROVISIONER_SERVICE } from '../../../fabrics/interfaces/fork-provisioner.fabric.interface';
import { DOCKER_REGISTRY_SERVICE } from '../../../fabrics/interfaces/docker-registry.fabric.interface';
import { DOCKER_ENV_SERVICE } from '../../../fabrics/interfaces/docker-env.fabric.interface';
import { FLOW_ASSEMBLER_SERVICE } from '../../../fabrics/interfaces/flow-assembler.fabric.interface';

@Module({
  imports: [
    // FreedomConfigModule provides FREEDOM_CONFIG_SERVICE — needed by Vault provider
    FreedomModule,
    // FabricsModule provides DATABASE_SERVICE + QUEUE_SERVICE — needed by handlers
    FabricsModule,
    // CLS context — handlers + Vault provider both read tenantId from ALS
    ClsModule,
  ],
  providers: [
    // Handlers
    ForkFlowHandlerService,
    ForkFlowRollbackHandlerService,

    // Fabric implementations — registered so they can be referenced by token below
    FlowFileAssemblerService,
    DockerEnvGeneratorService,
    GitHubProvisionerService,
    DockerRegistryService,
    VaultSecretsManagerService,

    // Fabric token bindings — single line swaps for production (AWS/Vault Enterprise/etc)
    { provide: SECRETS_MANAGER_SERVICE, useClass: VaultSecretsManagerService },
    { provide: FORK_PROVISIONER_SERVICE, useClass: GitHubProvisionerService },
    { provide: DOCKER_REGISTRY_SERVICE, useClass: DockerRegistryService },
    { provide: DOCKER_ENV_SERVICE, useClass: DockerEnvGeneratorService },
    { provide: FLOW_ASSEMBLER_SERVICE, useClass: FlowFileAssemblerService },
  ],
  exports: [ForkFlowHandlerService, ForkFlowRollbackHandlerService],
})
export class ForkFlowModule {}
