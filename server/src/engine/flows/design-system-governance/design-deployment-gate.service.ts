/**
 * DesignDeploymentGate — T514 [GUARD].
 *
 * Final gate before design system goes live. Validates all required phases
 * are complete. DESIGN_DEPLOYMENT_BLOCKED — no bypass.
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

export interface DesignDeploymentGateResult {
  gateId: string;
  specId: string;
  approved: boolean;
  approvedAt: string;
}

const REQUIRED_PHASES = [
  'ingested',
  'analyzed',
  'quality_passed',
  'schema_valid',
  'tokens_consistent',
  'published',
] as const;

export class DesignDeploymentGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async evaluate(
    tenantId: string,
    specId: string,
    completedPhases: string[],
  ): Promise<DataProcessResult<DesignDeploymentGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    const missing = REQUIRED_PHASES.filter((p) => !completedPhases.includes(p));
    if (missing.length > 0) {
      return DataProcessResult.failure(
        'DESIGN_DEPLOYMENT_BLOCKED',
        `Missing required phases: ${missing.join(', ')}`,
      );
    }

    const gateId = randomUUID();
    const approvedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      gateId,
      tenantId,
      specId,
      approved: true,
      completedPhases,
      approvedAt,
    };

    const stored = await this.db.storeDocument('flow31-deployment-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.deployment.approved', {
      gateId,
      tenantId,
      specId,
      approvedAt,
    });

    return DataProcessResult.success({ gateId, specId, approved: true, approvedAt });
  }
}
