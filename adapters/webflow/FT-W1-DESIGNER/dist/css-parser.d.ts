/**
 * css-parser.ts — Webflow Designer Extension (FT-W1-DESIGNER / FLOW-43)
 *
 * Parses CSS shorthand values from Webflow PropertyMap into individual
 * CSS properties that the pipeline (styles.ts) expects as discrete fields.
 *
 * GAP-ENG-1 fixes: edge cases in parseBorder (2-token), parseFont (slash),
 * parseShadow (comma outside parens for multi-shadow).
 *
 * Rules:
 *   - NEVER modifies styles.ts or element-code.ts
 *   - All shorthand parsing happens here only
 *   - Returns {} for any value that cannot be parsed (no throw)
 */
export type PropertyMap = Record<string, string>;
/**
 * Parse `border` shorthand into border-width / border-style / border-color.
 *
 * Handles:
 *   3-token: "1px solid #000"    → width + style + color
 *   2-token: "1px solid"         → width + style, color defaults to `initial`
 *   1-token: "none" / "initial"  → returned as border-style only
 */
export declare function parseBorder(value: string): PropertyMap;
/**
 * Parse `font` shorthand.
 *
 * Spec: font-style? font-variant? font-weight? font-size[/line-height]? font-family
 *
 * GAP-ENG-1: handles `font-size/line-height` slash notation (e.g. "16px/24px").
 * The slash is part of the size token — we split it to extract both values.
 */
export declare function parseFont(value: string): PropertyMap;
/**
 * Parse `padding` or `margin` shorthand (1–4 token CSS box model).
 */
export declare function parseBoxSpacing(property: 'padding' | 'margin', value: string): PropertyMap;
/**
 * Parse `box-shadow` shorthand — supports multi-shadow comma-separated lists.
 *
 * GAP-ENG-1: split on comma ONLY when outside parentheses (e.g. rgba(...) contains commas).
 * Each shadow is returned as-is; the combined value is joined with ", ".
 */
export declare function parseShadow(value: string): PropertyMap;
/**
 * Expand any shorthand properties in a Webflow PropertyMap into discrete fields.
 * Non-shorthand properties pass through unchanged.
 */
export declare function expandShorthands(input: PropertyMap): PropertyMap;
//# sourceMappingURL=css-parser.d.ts.map