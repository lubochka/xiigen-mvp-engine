import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface MLCurriculumTriggerInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  effectiveTotal: number;
  processedAt?: string;
}

export interface MLCurriculumTriggerResult {
  requestId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className MLCurriculumTrigger
 */
@Injectable()
export class MLCurriculumTrigger extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T88',
        serviceName: 'MLCurriculumTrigger',
        flowId: 'FLOW-05',
      }),
    });
  }

  async trigger(
    input: MLCurriculumTriggerInput,
  ): Promise<DataProcessResult<MLCurriculumTriggerResult>> {
    try {
      if (!input.completionId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'completionId is required');
      }
      if (!input.userId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      const requestId = `mlr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument(
        'xiigen-ml-adaptation-requests',
        {
          request_id: requestId,
          completion_id: input.completionId,
          questionnaire_id: input.questionnaireId,
          user_id: input.userId,
          tenant_id: input.tenantId,
          effective_total: input.effectiveTotal,
          connection_type: 'FLOW_SCOPED',
          knowledge_scope: 'PRIVATE',
          requested_at: now,
        },
        requestId,
      );

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('ml.adaptation.requested', {
        requestId,
        completionId: input.completionId,
        userId: input.userId,
        tenantId: input.tenantId,
        effectiveTotal: input.effectiveTotal,
        requestedAt: now,
      });

      return DataProcessResult.success({ requestId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return DataProcessResult.failure('MLCURRICULUM_TRIGGER_ERROR', message);
    }
  }
}
