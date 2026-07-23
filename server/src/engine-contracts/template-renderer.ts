/**
 * TemplateRenderer — renders an EngineContract into deployable artifacts.
 *
 * Given a validated EngineContract, produces:
 *   1. flow-definition JSON (DAG for FlowOrchestrator)
 *      start → service nodes (one per factory dep) → judge gate → end
 *   2. factory registry entries (ready to register in FactoryRegistry)
 *   3. FREEDOM config documents (one per freedom_component)
 *
 * DNA-1: All outputs are Record<string, unknown> with snake_case keys.
 * DNA-3: render() returns DataProcessResult.
 *
 * Phase 6.4: Contract infrastructure.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { EngineContract, qualityGateToDict } from './contract-schema';

// ── Render Output ────────────────────────────────────

export interface TemplateRenderOutput {
  /** Flow definition DAG for FlowOrchestrator. */
  readonly flowDefinition: Record<string, unknown>;
  /** Factory registry entries for each factory dependency. */
  readonly factoryEntries: Array<Record<string, unknown>>;
  /** FREEDOM config documents (one per freedom_component). */
  readonly freedomConfigs: Array<Record<string, unknown>>;
}

// ── TemplateRenderer ─────────────────────────────────

@Injectable()
export class TemplateRenderer {
  /**
   * Render an EngineContract into deployable artifacts.
   * Validates the contract first. Returns failure if invalid.
   */
  render(contract: EngineContract): DataProcessResult<TemplateRenderOutput> {
    // Validate before rendering
    const validation = contract.validate();
    if (!validation.isSuccess) {
      return DataProcessResult.failure(
        'RENDER_VALIDATION_FAILED',
        `Cannot render ${contract.taskTypeId}: ${validation.errorMessage}`,
      );
    }

    const flowDefinition = this.buildFlowDefinition(contract);
    const factoryEntries = this.buildFactoryEntries(contract);
    const freedomConfigs = this.buildFreedomConfigs(contract);

    return DataProcessResult.success({
      flowDefinition,
      factoryEntries,
      freedomConfigs,
    });
  }

  /**
   * Build a flow-definition DAG from the contract.
   * Structure: start → service nodes (parallel) → judge_gate → end
   * Each service node = one factory dependency resolved via createAsync().
   */
  private buildFlowDefinition(contract: EngineContract): Record<string, unknown> {
    const nodes: Array<Record<string, unknown>> = [];
    const edges: Array<Record<string, unknown>> = [];

    // Start node
    nodes.push({
      node_id: 'start',
      type: 'start',
      name: `${contract.taskTypeId} — Start`,
      config: {},
    });

    // Service nodes — one per factory dependency
    for (const dep of contract.factoryDependencies) {
      const nodeId = `svc_${dep.factoryId.toLowerCase()}`;
      nodes.push({
        node_id: nodeId,
        type: 'service',
        name: `${dep.interfaceName} (${dep.factoryId})`,
        factory_id: dep.factoryId,
        interface_name: dep.interfaceName,
        fabric_type: dep.fabricType,
        provider_hint: dep.providerHint ?? null,
        config: {},
      });

      // Edge: start → each service node
      edges.push({
        from: 'start',
        to: nodeId,
      });
    }

    // Judge gate node
    const judgeStation = contract.afStations.find((s) => s.role === 'judge');
    nodes.push({
      node_id: 'judge_gate',
      type: 'judge',
      name: `${contract.taskTypeId} — Quality Judge`,
      station_id: judgeStation?.stationId ?? 'AF-9',
      quality_gates: contract.qualityGates.map(qualityGateToDict),
      config: judgeStation?.config ?? {},
    });

    // Edges: each service node → judge gate
    for (const dep of contract.factoryDependencies) {
      const nodeId = `svc_${dep.factoryId.toLowerCase()}`;
      edges.push({
        from: nodeId,
        to: 'judge_gate',
      });
    }

    // End node
    nodes.push({
      node_id: 'end',
      type: 'end',
      name: `${contract.taskTypeId} — End`,
      config: {},
    });

    // Edge: judge gate → end
    edges.push({
      from: 'judge_gate',
      to: 'end',
    });

    return {
      flow_id: `flow_${contract.taskTypeId.toLowerCase()}`,
      name: contract.name,
      task_type_id: contract.taskTypeId,
      archetype: contract.archetype,
      version: contract.version,
      nodes,
      edges,
      node_count: nodes.length,
      edge_count: edges.length,
    };
  }

  /**
   * Build factory registry entries from the contract's factory dependencies.
   * Each entry is ready to be registered in the FactoryRegistry.
   */
  private buildFactoryEntries(contract: EngineContract): Array<Record<string, unknown>> {
    return contract.factoryDependencies.map((dep) => ({
      factory_id: dep.factoryId,
      interface_name: dep.interfaceName,
      family_id: contract.familyId,
      fabric_type: dep.fabricType,
      provider: dep.providerHint ?? 'stub',
      description: dep.description,
      methods: [],
      status: 'GENERATED',
      version: contract.version,
      config: {},
      resolution: `${dep.factoryId}:${dep.interfaceName} → ${dep.fabricType.toUpperCase()} FABRIC → ${dep.providerHint ?? 'default'} provider`,
    }));
  }

  /**
   * Build FREEDOM config documents from the contract's freedom_components.
   * Each component becomes a configurable parameter in Elasticsearch.
   */
  private buildFreedomConfigs(contract: EngineContract): Array<Record<string, unknown>> {
    return contract.freedomComponents.map((component, idx) => ({
      config_id: `freedom_${contract.taskTypeId.toLowerCase()}_${String(idx + 1).padStart(2, '0')}`,
      task_type_id: contract.taskTypeId,
      component_name: component,
      default_value: null,
      value_type: 'string',
      description: `Configurable: ${component}`,
      scope: 'tenant',
      version: contract.version,
    }));
  }
}
