/**
 * FT-S1 — Shopify Product Copy Generator Adapter Types
 *
 * Layer 3 (STACK_COUPLED) domain types for the Shopify Apps platform.
 * Shared AI copy engine types are platform-neutral.
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Shopify Polaris + GraphQL constraint).
 * FLOW-34 FC-28: Shopify review timeline = 2–4 weeks (buffer required).
 */

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  tags: string[];
  vendor: string;
  variants: Array<{ id: string; price: string; sku: string; inventoryQuantity: number }>;
  images: Array<{ src: string; altText: string }>;
}

export interface SharedProductElement {
  type: 'PRODUCT';
  title: string;
  description: string;
  productType: string;
}

export interface SharedProductStyle {
  tone: 'professional' | 'friendly' | 'minimal';
  maxLength: number;
  includePricing: boolean;
}

export interface ProductWriteConfig {
  includePricing: boolean;
  maxLength: number;
}

export interface ProductCopyOutput {
  generatedTitle: string;
  generatedDescription: string;
}

export interface ProductAdapterReadResult {
  elements: SharedProductElement[];
  styles: SharedProductStyle[];
  sourceProducts: ShopifyProduct[];
}

export interface ProductAdapterWriteResult {
  written: number;
  failed: number;
}

export interface ProductEnhancedOutput {
  element: SharedProductElement;
  style: SharedProductStyle;
  copy: ProductCopyOutput;
}
