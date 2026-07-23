/**
 * FLOW-34 — F1 Canva Site Generator Adapter Tests
 *
 * 26 tests in 4 groups:
 *   F1-R-1..F1-R-10:  READ path — mapCanvaToSiteElement, mapCanvaToSiteStyle
 *   F1-W-1..F1-W-8:   WRITE path — mapSiteStyleToCanva, writeGeneratedSite
 *   F1-E-1..F1-E-4:   Equivalence — output IDENTICAL to Figma plugin canonical
 *   F1-P-1..F1-P-4:   Packaging structure + FT-F1 manifest record
 *
 * Run from server/ context — adapter has no external SDK imports (testability by design).
 */

import {
  mapCanvaToSiteElement,
  mapCanvaToSiteStyle,
  mapSiteStyleToCanva,
  readDesignForSite,
  writeGeneratedSite,
} from '../.././../adapters/canva/FT-F1/src/canva-adapter';
import type {
  CanvaDesignElement,
  SharedSiteStyle,
  SharedSiteElement,
} from '../../../adapters/canva/FT-F1/src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeCanvaElement(overrides: Partial<CanvaDesignElement> = {}): CanvaDesignElement {
  return {
    id: 'design-001',
    type: 'TEXT',
    content: 'Welcome to XIIGen',
    backgroundColor: '#ffffff',
    position: { x: 0, y: 0 },
    width: 320,
    height: 40,
    ...overrides,
  };
}

// Figma-canonical equivalents — the shared site engine contract.
// Canva adapter must produce IDENTICAL output for the same logical element.
const FIGMA_CANONICAL_ELEMENT: SharedSiteElement = {
  type: 'TEXT_NODE',
  content: 'Welcome to XIIGen',
  width: 320,
  height: 40,
  x: 0,
  y: 0,
};

const FIGMA_CANONICAL_STYLE: SharedSiteStyle = {
  backgroundColor: '#ffffff',
  width: 320,
  height: 40,
  layout: 'block',
};

const SITE_OUTPUT = { html: '<p>Welcome to XIIGen</p>', css: 'p { color: #333; }' };

// ── Group 1: READ path — mapCanvaToSiteElement (F1-R-1..F1-R-5) ──────────────

describe('FLOW-34 F1 — READ path: mapCanvaToSiteElement', () => {
  it('F1-R-1: TEXT type → TEXT_NODE', () => {
    expect(mapCanvaToSiteElement(makeCanvaElement({ type: 'TEXT' })).type).toBe('TEXT_NODE');
  });

  it('F1-R-2: IMAGE type → IMAGE_NODE', () => {
    expect(mapCanvaToSiteElement(makeCanvaElement({ type: 'IMAGE', src: 'img.png' })).type).toBe(
      'IMAGE_NODE',
    );
  });

  it('F1-R-3: FRAME type → CONTAINER', () => {
    expect(mapCanvaToSiteElement(makeCanvaElement({ type: 'FRAME' })).type).toBe('CONTAINER');
  });

  it('F1-R-4: SHAPE type → SECTION', () => {
    expect(mapCanvaToSiteElement(makeCanvaElement({ type: 'SHAPE' })).type).toBe('SECTION');
  });

  it('F1-R-5: content preserved for TEXT elements', () => {
    expect(mapCanvaToSiteElement(makeCanvaElement({ content: 'Hero title' })).content).toBe(
      'Hero title',
    );
  });
});

// ── Group 1 continued: mapCanvaToSiteStyle (F1-R-6..F1-R-10) ─────────────────

describe('FLOW-34 F1 — READ path: mapCanvaToSiteStyle', () => {
  it('F1-R-6: backgroundColor preserved', () => {
    expect(
      mapCanvaToSiteStyle(makeCanvaElement({ backgroundColor: '#ff0000' })).backgroundColor,
    ).toBe('#ff0000');
  });

  it('F1-R-7: width preserved', () => {
    expect(mapCanvaToSiteStyle(makeCanvaElement({ width: 640 })).width).toBe(640);
  });

  it('F1-R-8: height preserved', () => {
    expect(mapCanvaToSiteStyle(makeCanvaElement({ height: 80 })).height).toBe(80);
  });

  it('F1-R-9: FRAME → layout "flex"', () => {
    expect(mapCanvaToSiteStyle(makeCanvaElement({ type: 'FRAME' })).layout).toBe('flex');
  });

  it('F1-R-10: non-FRAME → layout "block" + position x/y mapped to site element', () => {
    expect(mapCanvaToSiteStyle(makeCanvaElement({ type: 'TEXT' })).layout).toBe('block');
    const el = mapCanvaToSiteElement(makeCanvaElement({ position: { x: 50, y: 100 } }));
    expect(el.x).toBe(50);
    expect(el.y).toBe(100);
  });
});

// ── Group 2: WRITE path — mapSiteStyleToCanva (F1-W-1..F1-W-4) ───────────────

describe('FLOW-34 F1 — WRITE path: mapSiteStyleToCanva', () => {
  it('F1-W-1: backgroundColor passes through', () => {
    expect(
      mapSiteStyleToCanva({ ...FIGMA_CANONICAL_STYLE, backgroundColor: '#0000ff' }).backgroundColor,
    ).toBe('#0000ff');
  });

  it('F1-W-2: layout "flex" → FRAME type', () => {
    expect(mapSiteStyleToCanva({ ...FIGMA_CANONICAL_STYLE, layout: 'flex' }).type).toBe('FRAME');
  });

  it('F1-W-3: layout "block" → SHAPE type', () => {
    expect(mapSiteStyleToCanva({ ...FIGMA_CANONICAL_STYLE, layout: 'block' }).type).toBe('SHAPE');
  });

  it('F1-W-4: width and height pass through', () => {
    const result = mapSiteStyleToCanva({ ...FIGMA_CANONICAL_STYLE, width: 800, height: 600 });
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });
});

// ── Group 2 continued: writeGeneratedSite (F1-W-5..F1-W-8) ──────────────────

describe('FLOW-34 F1 — WRITE path: writeGeneratedSite', () => {
  it('F1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeGeneratedSite(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE, generated: SITE_OUTPUT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('F1-W-6: payload type is SITE_EXPORT with html and css', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeGeneratedSite(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE, generated: SITE_OUTPUT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('SITE_EXPORT');
    expect(payload['html']).toBe('<p>Welcome to XIIGen</p>');
    expect(payload['css']).toBe('p { color: #333; }');
  });

  it('F1-W-7: writer failure → failed count incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Export failed'));
    const result = await writeGeneratedSite(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE, generated: SITE_OUTPUT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('F1-W-8: writes multiple outputs in order', async () => {
    const htmlLog: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      htmlLog.push(p['html'] as string);
    });
    await writeGeneratedSite(
      [
        {
          element: FIGMA_CANONICAL_ELEMENT,
          style: FIGMA_CANONICAL_STYLE,
          generated: { html: '<h1>First</h1>', css: '' },
        },
        {
          element: FIGMA_CANONICAL_ELEMENT,
          style: FIGMA_CANONICAL_STYLE,
          generated: { html: '<h2>Second</h2>', css: '' },
        },
      ],
      writer,
    );
    expect(htmlLog).toEqual(['<h1>First</h1>', '<h2>Second</h2>']);
  });
});

// ── Group 3: Equivalence — Canva == Figma canonical (F1-E-1..F1-E-4) ─────────

describe('FLOW-34 F1 — Equivalence: Canva adapter output = Figma plugin canonical', () => {
  const canvaEl = makeCanvaElement();

  it('F1-E-1: mapCanvaToSiteElement output identical to Figma canonical element', () => {
    expect(mapCanvaToSiteElement(canvaEl)).toEqual(FIGMA_CANONICAL_ELEMENT);
  });

  it('F1-E-2: mapCanvaToSiteStyle output identical to Figma canonical style', () => {
    expect(mapCanvaToSiteStyle(canvaEl)).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('F1-E-3: readDesignForSite arrays match canonical shapes', () => {
    const { elements, styles } = readDesignForSite([canvaEl]);
    expect(elements[0]).toEqual(FIGMA_CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('F1-E-4: READ→WRITE round-trip preserves semantic values (idempotent mapping)', () => {
    const shared = mapCanvaToSiteStyle(canvaEl);
    const back = mapSiteStyleToCanva(shared);
    expect(back.backgroundColor).toBe(canvaEl.backgroundColor);
    expect(back.width).toBe(canvaEl.width);
    expect(back.height).toBe(canvaEl.height);
  });
});

// ── Group 4: Packaging checks (F1-P-1..F1-P-4) ───────────────────────────────

describe('FLOW-34 F1 — Packaging + manifest checks', () => {
  it('F1-P-1: all 5 adapter functions are exported', () => {
    expect(typeof mapCanvaToSiteElement).toBe('function');
    expect(typeof mapCanvaToSiteStyle).toBe('function');
    expect(typeof mapSiteStyleToCanva).toBe('function');
    expect(typeof readDesignForSite).toBe('function');
    expect(typeof writeGeneratedSite).toBe('function');
  });

  it('F1-P-2: adapter importable without @canva/design (no SDK at module level)', () => {
    expect(mapCanvaToSiteElement).toBeDefined();
  });

  it('F1-P-3: package.json name follows @xiigen/canva-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/canva/FT-F1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/canva-/);
  });

  it('F1-P-4: FT-F1 record in marketplace manifest has required FLOW-34 fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        schemaVersion: string;
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          productScope: string;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    expect(manifest.schemaVersion).toBe('2.0');
    const ftF1 = manifest.features.find((f) => f.ftId === 'FT-F1');
    expect(ftF1).toBeDefined();
    expect(ftF1!.portingCandidate).toBe(true);
    expect(ftF1!.productScope).toBe('client-capability');
    const canvaPlatform = ftF1!.platforms.find((p) => p.platformId === 'canva');
    expect(canvaPlatform).toBeDefined();
    expect(canvaPlatform!.adapterMode).toBe('MODE_B');
    expect(canvaPlatform!.adapterPath).toContain('FT-F1');
  });
});
