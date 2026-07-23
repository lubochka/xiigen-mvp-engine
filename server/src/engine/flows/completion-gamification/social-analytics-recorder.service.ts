import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

export interface SocialAnalyticsRecorderInput {
  shareIntentId: string;
  completionId: string;
  userId: string;
  tenantId: string;
  processedAt?: string;
}

export interface SocialAnalyticsRecorderResult {
  analyticsRecordId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialAnalyticsRecorderService
 */
@Injectable()
export class SocialAnalyticsRecorderService extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T95',
        serviceName: 'SocialAnalyticsRecorderService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(
    input: SocialAnalyticsRecorderInput,
  ): Promise<DataProcessResult<SocialAnalyticsRecorderResult>> {
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

      const analyticsRecordId = `sar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-analytics', {
        analytics_record_id: analyticsRecordId,
        share_intent_id: shareIntentId,
        completion_id: completionId,
        user_id: userId,
        tenant_id: tenantId,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        recorded_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      return DataProcessResult.success({ analyticsRecordId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_ANALYTICS_RECORDER_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
