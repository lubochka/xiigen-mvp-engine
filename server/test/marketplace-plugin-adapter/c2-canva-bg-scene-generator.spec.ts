/**
 * FLOW-34 — C2 Canva AI Background Scene Generator Adapter Tests
 * 26 tests: C2-R-1..10, C2-W-1..8, C2-E-1..4, C2-P-1..4
 */

import {
  mapCanvaToSceneElement,
  mapCanvaToSceneStyle,
  mapSceneStyleToCanva,
  readSceneElements,
  writeGeneratedScenes,
} from '../../../adapters/canva/FT-C2/src/canva-adapter';
import type {
  CanvaSceneElement,
  SharedSceneStyle,
  SharedSceneElement,
} from '../../../adapters/canva/FT-C2/src/types';

function makeCanvaScene(overrides: Partial<CanvaSceneElement> = {}): CanvaSceneElement {
  return {
    id: 'el-001',
    type: 'IMAGE',
    src: 'sunset.jpg',
    backgroundColor: '#87CEEB',
    width: 1920,
    height: 1080,
    position: { x: 0, y: 0 },
    opacity: 1.0,
    ...overrides,
  };
}

const CANONICAL_ELEMENT: SharedSceneElement = {
  type: 'BACKGROUND',
  src: 'sunset.jpg',
  width: 1920,
  height: 1080,
  x: 0,
  y: 0,
};
const CANONICAL_STYLE: SharedSceneStyle = {
  backgroundColor: '#87CEEB',
  opacity: 1.0,
  sceneType: 'BACKGROUND',
};
const GENERATED_SCENE = {
  prompt: 'sunset over mountains',
  imageUrl: 'https://cdn.xiigen.ai/scene/001.jpg',
};

// ── READ: mapCanvaToSceneElement (C2-R-1..5) ──────────────────────────────────

describe('FLOW-34 C2 — READ path: mapCanvaToSceneElement', () => {
  it('C2-R-1: IMAGE → BACKGROUND type', () => {
    expect(mapCanvaToSceneElement(makeCanvaScene({ type: 'IMAGE' })).type).toBe('BACKGROUND');
  });
  it('C2-R-2: SHAPE/TEXT/GROUP map correctly', () => {
    expect(mapCanvaToSceneElement(makeCanvaScene({ type: 'SHAPE' })).type).toBe('DECORATION');
    expect(mapCanvaToSceneElement(makeCanvaScene({ type: 'TEXT' })).type).toBe('TEXT');
    expect(mapCanvaToSceneElement(makeCanvaScene({ type: 'GROUP' })).type).toBe('OVERLAY');
  });
  it('C2-R-3: src preserved', () => {
    expect(mapCanvaToSceneElement(makeCanvaScene({ src: 'forest.jpg' })).src).toBe('forest.jpg');
  });
  it('C2-R-4: position.x and position.y flattened to x/y', () => {
    const el = mapCanvaToSceneElement(makeCanvaScene({ position: { x: 100, y: 200 } }));
    expect(el.x).toBe(100);
    expect(el.y).toBe(200);
  });
  it('C2-R-5: width/height preserved', () => {
    const el = mapCanvaToSceneElement(makeCanvaScene({ width: 800, height: 600 }));
    expect(el.width).toBe(800);
    expect(el.height).toBe(600);
  });
});

// ── READ: mapCanvaToSceneStyle (C2-R-6..10) ───────────────────────────────────

describe('FLOW-34 C2 — READ path: mapCanvaToSceneStyle', () => {
  it('C2-R-6: backgroundColor preserved', () => {
    expect(
      mapCanvaToSceneStyle(makeCanvaScene({ backgroundColor: '#ff0000' })).backgroundColor,
    ).toBe('#ff0000');
  });
  it('C2-R-7: missing backgroundColor defaults to #ffffff', () => {
    expect(
      mapCanvaToSceneStyle(makeCanvaScene({ backgroundColor: undefined })).backgroundColor,
    ).toBe('#ffffff');
  });
  it('C2-R-8: opacity preserved', () => {
    expect(mapCanvaToSceneStyle(makeCanvaScene({ opacity: 0.5 })).opacity).toBe(0.5);
  });
  it('C2-R-9: sceneType matches type mapping', () => {
    expect(mapCanvaToSceneStyle(makeCanvaScene({ type: 'SHAPE' })).sceneType).toBe('DECORATION');
    expect(mapCanvaToSceneStyle(makeCanvaScene({ type: 'TEXT' })).sceneType).toBe('TEXT');
  });
  it('C2-R-10: GROUP → OVERLAY sceneType', () => {
    expect(mapCanvaToSceneStyle(makeCanvaScene({ type: 'GROUP' })).sceneType).toBe('OVERLAY');
  });
});

// ── WRITE: mapSceneStyleToCanva (C2-W-1..4) ───────────────────────────────────

describe('FLOW-34 C2 — WRITE path: mapSceneStyleToCanva', () => {
  it('C2-W-1: BACKGROUND → IMAGE type', () => {
    expect(mapSceneStyleToCanva({ ...CANONICAL_STYLE, sceneType: 'BACKGROUND' }).type).toBe(
      'IMAGE',
    );
  });
  it('C2-W-2: TEXT/OVERLAY/DECORATION map correctly', () => {
    expect(mapSceneStyleToCanva({ ...CANONICAL_STYLE, sceneType: 'TEXT' }).type).toBe('TEXT');
    expect(mapSceneStyleToCanva({ ...CANONICAL_STYLE, sceneType: 'OVERLAY' }).type).toBe('GROUP');
    expect(mapSceneStyleToCanva({ ...CANONICAL_STYLE, sceneType: 'DECORATION' }).type).toBe(
      'SHAPE',
    );
  });
  it('C2-W-3: backgroundColor passes through', () => {
    expect(
      mapSceneStyleToCanva({ ...CANONICAL_STYLE, backgroundColor: '#000000' }).backgroundColor,
    ).toBe('#000000');
  });
  it('C2-W-4: opacity passes through', () => {
    expect(mapSceneStyleToCanva({ ...CANONICAL_STYLE, opacity: 0.75 }).opacity).toBe(0.75);
  });
});

// ── WRITE: writeGeneratedScenes (C2-W-5..8) ───────────────────────────────────

describe('FLOW-34 C2 — WRITE path: writeGeneratedScenes', () => {
  it('C2-W-5: writer called once, result.written = 1', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeGeneratedScenes(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedScene: GENERATED_SCENE }],
      writer,
    );
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result.written).toBe(1);
    expect(result.failed).toBe(0);
  });
  it('C2-W-6: payload type=SCENE_UPDATE, src=imageUrl, prompt, width, height', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeGeneratedScenes(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedScene: GENERATED_SCENE }],
      writer,
    );
    const payload = writer.mock.calls[0][0] as Record<string, unknown>;
    expect(payload['type']).toBe('SCENE_UPDATE');
    expect(payload['src']).toBe('https://cdn.xiigen.ai/scene/001.jpg');
    expect(payload['prompt']).toBe('sunset over mountains');
    expect(payload['width']).toBe(1920);
    expect(payload['height']).toBe(1080);
  });
  it('C2-W-7: writer failure → failed incremented, does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Canva API error'));
    const result = await writeGeneratedScenes(
      [{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE, generatedScene: GENERATED_SCENE }],
      writer,
    );
    expect(result.written).toBe(0);
    expect(result.failed).toBe(1);
  });
  it('C2-W-8: writes multiple scenes in order', async () => {
    const prompts: string[] = [];
    const writer = jest.fn().mockImplementation(async (p: Record<string, unknown>) => {
      prompts.push(p['prompt'] as string);
    });
    await writeGeneratedScenes(
      [
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedScene: { prompt: 'mountains at dawn', imageUrl: 'u1' },
        },
        {
          element: CANONICAL_ELEMENT,
          style: CANONICAL_STYLE,
          generatedScene: { prompt: 'ocean at dusk', imageUrl: 'u2' },
        },
      ],
      writer,
    );
    expect(prompts).toEqual(['mountains at dawn', 'ocean at dusk']);
  });
});

// ── Equivalence (C2-E-1..4) ───────────────────────────────────────────────────

describe('FLOW-34 C2 — Equivalence: adapter output = shared canonical', () => {
  const el = makeCanvaScene();
  it('C2-E-1: mapCanvaToSceneElement output identical to canonical element', () => {
    expect(mapCanvaToSceneElement(el)).toEqual(CANONICAL_ELEMENT);
  });
  it('C2-E-2: mapCanvaToSceneStyle output identical to canonical style', () => {
    expect(mapCanvaToSceneStyle(el)).toEqual(CANONICAL_STYLE);
  });
  it('C2-E-3: readSceneElements arrays match canonical shapes', () => {
    const { elements, styles } = readSceneElements([el]);
    expect(elements[0]).toEqual(CANONICAL_ELEMENT);
    expect(styles[0]).toEqual(CANONICAL_STYLE);
  });
  it('C2-E-4: READ→WRITE round-trip preserves backgroundColor and opacity', () => {
    const shared = mapCanvaToSceneStyle(el);
    const back = mapSceneStyleToCanva(shared);
    expect(back.backgroundColor).toBe(shared.backgroundColor);
    expect(back.opacity).toBe(shared.opacity);
  });
});

// ── Packaging (C2-P-1..4) ─────────────────────────────────────────────────────

describe('FLOW-34 C2 — Packaging + manifest checks', () => {
  it('C2-P-1: all 5 adapter functions exported', () => {
    expect(typeof mapCanvaToSceneElement).toBe('function');
    expect(typeof mapCanvaToSceneStyle).toBe('function');
    expect(typeof mapSceneStyleToCanva).toBe('function');
    expect(typeof readSceneElements).toBe('function');
    expect(typeof writeGeneratedScenes).toBe('function');
  });
  it('C2-P-2: adapter importable without @canva/design', () => {
    expect(mapCanvaToSceneElement).toBeDefined();
  });
  it('C2-P-3: package.json name follows @xiigen/canva-* convention', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../../adapters/canva/FT-C2/package.json') as { name: string };
    expect(pkg.name).toMatch(/^@xiigen\/canva-/);
  });
  it('C2-P-4: FT-C2 record in marketplace manifest', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest =
      require('../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
        features: Array<{
          ftId: string;
          portingCandidate: boolean;
          platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
        }>;
      };
    const ftC2 = manifest.features.find((f) => f.ftId === 'FT-C2');
    expect(ftC2).toBeDefined();
    expect(ftC2!.portingCandidate).toBe(true);
    const canva = ftC2!.platforms.find((p) => p.platformId === 'canva');
    expect(canva).toBeDefined();
    expect(canva!.adapterMode).toBe('MODE_B');
    expect(canva!.adapterPath).toContain('FT-C2');
  });
});
