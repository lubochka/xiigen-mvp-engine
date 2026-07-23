/**
 * FLOW-34 — C5 Canva Text Elements Adapter Tests
 *
 * 26 tests in 4 groups:
 *   C5-R-1..C5-R-10:  READ path — mapCanvaToElement, mapCanvaToStyle
 *   C5-W-1..C5-W-8:   WRITE path — mapStyleToCanva, writeToCanvas
 *   C5-E-1..C5-E-4:   Equivalence — output IDENTICAL to Figma plugin canonical
 *   C5-P-1..C5-P-4:   Packaging structure + FT-C5 manifest record
 *
 * Run from server/ context — adapter has no external SDK imports (testability by design).
 */

import {
  mapCanvaToElement,
  mapCanvaToStyle,
  mapStyleToCanva,
  readSelection,
  writeToCanvas,
} from '../.././../adapters/canva/FT-C5/src/canva-adapter';
import type { CanvaTextElement, SharedStyle } from '../../../adapters/canva/FT-C5/src/types';

// ── Test fixtures ────────────────────────────────────────────────────────────

function makeCanvaElement(overrides: Partial<CanvaTextElement> = {}): CanvaTextElement {
  return {
    id: 'element-001',
    content: 'Hello XIIGen',
    fontSize: 16,
    fontStyle: { family: 'Inter', weight: 400 },
    textAlign: 'start',
    color: { r: 34, g: 34, b: 34 },
    width: 200,
    height: 24,
    ...overrides,
  };
}

// Figma-canonical equivalents — the shared CSS engine contract.
// Canva adapter must produce IDENTICAL output for the same logical element.
const FIGMA_CANONICAL_ELEMENT = {
  type: 'TEXT' as const,
  characters: 'Hello XIIGen',
  width: 200,
  height: 24,
};

const FIGMA_CANONICAL_STYLE: SharedStyle = {
  fontSize: 16,
  fontFamily: 'Inter',
  fontWeight: 'Regular',
  textAlignHorizontal: 'LEFT',
  color: 'rgb(34, 34, 34)',
};

// ── Group 1: READ path — mapCanvaToElement (C5-R-1..C5-R-5) ─────────────────

describe('FLOW-34 C5 — READ path: mapCanvaToElement', () => {
  it('C5-R-1: type is always TEXT', () => {
    expect(mapCanvaToElement(makeCanvaElement()).type).toBe('TEXT');
  });

  it('C5-R-2: Canva content → shared characters field', () => {
    const el = mapCanvaToElement(makeCanvaElement({ content: 'Design System' }));
    expect(el.characters).toBe('Design System');
  });

  it('C5-R-3: width preserved', () => {
    expect(mapCanvaToElement(makeCanvaElement({ width: 340 })).width).toBe(340);
  });

  it('C5-R-4: height preserved', () => {
    expect(mapCanvaToElement(makeCanvaElement({ height: 48 })).height).toBe(48);
  });

  it('C5-R-5: empty content handled gracefully', () => {
    expect(mapCanvaToElement(makeCanvaElement({ content: '' })).characters).toBe('');
  });
});

// ── Group 1 continued: mapCanvaToStyle (C5-R-6..C5-R-10) ─────────────────────

describe('FLOW-34 C5 — READ path: mapCanvaToStyle', () => {
  it('C5-R-6: fontSize passed through unchanged', () => {
    expect(mapCanvaToStyle(makeCanvaElement({ fontSize: 24 })).fontSize).toBe(24);
  });

  it('C5-R-7: fontStyle.weight 700 → fontWeight "Bold"', () => {
    const style = mapCanvaToStyle(
      makeCanvaElement({ fontStyle: { family: 'Inter', weight: 700 } }),
    );
    expect(style.fontWeight).toBe('Bold');
  });

  it('C5-R-8: fontStyle.weight 400 → fontWeight "Regular"', () => {
    const style = mapCanvaToStyle(
      makeCanvaElement({ fontStyle: { family: 'Inter', weight: 400 } }),
    );
    expect(style.fontWeight).toBe('Regular');
  });

  it('C5-R-9: textAlign "start" → textAlignHorizontal "LEFT"', () => {
    expect(mapCanvaToStyle(makeCanvaElement({ textAlign: 'start' })).textAlignHorizontal).toBe(
      'LEFT',
    );
  });

  it('C5-R-10: textAlign "center"→"CENTER", "end"→"RIGHT" + color 0-255 RGB → rgb()', () => {
    expect(mapCanvaToStyle(makeCanvaElement({ textAlign: 'center' })).textAlignHorizontal).toBe(
      'CENTER',
    );
    expect(mapCanvaToStyle(makeCanvaElement({ textAlign: 'end' })).textAlignHorizontal).toBe(
      'RIGHT',
    );
    const style = mapCanvaToStyle(makeCanvaElement({ color: { r: 255, g: 128, b: 0 } }));
    expect(style.color).toBe('rgb(255, 128, 0)');
  });
});

// ── Group 2: WRITE path — mapStyleToCanva (C5-W-1..C5-W-4) ──────────────────

describe('FLOW-34 C5 — WRITE path: mapStyleToCanva', () => {
  it('C5-W-1: fontWeight "Bold" → weight 700', () => {
    const s = mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontWeight: 'Bold' });
    expect(s.fontStyle.weight).toBe(700);
  });

  it('C5-W-2: fontWeight "Regular" → weight 400', () => {
    const s = mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontWeight: 'Regular' });
    expect(s.fontStyle.weight).toBe(400);
  });

  it('C5-W-3: textAlignHorizontal "LEFT"→"start", "CENTER"→"center", "RIGHT"→"end"', () => {
    expect(
      mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'LEFT' }).textAlign,
    ).toBe('start');
    expect(
      mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'CENTER' }).textAlign,
    ).toBe('center');
    expect(
      mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'RIGHT' }).textAlign,
    ).toBe('end');
  });

  it('C5-W-4: fontSize passed through', () => {
    expect(mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontSize: 32 }).fontSize).toBe(32);
  });
});

// ── Group 2 continued: writeToCanvas (C5-W-5..C5-W-8) ───────────────────────

describe('FLOW-34 C5 — WRITE path: writeToCanvas', () => {
  it('C5-W-5: writer called once per enhanced element, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeToCanvas(
      [{ content: 'Enhanced text', style: FIGMA_CANONICAL_STYLE }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('C5-W-6: writer payload is { type: "TEXT", children: [{ text, fontStyle, textAlign, fontSize }] }', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeToCanvas([{ content: 'New heading', style: FIGMA_CANONICAL_STYLE }], writer);
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('TEXT');
    const children = payload['children'] as Array<Record<string, unknown>>;
    expect(children[0]['text']).toBe('New heading');
    expect(children[0]['fontSize']).toBe(16);
  });

  it('C5-W-7: writer failure → failed count incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Canvas write failed'));
    const result = await writeToCanvas([{ content: 'text', style: FIGMA_CANONICAL_STYLE }], writer);
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('C5-W-8: writes multiple elements in order', async () => {
    const written: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      const children = p['children'] as Array<Record<string, unknown>>;
      written.push(children[0]['text'] as string);
    });
    await writeToCanvas(
      [
        { content: 'First', style: FIGMA_CANONICAL_STYLE },
        { content: 'Second', style: FIGMA_CANONICAL_STYLE },
      ],
      writer,
    );
    expect(written).toEqual(['First', 'Second']);
  });
});

// ── Group 3: Equivalence — Canva == Figma canonical (C5-E-1..C5-E-4) ─────────

describe('FLOW-34 C5 — Equivalence: Canva adapter output = Figma plugin canonical', () => {
  const canvaElement = makeCanvaElement();

  it('C5-E-1: mapCanvaToElement output is identical to Figma plugin canonical element', () => {
    expect(mapCanvaToElement(canvaElement)).toEqual(FIGMA_CANONICAL_ELEMENT);
  });

  it('C5-E-2: mapCanvaToStyle output is identical to Figma plugin canonical style', () => {
    expect(mapCanvaToStyle(canvaElement)).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('C5-E-3: readSelection returns arrays matching Figma canonical shapes', () => {
    const { elements, styles } = readSelection([canvaElement]);
    expect(elements[0]).toEqual(FIGMA_CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('C5-E-4: READ→WRITE round-trip preserves semantic values (idempotent mapping)', () => {
    const shared = mapCanvaToStyle(canvaElement);
    const back = mapStyleToCanva(shared);
    // Semantics preserved: weight, alignment, size
    expect(back.fontStyle.weight).toBe(canvaElement.fontStyle.weight);
    expect(back.textAlign).toBe(canvaElement.textAlign);
    expect(back.fontSize).toBe(canvaElement.fontSize);
  });
});

// ── Group 4: Packaging checks (C5-P-1..C5-P-4) ───────────────────────────────

describe('FLOW-34 C5 — Packaging + manifest checks', () => {
  it('C5-P-1: all 5 adapter functions are exported', () => {
    // Already proven by the imports at the top of this file compiling
    expect(typeof mapCanvaToElement).toBe('function');
    expect(typeof mapCanvaToStyle).toBe('function');
    expect(typeof mapStyleToCanva).toBe('function');
    expect(typeof readSelection).toBe('function');
    expect(typeof writeToCanvas).toBe('function');
  });

  it('C5-P-2: adapter importable without @canva/design (no SDK at module level)', () => {
    // This test passes if we reached this line — the imports at the top succeeded
    // without @canva/design being installed (it is in devDeps only, not bundled for tests)
    expect(mapCanvaToElement).toBeDefined();
  });

  it('C5-P-3: package.json name follows @xiigen/canva-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/canva/FT-C5/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/canva-/);
  });

  it('C5-P-4: FT-C5 record in marketplace manifest has required FLOW-34 fields', () => {
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
    const ftC5 = manifest.features.find((f) => f.ftId === 'FT-C5');
    expect(ftC5).toBeDefined();
    expect(ftC5!.portingCandidate).toBe(true);
    expect(ftC5!.productScope).toBe('client-capability');
    const canvaPlatform = ftC5!.platforms.find((p) => p.platformId === 'canva');
    expect(canvaPlatform).toBeDefined();
    expect(canvaPlatform!.adapterMode).toBe('MODE_B');
    expect(canvaPlatform!.adapterPath).toContain('FT-C5');
  });
});
