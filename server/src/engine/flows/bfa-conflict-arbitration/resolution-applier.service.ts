/**
 * ResolutionApplier — T384 ARBITRATION service for FLOW-25.
 *
 * Executes the captured human decision by routing the ArbitrationStateMachine
 * to the correct terminal (or deferred) state.
 *
 * Resolution paths:
 *   APPROVE       → FSM: PENDING_RESOLUTION → APPLYING_RESOLUTION → RESOLVED
 *   REJECT        → FSM: PENDING_RESOLUTION → APPLYING_RESOLUTION → REJECTED
 *   DEFER         → No FSM transition; re-queue defer event (session remains PENDING_RESOLUTION)
 *   FORCE_PROCEED → Same path as APPROVE but forceProceed=true carried through (CF-489 re-checked)
 *
 * Iron rules (enforced — not configurable):
 *   IR-384-1:  Resolution requires a captured decision in DECISIONS_INDEX (T383 precondition)
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DecisionOption } from './impact-report-generator.service';
import { ArbitrationState, ArbitrationStateMachine } from './arbitration-state-machine.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shape ───────────────────────────────────────────────────────────────────

export interface AppliedResolution {
  readonly resolutionId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly decision: DecisionOption;
  /** null when decision=DEFER (no FSM state change). */
  readonly finalState: ArbitrationState | null;
  readonly forceProceed: boolean;
  readonly deferred: boolean;
  readonly appliedAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DECISIONS_INDEX = 'bfa-arbitration-decisions';
const RESOLUTIONS_INDEX = 'bfa-arbitration-resolutions';
const RESOLUTION_APPLIED_EVENT = 'arbitration.resolution.applied';
const RESOLUTION_DEFERRED_EVENT = 'arbitration.resolution.deferred';

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ResolutionApplier extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
    private readonly fsm: ArbitrationStateMachine,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T384',
        serviceName: 'ResolutionApplier',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Apply the captured human decision to the arbitration session.
   *
   * IR-384-1: A captured decision (from HumanResolutionCapture) must exist.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async applyResolution(
    sessionId: string,
    tenantId: string,
  ): Promise<DataProcessResult<AppliedResolution>> {
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // IR-384-1: load captured decision (T383 precondition)
    const decisionResult = await this.dbService.searchDocuments(DECISIONS_INDEX, {
      session_id: sessionId,
      tenant_id: tenantId,
    });
    if (!decisionResult.isSuccess || decisionResult.data!.length === 0) {
      return DataProcessResult.failure(
        'NO_DECISION_FOUND',
        `IR-384-1: No captured decision found for session '${sessionId}'. Run HumanResolutionCapture first.`,
      );
    }

    const decisionDoc = decisionResult.data![0];
    const decision = decisionDoc['decision'] as DecisionOption;
    const forceProceed = (decisionDoc['force_proceed'] as boolean) ?? false;

    const now = new Date().toISOString();
    const resolutionId = `res-${Date.now()}-${sessionId.slice(0, 8)}`;

    // Route based on decision
    if (decision === DecisionOption.DEFER) {
      return this.handleDefer(sessionId, tenantId, resolutionId, now);
    }

    return this.handleTerminating(sessionId, tenantId, decision, forceProceed, resolutionId, now);
  }

  // ── Resolution paths ──────────────────────────────────────────────────────

  /**
   * DEFER: no FSM transition — re-queue a deferred event.
   * Session remains in PENDING_RESOLUTION.
   */
  private async handleDefer(
    sessionId: string,
    tenantId: string,
    resolutionId: string,
    now: string,
  ): Promise<DataProcessResult<AppliedResolution>> {
    const doc: Record<string, unknown> = {
      resolution_id: resolutionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision: DecisionOption.DEFER,
      final_state: null,
      force_proceed: false,
      deferred: true,
      applied_at: now,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(RESOLUTIONS_INDEX, doc, resolutionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store deferred resolution',
      );
    }

    await this.queueService.enqueue(RESOLUTION_DEFERRED_EVENT, {
      resolution_id: resolutionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision: DecisionOption.DEFER,
      applied_at: now,
    });

    return DataProcessResult.success({
      resolutionId,
      sessionId,
      tenantId,
      decision: DecisionOption.DEFER,
      finalState: null,
      forceProceed: false,
      deferred: true,
      appliedAt: now,
    });
  }

  /**
   * APPROVE / REJECT / FORCE_PROCEED:
   * Drive FSM through APPLYING_RESOLUTION → terminal state.
   */
  private async handleTerminating(
    sessionId: string,
    tenantId: string,
    decision: DecisionOption,
    forceProceed: boolean,
    resolutionId: string,
    now: string,
  ): Promise<DataProcessResult<AppliedResolution>> {
    // Step 1: transition to APPLYING_RESOLUTION
    const step1 = await this.fsm.transition(
      sessionId,
      tenantId,
      ArbitrationState.APPLYING_RESOLUTION,
      `Resolution: ${decision}`,
    );
    if (!step1.isSuccess) {
      return DataProcessResult.failure(
        step1.errorCode ?? 'FSM_TRANSITION_FAILED',
        step1.errorMessage ?? `Failed to transition to APPLYING_RESOLUTION`,
      );
    }

    // Step 2: transition to terminal state
    const targetState =
      decision === DecisionOption.REJECT ? ArbitrationState.REJECTED : ArbitrationState.RESOLVED;

    const step2 = await this.fsm.transition(
      sessionId,
      tenantId,
      targetState,
      forceProceed ? 'FORCE_PROCEED override applied' : undefined,
    );
    if (!step2.isSuccess) {
      return DataProcessResult.failure(
        step2.errorCode ?? 'FSM_TRANSITION_FAILED',
        step2.errorMessage ?? `Failed to transition to ${targetState}`,
      );
    }

    const doc: Record<string, unknown> = {
      resolution_id: resolutionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      final_state: targetState,
      force_proceed: forceProceed,
      deferred: false,
      applied_at: now,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(RESOLUTIONS_INDEX, doc, resolutionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store applied resolution',
      );
    }

    await this.queueService.enqueue(RESOLUTION_APPLIED_EVENT, {
      resolution_id: resolutionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision,
      final_state: targetState,
      force_proceed: forceProceed,
      applied_at: now,
    });

    return DataProcessResult.success({
      resolutionId,
      sessionId,
      tenantId,
      decision,
      finalState: targetState,
      forceProceed,
      deferred: false,
      appliedAt: now,
    });
  }
}
