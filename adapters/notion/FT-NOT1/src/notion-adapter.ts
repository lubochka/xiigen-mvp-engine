/**
 * FT-N1 — Notion Document Generator Adapter
 *
 * Layer 3 STACK_COUPLED adapter for Notion Apps SDK.
 * Maps Notion blocks → shared document generation engine model.
 * 90% shared document engine is UNCHANGED from platform to platform.
 *
 * FLOW-34 FC-26: API mapping — Notion blocks → shared document model.
 *
 * Property mapping (Notion → Shared):
 *   block.type 'paragraph'          → SharedDocElement.type 'PARAGRAPH'
 *   block.type 'heading_1/2/3'      → SharedDocElement.type 'HEADING' + level
 *   block.type 'to_do'              → SharedDocElement.type 'TODO' + checked
 *   block.type 'bulleted_list_item' → SharedDocElement.type 'LIST_ITEM'
 *   block.type 'image'              → SharedDocElement.type 'IMAGE' + src
 *   block.content                   → SharedDocElement.content
 *   (heading_1 → fontSize 32 Bold, heading_2 → 24 Bold, heading_3 → 20 Bold)
 *   (paragraph → fontSize 16 Regular)
 *   Notion default text color       → '#37352f'
 */

import type {
  NotionBlock,
  NotionWritePayload,
  SharedDocElement,
  SharedDocStyle,
  DocAdapterReadResult,
  DocAdapterWriteResult,
  DocEnhancedOutput,
} from './types';

const NOTION_TYPE_MAP: Record<NotionBlock['type'], SharedDocElement['type']> = {
  paragraph: 'PARAGRAPH',
  heading_1: 'HEADING',
  heading_2: 'HEADING',
  heading_3: 'HEADING',
  to_do: 'TODO',
  bulleted_list_item: 'LIST_ITEM',
  image: 'IMAGE',
};

const SHARED_TYPE_TO_NOTION: Record<SharedDocElement['type'], NotionBlock['type']> = {
  PARAGRAPH: 'paragraph',
  HEADING: 'heading_1',
  TODO: 'to_do',
  LIST_ITEM: 'bulleted_list_item',
  IMAGE: 'image',
};

const FONT_SIZE_MAP: Record<NotionBlock['type'], number> = {
  heading_1: 32,
  heading_2: 24,
  heading_3: 20,
  paragraph: 16,
  to_do: 16,
  bulleted_list_item: 16,
  image: 0,
};

const HEADING_LEVEL_MAP: Partial<Record<NotionBlock['type'], 1 | 2 | 3>> = {
  heading_1: 1,
  heading_2: 2,
  heading_3: 3,
};

export function mapNotionToDocElement(block: NotionBlock): SharedDocElement {
  const result: SharedDocElement = {
    type: NOTION_TYPE_MAP[block.type],
    content: block.content,
  };
  const level = HEADING_LEVEL_MAP[block.type];
  if (level !== undefined) result.level = level;
  if (block.checked !== undefined) result.checked = block.checked;
  if (block.src !== undefined) result.src = block.src;
  return result;
}

export function mapNotionToDocStyle(block: NotionBlock): SharedDocStyle {
  const isHeading = block.type.startsWith('heading_');
  return {
    fontSize: FONT_SIZE_MAP[block.type],
    fontWeight: isHeading ? 'Bold' : 'Regular',
    color: '#37352f',
    blockType: NOTION_TYPE_MAP[block.type],
  };
}

export function mapDocStyleToNotion(style: SharedDocStyle): NotionWritePayload {
  return {
    type: SHARED_TYPE_TO_NOTION[style.blockType],
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
  };
}

export function readDocument(blocks: NotionBlock[]): DocAdapterReadResult {
  return {
    elements: blocks.map(mapNotionToDocElement),
    styles: blocks.map(mapNotionToDocStyle),
    sourceBlocks: blocks,
  };
}

export async function writeToNotion(
  outputs: DocEnhancedOutput[],
  writer: (payload: Record<string, unknown>) => Promise<void>,
): Promise<DocAdapterWriteResult> {
  let written = 0;
  let failed = 0;
  for (const output of outputs) {
    try {
      const notionPartial = mapDocStyleToNotion(output.style);
      await writer({
        type: notionPartial.type,
        content: output.element.content,
        fontSize: notionPartial.fontSize,
        fontWeight: notionPartial.fontWeight,
        ...(output.element.checked !== undefined ? { checked: output.element.checked } : {}),
        ...(output.element.level !== undefined ? { level: output.element.level } : {}),
      });
      written++;
    } catch {
      failed++;
    }
  }
  return { written, failed };
}
