// FT-F-FLOW — Figma Flow Router — Layer 3: STACK_COUPLED
// No Figma Plugin API import at module level — injected writer pattern throughout.

import type {
  FigmaFlowNode, SharedFlowNode, SharedFlowStyle,
  FlowDiagramReadResult, FlowSpecOutput, FlowSpecWriteResult,
} from './types';

function inferNodeType(node: FigmaFlowNode): SharedFlowNode['type'] {
  if (node.type === 'CONNECTOR') return 'CONNECTOR';
  if (node.type === 'ELLIPSE') {
    return node.name.toLowerCase().includes('start') ? 'START' : 'END';
  }
  if (node.type === 'POLYGON') return 'DECISION'; // diamond = rotated polygon
  if (node.name.endsWith('?')) return 'DECISION';
  return 'STEP';
}

export function mapFigmaToFlowNode(node: FigmaFlowNode): SharedFlowNode {
  return {
    type: inferNodeType(node),
    label: node.name,
    fromId: node.connections?.fromId,
    toId: node.connections?.toId,
  };
}

export function mapFigmaToFlowStyle(node: FigmaFlowNode): SharedFlowStyle {
  const role = inferNodeType(node);
  return {
    nodeRole: role,
    isTerminal: role === 'START' || role === 'END',
    hasCondition: role === 'DECISION',
  };
}

export function mapFlowStyleToFigma(style: SharedFlowStyle): Partial<FigmaFlowNode> {
  const TYPE_MAP: Record<SharedFlowStyle['nodeRole'], FigmaFlowNode['type']> = {
    START: 'ELLIPSE', END: 'ELLIPSE', STEP: 'RECTANGLE',
    DECISION: 'POLYGON', CONNECTOR: 'CONNECTOR',
  };
  return { type: TYPE_MAP[style.nodeRole] };
}

export function readFlowDiagram(nodes: FigmaFlowNode[]): FlowDiagramReadResult {
  return {
    nodes: nodes.map(mapFigmaToFlowNode),
    styles: nodes.map(mapFigmaToFlowStyle),
    sourceNodes: nodes,
  };
}

export async function writeFlowSpec(
  outputs: FlowSpecOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<FlowSpecWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapFlowStyleToFigma(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'FLOW_SPEC',
        label: output.node.label,
        nodeRole: output.style.nodeRole,
        systemComponent: output.generatedSpec.systemComponent,
        description: output.generatedSpec.description,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
