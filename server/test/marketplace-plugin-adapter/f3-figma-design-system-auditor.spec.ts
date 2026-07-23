/**
 * FLOW-34 — F3 Figma Design System Auditor Adapter Tests
 * (Master plan: F = Figma prefix. F3 = Design System Auditor.)
 * 26 tests: F3-R-1..10, F3-W-1..8, F3-E-1..4, F3-P-1..4
 */

import {
  mapFigmaToTokenElement,
  mapFigmaToTokenStyle,
  mapTokenStyleToFigma,
  readDesignSystem,
  writeAuditResults,
} from '../../../adapters/figma/FT-F3/src/figma-adapter';
import type {
  FigmaDesignToken,
  SharedTokenStyle,
  SharedTokenElement,
} from '../../../adapters/figma/FT-F3/src/types';

function makeFigmaToken(overrides: Partial<FigmaDesignToken> = {}): FigmaDesignToken {
  return {
    id: 'node-001',
    type: 'COMPONENT',
    name: 'PrimaryButton',
    fills: [{ color: { r: 0.2, g: 0.4, b: 1.0 }, opacity: 1 }],
    width: 120,
    height: 40,
    ...overrides,
  };
}

// r=0.2→51=0x33, g=0.4→102=0x66, b=1.0→255=0xff → #3366ff
const CANONICAL_ELEMENT: SharedTokenElement = {
  type: 'COMPONENT',
  name: 'PrimaryButton',
  tokenCategory: 'COMPONENT',
  width: 120,
  height: 40,
};
const CANONICAL_STYLE: SharedTokenStyle = {
  colorHex: '#3366ff',
  fontFamily: undefined,
  fontStyle: undefined,
  fontSize: 0,
  tokenType: 'COMPONENT',
};
const AUDIT_RESULT = { violations: [], score: 95 };

// ── READ: mapFigmaToTokenElement (F3-R-1..5) ──────────────────────────────────

describe('FLOW-34 F3 — READ path: mapFigmaToTokenElement', () => {
  it('F3-R-1: COMPONENT → COMPONENT type', () => {
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'COMPONENT' })).type).toBe('COMPONENT');
  });
  it('F3-R-2: FRAME/TEXT/RECTANGLE/GROUP map correctly', () => {
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'FRAME' })).type).toBe('FRAME');
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'TEXT' })).type).toBe('TEXT');
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'RECTANGLE' })).type).toBe('SHAPE');
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'GROUP' })).type).toBe('GROUP');
  });
  it('F3-R-3: name preserved', () => {
    expect(mapFigmaToTokenElement(makeFigmaToken({ name: 'SecondaryButton' })).name).toBe(
      'SecondaryButton',
    );
  });
  it('F3-R-4: tokenCategory COMPONENT for COMPONENT type', () => {
    expect(mapFigmaToTokenElement(makeFigmaToken({ type: 'COMPONENT' })).tokenCategory).toBe(
      'COMPONENT',
    );
  });
  it('F3-R-5: tokenCategory TYPOGRAPHY when fontName present', () => {
    expect(
      mapFigmaToTokenElement(
        makeFigmaToken({ type: 'TEXT', fontName: { family: 'Inter', style: 'Regular' } }),
      ).tokenCategory,
    ).toBe('TYPOGRAPHY');
  });
});

// ── READ: mapFigmaToTokenStyle (F3-R-6..10) ───────────────────────────────────

describe('FLOW-34 F3 — READ path: mapFigmaToTokenStyle', () => {
  it('F3-R-6: colorHex computed from fills RGB', () => {
    expect(mapFigmaToTokenStyle(makeFigmaToken()).colorHex).toBe('#3366ff');
  });
  it('F3-R-7: empty fills → colorHex defaults to #000000', () => {
    expect(mapFigmaToTokenStyle(makeFigmaToken({ fills: [] })).colorHex).toBe('#000000');
  });
  it('F3-R-8: fontFamily/fontStyle populated when fontName present', () => {
    const s = mapFigmaToTokenStyle(
      makeFigmaToken({ fontName: { family: 'Inter', style: 'Bold' } }),
    );
    expect(s.fontFamily).toBe('Inter');
    expect(s.fontStyle).toBe('Bold');
  });
  it('F3-R-9: fontSize preserved when set', () => {
    expect(mapFigmaToTokenStyle(makeFigmaToken({ fontSize: 16 })).fontSize).toBe(16);
  });
  it('F3-R-10: fontSize defaults to 0 when undefined', () => {
    expect(mapFigmaToTokenStyle(makeFigmaToken({ fontSize: undefined })).fontSize).toBe(0);
  });
});

// ── WRITE: mapTokenStyleToFigma (F3-W-1..4) ───────────────────────────────────

describe('FLOW-34 F3 — WRITE path: mapTokenStyleToFigma', () => {
  it('F3-W-1: fontSize=0 → fontSize undefined in write payload', () => {
    expect(mapTokenStyleToFigma({ ...CANONICAL_STYLE, fontSize: 0 }).fontSize).toBeUndefined();
  });
  it('F3-W-2: fontSize>0 passes through', () => {
    expect(mapTokenStyleToFigma({ ...CANONICAL_STYLE, fontSize: 16 }).fontSize).toBe(16);
  });
  it('F3-W-3: fontFamily+fontStyle → fontName object', () => {
    const result = mapTokenStyleToFigma({
      ...CANONICAL_STYLE,
      fontFamily: 'Inter',
      fontStyle: 'Bold',
    });
    expect(result.fontName).toEqual({ family: 'Inter', style: 'Bold' });
  });
  it('F3-W-4: no fontFamily → fontName undefined', () => {
    expect(mapTokenStyleToFigma(CANONICAL_STYLE).fontName).toBeUndefined();
  });
});

// ── WRITE: writeAuditResults (F3-W-5..8) ─────────────────────────────────────

describe('FLOW-34 F3 — WRITE path: writeAuditResults', () => {
  it('F3-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeAuditResults(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, auditResult: AUDIT_RESULT }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('F3-W-6: payload type=DESIGN_AUDIT, name, tokenType, colorHex, score', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeAuditResults(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, auditResult: AUDIT_RESULT }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('DESIGN_AUDIT');
    expect(payload['name']).toBe('PrimaryButton');
    expect(payload['tokenType']).toBe('COMPONENT');
    expect(payload['colorHex']).toBe('#3366ff');
    expect(payload['score']).toBe(95);
  });
  it('F3-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Figma API error'));
    const result = await writeAuditResults(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, auditResult: AUDIT_RESULT }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('F3-W-8: writes multiple tokens in order', async () => {
    const names: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      names.push(p['name'] as string);
    });
    await writeAuditResults(
      [
        {
          element: { ...CANONICAL_ELEMENT, name: 'ButtonPrimary' },
          style: CANONICAL_STYLE,
          auditResult: AUDIT_RESULT,
        },
        {
          element: { ...CANONICAL_ELEMENT, name: 'InputField' },
          style: CANONICAL_STYLE,
          auditResult: AUDIT_RESULT,
        },
      ],
      writer,
    );
    expect(names).toEqual(['ButtonPrimary', 'InputField']);
  });
});

// ── Equivalence (F3-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 F3 — Equivalence: adapter output = shared canonical', () => {
  const token = makeFigmaToken();
  it('F3-E-1: mapFigmaToTokenElement output identical to canonical element', () => {
    expect(mapFigmaToTokenElement(token)).toEqual(CANONICAL_ELEMENT);
  });
  it('F3-E-2: mapFigmaToTokenStyle output identical to canonical style', () => {
    expect(mapFigmaToTokenStyle(token)).toEqual(CANONICAL_STYLE);
  });
  it('F3-E-3: readDesignSystem arrays match canonical shapes', () => {
    const { elements, styles } = readDesignSystem([token]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('F3-E-4: READ→WRITE round-trip preserves fontFamily (undefined → undefined)', () => {
    const shared = mapFigmaToTokenStyle(token);
    const back = mapTokenStyleToFigma(shared);
    expect(back.fontName).toBeUndefined();
  });
});

// ── Packaging (F3-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 F3 — Packaging + manifest checks', () => {
  it('F3-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapFigmaToTokenElement).toBe('function');
    expect(typeof mapFigmaToTokenStyle).toBe('function');
    expect(typeof mapTokenStyleToFigma).toBe('function');
    expect(typeof readDesignSystem).toBe('function');
    expect(typeof writeAuditResults).toBe('function');
  });
  it('F3-P-2: adapter importable without figma plugin API', () => {
    expect(mapFigmaToTokenElement).toBeDefined();
  });
  it('F3-P-3: package.json name follows @xiigen/figma-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/figma/FT-F3/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/figma-/);
  });
  it('F3-P-4: FT-F3 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftF3 = manifest.features.find((f) => f.ftId === 'FT-F3');
    expect(ftF3).toBeDefined();
    expect(ftF3!.portingCandidate).toBe(true);
    const figma = ftF3!.platforms.find((p) => p.platformId === 'figma');
    expect(figma).toBeDefined();
    expect(figma!.adapterMode).toBe('MODE_B');
    expect(figma!.adapterPath).toContain('FT-F3');
  });
});
