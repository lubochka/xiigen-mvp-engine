/**
 * DependencyIndexQuery — T376 IMPACT_ANALYSIS service for FLOW-25.
 *
 * Queries the BFA dependency graph to find all nodes affected by a given
 * entity change. Every query is tenant-scoped (CF-476).
 *
 * Iron rules (enforced — not configurable):
 *   CF-476:    EVERY query includes tenant scope — unscoped queries are rejected
 *   IR-376-1:  BuildSearchFilter skips null/empty entity_class and access_type
 *   IR-376-2:  Empty result = NONE severity — not an error
 *   IR-376-3:  Unscoped query (missing tenantId in context) → DataProcessResult.failure
 *   DNA-2:     All queries via BuildSearchFilter — no hardcoded query fields
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

// ── Dependency severity levels ────────────────────────────────────────────

export enum DependencySeverity {
  NONE = 'NONE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ── Input / Output shapes ─────────────────────────────────────────────────

export interface DependencyQueryInput {
  /** The entity being changed (e.g. 'OrderSchema', 'payment-service'). */
  readonly entityId: string;
  /** Optional class filter — skipped if empty (IR-376-1 / DNA-2). */
  readonly entityClass?: string;
  /** Optional access type filter — skipped if empty (IR-376-1 / DNA-2). */
  readonly accessType?: string;
  /** Maximum graph traversal depth — defaults to FREEDOM config value if omitted. */
  readonly maxDepth?: number;
}

export interface DependencyNode {
  readonly nodeId: string;
  readonly entityId: string;
  readonly entityClass: string;
  readonly accessType: string;
  readonly dependsOn: string;
  readonly severity: DependencySeverity;
  readonly flowId: string;
  readonly taskType: string;
  readonly metadata: Record<string, unknown>;
}

export interface DependencyQueryResult {
  readonly entityId: string;
  readonly nodes: DependencyNode[];
  /** Highest severity found across all affected nodes (NONE if empty result — IR-376-2). */
  readonly maxSeverity: DependencySeverity;
  readonly totalCount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DEPENDENCY_INDEX = 'bfa-dependency-graph';

/** Severity ordering for comparison (IR-376-2, IR-377-2 static override). */
const SEVERITY_ORDER: Record<DependencySeverity, number> = {
  [DependencySeverity.NONE]: 0,
  [DependencySeverity.LOW]: 1,
  [DependencySeverity.MEDIUM]: 2,
  [DependencySeverity.HIGH]: 3,
  [DependencySeverity.CRITICAL]: 4,
};

// ── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class DependencyIndexQuery extends MicroserviceBase {
  constructor(@Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T376',
        serviceName: 'DependencyIndexQuery',
        flowId: 'FLOW-25',
      }),
    });
  }

  /**
   * Query the dependency graph for all nodes that depend on the given entity.
   *
   * CF-476: All queries include `tenant_id` scoping automatically.
   * IR-376-1: entity_class and access_type filters are skipped when empty (DNA-2).
   * IR-376-2: An empty result set returns NONE severity — not an error.
   * IR-376-3: If tenant context is unavailable → failure (CF-476 enforcement).
   */
  async queryDependencies(
    input: DependencyQueryInput,
    tenantId: string,
  ): Promise<DataProcessResult<DependencyQueryResult>> {
    // IR-376-3 / CF-476: tenant scope is mandatory
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure(
        'UNSCOPED_QUERY',
        'CF-476: All dependency queries must include tenant scope. Unscoped queries are forbidden.',
      );
    }

    if (!input.entityId || input.entityId.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_ENTITY_ID',
        'entityId is required for dependency query',
      );
    }

    // IR-376-1 / DNA-2: BuildSearchFilter — skip empty/null entity_class and access_type
    const filters: Record<string, unknown> = {
      tenant_id: tenantId, // CF-476: always included
      depends_on: input.entityId,
    };

    // DNA-2: only include optional filters when they have values
    if (input.entityClass && input.entityClass.trim() !== '') {
      filters['entity_class'] = input.entityClass;
    }
    if (input.accessType && input.accessType.trim() !== '') {
      filters['access_type'] = input.accessType;
    }

    const queryResult = await this.dbService.searchDocuments(DEPENDENCY_INDEX, filters);
    if (!queryResult.isSuccess) {
      return DataProcessResult.failure(
        queryResult.errorCode ?? 'DEPENDENCY_QUERY_FAILED',
        queryResult.errorMessage ?? 'Failed to query dependency graph',
      );
    }

    const rawDocs = queryResult.data ?? [];

    // IR-376-2: empty result = NONE severity — not an error
    if (rawDocs.length === 0) {
      return DataProcessResult.success({
        entityId: input.entityId,
        nodes: [],
        maxSeverity: DependencySeverity.NONE,
        totalCount: 0,
      });
    }

    const nodes: DependencyNode[] = rawDocs.map((doc) => this.toNode(doc));
    const maxSeverity = this.computeMaxSeverity(nodes);

    return DataProcessResult.success({
      entityId: input.entityId,
      nodes,
      maxSeverity,
      totalCount: nodes.length,
    });
  }

  /**
   * Query all dependants of a given entity within a specific flow (scoped to tenant + flow).
   * Useful for blast-radius analysis at the flow level.
   */
  async queryFlowDependencies(
    entityId: string,
    flowId: string,
    tenantId: string,
  ): Promise<DataProcessResult<DependencyQueryResult>> {
    // CF-476: tenant scope mandatory
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure(
        'UNSCOPED_QUERY',
        'CF-476: All dependency queries must include tenant scope.',
      );
    }

    if (!entityId || entityId.trim() === '') {
      return DataProcessResult.failure('MISSING_ENTITY_ID', 'entityId is required');
    }

    if (!flowId || flowId.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_FLOW_ID',
        'flowId is required for flow-scoped query',
      );
    }

    const filters: Record<string, unknown> = {
      tenant_id: tenantId,
      depends_on: entityId,
      flow_id: flowId,
    };

    const queryResult = await this.dbService.searchDocuments(DEPENDENCY_INDEX, filters);
    if (!queryResult.isSuccess) {
      return DataProcessResult.failure(
        queryResult.errorCode ?? 'DEPENDENCY_QUERY_FAILED',
        queryResult.errorMessage ?? 'Failed to query flow dependency graph',
      );
    }

    const rawDocs = queryResult.data ?? [];

    // IR-376-2: empty result = NONE severity
    if (rawDocs.length === 0) {
      return DataProcessResult.success({
        entityId,
        nodes: [],
        maxSeverity: DependencySeverity.NONE,
        totalCount: 0,
      });
    }

    const nodes = rawDocs.map((doc) => this.toNode(doc));
    return DataProcessResult.success({
      entityId,
      nodes,
      maxSeverity: this.computeMaxSeverity(nodes),
      totalCount: nodes.length,
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private toNode(doc: Record<string, unknown>): DependencyNode {
    return {
      nodeId: (doc['node_id'] as string) ?? '',
      entityId: (doc['entity_id'] as string) ?? '',
      entityClass: (doc['entity_class'] as string) ?? '',
      accessType: (doc['access_type'] as string) ?? '',
      dependsOn: (doc['depends_on'] as string) ?? '',
      severity: (doc['severity'] as DependencySeverity) ?? DependencySeverity.NONE,
      flowId: (doc['flow_id'] as string) ?? '',
      taskType: (doc['task_type'] as string) ?? '',
      metadata: (doc['metadata'] as Record<string, unknown>) ?? {},
    };
  }

  private computeMaxSeverity(nodes: DependencyNode[]): DependencySeverity {
    if (nodes.length === 0) return DependencySeverity.NONE;
    return nodes.reduce<DependencySeverity>((max, node) => {
      return SEVERITY_ORDER[node.severity] > SEVERITY_ORDER[max] ? node.severity : max;
    }, DependencySeverity.NONE);
  }
}

export { SEVERITY_ORDER };
