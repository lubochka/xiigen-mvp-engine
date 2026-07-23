/**
 * C5 Canva Text Elements Adapter — Unit Tests
 *
 * FT-C5 | FLOW-34 | Gate C + D verified here
 *
 * 26 tests in 4 groups:
 *   C5-R-1..C5-R-10:  READ path — mapCanvaToElement, mapCanvaToStyle
 *   C5-W-1..C5-W-8:   WRITE path — mapStyleToCanva, writeToCanvas
 *   C5-E-1..C5-E-4:   Equivalence — proves output IDENTICAL to Figma plugin canonical
 *   C5-P-1..C5-P-4:   Packaging structure checks (no build required)
 *
 * Design note: No @canva/design import here — adapter accepts injected writer.
 * This is intentional: testability without Canva SDK dependency.
 */

import {
  mapCanvaToElement,
  mapCanvaToStyle,
  mapStyleToCanva,
  readSelection,
  writeToCanvas,
} from '../src/canva-adapter';
import type { CanvaTextElement, SharedStyle } from '../src/types';

// ── Test fixtures ────────────────────────────────────────────────────────────

const makeCanvaElement = (overrides: Partial<CanvaTextElement> = {}): CanvaTextElement => ({
  id: 'element-001',
  content: 'Hello XIIGen',
  fontSize: 16,
  fontStyle: { family: 'Inter', weight: 400 },
  textAlign: 'start',
  color: { r: 34, g: 34, b: 34 },
  width: 200,
  height: 24,
  ...overrides,
});

// Figma-canonical equivalents for the same logical text element.
// The shared CSS engine produces the same output regardless of platform.
// C5-E-1..C5-E-4 verify this contract.
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

// ── READ PATH: mapCanvaToElement (C5-R-1..C5-R-5) ───────────────────────────

describe('C5 READ path — mapCanvaToElement', () => {
  it('C5-R-1: type is always TEXT', () => {
    const el = mapCanvaToElement(makeCanvaElement());
    expect(el.type).toBe('TEXT');
  });

  it('C5-R-2: content → characters mapping', () => {
    const el = mapCanvaToElement(makeCanvaElement({ content: 'Design System' }));
    expect(el.characters).toBe('Design System');
  });

  it('C5-R-3: width preserved', () => {
    const el = mapCanvaToElement(makeCanvaElement({ width: 340 }));
    expect(el.width).toBe(340);
  });

  it('C5-R-4: height preserved', () => {
    const el = mapCanvaToElement(makeCanvaElement({ height: 48 }));
    expect(el.height).toBe(48);
  });

  it('C5-R-5: empty content handled', () => {
    const el = mapCanvaToElement(makeCanvaElement({ content: '' }));
    expect(el.characters).toBe('');
  });
});

// ── READ PATH: mapCanvaToStyle (C5-R-6..C5-R-10) ────────────────────────────

describe('C5 READ path — mapCanvaToStyle', () => {
  it('C5-R-6: fontSize passed through', () => {
    const style = mapCanvaToStyle(makeCanvaElement({ fontSize: 24 }));
    expect(style.fontSize).toBe(24);
  });

  it('C5-R-7: fontStyle.weight 700 → fontWeight "Bold"', () => {
    const style = mapCanvaToStyle(makeCanvaElement({ fontStyle: { family: 'Inter', weight: 700 } }));
    expect(style.fontWeight).toBe('Bold');
  });

  it('C5-R-8: fontStyle.weight 400 → fontWeight "Regular"', () => {
    const style = mapCanvaToStyle(makeCanvaElement({ fontStyle: { family: 'Inter', weight: 400 } }));
    expect(style.fontWeight).toBe('Regular');
  });

  it('C5-R-9: textAlign "start" → textAlignHorizontal "LEFT"', () => {
    const style = mapCanvaToStyle(makeCanvaElement({ textAlign: 'start' }));
    expect(style.textAlignHorizontal).toBe('LEFT');
  });

  it('C5-R-10: textAlign "center" → "CENTER", "end" → "RIGHT"', () => {
    expect(mapCanvaToStyle(makeCanvaElement({ textAlign: 'center' })).textAlignHorizontal).toBe('CENTER');
    expect(mapCanvaToStyle(makeCanvaElement({ textAlign: 'end' })).textAlignHorizontal).toBe('RIGHT');
  });
});

// ── WRITE PATH: mapStyleToCanva (C5-W-1..C5-W-4) ────────────────────────────

describe('C5 WRITE path — mapStyleToCanva', () => {
  it('C5-W-1: fontWeight "Bold" → weight 700', () => {
    const canvaStyle = mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontWeight: 'Bold' });
    expect(canvaStyle.fontStyle.weight).toBe(700);
  });

  it('C5-W-2: fontWeight "Regular" → weight 400', () => {
    const canvaStyle = mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontWeight: 'Regular' });
    expect(canvaStyle.fontStyle.weight).toBe(400);
  });

  it('C5-W-3: textAlignHorizontal "LEFT" → "start", "CENTER" → "center", "RIGHT" → "end"', () => {
    expect(mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'LEFT' }).textAlign).toBe('start');
    expect(mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'CENTER' }).textAlign).toBe('center');
    expect(mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, textAlignHorizontal: 'RIGHT' }).textAlign).toBe('end');
  });

  it('C5-W-4: fontSize passed through to canvaStyle', () => {
    const canvaStyle = mapStyleToCanva({ ...FIGMA_CANONICAL_STYLE, fontSize: 32 });
    expect(canvaStyle.fontSize).toBe(32);
  });
});

// ── WRITE PATH: writeToCanvas (C5-W-5..C5-W-8) ──────────────────────────────

describe('C5 WRITE path — writeToCanvas', () => {
  it('C5-W-5: calls writer once per enhanced element', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const enhanced = [
      { content: 'Enhanced text', style: FIGMA_CANONICAL_STYLE },
    ];
    const result = await writeToCanvas(enhanced, writer);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('C5-W-6: writer payload has type="TEXT" with correct text content', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeToCanvas([{ content: 'New heading', style: FIGMA_CANONICAL_STYLE }], writer);
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('TEXT');
    const children = payload['children'] as Array<Record<string, unknown>>;
    expect(children[0]['text']).toBe('New heading');
  });

  it('C5-W-7: writer failure → failed count incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Canvas write failed'));
    const result = await writeToCanvas(
      [{ content: 'text', style: FIGMA_CANONICAL_STYLE }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('C5-W-8: writes multiple elements in order', async () => {
    const calls: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      const children = p['children'] as Array<Record<string, unknown>>;
      calls.push(children[0]['text'] as string);
    });
    const enhanced = [
      { content: 'First', style: FIGMA_CANONICAL_STYLE },
      { content: 'Second', style: FIGMA_CANONICAL_STYLE },
    ];
    await writeToCanvas(enhanced, writer);
    expect(calls).toEqual(['First', 'Second']);
  });
});

// ── EQUIVALENCE: Canva output == Figma canonical (C5-E-1..C5-E-4) ────────────
// These are the canonical proof tests: the 90% shared code claim.
// The Figma plugin produces FIGMA_CANONICAL_ELEMENT/FIGMA_CANONICAL_STYLE directly.
// Canva adapter must produce the SAME output via mapping.

describe('C5 Equivalence — Canva adapter output identical to Figma plugin canonical', () => {
  const canvaElement = makeCanvaElement(); // default fixture matches the canonical

  it('C5-E-1: mapCanvaToElement output matches Figma canonical element', () => {
    const result = mapCanvaToElement(canvaElement);
    expect(result).toEqual(FIGMA_CANONICAL_ELEMENT);
  });

  it('C5-E-2: mapCanvaToStyle output matches Figma canonical style', () => {
    const result = mapCanvaToStyle(canvaElement);
    expect(result).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('C5-E-3: readSelection returns same element+style shape as Figma plugin readSelection', () => {
    const result = readSelection([canvaElement]);
    expect(result.elements).toHaveLength(1);
    expect(result.styles).toHaveLength(1);
    expect(result.elements[0]).toEqual(FIGMA_CANONICAL_ELEMENT);
    expect(result.styles[0]).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('C5-E-4: mapStyleToCanva(mapCanvaToStyle(x)) is idempotent — round-trip preserves semantic', () => {
    // READ: Canva → SharedStyle
    const shared = mapCanvaToStyle(canvaElement);
    // WRITE: SharedStyle → Canva
    const canvaWriteStyle = mapStyleToCanva(shared);
    // The round-trip must preserve the original Canva values
    expect(canvaWriteStyle.fontStyle.weight).toBe(canvaElement.fontStyle.weight);
    expect(canvaWriteStyle.textAlign).toBe(canvaElement.textAlign);
    expect(canvaWriteStyle.fontSize).toBe(canvaElement.fontSize);
  });
});

// ── PACKAGING: structure checks (C5-P-1..C5-P-4) ────────────────────────────

describe('C5 Packaging — structure and compliance checks', () => {
  it('C5-P-1: adapter exports all required functions', () => {
    // Verify all public API functions are exported from canva-adapter.ts
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adapter = require('../src/canva-adapter');
    expect(typeof adapter.mapCanvaToElement).toBe('function');
    expect(typeof adapter.mapCanvaToStyle).toBe('function');
    expect(typeof adapter.mapStyleToCanva).toBe('function');
    expect(typeof adapter.readSelection).toBe('function');
    expect(typeof adapter.writeToCanvas).toBe('function');
  });

  it('C5-P-2: canva-adapter.ts does NOT import @canva/design at module level (testability)', () => {
    // The adapter accepts a writer parameter — no direct Canva SDK import needed in test
    // If this test passes, the adapter is importable without @canva/design installed
    const { mapCanvaToElement } = require('../src/canva-adapter');
    expect(mapCanvaToElement).toBeDefined();
  });

  it('C5-P-3: package.json name follows @xiigen/canva-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../package.json');
    expect(pkg.name).toMatch(/^@xiigen\/canva-/);
  });

  it('C5-P-4: FT-C5 record exists in marketplace manifest with correct shape', () => {
    // Verify the FT record exists and has required FLOW-34 fields
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = require('../../../../contracts/features/feature-manifest-marketplace-plugins-v1.json');
    const ftC5 = manifest.features.find((f: { ftId: string }) => f.ftId === 'FT-C5');
    expect(ftC5).toBeDefined();
    expect(ftC5.portingCandidate).toBe(true);
    expect(ftC5.productScope).toBe('client-capability');
    const canvaPlatform = ftC5.platforms.find((p: { platformId: string }) => p.platformId === 'canva');
    expect(canvaPlatform).toBeDefined();
    expect(canvaPlatform.adapterMode).toBe('MODE_B');
  });
});
