// FT-CH1 — Chrome AI Page Analyzer
// Layer 1: CONCEPT_NEUTRAL — SharedPageElement / SharedPageStyle
// Layer 2: IMPL_VARIES    — shared page analysis engine
// Layer 3: STACK_COUPLED  — chrome-adapter.ts (this adapter)

export interface ChromeDOMElement {
  tagName: string; // 'H1'|'H2'|'H3'|'P'|'IMG'|'BUTTON'|'A'|'SECTION'|'DIV'
  textContent?: string;
  src?: string;
  href?: string;
  className?: string;
  id?: string;
  role?: string;
}

export interface SharedPageElement {
  type: 'HEADING' | 'PARAGRAPH' | 'IMAGE' | 'CTA' | 'LINK' | 'SECTION';
  content?: string;
  src?: string;
  href?: string;
  level?: number; // 1–6 for headings
}

export interface SharedPageStyle {
  elementRole: 'HEADING' | 'PARAGRAPH' | 'IMAGE' | 'CTA' | 'LINK' | 'SECTION';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  contentDensity: 'dense' | 'normal' | 'sparse';
}

export interface PageAnalysisOutput {
  element: SharedPageElement;
  style: SharedPageStyle;
  analysisResult: { issues: string[]; suggestions: string[] };
}

export interface PageReadResult {
  elements: SharedPageElement[];
  styles: SharedPageStyle[];
  sourceDOMElements: ChromeDOMElement[];
}

export interface PageWriteResult {
  written: number;
  failed: number;
}
