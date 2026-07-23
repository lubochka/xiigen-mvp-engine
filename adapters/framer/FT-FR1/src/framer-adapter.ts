import type {
  FramerComponent,
  FramerComponentNameOutput,
  FramerComponentType,
  FramerComponentWritePayload,
  FramerComponentWriteResult,
  FramerNodeLike,
  FramerPaintInput,
  FramerPluginRuntimeFacade,
  FramerPluginStorageFacade,
  FramerSolidPaint,
  FramerTextAdapterOutput,
  FramerTextAdapterReadResult,
  FramerTextAdapterWriteResult,
  FramerTextAttributes,
  FramerTextNode,
  FramerTextUpdate,
  SharedUIElement,
  SharedUIRole,
  SharedUIStyle,
  SharedTextElement,
  SharedTextStyle,
} from './types';

const DEFAULT_FONT_FAMILY = 'Inter';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 'normal';
const DEFAULT_LETTER_SPACING = 0;
const DEFAULT_COLOR = '#000000';
const DEFAULT_OPACITY = 1;
const DEFAULT_BACKGROUND_COLOR = '#ffffff';

const FRAMER_COMPONENT_ROLE_MAP: Readonly<Record<FramerComponentType, SharedUIRole>> =
  Object.freeze({
    frame: 'FRAME',
    text: 'TEXT',
    svg: 'SVG',
    image: 'IMAGE',
    component: 'COMPONENT',
  });

const UI_ROLE_COMPONENT_TYPE_MAP: Readonly<Record<SharedUIRole, FramerComponentType>> =
  Object.freeze({
    FRAME: 'frame',
    TEXT: 'text',
    SVG: 'svg',
    IMAGE: 'image',
    COMPONENT: 'component',
  });

export const FONT_WEIGHT_STYLE_MAP: Readonly<Record<number, string>> = Object.freeze({
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
});

const NAMED_WEIGHT_MAP: Readonly<Record<string, number>> = Object.freeze({
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
});

export function isFramerTextNode(node: FramerNodeLike): node is FramerTextNode {
  return typeof node.id === 'string' && node.type.toLowerCase() === 'text';
}

export function mapFramerToUIElement(component: FramerComponent): SharedUIElement {
  return {
    type: FRAMER_COMPONENT_ROLE_MAP[component.type],
    name: component.name,
    width: component.width,
    height: component.height,
  };
}

export function mapFramerToUIStyle(component: FramerComponent): SharedUIStyle {
  return {
    backgroundColor: component.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    aspectRatio: `${component.width}/${component.height}`,
    uiRole: FRAMER_COMPONENT_ROLE_MAP[component.type],
  };
}

export function mapUIStyleToFramer(
  style: SharedUIStyle,
): Pick<FramerComponent, 'type' | 'backgroundColor'> {
  return {
    type: UI_ROLE_COMPONENT_TYPE_MAP[style.uiRole],
    backgroundColor: style.backgroundColor,
  };
}

export function readComponentTree(components: readonly FramerComponent[]): {
  elements: SharedUIElement[];
  styles: SharedUIStyle[];
} {
  return {
    elements: components.map(mapFramerToUIElement),
    styles: components.map(mapFramerToUIStyle),
  };
}

export async function writeComponentNames(
  outputs: readonly FramerComponentNameOutput[],
  writer: (payload: FramerComponentWritePayload) => Promise<void> | void,
): Promise<FramerComponentWriteResult> {
  let written = 0;
  let failed = 0;
  const payloads: FramerComponentWritePayload[] = [];

  for (const output of outputs) {
    const mappedStyle = mapUIStyleToFramer(output.style);
    const payload: FramerComponentWritePayload = {
      type: 'COMPONENT_RENAME',
      name: output.generatedName,
      componentType: mappedStyle.type,
      backgroundColor: mappedStyle.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    };
    payloads.push(payload);

    try {
      await writer(payload);
      written++;
    } catch {
      failed++;
    }
  }

  return { written, failed, payloads };
}

export function normalizeFontWeight(value: number | string | undefined): number {
  if (typeof value === 'string') {
    const named = NAMED_WEIGHT_MAP[value.replace(/\s+/g, '').toLowerCase()];
    if (named) return named;
  }
  const numeric = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(numeric)) return 400;
  const rounded = Math.round(numeric / 100) * 100;
  return Math.min(900, Math.max(100, rounded));
}

export function fontWeightToStyle(value: number | string | undefined): string {
  return FONT_WEIGHT_STYLE_MAP[normalizeFontWeight(value)] ?? 'Regular';
}

export function normalizeNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function hexPair(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.toLowerCase().split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

export function rgbaToPaint(value: string): FramerSolidPaint | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (!match) return null;
  const red = Number.parseFloat(match[1]!);
  const green = Number.parseFloat(match[2]!);
  const blue = Number.parseFloat(match[3]!);
  const opacity = match[4] === undefined ? 1 : Number.parseFloat(match[4]);
  if (![red, green, blue, opacity].every(Number.isFinite)) return null;
  return {
    type: 'solid',
    color: `#${hexPair(red)}${hexPair(green)}${hexPair(blue)}`,
    opacity: Math.min(1, Math.max(0, opacity)),
  };
}

export function normalizePaint(input: FramerPaintInput | undefined, fallbackOpacity = 1): FramerSolidPaint {
  if (typeof input === 'string') {
    const rgba = rgbaToPaint(input);
    if (rgba) return rgba;
    const hex = normalizeHexColor(input);
    return { type: 'solid', color: hex ?? DEFAULT_COLOR, opacity: fallbackOpacity };
  }

  if (input && typeof input.color === 'string') {
    const nested = normalizePaint(input.color, input.opacity ?? fallbackOpacity);
    return { ...nested, opacity: input.opacity ?? nested.opacity };
  }

  return { type: 'solid', color: DEFAULT_COLOR, opacity: fallbackOpacity };
}

function firstPaint(node: FramerNodeLike): FramerPaintInput | undefined {
  if (node.fills && node.fills.length > 0) return node.fills[0];
  return node.color;
}

export function mapFramerTextNodeToElement(node: FramerTextNode): SharedTextElement {
  return {
    id: node.id,
    name: node.name ?? node.id,
    text: node.text ?? node.characters ?? '',
    width: normalizeNumber(node.width, 0),
    height: normalizeNumber(node.height, 0),
  };
}

export function mapFramerTextNodeToStyle(node: FramerTextNode): SharedTextStyle {
  const opacity = normalizeNumber(node.opacity, DEFAULT_OPACITY);
  const paint = normalizePaint(firstPaint(node), opacity);
  return {
    fontFamily: node.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSize: normalizeNumber(node.fontSize, DEFAULT_FONT_SIZE),
    fontWeight: normalizeFontWeight(node.fontWeight),
    fontStyleName: fontWeightToStyle(node.fontWeight),
    lineHeight: node.lineHeight ?? DEFAULT_LINE_HEIGHT,
    letterSpacing: node.letterSpacing ?? DEFAULT_LETTER_SPACING,
    color: paint.color,
    opacity: paint.opacity,
    paint,
  };
}

export function readTextNodes(nodes: readonly FramerNodeLike[]): FramerTextAdapterReadResult {
  const sourceNodes = nodes.filter(isFramerTextNode);
  return {
    elements: sourceNodes.map(mapFramerTextNodeToElement),
    styles: sourceNodes.map(mapFramerTextNodeToStyle),
    sourceNodes,
  };
}

export function buildFramerTextAttributes(
  style: SharedTextStyle,
  nextText?: string,
): FramerTextAttributes {
  const attributes: FramerTextAttributes = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyleName,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    fills: [style.paint],
    opacity: style.opacity,
  };
  if (nextText !== undefined) {
    attributes.text = nextText;
    attributes.characters = nextText;
  }
  return attributes;
}

export function createTextUpdate(output: FramerTextAdapterOutput): FramerTextUpdate {
  return {
    nodeId: output.element.id,
    attributes: buildFramerTextAttributes(output.style, output.nextText ?? output.element.text),
  };
}

export async function writeTextElements(
  outputs: readonly FramerTextAdapterOutput[],
  writer: (update: FramerTextUpdate) => Promise<void> | void,
): Promise<FramerTextAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  const updates: FramerTextUpdate[] = [];

  for (const output of outputs) {
    const update = createTextUpdate(output);
    updates.push(update);
    try {
      await writer(update);
      written++;
    } catch {
      failed++;
    }
  }

  return { written, failed, updates };
}

export async function readStoredTextAdapterState(
  storage: FramerPluginStorageFacade,
  key: string,
): Promise<Record<string, unknown>> {
  const raw = await storage.getPluginData(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function writeStoredTextAdapterState(
  storage: FramerPluginStorageFacade,
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  await storage.setPluginData(key, JSON.stringify(value));
}

export async function readSelectionWithFramer(
  framer: FramerPluginRuntimeFacade,
): Promise<FramerTextAdapterReadResult> {
  const selection = await framer.getSelection();
  return readTextNodes(selection);
}

export async function writeSelectionWithFramer(
  framer: FramerPluginRuntimeFacade,
  outputs: readonly FramerTextAdapterOutput[],
): Promise<FramerTextAdapterWriteResult> {
  return writeTextElements(outputs, (update) => framer.setAttributes(update.nodeId, update.attributes));
}
