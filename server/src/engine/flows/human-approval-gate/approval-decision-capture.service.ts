/**
 * ApprovalDecisionCapture — T414 [ARBITRATION].
 *
 * Idempotent SETNX-style capture of approve/reject decisions.
 * A second call for the same requestId returns the existing decision
 * without re-storing (duplicate = true).
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export interface DecisionCaptureResult {
  decisionId: string;
  requestId: string;
  decision: ApprovalDecision;
  decidedAt: string;
  duplicate: boolean;
}

export class ApprovalDecisionCapture {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async captureDecision(
    tenantId: string,
    requestId: string,
    decision: ApprovalDecision,
    decidedBy: string,
    reason: string = '',
  ): Promise<DataProcessResult<DecisionCaptureResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!requestId) return DataProcessResult.failure('MISSING_REQUEST_ID', 'requestId is required');
    if (!decision) return DataProcessResult.failure('MISSING_DECISION', 'decision is required');
    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return DataProcessResult.failure('INVALID_DECISION', 'decision must be APPROVED or REJECTED');
    }
    if (!decidedBy) return DataProcessResult.failure('MISSING_DECIDED_BY', 'decidedBy is required');

    // SETNX idempotency — check for existing decision
    const existingResult = await this.db.searchDocuments('flow27-approval-decisions', {
      tenant_id: tenantId,
      request_id: requestId,
    });
    if (existingResult.isSuccess && existingResult.data && existingResult.data.length > 0) {
      const existing = existingResult.data[0];
      return DataProcessResult.success({
        decisionId: existing['decision_id'] as string,
        requestId,
        decision: existing['decision'] as ApprovalDecision,
        decidedAt: existing['decided_at'] as string,
        duplicate: true,
      });
    }

    const decisionId = `ad-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const decidedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      decision_id: decisionId,
      tenant_id: tenantId,
      request_id: requestId,
      decision,
      decided_by: decidedBy,
      reason,
      decided_at: decidedAt,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-approval-decisions', doc, decisionId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('approval.decision.captured', {
      decisionId,
      tenantId,
      requestId,
      decision,
      decidedAt,
    });

    return DataProcessResult.success({
      decisionId,
      requestId,
      decision,
      decidedAt,
      duplicate: false,
    });
  }
}
