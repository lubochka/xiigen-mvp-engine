import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface SocialShareGateInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  privacySetting: string;
  processedAt?: string;
}

export interface SocialShareGateResult {
  shared: boolean;
  shareIntentId?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialShareGateService
 */
@Injectable()
export class SocialShareGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T90',
        serviceName: 'SocialShareGateService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(input: SocialShareGateInput): Promise<DataProcessResult<SocialShareGateResult>> {
    try {
      const { completionId, questionnaireId, userId, tenantId, privacySetting } = input;

      if (!completionId || typeof completionId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'completionId is required');
      }
      if (!userId || typeof userId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!tenantId || typeof tenantId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      if (privacySetting?.toUpperCase() === 'PRIVATE') {
        return DataProcessResult.success({ shared: false });
      }

      const shareIntentId = `ssi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-share-intents', {
        share_intent_id: shareIntentId,
        completion_id: completionId,
        questionnaire_id: questionnaireId,
        user_id: userId,
        tenant_id: tenantId,
        privacy_setting: privacySetting,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        intended_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('social.share.approved', {
        shareIntentId,
        completionId,
        userId,
        tenantId,
        approvedAt: now,
      });

      return DataProcessResult.success({ shared: true, shareIntentId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_SHARE_GATE_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
