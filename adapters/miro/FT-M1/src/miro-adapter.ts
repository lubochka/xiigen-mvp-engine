/**
 * FT-M1 — Miro AI Architect Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Miro Apps SDK.
 * Maps Miro board items → shared architecture engine model.
 * 90% shared architecture engine is UNCHANGED from platform to platform.
 *
 * Three-layer architecture:
 *   Layer 1 CONCEPT_NEUTRAL: @xiigen/plugin-sdk:platform (auth, AI gateway, freemium)
 *   Layer 2 IMPL_VARIES:     Shared architecture engine (arch-builder.ts, diagram-tree.ts)
 *   Layer 3 STACK_COUPLED:   THIS FILE — Miro SDK API surface only
 *
 * FLOW-34 FC-24: CLIENT_BUILD = webpack (Miro Apps SDK constraint).
 * FLOW-34 FC-26: API mapping — Miro board items → shared architecture model.
 *
 * Property mapping (Miro → Shared):
 *   item.type 'card'      → SharedArchitectElement.type 'COMPONENT'
 *   item.type 'connector' → SharedArchitectElement.type 'RELATION'
 *   item.type 'shape'     → SharedArchitectElement.type 'STRUCTURE'
 *   item.type 'text'      → SharedArchitectElement.type 'LABEL'
 *   item.type 'frame'     → SharedArchitectElement.type 'BOUNDARY'
 *   item.title ?? content → SharedArchitectElement.label
 *   item.style.fillColor  → SharedArchitectElement.color
 *   item.position.x/y     → SharedArchitectElement.x/y
 *   item.geometry.w/h     → SharedArchitectElement.width/height
 *   item.startItem.id     → SharedArchitectElement.fromId
 *   item.endItem.id       → SharedArchitectElement.toId
 */

import type {
  MiroBoardItem,
  SharedArchitectElement,
  SharedArchitectStyle,
  MiroAdapterReadResult,
  MiroAdapterWriteResult,
  ArchitectEnhancedOutput,
} from './types';
import { classifyMiroShape } from './shape-classifier';
import { parseMiroContent } from './html-content-parser';

const MIRO_TYPE_MAP: Record<MiroBoardItem['type'], SharedArchitectElement['type']> = {
  card: 'COMPONENT',
  connector: 'RELATION',
  shape: 'STRUCTURE',
  text: 'LABEL',
  frame: 'BOUNDARY',
  sticky_note: 'COMPONENT',
};

const SHARED_TYPE_TO_MIRO: Record<SharedArchitectElement['type'], MiroBoardItem['type']> = {
  COMPONENT: 'card',
  RELATION: 'connector',
  STRUCTURE: 'shape',
  LABEL: 'text',
  BOUNDARY: 'frame',
};

export function mapMiroToElement(item: MiroBoardItem): SharedArchitectElement {
  const parsedContent = parseMiroContent(item.content);
  const classification = classifyMiroShape(item);

  return {
    type: classification.sharedType,
    label: item.title ?? parsedContent.text,
    color: item.style.fillColor,
    x: item.position.x,
    y: item.position.y,
    width: item.geometry.width,
    height: item.geometry.height,
    fromId: item.startItem?.id,
    toId: item.endItem?.id,
  };
}

export function mapMiroToStyle(item: MiroBoardItem): SharedArchitectStyle {
  const classification = classifyMiroShape(item);

  return {
    fillColor: item.style.fillColor,
    borderColor: item.style.borderColor,
    textColor: item.style.textColor,
    elementType: classification.sharedType,
  };
}

export function mapStyleToMiro(style: SharedArchitectStyle): Partial<MiroBoardItem> {
  return {
    type: SHARED_TYPE_TO_MIRO[style.elementType],
    style: {
      fillColor: style.fillColor,
      borderColor: style.borderColor,
      textColor: style.textColor,
    },
  };
}

export function readBoard(items: MiroBoardItem[]): MiroAdapterReadResult {
  return {
    elements: items.map(mapMiroToElement),
    styles: items.map(mapMiroToStyle),
    sourceItems: items,
  };
}

export async function writeToBoard(
  enhanced: ArchitectEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<MiroAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const item of enhanced) {
    try {
      const miroPartial = mapStyleToMiro(item.style);
      await writer({
        type: miroPartial.type,
        title: item.element.label,
        style: miroPartial.style,
        position: { x: item.element.x, y: item.element.y },
        geometry: { width: item.element.width, height: item.element.height },
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}

export async function applyWriteBackToItem(
  target: MiroBoardItem & { sync?: () => Promise<void> },
  enhanced: ArchitectEnhancedOutput,
): Promise<void> {
  const miroPartial = mapStyleToMiro(enhanced.style);
  target.type = miroPartial.type ?? target.type;
  target.title = enhanced.element.label;
  target.style = {
    ...target.style,
    ...miroPartial.style,
  };
  target.position = { x: enhanced.element.x, y: enhanced.element.y };
  target.geometry = { width: enhanced.element.width, height: enhanced.element.height };
  await target.sync?.();
}
