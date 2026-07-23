/**
 * FLOW-34 — S1 Shopify Product Copy Generator Adapter Tests
 * 26 tests: S1-R-1..10, S1-W-1..8, S1-E-1..4, S1-P-1..4
 */

import {
  mapShopifyToProductElement,
  mapShopifyToProductStyle,
  mapProductStyleToShopify,
  readProductCatalog,
  writeProductCopy,
} from '../.././../adapters/shopify/FT-S1/src/shopify-adapter';
import type {
  ShopifyProduct,
  SharedProductStyle,
  SharedProductElement,
} from '../../../adapters/shopify/FT-S1/src/types';

function makeShopifyProduct(overrides: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    id: 'prod-001',
    title: 'Wireless Headphones',
    description: 'Premium audio.',
    handle: 'wireless-headphones',
    productType: 'Electronics',
    tags: [],
    vendor: 'XIIGen',
    variants: [{ id: 'var-001', price: '199.99', sku: 'WH-001', inventoryQuantity: 50 }],
    images: [],
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedProductElement = {
  type: 'PRODUCT',
  title: 'Wireless Headphones',
  description: 'Premium audio.',
  productType: 'Electronics',
};
const CANONICAL_STYLE: SharedProductStyle = {
  tone: 'professional',
  maxLength: 500,
  includePricing: true,
};
const COPY_OUTPUT = {
  generatedTitle: 'Premium Wireless Headphones',
  generatedDescription: 'Experience crystal-clear audio.',
};

// ── READ: mapShopifyToProductElement (S1-R-1..5) ──────────────────────────────

describe('FLOW-34 S1 — READ path: mapShopifyToProductElement', () => {
  it('S1-R-1: type is always PRODUCT', () => {
    expect(mapShopifyToProductElement(makeShopifyProduct()).type).toBe('PRODUCT');
  });
  it('S1-R-2: title preserved', () => {
    expect(mapShopifyToProductElement(makeShopifyProduct({ title: 'Smart Watch' })).title).toBe(
      'Smart Watch',
    );
  });
  it('S1-R-3: description preserved', () => {
    expect(
      mapShopifyToProductElement(makeShopifyProduct({ description: 'Track everything.' }))
        .description,
    ).toBe('Track everything.');
  });
  it('S1-R-4: productType preserved', () => {
    expect(
      mapShopifyToProductElement(makeShopifyProduct({ productType: 'Wearables' })).productType,
    ).toBe('Wearables');
  });
  it('S1-R-5: handle not included in shared element', () => {
    const el = mapShopifyToProductElement(makeShopifyProduct());
    expect('handle' in el).toBe(false);
  });
});

// ── READ: mapShopifyToProductStyle (S1-R-6..10) ───────────────────────────────

describe('FLOW-34 S1 — READ path: mapShopifyToProductStyle', () => {
  it('S1-R-6: tone always professional', () => {
    expect(mapShopifyToProductStyle(makeShopifyProduct()).tone).toBe('professional');
  });
  it('S1-R-7: maxLength always 500', () => {
    expect(mapShopifyToProductStyle(makeShopifyProduct()).maxLength).toBe(500);
  });
  it('S1-R-8: includePricing true when variants present', () => {
    expect(mapShopifyToProductStyle(makeShopifyProduct()).includePricing).toBe(true);
  });
  it('S1-R-9: includePricing false when no variants', () => {
    expect(mapShopifyToProductStyle(makeShopifyProduct({ variants: [] })).includePricing).toBe(
      false,
    );
  });
  it('S1-R-10: multiple variants still includePricing true', () => {
    const product = makeShopifyProduct({
      variants: [
        { id: 'v1', price: '99.99', sku: 'S', inventoryQuantity: 10 },
        { id: 'v2', price: '149.99', sku: 'M', inventoryQuantity: 5 },
      ],
    });
    expect(mapShopifyToProductStyle(product).includePricing).toBe(true);
  });
});

// ── WRITE: mapProductStyleToShopify (S1-W-1..4) ───────────────────────────────

describe('FLOW-34 S1 — WRITE path: mapProductStyleToShopify', () => {
  it('S1-W-1: includePricing passes through', () => {
    expect(
      mapProductStyleToShopify({ ...CANONICAL_STYLE, includePricing: false }).includePricing,
    ).toBe(false);
  });
  it('S1-W-2: maxLength passes through', () => {
    expect(mapProductStyleToShopify({ ...CANONICAL_STYLE, maxLength: 250 }).maxLength).toBe(250);
  });
  it('S1-W-3: tone not in write config (generation param only)', () => {
    const config = mapProductStyleToShopify(CANONICAL_STYLE);
    expect('tone' in config).toBe(false);
  });
  it('S1-W-4: includePricing true preserves in config', () => {
    expect(
      mapProductStyleToShopify({ ...CANONICAL_STYLE, includePricing: true }).includePricing,
    ).toBe(true);
  });
});

// ── WRITE: writeProductCopy (S1-W-5..8) ───────────────────────────────────────

describe('FLOW-34 S1 — WRITE path: writeProductCopy', () => {
  it('S1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeProductCopy(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, copy: COPY_OUTPUT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('S1-W-6: payload type=PRODUCT_UPDATE, generatedTitle, generatedDescription, tone', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeProductCopy(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, copy: COPY_OUTPUT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('PRODUCT_UPDATE');
    expect(payload['title']).toBe('Premium Wireless Headphones');
    expect(payload['description']).toBe('Experience crystal-clear audio.');
    expect(payload['tone']).toBe('professional');
    expect(payload['includePricing']).toBe(true);
  });
  it('S1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Shopify API error'));
    const result = await writeProductCopy(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, copy: COPY_OUTPUT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('S1-W-8: writes multiple products in order', async () => {
    const titles: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      titles.push(p['title'] as string);
    });
    await writeProductCopy(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          copy: { generatedTitle: 'Product A Copy', generatedDescription: 'Desc A' },
        },
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          copy: { generatedTitle: 'Product B Copy', generatedDescription: 'Desc B' },
        },
      ],
      writer,
    );
    expect(titles).toEqual(['Product A Copy', 'Product B Copy']);
  });
});

// ── Equivalence (S1-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 S1 — Equivalence: adapter output = shared canonical', () => {
  const product = makeShopifyProduct();
  it('S1-E-1: mapShopifyToProductElement output identical to canonical element', () => {
    expect(mapShopifyToProductElement(product)).toEqual(CANONICAL_ELEMENT);
  });
  it('S1-E-2: mapShopifyToProductStyle output identical to canonical style', () => {
    expect(mapShopifyToProductStyle(product)).toEqual(CANONICAL_STYLE);
  });
  it('S1-E-3: readProductCatalog arrays match canonical shapes', () => {
    const { elements, styles } = readProductCatalog([product]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('S1-E-4: READ→WRITE round-trip preserves includePricing and maxLength', () => {
    const shared = mapShopifyToProductStyle(product);
    const config = mapProductStyleToShopify(shared);
    expect(config.includePricing).toBe(shared.includePricing);
    expect(config.maxLength).toBe(shared.maxLength);
  });
});

// ── Packaging (S1-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 S1 — Packaging + manifest checks', () => {
  it('S1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapShopifyToProductElement).toBe('function');
    expect(typeof mapShopifyToProductStyle).toBe('function');
    expect(typeof mapProductStyleToShopify).toBe('function');
    expect(typeof readProductCatalog).toBe('function');
    expect(typeof writeProductCopy).toBe('function');
  });
  it('S1-P-2: adapter importable without @shopify/polaris', () => {
    expect(mapShopifyToProductElement).toBeDefined();
  });
  it('S1-P-3: package.json name follows @xiigen/shopify-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/shopify/FT-S1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/shopify-/);
  });
  it('S1-P-4: FT-S1 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftS1 = manifest.features.find((f) => f.ftId === 'FT-S1');
    expect(ftS1).toBeDefined();
    expect(ftS1!.portingCandidate).toBe(true);
    const shopify = ftS1!.platforms.find((p) => p.platformId === 'shopify');
    expect(shopify).toBeDefined();
    expect(shopify!.adapterMode).toBe('MODE_B');
    expect(shopify!.adapterPath).toContain('FT-S1');
  });
});
