/**
 * FT-W1 — Webflow CMS Content Generator Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Webflow Apps SDK.
 * Maps Webflow CMS items → shared AI content generation engine model.
 * 90% shared content engine is UNCHANGED from platform to platform.
 *
 * FLOW-34 FC-26: API mapping — Webflow CMS items → shared content model.
 *
 * Property mapping (Webflow → Shared):
 *   item.name              → SharedCmsElement.name
 *   item.slug              → SharedCmsElement.slug
 *   item.collectionName    → SharedCmsElement.collectionName
 *   item.status 'draft'    → SharedCmsElement.status 'DRAFT'
 *   item.status 'published'→ SharedCmsElement.status 'PUBLISHED'
 *   item.status 'archived' → SharedCmsElement.status 'ARCHIVED'
 *   (editorial default)    → SharedCmsStyle.contentLength 'medium'
 *   (editorial default)    → SharedCmsStyle.contentTone 'informative'
 */

import type {
  WebflowCmsItem,
  SharedCmsElement,
  SharedCmsStyle,
  CmsWritePayload,
  CmsAdapterReadResult,
  CmsAdapterWriteResult,
  CmsEnhancedOutput,
} from './types';

const STATUS_MAP: Record<WebflowCmsItem['status'], SharedCmsElement['status']> = {
  draft: 'DRAFT',
  published: 'PUBLISHED',
  archived: 'ARCHIVED',
};

const STATUS_TO_WEBFLOW: Record<SharedCmsElement['status'], WebflowCmsItem['status']> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

export function mapWebflowToContentElement(item: WebflowCmsItem): SharedCmsElement {
  return {
    type: 'CMS_ITEM',
    name: item.name,
    slug: item.slug,
    status: STATUS_MAP[item.status],
    collectionName: item.collectionName,
  };
}

export function mapWebflowToContentStyle(_item: WebflowCmsItem): SharedCmsStyle {
  return {
    contentLength: 'medium',
    contentTone: 'informative',
    itemType: 'CMS_ITEM',
  };
}

export function mapCmsStyleToWebflow(style: SharedCmsStyle): CmsWritePayload {
  return {
    contentLength: style.contentLength,
    contentTone: style.contentTone,
  };
}

export function readCmsCollection(items: WebflowCmsItem[]): CmsAdapterReadResult {
  return {
    elements: items.map(mapWebflowToContentElement),
    styles: items.map(mapWebflowToContentStyle),
    sourceItems: items,
  };
}

export async function writeCmsContent(
  outputs: CmsEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<CmsAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const payload = mapCmsStyleToWebflow(output.style);
      await writer({
        type: 'CMS_UPDATE',
        slug: output.element.slug,
        name: output.element.name,
        status: STATUS_TO_WEBFLOW[output.element.status],
        content: output.generatedContent,
        contentLength: payload.contentLength,
        contentTone: payload.contentTone,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
