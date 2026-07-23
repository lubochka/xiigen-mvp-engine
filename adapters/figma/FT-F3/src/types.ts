// FT-F3 — Figma Design System Auditor
// Layer 1: CONCEPT_NEUTRAL — SharedTokenElement / SharedTokenStyle
// Layer 2: IMPL_VARIES    — shared audit engine (unchanged across platforms)
// Layer 3: STACK_COUPLED  — figma-adapter.ts (this adapter)

export interface FigmaDesignToken {
  id: string;
  type: 'COMPONENT' | 'FRAME' | 'TEXT' | 'RECTANGLE' | 'GROUP';
  name: string;
  fills: Array<{ color: { r: number; g: number; b: number }; opacity: number }>;
  fontName?: { family: string; style: string };
  fontSize?: number;
  width: number;
  height: number;
}

export interface SharedTokenElement {
  type: 'COMPONENT' | 'FRAME' | 'TEXT' | 'SHAPE' | 'GROUP';
  name: string;
  tokenCategory: 'COLOR' | 'TYPOGRAPHY' | 'SPACING' | 'COMPONENT';
  width: number;
  height: number;
}

export interface SharedTokenStyle {
  colorHex: string;
  fontFamily?: string;
  fontStyle?: string;
  fontSize: number;
  tokenType: 'COLOR' | 'TYPOGRAPHY' | 'SPACING' | 'COMPONENT';
}

export interface AuditOutput {
  element: SharedTokenElement;
  style: SharedTokenStyle;
  auditResult: { violations: string[]; score: number };
}

export interface DesignSystemReadResult {
  elements: SharedTokenElement[];
  styles: SharedTokenStyle[];
  sourceTokens: FigmaDesignToken[];
}

export interface AuditWriteResult {
  written: number;
  failed: number;
}
