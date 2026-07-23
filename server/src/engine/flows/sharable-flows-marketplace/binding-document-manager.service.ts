/**
 * T523 BindingDocumentManager [ORCHESTRATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { ISecretsService, SECRETS_SERVICE } from '../../../fabrics/interfaces/secrets.interface';

const MARKETPLACE_BINDINGS_INDEX = 'xiigen-marketplace-bindings';

@Injectable()
export class BindingDocumentManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(SECRETS_SERVICE) private readonly secrets: ISecretsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T523',
        serviceName: 'BindingDocumentManagerService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async createBinding(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const tenantId = input['tenantId'] as string;
    const configMap = input['configMap'] as Record<string, unknown>;
    const secretRefs = input['secretRefs'] as string[] | undefined;
    if (!packageId || !tenantId || !configMap) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, tenantId, configMap required');
    }
    const secretRefMap: Record<string, string> = {};
    for (const secretRef of secretRefs ?? []) {
      const refKey = `pkg-${packageId}-${secretRef}-${Date.now()}`;
      await this.secrets.setSecret(refKey, secretRef);
      secretRefMap[secretRef] = refKey;
    }
    const bindingId = `bind-${packageId}-${tenantId}-${Date.now()}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_BINDINGS_INDEX,
      {
        bindingId,
        packageId,
        tenantId,
        configMap,
        secretRefs: secretRefMap,
        isApplied: true,
        appliedAt: new Date().toISOString(),
      },
      bindingId,
    );
    return DataProcessResult.success({
      packageId,
      bindingId,
      tenantId,
      secretRefsCount: Object.keys(secretRefMap).length,
      status: 'BOUND',
    });
  }
}
