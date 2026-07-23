/**
 * FLOW-34 — M1 Miro AI Architect Adapter Tests
 *
 * 26 tests in 4 groups:
 *   M1-R-1..M1-R-10:  READ path — mapMiroToElement, mapMiroToStyle
 *   M1-W-1..M1-W-8:   WRITE path — mapStyleToMiro, writeToBoard
 *   M1-E-1..M1-E-4:   Equivalence — output IDENTICAL to shared canonical model
 *   M1-P-1..M1-P-4:   Packaging structure + FT-M1 manifest record
 *
 * Run from server/ context — adapter has no external SDK imports (testability by design).
 */

import {
  mapMiroToElement,
  mapMiroToStyle,
  mapStyleToMiro,
  readBoard,
  writeToBoard,
} from '../.././../adapters/miro/FT-M1/src/miro-adapter';
import type {
  MiroBoardItem,
  SharedArchitectStyle,
  SharedArchitectElement,
} from '../../../adapters/miro/FT-M1/src/types';

// ── Test fixtures ─────────────────────────────────────────────────────────────

function makeMiroItem(overrides: Partial<MiroBoardItem> = {}): MiroBoardItem {
  return {
    id: 'item-001',
    type: 'card',
    title: 'Auth Service',
    style: { fillColor: '#1a73e8', borderColor: '#0d47a1', textColor: '#ffffff' },
    position: { x: 100, y: 200 },
    geometry: { width: 200, height: 100 },
    ...overrides,
  };
}

// Canonical model — the shared architecture engine contract.
// Miro adapter must produce IDENTICAL output for the same logical item.
const FIGMA_CANONICAL_ELEMENT: SharedArchitectElement = {
  type: 'COMPONENT',
  label: 'Auth Service',
  color: '#1a73e8',
  x: 100,
  y: 200,
  width: 200,
  height: 100,
  fromId: undefined,
  toId: undefined,
};

const FIGMA_CANONICAL_STYLE: SharedArchitectStyle = {
  fillColor: '#1a73e8',
  borderColor: '#0d47a1',
  textColor: '#ffffff',
  elementType: 'COMPONENT',
};

// ── Group 1: READ path — mapMiroToElement (M1-R-1..M1-R-5) ───────────────────

describe('FLOW-34 M1 — READ path: mapMiroToElement', () => {
  it('M1-R-1: card → COMPONENT', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'card' })).type).toBe('COMPONENT');
  });

  it('M1-R-2: connector → RELATION with fromId/toId wired', () => {
    const item = makeMiroItem({
      type: 'connector',
      startItem: { id: 'svc-a' },
      endItem: { id: 'svc-b' },
    });
    const el = mapMiroToElement(item);
    expect(el.type).toBe('RELATION');
    expect(el.fromId).toBe('svc-a');
    expect(el.toId).toBe('svc-b');
  });

  it('M1-R-3: shape → STRUCTURE, text → LABEL, frame → BOUNDARY', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'shape' })).type).toBe('STRUCTURE');
    expect(mapMiroToElement(makeMiroItem({ type: 'text', content: 'Note' })).type).toBe('LABEL');
    expect(mapMiroToElement(makeMiroItem({ type: 'frame' })).type).toBe('BOUNDARY');
  });

  it('M1-R-4: title used as label when present', () => {
    expect(mapMiroToElement(makeMiroItem({ title: 'API Gateway' })).label).toBe('API Gateway');
  });

  it('M1-R-5: content fallback when title is absent', () => {
    const item = makeMiroItem({ type: 'text', content: 'DB', title: undefined });
    expect(mapMiroToElement(item).label).toBe('DB');
  });
});

// ── Group 1 continued: mapMiroToStyle (M1-R-6..M1-R-10) ─────────────────────

describe('FLOW-34 M1 — READ path: mapMiroToStyle', () => {
  it('M1-R-6: fillColor preserved', () => {
    const style = makeMiroItem({
      style: { fillColor: '#ff5733', borderColor: '#c70039', textColor: '#000000' },
    });
    expect(mapMiroToStyle(style).fillColor).toBe('#ff5733');
  });

  it('M1-R-7: borderColor preserved', () => {
    expect(mapMiroToStyle(makeMiroItem()).borderColor).toBe('#0d47a1');
  });

  it('M1-R-8: textColor preserved', () => {
    expect(mapMiroToStyle(makeMiroItem()).textColor).toBe('#ffffff');
  });

  it('M1-R-9: elementType derived from Miro item type', () => {
    expect(mapMiroToStyle(makeMiroItem({ type: 'shape' })).elementType).toBe('STRUCTURE');
    expect(mapMiroToStyle(makeMiroItem({ type: 'frame' })).elementType).toBe('BOUNDARY');
  });

  it('M1-R-10: x/y and width/height mapped correctly from geometry and position', () => {
    const el = mapMiroToElement(
      makeMiroItem({
        position: { x: 50, y: 75 },
        geometry: { width: 300, height: 150 },
      }),
    );
    expect(el.x).toBe(50);
    expect(el.y).toBe(75);
    expect(el.width).toBe(300);
    expect(el.height).toBe(150);
  });
});

// ── Group 2: WRITE path — mapStyleToMiro (M1-W-1..M1-W-4) ───────────────────

describe('FLOW-34 M1 — WRITE path: mapStyleToMiro', () => {
  it('M1-W-1: COMPONENT → card type', () => {
    expect(mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, elementType: 'COMPONENT' }).type).toBe(
      'card',
    );
  });

  it('M1-W-2: RELATION→connector, STRUCTURE→shape, LABEL→text, BOUNDARY→frame', () => {
    expect(mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, elementType: 'RELATION' }).type).toBe(
      'connector',
    );
    expect(mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, elementType: 'STRUCTURE' }).type).toBe(
      'shape',
    );
    expect(mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, elementType: 'LABEL' }).type).toBe('text');
    expect(mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, elementType: 'BOUNDARY' }).type).toBe(
      'frame',
    );
  });

  it('M1-W-3: fillColor passes through to Miro style', () => {
    const result = mapStyleToMiro({ ...FIGMA_CANONICAL_STYLE, fillColor: '#abcdef' });
    expect(result.style!.fillColor).toBe('#abcdef');
  });

  it('M1-W-4: borderColor and textColor pass through', () => {
    const result = mapStyleToMiro(FIGMA_CANONICAL_STYLE);
    expect(result.style!.borderColor).toBe('#0d47a1');
    expect(result.style!.textColor).toBe('#ffffff');
  });
});

// ── Group 2 continued: writeToBoard (M1-W-5..M1-W-8) ────────────────────────

describe('FLOW-34 M1 — WRITE path: writeToBoard', () => {
  it('M1-W-5: writer called once per element, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeToBoard(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('M1-W-6: payload has type=card, title=label, position, geometry', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeToBoard(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('card');
    expect(payload['title']).toBe('Auth Service');
    const pos = payload['position'] as { x: number; y: number };
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(200);
    const geo = payload['geometry'] as { width: number; height: number };
    expect(geo.width).toBe(200);
    expect(geo.height).toBe(100);
  });

  it('M1-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Miro API error'));
    const result = await writeToBoard(
      [{ element: FIGMA_CANONICAL_ELEMENT, style: FIGMA_CANONICAL_STYLE }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });

  it('M1-W-8: writes multiple items in order', async () => {
    const labels: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      labels.push(p['title'] as string);
    });
    await writeToBoard(
      [
        {
          element: { ...FIGMA_CANONICAL_ELEMENT, label: 'API Gateway' },
          style: FIGMA_CANONICAL_STYLE,
        },
        {
          element: { ...FIGMA_CANONICAL_ELEMENT, label: 'Database' },
          style: FIGMA_CANONICAL_STYLE,
        },
      ],
      writer,
    );
    expect(labels).toEqual(['API Gateway', 'Database']);
  });
});

// ── Group 3: Equivalence (M1-E-1..M1-E-4) ────────────────────────────────────

describe('FLOW-34 M1 — Equivalence: Miro adapter output = shared canonical model', () => {
  const miroItem = makeMiroItem();

  it('M1-E-1: mapMiroToElement output identical to canonical element', () => {
    expect(mapMiroToElement(miroItem)).toEqual(FIGMA_CANONICAL_ELEMENT);
  });

  it('M1-E-2: mapMiroToStyle output identical to canonical style', () => {
    expect(mapMiroToStyle(miroItem)).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('M1-E-3: readBoard arrays match canonical shapes', () => {
    const { elements, styles } = readBoard([miroItem]);
    expect(elements[0]).toEqual(FIGMA_CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(FIGMA_CANONICAL_STYLE);
  });

  it('M1-E-4: READ→WRITE round-trip preserves semantic values (idempotent mapping)', () => {
    const shared = mapMiroToStyle(miroItem);
    const back = mapStyleToMiro(shared);
    expect(back.type).toBe(miroItem.type);
    expect(back.style!.fillColor).toBe(miroItem.style.fillColor);
    expect(back.style!.borderColor).toBe(miroItem.style.borderColor);
  });
});

// ── Group 4: Packaging checks (M1-P-1..M1-P-4) ───────────────────────────────

describe('FLOW-34 M1 — Packaging + manifest checks', () => {
  it('M1-P-1: all 5 adapter functions are exported', () => {
    expect(typeof mapMiroToElement).toBe('function');
    expect(typeof mapMiroToStyle).toBe('function');
    expect(typeof mapStyleToMiro).toBe('function');
    expect(typeof readBoard).toBe('function');
    expect(typeof writeToBoard).toBe('function');
  });

  it('M1-P-2: adapter importable without @mirohq/miro-api (no SDK at module level)', () => {
    expect(mapMiroToElement).toBeDefined();
  });

  it('M1-P-3: package.json name follows @xiigen/miro-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const pkg = require('../.././../adapters/miro/FT-M1/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/miro-/);
  });

  it('M1-P-4: FT-M1 record in marketplace manifest has required FLOW-34 fields', () => {
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
    const ftM1 = manifest.features.find((f) => f.ftId === 'FT-M1');
    expect(ftM1).toBeDefined();
    expect(ftM1!.portingCandidate).toBe(true);
    expect(ftM1!.productScope).toBe('client-capability');
    const miroPlatform = ftM1!.platforms.find((p) => p.platformId === 'miro');
    expect(miroPlatform).toBeDefined();
    expect(miroPlatform!.adapterMode).toBe('MODE_B');
    expect(miroPlatform!.adapterPath).toContain('FT-M1');
  });
});
