/**
 * T531 UsageMeter [MEASUREMENT]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_USAGE_LOG_INDEX = 'xiigen-marketplace-usage-log';

@Injectable()
export class UsageMeterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T531',
        serviceName: 'UsageMeterService',
        flowId: 'FLOW-32',
      }),
    });
  }
  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }
  async recordUsage(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const usageType = input['usageType'] as string;
    const metadata = input['metadata'] as Record<string, unknown> | undefined;
    if (!packageId || !usageType) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, usageType required');
    }
    const tenantId = this.getTenantId();
    const usageRecordId = `usage-${packageId}-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_USAGE_LOG_INDEX,
      {
        usageRecordId,
        packageId,
        tenantId,
        usageType,
        metadata: metadata ?? {},
        recordedAt: new Date().toISOString(),
      },
      usageRecordId,
    );
    return DataProcessResult.success({
      usageRecordId,
      packageId,
      tenantId,
      usageType,
      status: 'RECORDED',
    });
  }
}
