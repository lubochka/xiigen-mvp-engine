/**
 * T321RecipeRetryGate — GAP-21-04
 *
 * CF-393: ALL recipe step failures route to DLQ. NO direct retry.
 * Direct retry storms external services on outage and hides failures from operators.
 *
 * Before fix: direct retry code path existed.
 * After fix: handleStepFailure() routes to IRecipeDlqService — zero direct retries.
 *
 * Backoff schedule (FREEDOM-configurable):
 *   Attempt 1: 10 minutes
 *   Attempt 2: 1 hour
 *   Attempt 3: 6 hours
 *   Attempt 4+: 24 hours
 *
 * DNA-3: returns DataProcessResult, never throws
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface RecipeStepFailure {
  stepId: string;
  recipeId: string;
  executionId: string;
  attempt: number;
  maxAttempts: number;
  reason: string;
}

export interface RecipeDlqEntry {
  stepId: string;
  recipeId: string;
  executionId: string;
  attempt: number;
  maxAttempts: number;
  failureReason: string;
  failedAt: string;
  nextRetryAt: string;
}

/** Injection token for IRecipeDlqService (F871) */
export const RECIPE_DLQ_SERVICE = 'RECIPE_DLQ_SERVICE';

export interface IRecipeDlqService {
  route(entry: RecipeDlqEntry): Promise<DataProcessResult<void>>;
}

/** Injection token for IRecipeStateService */
export const RECIPE_STATE_SERVICE = 'RECIPE_STATE_SERVICE';

export interface IRecipeStateService {
  recordStepState(
    stepId: string,
    state: 'FAILED' | 'PERMANENTLY_FAILED' | 'RETRYING',
    context: Record<string, unknown>,
  ): Promise<DataProcessResult<void>>;
}

/** Injection token for IRecipeAuditService */
export const RECIPE_AUDIT_SERVICE = 'RECIPE_AUDIT_SERVICE';

export interface IRecipeAuditService {
  recordFailure(entry: Record<string, unknown>): Promise<DataProcessResult<void>>;
}

@Injectable()
export class T321RecipeRetryGate {
  private readonly logger = new Logger(T321RecipeRetryGate.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(RECIPE_DLQ_SERVICE) private readonly dlqService: IRecipeDlqService,
    @Inject(RECIPE_STATE_SERVICE) private readonly stateService: IRecipeStateService,
    @Inject(RECIPE_AUDIT_SERVICE) private readonly auditService: IRecipeAuditService,
  ) {}

  /**
   * CF-393: ALL recipe step failures route to DLQ.
   * No direct retry. DLQ consumer handles retry with backoff.
   */
  async handleStepFailure(
    stepId: string,
    failureContext: RecipeStepFailure,
  ): Promise<DataProcessResult<void>> {
    // Mark step as FAILED in recipe state (CF-394: atomic)
    const stateResult = await this.stateService.recordStepState(stepId, 'FAILED', {
      reason: failureContext.reason,
      failedAt: new Date().toISOString(),
      attempt: failureContext.attempt,
    });

    if (!stateResult.isSuccess) {
      this.logger.warn(`T321: failed to record step state for ${stepId}`, stateResult.errorMessage);
    }

    // Audit trail (immutable)
    await this.auditService.recordFailure({
      stepId,
      recipeId: failureContext.recipeId,
      attempt: failureContext.attempt,
      reason: failureContext.reason,
      timestamp: new Date().toISOString(),
    });

    // Route to DLQ — NO DIRECT RETRY (CF-393)
    const nextRetryAt = this.computeBackoffTime(failureContext.attempt);
    const dlqResult = await this.dlqService.route({
      stepId,
      recipeId: failureContext.recipeId,
      executionId: failureContext.executionId,
      attempt: failureContext.attempt,
      maxAttempts: failureContext.maxAttempts,
      failureReason: failureContext.reason,
      failedAt: new Date().toISOString(),
      nextRetryAt,
    });

    this.logger.log(
      `T321: step ${stepId} routed to DLQ (attempt ${failureContext.attempt}/${failureContext.maxAttempts})`,
    );
    return dlqResult;
  }

  /**
   * Exponential backoff schedule (FREEDOM config):
   * Attempt 1: 10 minutes
   * Attempt 2: 1 hour
   * Attempt 3: 6 hours
   * Attempt 4+: 24 hours
   */
  computeBackoffTime(attempt: number): string {
    const backoffMs = [
      10 * 60 * 1000, // 10 minutes
      60 * 60 * 1000, // 1 hour
      6 * 60 * 60 * 1000, // 6 hours
      24 * 60 * 60 * 1000, // 24 hours
    ];
    const delayMs = backoffMs[Math.min(attempt - 1, backoffMs.length - 1)];
    return new Date(Date.now() + delayMs).toISOString();
  }
}
