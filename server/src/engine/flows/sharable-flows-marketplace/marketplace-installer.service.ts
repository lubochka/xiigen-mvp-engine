/**
 * T522 MarketplaceInstaller [ORCHESTRATION]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_INSTALLATIONS_INDEX = 'xiigen-marketplace-installations';

@Injectable()
export class MarketplaceInstallerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T522',
        serviceName: 'MarketplaceInstallerService',
        flowId: 'FLOW-32',
      }),
    });
  }
  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }
  async installPackage(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const versionId = input['versionId'] as string;
    if (!packageId || !versionId) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, versionId required');
    }
    const tenantId = this.getTenantId();
    const existingResult = await this.dbFabric.searchDocuments(MARKETPLACE_INSTALLATIONS_INDEX, {
      tenantId,
      packageId,
    });
    if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
      const existing = existingResult.data![0] as Record<string, unknown>;
      return DataProcessResult.success({
        packageId,
        installationId: existing['installationId'],
        alreadyInstalled: true,
      });
    }
    const installationId = `inst-${packageId}-${tenantId}-${Date.now()}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_INSTALLATIONS_INDEX,
      {
        installationId,
        packageId,
        versionId,
        tenantId,
        status: 'INSTALLED',
        installedAt: new Date().toISOString(),
      },
      installationId,
    );
    return DataProcessResult.success({ packageId, installationId, tenantId, status: 'INSTALLED' });
  }
}
