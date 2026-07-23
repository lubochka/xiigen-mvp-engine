// FT-M-FLOW — Miro Flow Router (FLOW family: diagram→system)

export interface MiroFlowItem {
  id: string;
  type: 'card' | 'shape' | 'connector' | 'sticky_note' | 'text';
  content?: string;
  shape?: 'rectangle' | 'circle' | 'diamond' | 'triangle';
  style?: { fillColor: string; borderColor: string };
  startItem?: { id: string };
  endItem?: { id: string };
}

export interface SharedFlowNode {
  type: 'START' | 'STEP' | 'DECISION' | 'END' | 'CONNECTOR';
  label: string;
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
  sourceItems: MiroFlowItem[];
}

export interface FlowSpecWriteResult {
  written: number;
  failed: number;
}
