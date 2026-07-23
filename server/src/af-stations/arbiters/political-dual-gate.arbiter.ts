/**
 * PoliticalDualGateArbiter — DD-168 compliance (GAP-NEW-81)
 *
 * Manages the two-gate approval pattern for political ad content.
 * Both AI gate AND human gate MUST pass for approval.
 * No auto-approval of political content. No exceptions.
 *
 * DNA-4: extends MicroserviceBase
 * DNA-3: returns DataProcessResult from all methods
 */
import { Injectable } from '@nestjs/common';
import { MicroserviceBase } from '../../kernel/microservice-base';
import { DataProcessResult } from '../../kernel/data-process-result';

export type GateType = 'ai' | 'human';
export type ArbiterStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ArbiterState {
  status: ArbiterStatus;
  reason?: string;
  waitingFor?: GateType;
  aiGatePassed?: boolean;
  humanGatePassed?: boolean;
  humanReviewActuallyOccurred?: boolean;
}

export interface GateResultInput {
  gateType: GateType;
  passed: boolean;
  /** Required for human gate — prevents bot simulation of human approval. */
  reviewerId?: string;
}

@Injectable()
export class PoliticalDualGateArbiter extends MicroserviceBase {
  private readonly gateResults = new Map<GateType, boolean>();
  private readonly reviewerIds = new Map<GateType, string>();
  private status: ArbiterStatus = 'PENDING';

  async receiveGateResult(input: GateResultInput): Promise<DataProcessResult<ArbiterState>> {
    const { gateType, passed, reviewerId } = input;

    // Human gate requires a real reviewer ID (prevents bot simulation)
    if (gateType === 'human' && !reviewerId) {
      return DataProcessResult.failure(
        'ARBITER_INVALID',
        'Political dual-gate arbiter: human review requires a reviewerId. ' +
          'Bot-simulated human approval is not permitted. (DD-168)',
      );
    }

    // Record gate result
    this.gateResults.set(gateType, passed);
    if (reviewerId) {
      this.reviewerIds.set(gateType, reviewerId);
    }

    // Evaluate state
    const state = this.evaluateState();
    this.status = state.status;

    return DataProcessResult.success(state);
  }

  private evaluateState(): ArbiterState {
    const aiResult = this.gateResults.get('ai');
    const humanResult = this.gateResults.get('human');

    // AI gate fails → immediate rejection (no human review needed)
    if (aiResult === false) {
      return {
        status: 'REJECTED',
        reason: 'AI_GATE_FAILED',
        aiGatePassed: false,
        humanGatePassed: humanResult,
      };
    }

    // Human gate fails → rejection
    if (humanResult === false) {
      return {
        status: 'REJECTED',
        reason: 'HUMAN_GATE_FAILED',
        aiGatePassed: true,
        humanGatePassed: false,
        humanReviewActuallyOccurred: true,
      };
    }

    // Both passed → approved
    if (aiResult === true && humanResult === true) {
      return {
        status: 'APPROVED',
        aiGatePassed: true,
        humanGatePassed: true,
        humanReviewActuallyOccurred: !!this.reviewerIds.get('human'),
      };
    }

    // Still waiting for one or more gates
    const waitingFor: GateType = aiResult === undefined ? 'ai' : 'human';
    return {
      status: 'PENDING',
      waitingFor,
      aiGatePassed: aiResult,
      humanGatePassed: humanResult,
    };
  }

  getCurrentState(): ArbiterState {
    return this.evaluateState();
  }

  isPending(): boolean {
    return this.status === 'PENDING';
  }

  isApproved(): boolean {
    return this.status === 'APPROVED';
  }

  isRejected(): boolean {
    return this.status === 'REJECTED';
  }
}
