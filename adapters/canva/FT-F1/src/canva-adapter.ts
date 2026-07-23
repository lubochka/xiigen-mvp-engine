/**
 * FT-F1 — Canva Site Generator Adapter
 *
 * Layer 3 STACK_COUPLED adapter — only file that differs from Figma plugin.
 * 90% shared site generation engine (site-builder.ts, element-tree.ts) is UNCHANGED.
 *
 * Three-layer architecture:
 *   Layer 1 CONCEPT_NEUTRAL: @xiigen/plugin-sdk:platform (auth, AI gateway, freemium)
 *   Layer 2 IMPL_VARIES:     Shared site generation engine (site-builder.ts, element-tree.ts)
 *   Layer 3 STACK_COUPLED:   THIS FILE — Canva API surface only
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Canva sandbox constraint — Vite not supported).
 * FLOW-34 FC-26: API mapping — Canva design elements → shared site generation model.
 *
 * Property mapping (Canva → Shared):
 *   element.type 'TEXT'    → SharedSiteElement.type 'TEXT_NODE'
 *   element.type 'IMAGE'   → SharedSiteElement.type 'IMAGE_NODE'
 *   element.type 'FRAME'   → SharedSiteElement.type 'CONTAINER'  + layout 'flex'
 *   element.type 'SHAPE'   → SharedSiteElement.type 'SECTION'    + layout 'block'
 *   element.content        → SharedSiteElement.content
 *   element.src            → SharedSiteElement.src
 *   element.position.x/y  → SharedSiteElement.x/y
 *   element.width/height   → SharedSiteElement.width/height
 *   element.backgroundColor → SharedSiteStyle.backgroundColor
 */

import type {
  CanvaDesignElement,
  SharedSiteElement,
  SharedSiteStyle,
  SiteAdapterReadResult,
  SiteAdapterWriteResult,
  SiteEnhancedOutput,
} from './types';

const CANVA_TYPE_MAP: Record<CanvaDesignElement['type'], SharedSiteElement['type']> = {
  TEXT: 'TEXT_NODE',
  IMAGE: 'IMAGE_NODE',
  FRAME: 'CONTAINER',
  SHAPE: 'SECTION',
};

const SHARED_TYPE_TO_CANVA: Record<SharedSiteElement['type'], CanvaDesignElement['type']> = {
  TEXT_NODE: 'TEXT',
  IMAGE_NODE: 'IMAGE',
  CONTAINER: 'FRAME',
  SECTION: 'SHAPE',
};

export function mapCanvaToSiteElement(el: CanvaDesignElement): SharedSiteElement {
  const result: SharedSiteElement = {
    type: CANVA_TYPE_MAP[el.type],
    width: el.width,
    height: el.height,
    x: el.position.x,
    y: el.position.y,
  };
  if (el.content !== undefined) result.content = el.content;
  if (el.src !== undefined) result.src = el.src;
  return result;
}

export function mapCanvaToSiteStyle(el: CanvaDesignElement): SharedSiteStyle {
  return {
    backgroundColor: el.backgroundColor,
    width: el.width,
    height: el.height,
    layout: el.type === 'FRAME' ? 'flex' : 'block',
  };
}

export function mapSiteStyleToCanva(style: SharedSiteStyle): Partial<CanvaDesignElement> {
  return {
    backgroundColor: style.backgroundColor,
    width: style.width,
    height: style.height,
    type: style.layout === 'flex' ? 'FRAME' : SHARED_TYPE_TO_CANVA['SECTION'],
  };
}

export function readDesignForSite(elements: CanvaDesignElement[]): SiteAdapterReadResult {
  return {
    elements: elements.map(mapCanvaToSiteElement),
    styles: elements.map(mapCanvaToSiteStyle),
    sourceElements: elements,
  };
}

export async function writeGeneratedSite(
  outputs: SiteEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<SiteAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      await writer({
        type: 'SITE_EXPORT',
        html: output.generated.html,
        css: output.generated.css,
        element: output.element,
        timestamp: Date.now(),
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
