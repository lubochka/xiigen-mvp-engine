// FT-WF-FLOW — Webflow Flow Router — Layer 3: STACK_COUPLED

import type {
  WebflowPageNode, SharedFlowNode, SharedFlowStyle,
  FlowDiagramReadResult, FlowSpecOutput, FlowSpecWriteResult,
} from './types';

function inferNodeType(page: WebflowPageNode): SharedFlowNode['type'] {
  if (page.slug === '/' || page.name.toLowerCase() === 'home') return 'START';
  if (page.type === 'utility') return 'END';
  if (page.type === 'collection') return 'DECISION'; // branches to collection items
  return 'STEP';
}

export function mapWebflowToFlowNode(page: WebflowPageNode): SharedFlowNode {
  return {
    type: inferNodeType(page),
    label: page.name,
    slug: page.slug,
    fromId: page.parentId,
  };
}

export function mapWebflowToFlowStyle(page: WebflowPageNode): SharedFlowStyle {
  const role = inferNodeType(page);
  return {
    nodeRole: role,
    isTerminal: role === 'START' || role === 'END',
    hasCondition: role === 'DECISION',
  };
}

export function mapFlowStyleToWebflow(style: SharedFlowStyle): Partial<WebflowPageNode> {
  const TYPE_MAP: Record<SharedFlowStyle['nodeRole'], WebflowPageNode['type']> = {
    START: 'static', END: 'utility', STEP: 'static',
    DECISION: 'collection', CONNECTOR: 'folder',
  };
  return { type: TYPE_MAP[style.nodeRole] };
}

export function readPageHierarchy(pages: WebflowPageNode[]): FlowDiagramReadResult {
  return {
    nodes: pages.map(mapWebflowToFlowNode),
    styles: pages.map(mapWebflowToFlowStyle),
    sourcePages: pages,
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
      const base = mapFlowStyleToWebflow(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'FLOW_SPEC',
        label: output.node.label,
        slug: output.node.slug,
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
