// FT-W2 — Wix Alt-Text Generator — Layer 3: STACK_COUPLED
// No Wix SDK import at module level — injected writer pattern throughout.

import type {
  WixImageComponent, SharedAltTextElement, SharedAltTextStyle,
  AltTextReadResult, AltTextOutput, AltTextWriteResult,
} from './types';

const WIX_TYPE_MAP: Record<WixImageComponent['type'], SharedAltTextElement['type']> = {
  WPhoto: 'PHOTO',
  SlideShowGallery: 'GALLERY_ITEM',
  MatrixGallery: 'GALLERY_ITEM',
  WRichText: 'DECORATIVE',
};

function inferAltLength(comp: WixImageComponent): SharedAltTextStyle['altLength'] {
  if (comp.width >= 1200) return 'detailed';
  if (comp.width >= 600) return 'medium';
  return 'short';
}

function inferTone(type: SharedAltTextElement['type']): SharedAltTextStyle['tone'] {
  if (type === 'DECORATIVE') return 'decorative';
  if (type === 'GALLERY_ITEM') return 'descriptive';
  return 'functional';
}

export function mapWixToAltTextElement(comp: WixImageComponent): SharedAltTextElement {
  return {
    type: WIX_TYPE_MAP[comp.type],
    src: comp.src,
    currentAlt: comp.alt,
    title: comp.title,
    pageSection: comp.pageSection,
    width: comp.width,
    height: comp.height,
  };
}

export function mapWixToAltTextStyle(comp: WixImageComponent): SharedAltTextStyle {
  const imageType = WIX_TYPE_MAP[comp.type];
  return {
    altLength: inferAltLength(comp),
    tone: inferTone(imageType),
    imageType,
  };
}

export function mapAltTextStyleToWix(style: SharedAltTextStyle): Partial<WixImageComponent> {
  const TYPE_BACK: Record<SharedAltTextStyle['imageType'], WixImageComponent['type']> = {
    PHOTO: 'WPhoto',
    GALLERY_ITEM: 'SlideShowGallery',
    DECORATIVE: 'WRichText',
  };
  return { type: TYPE_BACK[style.imageType] };
}

export function readImageComponents(components: WixImageComponent[]): AltTextReadResult {
  return {
    elements: components.map(mapWixToAltTextElement),
    styles: components.map(mapWixToAltTextStyle),
    sourceComponents: components,
  };
}

export async function writeAltText(
  outputs: AltTextOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<AltTextWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapAltTextStyleToWix(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'ALT_TEXT_UPDATE',
        src: output.element.src,
        alt: output.generatedAlt,
        altLength: output.style.altLength,
        tone: output.style.tone,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
