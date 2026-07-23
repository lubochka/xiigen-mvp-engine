/**
 * T534 FraudDetectionService [SECURITY]
 */
import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const _MARKETPLACE_FRAUD_FLAGS_INDEX = 'xiigen-marketplace-fraud-flags';

@Injectable()
export class FraudDetectionService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T534',
        serviceName: 'FraudDetectionService',
        flowId: 'FLOW-32',
      }),
    });
  }
  async detectFraud(
    input: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const reviewId = input['reviewId'] as string;
    const userId = input['userId'] as string;
    const score = input['score'] as number;
    const downloadCount = input['downloadCount'] as number | undefined;
    if (!reviewId || !userId || score === undefined) {
      return DataProcessResult.failure('INVALID_INPUT', 'reviewId, userId, score required');
    }
    const suspiciousPatterns: string[] = [];
    if (score < 1 && (downloadCount ?? 0) < 10) {
      suspiciousPatterns.push('LOW_SCORE_MINIMAL_USAGE');
    }
    const isFlagged = suspiciousPatterns.length > 0;
    if (isFlagged) {
      const flagId = `fraud-flag-${reviewId}-${Date.now()}`;
      await this.queueFabric.enqueue('fraud.review.required', {
        flagId,
        reviewId,
        userId,
        suspiciousPatterns,
        requiresHumanReview: true,
      });
      return DataProcessResult.success({
        reviewId,
        flagId,
        isFlagged: true,
        suspiciousPatterns,
        status: 'HUMAN_REVIEW_REQUIRED',
      });
    }
    return DataProcessResult.success({ reviewId, isFlagged: false, status: 'PASSED_FRAUD_CHECK' });
  }
}
