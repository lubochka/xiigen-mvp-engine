/**
 * FT-C6 — Canva Background Remover Adapter
 *
 * Layer 3 STACK_COUPLED adapter — only file that differs from shared engine.
 * 90% shared image processing engine is UNCHANGED from platform to platform.
 *
 * FLOW-34 FC-26: API mapping — Canva image elements → shared processing model.
 *
 * Property mapping (Canva → Shared):
 *   element.type 'IMAGE'  → SharedImageElement.type 'IMAGE'
 *   element.src           → SharedImageElement.src
 *   element.position.x/y → SharedImageElement.x/y
 *   element.width/height  → SharedImageElement.width/height
 *   element.opacity       → SharedImageStyle.opacity
 *   (plugin purpose)      → SharedImageStyle.operation 'REMOVE_BG'
 */

import type {
  CanvaImageElement,
  SharedImageElement,
  SharedImageStyle,
  ImageAdapterReadResult,
  ImageAdapterWriteResult,
  ImageEnhancedOutput,
} from './types';

export function mapCanvaToImageElement(el: CanvaImageElement): SharedImageElement {
  return {
    type: 'IMAGE',
    src: el.src,
    width: el.width,
    height: el.height,
    x: el.position.x,
    y: el.position.y,
  };
}

export function mapCanvaToImageStyle(el: CanvaImageElement): SharedImageStyle {
  return {
    opacity: el.opacity,
    // Background Remover plugin always requests REMOVE_BG as the default operation
    operation: 'REMOVE_BG',
  };
}

export function mapImageStyleToCanva(style: SharedImageStyle): Partial<CanvaImageElement> {
  return {
    opacity: style.opacity,
    type: 'IMAGE',
  };
}

export function readImageSelection(elements: CanvaImageElement[]): ImageAdapterReadResult {
  return {
    elements: elements.map(mapCanvaToImageElement),
    styles: elements.map(mapCanvaToImageStyle),
    sourceElements: elements,
  };
}

export async function writeProcessedImages(
  outputs: ImageEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<ImageAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      await writer({
        type: 'IMAGE_REPLACE',
        originalSrc: output.processed.originalSrc,
        processedSrc: output.processed.processedSrc,
        operation: output.processed.operation,
        opacity: output.style.opacity,
        width: output.element.width,
        height: output.element.height,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
