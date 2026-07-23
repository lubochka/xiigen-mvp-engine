/**
 * ApprovalGateEnforcer — T420 [GUARD].
 *
 * Hard stop until human approval received. Checks whether a gate
 * (identified by requestId) has an APPROVED decision. No bypass path.
 *
 * DNA-8: storeDocument() BEFORE enqueue() (only on gate-passed path).
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

export interface GateCheckResult {
  passed: boolean;
  requestId: string;
  blockedReason?: string;
}

export class ApprovalGateEnforcer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async checkGate(
    tenantId: string,
    requestId: string,
  ): Promise<DataProcessResult<GateCheckResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!requestId) return DataProcessResult.failure('MISSING_REQUEST_ID', 'requestId is required');

    // Check for APPROVED decision — hard stop if not found
    const decisionResult = await this.db.searchDocuments('flow27-approval-decisions', {
      tenant_id: tenantId,
      request_id: requestId,
      decision: 'APPROVED',
    });

    const approved =
      decisionResult.isSuccess && decisionResult.data && decisionResult.data.length > 0;

    if (!approved) {
      return DataProcessResult.failure(
        'GATE_BLOCKED',
        `Gate for requestId ${requestId} is not yet approved`,
      );
    }

    // Gate passed — store audit record, then emit event (DNA-8)
    const passedAt = new Date().toISOString();
    const gatePassId = `gp-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const doc: Record<string, unknown> = {
      gate_pass_id: gatePassId,
      tenant_id: tenantId,
      request_id: requestId,
      passed_at: passedAt,
    };

    const storeResult = await this.db.storeDocument('flow27-gate-passes', doc, gatePassId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('gate.passed', {
      gatePassId,
      tenantId,
      requestId,
      passedAt,
    });

    return DataProcessResult.success({
      passed: true,
      requestId,
    });
  }
}
