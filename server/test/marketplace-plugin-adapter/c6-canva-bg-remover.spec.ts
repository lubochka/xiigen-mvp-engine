/**
 * FLOW-34 — C6 Canva Background Remover Adapter Tests
 * 26 tests: C6-R-1..10, C6-W-1..8, C6-E-1..4, C6-P-1..4
 */

import {
  mapCanvaToImageElement,
  mapCanvaToImageStyle,
  mapImageStyleToCanva,
  readImageSelection,
  writeProcessedImages,
} from '../.././../adapters/canva/FT-C6/src/canva-adapter';
import type {
  CanvaImageElement,
  SharedImageStyle,
  SharedImageElement,
} from '../../../adapters/canva/FT-C6/src/types';

function makeCanvaImage(overrides: Partial<CanvaImageElement> = {}): CanvaImageElement {
  return {
    id: 'img-001',
    type: 'IMAGE',
    src: 'photo.jpg',
    opacity: 1.0,
    position: { x: 0, y: 0 },
    width: 400,
    height: 300,
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedImageElement = {
  type: 'IMAGE',
  src: 'photo.jpg',
  width: 400,
  height: 300,
  x: 0,
  y: 0,
};
const CANONICAL_STYLE: SharedImageStyle = { opacity: 1.0, operation: 'REMOVE_BG' };
const PROCESS_OUTPUT = {
  originalSrc: 'photo.jpg',
  processedSrc: 'photo-nobg.png',
  operation: 'REMOVE_BG',
};

// ── READ: mapCanvaToImageElement (C6-R-1..5) ──────────────────────────────────

describe('FLOW-34 C6 — READ path: mapCanvaToImageElement', () => {
  it('C6-R-1: type is always IMAGE', () => {
    expect(mapCanvaToImageElement(makeCanvaImage()).type).toBe('IMAGE');
  });
  it('C6-R-2: src preserved', () => {
    expect(mapCanvaToImageElement(makeCanvaImage({ src: 'banner.png' })).src).toBe('banner.png');
  });
  it('C6-R-3: width preserved', () => {
    expect(mapCanvaToImageElement(makeCanvaImage({ width: 800 })).width).toBe(800);
  });
  it('C6-R-4: height preserved', () => {
    expect(mapCanvaToImageElement(makeCanvaImage({ height: 600 })).height).toBe(600);
  });
  it('C6-R-5: position.x/y mapped to x/y', () => {
    const el = mapCanvaToImageElement(makeCanvaImage({ position: { x: 50, y: 75 } }));
    expect(el.x).toBe(50);
    expect(el.y).toBe(75);
  });
});

// ── READ: mapCanvaToImageStyle (C6-R-6..10) ───────────────────────────────────

describe('FLOW-34 C6 — READ path: mapCanvaToImageStyle', () => {
  it('C6-R-6: opacity preserved', () => {
    expect(mapCanvaToImageStyle(makeCanvaImage({ opacity: 0.8 })).opacity).toBe(0.8);
  });
  it('C6-R-7: operation always REMOVE_BG (plugin purpose)', () => {
    expect(mapCanvaToImageStyle(makeCanvaImage()).operation).toBe('REMOVE_BG');
  });
  it('C6-R-8: opacity 0 handled gracefully', () => {
    expect(mapCanvaToImageStyle(makeCanvaImage({ opacity: 0 })).opacity).toBe(0);
  });
  it('C6-R-9: opacity 0.5 preserved precisely', () => {
    expect(mapCanvaToImageStyle(makeCanvaImage({ opacity: 0.5 })).opacity).toBe(0.5);
  });
  it('C6-R-10: different src values produce same operation REMOVE_BG', () => {
    expect(mapCanvaToImageStyle(makeCanvaImage({ src: 'portrait.jpg' })).operation).toBe(
      'REMOVE_BG',
    );
    expect(mapCanvaToImageStyle(makeCanvaImage({ src: 'landscape.jpg' })).operation).toBe(
      'REMOVE_BG',
    );
  });
});

// ── WRITE: mapImageStyleToCanva (C6-W-1..4) ───────────────────────────────────

describe('FLOW-34 C6 — WRITE path: mapImageStyleToCanva', () => {
  it('C6-W-1: opacity passes through', () => {
    expect(mapImageStyleToCanva({ ...CANONICAL_STYLE, opacity: 0.7 }).opacity).toBe(0.7);
  });
  it('C6-W-2: type is always IMAGE', () => {
    expect(mapImageStyleToCanva(CANONICAL_STYLE).type).toBe('IMAGE');
  });
  it('C6-W-3: opacity 1.0 round-trips correctly', () => {
    expect(mapImageStyleToCanva({ opacity: 1.0, operation: 'ENHANCE' }).opacity).toBe(1.0);
  });
  it('C6-W-4: all operation variants accepted', () => {
    expect(mapImageStyleToCanva({ opacity: 1.0, operation: 'NONE' }).opacity).toBe(1.0);
    expect(mapImageStyleToCanva({ opacity: 1.0, operation: 'ENHANCE' }).opacity).toBe(1.0);
  });
});

// ── WRITE: writeProcessedImages (C6-W-5..8) ───────────────────────────────────

describe('FLOW-34 C6 — WRITE path: writeProcessedImages', () => {
  it('C6-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeProcessedImages(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, processed: PROCESS_OUTPUT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('C6-W-6: payload type IMAGE_REPLACE with processedSrc and operation', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeProcessedImages(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, processed: PROCESS_OUTPUT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('IMAGE_REPLACE');
    expect(payload['processedSrc']).toBe('photo-nobg.png');
    expect(payload['operation']).toBe('REMOVE_BG');
  });
  it('C6-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Upload failed'));
    const result = await writeProcessedImages(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, processed: PROCESS_OUTPUT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('C6-W-8: writes multiple images in order', async () => {
    const srcs: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      srcs.push(p['processedSrc'] as string);
    });
    await writeProcessedImages(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          processed: { originalSrc: 'a.jpg', processedSrc: 'a-nobg.png', operation: 'REMOVE_BG' },
        },
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          processed: { originalSrc: 'b.jpg', processedSrc: 'b-nobg.png', operation: 'REMOVE_BG' },
        },
      ],
      writer,
    );
    expect(srcs).toEqual(['a-nobg.png', 'b-nobg.png']);
  });
});

// ── Equivalence (C6-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 C6 — Equivalence: adapter output = shared canonical', () => {
  const el = makeCanvaImage();
  it('C6-E-1: mapCanvaToImageElement output identical to canonical element', () => {
    expect(mapCanvaToImageElement(el)).toEqual(CANONICAL_ELEMENT);
  });
  it('C6-E-2: mapCanvaToImageStyle output identical to canonical style', () => {
    expect(mapCanvaToImageStyle(el)).toEqual(CANONICAL_STYLE);
  });
  it('C6-E-3: readImageSelection arrays match canonical shapes', () => {
    const { elements, styles } = readImageSelection([el]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('C6-E-4: READ→WRITE round-trip preserves opacity', () => {
    const shared = mapCanvaToImageStyle(el);
    const back = mapImageStyleToCanva(shared);
    expect(back.opacity).toBe(el.opacity);
    expect(back.type).toBe(el.type);
  });
});

// ── Packaging (C6-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 C6 — Packaging + manifest checks', () => {
  it('C6-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapCanvaToImageElement).toBe('function');
    expect(typeof mapCanvaToImageStyle).toBe('function');
    expect(typeof mapImageStyleToCanva).toBe('function');
    expect(typeof readImageSelection).toBe('function');
    expect(typeof writeProcessedImages).toBe('function');
  });
  it('C6-P-2: adapter importable without @canva/design', () => {
    expect(mapCanvaToImageElement).toBeDefined();
  });
  it('C6-P-3: package.json name follows @xiigen/canva-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/canva/FT-C6/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/canva-/);
  });
  it('C6-P-4: FT-C6 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          productScope: string;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftC6 = manifest.features.find((f) => f.ftId === 'FT-C6');
    expect(ftC6).toBeDefined();
    expect(ftC6!.portingCandidate).toBe(true);
    expect(ftC6!.productScope).toBe('client-capability');
    const canva = ftC6!.platforms.find((p) => p.platformId === 'canva');
    expect(canva).toBeDefined();
    expect(canva!.adapterMode).toBe('MODE_B');
    expect(canva!.adapterPath).toContain('FT-C6');
  });
});
