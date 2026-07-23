/**
 * C5 Canva Text Elements Adapter — Layer 3 (STACK_COUPLED)
 *
 * FT-C5 | FLOW-34 | adapterMode: MODE-B-thin
 *
 * This is the ONLY file that differs from the Figma plugin.
 * The CSS generation engine (Layer 2 — styles.ts, element-code.ts) is UNCHANGED.
 *
 * Stack coupling:
 *   "canva-app:client" — reads Canva text elements, writes back to Canva canvas
 *   Figma equivalent: page selection text nodes (no adapter needed)
 *
 * Key translation rules (from SESSION-0 API Map):
 *   Canva content        → Figma characters
 *   Canva fontStyle.weight 700 → Figma "Bold", 400 → "Regular"
 *   Canva "start"/"center"/"end" → Figma "LEFT"/"CENTER"/"RIGHT"
 *   Canva color 0–255 RGB → shared model rgb() string
 *   Canva app storage maps to the Figma client storage concept
 *   Canva addNativeElement/setContent → Figma node mutation
 *
 * No business logic in this file — only API surface translation.
 * AI calls and CSS generation happen in Layer 1 (@xiigen/plugin-sdk) and Layer 2 (engine).
 */

import type {
  CanvaTextElement,
  SharedElement,
  SharedStyle,
  CanvaAdapterReadResult,
  CanvaAdapterWriteResult,
  CanvaEnhancedOutput,
} from './types';

// ── READ PATH ────────────────────────────────────────────────────────────────

/**
 * Map a Canva TextElement to the shared Element model (Layer 2 input).
 *
 * Equivalent Figma code:
 *   { type: 'TEXT', characters: node.characters, width: node.width, height: node.height }
 */
export function mapCanvaToElement(ct: CanvaTextElement): SharedElement {
  return {
    type: 'TEXT',
    characters: ct.content,   // Canva "content" → Figma "characters"
    width: ct.width,
    height: ct.height,
  };
}

/**
 * Map a Canva TextElement to the shared Style model (Layer 2 input).
 *
 * All property translations documented in SESSION-0 API Map.
 */
export function mapCanvaToStyle(ct: CanvaTextElement): SharedStyle {
  return {
    fontSize: ct.fontSize,
    fontFamily: ct.fontStyle.family,

    // Canva weight 700 → Figma "Bold", anything else → "Regular"
    fontWeight: ct.fontStyle.weight === 700 ? 'Bold' : 'Regular',

    // Canva alignment → Figma alignment (engine uses Figma convention as canonical)
    textAlignHorizontal:
      ct.textAlign === 'start'  ? 'LEFT'
      : ct.textAlign === 'center' ? 'CENTER'
      : 'RIGHT',

    // Canva color is already 0-255 integer RGB — emit as CSS rgb()
    color: `rgb(${ct.color.r}, ${ct.color.g}, ${ct.color.b})`,
  };
}

/**
 * Read the current Canva selection and return shared engine inputs.
 *
 * In real Canva app: uses @canva/design useActiveObject() or getDesignToken().
 * This function is the adapter boundary — it returns the same shape that
 * the Figma plugin's readSelection() returns.
 *
 * NOTE: In tests, inject mock elements via the parameter.
 */
export function readSelection(
  canvaElements: CanvaTextElement[],
): CanvaAdapterReadResult {
  const elements: SharedElement[] = [];
  const styles: SharedStyle[] = [];

  for (const ct of canvaElements) {
    elements.push(mapCanvaToElement(ct));
    styles.push(mapCanvaToStyle(ct));
  }

  return { elements, styles, sourceElements: canvaElements };
}

// ── WRITE PATH ───────────────────────────────────────────────────────────────

/**
 * Map shared Style back to Canva's fontStyle + textAlign format.
 *
 * Inverse of mapCanvaToStyle — used in the WRITE path.
 */
export function mapStyleToCanva(style: SharedStyle): {
  fontStyle: { family: string; weight: number };
  textAlign: 'start' | 'center' | 'end';
  fontSize: number;
} {
  return {
    fontStyle: {
      family: style.fontFamily,
      // Figma "Bold" → 700, "Regular" → 400
      weight: style.fontWeight === 'Bold' ? 700 : 400,
    },
    // Figma "LEFT" → "start", "CENTER" → "center", "RIGHT" → "end"
    textAlign:
      style.textAlignHorizontal === 'LEFT'   ? 'start'
      : style.textAlignHorizontal === 'CENTER' ? 'center'
      : 'end',
    fontSize: style.fontSize,
  };
}

/**
 * Write enhanced content back to Canva canvas.
 *
 * In real Canva app: calls setContent() / addNativeElement() from @canva/design.
 * Here we accept a mock writer for testability (no Canva SDK in test environment).
 *
 * The mock writer interface matches @canva/design's setContent signature.
 */
export async function writeToCanvas(
  enhanced: CanvaEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<CanvaAdapterWriteResult> {
  let written = 0;
  let failed = 0;

  for (const item of enhanced) {
    try {
      const canvaStyle = mapStyleToCanva(item.style);
      await writer({
        type: 'TEXT',
        children: [
          {
            text: item.content,
            fontStyle: canvaStyle.fontStyle,
            textAlign: canvaStyle.textAlign,
            fontSize: canvaStyle.fontSize,
          },
        ],
      });
      written++;
    } catch {
      failed++;
    }
  }

  return { written, failed };
}
