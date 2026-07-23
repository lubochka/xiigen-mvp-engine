/**
 * C5 Canva Text Elements Adapter — domain types.
 *
 * FT-C5 | FLOW-34 | adapterMode: MODE-B-thin
 *
 * These types bridge Canva's API surface to XIIGen's shared CSS engine model.
 * The shared engine (Layer 2) is UNCHANGED — only this translation layer (Layer 3) differs
 * from the Figma plugin.
 *
 * D-STACK-8: Business logic stays in Mode A (XIIGen). Adapter is Mode B (Canva platform).
 */
/**
 * Canva text element as returned by the selection API.
 * Subset of TextElement from @canva/design relevant to CSS extraction.
 */
export interface CanvaTextElement {
    /** Canva's internal element ID */
    id: string;
    /** Text content */
    content: string;
    /** Font size in px */
    fontSize: number;
    /** Font family + weight */
    fontStyle: {
        family: string;
        /** 400 = Regular, 700 = Bold */
        weight: number;
    };
    /** Horizontal alignment */
    textAlign: 'start' | 'center' | 'end';
    /** Text color in 0–255 RGB */
    color: {
        r: number;
        g: number;
        b: number;
    };
    /** Element dimensions in px */
    width: number;
    height: number;
}
/**
 * Shared Element model fed into the CSS generation engine (Layer 2).
 * This shape is identical to what the Figma plugin produces — the engine is unaware
 * of which platform produced it.
 */
export interface SharedElement {
    type: 'TEXT';
    characters: string;
    width: number;
    height: number;
}
/**
 * Shared Style model fed into the CSS generation engine (Layer 2).
 * Uses Figma naming conventions as the canonical reference (engine was built for Figma).
 * canva-adapter.ts translates Canva values into this shape.
 */
export interface SharedStyle {
    fontSize: number;
    fontFamily: string;
    /** "Bold" | "Regular" — Figma convention */
    fontWeight: 'Bold' | 'Regular';
    /** "LEFT" | "CENTER" | "RIGHT" — Figma convention */
    textAlignHorizontal: 'LEFT' | 'CENTER' | 'RIGHT';
    /** CSS rgb() string */
    color: string;
}
export interface CanvaAdapterReadResult {
    elements: SharedElement[];
    styles: SharedStyle[];
    sourceElements: CanvaTextElement[];
}
export interface CanvaAdapterWriteResult {
    written: number;
    failed: number;
}
export interface CanvaEnhancedOutput {
    content: string;
    style: SharedStyle;
}
//# sourceMappingURL=types.d.ts.map