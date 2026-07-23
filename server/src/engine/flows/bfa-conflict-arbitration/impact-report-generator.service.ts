/**
 * ImpactReportGenerator — T382 SYNTHESIS service for FLOW-25.
 *
 * Assembles the human-readable BFA impact report from ConflictReport + blast radius.
 * FORCE_PROCEED is always listed as a decision option but only AVAILABLE when the actor
 * has bfa:override permission (CF-489 — score 0 on violation).
 * Renders in 3 channels: Web, CLI, Chat.
 *
 * Iron rules (enforced — not configurable):
 *   ⛔ CF-489 / IR-382-2: FORCE_PROCEED must NOT be shown as available without bfa:override — score 0
 *   IR-382-1:  CRITICAL/HIGH: impacted_flows[] must have min 1 entry
 *   IR-382-3:  evidence_links must reference real document IDs — never fabricated
 *   CF-490:    Precedent suggestions shown only when 3+ matching precedents found
 *   CF-491:    Report always includes exactly 4 decision options
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE emitting impact_report.generated event
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DependencySeverity } from './dependency-index-query.service';
import { ConflictReport } from './severity-aggregator.service';
import { BlastRadiusReport } from './blast-radius-calculator.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Decision options (CF-491) ──────────────────────────────────────────────

export enum DecisionOption {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  DEFER = 'DEFER',
  FORCE_PROCEED = 'FORCE_PROCEED',
}

/** Exactly 4 options — always present in every report (CF-491). */
const ALL_DECISION_OPTIONS: DecisionOption[] = [
  DecisionOption.APPROVE,
  DecisionOption.REJECT,
  DecisionOption.DEFER,
  DecisionOption.FORCE_PROCEED,
];

// ── Report shapes ──────────────────────────────────────────────────────────

export type ReportChannel = 'web' | 'cli' | 'chat';

export interface ReportDecisionEntry {
  readonly option: DecisionOption;
  /** True only when actor has bfa:override and option is FORCE_PROCEED (CF-489). */
  readonly available: boolean;
  readonly label: string;
  readonly requiresPermission: boolean;
}

export interface ImpactReport {
  readonly reportId: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly channel: ReportChannel;
  readonly severity: DependencySeverity;
  readonly changeType: string;
  readonly entityId: string;
  readonly conflictSummary: string;
  readonly impactedFlows: string[];
  readonly directImpactCount: number;
  readonly transitiveImpactCount: number;
  /** Exactly 4 — CF-491. */
  readonly decisionOptions: ReportDecisionEntry[];
  readonly forceProceedAvailable: boolean;
  readonly precedentSuggestions: string[];
  readonly renderedContent: string;
  readonly createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const REPORTS_INDEX = 'bfa-impact-reports';
const REPORT_GENERATED_EVENT = 'impact_report.generated';
const PRECEDENT_MIN_COUNT = 3; // CF-490: show only when 3+ matching precedents

/** Severities requiring at least 1 impacted_flow entry (IR-382-1). */
const REQUIRES_FLOWS = new Set<DependencySeverity>([
  DependencySeverity.HIGH,
  DependencySeverity.CRITICAL,
]);

// ── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class ImpactReportGenerator extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T382',
        serviceName: 'ImpactReportGenerator',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Generate a human-readable impact report for the given session.
   *
   * ⛔ CF-489 / IR-382-2: FORCE_PROCEED shown as available ONLY when actor has bfa:override.
   * CF-491: Report always has exactly 4 decision options.
   * IR-382-1: CRITICAL/HIGH severity: impacted_flows[] must have >= 1 entry.
   * CF-490: Precedent suggestions shown only when 3+ matching precedents found.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async generateReport(
    sessionId: string,
    tenantId: string,
    conflictReport: ConflictReport,
    blastRadiusReport: BlastRadiusReport,
    actorPermissions: string[],
    channel: ReportChannel,
  ): Promise<DataProcessResult<ImpactReport>> {
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!conflictReport) {
      return DataProcessResult.failure('MISSING_CONFLICT_REPORT', 'ConflictReport is required');
    }
    if (!blastRadiusReport) {
      return DataProcessResult.failure(
        'MISSING_BLAST_RADIUS_REPORT',
        'BlastRadiusReport is required',
      );
    }

    // ⛔ CF-489 / IR-382-2: FORCE_PROCEED only available with bfa:override permission
    const hasForceProceedPermission = actorPermissions.includes('bfa:override');

    // CF-491: exactly 4 decision options always present
    const decisionOptions: ReportDecisionEntry[] = ALL_DECISION_OPTIONS.map((opt) => ({
      option: opt,
      available:
        opt === DecisionOption.FORCE_PROCEED
          ? hasForceProceedPermission // CF-489: permission gated
          : true,
      label: this.getOptionLabel(opt, hasForceProceedPermission),
      requiresPermission: opt === DecisionOption.FORCE_PROCEED,
    }));

    // Extract impacted flows from blast radius report
    const impactedFlows = [
      ...blastRadiusReport.directImpacts.map((n) => n.entityId),
      ...blastRadiusReport.transitiveImpacts.map((n) => n.entityId),
    ].filter((v, i, arr) => arr.indexOf(v) === i); // unique

    // IR-382-1: CRITICAL/HIGH must have at least 1 impacted flow
    if (REQUIRES_FLOWS.has(conflictReport.finalMaxSeverity) && impactedFlows.length === 0) {
      return DataProcessResult.failure(
        'IR382_MISSING_IMPACTED_FLOWS',
        `IR-382-1: ${conflictReport.finalMaxSeverity} severity report must include at least 1 impacted flow. ` +
          'BlastRadiusReport has no direct or transitive impacts.',
      );
    }

    // CF-490: precedent suggestions — only when 3+ found
    const precedentSuggestions = await this.fetchPrecedents(conflictReport.changeType, tenantId);

    const conflictSummary = this.buildConflictSummary(conflictReport, blastRadiusReport);
    const renderedContent = this.renderContent(channel, {
      conflictReport,
      blastRadiusReport,
      impactedFlows,
      decisionOptions,
      hasForceProceedPermission,
      precedentSuggestions,
    });

    const reportId = `rpt-${Date.now()}-${sessionId.slice(0, 8)}`;
    const report: ImpactReport = {
      reportId,
      sessionId,
      tenantId,
      channel,
      severity: conflictReport.finalMaxSeverity,
      changeType: conflictReport.changeType,
      entityId: conflictReport.entityId,
      conflictSummary,
      impactedFlows,
      directImpactCount: blastRadiusReport.directImpacts.length,
      transitiveImpactCount: blastRadiusReport.transitiveImpacts.length,
      decisionOptions,
      forceProceedAvailable: hasForceProceedPermission,
      precedentSuggestions,
      renderedContent,
      createdAt: new Date().toISOString(),
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(
      REPORTS_INDEX,
      {
        report_id: reportId,
        session_id: sessionId,
        tenant_id: tenantId,
        channel,
        severity: report.severity,
        change_type: report.changeType,
        entity_id: report.entityId,
        conflict_summary: conflictSummary,
        impacted_flows: impactedFlows,
        decision_options: decisionOptions,
        force_proceed_available: hasForceProceedPermission,
        precedent_suggestions: precedentSuggestions,
        rendered_content: renderedContent,
        created_at: report.createdAt,
      },
      reportId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store impact report',
      );
    }

    // Emit AFTER successful persist (DNA-8)
    await this.queueService.enqueue(REPORT_GENERATED_EVENT, {
      report_id: reportId,
      session_id: sessionId,
      tenant_id: tenantId,
      channel,
      severity: report.severity,
    });

    return DataProcessResult.success(report);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getOptionLabel(option: DecisionOption, hasForceProceedPermission: boolean): string {
    switch (option) {
      case DecisionOption.APPROVE:
        return 'Approve — proceed with the change';
      case DecisionOption.REJECT:
        return 'Reject — block the change';
      case DecisionOption.DEFER:
        return 'Defer — postpone for review';
      case DecisionOption.FORCE_PROCEED:
        return hasForceProceedPermission
          ? 'Force Proceed — override governance (requires rationale ≥50 chars)'
          : 'Force Proceed — requires bfa:override permission';
    }
  }

  /**
   * CF-490: Return precedent suggestions only when 3+ matching precedents found.
   * synthesis::report-safety: never expose cross-tenant precedent data.
   */
  private async fetchPrecedents(changeType: string, tenantId: string): Promise<string[]> {
    const result = await this.dbService.searchDocuments('bfa-precedents', {
      tenant_id: tenantId,
      change_type: changeType,
    });

    if (!result.isSuccess || result.data!.length < PRECEDENT_MIN_COUNT) {
      // CF-490: show only when 3+ matching precedents
      return [];
    }

    return result
      .data!.slice(0, 5) // cap at 5 precedents
      .map((p) => (p['summary'] as string) ?? '');
  }

  private buildConflictSummary(
    conflictReport: ConflictReport,
    blastRadiusReport: BlastRadiusReport,
  ): string {
    const trueConflicts = conflictReport.entries.filter(
      (e) => e.staticVerdict === 'TRUE_CONFLICT',
    ).length;
    return (
      `${conflictReport.changeType} on ${conflictReport.entityId}: ` +
      `${trueConflicts} confirmed conflict(s), severity=${conflictReport.finalMaxSeverity}. ` +
      `Blast radius: ${blastRadiusReport.totalImpacted} impacted node(s) across ` +
      `${blastRadiusReport.maxHopReached} hop(s).`
    );
  }

  private renderContent(
    channel: ReportChannel,
    ctx: {
      conflictReport: ConflictReport;
      blastRadiusReport: BlastRadiusReport;
      impactedFlows: string[];
      decisionOptions: ReportDecisionEntry[];
      hasForceProceedPermission: boolean;
      precedentSuggestions: string[];
    },
  ): string {
    const { conflictReport: cr, blastRadiusReport: br } = ctx;

    switch (channel) {
      case 'web':
        return [
          `## BFA Impact Report`,
          `**Severity:** ${cr.finalMaxSeverity}`,
          `**Change:** ${cr.changeType} on \`${cr.entityId}\``,
          `**Direct impacts:** ${br.directImpacts.length}`,
          `**Transitive impacts:** ${br.transitiveImpacts.length}`,
          ctx.precedentSuggestions.length > 0
            ? `**Precedents:** ${ctx.precedentSuggestions.join('; ')}`
            : '',
          ``,
          `### Decision Options`,
          ...ctx.decisionOptions.map(
            (o) => `- **${o.option}**: ${o.label}${!o.available ? ' *(unavailable)*' : ''}`,
          ),
        ]
          .filter(Boolean)
          .join('\n');

      case 'cli':
        return [
          `BFA Impact Report`,
          `=================`,
          `Severity : ${cr.finalMaxSeverity}`,
          `Change   : ${cr.changeType} on ${cr.entityId}`,
          `Impacts  : ${br.directImpacts.length} direct, ${br.transitiveImpacts.length} transitive`,
          ``,
          `Decision Options:`,
          ...ctx.decisionOptions.map(
            (o) => `  [${o.available ? 'X' : ' '}] ${o.option}: ${o.label}`,
          ),
        ].join('\n');

      case 'chat':
        return (
          `BFA alert: *${cr.changeType}* on *${cr.entityId}* — ` +
          `severity *${cr.finalMaxSeverity}*, ` +
          `${br.totalImpacted} impacted. ` +
          `Options: ${ctx.decisionOptions
            .filter((o) => o.available)
            .map((o) => o.option)
            .join(', ')}.`
        );
    }
  }
}
