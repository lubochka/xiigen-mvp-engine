// FT-C2 — Canva AI Background Scene Generator — Layer 3: STACK_COUPLED
// No @canva/design import at module level — injected writer pattern throughout.

import type {
  CanvaSceneElement, SharedSceneElement, SharedSceneStyle,
  SceneReadResult, SceneEnhancedOutput, SceneWriteResult,
} from './types';

const CANVA_TYPE_TO_SCENE: Record<CanvaSceneElement['type'], SharedSceneElement['type']> = {
  IMAGE: 'BACKGROUND',
  SHAPE: 'DECORATION',
  TEXT: 'TEXT',
  GROUP: 'OVERLAY',
};

export function mapCanvaToSceneElement(el: CanvaSceneElement): SharedSceneElement {
  return {
    type: CANVA_TYPE_TO_SCENE[el.type],
    src: el.src,
    width: el.width,
    height: el.height,
    x: el.position.x,
    y: el.position.y,
  };
}

export function mapCanvaToSceneStyle(el: CanvaSceneElement): SharedSceneStyle {
  return {
    backgroundColor: el.backgroundColor ?? '#ffffff',
    opacity: el.opacity,
    sceneType: CANVA_TYPE_TO_SCENE[el.type],
  };
}

export function mapSceneStyleToCanva(style: SharedSceneStyle): Partial<CanvaSceneElement> {
  return {
    backgroundColor: style.backgroundColor,
    opacity: style.opacity,
    type: style.sceneType === 'BACKGROUND' ? 'IMAGE'
        : style.sceneType === 'TEXT' ? 'TEXT'
        : style.sceneType === 'OVERLAY' ? 'GROUP'
        : 'SHAPE',
  };
}

export function readSceneElements(elements: CanvaSceneElement[]): SceneReadResult {
  return {
    elements: elements.map(mapCanvaToSceneElement),
    styles: elements.map(mapCanvaToSceneStyle),
    sourceElements: elements,
  };
}

export async function writeGeneratedScenes(
  outputs: SceneEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<SceneWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapSceneStyleToCanva(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'SCENE_UPDATE',
        src: output.generatedScene.imageUrl,
        prompt: output.generatedScene.prompt,
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
