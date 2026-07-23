import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface SocialPostCreatorInput {
  distributionId: string;
  completionId: string;
  userId: string;
  tenantId: string;
  processedAt?: string;
}

export interface SocialPostCreatorResult {
  postId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialPostCreatorService
 */
@Injectable()
export class SocialPostCreatorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T92',
        serviceName: 'SocialPostCreatorService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(
    input: SocialPostCreatorInput,
  ): Promise<DataProcessResult<SocialPostCreatorResult>> {
    try {
      const { distributionId, completionId, userId, tenantId } = input;

      if (!distributionId || typeof distributionId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'distributionId is required');
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

      const postId = `spo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-posts', {
        post_id: postId,
        distribution_id: distributionId,
        completion_id: completionId,
        user_id: userId,
        tenant_id: tenantId,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('social.post.created', {
        postId,
        distributionId,
        completionId,
        userId,
        tenantId,
        createdAt: now,
      });

      return DataProcessResult.success({ postId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_POST_CREATOR_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
