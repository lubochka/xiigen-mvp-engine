/**
 * FT-C6 — Canva Background Remover Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Canva platform.
 * Shared image processing engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Canva sandbox constraint).
 */

export interface CanvaImageElement {
  id: string;
  type: 'IMAGE';
  src: string;
  opacity: number;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface SharedImageElement {
  type: 'IMAGE';
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface SharedImageStyle {
  opacity: number;
  operation: 'REMOVE_BG' | 'ENHANCE' | 'NONE';
}

export interface ImageProcessOutput {
  originalSrc: string;
  processedSrc: string;
  operation: string;
}

export interface ImageAdapterReadResult {
  elements: SharedImageElement[];
  styles: SharedImageStyle[];
  sourceElements: CanvaImageElement[];
}

export interface ImageAdapterWriteResult {
  written: number;
  failed: number;
}

export interface ImageEnhancedOutput {
  element: SharedImageElement;
  style: SharedImageStyle;
  processed: ImageProcessOutput;
}
