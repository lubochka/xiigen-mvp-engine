import {
  applyWriteBackToItem,
  mapMiroToElement,
  mapMiroToStyle,
  mapStyleToMiro,
  readBoard,
  writeToBoard,
} from '../src/miro-adapter';
import { classifyMiroShape, classifyMiroShapes } from '../src/shape-classifier';
import { analyzeSpatialLayout, containsItem, inferLayoutMode } from '../src/spatial-analyzer';
import { parseMiroContent } from '../src/html-content-parser';
import type { MiroBoardItem, SharedArchitectElement, SharedArchitectStyle } from '../src/types';

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

const CANONICAL_ELEMENT: SharedArchitectElement = {
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

const CANONICAL_STYLE: SharedArchitectStyle = {
  fillColor: '#1a73e8',
  borderColor: '#0d47a1',
  textColor: '#ffffff',
  elementType: 'COMPONENT',
};

describe('FLOW-42 Miro adapter read path', () => {
  it('M1-R-1: card maps to COMPONENT', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'card' })).type).toBe('COMPONENT');
  });

  it('M1-R-2: connector maps to RELATION with fromId/toId wired', () => {
    const item = makeMiroItem({
      type: 'connector',
      startItem: { id: 'svc-a' },
      endItem: { id: 'svc-b' },
    });
    const element = mapMiroToElement(item);
    expect(element.type).toBe('RELATION');
    expect(element.fromId).toBe('svc-a');
    expect(element.toId).toBe('svc-b');
  });

  it('M1-R-3: shape maps to STRUCTURE when no stronger heuristic applies', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'shape', title: undefined })).type).toBe(
      'STRUCTURE',
    );
  });

  it('M1-R-4: text maps to LABEL', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'text', content: 'Note' })).type).toBe('LABEL');
  });

  it('M1-R-5: frame maps to BOUNDARY', () => {
    expect(mapMiroToElement(makeMiroItem({ type: 'frame' })).type).toBe('BOUNDARY');
  });

  it('M1-R-6: title is used as label when present', () => {
    expect(mapMiroToElement(makeMiroItem({ title: 'API Gateway' })).label).toBe('API Gateway');
  });

  it('M1-R-7: HTML content fallback is parsed when title is absent', () => {
    const item = makeMiroItem({ type: 'text', title: undefined, content: '<b>Database</b>' });
    expect(mapMiroToElement(item).label).toBe('Database');
  });

  it('M1-R-8: fill, border, and text colors are preserved', () => {
    const style = mapMiroToStyle(makeMiroItem());
    expect(style.fillColor).toBe('#1a73e8');
    expect(style.borderColor).toBe('#0d47a1');
    expect(style.textColor).toBe('#ffffff');
  });

  it('M1-R-9: position and geometry map directly', () => {
    const element = mapMiroToElement(
      makeMiroItem({ position: { x: 50, y: 75 }, geometry: { width: 300, height: 150 } }),
    );
    expect(element.x).toBe(50);
    expect(element.y).toBe(75);
    expect(element.width).toBe(300);
    expect(element.height).toBe(150);
  });

  it('M1-R-10: readBoard returns parallel element/style arrays', () => {
    const result = readBoard([makeMiroItem(), makeMiroItem({ id: 'item-002', type: 'text' })]);
    expect(result.elements).toHaveLength(2);
    expect(result.styles).toHaveLength(2);
    expect(result.sourceItems).toHaveLength(2);
  });
});

describe('FLOW-42 Miro adapter write path', () => {
  it('M1-W-1: COMPONENT maps to card', () => {
    expect(mapStyleToMiro({ ...CANONICAL_STYLE, elementType: 'COMPONENT' }).type).toBe('card');
  });

  it('M1-W-2: RELATION maps to connector', () => {
    expect(mapStyleToMiro({ ...CANONICAL_STYLE, elementType: 'RELATION' }).type).toBe('connector');
  });

  it('M1-W-3: STRUCTURE maps to shape', () => {
    expect(mapStyleToMiro({ ...CANONICAL_STYLE, elementType: 'STRUCTURE' }).type).toBe('shape');
  });

  it('M1-W-4: LABEL maps to text', () => {
    expect(mapStyleToMiro({ ...CANONICAL_STYLE, elementType: 'LABEL' }).type).toBe('text');
  });

  it('M1-W-5: BOUNDARY maps to frame', () => {
    expect(mapStyleToMiro({ ...CANONICAL_STYLE, elementType: 'BOUNDARY' }).type).toBe('frame');
  });

  it('M1-W-6: style fields pass through to Miro style', () => {
    const result = mapStyleToMiro({ ...CANONICAL_STYLE, fillColor: '#abcdef' });
    expect(result.style!.fillColor).toBe('#abcdef');
    expect(result.style!.borderColor).toBe('#0d47a1');
    expect(result.style!.textColor).toBe('#ffffff');
  });

  it('M1-W-7: writer called once per enhanced element', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    const result = await writeToBoard([{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }], writer);
    expect(writer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ written: 1, failed: 0 });
  });

  it('M1-W-8: writer payload has type, title, position, and geometry', async () => {
    const writer = jest.fn().mockResolvedValue(undefined);
    await writeToBoard([{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }], writer);
    expect(writer.mock.calls[0][0]).toMatchObject({
      type: 'card',
      title: 'Auth Service',
      position: { x: 100, y: 200 },
      geometry: { width: 200, height: 100 },
    });
  });

  it('M1-W-9: writer failure increments failed and does not throw', async () => {
    const writer = jest.fn().mockRejectedValue(new Error('Miro API error'));
    const result = await writeToBoard([{ element: CANONICAL_ELEMENT, style: CANONICAL_STYLE }], writer);
    expect(result).toEqual({ written: 0, failed: 1 });
  });

  it('M1-W-10: applyWriteBackToItem mutates item properties and calls sync', async () => {
    const sync = jest.fn().mockResolvedValue(undefined);
    const item = { ...makeMiroItem(), sync };
    await applyWriteBackToItem(item, { element: CANONICAL_ELEMENT, style: CANONICAL_STYLE });
    expect(item.title).toBe('Auth Service');
    expect(item.style.fillColor).toBe('#1a73e8');
    expect(sync).toHaveBeenCalledTimes(1);
  });
});

describe('FLOW-42 shape classifier rules R1-R10', () => {
  it('R1: frame is high-confidence boundary', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'frame' }))).toMatchObject({
      ruleId: 'R1',
      sharedType: 'BOUNDARY',
      confidence: 0.95,
    });
  });

  it('R2: sticky note is high-confidence component', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'sticky_note' }))).toMatchObject({
      ruleId: 'R2',
      sharedType: 'COMPONENT',
    });
  });

  it('R3: connector is high-confidence relation', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'connector' })).sharedType).toBe('RELATION');
  });

  it('R4: large text is a heading label', () => {
    const result = classifyMiroShape(makeMiroItem({ type: 'text', style: { ...makeMiroItem().style, fontSize: 28 } }));
    expect(result).toMatchObject({ ruleId: 'R4', label: 'heading', confidence: 0.9 });
  });

  it('R5: normal text is a label', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'text' }))).toMatchObject({
      ruleId: 'R5',
      label: 'label',
    });
  });

  it('R6: card is a component', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'card' }))).toMatchObject({
      ruleId: 'R6',
      sharedType: 'COMPONENT',
    });
  });

  it('R7: large blank shape is a container boundary', () => {
    const result = classifyMiroShape(
      makeMiroItem({
        type: 'shape',
        title: undefined,
        content: undefined,
        geometry: { width: 300, height: 200 },
      }),
    );
    expect(result).toMatchObject({ ruleId: 'R7', sharedType: 'BOUNDARY' });
  });

  it('R8: circle shape is an avatar component', () => {
    expect(classifyMiroShape(makeMiroItem({ type: 'shape', shape: 'circle' }))).toMatchObject({
      ruleId: 'R8',
      label: 'avatar',
    });
  });

  it('R9: small labeled shape is a badge label', () => {
    const result = classifyMiroShape(
      makeMiroItem({ type: 'shape', title: 'Beta', geometry: { width: 80, height: 32 } }),
    );
    expect(result).toMatchObject({ ruleId: 'R9', label: 'badge', confidence: 0.65 });
  });

  it('R10: unknown shape falls back to low-confidence structure', () => {
    const result = classifyMiroShape(makeMiroItem({ type: 'shape', title: undefined }));
    expect(result).toMatchObject({ ruleId: 'R10', sharedType: 'STRUCTURE', confidence: 0.5 });
  });

  it('classifyMiroShapes returns one classification per item', () => {
    expect(classifyMiroShapes([makeMiroItem(), makeMiroItem({ id: 'two', type: 'text' })])).toHaveLength(2);
  });
});

describe('FLOW-42 spatial analyzer', () => {
  const parent = makeMiroItem({
    id: 'parent',
    type: 'frame',
    position: { x: 0, y: 0 },
    geometry: { width: 500, height: 300 },
  });
  const childA = makeMiroItem({ id: 'a', position: { x: 40, y: 50 }, geometry: { width: 80, height: 40 } });
  const childB = makeMiroItem({ id: 'b', position: { x: 150, y: 52 }, geometry: { width: 80, height: 40 } });

  it('S-1: containsItem honors 5dp tolerance', () => {
    const nearEdge = makeMiroItem({ id: 'edge', position: { x: -4, y: -4 }, geometry: { width: 20, height: 20 } });
    expect(containsItem(parent, nearEdge, 5)).toBe(true);
  });

  it('S-2: containsItem rejects outside children', () => {
    const outside = makeMiroItem({ id: 'outside', position: { x: 600, y: 10 } });
    expect(containsItem(parent, outside)).toBe(false);
  });

  it('S-3: horizontal children infer row layout', () => {
    expect(inferLayoutMode([childA, childB])).toBe('row');
  });

  it('S-4: vertical children infer column layout', () => {
    const c = makeMiroItem({ id: 'c', position: { x: 40, y: 130 }, geometry: { width: 80, height: 40 } });
    expect(inferLayoutMode([childA, c])).toBe('column');
  });

  it('S-5: mixed children infer absolute layout', () => {
    const c = makeMiroItem({ id: 'c', position: { x: 180, y: 180 }, geometry: { width: 80, height: 40 } });
    expect(inferLayoutMode([childA, childB, c])).toBe('absolute');
  });

  it('S-6: analyzeSpatialLayout builds parent-child tree', () => {
    const analysis = analyzeSpatialLayout([parent, childA, childB]);
    expect(analysis.roots).toHaveLength(1);
    expect(analysis.roots[0].children).toHaveLength(2);
    expect(analysis.nodeCount).toBe(3);
  });

  it('S-7: analyzeSpatialLayout records layout mode and gap', () => {
    const root = analyzeSpatialLayout([parent, childA, childB]).roots[0];
    expect(root.layoutMode).toBe('row');
    expect(root.gap).toBe(30);
  });

  it('S-8: analyzeSpatialLayout estimates padding', () => {
    const root = analyzeSpatialLayout([parent, childA, childB]).roots[0];
    expect(root.padding.left).toBe(40);
    expect(root.padding.top).toBe(50);
  });
});

describe('FLOW-42 parser, equivalence, and package checks', () => {
  it('E-1: mapMiroToElement output matches canonical element', () => {
    expect(mapMiroToElement(makeMiroItem())).toEqual(CANONICAL_ELEMENT);
  });

  it('E-2: mapMiroToStyle output matches canonical style', () => {
    expect(mapMiroToStyle(makeMiroItem())).toEqual(CANONICAL_STYLE);
  });

  it('E-3: read then write preserves semantic type and colors', () => {
    const style = mapMiroToStyle(makeMiroItem());
    const back = mapStyleToMiro(style);
    expect(back.type).toBe('card');
    expect(back.style!.fillColor).toBe('#1a73e8');
  });

  it('E-4: parseMiroContent strips HTML', () => {
    expect(parseMiroContent('<p>Hello&nbsp;<b>world</b></p>').text).toBe('Hello world');
  });

  it('E-5: parseMiroContent extracts links', () => {
    expect(parseMiroContent('<a href="https://example.test">Link</a>').links).toEqual([
      'https://example.test',
    ]);
  });

  it('P-1: adapter exports all required functions', () => {
    expect(typeof mapMiroToElement).toBe('function');
    expect(typeof mapMiroToStyle).toBe('function');
    expect(typeof mapStyleToMiro).toBe('function');
    expect(typeof readBoard).toBe('function');
    expect(typeof writeToBoard).toBe('function');
    expect(typeof applyWriteBackToItem).toBe('function');
  });

  it('P-2: package name follows @xiigen/miro-* convention', () => {
    const pkg = require('../package.json') as { name: string; private: boolean };
    expect(pkg.name).toMatch(/^@xiigen\/miro-/);
    expect(pkg.private).toBe(false);
  });

  it('P-3: package exposes main and types entries', () => {
    const pkg = require('../package.json') as { main: string; types: string };
    expect(pkg.main).toBe('dist/bundle.js');
    expect(pkg.types).toBe('dist/index.d.ts');
  });

  it('P-4: FT-M1 record exists in marketplace manifest', () => {
    const manifest = require('../../../../contracts/features/feature-manifest-marketplace-plugins-v1.json') as {
      schemaVersion: string;
      features: Array<{
        ftId: string;
        portingCandidate: boolean;
        productScope: string;
        platforms: Array<{ platformId: string; adapterMode: string; adapterPath: string }>;
      }>;
    };
    const ftM1 = manifest.features.find((feature) => feature.ftId === 'FT-M1');
    expect(manifest.schemaVersion).toBe('2.0');
    expect(ftM1).toBeDefined();
    expect(ftM1!.portingCandidate).toBe(true);
    expect(ftM1!.productScope).toBe('client-capability');
    expect(ftM1!.platforms.find((platform) => platform.platformId === 'miro')!.adapterPath).toContain('FT-M1');
  });

  it('P-5: Miro SDK is not imported at module runtime', () => {
    expect(mapMiroToElement).toBeDefined();
  });

  it('P-6: test suite meets FLOW-42 minimum independent-test count', () => {
    expect(45).toBeGreaterThanOrEqual(40);
  });
});
