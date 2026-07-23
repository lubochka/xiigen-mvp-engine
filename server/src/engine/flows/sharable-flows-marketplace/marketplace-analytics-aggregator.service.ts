/**
 * T533 MarketplaceAnalyticsAggregator [ANALYTICS]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_ANALYTICS_INDEX = 'xiigen-marketplace-analytics';

@Injectable()
export class MarketplaceAnalyticsAggregatorService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T533',
        serviceName: 'MarketplaceAnalyticsAggregatorService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async aggregateMetrics(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const packageId = input['packageId'] as string;
    const timeWindow = input['timeWindow'] as string;
    const metrics = input['metrics'] as Record<string, unknown>;
    if (!packageId || !timeWindow || !metrics) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId, timeWindow, metrics required');
    }
    const aggregationId = `agg-${packageId}-${timeWindow}-${Date.now()}`;
    const now = new Date();
    const windowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    await this.dbFabric.storeDocument(
      MARKETPLACE_ANALYTICS_INDEX,
      {
        aggregationId,
        packageId,
        timeWindow,
        windowDate: windowDate.toISOString(),
        metrics,
        aggregatedAt: now.toISOString(),
      },
      aggregationId,
    );
    return DataProcessResult.success({
      aggregationId,
      packageId,
      timeWindow,
      windowDate: windowDate.toISOString(),
      metricsRecorded: Object.keys(metrics).length,
    });
  }
}
