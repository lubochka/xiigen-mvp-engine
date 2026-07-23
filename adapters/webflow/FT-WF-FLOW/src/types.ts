// FT-WF-FLOW — Webflow Flow Router (FLOW family: page hierarchy→content flow)

export interface WebflowPageNode {
  id: string;
  slug: string;
  name: string;
  type: 'static' | 'collection' | 'folder' | 'utility';
  parentId?: string;
  childCount: number;
}

export interface SharedFlowNode {
  type: 'START' | 'STEP' | 'DECISION' | 'END' | 'CONNECTOR';
  label: string;
  slug?: string;
  fromId?: string;
  toId?: string;
}

export interface SharedFlowStyle {
  nodeRole: 'START' | 'STEP' | 'DECISION' | 'END' | 'CONNECTOR';
  isTerminal: boolean;
  hasCondition: boolean;
}

export interface FlowSpecOutput {
  node: SharedFlowNode;
  style: SharedFlowStyle;
  generatedSpec: { description: string; systemComponent: string };
}

export interface FlowDiagramReadResult {
  nodes: SharedFlowNode[];
  styles: SharedFlowStyle[];
  sourcePages: WebflowPageNode[];
}

export interface FlowSpecWriteResult {
  written: number;
  failed: number;
}
