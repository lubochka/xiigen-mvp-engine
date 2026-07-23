/**
 * FT-W1 — Webflow CMS Content Generator Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Webflow Apps platform.
 * Shared AI content generation engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Webflow Apps SDK constraint).
 */

export interface WebflowCmsItem {
  id: string;
  slug: string;
  name: string;
  fieldData: Record<string, string>;
  collectionId: string;
  collectionName: string;
  status: 'draft' | 'published' | 'archived';
}

export interface SharedCmsElement {
  type: 'CMS_ITEM';
  name: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  collectionName: string;
}

export interface SharedCmsStyle {
  contentLength: 'short' | 'medium' | 'long';
  contentTone: 'informative' | 'persuasive' | 'casual';
  itemType: 'CMS_ITEM';
}

export interface CmsWritePayload {
  contentLength: SharedCmsStyle['contentLength'];
  contentTone: SharedCmsStyle['contentTone'];
}

export interface CmsAdapterReadResult {
  elements: SharedCmsElement[];
  styles: SharedCmsStyle[];
  sourceItems: WebflowCmsItem[];
}

export interface CmsAdapterWriteResult {
  written: number;
  failed: number;
}

export interface CmsEnhancedOutput {
  element: SharedCmsElement;
  style: SharedCmsStyle;
  generatedContent: string;
}
