/**
 * StaticConflictDetector — T377 IMPACT_ANALYSIS service for FLOW-25.
 *
 * Applies the static CF rule set to a set of dependency nodes and detects
 * conflicts before any AI analysis (IR-377-1: static runs first).
 *
 * Iron rules (enforced — not configurable):
 *   IR-377-1:  Static detection MUST complete before T378 (AI semantic analysis)
 *   IR-377-2:  Static CRITICAL verdict overrides any AI result — not negotiable
 *   IR-377-3:  Every TRUE_CONFLICT MUST cite the specific CF rule it violates (CF-479)
 *   CF-479:    Every conflict record includes cf_rule field — never empty on TRUE_CONFLICT
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-1:     Rule definitions use Record<string,unknown> — no typed model
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import {
  DependencyNode,
  DependencySeverity,
  SEVERITY_ORDER,
} from './dependency-index-query.service';

// ── Conflict verdict ──────────────────────────────────────────────────────

export enum ConflictVerdict {
  NO_CONFLICT = 'NO_CONFLICT',
  POTENTIAL = 'POTENTIAL',
  TRUE_CONFLICT = 'TRUE_CONFLICT',
}

// ── Shapes ────────────────────────────────────────────────────────────────

export interface ConflictRecord {
  readonly nodeId: string;
  readonly entityId: string;
  readonly verdict: ConflictVerdict;
  /**
   * CF rule cited for this conflict (IR-377-3 / CF-479).
   * MUST be non-empty when verdict = TRUE_CONFLICT.
   */
  readonly cfRule: string;
  readonly severity: DependencySeverity;
  readonly reason: string;
  readonly overridesAi: boolean; // IR-377-2: true when static CRITICAL preempts AI
}

export interface StaticConflictReport {
  readonly changeType: string;
  readonly entityId: string;
  readonly conflicts: ConflictRecord[];
  /** Highest severity conflict found (NONE if no conflicts). */
  readonly maxSeverity: DependencySeverity;
  /** True if ANY static CRITICAL verdict was issued (IR-377-2 guard). */
  readonly hasStaticCritical: boolean;
  /** Total nodes evaluated. */
  readonly totalEvaluated: number;
}

// ── Built-in CF rules ─────────────────────────────────────────────────────

interface CfRule {
  cfRule: string;
  description: string;
  /** Conditions under which this rule fires — evaluated against a DependencyNode. */
  matches(node: DependencyNode, changeType: string): boolean;
  severity: DependencySeverity;
  verdict: ConflictVerdict;
}

/**
 * Static rule set — the 6 built-in CF rules for FLOW-25 conflict detection.
 * New rules can be added by extending this array; existing rules are MACHINE code.
 */
const STATIC_CF_RULES: CfRule[] = [
  {
    cfRule: 'CF-473',
    description:
      'Schema changes to entities with CRITICAL write-access dependants are always conflicts',
    matches(node, changeType) {
      return (
        changeType === 'SCHEMA_CHANGE' &&
        node.accessType === 'write' &&
        node.severity === DependencySeverity.CRITICAL
      );
    },
    severity: DependencySeverity.CRITICAL,
    verdict: ConflictVerdict.TRUE_CONFLICT,
  },
  {
    cfRule: 'CF-476',
    description: 'API breaks on cross-tenant shared entities require governance review',
    matches(node, changeType) {
      return changeType === 'API_BREAK' && node.entityClass === 'shared-entity';
    },
    severity: DependencySeverity.CRITICAL,
    verdict: ConflictVerdict.TRUE_CONFLICT,
  },
  {
    cfRule: 'CF-479',
    description: 'Flow modifications that touch write-access nodes are potential conflicts',
    matches(node, changeType) {
      return changeType === 'FLOW_MODIFICATION' && node.accessType === 'write';
    },
    severity: DependencySeverity.HIGH,
    verdict: ConflictVerdict.TRUE_CONFLICT,
  },
  {
    cfRule: 'CF-485',
    description: 'Dependency updates on CRITICAL severity nodes are always conflicts',
    matches(node, changeType) {
      return changeType === 'DEPENDENCY_UPDATE' && node.severity === DependencySeverity.CRITICAL;
    },
    severity: DependencySeverity.CRITICAL,
    verdict: ConflictVerdict.TRUE_CONFLICT,
  },
  {
    cfRule: 'CF-486',
    description: 'Any change to nodes with HIGH severity marks potential conflict',
    matches(node, _changeType) {
      return node.severity === DependencySeverity.HIGH;
    },
    severity: DependencySeverity.HIGH,
    verdict: ConflictVerdict.POTENTIAL,
  },
  {
    cfRule: 'CF-488',
    description: 'Schema changes to read-only dependants are low-risk potentials',
    matches(node, changeType) {
      return (
        changeType === 'SCHEMA_CHANGE' &&
        node.accessType === 'read' &&
        node.severity !== DependencySeverity.CRITICAL
      );
    },
    severity: DependencySeverity.LOW,
    verdict: ConflictVerdict.POTENTIAL,
  },
];

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class StaticConflictDetector extends MicroserviceBase {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T377',
        serviceName: 'StaticConflictDetector',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Evaluate all dependency nodes for static CF rule conflicts.
   *
   * IR-377-1: This service must complete before T378 (AI semantic analysis).
   * IR-377-2: A CRITICAL static verdict overrides any future AI result.
   * IR-377-3 / CF-479: Every TRUE_CONFLICT record cites the specific CF rule.
   */
  detectConflicts(
    changeType: string,
    entityId: string,
    nodes: DependencyNode[],
  ): DataProcessResult<StaticConflictReport> {
    if (!changeType || changeType.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_CHANGE_TYPE',
        'changeType is required for conflict detection',
      );
    }

    if (!entityId || entityId.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_ENTITY_ID',
        'entityId is required for conflict detection',
      );
    }

    const conflicts: ConflictRecord[] = [];

    for (const node of nodes) {
      // Try each static CF rule in order — first matching rule wins
      let matched = false;
      for (const rule of STATIC_CF_RULES) {
        if (rule.matches(node, changeType)) {
          // IR-377-3 / CF-479: TRUE_CONFLICT MUST cite the CF rule
          conflicts.push({
            nodeId: node.nodeId,
            entityId: node.entityId,
            verdict: rule.verdict,
            cfRule: rule.cfRule, // never empty — CF-479 enforced here
            severity: rule.severity,
            reason: rule.description,
            overridesAi:
              rule.verdict === ConflictVerdict.TRUE_CONFLICT &&
              rule.severity === DependencySeverity.CRITICAL,
          });
          matched = true;
          break;
        }
      }

      // Node with no matching rule — no conflict
      if (!matched) {
        conflicts.push({
          nodeId: node.nodeId,
          entityId: node.entityId,
          verdict: ConflictVerdict.NO_CONFLICT,
          cfRule: '', // no rule cited for non-conflicts (CF-479 only applies to TRUE_CONFLICT)
          severity: DependencySeverity.NONE,
          reason: 'No static CF rule matched this node',
          overridesAi: false,
        });
      }
    }

    const trueConflicts = conflicts.filter((c) => c.verdict === ConflictVerdict.TRUE_CONFLICT);
    const hasStaticCritical = trueConflicts.some((c) => c.severity === DependencySeverity.CRITICAL);
    const maxSeverity = this.computeMaxSeverity(conflicts);

    return DataProcessResult.success({
      changeType,
      entityId,
      conflicts,
      maxSeverity,
      hasStaticCritical,
      totalEvaluated: nodes.length,
    });
  }

  /**
   * Validate that a static conflict report complies with CF-479:
   * every TRUE_CONFLICT must have a non-empty cfRule citation.
   *
   * Returns failure if any TRUE_CONFLICT lacks a cfRule — used as a guard before
   * passing the report upstream (IR-377-3 enforcement).
   */
  validateCfCitations(report: StaticConflictReport): DataProcessResult<void> {
    const violations = report.conflicts.filter(
      (c) => c.verdict === ConflictVerdict.TRUE_CONFLICT && (!c.cfRule || c.cfRule.trim() === ''),
    );

    if (violations.length > 0) {
      const nodeIds = violations.map((v) => v.nodeId).join(', ');
      return DataProcessResult.failure(
        'CF_CITATION_MISSING',
        `CF-479 violation: TRUE_CONFLICT records must cite a CF rule. Missing on nodes: ${nodeIds}`,
      );
    }

    return DataProcessResult.success(undefined);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private computeMaxSeverity(conflicts: ConflictRecord[]): DependencySeverity {
    if (conflicts.length === 0) return DependencySeverity.NONE;
    return conflicts.reduce<DependencySeverity>((max, c) => {
      return SEVERITY_ORDER[c.severity] > SEVERITY_ORDER[max] ? c.severity : max;
    }, DependencySeverity.NONE);
  }
}
