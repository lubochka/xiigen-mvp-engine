/**
 * ForkFlowRollbackHandlerService — FLOW-47 Module Lifecycle.
 *
 * Consumes FlowForkFailed events from T671. Compensates based on the
 * rollbackState carried in the failure payload:
 *
 *   PREFLIGHT     — Phase C12: connection-health preflight failed BEFORE
 *                   any side-effect. Treated identically to NOTHING — the
 *                   handler never reached storeDocument or createRepo, so
 *                   no rollback work is needed. Recorded for observability.
 *   NOTHING       — no external side-effects to undo. Mark record FAILED.
 *   REPO_CREATED  — GitHub repo exists but push/CI did not complete.
 *                   Call IForkProvisioner.deleteRepo. If deletion fails,
 *                   the record is tagged ORPHANED_REPO for human cleanup;
 *                   partial cleanup is better than silent drift.
 *
 * DNA compliance:
 *   DNA-3 — returns DataProcessResult; no throw for business logic.
 *   DNA-5 — tenantId from AsyncLocalStorage via CLS.
 *   DNA-8 — storeDocument (record state update) runs even when provisioner
 *           deletion partially fails, so the audit log reflects reality.
 *
 * Rule 16: semantic slug `module-lifecycle`.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 step 3 — rollback handler.
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-47
 * @className ForkFlowRollbackHandlerService
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../kernel/multi-tenant/tenant-context';
import {
  DATABASE_SERVICE,
  IDatabaseService,
} from '../../../fabrics/interfaces/database.interface';
import {
  FORK_PROVISIONER_SERVICE,
  IForkProvisioner,
} from '../../../fabrics/interfaces/fork-provisioner.fabric.interface';
import {
  SECRETS_MANAGER_SERVICE,
  ISecretsManager,
} from '../../../fabrics/interfaces/secrets-manager.fabric.interface';
import {
  MODULE_LIFECYCLE_FORKS_INDEX,
  TENANT_GITHUB_TOKEN_KEY,
} from '../../../engine-contracts/fork-flow-contracts';

@Injectable()
export class ForkFlowRollbackHandlerService extends MicroserviceBase {
  constructor(
    @Inject(FORK_PROVISIONER_SERVICE) private readonly provisioner: IForkProvisioner,
    @Inject(SECRETS_MANAGER_SERVICE) private readonly secrets: ISecretsManager,
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly cls: ClsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T671.rollback',
        serviceName: 'ForkFlowRollbackHandlerService',
        flowId: 'FLOW-47',
      }),
    });
  }

  /**
   * Execute rollback for a failed fork attempt.
   *
   * Input (Record<string, unknown>):
   *   forkId: string
   *   rollbackState: 'NOTHING' | 'REPO_CREATED'
   *   orgName?: string        (required when rollbackState=REPO_CREATED)
   *   repoName?: string       (required when rollbackState=REPO_CREATED)
   *   errorCode: string
   *   errorMessage: string
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

    const forkId = input['forkId'] as string | undefined;
    const rollbackState = input['rollbackState'] as string | undefined;
    if (!forkId || !rollbackState) {
      return DataProcessResult.failure(
        'VALIDATION_FAILURE',
        'forkId and rollbackState are required',
      );
    }

    let repoDeleted = false;
    let repoDeleteErr: string | undefined;

    if (rollbackState === 'REPO_CREATED') {
      const orgName = input['orgName'] as string | undefined;
      const repoName = input['repoName'] as string | undefined;
      if (!orgName || !repoName) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'orgName and repoName required when rollbackState=REPO_CREATED',
        );
      }

      // Tenant-scoped GitHub token via ISecretsManager (DNA-5 compliant)
      const tokenResult = await this.secrets.get(TENANT_GITHUB_TOKEN_KEY);
      if (!tokenResult.isSuccess || !tokenResult.data) {
        repoDeleteErr = `secrets lookup failed: ${tokenResult.errorMessage ?? 'no data'}`;
      } else {
        const deleteResult = await this.provisioner.deleteRepo({
          orgName,
          repoName,
          token: tokenResult.data,
        });
        if (deleteResult.isSuccess) {
          repoDeleted = true;
        } else {
          repoDeleteErr = deleteResult.errorMessage ?? 'deleteRepo returned !isSuccess';
          // Do NOT return failure — partial cleanup is better than no cleanup.
          // The record is tagged ORPHANED_REPO so a human can delete it.
        }
      }
    }

    // DNA-8 — mark record FAILED (or ORPHANED_REPO) regardless of repo deletion outcome
    const finalStatus =
      rollbackState === 'REPO_CREATED' && !repoDeleted ? 'ORPHANED_REPO' : 'FAILED';
    const updateResult = await this.dbFabric.storeDocument(
      MODULE_LIFECYCLE_FORKS_INDEX,
      {
        forkId,
        tenantId,
        status: finalStatus,
        rollbackState,
        repoDeleted,
        repoDeleteError: repoDeleteErr ?? null,
        errorCode: input['errorCode'] ?? null,
        errorMessage: input['errorMessage'] ?? null,
        rolledBackAt: new Date().toISOString(),
      },
      forkId,
    );
    if (!updateResult.isSuccess) {
      return DataProcessResult.failure(
        updateResult.errorCode ?? 'UPDATE_FAILED',
        updateResult.errorMessage ?? 'fork-record rollback UPDATE failed',
        {
          forkId,
          rollbackState,
          repoDeleted,
        },
      );
    }

    return DataProcessResult.success({
      forkId,
      finalStatus,
      repoDeleted,
      repoDeleteError: repoDeleteErr ?? null,
    });
  }

  private getTenantId(): string | null {
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId ?? null;
    } catch {
      return null;
    }
  }
}
