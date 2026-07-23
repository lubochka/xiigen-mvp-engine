import {
  buildFramerTextAttributes,
  createTextUpdate,
  fontWeightToStyle,
  isFramerTextNode,
  mapFramerTextNodeToElement,
  mapFramerTextNodeToStyle,
  normalizeFontWeight,
  normalizeNumber,
  normalizePaint,
  readSelectionWithFramer,
  readStoredTextAdapterState,
  readTextNodes,
  rgbaToPaint,
  writeSelectionWithFramer,
  writeStoredTextAdapterState,
  writeTextElements,
  type FramerNodeLike,
  type FramerPluginRuntimeFacade,
  type FramerPluginStorageFacade,
  type FramerTextAdapterOutput,
  type FramerTextNode,
  type FramerTextUpdate,
} from '../src';

const TEXT_NODE: FramerTextNode = {
  id: 'txt-1',
  type: 'text',
  name: 'Hero Title',
  text: 'Build beautifully',
  width: 320,
  height: 64,
  fontFamily: 'Inter',
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 40,
  letterSpacing: -0.2,
  color: 'rgba(17, 24, 39, 0.88)',
  opacity: 0.92,
};

const FRAME_NODE: FramerNodeLike = {
  id: 'frame-1',
  type: 'frame',
  name: 'Card',
  width: 640,
  height: 480,
};

function outputFixture(overrides: Partial<FramerTextAdapterOutput> = {}): FramerTextAdapterOutput {
  const element = mapFramerTextNodeToElement(TEXT_NODE);
  const style = mapFramerTextNodeToStyle(TEXT_NODE);
  return { element, style, nextText: 'Updated copy', ...overrides };
}

describe('FLOW-44 text-node filter CF-804', () => {
  it('F-1: accepts lowercase text nodes', () => {
    expect(isFramerTextNode(TEXT_NODE)).toBe(true);
  });

  it('F-2: accepts uppercase Text nodes', () => {
    expect(isFramerTextNode({ ...TEXT_NODE, type: 'Text' })).toBe(true);
  });

  it('F-3: rejects frame nodes', () => {
    expect(isFramerTextNode(FRAME_NODE)).toBe(false);
  });

  it('F-4: rejects nodes without ids', () => {
    expect(isFramerTextNode({ type: 'text' } as FramerNodeLike)).toBe(false);
  });

  it('F-5: readTextNodes filters a mixed selection', () => {
    const result = readTextNodes([FRAME_NODE, TEXT_NODE]);
    expect(result.sourceNodes).toHaveLength(1);
  });

  it('F-6: maps node id into shared element id', () => {
    expect(mapFramerTextNodeToElement(TEXT_NODE).id).toBe('txt-1');
  });

  it('F-7: falls back to id when name is missing', () => {
    expect(mapFramerTextNodeToElement({ ...TEXT_NODE, name: undefined }).name).toBe('txt-1');
  });

  it('F-8: reads text from text field first', () => {
    expect(mapFramerTextNodeToElement({ ...TEXT_NODE, characters: 'Ignored' }).text).toBe(
      'Build beautifully',
    );
  });

  it('F-9: reads characters when text is absent', () => {
    expect(mapFramerTextNodeToElement({ ...TEXT_NODE, text: undefined, characters: 'Characters' }).text).toBe(
      'Characters',
    );
  });

  it('F-10: defaults missing dimensions to zero', () => {
    const element = mapFramerTextNodeToElement({ ...TEXT_NODE, width: undefined, height: undefined });
    expect(element).toMatchObject({ width: 0, height: 0 });
  });
});

describe('FLOW-44 typography mapping CF-805', () => {
  it('T-1: maps 100 weight to Thin', () => {
    expect(fontWeightToStyle(100)).toBe('Thin');
  });

  it('T-2: maps 200 weight to ExtraLight', () => {
    expect(fontWeightToStyle(200)).toBe('ExtraLight');
  });

  it('T-3: maps named bold to 700', () => {
    expect(normalizeFontWeight('bold')).toBe(700);
  });

  it('T-4: maps spaced named weight', () => {
    expect(normalizeFontWeight('Extra Bold')).toBe(800);
  });

  it('T-5: rounds middle numeric weights to the nearest hundred', () => {
    expect(normalizeFontWeight(451)).toBe(500);
  });

  it('T-6: clamps low weights', () => {
    expect(normalizeFontWeight(20)).toBe(100);
  });

  it('T-7: clamps high weights', () => {
    expect(normalizeFontWeight(1200)).toBe(900);
  });

  it('T-8: defaults unknown weights to Regular', () => {
    expect(fontWeightToStyle('unknown')).toBe('Regular');
  });

  it('T-9: normalizes numeric strings', () => {
    expect(normalizeFontWeight('600')).toBe(600);
  });

  it('T-10: parses number-like strings', () => {
    expect(normalizeNumber('24px', 16)).toBe(24);
  });
});

describe('FLOW-44 paint and style mapping CF-805', () => {
  it('P-1: converts rgba to solid paint', () => {
    expect(rgbaToPaint('rgba(255, 128, 0, 0.5)')).toEqual({
      type: 'solid',
      color: '#ff8000',
      opacity: 0.5,
    });
  });

  it('P-2: converts rgb to full-opacity paint', () => {
    expect(rgbaToPaint('rgb(17, 24, 39)')).toEqual({
      type: 'solid',
      color: '#111827',
      opacity: 1,
    });
  });

  it('P-3: returns null for non-rgb strings', () => {
    expect(rgbaToPaint('currentColor')).toBeNull();
  });

  it('P-4: normalizes six-character hex', () => {
    expect(normalizePaint('#ABCDEF')).toEqual({ type: 'solid', color: '#abcdef', opacity: 1 });
  });

  it('P-5: expands short hex', () => {
    expect(normalizePaint('#0f8')).toEqual({ type: 'solid', color: '#00ff88', opacity: 1 });
  });

  it('P-6: reads object color and opacity', () => {
    expect(normalizePaint({ type: 'solid', color: '#123456', opacity: 0.3 })).toEqual({
      type: 'solid',
      color: '#123456',
      opacity: 0.3,
    });
  });

  it('P-7: falls back for invalid color strings', () => {
    expect(normalizePaint('brand-primary')).toEqual({ type: 'solid', color: '#000000', opacity: 1 });
  });

  it('P-8: applies fallback opacity when color is missing', () => {
    expect(normalizePaint(undefined, 0.42).opacity).toBe(0.42);
  });

  it('P-9: style mapping prefers fills over color', () => {
    const style = mapFramerTextNodeToStyle({
      ...TEXT_NODE,
      color: '#ffffff',
      fills: [{ color: '#101010', opacity: 0.25 }],
    });
    expect(style.paint).toEqual({ type: 'solid', color: '#101010', opacity: 0.25 });
  });

  it('P-10: style mapping preserves text typography fields', () => {
    const style = mapFramerTextNodeToStyle(TEXT_NODE);
    expect(style).toMatchObject({
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 40,
      letterSpacing: -0.2,
    });
  });
});

describe('FLOW-44 write, runtime, and storage CF-806', () => {
  it('W-1: buildFramerTextAttributes omits text when no text is supplied', () => {
    expect(buildFramerTextAttributes(mapFramerTextNodeToStyle(TEXT_NODE)).text).toBeUndefined();
  });

  it('W-2: buildFramerTextAttributes writes both text aliases', () => {
    const attrs = buildFramerTextAttributes(mapFramerTextNodeToStyle(TEXT_NODE), 'Hello');
    expect(attrs).toMatchObject({ text: 'Hello', characters: 'Hello' });
  });

  it('W-3: createTextUpdate writes the target node id', () => {
    expect(createTextUpdate(outputFixture()).nodeId).toBe('txt-1');
  });

  it('W-4: createTextUpdate prefers nextText', () => {
    expect(createTextUpdate(outputFixture()).attributes.text).toBe('Updated copy');
  });

  it('W-5: createTextUpdate falls back to existing element text', () => {
    expect(createTextUpdate(outputFixture({ nextText: undefined })).attributes.text).toBe(
      'Build beautifully',
    );
  });

  it('W-6: writeTextElements counts successful writes', async () => {
    const result = await writeTextElements([outputFixture(), outputFixture()], () => undefined);
    expect(result).toMatchObject({ written: 2, failed: 0 });
  });

  it('W-7: writeTextElements counts failed writes without throwing', async () => {
    const result = await writeTextElements([outputFixture()], () => {
      throw new Error('write failed');
    });
    expect(result).toMatchObject({ written: 0, failed: 1 });
  });

  it('W-8: writeTextElements returns attempted updates', async () => {
    const result = await writeTextElements([outputFixture()], () => undefined);
    expect(result.updates[0]?.attributes.fills?.[0].color).toBe('#111827');
  });

  it('W-9: readStoredTextAdapterState returns empty object for missing data', async () => {
    const storage: FramerPluginStorageFacade = {
      getPluginData: () => undefined,
      setPluginData: () => undefined,
    };
    await expect(readStoredTextAdapterState(storage, 'state')).resolves.toEqual({});
  });

  it('W-10: readStoredTextAdapterState returns empty object for invalid JSON', async () => {
    const storage: FramerPluginStorageFacade = {
      getPluginData: () => 'not-json',
      setPluginData: () => undefined,
    };
    await expect(readStoredTextAdapterState(storage, 'state')).resolves.toEqual({});
  });

  it('W-11: writeStoredTextAdapterState serializes JSON through plugin data', async () => {
    const writes: string[] = [];
    const storage: FramerPluginStorageFacade = {
      getPluginData: () => undefined,
      setPluginData: (_key, value) => {
        writes.push(value);
      },
    };
    await writeStoredTextAdapterState(storage, 'state', { count: 2 });
    expect(JSON.parse(writes[0] ?? '{}')).toEqual({ count: 2 });
  });

  it('W-12: readSelectionWithFramer reads the runtime selection facade', async () => {
    const runtime: FramerPluginRuntimeFacade = {
      getSelection: () => [FRAME_NODE, TEXT_NODE],
      setAttributes: () => undefined,
      getPluginData: () => undefined,
      setPluginData: () => undefined,
    };
    const result = await readSelectionWithFramer(runtime);
    expect(result.elements).toHaveLength(1);
  });

  it('W-13: writeSelectionWithFramer calls setAttributes', async () => {
    const updates: FramerTextUpdate[] = [];
    const runtime: FramerPluginRuntimeFacade = {
      getSelection: () => [],
      setAttributes: (nodeId, attributes) => {
        updates.push({ nodeId, attributes });
      },
      getPluginData: () => undefined,
      setPluginData: () => undefined,
    };
    await writeSelectionWithFramer(runtime, [outputFixture()]);
    expect(updates[0]?.nodeId).toBe('txt-1');
  });

  it('W-14: runtime write preserves font style payload', async () => {
    const updates: FramerTextUpdate[] = [];
    const runtime: FramerPluginRuntimeFacade = {
      getSelection: () => [],
      setAttributes: (nodeId, attributes) => {
        updates.push({ nodeId, attributes });
      },
      getPluginData: () => undefined,
      setPluginData: () => undefined,
    };
    await writeSelectionWithFramer(runtime, [outputFixture()]);
    expect(updates[0]?.attributes.fontStyle).toBe('Bold');
  });

  it('W-15: package exposes pure functions without a live runtime', () => {
    expect(typeof readTextNodes).toBe('function');
    expect(typeof writeTextElements).toBe('function');
  });
});
