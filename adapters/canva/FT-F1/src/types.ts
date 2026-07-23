/**
 * FT-F1 — Canva Site Generator Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Canva platform.
 * Shared site engine types mirror the existing Figma plugin contract.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Canva sandbox constraint).
 */

export interface CanvaDesignElement {
  id: string;
  type: 'TEXT' | 'IMAGE' | 'SHAPE' | 'FRAME';
  content?: string;
  src?: string;
  backgroundColor: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface SharedSiteElement {
  type: 'TEXT_NODE' | 'IMAGE_NODE' | 'CONTAINER' | 'SECTION';
  content?: string;
  src?: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface SharedSiteStyle {
  backgroundColor: string;
  width: number;
  height: number;
  layout: 'block' | 'flex';
}

export interface SiteGenerationOutput {
  html: string;
  css: string;
}

export interface SiteAdapterReadResult {
  elements: SharedSiteElement[];
  styles: SharedSiteStyle[];
  sourceElements: CanvaDesignElement[];
}

export interface SiteAdapterWriteResult {
  written: number;
  failed: number;
}

export interface SiteEnhancedOutput {
  element: SharedSiteElement;
  style: SharedSiteStyle;
  generated: SiteGenerationOutput;
}
