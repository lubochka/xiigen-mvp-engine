/**
 * T527 MigrationRollbackHandler [RECOVERY]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_ROLLBACK_LOG_INDEX = 'xiigen-marketplace-rollback-log';

@Injectable()
export class MigrationRollbackHandlerService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T527',
        serviceName: 'MigrationRollbackHandlerService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async rollbackInstallation(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const installationId = input['installationId'] as string;
    const tenantId = input['tenantId'] as string;
    const failureReason = input['failureReason'] as string;
    if (!installationId || !tenantId) {
      return DataProcessResult.failure('INVALID_INPUT', 'installationId, tenantId required');
    }
    const existingResult = await this.dbFabric.searchDocuments(MARKETPLACE_ROLLBACK_LOG_INDEX, {
      installationId,
    });
    if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
      const existing = existingResult.data![0] as Record<string, unknown>;
      return DataProcessResult.success({
        installationId,
        status: 'ALREADY_ROLLED_BACK',
        rollbackId: existing['rollbackId'],
      });
    }
    const rollbackId = `rb-${installationId}-${Date.now()}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_ROLLBACK_LOG_INDEX,
      {
        rollbackId,
        installationId,
        tenantId,
        failureReason,
        rolledBackAt: new Date().toISOString(),
      },
      rollbackId,
    );
    return DataProcessResult.success({
      installationId,
      tenantId,
      rollbackId,
      status: 'ROLLED_BACK',
      failureReason,
    });
  }
}
