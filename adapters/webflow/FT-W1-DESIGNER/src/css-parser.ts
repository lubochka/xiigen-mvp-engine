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

// ── border ────────────────────────────────────────────────────────────────────

/**
 * Parse `border` shorthand into border-width / border-style / border-color.
 *
 * Handles:
 *   3-token: "1px solid #000"    → width + style + color
 *   2-token: "1px solid"         → width + style, color defaults to `initial`
 *   1-token: "none" / "initial"  → returned as border-style only
 */
export function parseBorder(value: string): PropertyMap {
  const tokens = value.trim().split(/\s+/);

  if (tokens.length >= 3) {
    return {
      'border-width': tokens[0]!,
      'border-style': tokens[1]!,
      'border-color': tokens.slice(2).join(' '),
    };
  }

  if (tokens.length === 2) {
    // GAP-ENG-1: 2-token format — default color to `initial`
    return {
      'border-width': tokens[0]!,
      'border-style': tokens[1]!,
      'border-color': 'initial',
    };
  }

  // 1-token: "none", "initial", etc.
  return { 'border-style': tokens[0]! };
}

// ── font ──────────────────────────────────────────────────────────────────────

/**
 * Parse `font` shorthand.
 *
 * Spec: font-style? font-variant? font-weight? font-size[/line-height]? font-family
 *
 * GAP-ENG-1: handles `font-size/line-height` slash notation (e.g. "16px/24px").
 * The slash is part of the size token — we split it to extract both values.
 */
export function parseFont(value: string): PropertyMap {
  const result: PropertyMap = {};
  const tokens = value.trim().split(/\s+/);

  for (const token of tokens) {
    // Numeric weight (100–900) or named weight
    if (/^(bold|bolder|lighter|[1-9]00)$/i.test(token)) {
      result['font-weight'] = token;
      continue;
    }
    // font-style
    if (/^(italic|oblique|normal)$/i.test(token)) {
      result['font-style'] = token;
      continue;
    }
    // font-variant
    if (/^(small-caps)$/i.test(token)) {
      result['font-variant'] = token;
      continue;
    }
    // GAP-ENG-1: size/line-height slash notation
    if (token.includes('/')) {
      const [fontSize, lineHeight] = token.split('/');
      if (fontSize) result['font-size'] = fontSize;
      if (lineHeight) result['line-height'] = lineHeight;
      continue;
    }
    // Bare size value (px, em, rem, %)
    if (/^\d/.test(token) || token.endsWith('px') || token.endsWith('em') || token.endsWith('%')) {
      result['font-size'] = token;
      continue;
    }
    // Everything else is font-family (may contain spaces in multi-token values)
    result['font-family'] = (result['font-family'] ? result['font-family'] + ' ' : '') + token;
  }

  return result;
}

// ── padding / margin ──────────────────────────────────────────────────────────

/**
 * Parse `padding` or `margin` shorthand (1–4 token CSS box model).
 */
export function parseBoxSpacing(property: 'padding' | 'margin', value: string): PropertyMap {
  const tokens = value.trim().split(/\s+/);
  const [top, right, bottom, left] = tokens;

  if (tokens.length === 1) {
    return {
      [`${property}-top`]: top!,
      [`${property}-right`]: top!,
      [`${property}-bottom`]: top!,
      [`${property}-left`]: top!,
    };
  }
  if (tokens.length === 2) {
    return {
      [`${property}-top`]: top!,
      [`${property}-right`]: right!,
      [`${property}-bottom`]: top!,
      [`${property}-left`]: right!,
    };
  }
  if (tokens.length === 3) {
    return {
      [`${property}-top`]: top!,
      [`${property}-right`]: right!,
      [`${property}-bottom`]: bottom!,
      [`${property}-left`]: right!,
    };
  }
  // 4 tokens
  return {
    [`${property}-top`]: top!,
    [`${property}-right`]: right!,
    [`${property}-bottom`]: bottom!,
    [`${property}-left`]: left!,
  };
}

// ── box-shadow ────────────────────────────────────────────────────────────────

/**
 * Parse `box-shadow` shorthand — supports multi-shadow comma-separated lists.
 *
 * GAP-ENG-1: split on comma ONLY when outside parentheses (e.g. rgba(...) contains commas).
 * Each shadow is returned as-is; the combined value is joined with ", ".
 */
export function parseShadow(value: string): PropertyMap {
  if (!value || value === 'none') {
    return { 'box-shadow': 'none' };
  }

  // Split on commas that are NOT inside parentheses (handles rgba(r,g,b,a))
  const shadows = splitOnCommaOutsideParens(value);

  // Normalise whitespace within each shadow, then rejoin
  const normalised = shadows.map(s => s.trim()).filter(Boolean);

  return { 'box-shadow': normalised.join(', ') };
}

/**
 * Split a string on commas that are not inside parentheses.
 * e.g. "0 0 4px rgba(0,0,0,0.5), 0 2px 8px #000" → 2 parts.
 */
function splitOnCommaOutsideParens(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

// ── main dispatcher ───────────────────────────────────────────────────────────

/**
 * Expand any shorthand properties in a Webflow PropertyMap into discrete fields.
 * Non-shorthand properties pass through unchanged.
 */
export function expandShorthands(input: PropertyMap): PropertyMap {
  const result: PropertyMap = {};

  for (const [key, value] of Object.entries(input)) {
    let expanded: PropertyMap | null = null;

    switch (key) {
      case 'border':
        expanded = parseBorder(value);
        break;
      case 'font':
        expanded = parseFont(value);
        break;
      case 'padding':
        expanded = parseBoxSpacing('padding', value);
        break;
      case 'margin':
        expanded = parseBoxSpacing('margin', value);
        break;
      case 'box-shadow':
        expanded = parseShadow(value);
        break;
      default:
        result[key] = value;
    }

    if (expanded) {
      Object.assign(result, expanded);
    }
  }

  return result;
}
