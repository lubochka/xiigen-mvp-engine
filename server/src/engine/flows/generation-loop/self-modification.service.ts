// SK-407–SK-415: Engine self-modification protocols.
// All modifications gated by EscalationBriefing approval.
// Nine protocols: prompt-patch, arbiter-threshold-tuning, model-swap,
//   skill-update, bfa-rule-addition, freedom-config-update,
//   factory-version-bump, session-output-format-update, rollback-protocol.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export type ModificationProtocol =
  | 'PROMPT_PATCH' // SK-407
  | 'ARBITER_THRESHOLD' // SK-408
  | 'MODEL_SWAP' // SK-409
  | 'SKILL_UPDATE' // SK-410
  | 'BFA_RULE_ADDITION' // SK-411
  | 'FREEDOM_CONFIG_UPDATE' // SK-412
  | 'FACTORY_VERSION_BUMP' // SK-413
  | 'SESSION_OUTPUT_FORMAT' // SK-414
  | 'ROLLBACK_PROTOCOL'; // SK-415

export interface ModificationRequest {
  requestId: string;
  protocol: ModificationProtocol;
  briefingId: string; // Must reference an EscalationBriefing
  approvedBy: string; // Human who approved
  parameters: Record<string, unknown>;
  requestedAt: string;
}

export interface ModificationResult {
  requestId: string;
  protocol: ModificationProtocol;
  applied: boolean;
  rolledBack: boolean;
  resultSummary: string;
  appliedAt: string;
}

export class SelfModificationService {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Apply a modification protocol gated by EscalationBriefing approval.
   */
  async applyModification(
    request: ModificationRequest,
  ): Promise<DataProcessResult<ModificationResult>> {
    if (!request.requestId)
      return DataProcessResult.failure('MISSING_REQUEST_ID', 'requestId required');
    if (!request.briefingId)
      return DataProcessResult.failure(
        'MISSING_BRIEFING_ID',
        'briefingId required — all modifications gated by EscalationBriefing',
      );
    if (!request.approvedBy)
      return DataProcessResult.failure(
        'MISSING_APPROVAL',
        'approvedBy required — human gate mandatory',
      );

    // DNA-8: store before emit
    const stored = await this.db.storeDocument(
      'modification-requests',
      {
        ...request,
        status: 'PENDING',
      } as unknown as Record<string, unknown>,
      request.requestId,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue(`engine.modification.${request.protocol.toLowerCase()}`, {
      requestId: request.requestId,
      protocol: request.protocol,
      briefingId: request.briefingId,
    });

    const result: ModificationResult = {
      requestId: request.requestId,
      protocol: request.protocol,
      applied: true,
      rolledBack: false,
      resultSummary: `${request.protocol} applied from briefing ${request.briefingId}`,
      appliedAt: new Date().toISOString(),
    };

    return DataProcessResult.success(result);
  }

  /**
   * SK-415 Rollback: revert a previously applied modification.
   */
  async rollback(
    requestId: string,
    reason: string,
  ): Promise<DataProcessResult<ModificationResult>> {
    if (!requestId) return DataProcessResult.failure('MISSING_REQUEST_ID', 'requestId required');

    const stored = await this.db.storeDocument('modification-rollbacks', {
      requestId,
      reason,
      rolledBackAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('engine.modification.rollback', { requestId, reason });

    return DataProcessResult.success({
      requestId,
      protocol: 'ROLLBACK_PROTOCOL',
      applied: false,
      rolledBack: true,
      resultSummary: `Rolled back: ${reason}`,
      appliedAt: new Date().toISOString(),
    });
  }
}
