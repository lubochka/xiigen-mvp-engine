/**
 * FT-M1 — Miro AI Architect Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Miro Apps platform.
 * Shared architecture engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Miro Apps SDK constraint).
 */

export interface MiroBoardItem {
  id: string;
  type: 'card' | 'shape' | 'connector' | 'text' | 'frame' | 'sticky_note';
  title?: string;
  content?: string;
  shape?: 'rectangle' | 'round_rectangle' | 'circle' | 'ellipse' | 'triangle' | 'unknown';
  style: {
    fillColor: string;
    borderColor: string;
    textColor: string;
    fontSize?: number;
    borderRadius?: number;
  };
  position: { x: number; y: number };
  geometry: { width: number; height: number };
  startItem?: { id: string };
  endItem?: { id: string };
}

export interface SharedArchitectElement {
  type: 'COMPONENT' | 'RELATION' | 'STRUCTURE' | 'LABEL' | 'BOUNDARY';
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fromId?: string;
  toId?: string;
}

export interface SharedArchitectStyle {
  fillColor: string;
  borderColor: string;
  textColor: string;
  elementType: 'COMPONENT' | 'RELATION' | 'STRUCTURE' | 'LABEL' | 'BOUNDARY';
}

export interface MiroShapeClassification {
  ruleId: string;
  label:
    | 'frame'
    | 'sticky-note'
    | 'connector'
    | 'heading'
    | 'label'
    | 'card'
    | 'container'
    | 'avatar'
    | 'badge'
    | 'unknown';
  sharedType: SharedArchitectElement['type'];
  confidence: number;
}

export type MiroLayoutMode = 'row' | 'column' | 'absolute';

export interface MiroSpatialNode {
  item: MiroBoardItem;
  children: MiroSpatialNode[];
  layoutMode: MiroLayoutMode;
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface MiroSpatialAnalysis {
  roots: MiroSpatialNode[];
  nodeCount: number;
  tolerance: number;
}

export interface MiroAdapterReadResult {
  elements: SharedArchitectElement[];
  styles: SharedArchitectStyle[];
  sourceItems: MiroBoardItem[];
}

export interface MiroAdapterWriteResult {
  written: number;
  failed: number;
}

export interface ArchitectEnhancedOutput {
  element: SharedArchitectElement;
  style: SharedArchitectStyle;
}
