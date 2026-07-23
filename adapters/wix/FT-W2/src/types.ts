// FT-W2 — Wix Alt-Text Generator
// Layer 1: CONCEPT_NEUTRAL — SharedAltTextElement / SharedAltTextStyle
// Layer 2: IMPL_VARIES    — shared alt-text generation engine
// Layer 3: STACK_COUPLED  — wix-adapter.ts (this adapter)

export interface WixImageComponent {
  id: string;
  type: 'WPhoto' | 'SlideShowGallery' | 'MatrixGallery' | 'WRichText';
  src: string;
  alt?: string;
  title?: string;
  width: number;
  height: number;
  pageSection?: string;
}

export interface SharedAltTextElement {
  type: 'PHOTO' | 'GALLERY_ITEM' | 'DECORATIVE';
  src: string;
  currentAlt?: string;
  title?: string;
  pageSection?: string;
  width: number;
  height: number;
}

export interface SharedAltTextStyle {
  altLength: 'short' | 'medium' | 'detailed';
  tone: 'descriptive' | 'functional' | 'decorative';
  imageType: 'PHOTO' | 'GALLERY_ITEM' | 'DECORATIVE';
}

export interface AltTextOutput {
  element: SharedAltTextElement;
  style: SharedAltTextStyle;
  generatedAlt: string;
}

export interface AltTextReadResult {
  elements: SharedAltTextElement[];
  styles: SharedAltTextStyle[];
  sourceComponents: WixImageComponent[];
}

export interface AltTextWriteResult {
  written: number;
  failed: number;
}
