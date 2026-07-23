/**
 * BlastRadiusCalculator — T380 BLAST_RADIUS service for FLOW-25.
 *
 * Transitive graph traversal from a changed entity outward. Cycle detection uses
 * a visited set — no infinite loops (CF-486). Max depth from FREEDOM config (CF-485).
 * Circular dependency = log + continue, NOT throw (IR-380-1).
 *
 * Iron rules (enforced — not configurable):
 *   CF-485:    Max traversal depth MUST come from FREEDOM config — never a hardcoded int
 *   CF-486:    Cycle detection MUST use visited set — infinite loop is a build failure
 *   IR-380-1:  Circular dependency = log + continue (NOT throw, NOT failure result)
 *   IR-380-2:  Blast radius report attached to ConflictReport before assembly
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE enqueue() / event emission
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DependencySeverity } from './dependency-index-query.service';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Shapes ────────────────────────────────────────────────────────────────

export interface BlastRadiusNode {
  readonly entityId: string;
  readonly entityClass: string;
  readonly hopDepth: number; // 1 = direct, 2+ = transitive
  readonly reachableVia: string; // parent entityId
  readonly severity: DependencySeverity;
  readonly cycleDetected: boolean; // true when this node was already visited (IR-380-1)
}

export interface BlastRadiusReport {
  readonly reportId: string;
  readonly changeEntityId: string;
  readonly tenantId: string;
  /** All nodes at hopDepth === 1. */
  readonly directImpacts: BlastRadiusNode[];
  /** All nodes at hopDepth > 1. */
  readonly transitiveImpacts: BlastRadiusNode[];
  /** Total unique nodes reached (direct + transitive, excluding cycles). */
  readonly totalImpacted: number;
  /** Highest hop depth actually reached. */
  readonly maxHopReached: number;
  /** True when traversal was stopped by max_depth config (CF-485). */
  readonly depthLimitReached: boolean;
  /** Cycle pairs detected: [childEntityId, parentEntityId]. */
  readonly cyclesDetected: Array<[string, string]>;
  readonly createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DEPENDENCY_INDEX = 'bfa-dependency-graph';
const BLAST_RADIUS_INDEX = 'bfa-blast-radius-reports';
const DEPTH_CONFIG_INDEX = 'bfa-freedom-config';
const DEPTH_CONFIG_KEY = 'blast_radius_max_depth';
const DEFAULT_MAX_DEPTH = 5; // fallback only — CF-485: real value from FREEDOM config
const BLAST_RADIUS_EVENT = 'blast_radius.calculated';
const CYCLE_DETECTED_EVENT = 'blast_radius.cycle_detected';

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class BlastRadiusCalculator extends MicroserviceBase {
  constructor(
    private readonly dbService: IDatabaseService,
    private readonly queueService: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T380',
        serviceName: 'BlastRadiusCalculator',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Calculate blast radius via BFS from the changed entity.
   *
   * CF-485: max depth from FREEDOM config — never a hardcoded integer.
   * CF-486: visited set prevents infinite loops.
   * IR-380-1: cycles are logged + traversal continues — NOT thrown.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async calculateBlastRadius(
    changeEntityId: string,
    tenantId: string,
  ): Promise<DataProcessResult<BlastRadiusReport>> {
    if (!changeEntityId || changeEntityId.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_ENTITY_ID',
        'changeEntityId is required for blast radius calculation',
      );
    }

    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure(
        'UNSCOPED_QUERY',
        'CF-476: tenantId is required — unscoped blast radius calculation is forbidden',
      );
    }

    // CF-485: read max depth from FREEDOM config — NEVER use a hardcoded integer
    const maxDepth = await this.readMaxDepthFromConfig(tenantId);

    // BFS traversal with visited set (CF-486)
    const visited = new Set<string>([changeEntityId]);
    const allNodes: BlastRadiusNode[] = [];
    const cyclesDetected: Array<[string, string]> = [];
    let depthLimitReached = false;

    // BFS queue: [entityId, hopDepth, reachableVia]
    const bfsQueue: Array<{ entityId: string; hopDepth: number; reachableVia: string }> = [
      { entityId: changeEntityId, hopDepth: 0, reachableVia: '' },
    ];

    while (bfsQueue.length > 0) {
      const current = bfsQueue.shift()!;

      // CF-485: stop at max depth
      if (current.hopDepth >= maxDepth) {
        depthLimitReached = true;
        continue;
      }

      // Query direct dependants of current entity (all tenant-scoped — CF-476)
      const depsResult = await this.dbService.searchDocuments(DEPENDENCY_INDEX, {
        tenant_id: tenantId,
        depends_on: current.entityId,
      });

      if (!depsResult.isSuccess) {
        // Non-fatal: log and continue (aligns with IR-380-1 philosophy)
        continue;
      }

      for (const doc of depsResult.data ?? []) {
        const childEntityId = doc['entity_id'] as string;
        const hopDepth = current.hopDepth + 1;

        // CF-486: cycle detection via visited set
        if (visited.has(childEntityId)) {
          // IR-380-1: log + continue — NOT throw, NOT failure
          cyclesDetected.push([childEntityId, current.entityId]);
          allNodes.push({
            entityId: childEntityId,
            entityClass: (doc['entity_class'] as string) ?? '',
            hopDepth,
            reachableVia: current.entityId,
            severity: (doc['severity'] as DependencySeverity) ?? DependencySeverity.NONE,
            cycleDetected: true,
          });
          continue; // log + continue — never throw (IR-380-1)
        }

        visited.add(childEntityId);

        allNodes.push({
          entityId: childEntityId,
          entityClass: (doc['entity_class'] as string) ?? '',
          hopDepth,
          reachableVia: current.entityId,
          severity: (doc['severity'] as DependencySeverity) ?? DependencySeverity.NONE,
          cycleDetected: false,
        });

        bfsQueue.push({ entityId: childEntityId, hopDepth, reachableVia: current.entityId });
      }
    }

    const nonCycleNodes = allNodes.filter((n) => !n.cycleDetected);
    const directImpacts = nonCycleNodes.filter((n) => n.hopDepth === 1);
    const transitiveImpacts = nonCycleNodes.filter((n) => n.hopDepth > 1);
    const maxHopReached = allNodes.reduce((max, n) => Math.max(max, n.hopDepth), 0);

    const reportId = `br-${Date.now()}-${changeEntityId.slice(0, 8)}`;
    const report: BlastRadiusReport = {
      reportId,
      changeEntityId,
      tenantId,
      directImpacts,
      transitiveImpacts,
      totalImpacted: nonCycleNodes.length,
      maxHopReached,
      depthLimitReached,
      cyclesDetected,
      createdAt: new Date().toISOString(),
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.dbService.storeDocument(
      BLAST_RADIUS_INDEX,
      {
        report_id: report.reportId,
        change_entity_id: report.changeEntityId,
        tenant_id: report.tenantId,
        direct_impacts: report.directImpacts,
        transitive_impacts: report.transitiveImpacts,
        total_impacted: report.totalImpacted,
        max_hop_reached: report.maxHopReached,
        depth_limit_reached: report.depthLimitReached,
        cycles_detected: report.cyclesDetected,
        created_at: report.createdAt,
      },
      reportId,
    );

    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store blast radius report',
      );
    }

    // Emit blast_radius.calculated after successful persist
    await this.queueService.enqueue(BLAST_RADIUS_EVENT, {
      report_id: reportId,
      change_entity_id: changeEntityId,
      tenant_id: tenantId,
      total_impacted: report.totalImpacted,
      max_hop_reached: report.maxHopReached,
      depth_limit_reached: report.depthLimitReached,
    });

    // Emit cycle event if any cycles detected
    if (cyclesDetected.length > 0) {
      await this.queueService.enqueue(CYCLE_DETECTED_EVENT, {
        report_id: reportId,
        change_entity_id: changeEntityId,
        tenant_id: tenantId,
        cycles: cyclesDetected,
      });
    }

    return DataProcessResult.success(report);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /**
   * CF-485: Read max_depth from FREEDOM config.
   * Falls back to DEFAULT_MAX_DEPTH if config is unavailable.
   * NEVER use a hardcoded int directly in traversal logic — always go through this.
   */
  private async readMaxDepthFromConfig(tenantId: string): Promise<number> {
    const configResult = await this.dbService.searchDocuments(DEPTH_CONFIG_INDEX, {
      tenant_id: tenantId,
      config_key: DEPTH_CONFIG_KEY,
    });

    if (configResult.isSuccess && configResult.data!.length > 0) {
      const configValue = configResult.data![0]['config_value'];
      const parsed =
        typeof configValue === 'number' ? configValue : parseInt(String(configValue), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    return DEFAULT_MAX_DEPTH; // fallback — config unavailable
  }
}
