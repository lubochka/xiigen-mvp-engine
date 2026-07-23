// FT-F-FLOW — Figma Flow Router (FLOW family: diagram→system)
// Layer 1: CONCEPT_NEUTRAL — SharedFlowNode / SharedFlowStyle
// Layer 2: IMPL_VARIES    — shared diagram-to-system engine
// Layer 3: STACK_COUPLED  — figma-flow-adapter.ts (this adapter)

export interface FigmaFlowNode {
  id: string;
  type: 'FRAME' | 'ELLIPSE' | 'RECTANGLE' | 'CONNECTOR' | 'TEXT' | 'POLYGON';
  name: string;
  connections?: { fromId?: string; toId?: string; label?: string };
  width: number;
  height: number;
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
  sourceNodes: FigmaFlowNode[];
}

export interface FlowSpecWriteResult {
  written: number;
  failed: number;
}
