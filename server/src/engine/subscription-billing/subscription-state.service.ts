/**
 * SubscriptionStateService — manages subscription state transitions (FLOW-12).
 *
 * C-7 Fix: Replaced throw new InvalidTransitionError with DataProcessResult.failure.
 *   Invalid transitions return a structured failure — never throw (DNA-3).
 *
 * C-1 Fix: transition() parameter uses Record<string, unknown> — not SubscriptionStateTransition.
 *   Business data schema lives in FREEDOM config, not TypeScript interfaces (DNA-1).
 *
 * State machine: PENDING → ACTIVE → SUSPENDED → ACTIVE | CANCELLED
 *                TRIAL → ACTIVE | CANCELLED
 *                PAST_DUE → ACTIVE | CANCELLED | SUSPENDED
 *                CANCELLED → (terminal)
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-5: tenantId on all writes via parameter
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: [], // terminal — no valid transitions
  TRIAL: ['ACTIVE', 'CANCELLED'],
  PAST_DUE: ['ACTIVE', 'CANCELLED', 'SUSPENDED'],
};

@Injectable()
export class SubscriptionStateService {
  private readonly logger = new Logger(SubscriptionStateService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Transition a subscription to a new state.
   *
   * C-7 Fix: Returns DataProcessResult.failure for invalid transitions.
   * C-1 Fix: transition param is Record<string, unknown> (no typed interface).
   *
   * @param subscriptionId  The subscription to transition
   * @param toState         The target state
   * @param transition      Transition metadata (fromState, triggeredBy, reason, etc.)
   * @returns Success with updated subscription or failure with error code
   */
  async transition(
    subscriptionId: string,
    toState: string,
    transition: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const currentState = transition['fromState'] as string;
    const tenantId = transition['tenantId'] as string;

    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT_ID', 'transition must include tenantId');
    }

    const allowed = VALID_TRANSITIONS[currentState] ?? [];
    if (!allowed.includes(toState)) {
      // C-7 Fix: DataProcessResult.failure instead of throw new InvalidTransitionError
      return DataProcessResult.failure(
        'INVALID_STATE_TRANSITION',
        `Invalid state transition: ${currentState} → ${toState}. ` +
          `Allowed from ${currentState}: [${allowed.join(', ')}]`,
      );
    }

    // Build transition record (DNA-1: Record<string, unknown>)
    const transitionRecord: Record<string, unknown> = {
      subscriptionId,
      tenantId,
      fromState: currentState,
      toState,
      triggeredAt: transition['triggeredAt'] ?? new Date().toISOString(),
      triggeredBy: transition['triggeredBy'] ?? 'system',
      reason: transition['reason'] ?? null,
    };

    // DNA-8: storeDocument before any downstream enqueue
    const storeResult = await this.db.storeDocument(
      'xiigen-subscription-transitions',
      transitionRecord,
      `${subscriptionId}:${transitionRecord['triggeredAt']}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'TRANSITION_STORE_FAILED',
        storeResult.errorMessage ?? 'Failed to store transition record',
      );
    }

    // Update subscription state in main index
    const subResult = await this.db.getDocument('xiigen-subscriptions', subscriptionId);
    const existingSub = subResult.isSuccess && subResult.data ? subResult.data : {};

    const updatedSub: Record<string, unknown> = {
      ...existingSub,
      subscriptionId,
      tenantId,
      state: toState,
      previousState: currentState,
      stateUpdatedAt: transitionRecord['triggeredAt'],
    };

    const updateResult = await this.db.storeDocument(
      'xiigen-subscriptions',
      updatedSub,
      subscriptionId,
    );

    if (!updateResult.isSuccess) {
      return DataProcessResult.failure(
        'SUBSCRIPTION_UPDATE_FAILED',
        updateResult.errorMessage ?? 'Failed to update subscription state',
      );
    }

    this.logger.log(`Subscription ${subscriptionId}: ${currentState} → ${toState}`);
    return DataProcessResult.success(transitionRecord);
  }
}
