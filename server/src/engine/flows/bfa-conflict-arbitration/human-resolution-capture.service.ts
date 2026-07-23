/**
 * HumanResolutionCapture — T383 ARBITRATION service for FLOW-25.
 *
 * Captures the human arbitration decision for a PENDING_RESOLUTION session.
 * FORCE_PROCEED permission is re-validated at capture time — not just at report time (IR-383-3).
 *
 * Iron rules (enforced — not configurable):
 *   CF-491:    Decision must be one of 4 options (APPROVE/REJECT/DEFER/FORCE_PROCEED)
 *   CF-492:    FORCE_PROCEED rationale ≥ 50 characters required
 *   IR-383-1:  Session must be in PENDING_RESOLUTION state to accept a decision
 *   IR-383-3:  bfa:override re-validated at capture time — not trusted from report generation
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-7:     SETNX idempotency — duplicate decision returns existing
 *   DNA-8:     storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DecisionOption } from './impact-report-generator.service';
import { ArbitrationState } from './arbitration-state-machine.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shape ───────────────────────────────────────────────────────────────────

export interface CapturedDecision {
  readonly decisionId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly decision: DecisionOption;
  readonly actorId: string;
  readonly rationale: string | null;
  readonly forceProceed: boolean;
  readonly capturedAt: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const DECISIONS_INDEX = 'bfa-arbitration-decisions';
const SESSIONS_INDEX = 'bfa-arbitration-sessions';
const DECISION_CAPTURED_EVENT = 'arbitration.decision.captured';
const FORCE_PROCEED_MIN_CHARS = 50; // CF-492

const ALL_VALID_DECISIONS = new Set<string>(Object.values(DecisionOption));

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class HumanResolutionCapture extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T383',
        serviceName: 'HumanResolutionCapture',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Capture the human decision for a PENDING_RESOLUTION session.
   *
   * CF-491: decision must be APPROVE | REJECT | DEFER | FORCE_PROCEED.
   * IR-383-3: bfa:override re-validated at capture time for FORCE_PROCEED.
   * CF-492: FORCE_PROCEED rationale ≥ 50 chars.
   * IR-383-1: session must be PENDING_RESOLUTION.
   * DNA-7: duplicate capture returns existing decision.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async captureDecision(
    sessionId: string,
    tenantId: string,
    decision: string,
    actorId: string,
    actorPermissions: string[],
    rationale?: string,
  ): Promise<DataProcessResult<CapturedDecision>> {
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!actorId || actorId.trim() === '') {
      return DataProcessResult.failure('MISSING_ACTOR_ID', 'actorId is required');
    }

    // CF-491: validate decision option
    if (!ALL_VALID_DECISIONS.has(decision)) {
      return DataProcessResult.failure(
        'INVALID_DECISION',
        `CF-491: Decision must be one of [${Object.values(DecisionOption).join(', ')}]. Got: '${decision}'`,
      );
    }
    const typedDecision = decision as DecisionOption;

    // IR-383-3: re-validate bfa:override at capture time (not trusted from report)
    if (typedDecision === DecisionOption.FORCE_PROCEED) {
      if (!actorPermissions.includes('bfa:override')) {
        return DataProcessResult.failure(
          'PERMISSION_DENIED',
          'IR-383-3: FORCE_PROCEED requires bfa:override permission — re-validated at capture time',
        );
      }
      // CF-492: rationale ≥ 50 chars required
      const rationaleLen = (rationale ?? '').trim().length;
      if (rationaleLen < FORCE_PROCEED_MIN_CHARS) {
        return DataProcessResult.failure(
          'RATIONALE_TOO_SHORT',
          `CF-492: FORCE_PROCEED requires rationale of at least ${FORCE_PROCEED_MIN_CHARS} characters. Got: ${rationaleLen}`,
        );
      }
    }

    // IR-383-1: session must exist and be in PENDING_RESOLUTION
    const sessionResult = await this.dbService.searchDocuments(SESSIONS_INDEX, {
      session_id: sessionId,
      tenant_id: tenantId,
    });
    if (!sessionResult.isSuccess || sessionResult.data!.length === 0) {
      return DataProcessResult.failure('SESSION_NOT_FOUND', `Session '${sessionId}' not found`);
    }
    const sessionState = sessionResult.data![0]['state'] as string;
    if (sessionState !== ArbitrationState.PENDING_RESOLUTION) {
      return DataProcessResult.failure(
        'INVALID_SESSION_STATE',
        `IR-383-1: Decision can only be captured for PENDING_RESOLUTION sessions. Current state: '${sessionState}'`,
      );
    }

    // DNA-7: SETNX — return existing if already captured
    const existing = await this.dbService.searchDocuments(DECISIONS_INDEX, {
      session_id: sessionId,
      tenant_id: tenantId,
    });
    if (existing.isSuccess && existing.data!.length > 0) {
      return DataProcessResult.success(this.toDecision(existing.data![0]));
    }

    const decisionId = `dec-${Date.now()}-${sessionId.slice(0, 8)}`;
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      decision_id: decisionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision: typedDecision,
      actor_id: actorId,
      rationale: rationale ?? null,
      force_proceed: typedDecision === DecisionOption.FORCE_PROCEED,
      captured_at: now,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(DECISIONS_INDEX, doc, decisionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store captured decision',
      );
    }

    await this.queueService.enqueue(DECISION_CAPTURED_EVENT, {
      decision_id: decisionId,
      session_id: sessionId,
      tenant_id: tenantId,
      decision: typedDecision,
      actor_id: actorId,
      force_proceed: typedDecision === DecisionOption.FORCE_PROCEED,
      captured_at: now,
    });

    return DataProcessResult.success(this.toDecision(stored.data!));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toDecision(doc: Record<string, unknown>): CapturedDecision {
    return {
      decisionId: (doc['decision_id'] as string) ?? '',
      sessionId: (doc['session_id'] as string) ?? '',
      tenantId: (doc['tenant_id'] as string) ?? '',
      decision: doc['decision'] as DecisionOption,
      actorId: (doc['actor_id'] as string) ?? '',
      rationale: (doc['rationale'] as string | null) ?? null,
      forceProceed: (doc['force_proceed'] as boolean) ?? false,
      capturedAt: (doc['captured_at'] as string) ?? '',
    };
  }
}
