/**
 * FLOW-34 — FR1 Framer Component Library Generator Adapter Tests
 * (Master plan: FR = Framer prefix. FR1 = Component Library Generator.)
 * 26 tests: FR1-R-1..10, FR1-W-1..8, FR1-E-1..4, FR1-P-1..4
 */

import {
  mapFramerToUIElement,
  mapFramerToUIStyle,
  mapUIStyleToFramer,
  readComponentTree,
  writeComponentNames,
} from '../.././../adapters/framer/FT-FR1/src/framer-adapter';
import type {
  FramerComponent,
  SharedUIStyle,
  SharedUIElement,
} from '../../../adapters/framer/FT-FR1/src/types';

function makeFramerComponent(overrides: Partial<FramerComponent> = {}): FramerComponent {
  return {
    id: 'comp-001',
    name: 'HeaderSection',
    type: 'frame',
    width: 1440,
    height: 120,
    backgroundColor: '#ffffff',
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedUIElement = {
  type: 'FRAME',
  name: 'HeaderSection',
  width: 1440,
  height: 120,
};
const CANONICAL_STYLE: SharedUIStyle = {
  backgroundColor: '#ffffff',
  aspectRatio: '1440/120',
  uiRole: 'FRAME',
};

// ── READ: mapFramerToUIElement (FR1-R-1..5) ───────────────────────────────────

describe('FLOW-34 FR1 — READ path: mapFramerToUIElement', () => {
  it('FR1-R-1: frame → FRAME', () => {
    expect(mapFramerToUIElement(makeFramerComponent({ type: 'frame' })).type).toBe('FRAME');
  });
  it('FR1-R-2: text/svg/image/component map correctly', () => {
    expect(mapFramerToUIElement(makeFramerComponent({ type: 'text' })).type).toBe('TEXT');
    expect(mapFramerToUIElement(makeFramerComponent({ type: 'svg' })).type).toBe('SVG');
    expect(mapFramerToUIElement(makeFramerComponent({ type: 'image' })).type).toBe('IMAGE');
    expect(mapFramerToUIElement(makeFramerComponent({ type: 'component' })).type).toBe('COMPONENT');
  });
  it('FR1-R-3: name preserved', () => {
    expect(mapFramerToUIElement(makeFramerComponent({ name: 'SideNav' })).name).toBe('SideNav');
  });
  it('FR1-R-4: width preserved', () => {
    expect(mapFramerToUIElement(makeFramerComponent({ width: 360 })).width).toBe(360);
  });
  it('FR1-R-5: height preserved', () => {
    expect(mapFramerToUIElement(makeFramerComponent({ height: 64 })).height).toBe(64);
  });
});

// ── READ: mapFramerToUIStyle (FR1-R-6..10) ────────────────────────────────────

describe('FLOW-34 FR1 — READ path: mapFramerToUIStyle', () => {
  it('FR1-R-6: backgroundColor preserved', () => {
    expect(
      mapFramerToUIStyle(makeFramerComponent({ backgroundColor: '#f5f5f5' })).backgroundColor,
    ).toBe('#f5f5f5');
  });
  it('FR1-R-7: missing backgroundColor defaults to #ffffff', () => {
    const comp = makeFramerComponent({ backgroundColor: undefined });
    expect(mapFramerToUIStyle(comp).backgroundColor).toBe('#ffffff');
  });
  it('FR1-R-8: aspectRatio = width/height string', () => {
    expect(mapFramerToUIStyle(makeFramerComponent({ width: 800, height: 600 })).aspectRatio).toBe(
      '800/600',
    );
  });
  it('FR1-R-9: uiRole derived from component type', () => {
    expect(mapFramerToUIStyle(makeFramerComponent({ type: 'text' })).uiRole).toBe('TEXT');
    expect(mapFramerToUIStyle(makeFramerComponent({ type: 'component' })).uiRole).toBe('COMPONENT');
  });
  it('FR1-R-10: aspectRatio uses exact width/height integers', () => {
    expect(mapFramerToUIStyle(makeFramerComponent({ width: 1440, height: 120 })).aspectRatio).toBe(
      '1440/120',
    );
  });
});

// ── WRITE: mapUIStyleToFramer (FR1-W-1..4) ────────────────────────────────────

describe('FLOW-34 FR1 — WRITE path: mapUIStyleToFramer', () => {
  it('FR1-W-1: FRAME → frame type', () => {
    expect(mapUIStyleToFramer({ ...CANONICAL_STYLE, uiRole: 'FRAME' }).type).toBe('frame');
  });
  it('FR1-W-2: TEXT/SVG/IMAGE/COMPONENT map correctly', () => {
    expect(mapUIStyleToFramer({ ...CANONICAL_STYLE, uiRole: 'TEXT' }).type).toBe('text');
    expect(mapUIStyleToFramer({ ...CANONICAL_STYLE, uiRole: 'SVG' }).type).toBe('svg');
    expect(mapUIStyleToFramer({ ...CANONICAL_STYLE, uiRole: 'IMAGE' }).type).toBe('image');
    expect(mapUIStyleToFramer({ ...CANONICAL_STYLE, uiRole: 'COMPONENT' }).type).toBe('component');
  });
  it('FR1-W-3: backgroundColor passes through', () => {
    expect(
      mapUIStyleToFramer({ ...CANONICAL_STYLE, backgroundColor: '#1a1a1a' }).backgroundColor,
    ).toBe('#1a1a1a');
  });
  it('FR1-W-4: aspectRatio not in write payload (read-only dimension)', () => {
    const result = mapUIStyleToFramer(CANONICAL_STYLE);
    expect('aspectRatio' in result).toBe(false);
  });
});

// ── WRITE: writeComponentNames (FR1-W-5..8) ───────────────────────────────────

describe('FLOW-34 FR1 — WRITE path: writeComponentNames', () => {
  it('FR1-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeComponentNames(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedName: 'NavBar Primary Header',
        },
      ],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('FR1-W-6: payload type=COMPONENT_RENAME, name, componentType=frame, backgroundColor=#ffffff', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeComponentNames(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedName: 'NavBar Primary Header',
        },
      ],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('COMPONENT_RENAME');
    expect(payload['name']).toBe('NavBar Primary Header');
    expect(payload['componentType']).toBe('frame');
    expect(payload['backgroundColor']).toBe('#ffffff');
  });
  it('FR1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Framer API error'));
    const result = await writeComponentNames(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedName: 'Test' }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('FR1-W-8: writes multiple components in order', async () => {
    const names: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      names.push(p['name'] as string);
    });
    await writeComponentNames(
      [
        { element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedName: 'Hero Banner' },
        { element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedName: 'Footer Section' },
      ],
      writer,
    );
    expect(names).toEqual(['Hero Banner', 'Footer Section']);
  });
});

// ── Equivalence (FR1-E-1..4) ──────────────────────────────────────────────────

describe('FLOW-34 FR1 — Equivalence: adapter output = shared canonical', () => {
  const comp = makeFramerComponent();
  it('FR1-E-1: mapFramerToUIElement output identical to canonical element', () => {
    expect(mapFramerToUIElement(comp)).toEqual(CANONICAL_ELEMENT);
  });
  it('FR1-E-2: mapFramerToUIStyle output identical to canonical style', () => {
    expect(mapFramerToUIStyle(comp)).toEqual(CANONICAL_STYLE);
  });
  it('FR1-E-3: readComponentTree arrays match canonical shapes', () => {
    const { elements, styles } = readComponentTree([comp]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('FR1-E-4: READ→WRITE round-trip preserves type and backgroundColor', () => {
    const shared = mapFramerToUIStyle(comp);
    const back = mapUIStyleToFramer(shared);
    expect(back.type).toBe(comp.type);
    expect(back.backgroundColor).toBe(comp.backgroundColor);
  });
});

// ── Packaging (FR1-P-1..4) ────────────────────────────────────────────────────

describe('FLOW-34 FR1 — Packaging + manifest checks', () => {
  it('FR1-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapFramerToUIElement).toBe('function');
    expect(typeof mapFramerToUIStyle).toBe('function');
    expect(typeof mapUIStyleToFramer).toBe('function');
    expect(typeof readComponentTree).toBe('function');
    expect(typeof writeComponentNames).toBe('function');
  });
  it('FR1-P-2: adapter importable without framer-plugin', () => {
    expect(mapFramerToUIElement).toBeDefined();
  });
  it('FR1-P-3: package.json name follows @xiigen/framer-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/framer/FT-FR1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/framer-/);
  });
  it('FR1-P-4: FT-FR1 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftFr1 = manifest.features.find((f) => f.ftId === 'FT-FR1');
    expect(ftFr1).toBeDefined();
    expect(ftFr1!.portingCandidate).toBe(true);
    const framer = ftFr1!.platforms.find((p) => p.platformId === 'framer');
    expect(framer).toBeDefined();
    expect(framer!.adapterMode).toBe('MODE_B');
    expect(framer!.adapterPath).toContain('FT-FR1');
  });
});
