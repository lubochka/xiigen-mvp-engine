/**
 * T529 RagBlueprintPublisher [PUBLISH]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const MARKETPLACE_RAG_BLUEPRINTS_INDEX = 'xiigen-marketplace-rag-blueprints';

@Injectable()
export class RagBlueprintPublisherService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T529',
        serviceName: 'RagBlueprintPublisherService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async publishBlueprint(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const blueprintId = input['blueprintId'] as string;
    const packageId = input['packageId'] as string;
    const patterns = input['patterns'] as Record<string, unknown>[];
    if (!blueprintId || !packageId || !patterns) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'blueprintId, packageId, patterns required',
      );
    }
    await this.dbFabric.storeDocument(
      MARKETPLACE_RAG_BLUEPRINTS_INDEX,
      {
        blueprintId,
        packageId,
        patterns,
        isPublished: true,
        publishedAt: new Date().toISOString(),
      },
      blueprintId,
    );
    await this.queueFabric.enqueue('blueprint.published', {
      blueprintId,
      packageId,
      patternCount: patterns.length,
    });
    return DataProcessResult.success({
      blueprintId,
      packageId,
      status: 'PUBLISHED',
      isImmutable: true,
    });
  }
}
