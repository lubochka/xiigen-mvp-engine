/**
 * DiagramGenerator — auto-generates Mermaid diagrams from engine structure.
 *
 * Four diagram types:
 * 1. Module dependency diagram — NestJS module imports graph
 * 2. Fabric layer diagram — 6 fabric layers with providers
 * 3. Pipeline diagram — INVENTORY → SYNTHESIS → JUDGMENT with AF stations
 * 4. Flow DAG diagram — visualizes a specific flow definition's node/edge graph
 *
 * All output as Mermaid markdown strings (renderable in client or docs).
 * DNA-3: all public methods return DataProcessResult.
 *
 * Phase 11.4.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Flow Definition Types (for DAG rendering) ───────

export interface FlowNode {
  /** Unique node identifier. */
  id: string;
  /** Display label. */
  label: string;
  /** Node type: task, gateway, start, end. */
  type: 'task' | 'gateway' | 'start' | 'end';
  /** Optional factory reference (e.g., F166). */
  factoryId?: string;
}

export interface FlowEdge {
  /** Source node ID. */
  from: string;
  /** Target node ID. */
  to: string;
  /** Optional edge label. */
  label?: string;
}

export interface FlowDefinitionInput {
  /** Flow name for the diagram title. */
  name?: string;
  /** Nodes in the DAG. */
  nodes: FlowNode[];
  /** Edges in the DAG. */
  edges: FlowEdge[];
}

// ── Module Dependency Data ──────────────────────────

export interface ModuleDependency {
  name: string;
  imports: string[];
}

// ── Generator ───────────────────────────────────────

@Injectable()
export class DiagramGenerator {
  /**
   * Generate a module dependency diagram.
   * Shows which NestJS modules import which.
   */
  generateModuleDependencyDiagram(modules?: ModuleDependency[]): DataProcessResult<string> {
    const mods = modules ?? this.getEngineModuleDependencies();
    const lines: string[] = ['flowchart LR'];

    // Define nodes
    const nodeSet = new Set<string>();
    for (const mod of mods) {
      nodeSet.add(mod.name);
      for (const imp of mod.imports) {
        nodeSet.add(imp);
      }
    }
    for (const name of nodeSet) {
      lines.push(`  ${this.sanitizeId(name)}["${name}"]`);
    }

    // Define edges (import = arrow from module to its dependency)
    for (const mod of mods) {
      for (const imp of mod.imports) {
        lines.push(`  ${this.sanitizeId(mod.name)} --> ${this.sanitizeId(imp)}`);
      }
    }

    if (nodeSet.size === 0) {
      lines.push('  empty["No modules defined"]');
    }

    return DataProcessResult.success(lines.join('\n'));
  }

  /**
   * Generate a fabric layer diagram.
   * Shows the 6 fabric layers with their providers.
   */
  generateFabricLayerDiagram(): DataProcessResult<string> {
    const lines: string[] = ['flowchart TB'];

    const layers: Array<{ name: string; providers: string[] }> = [
      {
        name: 'DATABASE',
        providers: ['Elasticsearch', 'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'SQLServer'],
      },
      { name: 'QUEUE', providers: ['Redis Streams', 'AWS SQS'] },
      { name: 'AI_ENGINE', providers: ['Claude', 'OpenAI', 'Gemini', 'DeepSeek', 'Grok'] },
      {
        name: 'RAG',
        providers: ['InMemory', 'Split', 'FanOut', 'Tiered', 'Hybrid', 'Graph', 'Vector'],
      },
      { name: 'SECRETS', providers: ['AWS Secrets Manager', 'Environment Variables', 'InMemory'] },
      { name: 'FLOW_ENGINE', providers: ['InMemory Flow Store', 'InMemory Orchestrator'] },
    ];

    for (const layer of layers) {
      lines.push(`  subgraph ${layer.name}`);
      for (const provider of layer.providers) {
        const pid = this.sanitizeId(`${layer.name}_${provider}`);
        lines.push(`    ${pid}["${provider}"]`);
      }
      lines.push('  end');
    }

    // Fabric interfaces on top
    lines.push('  CORE["CORE FABRIC\\nMicroserviceBase\\n19 components"]');

    // Core connects to all
    for (const layer of layers) {
      lines.push(`  CORE --> ${layer.name}`);
    }

    return DataProcessResult.success(lines.join('\n'));
  }

  /**
   * Generate the AF pipeline diagram.
   * Shows: INVENTORY → SYNTHESIS → JUDGMENT with all 11 AF stations.
   */
  generatePipelineDiagram(): DataProcessResult<string> {
    const lines: string[] = ['flowchart LR'];

    // INVENTORY sub-engine
    lines.push('  subgraph INVENTORY["INVENTORY Engine"]');
    lines.push('    AF3["AF-3 Prompt Library"]');
    lines.push('    AF4["AF-4 RAG Context"]');
    lines.push('    AF5["AF-5 Multi-Model Orchestration"]');
    lines.push('  end');

    // SYNTHESIS sub-engine
    lines.push('  subgraph SYNTHESIS["SYNTHESIS Engine"]');
    lines.push('    AF1["AF-1 Genesis"]');
    lines.push('    AF2["AF-2 Planning"]');
    lines.push('    AF10["AF-10 Merge"]');
    lines.push('  end');

    // JUDGMENT sub-engine
    lines.push('  subgraph JUDGMENT["JUDGMENT Engine"]');
    lines.push('    AF6["AF-6 Code Review"]');
    lines.push('    AF7["AF-7 DNA Compliance"]');
    lines.push('    AF8["AF-8 Security"]');
    lines.push('    AF9["AF-9 Judge"]');
    lines.push('    AF11["AF-11 Feedback"]');
    lines.push('  end');

    // Inter-engine flow
    lines.push('  INVENTORY --> SYNTHESIS');
    lines.push('  SYNTHESIS --> JUDGMENT');

    // Internal flows within sub-engines
    lines.push('  AF3 --> AF4');
    lines.push('  AF4 --> AF5');
    lines.push('  AF1 --> AF2');
    lines.push('  AF2 --> AF10');
    lines.push('  AF6 --> AF7');
    lines.push('  AF7 --> AF8');
    lines.push('  AF8 --> AF9');
    lines.push('  AF9 --> AF11');

    return DataProcessResult.success(lines.join('\n'));
  }

  /**
   * Generate a flow DAG diagram for a specific flow definition.
   * Renders nodes and edges from the flow definition input.
   */
  generateFlowDagDiagram(flowDef: FlowDefinitionInput): DataProcessResult<string> {
    const lines: string[] = ['flowchart TB'];

    if (flowDef.name) {
      lines[0] = `flowchart TB`;
    }

    if (flowDef.nodes.length === 0) {
      lines.push('  empty["No nodes defined"]');
      return DataProcessResult.success(lines.join('\n'));
    }

    // Render nodes by type
    for (const node of flowDef.nodes) {
      const id = this.sanitizeId(node.id);
      const label = node.factoryId ? `${node.label}\\n(${node.factoryId})` : node.label;

      switch (node.type) {
        case 'start':
          lines.push(`  ${id}(["${label}"])`);
          break;
        case 'end':
          lines.push(`  ${id}(["${label}"])`);
          break;
        case 'gateway':
          lines.push(`  ${id}{"${label}"}`);
          break;
        case 'task':
        default:
          lines.push(`  ${id}["${label}"]`);
          break;
      }
    }

    // Render edges
    for (const edge of flowDef.edges) {
      const from = this.sanitizeId(edge.from);
      const to = this.sanitizeId(edge.to);
      if (edge.label) {
        lines.push(`  ${from} -->|"${edge.label}"| ${to}`);
      } else {
        lines.push(`  ${from} --> ${to}`);
      }
    }

    return DataProcessResult.success(lines.join('\n'));
  }

  // ── Engine Module Dependencies (single source of truth) ──

  getEngineModuleDependencies(): ModuleDependency[] {
    return [
      { name: 'KernelModule', imports: [] },
      { name: 'MultiTenantModule', imports: ['KernelModule'] },
      { name: 'FabricsModule', imports: ['KernelModule'] },
      { name: 'FactoriesModule', imports: ['FabricsModule'] },
      { name: 'EngineContractsModule', imports: [] },
      { name: 'GuardrailsModule', imports: [] },
      { name: 'FreedomModule', imports: [] },
      { name: 'AfStationsModule', imports: ['GuardrailsModule'] },
      {
        name: 'EngineModule',
        imports: [
          'AfStationsModule',
          'GuardrailsModule',
          'FreedomModule',
          'FactoriesModule',
          'EngineContractsModule',
        ],
      },
      { name: 'BootstrapModule', imports: [] },
      { name: 'ApiModule', imports: ['BootstrapModule'] },
      { name: 'RagInitModule', imports: ['AfStationsModule', 'EngineContractsModule'] },
      { name: 'DocGenModule', imports: ['FactoriesModule', 'EngineContractsModule'] },
    ];
  }

  // ── Helpers ───────────────────────────────────────

  /** Sanitize a string to be a valid Mermaid node ID. */
  private sanitizeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
