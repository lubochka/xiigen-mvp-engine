/**
 * RoutingPolicyUpdater — T447 LEARNING service for FLOW-29.
 *
 * Async bandit policy update from feedback signals.
 *
 * SCORE-0 iron rules (any violation = contract rejection):
 *   ASYNC-ONLY:   NEVER called synchronously on the live retrieval path
 *   QUEUE-TRIGGER: Policy updates triggered via queue events — never direct call from routers
 *   DNA-8:        storeDocument() BEFORE enqueue()
 *   CF-476:       tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:        All methods return DataProcessResult<T> — never throw
 *   NEXT-REQUEST: Policy changes take effect on NEXT request — never mutate in-flight requests
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface PolicyUpdateResult {
  readonly updated: boolean;
  readonly policyId: string;
  readonly newWeights: Record<string, number>;
  readonly updatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const POLICY_INDEX = 'flow29-bandit-policy';
const UPDATE_INDEX = 'flow29-policy-updates';
const UPDATE_EVENT = 'routing.policy.updated';
const LEARNING_RATE = 0.1;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RoutingPolicyUpdater {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Update bandit policy weights based on a feedback signal.
   *
   * SCORE-0: This service is ASYNC-ONLY — it must only be called via queue consumer.
   * Never invoke directly from routing path.
   *
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async applyFeedback(
    tenantId: string,
    armId: string,
    reward: number,
    sessionId: string,
  ): Promise<DataProcessResult<PolicyUpdateResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!armId || armId.trim() === '') {
      return DataProcessResult.failure('MISSING_ARM_ID', 'armId is required');
    }
    if (typeof reward !== 'number' || isNaN(reward)) {
      return DataProcessResult.failure('INVALID_REWARD', 'reward must be a valid number');
    }

    // Read current policy
    const policyResult = await this.db.searchDocuments(POLICY_INDEX, {
      tenant_id: tenantId,
      active: true,
    });
    if (!policyResult.isSuccess) {
      return DataProcessResult.failure(
        policyResult.errorCode ?? 'POLICY_READ_FAILED',
        policyResult.errorMessage ?? 'Failed to read current policy',
      );
    }

    const currentPolicy = (policyResult.data ?? [])[0] ?? null;
    const currentWeights =
      (currentPolicy?.['mode_weights'] as Record<string, number> | undefined) ?? {};

    // Update weights via simple exponential moving average
    const newWeights: Record<string, number> = { ...currentWeights };
    const oldWeight = newWeights[armId] ?? 1.0;
    newWeights[armId] = oldWeight + LEARNING_RATE * (reward - oldWeight);

    const policyId = `policy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const updatedAt = new Date().toISOString();

    const updateDoc: Record<string, unknown> = {
      policy_id: policyId,
      tenant_id: tenantId,
      session_id: sessionId,
      arm_id: armId,
      reward,
      new_weights: newWeights,
      updated_at: updatedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(UPDATE_INDEX, updateDoc, policyId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store policy update',
      );
    }

    await this.queue.enqueue(UPDATE_EVENT, {
      policy_id: policyId,
      tenant_id: tenantId,
      arm_id: armId,
      new_weights: newWeights,
      updated_at: updatedAt,
    });

    return DataProcessResult.success({ updated: true, policyId, newWeights, updatedAt });
  }
}
