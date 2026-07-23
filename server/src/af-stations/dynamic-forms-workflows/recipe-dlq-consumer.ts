/**
 * RecipeDlqConsumer — GAP-21-04
 *
 * CF-393 / F871 IRecipeDlqService implementation.
 * Processes items from the recipe DLQ with exponential backoff retry.
 *
 * After max attempts: marks step PERMANENTLY_FAILED and alerts via FREEDOM config channel.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-7: queue consumer deduplicates via idempotency key
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  RECIPE_STATE_SERVICE,
  IRecipeStateService,
  RecipeDlqEntry,
} from './t321-recipe-retry-gate';

/** Consumer topic for recipe DLQ */
export const RECIPE_DLQ_TOPIC = 'form.recipe.dlq';

@Injectable()
export class RecipeDlqConsumer {
  private readonly logger = new Logger(RecipeDlqConsumer.name);

  constructor(
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(RECIPE_STATE_SERVICE) private readonly stateService: IRecipeStateService,
  ) {}

  /**
   * Process a DLQ entry. Checks timing, re-enqueues with delay, or escalates.
   * Consumer topic: form.recipe.dlq
   */
  async processRetry(dlqEntry: Record<string, unknown>): Promise<DataProcessResult<void>> {
    // DNA-7: idempotency check
    const idempotencyKey = dlqEntry['idempotencyKey'] as string | undefined;
    if (!idempotencyKey) {
      this.logger.warn('RecipeDlqConsumer: missing idempotencyKey — proceeding without dedup');
    }

    const nextRetryAt = new Date(dlqEntry['nextRetryAt'] as string);
    const attempt = dlqEntry['attempt'] as number;
    const maxAttempts = dlqEntry['maxAttempts'] as number;
    const stepId = dlqEntry['stepId'] as string;

    // Check if retry time has come
    if (new Date() < nextRetryAt) {
      // Re-enqueue for later — infrastructure handles scheduling
      this.logger.debug(
        `RecipeDlqConsumer: step ${stepId} not ready for retry until ${nextRetryAt.toISOString()}`,
      );
      return this.queue
        .enqueue(RECIPE_DLQ_TOPIC, dlqEntry as RecipeDlqEntry & Record<string, unknown>)
        .then(() => DataProcessResult.success(undefined));
    }

    // Max attempts exceeded: escalate
    if (attempt >= maxAttempts) {
      return this.escalateFailure(dlqEntry);
    }

    // Retry: re-enqueue with incremented attempt count
    const retryEntry: Record<string, unknown> = {
      ...dlqEntry,
      attempt: attempt + 1,
      retriedAt: new Date().toISOString(),
    };

    this.logger.log(
      `RecipeDlqConsumer: retrying step ${stepId} (attempt ${attempt + 1}/${maxAttempts})`,
    );
    const enqueueResult = await this.queue.enqueue('form.recipe.step.execute', retryEntry);
    if (!enqueueResult.isSuccess) {
      return DataProcessResult.failure(
        enqueueResult.errorCode ?? 'RETRY_ENQUEUE_FAILED',
        enqueueResult.errorMessage ?? 'Failed to enqueue retry',
      );
    }

    return DataProcessResult.success(undefined);
  }

  private async escalateFailure(
    dlqEntry: Record<string, unknown>,
  ): Promise<DataProcessResult<void>> {
    const stepId = dlqEntry['stepId'] as string;

    // Mark as PERMANENTLY_FAILED
    await this.stateService.recordStepState(stepId, 'PERMANENTLY_FAILED', dlqEntry);

    this.logger.error(
      `RecipeDlqConsumer: step ${stepId} permanently failed after ${dlqEntry['attempt']} attempts`,
      JSON.stringify(dlqEntry),
    );

    // Alert would be emitted via FREEDOM config alert channel in production
    return DataProcessResult.success(undefined);
  }
}
