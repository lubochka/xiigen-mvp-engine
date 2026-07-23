/**
 * SeverityAggregator — T379 IMPACT_ANALYSIS service for FLOW-25.
 *
 * Merges static (T377) and AI advisory (T378) results into a final ConflictReport.
 * Static CRITICAL always wins — AI is advisory only.
 * DNA-8: ConflictReport stored BEFORE conflict.severity.resolved event emitted.
 *
 * Iron rules (enforced — not configurable):
 *   IR-379-1:  ConflictReport stored BEFORE severity event emitted (DNA-8)
 *   IR-379-2:  Static CRITICAL always overrides AI advisory — no exceptions
 *   IR-379-3:  Severity thresholds from FREEDOM config — never hardcoded
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE enqueue() on every path
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DependencySeverity, SEVERITY_ORDER } from './dependency-index-query.service';
import { StaticConflictReport, ConflictVerdict } from './static-conflict-detector.service';
import { SemanticAnalysisResult } from './semantic-impact-analyzer.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ────────────────────────────────────────────────────────────────

export interface ConflictReportEntry {
  readonly nodeId: string;
  readonly entityId: string;
  readonly finalSeverity: DependencySeverity;
  readonly staticVerdict: ConflictVerdict;
  readonly staticCfRule: string;
  readonly aiAdvisorySeverity: DependencySeverity;
  readonly staticOverrodeAi: boolean;
  readonly reasoning: string;
}

export interface ConflictReport {
  readonly reportId: string;
  readonly changeType: string;
  readonly entityId: string;
  readonly entries: ConflictReportEntry[];
  /** Final authoritative max severity across all entries. */
  readonly finalMaxSeverity: DependencySeverity;
  /** True if any static CRITICAL caused override of AI (IR-379-2). */
  readonly staticOverrideApplied: boolean;
  readonly createdAt: string;
  readonly status: 'pending_arbitration';
}

// ── Constants ─────────────────────────────────────────────────────────────

const CONFLICT_REPORTS_INDEX = 'bfa-conflict-reports';
const SEVERITY_RESOLVED_EVENT = 'conflict.severity.resolved';

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class SeverityAggregator extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T379',
        serviceName: 'SeverityAggregator',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Merge static conflict report (T377) with AI advisory result (T378).
   *
   * IR-379-1 / DNA-8: storeDocument() BEFORE enqueue().
   * IR-379-2: Static CRITICAL always overrides AI advisory.
   * IR-379-3: Caller provides severityThresholds from FREEDOM config.
   */
  async aggregateSeverity(
    staticReport: StaticConflictReport,
    aiResult: SemanticAnalysisResult,
    severityThresholds: Record<string, unknown>,
  ): Promise<DataProcessResult<ConflictReport>> {
    if (!staticReport) {
      return DataProcessResult.failure(
        'MISSING_STATIC_REPORT',
        'StaticConflictReport (T377) is required',
      );
    }

    if (!aiResult) {
      return DataProcessResult.failure(
        'MISSING_AI_RESULT',
        'SemanticAnalysisResult (T378) is required',
      );
    }

    const entries: ConflictReportEntry[] = this.mergeEntries(staticReport, aiResult);
    const finalMaxSeverity = this.computeMaxSeverity(entries.map((e) => e.finalSeverity));
    const staticOverrideApplied = entries.some((e) => e.staticOverrodeAi);

    const reportId = `cr-${Date.now()}-${staticReport.entityId.slice(0, 8)}`;
    const report: ConflictReport = {
      reportId,
      changeType: staticReport.changeType,
      entityId: staticReport.entityId,
      entries,
      finalMaxSeverity,
      staticOverrideApplied,
      createdAt: new Date().toISOString(),
      status: 'pending_arbitration',
    };

    // ✅ IR-379-1 / DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(
      CONFLICT_REPORTS_INDEX,
      {
        report_id: report.reportId,
        change_type: report.changeType,
        entity_id: report.entityId,
        entries: report.entries,
        final_max_severity: report.finalMaxSeverity,
        static_override_applied: report.staticOverrideApplied,
        created_at: report.createdAt,
        status: report.status,
        severity_thresholds: severityThresholds,
      },
      reportId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store ConflictReport',
      );
    }

    // Only emit AFTER successful persist (DNA-8)
    await this.queueService.enqueue(SEVERITY_RESOLVED_EVENT, {
      report_id: reportId,
      change_type: report.changeType,
      entity_id: report.entityId,
      final_max_severity: report.finalMaxSeverity,
      static_override: staticOverrideApplied,
    });

    return DataProcessResult.success(report);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private mergeEntries(
    staticReport: StaticConflictReport,
    aiResult: SemanticAnalysisResult,
  ): ConflictReportEntry[] {
    // Build lookup: nodeId → AI advisory result
    const aiByNode = new Map(aiResult.nodeResults.map((r) => [r.nodeId, r]));

    return staticReport.conflicts.map((staticConflict) => {
      const aiNode = aiByNode.get(staticConflict.nodeId);
      const aiSeverity = aiNode?.severity ?? DependencySeverity.NONE;
      const isStaticCritical =
        staticConflict.verdict === ConflictVerdict.TRUE_CONFLICT &&
        staticConflict.severity === DependencySeverity.CRITICAL;

      // IR-379-2: Static CRITICAL always overrides AI — no exceptions
      let finalSeverity: DependencySeverity;
      let staticOverrodeAi = false;

      if (isStaticCritical) {
        // Static CRITICAL wins unconditionally
        finalSeverity = DependencySeverity.CRITICAL;
        staticOverrodeAi = SEVERITY_ORDER[aiSeverity] < SEVERITY_ORDER[DependencySeverity.CRITICAL];
      } else if (staticConflict.verdict === ConflictVerdict.TRUE_CONFLICT) {
        // Static TRUE_CONFLICT: take the higher of static or AI
        finalSeverity =
          SEVERITY_ORDER[staticConflict.severity] >= SEVERITY_ORDER[aiSeverity]
            ? staticConflict.severity
            : aiSeverity;
      } else if (staticConflict.verdict === ConflictVerdict.POTENTIAL) {
        // Potential: use AI advisory if AI is higher, else static
        finalSeverity =
          SEVERITY_ORDER[aiSeverity] > SEVERITY_ORDER[staticConflict.severity]
            ? aiSeverity
            : staticConflict.severity;
      } else {
        // NO_CONFLICT from static: trust AI advisory
        finalSeverity = aiSeverity;
      }

      return {
        nodeId: staticConflict.nodeId,
        entityId: staticConflict.entityId,
        finalSeverity,
        staticVerdict: staticConflict.verdict,
        staticCfRule: staticConflict.cfRule,
        aiAdvisorySeverity: aiSeverity,
        staticOverrodeAi,
        reasoning: aiNode?.reasoning ?? staticConflict.reason,
      };
    });
  }

  private computeMaxSeverity(severities: DependencySeverity[]): DependencySeverity {
    return severities.reduce<DependencySeverity>(
      (max, s) => (SEVERITY_ORDER[s] > SEVERITY_ORDER[max] ? s : max),
      DependencySeverity.NONE,
    );
  }
}
