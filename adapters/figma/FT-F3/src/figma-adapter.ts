// FT-F3 — Figma Design System Auditor — Layer 3: STACK_COUPLED
// No Figma Plugin API import at module level — injected writer pattern throughout.

import type {
  FigmaDesignToken, SharedTokenElement, SharedTokenStyle,
  DesignSystemReadResult, AuditOutput, AuditWriteResult,
} from './types';

const FIGMA_TYPE_MAP: Record<FigmaDesignToken['type'], SharedTokenElement['type']> = {
  COMPONENT: 'COMPONENT',
  FRAME: 'FRAME',
  TEXT: 'TEXT',
  RECTANGLE: 'SHAPE',
  GROUP: 'GROUP',
};

function inferTokenCategory(node: FigmaDesignToken): SharedTokenElement['tokenCategory'] {
  if (node.type === 'TEXT' || node.fontName) return 'TYPOGRAPHY';
  if (node.type === 'COMPONENT') return 'COMPONENT';
  if (node.fills.length > 0) return 'COLOR';
  return 'SPACING';
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function mapFigmaToTokenElement(node: FigmaDesignToken): SharedTokenElement {
  return {
    type: FIGMA_TYPE_MAP[node.type],
    name: node.name,
    tokenCategory: inferTokenCategory(node),
    width: node.width,
    height: node.height,
  };
}

export function mapFigmaToTokenStyle(node: FigmaDesignToken): SharedTokenStyle {
  const fill = node.fills[0];
  const colorHex = fill ? rgbToHex(fill.color.r, fill.color.g, fill.color.b) : '#000000';
  return {
    colorHex,
    fontFamily: node.fontName?.family,
    fontStyle: node.fontName?.style,
    fontSize: node.fontSize ?? 0,
    tokenType: inferTokenCategory(node),
  };
}

export function mapTokenStyleToFigma(style: SharedTokenStyle): Partial<FigmaDesignToken> & { fontSize?: number } {
  return {
    fontSize: style.fontSize > 0 ? style.fontSize : undefined,
    fontName: style.fontFamily
      ? { family: style.fontFamily, style: style.fontStyle ?? 'Regular' }
      : undefined,
  };
}

export function readDesignSystem(nodes: FigmaDesignToken[]): DesignSystemReadResult {
  return {
    elements: nodes.map(mapFigmaToTokenElement),
    styles: nodes.map(mapFigmaToTokenStyle),
    sourceTokens: nodes,
  };
}

export async function writeAuditResults(
  outputs: AuditOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<AuditWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapTokenStyleToFigma(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'DESIGN_AUDIT',
        name: output.element.name,
        tokenType: output.element.tokenCategory,
        colorHex: output.style.colorHex,
        score: output.auditResult.score,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
