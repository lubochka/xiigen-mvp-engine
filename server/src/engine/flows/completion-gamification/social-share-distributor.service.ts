import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface SocialShareDistributorInput {
  shareIntentId: string;
  completionId: string;
  userId: string;
  tenantId: string;
  processedAt?: string;
}

export interface SocialShareDistributorResult {
  distributionId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialShareDistributorService
 */
@Injectable()
export class SocialShareDistributorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T91',
        serviceName: 'SocialShareDistributorService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(
    input: SocialShareDistributorInput,
  ): Promise<DataProcessResult<SocialShareDistributorResult>> {
    try {
      const { shareIntentId, completionId, userId, tenantId } = input;

      if (!shareIntentId || typeof shareIntentId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'shareIntentId is required');
      }
      if (!completionId || typeof completionId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'completionId is required');
      }
      if (!userId || typeof userId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!tenantId || typeof tenantId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      const distributionId = `ssd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-distributions', {
        distribution_id: distributionId,
        share_intent_id: shareIntentId,
        completion_id: completionId,
        user_id: userId,
        tenant_id: tenantId,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        distributed_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('social.share.distributed', {
        distributionId,
        shareIntentId,
        completionId,
        userId,
        tenantId,
        distributedAt: now,
      });

      return DataProcessResult.success({ distributionId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_SHARE_DISTRIBUTOR_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
