/**
 * DesignDecisionLogger — T504 [GOVERNANCE].
 *
 * INSERT-ONLY log of design decisions: rationale, trade-offs, rejected alternatives,
 * stakeholder approvals. Immutable audit trail.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface DesignDecisionLogResult {
  decisionId: string;
  specId: string;
  loggedAt: string;
}

export class DesignDecisionLogger {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async log(
    tenantId: string,
    specId: string,
    decision: {
      rationale: string;
      tradeOffs?: string[];
      rejectedAlternatives?: string[];
      approvedBy?: string;
    },
  ): Promise<DataProcessResult<DesignDecisionLogResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!decision.rationale)
      return DataProcessResult.failure('MISSING_RATIONALE', 'rationale is required');

    const decisionId = randomUUID();
    const loggedAt = new Date().toISOString();
    const doc: Record<string, unknown> = { decisionId, tenantId, specId, ...decision, loggedAt };

    const stored = await this.db.storeDocument('flow31-design-decisions', doc, decisionId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.decision.logged', { decisionId, tenantId, specId, loggedAt });

    return DataProcessResult.success({ decisionId, specId, loggedAt });
  }
}
