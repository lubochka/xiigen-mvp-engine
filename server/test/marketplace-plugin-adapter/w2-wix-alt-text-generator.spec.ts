/**
 * FLOW-34 — W2 Wix Alt-Text Generator Adapter Tests
 * (Master plan: W = Wix prefix. W2 = Alt-Text Generator.)
 * 26 tests: W2-R-1..10, W2-W-1..8, W2-E-1..4, W2-P-1..4
 */

import {
  mapWixToAltTextElement,
  mapWixToAltTextStyle,
  mapAltTextStyleToWix,
  readImageComponents,
  writeAltText,
} from '../../../adapters/wix/FT-W2/src/wix-adapter';
import type {
  WixImageComponent,
  SharedAltTextStyle,
  SharedAltTextElement,
} from '../../../adapters/wix/FT-W2/src/types';

function makeWixImage(overrides: Partial<WixImageComponent> = {}): WixImageComponent {
  return {
    id: 'img-001',
    type: 'WPhoto',
    src: 'wix-media://hero-banner.jpg',
    alt: '',
    title: 'Hero Banner',
    width: 1920,
    height: 600,
    pageSection: 'hero',
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedAltTextElement = {
  type: 'PHOTO',
  src: 'wix-media://hero-banner.jpg',
  currentAlt: '',
  title: 'Hero Banner',
  pageSection: 'hero',
  width: 1920,
  height: 600,
};
const CANONICAL_STYLE: SharedAltTextStyle = {
  altLength: 'detailed',
  tone: 'functional',
  imageType: 'PHOTO',
};
const GENERATED_ALT = 'Hero banner showing a modern design workspace with dark theme';

// ── READ: mapWixToAltTextElement (W2-R-1..5) ──────────────────────────────────

describe('FLOW-34 W2 — READ path: mapWixToAltTextElement', () => {
  it('W2-R-1: WPhoto → PHOTO type', () => {
    expect(mapWixToAltTextElement(makeWixImage({ type: 'WPhoto' })).type).toBe('PHOTO');
  });
  it('W2-R-2: SlideShowGallery/MatrixGallery → GALLERY_ITEM, WRichText → DECORATIVE', () => {
    expect(mapWixToAltTextElement(makeWixImage({ type: 'SlideShowGallery' })).type).toBe(
      'GALLERY_ITEM',
    );
    expect(mapWixToAltTextElement(makeWixImage({ type: 'MatrixGallery' })).type).toBe(
      'GALLERY_ITEM',
    );
    expect(mapWixToAltTextElement(makeWixImage({ type: 'WRichText' })).type).toBe('DECORATIVE');
  });
  it('W2-R-3: src preserved', () => {
    expect(mapWixToAltTextElement(makeWixImage({ src: 'wix-media://product.jpg' })).src).toBe(
      'wix-media://product.jpg',
    );
  });
  it('W2-R-4: currentAlt and title preserved', () => {
    const el = mapWixToAltTextElement(makeWixImage({ alt: 'old alt', title: 'Product Shot' }));
    expect(el.currentAlt).toBe('old alt');
    expect(el.title).toBe('Product Shot');
  });
  it('W2-R-5: pageSection and dimensions preserved', () => {
    const el = mapWixToAltTextElement(
      makeWixImage({ pageSection: 'gallery', width: 800, height: 600 }),
    );
    expect(el.pageSection).toBe('gallery');
    expect(el.width).toBe(800);
    expect(el.height).toBe(600);
  });
});

// ── READ: mapWixToAltTextStyle (W2-R-6..10) ───────────────────────────────────

describe('FLOW-34 W2 — READ path: mapWixToAltTextStyle', () => {
  it('W2-R-6: width >= 1200 → detailed altLength', () => {
    expect(mapWixToAltTextStyle(makeWixImage({ width: 1920 })).altLength).toBe('detailed');
  });
  it('W2-R-7: width 600-1199 → medium altLength', () => {
    expect(mapWixToAltTextStyle(makeWixImage({ width: 800 })).altLength).toBe('medium');
  });
  it('W2-R-8: width < 600 → short altLength', () => {
    expect(mapWixToAltTextStyle(makeWixImage({ width: 300 })).altLength).toBe('short');
  });
  it('W2-R-9: PHOTO → functional tone, GALLERY_ITEM → descriptive tone', () => {
    expect(mapWixToAltTextStyle(makeWixImage({ type: 'WPhoto' })).tone).toBe('functional');
    expect(mapWixToAltTextStyle(makeWixImage({ type: 'SlideShowGallery' })).tone).toBe(
      'descriptive',
    );
  });
  it('W2-R-10: DECORATIVE (WRichText) → decorative tone', () => {
    expect(mapWixToAltTextStyle(makeWixImage({ type: 'WRichText' })).tone).toBe('decorative');
  });
});

// ── WRITE: mapAltTextStyleToWix (W2-W-1..4) ───────────────────────────────────

describe('FLOW-34 W2 — WRITE path: mapAltTextStyleToWix', () => {
  it('W2-W-1: PHOTO → WPhoto type', () => {
    expect(mapAltTextStyleToWix({ ...CANONICAL_STYLE, imageType: 'PHOTO' }).type).toBe('WPhoto');
  });
  it('W2-W-2: GALLERY_ITEM → SlideShowGallery, DECORATIVE → WRichText', () => {
    expect(mapAltTextStyleToWix({ ...CANONICAL_STYLE, imageType: 'GALLERY_ITEM' }).type).toBe(
      'SlideShowGallery',
    );
    expect(mapAltTextStyleToWix({ ...CANONICAL_STYLE, imageType: 'DECORATIVE' }).type).toBe(
      'WRichText',
    );
  });
  it('W2-W-3: only type in write payload (altLength/tone are engine-only)', () => {
    const result = mapAltTextStyleToWix(CANONICAL_STYLE);
    expect('altLength' in result).toBe(false);
    expect('tone' in result).toBe(false);
  });
  it('W2-W-4: GALLERY_ITEM maps to SlideShowGallery (default gallery type)', () => {
    const r = mapAltTextStyleToWix({ ...CANONICAL_STYLE, imageType: 'GALLERY_ITEM' });
    expect(r.type).toBe('SlideShowGallery');
  });
});

// ── WRITE: writeAltText (W2-W-5..8) ───────────────────────────────────────────

describe('FLOW-34 W2 — WRITE path: writeAltText', () => {
  it('W2-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeAltText(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedAlt: GENERATED_ALT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('W2-W-6: payload type=ALT_TEXT_UPDATE, src, alt=generatedAlt, altLength, tone', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeAltText(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedAlt: GENERATED_ALT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('ALT_TEXT_UPDATE');
    expect(payload['src']).toBe('wix-media://hero-banner.jpg');
    expect(payload['alt']).toBe(GENERATED_ALT);
    expect(payload['altLength']).toBe('detailed');
    expect(payload['tone']).toBe('functional');
  });
  it('W2-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Wix API error'));
    const result = await writeAltText(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedAlt: GENERATED_ALT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('W2-W-8: writes multiple images in order', async () => {
    const srcs: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      srcs.push(p['src'] as string);
    });
    await writeAltText(
      [
        {
          element: { ...CANONICAL_ELEMENT, src: 'wix-media://img-a.jpg' },
          style: CANONICAL_STYLE,
          generatedAlt: 'Alt A',
        },
        {
          element: { ...CANONICAL_ELEMENT, src: 'wix-media://img-b.jpg' },
          style: CANONICAL_STYLE,
          generatedAlt: 'Alt B',
        },
      ],
      writer,
    );
    expect(srcs).toEqual(['wix-media://img-a.jpg', 'wix-media://img-b.jpg']);
  });
});

// ── Equivalence (W2-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 W2 — Equivalence: adapter output = shared canonical', () => {
  const img = makeWixImage();
  it('W2-E-1: mapWixToAltTextElement output identical to canonical element', () => {
    expect(mapWixToAltTextElement(img)).toEqual(CANONICAL_ELEMENT);
  });
  it('W2-E-2: mapWixToAltTextStyle output identical to canonical style', () => {
    expect(mapWixToAltTextStyle(img)).toEqual(CANONICAL_STYLE);
  });
  it('W2-E-3: readImageComponents arrays match canonical shapes', () => {
    const { elements, styles } = readImageComponents([img]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('W2-E-4: READ→WRITE round-trip preserves imageType via Wix type', () => {
    const shared = mapWixToAltTextStyle(img);
    const back = mapAltTextStyleToWix(shared);
    expect(back.type).toBe('WPhoto');
  });
});

// ── Packaging (W2-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 W2 — Packaging + manifest checks', () => {
  it('W2-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapWixToAltTextElement).toBe('function');
    expect(typeof mapWixToAltTextStyle).toBe('function');
    expect(typeof mapAltTextStyleToWix).toBe('function');
    expect(typeof readImageComponents).toBe('function');
    expect(typeof writeAltText).toBe('function');
  });
  it('W2-P-2: adapter importable without @wix/sdk', () => {
    expect(mapWixToAltTextElement).toBeDefined();
  });
  it('W2-P-3: package.json name follows @xiigen/wix-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/wix/FT-W2/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/wix-/);
  });
  it('W2-P-4: FT-W2 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftW2 = manifest.features.find((f) => f.ftId === 'FT-W2');
    expect(ftW2).toBeDefined();
    expect(ftW2!.portingCandidate).toBe(true);
    const wix = ftW2!.platforms.find((p) => p.platformId === 'wix');
    expect(wix).toBeDefined();
    expect(wix!.adapterMode).toBe('MODE_B');
    expect(wix!.adapterPath).toContain('FT-W2');
  });
});
