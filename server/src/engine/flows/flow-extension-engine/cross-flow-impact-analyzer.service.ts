/**
 * CrossFlowImpactAnalyzer — T402 [IMPACT_ANALYSIS].
 *
 * Analyzes the impact of a new flow on all existing flows.
 * Produces impact score (0.0–1.0) and severity classification.
 * Reads existing flows from flow26-registrations index.
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
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export type ImpactSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ImpactAnalysisResult {
  analysisId: string;
  flowId: string;
  impactScore: number;
  severity: ImpactSeverity;
  affectedFlows: string[];
  analyzedAt: string;
}

function scoreSeverity(score: number): ImpactSeverity {
  if (score === 0) return 'NONE';
  if (score < 0.2) return 'LOW';
  if (score < 0.5) return 'MEDIUM';
  if (score < 0.8) return 'HIGH';
  return 'CRITICAL';
}

export class CrossFlowImpactAnalyzer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async analyze(
    tenantId: string,
    flowId: string,
    taskTypes: string[],
    events: string[],
  ): Promise<DataProcessResult<ImpactAnalysisResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Load all existing flow registrations
    const regResult = await this.db.searchDocuments('flow26-registrations', { tenantId });
    if (!regResult.isSuccess)
      return DataProcessResult.failure(regResult.errorCode!, regResult.errorMessage!);

    const existingFlows = regResult.data!.filter((r) => r['flowId'] !== flowId);
    const affectedFlows: string[] = [];
    let totalOverlap = 0;
    let totalChecks = 0;

    for (const flow of existingFlows) {
      const flowTaskTypes = (flow['taskTypes'] as string[]) ?? [];
      const flowEvents = (flow['events'] as string[]) ?? [];
      const flowId2 = flow['flowId'] as string;

      let overlap = 0;
      for (const tt of taskTypes) {
        if (flowTaskTypes.includes(tt)) overlap++;
      }
      for (const ev of events) {
        if (flowEvents.includes(ev)) overlap++;
      }

      const checks = taskTypes.length + events.length;
      totalChecks += checks;
      totalOverlap += overlap;

      if (overlap > 0) {
        affectedFlows.push(flowId2);
      }
    }

    const impactScore = totalChecks > 0 ? Math.min(totalOverlap / totalChecks, 1.0) : 0;
    const severity = scoreSeverity(impactScore);

    const analysisId = randomUUID();
    const analyzedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      analysisId,
      tenantId,
      flowId,
      impactScore,
      severity,
      affectedFlows,
      analyzedFlowCount: existingFlows.length,
      analyzedAt,
    };

    const stored = await this.db.storeDocument('flow26-impact-analyses', doc, analysisId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.impact.analyzed', {
      analysisId,
      tenantId,
      flowId,
      severity,
      analyzedAt,
    });

    return DataProcessResult.success({
      analysisId,
      flowId,
      impactScore,
      severity,
      affectedFlows,
      analyzedAt,
    });
  }
}
