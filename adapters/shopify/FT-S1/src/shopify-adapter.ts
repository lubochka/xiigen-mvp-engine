/**
 * FT-S1 — Shopify Product Copy Generator Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Shopify Apps (Polaris + GraphQL).
 * Maps Shopify product objects → shared AI copy engine model.
 * 90% shared copy engine is UNCHANGED from platform to platform.
 *
 * FLOW-34 FC-26: API mapping — Shopify products → shared copy model.
 *
 * Property mapping (Shopify → Shared):
 *   product.title         → SharedProductElement.title
 *   product.description   → SharedProductElement.description
 *   product.productType   → SharedProductElement.productType
 *   product.variants.length > 0 → SharedProductStyle.includePricing true
 *   (plugin purpose)      → SharedProductStyle.tone 'professional'
 *   (editorial default)   → SharedProductStyle.maxLength 500
 */

import type {
  ShopifyProduct,
  SharedProductElement,
  SharedProductStyle,
  ProductWriteConfig,
  ProductAdapterReadResult,
  ProductAdapterWriteResult,
  ProductEnhancedOutput,
} from './types';

export function mapShopifyToProductElement(product: ShopifyProduct): SharedProductElement {
  return {
    type: 'PRODUCT',
    title: product.title,
    description: product.description,
    productType: product.productType,
  };
}

export function mapShopifyToProductStyle(product: ShopifyProduct): SharedProductStyle {
  return {
    tone: 'professional',
    maxLength: 500,
    includePricing: product.variants.length > 0,
  };
}

export function mapProductStyleToShopify(style: SharedProductStyle): ProductWriteConfig {
  return {
    includePricing: style.includePricing,
    maxLength: style.maxLength,
  };
}

export function readProductCatalog(products: ShopifyProduct[]): ProductAdapterReadResult {
  return {
    elements: products.map(mapShopifyToProductElement),
    styles: products.map(mapShopifyToProductStyle),
    sourceProducts: products,
  };
}

export async function writeProductCopy(
  outputs: ProductEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<ProductAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const config = mapProductStyleToShopify(output.style);
      await writer({
        type: 'PRODUCT_UPDATE',
        title: output.copy.generatedTitle,
        description: output.copy.generatedDescription,
        tone: output.style.tone,
        includePricing: config.includePricing,
        maxLength: config.maxLength,
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
