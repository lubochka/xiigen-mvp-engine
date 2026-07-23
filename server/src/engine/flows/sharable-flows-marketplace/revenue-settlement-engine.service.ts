/**
 * T532 RevenueSettlementEngine [BILLING]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_SETTLEMENTS_INDEX = 'xiigen-marketplace-settlements';

@Injectable()
export class RevenueSettlementEngineService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T532',
        serviceName: 'RevenueSettlementEngineService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async settleRevenue(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const publisherId = input['publisherId'] as string;
    const revenueCents = input['revenueCents'] as number | string | undefined;
    const platformPercentage = input['platformPercentage'] as number;
    if (
      !packageId ||
      !publisherId ||
      revenueCents === undefined ||
      platformPercentage === undefined
    ) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'packageId, publisherId, revenueCents, platformPercentage required',
      );
    }
    const totalCents = BigInt(String(revenueCents));
    const platformBps = BigInt(platformPercentage * 100);
    const _publisherBps = BigInt(10000) - platformBps;
    const platformCents = (totalCents * platformBps) / BigInt(10000);
    const publisherCents = totalCents - platformCents;
    const settlementId = `settle-${packageId}-${Date.now()}`;
    await this.dbFabric.storeDocument(
      MARKETPLACE_SETTLEMENTS_INDEX,
      {
        settlementId,
        packageId,
        publisherId,
        totalCents: totalCents.toString(),
        platformCents: platformCents.toString(),
        publisherCents: publisherCents.toString(),
        platformPercentage,
        settledAt: new Date().toISOString(),
      },
      settlementId,
    );
    return DataProcessResult.success({
      settlementId,
      packageId,
      publisherId,
      totalCents: totalCents.toString(),
      platformCents: platformCents.toString(),
      publisherCents: publisherCents.toString(),
      status: 'SETTLED',
    });
  }
}
