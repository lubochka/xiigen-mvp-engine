/**
 * T524 TemplateDiscoveryEngine [QUERY]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

const MARKETPLACE_TEMPLATES_INDEX = 'xiigen-marketplace-templates';
const MARKETPLACE_REVIEWS_INDEX = 'xiigen-marketplace-reviews';

@Injectable()
export class TemplateDiscoveryEngineService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T524',
        serviceName: 'TemplateDiscoveryEngineService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async discoverTemplates(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const category = input['category'] as string | undefined;
    const minRating = input['minRating'] as number | undefined;
    const minUsageCount = input['minUsageCount'] as number | undefined;
    const filter: Record<string, unknown> = {};
    if (category) filter['category'] = category;
    if (minRating !== undefined) filter['averageRating'] = { $gte: minRating };
    if (minUsageCount !== undefined) filter['usageCount'] = { $gte: minUsageCount };
    const result = await this.dbFabric.searchDocuments(MARKETPLACE_TEMPLATES_INDEX, filter);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'SEARCH_FAILED',
        result.errorMessage ?? 'Template search failed',
      );
    }
    const templates = (result.data ?? []) as Record<string, unknown>[];
    const templatesWithRatings = await Promise.all(
      templates.map(async (tpl) => {
        const reviewResult = await this.dbFabric.searchDocuments(MARKETPLACE_REVIEWS_INDEX, {
          templateId: tpl['templateId'],
        });
        const reviews = (reviewResult.data ?? []) as Record<string, unknown>[];
        const avgRating = reviews.length
          ? (reviews.reduce(
              (sum, r) => (sum as number) + ((r['rating'] as number) ?? 0),
              0,
            ) as number) / reviews.length
          : 0;
        return { ...tpl, calculatedRating: avgRating, reviewCount: reviews.length };
      }),
    );
    return DataProcessResult.success({
      templates: templatesWithRatings,
      totalCount: templatesWithRatings.length,
    });
  }
}
