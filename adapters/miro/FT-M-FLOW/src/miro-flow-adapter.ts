// FT-M-FLOW — Miro Flow Router — Layer 3: STACK_COUPLED

import type {
  MiroFlowItem, SharedFlowNode, SharedFlowStyle,
  FlowDiagramReadResult, FlowSpecOutput, FlowSpecWriteResult,
} from './types';

function inferNodeType(item: MiroFlowItem): SharedFlowNode['type'] {
  if (item.type === 'connector') return 'CONNECTOR';
  if (item.shape === 'diamond') return 'DECISION';
  if (item.shape === 'circle') {
    return item.content?.toLowerCase().includes('start') ? 'START' : 'END';
  }
  return 'STEP';
}

export function mapMiroToFlowNode(item: MiroFlowItem): SharedFlowNode {
  return {
    type: inferNodeType(item),
    label: item.content ?? '',
    fromId: item.startItem?.id,
    toId: item.endItem?.id,
  };
}

export function mapMiroToFlowStyle(item: MiroFlowItem): SharedFlowStyle {
  const role = inferNodeType(item);
  return {
    nodeRole: role,
    isTerminal: role === 'START' || role === 'END',
    hasCondition: role === 'DECISION',
  };
}

export function mapFlowStyleToMiro(style: SharedFlowStyle): Partial<MiroFlowItem> {
  const SHAPE_MAP: Record<SharedFlowStyle['nodeRole'], MiroFlowItem['shape'] | undefined> = {
    START: 'circle', END: 'circle', STEP: 'rectangle',
    DECISION: 'diamond', CONNECTOR: undefined,
  };
  return {
    type: style.nodeRole === 'CONNECTOR' ? 'connector' : 'shape',
    shape: SHAPE_MAP[style.nodeRole],
  };
}

export function readFlowDiagram(items: MiroFlowItem[]): FlowDiagramReadResult {
  return {
    nodes: items.map(mapMiroToFlowNode),
    styles: items.map(mapMiroToFlowStyle),
    sourceItems: items,
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
      const base = mapFlowStyleToMiro(output.style) as Record<string, unknown>;
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
