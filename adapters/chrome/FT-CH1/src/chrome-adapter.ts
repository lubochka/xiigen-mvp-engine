// FT-CH1 — Chrome AI Page Analyzer — Layer 3: STACK_COUPLED
// No chrome.* API import at module level — injected writer pattern throughout.

import type {
  ChromeDOMElement, SharedPageElement, SharedPageStyle,
  PageReadResult, PageAnalysisOutput, PageWriteResult,
} from './types';

function tagToType(tag: string): SharedPageElement['type'] {
  const t = tag.toUpperCase();
  if (t === 'H1' || t === 'H2' || t === 'H3' || t === 'H4' || t === 'H5' || t === 'H6') return 'HEADING';
  if (t === 'P') return 'PARAGRAPH';
  if (t === 'IMG') return 'IMAGE';
  if (t === 'BUTTON') return 'CTA';
  if (t === 'A') return 'LINK';
  return 'SECTION';
}

function headingLevel(tag: string): number | undefined {
  const match = tag.toUpperCase().match(/^H([1-6])$/);
  return match ? parseInt(match[1], 10) : undefined;
}

function inferImportance(el: ChromeDOMElement): SharedPageStyle['importance'] {
  const tag = el.tagName.toUpperCase();
  if (tag === 'H1' || tag === 'BUTTON') return 'HIGH';
  if (tag === 'H2' || tag === 'H3' || tag === 'A') return 'MEDIUM';
  return 'LOW';
}

function inferDensity(el: ChromeDOMElement): SharedPageStyle['contentDensity'] {
  const length = el.textContent?.length ?? 0;
  if (length > 500) return 'dense';
  if (length > 100) return 'normal';
  return 'sparse';
}

export function mapDOMToPageElement(el: ChromeDOMElement): SharedPageElement {
  return {
    type: tagToType(el.tagName),
    content: el.textContent,
    src: el.src,
    href: el.href,
    level: headingLevel(el.tagName),
  };
}

export function mapDOMToPageStyle(el: ChromeDOMElement): SharedPageStyle {
  return {
    elementRole: tagToType(el.tagName),
    importance: inferImportance(el),
    contentDensity: inferDensity(el),
  };
}

export function mapPageStyleToDOM(style: SharedPageStyle): Partial<ChromeDOMElement> {
  const TAG_MAP: Record<SharedPageStyle['elementRole'], string> = {
    HEADING: 'H1',
    PARAGRAPH: 'P',
    IMAGE: 'IMG',
    CTA: 'BUTTON',
    LINK: 'A',
    SECTION: 'SECTION',
  };
  return { tagName: TAG_MAP[style.elementRole] };
}

export function readPageDOM(elements: ChromeDOMElement[]): PageReadResult {
  return {
    elements: elements.map(mapDOMToPageElement),
    styles: elements.map(mapDOMToPageStyle),
    sourceDOMElements: elements,
  };
}

export async function writePageAnalysis(
  outputs: PageAnalysisOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<PageWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const base = mapPageStyleToDOM(output.style) as Record<string, unknown>;
      await writer({
        ...base,
        type: 'PAGE_ANALYSIS',
        elementRole: output.style.elementRole,
        importance: output.style.importance,
        content: output.element.content,
        issues: output.analysisResult.issues,
        suggestions: output.analysisResult.suggestions,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
