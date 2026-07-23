/**
 * FlowDeploymentGate — T407 [GUARD].
 *
 * Final deployment gate before a flow goes live.
 * Checks that all prerequisite phases are complete and quality score is sufficient.
 * Hard stop on FLOW_DEPLOYMENT_BLOCKED — no bypass.
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

export interface DeploymentGateResult {
  gateId: string;
  flowId: string;
  approved: boolean;
  approvedAt: string;
}

const REQUIRED_PHASES = [
  'code_assembled',
  'dna_checked',
  'bfa_scanned',
  'quality_passed',
  'syntax_validated',
  'impact_analyzed',
  'registered',
];

export class FlowDeploymentGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async approve(
    tenantId: string,
    flowId: string,
    completedPhases: string[],
  ): Promise<DataProcessResult<DeploymentGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Check all required phases are complete
    const missingPhases = REQUIRED_PHASES.filter((p) => !completedPhases.includes(p));
    if (missingPhases.length > 0) {
      return DataProcessResult.failure(
        'FLOW_DEPLOYMENT_BLOCKED',
        `Missing required phases: ${missingPhases.join(', ')}`,
      );
    }

    const gateId = randomUUID();
    const approvedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      gateId,
      tenantId,
      flowId,
      approved: true,
      completedPhases,
      approvedAt,
    };

    const stored = await this.db.storeDocument('flow26-deployment-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.deployment.approved', { gateId, tenantId, flowId, approvedAt });

    return DataProcessResult.success({ gateId, flowId, approved: true, approvedAt });
  }
}
