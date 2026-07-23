// FT-C2 — Canva AI Background Scene Generator
// Layer 1: CONCEPT_NEUTRAL — SharedSceneElement / SharedSceneStyle
// Layer 2: IMPL_VARIES    — shared scene generation engine
// Layer 3: STACK_COUPLED  — canva-adapter.ts (this adapter)

export interface CanvaSceneElement {
  id: string;
  type: 'IMAGE' | 'SHAPE' | 'TEXT' | 'GROUP';
  src?: string;
  backgroundColor?: string;
  width: number;
  height: number;
  position: { x: number; y: number };
  opacity: number;
}

export interface SharedSceneElement {
  type: 'BACKGROUND' | 'OVERLAY' | 'TEXT' | 'DECORATION';
  src?: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface SharedSceneStyle {
  backgroundColor: string;
  opacity: number;
  sceneType: 'BACKGROUND' | 'OVERLAY' | 'TEXT' | 'DECORATION';
}

export interface SceneEnhancedOutput {
  element: SharedSceneElement;
  style: SharedSceneStyle;
  generatedScene: { prompt: string; imageUrl: string };
}

export interface SceneReadResult {
  elements: SharedSceneElement[];
  styles: SharedSceneStyle[];
  sourceElements: CanvaSceneElement[];
}

export interface SceneWriteResult {
  written: number;
  failed: number;
}
