/**
 * ControlPlaneNodeRenderer — T467 UI service for FLOW-29.
 *
 * Fabric-first node rendering for the control plane graph view.
 * ZERO hardcoded node types, model names, strategy names, colors, positions.
 * ALL values from FREEDOM config or DATABASE FABRIC.
 * Empty FREEDOM config → graceful empty state (never crash).
 * DNA-1 applies to UI: all data shapes are Record<string, unknown>.
 *
 * Iron rules:
 *   ZERO_HARDCODED:  no node types, colors, positions, model names hardcoded
 *   FREEDOM_FIRST:   all config from FREEDOM config or DATABASE FABRIC
 *   GRACEFUL_EMPTY:  empty config → empty node list, no crash
 *   CF-476:          tenantId required — UNSCOPED_QUERY on missing
 *   DNA-1:           all data shapes use Record<string, unknown>
 *   DNA-3:           All methods return DataProcessResult<T> — never throw
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface NodeRenderResult {
  readonly tenantId: string;
  readonly nodes: Record<string, unknown>[];
  readonly nodeCount: number;
  readonly configSource: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NODE_CONFIG_INDEX = 'flow29-node-config';
const FREEDOM_CONFIG_INDEX = 'flow29-freedom-node-types';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ControlPlaneNodeRenderer {
  constructor(private readonly db: IDatabaseService) {}

  /**
   * Render control plane nodes from FREEDOM config and DATABASE FABRIC.
   *
   * ZERO hardcoded values — all from DB.
   * Empty config → graceful empty state (no crash).
   */
  async renderNodes(
    tenantId: string,
    viewContext: Record<string, unknown>,
  ): Promise<DataProcessResult<NodeRenderResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // Read FREEDOM config for node type definitions — never hardcoded
    const freedomResult = await this.db.searchDocuments(FREEDOM_CONFIG_INDEX, {
      tenant_id: tenantId,
      config_key: 'node_type_definitions',
    });

    // Read node layout config from DATABASE FABRIC — never hardcoded
    const nodeConfigResult = await this.db.searchDocuments(NODE_CONFIG_INDEX, {
      tenant_id: tenantId,
      ...viewContext,
    });

    const nodeTypeDefs = freedomResult.isSuccess ? (freedomResult.data ?? []) : [];
    const rawNodes = nodeConfigResult.isSuccess ? (nodeConfigResult.data ?? []) : [];

    // Graceful empty state: no crash on empty config
    if (nodeTypeDefs.length === 0 && rawNodes.length === 0) {
      return DataProcessResult.success({
        tenantId,
        nodes: [],
        nodeCount: 0,
        configSource: 'empty',
      });
    }

    // Build node render data using Record<string,unknown> — DNA-1
    const nodes: Record<string, unknown>[] = rawNodes.map((rawNode) => ({
      id: rawNode['node_id'] ?? rawNode['id'] ?? '',
      type: rawNode['node_type'] ?? 'unknown',
      label: rawNode['label'] ?? '',
      color:
        rawNode['color'] ??
        nodeTypeDefs.find((d) => d['type'] === rawNode['node_type'])?.['color'] ??
        '',
      position: rawNode['position'] ?? { x: 0, y: 0 },
      data: rawNode,
    }));

    return DataProcessResult.success({
      tenantId,
      nodes,
      nodeCount: nodes.length,
      configSource: 'database',
    });
  }
}
